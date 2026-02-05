# GitHub PR Notifier

A webhook server that automatically posts GitHub Pull Request notifications to Discord with threaded discussions.

## Current Status

**Phase 1: Foundation** ✅ Complete  
**Phase 2: PR Creation** ✅ Complete  
**Phase 3: Status Management** ✅ Complete

### Features Implemented

#### Phase 1: Foundation
- ✅ Express webhook server with GitHub signature verification
- ✅ GitHubService (webhook verification and parsing)
- ✅ StateService (in-memory and file-based implementations)
- ✅ MessageTemplateService (JSON template loading and rendering)
- ✅ Comprehensive test suite (black-box contract tests)
- ✅ Configuration management (.env support)
- ✅ Structured logging
- ✅ Health check endpoint

#### Phase 2: PR Creation
- ✅ Discord service integration (discord.js)
- ✅ PRCoordinator (handles PR opened events)
- ✅ Discord message creation with embeds
- ✅ Thread creation and management
- ✅ User mapping (GitHub → Discord usernames)
- ✅ NotificationManager (prepares Discord content)
- ✅ Full end-to-end: GitHub webhook → Discord message + thread

#### Phase 3: Status Management
- ✅ Handle PR converted to draft (updates message status)
- ✅ Handle PR ready for review (updates message status)
- ✅ Handle PR closed (updates message, posts to thread, locks thread)
- ✅ Handle PR merged (updates message, posts to thread, locks thread)
- ✅ Automatic thread locking on close/merge
- ✅ Status-specific colors and emojis

## Architecture

Following clean architecture patterns:

- **Services**: Interface-based abstractions (GitHub, State, Templates)
- **Models**: Type-safe data models (PRState, Review, etc.)
- **Webhooks**: Express server with middleware (signature verification, error handling)
- **Config**: Centralized configuration from environment variables
- **Utils**: Logging and helper utilities

See [DISCORD_PR_BOT_ARCHITECTURE.md](../DISCORD_PR_BOT_ARCHITECTURE.md) for detailed architecture documentation.

## Prerequisites

- Node.js v20.x or later
- Yarn package manager
- GitHub repository with webhook access
- Discord bot (for Phase 2+)

## Installation

```bash
# Install dependencies
yarn install

# Build TypeScript
yarn build
```

## Configuration

### 1. Create `.env` file

Copy from `.env.example` and fill in your values:

```bash
# Server Configuration
PORT=3000
NODE_ENV=development

# GitHub Configuration
GITHUB_WEBHOOK_SECRET=your-webhook-secret-here

# Discord Configuration
DISCORD_BOT_TOKEN=your-discord-bot-token-here
DISCORD_CHANNEL_ID=your-channel-id-here

# State Storage
STATE_STORAGE_TYPE=file  # or 'memory'
STATE_FILE_PATH=./data/pr-state.json

# User Mappings (optional)
# USER_MAPPINGS_PATH=./config/user-mappings.json

# Logging
LOG_LEVEL=info  # debug, info, warn, error
```

### 2. Configure User Mappings

Edit `config/user-mappings.json` to map GitHub usernames to Discord user IDs:

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

**Note**: If a GitHub username is not mapped, the bot will fall back to `@github-username` instead of a Discord mention.

## Development

```bash
# Run in development mode (with ts-node)
yarn dev

# Run with auto-reload
yarn dev:watch

# Run tests
yarn test

# Run tests with coverage
yarn test:coverage

# Lint code
yarn lint

# Format code
yarn format

# Type check
yarn typecheck
```

## Production

```bash
# Build
yarn build

# Start server
yarn start
```

## Testing

Run the test suite:

```bash
# Run all tests
yarn test

# Run tests in watch mode
yarn test:watch

# Run with coverage
yarn test:coverage
```

### Test Coverage

**104 tests, 100% passing** (1 skipped)

#### Unit Tests (98 tests)
- **GitHubService**: Webhook signature verification, payload parsing (9 tests)
- **MessageTemplateService**: Template loading, variable substitution (17 tests)
- **InMemoryStateService**: CRUD operations, reverse lookups (18 tests)
- **FileStateService**: Persistence, initialization, cleanup (14 tests)
- **UserMappingManager**: User mapping, mention formatting (12 tests)
- **PRCoordinator**: PR lifecycle, Discord integration (12 tests)
- **GitHubPayloadParser**: Payload extraction, event detection (16 tests)

#### Integration Tests (6 tests)
- **GitHub Webhook → Discord Flow**: End-to-end tests verifying complete flow
  - PR opened with reviewers
  - Draft PR handling
  - No reviewers warning
  - Unmapped users fallback
  - Non-PR events
  - State persistence

