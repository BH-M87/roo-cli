import { ToolCall } from "../types";
import { executeTool } from "./tools";
import { ToolUse } from "./tools/types";
import { logger } from "../utils/logger";

/**
 * 工具执行器
 */
export class ToolExecutor {
  private cwd: string;

  /**
   * 构造函数
   * @param cwd 当前工作目录
   */
  constructor(cwd: string) {
    this.cwd = cwd;
  }

  /**
   * 执行工具调用
   * @param toolCall 工具调用
   * @returns 工具执行结果
   */
  async execute(toolCall: ToolCall): Promise<string> {
    const { name, params } = toolCall;

    logger.debug(`Executing tool: ${name}`);
    logger.debug(`Parameters: ${JSON.stringify(params)}`);

    // 创建工具使用对象
    const toolUse: ToolUse = {
      name,
      params,
    };

    // 执行工具
    return executeTool(toolUse, this.cwd);
  }
}
