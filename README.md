# Roo CLI

A command-line interface inspired by RooCode, allowing you to execute AI tasks from the terminal.

Roo CLI can be used both as a command-line tool and as a library in your Node.js applications. It features advanced RAG (Retrieval-Augmented Generation) capabilities with support for both in-memory and Qdrant vector stores for semantic code search.

## ✨ Key Features

- 🤖 **AI-Powered Task Execution**: Execute complex coding tasks using advanced AI models
- 🔍 **Semantic Code Search**: Find code using natural language descriptions with RAG technology
- 🗄️ **Multiple Vector Stores**: Support for both in-memory and Qdrant vector databases
- 🔧 **Flexible Configuration**: Comprehensive configuration management for all features
- 🌐 **MCP Protocol Support**: Integration with Model Context Protocol for external clients
- 📊 **Structured Output**: Detailed execution logs and progress tracking
- 🐳 **Docker Support**: Easy deployment with Docker and Docker Compose
- 🛠️ **Rich Tool Ecosystem**: Extensive set of tools for file operations, code analysis, and more
- 📚 **Library Usage**: Use as a Node.js library in your applications
- 🎯 **Multiple Modes**: Specialized modes for different types of tasks (code, test, debug, etc.)

## Installation

### Local Installation

```bash
# Install dependencies
pnpm install

# Build the CLI
pnpm build

# Link the CLI globally (optional)
pnpm link
```

### Docker Installation

You can also run Roo CLI using Docker:

```bash
# Clone the repository
git clone https://github.com/your-username/roo-code-mcp.git
cd roo-code-mcp/cli

# Build the Docker image
docker-compose build
```

## Usage

### Using as a Library

You can import and use Roo CLI in your Node.js applications:

```typescript
import { handleNewTask, ApiConfig, ApiProvider } from "roo-cli"

// Define API configuration
const apiConfig: ApiConfig = {
	apiProvider: ApiProvider.ANTHROPIC,
	anthropicApiKey: process.env.ANTHROPIC_API_KEY,
	anthropicModelId: "claude-3-5-sonnet-20241022",
	id: "my-config",
}

// Execute a task
async function executeTask() {
	const result = await handleNewTask({
		prompt: "Write a function to calculate the Fibonacci sequence",
		mode: "code",
		apiConfig,
		cwd: process.cwd(),
	})

	console.log(result.output)
}

// Execute a task with structured output
async function executeTaskWithStructuredOutput() {
	const result = await handleNewTask({
		prompt: "Create a simple web server",
		mode: "code",
		apiConfig,
		cwd: process.cwd(),
		continuous: true,
		structuredOutput: true,
		onStructuredUpdate: (data) => {
			console.log(`Progress: ${data.progress.percentage}%`)
			console.log(`Current step: ${data.progress.currentStep}/${data.progress.totalSteps}`)
		},
	})

	if (result.structured) {
		console.log("Execution completed!")
		console.log(`Total steps: ${result.structured.steps.length}`)
		console.log(`Total tool calls: ${result.structured.stats.totalToolCalls}`)
		console.log(`Average step time: ${result.structured.stats.averageStepTime}ms`)
	}
}

// Execute a task with file output
async function executeTaskWithFileOutput() {
	const result = await handleNewTask({
		prompt: "Build a complete application",
		mode: "code",
		apiConfig,
		cwd: process.cwd(),
		continuous: true,
		structuredOutput: "./execution-log.json",
	})

	console.log(`Task completed: ${result.success}`)
	console.log("Detailed execution log saved to: ./execution-log.json")
}

executeTask()
```

See the `examples/library-usage.ts` and `examples/structured-output-example.js` files for more detailed examples.

### Running with Docker

#### Using npm/pnpm Scripts

You can use the npm/pnpm scripts defined in `package.json` for quick access to Docker commands:

