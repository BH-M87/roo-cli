/**
 * 获取切换模式工具的描述
 * @returns 工具描述
 */
export function getSwitchModeDescription(): string {
	return `## switch_mode
Description: Request to switch to a different mode. This tool allows modes to request switching to another mode when needed, such as switching to Code mode to make code changes. The user must approve the mode switch.
Parameters:
- mode_slug: (required) The slug of the mode to switch to (e.g., "default", "debug", "auto")
- reason: (optional) The reason for switching modes
Usage:
<switch_mode>
<mode_slug>Mode slug here</mode_slug>
<reason>Reason for switching here</reason>
</switch_mode>

Example: Requesting to switch to debug mode
<switch_mode>
<mode_slug>debug</mode_slug>
<reason>Need to debug code issues</reason>
</switch_mode>`;
}
