/**
 * Prompt Builder
 * 
 * Builds AI prompts from templates and context
 */

import * as core from '@actions/core';
import { TemplateLoader } from './TemplateLoader';
import { PRFile } from '../github/PullRequestService';

export interface PromptContext {
  repository: string;
  prNumber: number;
  prTitle: string;
  prBody: string;
  author: string;
  branch: string;
  baseBranch: string;
  fileCount: number;
  additions: number;
  deletions: number;
  files: Array<{
    filename: string;
    status: string;
    additions: number;
    deletions: number;
    language: string;
    patch: string;
  }>;
  customRules?: string;
  customContext?: string;
}

export class PromptBuilder {
  /**
   * Build review prompt
   */
  static async buildReviewPrompt(context: PromptContext): Promise<string> {
    try {
      const template = await TemplateLoader.loadBuiltInTemplate('review');
      return template(context);
    } catch (error) {
      core.error(`Failed to build review prompt: ${error}`);
      throw error;
    }
  }

  /**
   * Build prompt from custom template
   */
  static async buildFromTemplate(templatePath: string, context: PromptContext): Promise<string> {
    try {
      const template = await TemplateLoader.loadTemplate(templatePath);
      return template(context);
    } catch (error) {
      core.error(`Failed to build prompt from template: ${error}`);
      throw error;
    }
  }

  /**
   * Build prompt from string template
   */
  static buildFromString(templateString: string, context: PromptContext): string {
    const template = TemplateLoader.compileTemplate(templateString);
    return template(context);
  }

  /**
   * Create context from PR data
   */
  static createContext(
    repository: string,
    prNumber: number,
    prTitle: string,
    prBody: string,
    author: string,
    branch: string,
    baseBranch: string,
    files: PRFile[],
    customRules?: string,
    customContext?: string
  ): PromptContext {
    const additions = files.reduce((sum, f) => sum + f.additions, 0);
    const deletions = files.reduce((sum, f) => sum + f.deletions, 0);

    return {
      repository,
      prNumber,
      prTitle,
      prBody,
      author,
      branch,
      baseBranch,
      fileCount: files.length,
      additions,
      deletions,
      files: files.map(f => ({
        filename: f.filename,
        status: f.status,
        additions: f.additions,
        deletions: f.deletions,
        language: this.getLanguage(f.filename),
        patch: f.patch || '',
      })),
      customRules,
      customContext,
    };
  }

  /**
   * Get language from filename
   */
  private static getLanguage(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase();
    
    const languageMap: Record<string, string> = {
      'js': 'javascript',
      'jsx': 'javascript',
      'ts': 'typescript',
      'tsx': 'typescript',
      'py': 'python',
      'java': 'java',
      'go': 'go',
      'rb': 'ruby',
      'php': 'php',
      'cs': 'csharp',
      'cpp': 'cpp',
      'c': 'c',
      'rs': 'rust',
      'swift': 'swift',
      'kt': 'kotlin',
      'scala': 'scala',
      'sh': 'bash',
      'yaml': 'yaml',
      'yml': 'yaml',
      'json': 'json',
      'md': 'markdown',
      'html': 'html',
      'css': 'css',
      'scss': 'scss',
      'sql': 'sql',
    };

    return languageMap[ext || ''] || 'text';
  }

  /**
   * Validate context
   */
  static validateContext(context: PromptContext): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!context.repository) errors.push('Repository is required');
    if (!context.prNumber) errors.push('PR number is required');
    if (!context.prTitle) errors.push('PR title is required');
    if (!context.files || context.files.length === 0) errors.push('At least one file is required');

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Estimate prompt tokens
   */
  static estimateTokens(prompt: string): number {
    // Rough estimate: ~4 characters per token
    return Math.ceil(prompt.length / 4);
  }
}
