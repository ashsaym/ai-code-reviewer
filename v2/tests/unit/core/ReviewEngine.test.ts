/**
 * ReviewEngine Tests
 * 
 * Comprehensive test suite for the review engine
 */

import { ReviewEngine } from '../../../src/core/ReviewEngine';
import { StorageManager } from '../../../src/storage/StorageManager';
import { PullRequestService } from '../../../src/github/PullRequestService';
import { CommentService } from '../../../src/github/CommentService';
import { BaseProvider } from '../../../src/providers/BaseProvider';
import { IncrementalAnalyzer } from '../../../src/analysis/IncrementalAnalyzer';
import { OutdatedCommentCleaner } from '../../../src/analysis/OutdatedCommentCleaner';
import { IncrementalReviewStrategy } from '../../../src/core/IncrementalReviewStrategy';
import { PromptBuilder } from '../../../src/prompts/PromptBuilder';
import { ResponseParser } from '../../../src/parsers/ResponseParser';
import { DiffParser } from '../../../src/github/DiffParser';

jest.mock('../../../src/storage/StorageManager');
jest.mock('../../../src/github/PullRequestService');
jest.mock('../../../src/github/CommentService');
jest.mock('../../../src/github/DiffParser');
jest.mock('../../../src/analysis/IncrementalAnalyzer');
jest.mock('../../../src/analysis/OutdatedCommentCleaner');
jest.mock('../../../src/core/IncrementalReviewStrategy');
jest.mock('../../../src/prompts/PromptBuilder');
jest.mock('../../../src/parsers/ResponseParser');

