/**
 * Storage Manager
 * 
 * Unified interface for all storage operations
 * Coordinates between GitHub Cache, Comment State, and Check Runs
 */

import * as core from '@actions/core';
import { Octokit } from '@octokit/rest';
import { GitHubCacheStorage, GitHubCacheStorageOptions } from './GitHubCacheStorage';
import { CommentStateStorage, CommentStateStorageOptions } from './CommentStateStorage';
import { CheckRunStorage, CheckRunStorageOptions } from './CheckRunStorage';
import { PRCache, FileAnalysisCache, CommentState, ReviewSession, CheckRunAnnotation } from './models';

export interface StorageManagerOptions {
  /** Octokit instance */
  octokit: Octokit;
  
  /** Repository owner */
  owner: string;
  
  /** Repository name */
  repo: string;
  
  /** GitHub Actions Cache options */
  cacheOptions?: Partial<GitHubCacheStorageOptions>;
  
  /** Check run name */
  checkName?: string;
  
  /** Enable check runs */
  enableCheckRuns?: boolean;
}

export class StorageManager {
  private readonly cacheStorage: GitHubCacheStorage;
  private readonly commentStorage: CommentStateStorage;
  private readonly checkRunStorage: CheckRunStorage | null;
  private readonly owner: string;
  private readonly repo: string;

  constructor(options: StorageManagerOptions) {
    this.owner = options.owner;
    this.repo = options.repo;

    // Initialize storage components
    this.cacheStorage = new GitHubCacheStorage(options.cacheOptions);
    
    this.commentStorage = new CommentStateStorage({
      octokit: options.octokit,
      owner: options.owner,
      repo: options.repo,
    });

    this.checkRunStorage = options.enableCheckRuns !== false
      ? new CheckRunStorage({
          octokit: options.octokit,
          owner: options.owner,
          repo: options.repo,
          checkName: options.checkName,
        })
      : null;

    core.info('✅ Storage Manager initialized');
  }

  /**
   * Load full PR state (cache + comments)
   */
  async loadPRState(prNumber: number): Promise<{
    cache: PRCache | null;
    comments: CommentState[];
  }> {
    core.info(`Loading PR #${prNumber} state...`);

    const [cache, comments] = await Promise.all([
      this.cacheStorage.loadPRCache(this.owner, this.repo, prNumber),
      this.commentStorage.getComments(prNumber),
    ]);

    core.info(`Loaded ${comments.length} comments from storage`);
    
    return { cache, comments };
  }

  /**
   * Save PR analysis results
   */
  async savePRAnalysis(
    prNumber: number,
    commitSha: string,
    fileAnalyses: FileAnalysisCache[],
    tokenUsage: PRCache['tokenUsage']
  ): Promise<void> {
    core.info(`Saving PR #${prNumber} analysis...`);

    // Update cache
    const prCache: PRCache = {
      prNumber,
      owner: this.owner,
      repo: this.repo,
      lastCommitSha: commitSha,
      files: fileAnalyses,
      tokenUsage,
      metadata: {
        cacheVersion: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        reviewCount: 1,
      },
    };

    await this.cacheStorage.savePRCache(prCache);
    core.info('✅ PR analysis saved to cache');
  }

  /**
   * Create inline comment with state tracking
   */
  async createInlineComment(
    prNumber: number,
    commitSha: string,
    filePath: string,
    line: number,
    position: number,
    body: string,
    severity: 'info' | 'warning' | 'error',
    sessionId: string
  ): Promise<CommentState> {
    return await this.commentStorage.createComment(
      prNumber,
      commitSha,
      filePath,
      line,
      body,
      severity,
      position,
      sessionId
    );
  }

  /**
   * Create PR-level comment
   */
  async createPRComment(
    prNumber: number,
    commitSha: string,
    body: string,
    severity: 'info' | 'warning' | 'error' = 'info',
    sessionId: string
  ): Promise<CommentState> {
    return await this.commentStorage.createComment(
      prNumber,
      commitSha,
      '',
      null,
      body,
      severity,
      undefined,
      sessionId
    );
  }

  /**
   * Get all Code Sentinel AI comments for a PR
   */
  async getPRComments(prNumber: number): Promise<CommentState[]> {
    return await this.commentStorage.getComments(prNumber);
  }

  /**
   * Get comments for a specific file
   */
  async getFileComments(prNumber: number, filePath: string): Promise<CommentState[]> {
    return await this.commentStorage.getFileComments(prNumber, filePath);
  }

