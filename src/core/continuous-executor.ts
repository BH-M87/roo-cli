import { ApiConfig, TaskResult } from "../types";
import { generateSystemPrompt } from "./prompts/system";
import { TaskManager } from "./task-manager";
import { SingleStepExecutor } from "./single-step-executor";
import chalk from "chalk";

/**
 * 连续执行器
 */
export class ContinuousExecutor {
  private singleStepExecutor: SingleStepExecutor;
  private taskId: string | undefined;
  private maxSteps: number;
  private systemPrompt: string;

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
    // 生成系统提示
    this.systemPrompt = generateSystemPrompt(
      cwd,
      mode,
      rules,
      auto,
      customInstructions,
      roleDefinition
    );

    // 创建单步执行器
    this.singleStepExecutor = new SingleStepExecutor(
      apiConfig,
      mode,
      cwd,
      verbose,
      this.systemPrompt,
      taskId!
    );

    this.maxSteps = maxSteps;
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

      // 打印任务信息
      console.log(chalk.blue(`Starting continuous execution (${this.taskId})`));
      console.log(chalk.blue(`Maximum steps: ${this.maxSteps}`));
      console.log(chalk.blue(`Initial prompt: ${prompt}`));
      console.log("");

      // 执行步骤
      let currentStep = 0;
      let finalOutput = "";

      while (currentStep < this.maxSteps) {
        currentStep++;
        console.log(chalk.yellow(`Step ${currentStep}/${this.maxSteps}`));

        // 使用单步执行器执行当前步骤
        const result = (await this.singleStepExecutor.execute(
          prompt,
          true
        )) as { response: any; toolResult?: string };

        // 打印助手响应
        console.log(chalk.cyan("Assistant:"));
        console.log(result.response.text);
        console.log("");

        // 检查是否有工具调用
        if (result.toolResult) {
          // 打印工具结果
          console.log(chalk.magenta("Tool Result:"));
          console.log(result.toolResult);
          console.log("");

          // 更新输出
          finalOutput += `${result.response.text}\n\nTool Result:\n${result.toolResult}\n\n`;
        } else {
          // 没有工具调用，任务完成
          console.log(chalk.green("Task completed without tool calls"));
          finalOutput += result.response.text;
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