describe('ReviewEngine', () => {
  let reviewEngine: ReviewEngine;
  let mockStorage: jest.Mocked<StorageManager>;
  let mockPrService: jest.Mocked<PullRequestService>;
  let mockCommentService: jest.Mocked<CommentService>;
  let mockAiProvider: jest.Mocked<BaseProvider>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockStorage = new StorageManager({} as any) as jest.Mocked<StorageManager>;
    mockPrService = new PullRequestService({} as any) as jest.Mocked<PullRequestService>;
    mockCommentService = new CommentService({} as any) as jest.Mocked<CommentService>;
    
    mockAiProvider = {
      sendMessage: jest.fn(),
      getModel: jest.fn().mockReturnValue('gpt-5-mini'),
      getProviderName: jest.fn().mockReturnValue('OpenAI'),
    } as any;

    reviewEngine = new ReviewEngine({
      storage: mockStorage,
      prService: mockPrService,
      commentService: mockCommentService,
      aiProvider: mockAiProvider,
      maxFilesPerBatch: 10,
      maxLinesPerFile: 500,
      autoCleanOutdated: true,
      incrementalMode: true,
    });
  });

  describe('constructor', () => {
    it('should initialize with default values', () => {
      const engine = new ReviewEngine({
        storage: mockStorage,
        prService: mockPrService,
        commentService: mockCommentService,
        aiProvider: mockAiProvider,
      });

      expect(engine).toBeDefined();
    });

    it('should accept custom configuration', () => {
      const engine = new ReviewEngine({
        storage: mockStorage,
        prService: mockPrService,
        commentService: mockCommentService,
        aiProvider: mockAiProvider,
        maxFilesPerBatch: 5,
        maxLinesPerFile: 1000,
        autoCleanOutdated: false,
        incrementalMode: false,
      });

      expect(engine).toBeDefined();
    });
  });

  describe('executeReview', () => {
    const mockPR = {
      number: 123,
      title: 'Test PR',
      body: 'Test description',
      state: 'open' as const,
      headSha: 'abc123',
      headRef: 'feature-branch',
      baseSha: 'def456',
      baseRef: 'main',
      author: 'testuser',
      createdAt: '2024-01-01',
      updatedAt: '2024-01-02',
      mergeable: true,
      mergeableState: 'clean',
      files: [],
      additions: 0,
      deletions: 0,
      changedFiles: 0,
    };

    const mockFiles = [
      {
        filename: 'src/test.ts',
        sha: 'file-sha-1',
        status: 'modified' as const,
        additions: 10,
        deletions: 5,
        changes: 15,
        patch: '@@ -1,5 +1,10 @@\n+new line\n old line',
      },
      {
        filename: 'src/another.ts',
        sha: 'file-sha-2',
        status: 'added' as const,
        additions: 20,
        deletions: 0,
        changes: 20,
        patch: '@@ -0,0 +1,20 @@\n+new file content',
      },
    ];

    beforeEach(() => {
      mockPrService.getPullRequest.mockResolvedValue(mockPR);
      mockPrService.getFiles.mockResolvedValue(mockFiles);

      // Mock IncrementalAnalyzer
      const mockAnalyses = [
        {
          filename: 'src/test.ts',
          sha: 'file-sha-1',
          changedLines: [{ lineNumber: 10, content: 'new line', type: 'added' as const }],
          isNewFile: false,
          needsReview: true,
        },
        {
          filename: 'src/another.ts',
          sha: 'file-sha-2',
          changedLines: [{ lineNumber: 1, content: 'new file content', type: 'added' as const }],
          isNewFile: true,
          needsReview: true,
        },
      ];

      (IncrementalAnalyzer as jest.MockedClass<typeof IncrementalAnalyzer>).mockImplementation(() => ({
        analyzeFiles: jest.fn().mockResolvedValue(mockAnalyses),
        markAsReviewed: jest.fn().mockResolvedValue(undefined),
      } as any));

      (IncrementalAnalyzer.getFilesNeedingReview as jest.Mock).mockReturnValue(mockAnalyses);

      // Mock OutdatedCommentCleaner
      (OutdatedCommentCleaner as jest.MockedClass<typeof OutdatedCommentCleaner>).mockImplementation(() => ({
        checkAndMarkOutdated: jest.fn().mockResolvedValue({
          markedOutdated: 2,
          errors: [],
        }),
      } as any));

      // Mock IncrementalReviewStrategy
      (IncrementalReviewStrategy as jest.MockedClass<typeof IncrementalReviewStrategy>).mockImplementation(() => ({
        reviewIncremental: jest.fn().mockResolvedValue({
          commentsDeleted: 0,
          threadsResolved: 0,
          newIssuesCreated: 1,
          reviewsDismissed: 0,
          oldIssues: [],
          issuesResolved: [],
          issuesUpdated: [],
          issuesNew: [{ path: 'src/test.ts', line: 10, message: 'Test issue', severity: 'error' }],
        }),
      } as any));

      // Mock PromptBuilder
      (PromptBuilder.buildReviewPrompt as jest.Mock) = jest.fn().mockResolvedValue('Review this code');

      // Mock DiffParser
      (DiffParser.parsePatch as jest.Mock) = jest.fn().mockReturnValue({
        valid: true,
        lines: [
          { lineNumber: 10, content: 'new line', type: 'added' },
        ],
      });
      (DiffParser.getPositionForLine as jest.Mock) = jest.fn().mockReturnValue(10);

      // Mock ResponseParser
      (ResponseParser.parse as jest.Mock) = jest.fn().mockReturnValue({
        success: true,
        data: {
          comments: [
            {
              path: 'src/test.ts',
              line: 10,
              severity: 'error',
              message: 'Test issue',
            },
          ],
          summary: 'Overall summary',
        },
      });

      // Mock AI provider response
      mockAiProvider.sendMessage.mockResolvedValue({
        content: 'AI review response',
        finishReason: 'stop' as const,
        usage: {
          promptTokens: 1000,
          completionTokens: 500,
          totalTokens: 1500,
        },
        model: 'gpt-5-mini',
      });

      // Mock comment service
      mockCommentService.createReview.mockResolvedValue(999);
      mockCommentService.updateReview = jest.fn().mockResolvedValue(undefined);
      mockCommentService.createIssueComment = jest.fn().mockResolvedValue({ id: 1, body: 'test' });
    });

    it('should execute full review successfully', async () => {
      const result = await reviewEngine.executeReview('owner', 'repo', 123);

      expect(result.success).toBe(true);
      expect(result.filesReviewed).toBeGreaterThan(0);
      expect(mockPrService.getPullRequest).toHaveBeenCalledWith(123);
      expect(mockPrService.getFiles).toHaveBeenCalledWith(123);
      expect(mockAiProvider.sendMessage).toHaveBeenCalled();
    });

    it('should handle no files needing review', async () => {
      (IncrementalAnalyzer.getFilesNeedingReview as jest.Mock).mockReturnValue([]);

      const result = await reviewEngine.executeReview('owner', 'repo', 123);

      expect(result.success).toBe(true);
      expect(result.filesReviewed).toBe(0);
      expect(mockAiProvider.sendMessage).not.toHaveBeenCalled();
    });

    it('should clean outdated comments when enabled', async () => {
      const result = await reviewEngine.executeReview('owner', 'repo', 123);

      expect(result.outdatedCleaned).toBe(2);
    });

    it('should not clean outdated comments when disabled', async () => {
      reviewEngine = new ReviewEngine({
        storage: mockStorage,
        prService: mockPrService,
        commentService: mockCommentService,
        aiProvider: mockAiProvider,
        autoCleanOutdated: false,
      });

      const result = await reviewEngine.executeReview('owner', 'repo', 123);

      expect(result.outdatedCleaned).toBe(0);
    });

    it('should handle AI provider errors', async () => {
      mockAiProvider.sendMessage.mockRejectedValue(new Error('API timeout'));

      const result = await reviewEngine.executeReview('owner', 'repo', 123);

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('API timeout');
    });

    it('should handle GitHub API errors', async () => {
      mockPrService.getFiles.mockRejectedValue(new Error('GitHub API error'));

      const result = await reviewEngine.executeReview('owner', 'repo', 123);

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should track token usage correctly', async () => {
      const result = await reviewEngine.executeReview('owner', 'repo', 123);

      expect(result.tokensUsed.prompt).toBeGreaterThan(0);
      expect(result.tokensUsed.completion).toBeGreaterThan(0);
      expect(result.tokensUsed.total).toBe(
        result.tokensUsed.prompt + result.tokensUsed.completion
      );
    });

    it('should calculate cost correctly', async () => {
      const result = await reviewEngine.executeReview('owner', 'repo', 123);

      expect(result.cost).toBeGreaterThanOrEqual(0);
      expect(typeof result.cost).toBe('number');
    });

    it('should handle multiple batches of files', async () => {
      const manyFiles = Array.from({ length: 25 }, (_, i) => ({
        filename: `src/file${i}.ts`,
        sha: `sha-${i}`,
        status: 'modified' as const,
        additions: 10,
        deletions: 5,
        changes: 15,
        patch: '@@ -1,5 +1,10 @@\n+new line',
      }));

      mockPrService.getFiles.mockResolvedValue(manyFiles);

      const manyAnalyses = manyFiles.map((file) => ({
        filename: file.filename,
        sha: file.sha,
        changedLines: [{ lineNumber: 10, content: 'new line', type: 'added' as const }],
        isNewFile: false,
        needsReview: true,
      }));

      (IncrementalAnalyzer as jest.MockedClass<typeof IncrementalAnalyzer>).mockImplementation(() => ({
        analyzeFiles: jest.fn().mockResolvedValue(manyAnalyses),
        markAsReviewed: jest.fn().mockResolvedValue(undefined),
      } as any));

      (IncrementalAnalyzer.getFilesNeedingReview as jest.Mock).mockReturnValue(manyAnalyses);

      const result = await reviewEngine.executeReview('owner', 'repo', 123);

      expect(result.success).toBe(true);
      expect(mockAiProvider.sendMessage).toHaveBeenCalled();
    });

    it('should handle empty file list', async () => {
      mockPrService.getFiles.mockResolvedValue([]);

      const result = await reviewEngine.executeReview('owner', 'repo', 123);

      expect(result.success).toBe(true);
      expect(result.filesReviewed).toBe(0);
    });

    it('should handle parser errors gracefully', async () => {
      (ResponseParser.parse as jest.Mock) = jest
        .fn()
        .mockImplementation(() => {
          throw new Error('Parse error');
        });

      const result = await reviewEngine.executeReview('owner', 'repo', 123);

      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should use incremental strategy when enabled', async () => {
      const mockIncrementalStrategy = {
        processIncrementalUpdate: jest.fn().mockResolvedValue({
          commentsDeleted: 5,
          threadsResolved: 3,
          newIssuesCreated: 2,
          reviewsDismissed: 1,
          issuesResolved: [],
          issuesUpdated: [],
          issuesNew: [],
          oldIssues: [],
          outdatedDeleted: 0,
        }),
      };

      (IncrementalReviewStrategy as jest.MockedClass<typeof IncrementalReviewStrategy>).mockImplementation(
        () => mockIncrementalStrategy as any
      );

      const result = await reviewEngine.executeReview('owner', 'repo', 123);

      expect(result.success).toBe(true);
    });

    it('should aggregate errors from multiple sources', async () => {
      (OutdatedCommentCleaner as jest.MockedClass<typeof OutdatedCommentCleaner>).mockImplementation(() => ({
        checkAndMarkOutdated: jest.fn().mockResolvedValue({
          markedOutdated: 0,
          errors: ['Cleaner error 1', 'Cleaner error 2'],
        }),
      } as any));

      mockAiProvider.sendMessage.mockRejectedValue(new Error('AI error'));

      const result = await reviewEngine.executeReview('owner', 'repo', 123);

      expect(result.errors.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('createIncrementalSummary', () => {
    it('should create summary with resolved issues', async () => {
      // This tests the private method indirectly through executeReview
      const mockPR = {
        number: 123,
        title: 'Test PR',
        body: 'Test description',
        state: 'open' as const,
        headSha: 'abc123',
        headRef: 'feature-branch',
        baseSha: 'def456',
        baseRef: 'main',
        author: 'testuser',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-02',
        mergeable: true,
        mergeableState: 'clean',
        files: [],
        additions: 0,
        deletions: 0,
        changedFiles: 0,
      };

      mockPrService.getPullRequest.mockResolvedValue(mockPR);
      mockPrService.getFiles.mockResolvedValue([]);

      const result = await reviewEngine.executeReview('owner', 'repo', 123);

      expect(result.success).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle very large PRs gracefully', async () => {
      const largePR = {
        number: 123,
        title: 'Large PR',
        body: 'Test description',
        state: 'open' as const,
        headSha: 'abc123',
        headRef: 'feature-branch',
        baseSha: 'def456',
        baseRef: 'main',
        author: 'testuser',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-02',
        mergeable: true,
        mergeableState: 'clean',
        files: [],
        additions: 0,
        deletions: 0,
        changedFiles: 0,
      };

      const largeFiles = Array.from({ length: 100 }, (_, i) => ({
        filename: `src/file${i}.ts`,
        sha: `sha-${i}`,
        status: 'modified' as const,
        additions: 100,
        deletions: 50,
        changes: 150,
        patch: '@@ -1,50 +1,100 @@\n+new lines',
      }));

      mockPrService.getPullRequest.mockResolvedValue(largePR);
      mockPrService.getFiles.mockResolvedValue(largeFiles);

      const result = await reviewEngine.executeReview('owner', 'repo', 123);

      expect(result).toBeDefined();
    });

    it('should handle files with no patch data', async () => {
      const mockPR = {
        number: 123,
        title: 'Test PR',
        body: 'Test description',
        state: 'open' as const,
        headSha: 'abc123',
        headRef: 'feature-branch',
        baseSha: 'def456',
        baseRef: 'main',
        author: 'testuser',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-02',
        mergeable: true,
        mergeableState: 'clean',
        files: [],
        additions: 0,
        deletions: 0,
        changedFiles: 0,
      };

      const filesNoPatch = [
        {
          filename: 'binary.png',
          sha: 'file-sha-1',
          status: 'added' as const,
          additions: 0,
          deletions: 0,
          changes: 0,
          patch: undefined,
        },
      ];

      mockPrService.getPullRequest.mockResolvedValue(mockPR);
      mockPrService.getFiles.mockResolvedValue(filesNoPatch);

      const result = await reviewEngine.executeReview('owner', 'repo', 123);

      expect(result.success).toBe(true);
    });

    it('should handle rate limiting', async () => {
      const rateLimitError = new Error('API rate limit exceeded');
      (rateLimitError as any).status = 429;

      mockPrService.getFiles.mockRejectedValue(rateLimitError);

      const result = await reviewEngine.executeReview('owner', 'repo', 123);

      expect(result.success).toBe(false);
      expect(result.errors.some((e) => e.includes('rate limit'))).toBe(true);
    });
  });
});
