#!/bin/bash

# 测试 roo rag 命令的各种功能

# 加载环境配置
source "$(dirname "$0")/env-config.sh"

# 加载测试框架
source "$(dirname "$0")/test-framework.sh"

log_info "开始测试 roo rag 命令..."

# 测试 1: RAG 状态查看
test_rag_status() {
    log_info "测试 1: RAG 状态查看"

    run_roo rag status

    if [ $? -eq 0 ]; then
        log_success "RAG 状态查看测试通过"
    else
        log_error "RAG 状态查看测试失败"
        return 1
    fi
}

# 测试 2: RAG 配置验证
test_rag_validate() {
    log_info "测试 2: RAG 配置验证"

    run_roo rag validate

    if [ $? -eq 0 ]; then
        log_success "RAG 配置验证测试通过"
    else
        log_warning "RAG 配置验证失败（可能是正常的，如果配置不完整）"
    fi
}

# 测试 3: 配置内存向量存储
test_rag_configure_memory() {
    log_info "测试 3: 配置内存向量存储"

    run_roo rag configure-memory --dimensions 256

    if [ $? -eq 0 ]; then
        log_success "内存向量存储配置测试通过"
    else
        log_error "内存向量存储配置测试失败"
        return 1
    fi
}

# 测试 4: 启用/禁用 RAG
test_rag_enable_disable() {
    log_info "测试 4: 启用/禁用 RAG"

    # 启用 RAG
    log_info "  启用 RAG"
    run_roo rag enable

    if [ $? -ne 0 ]; then
        log_error "启用 RAG 失败"
        return 1
    fi

    # 禁用 RAG
    log_info "  禁用 RAG"
    run_roo rag disable

    if [ $? -eq 0 ]; then
        log_success "启用/禁用 RAG 测试通过"
    else
        log_error "禁用 RAG 失败"
        return 1
    fi
}

# 测试 5: RAG 配置导出
test_rag_export() {
    log_info "测试 5: RAG 配置导出"

    local export_file="/tmp/test-rag-export.json"

    run_roo rag export --file "$export_file"

    if [ $? -eq 0 ] && [ -f "$export_file" ]; then
        # 验证导出文件是否为有效 JSON
        if python3 -m json.tool "$export_file" >/dev/null 2>&1 || node -e "JSON.parse(require('fs').readFileSync('$export_file', 'utf8'))" >/dev/null 2>&1; then
            log_success "RAG 配置导出测试通过"
            rm -f "$export_file"
        else
            log_error "导出的 RAG 配置不是有效的 JSON"
            rm -f "$export_file"
            return 1
        fi
    else
        log_error "RAG 配置导出测试失败"
        rm -f "$export_file"
        return 1
    fi
}

# 测试 6: RAG 配置导入
test_rag_import() {
    log_info "测试 6: RAG 配置导入"

    # 创建测试配置文件
    local import_file="/tmp/test-rag-import.json"
    cat >"$import_file" <<EOF
{
  "enabled": true,
  "vectorStore": {
    "type": "memory",
    "config": {
      "dimensions": 512
    }
  },
  "embedding": {
    "provider": "openai",
    "model": "text-embedding-ada-002"
  }
}
EOF

    run_roo rag import --file "$import_file"

    if [ $? -eq 0 ]; then
        log_success "RAG 配置导入测试通过"
        rm -f "$import_file"
    else
        log_error "RAG 配置导入测试失败"
        rm -f "$import_file"
        return 1
    fi
}

# 测试 7: 配置 Qdrant 向量存储
test_rag_configure_qdrant() {
    log_info "测试 7: 配置 Qdrant 向量存储"

    # 注意：这个测试可能会失败，因为可能没有运行的 Qdrant 实例
    run_roo rag configure-qdrant \
        --url "http://localhost:6333" \
        --collection "test-collection" \
        --dimensions 1536

    if [ $? -eq 0 ]; then
        log_success "Qdrant 向量存储配置测试通过"
    else
        log_warning "Qdrant 向量存储配置失败（可能是正常的，如果没有 Qdrant 服务器）"
    fi
}

# 测试 8: RAG 重置
test_rag_reset() {
    log_info "测试 8: RAG 重置"

    run_roo rag reset

    if [ $? -eq 0 ]; then
        log_success "RAG 重置测试通过"
    else
        log_error "RAG 重置测试失败"
        return 1
    fi
}

# 测试 9: RAG 配置导出到标准输出
test_rag_export_stdout() {
    log_info "测试 9: RAG 配置导出到标准输出"

    local output=$(run_roo rag export 2>/dev/null)

    if [ $? -eq 0 ] && [ -n "$output" ]; then
        # 验证输出是否为有效 JSON
        if echo "$output" | python3 -m json.tool >/dev/null 2>&1 || echo "$output" | node -e "JSON.parse(require('fs').readFileSync('/dev/stdin', 'utf8'))" >/dev/null 2>&1; then
            log_success "RAG 配置导出到标准输出测试通过"
        else
            log_error "导出到标准输出的 RAG 配置不是有效的 JSON"
            return 1
        fi
    else
        log_error "RAG 配置导出到标准输出测试失败"
        return 1
    fi
}

# 测试 10: RAG 命令参数验证
test_rag_parameter_validation() {
    log_info "测试 10: RAG 命令参数验证"

    # 测试无效的维度参数
    log_info "  测试无效的维度参数"
    run_roo rag configure-memory --dimensions invalid 2>/dev/null
    if [ $? -ne 0 ]; then
        log_success "无效维度参数正确被拒绝"
    else
        log_error "无效维度参数未被正确验证"
        return 1
    fi

    # 测试不存在的导入文件
    log_info "  测试不存在的导入文件"
    run_roo rag import --file "/nonexistent/file.json" 2>/dev/null
    if [ $? -ne 0 ]; then
        log_success "不存在的导入文件正确被拒绝"
    else
        log_error "不存在的导入文件未被正确验证"
        return 1
    fi

    log_success "RAG 命令参数验证测试完成"
}

# 测试方法定义
TEST_METHODS=(
    "test_rag_status:RAG 状态查看测试"
    "test_rag_validate:RAG 配置验证测试"
    "test_rag_configure_memory:配置内存向量存储测试"
    "test_rag_enable_disable:启用/禁用 RAG 测试"
    "test_rag_export:RAG 配置导出测试"
    "test_rag_import:RAG 配置导入测试"
    "test_rag_configure_qdrant:配置 Qdrant 向量存储测试"
    "test_rag_reset:RAG 重置测试"
    "test_rag_export_stdout:RAG 配置导出到标准输出测试"
    "test_rag_parameter_validation:RAG 命令参数验证测试"
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
    log_info "=== roo rag 命令测试套件 ==="

    test_rag_status || exit 1
    echo

    test_rag_validate
    echo

    test_rag_configure_memory || exit 1
    echo

    test_rag_enable_disable || exit 1
    echo

    test_rag_export || exit 1
    echo

    test_rag_import || exit 1
    echo

    test_rag_configure_qdrant
    echo

    test_rag_reset || exit 1
    echo

    test_rag_export_stdout || exit 1
    echo

    test_rag_parameter_validation || exit 1
    echo

    log_success "所有 roo rag 命令测试通过！"
}

# 主函数
main() {
    run_test_framework "roo rag 命令" "run_all_tests" "show_help" "list_tests" "$@"
}

# 如果直接运行此脚本
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
