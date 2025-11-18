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
    existingReviewId: number | null,
    newComments: ReviewComment[],
    newSummary: string,
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

    // Update existing review with new summary
    if (existingReviewId) {
      try {
        await this.appendReviewSummary(prNumber, existingReviewId, newSummary);
        result.reviewUpdated = true;
      } catch (error) {
        core.warning(`Failed to update review summary: ${error}`);
      }
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
   * Update existing comment with new issue text
   */
  private async updateExistingComment(
    commentId: number,
    oldBody: string,
    newComment: ReviewComment,
    isReviewComment: boolean
  ): Promise<void> {
    const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    const severityBadge = this.getSeverityBadge(newComment.severity);
    
    // Format new issue body
    let newIssueBody = `${severityBadge} **${newComment.severity.toUpperCase()}**\n\n${newComment.message}`;
    
    if (newComment.suggestion) {
      newIssueBody += `\n\n**Suggested change:**\n\`\`\`suggestion\n${newComment.suggestion}\n\`\`\``;
    }

    // Append update to old comment
    const updatedBody = `~~${oldBody}~~\n\n---\n**🔄 Updated: ${timestamp}**\n\n${newIssueBody}`;

    try {
      const commentStorage = this.storage.getCommentStorage();
      await commentStorage.updateComment(commentId, updatedBody, isReviewComment);
      core.info(`✏️  Updated comment #${commentId} with new issue`);
    } catch (error) {
      core.error(`Failed to update comment #${commentId}: ${error}`);
      throw error;
    }
  }

  /**
   * Mark comment as resolved
   */
  private async markCommentResolved(
    commentId: number,
    isReviewComment: boolean
  ): Promise<void> {
    try {
      const commentStorage = this.storage.getCommentStorage();
      const resolvedPrefix = '✅ **[RESOLVED]**\n\n';
      
      // Get current comment body
      const comments = await commentStorage.getComments(0); // Get all
      const comment = comments.find((c: CommentState) => c.commentId === commentId);
      
      if (!comment) {
        core.warning(`Comment #${commentId} not found`);
        return;
      }

      if (!comment.body.startsWith(resolvedPrefix)) {
        await commentStorage.updateComment(
          commentId,
          resolvedPrefix + comment.body,
          isReviewComment
        );
        core.info(`✅ Marked comment #${commentId} as resolved`);
      }
    } catch (error) {
      core.error(`Failed to mark comment as resolved: ${error}`);
      throw error;
    }
  }

  /**
   * Append new summary to existing review (creates follow-up comment)
   */
  private async appendReviewSummary(
    prNumber: number,
    _reviewId: number,
    newSummary: string
  ): Promise<void> {
    try {
      const timestamp = new Date().toISOString();
      const dateStr = new Date(timestamp).toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'UTC',
        timeZoneName: 'short'
      });

      // GitHub API doesn't support updating review bodies, so create a follow-up comment instead
      const updateBody = `## 🔄 Review Updated: ${dateStr}\n\n${newSummary}`;

      // Create PR-level comment with the update
      await this.commentService.createComment(prNumber, updateBody);
      
      core.info(`✏️  Posted review update as follow-up comment`);
    } catch (error) {
      core.error(`Failed to post review update: ${error}`);
      throw error;
    }
  }

  /**
   * Get severity badge emoji
   */
  private getSeverityBadge(severity: 'error' | 'warning' | 'info'): string {
    const badges = {
      error: '🔴',
      warning: '🟡',
      info: '🟢',
    };
    return badges[severity] || '🔵';
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
