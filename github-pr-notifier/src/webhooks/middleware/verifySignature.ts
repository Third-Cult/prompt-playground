import { Request, Response, NextFunction } from 'express';
import { IGitHubService } from '../../services/github/interfaces/IGitHubService';
import { config } from '../../config/config';
import { logger } from '../../utils/logger';

/**
 * Middleware to verify GitHub webhook signature
 */
export function createVerifySignatureMiddleware(githubService: IGitHubService) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const signature = req.headers['x-hub-signature-256'] as string;
    const payload = JSON.stringify(req.body);

    if (!signature) {
      logger.warn('Webhook request missing signature header');
      res.status(401).json({ error: 'Missing signature header' });
      return;
    }

    const isValid = githubService.verifyWebhookSignature(
      payload,
      signature,
      config.github.webhookSecret
    );

    if (!isValid) {
      logger.warn('Invalid webhook signature');
      res.status(401).json({ error: 'Invalid signature' });
      return;
    }

    logger.debug('Webhook signature verified successfully');
    next();
  };
}
