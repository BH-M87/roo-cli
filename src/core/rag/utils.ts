/**
 * RAG utility functions
 */

import { VectorStoreType, VectorStoreConfigWithType } from "./vector-store-factory"
import { logger } from "../../utils/logger"

/**
 * Create a default Qdrant configuration
 * @param url Qdrant server URL
 * @param collectionName Collection name
 * @param options Additional options
 * @returns Qdrant configuration
 */
export function createQdrantConfig(
	url: string,
	collectionName: string,
	options: {
		dimensions?: number
		apiKey?: string
	} = {},
): VectorStoreConfigWithType {
	return {
		type: VectorStoreType.QDRANT,
		url,
		collectionName,
		dimensions: options.dimensions || 1536,
		apiKey: options.apiKey,
	}
}

/**
 * Create a default in-memory configuration
 * @param dimensions Vector dimensions
 * @returns In-memory configuration
 */
export function createInMemoryConfig(dimensions: number = 256): VectorStoreConfigWithType {
	return {
		type: VectorStoreType.IN_MEMORY,
		dimensions,
	}
}

/**
 * Validate Qdrant connection URL
 * @param url URL to validate
 * @returns True if valid, false otherwise
 */
export function isValidQdrantUrl(url: string): boolean {
	try {
		const urlObj = new URL(url)
		return urlObj.protocol === "http:" || urlObj.protocol === "https:"
	} catch {
		return false
	}
}

/**
 * Generate a collection name based on workspace path
 * @param workspacePath Workspace path
 * @param prefix Optional prefix
 * @returns Collection name
 */
export function generateCollectionName(workspacePath: string, prefix: string = "roo-code"): string {
	// Create a safe collection name from workspace path
	const safeName = workspacePath
		.replace(/[^a-zA-Z0-9]/g, "_")
		.replace(/_+/g, "_")
		.replace(/^_|_$/g, "")
		.toLowerCase()

	return `${prefix}_${safeName}`
}

/**
 * Check if a vector store configuration is complete
 * @param config Vector store configuration
 * @returns True if complete, false otherwise
 */
export function isConfigurationComplete(config: VectorStoreConfigWithType): boolean {
	if (!config.type) {
		return false
	}

	if (config.type === VectorStoreType.QDRANT) {
		return !!(config.url && config.collectionName)
	}

	return true // In-memory store doesn't need additional config
}

/**
 * Get recommended dimensions for different embedding models
 * @param modelName Model name
 * @returns Recommended dimensions
 */
export function getRecommendedDimensions(modelName?: string): number {
	const dimensionMap: Record<string, number> = {
		"text-embedding-ada-002": 1536,
		"text-embedding-3-small": 1536,
		"text-embedding-3-large": 3072,
		"all-MiniLM-L6-v2": 384,
		"all-mpnet-base-v2": 768,
	}

	if (modelName && dimensionMap[modelName]) {
		return dimensionMap[modelName]
	}

	// Default dimension for most models
	return 1536
}

/**
 * Log vector store configuration for debugging
 * @param config Vector store configuration
 */
export function logVectorStoreConfig(config: VectorStoreConfigWithType): void {
	logger.debug(
		`Vector store configuration: type=${config.type}, dimensions=${config.dimensions}, hasUrl=${!!config.url}, hasApiKey=${!!config.apiKey}, hasCollectionName=${!!config.collectionName}`,
	)
}

/**
 * Sanitize collection name to be Qdrant-compatible
 * @param name Raw collection name
 * @returns Sanitized collection name
 */
export function sanitizeCollectionName(name: string): string {
	// Qdrant collection names must be alphanumeric with underscores and hyphens
	return name
		.toLowerCase()
		.replace(/[^a-z0-9_-]/g, "_")
		.replace(/_+/g, "_")
		.replace(/^_|_$/g, "")
		.substring(0, 63) // Qdrant has a 63 character limit
}

/**
 * Create a test configuration for development
 * @returns Test configuration
 */
export function createTestConfig(): VectorStoreConfigWithType {
	return createInMemoryConfig(256)
}

/**
 * Create a production Qdrant configuration with validation
 * @param url Qdrant server URL
 * @param collectionName Collection name
 * @param options Additional options
 * @returns Validated Qdrant configuration
 * @throws Error if configuration is invalid
 */
export function createProductionQdrantConfig(
	url: string,
	collectionName: string,
	options: {
		dimensions?: number
		apiKey?: string
	} = {},
): VectorStoreConfigWithType {
	if (!isValidQdrantUrl(url)) {
		throw new Error(`Invalid Qdrant URL: ${url}`)
	}

	const sanitizedName = sanitizeCollectionName(collectionName)
	if (!sanitizedName) {
		throw new Error(`Invalid collection name: ${collectionName}`)
	}

	const config = createQdrantConfig(url, sanitizedName, options)

	if (!isConfigurationComplete(config)) {
		throw new Error("Incomplete Qdrant configuration")
	}

	return config
}
