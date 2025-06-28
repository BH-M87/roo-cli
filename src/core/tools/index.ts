/**
 * 工具管理器
 */

import { GlobalSettings } from '../../types';
import { logger } from '../../utils/logger';
import { ToolRegistry, ToolUse, TOOL_GROUPS } from './types';
import { readFileTool } from './readFileTool';
import { writeToFileTool } from './writeToFileTool';
import { listFilesTool } from './listFilesTool';
import { executeCommandTool } from './executeCommandTool';
import { searchFilesTool } from './searchFilesTool';
import { browserActionTool } from './browserActionTool';
import { listCodeDefinitionsTool } from './listCodeDefinitionsTool';
import { switchModeTool } from './switchModeTool';
import { newTaskTool } from './newTaskTool';
import { diffFilesTool } from './diffFilesTool';
import { insertContentTool } from './insertContentTool';
import { useMcpTool, accessMcpResource } from './mcpTool';
import { semanticCodeSearchTool } from './semanticCodeSearchTool';
import { searchAndReplaceTool } from './searchAndReplaceTool';
import { getSemanticCodeSearchDescription } from '../prompts/tools/semantic-code-search';
import { getReadFileDescription } from '../prompts/tools/read-file';
import { getWriteToFileDescription } from '../prompts/tools/write-to-file';
import { getListFilesDescription } from '../prompts/tools/list-files';
import { getExecuteCommandDescription } from '../prompts/tools/execute-command';
import { getSearchFilesDescription } from '../prompts/tools/search-files';
import { getInsertContentDescription } from '../prompts/tools/insert-content';
import { getSearchAndReplaceDescription } from '../prompts/tools/search-and-replace';
import { getListCodeDefinitionNamesDescription } from '../prompts/tools/list-code-definition-names';
import { getBrowserActionDescription } from '../prompts/tools/browser-action';
import { getSwitchModeDescription } from '../prompts/tools/switch-mode';
import { getNewTaskDescription } from '../prompts/tools/new-task';
import { getDiffFilesDescription } from '../prompts/tools/diff-files';
import { getUseMcpToolDescription } from '../prompts/tools/use-mcp-tool';
import { getAccessMcpResourceDescription } from '../prompts/tools/access-mcp-resource';

/**
 * 工具注册表
 */
export const toolRegistry: ToolRegistry = {
	read_file: {
		handler: readFileTool,
		description: getReadFileDescription,
	},
	list_files: {
		handler: listFilesTool,
		description: getListFilesDescription,
	},
	execute_command: {
		handler: executeCommandTool,
		description: getExecuteCommandDescription,
	},
	search_files: {
		handler: searchFilesTool,
		description: getSearchFilesDescription,
	},
	browser_action: {
		handler: browserActionTool,
		description: getBrowserActionDescription,
	},
	list_code_definition_names: {
		handler: listCodeDefinitionsTool,
		description: getListCodeDefinitionNamesDescription,
	},
	switch_mode: {
		handler: switchModeTool,
		description: getSwitchModeDescription,
	},
	new_task: {
		handler: newTaskTool,
		description: getNewTaskDescription,
	},
	diff_files: {
		handler: diffFilesTool,
		description: getDiffFilesDescription,
	},
	use_mcp_tool: {
		handler: useMcpTool,
		description: getUseMcpToolDescription,
	},
	access_mcp_resource: {
		handler: accessMcpResource,
		description: getAccessMcpResourceDescription,
	},
	semantic_code_search: {
		handler: semanticCodeSearchTool,
		description: getSemanticCodeSearchDescription,
	},
	// write
	write_to_file: {
		handler: writeToFileTool,
		description: getWriteToFileDescription,
	},
	insert_content: {
		handler: insertContentTool,
		description: getInsertContentDescription,
	},
	search_and_replace: {
		handler: searchAndReplaceTool,
		description: getSearchAndReplaceDescription,
	},
};

/**
 * 检查工具是否可用
 * @param toolName 工具名称
 * @param mode 当前模式
 * @param settings 全局设置
 * @returns 是否可用
 */
export function isToolAvailable(
	toolName: string,
	mode: string,
	settings: GlobalSettings,
): boolean {
	// 检查工具是否在注册表中
	if (!toolRegistry[toolName]) {
		return false;
	}

	// 检查自定义模式的工具权限
	const customMode = settings.customModes?.find(m => m.slug === mode);
	if (customMode) {
		// 检查工具组权限
		for (const group of customMode.groups) {
			if (typeof group === 'string') {
				// 如果是字符串，直接检查工具组
				const toolGroup = TOOL_GROUPS[group as keyof typeof TOOL_GROUPS];
				if (toolGroup && toolGroup.tools.includes(toolName)) {
					return true;
				}
			} else if (Array.isArray(group) && group.length === 2) {
				// 如果是数组，检查工具组和正则表达式
				const [groupName, _] = group;
				const toolGroup = TOOL_GROUPS[groupName as keyof typeof TOOL_GROUPS];
				if (toolGroup && toolGroup.tools.includes(toolName)) {
					return true;
				}
			}
		}
		return false;
	}

	// ask 模式不允许写入文件相关的工具
	if (mode === 'ask') {
		// 检查工具是否属于 edit 组（写入文件相关工具）
		const editTools = TOOL_GROUPS.edit.tools;
		if (editTools.includes(toolName)) {
			return false;
		}
	}

	// code 模式允许所有工具
	return true;
}

/**
 * 执行工具
 * @param toolUse 工具使用
 * @param cwd 当前工作目录
 * @returns 工具执行结果
 */
export async function executeTool(
	toolUse: ToolUse,
	cwd: string,
): Promise<string> {
	const { name } = toolUse;

	// 检查工具是否存在
	if (!toolRegistry[name]) {
		return `Error: Tool '${name}' not found`;
	}

	try {
		// 获取工具处理函数
		const handler = toolRegistry[name].handler;

		// 执行工具
		logger.debug(`Executing tool: ${name}`);
		logger.debug(`Parameters: ${JSON.stringify(toolUse.params)}`);

		const result = await handler({ toolUse, cwd });

		logger.debug(`Tool ${name} execution completed`);

		// 返回结果
		if (typeof result === 'string') {
			return result;
		} else {
			return result.text;
		}
	} catch (error) {
		logger.error(
			`Error executing tool ${name}: ${
				error instanceof Error ? error.message : String(error)
			}`,
		);
		return `Error executing tool ${name}: ${
			error instanceof Error ? error.message : String(error)
		}`;
	}
}

/**
 * 获取工具描述
 * @param toolName 工具名称
 * @param cwd 当前工作目录
 * @returns 工具描述
 */
export function getToolDescription(toolName: string, cwd: string): string {
	if (!toolRegistry[toolName]) {
		return '';
	}

	return toolRegistry[toolName].description({
		cwd,
		supportsComputerUse: false,
		browserViewportSize: '900x600',
	});
}

/**
 * 获取所有可用工具的描述
 * @param mode 当前模式
 * @param settings 全局设置
 * @param cwd 当前工作目录
 * @returns 工具描述列表
 */
export function getAllToolDescriptions(
	mode: string,
	settings: GlobalSettings,
	cwd: string,
): Record<string, string> {
	const descriptions: Record<string, string> = {};

	for (const toolName in toolRegistry) {
		if (isToolAvailable(toolName, mode, settings)) {
			descriptions[toolName] = getToolDescription(toolName, cwd);
		}
	}

	return descriptions;
}
