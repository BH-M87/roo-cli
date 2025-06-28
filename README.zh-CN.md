# Roo CLI

参考 RooCode 实现的命令行界面，允许你从终端执行 AI 任务。

Roo CLI 既可以作为命令行工具使用，也可以作为库在 Node.js 应用程序中导入使用。它具有先进的 RAG（检索增强生成）功能，支持内存和 Qdrant 向量存储，用于语义代码搜索。

## ✨ 主要特性

- 🤖 **AI 驱动的任务执行**: 使用先进的 AI 模型执行复杂的编码任务
- 🔍 **语义代码搜索**: 使用 RAG 技术通过自然语言描述查找代码
- 🗄️ **多种向量存储**: 支持内存和 Qdrant 向量数据库
- 🔧 **灵活配置**: 所有功能的全面配置管理
- 🌐 **MCP 协议支持**: 与模型上下文协议集成，支持外部客户端
- 📊 **结构化输出**: 详细的执行日志和进度跟踪
- 🐳 **Docker 支持**: 使用 Docker 和 Docker Compose 轻松部署
- 🛠️ **丰富的工具生态系统**: 用于文件操作、代码分析等的广泛工具集
- 📚 **库使用**: 在应用程序中作为 Node.js 库使用
- 🎯 **多种模式**: 针对不同类型任务的专门模式（代码、测试、调试等）

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

### 作为库使用

你可以在 Node.js 应用程序中导入和使用 Roo CLI：

```typescript
import { handleNewTask, ApiConfig, ApiProvider } from "roo-cli";

// 定义 API 配置
const apiConfig: ApiConfig = {
  apiProvider: ApiProvider.ANTHROPIC,
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,
  anthropicModelId: "claude-3-5-sonnet-20241022",
  id: "my-config",
};

// 执行任务
async function executeTask() {
  const result = await handleNewTask({
    prompt: "编写一个计算斐波那契数列的函数",
    mode: "code",
    apiConfig,
    cwd: process.cwd(),
  });

  console.log(result.output);
}

// 执行带结构化输出的任务
async function executeTaskWithStructuredOutput() {
  const result = await handleNewTask({
    prompt: "创建一个简单的 Web 服务器",
    mode: "code",
    apiConfig,
    cwd: process.cwd(),
    continuous: true,
    structuredOutput: true,
    onStructuredUpdate: (data) => {
      console.log(`进度: ${data.progress.percentage}%`);
      console.log(
        `当前步骤: ${data.progress.currentStep}/${data.progress.totalSteps}`
      );
    },
  });

  if (result.structured) {
    console.log("执行完成！");
    console.log(`总步骤数: ${result.structured.steps.length}`);
    console.log(`总工具调用: ${result.structured.stats.totalToolCalls}`);
    console.log(`平均步骤时间: ${result.structured.stats.averageStepTime}ms`);
  }
}

// 执行带文件输出的任务
async function executeTaskWithFileOutput() {
  const result = await handleNewTask({
    prompt: "构建一个完整的应用程序",
    mode: "code",
    apiConfig,
    cwd: process.cwd(),
    continuous: true,
    structuredOutput: "./execution-log.json",
  });

  console.log(`任务完成: ${result.success}`);
  console.log("详细执行日志已保存到: ./execution-log.json");
}

executeTask();
```

查看 `examples/library-usage.ts` 和 `examples/structured-output-example.js` 文件获取更详细的示例。

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

# 从文件读取需求/提示
roo new --input-file path/to/requirements.txt

# 使用 OpenAI API
roo new "编写一个计算斐波那契数列的函数" --api-provider openai --openai-api-key your-api-key --openai-base-url https://api.openai.com/v1 --openai-model gpt-4

# 使用 OpenAI API 并启用流模式（某些模型如 Qwen 需要）
roo new "编写一个计算斐波那契数列的函数" --api-provider openai --openai-api-key your-api-key --openai-model qwen3-235b-a22b --stream-mode

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

# 设置日志级别 (debug=0, info=1, success=2, warn=3, error=4)
roo new "创建一个简单的 Node.js HTTP 服务器" --log-level debug
roo new "创建一个简单的 Node.js HTTP 服务器" --log-level 0

# 设置日志级别为 info（默认）
roo new "创建一个简单的 Node.js HTTP 服务器" --log-level info
roo new "创建一个简单的 Node.js HTTP 服务器" --log-level 1

# 设置日志级别为 error（最少输出）
roo new "创建一个简单的 Node.js HTTP 服务器" --log-level error
roo new "创建一个简单的 Node.js HTTP 服务器" --log-level 4

# 设置日志级别为 always（只显示 logger.always 输出）
roo new "创建一个简单的 Node.js HTTP 服务器" --log-level always
roo new "创建一个简单的 Node.js HTTP 服务器" --log-level 5

# 只输出最终结果（抑制中间输出）
roo new "创建一个简单的 Node.js HTTP 服务器" --continuous --only-final-output

