/**
 * This file contains all exports for the roo-cli npm package.
 * It allows importing and using roo-cli functionality in other Node.js applications.
 */

// Core functions
export { handleNewTask, executeTask } from "./core/task";

// Classes
export { Provider } from "./core/provider";
export { TaskManager } from "./core/task-manager";
export { ContinuousExecutor } from "./core/continuous-executor";
export { SingleStepExecutor } from "./core/single-step-executor";

// Configuration
export { getApiConfig, ApiProvider, DEFAULT_CONFIG } from "./api/config";
export { setApiConfig } from "./core/tools/newTaskTool";
export {
  readTaskConfig,
  readProviderProfiles,
  readGlobalSettings,
  getMergedCustomModes,
  resolveFilePath,
  getCurrentWorkingDirectory,
} from "./config/settings";
export { DEFAULT_TASK_CONFIG } from "./config/constants";

// Types
export {
  ApiConfig,
  TaskConfig,
  GlobalSettings,
  ProviderProfile,
  TaskResult,
  HandleNewTaskParams,
  CommandOptions,
} from "./types";

// Logging
export { logger, LogLevel, setLogLevel } from "./utils/logger";
