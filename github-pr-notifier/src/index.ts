/**
 * GitHub PR Notifier
 * 
 * Main entry point for the webhook server
 * Phase 1: Foundation - Webhook server with core services
 */

import { GitHubService } from './services/github/GitHubService';
import { DiscordService } from './services/discord/DiscordService';
import { InMemoryStateService } from './services/state/InMemoryStateService';
import { FileStateService } from './services/state/FileStateService';
import { MessageTemplateService } from './services/templates/MessageTemplateService';
import { PRCoordinator } from './coordinators/pr/PRCoordinator';
import { NotificationManager } from './coordinators/pr/managers/NotificationManager';
import { UserMappingManager } from './coordinators/pr/managers/UserMappingManager';
import { IStateService } from './services/state/interfaces/IStateService';
import { createServer, startServer } from './webhooks/server';
import { config, validateConfig, loadUserMappings } from './config/config';
import { logger } from './utils/logger';
import path from 'path';

/**
 * Initialize and start the application
 */
async function main() {
  try {
    logger.info('Starting GitHub PR Notifier...');

    // Validate configuration
    validateConfig();
    logger.info('Configuration validated');

    // Initialize services
    const githubService = new GitHubService();
    logger.info('GitHubService initialized');

    // Initialize state service based on config
    let stateService: IStateService;
    if (config.state.type === 'file') {
      const fileStateService = new FileStateService(config.state.filePath);
      await fileStateService.init();
      stateService = fileStateService;
      logger.info(`FileStateService initialized (${config.state.filePath})`);
    } else {
      stateService = new InMemoryStateService();
      logger.info('InMemoryStateService initialized');
    }

    // Initialize template service
    const templateService = new MessageTemplateService();
    const templatePath = path.join(
      config.templates.path,
      'discord-messages.json'
    );
    await templateService.loadTemplates(templatePath);
    logger.info('MessageTemplateService initialized');

    // Initialize Discord service (if configured)
    let prCoordinator: PRCoordinator | undefined;

    if (config.discord.botToken && config.discord.channelId) {
      // Initialize Discord service
      const discordService = new DiscordService(config.discord.botToken);
      await discordService.init();
      logger.info('DiscordService initialized');

      // Load user mappings
      const userMappings = await loadUserMappings();
      logger.info(`Loaded ${Object.keys(userMappings).length} user mappings`);

      // Initialize managers
      const userMappingManager = new UserMappingManager(userMappings);
      const notificationManager = new NotificationManager(
        templateService,
        userMappingManager
      );

      // Initialize PRCoordinator
      prCoordinator = new PRCoordinator(
        stateService,
        discordService,
        notificationManager,
        userMappingManager,
        config.discord.channelId
      );
      logger.info('PRCoordinator initialized');
    } else {
      logger.warn('Discord not configured - running in webhook-only mode');
    }

    // Create and start server
    const app = createServer(githubService, stateService, prCoordinator);
    startServer(app);

    // Handle graceful shutdown
    const discordService = prCoordinator
      ? ((prCoordinator as any).discordService as DiscordService)
      : undefined;
    setupGracefulShutdown(stateService, discordService);

    logger.info('GitHub PR Notifier started successfully');
  } catch (error) {
    logger.error(`Failed to start application: ${(error as Error).message}`);
    process.exit(1);
  }
}

/**
 * Set up graceful shutdown handlers
 */
function setupGracefulShutdown(
  stateService: IStateService,
  discordService?: DiscordService
) {
  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}, shutting down gracefully...`);

    try {
      // Cleanup Discord service
      if (discordService) {
        await discordService.cleanup();
        logger.info('Discord service cleaned up');
      }

      // Flush state if using FileStateService
      if (stateService instanceof FileStateService) {
        await stateService.cleanup();
        logger.info('State flushed to disk');
      }

      logger.info('Shutdown complete');
      process.exit(0);
    } catch (error) {
      logger.error(`Error during shutdown: ${(error as Error).message}`);
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

// Start the application
main();
