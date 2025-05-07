import { ToolArgs } from "./types";

/**
 * 获取 write_to_file 工具的描述
 * @param args 工具参数
 * @returns 工具描述
 */
export function getWriteToFileDescription(args: ToolArgs): string {
  return `## write_to_file
Description: Request to write full content to a file at the specified path. If the file exists, it will be overwritten with the provided content. If the file doesn't exist, it will be created. This tool will automatically create any directories needed to write the file.
Parameters:
- path: (required) The path of the file to write to (relative to the current workspace directory ${args.cwd})
- content: (required) The content to write to the file. ALWAYS provide the COMPLETE intended content of the file, without any truncation or omissions. You MUST include ALL parts of the file, even if they haven't been modified. Do NOT include the line numbers in the content though, just the actual content of the file.
Usage:
<write_to_file>
<path>path/to/file.txt</path>
<content>
Content to write to the file.
This can be multiple lines.
</content>
</write_to_file>

Example: Writing to a file
<write_to_file>
<path>src/hello.js</path>
<content>
console.log('Hello, world!');
</content>
</write_to_file>`;
}
