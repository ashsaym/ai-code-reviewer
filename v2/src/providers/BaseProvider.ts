/**
 * Base AI Provider Interface
 */

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIResponse {
  content: string;
  finishReason: 'stop' | 'length' | 'content_filter' | 'error';
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model: string;
}

export interface AIProviderOptions {
  apiKey: string;
  model: string;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
}

export abstract class BaseProvider {
  protected readonly apiKey: string;
  protected readonly model: string;
  protected readonly maxTokens: number;
  protected readonly temperature: number;
  protected readonly topP: number;

  constructor(options: AIProviderOptions) {
    this.apiKey = options.apiKey;
    this.model = options.model;
    this.maxTokens = options.maxTokens || 4000;
    this.temperature = options.temperature || 0.3;
    this.topP = options.topP || 0.95;
  }

  /**
   * Send messages to AI and get response
   */
  abstract sendMessage(messages: AIMessage[]): Promise<AIResponse>;

  /**
   * Get model name
   */
  getModel(): string {
    return this.model;
  }

  /**
   * Get provider name
   */
  abstract getProviderName(): string;
}
