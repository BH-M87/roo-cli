import { ToolHandler } from "./types";
import { logger } from "../../utils/logger";

/**
 * 切换模式工具
 * @param params 工具参数
 * @returns 工具执行结果
 */
export const switchModeTool: ToolHandler = async ({ toolUse }) => {
  const { params } = toolUse;
  const mode = params.mode;

  if (!mode) {
    return 'Error: Missing required parameter "mode"';
  }

  try {
    logger.debug(`Switching to mode: ${mode}`);

    // 在 CLI 中，模式切换需要通过重新启动命令来实现
    // 这里我们只返回一个提示信息，告诉用户如何切换模式
    return `To switch to ${mode} mode, please restart the CLI with the --mode ${mode} option.\n\nExample:\nroo new "Your prompt" --mode ${mode}`;
  } catch (error) {
    logger.error(
      `Error switching to mode ${mode}: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    return `Error switching to mode ${mode}: ${
      error instanceof Error ? error.message : String(error)
    }`;
  }
};
