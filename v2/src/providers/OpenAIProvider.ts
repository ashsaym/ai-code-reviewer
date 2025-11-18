/**
 * OpenAI Provider
 * 
 * Default provider using OpenAI GPT models (gpt-5-mini, gpt-4o, gpt-4-turbo)
 */

import * as core from '@actions/core';
import axios from 'axios';
import { BaseProvider, AIMessage, AIResponse, AIProviderOptions } from './BaseProvider';

export interface OpenAIProviderOptions extends AIProviderOptions {
  baseURL?: string;
  organizationId?: string;
}

export class OpenAIProvider extends BaseProvider {
  private readonly baseURL: string;
  private readonly organizationId?: string;

  constructor(options: OpenAIProviderOptions) {
    super(options);
    this.baseURL = options.baseURL || 'https://api.openai.com/v1';
    this.organizationId = options.organizationId;
  }

  /**
   * Send messages to OpenAI
   */
  async sendMessage(messages: AIMessage[]): Promise<AIResponse> {
    try {
      core.debug(`Sending ${messages.length} messages to OpenAI (${this.model})`);

      // Build request body with appropriate token parameter
      const requestBody: any = {
        model: this.model,
        messages: messages.map(m => ({
          role: m.role,
          content: m.content,
        })),
        temperature: this.temperature,
        top_p: this.topP,
        response_format: { type: 'json_object' },
      };

      // Use max_completion_tokens for newer models if enabled, otherwise max_tokens
      if (this.maxCompletionTokensMode) {
        requestBody.max_completion_tokens = this.maxTokens;
      } else {
        requestBody.max_tokens = this.maxTokens;
      }

      const response = await axios.post(
        `${this.baseURL}/chat/completions`,
        requestBody,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`,
            ...(this.organizationId && { 'OpenAI-Organization': this.organizationId }),
          },
          timeout: 120000, // 2 minutes
        }
      );

      const choice = response.data.choices[0];
      const usage = response.data.usage;

      const result: AIResponse = {
        content: choice.message.content,
        finishReason: choice.finish_reason === 'stop' ? 'stop' : 
                      choice.finish_reason === 'length' ? 'length' :
                      choice.finish_reason === 'content_filter' ? 'content_filter' : 'error',
        usage: {
          promptTokens: usage.prompt_tokens,
          completionTokens: usage.completion_tokens,
          totalTokens: usage.total_tokens,
        },
        model: response.data.model,
      };

      core.info(`✅ OpenAI response: ${usage.total_tokens} tokens`);
      return result;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        const message = error.response?.data?.error?.message || error.message;
        
        core.error(`OpenAI API error (${status}): ${message}`);
        
        if (status === 401) {
          throw new Error('Invalid OpenAI API key');
        } else if (status === 429) {
          throw new Error('OpenAI rate limit exceeded');
        } else if (status === 500 || status === 503) {
          throw new Error('OpenAI service unavailable');
        }
        
        throw new Error(`OpenAI error: ${message}`);
      }
      
      throw error;
    }
  }

  /**
   * Get provider name
   */
  getProviderName(): string {
    return 'openai';
  }

  /**
   * Estimate cost for tokens
   */
  static estimateCost(model: string, promptTokens: number, completionTokens: number): number {
    // Pricing as of 2025 (per 1M tokens)
    const pricing: Record<string, { prompt: number; completion: number }> = {
      'gpt-5-mini': { prompt: 0.15, completion: 0.60 },
      'gpt-4o': { prompt: 2.50, completion: 10.00 },
      'gpt-4o-2024-11-20': { prompt: 2.50, completion: 10.00 },
      'gpt-4-turbo': { prompt: 10.00, completion: 30.00 },
      'gpt-4': { prompt: 30.00, completion: 60.00 },
    };

    const price = pricing[model] || pricing['gpt-5-mini'];
    
    const promptCost = (promptTokens / 1_000_000) * price.prompt;
    const completionCost = (completionTokens / 1_000_000) * price.completion;
    
    return promptCost + completionCost;
  }

  /**
   * Check if model is available
   */
  async checkModel(): Promise<boolean> {
    try {
      await axios.get(`${this.baseURL}/models/${this.model}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
        timeout: 10000,
      });
      return true;
    } catch (error) {
      core.warning(`Model ${this.model} not available`);
      return false;
    }
  }

  /**
   * List available models
   */
  async listModels(): Promise<string[]> {
    try {
      const response = await axios.get(`${this.baseURL}/models`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
        timeout: 10000,
      });

      return response.data.data
        .map((m: any) => m.id)
        .filter((id: string) => id.startsWith('gpt-'));
    } catch (error) {
      core.warning('Failed to list models');
      return [];
    }
  }
}
