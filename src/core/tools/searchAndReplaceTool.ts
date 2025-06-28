import fs from 'fs-extra';
import path from 'path';
import { logger } from '../../utils/logger';
import { ToolHandler, ToolResponse } from './types';

/**
 * 转义正则表达式特殊字符
 * @param input 输入字符串
 * @returns 转义后的字符串
 */
function escapeRegExp(input: string): string {
	return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * 搜索和替换工具
 * @param params 工具参数
 * @returns 工具执行结果
 */
export const searchAndReplaceTool: ToolHandler = async ({ toolUse, cwd }) => {
	const { params } = toolUse;
	const filePath = params.path;
	const search = params.search;
	const replace = params.replace;
	const useRegex = params.use_regex === 'true';
	const ignoreCase = params.ignore_case === 'true';
	const startLine = params.start_line
		? parseInt(params.start_line, 10)
		: undefined;
	const endLine = params.end_line ? parseInt(params.end_line, 10) : undefined;

	// 验证必需参数
	if (!filePath) {
		return 'Error: Missing required parameter "path"';
	}

	if (!search) {
		return 'Error: Missing required parameter "search"';
	}

	if (replace === undefined) {
		return 'Error: Missing required parameter "replace"';
	}

	try {
		// 解析文件路径
		const fullPath = path.resolve(cwd, filePath);
		logger.debug(`Searching and replacing in file: ${fullPath}`);
		logger.debug(`Search: ${search}, Replace: ${replace}`);
		logger.debug(`Use regex: ${useRegex}, Ignore case: ${ignoreCase}`);
		logger.debug(`Start line: ${startLine}, End line: ${endLine}`);

		// 检查文件是否存在
		if (!(await fs.pathExists(fullPath))) {
			return `Error: File not found: ${filePath}`;
		}

		// 读取文件内容
		const fileContent = await fs.readFile(fullPath, 'utf-8');

		// 创建搜索模式并执行替换
		const flags = ignoreCase ? 'gi' : 'g';
		const searchPattern = useRegex
			? new RegExp(search, flags)
			: new RegExp(escapeRegExp(search), flags);

		let newContent: string;
		let matchCount = 0;

		if (startLine !== undefined || endLine !== undefined) {
			// 处理特定行范围的替换
			const lines = fileContent.split('\n');
			const start = Math.max((startLine ?? 1) - 1, 0);
			const end = Math.min((endLine ?? lines.length) - 1, lines.length - 1);

			// 获取目标区域前后的内容
			const beforeLines = lines.slice(0, start);
			const afterLines = lines.slice(end + 1);

			// 获取并修改目标区域
			const targetContent = lines.slice(start, end + 1).join('\n');

			// 计算匹配数量
			const matches = targetContent.match(searchPattern);
			matchCount = matches ? matches.length : 0;

			const modifiedContent = targetContent.replace(searchPattern, replace);
			const modifiedLines = modifiedContent.split('\n');

			// 重建完整内容
			newContent = [...beforeLines, ...modifiedLines, ...afterLines].join('\n');
		} else {
			// 全局替换
			// 计算匹配数量
			const matches = fileContent.match(searchPattern);
			matchCount = matches ? matches.length : 0;

			newContent = fileContent.replace(searchPattern, replace);
		}

		// 检查是否有变化
		if (fileContent === newContent) {
			return `No matches found for '${search}' in ${filePath}`;
		}

		// 写入文件
		await fs.writeFile(fullPath, newContent, 'utf-8');

		return {
			text: `Successfully replaced ${matchCount} occurrence${matchCount !== 1 ? 's' : ''} of '${search}' with '${replace}' in ${filePath}`,
		} as ToolResponse;
	} catch (error) {
		logger.error(
			`Error performing search and replace in file ${filePath}: ${
				error instanceof Error ? error.message : String(error)
			}`,
		);
		return `Error performing search and replace in file ${filePath}: ${
			error instanceof Error ? error.message : String(error)
		}`;
	}
};
