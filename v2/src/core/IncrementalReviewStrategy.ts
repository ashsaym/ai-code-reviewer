/**
 * Incremental Review Strategy
 * 
 * Handles updates to existing reviews when new commits are pushed:
 * - Deletes outdated comments completely
 * - Marks resolved issues as "✅ [RESOLVED]"
 * - Updates existing comments when new issues found on same line
 * - Appends new summary to existing review
 */

import * as core from '@actions/core';
import { CommentService } from '../github/CommentService';
import { IncrementalAnalyzer, FileAnalysis } from '../analysis/IncrementalAnalyzer';
import { ReviewComment } from '../parsers/ResponseParser';
import { StorageManager } from '../storage/StorageManager';
import type { CommentState } from '../storage/models';

export interface IncrementalReviewResult {
  outdatedDeleted: number;
  issuesResolved: number;
  issuesUpdated: number;
  newIssuesCreated: number;
  reviewUpdated: boolean;
}

export class IncrementalReviewStrategy {
  constructor(
    private commentService: CommentService,
    private storage: StorageManager,
    private analyzer: IncrementalAnalyzer
  ) {}

  /**
   * Process incremental review updates
   * Compares new review comments with existing ones and applies changes
   */
  async processIncrementalUpdate(
    prNumber: number,
    currentCommitSha: string,
    _existingReviewId: number | null,
    newComments: ReviewComment[],
    _newSummary: string,
    analyses: FileAnalysis[]
  ): Promise<IncrementalReviewResult> {
    const result: IncrementalReviewResult = {
      outdatedDeleted: 0,
      issuesResolved: 0,
      issuesUpdated: 0,
      newIssuesCreated: 0,
      reviewUpdated: false,
    };

    core.info('🔄 Starting incremental review update...');

    // Get all existing comments from storage AND direct from GitHub
    const commentStorage = this.storage.getCommentStorage();
    const storedComments = await commentStorage.getComments(prNumber);
    
    // Also get ALL review comments directly from GitHub (including those without metadata)
    const allGitHubComments = await this.commentService.listReviewComments(prNumber);
    
    // Convert GitHub comments to CommentState format for processing
    const existingComments = storedComments.length > 0 
      ? storedComments 
      : allGitHubComments.map(c => ({
          prNumber,
          filePath: c.path,
          line: c.line,
          commentId: c.id,
          commitSha: currentCommitSha, // Assume they're from a previous commit
          body: c.body,
          severity: this.inferSeverityFromBody(c.body),
          isOutdated: c.position === null,
          createdAt: c.createdAt,
          updatedAt: c.updatedAt,
          metadata: {
            version: '1.0', // Legacy comment
            sessionId: 'unknown',
          },
        }));

    core.info(`📊 Found ${existingComments.length} existing comments (${storedComments.length} with metadata, ${allGitHubComments.length} total GitHub comments)`);

    // Build map of file SHA changes for quick lookup
    const fileChanges = new Map<string, { oldSha?: string; newSha: string }>();
    for (const analysis of analyses) {
      fileChanges.set(analysis.filename, {
        oldSha: analysis.previousSha,
        newSha: analysis.sha,
      });
    }

    // Build map of new comments by file and line
    const newCommentMap = new Map<string, Map<number, ReviewComment>>();
    for (const comment of newComments) {
      if (!newCommentMap.has(comment.path)) {
        newCommentMap.set(comment.path, new Map());
      }
      newCommentMap.get(comment.path)!.set(comment.line, comment);
    }

    // Process existing comments
    for (const existingComment of existingComments) {
      const fileChange = fileChanges.get(existingComment.filePath);
      
      // Check if file was modified in this commit
      const fileModified = fileChange && fileChange.oldSha !== fileChange.newSha;
      const commentOutdated = existingComment.commitSha !== currentCommitSha || existingComment.isOutdated;

      if (commentOutdated || fileModified) {
        // File changed or comment is from old commit
        const newComment = newCommentMap.get(existingComment.filePath)?.get(existingComment.line || 0);

        if (newComment) {
          // Same line has new issue - update existing comment
          await this.updateExistingComment(
            existingComment.commentId,
            existingComment.body,
            newComment,
            true // isReviewComment
          );
          result.issuesUpdated++;
          
          // Remove from new comments map so we don't create duplicate
          newCommentMap.get(existingComment.filePath)!.delete(existingComment.line || 0);
        } else {
          // No new issue on this line - check if it's resolved or outdated
          if (fileModified && !existingComment.isOutdated) {
            // Code changed, issue likely resolved
            await this.markCommentResolved(
              existingComment.commentId,
              existingComment.body,
              true // isReviewComment
            );
            result.issuesResolved++;
          } else {
            // Outdated comment - delete it
            try {
              await commentStorage.deleteComment(existingComment.commentId, true);
              result.outdatedDeleted++;
              core.info(`🗑️  Deleted outdated comment #${existingComment.commentId}`);
            } catch (error) {
              core.warning(`Failed to delete comment #${existingComment.commentId}: ${error}`);
            }
          }
        }
      }
      // If comment is still valid (same commit, not outdated), leave as-is
    }

    // Count remaining new comments that need to be created
    for (const fileMap of newCommentMap.values()) {
      result.newIssuesCreated += fileMap.size;
    }

    core.info(`✅ Incremental update complete:`);
    core.info(`   - Outdated deleted: ${result.outdatedDeleted}`);
    core.info(`   - Issues resolved: ${result.issuesResolved}`);
    core.info(`   - Issues updated: ${result.issuesUpdated}`);
    core.info(`   - New issues: ${result.newIssuesCreated}`);

    return result;
  }

