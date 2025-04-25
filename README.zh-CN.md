# Roo CLI

RooCode 的命令行界面，允许你从终端执行 AI 任务。

## 安装

### 本地安装

```bash
# 安装依赖
pnpm install

# 构建 CLI
pnpm build

# 全局链接 CLI（可选）
pnpm link
```

### Docker 安装

你也可以使用 Docker 运行 Roo CLI：

```bash
# 克隆仓库
git clone https://github.com/your-username/roo-code-mcp.git
cd roo-code-mcp/cli

# 构建 Docker 镜像
docker-compose build
```

## 使用

### 使用 Docker 运行

#### 使用 npm/pnpm 脚本

你可以使用 `package.json` 中定义的 npm/pnpm 脚本来快速访问 Docker 命令：

```bash
# 构建 Docker 镜像
pnpm docker:build

# 运行命令（例如，显示帮助）
pnpm docker:run --help

# 创建新任务
pnpm docker:run new "编写一个计算斐波那契数列的函数" --mode code

# 启动 MCP 服务器
pnpm docker:mcp

# 使用独立 Docker
pnpm docker:standalone --help

# 构建独立 Docker 镜像
pnpm docker:standalone:build

# 启动独立 MCP 服务器
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

#### 使用 docker-compose

你可以使用提供的脚本来通过 docker-compose 运行 Roo CLI：

```bash
# 运行命令（例如，显示帮助）
./docker-run.sh --help

# 创建新任务
./docker-run.sh new "编写一个计算斐波那契数列的函数" --mode code

# 指定自定义工作区目录
WORKSPACE_PATH=/path/to/your/workspace ./docker-run.sh new "创建一个 Node.js 服务器"

# 启动 MCP 服务器
./docker-mcp-server.sh

# 在指定端口启动 MCP 服务器
PORT=3001 ./docker-mcp-server.sh
```

你也可以直接使用 docker-compose：

```bash
# 运行命令
docker-compose run --rm roo-cli new "编写一个函数" --mode code

# 挂载特定工作区目录
WORKSPACE_PATH=/path/to/your/workspace docker-compose run --rm roo-cli new "创建一个 Node.js 服务器"
```

#### 使用独立 Docker

如果你不想使用 docker-compose，可以使用独立 Docker 脚本：

```bash
# 构建 Docker 镜像
./docker-run-standalone.sh --build

# 显示帮助信息
./docker-run-standalone.sh --help

# 创建新任务
./docker-run-standalone.sh new "编写一个计算斐波那契数列的函数" --mode code

# 指定自定义工作区目录
./docker-run-standalone.sh --workspace /path/to/your/workspace new "创建一个 Node.js 服务器"

# 启动 MCP 服务器
./docker-run-standalone.sh --mcp-server

# 在指定端口启动 MCP 服务器
./docker-run-standalone.sh --mcp-server --port 3001

# 设置 API 密钥
./docker-run-standalone.sh --openai-key "your-api-key" --anthropic-key "your-api-key" new "你的提示"
```

### 创建新任务

```bash
# 基本用法
roo new "编写一个计算斐波那契数列的函数"

# 指定模式
roo new "编写一个计算斐波那契数列的函数" --mode code

# 指定工作区目录
roo new "编写一个计算斐波那契数列的函数" --workspace /path/to/project

# 使用自定义配置文件
roo new "编写一个计算斐波那契数列的函数" --config-file path/to/config.json

# 使用 OpenAI API
roo new "编写一个计算斐波那契数列的函数" --api-provider openai --openai-api-key your-api-key --openai-base-url https://api.openai.com/v1 --openai-model gpt-4

# 使用 Anthropic API
roo new "编写一个计算斐波那契数列的函数" --api-provider anthropic --anthropic-api-key your-api-key --anthropic-model claude-3-5-sonnet-20241022
```

### 连续执行模式

连续执行模式允许 AI 自动执行多个步骤以完成任务，而无需在每一步之间进行用户干预。

```bash
# 启用连续执行模式
roo new "创建一个简单的 Node.js HTTP 服务器" --continuous

# 指定最大步骤数
roo new "创建一个简单的 Node.js HTTP 服务器" --continuous --max-steps 5

# 启用详细输出
roo new "创建一个简单的 Node.js HTTP 服务器" --continuous --verbose
```

### 自动模式

自动模式允许 AI 自动执行任务而无需用户确认。这对于自动化工作流或当你希望 AI 完成任务而不被打断时非常有用。

```bash
# 启用自动模式
roo new "创建一个简单的 Node.js HTTP 服务器" --auto

