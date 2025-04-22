# Roo CLI Changelog

All notable changes to the Roo CLI will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

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

- Made `regex` parameter optional in `searchFilesTool`
  - Tool now supports filtering files based on `filePattern` only
  - Updated tool description to clarify that regex is optional
  - Added example of using the tool without a regex parameter
  - Improved test coverage for the new functionality

### Documentation

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
