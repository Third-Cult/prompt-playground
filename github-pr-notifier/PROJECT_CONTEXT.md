  # GitHub PR Notifier - Project Context

> **For AI Agents**: This document provides project-specific context for working on the GitHub PR Notifier. Read this BEFORE making any changes to this project.

## Quick Reference

- **Project Type:** Node.js webhook server + Discord bot
- **Primary Language:** TypeScript
- **Architecture Pattern:** Coordinator/Manager/Service (see [ARCHITECTURE.md](../ARCHITECTURE.md))
- **Testing Approach:** Black-box contract testing (see [AGENTS.md](../AGENTS.md))
- **Current Status:** ✅ Production-ready (all phases complete)

## Project Overview

The GitHub PR Notifier is a webhook server that automatically posts GitHub Pull Request notifications to Discord channels with threaded discussions. It tracks the full PR lifecycle from creation through merge/close.

### Core Features

- Discord message creation with rich embeds when PR is opened
- Threaded discussions for each PR
- Status tracking (draft, ready for review, changes requested, approved, merged, closed)
- Reviewer management (add/remove reviewers to/from threads)
- Review activity tracking (approved, changes requested, dismissed)
- User mapping (GitHub username → Discord mentions)
- Customizable templates (JSON-based message formatting)
- Multi-environment support (dev, staging, production)

## Architecture

This project strictly follows the patterns defined in the root-level architecture documents:

### Adherence to Root Guidelines

1. **AGENTS.md Compliance:**
   - ✅ File size limits enforced (max 500 lines)
   - ✅ Single responsibility per class
   - ✅ Black-box contract testing only
   - ✅ No progress files or status tracking files

2. **AGENTS_TYPESCRIPT.md Compliance:**
   - ✅ Coordinator pattern for `PRCoordinator`
   - ✅ Manager pattern for focused concerns (`NotificationManager`, `UserMappingManager`)
   - ✅ Service pattern for external integrations (`DiscordService`, `GitHubService`, `StateService`)
   - ✅ Dependency injection throughout
   - ✅ Interface-based service abstractions

3. **ARCHITECTURE.md Compliance:**
   - ✅ Event-driven communication (semantic events, not generic state changes)
   - ✅ Encapsulation (stores are private, public APIs only)
   - ✅ Separation of concerns (clear boundaries between layers)
   - ✅ Testability (all components have black-box tests)

### Project-Specific Patterns

**PRCoordinator (Feature Coordinator)**
- Orchestrates PR lifecycle events
- Delegates to managers for specific concerns
- Emits semantic events (not used for multi-channel yet, but designed for future extensibility)
- Owns PR state through `StateService`

**Managers:**
- `NotificationManager`: Formats Discord notifications
- `UserMappingManager`: Maps GitHub users to Discord users

**Services:**
- `DiscordService`: Discord API integration
- `GitHubService`: GitHub webhook verification and parsing
- `FileStateService`/`InMemoryStateService`: PR state persistence
- `MessageTemplateService`: Template loading and rendering

**Key Design Decisions:**
1. Template-based messaging for easy customization without code changes
2. File-based state storage for simplicity (can migrate to Redis/DB later)
3. PM2 for process management (24/7 uptime on Windows)
4. Multi-environment support with separate ports and configs

## Directory Structure

```
github-pr-notifier/
├── PROJECT_CONTEXT.md              # This file - context for AI agents
├── README.md                       # User-facing documentation
├── DEPLOYMENT.md                   # Deployment guide (Windows-focused)
├── E2E_TESTING.md                  # Comprehensive testing documentation
├── docs/
│   └── DISCORD_PR_BOT_ARCHITECTURE.md  # Detailed architecture spec
├── src/
│   ├── coordinators/
│   │   └── pr/
│   │       ├── PRCoordinator.ts            # Main orchestrator
│   │       ├── PRCoordinator.test.ts       # Black-box tests
│   │       └── managers/
│   │           ├── NotificationManager.ts
│   │           ├── UserMappingManager.ts
│   │           └── *.test.ts
│   ├── services/
│   │   ├── discord/
│   │   │   ├── DiscordService.ts
│   │   │   └── interfaces/
│   │   ├── github/
│   │   │   ├── GitHubService.ts
│   │   │   ├── GitHubService.test.ts
│   │   │   └── interfaces/
│   │   ├── state/
│   │   │   ├── FileStateService.ts
│   │   │   ├── InMemoryStateService.ts
│   │   │   └── interfaces/
│   │   └── templates/
│   │       ├── MessageTemplateService.ts
│   │       └── interfaces/
│   ├── config/
│   │   ├── config.ts                     # Centralized configuration
│   │   └── templates/
│   │       └── discord-messages.json     # Customizable templates
│   ├── models/
│   │   └── PRState.ts
│   ├── utils/
│   │   ├── logger.ts
│   │   └── githubPayloadParser.ts
│   ├── webhooks/
│   │   ├── server.ts
│   │   ├── routes.ts
│   │   └── middleware/
│   └── index.ts
├── config/
│   └── user-mappings.json              # GitHub → Discord user mappings
├── data/
│   └── pr-state.json                   # File-based state storage
├── ecosystem.config.js                  # PM2 configuration (multi-env)
├── jest.config.js
├── package.json
└── tsconfig.json
```

