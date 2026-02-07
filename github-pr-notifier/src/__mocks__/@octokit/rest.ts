/**
 * Mock for @octokit/rest and @octokit/app
 * Used in tests to avoid ESM import issues and actual API calls
 */

const mockPulls = {
  get: jest.fn(),
  listRequestedReviewers: jest.fn(),
};

export class Octokit {
  pulls = mockPulls;

  constructor(_options?: any) {
    // Mock constructor - reuse same mock instance for all instances
    this.pulls = mockPulls;
  }
}

// Mock for @octokit/app
export class App {
  constructor(_options?: any) {
    // Mock constructor
  }

  getInstallationOctokit(_installationId: number): Octokit {
    return new Octokit();
  }
}

// Export mock for easy access in tests
export const getMockOctokit = () => ({
  pulls: mockPulls,
});
