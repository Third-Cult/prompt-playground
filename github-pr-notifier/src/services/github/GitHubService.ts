import crypto from 'crypto';
import { Octokit } from '@octokit/rest';
import { App } from '@octokit/app';
import { IGitHubService } from './interfaces/IGitHubService';
import { PRData } from '../../models/PRState';
import { logger } from '../../utils/logger';

export interface GitHubAppConfig {
  appId: string;
  privateKey: string;
  installationId: string;
}

/**
 * GitHubService
 * 
 * Handles GitHub webhook verification, payload parsing, and REST API calls
 * Supports both Personal Access Token and GitHub App authentication
 */
export class GitHubService implements IGitHubService {
  private octokit: Octokit | null = null;
  private app: App | null = null;
  private authMethod: 'none' | 'token' | 'app' = 'none';

  constructor(githubToken?: string, githubAppConfig?: GitHubAppConfig) {
    // Prioritize GitHub App over PAT
    if (githubAppConfig && githubAppConfig.appId && githubAppConfig.privateKey) {
      // Note: Async initialization - octokit may not be immediately available
      this.initializeGitHubApp(githubAppConfig);
    } else if (githubToken) {
      this.initializeWithToken(githubToken);
    }
  }

  /**
   * Wait for async initialization to complete (for GitHub App)
   * Returns immediately if using PAT or no auth
   */
  async waitForInitialization(): Promise<void> {
    if (this.authMethod === 'app' && !this.octokit) {
      // If GitHub App is being initialized, wait a moment for it to complete
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  /**
   * Initialize with Personal Access Token
   */
  private initializeWithToken(token: string): void {
    this.octokit = new Octokit({
      auth: token,
    });
    this.authMethod = 'token';
    logger.info('GitHub Service initialized with Personal Access Token');
  }

  /**
   * Initialize with GitHub App
   */
  private async initializeGitHubApp(config: GitHubAppConfig): Promise<void> {
    try {
      this.app = new App({
        appId: config.appId,
        privateKey: config.privateKey,
      });

      // Get installation-specific Octokit instance
      if (config.installationId) {
        this.octokit = (await this.app.getInstallationOctokit(parseInt(config.installationId, 10))) as unknown as Octokit;
        this.authMethod = 'app';
        logger.info(`GitHub Service initialized with GitHub App (Installation ID: ${config.installationId})`);
      } else {
        logger.warn('GitHub App configured but missing installation ID. API calls will fail.');
      }
    } catch (error) {
      logger.error(`Failed to initialize GitHub App: ${(error as Error).message}`);
      this.authMethod = 'none';
    }
  }

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

  /**
   * Get current authentication method
   */
  getAuthMethod(): 'none' | 'token' | 'app' {
    return this.authMethod;
  }

  /**
   * Check if GitHub API is available
   */
  isAPIAvailable(): boolean {
    return this.octokit !== null;
  }

  /**
   * Fetch PR data from GitHub REST API
   * Used for recovery when PR state is missing
   */
  async fetchPR(owner: string, repo: string, prNumber: number): Promise<PRData & { reviewers: string[] }> {
    if (!this.octokit) {
      throw new Error('GitHub authentication not configured. Cannot fetch PR data from API. Configure GITHUB_TOKEN or GITHUB_APP credentials.');
    }

    try {
      logger.info(`Fetching PR data from GitHub API: ${owner}/${repo}#${prNumber}`);

      // Fetch PR details
      const { data: pr } = await this.octokit.pulls.get({
        owner,
        repo,
        pull_number: prNumber,
      });

      // Fetch requested reviewers
      const { data: reviewRequests } = await this.octokit.pulls.listRequestedReviewers({
        owner,
        repo,
        pull_number: prNumber,
      });

      const reviewers = reviewRequests.users.map((user) => user.login);

      logger.debug(`Fetched PR #${prNumber}: ${pr.title} with ${reviewers.length} reviewers`);

      return {
        number: pr.number,
        title: pr.title,
        description: pr.body || '',
        author: pr.user?.login || 'unknown',
        branchName: pr.head.ref,
        baseBranch: pr.base.ref,
        url: pr.html_url,
        isDraft: pr.draft || false,
        repo,
        owner,
        reviewers,
      };
    } catch (error: any) {
      if (error.status === 404) {
        throw new Error(`PR #${prNumber} not found in ${owner}/${repo}`);
      }
      logger.error(`Failed to fetch PR from GitHub API: ${error.message}`);
      throw new Error(`Failed to fetch PR from GitHub API: ${error.message}`);
    }
  }
}
