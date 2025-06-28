#!/usr/bin/env node
/**
 * Example of using roo-cli as a library
 *
 * This demonstrates how to import and use roo-cli functions
 * in your own Node.js applications.
 *
 * Usage:
 *   ts-node examples/library-usage.ts "Your prompt here"
 *
 * Environment variables:
 *   ANTHROPIC_API_KEY - Your Anthropic API key
 *   OPENAI_API_KEY - Your OpenAI API key
 *   API_PROVIDER - "anthropic" or "openai" (default: "anthropic")
 *   MODEL_ID - Model ID to use (defaults to appropriate model for the provider)
 *   MODE - Task mode (default: "code")
 *   LOG_LEVEL - Log level (default: "info")
 */

import {
	handleNewTask,
	ApiConfig,
	TaskResult,
	ApiProvider,
	logger,
	DEFAULT_CONFIG,
} from '../src/exports';
import dotenv from 'dotenv';

// Load environment variables from .env file if present
dotenv.config();

// Set log level from environment or default to INFO
const logLevelStr = process.env.LOG_LEVEL || 'info';

// Set log level using the string value
logger.setLevel(logLevelStr);

// Get API provider from environment or default to Anthropic
const apiProviderStr = process.env.API_PROVIDER?.toLowerCase() || 'anthropic';
const apiProvider =
	apiProviderStr === 'openai' ? ApiProvider.OPENAI : ApiProvider.ANTHROPIC;

// Define API configuration based on the selected provider
let apiConfig: ApiConfig;

if (apiProvider === ApiProvider.ANTHROPIC) {
	const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
	if (!anthropicApiKey) {
		logger.error(
			'ANTHROPIC_API_KEY environment variable is required when using Anthropic',
		);
		process.exit(1);
	}

	apiConfig = {
		apiProvider: ApiProvider.ANTHROPIC,
		anthropicApiKey,
		anthropicModelId:
			process.env.MODEL_ID || DEFAULT_CONFIG[ApiProvider.ANTHROPIC].modelId,
		id: 'example-anthropic-config',
	};

	logger.info(`Using Anthropic API with model: ${apiConfig.anthropicModelId}`);
} else {
	const openAiApiKey = process.env.OPENAI_API_KEY;
	if (!openAiApiKey) {
		logger.error(
			'OPENAI_API_KEY environment variable is required when using OpenAI',
		);
		process.exit(1);
	}

	apiConfig = {
		apiProvider: ApiProvider.OPENAI,
		openAiApiKey,
		openAiBaseUrl:
			process.env.OPENAI_BASE_URL || DEFAULT_CONFIG[ApiProvider.OPENAI].baseUrl,
		openAiModelId:
			process.env.OPENAI_MODEL_ID || DEFAULT_CONFIG[ApiProvider.OPENAI].modelId,
		streamMode: process.env.STREAM_MODE === 'true',
		id: 'example-openai-config',
	};

	logger.info(`Using OpenAI API with model: ${apiConfig.openAiModelId}`);
}

/**
 * Execute a task with the given prompt
 */
async function executeTask(prompt: string): Promise<void> {
	try {
		logger.info(`Executing task with prompt: ${prompt}`);
		logger.info(`Working directory: ${process.cwd()}`);

		// Get mode from environment or default to 'code'
		const mode = process.env.MODE || 'code';
		logger.info(`Using mode: ${mode}`);

		// Execute the task
		const result: TaskResult = await handleNewTask({
			prompt,
			mode,
			apiConfig,
			cwd: process.cwd(),
			continuous: process.env.CONTINUOUS === 'true',
			maxSteps: process.env.MAX_STEPS
				? parseInt(process.env.MAX_STEPS, 10)
				: undefined,
			logLevel: logLevelStr,
			auto: process.env.AUTO === 'true',
			rules: process.env.RULES,
			customInstructions: process.env.CUSTOM_INSTRUCTIONS,
			roleDefinition: process.env.ROLE_DEFINITION,
			onlyReturnLastResult: process.env.ONLY_RETURN_LAST_RESULT === 'true',
		});

		// Handle the result
		if (result.success) {
			logger.success('Task completed successfully');
			logger.always(`\nOutput:\n${result.output}\n`);
			logger.info(`Task ID: ${result.taskId}`);
		} else {
			logger.error(`Task failed: ${result.error}`);
			logger.error(`Task ID: ${result.taskId}`);
			process.exit(1);
		}
	} catch (error) {
		logger.error(
			`Error: ${error instanceof Error ? error.message : String(error)}`,
		);
		process.exit(1);
	}
}

// Main execution
if (require.main === module) {
	// Get prompt from command line arguments or use default
	const prompt = process.argv[2] || process.env.PROMPT;

	if (!prompt) {
		logger.error(
			'Please provide a prompt as a command line argument or set the PROMPT environment variable',
		);
		logger.info('Usage: ts-node examples/library-usage.ts "Your prompt here"');
		process.exit(1);
	}

	// Execute the task
	executeTask(prompt).catch(error => {
		logger.error(
			`Unhandled error: ${
				error instanceof Error ? error.message : String(error)
			}`,
		);
		process.exit(1);
	});
}
