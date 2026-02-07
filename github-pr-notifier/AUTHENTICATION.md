# GitHub Authentication Guide

Complete guide for setting up GitHub authentication for the PR Notifier bot.

---

## Table of Contents

1. [Why Authentication is Needed](#why-authentication-is-needed)
2. [Choosing an Authentication Method](#choosing-an-authentication-method)
3. [Option A: Personal Access Token](#option-a-personal-access-token-simple)
4. [Option B: GitHub App](#option-b-github-app-recommended)
5. [Configuration](#configuration)
6. [Testing Authentication](#testing-authentication)
7. [Troubleshooting](#troubleshooting)
8. [Security Best Practices](#security-best-practices)

---

## Why Authentication is Needed

### PR Recovery Feature

The bot includes automatic **PR recovery** that handles cases where events arrive for PRs the bot doesn't know about:

**Scenarios where recovery is needed:**
- Bot was offline when PR was created
- State file was corrupted or deleted
- Bot added to existing repository with open PRs
- GitHub webhook delivery failures
- State storage switched (memory → file on restart)

**How recovery works:**
1. Bot receives event for unknown PR (e.g., "approved")
2. Bot fetches PR data from GitHub REST API
3. Bot creates Discord message/thread retroactively
4. Bot processes the review event normally

**Without authentication:** Bot skips events for unknown PRs
**With authentication:** Bot automatically recovers and processes all events

---

## Choosing an Authentication Method

| Feature | Personal Access Token | GitHub App |
|---------|----------------------|------------|
| **Ownership** | Tied to individual user | Organization-owned |
| **Access Scope** | All repos user can access | Only installed repos |
| **Rate Limits** | 5,000 requests/hour | 5,000 requests/hour per installation |
| **Token Expiration** | Never (unless configured) | Auto-refreshing (hourly) |
| **Audit Trail** | User attribution | Clear bot attribution |
| **Revocation Risk** | If user leaves/loses access | Independent of users |
| **Security** | Like a password | Short-lived tokens |
| **Setup Time** | 2 minutes | 15 minutes |
| **Best For** | Personal projects, dev | Organizations, production |

### Decision Matrix

**Use Personal Access Token if:**
- ✅ Personal project or single-user deployment
- ✅ Quick setup for development/testing
- ✅ Single repository
- ✅ You don't have org admin access to create apps

**Use GitHub App if:**
- ✅ Deploying to production
- ✅ Organization or team environment
- ✅ Multiple repositories
- ✅ Need to survive user turnover
- ✅ Want better security and audit trail

**Recommendation:** Start with PAT for development, migrate to GitHub App before production.

---

## Option A: Personal Access Token (Simple)

### Step 1: Create Personal Access Token

1. Go to GitHub → **Settings** → **Developer Settings** → **Personal Access Tokens** → **Tokens (classic)**
2. Click **"Generate new token (classic)"**
3. Name it: `PR Notifier Bot - Recovery`
4. Select expiration (recommend: 1 year)
5. Select scopes:
   - **For public repos only**: Check `public_repo`
   - **For private repos**: Check full `repo` scope
6. Click **"Generate token"**
7. **Copy the token** - you won't see it again!

### Step 2: Add to Configuration

Add to your `.env` file:

```env
# GitHub Authentication
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### Step 3: Restart Bot

```bash
yarn restart:dev   # Development
yarn restart:prod  # Production
```

### Step 4: Verify

Check logs for:
```
[INFO] GitHub Service initialized with Personal Access Token
```

**Done!** Recovery is now active.

### PAT Security

**✅ DO:**
- Store in `.env` file (never commit to git)
- Use read-only scopes when possible
- Set expiration date (1 year recommended)
- Create separate tokens for dev/staging/production
- Rotate regularly (before expiration)

**❌ DON'T:**
- Share token via email/chat
- Commit token to git (even private repos)
- Use admin/write scopes unnecessarily
- Reuse same token across environments

---

## Option B: GitHub App (Recommended)

### Why GitHub App?

**Key Benefits:**
1. **Organization-Owned**: Not tied to any individual user
2. **Scoped Access**: Only repos where app is installed
3. **Better Security**: Auto-refreshing tokens, never need manual rotation
4. **Multi-Repo**: Easy to add/remove repositories without redeploying bot
5. **Professional**: GitHub's recommended approach for integrations
6. **Audit Trail**: Clear attribution in GitHub logs

### Prerequisites

- GitHub organization admin access (or personal account access)
- Bot deployment URL (CloudFlare Tunnel or public server)

---

## Step 1: Create GitHub App

### 1.1 Navigate to Settings

**For Organization:**
- Go to Organization → **Settings** → **Developer Settings** → **GitHub Apps**
- Click **"New GitHub App"**

**For Personal Account:**
- Go to Profile → **Settings** → **Developer Settings** → **GitHub Apps**
- Click **"New GitHub App"**

### 1.2 Basic Information

Fill in:

**GitHub App Name:**
```
PR Discord Notifier
```

**Description:** (optional)
```
Automatically posts GitHub PR notifications to Discord with threaded discussions
```

**Homepage URL:**
```
https://github.com/your-org/pr-notifier
```
*(Your bot's repository or organization page)*

**Webhook URL:**
```
https://your-server-url/webhook/github
```
Examples:
- CloudFlare Tunnel: `https://pr-bot.poggers.app/webhook/github`
- ngrok: `https://abc123.ngrok.io/webhook/github`
- Public server: `https://pr-bot.yourcompany.com/webhook/github`

**Webhook Secret:**

Generate a secure random secret:

```bash
# Linux/Mac:
openssl rand -hex 32

# Windows PowerShell:
[Convert]::ToBase64String([byte[]]@(1..32 | ForEach-Object {Get-Random -Minimum 0 -Maximum 256}))
```

Save this secret - you'll use it for `GITHUB_WEBHOOK_SECRET` in `.env`

### 1.3 Permissions

Under **Repository Permissions**:

| Permission | Access Level | Reason |
|------------|--------------|--------|
| **Pull requests** | **Read-only** | Fetch PR data for recovery |
| **Metadata** | Read-only | Automatic (repository info) |

**That's it!** Only 2 permissions needed (1 configured, 1 automatic).

### 1.4 Subscribe to Events

Check these webhook events:

- ✅ **Pull request**
- ✅ **Pull request review**

### 1.5 Installation Settings

**Where can this GitHub App be installed?**

Choose:
- **Only on this account** - Recommended for most use cases
- **Any account** - Only if you're distributing the app publicly

### 1.6 Create the App

Click **"Create GitHub App"**

---

## Step 2: Generate Private Key

1. After creation, scroll to **"Private keys"** section
2. Click **"Generate a private key"**
3. A `.pem` file downloads automatically
4. **Save this file securely** - it's your bot's authentication credential

**Security Note:** Treat this like a password. Never commit to git!

---

## Step 3: Get App ID

On your GitHub App's page, note the **App ID** (shown near the top):

```
App ID: 123456
```

You'll need this for configuration.

---

## Step 4: Install App on Repositories

### 4.1 Install the App

1. On your GitHub App page, click **"Install App"** (left sidebar)
2. Choose your organization or account
3. Choose repositories:
   - **All repositories** - Bot monitors all PRs across all repos
   - **Only select repositories** - Choose specific repos (recommended)

Example: Install on `frontend`, `backend`, `api` repos

4. Click **"Install"**

### 4.2 Get Installation ID

After clicking "Install", you're redirected to a URL like:
```
https://github.com/organizations/YOUR_ORG/settings/installations/12345678
                                                                    ^^^^^^^^
```

The number at the end (`12345678`) is your **Installation ID**.

**Save this** - you'll need it for `GITHUB_APP_INSTALLATION_ID` in `.env`

---

## Step 5: Configure the Bot

### 5.1 Prepare Private Key

Open the `.pem` file you downloaded:

```
-----BEGIN RSA PRIVATE KEY-----
MIIEpAIBAAKCAQEA1234567890abcdef...
(many lines)
...xyz789
-----END RSA PRIVATE KEY-----
```

For `.env` file, you need to:
1. Keep the `BEGIN` and `END` lines
2. Replace actual newlines with `\n`
3. Wrap in double quotes

**Result:**
```env
GITHUB_APP_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\nMIIEpAIBAAKCAQEA1234567890...\n...\n-----END RSA PRIVATE KEY-----"
```

### 5.2 Update `.env` File

Edit `.env.production`:

```env
# Server Configuration
PORT=3002
NODE_ENV=production

# GitHub Configuration
GITHUB_WEBHOOK_SECRET=your-webhook-secret-from-step-1.2

# GitHub App Authentication
GITHUB_APP_ID=123456
GITHUB_APP_INSTALLATION_ID=12345678
GITHUB_APP_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\nYour\nPrivate\nKey\nHere\n-----END RSA PRIVATE KEY-----"

# Discord Configuration
DISCORD_BOT_TOKEN=your-discord-bot-token
DISCORD_CHANNEL_ID=your-channel-id

# State Storage
STATE_STORAGE_TYPE=file
STATE_FILE_PATH=./data/pr-state.production.json
LOG_LEVEL=info
```

### 5.3 Restart Bot

```bash
yarn restart:prod
```

### 5.4 Verify

Check logs:
```bash
yarn logs:prod
```

Look for:
```
[INFO] GitHub Service initialized with GitHub App (Installation ID: 12345678)
```

**Success!** Your bot is now authenticated with GitHub App.

---

## Configuration

### Environment Variables

```env
# ============================================
# GitHub Authentication - Choose ONE method
# ============================================

# Option A: Personal Access Token (Simple)
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Option B: GitHub App (Recommended for Production)
GITHUB_APP_ID=123456
GITHUB_APP_INSTALLATION_ID=12345678
GITHUB_APP_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\nYour private key\n-----END RSA PRIVATE KEY-----"
```

### Priority Order

If both are configured, GitHub App takes priority:

```
GitHub App > Personal Access Token > No Authentication
```

### No Authentication

If neither is configured:
- Bot works normally for PRs it knows about
- Bot skips events for unknown PRs (logs warning)
- No GitHub API calls made
- Recovery disabled

---

## Testing Authentication

### Test PAT

```bash
# Verify token works
curl -H "Authorization: token YOUR_TOKEN" https://api.github.com/user
```

Should return your GitHub user info.

### Test GitHub App

```bash
# Check bot logs after restart
yarn logs:prod

# Look for:
[INFO] GitHub Service initialized with GitHub App (Installation ID: ...)
```

### Test Recovery

1. Stop bot
2. Create a new PR
3. Add a reviewer
4. Start bot
5. Check Discord - PR should appear with reviewer

Logs should show:
```
[WARN] PR #123 not in state, attempting recovery from GitHub API...
[INFO] Fetching PR data from GitHub API: owner/repo#123
[INFO] Successfully recovered PR #123 from GitHub API
```

---

## Troubleshooting

### Personal Access Token

**Error: "GitHub authentication not configured"**
- **Cause**: `GITHUB_TOKEN` not in `.env`
- **Fix**: Add token to `.env` and restart

**Error: "Failed to fetch PR from GitHub API: 401 Unauthorized"**
- **Cause**: Token expired or invalid
- **Fix**: Generate new token, update `.env`, restart

**Error: "Failed to fetch PR from GitHub API: 404 Not Found"**
- **Cause**: Token doesn't have access to repository
- **Fix**: Ensure token has `repo` (private) or `public_repo` (public) scope

### GitHub App

**Error: "Failed to initialize GitHub App"**
- **Check**: App ID is correct (numbers only, no quotes)
- **Check**: Installation ID is correct
- **Check**: Private key format is correct (includes BEGIN/END lines)
- **Check**: Private key has `\n` for newlines
- **Check**: Private key is wrapped in double quotes

**Error: "GitHub App configured but missing installation ID"**
- **Cause**: Missing `GITHUB_APP_INSTALLATION_ID`
- **Fix**: Get installation ID from URL (see Step 4.2)

**Error: "PR not found in owner/repo"**
- **Cause**: App not installed on that repository
- **Fix**: Go to GitHub → Settings → Installations → Configure → Add repository

**Webhooks not received**
- **Check**: Webhook URL in app settings matches your server
- **Check**: Webhook secret matches `.env`
- **Check**: App is installed on the repository
- **Check**: Events subscribed: "Pull request", "Pull request review"
- **Debug**: GitHub App Settings → Advanced → Recent Deliveries

### Test Private Key Format

```bash
# Should show "writing RSA key"
openssl rsa -in github-app-key.pem -check
```

### Verify Authentication Method

Check your logs after bot starts:

```bash
yarn logs:prod | head -20
```

You should see one of:
- `[INFO] GitHub Service initialized with GitHub App (Installation ID: ...)`
- `[INFO] GitHub Service initialized with Personal Access Token`
- *(Nothing)* - No authentication configured

---

## Security Best Practices

### For Personal Access Tokens

**Storage:**
- ✅ Store in `.env` file (gitignored)
- ✅ Use secrets manager in production (AWS Secrets Manager, Azure Key Vault)
- ❌ Never commit to git
- ❌ Never share via email/chat

**Scopes:**
- Use minimum required: `public_repo` for public repos, `repo` for private
- Avoid `admin:*` or `write:*` scopes unless absolutely necessary

**Rotation:**
- Set expiration when creating (1 year recommended)
- Rotate before expiration
- Revoke old tokens immediately after rotation

### For GitHub App

**Private Key Storage:**
- ✅ Store in environment variables or secrets manager
- ✅ File permissions: `chmod 600 *.pem` (Linux/Mac)
- ✅ Add `*.pem` to `.gitignore`
- ❌ Never commit private keys to git
- ❌ Never share keys via email/chat
- ❌ Don't store in shared drives or wikis

**Key Rotation:**
- Generate new private key annually
- Test new key in staging before production
- Keep old key until new key is verified
- Revoke old key after successful migration

**Secrets Manager Examples:**

**AWS Secrets Manager:**
```bash
# Store private key
aws secretsmanager create-secret \
  --name pr-bot/github-app-private-key \
  --secret-string file://github-app-key.pem

# Retrieve at runtime
export GITHUB_APP_PRIVATE_KEY=$(aws secretsmanager get-secret-value \
  --secret-id pr-bot/github-app-private-key \
  --query SecretString --output text)
```

**Azure Key Vault:**
```bash
# Store private key
az keyvault secret set \
  --vault-name pr-bot-vault \
  --name github-app-key \
  --file github-app-key.pem

# Retrieve at runtime
export GITHUB_APP_PRIVATE_KEY=$(az keyvault secret show \
  --vault-name pr-bot-vault \
  --name github-app-key \
  --query value -o tsv)
```

### Multi-Environment Strategy

Use different credentials per environment:

**Development:**
```env
# .env.development
GITHUB_TOKEN=ghp_dev_token_here  # PAT for simplicity
```

**Staging:**
```env
# .env.staging
GITHUB_APP_ID=123456  # Same app, different installation
GITHUB_APP_INSTALLATION_ID=11111111  # Staging installation
GITHUB_APP_PRIVATE_KEY="..."
```

**Production:**
```env
# .env.production
GITHUB_APP_ID=123456  # Same app
GITHUB_APP_INSTALLATION_ID=22222222  # Production installation
GITHUB_APP_PRIVATE_KEY="..."
```

Or use separate apps entirely:
- Dev App → Dev repos
- Prod App → Prod repos

---

## Multi-Repository Setup

### How It Works

**One GitHub App Installation = Multiple Repos**

When you install a GitHub App, you can select multiple repositories:

```
GitHub App: "PR Discord Notifier"
  └─ Installation ID: 12345678
       ├─ myorg/frontend  ✅
       ├─ myorg/backend   ✅
       ├─ myorg/mobile    ✅
       └─ myorg/docs      ❌ (not installed)
```

**One Bot Instance** monitors all installed repos:

```env
# Single configuration monitors ALL installed repos
GITHUB_APP_INSTALLATION_ID=12345678
```

### Bot Code Location

Your bot code can be **anywhere:**

```
Bot Code Repository:        Monitored Repositories:
myorg/infrastructure        myorg/frontend    ← Webhooks sent here
   └─ pr-bot/              myorg/backend     ← Webhooks sent here
      ├─ src/              myorg/mobile      ← Webhooks sent here
      ├─ .env
      └─ ...
```

**The bot code does NOT need to be in the same repo as the PRs being monitored!**

### Adding/Removing Repos

**To add repositories:**
1. Go to GitHub → Settings → Installations → Your App
2. Click "Configure"
3. Select additional repositories
4. Click "Save"
5. **No bot restart needed** - webhooks automatically start arriving

**To remove repositories:**
1. Same as above, deselect repositories
2. Bot stops receiving webhooks from those repos

---

## Migrating from PAT to GitHub App

### Zero-Downtime Migration

**Phase 1: Create and Test (15 min)**

1. **Create GitHub App** (Steps 1-4 above)
2. **Test in development:**
   ```env
   # .env.development
   GITHUB_APP_ID=123456
   GITHUB_APP_INSTALLATION_ID=11111111
   GITHUB_APP_PRIVATE_KEY="..."
   ```
3. **Restart dev**: `yarn restart:dev`
4. **Create test PR** and verify Discord notification
5. **Test recovery** (stop bot, create PR, add reviewer, start bot)

**Phase 2: Deploy to Production (5 min)**

1. **Update `.env.production`:**
   ```env
   # Comment out PAT
   # GITHUB_TOKEN=ghp_xxxxx
   
   # Add GitHub App (tested in dev)
   GITHUB_APP_ID=123456
   GITHUB_APP_INSTALLATION_ID=22222222  # Production installation ID
   GITHUB_APP_PRIVATE_KEY="..."
   ```

2. **Restart production:**
   ```bash
   yarn restart:prod
   ```

3. **Verify logs:**
   ```bash
   yarn logs:prod
   ```
   Look for: `[INFO] GitHub Service initialized with GitHub App`

4. **Test with real PR** in monitored repo

**Phase 3: Cleanup**

1. **Monitor for 24-48 hours** to ensure stability
2. **Revoke old PAT** from GitHub Settings
3. **Document app details** for team
4. **Update runbooks** with new authentication method

### Rollback Plan

If issues occur:

1. **Uncomment PAT in `.env`:**
   ```env
   GITHUB_TOKEN=ghp_xxxxx  # Uncomment
   # GITHUB_APP_ID=...     # Comment out
   ```

2. **Restart:**
   ```bash
   yarn restart:prod
   ```

3. **Verify:** Check logs show PAT authentication

Bot automatically falls back to PAT when GitHub App config is incomplete.

---

## API Usage and Rate Limits

### Normal Operations

**Webhook-only** (no authentication configured):
- 0 API requests
- Handles all PRs the bot knows about
- Skips unknown PRs with warning

**With authentication** (PAT or GitHub App):
- 0 API requests for normal flow
- 2 API requests per recovered PR:
  - `GET /repos/{owner}/{repo}/pulls/{pr}`
  - `GET /repos/{owner}/{repo}/pulls/{pr}/requested_reviewers`

### Rate Limits

**Personal Access Token:**
- 5,000 requests per hour per token
- Shared across all uses of that token

**GitHub App:**
- 5,000 requests per hour per installation
- Separate limit for each installation
- Better for high-volume repositories

### Monitoring API Usage

**Check current rate limit:**
```bash
# For PAT
curl -H "Authorization: token YOUR_TOKEN" https://api.github.com/rate_limit

# Response shows:
{
  "resources": {
    "core": {
      "limit": 5000,
      "remaining": 4998,
      "reset": 1699488000
    }
  }
}
```

**What uses API requests:**
- PR recovery (2 requests per PR)
- Health checks do NOT use API
- Webhook processing does NOT use API

**Typical usage:**
- Stable deployment: 0-10 requests/hour (only recovery)
- Initial deployment to existing repo: 2 × (number of open PRs)

---

## Monitoring

### Log Messages

**Authentication initialized:**
```
[INFO] GitHub Service initialized with Personal Access Token
[INFO] GitHub Service initialized with GitHub App (Installation ID: 12345678)
```

**Recovery using authentication:**
```
[WARN] PR #123 not in state, attempting recovery from GitHub API...
[INFO] Fetching PR data from GitHub API: owner/repo#123
[INFO] Successfully recovered PR #123 from GitHub API
```

**Recovery failed:**
```
[ERROR] Failed to recover PR #123 from GitHub API: <error message>
```

### Health Check

The `/health` endpoint shows:
```json
{
  "status": "healthy",
  "services": {
    "pr_count": 15
  }
}
```

PR count increases when recovery happens.

---

## Comparison: PAT vs GitHub App Setup

### Personal Access Token

**Time:** 2 minutes

**Steps:**
1. Generate token in GitHub settings
2. Add to `.env`
3. Restart bot

**Best for:** Quick setup, development, personal projects

---

### GitHub App

**Time:** 15 minutes (first time), 5 minutes (subsequent installs)

**Steps:**
1. Create GitHub App (5 min)
2. Generate private key (1 min)
3. Install on repos (2 min)
4. Get installation ID (1 min)
5. Configure bot (5 min)
6. Restart and verify (1 min)

**Best for:** Production, organizations, multi-repo

---

## FAQ

### Can I use both PAT and GitHub App?

Yes! If both are configured, GitHub App takes priority. This allows:
- PAT as fallback if GitHub App fails
- Easy rollback during migration

**Not recommended for production** - choose one method for clarity.

### Do I need different GitHub Apps for dev/staging/prod?

**No**, you can use one app with multiple installations:
- Same App ID
- Different Installation IDs per environment
- Same private key (or different for extra security)

**Alternatively**, create separate apps for complete isolation.

### Can the bot work without authentication?

**Yes!** Bot works fine without authentication:
- Processes all webhook events for PRs it knows about
- Skips events for unknown PRs (logs warning)
- Recovery disabled

**Recommended:** Configure authentication for resilience.

### How do I rotate credentials?

**PAT Rotation:**
1. Generate new token
2. Update `.env` with new token
3. Restart bot: `yarn restart:prod`
4. Verify in logs
5. Revoke old token

**GitHub App Key Rotation:**
1. Generate new private key in GitHub App settings
2. Update `.env` with new key
3. Restart bot: `yarn restart:prod`
4. Verify in logs
5. Revoke old key in GitHub App settings

### What if my GitHub App gets suspended?

GitHub may suspend apps for:
- Terms of Service violations
- Suspicious activity
- Security issues

**Prevention:**
- Follow GitHub's ToS
- Keep dependencies updated
- Monitor for security vulnerabilities
- Use read-only permissions

**Recovery:**
- Create new app
- Update configuration
- Reinstall on repositories

---

## Support

**First steps for issues:**

1. **Check logs**: `yarn logs:prod`
2. **Verify configuration**: Ensure all required variables set
3. **Test credentials**: Use curl commands above
4. **Check GitHub status**: https://www.githubstatus.com/
5. **Review this guide**: Ensure all steps followed

**Common issues:**
- Invalid private key format (missing BEGIN/END, extra spaces)
- Wrong Installation ID (there can be multiple)
- App not installed on repository
- Webhook URL mismatch
- Expired or revoked PAT

**Still stuck?** Check:
- Bot logs for detailed error messages
- GitHub webhook delivery logs
- Network connectivity between bot and GitHub
