import { VectorStore, VectorStoreConfig, QdrantConfig, InMemoryConfig } from "./types"
import { InMemoryVectorStore } from "./vector-stores/in-memory"
import { QdrantVectorStore } from "./vector-stores/qdrant"
import { logger } from "../../utils/logger"

/**
 * Supported vector store types
 */
export enum VectorStoreType {
	IN_MEMORY = "in-memory",
	QDRANT = "qdrant",
}

/**
 * Vector store configuration with type
 */
export interface VectorStoreConfigWithType extends VectorStoreConfig {
	type: VectorStoreType
	url?: string
	apiKey?: string
	collectionName?: string
}

/**
 * Create a vector store instance based on the configuration
 * @param config Vector store configuration
 * @returns Vector store instance
 */
export function createVectorStore(config: VectorStoreConfigWithType): VectorStore {
	logger.debug(`Creating vector store of type: ${config.type}`)

	switch (config.type) {
		case VectorStoreType.IN_MEMORY:
			return new InMemoryVectorStore(config as InMemoryConfig)

		case VectorStoreType.QDRANT:
			const qdrantConfig = config as QdrantConfig & { type: VectorStoreType }

			// Validate required Qdrant configuration
			if (!qdrantConfig.url) {
				throw new Error("Qdrant URL is required for Qdrant vector store")
			}
			if (!qdrantConfig.collectionName) {
				throw new Error("Collection name is required for Qdrant vector store")
			}

			return new QdrantVectorStore(qdrantConfig)

		default:
			throw new Error(`Unsupported vector store type: ${config.type}`)
	}
}

/**
 * Create a default in-memory vector store
 * @param dimensions Vector dimensions (default: 256)
 * @returns In-memory vector store instance
 */
export function createDefaultVectorStore(dimensions: number = 256): VectorStore {
	return createVectorStore({
		type: VectorStoreType.IN_MEMORY,
		dimensions,
	})
}

/**
 * Create a Qdrant vector store with the given configuration
 * @param url Qdrant server URL
 * @param collectionName Collection name
 * @param dimensions Vector dimensions
 * @param apiKey Optional API key
 * @returns Qdrant vector store instance
 */
export function createQdrantVectorStore(
	url: string,
	collectionName: string,
	dimensions: number = 1536,
	apiKey?: string,
): VectorStore {
	return createVectorStore({
		type: VectorStoreType.QDRANT,
		url,
		collectionName,
		dimensions,
		apiKey,
	})
}

/**
 * Validate vector store configuration
 * @param config Vector store configuration
 * @throws Error if configuration is invalid
 */
export function validateVectorStoreConfig(config: VectorStoreConfigWithType): void {
	if (!config.type) {
		throw new Error("Vector store type is required")
	}

	if (!Object.values(VectorStoreType).includes(config.type)) {
		throw new Error(`Invalid vector store type: ${config.type}`)
	}

	if (config.dimensions && (config.dimensions <= 0 || !Number.isInteger(config.dimensions))) {
		throw new Error("Vector dimensions must be a positive integer")
	}

	if (config.type === VectorStoreType.QDRANT) {
		const qdrantConfig = config as QdrantConfig & { type: VectorStoreType }

		if (!qdrantConfig.url) {
			throw new Error("Qdrant URL is required")
		}

		if (!qdrantConfig.collectionName) {
			throw new Error("Qdrant collection name is required")
		}

		// Validate URL format
		try {
			new URL(qdrantConfig.url)
		} catch {
			throw new Error("Invalid Qdrant URL format")
		}
	}
}
