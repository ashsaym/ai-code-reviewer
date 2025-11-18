/**
 * Check run stored for review history
 */
export interface CheckRun {
  /** Check run ID on GitHub */
  id: number;
  
  /** Check run name */
  name: string;
  
  /** Head SHA */
  headSha: string;
  
  /** Status: queued, in_progress, completed */
  status: 'queued' | 'in_progress' | 'completed';
  
  /** Conclusion: success, failure, neutral, cancelled, skipped, timed_out, action_required */
  conclusion: 'success' | 'failure' | 'neutral' | 'cancelled' | 'skipped' | 'timed_out' | 'action_required' | null;
  
  /** Start time */
  startedAt: string;
  
  /** Completion time */
  completedAt: string | null;
  
  /** Check run output */
  output: {
    /** Title */
    title: string;
    
    /** Summary in Markdown */
    summary: string;
    
    /** Details in Markdown */
    text?: string;
    
    /** Annotations (max 50 per update) */
    annotations?: CheckRunAnnotation[];
  };
  
  /** External URL (optional) */
  externalUrl?: string;
}

/**
 * Check run annotation (inline review comment)
 */
export interface CheckRunAnnotation {
  /** File path */
  path: string;
  
  /** Start line */
  startLine: number;
  
  /** End line */
  endLine: number;
  
  /** Annotation level: notice, warning, failure */
  annotationLevel: 'notice' | 'warning' | 'failure';
  
  /** Message */
  message: string;
  
  /** Title (optional) */
  title?: string;
  
  /** Raw details (optional) */
  rawDetails?: string;
  
  /** Start column (optional, 1-indexed) */
  startColumn?: number;
  
  /** End column (optional, 1-indexed) */
  endColumn?: number;
}

/**
 * Review session stored in check run
 */
export interface ReviewSession {
  /** Session ID */
  sessionId: string;
  
  /** PR number */
  prNumber: number;
  
  /** Repository */
  repository: {
    owner: string;
    name: string;
  };
  
  /** Commit SHA */
  commitSha: string;
  
  /** Check run ID */
  checkRunId: number;
  
  /** Review statistics */
  stats: {
    filesReviewed: number;
    linesReviewed: number;
    issuesFound: number;
    warningsFound: number;
    suggestionsFound: number;
    tokenUsage: {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
      estimatedCost: number;
    };
  };
  
  /** Review metadata */
  metadata: {
    provider: 'openai' | 'openwebui';
    model: string;
    version: string;
    startedAt: string;
    completedAt: string;
    durationMs: number;
  };
}
