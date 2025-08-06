#!/bin/bash

# 测试 roo tools 和 roo tool 命令的各种功能

# 加载环境配置
source "$(dirname "$0")/env-config.sh"

log_info "开始测试 roo tools 和 roo tool 命令..."

# 测试 1: 列出所有工具
test_list_tools() {
    log_info "测试 1: 列出所有工具"

    run_roo tools

    if [ $? -eq 0 ]; then
        log_success "列出工具测试通过"
    else
        log_error "列出工具测试失败"
        return 1
    fi
}

# 测试 2: 列出特定模式的工具
test_list_tools_by_mode() {
    log_info "测试 2: 列出特定模式的工具"

    # 测试 code 模式
    log_info "  测试 code 模式工具"
    run_roo tools --mode code

    if [ $? -ne 0 ]; then
        log_error "code 模式工具列表测试失败"
        return 1
    fi

    # 测试 ask 模式
    log_info "  测试 ask 模式工具"
    run_roo tools --mode ask

    if [ $? -ne 0 ]; then
        log_error "ask 模式工具列表测试失败"
        return 1
    fi

    log_success "特定模式工具列表测试通过"
}

# 测试 3: 执行 read_file 工具
test_read_file_tool() {
    log_info "测试 3: 执行 read_file 工具"

    # 创建测试文件
    echo "这是一个测试文件" >/tmp/test-file.txt

    run_roo tool read_file --params '{"path": "/tmp/test-file.txt"}'

    if [ $? -eq 0 ]; then
        log_success "read_file 工具测试通过"
        rm -f /tmp/test-file.txt
    else
        log_error "read_file 工具测试失败"
        rm -f /tmp/test-file.txt
        return 1
    fi
}

# 测试 4: 执行 list_files 工具
test_list_files_tool() {
    log_info "测试 4: 执行 list_files 工具"

    run_roo tool list_files --params '{"path": ".", "recursive": false}'

    if [ $? -eq 0 ]; then
        log_success "list_files 工具测试通过"
    else
        log_error "list_files 工具测试失败"
        return 1
    fi
}

# 测试 5: 执行 write_to_file 工具
test_write_to_file_tool() {
    log_info "测试 5: 执行 write_to_file 工具"

    local test_file="/tmp/test-write.txt"
    local test_content="这是通过 write_to_file 工具写入的内容"

    run_roo tool write_to_file --params "{\"path\": \"$test_file\", \"content\": \"$test_content\"}"

    if [ $? -eq 0 ] && [ -f "$test_file" ]; then
        # 验证文件内容
        if grep -q "$test_content" "$test_file"; then
            log_success "write_to_file 工具测试通过"
            rm -f "$test_file"
        else
            log_error "write_to_file 工具写入内容不正确"
            rm -f "$test_file"
            return 1
        fi
    else
        log_error "write_to_file 工具测试失败"
        rm -f "$test_file"
        return 1
    fi
}

# 测试 6: 执行 execute_command 工具
test_execute_command_tool() {
    log_info "测试 6: 执行 execute_command 工具"

    run_roo tool execute_command --params '{"command": "echo Hello from roo tool"}'

    if [ $? -eq 0 ]; then
        log_success "execute_command 工具测试通过"
    else
        log_error "execute_command 工具测试失败"
        return 1
    fi
}

# 测试 7: 执行 search_files 工具
test_search_files_tool() {
    log_info "测试 7: 执行 search_files 工具"

    # 创建测试文件
    mkdir -p /tmp/test-search
    echo "function testFunction() { return 'test'; }" >/tmp/test-search/test.js
    echo "const variable = 'test';" >/tmp/test-search/test2.js

    run_roo tool search_files --params '{"path": "/tmp/test-search", "regex": "function"}'

    if [ $? -eq 0 ]; then
        log_success "search_files 工具测试通过"
        rm -rf /tmp/test-search
    else
        log_error "search_files 工具测试失败"
        rm -rf /tmp/test-search
        return 1
    fi
}

# 测试 8: 使用工作目录参数
test_tool_with_cwd() {
    log_info "测试 8: 使用工作目录参数"

    # 创建测试目录
    mkdir -p /tmp/test-cwd
    echo "test content" >/tmp/test-cwd/test.txt

    run_roo tool list_files --params '{"path": "."}' --cwd /tmp/test-cwd

    if [ $? -eq 0 ]; then
        log_success "工作目录参数测试通过"
        rm -rf /tmp/test-cwd
    else
        log_error "工作目录参数测试失败"
        rm -rf /tmp/test-cwd
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
    echo "  - test_list_tools          列出所有工具测试"
    echo "  - test_list_tools_by_mode  列出特定模式工具测试"
    echo "  - test_read_file_tool      read_file 工具测试"
    echo "  - test_list_files_tool     list_files 工具测试"
    echo "  - test_write_to_file_tool  write_to_file 工具测试"
    echo "  - test_execute_command_tool execute_command 工具测试"
    echo "  - test_search_files_tool   search_files 工具测试"
    echo "  - test_tool_with_cwd       工作目录参数测试"
    echo
    echo "示例:"
    echo "  $0                         # 运行所有测试"
    echo "  $0 test_list_tools         # 只运行列出工具测试"
    echo "  $0 test_read_file_tool test_write_to_file_tool  # 运行指定的多个测试"
}

# 列出所有测试方法
list_tests() {
    echo "可用的测试方法:"
    echo "  ✓ test_list_tools          - 列出所有工具测试"
    echo "  ✓ test_list_tools_by_mode  - 列出特定模式工具测试"
    echo "  ✓ test_read_file_tool      - read_file 工具测试"
    echo "  ✓ test_list_files_tool     - list_files 工具测试"
    echo "  ✓ test_write_to_file_tool  - write_to_file 工具测试"
    echo "  ✓ test_execute_command_tool - execute_command 工具测试"
    echo "  ✓ test_search_files_tool   - search_files 工具测试"
    echo "  ✓ test_tool_with_cwd       - 工作目录参数测试"
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
    log_info "=== roo tools 和 roo tool 命令测试套件 ==="

    test_list_tools || exit 1
    echo

    test_list_tools_by_mode || exit 1
    echo

    test_read_file_tool || exit 1
    echo

    test_list_files_tool || exit 1
    echo

    test_write_to_file_tool || exit 1
    echo

    test_execute_command_tool || exit 1
    echo

    test_search_files_tool || exit 1
    echo

    test_tool_with_cwd || exit 1
    echo

    log_success "所有 roo tools 和 roo tool 命令测试通过！"
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
        log_info "=== roo tools 和 roo tool 命令指定测试 ==="
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
