/**
 * Review Engine
 * 
 * Orchestrates the complete code review workflow
 */

import * as core from '@actions/core';
import { StorageManager } from '../storage/StorageManager';
import { PullRequestService, PRFile } from '../github/PullRequestService';
import { CommentService } from '../github/CommentService';
import { BaseProvider } from '../providers/BaseProvider';
import { IncrementalAnalyzer, FileAnalysis } from '../analysis/IncrementalAnalyzer';
import { OutdatedCommentCleaner } from '../analysis/OutdatedCommentCleaner';
import { PromptBuilder, PromptContext } from '../prompts/PromptBuilder';
import { ResponseParser, ReviewComment } from '../parsers/ResponseParser';
import { Logger } from '../utils/Logger';
import { TokenCounter } from '../utils/TokenCounter';

export interface ReviewEngineOptions {
  storage: StorageManager;
  prService: PullRequestService;
  commentService: CommentService;
  aiProvider: BaseProvider;
  maxFilesPerBatch?: number;
  maxLinesPerFile?: number;
  autoCleanOutdated?: boolean;
}

export interface ReviewResult {
  success: boolean;
  filesReviewed: number;
  commentsCreated: number;
  outdatedCleaned: number;
  tokensUsed: {
    prompt: number;
    completion: number;
    total: number;
  };
  cost: number;
  errors: string[];
}

export class ReviewEngine {
  private storage: StorageManager;
  private prService: PullRequestService;
  private commentService: CommentService;
  private aiProvider: BaseProvider;
  private maxFilesPerBatch: number;
  private maxLinesPerFile: number;
  private autoCleanOutdated: boolean;

  constructor(options: ReviewEngineOptions) {
    this.storage = options.storage;
    this.prService = options.prService;
    this.commentService = options.commentService;
    this.aiProvider = options.aiProvider;
    this.maxFilesPerBatch = options.maxFilesPerBatch || 10;
    this.maxLinesPerFile = options.maxLinesPerFile || 500;
    this.autoCleanOutdated = options.autoCleanOutdated ?? true;
  }

  /**
   * Execute complete review workflow
   */
  async executeReview(
    owner: string,
    repo: string,
    prNumber: number
  ): Promise<ReviewResult> {
    const sessionId = `review-${Date.now()}`;
    const logger = new Logger('ReviewEngine', { sessionId });

    logger.info('🚀 Starting code review workflow');

    const result: ReviewResult = {
      success: false,
      filesReviewed: 0,
      commentsCreated: 0,
      outdatedCleaned: 0,
      tokensUsed: { prompt: 0, completion: 0, total: 0 },
      cost: 0,
      errors: [],
    };

    try {
      // 1. Get PR information
      logger.info('📥 Fetching PR information');
      const pr = await this.prService.getPullRequest(owner, repo, prNumber);
      const files = await this.prService.getFiles(owner, repo, prNumber);

      logger.info(`📦 PR #${prNumber}: ${pr.title} (${files.length} files)`);

      // 2. Initialize incremental analyzer
      const analyzer = new IncrementalAnalyzer(this.storage, owner, repo, prNumber);

      // 3. Analyze files to determine what needs review
      logger.info('🔍 Analyzing files for changes');
      const analyses = await analyzer.analyzeFiles(files);
      const needsReview = IncrementalAnalyzer.getFilesNeedingReview(analyses);

      logger.info(`✓ ${needsReview.length}/${files.length} files need review`);

      if (needsReview.length === 0) {
        logger.info('✅ No changes to review');
        result.success = true;
        return result;
      }

      // 4. Clean outdated comments
      if (this.autoCleanOutdated) {
        logger.info('🧹 Cleaning outdated comments');
        const cleaner = new OutdatedCommentCleaner(this.storage, prNumber);
        const cleanResult = await cleaner.checkAndMarkOutdated(pr.head.sha);
        result.outdatedCleaned = cleanResult.markedOutdated;
        
        if (cleanResult.errors.length > 0) {
          result.errors.push(...cleanResult.errors);
        }
      }

      // 5. Review files in batches
      for (let i = 0; i < needsReview.length; i += this.maxFilesPerBatch) {
        const batch = needsReview.slice(i, i + this.maxFilesPerBatch);
        logger.info(`📝 Reviewing batch ${Math.floor(i / this.maxFilesPerBatch) + 1} (${batch.length} files)`);

        try {
          await this.reviewBatch(
            owner,
            repo,
            prNumber,
            pr,
            batch,
            files,
            sessionId,
            result
          );
        } catch (error) {
          const errorMsg = `Batch review failed: ${error}`;
          result.errors.push(errorMsg);
          logger.error(errorMsg);
        }
      }

      // 6. Save final cache state
      await this.storage.savePRCache({
        prNumber,
        owner,
        repo,
        lastCommitSha: pr.head.sha,
        files: [],
        tokenUsage: {
          promptTokens: result.tokensUsed.prompt,
          completionTokens: result.tokensUsed.completion,
          totalTokens: result.tokensUsed.total,
          estimatedCost: result.cost,
        },
        metadata: {
          cacheVersion: 1,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          reviewCount: 1,
        },
      });

      result.success = result.errors.length === 0;
      logger.info(`✅ Review complete: ${result.filesReviewed} files, ${result.commentsCreated} comments`);

    } catch (error) {
      const errorMsg = `Review workflow failed: ${error}`;
      result.errors.push(errorMsg);
      logger.error(errorMsg);
    }

    return result;
  }

