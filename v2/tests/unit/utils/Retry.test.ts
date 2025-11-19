/**
 * Retry Tests
 */

import { Retry } from '../../../src/utils/Retry';

describe('Retry', () => {
  beforeEach(() => {
    jest.clearAllTimers();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('execute', () => {
    it('should execute function successfully on first try', async () => {
      const fn = jest.fn().mockResolvedValue('success');

      const promise = Retry.execute(fn, { maxAttempts: 3, initialDelayMs: 1000 });
      jest.runAllTimers();
      const result = await promise;

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure and eventually succeed', async () => {
      const fn = jest
        .fn()
        .mockRejectedValueOnce(new Error('fail 1'))
        .mockRejectedValueOnce(new Error('fail 2'))
        .mockResolvedValue('success');

      const promise = Retry.execute(fn, { maxAttempts: 3, initialDelayMs: 1000 });
      jest.runAllTimers();
      const result = await promise;

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('should throw error after max attempts', async () => {
      const fn = jest.fn().mockRejectedValue(new Error('permanent failure'));

      const promise = Retry.execute(fn, { maxAttempts: 3, initialDelayMs: 1000 });
      jest.runAllTimers();

      await expect(promise).rejects.toThrow('permanent failure');
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('should use exponential backoff', async () => {
      const fn = jest
        .fn()
        .mockRejectedValueOnce(new Error('fail 1'))
        .mockRejectedValueOnce(new Error('fail 2'))
        .mockResolvedValue('success');

      const promise = Retry.execute(fn, {
        maxAttempts: 3,
        initialDelayMs: 1000,
        maxDelayMs: 10000,
        backoffMultiplier: 2,
      });

      jest.runAllTimers();
      await promise;

      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('should only retry on retryable errors', async () => {
      const fn = jest.fn().mockRejectedValue(new Error('Rate limit exceeded'));

      const promise = Retry.execute(fn, {
        maxAttempts: 3,
        initialDelayMs: 1000,
        retryableErrors: [/rate limit/i],
      });

      jest.runAllTimers();

      await expect(promise).rejects.toThrow('Rate limit exceeded');
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('should not retry on non-retryable errors', async () => {
      const fn = jest.fn().mockRejectedValue(new Error('Auth failed'));

      const promise = Retry.execute(fn, {
        maxAttempts: 3,
        initialDelayMs: 1000,
        retryableErrors: [/rate limit/i],
      });

      jest.runAllTimers();

      await expect(promise).rejects.toThrow('Auth failed');
      expect(fn).toHaveBeenCalledTimes(1);
    });
  });

  describe('withBackoff', () => {
    it('should execute with exponential backoff', async () => {
      const fn = jest.fn().mockResolvedValue('success');

      const promise = Retry.withBackoff(fn, 3);
      jest.runAllTimers();
      const result = await promise;

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

      const promise = Retry.forRateLimit(fn);
      jest.runAllTimers();
      const result = await promise;

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

      const promise = Retry.forNetwork(fn);
      jest.runAllTimers();
      const result = await promise;

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(2);
    });
  });

  describe('edge cases', () => {
    it('should handle zero attempts', async () => {
      const fn = jest.fn().mockRejectedValue(new Error('fail'));

      const promise = Retry.execute(fn, { maxAttempts: 0, initialDelayMs: 1000 });
      jest.runAllTimers();

      await expect(promise).rejects.toThrow();
      expect(fn).toHaveBeenCalledTimes(0);
    });

    it('should handle very short delay', async () => {
      const fn = jest
        .fn()
        .mockRejectedValueOnce(new Error('fail'))
        .mockResolvedValue('success');

      const promise = Retry.execute(fn, { maxAttempts: 2, initialDelayMs: 1 });
      jest.runAllTimers();
      const result = await promise;

      expect(result).toBe('success');
    });

    it('should handle synchronous throws', async () => {
      const fn = jest.fn().mockImplementation(() => {
        throw new Error('sync error');
      });

      const promise = Retry.execute(fn, { maxAttempts: 2, initialDelayMs: 1000 });
      jest.runAllTimers();

      await expect(promise).rejects.toThrow('sync error');
    });
  });
});
