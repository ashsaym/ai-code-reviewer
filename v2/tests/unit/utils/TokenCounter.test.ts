/**
 * TokenCounter Unit Tests
 */

import { TokenCounter } from '../../../src/utils/TokenCounter';

describe('TokenCounter', () => {
  describe('estimate', () => {
    it('should estimate tokens for empty string', () => {
      expect(TokenCounter.estimate('')).toBe(0);
    });

    it('should estimate tokens for simple text', () => {
      const text = 'Hello world';
      const tokens = TokenCounter.estimate(text);
      expect(tokens).toBeGreaterThan(0);
      expect(tokens).toBeLessThan(10);
    });

    it('should estimate tokens for longer text', () => {
      const text = 'This is a longer piece of text that should result in more tokens being estimated.';
      const tokens = TokenCounter.estimate(text);
      expect(tokens).toBeGreaterThan(10);
    });

    it('should handle code properly', () => {
      const code = 'function test() { return 42; }';
      const tokens = TokenCounter.estimate(code);
      expect(tokens).toBeGreaterThan(0);
    });
  });

  describe('estimateMessages', () => {
    it('should estimate tokens for message array', () => {
      const messages = [
        { role: 'user' as const, content: 'Hello' },
        { role: 'assistant' as const, content: 'Hi there!' }
      ];
      const tokens = TokenCounter.estimateMessages(messages);
      expect(tokens).toBeGreaterThan(0);
    });

    it('should handle empty messages', () => {
      const tokens = TokenCounter.estimateMessages([]);
      expect(tokens).toBe(3); // Message list overhead
    });
  });

  describe('estimateCost', () => {
    it('should estimate cost for model', () => {
      const cost = TokenCounter.estimateCost('gpt-5-mini', 1000, 1000);
      expect(cost).toBeGreaterThan(0);
    });
  });

  describe('exceedsLimit', () => {
    it('should check if text exceeds limit', () => {
      expect(TokenCounter.exceedsLimit('short text', 1000)).toBe(false);
      expect(TokenCounter.exceedsLimit('a'.repeat(10000), 1000)).toBe(true);
    });
  });

  describe('truncate', () => {
    it('should truncate long text', () => {
      const longText = 'a'.repeat(10000);
      const truncated = TokenCounter.truncate(longText, 100);
      expect(truncated.length).toBeLessThan(longText.length);
      expect(truncated).toContain('truncated');
    });

    it('should not truncate short text', () => {
      const shortText = 'short';
      expect(TokenCounter.truncate(shortText, 100)).toBe(shortText);
    });
  });

  describe('getStats', () => {
    it('should return stats for text', () => {
      const stats = TokenCounter.getStats('Hello world\nThis is a test');
      expect(stats.tokens).toBeGreaterThan(0);
      expect(stats.characters).toBeGreaterThan(0);
      expect(stats.words).toBeGreaterThan(0);
      expect(stats.lines).toBe(2);
    });
  });
});
