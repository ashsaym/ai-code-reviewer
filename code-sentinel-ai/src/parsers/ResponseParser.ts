/**
 * Response Parser
 * 
 * Parses AI responses and validates against schema
 */

import * as core from '@actions/core';
import { z } from 'zod';
import { VERSION } from '../version';

// Define Zod schemas
export const ReviewCommentSchema = z.object({
  path: z.string(),
  line: z.number().positive(),
  severity: z.enum(['error', 'warning', 'info']),
  message: z.string().min(1),
  suggestion: z.string().optional(),
});

export const ReviewResponseSchema = z.object({
  comments: z.array(ReviewCommentSchema),
  summary: z.string().optional(),
});

export type ReviewComment = z.infer<typeof ReviewCommentSchema>;
export type ReviewResponse = z.infer<typeof ReviewResponseSchema>;

export interface ParseResult {
  success: boolean;
  data?: ReviewResponse;
  errors?: string[];
}

export class ResponseParser {
  /**
   * Parse AI response
   */
  static parse(response: string): ParseResult {
    try {
      // Extract JSON from response
      const json = this.extractJSON(response);
      
      if (!json) {
        return {
          success: false,
          errors: ['No valid JSON found in response'],
        };
      }

      // Validate against schema
      const result = ReviewResponseSchema.safeParse(json);

      if (!result.success) {
        const errors = result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`);
        return {
          success: false,
          errors,
        };
      }

      return {
        success: true,
        data: result.data,
      };
    } catch (error) {
      return {
        success: false,
        errors: [`Parse error: ${error}`],
      };
    }
  }

  /**
   * Extract JSON from response text
   */
  private static extractJSON(text: string): any {
    try {
      // Try direct parse first
      return JSON.parse(text);
    } catch {
      // Look for JSON in code blocks
      const codeBlockMatch = text.match(/```(?:json)?\s*\n([\s\S]*?)\n```/);
      if (codeBlockMatch) {
        try {
          return JSON.parse(codeBlockMatch[1]);
        } catch {
          // Continue to next attempt
        }
      }

      // Look for JSON object in text
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          return JSON.parse(jsonMatch[0]);
        } catch {
          // Continue to next attempt
        }
      }

      return null;
    }
  }

  /**
   * Validate single comment
   */
  static validateComment(comment: unknown): { valid: boolean; errors?: string[] } {
    const result = ReviewCommentSchema.safeParse(comment);
    
    if (!result.success) {
      return {
        valid: false,
        errors: result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`),
      };
    }

