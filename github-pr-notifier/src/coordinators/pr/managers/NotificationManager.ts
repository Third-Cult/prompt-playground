import { IMessageTemplateService } from '../../../services/templates/interfaces/IMessageTemplateService';
import { UserMappingManager } from './UserMappingManager';
import { PRData, PRStatus, PRStateData } from '../../../models/PRState';
import { MessageContent } from '../../../services/discord/interfaces/IDiscordService';

/**
 * NotificationManager
 * 
 * Responsibilities:
 * - Format notification content for Discord
 * - Prepare message data using templates
 * - Handle status formatting
 * 
 * Pattern: Single-responsibility manager
 */
export class NotificationManager {
  constructor(
    private templateService: IMessageTemplateService,
    private userMappingManager: UserMappingManager
  ) {}

  /**
   * Prepare PR created notification
   */
  preparePRCreatedNotification(
    prData: PRData | PRStateData,
    reviewers: string[]
  ): MessageContent {
    const prNumber = 'number' in prData ? prData.number : prData.prNumber;
    const authorMention = this.userMappingManager.getDiscordMention(prData.author);
    const reviewersMentions =
      reviewers.length > 0
        ? this.userMappingManager.getDiscordMentions(reviewers)
        : this.templateService.render('warnings', {}).no_reviewers;

    const status = this.formatStatus('ready_for_review', prData.isDraft);

    const rendered = this.templateService.render('pr_created', {
      title: prData.title,
      prNumber,
      url: prData.url,
      description: prData.description || '_No description provided_',
      color: this.getStatusColor(prData.isDraft ? 'draft' : 'ready_for_review'),
      branchName: prData.branchName,
      baseBranch: prData.baseBranch,
      authorMention,
      reviewersMentions,
      status,
      repo: `${prData.owner}/${prData.repo}`,
      timestamp: new Date().toISOString(),
    });

    return rendered;
  }

  /**
   * Prepare thread created message
   */
  prepareThreadCreatedMessage(prNumber: number, title: string, url: string): string {
    const rendered = this.templateService.render('thread_messages', {
      prNumber,
      title,
      url,
    });

    return rendered.pr_created;
  }

  /**
   * Prepare PR closed/merged notification
   */
  preparePRClosedNotification(
    prData: PRData | PRStateData,
    reviewers: string[],
    closedBy: string,
    isMerged: boolean
  ): MessageContent {
    const prNumber = 'number' in prData ? prData.number : prData.prNumber;
    const authorMention = this.userMappingManager.getDiscordMention(prData.author);
    const closerMention = this.userMappingManager.getDiscordMention(closedBy);
    const reviewersMentions =
      reviewers.length > 0
        ? this.userMappingManager.getDiscordMentions(reviewers)
        : this.templateService.render('warnings', {}).no_reviewers;

    const statusKey = isMerged ? 'merged' : 'closed';
    const statusMessages = this.templateService.render('status_messages', {});
    const status = statusMessages[statusKey].replace('{{merger}}', closerMention).replace('{{closer}}', closerMention);

    const rendered = this.templateService.render('pr_created', {
      title: prData.title,
      prNumber,
      url: prData.url,
      description: prData.description || '_No description provided_',
      color: this.getStatusColor(isMerged ? 'merged' : 'closed'),
      branchName: prData.branchName,
      baseBranch: prData.baseBranch,
      authorMention,
      reviewersMentions,
      status,
      repo: `${prData.owner}/${prData.repo}`,
      timestamp: new Date().toISOString(),
    });

    return rendered;
  }

  /**
   * Prepare thread closed/merged message
   */
  prepareThreadClosedMessage(
    prNumber: number,
    author: string,
    closedBy: string,
    isMerged: boolean
  ): string {
    const authorMention = this.userMappingManager.getDiscordMention(author);
    const closerMention = this.userMappingManager.getDiscordMention(closedBy);
    const messageKey = isMerged ? 'pr_merged' : 'pr_closed';

    const rendered = this.templateService.render('thread_messages', {
      prNumber,
      authorMention,
      mergerMention: closerMention,
      closerMention: closerMention,
      comment: '', // No comment for now
    });

    return rendered[messageKey];
  }

  /**
   * Prepare thread message when reviewer is added
   */
  prepareThreadReviewerAddedMessage(reviewer: string): string {
    const reviewerMention = this.userMappingManager.getDiscordMention(reviewer);

    const rendered = this.templateService.render('thread_messages', {
      reviewerMention,
    });

    return rendered.reviewer_added;
  }

