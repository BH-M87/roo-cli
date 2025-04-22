import { ApiConfig, TaskResult, ToolCall } from "../types";
import { createApiHandler } from "../api";
import { ToolExecutor } from "./tool-executor";
import { TaskManager } from "./task-manager";
import chalk from "chalk";

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
  private verbose: boolean;
  private systemPrompt: string;

  /**
   * 构造函数
   * @param apiConfig API配置
   * @param mode 模式
   * @param cwd 工作目录
   * @param verbose 是否详细输出
   * @param systemPrompt 系统提示
   * @param taskId 任务ID
   */
  constructor(
    apiConfig: ApiConfig,
    mode: string,
    cwd: string,
    verbose: boolean = false,
    systemPrompt: string,
    taskId: string
  ) {
    this.apiConfig = apiConfig;
    this.mode = mode;
    this.cwd = cwd;
    this.taskManager = new TaskManager();
    this.toolExecutor = new ToolExecutor(cwd, verbose);
    this.verbose = verbose;
    this.systemPrompt = systemPrompt;
    this.taskId = taskId;
  }

  /**
   * 执行任务
   * @param prompt 提示
   * @returns 任务结果
   */
  async execute(prompt: string): Promise<TaskResult> {
    try {
      // 验证任务是否存在
      if (!this.taskId) {
        throw new Error("Task ID is required");
      }

      const task = this.taskManager.getTask(this.taskId);
      if (!task) {
        throw new Error(`Task ${this.taskId} not found`);
      }
      console.log(chalk.blue(`Using task: ${this.taskId}`));
      console.log(chalk.blue(`Task has ${task.messages.length} messages`));

      // 创建API处理程序
      const apiHandler = createApiHandler(this.apiConfig);

      // 添加用户消息
      this.taskManager.addUserMessage(this.taskId, prompt);

      // 发送请求到 API
      console.log(`Sending request to ${this.apiConfig.apiProvider} API...`);
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
        console.log(`Found ${response.toolCalls.length} tool call(s)`);

        // 执行工具调用
        const toolCall = response.toolCalls[0]; // 只处理第一个工具调用
        console.log(`Executing tool: ${toolCall.name}`);

        const toolResult = await this.toolExecutor.execute(toolCall);
        console.log(`Tool execution completed`);

        // 添加工具消息
        this.taskManager.addToolMessage(this.taskId, toolResult);

        // 构建带工具结果的输出
        const output = `${response.text}\n\nTool Result:\n${toolResult}`;

        return {
          taskId: this.taskId,
          output,
          success: true,
        };
      } else {
        // 没有工具调用，直接返回文本
        return {
          taskId: this.taskId,
          output: response.text,
          success: true,
        };
      }
    } catch (error) {
      console.error("Error executing task:", error);
      return {
        taskId: this.taskId!,
        output: "",
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}
