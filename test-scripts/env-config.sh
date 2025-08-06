#!/bin/bash

# 环境变量配置文件
# 用于所有测试脚本的通用配置

# API 配置
export OPENAI_BASE_URL="https://dashscope.aliyuncs.com/compatible-mode/v1"
export OPENAI_API_KEY="your-openai-api-key"
export OPENAI_MODEL_ID="qwen3-235b-a22b"

# 备用 API 配置
# export ANTHROPIC_API_KEY="your-anthropic-api-key"
# export ANTHROPIC_MODEL_ID="claude-3-5-sonnet-20241022"

# 通用配置
export LOG_LEVEL="INFO"
export WORKSPACE_PATH="./playground"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查构建状态
check_build() {
    if [ ! -f "./dist/index.js" ]; then
        log_warning "dist/index.js not found, building..."
        npm run build
        if [ $? -ne 0 ]; then
            log_error "Build failed"
            exit 1
        fi
    fi
}

# 运行 roo 命令的通用函数
run_roo() {
    check_build
    node ./dist/index.js "$@"
}
