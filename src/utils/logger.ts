/**
 * 日志工具
 *
 * 这个模块提供了统一的日志输出控制功能，通过设置日志级别来控制输出。
 * 不同的日志级别对应不同的输出详细程度：
 * - DEBUG: 最详细的日志，包含所有调试信息
 * - INFO: 一般信息日志
 * - SUCCESS: 成功信息日志
 * - WARN: 警告信息日志
 * - ERROR: 错误信息日志
 * - ALWAYS: 始终显示的日志，不受日志级别控制
 */

import chalk from "chalk";

// 日志级别
export enum LogLevel {
  DEBUG = 0, // 调试级别，最详细
  PROGRESS = 1, // 进度级别，任务执行进度和状态
  INFO = 2, // 信息级别，一般信息
  SUCCESS = 3, // 成功级别，成功信息
  WARN = 4, // 警告级别，警告信息
  ERROR = 5, // 错误级别，错误信息
  ALWAYS = 6, // 始终显示，不受日志级别控制
}

// 日志配置
interface LogConfig {
  currentLevel: LogLevel; // 当前日志级别
}

// 默认配置
const config: LogConfig = {
  currentLevel: LogLevel.PROGRESS, // 默认为进度级别，只显示关键进度信息
};

/**
 * 设置日志级别
 * @param level 要设置的日志级别
 */
export function setLogLevel(level: LogLevel): void {
  config.currentLevel = level;
}

/**
 * 获取当前日志级别
 * @returns 当前日志级别
 */
export function getLogLevel(): LogLevel {
  return config.currentLevel;
}

/**
 * 统一的日志输出函数
 * @param message 要输出的消息
 * @param level 日志级别
 * @param color 颜色函数
 */
function logWithLevel(
  message: any,
  level: LogLevel = LogLevel.INFO,
  color: (text: string) => string = (text) => text
): void {
  // 如果消息级别低于当前级别，则不输出
  if (level < config.currentLevel) {
    return;
  }

  // 输出消息
  console.log(color(message));
}

/**
 * 日志工具对象
 */
export const logger = {
  /**
   * 设置日志级别
   * @param level 日志级别（debug, info, progress, warn, error, always）
   */
  setLevel: (level: string): void => {
    switch (level.toLowerCase()) {
      case "debug":
        setLogLevel(LogLevel.DEBUG);
        break;
      case "progress":
        setLogLevel(LogLevel.PROGRESS);
        break;
      case "info":
        setLogLevel(LogLevel.INFO);
        break;
      case "warn":
      case "warning":
        setLogLevel(LogLevel.WARN);
        break;
      case "error":
        setLogLevel(LogLevel.ERROR);
        break;
      case "always":
        setLogLevel(LogLevel.ALWAYS);
        break;
      default:
        setLogLevel(LogLevel.PROGRESS);
    }
  },

  /**
   * 调试日志，仅在详细模式下显示
   * @param message 要输出的消息
   */
  debug: (message: any): void => {
    logWithLevel(message, LogLevel.DEBUG, chalk.gray);
  },

  /**
   * 进度日志，显示任务执行的关键进度和状态
   * @param message 要输出的消息
   */
  progress: (message: any): void => {
    logWithLevel(message, LogLevel.PROGRESS, chalk.blue);
  },

  /**
   * 信息日志，显示详细信息
   * @param message 要输出的消息
   */
  info: (message: any): void => {
    logWithLevel(message, LogLevel.INFO);
  },

  /**
   * 成功日志，显示成功信息
   * @param message 要输出的消息
   */
  success: (message: any): void => {
    logWithLevel(message, LogLevel.SUCCESS, chalk.green);
  },

  /**
   * 警告日志，在非安静模式下显示
   * @param message 要输出的消息
   */
  warn: (message: any): void => {
    logWithLevel(message, LogLevel.WARN, chalk.yellow);
  },

  /**
   * 错误日志，始终显示
   * @param message 要输出的消息
   */
  error: (message: any): void => {
    logWithLevel(message, LogLevel.ERROR, chalk.red);
  },

  /**
   * 始终显示的日志，不受安静模式影响
   * @param message 要输出的消息
   */
  always: (message: any): void => {
    logWithLevel(message, LogLevel.ALWAYS);
  },

  /**
   * 原始日志，直接使用 console.log
   * @param message 要输出的消息
   */
  raw: (message: any): void => {
    console.log(message);
  },
};

/**
 * 始终打印消息
 * 无论当前日志级别如何，这个函数都会打印消息
 * @param message 要打印的消息
 */
export function alwaysPrint(message: string): void {
  logger.always(message);
}
