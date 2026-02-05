# Discord PR Bot - Architecture Specification

## Executive Summary

This document defines the architecture for a Discord bot that automatically posts GitHub Pull Request information to designated Discord channels, creates threaded discussions, and keeps PR status synchronized between GitHub and Discord.

**Core Value Proposition**: Eliminate context switching between GitHub and Discord by bringing PR notifications, reviews, and discussions into Discord threads while maintaining a single source of truth in GitHub.

---

## Table of Contents

1. [Requirements Overview](#requirements-overview)
2. [Architecture Options](#architecture-options)
3. [Recommended Architecture](#recommended-architecture)
4. [Component Design](#component-design)
5. [Data Models](#data-models)
6. [Security & Configuration](#security--configuration)
7. [Testing Strategy](#testing-strategy)
8. [Implementation Phases](#implementation-phases)
9. [Deployment & Operations](#deployment--operations)

---

## Requirements Overview

### Functional Requirements

#### PR Creation
- **Trigger**: When a PR is opened in GitHub
- **Action**: Post formatted message to designated Discord channel
- **Format**: Title, branch info, author, description, reviewers, status
- **Thread**: Create thread for PR discussion
- **Initial Message**: Bot posts reminder to keep discussion in thread or PR

#### PR Status Management
- **Draft Status**: Status shows "Draft"
- **Ready for Review**: Status shows "Ready for Review"
- **Changes Requested**: Status shows "Changes Requested" with reviewer mentions
- **Approved**: Status shows "Approved" with reviewer mentions
- **Closed**: Status shows "Closed" with closer mention
- **Merged**: Status shows "Merged" with merger mention

#### Reviewer Management
- **Add Reviewer**: Add to parent message, @ mention in thread, add to thread members
- **Remove Reviewer**: Remove from parent message, post associative message in thread, kick from thread
- **Request Re-Review**: Follow add reviewer flow (ensure no duplicates)
- **GitHub → Discord Mapping**: Map GitHub usernames to Discord users

#### Review Activity
- **Changes Requested**: Update status, @ mention reviewer and author in thread, post review comment, add reaction to parent (remove other auto placed reactions)
- **Approved**: Update status, @ mention reviewer and author in thread, post approval comment (with fallback), add reaction to parent (remove other auto placed reactions)
- **Approval Removed**: Update status, post removal message in thread, remove reaction from parent (assuming there aren't multiple approvals)

#### PR Closure
- **Closed**: Update status, post closure message in thread, lock thread, kick all members
- **Merged**: Update status, post merge message in thread, lock thread, kick all members

#### Warning States
- **No Reviewers**: Show warning in parent message when PR has no reviewers

### Non-Functional Requirements

- **Reliability**: Handle GitHub webhook failures gracefully (retries, dead letter queue)
- **Security**: Protect GitHub webhook secrets, Discord bot tokens, user mappings
- **Performance**: Process webhooks within 3 seconds, update Discord within 5 seconds
- **Scalability**: Support multiple repositories and Discord servers
- **Maintainability**: Clean architecture, testable components, clear boundaries
- **Observability**: Comprehensive logging, error tracking, audit trail

---

## Architecture Options

### Option 1: GitHub Actions + Discord Bot (Stateless)

**Description**: GitHub Actions workflows trigger on PR events, call TypeScript scripts that send commands to a long-running Discord bot process.

**Architecture**:
```
GitHub PR Event
    ↓
GitHub Actions Workflow
    ↓
TypeScript Script (stateless, ephemeral)
    ↓
Discord Bot API (long-running process)
    ↓
Discord Channel/Thread
```

**Pros**:
- ✅ Stateless scripts - no state management complexity
- ✅ GitHub handles webhook reliability (built-in retries)
- ✅ No need to host webhook server
- ✅ Easy to debug (workflow logs in GitHub UI)
- ✅ Secrets managed by GitHub (encrypted)
- ✅ Free for public repos, cheap for private

**Cons**:
- ❌ Slower than webhook server (Actions startup time ~10-30s)
- ❌ Tightly coupled to GitHub Actions (harder to migrate)
- ❌ Limited to GitHub-hosted repos
- ❌ More complex to test locally (need to simulate Actions environment)
- ❌ GitHub Actions logs retention (90 days max)

**Best For**: Projects already using GitHub Actions, prioritizing simplicity over speed

---

### Option 2: Webhook Server + Discord Bot (Stateful)

**Description**: Self-hosted Node.js/Express server receives GitHub webhooks, processes them, and updates Discord via Discord bot.

**Architecture**:
```
GitHub PR Event
    ↓
GitHub Webhook (POST)
    ↓
Express Webhook Server (self-hosted)
    ↓
Event Processor (stateful)
    ↓
Discord Bot Client
    ↓
Discord Channel/Thread
```

**Pros**:
- ✅ Fastest response time (<3s end-to-end)
- ✅ Full control over retry logic, error handling
- ✅ Not tied to GitHub Actions
- ✅ Can handle webhooks from multiple sources (GitHub, GitLab, etc.)
- ✅ Easier to test locally (just run the server)
- ✅ Better observability (custom logging, metrics)

**Cons**:
- ❌ Requires hosting infrastructure (server, container, etc.)
- ❌ Need to manage state (which PRs have which Discord messages/threads)
- ❌ Need to handle webhook security (signature verification)
- ❌ Need uptime monitoring and alerting
- ❌ More complex deployment (CI/CD, secrets management)

**Best For**: Production systems, multi-repository setups, when speed matters

---

### Option 3: GitHub App + Webhook Server (Enterprise)

**Description**: GitHub App with fine-grained permissions receives webhooks, processes them in webhook server, updates Discord.

**Architecture**:
```
GitHub PR Event
    ↓
GitHub App Webhook
    ↓
Express Webhook Server (self-hosted)
    ↓
Event Processor (with GitHub API access)
    ↓
Discord Bot Client
    ↓
Discord Channel/Thread
```

**Pros**:
- ✅ Fine-grained permissions (only PR read/write)
- ✅ Can react to events AND query GitHub API
- ✅ Better rate limits than personal access tokens
- ✅ Multi-repository support out of the box
- ✅ Installation flow for organizations
- ✅ Better security model (short-lived tokens)

**Cons**:
- ❌ Most complex to set up (GitHub App registration, JWT signing)
- ❌ Requires webhook server (same as Option 2)
- ❌ Overkill for single-repo projects
- ❌ More code to maintain (GitHub App authentication flow)

**Best For**: Organizations with many repos, need GitHub API access, want fine-grained permissions

---

### Option 4: Serverless Functions (AWS Lambda / Vercel)

**Description**: GitHub webhooks trigger serverless functions, which update Discord. State stored in DynamoDB/Redis.

**Architecture**:
```
GitHub PR Event
    ↓
GitHub Webhook (POST)
    ↓
AWS Lambda / Vercel Function
    ↓
State Store (DynamoDB/Redis)
    ↓
Discord Bot Client
    ↓
Discord Channel/Thread
```

**Pros**:
- ✅ Zero maintenance (managed infrastructure)
- ✅ Auto-scaling (handle bursts of PRs)
- ✅ Pay-per-use pricing (cheap for low volume)
- ✅ Built-in monitoring (CloudWatch, Vercel logs)
- ✅ Easy deployment (git push → deploy)

**Cons**:
- ❌ Cold start latency (5-10s for first request)
- ❌ More complex state management (need external DB)
- ❌ Vendor lock-in (AWS, Vercel)
- ❌ Harder to debug locally
- ❌ Cost increases with volume (high-frequency repos)

**Best For**: Small teams, low-traffic repos, want zero ops burden

---

## Architecture Comparison Matrix

| Criteria | GitHub Actions | Webhook Server | GitHub App | Serverless |
|----------|---------------|----------------|------------|------------|
| **Response Time** | ⚠️ Slow (10-30s) | ✅ Fast (<3s) | ✅ Fast (<3s) | ⚠️ Medium (5-10s) |
| **Setup Complexity** | ✅ Low | ⚠️ Medium | ❌ High | ⚠️ Medium |
| **Hosting Cost** | ✅ Free/Cheap | ⚠️ $5-20/mo | ⚠️ $5-20/mo | ✅ Free/Cheap |
| **Maintenance** | ✅ Low | ⚠️ Medium | ❌ High | ✅ Low |
| **Testability** | ⚠️ Medium | ✅ High | ✅ High | ⚠️ Medium |
| **Scalability** | ⚠️ Limited | ✅ High | ✅ High | ✅ Auto |
| **Security** | ✅ GitHub Managed | ⚠️ Self-Managed | ✅ Fine-Grained | ✅ Managed |
| **Multi-Repo** | ⚠️ Per-Repo Setup | ✅ Shared Logic | ✅ Built-In | ✅ Shared Logic |

---

## Recommended Architecture

**Primary Recommendation**: **Option 2 (Webhook Server)** for production use

**Reasoning**:
1. **Best Balance**: Speed + control + testability
2. **Future-Proof**: Easy to extend with more features
3. **Developer Experience**: Easy to run locally and test
4. **Following Patterns**: Aligns with Coordinator/Manager/Service architecture
5. **Flexibility**: Can add GitHub App later if needed

**Secondary Recommendation**: **Option 1 (GitHub Actions)** for prototyping or low-traffic repos

---

## Future Extensibility Requirements

This architecture must support three key extensibility points:

### 1. Abstract Ticketing System Integration

**Requirement**: PR must link to tickets (GitHub Issues now, Jira later, or any ticketing system)

**Architecture Pattern**: Service interface abstraction with swappable implementations

**Components**:
- `ITicketingService` interface - Abstract ticket operations
- `GitHubIssueService` - Current implementation (GitHub Issues)
- `JiraService` - Future implementation
- `TicketValidationManager` - Validates PR has linked ticket

**Configuration**:
```typescript
// config/config.ts
export const config = {
  ticketing: {
    provider: 'github', // or 'jira', 'linear', etc.
    // provider-specific config
  }
};
```

**Benefit**: Swap ticketing systems by changing one line of config + adding new service implementation

---

### 2. Customizable Message Formatting

**Requirement**: Easily adjust wording, formatting, emojis, reactions without touching code

**Architecture Pattern**: Template-based configuration with variable substitution

**Components**:
- `MessageTemplateService` - Loads and renders templates
- `templates/` folder - Separate template files (JSON)
- Template variables - `{{prNumber}}`, `{{author}}`, `{{status}}`, etc.

**Configuration Example**:
```json
// config/templates/discord-messages.json
{
  "pr_created": {
    "embeds": [{
      "title": "{{title}} #{{prNumber}}",
      "color": "{{color}}",
      "fields": [
        {
          "name": "Branch",
          "value": "`{{branchName}}` → `{{baseBranch}}`",
          "inline": false
        },
        {
          "name": "Author",
          "value": "{{authorMention}}",
          "inline": true
        }
      ]
    }],
    "_description": "Template for PR creation message"
  },
  "status_messages": {
    "approved": "✅ Approved by {{reviewers}}",
    "changes_requested": "🔴 Changes Requested by {{reviewers}}",
    "_description": "Status message templates"
  },
  "thread_messages": {
    "pr_created": "👋 This thread is for discussing **PR #{{prNumber}}: {{title}}**.\n\nPlease keep all PR-related conversation here or in the GitHub PR itself.",
    "reviewer_added": "📢 {{reviewerMention}} has been added as a reviewer for this PR.",
    "review_approved": "✅ {{reviewerMention}} approved this PR!\n\n> {{comment}}\n\n{{authorMention}} Your PR has been approved by {{reviewerMention}}."
  }
}
```

**Benefit**: Non-developers can adjust messaging by editing config files

---

### 3. Multi-Channel Event Broadcasting

**Requirement**: Webhook events trigger multiple outputs (Discord now, email/docs/Slack later)

**Architecture Pattern**: Event bus with multiple subscribers (Pub/Sub pattern)

**Components**:
- `EventBroadcaster` - Publishes semantic events to all subscribers
- `INotificationChannel` interface - Abstract notification channel
- `DiscordNotificationChannel` - Current implementation
- `EmailNotificationChannel` - Future implementation
- `SlackNotificationChannel` - Future implementation

**Architecture**:
```
GitHub Webhook
    ↓
WebhookCoordinator
    ↓
PRCoordinator (process event)
    ↓
EventBroadcaster.publish()
    ↓
┌─────────────┬─────────────┬─────────────┐
│   Discord   │    Email    │    Slack    │
│   Channel   │   Channel   │   Channel   │
└─────────────┴─────────────┴─────────────┘
```

**Configuration**:
```typescript
// config/config.ts
export const config = {
  notificationChannels: [
    {
      type: 'discord',
      enabled: true,
      channelId: '123456789',
    },
    {
      type: 'email',
      enabled: false, // Enable later
      recipients: ['team@example.com'],
    },
    {
      type: 'slack',
      enabled: false,
      webhookUrl: 'https://hooks.slack.com/...',
    },
  ],
};
```

**Benefit**: Add new notification channels without modifying existing code

---

## Component Design

Following the TypeScript Architecture patterns (Coordinator, Manager, Service), here's the component breakdown:

### Architecture Layers

```
┌──────────────────────────────────────────────┐
│         Webhook Endpoint (Express)           │
│  - Webhook signature verification           │
│  - Route to appropriate coordinator          │
└───────────────┬──────────────────────────────┘
                │
                ▼
┌──────────────────────────────────────────────┐
│     PRCoordinator (Feature Coordinator)      │
│  - Orchestrates PR lifecycle                 │
│  - Delegates to managers                     │
│  - Emits semantic events                     │
└───┬────┬────┬────┬────┬────────────────┬─────┘
    │    │    │    │    │                │
    │    │    │    │    │                ▼
    │    │    │    │    │      ┌──────────────────┐
    │    │    │    │    │      │ EventBroadcaster │
    │    │    │    │    │      │   (Pub/Sub)      │
    │    │    │    │    │      └────┬─────┬───────┘
    │    │    │    │    │           │     │
    │    │    │    │    │           ▼     ▼
    │    │    │    │    │      ┌────────┐ ┌────────┐
    │    │    │    │    │      │Discord │ │ Email  │
    │    │    │    │    │      │Channel │ │Channel │
    │    │    │    │    │      └────────┘ └────────┘
    ▼    ▼    ▼    ▼    ▼
┌─────┐┌─────┐┌─────┐┌─────┐┌───────┐
│Notif││Review││Status││User ││Ticket │
│Mgr  ││Mgr   ││Mgr   ││Mgr  ││Mgr    │
└──┬──┘└──┬──┘└──┬──┘└──┬──┘└───┬───┘
   │      │      │      │       │
   ▼      ▼      ▼      ▼       ▼
┌───────────────────────────────────────────────┐
│              Services Layer                    │
│  - DiscordService (Discord API)               │
│  - GitHubService (GitHub API)                 │
│  - StateService (PR → Discord mapping)        │
│  - ITicketingService (GitHub/Jira/Linear)     │
│  - MessageTemplateService (Template rendering)│
└───────────────────────────────────────────────┘
```

### File Structure

```
src/
├── coordinators/
│   ├── pr/
│   │   ├── PRCoordinator.ts              # Main orchestrator
│   │   ├── PRCoordinator.test.ts         # Black-box tests
│   │   └── managers/
│   │       ├── NotificationManager.ts    # Multi-channel notifications
│   │       ├── ReviewManager.ts          # Review state logic
│   │       ├── StatusManager.ts          # Status transitions
│   │       ├── UserMappingManager.ts     # GitHub ↔ Discord mapping
│   │       └── TicketValidationManager.ts # Ticket linking validation
│   ├── event/
│   │   ├── EventBroadcaster.ts           # Pub/Sub event broadcaster
│   │   └── EventBroadcaster.test.ts
│   └── webhook/
│       ├── WebhookCoordinator.ts         # Webhook routing
│       └── WebhookCoordinator.test.ts
│
├── services/
│   ├── notifications/
│   │   ├── channels/
│   │   │   ├── DiscordNotificationChannel.ts    # Discord implementation
│   │   │   ├── EmailNotificationChannel.ts      # Email implementation (future)
│   │   │   └── SlackNotificationChannel.ts      # Slack implementation (future)
│   │   └── interfaces/
│   │       └── INotificationChannel.ts          # Abstract notification channel
│   ├── ticketing/
│   │   ├── GitHubIssueService.ts         # GitHub Issues implementation
│   │   ├── JiraService.ts                # Jira implementation (future)
│   │   ├── LinearService.ts              # Linear implementation (future)
│   │   └── interfaces/
│   │       └── ITicketingService.ts      # Abstract ticketing interface
│   ├── github/
│   │   ├── GitHubService.ts              # GitHub API client
│   │   ├── GitHubService.test.ts
│   │   └── interfaces/
│   │       └── IGitHubService.ts
│   ├── state/
│   │   ├── StateService.ts               # PR state persistence
│   │   ├── StateService.test.ts
│   │   └── interfaces/
│   │       └── IStateService.ts
│   └── templates/
│       ├── MessageTemplateService.ts     # Template rendering
│       ├── MessageTemplateService.test.ts
│       └── interfaces/
│           └── IMessageTemplateService.ts
│
├── models/
│   ├── PRState.ts                        # PR state model
│   ├── NotificationEvent.ts              # Notification event model
│   ├── Ticket.ts                         # Ticket model
│   └── UserMapping.ts                    # User mapping model
│
├── config/
│   ├── config.ts                         # Environment config
│   ├── userMappings.ts                   # GitHub ↔ Discord mappings
│   └── templates/
│       ├── discord-messages.json         # Discord message templates
│       ├── email-templates.json          # Email templates (future)
│       └── slack-messages.json           # Slack templates (future)
│
├── webhooks/
│   ├── server.ts                         # Express server
│   ├── routes.ts                         # Webhook routes
│   └── middleware/
│       ├── verifySignature.ts            # GitHub signature verification
│       └── errorHandler.ts               # Error handling middleware
│
├── utils/
│   ├── formatters.ts                     # Message formatters
│   └── logger.ts                         # Logging utility
│
└── index.ts                              # Application entry point
```

---

## Detailed Component Specifications

### 1. PRCoordinator (Feature Coordinator)

**Responsibilities**:
- Orchestrate PR lifecycle events
- Delegate to managers for specific concerns
- Emit semantic events for observability
- Maintain PR state through StateService

**Public API**:
```typescript
class PRCoordinator extends FeatureCoordinator<PRState> {
  // Events
  public events = {
    prCreated: new CoordinatorEvent<{ prNumber: number }>(),
    prUpdated: new CoordinatorEvent<{ prNumber: number }>(),
    prClosed: new CoordinatorEvent<{ prNumber: number }>(),
    prMerged: new CoordinatorEvent<{ prNumber: number }>(),
  };

  // PR Lifecycle Actions
  async handlePROpened(payload: GitHubWebhookPayload): Promise<void>;
  async handlePRUpdated(payload: GitHubWebhookPayload): Promise<void>;
  async handlePRClosed(payload: GitHubWebhookPayload): Promise<void>;
  async handlePRReopened(payload: GitHubWebhookPayload): Promise<void>;

  // Review Actions
  async handleReviewSubmitted(payload: GitHubWebhookPayload): Promise<void>;
  async handleReviewDismissed(payload: GitHubWebhookPayload): Promise<void>;

  // Reviewer Actions
  async handleReviewerAdded(payload: GitHubWebhookPayload): Promise<void>;
  async handleReviewerRemoved(payload: GitHubWebhookPayload): Promise<void>;
  async handleReviewRequested(payload: GitHubWebhookPayload): Promise<void>;

  // Status Queries (for external use)
  getPRStatus(prNumber: number): PRStatus | null;
  getDiscordMessageId(prNumber: number): string | null;
}
```

**Pattern Notes**:
- Extends `FeatureCoordinator<PRState>` (following architecture pattern)
- Delegates all operations to managers (no direct service calls)
- Emits semantic events to `EventBroadcaster` for multi-channel notifications
- State managed through `StateService` (injected dependency)
- Ticket validation delegated to `TicketValidationManager`

**Key Design Decision**: PRCoordinator emits events to EventBroadcaster instead of directly calling NotificationManager. This decouples PR logic from notification logic, enabling:
- Easy addition of new notification channels
- Testing PR logic without notification infrastructure
- Parallel notification delivery to multiple channels

---

### 2. EventBroadcaster (Coordinator)

**Responsibilities**:
- Subscribe notification channels to PR events
- Broadcast events to all enabled channels
- Handle channel failures gracefully (one channel failing doesn't block others)
- Track notification delivery for observability

**Public API**:
```typescript
class EventBroadcaster extends FeatureCoordinator<EventBroadcasterState> {
  constructor(
    private channels: INotificationChannel[]
  ) {}

  // Register event listeners from PRCoordinator
  async onInit(): Promise<void> {
    // Subscribe to PR coordinator events
    prCoordinator.events.prCreated.addListener((data) => {
      this.broadcast('pr.created', data);
    });
    
    prCoordinator.events.prUpdated.addListener((data) => {
      this.broadcast('pr.updated', data);
    });
    
    // ... other event subscriptions
  }

  // Broadcast to all enabled channels
  private async broadcast(
    eventType: string,
    data: any
  ): Promise<void> {
    const promises = this.channels
      .filter(channel => channel.isEnabled())
      .map(channel => 
        channel.handleEvent(eventType, data)
          .catch(error => {
            logger.error(`Channel ${channel.name} failed:`, error);
            // Don't throw - let other channels succeed
          })
      );
    
    await Promise.allSettled(promises);
  }
}
```

**Pattern Notes**:
- Coordinator (not Manager) because it orchestrates multiple channels
- Uses pub/sub pattern for loose coupling
- Failures in one channel don't affect others
- Easy to add new channels by implementing `INotificationChannel` interface

---

### 3. NotificationManager (Manager)

**Responsibilities**:
- Format notification content for specific channels
- Coordinate notification delivery through EventBroadcaster
- Handle notification-specific business logic (e.g., should we notify for this event?)

**Public API**:
```typescript
class NotificationManager {
  constructor(
    private templateService: IMessageTemplateService,
    private userMappingManager: UserMappingManager
  ) {}

  // Prepare notification data for channels
  prepareNotification(
    eventType: string,
    prData: PRData,
    metadata?: any
  ): NotificationData {
    // Format message using templates
    const content = this.templateService.render(eventType, {
      prNumber: prData.number,
      title: prData.title,
      author: this.userMappingManager.getDiscordMention(prData.author),
      // ... other template variables
    });
    
    return {
      eventType,
      content,
      metadata,
      channels: this.determineChannels(eventType),
    };
  }

  // Determine which channels should receive this notification
  private determineChannels(eventType: string): string[] {
    // Business logic: some events only go to certain channels
    // e.g., "pr.merged" might trigger email + Discord, but "pr.draft" only Discord
    return ['discord']; // For now
  }
}
```

**Pattern Notes**:
- Focused on notification preparation (single responsibility)
- Uses `MessageTemplateService` for customizable formatting
- Business logic for which channels get which events

---

### 4. DiscordNotificationChannel (Service)

**Responsibilities**:
- Implement `INotificationChannel` interface for Discord
- Handle Discord-specific message creation, updates, threads
- Manage Discord state (message IDs, thread IDs)

**Interface**:
```typescript
interface INotificationChannel {
  name: string;
  
  isEnabled(): boolean;
  
  handleEvent(eventType: string, data: any): Promise<void>;
}
```

**Implementation**:
```typescript
class DiscordNotificationChannel implements INotificationChannel {
  name = 'discord';
  
  constructor(
    private discordService: IDiscordService,
    private stateService: IStateService,
    private templateService: IMessageTemplateService
  ) {}

  isEnabled(): boolean {
    return config.notificationChannels
      .find(c => c.type === 'discord')?.enabled ?? false;
  }

  async handleEvent(eventType: string, data: any): Promise<void> {
    switch (eventType) {
      case 'pr.created':
        await this.handlePRCreated(data);
        break;
      case 'pr.updated':
        await this.handlePRUpdated(data);
        break;
      case 'review.submitted':
        await this.handleReviewSubmitted(data);
        break;
      // ... other events
    }
  }

  private async handlePRCreated(data: PRCreatedEvent): Promise<void> {
    // Render template
    const messageContent = this.templateService.render('pr_created', data);
    
    // Send to Discord
    const messageId = await this.discordService.sendMessage(
      config.discord.channelId,
      messageContent
    );
    
    // Create thread
    const threadId = await this.discordService.createThread(
      messageId,
      `PR #${data.prNumber}: ${data.title}`
    );
    
    // Save state
    await this.stateService.savePRState(data.prNumber, {
      discordMessageId: messageId,
      discordThreadId: threadId,
    });
  }
  
  // ... other handlers
}
```

**Pattern Notes**:
- Implements interface for swappability
- Self-contained (all Discord logic in one place)
- Easy to add new channels (Email, Slack) by implementing same interface

---

### 5. MessageTemplateService (Service)

**Responsibilities**:
- Load templates from config files
- Render templates with variable substitution
- Validate template syntax on load

**Interface**:
```typescript
interface IMessageTemplateService {
  /**
   * Load templates from config directory
   */
  loadTemplates(configPath: string): Promise<void>;
  
  /**
   * Render a template with variables
   */
  render(templateName: string, variables: Record<string, any>): any;
  
  /**
   * Get raw template (for testing/debugging)
   */
  getTemplate(templateName: string): any;
}
```

**Implementation**:
```typescript
class MessageTemplateService implements IMessageTemplateService {
  private templates: Map<string, any> = new Map();

  async loadTemplates(configPath: string): Promise<void> {
    const content = await fs.readFile(configPath, 'utf-8');
    const parsed = JSON.parse(content);
    
    // Store templates (skip entries starting with _)
    Object.entries(parsed).forEach(([name, template]) => {
      if (!name.startsWith('_')) {
        this.templates.set(name, template);
      }
    });
    
    logger.info(`Loaded ${this.templates.size} templates`);
  }

  render(templateName: string, variables: Record<string, any>): any {
    const template = this.templates.get(templateName);
    if (!template) {
      throw new Error(`Template not found: ${templateName}`);
    }
    
    // Deep clone to avoid mutation
    const rendered = JSON.parse(JSON.stringify(template));
    
    // Replace variables recursively
    return this.replaceVariables(rendered, variables);
  }

  private replaceVariables(obj: any, variables: Record<string, any>): any {
    if (typeof obj === 'string') {
      // Replace {{variable}} with value
      return obj.replace(/\{\{(\w+)\}\}/g, (match, key) => {
        return variables[key] ?? match;
      });
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.replaceVariables(item, variables));
    }
    
    if (typeof obj === 'object' && obj !== null) {
      const result: any = {};
      for (const [key, value] of Object.entries(obj)) {
        result[key] = this.replaceVariables(value, variables);
      }
      return result;
    }
    
    return obj;
  }

  getTemplate(templateName: string): any {
    return this.templates.get(templateName);
  }
}
```

**Pattern Notes**:
- Service (not Manager) because it's infrastructure for template handling
- No business logic (pure template rendering)
- Easy to test (load templates, verify output)
- Native JSON parsing (no external dependencies)
- Supports `_description` and `_comment` fields for documentation

**Template Example**:
```json
// config/templates/discord-messages.json
{
  "pr_created": {
    "embeds": [{
      "title": "{{title}} #{{prNumber}}",
      "url": "{{url}}",
      "description": "{{description}}",
      "color": "{{color}}",
      "fields": [
        {
          "name": "Branch",
          "value": "`{{branchName}}` → `{{baseBranch}}`",
          "inline": false
        },
        {
          "name": "Author",
          "value": "{{authorMention}}",
          "inline": true
        },
        {
          "name": "Reviewers",
          "value": "{{reviewersMentions}}",
          "inline": false
        },
        {
          "name": "Status",
          "value": "{{status}}",
          "inline": false
        }
      ]
    }],
    "_description": "Embed shown when PR is created",
    "_available_variables": ["title", "prNumber", "url", "description", "color", "branchName", "baseBranch", "authorMention", "reviewersMentions", "status"]
  },
  "review_approved": {
    "content": "✅ {{reviewerMention}} approved this PR!\n\n> {{comment}}\n\n{{authorMention}} Your PR has been approved by {{reviewerMention}}.",
    "_description": "Message posted to thread when PR is approved"
  }
}
```

**Usage**:
```typescript
// In DiscordNotificationChannel
const content = this.templateService.render('pr_created', {
  title: 'Add feature X',
  prNumber: 123,
  url: 'https://github.com/owner/repo/pull/123',
  description: 'This PR adds feature X',
  color: 0x1f6feb,
  branchName: 'feature-x',
  baseBranch: 'main',
  authorMention: '<@123456>',
  reviewersMentions: '<@789012>, <@345678>',
  status: '📋 Ready for Review',
});
```

**Customization**:
Non-developers can now edit `config/templates/discord-messages.json` to change:
- Wording ("approved" → "gave thumbs up")
- Emojis (✅ → 👍)
- Formatting (bold, italics, code blocks)
- Field order
- Colors

**Benefits of JSON**:
- ✅ Native to TypeScript (no extra dependencies)
- ✅ VS Code provides autocomplete and validation
- ✅ Type-safe with TypeScript interfaces
- ✅ Familiar to all JavaScript/TypeScript developers
- ✅ Easy to validate with JSON Schema

No code changes needed to customize!

---

### 6. TicketValidationManager (Manager)

**Responsibilities**:
- Validate PR has linked ticket
- Parse ticket references from PR body/title
- Query ticketing system to verify ticket exists

**Public API**:
```typescript
class TicketValidationManager {
  constructor(
    private ticketingService: ITicketingService
  ) {}

  /**
   * Extract ticket references from PR body/title
   * Supports formats: #123, JIRA-456, https://jira.com/browse/PROJ-123
   */
  extractTicketReferences(prData: PRData): string[] {
    const references: string[] = [];
    
    // GitHub issue format: #123
    const githubPattern = /#(\d+)/g;
    // Jira format: PROJ-123
    const jiraPattern = /\b([A-Z]+-\d+)\b/g;
    // URL format
    const urlPattern = /https?:\/\/[^\s]+\/([A-Z]+-\d+)/g;
    
    const text = `${prData.title} ${prData.description}`;
    
    references.push(...(text.match(githubPattern) || []));
    references.push(...(text.match(jiraPattern) || []));
    references.push(...(text.match(urlPattern) || []).map(m => m.split('/').pop()!));
    
    return [...new Set(references)]; // Deduplicate
  }

  /**
   * Validate PR has at least one valid ticket reference
   */
  async validatePRHasTicket(prData: PRData): Promise<ValidationResult> {
    const references = this.extractTicketReferences(prData);
    
    if (references.length === 0) {
      return {
        isValid: false,
        error: 'No ticket reference found in PR title or description',
        suggestions: [
          'Add a ticket reference like #123 or PROJ-456',
          'Link to a GitHub issue or Jira ticket',
        ],
      };
    }
    
    // Verify at least one ticket exists
    for (const reference of references) {
      const exists = await this.ticketingService.ticketExists(reference);
      if (exists) {
        return {
          isValid: true,
          ticketReference: reference,
        };
      }
    }
    
    return {
      isValid: false,
      error: `Referenced tickets not found: ${references.join(', ')}`,
      suggestions: [
        'Verify the ticket number is correct',
        'Ensure the ticket exists in the ticketing system',
      ],
    };
  }
}

interface ValidationResult {
  isValid: boolean;
  ticketReference?: string;
  error?: string;
  suggestions?: string[];
}
```

**Pattern Notes**:
- Manager (not Service) because it contains business logic
- Uses `ITicketingService` for ticketing system abstraction
- Returns structured validation results (not just boolean)
- Supports multiple ticket formats (GitHub, Jira, etc.)

---

### 7. ITicketingService (Service Interface)

**Responsibilities**:
- Abstract ticketing system operations
- Enable swapping between GitHub Issues, Jira, Linear, etc.

**Interface**:
```typescript
interface ITicketingService {
  /**
   * Check if a ticket exists
   */
  ticketExists(ticketId: string): Promise<boolean>;
  
  /**
   * Get ticket details
   */
  getTicket(ticketId: string): Promise<Ticket | null>;
  
  /**
   * Link PR to ticket (add comment/link)
   */
  linkPRToTicket(ticketId: string, prUrl: string): Promise<void>;
  
  /**
   * Get ticket status
   */
  getTicketStatus(ticketId: string): Promise<TicketStatus>;
}

interface Ticket {
  id: string;
  title: string;
  status: TicketStatus;
  assignee?: string;
  url: string;
}

type TicketStatus = 'open' | 'in_progress' | 'closed' | 'blocked';
```

**Implementation: GitHubIssueService**:
```typescript
class GitHubIssueService implements ITicketingService {
  constructor(
    private githubClient: Octokit,
    private repo: { owner: string; repo: string }
  ) {}

  async ticketExists(ticketId: string): Promise<boolean> {
    try {
      const issueNumber = this.parseIssueNumber(ticketId);
      await this.githubClient.issues.get({
        owner: this.repo.owner,
        repo: this.repo.repo,
        issue_number: issueNumber,
      });
      return true;
    } catch (error) {
      if (error.status === 404) return false;
      throw error;
    }
  }

  async getTicket(ticketId: string): Promise<Ticket | null> {
    try {
      const issueNumber = this.parseIssueNumber(ticketId);
      const response = await this.githubClient.issues.get({
        owner: this.repo.owner,
        repo: this.repo.repo,
        issue_number: issueNumber,
      });
      
      return {
        id: ticketId,
        title: response.data.title,
        status: this.mapGitHubStateToStatus(response.data.state),
        assignee: response.data.assignee?.login,
        url: response.data.html_url,
      };
    } catch (error) {
      return null;
    }
  }

  async linkPRToTicket(ticketId: string, prUrl: string): Promise<void> {
    const issueNumber = this.parseIssueNumber(ticketId);
    await this.githubClient.issues.createComment({
      owner: this.repo.owner,
      repo: this.repo.repo,
      issue_number: issueNumber,
      body: `🔗 Linked PR: ${prUrl}`,
    });
  }

  async getTicketStatus(ticketId: string): Promise<TicketStatus> {
    const ticket = await this.getTicket(ticketId);
    return ticket?.status ?? 'open';
  }

  private parseIssueNumber(ticketId: string): number {
    // Handle formats: #123, 123, or https://github.com/.../issues/123
    const match = ticketId.match(/\d+/);
    if (!match) throw new Error(`Invalid issue ID: ${ticketId}`);
    return parseInt(match[0], 10);
  }

  private mapGitHubStateToStatus(state: string): TicketStatus {
    return state === 'open' ? 'open' : 'closed';
  }
}
```

**Implementation: JiraService (Future)**:
```typescript
class JiraService implements ITicketingService {
  constructor(
    private jiraClient: JiraClient,
    private projectKey: string
  ) {}

  async ticketExists(ticketId: string): Promise<boolean> {
    try {
      await this.jiraClient.issues.getIssue({ issueIdOrKey: ticketId });
      return true;
    } catch (error) {
      if (error.statusCode === 404) return false;
      throw error;
    }
  }

  async getTicket(ticketId: string): Promise<Ticket | null> {
    try {
      const issue = await this.jiraClient.issues.getIssue({
        issueIdOrKey: ticketId,
      });
      
      return {
        id: ticketId,
        title: issue.fields.summary,
        status: this.mapJiraStatusToStatus(issue.fields.status.name),
        assignee: issue.fields.assignee?.displayName,
        url: `${this.jiraClient.baseUrl}/browse/${ticketId}`,
      };
    } catch (error) {
      return null;
    }
  }

  async linkPRToTicket(ticketId: string, prUrl: string): Promise<void> {
    await this.jiraClient.issues.addComment({
      issueIdOrKey: ticketId,
      comment: {
        body: `🔗 Linked PR: ${prUrl}`,
      },
    });
  }

  async getTicketStatus(ticketId: string): Promise<TicketStatus> {
    const ticket = await this.getTicket(ticketId);
    return ticket?.status ?? 'open';
  }

  private mapJiraStatusToStatus(jiraStatus: string): TicketStatus {
    const statusMap: Record<string, TicketStatus> = {
      'To Do': 'open',
      'In Progress': 'in_progress',
      'Done': 'closed',
      'Blocked': 'blocked',
    };
    return statusMap[jiraStatus] ?? 'open';
  }
}
```

**Configuration**:
```typescript
// config/config.ts
export const config = {
  ticketing: {
    provider: 'github', // or 'jira', 'linear', etc.
    github: {
      owner: 'your-org',
      repo: 'your-repo',
    },
    jira: {
      baseUrl: 'https://your-company.atlassian.net',
      projectKey: 'PROJ',
      email: 'bot@example.com',
      apiToken: process.env.JIRA_API_TOKEN,
    },
  },
};

// Service factory
function createTicketingService(): ITicketingService {
  switch (config.ticketing.provider) {
    case 'github':
      return new GitHubIssueService(
        createGitHubClient(),
        config.ticketing.github
      );
    case 'jira':
      return new JiraService(
        createJiraClient(),
        config.ticketing.jira.projectKey
      );
    default:
      throw new Error(`Unknown ticketing provider: ${config.ticketing.provider}`);
  }
}
```

**Pattern Notes**:
- Service interface enables swapping implementations
- Each implementation handles provider-specific logic
- Factory pattern creates appropriate service based on config
- Easy to add new providers (Linear, Asana, etc.)

**Usage in PRCoordinator**:
```typescript
async handlePROpened(payload: GitHubWebhookPayload): Promise<void> {
  const prData = this.extractPRData(payload);
  
  // Validate ticket linkage
  const validation = await this.managers.ticketValidation.validatePRHasTicket(prData);
  
  if (!validation.isValid) {
    // Post warning in Discord
    logger.warn(`PR #${prData.number} missing ticket:`, validation.error);
    // Could also post comment to GitHub PR or block merge
  }
  
  // Continue with PR creation...
}
```

---

### 8. DiscordMessageManager (Manager)

**Responsibilities**:
- Create Discord parent messages
- Update Discord parent messages
- Create and manage Discord threads
- Add/remove thread members
- Lock/archive threads

**Public API**:
```typescript
class DiscordMessageManager {
  constructor(
    private discordService: IDiscordService,
    private stateService: IStateService,
    private userMappingManager: UserMappingManager
  ) {}

  // Message Operations
  async createPRMessage(
    channelId: string,
    prData: PRData
  ): Promise<{ messageId: string; threadId: string }>;

  async updatePRMessage(
    messageId: string,
    updates: Partial<PRData>
  ): Promise<void>;

  async addReactionToMessage(
    messageId: string,
    emoji: string
  ): Promise<void>;

  // Thread Operations
  async createThread(
    messageId: string,
    threadName: string
  ): Promise<string>;

  async postToThread(
    threadId: string,
    content: string,
    mentions?: string[]
  ): Promise<void>;

  async addThreadMember(
    threadId: string,
    userId: string
  ): Promise<void>;

  async removeThreadMember(
    threadId: string,
    userId: string
  ): Promise<void>;

  async lockThread(threadId: string): Promise<void>;
}
```

**Pattern Notes**:
- Receives dependencies via constructor (dependency injection)
- Focused on Discord operations only (single responsibility)
- Returns results to coordinator via promises
- Never makes architectural decisions (coordinator orchestrates)

---

### 3. ReviewManager (Manager)

**Responsibilities**:
- Track review state changes
- Determine status transitions (draft → review → approved/changes)
- Aggregate reviewer states (multiple reviewers)
- Format review messages

**Public API**:
```typescript
class ReviewManager {
  constructor(
    private stateService: IStateService
  ) {}

  // Review State Logic
  determineStatus(prNumber: number, reviews: Review[]): PRStatus;
  
  getApprovers(prNumber: number): string[];
  getChangeRequesters(prNumber: number): string[];
  
  shouldShowNoReviewersWarning(prNumber: number): boolean;
  
  // Review Message Formatting
  formatReviewSubmittedMessage(
    reviewer: string,
    reviewState: 'approved' | 'changes_requested',
    comment?: string
  ): string;
  
  formatReviewDismissedMessage(reviewer: string): string;
}
```

**Pattern Notes**:
- Pure business logic (no external API calls)
- State accessed through `IStateService` interface
- Testable with mocked state service
- No direct Discord/GitHub calls (returns formatted strings)

---

### 4. StatusManager (Manager)

**Responsibilities**:
- Determine PR status based on multiple factors
- Format status strings for Discord messages
- Track status transitions for analytics

**Public API**:
```typescript
class StatusManager {
  constructor(
    private stateService: IStateService
  ) {}

  // Status Determination
  determineStatus(prData: PRData, reviews: Review[]): PRStatus;
  
  // Status Formatting
  formatStatus(status: PRStatus, metadata?: StatusMetadata): string;
  
  // Status Metadata
  getStatusMetadata(prNumber: number): StatusMetadata | null;
}

// Status Examples:
// "Draft"
// "Ready for Review"
// "Changes Requested by @user1, @user2"
// "Approved by @user1, @user2"
// "Merged by @user1"
// "Closed by @user1"
```

**Pattern Notes**:
- Focuses on status logic only
- Returns formatted strings (coordinator decides when to update Discord)
- Stateless (all state passed as parameters or retrieved from service)

---

### 5. UserMappingManager (Manager)

**Responsibilities**:
- Map GitHub usernames to Discord user IDs
- Handle missing mappings gracefully
- Cache mappings for performance

**Public API**:
```typescript
class UserMappingManager {
  constructor(
    private config: UserMappingConfig
  ) {}

  // Mapping Operations
  getDiscordUserId(githubUsername: string): string | null;
  
  getDiscordMention(githubUsername: string): string;
  // Returns: "<@123456>" if mapped, "@github-username" if not
  
  hasMapping(githubUsername: string): boolean;
  
  // Batch Operations (for reviewer lists)
  getDiscordMentions(githubUsernames: string[]): string[];
}
```

**Pattern Notes**:
- Simple mapping logic (no external API calls)
- Configuration injected via constructor
- Graceful degradation (returns GitHub username if no mapping)

---

### 6. DiscordService (Service)

**Responsibilities**:
- Abstract Discord API calls
- Handle Discord rate limiting
- Retry failed requests
- Convert Discord API responses to domain models

**Interface**:
```typescript
interface IDiscordService {
  // Message Operations
  sendMessage(channelId: string, content: MessageContent): Promise<string>;
  editMessage(messageId: string, content: MessageContent): Promise<void>;
  addReaction(messageId: string, emoji: string): Promise<void>;
  
  // Thread Operations
  createThread(messageId: string, name: string): Promise<string>;
  sendThreadMessage(threadId: string, content: string): Promise<void>;
  addThreadMember(threadId: string, userId: string): Promise<void>;
  removeThreadMember(threadId: string, userId: string): Promise<void>;
  lockThread(threadId: string): Promise<void>;
}
```

**Implementation Notes**:
- Uses discord.js library
- Implements exponential backoff for rate limiting
- Logs all API calls for debugging
- Throws typed errors for coordinator to handle

---

### 7. GitHubService (Service)

**Responsibilities**:
- Abstract GitHub API calls (if needed for querying PR data)
- Parse GitHub webhook payloads
- Verify webhook signatures

**Interface**:
```typescript
interface IGitHubService {
  // Webhook Operations
  verifyWebhookSignature(
    payload: string,
    signature: string,
    secret: string
  ): boolean;
  
  parseWebhookPayload<T>(payload: string): T;
  
  // API Operations (optional - for querying GitHub)
  getPullRequest(owner: string, repo: string, prNumber: number): Promise<PR>;
  getReviews(owner: string, repo: string, prNumber: number): Promise<Review[]>;
}
```

**Implementation Notes**:
- Uses @octokit/rest for GitHub API
- Webhook signature verification uses crypto module
- Minimal API calls (rely on webhook payload data when possible)

---

### 8. StateService (Service)

**Responsibilities**:
- Persist PR → Discord message/thread mappings
- Store PR state for status determination
- Provide fast lookups by PR number or Discord message ID

**Interface**:
```typescript
interface IStateService {
  // PR State Operations
  savePRState(prNumber: number, state: PRStateData): Promise<void>;
  getPRState(prNumber: number): Promise<PRStateData | null>;
  deletePRState(prNumber: number): Promise<void>;
  
  // Discord Mapping Operations
  getDiscordMessageId(prNumber: number): Promise<string | null>;
  getThreadId(prNumber: number): Promise<string | null>;
  getPRNumberByMessageId(messageId: string): Promise<number | null>;
}

interface PRStateData {
  prNumber: number;
  repo: string;
  owner: string;
  title: string;
  description: string;
  author: string;
  status: PRStatus;
  isDraft: boolean;
  reviewers: string[];
  reviews: Review[];
  discordMessageId: string;
  discordThreadId: string;
  createdAt: Date;
  updatedAt: Date;
}
```

**Implementation Options**:
1. **In-Memory (Development)**: Simple Map/Object for local testing
2. **File-Based (Simple Production)**: JSON file with locking
3. **Redis (Production)**: Fast, persistent, scalable
4. **PostgreSQL (Enterprise)**: Relational, queryable, audit trail

**Recommendation**: Start with file-based, migrate to Redis if needed

---

## Data Models

### PRStatus

```typescript
type PRStatus =
  | 'draft'
  | 'ready_for_review'
  | 'changes_requested'
  | 'approved'
  | 'merged'
  | 'closed';
```

### PRData

```typescript
interface PRData {
  number: number;
  title: string;
  description: string;
  author: string;           // GitHub username
  authorDiscordId?: string; // Discord user ID (if mapped)
  branchName: string;
  baseBranch: string;
  url: string;
  status: PRStatus;
  isDraft: boolean;
  reviewers: Reviewer[];
  reviews: Review[];
  repo: string;
  owner: string;
}

interface Reviewer {
  githubUsername: string;
  discordUserId?: string;  // If mapped
  state?: 'approved' | 'changes_requested' | 'pending';
}

interface Review {
  id: number;
  reviewer: string;        // GitHub username
  state: 'approved' | 'changes_requested' | 'commented' | 'dismissed';
  comment?: string;
  submittedAt: Date;
}
```

### MessageContent

```typescript
interface MessageContent {
  content?: string;  // Text content
  embeds?: Embed[];  // Rich embeds
}

interface Embed {
  title?: string;
  description?: string;
  url?: string;
  color?: number;
  fields?: EmbedField[];
  footer?: { text: string };
  timestamp?: string;
}

interface EmbedField {
  name: string;
  value: string;
  inline?: boolean;
}
```

---

## Discord Message Format

### Parent Message (Discord Embed)

```typescript
function formatPREmbed(prData: PRData): Embed {
  const status = formatStatus(prData);
  const reviewersText = formatReviewers(prData.reviewers);
  
  return {
    title: `${prData.title} #${prData.number}`,
    url: prData.url,
    description: prData.description || '_No description provided_',
    color: getStatusColor(prData.status),
    fields: [
      {
        name: 'Branch',
        value: `\`${prData.branchName}\` → \`${prData.baseBranch}\``,
        inline: false,
      },
      {
        name: 'Author',
        value: formatUserMention(prData.author, prData.authorDiscordId),
        inline: true,
      },
      {
        name: 'Reviewers',
        value: reviewersText || '⚠️ **No reviewers assigned!** Please add reviewers.',
        inline: false,
      },
      {
        name: 'Status',
        value: status,
        inline: false,
      },
    ],
    footer: { text: `${prData.repo}` },
    timestamp: new Date().toISOString(),
  };
}

function getStatusColor(status: PRStatus): number {
  switch (status) {
    case 'draft': return 0x6e7681;           // Gray
    case 'ready_for_review': return 0x1f6feb; // Blue
    case 'changes_requested': return 0xda3633; // Red
    case 'approved': return 0x2da44e;         // Green
    case 'merged': return 0x8250df;           // Purple
    case 'closed': return 0x6e7681;           // Gray
  }
}
```

### Thread Messages

**Initial Message (Bot Reminder)**:
```
👋 This thread is for discussing **PR #123: Add feature X**.

Please keep all PR-related conversation here or in the GitHub PR itself to maintain context.

[View PR on GitHub](https://github.com/owner/repo/pull/123)
```

**Reviewer Added**:
```
📢 @reviewer has been added as a reviewer for this PR.
```

**Review Submitted (Approved)**:
```
✅ @reviewer approved this PR!

> "Looks good to me! Nice work on the error handling."

@author Your PR has been approved by @reviewer.
```

**Review Submitted (Changes Requested)**:
```
🔴 @reviewer requested changes on this PR.

> "Please update the tests to cover the new error cases."

@author Please address the feedback from @reviewer.
```

**PR Closed**:
```
🚪 This PR was closed by @closer.

> "Closing in favor of #456"

@author This PR has been closed. The thread is now locked.
```

**PR Merged**:
```
🎉 This PR was merged by @merger!

@author Congratulations! Your changes are now in the main branch.

The thread is now locked.
```

---

## Configuration & Customization

### Developer-Friendly Customization

This architecture prioritizes ease of customization. Non-developers can adjust behavior by editing config files, not code.

### Message Template Customization

**Location**: `config/templates/discord-messages.json`

**Example** - Changing emoji and wording:
```json
// BEFORE (default)
{
  "review_approved": {
    "content": "✅ {{reviewerMention}} approved this PR!"
  }
}

// AFTER (customized)
{
  "review_approved": {
    "content": "🎉 {{reviewerMention}} gave this PR a thumbs up!"
  }
}
```

**Example** - Changing status messages:
```json
// BEFORE
{
  "status_messages": {
    "approved": "✅ Approved by {{reviewers}}",
    "changes_requested": "🔴 Changes Requested by {{reviewers}}"
  }
}

// AFTER (more casual tone)
{
  "status_messages": {
    "approved": "👍 Looks good to {{reviewers}}!",
    "changes_requested": "🤔 {{reviewers}} had some feedback"
  }
}
```

**Example** - Adjusting field order or adding fields:
```json
{
  "pr_created": {
    "embeds": [{
      "fields": [
        {
          "name": "Status",
          "value": "{{status}}",
          "inline": false,
          "_comment": "Swapped to show status first"
        },
        {
          "name": "Reviewers",
          "value": "{{reviewersMentions}}",
          "inline": false
        },
        {
          "name": "Estimated Review Time",
          "value": "{{estimatedReviewTime}}",
          "inline": true,
          "_comment": "New field added"
        }
      ]
    }]
  }
}
```

**No code changes needed!** Just restart the bot to pick up new templates.

---

### Emoji Reactions Configuration

**Location**: `config/reactions.json`

```json
{
  "_description": "Emoji reactions to add to parent message based on status",
  "reactions": {
    "draft": "📝",
    "ready_for_review": "👀",
    "changes_requested": "🔴",
    "approved": "✅",
    "merged": "🎉",
    "closed": "🚪"
  },
  "approved_reactions": ["✅", "🎉"],
  "_comment": "approved_reactions: Multiple reactions for approved status"
}
```

---

### Notification Channel Configuration

**Location**: `config/config.ts`

```typescript
export const config = {
  notificationChannels: [
    {
      type: 'discord',
      enabled: true,
      channelId: process.env.DISCORD_CHANNEL_ID,
      // Discord-specific options
      threadAutoArchiveDuration: 1440, // 24 hours
      allowThreadMentions: true,
    },
    {
      type: 'email',
      enabled: false, // Enable when ready
      recipients: ['team@example.com'],
      // Email-specific options
      fromAddress: 'pr-bot@example.com',
      includeInline: true, // Include PR diff in email
    },
    {
      type: 'slack',
      enabled: false,
      webhookUrl: process.env.SLACK_WEBHOOK_URL,
      // Slack-specific options
      channel: '#pull-requests',
      username: 'PR Bot',
      iconEmoji: ':robot_face:',
    },
  ],
};
```

**To enable a new channel**: Change `enabled: false` to `enabled: true` and provide required config.

---

### Ticketing System Configuration

**Location**: `config/config.ts`

**Switch from GitHub Issues to Jira**:
```typescript
// BEFORE (GitHub Issues)
export const config = {
  ticketing: {
    provider: 'github',
    github: {
      owner: 'your-org',
      repo: 'your-repo',
    },
  },
};

// AFTER (Jira)
export const config = {
  ticketing: {
    provider: 'jira',
    jira: {
      baseUrl: 'https://your-company.atlassian.net',
      projectKey: 'PROJ',
      email: 'bot@example.com',
      apiToken: process.env.JIRA_API_TOKEN,
    },
  },
};
```

**That's it!** The system will automatically use the Jira implementation.

---

### User Mapping Configuration

**Location**: `config/user-mappings.json`

```json
{
  "github-username-1": "123456789012345678",
  "github-username-2": "987654321098765432",
  "octocat": "111222333444555666"
}
```

**How to get Discord User IDs**:
1. Enable Developer Mode in Discord: Settings → Advanced → Developer Mode
2. Right-click user → Copy ID
3. Add to mapping file

**Graceful Degradation**: If no mapping exists, bot uses `@github-username` instead of Discord mention.

---

### Event-Specific Channel Routing

**Use Case**: Some events should only go to certain channels (e.g., merged PRs trigger email, but draft PRs don't)

**Location**: `config/event-routing.json`

```json
{
  "_description": "Define which events go to which channels",
  "event_routing": {
    "pr.created": {
      "channels": ["discord"]
    },
    "pr.draft_toggled": {
      "channels": ["discord"]
    },
    "pr.ready_for_review": {
      "channels": ["discord", "email"],
      "_comment": "Notify email when ready for review"
    },
    "review.approved": {
      "channels": ["discord"]
    },
    "review.changes_requested": {
      "channels": ["discord", "email"],
      "_comment": "Email author about requested changes"
    },
    "pr.merged": {
      "channels": ["discord", "email", "slack"],
      "_comment": "Notify all channels on merge"
    },
    "pr.closed": {
      "channels": ["discord"]
    }
  }
}
```

**Implementation** (in `NotificationManager`):
```typescript
private determineChannels(eventType: string): string[] {
  const routing = config.eventRouting[eventType];
  if (!routing) {
    return ['discord']; // Default to Discord only
  }
  return routing.channels;
}
```

---

## Security & Configuration

### Secrets Management

**Required Secrets**:
1. `GITHUB_WEBHOOK_SECRET` - For verifying webhook signatures
2. `DISCORD_BOT_TOKEN` - For Discord API authentication
3. `GITHUB_TOKEN` (optional) - For querying GitHub API (if needed)

**Storage Options**:

#### Option A: Environment Variables (Simple)
```bash
GITHUB_WEBHOOK_SECRET=your-webhook-secret
DISCORD_BOT_TOKEN=your-bot-token
DISCORD_CHANNEL_ID=123456789
USER_MAPPINGS='{"github-user": "discord-id"}'
```

**Pros**: Simple, works everywhere
**Cons**: Hard to update, not great for many mappings

#### Option B: Config File + Environment Variables (Recommended)
```typescript
// config/config.ts
export const config = {
  github: {
    webhookSecret: process.env.GITHUB_WEBHOOK_SECRET!,
    token: process.env.GITHUB_TOKEN,
  },
  discord: {
    botToken: process.env.DISCORD_BOT_TOKEN!,
    channelId: process.env.DISCORD_CHANNEL_ID!,
  },
  userMappings: loadUserMappings(),
};

function loadUserMappings(): Record<string, string> {
  // Option 1: From JSON file (not committed to git)
  if (fs.existsSync('./config/user-mappings.json')) {
    return JSON.parse(fs.readFileSync('./config/user-mappings.json', 'utf-8'));
  }
  
  // Option 2: From environment variable
  if (process.env.USER_MAPPINGS) {
    return JSON.parse(process.env.USER_MAPPINGS);
  }
  
  // Option 3: From encrypted file (using library like node-config)
  // ...
  
  return {};
}
```

**Pros**: Separation of concerns, easy to update mappings
**Cons**: Need to manage config file deployment

#### Option C: Secrets Manager (Production)
Use AWS Secrets Manager, Azure Key Vault, or HashiCorp Vault for production deployments.

**Pros**: Centralized, auditable, rotatable
**Cons**: More complex, costs money

**Recommendation**: Start with Option B, migrate to Option C for production

---

### User Mappings Configuration

**Format** (JSON):
```json
{
  "github-username-1": "discord-user-id-1",
  "github-username-2": "discord-user-id-2",
  "octocat": "123456789012345678"
}
```

**Getting Discord User IDs**:
1. Enable Developer Mode in Discord (Settings → Advanced → Developer Mode)
2. Right-click user → Copy ID

**Security Considerations**:
- ✅ Store in separate file (`.gitignore` it)
- ✅ Encrypt if storing in repo (use git-crypt or similar)
- ✅ Validate on load (ensure all values are valid Discord IDs)
- ❌ Never commit plaintext user mappings to public repos

---

## Testing Strategy

Following the black-box contract testing principles from ARCHITECTURE.md:

### Testing Pyramid

```
      ▲
     ╱ ╲
    ╱ E2E ╲        Few (5%)  - Full GitHub → Discord flow
   ╱───────╲
  ╱  Integ. ╲      Some (15%) - Coordinator + Managers
 ╱───────────╲
╱  Contract   ╲    Many (80%) - Individual components
╲─────────────╱
```

### Contract Tests (80%)

**PRCoordinator Tests** (Black-Box):
```typescript
describe('PRCoordinator', () => {
  let coordinator: PRCoordinator;
  let mockDiscordService: jest.Mocked<IDiscordService>;
  let mockStateService: jest.Mocked<IStateService>;
  
  beforeEach(() => {
    mockDiscordService = createMockDiscordService();
    mockStateService = createMockStateService();
    
    coordinator = new PRCoordinator(
      mockDiscordService,
      mockStateService,
      // ... other mocked dependencies
    );
  });

  describe('handlePROpened', () => {
    it('creates Discord message and thread', async () => {
      const payload = createMockPROpenedPayload();
      
      await coordinator.handlePROpened(payload);
      
      expect(mockDiscordService.sendMessage).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          embeds: expect.arrayContaining([
            expect.objectContaining({
              title: expect.stringContaining('#123'),
            }),
          ]),
        })
      );
      
      expect(mockDiscordService.createThread).toHaveBeenCalled();
    });
    
    it('emits prCreated event', async () => {
      const payload = createMockPROpenedPayload();
      let emittedPRNumber: number | null = null;
      
      coordinator.events.prCreated.addListener((data) => {
        emittedPRNumber = data.prNumber;
      });
      
      await coordinator.handlePROpened(payload);
      
      expect(emittedPRNumber).toBe(123);
    });
    
    it('shows warning when no reviewers assigned', async () => {
      const payload = createMockPROpenedPayload({ reviewers: [] });
      
      await coordinator.handlePROpened(payload);
      
      expect(mockDiscordService.sendMessage).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          embeds: expect.arrayContaining([
            expect.objectContaining({
              fields: expect.arrayContaining([
                expect.objectContaining({
                  name: 'Reviewers',
                  value: expect.stringContaining('No reviewers'),
                }),
              ]),
            }),
          ]),
        })
      );
    });
  });

  describe('handleReviewSubmitted', () => {
    it('updates message status when approved', async () => {
      const payload = createMockReviewPayload({ state: 'approved' });
      
      await coordinator.handleReviewSubmitted(payload);
      
      expect(mockDiscordService.editMessage).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          embeds: expect.arrayContaining([
            expect.objectContaining({
              fields: expect.arrayContaining([
                expect.objectContaining({
                  name: 'Status',
                  value: expect.stringContaining('Approved'),
                }),
              ]),
            }),
          ]),
        })
      );
    });
    
    it('posts review comment to thread', async () => {
      const payload = createMockReviewPayload({
        state: 'approved',
        comment: 'LGTM!',
      });
      
      await coordinator.handleReviewSubmitted(payload);
      
      expect(mockDiscordService.sendThreadMessage).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('LGTM!')
      );
    });
    
    it('mentions author and reviewer in thread', async () => {
      const payload = createMockReviewPayload({
        state: 'changes_requested',
        reviewer: 'reviewer-1',
        author: 'author-1',
      });
      
      await coordinator.handleReviewSubmitted(payload);
      
      expect(mockDiscordService.sendThreadMessage).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringMatching(/@author-1.*@reviewer-1/)
      );
    });
  });

  describe('handlePRClosed', () => {
    it('locks thread and removes all members', async () => {
      const payload = createMockPRClosedPayload();
      mockStateService.getPRState.mockResolvedValue({
        discordThreadId: 'thread-123',
        reviewers: ['reviewer-1', 'reviewer-2'],
      });
      
      await coordinator.handlePRClosed(payload);
      
      expect(mockDiscordService.lockThread).toHaveBeenCalledWith('thread-123');
      expect(mockDiscordService.removeThreadMember).toHaveBeenCalledTimes(2);
    });
  });
});
```

**EventBroadcaster Tests**:
```typescript
describe('EventBroadcaster', () => {
  let broadcaster: EventBroadcaster;
  let mockDiscordChannel: jest.Mocked<INotificationChannel>;
  let mockEmailChannel: jest.Mocked<INotificationChannel>;
  
  beforeEach(() => {
    mockDiscordChannel = {
      name: 'discord',
      isEnabled: jest.fn().mockReturnValue(true),
      handleEvent: jest.fn().mockResolvedValue(undefined),
    };
    
    mockEmailChannel = {
      name: 'email',
      isEnabled: jest.fn().mockReturnValue(false), // Disabled
      handleEvent: jest.fn().mockResolvedValue(undefined),
    };
    
    broadcaster = new EventBroadcaster([mockDiscordChannel, mockEmailChannel]);
  });

  it('broadcasts to all enabled channels', async () => {
    await broadcaster.broadcast('pr.created', { prNumber: 123 });
    
    expect(mockDiscordChannel.handleEvent).toHaveBeenCalledWith('pr.created', { prNumber: 123 });
    expect(mockEmailChannel.handleEvent).not.toHaveBeenCalled(); // Disabled
  });
  
  it('continues broadcasting even if one channel fails', async () => {
    mockDiscordChannel.handleEvent.mockRejectedValue(new Error('Discord API error'));
    
    // Should not throw
    await expect(
      broadcaster.broadcast('pr.created', { prNumber: 123 })
    ).resolves.not.toThrow();
    
    // Both channels should have been attempted
    expect(mockDiscordChannel.handleEvent).toHaveBeenCalled();
  });
});
```

**MessageTemplateService Tests**:
```typescript
describe('MessageTemplateService', () => {
  let service: MessageTemplateService;
  
  beforeEach(async () => {
    service = new MessageTemplateService();
    await service.loadTemplates('test/fixtures/templates.json');
  });

  it('renders template with variable substitution', () => {
    const rendered = service.render('pr_created', {
      title: 'Add feature X',
      prNumber: 123,
      authorMention: '<@123456>',
    });
    
    expect(rendered.embeds[0].title).toBe('Add feature X #123');
    expect(rendered.embeds[0].fields[1].value).toBe('<@123456>');
  });
  
  it('preserves non-string values', () => {
    const rendered = service.render('pr_created', {
      color: 0x1f6feb,
    });
    
    expect(rendered.embeds[0].color).toBe(0x1f6feb);
    expect(typeof rendered.embeds[0].color).toBe('number');
  });
  
  it('leaves unreplaced variables as-is', () => {
    const rendered = service.render('pr_created', {
      title: 'Test',
      // Missing prNumber
    });
    
    expect(rendered.embeds[0].title).toBe('Test #{{prNumber}}');
  });
});
```

**TicketValidationManager Tests**:
```typescript
describe('TicketValidationManager', () => {
  let manager: TicketValidationManager;
  let mockTicketingService: jest.Mocked<ITicketingService>;
  
  beforeEach(() => {
    mockTicketingService = {
      ticketExists: jest.fn(),
      getTicket: jest.fn(),
      linkPRToTicket: jest.fn(),
      getTicketStatus: jest.fn(),
    };
    
    manager = new TicketValidationManager(mockTicketingService);
  });

  describe('extractTicketReferences', () => {
    it('extracts GitHub issue references', () => {
      const prData = {
        title: 'Fix bug',
        description: 'Fixes #123 and #456',
      };
      
      const refs = manager.extractTicketReferences(prData);
      
      expect(refs).toContain('#123');
      expect(refs).toContain('#456');
    });
    
    it('extracts Jira ticket references', () => {
      const prData = {
        title: 'Implement PROJ-789',
        description: 'Related to PROJ-790',
      };
      
      const refs = manager.extractTicketReferences(prData);
      
      expect(refs).toContain('PROJ-789');
      expect(refs).toContain('PROJ-790');
    });
  });

  describe('validatePRHasTicket', () => {
    it('returns valid when ticket exists', async () => {
      mockTicketingService.ticketExists.mockResolvedValue(true);
      
      const prData = {
        title: 'Fix #123',
        description: 'Fixes issue 123',
      };
      
      const result = await manager.validatePRHasTicket(prData);
      
      expect(result.isValid).toBe(true);
      expect(result.ticketReference).toBe('#123');
    });
    
    it('returns invalid when no ticket reference found', async () => {
      const prData = {
        title: 'Add feature',
        description: 'No ticket reference',
      };
      
      const result = await manager.validatePRHasTicket(prData);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('No ticket reference found');
      expect(result.suggestions).toBeDefined();
    });
    
    it('returns invalid when referenced ticket does not exist', async () => {
      mockTicketingService.ticketExists.mockResolvedValue(false);
      
      const prData = {
        title: 'Fix #999',
        description: 'Fixes non-existent issue',
      };
      
      const result = await manager.validatePRHasTicket(prData);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('not found');
    });
  });
});
```

**Manager Tests**:
```typescript
describe('StatusManager', () => {
  let manager: StatusManager;
  let mockStateService: jest.Mocked<IStateService>;
  
  beforeEach(() => {
    mockStateService = createMockStateService();
    manager = new StatusManager(mockStateService);
  });

  describe('determineStatus', () => {
    it('returns "draft" for draft PRs', () => {
      const prData = { isDraft: true, reviews: [] };
      
      const status = manager.determineStatus(prData, []);
      
      expect(status).toBe('draft');
    });
    
    it('returns "changes_requested" when any reviewer requests changes', () => {
      const prData = { isDraft: false };
      const reviews = [
        { state: 'approved', reviewer: 'user1' },
        { state: 'changes_requested', reviewer: 'user2' },
      ];
      
      const status = manager.determineStatus(prData, reviews);
      
      expect(status).toBe('changes_requested');
    });
    
    it('returns "approved" when all reviewers approve', () => {
      const prData = { isDraft: false };
      const reviews = [
        { state: 'approved', reviewer: 'user1' },
        { state: 'approved', reviewer: 'user2' },
      ];
      
      const status = manager.determineStatus(prData, reviews);
      
      expect(status).toBe('approved');
    });
  });

  describe('formatStatus', () => {
    it('formats approved status with multiple reviewers', () => {
      const formatted = manager.formatStatus('approved', {
        reviewers: ['@user1', '@user2'],
      });
      
      expect(formatted).toBe('✅ Approved by @user1, @user2');
    });
    
    it('formats changes requested with reviewer mentions', () => {
      const formatted = manager.formatStatus('changes_requested', {
        reviewers: ['@user1'],
      });
      
      expect(formatted).toBe('🔴 Changes Requested by @user1');
    });
  });
});
```

### Integration Tests (15%)

Test coordinator + managers with real manager implementations, mocked services:

```typescript
describe('PRCoordinator Integration', () => {
  let coordinator: PRCoordinator;
  let mockDiscordService: jest.Mocked<IDiscordService>;
  let mockStateService: jest.Mocked<IStateService>;
  // Real managers (not mocked)
  let discordManager: DiscordMessageManager;
  let reviewManager: ReviewManager;
  let statusManager: StatusManager;
  
  beforeEach(() => {
    mockDiscordService = createMockDiscordService();
    mockStateService = createMockStateService();
    
    // Real manager instances
    discordManager = new DiscordMessageManager(
      mockDiscordService,
      mockStateService,
      new UserMappingManager(testMappings)
    );
    
    reviewManager = new ReviewManager(mockStateService);
    statusManager = new StatusManager(mockStateService);
    
    coordinator = new PRCoordinator(
      discordManager,
      reviewManager,
      statusManager,
      mockStateService
    );
  });

  it('handles full PR lifecycle from open to merged', async () => {
    // 1. Open PR
    await coordinator.handlePROpened(createMockPayload());
    
    // 2. Add reviewer
    await coordinator.handleReviewerAdded(createMockReviewerPayload());
    
    // 3. Submit review (changes requested)
    await coordinator.handleReviewSubmitted(createMockReviewPayload({
      state: 'changes_requested',
    }));
    
    // 4. Submit review (approved)
    await coordinator.handleReviewSubmitted(createMockReviewPayload({
      state: 'approved',
    }));
    
    // 5. Merge PR
    await coordinator.handlePRClosed(createMockMergedPayload());
    
    // Verify the full flow
    expect(mockDiscordService.sendMessage).toHaveBeenCalledTimes(1);
    expect(mockDiscordService.editMessage).toHaveBeenCalledTimes(4); // reviewer added, changes, approved, merged
    expect(mockDiscordService.lockThread).toHaveBeenCalledTimes(1);
  });
});
```

### E2E Tests (5%)

Test full system with real GitHub webhooks and Discord bot:

```typescript
describe('E2E: GitHub → Discord', () => {
  let server: Express;
  let discordBot: Client;
  
  beforeAll(async () => {
    // Start webhook server
    server = await startTestServer();
    
    // Start Discord bot
    discordBot = await startTestDiscordBot();
  });

  afterAll(async () => {
    await server.close();
    await discordBot.destroy();
  });

  it('creates Discord message when PR is opened in GitHub', async () => {
    // Send webhook to server
    const response = await fetch('http://localhost:3000/webhook/github', {
      method: 'POST',
      headers: {
        'X-GitHub-Event': 'pull_request',
        'X-Hub-Signature-256': generateSignature(prOpenedPayload),
      },
      body: JSON.stringify(prOpenedPayload),
    });
    
    expect(response.status).toBe(200);
    
    // Wait for Discord message
    await waitForDiscordMessage(TEST_CHANNEL_ID, (message) => {
      return message.embeds[0].title.includes('#123');
    });
    
    // Verify message exists
    const messages = await getChannelMessages(TEST_CHANNEL_ID);
    expect(messages).toContainEqual(
      expect.objectContaining({
        embeds: expect.arrayContaining([
          expect.objectContaining({
            title: expect.stringContaining('#123'),
          }),
        ]),
      })
    );
  });
});
```

### Test Utilities

```typescript
// test/utils/mocks.ts
export function createMockDiscordService(): jest.Mocked<IDiscordService> {
  return {
    sendMessage: jest.fn().mockResolvedValue('message-123'),
    editMessage: jest.fn().mockResolvedValue(undefined),
    createThread: jest.fn().mockResolvedValue('thread-123'),
    sendThreadMessage: jest.fn().mockResolvedValue(undefined),
    addThreadMember: jest.fn().mockResolvedValue(undefined),
    removeThreadMember: jest.fn().mockResolvedValue(undefined),
    lockThread: jest.fn().mockResolvedValue(undefined),
    addReaction: jest.fn().mockResolvedValue(undefined),
  };
}

