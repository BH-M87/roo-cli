import express from 'express';
import { Server } from 'http';
import { ChildProcess, spawn } from 'child_process';
import { EventEmitter } from 'events';
import cors from 'cors';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { z } from 'zod';
import { setMcpServerUrl } from '../core/tools/mcpTool';
import { logger } from '../utils/logger';
import { isPortInUse, killProcessOnPort } from '../utils/network';
import { Provider } from '../core/provider';
import {
	readProviderProfiles,
	readGlobalSettings,
	getMergedCustomModes,
} from '../config/settings';
import { toolRegistry } from '../core/tools';
import { getApiConfig } from '../api/config';
import { CommandOptions } from '../types';
import { setApiConfig } from '../core/tools/newTaskTool';
import { createParamSchemaForTool } from './utils';
import { VERSION } from '../config/version';

/**
 * MCP SSE 服务器
 * 使用 MCP SDK 实现的 SSE 服务器
 */
export class McpSseServer extends EventEmitter {
	private server: Server | null = null;
	private process: ChildProcess | null = null;
	private port: number = 3000;
	private isRunning: boolean = false;
	private mcpServer: McpServer | null = null;
	private provider: Provider | null = null;
	private commandOptions: CommandOptions;
	private apiConfig: any = null;
	private settings: any = null;
	private customModes: any[] = [];
	private currentTransport: SSEServerTransport | null = null;

	/**
	 * 构造函数
	 * @param port 端口号
	 * @param options 命令行选项
	 */
	constructor(port: number = 3000, options: CommandOptions = {}) {
		super();
		this.port = port;
		this.commandOptions = options;

		// 创建 MCP 服务器
		this.mcpServer = new McpServer({
			name: 'Roo CLI',
			version: VERSION,
			listTools: async () => {
				// 返回所有已注册工具的列表
				const tools = Object.entries(toolRegistry).map(([name, tool]) => {
					return {
						name,
						description: tool
							.description({ cwd: process.cwd(), supportsComputerUse: false })
							.split('\n')[1]
							.replace('Description: ', ''),
						parameters: createParamSchemaForTool(name),
					};
				});

				return tools;
			},
		});
	}

	/**
	 * 初始化 Provider
	 */
	private async initializeProvider(): Promise<void> {
		// 1. 从配置文件加载配置（优先级最低）
		const providerProfiles = await readProviderProfiles(
			this.commandOptions.providerFile,
		);
		this.settings = await readGlobalSettings(this.commandOptions.settingsFile);
		this.customModes = await getMergedCustomModes(
			this.settings,
			this.commandOptions.modesFile,
		);

		if (!providerProfiles) {
			logger.warn(
				'Provider profiles not found, using default or higher priority options',
			);
		}

		if (!this.settings) {
			logger.warn('Global settings not found, using default settings');
			this.settings = {};
		}

		// 从配置文件获取 API 配置
		if (providerProfiles) {
			const currentApiConfigName = providerProfiles.currentApiConfigName;
			this.apiConfig = providerProfiles.apiConfigs[currentApiConfigName];
			if (this.apiConfig) {
				logger.info(
					`Using API configuration '${currentApiConfigName}' from provider profiles`,
				);
			}
		}

		// 2. 从环境变量获取 API 配置（优先级高于配置文件）
		const envApiConfig = this.getEnvApiConfig();
		if (envApiConfig) {
			this.apiConfig = envApiConfig;
			logger.info('Using API configuration from environment variables');
		}

		// 3. 从命令行选项获取 API 配置（优先级高于环境变量）
		const commandApiConfig = getApiConfig(this.commandOptions);
		if (commandApiConfig) {
			this.apiConfig = commandApiConfig;
			logger.info('Using API configuration from command line options');
		}

		// 如果有 API 配置，创建 Provider
		if (this.apiConfig) {
			// 设置全局 API 配置，以便工具可以使用
			setApiConfig(this.apiConfig);

			this.provider = new Provider(
				this.apiConfig,
				this.settings,
				this.customModes,
			);
			logger.success(`Provider initialized with ${this.apiConfig.apiProvider}`);
		} else {
			logger.warn(
				'Provider not initialized, waiting for configuration message',
			);
		}
	}

