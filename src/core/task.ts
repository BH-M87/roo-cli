import {
	TaskConfig,
	TaskResult,
	ApiConfig,
	HandleNewTaskParams,
} from '../types';
import { getCurrentWorkingDirectory } from '../config/settings';
import { generateSystemPrompt } from './prompts/system';
import { ContinuousExecutor } from './continuous-executor';
import { SingleStepExecutor } from './single-step-executor';
import { TaskManager } from './task-manager';
import { logger } from '../utils/logger';
import {
	parseStructuredOutputOption,
	createFileOutputManager,
} from '../utils/file-output-manager';

/**
 * 工具响应类型
 */
export type ToolResponse = string | { text: string; images?: string[] };

/**
 * 创建或获取任务
 * @param mode 模式
 * @param workingDir 工作目录
 * @param systemPrompt 系统提示
 * @param continueFromTask 继续执行的任务ID
 * @returns 任务ID和任务管理器
 */
async function createOrGetTask(
	mode: string,
	workingDir: string,
	systemPrompt: string,
	continueFromTask?: string,
): Promise<{ taskId: string; taskManager: TaskManager }> {
	// 创建任务管理器
	const taskManager = new TaskManager();

	let taskId;

	// 如果继续执行任务
	if (continueFromTask) {
		taskId = continueFromTask;
		logger.progress(`Continuing from task: ${continueFromTask}`);

		// 验证任务是否存在
		const task = taskManager.getTask(continueFromTask);
		if (!task) {
			throw new Error(`Task ${continueFromTask} not found`);
		}

		logger.debug(`Task found with ${task.messages.length} messages`);
	} else {
		// 创建新任务
		taskId = await taskManager.createTask(mode, workingDir, systemPrompt);
		logger.progress(`Created new task: ${taskId}`);
	}

	return { taskId, taskManager };
}

/**
 * Handle a new task
 * @param params Task parameters
 * @returns Task result
 */
export async function handleNewTask(
	params: HandleNewTaskParams,
): Promise<TaskResult> {
	const {
		prompt,
		mode,
		apiConfig,
		cwd,
		continuous = false,
		maxSteps = 100,
		auto = false,
		rules,
		customInstructions,
		roleDefinition,
		continueFromTask,
		onlyReturnLastResult = false,
	} = params;
	const workingDir = getCurrentWorkingDirectory(cwd);

	// 生成系统提示
	const systemPrompt = await generateSystemPrompt(
		workingDir,
		mode,
		rules,
		auto,
		customInstructions,
		roleDefinition,
	);

	// 创建或获取任务
	const { taskId } = await createOrGetTask(
		mode,
		workingDir,
		systemPrompt,
		continueFromTask,
	);

	// 输出任务概要信息
	const modeText = continuous || auto ? 'continuous' : 'single-step';
	const autoText = auto ? ' (auto)' : '';
	logger.progress(`Starting task - ${modeText}${autoText} mode`);
	logger.progress(`Working directory: ${workingDir}`);
	logger.progress(
		`Task prompt: ${prompt.length > 80 ? prompt.substring(0, 80) + '...' : prompt}`,
	);

	// 详细配置信息放到 info 级别
	logger.info(`Task ID: ${taskId}`);
	logger.info(`Mode: ${mode}`);
	logger.info(`Continuous mode: ${continuous ? 'enabled' : 'disabled'}`);
	logger.info(`Auto mode: ${auto ? 'enabled' : 'disabled'}`);
	logger.info(`Rules: ${rules || 'none'}`);
	logger.info(
		`Custom instructions: ${
			customInstructions
				? customInstructions.length > 100
					? customInstructions.substring(0, 100) + '...'
					: customInstructions
				: 'none'
		}`,
	);
	logger.info(
		`Role definition: ${
			roleDefinition
				? roleDefinition.length > 100
					? roleDefinition.substring(0, 100) + '...'
					: roleDefinition
				: 'none'
		}`,
	);

	try {
		// 解析结构化输出选项
		const structuredOutputConfig = parseStructuredOutputOption(
			params.structuredOutput,
		);
		const fileOutputManager = createFileOutputManager(params.structuredOutput);

		// 创建结构化输出更新回调
		let onStructuredUpdate = params.onStructuredUpdate;
		if (fileOutputManager) {
			const originalCallback = params.onStructuredUpdate;
			onStructuredUpdate = async data => {
				// 写入文件
				await fileOutputManager.writeUpdate(data);
				// 调用原始回调（如果有）
				if (originalCallback) {
					originalCallback(data);
				}
			};
		}

		// 检查是否使用连续执行模式或自动模式
		if (continuous || auto) {
			// 创建连续执行器
			const executor = new ContinuousExecutor(
				apiConfig,
				mode,
				workingDir,
				maxSteps,
				auto,
				rules,
				customInstructions,
				roleDefinition,
				taskId,
				onlyReturnLastResult,
				structuredOutputConfig.enabled,
				onStructuredUpdate,
			);

			// 执行任务
			const result = await executor.execute(prompt);

			// 如果有文件输出管理器，写入最终结果
			if (fileOutputManager) {
				await fileOutputManager.writeFinalResult(result);
			}

			return result;
		} else {
			// 单步执行模式
			// 创建单步执行器
			const executor = new SingleStepExecutor(
				apiConfig,
				mode,
				workingDir,
				systemPrompt,
				taskId,
				structuredOutputConfig.enabled,
				onStructuredUpdate,
			);

			// 执行任务
			const result = (await executor.execute(
				prompt,
				false,
				true,
			)) as TaskResult;

			// 如果有文件输出管理器，写入最终结果
			if (fileOutputManager) {
				await fileOutputManager.writeFinalResult(result);
			}

			return result;
		}
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error);
		logger.error('Error executing task: ' + errorMessage);

		// 如果有文件输出管理器，写入错误信息
		const fileOutputManager = createFileOutputManager(params.structuredOutput);
		if (fileOutputManager) {
			await fileOutputManager.writeError(errorMessage);
		}

		return {
			taskId,
			output: '',
			success: false,
			error: errorMessage,
		};
	}
}

/**
 * Execute a task with the given configuration
 * @param config Task configuration
 * @param apiConfig API configuration
 * @param options Additional options
 * @returns Task result
 */
export async function executeTask(
	config: TaskConfig,
	apiConfig: ApiConfig,
	options?: {
		continuous?: boolean;
		maxSteps?: number;
		logLevel?: string;
		auto?: boolean;
		continueFromTask?: string;
		onlyReturnLastResult?: boolean;
	},
): Promise<TaskResult> {
	return handleNewTask({
		prompt: config.message,
		mode: config.mode,
		apiConfig,
		cwd: config.cwd,
		continuous: options?.continuous || config.auto,
		maxSteps: options?.maxSteps,
		logLevel: options?.logLevel,
		auto: options?.auto || config.auto,
		rules: config.rules,
		customInstructions: config.customInstructions,
		roleDefinition: config.roleDefinition,
		continueFromTask: options?.continueFromTask,
		onlyReturnLastResult: options?.onlyReturnLastResult,
	});
}
