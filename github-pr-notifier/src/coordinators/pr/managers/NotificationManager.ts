import { IMessageTemplateService } from '../../../services/templates/interfaces/IMessageTemplateService';
import { UserMappingManager } from './UserMappingManager';
import { PRData, PRStatus } from '../../../models/PRState';
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
  preparePRCreatedNotification(prData: PRData, reviewers: string[]): MessageContent {
    const authorMention = this.userMappingManager.getDiscordMention(prData.author);
    const reviewersMentions =
      reviewers.length > 0
        ? this.userMappingManager.getDiscordMentions(reviewers)
        : this.templateService.render('warnings', {}).no_reviewers;

    const status = this.formatStatus('ready_for_review', prData.isDraft);

    const rendered = this.templateService.render('pr_created', {
      title: prData.title,
      prNumber: prData.number,
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
