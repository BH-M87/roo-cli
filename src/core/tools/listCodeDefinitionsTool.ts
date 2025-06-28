import fs from 'fs-extra';
import { logger } from '../../utils/logger';
import path from 'path';
import glob from 'glob';
import { ToolHandler, ToolResponse } from './types';

// 支持的文件扩展名
const SUPPORTED_EXTENSIONS = [
	// JavaScript/TypeScript
	'.js',
	'.jsx',
	'.ts',
	'.tsx',
	// Python
	'.py',
	// Java
	'.java',
	// C/C++
	'.c',
	'.h',
	'.cpp',
	'.hpp',
	// C#
	'.cs',
	// Go
	'.go',
	// Ruby
	'.rb',
	// PHP
	'.php',
	// Rust
	'.rs',
	// Swift
	'.swift',
	// Kotlin
	'.kt',
	'.kts',
	// HTML
	'.html',
	'.htm',
	// CSS
	'.css',
	// JSON
	'.json',
	// Markdown
	'.md',
	'.markdown',
	// TOML
	'.toml',
	// Lua
	'.lua',
	// Scala
	'.scala',
	// Zig
	'.zig',
	// Elm
	'.elm',
	// Embedded Template
	'.ejs',
	'.erb',
];

// 最小组件行数
const MIN_COMPONENT_LINES = 4;

/**
 * 解析文件中的代码定义
 * @param filePath 文件路径
 * @returns 代码定义结果
 */
async function parseFileDefinitions(filePath: string): Promise<string | null> {
	try {
		// 读取文件内容
		const fileContent = await fs.readFile(filePath, 'utf-8');
		const fileExt = path.extname(filePath).toLowerCase();
		const lines = fileContent.split('\n');

		// 特殊处理 Markdown 文件
		if (fileExt === '.md' || fileExt === '.markdown') {
			return parseMarkdownDefinitions(lines);
		}

		// 根据文件类型使用不同的正则表达式
		const definitionPatterns = getDefinitionPatterns(fileExt);
		if (!definitionPatterns) {
			return null;
		}

		// 查找定义
		let result = '';

		for (const pattern of definitionPatterns) {
			let match;
			const regex = new RegExp(pattern.regex, 'gm');

			while ((match = regex.exec(fileContent)) !== null) {
				// 获取匹配行号
				const lineIndex = getLineNumberForPosition(fileContent, match.index);
				if (lineIndex === -1) continue;

				// 计算定义的结束行
				let endLineIndex = lineIndex;
				// 简单估算定义的结束行（查找匹配的闭合括号或分号）
				const startPos = match.index + match[0].length;
				let braceCount = 0;
				let inString = false;
				let stringChar = '';

				for (let i = startPos; i < fileContent.length; i++) {
					const char = fileContent[i];

					// 处理字符串
					if (
						(char === '"' || char === "'" || char === '`') &&
						(i === 0 || fileContent[i - 1] !== '\\')
					) {
						if (!inString) {
							inString = true;
							stringChar = char;
						} else if (char === stringChar) {
							inString = false;
						}
						continue;
					}

					if (inString) continue;

					// 计算括号嵌套
					if (char === '{') {
						braceCount++;
					} else if (char === '}') {
						braceCount--;
						if (braceCount < 0) {
							// 找到匹配的闭合括号
							endLineIndex = getLineNumberForPosition(fileContent, i);
							break;
						}
					} else if (char === ';' && braceCount === 0) {
						// 找到语句结束的分号
						endLineIndex = getLineNumberForPosition(fileContent, i);
						break;
					}
				}

				// 确保定义至少跨越最小行数
				if (endLineIndex - lineIndex + 1 >= MIN_COMPONENT_LINES) {
					// 添加定义到结果
					result += `${lineIndex + 1}--${endLineIndex + 1} | ${lines[lineIndex].trim()}\n`;
				}
			}
		}

		return result || null;
	} catch (error) {
		logger.error(
			`Error parsing file ${filePath}: ${error instanceof Error ? error.message : String(error)}`,
		);
		return null;
	}
}

/**
 * 解析 Markdown 文件中的标题定义
 * @param lines 文件行
 * @returns 标题定义结果
 */
function parseMarkdownDefinitions(lines: string[]): string | null {
	let result = '';
	const headerRegex = /^(#{1,6})\s+(.+)$/;

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		const match = headerRegex.exec(line);

		if (match) {
			const headerLevel = match[1].length;
			// 获取标题文本（用于调试）
			// const headerText = match[2].trim()

			// 查找标题的结束行（下一个相同或更高级别的标题之前）
			let endLineIndex = i;
			for (let j = i + 1; j < lines.length; j++) {
				const nextHeaderMatch = headerRegex.exec(lines[j]);
				if (nextHeaderMatch && nextHeaderMatch[1].length <= headerLevel) {
					break;
				}
				endLineIndex = j;
			}

			// 确保标题部分至少跨越最小行数
			if (endLineIndex - i + 1 >= MIN_COMPONENT_LINES) {
				result += `${i + 1}--${endLineIndex + 1} | ${line.trim()}\n`;
			}
		}
	}

	return result || null;
}

/**
 * 获取文件类型对应的定义模式
 * @param fileExt 文件扩展名
 * @returns 定义模式数组
 */
