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

<details>
<summary><b>Linux/Mac</b></summary>

```bash
# Configure once
pm2 startup
pm2 save
```
</details>

<details>
<summary><b>Windows</b></summary>

**⚠️ Important**: `pm2 startup` does not work on Windows. Use Windows Task Scheduler instead.

See the [Windows 24/7 Server Setup](#windows-247-server-setup) section below for complete instructions.
</details>

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

## Windows 24/7 Server Setup

Complete guide for setting up a dedicated Windows machine as a 24/7 webhook server.

### Prerequisites

- Fresh Windows 10/11 installation
- Administrator access
- Stable internet connection
- GitHub repository access
- Discord server admin access

### Step 1: Install Required Software (15-20 min)

#### 1.1 Install Node.js

1. Download Node.js LTS from: https://nodejs.org/en/download/
2. Run installer with default options
3. **Important**: Close and reopen any terminal/PowerShell windows
4. Verify installation:
   ```powershell
   node --version  # Should show v20.x.x or higher
   npm --version   # Should show 10.x.x or higher
   ```

#### 1.2 Install Yarn and PM2

```powershell
# Install Yarn globally
npm install -g yarn

# Install PM2 globally
npm install -g pm2

# Verify installations
yarn --version  # Should show 1.22.x
pm2 --version   # Should show 5.x.x
```

#### 1.3 Install CloudFlare Tunnel

1. Download from: https://github.com/cloudflare/cloudflared/releases
2. Download `cloudflared-windows-amd64.exe`
3. Rename to `cloudflared.exe`
4. Move to `C:\cloudflared\` (create folder if needed)
5. Add to PATH or run from that directory
6. Verify:
   ```powershell
   C:\cloudflared\cloudflared.exe --version
   ```

#### 1.4 Install Git (Optional)

If using GitHub Desktop, skip this. Otherwise:

1. Download from: https://git-scm.com/download/win
2. Install with default options
3. Verify: `git --version`

---

### Step 2: Configure Windows Power Management (5 min)

**Critical**: Prevent Windows from sleeping and interrupting the webhook server.

#### 2.1 Disable Sleep

1. **Open Power Options**:
   - Press `Win + X` → Select "Power Options"
   - Or: Control Panel → Hardware and Sound → Power Options

2. **Select "High Performance" plan**:
   - If not visible, click "Show additional plans"
   - Select "High performance"

3. **Configure sleep settings**:
   - Click "Change plan settings" next to High Performance
   - Set both to "Never":
     - Turn off the display: **15 minutes** (or your preference)
     - Put the computer to sleep: **Never**
   - Click "Save changes"

4. **Advanced power settings**:
   - Click "Change advanced power settings"
   - Configure these settings:
     - **Hard disk** → Turn off hard disk after: **Never**
     - **Sleep** → Sleep after: **Never**
     - **Sleep** → Hibernate after: **Never**
     - **USB settings** → USB selective suspend: **Disabled**
     - **PCI Express** → Link State Power Management: **Off**
   - Click "OK"

#### 2.2 Disable Fast Startup (Recommended)

1. Control Panel → Power Options
2. Click "Choose what the power buttons do"
3. Click "Change settings that are currently unavailable"
4. Uncheck "Turn on fast startup (recommended)"
5. Click "Save changes"

#### 2.3 Configure Windows Update (Important)

To prevent automatic restarts:

1. Press `Win + R`, type `services.msc`
2. Find "Windows Update" service
3. Right-click → Properties
4. Set "Startup type" to "Manual"
5. Click "OK"

**Alternative**: Set Active Hours to 24 hours in Windows Update settings.

---

### Step 3: Clone and Setup Application (10 min)

```powershell
# Navigate to your projects directory
cd C:\Users\YourName\Documents\GitHub

# Clone repository (or use GitHub Desktop)
git clone https://github.com/your-org/your-repo.git
cd your-repo/github-pr-notifier

# Install dependencies
yarn install

# Build application
yarn build

# Run tests to verify
yarn test
```

---

### Step 4: Configure Environments (15-20 min)

#### 4.1 Create `.env.production` file

Create `C:\Users\YourName\Documents\GitHub\your-repo\github-pr-notifier\.env.production`:

```env
PORT=3002
NODE_ENV=production
GITHUB_WEBHOOK_SECRET=your-strong-production-secret-here
DISCORD_BOT_TOKEN=your-discord-bot-token
DISCORD_CHANNEL_ID=your-production-channel-id
STATE_STORAGE_TYPE=file
STATE_FILE_PATH=./data/pr-state.production.json
USER_MAPPINGS_PATH=./config/user-mappings.json
LOG_LEVEL=info
```

#### 4.2 Create `.env.staging` file (Optional)

Create `C:\Users\YourName\Documents\GitHub\your-repo\github-pr-notifier\.env.staging`:

```env
PORT=3001
NODE_ENV=staging
GITHUB_WEBHOOK_SECRET=your-strong-staging-secret-here
DISCORD_BOT_TOKEN=your-discord-bot-token
DISCORD_CHANNEL_ID=your-staging-channel-id
STATE_STORAGE_TYPE=file
STATE_FILE_PATH=./data/pr-state.staging.json
USER_MAPPINGS_PATH=./config/user-mappings.json
LOG_LEVEL=info
```

#### 4.3 Create User Mappings

Create/edit `config/user-mappings.json`:

```json
{
  "github-username-1": "discord-user-id-1",
  "github-username-2": "discord-user-id-2",
  "your-github-username": "your-discord-user-id"
}
```

**How to get Discord User IDs**:
1. Enable Developer Mode in Discord: Settings → Advanced → Developer Mode
2. Right-click user in server → "Copy User ID"
3. Add to mappings file

---

### Step 5: Setup Discord Bot (15 min)

#### 5.1 Create Discord Bot

1. Go to: https://discord.com/developers/applications
2. Click "New Application"
3. Name: "GitHub PR Notifier" → Create
4. Go to "Bot" section → Click "Add Bot"
5. Copy Bot Token (save securely)

#### 5.2 Configure Bot Permissions

**Required Permissions** (Permission Integer: `534723947584`):

- ✅ View Channels
- ✅ Send Messages
- ✅ Send Messages in Threads
- ✅ Embed Links
- ✅ Read Message History
- ✅ Create Public Threads
- ✅ Manage Threads
- ✅ Add Reactions

#### 5.3 Generate Invite URL

In Discord Developer Portal:
1. Go to OAuth2 → URL Generator
2. **Scopes**: Select `bot`
3. **Bot Permissions**: Select all permissions listed above
4. Copy generated URL
5. Open URL in browser → Select server → Authorize

#### 5.4 Create Discord Channels

In your Discord server:
1. Create `#pr-notifications` (production)
2. Create `#pr-notifications-staging` (optional)
3. Right-click each channel → Copy Channel ID
4. Add IDs to `.env` files

---

### Step 6: Setup CloudFlare Tunnel (20 min)

#### 6.1 Login to CloudFlare

```powershell
C:\cloudflared\cloudflared.exe login
```

This opens a browser - select your CloudFlare domain.

#### 6.2 Create Tunnel in CloudFlare Dashboard

1. Go to: CloudFlare Zero Trust → Access → Tunnels
2. Click "Create a tunnel"
3. Name it (e.g., "github-pr-bot")
4. Copy the tunnel token (you'll need this)
5. Add Public Hostnames:
   - **Subdomain**: `pr-bot` **Domain**: `yourdomain.com` **Service**: `http://localhost:3002`
   - **Subdomain**: `pr-bot-staging` **Domain**: `yourdomain.com` **Service**: `http://localhost:3001`

#### 6.3 Install CloudFlare Tunnel as Windows Service

```powershell
# Install as service (replace with your token)
C:\cloudflared\cloudflared.exe service install <your-tunnel-token>

# Start the service
C:\cloudflared\cloudflared.exe service start

# Verify it's running
Get-Service cloudflared
```

The tunnel will now run in the background and start automatically on boot.

---

### Step 7: Start PM2 Services (5 min)

#### 7.1 Start Services

```powershell
cd C:\Users\YourName\Documents\GitHub\your-repo\github-pr-notifier

# Start production
yarn start:prod

# Start staging (optional)
yarn start:staging

# Verify status
pm2 status
pm2 logs
```

#### 7.2 Save PM2 Process List

```powershell
pm2 save
```

This saves the current PM2 processes to be restored on startup.

---

### Step 8: Configure PM2 Auto-Start on Windows Boot (15 min)

**⚠️ Important**: `pm2 startup` does NOT work on Windows. Use Windows Task Scheduler instead.

#### 8.1 Create Startup Script

Create `C:\Users\YourName\Documents\GitHub\your-repo\github-pr-notifier\start-pm2-services.bat`:

```batch
@echo off
REM Start PM2 services for GitHub PR Notifier
cd /d "C:\Users\YourName\Documents\GitHub\your-repo\github-pr-notifier"

REM Wait for network to be available (important!)
timeout /t 10 /nobreak

REM Resurrect saved PM2 processes
call pm2 resurrect

REM If resurrect fails, start manually as fallback
if errorlevel 1 (
    call pm2 start ecosystem.config.js --only pr-notifier-staging
    call pm2 start ecosystem.config.js --only pr-notifier-prod
)

echo PM2 services started
```

**Important**: Update the path to match your actual installation directory!

#### 8.2 Create Windows Task Scheduler Task

1. **Open Task Scheduler**:
   - Press `Win + R`, type `taskschd.msc`, press Enter

2. **Create New Task**:
   - Click "Create Task" (not "Create Basic Task")
   - **General Tab**:
     - Name: `Start PM2 Services`
     - Description: `Auto-start PM2 processes for GitHub PR Notifier`
     - **Run whether user is logged on or not**: ✅
     - **Run with highest privileges**: ✅
     - Configure for: Windows 10/11

3. **Triggers Tab**:
   - Click "New..."
   - Begin the task: **At startup**
   - Delay task for: **30 seconds** (wait for network)
   - Enabled: ✅
   - Click "OK"

4. **Actions Tab**:
   - Click "New..."
   - Action: **Start a program**
   - Program/script: `C:\Windows\System32\cmd.exe`
   - Add arguments: `/c "C:\Users\YourName\Documents\GitHub\your-repo\github-pr-notifier\start-pm2-services.bat"`
   - Click "OK"

5. **Conditions Tab**:
   - **Power**:
     - Uncheck "Start the task only if the computer is on AC power"
     - Uncheck "Stop if the computer switches to battery power"
   - **Network**:
     - Check "Start only if the following network connection is available"
     - Select "Any connection"

6. **Settings Tab**:
   - Check "Allow task to be run on demand"
   - Check "Run task as soon as possible after a scheduled start is missed"
   - If the task fails, restart every: **1 minute**
   - Attempt to restart up to: **3 times**
   - Check "If the task is already running, do not start a new instance"

7. **Save Task**:
   - Click "OK"
   - Enter your Windows password when prompted

#### 8.3 Test Auto-Start

```powershell
# Test the task manually
schtasks /run /tn "Start PM2 Services"

# Check if services started
pm2 status

# Or restart your computer to verify it works on boot
```

---

### Step 9: Configure GitHub Webhooks (10 min)

#### 9.1 Production Webhook

In GitHub repository:
1. Go to Settings → Webhooks → Add webhook
2. **Payload URL**: `https://pr-bot.yourdomain.com/webhook/github`
3. **Content type**: `application/json`
4. **Secret**: Same value as `GITHUB_WEBHOOK_SECRET` from `.env.production`
5. **Which events**: Select individual events:
   - ✅ Pull requests
   - ✅ Pull request reviews
6. **Active**: ✅
7. Click "Add webhook"

#### 9.2 Staging Webhook (Optional)

Repeat above with:
- **Payload URL**: `https://pr-bot-staging.yourdomain.com/webhook/github`
- **Secret**: From `.env.staging`

#### 9.3 Verify Webhooks

1. In GitHub webhooks page, click on your webhook
2. Go to "Recent Deliveries" tab
3. Click "Redeliver" on any recent delivery
4. Check response code should be **200 OK**
5. Check PM2 logs:
   ```powershell
   pm2 logs pr-notifier-prod --lines 20
   ```
   Should see: `[INFO] Received GitHub webhook: pull_request`

---

### Step 10: Final Verification (10 min)

#### 10.1 Create Test PR

1. Create a new branch in your repository
2. Make a small change
3. Create a Pull Request
4. Assign reviewers

#### 10.2 Verify Discord

Check Discord channel for:
- ✅ PR notification message with embed
- ✅ Thread created automatically
- ✅ Initial message in thread mentioning author
- ✅ Reviewers listed (or warning if none)

#### 10.3 Test Full Workflow

1. Have someone approve the PR → Check Discord for approval message
2. Merge the PR → Check Discord for merge notification
3. Verify thread is locked

---

### Windows-Specific Maintenance

#### Check Service Status

```powershell
# Check PM2 processes
pm2 status

# Check CloudFlare Tunnel service
Get-Service cloudflared

# View PM2 logs
pm2 logs --lines 50

# View logs from files
Get-Content logs\prod-out.log -Tail 50
Get-Content logs\prod-error.log -Tail 50
```

#### Restart Services

```powershell
# Restart PM2 processes
pm2 restart all

# Restart CloudFlare Tunnel service
Restart-Service cloudflared
```

#### Update Application

```powershell
cd C:\Users\YourName\Documents\GitHub\your-repo\github-pr-notifier

# Pull latest code
git pull

# Install new dependencies
yarn install

# Build
yarn build

# Run tests
yarn test

# Restart services
pm2 restart all

# Save PM2 state
pm2 save
```

---

### Windows Troubleshooting

#### Services Not Starting on Boot

**Check Task Scheduler**:
1. Open Task Scheduler
2. Find "Start PM2 Services" task
3. Right-click → Run
4. Check "History" tab for errors

**Common fixes**:
- Ensure 30-second startup delay is set
- Verify network condition is set to "Any connection"
- Check path in batch script is correct
- Run Task Scheduler as Administrator

#### Port Already in Use

```powershell
# Check what's using the port
netstat -ano | findstr :3002

# Find the process ID (PID) in the output
# Kill the process (replace PID with actual number)
taskkill /PID <PID> /F

# Restart PM2 service
pm2 restart pr-notifier-prod
```

#### CloudFlare Tunnel Not Working

```powershell
# Check service status
Get-Service cloudflared

# If not running, start it
Start-Service cloudflared

# View service logs
# Check Windows Event Viewer → Windows Logs → Application
# Look for "cloudflared" entries

# Reinstall service if needed
C:\cloudflared\cloudflared.exe service uninstall
C:\cloudflared\cloudflared.exe service install <your-token>
Start-Service cloudflared
```

#### Disk Space Issues

PM2 logs can grow large. Configure log rotation:

```powershell
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 30
```

Or manually clear logs:

```powershell
pm2 flush  # Clear all PM2 logs
```

#### Discord Bot "Missing Access" Errors

If you see errors like "Failed to add user to thread: Missing Access":

**Fix**: Update bot permissions in Discord:
1. Go to Discord Developer Portal
2. OAuth2 → URL Generator
3. Select `bot` scope
4. Select all required permissions (see Step 5.2)
5. Use generated URL to re-authorize bot
6. Permission integer: `534723947584`

The bot will still work without "Manage Threads" permission (users will be notified via @mentions), but you'll see warnings in logs.

---

### Windows Security Considerations

1. **Firewall**: Windows Firewall should allow Node.js (prompted on first run)
2. **Antivirus**: Ensure Node.js and PM2 are whitelisted
3. **User Account**: Consider running under a dedicated non-admin user for security
4. **Secrets**: Store `.env` files securely, never commit to git
5. **Updates**: Keep Node.js and Windows security updates current

---

### Performance Tuning for 24/7 Operation

#### Monitor Resource Usage

```powershell
# Real-time PM2 monitoring
pm2 monit

# Windows Task Manager
# Look for node.exe processes (should be ~60-80 MB each)
```

#### Expected Resource Usage (Per Environment)

- **Memory**: 60-80 MB per environment
- **CPU**: <1% idle, <5% during webhook bursts
- **Network**: Minimal (~1-5 KB per webhook)
- **Disk**: Log files (configure rotation)

#### Optimize for Low-Power Hardware

If running on older hardware:

1. Run only production (skip dev/staging)
2. Use in-memory state storage for dev/staging
3. Set `LOG_LEVEL=warn` or `LOG_LEVEL=error`
4. Configure aggressive log rotation

---

### Backup Strategy (Windows)

#### Manual Backup

```powershell
# Create backup directory
mkdir data\backups

# Backup production state
Copy-Item data\pr-state.production.json data\backups\pr-state-prod-$(Get-Date -Format 'yyyyMMdd-HHmmss').json

# Backup staging state
Copy-Item data\pr-state.staging.json data\backups\pr-state-staging-$(Get-Date -Format 'yyyyMMdd-HHmmss').json

# Backup user mappings
Copy-Item config\user-mappings.json config\backups\user-mappings-$(Get-Date -Format 'yyyyMMdd-HHmmss').json
```

#### Automated Backup (Windows Task Scheduler)

Create a batch script `backup-state.bat`:

```batch
@echo off
cd /d "C:\Users\YourName\Documents\GitHub\your-repo\github-pr-notifier"
set TIMESTAMP=%date:~-4,4%%date:~-10,2%%date:~-7,2%-%time:~0,2%%time:~3,2%%time:~6,2%
set TIMESTAMP=%TIMESTAMP: =0%
copy data\pr-state.production.json data\backups\pr-state-prod-%TIMESTAMP%.json
echo Backup completed: %TIMESTAMP%
```

Create daily task in Task Scheduler:
- Trigger: Daily at 2:00 AM
- Action: Run `backup-state.bat`

---

### Step 11: Monitoring Setup (Optional, 10 min)

#### Built-in Health Checks

The bot exposes health endpoints:

```powershell
# Check locally
curl http://localhost:3002/health

# Check via tunnel
curl https://pr-bot.yourdomain.com/health
```

#### External Monitoring Services

**UptimeRobot** (Free, recommended):
1. Sign up: https://uptimerobot.com
2. Add monitor:
   - Monitor Type: HTTP(s)
   - URL: `https://pr-bot.yourdomain.com/health`
   - Monitoring Interval: 5 minutes
3. Set up email/SMS alerts

**Healthchecks.io** (Alternative):
1. Sign up: https://healthchecks.io
2. Create check
3. Add webhook URL
4. Configure alert contacts

---

### Complete Windows Deployment Checklist

Use this checklist to verify your setup:

- [ ] Node.js installed and verified (`node --version`)
- [ ] Yarn installed (`yarn --version`)
- [ ] PM2 installed (`pm2 --version`)
- [ ] CloudFlare Tunnel installed and configured
- [ ] Windows power settings configured (never sleep)
- [ ] Windows Update configured (manual or active hours)
- [ ] Repository cloned
- [ ] Dependencies installed (`yarn install`)
- [ ] Application built (`yarn build`)
- [ ] Tests passing (`yarn test`)
- [ ] Discord bot created with correct permissions
- [ ] Discord bot invited to server
- [ ] Discord channels created and IDs copied
- [ ] `.env.production` created and configured
- [ ] `.env.staging` created (if using staging)
- [ ] `user-mappings.json` configured
- [ ] CloudFlare Tunnel running as Windows service
- [ ] PM2 services started (`pm2 status` shows online)
- [ ] PM2 processes saved (`pm2 save`)
- [ ] `start-pm2-services.bat` created
- [ ] Windows Task Scheduler task created
- [ ] Task Scheduler task tested (run manually)
- [ ] GitHub webhooks configured
- [ ] Webhooks tested (redeliver and check logs)
- [ ] Test PR created and Discord notification received
- [ ] System rebooted and services auto-started
- [ ] External monitoring configured (optional)

---

## Support

**First steps for issues**:
1. Check logs: `pm2 logs <app-name>`
2. Check health: `curl http://localhost:<port>/health`
3. Review troubleshooting section above
4. Check GitHub webhook deliveries for errors

**Windows-specific issues**:
1. Check Windows Task Scheduler task history
2. Check CloudFlare Tunnel service: `Get-Service cloudflared`
3. Verify Windows isn't sleeping: Check Power Options
4. Check Windows Event Viewer for service errors
