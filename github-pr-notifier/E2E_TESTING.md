# End-to-End Testing Guide

## Overview

The E2E test suite (`src/e2e.test.ts`) provides comprehensive automated testing of the complete PR lifecycle without requiring real GitHub webhooks or Discord API access.

## What It Tests

The E2E tests simulate realistic PR workflows by:
1. Sending signed GitHub webhook payloads to the webhook server
2. Verifying all Discord service interactions (messages, threads, reactions, members)
3. Checking state changes through the public API
4. Following black-box testing principles (no implementation details)

## Test Scenarios

### Scenario 1: Simple PR Lifecycle (Open → Approve → Merge)
Tests the happy path:
- PR opened with reviewers
- Reviewer approves (✅ reaction added)
- PR merged (reactions updated: remove ✅, add 🎉)
- Thread locked

### Scenario 2: PR with Changes Requested
Tests review status transitions:
- PR opened
- Reviewer requests changes (🔴 reaction)
- Author fixes issues
- Reviewer approves (🔴 removed, ✅ added)

### Scenario 3: Reviewer Management
Tests reviewer add/remove:
- PR opened without reviewers
- Reviewer added (added to thread, tracked in state)
- Reviewer removed (removed from thread, tracking updated)

### Scenario 4: Complex Status Transitions
Tests all status changes:
- Draft PR opened
- Marked ready for review
- Changes requested
- Approved
- Closed (thread locked, 🚪 reaction)
- Reopened (thread unlocked, status recalculated, 🚪 removed, ✅ re-added)

### Scenario 5: Multiple Reviewers with Conflicting Reviews
Tests status priority:
- User 1 approves
- User 2 requests changes
- Verifies 'changes_requested' overrides 'approved'
- Only 🔴 reaction present (no ✅)

### Scenario 6: Review Dismissal
Tests review dismissal:
- PR opened, changes requested
- Review dismissed
- Status recalculated (back to 'ready_for_review')
- Reactions updated

## Running the Tests

### Run all E2E tests
```bash
yarn test e2e
```

### Run a specific scenario
```bash
yarn test e2e --testNamePattern="Scenario 1"
```

### Run with verbose output
```bash
yarn test e2e --verbose
```

## How It Works

### Architecture

The E2E tests follow these principles from `AGENTS.md` and `ARCHITECTURE.md`:

1. **Black-Box Testing**: Tests only the public webhook API
2. **Dependency Injection**: All services are injected and mocked
3. **No Implementation Details**: Tests verify behavior, not internal structure
4. **Realistic Payloads**: Uses accurate GitHub webhook formats

### Setup

```typescript
beforeAll(async () => {
  // Initialize services once for all tests
  githubService = new GitHubService();
  stateService = new InMemoryStateService();
  
  // Mock Discord service to verify calls
  mockDiscordService = {
    sendMessage: jest.fn().mockResolvedValue('msg-id'),
    editMessage: jest.fn().mockResolvedValue(undefined),
    addReaction: jest.fn().mockResolvedValue(undefined),
    // ...
  };
  
  // Load templates, create coordinators, initialize server
  // ...
});
```

### Test Pattern

Each test scenario follows this pattern:

```typescript
it('should handle complete lifecycle', async () => {
  // Step 1: Send webhook (e.g., PR opened)
  await sendWebhook('pull_request', { action: 'opened', ... });
  
  // Verify Discord operations
  expect(mockDiscordService.sendMessage).toHaveBeenCalledTimes(1);
  expect(mockDiscordService.createThread).toHaveBeenCalled();
  
  // Verify state
  const state = await stateService.getPRState(prNumber);
  expect(state?.status).toBe('ready_for_review');
  
  // Clear mocks for next step
  jest.clearAllMocks();
  
  // Step 2: Send next webhook...
});
```

### Helper Function

The `sendWebhook` helper creates properly signed webhook requests:

```typescript
const sendWebhook = async (event: string, payload: any) => {
  const payloadStr = JSON.stringify(payload);
  const signature = 'sha256=' + crypto
    .createHmac('sha256', testSecret)
    .update(payloadStr)
    .digest('hex');

  const response = await request(app)
    .post('/webhook/github')
    .set('x-github-event', event)
    .set('x-hub-signature-256', signature)
    .set('x-github-delivery', `delivery-${Date.now()}`)
    .send(payload);

  // Wait for async processing
  await new Promise(resolve => setTimeout(resolve, 100));
  
  return response;
};
```

## Benefits

### 1. No External Dependencies
- No need for real GitHub webhooks
- No Discord bot token required
- No internet connection needed
- Runs entirely in-memory

### 2. Fast and Reliable
- All tests complete in ~4 seconds
- No flaky network issues
- Deterministic results
- Parallel test execution safe

### 3. Comprehensive Coverage
- Tests all PR lifecycle events
- Verifies Discord API interactions
- Checks state management
- Validates reaction logic
- Confirms thread operations

### 4. Developer Friendly
- Clear test scenarios with descriptive names
- Realistic webhook payloads
- Detailed assertions
- Easy to add new scenarios

## Adding New Scenarios

To add a new test scenario:

1. Create a new `describe` block:
```typescript
describe('Scenario 7: Your Feature', () => {
  const prNumber = 1007;

  it('should handle your feature', async () => {
    // Send webhooks
    await sendWebhook('pull_request', { ... });
    
    // Verify behavior
    expect(mockDiscordService...).toHaveBeenCalled();
    
    // Check state
    const state = await stateService.getPRState(prNumber);
    expect(state?....).toBe(...);
  });
});
```

2. Use realistic GitHub webhook payloads (reference existing scenarios or GitHub docs)
3. Verify all relevant Discord operations
4. Check state changes
5. Run tests: `yarn test e2e`

## Integration with CI/CD

The E2E tests are part of the regular test suite and run automatically:

```bash
yarn test  # Runs all tests including E2E
```

No special setup or environment variables needed for E2E tests.

## Troubleshooting

### Tests failing after code changes?
- Check if Discord service method signatures changed
- Verify webhook payload structure matches code expectations
- Look for state model changes that affect assertions

### Need to see what's happening?
- Run with `--verbose` flag
- Check console logs (they show all INFO, DEBUG, ERROR messages)
- Add `console.log(state)` to inspect state at any point

### Adding new Discord operations?
1. Add mock method to `mockDiscordService` in `beforeAll`
2. Add method to `IDiscordService` interface
3. Implement in `DiscordService`
4. Add test assertions

## Comparison with Manual Testing

### Manual Testing (Before)
- Start webhook server (`yarn dev`)
- Configure ngrok tunnel
- Set up GitHub webhook
- Manually create PRs, reviews, etc.
- Verify Discord messages manually
- Repeat for each scenario
- **Time: ~30-60 minutes per full test cycle**

### E2E Testing (Now)
- Run `yarn test e2e`
- All scenarios tested automatically
- Clear pass/fail results
- **Time: ~4 seconds**

## Next Steps

Consider adding scenarios for:
- PR description editing
- Multiple simultaneous PRs
- Error handling (network failures, API errors)
- Rate limiting behavior
- Concurrent webhook deliveries
