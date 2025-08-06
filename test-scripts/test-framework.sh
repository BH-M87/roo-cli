#!/bin/bash

# 通用测试框架函数
# 为测试脚本提供参数控制和方法执行功能

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

# 通用的主函数模板
# 参数:
# $1: 测试套件名称
# $2: 运行所有测试的函数名
# $3: 显示帮助的函数名
# $4: 列出测试的函数名
# $@: 命令行参数
run_test_framework() {
    local suite_name="$1"
    local run_all_func="$2"
    local show_help_func="$3"
    local list_tests_func="$4"
    shift 4
    
    local specific_tests=()
    
    # 解析命令行参数
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                "$show_help_func"
                exit 0
                ;;
            -l|--list)
                "$list_tests_func"
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
        log_info "=== $suite_name 指定测试 ==="
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
        "$run_all_func"
    fi
}

# 生成标准的帮助信息
# 参数:
# $1: 脚本名称
# $2: 测试方法列表（每行一个，格式：方法名:描述）
generate_help() {
    local script_name="$1"
    shift
    local test_methods=("$@")
    
    echo "用法: $script_name [选项] [测试方法名...]"
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
    
    for method_info in "${test_methods[@]}"; do
        local method_name="${method_info%%:*}"
        local method_desc="${method_info#*:}"
        printf "  - %-25s %s\n" "$method_name" "$method_desc"
    done
    
    echo
    echo "示例:"
    echo "  $script_name                         # 运行所有测试"
    if [ ${#test_methods[@]} -gt 0 ]; then
        local first_method="${test_methods[0]%%:*}"
        echo "  $script_name $first_method          # 只运行第一个测试"
        if [ ${#test_methods[@]} -gt 1 ]; then
            local second_method="${test_methods[1]%%:*}"
            echo "  $script_name $first_method $second_method  # 运行指定的多个测试"
        fi
    fi
}

# 生成标准的测试列表
# 参数: 测试方法列表（每行一个，格式：方法名:描述）
generate_test_list() {
    local test_methods=("$@")
    
    echo "可用的测试方法:"
    
    for method_info in "${test_methods[@]}"; do
        local method_name="${method_info%%:*}"
        local method_desc="${method_info#*:}"
        printf "  ✓ %-25s - %s\n" "$method_name" "$method_desc"
    done
}
