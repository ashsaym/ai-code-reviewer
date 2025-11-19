/**
 * CheckRunStorage Tests
 */

import { CheckRunStorage } from '../../../src/storage/CheckRunStorage';

describe('CheckRunStorage', () => {
  let storage: CheckRunStorage;
  let mockOctokit: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockOctokit = {
      checks: {
        create: jest.fn(),
        update: jest.fn(),
        listForRef: jest.fn(),
        get: jest.fn(),
      },
    };

    storage = new CheckRunStorage({
      octokit: mockOctokit,
      owner: 'owner',
      repo: 'repo',
      checkName: 'Test Check',
    });
  });

  describe('constructor', () => {
    it('should create storage with options', () => {
      expect(storage).toBeDefined();
    });

    it('should use default check name if not provided', () => {
      const defaultStorage = new CheckRunStorage({
        octokit: mockOctokit,
        owner: 'owner',
        repo: 'repo',
      });
      expect(defaultStorage).toBeDefined();
    });
  });

  describe('createCheckRun', () => {
    it('should create a new check run', async () => {
      const mockResponse = {
        data: {
          id: 12345,
          name: 'Test Check',
          head_sha: 'abc123',
          status: 'in_progress',
          started_at: '2024-01-01T00:00:00Z',
        },
      };
      mockOctokit.checks.create.mockResolvedValue(mockResponse);

      const result = await storage.createCheckRun('abc123', 123);

      expect(result.id).toBe(12345);
      expect(result.headSha).toBe('abc123');
      expect(result.status).toBe('in_progress');
      expect(mockOctokit.checks.create).toHaveBeenCalledWith({
        owner: 'owner',
        repo: 'repo',
        name: 'Test Check',
        head_sha: 'abc123',
        status: 'in_progress',
        started_at: expect.any(String),
        output: {
          title: 'Code Sentinel AI Review',
          summary: '🛡️ Analyzing PR #123...',
        },
      });
    });

    it('should handle errors', async () => {
      mockOctokit.checks.create.mockRejectedValue(new Error('API error'));

      await expect(storage.createCheckRun('abc123', 123)).rejects.toThrow('API error');
    });
  });

  describe('updateCheckRun', () => {
    it('should update check run with success', async () => {
      mockOctokit.checks.update.mockResolvedValue({ data: {} });

      await storage.updateCheckRun(12345, 'completed', 'success', {
        title: 'Review Complete',
        summary: 'All checks passed',
      });

      expect(mockOctokit.checks.update).toHaveBeenCalledWith(
        expect.objectContaining({
          owner: 'owner',
          repo: 'repo',
          check_run_id: 12345,
          status: 'completed',
          conclusion: 'success',
          output: {
            title: 'Review Complete',
            summary: 'All checks passed',
          },
        })
      );
    });

    it('should update check run with failure', async () => {
      mockOctokit.checks.update.mockResolvedValue({ data: {} });

      await storage.updateCheckRun(12345, 'completed', 'failure', {
        title: 'Review Failed',
        summary: 'Issues found',
      });

      expect(mockOctokit.checks.update).toHaveBeenCalled();
    });

    it('should handle update errors', async () => {
      mockOctokit.checks.update.mockRejectedValue(new Error('Update failed'));

      await expect(
        storage.updateCheckRun(12345, 'completed', 'success')
      ).rejects.toThrow('Update failed');
    });
  });

  describe('getCheckRun', () => {
    it('should get check run by id', async () => {
      mockOctokit.checks.get.mockResolvedValue({
        data: {
          id: 12345,
          name: 'Test Check',
          head_sha: 'abc123',
          status: 'completed',
          conclusion: 'success',
          started_at: '2024-01-01T00:00:00Z',
          completed_at: '2024-01-01T00:01:00Z',
          output: {
            title: 'Complete',
            summary: 'Done',
          },
        },
      });

      const result = await storage.getCheckRun(12345);

      expect(result).toBeDefined();
      if (result) {
        expect(result.id).toBe(12345);
        expect(result.status).toBe('completed');
        expect(result.conclusion).toBe('success');
      }
    });

    it('should return null on get errors', async () => {
      mockOctokit.checks.get.mockRejectedValue(new Error('Not found'));

      const result = await storage.getCheckRun(12345);

      expect(result).toBeNull();
    });
  });

  describe('listCheckRuns', () => {
    it('should list check runs for ref', async () => {
      mockOctokit.checks.listForRef.mockResolvedValue({
        data: {
          check_runs: [
            {
              id: 1,
              name: 'Test Check',
              head_sha: 'abc123',
              status: 'completed',
              conclusion: 'success',
              started_at: '2024-01-01T00:00:00Z',
              completed_at: '2024-01-01T00:01:00Z',
            },
            {
              id: 2,
              name: 'Test Check',
              head_sha: 'abc123',
              status: 'completed',
              conclusion: 'failure',
              started_at: '2024-01-01T00:02:00Z',
              completed_at: '2024-01-01T00:03:00Z',
            },
          ],
        },
      });

      const results = await storage.listCheckRuns('abc123');

      expect(results).toHaveLength(2);
      expect(results[0].id).toBe(1);
      expect(results[1].id).toBe(2);
    });

    it('should return empty array if no check runs', async () => {
      mockOctokit.checks.listForRef.mockResolvedValue({
        data: { check_runs: [] },
      });

      const results = await storage.listCheckRuns('abc123');

      expect(results).toHaveLength(0);
    });

    it('should return empty array on list errors', async () => {
      mockOctokit.checks.listForRef.mockRejectedValue(new Error('List failed'));

      const result = await storage.listCheckRuns('abc123');

      expect(result).toEqual([]);
    });
  });

  describe('addAnnotations', () => {
    it('should add annotations to check run', async () => {
      mockOctokit.checks.update.mockResolvedValue({ data: {} });

      const annotations = [
        {
          path: 'test.ts',
          startLine: 10,
          endLine: 10,
          annotationLevel: 'warning' as const,
          message: 'Warning message',
        },
        {
          path: 'test.ts',
          startLine: 20,
          endLine: 20,
          annotationLevel: 'failure' as const,
          message: 'Error message',
        },
      ];

      await storage.addAnnotations(12345, annotations);

      expect(mockOctokit.checks.update).toHaveBeenCalled();
    });

    it('should handle batch annotations (> 50)', async () => {
      mockOctokit.checks.update.mockResolvedValue({ data: {} });

      const annotations = Array.from({ length: 75 }, (_, i) => ({
        path: 'test.ts',
        startLine: i + 1,
        endLine: i + 1,
        annotationLevel: 'warning' as const,
        message: `Warning ${i}`,
      }));

      await storage.addAnnotations(12345, annotations);

      // Should be called at least once
      expect(mockOctokit.checks.update).toHaveBeenCalled();
    });
  });

  describe('createReviewSession', () => {
    it('should create review session', async () => {
      mockOctokit.checks.create.mockResolvedValue({
        data: {
          id: 12345,
          name: 'Test Check',
          head_sha: 'abc123',
          status: 'in_progress',
          started_at: '2024-01-01T00:00:00Z',
        },
      });

      const result = await storage.createReviewSession(
        'abc123',
        123,
        'test-session',
        {
          filesReviewed: 5,
          linesReviewed: 100,
          issuesFound: 2,
          warningsFound: 3,
          suggestionsFound: 1,
          tokenUsage: {
            promptTokens: 1000,
            completionTokens: 500,
            totalTokens: 1500,
            estimatedCost: 0.05,
          },
        },
        {
          provider: 'openai',
          model: 'gpt-4',
          version: '1.0.0',
          startedAt: '2024-01-01T00:00:00Z',
          completedAt: '2024-01-01T00:01:00Z',
          durationMs: 60000,
        }
      );

      expect(result).toBeDefined();
      expect(result.sessionId).toBe('test-session');
      expect(result.prNumber).toBe(123);
      expect(mockOctokit.checks.create).toHaveBeenCalled();
    });
  });

  describe('completeCheckRun', () => {
    it('should complete check run successfully', async () => {
      mockOctokit.checks.update.mockResolvedValue({ data: {} });

      await storage.completeCheckRun(12345, 'success', 'All checks passed');

      expect(mockOctokit.checks.update).toHaveBeenCalledWith({
        owner: 'owner',
        repo: 'repo',
        check_run_id: 12345,
        status: 'completed',
        conclusion: 'success',
        completed_at: expect.any(String),
        output: expect.objectContaining({
          title: expect.any(String),
          summary: 'All checks passed',
        }),
      });
    });

    it('should complete check run with failure', async () => {
      mockOctokit.checks.update.mockResolvedValue({ data: {} });

      await storage.completeCheckRun(12345, 'failure', 'Issues found');

      expect(mockOctokit.checks.update).toHaveBeenCalled();
    });
  });
});
