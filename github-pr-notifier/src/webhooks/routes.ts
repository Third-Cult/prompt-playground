import { Router, Request, Response } from 'express';
import { IGitHubService } from '../services/github/interfaces/IGitHubService';
import { IStateService } from '../services/state/interfaces/IStateService';
import { PRCoordinator } from '../coordinators/pr/PRCoordinator';
import {
  extractPRData,
  extractReviewers,
  extractClosedBy,
  isPROpenedEvent,
  isPRClosedEvent,
  isPRMerged,
  isPRConvertedToDraft,
  isPRReadyForReview,
  isPRReopenedEvent,
  isReviewRequestedEvent,
  isReviewRequestRemovedEvent,
  extractRequestedReviewer,
  extractPRNumber,
  extractReviewData,
  isReviewDismissed,
} from '../utils/githubPayloadParser';
import { logger } from '../utils/logger';

/**
 * Create webhook routes
 */
export function createWebhookRoutes(
  _githubService: IGitHubService,
  stateService: IStateService,
  prCoordinator?: PRCoordinator
): Router {
  const router = Router();

  /**
   * Health check endpoint with detailed monitoring
   */
  router.get('/health', async (_req: Request, res: Response) => {
    try {
      const memoryUsage = process.memoryUsage();
      const config = { stateStorageType: process.env.STATE_STORAGE_TYPE || 'memory' };
      
      const health: any = {
        status: 'healthy',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        node_version: process.version,
        memory: {
          rss_mb: Math.round(memoryUsage.rss / 1024 / 1024),
          heap_used_mb: Math.round(memoryUsage.heapUsed / 1024 / 1024),
          heap_total_mb: Math.round(memoryUsage.heapTotal / 1024 / 1024),
        },
        services: {
          state_storage: config.stateStorageType,
        },
      };

      // Get PR count from state service
      try {
        const allPRs = await stateService.getAllPRStates();
        health.services.pr_count = allPRs.length;
      } catch (err) {
        // Non-critical, skip
      }

      res.json(health);
    } catch (error) {
      res.status(500).json({
        status: 'unhealthy',
        error: (error as Error).message,
        timestamp: new Date().toISOString(),
      });
    }
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
    const prNumber = payload.pull_request?.number;

    if (isPROpenedEvent(payload)) {
      const prData = extractPRData(payload);
      const reviewers = extractReviewers(payload);
      await prCoordinator.handlePROpened(prData, reviewers);
    } else if (payload.action === 'edited') {
      // Handle PR edited (for issue changes in description)
      await prCoordinator.handlePREdited(prNumber, payload);
    } else if (isPRConvertedToDraft(payload)) {
      await prCoordinator.handlePRConvertedToDraft(prNumber, payload);
    } else if (isPRReadyForReview(payload)) {
      await prCoordinator.handlePRReadyForReview(prNumber, payload);
    } else if (isPRClosedEvent(payload)) {
      const closedBy = extractClosedBy(payload);
      const isMerged = isPRMerged(payload);
      await prCoordinator.handlePRClosed(prNumber, closedBy, isMerged);
    } else if (isPRReopenedEvent(payload)) {
      await prCoordinator.handlePRReopened(prNumber, payload);
    } else if (isReviewRequestedEvent(payload)) {
      const reviewer = extractRequestedReviewer(payload);
      await prCoordinator.handleReviewerAdded(prNumber, reviewer, payload);
    } else if (isReviewRequestRemovedEvent(payload)) {
      const reviewer = extractRequestedReviewer(payload);
      await prCoordinator.handleReviewerRemoved(prNumber, reviewer, payload);
    }
  }

  // Handle pull_request_review events (review submitted, dismissed)
  if (event === 'pull_request_review') {
    const prNumber = extractPRNumber(payload);
    const reviewData = extractReviewData(payload);

    if (isReviewDismissed(payload)) {
      await prCoordinator.handleReviewDismissed(prNumber, reviewData, payload);
    } else {
      // Handle approved, changes_requested, commented
      await prCoordinator.handleReviewSubmitted(prNumber, reviewData, payload);
    }
  }
}
