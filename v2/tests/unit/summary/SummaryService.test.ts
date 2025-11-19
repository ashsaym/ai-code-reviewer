/**
 * SummaryService Tests
 */

import { SummaryService } from '../../../src/summary/SummaryService';
import { PullRequestService } from '../../../src/github/PullRequestService';
import { CommentService } from '../../../src/github/CommentService';
import { BaseProvider } from '../../../src/providers/BaseProvider';

jest.mock('../../../src/github/PullRequestService');
jest.mock('../../../src/github/CommentService');

describe('SummaryService', () => {
  let service: SummaryService;
  let mockPrService: jest.Mocked<PullRequestService>;
  let mockCommentService: jest.Mocked<CommentService>;
  let mockAiProvider: jest.Mocked<BaseProvider>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockPrService = new PullRequestService({} as any) as jest.Mocked<PullRequestService>;
    mockCommentService = new CommentService({} as any) as jest.Mocked<CommentService>;
    
    mockAiProvider = {
      sendMessage: jest.fn().mockResolvedValue({
        content: 'Summary of changes',
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
    mockPrService.getCommits.mockResolvedValue([
      { sha: 'commit1', author: 'user1', message: 'feat: add feature', date: '2024-01-01' },
      { sha: 'commit2', author: 'user2', message: 'fix: bug fix', date: '2024-01-02' },
    ]);
    mockPrService.getCommitFiles.mockResolvedValue([]);

    service = new SummaryService({
      prService: mockPrService,
      commentService: mockCommentService,
      aiProvider: mockAiProvider,
      prNumber: 123,
    });
  });

  describe('generateSummary', () => {
    it('should generate and post summary', async () => {
      mockCommentService.createIssueComment = jest.fn().mockResolvedValue({ id: 1, body: 'test' });

      await service.generateSummary();

      expect(mockPrService.getPullRequest).toHaveBeenCalledWith(123);
      expect(mockAiProvider.sendMessage).toHaveBeenCalled();
      expect(mockCommentService.createIssueComment).toHaveBeenCalled();
    });

    it('should handle AI provider errors', async () => {
      mockAiProvider.sendMessage.mockRejectedValue(new Error('AI error'));

      await expect(service.generateSummary()).rejects.toThrow('AI error');
    });

    it('should handle GitHub API errors', async () => {
      mockPrService.getPullRequest.mockRejectedValue(new Error('GitHub error'));

      await expect(service.generateSummary()).rejects.toThrow('GitHub error');
    });
  });
});