	/**
	 * 从环境变量获取 API 配置
	 * @returns API 配置对象或 null
	 */
	private getEnvApiConfig(): any {
		// 检查环境变量中是否有 API 配置
		const openAiApiKey = process.env.OPENAI_API_KEY;
		const openAiBaseUrl = process.env.OPENAI_BASE_URL;
		const openAiModelId = process.env.OPENAI_MODEL_ID;
		const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
		const anthropicModelId = process.env.ANTHROPIC_MODEL_ID;

		// 如果有 OpenAI 配置，使用 OpenAI
		if (openAiApiKey) {
			return {
				apiProvider: 'openai',
				openAiApiKey,
				openAiBaseUrl: openAiBaseUrl || 'https://api.openai.com/v1',
				openAiModelId: openAiModelId || 'gpt-4',
				id: 'env-openai',
			};
		}

		// 如果有 Anthropic 配置，使用 Anthropic
		if (anthropicApiKey) {
			return {
				apiProvider: 'anthropic',
				anthropicApiKey,
				anthropicModelId: anthropicModelId || 'claude-3-5-sonnet-20241022',
				id: 'env-anthropic',
			};
		}

		// 如果没有配置，返回 null
		return null;
	}

	/**
	 * 注册工具
	 */
	private registerTools(): void {
		if (!this.mcpServer) {
			logger.error('MCP server not initialized');
			return;
		}

		// 注册所有工具
		for (const [name, tool] of Object.entries(toolRegistry)) {
			// 创建工具参数模式
			const paramSchema: Record<
				string,
				z.ZodType<any>
			> = createParamSchemaForTool(name);

			// 注册工具
			this.mcpServer.tool(
				name,
				tool
					.description({ cwd: process.cwd(), supportsComputerUse: false })
					.split('\n')[1]
					.replace('Description: ', ''), // 提取描述
				paramSchema,
				async params => {
					try {
						if (!this.provider) {
							throw new Error('Provider not initialized');
						}

						// 创建工具使用对象
						const toolUse = {
							name,
							params,
						};

						// 获取工作目录
						const cwd = params.cwd || process.cwd();

						// 执行工具
						const result = await tool.handler({
							toolUse,
							cwd,
						});

						// 返回结果
						return {
							content: [
								{
									type: 'text',
									text: typeof result === 'string' ? result : result.text,
								},
							],
						};
					} catch (error) {
						return {
							content: [
								{
									type: 'text',
									text: `Error executing tool ${name}: ${
										error instanceof Error ? error.message : String(error)
									}`,
								},
							],
						};
					}
				},
			);
		}
	}

