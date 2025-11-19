/**
 * Documentation Engine
 * 
 * Tree-based hierarchical documentation generator
 * Generates docs: Root → Modules (folders) → Submodules (subfolders) → Files
 */

import * as core from '@actions/core';
import { BaseProvider } from '../providers/BaseProvider';
import { CodebaseMapper } from '../common/CodebaseMapper';
import { ContentAnalyzer } from './ContentAnalyzer';
import { TreeBuilder, TreeNode, TreeLevel } from './TreeBuilder';
import { DocumentationResult, DocumentationScope } from './types';
import { DocumentationConfig } from './DocumentationConfig';

interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 10000,
};

export class DocumentationEngine {
  private config: DocumentationConfig;

  constructor(
    private workspacePath: string,
    private aiProvider: BaseProvider,
    _scope: DocumentationScope = 'full',
    private includePatterns?: string[],
    private excludePatterns?: string[],
    config?: Partial<DocumentationConfig>
  ) {
    this.config = {
      depth: config?.depth || 'standard',
      moduleBatchSize: config?.moduleBatchSize || 3,
      maxModules: config?.maxModules || 0,
      includeFiles: config?.includeFiles !== undefined ? config.includeFiles : false,
      outputFormat: config?.outputFormat || 'markdown',
      includeDiagrams: config?.includeDiagrams !== undefined ? config.includeDiagrams : true,
      includeExamples: config?.includeExamples !== undefined ? config.includeExamples : true,
      includeDependencies: config?.includeDependencies !== undefined ? config.includeDependencies : true,
    };
    
    core.info(`📚 Documentation Config: depth=${this.config.depth}, moduleBatch=${this.config.moduleBatchSize}, includeFiles=${this.config.includeFiles}`);
  }

  /**
   * Retry logic with exponential backoff
   */
  private async retryWithBackoff<T>(
    operation: () => Promise<T>,
    context: string,
    config: RetryConfig = DEFAULT_RETRY_CONFIG
  ): Promise<T> {
    let lastError: Error | undefined;
    
    for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error: any) {
        lastError = error;
        const isRetryable = 
          error.response?.status === 502 ||
          error.response?.status === 503 ||
          error.response?.status === 429 ||
          error.code === 'ECONNRESET' ||
          error.code === 'ETIMEDOUT';
        
        if (!isRetryable || attempt === config.maxRetries) {
          throw error;
        }
        
        const delay = Math.min(
          config.baseDelay * Math.pow(2, attempt),
          config.maxDelay
        );
        
        core.warning(
          `${context} failed (attempt ${attempt + 1}/${config.maxRetries + 1}): ${error.message}. ` +
          `Retrying in ${delay}ms...`
        );
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError || new Error(`${context} failed after ${config.maxRetries} retries`);
  }

  /**
   * Main execution method - Tree-based hierarchical documentation
   */
  async execute(): Promise<DocumentationResult> {
    core.startGroup('📚 Tree-Based Hierarchical Documentation Generation');

    const startTime = Date.now();
    let totalTokens = 0;

    try {
      // 1. Map complete codebase
      core.info('🗺️  Mapping complete codebase...');
      const mapper = new CodebaseMapper(
        this.workspacePath,
        'full-codebase',
        this.includePatterns,
        this.excludePatterns
      );
      const codebaseMap = await mapper.createMap();

      core.info(`📊 Found ${codebaseMap.files.length} files to document`);

      // 2. Build hierarchical tree
      core.info('🌳 Building hierarchical tree...');
      const treeBuilder = new TreeBuilder(codebaseMap);
      const tree = treeBuilder.buildCompleteTree();
      const levels = treeBuilder.getTreeByLevels();

      core.info(`  ✓ Tree built: ${levels.length} levels`);
      levels.forEach((level, idx) => {
        core.info(`  ✓ Level ${idx} (${level.type}): ${level.nodes.length} nodes`);
      });

      // 3. Generate documentation hierarchically
      core.info('📝 Generating documentation by tree levels...');
      const sections = await this.generateTreeBasedDocumentation(tree, levels, codebaseMap, treeBuilder);
      
      for (const section of sections) {
        totalTokens += section.content.length / 4;
      }

      // 4. Compile markdown
      const fullMarkdown = this.compileMarkdown(sections, codebaseMap.projectName);

      // 5. Statistics
      const statistics = {
        filesAnalyzed: codebaseMap.files.length,
        sectionsGenerated: sections.length,
        totalWords: fullMarkdown.split(/\s+/).length,
        tokensUsed: Math.round(totalTokens),
        estimatedCost: (totalTokens / 1000000) * 2.0,
      };

      const duration = Date.now() - startTime;

      core.info('✅ Documentation generation complete');
      core.info(`  Sections: ${sections.length}`);
      core.info(`  Words: ${statistics.totalWords.toLocaleString()}`);
      core.info(`  Duration: ${(duration / 1000).toFixed(2)}s`);
      core.endGroup();

      return {
        projectName: codebaseMap.projectName,
        generatedAt: new Date().toISOString(),
        sections,
        fullMarkdown,
        statistics,
      };
    } catch (error) {
      core.endGroup();
      throw error;
    }
  }

