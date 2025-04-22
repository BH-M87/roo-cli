import { ApiConfig, TaskResult } from "../types";
import { createApiHandler } from "../api";
import { generateSystemPrompt } from "./prompts/system";
import { ToolExecutor } from "./tool-executor";
import { TaskManager } from "./task-manager";
import { v4 as uuidv4 } from "uuid";
import chalk from "chalk";

/**
 * 连续执行器
 */
export class ContinuousExecutor {
  private apiConfig: ApiConfig;
  private mode: string;
  private cwd: string;
  private taskManager: TaskManager;
  private toolExecutor: ToolExecutor;
  private taskId: string | undefined;
  private maxSteps: number;
  private verbose: boolean;
  private auto: boolean;
  private rules?: string;
  private customInstructions?: string;
  private roleDefinition?: string;

  /**
   * 构造函数
   * @param apiConfig API配置
   * @param mode 模式
   * @param cwd 工作目录
   * @param maxSteps 最大步骤数
   * @param verbose 是否详细输出
   * @param auto 是否自动执行（不需要用户确认）
   * @param rules 自定义规则
   * @param customInstructions 自定义指令
   * @param roleDefinition 自定义角色定义，用于覆盖默认角色定义
   * @param taskId 任务ID
   */
  constructor(
    apiConfig: ApiConfig,
    mode: string,
    cwd: string,
    maxSteps: number = 1000,
    verbose: boolean = false,
    auto: boolean = false,
    rules?: string,
    customInstructions?: string,
    roleDefinition?: string,
    taskId?: string
  ) {
    this.apiConfig = apiConfig;
    this.mode = mode;
    this.cwd = cwd;
    this.taskManager = new TaskManager();
    this.toolExecutor = new ToolExecutor(cwd, verbose);
    this.maxSteps = maxSteps;
    this.verbose = verbose;
    this.auto = auto;
    this.rules = rules;
    this.customInstructions = customInstructions;
    this.roleDefinition = roleDefinition;
    this.taskId = taskId;
  }

  /**
   * 执行任务
   * @param prompt 提示
   * @returns 任务结果
   */
  async execute(prompt: string): Promise<TaskResult> {
    try {
      // 创建API处理程序
      const apiHandler = createApiHandler(this.apiConfig);

      // 生成系统提示
      const systemPrompt = generateSystemPrompt(
        this.cwd,
        this.mode,
        this.rules,
        this.auto,
        this.customInstructions,
        this.roleDefinition
      );

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

      // 添加用户消息
      this.taskManager.addUserMessage(this.taskId!, prompt);

      // 打印任务信息
      console.log(
        chalk.blue(
          `Starting continuous execution (${this.taskId}) in ${this.mode} mode`
        )
      );
      console.log(chalk.blue(`Working directory: ${this.cwd}`));
      console.log(chalk.blue(`Maximum steps: ${this.maxSteps}`));
      console.log(chalk.blue(`Initial prompt: ${prompt}`));
      console.log("");

      // 执行步骤
      let currentStep = 0;
      let finalOutput = "";

      while (currentStep < this.maxSteps) {
        currentStep++;
        console.log(chalk.yellow(`Step ${currentStep}/${this.maxSteps}`));

        // 获取会话消息
        const messages = this.taskManager.getMessages(this.taskId!);

        // 发送请求到API
        console.log(
          chalk.green(`Sending request to ${this.apiConfig.apiProvider} API...`)
        );
        const response = await apiHandler.sendRequest(
          "",
          systemPrompt,
          messages
        );

        // 添加助手消息
        this.taskManager.addAssistantMessage(this.taskId!, response.text);

        // 打印助手响应
        console.log(chalk.cyan("Assistant:"));
        console.log(response.text);
        console.log("");

        // 检查是否有工具调用
        if (response.toolCalls && response.toolCalls.length > 0) {
          console.log(
            chalk.yellow(`Found ${response.toolCalls.length} tool call(s)`)
          );

          // 执行工具调用
          const toolCall = response.toolCalls[0]; // 只处理第一个工具调用
          console.log(chalk.green(`Executing tool: ${toolCall.name}`));

          const toolResult = await this.toolExecutor.execute(toolCall);
          console.log(chalk.green(`Tool execution completed`));

          // 添加工具消息
          this.taskManager.addToolMessage(this.taskId!, toolResult);

          // 打印工具结果
          console.log(chalk.magenta("Tool Result:"));
          console.log(toolResult);
          console.log("");

          // 更新输出
          finalOutput += `${response.text}\n\nTool Result:\n${toolResult}\n\n`;
        } else {
          // 没有工具调用，任务完成
          console.log(chalk.green("Task completed without tool calls"));
          finalOutput += response.text;
          break;
        }
      }

      // 检查是否达到最大步骤数
      if (currentStep >= this.maxSteps) {
        console.log(
          chalk.yellow(`Reached maximum number of steps (${this.maxSteps})`)
        );
        finalOutput +=
          "\n\nNote: Reached maximum number of steps. Task may not be fully completed.";
      }

      return {
        taskId: this.taskId!,
        output: finalOutput,
        success: true,
      };
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
