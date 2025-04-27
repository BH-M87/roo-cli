#!/usr/bin/env node

import { Command } from "commander";
import dotenv from "dotenv";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import chalk from "chalk";

import {
  readTaskConfig,
  readProviderProfiles,
  readGlobalSettings,
  getMergedCustomModes,
  resolveFilePath,
} from "./config/settings";
import { DEFAULT_TASK_CONFIG } from "./config/constants";
import { createServer } from "./server";
import { Provider } from "./core/provider";
import { handleNewTask } from "./core/task";

import { CommandOptions, TaskConfig } from "./types";
import { McpStdioServer } from "./mcp/stdio-server";
import { McpSseServer } from "./mcp/sse-server";
import { setApiConfig } from "./core/tools/newTaskTool";
import { getApiConfig } from "./api/config";
import { VERSION } from "./config/version";
import { logger, LogLevel, setLogLevel } from "./utils/logger";

// Load environment variables
dotenv.config();

const program = new Command();

program
  .name("roo")
  .description("Roo CLI - Execute AI tasks from the command line")
  .version(VERSION);

// New task command
program
  .command("new [prompt]")
  .description("Create a new task")
  .option(
    "-w, --workspace <path>",
    "Workspace directory for file operations (default: current directory)"
  )
  .option("-m, --mode <mode>", "Mode to use (e.g., auto, code, ask)")
  .option("-c, --config-file <path>", "Path to task configuration file")
  .option("-p, --provider-file <path>", "Path to provider profiles file")
  .option("-s, --settings-file <path>", "Path to global settings file")
  .option("-o, --modes-file <path>", "Path to custom modes file")
  .option(
    "--log-level <level>",
    "Set log level (debug=0, info=1, success=2, warn=3, error=4, or 0-4)",
    "1"
  )
  .option("--continuous", "Enable continuous execution mode")
  .option(
    "--max-steps <steps>",
    "Maximum number of steps for continuous mode",
    "100"
  )
  .option("--auto", "Enable auto mode (no user confirmation required)")
  .option(
    "--only-return-last-result",
    "Only return the last result (suppress intermediate result)"
  )
  .option(
    "--api-provider <provider>",
    "API provider to use (anthropic, openai)"
  )
  .option("--openai-api-key <key>", "OpenAI API key")
  .option("--openai-base-url <url>", "OpenAI API base URL")
  .option("--openai-model <model>", "OpenAI model ID")
  .option("--anthropic-api-key <key>", "Anthropic API key")
  .option("--anthropic-model <model>", "Anthropic model ID")
  .option("--rules <rules>", "Additional rules to supplement the system prompt")
  .option(
    "--custom-instructions <instructions>",
    "Custom instructions to add to the system prompt"
  )
  .option(
    "--role-definition <definition>",
    "Custom role definition to override the default one"
  )
  .option("--continue-from-task <taskId>", "Continue from a previous task")
  // Convert kebab-case to camelCase for continueFromTask
  .on("option:continue-from-task", function (this: Command, val: string) {
    this.opts().continueFromTask = val;
  })
  .action(async (promptArg, options: CommandOptions) => {
    try {
      // 设置日志级别
      if (options.logLevel) {
        // 尝试将日志级别解析为数字
        const logLevelValue = parseInt(options.logLevel, 10);

        if (!isNaN(logLevelValue) && logLevelValue >= 0 && logLevelValue <= 4) {
          // 如果是有效的数字，直接设置
          setLogLevel(logLevelValue);
        } else {
          // 使用 logger.setLevel 方法设置日志级别
          logger.setLevel(options.logLevel);
        }
      } else {
        // 默认为 INFO 级别
        setLogLevel(LogLevel.INFO);
      }

      // Get prompt from argument or interactive input
      const prompt = promptArg || options.prompt;

      if (!prompt) {
        logger.error("Error: Prompt is required");
        process.exit(1);
      }

      // Load configuration
      const taskConfig = await loadTaskConfig(prompt, options);
      const providerProfiles = await readProviderProfiles(options.providerFile);
      const settings = await readGlobalSettings(options.settingsFile);
      await getMergedCustomModes(settings, options.modesFile);

      // Get API configuration from command line options or provider profiles
      let apiConfig = getApiConfig(options);

      // If no API config from options, use the one from provider profiles
      if (!apiConfig) {
        const currentApiConfigName = providerProfiles.currentApiConfigName;
        apiConfig = providerProfiles.apiConfigs[currentApiConfigName];

        if (!apiConfig) {
          logger.error(
            `Error: API configuration '${currentApiConfigName}' not found`
          );
          process.exit(1);
        }
      }

      // 设置 API 配置，以便工具可以使用
      setApiConfig(apiConfig);

      logger.info(`Using API provider: ${apiConfig.apiProvider}`);
      logger.info(`Using mode: ${taskConfig.mode}`);
      logger.info(`Working directory: ${taskConfig.cwd || process.cwd()}`);

      // Execute task
      logger.info("Executing task...");
      const result = await handleNewTask({
        prompt: taskConfig.message,
        mode: taskConfig.mode,
        apiConfig,
        cwd: taskConfig.cwd,
        continuous: options.continuous,
        maxSteps: options.maxSteps ? parseInt(options.maxSteps, 10) : undefined,
        logLevel: options.logLevel,
        auto: taskConfig.auto,
        rules: taskConfig.rules,
        customInstructions: taskConfig.customInstructions,
        roleDefinition: taskConfig.roleDefinition,
        continueFromTask: options.continueFromTask,
        onlyReturnLastResult: options.onlyReturnLastResult,
      });

      if (result.success) {
        // 输出结果
        logger.always("\n" + result.output + "\n");
        logger.success("Task completed successfully");
        logger.success(`Task ID: ${result.taskId}`);
      } else {
        // 输出错误
        logger.error(`Task failed: ${result.error}`);
        logger.error(`Task ID: ${result.taskId}`);
      }
    } catch (error) {
      logger.error(
        `Error: ${error instanceof Error ? error.message : String(error)}`
      );
      process.exit(1);
    }
  });

