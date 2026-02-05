# Setup Checklist

Use this checklist to hook up your GitHub PR Notifier for the first time.

## ✅ Pre-Setup Checklist

### 1. Discord Bot Setup

- [ ] Create Discord bot at https://discord.com/developers/applications
- [ ] Copy bot token
- [ ] Invite bot to your server with these permissions:
  - Send Messages
  - Send Messages in Threads
  - Manage Threads
  - Embed Links
  - Add Reactions
- [ ] Get your Discord channel ID:
  - Enable Developer Mode (Settings → Advanced → Developer Mode)
  - Right-click channel → Copy Channel ID

### 2. GitHub Webhook Setup

- [ ] Generate a secure webhook secret (32+ random characters)
  ```bash
  # Generate on Linux/Mac:
  openssl rand -hex 32
  
  # Or use a password generator
  ```
- [ ] Note: You'll configure the actual webhook after starting the server

### 3. User Mappings

- [ ] Collect GitHub usernames of your team
- [ ] Get Discord user IDs for each person:
  - Enable Developer Mode in Discord (Settings → Advanced → Developer Mode)
  - Right-click each user → Copy User ID
- [ ] Add mappings to `config/user-mappings.json`

---

## 📝 Configuration Files

### 1. Edit `.env` File

Copy from `.env.example` and fill in your values:

```bash
# Server Configuration
PORT=3000
NODE_ENV=production  # Change to production when ready

# GitHub Configuration
GITHUB_WEBHOOK_SECRET=your-actual-webhook-secret-here

# Discord Configuration
DISCORD_BOT_TOKEN=your-actual-discord-bot-token-here
DISCORD_CHANNEL_ID=your-actual-channel-id-here

# State Storage
STATE_STORAGE_TYPE=file
STATE_FILE_PATH=./data/pr-state.json

# Logging
LOG_LEVEL=info  # Use debug for troubleshooting
```

**Checklist:**
- [ ] Set `GITHUB_WEBHOOK_SECRET`
- [ ] Set `DISCORD_BOT_TOKEN`
- [ ] Set `DISCORD_CHANNEL_ID`
- [ ] Set `NODE_ENV=production` (when ready)

### 2. Edit `config/user-mappings.json`

Replace the example with your actual team mappings:

```json
{
  "_description": "GitHub username to Discord user ID mappings",
  
  "jenni": "123456789012345678",
  "alice": "234567890123456789",
  "bob": "345678901234567890",
  "carol": "456789012345678901"
}
```

**Checklist:**
- [ ] Remove example mappings
- [ ] Add all team GitHub usernames
- [ ] Add corresponding Discord user IDs
- [ ] Test at least one mapping works

---

## 🚀 First Run

### 1. Install Dependencies (if not already done)

```bash
yarn install
```

### 2. Build the Project

```bash
yarn build
```

**Checklist:**
- [ ] Build completes without errors
- [ ] `dist/` folder is created

### 3. Start the Server

```bash
# For development (with auto-reload)
yarn dev

# For production
yarn start

# Or with PM2
pm2 start dist/index.js --name github-pr-notifier
```

**Checklist:**
- [ ] Server starts successfully
- [ ] See: `[INFO] Server listening on port 3000`
- [ ] See: `[INFO] PRCoordinator initialized` (if Discord configured)
- [ ] No errors in startup logs

### 4. Test Health Endpoint

```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "status": "healthy",
  "uptime": 1.234,
  "timestamp": "2026-02-05T..."
}
```

**Checklist:**
- [ ] Health endpoint returns 200 OK
- [ ] Response shows "healthy"

---

## 🔗 GitHub Webhook Configuration

### 1. Expose Server to Internet

Choose one method:

**Option A: ngrok (Quick testing)**
```bash
ngrok http 3000
# Copy the https URL (e.g., https://abc123.ngrok.io)
```

**Option B: CloudFlare Tunnel**
```bash
cloudflared tunnel --url http://localhost:3000
```

**Option C: Self-hosted with domain**
- Configure your reverse proxy (nginx, caddy)
- Point domain to your server

**Checklist:**
- [ ] Server is accessible via public URL
- [ ] Test: `curl https://your-public-url/health`

### 2. Configure GitHub Webhook

Go to your GitHub repository:

