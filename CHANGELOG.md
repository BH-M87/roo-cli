# Roo CLI Changelog

All notable changes to the Roo CLI will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

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

### Changed

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
