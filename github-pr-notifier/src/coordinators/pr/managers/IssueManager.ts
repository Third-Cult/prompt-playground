/**
 * IssueManager
 * 
 * Responsibilities:
 * - Extract issue references from PR description
 * - Format issue links for Discord
 * - Detect changes in linked issues
 * 
 * Pattern: Single-responsibility manager
 */
export class IssueManager {
  /**
   * Extract linked issues from PR description
   * Supports formats: Closes #123, Fixes #456, Resolves #789
   */
  extractLinkedIssues(description: string): string[] {
    if (!description) {
      return [];
    }

    const issues = new Set<string>();

    // Pattern: Closes #123, Fixes #456, Resolves #789, Addresses #101
    // Case-insensitive, matches multiple patterns
    const patterns = [
      /\b(?:close|closes|closed|fix|fixes|fixed|resolve|resolves|resolved|address|addresses|addressed)\s+#(\d+)/gi,
    ];

    for (const pattern of patterns) {
      const matches = description.matchAll(pattern);
      for (const match of matches) {
        issues.add(match[1]);
      }
    }

    return Array.from(issues).sort((a, b) => parseInt(a) - parseInt(b));
  }

  /**
   * Format issues for Discord (comma-separated hyperlinks)
   * Example: "#123, #456, #789" (all hyperlinked, embeds suppressed)
   */
  formatIssuesForDiscord(issues: string[], repoOwner: string, repoName: string): string {
    if (issues.length === 0) {
      return '';
    }

    return issues
      .map((issue) => {
        const url = `https://github.com/${repoOwner}/${repoName}/issues/${issue}`;
        return `[#${issue}](<${url}>)`;
      })
      .join(', ');
  }

  /**
   * Detect added issues (present in new but not in old)
   */
  detectAddedIssues(oldIssues: string[], newIssues: string[]): string[] {
    return newIssues.filter((issue) => !oldIssues.includes(issue));
  }

  /**
   * Detect removed issues (present in old but not in new)
   */
  detectRemovedIssues(oldIssues: string[], newIssues: string[]): string[] {
    return oldIssues.filter((issue) => !newIssues.includes(issue));
  }

  /**
   * Check if issues have changed
   */
  issuesChanged(oldIssues: string[], newIssues: string[]): boolean {
    if (oldIssues.length !== newIssues.length) {
      return true;
    }

    const sortedOld = [...oldIssues].sort();
    const sortedNew = [...newIssues].sort();

    return sortedOld.some((issue, index) => issue !== sortedNew[index]);
  }
}
