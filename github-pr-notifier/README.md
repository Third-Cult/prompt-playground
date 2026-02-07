# GitHub PR Notifier

A webhook server that automatically posts GitHub Pull Request notifications to Discord with threaded discussions.

## Current Status

**Phase 1: Foundation** ✅ Complete  
**Phase 2: PR Creation** ✅ Complete  
**Phase 3: Status Management** ✅ Complete  
**Phase 4: Reviewer Management** ✅ Complete  
**Phase 5: E2E Testing** ✅ Complete  
**Phase 6: Production Deployment** ✅ Complete  
**Phase 7: Multi-Environment Setup** ✅ Complete

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
- ✅ Handle PR reopened (unlocks thread, recalculates status)
- ✅ Automatic thread locking on close/merge
- ✅ Status-specific colors and emojis

#### Phase 4: Reviewer Management
- ✅ Handle reviewer add/remove events
- ✅ Add/remove reviewers from Discord thread
- ✅ Track thread members for cleanup
- ✅ Update parent message when reviewers change
- ✅ Handle review submissions (approved, changes requested)
- ✅ Handle review dismissals
- ✅ Emoji reactions for review states (✅ approved, 🔴 changes requested)
- ✅ Status priority: changes_requested > approved

#### Phase 5: E2E Testing
- ✅ Comprehensive automated test suite (6 scenarios, 110 tests total)
- ✅ Tests complete PR lifecycle without external dependencies
- ✅ Black-box testing of all webhook → Discord flows
- ✅ Zero-downtime testing (runs in 4 seconds)

#### Phase 6: Production Deployment
- ✅ PM2 process management configuration
- ✅ Enhanced health check endpoint with monitoring
- ✅ Tunnel setup guides (CloudFlare/ngrok)
- ✅ Comprehensive production documentation
- ✅ Deployment scripts and automation
- ✅ Monitoring and alerting guides
- ✅ Troubleshooting documentation

#### Phase 7: Multi-Environment Setup
- ✅ Dev/Staging/Production environment configuration
- ✅ Simultaneous multi-environment support (ports 3000/3001/3002)
- ✅ Environment-specific .env files
- ✅ PM2 multi-app configuration
- ✅ Git branching strategy (dev → staging → main)
- ✅ Environment-specific scripts (start:dev, deploy:staging, etc.)
- ✅ Complete deployment workflow documentation
- ✅ Per-environment testing strategies

#### Phase 8 & 9: Authentication & PR Recovery
- ✅ Automatic PR recovery from GitHub API when state is missing
- ✅ Handles bot downtime, state loss, and webhook failures
- ✅ Personal Access Token (PAT) support for simple authentication
- ✅ GitHub App authentication support (recommended for production)
- ✅ Organization-owned authentication (not tied to individual users)
- ✅ Installation-based access control (only repos where app is installed)
- ✅ Auto-refreshing tokens with better security
- ✅ Comprehensive tests for recovery and auth scenarios
- ✅ See [AUTHENTICATION.md](./AUTHENTICATION.md) for complete setup guide

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

# GitHub Authentication (Optional - enables PR recovery)
# Choose ONE: Personal Access Token OR GitHub App
# See AUTHENTICATION.md for detailed setup guide

# Option A: Personal Access Token (simple - good for dev/personal projects)
GITHUB_TOKEN=your-github-personal-access-token-here

# Option B: GitHub App (recommended for production)
# GITHUB_APP_ID=123456
# GITHUB_APP_INSTALLATION_ID=12345678
# GITHUB_APP_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----"

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

## Production Deployment

### Single Environment Setup

See **[QUICKSTART.md](./QUICKSTART.md)** for a step-by-step guide to deploy production.

### Multi-Environment Setup (Dev/Staging/Prod)

See **[MULTI_ENV_QUICKSTART.md](./MULTI_ENV_QUICKSTART.md)** to run development, staging, and production simultaneously.

### With PM2 (Recommended)

```bash
# Build
yarn build

# Start with PM2
yarn start:pm2

# View status
pm2 status

# View logs
pm2 logs github-pr-notifier

# Monitoring dashboard
pm2 monit
```

### Manual Start

```bash
# Build
yarn build

# Start server
yarn start
```

### Documentation

- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Complete deployment guide (single & multi-environment)
- **[AUTHENTICATION.md](./AUTHENTICATION.md)** - GitHub authentication setup (PAT & GitHub App)
- **[DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md)** - Pre-deployment checklist
- **[E2E_TESTING.md](./E2E_TESTING.md)** - Automated testing guide (122 tests)

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

**122 tests, 100% passing**

#### Unit Tests (110 tests)
- **GitHubService**: Webhook signature verification, payload parsing, API integration (21 tests)
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

#### E2E Tests (6 comprehensive scenarios)
- **Complete PR Lifecycle Testing**: Automated scenarios testing all functionality
  - Simple PR lifecycle (Open → Approve → Merge)
  - Changes requested flow
  - Reviewer management
  - Complex status transitions (Draft → Ready → Close → Reopen)
  - Multiple reviewers with conflicts
  - Review dismissal

The integration and E2E tests use **mocked Discord service** to verify the entire webhook-to-notification flow without requiring a live Discord bot.

All tests follow **black-box contract testing** principles - they test public APIs without accessing internal implementation.

See **[E2E_TESTING.md](./E2E_TESTING.md)** for detailed testing documentation.

## API Endpoints

### Health Check

```
GET /health

Response:
{
  "status": "healthy",
  "uptime": 123.45,
  "timestamp": "2026-02-05T12:00:00.000Z",
  "version": "1.0.0",
  "node_version": "v20.11.0",
  "memory": {
    "rss_mb": 120,
    "heap_used_mb": 45,
    "heap_total_mb": 80
  },
  "services": {
    "state_storage": "file",
    "pr_count": 5
  }
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

This runs **122 comprehensive tests** that verify all logic with mocked services.

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

## Production Deployment Status

✅ **Ready for Production**

All core functionality implemented and tested:
- Full PR lifecycle support
- Reviewer management
- Review activity tracking
- PR recovery from GitHub API
- GitHub App & PAT authentication
- Automated E2E testing (122 tests)
- Production deployment guides
- Monitoring and health checks

### Getting Started

1. **Quick setup**: Follow deployment steps in [DEPLOYMENT.md](./DEPLOYMENT.md)
2. **Authentication**: Setup GitHub access in [AUTHENTICATION.md](./AUTHENTICATION.md)
3. **Pre-deployment**: Review [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md)
4. **Testing**: See [E2E_TESTING.md](./E2E_TESTING.md)

---

## Future Enhancement Ideas

Potential future features (not currently planned):

- **Ticketing Integration**: Link PRs to GitHub Issues with validation
- **Enhanced Customization**: More template variables, per-repo configs
- **Multi-Channel Broadcasting**: Abstract notification channels for email, etc.
- **Team Reviewers**: Support for GitHub team reviewer requests
- **PR Labels**: Display labels in Discord messages
- **Metrics & Analytics**: Dashboard for PR statistics

See [DISCORD_PR_BOT_ARCHITECTURE.md](../DISCORD_PR_BOT_ARCHITECTURE.md) for architectural details.

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
