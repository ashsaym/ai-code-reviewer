/**
 * Diff Parser
 * 
 * Parses git diffs and calculates line positions for review comments
 */

import * as core from '@actions/core';

export interface DiffHunk {
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  lines: DiffLine[];
  header: string;
}

export interface DiffLine {
  type: 'add' | 'delete' | 'context' | 'header';
  content: string;
  oldLineNumber: number | null;
  newLineNumber: number | null;
  position: number;
}

export interface ParsedDiff {
  filename: string;
  oldFilename?: string;
  status: 'added' | 'deleted' | 'modified' | 'renamed';
  hunks: DiffHunk[];
  additions: number;
  deletions: number;
}

export class DiffParser {
  /**
   * Parse a git diff string
   */
  static parse(diff: string): ParsedDiff[] {
    const files: ParsedDiff[] = [];
    const fileDiffs = diff.split(/^diff --git /m).slice(1);

    for (const fileDiff of fileDiffs) {
      const parsed = this.parseFile(fileDiff);
      if (parsed) {
        files.push(parsed);
      }
    }

    core.debug(`Parsed ${files.length} file diffs`);
    return files;
  }

  /**
   * Parse a single file diff
   */
  private static parseFile(fileDiff: string): ParsedDiff | null {
    const lines = fileDiff.split('\n');
    
    // Parse header
    const headerMatch = lines[0].match(/^a\/(.*) b\/(.*)$/);
    if (!headerMatch) return null;

    const oldFilename = headerMatch[1];
    const newFilename = headerMatch[2];

    // Determine status
    let status: ParsedDiff['status'] = 'modified';
    if (lines.some(l => l.startsWith('new file mode'))) {
      status = 'added';
    } else if (lines.some(l => l.startsWith('deleted file mode'))) {
      status = 'deleted';
    } else if (oldFilename !== newFilename) {
      status = 'renamed';
    }

    // Parse hunks
    const hunks: DiffHunk[] = [];
    let currentHunk: DiffHunk | null = null;
    let position = 0;
    let oldLineNumber = 0;
    let newLineNumber = 0;
    let additions = 0;
    let deletions = 0;

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];

      // Hunk header: @@ -oldStart,oldLines +newStart,newLines @@
      if (line.startsWith('@@')) {
        if (currentHunk) {
          hunks.push(currentHunk);
        }

        const hunkMatch = line.match(/^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@(.*)$/);
        if (!hunkMatch) continue;

        oldLineNumber = parseInt(hunkMatch[1], 10);
        const oldLines = parseInt(hunkMatch[2] || '1', 10);
        newLineNumber = parseInt(hunkMatch[3], 10);
        const newLines = parseInt(hunkMatch[4] || '1', 10);

        currentHunk = {
          oldStart: oldLineNumber,
          oldLines,
          newStart: newLineNumber,
          newLines,
          lines: [],
          header: line,
        };

        position++;
        continue;
      }

      if (!currentHunk) continue;

      // Parse diff line
      const diffLine: DiffLine = {
        type: 'context',
        content: line,
        oldLineNumber: null,
        newLineNumber: null,
        position,
      };

      if (line.startsWith('+')) {
        diffLine.type = 'add';
        diffLine.newLineNumber = newLineNumber++;
        diffLine.content = line.substring(1);
        additions++;
      } else if (line.startsWith('-')) {
        diffLine.type = 'delete';
        diffLine.oldLineNumber = oldLineNumber++;
        diffLine.content = line.substring(1);
        deletions++;
      } else if (line.startsWith(' ')) {
        diffLine.type = 'context';
        diffLine.oldLineNumber = oldLineNumber++;
        diffLine.newLineNumber = newLineNumber++;
        diffLine.content = line.substring(1);
      } else if (line.startsWith('\\')) {
        // "\ No newline at end of file"
        continue;
      }

