import { IStateService } from '../../services/state/interfaces/IStateService';
import { IDiscordService } from '../../services/discord/interfaces/IDiscordService';
import { NotificationManager } from './managers/NotificationManager';
import { PRData, PRStateData } from '../../models/PRState';
import { logger } from '../../utils/logger';

/**
 * PRCoordinator
 * 
 * Responsibilities:
 * - Orchestrate PR lifecycle events
 * - Delegate to managers for specific concerns
 * - Coordinate Discord service calls
 * - Maintain PR state
 * 
 * Pattern: Feature coordinator
 */
export class PRCoordinator {
  constructor(
    private stateService: IStateService,
    private discordService: IDiscordService,
    private notificationManager: NotificationManager,
    private discordChannelId: string
  ) {}

  /**
   * Handle PR opened event
   */
  async handlePROpened(prData: PRData, reviewers: string[]): Promise<void> {
    try {
      logger.info(`Handling PR opened: #${prData.number} - ${prData.title}`);

      // Prepare notification content
      const messageContent = this.notificationManager.preparePRCreatedNotification(
        prData,
        reviewers
      );

      // Send message to Discord
      const messageId = await this.discordService.sendMessage(
        this.discordChannelId,
        messageContent
      );

      logger.info(`Created Discord message: ${messageId}`);

      // Create thread from message
      const threadName = `PR #${prData.number}: ${this.truncateTitle(prData.title)}`;
      const threadId = await this.discordService.createThread(
        this.discordChannelId,
        messageId,
        threadName
      );

      logger.info(`Created Discord thread: ${threadId}`);

      // Send initial thread message
      const threadMessage = this.notificationManager.prepareThreadCreatedMessage(
        prData.number,
        prData.title,
        prData.url
      );

      await this.discordService.sendThreadMessage(threadId, threadMessage);

      // Save state
      const prState: PRStateData = {
        prNumber: prData.number,
        repo: prData.repo,
        owner: prData.owner,
        title: prData.title,
        description: prData.description,
        author: prData.author,
        branchName: prData.branchName,
        baseBranch: prData.baseBranch,
        url: prData.url,
        status: prData.isDraft ? 'draft' : 'ready_for_review',
        isDraft: prData.isDraft,
        reviewers,
        reviews: [],
        discordMessageId: messageId,
        discordThreadId: threadId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await this.stateService.savePRState(prData.number, prState);

      logger.info(`Successfully handled PR opened: #${prData.number}`);
    } catch (error) {
      logger.error(`Failed to handle PR opened: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * Get PR state
   */
  async getPRState(prNumber: number): Promise<PRStateData | null> {
    return this.stateService.getPRState(prNumber);
  }

  /**
   * Check if PR exists in state
   */
  async prExists(prNumber: number): Promise<boolean> {
    const state = await this.stateService.getPRState(prNumber);
    return state !== null;
  }

  /**
   * Truncate title for thread name (Discord limit: 100 characters)
   */
  private truncateTitle(title: string): string {
    const maxLength = 80; // Leave room for "PR #123: "
    if (title.length <= maxLength) {
      return title;
    }
    return title.substring(0, maxLength - 3) + '...';
  }
}
