# Roo CLI 测试脚本

这个目录包含了 roo-cli 所有功能的测试脚本，每个功能都有对应的独立测试脚本。

## 文件结构

```
test-scripts/
├── env-config.sh           # 环境配置和通用函数
├── run-all-tests.sh        # 运行所有测试的主脚本
├── test-new.sh            # 测试 roo new 命令
├── test-tools.sh          # 测试 roo tools 和 roo tool 命令
├── test-mcp.sh            # 测试 roo mcp-stdio 和 roo mcp-sse 命令
├── test-server.sh         # 测试 roo server 命令
├── test-rag.sh            # 测试 roo rag 命令
├── test-share.sh          # 测试 roo share 命令
├── test-import-settings.sh # 测试 roo import-settings 命令
├── test-docker.sh         # 测试 Docker 相关功能
└── README.md              # 本文件
```

## 快速开始

### 1. 配置环境

在运行测试之前，请确保：

1. 已安装依赖：`pnpm install`
2. 已构建项目：`pnpm build`
3. 配置了 API 密钥（编辑 `env-config.sh` 中的环境变量）

### 2. 运行所有测试

```bash
# 运行所有测试
./test-scripts/run-all-tests.sh

# 或者使用相对路径
cd test-scripts
./run-all-tests.sh
```

### 3. 运行特定测试

```bash
# 只运行 new 命令测试
./test-scripts/run-all-tests.sh test-new

# 运行多个特定测试
./test-scripts/run-all-tests.sh test-new test-tools test-mcp

# 跳过 Docker 测试
./test-scripts/run-all-tests.sh --skip-docker

# 快速失败模式（遇到第一个失败就停止）
./test-scripts/run-all-tests.sh --fail-fast
```

### 4. 运行单个测试脚本

```bash
# 直接运行单个测试脚本（运行所有测试方法）
./test-scripts/test-new.sh
./test-scripts/test-tools.sh
./test-scripts/test-mcp.sh
```

### 5. 运行特定测试方法

每个测试脚本都支持运行特定的测试方法：

```bash
# 查看测试脚本的帮助信息
./test-scripts/test-new.sh --help

# 列出所有可用的测试方法
./test-scripts/test-new.sh --list

# 运行特定的测试方法
./test-scripts/test-new.sh test_basic_new

# 运行多个特定的测试方法
./test-scripts/test-tools.sh test_list_tools test_read_file_tool

# 运行 MCP 相关的特定测试
./test-scripts/test-mcp.sh test_mcp_stdio_startup test_mcp_sse_startup
```

## 测试方法参数控制

每个测试脚本都支持通过参数控制执行特定的测试方法：

### 通用参数

所有测试脚本都支持以下参数：

- `--help` 或 `-h`: 显示帮助信息和可用的测试方法
- `--list` 或 `-l`: 列出所有可用的测试方法
- `test_方法名`: 运行指定的测试方法（可指定多个）

### 使用示例

```bash
# 查看 test-new.sh 的帮助信息
./test-scripts/test-new.sh --help

# 列出 test-tools.sh 的所有测试方法
./test-scripts/test-tools.sh --list

# 只运行基本的 new 命令测试
./test-scripts/test-new.sh test_basic_new

# 运行多个特定的测试方法
./test-scripts/test-tools.sh test_list_tools test_read_file_tool test_write_to_file_tool

# 运行 RAG 相关的特定测试
./test-scripts/test-rag.sh test_rag_status test_rag_configure_memory
```

## 测试脚本说明

### test-new.sh

测试 `roo new` 命令的各种功能：

- 基本的 new 命令
- 不同模式（code, ask, debug）
- 输入文件支持
- 结构化输出
- 流模式

**可用的测试方法：**
- `test_basic_new`: 基本的 new 命令测试
- `test_different_modes`: 不同模式测试
- `test_input_file`: 输入文件测试
- `test_structured_output`: 结构化输出测试
- `test_stream_mode`: 流模式测试

### test-tools.sh

测试 `roo tools` 和 `roo tool` 命令：

- 列出所有工具
- 列出特定模式的工具
- 执行各种工具（read_file, write_to_file, list_files 等）
- 工作目录参数

**可用的测试方法：**
- `test_list_tools`: 列出所有工具测试
- `test_list_tools_by_mode`: 列出特定模式工具测试
- `test_read_file_tool`: read_file 工具测试
- `test_list_files_tool`: list_files 工具测试
- `test_write_to_file_tool`: write_to_file 工具测试
- `test_execute_command_tool`: execute_command 工具测试
- `test_search_files_tool`: search_files 工具测试
- `test_tool_with_cwd`: 工作目录参数测试

### test-mcp.sh

测试 MCP 服务器功能：

- MCP stdio 服务器启动
- MCP SSE 服务器启动
- 配置文件支持
- 端点访问测试
- 参数验证

