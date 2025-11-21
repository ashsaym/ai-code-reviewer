/**
 * PullRequestService Tests
 */

import { PullRequestService } from '../../../src/github/PullRequestService';

describe('PullRequestService', () => {
  let service: PullRequestService;
  let mockOctokit: any;

  beforeEach(() => {
    mockOctokit = {
      pulls: {
        get: jest.fn(),
        listFiles: jest.fn(),
        listCommits: jest.fn(),
        update: jest.fn(),
        createReviewRequest: jest.fn(),
        requestReviewers: jest.fn(),
        removeRequestedReviewers: jest.fn(),
        merge: jest.fn(),
      },
      issues: {
        addLabels: jest.fn(),
        removeLabel: jest.fn(),
        update: jest.fn(),
        listLabelsOnIssue: jest.fn(),
      },
      repos: {
        getContent: jest.fn(),
        compareCommits: jest.fn(),
      },
    };

    service = new PullRequestService({
      octokit: mockOctokit,
      owner: 'test-owner',
      repo: 'test-repo',
    });
  });

  describe('constructor', () => {
    it('should create service with valid options', () => {
      expect(service).toBeDefined();
    });
  });

  describe('getPullRequest', () => {
    it('should get pull request details with files', async () => {
      const mockPRResponse = {
        data: {
          number: 1,
          title: 'Test PR',
          body: 'Test description',
          state: 'open',
          head: {
            sha: 'head-sha',
            ref: 'feature-branch',
          },
          base: {
            sha: 'base-sha',
            ref: 'main',
          },
          user: { login: 'test-user' },
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-02T00:00:00Z',
          mergeable: true,
          mergeable_state: 'clean',
          additions: 100,
          deletions: 50,
          changed_files: 5,
        },
      };

      const mockFilesResponse = {
        data: [
          {
            filename: 'src/test.ts',
            sha: 'file-sha',
            status: 'modified',
            additions: 20,
            deletions: 10,
            changes: 30,
            patch: '@@ -1,5 +1,5 @@',
            previous_filename: undefined,
          },
        ],
      };

      mockOctokit.pulls.get.mockResolvedValue(mockPRResponse);
      mockOctokit.pulls.listFiles.mockResolvedValue(mockFilesResponse);

      const result = await service.getPullRequest(1);

      expect(result).toEqual({
        number: 1,
        title: 'Test PR',
        body: 'Test description',
        state: 'open',
        headSha: 'head-sha',
        headRef: 'feature-branch',
        baseSha: 'base-sha',
        baseRef: 'main',
        author: 'test-user',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-02T00:00:00Z',
        mergeable: true,
        mergeableState: 'clean',
        files: [
          {
            filename: 'src/test.ts',
            sha: 'file-sha',
            status: 'modified',
            additions: 20,
            deletions: 10,
            changes: 30,
            patch: '@@ -1,5 +1,5 @@',
            previousFilename: undefined,
          },
        ],
        additions: 100,
        deletions: 50,
        changedFiles: 5,
      });
    });

    it('should handle null body', async () => {
      const mockPRResponse = {
        data: {
          number: 2,
          title: 'Test PR',
          body: null,
          state: 'open',
          head: { sha: 'head-sha', ref: 'feature' },
          base: { sha: 'base-sha', ref: 'main' },
          user: null,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-02T00:00:00Z',
          mergeable: null,
          mergeable_state: null,
          additions: null,
          deletions: null,
          changed_files: null,
        },
      };

      mockOctokit.pulls.get.mockResolvedValue(mockPRResponse);
      mockOctokit.pulls.listFiles.mockResolvedValue({ data: [] });

      const result = await service.getPullRequest(2);

      expect(result.body).toBe('');
      expect(result.author).toBe('unknown');
      expect(result.mergeable).toBeNull();
      expect(result.mergeableState).toBe('unknown');
      expect(result.additions).toBe(0);
      expect(result.deletions).toBe(0);
      expect(result.changedFiles).toBe(0);
    });

    it('should throw error on failure', async () => {
      mockOctokit.pulls.get.mockRejectedValue(new Error('PR not found'));

      await expect(service.getPullRequest(999)).rejects.toThrow('PR not found');
    });
  });

  describe('getFiles', () => {
    it('should get all files with pagination', async () => {
      const mockPage1 = {
        data: Array(100).fill(null).map((_, i) => ({
          filename: `file${i}.ts`,
          sha: `sha${i}`,
          status: 'modified',
          additions: 5,
          deletions: 2,
          changes: 7,
          patch: '@@ patch',
        })),
      };

      const mockPage2 = {
        data: [
          {
            filename: 'file100.ts',
            sha: 'sha100',
            status: 'added',
            additions: 10,
            deletions: 0,
            changes: 10,
            patch: '@@ patch',
          },
        ],
      };

      mockOctokit.pulls.listFiles
        .mockResolvedValueOnce(mockPage1)
        .mockResolvedValueOnce(mockPage2);

      const result = await service.getFiles(1);

      expect(result).toHaveLength(101);
      expect(mockOctokit.pulls.listFiles).toHaveBeenCalledTimes(2);
    });

    it('should handle empty files', async () => {
      mockOctokit.pulls.listFiles.mockResolvedValue({ data: [] });

      const result = await service.getFiles(1);

      expect(result).toEqual([]);
    });

    it('should handle files with previous filename', async () => {
      const mockResponse = {
        data: [
          {
            filename: 'new-name.ts',
            sha: 'sha',
            status: 'renamed',
            additions: 0,
            deletions: 0,
            changes: 0,
            patch: undefined,
            previous_filename: 'old-name.ts',
          },
        ],
      };

      mockOctokit.pulls.listFiles.mockResolvedValue(mockResponse);

      const result = await service.getFiles(1);

      expect(result[0].previousFilename).toBe('old-name.ts');
    });

    it('should throw error on failure', async () => {
      mockOctokit.pulls.listFiles.mockRejectedValue(new Error('API error'));

      await expect(service.getFiles(1)).rejects.toThrow('API error');
    });
  });

  describe('getCommits', () => {
    it('should get all commits in PR', async () => {
      const mockResponse = {
        data: [
          {
            sha: 'commit1',
            commit: {
              message: 'First commit',
              author: {
                name: 'User 1',
                date: '2024-01-01T00:00:00Z',
              },
            },
          },
          {
            sha: 'commit2',
            commit: {
              message: 'Second commit',
              author: {
                name: 'User 2',
                date: '2024-01-02T00:00:00Z',
              },
            },
          },
        ],
      };

      mockOctokit.pulls.listCommits.mockResolvedValue(mockResponse);

      const result = await service.getCommits(1);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        sha: 'commit1',
        message: 'First commit',
        author: 'User 1',
        date: '2024-01-01T00:00:00Z',
      });
    });

    it('should handle missing author info', async () => {
      const mockResponse = {
        data: [
          {
            sha: 'commit3',
            commit: {
              message: 'Third commit',
              author: null,
            },
          },
        ],
      };

      mockOctokit.pulls.listCommits.mockResolvedValue(mockResponse);

      const result = await service.getCommits(1);

      expect(result[0].author).toBe('unknown');
      expect(new Date(result[0].date)).toBeInstanceOf(Date);
    });

    it('should throw error on failure', async () => {
      mockOctokit.pulls.listCommits.mockRejectedValue(new Error('API error'));

      await expect(service.getCommits(1)).rejects.toThrow('API error');
    });
  });

  describe('getDiff', () => {
    it('should get PR diff', async () => {
      const mockDiff = `diff --git a/file.ts b/file.ts
index abc123..def456 100644
--- a/file.ts
+++ b/file.ts
@@ -1,3 +1,3 @@
-old line
+new line`;

      mockOctokit.pulls.get.mockResolvedValue({ data: mockDiff });

      const result = await service.getDiff(1);

      expect(result).toBe(mockDiff);
      expect(mockOctokit.pulls.get).toHaveBeenCalledWith({
        owner: 'test-owner',
        repo: 'test-repo',
        pull_number: 1,
        mediaType: {
          format: 'diff',
        },
      });
    });

    it('should throw error on failure', async () => {
      mockOctokit.pulls.get.mockRejectedValue(new Error('API error'));

      await expect(service.getDiff(1)).rejects.toThrow('API error');
    });
  });

  describe('updateDescription', () => {
    it('should update PR description', async () => {
      mockOctokit.pulls.update.mockResolvedValue({});

      await service.updateDescription(1, 'New description');

      expect(mockOctokit.pulls.update).toHaveBeenCalledWith({
        owner: 'test-owner',
        repo: 'test-repo',
        pull_number: 1,
        body: 'New description',
      });
    });

    it('should throw error on failure', async () => {
      mockOctokit.pulls.update.mockRejectedValue(new Error('API error'));

      await expect(service.updateDescription(1, 'New')).rejects.toThrow(
        'API error'
      );
    });
  });

  describe('updatePullRequest', () => {
    it('should update PR title and body', async () => {
      mockOctokit.pulls.update.mockResolvedValue({});

      await service.updatePullRequest(1, { title: 'New title', body: 'New body' });

      expect(mockOctokit.pulls.update).toHaveBeenCalledWith({
        owner: 'test-owner',
        repo: 'test-repo',
        pull_number: 1,
        title: 'New title',
        body: 'New body',
      });
    });

    it('should throw error on failure', async () => {
      mockOctokit.pulls.update.mockRejectedValue(new Error('API error'));

      await expect(service.updatePullRequest(1, { title: 'New' })).rejects.toThrow('API error');
    });
  });

  describe('addLabels', () => {
    it('should add labels to PR', async () => {
      mockOctokit.issues.addLabels.mockResolvedValue({});

      await service.addLabels(1, ['bug', 'enhancement']);

      expect(mockOctokit.issues.addLabels).toHaveBeenCalledWith({
        owner: 'test-owner',
        repo: 'test-repo',
        issue_number: 1,
        labels: ['bug', 'enhancement'],
      });
    });

    it('should throw error on failure', async () => {
      mockOctokit.issues.addLabels.mockRejectedValue(new Error('API error'));

      await expect(service.addLabels(1, ['bug'])).rejects.toThrow('API error');
    });
  });

  describe('getLabels', () => {
    it('should get labels from PR', async () => {
      const mockResponse = {
        data: [
          { name: 'bug' },
          { name: 'enhancement' },
        ],
      };

      mockOctokit.issues.listLabelsOnIssue.mockResolvedValue(mockResponse);

      const result = await service.getLabels(1);

      expect(result).toEqual(['bug', 'enhancement']);
    });

    it('should return empty array on failure', async () => {
      mockOctokit.issues.listLabelsOnIssue.mockRejectedValue(new Error('API error'));

      const result = await service.getLabels(1);
      
      expect(result).toEqual([]);
    });
  });
});
