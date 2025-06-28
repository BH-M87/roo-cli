import { VectorStore, InMemoryConfig, SearchResult } from '../types';
import { logger } from '../../../utils/logger';

/**
 * Stored vector with metadata
 */
interface StoredVector {
  id: string;
  vector: number[];
  metadata: Record<string, any>;
}

/**
 * In-memory vector store implementation
 */
export class InMemoryVectorStore implements VectorStore {
  private vectors: StoredVector[] = [];
  private config: InMemoryConfig;

  constructor(config: InMemoryConfig) {
    this.config = config;
  }

  async initialize(): Promise<void> {
    // No initialization needed for in-memory store
    logger.debug('Initialized in-memory vector store');
  }

  async addVectors(vectors: number[][], metadata: Record<string, any>[]): Promise<string[]> {
    if (vectors.length !== metadata.length) {
      throw new Error('Vectors and metadata arrays must have the same length');
    }

    const ids: string[] = [];

    for (let i = 0; i < vectors.length; i++) {
      const id = metadata[i].id || crypto.randomUUID();
      
      // Check if vector with this ID already exists and update it
      const existingIndex = this.vectors.findIndex(v => v.id === id);
      
      if (existingIndex >= 0) {
        this.vectors[existingIndex] = {
          id,
          vector: vectors[i],
          metadata: metadata[i],
        };
      } else {
        this.vectors.push({
          id,
          vector: vectors[i],
          metadata: metadata[i],
        });
      }
      
      ids.push(id);
    }

    logger.debug(`Added ${vectors.length} vectors to in-memory store (total: ${this.vectors.length})`);
    return ids;
  }

  async search(queryVector: number[], limit: number = 5): Promise<SearchResult[]> {
    if (this.vectors.length === 0) {
      return [];
    }

    // Calculate cosine similarity for each stored vector
    const similarities = this.vectors.map(stored => ({
      ...stored,
      score: this.cosineSimilarity(queryVector, stored.vector),
    }));

    // Sort by similarity score (descending) and take top results
    similarities.sort((a, b) => b.score - a.score);
    const topResults = similarities.slice(0, limit);

    return topResults.map(result => ({
      id: result.id,
      score: result.score,
      metadata: result.metadata,
    }));
  }

  async deleteByIds(ids: string[]): Promise<void> {
    const initialLength = this.vectors.length;
    this.vectors = this.vectors.filter(vector => !ids.includes(vector.id));
    const deletedCount = initialLength - this.vectors.length;
    
    logger.debug(`Deleted ${deletedCount} vectors from in-memory store (remaining: ${this.vectors.length})`);
  }

  async deleteAll(): Promise<void> {
    const deletedCount = this.vectors.length;
    this.vectors = [];
    
    logger.debug(`Cleared all ${deletedCount} vectors from in-memory store`);
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Vectors must have the same length for similarity calculation');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Get the number of stored vectors
   */
  getVectorCount(): number {
    return this.vectors.length;
  }

  /**
   * Clear all vectors (synchronous version for testing)
   */
  clear(): void {
    this.vectors = [];
  }
}
