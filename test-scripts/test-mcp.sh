#!/bin/bash

# 测试 roo mcp-stdio 和 roo mcp-sse 命令的各种功能

# 加载环境配置
source "$(dirname "$0")/env-config.sh"

# 加载测试框架
source "$(dirname "$0")/test-framework.sh"

log_info "开始测试 roo MCP 服务器命令..."

# 测试 1: MCP stdio 服务器启动测试
test_mcp_stdio_startup() {
    log_info "测试 1: MCP stdio 服务器启动测试"

    # 启动 MCP stdio 服务器（后台运行）
    timeout 10s run_roo mcp-stdio \
        --api-provider openai \
        --openai-api-key "$OPENAI_API_KEY" \
        --openai-base-url "$OPENAI_BASE_URL" \
        --openai-model "$OPENAI_MODEL_ID" &

    local mcp_pid=$!
    sleep 3

    # 检查进程是否还在运行
    if kill -0 $mcp_pid 2>/dev/null; then
        log_success "MCP stdio 服务器启动成功"
        kill $mcp_pid 2>/dev/null
        wait $mcp_pid 2>/dev/null
    else
        log_error "MCP stdio 服务器启动失败"
        return 1
    fi
}

# 测试 2: MCP SSE 服务器启动测试
test_mcp_sse_startup() {
    log_info "测试 2: MCP SSE 服务器启动测试"

    local test_port=3001

    # 启动 MCP SSE 服务器（后台运行）
    timeout 10s run_roo mcp-sse \
        --port $test_port \
        --api-provider openai \
        --openai-api-key "$OPENAI_API_KEY" \
        --openai-base-url "$OPENAI_BASE_URL" \
        --openai-model "$OPENAI_MODEL_ID" &

    local mcp_pid=$!
    sleep 5

    # 检查进程是否还在运行
    if kill -0 $mcp_pid 2>/dev/null; then
        # 尝试访问健康检查端点
        if command -v curl >/dev/null 2>&1; then
            if curl -s "http://localhost:$test_port/health" >/dev/null; then
                log_success "MCP SSE 服务器启动成功并可访问"
            else
                log_warning "MCP SSE 服务器启动但健康检查失败"
            fi
        else
            log_success "MCP SSE 服务器启动成功（无法测试 HTTP 访问，curl 不可用）"
        fi

        kill $mcp_pid 2>/dev/null
        wait $mcp_pid 2>/dev/null
    else
        log_error "MCP SSE 服务器启动失败"
        return 1
    fi
}

# 测试 3: MCP stdio 服务器配置文件测试
test_mcp_stdio_with_config() {
    log_info "测试 3: MCP stdio 服务器配置文件测试"

    # 创建临时配置文件
    local provider_file="/tmp/test-provider.json"
    cat >"$provider_file" <<EOF
{
  "profiles": [
    {
      "id": "test-openai",
      "apiProvider": "openai",
      "openaiApiKey": "$OPENAI_API_KEY",
      "openaiBaseUrl": "$OPENAI_BASE_URL",
      "openaiModelId": "$OPENAI_MODEL_ID"
    }
  ]
}
EOF

    # 启动 MCP stdio 服务器（后台运行）
    timeout 10s run_roo mcp-stdio \
        --provider-file "$provider_file" &

    local mcp_pid=$!
    sleep 3

    # 检查进程是否还在运行
    if kill -0 $mcp_pid 2>/dev/null; then
        log_success "MCP stdio 服务器配置文件测试通过"
        kill $mcp_pid 2>/dev/null
        wait $mcp_pid 2>/dev/null
    else
        log_error "MCP stdio 服务器配置文件测试失败"
        rm -f "$provider_file"
        return 1
    fi

    rm -f "$provider_file"
}

# 测试 4: MCP SSE 服务器端点测试
test_mcp_sse_endpoints() {
    log_info "测试 4: MCP SSE 服务器端点测试"

    if ! command -v curl >/dev/null 2>&1; then
        log_warning "跳过端点测试：curl 不可用"
        return 0
    fi

    local test_port=3002

    # 启动 MCP SSE 服务器（后台运行）
    timeout 15s run_roo mcp-sse \
        --port $test_port \
        --api-provider openai \
        --openai-api-key "$OPENAI_API_KEY" \
        --openai-base-url "$OPENAI_BASE_URL" \
        --openai-model "$OPENAI_MODEL_ID" &

    local mcp_pid=$!
    sleep 5

    if kill -0 $mcp_pid 2>/dev/null; then
        # 测试根端点
        if curl -s "http://localhost:$test_port/" >/dev/null; then
            log_success "根端点可访问"
        else
            log_warning "根端点不可访问"
        fi

        # 测试健康检查端点
        if curl -s "http://localhost:$test_port/health" >/dev/null; then
            log_success "健康检查端点可访问"
        else
            log_warning "健康检查端点不可访问"
        fi

        # 测试工具端点
        if curl -s "http://localhost:$test_port/tools" >/dev/null; then
            log_success "工具端点可访问"
        else
            log_warning "工具端点不可访问"
        fi

        kill $mcp_pid 2>/dev/null
        wait $mcp_pid 2>/dev/null
        log_success "MCP SSE 服务器端点测试完成"
    else
        log_error "MCP SSE 服务器启动失败，无法测试端点"
        return 1
    fi
}

# 测试 5: MCP 服务器参数验证
test_mcp_parameter_validation() {
    log_info "测试 5: MCP 服务器参数验证"

    # 测试无效端口
    log_info "  测试无效端口"
    timeout 5s run_roo mcp-sse --port invalid 2>/dev/null
    if [ $? -ne 0 ]; then
        log_success "无效端口参数正确被拒绝"
    else
        log_error "无效端口参数未被正确验证"
        return 1
    fi

    # 测试缺少 API 配置
    log_info "  测试缺少 API 配置"
    timeout 5s run_roo mcp-stdio 2>/dev/null
    # 这个测试可能会成功（使用默认配置），所以我们只记录结果
    if [ $? -eq 0 ]; then
        log_info "MCP stdio 使用默认配置启动"
    else
        log_info "MCP stdio 需要显式配置"
    fi

    log_success "MCP 服务器参数验证测试完成"
}

# 测试方法定义
TEST_METHODS=(
    "test_mcp_stdio_startup:MCP stdio 服务器启动测试"
    "test_mcp_sse_startup:MCP SSE 服务器启动测试"
    "test_mcp_stdio_with_config:MCP stdio 服务器配置文件测试"
    "test_mcp_sse_endpoints:MCP SSE 服务器端点测试"
    "test_mcp_parameter_validation:MCP 服务器参数验证测试"
)

# 显示帮助信息
show_help() {
    generate_help "$0" "${TEST_METHODS[@]}"
}

# 列出所有测试方法
list_tests() {
    generate_test_list "${TEST_METHODS[@]}"
}

# 运行所有测试
run_all_tests() {
    log_info "=== roo MCP 服务器命令测试套件 ==="

    test_mcp_stdio_startup || exit 1
    echo

    test_mcp_sse_startup || exit 1
    echo

    test_mcp_stdio_with_config || exit 1
    echo

    test_mcp_sse_endpoints || exit 1
    echo

    test_mcp_parameter_validation || exit 1
    echo

    log_success "所有 roo MCP 服务器命令测试通过！"
}

# 主函数
main() {
    run_test_framework "roo MCP 服务器命令" "run_all_tests" "show_help" "list_tests" "$@"
}

# 如果直接运行此脚本
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
