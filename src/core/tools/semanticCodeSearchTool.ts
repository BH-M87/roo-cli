import { ToolHandler } from "./types";
import { logger } from "../../utils/logger";
import { DEFAULT_REL_DIR_PATH } from "../../config/constants";
import { indexCodeFiles, searchCodeByQuery, CodeChunk } from "../rag";

/**
 * 语义代码搜索工具
 * @param params 工具参数
 * @returns 工具执行结果
 */
export const semanticCodeSearchTool: ToolHandler = async ({ toolUse, cwd }) => {
  const { params } = toolUse;
  const relDirPath = params.path || DEFAULT_REL_DIR_PATH;
  const query = params.query;
  const filePattern = params.file_pattern;
  const topK = params.top_k ? parseInt(params.top_k, 10) : 5;

  if (!relDirPath) {
    return 'Error: Missing required parameter "path"';
  }

  if (!query) {
    return 'Error: Missing required parameter "query"';
  }

  try {
    logger.debug(`Performing semantic code search in directory: ${relDirPath}`);
    logger.debug(`Query: ${query}`);
    logger.debug(
      `File pattern: ${
        filePattern || "**/*.{js,ts,jsx,tsx,py,java,c,cpp,h,hpp,cs,go,rb,php}"
      }`
    );
    logger.debug(`Top K: ${topK}`);

    // Index code files
    const indexedCount = await indexCodeFiles(cwd, relDirPath, filePattern);

    logger.debug(`Indexed ${indexedCount} code chunks`);

    // If no files were indexed, return early
    if (indexedCount === 0) {
      return `No code files found in ${relDirPath} matching pattern ${
        filePattern || "**/*.{js,ts,jsx,tsx,py,java,c,cpp,h,hpp,cs,go,rb,php}"
      }`;
    }

    // Search for code based on the query
    const results = await searchCodeByQuery(query, cwd, topK);

    // Build result string
    let resultText = `Semantic code search results for "${query}" in ${relDirPath}`;
    if (filePattern) {
      resultText += ` (pattern: ${filePattern})`;
    }
    resultText += `\n\nFound ${results.length} relevant code chunks:\n\n`;

    if (results.length === 0) {
      resultText += "No relevant code found.";
    } else {
      // Format results
      for (let i = 0; i < results.length; i++) {
        const chunk = results[i];

        // Get relative file path for cleaner display
        const displayPath = chunk.filePath;

        // Calculate relevance score (simplified for display)
        const relevanceScore = Math.round((1.0 - i / results.length) * 100);

        // Format the result header with relevance score
        resultText += `${
          i + 1
        }. File: ${displayPath} (${relevanceScore}% relevance)\n`;
        resultText += `   Language: ${chunk.language}\n`;
        resultText += `   Lines: ${chunk.startLine}-${chunk.endLine}\n`;

        // Show symbols with categorization if possible
        if (chunk.symbols.length > 0) {
          // Limit to 10 symbols to avoid overwhelming output
          const displaySymbols =
            chunk.symbols.length > 10
              ? chunk.symbols.slice(0, 10).join(", ") +
                `, ... (${chunk.symbols.length - 10} more)`
              : chunk.symbols.join(", ");

          resultText += `   Symbols: ${displaySymbols}\n`;
        }

        // Extract context information
        const contextInfo = extractContextInfo(chunk.content, query);
        if (contextInfo) {
          resultText += `   Context: ${contextInfo}\n`;
        }

        // Add code snippet (limited to avoid very long outputs)
        const lines = chunk.content.split("\n");

        // Try to find the most relevant section of code
        const relevantLineRange = findRelevantLines(lines, query);
        const startLine = relevantLineRange.start;
        const endLine = relevantLineRange.end;

        // Show the relevant section with context
        const contextBefore = Math.max(0, startLine - 3);
        const contextAfter = Math.min(lines.length, endLine + 3);

        // Format the code snippet
        resultText += `\n\`\`\`${chunk.language}\n`;

        // Add ellipsis if we're not starting from the beginning
        if (contextBefore > 0) {
          resultText += `...(lines 1-${contextBefore} omitted)\n`;
        }

        // Add the relevant code section with line numbers
        for (let j = contextBefore; j < contextAfter; j++) {
          const lineNumber = j + 1;
          const linePrefix =
            lineNumber === startLine || lineNumber === endLine ? "→ " : "  ";
          resultText += `${linePrefix}${lineNumber}: ${lines[j]}\n`;
        }

        // Add ellipsis if we're not ending at the last line
        if (contextAfter < lines.length) {
          resultText += `...(lines ${contextAfter + 1}-${
            lines.length
          } omitted)\n`;
        }

        resultText += `\`\`\`\n\n`;
      }
    }

    // Add a summary of the search
    resultText += `Summary: Found ${results.length} code chunks matching "${query}" in ${relDirPath}.\n`;
    resultText += `The results are ranked by relevance to your query.\n`;

    /**
     * Extract context information from code content
     * @param content Code content
     * @param query Search query
     * @returns Context information
     */
    function extractContextInfo(content: string, query: string): string | null {
      // Extract the first comment block if available
      const commentMatch = content.match(/\/\*\*([\s\S]*?)\*\//);
      if (commentMatch && commentMatch[1]) {
        // Clean up the comment
        const comment = commentMatch[1]
          .replace(/\s*\*\s*/g, " ")
          .trim()
          .substring(0, 100);
        return comment + (comment.length >= 100 ? "..." : "");
      }

      // If no comment, try to extract a meaningful line containing keywords from the query
      const queryWords = query
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => w.length > 3);
      const lines = content.split("\n");

      for (const line of lines) {
        const trimmedLine = line.trim();
        if (
          trimmedLine.length > 10 &&
          !trimmedLine.startsWith("//") &&
          !trimmedLine.startsWith("*")
        ) {
          for (const word of queryWords) {
            if (trimmedLine.toLowerCase().includes(word)) {
              return (
                trimmedLine.substring(0, 100) +
                (trimmedLine.length >= 100 ? "..." : "")
              );
            }
          }
        }
      }

      return null;
    }

    /**
     * Find the most relevant lines in the code based on the query
     * @param lines Code lines
     * @param query Search query
     * @returns Relevant line range
     */
    function findRelevantLines(
      lines: string[],
      query: string
    ): { start: number; end: number } {
      const queryWords = query
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => w.length > 3);
      let bestScore = 0;
      let bestStart = 0;
      let bestEnd = Math.min(15, lines.length - 1);

      // Default to first 15 lines if we can't find anything better
      if (lines.length <= 15) {
        return { start: 0, end: lines.length - 1 };
      }

      // Try to find a section with the most query word matches
      for (let i = 0; i < lines.length - 5; i++) {
        const windowSize = Math.min(15, lines.length - i);
        let score = 0;

        for (let j = i; j < i + windowSize; j++) {
          const line = lines[j].toLowerCase();
          for (const word of queryWords) {
            if (line.includes(word)) {
              score += 1;
            }
          }
        }

        if (score > bestScore) {
          bestScore = score;
          bestStart = i;
          bestEnd = i + windowSize - 1;
        }
      }

      return { start: bestStart, end: bestEnd };
    }

    return resultText;
  } catch (error) {
    logger.error(
      `Error performing semantic code search in ${relDirPath}: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    return `Error performing semantic code search in ${relDirPath}: ${
      error instanceof Error ? error.message : String(error)
    }`;
  }
};