      currentHunk.lines.push(diffLine);
      position++;
    }

    if (currentHunk) {
      hunks.push(currentHunk);
    }

    return {
      filename: newFilename,
      oldFilename: oldFilename !== newFilename ? oldFilename : undefined,
      status,
      hunks,
      additions,
      deletions,
    };
  }

  /**
   * Parse file patch (from GitHub API)
   */
  static parsePatch(filename: string, patch: string): ParsedDiff {
    const lines = patch.split('\n');
    const hunks: DiffHunk[] = [];
    let currentHunk: DiffHunk | null = null;
    let position = 0;
    let oldLineNumber = 0;
    let newLineNumber = 0;
    let additions = 0;
    let deletions = 0;

    for (const line of lines) {
      // Hunk header
      if (line.startsWith('@@')) {
        if (currentHunk) {
          hunks.push(currentHunk);
        }

        const hunkMatch = line.match(/^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/);
        if (!hunkMatch) continue;

        oldLineNumber = parseInt(hunkMatch[1], 10);
        const oldLines = parseInt(hunkMatch[2] || '1', 10);
        newLineNumber = parseInt(hunkMatch[3], 10);
        const newLines = parseInt(hunkMatch[4] || '1', 10);

        currentHunk = {
          oldStart: oldLineNumber,
          oldLines,
          newStart: newLineNumber,
          newLines,
          lines: [],
          header: line,
        };

        position++;
        continue;
      }

      if (!currentHunk) continue;

      const diffLine: DiffLine = {
        type: 'context',
        content: line,
        oldLineNumber: null,
        newLineNumber: null,
        position,
      };

      if (line.startsWith('+')) {
        diffLine.type = 'add';
        diffLine.newLineNumber = newLineNumber++;
        diffLine.content = line.substring(1);
        additions++;
      } else if (line.startsWith('-')) {
        diffLine.type = 'delete';
        diffLine.oldLineNumber = oldLineNumber++;
        diffLine.content = line.substring(1);
        deletions++;
      } else if (line.startsWith(' ')) {
        diffLine.type = 'context';
        diffLine.oldLineNumber = oldLineNumber++;
        diffLine.newLineNumber = newLineNumber++;
        diffLine.content = line.substring(1);
      } else if (line.startsWith('\\')) {
        continue;
      }

      currentHunk.lines.push(diffLine);
      position++;
    }

    if (currentHunk) {
      hunks.push(currentHunk);
    }

    return {
      filename,
      status: 'modified',
      hunks,
      additions,
      deletions,
    };
  }

  /**
   * Get position for a line number
   * GitHub uses diff position (0-indexed from start of diff) for review comments
   */
  static getPositionForLine(parsedDiff: ParsedDiff, lineNumber: number): number | null {
    for (const hunk of parsedDiff.hunks) {
      for (const line of hunk.lines) {
        if (line.newLineNumber === lineNumber && line.type === 'add') {
          return line.position;
        }
        if (line.newLineNumber === lineNumber && line.type === 'context') {
          return line.position;
        }
      }
    }

    return null;
  }

  /**
   * Get line number for a position
   */
  static getLineForPosition(parsedDiff: ParsedDiff, position: number): number | null {
    for (const hunk of parsedDiff.hunks) {
      for (const line of hunk.lines) {
        if (line.position === position) {
          return line.newLineNumber;
        }
      }
    }

    return null;
  }

  /**
   * Get all added lines
   */
  static getAddedLines(parsedDiff: ParsedDiff): Array<{ line: number; content: string; position: number }> {
    const added: Array<{ line: number; content: string; position: number }> = [];

    for (const hunk of parsedDiff.hunks) {
      for (const line of hunk.lines) {
        if (line.type === 'add' && line.newLineNumber !== null) {
          added.push({
            line: line.newLineNumber,
            content: line.content,
            position: line.position,
          });
        }
      }
    }

    return added;
  }

  /**
   * Get all modified lines (added or context in changed hunks)
   */
  static getModifiedLines(parsedDiff: ParsedDiff): Array<{ line: number; content: string; position: number }> {
    const modified: Array<{ line: number; content: string; position: number }> = [];

    for (const hunk of parsedDiff.hunks) {
      for (const line of hunk.lines) {
        if ((line.type === 'add' || line.type === 'context') && line.newLineNumber !== null) {
          modified.push({
            line: line.newLineNumber,
            content: line.content,
            position: line.position,
          });
        }
      }
    }

    return modified;
  }

  /**
   * Get context around a line
   */
  static getContext(parsedDiff: ParsedDiff, lineNumber: number, contextLines: number = 3): string[] {
    const context: string[] = [];
    
    for (const hunk of parsedDiff.hunks) {
      const lineIndex = hunk.lines.findIndex(l => l.newLineNumber === lineNumber);
      
      if (lineIndex >= 0) {
        const start = Math.max(0, lineIndex - contextLines);
        const end = Math.min(hunk.lines.length, lineIndex + contextLines + 1);
        
        for (let i = start; i < end; i++) {
          context.push(hunk.lines[i].content);
        }
        
        break;
      }
    }

    return context;
  }

  /**
   * Calculate diff statistics
   */
  static getStats(parsedDiff: ParsedDiff): {
    additions: number;
    deletions: number;
    changes: number;
    hunks: number;
  } {
    return {
      additions: parsedDiff.additions,
      deletions: parsedDiff.deletions,
      changes: parsedDiff.additions + parsedDiff.deletions,
      hunks: parsedDiff.hunks.length,
    };
  }

  /**
   * Check if line is in a changed hunk
   */
  static isLineChanged(parsedDiff: ParsedDiff, lineNumber: number): boolean {
    for (const hunk of parsedDiff.hunks) {
      const line = hunk.lines.find(l => l.newLineNumber === lineNumber);
      if (line && line.type === 'add') {
        return true;
      }
    }
    return false;
  }

  /**
   * Get changed line numbers
   */
  static getChangedLineNumbers(parsedDiff: ParsedDiff): number[] {
    const lineNumbers: number[] = [];

    for (const hunk of parsedDiff.hunks) {
      for (const line of hunk.lines) {
        if (line.type === 'add' && line.newLineNumber !== null) {
          lineNumbers.push(line.newLineNumber);
        }
      }
    }

    return lineNumbers.sort((a, b) => a - b);
  }
}