function getDefinitionPatterns(
	fileExt: string,
): { name: string; regex: string }[] | null {
	switch (fileExt) {
		case '.js':
		case '.jsx':
		case '.ts':
		case '.tsx':
			return [
				{ name: 'class', regex: '(?:export\\s+)?class\\s+([A-Za-z0-9_$]+)' },
				{
					name: 'function',
					regex: '(?:export\\s+)?(?:async\\s+)?function\\s+([A-Za-z0-9_$]+)',
				},
				{
					name: 'arrow function',
					regex:
						'(?:export\\s+)?const\\s+([A-Za-z0-9_$]+)\\s*=\\s*(?:async\\s+)?\\([^)]*\\)\\s*=>',
				},
				{
					name: 'interface',
					regex: '(?:export\\s+)?interface\\s+([A-Za-z0-9_$]+)',
				},
				{ name: 'type', regex: '(?:export\\s+)?type\\s+([A-Za-z0-9_$]+)' },
				{ name: 'enum', regex: '(?:export\\s+)?enum\\s+([A-Za-z0-9_$]+)' },
			];
		case '.py':
			return [
				{ name: 'class', regex: 'class\\s+([A-Za-z0-9_]+)' },
				{ name: 'function', regex: 'def\\s+([A-Za-z0-9_]+)' },
			];
		case '.java':
			return [
				{
					name: 'class',
					regex: '(?:public|private|protected)?\\s+class\\s+([A-Za-z0-9_]+)',
				},
				{
					name: 'interface',
					regex:
						'(?:public|private|protected)?\\s+interface\\s+([A-Za-z0-9_]+)',
				},
				{
					name: 'enum',
					regex: '(?:public|private|protected)?\\s+enum\\s+([A-Za-z0-9_]+)',
				},
				{
					name: 'method',
					regex:
						'(?:public|private|protected|static)?\\s+(?:void|[A-Za-z0-9_<>\\[\\]]+)\\s+([A-Za-z0-9_]+)\\s*\\(',
				},
			];
		// 其他文件类型的定义模式...
		default:
			return null;
	}
}

/**
 * 获取字符位置对应的行号
 * @param content 文件内容
 * @param position 字符位置
 * @returns 行号
 */
function getLineNumberForPosition(content: string, position: number): number {
	const lines = content.substring(0, position).split('\n');
	return lines.length - 1;
}

/**
 * 列出代码定义工具
 * @param params 工具参数
 * @returns 工具执行结果
 */
export const listCodeDefinitionsTool: ToolHandler = async ({
	toolUse,
	cwd,
}) => {
	const { params } = toolUse;
	const relPath = params.path;

	if (!relPath) {
		return 'Error: Missing required parameter "path"';
	}

	try {
		// 解析路径
		const fullPath = path.resolve(cwd, relPath);
		logger.debug(`Listing code definitions for: ${fullPath}`);

		// 检查路径是否存在
		if (!(await fs.pathExists(fullPath))) {
			return `Error: Path not found: ${relPath}`;
		}

		// 获取路径状态
		const stats = await fs.stat(fullPath);

		// 处理单个文件
		if (stats.isFile()) {
			const fileExt = path.extname(fullPath).toLowerCase();

			// 检查文件类型是否支持
			if (!SUPPORTED_EXTENSIONS.includes(fileExt)) {
				return `Unsupported file type: ${fileExt}`;
			}

			// 解析文件定义
			const fileResult = await parseFileDefinitions(fullPath);

			if (fileResult) {
				return {
					text: `# ${path.basename(fullPath)}\n${fileResult}`,
				} as ToolResponse;
			} else {
				return {
					text: `No source code definitions found in file: ${relPath}`,
				} as ToolResponse;
			}
		}
		// 处理目录
		else if (stats.isDirectory()) {
			// 获取目录中的文件
			const files = await new Promise<string[]>((resolve, reject) => {
				glob(
					'**/*.*',
					{
						cwd: fullPath,
						ignore: [
							'**/node_modules/**',
							'**/dist/**',
							'**/build/**',
							'**/.git/**',
							'**/vendor/**',
							'**/bin/**',
						],
						nodir: true,
						absolute: true,
					},
					(err, matches) => {
						if (err) {
							reject(err);
						} else {
							resolve(matches);
						}
					},
				);
			});

			// 过滤支持的文件类型
			const supportedFiles = files
				.filter(file =>
					SUPPORTED_EXTENSIONS.includes(path.extname(file).toLowerCase()),
				)
				.slice(0, 50); // 限制处理的文件数量

			// 解析每个文件的定义
			let result = '';

			for (const file of supportedFiles) {
				const relativePath = path.relative(fullPath, file);
				const fileDefinitions = await parseFileDefinitions(file);

				if (fileDefinitions) {
					result += `# ${relativePath}\n${fileDefinitions}\n`;
				}
			}

			if (result) {
				return {
					text: result,
				} as ToolResponse;
			} else {
				return {
					text: `No source code definitions found in directory: ${relPath}`,
				} as ToolResponse;
			}
		} else {
			return `Error: The specified path is neither a file nor a directory: ${relPath}`;
		}
	} catch (error) {
		logger.error(
			`Error listing code definitions for ${relPath}: ${error instanceof Error ? error.message : String(error)}`,
		);
		return `Error listing code definitions for ${relPath}: ${
			error instanceof Error ? error.message : String(error)
		}`;
	}
};