  /**
   * Review a batch of files
   */
  private async reviewBatch(
    owner: string,
    repo: string,
    prNumber: number,
    pr: any,
    batch: FileAnalysis[],
    allFiles: PRFile[],
    sessionId: string,
    result: ReviewResult
  ): Promise<void> {
    // Build prompt context
    const batchFiles = batch.map(analysis => {
      const file = allFiles.find(f => f.filename === analysis.filename)!;
      return file;
    });

    const context = PromptBuilder.createContext(
      `${owner}/${repo}`,
      prNumber,
      pr.title,
      pr.body || '',
      pr.user.login,
      pr.head.ref,
      pr.base.ref,
      batchFiles
    );

    // Validate context
    const validation = PromptBuilder.validateContext(context);
    if (!validation.valid) {
      throw new Error(`Invalid context: ${validation.errors.join(', ')}`);
    }

    // Build prompt
    const prompt = await PromptBuilder.buildReviewPrompt(context);
    const promptTokens = TokenCounter.estimate(prompt);

    core.debug(`Prompt: ${promptTokens} tokens`);

    // Send to AI provider
    const response = await this.aiProvider.sendMessage(prompt);
    const completionTokens = TokenCounter.estimate(response);

    result.tokensUsed.prompt += promptTokens;
    result.tokensUsed.completion += completionTokens;
    result.tokensUsed.total += promptTokens + completionTokens;

    // Estimate cost
    const batchCost = await this.aiProvider.estimateCost(promptTokens, completionTokens);
    result.cost += batchCost;

    // Parse response
    const parseResult = ResponseParser.parse(response);

    if (!parseResult.success) {
      throw new Error(`Failed to parse AI response: ${parseResult.errors?.join(', ')}`);
    }

    const comments = parseResult.data!.comments;
    core.info(`📋 Received ${comments.length} review comments`);

    // Deduplicate and validate
    const validComments = ResponseParser.deduplicateComments(comments);

    // Create comments on GitHub
    for (const comment of validComments) {
      try {
        const file = allFiles.find(f => f.filename === comment.path);
        if (!file) {
          core.warning(`⚠️ File not found: ${comment.path}`);
          continue;
        }

        const body = ResponseParser.formatForGitHub(comment);

        await this.commentService.createReviewComment(
          owner,
          repo,
          prNumber,
          file.filename,
          comment.line,
          body,
          pr.head.sha
        );

        result.commentsCreated++;
        core.debug(`✓ Created comment on ${comment.path}:${comment.line}`);

      } catch (error) {
        const errorMsg = `Failed to create comment: ${error}`;
        result.errors.push(errorMsg);
        core.warning(errorMsg);
      }
    }

    result.filesReviewed += batch.length;
  }
}
