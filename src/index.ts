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
import { printMessage } from "./utils/terminal";
import { CommandOptions, TaskConfig, ApiConfig } from "./types";
import { McpServerManager } from "./mcp/server";
import { McpStdioServer } from "./mcp/stdio-server";
import { McpSseServer } from "./mcp/sse-server";
import { setApiConfig } from "./core/tools/newTaskTool";
import { getApiConfig } from "./api/config";

// Load environment variables
dotenv.config();

const program = new Command();

program
  .name("roo")
  .description("Roo CLI - Execute AI tasks from the command line")
  .version("1.0.0");

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
  .option("-v, --verbose", "Enable verbose output")
  .option("--continuous", "Enable continuous execution mode")
  .option(
    "--max-steps <steps>",
    "Maximum number of steps for continuous mode",
    "100"
  )
  .option("--auto", "Enable auto mode (no user confirmation required)")
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
      // Get prompt from argument or interactive input
      const prompt = promptArg || options.prompt;

      if (!prompt) {
        printMessage("Error: Prompt is required", "error");
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
          printMessage(
            `Error: API configuration '${currentApiConfigName}' not found`,
            "error"
          );
          process.exit(1);
        }
      }

      // 设置 API 配置，以便工具可以使用
      setApiConfig(apiConfig);

      if (options.verbose) {
        printMessage(`Using API provider: ${apiConfig.apiProvider}`, "info");
        printMessage(`Using mode: ${taskConfig.mode}`, "info");
        printMessage(
          `Working directory: ${taskConfig.cwd || process.cwd()}`,
          "info"
        );
      }

      // Execute task
      printMessage("Executing task...", "info");
      const result = await handleNewTask({
        prompt: taskConfig.message,
        mode: taskConfig.mode,
        apiConfig,
        cwd: taskConfig.cwd,
        continuous: options.continuous,
        maxSteps: options.maxSteps ? parseInt(options.maxSteps, 10) : undefined,
        verbose: options.verbose,
        auto: taskConfig.auto,
        rules: taskConfig.rules,
        customInstructions: taskConfig.customInstructions,
        roleDefinition: taskConfig.roleDefinition,
        continueFromTask: options.continueFromTask,
      });

      if (result.success) {
        console.log("\n" + result.output + "\n");
        printMessage("Task completed successfully", "success");
        printMessage(`Task ID: ${result.taskId}`, "info");
      } else {
        printMessage(`Task failed: ${result.error}`, "error");
        printMessage(`Task ID: ${result.taskId}`, "info");
      }
    } catch (error) {
      printMessage(
        `Error: ${error instanceof Error ? error.message : String(error)}`,
        "error"
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
  .option("-v, --verbose", "Enable verbose output")
  .option("--provider-file <path>", "Path to provider profiles file")
  .option("--settings-file <path>", "Path to global settings file")
  .option("--modes-file <path>", "Path to custom modes file")
  .action(async (name, options) => {
    try {
      // Parse parameters
      let params = {};
      if (options.params) {
        try {
          params = JSON.parse(options.params);
        } catch (error) {
          printMessage(
            `Error parsing parameters: ${
              error instanceof Error ? error.message : String(error)
            }`,
            "error"
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
          printMessage(
            `Error: API configuration '${currentApiConfigName}' not found`,
            "error"
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

      // Execute tool
      printMessage(`Executing tool: ${name}`, "info");
      const result = await provider.executeTool(
        toolUse,
        options.cwd,
        options.verbose
      );

      // Print result
      console.log("\n" + result + "\n");
    } catch (error) {
      printMessage(
        `Error: ${error instanceof Error ? error.message : String(error)}`,
        "error"
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
      printMessage(`Available tools in ${options.mode} mode:`, "info");
      console.log("");

      for (const [name, description] of Object.entries(toolDescriptions)) {
        printMessage(name, "success");
        console.log(description);
        console.log("");
      }
    } catch (error) {
      printMessage(
        `Error: ${error instanceof Error ? error.message : String(error)}`,
        "error"
      );
      process.exit(1);
    }
  });

// MCP server commands
program
  .command("mcp-start")
  .description("Start the MCP server")
  .option("-p, --port <port>", "Port to listen on", "3000")
  .action(async (options) => {
    try {
      const port = parseInt(options.port, 10);
      const serverManager = new McpServerManager(port);

      printMessage(`Starting MCP server on port ${port}...`, "info");
      const success = await serverManager.start();

      if (success) {
        const status = serverManager.getStatus();
        printMessage(
          `MCP server started successfully at ${status.url}`,
          "success"
        );
      } else {
        printMessage("Failed to start MCP server", "error");
        process.exit(1);
      }
    } catch (error) {
      printMessage(
        `Error: ${error instanceof Error ? error.message : String(error)}`,
        "error"
      );
      process.exit(1);
    }
  });

program
  .command("mcp-stop")
  .description("Stop the MCP server")
  .action(async () => {
    try {
      const serverManager = new McpServerManager();

      printMessage("Stopping MCP server...", "info");
      const success = await serverManager.stop();

      if (success) {
        printMessage("MCP server stopped successfully", "success");
      } else {
        printMessage("Failed to stop MCP server", "error");
        process.exit(1);
      }
    } catch (error) {
      printMessage(
        `Error: ${error instanceof Error ? error.message : String(error)}`,
        "error"
      );
      process.exit(1);
    }
  });

program
  .command("mcp-restart")
  .description("Restart the MCP server")
  .option("-p, --port <port>", "Port to listen on", "3000")
  .action(async (options) => {
    try {
      const port = parseInt(options.port, 10);
      const serverManager = new McpServerManager(port);

      printMessage(`Restarting MCP server on port ${port}...`, "info");
      const success = await serverManager.restart();

      if (success) {
        const status = serverManager.getStatus();
        printMessage(
          `MCP server restarted successfully at ${status.url}`,
          "success"
        );
      } else {
        printMessage("Failed to restart MCP server", "error");
        process.exit(1);
      }
    } catch (error) {
      printMessage(
        `Error: ${error instanceof Error ? error.message : String(error)}`,
        "error"
      );
      process.exit(1);
    }
  });

program
  .command("mcp-status")
  .description("Check the MCP server status")
  .action(async () => {
    try {
      const serverManager = new McpServerManager();
      const status = serverManager.getStatus();

      if (status.running) {
        printMessage(`MCP server is running at ${status.url}`, "success");
      } else {
        printMessage("MCP server is not running", "info");
      }
    } catch (error) {
      printMessage(
        `Error: ${error instanceof Error ? error.message : String(error)}`,
        "error"
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

      printMessage(`Starting MCP SSE server on port ${port}...`, "info");

      const server = new McpSseServer(port, options);

      const success = await server.start();

      if (success) {
        const status = await server.getStatus();
        printMessage(
          `MCP SSE server started successfully at ${status.url}`,
          "success"
        );
        printMessage(`SSE endpoint available at ${status.url}/sse`, "info");
        printMessage(
          `Messages endpoint available at ${status.url}/messages`,
          "info"
        );
        printMessage("Press Ctrl+C to stop the server", "info");

        // Keep the process running until it's terminated
        process.on("SIGINT", async () => {
          printMessage("Shutting down MCP SSE server...", "info");
          await server.stop();
          printMessage("MCP SSE server stopped", "success");
          process.exit(0);
        });
      } else {
        printMessage("Failed to start MCP SSE server", "error");
        process.exit(1);
      }
    } catch (error) {
      printMessage(
        `Error: ${error instanceof Error ? error.message : String(error)}`,
        "error"
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

      printMessage(`Starting Roo server on port ${port}...`, "info");

      const server = await createServer(
        port,
        options.providerFile,
        options.settingsFile,
        options.modesFile
      );

      await server.start();

      printMessage(`Server is running at http://localhost:${port}`, "success");
      printMessage("Press Ctrl+C to stop the server", "info");

      // Handle graceful shutdown
      process.on("SIGINT", async () => {
        printMessage("Shutting down server...", "info");
        await server.stop();
        printMessage("Server stopped", "success");
        process.exit(0);
      });
    } catch (error) {
      printMessage(
        `Error starting server: ${
          error instanceof Error ? error.message : String(error)
        }`,
        "error"
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
    printMessage(`Loading task config from ${resolvedConfigPath}`, "info");

    fileConfig = await readTaskConfig(resolvedConfigPath);

    // 检查是否使用了默认配置（文件不存在）
    const isDefaultConfig = fileConfig === DEFAULT_TASK_CONFIG;
    if (isDefaultConfig) {
      printMessage(`Config file not found, using default config`, "warning");
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
