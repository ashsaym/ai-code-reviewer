/**
 * OpenWebUI Provider
 * 
 * Self-hosted provider for OpenWebUI and compatible APIs
 */

import * as core from '@actions/core';
import axios from 'axios';
import { BaseProvider, AIMessage, AIResponse, AIProviderOptions, SendMessageOptions } from './BaseProvider';

export interface OpenWebUIProviderOptions extends AIProviderOptions {
  endpoint: string;
}

export class OpenWebUIProvider extends BaseProvider {
  private readonly endpoint: string;

  constructor(options: OpenWebUIProviderOptions) {
    super(options);
    // Ensure endpoint has the correct path
    let endpoint = options.endpoint.replace(/\/$/, ''); // Remove trailing slash
    if (!endpoint.endsWith('/chat/completions')) {
      // Add the chat completions path (no /v1 prefix for self-hosted flexibility)
      endpoint = `${endpoint}/chat/completions`;
    }
    this.endpoint = endpoint;
  }

  /**
   * Send messages to OpenWebUI
   */
  async sendMessage(messages: AIMessage[], _options?: SendMessageOptions): Promise<AIResponse> {
    try {
      core.debug(`Sending ${messages.length} messages to OpenWebUI (${this.model})`);
      core.debug(`OpenWebUI endpoint: ${this.endpoint}`);

      const response = await axios.post(
        this.endpoint,
        {
          model: this.model,
          messages: messages.map(m => ({
            role: m.role,
            content: m.content,
          })),
          max_tokens: this.maxTokens,
          temperature: this.temperature,
          top_p: this.topP,
          stream: false,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`,
          },
          timeout: 180000, // 3 minutes for self-hosted
        }
      );

      // Handle both OpenAI-compatible and OpenWebUI response formats
      const data = response.data;
      const choice = data.choices?.[0];
      
      if (!choice) {
        throw new Error('No response choices returned from OpenWebUI');
      }

      const usage = data.usage || {
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0,
      };

      // Extract content from various possible formats
      const content = choice.message?.content || choice.text || choice.delta?.content || '';

      const result: AIResponse = {
        content,
        finishReason: choice.finish_reason === 'stop' ? 'stop' : 
                      choice.finish_reason === 'length' ? 'length' : 'stop',
        usage: {
          promptTokens: usage.prompt_tokens || 0,
          completionTokens: usage.completion_tokens || 0,
          totalTokens: usage.total_tokens || 0,
        },
        model: data.model || this.model,
      };

      core.info(`✅ OpenWebUI response: ${usage.total_tokens} tokens`);
      return result;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        const message = error.response?.data?.error?.message || error.message;
        
        core.error(`OpenWebUI API error (${status}): ${message}`);
        
        if (status === 401) {
          throw new Error('Invalid OpenWebUI API key');
        } else if (status === 404) {
          throw new Error(`OpenWebUI model not found: ${this.model}`);
        } else if (status === 500 || status === 503) {
          throw new Error('OpenWebUI service unavailable');
        }
        
        throw new Error(`OpenWebUI error: ${message}`);
      }
      
      throw error;
    }
  }

  /**
   * Get provider name
   */
  getProviderName(): string {
    return 'openwebui';
  }

  /**
   * Test connection to OpenWebUI
   */
  async testConnection(): Promise<boolean> {
    try {
      // Try a simple request
      await axios.get(this.endpoint.replace(/\/chat\/completions$/, '/models'), {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
        timeout: 10000,
      });
      return true;
    } catch (error) {
      core.warning('Failed to connect to OpenWebUI');
      return false;
    }
  }
}
