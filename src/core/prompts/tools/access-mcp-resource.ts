import { ToolArgs } from "./types"

/**
 * 获取访问MCP资源的描述
 * @param args 工具参数
 * @returns 工具描述
 */
export function getAccessMcpResourceDescription(args: ToolArgs): string {
  return `## access_mcp_resource
Description: Request to access a resource provided by a connected MCP server. Resources represent data sources that can be used as context, such as files, API responses, or system information.
Parameters:
- server_name: (required) The name of the MCP server providing the resource
- uri: (required) The URI identifying the specific resource to access
Usage:
<access_mcp_resource>
<server_name>server name here</server_name>
<uri>resource URI here</uri>
</access_mcp_resource>

Example: Requesting to access an MCP resource

<access_mcp_resource>
<server_name>roo-code-server</server_name>
<uri>workspace://src/index.ts</uri>
</access_mcp_resource>`
}
