import { IssueManager } from './IssueManager';

describe('IssueManager', () => {
  let manager: IssueManager;

  beforeEach(() => {
    manager = new IssueManager();
  });

  describe('extractLinkedIssues', () => {
    it('extracts single issue with Closes keyword', () => {
      const description = 'This PR closes #123';
      const issues = manager.extractLinkedIssues(description);
      
      expect(issues).toEqual(['123']);
    });

    it('extracts single issue with Fixes keyword', () => {
      const description = 'This PR fixes #456';
      const issues = manager.extractLinkedIssues(description);
      
      expect(issues).toEqual(['456']);
    });

    it('extracts single issue with Resolves keyword', () => {
      const description = 'This PR resolves #789';
      const issues = manager.extractLinkedIssues(description);
      
      expect(issues).toEqual(['789']);
    });

    it('extracts multiple issues from description', () => {
      const description = 'Closes #123 and fixes #456. Also resolves #789';
      const issues = manager.extractLinkedIssues(description);
      
      expect(issues).toEqual(['123', '456', '789']);
    });

    it('handles case-insensitive keywords', () => {
      const description = 'CLOSES #123, Fixes #456, resolves #789';
      const issues = manager.extractLinkedIssues(description);
      
      expect(issues).toEqual(['123', '456', '789']);
    });

    it('handles past tense keywords (closed, fixed, resolved)', () => {
      const description = 'Closed #123, fixed #456, resolved #789';
      const issues = manager.extractLinkedIssues(description);
      
      expect(issues).toEqual(['123', '456', '789']);
    });

    it('handles Addresses keyword', () => {
      const description = 'Addresses #101';
      const issues = manager.extractLinkedIssues(description);
      
      expect(issues).toEqual(['101']);
    });

    it('returns empty array for description with no issues', () => {
      const description = 'This is a PR description with no issue references';
      const issues = manager.extractLinkedIssues(description);
      
      expect(issues).toEqual([]);
    });

    it('returns empty array for empty description', () => {
      const issues = manager.extractLinkedIssues('');
      
      expect(issues).toEqual([]);
    });

    it('deduplicates duplicate issue references', () => {
      const description = 'Closes #123, fixes #123, resolves #123';
      const issues = manager.extractLinkedIssues(description);
      
      expect(issues).toEqual(['123']);
    });

    it('sorts issues numerically', () => {
      const description = 'Closes #789, fixes #123, resolves #456';
      const issues = manager.extractLinkedIssues(description);
      
      expect(issues).toEqual(['123', '456', '789']);
    });

    it('ignores # without keywords', () => {
      const description = 'See #123 for details (no closing keyword)';
      const issues = manager.extractLinkedIssues(description);
      
      expect(issues).toEqual([]);
    });
  });

  describe('formatIssuesForDiscord', () => {
    it('formats single issue as hyperlink with suppressed embed', () => {
      const formatted = manager.formatIssuesForDiscord(['123'], 'test-owner', 'test-repo');
      
      expect(formatted).toBe('[#123](<https://github.com/test-owner/test-repo/issues/123>)');
    });

    it('formats multiple issues as comma-separated hyperlinks with suppressed embeds', () => {
      const formatted = manager.formatIssuesForDiscord(['123', '456', '789'], 'test-owner', 'test-repo');
      
      expect(formatted).toBe(
        '[#123](<https://github.com/test-owner/test-repo/issues/123>), ' +
        '[#456](<https://github.com/test-owner/test-repo/issues/456>), ' +
        '[#789](<https://github.com/test-owner/test-repo/issues/789>)'
      );
    });

    it('returns empty string for no issues', () => {
      const formatted = manager.formatIssuesForDiscord([], 'test-owner', 'test-repo');
      
      expect(formatted).toBe('');
    });
  });

  describe('detectAddedIssues', () => {
    it('detects newly added issues', () => {
      const oldIssues = ['123', '456'];
      const newIssues = ['123', '456', '789'];
      
      const added = manager.detectAddedIssues(oldIssues, newIssues);
      
      expect(added).toEqual(['789']);
    });

    it('detects multiple newly added issues', () => {
      const oldIssues = ['123'];
      const newIssues = ['123', '456', '789'];
      
      const added = manager.detectAddedIssues(oldIssues, newIssues);
      
      expect(added).toEqual(['456', '789']);
    });

    it('returns empty array when no issues added', () => {
      const oldIssues = ['123', '456'];
      const newIssues = ['123', '456'];
      
      const added = manager.detectAddedIssues(oldIssues, newIssues);
      
      expect(added).toEqual([]);
    });

    it('returns all issues when old list was empty', () => {
      const oldIssues: string[] = [];
      const newIssues = ['123', '456'];
      
      const added = manager.detectAddedIssues(oldIssues, newIssues);
      
      expect(added).toEqual(['123', '456']);
    });
  });

  describe('detectRemovedIssues', () => {
    it('detects removed issues', () => {
      const oldIssues = ['123', '456', '789'];
      const newIssues = ['123', '456'];
      
      const removed = manager.detectRemovedIssues(oldIssues, newIssues);
      
      expect(removed).toEqual(['789']);
    });

    it('detects multiple removed issues', () => {
      const oldIssues = ['123', '456', '789'];
      const newIssues = ['123'];
      
      const removed = manager.detectRemovedIssues(oldIssues, newIssues);
      
      expect(removed).toEqual(['456', '789']);
    });

    it('returns empty array when no issues removed', () => {
      const oldIssues = ['123', '456'];
      const newIssues = ['123', '456'];
      
      const removed = manager.detectRemovedIssues(oldIssues, newIssues);
      
      expect(removed).toEqual([]);
    });

    it('returns all issues when new list is empty', () => {
      const oldIssues = ['123', '456'];
      const newIssues: string[] = [];
      
      const removed = manager.detectRemovedIssues(oldIssues, newIssues);
      
      expect(removed).toEqual(['123', '456']);
    });
  });

  describe('issuesChanged', () => {
    it('returns true when issues added', () => {
      const oldIssues = ['123'];
      const newIssues = ['123', '456'];
      
      expect(manager.issuesChanged(oldIssues, newIssues)).toBe(true);
    });

    it('returns true when issues removed', () => {
      const oldIssues = ['123', '456'];
      const newIssues = ['123'];
      
      expect(manager.issuesChanged(oldIssues, newIssues)).toBe(true);
    });

    it('returns true when issues replaced', () => {
      const oldIssues = ['123'];
      const newIssues = ['456'];
      
      expect(manager.issuesChanged(oldIssues, newIssues)).toBe(true);
    });

    it('returns false when issues unchanged', () => {
      const oldIssues = ['123', '456'];
      const newIssues = ['123', '456'];
      
      expect(manager.issuesChanged(oldIssues, newIssues)).toBe(false);
    });

    it('returns false when issues are same but different order', () => {
      const oldIssues = ['456', '123'];
      const newIssues = ['123', '456'];
      
      expect(manager.issuesChanged(oldIssues, newIssues)).toBe(false);
    });

    it('returns false when both empty', () => {
      const oldIssues: string[] = [];
      const newIssues: string[] = [];
      
      expect(manager.issuesChanged(oldIssues, newIssues)).toBe(false);
    });
  });
});
