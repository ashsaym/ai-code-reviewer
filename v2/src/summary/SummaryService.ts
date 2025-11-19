/**
 * Summary Service
 * 
 * Generates comprehensive PR summaries with commit-based analysis
 */

import * as core from '@actions/core';
import { PullRequestService, PRInfo } from '../github/PullRequestService';
import { CommentService } from '../github/CommentService';
import { BaseProvider } from '../providers/BaseProvider';
import { VERSION } from '../version';

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
5. **Recommendations for reviewers**: What should reviewers pay attention to?

Also provide:
- A brief description (15-30 words) of what changed in EACH commit for the commit analysis table
- A concise summary timeline (3-5 key milestones) showing the evolution of changes

Keep the summary informative but concise. Use bullet points where appropriate. Focus on providing value to reviewers and stakeholders.`;
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

    // Extract and format timeline separately
    const timeline = this.extractTimeline(aiContent);
    const mainSummary = this.removeTimelineFromContent(aiContent);
    
    // Add AI-generated summary (without timeline)
    parts.push(mainSummary.trim());
    parts.push('');

    // Add timeline if extracted
    if (timeline.length > 0) {
      parts.push('### ⏱️ Summary Timeline');
      parts.push('');
      timeline.forEach((item, index) => {
        parts.push(`${index + 1}. ${item}`);
      });
      parts.push('');
    }

    // Add commit-based analysis as table
    parts.push('---');
    parts.push('');
    parts.push('### 📝 Commit Analysis');
    parts.push('');

    if (commits.length === 0) {
      parts.push('_No commits yet in this pull request._');
    } else {
      // Extract commit descriptions from AI response
      const commitDescriptions = this.extractCommitDescriptions(aiContent, commits);
      
      // Table header
      parts.push('| Commit | Files Changed | Message | Description |');
      parts.push('|--------|---------------|---------|-------------|');
      
      // Table rows
      for (let i = 0; i < commits.length; i++) {
        const commit = commits[i];
        const sha = commit.sha.substring(0, 7);
        const message = commit.message.split('\n')[0]; // Keep full message
        
        // Format files with links to PR file diff view
        const prUrl = this.prService.getPRUrl(prInfo.number);
        const filesSummary = commit.files.length === 0 
          ? '_No files_'
          : commit.files.slice(0, 2).map(f => {
              // Link to PR file diff, not commit
              const fileName = f.filename.split('/').pop() || f.filename;
              return `[${fileName}](${prUrl}/files#diff-${this.getFileDiffId(f.filename)}) (+${f.additions}/-${f.deletions})`;
            }).join(', ') + (commit.files.length > 2 ? `, +${commit.files.length - 2} more` : '');
        
        const description = commitDescriptions[i] || '_See message_';
        
        parts.push(`| [${sha}](${prUrl}/commits/${commit.sha}) | ${filesSummary} | ${message} | ${description} |`);
      }
    }

    // Add footer
    parts.push('');
    parts.push('---');
    parts.push('');
    parts.push(`_Generated by Code Sentinel AI v${VERSION} (${this.aiProvider.getModel()}) • [View PR Files](${this.prService.getPRUrl(prInfo.number)}/files)_`);

    return parts.join('\n');
  }

  /**
   * Extract timeline from AI response
   */
  private extractTimeline(aiContent: string): string[] {
    const timeline: string[] = [];
    const lines = aiContent.split('\n');
    let inTimelineSection = false;
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      // Detect timeline section
      if (trimmed.toLowerCase().includes('timeline') || trimmed.toLowerCase().includes('summary timeline')) {
        inTimelineSection = true;
        continue;
      }
      
      // Stop at next section header or commit analysis
      if (inTimelineSection && (trimmed.startsWith('##') || trimmed.startsWith('###') || trimmed.toLowerCase().includes('commit'))) {
        break;
      }
      
      // Extract timeline items (numbered or bulleted)
      if (inTimelineSection && (trimmed.match(/^[\d]+\./) || trimmed.startsWith('-') || trimmed.startsWith('•'))) {
        const item = trimmed.replace(/^[\d]+\.\s*/, '').replace(/^[-•]\s*/, '').trim();
        if (item.length > 10) { // Only meaningful items
          timeline.push(item);
        }
      }
    }
    
    return timeline;
  }

  /**
   * Remove timeline section from content to avoid duplication
   */
  private removeTimelineFromContent(aiContent: string): string {
    const lines = aiContent.split('\n');
    const result: string[] = [];
    let skipUntilNextSection = false;
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      // Detect timeline section start
      if (trimmed.toLowerCase().includes('summary timeline') || 
          (trimmed.toLowerCase().includes('timeline') && (trimmed.startsWith('#') || trimmed.startsWith('**')))) {
        skipUntilNextSection = true;
        continue;
      }
      
      // Detect next major section (stop skipping)
      if (skipUntilNextSection && trimmed.startsWith('##')) {
        skipUntilNextSection = false;
      }
      
      // Skip timeline content
      if (skipUntilNextSection) {
        continue;
      }
      
      result.push(line);
    }
    
    return result.join('\n');
  }

  /**
   * Generate a simple hash for file diff anchor (GitHub uses complex hashing)
   * This is a simplified version - users can click filename to see diff
   */
  private getFileDiffId(filename: string): string {
    // Simple hash - GitHub's actual algorithm is more complex
    // This creates a reasonable anchor that will take user to Files tab
    return Buffer.from(filename).toString('base64').replace(/[^a-zA-Z0-9]/g, '').substring(0, 16);
  }

  /**
   * Extract commit descriptions from AI response
   */
  private extractCommitDescriptions(aiContent: string, commits: CommitInfo[]): string[] {
    const descriptions: string[] = [];
    const lines = aiContent.split('\n');
    
    // Look for "Commit analysis" section with numbered items
    let inCommitAnalysis = false;
    const commitDescMap = new Map<string, string>();
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      
      // Detect commit analysis section
      if (trimmed.toLowerCase().includes('commit analysis') || 
          trimmed.toLowerCase().includes('commit descriptions')) {
        inCommitAnalysis = true;
        continue;
      }
      
      // Stop at next major section
      if (inCommitAnalysis && trimmed.startsWith('###')) {
        break;
      }
      
      // Parse commit entries like: "1. c7d01d4 - message"
      if (inCommitAnalysis) {
        const match = trimmed.match(/^\d+\.\s+([a-f0-9]{7})\s*-\s*(.+)/i);
        if (match) {
          const sha = match[1];
          
          // Look for description in next line(s)
          let description = '';
          for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
            const nextLine = lines[j].trim();
            // Description lines typically start with "-" or are indented
            if (nextLine.startsWith('-') || (nextLine.length > 20 && !nextLine.match(/^\d+\./))) {
              description = nextLine.replace(/^[-\s]+/, '').trim();
              if (description.length > 20) {
                break;
              }
            }
          }
          
          if (description && description.length > 20) {
            commitDescMap.set(sha, description);
          }
        }
      }
    }
    
    // Match descriptions to commits
    for (const commit of commits) {
      const sha = commit.sha.substring(0, 7);
      const desc = commitDescMap.get(sha);
      
      if (desc && desc !== commit.message) {
        // Use AI description if different from message
        descriptions.push(desc.substring(0, 100));
      } else {
        // Fallback: generate brief description from files changed
        if (commit.files.length === 0) {
          descriptions.push('_No file changes_');
        } else if (commit.files.length === 1) {
          const file = commit.files[0];
          descriptions.push(`${file.status} \`${file.filename}\` (+${file.additions}/-${file.deletions})`);
        } else {
          const summary = commit.files.map(f => f.filename.split('/').pop()).slice(0, 2).join(', ');
          descriptions.push(`Modified ${commit.files.length} files: ${summary}${commit.files.length > 2 ? ', ...' : ''}`);
        }
      }
    }
    
    return descriptions;
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