# 使用自动模式与连续执行
roo new "创建一个简单的 Node.js HTTP 服务器" --auto --continuous

# 将模式设置为自动
roo new "创建一个简单的 Node.js HTTP 服务器" --mode auto
```

### 自定义规则

你可以提供自定义规则来补充指导 AI 行为的默认规则。这在你想强制执行特定的编码标准或实践时非常有用。

```bash
# 添加自定义规则
roo new "创建一个简单的 Node.js HTTP 服务器" --rules "11. 始终使用 ES6 语法。12. 使用 async/await 而不是 promises。"

# 结合其他选项
roo new "创建一个简单的 Node.js HTTP 服务器" --rules "11. 遵循 AirBnB 风格指南。" --auto --continuous
```

### 自定义角色定义

你可以提供自定义角色定义来覆盖默认定义。这在你想改变 AI 的个性或专业知识时非常有用。

```bash
# 添加自定义角色定义
roo new "创建一个简单的 Node.js HTTP 服务器" --role-definition "你是一位拥有 10 年经验的 Node.js 开发专家。"

# 结合其他选项
roo new "创建一个简单的 Node.js HTTP 服务器" --role-definition "你是一位注重安全的开发者。" --auto --continuous
```

### 可用模式

CLI 提供了几种内置模式：

- **code**: 用于一般编码任务的默认模式
- **ask**: 用于回答问题和提供信息的模式
- **test**: 专门用于编写和维护测试套件的模式
- **debug**: 专门用于分析和修复代码问题的模式，包括静态代码问题、编译错误和运行时异常

你可以使用 `--mode` 选项在模式之间切换：

```bash
# 使用调试模式进行故障排除
roo new "修复我的 Express.js 服务器中的错误" --mode debug

# 使用测试模式编写测试
roo new "为我的身份验证模块编写单元测试" --mode test
```

### 模式特定设置

如果自定义模式配置中定义了当前模式的 `customInstructions` 和 `roleDefinition`，CLI 会自动使用它们作为默认值。这允许你定义模式特定的行为，而无需每次都指定它们。

这些设置的优先级顺序为：

1. 命令行参数（最高优先级）
2. 任务配置文件 (.rooTask)
3. 当前模式的设置（来自自定义模式）
4. 默认值（最低优先级）

### 使用工具

```bash
# 列出可用工具
roo tools

# 列出特定模式中的可用工具
roo tools --mode code

# 执行工具
roo tool read_file --params '{"path": "src/index.js"}'

# 执行工具并显示详细输出
roo tool execute_command --params '{"command": "ls -la"}' --verbose

# 在特定目录中执行工具
roo tool list_files --params '{"path": ".", "recursive": "true"}' --cwd /path/to/directory
```

### MCP 服务器

MCP（模型上下文协议）服务器允许外部客户端使用 MCP 协议控制 Roo CLI。

```bash
# 启动 MCP 服务器
roo mcp-start

# 在指定端口启动 MCP 服务器
roo mcp-start --port 3001

# 停止 MCP 服务器
roo mcp-stop

# 重启 MCP 服务器
roo mcp-restart

# 检查 MCP 服务器状态
roo mcp-status

# 启动 MCP stdio 服务器，供外部客户端通过 stdin/stdout 连接
roo mcp-stdio

# 使用特定 API 配置启动 MCP stdio 服务器
roo mcp-stdio --api-provider openai --openai-api-key your-api-key

# 启动 MCP SSE 服务器，供外部客户端通过 SSE 连接
roo mcp-sse

# 在指定端口启动 MCP SSE 服务器
roo mcp-sse --port 3001

# 使用特定 API 配置启动 MCP SSE 服务器
roo mcp-sse --api-provider anthropic --anthropic-api-key your-api-key
```

### MCP Stdio 服务器

MCP stdio 服务器允许其他服务通过标准输入/输出流使用 MCP 协议连接到 Roo CLI。这使得支持 MCP 协议的其他应用程序能够集成。

```bash
# 启动 MCP stdio 服务器
roo mcp-stdio

# 使用特定提供者配置启动
roo mcp-stdio --api-provider anthropic --anthropic-api-key your-api-key

