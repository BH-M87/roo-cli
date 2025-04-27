# Roo CLI Changelog

All notable changes to the Roo CLI will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Added `--only-return-last-result` parameter for continuous execution mode

  - New `--only-return-last-result` command line flag to suppress intermediate result
  - Only return last result of continuous execution
  - Useful for scripting and automation where only the final result is needed
  - Works with both continuous and auto modes
  - Reduces noise in terminal result for long-running tasks

- Added `--log-level` parameter to control output verbosity

  - New `--log-level` command line flag to set the log level
  - Supports both numeric values (0-4) and named levels (debug, info, success, warn, error)
  - Provides fine-grained control over output verbosity
  - Replaces the previous `--verbose` and `--quiet` parameters
  - Useful for scripting and automation where specific output levels are needed
  - Added to `roo tool` command for controlling tool execution verbosity
  - Centralized logging system with consistent level control across all commands

- Added MCP SSE server implementation

  - New `roo mcp-sse` command to start the MCP SSE server
  - Allows web applications and HTTP clients to connect to Roo CLI via SSE
  - Provides `/sse` endpoint for establishing connections
  - Provides `/messages` endpoint for client-to-server communication
  - Supports all Roo tools and task creation capabilities through MCP protocol
  - Includes proper CORS support for cross-origin requests

- Added MCP stdio server implementation

  - New `roo mcp-stdio` command to start the MCP stdio server
  - Allows other services to connect to Roo CLI via standard input/output streams
  - Supports all Roo tools and task creation capabilities through MCP protocol
  - Properly handles all parameter formats for tool calls
  - Includes comprehensive parameter validation using Zod schemas
  - Supports all task parameters including auto, continuous, max_steps, rules, etc.

- Added support for continuing from previous tasks

  - New `--continue-from-task` command line parameter to continue execution from a previous task
  - Task ID is included in the output of each task execution for easy reference
  - Tasks are persisted between executions, allowing for multi-step workflows
  - Works with both single-step and continuous execution modes

- New `auto` mode that allows AI to automatically execute tasks without asking for user confirmation
  - Added `--auto` command line flag to enable auto mode
  - Added support for setting `auto: true` in task configuration files
  - Updated system prompt to inform AI when it's running in auto mode
  - Auto mode can be combined with continuous execution for fully automated workflows
- New `rules` parameter that allows users to supplement their own rules
  - Added `--rules` command line flag to specify custom rules
  - Added support for setting `rules` in task configuration files
  - Custom rules are appended to the default rules in the system prompt
  - Rules can be used to enforce specific coding standards or practices
- New `roleDefinition` parameter that allows users to override the default role definition
  - Added `--role-definition` command line flag to specify custom role definition
  - Added support for setting `roleDefinition` in task configuration files
  - Custom role definition replaces the default role definition in the system prompt
  - Role definition can be used to change the AI's personality or expertise
- Improved mode-specific settings handling
  - The CLI now automatically uses the current mode's `customInstructions` and `roleDefinition` as default values
  - This allows defining mode-specific behaviors without having to specify them each time
  - Priority order: command line args > task config > mode settings > defaults
- Added new `debug` mode
  - Specialized mode for analyzing and fixing problems in code
  - Helps identify issues in static code, resolve compilation errors, and troubleshoot runtime exceptions
  - Follows a systematic debugging approach

### Changed

- Improved logging system

  - Centralized logging control through a unified `logger` utility
  - Replaced direct `console.log` calls with appropriate logger methods
  - Added `logger.setLevel` method for easy log level control
  - Removed redundant `verbose` parameter in favor of log level control
  - Improved debug output for tool execution
  - Consistent log formatting across all commands and tools
  - Better control over output verbosity for scripting and automation

- Improved API server implementation

  - Added CORS support for cross-origin requests
  - Enhanced health check endpoint with more detailed information
  - Added API information endpoint at root path
  - Added tools endpoint to list available tools
  - Improved error handling and logging
  - Added support for environment variables configuration
  - Better server startup and shutdown handling

- Removed old MCP server implementation

  - Removed `mcp-start`, `mcp-stop`, `mcp-restart`, and `mcp-status` commands
  - Replaced with more specialized `mcp-sse` and `mcp-stdio` commands
  - Updated documentation to reflect these changes

- Renamed `SessionManager` to `TaskManager` for better alignment with task-centric terminology

  - Moved from `session.ts` to `task-manager.ts`
  - Renamed related interfaces and methods for consistency
  - Simplified code by using taskId as the primary identifier

- Centralized task creation and management in `task.ts`

  - Both single-step and continuous execution modes now use the same task creation logic
  - Improved code organization and reduced duplication
  - Enhanced task persistence for better continuity between executions

- Extracted single-step execution mode into a dedicated `SingleStepExecutor` class

  - Consistent architecture with `ContinuousExecutor` for better maintainability
  - Clear separation of concerns between different execution modes
  - Simplified task handling in both execution modes

- Refactored `ContinuousExecutor` to reuse `SingleStepExecutor` for each execution step

  - Eliminated code duplication between execution modes
  - Improved consistency in how tasks are executed
  - Better adherence to the DRY (Don't Repeat Yourself) principle
  - Optimized to only add user message in the first step of continuous execution

- Made `regex` parameter optional in `searchFilesTool`
  - Tool now supports filtering files based on `filePattern` only
  - Updated tool description to clarify that regex is optional
  - Added example of using the tool without a regex parameter
  - Improved test coverage for the new functionality

### Documentation

- Updated README.md and README.zh-CN.md with information about MCP SSE server
- Added examples of using MCP SSE server with different configurations
- Updated API server documentation to reflect new endpoints and features
- Updated README.md with information about auto mode
- Added examples of using auto mode with different configurations
- Updated .rooTask file example to include the auto property

## [1.0.0] - 2025-04-13

### Added

- Initial release of Roo CLI
- Support for executing AI tasks from the command line
- Integration with OpenAI and Anthropic models
- File operations: read, write, search, and list files
- Command execution with approval system
- Continuous execution mode
- Configuration via command line options and configuration files