**可用的测试方法：**
- `test_mcp_stdio_startup`: MCP stdio 服务器启动测试
- `test_mcp_sse_startup`: MCP SSE 服务器启动测试
- `test_mcp_stdio_with_config`: MCP stdio 服务器配置文件测试
- `test_mcp_sse_endpoints`: MCP SSE 服务器端点测试
- `test_mcp_parameter_validation`: MCP 服务器参数验证测试

### test-server.sh

测试 `roo server` 命令：

- 基本服务器启动
- 端点测试（健康检查、API 等）
- 配置文件支持
- 端口冲突处理
- API 功能测试

**可用的测试方法：**
- `test_basic_server_startup`: 基本服务器启动测试
- `test_server_endpoints`: 服务器端点测试
- `test_server_with_config`: 服务器配置文件测试
- `test_server_port_conflict`: 服务器端口冲突测试
- `test_server_parameter_validation`: 服务器参数验证测试
- `test_server_api_functionality`: 服务器 API 功能测试

### test-rag.sh

测试 `roo rag` 命令：

- RAG 状态查看
- 配置验证
- 内存向量存储配置
- Qdrant 向量存储配置
- 启用/禁用 RAG
- 配置导入/导出

**可用的测试方法：**
- `test_rag_status`: RAG 状态查看测试
- `test_rag_validate`: RAG 配置验证测试
- `test_rag_configure_memory`: 配置内存向量存储测试
- `test_rag_enable_disable`: 启用/禁用 RAG 测试
- `test_rag_export`: RAG 配置导出测试
- `test_rag_import`: RAG 配置导入测试
- `test_rag_configure_qdrant`: 配置 Qdrant 向量存储测试
- `test_rag_reset`: RAG 重置测试
- `test_rag_export_stdout`: RAG 配置导出到标准输出测试
- `test_rag_parameter_validation`: RAG 命令参数验证测试

### test-share.sh
测试 `roo share` 命令：
- 基本分享功能
- 不同可见性级别
- 分享列表
- 获取分享详情
- 参数验证

### test-import-settings.sh
测试 `roo import-settings` 命令：
- 基本设置导入
- 不同作用域（global, project, both）
- 合并模式
- 干运行模式
- YAML 格式支持

### test-docker.sh
测试 Docker 相关功能：
- Docker 镜像构建
- Docker Compose 运行
- Docker 脚本测试
- 环境变量支持
- 工作区挂载
- MCP 服务器 Docker 部署

## 环境配置

### API 配置
编辑 `env-config.sh` 文件中的以下变量：

```bash
export OPENAI_BASE_URL="your-openai-base-url"
export OPENAI_API_KEY="your-openai-api-key"
export OPENAI_MODEL_ID="your-model-id"

# 可选的 Anthropic 配置
# export ANTHROPIC_API_KEY="your-anthropic-api-key"
# export ANTHROPIC_MODEL_ID="claude-3-5-sonnet-20241022"
```

### 其他配置
```bash
export LOG_LEVEL="INFO"           # 日志级别
export WORKSPACE_PATH="./playground"  # 工作区路径
```

## 测试结果

测试脚本会输出彩色的结果：
- 🟢 绿色：测试通过
- 🟡 黄色：警告（通常是预期的失败或跳过的测试）
- 🔴 红色：测试失败

### 示例输出
```
[INFO] 开始测试 roo new 命令...
[INFO] 测试 1: 基本的 new 命令
[SUCCESS] 基本 new 命令测试通过
[INFO] 测试 2: 使用不同模式
[SUCCESS] 不同模式测试通过
...
[SUCCESS] 所有 roo new 命令测试通过！
```

## 故障排除

### 常见问题

1. **构建失败**
   ```bash
   pnpm build
   ```

2. **API 密钥错误**
   - 检查 `env-config.sh` 中的 API 配置
   - 确保 API 密钥有效且有足够的配额

3. **Docker 测试失败**
   - 确保 Docker 已安装并运行
   - 检查 Docker Compose 配置

4. **端口冲突**
   - 确保测试使用的端口（3001-3010）没有被其他服务占用

### 调试模式

如果需要更详细的输出，可以：

1. 设置更详细的日志级别：
   ```bash
   export LOG_LEVEL="DEBUG"
   ```

2. 直接运行单个测试脚本查看详细输出

3. 检查临时文件（通常在 `/tmp/` 目录下）

## 贡献

如果添加了新的 roo-cli 功能，请：

1. 创建对应的测试脚本 `test-新功能.sh`
2. 在 `run-all-tests.sh` 的 `TESTS` 数组中添加新脚本
3. 更新本 README 文件

## 注意事项

- 某些测试可能需要外部服务（如 Qdrant）才能完全通过
- Docker 测试需要 Docker 环境
- 某些测试会创建临时文件，测试完成后会自动清理
- 测试脚本设计为幂等的，可以重复运行
