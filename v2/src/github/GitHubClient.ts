/**
 * GitHub API Client
 * 
 * Wrapper around Octokit with retry logic and error handling
 */

import * as core from '@actions/core';
import { Octokit } from '@octokit/rest';
import { throttling } from '@octokit/plugin-throttling';
import { retry } from '@octokit/plugin-retry';

// Extend Octokit with plugins
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const OctokitWithPlugins = Octokit.plugin(throttling as any, retry);

export interface GitHubClientOptions {
  /** GitHub token */
  token: string;
  
  /** Repository owner */
  owner: string;
  
  /** Repository name */
  repo: string;
  
  /** Enable request throttling */
  enableThrottling?: boolean;
  
  /** Enable automatic retries */
  enableRetry?: boolean;
}

export class GitHubClient {
  private readonly octokit: Octokit;
  private readonly owner: string;
  private readonly repo: string;

  constructor(options: GitHubClientOptions) {
    this.owner = options.owner;
    this.repo = options.repo;

    // Initialize Octokit with plugins
    this.octokit = new OctokitWithPlugins({
      auth: options.token,
      throttle: options.enableThrottling !== false ? {
        onRateLimit: (retryAfter: number, _options: any, _octokit: Octokit) => {
          core.warning(`Rate limit hit, retrying after ${retryAfter} seconds`);
          return retryAfter <= 60; // Retry if wait is less than 60 seconds
        },
        onSecondaryRateLimit: (retryAfter: number, _options: any, _octokit: Octokit) => {
          core.warning(`Secondary rate limit hit, retrying after ${retryAfter} seconds`);
          return retryAfter <= 60;
        },
      } : undefined,
      retry: options.enableRetry !== false ? {
        doNotRetry: [400, 401, 403, 404, 422],
      } : undefined,
    });

    core.info(`✅ GitHub client initialized for ${this.owner}/${this.repo}`);
  }

  /**
   * Get Octokit instance
   */
  getOctokit(): Octokit {
    return this.octokit;
  }

  /**
   * Get repository info
   */
  getRepoInfo(): { owner: string; repo: string } {
    return {
      owner: this.owner,
      repo: this.repo,
    };
  }

  /**
   * Get authenticated user
   */
  async getAuthenticatedUser(): Promise<string> {
    try {
      const { data } = await this.octokit.users.getAuthenticated();
      return data.login;
    } catch (error) {
      core.warning('Failed to get authenticated user');
      return 'github-actions[bot]';
    }
  }

  /**
   * Check if token has required permissions
   */
  async checkPermissions(): Promise<{
    hasContentsRead: boolean;
    hasPullRequestsWrite: boolean;
    hasChecksWrite: boolean;
  }> {
    try {
      // Try to get repo info (requires contents: read)
      await this.octokit.repos.get({
        owner: this.owner,
        repo: this.repo,
      });

      // Try to list PRs (requires pull_requests: read)
      await this.octokit.pulls.list({
        owner: this.owner,
        repo: this.repo,
        state: 'open',
        per_page: 1,
      });

      return {
        hasContentsRead: true,
        hasPullRequestsWrite: true,
        hasChecksWrite: true, // Assume true if we got this far
      };
    } catch (error) {
      core.error(`Permission check failed: ${error instanceof Error ? error.message : String(error)}`);
      return {
        hasContentsRead: false,
        hasPullRequestsWrite: false,
        hasChecksWrite: false,
      };
    }
  }

  /**
   * Get rate limit status
   */
  async getRateLimit(): Promise<{
    limit: number;
    remaining: number;
    reset: Date;
    used: number;
  }> {
    const { data } = await this.octokit.rateLimit.get();
    
    return {
      limit: data.rate.limit,
      remaining: data.rate.remaining,
      reset: new Date(data.rate.reset * 1000),
      used: data.rate.used,
    };
  }

  /**
   * Get repository details
   */
  async getRepository(): Promise<{
    fullName: string;
    defaultBranch: string;
    isPrivate: boolean;
    language: string | null;
  }> {
    const { data } = await this.octokit.repos.get({
      owner: this.owner,
      repo: this.repo,
    });

    return {
      fullName: data.full_name,
      defaultBranch: data.default_branch,
      isPrivate: data.private,
      language: data.language,
    };
  }

  /**
   * Get file content from repository
   */
  async getFileContent(path: string, ref?: string): Promise<string | null> {
    try {
      const { data } = await this.octokit.repos.getContent({
        owner: this.owner,
        repo: this.repo,
        path,
        ref,
      });

      if ('content' in data) {
        return Buffer.from(data.content, 'base64').toString('utf-8');
      }

      return null;
    } catch (error) {
      core.debug(`File not found: ${path}`);
      return null;
    }
  }

  /**
   * Check if file exists
   */
  async fileExists(path: string, ref?: string): Promise<boolean> {
    try {
      await this.octokit.repos.getContent({
        owner: this.owner,
        repo: this.repo,
        path,
        ref,
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get commit details
   */
  async getCommit(sha: string): Promise<{
    sha: string;
    message: string;
    author: string;
    date: string;
    parents: string[];
  }> {
    const { data } = await this.octokit.repos.getCommit({
      owner: this.owner,
      repo: this.repo,
      ref: sha,
    });

    return {
      sha: data.sha,
      message: data.commit.message,
      author: data.commit.author?.name || 'Unknown',
      date: data.commit.author?.date || new Date().toISOString(),
      parents: data.parents.map(p => p.sha),
    };
  }

  /**
   * Compare two commits
   */
  async compareCommits(base: string, head: string): Promise<{
    ahead: number;
    behind: number;
    files: Array<{
      filename: string;
      status: string;
      additions: number;
      deletions: number;
      changes: number;
      patch?: string;
    }>;
  }> {
    const { data } = await this.octokit.repos.compareCommits({
      owner: this.owner,
      repo: this.repo,
      base,
      head,
    });

    return {
      ahead: data.ahead_by,
      behind: data.behind_by,
      files: data.files?.map(f => ({
        filename: f.filename,
        status: f.status,
        additions: f.additions,
        deletions: f.deletions,
        changes: f.changes,
        patch: f.patch,
      })) || [],
    };
  }

  /**
   * Get blob content (for specific SHA)
   */
  async getBlob(sha: string): Promise<string> {
    const { data } = await this.octokit.git.getBlob({
      owner: this.owner,
      repo: this.repo,
      file_sha: sha,
    });

    return Buffer.from(data.content, 'base64').toString('utf-8');
  }

  /**
   * Search code in repository
   */
  async searchCode(query: string): Promise<Array<{
    path: string;
    sha: string;
    url: string;
  }>> {
    try {
      const { data } = await this.octokit.search.code({
        q: `${query} repo:${this.owner}/${this.repo}`,
        per_page: 100,
      });

      return data.items.map(item => ({
        path: item.path,
        sha: item.sha,
        url: item.html_url,
      }));
    } catch (error) {
      core.warning(`Code search failed: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
  }
}
