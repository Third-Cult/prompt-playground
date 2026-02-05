import { logger } from '../../../utils/logger';

/**
 * UserMappingManager
 * 
 * Responsibilities:
 * - Map GitHub usernames to Discord user IDs
 * - Handle missing mappings gracefully
 * - Provide mention formatting
 * 
 * Pattern: Single-responsibility manager
 */
export class UserMappingManager {
  constructor(private mappings: Record<string, string>) {}

  /**
   * Get Discord user ID for a GitHub username
   * 
   * @param githubUsername - GitHub username
   * @returns Discord user ID or null if not mapped
   */
  getDiscordUserId(githubUsername: string): string | null {
    return this.mappings[githubUsername] || null;
  }

  /**
   * Get Discord mention string for a GitHub username
   * Falls back to @github-username if no mapping exists
   * 
   * @param githubUsername - GitHub username
   * @returns Discord mention string (e.g., "<@123456>" or "@username")
   */
  getDiscordMention(githubUsername: string): string {
    const userId = this.getDiscordUserId(githubUsername);
    
    if (userId) {
      return `<@${userId}>`;
    }

    // Fallback to GitHub username
    logger.debug(`No Discord mapping for GitHub user: ${githubUsername}`);
    return `@${githubUsername}`;
  }

  /**
   * Get Discord mentions for multiple GitHub usernames
   * 
   * @param githubUsernames - Array of GitHub usernames
   * @returns Comma-separated Discord mentions
   */
  getDiscordMentions(githubUsernames: string[]): string {
    if (githubUsernames.length === 0) {
      return '';
    }

    return githubUsernames.map((username) => this.getDiscordMention(username)).join(', ');
  }

  /**
   * Check if a GitHub username has a Discord mapping
   * 
   * @param githubUsername - GitHub username
   * @returns true if mapping exists
   */
  hasMapping(githubUsername: string): boolean {
    return githubUsername in this.mappings;
  }

  /**
   * Get all mapped GitHub usernames
   * 
   * @returns Array of GitHub usernames with mappings
   */
  getMappedUsernames(): string[] {
    return Object.keys(this.mappings);
  }
}
