/**
 * GitHub Actions Cache Storage
 * 
 * Uses GitHub Actions Cache API for storing PR analysis state
 * - 7-day retention (configurable 1-7 days)
 * - 10GB limit per repository
 * - LRU eviction when full
 */

import * as cache from '@actions/cache';
import * as core from '@actions/core';
import { PRCache, FileAnalysisCache } from './models';

export interface GitHubCacheStorageOptions {
  /** Cache key prefix */
  keyPrefix?: string;
  
  /** Cache version for invalidation */
  version?: number;
  
  /** TTL in days (1-7) */
  ttlDays?: number;
}

export class GitHubCacheStorage {
  private readonly keyPrefix: string;
  private readonly version: number;
  private readonly ttlDays: number;

  constructor(options: GitHubCacheStorageOptions = {}) {
    this.keyPrefix = options.keyPrefix || 'code-sentinel-ai';
    this.version = options.version || 1;
    this.ttlDays = Math.min(Math.max(options.ttlDays || 7, 1), 7);
  }

  /**
   * Generate cache key for a PR
   */
  private getCacheKey(owner: string, repo: string, prNumber: number): string {
    return `${this.keyPrefix}-v${this.version}-${owner}-${repo}-pr-${prNumber}`;
  }

  /**
   * Generate restore keys for fallback
   */
  private getRestoreKeys(owner: string, repo: string, prNumber: number): string[] {
    return [
      `${this.keyPrefix}-v${this.version}-${owner}-${repo}-pr-${prNumber}`,
      `${this.keyPrefix}-v${this.version}-${owner}-${repo}-pr-`,
      `${this.keyPrefix}-v${this.version}-${owner}-${repo}-`,
    ];
  }

  /**
   * Save PR cache
   */
  async savePRCache(prCache: PRCache): Promise<void> {
    const cacheKey = this.getCacheKey(prCache.owner, prCache.repo, prCache.prNumber);
    const cachePath = `/tmp/code-sentinel-cache-${prCache.prNumber}.json`;

    try {
      // Write cache to temp file
      const fs = await import('fs/promises');
      await fs.writeFile(cachePath, JSON.stringify(prCache, null, 2));

      // Save to GitHub Actions Cache
      const savedKey = await cache.saveCache([cachePath], cacheKey);
      
      core.info(`✅ Cache saved: ${savedKey}`);
      core.debug(`Cache size: ${(await fs.stat(cachePath)).size} bytes`);
    } catch (error) {
      core.warning(`Failed to save cache: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Load PR cache
   */
  async loadPRCache(owner: string, repo: string, prNumber: number): Promise<PRCache | null> {
    const cacheKey = this.getCacheKey(owner, repo, prNumber);
    const restoreKeys = this.getRestoreKeys(owner, repo, prNumber);
    const cachePath = `/tmp/code-sentinel-cache-${prNumber}.json`;

    try {
      // Restore from GitHub Actions Cache
      const restoredKey = await cache.restoreCache([cachePath], cacheKey, restoreKeys);
      
      if (!restoredKey) {
        core.info('Cache miss - no previous analysis found');
        return null;
      }

      core.info(`✅ Cache hit: ${restoredKey}`);

      // Read cache from temp file
      const fs = await import('fs/promises');
      const cacheData = await fs.readFile(cachePath, 'utf-8');
      const prCache = JSON.parse(cacheData) as PRCache;

      // Validate cache structure
      if (!prCache.owner || !prCache.repo || !prCache.prNumber) {
        core.warning('Invalid cache structure - ignoring');
        return null;
      }

      // Check if cache is expired (older than TTL days)
      const cacheAge = Date.now() - new Date(prCache.metadata.updatedAt).getTime();
      const maxAge = this.ttlDays * 24 * 60 * 60 * 1000;
      
      if (cacheAge > maxAge) {
        core.warning(`Cache expired (${Math.floor(cacheAge / 1000 / 60 / 60 / 24)} days old)`);
        return null;
      }

      return prCache;
    } catch (error) {
      core.warning(`Failed to load cache: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }

  /**
   * Get file analysis from cache
   */
  async getFileAnalysis(
    owner: string,
    repo: string,
    prNumber: number,
    filePath: string,
    fileSha: string
  ): Promise<FileAnalysisCache | null> {
    const prCache = await this.loadPRCache(owner, repo, prNumber);
    
    if (!prCache) {
      return null;
    }

    // Find file in cache
    const fileCache = prCache.files.find(f => f.filePath === filePath);
    
    if (!fileCache) {
      core.debug(`File not found in cache: ${filePath}`);
      return null;
    }

    // Check if SHA matches (file hasn't changed)
    if (fileCache.sha !== fileSha) {
      core.debug(`File SHA mismatch - cache invalid for ${filePath}`);
      return null;
    }

    return fileCache;
  }

  /**
   * Update file analysis in cache
   */
  async updateFileAnalysis(
    owner: string,
    repo: string,
    prNumber: number,
    fileAnalysis: FileAnalysisCache
  ): Promise<void> {
    // Load existing cache or create new
    let prCache = await this.loadPRCache(owner, repo, prNumber);
    
    if (!prCache) {
      prCache = {
        prNumber,
        owner,
        repo,
        lastCommitSha: '',
        files: [],
        tokenUsage: {
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0,
          estimatedCost: 0,
        },
        metadata: {
          cacheVersion: this.version,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          reviewCount: 0,
        },
      };
    }

    // Update or add file analysis
    const existingIndex = prCache.files.findIndex(f => f.filePath === fileAnalysis.filePath);
    
    if (existingIndex >= 0) {
      prCache.files[existingIndex] = fileAnalysis;
    } else {
      prCache.files.push(fileAnalysis);
    }

    // Update metadata
    prCache.metadata.updatedAt = new Date().toISOString();

    // Save cache
    await this.savePRCache(prCache);
  }

  /**
   * Clear cache for a PR
   */
  async clearPRCache(owner: string, repo: string, prNumber: number): Promise<void> {
    const cacheKey = this.getCacheKey(owner, repo, prNumber);
    core.info(`Clearing cache: ${cacheKey}`);
    
    // Note: GitHub Actions Cache doesn't have a delete API
    // Caches are automatically evicted after 7 days or when repo hits 10GB limit
    // We can only overwrite with empty data
    
    const emptyCache: PRCache = {
      prNumber,
      owner,
      repo,
      lastCommitSha: '',
      files: [],
      tokenUsage: {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        estimatedCost: 0,
      },
      metadata: {
        cacheVersion: this.version,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        reviewCount: 0,
      },
    };

    await this.savePRCache(emptyCache);
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(owner: string, repo: string, prNumber: number): Promise<{
    exists: boolean;
    size: number;
    fileCount: number;
    lastUpdated: string | null;
    reviewCount: number;
    tokenUsage: PRCache['tokenUsage'];
  }> {
    const prCache = await this.loadPRCache(owner, repo, prNumber);
    
    if (!prCache) {
      return {
        exists: false,
        size: 0,
        fileCount: 0,
        lastUpdated: null,
        reviewCount: 0,
        tokenUsage: {
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0,
          estimatedCost: 0,
        },
      };
    }

    return {
      exists: true,
      size: JSON.stringify(prCache).length,
      fileCount: prCache.files.length,
      lastUpdated: prCache.metadata.updatedAt,
      reviewCount: prCache.metadata.reviewCount,
      tokenUsage: prCache.tokenUsage,
    };
  }
}
