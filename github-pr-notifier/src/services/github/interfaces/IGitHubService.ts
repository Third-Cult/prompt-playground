/**
 * GitHub Service Interface
 * 
 * Responsibilities:
 * - Verify GitHub webhook signatures
 * - Parse GitHub webhook payloads
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
}