export function createMockStateService(): jest.Mocked<IStateService> {
  const store = new Map<number, PRStateData>();
  
  return {
    savePRState: jest.fn().mockImplementation((prNumber, state) => {
      store.set(prNumber, state);
      return Promise.resolve();
    }),
    getPRState: jest.fn().mockImplementation((prNumber) => {
      return Promise.resolve(store.get(prNumber) || null);
    }),
    deletePRState: jest.fn().mockImplementation((prNumber) => {
      store.delete(prNumber);
      return Promise.resolve();
    }),
    getDiscordMessageId: jest.fn(),
    getThreadId: jest.fn(),
    getPRNumberByMessageId: jest.fn(),
  };
}

export function createMockPROpenedPayload(overrides = {}): GitHubWebhookPayload {
  return {
    action: 'opened',
    pull_request: {
      number: 123,
      title: 'Add feature X',
      body: 'This PR adds feature X',
      html_url: 'https://github.com/owner/repo/pull/123',
      draft: false,
      user: { login: 'author-1' },
      head: { ref: 'feature-branch' },
      base: { ref: 'main' },
      requested_reviewers: [],
    },
    repository: {
      name: 'repo',
      owner: { login: 'owner' },
    },
    ...overrides,
  };
}
```

---

## Implementation Phases

### Phase 1: Foundation (Week 1)

**Goal**: Set up project structure, core services, basic webhook handling

**Tasks**:
- [ ] Initialize TypeScript project with folder structure
- [ ] Set up Express webhook server with signature verification
- [ ] Implement `DiscordService` (send message, create thread)
- [ ] Implement `StateService` (in-memory or file-based)
- [ ] Implement `WebhookCoordinator` (route webhooks to PR coordinator)
- [ ] Write tests for services (contract tests)

**Deliverable**: Webhook server that can receive GitHub events and log them

---

### Phase 2: PR Creation (Week 2)

**Goal**: Handle PR opened event, create Discord message and thread

**Tasks**:
- [ ] Implement `PRCoordinator.handlePROpened()`
- [ ] Implement `DiscordMessageManager` (create message, create thread)
- [ ] Implement `UserMappingManager` (load mappings, map users)
- [ ] Implement message formatting (embed structure)
- [ ] Write tests for PRCoordinator (black-box)
- [ ] Test end-to-end with real GitHub webhook

**Deliverable**: Bot creates Discord message + thread when PR is opened

---

### Phase 3: Status Management (Week 3)

**Goal**: Handle PR status changes (draft, ready, closed, merged)

**Tasks**:
- [ ] Implement `StatusManager` (determine status, format status)
- [ ] Implement `PRCoordinator.handlePRUpdated()` (draft toggle)
- [ ] Implement `PRCoordinator.handlePRClosed()` (closed/merged)
- [ ] Implement thread locking and member removal
- [ ] Write tests for status transitions
- [ ] Test all status changes end-to-end

**Deliverable**: Bot updates status and handles PR lifecycle

---

### Phase 4: Reviewer Management (Week 4)

**Goal**: Handle reviewer add/remove, thread membership

**Tasks**:
- [ ] Implement `PRCoordinator.handleReviewerAdded()`
- [ ] Implement `PRCoordinator.handleReviewerRemoved()`
- [ ] Implement thread member add/remove in `DiscordMessageManager`
- [ ] Update message when reviewers change
- [ ] Post notification messages in thread
- [ ] Write tests for reviewer management
- [ ] Test reviewer flows end-to-end

**Deliverable**: Bot manages reviewers and thread membership

---

### Phase 5: Review Activity (Week 5)

**Goal**: Handle review submissions (approved, changes requested, dismissed)

**Tasks**:
- [ ] Implement `ReviewManager` (aggregate reviews, determine status)
- [ ] Implement `PRCoordinator.handleReviewSubmitted()`
- [ ] Implement `PRCoordinator.handleReviewDismissed()`
- [ ] Format review messages with comments
- [ ] Add reactions to parent message
- [ ] Write tests for review logic
- [ ] Test review flows end-to-end

**Deliverable**: Bot tracks reviews and updates status accordingly

---

### Phase 6: Polish & Production (Week 6)

**Goal**: Error handling, logging, monitoring, deployment

**Tasks**:
- [ ] Add comprehensive error handling (retries, dead letter queue)
- [ ] Add structured logging (Winston or Pino)
- [ ] Add health check endpoint
- [ ] Set up monitoring (error tracking, uptime monitoring)
- [ ] Write deployment documentation
- [ ] Set up CI/CD pipeline
- [ ] Deploy to production environment

**Deliverable**: Production-ready bot with monitoring and observability

---

## Deployment & Operations

### Deployment Options

#### Option 1: Docker Container (Recommended)

**Dockerfile**:
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY dist ./dist
COPY config ./config

EXPOSE 3000

CMD ["node", "dist/index.js"]
```

