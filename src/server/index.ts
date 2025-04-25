import express from "express";
import cors from "cors";
import { Provider } from "../core/provider";
import {
  readProviderProfiles,
  readGlobalSettings,
  getMergedCustomModes,
} from "../config/settings";
import { toolRegistry } from "../core/tools";
import { printMessage } from "../utils/terminal";

/**
 * Server class that manages the Express server
 */
export class Server {
  private app: express.Application;
  private provider: Provider;
  private port: number;
  private server: any;

  constructor(provider: Provider, port: number = 3000) {
    this.app = express();
    this.provider = provider;
    this.port = port;

    // Configure Express
    this.app.use(cors()); // 添加 CORS 支持
    this.app.use(express.json());

    // 添加请求日志中间件
    this.app.use((req, res, next) => {
      printMessage(`${req.method} ${req.path}`, "info");
      next();
    });

    // 添加全局错误处理中间件
    this.app.use(
      (
        err: Error,
        req: express.Request,
        res: express.Response,
        next: express.NextFunction
      ) => {
        printMessage(`Error: ${err.message}`, "error");
        res.status(500).json({
          error: "Internal Server Error",
          message: err.message,
        });
      }
    );

    // Set up routes
    this.setupRoutes();
  }

  /**
   * Set up the server routes
   */
  private setupRoutes(): void {
    // API 信息端点
    this.app.get("/", (_req, res) => {
      res.status(200).json({
        name: "Roo CLI API Server",
        version: "1.0.0",
        description: "API server for Roo CLI",
        endpoints: [
          { path: "/health", description: "Health check endpoint" },
          { path: "/api/task", description: "Execute a task" },
          { path: "/api/config", description: "Get current configuration" },
          { path: "/api/config/api", description: "Update API configuration" },
          {
            path: "/api/config/settings",
            description: "Update global settings",
          },
          { path: "/api/config/modes", description: "Update custom modes" },
          { path: "/api/config/mode", description: "Set current mode" },
          { path: "/api/tools", description: "Get available tools" },
        ],
      });
    });

    // Health check endpoint
    this.app.get("/health", (_req, res) => {
      res.status(200).json({
        status: "ok",
        version: "1.0.0",
        name: "Roo CLI API Server",
        timestamp: new Date().toISOString(),
      });
    });

    // Execute a task
    this.app.post("/api/task", async (req, res) => {
      try {
        const { prompt, mode, cwd } = req.body;

        if (!prompt) {
          return res.status(400).json({ error: "Prompt is required" });
        }

        const result = await this.provider.executeTask(prompt, mode, cwd);
        res.status(200).json(result);
      } catch (error) {
        console.error("Error executing task:", error);
        res.status(500).json({
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    });

    // Get current configuration
    this.app.get("/api/config", (_req, res) => {
      res.status(200).json({
        apiConfig: this.provider.getApiConfig(),
        settings: this.provider.getSettings(),
        customModes: this.provider.getCustomModes(),
        currentMode: this.provider.getCurrentMode(),
      });
    });

    // Get available tools
    this.app.get("/api/tools", (_req, res) => {
      try {
        const currentMode = this.provider.getCurrentMode();
        const cwd = process.cwd();

        // 获取工具描述
        const toolDescriptions =
          this.provider.getAvailableToolDescriptions(cwd);

        // 构建工具列表
        const tools = Object.entries(toolRegistry).map(([name, tool]) => {
          return {
            name,
            description:
              toolDescriptions[name] ||
              tool
                .description({ cwd, supportsComputerUse: false })
                .split("\n")[1]
                .replace("Description: ", ""),
            available: toolDescriptions.hasOwnProperty(name),
          };
        });

        res.status(200).json({
          tools,
          currentMode,
          totalTools: tools.length,
          availableTools: tools.filter((t) => t.available).length,
        });
      } catch (error) {
        printMessage(
          `Error getting tools: ${
            error instanceof Error ? error.message : String(error)
          }`,
          "error"
        );
        res.status(500).json({
          error: "Failed to get tools",
          message: error instanceof Error ? error.message : String(error),
        });
      }
    });

    // Update API configuration
    this.app.post("/api/config/api", (req, res) => {
      try {
        const config = req.body;

        // Validate required fields based on provider
        if (config.apiProvider === "openai" && !config.openAiApiKey) {
          return res.status(400).json({ error: "OpenAI API key is required" });
        }

        if (config.apiProvider === "anthropic" && !config.anthropicApiKey) {
          return res
            .status(400)
            .json({ error: "Anthropic API key is required" });
        }

        this.provider.setApiConfig(config);
        res.status(200).json({ success: true });
      } catch (error) {
        res.status(500).json({
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    });

    // Update global settings
    this.app.post("/api/config/settings", (req, res) => {
      try {
        const settings = req.body;
        this.provider.setSettings(settings);
        res.status(200).json({ success: true });
      } catch (error) {
        res.status(500).json({
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    });

    // Update custom modes
    this.app.post("/api/config/modes", (req, res) => {
      try {
        const modes = req.body;
        this.provider.setCustomModes(modes);
        res.status(200).json({ success: true });
      } catch (error) {
        res.status(500).json({
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    });

    // Set current mode
    this.app.post("/api/config/mode", (req, res) => {
      try {
        const { mode } = req.body;
        this.provider.setCurrentMode(mode);
        res.status(200).json({ success: true });
      } catch (error) {
        res.status(500).json({
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    });
  }

  /**
   * Start the server
   * @returns Promise that resolves when the server is started
   */
  start(): Promise<{ url: string; port: number }> {
    return new Promise((resolve, reject) => {
      try {
        this.server = this.app.listen(this.port, () => {
          const serverUrl = `http://localhost:${this.port}`;
          printMessage(`Server running on ${serverUrl}`, "success");
          printMessage(`API documentation available at ${serverUrl}/`, "info");
          printMessage(`Health check available at ${serverUrl}/health`, "info");

          resolve({
            url: serverUrl,
            port: this.port,
          });
        });

        // 处理服务器错误
        this.server.on("error", (err: Error) => {
          printMessage(`Server error: ${err.message}`, "error");
          reject(err);
        });
      } catch (error) {
        printMessage(
          `Failed to start server: ${
            error instanceof Error ? error.message : String(error)
          }`,
          "error"
        );
        reject(error);
      }
    });
  }

  /**
   * Stop the server
   * @returns Promise that resolves when the server is stopped
   */
  stop(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.server) {
        printMessage("Stopping server...", "info");
        this.server.close((err: Error) => {
          if (err) {
            printMessage(`Error stopping server: ${err.message}`, "error");
            reject(err);
          } else {
            printMessage("Server stopped successfully", "success");
            resolve();
          }
        });
      } else {
        printMessage("Server is not running", "info");
        resolve();
      }
    });
  }
}

/**
 * Create a server with default configuration
 * @param port Server port
 * @param providerFile Path to provider profiles file
 * @param settingsFile Path to global settings file
 * @param modesFile Path to custom modes file
 * @returns Server instance
 */
export async function createServer(
  port: number = parseInt(process.env.PORT || "3000", 10),
  providerFile?: string,
  settingsFile?: string,
  modesFile?: string
): Promise<Server> {
  try {
    printMessage("Creating server...", "info");

    // Load configuration
    printMessage("Loading configuration...", "info");
    const providerProfiles = await readProviderProfiles(providerFile);
    const settings = await readGlobalSettings(settingsFile);
    const customModes = await getMergedCustomModes(settings, modesFile);

    if (!providerProfiles) {
      printMessage(
        "Provider profiles not found, using default configuration",
        "warning"
      );
      // 使用默认配置或环境变量
      const defaultApiConfig = getDefaultApiConfig();
      if (!defaultApiConfig) {
        throw new Error(
          "No API configuration available. Please provide a provider profile or set environment variables."
        );
      }

      // 创建 Provider
      const provider = new Provider(
        defaultApiConfig,
        settings || {},
        customModes || []
      );

      // 创建服务器
      return new Server(provider, port);
    }

    if (!settings) {
      printMessage(
        "Global settings not found, using default settings",
        "warning"
      );
    }

    // Get current API configuration
    const currentApiConfigName = providerProfiles.currentApiConfigName;
    const apiConfig = providerProfiles.apiConfigs[currentApiConfigName];

    if (!apiConfig) {
      printMessage(
        `API configuration '${currentApiConfigName}' not found, checking environment variables`,
        "warning"
      );

      // 尝试使用环境变量
      const envApiConfig = getDefaultApiConfig();
      if (!envApiConfig) {
        throw new Error(
          `API configuration '${currentApiConfigName}' not found and no environment variables set`
        );
      }

      // 创建 Provider
      const provider = new Provider(
        envApiConfig,
        settings || {},
        customModes || []
      );

      // 创建服务器
      return new Server(provider, port);
    }

    // Create provider
    printMessage(
      `Creating provider with ${apiConfig.apiProvider} configuration`,
      "info"
    );
    const provider = new Provider(apiConfig, settings || {}, customModes || []);

    // Create server
    printMessage(`Creating server on port ${port}`, "info");
    return new Server(provider, port);
  } catch (error) {
    printMessage(
      `Error creating server: ${
        error instanceof Error ? error.message : String(error)
      }`,
      "error"
    );
    throw error;
  }
}

/**
 * 从环境变量获取 API 配置
 * @returns API 配置对象或 null
 */
function getDefaultApiConfig(): any {
  // 检查环境变量中是否有 API 配置
  const openAiApiKey = process.env.OPENAI_API_KEY;
  const openAiBaseUrl = process.env.OPENAI_BASE_URL;
  const openAiModelId = process.env.OPENAI_MODEL_ID;
  const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
  const anthropicModelId = process.env.ANTHROPIC_MODEL_ID;

  // 如果有 OpenAI 配置，使用 OpenAI
  if (openAiApiKey) {
    printMessage(
      "Using OpenAI configuration from environment variables",
      "info"
    );
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
    printMessage(
      "Using Anthropic configuration from environment variables",
      "info"
    );
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
