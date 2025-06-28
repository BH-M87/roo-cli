import { v4 as uuidv4 } from 'uuid';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { safeWriteJson } from '../utils/safe-write-json';

/**
 * 消息类型
 */
export enum MessageRole {
	SYSTEM = 'system',
	USER = 'user',
	ASSISTANT = 'assistant',
	TOOL = 'tool',
}

/**
 * 消息接口
 */
export interface Message {
	role: MessageRole;
	content: string;
}

/**
 * 任务接口
 */
export interface Task {
	id: string;
	messages: Message[];
	mode: string;
	cwd: string;
	createdAt: number;
	updatedAt: number;
}

/**
 * 任务管理器
 */
export class TaskManager {
	private tasksDir: string;
	private currentTask: Task | null = null;

	/**
	 * 构造函数
	 */
	constructor() {
		this.tasksDir = path.join(os.homedir(), '.roo-cli', 'tasks');
		fs.ensureDirSync(this.tasksDir);
	}

	/**
	 * 创建新任务
	 * @param mode 模式
	 * @param cwd 工作目录
	 * @param systemPrompt 系统提示
	 * @returns 任务ID
	 */
	async createTask(
		mode: string,
		cwd: string,
		systemPrompt: string,
	): Promise<string> {
		const taskId = uuidv4();
		const now = Date.now();

		const task: Task = {
			id: taskId,
			messages: [
				{
					role: MessageRole.SYSTEM,
					content: systemPrompt,
				},
			],
			mode,
			cwd,
			createdAt: now,
			updatedAt: now,
		};

		this.currentTask = task;
		await this.saveTask(task);

		return taskId;
	}

	/**
	 * 获取任务
	 * @param taskId 任务ID
	 * @returns 任务
	 */
	getTask(taskId: string): Task | null {
		if (this.currentTask && this.currentTask.id === taskId) {
			return this.currentTask;
		}

		const taskPath = path.join(this.tasksDir, `${taskId}.json`);

		if (fs.existsSync(taskPath)) {
			const taskData = fs.readJsonSync(taskPath);
			this.currentTask = taskData;
			return taskData;
		}

		return null;
	}

	/**
	 * 添加用户消息
	 * @param taskId 任务ID
	 * @param content 消息内容
	 * @returns 更新后的任务
	 */
	async addUserMessage(taskId: string, content: string): Promise<Task | null> {
		const task = this.getTask(taskId);

		if (!task) {
			return null;
		}

		task.messages.push({
			role: MessageRole.USER,
			content,
		});

		task.updatedAt = Date.now();
		await this.saveTask(task);

		return task;
	}

	/**
	 * 添加助手消息
	 * @param taskId 任务ID
	 * @param content 消息内容
	 * @returns 更新后的任务
	 */
	async addAssistantMessage(
		taskId: string,
		content: string,
	): Promise<Task | null> {
		const task = this.getTask(taskId);

		if (!task) {
			return null;
		}

		task.messages.push({
			role: MessageRole.ASSISTANT,
			content,
		});

		task.updatedAt = Date.now();
		await this.saveTask(task);

		return task;
	}

	/**
	 * 添加工具消息
	 * @param taskId 任务ID
	 * @param content 消息内容
	 * @returns 更新后的任务
	 */
	async addToolMessage(taskId: string, content: string): Promise<Task | null> {
		const task = this.getTask(taskId);

		if (!task) {
			return null;
		}

		task.messages.push({
			role: MessageRole.TOOL,
			content,
		});

		task.updatedAt = Date.now();
		await this.saveTask(task);

		return task;
	}

	/**
	 * 获取任务消息
	 * @param taskId 任务ID
	 * @returns 任务消息
	 */
	getMessages(taskId: string): Message[] {
		const task = this.getTask(taskId);

		if (!task) {
			return [];
		}

		return task.messages;
	}

	/**
	 * 获取任务工作目录
	 * @param taskId 任务ID
	 * @returns 工作目录
	 */
	getWorkingDirectory(taskId: string): string | null {
		const task = this.getTask(taskId);

		if (!task) {
			return null;
		}

		return task.cwd;
	}

	/**
	 * 获取任务模式
	 * @param taskId 任务ID
	 * @returns 模式
	 */
	getMode(taskId: string): string | null {
		const task = this.getTask(taskId);

		if (!task) {
			return null;
		}

		return task.mode;
	}

	/**
	 * 保存任务
	 * @param task 任务
	 */
	private async saveTask(task: Task): Promise<void> {
		const taskPath = path.join(this.tasksDir, `${task.id}.json`);
		await safeWriteJson(taskPath, task);
	}
}
