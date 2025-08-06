#!/bin/bash

# 测试 roo new 命令的各种功能

# 加载环境配置
source "$(dirname "$0")/env-config.sh"

log_info "开始测试 roo new 命令..."

# 测试 1: 基本的 new 命令
test_basic_new() {
    log_info "测试 1: 基本的 new 命令"
    run_roo new "创建一个简单的 Hello World 函数" \
        --log-level "$LOG_LEVEL" \
        --mode "code" \
        --openai-model "$OPENAI_MODEL_ID" \
        --only-return-last-result

    if [ $? -eq 0 ]; then
        log_success "基本 new 命令测试通过"
    else
        log_error "基本 new 命令测试失败"
        return 1
    fi
}

# 测试 2: 使用不同模式
test_different_modes() {
    log_info "测试 2: 使用不同模式"

    # 测试 ask 模式
    log_info "  测试 ask 模式"
    run_roo new "什么是递归？请简单解释" \
        --log-level "$LOG_LEVEL" \
        --mode "ask" \
        --openai-model "$OPENAI_MODEL_ID" \
        --only-return-last-result

    if [ $? -ne 0 ]; then
        log_error "ask 模式测试失败"
        return 1
    fi

    # 测试 debug 模式
    log_info "  测试 debug 模式"
    run_roo new "分析这段代码的问题：function add(a, b) { return a + b }" \
        --log-level "$LOG_LEVEL" \
        --mode "debug" \
        --openai-model "$OPENAI_MODEL_ID" \
        --only-return-last-result

    if [ $? -ne 0 ]; then
        log_error "debug 模式测试失败"
        return 1
    fi

    log_success "不同模式测试通过"
}

# 测试 3: 使用输入文件
test_input_file() {
    log_info "测试 3: 使用输入文件"

    # 创建测试输入文件
    cat >/tmp/test-requirement.txt <<EOF
创建一个 JavaScript 函数，用于计算数组中所有数字的平均值。
要求：
1. 函数名为 calculateAverage
2. 接受一个数字数组作为参数
3. 返回平均值
4. 处理空数组的情况
EOF

    run_roo new --input-file /tmp/test-requirement.txt \
        --log-level "$LOG_LEVEL" \
        --mode "code" \
        --openai-model "$OPENAI_MODEL_ID" \
        --only-return-last-result

    if [ $? -eq 0 ]; then
        log_success "输入文件测试通过"
        rm -f /tmp/test-requirement.txt
    else
        log_error "输入文件测试失败"
        rm -f /tmp/test-requirement.txt
        return 1
    fi
}

# 测试 4: 结构化输出
test_structured_output() {
    log_info "测试 4: 结构化输出"

    local output_file="/tmp/test-output.json"

    run_roo new "创建一个简单的加法函数" \
        --log-level "$LOG_LEVEL" \
        --mode "code" \
        --openai-model "$OPENAI_MODEL_ID" \
        --only-return-last-result \
        --structured-output "$output_file"

    if [ $? -eq 0 ] && [ -f "$output_file" ]; then
        log_success "结构化输出测试通过"
        log_info "输出文件: $output_file"
        rm -f "$output_file"
    else
        log_error "结构化输出测试失败"
        rm -f "$output_file"
        return 1
    fi
}

# 测试 5: 流模式
test_stream_mode() {
    log_info "测试 5: 流模式"

    run_roo new "创建一个简单的乘法函数" \
        --log-level "$LOG_LEVEL" \
        --mode "code" \
        --openai-model "$OPENAI_MODEL_ID" \
        --stream-mode \
        --only-return-last-result

    if [ $? -eq 0 ]; then
        log_success "流模式测试通过"
    else
        log_error "流模式测试失败"
        return 1
    fi
}

# 显示帮助信息
show_help() {
    echo "用法: $0 [选项] [测试方法名...]"
    echo
    echo "选项:"
    echo "  -h, --help     显示此帮助信息"
    echo "  -l, --list     列出所有可用的测试方法"
    echo
    echo "测试方法:"
    echo "  如果指定了测试方法名，只运行指定的测试"
    echo "  可以指定多个测试方法名"
    echo
    echo "可用的测试方法:"
    echo "  - test_basic_new           基本的 new 命令测试"
    echo "  - test_different_modes     不同模式测试"
    echo "  - test_input_file          输入文件测试"
    echo "  - test_structured_output   结构化输出测试"
    echo "  - test_stream_mode         流模式测试"
    echo
    echo "示例:"
    echo "  $0                         # 运行所有测试"
    echo "  $0 test_basic_new          # 只运行基本测试"
    echo "  $0 test_basic_new test_stream_mode  # 运行指定的多个测试"
}

# 列出所有测试方法
list_tests() {
    echo "可用的测试方法:"
    echo "  ✓ test_basic_new           - 基本的 new 命令测试"
    echo "  ✓ test_different_modes     - 不同模式测试"
    echo "  ✓ test_input_file          - 输入文件测试"
    echo "  ✓ test_structured_output   - 结构化输出测试"
    echo "  ✓ test_stream_mode         - 流模式测试"
}

# 检查测试方法是否存在
test_method_exists() {
    local method_name="$1"
    if declare -f "$method_name" >/dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

# 运行指定的测试方法
run_specific_test() {
    local method_name="$1"

    if test_method_exists "$method_name"; then
        log_info "运行测试: $method_name"
        "$method_name"
        local exit_code=$?
        if [ $exit_code -eq 0 ]; then
            log_success "测试通过: $method_name"
        else
            log_error "测试失败: $method_name"
        fi
        return $exit_code
    else
        log_error "测试方法不存在: $method_name"
        return 1
    fi
}

# 运行所有测试
run_all_tests() {
    log_info "=== roo new 命令测试套件 ==="

    test_basic_new || exit 1
    echo

    test_different_modes || exit 1
    echo

    test_input_file || exit 1
    echo

    test_structured_output || exit 1
    echo

    test_stream_mode || exit 1
    echo

    log_success "所有 roo new 命令测试通过！"
}

# 主函数
main() {
    local specific_tests=()

    # 解析命令行参数
    while [[ $# -gt 0 ]]; do
        case $1 in
        -h | --help)
            show_help
            exit 0
            ;;
        -l | --list)
            list_tests
            exit 0
            ;;
        test_*)
            specific_tests+=("$1")
            shift
            ;;
        *)
            log_error "未知参数: $1"
            echo "使用 --help 查看帮助信息"
            exit 1
            ;;
        esac
    done

    # 如果指定了特定测试，只运行这些测试
    if [ ${#specific_tests[@]} -gt 0 ]; then
        log_info "=== roo new 命令指定测试 ==="
        local failed_tests=0

        for test_method in "${specific_tests[@]}"; do
            run_specific_test "$test_method"
            if [ $? -ne 0 ]; then
                ((failed_tests++))
            fi
            echo
        done

        if [ $failed_tests -eq 0 ]; then
            log_success "所有指定的测试都通过了！"
        else
            log_error "$failed_tests 个测试失败"
            exit 1
        fi
    else
        # 运行所有测试
        run_all_tests
    fi
}

# 如果直接运行此脚本
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
