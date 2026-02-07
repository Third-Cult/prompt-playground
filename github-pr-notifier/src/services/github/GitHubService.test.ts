import { GitHubService } from './GitHubService';
import crypto from 'crypto';
import { getMockOctokit } from '../../__mocks__/@octokit/rest';

// Mock @octokit modules
jest.mock('@octokit/rest');
jest.mock('@octokit/app');

describe('GitHubService', () => {
  let service: GitHubService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new GitHubService();
  });

  describe('verifyWebhookSignature', () => {
    const secret = 'test-secret';
    const payload = JSON.stringify({ test: 'data' });

    function generateValidSignature(payload: string, secret: string): string {
      const hmac = crypto.createHmac('sha256', secret);
      hmac.update(payload, 'utf8');
      return `sha256=${hmac.digest('hex')}`;
    }

    it('returns true for valid signature', () => {
      const signature = generateValidSignature(payload, secret);

      const result = service.verifyWebhookSignature(payload, signature, secret);

      expect(result).toBe(true);
    });

    it('returns false for invalid signature', () => {
      const signature = 'sha256=invalid-signature-hash';

      const result = service.verifyWebhookSignature(payload, signature, secret);

      expect(result).toBe(false);
    });

    it('returns false for missing signature', () => {
      const result = service.verifyWebhookSignature(payload, '', secret);

      expect(result).toBe(false);
    });

    it('returns false for signature with wrong format', () => {
      const signature = 'md5=somehash'; // Wrong algorithm prefix

      const result = service.verifyWebhookSignature(payload, signature, secret);

      expect(result).toBe(false);
    });

    it('returns false for signature with wrong secret', () => {
      const signature = generateValidSignature(payload, 'wrong-secret');

      const result = service.verifyWebhookSignature(payload, signature, secret);

      expect(result).toBe(false);
    });

    it('returns false for tampered payload', () => {
      const signature = generateValidSignature(payload, secret);
      const tamperedPayload = JSON.stringify({ test: 'tampered' });

      const result = service.verifyWebhookSignature(tamperedPayload, signature, secret);

      expect(result).toBe(false);
    });
  });

  describe('parseWebhookPayload', () => {
    it('parses valid JSON payload', () => {
      const payload = JSON.stringify({ action: 'opened', number: 123 });

      const result = service.parseWebhookPayload<{ action: string; number: number }>(payload);

      expect(result).toEqual({ action: 'opened', number: 123 });
    });

    it('throws error for invalid JSON', () => {
      const invalidPayload = '{ invalid json }';

      expect(() => service.parseWebhookPayload(invalidPayload)).toThrow(
        'Failed to parse webhook payload'
      );
    });

    it('preserves nested objects', () => {
      const payload = JSON.stringify({
        pull_request: {
          number: 456,
          user: { login: 'test-user' },
        },
      });

      const result = service.parseWebhookPayload<{
        pull_request: { number: number; user: { login: string } };
      }>(payload);

      expect(result.pull_request.number).toBe(456);
      expect(result.pull_request.user.login).toBe('test-user');
    });
  });

  describe('fetchPR', () => {
    it('throws error when GitHub token not configured', async () => {
      const serviceWithoutToken = new GitHubService();

      await expect(
        serviceWithoutToken.fetchPR('owner', 'repo', 123)
      ).rejects.toThrow('GitHub authentication not configured');
    });

    it('fetches PR data from GitHub API', async () => {
      const mockOctokit = getMockOctokit();
      const serviceWithToken = new GitHubService('test-token');

      // Mock API responses
      mockOctokit.pulls.get.mockResolvedValue({
        data: {
          number: 123,
          title: 'Test PR',
          body: 'Test description',
          user: { login: 'test-author' },
          head: { ref: 'feature-branch' },
          base: { ref: 'main' },
          html_url: 'https://github.com/owner/repo/pull/123',
          draft: false,
        },
      });

      mockOctokit.pulls.listRequestedReviewers.mockResolvedValue({
        data: {
          users: [
            { login: 'reviewer1' },
            { login: 'reviewer2' },
          ],
        },
      });

      const result = await serviceWithToken.fetchPR('owner', 'repo', 123);

      expect(result).toEqual({
        number: 123,
        title: 'Test PR',
        description: 'Test description',
        author: 'test-author',
        branchName: 'feature-branch',
        baseBranch: 'main',
        url: 'https://github.com/owner/repo/pull/123',
        isDraft: false,
        repo: 'repo',
        owner: 'owner',
        reviewers: ['reviewer1', 'reviewer2'],
      });
    });

    it('handles PR with no description', async () => {
      const mockOctokit = getMockOctokit();
      const serviceWithToken = new GitHubService('test-token');

      mockOctokit.pulls.get.mockResolvedValue({
        data: {
          number: 123,
          title: 'Test PR',
          body: null,
          user: { login: 'test-author' },
          head: { ref: 'feature-branch' },
          base: { ref: 'main' },
          html_url: 'https://github.com/owner/repo/pull/123',
          draft: false,
        },
      });

      mockOctokit.pulls.listRequestedReviewers.mockResolvedValue({
        data: { users: [] },
      });

      const result = await serviceWithToken.fetchPR('owner', 'repo', 123);

      expect(result.description).toBe('');
    });

    it('handles draft PRs', async () => {
      const mockOctokit = getMockOctokit();
      const serviceWithToken = new GitHubService('test-token');

      mockOctokit.pulls.get.mockResolvedValue({
        data: {
          number: 123,
          title: 'Draft PR',
          body: 'Draft description',
          user: { login: 'test-author' },
          head: { ref: 'wip-branch' },
          base: { ref: 'main' },
          html_url: 'https://github.com/owner/repo/pull/123',
          draft: true,
        },
      });

      mockOctokit.pulls.listRequestedReviewers.mockResolvedValue({
        data: { users: [] },
      });

      const result = await serviceWithToken.fetchPR('owner', 'repo', 123);

      expect(result.isDraft).toBe(true);
    });

    it('throws error for non-existent PR (404)', async () => {
      const mockOctokit = getMockOctokit();
      const serviceWithToken = new GitHubService('test-token');

      mockOctokit.pulls.get.mockRejectedValue({
        status: 404,
        message: 'Not Found',
      });

      await expect(
        serviceWithToken.fetchPR('owner', 'repo', 999)
      ).rejects.toThrow('PR #999 not found in owner/repo');
    });

    it('throws error for API failures', async () => {
      const mockOctokit = getMockOctokit();
      const serviceWithToken = new GitHubService('test-token');

      mockOctokit.pulls.get.mockRejectedValue({
        status: 500,
        message: 'Internal Server Error',
      });

      await expect(
        serviceWithToken.fetchPR('owner', 'repo', 123)
      ).rejects.toThrow('Failed to fetch PR from GitHub API');
    });
  });

  describe('Authentication Methods', () => {
    it('initializes without authentication', () => {
      const serviceNoAuth = new GitHubService();
      
      expect(serviceNoAuth.getAuthMethod()).toBe('none');
      expect(serviceNoAuth.isAPIAvailable()).toBe(false);
    });

    it('initializes with Personal Access Token', () => {
      const serviceWithToken = new GitHubService('test-token');
      
      expect(serviceWithToken.getAuthMethod()).toBe('token');
      expect(serviceWithToken.isAPIAvailable()).toBe(true);
    });

    it('initializes with GitHub App', async () => {
      const serviceWithApp = new GitHubService(undefined, {
        appId: '12345',
        privateKey: '-----BEGIN RSA PRIVATE KEY-----\ntest\n-----END RSA PRIVATE KEY-----',
        installationId: '67890',
      });
      
      // Wait for async initialization
      await serviceWithApp.waitForInitialization();
      
      expect(serviceWithApp.getAuthMethod()).toBe('app');
      expect(serviceWithApp.isAPIAvailable()).toBe(true);
    });

    it('prioritizes GitHub App over PAT when both provided', async () => {
      const serviceWithBoth = new GitHubService('test-token', {
        appId: '12345',
        privateKey: '-----BEGIN RSA PRIVATE KEY-----\ntest\n-----END RSA PRIVATE KEY-----',
        installationId: '67890',
      });
      
      // Wait for async initialization
      await serviceWithBoth.waitForInitialization();
      
      expect(serviceWithBoth.getAuthMethod()).toBe('app');
    });

    it('falls back to none if GitHub App missing required fields', () => {
      const serviceWithIncompleteApp = new GitHubService(undefined, {
        appId: '12345',
        privateKey: '', // Missing private key
        installationId: '67890',
      });
      
      expect(serviceWithIncompleteApp.getAuthMethod()).toBe('none');
      expect(serviceWithIncompleteApp.isAPIAvailable()).toBe(false);
    });

    it('handles GitHub App with missing installation ID', async () => {
      const serviceWithoutInstallation = new GitHubService(undefined, {
        appId: '12345',
        privateKey: '-----BEGIN RSA PRIVATE KEY-----\ntest\n-----END RSA PRIVATE KEY-----',
        installationId: '', // Missing
      });
      
      await serviceWithoutInstallation.waitForInitialization();
      
      expect(serviceWithoutInstallation.isAPIAvailable()).toBe(false);
    });

    it('throws error when fetching PR without authentication', async () => {
      const serviceNoAuth = new GitHubService();
      
      await expect(
        serviceNoAuth.fetchPR('owner', 'repo', 123)
      ).rejects.toThrow('GitHub authentication not configured');
    });
  });
});
