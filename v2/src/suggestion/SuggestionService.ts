/**
 * Suggestion Service
 * 
 * Generates improvement suggestions for PRs
 */

import * as core from '@actions/core';
import { PullRequestService, PRInfo } from '../github/PullRequestService';
import { CommentService } from '../github/CommentService';
import { BaseProvider } from '../providers/BaseProvider';

export interface SuggestionServiceOptions {
  prService: PullRequestService;
  commentService: CommentService;
  aiProvider: BaseProvider;
  prNumber: number;
}

export class SuggestionService {
  private readonly prService: PullRequestService;
  private readonly commentService: CommentService;
  private readonly aiProvider: BaseProvider;
  private readonly prNumber: number;

  // Marker to identify suggestion comments
  private static readonly SUGGESTION_MARKER = '<!-- AI_SUGGESTION_COMMENT -->';

  constructor(options: SuggestionServiceOptions) {
    this.prService = options.prService;
    this.commentService = options.commentService;
    this.aiProvider = options.aiProvider;
    this.prNumber = options.prNumber;
  }

  /**
   * Generate and post PR suggestions
   */
  async generateSuggestions(): Promise<void> {
    try {
      core.info('💡 Generating PR suggestions...');

      // Get PR info
      const prInfo = await this.prService.getPullRequest(this.prNumber);
      
      // Get file diffs
      const files = await this.prService.getFiles(this.prNumber);

      // Build suggestion prompt
      const prompt = this.buildSuggestionPrompt(prInfo, files);

      // Generate suggestions using AI
      core.info('🤖 Requesting suggestions from AI...');
      const response = await this.aiProvider.sendMessage([
        { role: 'user', content: prompt }
      ], { responseFormat: 'text' });

      // Format suggestions
      const formattedSuggestions = this.formatSuggestions(response.content, prInfo);

      // Delete old suggestion comments
      await this.deleteOldSuggestions();

      // Post new suggestions
      await this.commentService.createIssueComment(this.prNumber, formattedSuggestions);

      core.info('✅ Suggestions generated and posted successfully');
    } catch (error) {
      core.error(`Failed to generate suggestions: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Build prompt for AI suggestion generation
   */
  private buildSuggestionPrompt(prInfo: PRInfo, files: Array<any>): string {
    // Format files section
    const filesSection = this.formatFilesForPrompt(files);

    return `You are an expert code reviewer tasked with providing constructive improvement suggestions for a pull request.

Pull Request Information:
- Title: ${prInfo.title}
- Author: ${prInfo.author}
- Branch: ${prInfo.headRef} → ${prInfo.baseRef}
- Changes: +${prInfo.additions}/-${prInfo.deletions} lines across ${prInfo.changedFiles} files

PR Description:
${prInfo.body || 'No description provided'}

Files Changed:
${filesSection}

Please provide actionable improvement suggestions for this pull request. Focus on:

1. **Code Quality**: Suggest improvements for readability, maintainability, and best practices
2. **Performance**: Identify potential performance improvements or optimizations
3. **Security**: Highlight any security concerns or vulnerabilities
4. **Testing**: Recommend additional test cases or test coverage improvements
5. **Documentation**: Suggest areas that need better documentation or comments
6. **Architecture**: Provide architectural suggestions if applicable

Format your response as a structured list of suggestions. Each suggestion should:
- Be specific and actionable
- Include the file/area it applies to
- Explain why the change would be beneficial
- Provide an example if helpful

Keep suggestions constructive and focused on improvements rather than criticism.`;
  }

  /**
   * Format files for prompt
   */
  private formatFilesForPrompt(files: Array<any>): string {
    if (files.length === 0) {
      return 'No files changed';
    }

    return files.map((f, index) => {
      const lines = [];
      lines.push(`${index + 1}. **${f.filename}** (${f.status}, +${f.additions}/-${f.deletions})`);
      
      if (f.patch) {
        // Include a snippet of the diff
        const patchLines = f.patch.split('\n').slice(0, 20);
        lines.push('```diff');
        lines.push(patchLines.join('\n'));
        if (f.patch.split('\n').length > 20) {
          lines.push('... (truncated)');
        }
        lines.push('```');
      }
      
      return lines.join('\n');
    }).join('\n\n');
  }

  /**
   * Format the suggestions output
   */
  private formatSuggestions(aiContent: string, prInfo: PRInfo): string {
    const parts: string[] = [];

    // Add marker for identification
    parts.push(SuggestionService.SUGGESTION_MARKER);
    parts.push('');

    // Add header
    parts.push('## 💡 Improvement Suggestions');
    parts.push('');
    parts.push('Here are some suggestions to improve this pull request:');
    parts.push('');

    // Add AI-generated suggestions
    parts.push(aiContent.trim());
    parts.push('');

    // Add footer
    parts.push('---');
    parts.push('');
    parts.push(`_Suggestions generated by ${this.aiProvider.getProviderName()} • [View PR Files](${this.prService.getPRUrl(prInfo.number)}/files)_`);

    return parts.join('\n');
  }

  /**
   * Delete old suggestion comments
   */
  private async deleteOldSuggestions(): Promise<void> {
    try {
      core.info('🗑️  Checking for old suggestion comments...');
      
      const comments = await this.commentService.listIssueComments(this.prNumber);
      
      const suggestionComments = comments.filter((comment: { body: string }) => 
        comment.body?.includes(SuggestionService.SUGGESTION_MARKER)
      );

      if (suggestionComments.length > 0) {
        core.info(`Found ${suggestionComments.length} old suggestion comment(s), deleting...`);
        
        for (const comment of suggestionComments) {
          await this.commentService.deleteIssueComment(comment.id);
          core.info(`  ✓ Deleted comment #${comment.id}`);
        }
      } else {
        core.info('No old suggestion comments found');
      }
    } catch (error) {
      core.warning(`Failed to delete old suggestions: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
