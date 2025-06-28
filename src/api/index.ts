import { ApiConfig, ApiResponse, ToolCall } from '../types';
import Anthropic from '@anthropic-ai/sdk';
import { TextBlock } from '@anthropic-ai/sdk/resources/index.mjs';
import axios from 'axios';
import { parseAssistantMessage } from '../core/assistant-message';
import { Message, MessageRole } from '../core/task-manager';
import { ApiProvider } from './config';
import { logger } from '../utils/logger';

/**
 * Base class for API handlers
 */
export abstract class ApiHandler {
	protected config: ApiConfig;

	constructor(config: ApiConfig) {
		this.config = config;
	}

	/**
	 * Get information about the model
	 */
	abstract getModel(): { id: string; provider: string };

	/**
	 * Send a request to the API
	 * @param prompt The prompt to send
	 * @param systemPrompt Optional system prompt
	 * @param messages Optional message history
	 */
	abstract sendRequest(
		prompt: string,
		systemPrompt?: string,
		messages?: Message[],
	): Promise<ApiResponse>;

	/**
	 * Create API response from content and usage data
	 * @param content The text content from the API response
	 * @param usage The usage data from the API response
	 * @returns Formatted API response
	 */
	protected createApiResponse(
		content: string,
		usage: {
			prompt_tokens: number;
			completion_tokens: number;
			total_tokens: number;
		},
	): ApiResponse {
		// Parse tool calls from the content
		const toolCalls: ToolCall[] = [];
		const parsedContent = parseAssistantMessage(content);

		for (const content of parsedContent) {
			if (content.type === 'tool_use' && !content.partial) {
				// Type assertion for tool use content
				const toolUseContent = content as any;
				if (toolUseContent.name && toolUseContent.params) {
					toolCalls.push({
						name: toolUseContent.name,
						params: toolUseContent.params as Record<string, string>,
					});
				}
			}
		}

		return {
			text: content,
			usage: {
				promptTokens: usage.prompt_tokens,
				completionTokens: usage.completion_tokens,
				totalTokens: usage.total_tokens,
			},
			toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
		};
	}
}

/**
 * Anthropic API handler
 */
export class AnthropicHandler extends ApiHandler {
	private client: Anthropic;

	constructor(config: ApiConfig) {
		super(config);
		if (!config.anthropicApiKey) {
			throw new Error('Anthropic API key is required');
		}
		this.client = new Anthropic({
			apiKey: config.anthropicApiKey,
		});
	}

	getModel() {
		return {
			id: this.config.anthropicModelId || 'claude-3-5-sonnet-20241022',
			provider: 'anthropic',
		};
	}

	async sendRequest(
		prompt: string,
		systemPrompt?: string,
		messages?: Message[],
	): Promise<ApiResponse> {
		try {
			// 准备请求参数
			const params: any = {
				model: this.getModel().id,
				max_tokens: 4000,
				messages: [],
			};

			// 添加历史消息
			if (messages && messages.length > 0) {
				// 过滤掉系统消息，因为我们会单独设置
				const filteredMessages = messages.filter(
					msg => msg.role !== MessageRole.SYSTEM,
				);

				// 将消息转换为 Anthropic 格式
				for (const msg of filteredMessages) {
					let role: 'user' | 'assistant';

					switch (msg.role) {
						case MessageRole.USER:
							role = 'user';
							break;
						case MessageRole.ASSISTANT:
							role = 'assistant';
							break;
						case MessageRole.TOOL:
							// 工具消息作为用户消息发送
							role = 'user';
							break;
						default:
							continue; // 跳过其他类型的消息
					}

					params.messages.push({
						role,
						content: msg.content,
					});
				}
			}

			// 如果没有历史消息或最后一条不是用户消息，添加当前用户消息
			if (
				params.messages.length === 0 ||
				params.messages[params.messages.length - 1].role !== 'user'
			) {
				params.messages.push({
					role: 'user',
					content: prompt,
				});
			}

			// 添加系统提示
			if (systemPrompt) {
				params.system = systemPrompt;
			}

			const response = await this.client.messages.create(params);

			// 获取文本内容
			const text = (response.content[0] as TextBlock)?.text || '';

			// Create API response from the content
			return this.createApiResponse(text, {
				prompt_tokens: response.usage.input_tokens,
				completion_tokens: response.usage.output_tokens,
				total_tokens:
					response.usage.input_tokens + response.usage.output_tokens,
			});
		} catch (error) {
			logger.error(
				'Error calling Anthropic API: ' +
					(error instanceof Error ? error.message : String(error)),
			);
			throw error;
		}
	}
}

/**
 * OpenAI API handler
 */
export class OpenAiHandler extends ApiHandler {
	private baseUrl: string;

	constructor(config: ApiConfig) {
		super(config);
		if (!config.openAiApiKey) {
			throw new Error('OpenAI API key is required');
		}
		this.baseUrl = config.openAiBaseUrl || 'https://api.openai.com/v1';
		logger.info(`OpenAI API configured with base URL: ${this.baseUrl}`);
	}

	getModel() {
		return {
			id: this.config.openAiModelId || 'gpt-4',
			provider: 'openai',
		};
	}

