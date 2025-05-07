import fs from "fs-extra"
import { logger } from "../../utils/logger"
import path from "path"
import { ToolHandler, ToolResponse } from "./types"

/**
 * 在指定位置插入内容
 * @param lines 文件行数组
 * @param insertGroups 插入组
 * @returns 更新后的行数组
 */
function insertGroups(lines: string[], insertGroups: { index: number; elements: string[] }[]): string[] {
	// 按索引排序，从大到小，这样我们可以从后向前插入，不影响前面的索引
	const sortedGroups = [...insertGroups].sort((a, b) => b.index - a.index)

	// 创建一个新的行数组副本
	const result = [...lines]

	// 对每个插入组进行处理
	for (const group of sortedGroups) {
		const { index, elements } = group

		// 如果索引为0，表示在文件开头插入
		if (index <= 0) {
			result.unshift(...elements)
		}
		// 如果索引大于等于行数，表示在文件末尾追加
		else if (index >= lines.length) {
			result.push(...elements)
		}
		// 否则在指定行后插入
		else {
			result.splice(index, 0, ...elements)
		}
	}

	return result
}

/**
 * 插入内容工具
 * @param params 工具参数
 * @returns 工具执行结果
 */
export const insertContentTool: ToolHandler = async ({ toolUse, cwd }) => {
	const { params } = toolUse
	const filePath = params.path
	const line = params.line
	const content = params.content

	// 验证必需参数
	if (!filePath) {
		return 'Error: Missing required parameter "path"'
	}

	if (!line) {
		return 'Error: Missing required parameter "line"'
	}

	if (content === undefined) {
		return 'Error: Missing required parameter "content"'
	}

	try {
		// 解析文件路径
		const fullPath = path.resolve(cwd, filePath)

		// 解析行号
		const lineNumber = parseInt(line, 10)
		if (isNaN(lineNumber) || lineNumber < 0) {
			return "Error: Invalid line number. Must be a non-negative integer."
		}

		logger.debug(`Inserting content into file: ${fullPath}`)
		logger.debug(`Line number: ${lineNumber}`)

		// 检查文件是否存在
		if (!(await fs.pathExists(fullPath))) {
			return `Error: File not found: ${filePath}`
		}

		// 读取文件内容
		const fileContent = await fs.readFile(fullPath, "utf-8")
		const lines = fileContent.split("\n")

		// 使用insertGroups函数插入内容
		const updatedLines = insertGroups(lines, [
			{
				index: lineNumber === 0 ? lines.length : lineNumber - 1,
				elements: content.split("\n"),
			},
		])

		const updatedContent = updatedLines.join("\n")

		// 写入文件
		await fs.writeFile(fullPath, updatedContent, "utf-8")

		return {
			text: `Successfully inserted content into file: ${filePath} at line ${lineNumber === 0 ? "end" : lineNumber}`,
		} as ToolResponse
	} catch (error) {
		logger.error(
			`Error inserting content into file ${filePath}: ${error instanceof Error ? error.message : String(error)}`,
		)
		return `Error inserting content into file ${filePath}: ${
			error instanceof Error ? error.message : String(error)
		}`
	}
}
