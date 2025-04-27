/**
 * Code RAG (Retrieval-Augmented Generation) module
 *
 * This module provides functionality for code embedding, indexing, and retrieval
 * to enhance the AI's understanding of code.
 */

import fs from "fs-extra";
import path from "path";
import glob from "glob";
import { DEFAULT_REL_DIR_PATH } from "../../config/constants";

/**
 * Code chunk interface representing a segment of code with context
 */
export interface CodeChunk {
  filePath: string;
  content: string;
  startLine: number;
  endLine: number;
  language: string;
  symbols: string[];
}

/**
 * Code embedding interface representing a vector embedding of a code chunk
 */
export interface CodeEmbedding {
  chunk: CodeChunk;
  embedding: number[];
}

/**
 * In-memory store for code embeddings
 */
class CodeEmbeddingStore {
  private embeddings: CodeEmbedding[] = [];

  /**
   * Add a code embedding to the store
   * @param embedding Code embedding to add
   */
  addEmbedding(embedding: CodeEmbedding): void {
    this.embeddings.push(embedding);
  }

  /**
   * Get all code embeddings
   * @returns All code embeddings
   */
  getAllEmbeddings(): CodeEmbedding[] {
    return this.embeddings;
  }

  /**
   * Clear all embeddings
   */
  clearEmbeddings(): void {
    this.embeddings = [];
  }

  /**
   * Find similar code chunks based on a query embedding and query text
   * @param queryEmbedding Query embedding
   * @param queryText Original query text (for keyword matching)
   * @param topK Number of results to return
   * @returns Similar code chunks
   */
  findSimilar(
    queryEmbedding: number[],
    queryText: string = "",
    topK: number = 5
  ): CodeChunk[] {
    // Calculate enhanced similarity scores between query and all embeddings
    const similarities = this.embeddings.map((embedding) => {
      // Base similarity using cosine similarity of embeddings
      const embeddingSimilarity = this.cosineSimilarity(
        queryEmbedding,
        embedding.embedding
      );

      // Calculate additional similarity factors
      const keywordSimilarity = queryText
        ? this.calculateKeywordSimilarity(queryText, embedding.chunk)
        : 0;
      const symbolSimilarity = queryText
        ? this.calculateSymbolSimilarity(queryText, embedding.chunk)
        : 0;
      const structureSimilarity = this.calculateStructureSimilarity(
        queryEmbedding,
        embedding.embedding
      );

      // Combine similarities with different weights
      const combinedSimilarity =
        embeddingSimilarity * 0.6 +
        keywordSimilarity * 0.2 +
        symbolSimilarity * 0.15 +
        structureSimilarity * 0.05;

      return {
        chunk: embedding.chunk,
        similarity: combinedSimilarity,
        details: {
          embeddingSimilarity,
          keywordSimilarity,
          symbolSimilarity,
          structureSimilarity,
        },
      };
    });

    // Sort by combined similarity (descending)
    similarities.sort((a, b) => b.similarity - a.similarity);

    // Return top K results
    return similarities.slice(0, topK).map((result) => result.chunk);
  }

  /**
   * Calculate cosine similarity between two vectors
   * @param a First vector
   * @param b Second vector
   * @returns Cosine similarity
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error("Vectors must have the same length");
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Calculate keyword similarity between query and code chunk
   * @param query Query text
   * @param chunk Code chunk
   * @returns Keyword similarity score
   */
  private calculateKeywordSimilarity(query: string, chunk: CodeChunk): number {
    // Extract keywords from query
    const queryWords = query
      .toLowerCase()
      .split(/\s+/)
      .filter((word) => word.length > 2);

    // Check how many query words appear in the code
    let matchCount = 0;
    const content = chunk.content.toLowerCase();

    for (const word of queryWords) {
      // Use word boundary to match whole words
      const regex = new RegExp(`\\b${word}\\b`, "i");
      if (regex.test(content)) {
        matchCount++;
      }
    }

    // Calculate similarity as the ratio of matched words
    return queryWords.length > 0 ? matchCount / queryWords.length : 0;
  }

