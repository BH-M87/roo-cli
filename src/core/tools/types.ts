/**
 * CLI 工具类型定义
 */

import { ToolResponse } from '../task';
import { logger } from '../../utils/logger';

export { ToolResponse };

/**
 * 工具组类型
 */
export type ToolGroup =
	| 'read'
	| 'edit'
	| 'browser'
	| 'command'
	| 'mcp'
	| 'modes';

/**
 * 工具组配置
 */
export interface ToolGroupConfig {
	tools: string[];
	alwaysAvailable?: boolean;
}

/**
 * 工具参数名称
 */
export type ToolParamName =
	| 'path'
	| 'start_line'
	| 'end_line'
	| 'content'
	| 'command'
	| 'cwd'
	| 'regex'
	| 'file_pattern'
	| 'action'
	| 'url'
	| 'coordinate'
	| 'text'
	| 'size'
	| 'task'
	| 'mode'
	| 'prompt';

/**
 * 工具使用参数
 */
export interface ToolUseParams {
	[key: string]: string | undefined;
}

/**
 * 工具使用定义
 */
export interface ToolUse {
	name: string;
	params: ToolUseParams;
	partial?: boolean;
}

/**
 * 工具处理函数类型
 */
export type ToolHandler = (params: {
	toolUse: ToolUse;
	cwd: string;
}) => Promise<ToolResponse>;

/**
 * 工具描述函数类型
 */
export type ToolDescription = (args: ToolArgs) => string;

/**
 * 工具参数
 */
export interface ToolArgs {
	cwd: string;
	supportsComputerUse: boolean;
	browserViewportSize?: string;
	toolOptions?: any;
}

/**
 * 工具注册表
 */
export interface ToolRegistry {
	[toolName: string]: {
		handler: ToolHandler;
		description: ToolDescription;
	};
}

/**
 * 工具组映射
 */
export const TOOL_GROUPS: Record<ToolGroup, ToolGroupConfig> = {
	read: {
		tools: [
			'read_file',
			'search_files',
			'list_files',
			'list_code_definition_names',
			'semantic_code_search',
		],
	},
	edit: {
		tools: [
			'write_to_file',
			'insert_content',
			'diff_files',
			'search_and_replace',
		],
	},
	browser: {
		tools: ['browser_action'],
	},
	command: {
		tools: ['execute_command'],
	},
	mcp: {
		tools: ['use_mcp_tool', 'access_mcp_resource'],
	},
	modes: {
		tools: ['switch_mode', 'new_task'],
		alwaysAvailable: true,
	},
};
