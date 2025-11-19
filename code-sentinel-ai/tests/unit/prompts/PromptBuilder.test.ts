/**
 * PromptBuilder Tests
 */

import { PromptBuilder, PromptContext } from '../../../src/prompts/PromptBuilder';

describe('PromptBuilder', () => {
  describe('buildReviewPrompt', () => {
    it('should build review prompt with file changes', async () => {
      const context: PromptContext = {
        repository: 'owner/repo',
        prNumber: 123,
        prTitle: 'Add new feature',
        prBody: 'This PR adds a new feature',
        author: 'testuser',
        branch: 'feature-branch',
        baseBranch: 'main',
        fileCount: 1,
        additions: 2,
        deletions: 0,
        files: [
          {
            filename: 'src/test.ts',
            status: 'modified',
            additions: 2,
            deletions: 0,
            language: 'typescript',
            patch: '@@ -9,0 +10,2 @@\n+const x = 5;\n+console.log(x);',
          },
        ],
      };

      const prompt = await PromptBuilder.buildReviewPrompt(context);

      expect(prompt).toBeDefined();
      expect(typeof prompt).toBe('string');
      expect(prompt.length).toBeGreaterThan(0);
    });

    it('should include custom rules', async () => {
      const context: PromptContext = {
        repository: 'owner/repo',
        prNumber: 123,
        prTitle: 'Test PR',
        prBody: 'Test body',
        author: 'testuser',
        branch: 'feature',
        baseBranch: 'main',
        fileCount: 0,
        additions: 0,
        deletions: 0,
        files: [],
        customRules: 'Always check for null values',
      };

      const prompt = await PromptBuilder.buildReviewPrompt(context);

      expect(prompt).toContain('Always check for null values');
    });

    it('should handle empty file list', async () => {
      const context: PromptContext = {
        repository: 'owner/repo',
        prNumber: 123,
        prTitle: 'Empty PR',
        prBody: '',
        author: 'testuser',
        branch: 'feature',
        baseBranch: 'main',
        fileCount: 0,
        additions: 0,
        deletions: 0,
        files: [],
      };

      const prompt = await PromptBuilder.buildReviewPrompt(context);

      expect(prompt).toBeDefined();
      expect(prompt.length).toBeGreaterThan(0);
    });

    it('should handle multiple files', async () => {
      const context: PromptContext = {
        repository: 'owner/repo',
        prNumber: 123,
        prTitle: 'Multi-file PR',
        prBody: 'Multiple changes',
        author: 'testuser',
        branch: 'feature',
        baseBranch: 'main',
        fileCount: 2,
        additions: 2,
        deletions: 0,
        files: [
          {
            filename: 'src/file1.ts',
            status: 'modified',
            additions: 1,
            deletions: 0,
            language: 'typescript',
            patch: '@@ -0,0 +1 @@\n+test',
          },
          {
            filename: 'src/file2.ts',
            status: 'modified',
            additions: 1,
            deletions: 0,
            language: 'typescript',
            patch: '@@ -0,0 +1 @@\n+test',
          },
        ],
      };

      const prompt = await PromptBuilder.buildReviewPrompt(context);

      expect(prompt).toBeDefined();
      expect(prompt).toContain('file1.ts');
      expect(prompt).toContain('file2.ts');
    });
  });

  describe('createContext', () => {
    it('should create context from PR data', () => {
      const files = [
        {
          filename: 'src/test.ts',
          sha: 'sha-1',
          status: 'modified' as const,
          additions: 10,
          deletions: 5,
          changes: 15,
          patch: '@@ -1,5 +1,10 @@\n+new line',
        },
      ];

      const context = PromptBuilder.createContext(
        'owner/repo',
        123,
        'Test PR',
        'Test body',
        'testuser',
        'feature',
        'main',
        files
      );

      expect(context.repository).toBe('owner/repo');
      expect(context.prNumber).toBe(123);
      expect(context.prTitle).toBe('Test PR');
      expect(context.fileCount).toBe(1);
      expect(context.additions).toBe(10);
      expect(context.deletions).toBe(5);
      expect(context.files).toHaveLength(1);
    });

    it('should include custom rules and context', () => {
      const context = PromptBuilder.createContext(
        'owner/repo',
        123,
        'Test PR',
        'Test body',
        'testuser',
        'feature',
        'main',
        [],
        'Custom rules here',
        'Custom context here'
      );

      expect(context.customRules).toBe('Custom rules here');
      expect(context.customContext).toBe('Custom context here');
    });
  });

  describe('validateContext', () => {
    it('should validate valid context', () => {
      const context: PromptContext = {
        repository: 'owner/repo',
        prNumber: 123,
        prTitle: 'Valid PR',
        prBody: 'Valid body',
        author: 'testuser',
        branch: 'feature',
        baseBranch: 'main',
        fileCount: 1,
        additions: 1,
        deletions: 0,
        files: [
          {
            filename: 'test.ts',
            status: 'modified',
            additions: 1,
            deletions: 0,
            language: 'typescript',
            patch: '',
          },
        ],
      };

      const result = PromptBuilder.validateContext(context);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail validation for missing repository', () => {
      const context: PromptContext = {
        repository: '',
        prNumber: 123,
        prTitle: 'Test',
        prBody: '',
        author: 'testuser',
        branch: 'feature',
        baseBranch: 'main',
        fileCount: 1,
        additions: 0,
        deletions: 0,
        files: [
          {
            filename: 'test.ts',
            status: 'modified',
            additions: 0,
            deletions: 0,
            language: 'typescript',
            patch: '',
          },
        ],
      };

      const result = PromptBuilder.validateContext(context);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Repository is required');
    });

    it('should fail validation for empty files', () => {
      const context: PromptContext = {
        repository: 'owner/repo',
        prNumber: 123,
        prTitle: 'Test',
        prBody: '',
        author: 'testuser',
        branch: 'feature',
        baseBranch: 'main',
        fileCount: 0,
        additions: 0,
        deletions: 0,
        files: [],
      };

      const result = PromptBuilder.validateContext(context);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('At least one file is required');
    });
  });

  describe('estimateTokens', () => {
    it('should estimate token count', () => {
      const prompt = 'This is a test prompt';
      const tokens = PromptBuilder.estimateTokens(prompt);

      expect(tokens).toBeGreaterThan(0);
      expect(typeof tokens).toBe('number');
    });

    it('should estimate tokens for empty string', () => {
      const tokens = PromptBuilder.estimateTokens('');

      expect(tokens).toBe(0);
    });

    it('should estimate tokens for large text', () => {
      const largePrompt = 'word '.repeat(1000);
      const tokens = PromptBuilder.estimateTokens(largePrompt);

      expect(tokens).toBeGreaterThan(1000);
    });
  });

  describe('edge cases', () => {
    it('should handle very large context', async () => {
      const context: PromptContext = {
        repository: 'owner/repo',
        prNumber: 123,
        prTitle: 'Large PR',
        prBody: 'a'.repeat(10000),
        author: 'testuser',
        branch: 'feature',
        baseBranch: 'main',
        fileCount: 1,
        additions: 10000,
        deletions: 0,
        files: [
          {
            filename: 'large.ts',
            status: 'added',
            additions: 10000,
            deletions: 0,
            language: 'typescript',
            patch: 'x'.repeat(50000),
          },
        ],
      };

      const prompt = await PromptBuilder.buildReviewPrompt(context);

      expect(prompt).toBeDefined();
    });

    it('should handle special characters', async () => {
      const context: PromptContext = {
        repository: 'owner/repo',
        prNumber: 123,
        prTitle: 'Special <>&" chars',
        prBody: 'Body with "quotes" and <tags>',
        author: 'testuser',
        branch: 'feature',
        baseBranch: 'main',
        fileCount: 1,
        additions: 1,
        deletions: 0,
        files: [
          {
            filename: 'test.ts',
            status: 'modified',
            additions: 1,
            deletions: 0,
            language: 'typescript',
            patch: '+const s = "<script>alert(\\"xss\\")</script>";',
          },
        ],
      };

      const prompt = await PromptBuilder.buildReviewPrompt(context);

      expect(prompt).toBeDefined();
    });
  });
});
