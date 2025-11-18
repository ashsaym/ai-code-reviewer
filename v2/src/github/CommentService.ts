/**
 * Comment Service
 * 
 * Simplified interface for creating and managing review comments
 */

import * as core from '@actions/core';
import { Octokit } from '@octokit/rest';

export interface ReviewComment {
  id: number;
  path: string;
  position: number | null;
  line: number | null;
  body: string;
  createdAt: string;
  updatedAt: string;
  user: string;
}

export interface CommentServiceOptions {
  octokit: Octokit;
  owner: string;
  repo: string;
}

export class CommentService {
  private readonly octokit: Octokit;
  private readonly owner: string;
  private readonly repo: string;

  constructor(options: CommentServiceOptions) {
    this.octokit = options.octokit;
    this.owner = options.owner;
    this.repo = options.repo;
  }

  /**
   * Create inline review comment
   */
  async createReviewComment(
    prNumber: number,
    commitId: string,
    path: string,
    position: number,
    body: string
  ): Promise<ReviewComment> {
    try {
      const { data } = await this.octokit.pulls.createReviewComment({
        owner: this.owner,
        repo: this.repo,
        pull_number: prNumber,
        commit_id: commitId,
        path,
        position,
        body,
      });

      core.info(`✅ Created review comment on ${path}:${position}`);

      return {
        id: data.id,
        path: data.path,
        position: data.position,
        line: data.line || null,
        body: data.body,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        user: data.user?.login || 'unknown',
      };
    } catch (error) {
      core.error(`Failed to create review comment: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Create PR-level comment
   */
  async createIssueComment(prNumber: number, body: string): Promise<{ id: number; body: string }> {
    try {
      const { data } = await this.octokit.issues.createComment({
        owner: this.owner,
        repo: this.repo,
        issue_number: prNumber,
        body,
      });

      core.info(`✅ Created PR comment #${data.id}`);

      return {
        id: data.id,
        body: data.body || '',
      };
    } catch (error) {
      core.error(`Failed to create PR comment: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Create comment (alias for createIssueComment)
   */
  async createComment(prNumber: number, body: string): Promise<{ id: number; body: string }> {
    return this.createIssueComment(prNumber, body);
  }

  /**
   * Create review with multiple comments
   */
  async createReview(
    prNumber: number,
    commitId: string,
    body: string,
    event: 'APPROVE' | 'REQUEST_CHANGES' | 'COMMENT',
    comments?: Array<{ path: string; position: number; body: string }>
  ): Promise<number> {
    try {
      const { data } = await this.octokit.pulls.createReview({
        owner: this.owner,
        repo: this.repo,
        pull_number: prNumber,
        commit_id: commitId,
        body,
        event,
        comments: comments?.map(c => ({
          path: c.path,
          position: c.position,
          body: c.body,
        })),
      });

      core.info(`✅ Created review #${data.id} with ${comments?.length || 0} comments`);
      return data.id;
    } catch (error) {
      core.error(`Failed to create review: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * List review comments on PR
   */
  async listReviewComments(prNumber: number): Promise<ReviewComment[]> {
    try {
      const { data } = await this.octokit.pulls.listReviewComments({
        owner: this.owner,
        repo: this.repo,
        pull_number: prNumber,
        per_page: 100,
      });

      return data.map(c => ({
        id: c.id,
        path: c.path,
        position: c.position || null,
        line: c.line || null,
        body: c.body,
        createdAt: c.created_at,
        updatedAt: c.updated_at,
        user: c.user?.login || 'unknown',
      }));
    } catch (error) {
      core.error(`Failed to list review comments: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Update review comment
   */
  async updateReviewComment(commentId: number, body: string): Promise<void> {
    try {
      await this.octokit.pulls.updateReviewComment({
        owner: this.owner,
        repo: this.repo,
        comment_id: commentId,
        body,
      });

      core.info(`✅ Updated review comment #${commentId}`);
    } catch (error) {
      core.error(`Failed to update review comment: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Delete review comment
   */
  async deleteReviewComment(commentId: number): Promise<void> {
    try {
      await this.octokit.pulls.deleteReviewComment({
        owner: this.owner,
        repo: this.repo,
        comment_id: commentId,
      });

      core.info(`✅ Deleted review comment #${commentId}`);
    } catch (error) {
      core.error(`Failed to delete review comment: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Batch create review comments (uses review API)
   */
  async batchCreateComments(
    prNumber: number,
    commitId: string,
    comments: Array<{ path: string; position: number; body: string }>
  ): Promise<number> {
    if (comments.length === 0) {
      return 0;
    }

    try {
      const reviewId = await this.createReview(
        prNumber,
        commitId,
        `🛡️ Code Sentinel AI found ${comments.length} issue(s)`,
        'COMMENT',
        comments
      );

      return reviewId;
    } catch (error) {
      core.error(`Failed to batch create comments: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Get comments for a specific file
   */
  async getFileComments(prNumber: number, path: string): Promise<ReviewComment[]> {
    const allComments = await this.listReviewComments(prNumber);
    return allComments.filter(c => c.path === path);
  }

  /**
   * Check if comment exists at position
   */
  async commentExistsAt(prNumber: number, path: string, position: number): Promise<boolean> {
    const fileComments = await this.getFileComments(prNumber, path);
    return fileComments.some(c => c.position === position);
  }
}