  /**
   * Clean up outdated comments
   */
  async cleanOutdatedComments(prNumber: number, currentCommitSha: string): Promise<number> {
    const outdatedComments = await this.commentStorage.getOutdatedComments(prNumber, currentCommitSha);
    
    let cleaned = 0;
    for (const comment of outdatedComments) {
      try {
        await this.commentStorage.markOutdated(comment.commentId, comment.line !== null);
        cleaned++;
      } catch (error) {
        core.warning(`Failed to mark comment ${comment.commentId} as outdated: ${error}`);
      }
    }

    core.info(`✅ Marked ${cleaned} outdated comments`);
    return cleaned;
  }

  /**
   * Start a review session (creates check run if enabled)
   */
  async startReviewSession(
    prNumber: number,
    headSha: string,
    sessionId: string
  ): Promise<ReviewSession | null> {
    if (!this.checkRunStorage) {
      return null;
    }

    const stats: ReviewSession['stats'] = {
      filesReviewed: 0,
      linesReviewed: 0,
      issuesFound: 0,
      warningsFound: 0,
      suggestionsFound: 0,
      tokenUsage: {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        estimatedCost: 0,
      },
    };

    const metadata: ReviewSession['metadata'] = {
      provider: 'openai',
      model: 'gpt-5-mini',
      version: '2.0.0',
      startedAt: new Date().toISOString(),
      completedAt: '',
      durationMs: 0,
    };

    return await this.checkRunStorage.createReviewSession(
      headSha,
      prNumber,
      sessionId,
      stats,
      metadata
    );
  }

  /**
   * Update review session progress
   */
  async updateReviewSession(
    session: ReviewSession,
    stats: Partial<ReviewSession['stats']>
  ): Promise<void> {
    if (!this.checkRunStorage) {
      return;
    }

    // Merge stats
    Object.assign(session.stats, stats);

    // Update check run with progress
    const summary = `🛡️ Code Sentinel AI Review in progress...\n\nFiles reviewed: ${session.stats.filesReviewed}`;
    
    await this.checkRunStorage.updateCheckRun(
      session.checkRunId,
      'in_progress',
      undefined,
      {
        title: 'Code Sentinel AI Review',
        summary,
      }
    );
  }

  /**
   * Complete review session
   */
  async completeReviewSession(
    session: ReviewSession,
    finalStats: ReviewSession['stats'],
    annotations: CheckRunAnnotation[]
  ): Promise<void> {
    if (!this.checkRunStorage) {
      return;
    }

    // Update session
    session.stats = finalStats;
    session.metadata.completedAt = new Date().toISOString();
    session.metadata.durationMs = Date.now() - new Date(session.metadata.startedAt).getTime();

    // Finalize check run
    await this.checkRunStorage.finalizeReviewSession(session, annotations);
    core.info('✅ Review session completed');
  }

  /**
   * Get file analysis from cache
   */
  async getFileAnalysis(
    prNumber: number,
    filePath: string,
    fileSha: string
  ): Promise<FileAnalysisCache | null> {
    return await this.cacheStorage.getFileAnalysis(
      this.owner,
      this.repo,
      prNumber,
      filePath,
      fileSha
    );
  }

  /**
   * Update file analysis in cache
   */
  async updateFileAnalysis(
    prNumber: number,
    fileAnalysis: FileAnalysisCache
  ): Promise<void> {
    await this.cacheStorage.updateFileAnalysis(
      this.owner,
      this.repo,
      prNumber,
      fileAnalysis
    );
  }

  /**
   * Get storage statistics
   */
  async getStats(prNumber: number): Promise<{
    cache: {
      exists: boolean;
      size: number;
      fileCount: number;
      lastUpdated: string | null;
    };
    comments: {
      total: number;
      outdated: number;
      byFile: Map<string, number>;
      bySeverity: { info: number; warning: number; error: number };
    };
  }> {
    const [cacheStats, commentStats] = await Promise.all([
      this.cacheStorage.getCacheStats(this.owner, this.repo, prNumber),
      this.commentStorage.getCommentStats(prNumber),
    ]);

    return {
      cache: {
        exists: cacheStats.exists,
        size: cacheStats.size,
        fileCount: cacheStats.fileCount,
        lastUpdated: cacheStats.lastUpdated,
      },
      comments: commentStats,
    };
  }

  /**
   * Clear all storage for a PR
   */
  async clearPRStorage(prNumber: number): Promise<void> {
    core.info(`Clearing all storage for PR #${prNumber}...`);
    
    await this.cacheStorage.clearPRCache(this.owner, this.repo, prNumber);
    
    // Note: We don't delete comments - they're permanent record
    core.info('✅ Cache cleared (comments preserved)');
  }

  /**
   * Create annotation from review finding
   */
  static createAnnotation(
    filePath: string,
    line: number,
    severity: 'info' | 'warning' | 'error',
    message: string,
    title?: string
  ): CheckRunAnnotation {
    return CheckRunStorage.createAnnotation(filePath, line, severity, message, title);
  }
}
