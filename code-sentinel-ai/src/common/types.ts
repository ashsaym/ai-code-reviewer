/**
 * Common Types
 * 
 * Shared types across all modules
 */

export interface FileMetadata {
  path: string;
  relativePath: string;
  size: number;
  language: string;
  tokenCount: number;
  hash: string;
  lastModified: Date;
  content: string;
}

export interface DirectoryNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: DirectoryNode[];
  metadata?: Partial<FileMetadata>;
}

export interface DependencyInfo {
  packageJson?: {
    name?: string;
    version?: string;
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };
  requirementsTxt?: string[];
  goMod?: {
    module?: string;
    requires?: string[];
  };
}

export interface ConfigurationFiles {
  actionYml?: any;
  packageJson?: any;
  tsconfig?: any;
  eslintrc?: any;
  gitignore?: string[];
  dockerfiles?: string[];
}

export interface CodebaseMap {
  projectName: string;
  rootPath: string;
  timestamp: string;
  statistics: CodebaseStatistics;
  structure: DirectoryNode;
  files: FileMetadata[];
  dependencies: DependencyInfo;
  configuration: ConfigurationFiles;
}

export interface CodebaseStatistics {
  totalFiles: number;
  totalLines: number;
  totalTokens: number;
  languageBreakdown: Record<string, number>;
  directoryDepth: number;
}

export type ScanScope = 'full-codebase' | 'src-only' | 'tests-only' | 'docs-only' | 'config-only';

export interface BaseResult {
  timestamp: string;
  durationMs: number;
  tokensUsed: number;
  estimatedCost: number;
}
