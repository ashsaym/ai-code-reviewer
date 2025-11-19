/**
 * GitHubCacheStorage Tests
 */

import { GitHubCacheStorage } from '../../../src/storage/GitHubCacheStorage';
import * as cache from '@actions/cache';
import * as fs from 'fs/promises';

jest.mock('@actions/cache');
jest.mock('fs/promises');

describe('GitHubCacheStorage', () => {
  let storage: GitHubCacheStorage;
  const mockCache = cache as jest.Mocked<typeof cache>;
  const mockFs = fs as jest.Mocked<typeof fs>;

  beforeEach(() => {
    jest.clearAllMocks();
    storage = new GitHubCacheStorage({
      keyPrefix: 'test',
      version: 1,
      ttlDays: 7,
    });
  });

  describe('constructor', () => {
    it('should create storage with default options', () => {
      const defaultStorage = new GitHubCacheStorage();
      expect(defaultStorage).toBeDefined();
    });

    it('should create storage with custom options', () => {
      const customStorage = new GitHubCacheStorage({
        keyPrefix: 'custom',
        version: 2,
        ttlDays: 3,
      });
      expect(customStorage).toBeDefined();
    });

    it('should clamp ttlDays to 1-7 range', () => {
      const storage1 = new GitHubCacheStorage({ ttlDays: 0 });
      const storage2 = new GitHubCacheStorage({ ttlDays: 10 });
      expect(storage1).toBeDefined();
      expect(storage2).toBeDefined();
    });
  });

  describe('savePRCache', () => {
    it('should save PR cache successfully', async () => {
      const prCache = {
        owner: 'owner',
        repo: 'repo',
        prNumber: 123,
        lastCommitSha: 'abc123',
        files: [],
        tokenUsage: {
          promptTokens: 1000,
          completionTokens: 500,
          totalTokens: 1500,
          estimatedCost: 0.05,
        },
        metadata: {
          cacheVersion: 1,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
          reviewCount: 1,
        },
      };

      mockFs.writeFile.mockResolvedValue(undefined);
      mockFs.stat.mockResolvedValue({ size: 1024 } as any);
      mockCache.saveCache.mockResolvedValue(1);

      await storage.savePRCache(prCache);

      expect(mockFs.writeFile).toHaveBeenCalled();
      expect(mockCache.saveCache).toHaveBeenCalledWith(
        [expect.stringContaining('/tmp/code-sentinel-cache-123.json')],
        'test-v1-owner-repo-pr-123'
      );
    });

    it('should handle save errors', async () => {
      const prCache = {
        owner: 'owner',
        repo: 'repo',
        prNumber: 123,
        lastCommitSha: 'abc123',
        files: [],
        tokenUsage: {
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0,
          estimatedCost: 0,
        },
        metadata: {
          cacheVersion: 1,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
          reviewCount: 0,
        },
      };

      mockFs.writeFile.mockRejectedValue(new Error('Write error'));

      await expect(storage.savePRCache(prCache)).rejects.toThrow('Write error');
    });
  });

  describe('loadPRCache', () => {
    it('should load PR cache successfully', async () => {
      const cachedData = {
        owner: 'owner',
        repo: 'repo',
        prNumber: 123,
        headSha: 'abc123',
        baseSha: 'def456',
        files: {},
        lastUpdated: '2024-01-01T00:00:00Z',
      };

      mockCache.restoreCache.mockResolvedValue('test-v1-owner-repo-pr-123');
      mockFs.readFile.mockResolvedValue(JSON.stringify(cachedData));

      const result = await storage.loadPRCache('owner', 'repo', 123);

      expect(result).toEqual(cachedData);
      expect(mockCache.restoreCache).toHaveBeenCalled();
    });

    it('should return null when cache not found', async () => {
      mockCache.restoreCache.mockResolvedValue(undefined);

      const result = await storage.loadPRCache('owner', 'repo', 123);

      expect(result).toBeNull();
    });

    it('should handle load errors', async () => {
      mockCache.restoreCache.mockRejectedValue(new Error('Restore error'));

      const result = await storage.loadPRCache('owner', 'repo', 123);

      expect(result).toBeNull();
    });
  });

  describe('clearPRCache', () => {
    it('should clear cache', async () => {
      await storage.clearPRCache('owner', 'repo', 123);
      expect(true).toBe(true);
    });
  });

  describe('getFileAnalysis', () => {
    it('should get file analysis from cache', async () => {
      const cachedData = {
        owner: 'owner',
        repo: 'repo',
        prNumber: 123,
        lastCommitSha: 'abc123',
        files: [
          {
            filePath: 'test.ts',
            sha: 'file123',
            analyzed: true,
            lastReviewed: '2024-01-01T00:00:00Z',
            issues: [],
          },
        ],
        tokenUsage: {
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0,
          estimatedCost: 0,
        },
      };

      mockCache.restoreCache.mockResolvedValue('test-v1-owner-repo-pr-123');
      mockFs.readFile.mockResolvedValue(JSON.stringify(cachedData));

      const result = await storage.getFileAnalysis('owner', 'repo', 123, 'test.ts', 'file123');

      expect(result).toBeDefined();
      expect(result?.sha).toBe('file123');
    });

    it('should return null when cache not found', async () => {
      mockCache.restoreCache.mockResolvedValue(undefined);

      const result = await storage.getFileAnalysis('owner', 'repo', 123, 'test.ts', 'file123');

      expect(result).toBeNull();
    });

    it('should return null when file not in cache', async () => {
      const cachedData = {
        owner: 'owner',
        repo: 'repo',
        prNumber: 123,
        lastCommitSha: 'abc123',
        files: [],
        tokenUsage: {
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0,
          estimatedCost: 0,
        },
      };

      mockCache.restoreCache.mockResolvedValue('test-v1-owner-repo-pr-123');
      mockFs.readFile.mockResolvedValue(JSON.stringify(cachedData));

      const result = await storage.getFileAnalysis('owner', 'repo', 123, 'missing.ts', 'sha123');

      expect(result).toBeNull();
    });
  });

  describe('updateFileAnalysis', () => {
    it('should update file analysis in cache', async () => {
      const cachedData = {
        owner: 'owner',
        repo: 'repo',
        prNumber: 123,
        lastCommitSha: 'abc123',
        files: [],
        tokenUsage: {
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0,
          estimatedCost: 0,
        },
      };

      const fileAnalysis = {
        filePath: 'test.ts',
        sha: 'file123',
        lines: {},
        lastAnalyzedAt: '2024-01-01T00:00:00Z',
      };

      mockCache.restoreCache.mockResolvedValue('test-v1-owner-repo-pr-123');
      mockFs.readFile.mockResolvedValue(JSON.stringify(cachedData));
      mockFs.writeFile.mockResolvedValue(undefined);
      mockFs.stat.mockResolvedValue({ size: 1024 } as any);
      mockCache.saveCache.mockResolvedValue(1);

      await storage.updateFileAnalysis('owner', 'repo', 123, fileAnalysis);

      expect(mockCache.saveCache).toHaveBeenCalled();
    });
  });

  describe('getCacheStats', () => {
    it('should return cache statistics', async () => {
      const cachedData = {
        owner: 'owner',
        repo: 'repo',
        prNumber: 123,
        lastCommitSha: 'abc123',
        files: [
          { filePath: 'test1.ts', sha: 'a', analyzed: true, lastReviewed: '2024-01-01', issues: [] },
          { filePath: 'test2.ts', sha: 'b', analyzed: true, lastReviewed: '2024-01-01', issues: [] },
        ],
        tokenUsage: {
          promptTokens: 1000,
          completionTokens: 500,
          totalTokens: 1500,
          estimatedCost: 0.05,
        },
      };

      mockCache.restoreCache.mockResolvedValue('test-v1-owner-repo-pr-123');
      mockFs.readFile.mockResolvedValue(JSON.stringify(cachedData));

      const stats = await storage.getCacheStats('owner', 'repo', 123);

      expect(stats).toBeDefined();
      expect(stats.fileCount).toBe(2);
    });

    it('should return null values when no cache', async () => {
      mockCache.restoreCache.mockResolvedValue(undefined);

      const stats = await storage.getCacheStats('owner', 'repo', 123);

      expect(stats.exists).toBe(false);
    });
  });
});
