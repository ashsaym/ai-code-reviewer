/**
 * DescriptionService Tests
 */

import { DescriptionService } from '../../../src/description/DescriptionService';
import { PullRequestService } from '../../../src/github/PullRequestService';
import { BaseProvider } from '../../../src/providers/BaseProvider';

jest.mock('../../../src/github/PullRequestService');

describe('DescriptionService', () => {
  let service: DescriptionService;
  let mockPrService: jest.Mocked<PullRequestService>;
  let mockAiProvider: jest.Mocked<BaseProvider>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockPrService = new PullRequestService({} as any) as jest.Mocked<PullRequestService>;
    
    mockAiProvider = {
      sendMessage: jest.fn().mockResolvedValue({
        content: 'Generated PR description',
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
      body: '',
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
    mockPrService.getCommits = jest.fn().mockResolvedValue([
      { sha: 'abc123', message: 'Test commit', author: 'user', date: '2024-01-01' }
    ]);
    mockPrService.updatePullRequest.mockResolvedValue(undefined);

    service = new DescriptionService({
      prService: mockPrService,
      aiProvider: mockAiProvider,
      prNumber: 123,
    });
  });

  describe('generateDescription', () => {
    it('should generate and update PR description', async () => {
      await service.generateDescription();

      expect(mockPrService.getPullRequest).toHaveBeenCalledWith(123);
      expect(mockAiProvider.sendMessage).toHaveBeenCalled();
      expect(mockPrService.updatePullRequest).toHaveBeenCalled();
    });

    it('should handle AI provider errors', async () => {
      mockAiProvider.sendMessage.mockRejectedValue(new Error('AI error'));

      await expect(service.generateDescription()).rejects.toThrow('AI error');
    });

    it('should handle GitHub API errors', async () => {
      mockPrService.updatePullRequest.mockRejectedValue(new Error('GitHub error'));

      await expect(service.generateDescription()).rejects.toThrow('GitHub error');
    });
  });
});
