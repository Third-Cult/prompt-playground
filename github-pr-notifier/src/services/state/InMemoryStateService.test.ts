import { InMemoryStateService } from './InMemoryStateService';
import { PRStateData } from '../../models/PRState';

describe('InMemoryStateService', () => {
  let service: InMemoryStateService;

  beforeEach(() => {
    service = new InMemoryStateService();
  });

  const createMockPRState = (prNumber: number): PRStateData => ({
    prNumber,
    repo: 'test-repo',
    owner: 'test-owner',
    title: `Test PR ${prNumber}`,
    description: 'Test description',
    author: 'test-author',
    branchName: 'feature-branch',
    baseBranch: 'main',
    url: `https://github.com/test-owner/test-repo/pull/${prNumber}`,
    status: 'ready_for_review',
    isDraft: false,
    reviewers: [],
    reviews: [],
    discordMessageId: `msg-${prNumber}`,
    discordThreadId: `thread-${prNumber}`,
    addedThreadMembers: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  describe('savePRState', () => {
    it('saves PR state', async () => {
      const state = createMockPRState(123);

      await service.savePRState(123, state);
      const retrieved = await service.getPRState(123);

      expect(retrieved).toEqual(expect.objectContaining({
        prNumber: 123,
        title: 'Test PR 123',
        discordMessageId: 'msg-123',
      }));
    });

    it('updates existing PR state', async () => {
      const state = createMockPRState(123);
      await service.savePRState(123, state);

      const updatedState = { ...state, title: 'Updated Title' };
      await service.savePRState(123, updatedState);

      const retrieved = await service.getPRState(123);
      expect(retrieved?.title).toBe('Updated Title');
    });

    it('creates reverse lookup for message ID', async () => {
      const state = createMockPRState(123);

      await service.savePRState(123, state);

      const prNumber = await service.getPRNumberByMessageId('msg-123');
      expect(prNumber).toBe(123);
    });
  });

  describe('getPRState', () => {
    it('returns PR state when it exists', async () => {
      const state = createMockPRState(123);
      await service.savePRState(123, state);

      const retrieved = await service.getPRState(123);

      expect(retrieved).toBeTruthy();
      expect(retrieved?.prNumber).toBe(123);
    });

    it('returns null when PR state does not exist', async () => {
      const retrieved = await service.getPRState(999);

      expect(retrieved).toBeNull();
    });
  });

  describe('deletePRState', () => {
    it('deletes PR state', async () => {
      const state = createMockPRState(123);
      await service.savePRState(123, state);

      await service.deletePRState(123);
      const retrieved = await service.getPRState(123);

      expect(retrieved).toBeNull();
    });

    it('removes reverse lookup', async () => {
      const state = createMockPRState(123);
      await service.savePRState(123, state);

      await service.deletePRState(123);
      const prNumber = await service.getPRNumberByMessageId('msg-123');

      expect(prNumber).toBeNull();
    });

    it('does not throw when deleting non-existent PR', async () => {
      await expect(service.deletePRState(999)).resolves.not.toThrow();
    });
  });

  describe('getDiscordMessageId', () => {
    it('returns message ID when it exists', async () => {
      const state = createMockPRState(123);
      await service.savePRState(123, state);

      const messageId = await service.getDiscordMessageId(123);

      expect(messageId).toBe('msg-123');
    });

    it('returns null when PR does not exist', async () => {
      const messageId = await service.getDiscordMessageId(999);

      expect(messageId).toBeNull();
    });

    it('returns null when PR has no message ID', async () => {
      const state = { ...createMockPRState(123), discordMessageId: null };
      await service.savePRState(123, state);

      const messageId = await service.getDiscordMessageId(123);

      expect(messageId).toBeNull();
    });
  });

  describe('getThreadId', () => {
    it('returns thread ID when it exists', async () => {
      const state = createMockPRState(123);
      await service.savePRState(123, state);

      const threadId = await service.getThreadId(123);

      expect(threadId).toBe('thread-123');
    });

    it('returns null when PR does not exist', async () => {
      const threadId = await service.getThreadId(999);

      expect(threadId).toBeNull();
    });
  });

  describe('getPRNumberByMessageId', () => {
    it('returns PR number for message ID', async () => {
      const state = createMockPRState(123);
      await service.savePRState(123, state);

      const prNumber = await service.getPRNumberByMessageId('msg-123');

      expect(prNumber).toBe(123);
    });

    it('returns null for non-existent message ID', async () => {
      const prNumber = await service.getPRNumberByMessageId('msg-999');

      expect(prNumber).toBeNull();
    });
  });

  describe('getAllPRStates', () => {
    it('returns all PR states', async () => {
      await service.savePRState(123, createMockPRState(123));
      await service.savePRState(456, createMockPRState(456));

      const allStates = await service.getAllPRStates();

      expect(allStates).toHaveLength(2);
      expect(allStates.map((s) => s.prNumber).sort()).toEqual([123, 456]);
    });

    it('returns empty array when no states exist', async () => {
      const allStates = await service.getAllPRStates();

      expect(allStates).toEqual([]);
    });
  });

  describe('clear', () => {
    it('clears all state', async () => {
      await service.savePRState(123, createMockPRState(123));
      await service.savePRState(456, createMockPRState(456));

      service.clear();

      expect(service.getStateCount()).toBe(0);
      expect(await service.getAllPRStates()).toEqual([]);
    });
  });
});
