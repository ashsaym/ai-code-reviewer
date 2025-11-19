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
import { IncrementalReviewStrategy } from './IncrementalReviewStrategy';
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
  incrementalMode?: boolean;
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
  private autoCleanOutdated: boolean;
  private incrementalMode: boolean;
  private incrementalProcessedThisRun: boolean = false;

  constructor(options: ReviewEngineOptions) {
    this.storage = options.storage;
    this.prService = options.prService;
    this.commentService = options.commentService;
    this.aiProvider = options.aiProvider;
    this.maxFilesPerBatch = options.maxFilesPerBatch || 10;
    this.autoCleanOutdated = options.autoCleanOutdated ?? true;
    this.incrementalMode = options.incrementalMode ?? true;
  }

  /**
   * Create summary for incremental review with change stats
   */
  private createIncrementalSummary(
    aiSummary: string,
    incrementalResult: { commentsDeleted: number; threadsResolved: number; newIssuesCreated: number; reviewsDismissed: number; oldIssues: Array<{ path: string; line: number; message: string; severity: string }>; issuesResolved: Array<{ path: string; line: number; message: string; severity: string }>; issuesUpdated: Array<{ path: string; line: number; oldMessage: string; newMessage: string; severity: string }>; issuesNew: Array<{ path: string; line: number; message: string; severity: string }> }
  ): string {
    const timestamp = new Date().toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'UTC',
      timeZoneName: 'short'
    });

    let summary = `## 🔄 Code Review Updated - ${timestamp}\n\n`;
    
    // Show changes since last review
    const hasChanges = incrementalResult.issuesResolved.length > 0 || 
                       incrementalResult.issuesUpdated.length > 0 || 
                       incrementalResult.issuesNew.length > 0;
    
    if (hasChanges) {
      summary += `### 📊 Changes Since Last Review\n\n`;
      
      if (incrementalResult.issuesResolved.length > 0) {
        summary += `✅ **${incrementalResult.issuesResolved.length} issue(s) resolved** (code was fixed)\n`;
        incrementalResult.issuesResolved.slice(0, 5).forEach((issue: { path: string; line: number; message: string; severity: string }) => {
          const severityIcon = issue.severity === 'error' ? '🔴' : issue.severity === 'warning' ? '🟡' : 'ℹ️';
          summary += `  - \`${issue.path}:${issue.line}\` - ${severityIcon} ${issue.severity.toUpperCase()}\n`;
        });
        if (incrementalResult.issuesResolved.length > 5) {
          summary += `  - *...and ${incrementalResult.issuesResolved.length - 5} more*\n`;
        }
        summary += `\n`;
      }
      
      if (incrementalResult.issuesUpdated.length > 0) {
        summary += `🔄 **${incrementalResult.issuesUpdated.length} issue(s) updated** (different problems on same lines)\n`;
        incrementalResult.issuesUpdated.slice(0, 5).forEach((issue: { path: string; line: number; oldMessage: string; newMessage: string; severity: string }) => {
          const severityIcon = issue.severity === 'error' ? '🔴' : issue.severity === 'warning' ? '🟡' : 'ℹ️';
          summary += `  - \`${issue.path}:${issue.line}\` - ${severityIcon} ${issue.severity.toUpperCase()}\n`;
        });
        if (incrementalResult.issuesUpdated.length > 5) {
          summary += `  - *...and ${incrementalResult.issuesUpdated.length - 5} more*\n`;
        }
        summary += `\n`;
      }
      
      if (incrementalResult.issuesNew.length > 0) {
        summary += `🆕 **${incrementalResult.issuesNew.length} new issue(s) found**\n`;
        incrementalResult.issuesNew.slice(0, 5).forEach((issue: { path: string; line: number; message: string; severity: string }) => {
          const severityIcon = issue.severity === 'error' ? '🔴' : issue.severity === 'warning' ? '🟡' : 'ℹ️';
          summary += `  - \`${issue.path}:${issue.line}\` - ${severityIcon} ${issue.severity.toUpperCase()}\n`;
        });
        if (incrementalResult.issuesNew.length > 5) {
          summary += `  - *...and ${incrementalResult.issuesNew.length - 5} more*\n`;
        }
        summary += `\n`;
      }
    }
    
    if (incrementalResult.newIssuesCreated === 0) {
      summary += `\n✨ **All clean!** No new issues found.\n`;
    } else {
      summary += `\n### 📋 Current Issues (${incrementalResult.newIssuesCreated} active)\n\n`;
      summary += `See inline comments below for details.\n`;
    }
    
    if (aiSummary) {
      summary += `\n### 🤖 AI Analysis\n\n${aiSummary}\n`;
    }
    
    return summary;
  }

  /**
   * Execute complete review workflow
   */
  async executeReview(
    owner: string,
    repo: string,
    prNumber: number
  ): Promise<ReviewResult> {
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
      this.incrementalProcessedThisRun = false; // Reset for this PR review
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

    // Check if we should use incremental mode
    const incrementalStrategy = new IncrementalReviewStrategy(
      this.commentService
    );

    // Use incremental mode if configured, there's an existing review, AND we haven't processed it yet this run
    const shouldUseIncremental = this.incrementalMode && 
      !this.incrementalProcessedThisRun &&
      await incrementalStrategy.shouldUseIncrementalMode(prNumber);
    
    if (shouldUseIncremental) {
      this.incrementalProcessedThisRun = true; // Mark as processed
    }

    // Create single review with summary + all inline comments
    if (reviewComments.length > 0) {
      try {
        if (shouldUseIncremental) {
          // Incremental mode: update existing review and manage comment lifecycle
          core.info('🔄 Using incremental review mode');
          
          const latestReviewId = await incrementalStrategy.findLatestReview(prNumber);
          const incrementalResult = await incrementalStrategy.processIncrementalUpdate(
            prNumber,
            pr.headSha,
            latestReviewId,
            reviewComments,
            parseResult.data?.summary || '',
            batch
          );

          result.outdatedCleaned += incrementalResult.commentsDeleted;
          
          core.info(`✓ Incremental cleanup: ${incrementalResult.commentsDeleted} old comments deleted, ${incrementalResult.threadsResolved} threads resolved, ${incrementalResult.newIssuesCreated} new issues`);
          
          // Create incremental summary with stats
          const incrementalSummary = this.createIncrementalSummary(
            parseResult.data?.summary || '',
            incrementalResult
          );
          
          // Post new/remaining comments with incremental summary
          if (reviewComments.length > 0) {
            await this.commentService.createReview(
              prNumber,
              pr.headSha,
              incrementalSummary,
              'COMMENT',
              reviewComments
            );
            result.commentsCreated = reviewComments.length;
            core.info(`✓ Posted ${reviewComments.length} new/updated inline comments`);
          }
        } else {
          // First review: create new review
          core.info('📝 Creating new review');
          
          const summary = ResponseParser.createReviewSummary(
            validComments,
            parseResult.data!.summary,
            this.aiProvider.getModel()
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
        }

      } catch (error) {
        const errorMsg = `Failed to create review: ${error}`;
        result.errors.push(errorMsg);
        core.error(errorMsg);
      }
    }

    result.filesReviewed += batch.length;
  }
}
