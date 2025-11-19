/**
 * Common Codebase Mapper
 * 
 * Shared codebase mapping functionality
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
  CodebaseStatistics,
} from './types';

export type DocumentationScope = 'full-codebase' | 'src-only' | 'tests-only' | 'docs-only' | 'config-only';

export class CodebaseMapper {
  private rootPath: string;
  private scope: DocumentationScope;
  private customIncludePatterns?: string[];
  private customExcludePatterns?: string[];

  constructor(
    rootPath: string,
    scope: DocumentationScope = 'full-codebase',
    customIncludePatterns?: string[],
    customExcludePatterns?: string[]
  ) {
    this.rootPath = rootPath;
    this.scope = scope;
    this.customIncludePatterns = customIncludePatterns;
    this.customExcludePatterns = customExcludePatterns;
  }

  async createMap(): Promise<CodebaseMap> {
    core.startGroup('📊 Mapping Codebase');
    
    const startTime = Date.now();
    
    core.info(`Scanning directory: ${this.rootPath}`);
    core.info(`Scope: ${this.scope}`);
    core.info(`Custom includes: ${this.customIncludePatterns?.join(', ') || 'none'}`);
    core.info(`Custom excludes: ${this.customExcludePatterns?.join(', ') || 'none'}`);

    const allFiles = await this.getAllFiles();
    core.info(`Found ${allFiles.length} files to analyze`);
    
    if (allFiles.length === 0) {
      const patterns = this.getScopePatterns();
      core.warning('⚠️ No files found! This could mean:');
      core.warning('  1. Wrong workspace path (check GITHUB_WORKSPACE or cwd)');
      core.warning('  2. Exclude patterns are too aggressive');
      core.warning('  3. Include patterns don\'t match any files');
      core.warning(`  Current path: ${this.rootPath}`);
      core.warning(`  Include patterns: ${patterns.include.join(', ')}`);
      core.warning(`  Exclude patterns: ${patterns.exclude.join(', ')}`);
      
      // Try to list files in directory to help diagnose
      try {
        const { readdirSync, statSync } = await import('fs');
        const { join } = await import('path');
        const dirContents = readdirSync(this.rootPath);
        core.warning(`  Directory contents (first 10):`);
        dirContents.slice(0, 10).forEach(item => {
          try {
            const itemPath = join(this.rootPath, item);
            const isDir = statSync(itemPath).isDirectory();
            core.warning(`    - ${item}${isDir ? '/' : ''}`);
          } catch {
            core.warning(`    - ${item}`);
          }
        });
        if (dirContents.length > 10) {
          core.warning(`    ... and ${dirContents.length - 10} more items`);
        }
      } catch (error) {
        core.warning(`  Could not read directory: ${error}`);
      }
    }

    const files = await this.createFileMetadata(allFiles);
    core.info(`Processed ${files.length} files`);

    const structure = this.buildDirectoryTree(files);
    const dependencies = await this.extractDependencies();
    const configuration = await this.loadConfiguration();
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

    return [...new Set(allFiles)];
  }

  private getScopePatterns(): { include: string[]; exclude: string[] } {
    const baseExclude = [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/.git/**',
      '**/coverage/**',
      '**/*.min.js',
      '**/*.map',
    ];

    const customExclude = this.customExcludePatterns || [];
    const exclude = [...baseExclude, ...customExclude];

    if (this.customIncludePatterns && this.customIncludePatterns.length > 0) {
      return { include: this.customIncludePatterns, exclude };
    }

    switch (this.scope) {
      case 'src-only':
        return {
          include: ['src/**/*', 'lib/**/*'],
          exclude,
        };
      case 'tests-only':
        return {
          include: ['**/*.test.*', '**/*.spec.*', 'tests/**/*', 'test/**/*'],
          exclude,
        };
      case 'docs-only':
        return {
          include: ['**/*.md', 'docs/**/*', '**/*.txt', '**/*.rst'],
          exclude,
        };
      case 'config-only':
        return {
          include: ['**/*.json', '**/*.yml', '**/*.yaml', '**/*.toml', '**/*.ini', '**/.env*'],
          exclude,
        };
      default:
        return {
          include: ['**/*'],
          exclude,
        };
    }
  }

  private async createFileMetadata(filePaths: string[]): Promise<FileMetadata[]> {
    const files: FileMetadata[] = [];

    for (const filePath of filePaths) {
      try {
        const stats = statSync(filePath);
        if (stats.size > 1_000_000) continue; // Skip files > 1MB

        const content = readFileSync(filePath, 'utf-8');
        const relativePath = relative(this.rootPath, filePath);
        const language = this.detectLanguage(filePath);
        const tokenCount = TokenCounter.estimate(content);
        const hash = createHash('sha256').update(content).digest('hex').slice(0, 8);

        files.push({
          path: filePath,
          relativePath,
          size: stats.size,
          language,
          tokenCount,
          hash,
          lastModified: stats.mtime,
          content,
        });
      } catch (error) {
        core.debug(`Failed to process ${filePath}: ${error}`);
      }
    }

    return files;
  }

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
      '.rs': 'Rust',
      '.cpp': 'C++',
      '.c': 'C',
      '.cs': 'C#',
      '.rb': 'Ruby',
      '.php': 'PHP',
      '.swift': 'Swift',
      '.kt': 'Kotlin',
      '.md': 'Markdown',
      '.json': 'JSON',
      '.yml': 'YAML',
      '.yaml': 'YAML',
      '.toml': 'TOML',
      '.xml': 'XML',
      '.html': 'HTML',
      '.css': 'CSS',
      '.scss': 'SCSS',
      '.sql': 'SQL',
      '.sh': 'Shell',
    };
    return languageMap[ext] || 'Unknown';
  }

  private buildDirectoryTree(files: FileMetadata[]): DirectoryNode {
    const root: DirectoryNode = {
      name: basename(this.rootPath),
      path: this.rootPath,
      type: 'directory',
      children: [],
    };

    files.forEach(file => {
      const parts = file.relativePath.split('/');
      let currentNode = root;

      parts.forEach((part, index) => {
        if (index === parts.length - 1) {
          currentNode.children!.push({
            name: part,
            path: file.path,
            type: 'file',
            metadata: file,
          });
        } else {
          let childDir = currentNode.children!.find(c => c.name === part && c.type === 'directory');
          if (!childDir) {
            childDir = {
              name: part,
              path: join(currentNode.path, part),
              type: 'directory',
              children: [],
            };
            currentNode.children!.push(childDir);
          }
          currentNode = childDir;
        }
      });
    });

    return root;
  }

  private async extractDependencies(): Promise<DependencyInfo> {
    const deps: DependencyInfo = {};

    try {
      const pkgPath = join(this.rootPath, 'package.json');
      const pkgContent = readFileSync(pkgPath, 'utf-8');
      deps.packageJson = JSON.parse(pkgContent);
    } catch {
      // package.json not found or invalid
    }

    try {
      const reqPath = join(this.rootPath, 'requirements.txt');
      const reqContent = readFileSync(reqPath, 'utf-8');
      deps.requirementsTxt = reqContent.split('\n').filter(l => l.trim());
    } catch {
      // requirements.txt not found
    }

    try {
      const goPath = join(this.rootPath, 'go.mod');
      const goContent = readFileSync(goPath, 'utf-8');
      const moduleMatch = goContent.match(/module\s+(.+)/);
      deps.goMod = {
        module: moduleMatch?.[1],
        requires: [],
      };
    } catch {
      // go.mod not found
    }

    return deps;
  }

  private async loadConfiguration(): Promise<ConfigurationFiles> {
    const config: ConfigurationFiles = {};

    try {
      const actionPath = join(this.rootPath, 'action.yml');
      const actionContent = readFileSync(actionPath, 'utf-8');
      config.actionYml = actionContent;
    } catch {
      // action.yml not found
    }

    try {
      const pkgPath = join(this.rootPath, 'package.json');
      const pkgContent = readFileSync(pkgPath, 'utf-8');
      config.packageJson = JSON.parse(pkgContent);
    } catch {
      // package.json not found or invalid
    }

    try {
      const tsPath = join(this.rootPath, 'tsconfig.json');
      const tsContent = readFileSync(tsPath, 'utf-8');
      config.tsconfig = JSON.parse(tsContent);
    } catch {
      // tsconfig.json not found or invalid
    }

    return config;
  }

  private calculateStatistics(files: FileMetadata[]): CodebaseStatistics {
    const languageBreakdown: Record<string, number> = {};
    let totalLines = 0;
    let totalTokens = 0;

    files.forEach(file => {
      languageBreakdown[file.language] = (languageBreakdown[file.language] || 0) + 1;
      totalLines += file.content.split('\n').length;
      totalTokens += file.tokenCount;
    });

    return {
      totalFiles: files.length,
      totalLines,
      totalTokens,
      languageBreakdown,
      directoryDepth: this.calculateMaxDepth(files),
    };
  }

  private calculateMaxDepth(files: FileMetadata[]): number {
    return Math.max(...files.map(f => f.relativePath.split('/').length));
  }

  private getProjectName(): string {
    try {
      const pkgPath = join(this.rootPath, 'package.json');
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
      return pkg.name || basename(this.rootPath);
    } catch {
      return basename(this.rootPath);
    }
  }
}
