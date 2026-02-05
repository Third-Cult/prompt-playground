import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config();

/**
 * Application configuration
 * Centralized configuration loaded from environment variables
 */
export const config = {
  /**
   * Server configuration
   */
  server: {
    port: parseInt(process.env.PORT || '3000', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
  },

  /**
   * GitHub configuration
   */
  github: {
    webhookSecret: process.env.GITHUB_WEBHOOK_SECRET || '',
  },

  /**
   * Discord configuration
   */
  discord: {
    botToken: process.env.DISCORD_BOT_TOKEN || '',
    channelId: process.env.DISCORD_CHANNEL_ID || '',
  },

  /**
   * State storage configuration
   */
  state: {
    type: (process.env.STATE_STORAGE_TYPE || 'file') as 'file' | 'memory',
    filePath: process.env.STATE_FILE_PATH || path.join(process.cwd(), 'data', 'pr-state.json'),
  },

  /**
   * Logging configuration
   */
  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },

  /**
   * Template configuration
   */
  templates: {
    path: process.env.TEMPLATE_PATH || path.join(process.cwd(), 'src', 'config', 'templates'),
  },

  /**
   * User mappings configuration
   */
  userMappings: {
    path: process.env.USER_MAPPINGS_PATH || path.join(process.cwd(), 'config', 'user-mappings.json'),
  },
};

/**
 * Validate required configuration
 */
export function validateConfig(): void {
  const errors: string[] = [];

  if (!config.github.webhookSecret && config.server.nodeEnv === 'production') {
    errors.push('GITHUB_WEBHOOK_SECRET is required in production');
  }

  if (!config.discord.botToken && config.server.nodeEnv === 'production') {
    errors.push('DISCORD_BOT_TOKEN is required in production');
  }

  if (!config.discord.channelId && config.server.nodeEnv === 'production') {
    errors.push('DISCORD_CHANNEL_ID is required in production');
  }

  if (errors.length > 0) {
    throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
  }
}

/**
 * Load user mappings from JSON file
 */
export async function loadUserMappings(): Promise<Record<string, string>> {
  try {
    const fs = await import('fs/promises');
    const content = await fs.readFile(config.userMappings.path, 'utf-8');
    return JSON.parse(content);
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      // File doesn't exist - return empty mappings
      return {};
    }
    throw new Error(`Failed to load user mappings: ${error.message}`);
  }
}
