import { IStateService } from '../../services/state/interfaces/IStateService';
import { IDiscordService } from '../../services/discord/interfaces/IDiscordService';
import { NotificationManager } from './managers/NotificationManager';
import { UserMappingManager } from './managers/UserMappingManager';
import { PRData, PRStateData, PRStatus } from '../../models/PRState';
import { logger } from '../../utils/logger';
import { extractPRData, extractReviewers, isPRMerged } from '../../utils/githubPayloadParser';

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
    // Atomically check and claim this PR creation to prevent duplicates
    const sizeBefore = this.creatingPRs.size;
    this.creatingPRs.add(prData.number);
    const sizeAfter = this.creatingPRs.size;
    
    // If size didn't change, another thread already claimed it
    if (sizeBefore === sizeAfter) {
      logger.warn(`PR #${prData.number} is already being created by another thread, skipping duplicate`);
      // Wait for the other thread to finish
      await new Promise(resolve => setTimeout(resolve, 2000));
      return;
    }

    try {
      logger.info(`Handling PR opened: #${prData.number} - ${prData.title}`);

      // Double-check if PR already exists (might have been created while we were waiting)
      const existingState = await this.stateService.getPRState(prData.number);
      if (existingState) {
        logger.warn(`PR #${prData.number} already exists in state, skipping duplicate creation`);
        return;
      }

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
        prData.url,
        prData.author,
        reviewers
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
    } finally {
      // Remove from creating set
      this.creatingPRs.delete(prData.number);
    }
  }

  /**
   * Handle PR converted to draft
   */
  async handlePRConvertedToDraft(prNumber: number, payload: any): Promise<void> {
    try {
      logger.info(`Handling PR converted to draft: #${prNumber}`);

      // Ensure PR is tracked
      const state = await this.ensurePRTracked(prNumber, payload);
      if (!state) {
        return; // PR is closed/merged or failed to create
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
  async handlePRReadyForReview(prNumber: number, payload: any): Promise<void> {
    try {
      logger.info(`Handling PR ready for review: #${prNumber}`);

      // Ensure PR is tracked
      const state = await this.ensurePRTracked(prNumber, payload);
      if (!state) {
        return; // PR is closed/merged or failed to create
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

        // Collect all Discord user IDs to remove (reviewers + author)
        const membersToRemove = [...state.addedThreadMembers];
        
        // Add author to removal list if they have a Discord mapping
        const authorDiscordId = this.userMappingManager.getDiscordUserId(state.author);
        if (authorDiscordId && !membersToRemove.includes(authorDiscordId)) {
          membersToRemove.push(authorDiscordId);
        }

        // Remove all members (reviewers + author)
        if (membersToRemove.length > 0) {
          logger.info(`Removing ${membersToRemove.length} members from thread ${state.discordThreadId}`);
          
          for (const memberId of membersToRemove) {
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
          logger.info(`No members to remove from thread ${state.discordThreadId}`);
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
  async handlePRReopened(prNumber: number, payload: any): Promise<void> {
    try {
      logger.info(`Handling PR reopened: #${prNumber}`);

      // Ensure PR is tracked
      const state = await this.ensurePRTracked(prNumber, payload);
      if (!state) {
        return; // PR is closed/merged or failed to create
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

      // Unlock the thread and add author back with reminder message
      if (!state.discordThreadId) {
        logger.warn(`PR #${prNumber} missing Discord thread ID, skipping thread unlock`);
      } else {
        // Unlock the thread
        await this.discordService.lockThread(state.discordThreadId, false); // Unlock
        logger.info(`Thread ${state.discordThreadId} unlocked`);

        // Add author back to the thread if they have a Discord mapping
        const authorDiscordId = this.userMappingManager.getDiscordUserId(state.author);
        if (authorDiscordId) {
          try {
            await this.discordService.addThreadMember(state.discordThreadId, authorDiscordId);
            logger.info(`Added author ${state.author} back to thread ${state.discordThreadId}`);
            
            // Track the author if not already tracked
            if (!state.addedThreadMembers.includes(authorDiscordId)) {
              state.addedThreadMembers.push(authorDiscordId);
            }
          } catch (err) {
            logger.warn(`Failed to add author ${state.author} to thread: ${(err as Error).message}`);
          }
        }

        // Send reopened message with reminder to rerequest reviewers
        const threadMessage = this.notificationManager.prepareThreadReopenedMessage(
          prNumber,
          state.author
        );
        await this.discordService.sendThreadMessage(state.discordThreadId, threadMessage);
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
  async handleReviewerAdded(prNumber: number, reviewer: string, payload: any): Promise<void> {
    try {
      logger.info(`Handling reviewer added: #${prNumber}, reviewer: ${reviewer}`);

      // Ensure PR is tracked
      const state = await this.ensurePRTracked(prNumber, payload);
      if (!state) {
        return; // PR is closed/merged or failed to create
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
          // Try to add to thread (may fail if bot lacks permissions)
          try {
            await this.discordService.addThreadMember(state.discordThreadId, discordUserId);
            
            // Track the member
            if (!state.addedThreadMembers.includes(discordUserId)) {
              state.addedThreadMembers.push(discordUserId);
            }
            
            logger.info(`Added ${reviewer} (${discordUserId}) to thread and tracked`);
          } catch (error) {
            // Log but don't fail - the @mention in the message will notify them anyway
            logger.warn(`Could not add ${reviewer} to thread: ${(error as Error).message}`);
          }
        } else {
          logger.warn(`No Discord mapping found for reviewer ${reviewer}, skipping thread add`);
        }

        // Send notification in thread (always send this even if adding member failed)
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
  async handleReviewerRemoved(prNumber: number, reviewer: string, payload: any): Promise<void> {
    try {
      logger.info(`Handling reviewer removed: #${prNumber}, reviewer: ${reviewer}`);

      // Ensure PR is tracked
      const state = await this.ensurePRTracked(prNumber, payload);
      if (!state) {
        return; // PR is closed/merged or failed to create
      }

      // Check if this reviewer has already submitted a review
      const hasReviewed = state.reviews.some((r) => r.reviewer === reviewer);
      
      if (hasReviewed) {
        // Don't remove reviewer if they've already reviewed - keep them for historical record
        logger.info(`Reviewer ${reviewer} has already submitted a review, keeping in reviewer list`);
        return;
      }

      // Remove reviewer from state (only if they haven't reviewed yet)
      state.reviewers = state.reviewers.filter((r) => r !== reviewer);
      state.updatedAt = new Date();

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
    },
    payload: any
  ): Promise<void> {
    try {
      logger.info(`Handling review submitted: #${prNumber}, reviewer: ${reviewData.reviewer}, state: ${reviewData.state}`);

      // Ensure PR is tracked
      const state = await this.ensurePRTracked(prNumber, payload);
      if (!state) {
        return; // PR is closed/merged or failed to create
      }

      // Add reviewer to reviewers list if they're not already there and submitted a meaningful review
      // (approved or changes_requested, not just commented)
      const isNewReviewer = !state.reviewers.includes(reviewData.reviewer);
      if (isNewReviewer && (reviewData.state === 'approved' || reviewData.state === 'changes_requested')) {
        state.reviewers.push(reviewData.reviewer);
        logger.info(`Added ${reviewData.reviewer} to reviewers list (submitted ${reviewData.state} review)`);
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

        // If this reviewer was added to the list (wasn't officially assigned), add them to the thread
        if (isNewReviewer && (reviewData.state === 'approved' || reviewData.state === 'changes_requested')) {
          const discordUserId = this.userMappingManager.getDiscordUserId(reviewData.reviewer);
          
          if (discordUserId) {
            try {
              await this.discordService.addThreadMember(state.discordThreadId, discordUserId);
              
              // Track the member
              if (!state.addedThreadMembers.includes(discordUserId)) {
                state.addedThreadMembers.push(discordUserId);
              }
              
              logger.info(`Added ${reviewData.reviewer} (${discordUserId}) to thread (auto-added as reviewer)`);
            } catch (error) {
              // Log but don't fail - the @mention in the message will notify them anyway
              logger.warn(`Could not add ${reviewData.reviewer} to thread: ${(error as Error).message}`);
            }
          }
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
    },
    payload: any
  ): Promise<void> {
    try {
      logger.info(`Handling review dismissed: #${prNumber}, reviewer: ${reviewData.reviewer}`);

      // Ensure PR is tracked
      const state = await this.ensurePRTracked(prNumber, payload);
      if (!state) {
        return; // PR is closed/merged or failed to create
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

  // Track PRs currently being created to prevent duplicate creation
  private creatingPRs = new Set<number>();

  /**
   * Ensure PR is being tracked - if not, create it retroactively from webhook payload
   * Returns null if PR is already closed/merged (shouldn't track completed PRs)
   */
  private async ensurePRTracked(prNumber: number, payload: any): Promise<PRStateData | null> {
    // Check if already being tracked
    const existingState = await this.stateService.getPRState(prNumber);
    if (existingState) {
      return existingState;
    }

    // Check if PR is currently being created by handlePROpened
    if (this.creatingPRs.has(prNumber)) {
      logger.warn(`PR #${prNumber} is already being created, waiting for completion...`);
      // Wait for creation to complete
      await new Promise(resolve => setTimeout(resolve, 3000));
      const stateAfterWait = await this.stateService.getPRState(prNumber);
      if (stateAfterWait) {
        logger.info(`PR #${prNumber} was created by concurrent process`);
        return stateAfterWait;
      }
      // If still not created after wait, this is an error
      logger.error(`PR #${prNumber} was being created but not found after wait`);
      return null;
    }

    // Check if PR is already closed or merged - don't track completed PRs
    const pr = payload.pull_request;
    if (!pr) {
      logger.warn(`Cannot ensure tracking for PR #${prNumber}: missing pull_request in payload`);
      return null;
    }

    if (pr.state === 'closed' || isPRMerged(payload)) {
      logger.info(`PR #${prNumber} is already closed/merged, skipping tracking`);
      return null;
    }

    // PR is active but not tracked - create it retroactively
    logger.info(`PR #${prNumber} not tracked, creating retroactively from webhook data`);
    
    try {
      const prData = extractPRData(payload);
      const reviewers = extractReviewers(payload);
      
      // Call handlePROpened to create Discord message, thread, and state
      // handlePROpened will handle the locking
      await this.handlePROpened(prData, reviewers);
      
      // Fetch the newly created state
      const newState = await this.stateService.getPRState(prNumber);
      if (!newState) {
        logger.error(`Failed to create state for PR #${prNumber}`);
        return null;
      }
      
      logger.info(`Successfully created tracking for PR #${prNumber}`);
      return newState;
    } catch (error) {
      logger.error(`Failed to ensure tracking for PR #${prNumber}: ${(error as Error).message}`);
      return null;
    }
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
