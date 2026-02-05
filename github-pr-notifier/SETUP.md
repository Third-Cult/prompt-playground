# Setup Guide

This guide walks you through setting up and testing the GitHub PR Notifier bot.

## Quick Start (Testing Without Secrets)

The bot can be fully tested without any production secrets using mocked services.

### Step 1: Install Dependencies

```bash
cd github-pr-notifier
yarn install
```

### Step 2: Run Tests

```bash
yarn test
```

You should see **98 tests passing**. This validates:
- ✅ All business logic works correctly
- ✅ GitHub webhook signature verification
- ✅ Discord message formatting
- ✅ State persistence (memory and file)
- ✅ User mapping logic

### Step 3: Start Server (Webhook-Only Mode)

```bash
# Create minimal .env
echo "PORT=3000" > .env
echo "GITHUB_WEBHOOK_SECRET=test-secret-123" >> .env
echo "STATE_STORAGE_TYPE=memory" >> .env

# Start server
yarn dev
```

Server starts in webhook-only mode (Discord not configured). Check output:

```
[INFO] Starting GitHub PR Notifier...
[INFO] Configuration validated
[INFO] Server listening on port 3000
[WARN] Discord not configured - running in webhook-only mode
```

### Step 4: Test Health Endpoint

```bash
# In another terminal
curl http://localhost:3000/health
```

Expected:
```json
{
  "status": "healthy",
  "uptime": 12.34,
  "timestamp": "2026-02-05T..."
}
```

### Step 5: Send Mock Webhook

```bash
node test-webhook.js
```

Expected output:
```
Success: { received: true }
```

Server logs:
```
[INFO] Received GitHub webhook: pull_request
[DEBUG] Processing webhook event: pull_request
```

**✅ If all 5 steps pass, Phase 1 & 2 are working correctly!**

---

## Production Setup

### Prerequisites

1. **Discord Bot**:
   - Create bot at https://discord.com/developers/applications
   - Copy bot token
   - Invite bot to your server with permissions:
     - Send Messages
     - Send Messages in Threads
     - Manage Threads
     - Embed Links
     - Add Reactions

2. **Discord Channel ID**:
   - Enable Developer Mode (Settings → Advanced → Developer Mode)
   - Right-click channel → Copy ID

3. **GitHub Webhook**:
   - Go to repo Settings → Webhooks → Add webhook
   - Payload URL: `https://your-server.com/webhook/github`
   - Content type: `application/json`
   - Secret: Generate a secure random string
   - Events: Pull requests, Pull request reviews

4. **User Mappings** (Optional):
   - Map GitHub usernames to Discord user IDs
   - Edit `config/user-mappings.json`

### Configuration

#### 1. Environment Variables

Create `.env` file:

```bash
# Server
PORT=3000
NODE_ENV=production

# GitHub
GITHUB_WEBHOOK_SECRET=your-github-webhook-secret

# Discord
DISCORD_BOT_TOKEN=your-discord-bot-token
DISCORD_CHANNEL_ID=your-channel-id

# State Storage
STATE_STORAGE_TYPE=file
STATE_FILE_PATH=./data/pr-state.json

# Logging
LOG_LEVEL=info
```

#### 2. User Mappings

Edit `config/user-mappings.json`:

```json
{
  "github-user-1": "123456789012345678",
  "github-user-2": "987654321098765432"
}
```

**To get Discord User IDs**:
1. Discord → Settings → Advanced → Developer Mode (enable)
2. Right-click user → Copy ID

#### 3. Build and Start

```bash
# Build
yarn build

# Start
yarn start
```

Or use PM2 for production:

```bash
# Install PM2 globally
npm install -g pm2

# Start with PM2
pm2 start dist/index.js --name github-pr-notifier

# Save PM2 config
pm2 save

# Set up auto-start on boot
pm2 startup
```

---

## Deployment on Self-Hosted Runner

### Step 1: Install Dependencies on Runner

```bash
# On self-hosted runner
cd /opt  # Or your preferred location
git clone https://github.com/your-org/github-pr-notifier.git
cd github-pr-notifier

# Install Node.js (if not already installed)
# https://nodejs.org/

# Install dependencies
yarn install --frozen-lockfile

# Build
yarn build
```

### Step 2: Configure Environment

```bash
# Create .env file
nano .env

# Add your secrets (see Configuration section above)
```

### Step 3: Start with PM2

```bash
# Install PM2
npm install -g pm2

# Start bot
pm2 start dist/index.js --name github-pr-notifier

# Check status
pm2 status

# View logs
pm2 logs github-pr-notifier

# Save PM2 config
pm2 save

# Set up auto-start on boot
pm2 startup
```

### Step 4: Set Up Tunnel (for GitHub Webhooks)

If your runner is behind a firewall, use a tunnel:

```bash
# Option 1: ngrok
ngrok http 3000

# Option 2: CloudFlare Tunnel
cloudflared tunnel --url http://localhost:3000

# Option 3: GitHub's built-in forwarding (if using GitHub-hosted runner)
# Use the runner's public IP
```

