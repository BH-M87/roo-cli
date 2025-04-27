import fs from "fs-extra";
import { logger } from "../../utils/logger";
import path from "path";
import { ToolHandler } from "./types";

/**
 * 写入文件工具
 * @param params 工具参数
 * @returns 工具执行结果
 */
export const writeToFileTool: ToolHandler = async ({ toolUse, cwd }) => {
  const { params } = toolUse;
  const relPath = params.path;
  const content = params.content;

  if (!relPath) {
    return 'Error: Missing required parameter "path"';
  }

  if (content === undefined) {
    return 'Error: Missing required parameter "content"';
  }

  try {
    // 解析文件路径
    const fullPath = path.resolve(cwd, relPath);

    logger.debug(`Writing to file: ${fullPath}`);

    // 确保目录存在
    await fs.ensureDir(path.dirname(fullPath));

    // 写入文件内容
    await fs.writeFile(fullPath, content, "utf-8");

    return `Successfully wrote to file: ${relPath}`;
  } catch (error) {
    logger.error(
      `Error writing to file ${relPath}: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    return `Error writing to file ${relPath}: ${
      error instanceof Error ? error.message : String(error)
    }`;
  }
};
