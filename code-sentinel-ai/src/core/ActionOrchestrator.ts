/**
 * Action Orchestrator
 * 
 * Main entry point - coordinates all components
 */

import * as core from '@actions/core';
import { ConfigLoader } from '../config/ConfigLoader';
import { StorageManager } from '../storage/StorageManager';
import { GitHubClient } from '../github/GitHubClient';
import { PullRequestService } from '../github/PullRequestService';
import { CommentService } from '../github/CommentService';
import { ProviderFactory } from '../providers/ProviderFactory';
import { ReviewEngine } from './ReviewEngine';
import { SummaryService } from '../summary/SummaryService';
import { SuggestionService } from '../suggestion/SuggestionService';
import { DescriptionService } from '../description/DescriptionService';
import { readFileSync } from 'fs';

export class ActionOrchestrator {
  /**
   * Check if action was triggered by a comment command
   */
  private static getCommentCommand(): string | null {
    const eventPath = process.env.GITHUB_EVENT_PATH;
    if (!eventPath) return null;

    try {
      const event = JSON.parse(readFileSync(eventPath, 'utf8'));
      
      // Check if this is an issue_comment event
      if (event.action !== 'created' || !event.comment) {
        return null;
      }

      const commentBody = event.comment.body?.trim().toLowerCase() || '';
      
      // Check for commands (support both /command and just command)
      if (commentBody === '/summary' || commentBody.startsWith('/summary ')) {
        return 'summary';
      }
      
      if (commentBody === '/review' || commentBody.startsWith('/review ')) {
        return 'review';
      }
      
      if (commentBody === '/suggestion' || commentBody.startsWith('/suggestion ') ||
          commentBody === '/suggestions' || commentBody.startsWith('/suggestions ')) {
        return 'suggestion';
      }
      
      if (commentBody === '/description' || commentBody.startsWith('/description ')) {
        return 'description';
      }
      
      return null;
    } catch (error) {
      core.debug(`Failed to parse GitHub event for comment command: ${error}`);
      return null;
    }
  }

