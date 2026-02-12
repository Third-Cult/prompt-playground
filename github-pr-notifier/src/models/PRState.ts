/**
 * PR status enumeration
 */
export type PRStatus =
  | 'draft'
  | 'ready_for_review'
  | 'changes_requested'
  | 'approved'
  | 'merged'
  | 'closed';

/**
 * PR state data stored in state service
 */
export interface PRStateData {
  prNumber: number;
  repo: string;
  owner: string;
  title: string;
  description: string;
  author: string; // GitHub username
  branchName: string;
  baseBranch: string;
  url: string;
  status: PRStatus;
  isDraft: boolean;
  reviewers: string[]; // GitHub usernames
  reviews: Review[];
  linkedIssues?: string[]; // Issue numbers (e.g., ["123", "456"]) - optional for backward compatibility
  discordMessageId: string | null;
  discordThreadId: string | null;
  addedThreadMembers: string[]; // Discord user IDs we explicitly added to thread
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Review data
 */
export interface Review {
  id: number;
  reviewer: string; // GitHub username
  state: 'approved' | 'changes_requested' | 'commented' | 'dismissed';
  comment?: string;
  submittedAt: Date;
}

/**
 * PR data extracted from GitHub webhook payload
 */
export interface PRData {
  number: number;
  title: string;
  description: string;
  author: string;
  branchName: string;
  baseBranch: string;
  url: string;
  isDraft: boolean;
  repo: string;
  owner: string;
  linkedIssues?: string[]; // Issue numbers (e.g., ["123", "456"]) - optional for backward compatibility
}
