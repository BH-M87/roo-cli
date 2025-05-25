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
  /** 结构化执行信息，当启用结构化输出时提供 */
  structured?: StructuredExecutionResult;
}

/**
 * 结构化执行结果
 */
export interface StructuredExecutionResult {
  /** 任务基本信息 */
  task: {
    id: string;
    mode: string;
    cwd: string;
    startTime: number;
    endTime?: number;
    duration?: number;
  };
  /** 执行配置 */
  config: {
    continuous: boolean;
    maxSteps: number;
    auto: boolean;
    onlyReturnLastResult: boolean;
  };
  /** 执行进度 */
  progress: {
    currentStep: number;
    totalSteps: number;
    status: "running" | "completed" | "failed" | "max_steps_reached";
    percentage: number;
  };
  /** 执行步骤详情 */
  steps: ExecutionStep[];
  /** 日志记录 */
  logs: LogEntry[];
  /** 最终输出 */
  finalOutput: string;
  /** 统计信息 */
  stats: {
    totalToolCalls: number;
    totalTokensUsed?: number;
    averageStepTime: number;
  };
}

/**
 * 执行步骤
 */
export interface ExecutionStep {
  /** 步骤编号 */
  stepNumber: number;
  /** 步骤开始时间 */
  startTime: number;
  /** 步骤结束时间 */
  endTime?: number;
  /** 步骤持续时间（毫秒） */
  duration?: number;
  /** 步骤状态 */
  status: "running" | "completed" | "failed";
  /** AI响应 */
  aiResponse?: {
    text: string;
    toolCalls?: ToolCall[];
    usage?: {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
    };
  };
  /** 工具执行结果 */
  toolResults?: {
    toolName: string;
    params: Record<string, any>;
    result: string;
    success: boolean;
    error?: string;
    duration: number;
  }[];
  /** 步骤输出 */
  output: string;
  /** 错误信息 */
  error?: string;
}

/**
 * 日志条目
 */
export interface LogEntry {
  /** 时间戳 */
  timestamp: number;
  /** 日志级别 */
  level:
    | "debug"
    | "progress"
    | "info"
    | "success"
    | "warn"
    | "error"
    | "always";
  /** 日志消息 */
  message: string;
  /** 关联的步骤编号 */
  stepNumber?: number;
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
  /** 是否启用结构化输出，或指定输出文件路径 */
  structuredOutput?: boolean | string;
  /** 结构化输出回调函数，用于实时更新 */
  onStructuredUpdate?: (data: StructuredExecutionResult) => void;
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
  structuredOutput?: boolean | string;
}
