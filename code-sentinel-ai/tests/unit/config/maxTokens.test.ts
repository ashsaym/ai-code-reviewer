/**
 * Tests for maxTokens configuration flow
 */

import { ConfigLoader } from '../../../src/config/ConfigLoader';
import { ProviderFactory } from '../../../src/providers/ProviderFactory';
import * as core from '@actions/core';

// Mock @actions/core
jest.mock('@actions/core');
const mockCore = core as jest.Mocked<typeof core>;

describe('MaxTokens Configuration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Set required environment variables
    process.env.GITHUB_REPOSITORY = 'owner/repo';
    process.env.GITHUB_EVENT_PATH = __dirname + '/../../fixtures/pull_request.json';
  });

  afterEach(() => {
    delete process.env.GITHUB_REPOSITORY;
    delete process.env.GITHUB_EVENT_PATH;
  });

  describe('ConfigLoader', () => {
    it('should load maxTokens from input', () => {
      const inputMap: Record<string, string> = {
        'github-token': 'test-token',
        'provider': 'openai',
        'model': 'gpt-5-mini',
        'max-tokens': '128000',
        'api-key': 'test-key',
        'github-host': 'github.com',
      };
      
      mockCore.getInput.mockImplementation((name: string) => inputMap[name] || '');
      mockCore.getBooleanInput.mockReturnValue(false);

      const config = ConfigLoader.load();

      expect(config.maxTokens).toBe(128000);
      expect(config.model).toBe('gpt-5-mini');
    });

    it('should use default maxTokens when not provided', () => {
      const inputMap: Record<string, string> = {
        'github-token': 'test-token',
        'provider': 'openai',
        'model': 'gpt-5-mini',
        'api-key': 'test-key',
        'github-host': 'github.com',
      };
      
      mockCore.getInput.mockImplementation((name: string) => inputMap[name] || '');
      mockCore.getBooleanInput.mockReturnValue(false);

      const config = ConfigLoader.load();

      expect(config.maxTokens).toBe(16000); // default
    });

    it('should parse maxTokens as integer', () => {
      const inputMap: Record<string, string> = {
        'github-token': 'test-token',
        'provider': 'openai',
        'model': 'gpt-5-mini',
        'max-tokens': '64000',
        'api-key': 'test-key',
        'github-host': 'github.com',
      };
      
      mockCore.getInput.mockImplementation((name: string) => inputMap[name] || '');
      mockCore.getBooleanInput.mockReturnValue(false);

      const config = ConfigLoader.load();

      expect(config.maxTokens).toBe(64000);
      expect(typeof config.maxTokens).toBe('number');
    });
  });

  describe('ProviderFactory', () => {
    it('should pass maxTokens to OpenAI provider', () => {
      const provider = ProviderFactory.create({
        type: 'openai',
        apiKey: 'test-key',
        model: 'gpt-5-mini',
        maxTokens: 128000,
      });

      expect(provider.getMaxTokens()).toBe(128000);
    });

    it('should pass maxTokens to OpenWebUI provider', () => {
      const provider = ProviderFactory.create({
        type: 'openwebui',
        apiKey: 'test-key',
        model: 'mistral-large',
        maxTokens: 32000,
        endpoint: 'http://localhost:8080',
      });

      expect(provider.getMaxTokens()).toBe(32000);
    });

    it('should use default maxTokens when not specified', () => {
      const provider = ProviderFactory.create({
        type: 'openai',
        apiKey: 'test-key',
        model: 'gpt-5-mini',
      });

      // Default is 16000 in BaseProvider
      expect(provider.getMaxTokens()).toBe(16000);
    });
  });
});
