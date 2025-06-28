import fs from 'fs-extra';
import { logger } from '../../utils/logger';
import path from 'path';
import { ToolHandler, ToolResponse } from './types';

/**
 * 检测代码是否被截断
 * @param newContent 新文件内容
 * @param predictedLineCount 预期行数
 * @returns 是否被截断
 */
function detectCodeOmission(
	newContent: string,
	predictedLineCount?: number,
): boolean {
	// 检查是否有常见的代码省略注释
	const omissionPatterns = [
		/\/\/\s*rest of (code|file) (unchanged|here|remains)/i,
		/\/\*\s*previous code\s*\*\//i,
		/\/\/\s*existing code/i,
		/\/\/\s*code (continues|omitted)/i,
		/\/\/\s*unchanged code/i,
		/\/\/\s*remaining code/i,
		/\/\/\s*other code/i,
		/\/\/\s*more code/i,
		/\/\/\s*additional code/i,
		/\/\/\s*original code/i,
		/\/\/\s*rest of the implementation/i,
		/\/\/\s*implementation details/i,
		/\/\/\s*other methods/i,
		/\/\/\s*other functions/i,
		/\/\/\s*other properties/i,
		/\/\/\s*other imports/i,
		/\/\/\s*other exports/i,
		/\/\/\s*other declarations/i,
		/\/\/\s*other definitions/i,
		/\/\/\s*other components/i,
		/\/\/\s*other classes/i,
		/\/\/\s*other interfaces/i,
		/\/\/\s*other types/i,
		/\/\/\s*other enums/i,
		/\/\/\s*other constants/i,
		/\/\/\s*other variables/i,
		/\/\/\s*other fields/i,
		/\/\/\s*other attributes/i,
		/\/\/\s*other elements/i,
		/\/\/\s*other parts/i,
		/\/\/\s*other sections/i,
		/\/\/\s*other blocks/i,
		/\/\/\s*other statements/i,
		/\/\/\s*other expressions/i,
		/\/\/\s*other lines/i,
		/\/\/\s*other content/i,
		/\/\/\s*other code/i,
		/\/\/\s*other logic/i,
		/\/\/\s*other functionality/i,
		/\/\/\s*other features/i,
		/\/\/\s*other implementations/i,
		/\/\/\s*other details/i,
		/\/\/\s*other stuff/i,
		/\/\/\s*other things/i,
		/\/\/\s*other items/i,
		/\/\/\s*other objects/i,
		/\/\/\s*other data/i,
		/\/\/\s*other information/i,
		/\/\/\s*other text/i,
		/\/\/\s*other content/i,
		/\/\/\s*other code/i,
	];

	// 检查内容中是否包含省略注释
	for (const pattern of omissionPatterns) {
		if (pattern.test(newContent)) {
			return true;
		}
	}

	// 如果提供了预期行数，检查实际行数是否少于预期行数
	if (predictedLineCount) {
		const actualLineCount = newContent.split('\n').length;
		if (actualLineCount < predictedLineCount * 0.9) {
			// 允许10%的误差
			return true;
		}
	}

	return false;
}

/**
 * 预处理内容，移除可能的代码块标记
 * @param content 原始内容
 * @returns 处理后的内容
 */
function preprocessContent(content: string): string {
	let processedContent = content;

	// 移除可能的代码块标记
	if (processedContent.startsWith('```')) {
		const lines = processedContent.split('\n');
		processedContent = lines.slice(1).join('\n').trim();
	}

	if (processedContent.endsWith('```')) {
		const lines = processedContent.split('\n');
		processedContent = lines.slice(0, -1).join('\n').trim();
	}

	return processedContent;
}

/**
 * 写入文件工具
 * @param params 工具参数
 * @returns 工具执行结果
 */
export const writeToFileTool: ToolHandler = async ({ toolUse, cwd }) => {
	const { params } = toolUse;
	const relPath = params.path;
	let content = params.content;
	const predictedLineCount = params.line_count
		? parseInt(params.line_count, 10)
		: undefined;

	// 验证必需参数
	if (!relPath) {
		return 'Error: Missing required parameter "path"';
	}

	if (content === undefined) {
		return 'Error: Missing required parameter "content"';
	}

	// Handle special cases for content
	// Allow newline-only content and empty content as per roo-code improvements
	if (content === null) {
		content = '';
	}

	try {
		// 预处理内容
		content = preprocessContent(content);

		// Handle newline-only content - don't treat it as truncated
		const isNewlineOnlyContent = content === '\n' || content === '\r\n';
		const isEmptyContent = content === '';

		// 解析文件路径
		const fullPath = path.resolve(cwd, relPath);
		logger.debug(`Writing to file: ${fullPath}`);

		if (isEmptyContent) {
			logger.debug('Writing empty content to file');
		} else if (isNewlineOnlyContent) {
			logger.debug('Writing newline-only content to file');
		}

		// 检查文件是否存在
		const fileExists = await fs.pathExists(fullPath);

		if (fileExists) {
			logger.debug(`File exists: ${fullPath}`);
		}

		// 检测代码是否被截断 (but skip for newline-only and empty content)
		if (
			!isNewlineOnlyContent &&
			!isEmptyContent &&
			detectCodeOmission(content, predictedLineCount)
		) {
			return {
				text: `Warning: The content appears to be truncated or contains code omission markers (e.g., '// rest of code unchanged'). Please provide the complete file content without any omissions.`,
			} as ToolResponse;
		}

		// 确保目录存在
		await fs.ensureDir(path.dirname(fullPath));

		// 写入文件内容
		await fs.writeFile(fullPath, content, 'utf-8');

		// 返回成功消息
		let successMessage = '';
		if (fileExists) {
			successMessage = `Successfully updated existing file: ${relPath}`;
		} else {
			successMessage = `Successfully created new file: ${relPath}`;
		}

		// Add context about content type
		if (isEmptyContent) {
			successMessage += ' (empty file)';
		} else if (isNewlineOnlyContent) {
			successMessage += ' (newline-only content)';
		}

		return {
			text: successMessage,
		} as ToolResponse;
	} catch (error) {
		logger.error(
			`Error writing to file ${relPath}: ${error instanceof Error ? error.message : String(error)}`,
		);
		return `Error writing to file ${relPath}: ${error instanceof Error ? error.message : String(error)}`;
	}
};
