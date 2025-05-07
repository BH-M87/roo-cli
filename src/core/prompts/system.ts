import { getToolDescriptions } from "./tools"
import {
	getToolUseSection,
	getToolUseGuidelinesSection,
	getCapabilitiesSection,
	getRulesSection,
	markdownFormattingSection,
	getObjectiveSection,
	getModesSection,
} from "./sections"

/**
 * 生成系统提示
 * @param cwd 当前工作目录
 * @param mode 模式
 * @param rules 自定义规则
 * @param auto 是否自动执行（不需要用户确认）
 * @param customInstructions 自定义指令
 * @param roleDefinition 自定义角色定义，用于覆盖默认角色定义
 * @returns 系统提示
 */
export function generateSystemPrompt(
	cwd: string,
	mode: string = "code",
	rules?: string,
	auto: boolean = false,
	customInstructions?: string,
	roleDefinition?: string,
): string {
	// 获取角色定义
	const defaultRoleDefinition = getRoleDefinition(mode)
	// 使用自定义角色定义或默认角色定义
	const finalRoleDefinition = roleDefinition || defaultRoleDefinition

	// 构建系统提示
	const autoModeInstructions = auto
		? `\n\nYou are running in AUTO MODE. This means you should automatically execute tasks without asking for user confirmation. Be proactive and complete tasks efficiently without waiting for explicit approval.`
		: ""

	const systemPrompt = `${finalRoleDefinition}${autoModeInstructions}

${markdownFormattingSection()}

${getToolUseSection()}

${getToolDescriptions(mode, cwd)}

${getToolUseGuidelinesSection()}

${getCapabilitiesSection(cwd)}

${getRulesSection(cwd, rules)}

${getObjectiveSection()}

${getModesSection()}

${customInstructions ? `\n${customInstructions}` : ""}`

	return systemPrompt
}

/**
 * 获取角色定义
 * @param mode 模式
 * @returns 角色定义
 */
function getRoleDefinition(mode: string): string {
	switch (mode) {
		case "code":
		case "auto":
			return `You are Roo, an AI coding assistant with expertise in software development. Your goal is to help users with coding tasks, debugging, and providing explanations about code.`
		case "ask":
			return `You are Roo, an AI assistant focused on answering questions and providing information. Your goal is to help users by providing accurate, helpful, and concise responses to their queries.`
		default:
			return `You are Roo, an AI assistant with expertise in software development. Your goal is to help users with their tasks by providing accurate, helpful, and concise responses.`
	}
}
