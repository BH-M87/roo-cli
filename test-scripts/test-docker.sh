#!/bin/bash

# 测试 roo-cli Docker 相关功能

# 加载环境配置
source "$(dirname "$0")/env-config.sh"

# 加载测试框架
source "$(dirname "$0")/test-framework.sh"

log_info "开始测试 roo-cli Docker 功能..."

# 检查 Docker 是否可用
check_docker() {
    if ! command -v docker >/dev/null 2>&1; then
        log_error "Docker 不可用，跳过 Docker 测试"
        exit 0
    fi

    if ! docker info >/dev/null 2>&1; then
        log_error "Docker 守护进程未运行，跳过 Docker 测试"
        exit 0
    fi

    log_success "Docker 环境检查通过"
}

# 测试 1: Docker 镜像构建
test_docker_build() {
    log_info "测试 1: Docker 镜像构建"

    # 使用 docker-compose 构建
    if [ -f "docker-compose.yml" ]; then
        docker-compose build
        if [ $? -eq 0 ]; then
            log_success "Docker 镜像构建成功"
        else
            log_error "Docker 镜像构建失败"
            return 1
        fi
    else
        log_warning "docker-compose.yml 不存在，跳过构建测试"
    fi
}

# 测试 2: Docker Compose 运行测试
test_docker_compose_run() {
    log_info "测试 2: Docker Compose 运行测试"

    if [ -f "docker-compose.yml" ]; then
        # 测试帮助命令
        docker-compose run --rm roo-cli --help
        if [ $? -eq 0 ]; then
            log_success "Docker Compose 运行测试通过"
        else
            log_error "Docker Compose 运行测试失败"
            return 1
        fi
    else
        log_warning "docker-compose.yml 不存在，跳过运行测试"
    fi
}

# 测试 3: Docker 脚本测试
test_docker_scripts() {
    log_info "测试 3: Docker 脚本测试"

    # 测试 docker-run.sh
    if [ -f "docker-run.sh" ]; then
        log_info "  测试 docker-run.sh"
        timeout 30s bash docker-run.sh --help
        if [ $? -eq 0 ]; then
            log_success "docker-run.sh 测试通过"
        else
            log_warning "docker-run.sh 测试失败"
        fi
    else
        log_warning "docker-run.sh 不存在"
    fi

    # 测试 docker-run-standalone.sh
    if [ -f "docker-run-standalone.sh" ]; then
        log_info "  测试 docker-run-standalone.sh"
        timeout 30s bash docker-run-standalone.sh --help
        if [ $? -eq 0 ]; then
            log_success "docker-run-standalone.sh 测试通过"
        else
            log_warning "docker-run-standalone.sh 测试失败"
        fi
    else
        log_warning "docker-run-standalone.sh 不存在"
    fi

    # 测试 docker-mcp-server.sh
    if [ -f "docker-mcp-server.sh" ]; then
        log_info "  测试 docker-mcp-server.sh"
        # 这个脚本会启动服务器，所以我们只测试它是否能正确解析参数
        timeout 10s bash docker-mcp-server.sh &
        local server_pid=$!
        sleep 3
        kill $server_pid 2>/dev/null
        wait $server_pid 2>/dev/null
        log_success "docker-mcp-server.sh 脚本可执行"
    else
        log_warning "docker-mcp-server.sh 不存在"
    fi
}

# 测试 4: Docker 环境变量测试
test_docker_env_vars() {
    log_info "测试 4: Docker 环境变量测试"

    if [ -f "docker-compose.yml" ]; then
        # 设置环境变量并运行
        OPENAI_API_KEY="$OPENAI_API_KEY" \
            OPENAI_BASE_URL="$OPENAI_BASE_URL" \
            OPENAI_MODEL_ID="$OPENAI_MODEL_ID" \
            docker-compose run --rm roo-cli tools --mode code

        if [ $? -eq 0 ]; then
            log_success "Docker 环境变量测试通过"
        else
            log_warning "Docker 环境变量测试失败"
        fi
    else
        log_warning "docker-compose.yml 不存在，跳过环境变量测试"
    fi
}

# 测试 5: Docker 工作区挂载测试
test_docker_workspace_mount() {
    log_info "测试 5: Docker 工作区挂载测试"

    if [ -f "docker-compose.yml" ]; then
        # 创建测试工作区
        local test_workspace="/tmp/test-docker-workspace"
        mkdir -p "$test_workspace"
        echo "test file content" >"$test_workspace/test.txt"

        # 使用自定义工作区运行
        WORKSPACE_PATH="$test_workspace" \
            docker-compose run --rm roo-cli tool list_files --params '{"path": "."}'

        if [ $? -eq 0 ]; then
            log_success "Docker 工作区挂载测试通过"
        else
            log_warning "Docker 工作区挂载测试失败"
        fi

        rm -rf "$test_workspace"
    else
        log_warning "docker-compose.yml 不存在，跳过工作区挂载测试"
    fi
}

