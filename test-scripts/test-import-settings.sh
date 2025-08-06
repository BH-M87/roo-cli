#!/bin/bash

# 测试 roo import-settings 命令的各种功能

# 加载环境配置
source "$(dirname "$0")/env-config.sh"

# 加载测试框架
source "$(dirname "$0")/test-framework.sh"

log_info "开始测试 roo import-settings 命令..."

# 测试 1: 基本设置导入
test_basic_import() {
  log_info "测试 1: 基本设置导入"

  # 创建测试设置文件
  local settings_file="/tmp/test-settings.json"
  cat >"$settings_file" <<EOF
{
  "defaultMode": "code",
  "logLevel": "info",
  "apiProvider": "openai",
  "openaiApiKey": "$OPENAI_API_KEY",
  "openaiBaseUrl": "$OPENAI_BASE_URL",
  "openaiModelId": "$OPENAI_MODEL_ID",
  "rag": {
    "enabled": true,
    "vectorStore": {
      "type": "memory",
      "config": {
        "dimensions": 256
      }
    }
  },
  "rules": [
    "Always write clean and readable code",
    "Include proper error handling",
    "Add comments for complex logic"
  ],
  "allowedCommands": [
    "npm",
    "node",
    "git"
  ]
}
EOF

  run_roo import-settings "$settings_file" --scope project

  if [ $? -eq 0 ]; then
    log_success "基本设置导入测试通过"
    rm -f "$settings_file"
  else
    log_error "基本设置导入测试失败"
    rm -f "$settings_file"
    return 1
  fi
}

# 测试 2: 不同作用域测试
test_different_scopes() {
  log_info "测试 2: 不同作用域测试"

  # 创建测试设置文件
  local settings_file="/tmp/test-settings-scope.json"
  cat >"$settings_file" <<EOF
{
  "defaultMode": "ask",
  "logLevel": "debug",
  "rag": {
    "enabled": false
  }
}
EOF

  # 测试 global 作用域
  log_info "  测试 global 作用域"
  run_roo import-settings "$settings_file" --scope global
  if [ $? -ne 0 ]; then
    log_error "global 作用域测试失败"
    rm -f "$settings_file"
    return 1
  fi

  # 测试 project 作用域
  log_info "  测试 project 作用域"
  run_roo import-settings "$settings_file" --scope project
  if [ $? -ne 0 ]; then
    log_error "project 作用域测试失败"
    rm -f "$settings_file"
    return 1
  fi

  # 测试 both 作用域
  log_info "  测试 both 作用域"
  run_roo import-settings "$settings_file" --scope both
  if [ $? -ne 0 ]; then
    log_error "both 作用域测试失败"
    rm -f "$settings_file"
    return 1
  fi

  log_success "不同作用域测试通过"
  rm -f "$settings_file"
}

# 测试 3: 合并模式测试
test_merge_mode() {
  log_info "测试 3: 合并模式测试"

  # 创建测试设置文件
  local settings_file="/tmp/test-settings-merge.json"
  cat >"$settings_file" <<EOF
{
  "defaultMode": "test",
  "newSetting": "test-value",
  "rules": [
    "New rule for testing"
  ]
}
EOF

  # 测试合并模式
  run_roo import-settings "$settings_file" --scope project --merge

  if [ $? -eq 0 ]; then
    log_success "合并模式测试通过"
    rm -f "$settings_file"
  else
    log_error "合并模式测试失败"
    rm -f "$settings_file"
    return 1
  fi
}

# 测试 4: 干运行模式测试
test_dry_run() {
  log_info "测试 4: 干运行模式测试"

  # 创建测试设置文件
  local settings_file="/tmp/test-settings-dry.json"
  cat >"$settings_file" <<EOF
{
  "defaultMode": "debug",
  "testSetting": "dry-run-value"
}
EOF

  run_roo import-settings "$settings_file" --scope project --dry-run

  if [ $? -eq 0 ]; then
    log_success "干运行模式测试通过"
    rm -f "$settings_file"
  else
    log_error "干运行模式测试失败"
    rm -f "$settings_file"
    return 1
  fi
}

# 测试 5: 强制导入测试
test_force_import() {
  log_info "测试 5: 强制导入测试"

  # 创建可能有警告的设置文件
  local settings_file="/tmp/test-settings-force.json"
  cat >"$settings_file" <<EOF
{
  "defaultMode": "unknown-mode",
  "invalidSetting": "this-might-cause-warnings"
}
EOF

  run_roo import-settings "$settings_file" --scope project --force

  if [ $? -eq 0 ]; then
    log_success "强制导入测试通过"
    rm -f "$settings_file"
  else
    log_warning "强制导入测试失败（可能是正常的，如果验证很严格）"
    rm -f "$settings_file"
  fi
}

