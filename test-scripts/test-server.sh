#!/bin/bash

# 测试 roo server 命令的各种功能

# 加载环境配置
source "$(dirname "$0")/env-config.sh"

# 加载测试框架
source "$(dirname "$0")/test-framework.sh"

log_info "开始测试 roo server 命令..."

# 测试 1: 基本服务器启动
test_basic_server_startup() {
    log_info "测试 1: 基本服务器启动"

    local test_port=3003

    # 启动服务器（后台运行）
    timeout 10s run_roo server --port $test_port &

    local server_pid=$!
    sleep 5

    # 检查进程是否还在运行
    if kill -0 $server_pid 2>/dev/null; then
        log_success "服务器启动成功"
        kill $server_pid 2>/dev/null
        wait $server_pid 2>/dev/null
    else
        log_error "服务器启动失败"
        return 1
    fi
}

# 测试 2: 服务器端点测试
test_server_endpoints() {
    log_info "测试 2: 服务器端点测试"

    if ! command -v curl >/dev/null 2>&1; then
        log_warning "跳过端点测试：curl 不可用"
        return 0
    fi

    local test_port=3004

    # 启动服务器（后台运行）
    timeout 15s run_roo server --port $test_port &

    local server_pid=$!
    sleep 5

    if kill -0 $server_pid 2>/dev/null; then
        # 测试根端点
        log_info "  测试根端点"
        if curl -s "http://localhost:$test_port/" >/dev/null; then
            log_success "根端点可访问"
        else
            log_warning "根端点不可访问"
        fi

        # 测试健康检查端点
        log_info "  测试健康检查端点"
        if curl -s "http://localhost:$test_port/health" >/dev/null; then
            log_success "健康检查端点可访问"
        else
            log_warning "健康检查端点不可访问"
        fi

        # 测试 API 工具端点
        log_info "  测试 API 工具端点"
        if curl -s "http://localhost:$test_port/api/tools" >/dev/null; then
            log_success "API 工具端点可访问"
        else
            log_warning "API 工具端点不可访问"
        fi

        kill $server_pid 2>/dev/null
        wait $server_pid 2>/dev/null
        log_success "服务器端点测试完成"
    else
        log_error "服务器启动失败，无法测试端点"
        return 1
    fi
}

# 测试 3: 服务器配置文件测试
test_server_with_config() {
    log_info "测试 3: 服务器配置文件测试"

    # 创建临时配置文件
    local provider_file="/tmp/test-server-provider.json"
    local settings_file="/tmp/test-server-settings.json"

    cat >"$provider_file" <<EOF
{
  "profiles": [
    {
      "id": "test-server",
      "apiProvider": "openai",
      "openaiApiKey": "$OPENAI_API_KEY",
      "openaiBaseUrl": "$OPENAI_BASE_URL",
      "openaiModelId": "$OPENAI_MODEL_ID"
    }
  ]
}
EOF

    cat >"$settings_file" <<EOF
{
  "defaultMode": "code",
  "logLevel": "info",
  "rag": {
    "enabled": false
  }
}
EOF

    local test_port=3005

    # 启动服务器（后台运行）
    timeout 10s run_roo server \
        --port $test_port \
        --provider-file "$provider_file" \
        --settings-file "$settings_file" &

    local server_pid=$!
    sleep 5

    # 检查进程是否还在运行
    if kill -0 $server_pid 2>/dev/null; then
        log_success "服务器配置文件测试通过"
        kill $server_pid 2>/dev/null
        wait $server_pid 2>/dev/null
    else
        log_error "服务器配置文件测试失败"
        rm -f "$provider_file" "$settings_file"
        return 1
    fi

    rm -f "$provider_file" "$settings_file"
}