	async sendRequest(
		prompt: string,
		systemPrompt?: string,
		messages?: Message[],
	): Promise<ApiResponse> {
		try {
			const modelId = this.getModel().id;
			const maxTokens = this.config.openAiCustomModelInfo?.maxTokens || 4000;

			logger.info(`Using model: ${modelId}`);

			// 准备消息
			const apiMessages = [];

			// 添加系统提示
			if (systemPrompt) {
				apiMessages.push({
					role: 'system',
					content: systemPrompt,
				});
			}

			// 添加历史消息
			if (messages && messages.length > 0) {
				// 过滤掉系统消息，因为我们会单独设置
				const filteredMessages = messages.filter(
					msg => msg.role !== MessageRole.SYSTEM,
				);

				// 将消息转换为 OpenAI 格式
				for (const msg of filteredMessages) {
					let role: 'user' | 'assistant' | 'system';

					switch (msg.role) {
						case MessageRole.USER:
							role = 'user';
							break;
						case MessageRole.ASSISTANT:
							role = 'assistant';
							break;
						case MessageRole.TOOL:
							// 工具消息作为用户消息发送
							role = 'user';
							break;
						default:
							continue; // 跳过其他类型的消息
					}

					apiMessages.push({
						role,
						content: msg.content,
					});
				}
			}

			// 如果没有历史消息或最后一条不是用户消息，添加当前用户消息
			if (
				apiMessages.length === 0 ||
				apiMessages[apiMessages.length - 1].role !== 'user'
			) {
				apiMessages.push({
					role: 'user',
					content: prompt,
				});
			}

			// Check if the model requires stream mode
			// Models like Qwen require stream mode
			const modelRequiresStream =
				modelId.toLowerCase().includes('qwen') || this.config.streamMode;

			if (modelRequiresStream) {
				logger.info(
					`Model ${modelId} requires stream mode, enabling stream parameter`,
				);

				// For models that require stream mode, we'll collect the streamed response
				const streamResponse = await axios.post(
					`${this.baseUrl}/chat/completions`,
					{
						model: modelId,
						messages: apiMessages,
						max_tokens: maxTokens > 0 ? maxTokens : undefined,
						stream: true,
					},
					{
						headers: {
							'Content-Type': 'application/json',
							Authorization: `Bearer ${this.config.openAiApiKey}`,
						},
						responseType: 'stream',
					},
				);

				// Process the streamed response
				let fullContent = '';
				let usage = {
					prompt_tokens: 0,
					completion_tokens: 0,
					total_tokens: 0,
				};

				// Convert stream to string and process
				return new Promise<ApiResponse>((resolve, reject) => {
					let buffer = '';

					streamResponse.data.on('data', (chunk: Buffer) => {
						const chunkStr = chunk.toString();
						buffer += chunkStr;

						// Process complete lines
						const lines = buffer.split('\n');
						buffer = lines.pop() || ''; // Keep the last incomplete line in the buffer

						for (const line of lines) {
							if (line.trim() === '') continue;
							if (line.trim() === 'data: [DONE]') continue;

							try {
								// Remove the "data: " prefix
								const jsonStr = line.replace(/^data: /, '').trim();
								if (!jsonStr) continue;

								const json = JSON.parse(jsonStr);

								// Extract content from the delta
								if (json.choices && json.choices[0]?.delta?.content) {
									fullContent += json.choices[0].delta.content;
								}

								// Update usage if available
								if (json.usage) {
									usage = json.usage;
								}
							} catch (e) {
								logger.error(`Error parsing stream chunk: ${e}`);
							}
						}
					});

					streamResponse.data.on('end', () => {
						// Create API response from the streamed content
						const response = this.createApiResponse(fullContent, {
							prompt_tokens: usage.prompt_tokens,
							completion_tokens: usage.completion_tokens,
							total_tokens: usage.total_tokens,
						});
						resolve(response);
					});

					streamResponse.data.on('error', (err: Error) => {
						reject(err);
					});
				});
			} else {
				// For models that don't require stream mode, use the regular approach
				const response = await axios.post(
					`${this.baseUrl}/chat/completions`,
					{
						model: modelId,
						messages: apiMessages,
						max_tokens: maxTokens > 0 ? maxTokens : undefined,
					},
					{
						headers: {
							'Content-Type': 'application/json',
							Authorization: `Bearer ${this.config.openAiApiKey}`,
						},
					},
				);

				// 获取文本内容
				const text = response.data.choices[0].message.content || '';

				// Create API response from the content
				return this.createApiResponse(text, response.data.usage);
			}
		} catch (error) {
			if (axios.isAxiosError(error) && error.response) {
				logger.error(
					`OpenAI API error (${error.response.status}): ${JSON.stringify(
						error.response.data,
					)}`,
				);
			} else {
				logger.error(
					'Error calling OpenAI API: ' +
						(error instanceof Error ? error.message : String(error)),
				);
			}
			throw error;
		}
	}
}

/**
 * Factory function to create an API handler based on configuration
 * @param config API configuration
 * @returns API handler instance
 */
export function createApiHandler(config: ApiConfig): ApiHandler {
	const handlers: Record<string, (config: ApiConfig) => ApiHandler> = {
		[ApiProvider.ANTHROPIC]: config => new AnthropicHandler(config),
		[ApiProvider.OPENAI]: config => new OpenAiHandler(config),
	};

	const handlerCreator = handlers[config.apiProvider];
	if (!handlerCreator) {
		throw new Error(`Unsupported API provider: ${config.apiProvider}`);
	}

	return handlerCreator(config);
}
