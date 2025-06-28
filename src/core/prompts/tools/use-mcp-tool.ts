import { ToolArgs } from './types';

/**
 * 获取使用MCP工具的描述
 * @param args 工具参数
 * @returns 工具描述
 */
export function getUseMcpToolDescription(args: ToolArgs): string {
	return `## use_mcp_tool
Description: Request to use a tool provided by a connected MCP server. Each MCP server can provide multiple tools with different capabilities. Tools have defined input schemas that specify required and optional parameters.
Parameters:
- server_name: (required) The name of the MCP server providing the tool
- tool_name: (required) The name of the tool to execute
- arguments: (required) A JSON object containing the tool's input parameters, following the tool's input schema
Usage:
<use_mcp_tool>
<server_name>server name here</server_name>
<tool_name>tool name here</tool_name>
<arguments>
{
  "param1": "value1",
  "param2": "value2"
}
</arguments>
</use_mcp_tool>

Example: Requesting to use an MCP tool

<use_mcp_tool>
<server_name>roo-code-server</server_name>
<tool_name>get_workspace_info</tool_name>
<arguments>
{
  "path": "src"
}
</arguments>
</use_mcp_tool>`;
}
