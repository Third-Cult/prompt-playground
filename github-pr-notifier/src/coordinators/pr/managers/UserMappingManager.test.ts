import { UserMappingManager } from './UserMappingManager';

describe('UserMappingManager', () => {
  let manager: UserMappingManager;

  beforeEach(() => {
    const mappings = {
      'github-user-1': '111111111111111111',
      'github-user-2': '222222222222222222',
      'octocat': '333333333333333333',
    };

    manager = new UserMappingManager(mappings);
  });

  describe('getDiscordUserId', () => {
    it('returns Discord user ID for mapped GitHub username', () => {
      const userId = manager.getDiscordUserId('github-user-1');

      expect(userId).toBe('111111111111111111');
    });

    it('returns null for unmapped GitHub username', () => {
      const userId = manager.getDiscordUserId('unknown-user');

      expect(userId).toBeNull();
    });
  });

  describe('getDiscordMention', () => {
    it('returns Discord mention for mapped user', () => {
      const mention = manager.getDiscordMention('github-user-1');

      expect(mention).toBe('<@111111111111111111>');
    });

    it('returns fallback mention for unmapped user', () => {
      const mention = manager.getDiscordMention('unknown-user');

      expect(mention).toBe('@unknown-user');
    });
  });

  describe('getDiscordMentions', () => {
    it('returns comma-separated mentions for multiple users', () => {
      const mentions = manager.getDiscordMentions(['github-user-1', 'github-user-2']);

      expect(mentions).toBe('<@111111111111111111>, <@222222222222222222>');
    });

    it('handles mix of mapped and unmapped users', () => {
      const mentions = manager.getDiscordMentions(['github-user-1', 'unknown-user']);

      expect(mentions).toBe('<@111111111111111111>, @unknown-user');
    });

    it('returns empty string for empty array', () => {
      const mentions = manager.getDiscordMentions([]);

      expect(mentions).toBe('');
    });

    it('handles single user', () => {
      const mentions = manager.getDiscordMentions(['octocat']);

      expect(mentions).toBe('<@333333333333333333>');
    });
  });

  describe('hasMapping', () => {
    it('returns true for mapped user', () => {
      expect(manager.hasMapping('github-user-1')).toBe(true);
    });

    it('returns false for unmapped user', () => {
      expect(manager.hasMapping('unknown-user')).toBe(false);
    });
  });

  describe('getMappedUsernames', () => {
    it('returns all mapped GitHub usernames', () => {
      const usernames = manager.getMappedUsernames();

      expect(usernames).toEqual(
        expect.arrayContaining(['github-user-1', 'github-user-2', 'octocat'])
      );
      expect(usernames).toHaveLength(3);
    });
  });

  describe('empty mappings', () => {
    it('handles empty mappings gracefully', () => {
      const emptyManager = new UserMappingManager({});

      expect(emptyManager.getDiscordUserId('any-user')).toBeNull();
      expect(emptyManager.getDiscordMention('any-user')).toBe('@any-user');
      expect(emptyManager.hasMapping('any-user')).toBe(false);
      expect(emptyManager.getMappedUsernames()).toEqual([]);
    });
  });
});