1. Settings → Webhooks → Add webhook
2. **Payload URL**: `https://your-public-url/webhook/github`
3. **Content type**: `application/json`
4. **Secret**: (paste your `GITHUB_WEBHOOK_SECRET`)
5. **Which events**: Select individual events:
   - ✅ Pull requests
   - ✅ Pull request reviews
   - ✅ Pull request review comments
6. **Active**: ✅ Check this box
7. Click "Add webhook"

**Checklist:**
- [ ] Webhook created successfully
- [ ] Shows green checkmark after first delivery
- [ ] No errors in "Recent Deliveries"

---

## ✅ Testing End-to-End

### 1. Test with Real PR

- [ ] Open a new PR in your repository
- [ ] Check server logs for:
  ```
  [INFO] Received GitHub webhook: pull_request
  [INFO] Handling PR opened: #123
  [INFO] Created Discord message
  [INFO] Created Discord thread
  [INFO] Successfully handled PR opened
  ```
- [ ] Check Discord channel:
  - [ ] Message appears with PR details
  - [ ] Thread is created
  - [ ] Initial thread message is posted
  - [ ] Reviewers are @-mentioned (if mapped)

### 2. Verify User Mapping

- [ ] PR author shows as `<@123456...>` in Discord (if mapped)
- [ ] Or shows as `@github-username` (if not mapped)
- [ ] Reviewers show correctly

### 3. Test Draft PR

- [ ] Open a draft PR
- [ ] Check Discord message shows: `📝 Draft`

### 4. Test No Reviewers

- [ ] Open PR without reviewers
- [ ] Check Discord message shows: `⚠️ **No reviewers assigned!**`

---

## 🐛 Troubleshooting

### Server Won't Start

- [ ] Check `.env` file exists and has all required variables
- [ ] Check port 3000 is not already in use
- [ ] Check logs for error messages
- [ ] Try with `LOG_LEVEL=debug` for more details

### Discord Bot Not Posting

- [ ] Verify bot is online in Discord
- [ ] Check bot has correct permissions in channel
- [ ] Verify `DISCORD_CHANNEL_ID` is correct (right-click channel → Copy ID)
- [ ] Check server logs for Discord errors

### Webhook Not Received

- [ ] Check GitHub webhook "Recent Deliveries" for errors
- [ ] Verify webhook URL is accessible from internet
- [ ] Test signature verification: check for 401 errors
- [ ] Verify `GITHUB_WEBHOOK_SECRET` matches GitHub

### User Mappings Not Working

- [ ] Check `config/user-mappings.json` syntax (valid JSON)
- [ ] Verify Discord user IDs are correct (18-digit numbers)
- [ ] Verify GitHub usernames match exactly (case-sensitive)
- [ ] Restart server after changing mappings

---

## 📊 Monitoring

### Check Server Status

```bash
# If using PM2
pm2 status
pm2 logs github-pr-notifier

# If running directly
# Check your terminal/console
```

### Check State File

```bash
cat data/pr-state.json
```

Should show active PRs with Discord message IDs.

### GitHub Webhook Deliveries

- Go to repo Settings → Webhooks
- Click on your webhook
- Check "Recent Deliveries" tab
- Green checkmark = success
- Red X = error (click to see details)

---

## 🎉 Success Criteria

You're all set when:

- ✅ Server starts without errors
- ✅ Health endpoint responds
- ✅ GitHub webhook shows green checkmark
- ✅ New PR creates Discord message
- ✅ Thread is created automatically
- ✅ User mappings work (Discord mentions appear)
- ✅ PR state is persisted to file

---

## 📚 Next Steps

Once everything is working:

1. Set `NODE_ENV=production` in `.env`
2. Set `LOG_LEVEL=info` (less verbose)
3. Set up PM2 for auto-restart:
   ```bash
   pm2 start dist/index.js --name github-pr-notifier
   pm2 save
   pm2 startup
   ```
4. Monitor logs regularly
5. Add more user mappings as team grows

---

## 🆘 Need Help?

- Check logs: `pm2 logs github-pr-notifier` or console output
- Review [SETUP.md](./SETUP.md) for detailed setup guide
- Check [README.md](./README.md) for architecture overview
- Run tests: `yarn test` to verify everything works
