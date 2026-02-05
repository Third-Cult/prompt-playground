const crypto = require('crypto');

const secret = 'test-secret-123';
const payload = JSON.stringify({
  action: 'opened',
  pull_request: {
    number: 123,
    title: 'Test PR',
    user: { login: 'testuser' }
  }
});

// Generate valid signature
const hmac = crypto.createHmac('sha256', secret);
hmac.update(payload);
const signature = `sha256=${hmac.digest('hex')}`;

// Send webhook
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