  /**
   * Tree-based hierarchical documentation generation
   * Root → Modules → Submodules → Files
   */
  private async generateTreeBasedDocumentation(
    tree: TreeNode,
    levels: TreeLevel[],
    codebaseMap: any,
    treeBuilder: TreeBuilder
  ) {
    const sections = [];
    let order = 1;

    // Step 1: Analyze complete tree
    core.info('📋 Step 1: Analyzing codebase tree...');
    const treeASCII = treeBuilder.getTreeAsASCII(8);
    const treeContext = await this.retryWithBackoff(
      () => this.analyzeCompleteTree(tree, treeASCII, codebaseMap),
      'Tree analysis'
    );
    core.info(`  ✓ Analysis complete (${treeContext.length} chars)`);

    // Step 2: Root documentation
    core.info('📝 Step 2: Root overview...');
    const rootDoc = await this.retryWithBackoff(
      () => this.generateRootDocumentation(tree, treeContext, treeBuilder, codebaseMap),
      'Root documentation'
    );
    sections.push({ ...rootDoc, order: order++ });
    core.info(`  ✓ Root complete`);

    // Step 3 & 4: Modules and submodules
    const directoryLevels = levels.filter(l => l.type === 'modules' || l.type === 'submodules');
    
    for (const level of directoryLevels) {
      core.info(`📁 Step 3.${level.depth}: ${level.nodes.length} ${level.type}...`);
      
      const nodesToDocument = this.config.maxModules > 0
        ? level.nodes.slice(0, this.config.maxModules)
        : level.nodes;

      const batchSize = this.config.moduleBatchSize;
      for (let i = 0; i < nodesToDocument.length; i += batchSize) {
        const batch = nodesToDocument.slice(i, i + batchSize);
        const batchPromises = batch.map(node =>
          this.retryWithBackoff(
            () => this.generateModuleDocumentation(node, treeContext, codebaseMap),
            `Module: ${node.name}`
          )
        );

        const batchResults = await Promise.all(batchPromises);
        batchResults.forEach(doc => sections.push({ ...doc, order: order++ }));

        core.info(`  ✓ ${Math.min(i + batchSize, nodesToDocument.length)}/${nodesToDocument.length}`);

        if (i + batchSize < nodesToDocument.length) {
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      }
    }

    // Step 5: Files (if enabled)
    if (this.config.includeFiles) {
      const filesLevel = levels.find(l => l.type === 'files');
      if (filesLevel && filesLevel.nodes.length > 0) {
        core.info(`📄 Step 4: ${filesLevel.nodes.length} files...`);

        const batchSize = 5;
        for (let i = 0; i < filesLevel.nodes.length; i += batchSize) {
          const batch = filesLevel.nodes.slice(i, i + batchSize);
          const batchPromises = batch.map(node =>
            this.retryWithBackoff(
              () => this.generateFileDocumentation(node, treeContext, codebaseMap),
              `File: ${node.name}`
            )
          );

          const batchResults = await Promise.all(batchPromises);
          batchResults.forEach(doc => sections.push({ ...doc, order: order++ }));

          core.info(`  ✓ ${Math.min(i + batchSize, filesLevel.nodes.length)}/${filesLevel.nodes.length}`);

          if (i + batchSize < filesLevel.nodes.length) {
            await new Promise(resolve => setTimeout(resolve, 300));
          }
        }
      }
    }

    return sections;
  }

  /**
   * Analyze complete tree structure
   */
  private async analyzeCompleteTree(tree: TreeNode, treeASCII: string, codebaseMap: any): Promise<string> {
    const pkg = codebaseMap.dependencies?.packageJson || {};
    const totalFiles = tree.fileCount || 0;
    const totalDirs = tree.directoryCount || 0;
    const languages = Array.from(tree.languages || []).join(', ');

    const prompt = `Analyze this codebase structure:

Project: ${tree.name}
Files: ${totalFiles}
Directories: ${totalDirs}
Languages: ${languages}

Tree:
\`\`\`
${treeASCII}
\`\`\`

Dependencies: ${Object.keys(pkg.dependencies || {}).slice(0, 20).join(', ')}

Provide a concise summary (3-4 sentences):
1. Project type (based on structure/dependencies)
2. Main modules (top-level folders)
3. Technology stack
4. Architecture pattern

Base analysis on actual structure provided.`;

    const response = await this.aiProvider.sendMessage([
      { role: 'system', content: 'You are a code structure analyst. Analyze directory trees to understand project organization. Be factual and specific.' },
      { role: 'user', content: prompt },
    ], { responseFormat: 'text' });

    return response.content;
  }

  /**
   * Generate root documentation
   */
  private async generateRootDocumentation(
    tree: TreeNode,
    treeContext: string,
    treeBuilder: TreeBuilder,
    codebaseMap: any
  ) {
    const treeMarkdown = treeBuilder.getTreeAsMarkdown(3);
    const pkg = codebaseMap.dependencies?.packageJson || {};
    const rootLink = TreeBuilder.getFileLink(tree.absolutePath, tree.name);

    const prompt = `Generate root-level project documentation:

Project: ${rootLink}
Files: ${tree.fileCount || 0}
Directories: ${tree.directoryCount || 0}
Languages: ${Array.from(tree.languages || []).join(', ')}

Structure (clickable links):
${treeMarkdown}

Dependencies: ${Object.keys(pkg.dependencies || {}).join(', ')}
Dev Dependencies: ${Object.keys(pkg.devDependencies || {}).join(', ')}

Context:
${treeContext}

Generate documentation with:
1. **Project Overview** - What this codebase does
2. **Architecture** - Overall system design
3. **Main Modules** - Top-level folders and purposes
4. **Technology Stack** - Languages, frameworks, tools
5. **Getting Started** - Setup and run

Include file:// links. Be specific.

Format as markdown with clear headings.`;

    const response = await this.aiProvider.sendMessage([
      { role: 'system', content: 'You are a technical documentation expert. Generate comprehensive documentation by analyzing actual codebase structure.' },
      { role: 'user', content: prompt },
    ], { responseFormat: 'text' });

    return {
      id: `root-${tree.name}`,
      title: `Project: ${tree.name}`,
      content: response.content,
      subsections: [],
    };
  }

  /**
   * Generate module documentation
   */
  private async generateModuleDocumentation(node: TreeNode, treeContext: string, codebaseMap: any) {
    const contentAnalyzer = new ContentAnalyzer(codebaseMap);
    const moduleFiles = contentAnalyzer.getModuleFiles(node.path);
    const moduleLink = TreeBuilder.getFileLink(node.absolutePath, node.name);

    const childrenLinks = (node.children || [])
      .sort((a, b) => {
        if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
        return a.name.localeCompare(b.name);
      })
      .slice(0, 30)
      .map(child => {
        const link = TreeBuilder.getFileLink(child.absolutePath, child.name);
        const suffix = child.type === 'directory' ? '/' : '';
        const info = child.type === 'directory' && child.fileCount ? ` (${child.fileCount} files)` : '';
        return `- ${link}${suffix}${info}`;
      }).join('\n');

    const sampleFilePaths = moduleFiles
      .filter(f => !f.path.includes('test') && !f.path.includes('.min.'))
      .slice(0, 3)
      .map(f => f.path);

    const codeSamples = contentAnalyzer.getFilesContent(sampleFilePaths, 2000);
    const codeSection = codeSamples.length > 0
      ? `\n\nSample Code:\n${codeSamples.map(s => {
          const fileLink = TreeBuilder.getFileLink(codebaseMap.rootPath + '/' + s.path, s.path);
          return `\n### ${fileLink}\n\`\`\`${s.language}\n${s.content}\n\`\`\``;
        }).join('\n\n')}`
      : '';

    const prompt = `Document this module:

Module: ${moduleLink}
Path: ${node.path}
Files: ${node.fileCount || 0}
Subdirs: ${node.directoryCount || 0}
Languages: ${Array.from(node.languages || []).join(', ')}

Contents:
${childrenLinks}

Context:
${treeContext}${codeSection}

Generate documentation with:
1. **Purpose** - What this module does
2. **Key Components** - Important files and roles
3. **Functionality** - Main features
4. **Internal Structure** - Organization
5. **Usage** - How it's used

Include file:// links. Be specific.

Format as markdown.`;

    const response = await this.aiProvider.sendMessage([
      { role: 'system', content: 'You are a code documentation specialist. Analyze module code and structure to generate accurate documentation.' },
      { role: 'user', content: prompt },
    ], { responseFormat: 'text' });

    return {
      id: `module-${node.path.replace(/\//g, '-')}`,
      title: `Module: ${node.name}`,
      content: response.content,
      subsections: [],
    };
  }

  /**
   * Generate file documentation
   */
  private async generateFileDocumentation(node: TreeNode, _treeContext: string, _codebaseMap: any) {
    if (!node.file) {
      return {
        id: `file-${node.path.replace(/\//g, '-')}`,
        title: `File: ${node.name}`,
        content: 'File content not available',
        subsections: [],
      };
    }

    const fileLink = TreeBuilder.getFileLink(node.absolutePath, node.name);
    const content = node.file.content.length > 5000
      ? node.file.content.slice(0, 5000) + '\n\n// ... (truncated)'
      : node.file.content;

    const prompt = `Document this file:

File: ${fileLink}
Path: ${node.path}
Language: ${node.file.language}
Size: ${node.file.size} bytes
Lines: ${node.file.content.split('\n').length}

Content:
\`\`\`${node.file.language}
${content}
\`\`\`

Generate documentation with:
1. **Purpose** - What this file does
2. **Exports** - Functions, classes, interfaces
3. **Key Logic** - Important functions
4. **Dependencies** - Imports
5. **Usage Examples** - How to use exports

Be specific. Include code snippets.

Format as markdown.`;

    const response = await this.aiProvider.sendMessage([
      { role: 'system', content: 'You are a code documentation expert. Analyze source code to generate detailed file documentation.' },
      { role: 'user', content: prompt },
    ], { responseFormat: 'text' });

    return {
      id: `file-${node.path.replace(/\//g, '-')}`,
      title: `File: ${node.name}`,
      content: response.content,
      subsections: [],
    };
  }

  /**
   * Compile markdown with table of contents
   */
  private compileMarkdown(sections: any[], projectName: string): string {
    let markdown = `# ${projectName} Documentation\n\n`;
    markdown += `*Generated on ${new Date().toLocaleDateString()}*\n\n`;
    markdown += `## Table of Contents\n\n`;

    sections.forEach((section, idx) => {
      const anchor = section.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      markdown += `${idx + 1}. [${section.title}](#${anchor})\n`;
    });

    markdown += '\n---\n\n';

    sections.forEach(section => {
      markdown += `## ${section.title}\n\n`;
      markdown += `${section.content}\n\n`;
      markdown += '---\n\n';
    });

    markdown += `\n\n*Documentation generated by Code Sentinel AI*\n`;

    return markdown;
  }
}