**docker-compose.yml**:
```yaml
version: '3.8'

services:
  discord-pr-bot:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - GITHUB_WEBHOOK_SECRET=${GITHUB_WEBHOOK_SECRET}
      - DISCORD_BOT_TOKEN=${DISCORD_BOT_TOKEN}
      - DISCORD_CHANNEL_ID=${DISCORD_CHANNEL_ID}
    volumes:
      - ./data:/app/data  # For file-based state persistence
    restart: unless-stopped
```

**Deploy**:
```bash
docker-compose up -d
```

---

#### Option 2: PM2 (Node.js Process Manager)

**ecosystem.config.js**:
```javascript
module.exports = {
  apps: [{
    name: 'discord-pr-bot',
    script: 'dist/index.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
    },
  }],
};
```

**Deploy**:
```bash
npm run build
pm2 start ecosystem.config.js
pm2 save
pm2 startup  # Set up auto-start on system boot
```

---

#### Option 3: Systemd Service

**discord-pr-bot.service**:
```ini
[Unit]
Description=Discord PR Bot
After=network.target

[Service]
Type=simple
User=discord-bot
WorkingDirectory=/opt/discord-pr-bot
ExecStart=/usr/bin/node dist/index.js
Restart=on-failure
Environment="NODE_ENV=production"
EnvironmentFile=/etc/discord-pr-bot/env

[Install]
WantedBy=multi-user.target
```

