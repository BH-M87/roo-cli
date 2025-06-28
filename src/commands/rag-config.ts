#!/usr/bin/env node

/**
 * RAG configuration command
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { RAGConfigManager } from '../core/rag/config-manager';
import { logger } from '../utils/logger';

/**
 * Create RAG configuration command
 */
export function createRAGConfigCommand(): Command {
  const ragCommand = new Command('rag');
  ragCommand.description('Manage RAG (Retrieval-Augmented Generation) configuration');

  // Show current configuration
  ragCommand
    .command('status')
    .description('Show current RAG configuration')
    .action(async () => {
      try {
        const settings = await RAGConfigManager.getRAGSettings();
        const validation = await RAGConfigManager.validateConfiguration();

        console.log(chalk.blue('\n📊 RAG Configuration Status\n'));
        
        console.log(chalk.yellow('Vector Store:'));
        console.log(`  Type: ${settings.vectorStore.type}`);
        console.log(`  Dimensions: ${settings.vectorStore.dimensions || 'default'}`);
        
        if (settings.vectorStore.type === 'qdrant') {
          console.log(`  URL: ${settings.vectorStore.url || 'not set'}`);
          console.log(`  Collection: ${settings.vectorStore.collectionName || 'not set'}`);
          console.log(`  API Key: ${settings.vectorStore.apiKey ? '***set***' : 'not set'}`);
        }

        console.log(chalk.yellow('\nGeneral Settings:'));
        console.log(`  Auto Index Workspace: ${settings.autoIndexWorkspace}`);
        console.log(`  Max Results Per Query: ${settings.maxResultsPerQuery}`);
        console.log(`  Supported File Types: ${settings.supportedFileTypes.join(', ')}`);

        console.log(chalk.yellow('\nValidation:'));
        if (validation.isValid) {
          console.log(chalk.green('✅ Configuration is valid'));
        } else {
          console.log(chalk.red('❌ Configuration has errors:'));
          validation.errors.forEach(error => console.log(chalk.red(`  - ${error}`)));
        }

        if (validation.warnings.length > 0) {
          console.log(chalk.yellow('⚠️  Warnings:'));
          validation.warnings.forEach(warning => console.log(chalk.yellow(`  - ${warning}`)));
        }

      } catch (error) {
        console.error(chalk.red('Failed to get RAG status:'), error);
        process.exit(1);
      }
    });

  // Configure Qdrant
  ragCommand
    .command('configure-qdrant')
    .description('Configure Qdrant vector store')
    .requiredOption('-u, --url <url>', 'Qdrant server URL')
    .requiredOption('-c, --collection <name>', 'Collection name')
    .option('-d, --dimensions <number>', 'Vector dimensions', '1536')
    .option('-k, --api-key <key>', 'API key')
    .action(async (options) => {
      try {
        await RAGConfigManager.configureQdrant(
          options.url,
          options.collection,
          {
            dimensions: parseInt(options.dimensions),
            apiKey: options.apiKey,
          }
        );

        console.log(chalk.green('✅ Qdrant configuration updated successfully'));
        console.log(chalk.blue(`   URL: ${options.url}`));
        console.log(chalk.blue(`   Collection: ${options.collection}`));
        console.log(chalk.blue(`   Dimensions: ${options.dimensions}`));

      } catch (error) {
        console.error(chalk.red('Failed to configure Qdrant:'), error);
        process.exit(1);
      }
    });

  // Configure in-memory
  ragCommand
    .command('configure-memory')
    .description('Configure in-memory vector store')
    .option('-d, --dimensions <number>', 'Vector dimensions', '256')
    .action(async (options) => {
      try {
        await RAGConfigManager.configureInMemory(parseInt(options.dimensions));

        console.log(chalk.green('✅ In-memory configuration updated successfully'));
        console.log(chalk.blue(`   Dimensions: ${options.dimensions}`));

      } catch (error) {
        console.error(chalk.red('Failed to configure in-memory store:'), error);
        process.exit(1);
      }
    });

  // Enable/disable RAG
  ragCommand
    .command('enable')
    .description('Enable RAG functionality')
    .action(async () => {
      try {
        await RAGConfigManager.setRAGEnabled(true);
        console.log(chalk.green('✅ RAG functionality enabled'));
      } catch (error) {
        console.error(chalk.red('Failed to enable RAG:'), error);
        process.exit(1);
      }
    });

  ragCommand
    .command('disable')
    .description('Disable RAG functionality')
    .action(async () => {
      try {
        await RAGConfigManager.setRAGEnabled(false);
        console.log(chalk.yellow('⚠️  RAG functionality disabled'));
      } catch (error) {
        console.error(chalk.red('Failed to disable RAG:'), error);
        process.exit(1);
      }
    });

  // Validate configuration
  ragCommand
    .command('validate')
    .description('Validate current RAG configuration')
    .action(async () => {
      try {
        const validation = await RAGConfigManager.validateConfiguration();

        if (validation.isValid) {
          console.log(chalk.green('✅ RAG configuration is valid'));
        } else {
          console.log(chalk.red('❌ RAG configuration has errors:'));
          validation.errors.forEach(error => console.log(chalk.red(`  - ${error}`)));
          process.exit(1);
        }

        if (validation.warnings.length > 0) {
          console.log(chalk.yellow('⚠️  Warnings:'));
          validation.warnings.forEach(warning => console.log(chalk.yellow(`  - ${warning}`)));
        }

      } catch (error) {
        console.error(chalk.red('Failed to validate configuration:'), error);
        process.exit(1);
      }
    });

  // Reset to defaults
  ragCommand
    .command('reset')
    .description('Reset RAG configuration to defaults')
    .action(async () => {
      try {
        await RAGConfigManager.resetToDefaults();
        console.log(chalk.green('✅ RAG configuration reset to defaults'));
      } catch (error) {
        console.error(chalk.red('Failed to reset configuration:'), error);
        process.exit(1);
      }
    });

  // Export configuration
  ragCommand
    .command('export')
    .description('Export RAG configuration to JSON')
    .option('-f, --file <path>', 'Output file path')
    .action(async (options) => {
      try {
        const config = await RAGConfigManager.exportConfiguration();
        const configJson = JSON.stringify(config, null, 2);

        if (options.file) {
          const fs = await import('fs-extra');
          await fs.writeFile(options.file, configJson);
          console.log(chalk.green(`✅ Configuration exported to ${options.file}`));
        } else {
          console.log(configJson);
        }

      } catch (error) {
        console.error(chalk.red('Failed to export configuration:'), error);
        process.exit(1);
      }
    });

  // Import configuration
  ragCommand
    .command('import')
    .description('Import RAG configuration from JSON file')
    .requiredOption('-f, --file <path>', 'Input file path')
    .action(async (options) => {
      try {
        const fs = await import('fs-extra');
        const configJson = await fs.readFile(options.file, 'utf-8');
        const config = JSON.parse(configJson);

        await RAGConfigManager.importConfiguration(config);
        console.log(chalk.green(`✅ Configuration imported from ${options.file}`));

      } catch (error) {
        console.error(chalk.red('Failed to import configuration:'), error);
        process.exit(1);
      }
    });

  return ragCommand;
}

// If this file is run directly
if (require.main === module) {
  const ragCommand = createRAGConfigCommand();
  ragCommand.parse(process.argv);
}
