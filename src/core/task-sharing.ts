import * as fs from 'fs/promises';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { safeWriteJson } from '../utils/safe-write-json';
import { logger } from '../utils/logger';

export interface ShareableTask {
	id: string;
	title: string;
	description?: string;
	mode: string;
	messages: Array<{
		role: string;
		content: string;
		timestamp?: number;
	}>;
	metadata: {
		createdAt: number;
		updatedAt: number;
		cwd: string;
		version: string;
	};
	visibility: 'public' | 'organization' | 'private';
	shareUrl?: string;
	shareId?: string;
}

export interface TaskShareConfig {
	apiEndpoint?: string;
	authToken?: string;
	defaultVisibility?: 'public' | 'organization' | 'private';
}

/**
 * Task sharing service for roo-cli
 */
export class TaskSharingService {
	private config: TaskShareConfig;
	private shareDir: string;

	constructor(config: TaskShareConfig = {}) {
		this.config = {
			defaultVisibility: 'organization',
			...config,
		};
		this.shareDir = path.join(
			process.env.HOME || '~',
			'.roo-cli',
			'shared-tasks',
		);
	}

	/**
	 * Initialize the sharing service
	 */
	async initialize(): Promise<void> {
		try {
			await fs.mkdir(this.shareDir, { recursive: true });
		} catch (error) {
			logger.error(
				`Failed to initialize task sharing service: ${error instanceof Error ? error.message : String(error)}`,
			);
			throw error;
		}
	}

	/**
	 * Share a task with specified visibility
	 * @param taskData Task data to share
	 * @param visibility Visibility level
	 * @returns Share result with URL
	 */
	async shareTask(
		taskData: any,
		visibility: 'public' | 'organization' | 'private' = 'organization',
	): Promise<{
		success: boolean;
		shareUrl?: string;
		shareId?: string;
		error?: string;
	}> {
		try {
			await this.initialize();

			// Generate share ID
			const shareId = uuidv4();

			// Generate default task name if not provided
			const title = this.generateDefaultTaskName(taskData);

			// Create shareable task object
			const shareableTask: ShareableTask = {
				id: taskData.id || uuidv4(),
				title,
				description: this.extractTaskDescription(taskData),
				mode: taskData.mode || 'code',
				messages: taskData.messages || [],
				metadata: {
					createdAt: taskData.createdAt || Date.now(),
					updatedAt: Date.now(),
					cwd: taskData.cwd || process.cwd(),
					version: '1.0.0',
				},
				visibility,
				shareId,
			};

			// Save locally first
			const shareFilePath = path.join(this.shareDir, `${shareId}.json`);
			await safeWriteJson(shareFilePath, shareableTask);

			// If API endpoint is configured, upload to cloud
			if (this.config.apiEndpoint && this.config.authToken) {
				const cloudResult = await this.uploadToCloud(shareableTask);
				if (cloudResult.success) {
					shareableTask.shareUrl = cloudResult.shareUrl;
					// Update local file with share URL
					await safeWriteJson(shareFilePath, shareableTask);

					logger.success(`Task shared successfully: ${cloudResult.shareUrl}`);
					return {
						success: true,
						shareUrl: cloudResult.shareUrl,
						shareId,
					};
				}
			}

			// Generate local share URL
			const localShareUrl = `file://${shareFilePath}`;
			shareableTask.shareUrl = localShareUrl;
			await safeWriteJson(shareFilePath, shareableTask);

			logger.success(`Task shared locally: ${localShareUrl}`);
			return {
				success: true,
				shareUrl: localShareUrl,
				shareId,
			};
		} catch (error) {
			logger.error(
				`Failed to share task: ${error instanceof Error ? error.message : String(error)}`,
			);
			return {
				success: false,
				error: error instanceof Error ? error.message : String(error),
			};
		}
	}

	/**
	 * Upload task to cloud service
	 * @param task Shareable task
	 * @returns Upload result
	 */
	private async uploadToCloud(
		task: ShareableTask,
	): Promise<{ success: boolean; shareUrl?: string; error?: string }> {
		try {
			if (!this.config.apiEndpoint || !this.config.authToken) {
				throw new Error('Cloud configuration not available');
			}

			const response = await fetch(
				`${this.config.apiEndpoint}/api/tasks/share`,
				{
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						Authorization: `Bearer ${this.config.authToken}`,
					},
					body: JSON.stringify(task),
				},
			);

			if (!response.ok) {
				throw new Error(`HTTP ${response.status}: ${response.statusText}`);
			}

			const result = await response.json();
			return {
				success: true,
				shareUrl: result.shareUrl,
			};
		} catch (error) {
			logger.debug(
				`Cloud upload failed: ${error instanceof Error ? error.message : String(error)}`,
			);
			return {
				success: false,
				error: error instanceof Error ? error.message : String(error),
			};
		}
	}

	/**
	 * Generate a default task name based on task content
	 * @param taskData Task data
	 * @returns Generated task name
	 */
	private generateDefaultTaskName(taskData: any): string {
		// Try to extract from first user message
		if (taskData.messages && taskData.messages.length > 0) {
			const firstUserMessage = taskData.messages.find(
				(msg: any) => msg.role === 'user',
			);
			if (firstUserMessage && firstUserMessage.content) {
				// Take first 50 characters and clean up
				const content = firstUserMessage.content.trim();
				const title =
					content.length > 50 ? content.substring(0, 47) + '...' : content;
				return title.replace(/\n/g, ' ').replace(/\s+/g, ' ');
			}
		}

		// Fallback to mode-based name with timestamp
		const mode = taskData.mode || 'code';
		const timestamp = new Date().toISOString().split('T')[0];
		return `${mode.charAt(0).toUpperCase() + mode.slice(1)} Task - ${timestamp}`;
	}

	/**
	 * Extract task description from task data
	 * @param taskData Task data
	 * @returns Task description
	 */
	private extractTaskDescription(taskData: any): string | undefined {
		if (taskData.messages && taskData.messages.length > 0) {
			const firstUserMessage = taskData.messages.find(
				(msg: any) => msg.role === 'user',
			);
			if (firstUserMessage && firstUserMessage.content) {
				const content = firstUserMessage.content.trim();
				return content.length > 200
					? content.substring(0, 197) + '...'
					: content;
			}
		}
		return undefined;
	}

	/**
	 * Get shared task by ID
	 * @param shareId Share ID
	 * @returns Shared task data
	 */
	async getSharedTask(shareId: string): Promise<ShareableTask | null> {
		try {
			const shareFilePath = path.join(this.shareDir, `${shareId}.json`);
			const data = await fs.readFile(shareFilePath, 'utf-8');
			return JSON.parse(data);
		} catch {
			return null;
		}
	}

	/**
	 * List all shared tasks
	 * @returns Array of shared tasks
	 */
	async listSharedTasks(): Promise<ShareableTask[]> {
		try {
			await this.initialize();
			const files = await fs.readdir(this.shareDir);
			const tasks: ShareableTask[] = [];

			for (const file of files) {
				if (file.endsWith('.json')) {
					try {
						const filePath = path.join(this.shareDir, file);
						const data = await fs.readFile(filePath, 'utf-8');
						const task = JSON.parse(data);
						tasks.push(task);
					} catch {
						// Skip invalid files
					}
				}
			}

			return tasks.sort((a, b) => b.metadata.updatedAt - a.metadata.updatedAt);
		} catch {
			return [];
		}
	}
}
