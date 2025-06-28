import { ToolArgs } from './types';

/**
 * 获取文件比较工具的描述
 * @param args 工具参数
 * @returns 工具描述
 */
export function getDiffFilesDescription(args: ToolArgs): string {
	return `## diff_files
Description: Compare two files and show the differences between them. This tool is useful for understanding changes between file versions or comparing similar files.

Parameters:
- file1: (required) Path to the first file (relative to the current working directory ${args.cwd})
- file2: (required) Path to the second file (relative to the current working directory ${args.cwd})
- context_lines: (optional) Number of context lines to show around differences (default: 3)

Usage:
<diff_files>
<file1>path/to/first/file.js</file1>
<file2>path/to/second/file.js</file2>
<context_lines>5</context_lines>
</diff_files>

Example:
<diff_files>
<file1>src/components/Button.js</file1>
<file2>src/components/Button.tsx</file2>
</diff_files>
`;
}
