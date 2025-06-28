import { Command } from 'commander';
import * as fs from 'fs/promises';
import * as path from 'path';
import { logger } from '../utils/logger';
import { safeWriteJson } from '../utils/safe-write-json';
import {
	safeParseYaml,
	validateYaml,
	formatYamlError,
} from '../utils/yaml-handler';
import {
	getGlobalRooDirectory,
	getProjectRooDirectoryForCwd,
} from '../utils/roo-config';

interface ImportableSettings {
	rules?: string[];
	modes?: Record<string, any>;
	customInstructions?: string;
	allowedCommands?: string[];
	globalSettings?: Record<string, any>;
	projectSettings?: Record<string, any>;
}

/**
 * Create import settings command
 * @returns Commander command
 */
export function createImportSettingsCommand(): Command {
	const command = new Command('import-settings');

	command
		.description('Import settings from a configuration file')
		.argument('<file-path>', 'Path to the settings file (JSON or YAML)')
		.option(
			'--scope <scope>',
			'Import scope (global, project, both)',
			'project',
		)
		.option('--merge', 'Merge with existing settings instead of replacing')
		.option('--dry-run', 'Show what would be imported without making changes')
		.option('--force', 'Force import even if validation warnings exist')
		.action(async (filePath: string, options) => {
			try {
				// Validate scope option
				const validScopes = ['global', 'project', 'both'];
				if (!validScopes.includes(options.scope)) {
					logger.error(
						`Invalid scope: ${options.scope}. Must be one of: ${validScopes.join(', ')}`,
					);
					process.exit(1);
				}

				// Check if file exists
				try {
					await fs.access(filePath);
				} catch {
					logger.error(`Settings file not found: ${filePath}`);
					process.exit(1);
				}

				// Read and parse settings file
				const fileContent = await fs.readFile(filePath, 'utf-8');
				const fileExt = path.extname(filePath).toLowerCase();

				let settings: ImportableSettings;

				if (fileExt === '.yaml' || fileExt === '.yml') {
					const parseResult = safeParseYaml<ImportableSettings>(
						fileContent,
						filePath,
					);
					if (!parseResult.success) {
						logger.error('Failed to parse YAML settings file:');
						console.error(
							formatYamlError(parseResult.error!, fileContent, filePath),
						);
						if (!options.force) {
							process.exit(1);
						}
						settings = {};
					} else {
						settings = parseResult.data!;
					}
				} else if (fileExt === '.json') {
					try {
						settings = JSON.parse(fileContent);
					} catch (error) {
						logger.error(
							`Failed to parse JSON settings file: ${error instanceof Error ? error.message : String(error)}`,
						);
						process.exit(1);
					}
				} else {
					logger.error(
						`Unsupported file format: ${fileExt}. Use .json, .yaml, or .yml`,
					);
					process.exit(1);
				}

				// Validate settings structure
				const validationResult = validateSettings(settings);
				if (!validationResult.valid) {
					logger.error('Settings validation failed:');
					validationResult.errors.forEach(error =>
						logger.error(`  - ${error}`),
					);
					if (!options.force) {
						process.exit(1);
					}
				}

				if (validationResult.warnings.length > 0) {
					logger.warn('Settings validation warnings:');
					validationResult.warnings.forEach(warning =>
						logger.warn(`  - ${warning}`),
					);
				}

				// Show what will be imported
				if (options.dryRun) {
					logger.info('Dry run - showing what would be imported:');
					console.log(JSON.stringify(settings, null, 2));
					return;
				}

				// Import settings based on scope
				if (options.scope === 'global' || options.scope === 'both') {
					await importGlobalSettings(settings, options.merge);
					logger.success('Global settings imported successfully');
				}

				if (options.scope === 'project' || options.scope === 'both') {
					await importProjectSettings(settings, options.merge, process.cwd());
					logger.success('Project settings imported successfully');
				}

				logger.success(`Settings imported successfully from ${filePath}`);
			} catch (error) {
				logger.error(
					`Error importing settings: ${error instanceof Error ? error.message : String(error)}`,
				);
				process.exit(1);
			}
		});

	return command;
}

/**
 * Validate settings structure
 * @param settings Settings to validate
 * @returns Validation result
 */
function validateSettings(settings: ImportableSettings): {
	valid: boolean;
	errors: string[];
	warnings: string[];
} {
	const errors: string[] = [];
	const warnings: string[] = [];

	// Check if settings is an object
	if (typeof settings !== 'object' || settings === null) {
		errors.push('Settings must be an object');
		return { valid: false, errors, warnings };
	}

	// Validate rules
	if (settings.rules !== undefined) {
		if (!Array.isArray(settings.rules)) {
			errors.push('Rules must be an array of strings');
		} else {
			settings.rules.forEach((rule, index) => {
				if (typeof rule !== 'string') {
					errors.push(`Rule at index ${index} must be a string`);
				}
			});
		}
	}

	// Validate modes
	if (settings.modes !== undefined) {
		if (typeof settings.modes !== 'object' || Array.isArray(settings.modes)) {
			errors.push('Modes must be an object');
		}
	}

	// Validate customInstructions
	if (
		settings.customInstructions !== undefined &&
		typeof settings.customInstructions !== 'string'
	) {
		errors.push('Custom instructions must be a string');
	}

	// Validate allowedCommands
	if (settings.allowedCommands !== undefined) {
		if (!Array.isArray(settings.allowedCommands)) {
			errors.push('Allowed commands must be an array of strings');
		} else {
			settings.allowedCommands.forEach((command, index) => {
				if (typeof command !== 'string') {
					errors.push(`Allowed command at index ${index} must be a string`);
				}
			});
		}
	}

	// Add warnings for unknown properties
	const knownProperties = [
		'rules',
		'modes',
		'customInstructions',
		'allowedCommands',
		'globalSettings',
		'projectSettings',
	];
	Object.keys(settings).forEach(key => {
		if (!knownProperties.includes(key)) {
			warnings.push(`Unknown property: ${key}`);
		}
	});

	return {
		valid: errors.length === 0,
		errors,
		warnings,
	};
}