```bash
# Build the Docker image
pnpm docker:build

# Run a command (e.g., show help)
pnpm docker:run --help

# Create a new task
pnpm docker:run new "Write a function to calculate the Fibonacci sequence" --mode code

# Start the MCP server
pnpm docker:mcp

# Use standalone Docker
pnpm docker:standalone --help

# Build standalone Docker image
pnpm docker:standalone:build

# Start standalone MCP server
pnpm docker:standalone:mcp
```

> **注意**: 当使用 Docker 运行 `roo new` 命令时，脚本会自动添加 `--workspace /workspace` 参数，确保文件操作在容器内的挂载目录中进行。本地目录 `${WORKSPACE_PATH}` 会被挂载到容器内的 `/workspace` 目录。
>
> 使用示例：
>
> ```bash
> # 指定本地工作区目录
> ./docker-run-standalone.sh new "创建一个 Node.js 服务器" --workspace="./playground"
>
> # 指定 OpenAI API 密钥、基础 URL 和模型 ID
> ./docker-run-standalone.sh --openai-api-key="sk-your-api-key" --openai-base-url="https://api.example.com/v1" --openai-model="gpt-4o" new "创建一个 Node.js 服务器"
>
> # 指定 Anthropic API 密钥和模型 ID
> ./docker-run-standalone.sh --anthropic-key="sk-ant-your-api-key" --anthropic-model="claude-3-opus-20240229" new "创建一个 Node.js 服务器"
>
> # 或者使用环境变量指定工作区目录、API 密钥、基础 URL 和模型 ID
> WORKSPACE_PATH="./playground" OPENAI_API_KEY="sk-your-api-key" OPENAI_BASE_URL="https://api.example.com/v1" OPENAI_MODEL_ID="gpt-4o" ./docker-run.sh new "创建一个 Node.js 服务器"
>
> # 或者使用 Anthropic 模型
> ANTHROPIC_API_KEY="sk-ant-your-api-key" ANTHROPIC_MODEL_ID="claude-3-opus-20240229" ./docker-run.sh new "创建一个 Node.js 服务器"
> ```

#### Using docker-compose

You can use the provided scripts to run Roo CLI with docker-compose:

```bash
# Run a command (e.g., show help)
./docker-run.sh --help

# Create a new task
./docker-run.sh new "Write a function to calculate the Fibonacci sequence" --mode code

# Specify a custom workspace directory
WORKSPACE_PATH=/path/to/your/workspace ./docker-run.sh new "Create a Node.js server"

# Start the MCP server
./docker-mcp-server.sh

# Start the MCP server on a specific port
PORT=3001 ./docker-mcp-server.sh
```

You can also use docker-compose directly:

```bash
# Run a command
docker-compose run --rm roo-cli new "Write a function" --mode code

# Mount a specific workspace directory
WORKSPACE_PATH=/path/to/your/workspace docker-compose run --rm roo-cli new "Create a Node.js server"
```

#### Using Docker Standalone

If you prefer not to use docker-compose, you can use the standalone Docker script:

```bash
# Build the Docker image
./docker-run-standalone.sh --build

# Show help information
./docker-run-standalone.sh --help

# Create a new task
./docker-run-standalone.sh new "Write a function to calculate the Fibonacci sequence" --mode code

# Specify a custom workspace directory
./docker-run-standalone.sh --workspace /path/to/your/workspace new "Create a Node.js server"

# Start the MCP server
./docker-run-standalone.sh --mcp-server

# Start the MCP server on a specific port
./docker-run-standalone.sh --mcp-server --port 3001

# Set API keys
./docker-run-standalone.sh --openai-key "your-api-key" --anthropic-key "your-api-key" new "Your prompt"
```

### Creating a New Task

