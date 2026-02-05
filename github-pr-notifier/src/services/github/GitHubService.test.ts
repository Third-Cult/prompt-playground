import { GitHubService } from './GitHubService';
import crypto from 'crypto';

describe('GitHubService', () => {
  let service: GitHubService;

  beforeEach(() => {
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
});
