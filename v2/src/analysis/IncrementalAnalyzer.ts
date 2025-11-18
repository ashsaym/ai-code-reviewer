/**
 * Incremental Analyzer
 * 
 * Tracks what has been reviewed and only analyzes changed lines
 */

import * as core from '@actions/core';
import { DiffParser } from '../github/DiffParser';
import { PRFile } from '../github/PullRequestService';
import { StorageManager } from '../storage/StorageManager';
import { FileAnalysisCache } from '../storage/models/CacheEntry';

export interface ChangedLine {
  lineNumber: number;
  content: string;
  type: 'added' | 'modified' | 'deleted';
}

export interface FileAnalysis {
  filename: string;
  sha: string;
  changedLines: ChangedLine[];
  isNewFile: boolean;
  needsReview: boolean;
  previousSha?: string;
}

export class IncrementalAnalyzer {
  constructor(
    private storage: StorageManager,
    private _owner: string,
    private _repo: string,
    private prNumber: number
  ) {}

  /**
   * Analyze files and determine what needs review
   */
  async analyzeFiles(files: PRFile[]): Promise<FileAnalysis[]> {
    core.info(`📊 Analyzing ${files.length} files for changes...`);

    const analyses: FileAnalysis[] = [];

    for (const file of files) {
      const analysis = await this.analyzeFile(file);
      analyses.push(analysis);
    }

    const needsReview = analyses.filter(a => a.needsReview).length;
    core.info(`✅ Analysis complete: ${needsReview}/${files.length} files need review`);

    return analyses;
  }

  /**
   * Analyze a single file
   */
  private async analyzeFile(file: PRFile): Promise<FileAnalysis> {
    const filename = file.filename;
    const currentSha = file.sha;

    // Get previous analysis from cache
    const cached = await this.storage.getFileAnalysis(
      this.prNumber,
      filename,
      currentSha
    );

    // Determine if file needs review
    const isNewFile = file.status === 'added';
    const shaChanged = !cached || cached.sha !== currentSha;
    const needsReview = isNewFile || shaChanged;

    // Parse diff to get changed lines
    const changedLines = this.extractChangedLines(file);

    // Filter out already-reviewed lines if we have cache
    let linesToReview = changedLines;
    if (cached && cached.lines && !isNewFile) {
      const reviewedLineNumbers = Object.keys(cached.lines).map(Number);
      linesToReview = changedLines.filter(line => {
        // Only review lines that weren't in the previous review
        return !reviewedLineNumbers.includes(line.lineNumber);
      });
    }

    core.debug(
      `📄 ${filename}: ${changedLines.length} changed lines, ` +
      `${linesToReview.length} need review (SHA: ${currentSha.substring(0, 7)})`
    );

    return {
      filename,
      sha: currentSha,
      changedLines: linesToReview,
      isNewFile,
      needsReview: needsReview && linesToReview.length > 0,
      previousSha: cached?.sha,
    };
  }

  /**
   * Extract changed lines from file patch
   */
  private extractChangedLines(file: PRFile): ChangedLine[] {
    if (!file.patch) {
      return [];
    }

    try {
      const parsed = DiffParser.parse(file.patch);
      
      if (parsed.length === 0) {
        return [];
      }

      const diff = parsed[0]; // Single file diff
      const lines: ChangedLine[] = [];

      for (const hunk of diff.hunks) {
        let newLine = hunk.newStart;

        for (const line of hunk.lines) {
          if (line.type === 'add') {
            lines.push({
              lineNumber: newLine,
              content: line.content,
              type: 'added',
            });
            newLine++;
          } else if (line.type === 'delete') {
            lines.push({
              lineNumber: newLine,
              content: line.content,
              type: 'deleted',
            });
            // Don't increment line number for deletions
          } else {
            // Context line
            newLine++;
          }
        }
      }

      return lines;
    } catch (error) {
      core.warning(`Failed to parse diff for ${file.filename}: ${error}`);
      return [];
    }
  }

  /**
   * Mark file as reviewed
   */
  async markAsReviewed(
    filename: string,
    sha: string,
    reviewedLines: Array<{ line: number; commentId: number; body: string; severity: 'info' | 'warning' | 'error' }>
  ): Promise<void> {
    const lines: FileAnalysisCache['lines'] = {};
    
    // Convert to cache format
    for (const review of reviewedLines) {
      lines[review.line] = {
        commentId: review.commentId,
        body: review.body,
        severity: review.severity,
        reviewedAt: new Date().toISOString(),
        isValid: true,
      };
    }

    const cache: FileAnalysisCache = {
      filePath: filename,
      sha,
      lines,
      lastAnalyzedAt: new Date().toISOString(),
    };

    await this.storage.updateFileAnalysis(
      this.prNumber,
      cache
    );

    core.debug(`✓ Marked ${filename} as reviewed (${reviewedLines.length} lines)`);
  }

  /**
   * Get files that need review
   */
  static getFilesNeedingReview(analyses: FileAnalysis[]): FileAnalysis[] {
    return analyses.filter(a => a.needsReview);
  }

  /**
   * Get total lines needing review
   */
  static getTotalLines(analyses: FileAnalysis[]): number {
    return analyses.reduce((sum, a) => sum + a.changedLines.length, 0);
  }

  /**
   * Filter analyses by file patterns
   */
  static filterByPatterns(
    analyses: FileAnalysis[],
    includePatterns: RegExp[] = [],
    excludePatterns: RegExp[] = []
  ): FileAnalysis[] {
    return analyses.filter(analysis => {
      const filename = analysis.filename;

      // Check exclude patterns first
      if (excludePatterns.length > 0) {
        if (excludePatterns.some(pattern => pattern.test(filename))) {
          return false;
        }
      }

      // Check include patterns
      if (includePatterns.length > 0) {
        return includePatterns.some(pattern => pattern.test(filename));
      }

      return true;
    });
  }

  /**
   * Split large files into chunks for review
   */
  static chunkAnalysis(analysis: FileAnalysis, maxLinesPerChunk: number): FileAnalysis[] {
    if (analysis.changedLines.length <= maxLinesPerChunk) {
      return [analysis];
    }

    const chunks: FileAnalysis[] = [];
    const lines = analysis.changedLines;

    for (let i = 0; i < lines.length; i += maxLinesPerChunk) {
      const chunk = lines.slice(i, i + maxLinesPerChunk);
      chunks.push({
        ...analysis,
        changedLines: chunk,
      });
    }

    core.info(`📦 Split ${analysis.filename} into ${chunks.length} chunks`);
    return chunks;
  }
}
