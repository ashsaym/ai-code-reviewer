/**
 * Full Scan Types and Interfaces
 */

export type ScanType = 'security' | 'quality' | 'documentation' | 'architecture' | 'all';
export type ScanScope = 'full-codebase' | 'src-only' | 'tests-excluded';

export interface FileMetadata {
  path: string;
  relativePath: string;
  size: number;
  lines: number;
  extension: string;
  language: string;
  module: string;
  tokens: number;
  hash: string;
  content?: string;
}

export interface CodebaseMap {
  projectName: string;
  rootPath: string;
  timestamp: string;
  statistics: {
    totalFiles: number;
    totalLines: number;
    totalTokens: number;
    filesByLanguage: Record<string, number>;
    filesByModule: Record<string, number>;
  };
  structure: DirectoryNode;
  files: FileMetadata[];
  dependencies: DependencyInfo;
  configuration: ConfigurationFiles;
}

export interface DirectoryNode {
  name: string;
  path: string;
  type: 'directory' | 'file';
  children?: DirectoryNode[];
  metadata?: FileMetadata;
}

export interface DependencyInfo {
  packageJson?: any;
  lockFiles: string[];
  imports: Record<string, string[]>;
  exports: Record<string, string[]>;
}

export interface ConfigurationFiles {
  typescript?: any;
  eslint?: any;
  prettier?: any;
  jest?: any;
  dockerfile?: string;
  cicd: string[];
  env: string[];
}

export interface FileGroup {
  id: string;
  name: string;
  description: string;
  files: FileMetadata[];
  totalTokens: number;
  priority: number;
  category: 'security' | 'business-logic' | 'infrastructure' | 'tests' | 'docs' | 'config';
}

export interface ScanPhase {
  name: string;
  description: string;
  fileGroups: FileGroup[];
  systemPrompt: string;
  maxTokensPerCall: number;
  expectedCalls: number;
}

export interface Finding {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  category: string;
  title: string;
  description: string;
  file: string;
  line?: number;
  code?: string;
  recommendation: string;
  references?: string[];
}

export interface ModuleAnalysis {
  moduleName: string;
  filesAnalyzed: number;
  tokensUsed: number;
  findings: Finding[];
  summary: string;
  recommendations: string[];
}

export interface ScanResult {
  scanId: string;
  scanType: ScanType;
  timestamp: string;
  duration: number;
  codebaseMap: CodebaseMap;
  phases: {
    name: string;
    moduleAnalyses: ModuleAnalysis[];
    summary: string;
  }[];
  overallFindings: Finding[];
  statistics: {
    totalFiles: number;
    filesAnalyzed: number;
    totalCalls: number;
    totalTokens: number;
    criticalIssues: number;
    highIssues: number;
    mediumIssues: number;
    lowIssues: number;
  };
  recommendations: {
    immediate: string[];
    shortTerm: string[];
    longTerm: string[];
  };
  executiveSummary: string;
}

export interface HTMLReportOptions {
  title: string;
  includeSourceCode: boolean;
  syntaxHighlighting: boolean;
  interactiveFilters: boolean;
  generatePDF: boolean;
}
