/**
 * Pull Request Service
 * 
 * High-level operations for working with pull requests
 */

import * as core from '@actions/core';
import { Octokit } from '@octokit/rest';

export interface PRFile {
  filename: string;
  sha: string;
  status: 'added' | 'removed' | 'modified' | 'renamed' | 'copied' | 'changed' | 'unchanged';
  additions: number;
  deletions: number;
  changes: number;
  patch?: string;
  previousFilename?: string;
}

export interface PRInfo {
  number: number;
  title: string;
  body: string;
  state: 'open' | 'closed';
  headSha: string;
  headRef: string;
  baseSha: string;
  baseRef: string;
  author: string;
  createdAt: string;
  updatedAt: string;
  mergeable: boolean | null;
  mergeableState: string;
  files: PRFile[];
  additions: number;
  deletions: number;
  changedFiles: number;
}

export interface PullRequestServiceOptions {
  octokit: Octokit;
  owner: string;
  repo: string;
}

export class PullRequestService {
  private readonly octokit: Octokit;
  private readonly owner: string;
  private readonly repo: string;

  constructor(options: PullRequestServiceOptions) {
    this.octokit = options.octokit;
    this.owner = options.owner;
    this.repo = options.repo;
  }

  /**
   * Get pull request details
   */
  async getPullRequest(prNumber: number): Promise<PRInfo> {
    try {
      const { data: pr } = await this.octokit.pulls.get({
        owner: this.owner,
        repo: this.repo,
        pull_number: prNumber,
      });

      // Get files
      const files = await this.getFiles(prNumber);

      return {
        number: pr.number,
        title: pr.title,
        body: pr.body || '',
        state: pr.state as 'open' | 'closed',
        headSha: pr.head.sha,
        headRef: pr.head.ref,
        baseSha: pr.base.sha,
        baseRef: pr.base.ref,
        author: pr.user?.login || 'unknown',
        createdAt: pr.created_at,
        updatedAt: pr.updated_at,
        mergeable: pr.mergeable,
        mergeableState: pr.mergeable_state || 'unknown',
        files,
        additions: pr.additions || 0,
        deletions: pr.deletions || 0,
        changedFiles: pr.changed_files || 0,
      };
    } catch (error) {
      core.error(`Failed to get PR #${prNumber}: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Get all files changed in PR
   */
  async getFiles(prNumber: number): Promise<PRFile[]> {
    try {
      const files: PRFile[] = [];
      let page = 1;
      const perPage = 100;

      while (true) {
        const { data } = await this.octokit.pulls.listFiles({
          owner: this.owner,
          repo: this.repo,
          pull_number: prNumber,
          per_page: perPage,
          page,
        });

        if (data.length === 0) break;

        files.push(...data.map(f => ({
          filename: f.filename,
          sha: f.sha,
          status: f.status as PRFile['status'],
          additions: f.additions,
          deletions: f.deletions,
          changes: f.changes,
          patch: f.patch,
          previousFilename: f.previous_filename,
        })));

        if (data.length < perPage) break;
        page++;
      }

      core.info(`Found ${files.length} changed files in PR #${prNumber}`);
      return files;
    } catch (error) {
      core.error(`Failed to get PR files: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Get commits in PR
   */
  async getCommits(prNumber: number): Promise<Array<{
    sha: string;
    message: string;
    author: string;
    date: string;
  }>> {
    try {
      const { data } = await this.octokit.pulls.listCommits({
        owner: this.owner,
        repo: this.repo,
        pull_number: prNumber,
        per_page: 100,
      });

      return data.map(c => ({
        sha: c.sha,
        message: c.commit.message,
        author: c.commit.author?.name || 'unknown',
        date: c.commit.author?.date || new Date().toISOString(),
      }));
    } catch (error) {
      core.error(`Failed to get PR commits: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Get PR diff
   */
  async getDiff(prNumber: number): Promise<string> {
    try {
      const { data } = await this.octokit.pulls.get({
        owner: this.owner,
        repo: this.repo,
        pull_number: prNumber,
        mediaType: {
          format: 'diff',
        },
      });

      return data as unknown as string;
    } catch (error) {
      core.error(`Failed to get PR diff: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Update PR description
   */
  async updateDescription(prNumber: number, body: string): Promise<void> {
    try {
      await this.octokit.pulls.update({
        owner: this.owner,
        repo: this.repo,
        pull_number: prNumber,
        body,
      });

      core.info(`✅ Updated PR #${prNumber} description`);
    } catch (error) {
      core.error(`Failed to update PR description: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Check if PR is mergeable
   */
  async isMergeable(prNumber: number): Promise<boolean> {
    const pr = await this.getPullRequest(prNumber);
    return pr.mergeable === true;
  }

  /**
   * Get PR labels
   */
  async getLabels(prNumber: number): Promise<string[]> {
    try {
      const { data } = await this.octokit.issues.listLabelsOnIssue({
        owner: this.owner,
        repo: this.repo,
        issue_number: prNumber,
      });

      return data.map(l => l.name);
    } catch (error) {
      core.warning(`Failed to get PR labels: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
  }

  /**
   * Add labels to PR
   */
  async addLabels(prNumber: number, labels: string[]): Promise<void> {
    try {
      await this.octokit.issues.addLabels({
        owner: this.owner,
        repo: this.repo,
        issue_number: prNumber,
        labels,
      });

      core.info(`✅ Added labels to PR #${prNumber}: ${labels.join(', ')}`);
    } catch (error) {
      core.error(`Failed to add labels: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Filter files by extension
   */
  filterFilesByExtension(files: PRFile[], extensions: string[]): PRFile[] {
    return files.filter(f => {
      const ext = f.filename.split('.').pop()?.toLowerCase();
      return ext && extensions.includes(ext);
    });
  }

  /**
   * Filter files by path pattern
   */
  filterFilesByPattern(files: PRFile[], patterns: RegExp[]): PRFile[] {
    return files.filter(f => patterns.some(p => p.test(f.filename)));
  }

  /**
   * Exclude files by pattern
   */
  excludeFilesByPattern(files: PRFile[], patterns: RegExp[]): PRFile[] {
    return files.filter(f => !patterns.some(p => p.test(f.filename)));
  }

  /**
   * Get file content at specific commit
   */
  async getFileContent(path: string, ref: string): Promise<string | null> {
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
      core.debug(`File not found: ${path} at ${ref}`);
      return null;
    }
  }

  /**
   * Compare two commits
   */
  async compareCommits(base: string, head: string): Promise<{
    ahead: number;
    behind: number;
    files: PRFile[];
  }> {
    try {
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
          sha: f.sha,
          status: f.status as PRFile['status'],
          additions: f.additions,
          deletions: f.deletions,
          changes: f.changes,
          patch: f.patch,
          previousFilename: f.previous_filename,
        })) || [],
      };
    } catch (error) {
      core.error(`Failed to compare commits: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Get PR statistics
   */
  async getStats(prNumber: number): Promise<{
    totalFiles: number;
    totalAdditions: number;
    totalDeletions: number;
    totalChanges: number;
    filesByStatus: Record<string, number>;
    largestFiles: Array<{ filename: string; changes: number }>;
  }> {
    const files = await this.getFiles(prNumber);

    const filesByStatus: Record<string, number> = {};
    let totalAdditions = 0;
    let totalDeletions = 0;
    let totalChanges = 0;

    for (const file of files) {
      filesByStatus[file.status] = (filesByStatus[file.status] || 0) + 1;
      totalAdditions += file.additions;
      totalDeletions += file.deletions;
      totalChanges += file.changes;
    }

    const largestFiles = files
      .sort((a, b) => b.changes - a.changes)
      .slice(0, 10)
      .map(f => ({ filename: f.filename, changes: f.changes }));

    return {
      totalFiles: files.length,
      totalAdditions,
      totalDeletions,
      totalChanges,
      filesByStatus,
      largestFiles,
    };
  }
}
