/**
 * Summary Service
 * 
 * Generates comprehensive PR summaries with commit-based analysis
 */

import * as core from '@actions/core';
import { PullRequestService, PRInfo } from '../github/PullRequestService';
import { CommentService } from '../github/CommentService';
import { BaseProvider } from '../providers/BaseProvider';

export interface CommitInfo {
  sha: string;
  message: string;
  author: string;
  date: string;
  files: Array<{
    filename: string;
    status: string;
    additions: number;
    deletions: number;
    changes: number;
  }>;
}

export interface SummaryServiceOptions {
  prService: PullRequestService;
  commentService: CommentService;
  aiProvider: BaseProvider;
  prNumber: number;
}

export class SummaryService {
  private readonly prService: PullRequestService;
  private readonly commentService: CommentService;
  private readonly aiProvider: BaseProvider;
  private readonly prNumber: number;

  // Marker to identify summary comments
  private static readonly SUMMARY_MARKER = '<!-- AI_SUMMARY_COMMENT -->';

  constructor(options: SummaryServiceOptions) {
    this.prService = options.prService;
    this.commentService = options.commentService;
    this.aiProvider = options.aiProvider;
    this.prNumber = options.prNumber;
  }

  /**
   * Generate and post PR summary
   */
  async generateSummary(): Promise<void> {
    try {
      core.info('📝 Generating PR summary...');

      // Get PR info
      const prInfo = await this.prService.getPullRequest(this.prNumber);
      
      // Get commits
      const commits = await this.prService.getCommits(this.prNumber);
      
      // Get commit details with files
      const commitDetails = await this.getCommitDetails(commits);

      // Build summary prompt
      const prompt = this.buildSummaryPrompt(prInfo, commitDetails);

      // Generate summary using AI
      core.info('🤖 Requesting summary from AI...');
      const response = await this.aiProvider.sendMessage([
        { role: 'user', content: prompt }
      ], { responseFormat: 'text' });

      // Format summary with commit analysis
      const formattedSummary = this.formatSummary(response.content, prInfo, commitDetails);

      // Delete old summary comments
      await this.deleteOldSummaries();

      // Post new summary
      await this.commentService.createIssueComment(this.prNumber, formattedSummary);

      core.info('✅ Summary generated and posted successfully');
    } catch (error) {
      core.error(`Failed to generate summary: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Get detailed commit information including files changed per commit
   */
  private async getCommitDetails(commits: Array<{
    sha: string;
    message: string;
    author: string;
    date: string;
  }>): Promise<CommitInfo[]> {
    const commitDetails: CommitInfo[] = [];

    for (const commit of commits) {
      try {
        const files = await this.prService.getCommitFiles(commit.sha);
        commitDetails.push({
          ...commit,
          files: files.map(f => ({
            filename: f.filename,
            status: f.status,
            additions: f.additions,
            deletions: f.deletions,
            changes: f.changes,
          })),
        });
      } catch (error) {
        core.warning(`Failed to get files for commit ${commit.sha.substring(0, 7)}: ${error}`);
        commitDetails.push({
          ...commit,
          files: [],
        });
      }
    }

    return commitDetails;
  }

  /**
   * Build prompt for AI summary generation
   */
  private buildSummaryPrompt(prInfo: PRInfo, commits: CommitInfo[]): string {
    // Format commits section
    const commitsSection = this.formatCommitsForPrompt(commits);
    
    // Format files section
    const filesSection = this.formatFilesForPrompt(prInfo.files);

    // Build prompt directly (we'll create template later if needed)
    return `You are an AI assistant tasked with generating a comprehensive pull request summary.

Pull Request Information:
- Title: ${prInfo.title}
- Author: ${prInfo.author}
- Branch: ${prInfo.headRef} → ${prInfo.baseRef}
- Changes: +${prInfo.additions}/-${prInfo.deletions} lines across ${prInfo.changedFiles} files
- Number of commits: ${commits.length}

PR Description:
${prInfo.body || 'No description provided'}

Commits in this PR:
${commitsSection}

Files Changed:
${filesSection}

Please generate a comprehensive summary of this pull request that includes:
1. **Overview**: What is the main purpose of this PR? What problem does it solve?
2. **Key Changes**: What are the most significant changes made?
3. **Impact**: What areas of the codebase are affected? Any potential risks?
4. **Technical Details**: Brief technical explanation of the implementation

Keep the summary concise but informative. Use bullet points where appropriate. Focus on providing value to reviewers and stakeholders.`;
  }

  /**
   * Format commits for prompt
   */
  private formatCommitsForPrompt(commits: CommitInfo[]): string {
    if (commits.length === 0) {
      return 'No commits yet';
    }

    return commits.map((commit, index) => {
      const filesList = commit.files.length > 0
        ? commit.files.map(f => `    - ${f.filename} (${f.status}, +${f.additions}/-${f.deletions})`).join('\n')
        : '    (no files)';
      
      return `${index + 1}. ${commit.sha.substring(0, 7)} - ${commit.message.split('\n')[0]}
   Author: ${commit.author}
   Files:
${filesList}`;
    }).join('\n\n');
  }

  /**
   * Format files for prompt
   */
  private formatFilesForPrompt(files: Array<{ filename: string; status: string; additions: number; deletions: number }>): string {
    if (files.length === 0) {
      return 'No files changed';
    }

    return files.map((f, index) => 
      `${index + 1}. ${f.filename} (${f.status}, +${f.additions}/-${f.deletions})`
    ).join('\n');
  }

  /**
   * Format the final summary with commit analysis
   */
  private formatSummary(aiContent: string, prInfo: PRInfo, commits: CommitInfo[]): string {
    const parts: string[] = [];

    // Add marker for identification
    parts.push(SummaryService.SUMMARY_MARKER);
    parts.push('');

    // Add header
    parts.push('## 📊 Pull Request Summary');
    parts.push('');

    // Add AI-generated summary
    parts.push(aiContent.trim());
    parts.push('');

    // Add commit-based analysis as table
    parts.push('---');
    parts.push('');
    parts.push('### 📝 Commit Analysis');
    parts.push('');

    if (commits.length === 0) {
      parts.push('_No commits yet in this pull request._');
    } else {
      // Table header
      parts.push('| Commit | Message | Author | Date | Files Changed |');
      parts.push('|--------|---------|--------|------|---------------|');
      
      // Table rows
      for (const commit of commits) {
        const sha = commit.sha.substring(0, 7);
        const message = commit.message.split('\n')[0].substring(0, 50); // Truncate long messages
        const author = commit.author;
        const date = new Date(commit.date).toLocaleDateString();
        
        // Format files as a compact list
        const filesSummary = commit.files.length === 0 
          ? '_No files_'
          : commit.files.slice(0, 3).map(f => 
              `[\`${f.filename}\`](${this.prService.getFileUrl(commit.sha, f.filename)}) (+${f.additions}/-${f.deletions})`
            ).join('<br>') + (commit.files.length > 3 ? `<br>_+${commit.files.length - 3} more..._` : '');
        
        parts.push(`| [${sha}](${this.prService.getFileUrl(commit.sha, '')}) | ${message} | ${author} | ${date} | ${filesSummary} |`);
      }
    }

    // Add footer
    const version = require('../../package.json').version;
    parts.push('');
    parts.push('---');
    parts.push('');
    parts.push(`_Generated by Code Sentinel AI v${version} (${this.aiProvider.getModel()}) • [View PR Files](${this.prService.getPRUrl(prInfo.number)}/files)_`);

    return parts.join('\n');
  }

  /**
   * Delete old summary comments
   */
  private async deleteOldSummaries(): Promise<void> {
    try {
      core.info('🗑️  Checking for old summary comments...');
      
      const comments = await this.commentService.listIssueComments(this.prNumber);
      
      const summaryComments = comments.filter((comment: { body: string }) => 
        comment.body?.includes(SummaryService.SUMMARY_MARKER)
      );

      if (summaryComments.length > 0) {
        core.info(`Found ${summaryComments.length} old summary comment(s), deleting...`);
        
        for (const comment of summaryComments) {
          await this.commentService.deleteIssueComment(comment.id);
          core.info(`  ✓ Deleted comment #${comment.id}`);
        }
      } else {
        core.info('No old summary comments found');
      }
    } catch (error) {
      core.warning(`Failed to delete old summaries: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