```bash
# Basic usage
roo new "Write a function to calculate the Fibonacci sequence"

# Specify a mode
roo new "Write a function to calculate the Fibonacci sequence" --mode code

# Specify a workspace directory
roo new "Write a function to calculate the Fibonacci sequence" --workspace /path/to/project

# Use a custom configuration file
roo new "Write a function to calculate the Fibonacci sequence" --config-file path/to/config.json

# Read requirements from a file
roo new --input-file path/to/requirements.txt

# Use OpenAI API
roo new "Write a function to calculate the Fibonacci sequence" --api-provider openai --openai-api-key your-api-key --openai-base-url https://api.openai.com/v1 --openai-model gpt-4

# Use OpenAI API with stream mode (required for some models like Qwen)
roo new "Write a function to calculate the Fibonacci sequence" --api-provider openai --openai-api-key your-api-key --openai-model qwen3-235b-a22b --stream-mode

# Use Anthropic API
roo new "Write a function to calculate the Fibonacci sequence" --api-provider anthropic --anthropic-api-key your-api-key --anthropic-model claude-3-5-sonnet-20241022
```

### Continuous Execution Mode

Continuous execution mode allows the AI to automatically execute multiple steps to complete a task without requiring user intervention between each step.

```bash
# Enable continuous execution mode
roo new "Create a simple Node.js HTTP server" --continuous

# Specify maximum number of steps
roo new "Create a simple Node.js HTTP server" --continuous --max-steps 5

# Set log level (debug=0, info=1, success=2, warn=3, error=4)
roo new "Create a simple Node.js HTTP server" --log-level debug
roo new "Create a simple Node.js HTTP server" --log-level 0

# Set log level to info (default)
roo new "Create a simple Node.js HTTP server" --log-level info
roo new "Create a simple Node.js HTTP server" --log-level 1

# Set log level to error (minimal output)
roo new "Create a simple Node.js HTTP server" --log-level error
roo new "Create a simple Node.js HTTP server" --log-level 4

# Set log level to always (only show logger.always output)
roo new "Create a simple Node.js HTTP server" --log-level always
roo new "Create a simple Node.js HTTP server" --log-level 5

# Only output the final result (suppress intermediate output)
roo new "Create a simple Node.js HTTP server" --continuous --only-final-output

# Combine with auto mode
roo new "Create a simple Node.js HTTP server" --continuous --auto --only-final-output
```

### Structured Output

Roo CLI provides structured output functionality that allows you to get detailed execution information in JSON format, including progress, steps, logs, and statistics. This is particularly useful for monitoring, analysis, and integration with other systems.

#### Console Output Mode

```bash
# Enable structured output to console
roo new "Create a simple calculator" --structured-output

# Combine with continuous execution
roo new "Build a web application" --continuous --structured-output

# View real-time updates in debug mode
roo new "Complex task" --structured-output --log-level debug
```

#### File Output Mode

```bash
# Output structured data to a file
roo new "Create a Node.js project" --structured-output ./output.json

# Continuous execution with file output
roo new "Build and test application" --continuous --structured-output ./execution-log.json

# Specify custom file path
roo new "Data analysis task" --structured-output /path/to/results/analysis.json
```

#### Structured Output Format

When using file output mode, the JSON file contains comprehensive execution information:

```json
{
  "status": "completed",
  "completedTime": 1748109166390,
  "structured": {
    "task": {
      "id": "task-uuid",
      "mode": "code",
      "cwd": "/working/directory",
      "startTime": 1748109156158,
      "endTime": 1748109166390,
      "duration": 10232
    },
    "config": {
      "continuous": true,
      "maxSteps": 100,
      "auto": false,
      "onlyReturnLastResult": false
    },
    "progress": {
      "currentStep": 3,
      "totalSteps": 100,
      "status": "completed",
      "percentage": 100
    },
    "steps": [
      {
        "stepNumber": 1,
        "startTime": 1748109156158,
        "endTime": 1748109166389,
        "duration": 10231,
        "status": "completed",
        "aiResponse": {
          "text": "AI response content...",
          "toolCalls": [...],
          "usage": {
            "promptTokens": 150,
            "completionTokens": 80,
            "totalTokens": 230
          }
        },
        "toolResults": [
          {
            "toolName": "write_to_file",
            "params": {...},
            "result": "File created successfully",
            "success": true,
            "duration": 50
          }
        ],
        "output": "Step output content..."
      }
    ],
    "logs": [
      {
        "timestamp": 1748109156158,
        "level": "progress",
        "message": "Executing step 1/3",
        "stepNumber": 1
      }
    ],
    "finalOutput": "Task completion summary...",
    "stats": {
      "totalToolCalls": 5,
      "totalTokensUsed": 1250,
      "averageStepTime": 8500
    }
  },
  "result": {
    "success": true,
    "taskId": "task-uuid",
    "output": "Final task output..."
  }
}
```

