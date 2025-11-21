/**
 * CommentService Tests
 */

import { CommentService } from '../../../src/github/CommentService';

describe('CommentService', () => {
  let service: CommentService;
  let mockOctokit: any;

  beforeEach(() => {
    mockOctokit = {
      pulls: {
        createReviewComment: jest.fn(),
        createReview: jest.fn(),
        listReviewComments: jest.fn(),
        updateReviewComment: jest.fn(),
        getReviewComment: jest.fn(),
        deleteReviewComment: jest.fn(),
        getReview: jest.fn(),
        listReviews: jest.fn(),
        dismissReview: jest.fn(),
      },
      issues: {
        createComment: jest.fn(),
        listComments: jest.fn(),
        updateComment: jest.fn(),
        deleteComment: jest.fn(),
      },
      graphql: jest.fn(),
    };

    service = new CommentService({
      octokit: mockOctokit,
      owner: 'test-owner',
      repo: 'test-repo',
    });
  });

  describe('constructor', () => {
    it('should create service with valid options', () => {
      expect(service).toBeDefined();
    });
  });

  describe('getOwner', () => {
    it('should return owner', () => {
      expect(service.getOwner()).toBe('test-owner');
    });
  });

  describe('getRepo', () => {
    it('should return repo', () => {
      expect(service.getRepo()).toBe('test-repo');
    });
  });

  describe('getOctokit', () => {
    it('should return octokit instance', () => {
      expect(service.getOctokit()).toBe(mockOctokit);
    });
  });

  describe('createReviewComment', () => {
    it('should create review comment successfully', async () => {
      const mockResponse = {
        data: {
          id: 123,
          path: 'src/test.ts',
          position: 10,
          line: 15,
          body: 'Test comment',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          user: { login: 'test-user' },
        },
      };

      mockOctokit.pulls.createReviewComment.mockResolvedValue(mockResponse);

      const result = await service.createReviewComment(
        1,
        'abc123',
        'src/test.ts',
        10,
        'Test comment'
      );

      expect(result).toEqual({
        id: 123,
        path: 'src/test.ts',
        position: 10,
        line: 15,
        body: 'Test comment',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        user: 'test-user',
      });

      expect(mockOctokit.pulls.createReviewComment).toHaveBeenCalledWith({
        owner: 'test-owner',
        repo: 'test-repo',
        pull_number: 1,
        commit_id: 'abc123',
        path: 'src/test.ts',
        position: 10,
        body: 'Test comment',
      });
    });

    it('should handle null position and line', async () => {
      const mockResponse = {
        data: {
          id: 124,
          path: 'src/test.ts',
          position: null,
          line: null,
          body: 'Test comment',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          user: null,
        },
      };

      mockOctokit.pulls.createReviewComment.mockResolvedValue(mockResponse);

      const result = await service.createReviewComment(
        1,
        'abc123',
        'src/test.ts',
        10,
        'Test comment'
      );

      expect(result.position).toBeNull();
      expect(result.line).toBeNull();
      expect(result.user).toBe('unknown');
    });

    it('should throw error on failure', async () => {
      mockOctokit.pulls.createReviewComment.mockRejectedValue(
        new Error('API error')
      );

      await expect(
        service.createReviewComment(1, 'abc123', 'src/test.ts', 10, 'Test comment')
      ).rejects.toThrow('API error');
    });
  });

  describe('createIssueComment', () => {
    it('should create issue comment successfully', async () => {
      const mockResponse = {
        data: {
          id: 456,
          body: 'PR-level comment',
        },
      };

      mockOctokit.issues.createComment.mockResolvedValue(mockResponse);

      const result = await service.createIssueComment(1, 'PR-level comment');

      expect(result).toEqual({
        id: 456,
        body: 'PR-level comment',
      });

      expect(mockOctokit.issues.createComment).toHaveBeenCalledWith({
        owner: 'test-owner',
        repo: 'test-repo',
        issue_number: 1,
        body: 'PR-level comment',
      });
    });

    it('should handle empty body', async () => {
      const mockResponse = {
        data: {
          id: 457,
          body: '',
        },
      };

      mockOctokit.issues.createComment.mockResolvedValue(mockResponse);

      const result = await service.createIssueComment(1, '');

      expect(result.body).toBe('');
    });

    it('should throw error on failure', async () => {
      mockOctokit.issues.createComment.mockRejectedValue(new Error('API error'));

      await expect(service.createIssueComment(1, 'Comment')).rejects.toThrow(
        'API error'
      );
    });
  });

  describe('createComment', () => {
    it('should be an alias for createIssueComment', async () => {
      const mockResponse = {
        data: {
          id: 789,
          body: 'Alias test',
        },
      };

      mockOctokit.issues.createComment.mockResolvedValue(mockResponse);

      const result = await service.createComment(1, 'Alias test');

      expect(result).toEqual({
        id: 789,
        body: 'Alias test',
      });
    });
  });

  describe('createReview', () => {
    it('should create review with comments', async () => {
      const mockResponse = {
        data: { id: 999 },
      };

      mockOctokit.pulls.createReview.mockResolvedValue(mockResponse);

      const comments = [
        { path: 'src/test.ts', position: 10, body: 'Comment 1' },
        { path: 'src/test.ts', position: 20, body: 'Comment 2' },
      ];

      const result = await service.createReview(
        1,
        'abc123',
        'Review body',
        'COMMENT',
        comments
      );

      expect(result).toBe(999);

      expect(mockOctokit.pulls.createReview).toHaveBeenCalledWith({
        owner: 'test-owner',
        repo: 'test-repo',
        pull_number: 1,
        commit_id: 'abc123',
        body: 'Review body',
        event: 'COMMENT',
        comments: comments,
      });
    });

    it('should create review without comments', async () => {
      const mockResponse = {
        data: { id: 1000 },
      };

      mockOctokit.pulls.createReview.mockResolvedValue(mockResponse);

      const result = await service.createReview(
        1,
        'abc123',
        'Review body',
        'APPROVE'
      );

      expect(result).toBe(1000);
    });

    it('should throw error on failure', async () => {
      mockOctokit.pulls.createReview.mockRejectedValue(new Error('API error'));

      await expect(
        service.createReview(1, 'abc123', 'Review', 'COMMENT')
      ).rejects.toThrow('API error');
    });
  });

  describe('listReviewComments', () => {
    it('should list review comments', async () => {
      const mockResponse = {
        data: [
          {
            id: 111,
            path: 'src/test.ts',
            position: 10,
            line: 15,
            body: 'Comment 1',
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
            user: { login: 'user1' },
          },
          {
            id: 112,
            path: 'src/test2.ts',
            position: null,
            line: null,
            body: 'Comment 2',
            created_at: '2024-01-02T00:00:00Z',
            updated_at: '2024-01-02T00:00:00Z',
            user: null,
          },
        ],
      };

      mockOctokit.pulls.listReviewComments.mockResolvedValue(mockResponse);

      const result = await service.listReviewComments(1);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: 111,
        path: 'src/test.ts',
        position: 10,
        line: 15,
        body: 'Comment 1',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        user: 'user1',
      });
      expect(result[1].user).toBe('unknown');
    });

    it('should throw error on failure', async () => {
      mockOctokit.pulls.listReviewComments.mockRejectedValue(
        new Error('API error')
      );

      await expect(service.listReviewComments(1)).rejects.toThrow('API error');
    });
  });

  describe('updateReviewComment', () => {
    it('should update review comment successfully', async () => {
      mockOctokit.pulls.updateReviewComment.mockResolvedValue({});

      await service.updateReviewComment(123, 'Updated comment');

      expect(mockOctokit.pulls.updateReviewComment).toHaveBeenCalledWith({
        owner: 'test-owner',
        repo: 'test-repo',
        comment_id: 123,
        body: 'Updated comment',
      });
    });

    it('should throw error on failure', async () => {
      mockOctokit.pulls.updateReviewComment.mockRejectedValue(
        new Error('API error')
      );

      await expect(service.updateReviewComment(123, 'Updated')).rejects.toThrow(
        'API error'
      );
    });
  });

  describe('resolveReviewThread', () => {
    it('should resolve review thread successfully', async () => {
      const mockGetCommentResponse = {
        data: {
          pull_request_url: 'https://api.github.com/repos/owner/repo/pulls/1',
        },
      };

      const mockGraphQLResponse = {
        repository: {
          pullRequest: {
            reviewThreads: {
              nodes: [
                {
                  id: 'thread-id-123',
                  isResolved: false,
                  comments: {
                    nodes: [{ databaseId: 123 }],
                  },
                },
              ],
            },
          },
        },
      };

      mockOctokit.pulls.getReviewComment.mockResolvedValue(mockGetCommentResponse);
      mockOctokit.graphql.mockResolvedValue(mockGraphQLResponse);
      mockOctokit.graphql.mockResolvedValueOnce(mockGraphQLResponse); // For query
      mockOctokit.graphql.mockResolvedValueOnce({ resolveReviewThread: {} }); // For mutation

      await service.resolveReviewThread(123);

      expect(mockOctokit.pulls.getReviewComment).toHaveBeenCalledWith({
        owner: 'test-owner',
        repo: 'test-repo',
        comment_id: 123,
      });
    });

    it('should return early if thread not found', async () => {
      const mockGetCommentResponse = {
        data: {
          pull_request_url: 'https://api.github.com/repos/owner/repo/pulls/1',
        },
      };

      const mockGraphQLResponse = {
        repository: {
          pullRequest: {
            reviewThreads: {
              nodes: [],
            },
          },
        },
      };

      mockOctokit.pulls.getReviewComment.mockResolvedValue(mockGetCommentResponse);
      mockOctokit.graphql.mockResolvedValue(mockGraphQLResponse);

      await service.resolveReviewThread(123);

      // Should not throw, just return early
      expect(mockOctokit.pulls.getReviewComment).toHaveBeenCalled();
    });

    it('should handle API failure gracefully', async () => {
      mockOctokit.pulls.getReviewComment.mockRejectedValue(
        new Error('API error')
      );

      // Should not throw, just log warning
      await service.resolveReviewThread(123);
      expect(mockOctokit.pulls.getReviewComment).toHaveBeenCalled();
    });
  });

  describe('deleteReviewComment', () => {
    it('should delete review comment successfully', async () => {
      mockOctokit.pulls.deleteReviewComment.mockResolvedValue({});

      await service.deleteReviewComment(123);

      expect(mockOctokit.pulls.deleteReviewComment).toHaveBeenCalledWith({
        owner: 'test-owner',
        repo: 'test-repo',
        comment_id: 123,
      });
    });

    it('should throw error on failure', async () => {
      mockOctokit.pulls.deleteReviewComment.mockRejectedValue(
        new Error('API error')
      );

      await expect(service.deleteReviewComment(123)).rejects.toThrow('API error');
    });
  });

  describe('listIssueComments', () => {
    it('should list issue comments', async () => {
      const mockResponse = {
        data: [
          {
            id: 201,
            body: 'Issue comment 1',
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
            user: { login: 'user1' },
          },
        ],
      };

      mockOctokit.issues.listComments.mockResolvedValue(mockResponse);

      const result = await service.listIssueComments(1);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: 201,
        body: 'Issue comment 1',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        user: 'user1',
      });
    });

    it('should handle missing user', async () => {
      const mockResponse = {
        data: [
          {
            id: 202,
            body: 'Issue comment 2',
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
            user: null,
          },
        ],
      };

      mockOctokit.issues.listComments.mockResolvedValue(mockResponse);

      const result = await service.listIssueComments(1);

      expect(result[0].user).toBe('unknown');
    });

    it('should throw error on failure', async () => {
      mockOctokit.issues.listComments.mockRejectedValue(new Error('API error'));

      await expect(service.listIssueComments(1)).rejects.toThrow('API error');
    });
  });

  describe('deleteIssueComment', () => {
    it('should delete issue comment successfully', async () => {
      mockOctokit.issues.deleteComment.mockResolvedValue({});

      await service.deleteIssueComment(123);

      expect(mockOctokit.issues.deleteComment).toHaveBeenCalledWith({
        owner: 'test-owner',
        repo: 'test-repo',
        comment_id: 123,
      });
    });

    it('should throw error on failure', async () => {
      mockOctokit.issues.deleteComment.mockRejectedValue(new Error('API error'));

      await expect(service.deleteIssueComment(123)).rejects.toThrow('API error');
    });
  });

  describe('batchCreateComments', () => {
    it('should batch create comments using review API', async () => {
      const mockResponse = {
        data: { id: 555 },
      };

      mockOctokit.pulls.createReview.mockResolvedValue(mockResponse);

      const comments = [
        { path: 'src/test.ts', position: 10, body: 'Comment 1' },
        { path: 'src/test.ts', position: 20, body: 'Comment 2' },
      ];

      const result = await service.batchCreateComments(1, 'abc123', comments);

      expect(result).toBe(555);
      expect(mockOctokit.pulls.createReview).toHaveBeenCalled();
    });

    it('should return 0 for empty comments array', async () => {
      const result = await service.batchCreateComments(1, 'abc123', []);

      expect(result).toBe(0);
      expect(mockOctokit.pulls.createReview).not.toHaveBeenCalled();
    });

    it('should throw error on failure', async () => {
      mockOctokit.pulls.createReview.mockRejectedValue(new Error('API error'));

      const comments = [{ path: 'src/test.ts', position: 10, body: 'Comment' }];

      await expect(
        service.batchCreateComments(1, 'abc123', comments)
      ).rejects.toThrow('API error');
    });
  });

  describe('getFileComments', () => {
    it('should get comments for specific file', async () => {
      const mockResponse = {
        data: [
          {
            id: 301,
            path: 'src/test.ts',
            position: 10,
            line: 15,
            body: 'Comment on test.ts',
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
            user: { login: 'user1' },
          },
          {
            id: 302,
            path: 'src/other.ts',
            position: 5,
            line: 8,
            body: 'Comment on other.ts',
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
            user: { login: 'user2' },
          },
        ],
      };

      mockOctokit.pulls.listReviewComments.mockResolvedValue(mockResponse);

      const result = await service.getFileComments(1, 'src/test.ts');

      expect(result).toHaveLength(1);
      expect(result[0].path).toBe('src/test.ts');
    });
  });

  describe('commentExistsAt', () => {
    it('should return true if comment exists at position', async () => {
      const mockResponse = {
        data: [
          {
            id: 401,
            path: 'src/test.ts',
            position: 10,
            line: 15,
            body: 'Comment',
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
            user: { login: 'user1' },
          },
        ],
      };

      mockOctokit.pulls.listReviewComments.mockResolvedValue(mockResponse);

      const result = await service.commentExistsAt(1, 'src/test.ts', 10);

      expect(result).toBe(true);
    });

    it('should return false if comment does not exist at position', async () => {
      const mockResponse = {
        data: [
          {
            id: 402,
            path: 'src/test.ts',
            position: 10,
            line: 15,
            body: 'Comment',
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
            user: { login: 'user1' },
          },
        ],
      };

      mockOctokit.pulls.listReviewComments.mockResolvedValue(mockResponse);

      const result = await service.commentExistsAt(1, 'src/test.ts', 20);

      expect(result).toBe(false);
    });
  });

  describe('getReview', () => {
    it('should get review by ID', async () => {
      const mockResponse = {
        data: {
          id: 501,
          body: 'Review body',
          state: 'COMMENTED',
        },
      };

      mockOctokit.pulls.getReview.mockResolvedValue(mockResponse);

      const result = await service.getReview(1, 501);

      expect(result).toEqual({
        id: 501,
        body: 'Review body',
        state: 'COMMENTED',
      });
    });

    it('should handle empty body', async () => {
      const mockResponse = {
        data: {
          id: 502,
          body: null,
          state: 'APPROVED',
        },
      };

      mockOctokit.pulls.getReview.mockResolvedValue(mockResponse);

      const result = await service.getReview(1, 502);

      expect(result?.body).toBe('');
    });

    it('should return null on error', async () => {
      mockOctokit.pulls.getReview.mockRejectedValue(new Error('Not found'));

      const result = await service.getReview(1, 999);

      expect(result).toBeNull();
    });
  });

  describe('updateReview', () => {
    it('should throw error as not supported', async () => {
      await expect(service.updateReview(123, 'Updated body')).rejects.toThrow(
        'Review body updates not supported by GitHub API'
      );
    });
  });

  describe('listReviews', () => {
    it('should list all reviews', async () => {
      const mockResponse = {
        data: [
          {
            id: 601,
            user: { login: 'user1' },
            body: 'Review 1',
            state: 'COMMENTED',
            submitted_at: '2024-01-01T00:00:00Z',
          },
          {
            id: 602,
            user: null,
            body: null,
            state: 'APPROVED',
            submitted_at: '2024-01-02T00:00:00Z',
          },
        ],
      };

      mockOctokit.pulls.listReviews.mockResolvedValue(mockResponse);

      const result = await service.listReviews(1);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: 601,
        user: { login: 'user1' },
        body: 'Review 1',
        state: 'COMMENTED',
        submitted_at: '2024-01-01T00:00:00Z',
      });
    });

    it('should throw error on failure', async () => {
      mockOctokit.pulls.listReviews.mockRejectedValue(new Error('API error'));

      await expect(service.listReviews(1)).rejects.toThrow('API error');
    });
  });

  describe('dismissOldReviews', () => {
    it('should dismiss old reviews', async () => {
      const mockListResponse = {
        data: [
          {
            id: 701,
            user: { login: 'github-actions[bot]' },
            body: 'Code Sentinel AI review 1',
            state: 'COMMENTED',
            submitted_at: '2024-01-01T00:00:00Z',
          },
          {
            id: 702,
            user: { login: 'github-actions[bot]' },
            body: 'Code Sentinel AI review 2',
            state: 'COMMENTED',
            submitted_at: '2024-01-02T00:00:00Z',
          },
        ],
      };

      mockOctokit.pulls.listReviews.mockResolvedValue(mockListResponse);
      mockOctokit.pulls.dismissReview = jest.fn().mockResolvedValue({});

      const result = await service.dismissOldReviews(1);

      expect(result).toBe(1);
      expect(mockOctokit.pulls.dismissReview).toHaveBeenCalledTimes(1);
    });

    it('should return 0 if only one review exists', async () => {
      const mockListResponse = {
        data: [
          {
            id: 703,
            user: { login: 'github-actions[bot]' },
            body: 'Code Sentinel AI review',
            state: 'COMMENTED',
            submitted_at: '2024-01-01T00:00:00Z',
          },
        ],
      };

      mockOctokit.pulls.listReviews.mockResolvedValue(mockListResponse);
      mockOctokit.pulls.dismissReview = jest.fn().mockResolvedValue({});

      const result = await service.dismissOldReviews(1);

      expect(result).toBe(0);
      expect(mockOctokit.pulls.dismissReview).not.toHaveBeenCalled();
    });

    it('should handle failure gracefully', async () => {
      mockOctokit.pulls.listReviews.mockRejectedValue(new Error('API error'));

      const result = await service.dismissOldReviews(1);
      
      // Should return 0 instead of throwing
      expect(result).toBe(0);
    });
  });

  describe('dismissReview', () => {
    it('should dismiss review successfully', async () => {
      mockOctokit.pulls.dismissReview = jest.fn().mockResolvedValue({});

      await service.dismissReview(1, 123, 'Outdated review');

      expect(mockOctokit.pulls.dismissReview).toHaveBeenCalledWith({
        owner: 'test-owner',
        repo: 'test-repo',
        pull_number: 1,
        review_id: 123,
        message: 'Outdated review',
      });
    });

    it('should throw error on failure', async () => {
      mockOctokit.pulls.dismissReview = jest
        .fn()
        .mockRejectedValue(new Error('API error'));

      await expect(service.dismissReview(1, 123, 'Message')).rejects.toThrow(
        'API error'
      );
    });
  });
});
