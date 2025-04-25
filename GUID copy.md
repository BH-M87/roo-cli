Roo CLI 使用文档
目录
简介
安装
本地安装
Docker 安装
基本使用
创建新任务
连续执行模式
使用不同模式
工具使用
查看可用工具
执行工具
MCP 服务器
启动 MCP 服务器
MCP Stdio 服务器
Docker 运行
使用 npm/pnpm 脚本
使用 docker-compose
使用独立 Docker
配置
API 提供者配置
全局设置
自定义模式
高级功能
角色定义
自定义指令
简介
Roo CLI 是 RooCode 的命令行界面，允许你从终端执行 AI 任务。它提供了丰富的功能，包括创建新任务、使用各种工具、启动 MCP 服务器等。

安装
本地安装

# 安装依赖

pnpm install

# 构建 CLI

pnpm build

# 全局链接 CLI（可选）

pnpm link
Docker 安装
你也可以使用 Docker 运行 Roo CLI：

# 克隆仓库

git clone https://github.com/your-username/your-repository.git
cd your-repository/cli

# 构建 Docker 镜像

docker-compose build

基本使用
创建新任务
创建新任务是 Roo CLI 的核心功能，你可以通过 new 命令创建新任务：

# 基本用法

roo new "编写一个计算斐波那契数列的函数"

# 指定模式

roo new "编写一个计算斐波那契数列的函数" --mode code

# 指定工作区目录

roo new "编写一个计算斐波那契数列的函数" --workspace /path/to/project

# 使用自定义配置文件

roo new "编写一个计算斐波那契数列的函数" --config-file path/to/config.json

API 提供者选项
你可以指定使用 OpenAI 或 Anthropic 的 API：

# 使用 OpenAI API

roo new "编写一个计算斐波那契数列的函数" --api-provider openai --openai-api-key your-api-key --openai-base-url https://api.openai.com/v1 --openai-model gpt-4

# 使用 Anthropic API

roo new "编写一个计算斐波那契数列的函数" --api-provider anthropic --anthropic-api-key your-api-key --anthropic-model claude-3-5-sonnet-20241022
连续执行模式
连续执行模式允许 AI 自动执行多个步骤以完成任务，而无需在每一步之间进行用户干预：

# 启用连续执行模式

roo new "创建一个简单的 Node.js HTTP 服务器" --continuous

# 指定最大步骤数

roo new "创建一个简单的 Node.js HTTP 服务器" --continuous --max-steps 5

# 启用自动模式（自动批准工具使用）

roo new "创建一个简单的 Node.js HTTP 服务器" --auto

# 结合自动模式和连续执行模式

roo new "创建一个简单的 Node.js HTTP 服务器" --auto --continuous
使用不同模式
Roo CLI 提供了几种内置模式，适用于不同类型的任务：

code: 用于一般编码任务的默认模式
ask: 用于回答问题和提供信息的模式
test: 专门用于编写和维护测试套件的模式
debug: 专门用于分析和修复代码问题的模式

# 使用调试模式进行故障排除

roo new "修复我的 Express.js 服务器中的错误" --mode debug

# 使用测试模式编写测试

roo new "为我的身份验证模块编写单元测试" --mode test

工具使用
查看可用工具
你可以使用 tools 命令查看可用的工具：

# 列出所有可用工具

roo tools

# 列出特定模式中的可用工具

roo tools --mode code
执行工具
你可以使用 tool 命令直接执行工具：

# 执行读取文件工具

roo tool read_file --params '{"path": "src/index.js"}'

# 执行命令工具并显示详细输出

roo tool execute_command --params '{"command": "ls -la"}' --verbose

# 在特定目录中执行列出文件工具

roo tool list_files --params '{"path": ".", "recursive": "true"}' --cwd /path/to/directory

常用工具列表
read_file: 读取文件内容
write_to_file: 写入内容到文件
list_files: 列出目录中的文件
execute_command: 在终端执行命令
search_files: 搜索包含特定正则表达式的文件
browser_action: 执行浏览器操作
list_code_definition_names: 列出代码定义
switch_mode: 切换到不同的模式
new_task: 创建新任务
diff_files: 比较两个文件并显示差异
insert_content: 在特定位置插入内容到文件
MCP 服务器
MCP（模型上下文协议）服务器允许外部客户端使用 MCP 协议控制 Roo CLI。

启动 MCP 服务器

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

MCP Stdio 服务器
MCP stdio 服务器允许其他服务通过标准输入/输出流使用 MCP 协议连接到 Roo CLI：

# 启动 MCP stdio 服务器

roo mcp-stdio

# 使用特定提供者配置启动

roo mcp-stdio --api-provider anthropic --anthropic-api-key your-api-key

# 使用自定义配置文件

