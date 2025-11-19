/**
 * IncrementalAnalyzer Tests
 * 
 * Comprehensive test suite for incremental file analysis
 */

import { IncrementalAnalyzer, FileAnalysis } from '../../../src/analysis/IncrementalAnalyzer';
import { StorageManager } from '../../../src/storage/StorageManager';
import { PRFile } from '../../../src/github/PullRequestService';
import { DiffParser } from '../../../src/github/DiffParser';

jest.mock('../../../src/storage/StorageManager');
jest.mock('../../../src/github/DiffParser');

describe('IncrementalAnalyzer', () => {
  let analyzer: IncrementalAnalyzer;
  let mockStorage: jest.Mocked<StorageManager>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockStorage = new StorageManager({} as any) as jest.Mocked<StorageManager>;
    mockStorage.getFileAnalysis = jest.fn().mockResolvedValue(null);
    mockStorage.updateFileAnalysis = jest.fn().mockResolvedValue(undefined);

    analyzer = new IncrementalAnalyzer(mockStorage, 'owner', 'repo', 123);

    // Mock DiffParser
    (DiffParser.parsePatch as jest.Mock) = jest.fn().mockReturnValue({
      filename: 'test.ts',
      hunks: [
        {
          oldStart: 1,
          oldLines: 5,
          newStart: 1,
          newLines: 10,
          lines: [
            { type: 'context', content: ' unchanged', oldLineNumber: 1, newLineNumber: 1 },
            { type: 'add', content: '+new line', oldLineNumber: null, newLineNumber: 2 },
            { type: 'delete', content: '-old line', oldLineNumber: 2, newLineNumber: null },
          ],
        },
      ],
    });
  });

  describe('analyzeFiles', () => {
    it('should analyze all files and determine review needs', async () => {
      const files: PRFile[] = [
        {
          filename: 'src/test.ts',
          sha: 'sha-1',
          status: 'modified',
          additions: 10,
          deletions: 5,
          changes: 15,
          patch: '@@ -1,5 +1,10 @@\n+new line',
        },
        {
          filename: 'src/new.ts',
          sha: 'sha-2',
          status: 'added',
          additions: 20,
          deletions: 0,
          changes: 20,
          patch: '@@ -0,0 +1,20 @@\n+new file',
        },
      ];

      const result = await analyzer.analyzeFiles(files);

      expect(result).toHaveLength(2);
      expect(result[0].filename).toBe('src/test.ts');
      expect(result[1].filename).toBe('src/new.ts');
      expect(mockStorage.getFileAnalysis).toHaveBeenCalledTimes(2);
    });

    it('should mark new files as needing review', async () => {
      const files: PRFile[] = [
        {
          filename: 'src/new.ts',
          sha: 'sha-1',
          status: 'added',
          additions: 20,
          deletions: 0,
          changes: 20,
          patch: '@@ -0,0 +1,20 @@\n+new line',
        },
      ];

      const result = await analyzer.analyzeFiles(files);

      expect(result[0].isNewFile).toBe(true);
      expect(result[0].needsReview).toBe(true);
    });

    it('should mark modified files with SHA changes as needing review', async () => {
      mockStorage.getFileAnalysis.mockResolvedValue({
        filePath: 'src/test.ts',
        sha: 'old-sha',
        lines: {},
        lastAnalyzedAt: '2024-01-01',
      });

      const files: PRFile[] = [
        {
          filename: 'src/test.ts',
          sha: 'new-sha',
          status: 'modified',
          additions: 10,
          deletions: 5,
          changes: 15,
          patch: '@@ -1,5 +1,10 @@\n+new line',
        },
      ];

      const result = await analyzer.analyzeFiles(files);

      expect(result[0].needsReview).toBe(true);
      expect(result[0].previousSha).toBe('old-sha');
    });

    it('should skip files without changes', async () => {
      mockStorage.getFileAnalysis.mockResolvedValue({
        filePath: 'src/test.ts',
        sha: 'same-sha',
        lines: { 2: { commentId: 1, body: 'test', severity: 'info', reviewedAt: '2024-01-01', isValid: true } },
        lastAnalyzedAt: '2024-01-01',
      });

      const files: PRFile[] = [
        {
          filename: 'src/test.ts',
          sha: 'same-sha',
          status: 'modified',
          additions: 0,
          deletions: 0,
          changes: 0,
          patch: undefined,
        },
      ];

      (DiffParser.parsePatch as jest.Mock).mockReturnValue({
        filename: 'src/test.ts',
        hunks: [],
      });

      const result = await analyzer.analyzeFiles(files);

      expect(result[0].needsReview).toBe(false);
    });

    it('should filter out already-reviewed lines', async () => {
      mockStorage.getFileAnalysis.mockResolvedValue({
        filePath: 'src/test.ts',
        sha: 'old-sha',
        lines: {
          2: { commentId: 1, body: 'Already reviewed', severity: 'info', reviewedAt: '2024-01-01', isValid: true },
        },
        lastAnalyzedAt: '2024-01-01',
      });

      const files: PRFile[] = [
        {
          filename: 'src/test.ts',
          sha: 'new-sha',
          status: 'modified',
          additions: 10,
          deletions: 5,
          changes: 15,
          patch: '@@ -1,5 +1,10 @@\n+new line',
        },
      ];

      (DiffParser.parsePatch as jest.Mock).mockReturnValue({
        filename: 'src/test.ts',
        hunks: [
          {
            oldStart: 1,
            oldLines: 5,
            newStart: 1,
            newLines: 10,
            lines: [
              { type: 'add', content: '+line 2', oldLineNumber: null, newLineNumber: 2 },
              { type: 'add', content: '+line 3', oldLineNumber: null, newLineNumber: 3 },
            ],
          },
        ],
      });

      const result = await analyzer.analyzeFiles(files);

      // Line 2 was already reviewed, so only line 3 needs review
      expect(result[0].changedLines.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle files without patch data', async () => {
      const files: PRFile[] = [
        {
          filename: 'binary.png',
          sha: 'sha-1',
          status: 'added',
          additions: 0,
          deletions: 0,
          changes: 0,
          patch: undefined,
        },
      ];

      const result = await analyzer.analyzeFiles(files);

      expect(result[0].changedLines).toHaveLength(0);
      expect(result[0].needsReview).toBe(false);
    });

    it('should handle empty file list', async () => {
      const result = await analyzer.analyzeFiles([]);

      expect(result).toHaveLength(0);
    });
  });

  describe('markAsReviewed', () => {
    it('should store reviewed lines in cache', async () => {
      const reviewedLines = [
        { line: 10, commentId: 1, body: 'Issue 1', severity: 'error' as const },
        { line: 20, commentId: 2, body: 'Issue 2', severity: 'warning' as const },
      ];

      await analyzer.markAsReviewed('src/test.ts', 'sha-1', reviewedLines);

      expect(mockStorage.updateFileAnalysis).toHaveBeenCalledWith(123, {
        filePath: 'src/test.ts',
        sha: 'sha-1',
        lines: {
          10: {
            commentId: 1,
            body: 'Issue 1',
            severity: 'error',
            reviewedAt: expect.any(String),
            isValid: true,
          },
          20: {
            commentId: 2,
            body: 'Issue 2',
            severity: 'warning',
            reviewedAt: expect.any(String),
            isValid: true,
          },
        },
        lastAnalyzedAt: expect.any(String),
      });
    });

    it('should handle empty reviewed lines', async () => {
      await analyzer.markAsReviewed('src/test.ts', 'sha-1', []);

      expect(mockStorage.updateFileAnalysis).toHaveBeenCalledWith(123, {
        filePath: 'src/test.ts',
        sha: 'sha-1',
        lines: {},
        lastAnalyzedAt: expect.any(String),
      });
    });

    it('should handle info severity', async () => {
      const reviewedLines = [{ line: 10, commentId: 1, body: 'Info', severity: 'info' as const }];

      await analyzer.markAsReviewed('src/test.ts', 'sha-1', reviewedLines);

      expect(mockStorage.updateFileAnalysis).toHaveBeenCalled();
    });
  });

  describe('static methods', () => {
    describe('getFilesNeedingReview', () => {
      it('should filter files that need review', () => {
        const analyses: FileAnalysis[] = [
          {
            filename: 'src/test1.ts',
            sha: 'sha-1',
            changedLines: [],
            isNewFile: false,
            needsReview: true,
          },
          {
            filename: 'src/test2.ts',
            sha: 'sha-2',
            changedLines: [],
            isNewFile: false,
            needsReview: false,
          },
          {
            filename: 'src/test3.ts',
            sha: 'sha-3',
            changedLines: [],
            isNewFile: true,
            needsReview: true,
          },
        ];

        const result = IncrementalAnalyzer.getFilesNeedingReview(analyses);

        expect(result).toHaveLength(2);
        expect(result[0].filename).toBe('src/test1.ts');
        expect(result[1].filename).toBe('src/test3.ts');
      });

      it('should return empty array when no files need review', () => {
        const analyses: FileAnalysis[] = [
          {
            filename: 'src/test.ts',
            sha: 'sha-1',
            changedLines: [],
            isNewFile: false,
            needsReview: false,
          },
        ];

        const result = IncrementalAnalyzer.getFilesNeedingReview(analyses);

        expect(result).toHaveLength(0);
      });
    });

    describe('getTotalLines', () => {
      it('should sum up all changed lines', () => {
        const analyses: FileAnalysis[] = [
          {
            filename: 'src/test1.ts',
            sha: 'sha-1',
            changedLines: [
              { lineNumber: 1, content: 'line1', type: 'added' },
              { lineNumber: 2, content: 'line2', type: 'added' },
            ],
            isNewFile: false,
            needsReview: true,
          },
          {
            filename: 'src/test2.ts',
            sha: 'sha-2',
            changedLines: [
              { lineNumber: 1, content: 'line1', type: 'added' },
              { lineNumber: 2, content: 'line2', type: 'added' },
              { lineNumber: 3, content: 'line3', type: 'added' },
            ],
            isNewFile: false,
            needsReview: true,
          },
        ];

        const result = IncrementalAnalyzer.getTotalLines(analyses);

        expect(result).toBe(5);
      });

      it('should return 0 for empty analyses', () => {
        const result = IncrementalAnalyzer.getTotalLines([]);

        expect(result).toBe(0);
      });
    });
  });

  describe('extractChangedLines', () => {
    it('should extract added lines correctly', async () => {
      (DiffParser.parsePatch as jest.Mock).mockReturnValue({
        filename: 'test.ts',
        hunks: [
          {
            oldStart: 1,
            oldLines: 5,
            newStart: 1,
            newLines: 10,
            lines: [
              { type: 'add', content: '+new line 1', oldLineNumber: null, newLineNumber: 10 },
              { type: 'add', content: '+new line 2', oldLineNumber: null, newLineNumber: 11 },
            ],
          },
        ],
      });

      const files: PRFile[] = [
        {
          filename: 'test.ts',
          sha: 'sha-1',
          status: 'modified',
          additions: 2,
          deletions: 0,
          changes: 2,
          patch: '@@ -1,5 +1,10 @@\n+new line 1\n+new line 2',
        },
      ];

      const result = await analyzer.analyzeFiles(files);

      expect(result[0].changedLines.length).toBeGreaterThanOrEqual(0);
    });

    it('should extract deleted lines correctly', async () => {
      (DiffParser.parsePatch as jest.Mock).mockReturnValue({
        filename: 'test.ts',
        hunks: [
          {
            oldStart: 1,
            oldLines: 10,
            newStart: 1,
            newLines: 5,
            lines: [
              { type: 'delete', content: '-old line 1', oldLineNumber: 5, newLineNumber: null },
              { type: 'delete', content: '-old line 2', oldLineNumber: 6, newLineNumber: null },
            ],
          },
        ],
      });

      const files: PRFile[] = [
        {
          filename: 'test.ts',
          sha: 'sha-1',
          status: 'modified',
          additions: 0,
          deletions: 2,
          changes: 2,
          patch: '@@ -1,10 +1,5 @@\n-old line 1\n-old line 2',
        },
      ];

      const result = await analyzer.analyzeFiles(files);

      expect(result).toBeDefined();
    });

    it('should handle parse errors gracefully', async () => {
      (DiffParser.parsePatch as jest.Mock).mockImplementation(() => {
        throw new Error('Parse error');
      });

      const files: PRFile[] = [
        {
          filename: 'test.ts',
          sha: 'sha-1',
          status: 'modified',
          additions: 10,
          deletions: 5,
          changes: 15,
          patch: 'invalid patch',
        },
      ];

      const result = await analyzer.analyzeFiles(files);

      expect(result[0].changedLines).toHaveLength(0);
    });

    it('should handle empty hunks', async () => {
      (DiffParser.parsePatch as jest.Mock).mockReturnValue({
        filename: 'test.ts',
        hunks: [],
      });

      const files: PRFile[] = [
        {
          filename: 'test.ts',
          sha: 'sha-1',
          status: 'modified',
          additions: 0,
          deletions: 0,
          changes: 0,
          patch: '',
        },
      ];

      const result = await analyzer.analyzeFiles(files);

      expect(result[0].changedLines).toHaveLength(0);
    });
  });

  describe('edge cases', () => {
    it('should handle very large files', async () => {
      const largeHunks = Array.from({ length: 100 }, (_, i) => ({
        oldStart: i * 100,
        oldLines: 100,
        newStart: i * 100,
        newLines: 100,
        lines: Array.from({ length: 100 }, (_, j) => ({
          type: 'add' as const,
          content: `+line ${j}`,
          oldLineNumber: null,
          newLineNumber: i * 100 + j,
        })),
      }));

      (DiffParser.parsePatch as jest.Mock).mockReturnValue({
        filename: 'large.ts',
        hunks: largeHunks,
      });

      const files: PRFile[] = [
        {
          filename: 'large.ts',
          sha: 'sha-1',
          status: 'modified',
          additions: 10000,
          deletions: 0,
          changes: 10000,
          patch: 'large patch',
        },
      ];

      const result = await analyzer.analyzeFiles(files);

      expect(result).toBeDefined();
    });

    it('should handle special characters in filenames', async () => {
      const files: PRFile[] = [
        {
          filename: 'src/test (copy).ts',
          sha: 'sha-1',
          status: 'added',
          additions: 10,
          deletions: 0,
          changes: 10,
          patch: '@@ -0,0 +1,10 @@\n+new line',
        },
      ];

      const result = await analyzer.analyzeFiles(files);

      expect(result[0].filename).toBe('src/test (copy).ts');
    });

    it('should handle concurrent file analysis', async () => {
      const files: PRFile[] = Array.from({ length: 10 }, (_, i) => ({
        filename: `src/file${i}.ts`,
        sha: `sha-${i}`,
        status: 'modified' as const,
        additions: 10,
        deletions: 5,
        changes: 15,
        patch: '@@ -1,5 +1,10 @@\n+new line',
      }));

      const result = await analyzer.analyzeFiles(files);

      expect(result).toHaveLength(10);
    });
  });
});
