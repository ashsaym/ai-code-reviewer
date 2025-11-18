/**
 * Review Engine
 * 
 * Orchestrates the complete code review workflow
 */

import * as core from '@actions/core';
import { StorageManager } from '../storage/StorageManager';
import { PullRequestService, PRFile } from '../github/PullRequestService';
import { CommentService } from '../github/CommentService';
import { DiffParser } from '../github/DiffParser';
import { BaseProvider, AIMessage } from '../providers/BaseProvider';
import { IncrementalAnalyzer, FileAnalysis } from '../analysis/IncrementalAnalyzer';
import { OutdatedCommentCleaner } from '../analysis/OutdatedCommentCleaner';
import { PromptBuilder } from '../prompts/PromptBuilder';
import { ResponseParser } from '../parsers/ResponseParser';
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
    Logger.setContext('ReviewEngine');

    Logger.info('🚀 Starting code review workflow');

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
      Logger.info('📥 Fetching PR information');
      const pr = await this.prService.getPullRequest(prNumber);
      const files = await this.prService.getFiles(prNumber);

      Logger.info(`📦 PR #${prNumber}: ${pr.title} (${files.length} files)`);

      // 2. Initialize incremental analyzer
      const analyzer = new IncrementalAnalyzer(this.storage, owner, repo, prNumber);

      // 3. Analyze files to determine what needs review
      Logger.info('🔍 Analyzing files for changes');
      const analyses = await analyzer.analyzeFiles(files);
      const needsReview = IncrementalAnalyzer.getFilesNeedingReview(analyses);

      Logger.info(`✓ ${needsReview.length}/${files.length} files need review`);

      if (needsReview.length === 0) {
        Logger.info('✅ No changes to review');
        result.success = true;
        return result;
      }

      // 4. Clean outdated comments
      if (this.autoCleanOutdated) {
        Logger.info('🧹 Cleaning outdated comments');
        const cleaner = new OutdatedCommentCleaner(this.storage, prNumber);
        const cleanResult = await cleaner.checkAndMarkOutdated(pr.headSha);
        result.outdatedCleaned = cleanResult.markedOutdated;
        
        if (cleanResult.errors.length > 0) {
          result.errors.push(...cleanResult.errors);
        }
      }

      // 5. Review files in batches
      for (let i = 0; i < needsReview.length; i += this.maxFilesPerBatch) {
        const batch = needsReview.slice(i, i + this.maxFilesPerBatch);
        Logger.info(`📝 Reviewing batch ${Math.floor(i / this.maxFilesPerBatch) + 1} (${batch.length} files)`);

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
          Logger.error(errorMsg);
        }
      }

      // 6. Cache is automatically saved by storage manager
      // Token usage is tracked in result object
      
      result.success = result.errors.length === 0;
      Logger.info(`✅ Review complete: ${result.filesReviewed} files, ${result.commentsCreated} comments`);

    } catch (error) {
      const errorMsg = `Review workflow failed: ${error}`;
      result.errors.push(errorMsg);
      Logger.error(errorMsg);
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
      pr.body,
      pr.author,
      pr.headRef,
      pr.baseRef,
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
    const messages: AIMessage[] = [
      { role: 'user', content: prompt }
    ];
    const response = await this.aiProvider.sendMessage(messages);
    
    // Track token usage from response
    result.tokensUsed.prompt += response.usage.promptTokens;
    result.tokensUsed.completion += response.usage.completionTokens;
    result.tokensUsed.total += response.usage.totalTokens;

    // Estimate cost (simple calculation based on GPT-3.5 pricing)
    const promptCost = (response.usage.promptTokens / 1000000) * 0.15;
    const completionCost = (response.usage.completionTokens / 1000000) * 0.60;
    result.cost += promptCost + completionCost;

    // Parse response
    const parseResult = ResponseParser.parse(response.content);

    if (!parseResult.success) {
      throw new Error(`Failed to parse AI response: ${parseResult.errors?.join(', ')}`);
    }

    const comments = parseResult.data!.comments;
    core.info(`📋 Received ${comments.length} review comments`);

    // Deduplicate and validate
    const validComments = ResponseParser.deduplicateComments(comments);

    // Collect review comments with positions (like v1 - single review with summary + inline comments)
    const reviewComments: Array<{ path: string; position: number; body: string }> = [];

    for (const comment of validComments) {
      try {
        const file = allFiles.find(f => f.filename === comment.path);
        if (!file || !file.patch) {
          core.warning(`⚠️ File not found or no patch: ${comment.path}`);
          continue;
        }

        // Parse diff to get position (use parsePatch for GitHub API diffs)
        const parsedDiff = DiffParser.parsePatch(file.filename, file.patch);
        if (parsedDiff.hunks.length === 0) {
          core.warning(`⚠️ Could not parse diff for: ${comment.path}`);
          continue;
        }

        const position = DiffParser.getPositionForLine(parsedDiff, comment.line);
        if (!position) {
          core.warning(`⚠️ Line ${comment.line} not in diff for: ${comment.path}`);
          continue;
        }

        const body = ResponseParser.formatForGitHub(comment);

        reviewComments.push({
          path: file.filename,
          position,
          body,
        });

      } catch (error) {
        const errorMsg = `Failed to process comment: ${error}`;
        result.errors.push(errorMsg);
        core.warning(errorMsg);
      }
    }

    // Create single review with summary + all inline comments
    if (reviewComments.length > 0) {
      try {
        const summary = ResponseParser.createReviewSummary(
          validComments,
          parseResult.data!.summary
        );

        await this.commentService.createReview(
          prNumber,
          pr.headSha,
          summary,
          'COMMENT',
          reviewComments
        );

        result.commentsCreated = reviewComments.length;
        core.info(`✓ Created review with ${reviewComments.length} inline comments`);

      } catch (error) {
        const errorMsg = `Failed to create review: ${error}`;
        result.errors.push(errorMsg);
        core.error(errorMsg);
      }
    }

    result.filesReviewed += batch.length;
  }
}