**Deploy**:
```bash
sudo cp discord-pr-bot.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable discord-pr-bot
sudo systemctl start discord-pr-bot
```

---

### GitHub Webhook Setup

1. Go to GitHub repo → Settings → Webhooks → Add webhook
2. Payload URL: `https://your-server.com/webhook/github`
3. Content type: `application/json`
4. Secret: (enter your webhook secret)
5. Events:
   - ✅ Pull requests
   - ✅ Pull request reviews
   - ✅ Pull request review comments
6. Active: ✅

---

### Discord Bot Setup

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create New Application → Bot
3. Copy Bot Token (store as `DISCORD_BOT_TOKEN`)
4. Enable Intents:
   - ✅ Presence Intent
   - ✅ Server Members Intent
   - ✅ Message Content Intent (if reading message content)
5. OAuth2 → URL Generator:
   - Scopes: `bot`
   - Bot Permissions:
     - ✅ Send Messages
     - ✅ Send Messages in Threads
     - ✅ Manage Threads
     - ✅ Embed Links
     - ✅ Add Reactions
     - ✅ Manage Messages
6. Copy invite URL and add bot to your server

---

### Monitoring & Observability

**Health Check Endpoint**:
```typescript
// src/webhooks/routes.ts
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});
```

**Structured Logging**:
```typescript
// src/utils/logger.ts
import winston from 'winston';

export const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple(),
  }));
}
```

