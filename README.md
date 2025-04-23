# Roo CLI

A command-line interface for RooCode, allowing you to execute AI tasks from the terminal.

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

# Use OpenAI API
roo new "Write a function to calculate the Fibonacci sequence" --api-provider openai --openai-api-key your-api-key --openai-base-url https://api.openai.com/v1 --openai-model gpt-4

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

# Enable verbose output
roo new "Create a simple Node.js HTTP server" --continuous --verbose
```

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

You can switch between modes using the `--mode` option:

```bash
# Use debug mode for troubleshooting
roo new "Fix the error in my Express.js server" --mode debug

# Use test mode for writing tests
roo new "Write unit tests for my authentication module" --mode test
```

### Mode-Specific Settings

The CLI automatically uses the current mode's `customInstructions` and `roleDefinition` as default values if they are defined in your custom modes configuration. This allows you to define mode-specific behaviors without having to specify them each time.

Priority order for these settings is:

1. Command line arguments (highest priority)
2. Task configuration file (.rooTask)
3. Current mode's settings from custom modes
4. Default values (lowest priority)

### Using Tools

```bash
# List available tools
roo tools

# List available tools in a specific mode
roo tools --mode code

# Execute a tool
roo tool read_file --params '{"path": "src/index.js"}'

# Execute a tool with verbose output
roo tool execute_command --params '{"command": "ls -la"}' --verbose

# Execute a tool in a specific directory
roo tool list_files --params '{"path": ".", "recursive": "true"}' --cwd /path/to/directory
```

### MCP Server

The MCP (Model Context Protocol) server allows external clients to control Roo CLI using the MCP protocol.

```bash
# Start the MCP server
roo mcp-start

# Start the MCP server on a specific port
roo mcp-start --port 3001

# Stop the MCP server
roo mcp-stop

# Restart the MCP server
roo mcp-restart

# Check the MCP server status
roo mcp-status

# Start the MCP stdio server for external clients to connect via stdin/stdout
roo mcp-stdio

# Start the MCP stdio server with specific API configuration
roo mcp-stdio --api-provider openai --openai-api-key your-api-key
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

Example client code to connect to the MCP stdio server:

```javascript
const { spawn } = require("child_process");
const readline = require("readline");

// Spawn the MCP stdio server process
const serverProcess = spawn("roo", ["mcp-stdio"], {
  stdio: ["pipe", "pipe", "inherit"],
});

// Create readline interface
const rl = readline.createInterface({
  input: serverProcess.stdout,
  terminal: false,
});

// Handle server output line by line
rl.on("line", (line) => {
  try {
    const message = JSON.parse(line);
    console.log("Received message:", message);

    // If it's the init message, send a task request
    if (message.type === "init") {
      sendMessage({
        type: "task",
        id: "task-1",
        prompt: "Write a simple hello world function in JavaScript",
        mode: "code",
        cwd: process.cwd(),
      });
    }
  } catch (error) {
    console.error("Error parsing line:", error.message);
  }
});

// Send a message to the server
function sendMessage(message) {
  serverProcess.stdin.write(JSON.stringify(message) + "\n");
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

- `GET /health`: Health check
- `POST /api/task`: Execute a task
- `GET /api/config`: Get current configuration
- `POST /api/config/api`: Update API configuration
- `POST /api/config/settings`: Update global settings
- `POST /api/config/modes`: Update custom modes
- `POST /api/config/mode`: Set current mode

### Example: Execute a Task

```bash
curl -X POST http://localhost:3000/api/task \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Write a function to calculate the Fibonacci sequence",
    "mode": "code"
  }'
```

## Environment Variables

You can use a `.env` file to configure the CLI:

```env
ANTHROPIC_API_KEY=your-api-key
ANTHROPIC_MODEL_ID=claude-3-5-sonnet-20241022

OPENAI_API_KEY=your-api-key
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL_ID=gpt-4

# For Docker
WORKSPACE_PATH=/path/to/your/workspace
PORT=3000
```

When using Docker, you can pass environment variables directly to docker-compose:

```bash
OPENAI_API_KEY=your-api-key WORKSPACE_PATH=/path/to/workspace docker-compose run --rm roo-cli new "Your prompt"
```