  /**
   * Calculate symbol similarity between query and code chunk
   * @param query Query text
   * @param chunk Code chunk
   * @returns Symbol similarity score
   */
  private calculateSymbolSimilarity(query: string, chunk: CodeChunk): number {
    // Extract potential symbol names from query (camelCase, snake_case, PascalCase)
    const symbolPattern = /[a-zA-Z][a-zA-Z0-9]*(?:[_$][a-zA-Z0-9]+)*/g;
    const querySymbols = [];
    let match;

    while ((match = symbolPattern.exec(query)) !== null) {
      if (match[0].length > 2) {
        // Only consider symbols with length > 2
        querySymbols.push(match[0].toLowerCase());
      }
    }

    // Check how many query symbols appear in the code symbols
    let matchCount = 0;
    const lowerCaseSymbols = chunk.symbols.map((s) => s.toLowerCase());

    for (const symbol of querySymbols) {
      if (
        lowerCaseSymbols.some((s) => s.includes(symbol) || symbol.includes(s))
      ) {
        matchCount++;
      }
    }

    // Calculate similarity as the ratio of matched symbols
    return querySymbols.length > 0 ? matchCount / querySymbols.length : 0;
  }

  /**
   * Calculate structure similarity between query embedding and code embedding
   * @param queryEmbedding Query embedding
   * @param codeEmbedding Code embedding
   * @returns Structure similarity score
   */
  private calculateStructureSimilarity(
    queryEmbedding: number[],
    codeEmbedding: number[]
  ): number {
    // Focus on the part of the embedding that represents code structures (indices 64-95)
    const queryStructure = queryEmbedding.slice(64, 96);
    const codeStructure = codeEmbedding.slice(64, 96);

    // Calculate cosine similarity between these structure vectors
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < queryStructure.length; i++) {
      dotProduct += queryStructure[i] * codeStructure[i];
      normA += queryStructure[i] * queryStructure[i];
      normB += codeStructure[i] * codeStructure[i];
    }

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }
}

// Singleton instance of the code embedding store
export const codeEmbeddingStore = new CodeEmbeddingStore();

/**
 * Extract code chunks from a file
 * @param filePath Path to the file
 * @param fullPath Full path to the file
 * @returns Array of code chunks
 */
export async function extractCodeChunks(
  filePath: string,
  fullPath: string
): Promise<CodeChunk[]> {
  try {
    // Read file content
    const content = await fs.readFile(fullPath, "utf-8");
    const lines = content.split("\n");

    // Determine language from file extension
    const ext = path.extname(filePath).toLowerCase();
    const language = getLanguageFromExtension(ext);

    // Extract symbols from the file
    const symbols = extractSymbols(content, language);

    // Split the file into logical chunks based on code structure
    const chunks: CodeChunk[] = [];

    // First, add a chunk for the entire file (for global context)
    chunks.push({
      filePath,
      content,
      startLine: 1,
      endLine: lines.length,
      language,
      symbols,
    });

    // Then, split the file into logical chunks based on code structure
    const codeBlocks = splitIntoCodeBlocks(content, language, lines);

    // Add each code block as a separate chunk
    for (const block of codeBlocks) {
      // Extract symbols specific to this block
      const blockSymbols = extractSymbols(block.content, language);

      chunks.push({
        filePath,
        content: block.content,
        startLine: block.startLine,
        endLine: block.endLine,
        language,
        symbols: blockSymbols,
      });
    }

    return chunks;
  } catch (error) {
    console.error(`Error extracting code chunks from ${filePath}:`, error);
    return [];
  }
}

/**
 * Split code into logical blocks (functions, classes, methods, etc.)
 * @param content Code content
 * @param language Programming language
 * @param lines Array of code lines
 * @returns Array of code blocks
 */
interface CodeBlock {
  content: string;
  startLine: number;
  endLine: number;
}

