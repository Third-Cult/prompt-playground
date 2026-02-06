import { IStateService } from '../../services/state/interfaces/IStateService';
import { IDiscordService } from '../../services/discord/interfaces/IDiscordService';
import { NotificationManager } from './managers/NotificationManager';
import { UserMappingManager } from './managers/UserMappingManager';
import { PRData, PRStateData, PRStatus } from '../../models/PRState';
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
    private userMappingManager: UserMappingManager,
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
        addedThreadMembers: [], // Track members we explicitly add
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
   * Handle PR converted to draft
   */
  async handlePRConvertedToDraft(prNumber: number): Promise<void> {
    try {
      logger.info(`Handling PR converted to draft: #${prNumber}`);

      const state = await this.stateService.getPRState(prNumber);
      if (!state) {
        logger.warn(`PR #${prNumber} not found in state, skipping`);
        return;
      }

      // Update state
      state.isDraft = true;
      state.status = 'draft';
      state.updatedAt = new Date();

      // Update Discord message
      const messageContent = this.notificationManager.preparePRCreatedNotification(
        state,
        state.reviewers
      );

      if (!state.discordMessageId) {
        logger.warn(`PR #${prNumber} missing Discord message ID, skipping message update`);
      } else {
        await this.discordService.editMessage(
          this.discordChannelId,
          state.discordMessageId,
          messageContent
        );
      }

      // Save updated state
      await this.stateService.savePRState(prNumber, state);

      logger.info(`Successfully updated PR #${prNumber} to draft`);
    } catch (error) {
      logger.error(`Failed to handle PR converted to draft: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * Handle PR marked ready for review
   */
  async handlePRReadyForReview(prNumber: number): Promise<void> {
    try {
      logger.info(`Handling PR ready for review: #${prNumber}`);

      const state = await this.stateService.getPRState(prNumber);
      if (!state) {
        logger.warn(`PR #${prNumber} not found in state, skipping`);
        return;
      }

      // Update state
      state.isDraft = false;
      state.status = 'ready_for_review';
      state.updatedAt = new Date();

      // Update Discord message
      const messageContent = this.notificationManager.preparePRCreatedNotification(
        state,
        state.reviewers
      );

      if (!state.discordMessageId) {
        logger.warn(`PR #${prNumber} missing Discord message ID, skipping message update`);
      } else {
        await this.discordService.editMessage(
          this.discordChannelId,
          state.discordMessageId,
          messageContent
        );
      }

      // Save updated state
      await this.stateService.savePRState(prNumber, state);

      logger.info(`Successfully updated PR #${prNumber} to ready for review`);
    } catch (error) {
      logger.error(`Failed to handle PR ready for review: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * Handle PR closed
   */
  async handlePRClosed(prNumber: number, closedBy: string, isMerged: boolean): Promise<void> {
    try {
      const action = isMerged ? 'merged' : 'closed';
      logger.info(`Handling PR ${action}: #${prNumber} by ${closedBy}`);

      const state = await this.stateService.getPRState(prNumber);
      if (!state) {
        logger.warn(`PR #${prNumber} not found in state, skipping`);
        return;
      }

      // Update state
      state.status = isMerged ? 'merged' : 'closed';
      state.updatedAt = new Date();

      // Update Discord message with final status
      const messageContent = this.notificationManager.preparePRClosedNotification(
        state,
        state.reviewers,
        closedBy,
        isMerged
      );

      if (!state.discordMessageId) {
        logger.warn(`PR #${prNumber} missing Discord message ID, skipping message update`);
      } else {
        await this.discordService.editMessage(
          this.discordChannelId,
          state.discordMessageId,
          messageContent
        );

        // Clear all review reactions and add merged/closed reaction
        // Remove approval and changes requested reactions
        try {
          await this.discordService.removeReaction(this.discordChannelId, state.discordMessageId, '✅');
        } catch (err) {
          logger.debug(`No ✅ reaction to remove: ${(err as Error).message}`);
        }
        try {
          await this.discordService.removeReaction(this.discordChannelId, state.discordMessageId, '🔴');
        } catch (err) {
          logger.debug(`No 🔴 reaction to remove: ${(err as Error).message}`);
        }

        // Add merged or closed reaction
        if (isMerged) {
          await this.discordService.addReaction(this.discordChannelId, state.discordMessageId, '🎉');
        } else {
          await this.discordService.addReaction(this.discordChannelId, state.discordMessageId, '🚪');
        }
      }

      // Post final message to thread, remove tracked members, and lock it
      if (!state.discordThreadId) {
        logger.warn(`PR #${prNumber} missing Discord thread ID, skipping thread operations`);
      } else {
        const threadMessage = this.notificationManager.prepareThreadClosedMessage(
          prNumber,
          state.author,
          closedBy,
          isMerged
        );

        await this.discordService.sendThreadMessage(state.discordThreadId, threadMessage);

        // Remove members we explicitly added (tracked in state)
        if (state.addedThreadMembers.length > 0) {
          logger.info(`Removing ${state.addedThreadMembers.length} tracked members from thread ${state.discordThreadId}`);
          
          for (const memberId of state.addedThreadMembers) {
            try {
              await this.discordService.removeThreadMember(state.discordThreadId, memberId);
              logger.debug(`Removed member ${memberId} from thread`);
            } catch (err) {
              logger.warn(`Failed to remove member ${memberId} from thread: ${(err as Error).message}`);
            }
          }

          // Clear tracked members after removal
          state.addedThreadMembers = [];
        } else {
          logger.info(`No tracked members to remove from thread ${state.discordThreadId}`);
        }

        // Lock the thread
        await this.discordService.lockThread(state.discordThreadId);
      }

      // Save updated state
      await this.stateService.savePRState(prNumber, state);

      logger.info(`Successfully handled PR ${action}: #${prNumber}`);
    } catch (error) {
      logger.error(`Failed to handle PR closed: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * Handle PR reopened
   */
  async handlePRReopened(prNumber: number): Promise<void> {
    try {
      logger.info(`Handling PR reopened: #${prNumber}`);

      const state = await this.stateService.getPRState(prNumber);
      if (!state) {
        logger.warn(`PR #${prNumber} not found in state, skipping`);
        return;
      }

      // Reset status to allow recalculation (don't keep "closed"/"merged")
      state.status = state.isDraft ? 'draft' : 'ready_for_review';
      
      // Recalculate status based on existing reviews (since PR is being reopened)
      const newStatus = this.calculatePRStatus(state);
      state.status = newStatus;
      state.updatedAt = new Date();

      // Get reviewers who approved/requested changes for status display
      const statusReviewers = this.getStatusReviewers(state);

      // Update Discord message
      const messageContent = this.notificationManager.prepareReviewStatusNotification(
        state,
        state.reviewers,
        newStatus,
        statusReviewers
      );

      if (!state.discordMessageId) {
        logger.warn(`PR #${prNumber} missing Discord message ID, skipping message update`);
      } else {
        await this.discordService.editMessage(
          this.discordChannelId,
          state.discordMessageId,
          messageContent
        );

        // Remove merged/closed reactions if present
        try {
          await this.discordService.removeReaction(this.discordChannelId, state.discordMessageId, '🎉');
        } catch (err) {
          logger.debug(`No 🎉 reaction to remove: ${(err as Error).message}`);
        }
        try {
          await this.discordService.removeReaction(this.discordChannelId, state.discordMessageId, '🚪');
        } catch (err) {
          logger.debug(`No 🚪 reaction to remove: ${(err as Error).message}`);
        }

        // Restore appropriate reaction based on recalculated status
        if (newStatus === 'approved') {
          await this.discordService.addReaction(this.discordChannelId, state.discordMessageId, '✅');
        } else if (newStatus === 'changes_requested') {
          await this.discordService.addReaction(this.discordChannelId, state.discordMessageId, '🔴');
        }
      }

      // Unlock the thread so discussion can continue
      if (!state.discordThreadId) {
        logger.warn(`PR #${prNumber} missing Discord thread ID, skipping thread unlock`);
      } else {
        await this.discordService.lockThread(state.discordThreadId, false); // Unlock
        logger.info(`Thread ${state.discordThreadId} unlocked`);
      }

      // Save updated state
      await this.stateService.savePRState(prNumber, state);

      logger.info(`Successfully handled PR reopened: #${prNumber}`);
    } catch (error) {
      logger.error(`Failed to handle PR reopened: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * Handle reviewer added to PR
   */
  async handleReviewerAdded(prNumber: number, reviewer: string): Promise<void> {
    try {
      logger.info(`Handling reviewer added: #${prNumber}, reviewer: ${reviewer}`);

      const state = await this.stateService.getPRState(prNumber);
      if (!state) {
        logger.warn(`PR #${prNumber} not found in state, skipping`);
        return;
      }

      // Add reviewer to state if not already present
      if (!state.reviewers.includes(reviewer)) {
        state.reviewers.push(reviewer);
        state.updatedAt = new Date();
      }

      // Update Discord message with new reviewer
      const messageContent = this.notificationManager.prepareReviewStatusNotification(
        state,
        state.reviewers,
        state.status,
        this.getStatusReviewers(state)
      );

      if (!state.discordMessageId) {
        logger.warn(`PR #${prNumber} missing Discord message ID, skipping message update`);
      } else {
        await this.discordService.editMessage(
          this.discordChannelId,
          state.discordMessageId,
          messageContent
        );
      }

      // Add reviewer to thread and track them
      if (!state.discordThreadId) {
        logger.warn(`PR #${prNumber} missing Discord thread ID, skipping thread operations`);
      } else {
        const discordUserId = this.userMappingManager.getDiscordUserId(reviewer);
        
        if (discordUserId) {
          // Add to thread
          await this.discordService.addThreadMember(state.discordThreadId, discordUserId);
          
          // Track the member
          if (!state.addedThreadMembers.includes(discordUserId)) {
            state.addedThreadMembers.push(discordUserId);
          }
          
          logger.info(`Added ${reviewer} (${discordUserId}) to thread and tracked`);
        } else {
          logger.warn(`No Discord mapping found for reviewer ${reviewer}, skipping thread add`);
        }

        // Send notification in thread
        const threadMessage = this.notificationManager.prepareThreadReviewerAddedMessage(reviewer);
        await this.discordService.sendThreadMessage(state.discordThreadId, threadMessage);
      }

      // Save updated state
      await this.stateService.savePRState(prNumber, state);

      logger.info(`Successfully handled reviewer added: #${prNumber}`);
    } catch (error) {
      logger.error(`Failed to handle reviewer added: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * Handle reviewer removed from PR
   */
  async handleReviewerRemoved(prNumber: number, reviewer: string): Promise<void> {
    try {
      logger.info(`Handling reviewer removed: #${prNumber}, reviewer: ${reviewer}`);

      const state = await this.stateService.getPRState(prNumber);
      if (!state) {
        logger.warn(`PR #${prNumber} not found in state, skipping`);
        return;
      }

      // Remove reviewer from state
      state.reviewers = state.reviewers.filter((r) => r !== reviewer);
      state.updatedAt = new Date();

      // Remove any reviews from this reviewer
      state.reviews = state.reviews.filter((r) => r.reviewer !== reviewer);

      // Update Discord message
      const messageContent = this.notificationManager.prepareReviewStatusNotification(
        state,
        state.reviewers,
        state.status,
        this.getStatusReviewers(state)
      );

      if (!state.discordMessageId) {
        logger.warn(`PR #${prNumber} missing Discord message ID, skipping message update`);
      } else {
        await this.discordService.editMessage(
          this.discordChannelId,
          state.discordMessageId,
          messageContent
        );
      }

      // Remove reviewer from thread
      if (!state.discordThreadId) {
        logger.warn(`PR #${prNumber} missing Discord thread ID, skipping thread operations`);
      } else {
        const discordUserId = this.userMappingManager.getDiscordUserId(reviewer);
        
        if (discordUserId) {
          // Remove from thread
          try {
            await this.discordService.removeThreadMember(state.discordThreadId, discordUserId);
            
            // Remove from tracked members
            state.addedThreadMembers = state.addedThreadMembers.filter((id) => id !== discordUserId);
            
            logger.info(`Removed ${reviewer} (${discordUserId}) from thread`);
          } catch (err) {
            logger.warn(`Failed to remove ${reviewer} from thread: ${(err as Error).message}`);
          }
        }

        // Send notification in thread
        const threadMessage = this.notificationManager.prepareThreadReviewerRemovedMessage(reviewer);
        await this.discordService.sendThreadMessage(state.discordThreadId, threadMessage);
      }

      // Save updated state
      await this.stateService.savePRState(prNumber, state);

      logger.info(`Successfully handled reviewer removed: #${prNumber}`);
    } catch (error) {
      logger.error(`Failed to handle reviewer removed: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * Handle review submitted (approved, changes_requested, or commented)
   */
  async handleReviewSubmitted(
    prNumber: number,
    reviewData: {
      id: number;
      reviewer: string;
      state: 'approved' | 'changes_requested' | 'commented' | 'dismissed';
      comment: string;
      submittedAt: Date;
    }
  ): Promise<void> {
    try {
      logger.info(`Handling review submitted: #${prNumber}, reviewer: ${reviewData.reviewer}, state: ${reviewData.state}`);

      const state = await this.stateService.getPRState(prNumber);
      if (!state) {
        logger.warn(`PR #${prNumber} not found in state, skipping`);
        return;
      }

      // Update or add review in state
      const existingReviewIndex = state.reviews.findIndex(
        (r) => r.reviewer === reviewData.reviewer
      );

      if (existingReviewIndex !== -1) {
        // Update existing review
        state.reviews[existingReviewIndex] = reviewData;
      } else {
        // Add new review
        state.reviews.push(reviewData);
      }

      // Update PR status based on reviews
      const newStatus = this.calculatePRStatus(state);
      state.status = newStatus;
      state.updatedAt = new Date();

      // Get reviewers who approved/requested changes
      const statusReviewers = this.getStatusReviewers(state);

      // Update Discord message
      const messageContent = this.notificationManager.prepareReviewStatusNotification(
        state,
        state.reviewers,
        newStatus,
        statusReviewers
      );

      if (!state.discordMessageId) {
        logger.warn(`PR #${prNumber} missing Discord message ID, skipping message update`);
      } else {
        await this.discordService.editMessage(
          this.discordChannelId,
          state.discordMessageId,
          messageContent
        );

        // Manage reactions based on overall PR status (not individual review)
        // If changes requested: only show 🔴, remove ✅
        // If approved (no changes): only show ✅, remove 🔴
        if (newStatus === 'changes_requested') {
          // Remove checkmark if present
          try {
            await this.discordService.removeReaction(this.discordChannelId, state.discordMessageId, '✅');
          } catch (err) {
            logger.debug(`No ✅ reaction to remove: ${(err as Error).message}`);
          }
          // Add red circle
          await this.discordService.addReaction(this.discordChannelId, state.discordMessageId, '🔴');
        } else if (newStatus === 'approved') {
          // Remove red circle if present
          try {
            await this.discordService.removeReaction(this.discordChannelId, state.discordMessageId, '🔴');
          } catch (err) {
            logger.debug(`No 🔴 reaction to remove: ${(err as Error).message}`);
          }
          // Add checkmark
          await this.discordService.addReaction(this.discordChannelId, state.discordMessageId, '✅');
        }
      }

      // Send message in thread (only for approved and changes_requested, not just comments)
      if (!state.discordThreadId) {
        logger.warn(`PR #${prNumber} missing Discord thread ID, skipping thread message`);
      } else {
        let threadMessage: string;

        if (reviewData.state === 'approved') {
          threadMessage = this.notificationManager.prepareThreadApprovedMessage(
            reviewData.reviewer,
            state.author,
            reviewData.comment
          );
        } else if (reviewData.state === 'changes_requested') {
          threadMessage = this.notificationManager.prepareThreadChangesRequestedMessage(
            reviewData.reviewer,
            state.author,
            reviewData.comment
          );
        } else {
          // For 'commented' reviews, we don't send a special message
          threadMessage = '';
        }

        if (threadMessage) {
          await this.discordService.sendThreadMessage(state.discordThreadId, threadMessage);
        }
      }

      // Save updated state
      await this.stateService.savePRState(prNumber, state);

      logger.info(`Successfully handled review submitted: #${prNumber}`);
    } catch (error) {
      logger.error(`Failed to handle review submitted: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * Handle review dismissed
   */
  async handleReviewDismissed(
    prNumber: number,
    reviewData: {
      id: number;
      reviewer: string;
      state: 'approved' | 'changes_requested' | 'commented' | 'dismissed';
      comment: string;
      submittedAt: Date;
    }
  ): Promise<void> {
    try {
      logger.info(`Handling review dismissed: #${prNumber}, reviewer: ${reviewData.reviewer}`);

      const state = await this.stateService.getPRState(prNumber);
      if (!state) {
        logger.warn(`PR #${prNumber} not found in state, skipping`);
        return;
      }

      // Remove review from state
      state.reviews = state.reviews.filter((r) => r.reviewer !== reviewData.reviewer);
      state.updatedAt = new Date();

      // Recalculate status
      const newStatus = this.calculatePRStatus(state);
      state.status = newStatus;

      // Get reviewers who approved/requested changes
      const statusReviewers = this.getStatusReviewers(state);

      // Update Discord message
      const messageContent = this.notificationManager.prepareReviewStatusNotification(
        state,
        state.reviewers,
        newStatus,
        statusReviewers
      );

      if (!state.discordMessageId) {
        logger.warn(`PR #${prNumber} missing Discord message ID, skipping message update`);
      } else {
        await this.discordService.editMessage(
          this.discordChannelId,
          state.discordMessageId,
          messageContent
        );

        // Remove reactions if no more approvals/changes requested
        const hasApprovals = state.reviews.some((r) => r.state === 'approved');
        const hasChangesRequested = state.reviews.some((r) => r.state === 'changes_requested');

        if (!hasApprovals) {
          try {
            await this.discordService.removeReaction(this.discordChannelId, state.discordMessageId, '✅');
          } catch (err) {
            logger.debug(`No ✅ reaction to remove: ${(err as Error).message}`);
          }
        }

        if (!hasChangesRequested) {
          try {
            await this.discordService.removeReaction(this.discordChannelId, state.discordMessageId, '🔴');
          } catch (err) {
            logger.debug(`No 🔴 reaction to remove: ${(err as Error).message}`);
          }
        }
      }

      // Send message in thread
      if (!state.discordThreadId) {
        logger.warn(`PR #${prNumber} missing Discord thread ID, skipping thread message`);
      } else {
        const threadMessage = this.notificationManager.prepareThreadReviewDismissedMessage(
          reviewData.reviewer,
          reviewData.state
        );
        await this.discordService.sendThreadMessage(state.discordThreadId, threadMessage);
      }

      // Save updated state
      await this.stateService.savePRState(prNumber, state);

      logger.info(`Successfully handled review dismissed: #${prNumber}`);
    } catch (error) {
      logger.error(`Failed to handle review dismissed: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * Calculate PR status based on reviews
   */
  private calculatePRStatus(state: PRStateData): PRStatus {
    // Don't change status if PR is closed or merged
    if (state.status === 'closed' || state.status === 'merged') {
      return state.status;
    }

    // Check for any changes requested
    const hasChangesRequested = state.reviews.some((r) => r.state === 'changes_requested');
    if (hasChangesRequested) {
      return 'changes_requested';
    }

    // Check for all approvals
    const hasApprovals = state.reviews.some((r) => r.state === 'approved');
    if (hasApprovals) {
      return 'approved';
    }

    // Default to ready_for_review (or draft if still a draft)
    return state.isDraft ? 'draft' : 'ready_for_review';
  }

  /**
   * Get reviewers who caused the current status (approved or changes_requested)
   */
  private getStatusReviewers(state: PRStateData): string[] {
    if (state.status === 'approved') {
      return state.reviews
        .filter((r) => r.state === 'approved')
        .map((r) => r.reviewer);
    } else if (state.status === 'changes_requested') {
      return state.reviews
        .filter((r) => r.state === 'changes_requested')
        .map((r) => r.reviewer);
    }
    return [];
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