**Error Tracking** (Optional):
- Sentry for error tracking: https://sentry.io
- Datadog for APM: https://www.datadoghq.com
- LogRocket for session replay: https://logrocket.com

---

## Appendix: Webhook Payloads

### PR Opened

```json
{
  "action": "opened",
  "pull_request": {
    "number": 123,
    "title": "Add feature X",
    "body": "This PR adds feature X",
    "html_url": "https://github.com/owner/repo/pull/123",
    "draft": false,
    "user": { "login": "author-username" },
    "head": { "ref": "feature-branch" },
    "base": { "ref": "main" },
    "requested_reviewers": [
      { "login": "reviewer-1" },
      { "login": "reviewer-2" }
    ]
  },
  "repository": {
    "name": "repo-name",
    "owner": { "login": "owner-name" }
  }
}
```

### Review Submitted

```json
{
  "action": "submitted",
  "review": {
    "id": 456,
    "user": { "login": "reviewer-username" },
    "body": "Looks good!",
    "state": "approved",  // or "changes_requested" or "commented"
    "submitted_at": "2023-10-01T12:00:00Z"
  },
  "pull_request": {
    "number": 123,
    "title": "Add feature X"
  }
}
```

### Reviewer Added

```json
{
  "action": "review_requested",
  "pull_request": { "number": 123 },
  "requested_reviewer": { "login": "new-reviewer" }
}
```

