#!/bin/bash

# 设置默认值
WORKSPACE_PATH=${WORKSPACE_PATH:-$(pwd)/workspace}
PORT=${PORT:-3000}

# 创建工作区目录（如果不存在）
mkdir -p "$WORKSPACE_PATH"

# 设置环境变量
export WORKSPACE_PATH
export OPENAI_API_KEY=${OPENAI_API_KEY:-""}
export OPENAI_BASE_URL=${OPENAI_BASE_URL:-""}
export OPENAI_MODEL_ID=${OPENAI_MODEL_ID:-""}
export ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY:-""}
export ANTHROPIC_MODEL_ID=${ANTHROPIC_MODEL_ID:-""}

# 构建 Docker 镜像
echo "Building Docker image..."
docker-compose build

# 启动 MCP 服务器
echo "Starting MCP server on port $PORT..."
echo "Using workspace: $WORKSPACE_PATH"
echo "OpenAI API Key: ${OPENAI_API_KEY:0:5}..."
echo "OpenAI Base URL: $OPENAI_BASE_URL"
if [ -n "$OPENAI_MODEL_ID" ]; then
  echo "OpenAI Model ID: $OPENAI_MODEL_ID"
fi
if [ -n "$ANTHROPIC_API_KEY" ]; then
  echo "Anthropic API Key: ${ANTHROPIC_API_KEY:0:5}..."
fi
if [ -n "$ANTHROPIC_MODEL_ID" ]; then
  echo "Anthropic Model ID: $ANTHROPIC_MODEL_ID"
fi

# 添加调试命令，在容器内部打印环境变量
docker-compose run --rm roo-cli bash -c 'echo "OPENAI_API_KEY in container: $OPENAI_API_KEY"; echo "OPENAI_BASE_URL in container: $OPENAI_BASE_URL"; echo "OPENAI_MODEL_ID in container: $OPENAI_MODEL_ID"; echo "ANTHROPIC_API_KEY in container: $ANTHROPIC_API_KEY"; echo "ANTHROPIC_MODEL_ID in container: $ANTHROPIC_MODEL_ID"'

# 启动 MCP 服务器
docker-compose run -p $PORT:$PORT --rm roo-cli mcp-start --port $PORT
