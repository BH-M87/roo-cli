/**
 * 结构化输出管理器
 *
 * 这个模块提供了结构化输出的管理功能，用于跟踪任务执行的详细信息，
 * 包括进度、步骤、日志和统计信息，并支持实时更新。
 */

import {
  StructuredExecutionResult,
  ExecutionStep,
  LogEntry,
  ApiResponse,
} from "../types";

/**
 * 结构化输出管理器
 */
export class StructuredOutputManager {
  private data: StructuredExecutionResult;
  private onUpdate?: (data: StructuredExecutionResult) => void;

  /**
   * 构造函数
   * @param taskId 任务ID
   * @param mode 执行模式
   * @param cwd 工作目录
   * @param config 执行配置
   * @param onUpdate 更新回调函数
   */
  constructor(
    taskId: string,
    mode: string,
    cwd: string,
    config: {
      continuous: boolean;
      maxSteps: number;
      auto: boolean;
      onlyReturnLastResult: boolean;
    },
    onUpdate?: (data: StructuredExecutionResult) => void
  ) {
    const startTime = Date.now();

    this.data = {
      task: {
        id: taskId,
        mode,
        cwd,
        startTime,
      },
      config,
      progress: {
        currentStep: 0,
        totalSteps: config.maxSteps,
        status: "running",
        percentage: 0,
      },
      steps: [],
      logs: [],
      finalOutput: "",
      stats: {
        totalToolCalls: 0,
        totalTokensUsed: 0,
        averageStepTime: 0,
      },
    };

    this.onUpdate = onUpdate;
  }

  /**
   * 开始新步骤
   * @param stepNumber 步骤编号
   */
  startStep(stepNumber: number): void {
    const step: ExecutionStep = {
      stepNumber,
      startTime: Date.now(),
      status: "running",
      output: "",
    };

    this.data.steps.push(step);
    this.data.progress.currentStep = stepNumber;
    this.data.progress.percentage = Math.round(
      (stepNumber / this.data.progress.totalSteps) * 100
    );

    this.addLog(
      "progress",
      `Executing step ${stepNumber}/${this.data.progress.totalSteps}`,
      stepNumber
    );
    this.notifyUpdate();
  }

  /**
   * 完成当前步骤
   * @param aiResponse AI响应
   * @param toolResults 工具执行结果
   * @param output 步骤输出
   */
  completeStep(
    aiResponse: ApiResponse,
    toolResults?: Array<{
      toolName: string;
      params: Record<string, any>;
      result: string;
      success: boolean;
      error?: string;
      duration: number;
    }>,
    output?: string
  ): void {
    const currentStep = this.getCurrentStep();
    if (!currentStep) return;

    const endTime = Date.now();
    currentStep.endTime = endTime;
    currentStep.duration = endTime - currentStep.startTime;
    currentStep.status = "completed";
    currentStep.aiResponse = aiResponse;
    currentStep.toolResults = toolResults;
    currentStep.output = output || "";

    // 更新统计信息
    if (toolResults) {
      this.data.stats.totalToolCalls += toolResults.length;
    }
    if (aiResponse.usage) {
      this.data.stats.totalTokensUsed =
        (this.data.stats.totalTokensUsed || 0) + aiResponse.usage.totalTokens;
    }

    this.updateAverageStepTime();
    this.addLog("progress", "Step completed", currentStep.stepNumber);
    this.notifyUpdate();
  }

  /**
   * 标记步骤失败
   * @param error 错误信息
   */
  failStep(error: string): void {
    const currentStep = this.getCurrentStep();
    if (!currentStep) return;

    const endTime = Date.now();
    currentStep.endTime = endTime;
    currentStep.duration = endTime - currentStep.startTime;
    currentStep.status = "failed";
    currentStep.error = error;

    this.updateAverageStepTime();
    this.addLog("error", `Step failed: ${error}`, currentStep.stepNumber);
    this.notifyUpdate();
  }

  /**
   * 完成任务
   * @param success 是否成功
   * @param finalOutput 最终输出
   * @param error 错误信息（如果失败）
   */
  completeTask(success: boolean, finalOutput: string, error?: string): void {
    const endTime = Date.now();
    this.data.task.endTime = endTime;
    this.data.task.duration = endTime - this.data.task.startTime;
    this.data.finalOutput = finalOutput;

    if (success) {
      this.data.progress.status = "completed";
      this.addLog("success", "Task completed successfully");
    } else {
      this.data.progress.status = "failed";
      this.addLog("error", `Task failed: ${error || "Unknown error"}`);
    }

    this.notifyUpdate();
  }

  /**
   * 标记达到最大步骤数
   */
  markMaxStepsReached(): void {
    this.data.progress.status = "max_steps_reached";
    this.addLog(
      "warn",
      `Reached maximum number of steps (${this.data.progress.totalSteps})`
    );
    this.notifyUpdate();
  }

  /**
   * 添加日志条目
   * @param level 日志级别
   * @param message 日志消息
   * @param stepNumber 关联的步骤编号
   */
  addLog(
    level:
      | "debug"
      | "progress"
      | "info"
      | "success"
      | "warn"
      | "error"
      | "always",
    message: string,
    stepNumber?: number
  ): void {
    const logEntry: LogEntry = {
      timestamp: Date.now(),
      level,
      message,
      stepNumber,
    };

    this.data.logs.push(logEntry);
  }

  /**
   * 获取当前结构化数据
   */
  getData(): StructuredExecutionResult {
    return { ...this.data };
  }

  /**
   * 获取当前步骤
   */
  private getCurrentStep(): ExecutionStep | undefined {
    return this.data.steps[this.data.steps.length - 1];
  }

  /**
   * 更新平均步骤时间
   */
  private updateAverageStepTime(): void {
    const completedSteps = this.data.steps.filter(
      (step) => step.duration !== undefined
    );
    if (completedSteps.length > 0) {
      const totalTime = completedSteps.reduce(
        (sum, step) => sum + (step.duration || 0),
        0
      );
      this.data.stats.averageStepTime = Math.round(
        totalTime / completedSteps.length
      );
    }
  }

  /**
   * 通知更新
   */
  private notifyUpdate(): void {
    if (this.onUpdate) {
      this.onUpdate(this.getData());
    }
  }
}
