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
   * 为工具创建参数模式
   * @param toolName 工具名称
   * @returns 参数模式
   */
  private createParamSchemaForTool(
    toolName: string
  ): Record<string, z.ZodType<any>> {
    const paramSchema: Record<string, z.ZodType<any>> = {};

    // 根据工具名称创建参数模式
    switch (toolName) {
      case "read_file":
        paramSchema.path = z.string().describe("The path to the file to read");
        paramSchema.start_line = z
          .string()
          .optional()
          .describe("The line number to start reading from (1-indexed)");
        paramSchema.end_line = z
          .string()
          .optional()
          .describe("The line number to end reading at (1-indexed)");
        break;

      case "write_to_file":
        paramSchema.path = z.string().describe("The path to the file to write");
        paramSchema.content = z
          .string()
          .describe("The content to write to the file");
        break;

      case "list_files":
        paramSchema.path = z
          .string()
          .describe("The path to the directory to list files from");
        paramSchema.recursive = z
          .string()
          .optional()
          .describe("Whether to list files recursively (true/false)");
        break;

      case "search_files":
        paramSchema.path = z
          .string()
          .describe("The path to the directory to search files in");
        paramSchema.regex = z
          .string()
          .describe("The regular expression to search for");
        paramSchema.file_pattern = z
          .string()
          .optional()
          .describe("The file pattern to match (e.g., *.js)");
        break;

      case "execute_command":
        paramSchema.command = z.string().describe("The command to execute");
        paramSchema.cwd = z
          .string()
          .optional()
          .describe("The working directory to execute the command in");
        break;

      case "browser_action":
        paramSchema.action = z
          .string()
          .describe("The browser action to perform");
        paramSchema.url = z
          .string()
          .optional()
          .describe("The URL to navigate to");
        paramSchema.text = z.string().optional().describe("The text to input");
        paramSchema.coordinate = z
          .string()
          .optional()
          .describe("The coordinate to click");
        break;

      case "insert_content":
        paramSchema.path = z
          .string()
          .describe("The path to the file to insert content into");
        paramSchema.content = z.string().describe("The content to insert");
        paramSchema.position = z
          .string()
          .optional()
          .describe("The position to insert at (start, end, or line:N)");
        break;

      case "diff_files":
        paramSchema.path1 = z.string().describe("The path to the first file");
        paramSchema.path2 = z.string().describe("The path to the second file");
        break;

      case "switch_mode":
        paramSchema.mode = z.string().describe("The mode to switch to");
        break;

      case "new_task":
        paramSchema.prompt = z.string().describe("The prompt for the new task");
        paramSchema.mode = z
          .string()
          .optional()
          .describe("The mode to use for the new task (e.g., code, auto, ask)");
        paramSchema.cwd = z
          .string()
          .optional()
          .describe("The working directory for the task");
        paramSchema.auto = z
          .boolean()
          .optional()
          .describe("Whether to run in auto mode without user confirmation");
        paramSchema.continuous = z
          .boolean()
          .optional()
          .describe("Whether to run in continuous execution mode");
        paramSchema.max_steps = z
          .string()
          .optional()
          .describe("Maximum number of steps for continuous mode");
        paramSchema.rules = z
          .string()
          .optional()
          .describe("Additional rules to supplement the system prompt");
        paramSchema.custom_instructions = z
          .string()
          .optional()
          .describe("Custom instructions to add to the system prompt");
        paramSchema.role_definition = z
          .string()
          .optional()
          .describe("Custom role definition to override the default one");
        paramSchema.continue_from_task = z
          .string()
          .optional()
          .describe("ID of a previous task to continue from");
        break;

      case "use_mcp_tool":
        paramSchema.tool = z.string().describe("The MCP tool to use");
        paramSchema.params = z
          .string()
          .optional()
          .describe("The parameters for the MCP tool in JSON format");
        break;

      case "access_mcp_resource":
        paramSchema.path = z.string().describe("The path to the MCP resource");
        break;

      // 添加通用参数
      default:
        paramSchema.cwd = z
          .string()
          .optional()
          .describe("The working directory");
        break;
    }

    return paramSchema;
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
      > = this.createParamSchemaForTool(name);

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
