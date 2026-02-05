import express, { Express } from 'express';
import { IGitHubService } from '../services/github/interfaces/IGitHubService';
import { IStateService } from '../services/state/interfaces/IStateService';
import { PRCoordinator } from '../coordinators/pr/PRCoordinator';
import { createVerifySignatureMiddleware } from './middleware/verifySignature';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { createWebhookRoutes } from './routes';
import { config } from '../config/config';
import { logger } from '../utils/logger';

/**
 * Create and configure Express server
 */
export function createServer(
  githubService: IGitHubService,
  stateService: IStateService,
  prCoordinator?: PRCoordinator
): Express {
  const app = express();

  // Parse JSON bodies
  app.use(express.json());

  // Create routes
  const routes = createWebhookRoutes(githubService, stateService, prCoordinator);

  // Apply signature verification middleware to webhook endpoint only
  routes.use(
    '/webhook/github',
    createVerifySignatureMiddleware(githubService)
  );

  // Mount routes
  app.use(routes);

  // 404 handler
  app.use(notFoundHandler);

  // Error handler (must be last)
  app.use(errorHandler);

  return app;
}

/**
 * Start the server
 */
export function startServer(app: Express): void {
  const port = config.server.port;

  app.listen(port, () => {
    logger.info(`Server listening on port ${port}`);
    logger.info(`Environment: ${config.server.nodeEnv}`);
    logger.info(`Health check: http://localhost:${port}/health`);
    logger.info(`Webhook endpoint: http://localhost:${port}/webhook/github`);
  });
}
