import fs from 'fs/promises';
import path from 'path';
import { IStateService } from './interfaces/IStateService';
import { PRStateData } from '../../models/PRState';
import { logger } from '../../utils/logger';

/**
 * FileStateService
 * 
 * File-based implementation of state service
 * Stores state as JSON file on disk
 * 
 * Good for: Production, persistence across restarts
 * Limitation: Single-process only (no concurrency control)
 */
export class FileStateService implements IStateService {
  private filePath: string;
  private prStates: Map<number, PRStateData> = new Map();
  private messageIdToPR: Map<string, number> = new Map();
  private saveTimer: NodeJS.Timeout | null = null;
  private dirty: boolean = false;

  constructor(filePath: string) {
    this.filePath = filePath;
  }

  /**
   * Initialize service - load state from disk
   */
  async init(): Promise<void> {
    try {
      // Ensure directory exists
      const dir = path.dirname(this.filePath);
      await fs.mkdir(dir, { recursive: true });

      // Load existing state if file exists
      try {
        const content = await fs.readFile(this.filePath, 'utf-8');
        const data = JSON.parse(content);

        // Reconstruct maps
        Object.entries(data.prStates || {}).forEach(([prNumber, state]) => {
          const prNum = parseInt(prNumber, 10);
          const prState = state as PRStateData;
          
          // Migrate: add addedThreadMembers if missing (for backwards compatibility)
          if (!prState.addedThreadMembers) {
            prState.addedThreadMembers = [];
          }
          
          this.prStates.set(prNum, prState);

          // Build reverse lookup
          if (prState.discordMessageId) {
            this.messageIdToPR.set(prState.discordMessageId, prNum);
          }
        });

        logger.info(`Loaded ${this.prStates.size} PR states from ${this.filePath}`);
      } catch (error: any) {
        if (error.code === 'ENOENT') {
          logger.info(`No existing state file found at ${this.filePath}, starting fresh`);
        } else {
          throw error;
        }
      }
    } catch (error) {
      logger.error(`Failed to initialize FileStateService: ${(error as Error).message}`);
      throw error;
    }
  }

  async savePRState(prNumber: number, state: PRStateData): Promise<void> {
    this.prStates.set(prNumber, { ...state, updatedAt: new Date() });

    // Update reverse lookup
    if (state.discordMessageId) {
      this.messageIdToPR.set(state.discordMessageId, prNumber);
    }

    this.dirty = true;
    this.scheduleSave();

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

    this.dirty = true;
    this.scheduleSave();

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
   * Schedule a save to disk (debounced to avoid too frequent writes)
   */
  private scheduleSave(): void {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
    }

    this.saveTimer = setTimeout(() => {
      this.flush().catch((error) => {
        logger.error(`Failed to flush state to disk: ${error.message}`);
      });
    }, 1000); // Wait 1 second before saving
  }

  /**
   * Immediately flush state to disk
   */
  async flush(): Promise<void> {
    if (!this.dirty) {
      return;
    }

    try {
      const data = {
        prStates: Object.fromEntries(this.prStates),
        lastSaved: new Date().toISOString(),
      };

      await fs.writeFile(this.filePath, JSON.stringify(data, null, 2), 'utf-8');
      this.dirty = false;

      logger.debug(`Flushed state to ${this.filePath}`);
    } catch (error) {
      logger.error(`Failed to write state file: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * Cleanup - flush and clear timers
   */
  async cleanup(): Promise<void> {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
    }
    await this.flush();
  }
}
