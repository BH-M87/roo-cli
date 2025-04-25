import express from "express";
import { Server } from "http";
import { ChildProcess, spawn } from "child_process";
import { EventEmitter } from "events";
import cors from "cors";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { z } from "zod";
import { setMcpServerUrl } from "../core/tools/mcpTool";
import { printMessage } from "../utils/terminal";
import { isPortInUse, killProcessOnPort } from "../utils/network";
import { Provider } from "../core/provider";
import {
  readProviderProfiles,
  readGlobalSettings,
  getMergedCustomModes,
} from "../config/settings";
import { toolRegistry } from "../core/tools";
import { getApiConfig } from "../api/config";
import { CommandOptions } from "../types";
import { setApiConfig } from "../core/tools/newTaskTool";

/**
 * MCP SSE 服务器
 * 使用 MCP SDK 实现的 SSE 服务器
 */
export class McpSseServer extends EventEmitter {
  private server: Server | null = null;
  private process: ChildProcess | null = null;
  private port: number = 3000;
  private isRunning: boolean = false;
  private mcpServer: McpServer | null = null;
  private provider: Provider | null = null;
  private commandOptions: CommandOptions;
  private apiConfig: any = null;
  private settings: any = null;
  private customModes: any[] = [];
  private currentTransport: SSEServerTransport | null = null;

