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
  maxCompletionTokensMode?: boolean;
  temperature?: number;
  timeout?: number;
  topP?: number;
}

export interface SendMessageOptions {
  /** Request JSON response format (requires prompt to mention 'JSON') */
  responseFormat?: 'json' | 'text';
}

export abstract class BaseProvider {
  protected readonly apiKey: string;
  protected readonly model: string;
  protected readonly maxTokens: number;
  protected readonly maxCompletionTokensMode: boolean;
  protected readonly temperature: number;
  protected readonly topP: number;

  constructor(options: AIProviderOptions) {
    this.apiKey = options.apiKey;
    this.model = options.model;
    this.maxTokens = options.maxTokens || 16000;
    this.maxCompletionTokensMode = options.maxCompletionTokensMode || false;
    this.temperature = options.temperature || 1.0;
    this.topP = options.topP || 1.0;
  }

  /**
   * Send messages to AI and get response
   */
  abstract sendMessage(messages: AIMessage[], options?: SendMessageOptions): Promise<AIResponse>;

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
