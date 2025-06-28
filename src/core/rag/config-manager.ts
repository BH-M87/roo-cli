/**
 * RAG configuration manager
 */

import { readGlobalSettings, writeGlobalSettings } from '../../config/settings';
import { RAGSettings } from '../../types';
import {
	VectorStoreType,
	VectorStoreConfigWithType,
} from './vector-store-factory';
import { logger } from '../../utils/logger';
import {
	createQdrantConfig,
	createInMemoryConfig,
	isConfigurationComplete,
	sanitizeCollectionName,
} from './utils';

/**
 * RAG configuration manager for handling settings
 */
export class RAGConfigManager {
	/**
	 * Get current RAG settings
	 * @returns Current RAG settings or default settings
	 */
	static async getRAGSettings(): Promise<RAGSettings> {
		try {
			const settings = await readGlobalSettings();

			if (settings.ragSettings) {
				return settings.ragSettings;
			}

			// Return default settings if none exist
			return {
				vectorStore: {
					type: 'in-memory',
					dimensions: 256,
				},
				autoIndexWorkspace: true,
				maxResultsPerQuery: 5,
				supportedFileTypes: [
					'js',
					'ts',
					'jsx',
					'tsx',
					'py',
					'java',
					'c',
					'cpp',
					'cs',
					'go',
					'rb',
					'php',
				],
			};
		} catch (error) {
			logger.error(`Failed to read RAG settings: ${error}`);
			throw error;
		}
	}

	/**
	 * Update RAG settings
	 * @param ragSettings New RAG settings
	 */
	static async updateRAGSettings(
		ragSettings: Partial<RAGSettings>,
	): Promise<void> {
		try {
			const currentSettings = await readGlobalSettings();
			const currentRAGSettings = await this.getRAGSettings();

			const updatedRAGSettings: RAGSettings = {
				...currentRAGSettings,
				...ragSettings,
				vectorStore: {
					...currentRAGSettings.vectorStore,
					...ragSettings.vectorStore,
				},
			};

			await writeGlobalSettings({
				...currentSettings,
				ragSettings: updatedRAGSettings,
			});

			logger.info('RAG settings updated successfully');
		} catch (error) {
			logger.error(`Failed to update RAG settings: ${error}`);
			throw error;
		}
	}

	/**
	 * Configure Qdrant vector store
	 * @param url Qdrant server URL
	 * @param collectionName Collection name
	 * @param options Additional options
	 */
	static async configureQdrant(
		url: string,
		collectionName: string,
		options: {
			dimensions?: number;
			apiKey?: string;
		} = {},
	): Promise<void> {
		const sanitizedName = sanitizeCollectionName(collectionName);

		await this.updateRAGSettings({
			vectorStore: {
				type: 'qdrant',
				url,
				collectionName: sanitizedName,
				dimensions: options.dimensions || 1536,
				apiKey: options.apiKey,
			},
		});

		logger.info(`Configured Qdrant vector store: ${url}/${sanitizedName}`);
	}

	/**
	 * Configure in-memory vector store
	 * @param dimensions Vector dimensions
	 */
	static async configureInMemory(dimensions: number = 256): Promise<void> {
		await this.updateRAGSettings({
			vectorStore: {
				type: 'in-memory',
				dimensions,
			},
		});

		logger.info(
			`Configured in-memory vector store with ${dimensions} dimensions`,
		);
	}

	/**
	 * Enable or disable RAG functionality
	 * @param enabled Whether RAG should be enabled
	 */
	static async setRAGEnabled(enabled: boolean): Promise<void> {
		const currentSettings = await readGlobalSettings();

		await writeGlobalSettings({
			...currentSettings,
			ragEnabled: enabled,
		});

		logger.info(`RAG ${enabled ? 'enabled' : 'disabled'}`);
	}

	/**
	 * Get vector store configuration from settings
	 * @returns Vector store configuration
	 */
	static async getVectorStoreConfig(): Promise<VectorStoreConfigWithType> {
		const ragSettings = await this.getRAGSettings();
		const vectorStoreSettings = ragSettings.vectorStore;

		if (vectorStoreSettings.type === 'qdrant') {
			return createQdrantConfig(
				vectorStoreSettings.url || 'http://localhost:6333',
				vectorStoreSettings.collectionName || 'roo-code',
				{
					dimensions: vectorStoreSettings.dimensions,
					apiKey: vectorStoreSettings.apiKey,
				},
			);
		} else {
			return createInMemoryConfig(vectorStoreSettings.dimensions || 256);
		}
	}

	/**
	 * Validate current vector store configuration
	 * @returns Validation result
	 */
	static async validateConfiguration(): Promise<{
		isValid: boolean;
		errors: string[];
		warnings: string[];
	}> {
		const errors: string[] = [];
		const warnings: string[] = [];

		try {
			const config = await this.getVectorStoreConfig();

			if (!isConfigurationComplete(config)) {
				errors.push('Vector store configuration is incomplete');
			}

			if (config.type === VectorStoreType.QDRANT) {
				if (!config.url) {
					errors.push('Qdrant URL is required');
				}
				if (!config.collectionName) {
					errors.push('Qdrant collection name is required');
				}
				if (!config.apiKey) {
					warnings.push(
						'Qdrant API key is not set (may be required for production)',
					);
				}
			}

			if (config.dimensions && config.dimensions < 1) {
				errors.push('Vector dimensions must be positive');
			}

			return {
				isValid: errors.length === 0,
				errors,
				warnings,
			};
		} catch (error) {
			return {
				isValid: false,
				errors: [`Configuration validation failed: ${error}`],
				warnings: [],
			};
		}
	}

	/**
	 * Reset RAG settings to defaults
	 */
	static async resetToDefaults(): Promise<void> {
		await this.updateRAGSettings({
			vectorStore: {
				type: 'in-memory',
				dimensions: 256,
			},
			autoIndexWorkspace: true,
			maxResultsPerQuery: 5,
			supportedFileTypes: [
				'js',
				'ts',
				'jsx',
				'tsx',
				'py',
				'java',
				'c',
				'cpp',
				'cs',
				'go',
				'rb',
				'php',
			],
		});

		logger.info('RAG settings reset to defaults');
	}

	/**
	 * Export current configuration for backup
	 * @returns Configuration object
	 */
	static async exportConfiguration(): Promise<RAGSettings> {
		return await this.getRAGSettings();
	}

	/**
	 * Import configuration from backup
	 * @param config Configuration to import
	 */
	static async importConfiguration(config: RAGSettings): Promise<void> {
		await this.updateRAGSettings(config);
		logger.info('RAG configuration imported successfully');
	}
}
