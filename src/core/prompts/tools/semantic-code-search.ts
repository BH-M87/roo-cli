import { ToolArgs } from './types';

/**
 * 获取 semantic_code_search 工具的描述
 * @param args 工具参数
 * @returns 工具描述
 */
export function getSemanticCodeSearchDescription(args: ToolArgs): string {
	return `## semantic_code_search
Description: Perform a semantic search for code based on a natural language query. This tool uses code embeddings to find code that is semantically similar to the query, rather than just matching text patterns. It's useful for finding code that implements a specific functionality or follows a particular pattern, even if the exact keywords are not known.
Parameters:
- path: (required) The path of the directory to search in (relative to the current workspace directory ${args.cwd}). This directory will be recursively searched.
- query: (required) The natural language query describing the code you're looking for. Be specific about the functionality or pattern you want to find.
- file_pattern: (optional) Glob pattern to filter files (e.g., '*.ts' for TypeScript files). If not provided, it will search common code file types.
- top_k: (optional) Number of results to return. Default is 5.
Usage:
<semantic_code_search>
<path>Directory path here</path>
<query>Your natural language query here</query>
<file_pattern>file pattern here (optional)</file_pattern>
<top_k>number of results (optional)</top_k>
</semantic_code_search>

Example: Searching for code that handles file operations
<semantic_code_search>
<path>src</path>
<query>code that reads and writes files</query>
<file_pattern>**/*.ts</file_pattern>
<top_k>3</top_k>
</semantic_code_search>
`;
}
