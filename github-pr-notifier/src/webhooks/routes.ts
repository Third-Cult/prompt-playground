import { Router, Request, Response } from 'express';
import { IGitHubService } from '../services/github/interfaces/IGitHubService';
import { IStateService } from '../services/state/interfaces/IStateService';
import { PRCoordinator } from '../coordinators/pr/PRCoordinator';
import {
  extractPRData,
  extractReviewers,
  isPROpenedEvent,
} from '../utils/githubPayloadParser';
import { logger } from '../utils/logger';

/**
 * Create webhook routes
 */
export function createWebhookRoutes(
  _githubService: IGitHubService,
  _stateService: IStateService,
  prCoordinator?: PRCoordinator
): Router {
  const router = Router();

  /**
   * Health check endpoint
   */
  router.get('/health', (_req: Request, res: Response) => {
    res.json({
      status: 'healthy',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * GitHub webhook endpoint
   * Receives all GitHub webhook events
   */
  router.post('/webhook/github', async (req: Request, res: Response) => {
    try {
      const event = req.headers['x-github-event'] as string;
      const deliveryId = req.headers['x-github-delivery'] as string;

      logger.info(`Received GitHub webhook: ${event}`, { deliveryId });

      // For Phase 1, we just acknowledge receipt
      // In Phase 2, we'll add PRCoordinator to handle events

      // Acknowledge receipt immediately
      res.status(200).json({ received: true });

      // Process webhook asynchronously (don't block response)
      processWebhook(event, req.body, prCoordinator).catch((error) => {
        logger.error(`Error processing webhook: ${error.message}`, {
          event,
          deliveryId,
        });
      });
    } catch (error) {
      logger.error(`Error handling webhook: ${(error as Error).message}`);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
}

/**
 * Process webhook asynchronously
 */
async function processWebhook(
  event: string,
  payload: any,
  prCoordinator?: PRCoordinator
): Promise<void> {
  logger.debug(`Processing webhook event: ${event}`, {
    action: payload.action,
    prNumber: payload.pull_request?.number,
  });

  // If no coordinator, just log (for Phase 1 compatibility)
  if (!prCoordinator) {
    logger.debug('No PRCoordinator configured, skipping processing');
    return;
  }

  // Handle pull_request events
  if (event === 'pull_request') {
    if (isPROpenedEvent(payload)) {
      const prData = extractPRData(payload);
      const reviewers = extractReviewers(payload);
      
      await prCoordinator.handlePROpened(prData, reviewers);
    }
    // Future: handle other PR events (edited, closed, etc.)
  }
}
