import { TaskConfig, TaskResult, ApiConfig, ToolCall } from "../types";
import { getCurrentWorkingDirectory } from "../config/settings";
import { generateSystemPrompt } from "./prompts/system";
import { ContinuousExecutor } from "./continuous-executor";
import { SingleStepExecutor } from "./single-step-executor";
import { TaskManager } from "./task-manager";

/**
 * 工具响应类型
 */
export type ToolResponse = string | { text: string; images?: string[] };

/**
 * 创建或获取任务
 * @param mode 模式
 * @param workingDir 工作目录
 * @param systemPrompt 系统提示
 * @param continueFromTask 继续执行的任务ID
 * @returns 任务ID和任务管理器
 */
function createOrGetTask(
  mode: string,
  workingDir: string,
  systemPrompt: string,
  continueFromTask?: string
): { taskId: string; taskManager: TaskManager } {
  // 创建任务管理器
  const taskManager = new TaskManager();

  let taskId;

  // 如果继续执行任务
  if (continueFromTask) {
    taskId = continueFromTask;
    console.log(`Continuing from task: ${continueFromTask}`);

    // 验证任务是否存在
    const task = taskManager.getTask(continueFromTask);
    if (!task) {
      throw new Error(`Task ${continueFromTask} not found`);
    }

    console.log(`Task found with ${task.messages.length} messages`);
  } else {
    // 创建新任务
    taskId = taskManager.createTask(mode, workingDir, systemPrompt);
    console.log(`Created new task: ${taskId}`);
  }

  return { taskId, taskManager };
}

/**
 * Handle a new task
 * @param params Task parameters
 * @returns Task result
 */
export async function handleNewTask(params: {
  prompt: string;
  mode: string;
  apiConfig: ApiConfig;
  cwd?: string;
  continuous?: boolean;
  maxSteps?: number;
  verbose?: boolean;
  auto?: boolean;
  rules?: string;
  customInstructions?: string;
  roleDefinition?: string;
  continueFromTask?: string;
}): Promise<TaskResult> {
  const {
    prompt,
    mode,
    apiConfig,
    cwd,
    continuous = false,
    maxSteps = 100,
    verbose = false,
    auto = false,
    rules,
    customInstructions,
    roleDefinition,
    continueFromTask,
  } = params;
  const workingDir = getCurrentWorkingDirectory(cwd);

  // 生成系统提示
  const systemPrompt = generateSystemPrompt(
    workingDir,
    mode,
    rules,
    auto,
    customInstructions,
    roleDefinition
  );

  // 创建或获取任务
  const { taskId, taskManager } = createOrGetTask(
    mode,
    workingDir,
    systemPrompt,
    continueFromTask
  );

  console.log(`Starting task (${taskId}) in ${mode} mode`);
  console.log(`Working directory: ${workingDir}`);
  console.log(`Prompt: ${prompt}`);
  console.log(`Continuous mode: ${continuous ? "enabled" : "disabled"}`);
  console.log(`Auto mode: ${auto ? "enabled" : "disabled"}`);
  console.log(`Rules: ${rules || "none"}`);
  console.log(
    `Custom instructions: ${
      customInstructions
        ? customInstructions.length > 50
          ? customInstructions.substring(0, 50) + "..."
          : customInstructions
        : "none"
    }`
  );
  console.log(
    `Role definition: ${
      roleDefinition
        ? roleDefinition.length > 50
          ? roleDefinition.substring(0, 50) + "..."
          : roleDefinition
        : "default"
    }`
  );

  try {
    // 检查是否使用连续执行模式或自动模式
    if (continuous || auto) {
      // 创建连续执行器
      const executor = new ContinuousExecutor(
        apiConfig,
        mode,
        workingDir,
        maxSteps,
        verbose,
        auto,
        rules,
        customInstructions,
        roleDefinition,
        taskId
      );

      // 执行任务
      return await executor.execute(prompt);
    } else {
      // 单步执行模式
      // 创建单步执行器
      const executor = new SingleStepExecutor(
        apiConfig,
        mode,
        workingDir,
        verbose,
        systemPrompt,
        taskId
      );

      // 执行任务
      return (await executor.execute(prompt, false, true)) as TaskResult;
    }
  } catch (error) {
    console.error("Error executing task:", error);
    return {
      taskId,
      output: "",
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Execute a task with the given configuration
 * @param config Task configuration
 * @param apiConfig API configuration
 * @param options Additional options
 * @returns Task result
 */
export async function executeTask(
  config: TaskConfig,
  apiConfig: ApiConfig,
  options?: {
    continuous?: boolean;
    maxSteps?: number;
    verbose?: boolean;
    auto?: boolean;
    continueFromTask?: string;
  }
): Promise<TaskResult> {
  return handleNewTask({
    prompt: config.message,
    mode: config.mode,
    apiConfig,
    cwd: config.cwd,
    continuous: options?.continuous || config.auto,
    maxSteps: options?.maxSteps,
    verbose: options?.verbose,
    auto: options?.auto || config.auto,
    rules: config.rules,
    customInstructions: config.customInstructions,
    roleDefinition: config.roleDefinition,
    continueFromTask: options?.continueFromTask,
  });
}
