import { ApiConfig, TaskResult, StructuredExecutionResult } from '../types';
import { createApiHandler } from '../api';
import { ToolExecutor } from './tool-executor';
import { TaskManager } from './task-manager';
import { StructuredOutputManager } from '../utils/structured-output';
import { logger } from '../utils/logger';

/**
 * 单步执行器
 */
export class SingleStepExecutor {
	private apiConfig: ApiConfig;
	private mode: string;
	private cwd: string;
	private taskManager: TaskManager;
	private toolExecutor: ToolExecutor;
	private taskId: string | undefined;
	private systemPrompt: string;
	private structuredOutputManager?: StructuredOutputManager;

	/**
	 * 构造函数
	 * @param apiConfig API配置
	 * @param mode 模式
	 * @param cwd 工作目录
	 * @param systemPrompt 系统提示
	 * @param taskId 任务ID
	 * @param structuredOutput 是否启用结构化输出
	 * @param onStructuredUpdate 结构化输出更新回调
	 */
	constructor(
		apiConfig: ApiConfig,
		mode: string,
		cwd: string,
		systemPrompt: string,
		taskId: string,
		structuredOutput: boolean = false,
		onStructuredUpdate?: (data: StructuredExecutionResult) => void,
	) {
		this.apiConfig = apiConfig;
		this.mode = mode;
		this.cwd = cwd;
		this.taskManager = new TaskManager();
		this.toolExecutor = new ToolExecutor(cwd);
		this.systemPrompt = systemPrompt;
		this.taskId = taskId;

		// 初始化结构化输出管理器
		if (structuredOutput && taskId) {
			this.structuredOutputManager = new StructuredOutputManager(
				taskId,
				mode,
				cwd,
				{
					continuous: false,
					maxSteps: 1,
					auto: false,
					onlyReturnLastResult: false,
				},
				onStructuredUpdate,
			);
		}
	}

