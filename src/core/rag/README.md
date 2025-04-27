# Code RAG (Retrieval-Augmented Generation) Module

This module provides advanced code understanding capabilities through semantic search and retrieval of code snippets based on natural language queries.

## Features

- **Semantic Code Search**: Find code based on natural language descriptions rather than just keywords or regex patterns
- **Code Embedding**: Generate vector representations of code chunks for similarity matching
- **Symbol Extraction**: Automatically extract and index code symbols (functions, classes, variables, etc.)
- **Multi-language Support**: Works with JavaScript, TypeScript, Python, Java, C/C++, C#, Go, Ruby, and PHP

## Usage

### Semantic Code Search Tool

The semantic code search tool allows you to find code based on natural language queries:

```
<semantic_code_search>
<path>src</path>
<query>code that handles file operations</query>
<file_pattern>**/*.ts</file_pattern>
<top_k>5</top_k>
</semantic_code_search>
```

Parameters:

- `path`: (required) The directory to search in
- `query`: (required) Natural language description of the code you're looking for
- `file_pattern`: (optional) Glob pattern to filter files
- `top_k`: (optional) Number of results to return (default: 5)

### Programmatic Usage

You can also use the RAG module programmatically in your code:

```typescript
import { indexCodeFiles, searchCodeByQuery } from "../rag";

// Index code files in a directory
const indexedCount = await indexCodeFiles(cwd, "src", "**/*.ts");

// Search for code based on a query
const results = await searchCodeByQuery(
  "code that handles file operations",
  cwd,
  5
);

// Process results
for (const chunk of results) {
  console.log(`File: ${chunk.filePath}`);
  console.log(`Language: ${chunk.language}`);
  console.log(`Lines: ${chunk.startLine}-${chunk.endLine}`);
  console.log(`Symbols: ${chunk.symbols.join(", ")}`);
  console.log(`Content: ${chunk.content.substring(0, 100)}...`);
}
```

## Configuration

The RAG module can be configured through the `.rooSettings` file:

```json
{
  "ragEnabled": true,
  "ragSettings": {
    "autoIndexWorkspace": true,
    "maxResultsPerQuery": 5,
    "supportedFileTypes": [
      "js",
      "ts",
      "jsx",
      "tsx",
      "py",
      "java",
      "c",
      "cpp",
      "h",
      "hpp",
      "cs",
      "go",
      "rb",
      "php"
    ],
    "excludePatterns": ["node_modules", "dist", "build", ".git"]
  }
}
```

## Implementation Details

The current implementation uses a simple vector representation based on character frequencies as a placeholder for a more sophisticated embedding model. In a production environment, this would be replaced with a proper embedding model API call.

The module extracts code chunks and symbols from files using regex patterns tailored to different programming languages. It then generates embeddings for these chunks and stores them in memory for quick retrieval.

When a query is received, it converts the query into an embedding using the same method and finds the most similar code chunks using cosine similarity.

## Future Improvements

- Integration with a proper embedding model API (e.g., OpenAI, Anthropic, or a local model)
- More sophisticated code chunking based on AST parsing
- Persistent storage of embeddings to avoid reindexing
- Incremental indexing to only process changed files
- Support for more programming languages
- Improved symbol extraction with type information