  /**
   * Delete existing comment (will be replaced with new issue)
   */
  private async updateExistingComment(
    commentId: number,
    _oldBody: string,
    _newComment: ReviewComment,
    isReviewComment: boolean
  ): Promise<void> {
    // Instead of updating with nested suggestion blocks (which breaks GitHub),
    // we'll delete the old comment and let a new one be created
    try {
      const commentStorage = this.storage.getCommentStorage();
      await commentStorage.deleteComment(commentId, isReviewComment);
      core.info(`🗑️  Deleted outdated comment #${commentId} (will be replaced with new issue)`);
    } catch (error) {
      core.error(`Failed to delete comment #${commentId}: ${error}`);
      // Don't throw - continue with other comments
    }
  }

  /**
   * Mark comment as resolved
   */
  private async markCommentResolved(
    commentId: number,
    commentBody: string,
    isReviewComment: boolean
  ): Promise<void> {
    try {
      const resolvedPrefix = '✅ **[RESOLVED]**\n\n';
      
      if (!commentBody.startsWith(resolvedPrefix)) {
        if (isReviewComment) {
          // Update the comment body with resolved prefix
          await this.commentService.updateReviewComment(commentId, resolvedPrefix + commentBody);
          
          // Also resolve the conversation thread
          await this.commentService.resolveReviewThread(commentId);
        } else {
          const commentStorage = this.storage.getCommentStorage();
          await commentStorage.updateComment(commentId, resolvedPrefix + commentBody, false);
        }
        core.info(`✅ Marked comment #${commentId} as resolved and closed thread`);
      }
    } catch (error) {
      core.error(`Failed to mark comment as resolved: ${error}`);
      // Don't throw - continue with other comments
    }
  }

  /**
   * Infer severity from comment body text
   */
  private inferSeverityFromBody(body: string): 'error' | 'warning' | 'info' {
    const lowerBody = body.toLowerCase();
    
    if (lowerBody.includes('🔴') || lowerBody.includes('error') || lowerBody.includes('critical') || lowerBody.includes('🚨')) {
      return 'error';
    }
    
    if (lowerBody.includes('🟡') || lowerBody.includes('warning') || lowerBody.includes('⚠️')) {
      return 'warning';
    }
    
    return 'info';
  }

  /**
   * Find the most recent review by Code Sentinel AI
   */
  async findLatestReview(prNumber: number): Promise<number | null> {
    try {
      const reviews = await this.commentService.listReviews(prNumber);
      
      // Find most recent review by github-actions bot with Code Sentinel AI marker
      const codeSentinelReviews = reviews.filter(
        (r: { user: { login: string } | null; body: string | null }) => 
          r.user?.login === 'github-actions[bot]' && 
          r.body?.includes('Code Sentinel AI')
      );

      if (codeSentinelReviews.length === 0) {
        return null;
      }

      // Sort by submitted date, most recent first
      codeSentinelReviews.sort((a: { submitted_at?: string }, b: { submitted_at?: string }) => 
        new Date(b.submitted_at || 0).getTime() - 
        new Date(a.submitted_at || 0).getTime()
      );

      return codeSentinelReviews[0].id;
    } catch (error) {
      core.warning(`Failed to find latest review: ${error}`);
      return null;
    }
  }

  /**
   * Check if incremental review mode should be used
   */
  async shouldUseIncrementalMode(prNumber: number): Promise<boolean> {
    const latestReview = await this.findLatestReview(prNumber);
    return latestReview !== null;
  }
}
