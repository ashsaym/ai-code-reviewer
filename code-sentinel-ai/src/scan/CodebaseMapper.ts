/**
 * Codebase Mapper
 * 
 * Creates a comprehensive map of the entire codebase
 * - Directory structure
 * - File metadata
 * - Dependencies
 * - Configuration
 */

import { readFileSync, statSync } from 'fs';
import { join, relative, extname, basename } from 'path';
import { glob } from 'glob';
import * as core from '@actions/core';
import { TokenCounter } from '../utils/TokenCounter';
import { createHash } from 'crypto';
import {
  CodebaseMap,
  FileMetadata,
  DirectoryNode,
  DependencyInfo,
  ConfigurationFiles,
  ScanScope,
} from './types';

export class CodebaseMapper {
  private rootPath: string;
  private scope: ScanScope;
  private customIncludePatterns?: string[];
  private customExcludePatterns?: string[];

  constructor(
    rootPath: string,
    scope: ScanScope = 'full-codebase',
    customIncludePatterns?: string[],
    customExcludePatterns?: string[]
  ) {
    this.rootPath = rootPath;
    this.scope = scope;
    this.customIncludePatterns = customIncludePatterns;
    this.customExcludePatterns = customExcludePatterns;
  }

  /**
   * Create complete codebase map
   */
  async createMap(): Promise<CodebaseMap> {
    core.startGroup('📊 Mapping Codebase');
    
    const startTime = Date.now();

    // 1. Get all files based on scope
    const allFiles = await this.getAllFiles();
    core.info(`Found ${allFiles.length} files to analyze`);

    // 2. Create file metadata
    const files = await this.createFileMetadata(allFiles);
    core.info(`Processed ${files.length} files`);

    // 3. Build directory structure
    const structure = this.buildDirectoryTree(files);

    // 4. Extract dependencies
    const dependencies = await this.extractDependencies();

    // 5. Load configuration files
    const configuration = await this.loadConfiguration();

    // 6. Calculate statistics
    const statistics = this.calculateStatistics(files);

    const duration = Date.now() - startTime;
    core.info(`✓ Codebase mapped in ${(duration / 1000).toFixed(2)}s`);
    core.endGroup();

    return {
      projectName: this.getProjectName(),
      rootPath: this.rootPath,
      timestamp: new Date().toISOString(),
      statistics,
      structure,
      files,
      dependencies,
      configuration,
    };
  }

  /**
   * Get all files based on scope
   */
  private async getAllFiles(): Promise<string[]> {
    const patterns = this.getScopePatterns();
    const allFiles: string[] = [];

    for (const pattern of patterns.include) {
      const files = await glob(pattern, {
        cwd: this.rootPath,
        ignore: patterns.exclude,
        nodir: true,
        absolute: true,
      });
      allFiles.push(...files);
    }

    return [...new Set(allFiles)]; // Deduplicate
  }

  /**
   * Get file patterns based on scope
   */
  private getScopePatterns(): { include: string[]; exclude: string[] } {
    // If custom patterns provided, use them
    if (this.customIncludePatterns && this.customIncludePatterns.length > 0) {
      const excludePatterns = this.customExcludePatterns || [];
      return {
        include: this.customIncludePatterns,
        exclude: excludePatterns,
      };
    }

    // Default exclude patterns (can be extended by customExcludePatterns)
    const baseExclude = this.customExcludePatterns || [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/coverage/**',
      '**/.git/**',
      '**/*.min.js',
      '**/*.map',
      '**/package-lock.json',
      '**/yarn.lock',
      '**/pnpm-lock.yaml',
    ];

    if (this.scope === 'src-only') {
      return {
        include: ['src/**/*', 'lib/**/*'],
        exclude: [...baseExclude, '**/tests/**', '**/*.test.*', '**/*.spec.*'],
      };
    }

    if (this.scope === 'tests-excluded') {
      return {
        include: ['**/*'],
        exclude: [...baseExclude, '**/tests/**', '**/*.test.*', '**/*.spec.*'],
      };
    }

    // full-codebase
    return {
      include: ['**/*'],
      exclude: baseExclude,
    };
  }

  /**
   * Create metadata for each file
   */
  private async createFileMetadata(filePaths: string[]): Promise<FileMetadata[]> {
    const metadata: FileMetadata[] = [];

    for (const filePath of filePaths) {
      try {
        const stats = statSync(filePath);
        const content = readFileSync(filePath, 'utf-8');
        const lines = content.split('\n').length;
        const tokens = TokenCounter.estimate(content);
        const hash = createHash('md5').update(content).digest('hex');

        metadata.push({
          path: filePath,
          relativePath: relative(this.rootPath, filePath),
          size: stats.size,
          lines,
          extension: extname(filePath),
          language: this.detectLanguage(filePath),
          module: this.getModuleName(filePath),
          tokens,
          hash,
          content, // Store content for analysis
        });
      } catch (error) {
        core.warning(`Failed to process file ${filePath}: ${error}`);
      }
    }

    return metadata;
  }

  /**
   * Build directory tree structure
   */
  private buildDirectoryTree(files: FileMetadata[]): DirectoryNode {
    const root: DirectoryNode = {
      name: basename(this.rootPath),
      path: this.rootPath,
      type: 'directory',
      children: [],
    };

    for (const file of files) {
      const parts = file.relativePath.split('/');
      let current = root;

      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        const isLast = i === parts.length - 1;

        if (isLast) {
          // File node
          current.children!.push({
            name: part,
            path: file.path,
            type: 'file',
            metadata: file,
          });
        } else {
          // Directory node
          let child = current.children!.find(c => c.name === part);
          if (!child) {
            child = {
              name: part,
              path: join(current.path, part),
              type: 'directory',
              children: [],
            };
            current.children!.push(child);
          }
          current = child;
        }
      }
    }

