import { IStateService } from './interfaces/IStateService';
import { PRStateData } from '../../models/PRState';
import { logger } from '../../utils/logger';

/**
 * InMemoryStateService
 * 
 * In-memory implementation of state service
 * Good for: Testing, development
 * Limitation: State lost on restart
 */
export class InMemoryStateService implements IStateService {
  private prStates: Map<number, PRStateData> = new Map();
  private messageIdToPR: Map<string, number> = new Map();

  async savePRState(prNumber: number, state: PRStateData): Promise<void> {
    this.prStates.set(prNumber, { ...state, updatedAt: new Date() });

    // Update reverse lookup if message ID exists
    if (state.discordMessageId) {
      this.messageIdToPR.set(state.discordMessageId, prNumber);
    }

    logger.debug(`Saved PR state for #${prNumber}`);
  }

  async getPRState(prNumber: number): Promise<PRStateData | null> {
    return this.prStates.get(prNumber) || null;
  }

  async deletePRState(prNumber: number): Promise<void> {
    const state = this.prStates.get(prNumber);
    if (state?.discordMessageId) {
      this.messageIdToPR.delete(state.discordMessageId);
    }
    this.prStates.delete(prNumber);
    logger.debug(`Deleted PR state for #${prNumber}`);
  }

  async getDiscordMessageId(prNumber: number): Promise<string | null> {
    const state = await this.getPRState(prNumber);
    return state?.discordMessageId || null;
  }

  async getThreadId(prNumber: number): Promise<string | null> {
    const state = await this.getPRState(prNumber);
    return state?.discordThreadId || null;
  }

  async getPRNumberByMessageId(messageId: string): Promise<number | null> {
    return this.messageIdToPR.get(messageId) || null;
  }

  async getAllPRStates(): Promise<PRStateData[]> {
    return Array.from(this.prStates.values());
  }

  /**
   * Get current state count (for debugging)
   */
  getStateCount(): number {
    return this.prStates.size;
  }

  /**
   * Clear all state (for testing)
   */
  clear(): void {
    this.prStates.clear();
    this.messageIdToPR.clear();
    logger.debug('Cleared all PR state');
  }
}