---

## Summary

This architecture provides:

### Core Capabilities
✅ **Clean Separation of Concerns**: Coordinator → Managers → Services
✅ **Testability**: Black-box contract tests for all components (80/15/5 pyramid)
✅ **Flexibility**: Multiple deployment options, swappable services
✅ **Scalability**: Can handle multiple repos and Discord servers
✅ **Maintainability**: Small, focused files (<500 lines) following OOP principles
✅ **Security**: Webhook verification, secret management, user mapping protection
✅ **Observability**: Comprehensive logging, error tracking, health checks

### Extensibility (Future-Proof)

#### 1. Abstract Ticketing System ✅
- **Interface**: `ITicketingService` enables swapping ticketing systems
- **Current**: GitHub Issues
- **Future**: Jira, Linear, Asana, Monday.com, etc.
- **How to add**: Implement `ITicketingService`, change config provider
- **No coordinator changes needed**

#### 2. Customizable Messaging ✅
- **Templates**: YAML/JSON config files for all messages
- **Variables**: `{{prNumber}}`, `{{author}}`, `{{status}}`, etc.
- **Customizable**: Wording, emojis, reactions, colors, field order
- **How to adjust**: Edit `config/templates/*.yaml`, restart bot
- **No code changes needed**

#### 3. Multi-Channel Broadcasting ✅
- **Interface**: `INotificationChannel` enables multiple notification channels
- **Current**: Discord
- **Future**: Email, Slack, Microsoft Teams, SMS, webhooks, document generation
- **How to add**: Implement `INotificationChannel`, enable in config
- **Coordinator publishes events once → all channels receive automatically**

