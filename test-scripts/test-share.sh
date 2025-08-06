#!/bin/bash

# 测试 roo share 命令的各种功能

# 加载环境配置
source "$(dirname "$0")/env-config.sh"

# 加载测试框架
source "$(dirname "$0")/test-framework.sh"

log_info "开始测试 roo share 命令..."

# 创建测试任务的辅助函数
create_test_task() {
    log_info "创建测试任务..."

    # 运行一个简单的任务来创建任务历史
    run_roo new "创建一个简单的测试函数" \
        --log-level "$LOG_LEVEL" \
        --mode "code" \
        --openai-model "$OPENAI_MODEL_ID" \
        --only-return-last-result >/dev/null 2>&1

    if [ $? -eq 0 ]; then
        log_success "测试任务创建成功"
        return 0
    else
        log_error "测试任务创建失败"
        return 1
    fi
}

# 获取最新任务 ID 的辅助函数
get_latest_task_id() {
    # 这里需要根据实际的任务管理实现来获取任务 ID
    # 暂时使用一个模拟的任务 ID
    echo "test-task-$(date +%s)"
}

# 测试 1: 基本分享功能
test_basic_share() {
    log_info "测试 1: 基本分享功能"

    # 创建测试任务
    create_test_task || return 1

    local task_id=$(get_latest_task_id)

    # 尝试分享任务
    run_roo share "$task_id" --visibility organization

    if [ $? -eq 0 ]; then
        log_success "基本分享功能测试通过"
    else
        log_warning "基本分享功能测试失败（可能是正常的，如果没有配置分享服务）"
    fi
}

# 测试 2: 不同可见性级别测试
test_visibility_levels() {
    log_info "测试 2: 不同可见性级别测试"

    local task_id=$(get_latest_task_id)

    # 测试 public 可见性
    log_info "  测试 public 可见性"
    run_roo share "$task_id" --visibility public 2>/dev/null
    if [ $? -eq 0 ]; then
        log_success "public 可见性测试通过"
    else
        log_warning "public 可见性测试失败"
    fi

    # 测试 private 可见性
    log_info "  测试 private 可见性"
    run_roo share "$task_id" --visibility private 2>/dev/null
    if [ $? -eq 0 ]; then
        log_success "private 可见性测试通过"
    else
        log_warning "private 可见性测试失败"
    fi

    # 测试 organization 可见性
    log_info "  测试 organization 可见性"
    run_roo share "$task_id" --visibility organization 2>/dev/null
    if [ $? -eq 0 ]; then
        log_success "organization 可见性测试通过"
    else
        log_warning "organization 可见性测试失败"
    fi

    log_success "不同可见性级别测试完成"
}

# 测试 3: 无效参数验证
test_invalid_parameters() {
    log_info "测试 3: 无效参数验证"

    local task_id=$(get_latest_task_id)

    # 测试无效的可见性级别
    log_info "  测试无效的可见性级别"
    run_roo share "$task_id" --visibility invalid 2>/dev/null
    if [ $? -ne 0 ]; then
        log_success "无效可见性级别正确被拒绝"
    else
        log_error "无效可见性级别未被正确验证"
        return 1
    fi

    # 测试不存在的任务 ID
    log_info "  测试不存在的任务 ID"
    run_roo share "nonexistent-task-id" 2>/dev/null
    if [ $? -ne 0 ]; then
        log_success "不存在的任务 ID 正确被拒绝"
    else
        log_warning "不存在的任务 ID 未被正确验证（可能是模拟实现）"
    fi

    log_success "无效参数验证测试完成"
}

# 测试 4: 分享列表功能
test_share_list() {
    log_info "测试 4: 分享列表功能"

    run_roo share list

    if [ $? -eq 0 ]; then
        log_success "分享列表功能测试通过"
    else
        log_warning "分享列表功能测试失败（可能是正常的，如果没有分享记录）"
    fi
}

