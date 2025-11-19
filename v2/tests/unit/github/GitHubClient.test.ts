/**
 * GitHubClient Tests
 */

import { GitHubClient } from '../../../src/github/GitHubClient';

describe('GitHubClient', () => {
  let client: GitHubClient;

  beforeEach(() => {
    client = new GitHubClient({
      token: 'test-token',
      owner: 'owner',
      repo: 'repo',
    });
  });

  describe('constructor', () => {
    it('should create client with valid config', () => {
      expect(client).toBeDefined();
    });

    it('should get octokit instance', () => {
      const octokit = client.getOctokit();
      expect(octokit).toBeDefined();
    });
  });

  describe('getOctokit', () => {
    it('should return octokit instance', () => {
      const octokit = client.getOctokit();
      expect(octokit).toBeDefined();
      expect(octokit.rest).toBeDefined();
    });
  });
});
