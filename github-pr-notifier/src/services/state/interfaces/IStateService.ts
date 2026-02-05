import { PRStateData } from '../../../models/PRState';

/**
 * State Service Interface
 * 
 * Responsibilities:
 * - Persist PR state data
 * - Retrieve PR state by various keys
 * - Provide fast lookups
 */
export interface IStateService {
  /**
   * Save PR state
   */
  savePRState(prNumber: number, state: PRStateData): Promise<void>;

  /**
   * Get PR state by PR number
   */
  getPRState(prNumber: number): Promise<PRStateData | null>;

  /**
   * Delete PR state
   */
  deletePRState(prNumber: number): Promise<void>;

  /**
   * Get Discord message ID for a PR
   */
  getDiscordMessageId(prNumber: number): Promise<string | null>;

  /**
   * Get Discord thread ID for a PR
   */
  getThreadId(prNumber: number): Promise<string | null>;

  /**
   * Get PR number by Discord message ID (reverse lookup)
   */
  getPRNumberByMessageId(messageId: string): Promise<number | null>;

  /**
   * Get all PR states (for debugging/admin purposes)
   */
  getAllPRStates(): Promise<PRStateData[]>;
}
