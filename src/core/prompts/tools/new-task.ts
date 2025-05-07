import { ToolArgs } from "./types"

/**
 * 获取新任务工具的描述
 * @param args 工具参数
 * @returns 工具描述
 */
export function getNewTaskDescription(_args: ToolArgs): string {
  return `## new_task
Description: Create a new task with a specified starting mode and initial message. This tool instructs the system to create a new task instance in the given mode with the provided message.

Parameters:
- mode: (required) The slug of the mode to start the new task in (e.g., "default", "debug", "auto").
- message: (required) The initial user message or instructions for this new task.
- prompt: (optional) Additional prompt text to guide the task.

Usage:
<new_task>
<mode>your-mode-slug-here</mode>
<message>Your initial instructions here</message>
<prompt>Optional additional prompt</prompt>
</new_task>

Example:
<new_task>
<mode>debug</mode>
<message>Debug the authentication issue in the login component.</message>
</new_task>
`
}
