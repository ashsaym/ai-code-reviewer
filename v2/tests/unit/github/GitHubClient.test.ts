/**
 * GitHubClient Tests
 */

import { GitHubClient } from '../../../src/github/GitHubClient';

describe('GitHubClient', () => {
  let client: GitHubClient;
  let mockOctokit: any;

  beforeEach(() => {
    client = new GitHubClient({
      token: 'test-token',
      owner: 'owner',
      repo: 'repo',
    });

    // Mock octokit for testing methods
    mockOctokit = client.getOctokit();
    
    mockOctokit.users = {
      getAuthenticated: jest.fn(),
    };
    
    mockOctokit.repos = {
      get: jest.fn(),
      getContent: jest.fn(),
      getCommit: jest.fn(),
      compareCommits: jest.fn(),
    };

    mockOctokit.pulls = {
      list: jest.fn(),
    };

    mockOctokit.rateLimit = {
      get: jest.fn(),
    };

    mockOctokit.git = {
      getBlob: jest.fn(),
    };

    mockOctokit.search = {
      code: jest.fn(),
    };
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

  describe('getRepoInfo', () => {
    it('should return repo info', () => {
      const info = client.getRepoInfo();
      expect(info.owner).toBe('owner');
      expect(info.repo).toBe('repo');
    });
  });

  describe('getAuthenticatedUser', () => {
    it('should return authenticated user', async () => {
      mockOctokit.users.getAuthenticated.mockResolvedValue({
        data: { login: 'test-user' },
      });

      const user = await client.getAuthenticatedUser();
      expect(user).toBe('test-user');
    });

    it('should return bot name on error', async () => {
      mockOctokit.users.getAuthenticated.mockRejectedValue(new Error('Auth failed'));

      const user = await client.getAuthenticatedUser();
      expect(user).toBe('github-actions[bot]');
    });
  });

  describe('checkPermissions', () => {
    it('should return true for all permissions when successful', async () => {
      mockOctokit.repos.get.mockResolvedValue({ data: {} });
      mockOctokit.pulls.list.mockResolvedValue({ data: [] });

      const permissions = await client.checkPermissions();
      
      expect(permissions.hasContentsRead).toBe(true);
      expect(permissions.hasPullRequestsWrite).toBe(true);
      expect(permissions.hasChecksWrite).toBe(true);
    });

    it('should return false on error', async () => {
      mockOctokit.repos.get.mockRejectedValue(new Error('Permission denied'));

      const permissions = await client.checkPermissions();
      
      expect(permissions.hasContentsRead).toBe(false);
      expect(permissions.hasPullRequestsWrite).toBe(false);
      expect(permissions.hasChecksWrite).toBe(false);
    });
  });

  describe('getRateLimit', () => {
    it('should return rate limit info', async () => {
      mockOctokit.rateLimit.get.mockResolvedValue({
        data: {
          rate: {
            limit: 5000,
            remaining: 4999,
            reset: 1234567890,
            used: 1,
          },
        },
      });

      const rateLimit = await client.getRateLimit();
      
      expect(rateLimit.limit).toBe(5000);
      expect(rateLimit.remaining).toBe(4999);
      expect(rateLimit.used).toBe(1);
      expect(rateLimit.reset).toBeInstanceOf(Date);
    });
  });

  describe('getRepository', () => {
    it('should return repository details', async () => {
      mockOctokit.repos.get.mockResolvedValue({
        data: {
          full_name: 'owner/repo',
          default_branch: 'main',
          private: false,
          language: 'TypeScript',
        },
      });

      const repo = await client.getRepository();
      
      expect(repo.fullName).toBe('owner/repo');
      expect(repo.defaultBranch).toBe('main');
      expect(repo.isPrivate).toBe(false);
      expect(repo.language).toBe('TypeScript');
    });
  });

  describe('getFileContent', () => {
    it('should return file content', async () => {
      const encodedContent = Buffer.from('console.log("Hello");').toString('base64');
      
      mockOctokit.repos.getContent.mockResolvedValue({
        data: {
          content: encodedContent,
        },
      });

      const content = await client.getFileContent('test.ts');
      expect(content).toBe('console.log("Hello");');
    });

    it('should return null for non-file content', async () => {
      mockOctokit.repos.getContent.mockResolvedValue({
        data: [],
      });

      const content = await client.getFileContent('dir/');
      expect(content).toBeNull();
    });

    it('should return null on error', async () => {
      mockOctokit.repos.getContent.mockRejectedValue(new Error('Not found'));

      const content = await client.getFileContent('missing.ts');
      expect(content).toBeNull();
    });
  });

  describe('fileExists', () => {
    it('should return true if file exists', async () => {
      mockOctokit.repos.getContent.mockResolvedValue({ data: {} });

      const exists = await client.fileExists('test.ts');
      expect(exists).toBe(true);
    });

    it('should return false if file does not exist', async () => {
      mockOctokit.repos.getContent.mockRejectedValue(new Error('Not found'));

      const exists = await client.fileExists('missing.ts');
      expect(exists).toBe(false);
    });
  });

  describe('getCommit', () => {
    it('should return commit details', async () => {
      mockOctokit.repos.getCommit.mockResolvedValue({
        data: {
          sha: 'abc123',
          commit: {
            message: 'Test commit',
            author: {
              name: 'Test User',
              date: '2024-01-01T00:00:00Z',
            },
          },
          parents: [{ sha: 'parent123' }],
        },
      });

      const commit = await client.getCommit('abc123');
      
      expect(commit.sha).toBe('abc123');
      expect(commit.message).toBe('Test commit');
      expect(commit.author).toBe('Test User');
      expect(commit.parents).toEqual(['parent123']);
    });
  });

  describe('compareCommits', () => {
    it('should return comparison results', async () => {
      mockOctokit.repos.compareCommits.mockResolvedValue({
        data: {
          ahead_by: 5,
          behind_by: 0,
          files: [
            {
              filename: 'test.ts',
              status: 'modified',
              additions: 10,
              deletions: 5,
              changes: 15,
              patch: '+new line',
            },
          ],
        },
      });

      const comparison = await client.compareCommits('base', 'head');
      
      expect(comparison.ahead).toBe(5);
      expect(comparison.behind).toBe(0);
      expect(comparison.files).toHaveLength(1);
      expect(comparison.files[0].filename).toBe('test.ts');
    });
  });

  describe('getBlob', () => {
    it('should return blob content', async () => {
      const encodedContent = Buffer.from('blob content').toString('base64');
      
      mockOctokit.git.getBlob.mockResolvedValue({
        data: {
          content: encodedContent,
        },
      });

      const content = await client.getBlob('blob-sha');
      expect(content).toBe('blob content');
    });
  });

  describe('searchCode', () => {
    it('should return search results', async () => {
      mockOctokit.search.code.mockResolvedValue({
        data: {
          items: [
            {
              path: 'src/test.ts',
              sha: 'file-sha',
              html_url: 'https://github.com/owner/repo/blob/main/src/test.ts',
            },
          ],
        },
      });

      const results = await client.searchCode('function test');
      
      expect(results).toHaveLength(1);
      expect(results[0].path).toBe('src/test.ts');
    });

    it('should return empty array on error', async () => {
      mockOctokit.search.code.mockRejectedValue(new Error('Search failed'));

      const results = await client.searchCode('query');
      expect(results).toEqual([]);
    });
  });
});
