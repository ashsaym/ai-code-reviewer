/**
 * Token Counter
 * 
 * Estimates token count for GPT models using tiktoken approximation
 */

export class TokenCounter {
  /**
   * Estimate token count for text
   * Uses a simple approximation: ~4 characters per token for English text
   */
  static estimate(text: string): number {
    // Remove extra whitespace
    const normalized = text.replace(/\s+/g, ' ').trim();
    
    // Approximate: 4 characters per token
    // This is a rough estimate but works well for most cases
    return Math.ceil(normalized.length / 4);
  }

  /**
   * Estimate tokens for messages
   */
  static estimateMessages(messages: Array<{ role: string; content: string }>): number {
    let tokens = 0;
    
    for (const message of messages) {
      // Add tokens for message content
      tokens += this.estimate(message.content);
      
      // Add overhead for message formatting (role, etc.)
      tokens += 4;
    }
    
    // Add overhead for message list
    tokens += 3;
    
    return tokens;
  }

  /**
   * Estimate cost for OpenAI models
   */
  static estimateCost(
    model: string,
    promptTokens: number,
    completionTokens: number
  ): number {
    // Pricing per 1M tokens (as of 2025)
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
   * Check if text exceeds token limit
   */
  static exceedsLimit(text: string, limit: number): boolean {
    return this.estimate(text) > limit;
  }

  /**
   * Truncate text to token limit
   */
  static truncate(text: string, maxTokens: number): string {
    const tokens = this.estimate(text);
    
    if (tokens <= maxTokens) {
      return text;
    }
    
    // Approximate character limit
    const maxChars = maxTokens * 4;
    return text.substring(0, maxChars) + '... (truncated)';
  }

  /**
   * Get token statistics for text
   */
  static getStats(text: string): {
    tokens: number;
    characters: number;
    words: number;
    lines: number;
  } {
    return {
      tokens: this.estimate(text),
      characters: text.length,
      words: text.split(/\s+/).length,
      lines: text.split('\n').length,
    };
  }
}
