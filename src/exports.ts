/**
 * This file contains all exports for the roo-cli npm package.
 * It allows importing and using roo-cli functionality in other Node.js applications.
 */

// Core functions
import { handleNewTask, executeTask } from "./core/task";

// Classes
import { Provider } from "./core/provider";
import { TaskManager } from "./core/task-manager";
import { ContinuousExecutor } from "./core/continuous-executor";
import { SingleStepExecutor } from "./core/single-step-executor";

// Configuration
import { getApiConfig, ApiProvider, DEFAULT_CONFIG } from "./api/config";
import { setApiConfig } from "./core/tools/newTaskTool";
import {
  readTaskConfig,
  readProviderProfiles,
  readGlobalSettings,
  getMergedCustomModes,
  resolveFilePath,
  getCurrentWorkingDirectory,
} from "./config/settings";
import { DEFAULT_TASK_CONFIG } from "./config/constants";

// Types
import {
  ApiConfig,
  TaskConfig,
  GlobalSettings,
  ProviderProfile,
  TaskResult,
} from "./types";

// Logging
import { logger, LogLevel, setLogLevel } from "./utils/logger";

// Export all
export {
  // Core functions
  handleNewTask,
  executeTask,
  
  // Classes
  Provider,
  TaskManager,
  ContinuousExecutor,
  SingleStepExecutor,
  
  // Configuration
  getApiConfig,
  setApiConfig,
  readTaskConfig,
  readProviderProfiles,
  readGlobalSettings,
  getMergedCustomModes,
  resolveFilePath,
  getCurrentWorkingDirectory,
  
  // Constants and enums
  ApiProvider,
  DEFAULT_CONFIG,
  DEFAULT_TASK_CONFIG,
  
  // Types
  ApiConfig,
  TaskConfig,
  GlobalSettings,
  ProviderProfile,
  TaskResult,
  
  // Logging
  logger,
  LogLevel,
  setLogLevel,
};
