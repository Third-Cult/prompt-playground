/**
 * Mock for @octokit/app
 * Used in tests to avoid ESM import issues and actual API calls
 */

import { Octokit } from './rest';

export class App {
  constructor(_options?: any) {
    // Mock constructor
  }

  getInstallationOctokit(_installationId: number): Octokit {
    return new Octokit();
  }
}
