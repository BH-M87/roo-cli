import { ApiConfig } from "../types"
import { CommandOptions } from "../types"

/**
 * API 提供商枚举
 */
export enum ApiProvider {
	OPENAI = "openai",
	ANTHROPIC = "anthropic",
}

/**
 * 默认配置
 */
export const DEFAULT_CONFIG = {
	[ApiProvider.OPENAI]: {
		modelId: "gpt-4",
		baseUrl: "https://api.openai.com/v1",
	},
	[ApiProvider.ANTHROPIC]: {
		modelId: "claude-3-5-sonnet-20241022",
	},
}

/**
 * 从命令行选项和环境变量中获取 API 配置
 * @param options 命令行选项
 * @param env 环境变量，默认为 process.env
 * @returns API 配置或 undefined
 */
export function getApiConfig(options: CommandOptions, env = process.env): ApiConfig | undefined {
	// 检查是否有任何 API 相关选项或环境变量
	const hasApiOptions =
		options.apiProvider ||
		options.openaiApiKey ||
		options.openaiBaseUrl ||
		options.openaiModel ||
		options.anthropicApiKey ||
		options.anthropicModel ||
		env.OPENAI_API_KEY ||
		env.OPENAI_BASE_URL ||
		env.OPENAI_MODEL_ID ||
		env.ANTHROPIC_API_KEY ||
		env.ANTHROPIC_MODEL_ID

	if (!hasApiOptions) {
		return undefined
	}

	// 确定 API 提供商，优先使用环境变量
	const apiProvider = env.OPENAI_API_KEY
		? ApiProvider.OPENAI
		: env.ANTHROPIC_API_KEY
			? ApiProvider.ANTHROPIC
			: options.apiProvider || options.openaiApiKey
				? ApiProvider.OPENAI
				: options.anthropicApiKey
					? ApiProvider.ANTHROPIC
					: undefined

	if (!apiProvider) {
		return undefined
	}

	// 根据提供商创建 API 配置，环境变量优先级最高
	switch (apiProvider) {
		case ApiProvider.OPENAI:
			return {
				apiProvider: ApiProvider.OPENAI,
				openAiApiKey: env.OPENAI_API_KEY || options.openaiApiKey,
				openAiBaseUrl:
					env.OPENAI_BASE_URL || options.openaiBaseUrl || DEFAULT_CONFIG[ApiProvider.OPENAI].baseUrl,
				openAiModelId: env.OPENAI_MODEL_ID || options.openaiModel || DEFAULT_CONFIG[ApiProvider.OPENAI].modelId,
				id: "cli-openai",
			}
		case ApiProvider.ANTHROPIC:
			return {
				apiProvider: ApiProvider.ANTHROPIC,
				anthropicApiKey: env.ANTHROPIC_API_KEY || options.anthropicApiKey,
				anthropicModelId:
					env.ANTHROPIC_MODEL_ID || options.anthropicModel || DEFAULT_CONFIG[ApiProvider.ANTHROPIC].modelId,
				id: "cli-anthropic",
			}
		default:
			return undefined
	}
}