  /**
   * Execute the action
   */
  static async execute(): Promise<void> {
    try {
      // Determine the mode: comment command takes precedence, then input, then default
      const commentCommand = this.getCommentCommand();
      const modeInput = core.getInput('mode')?.toLowerCase() || 'review';
      const mode = commentCommand || modeInput;

      // Route to appropriate handler based on mode
      if (mode === 'summary') {
        core.info('🤖 Code Sentinel AI - Generating PR Summary');
        await this.executeSummary();
        return;
      }

      if (mode === 'suggestion') {
        core.info('🤖 Code Sentinel AI - Generating Suggestions');
        await this.executeSuggestion();
        return;
      }

      if (mode === 'description') {
        core.info('🤖 Code Sentinel AI - Generating Description');
        await this.executeDescription();
        return;
      }

      // Default: review mode
      core.info('🤖 Code Sentinel AI - Starting review');

      // 1. Load and validate configuration
      const config = ConfigLoader.load();
      const validation = ConfigLoader.validate(config);

      if (!validation.valid) {
        throw new Error(`Invalid configuration: ${validation.errors.join(', ')}`);
      }

      if (config.debugMode) {
        ConfigLoader.print(config);
      }

      // Parse repository owner/name
      const [owner, repo] = config.repository.split('/');
      if (!owner || !repo) {
        throw new Error(`Invalid repository format: ${config.repository}`);
      }

      // 2. Initialize GitHub clients
      const githubClient = new GitHubClient({
        token: config.token,
        baseUrl: config.githubHost,
        owner,
        repo,
      });
      
      const octokit = githubClient.getOctokit();

      // 3. Initialize storage
      const storageManager = new StorageManager({
        octokit,
        owner,
        repo,
        cacheOptions: {
          ttlDays: config.cacheTtlDays,
        },
        checkName: config.checkName,
        enableCheckRuns: config.enableCheckRuns,
      });

      // 4. Initialize GitHub services
      const prService = new PullRequestService({
        octokit,
        owner,
        repo,
      });

      const commentService = new CommentService({
        octokit,
        owner,
        repo,
      });

      // 5. Initialize AI provider
      const aiProvider = ProviderFactory.create({
        type: config.provider,
        model: config.model,
        apiKey: config.apiKey,
        endpoint: config.apiEndpoint,
        maxCompletionTokensMode: config.maxCompletionTokensMode,
      });

      // Test provider connection
      const providerName = aiProvider.getProviderName();
      core.info(`✓ Connected to ${providerName} (${config.model})`);

      // 6. Initialize review engine
      const reviewEngine = new ReviewEngine({
        storage: storageManager,
        prService,
        commentService,
        aiProvider,
        maxFilesPerBatch: config.maxFilesPerBatch,
        maxLinesPerFile: config.maxLinesPerFile,
        autoCleanOutdated: config.autoCleanOutdated,
        aiAgentName: config.aiAgentName,
      });

      // 7. Execute review
      core.startGroup('🔍 Executing Review');
      const result = await reviewEngine.executeReview(owner, repo, config.prNumber);
      core.endGroup();

      // 8. Report results
      core.info('');
      core.info('📊 Review Results:');
      core.info(`  Files Reviewed: ${result.filesReviewed}`);
      core.info(`  Comments Created: ${result.commentsCreated}`);
      core.info(`  Outdated Cleaned: ${result.outdatedCleaned}`);
      core.info(`  Tokens Used: ${result.tokensUsed.total.toLocaleString()}`);
      core.info(`  Estimated Cost: $${result.cost.toFixed(4)}`);

      if (result.errors.length > 0) {
        core.warning(`⚠️ ${result.errors.length} errors occurred:`);
        result.errors.forEach(error => core.warning(`  - ${error}`));
      }

      // 9. Set outputs
      core.setOutput('files-reviewed', result.filesReviewed);
      core.setOutput('comments-created', result.commentsCreated);
      core.setOutput('outdated-cleaned', result.outdatedCleaned);
      core.setOutput('tokens-used', result.tokensUsed.total);
      core.setOutput('estimated-cost', result.cost);
      core.setOutput('success', result.success);

      // 10. Exit status
      if (!result.success) {
        core.setFailed('Review completed with errors');
      } else {
        core.info('✅ Review completed successfully');
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      core.error(`❌ Action failed: ${errorMessage}`);
      
      if (error instanceof Error && error.stack) {
        core.debug(error.stack);
      }

      core.setFailed(errorMessage);
    }
  }

  /**
   * Execute summary command
   */
  private static async executeSummary(): Promise<void> {
    try {
      // 1. Load minimal configuration
      const token = core.getInput('github-token') || process.env.GITHUB_TOKEN || '';
      const repository = process.env.GITHUB_REPOSITORY || '';
      
      if (!token) {
        throw new Error('github-token is required');
      }

      if (!repository) {
        throw new Error('GITHUB_REPOSITORY environment variable is required');
      }

      // Parse repository owner/name
      const [owner, repo] = repository.split('/');
      if (!owner || !repo) {
        throw new Error(`Invalid repository format: ${repository}`);
      }

      // Get PR number from event
      const eventPath = process.env.GITHUB_EVENT_PATH;
      if (!eventPath) {
        throw new Error('GITHUB_EVENT_PATH not found');
      }

      const event = JSON.parse(readFileSync(eventPath, 'utf8'));
      const prNumber = event.issue?.number || event.pull_request?.number;
      
      if (!prNumber) {
        throw new Error('Could not determine PR number from event');
      }

      core.info(`📊 Generating summary for PR #${prNumber}`);

      // 2. Initialize GitHub clients
      const githubHost = core.getInput('github-host') || 'https://api.github.com';
      const githubClient = new GitHubClient({
        token,
        baseUrl: githubHost,
        owner,
        repo,
      });
      
      const octokit = githubClient.getOctokit();

      const prService = new PullRequestService({
        octokit,
        owner,
        repo,
      });

      const commentService = new CommentService({
        octokit,
        owner,
        repo,
      });

      // 3. Initialize AI provider
      const apiKey = core.getInput('api-key') || process.env.OPENAI_API_KEY || '';
      if (!apiKey) {
        throw new Error('api-key is required for summary generation');
      }

      const provider = core.getInput('provider', { required: false }) || 'openai';
      const model = core.getInput('model', { required: false }) || 'gpt-5-mini';
      const apiEndpoint = core.getInput('api-endpoint', { required: false });
      const maxCompletionTokensMode = core.getBooleanInput('max-completion-tokens-mode', { required: false });
      const aiAgentName = core.getInput('ai-agent-name', { required: false }) || 'Code Sentinel AI';

      const aiProvider = ProviderFactory.create({
        type: provider as 'openai' | 'openwebui',
        model,
        apiKey,
        endpoint: apiEndpoint,
        maxCompletionTokensMode,
      });

      const providerName = aiProvider.getProviderName();
      core.info(`✓ Connected to ${providerName} (${model})`);

      // 4. Generate summary
      const summaryService = new SummaryService({
        prService,
        commentService,
        aiProvider,
        prNumber,
        aiAgentName,
      });

      await summaryService.generateSummary();

      core.info('✅ Summary generated successfully');
      core.setOutput('success', true);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      core.error(`❌ Summary generation failed: ${errorMessage}`);
      
      if (error instanceof Error && error.stack) {
        core.debug(error.stack);
      }

      core.setFailed(errorMessage);
    }
  }

  /**
   * Execute suggestion command
   */
  private static async executeSuggestion(): Promise<void> {
    try {
      // 1. Load minimal configuration
      const token = core.getInput('github-token') || process.env.GITHUB_TOKEN || '';
      const repository = process.env.GITHUB_REPOSITORY || '';
      
      if (!token) {
        throw new Error('github-token is required');
      }

      if (!repository) {
        throw new Error('GITHUB_REPOSITORY environment variable is required');
      }

      // Parse repository owner/name
      const [owner, repo] = repository.split('/');
      if (!owner || !repo) {
        throw new Error(`Invalid repository format: ${repository}`);
      }

      // Get PR number from event
      const eventPath = process.env.GITHUB_EVENT_PATH;
      if (!eventPath) {
        throw new Error('GITHUB_EVENT_PATH not found');
      }

      const event = JSON.parse(readFileSync(eventPath, 'utf8'));
      const prNumber = event.issue?.number || event.pull_request?.number;
      
      if (!prNumber) {
        throw new Error('Could not determine PR number from event');
      }

      core.info(`💡 Generating suggestions for PR #${prNumber}`);

      // 2. Initialize GitHub clients
      const githubHost = core.getInput('github-host') || 'https://api.github.com';
      const githubClient = new GitHubClient({
        token,
        baseUrl: githubHost,
        owner,
        repo,
      });
      
      const octokit = githubClient.getOctokit();

      const prService = new PullRequestService({
        octokit,
        owner,
        repo,
      });

      const commentService = new CommentService({
        octokit,
        owner,
        repo,
      });

      // 3. Initialize AI provider
      const apiKey = core.getInput('api-key') || process.env.OPENAI_API_KEY || '';
      if (!apiKey) {
        throw new Error('api-key is required for suggestion generation');
      }

      const provider = core.getInput('provider', { required: false }) || 'openai';
      const model = core.getInput('model', { required: false }) || 'gpt-5-mini';
      const apiEndpoint = core.getInput('api-endpoint', { required: false });
      const maxCompletionTokensMode = core.getBooleanInput('max-completion-tokens-mode', { required: false });
      const aiAgentName = core.getInput('ai-agent-name', { required: false }) || 'Code Sentinel AI';

      const aiProvider = ProviderFactory.create({
        type: provider as 'openai' | 'openwebui',
        model,
        apiKey,
        endpoint: apiEndpoint,
        maxCompletionTokensMode,
      });

      const providerName = aiProvider.getProviderName();
      core.info(`✓ Connected to ${providerName} (${model})`);

      // 4. Generate suggestions
      const suggestionService = new SuggestionService({
        prService,
        commentService,
        aiProvider,
        prNumber,
        aiAgentName,
      });

      await suggestionService.generateSuggestions();

      core.info('✅ Suggestions generated successfully');
      core.setOutput('success', true);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      core.error(`❌ Suggestion generation failed: ${errorMessage}`);
      
      if (error instanceof Error && error.stack) {
        core.debug(error.stack);
      }

      core.setFailed(errorMessage);
    }
  }

  /**
   * Execute description generation
   */
  private static async executeDescription(): Promise<void> {
    try {
      // 1. Load minimal configuration
      const token = core.getInput('github-token') || process.env.GITHUB_TOKEN || '';
      const repository = process.env.GITHUB_REPOSITORY || '';
      
      if (!token) {
        throw new Error('github-token is required');
      }

      if (!repository) {
        throw new Error('GITHUB_REPOSITORY environment variable is required');
      }

      // Parse repository owner/name
      const [owner, repo] = repository.split('/');
      if (!owner || !repo) {
        throw new Error(`Invalid repository format: ${repository}`);
      }

      // Get PR number from event
      const eventPath = process.env.GITHUB_EVENT_PATH;
      if (!eventPath) {
        throw new Error('GITHUB_EVENT_PATH not found');
      }

      const event = JSON.parse(readFileSync(eventPath, 'utf8'));
      const prNumber = event.issue?.number || event.pull_request?.number;
      
      if (!prNumber) {
        throw new Error('Could not determine PR number from event');
      }

      core.info(`📝 Generating description for PR #${prNumber}`);

      // 2. Initialize GitHub clients
      const githubHost = core.getInput('github-host') || 'https://api.github.com';
      const githubClient = new GitHubClient({
        token,
        baseUrl: githubHost,
        owner,
        repo,
      });
      
      const octokit = githubClient.getOctokit();

      const prService = new PullRequestService({
        octokit,
        owner,
        repo,
      });

      // 3. Initialize AI provider
      const apiKey = core.getInput('api-key') || process.env.OPENAI_API_KEY || '';
      if (!apiKey) {
        throw new Error('api-key is required for description generation');
      }

      const provider = core.getInput('provider', { required: false }) || 'openai';
      const model = core.getInput('model', { required: false }) || 'gpt-5-mini';
      const apiEndpoint = core.getInput('api-endpoint', { required: false });
      const maxCompletionTokensMode = core.getBooleanInput('max-completion-tokens-mode', { required: false });
      const aiAgentName = core.getInput('ai-agent-name', { required: false }) || 'Code Sentinel AI';

      const aiProvider = ProviderFactory.create({
        type: provider as 'openai' | 'openwebui',
        model,
        apiKey,
        endpoint: apiEndpoint,
        maxCompletionTokensMode,
      });

      const providerName = aiProvider.getProviderName();
      core.info(`✓ Connected to ${providerName} (${model})`);

      // 4. Generate description
      const descriptionService = new DescriptionService({
        prService,
        aiProvider,
        prNumber,
        aiAgentName,
      });

      await descriptionService.generateDescription();

      core.info('✅ Description generated successfully');
      core.setOutput('success', true);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      core.error(`❌ Description generation failed: ${errorMessage}`);
      
      if (error instanceof Error && error.stack) {
        core.debug(error.stack);
      }

      core.setFailed(errorMessage);
    }
  }
}
