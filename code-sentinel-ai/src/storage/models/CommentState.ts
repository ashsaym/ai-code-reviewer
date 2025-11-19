/**
 * Comment state stored in PR comments as HTML metadata
 */
export interface CommentState {
  /** PR number */
  prNumber: number;
  
  /** File path */
  filePath: string;
  
  /** Line number (or null for file-level comments) */
  line: number | null;
  
  /** Comment ID on GitHub */
  commentId: number;
  
  /** Commit SHA when comment was created */
  commitSha: string;
  
  /** Comment body (visible to users) */
  body: string;
  
  /** Severity level */
  severity: 'info' | 'warning' | 'error';
  
  /** Whether comment is outdated (code changed) */
  isOutdated: boolean;
  
  /** Timestamp when comment was created */
  createdAt: string;
  
  /** Timestamp when comment was last updated */
  updatedAt: string;
  
  /** Metadata encoded in HTML comment */
  metadata: {
    /** Code Sentinel AI version */
    version: string;
    
    /** Review session ID */
    sessionId: string;
    
    /** Git diff position */
    position?: number;
    
    /** Original line number (before changes) */
    originalLine?: number;
    
    /** Code snippet that was reviewed */
    codeSnippet?: string;
    
    /** Hash of reviewed code for change detection */
    codeHash?: string;
  };
}

/**
 * HTML metadata format for embedding in comments
 */
export interface CommentMetadata {
  /** Format version */
  v: string;
  
  /** Session ID */
  sid: string;
  
  /** File path */
  f: string;
  
  /** Line number */
  l: number | null;
  
  /** Commit SHA */
  c: string;
  
  /** Code hash */
  h?: string;
  
  /** Original line */
  ol?: number;
  
  /** Position */
  p?: number;
}