	/**
	 * 执行任务
	 * @param prompt 提示
	 * @returns 任务结果
	 */
	/**
	 * 执行单步任务
	 * @param prompt 提示
	 * @param returnIntermediateResult 是否返回中间结果（用于连续执行模式）
	 * @param addUserMessage 是否添加用户消息（默认为 true）
	 * @returns 任务结果
	 */
	async execute(
		prompt: string,
		returnIntermediateResult: boolean = false,
		addUserMessage: boolean = true,
	): Promise<TaskResult | { response: any; toolResult?: string }> {
		try {
			// 验证任务是否存在
			if (!this.taskId) {
				throw new Error('Task ID is required');
			}

			const task = this.taskManager.getTask(this.taskId);
			if (!task) {
				throw new Error(`Task ${this.taskId} not found`);
			}

			logger.debug(`Using task: ${this.taskId}`);
			logger.debug(`Task has ${task.messages.length} messages`);

			// 开始步骤（结构化输出）
			if (this.structuredOutputManager) {
				this.structuredOutputManager.startStep(1);
				this.structuredOutputManager.addLog(
					'debug',
					`Using task: ${this.taskId}`,
				);
				this.structuredOutputManager.addLog(
					'debug',
					`Task has ${task.messages.length} messages`,
				);
			}

			// 创建API处理程序
			const apiHandler = createApiHandler(this.apiConfig);

			// 根据参数决定是否添加用户消息
			if (addUserMessage && prompt) {
				logger.debug(`Adding user message: ${prompt}`);
				this.taskManager.addUserMessage(this.taskId, prompt);

				if (this.structuredOutputManager) {
					this.structuredOutputManager.addLog(
						'debug',
						`Adding user message: ${prompt}`,
					);
				}
			}

			// 发送请求到 API
			logger.progress(
				`Sending request to ${this.apiConfig.apiProvider} API...`,
			);

			if (this.structuredOutputManager) {
				this.structuredOutputManager.addLog(
					'progress',
					`Sending request to ${this.apiConfig.apiProvider} API...`,
				);
			}

			const messages = this.taskManager.getMessages(this.taskId);
			const response = await apiHandler.sendRequest(
				'',
				this.systemPrompt,
				messages,
			);

			// 添加助手消息
			this.taskManager.addAssistantMessage(this.taskId, response.text);

			// 检查是否有工具调用
			if (response.toolCalls && response.toolCalls.length > 0) {
				logger.progress(`Found ${response.toolCalls.length} tool call(s)`);

				if (this.structuredOutputManager) {
					this.structuredOutputManager.addLog(
						'progress',
						`Found ${response.toolCalls.length} tool call(s)`,
					);
				}

				// 执行工具调用
				const toolCall = response.toolCalls[0]; // 只处理第一个工具调用
				logger.progress(`Executing tool: ${toolCall.name}`);

				if (this.structuredOutputManager) {
					this.structuredOutputManager.addLog(
						'progress',
						`Executing tool: ${toolCall.name}`,
					);
				}

				const toolStartTime = Date.now();
				const toolResult = await this.toolExecutor.execute(toolCall);
				const toolEndTime = Date.now();
				const toolDuration = toolEndTime - toolStartTime;

				logger.debug(`Tool execution completed`);

				if (this.structuredOutputManager) {
					this.structuredOutputManager.addLog(
						'debug',
						'Tool execution completed',
					);
				}

				// 添加工具消息
				this.taskManager.addToolMessage(this.taskId, toolResult);

				// 构建工具结果数据（结构化输出）
				const toolResults = [
					{
						toolName: toolCall.name,
						params: toolCall.params,
						result: toolResult,
						success: true,
						duration: toolDuration,
					},
				];

				// 构建带工具结果的输出
				const output = `${response.text}\n\nTool Result:\n${toolResult}`;

				// 完成步骤（结构化输出）
				if (this.structuredOutputManager) {
					this.structuredOutputManager.completeStep(
						response,
						toolResults,
						output,
					);
				}

				// 如果需要返回中间结果（用于连续执行模式）
				if (returnIntermediateResult) {
					return {
						response,
						toolResult,
					};
				}

				const taskResult: TaskResult = {
					taskId: this.taskId,
					output,
					success: true,
				};

				// 添加结构化数据
				if (this.structuredOutputManager) {
					this.structuredOutputManager.completeTask(true, output);
					taskResult.structured = this.structuredOutputManager.getData();
				}

				return taskResult;
			} else {
				// 没有工具调用
				if (this.structuredOutputManager) {
					this.structuredOutputManager.addLog('info', 'No tool calls found');
					this.structuredOutputManager.completeStep(
						response,
						undefined,
						response.text,
					);
				}

				// 如果需要返回中间结果（用于连续执行模式）
				if (returnIntermediateResult) {
					return {
						response,
					};
				}

				// 没有工具调用，直接返回文本
				const taskResult: TaskResult = {
					taskId: this.taskId,
					output: response.text,
					success: true,
				};

				// 添加结构化数据
				if (this.structuredOutputManager) {
					this.structuredOutputManager.completeTask(true, response.text);
					taskResult.structured = this.structuredOutputManager.getData();
				}

				return taskResult;
			}
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : String(error);

			// 标记步骤失败（结构化输出）
			if (this.structuredOutputManager) {
				this.structuredOutputManager.failStep(errorMessage);
				this.structuredOutputManager.completeTask(false, '', errorMessage);
			}

			// 如果需要返回中间结果（用于连续执行模式）
			if (returnIntermediateResult) {
				throw error;
			}

			logger.error('Error executing task: ' + errorMessage);

			// 返回最终结果
			const taskResult: TaskResult = {
				taskId: this.taskId!,
				output: '',
				success: false,
				error: errorMessage,
			};

			// 添加结构化数据
			if (this.structuredOutputManager) {
				taskResult.structured = this.structuredOutputManager.getData();
			}

			return taskResult;
		}
	}
}