  /**
   * 构造函数
   * @param port 端口号
   * @param options 命令行选项
   */
  constructor(port: number = 3000, options: CommandOptions = {}) {
    super();
    this.port = port;
    this.commandOptions = options;

    // 创建 MCP 服务器
    this.mcpServer = new McpServer({
      name: "Roo CLI",
      version: "1.0.0",
      listTools: async () => {
        // 返回所有已注册工具的列表
        const tools = Object.entries(toolRegistry).map(([name, tool]) => {
          return {
            name,
            description: tool
              .description({ cwd: process.cwd(), supportsComputerUse: false })
              .split("\n")[1]
              .replace("Description: ", ""),
            parameters: this.createParamSchemaForTool(name),
          };
        });

        return tools;
      },
    });
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
    if (!this.mcpServer) {
      printMessage("MCP server not initialized", "error");
      return;
    }

    // 注册所有工具
    for (const [name, tool] of Object.entries(toolRegistry)) {
      // 创建工具参数模式
      const paramSchema: Record<
        string,
        z.ZodType<any>
      > = this.createParamSchemaForTool(name);

      // 注册工具
      this.mcpServer.tool(
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
   * 启动 MCP 服务器
   * @returns 是否成功启动
   */
  async start(): Promise<boolean> {
    if (this.isRunning) {
      printMessage("MCP server is already running", "info");
      return true;
    }

    try {
      // 检查端口是否被占用
      const portInUse = await isPortInUse(this.port);
      if (portInUse) {
        printMessage(
          `Port ${this.port} is already in use, attempting to kill the process...`,
          "warning"
        );
        await killProcessOnPort(this.port);
      }

      // 创建 Express 应用
      const app = express();

      // 配置中间件
      app.use(cors());
      app.use(express.json());

      // 配置路由
      // 健康检查端点
      app.get("/health", (_req, res) => {
        res.json({
          status: "ok",
          connected: this.currentTransport !== null,
          version: "1.0.0",
          name: "Roo CLI MCP Server",
        });
      });

      // API 信息端点
      app.get("/", (_req, res) => {
        res.json({
          name: "Roo CLI MCP Server",
          version: "1.0.0",
          description: "MCP server for Roo CLI",
          endpoints: [
            { path: "/sse", description: "SSE endpoint for MCP communication" },
            {
              path: "/messages",
              description: "Endpoint for client-to-server messages",
            },
            { path: "/health", description: "Health check endpoint" },
          ],
        });
      });

      // 初始化 Provider
      await this.initializeProvider();

      // 注册工具
      this.registerTools();

      // 设置 SSE 端点
      app.get("/sse", async (req, res) => {
        try {
          if (!this.mcpServer) {
            return res.status(500).send("MCP server not initialized");
          }

          printMessage("Client connected to SSE endpoint", "info");

          // 创建 SSE 传输
          this.currentTransport = new SSEServerTransport("/messages", res);

          // 连接到传输
          await this.mcpServer
            .connect(this.currentTransport)
            .then(() => {
              printMessage("SSE transport connected successfully", "success");
            })
            .catch((error) => {
              printMessage(
                `SSE transport connection error: ${
                  error instanceof Error ? error.message : String(error)
                }`,
                "error"
              );
              // 连接失败时清除传输
              this.currentTransport = null;
            });

          // 处理连接关闭
          req.on("close", () => {
            printMessage("Client disconnected from SSE endpoint", "info");
            // 清除传输
            this.currentTransport = null;
          });
        } catch (error) {
          printMessage(
            `SSE setup error: ${
              error instanceof Error ? error.message : String(error)
            }`,
            "error"
          );
          res.status(500).send("Internal Server Error");
        }
      });

      // 设置 messages 端点，用于接收客户端消息
      app.post("/messages", express.json(), async (req, res) => {
        try {
          if (!this.mcpServer) {
            return res
              .status(500)
              .json({ error: "MCP server not initialized" });
          }

          if (!this.currentTransport) {
            return res
              .status(500)
              .json({ error: "No active SSE connection found" });
          }

          // 使用 SSE 传输处理消息
          await this.currentTransport.handlePostMessage(req, res, req.body);

          printMessage("Processed message from client", "info");
        } catch (error) {
          printMessage(
            `Error processing message: ${
              error instanceof Error ? error.message : String(error)
            }`,
            "error"
          );
          return res.status(500).json({
            error: `Internal server error: ${
              error instanceof Error ? error.message : String(error)
            }`,
          });
        }
      });

      // 启动服务器
      this.server = app.listen(this.port, () => {
        printMessage(`MCP SSE server started on port ${this.port}`, "success");
        this.isRunning = true;

        // 设置 MCP 服务器 URL
        const serverUrl = `http://localhost:${this.port}`;
        setMcpServerUrl(serverUrl);

        printMessage(`SSE endpoint available at ${serverUrl}/sse`, "info");
        printMessage(
          `Messages endpoint available at ${serverUrl}/messages`,
          "info"
        );

        this.emit("started", { port: this.port, url: serverUrl });
      });

      return true;
    } catch (error) {
      printMessage(
        `Failed to start MCP server: ${
          error instanceof Error ? error.message : String(error)
        }`,
        "error"
      );
      return false;
    }
  }

  /**
   * 停止 MCP 服务器
   * @returns 是否成功停止
   */
  async stop(): Promise<boolean> {
    if (!this.isRunning) {
      printMessage("MCP server is not running", "info");
      return true;
    }

    try {
      // 停止服务器
      if (this.server) {
        this.server.close();
        this.server = null;
      }

      // 停止进程
      if (this.process) {
        this.process.kill();
        this.process = null;
      }

      this.isRunning = false;
      setMcpServerUrl(null);

      printMessage("MCP server stopped", "success");
      this.emit("stopped");

      return true;
    } catch (error) {
      printMessage(
        `Failed to stop MCP server: ${
          error instanceof Error ? error.message : String(error)
        }`,
        "error"
      );
      return false;
    }
  }

  /**
   * 重启 MCP 服务器
   * @returns 是否成功重启
   */
  async restart(): Promise<boolean> {
    await this.stop();
    return this.start();
  }

  /**
   * 获取 MCP 服务器状态
   * @returns 服务器状态
   */
  async getStatus(): Promise<{
    running: boolean;
    port: number;
    url: string | null;
  }> {
    // 检查端口是否被占用，如果被占用，则认为服务器正在运行
    const portInUse = await isPortInUse(this.port);

    return {
      running: this.isRunning || portInUse,
      port: this.port,
      url: this.isRunning || portInUse ? `http://localhost:${this.port}` : null,
    };
  }
}
