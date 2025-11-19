/**
 * OpenAIProvider Tests
 */

import { OpenAIProvider } from '../../../src/providers/OpenAIProvider';
import { AIMessage } from '../../../src/providers/BaseProvider';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('OpenAIProvider', () => {
  let provider: OpenAIProvider;

  beforeEach(() => {
    jest.clearAllMocks();

    provider = new OpenAIProvider({
      apiKey: 'test-key',
      model: 'gpt-4o-mini',
      maxTokens: 16000,
      temperature: 0.3,
    });
  });

  describe('sendMessage', () => {
    it('should send message and return response', async () => {
      const messages: AIMessage[] = [
        { role: 'system', content: 'You are a helpful assistant' },
        { role: 'user', content: 'Hello' },
      ];

      mockedAxios.post.mockResolvedValue({
        data: {
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
          model: 'gpt-4o-mini',
        },
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

      mockedAxios.post.mockResolvedValue({
        data: {
          choices: [
            {
              message: { content: '{"key": "value"}' },
              finish_reason: 'stop',
            },
          ],
          usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
          model: 'gpt-4o-mini',
        },
      });

      const response = await provider.sendMessage(messages, { responseFormat: 'json' });

      expect(response.content).toBe('{"key": "value"}');
    });

    it('should handle API errors', async () => {
      const messages: AIMessage[] = [
        { role: 'user', content: 'Hello' },
      ];

      mockedAxios.post.mockRejectedValue(new Error('API Error'));

      await expect(provider.sendMessage(messages)).rejects.toThrow('API Error');
    });

    it('should handle rate limiting', async () => {
      const messages: AIMessage[] = [
        { role: 'user', content: 'Hello' },
      ];

      const rateLimitError = new Error('Rate limit exceeded');
      (rateLimitError as any).response = { status: 429 };
      mockedAxios.post.mockRejectedValue(rateLimitError);

      await expect(provider.sendMessage(messages)).rejects.toThrow();
    });

    it('should handle finish reason length', async () => {
      const messages: AIMessage[] = [
        { role: 'user', content: 'Long response' },
      ];

      mockedAxios.post.mockResolvedValue({
        data: {
          choices: [
            {
              message: { content: 'Truncated...' },
              finish_reason: 'length',
            },
          ],
          usage: { prompt_tokens: 10, completion_tokens: 16000, total_tokens: 16010 },
          model: 'gpt-4o-mini',
        },
      });

      const response = await provider.sendMessage(messages);

      expect(response.finishReason).toBe('length');
    });
  });

  describe('getProviderName', () => {
    it('should return provider name', () => {
      expect(provider.getProviderName()).toBe('openai');
    });
  });

  describe('getModel', () => {
    it('should return model name', () => {
      expect(provider.getModel()).toBe('gpt-4o-mini');
    });
  });
});
