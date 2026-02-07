import { PRData } from '../../../models/PRState';

/**
 * GitHub Service Interface
 * 
 * Responsibilities:
 * - Verify GitHub webhook signatures
 * - Parse GitHub webhook payloads
 * - Fetch PR data from GitHub REST API
 */
export interface IGitHubService {
  /**
   * Verify webhook signature from GitHub
   * 
   * @param payload - Raw webhook payload (string)
   * @param signature - Signature from X-Hub-Signature-256 header
   * @param secret - Webhook secret
   * @returns true if signature is valid
   */
  verifyWebhookSignature(payload: string, signature: string, secret: string): boolean;

  /**
   * Parse GitHub webhook payload
   * 
   * @param payload - Raw webhook payload
   * @returns Parsed payload object
   */
  parseWebhookPayload<T>(payload: string): T;

  /**
   * Fetch PR data from GitHub REST API
   * Used for recovery when PR state is missing
   * 
   * @param owner - Repository owner
   * @param repo - Repository name
   * @param prNumber - PR number
   * @returns PR data with reviewers
   */
  fetchPR(owner: string, repo: string, prNumber: number): Promise<PRData & { reviewers: string[] }>;
}