### Extension Points Summary

| Extension | Interface | Current Implementation | Future Implementations | Effort to Add |
|-----------|-----------|----------------------|----------------------|---------------|
| **Ticketing** | `ITicketingService` | GitHub Issues | Jira, Linear, Asana | 1-2 days |
| **Notifications** | `INotificationChannel` | Discord | Email, Slack, Teams | 1-3 days |
| **Templates** | Config files | Discord messages | Email templates, PDFs | Hours |
| **Event Routing** | Config-based | All to Discord | Per-event channel routing | Hours |

### Architecture Strengths

1. **OOP Principles**: Single responsibility, dependency injection, encapsulation
2. **Interface-Driven**: Services defined by interfaces, implementations swappable
3. **Event-Driven**: Loose coupling via EventBroadcaster (pub/sub pattern)
4. **Configuration-First**: Behavior adjustable via config, not code changes
5. **Test-Friendly**: Black-box tests survive refactoring and implementation changes

### Developer Experience

**For Developers**:
- Clear patterns to follow (Coordinator/Manager/Service)
- Easy to test (mock interfaces, not implementations)
- Small files (no God classes)
- Type-safe (TypeScript interfaces)

**For Non-Developers**:
- Adjust messaging via JSON config files
- Change emojis/wording without code
- Enable/disable features via config
- Add user mappings in JSON
- VS Code provides autocomplete and syntax validation

