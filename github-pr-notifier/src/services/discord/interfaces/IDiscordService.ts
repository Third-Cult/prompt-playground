/**
 * Discord Service Interface
 * 
 * Responsibilities:
 * - Send messages to Discord channels
 * - Create and manage threads
 * - Add reactions to messages
 */
export interface IDiscordService {
  /**
   * Initialize Discord client and connect
   */
  init(): Promise<void>;

  /**
   * Send a message to a Discord channel
   * 
   * @param channelId - Discord channel ID
   * @param content - Message content (embeds, text, etc.)
   * @returns Discord message ID
   */
  sendMessage(channelId: string, content: MessageContent): Promise<string>;

  /**
   * Edit an existing message
   * 
   * @param channelId - Discord channel ID
   * @param messageId - Discord message ID
   * @param content - Updated message content
   */
  editMessage(channelId: string, messageId: string, content: MessageContent): Promise<void>;

  /**
   * Add a reaction to a message
   * 
   * @param channelId - Discord channel ID
   * @param messageId - Discord message ID
   * @param emoji - Emoji to add (e.g., "✅" or custom emoji ID)
   */
  addReaction(channelId: string, messageId: string, emoji: string): Promise<void>;

  /**
   * Create a thread from a message
   * 
   * @param channelId - Discord channel ID
   * @param messageId - Discord message ID to create thread from
   * @param name - Thread name
   * @returns Discord thread ID
   */
  createThread(channelId: string, messageId: string, name: string): Promise<string>;

  /**
   * Send a message to a thread
   * 
   * @param threadId - Discord thread ID
   * @param content - Message content
   * @returns Discord message ID
   */
  sendThreadMessage(threadId: string, content: string): Promise<string>;

  /**
   * Add a user to a thread
   * 
   * @param threadId - Discord thread ID
   * @param userId - Discord user ID
   */
  addThreadMember(threadId: string, userId: string): Promise<void>;

  /**
   * Remove a user from a thread
   * 
   * @param threadId - Discord thread ID
   * @param userId - Discord user ID
   */
  removeThreadMember(threadId: string, userId: string): Promise<void>;

  /**
   * Lock a thread (prevent new messages)
   * 
   * @param threadId - Discord thread ID
   */
  lockThread(threadId: string): Promise<void>;

  /**
   * Check if Discord client is ready
   */
  isReady(): boolean;

  /**
   * Cleanup and disconnect
   */
  cleanup(): Promise<void>;
}

/**
 * Discord message content structure
 */
export interface MessageContent {
  content?: string;
  embeds?: Embed[];
}

/**
 * Discord embed structure
 */
export interface Embed {
  title?: string;
  description?: string;
  url?: string;
  color?: number;
  fields?: EmbedField[];
  footer?: { text: string };
  timestamp?: string;
}

/**
 * Discord embed field
 */
export interface EmbedField {
  name: string;
  value: string;
  inline?: boolean;
}
