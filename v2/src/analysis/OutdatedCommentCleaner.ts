/**
 * Outdated Comment Cleaner
 * 
 * Automatically detects and marks outdated review comments
 */

import * as core from '@actions/core';
import { StorageManager } from '../storage/StorageManager';
import { CommentState } from '../storage/models';

export interface OutdatedCheckResult {
  totalComments: number;
  outdatedComments: number;
  markedOutdated: number;
  errors: string[];
}

export class OutdatedCommentCleaner {
  constructor(
    private storage: StorageManager,
    private prNumber: number
  ) {}

  /**
   * Check all comments and mark outdated ones
   * Uses the storage manager's built-in cleanOutdatedComments method
   */
  async checkAndMarkOutdated(currentCommitSha: string): Promise<OutdatedCheckResult> {
    core.info('🧹 Checking for outdated comments...');

    const result: OutdatedCheckResult = {
      totalComments: 0,
      outdatedComments: 0,
      markedOutdated: 0,
      errors: [],
    };

    try {
      // Get all existing comments
      const comments = await this.storage.getPRComments(this.prNumber);
      result.totalComments = comments.length;

      if (comments.length === 0) {
        core.info('No comments to check');
        return result;
      }

      // Use storage manager's built-in method to clean outdated comments
      const marked = await this.storage.cleanOutdatedComments(this.prNumber, currentCommitSha);
      result.markedOutdated = marked;
      result.outdatedComments = marked;

      core.info(
        `✅ Outdated check complete: ${result.outdatedComments}/${result.totalComments} ` +
        `outdated, ${result.markedOutdated} marked`
      );

    } catch (error) {
      const errorMsg = `Outdated comment check failed: ${error}`;
      result.errors.push(errorMsg);
      core.error(errorMsg);
    }

    return result;
  }

  /**
   * Get all outdated comments
   */
  async getOutdatedComments(): Promise<CommentState[]> {
    const allComments = await this.storage.getPRComments(this.prNumber);
    return allComments.filter(c => c.isOutdated);
  }

  /**
   * Get statistics about comments
   */
  async getCommentStats(): Promise<{
    total: number;
    active: number;
    outdated: number;
    bySeverity: Record<string, number>;
  }> {
    const comments = await this.storage.getPRComments(this.prNumber);
    const outdated = await this.getOutdatedComments();

    const bySeverity: Record<string, number> = {
      error: 0,
      warning: 0,
      info: 0,
    };

    for (const comment of comments) {
      if (comment.severity) {
        bySeverity[comment.severity]++;
      }
    }

    return {
      total: comments.length,
      active: comments.length - outdated.length,
      outdated: outdated.length,
      bySeverity,
    };
  }
}
