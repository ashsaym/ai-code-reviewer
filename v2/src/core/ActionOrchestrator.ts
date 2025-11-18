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

export class ActionOrchestrator {
  /**
   * Execute the action
   */
  static async execute(): Promise<void> {
    try {
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
}