#### Use Cases

- **Monitoring**: Track long-running tasks with real-time progress updates
- **Analysis**: Analyze execution patterns and performance metrics
- **Integration**: Feed execution data into other systems or dashboards
- **Debugging**: Detailed step-by-step execution information for troubleshooting
- **Reporting**: Generate comprehensive execution reports

### Auto Mode

Auto mode allows the AI to automatically execute tasks without asking for user confirmation. This is useful for automated workflows or when you want to let the AI complete a task without interruption.

```bash
# Enable auto mode
roo new "Create a simple Node.js HTTP server" --auto

# Use auto mode with continuous execution
roo new "Create a simple Node.js HTTP server" --auto --continuous

# Set the mode to auto
roo new "Create a simple Node.js HTTP server" --mode auto
```

### Custom Rules

You can provide custom rules to supplement the default rules that guide the AI's behavior. This is useful when you want to enforce specific coding standards or practices.

```bash
# Add custom rules
roo new "Create a simple Node.js HTTP server" --rules "11. Always use ES6 syntax. 12. Use async/await instead of promises."

# Combine with other options
roo new "Create a simple Node.js HTTP server" --rules "11. Follow the AirBnB style guide." --auto --continuous
```

### Custom Role Definition

You can provide a custom role definition to override the default one. This is useful when you want to change the AI's personality or expertise.

```bash
# Add custom role definition
roo new "Create a simple Node.js HTTP server" --role-definition "You are an expert Node.js developer with 10 years of experience."

# Combine with other options
roo new "Create a simple Node.js HTTP server" --role-definition "You are a security-focused developer." --auto --continuous
```

### Available Modes

The CLI comes with several built-in modes:

- **code**: Default mode for general coding tasks
- **ask**: Mode for answering questions and providing information
- **test**: Mode specialized for writing and maintaining test suites
- **debug**: Mode specialized for analyzing and fixing problems in code, including static code issues, compilation errors, and runtime exceptions
- **orchestrator**: Mode specialized for coordinating complex workflows by delegating tasks to appropriate specialized modes

You can switch between modes using the `--mode` option:

```bash
# Use debug mode for troubleshooting
roo new "Fix the error in my Express.js server" --mode debug

# Use test mode for writing tests
roo new "Write unit tests for my authentication module" --mode test

# Use orchestrator mode for complex workflows
roo new "Build a complete web application with frontend and backend" --mode orchestrator
```

### Mode-Specific Settings

The CLI automatically uses the current mode's `customInstructions` and `roleDefinition` as default values if they are defined in your custom modes configuration. This allows you to define mode-specific behaviors without having to specify them each time.

Priority order for these settings is:

1. Command line arguments (highest priority)
2. Task configuration file (.rooTask)
3. Current mode's settings from custom modes
4. Default values (lowest priority)

## RAG (Retrieval-Augmented Generation) Features

Roo CLI includes advanced RAG capabilities that enable semantic code search and intelligent code analysis. The system supports both in-memory and Qdrant vector stores for different use cases.

### Semantic Code Search

The semantic code search tool allows you to find code based on natural language descriptions rather than just keywords:

```bash
# Search for authentication-related code
roo tool semantic_code_search --params '{
  "path": "src",
  "query": "user authentication and login functionality",
  "top_k": 5
}'

# Search for database operations
roo tool semantic_code_search --params '{
  "path": "backend",
  "query": "database queries and data persistence",
  "file_pattern": "**/*.{js,ts,py}",
  "top_k": 3
}'

# Search for error handling patterns
roo tool semantic_code_search --params '{
  "path": ".",
  "query": "error handling and exception management"
}'
```

### RAG Configuration Management

Roo CLI provides comprehensive RAG configuration management through the `rag` command:

```bash
# View current RAG configuration
roo rag status

# Configure Qdrant vector store
roo rag configure-qdrant \
  --url http://localhost:6333 \
  --collection my-project \
  --dimensions 1536 \
  --api-key your-api-key

# Configure in-memory vector store
roo rag configure-memory --dimensions 256

# Enable/disable RAG functionality
roo rag enable
roo rag disable

# Validate current configuration
roo rag validate

# Reset to default settings
roo rag reset

# Export configuration for backup
roo rag export --file rag-config.json

# Import configuration from backup
roo rag import --file rag-config.json
```

### Vector Store Options

#### In-Memory Vector Store

- **Best for**: Development, testing, small projects
- **Pros**: No external dependencies, fast setup
- **Cons**: Limited by available RAM, data not persistent

#### Qdrant Vector Store

- **Best for**: Production, large codebases, persistent storage
- **Pros**: Scalable, persistent, advanced search features
- **Cons**: Requires Qdrant server setup

### RAG Configuration File

You can configure RAG settings in your `.rooSettings` file:

```json
{
	"ragEnabled": true,
	"ragSettings": {
		"vectorStore": {
			"type": "qdrant",
			"url": "http://localhost:6333",
			"collectionName": "my-project-code",
			"dimensions": 1536,
			"apiKey": "your-api-key"
		},
		"autoIndexWorkspace": true,
		"maxResultsPerQuery": 5,
		"supportedFileTypes": ["js", "ts", "jsx", "tsx", "py", "java", "c", "cpp", "cs", "go", "rb", "php"]
	}
}
```

### Setting up Qdrant

To use Qdrant vector store, you need to have a Qdrant server running:

```bash
# Using Docker
docker run -p 6333:6333 qdrant/qdrant

# Using Docker Compose
version: '3.8'
services:
  qdrant:
    image: qdrant/qdrant
    ports:
      - "6333:6333"
    volumes:
      - qdrant_data:/qdrant/storage

volumes:
  qdrant_data:
```

### Using Tools

```bash
# List available tools
roo tools

# List available tools in a specific mode
roo tools --mode code

# Execute a tool
roo tool read_file --params '{"path": "src/index.js"}'

# Execute a tool with debug log level (shows all logs)
roo tool execute_command --params '{"command": "ls -la"}' --log-level debug

# Execute a tool in a specific directory
roo tool list_files --params '{"path": ".", "recursive": "true"}' --cwd /path/to/directory

# Execute a tool with info log level (shows detailed information)
roo tool read_file --params '{"path": "src/index.js"}' --log-level info

# Execute a tool with progress log level (default, shows key progress)
roo tool read_file --params '{"path": "src/index.js"}' --log-level progress

# Execute a tool with error log level (minimal output)
roo tool read_file --params '{"path": "src/index.js"}' --log-level error
```

### Log Levels

Roo CLI supports multiple log levels to help you control output verbosity:

- **debug**: Shows all log information, including debugging details
- **progress** (default): Shows key task execution progress and status (includes all info level messages)
- **info**: Shows detailed information logs, including technical details
- **success**: Shows only success messages
- **warn**: Shows only warnings and higher level messages
- **error**: Shows only error messages
- **always**: Shows messages marked as always visible

**Recommended usage**:

- Daily use: `progress` (default) - Get clear progress overview with all important information
- Simplified output: `info` - Show only technical details without progress information
- Debugging: `debug` - View the most complete execution details
- Automation scripts: `error` - Focus only on error messages