## Key Files for AI Agents

### Must-Read Before Editing:

1. **[docs/DISCORD_PR_BOT_ARCHITECTURE.md](./docs/DISCORD_PR_BOT_ARCHITECTURE.md)**
   - Complete architecture specification
   - Component design patterns
   - Data models and interfaces
   - Extension points for future features

2. **[src/coordinators/pr/PRCoordinator.ts](./src/coordinators/pr/PRCoordinator.ts)**
   - Main orchestrator - handles all PR events
   - Public API for other coordinators (future)
   - Event emission patterns

3. **[src/config/templates/discord-messages.json](./src/config/templates/discord-messages.json)**
   - Template definitions for all Discord messages
   - Variable substitution patterns
   - Customization point for non-developers

### Configuration Files:

- `.env.*` - Environment-specific configuration (gitignored, use examples)
- `config/user-mappings.json` - GitHub to Discord user mappings (gitignored)
- `ecosystem.config.js` - PM2 process management for dev/staging/prod

## Testing Strategy

This project has **110 comprehensive tests** across three levels:

### Test Distribution (80/15/5 Pyramid)

**Unit/Contract Tests (98 tests - 80%):**
- `GitHubService.test.ts` - Webhook verification, payload parsing
- `MessageTemplateService.test.ts` - Template rendering
- `StateService.test.ts` - State persistence (both in-memory and file-based)
- `UserMappingManager.test.ts` - User mapping logic
- `PRCoordinator.test.ts` - Black-box coordinator tests
- `githubPayloadParser.test.ts` - Payload extraction

**Integration Tests (6 tests - 15%):**
- `integration.test.ts` - GitHub webhook → Discord flow with mocked Discord service

**E2E Tests (6 scenarios - 5%):**
- `e2e.test.ts` - Complete PR lifecycles with all state transitions

### Testing Commands

```bash
# Run all tests
yarn test

# Run with coverage
yarn test:coverage

# Run specific test file
yarn test GitHubService.test.ts

# Watch mode
yarn test:watch
```

### Testing Philosophy

- ✅ **Black-box only** - test public APIs, not implementation
- ✅ **Mock external dependencies** - Discord, GitHub services
- ✅ **Test contracts** - verify behavior, not how it works
- ❌ **Never test private methods** - implementation details
- ❌ **Never access internal state** - use public getters

## Deployment Context

### Current Deployment

- **Environment:** Windows 10/11 machine (24/7)
- **Process Manager:** PM2 with Windows Task Scheduler auto-start
- **Tunnel:** CloudFlare Tunnel (public webhook endpoint)
- **Environments:** Dev (3000), Staging (3001), Production (3002)

### Deployment Files

- `DEPLOYMENT.md` - Complete deployment guide
- `DEPLOYMENT_CHECKLIST.md` - Pre-deployment checklist
- `ecosystem.config.js` - PM2 configuration for all environments

### Important Deployment Notes

1. **State Persistence:** Uses file-based storage (`data/pr-state.json`)
2. **User Mappings:** Must be configured per environment (`config/user-mappings.json`)
3. **Discord Tokens:** Environment-specific bot tokens required
4. **GitHub Webhooks:** Each environment needs separate webhook URLs

## Common Tasks for AI Agents

### Adding a New Discord Message Template

1. Edit `src/config/templates/discord-messages.json`
2. Add template with variable placeholders: `{{variableName}}`
3. Document available variables in `_available_variables` field
4. Use `MessageTemplateService.render()` to render in code
5. **No code changes needed** - just restart the bot

### Adding a New PR Event Handler

1. Add method to `PRCoordinator`: `handleNewEvent(payload: GitHubWebhookPayload)`
2. Extract data using `githubPayloadParser`
3. Delegate to appropriate managers
4. Update Discord message/thread via `DiscordService`
5. Add black-box tests in `PRCoordinator.test.ts`
6. Add integration test in `integration.test.ts`
7. Document in `E2E_TESTING.md`

### Modifying Discord Message Format

1. **Option A (Recommended):** Edit `src/config/templates/discord-messages.json`
2. **Option B (Code Changes):** Modify `NotificationManager.ts`
   - Update `prepareDiscordContent()` method
   - Add tests to verify new format
   - Update template to match

### Adding a New User Mapping

