#!/bin/bash

# 运行所有 roo-cli 功能测试的主脚本

# 加载环境配置
source "$(dirname "$0")/env-config.sh"

# 测试脚本列表
TESTS=(
    "test-new.sh"
    "test-tools.sh"
    "test-mcp.sh"
    "test-server.sh"
    "test-rag.sh"
    "test-share.sh"
    "test-import-settings.sh"
    "test-docker.sh"
)

# 测试结果统计
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0
SKIPPED_TESTS=0

# 运行单个测试的函数
run_test() {
    local test_script="$1"
    local test_path="$(dirname "$0")/$test_script"
    
    if [ ! -f "$test_path" ]; then
        log_error "测试脚本不存在: $test_script"
        return 1
    fi
    
    log_info "开始运行测试: $test_script"
    echo "========================================"
    
    # 运行测试脚本
    bash "$test_path"
    local exit_code=$?
    
    echo "========================================"
    
    if [ $exit_code -eq 0 ]; then
        log_success "测试通过: $test_script"
        ((PASSED_TESTS++))
    else
        log_error "测试失败: $test_script (退出码: $exit_code)"
        ((FAILED_TESTS++))
    fi
    
    ((TOTAL_TESTS++))
    echo
    
    return $exit_code
}

# 显示帮助信息
show_help() {
    echo "用法: $0 [选项] [测试名称...]"
    echo
    echo "选项:"
    echo "  -h, --help     显示此帮助信息"
    echo "  -l, --list     列出所有可用的测试"
    echo "  -f, --fail-fast 遇到第一个失败就停止"
    echo "  -s, --skip-docker 跳过 Docker 测试"
    echo
    echo "测试名称:"
    echo "  如果指定了测试名称，只运行指定的测试"
    echo "  可以指定多个测试名称"
    echo
    echo "可用的测试:"
    for test in "${TESTS[@]}"; do
        echo "  - ${test%.sh}"
    done
    echo
    echo "示例:"
    echo "  $0                    # 运行所有测试"
    echo "  $0 test-new test-tools # 只运行 new 和 tools 测试"
    echo "  $0 --fail-fast        # 遇到失败就停止"
    echo "  $0 --skip-docker      # 跳过 Docker 测试"
}

# 列出所有测试
list_tests() {
    echo "可用的测试脚本:"
    for test in "${TESTS[@]}"; do
        local test_name="${test%.sh}"
        local test_path="$(dirname "$0")/$test"
        if [ -f "$test_path" ]; then
            echo "  ✓ $test_name"
        else
            echo "  ✗ $test_name (文件不存在)"
        fi
    done
}

# 显示测试结果摘要
show_summary() {
    echo
    log_info "========================================"
    log_info "测试结果摘要"
    log_info "========================================"
    log_info "总测试数: $TOTAL_TESTS"
    log_success "通过: $PASSED_TESTS"
    if [ $FAILED_TESTS -gt 0 ]; then
        log_error "失败: $FAILED_TESTS"
    else
        log_info "失败: $FAILED_TESTS"
    fi
    if [ $SKIPPED_TESTS -gt 0 ]; then
        log_warning "跳过: $SKIPPED_TESTS"
    else
        log_info "跳过: $SKIPPED_TESTS"
    fi
    
    if [ $FAILED_TESTS -eq 0 ]; then
        log_success "所有测试都通过了！🎉"
        return 0
    else
        log_error "有 $FAILED_TESTS 个测试失败 ❌"
        return 1
    fi
}

# 主函数
main() {
    local fail_fast=false
    local skip_docker=false
    local specific_tests=()
    
    # 解析命令行参数
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                show_help
                exit 0
                ;;
            -l|--list)
                list_tests
                exit 0
                ;;
            -f|--fail-fast)
                fail_fast=true
                shift
                ;;
            -s|--skip-docker)
                skip_docker=true
                shift
                ;;
            test-*)
                specific_tests+=("$1.sh")
                shift
                ;;
            *)
                # 尝试添加 .sh 后缀
                if [[ "$1" != *.sh ]]; then
                    specific_tests+=("test-$1.sh")
                else
                    specific_tests+=("$1")
                fi
                shift
                ;;
        esac
    done
    
    # 确定要运行的测试
    local tests_to_run=()
    if [ ${#specific_tests[@]} -gt 0 ]; then
        tests_to_run=("${specific_tests[@]}")
    else
        tests_to_run=("${TESTS[@]}")
    fi
    
    # 如果跳过 Docker，从列表中移除
    if [ "$skip_docker" = true ]; then
        local filtered_tests=()
        for test in "${tests_to_run[@]}"; do
            if [[ "$test" != "test-docker.sh" ]]; then
                filtered_tests+=("$test")
            else
                log_warning "跳过 Docker 测试: $test"
                ((SKIPPED_TESTS++))
            fi
        done
        tests_to_run=("${filtered_tests[@]}")
    fi
    
    log_info "=== roo-cli 完整测试套件 ==="
    log_info "将要运行 ${#tests_to_run[@]} 个测试"
    
    if [ "$fail_fast" = true ]; then
        log_info "启用快速失败模式"
    fi
    
    echo
    
    # 运行测试
    for test in "${tests_to_run[@]}"; do
        run_test "$test"
        
        if [ $? -ne 0 ] && [ "$fail_fast" = true ]; then
            log_error "快速失败模式：停止运行剩余测试"
            break
        fi
        
        # 在测试之间添加延迟，避免资源冲突
        sleep 2
    done
    
    # 显示摘要
    show_summary
}

# 如果直接运行此脚本
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