The integration tests use **mocked Discord service** to verify the entire webhook-to-notification flow without requiring a live Discord bot.

All tests follow **black-box contract testing** principles - they test public APIs without accessing internal implementation.

## API Endpoints

### Health Check

```
GET /health

Response:
{
  "status": "healthy",
  "uptime": 123.45,
  "timestamp": "2026-02-04T12:00:00.000Z"
}
```

### GitHub Webhook

```
POST /webhook/github

Headers:
- X-GitHub-Event: pull_request
- X-GitHub-Delivery: <delivery-id>
- X-Hub-Signature-256: sha256=<signature>

Body: GitHub webhook payload (JSON)

Response:
{
  "received": true
}
```

## Project Structure

```
src/
├── coordinators/
│   └── pr/
│       ├── PRCoordinator.ts              # PR lifecycle orchestrator
│       ├── PRCoordinator.test.ts
│       └── managers/
│           ├── NotificationManager.ts    # Notification formatting
│           ├── UserMappingManager.ts     # GitHub ↔ Discord mapping
│           └── UserMappingManager.test.ts
├── config/
│   ├── config.ts                         # Centralized configuration
│   └── templates/
│       └── discord-messages.json         # Message templates
├── models/
│   └── PRState.ts                        # Data models
├── services/
│   ├── discord/
│   │   ├── DiscordService.ts             # Discord API integration
│   │   └── interfaces/
│   │       └── IDiscordService.ts
│   ├── github/
│   │   ├── GitHubService.ts              # GitHub webhook handling
│   │   ├── GitHubService.test.ts
│   │   └── interfaces/
│   ├── state/
│   │   ├── InMemoryStateService.ts
│   │   ├── FileStateService.ts
│   │   ├── *.test.ts
│   │   └── interfaces/
│   └── templates/
│       ├── MessageTemplateService.ts
│       ├── MessageTemplateService.test.ts
│       └── interfaces/
├── utils/
│   ├── logger.ts                         # Logging utility
│   ├── githubPayloadParser.ts            # Webhook payload parsing
│   └── githubPayloadParser.test.ts
├── webhooks/
│   ├── server.ts                         # Express server setup
│   ├── routes.ts                         # Webhook routes
│   └── middleware/
│       ├── verifySignature.ts            # Signature verification
│       └── errorHandler.ts               # Error handling
└── index.ts                              # Application entry point
```

## Testing Without Production Secrets

You can fully test the bot without real GitHub webhooks or Discord:

### 1. Run Automated Tests (No Secrets Needed)

```bash
yarn test
```

This runs **98 comprehensive tests** that verify all logic with mocked services.

### 2. Start Server in Webhook-Only Mode

```bash
# No Discord tokens needed
echo "PORT=3000" > .env
echo "GITHUB_WEBHOOK_SECRET=test-secret" >> .env
echo "STATE_STORAGE_TYPE=memory" >> .env

yarn dev
```

Server starts in webhook-only mode (logs warning about Discord not configured).

### 3. Send Mock GitHub Webhooks

Use the included `test-webhook.js` script:

```bash
# Start server in one terminal
yarn dev

# In another terminal, send mock webhook
node test-webhook.js
```

Server will receive and process the webhook (Discord calls will be skipped if not configured).

### 4. Test With Real Discord (When Ready)

Once you have:
- Discord bot token
- Discord channel ID
- GitHub webhook secret

Add them to `.env` and the bot will post to Discord on PR events.

---

## Next Steps: Future Phases

### Phase 3: Status Management
- [ ] Handle PR status changes (draft toggle, ready for review)
- [ ] Handle PR closed/merged events
- [ ] Thread locking and member cleanup

### Phase 4: Reviewer Management
- [ ] Handle reviewer add/remove events
- [ ] Thread member management
- [ ] Update messages when reviewers change

### Phase 5: Review Activity
- [ ] Handle review submissions (approved, changes requested)
- [ ] Post review comments to thread
- [ ] Add reactions to parent message
- [ ] Track review state

See [DISCORD_PR_BOT_ARCHITECTURE.md](../DISCORD_PR_BOT_ARCHITECTURE.md) for the full implementation plan.

## Contributing

This project follows strict architectural guidelines:

- **Single Responsibility**: Each class/service does one thing well
- **Dependency Injection**: Dependencies injected via constructors
- **Interface-Based**: All services implement interfaces
- **Black-Box Testing**: Test public contracts, not implementation
- **File Size Limits**: Max 500 lines per file
- **TypeScript Strict Mode**: Full type safety

See [AGENTS.md](../AGENTS.md) for coding guidelines.

## License

MIT