# 使用自定义配置文件
roo mcp-stdio --provider-file path/to/provider.json --settings-file path/to/settings.json
```

### MCP SSE 服务器

MCP SSE（Server-Sent Events）服务器允许其他服务通过 HTTP 使用 SSE 协议连接到 Roo CLI。这使得 Web 应用程序和其他 HTTP 客户端能够使用 MCP 协议与 Roo CLI 集成。

```bash
# 启动 MCP SSE 服务器
roo mcp-sse

# 在指定端口启动 MCP SSE 服务器
roo mcp-sse --port 3001

# 使用特定提供者配置启动
roo mcp-sse --api-provider anthropic --anthropic-api-key your-api-key

# 使用自定义配置文件
roo mcp-sse --provider-file path/to/provider.json --settings-file path/to/settings.json
```

SSE 服务器提供两个主要端点：

- `/sse` - 用于建立连接的 SSE 端点
- `/messages` - 用于向服务器发送消息的端点

连接 MCP stdio 服务器的示例客户端代码：

```javascript
const { spawn } = require("child_process");
const readline = require("readline");

// 启动 MCP stdio 服务器进程
const serverProcess = spawn("roo", ["mcp-stdio"], {
  stdio: ["pipe", "pipe", "inherit"],
});

// 创建 readline 接口
const rl = readline.createInterface({
  input: serverProcess.stdout,
  terminal: false,
});

// 逐行处理服务器输出
rl.on("line", (line) => {
  try {
    const message = JSON.parse(line);
    console.log("收到消息:", message);

    // 如果是初始化消息，发送任务请求
    if (message.type === "init") {
      sendMessage({
        type: "task",
        id: "task-1",
        prompt: "用 JavaScript 编写一个简单的 hello world 函数",
        mode: "code",
        cwd: process.cwd(),
      });
    }
  } catch (error) {
    console.error("解析行时出错:", error.message);
  }
});

// 向服务器发送消息
function sendMessage(message) {
  serverProcess.stdin.write(JSON.stringify(message) + "\n");
}
```

### 启动服务器

```bash
# 在默认端口（3000）启动服务器
roo server

# 指定自定义端口
roo server --port 8080
```

## 配置文件

CLI 使用多个配置文件：

- `.rooTask`: 任务配置
- `.rooProviderProfiles`: AI 提供者设置
- `.rooSettings`: 全局设置
- `.rooModes`: 自定义模式

### 任务配置 (`.rooTask`)

```json
{
  "mode": "code",
  "message": "编写一个计算斐波那契数列的函数",
  "cwd": "/path/to/working/directory",
  "auto": false,
  "rules": "11. 始终使用 ES6 语法。12. 使用 async/await 而不是 promises。",
  "roleDefinition": "你是一位精通 JavaScript 的算法专家。"
}
```

### 提供者配置文件 (`.rooProviderProfiles`)

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

### 全局设置 (`.rooSettings`)

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
      "name": "测试",
      "roleDefinition": "你是一位测试专家...",
      "customInstructions": "编写测试时...",
      "groups": ["read", "browser", "command"],
      "source": "project"
    }
  ]
}
```

### 自定义模式 (`.rooModes`)

```json
[
  {
    "slug": "translate",
    "name": "翻译",
    "roleDefinition": "你是一位语言专家...",
    "groups": ["read", "command"],
    "source": "project"
  }
]
```

## API 服务器

运行服务器时，以下端点可用：

- `GET /health`: 健康检查
- `POST /api/task`: 执行任务
- `GET /api/config`: 获取当前配置
- `POST /api/config/api`: 更新 API 配置
- `POST /api/config/settings`: 更新全局设置
- `POST /api/config/modes`: 更新自定义模式
- `POST /api/config/mode`: 设置当前模式

### 示例：执行任务

```bash
curl -X POST http://localhost:3000/api/task \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "编写一个计算斐波那契数列的函数",
    "mode": "code"
  }'
```

## 环境变量

你可以使用 `.env` 文件来配置 CLI：

```env
ANTHROPIC_API_KEY=your-api-key
ANTHROPIC_MODEL_ID=claude-3-5-sonnet-20241022

OPENAI_API_KEY=your-api-key
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL_ID=gpt-4

# 用于 Docker
WORKSPACE_PATH=/path/to/your/workspace
PORT=3000
```

使用 Docker 时，你可以直接将环境变量传递给 docker-compose：

```bash
OPENAI_API_KEY=your-api-key WORKSPACE_PATH=/path/to/workspace docker-compose run --rm roo-cli new "你的提示"
```
