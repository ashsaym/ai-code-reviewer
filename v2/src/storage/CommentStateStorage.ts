/**
 * Comment State Storage
 * 
 * Stores review state in PR comments as HTML metadata
 * - Permanent storage (comments persist forever)
 * - Survives cache eviction
 * - Enables outdated comment detection
 */

import * as core from '@actions/core';
import { Octokit } from '@octokit/rest';
import { CommentState, CommentMetadata } from './models';

export interface CommentStateStorageOptions {
  /** Octokit instance */
  octokit: Octokit;
  
  /** Repository owner */
  owner: string;
  
  /** Repository name */
  repo: string;
}

export class CommentStateStorage {
  private readonly octokit: Octokit;
  private readonly owner: string;
  private readonly repo: string;

  constructor(options: CommentStateStorageOptions) {
    this.octokit = options.octokit;
    this.owner = options.owner;
    this.repo = options.repo;
  }

  /**
   * Encode metadata as HTML comment
   */
  private encodeMetadata(metadata: CommentMetadata): string {
    const encoded = Buffer.from(JSON.stringify(metadata)).toString('base64');
    return `<!-- code-sentinel-ai:${encoded} -->`;
  }

  /**
   * Decode metadata from HTML comment
   */
  private decodeMetadata(commentBody: string): CommentMetadata | null {
    const match = commentBody.match(/<!-- code-sentinel-ai:([A-Za-z0-9+/=]+) -->/);
    
    if (!match) {
      return null;
    }

    try {
      const decoded = Buffer.from(match[1], 'base64').toString('utf-8');
      return JSON.parse(decoded) as CommentMetadata;
    } catch (error) {
      core.warning(`Failed to decode metadata: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }

  /**
   * Create comment with embedded metadata
   */
  async createComment(
    prNumber: number,
    commitSha: string,
    filePath: string,
    line: number | null,
    body: string,
    severity: 'info' | 'warning' | 'error',
    position?: number,
    sessionId?: string
  ): Promise<CommentState> {
    const metadata: CommentMetadata = {
      v: '2.0',
      sid: sessionId || `session-${Date.now()}`,
      f: filePath,
      l: line,
      c: commitSha,
      p: position,
    };

    const commentBody = `${body}\n\n${this.encodeMetadata(metadata)}`;

    try {
      let comment;
      
      if (line !== null && position !== undefined) {
        // Inline comment (review comment)
        const response = await this.octokit.pulls.createReviewComment({
          owner: this.owner,
          repo: this.repo,
          pull_number: prNumber,
          body: commentBody,
          commit_id: commitSha,
          path: filePath,
          position: position,
        });
        comment = response.data;
      } else {
        // PR-level comment
        const response = await this.octokit.issues.createComment({
          owner: this.owner,
          repo: this.repo,
          issue_number: prNumber,
          body: commentBody,
        });
        comment = response.data;
      }

      core.info(`✅ Created comment #${comment.id} for ${filePath}:${line}`);

      return {
        prNumber,
        filePath,
        line,
        commentId: comment.id,
        commitSha,
        body,
        severity,
        isOutdated: false,
        createdAt: comment.created_at,
        updatedAt: comment.updated_at,
        metadata: {
          version: metadata.v,
          sessionId: metadata.sid,
          position,
          codeHash: undefined,
        },
      };
    } catch (error) {
      core.error(`Failed to create comment: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Get all comments for a PR
   */
  async getComments(prNumber: number): Promise<CommentState[]> {
    const comments: CommentState[] = [];

    try {
      // Get review comments (inline)
      const reviewComments = await this.octokit.pulls.listReviewComments({
        owner: this.owner,
        repo: this.repo,
        pull_number: prNumber,
        per_page: 100,
      });

      for (const comment of reviewComments.data) {
        const metadata = this.decodeMetadata(comment.body);
        
        if (!metadata) {
          continue; // Not a Code Sentinel AI comment
        }

        comments.push({
          prNumber,
          filePath: metadata.f,
          line: metadata.l,
          commentId: comment.id,
          commitSha: metadata.c,
          body: comment.body.replace(/<!-- code-sentinel-ai:[^>]+ -->/, '').trim(),
          severity: this.inferSeverity(comment.body),
          isOutdated: comment.position === null, // GitHub marks outdated comments with null position
          createdAt: comment.created_at,
          updatedAt: comment.updated_at,
          metadata: {
            version: metadata.v,
            sessionId: metadata.sid,
            position: metadata.p,
          },
        });
      }

      // Get issue comments (PR-level)
      const issueComments = await this.octokit.issues.listComments({
        owner: this.owner,
        repo: this.repo,
        issue_number: prNumber,
        per_page: 100,
      });

      for (const comment of issueComments.data) {
        const metadata = this.decodeMetadata(comment.body);
        
        if (!metadata) {
          continue;
        }

        comments.push({
          prNumber,
          filePath: metadata.f,
          line: metadata.l,
          commentId: comment.id,
          commitSha: metadata.c,
          body: comment.body.replace(/<!-- code-sentinel-ai:[^>]+ -->/, '').trim(),
          severity: this.inferSeverity(comment.body),
          isOutdated: false, // Issue comments don't become outdated
          createdAt: comment.created_at,
          updatedAt: comment.updated_at,
          metadata: {
            version: metadata.v,
            sessionId: metadata.sid,
          },
        });
      }

      core.info(`Found ${comments.length} Code Sentinel AI comments`);
      return comments;
    } catch (error) {
      core.error(`Failed to get comments: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Get comments for a specific file
   */
  async getFileComments(prNumber: number, filePath: string): Promise<CommentState[]> {
    const allComments = await this.getComments(prNumber);
    return allComments.filter(c => c.filePath === filePath);
  }

  /**
   * Update comment body
   */
  async updateComment(commentId: number, newBody: string, isReviewComment: boolean = true): Promise<void> {
    try {
      if (isReviewComment) {
        await this.octokit.pulls.updateReviewComment({
          owner: this.owner,
          repo: this.repo,
          comment_id: commentId,
          body: newBody,
        });
      } else {
        await this.octokit.issues.updateComment({
          owner: this.owner,
          repo: this.repo,
          comment_id: commentId,
          body: newBody,
        });
      }

      core.info(`✅ Updated comment #${commentId}`);
    } catch (error) {
      core.error(`Failed to update comment: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Delete comment
   */
  async deleteComment(commentId: number, isReviewComment: boolean = true): Promise<void> {
    try {
      if (isReviewComment) {
        await this.octokit.pulls.deleteReviewComment({
          owner: this.owner,
          repo: this.repo,
          comment_id: commentId,
        });
      } else {
        await this.octokit.issues.deleteComment({
          owner: this.owner,
          repo: this.repo,
          comment_id: commentId,
        });
      }

      core.info(`✅ Deleted comment #${commentId}`);
    } catch (error) {
      core.error(`Failed to delete comment: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Mark comment as outdated (minimize or update)
   */
  async markOutdated(commentId: number, isReviewComment: boolean = true): Promise<void> {
    try {
      const outdatedPrefix = '~~**[OUTDATED]**~~\n\n';
      
      if (isReviewComment) {
        const comment = await this.octokit.pulls.getReviewComment({
          owner: this.owner,
          repo: this.repo,
          comment_id: commentId,
        });

        if (!comment.data.body.startsWith(outdatedPrefix)) {
          await this.updateComment(commentId, outdatedPrefix + comment.data.body, true);
        }
      } else {
        const comment = await this.octokit.issues.getComment({
          owner: this.owner,
          repo: this.repo,
          comment_id: commentId,
        });

        if (!comment.data.body.startsWith(outdatedPrefix)) {
          await this.updateComment(commentId, outdatedPrefix + comment.data.body, false);
        }
      }

      core.info(`✅ Marked comment #${commentId} as outdated`);
    } catch (error) {
      core.error(`Failed to mark comment as outdated: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Get outdated comments (code changed since review)
   */
  async getOutdatedComments(prNumber: number, currentCommitSha: string): Promise<CommentState[]> {
    const allComments = await this.getComments(prNumber);
    return allComments.filter(c => c.isOutdated || c.commitSha !== currentCommitSha);
  }

  /**
   * Infer severity from comment body
   */
  private inferSeverity(body: string): 'info' | 'warning' | 'error' {
    const lowerBody = body.toLowerCase();
    
    if (lowerBody.includes('🔴') || lowerBody.includes('error') || lowerBody.includes('critical')) {
      return 'error';
    }
    
    if (lowerBody.includes('⚠️') || lowerBody.includes('warning') || lowerBody.includes('caution')) {
      return 'warning';
    }
    
    return 'info';
  }

  /**
   * Get comment statistics
   */
  async getCommentStats(prNumber: number): Promise<{
    total: number;
    byFile: Map<string, number>;
    bySeverity: { info: number; warning: number; error: number };
    outdated: number;
  }> {
    const comments = await this.getComments(prNumber);
    const byFile = new Map<string, number>();
    const bySeverity = { info: 0, warning: 0, error: 0 };
    let outdated = 0;

    for (const comment of comments) {
      byFile.set(comment.filePath, (byFile.get(comment.filePath) || 0) + 1);
      bySeverity[comment.severity]++;
      
      if (comment.isOutdated) {
        outdated++;
      }
    }

    return {
      total: comments.length,
      byFile,
      bySeverity,
      outdated,
    };
  }
}
