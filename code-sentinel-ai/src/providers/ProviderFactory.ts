/**
 * Provider Factory
 * 
 * Creates AI provider instances based on configuration
 */

import * as core from '@actions/core';
import { BaseProvider } from './BaseProvider';
import { OpenAIProvider, OpenAIProviderOptions } from './OpenAIProvider';
import { OpenWebUIProvider, OpenWebUIProviderOptions } from './OpenWebUIProvider';

export type ProviderType = 'openai' | 'openwebui';

export interface ProviderConfig {
  type: ProviderType;
  apiKey: string;
  model: string;
  maxTokens?: number;
  maxCompletionTokensMode?: boolean;
  temperature?: number;
  topP?: number;
  
  // OpenAI specific
  baseURL?: string;
  organizationId?: string;
  
  // OpenWebUI specific
  endpoint?: string;
}

export class ProviderFactory {
  /**
   * Create provider instance
   */
  static create(config: ProviderConfig): BaseProvider {
    core.info(`Creating ${config.type} provider with model ${config.model}`);

    switch (config.type) {
      case 'openai':
        return new OpenAIProvider({
          apiKey: config.apiKey,
          model: config.model,
          maxTokens: config.maxTokens,
          maxCompletionTokensMode: config.maxCompletionTokensMode,
          temperature: config.temperature,
          topP: config.topP,
          baseURL: config.baseURL,
          organizationId: config.organizationId,
        } as OpenAIProviderOptions);

      case 'openwebui':
        if (!config.endpoint) {
          throw new Error('OpenWebUI endpoint is required');
        }
        return new OpenWebUIProvider({
          apiKey: config.apiKey,
          model: config.model,
          maxTokens: config.maxTokens,
          temperature: config.temperature,
          topP: config.topP,
          endpoint: config.endpoint,
        } as OpenWebUIProviderOptions);

      default:
        throw new Error(`Unsupported provider type: ${config.type}`);
    }
  }

  /**
   * Create provider from environment variables
   */
  static createFromEnv(): BaseProvider {
    // Try OpenAI first
    const openaiKey = process.env.OPENAI_API_KEY || process.env.OPENAI_TOKEN;
    if (openaiKey) {
      const model = process.env.OPENAI_MODEL || 'gpt-5-mini';
      core.info('Using OpenAI provider');
      
      return this.create({
        type: 'openai',
        apiKey: openaiKey,
        model,
        maxTokens: parseInt(process.env.MAX_TOKENS || '16000', 10),
        temperature: parseFloat(process.env.TEMPERATURE || '0.3'),
        baseURL: process.env.OPENAI_BASE_URL,
        organizationId: process.env.OPENAI_ORG_ID,
      });
    }

    // Try OpenWebUI
    const openwebuiKey = process.env.OPENWEBUI_API_KEY || process.env.OPENWEBUI_TOKEN;
    const openwebuiEndpoint = process.env.OPENWEBUI_ENDPOINT;
    
    if (openwebuiKey && openwebuiEndpoint) {
      const model = process.env.OPENWEBUI_MODEL || 'mistral-small';
      core.info('Using OpenWebUI provider');
      
      return this.create({
        type: 'openwebui',
        apiKey: openwebuiKey,
        model,
        endpoint: openwebuiEndpoint,
        maxTokens: parseInt(process.env.MAX_TOKENS || '16000', 10),
        temperature: parseFloat(process.env.TEMPERATURE || '0.3'),
      });
    }

    throw new Error('No provider configuration found. Set OPENAI_API_KEY or OPENWEBUI_API_KEY + OPENWEBUI_ENDPOINT');
  }

  /**
   * Validate provider configuration
   */
  static validate(config: ProviderConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!config.apiKey) {
      errors.push('API key is required');
    }

    if (!config.model) {
      errors.push('Model name is required');
    }

    if (config.type === 'openwebui' && !config.endpoint) {
      errors.push('Endpoint is required for OpenWebUI');
    }

    if (config.maxTokens && config.maxTokens < 1) {
      errors.push('Max tokens must be positive');
    }

    if (config.temperature !== undefined && (config.temperature < 0 || config.temperature > 2)) {
      errors.push('Temperature must be between 0 and 2');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
