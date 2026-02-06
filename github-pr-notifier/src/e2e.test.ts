import request from 'supertest';
import { Express } from 'express';
import crypto from 'crypto';
import { createServer } from './webhooks/server';
import { GitHubService } from './services/github/GitHubService';
import { InMemoryStateService } from './services/state/InMemoryStateService';
import { IDiscordService } from './services/discord/interfaces/IDiscordService';
import { MessageTemplateService } from './services/templates/MessageTemplateService';
import { UserMappingManager } from './coordinators/pr/managers/UserMappingManager';
import { NotificationManager } from './coordinators/pr/managers/NotificationManager';
import { PRCoordinator } from './coordinators/pr/PRCoordinator';
import path from 'path';

/**
 * End-to-End Test Suite
 * 
 * Tests the complete PR lifecycle with realistic GitHub webhook payloads
 * Verifies all Discord operations (messages, threads, reactions, members)
 * 
 * Test Strategy:
 * - Black-box testing: Only tests public webhook API
 * - Uses realistic GitHub payloads
 * - Mocks Discord service to verify calls
 * - Tests state changes through public methods
 */
describe('E2E: Complete PR Lifecycle', () => {
  let app: Express;
  let githubService: GitHubService;
  let stateService: InMemoryStateService;
  let mockDiscordService: jest.Mocked<IDiscordService>;
  let prCoordinator: PRCoordinator;
  
  const testSecret = 'test-webhook-secret-e2e';
  const testChannelId = 'test-channel-e2e';

  // Helper to create signed webhook request and wait for processing
  const sendWebhook = async (event: string, payload: any) => {
    const payloadStr = JSON.stringify(payload);
    const signature = 'sha256=' + crypto
      .createHmac('sha256', testSecret)
      .update(payloadStr)
      .digest('hex');

    const response = await request(app)
      .post('/webhook/github')
      .set('x-github-event', event)
      .set('x-hub-signature-256', signature)
      .set('x-github-delivery', `delivery-${Date.now()}`)
      .send(payload);

    // Wait a bit for async processing to complete
    await new Promise(resolve => setTimeout(resolve, 100));
    
    return response;
  };

  beforeAll(async () => {
    // Set test secret before loading config
    process.env.GITHUB_WEBHOOK_SECRET = testSecret;
    process.env.DISCORD_BOT_TOKEN = 'test-token';
    process.env.DISCORD_CHANNEL_ID = testChannelId;

    // Initialize services ONCE for all tests
    githubService = new GitHubService();
    stateService = new InMemoryStateService();

    // Mock Discord service
    mockDiscordService = {
      init: jest.fn().mockResolvedValue(undefined),
      sendMessage: jest.fn().mockResolvedValue('msg-id'),
      editMessage: jest.fn().mockResolvedValue(undefined),
      addReaction: jest.fn().mockResolvedValue(undefined),
      removeReaction: jest.fn().mockResolvedValue(undefined),
      createThread: jest.fn().mockResolvedValue('thread-id'),
      sendThreadMessage: jest.fn().mockResolvedValue('thread-msg-id'),
      addThreadMember: jest.fn().mockResolvedValue(undefined),
      removeThreadMember: jest.fn().mockResolvedValue(undefined),
      lockThread: jest.fn().mockResolvedValue(undefined),
      getThreadMembers: jest.fn().mockResolvedValue([]),
      isReady: jest.fn().mockReturnValue(true),
      cleanup: jest.fn().mockResolvedValue(undefined),
    };

    // Initialize coordinators
    const userMappings = {
      'github-user-1': '111111111',
      'github-user-2': '222222222',
      'github-author': '333333333',
    };
    const userMappingManager = new UserMappingManager(userMappings);
    const templatePath = path.join(__dirname, 'config', 'templates', 'discord-messages.json');
    const templateService = new MessageTemplateService();
    await templateService.loadTemplates(templatePath); // AWAIT template loading
    const notificationManager = new NotificationManager(templateService, userMappingManager);
    
    prCoordinator = new PRCoordinator(
      stateService,
      mockDiscordService,
      notificationManager,
      userMappingManager,
      testChannelId
    );

    // Create server
    app = createServer(githubService, stateService, prCoordinator);
  });

  beforeEach(() => {
    // Clear state and mocks between tests
    stateService.clear();
    jest.clearAllMocks();
  });

  describe('Scenario 1: Simple PR Lifecycle (Open → Approve → Merge)', () => {
    const prNumber = 1001;

    it('should handle complete lifecycle', async () => {
      // Step 1: PR Opened
      await sendWebhook('pull_request', {
        action: 'opened',
        pull_request: {
          number: prNumber,
          title: 'Add new feature',
          body: 'This adds a new feature',
          draft: false,
          merged: false,
          user: { login: 'github-author' },
          head: { ref: 'feature-branch' },
          base: { ref: 'main' },
          html_url: 'https://github.com/owner/repo/pull/1001',
          requested_reviewers: [
            { login: 'github-user-1' },
            { login: 'github-user-2' }
          ]
        },
        repository: {
          name: 'test-repo',
          owner: { login: 'test-owner' }
        },
        sender: { login: 'github-author' }
      });

      // Verify Discord message was sent
      expect(mockDiscordService.sendMessage).toHaveBeenCalledTimes(1);
      expect(mockDiscordService.sendMessage).toHaveBeenCalledWith(
        testChannelId,
        expect.objectContaining({
          embeds: expect.arrayContaining([
            expect.objectContaining({
              title: expect.stringContaining('Add new feature'),
            })
          ])
        })
      );

      // Verify thread was created
      expect(mockDiscordService.createThread).toHaveBeenCalledTimes(1);
      expect(mockDiscordService.createThread).toHaveBeenCalledWith(
        testChannelId,
        'msg-id',
        expect.stringContaining('Add new feature')
      );

      // Verify initial thread message
      expect(mockDiscordService.sendThreadMessage).toHaveBeenCalledWith(
        'thread-id',
        expect.stringContaining('PR #1001')
      );

      // Verify state
      const state = await stateService.getPRState(prNumber);
      expect(state).toMatchObject({
        prNumber: 1001,
        status: 'ready_for_review',
        reviewers: ['github-user-1', 'github-user-2'],
        reviews: [],
        discordMessageId: 'msg-id',
        discordThreadId: 'thread-id',
        addedThreadMembers: [],
      });

      jest.clearAllMocks();

      // Step 2: Reviewer 1 Approves
      await sendWebhook('pull_request_review', {
        action: 'submitted',
        review: {
          id: 12345,
          user: { login: 'github-user-1' },
          body: 'Looks good!',
          state: 'approved',
          submitted_at: '2026-02-05T12:00:00Z'
        },
        pull_request: {
          number: prNumber,
        },
        repository: {
          name: 'test-repo',
          owner: { login: 'test-owner' }
        }
      });

      // Verify message was edited with approved status
      expect(mockDiscordService.editMessage).toHaveBeenCalledTimes(1);

      // Verify approval reaction was added
      expect(mockDiscordService.addReaction).toHaveBeenCalledWith(
        testChannelId,
        'msg-id',
        '✅'
      );

      // Verify thread message for approval
      expect(mockDiscordService.sendThreadMessage).toHaveBeenCalledWith(
        'thread-id',
        expect.stringContaining('approved')
      );

      // Verify state updated
      const stateAfterApproval = await stateService.getPRState(prNumber);
      expect(stateAfterApproval?.status).toBe('approved');
      expect(stateAfterApproval?.reviews).toHaveLength(1);
      expect(stateAfterApproval?.reviews[0]).toMatchObject({
        reviewer: 'github-user-1',
        state: 'approved',
      });

      jest.clearAllMocks();

      // Step 3: PR Merged
      await sendWebhook('pull_request', {
        action: 'closed',
        pull_request: {
          number: prNumber,
          merged: true,
          merged_by: { login: 'github-author' }
        },
        repository: {
          name: 'test-repo',
          owner: { login: 'test-owner' }
        },
        sender: { login: 'github-author' }
      });

      // Verify message was edited with merged status
      expect(mockDiscordService.editMessage).toHaveBeenCalledTimes(1);

      // Verify reactions were updated (remove ✅, add 🎉)
      expect(mockDiscordService.removeReaction).toHaveBeenCalledWith(
        testChannelId,
        'msg-id',
        '✅'
      );
      expect(mockDiscordService.removeReaction).toHaveBeenCalledWith(
        testChannelId,
        'msg-id',
        '🔴'
      );
      expect(mockDiscordService.addReaction).toHaveBeenCalledWith(
        testChannelId,
        'msg-id',
        '🎉'
      );

      // Verify thread was locked
      expect(mockDiscordService.lockThread).toHaveBeenCalledWith('thread-id');

      // Verify final state
      const finalState = await stateService.getPRState(prNumber);
      expect(finalState?.status).toBe('merged');
    });
  });

  describe('Scenario 2: PR with Changes Requested', () => {
    const prNumber = 1002;

    it('should handle changes requested → fixed → approved flow', async () => {
      // Step 1: PR Opened
      await sendWebhook('pull_request', {
        action: 'opened',
        pull_request: {
          number: prNumber,
          title: 'Fix bug',
          body: 'Bug fix',
          draft: false,
          merged: false,
          user: { login: 'github-author' },
          head: { ref: 'bugfix' },
          base: { ref: 'main' },
          html_url: 'https://github.com/owner/repo/pull/1002',
          requested_reviewers: [{ login: 'github-user-1' }]
        },
        repository: { name: 'test-repo', owner: { login: 'test-owner' } },
        sender: { login: 'github-author' }
      });

      jest.clearAllMocks();

      // Step 2: Reviewer requests changes
      await sendWebhook('pull_request_review', {
        action: 'submitted',
        review: {
          id: 22222,
          user: { login: 'github-user-1' },
          body: 'Please fix the typo',
          state: 'changes_requested',
          submitted_at: '2026-02-05T12:00:00Z'
        },
        pull_request: { number: prNumber },
        repository: { name: 'test-repo', owner: { login: 'test-owner' } }
      });

      // Verify changes requested reaction
      expect(mockDiscordService.addReaction).toHaveBeenCalledWith(
        testChannelId,
        'msg-id',
        '🔴'
      );

      // Verify state
      const stateAfterChanges = await stateService.getPRState(prNumber);
      expect(stateAfterChanges?.status).toBe('changes_requested');

      jest.clearAllMocks();

      // Step 3: Reviewer approves (after author fixes)
      await sendWebhook('pull_request_review', {
        action: 'submitted',
        review: {
          id: 33333,
          user: { login: 'github-user-1' },
          body: 'Fixed! LGTM',
          state: 'approved',
          submitted_at: '2026-02-05T13:00:00Z'
        },
        pull_request: { number: prNumber },
        repository: { name: 'test-repo', owner: { login: 'test-owner' } }
      });

      // Verify reactions swapped (remove 🔴, add ✅)
      expect(mockDiscordService.removeReaction).toHaveBeenCalledWith(
        testChannelId,
        'msg-id',
        '🔴'
      );
      expect(mockDiscordService.addReaction).toHaveBeenCalledWith(
        testChannelId,
        'msg-id',
        '✅'
      );

      // Verify final state
      const finalState = await stateService.getPRState(prNumber);
      expect(finalState?.status).toBe('approved');
    });
  });

  describe('Scenario 3: Reviewer Management', () => {
    const prNumber = 1003;

    it('should handle adding and removing reviewers', async () => {
      // Step 1: PR Opened with no reviewers
      await sendWebhook('pull_request', {
        action: 'opened',
        pull_request: {
          number: prNumber,
          title: 'Update docs',
          body: 'Documentation update',
          draft: false,
          merged: false,
          user: { login: 'github-author' },
          head: { ref: 'docs' },
          base: { ref: 'main' },
          html_url: 'https://github.com/owner/repo/pull/1003',
          requested_reviewers: []
        },
        repository: { name: 'test-repo', owner: { login: 'test-owner' } },
        sender: { login: 'github-author' }
      });

      const initialState = await stateService.getPRState(prNumber);
      expect(initialState?.reviewers).toHaveLength(0);

      jest.clearAllMocks();

      // Step 2: Add reviewer
      await sendWebhook('pull_request', {
        action: 'review_requested',
        pull_request: { number: prNumber },
        requested_reviewer: { login: 'github-user-1' },
        repository: { name: 'test-repo', owner: { login: 'test-owner' } },
        sender: { login: 'github-author' }
      });

      // Verify reviewer was added to thread
      expect(mockDiscordService.addThreadMember).toHaveBeenCalledWith(
        'thread-id',
        '111111111' // Discord user ID for github-user-1
      );

      // Verify thread notification
      expect(mockDiscordService.sendThreadMessage).toHaveBeenCalledWith(
        'thread-id',
        expect.stringContaining('added as a reviewer')
      );

      // Verify state
      const stateAfterAdd = await stateService.getPRState(prNumber);
      expect(stateAfterAdd?.reviewers).toContain('github-user-1');
      expect(stateAfterAdd?.addedThreadMembers).toContain('111111111');

      jest.clearAllMocks();

      // Step 3: Remove reviewer
      await sendWebhook('pull_request', {
        action: 'review_request_removed',
        pull_request: { number: prNumber },
        requested_reviewer: { login: 'github-user-1' },
        repository: { name: 'test-repo', owner: { login: 'test-owner' } },
        sender: { login: 'github-author' }
      });

      // Verify reviewer was removed from thread
      expect(mockDiscordService.removeThreadMember).toHaveBeenCalledWith(
        'thread-id',
        '111111111'
      );

      // Verify state
      const stateAfterRemove = await stateService.getPRState(prNumber);
      expect(stateAfterRemove?.reviewers).not.toContain('github-user-1');
      expect(stateAfterRemove?.addedThreadMembers).not.toContain('111111111');
    });
  });

  describe('Scenario 4: Complex Status Transitions', () => {
    const prNumber = 1004;

    it('should handle draft → ready → changes → approved → close → reopen', async () => {
      // Step 1: Draft PR opened
      await sendWebhook('pull_request', {
        action: 'opened',
        pull_request: {
          number: prNumber,
          title: 'WIP: New API',
          body: 'Work in progress',
          draft: true,
          merged: false,
          user: { login: 'github-author' },
          head: { ref: 'api' },
          base: { ref: 'main' },
          html_url: 'https://github.com/owner/repo/pull/1004',
          requested_reviewers: []
        },
        repository: { name: 'test-repo', owner: { login: 'test-owner' } },
        sender: { login: 'github-author' }
      });

      let state = await stateService.getPRState(prNumber);
      expect(state?.status).toBe('draft');
      expect(state?.isDraft).toBe(true);

      jest.clearAllMocks();

      // Step 2: Mark as ready for review
      await sendWebhook('pull_request', {
        action: 'ready_for_review',
        pull_request: { number: prNumber },
        repository: { name: 'test-repo', owner: { login: 'test-owner' } }
      });

      state = await stateService.getPRState(prNumber);
      expect(state?.status).toBe('ready_for_review');
      expect(state?.isDraft).toBe(false);

      jest.clearAllMocks();

      // Step 3: Request changes
      await sendWebhook('pull_request_review', {
        action: 'submitted',
        review: {
          id: 44444,
          user: { login: 'github-user-1' },
          body: 'Needs work',
          state: 'changes_requested',
          submitted_at: '2026-02-05T14:00:00Z'
        },
        pull_request: { number: prNumber },
        repository: { name: 'test-repo', owner: { login: 'test-owner' } }
      });

      state = await stateService.getPRState(prNumber);
      expect(state?.status).toBe('changes_requested');

      jest.clearAllMocks();

      // Step 4: Approve
      await sendWebhook('pull_request_review', {
        action: 'submitted',
        review: {
          id: 55555,
          user: { login: 'github-user-1' },
          body: 'Perfect!',
          state: 'approved',
          submitted_at: '2026-02-05T15:00:00Z'
        },
        pull_request: { number: prNumber },
        repository: { name: 'test-repo', owner: { login: 'test-owner' } }
      });

      state = await stateService.getPRState(prNumber);
      expect(state?.status).toBe('approved');

      jest.clearAllMocks();

      // Step 5: Close without merging
      await sendWebhook('pull_request', {
        action: 'closed',
        pull_request: {
          number: prNumber,
          merged: false,
        },
        repository: { name: 'test-repo', owner: { login: 'test-owner' } },
        sender: { login: 'github-author' }
      });

      state = await stateService.getPRState(prNumber);
      expect(state?.status).toBe('closed');
      expect(mockDiscordService.lockThread).toHaveBeenCalled();
      expect(mockDiscordService.addReaction).toHaveBeenCalledWith(
        testChannelId,
        'msg-id',
        '🚪'
      );

      jest.clearAllMocks();

      // Step 6: Reopen
      await sendWebhook('pull_request', {
        action: 'reopened',
        pull_request: { number: prNumber },
        repository: { name: 'test-repo', owner: { login: 'test-owner' } },
        sender: { login: 'github-author' }
      });

      state = await stateService.getPRState(prNumber);
      // Should recalculate status based on existing reviews
      expect(state?.status).toBe('approved'); // Has approval from step 4

      // Verify thread was unlocked
      expect(mockDiscordService.lockThread).toHaveBeenCalledWith('thread-id', false);

      // Verify closed reaction removed, approval reaction added back
      expect(mockDiscordService.removeReaction).toHaveBeenCalledWith(
        testChannelId,
        'msg-id',
        '🚪'
      );
      expect(mockDiscordService.addReaction).toHaveBeenCalledWith(
        testChannelId,
        'msg-id',
        '✅'
      );
    });
  });

  describe('Scenario 5: Multiple Reviewers with Conflicting Reviews', () => {
    const prNumber = 1005;

    it('should prioritize changes_requested over approvals', async () => {
      // Step 1: PR Opened
      await sendWebhook('pull_request', {
        action: 'opened',
        pull_request: {
          number: prNumber,
          title: 'Refactor module',
          body: 'Code refactoring',
          draft: false,
          merged: false,
          user: { login: 'github-author' },
          head: { ref: 'refactor' },
          base: { ref: 'main' },
          html_url: 'https://github.com/owner/repo/pull/1005',
          requested_reviewers: [
            { login: 'github-user-1' },
            { login: 'github-user-2' }
          ]
        },
        repository: { name: 'test-repo', owner: { login: 'test-owner' } },
        sender: { login: 'github-author' }
      });

      jest.clearAllMocks();

      // Step 2: User 1 approves
      await sendWebhook('pull_request_review', {
        action: 'submitted',
        review: {
          id: 66666,
          user: { login: 'github-user-1' },
          body: 'LGTM',
          state: 'approved',
          submitted_at: '2026-02-05T16:00:00Z'
        },
        pull_request: { number: prNumber },
        repository: { name: 'test-repo', owner: { login: 'test-owner' } }
      });

      let state = await stateService.getPRState(prNumber);
      expect(state?.status).toBe('approved');

      jest.clearAllMocks();

      // Step 3: User 2 requests changes (should override approval)
      await sendWebhook('pull_request_review', {
        action: 'submitted',
        review: {
          id: 77777,
          user: { login: 'github-user-2' },
          body: 'Please add tests',
          state: 'changes_requested',
          submitted_at: '2026-02-05T16:30:00Z'
        },
        pull_request: { number: prNumber },
        repository: { name: 'test-repo', owner: { login: 'test-owner' } }
      });

      state = await stateService.getPRState(prNumber);
      expect(state?.status).toBe('changes_requested'); // Changes override approvals
      expect(state?.reviews).toHaveLength(2);

      // Verify only 🔴 reaction (not ✅)
      expect(mockDiscordService.removeReaction).toHaveBeenCalledWith(
        testChannelId,
        'msg-id',
        '✅'
      );
      expect(mockDiscordService.addReaction).toHaveBeenCalledWith(
        testChannelId,
        'msg-id',
        '🔴'
      );
    });
  });

  describe('Scenario 6: Review Dismissal', () => {
    const prNumber = 1006;

    it('should handle review dismissal and recalculate status', async () => {
      // Setup: PR with changes requested
      await sendWebhook('pull_request', {
        action: 'opened',
        pull_request: {
          number: prNumber,
          title: 'Security fix',
          body: 'Fixes CVE-2026-1234',
          draft: false,
          merged: false,
          user: { login: 'github-author' },
          head: { ref: 'security' },
          base: { ref: 'main' },
          html_url: 'https://github.com/owner/repo/pull/1006',
          requested_reviewers: [{ login: 'github-user-1' }]
        },
        repository: { name: 'test-repo', owner: { login: 'test-owner' } },
        sender: { login: 'github-author' }
      });

      await sendWebhook('pull_request_review', {
        action: 'submitted',
        review: {
          id: 88888,
          user: { login: 'github-user-1' },
          body: 'Needs more tests',
          state: 'changes_requested',
          submitted_at: '2026-02-05T17:00:00Z'
        },
        pull_request: { number: prNumber },
        repository: { name: 'test-repo', owner: { login: 'test-owner' } }
      });

      let state = await stateService.getPRState(prNumber);
      expect(state?.status).toBe('changes_requested');

      jest.clearAllMocks();

      // Dismiss the review
      await sendWebhook('pull_request_review', {
        action: 'dismissed',
        review: {
          id: 88888,
          user: { login: 'github-user-1' },
          body: 'Needs more tests',
          state: 'changes_requested',
          submitted_at: '2026-02-05T17:00:00Z'
        },
        pull_request: { number: prNumber },
        repository: { name: 'test-repo', owner: { login: 'test-owner' } }
      });

      // Verify reaction was removed
      expect(mockDiscordService.removeReaction).toHaveBeenCalledWith(
        testChannelId,
        'msg-id',
        '🔴'
      );

      // Verify state recalculated
      state = await stateService.getPRState(prNumber);
      expect(state?.status).toBe('ready_for_review'); // No reviews left
      expect(state?.reviews).toHaveLength(0);
    });
  });
});
