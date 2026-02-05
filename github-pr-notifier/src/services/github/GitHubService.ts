import crypto from 'crypto';
import { IGitHubService } from './interfaces/IGitHubService';

/**
 * GitHubService
 * 
 * Handles GitHub webhook verification and payload parsing
 */
export class GitHubService implements IGitHubService {
  /**
   * Verify webhook signature from GitHub
   * Uses HMAC SHA-256 to verify webhook authenticity
   */
  verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
    if (!signature) {
      return false;
    }

    // GitHub sends signature as "sha256=<hash>"
    const parts = signature.split('=');
    if (parts.length !== 2 || parts[0] !== 'sha256') {
      return false;
    }

    const receivedSignature = parts[1];

    // Calculate expected signature
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(payload, 'utf8');
    const expectedSignature = hmac.digest('hex');

    // Validate signature is valid hex and same length
    if (receivedSignature.length !== expectedSignature.length) {
      return false;
    }

    try {
      // Constant-time comparison to prevent timing attacks
      return crypto.timingSafeEqual(
        Buffer.from(receivedSignature, 'hex'),
        Buffer.from(expectedSignature, 'hex')
      );
    } catch {
      // Invalid hex format
      return false;
    }
  }

  /**
   * Parse GitHub webhook payload
   */
  parseWebhookPayload<T>(payload: string): T {
    try {
      return JSON.parse(payload) as T;
    } catch (error) {
      throw new Error(`Failed to parse webhook payload: ${(error as Error).message}`);
    }
  }
}
