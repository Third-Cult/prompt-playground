import { Client, GatewayIntentBits, TextChannel, EmbedBuilder, ThreadChannel } from 'discord.js';
import {
  IDiscordService,
  MessageContent,
  Embed,
} from './interfaces/IDiscordService';
import { logger } from '../../utils/logger';

/**
 * DiscordService
 * 
 * Discord.js implementation of Discord service
 * Handles all Discord API interactions
 */
export class DiscordService implements IDiscordService {
  private client: Client;
  private ready: boolean = false;

  constructor(private botToken: string) {
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        // Note: MessageContent is NOT needed - we only send messages, don't read them
      ],
    });

    this.setupEventHandlers();
  }

  /**
   * Set up Discord client event handlers
   */
  private setupEventHandlers(): void {
    this.client.on('ready', () => {
      logger.info(`Discord bot logged in as ${this.client.user?.tag}`);
      this.ready = true;
    });

    this.client.on('error', (error) => {
      logger.error(`Discord client error: ${error.message}`);
    });

    this.client.on('warn', (warning) => {
      logger.warn(`Discord client warning: ${warning}`);
    });
  }

  /**
   * Initialize and connect to Discord
   */
  async init(): Promise<void> {
    try {
      await this.client.login(this.botToken);
      
      // Wait for ready event (with timeout)
      await this.waitForReady(10000);
      
      logger.info('Discord service initialized successfully');
    } catch (error) {
      logger.error(`Failed to initialize Discord service: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * Wait for Discord client to be ready
   */
  private async waitForReady(timeoutMs: number): Promise<void> {
    const startTime = Date.now();
    
    while (!this.ready && Date.now() - startTime < timeoutMs) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    if (!this.ready) {
      throw new Error('Discord client failed to become ready within timeout');
    }
  }

  /**
   * Send message to Discord channel
   */
  async sendMessage(channelId: string, content: MessageContent): Promise<string> {
    try {
      const channel = await this.client.channels.fetch(channelId);
      
      if (!channel || !channel.isTextBased()) {
        throw new Error(`Channel ${channelId} not found or not text-based`);
      }

      const embeds = content.embeds?.map((embed) => this.buildEmbed(embed)) || [];

      const message = await (channel as TextChannel).send({
        content: content.content,
        embeds,
      });

      logger.debug(`Sent message to channel ${channelId}: ${message.id}`);
      return message.id;
    } catch (error) {
      logger.error(`Failed to send message to channel ${channelId}: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * Edit existing message
   */
  async editMessage(channelId: string, messageId: string, content: MessageContent): Promise<void> {
    try {
      const channel = await this.client.channels.fetch(channelId);
      
      if (!channel || !channel.isTextBased()) {
        throw new Error(`Channel ${channelId} not found or not text-based`);
      }

      const message = await (channel as TextChannel).messages.fetch(messageId);
      const embeds = content.embeds?.map((embed) => this.buildEmbed(embed)) || [];

      await message.edit({
        content: content.content,
        embeds,
      });

      logger.debug(`Edited message ${messageId} in channel ${channelId}`);
    } catch (error) {
      logger.error(`Failed to edit message ${messageId}: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * Add reaction to message
   */
  async addReaction(channelId: string, messageId: string, emoji: string): Promise<void> {
    try {
      const channel = await this.client.channels.fetch(channelId);
      
      if (!channel || !channel.isTextBased()) {
        throw new Error(`Channel ${channelId} not found or not text-based`);
      }

      const message = await (channel as TextChannel).messages.fetch(messageId);
      await message.react(emoji);

      logger.debug(`Added reaction ${emoji} to message ${messageId}`);
    } catch (error) {
      logger.error(`Failed to add reaction to message ${messageId}: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * Remove reaction from message
   */
  async removeReaction(channelId: string, messageId: string, emoji: string): Promise<void> {
    try {
      const channel = await this.client.channels.fetch(channelId);
      
      if (!channel || !channel.isTextBased()) {
        throw new Error(`Channel ${channelId} not found or not text-based`);
      }

      const message = await (channel as TextChannel).messages.fetch(messageId);
      
      // Remove bot's own reaction
      const userReactions = message.reactions.cache.filter(reaction => 
        reaction.emoji.name === emoji && reaction.me
      );
      
      for (const reaction of userReactions.values()) {
        await reaction.users.remove(this.client.user!.id);
      }

      logger.debug(`Removed reaction ${emoji} from message ${messageId}`);
    } catch (error) {
      logger.error(`Failed to remove reaction from message ${messageId}: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * Create thread from message
   */
  async createThread(channelId: string, messageId: string, name: string): Promise<string> {
    try {
      const channel = await this.client.channels.fetch(channelId);
      
      if (!channel || !channel.isTextBased()) {
        throw new Error(`Channel ${channelId} not found or not text-based`);
      }

      const message = await (channel as TextChannel).messages.fetch(messageId);
      const thread = await message.startThread({
        name,
        autoArchiveDuration: 1440, // 24 hours
      });

      logger.debug(`Created thread ${thread.id} from message ${messageId}`);
      return thread.id;
    } catch (error) {
      logger.error(`Failed to create thread from message ${messageId}: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * Send message to thread
   */
  async sendThreadMessage(threadId: string, content: string): Promise<string> {
    try {
      const thread = await this.client.channels.fetch(threadId);
      
      if (!thread || !thread.isThread()) {
        throw new Error(`Thread ${threadId} not found`);
      }

      const message = await (thread as ThreadChannel).send(content);

      logger.debug(`Sent message to thread ${threadId}: ${message.id}`);
      return message.id;
    } catch (error) {
      logger.error(`Failed to send message to thread ${threadId}: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * Add member to thread
   */
  async addThreadMember(threadId: string, userId: string): Promise<void> {
    try {
      const thread = await this.client.channels.fetch(threadId);
      
      if (!thread || !thread.isThread()) {
        throw new Error(`Thread ${threadId} not found`);
      }

      await (thread as ThreadChannel).members.add(userId);

      logger.debug(`Added user ${userId} to thread ${threadId}`);
    } catch (error) {
      logger.error(`Failed to add user ${userId} to thread ${threadId}: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * Remove member from thread
   */
  async removeThreadMember(threadId: string, userId: string): Promise<void> {
    try {
      const thread = await this.client.channels.fetch(threadId);
      
      if (!thread || !thread.isThread()) {
        throw new Error(`Thread ${threadId} not found`);
      }

      await (thread as ThreadChannel).members.remove(userId);

      logger.debug(`Removed user ${userId} from thread ${threadId}`);
    } catch (error) {
      logger.error(`Failed to remove user ${userId} from thread ${threadId}: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * Lock thread
   */
  async lockThread(threadId: string, locked: boolean = true): Promise<void> {
    try {
      const thread = await this.client.channels.fetch(threadId);
      
      if (!thread || !thread.isThread()) {
        throw new Error(`Thread ${threadId} not found`);
      }

      await (thread as ThreadChannel).setLocked(locked);

      logger.debug(`${locked ? 'Locked' : 'Unlocked'} thread ${threadId}`);
    } catch (error) {
      logger.error(`Failed to ${locked ? 'lock' : 'unlock'} thread ${threadId}: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * Get all members in a thread
   */
  async getThreadMembers(threadId: string): Promise<string[]> {
    try {
      const thread = await this.client.channels.fetch(threadId);
      
      if (!thread || !thread.isThread()) {
        throw new Error(`Thread ${threadId} not found`);
      }

      const threadChannel = thread as ThreadChannel;
      const members = await threadChannel.members.fetch();
      
      // Return array of user IDs, excluding the bot itself
      const userIds = members
        .filter(member => member.id !== this.client.user?.id)
        .map(member => member.id);

      logger.debug(`Found ${userIds.length} members in thread ${threadId}`);
      return userIds;
    } catch (error) {
      logger.error(`Failed to get thread members ${threadId}: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * Check if client is ready
   */
  isReady(): boolean {
    return this.ready;
  }

  /**
   * Cleanup and disconnect
   */
  async cleanup(): Promise<void> {
    try {
      await this.client.destroy();
      this.ready = false;
      logger.info('Discord service cleaned up');
    } catch (error) {
      logger.error(`Failed to cleanup Discord service: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * Build Discord embed from our Embed interface
   */
  private buildEmbed(embed: Embed): EmbedBuilder {
    const builder = new EmbedBuilder();

    if (embed.title) builder.setTitle(embed.title);
    if (embed.description) builder.setDescription(embed.description);
    if (embed.url) builder.setURL(embed.url);
    if (embed.color !== undefined) builder.setColor(embed.color);
    if (embed.footer) builder.setFooter({ text: embed.footer.text });
    if (embed.timestamp) builder.setTimestamp(new Date(embed.timestamp));

    if (embed.fields) {
      embed.fields.forEach((field) => {
        builder.addFields({
          name: field.name,
          value: field.value,
          inline: field.inline || false,
        });
      });
    }

    return builder;
  }
}
