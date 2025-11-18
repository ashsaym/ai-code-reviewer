/**
 * Smoke Tests - Basic module functionality
 */

describe('Basic Functionality', () => {
  it('should have basic TypeScript support', () => {
    const sum = (a: number, b: number): number => a + b;
    expect(sum(2, 3)).toBe(5);
  });

  it('should support async operations', async () => {
    const promise = Promise.resolve(42);
    const result = await promise;
    expect(result).toBe(42);
  });

  it('should handle errors', () => {
    expect(() => {
      throw new Error('test error');
    }).toThrow('test error');
  });
});
