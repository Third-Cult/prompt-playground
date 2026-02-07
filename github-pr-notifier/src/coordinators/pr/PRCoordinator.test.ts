import { PRCoordinator } from './PRCoordinator';
import { IStateService } from '../../services/state/interfaces/IStateService';
import { IDiscordService } from '../../services/discord/interfaces/IDiscordService';
import { NotificationManager } from './managers/NotificationManager';
import { PRData } from '../../models/PRState';

describe('PRCoordinator', () => {
  let coordinator: PRCoordinator;
  let mockStateService: jest.Mocked<IStateService>;
  let mockDiscordService: jest.Mocked<IDiscordService>;
  let mockNotificationManager: jest.Mocked<NotificationManager>;
  const testChannelId = '123456789';

  beforeEach(() => {
    mockStateService = {
      savePRState: jest.fn().mockResolvedValue(undefined),
      getPRState: jest.fn().mockResolvedValue(null),
      deletePRState: jest.fn().mockResolvedValue(undefined),
      getDiscordMessageId: jest.fn().mockResolvedValue(null),
      getThreadId: jest.fn().mockResolvedValue(null),
      getPRNumberByMessageId: jest.fn().mockResolvedValue(null),
      getAllPRStates: jest.fn().mockResolvedValue([]),
    };

    mockDiscordService = {
      init: jest.fn().mockResolvedValue(undefined),
      sendMessage: jest.fn().mockResolvedValue('msg-123'),
      editMessage: jest.fn().mockResolvedValue(undefined),
      addReaction: jest.fn().mockResolvedValue(undefined),
      removeReaction: jest.fn().mockResolvedValue(undefined),
      createThread: jest.fn().mockResolvedValue('thread-123'),
      sendThreadMessage: jest.fn().mockResolvedValue('thread-msg-123'),
      addThreadMember: jest.fn().mockResolvedValue(undefined),
      removeThreadMember: jest.fn().mockResolvedValue(undefined),
      lockThread: jest.fn().mockResolvedValue(undefined),
      getThreadMembers: jest.fn().mockResolvedValue([]),
      isReady: jest.fn().mockReturnValue(true),
      cleanup: jest.fn().mockResolvedValue(undefined),
    };

    mockNotificationManager = {
      preparePRCreatedNotification: jest.fn().mockReturnValue({
        embeds: [{ title: 'Test PR #123' }],
      }),
      prepareThreadCreatedMessage: jest.fn().mockReturnValue('Thread message'),
    } as any;

    const mockUserMappingManager = {
      getDiscordUserId: jest.fn().mockReturnValue('12345'),
      getDiscordMention: jest.fn((username: string) => `@${username}`),
    } as any;

    coordinator = new PRCoordinator(
      mockStateService,
      mockDiscordService,
      mockNotificationManager,
      mockUserMappingManager,
      testChannelId
    );
  });

  const createMockPRData = (overrides = {}): PRData => ({
    number: 123,
    title: 'Add feature X',
    description: 'This PR adds feature X',
    author: 'test-author',
    branchName: 'feature-x',
    baseBranch: 'main',
    url: 'https://github.com/owner/repo/pull/123',
    isDraft: false,
    repo: 'test-repo',
    owner: 'test-owner',
    ...overrides,
  });

  describe('handlePROpened', () => {
    it('creates Discord message with notification content', async () => {
      const prData = createMockPRData();
      const reviewers = ['reviewer-1', 'reviewer-2'];

      await coordinator.handlePROpened(prData, reviewers);

      expect(mockNotificationManager.preparePRCreatedNotification).toHaveBeenCalledWith(
        prData,
        reviewers
      );

      expect(mockDiscordService.sendMessage).toHaveBeenCalledWith(
        testChannelId,
        expect.objectContaining({
          embeds: expect.arrayContaining([expect.objectContaining({ title: 'Test PR #123' })]),
        })
      );
    });

    it('creates thread from message', async () => {
      const prData = createMockPRData();

      await coordinator.handlePROpened(prData, []);

      expect(mockDiscordService.createThread).toHaveBeenCalledWith(
        testChannelId,
        'msg-123', // Message ID returned by sendMessage
        'PR #123: Add feature X'
      );
    });

    it('truncates long titles for thread name', async () => {
      const longTitle = 'A'.repeat(100); // 100 characters
      const prData = createMockPRData({ title: longTitle });

      await coordinator.handlePROpened(prData, []);

      expect(mockDiscordService.createThread).toHaveBeenCalledWith(
        testChannelId,
        'msg-123',
        expect.stringMatching(/^PR #123: A+\.\.\.$/)
      );
    });

    it('sends initial message to thread', async () => {
      const prData = createMockPRData();

      await coordinator.handlePROpened(prData, []);

      expect(mockNotificationManager.prepareThreadCreatedMessage).toHaveBeenCalledWith(
        123,
        'Add feature X',
        'https://github.com/owner/repo/pull/123',
        'test-author',
        []
      );

      expect(mockDiscordService.sendThreadMessage).toHaveBeenCalledWith(
        'thread-123',
        'Thread message'
      );
    });

    it('saves PR state with Discord IDs', async () => {
      const prData = createMockPRData();
      const reviewers = ['reviewer-1'];

      await coordinator.handlePROpened(prData, reviewers);

      expect(mockStateService.savePRState).toHaveBeenCalledWith(
        123,
        expect.objectContaining({
          prNumber: 123,
          title: 'Add feature X',
          author: 'test-author',
          reviewers: ['reviewer-1'],
          status: 'ready_for_review',
          isDraft: false,
          discordMessageId: 'msg-123',
          discordThreadId: 'thread-123',
          addedThreadMembers: [],
        })
      );
    });

    it('sets status to draft when PR is draft', async () => {
      const prData = createMockPRData({ isDraft: true });

      await coordinator.handlePROpened(prData, []);

      expect(mockStateService.savePRState).toHaveBeenCalledWith(
        123,
        expect.objectContaining({
          status: 'draft',
          isDraft: true,
        })
      );
    });

    it('handles empty reviewers array', async () => {
      const prData = createMockPRData();

      await coordinator.handlePROpened(prData, []);

      expect(mockNotificationManager.preparePRCreatedNotification).toHaveBeenCalledWith(
        prData,
        []
      );
    });

    it('throws error if Discord message creation fails', async () => {
      mockDiscordService.sendMessage.mockRejectedValue(new Error('Discord API error'));
      const prData = createMockPRData();

      await expect(coordinator.handlePROpened(prData, [])).rejects.toThrow();

      // Should not save state if message creation fails
      expect(mockStateService.savePRState).not.toHaveBeenCalled();
    });

    it('throws error if thread creation fails', async () => {
      mockDiscordService.createThread.mockRejectedValue(new Error('Thread creation failed'));
      const prData = createMockPRData();

      await expect(coordinator.handlePROpened(prData, [])).rejects.toThrow();

      // Should not save state if thread creation fails
      expect(mockStateService.savePRState).not.toHaveBeenCalled();
    });
  });

  describe('getPRState', () => {
    it('retrieves PR state from state service', async () => {
      const mockState = {
        prNumber: 123,
        title: 'Test',
      };
      mockStateService.getPRState.mockResolvedValue(mockState as any);

      const state = await coordinator.getPRState(123);

      expect(state).toEqual(mockState);
      expect(mockStateService.getPRState).toHaveBeenCalledWith(123);
    });
  });

  describe('prExists', () => {
    it('returns true when PR state exists', async () => {
      mockStateService.getPRState.mockResolvedValue({ prNumber: 123 } as any);

      const exists = await coordinator.prExists(123);

      expect(exists).toBe(true);
    });

    it('returns false when PR state does not exist', async () => {
      mockStateService.getPRState.mockResolvedValue(null);

      const exists = await coordinator.prExists(999);

      expect(exists).toBe(false);
    });
  });
});
