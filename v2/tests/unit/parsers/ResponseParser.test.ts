/**
 * ResponseParser Tests
 */

import { ResponseParser } from '../../../src/parsers/ResponseParser';

describe('ResponseParser', () => {
  describe('parse', () => {
    it('should parse valid review response with comments', () => {
      const response = {
        comments: [
          {
            path: 'src/test.ts',
            line: 10,
            severity: 'error',
            message: 'Test error message',
          },
          {
            path: 'src/test.ts',
            line: 20,
            severity: 'warning',
            message: 'Test warning message',
          },
        ],
        summary: 'Overall the code looks good',
      };

      const result = ResponseParser.parse(JSON.stringify(response));

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.comments).toBeDefined();
      expect(result.data?.comments.length).toBeGreaterThanOrEqual(2);
    });

    it('should handle response without comments', () => {
      const response = {
        comments: [],
        summary: 'No issues found',
      };

      const result = ResponseParser.parse(JSON.stringify(response));

      expect(result.success).toBe(true);
      expect(result.data?.comments).toHaveLength(0);
      expect(result.data?.summary).toBe('No issues found');
    });

    it('should handle malformed JSON', () => {
      const invalidJson = '{ invalid json }';

      const result = ResponseParser.parse(invalidJson);

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBeGreaterThan(0);
    });

    it('should handle missing summary', () => {
      const response = {
        comments: [
          {
            path: 'src/test.ts',
            line: 10,
            severity: 'info',
            message: 'Test message',
          },
        ],
      };

      const result = ResponseParser.parse(JSON.stringify(response));

      expect(result.success).toBe(true);
      expect(result.data?.comments).toBeDefined();
    });

    it('should parse multiple comments', () => {
      const response = {
        comments: [
          { path: 'src/file1.ts', line: 10, severity: 'error', message: 'Error 1' },
          { path: 'src/file2.ts', line: 20, severity: 'warning', message: 'Warning 1' },
        ],
        summary: 'Multiple files reviewed',
      };

      const result = ResponseParser.parse(JSON.stringify(response));

      expect(result.success).toBe(true);
      expect(result.data?.comments.length).toBe(2);
    });

    it('should handle all severity levels', () => {
      const response = {
        comments: [
          { path: 'src/test.ts', line: 10, severity: 'error', message: 'Error' },
          { path: 'src/test.ts', line: 20, severity: 'warning', message: 'Warning' },
          { path: 'src/test.ts', line: 30, severity: 'info', message: 'Info' },
        ],
        summary: 'Mixed severity',
      };

      const result = ResponseParser.parse(JSON.stringify(response));

      expect(result.success).toBe(true);
      expect(result.data?.comments.length).toBe(3);
    });

    it('should validate comment schema', () => {
      const response = {
        comments: [
          {
            path: 'src/test.ts',
            line: 10,
            severity: 'error',
            message: 'Valid comment',
          },
          {
            path: 'src/test.ts',
            // Missing line number
            severity: 'error',
            message: 'Invalid comment',
          },
        ],
      };

      const result = ResponseParser.parse(JSON.stringify(response));

      // Should fail validation due to missing line number
      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
    });

    it('should reject invalid severity', () => {
      const response = {
        comments: [
          {
            path: 'src/test.ts',
            line: 10,
            severity: 'invalid-severity',
            message: 'Test message',
          },
        ],
      };

      const result = ResponseParser.parse(JSON.stringify(response));

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
    });

    it('should require positive line numbers', () => {
      const response = {
        comments: [
          {
            path: 'src/test.ts',
            line: 0,
            severity: 'error',
            message: 'Test message',
          },
        ],
      };

      const result = ResponseParser.parse(JSON.stringify(response));

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
    });

    it('should handle optional suggestion field', () => {
      const response = {
        comments: [
          {
            path: 'src/test.ts',
            line: 10,
            severity: 'warning',
            message: 'Consider refactoring',
            suggestion: 'Use a helper function',
          },
        ],
        summary: 'Code looks good',
      };

      const result = ResponseParser.parse(JSON.stringify(response));

      expect(result.success).toBe(true);
      expect(result.data?.comments[0].suggestion).toBe('Use a helper function');
    });
  });

  describe('edge cases', () => {
    it('should handle very large responses', () => {
      const largeResponse = {
        comments: Array.from({ length: 1000 }, (_, i) => ({
          path: `src/file${i}.ts`,
          line: i + 1,
          severity: 'info',
          message: `Message ${i}`,
        })),
        summary: 'Large response',
      };

      const result = ResponseParser.parse(JSON.stringify(largeResponse));

      expect(result.success).toBe(true);
      expect(result.data?.comments.length).toBe(1000);
    });

    it('should handle special characters', () => {
      const response = {
        comments: [
          {
            path: 'src/test.ts',
            line: 10,
            severity: 'error',
            message: 'Error with "quotes" and \'apostrophes\' and <html>',
          },
        ],
        summary: 'Summary with special chars: &, <, >, "',
      };

      const result = ResponseParser.parse(JSON.stringify(response));

      expect(result.success).toBe(true);
      expect(result.data?.comments[0].message).toContain('quotes');
    });

    it('should handle unicode', () => {
      const response = {
        comments: [
          {
            path: 'src/test.ts',
            line: 10,
            severity: 'info',
            message: '测试消息 🎉 ❤️',
          },
        ],
        summary: '代码审查完成',
      };

      const result = ResponseParser.parse(JSON.stringify(response));

      expect(result.success).toBe(true);
      expect(result.data?.summary).toBe('代码审查完成');
    });

    it('should handle empty message gracefully', () => {
      const response = {
        comments: [
          {
            path: 'src/test.ts',
            line: 10,
            severity: 'error',
            message: '',
          },
        ],
      };

      const result = ResponseParser.parse(JSON.stringify(response));

      // Empty message should fail validation (min length 1)
      expect(result.success).toBe(false);
    });

    it('should handle missing required fields', () => {
      const response = {
        comments: [
          {
            // Missing path
            line: 10,
            severity: 'error',
            message: 'Test',
          },
        ],
      };

      const result = ResponseParser.parse(JSON.stringify(response));

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
    });
  });
});