/**
 * Import global settings
 * @param settings Settings to import
 * @param merge Whether to merge with existing settings
 */
async function importGlobalSettings(
	settings: ImportableSettings,
	merge: boolean,
): Promise<void> {
	const globalDir = getGlobalRooDirectory();
	await fs.mkdir(globalDir, { recursive: true });

	// Import rules
	if (settings.rules && settings.rules.length > 0) {
		const rulesDir = path.join(globalDir, 'rules');
		await fs.mkdir(rulesDir, { recursive: true });

		const rulesContent = settings.rules.join('\n\n');
		const rulesFile = path.join(rulesDir, 'imported-rules.md');

		if (merge) {
			try {
				const existingContent = await fs.readFile(rulesFile, 'utf-8');
				await fs.writeFile(
					rulesFile,
					`${existingContent}\n\n# Imported Rules\n\n${rulesContent}`,
				);
			} catch {
				await fs.writeFile(rulesFile, rulesContent);
			}
		} else {
			await fs.writeFile(rulesFile, rulesContent);
		}
	}

	// Import global settings
	if (settings.globalSettings) {
		const settingsFile = path.join(globalDir, 'settings.json');

		if (merge) {
			try {
				const existingContent = await fs.readFile(settingsFile, 'utf-8');
				const existingSettings = JSON.parse(existingContent);
				const mergedSettings = {
					...existingSettings,
					...settings.globalSettings,
				};
				await safeWriteJson(settingsFile, mergedSettings);
			} catch {
				await safeWriteJson(settingsFile, settings.globalSettings);
			}
		} else {
			await safeWriteJson(settingsFile, settings.globalSettings);
		}
	}

	// Import custom instructions
	if (settings.customInstructions) {
		const instructionsFile = path.join(globalDir, 'custom-instructions.md');

		if (merge) {
			try {
				const existingContent = await fs.readFile(instructionsFile, 'utf-8');
				await fs.writeFile(
					instructionsFile,
					`${existingContent}\n\n# Imported Instructions\n\n${settings.customInstructions}`,
				);
			} catch {
				await fs.writeFile(instructionsFile, settings.customInstructions);
			}
		} else {
			await fs.writeFile(instructionsFile, settings.customInstructions);
		}
	}

	// Import allowed commands
	if (settings.allowedCommands) {
		const commandsFile = path.join(globalDir, 'allowed-commands.json');

		if (merge) {
			try {
				const existingContent = await fs.readFile(commandsFile, 'utf-8');
				const existingCommands = JSON.parse(existingContent);
				const mergedCommands = [
					...new Set([...existingCommands, ...settings.allowedCommands]),
				];
				await safeWriteJson(commandsFile, mergedCommands);
			} catch {
				await safeWriteJson(commandsFile, settings.allowedCommands);
			}
		} else {
			await safeWriteJson(commandsFile, settings.allowedCommands);
		}
	}
}

/**
 * Import project settings
 * @param settings Settings to import
 * @param merge Whether to merge with existing settings
 * @param cwd Current working directory
 */
async function importProjectSettings(
	settings: ImportableSettings,
	merge: boolean,
	cwd: string,
): Promise<void> {
	const projectDir = getProjectRooDirectoryForCwd(cwd);
	await fs.mkdir(projectDir, { recursive: true });

	// Import rules
	if (settings.rules && settings.rules.length > 0) {
		const rulesDir = path.join(projectDir, 'rules');
		await fs.mkdir(rulesDir, { recursive: true });

		const rulesContent = settings.rules.join('\n\n');
		const rulesFile = path.join(rulesDir, 'imported-rules.md');

		if (merge) {
			try {
				const existingContent = await fs.readFile(rulesFile, 'utf-8');
				await fs.writeFile(
					rulesFile,
					`${existingContent}\n\n# Imported Rules\n\n${rulesContent}`,
				);
			} catch {
				await fs.writeFile(rulesFile, rulesContent);
			}
		} else {
			await fs.writeFile(rulesFile, rulesContent);
		}
	}

	// Import project settings
	if (settings.projectSettings) {
		const settingsFile = path.join(projectDir, 'settings.json');

		if (merge) {
			try {
				const existingContent = await fs.readFile(settingsFile, 'utf-8');
				const existingSettings = JSON.parse(existingContent);
				const mergedSettings = {
					...existingSettings,
					...settings.projectSettings,
				};
				await safeWriteJson(settingsFile, mergedSettings);
			} catch {
				await safeWriteJson(settingsFile, settings.projectSettings);
			}
		} else {
			await safeWriteJson(settingsFile, settings.projectSettings);
		}
	}
}
