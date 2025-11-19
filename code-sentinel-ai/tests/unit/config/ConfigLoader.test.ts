/**
 * ConfigLoader Tests
 */

import * as core from '@actions/core';
import { ConfigLoader } from '../../../src/config/ConfigLoader';
import { readFileSync } from 'fs';

jest.mock('@actions/core');
jest.mock('fs');

describe('ConfigLoader', () => {
  const mockCore = core as jest.Mocked<typeof core>;
  const mockReadFileSync = readFileSync as jest.MockedFunction<typeof readFileSync>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    process.env.GITHUB_REPOSITORY = 'owner/repo';
    process.env.GITHUB_EVENT_PATH = '/tmp/event.json';

    mockCore.getInput.mockImplementation((name: string) => {
      const inputs: Record<string, string> = {
        'github-token': 'test-token',
        'api-key': 'test-api-key',
        'provider': 'openai',
        'model': 'gpt-5-mini',
      };
      return inputs[name] || '';
    });

    mockCore.getBooleanInput.mockReturnValue(false);

    mockReadFileSync.mockReturnValue(JSON.stringify({ pull_request: { number: 123 } }));
  });

  afterEach(() => {
    delete process.env.GITHUB_REPOSITORY;
    delete process.env.GITHUB_EVENT_PATH;
  });

  describe('load', () => {
    it('should load configuration successfully', () => {
      const config = ConfigLoader.load();

      expect(config.token).toBe('test-token');
      expect(config.repository).toBe('owner/repo');
      expect(config.prNumber).toBe(123);
      expect(config.provider).toBe('openai');
      expect(config.model).toBe('gpt-5-mini');
      expect(config.apiKey).toBe('test-api-key');
    });

    it('should use default values when inputs not provided', () => {
      mockCore.getInput.mockImplementation((name: string) => {
        if (name === 'github-token') return 'token';
        if (name === 'api-key') return 'key';
        return '';
      });

      const config = ConfigLoader.load();

      expect(config.maxFilesPerBatch).toBe(10);
      expect(config.maxLinesPerFile).toBe(500);
      expect(config.autoCleanOutdated).toBe(true);
      expect(config.incrementalMode).toBe(true);
    });

    it('should parse array inputs correctly', () => {
      mockCore.getInput.mockImplementation((name: string) => {
        if (name === 'github-token') return 'test-token';
        if (name === 'api-key') return 'test-api-key';
        if (name === 'include-patterns') return '**/*.ts,**/*.js';
        if (name === 'exclude-patterns') return '**/node_modules/**,**/dist/**';
        return '';
      });

      const config = ConfigLoader.load();

      expect(config.includePatterns).toBeDefined();
      expect(config.excludePatterns).toBeDefined();
    });

    it('should handle missing PR number gracefully', () => {
      mockReadFileSync.mockReturnValue(JSON.stringify({}));

      const config = ConfigLoader.load();

      expect(config.prNumber).toBe(0);
    });

    it('should handle malformed event JSON', () => {
      mockReadFileSync.mockImplementation(() => {
        throw new Error('Parse error');
      });

      const config = ConfigLoader.load();

      expect(config.prNumber).toBe(0);
    });

    it('should load custom prompt path', () => {
      mockCore.getInput.mockImplementation((name: string) => {
        if (name === 'github-token') return 'test-token';
        if (name === 'api-key') return 'test-api-key';
        if (name === 'custom-prompt-path') return '/path/to/prompt.md';
        return '';
      });

      const config = ConfigLoader.load();

      expect(config.customPromptPath).toBe('/path/to/prompt.md');
    });

    it('should load custom rules', () => {
      mockCore.getInput.mockImplementation((name: string) => {
        if (name === 'github-token') return 'test-token';
        if (name === 'api-key') return 'test-api-key';
        if (name === 'custom-rules') return 'Rule 1\nRule 2';
        return '';
      });

      const config = ConfigLoader.load();

      expect(config.customRules).toBe('Rule 1\nRule 2');
    });
  });

  describe('validate', () => {
    it('should validate correct configuration', () => {
      const config = {
        token: 'test-token',
        repository: 'owner/repo',
        prNumber: 123,
        apiKey: 'test-key',
        maxFilesPerBatch: 10,
        maxLinesPerFile: 500,
        cacheTtlDays: 7,
      } as any;

      const result = ConfigLoader.validate(config);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing token', () => {
      const config = {
        token: '',
        repository: 'owner/repo',
        prNumber: 123,
        apiKey: 'test-key',
        maxFilesPerBatch: 10,
        maxLinesPerFile: 500,
        cacheTtlDays: 7,
      } as any;

      const result = ConfigLoader.validate(config);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('GitHub token is required');
    });

    it('should detect missing repository', () => {
      const config = {
        token: 'test-token',
        repository: '',
        prNumber: 123,
        apiKey: 'test-key',
        maxFilesPerBatch: 10,
        maxLinesPerFile: 500,
        cacheTtlDays: 7,
      } as any;

      const result = ConfigLoader.validate(config);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Repository is required');
    });

    it('should detect invalid PR number', () => {
      const config = {
        token: 'test-token',
        repository: 'owner/repo',
        prNumber: 0,
        apiKey: 'test-key',
        maxFilesPerBatch: 10,
        maxLinesPerFile: 500,
        cacheTtlDays: 7,
      } as any;

      const result = ConfigLoader.validate(config);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Valid PR number is required');
    });

    it('should detect missing API key', () => {
      const config = {
        token: 'test-token',
        repository: 'owner/repo',
        prNumber: 123,
        apiKey: '',
        maxFilesPerBatch: 10,
        maxLinesPerFile: 500,
        cacheTtlDays: 7,
      } as any;

      const result = ConfigLoader.validate(config);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('API key is required');
    });

    it('should detect invalid maxFilesPerBatch', () => {
      const config = {
        token: 'test-token',
        repository: 'owner/repo',
        prNumber: 123,
        apiKey: 'test-key',
        maxFilesPerBatch: 0,
        maxLinesPerFile: 500,
        cacheTtlDays: 7,
      } as any;

      const result = ConfigLoader.validate(config);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('max-files-per-batch must be > 0');
    });

    it('should detect invalid cacheTtlDays', () => {
      const config = {
        token: 'test-token',
        repository: 'owner/repo',
        prNumber: 123,
        apiKey: 'test-key',
        maxFilesPerBatch: 10,
        maxLinesPerFile: 500,
        cacheTtlDays: 10,
      } as any;

      const result = ConfigLoader.validate(config);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('cache-ttl-days must be between 1 and 7');
    });

    it('should aggregate multiple errors', () => {
      const config = {
        token: '',
        repository: '',
        prNumber: 0,
        apiKey: '',
        maxFilesPerBatch: 0,
        maxLinesPerFile: 0,
        cacheTtlDays: 0,
      } as any;

      const result = ConfigLoader.validate(config);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
    });
  });
});
