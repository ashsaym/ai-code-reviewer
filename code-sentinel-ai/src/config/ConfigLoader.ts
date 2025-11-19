/**
 * Configuration Loader
 * 
 * Loads and validates configuration from GitHub Actions inputs and environment
 */

import * as core from '@actions/core';
import { readFileSync } from 'fs';

export interface ActionConfig {
  // GitHub context
  token: string;
  githubHost: string;
  repository: string;
  prNumber: number;
  
  // AI Provider
  provider: 'openai' | 'openwebui';
  model: string;
  apiKey: string;
  apiEndpoint?: string;
  maxCompletionTokensMode: boolean;
  
  // Review settings
  includePatterns: string[];
  excludePatterns: string[];
  maxFilesPerBatch: number;
  maxLinesPerFile: number;
  autoCleanOutdated: boolean;
  incrementalMode: boolean;
  
  // Check runs
  enableCheckRuns: boolean;
  checkName: string;
  
  // Custom prompts
  customPromptPath?: string;
  customRules?: string;
  
  // Advanced
  cacheEnabled: boolean;
  cacheTtlDays: number;
  debugMode: boolean;
  
  // Scan settings
  scanType?: 'security' | 'quality' | 'documentation' | 'architecture' | 'all';
  scanScope?: 'full-codebase' | 'src-only' | 'tests-excluded';
  publishOutputs?: string[];
  issueThreshold?: 'critical' | 'high' | 'medium' | 'low';
  scanIncludePatterns?: string[];
  scanExcludePatterns?: string[];
}

export class ConfigLoader {
  /**
   * Load configuration from action inputs and environment
   */
  static load(): ActionConfig {
    // GitHub context
    const token = this.getRequiredInput('github-token');
    const githubHost = this.getInput('github-host', 'https://api.github.com') || 'https://api.github.com';
    const repository = this.getEnv('GITHUB_REPOSITORY') || '';
    
    // Get PR number from GitHub event
    let prNumber = 0;
    const eventPath = this.getEnv('GITHUB_EVENT_PATH');
    if (eventPath) {
      try {
        const event = JSON.parse(readFileSync(eventPath, 'utf8'));
        prNumber = event.pull_request?.number || event.issue?.number || 0;
      } catch (error) {
        core.warning(`Failed to read GitHub event: ${error}`);
      }
    }

    // AI Provider
    const provider = this.getInput('provider', 'openai') as 'openai' | 'openwebui';
    const model = this.getInput('model', 'gpt-5-mini') || 'gpt-5-mini';
    const apiKey = this.getRequiredInput('api-key');
    const apiEndpoint = this.getInput('api-endpoint');
    const maxCompletionTokensMode = this.getBooleanInput('max-completion-tokens-mode', false);

    // Review settings
    const includePatterns = this.getArrayInput('include-patterns', ['**/*.{js,ts,jsx,tsx,py,java,go,rb,php}']);
    const excludePatterns = this.getArrayInput('exclude-patterns', [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/*.min.js',
      '**/*.lock',
      '**/package-lock.json',
      '**/yarn.lock',
    ]);
    const maxFilesPerBatch = this.getNumberInput('max-files-per-batch', 10);
    const maxLinesPerFile = this.getNumberInput('max-lines-per-file', 500);
    const autoCleanOutdated = this.getBooleanInput('auto-clean-outdated', true);
    const incrementalMode = this.getBooleanInput('incremental-mode', true);

    // Check runs
    const enableCheckRuns = this.getBooleanInput('enable-check-runs', true);
    const checkName = this.getInput('check-name', 'Code Sentinel AI Review') || 'Code Sentinel AI Review';

    // Custom prompts
    const customPromptPath = this.getInput('custom-prompt-path');
    const customRules = this.getInput('custom-rules');

    // Advanced
    const cacheEnabled = this.getBooleanInput('cache-enabled', true);
    const cacheTtlDays = this.getNumberInput('cache-ttl-days', 7);
    const debugMode = this.getBooleanInput('debug-mode', false);
    
    // Scan settings
    const scanType = this.getInput('scan-type') as 'security' | 'quality' | 'documentation' | 'architecture' | 'all' | undefined;
    const scanScope = this.getInput('scan-scope', 'src-only') as 'full-codebase' | 'src-only' | 'tests-excluded';
    const publishOutputs = this.getArrayInput('publish-outputs', ['check-run', 'artifact']);
    const issueThreshold = this.getInput('issue-threshold', 'high') as 'critical' | 'high' | 'medium' | 'low';
    const scanIncludePatterns = this.getArrayInput('scan-include-patterns', []);
    const scanExcludePatterns = this.getArrayInput('scan-exclude-patterns', [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/coverage/**',
      '**/.git/**',
      '**/*.min.js',
      '**/*.map',
      '**/package-lock.json',
      '**/yarn.lock',
      '**/pnpm-lock.yaml',
    ]);

    return {
      token,
      githubHost,
      repository,
      prNumber,
      provider,
      model,
      apiKey,
      apiEndpoint,
      maxCompletionTokensMode,
      includePatterns,
      excludePatterns,
      maxFilesPerBatch,
      maxLinesPerFile,
      autoCleanOutdated,
      incrementalMode,
      enableCheckRuns,
      checkName,
      customPromptPath,
      customRules,
      cacheEnabled,
      cacheTtlDays,
      debugMode,
      scanType,
      scanScope,
      publishOutputs,
      issueThreshold,
      scanIncludePatterns,
      scanExcludePatterns,
    };
  }

