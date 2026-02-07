# Deployment Guide

Complete guide for deploying GitHub PR Notifier from scratch or with existing prerequisites.

**🆕 Fresh machine?** Start with [Prerequisites & Setup](#prerequisites--setup) (45-60 min total).

**⚡ Already have prerequisites?** Skip to [Quick Start](#quick-start-single-environment) (15 min).

---

## Table of Contents

1. [Prerequisites & Setup](#prerequisites--setup) *(Skip if you already have tools installed)*
   - [Install Development Tools](#install-development-tools)
   - [Create Discord Bot](#create-discord-bot)
   - [Clone Repository](#clone-repository)
2. [Quick Start (Single Environment)](#quick-start-single-environment)
3. [Multi-Environment Setup](#multi-environment-setup)
4. [CloudFlare Tunnel Setup](#cloudflare-tunnel-setup)
5. [GitHub Webhook Configuration](#github-webhook-configuration)
6. [Monitoring & Maintenance](#monitoring--maintenance)
7. [Troubleshooting](#troubleshooting)

---

## Prerequisites & Setup

*Skip this section if you already have Git, Node.js, Yarn, PM2, CloudFlare Tunnel, and a Discord bot configured.*

### Install Development Tools

#### 1. Install Git (5 min)

<details>
<summary><b>Windows</b></summary>

```bash
# Download and install from:
https://git-scm.com/download/win

# Or use winget:
winget install Git.Git

# Verify installation:
git --version
# Should show: git version 2.x.x
```
</details>

<details>
<summary><b>Mac</b></summary>

```bash
# Install Homebrew first (if not installed):
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install Git:
brew install git

# Verify:
git --version
```
</details>

<details>
<summary><b>Linux (Ubuntu/Debian)</b></summary>

```bash
sudo apt update
sudo apt install git -y
git --version
```
</details>

#### 2. Install Node.js v20+ (5 min)

<details>
<summary><b>Windows</b></summary>

```bash
# Download and install from:
https://nodejs.org/en/download/

# Or use winget:
winget install OpenJS.NodeJS.LTS

# Verify installation:
node --version  # Should show: v20.x.x or higher
npm --version   # Should show: 10.x.x or higher
```
</details>

<details>
<summary><b>Mac</b></summary>

```bash
# Using Homebrew:
brew install node@20

# Verify:
node --version
npm --version
```
</details>

<details>
<summary><b>Linux (Ubuntu/Debian)</b></summary>

```bash
# Install via NodeSource:
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify:
node --version
npm --version
```
</details>

#### 3. Install Yarn (2 min)

```bash
# Install Yarn globally using npm:
npm install -g yarn

# Verify installation:
yarn --version
# Should show: 1.22.x or higher
```

#### 4. Install PM2 (2 min)

```bash
# Install PM2 globally:
npm install -g pm2

# Verify installation:
pm2 --version
# Should show: 5.x.x or higher
```

#### 5. Install CloudFlare Tunnel (5 min)

<details>
<summary><b>Windows</b></summary>

```bash
# Download from:
https://github.com/cloudflare/cloudflared/releases

# Download cloudflared-windows-amd64.exe
# Rename to cloudflared.exe
# Move to C:\Windows\System32\ (or add to PATH)

# Verify:
cloudflared --version
```
</details>

<details>
<summary><b>Mac</b></summary>

```bash
# Using Homebrew:
brew install cloudflared

# Verify:
cloudflared --version
```
</details>

<details>
<summary><b>Linux</b></summary>

```bash
# Download and install:
wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64
sudo mv cloudflared-linux-amd64 /usr/local/bin/cloudflared
sudo chmod +x /usr/local/bin/cloudflared

# Verify:
cloudflared --version
```
</details>

---

### Create Discord Bot

#### Step 1: Create Bot Application (10 min)

1. **Go to Discord Developer Portal**: https://discord.com/developers/applications
   - Click "New Application"
   - Name it: "GitHub PR Notifier"
   - Click "Create"

2. **Create Bot User**:
   - In left sidebar, click "Bot"
   - Click "Add Bot" → "Yes, do it!"
   - Under "Privileged Gateway Intents":
     - ✅ Enable "SERVER MEMBERS INTENT"
     - ✅ Enable "MESSAGE CONTENT INTENT" (optional)
   - Click "Save Changes"

3. **Copy Bot Token**:
   - Click "Reset Token" → "Yes, do it!"
   - Copy the token (save it securely)
   - **⚠️ NEVER share this token publicly!**

4. **Invite Bot to Your Server**:
   - In left sidebar, click "OAuth2" → "URL Generator"
   - **Scopes**: Check `bot`
   - **Bot Permissions**: Check these:
     - ✅ Send Messages
     - ✅ Send Messages in Threads
     - ✅ Create Public Threads
     - ✅ Manage Threads
     - ✅ Embed Links
     - ✅ Add Reactions
     - ✅ Read Message History
   - Copy the generated URL and open in browser
   - Select your Discord server → "Authorize"

5. **Create Discord Channels** (for multi-environment):
   - Create three text channels:
     - `#pr-notifications-dev`
     - `#pr-notifications-staging`
     - `#pr-notifications` (production)

6. **Get Channel IDs**:
   - In Discord: Settings → Advanced → Enable "Developer Mode"
   - Right-click each channel → "Copy Channel ID"
   - Save these IDs for configuration

---

### Clone Repository

```bash
# Navigate to where you want the project:
cd ~  # Or C:\Users\YourName\ on Windows

# Clone the repository:
git clone https://github.com/your-username/prompt-playground.git

# Navigate to the bot directory:
cd prompt-playground/github-pr-notifier

# Verify you're in the right place:
ls  # Should see package.json, src/, etc.
```

---

## Quick Start (Single Environment)

Get production running in 15 minutes (assumes prerequisites installed above).

### Prerequisites Checklist

- ✅ Node.js v20+ installed
- ✅ Yarn installed
- ✅ PM2 installed
- ✅ CloudFlare Tunnel installed
- ✅ Discord bot created and invited to server
- ✅ Repository cloned

### Step 1: Install & Build (2 min)

```bash
cd github-pr-notifier
yarn install
yarn build
yarn test  # Verify everything works
```

### Step 2: Configure Environment (3 min)

Copy and edit `.env.production`:

```env
PORT=3002
NODE_ENV=production
GITHUB_WEBHOOK_SECRET=your-strong-secret-here
DISCORD_BOT_TOKEN=your-bot-token
DISCORD_CHANNEL_ID=your-channel-id
STATE_STORAGE_TYPE=file
STATE_FILE_PATH=./data/pr-state.production.json
USER_MAPPINGS_PATH=./config/user-mappings.json
LOG_LEVEL=info
```

Edit `config/user-mappings.json` with GitHub → Discord user ID mappings.

### Step 3: Start Application (1 min)

```bash
yarn start:prod
pm2 status  # Verify running
```

### Step 4: Setup Tunnel (3 min)

```bash
# Use token from CloudFlare dashboard
cloudflared tunnel run --token <your-token>
```

### Step 5: Configure GitHub Webhook (3 min)

In GitHub: Repo → Settings → Webhooks → Add webhook

- **Payload URL**: `https://your-tunnel-url/webhook/github`
- **Content type**: `application/json`
- **Secret**: Same as `GITHUB_WEBHOOK_SECRET`
- **Events**: Pull requests, Pull request reviews
- **Active**: ✅

### Step 6: Test (3 min)

```bash
# Health check
curl http://localhost:3002/health

# Create test PR, verify Discord notification
```

**Done!** Single environment production ready.

---

## Multi-Environment Setup

Run development, staging, and production simultaneously.

### Why Multi-Environment?

- **Development**: Safe experimentation without affecting production
- **Staging**: Realistic testing before release
- **Production**: Stable, live environment

### Quick Setup (10 min)

#### 1. Configure Three Environments (5 min)

Three `.env` files are already created:

**`.env.development`** (Port 3000):
```env
PORT=3000
NODE_ENV=development
GITHUB_WEBHOOK_SECRET=dev-your-secret
DISCORD_BOT_TOKEN=<your-token>
DISCORD_CHANNEL_ID=<dev-channel-id>  # #pr-notifications-dev
STATE_STORAGE_TYPE=memory
USER_MAPPINGS_PATH=./config/user-mappings.dev.json
LOG_LEVEL=debug
```

**`.env.staging`** (Port 3001):
```env
PORT=3001
NODE_ENV=staging
GITHUB_WEBHOOK_SECRET=staging-your-secret
DISCORD_BOT_TOKEN=<your-token>
DISCORD_CHANNEL_ID=<staging-channel-id>  # #pr-notifications-staging
STATE_STORAGE_TYPE=file
STATE_FILE_PATH=./data/pr-state.staging.json
USER_MAPPINGS_PATH=./config/user-mappings.staging.json
LOG_LEVEL=info
```

**`.env.production`** (Port 3002):
```env
PORT=3002
NODE_ENV=production
GITHUB_WEBHOOK_SECRET=production-your-secret
DISCORD_BOT_TOKEN=<your-token>
DISCORD_CHANNEL_ID=<production-channel-id>  # #pr-notifications
STATE_STORAGE_TYPE=file
STATE_FILE_PATH=./data/pr-state.production.json
USER_MAPPINGS_PATH=./config/user-mappings.json
LOG_LEVEL=info
```

#### 2. Start All Environments (2 min)

```bash
yarn build
yarn start:all
pm2 status  # Should see all 3 running
```

#### 3. Verify Health (1 min)

```bash
curl http://localhost:3000/health  # Dev
curl http://localhost:3001/health  # Staging
curl http://localhost:3002/health  # Production
```

### Environment Isolation

| Environment | Port | Channel | Storage | Branch | Purpose |
|-------------|------|---------|---------|--------|---------|
| **Dev** | 3000 | #pr-notifications-dev | Memory | `dev` | Active development |
| **Staging** | 3001 | #pr-notifications-staging | File | `staging` | Pre-production testing |
| **Production** | 3002 | #pr-notifications | File | `main` | Live production |

### Typical Workflow

```bash
# 1. Develop on dev branch
git checkout dev
# ... make changes ...
yarn deploy:dev

# 2. Test in dev environment
# Create test PR, verify in #pr-notifications-dev

# 3. Promote to staging
git checkout staging
git merge dev
yarn deploy:staging

# 4. Test in staging (24-48 hours)
# Verify in #pr-notifications-staging

# 5. Release to production
git checkout main
git merge staging
git tag v1.x.x
yarn deploy:prod

# 6. Monitor production
yarn logs:prod
```

---

## CloudFlare Tunnel Setup

### Option 1: Single Tunnel for All Environments (Easiest)

If you have a tunnel configured in CloudFlare dashboard with multiple public hostnames:

**Run the tunnel** (use token from dashboard):
```bash
cloudflared tunnel run --token <your-token-from-dashboard>
```

**Or install as Windows service** (runs in background):
```bash
cloudflared.exe service install <your-token>
```

**Verify**:
```bash
curl https://pr-bot-dev.poggers.app/health
curl https://pr-bot-staging.poggers.app/health
curl https://pr-bot.poggers.app/health
```

### Option 2: Quick Testing Tunnels

For quick testing without persistent URLs:

```bash
# Dev
cloudflared tunnel --url http://localhost:3000

# Staging (another terminal)
cloudflared tunnel --url http://localhost:3001

# Production (another terminal)
cloudflared tunnel --url http://localhost:3002
```

Copy the generated URLs for GitHub webhook configuration.

### CloudFlare Dashboard Configuration

In CloudFlare Zero Trust → Access → Tunnels → Your Tunnel:

Add public hostnames:
1. **pr-bot-dev.poggers.app** → `http://localhost:3000`
2. **pr-bot-staging.poggers.app** → `http://localhost:3001`
3. **pr-bot.poggers.app** → `http://localhost:3002`

---

## GitHub Webhook Configuration

### Single Environment

Create one webhook:
- **URL**: `https://your-tunnel-url/webhook/github`
- **Secret**: From `.env.production`
- **Events**: Pull requests, Pull request reviews

### Multi-Environment

Create three webhooks with different secrets:

**Dev Webhook**:
- **URL**: `https://pr-bot-dev.poggers.app/webhook/github`
- **Secret**: From `.env.development`

**Staging Webhook**:
- **URL**: `https://pr-bot-staging.poggers.app/webhook/github`
- **Secret**: From `.env.staging`

**Production Webhook**:
- **URL**: `https://pr-bot.poggers.app/webhook/github`
- **Secret**: From `.env.production`

**All webhooks need**:
- Content type: `application/json`
- SSL verification: Enabled
- Events: Pull requests, Pull request reviews
- Active: ✅

---

## PM2 Commands Reference

### Single Environment

```bash
yarn start:pm2      # Start production
pm2 logs github-pr-notifier
pm2 restart github-pr-notifier
```

### Multi-Environment

```bash
# Start
yarn start:dev / start:staging / start:prod / start:all

# Logs
yarn logs:dev / logs:staging / logs:prod

# Restart
yarn restart:dev / restart:staging / restart:prod

# Deploy (pull, build, test, restart)
yarn deploy:dev / deploy:staging / deploy:prod

# Stop
yarn stop:dev / stop:staging / stop:prod / stop:all
```

---

## Monitoring & Maintenance

### Health Checks

```bash
# Single environment
curl http://localhost:3000/health

# Multi-environment
curl http://localhost:3000/health  # Dev
curl http://localhost:3001/health  # Staging
curl http://localhost:3002/health  # Production
```

Response includes:
- Status (healthy/unhealthy)
- Uptime
- Memory usage
- Service status
- PR count

### View Logs

```bash
# Real-time monitoring
pm2 monit

# View logs
pm2 logs <app-name>
pm2 logs <app-name> --lines 100
pm2 logs <app-name> --err  # Errors only
```

### PM2 Startup (Auto-Start on Boot)

```bash
# Configure once
pm2 startup
pm2 save
```

### Log Rotation

```bash
# Install log rotation
pm2 install pm2-logrotate

# Configure
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 30
```

### Zero-Downtime Deploys

```bash
# For production only
pm2 reload pr-notifier-prod

# Or use deploy script
yarn deploy:prod
```

---

## Troubleshooting

### Application Won't Start

```bash
# Check status
pm2 status

# View error logs
pm2 logs <app-name> --err --lines 50

# Common issues:
# - Missing .env file
# - Invalid Discord token
# - Port already in use
# - Missing data directory
```

### Webhooks Not Received

```bash
# 1. Check app is running
pm2 status

# 2. Check health
curl http://localhost:3000/health

# 3. Check tunnel is active
# CloudFlare: Test URL in browser
# Should see health JSON response

# 4. Check GitHub webhook deliveries
# GitHub: Repo → Settings → Webhooks → Recent Deliveries

# 5. Check logs
pm2 logs <app-name> --lines 100
```

### Discord Messages Not Sent

```bash
# Check logs for Discord errors
pm2 logs <app-name> | grep -i discord

# Common issues:
# - Invalid bot token
# - Wrong channel ID
# - Missing bot permissions

# Verify bot permissions in Discord:
# - Send Messages ✅
# - Create Public Threads ✅
# - Manage Threads ✅
# - Add Reactions ✅
```

### Wrong Environment Responding

```bash
# Check which environments are running
pm2 status

# Check environment in logs
pm2 logs pr-notifier-dev --lines 5
# Should show: [Startup] NODE_ENV: development

# Restart correct environment
yarn restart:dev
```

### Port Conflicts

Each environment uses different ports (3000, 3001, 3002).

```bash
# Check what's using a port (Windows)
netstat -ano | findstr :3000

# Stop specific environment
pm2 stop pr-notifier-dev
```

---

## Security Best Practices

- ✅ Different webhook secrets per environment
- ✅ Never commit `.env` files (in `.gitignore`)
- ✅ Use strong secrets (32+ characters)
- ✅ Enable SSL verification in GitHub webhooks
- ✅ Minimal Discord bot permissions
- ✅ Regular dependency updates: `yarn upgrade`
- ✅ Rotate secrets periodically

---

## Backup & Recovery

### Backup State Files

```bash
# Manual backup
cp data/pr-state.production.json data/backups/pr-state-$(date +%Y%m%d).json

# Automated (Windows Task Scheduler or Linux cron)
```

### Restore

```bash
cp data/backups/pr-state-20260205.json data/pr-state.production.json
pm2 restart pr-notifier-prod
```

---

## Performance & Scaling

**Typical Resource Usage**:
- Memory: 60-80 MB per environment
- CPU: <1% idle, <5% during webhook processing
- Disk: Minimal (logs + state files)

**Scaling**:
- Single instance handles typical repo activity
- Can run multiple environments on one machine
- File-based state persists across restarts

---

## Common Commands Cheat Sheet

```bash
# Build
yarn build

# Start environments
yarn start:dev / start:staging / start:prod / start:all

# Deploy (pull + build + test + restart)
yarn deploy:dev / deploy:staging / deploy:prod

# Logs
yarn logs:dev / logs:staging / logs:prod
pm2 monit  # Real-time dashboard

# Health checks
curl http://localhost:3000/health  # Dev
curl http://localhost:3001/health  # Staging
curl http://localhost:3002/health  # Production

# Restart
yarn restart:dev / restart:staging / restart:prod

# Stop
yarn stop:dev / stop:staging / stop:prod / stop:all

# PM2 management
pm2 status
pm2 save
pm2 startup
```

---

## Next Steps After Deployment

1. **Monitor for 24-48 hours**
   - Check logs regularly
   - Verify webhook deliveries
   - Monitor Discord notifications

2. **Configure Auto-Start**
   ```bash
   pm2 startup
   pm2 save
   ```

3. **Set Up External Monitoring** (Optional)
   - UptimeRobot for health endpoint monitoring
   - PM2 Plus for advanced metrics
   - CloudFlare analytics

4. **Document Your Setup**
   - Save tunnel URLs
   - Document channel IDs
   - Record webhook secrets (securely)

---

## Support

**First steps for issues**:
1. Check logs: `pm2 logs <app-name>`
2. Check health: `curl http://localhost:<port>/health`
3. Review troubleshooting section above
4. Check GitHub webhook deliveries for errors
