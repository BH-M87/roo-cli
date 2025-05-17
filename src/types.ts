// Common types used across the CLI application

export interface TaskConfig {
  mode: string;
  message: string;
  cwd?: string;
  auto?: boolean;
  rules?: string;
  customInstructions?: string;
  roleDefinition?: string;
}

export interface ProviderProfile {
  currentApiConfigName: string;
  apiConfigs: Record<string, ApiConfig>;
  migrations?: Record<string, boolean>;
}

export interface ApiConfig {
  apiProvider: string;
  openAiBaseUrl?: string;
  openAiApiKey?: string;
  openAiModelId?: string;
  openAiCustomModelInfo?: {
    maxTokens: number;
    contextWindow: number;
    supportsImages: boolean;
    supportsPromptCache: boolean;
    inputPrice: number;
    outputPrice: number;
  };
  anthropicApiKey?: string;
  anthropicModelId?: string;
  id?: string;
  streamMode?: boolean;
}

export interface GlobalSettings {
  lastShownAnnouncementId?: string;
  autoApprovalEnabled?: boolean;
  alwaysAllowReadOnly?: boolean;
  alwaysAllowReadOnlyOutsideWorkspace?: boolean;
  alwaysAllowWrite?: boolean;
  alwaysAllowWriteOutsideWorkspace?: boolean;
  alwaysAllowBrowser?: boolean;
  alwaysApproveResubmit?: boolean;
  alwaysAllowMcp?: boolean;
  alwaysAllowModeSwitch?: boolean;
  alwaysAllowSubtasks?: boolean;
  alwaysAllowExecute?: boolean;
  allowedCommands?: string[];
  browserToolEnabled?: boolean;
  ttsEnabled?: boolean;
  ttsSpeed?: number;
  soundEnabled?: boolean;
  soundVolume?: number;
  language?: string;
  telemetrySetting?: string;
  customModes?: CustomMode[];
}

export interface CustomMode {
  slug: string;
  name: string;
  roleDefinition: string;
  customInstructions?: string;
  groups: (string | [string, { fileRegex: string; description: string }])[];
  source: string;
}

export interface TaskResult {
  taskId: string;
  output: string;
  success: boolean;
  error?: string;
}

/**
 * 处理新任务的参数类型
 */
export interface HandleNewTaskParams {
  /** 提示信息 */
  prompt: string;
  /** 模式 */
  mode: string;
  /** API配置 */
  apiConfig: ApiConfig;
  /** 工作目录 */
  cwd?: string;
  /** 是否连续执行 */
  continuous?: boolean;
  /** 最大步骤数 */
  maxSteps?: number;
  /** 日志级别 */
  logLevel?: string;
  /** 是否自动模式 */
  auto?: boolean;
  /** 规则 */
  rules?: string;
  /** 自定义指令 */
  customInstructions?: string;
  /** 角色定义 */
  roleDefinition?: string;
  /** 继续执行的任务ID */
  continueFromTask?: string;
  /** 是否只返回最后一个结果 */
  onlyReturnLastResult?: boolean;
}

export interface ApiResponse {
  text: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  toolCalls?: ToolCall[];
}

export interface ToolCall {
  name: string;
  params: Record<string, string>;
}

export interface CommandOptions {
  prompt?: string;
  mode?: string;
  workspace?: string;
  configFile?: string;
  providerFile?: string;
  settingsFile?: string;
  modesFile?: string;
  inputFile?: string;
  logLevel?: string;
  continuous?: boolean;
  maxSteps?: string;
  apiProvider?: string;
  openaiApiKey?: string;
  openaiBaseUrl?: string;
  openaiModel?: string;
  streamMode?: boolean;
  anthropicApiKey?: string;
  anthropicModel?: string;
  auto?: boolean;
  rules?: string;
  customInstructions?: string;
  roleDefinition?: string;
  continueFromTask?: string;
  onlyReturnLastResult?: boolean;
}