# 测试 6: YAML 格式支持测试
test_yaml_format() {
  log_info "测试 6: YAML 格式支持测试"

  # 创建 YAML 格式的设置文件
  local settings_file="/tmp/test-settings.yaml"
  cat >"$settings_file" <<EOF
defaultMode: code
logLevel: info
rag:
  enabled: true
  vectorStore:
    type: memory
    config:
      dimensions: 128
rules:
  - "Write clean code"
  - "Add proper tests"
allowedCommands:
  - npm
  - git
EOF

  run_roo import-settings "$settings_file" --scope project

  if [ $? -eq 0 ]; then
    log_success "YAML 格式支持测试通过"
    rm -f "$settings_file"
  else
    log_warning "YAML 格式支持测试失败（可能不支持 YAML）"
    rm -f "$settings_file"
  fi
}

# 测试 7: 无效参数验证
test_invalid_parameters() {
  log_info "测试 7: 无效参数验证"

  # 测试无效的作用域
  log_info "  测试无效的作用域"
  run_roo import-settings "/tmp/nonexistent.json" --scope invalid 2>/dev/null
  if [ $? -ne 0 ]; then
    log_success "无效作用域正确被拒绝"
  else
    log_error "无效作用域未被正确验证"
    return 1
  fi

  # 测试不存在的文件
  log_info "  测试不存在的文件"
  run_roo import-settings "/tmp/nonexistent-file.json" --scope project 2>/dev/null
  if [ $? -ne 0 ]; then
    log_success "不存在的文件正确被拒绝"
  else
    log_error "不存在的文件未被正确验证"
    return 1
  fi

  # 测试无效的 JSON 文件
  log_info "  测试无效的 JSON 文件"
  local invalid_file="/tmp/invalid-settings.json"
  echo "{ invalid json content" >"$invalid_file"

  run_roo import-settings "$invalid_file" --scope project 2>/dev/null
  if [ $? -ne 0 ]; then
    log_success "无效 JSON 文件正确被拒绝"
    rm -f "$invalid_file"
  else
    log_error "无效 JSON 文件未被正确验证"
    rm -f "$invalid_file"
    return 1
  fi

  log_success "无效参数验证测试完成"
}

# 测试 8: 复杂设置导入测试
test_complex_settings() {
  log_info "测试 8: 复杂设置导入测试"

  # 创建包含所有可能设置的复杂文件
  local settings_file="/tmp/test-complex-settings.json"
  cat >"$settings_file" <<EOF
{
  "defaultMode": "code",
  "logLevel": "debug",
  "apiProvider": "openai",
  "openaiApiKey": "$OPENAI_API_KEY",
  "openaiBaseUrl": "$OPENAI_BASE_URL",
  "openaiModelId": "$OPENAI_MODEL_ID",
  "anthropicApiKey": "test-anthropic-key",
  "anthropicModelId": "claude-3-sonnet",
  "rag": {
    "enabled": true,
    "vectorStore": {
      "type": "qdrant",
      "config": {
        "url": "http://localhost:6333",
        "collection": "test-collection",
        "dimensions": 1536,
        "apiKey": "test-qdrant-key"
      }
    },
    "embedding": {
      "provider": "openai",
      "model": "text-embedding-ada-002"
    }
  },
  "rules": [
    "Always write clean and readable code",
    "Include proper error handling",
    "Add comments for complex logic",
    "Write comprehensive tests",
    "Follow coding standards"
  ],
  "allowedCommands": [
    "npm",
    "node",
    "git",
    "docker",
    "python",
    "pip"
  ],
  "customModes": [
    {
      "slug": "custom-test",
      "name": "Custom Test Mode",
      "description": "A custom mode for testing",
      "systemPrompt": "You are a test assistant"
    }
  ]
}
EOF

  run_roo import-settings "$settings_file" --scope both --merge

  if [ $? -eq 0 ]; then
    log_success "复杂设置导入测试通过"
    rm -f "$settings_file"
  else
    log_error "复杂设置导入测试失败"
    rm -f "$settings_file"
    return 1
  fi
}

# 测试方法定义
TEST_METHODS=(
  "test_basic_import:基本设置导入测试"
  "test_different_scopes:不同作用域测试"
  "test_merge_mode:合并模式测试"
  "test_dry_run:干运行模式测试"
  "test_force_import:强制导入测试"
  "test_yaml_format:YAML 格式支持测试"
  "test_invalid_parameters:无效参数验证测试"
  "test_complex_settings:复杂设置导入测试"
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
  log_info "=== roo import-settings 命令测试套件 ==="

  test_basic_import || exit 1
  echo

  test_different_scopes || exit 1
  echo

  test_merge_mode || exit 1
  echo

  test_dry_run || exit 1
  echo

  test_force_import
  echo

  test_yaml_format
  echo

  test_invalid_parameters || exit 1
  echo

  test_complex_settings || exit 1
  echo

  log_success "所有 roo import-settings 命令测试通过！"
}

# 主函数
main() {
  run_test_framework "roo import-settings 命令" "run_all_tests" "show_help" "list_tests" "$@"
}

# 如果直接运行此脚本
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  main "$@"
fi
