/**
 * Suggestion Service
 * 
 * Generates improvement suggestions as inline code review comments
 */

import * as core from '@actions/core';
import { PullRequestService, PRInfo } from '../github/PullRequestService';
import { CommentService } from '../github/CommentService';
import { BaseProvider } from '../providers/BaseProvider';
import { DiffParser } from '../github/DiffParser';
import { VERSION } from '../version';

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
   * Generate and post PR suggestions as inline review comments
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

      // Generate suggestions using AI (request JSON format for structured suggestions)
      core.info('🤖 Requesting suggestions from AI...');
      const response = await this.aiProvider.sendMessage([
        { role: 'user', content: prompt }
      ], { responseFormat: 'json' });

      // Parse JSON response
      const suggestions = this.parseSuggestions(response.content, files);

      if (suggestions.length === 0) {
        core.info('No inline suggestions generated, posting general comment instead');
        await this.postGeneralSuggestions(prInfo, response.content);
        return;
      }

      // Delete old suggestion reviews
      await this.deleteOldSuggestions();

      // Post inline review with suggestions
      const reviewBody = this.buildReviewBody(suggestions.length);
      
      await this.commentService.createReview(
        this.prNumber,
        prInfo.headSha,
        reviewBody,
        'COMMENT',
        suggestions
      );

      core.info(`✅ Posted ${suggestions.length} inline suggestions successfully`);
    } catch (error) {
      core.error(`Failed to generate suggestions: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Build prompt for AI suggestion generation (requests JSON format)
   */
  private buildSuggestionPrompt(prInfo: PRInfo, files: Array<any>): string {
    // Format files section
    const filesSection = this.formatFilesForPrompt(files);

    return `You are an expert code reviewer providing improvement suggestions for a pull request.

Pull Request Information:
- Title: ${prInfo.title}
- Author: ${prInfo.author}
- Branch: ${prInfo.headRef} → ${prInfo.baseRef}
- Changes: +${prInfo.additions}/-${prInfo.deletions} lines across ${prInfo.changedFiles} files

PR Description:
${prInfo.body || 'No description provided'}

Files Changed:
${filesSection}

Please analyze the code changes and provide inline suggestions for improvements. Focus on:
- Code quality, readability, and maintainability
- Performance optimizations
- Security concerns
- Best practices and design patterns
- Testing and documentation improvements

**IMPORTANT: You must respond with valid JSON in the following format:**

{
  "suggestions": [
    {
      "path": "path/to/file.js",
      "line": 42,
      "suggestion": "Consider using const instead of let for variables that aren't reassigned",
      "category": "code-quality",
      "priority": "low"
    }
  ]
}

Each suggestion must include:
- path: The file path (must match exactly from the files list above)
- line: The line number where the suggestion applies (must be a changed line)
- suggestion: Clear, actionable improvement suggestion
- category: One of: code-quality, performance, security, testing, documentation, architecture
- priority: One of: low, medium, high

Provide 5-10 specific inline suggestions. Be constructive and specific. Focus on the most impactful improvements.`;
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
   * Parse AI JSON response into inline suggestion comments
   */
  private parseSuggestions(
    jsonContent: string,
    files: Array<any>
  ): Array<{ path: string; position: number; body: string }> {
    try {
      const parsed = JSON.parse(jsonContent);
      const suggestions: Array<{ path: string; position: number; body: string }> = [];

      if (!parsed.suggestions || !Array.isArray(parsed.suggestions)) {
        core.warning('AI response missing suggestions array');
        return [];
      }

      for (const sug of parsed.suggestions) {
        const file = files.find(f => f.filename === sug.path);
        if (!file || !file.patch) {
          core.warning(`File ${sug.path} not found or has no patch`);
          continue;
        }

        // Calculate position from line number
        const position = this.calculatePosition(file.filename, file.patch, sug.line);
        if (position === null) {
          core.warning(`Could not calculate position for line ${sug.line} in ${sug.path}`);
          continue;
        }

        // Format suggestion body
        const emoji = sug.priority === 'high' ? '🔴' : sug.priority === 'medium' ? '🟡' : '🟢';
        const body = `${emoji} **Suggestion** (\`${sug.category}\` • \`${sug.priority}\` priority)\n\n${sug.suggestion}`;

        suggestions.push({ path: sug.path, position, body });
      }

      return suggestions;
    } catch (error) {
      core.error(`Failed to parse suggestions JSON: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
  }

  /**
   * Calculate diff position from line number using DiffParser
   */
  private calculatePosition(filename: string, patch: string, targetLine: number): number | null {
    try {
      const parsed = DiffParser.parsePatch(filename, patch);
      
      // Find the line in the diff
      for (const hunk of parsed.hunks) {
        for (const line of hunk.lines) {
          // Match new line number for added or context lines
          if (line.newLineNumber === targetLine) {
            return line.position;
          }
        }
      }
      
      return null;
    } catch (error) {
      core.warning(`Failed to parse diff: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }

  /**
   * Build review body for suggestions
   */
  private buildReviewBody(count: number): string {
    return `## 💡 Improvement Suggestions

Found ${count} suggestions to improve this pull request. See inline comments below.

_Generated by Code Sentinel AI v${VERSION} (${this.aiProvider.getModel()})_`;
  }

  /**
   * Post general suggestions as a comment (fallback)
   */
  private async postGeneralSuggestions(prInfo: PRInfo, content: string): Promise<void> {
    const body = `${SuggestionService.SUGGESTION_MARKER}

## 💡 Improvement Suggestions

${content}

---

_Generated by Code Sentinel AI v${VERSION} (${this.aiProvider.getModel()}) • [View PR Files](${this.prService.getPRUrl(prInfo.number)}/files)_`;

    await this.commentService.createIssueComment(this.prNumber, body);
  }

  /**
   * Delete old suggestion reviews
   * Note: GitHub doesn't allow dismissing COMMENT reviews, so we delete individual comments instead
   */
  private async deleteOldSuggestions(): Promise<void> {
    try {
      core.info('🗑️  Checking for old suggestion reviews...');
      
      const reviews = await this.commentService.listReviews(this.prNumber);
      
      // Find reviews that contain our suggestion marker or header
      const suggestionReviews = reviews.filter(review => 
        review.body?.includes('💡 Improvement Suggestions') || 
        review.body?.includes(SuggestionService.SUGGESTION_MARKER)
      );

      if (suggestionReviews.length > 0) {
        core.info(`Found ${suggestionReviews.length} old suggestion review(s), deleting comments...`);
        
        for (const review of suggestionReviews) {
          try {
            // Get all comments in this review
            const comments = await this.commentService.getReviewComments(this.prNumber, review.id);
            core.info(`  Review #${review.id} has ${comments.length} comments`);
            
            // Delete each comment
            for (const comment of comments) {
              try {
                await this.commentService.deleteReviewComment(comment.id);
                core.info(`    ✓ Deleted comment #${comment.id}`);
              } catch (error) {
                core.warning(`    Could not delete comment #${comment.id}: ${error instanceof Error ? error.message : String(error)}`);
              }
            }
            
            core.info(`  ✓ Deleted all comments from review #${review.id}`);
          } catch (error) {
            core.warning(`Could not process review #${review.id}: ${error instanceof Error ? error.message : String(error)}`);
          }
        }
      } else {
        core.info('No old suggestion reviews found');
      }
    } catch (error) {
      core.warning(`Failed to delete old suggestions: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
