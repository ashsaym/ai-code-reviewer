/**
 * CommentStateStorage Tests
 */

import { CommentStateStorage } from '../../../src/storage/CommentStateStorage';

describe('CommentStateStorage', () => {
  let storage: CommentStateStorage;
  let mockOctokit: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockOctokit = {
      pulls: {
        createReviewComment: jest.fn(),
        updateReviewComment: jest.fn(),
        deleteReviewComment: jest.fn(),
        listReviewComments: jest.fn(),
        getReviewComment: jest.fn(),
      },
      issues: {
        createComment: jest.fn(),
        updateComment: jest.fn(),
        deleteComment: jest.fn(),
        listComments: jest.fn(),
        getComment: jest.fn(),
      },
    };

    storage = new CommentStateStorage({
      octokit: mockOctokit,
      owner: 'owner',
      repo: 'repo',
    });
  });

  describe('constructor', () => {
    it('should create storage with options', () => {
      expect(storage).toBeDefined();
    });
  });

  describe('createComment', () => {
    it('should create review comment with metadata', async () => {
      mockOctokit.pulls.createReviewComment.mockResolvedValue({
        data: {
          id: 1,
          path: 'test.ts',
          line: 10,
          body: 'Test comment',
          commit_id: 'abc123',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      });

      const result = await storage.createComment(
        123,
        'abc123',
        'test.ts',
        10,
        'Test comment',
        'warning',
        5,
        'session-1'
      );

      expect(result).toBeDefined();
      expect(result.commentId).toBe(1);
      expect(mockOctokit.pulls.createReviewComment).toHaveBeenCalled();
    });
  });

  describe('getComments', () => {
    it('should get all comments for PR', async () => {
      mockOctokit.pulls.listReviewComments.mockResolvedValue({
        data: [
          {
            id: 1,
            path: 'test.ts',
            line: 10,
            body: 'Comment 1 <!-- code-sentinel-ai:eyJ0ZXN0IjoidGVzdCJ9 -->',
            commit_id: 'abc123',
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
          },
        ],
      });

      mockOctokit.issues.listComments.mockResolvedValue({
        data: [],
      });

      const results = await storage.getComments(123);

      expect(results).toHaveLength(1);
    });
  });

  describe('getFileComments', () => {
    it('should call getFileComments method', async () => {
      mockOctokit.pulls.listReviewComments.mockResolvedValue({
        data: [],
      });

      mockOctokit.issues.listComments.mockResolvedValue({
        data: [],
      });

      const results = await storage.getFileComments(123, 'test.ts');

      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
    });
  });

  describe('updateComment', () => {
    it('should update review comment', async () => {
      mockOctokit.pulls.updateReviewComment.mockResolvedValue({
        data: { id: 1 },
      });

      await storage.updateComment(1, 'Updated comment', true);

      expect(mockOctokit.pulls.updateReviewComment).toHaveBeenCalledWith({
        owner: 'owner',
        repo: 'repo',
        comment_id: 1,
        body: 'Updated comment',
      });
    });

    it('should update issue comment', async () => {
      mockOctokit.issues.updateComment.mockResolvedValue({
        data: { id: 1 },
      });

      await storage.updateComment(1, 'Updated comment', false);

      expect(mockOctokit.issues.updateComment).toHaveBeenCalledWith({
        owner: 'owner',
        repo: 'repo',
        comment_id: 1,
        body: 'Updated comment',
      });
    });
  });

  describe('deleteComment', () => {
    it('should delete review comment', async () => {
      mockOctokit.pulls.deleteReviewComment.mockResolvedValue({});

      await storage.deleteComment(1, true);

      expect(mockOctokit.pulls.deleteReviewComment).toHaveBeenCalledWith({
        owner: 'owner',
        repo: 'repo',
        comment_id: 1,
      });
    });

    it('should delete issue comment', async () => {
      mockOctokit.issues.deleteComment.mockResolvedValue({});

      await storage.deleteComment(1, false);

      expect(mockOctokit.issues.deleteComment).toHaveBeenCalledWith({
        owner: 'owner',
        repo: 'repo',
        comment_id: 1,
      });
    });
  });

  describe('markOutdated', () => {
    it('should mark comment as outdated', async () => {
      mockOctokit.pulls.getReviewComment.mockResolvedValue({
        data: {
          id: 1,
          body: 'Original comment',
        },
      });
      mockOctokit.pulls.updateReviewComment.mockResolvedValue({
        data: { id: 1 },
      });

      await storage.markOutdated(1, true);

      expect(mockOctokit.pulls.updateReviewComment).toHaveBeenCalled();
    });
  });

  describe('getCommentStats', () => {
    it('should return comment statistics', async () => {
      mockOctokit.pulls.listReviewComments.mockResolvedValue({
        data: [
          {
            id: 1,
            path: 'test.ts',
            line: 10,
            body: 'Comment <!-- code-sentinel-ai:eyJzZXNzaW9uSWQiOiJ0ZXN0Iiwic2V2ZXJpdHkiOiJ3YXJuaW5nIiwib3V0ZGF0ZWQiOmZhbHNlfQ== -->',
            commit_id: 'abc123',
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
          },
        ],
      });

      mockOctokit.issues.listComments.mockResolvedValue({
        data: [],
      });

      const stats = await storage.getCommentStats(123);

      expect(stats).toBeDefined();
      expect(stats.total).toBeGreaterThanOrEqual(0);
    });
  });
});
