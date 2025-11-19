/**
 * OpenWebUIProvider Tests
 */

import { OpenWebUIProvider } from '../../../src/providers/OpenWebUIProvider';
import { AIMessage } from '../../../src/providers/BaseProvider';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('OpenWebUIProvider', () => {
  let provider: OpenWebUIProvider;

  beforeEach(() => {
    jest.clearAllMocks();

    provider = new OpenWebUIProvider({
      apiKey: 'test-key',
      model: 'mistral-large',
      endpoint: 'http://localhost:8080/v1/chat/completions',
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
        },
      });

      const response = await provider.sendMessage(messages);

      expect(response.content).toBe('Hi there!');
      expect(response.finishReason).toBe('stop');
      expect(response.usage.totalTokens).toBe(15);
    });

    it('should handle missing usage data', async () => {
      const messages: AIMessage[] = [
        { role: 'user', content: 'Test' },
      ];

      mockedAxios.post.mockResolvedValue({
        data: {
          choices: [
            {
              message: { content: 'Response' },
              finish_reason: 'stop',
            },
          ],
        },
      });

      const response = await provider.sendMessage(messages);

      expect(response.content).toBe('Response');
      expect(response.usage.totalTokens).toBe(0);
    });

    it('should handle text field instead of message', async () => {
      const messages: AIMessage[] = [
        { role: 'user', content: 'Test' },
      ];

      mockedAxios.post.mockResolvedValue({
        data: {
          choices: [
            {
              text: 'Text response',
              finish_reason: 'stop',
            },
          ],
          usage: {
            prompt_tokens: 5,
            completion_tokens: 3,
            total_tokens: 8,
          },
        },
      });

      const response = await provider.sendMessage(messages);

      expect(response.content).toBe('Text response');
    });

    it('should handle API errors', async () => {
      const messages: AIMessage[] = [
        { role: 'user', content: 'Hello' },
      ];

      mockedAxios.post.mockRejectedValue(new Error('API Error'));

      await expect(provider.sendMessage(messages)).rejects.toThrow('API Error');
    });

    it('should include authorization header', async () => {
      const messages: AIMessage[] = [
        { role: 'user', content: 'Test' },
      ];

      mockedAxios.post.mockResolvedValue({
        data: {
          choices: [{ message: { content: 'ok' }, finish_reason: 'stop' }],
          usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
        },
      });

      await provider.sendMessage(messages);

      expect(mockedAxios.post).toHaveBeenCalledWith(
        'http://localhost:8080/v1/chat/completions',
        expect.objectContaining({
          model: 'mistral-large',
          messages: [{ role: 'user', content: 'Test' }],
        }),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-key',
          }),
        })
      );
    });
  });

  describe('getProviderName', () => {
    it('should return provider name', () => {
      expect(provider.getProviderName()).toBe('openwebui');
    });
  });

  describe('getModel', () => {
    it('should return model name', () => {
      expect(provider.getModel()).toBe('mistral-large');
    });
  });
});
