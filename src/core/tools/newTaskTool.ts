import { ToolHandler } from "./types";
import { handleNewTask } from "../task";
import { ApiConfig } from "../../types";

// 存储 API 配置的全局变量
let globalApiConfig: ApiConfig | null = null;

/**
 * 设置 API 配置
 * @param apiConfig API 配置
 */
export function setApiConfig(apiConfig: ApiConfig): void {
  globalApiConfig = apiConfig;
}

/**
 * 新任务工具
 * @param params 工具参数
 * @returns 工具执行结果
 */
export const newTaskTool: ToolHandler = async ({ toolUse, cwd, verbose }) => {
  const { params } = toolUse;
  const prompt = params.prompt;
  const mode = params.mode || "code";

  if (!prompt) {
    return 'Error: Missing required parameter "prompt"';
  }

  if (!globalApiConfig) {
    return "Error: API configuration not set. Please restart the CLI.";
  }

  try {
    if (verbose) {
      console.log(`Creating new task with prompt: ${prompt}`);
      console.log(`Mode: ${mode}`);

      // 打印其他参数
      if (params.auto) console.log(`Auto mode: ${params.auto}`);
      if (params.continuous)
        console.log(`Continuous mode: ${params.continuous}`);
      if (params.max_steps) console.log(`Max steps: ${params.max_steps}`);
      if (params.rules) console.log(`Rules: ${params.rules}`);
      if (params.custom_instructions)
        console.log(
          `Custom instructions: ${params.custom_instructions.substring(
            0,
            50
          )}...`
        );
      if (params.role_definition)
        console.log(
          `Role definition: ${params.role_definition.substring(0, 50)}...`
        );
      if (params.continue_from_task)
        console.log(`Continue from task: ${params.continue_from_task}`);
    }

    // 创建新任务，传递所有参数
    const result = await handleNewTask({
      prompt,
      mode,
      apiConfig: globalApiConfig,
      cwd,
      verbose,
      // 添加其他可能的参数
      auto: params.auto === "true" || Boolean(params.auto),
      continuous: params.continuous === "true" || Boolean(params.continuous),
      maxSteps: params.max_steps ? parseInt(params.max_steps, 10) : undefined,
      rules: params.rules,
      customInstructions: params.custom_instructions,
      roleDefinition: params.role_definition,
      continueFromTask: params.continue_from_task,
    });

    // 返回结果
    if (result.success) {
      return `Task completed successfully.\n\nTaskId:\n${result.taskId}\n\nOutput:\n${result.output}`;
    } else {
      return `Task failed. \n\nTaskId:\n${result.taskId}\n\nError:\n${
        result.error || "Unknown error"
      }`;
    }
  } catch (error) {
    console.error(`Error creating new task:`, error);
    return `Error creating new task: ${
      error instanceof Error ? error.message : String(error)
    }`;
  }
};