  /**
   * Validate configuration
   */
  static validate(config: ActionConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!config.token) errors.push('GitHub token is required');
    if (!config.repository) errors.push('Repository is required');
    if (!config.prNumber || config.prNumber <= 0) errors.push('Valid PR number is required');
    if (!config.apiKey) errors.push('API key is required');
    if (config.provider === 'openwebui' && !config.apiEndpoint) {
      errors.push('api-endpoint is required for OpenWebUI provider');
    }
    if (config.maxFilesPerBatch <= 0) errors.push('max-files-per-batch must be > 0');
    if (config.maxLinesPerFile <= 0) errors.push('max-lines-per-file must be > 0');
    if (config.cacheTtlDays < 1 || config.cacheTtlDays > 7) {
      errors.push('cache-ttl-days must be between 1 and 7');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get required input
   */
  private static getRequiredInput(name: string): string {
    const value = core.getInput(name);
    if (!value) {
      throw new Error(`Input '${name}' is required`);
    }
    return value;
  }

  /**
   * Get optional input with default
   */
  private static getInput(name: string, defaultValue?: string): string | undefined {
    return core.getInput(name) || defaultValue;
  }

  /**
   * Get array input (comma or newline separated)
   */
  private static getArrayInput(name: string, defaultValue: string[] = []): string[] {
    const input = core.getInput(name);
    if (!input) return defaultValue;

    return input
      .split(/[,\n]/)
      .map(s => s.trim())
      .filter(s => s.length > 0);
  }

  /**
   * Get number input
   */
  private static getNumberInput(name: string, defaultValue: number): number {
    const input = core.getInput(name);
    if (!input) return defaultValue;

    const num = parseInt(input, 10);
    return isNaN(num) ? defaultValue : num;
  }

  /**
   * Get boolean input
   */
  private static getBooleanInput(name: string, defaultValue: boolean): boolean {
    const input = core.getInput(name);
    if (!input) return defaultValue;

    return input.toLowerCase() === 'true' || input === '1';
  }

  /**
   * Get environment variable
   */
  private static getEnv(name: string): string | undefined {
    return process.env[name];
  }

  /**
   * Print configuration (for debugging)
   */
  static print(config: ActionConfig): void {
    core.info('📋 Configuration:');
    core.info(`  GitHub Host: ${config.githubHost}`);
    core.info(`  Repository: ${config.repository}`);
    core.info(`  PR Number: ${config.prNumber}`);
    core.info(`  Provider: ${config.provider}`);
    core.info(`  Model: ${config.model}`);
    core.info(`  Max Files/Batch: ${config.maxFilesPerBatch}`);
    core.info(`  Max Lines/File: ${config.maxLinesPerFile}`);
    core.info(`  Auto Clean Outdated: ${config.autoCleanOutdated}`);
    core.info(`  Incremental Mode: ${config.incrementalMode}`);
    core.info(`  Check Runs: ${config.enableCheckRuns}`);
    core.info(`  Cache: ${config.cacheEnabled} (TTL: ${config.cacheTtlDays} days)`);
    core.info(`  Debug Mode: ${config.debugMode}`);
  }
}