# 测试 4: 服务器端口冲突测试
test_server_port_conflict() {
    log_info "测试 4: 服务器端口冲突测试"

    local test_port=3006

    # 启动第一个服务器
    timeout 15s run_roo server --port $test_port &
    local server1_pid=$!
    sleep 3

    if kill -0 $server1_pid 2>/dev/null; then
        # 尝试启动第二个服务器在同一端口
        timeout 5s run_roo server --port $test_port 2>/dev/null &
        local server2_pid=$!
        sleep 2

        # 第二个服务器应该失败
        if ! kill -0 $server2_pid 2>/dev/null; then
            log_success "端口冲突正确处理"
        else
            log_error "端口冲突未正确处理"
            kill $server2_pid 2>/dev/null
            kill $server1_pid 2>/dev/null
            wait $server1_pid $server2_pid 2>/dev/null
            return 1
        fi

        kill $server1_pid 2>/dev/null
        wait $server1_pid 2>/dev/null
    else
        log_error "第一个服务器启动失败"
        return 1
    fi
}

# 测试 5: 服务器参数验证
test_server_parameter_validation() {
    log_info "测试 5: 服务器参数验证"

    # 测试无效端口
    log_info "  测试无效端口"
    timeout 5s run_roo server --port invalid 2>/dev/null
    if [ $? -ne 0 ]; then
        log_success "无效端口参数正确被拒绝"
    else
        log_error "无效端口参数未被正确验证"
        return 1
    fi

    # 测试端口范围
    log_info "  测试端口范围"
    timeout 5s run_roo server --port 99999 2>/dev/null
    if [ $? -ne 0 ]; then
        log_success "超出范围的端口正确被拒绝"
    else
        log_warning "超出范围的端口未被验证（可能由系统处理）"
    fi

    log_success "服务器参数验证测试完成"
}

# 测试 6: 服务器 API 功能测试
test_server_api_functionality() {
    log_info "测试 6: 服务器 API 功能测试"

    if ! command -v curl >/dev/null 2>&1; then
        log_warning "跳过 API 功能测试：curl 不可用"
        return 0
    fi

    local test_port=3007

    # 启动服务器（后台运行）
    timeout 20s run_roo server --port $test_port &

    local server_pid=$!
    sleep 5

    if kill -0 $server_pid 2>/dev/null; then
        # 测试健康检查 API
        log_info "  测试健康检查 API"
        local health_response=$(curl -s "http://localhost:$test_port/health")
        if echo "$health_response" | grep -q "status"; then
            log_success "健康检查 API 返回正确格式"
        else
            log_warning "健康检查 API 响应格式异常"
        fi

        # 测试工具列表 API
        log_info "  测试工具列表 API"
        local tools_response=$(curl -s "http://localhost:$test_port/api/tools")
        if echo "$tools_response" | grep -q "tools\|read_file\|write_to_file"; then
            log_success "工具列表 API 返回正确内容"
        else
            log_warning "工具列表 API 响应内容异常"
        fi

        kill $server_pid 2>/dev/null
        wait $server_pid 2>/dev/null
        log_success "服务器 API 功能测试完成"
    else
        log_error "服务器启动失败，无法测试 API 功能"
        return 1
    fi
}

# 测试方法定义
TEST_METHODS=(
    "test_basic_server_startup:基本服务器启动测试"
    "test_server_endpoints:服务器端点测试"
    "test_server_with_config:服务器配置文件测试"
    "test_server_port_conflict:服务器端口冲突测试"
    "test_server_parameter_validation:服务器参数验证测试"
    "test_server_api_functionality:服务器 API 功能测试"
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
    log_info "=== roo server 命令测试套件 ==="

    test_basic_server_startup || exit 1
    echo

    test_server_endpoints || exit 1
    echo

    test_server_with_config || exit 1
    echo

    test_server_port_conflict || exit 1
    echo

    test_server_parameter_validation || exit 1
    echo

    test_server_api_functionality || exit 1
    echo

    log_success "所有 roo server 命令测试通过！"
}

# 主函数
main() {
    run_test_framework "roo server 命令" "run_all_tests" "show_help" "list_tests" "$@"
}

# 如果直接运行此脚本
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
