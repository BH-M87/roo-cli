import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { EventEmitter } from "events";
import { Provider } from "../core/provider";
import { printMessage } from "../utils/terminal";
import {
  readProviderProfiles,
  readGlobalSettings,
  getMergedCustomModes,
} from "../config/settings";
import { toolRegistry } from "../core/tools";
import { getApiConfig } from "../api/config";
import { CommandOptions } from "../types";
import { setApiConfig } from "../core/tools/newTaskTool";
import { handleNewTask } from "../core/task";
import { createParamSchemaForTool } from "./utils";

/**
 * MCP Stdio 服务器
 * 使用 MCP SDK 实现的 Stdio 服务器
 */
export class McpStdioServer extends EventEmitter {
  private server: McpServer;
  private transport: StdioServerTransport;
  private isRunning: boolean = false;
  private provider: Provider | null = null;
  private commandOptions: CommandOptions;
  private apiConfig: any = null;
  private settings: any = null;
  private customModes: any[] = [];

  /**
   * 构造函数
   * @param options 命令行选项
   */
  constructor(options: CommandOptions = {}) {
    super();
    this.commandOptions = options;

    // 创建 MCP 服务器
    this.server = new McpServer({
      name: "Roo CLI",
      version: "1.0.0",
    });

    // 创建 Stdio 传输
    this.transport = new StdioServerTransport();
  }

  /**
   * 初始化 Provider
   */
  private async initializeProvider(): Promise<void> {
    // 1. 从配置文件加载配置（优先级最低）
    const providerProfiles = await readProviderProfiles(
      this.commandOptions.providerFile
    );
    this.settings = await readGlobalSettings(this.commandOptions.settingsFile);
    this.customModes = await getMergedCustomModes(
      this.settings,
      this.commandOptions.modesFile
    );

    if (!providerProfiles) {
      printMessage(
        "Provider profiles not found, using default or higher priority options",
        "warning"
      );
    }

    if (!this.settings) {
      printMessage(
        "Global settings not found, using default settings",
        "warning"
      );
      this.settings = {};
    }

    // 从配置文件获取 API 配置
    if (providerProfiles) {
      const currentApiConfigName = providerProfiles.currentApiConfigName;
      this.apiConfig = providerProfiles.apiConfigs[currentApiConfigName];
      if (this.apiConfig) {
        printMessage(
          `Using API configuration '${currentApiConfigName}' from provider profiles`,
          "info"
        );
      }
    }

    // 2. 从环境变量获取 API 配置（优先级高于配置文件）
    const envApiConfig = this.getEnvApiConfig();
    if (envApiConfig) {
      this.apiConfig = envApiConfig;
      printMessage(
        "Using API configuration from environment variables",
        "info"
      );
    }

    // 3. 从命令行选项获取 API 配置（优先级高于环境变量）
    const commandApiConfig = getApiConfig(this.commandOptions);
    if (commandApiConfig) {
      this.apiConfig = commandApiConfig;
      printMessage("Using API configuration from command line options", "info");
    }

    // 如果有 API 配置，创建 Provider
    if (this.apiConfig) {
      // 设置全局 API 配置，以便工具可以使用
      setApiConfig(this.apiConfig);

      this.provider = new Provider(
        this.apiConfig,
        this.settings,
        this.customModes
      );
      printMessage(
        `Provider initialized with ${this.apiConfig.apiProvider}`,
        "success"
      );
    } else {
      printMessage(
        "Provider not initialized, waiting for configuration message",
        "warning"
      );
    }
  }

  /**
   * 从环境变量获取 API 配置
   * @returns API 配置对象或 null
   */
  private getEnvApiConfig(): any {
    // 检查环境变量中是否有 API 配置
    const openAiApiKey = process.env.OPENAI_API_KEY;
    const openAiBaseUrl = process.env.OPENAI_BASE_URL;
    const openAiModelId = process.env.OPENAI_MODEL_ID;
    const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
    const anthropicModelId = process.env.ANTHROPIC_MODEL_ID;

    // 如果有 OpenAI 配置，使用 OpenAI
    if (openAiApiKey) {
      return {
        apiProvider: "openai",
        openAiApiKey,
        openAiBaseUrl: openAiBaseUrl || "https://api.openai.com/v1",
        openAiModelId: openAiModelId || "gpt-4",
        id: "env-openai",
      };
    }

    // 如果有 Anthropic 配置，使用 Anthropic
    if (anthropicApiKey) {
      return {
        apiProvider: "anthropic",
        anthropicApiKey,
        anthropicModelId: anthropicModelId || "claude-3-5-sonnet-20241022",
        id: "env-anthropic",
      };
    }

    // 如果没有配置，返回 null
    return null;
  }

  /**
   * 注册工具
   */
  private registerTools(): void {
    // 注册所有工具
    for (const [name, tool] of Object.entries(toolRegistry)) {
      // 创建工具参数模式
      const paramSchema: Record<
        string,
        z.ZodType<any>
      > = createParamSchemaForTool(name);

      // 注册工具
      this.server.tool(
        name,
        tool
          .description({ cwd: process.cwd(), supportsComputerUse: false })
          .split("\n")[1]
          .replace("Description: ", ""), // 提取描述
        paramSchema,
        async (params) => {
          try {
            if (!this.provider) {
              throw new Error("Provider not initialized");
            }

            // 创建工具使用对象
            const toolUse = {
              name,
              params,
            };

            // 获取工作目录
            const cwd = params.cwd || process.cwd();

            // 执行工具
            const result = await tool.handler({
              toolUse,
              cwd,
              verbose: true,
            });

            // 返回结果
            return {
              content: [
                {
                  type: "text",
                  text: typeof result === "string" ? result : result.text,
                },
              ],
            };
          } catch (error) {
            return {
              content: [
                {
                  type: "text",
                  text: `Error executing tool ${name}: ${
                    error instanceof Error ? error.message : String(error)
                  }`,
                },
              ],
            };
          }
        }
      );
    }
  }

  /**
   * 启动 MCP Stdio 服务器
   * @returns 是否成功启动
   */
  async start(): Promise<boolean> {
    if (this.isRunning) {
      printMessage("MCP Stdio server is already running", "info");
      return true;
    }

    try {
      // 初始化 Provider
      await this.initializeProvider();

      // 注册工具
      this.registerTools();

      // 连接到传输
      await this.server.connect(this.transport);

      this.isRunning = true;
      printMessage("MCP Stdio server started", "success");
      this.emit("started");

      return true;
    } catch (error) {
      printMessage(
        `Failed to start MCP Stdio server: ${
          error instanceof Error ? error.message : String(error)
        }`,
        "error"
      );
      return false;
    }
  }

  /**
   * 停止 MCP Stdio 服务器
   * @returns 是否成功停止
   */
  async stop(): Promise<boolean> {
    if (!this.isRunning) {
      printMessage("MCP Stdio server is not running", "info");
      return true;
    }

    try {
      // 断开连接 - MCP SDK doesn't have a disconnect method, so we'll just set isRunning to false
      this.isRunning = false;
      printMessage("MCP Stdio server stopped", "success");
      this.emit("stopped");

      return true;
    } catch (error) {
      printMessage(
        `Failed to stop MCP Stdio server: ${
          error instanceof Error ? error.message : String(error)
        }`,
        "error"
      );
      return false;
    }
  }
}
