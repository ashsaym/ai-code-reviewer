/**
 * StorageManager Tests
 */

import { StorageManager } from '../../../src/storage/StorageManager';

// Mock all storage dependencies
jest.mock('../../../src/storage/GitHubCacheStorage');
jest.mock('../../../src/storage/CommentStateStorage');
jest.mock('../../../src/storage/CheckRunStorage');

describe('StorageManager', () => {
  let storage: StorageManager;
  let mockOctokit: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockOctokit = {
      rest: {
        repos: {
          getContent: jest.fn(),
          createOrUpdateFileContents: jest.fn(),
        },
        checks: {
          create: jest.fn(),
          update: jest.fn(),
        },
        pulls: {
          listReviewComments: jest.fn().mockResolvedValue({ data: [] }),
        },
        issues: {
          listComments: jest.fn().mockResolvedValue({ data: [] }),
        },
      },
    };

    storage = new StorageManager({
      octokit: mockOctokit,
      owner: 'owner',
      repo: 'repo',
      cacheOptions: { ttlDays: 7 },
      checkName: 'Code Sentinel AI',
      enableCheckRuns: true,
    });
  });

  describe('constructor', () => {
    it('should create storage manager', () => {
      expect(storage).toBeDefined();
    });

    it('should accept custom options', () => {
      const customStorage = new StorageManager({
        octokit: mockOctokit,
        owner: 'owner',
        repo: 'repo',
        cacheOptions: { ttlDays: 3 },
        checkName: 'Custom Check',
        enableCheckRuns: false,
      });

      expect(customStorage).toBeDefined();
    });
  });

  describe('loadPRState', () => {
    it('should load PR state from storage', async () => {
      const result = await storage.loadPRState(123);

      expect(result).toBeDefined();
      expect(result.cache).toBeDefined();
      expect(result.comments).toBeDefined();
    });
  });

  describe('savePRAnalysis', () => {
    it('should save PR analysis', async () => {
      const fileAnalyses = [
        {
          filePath: 'test.ts',
          sha: 'abc123',
          lines: {},
          lastAnalyzedAt: '2024-01-01',
        },
      ];
      
      const tokenUsage = {
        totalTokens: 1000,
        promptTokens: 800,
        completionTokens: 200,
        estimatedCost: 0.01,
      };

      await expect(storage.savePRAnalysis(123, 'abc123', fileAnalyses, tokenUsage)).resolves.not.toThrow();
    });
  });

  describe('getPRComments', () => {
    it('should get PR comments', async () => {
      const comments = await storage.getPRComments(123);

      expect(Array.isArray(comments)).toBe(true);
    });
  });
});
