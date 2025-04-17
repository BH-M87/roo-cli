/**
 * 全局常量配置
 */
import { ProviderProfile } from "../types";

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
