# Production Deployment Checklist

Use this checklist to ensure a smooth production deployment.

**📖 See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed instructions.**

---

## Pre-Deployment

### Environment Setup
- [ ] Node.js v20+ installed
- [ ] Yarn installed
- [ ] PM2 installed globally (`npm install -g pm2`)
- [ ] Git repository cloned
- [ ] Dependencies installed (`yarn install`)
- [ ] Build successful (`yarn build`)

### Configuration
- [ ] `.env` file created from `.env.production` template
- [ ] `GITHUB_WEBHOOK_SECRET` configured (strong 32+ character secret)
- [ ] `DISCORD_BOT_TOKEN` configured (from Discord Developer Portal)
- [ ] `DISCORD_CHANNEL_ID` configured (enable Developer Mode in Discord)
- [ ] `STATE_STORAGE_TYPE` set (`file` recommended for production)
- [ ] `LOG_LEVEL` set to `info` for production
- [ ] `config/user-mappings.json` created with GitHub → Discord mappings

### Directories
- [ ] `data/` directory created
- [ ] `logs/` directory created
- [ ] `config/` directory created
- [ ] Proper permissions set (Linux/Mac: `chmod 755 data logs config`)

### Discord Bot Setup
- [ ] Discord bot created in Developer Portal
- [ ] Bot added to Discord server
- [ ] Bot permissions configured:
  - [ ] Send Messages
  - [ ] Create Public Threads
  - [ ] Manage Threads
  - [ ] Add Reactions
  - [ ] Mention Everyone (for @mentions)
- [ ] Bot can access target channel

### Testing
- [ ] All tests pass (`yarn test`)
- [ ] Integration tests pass (6/6)
- [ ] E2E tests pass (6/6)
- [ ] Build completes without errors
- [ ] TypeScript type check passes (`yarn typecheck`)
- [ ] Linting passes (`yarn lint`)

---

## Deployment

### Application Start
- [ ] PM2 starts successfully (`yarn start:pm2`)
- [ ] Process shows as "online" in `pm2 status`
- [ ] No immediate errors in `pm2 logs`
- [ ] Health endpoint responds (`curl http://localhost:3000/health`)
- [ ] Health check shows services ready

### Tunnel Setup (Choose One)

#### Option A: CloudFlare Tunnel
- [ ] `cloudflared` installed
- [ ] CloudFlare account authenticated
- [ ] Tunnel created
- [ ] DNS configured
- [ ] Tunnel running and accessible
- [ ] HTTPS URL noted for webhook configuration

#### Option B: ngrok
- [ ] ngrok installed
- [ ] Tunnel started (`ngrok http 3000`)
- [ ] HTTPS URL noted for webhook configuration
- [ ] (Optional) Paid plan for stable URL

#### Option C: Public Server
- [ ] Server accessible from internet
- [ ] Firewall configured (port 3000 or proxy)
- [ ] SSL certificate configured (if using domain)
- [ ] Reverse proxy configured (nginx/Apache)

### GitHub Webhook Configuration
- [ ] Webhook created in repository settings
- [ ] Payload URL set to tunnel URL + `/webhook/github`
- [ ] Content type set to `application/json`
- [ ] Secret matches `GITHUB_WEBHOOK_SECRET` in `.env`
- [ ] SSL verification enabled
- [ ] Events selected:
  - [ ] Pull requests
  - [ ] Pull request reviews
- [ ] Webhook marked as Active
- [ ] Test ping successful (green checkmark in Recent Deliveries)

---

## Verification

### Initial Testing
- [ ] Create test PR in repository
- [ ] Discord message appears in configured channel
- [ ] Thread created successfully
- [ ] Initial thread message posted
- [ ] User mappings work (Discord @mentions appear correctly)
- [ ] PM2 logs show successful processing

### Functionality Testing
- [ ] Add reviewer to PR → Appears in Discord message
- [ ] Reviewer added to thread successfully
- [ ] Approve PR → Reaction added (✅)
- [ ] Request changes → Reaction changes to (🔴)
- [ ] Close/merge PR → Thread locks, final message posted
- [ ] Reopen PR → Thread unlocks, status recalculates

