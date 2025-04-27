import { ApiConfig, TaskResult } from "../types";
import { generateSystemPrompt } from "./prompts/system";
import { SingleStepExecutor } from "./single-step-executor";
import chalk from "chalk";
import { logger } from "../utils/logger";

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
    auto: boolean = false,
    rules?: string,
    customInstructions?: string,
    roleDefinition?: string,
    taskId?: string,
    private onlyReturnLastResult: boolean = false
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
      logger.info(`Starting continuous execution (${this.taskId})`);
      logger.info(`Maximum steps: ${this.maxSteps}`);
      logger.info(`Initial prompt: ${prompt}`);
      logger.info("");

      // 执行步骤
      let currentStep = 0;
      let finalOutput = "";
      let result;

      while (currentStep < this.maxSteps) {
        currentStep++;
        logger.info(chalk.yellow(`Step ${currentStep}/${this.maxSteps}`));

        // 使用单步执行器执行当前步骤
        // 只在第一步添加用户消息
        result = (await this.singleStepExecutor.execute(
          currentStep === 1 ? prompt : "", // 只在第一步传入用户提示
          true,
          currentStep === 1 // 只在第一步添加用户消息
        )) as { response: any; toolResult?: string };

        // 打印助手响应
        logger.info(chalk.cyan("Assistant:"));
        logger.info(result.response.text);
        logger.info("");

        // 检查是否有工具调用
        if (result.toolResult) {
          // 打印工具结果
          logger.info(chalk.magenta("Tool Result:"));
          logger.info(result.toolResult);
          logger.info("");

          // 更新输出
          finalOutput += `${result.response.text}\n\nTool Result:\n${result.toolResult}\n\n`;
        } else {
          // 没有工具调用，任务完成
          logger.success("Task completed without tool calls");
          finalOutput += result.response.text;
          break;
        }
      }

      // 检查是否达到最大步骤数
      if (currentStep >= this.maxSteps) {
        logger.warn(`Reached maximum number of steps (${this.maxSteps})`);
        finalOutput +=
          "\n\nNote: Reached maximum number of steps. Task may not be fully completed.";
      }

      return {
        taskId: this.taskId!,
        output:
          this.onlyReturnLastResult && result
            ? result.response.text
            : finalOutput,
        success: true,
      };
    } catch (error) {
      logger.error(
        "Error executing task: " +
          (error instanceof Error ? error.message : String(error))
      );
      return {
        taskId: this.taskId!,
        output: "",
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}
