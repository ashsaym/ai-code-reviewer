/**
 * ActionOrchestrator Tests
 * 
 * Comprehensive test suite for the main orchestrator
 */

import * as core from '@actions/core';
import { ActionOrchestrator } from '../../../src/core/ActionOrchestrator';
import { ConfigLoader } from '../../../src/config/ConfigLoader';
import { GitHubClient } from '../../../src/github/GitHubClient';
import { ProviderFactory } from '../../../src/providers/ProviderFactory';
import { ReviewEngine } from '../../../src/core/ReviewEngine';
import { SummaryService } from '../../../src/summary/SummaryService';
import { SuggestionService } from '../../../src/suggestion/SuggestionService';
import { DescriptionService } from '../../../src/description/DescriptionService';
import { readFileSync } from 'fs';

// Mock all dependencies
jest.mock('@actions/core');
jest.mock('../../../src/config/ConfigLoader');
jest.mock('../../../src/storage/StorageManager');
jest.mock('../../../src/github/GitHubClient');
jest.mock('../../../src/providers/ProviderFactory');
jest.mock('../../../src/core/ReviewEngine');
jest.mock('../../../src/summary/SummaryService');
jest.mock('../../../src/suggestion/SuggestionService');
jest.mock('../../../src/description/DescriptionService');
jest.mock('fs');

