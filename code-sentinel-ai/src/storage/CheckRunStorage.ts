/**
 * Check Run Storage
 * 
 * Uses GitHub Check Runs API for review history and annotations
 * - Visible in PR checks UI
 * - Supports up to 50 annotations per update
 * - Permanent record of review sessions
 */

import * as core from '@actions/core';
import { Octokit } from '@octokit/rest';
import { CheckRun, CheckRunAnnotation, ReviewSession } from './models';

export interface CheckRunStorageOptions {
  /** Octokit instance */
  octokit: Octokit;
  
  /** Repository owner */
  owner: string;
  
  /** Repository name */
  repo: string;
  
  /** Check run name */
  checkName?: string;
}

export class CheckRunStorage {
  private readonly octokit: Octokit;
  private readonly owner: string;
  private readonly repo: string;
  private readonly checkName: string;

  constructor(options: CheckRunStorageOptions) {
    this.octokit = options.octokit;
    this.owner = options.owner;
    this.repo = options.repo;
    this.checkName = options.checkName || 'Code Sentinel AI Review';
  }

  /**
   * Create a new check run
   */
  async createCheckRun(headSha: string, prNumber: number): Promise<CheckRun> {
    try {
      const response = await this.octokit.checks.create({
        owner: this.owner,
        repo: this.repo,
        name: this.checkName,
        head_sha: headSha,
        status: 'in_progress',
        started_at: new Date().toISOString(),
        output: {
          title: 'Code Sentinel AI Review',
          summary: `🛡️ Analyzing PR #${prNumber}...`,
        },
      });

      const checkRun: CheckRun = {
        id: response.data.id,
        name: this.checkName,
        headSha,
        status: 'in_progress',
        conclusion: null,
        startedAt: response.data.started_at || new Date().toISOString(),
        completedAt: null,
        output: {
          title: 'Code Sentinel AI Review',
          summary: `🛡️ Analyzing PR #${prNumber}...`,
        },
      };

      core.info(`✅ Created check run #${checkRun.id}`);
      return checkRun;
    } catch (error) {
      core.error(`Failed to create check run: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Update check run status
   */
  async updateCheckRun(
    checkRunId: number,
    status: CheckRun['status'],
    conclusion?: CheckRun['conclusion'],
    output?: CheckRun['output']
  ): Promise<void> {
    try {
      const updateData = {
        owner: this.owner,
        repo: this.repo,
        check_run_id: checkRunId,
        status,
        ...(status === 'completed' && {
          completed_at: new Date().toISOString(),
          conclusion: conclusion || 'success',
        }),
        ...(output && { output }),
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await this.octokit.checks.update(updateData as any);
      core.info(`✅ Updated check run #${checkRunId} - status: ${status}`);
    } catch (error) {
      core.error(`Failed to update check run: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Add annotations to check run (max 50 per update)
   */
  async addAnnotations(checkRunId: number, annotations: CheckRunAnnotation[]): Promise<void> {
    // GitHub allows max 50 annotations per update
    const batches: CheckRunAnnotation[][] = [];
    
    for (let i = 0; i < annotations.length; i += 50) {
      batches.push(annotations.slice(i, i + 50));
    }

    try {
      for (const batch of batches) {
        await this.octokit.checks.update({
          owner: this.owner,
          repo: this.repo,
          check_run_id: checkRunId,
          output: {
            title: 'Code Sentinel AI Review',
            summary: `Found ${annotations.length} issues`,
            annotations: batch.map(a => ({
              path: a.path,
              start_line: a.startLine,
              end_line: a.endLine,
              annotation_level: a.annotationLevel,
              message: a.message,
              title: a.title,
              raw_details: a.rawDetails,
              start_column: a.startColumn,
              end_column: a.endColumn,
            })),
          },
        });

        core.info(`✅ Added ${batch.length} annotations to check run #${checkRunId}`);
      }
    } catch (error) {
      core.error(`Failed to add annotations: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Complete check run with final results
   */
  async completeCheckRun(
    checkRunId: number,
    conclusion: CheckRun['conclusion'],
    summary: string,
    details?: string,
    annotations?: CheckRunAnnotation[]
  ): Promise<void> {
    try {
      const output: CheckRun['output'] = {
        title: 'Code Sentinel AI Review',
        summary,
        text: details,
      };

      // Add annotations if provided (max 50)
      if (annotations && annotations.length > 0) {
        await this.addAnnotations(checkRunId, annotations);
      }

      await this.updateCheckRun(checkRunId, 'completed', conclusion, output);
      core.info(`✅ Completed check run #${checkRunId} with conclusion: ${conclusion}`);
    } catch (error) {
      core.error(`Failed to complete check run: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Create review session record in check run
   */
  async createReviewSession(
    headSha: string,
    prNumber: number,
    sessionId: string,
    stats: ReviewSession['stats'],
    metadata: ReviewSession['metadata']
  ): Promise<ReviewSession> {
    const checkRun = await this.createCheckRun(headSha, prNumber);

    const session: ReviewSession = {
      sessionId,
      prNumber,
      repository: {
        owner: this.owner,
        name: this.repo,
      },
      commitSha: headSha,
      checkRunId: checkRun.id,
      stats,
      metadata,
    };

    return session;
  }

  /**
   * Finalize review session
   */
  async finalizeReviewSession(session: ReviewSession, annotations: CheckRunAnnotation[]): Promise<void> {
    const { stats, metadata } = session;
    
    // Build summary
    const summary = this.buildReviewSummary(stats, metadata);
    
    // Build details
    const details = this.buildReviewDetails(stats, metadata);
    
    // Determine conclusion
    const conclusion = stats.issuesFound > 0 ? 'failure' : 'success';
    
    await this.completeCheckRun(
      session.checkRunId,
      conclusion,
      summary,
      details,
      annotations
    );

    core.info(`✅ Finalized review session: ${session.sessionId}`);
  }

  /**
   * Build review summary
   */
  private buildReviewSummary(stats: ReviewSession['stats'], metadata: ReviewSession['metadata']): string {
    const duration = (metadata.durationMs / 1000).toFixed(2);
    const cost = stats.tokenUsage.estimatedCost.toFixed(4);

    return `
🛡️ **Code Sentinel AI Review Complete**

📊 **Results:**
- Files Reviewed: ${stats.filesReviewed}
- Lines Reviewed: ${stats.linesReviewed}
- Issues Found: ${stats.issuesFound} 🔴
- Warnings: ${stats.warningsFound} ⚠️
- Suggestions: ${stats.suggestionsFound} 💡

⚡ **Performance:**
- Duration: ${duration}s
- Tokens Used: ${stats.tokenUsage.totalTokens.toLocaleString()}
- Estimated Cost: $${cost}

🤖 **Model:** ${metadata.model} (${metadata.provider})
`.trim();
  }

  /**
   * Build review details
   */
  private buildReviewDetails(stats: ReviewSession['stats'], metadata: ReviewSession['metadata']): string {
    return `
## Token Usage Breakdown

| Metric | Value |
|--------|-------|
| Prompt Tokens | ${stats.tokenUsage.promptTokens.toLocaleString()} |
| Completion Tokens | ${stats.tokenUsage.completionTokens.toLocaleString()} |
| Total Tokens | ${stats.tokenUsage.totalTokens.toLocaleString()} |
| Estimated Cost | $${stats.tokenUsage.estimatedCost.toFixed(4)} |

## Review Metadata

- **Provider:** ${metadata.provider}
- **Model:** ${metadata.model}
- **Version:** ${metadata.version}
- **Started:** ${new Date(metadata.startedAt).toLocaleString()}
- **Completed:** ${new Date(metadata.completedAt).toLocaleString()}
- **Duration:** ${(metadata.durationMs / 1000).toFixed(2)}s

## Review Scope

- **Files Reviewed:** ${stats.filesReviewed}
- **Lines Reviewed:** ${stats.linesReviewed}

---

*Powered by Code Sentinel AI v${metadata.version}*
`.trim();
  }

  /**
   * Get check run by ID
   */
  async getCheckRun(checkRunId: number): Promise<CheckRun | null> {
    try {
      const response = await this.octokit.checks.get({
        owner: this.owner,
        repo: this.repo,
        check_run_id: checkRunId,
      });

      const data = response.data;

      return {
        id: data.id,
        name: data.name,
        headSha: data.head_sha,
        status: data.status as CheckRun['status'],
        conclusion: data.conclusion as CheckRun['conclusion'],
        startedAt: data.started_at || new Date().toISOString(),
        completedAt: data.completed_at || null,
        output: {
          title: data.output?.title || '',
          summary: data.output?.summary || '',
          text: data.output?.text || undefined,
        },
        externalUrl: data.external_id || undefined,
      };
    } catch (error) {
      core.warning(`Failed to get check run: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }

  /**
   * List check runs for a commit
   */
  async listCheckRuns(headSha: string): Promise<CheckRun[]> {
    try {
      const response = await this.octokit.checks.listForRef({
        owner: this.owner,
        repo: this.repo,
        ref: headSha,
        check_name: this.checkName,
        per_page: 100,
      });

      return response.data.check_runs.map(data => ({
        id: data.id,
        name: data.name,
        headSha: data.head_sha,
        status: data.status as CheckRun['status'],
        conclusion: data.conclusion as CheckRun['conclusion'],
        startedAt: data.started_at || new Date().toISOString(),
        completedAt: data.completed_at || null,
        output: {
          title: data.output?.title || '',
          summary: data.output?.summary || '',
          text: data.output?.text || undefined,
        },
        externalUrl: data.external_id || undefined,
      }));
    } catch (error) {
      core.warning(`Failed to list check runs: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
  }

  /**
   * Convert review findings to annotations
   */
  static createAnnotation(
    filePath: string,
    line: number,
    severity: 'info' | 'warning' | 'error',
    message: string,
    title?: string
  ): CheckRunAnnotation {
    const levelMap: Record<string, CheckRunAnnotation['annotationLevel']> = {
      info: 'notice',
      warning: 'warning',
      error: 'failure',
    };

    return {
      path: filePath,
      startLine: line,
      endLine: line,
      annotationLevel: levelMap[severity],
      message,
      title: title || `${severity.toUpperCase()}: Issue detected`,
    };
  }
}
