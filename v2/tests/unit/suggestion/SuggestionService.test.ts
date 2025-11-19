/**
 * SuggestionService Tests
 */

import { SuggestionService } from '../../../src/suggestion/SuggestionService';
import { PullRequestService } from '../../../src/github/PullRequestService';
import { CommentService } from '../../../src/github/CommentService';
import { BaseProvider } from '../../../src/providers/BaseProvider';

jest.mock('../../../src/github/PullRequestService');
jest.mock('../../../src/github/CommentService');

describe('SuggestionService', () => {
  let service: SuggestionService;
  let mockPrService: jest.Mocked<PullRequestService>;
  let mockCommentService: jest.Mocked<CommentService>;
  let mockAiProvider: jest.Mocked<BaseProvider>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockPrService = new PullRequestService({} as any) as jest.Mocked<PullRequestService>;
    mockCommentService = new CommentService({} as any) as jest.Mocked<CommentService>;
    
    mockAiProvider = {
      sendMessage: jest.fn().mockResolvedValue({
        content: 'Suggestions for improvement',
        finishReason: 'stop',
        usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
        model: 'gpt-5-mini',
      }),
      getModel: jest.fn().mockReturnValue('gpt-5-mini'),
      getProviderName: jest.fn().mockReturnValue('OpenAI'),
    } as any;

    mockPrService.getPullRequest.mockResolvedValue({
      number: 123,
      title: 'Test PR',
      body: 'Test description',
      state: 'open',
      headSha: 'abc123',
      headRef: 'feature',
      baseSha: 'def456',
      baseRef: 'main',
      author: 'user',
      createdAt: '2024-01-01',
      updatedAt: '2024-01-02',
      mergeable: true,
      mergeableState: 'clean',
      files: [],
      additions: 0,
      deletions: 0,
      changedFiles: 0,
    });

    mockPrService.getFiles.mockResolvedValue([]);

    service = new SuggestionService({
      prService: mockPrService,
      commentService: mockCommentService,
      aiProvider: mockAiProvider,
      prNumber: 123,
    });
  });

  describe('generateSuggestions', () => {
    it('should generate and post suggestions', async () => {
      mockCommentService.createIssueComment = jest.fn().mockResolvedValue({ id: 1, body: 'test' });

      await service.generateSuggestions();

      expect(mockPrService.getPullRequest).toHaveBeenCalledWith(123);
      expect(mockAiProvider.sendMessage).toHaveBeenCalled();
      expect(mockCommentService.createIssueComment).toHaveBeenCalled();
    });

    it('should handle AI provider errors', async () => {
      mockAiProvider.sendMessage.mockRejectedValue(new Error('AI error'));

      await expect(service.generateSuggestions()).rejects.toThrow('AI error');
    });
  });
});