# 与自动模式结合使用
roo new "创建一个简单的 Node.js HTTP 服务器" --continuous --auto --only-final-output
```

### 结构化输出

Roo CLI 提供结构化输出功能，允许您获取详细的执行信息，包括进度、步骤、日志和统计数据的 JSON 格式输出。这对于监控、分析和与其他系统集成特别有用。

#### 控制台输出模式

```bash
# 启用结构化输出到控制台
roo new "创建一个简单的计算器" --structured-output

# 结合连续执行模式
roo new "构建一个 Web 应用程序" --continuous --structured-output

# 在调试模式下查看实时更新
roo new "复杂任务" --structured-output --log-level debug
```

#### 文件输出模式

```bash
# 输出结构化数据到文件
roo new "创建一个 Node.js 项目" --structured-output ./output.json

# 连续执行模式配合文件输出
roo new "构建和测试应用程序" --continuous --structured-output ./execution-log.json

# 指定自定义文件路径
roo new "数据分析任务" --structured-output /path/to/results/analysis.json
```

#### 结构化输出格式

使用文件输出模式时，JSON 文件包含全面的执行信息：

```json
{
  "status": "completed",
  "completedTime": 1748109166390,
  "structured": {
    "task": {
      "id": "任务-uuid",
      "mode": "code",
      "cwd": "/工作目录",
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
          "text": "AI 响应内容...",
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
            "result": "文件创建成功",
            "success": true,
            "duration": 50
          }
        ],
        "output": "步骤输出内容..."
      }
    ],
    "logs": [
      {
        "timestamp": 1748109156158,
        "level": "progress",
        "message": "执行步骤 1/3",
        "stepNumber": 1
      }
    ],
    "finalOutput": "任务完成摘要...",
    "stats": {
      "totalToolCalls": 5,
      "totalTokensUsed": 1250,
      "averageStepTime": 8500
    }
  },
  "result": {
    "success": true,
    "taskId": "任务-uuid",
    "output": "最终任务输出..."
  }
}
```

#### 使用场景

- **监控**: 实时跟踪长时间运行任务的进度更新
- **分析**: 分析执行模式和性能指标
- **集成**: 将执行数据输入到其他系统或仪表板
- **调试**: 详细的逐步执行信息用于故障排除
- **报告**: 生成全面的执行报告

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
- **orchestrator**: 专门用于协调复杂工作流的模式，通过将任务委派给适当的专业模式来完成

你可以使用 `--mode` 选项在模式之间切换：

```bash
# 使用调试模式进行故障排除
roo new "修复我的 Express.js 服务器中的错误" --mode debug

# 使用测试模式编写测试
roo new "为我的身份验证模块编写单元测试" --mode test

# 使用编排器模式处理复杂工作流
roo new "构建一个完整的前后端Web应用程序" --mode orchestrator
```

### 模式特定设置

如果自定义模式配置中定义了当前模式的 `customInstructions` 和 `roleDefinition`，CLI 会自动使用它们作为默认值。这允许你定义模式特定的行为，而无需每次都指定它们。

这些设置的优先级顺序为：

1. 命令行参数（最高优先级）
2. 任务配置文件 (.rooTask)
3. 当前模式的设置（来自自定义模式）
4. 默认值（最低优先级）

## RAG（检索增强生成）功能

Roo CLI 包含先进的 RAG 功能，支持语义代码搜索和智能代码分析。系统支持内存和 Qdrant 向量存储，适用于不同的使用场景。

### 语义代码搜索

语义代码搜索工具允许您基于自然语言描述而不仅仅是关键词来查找代码：

```bash
# 搜索身份验证相关代码
roo tool semantic_code_search --params '{
  "path": "src",
  "query": "用户身份验证和登录功能",
  "top_k": 5
}'

# 搜索数据库操作
roo tool semantic_code_search --params '{
  "path": "backend",
  "query": "数据库查询和数据持久化",
  "file_pattern": "**/*.{js,ts,py}",
  "top_k": 3
}'

# 搜索错误处理模式
roo tool semantic_code_search --params '{
  "path": ".",
  "query": "错误处理和异常管理"
}'
```

### RAG 配置管理

Roo CLI 通过 `rag` 命令提供全面的 RAG 配置管理：

```bash
# 查看当前 RAG 配置
roo rag status

# 配置 Qdrant 向量存储
roo rag configure-qdrant \
  --url http://localhost:6333 \
  --collection my-project \
  --dimensions 1536 \
  --api-key your-api-key

# 配置内存向量存储
roo rag configure-memory --dimensions 256

# 启用/禁用 RAG 功能
roo rag enable
roo rag disable

# 验证当前配置
roo rag validate

# 重置为默认设置
roo rag reset

# 导出配置用于备份
roo rag export --file rag-config.json

