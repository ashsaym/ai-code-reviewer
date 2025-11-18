/**
 * Retry utility
 * 
 * Exponential backoff retry logic with configurable options
 */

import * as core from '@actions/core';

export interface RetryOptions {
  maxAttempts?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
  retryableErrors?: RegExp[];
}

export class Retry {
  /**
   * Execute function with retry logic
   */
  static async execute<T>(
    fn: () => Promise<T>,
    options: RetryOptions = {}
  ): Promise<T> {
    const maxAttempts = options.maxAttempts || 3;
    const initialDelay = options.initialDelayMs || 1000;
    const maxDelay = options.maxDelayMs || 10000;
    const backoffMultiplier = options.backoffMultiplier || 2;
    const retryableErrors = options.retryableErrors || [];

    let lastError: Error | undefined;
    let delay = initialDelay;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Check if error is retryable
        const isRetryable = retryableErrors.length === 0 ||
          retryableErrors.some(pattern => pattern.test(lastError!.message));

        if (!isRetryable || attempt === maxAttempts) {
          throw lastError;
        }

        core.warning(
          `Attempt ${attempt}/${maxAttempts} failed: ${lastError.message}. Retrying in ${delay}ms...`
        );

        await this.sleep(delay);
        delay = Math.min(delay * backoffMultiplier, maxDelay);
      }
    }

    throw lastError || new Error('Retry failed');
  }

  /**
   * Sleep for specified milliseconds
   */
  private static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Retry with exponential backoff
   */
  static async withBackoff<T>(
    fn: () => Promise<T>,
    maxAttempts: number = 3
  ): Promise<T> {
    return this.execute(fn, { maxAttempts });
  }

  /**
   * Retry for rate limit errors
   */
  static async forRateLimit<T>(
    fn: () => Promise<T>
  ): Promise<T> {
    return this.execute(fn, {
      maxAttempts: 5,
      initialDelayMs: 2000,
      maxDelayMs: 30000,
      retryableErrors: [/rate limit/i, /429/],
    });
  }

  /**
   * Retry for network errors
   */
  static async forNetwork<T>(
    fn: () => Promise<T>
  ): Promise<T> {
    return this.execute(fn, {
      maxAttempts: 3,
      initialDelayMs: 1000,
      maxDelayMs: 5000,
      retryableErrors: [/network/i, /timeout/i, /ECONNRESET/i],
    });
  }
}