function splitIntoCodeBlocks(
  content: string,
  language: string,
  lines: string[]
): CodeBlock[] {
  const blocks: CodeBlock[] = [];

  // Different languages have different ways to define code blocks
  switch (language) {
    case "javascript":
    case "typescript":
      // Split by function/class/interface definitions
      blocks.push(...findJsBlocks(content, lines));
      break;
    case "python":
      // Split by function/class definitions
      blocks.push(...findPythonBlocks(content, lines));
      break;
    case "java":
    case "c":
    case "cpp":
    case "csharp":
      // Split by function/method/class definitions
      blocks.push(...findCStyleBlocks(content, lines));
      break;
    default:
      // For other languages, use a generic approach
      blocks.push(...findGenericBlocks(content, lines));
  }

  // If no blocks were found, create chunks based on line count
  if (blocks.length === 0) {
    const chunkSize = 50; // 50 lines per chunk
    for (let i = 0; i < lines.length; i += chunkSize) {
      const endLine = Math.min(i + chunkSize, lines.length);
      blocks.push({
        content: lines.slice(i, endLine).join("\n"),
        startLine: i + 1,
        endLine: endLine,
      });
    }
  }

  return blocks;
}

/**
 * Find code blocks in JavaScript/TypeScript code
 * @param content Code content
 * @param lines Array of code lines
 * @returns Array of code blocks
 */
function findJsBlocks(content: string, lines: string[]): CodeBlock[] {
  const blocks: CodeBlock[] = [];

  // Regular expressions for different block types
  const blockPatterns = [
    // Function declarations
    /function\s+([A-Za-z0-9_$]+)\s*\([^)]*\)\s*\{/g,
    // Arrow functions assigned to variables
    /(?:const|let|var)\s+([A-Za-z0-9_$]+)\s*=\s*(?:\([^)]*\)|[A-Za-z0-9_$]+)\s*=>\s*\{/g,
    // Class declarations
    /class\s+([A-Za-z0-9_$]+)(?:\s+extends\s+[A-Za-z0-9_$.]+)?\s*\{/g,
    // Interface declarations (TypeScript)
    /interface\s+([A-Za-z0-9_$]+)(?:\s+extends\s+[A-Za-z0-9_$.]+)?\s*\{/g,
    // Method definitions
    /(?:async\s+)?([A-Za-z0-9_$]+)\s*\([^)]*\)\s*\{/g,
  ];

  for (const pattern of blockPatterns) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const startPos = match.index;
      // const blockName = match[1] || "anonymous"; // Uncomment if needed for debugging

      // Find the line number for the start position
      let lineCount = 0;
      let pos = 0;
      while (pos <= startPos && lineCount < lines.length) {
        pos += lines[lineCount].length + 1; // +1 for the newline character
        lineCount++;
      }

      const startLine = lineCount;

      // Find the matching closing brace
      let braceCount = 1;
      let endPos = startPos + match[0].length;

      while (braceCount > 0 && endPos < content.length) {
        if (content[endPos] === "{") {
          braceCount++;
        } else if (content[endPos] === "}") {
          braceCount--;
        }
        endPos++;
      }

      // Find the line number for the end position
      lineCount = 0;
      pos = 0;
      while (pos <= endPos && lineCount < lines.length) {
        pos += lines[lineCount].length + 1;
        lineCount++;
      }

      const endLine = lineCount;

      // Extract the block content
      const blockContent = content.substring(startPos, endPos);

      blocks.push({
        content: blockContent,
        startLine,
        endLine,
      });
    }
  }

  return blocks;
}

/**
 * Find code blocks in Python code
 * @param content Code content
 * @param lines Array of code lines
 * @returns Array of code blocks
 */
function findPythonBlocks(content: string, lines: string[]): CodeBlock[] {
  const blocks: CodeBlock[] = [];

  // In Python, indentation defines blocks
  // Look for function and class definitions
  const defPattern = /^([ \t]*)(?:def|class)\s+([A-Za-z0-9_]+).*:/gm;

  let match;
  while ((match = defPattern.exec(content)) !== null) {
    const indentation = match[1];
    const startPos = match.index;

    // Find the line number for the start position
    let lineCount = 0;
    let pos = 0;
    while (pos <= startPos && lineCount < lines.length) {
      pos += lines[lineCount].length + 1;
      lineCount++;
    }

    const startLine = lineCount;

    // Find the end of the block (next line with same or less indentation)
    let endLine = startLine;
    for (let i = startLine; i < lines.length; i++) {
      // Skip empty lines
      if (lines[i].trim() === "") {
        endLine = i + 1;
        continue;
      }

      // If we find a line with same or less indentation, we've reached the end of the block
      if (!lines[i].startsWith(indentation) || lines[i].trim() === "") {
        endLine = i;
        break;
      }

      endLine = i + 1;
    }

    // Extract the block content
    const blockContent = lines.slice(startLine - 1, endLine).join("\n");

    blocks.push({
      content: blockContent,
      startLine,
      endLine,
    });
  }

  return blocks;
}

