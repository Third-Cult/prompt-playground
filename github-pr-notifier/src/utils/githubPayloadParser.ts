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
  };
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
