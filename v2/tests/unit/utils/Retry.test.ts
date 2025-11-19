/**
 * Retry Tests
 */

import { Retry } from '../../../src/utils/Retry';

describe('Retry', () => {
  describe('execute', () => {
    it('should execute function successfully on first try', async () => {
      const fn = jest.fn().mockResolvedValue('success');

      const result = await Retry.execute(fn, { maxAttempts: 3, initialDelayMs: 1 });

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure and eventually succeed', async () => {
      const fn = jest
        .fn()
        .mockRejectedValueOnce(new Error('fail 1'))
        .mockRejectedValueOnce(new Error('fail 2'))
        .mockResolvedValue('success');

      const result = await Retry.execute(fn, { maxAttempts: 3, initialDelayMs: 1 });

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('should throw error after max attempts', async () => {
      const fn = jest.fn().mockRejectedValue(new Error('permanent failure'));

      await expect(
        Retry.execute(fn, { maxAttempts: 3, initialDelayMs: 1 })
      ).rejects.toThrow('permanent failure');
      
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('should use exponential backoff', async () => {
      const fn = jest
        .fn()
        .mockRejectedValueOnce(new Error('fail 1'))
        .mockRejectedValueOnce(new Error('fail 2'))
        .mockResolvedValue('success');

      await Retry.execute(fn, {
        maxAttempts: 3,
        initialDelayMs: 1,
        maxDelayMs: 100,
        backoffMultiplier: 2,
      });

      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('should only retry on retryable errors', async () => {
      const fn = jest.fn().mockRejectedValue(new Error('Rate limit exceeded'));

      await expect(
        Retry.execute(fn, {
          maxAttempts: 3,
          initialDelayMs: 1,
          retryableErrors: [/rate limit/i],
        })
      ).rejects.toThrow('Rate limit exceeded');
      
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('should not retry on non-retryable errors', async () => {
      const fn = jest.fn().mockRejectedValue(new Error('Auth failed'));

      await expect(
        Retry.execute(fn, {
          maxAttempts: 3,
          initialDelayMs: 1,
          retryableErrors: [/rate limit/i],
        })
      ).rejects.toThrow('Auth failed');
      
      expect(fn).toHaveBeenCalledTimes(1);
    });
  });

  describe('withBackoff', () => {
    it('should execute with exponential backoff', async () => {
      const fn = jest.fn().mockResolvedValue('success');

      const result = await Retry.withBackoff(fn, 3);

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });
  });

  describe('forRateLimit', () => {
    it('should retry on rate limit errors', async () => {
      const fn = jest
        .fn()
        .mockRejectedValueOnce(new Error('Rate limit exceeded'))
        .mockResolvedValue('success');

      const result = await Retry.forRateLimit(fn);

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(2);
    });
  });

  describe('forNetwork', () => {
    it('should retry on network errors', async () => {
      const fn = jest
        .fn()
        .mockRejectedValueOnce(new Error('Network timeout'))
        .mockResolvedValue('success');

      const result = await Retry.forNetwork(fn);

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(2);
    });
  });

  describe('edge cases', () => {
    it('should handle zero attempts', async () => {
      const fn = jest.fn().mockRejectedValue(new Error('fail'));

      await expect(
        Retry.execute(fn, { maxAttempts: 0, initialDelayMs: 1 })
      ).rejects.toThrow();
      
      expect(fn).toHaveBeenCalledTimes(0);
    });

    it('should handle very short delay', async () => {
      const fn = jest
        .fn()
        .mockRejectedValueOnce(new Error('fail'))
        .mockResolvedValue('success');

      const result = await Retry.execute(fn, { maxAttempts: 2, initialDelayMs: 1 });

      expect(result).toBe('success');
    });

    it('should handle synchronous throws', async () => {
      const fn = jest.fn().mockImplementation(() => {
        throw new Error('sync error');
      });

      await expect(
        Retry.execute(fn, { maxAttempts: 2, initialDelayMs: 1 })
      ).rejects.toThrow('sync error');
    });
  });
});