# 从备份导入配置
roo rag import --file rag-config.json
```

### 向量存储选项

#### 内存向量存储

- **最适合**: 开发、测试、小型项目
- **优点**: 无外部依赖，快速设置
- **缺点**: 受可用内存限制，数据不持久

#### Qdrant 向量存储

- **最适合**: 生产环境、大型代码库、持久存储
- **优点**: 可扩展、持久化、高级搜索功能
- **缺点**: 需要设置 Qdrant 服务器

### RAG 配置文件

您可以在 `.rooSettings` 文件中配置 RAG 设置：

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

### 设置 Qdrant

要使用 Qdrant 向量存储，您需要运行 Qdrant 服务器：

```bash
# 使用 Docker
docker run -p 6333:6333 qdrant/qdrant

# 使用 Docker Compose
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

### 使用工具

```bash
# 列出可用工具
roo tools

# 列出特定模式中的可用工具
roo tools --mode code

# 执行工具
roo tool read_file --params '{"path": "src/index.js"}'

# 执行工具并使用调试日志级别（显示所有日志）
roo tool execute_command --params '{"command": "ls -la"}' --log-level debug

# 在特定目录中执行工具
roo tool list_files --params '{"path": ".", "recursive": "true"}' --cwd /path/to/directory

# 使用 info 日志级别执行工具（显示详细信息）
roo tool read_file --params '{"path": "src/index.js"}' --log-level info

# 使用 progress 日志级别执行工具（默认，显示关键进度）
roo tool read_file --params '{"path": "src/index.js"}' --log-level progress

# 使用 error 日志级别执行工具（最少输出）
roo tool read_file --params '{"path": "src/index.js"}' --log-level error
```

### 日志级别说明

Roo CLI 支持多种日志级别，帮助您控制输出的详细程度：

- **debug**: 显示所有日志信息，包括调试细节
- **progress** (默认): 显示关键的任务执行进度和状态（包含所有 info 级别消息）
- **info**: 显示详细的信息日志，包括技术细节
- **success**: 只显示成功消息
- **warn**: 只显示警告和更高级别的消息
- **error**: 只显示错误消息
- **always**: 显示标记为始终可见的消息

**推荐使用**：

- 日常使用：`progress` (默认) - 获得清晰的进度概览，包含所有重要信息
- 简化输出：`info` - 只显示技术细节，不显示进度信息
- 调试问题：`debug` - 查看最完整的执行细节
- 自动化脚本：`error` - 只关注错误消息

```bash
# 使用默认的 progress 级别
roo new "创建一个 React 组件"

# 只显示技术细节（不显示进度信息）
roo new "创建一个 React 组件" --log-level info

# 查看最详细的执行过程
roo new "创建一个 React 组件" --log-level debug

# 只显示错误（适合脚本使用）
roo new "创建一个 React 组件" --log-level error
```

### MCP 服务器

MCP（模型上下文协议）服务器允许外部客户端使用 MCP 协议控制 Roo CLI。

```bash

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

- `GET /`: API 信息和文档
- `GET /health`: 带有服务器状态的健康检查
- `POST /api/task`: 执行任务
- `GET /api/config`: 获取当前配置
- `POST /api/config/api`: 更新 API 配置
- `POST /api/config/settings`: 更新全局设置
- `POST /api/config/modes`: 更新自定义模式
- `POST /api/config/mode`: 设置当前模式
- `GET /api/tools`: 获取可用工具
- `GET /api/rag/status`: 获取 RAG 配置状态
- `POST /api/rag/configure`: 更新 RAG 配置
- `POST /api/rag/search`: 执行语义代码搜索

服务器现在支持 CORS，允许来自 Web 应用程序的跨域请求。它还提供详细的错误处理和日志记录，以便更好地进行调试。

### 示例：执行任务

```bash
# 基本任务执行
curl -X POST http://localhost:3000/api/task \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "编写一个计算斐波那契数列的函数",
    "mode": "code"
  }'

# 带结构化输出的任务执行
curl -X POST http://localhost:3000/api/task \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "创建一个 Web 应用程序",
    "mode": "code",
    "continuous": true,
    "structuredOutput": true
  }'

# 带文件输出的任务执行
curl -X POST http://localhost:3000/api/task \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "构建和测试应用程序",
    "mode": "code",
    "continuous": true,
    "structuredOutput": "./api-execution-log.json"
  }'
```

## 环境变量

你可以使用 `.env` 文件来配置 CLI：

```env
# API 配置
ANTHROPIC_API_KEY=your-api-key
ANTHROPIC_MODEL_ID=claude-3-5-sonnet-20241022

OPENAI_API_KEY=your-api-key
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL_ID=gpt-4

# 服务器配置
PORT=3000                           # API 和 MCP SSE 服务器的端口

# RAG 配置
QDRANT_URL=http://localhost:6333     # Qdrant 服务器 URL
QDRANT_API_KEY=your-qdrant-api-key   # Qdrant API 密钥（可选）
QDRANT_COLLECTION=roo-code           # 默认集合名称

# 用于 Docker
WORKSPACE_PATH=/path/to/your/workspace
```

使用 Docker 时，你可以直接将环境变量传递给 docker-compose：

```bash
OPENAI_API_KEY=your-api-key WORKSPACE_PATH=/path/to/workspace docker-compose run --rm roo-cli new "你的提示"
```