1. Enable Developer Mode in Discord (Settings → Advanced)
2. Right-click user → Copy ID
3. Add to `config/user-mappings.json`: `"github-username": "discord-id"`
4. Restart bot (or wait for hot-reload if implemented)

## Common Pitfalls to Avoid

### ❌ Don't Do This:

1. **Breaking file size limits**
   - `PRCoordinator.ts` is near the limit - split into more managers if adding features

2. **Testing implementation details**
   ```typescript
   // ❌ WRONG - accessing private state
   expect(coordinator.stores.pr.currentState).toBe(...);
   
   // ✅ CORRECT - testing public API
   expect(coordinator.getPRStatus(123)).toBe('approved');
   ```

3. **Public setters for state**
   ```typescript
   // ❌ WRONG - direct state mutation
   coordinator.setPRStatus(123, 'approved');
   
   // ✅ CORRECT - action methods with business logic
   coordinator.handleReviewSubmitted(payload);
   ```

4. **Coordinator calling services directly**
   ```typescript
   // ❌ WRONG - coordinator shouldn't call Discord directly
   await this.discordService.sendMessage(...);
   
   // ✅ CORRECT - delegate to manager
   await this.managers.notification.sendNotification(...);
   ```

5. **Creating progress/status files**
   - ❌ `TASK_COMPLETE.md`, `PROGRESS.md`, `STATUS.md`
   - ✅ Communicate progress in conversation only

### ✅ Best Practices:

1. **Ask questions first** - don't assume requirements
2. **Read architecture docs** - understand patterns before coding
3. **Write tests first** - black-box contract tests
4. **Keep files small** - split at 400-500 lines
5. **Use dependency injection** - inject all dependencies via constructor
6. **Follow naming conventions** - see `AGENTS_TYPESCRIPT.md`

## Future Extensibility

This project was designed with three key extensibility points (see `docs/DISCORD_PR_BOT_ARCHITECTURE.md` for details):

### 1. Abstract Ticketing System
- **Current:** N/A (ticket validation not yet implemented)
- **Future:** GitHub Issues, Jira, Linear
- **Interface:** `ITicketingService` (not yet created)
- **How to add:** Implement interface, change config

### 2. Customizable Messaging
- **Current:** ✅ Implemented via JSON templates
- **Customization:** Edit `src/config/templates/discord-messages.json`
- **No code changes needed**

### 3. Multi-Channel Broadcasting
- **Current:** Discord only
- **Future:** Email, Slack, Microsoft Teams
- **Interface:** `INotificationChannel` (not yet created)
- **How to add:** Implement interface, add to `EventBroadcaster`

## Environment Variables

Required environment variables (see `.env.example` files):

```bash
# Server
PORT=3000
NODE_ENV=development  # or staging, production

# GitHub
GITHUB_WEBHOOK_SECRET=your-secret-here

# Discord
DISCORD_BOT_TOKEN=your-token-here
DISCORD_CHANNEL_ID=your-channel-id-here

# State Storage
STATE_STORAGE_TYPE=file  # or 'memory'
STATE_FILE_PATH=./data/pr-state.json

# User Mappings (optional)
USER_MAPPINGS_PATH=./config/user-mappings.json

# Logging
LOG_LEVEL=info  # debug, info, warn, error
```

## Useful Commands

```bash
# Development
yarn dev                    # Start dev server
yarn dev:watch              # Start with auto-reload

# Testing
yarn test                   # Run all tests
yarn test:coverage          # Run with coverage
yarn test:watch             # Watch mode

# Building
yarn build                  # Build TypeScript
yarn typecheck              # Type check only

# Linting/Formatting
yarn lint                   # Lint code
yarn format                 # Format code

# Production (PM2)
yarn start:pm2              # Start production server with PM2
yarn start:dev              # Start dev environment (port 3000)
yarn start:staging          # Start staging environment (port 3001)
yarn start:prod             # Start production environment (port 3002)

# Deployment
yarn deploy:dev             # Deploy to dev (build + PM2 restart)
yarn deploy:staging         # Deploy to staging
yarn deploy:prod            # Deploy to production
```

## Questions & Support

For architectural questions:
- See [docs/DISCORD_PR_BOT_ARCHITECTURE.md](./docs/DISCORD_PR_BOT_ARCHITECTURE.md)
- Reference root-level [AGENTS.md](../AGENTS.md), [AGENTS_TYPESCRIPT.md](../AGENTS_TYPESCRIPT.md), [ARCHITECTURE.md](../ARCHITECTURE.md)

For deployment questions:
- See [DEPLOYMENT.md](./DEPLOYMENT.md)

For testing questions:
- See [E2E_TESTING.md](./E2E_TESTING.md)

## Remember

This project is part of a larger repository with **isolated projects**. Do NOT:
- ❌ Create shared utilities outside this project folder
- ❌ Reference code from other projects
- ❌ Create cross-project dependencies

Code duplication across projects is acceptable and expected.