describe('ActionOrchestrator', () => {
  const mockCore = core as jest.Mocked<typeof core>;
  const mockConfigLoader = ConfigLoader as jest.Mocked<typeof ConfigLoader>;
  const mockProviderFactory = ProviderFactory as jest.Mocked<typeof ProviderFactory>;
  const mockReadFileSync = readFileSync as jest.MockedFunction<typeof readFileSync>;

  let mockConfig: any;
  let mockOctokit: any;
  let mockAiProvider: any;
  let mockReviewEngine: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default config
    mockConfig = {
      token: 'test-token',
      repository: 'owner/repo',
      prNumber: 123,
      provider: 'openai',
      model: 'gpt-5-mini',
      apiKey: 'test-api-key',
      apiEndpoint: undefined,
      maxCompletionTokensMode: false,
      includePatterns: ['**/*.ts'],
      excludePatterns: ['**/node_modules/**'],
      maxFilesPerBatch: 10,
      maxLinesPerFile: 500,
      autoCleanOutdated: true,
      incrementalMode: true,
      enableCheckRuns: true,
      checkName: 'Code Sentinel AI Review',
      cacheEnabled: true,
      cacheTtlDays: 7,
      debugMode: false,
    };

    // Setup mocks
    mockConfigLoader.load.mockReturnValue(mockConfig);
    mockConfigLoader.validate.mockReturnValue({ valid: true, errors: [] });

    mockOctokit = { rest: {}, graphql: jest.fn() };
    
    const mockGitHubClient = {
      getOctokit: jest.fn().mockReturnValue(mockOctokit),
    };
    (GitHubClient as jest.MockedClass<typeof GitHubClient>).mockImplementation(() => mockGitHubClient as any);

    mockAiProvider = {
      getProviderName: jest.fn().mockReturnValue('OpenAI'),
      getModel: jest.fn().mockReturnValue('gpt-5-mini'),
      sendMessage: jest.fn(),
    };
    mockProviderFactory.create.mockReturnValue(mockAiProvider);

    mockReviewEngine = {
      executeReview: jest.fn().mockResolvedValue({
        success: true,
        filesReviewed: 5,
        commentsCreated: 10,
        outdatedCleaned: 2,
        tokensUsed: { prompt: 1000, completion: 500, total: 1500 },
        cost: 0.05,
        errors: [],
      }),
    };
    (ReviewEngine as jest.MockedClass<typeof ReviewEngine>).mockImplementation(() => mockReviewEngine);

    // Setup environment
    process.env.GITHUB_EVENT_PATH = '/tmp/event.json';
    process.env.GITHUB_REPOSITORY = 'owner/repo';
    process.env.GITHUB_TOKEN = 'test-token';

    mockCore.getInput.mockImplementation((name: string) => {
      const inputs: Record<string, string> = {
        'github-token': 'test-token',
        'api-key': 'test-api-key',
        'mode': 'review',
        'provider': 'openai',
        'model': 'gpt-5-mini',
      };
      return inputs[name] || '';
    });

    mockCore.getBooleanInput.mockImplementation((name: string) => {
      const inputs: Record<string, boolean> = {
        'max-completion-tokens-mode': false,
      };
      return inputs[name] || false;
    });
  });

  afterEach(() => {
    delete process.env.GITHUB_EVENT_PATH;
    delete process.env.GITHUB_REPOSITORY;
    delete process.env.GITHUB_TOKEN;
  });

  describe('execute - review mode', () => {
    it('should successfully execute review with valid configuration', async () => {
      const mockEvent = {
        pull_request: { number: 123 },
      };
      mockReadFileSync.mockReturnValue(JSON.stringify(mockEvent));

      await ActionOrchestrator.execute();

      expect(mockConfigLoader.load).toHaveBeenCalled();
      expect(mockConfigLoader.validate).toHaveBeenCalledWith(mockConfig);
      expect(mockProviderFactory.create).toHaveBeenCalled();
      expect(mockReviewEngine.executeReview).toHaveBeenCalledWith('owner', 'repo', 123);
      expect(mockCore.setOutput).toHaveBeenCalledWith('files-reviewed', 5);
      expect(mockCore.setOutput).toHaveBeenCalledWith('comments-created', 10);
      expect(mockCore.setOutput).toHaveBeenCalledWith('success', true);
      expect(mockCore.info).toHaveBeenCalledWith('✅ Review completed successfully');
    });

    it('should handle invalid configuration', async () => {
      mockConfigLoader.validate.mockReturnValue({
        valid: false,
        errors: ['GitHub token is required', 'API key is required'],
      });

      const mockEvent = { pull_request: { number: 123 } };
      mockReadFileSync.mockReturnValue(JSON.stringify(mockEvent));

      await ActionOrchestrator.execute();

      expect(mockCore.setFailed).toHaveBeenCalledWith(
        'Invalid configuration: GitHub token is required, API key is required'
      );
    });

    it('should handle invalid repository format', async () => {
      mockConfig.repository = 'invalid-format';

      const mockEvent = { pull_request: { number: 123 } };
      mockReadFileSync.mockReturnValue(JSON.stringify(mockEvent));

      await ActionOrchestrator.execute();

      expect(mockCore.setFailed).toHaveBeenCalledWith('Invalid repository format: invalid-format');
    });

    it('should print debug info when debugMode is enabled', async () => {
      mockConfig.debugMode = true;
      mockConfigLoader.print = jest.fn();

      const mockEvent = { pull_request: { number: 123 } };
      mockReadFileSync.mockReturnValue(JSON.stringify(mockEvent));

      await ActionOrchestrator.execute();

      expect(mockConfigLoader.print).toHaveBeenCalledWith(mockConfig);
    });

    it('should handle review errors gracefully', async () => {
      mockReviewEngine.executeReview.mockResolvedValue({
        success: false,
        filesReviewed: 3,
        commentsCreated: 5,
        outdatedCleaned: 1,
        tokensUsed: { prompt: 500, completion: 250, total: 750 },
        cost: 0.02,
        errors: ['Failed to parse file.ts', 'API rate limit exceeded'],
      });

      const mockEvent = { pull_request: { number: 123 } };
      mockReadFileSync.mockReturnValue(JSON.stringify(mockEvent));

      await ActionOrchestrator.execute();

      expect(mockCore.warning).toHaveBeenCalledWith('⚠️ 2 errors occurred:');
      expect(mockCore.warning).toHaveBeenCalledWith('  - Failed to parse file.ts');
      expect(mockCore.warning).toHaveBeenCalledWith('  - API rate limit exceeded');
      expect(mockCore.setFailed).toHaveBeenCalledWith('Review completed with errors');
    });

    it('should handle exceptions during execution', async () => {
      mockReviewEngine.executeReview.mockRejectedValue(new Error('Network timeout'));

      const mockEvent = { pull_request: { number: 123 } };
      mockReadFileSync.mockReturnValue(JSON.stringify(mockEvent));

      await ActionOrchestrator.execute();

      expect(mockCore.error).toHaveBeenCalledWith('❌ Action failed: Network timeout');
      expect(mockCore.setFailed).toHaveBeenCalledWith('Network timeout');
    });
  });

  describe('execute - summary mode', () => {
    beforeEach(() => {
      mockCore.getInput.mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          'github-token': 'test-token',
          'api-key': 'test-api-key',
          'mode': 'summary',
          'provider': 'openai',
          'model': 'gpt-5-mini',
        };
        return inputs[name] || '';
      });
    });

    it('should execute summary generation successfully', async () => {
      const mockEvent = {
        issue: { number: 123 },
        action: 'created',
        comment: { body: '/summary' },
      };
      mockReadFileSync.mockReturnValue(JSON.stringify(mockEvent));

      const mockSummaryService = {
        generateSummary: jest.fn().mockResolvedValue(undefined),
      };
      (SummaryService as jest.MockedClass<typeof SummaryService>).mockImplementation(
        () => mockSummaryService as any
      );

      await ActionOrchestrator.execute();

      expect(mockCore.info).toHaveBeenCalledWith(expect.stringContaining('Generating summary for PR #123'));
      expect(mockSummaryService.generateSummary).toHaveBeenCalled();
      expect(mockCore.setOutput).toHaveBeenCalledWith('success', true);
    });

    it('should handle missing PR number in summary mode', async () => {
      const mockEvent = { action: 'created' };
      mockReadFileSync.mockReturnValue(JSON.stringify(mockEvent));

      await ActionOrchestrator.execute();

      expect(mockCore.setFailed).toHaveBeenCalledWith('Could not determine PR number from event');
    });

    it('should handle missing API key in summary mode', async () => {
      mockCore.getInput.mockImplementation((name: string) => {
        if (name === 'api-key') return '';
        if (name === 'github-token') return 'test-token';
        if (name === 'mode') return 'summary';
        return '';
      });

      const mockEvent = { issue: { number: 123 } };
      mockReadFileSync.mockReturnValue(JSON.stringify(mockEvent));

      await ActionOrchestrator.execute();

      expect(mockCore.setFailed).toHaveBeenCalledWith('api-key is required for summary generation');
    });
  });

  describe('execute - suggestion mode', () => {
    beforeEach(() => {
      mockCore.getInput.mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          'github-token': 'test-token',
          'api-key': 'test-api-key',
          'mode': 'suggestion',
          'provider': 'openai',
          'model': 'gpt-5-mini',
        };
        return inputs[name] || '';
      });
    });

    it('should execute suggestion generation successfully', async () => {
      const mockEvent = {
        pull_request: { number: 456 },
        action: 'created',
        comment: { body: '/suggestion' },
      };
      mockReadFileSync.mockReturnValue(JSON.stringify(mockEvent));

      const mockSuggestionService = {
        generateSuggestions: jest.fn().mockResolvedValue(undefined),
      };
      (SuggestionService as jest.MockedClass<typeof SuggestionService>).mockImplementation(
        () => mockSuggestionService as any
      );

      await ActionOrchestrator.execute();

      expect(mockCore.info).toHaveBeenCalledWith(expect.stringContaining('Generating suggestions for PR #456'));
      expect(mockSuggestionService.generateSuggestions).toHaveBeenCalled();
      expect(mockCore.setOutput).toHaveBeenCalledWith('success', true);
    });

    it('should handle both singular and plural suggestion commands', async () => {
      const mockEvents = [
        { issue: { number: 123 }, action: 'created', comment: { body: '/suggestion' } },
        { issue: { number: 123 }, action: 'created', comment: { body: '/suggestions' } },
      ];

      for (const mockEvent of mockEvents) {
        jest.clearAllMocks();
        mockReadFileSync.mockReturnValue(JSON.stringify(mockEvent));

        const mockSuggestionService = {
          generateSuggestions: jest.fn().mockResolvedValue(undefined),
        };
        (SuggestionService as jest.MockedClass<typeof SuggestionService>).mockImplementation(
          () => mockSuggestionService as any
        );

        await ActionOrchestrator.execute();

        expect(mockSuggestionService.generateSuggestions).toHaveBeenCalled();
      }
    });
  });

  describe('execute - description mode', () => {
    beforeEach(() => {
      mockCore.getInput.mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          'github-token': 'test-token',
          'api-key': 'test-api-key',
          'mode': 'description',
          'provider': 'openai',
          'model': 'gpt-5-mini',
        };
        return inputs[name] || '';
      });
    });

    it('should execute description generation successfully', async () => {
      const mockEvent = {
        pull_request: { number: 789 },
        action: 'created',
        comment: { body: '/description' },
      };
      mockReadFileSync.mockReturnValue(JSON.stringify(mockEvent));

      const mockDescriptionService = {
        generateDescription: jest.fn().mockResolvedValue(undefined),
      };
      (DescriptionService as jest.MockedClass<typeof DescriptionService>).mockImplementation(
        () => mockDescriptionService as any
      );

      await ActionOrchestrator.execute();

      expect(mockCore.info).toHaveBeenCalledWith(expect.stringContaining('Generating description for PR #789'));
      expect(mockDescriptionService.generateDescription).toHaveBeenCalled();
      expect(mockCore.setOutput).toHaveBeenCalledWith('success', true);
    });
  });

  describe('getCommentCommand', () => {
    it('should detect /review command', async () => {
      const mockEvent = {
        action: 'created',
        comment: { body: '/review' },
        issue: { number: 123 },
      };
      mockReadFileSync.mockReturnValue(JSON.stringify(mockEvent));

      await ActionOrchestrator.execute();

      // Should trigger review mode
      expect(mockReviewEngine.executeReview).toHaveBeenCalled();
    });

    it('should detect /summary command with arguments', async () => {
      const mockEvent = {
        action: 'created',
        comment: { body: '/summary detailed' },
        issue: { number: 123 },
      };
      mockReadFileSync.mockReturnValue(JSON.stringify(mockEvent));
      mockCore.getInput.mockImplementation((name: string) => {
        if (name === 'github-token') return 'test-token';
        if (name === 'api-key') return 'test-api-key';
        if (name === 'provider') return 'openai';
        return '';
      });

      const mockSummaryService = {
        generateSummary: jest.fn().mockResolvedValue(undefined),
      };
      (SummaryService as jest.MockedClass<typeof SummaryService>).mockImplementation(
        () => mockSummaryService as any
      );

      await ActionOrchestrator.execute();

      expect(mockSummaryService.generateSummary).toHaveBeenCalled();
    });

    it('should ignore non-comment events', async () => {
      const mockEvent = {
        action: 'opened',
        pull_request: { number: 123 },
      };
      mockReadFileSync.mockReturnValue(JSON.stringify(mockEvent));
      mockCore.getInput.mockReturnValue('review');

      await ActionOrchestrator.execute();

      // Should default to review mode from input
      expect(mockReviewEngine.executeReview).toHaveBeenCalled();
    });

    it('should handle case-insensitive commands', async () => {
      const mockEvent = {
        action: 'created',
        comment: { body: '/SUMMARY' },
        issue: { number: 123 },
      };
      mockReadFileSync.mockReturnValue(JSON.stringify(mockEvent));

      const mockSummaryService = {
        generateSummary: jest.fn().mockResolvedValue(undefined),
      };
      (SummaryService as jest.MockedClass<typeof SummaryService>).mockImplementation(
        () => mockSummaryService as any
      );

      await ActionOrchestrator.execute();

      expect(mockSummaryService.generateSummary).toHaveBeenCalled();
    });

    it('should handle missing event path gracefully', async () => {
      delete process.env.GITHUB_EVENT_PATH;
      mockCore.getInput.mockReturnValue('review');
      
      // Mock ConfigLoader to return invalid config when event path is missing
      mockConfigLoader.load.mockReturnValue({ ...mockConfig, prNumber: 0 });
      mockConfigLoader.validate.mockReturnValue({
        valid: false,
        errors: ['Valid PR number is required'],
      });

      await ActionOrchestrator.execute();

      expect(mockCore.setFailed).toHaveBeenCalledWith('Invalid configuration: Valid PR number is required');
    });

    it('should handle malformed event JSON', async () => {
      mockReadFileSync.mockImplementation(() => {
        throw new Error('Invalid JSON');
      });
      mockCore.getInput.mockReturnValue('review');
      
      // Mock ConfigLoader to return invalid config when JSON is malformed
      mockConfigLoader.load.mockReturnValue({ ...mockConfig, prNumber: 0 });
      mockConfigLoader.validate.mockReturnValue({
        valid: false,
        errors: ['Valid PR number is required'],
      });

      await ActionOrchestrator.execute();

      // Should fall through and fail on invalid config
      expect(mockCore.setFailed).toHaveBeenCalled();
    });
  });

  describe('environment variable handling', () => {
    it('should handle missing GITHUB_TOKEN', async () => {
      delete process.env.GITHUB_TOKEN;
      
      const mockEvent = { pull_request: { number: 123 } };
      mockReadFileSync.mockReturnValue(JSON.stringify(mockEvent));
      
      // Mock ConfigLoader.load to throw error about missing token
      mockConfigLoader.load.mockImplementation(() => {
        throw new Error("Input 'github-token' is required");
      });

      await ActionOrchestrator.execute();

      expect(mockCore.setFailed).toHaveBeenCalled();
    });

    it('should handle missing GITHUB_REPOSITORY', async () => {
      delete process.env.GITHUB_REPOSITORY;
      mockConfig.repository = '';

      const mockEvent = { pull_request: { number: 123 } };
      mockReadFileSync.mockReturnValue(JSON.stringify(mockEvent));

      await ActionOrchestrator.execute();

      expect(mockCore.setFailed).toHaveBeenCalled();
    });
  });

  describe('output setting', () => {
    it('should set all expected outputs on success', async () => {
      const mockEvent = { pull_request: { number: 123 } };
      mockReadFileSync.mockReturnValue(JSON.stringify(mockEvent));

      await ActionOrchestrator.execute();

      expect(mockCore.setOutput).toHaveBeenCalledWith('files-reviewed', 5);
      expect(mockCore.setOutput).toHaveBeenCalledWith('comments-created', 10);
      expect(mockCore.setOutput).toHaveBeenCalledWith('outdated-cleaned', 2);
      expect(mockCore.setOutput).toHaveBeenCalledWith('tokens-used', 1500);
      expect(mockCore.setOutput).toHaveBeenCalledWith('estimated-cost', 0.05);
      expect(mockCore.setOutput).toHaveBeenCalledWith('success', true);
    });

    it('should set success false on review failure', async () => {
      mockReviewEngine.executeReview.mockResolvedValue({
        success: false,
        filesReviewed: 0,
        commentsCreated: 0,
        outdatedCleaned: 0,
        tokensUsed: { prompt: 0, completion: 0, total: 0 },
        cost: 0,
        errors: ['Something went wrong'],
      });

      const mockEvent = { pull_request: { number: 123 } };
      mockReadFileSync.mockReturnValue(JSON.stringify(mockEvent));

      await ActionOrchestrator.execute();

      expect(mockCore.setOutput).toHaveBeenCalledWith('success', false);
      expect(mockCore.setFailed).toHaveBeenCalled();
    });
  });
});
