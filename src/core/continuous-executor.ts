import { ApiConfig, TaskResult, StructuredExecutionResult } from "../types"
import { generateSystemPrompt } from "./prompts/system"
import { SingleStepExecutor } from "./single-step-executor"
import { StructuredOutputManager } from "../utils/structured-output"
import chalk from "chalk"
import { logger } from "../utils/logger"

/**
 * 连续执行器
 */
export class ContinuousExecutor {
	private singleStepExecutor?: SingleStepExecutor
	private taskId: string | undefined
	private maxSteps: number
	private systemPrompt: string
	private structuredOutputManager?: StructuredOutputManager
	private apiConfig?: ApiConfig
	private mode?: string
	private cwd?: string
	private rules?: string
	private auto?: boolean
	private customInstructions?: string
	private roleDefinition?: string
	private structuredOutput?: boolean
	private onStructuredUpdate?: (data: StructuredExecutionResult) => void

	/**
	 * 构造函数
	 * @param apiConfig API配置
	 * @param mode 模式
	 * @param cwd 工作目录
	 * @param maxSteps 最大步骤数
	 * @param auto 是否自动执行（不需要用户确认）
	 * @param rules 自定义规则
	 * @param customInstructions 自定义指令
	 * @param roleDefinition 自定义角色定义，用于覆盖默认角色定义
	 * @param taskId 任务ID
	 * @param onlyReturnLastResult 是否只返回最后一个结果
	 * @param structuredOutput 是否启用结构化输出
	 * @param onStructuredUpdate 结构化输出更新回调
	 */
	constructor(
		apiConfig: ApiConfig,
		mode: string,
		cwd: string,
		maxSteps: number = 1000,
		auto: boolean = false,
		rules?: string,
		customInstructions?: string,
		roleDefinition?: string,
		taskId?: string,
		private onlyReturnLastResult: boolean = false,
		structuredOutput: boolean = false,
		onStructuredUpdate?: (data: StructuredExecutionResult) => void,
	) {
		// Initialize with empty system prompt, will be set in initialize method
		this.systemPrompt = ""
		this.maxSteps = maxSteps
		this.taskId = taskId

		// Store constructor parameters for later initialization
		this.apiConfig = apiConfig
		this.mode = mode
		this.cwd = cwd
		this.rules = rules
		this.auto = auto
		this.customInstructions = customInstructions
		this.roleDefinition = roleDefinition
		this.structuredOutput = structuredOutput
		this.onStructuredUpdate = onStructuredUpdate

		// 初始化结构化输出管理器
		if (structuredOutput && taskId) {
			this.structuredOutputManager = new StructuredOutputManager(
				taskId,
				mode,
				cwd,
				{
					continuous: true,
					maxSteps,
					auto,
					onlyReturnLastResult,
				},
				onStructuredUpdate,
			)
		}
	}

	/**
	 * Initialize the executor with async system prompt generation
	 */
	async initialize(): Promise<void> {
		// Generate system prompt asynchronously
		this.systemPrompt = await generateSystemPrompt(
			this.cwd!,
			this.mode!,
			this.rules,
			this.auto!,
			this.customInstructions,
			this.roleDefinition,
		)

		// Create single step executor
		this.singleStepExecutor = new SingleStepExecutor(
			this.apiConfig!,
			this.mode!,
			this.cwd!,
			this.systemPrompt,
			this.taskId!,
			this.structuredOutput!,
			this.onStructuredUpdate,
		)
	}

