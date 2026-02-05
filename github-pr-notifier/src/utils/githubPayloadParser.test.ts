import {
  extractPRData,
  extractReviewers,
  isPROpenedEvent,
  isPREditedEvent,
  isPRClosedEvent,
  isPRMerged,
} from './githubPayloadParser';

describe('githubPayloadParser', () => {
  const createMockPayload = (overrides = {}) => ({
    action: 'opened',
    pull_request: {
      number: 123,
      title: 'Test PR',
      body: 'Test description',
      draft: false,
      user: { login: 'test-author' },
      head: { ref: 'feature-branch' },
      base: { ref: 'main' },
      html_url: 'https://github.com/owner/repo/pull/123',
      requested_reviewers: [
        { login: 'reviewer-1' },
        { login: 'reviewer-2' },
      ],
      merged: false,
      ...overrides,
    },
    repository: {
      name: 'test-repo',
      owner: { login: 'test-owner' },
    },
  });

  describe('extractPRData', () => {
    it('extracts PR data from payload', () => {
      const payload = createMockPayload();

      const prData = extractPRData(payload);

      expect(prData).toEqual({
        number: 123,
        title: 'Test PR',
        description: 'Test description',
        author: 'test-author',
        branchName: 'feature-branch',
        baseBranch: 'main',
        url: 'https://github.com/owner/repo/pull/123',
        isDraft: false,
        repo: 'test-repo',
        owner: 'test-owner',
      });
    });

    it('handles empty description', () => {
      const payload = createMockPayload({
        body: null,
      });

      const prData = extractPRData(payload);

      expect(prData.description).toBe('');
    });

    it('handles draft PRs', () => {
      const payload = createMockPayload({
        draft: true,
      });

      const prData = extractPRData(payload);

      expect(prData.isDraft).toBe(true);
    });

    it('throws error for invalid payload', () => {
      const invalidPayload = { action: 'opened' }; // Missing pull_request

      expect(() => extractPRData(invalidPayload)).toThrow('Invalid payload');
    });
  });

  describe('extractReviewers', () => {
    it('extracts reviewer usernames from payload', () => {
      const payload = createMockPayload();

      const reviewers = extractReviewers(payload);

      expect(reviewers).toEqual(['reviewer-1', 'reviewer-2']);
    });

    it('returns empty array when no reviewers', () => {
      const payload = createMockPayload({
        requested_reviewers: [],
      });

      const reviewers = extractReviewers(payload);

      expect(reviewers).toEqual([]);
    });

    it('returns empty array when requested_reviewers is undefined', () => {
      const payload = {
        pull_request: {},
      };

      const reviewers = extractReviewers(payload);

      expect(reviewers).toEqual([]);
    });
  });

  describe('isPROpenedEvent', () => {
    it('returns true for opened action', () => {
      const payload = createMockPayload();

      expect(isPROpenedEvent(payload)).toBe(true);
    });

    it('returns false for other actions', () => {
      expect(isPROpenedEvent({ action: 'edited' })).toBe(false);
      expect(isPROpenedEvent({ action: 'closed' })).toBe(false);
    });
  });

  describe('isPREditedEvent', () => {
    it('returns true for edited action', () => {
      const payload = { action: 'edited' };

      expect(isPREditedEvent(payload)).toBe(true);
    });

    it('returns false for other actions', () => {
      expect(isPREditedEvent({ action: 'opened' })).toBe(false);
    });
  });

  describe('isPRClosedEvent', () => {
    it('returns true for closed action', () => {
      const payload = { action: 'closed' };

      expect(isPRClosedEvent(payload)).toBe(true);
    });

    it('returns false for other actions', () => {
      expect(isPRClosedEvent({ action: 'opened' })).toBe(false);
    });
  });

  describe('isPRMerged', () => {
    it('returns true when PR is merged', () => {
      const payload = {
        pull_request: { merged: true },
      };

      expect(isPRMerged(payload)).toBe(true);
    });

    it('returns false when PR is not merged', () => {
      const payload = {
        pull_request: { merged: false },
      };

      expect(isPRMerged(payload)).toBe(false);
    });

    it('returns false when merged field is missing', () => {
      const payload = {
        pull_request: {},
      };

      expect(isPRMerged(payload)).toBe(false);
    });
  });
});
