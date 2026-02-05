const crypto = require('crypto');

// Use the same secret from your .env file
const secret = '46a641ca49acea4c165fc8f28184af97'; // Must match GITHUB_WEBHOOK_SECRET in .env

// Complete GitHub webhook payload (matches real GitHub format)
const payload = JSON.stringify({
  action: 'opened',
  number: 123,
  pull_request: {
    number: 123,
    title: 'Test PR: Add amazing feature',
    body: 'This is a test PR to verify the webhook integration is working correctly.',
    draft: false,
    user: {
      login: 'testuser'
    },
    head: {
      ref: 'feature/test-webhook'
    },
    base: {
      ref: 'main'
    },
    html_url: 'https://github.com/test-owner/test-repo/pull/123',
    requested_reviewers: [
      { login: 'reviewer1' },
      { login: 'reviewer2' }
    ],
    merged: false
  },
  repository: {
    name: 'test-repo',
    owner: {
      login: 'test-owner'
    }
  }
});

// Generate valid signature
const hmac = crypto.createHmac('sha256', secret);
hmac.update(payload);
const signature = `sha256=${hmac.digest('hex')}`;

// Send webhook (update URL if using tunnel)
fetch('http://localhost:3000/webhook/github', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-GitHub-Event': 'pull_request',
    'X-GitHub-Delivery': 'test-delivery-123',
    'X-Hub-Signature-256': signature,
  },
  body: payload,
})
  .then(res => res.json())
  .then(data => console.log('Success:', data))
  .catch(err => console.error('Error:', err));