	/**
	 * 执行任务
	 * @param prompt 提示
	 * @returns 任务结果
	 */
	async execute(prompt: string): Promise<TaskResult> {
		try {
			// Initialize if not already done
			if (!this.singleStepExecutor) {
				await this.initialize()
			}

			// 验证任务是否存在
			if (!this.taskId) {
				throw new Error("Task ID is required")
			}

			// 打印任务执行概要
			logger.progress(`Starting continuous execution (max steps: ${this.maxSteps})`)
			logger.debug(`Task ID: ${this.taskId}`)
			logger.debug(`Initial prompt: ${prompt}`)

			// 添加结构化日志
			if (this.structuredOutputManager) {
				this.structuredOutputManager.addLog(
					"progress",
					`Starting continuous execution (max steps: ${this.maxSteps})`,
				)
				this.structuredOutputManager.addLog("debug", `Task ID: ${this.taskId}`)
				this.structuredOutputManager.addLog("debug", `Initial prompt: ${prompt}`)
			}

			// 执行步骤
			let currentStep = 0
			let finalOutput = ""
			let result: { response: any; toolResult?: string } | undefined

			while (currentStep < this.maxSteps) {
				currentStep++
				logger.progress(`Executing step ${currentStep}/${this.maxSteps}`)

				// 开始新步骤（结构化输出）
				if (this.structuredOutputManager) {
					this.structuredOutputManager.startStep(currentStep)
				}

				try {
					// 使用单步执行器执行当前步骤
					// 只在第一步添加用户消息
					if (!this.singleStepExecutor) {
						throw new Error("Single step executor not initialized")
					}
					result = (await this.singleStepExecutor.execute(
						currentStep === 1 ? prompt : "", // 只在第一步传入用户提示
						true,
						currentStep === 1, // 只在第一步添加用户消息
					)) as { response: any; toolResult?: string }

					// 检查是否有工具调用
					if (result.toolResult) {
						// 显示工具执行概要
						logger.progress(`Tool execution completed`)

						// 详细信息放到 info 级别
						logger.info(chalk.cyan("Assistant Response:"))
						logger.info(result.response.text)
						logger.info(chalk.magenta("Tool Result:"))
						logger.info(result.toolResult)

						// 更新输出
						const stepOutput = `${result.response.text}\n\nTool Result:\n${result.toolResult}\n\n`
						finalOutput += stepOutput

						// 完成步骤（结构化输出）
						if (this.structuredOutputManager && result) {
							const toolResults = result.response.toolCalls
								? result.response.toolCalls.map((toolCall: any) => ({
										toolName: toolCall.name,
										params: toolCall.params,
										result: result!.toolResult!,
										success: true,
										duration: 0, // 这里可以添加实际的执行时间测量
									}))
								: []

							this.structuredOutputManager.completeStep(result.response, toolResults, stepOutput)
						}
					} else {
						// 没有工具调用，任务完成
						logger.success("Task completed without tool calls")
						logger.info("Final Response:")
						logger.info(result.response.text)
						finalOutput += result.response.text

						// 完成步骤（结构化输出）
						if (this.structuredOutputManager && result) {
							this.structuredOutputManager.completeStep(result.response, undefined, result.response.text)
						}
						break
					}
				} catch (stepError) {
					// 步骤执行失败
					const errorMessage = stepError instanceof Error ? stepError.message : String(stepError)
					logger.error(`Step ${currentStep} failed: ${errorMessage}`)

					if (this.structuredOutputManager) {
						this.structuredOutputManager.failStep(errorMessage)
					}
					throw stepError
				}
			}

			// 检查是否达到最大步骤数
			if (currentStep >= this.maxSteps) {
				logger.warn(`Reached maximum number of steps (${this.maxSteps})`)
				finalOutput += "\n\nNote: Reached maximum number of steps. Task may not be fully completed."

				if (this.structuredOutputManager) {
					this.structuredOutputManager.markMaxStepsReached()
				}
			}

			// 完成任务（结构化输出）
			const taskOutput = this.onlyReturnLastResult && result ? result.response.text : finalOutput

			if (this.structuredOutputManager) {
				this.structuredOutputManager.completeTask(true, taskOutput)
			}

			const taskResult: TaskResult = {
				taskId: this.taskId!,
				output: taskOutput,
				success: true,
			}

			// 添加结构化数据
			if (this.structuredOutputManager) {
				taskResult.structured = this.structuredOutputManager.getData()
			}

			return taskResult
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error)
			logger.error("Error executing task: " + errorMessage)

			// 完成任务（结构化输出）
			if (this.structuredOutputManager) {
				this.structuredOutputManager.completeTask(false, "", errorMessage)
			}

			const taskResult: TaskResult = {
				taskId: this.taskId!,
				output: "",
				success: false,
				error: errorMessage,
			}

			// 添加结构化数据
			if (this.structuredOutputManager) {
				taskResult.structured = this.structuredOutputManager.getData()
			}

			return taskResult
		}
	}
}
