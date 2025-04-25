import { z } from "zod";

/**
 * 为工具创建参数模式
 * @param toolName 工具名称
 * @returns 参数模式
 */
export function createParamSchemaForTool(
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