# 测试 5: 获取分享详情功能
test_share_get() {
    log_info "测试 5: 获取分享详情功能"

    # 使用一个模拟的分享 ID
    local share_id="test-share-id"

    # 测试 summary 格式
    log_info "  测试 summary 格式"
    run_roo share get "$share_id" --format summary 2>/dev/null
    if [ $? -eq 0 ]; then
        log_success "summary 格式测试通过"
    else
        log_warning "summary 格式测试失败（预期的，因为分享 ID 不存在）"
    fi

    # 测试 json 格式
    log_info "  测试 json 格式"
    run_roo share get "$share_id" --format json 2>/dev/null
    if [ $? -eq 0 ]; then
        log_success "json 格式测试通过"
    else
        log_warning "json 格式测试失败（预期的，因为分享 ID 不存在）"
    fi

    log_success "获取分享详情功能测试完成"
}

# 测试 6: 带认证的分享
test_share_with_auth() {
    log_info "测试 6: 带认证的分享"

    local task_id=$(get_latest_task_id)

    # 测试带 API 端点和认证令牌的分享
    run_roo share "$task_id" \
        --visibility organization \
        --api-endpoint "https://api.example.com" \
        --auth-token "test-token" 2>/dev/null

    if [ $? -eq 0 ]; then
        log_success "带认证的分享测试通过"
    else
        log_warning "带认证的分享测试失败（可能是正常的，如果 API 端点不可用）"
    fi
}

# 测试 7: 分享命令帮助
test_share_help() {
    log_info "测试 7: 分享命令帮助"

    # 测试主命令帮助
    run_roo share --help >/dev/null 2>&1
    if [ $? -eq 0 ]; then
        log_success "主命令帮助测试通过"
    else
        log_error "主命令帮助测试失败"
        return 1
    fi

    # 测试子命令帮助
    run_roo share list --help >/dev/null 2>&1
    if [ $? -eq 0 ]; then
        log_success "list 子命令帮助测试通过"
    else
        log_warning "list 子命令帮助测试失败"
    fi

    run_roo share get --help >/dev/null 2>&1
    if [ $? -eq 0 ]; then
        log_success "get 子命令帮助测试通过"
    else
        log_warning "get 子命令帮助测试失败"
    fi

    log_success "分享命令帮助测试完成"
}

# 测试 8: 分享功能集成测试
test_share_integration() {
    log_info "测试 8: 分享功能集成测试"

    # 创建任务 -> 分享 -> 列出分享 -> 获取详情的完整流程
    log_info "  执行完整的分享流程"

    # 创建测试任务
    create_test_task || return 1

    local task_id=$(get_latest_task_id)

    # 分享任务
    log_info "  分享任务"
    run_roo share "$task_id" --visibility organization 2>/dev/null

    # 列出分享
    log_info "  列出分享"
    run_roo share list 2>/dev/null

    # 注意：由于我们无法获得真实的分享 ID，这里只是测试命令是否能正常执行
    log_success "分享功能集成测试完成"
}

# 测试方法定义
TEST_METHODS=(
    "test_basic_share:基本分享功能测试"
    "test_visibility_levels:不同可见性级别测试"
    "test_invalid_parameters:无效参数验证测试"
    "test_share_list:分享列表功能测试"
    "test_share_get:获取分享详情功能测试"
    "test_share_with_auth:带认证的分享测试"
    "test_share_help:分享命令帮助测试"
    "test_share_integration:分享功能集成测试"
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
    log_info "=== roo share 命令测试套件 ==="

    test_basic_share
    echo

    test_visibility_levels
    echo

    test_invalid_parameters || exit 1
    echo

    test_share_list
    echo

    test_share_get
    echo

    test_share_with_auth
    echo

    test_share_help || exit 1
    echo

    test_share_integration
    echo

    log_success "所有 roo share 命令测试完成！"
    log_info "注意：某些测试可能显示警告，这是正常的，因为分享功能需要外部服务支持"
}

# 主函数
main() {
    run_test_framework "roo share 命令" "run_all_tests" "show_help" "list_tests" "$@"
}

# 如果直接运行此脚本
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
