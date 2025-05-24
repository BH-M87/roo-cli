import { ApiConfig, TaskResult, ToolCall } from "../types";
import { createApiHandler } from "../api";
import { ToolExecutor } from "./tool-executor";
import { TaskManager } from "./task-manager";
import chalk from "chalk";
import { logger } from "../utils/logger";

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

  /**
   * 构造函数
   * @param apiConfig API配置
   * @param mode 模式
   * @param cwd 工作目录
   * @param logLevel 日志级别
   * @param systemPrompt 系统提示
   * @param taskId 任务ID
   */
  constructor(
    apiConfig: ApiConfig,
    mode: string,
    cwd: string,
    systemPrompt: string,
    taskId: string
  ) {
    this.apiConfig = apiConfig;
    this.mode = mode;
    this.cwd = cwd;
    this.taskManager = new TaskManager();
    this.toolExecutor = new ToolExecutor(cwd);
    this.systemPrompt = systemPrompt;
    this.taskId = taskId;
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
    addUserMessage: boolean = true
  ): Promise<TaskResult | { response: any; toolResult?: string }> {
    try {
      // 验证任务是否存在
      if (!this.taskId) {
        throw new Error("Task ID is required");
      }

      const task = this.taskManager.getTask(this.taskId);
      if (!task) {
        throw new Error(`Task ${this.taskId} not found`);
      }

      logger.debug(`Using task: ${this.taskId}`);
      logger.debug(`Task has ${task.messages.length} messages`);

      // 创建API处理程序
      const apiHandler = createApiHandler(this.apiConfig);

      // 根据参数决定是否添加用户消息
      if (addUserMessage && prompt) {
        logger.debug(`Adding user message: ${prompt}`);
        this.taskManager.addUserMessage(this.taskId, prompt);
      }

      // 发送请求到 API
      logger.progress(
        `Sending request to ${this.apiConfig.apiProvider} API...`
      );
      const messages = this.taskManager.getMessages(this.taskId);
      const response = await apiHandler.sendRequest(
        "",
        this.systemPrompt,
        messages
      );

      // 添加助手消息
      this.taskManager.addAssistantMessage(this.taskId, response.text);

      // 检查是否有工具调用
      if (response.toolCalls && response.toolCalls.length > 0) {
        logger.progress(`Found ${response.toolCalls.length} tool call(s)`);

        // 执行工具调用
        const toolCall = response.toolCalls[0]; // 只处理第一个工具调用
        logger.progress(`Executing tool: ${toolCall.name}`);

        const toolResult = await this.toolExecutor.execute(toolCall);
        logger.debug(`Tool execution completed`);

        // 添加工具消息
        this.taskManager.addToolMessage(this.taskId, toolResult);

        // 如果需要返回中间结果（用于连续执行模式）
        if (returnIntermediateResult) {
          return {
            response,
            toolResult,
          };
        }

        // 构建带工具结果的输出
        const output = `${response.text}\n\nTool Result:\n${toolResult}`;

        return {
          taskId: this.taskId,
          output,
          success: true,
        };
      } else {
        // 如果需要返回中间结果（用于连续执行模式）
        if (returnIntermediateResult) {
          return {
            response,
          };
        }

        // 没有工具调用，直接返回文本
        return {
          taskId: this.taskId,
          output: response.text,
          success: true,
        };
      }
    } catch (error) {
      // 如果需要返回中间结果（用于连续执行模式）
      if (returnIntermediateResult) {
        throw error;
      }

      logger.error(
        "Error executing task: " +
          (error instanceof Error ? error.message : String(error))
      );

      // 返回最终结果
      return {
        taskId: this.taskId!,
        output: "",
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}
