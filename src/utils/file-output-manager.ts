/**
 * 文件输出管理器
 * 
 * 这个模块提供了将结构化输出写入文件的功能，
 * 支持实时更新和最终结果输出。
 */

import fs from "fs-extra";
import path from "path";
import { StructuredExecutionResult, TaskResult } from "../types";

/**
 * 文件输出管理器
 */
export class FileOutputManager {
  private filePath: string;
  private isInitialized: boolean = false;

  /**
   * 构造函数
   * @param filePath 输出文件路径
   */
  constructor(filePath: string) {
    this.filePath = path.resolve(filePath);
  }

  /**
   * 初始化文件
   * 创建目录并初始化文件
   */
  private async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // 确保目录存在
      const dir = path.dirname(this.filePath);
      await fs.ensureDir(dir);

      // 初始化文件为空的JSON对象
      const initialData = {
        status: "running",
        startTime: Date.now(),
        structured: null,
        result: null,
      };

      await fs.writeFile(this.filePath, JSON.stringify(initialData, null, 2));
      this.isInitialized = true;
    } catch (error) {
      console.error(`Failed to initialize output file ${this.filePath}:`, error);
      throw error;
    }
  }

  /**
   * 写入结构化更新数据
   * @param data 结构化执行结果
   */
  async writeUpdate(data: StructuredExecutionResult): Promise<void> {
    try {
      await this.initialize();

      const updateData = {
        status: "running",
        lastUpdate: Date.now(),
        structured: data,
        result: null,
      };

      await fs.writeFile(this.filePath, JSON.stringify(updateData, null, 2));
    } catch (error) {
      console.error(`Failed to write update to ${this.filePath}:`, error);
    }
  }

  /**
   * 写入最终结果
   * @param result 任务结果
   */
  async writeFinalResult(result: TaskResult): Promise<void> {
    try {
      await this.initialize();

      const finalData = {
        status: result.success ? "completed" : "failed",
        completedTime: Date.now(),
        structured: result.structured,
        result: {
          success: result.success,
          taskId: result.taskId,
          output: result.output,
          error: result.error,
        },
      };

      await fs.writeFile(this.filePath, JSON.stringify(finalData, null, 2));
    } catch (error) {
      console.error(`Failed to write final result to ${this.filePath}:`, error);
    }
  }

  /**
   * 写入错误信息
   * @param error 错误信息
   */
  async writeError(error: string): Promise<void> {
    try {
      await this.initialize();

      const errorData = {
        status: "error",
        errorTime: Date.now(),
        error: error,
        structured: null,
        result: null,
      };

      await fs.writeFile(this.filePath, JSON.stringify(errorData, null, 2));
    } catch (error) {
      console.error(`Failed to write error to ${this.filePath}:`, error);
    }
  }

  /**
   * 获取文件路径
   */
  getFilePath(): string {
    return this.filePath;
  }
}

/**
 * 解析结构化输出选项
 * @param structuredOutput 结构化输出选项
 * @returns 解析结果
 */
export function parseStructuredOutputOption(structuredOutput?: boolean | string): {
  enabled: boolean;
  filePath?: string;
} {
  if (!structuredOutput) {
    return { enabled: false };
  }

  if (typeof structuredOutput === "boolean") {
    return { enabled: true };
  }

  if (typeof structuredOutput === "string") {
    return { enabled: true, filePath: structuredOutput };
  }

  return { enabled: false };
}

/**
 * 创建文件输出管理器（如果需要）
 * @param structuredOutput 结构化输出选项
 * @returns 文件输出管理器实例或 undefined
 */
export function createFileOutputManager(
  structuredOutput?: boolean | string
): FileOutputManager | undefined {
  const parsed = parseStructuredOutputOption(structuredOutput);
  
  if (parsed.enabled && parsed.filePath) {
    return new FileOutputManager(parsed.filePath);
  }

  return undefined;
}