```bash
# Use default progress level
roo new "Create a React component"

# Show only technical details (no progress information)
roo new "Create a React component" --log-level info

# View the most detailed execution process
roo new "Create a React component" --log-level debug

# Show only errors (suitable for scripts)
roo new "Create a React component" --log-level error
```

### MCP Server

The MCP (Model Context Protocol) server allows external clients to control Roo CLI using the MCP protocol.

```bash

# Start the MCP stdio server for external clients to connect via stdin/stdout
roo mcp-stdio

# Start the MCP stdio server with specific API configuration
roo mcp-stdio --api-provider openai --openai-api-key your-api-key

# Start the MCP SSE server for external clients to connect via SSE
roo mcp-sse

# Start the MCP SSE server on a specific port
roo mcp-sse --port 3001

# Start the MCP SSE server with specific API configuration
roo mcp-sse --api-provider anthropic --anthropic-api-key your-api-key
```

### MCP Stdio Server

The MCP stdio server allows other services to connect to Roo CLI via standard input/output streams using the MCP protocol. This enables integration with other applications that support the MCP protocol.

```bash
# Start the MCP stdio server
roo mcp-stdio

# Start with specific provider configuration
roo mcp-stdio --api-provider anthropic --anthropic-api-key your-api-key

# Use custom configuration files
roo mcp-stdio --provider-file path/to/provider.json --settings-file path/to/settings.json
```

### MCP SSE Server

The MCP SSE (Server-Sent Events) server allows other services to connect to Roo CLI via HTTP using the SSE protocol. This enables web applications and other HTTP clients to integrate with Roo CLI using the MCP protocol.

```bash
# Start the MCP SSE server
roo mcp-sse

# Start the MCP SSE server on a specific port
roo mcp-sse --port 3001

# Start with specific provider configuration
roo mcp-sse --api-provider anthropic --anthropic-api-key your-api-key

# Use custom configuration files
roo mcp-sse --provider-file path/to/provider.json --settings-file path/to/settings.json
```

The SSE server provides two main endpoints:

- `/sse` - The SSE endpoint for establishing a connection
- `/messages` - The endpoint for sending messages to the server

Example client code to connect to the MCP stdio server:

```javascript
const { spawn } = require("child_process")
const readline = require("readline")

// Spawn the MCP stdio server process
const serverProcess = spawn("roo", ["mcp-stdio"], {
	stdio: ["pipe", "pipe", "inherit"],
})

// Create readline interface
const rl = readline.createInterface({
	input: serverProcess.stdout,
	terminal: false,
})

// Handle server output line by line
rl.on("line", (line) => {
	try {
		const message = JSON.parse(line)
		console.log("Received message:", message)

		// If it's the init message, send a task request
		if (message.type === "init") {
			sendMessage({
				type: "task",
				id: "task-1",
				prompt: "Write a simple hello world function in JavaScript",
				mode: "code",
				cwd: process.cwd(),
			})
		}
	} catch (error) {
		console.error("Error parsing line:", error.message)
	}
})

// Send a message to the server
function sendMessage(message) {
	serverProcess.stdin.write(JSON.stringify(message) + "\n")
}
```

### Starting the Server

```bash
# Start the server on the default port (3000)
roo server

# Specify a custom port
roo server --port 8080
```

## Configuration Files

The CLI uses several configuration files:

- `.rooTask`: Task configuration
- `.rooProviderProfiles`: AI provider settings
- `.rooSettings`: Global settings
- `.rooModes`: Custom modes

### Task Configuration (`.rooTask`)

```json
{
	"mode": "code",
	"message": "Write a function to calculate the Fibonacci sequence",
	"cwd": "/path/to/working/directory",
	"auto": false,
	"rules": "11. Always use ES6 syntax. 12. Use async/await instead of promises.",
	"roleDefinition": "You are an expert JavaScript developer with deep knowledge of algorithms."
}
```

### Provider Profiles (`.rooProviderProfiles`)

