import { FileStateService } from './FileStateService';
import { PRStateData } from '../../models/PRState';
import fs from 'fs/promises';
import path from 'path';

describe('FileStateService', () => {
  let service: FileStateService;
  let tempDir: string;
  let filePath: string;

  beforeEach(async () => {
    // Create temporary directory for test files
    tempDir = path.join(__dirname, '__test_state__');
    filePath = path.join(tempDir, 'test-state.json');
    
    service = new FileStateService(filePath);
  });

  afterEach(async () => {
    // Clean up
    await service.cleanup();
    await fs.rm(tempDir, { recursive: true, force: true });
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

  describe('init', () => {
    it('creates directory if it does not exist', async () => {
      await service.init();

      const dirExists = await fs.stat(tempDir).then(() => true).catch(() => false);
      expect(dirExists).toBe(true);
    });

    it('loads existing state from file', async () => {
      // Pre-create state file
      await fs.mkdir(tempDir, { recursive: true });
      const state1 = createMockPRState(123);
      const state2 = createMockPRState(456);
      await fs.writeFile(
        filePath,
        JSON.stringify({
          prStates: {
            '123': state1,
            '456': state2,
          },
        })
      );

      await service.init();

      const retrieved1 = await service.getPRState(123);
      const retrieved2 = await service.getPRState(456);

      expect(retrieved1?.prNumber).toBe(123);
      expect(retrieved2?.prNumber).toBe(456);
    });

    it('starts fresh when no file exists', async () => {
      await service.init();

      const allStates = await service.getAllPRStates();
      expect(allStates).toEqual([]);
    });
  });

  describe('savePRState', () => {
    beforeEach(async () => {
      await service.init();
    });

    it('saves PR state', async () => {
      const state = createMockPRState(123);

      await service.savePRState(123, state);

      const retrieved = await service.getPRState(123);
      expect(retrieved).toEqual(expect.objectContaining({
        prNumber: 123,
        title: 'Test PR 123',
      }));
    });

    it('persists state to disk', async () => {
      const state = createMockPRState(123);
      await service.savePRState(123, state);

      // Wait for debounced save
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Create new service instance and load
      const newService = new FileStateService(filePath);
      await newService.init();

      const retrieved = await newService.getPRState(123);
      expect(retrieved?.prNumber).toBe(123);

      await newService.cleanup();
    });
  });

  describe('deletePRState', () => {
    beforeEach(async () => {
      await service.init();
    });

    it('deletes PR state', async () => {
      const state = createMockPRState(123);
      await service.savePRState(123, state);

      await service.deletePRState(123);

      const retrieved = await service.getPRState(123);
      expect(retrieved).toBeNull();
    });

    it('persists deletion to disk', async () => {
      const state = createMockPRState(123);
      await service.savePRState(123, state);
      await service.deletePRState(123);

      // Wait for debounced save
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Create new service instance and verify deletion persisted
      const newService = new FileStateService(filePath);
      await newService.init();

      const retrieved = await newService.getPRState(123);
      expect(retrieved).toBeNull();

      await newService.cleanup();
    });
  });

  describe('flush', () => {
    beforeEach(async () => {
      await service.init();
    });

    it('immediately writes state to disk', async () => {
      const state = createMockPRState(123);
      await service.savePRState(123, state);

      // Flush immediately (don't wait for debounce)
      await service.flush();

      // Verify file was written
      const fileContent = await fs.readFile(filePath, 'utf-8');
      const parsed = JSON.parse(fileContent);

      expect(parsed.prStates['123']).toBeDefined();
      expect(parsed.prStates['123'].prNumber).toBe(123);
    });

    it('does not write when state is not dirty', async () => {
      await service.flush();

      // Should not throw, but also shouldn't create file
      const fileExists = await fs.stat(filePath).then(() => true).catch(() => false);
      expect(fileExists).toBe(false);
    });
  });

  describe('cleanup', () => {
    beforeEach(async () => {
      await service.init();
    });

    it('flushes state before cleanup', async () => {
      const state = createMockPRState(123);
      await service.savePRState(123, state);

      await service.cleanup();

      // Verify state was written
      const newService = new FileStateService(filePath);
      await newService.init();
      const retrieved = await newService.getPRState(123);
      expect(retrieved?.prNumber).toBe(123);

      await newService.cleanup();
    });
  });

  // Same behavior tests as InMemoryStateService
  describe('IStateService interface compliance', () => {
    beforeEach(async () => {
      await service.init();
    });

    it('implements getDiscordMessageId', async () => {
      const state = createMockPRState(123);
      await service.savePRState(123, state);

      const messageId = await service.getDiscordMessageId(123);

      expect(messageId).toBe('msg-123');
    });

    it('implements getThreadId', async () => {
      const state = createMockPRState(123);
      await service.savePRState(123, state);

      const threadId = await service.getThreadId(123);

      expect(threadId).toBe('thread-123');
    });

    it('implements getPRNumberByMessageId', async () => {
      const state = createMockPRState(123);
      await service.savePRState(123, state);

      const prNumber = await service.getPRNumberByMessageId('msg-123');

      expect(prNumber).toBe(123);
    });

    it('implements getAllPRStates', async () => {
      await service.savePRState(123, createMockPRState(123));
      await service.savePRState(456, createMockPRState(456));

      const allStates = await service.getAllPRStates();

      expect(allStates).toHaveLength(2);
    });
  });
});
