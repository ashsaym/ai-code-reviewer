/**
 * Cache entry stored in GitHub Actions Cache
 */
export interface CacheEntry {
  /** Unique cache key */
  key: string;
  
  /** Cache version for invalidation */
  version: number;
  
  /** Timestamp when cache was created */
  createdAt: string;
  
  /** Timestamp when cache expires (max 7 days) */
  expiresAt: string;
  
  /** Cache data */
  data: unknown;
}

/**
 * File analysis cache entry
 */
export interface FileAnalysisCache {
  /** File path */
  filePath: string;
  
  /** Git blob SHA */
  sha: string;
  
  /** Line-by-line review state */
  lines: {
    [lineNumber: number]: {
      /** Review comment ID */
      commentId: number;
      
      /** Comment body */
      body: string;
      
      /** Severity level */
      severity: 'info' | 'warning' | 'error';
      
      /** Timestamp when reviewed */
      reviewedAt: string;
      
      /** Whether comment is still valid */
      isValid: boolean;
    };
  };
  
  /** Overall file review summary */
  summary?: string;
  
  /** Timestamp when file was last analyzed */
  lastAnalyzedAt: string;
}

/**
 * PR-level cache entry
 */
export interface PRCache {
  /** PR number */
  prNumber: number;
  
  /** Repository owner */
  owner: string;
  
  /** Repository name */
  repo: string;
  
  /** Last analyzed commit SHA */
  lastCommitSha: string;
  
  /** File analysis cache */
  files: FileAnalysisCache[];
  
  /** Token usage statistics */
  tokenUsage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    estimatedCost: number;
  };
  
  /** Cache metadata */
  metadata: {
    cacheVersion: number;
    createdAt: string;
    updatedAt: string;
    reviewCount: number;
  };
}
