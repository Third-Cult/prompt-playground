import { PRData } from '../models/PRState';

/**
 * GitHub webhook payload parser
 * 
 * Extracts PR data from GitHub webhook payloads
 */

/**
 * Extract PR data from pull_request webhook payload
 */
export function extractPRData(payload: any): PRData {
  const pr = payload.pull_request;

  if (!pr) {
    throw new Error('Invalid payload: missing pull_request');
  }

  // Extract linked issues from description
  const linkedIssues = extractLinkedIssuesFromDescription(pr.body || '');

  return {
    number: pr.number,
    title: pr.title,
    description: pr.body || '',
    author: pr.user.login,
    branchName: pr.head.ref,
    baseBranch: pr.base.ref,
    url: pr.html_url,
    isDraft: pr.draft || false,
    repo: payload.repository.name,
    owner: payload.repository.owner.login,
    linkedIssues,
  };
}

/**
 * Extract linked issues from PR description
 * Supports: Closes #123, Fixes #456, Resolves #789
 */
export function extractLinkedIssuesFromDescription(description: string): string[] {
  if (!description) {
    return [];
  }

  const issues = new Set<string>();

  // Pattern: Closes #123, Fixes #456, Resolves #789, Addresses #101
  // Case-insensitive
  const pattern = /\b(?:close|closes|closed|fix|fixes|fixed|resolve|resolves|resolved|address|addresses|addressed)\s+#(\d+)/gi;
  
  const matches = description.matchAll(pattern);
  for (const match of matches) {
    issues.add(match[1]);
  }

  return Array.from(issues).sort((a, b) => parseInt(a) - parseInt(b));
}

/**
 * Extract reviewers from pull_request webhook payload
 */
export function extractReviewers(payload: any): string[] {
  const reviewers = payload.pull_request?.requested_reviewers || [];
  return reviewers.map((reviewer: any) => reviewer.login);
}

/**
 * Check if payload is a PR opened event
 */
export function isPROpenedEvent(payload: any): boolean {
  return payload.action === 'opened';
}

/**
 * Check if payload is a PR edited event
 */
export function isPREditedEvent(payload: any): boolean {
  return payload.action === 'edited';
}

/**
 * Check if payload is a PR closed event
 */
export function isPRClosedEvent(payload: any): boolean {
  return payload.action === 'closed';
}

/**
 * Check if PR was merged (vs just closed)
 */
export function isPRMerged(payload: any): boolean {
  return payload.pull_request?.merged === true;
}

/**
 * Check if payload is a PR converted to draft event
 */
export function isPRConvertedToDraft(payload: any): boolean {
  return payload.action === 'converted_to_draft';
}

/**
 * Check if payload is a PR ready for review event
 */
export function isPRReadyForReview(payload: any): boolean {
  return payload.action === 'ready_for_review';
}

/**
 * Extract who closed/merged the PR
 */
export function extractClosedBy(payload: any): string {
  return payload.pull_request?.merged_by?.login || payload.sender?.login || 'unknown';
}

/**
 * Check if payload is a PR reopened event
 */
export function isPRReopenedEvent(payload: any): boolean {
  return payload.action === 'reopened';
}

/**
 * Check if payload is a review_requested event
 */
export function isReviewRequestedEvent(payload: any): boolean {
  return payload.action === 'review_requested';
}

/**
 * Check if payload is a review_request_removed event
 */
export function isReviewRequestRemovedEvent(payload: any): boolean {
  return payload.action === 'review_request_removed';
}

/**
 * Extract requested reviewer from review_requested/review_request_removed event
 */
export function extractRequestedReviewer(payload: any): string {
  return payload.requested_reviewer?.login || 'unknown';
}

/**
 * Check if payload is from pull_request_review webhook
 */
export function isPullRequestReviewEvent(payload: any): boolean {
  return payload.review !== undefined;
}

/**
 * Check if review is "changes_requested"
 */
export function isReviewChangesRequested(payload: any): boolean {
  return payload.review?.state === 'changes_requested';
}

/**
 * Check if review is "approved"
 */
export function isReviewApproved(payload: any): boolean {
  return payload.review?.state === 'approved';
}

/**
 * Check if review is "commented"
 */
export function isReviewCommented(payload: any): boolean {
  return payload.review?.state === 'commented';
}

/**
 * Check if review was dismissed
 */
export function isReviewDismissed(payload: any): boolean {
  return payload.action === 'dismissed';
}

/**
 * Extract review data from pull_request_review webhook
 */
export function extractReviewData(payload: any): {
  id: number;
  reviewer: string;
  state: 'approved' | 'changes_requested' | 'commented' | 'dismissed';
  comment: string;
  submittedAt: Date;
} {
  const review = payload.review;
  
  return {
    id: review.id,
    reviewer: review.user.login,
    state: payload.action === 'dismissed' ? 'dismissed' : review.state,
    comment: review.body || '',
    submittedAt: new Date(review.submitted_at),
  };
}

/**
 * Extract PR number from any webhook payload
 */
export function extractPRNumber(payload: any): number {
  return payload.pull_request?.number || 0;
}