Copy the public URL and use it for GitHub webhook setup.

### Step 5: Configure GitHub Webhook

1. Go to GitHub repo → Settings → Webhooks → Add webhook
2. Payload URL: `https://your-tunnel-url.com/webhook/github`
3. Content type: `application/json`
4. Secret: (your `GITHUB_WEBHOOK_SECRET`)
5. Events: Select individual events:
   - ✅ Pull requests
   - ✅ Pull request reviews
   - ✅ Pull request review comments
6. Active: ✅ Check

### Step 6: Test End-to-End

1. Open a PR in your GitHub repo
2. Check Discord channel for message
3. Verify thread was created
4. Check PM2 logs: `pm2 logs github-pr-notifier`

---

## Troubleshooting

### Bot doesn't start

**Check logs**:
```bash
# PM2 logs
pm2 logs github-pr-notifier

# Or if running directly
yarn dev
```

**Common issues**:
- Missing required environment variables
- Invalid Discord bot token
- Discord bot not invited to server
- Port already in use

### Webhooks not received

**Check**:
1. Webhook delivery logs in GitHub (Settings → Webhooks → Recent Deliveries)
2. Verify payload URL is accessible from GitHub
3. Check signature verification (look for 401 errors in logs)
4. Verify webhook secret matches `.env`

### Messages not appearing in Discord

**Check**:
1. Bot has permissions in channel (Send Messages, Manage Threads)
2. Channel ID is correct (enable Developer Mode to copy ID)
3. Bot is online in Discord
4. Check Discord service errors in logs

### State not persisting

**Check**:
1. `STATE_STORAGE_TYPE=file` in `.env`
2. `data/` directory exists and is writable
3. Check file permissions
4. Check disk space

---

## Monitoring

### Check Bot Status

```bash
# PM2 status
pm2 status

# PM2 detailed info
pm2 info github-pr-notifier

# Restart bot
pm2 restart github-pr-notifier

# Stop bot
pm2 stop github-pr-notifier
```

### Health Check

```bash
curl http://localhost:3000/health
```

### View Logs

```bash
# PM2 logs (live tail)
pm2 logs github-pr-notifier

# PM2 logs (last 100 lines)
pm2 logs github-pr-notifier --lines 100

# Direct log files (if configured)
tail -f logs/combined.log
```

---

## Updating the Bot

```bash
# On self-hosted runner
cd /opt/github-pr-notifier

# Pull latest changes
git pull origin main

# Install new dependencies
yarn install --frozen-lockfile

# Rebuild
yarn build

# Restart with zero-downtime
pm2 reload github-pr-notifier
```

---

## Security Best Practices

### 1. Protect Secrets

- ✅ Never commit `.env` file to git
- ✅ Use strong webhook secrets (32+ random characters)
- ✅ Rotate secrets periodically
- ✅ Restrict file permissions on `.env` (chmod 600)

### 2. Validate Webhooks

- ✅ Always verify webhook signatures (enabled by default)
- ✅ Monitor for failed signature attempts
- ✅ Rate limit webhook endpoint if needed

### 3. Limit Bot Permissions

- ✅ Only grant Discord permissions bot actually needs
- ✅ Use read-only GitHub tokens if querying API
- ✅ Run bot as non-root user

### 4. Monitor Access

- ✅ Review GitHub webhook delivery logs regularly
- ✅ Monitor bot logs for suspicious activity
- ✅ Set up alerts for errors

---

## FAQ

### Can I run multiple bots for different repos?

Yes! Run multiple instances with different configs:

```bash
# Bot for repo-1
PORT=3000 DISCORD_CHANNEL_ID=channel-1 pm2 start dist/index.js --name bot-repo-1

# Bot for repo-2
PORT=3001 DISCORD_CHANNEL_ID=channel-2 pm2 start dist/index.js --name bot-repo-2
```

### What happens if the bot is offline?

GitHub will retry webhook deliveries for up to 3 days. When bot comes back online, it will process missed webhooks.

### Can I customize message formatting?

Yes! Edit `src/config/templates/discord-messages.json` and rebuild. See [DISCORD_PR_BOT_ARCHITECTURE.md](../DISCORD_PR_BOT_ARCHITECTURE.md) for template documentation.

### How do I add a new GitHub ↔ Discord user mapping?

Edit `config/user-mappings.json`, add the mapping, and restart the bot (`pm2 restart github-pr-notifier`).

---

## Getting Help

### Logs to Check

1. **Application logs**: `pm2 logs github-pr-notifier`
2. **GitHub webhook deliveries**: GitHub repo → Settings → Webhooks → Recent Deliveries
3. **Discord bot status**: Discord Developer Portal → Your App → Bot

### Useful Commands

```bash
# Check if bot is running
pm2 status

# Restart bot
pm2 restart github-pr-notifier

# View detailed logs
pm2 logs github-pr-notifier --lines 100

# Check configuration
pm2 env github-pr-notifier

# Test health endpoint
curl http://localhost:3000/health
```