	/**
	 * 启动 MCP 服务器
	 * @returns 是否成功启动
	 */
	async start(): Promise<boolean> {
		if (this.isRunning) {
			logger.progress('MCP SSE server is already running');
			return true;
		}

		try {
			// 检查端口是否被占用
			const portInUse = await isPortInUse(this.port);
			if (portInUse) {
				logger.warn(
					`Port ${this.port} is already in use, attempting to kill the process...`,
				);
				await killProcessOnPort(this.port);
			}

			// 创建 Express 应用
			const app = express();

			// 配置中间件
			app.use(cors());
			app.use(express.json());

			// 配置路由
			// 健康检查端点
			app.get('/health', (_req, res) => {
				res.json({
					status: 'ok',
					connected: this.currentTransport !== null,
					version: VERSION,
					name: 'Roo CLI MCP Server',
				});
			});

			// API 信息端点
			app.get('/', (_req, res) => {
				res.json({
					name: 'Roo CLI MCP Server',
					version: VERSION,
					description: 'MCP server for Roo CLI',
					endpoints: [
						{ path: '/sse', description: 'SSE endpoint for MCP communication' },
						{
							path: '/messages',
							description: 'Endpoint for client-to-server messages',
						},
						{ path: '/health', description: 'Health check endpoint' },
					],
				});
			});

			// 初始化 Provider
			await this.initializeProvider();

			// 注册工具
			this.registerTools();

			// 设置 SSE 端点
			app.get('/sse', async (req, res) => {
				try {
					if (!this.mcpServer) {
						return res.status(500).send('MCP server not initialized');
					}

					logger.progress('Client connected to SSE endpoint');

					// 创建 SSE 传输
					this.currentTransport = new SSEServerTransport('/messages', res);

					// 连接到传输
					await this.mcpServer
						.connect(this.currentTransport)
						.then(() => {
							logger.success('SSE transport connected successfully');
						})
						.catch(error => {
							logger.error(
								`SSE transport connection error: ${
									error instanceof Error ? error.message : String(error)
								}`,
							);
							// 连接失败时清除传输
							this.currentTransport = null;
						});

					// 处理连接关闭
					req.on('close', () => {
						logger.progress('Client disconnected from SSE endpoint');
						// 清除传输
						this.currentTransport = null;
					});
				} catch (error) {
					logger.error(
						`SSE setup error: ${
							error instanceof Error ? error.message : String(error)
						}`,
					);
					res.status(500).send('Internal Server Error');
				}
			});

			// 设置 messages 端点，用于接收客户端消息
			app.post('/messages', express.json(), async (req, res) => {
				try {
					if (!this.mcpServer) {
						return res
							.status(500)
							.json({ error: 'MCP server not initialized' });
					}

					if (!this.currentTransport) {
						return res
							.status(500)
							.json({ error: 'No active SSE connection found' });
					}

					// 使用 SSE 传输处理消息
					await this.currentTransport.handlePostMessage(req, res, req.body);

					logger.info('Processed message from client');
				} catch (error) {
					logger.error(
						`Error processing message: ${
							error instanceof Error ? error.message : String(error)
						}`,
					);
					return res.status(500).json({
						error: `Internal server error: ${
							error instanceof Error ? error.message : String(error)
						}`,
					});
				}
			});

			// 启动服务器
			this.server = app.listen(this.port, () => {
				logger.success(`MCP SSE server started on port ${this.port}`);
				this.isRunning = true;

				// 设置 MCP 服务器 URL
				const serverUrl = `http://localhost:${this.port}`;
				setMcpServerUrl(serverUrl);

				logger.progress(`SSE endpoint available at ${serverUrl}/sse`);
				logger.progress(`Messages endpoint available at ${serverUrl}/messages`);

				this.emit('started', { port: this.port, url: serverUrl });
			});

			return true;
		} catch (error) {
			logger.error(
				`Failed to start MCP server: ${
					error instanceof Error ? error.message : String(error)
				}`,
			);
			return false;
		}
	}

	/**
	 * 停止 MCP 服务器
	 * @returns 是否成功停止
	 */
	async stop(): Promise<boolean> {
		if (!this.isRunning) {
			logger.progress('MCP SSE server is not running');
			return true;
		}

		try {
			// 停止服务器
			if (this.server) {
				this.server.close();
				this.server = null;
			}

			// 停止进程
			if (this.process) {
				this.process.kill();
				this.process = null;
			}

			this.isRunning = false;
			setMcpServerUrl(null);

			logger.success('MCP SSE server stopped');
			this.emit('stopped');

			return true;
		} catch (error) {
			logger.error(
				`Failed to stop MCP server: ${
					error instanceof Error ? error.message : String(error)
				}`,
			);
			return false;
		}
	}

	/**
	 * 重启 MCP 服务器
	 * @returns 是否成功重启
	 */
	async restart(): Promise<boolean> {
		await this.stop();
		return this.start();
	}

	/**
	 * 获取 MCP 服务器状态
	 * @returns 服务器状态
	 */
	async getStatus(): Promise<{
		running: boolean;
		port: number;
		url: string | null;
	}> {
		// 检查端口是否被占用，如果被占用，则认为服务器正在运行
		const portInUse = await isPortInUse(this.port);

		return {
			running: this.isRunning || portInUse,
			port: this.port,
			url: this.isRunning || portInUse ? `http://localhost:${this.port}` : null,
		};
	}
}