roo mcp-stdio --provider-file path/to/provider.json --settings-file path/to/settings.json
Docker 运行
使用 npm/pnpm 脚本
你可以使用 package.json 中定义的 npm/pnpm 脚本来快速访问 Docker 命令：

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
使用 docker-compose
你可以使用提供的脚本来通过 docker-compose 运行 Roo CLI：

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
你也可以直接使用 docker-compose：

# 运行命令

docker-compose run --rm roo-cli new "编写一个函数" --mode code

# 挂载特定工作区目录

WORKSPACE_PATH=/path/to/your/workspace docker-compose run --rm roo-cli new "创建一个 Node.js 服务器"
使用独立 Docker

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
如果你不想使用 docker-compose，可以使用独立 Docker 脚本：

使用环境变量
你可以使用环境变量来配置 Docker 运行：

# 使用 OpenAI API

WORKSPACE_PATH="./playground" OPENAI_API_KEY="sk-your-api-key" OPENAI_BASE_URL="https://api.example.com/v1" OPENAI_MODEL_ID="gpt-4o" ./docker-run.sh new "创建一个 Node.js 服务器"

# 使用 Anthropic API

ANTHROPIC_API_KEY="sk-ant-your-api-key" ANTHROPIC_MODEL_ID="claude-3-opus-20240229" ./docker-run.sh new "创建一个 Node.js 服务器"
配置
API 提供者配置
Roo CLI 支持多种 API 提供者，包括 OpenAI 和 Anthropic。默认配置文件位于 .rooProviderProfiles，包含以下内容：
{
"currentApiConfigName": "anthropic",
"apiConfigs": {
"anthropic": {
"apiProvider": "anthropic",
"anthropicApiKey": "",
"anthropicModelId": "claude-3-5-sonnet-20241022",
"id": "anthropic"
},
"openai": {
"apiProvider": "openai",
"openAiApiKey": "",
"openAiBaseUrl": "https://api.openai.com/v1",
"openAiModelId": "gpt-4",
"id": "openai"
}
}
}
全局设置
全局设置文件位于 .rooSettings，包含以下内容：
{
"autoApprovalEnabled": true,
"alwaysAllowReadOnly": true,
"alwaysAllowReadOnlyOutsideWorkspace": false,
"alwaysAllowWrite": true,
"alwaysAllowWriteOutsideWorkspace": false,
"alwaysAllowBrowser": true,
"alwaysApproveResubmit": true,
"alwaysAllowMcp": true,
"alwaysAllowModeSwitch": true,
"alwaysAllowSubtasks": true,
"alwaysAllowExecute": true,
"allowedCommands": ["npm test", "npm install", "tsc", "git log", "git diff", "git show"],
"browserToolEnabled": true,
"ttsEnabled": false,
"ttsSpeed": 1,
"soundEnabled": false,
"soundVolume": 0.5,
"language": "zh",
"telemetrySetting": "enabled"
}
自定义模式
你可以在全局设置中定义自定义模式，每个模式可以有自己的角色定义和自定义指令：
{
"customModes": [
{
"slug": "test",
"name": "测试",
"description": "专门用于编写和维护测试套件的模式",
"roleDefinition": "你是一位专注于测试的开发者，擅长编写单元测试、集成测试和端到端测试。",
"customInstructions": "请帮助用户编写高质量的测试代码，确保代码覆盖率高且测试用例全面。"
},
{
"slug": "debug",
"name": "调试",
"description": "专门用于分析和修复代码问题的模式",
"roleDefinition": "你是一位经验丰富的调试专家，擅长分析和修复各种代码问题。",
"customInstructions": "请帮助用户诊断和修复代码中的问题，包括静态代码问题、编译错误和运行时异常。"
}
]
}
高级功能
角色定义
你可以使用 --role-definition 选项为任务指定自定义角色定义：

# 添加自定义角色定义

roo new "创建一个简单的 Node.js HTTP 服务器" --role-definition "你是一位拥有 10 年经验的 Node.js 开发专家。"
自定义指令
你可以使用 --custom-instructions 选项为任务指定自定义指令：

# 添加自定义指令

roo new "创建一个简单的 Node.js HTTP 服务器" --custom-instructions "请确保代码遵循最佳实践，并包含详细的注释。"
模式特定设置
如果自定义模式配置中定义了当前模式的 customInstructions 和 roleDefinition，CLI 会自动使用它们作为默认值。这允许你定义模式特定的行为，而无需每次都指定它们。

这些设置的优先级顺序为：

命令行参数（最高优先级）
任务配置文件 (.rooTask)
当前模式的设置（来自自定义模式）
默认值（最低优先级）
以上就是 Roo CLI 的基本使用文档。通过这些命令和选项，你可以充分利用 Roo CLI 的功能，提高开发效率。如果需要更多帮助，可以使用 roo --help 或 roo <command> --help 查看详细的帮助信息。
