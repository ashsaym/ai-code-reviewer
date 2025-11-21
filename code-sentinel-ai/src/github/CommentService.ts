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
   * Get owner (for internal use by strategies)
   */
  public getOwner(): string {
    return this.owner;
  }

  /**
   * Get repo (for internal use by strategies)
   */
  public getRepo(): string {
    return this.repo;
  }

  /**
   * Get octokit instance (for internal use by strategies)
   */
  public getOctokit(): Octokit {
    return this.octokit;
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
        position: data.position ?? null,
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
   * Resolve a review thread (conversation)
   * This uses the GraphQL API to resolve the thread associated with a comment
   */
  async resolveReviewThread(commentId: number): Promise<void> {
    try {
      // Get the comment to find the pull request review thread ID
      const comment = await this.octokit.pulls.getReviewComment({
        owner: this.owner,
        repo: this.repo,
        comment_id: commentId,
      });

      // Use GraphQL to find the thread ID and resolve it
      // We need to query the PR's review threads and find the one containing this comment
      const prNumber = parseInt(comment.data.pull_request_url.split('/').pop() || '0', 10);
      
      interface GraphQLComment {
        databaseId: number;
      }
      interface GraphQLThread {
        id: string;
        isResolved: boolean;
        comments: { nodes: GraphQLComment[] };
      }
      interface GraphQLResult {
        repository: {
          pullRequest: {
            reviewThreads: { nodes: GraphQLThread[] };
          };
        };
      }

      const result = await this.octokit.graphql<GraphQLResult>(`
        query($owner: String!, $repo: String!, $prNumber: Int!) {
          repository(owner: $owner, name: $repo) {
            pullRequest(number: $prNumber) {
              reviewThreads(first: 100) {
                nodes {
                  id
                  isResolved
                  comments(first: 100) {
                    nodes {
                      databaseId
                    }
                  }
                }
              }
            }
          }
        }
      `, {
        owner: this.owner,
        repo: this.repo,
        prNumber: prNumber,
      });

      // Find the thread that contains this comment
      const threads = result.repository.pullRequest.reviewThreads.nodes;
      const thread = threads.find(t => 
        t.comments.nodes.some(c => c.databaseId === commentId)
      );

      if (!thread) {
        core.warning(`Could not find review thread for comment #${commentId}`);
        return;
      }

      if (thread.isResolved) {
        core.info(`Thread for comment #${commentId} is already resolved`);
        return;
      }

      // Resolve the thread
      await this.octokit.graphql(`
        mutation($threadId: ID!) {
          resolveReviewThread(input: {threadId: $threadId}) {
            thread {
              isResolved
            }
          }
        }
      `, {
        threadId: thread.id,
      });

      core.info(`✅ Resolved review thread for comment #${commentId}`);
    } catch (error) {
      // Don't throw - resolving threads is a nice-to-have, not critical
      core.warning(`Failed to resolve review thread for comment #${commentId}: ${error instanceof Error ? error.message : String(error)}`);
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

  /**
   * Get a specific review by ID
   */
  async getReview(prNumber: number, reviewId: number): Promise<{ id: number; body: string; state: string } | null> {
    try {
      const { data } = await this.octokit.pulls.getReview({
        owner: this.owner,
        repo: this.repo,
        pull_number: prNumber,
        review_id: reviewId,
      });

      return {
        id: data.id,
        body: data.body || '',
        state: data.state,
      };
    } catch (error) {
      core.error(`Failed to get review #${reviewId}: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }

  /**
   * Update review body (note: GitHub API doesn't support updating reviews directly,
   * so we'll need to work around this by creating a new comment)
   */
  async updateReview(_reviewId: number, _body: string): Promise<void> {
    core.warning('GitHub API does not support updating review bodies. Consider creating a new review instead.');
    // This is a limitation of the GitHub API - review bodies cannot be updated
    // We'll handle this by creating follow-up comments instead
    throw new Error('Review body updates not supported by GitHub API');
  }

  /**
   * List all reviews for a PR
   */
  async listReviews(prNumber: number): Promise<Array<{
    id: number;
    user: { login: string } | null;
    body: string | null;
    state: string;
    submitted_at?: string;
  }>> {
    try {
      const { data } = await this.octokit.pulls.listReviews({
        owner: this.owner,
        repo: this.repo,
        pull_number: prNumber,
        per_page: 100,
      });

      return data.map(r => ({
        id: r.id,
        user: r.user,
        body: r.body,
        state: r.state,
        submitted_at: r.submitted_at,
        // Note: Reviews don't have created_at in the API response
      }));
    } catch (error) {
      core.error(`Failed to list reviews: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Dismiss old PR reviews by Code Sentinel AI
   */
  async dismissOldReviews(prNumber: number): Promise<number> {
    try {
      core.info('🔄 Dismissing old Code Sentinel AI reviews...');
      
      const reviews = await this.listReviews(prNumber);
      
      // Find Code Sentinel AI reviews (exclude the most recent one)
      const ourReviews = reviews.filter(r => 
        r.user?.login === 'github-actions[bot]' && 
        r.body?.includes('Code Sentinel AI')
      );
      
      if (ourReviews.length <= 1) {
        core.info('No old reviews to dismiss (keeping latest)');
        return 0;
      }
      
      // Sort by date, keep the newest, dismiss the rest
      ourReviews.sort((a, b) => 
        new Date(b.submitted_at || 0).getTime() - 
        new Date(a.submitted_at || 0).getTime()
      );
      
      const oldReviews = ourReviews.slice(1); // Skip the newest one
      let dismissed = 0;
      
      for (const review of oldReviews) {
        try {
          await this.octokit.pulls.dismissReview({
            owner: this.owner,
            repo: this.repo,
            pull_number: prNumber,
            review_id: review.id,
            message: 'Outdated - superseded by newer review',
          });
          dismissed++;
          core.info(`✅ Dismissed old review #${review.id}`);
        } catch (error) {
          core.warning(`Failed to dismiss review #${review.id}: ${error}`);
        }
      }
      
      core.info(`✅ Dismissed ${dismissed} old reviews`);
      return dismissed;
    } catch (error) {
      core.warning(`Failed to dismiss old reviews: ${error}`);
      return 0;
    }
  }

  /**
   * Dismiss a specific review by ID (only works for APPROVED/CHANGES_REQUESTED reviews)
   */
  async dismissReview(prNumber: number, reviewId: number, message: string): Promise<void> {
    await this.octokit.pulls.dismissReview({
      owner: this.owner,
      repo: this.repo,
      pull_number: prNumber,
      review_id: reviewId,
      message: message,
    });
  }

  /**
   * Get all comments for a specific review
   */
  async getReviewComments(prNumber: number, reviewId: number): Promise<ReviewComment[]> {
    try {
      const { data } = await this.octokit.pulls.listCommentsForReview({
        owner: this.owner,
        repo: this.repo,
        pull_number: prNumber,
        review_id: reviewId,
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
      core.error(`Failed to get review comments: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Resolve all Code Sentinel AI review threads
   */
  async resolveAllOurThreads(prNumber: number): Promise<number> {
    try {
      core.info('🔄 Resolving all Code Sentinel AI review threads...');
      
      interface ResolveThreadResult {
        repository: {
          pullRequest: {
            reviewThreads: {
              nodes: Array<{
                id: string;
                isResolved: boolean;
                comments: {
                  nodes: Array<{
                    body: string;
                    author: { login: string };
                  }>;
                };
              }>;
            };
          };
        };
      }

      const result = await this.octokit.graphql<ResolveThreadResult>(`
        query($owner: String!, $repo: String!, $prNumber: Int!) {
          repository(owner: $owner, name: $repo) {
            pullRequest(number: $prNumber) {
              reviewThreads(first: 100) {
                nodes {
                  id
                  isResolved
                  comments(first: 1) {
                    nodes {
                      body
                      author {
                        login
                      }
                    }
                  }
                }
              }
            }
          }
        }
      `, {
        owner: this.owner,
        repo: this.repo,
        prNumber: prNumber,
      });

      const threads = result.repository.pullRequest.reviewThreads.nodes;
      let resolved = 0;
      
      for (const thread of threads) {
        if (thread.isResolved) continue;
        
        // Check if this is a Code Sentinel AI thread
        const firstComment = thread.comments.nodes[0];
        if (!firstComment) continue;
        
        const isOurs = firstComment.author.login === 'github-actions[bot]' ||
                       firstComment.body.toLowerCase().includes('code sentinel');
        
        if (isOurs) {
          try {
            await this.octokit.graphql(`
              mutation($threadId: ID!) {
                resolveReviewThread(input: {threadId: $threadId}) {
                  thread {
                    isResolved
                  }
                }
              }
            `, {
              threadId: thread.id,
            });
            resolved++;
            core.info(`✅ Resolved thread ${thread.id}`);
          } catch (error) {
            core.warning(`Failed to resolve thread ${thread.id}: ${error}`);
          }
        }
      }

      core.info(`✅ Resolved ${resolved} Code Sentinel AI threads`);
      return resolved;
    } catch (error) {
      core.warning(`Failed to resolve threads: ${error}`);
      return 0;
    }
  }

  /**
   * Count resolved threads created by Code Sentinel AI
   */
  async countResolvedThreads(prNumber: number): Promise<number> {
    try {
      interface CountThreadsResult {
        repository: {
          pullRequest: {
            reviewThreads: {
              nodes: Array<{
                isResolved: boolean;
                comments: {
                  nodes: Array<{
                    author: { login: string };
                  }>;
                };
              }>;
            };
          };
        };
      }

      const result = await this.octokit.graphql<CountThreadsResult>(`
        query($owner: String!, $repo: String!, $prNumber: Int!) {
          repository(owner: $owner, name: $repo) {
            pullRequest(number: $prNumber) {
              reviewThreads(first: 100) {
                nodes {
                  isResolved
                  comments(first: 1) {
                    nodes {
                      author {
                        login
                      }
                    }
                  }
                }
              }
            }
          }
        }
      `, {
        owner: this.owner,
        repo: this.repo,
        prNumber: prNumber,
      });

      const threads = result.repository.pullRequest.reviewThreads.nodes;
      return threads.filter(t => 
        t.isResolved && 
        t.comments.nodes[0]?.author.login === 'github-actions[bot]'
      ).length;
    } catch (error) {
      return 0;
    }
  }

  /**
   * List all issue comments (PR-level comments) on a PR
   */
  async listIssueComments(prNumber: number): Promise<Array<{
    id: number;
    body: string;
    user: string;
    createdAt: string;
    updatedAt: string;
  }>> {
    try {
      const { data } = await this.octokit.issues.listComments({
        owner: this.owner,
        repo: this.repo,
        issue_number: prNumber,
        per_page: 100,
      });

      return data.map(c => ({
        id: c.id,
        body: c.body || '',
        user: c.user?.login || 'unknown',
        createdAt: c.created_at,
        updatedAt: c.updated_at,
      }));
    } catch (error) {
      core.error(`Failed to list issue comments: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Delete an issue comment (PR-level comment)
   */
  async deleteIssueComment(commentId: number): Promise<void> {
    try {
      await this.octokit.issues.deleteComment({
        owner: this.owner,
        repo: this.repo,
        comment_id: commentId,
      });

      core.info(`✅ Deleted issue comment #${commentId}`);
    } catch (error) {
      core.error(`Failed to delete issue comment: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }
}
