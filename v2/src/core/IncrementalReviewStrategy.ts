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
import { FileAnalysis } from '../analysis/IncrementalAnalyzer';

export interface IncrementalReviewResult {
  commentsDeleted: number;
  threadsResolved: number;
  newIssuesCreated: number;
  reviewsDismissed: number;
  oldIssues: Array<{ path: string; line: number; message: string; severity: string }>; // Track old issues before deletion
  outdatedDeleted: number; // Keep for backwards compatibility
  issuesResolved: number; // Keep for backwards compatibility
  issuesUpdated: number; // Keep for backwards compatibility
}

interface ReviewComment {
  path: string;
  position: number;
  body: string;
}

export class IncrementalReviewStrategy {
  constructor(
    private commentService: CommentService
  ) {}

  /**
   * Process incremental review updates
   * Compares new review comments with existing ones and applies changes
   */
  async processIncrementalUpdate(
    prNumber: number,
    _currentCommitSha: string,
    _existingReviewId: number | null,
    newComments: ReviewComment[],
    _newSummary: string,
    _analyses: FileAnalysis[]
  ): Promise<IncrementalReviewResult> {
    const result: IncrementalReviewResult = {
      commentsDeleted: 0,
      threadsResolved: 0,
      newIssuesCreated: newComments.length,
      reviewsDismissed: 0,
      oldIssues: [],
      outdatedDeleted: 0, // All deleted comments are "outdated"
      issuesResolved: 0, // All deleted comments are "resolved" too
      issuesUpdated: 0, // No updates, only delete and recreate
    };

    core.info('🔄 Starting incremental cleanup...');

    // Get ALL review comments from GitHub that were created by Code Sentinel AI
    const allGitHubComments = await this.commentService.listReviewComments(prNumber);
    
    // Filter for Code Sentinel AI comments
    const ourComments = allGitHubComments.filter(c => {
      const body = c.body.toLowerCase();
      return body.includes('code sentinel') || 
             body.includes('github-actions') ||
             body.includes('gpt-') ||
             body.includes('✅ **[resolved]**') ||
             body.includes('suggested change:') ||
             body.includes('🔴 **error**') ||
             body.includes('🟡 **warning**') ||
             body.includes('ℹ️ **info**');
    });

    core.info(`📊 Found ${ourComments.length} Code Sentinel AI comments to clean up`);

    // Track old issues before deletion for summary
    for (const comment of ourComments) {
      const issue = this.extractIssueFromComment(comment);
      if (issue) {
        result.oldIssues.push(issue);
      }
    }

    // Delete ALL old Code Sentinel AI comments
    // New comments will be created fresh
    for (const comment of ourComments) {
      try {
        await this.commentService.deleteReviewComment(comment.id);
        result.commentsDeleted++;
        core.info(`🗑️  Deleted old comment #${comment.id}`);
      } catch (error) {
        core.warning(`Failed to delete comment #${comment.id}: ${error}`);
      }
    }

    // Resolve ALL review threads created by Code Sentinel AI
    result.threadsResolved = await this.commentService.resolveAllOurThreads(prNumber);
    
    // Dismiss old PR reviews
    result.reviewsDismissed = await this.commentService.dismissOldReviews(prNumber);

    core.info(`✅ Incremental cleanup complete:`);
    core.info(`   - Old comments deleted: ${result.commentsDeleted}`);
    core.info(`   - Threads resolved: ${result.threadsResolved}`);
    core.info(`   - Old reviews dismissed: ${result.reviewsDismissed}`);
    core.info(`   - Old issues resolved: ${result.oldIssues.length}`);
    core.info(`   - New issues to create: ${result.newIssuesCreated}`);

    return result;
  }





  /**
   * Extract issue information from comment body
   */
  private extractIssueFromComment(comment: { path: string; line: number | null; body: string }): { path: string; line: number; message: string; severity: string } | null {
    try {
      // Extract severity
      let severity = 'info';
      if (comment.body.includes('🔴') || comment.body.toLowerCase().includes('error')) {
        severity = 'error';
      } else if (comment.body.includes('🟡') || comment.body.toLowerCase().includes('warning')) {
        severity = 'warning';
      }
      
      // Extract first line as message (up to 100 chars)
      const lines = comment.body.split('\n');
      let message = lines[0].replace(/[🔴🟡ℹ️✅]/g, '').replace(/\*\*/g, '').trim();
      if (message.length > 100) {
        message = message.substring(0, 97) + '...';
      }
      
      return {
        path: comment.path,
        line: comment.line || 0,
        message,
        severity
      };
    } catch (error) {
      return null;
    }
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
