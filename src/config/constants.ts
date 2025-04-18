/**
 * 全局常量配置
 */
import { ProviderProfile, GlobalSettings, TaskConfig } from "../types";

/**
 * 默认相对目录路径
 */
export const DEFAULT_REL_DIR_PATH = ".";

/**
 * 默认的 Provider Profiles 配置
 */
export const DEFAULT_PROVIDER_PROFILES: ProviderProfile = {
  currentApiConfigName: "anthropic",
  apiConfigs: {
    anthropic: {
      apiProvider: "anthropic",
      anthropicApiKey: "",
      anthropicModelId: "claude-3-5-sonnet-20241022",
      id: "anthropic",
    },
    openai: {
      apiProvider: "openai",
      openAiApiKey: "",
      openAiBaseUrl: "https://api.openai.com/v1",
      openAiModelId: "gpt-4",
      id: "openai",
    },
  },
};

/**
 * 默认的 Global Settings 配置
 */
export const DEFAULT_GLOBAL_SETTINGS: GlobalSettings = {
  autoApprovalEnabled: true,
  alwaysAllowReadOnly: true,
  alwaysAllowReadOnlyOutsideWorkspace: false,
  alwaysAllowWrite: true,
  alwaysAllowWriteOutsideWorkspace: false,
  alwaysAllowBrowser: true,
  alwaysApproveResubmit: true,
  alwaysAllowMcp: true,
  alwaysAllowModeSwitch: true,
  alwaysAllowSubtasks: true,
  alwaysAllowExecute: true,
  allowedCommands: [
    "npm test",
    "npm install",
    "tsc",
    "git log",
    "git diff",
    "git show",
  ],
  browserToolEnabled: true,
  ttsEnabled: false,
  ttsSpeed: 1,
  soundEnabled: false,
  soundVolume: 0.5,
  language: "en",
  telemetrySetting: "enabled",
  customModes: [
    {
      slug: "test",
      name: "Test",
      roleDefinition:
        "You are a testing specialist focused on writing and maintaining test suites.",
      customInstructions:
        "When writing tests, ensure proper test isolation and coverage.",
      groups: ["read", "browser", "command"],
      source: "default",
    },
  ],
};

/**
 * 默认的 Task 配置
 */
export const DEFAULT_TASK_CONFIG: TaskConfig = {
  mode: "code",
  message: "Welcome to Roo CLI! Please enter a prompt to get started.",
  cwd: process.cwd(),
};