    return root;
  }

  /**
   * Extract dependency information
   */
  private async extractDependencies(): Promise<DependencyInfo> {
    const dependencies: DependencyInfo = {
      lockFiles: [],
      imports: {},
      exports: {},
    };

    // Load package.json
    try {
      const packageJsonPath = join(this.rootPath, 'package.json');
      dependencies.packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
    } catch {
      core.debug('No package.json found');
    }

    // Find lock files
    const lockPatterns = ['**/package-lock.json', '**/yarn.lock', '**/pnpm-lock.yaml'];
    for (const pattern of lockPatterns) {
      const files = await glob(pattern, { cwd: this.rootPath, absolute: true });
      dependencies.lockFiles.push(...files);
    }

    return dependencies;
  }

  /**
   * Load configuration files
   */
  private async loadConfiguration(): Promise<ConfigurationFiles> {
    const config: ConfigurationFiles = {
      cicd: [],
      env: [],
    };

    // TypeScript
    try {
      const tsconfigPath = join(this.rootPath, 'tsconfig.json');
      config.typescript = JSON.parse(readFileSync(tsconfigPath, 'utf-8'));
    } catch {
      core.debug('No tsconfig.json found');
    }

    // ESLint
    try {
      const eslintPath = join(this.rootPath, '.eslintrc.json');
      config.eslint = JSON.parse(readFileSync(eslintPath, 'utf-8'));
    } catch {
      try {
        const eslintPath = join(this.rootPath, '.eslintrc.js');
        config.eslint = readFileSync(eslintPath, 'utf-8');
      } catch {
        core.debug('No ESLint config found');
      }
    }

    // Dockerfile
    try {
      const dockerfilePath = join(this.rootPath, 'Dockerfile');
      config.dockerfile = readFileSync(dockerfilePath, 'utf-8');
    } catch {
      core.debug('No Dockerfile found');
    }

    // CI/CD files
    const cicdPatterns = ['.github/workflows/**/*.yml', '.github/workflows/**/*.yaml'];
    for (const pattern of cicdPatterns) {
      const files = await glob(pattern, { cwd: this.rootPath, absolute: true });
      config.cicd.push(...files);
    }

    // Env files
    const envPatterns = ['**/.env*'];
    const files = await glob(envPatterns[0], { cwd: this.rootPath, absolute: true });
    config.env.push(...files);

    return config;
  }

  /**
   * Calculate statistics
   */
  private calculateStatistics(files: FileMetadata[]) {
    const filesByLanguage: Record<string, number> = {};
    const filesByModule: Record<string, number> = {};
    let totalLines = 0;
    let totalTokens = 0;

    for (const file of files) {
      // By language
      filesByLanguage[file.language] = (filesByLanguage[file.language] || 0) + 1;

      // By module
      filesByModule[file.module] = (filesByModule[file.module] || 0) + 1;

      totalLines += file.lines;
      totalTokens += file.tokens;
    }

    return {
      totalFiles: files.length,
      totalLines,
      totalTokens,
      filesByLanguage,
      filesByModule,
    };
  }

  /**
   * Detect programming language
   */
  private detectLanguage(filePath: string): string {
    const ext = extname(filePath).toLowerCase();
    const languageMap: Record<string, string> = {
      '.ts': 'TypeScript',
      '.tsx': 'TypeScript',
      '.js': 'JavaScript',
      '.jsx': 'JavaScript',
      '.py': 'Python',
      '.java': 'Java',
      '.go': 'Go',
      '.rb': 'Ruby',
      '.php': 'PHP',
      '.cs': 'C#',
      '.cpp': 'C++',
      '.c': 'C',
      '.rs': 'Rust',
      '.swift': 'Swift',
      '.kt': 'Kotlin',
      '.json': 'JSON',
      '.yml': 'YAML',
      '.yaml': 'YAML',
      '.md': 'Markdown',
      '.sh': 'Shell',
      '.sql': 'SQL',
      '.html': 'HTML',
      '.css': 'CSS',
      '.scss': 'SCSS',
    };

    return languageMap[ext] || 'Unknown';
  }

  /**
   * Get module name from file path
   */
  private getModuleName(filePath: string): string {
    const rel = relative(this.rootPath, filePath);
    const parts = rel.split('/');
    
    // Return first meaningful directory
    if (parts[0] === 'src' || parts[0] === 'lib') {
      return parts[1] || parts[0];
    }
    
    return parts[0] || 'root';
  }

  /**
   * Get project name
   */
  private getProjectName(): string {
    try {
      const packageJsonPath = join(this.rootPath, 'package.json');
      const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
      return packageJson.name || basename(this.rootPath);
    } catch {
      return basename(this.rootPath);
    }
  }

  /**
   * Save map to JSON file
   */
  async saveToFile(map: CodebaseMap, outputPath: string): Promise<void> {
    const fs = await import('fs/promises');
    await fs.writeFile(outputPath, JSON.stringify(map, null, 2), 'utf-8');
    core.info(`✓ Codebase map saved to ${outputPath}`);
  }
}
