/**
 * Description Service
 * 
 * Generates and updates PR descriptions with AI-powered analysis
 */

import * as core from '@actions/core';
import { PullRequestService, PRInfo } from '../github/PullRequestService';
import { BaseProvider } from '../providers/BaseProvider';
import { VERSION } from '../version';

export interface CommitInfo {
  sha: string;
  message: string;
  author: string;
  date: string;
}

export interface DescriptionServiceOptions {
  prService: PullRequestService;
  aiProvider: BaseProvider;
  prNumber: number;
}

export class DescriptionService {
  private readonly prService: PullRequestService;
  private readonly aiProvider: BaseProvider;
  private readonly prNumber: number;

  constructor(options: DescriptionServiceOptions) {
    this.prService = options.prService;
    this.aiProvider = options.aiProvider;
    this.prNumber = options.prNumber;
  }

  /**
   * Generate and update PR description
   */
  async generateDescription(): Promise<void> {
    try {
      core.info('📝 Generating PR description...');

      // Get PR info
      const prInfo = await this.prService.getPullRequest(this.prNumber);
      
      // Get commits
      const commits = await this.prService.getCommits(this.prNumber);
      
      // Get file diffs
      const files = await this.prService.getFiles(this.prNumber);

      // Build description prompt
      const prompt = this.buildDescriptionPrompt(prInfo, commits, files);

      // Generate description using AI
      core.info('🤖 Requesting description from AI...');
      const response = await this.aiProvider.sendMessage([
        { role: 'user', content: prompt }
      ], { responseFormat: 'text' });

      // Format description with footer
      const formattedDescription = this.formatDescription(response.content);

      // Update PR description
      await this.prService.updatePullRequest(this.prNumber, {
        body: formattedDescription
      });

      core.info('✅ PR description updated successfully');
    } catch (error) {
      core.error(`Failed to generate description: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Build prompt for AI description generation
   */
  private buildDescriptionPrompt(
    prInfo: PRInfo, 
    commits: Array<CommitInfo>,
    files: Array<any>
  ): string {
    // Format commits section - keep it concise
    const commitsSection = commits.slice(0, 10).map((c, idx) => 
      `${idx + 1}. ${c.message}`
    ).join('\n');
    
    const commitSummary = commits.length > 10 
      ? `${commitsSection}\n... and ${commits.length - 10} more commits`
      : commitsSection;

    // Format files section - group by type
    const filesByType: Record<string, typeof files> = {};
    files.forEach(f => {
      const ext = f.filename.split('.').pop() || 'other';
      if (!filesByType[ext]) filesByType[ext] = [];
      filesByType[ext].push(f);
    });

    const filesSection = Object.entries(filesByType).map(([ext, fileList]) => {
      const fileNames = fileList.map(f => `${f.filename} (${f.status})`).join(', ');
      return `- **${ext}**: ${fileNames}`;
    }).join('\n');

    return `You are a technical writer creating a concise, impactful pull request description.

Pull Request Information:
- Title: ${prInfo.title}
- Author: ${prInfo.author}
- Branch: ${prInfo.headRef} → ${prInfo.baseRef}
- Changes: +${prInfo.additions}/-${prInfo.deletions} lines across ${prInfo.changedFiles} files

Current Description:
${prInfo.body || 'No description provided'}

Commits (${commits.length}):
${commitSummary}

Files Changed (${files.length}):
${filesSection}

Create a focused, professional PR description using this structure:

## Description
2-4 sentences explaining what this PR does and why. Focus on business value and technical context.

## Type of Change
Mark with [x] the applicable types:
- [ ] Bug fix (non-breaking change fixing an issue)
- [ ] New feature (non-breaking change adding functionality)
- [ ] Breaking change (fix or feature causing existing functionality to break)
- [ ] Refactoring (code change that neither fixes a bug nor adds a feature)
- [ ] Documentation update
- [ ] Performance improvement
- [ ] Test coverage improvement

## Changes Made
List 3-7 key changes as concise bullet points. Focus on:
- What was changed (specific files/functions if important)
- Why it was needed
- Impact on the system

## Testing
1-2 sentences about what was tested or needs testing. Be specific about test types (unit, integration, manual).

## Additional Notes
ONLY include if there are:
- Breaking changes that need migration steps
- Important dependencies or environment changes
- Known limitations or follow-up work needed

Keep it concise - aim for clarity over completeness. No conversational phrases like "If you want, I can..." or "Let me know if...". Just state facts.`;
  }

  /**
   * Format the AI-generated description with footer
   */
  private formatDescription(content: string): string {
    // Remove any existing AI-generated footer to avoid duplication
    const cleanContent = content.replace(/---\s*\n_Generated by.*_$/s, '').trim();

    return `${cleanContent}

---

_Generated by Code Sentinel AI v${VERSION} (${this.aiProvider.getModel()})_`;
  }
}