```json
{
	"currentApiConfigName": "anthropic",
	"apiConfigs": {
		"anthropic": {
			"apiProvider": "anthropic",
			"anthropicApiKey": "your-api-key",
			"anthropicModelId": "claude-3-5-sonnet-20241022",
			"id": "anthropic"
		},
		"openai": {
			"apiProvider": "openai",
			"openAiApiKey": "your-api-key",
			"openAiBaseUrl": "https://api.openai.com/v1",
			"openAiModelId": "gpt-4",
			"id": "openai"
		}
	}
}
```

### Global Settings (`.rooSettings`)

```json
{
	"autoApprovalEnabled": true,
	"alwaysAllowReadOnly": true,
	"alwaysAllowWrite": true,
	"alwaysAllowExecute": true,
	"allowedCommands": ["npm test", "npm install", "git log"],
	"ragEnabled": true,
	"ragSettings": {
		"vectorStore": {
			"type": "in-memory",
			"dimensions": 256
		},
		"autoIndexWorkspace": true,
		"maxResultsPerQuery": 5,
		"supportedFileTypes": ["js", "ts", "jsx", "tsx", "py", "java", "c", "cpp", "cs", "go", "rb", "php"]
	},
	"customModes": [
		{
			"slug": "test",
			"name": "Test",
			"roleDefinition": "You are a testing specialist...",
			"customInstructions": "When writing tests...",
			"groups": ["read", "browser", "command"],
			"source": "project"
		}
	]
}
```

### Custom Modes (`.rooModes`)

```json
[
	{
		"slug": "translate",
		"name": "Translate",
		"roleDefinition": "You are a linguistic specialist...",
		"groups": ["read", "command"],
		"source": "project"
	}
]
```

## API Server

When running the server, the following endpoints are available:

- `GET /`: API information and documentation
- `GET /health`: Health check with server status
- `POST /api/task`: Execute a task
- `GET /api/config`: Get current configuration
- `POST /api/config/api`: Update API configuration
- `POST /api/config/settings`: Update global settings
- `POST /api/config/modes`: Update custom modes
- `POST /api/config/mode`: Set current mode
- `GET /api/tools`: Get available tools
- `GET /api/rag/status`: Get RAG configuration status
- `POST /api/rag/configure`: Update RAG configuration
- `POST /api/rag/search`: Perform semantic code search

The server now supports CORS, allowing cross-origin requests from web applications. It also provides detailed error handling and logging for better debugging.

### Example: Execute a Task

```bash
# Basic task execution
curl -X POST http://localhost:3000/api/task \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Write a function to calculate the Fibonacci sequence",
    "mode": "code"
  }'

# Task execution with structured output
curl -X POST http://localhost:3000/api/task \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Create a web application",
    "mode": "code",
    "continuous": true,
    "structuredOutput": true
  }'

# Task execution with file output
curl -X POST http://localhost:3000/api/task \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Build and test application",
    "mode": "code",
    "continuous": true,
    "structuredOutput": "./api-execution-log.json"
  }'
```

## Environment Variables

You can use a `.env` file to configure the CLI:

```env
# API Configuration
ANTHROPIC_API_KEY=your-api-key
ANTHROPIC_MODEL_ID=claude-3-5-sonnet-20241022

OPENAI_API_KEY=your-api-key
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL_ID=gpt-4

# Server Configuration
PORT=3000                           # Port for API and MCP SSE servers

# RAG Configuration
QDRANT_URL=http://localhost:6333     # Qdrant server URL
QDRANT_API_KEY=your-qdrant-api-key   # Qdrant API key (optional)
QDRANT_COLLECTION=roo-code           # Default collection name

# For Docker
WORKSPACE_PATH=/path/to/your/workspace
```

When using Docker, you can pass environment variables directly to docker-compose:

```bash
OPENAI_API_KEY=your-api-key WORKSPACE_PATH=/path/to/workspace docker-compose run --rm roo-cli new "Your prompt"
```
