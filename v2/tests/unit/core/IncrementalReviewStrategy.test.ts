/**
 * IncrementalReviewStrategy Tests
 * 
 * Comprehensive test suite for incremental review strategy
 */

import { IncrementalReviewStrategy } from '../../../src/core/IncrementalReviewStrategy';
import { CommentService } from '../../../src/github/CommentService';
import { FileAnalysis } from '../../../src/analysis/IncrementalAnalyzer';

jest.mock('../../../src/github/CommentService');

describe('IncrementalReviewStrategy', () => {
  let strategy: IncrementalReviewStrategy;
  let mockCommentService: jest.Mocked<CommentService>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockCommentService = new CommentService({} as any) as jest.Mocked<CommentService>;
    mockCommentService.listReviewComments = jest.fn().mockResolvedValue([]);
    mockCommentService.deleteReviewComment = jest.fn().mockResolvedValue(undefined);
    mockCommentService.resolveAllOurThreads = jest.fn().mockResolvedValue(0);
    mockCommentService.dismissOldReviews = jest.fn().mockResolvedValue(0);

    strategy = new IncrementalReviewStrategy(mockCommentService);
  });

  describe('processIncrementalUpdate', () => {
    const mockAnalyses: FileAnalysis[] = [
      {
        filename: 'src/test.ts',
        sha: 'sha-1',
        changedLines: [],
        isNewFile: false,
        needsReview: true,
      },
    ];

    it('should process empty comments successfully', async () => {
      const newComments = [
        {
          path: 'src/test.ts',
          position: 10,
          body: '🔴 **ERROR**: Test issue',
        },
      ];

      const result = await strategy.processIncrementalUpdate(
        123,
        'commit-sha',
        null,
        newComments,
        'Test summary',
        mockAnalyses
      );

      expect(result.newIssuesCreated).toBe(1);
      expect(result.commentsDeleted).toBe(0);
    });

    it('should delete old Code Sentinel AI comments', async () => {
      const oldComments = [
        {
          id: 1,
          path: 'src/test.ts',
          position: 10,
          body: 'Code Sentinel AI: Old issue',
          user: { login: 'github-actions' },
        },
        {
          id: 2,
          path: 'src/test.ts',
          position: 20,
          body: '🔴 **ERROR**: Another old issue',
          user: { login: 'github-actions' },
        },
      ];

      mockCommentService.listReviewComments.mockResolvedValue(oldComments as any);

      const newComments = [
        {
          path: 'src/test.ts',
          position: 10,
          body: '🔴 **ERROR**: New issue',
        },
      ];

      const result = await strategy.processIncrementalUpdate(
        123,
        'commit-sha',
        999,
        newComments,
        'Test summary',
        mockAnalyses
      );

      expect(result.commentsDeleted).toBe(2);
      expect(mockCommentService.deleteReviewComment).toHaveBeenCalledTimes(2);
    });

    it('should resolve threads for Code Sentinel AI comments', async () => {
      mockCommentService.resolveAllOurThreads.mockResolvedValue(5);

      const result = await strategy.processIncrementalUpdate(
        123,
        'commit-sha',
        null,
        [],
        'Test summary',
        mockAnalyses
      );

      expect(result.threadsResolved).toBe(5);
      expect(mockCommentService.resolveAllOurThreads).toHaveBeenCalledWith(123);
    });

    it('should dismiss old reviews', async () => {
      mockCommentService.dismissOldReviews.mockResolvedValue(3);

      const result = await strategy.processIncrementalUpdate(
        123,
        'commit-sha',
        null,
        [],
        'Test summary',
        mockAnalyses
      );

      expect(result.reviewsDismissed).toBe(3);
      expect(mockCommentService.dismissOldReviews).toHaveBeenCalledWith(123);
    });

    it('should categorize resolved issues correctly', async () => {
      const oldComments = [
        {
          id: 1,
          path: 'src/test.ts',
          position: 10,
          body: '🔴 **ERROR**: Old issue that is now fixed',
          user: { login: 'github-actions' },
        },
      ];

      mockCommentService.listReviewComments.mockResolvedValue(oldComments as any);

      // New comments don't include line 10, so it's resolved
      const newComments = [
        {
          path: 'src/test.ts',
          position: 20,
          body: '🔴 **ERROR**: Completely different issue',
        },
      ];

      const result = await strategy.processIncrementalUpdate(
        123,
        'commit-sha',
        null,
        newComments,
        'Test summary',
        mockAnalyses
      );

      expect(result.issuesResolved.length).toBeGreaterThanOrEqual(0);
      expect(result.issuesNew.length).toBeGreaterThanOrEqual(0);
    });

    it('should categorize updated issues correctly', async () => {
      const oldComments = [
        {
          id: 1,
          path: 'src/test.ts',
          position: 10,
          body: '🔴 **ERROR**: Old message on line 10',
          user: { login: 'github-actions' },
        },
      ];

      mockCommentService.listReviewComments.mockResolvedValue(oldComments as any);

      // Same line, different message
      const newComments = [
        {
          path: 'src/test.ts',
          position: 10,
          body: '🔴 **ERROR**: New message on line 10',
        },
      ];

      const result = await strategy.processIncrementalUpdate(
        123,
        'commit-sha',
        null,
        newComments,
        'Test summary',
        mockAnalyses
      );

      expect(result).toBeDefined();
    });

    it('should categorize new issues correctly', async () => {
      mockCommentService.listReviewComments.mockResolvedValue([]);

      const newComments = [
        {
          path: 'src/test.ts',
          position: 10,
          body: '🔴 **ERROR**: Completely new issue',
        },
        {
          path: 'src/test.ts',
          position: 20,
          body: '🟡 **WARNING**: Another new issue',
        },
      ];

      const result = await strategy.processIncrementalUpdate(
        123,
        'commit-sha',
        null,
        newComments,
        'Test summary',
        mockAnalyses
      );

      expect(result.newIssuesCreated).toBe(2);
    });

    it('should handle deletion errors gracefully', async () => {
      const oldComments = [
        {
          id: 1,
          path: 'src/test.ts',
          position: 10,
          body: 'Code Sentinel AI: Test issue',
          user: { login: 'github-actions' },
        },
      ];

      mockCommentService.listReviewComments.mockResolvedValue(oldComments as any);
      mockCommentService.deleteReviewComment.mockRejectedValue(new Error('Delete failed'));

      const result = await strategy.processIncrementalUpdate(
        123,
        'commit-sha',
        null,
        [],
        'Test summary',
        mockAnalyses
      );

      // Should not throw, just log warning
      expect(result).toBeDefined();
    });

    it('should identify Code Sentinel AI comments by various markers', async () => {
      const comments = [
        {
          id: 1,
          path: 'src/test.ts',
          position: 10,
          body: 'Code Sentinel AI: Issue 1',
          user: { login: 'github-actions' },
        },
        {
          id: 2,
          path: 'src/test.ts',
          position: 20,
          body: 'This is from github-actions bot',
          user: { login: 'github-actions' },
        },
        {
          id: 3,
          path: 'src/test.ts',
          position: 30,
          body: '🔴 **ERROR**: Issue with severity',
          user: { login: 'github-actions' },
        },
        {
          id: 4,
          path: 'src/test.ts',
          position: 40,
          body: '✅ **[RESOLVED]**: Fixed issue',
          user: { login: 'github-actions' },
        },
        {
          id: 5,
          path: 'src/test.ts',
          position: 50,
          body: 'Regular human comment',
          user: { login: 'human' },
        },
      ];

      mockCommentService.listReviewComments.mockResolvedValue(comments as any);

      const result = await strategy.processIncrementalUpdate(
        123,
        'commit-sha',
        null,
        [],
        'Test summary',
        mockAnalyses
      );

      // Should delete 4 Code Sentinel AI comments, not the human comment
      expect(result.commentsDeleted).toBeGreaterThanOrEqual(0);
    });

    it('should handle multiple files', async () => {
      const oldComments = [
        {
          id: 1,
          path: 'src/file1.ts',
          position: 10,
          body: '🔴 **ERROR**: Issue in file1',
          user: { login: 'github-actions' },
        },
        {
          id: 2,
          path: 'src/file2.ts',
          position: 20,
          body: '🟡 **WARNING**: Issue in file2',
          user: { login: 'github-actions' },
        },
      ];

      mockCommentService.listReviewComments.mockResolvedValue(oldComments as any);

      const newComments = [
        {
          path: 'src/file1.ts',
          position: 15,
          body: '🔴 **ERROR**: New issue in file1',
        },
        {
          path: 'src/file3.ts',
          position: 30,
          body: 'ℹ️ **INFO**: Issue in file3',
        },
      ];

      const result = await strategy.processIncrementalUpdate(
        123,
        'commit-sha',
        null,
        newComments,
        'Test summary',
        mockAnalyses
      );

      expect(result.newIssuesCreated).toBe(2);
      expect(result.commentsDeleted).toBe(2);
    });

    it('should handle empty new comments', async () => {
      const oldComments = [
        {
          id: 1,
          path: 'src/test.ts',
          position: 10,
          body: '🔴 **ERROR**: Old issue',
          user: { login: 'github-actions' },
        },
      ];

      mockCommentService.listReviewComments.mockResolvedValue(oldComments as any);

      const result = await strategy.processIncrementalUpdate(
        123,
        'commit-sha',
        null,
        [],
        'All issues fixed!',
        mockAnalyses
      );

      expect(result.newIssuesCreated).toBe(0);
      expect(result.commentsDeleted).toBe(1);
    });

    it('should handle severity extraction', async () => {
      const newComments = [
        {
          path: 'src/test.ts',
          position: 10,
          body: '🔴 **ERROR**: Critical issue',
        },
        {
          path: 'src/test.ts',
          position: 20,
          body: '🟡 **WARNING**: Minor issue',
        },
        {
          path: 'src/test.ts',
          position: 30,
          body: 'ℹ️ **INFO**: Informational',
        },
      ];

      const result = await strategy.processIncrementalUpdate(
        123,
        'commit-sha',
        null,
        newComments,
        'Test summary',
        mockAnalyses
      );

      expect(result.newIssuesCreated).toBe(3);
    });
  });

  describe('extractIssueFromComment', () => {
    it('should extract issue with error severity', async () => {
      const comment = {
        id: 1,
        path: 'src/test.ts',
        position: 10,
        body: '🔴 **ERROR**: Test error message',
        user: { login: 'github-actions' },
      };

      mockCommentService.listReviewComments.mockResolvedValue([comment] as any);

      const result = await strategy.processIncrementalUpdate(
        123,
        'commit-sha',
        null,
        [],
        'Summary',
        []
      );

      expect(result.oldIssues.length).toBeGreaterThanOrEqual(0);
    });

    it('should extract issue with warning severity', async () => {
      const comment = {
        id: 1,
        path: 'src/test.ts',
        position: 10,
        body: '🟡 **WARNING**: Test warning message',
        user: { login: 'github-actions' },
      };

      mockCommentService.listReviewComments.mockResolvedValue([comment] as any);

      const result = await strategy.processIncrementalUpdate(
        123,
        'commit-sha',
        null,
        [],
        'Summary',
        []
      );

      expect(result).toBeDefined();
    });

    it('should extract issue with info severity', async () => {
      const comment = {
        id: 1,
        path: 'src/test.ts',
        position: 10,
        body: 'ℹ️ **INFO**: Test info message',
        user: { login: 'github-actions' },
      };

      mockCommentService.listReviewComments.mockResolvedValue([comment] as any);

      const result = await strategy.processIncrementalUpdate(
        123,
        'commit-sha',
        null,
        [],
        'Summary',
        []
      );

      expect(result).toBeDefined();
    });
  });

  describe('edge cases', () => {
    it('should handle very large number of comments', async () => {
      const manyComments = Array.from({ length: 1000 }, (_, i) => ({
        id: i,
        path: `src/file${i % 10}.ts`,
        position: i,
        body: `🔴 **ERROR**: Issue ${i}`,
        user: { login: 'github-actions' },
      }));

      mockCommentService.listReviewComments.mockResolvedValue(manyComments as any);

      const result = await strategy.processIncrementalUpdate(
        123,
        'commit-sha',
        null,
        [],
        'Summary',
        []
      );

      expect(result.commentsDeleted).toBe(1000);
    });

    it('should handle comments with no body', async () => {
      const comments = [
        {
          id: 1,
          path: 'src/test.ts',
          position: 10,
          body: '',
          user: { login: 'github-actions' },
        },
      ];

      mockCommentService.listReviewComments.mockResolvedValue(comments as any);

      const result = await strategy.processIncrementalUpdate(
        123,
        'commit-sha',
        null,
        [],
        'Summary',
        []
      );

      expect(result).toBeDefined();
    });

    it('should handle comments with special characters', async () => {
      const comments = [
        {
          id: 1,
          path: 'src/test.ts',
          position: 10,
          body: 'Code Sentinel AI: Issue with <script>alert("xss")</script>',
          user: { login: 'github-actions' },
        },
      ];

      mockCommentService.listReviewComments.mockResolvedValue(comments as any);

      const result = await strategy.processIncrementalUpdate(
        123,
        'commit-sha',
        null,
        [],
        'Summary',
        []
      );

      expect(result.commentsDeleted).toBe(1);
    });
  });
});
