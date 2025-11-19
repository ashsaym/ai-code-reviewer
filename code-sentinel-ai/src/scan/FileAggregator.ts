/**
 * File Aggregator
 * 
 * Intelligently groups files for analysis within token limits
 */

import { FileMetadata, FileGroup, CodebaseMap } from './types';

export class FileAggregator {
  private maxTokensPerGroup: number;

  constructor(maxTokensPerGroup: number = 120000) {
    this.maxTokensPerGroup = maxTokensPerGroup;
  }

  /**
   * Group files by module/feature with token awareness
   */
  groupByModule(codebaseMap: CodebaseMap): FileGroup[] {
    const groups = new Map<string, FileGroup>();
    
    for (const file of codebaseMap.files) {
      const category = this.categorizeFile(file);
      const priority = this.calculatePriority(file, category);
      const groupKey = `${category}-${file.module}`;

      if (!groups.has(groupKey)) {
        groups.set(groupKey, {
          id: groupKey,
          name: `${category}: ${file.module}`,
          description: `${category} analysis for ${file.module} module`,
          files: [],
          totalTokens: 0,
          priority,
          category,
        });
      }

      const group = groups.get(groupKey)!;
      
      // Check if adding this file exceeds token limit
      if (group.totalTokens + file.tokens <= this.maxTokensPerGroup) {
        group.files.push(file);
        group.totalTokens += file.tokens;
      } else {
        // Create new subgroup
        const partNumber = Array.from(groups.keys())
          .filter(k => k.startsWith(groupKey)).length + 1;
        
        const newGroupKey = `${groupKey}-part${partNumber}`;
        groups.set(newGroupKey, {
          id: newGroupKey,
          name: `${category}: ${file.module} (Part ${partNumber})`,
          description: `${category} analysis for ${file.module} module (continued)`,
          files: [file],
          totalTokens: file.tokens,
          priority,
          category,
        });
      }
    }

    // Sort by priority (highest first)
    return Array.from(groups.values()).sort((a, b) => b.priority - a.priority);
  }

  /**
   * Group files by category (security, quality, etc.)
   */
  groupByCategory(
    codebaseMap: CodebaseMap,
    category: 'security' | 'business-logic' | 'infrastructure' | 'tests' | 'docs' | 'config'
  ): FileGroup[] {
    const relevantFiles = codebaseMap.files.filter(
      f => this.categorizeFile(f) === category
    );

    return this.splitIntoTokenGroups(relevantFiles, category);
  }

  /**
   * Split files into groups respecting token limits
   */
  private splitIntoTokenGroups(
    files: FileMetadata[],
    category: 'security' | 'business-logic' | 'infrastructure' | 'tests' | 'docs' | 'config'
  ): FileGroup[] {
    const groups: FileGroup[] = [];
    let currentGroup: FileGroup = {
      id: `${category}-1`,
      name: `${category}-1`,
      description: `${category} analysis group 1`,
      files: [],
      totalTokens: 0,
      priority: 50,
      category,
    };

    for (const file of files) {
      if (currentGroup.totalTokens + file.tokens > this.maxTokensPerGroup) {
        // Save current group and start new one
        if (currentGroup.files.length > 0) {
          groups.push(currentGroup);
        }

        currentGroup = {
          id: `${category}-${groups.length + 1}`,
          name: `${category}-${groups.length + 1}`,
          description: `${category} analysis group ${groups.length + 1}`,
          files: [file],
          totalTokens: file.tokens,
          priority: 50,
          category,
        };
      } else {
        currentGroup.files.push(file);
        currentGroup.totalTokens += file.tokens;
      }
    }

    // Don't forget the last group
    if (currentGroup.files.length > 0) {
      groups.push(currentGroup);
    }

    return groups;
  }

  /**
   * Categorize file based on path and content
   */
  private categorizeFile(
    file: FileMetadata
  ): 'security' | 'business-logic' | 'infrastructure' | 'tests' | 'docs' | 'config' {
    const path = file.relativePath.toLowerCase();

    // Security-critical files
    if (
      path.includes('auth') ||
      path.includes('security') ||
      path.includes('crypto') ||
      path.includes('password') ||
      path.includes('token') ||
      path.includes('session') ||
      path.includes('.env') ||
      path.includes('secret') ||
      file.extension === '.pem' ||
      file.extension === '.key'
    ) {
      return 'security';
    }

    // Tests
    if (
      path.includes('test') ||
      path.includes('spec') ||
      path.includes('__tests__') ||
      path.includes('__mocks__')
    ) {
      return 'tests';
    }

    // Documentation
    if (
      file.extension === '.md' ||
      file.extension === '.mdx' ||
      path.includes('docs') ||
      path.includes('documentation')
    ) {
      return 'docs';
    }

    // Configuration
    if (
      file.extension === '.json' ||
      file.extension === '.yml' ||
      file.extension === '.yaml' ||
      file.extension === '.toml' ||
      file.extension === '.ini' ||
      file.extension === '.config' ||
      path.includes('config') ||
      path.startsWith('.') ||
      path.includes('docker') ||
      path.includes('.github/workflows')
    ) {
      return 'config';
    }

    // Infrastructure
    if (
      path.includes('api') ||
      path.includes('server') ||
      path.includes('database') ||
      path.includes('cache') ||
      path.includes('storage') ||
      path.includes('queue') ||
      path.includes('middleware')
    ) {
      return 'infrastructure';
    }

    // Default: business logic
    return 'business-logic';
  }

  /**
   * Calculate priority for file/group
   */
  private calculatePriority(
    file: FileMetadata,
    category: 'security' | 'business-logic' | 'infrastructure' | 'tests' | 'docs' | 'config'
  ): number {
    const categoryPriority = {
      security: 100,
      infrastructure: 80,
      'business-logic': 70,
      config: 60,
      tests: 40,
      docs: 20,
    };

    let priority = categoryPriority[category];

    // Boost priority for entry points
    if (
      file.relativePath.includes('index.') ||
      file.relativePath.includes('main.') ||
      file.relativePath.includes('app.')
    ) {
      priority += 10;
    }

    // Boost for frequently changed files (placeholder - could use git history)
    // priority += (file.changeFrequency || 0) * 5;

    return priority;
  }

  /**
   * Create summary for a file group
   */
  createGroupSummary(group: FileGroup): string {
    const fileList = group.files.map(f => `- ${f.relativePath} (${f.lines} lines)`).join('\n');
    
    return `
## ${group.name}

**Category**: ${group.category}
**Files**: ${group.files.length}
**Total Lines**: ${group.files.reduce((sum, f) => sum + f.lines, 0)}
**Total Tokens**: ${group.totalTokens}

### Files in this group:
${fileList}
    `.trim();
  }
}