/**
 * Find code blocks in C-style languages (C, C++, Java, C#)
 * @param content Code content
 * @param lines Array of code lines
 * @returns Array of code blocks
 */
function findCStyleBlocks(content: string, lines: string[]): CodeBlock[] {
  const blocks: CodeBlock[] = [];

  // Regular expressions for different block types
  const blockPatterns = [
    // Class declarations
    /(?:public|private|protected|internal|static)?\s*class\s+([A-Za-z0-9_]+)(?:\s+(?:extends|implements)\s+[A-Za-z0-9_<>,\s.]+)?\s*\{/g,
    // Method declarations
    /(?:public|private|protected|internal|static|final|abstract|override)?\s*(?:void|[A-Za-z0-9_<>[\],\s.]+)\s+([A-Za-z0-9_]+)\s*\([^)]*\)\s*(?:throws\s+[A-Za-z0-9_<>,\s.]+)?\s*\{/g,
    // Function declarations (C/C++)
    /(?:static|inline|extern)?\s*(?:void|[A-Za-z0-9_<>[\],\s.]+)\s+([A-Za-z0-9_]+)\s*\([^)]*\)\s*\{/g,
  ];

  for (const pattern of blockPatterns) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const startPos = match.index;

      // Find the line number for the start position
      let lineCount = 0;
      let pos = 0;
      while (pos <= startPos && lineCount < lines.length) {
        pos += lines[lineCount].length + 1;
        lineCount++;
      }

      const startLine = lineCount;

      // Find the matching closing brace
      let braceCount = 1;
      let endPos = startPos + match[0].length;

      while (braceCount > 0 && endPos < content.length) {
        if (content[endPos] === "{") {
          braceCount++;
        } else if (content[endPos] === "}") {
          braceCount--;
        }
        endPos++;
      }

      // Find the line number for the end position
      lineCount = 0;
      pos = 0;
      while (pos <= endPos && lineCount < lines.length) {
        pos += lines[lineCount].length + 1;
        lineCount++;
      }

      const endLine = lineCount;

      // Extract the block content
      const blockContent = content.substring(startPos, endPos);

      blocks.push({
        content: blockContent,
        startLine,
        endLine,
      });
    }
  }

  return blocks;
}

/**
 * Find code blocks using a generic approach
 * @param content Code content
 * @param lines Array of code lines
 * @returns Array of code blocks
 */
function findGenericBlocks(content: string, lines: string[]): CodeBlock[] {
  const blocks: CodeBlock[] = [];

  // Look for opening braces and find matching closing braces
  const bracePattern = /[A-Za-z0-9_]+\s*\([^)]*\)\s*\{/g;

  let match;
  while ((match = bracePattern.exec(content)) !== null) {
    const startPos = match.index;

    // Find the line number for the start position
    let lineCount = 0;
    let pos = 0;
    while (pos <= startPos && lineCount < lines.length) {
      pos += lines[lineCount].length + 1;
      lineCount++;
    }

    const startLine = lineCount;

    // Find the matching closing brace
    let braceCount = 1;
    let endPos = startPos + match[0].length;

    while (braceCount > 0 && endPos < content.length) {
      if (content[endPos] === "{") {
        braceCount++;
      } else if (content[endPos] === "}") {
        braceCount--;
      }
      endPos++;
    }

    // Find the line number for the end position
    lineCount = 0;
    pos = 0;
    while (pos <= endPos && lineCount < lines.length) {
      pos += lines[lineCount].length + 1;
      lineCount++;
    }

    const endLine = lineCount;

    // Extract the block content
    const blockContent = content.substring(startPos, endPos);

    blocks.push({
      content: blockContent,
      startLine,
      endLine,
    });
  }

  return blocks;
}

/**
 * Get language from file extension
 * @param extension File extension
 * @returns Language name
 */