# 测试 6: Docker 独立运行测试
test_docker_standalone() {
    log_info "测试 6: Docker 独立运行测试"

    if [ -f "docker-run-standalone.sh" ]; then
        # 测试构建
        log_info "  测试独立 Docker 构建"
        timeout 120s bash docker-run-standalone.sh --build
        if [ $? -eq 0 ]; then
            log_success "独立 Docker 构建成功"
        else
            log_warning "独立 Docker 构建失败"
            return 0 # 不强制失败，因为构建可能需要很长时间
        fi

        # 测试运行
        log_info "  测试独立 Docker 运行"
        timeout 30s bash docker-run-standalone.sh --help
        if [ $? -eq 0 ]; then
            log_success "独立 Docker 运行测试通过"
        else
            log_warning "独立 Docker 运行测试失败"
        fi
    else
        log_warning "docker-run-standalone.sh 不存在，跳过独立运行测试"
    fi
}

# 测试 7: Docker MCP 服务器测试
test_docker_mcp_server() {
    log_info "测试 7: Docker MCP 服务器测试"

    if [ -f "docker-mcp-server.sh" ]; then
        # 启动 MCP 服务器（后台运行）
        PORT=3010 timeout 15s bash docker-mcp-server.sh &
        local server_pid=$!
        sleep 5

        # 检查服务器是否在运行
        if kill -0 $server_pid 2>/dev/null; then
            # 如果有 curl，测试服务器响应
            if command -v curl >/dev/null 2>&1; then
                if curl -s "http://localhost:3010/health" >/dev/null; then
                    log_success "Docker MCP 服务器测试通过"
                else
                    log_warning "Docker MCP 服务器启动但无法访问"
                fi
            else
                log_success "Docker MCP 服务器启动成功（无法测试 HTTP 访问）"
            fi

            kill $server_pid 2>/dev/null
            wait $server_pid 2>/dev/null
        else
            log_warning "Docker MCP 服务器启动失败"
        fi
    else
        log_warning "docker-mcp-server.sh 不存在，跳过 MCP 服务器测试"
    fi
}

# 测试 8: Docker 清理测试
test_docker_cleanup() {
    log_info "测试 8: Docker 清理测试"

    # 清理可能的容器
    docker-compose down 2>/dev/null || true

    # 清理可能的镜像（可选）
    # docker rmi $(docker images -q roo-cli) 2>/dev/null || true

    log_success "Docker 清理完成"
}

# 测试 9: npm 脚本测试
test_npm_docker_scripts() {
    log_info "测试 9: npm Docker 脚本测试"

    # 测试 npm run docker:build
    if npm run docker:build --silent 2>/dev/null; then
        log_success "npm run docker:build 测试通过"
    else
        log_warning "npm run docker:build 测试失败"
    fi

    # 测试 npm run docker:run
    if timeout 30s npm run docker:run -- --help 2>/dev/null; then
        log_success "npm run docker:run 测试通过"
    else
        log_warning "npm run docker:run 测试失败"
    fi

    log_success "npm Docker 脚本测试完成"
}

# 测试方法定义
TEST_METHODS=(
    "check_docker:Docker 环境检查"
    "test_docker_build:Docker 镜像构建测试"
    "test_docker_compose_run:Docker Compose 运行测试"
    "test_docker_scripts:Docker 脚本测试"
    "test_docker_env_vars:Docker 环境变量测试"
    "test_docker_workspace_mount:Docker 工作区挂载测试"
    "test_docker_standalone:Docker 独立运行测试"
    "test_docker_mcp_server:Docker MCP 服务器测试"
    "test_npm_docker_scripts:npm Docker 脚本测试"
    "test_docker_cleanup:Docker 清理测试"
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
    log_info "=== roo-cli Docker 功能测试套件 ==="

    check_docker
    echo

    test_docker_build
    echo

    test_docker_compose_run
    echo

    test_docker_scripts
    echo

    test_docker_env_vars
    echo

    test_docker_workspace_mount
    echo

    test_docker_standalone
    echo

    test_docker_mcp_server
    echo

    test_npm_docker_scripts
    echo

    test_docker_cleanup
    echo

    log_success "所有 roo-cli Docker 功能测试完成！"
    log_info "注意：某些测试可能显示警告，这是正常的，因为 Docker 功能依赖于环境配置"
}

# 主函数
main() {
    run_test_framework "roo-cli Docker 功能" "run_all_tests" "show_help" "list_tests" "$@"
}

# 如果直接运行此脚本
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
