import { QdrantClient } from '@qdrant/js-client-rest';
import { VectorStore, QdrantConfig, SearchResult } from '../types';
import { logger } from '../../../utils/logger';

// Type definitions for Qdrant responses
interface QdrantCollection {
	name: string;
}

/**
 * Qdrant vector store implementation
 */
export class QdrantVectorStore implements VectorStore {
	private client: QdrantClient;
	private collectionName: string;
	private config: QdrantConfig;

	constructor(config: QdrantConfig) {
		this.config = config;
		this.collectionName = config.collectionName;

		this.client = new QdrantClient({
			url: config.url,
			apiKey: config.apiKey,
		});
	}

	async initialize(): Promise<void> {
		try {
			// Check if collection exists, create if not
			const collections = await this.client.getCollections();
			const collectionExists = collections.collections.some(
				(collection: QdrantCollection) =>
					collection.name === this.collectionName,
			);

			if (!collectionExists) {
				await this.client.createCollection(this.collectionName, {
					vectors: {
						size: this.config.dimensions || 1536,
						distance: 'Cosine',
					},
				});
				logger.info(`Created Qdrant collection: ${this.collectionName}`);
			} else {
				logger.info(`Using existing Qdrant collection: ${this.collectionName}`);
			}
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : String(error);
			logger.error(`Failed to connect to Qdrant: ${errorMessage}`);
			throw new Error(
				`qdrantConnectionFailed:${this.config.url}:${errorMessage}`,
			);
		}
	}

	async addVectors(
		vectors: number[][],
		metadata: Record<string, any>[],
	): Promise<string[]> {
		if (vectors.length !== metadata.length) {
			throw new Error('Vectors and metadata arrays must have the same length');
		}

		const points = vectors.map((vector, i) => ({
			id: metadata[i].id || crypto.randomUUID(),
			vector,
			payload: metadata[i],
		}));

		try {
			await this.client.upsert(this.collectionName, {
				points,
				wait: true,
			});

			logger.debug(
				`Added ${points.length} vectors to Qdrant collection: ${this.collectionName}`,
			);
			return points.map(point => point.id.toString());
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : String(error);
			logger.error(`Failed to add vectors to Qdrant: ${errorMessage}`);
			throw error;
		}
	}

	async search(
		queryVector: number[],
		limit: number = 5,
	): Promise<SearchResult[]> {
		try {
			const results = await this.client.search(this.collectionName, {
				vector: queryVector,
				limit,
				with_payload: true,
			});

			return results.map((result: any) => ({
				id: result.id.toString(),
				score: result.score,
				metadata: (result.payload || {}) as Record<string, any>,
			}));
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : String(error);
			logger.error(`Failed to search vectors in Qdrant: ${errorMessage}`);
			throw error;
		}
	}

	async deleteByIds(ids: string[]): Promise<void> {
		try {
			await this.client.delete(this.collectionName, {
				points: ids,
				wait: true,
			});

			logger.debug(
				`Deleted ${ids.length} vectors from Qdrant collection: ${this.collectionName}`,
			);
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : String(error);
			logger.error(`Failed to delete vectors from Qdrant: ${errorMessage}`);
			throw error;
		}
	}

	async deleteAll(): Promise<void> {
		try {
			// Delete the entire collection and recreate it
			await this.client.deleteCollection(this.collectionName);
			await this.initialize();

			logger.info(
				`Cleared all vectors from Qdrant collection: ${this.collectionName}`,
			);
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : String(error);
			logger.error(`Failed to clear Qdrant collection: ${errorMessage}`);
			throw error;
		}
	}
}