**For Operations**:
- Multiple deployment options (Docker, PM2, systemd)
- Health checks and monitoring built-in
- Structured logging for debugging
- Graceful error handling (one channel failure doesn't break others)

---

## Next Steps

### Phase 0: Decision & Setup (Week 0)
1. ✅ Review this architecture document
2. ⬜ Confirm Option 2 (Webhook Server) as primary architecture
3. ⬜ Choose deployment target:
   - **Recommended**: Docker on self-hosted runner with tunnel (you have this!)
   - Alternative: AWS ECS/Fargate (you have AWS)
   - Alternative: CloudFlare Workers (you have CloudFlare, but limited to Option 4 serverless)
4. ⬜ Set up GitHub webhook endpoint URL (via tunnel or load balancer)
5. ⬜ Create Discord bot and get token
6. ⬜ Gather GitHub ↔ Discord user mappings

### Phase 1: Foundation (Week 1)
- Set up TypeScript project with folder structure
- Implement Express webhook server with signature verification
- Implement core services (`DiscordService`, `StateService`, `MessageTemplateService`)
- Implement `EventBroadcaster` and `INotificationChannel` interface
- Write tests for services (contract tests)

### Phase 2: PR Creation (Week 2)
- Implement `PRCoordinator.handlePROpened()`
- Implement `DiscordNotificationChannel` (full implementation)
- Implement `UserMappingManager`
- Implement message formatting (template-based)
- Implement `TicketValidationManager` (optional for Phase 2)
- Write tests for PRCoordinator (black-box)

### Phase 3: Status Management (Week 3)
- Implement `StatusManager`
- Implement PR status changes (draft, ready, closed, merged)
- Implement thread locking and member removal
- Write tests for status transitions

### Phase 4: Reviewer Management (Week 4)
- Implement reviewer add/remove
- Implement thread member management
- Update message when reviewers change
- Post notification messages in thread

### Phase 5: Review Activity (Week 5)
- Implement `ReviewManager`
- Implement review submissions (approved, changes requested)
- Format review messages with comments
- Add reactions to parent message

### Phase 6: Polish & Deploy (Week 6)
- Add comprehensive error handling
- Add structured logging
- Set up monitoring (error tracking, uptime)
- Deploy to production (Docker on self-hosted runner)
- Document operational procedures

### Future Phases (Post-Launch)

**Phase 7: Jira Integration (1-2 weeks)**
- Implement `JiraService` (implements `ITicketingService`)
- Test ticket validation with Jira
- Deploy and switch config to `provider: 'jira'`

**Phase 8: Email Notifications (1-2 weeks)**
- Implement `EmailNotificationChannel` (implements `INotificationChannel`)
- Create email templates
- Test email delivery
- Enable in config

**Phase 9: Advanced Features (2-3 weeks)**
- Document generation for closed PRs
- Slack integration
- Custom analytics/reporting
- PR metrics dashboard

---

## Estimated Effort

**Initial Implementation** (Phases 1-6):
- Timeline: 6 weeks
- Effort: 1 developer, 20-30 hours/week
- Total: 120-180 hours

**Future Extensions** (per extension):
- New ticketing system: 1-2 days (8-16 hours)
- New notification channel: 1-3 days (8-24 hours)
- Template adjustments: Hours (no code changes)

---

## Questions?

If you need clarification on any component, pattern, or decision, let me know! I can provide:
- More detailed pseudocode for specific components
- Additional testing examples
- Deployment guides for your specific infrastructure (AWS, CloudFlare, self-hosted runners)
- Migration strategies for future extensions