    return { valid: true };
  }

  /**
   * Filter comments by severity
   */
  static filterBySeverity(
    comments: ReviewComment[],
    severities: Array<'error' | 'warning' | 'info'>
  ): ReviewComment[] {
    return comments.filter(c => severities.includes(c.severity));
  }

  /**
   * Group comments by file
   */
  static groupByFile(comments: ReviewComment[]): Map<string, ReviewComment[]> {
    const grouped = new Map<string, ReviewComment[]>();

    for (const comment of comments) {
      const existing = grouped.get(comment.path) || [];
      existing.push(comment);
      grouped.set(comment.path, existing);
    }

    return grouped;
  }

  /**
   * Sort comments by line number
   */
  static sortByLine(comments: ReviewComment[]): ReviewComment[] {
    return [...comments].sort((a, b) => a.line - b.line);
  }

  /**
   * Format comment for GitHub with inline diff suggestions
   */
  static formatForGitHub(comment: ReviewComment): string {
    const icon = this.getSeverityIcon(comment.severity);
    let message = `${icon} **${comment.severity.toUpperCase()}**\n\n${comment.message}`;

    if (comment.suggestion) {
      message += `\n\n**Suggested change:**\n\`\`\`suggestion\n${comment.suggestion.trim()}\n\`\`\``;
    }

    return message;
  }

  /**
   * Get severity icon
   */
  private static getSeverityIcon(severity: string): string {
    const icons: Record<string, string> = {
      error: '🚨',
      warning: '⚠️',
      info: 'ℹ️',
    };
    return icons[severity] || 'ℹ️';
  }

  /**
   * Create summary message
   */
  static createSummary(comments: ReviewComment[], customSummary?: string): string {
    const errorCount = comments.filter(c => c.severity === 'error').length;
    const warningCount = comments.filter(c => c.severity === 'warning').length;
    const infoCount = comments.filter(c => c.severity === 'info').length;

    let summary = `## 🤖 AI Code Review Summary\n\n`;
    summary += `**Total Issues:** ${comments.length}\n`;
    summary += `- 🚨 Errors: ${errorCount}\n`;
    summary += `- ⚠️ Warnings: ${warningCount}\n`;
    summary += `- ℹ️ Info: ${infoCount}\n`;

    if (customSummary) {
      summary += `\n${customSummary}`;
    }

    return summary;
  }

  /**
   * Create review summary (v1-style format for GitHub reviews)
   */
  static createReviewSummary(comments: ReviewComment[], aiSummary?: string, modelName?: string): string {
    // Count by severity labels (matching v1)
    const highCount = comments.filter(c => c.severity === 'error').length;
    const mediumCount = comments.filter(c => c.severity === 'warning').length;
    const lowCount = comments.filter(c => c.severity === 'info').length;

    let summary = `## 🤖 AI Code Review\n\n`;
    
    // Build issue summary
    const parts = [];
    if (highCount > 0) parts.push(`${highCount} high-severity issue${highCount !== 1 ? 's' : ''}`);
    if (mediumCount > 0) parts.push(`${mediumCount} medium-severity issue${mediumCount !== 1 ? 's' : ''}`);
    if (lowCount > 0) parts.push(`${lowCount} low-severity issue${lowCount !== 1 ? 's' : ''}`);
    
    summary += `Found ${comments.length} issue${comments.length !== 1 ? 's' : ''}: ${parts.join(', ')}. `;
    
    if (aiSummary) {
      summary += aiSummary;
    }

    // Add generated by footer with version and model
    const model = modelName || 'gpt-5-mini';
    summary += `\n\n_Generated by Code Sentinel AI v${VERSION} (${model})_`;

    return summary;
  }

  /**
   * Create detailed summary with all findings
   */
  static createDetailedSummary(
    comments: ReviewComment[],
    aiSummary?: string
  ): string {
    const errorCount = comments.filter(c => c.severity === 'error').length;
    const warningCount = comments.filter(c => c.severity === 'warning').length;
    const infoCount = comments.filter(c => c.severity === 'info').length;

    let summary = `## 🤖 AI Code Review\n\n`;
    summary += `**Total Issues Found:** ${comments.length}\n`;
    summary += `- 🚨 Errors: ${errorCount}\n`;
    summary += `- ⚠️ Warnings: ${warningCount}\n`;
    summary += `- ℹ️ Info: ${infoCount}\n\n`;

    if (aiSummary) {
      summary += `### Overall Assessment\n${aiSummary}\n\n`;
    }

    // Group comments by file
    const grouped = this.groupByFile(comments);

    summary += `---\n\n`;

    // Add detailed findings per file
    for (const [filePath, fileComments] of grouped) {
      summary += `### 📄 \`${filePath}\`\n\n`;
      
      const sorted = this.sortByLine(fileComments);
      for (const comment of sorted) {
        const icon = this.getSeverityIcon(comment.severity);
        summary += `${icon} **Line ${comment.line}** (${comment.severity})\n`;
        summary += `${comment.message}\n`;
        
        if (comment.suggestion) {
          summary += `\n💡 **Suggestion:** ${comment.suggestion}\n`;
        }
        summary += `\n`;
      }
      summary += `\n`;
    }

    return summary;
  }

  /**
   * Deduplicate comments
   */
  static deduplicateComments(comments: ReviewComment[]): ReviewComment[] {
    const seen = new Set<string>();
    const unique: ReviewComment[] = [];

    for (const comment of comments) {
      const key = `${comment.path}:${comment.line}:${comment.message}`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(comment);
      }
    }

    if (unique.length < comments.length) {
      core.info(`🔄 Removed ${comments.length - unique.length} duplicate comments`);
    }

    return unique;
  }

  /**
   * Validate line numbers against file
   */
  static validateLineNumbers(
    comments: ReviewComment[],
    fileLineCount: Map<string, number>
  ): ReviewComment[] {
    return comments.filter(comment => {
      const maxLine = fileLineCount.get(comment.path);
      if (!maxLine) {
        core.warning(`⚠️ Unknown file: ${comment.path}`);
        return false;
      }

      if (comment.line > maxLine) {
        core.warning(`⚠️ Line ${comment.line} out of range for ${comment.path} (max: ${maxLine})`);
        return false;
      }

      return true;
    });
  }
}
