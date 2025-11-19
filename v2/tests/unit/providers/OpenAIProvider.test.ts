/**
 * OpenAIProvider Tests
 */

import { OpenAIProvider } from '../../../src/providers/OpenAIProvider';
import { AIMessage } from '../../../src/providers/BaseProvider';
import OpenAI from 'openai';

jest.mock('openai');

describe('OpenAIProvider', () => {
  let provider: OpenAIProvider;
  let mockCreate: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock
    const MockedOpenAI = OpenAI as jest.MockedClass<typeof OpenAI>;
    const mockInstance = new MockedOpenAI() as any;
    mockCreate = mockInstance.chat.completions.create as jest.Mock;

    provider = new OpenAIProvider({
      apiKey: 'test-key',
      model: 'gpt-5-mini',
      maxTokens: 16000,
      temperature: 0.3,
    });

    // Override the OpenAI client in the provider
    (provider as any).client = mockInstance;
  });

  describe('sendMessage', () => {
    it('should send message and return response', async () => {
      const messages: AIMessage[] = [
        { role: 'system', content: 'You are a helpful assistant' },
        { role: 'user', content: 'Hello' },
      ];

      mockCreate.mockResolvedValue({
        choices: [
          {
            message: { content: 'Hi there!' },
            finish_reason: 'stop',
          },
        ],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 5,
          total_tokens: 15,
        },
        model: 'gpt-5-mini',
      });

      const response = await provider.sendMessage(messages);

      expect(response.content).toBe('Hi there!');
      expect(response.finishReason).toBe('stop');
      expect(response.usage.totalTokens).toBe(15);
    });

    it('should handle JSON response format', async () => {
      const messages: AIMessage[] = [
        { role: 'user', content: 'Return JSON' },
      ];

      mockCreate.mockResolvedValue({
        choices: [
          {
            message: { content: '{"key": "value"}' },
            finish_reason: 'stop',
          },
        ],
        usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
        model: 'gpt-5-mini',
      });

      const response = await provider.sendMessage(messages, { responseFormat: 'json' });

      expect(response.content).toBe('{"key": "value"}');
    });

    it('should handle API errors', async () => {
      const messages: AIMessage[] = [
        { role: 'user', content: 'Hello' },
      ];

      mockCreate.mockRejectedValue(new Error('API Error'));

      await expect(provider.sendMessage(messages)).rejects.toThrow('API Error');
    });

    it('should handle rate limiting', async () => {
      const messages: AIMessage[] = [
        { role: 'user', content: 'Hello' },
      ];

      const rateLimitError = new Error('Rate limit exceeded');
      (rateLimitError as any).status = 429;
      mockCreate.mockRejectedValue(rateLimitError);

      await expect(provider.sendMessage(messages)).rejects.toThrow();
    });

    it('should handle finish reason length', async () => {
      const messages: AIMessage[] = [
        { role: 'user', content: 'Long response' },
      ];

      mockCreate.mockResolvedValue({
        choices: [
          {
            message: { content: 'Truncated...' },
            finish_reason: 'length',
          },
        ],
        usage: { prompt_tokens: 10, completion_tokens: 16000, total_tokens: 16010 },
        model: 'gpt-5-mini',
      });

      const response = await provider.sendMessage(messages);

      expect(response.finishReason).toBe('length');
    });
  });

  describe('getProviderName', () => {
    it('should return provider name', () => {
      expect(provider.getProviderName()).toBe('OpenAI');
    });
  });

  describe('getModel', () => {
    it('should return model name', () => {
      expect(provider.getModel()).toBe('gpt-5-mini');
    });
  });
});