### Monitoring Setup
- [ ] PM2 monitoring accessible (`pm2 monit`)
- [ ] Logs rotating properly (if `pm2-logrotate` installed)
- [ ] Health check endpoint monitored (UptimeRobot/Better Stack)
- [ ] Alert thresholds configured
- [ ] Team notified of monitoring URLs

---

## Post-Deployment

### Stability Monitoring (First 24 Hours)
- [ ] Check logs every few hours: `pm2 logs github-pr-notifier --lines 100`
- [ ] Monitor restart count: `pm2 info github-pr-notifier`
- [ ] Verify webhook deliveries in GitHub (Settings → Webhooks → Recent Deliveries)
- [ ] Check Discord channel for any failed/missing notifications
- [ ] Monitor memory usage: `pm2 info github-pr-notifier | grep memory`

### Startup Configuration
- [ ] PM2 startup script configured: `pm2 startup`
- [ ] PM2 process list saved: `pm2 save`
- [ ] Verify PM2 starts on system reboot (test with `sudo reboot`)

### Backups
- [ ] State file backup strategy in place
- [ ] Configuration backup created (`tar -czf config-backup.tar.gz .env config/ ecosystem.config.js`)
- [ ] Backup location documented

### Documentation
- [ ] Webhook URL documented for team
- [ ] User mapping process documented
- [ ] On-call escalation path defined
- [ ] Troubleshooting runbook reviewed

### Team Handoff
- [ ] Team trained on PM2 commands (`start`, `stop`, `restart`, `logs`)
- [ ] Emergency contact information shared
- [ ] Access credentials distributed (if applicable)
- [ ] Monitoring dashboards shared

---

## Ongoing Maintenance

### Daily
- [ ] Quick log check: `pm2 logs github-pr-notifier --lines 20`
- [ ] Uptime monitoring check (email/Slack alerts should be working)

### Weekly
- [ ] Review error logs: `pm2 logs github-pr-notifier --err --lines 100`
- [ ] Check restart count: `pm2 info github-pr-notifier`
- [ ] Verify webhook deliveries in GitHub
- [ ] Check disk space: `df -h` (Linux/Mac) or `dir` (Windows)

### Monthly
- [ ] Update dependencies: `yarn upgrade --latest`
- [ ] Run tests after updates: `yarn test`
- [ ] Rebuild: `yarn build`
- [ ] Zero-downtime reload: `pm2 reload github-pr-notifier`
- [ ] Review log rotation settings
- [ ] Clean up old log files
- [ ] Backup state files

### Quarterly
- [ ] Review user mappings for accuracy
- [ ] Update Discord bot permissions if needed
- [ ] Review and update monitoring thresholds
- [ ] Performance review (memory, CPU, restart count)
- [ ] Security audit (update secrets, review permissions)

---

## Troubleshooting Reference

### Common Issues

| Symptom | Quick Fix |
|---------|-----------|
| Application won't start | Check `.env` file exists and is valid |
| Webhooks not received | Verify tunnel is running and GitHub webhook URL is correct |
| Discord messages not sent | Check `DISCORD_BOT_TOKEN` and bot permissions |
| High memory usage | Restart: `pm2 restart github-pr-notifier` |
| Frequent restarts | Check error logs: `pm2 logs github-pr-notifier --err` |

### Emergency Contacts

Document your emergency contacts here:

- **Primary On-Call**: _________________
- **Secondary On-Call**: _________________
- **Discord Server Admin**: _________________
- **GitHub Repo Admin**: _________________

### Key URLs

Document your production URLs here:

- **Health Check**: http://localhost:3000/health
- **Webhook URL**: _________________
- **Uptime Monitor**: _________________
- **PM2 Dashboard**: _________________

---

## Sign-Off

Deployment completed by: _________________ Date: _________________

Verified by: _________________ Date: _________________

Production approved: _________________ Date: _________________

---

**Next Steps After Successful Deployment:**

1. Monitor for 24-48 hours
2. Fine-tune log levels if too verbose
3. Set up automated backups
4. Consider future enhancements (see README.md)

**Congratulations! Your GitHub PR Notifier is now in production! 🎉**