// Tool command
program
  .command("tool <name>")
  .description("Execute a tool")
  .option("-p, --params <json>", "Tool parameters in JSON format")
  .option("-c, --cwd <path>", "Working directory")
  .option("--provider-file <path>", "Path to provider profiles file")
  .option("--settings-file <path>", "Path to global settings file")
  .option("--modes-file <path>", "Path to custom modes file")
  .option("--log-level <level>", "Log level (debug, info, warn, error)", "info")
  .action(async (name, options) => {
    try {
      // Parse parameters
      let params = {};
      if (options.params) {
        try {
          params = JSON.parse(options.params);
        } catch (error) {
          logger.error(
            `Error parsing parameters: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
          process.exit(1);
        }
      }

      // Load configuration
      const providerProfiles = await readProviderProfiles(options.providerFile);
      const settings = await readGlobalSettings(options.settingsFile);
      const customModes = await getMergedCustomModes(
        settings,
        options.modesFile
      );

      // Get API configuration from command line options or provider profiles
      let apiConfig = getApiConfig(options);

      // If no API config from options, use the one from provider profiles
      if (!apiConfig) {
        const currentApiConfigName = providerProfiles.currentApiConfigName;
        apiConfig = providerProfiles.apiConfigs[currentApiConfigName];

        if (!apiConfig) {
          logger.error(
            `Error: API configuration '${currentApiConfigName}' not found`
          );
          process.exit(1);
        }
      }

      // 设置 API 配置，以便工具可以使用
      setApiConfig(apiConfig);

      // Create provider
      const provider = new Provider(apiConfig, settings, customModes);

      // Create tool use object
      const toolUse = {
        name,
        params,
      };

      // 设置日志级别
      logger.setLevel(options.logLevel);

      // Execute tool
      logger.info(`Executing tool: ${name}`);
      const result = await provider.executeTool(
        toolUse,
        options.cwd,
        options.logLevel
      );

      // Print result
      console.log("\n" + result + "\n");
    } catch (error) {
      logger.error(
        `Error: ${error instanceof Error ? error.message : String(error)}`
      );
      process.exit(1);
    }
  });

// List tools command
program
  .command("tools")
  .description("List available tools")
  .option("-m, --mode <mode>", "Mode to use (e.g., code, ask)", "code")
  .option("-c, --cwd <path>", "Working directory")
  .option("-s, --settings-file <path>", "Path to global settings file")
  .option("-o, --modes-file <path>", "Path to custom modes file")
  .action(async (options) => {
    try {
      // Load configuration
      const settings = await readGlobalSettings(options.settingsFile);
      const customModes = await getMergedCustomModes(
        settings,
        options.modesFile
      );

      // Create dummy provider (we only need it for tool descriptions)
      const dummyApiConfig = {
        apiProvider: "anthropic",
        anthropicApiKey: "dummy",
        anthropicModelId: "dummy",
        id: "dummy",
      };

      const provider = new Provider(dummyApiConfig, settings, customModes);
      provider.setCurrentMode(options.mode);

      // Get tool descriptions
      const toolDescriptions = provider.getAvailableToolDescriptions(
        options.cwd
      );

      // Print tool list
      logger.info(`Available tools in ${options.mode} mode:`);
      console.log("");

      for (const [name, description] of Object.entries(toolDescriptions)) {
        logger.success(name);
        console.log(description);
        console.log("");
      }
    } catch (error) {
      logger.error(
        `Error: ${error instanceof Error ? error.message : String(error)}`
      );
      process.exit(1);
    }
  });

// MCP stdio command
program
  .command("mcp-stdio")
  .description("Start the MCP stdio server for external clients to connect")
  .option("-c, --provider-file <path>", "Path to provider profiles file")
  .option("-s, --settings-file <path>", "Path to global settings file")
  .option("-m, --modes-file <path>", "Path to custom modes file")
  .option(
    "--api-provider <provider>",
    "API provider to use (anthropic, openai)"
  )
  .option("--openai-api-key <key>", "OpenAI API key")
  .option("--openai-base-url <url>", "OpenAI API base URL")
  .option("--openai-model <model>", "OpenAI model ID")
  .option("--anthropic-api-key <key>", "Anthropic API key")
  .option("--anthropic-model <model>", "Anthropic model ID")
  .action(async (options) => {
    try {
      // Redirect console.log to stderr to avoid interfering with MCP protocol
      console.log = function (...args) {
        console.error(...args);
      };

      console.error("Starting MCP stdio server...");

      const server = new McpStdioServer(options);
      const success = await server.start();

      if (success) {
        console.error("MCP stdio server started successfully");
        console.error("Waiting for messages on stdin...");

        // Keep the process running until it's terminated
        process.on("SIGINT", async () => {
          console.error("Shutting down MCP stdio server...");
          await server.stop();
          console.error("MCP stdio server stopped");
          process.exit(0);
        });
      } else {
        console.error("Failed to start MCP stdio server");
        process.exit(1);
      }
    } catch (error) {
      console.error(
        `Error: ${error instanceof Error ? error.message : String(error)}`
      );
      process.exit(1);
    }
  });

// MCP SSE server command
program
  .command("mcp-sse")
  .description(
    "Start the MCP SSE server for external clients to connect via SSE"
  )
  .option("-p, --port <port>", "Port to listen on", "3000")
  .option("-c, --provider-file <path>", "Path to provider profiles file")
  .option("-s, --settings-file <path>", "Path to global settings file")
  .option("-m, --modes-file <path>", "Path to custom modes file")
  .option(
    "--api-provider <provider>",
    "API provider to use (anthropic, openai)"
  )
  .option("--openai-api-key <key>", "OpenAI API key")
  .option("--openai-base-url <url>", "OpenAI API base URL")
  .option("--openai-model <model>", "OpenAI model ID")
  .option("--anthropic-api-key <key>", "Anthropic API key")
  .option("--anthropic-model <model>", "Anthropic model ID")
  .action(async (options) => {
    try {
      const port = parseInt(options.port, 10);

      logger.info(`Starting MCP SSE server on port ${port}...`);

      const server = new McpSseServer(port, options);

      const success = await server.start();

      if (success) {
        const status = await server.getStatus();
        logger.success(`MCP SSE server started successfully at ${status.url}`);
        logger.info(`SSE endpoint available at ${status.url}/sse`);
        logger.info(`Messages endpoint available at ${status.url}/messages`);
        logger.info("Press Ctrl+C to stop the server");

        // Keep the process running until it's terminated
        process.on("SIGINT", async () => {
          logger.info("Shutting down MCP SSE server...");
          await server.stop();
          logger.success("MCP SSE server stopped");
          process.exit(0);
        });
      } else {
        logger.error("Failed to start MCP SSE server");
        process.exit(1);
      }
    } catch (error) {
      logger.error(
        `Error: ${error instanceof Error ? error.message : String(error)}`
      );
      process.exit(1);
    }
  });

// Start server command
program
  .command("server")
  .description("Start the Roo server")
  .option("-p, --port <port>", "Port to listen on", "3000")
  .option("-c, --provider-file <path>", "Path to provider profiles file")
  .option("-s, --settings-file <path>", "Path to global settings file")
  .option("-m, --modes-file <path>", "Path to custom modes file")
  .action(async (options) => {
    try {
      const port = parseInt(options.port, 10);

      logger.info(`Starting Roo server on port ${port}...`);

      const server = await createServer(
        port,
        options.providerFile,
        options.settingsFile,
        options.modesFile
      );

      const status = await server.start();

      logger.success(`Server is running at ${status.url}`);
      logger.info(`API documentation available at ${status.url}/`);
      logger.info(`Health check available at ${status.url}/health`);
      logger.info(`Tools endpoint available at ${status.url}/api/tools`);
      logger.info("Press Ctrl+C to stop the server");

      // Handle graceful shutdown
      process.on("SIGINT", async () => {
        logger.info("Shutting down server...");
        await server.stop();
        logger.success("Server stopped");
        process.exit(0);
      });
    } catch (error) {
      logger.error(
        `Error starting server: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      process.exit(1);
    }
  });

/**
 * Load task configuration from file or create from options
 * @param prompt User prompt
 * @param options Command options
 * @returns Task configuration
 */
async function loadTaskConfig(
  prompt: string,
  options: CommandOptions
): Promise<TaskConfig> {
  // 获取当前模式
  const mode = options.mode || "code";

  // 获取自定义模式
  const settings = await readGlobalSettings(options.settingsFile);
  const customModes = await getMergedCustomModes(settings, options.modesFile);

  // 获取当前模式的自定义指令和角色定义
  const currentMode = customModes.find((m) => m.slug === mode);
  const modeCustomInstructions = currentMode?.customInstructions || "";
  const modeRoleDefinition = currentMode?.roleDefinition || "";

  let fileConfig: TaskConfig;

  // Try to load from file if specified
  if (options.configFile) {
    // 使用 resolveFilePath 确保路径是绝对的
    const resolvedConfigPath = resolveFilePath(options.configFile);
    logger.info(`Loading task config from ${resolvedConfigPath}`);

    fileConfig = await readTaskConfig(resolvedConfigPath);

    // 检查是否使用了默认配置（文件不存在）
    const isDefaultConfig = fileConfig === DEFAULT_TASK_CONFIG;
    if (isDefaultConfig) {
      logger.warn(`Config file not found, using default config`);
    }
  } else {
    fileConfig = DEFAULT_TASK_CONFIG;
  }
  // Override with command line options if provided
  return {
    ...fileConfig,
    message: prompt || fileConfig.message,
    mode: options.mode || fileConfig.mode,
    cwd: options.workspace || fileConfig.cwd || process.cwd(),
    // 简化 auto 属性的处理逻辑
    auto:
      options.auto !== undefined
        ? options.auto
        : options.mode === "auto"
        ? true
        : fileConfig.auto,
    rules: options.rules || fileConfig.rules,
    customInstructions:
      options.customInstructions ||
      fileConfig.customInstructions ||
      modeCustomInstructions,
    roleDefinition:
      options.roleDefinition || fileConfig.roleDefinition || modeRoleDefinition,
  } as TaskConfig;
}

// Parse command line arguments
program.parse();

// If no arguments, show help
if (process.argv.length <= 2) {
  program.help();
}
