/**
 * Vector store types and interfaces for RAG functionality
 */

/**
 * Base configuration for vector stores
 */
export interface VectorStoreConfig {
	dimensions?: number;
}

/**
 * Search result from vector store
 */
export interface SearchResult {
	id: string;
	score: number;
	metadata: Record<string, any>;
}

/**
 * Vector store interface
 */
export interface VectorStore {
	/**
	 * Initialize the vector store
	 */
	initialize(): Promise<void>;

	/**
	 * Add vectors to the store
	 * @param vectors Array of vector embeddings
	 * @param metadata Array of metadata objects corresponding to each vector
	 * @returns Array of IDs for the added vectors
	 */
	addVectors(
		vectors: number[][],
		metadata: Record<string, any>[],
	): Promise<string[]>;

	/**
	 * Search for similar vectors
	 * @param queryVector Query vector
	 * @param limit Maximum number of results to return
	 * @returns Array of search results
	 */
	search(queryVector: number[], limit?: number): Promise<SearchResult[]>;

	/**
	 * Delete vectors by their IDs
	 * @param ids Array of vector IDs to delete
	 */
	deleteByIds(ids: string[]): Promise<void>;

	/**
	 * Delete all vectors from the store
	 */
	deleteAll(): Promise<void>;
}

/**
 * Qdrant-specific configuration
 */
export interface QdrantConfig extends VectorStoreConfig {
	url: string;
	apiKey?: string;
	collectionName: string;
}

/**
 * In-memory vector store configuration
 */
export interface InMemoryConfig extends VectorStoreConfig {
	// No additional configuration needed for in-memory store
}