  /**
   * Prepare thread message when reviewer is removed
   */
  prepareThreadReviewerRemovedMessage(reviewer: string): string {
    const reviewerMention = this.userMappingManager.getDiscordMention(reviewer);

    const rendered = this.templateService.render('thread_messages', {
      reviewerMention,
    });

    return rendered.reviewer_removed;
  }

  /**
   * Prepare thread message when changes are requested
   */
  prepareThreadChangesRequestedMessage(
    reviewer: string,
    author: string,
    comment: string
  ): string {
    const reviewerMention = this.userMappingManager.getDiscordMention(reviewer);
    const authorMention = this.userMappingManager.getDiscordMention(author);
    const commentSuffix = comment ? `\n\n> ${comment}` : '';

    const rendered = this.templateService.render('thread_messages', {
      reviewerMention,
      authorMention,
      commentSuffix,
    });

    return rendered.review_changes_requested;
  }

  /**
   * Prepare thread message when PR is approved
   */
  prepareThreadApprovedMessage(
    reviewer: string,
    author: string,
    comment: string
  ): string {
    const reviewerMention = this.userMappingManager.getDiscordMention(reviewer);
    const authorMention = this.userMappingManager.getDiscordMention(author);
    const commentSuffix = comment ? `\n\n> ${comment}` : '';

    const rendered = this.templateService.render('thread_messages', {
      reviewerMention,
      authorMention,
      commentSuffix,
    });

    return rendered.review_approved;
  }

  /**
   * Prepare thread message when review is dismissed
   */
  prepareThreadReviewDismissedMessage(reviewer: string, reviewState: string): string {
    const reviewerMention = this.userMappingManager.getDiscordMention(reviewer);

    const rendered = this.templateService.render('thread_messages', {
      reviewerMention,
      reviewState,
    });

    return rendered.review_dismissed;
  }

  /**
   * Prepare thread message when PR is reopened
   */
  prepareThreadReopenedMessage(prNumber: number, author: string): string {
    const authorMention = this.userMappingManager.getDiscordMention(author);

    const rendered = this.templateService.render('thread_messages', {
      prNumber,
      authorMention,
    });

    return rendered.pr_reopened;
  }

  /**
   * Prepare notification with review status (for updating parent message)
   */
  prepareReviewStatusNotification(
    prData: PRData | PRStateData,
    reviewers: string[],
    status: PRStatus,
    statusReviewers: string[] // Reviewers who approved/requested changes
  ): MessageContent {
    const prNumber = 'number' in prData ? prData.number : prData.prNumber;
    const authorMention = this.userMappingManager.getDiscordMention(prData.author);
    const reviewersMentions =
      reviewers.length > 0
        ? this.userMappingManager.getDiscordMentions(reviewers)
        : this.templateService.render('warnings', {}).no_reviewers;

    // Format status with reviewer mentions for approved/changes_requested
    let statusText: string;
    if (status === 'approved' || status === 'changes_requested') {
      const statusReviewerMentions = this.userMappingManager.getDiscordMentions(statusReviewers);
      const statusMessages = this.templateService.render('status_messages', {});
      statusText = statusMessages[status].replace('{{reviewers}}', statusReviewerMentions);
    } else {
      statusText = this.formatStatus(status, prData.isDraft);
    }

    const rendered = this.templateService.render('pr_created', {
      title: prData.title,
      prNumber,
      url: prData.url,
      description: prData.description || '_No description provided_',
      color: this.getStatusColor(status),
      branchName: prData.branchName,
      baseBranch: prData.baseBranch,
      authorMention,
      reviewersMentions,
      status: statusText,
      repo: `${prData.owner}/${prData.repo}`,
      timestamp: new Date().toISOString(),
    });

    return rendered;
  }

  /**
   * Format status message
   */
  private formatStatus(status: PRStatus, isDraft: boolean): string {
    const statusKey = isDraft ? 'draft' : status;
    const statusMessages = this.templateService.render('status_messages', {});
    
    return statusMessages[statusKey] || `Status: ${status}`;
  }

  /**
   * Get status color for Discord embed
   */
  private getStatusColor(status: PRStatus): number {
    const colors: Record<PRStatus, number> = {
      draft: 0x6e7681, // Gray
      ready_for_review: 0x1f6feb, // Blue
      changes_requested: 0xda3633, // Red
      approved: 0x2da44e, // Green
      merged: 0x8250df, // Purple
      closed: 0x6e7681, // Gray
    };

    return colors[status] || 0x1f6feb;
  }
}