function getLanguageFromExtension(extension: string): string {
  const languageMap: Record<string, string> = {
    ".js": "javascript",
    ".ts": "typescript",
    ".jsx": "javascript",
    ".tsx": "typescript",
    ".py": "python",
    ".java": "java",
    ".c": "c",
    ".cpp": "cpp",
    ".h": "c",
    ".hpp": "cpp",
    ".cs": "csharp",
    ".go": "go",
    ".rb": "ruby",
    ".php": "php",
    ".html": "html",
    ".css": "css",
    ".json": "json",
    ".md": "markdown",
  };

  return languageMap[extension] || "text";
}

/**
 * Extract symbols from code content
 * @param content Code content
 * @param language Programming language
 * @returns Array of symbols
 */
function extractSymbols(content: string, language: string): string[] {
  // Define regex patterns for different languages
  const patterns: Record<string, RegExp> = {
    javascript:
      /(?:export\s+)?(?:class|function|const|let|var)\s+([A-Za-z0-9_$]+)/g,
    typescript:
      /(?:export\s+)?(?:class|function|const|let|var|interface|enum|type)\s+([A-Za-z0-9_$]+)/g,
    python: /(?:class|def)\s+([A-Za-z0-9_]+)/g,
    java: /(?:class|interface|enum)\s+([A-Za-z0-9_]+)|(?:public|private|protected|static)?\s+(?:void|[A-Za-z0-9_]+)\s+([A-Za-z0-9_]+)\s*\(/g,
    c: /(?:struct|enum)\s+([A-Za-z0-9_]+)|(?:void|[A-Za-z0-9_]+)\s+([A-Za-z0-9_]+)\s*\(/g,
    cpp: /(?:class|struct|enum)\s+([A-Za-z0-9_]+)|(?:void|[A-Za-z0-9_]+)\s+([A-Za-z0-9_]+)\s*\(/g,
    csharp:
      /(?:class|interface|enum|struct)\s+([A-Za-z0-9_]+)|(?:public|private|protected|internal|static)?\s+(?:void|[A-Za-z0-9_<>]+)\s+([A-Za-z0-9_]+)\s*\(/g,
    go: /(?:func|type)\s+([A-Za-z0-9_]+)/g,
    ruby: /(?:class|module|def)\s+([A-Za-z0-9_]+)/g,
    php: /(?:class|interface|function)\s+([A-Za-z0-9_]+)/g,
  };

  const pattern = patterns[language] || /\b([A-Za-z0-9_]+)\b/g;
  const symbols: string[] = [];
  let match;

  while ((match = pattern.exec(content)) !== null) {
    const symbol = match[1] || match[2];
    if (symbol && !symbols.includes(symbol)) {
      symbols.push(symbol);
    }
  }

  return symbols;
}

/**
 * Generate a more sophisticated embedding for a code chunk
 * This is an improved version that better captures code semantics
 * @param chunk Code chunk
 * @returns Embedding vector
 */
export function generateEmbedding(chunk: CodeChunk): number[] {
  // In a real implementation, this would call an embedding model API
  // For now, we'll use a more sophisticated approach to generate a pseudo-embedding

  // Extract important features from the code
  const features = extractCodeFeatures(chunk);

  // Generate a 256-dimensional vector based on the features
  const embedding = new Array(256).fill(0);

  // Add symbol information to the embedding
  for (const symbol of chunk.symbols) {
    // Hash the symbol name to get a position in the embedding
    const symbolHash = simpleHash(symbol) % 64;
    // Add a weight to that position
    embedding[symbolHash] += 1.0;
  }

  // Add language information to the embedding
  const languageHash = simpleHash(chunk.language) % 16;
  embedding[200 + languageHash] += 2.0;

  // Add code structure information to the embedding
  for (const feature of features.codeStructures) {
    const featureHash = simpleHash(feature) % 32;
    embedding[64 + featureHash] += 0.8;
  }

  // Add keywords information to the embedding
  for (const keyword of features.keywords) {
    const keywordHash = simpleHash(keyword) % 32;
    embedding[96 + keywordHash] += 0.6;
  }

  // Add imports/dependencies information to the embedding
  for (const importItem of features.imports) {
    const importHash = simpleHash(importItem) % 32;
    embedding[128 + importHash] += 0.7;
  }

  // Add comments information to the embedding
  for (const comment of features.comments) {
    const commentHash = simpleHash(comment) % 32;
    embedding[160 + commentHash] += 0.4;
  }

  // Add content hash to the embedding
  const contentHash = simpleHash(chunk.content);
  for (let i = 0; i < 8; i++) {
    const hashPart = (contentHash >> (i * 4)) & 0xf;
    embedding[216 + i] += hashPart / 15.0;
  }

  // Add file path information to the embedding
  const pathHash = simpleHash(chunk.filePath) % 32;
  embedding[224 + pathHash] += 0.5;

  // Normalize the vector
  const norm = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
  if (norm > 0) {
    for (let i = 0; i < embedding.length; i++) {
      embedding[i] /= norm;
    }
  }

  return embedding;
}

/**
 * Simple hash function for strings
 * @param str String to hash
 * @returns Hash value
 */
function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

/**
 * Code features extracted from a code chunk
 */
interface CodeFeatures {
  keywords: string[];
  codeStructures: string[];
  imports: string[];
  comments: string[];
}

/**
 * Extract features from a code chunk
 * @param chunk Code chunk
 * @returns Extracted features
 */
function extractCodeFeatures(chunk: CodeChunk): CodeFeatures {
  const features: CodeFeatures = {
    keywords: [],
    codeStructures: [],
    imports: [],
    comments: [],
  };

  const content = chunk.content;
  const language = chunk.language;

  // Extract keywords based on language
  features.keywords = extractKeywords(content, language);

  // Extract code structures (loops, conditionals, etc.)
  features.codeStructures = extractCodeStructures(content, language);

  // Extract imports/dependencies
  features.imports = extractImports(content, language);

  // Extract comments
  features.comments = extractComments(content, language);

  return features;
}

/**
 * Extract keywords from code content
 * @param content Code content
 * @param language Programming language
 * @returns Array of keywords
 */
function extractKeywords(content: string, language: string): string[] {
  const keywords: string[] = [];

  // Define language-specific keywords
  const languageKeywords: Record<string, string[]> = {
    javascript: [
      "function",
      "const",
      "let",
      "var",
      "return",
      "if",
      "else",
      "for",
      "while",
      "switch",
      "case",
      "break",
      "continue",
      "new",
      "this",
      "class",
      "extends",
      "import",
      "export",
      "async",
      "await",
      "try",
      "catch",
    ],
    typescript: [
      "function",
      "const",
      "let",
      "var",
      "return",
      "if",
      "else",
      "for",
      "while",
      "switch",
      "case",
      "break",
      "continue",
      "new",
      "this",
      "class",
      "extends",
      "import",
      "export",
      "async",
      "await",
      "try",
      "catch",
      "interface",
      "type",
      "enum",
      "namespace",
      "implements",
      "private",
      "protected",
      "public",
      "static",
    ],
    python: [
      "def",
      "class",
      "if",
      "elif",
      "else",
      "for",
      "while",
      "try",
      "except",
      "finally",
      "with",
      "import",
      "from",
      "as",
      "return",
      "yield",
      "lambda",
      "global",
      "nonlocal",
      "pass",
      "break",
      "continue",
    ],
    java: [
      "class",
      "interface",
      "enum",
      "extends",
      "implements",
      "public",
      "private",
      "protected",
      "static",
      "final",
      "abstract",
      "synchronized",
      "volatile",
      "transient",
      "native",
      "if",
      "else",
      "for",
      "while",
      "do",
      "switch",
      "case",
      "break",
      "continue",
      "return",
      "new",
      "this",
      "super",
      "try",
      "catch",
      "finally",
      "throw",
      "throws",
    ],
    c: [
      "if",
      "else",
      "for",
      "while",
      "do",
      "switch",
      "case",
      "break",
      "continue",
      "return",
      "goto",
      "typedef",
      "struct",
      "enum",
      "union",
      "const",
      "static",
      "extern",
      "volatile",
      "register",
      "auto",
      "void",
      "int",
      "char",
      "float",
      "double",
      "signed",
      "unsigned",
      "short",
      "long",
    ],
    cpp: [
      "if",
      "else",
      "for",
      "while",
      "do",
      "switch",
      "case",
      "break",
      "continue",
      "return",
      "goto",
      "typedef",
      "struct",
      "enum",
      "union",
      "class",
      "namespace",
      "template",
      "try",
      "catch",
      "throw",
      "const",
      "static",
      "extern",
      "volatile",
      "register",
      "auto",
      "void",
      "int",
      "char",
      "float",
      "double",
      "bool",
      "signed",
      "unsigned",
      "short",
      "long",
      "public",
      "private",
      "protected",
      "virtual",
      "friend",
      "inline",
      "explicit",
      "new",
      "delete",
      "this",
      "operator",
    ],
    csharp: [
      "class",
      "interface",
      "enum",
      "struct",
      "delegate",
      "event",
      "namespace",
      "using",
      "if",
      "else",
      "switch",
      "case",
      "for",
      "foreach",
      "while",
      "do",
      "break",
      "continue",
      "return",
      "try",
      "catch",
      "finally",
      "throw",
      "new",
      "this",
      "base",
      "public",
      "private",
      "protected",
      "internal",
      "static",
      "readonly",
      "const",
      "virtual",
      "abstract",
      "override",
      "sealed",
      "partial",
      "async",
      "await",
      "var",
      "dynamic",
      "void",
      "int",
      "string",
      "bool",
      "object",
    ],
  };

  // Get keywords for the current language or use a default set
  const keywordList = languageKeywords[language] || [];

  // Check for each keyword in the content
  for (const keyword of keywordList) {
    const regex = new RegExp(`\\b${keyword}\\b`, "g");
    if (regex.test(content)) {
      keywords.push(keyword);
    }
  }

  return keywords;
}

/**
 * Extract code structures from code content
 * @param content Code content
 * @param language Programming language
 * @returns Array of code structures
 */
function extractCodeStructures(content: string, language: string): string[] {
  const structures: string[] = [];

  // Define patterns for different code structures
  const patterns: Record<string, Record<string, RegExp>> = {
    common: {
      function: /\bfunction\b|\bdef\b|\bmethod\b/i,
      class: /\bclass\b/i,
      if_statement: /\bif\b/i,
      loop: /\bfor\b|\bwhile\b|\bforeach\b/i,
      try_catch: /\btry\b|\bcatch\b|\bexcept\b/i,
      switch: /\bswitch\b|\bcase\b/i,
    },
    javascript: {
      arrow_function: /=>/,
      async_function: /\basync\b/i,
      promise: /\bPromise\b/,
      callback: /function\s*\([^)]*\)\s*{/,
      object_literal: /{\s*[a-zA-Z0-9_$]+\s*:/,
      destructuring: /(?:const|let|var)\s*{\s*[a-zA-Z0-9_$,\s]+\s*}\s*=/,
    },
    typescript: {
      interface: /\binterface\b/i,
      type: /\btype\b\s+[a-zA-Z0-9_$]+\s*=/,
      generic: /<[a-zA-Z0-9_$]+>/,
      decorator: /@[a-zA-Z0-9_$]+/,
    },
    python: {
      list_comprehension: /\[[^[\]]*for[^[\]]*in[^[\]]*\]/,
      decorator: /@[a-zA-Z0-9_]+/,
      with_statement: /\bwith\b/i,
      lambda: /\blambda\b/i,
    },
  };

  // Check common patterns
  for (const [name, pattern] of Object.entries(patterns.common)) {
    if (pattern.test(content)) {
      structures.push(name);
    }
  }

  // Check language-specific patterns
  if (patterns[language]) {
    for (const [name, pattern] of Object.entries(patterns[language])) {
      if (pattern.test(content)) {
        structures.push(name);
      }
    }
  }

  return structures;
}

/**
 * Extract imports/dependencies from code content
 * @param content Code content
 * @param language Programming language
 * @returns Array of imports
 */
function extractImports(content: string, language: string): string[] {
  const imports: string[] = [];

  // Define patterns for different languages
  let importPattern: RegExp | null = null;

  switch (language) {
    case "javascript":
    case "typescript":
      importPattern =
        /import\s+(?:{[^}]*}|[a-zA-Z0-9_$]+)\s+from\s+['"]([^'"]+)['"]/g;
      break;
    case "python":
      importPattern = /(?:import|from)\s+([a-zA-Z0-9_.]+)/g;
      break;
    case "java":
      importPattern = /import\s+([a-zA-Z0-9_.]+);/g;
      break;
    case "c":
    case "cpp":
      importPattern = /#include\s+[<"]([^>"]+)[>"]/g;
      break;
    case "csharp":
      importPattern = /using\s+([a-zA-Z0-9_.]+);/g;
      break;
    default:
      return imports;
  }

  // Extract imports
  let match;
  while ((match = importPattern.exec(content)) !== null) {
    imports.push(match[1]);
  }

  return imports;
}

/**
 * Extract comments from code content
 * @param content Code content
 * @param language Programming language (not used currently but kept for API consistency)
 * @returns Array of comments
 */
function extractComments(content: string, language: string): string[] {
  const comments: string[] = [];

  // Define patterns for different comment types
  const lineCommentPattern = /\/\/(.*)$|#(.*)$/gm;
  const blockCommentPattern = /\/\*([\s\S]*?)\*\//g;

  // Extract line comments
  let match;
  while ((match = lineCommentPattern.exec(content)) !== null) {
    const comment = (match[1] || match[2]).trim();
    if (comment) {
      comments.push(comment);
    }
  }

  // Extract block comments
  while ((match = blockCommentPattern.exec(content)) !== null) {
    const comment = match[1].trim();
    if (comment) {
      comments.push(comment);
    }
  }

  return comments;
}

/**
 * Index code files in a directory
 * @param cwd Current working directory
 * @param relDirPath Relative directory path
 * @param filePattern File pattern to match
 * @returns Number of indexed files
 */
export async function indexCodeFiles(
  cwd: string,
  relDirPath: string = DEFAULT_REL_DIR_PATH,
  filePattern: string = "**/*.{js,ts,jsx,tsx,py,java,c,cpp,h,hpp,cs,go,rb,php}"
): Promise<number> {
  try {
    // Resolve full path
    const fullPath = path.resolve(cwd, relDirPath);

    // Check if directory exists
    if (!(await fs.pathExists(fullPath))) {
      throw new Error(`Directory not found: ${relDirPath}`);
    }

    // Check if it's a directory
    const stats = await fs.stat(fullPath);
    if (!stats.isDirectory()) {
      throw new Error(`Not a directory: ${relDirPath}`);
    }

    // Get file list
    const options = {
      cwd: fullPath,
      ignore: ["**/node_modules/**", "**/dist/**", "**/build/**", "**/.git/**"],
    };

    const files = await new Promise<string[]>((resolve, reject) => {
      glob(filePattern, options, (err, matches) => {
        if (err) {
          reject(err);
        } else {
          resolve(matches);
        }
      });
    });

    // Clear existing embeddings
    codeEmbeddingStore.clearEmbeddings();

    // Process each file
    let indexedCount = 0;

    for (const file of files) {
      const filePath = path.join(relDirPath, file);
      const fullFilePath = path.join(fullPath, file);

      // Extract code chunks
      const chunks = await extractCodeChunks(filePath, fullFilePath);

      // Generate embeddings and add to store
      for (const chunk of chunks) {
        const embedding = generateEmbedding(chunk);
        codeEmbeddingStore.addEmbedding({ chunk, embedding });
      }

      indexedCount += chunks.length;
    }

    return indexedCount;
  } catch (error) {
    console.error(`Error indexing code files in ${relDirPath}:`, error);
    throw error;
  }
}

/**
 * Search for code based on a natural language query
 * @param query Natural language query
 * @param cwd Current working directory (not used directly but kept for API consistency)
 * @param topK Number of results to return
 * @returns Array of relevant code chunks
 */
export async function searchCodeByQuery(
  query: string,
  cwd: string,
  topK: number = 5
): Promise<CodeChunk[]> {
  try {
    // Generate a query embedding
    const queryChunk: CodeChunk = {
      filePath: "",
      content: query,
      startLine: 0,
      endLine: 0,
      language: "text",
      symbols: [],
    };

    const queryEmbedding = generateEmbedding(queryChunk);

    // Find similar code chunks, passing both the embedding and the original query text
    return codeEmbeddingStore.findSimilar(queryEmbedding, query, topK);
  } catch (error) {
    console.error(`Error searching code by query: ${query}`, error);
    return [];
  }
}
