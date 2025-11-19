/**
 * ProviderFactory Tests
 */

import { ProviderFactory } from '../../../src/providers/ProviderFactory';
import { OpenAIProvider } from '../../../src/providers/OpenAIProvider';
import { OpenWebUIProvider } from '../../../src/providers/OpenWebUIProvider';

jest.mock('../../../src/providers/OpenAIProvider');
jest.mock('../../../src/providers/OpenWebUIProvider');

describe('ProviderFactory', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create OpenAI provider', () => {
      const config = {
        type: 'openai' as const,
        apiKey: 'test-key',
        model: 'gpt-5-mini',
        maxTokens: 16000,
        temperature: 0.3,
      };

      ProviderFactory.create(config);

      expect(OpenAIProvider).toHaveBeenCalledWith({
        apiKey: 'test-key',
        model: 'gpt-5-mini',
        maxTokens: 16000,
        maxCompletionTokensMode: undefined,
        temperature: 0.3,
        topP: undefined,
        baseURL: undefined,
        organizationId: undefined,
      });
    });

    it('should create OpenWebUI provider', () => {
      const config = {
        type: 'openwebui' as const,
        apiKey: 'test-key',
        model: 'mistral-small',
        endpoint: 'http://localhost:8080',
        maxTokens: 16000,
        temperature: 0.3,
      };

      ProviderFactory.create(config);

      expect(OpenWebUIProvider).toHaveBeenCalledWith({
        apiKey: 'test-key',
        model: 'mistral-small',
        maxTokens: 16000,
        temperature: 0.3,
        topP: undefined,
        endpoint: 'http://localhost:8080',
      });
    });

    it('should throw error for OpenWebUI without endpoint', () => {
      const config = {
        type: 'openwebui' as const,
        apiKey: 'test-key',
        model: 'mistral-small',
      };

      expect(() => ProviderFactory.create(config)).toThrow('OpenWebUI endpoint is required');
    });

    it('should throw error for unsupported provider', () => {
      const config = {
        type: 'unsupported' as any,
        apiKey: 'test-key',
        model: 'some-model',
      };

      expect(() => ProviderFactory.create(config)).toThrow('Unsupported provider type');
    });

    it('should pass all optional parameters', () => {
      const config = {
        type: 'openai' as const,
        apiKey: 'test-key',
        model: 'gpt-4',
        maxTokens: 32000,
        maxCompletionTokensMode: true,
        temperature: 0.5,
        topP: 0.9,
        baseURL: 'https://custom.openai.com',
        organizationId: 'org-123',
      };

      ProviderFactory.create(config);

      expect(OpenAIProvider).toHaveBeenCalledWith({
        apiKey: 'test-key',
        model: 'gpt-4',
        maxTokens: 32000,
        maxCompletionTokensMode: true,
        temperature: 0.5,
        topP: 0.9,
        baseURL: 'https://custom.openai.com',
        organizationId: 'org-123',
      });
    });
  });

  describe('createFromEnv', () => {
    beforeEach(() => {
      delete process.env.OPENAI_API_KEY;
      delete process.env.OPENAI_TOKEN;
      delete process.env.OPENAI_MODEL;
      delete process.env.OPENWEBUI_API_KEY;
      delete process.env.OPENWEBUI_ENDPOINT;
    });

    it('should create OpenAI provider from environment', () => {
      process.env.OPENAI_API_KEY = 'env-key';
      process.env.OPENAI_MODEL = 'gpt-4';

      ProviderFactory.createFromEnv();

      expect(OpenAIProvider).toHaveBeenCalledWith(
        expect.objectContaining({
          apiKey: 'env-key',
          model: 'gpt-4',
        })
      );
    });

    it('should use default model for OpenAI', () => {
      process.env.OPENAI_API_KEY = 'env-key';

      ProviderFactory.createFromEnv();

      expect(OpenAIProvider).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gpt-5-mini',
        })
      );
    });

    it('should create OpenWebUI provider from environment', () => {
      process.env.OPENWEBUI_API_KEY = 'webui-key';
      process.env.OPENWEBUI_ENDPOINT = 'http://localhost:8080';
      process.env.OPENWEBUI_MODEL = 'mistral-large';

      ProviderFactory.createFromEnv();

      expect(OpenWebUIProvider).toHaveBeenCalled();
    });

    it('should prioritize OpenAI over OpenWebUI', () => {
      process.env.OPENAI_API_KEY = 'openai-key';
      process.env.OPENWEBUI_API_KEY = 'webui-key';
      process.env.OPENWEBUI_ENDPOINT = 'http://localhost:8080';

      ProviderFactory.createFromEnv();

      expect(OpenAIProvider).toHaveBeenCalled();
      expect(OpenWebUIProvider).not.toHaveBeenCalled();
    });
  });
});
