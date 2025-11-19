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

    const devDeps = Object.keys(pkg.devDependencies || {}).slice(0, 10).join(', ');
    const scripts = Object.keys(pkg.scripts || {}).slice(0, 10).join(', ');
    
    const prompt = `Analyze this codebase structure in depth:

Project: ${tree.name}
Files: ${totalFiles}
Directories: ${totalDirs}
Languages: ${languages}

Tree Structure:
\`\`\`
${treeASCII}
\`\`\`

Dependencies: ${Object.keys(pkg.dependencies || {}).slice(0, 20).join(', ')}
Dev Dependencies: ${devDeps}
Available Scripts: ${scripts}

Provide a comprehensive analysis (4-6 sentences):
1. Project type and purpose (based on structure/dependencies/naming)
2. Main modules and their likely responsibilities (analyze folder names and structure)
3. Technology stack (languages, frameworks, build tools)
4. Architecture pattern (monorepo, microservices, MVC, etc.)
5. Development workflow (based on scripts and dev dependencies)
6. Key integrations or platforms (GitHub Actions, cloud providers, databases, etc.)

Be specific and factual. Infer purpose from structure and naming conventions.`;

    const response = await this.aiProvider.sendMessage([
      { role: 'system', content: 'You are an expert software architect and code analyst. Analyze directory trees and project structures to deeply understand project organization, architecture, and purpose. Provide comprehensive, insightful analysis based on actual evidence from the codebase structure, dependencies, and conventions.' },
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

    const scripts = pkg.scripts || {};
    const hasTests = 'test' in scripts;
    const hasBuild = 'build' in scripts;
    const hasLint = 'lint' in scripts;
    
    const prompt = `Generate comprehensive root-level project documentation:

Project: ${rootLink}
Files: ${tree.fileCount || 0}
Directories: ${tree.directoryCount || 0}
Languages: ${Array.from(tree.languages || []).join(', ')}

Project Structure (clickable file:// links):
${treeMarkdown}

Dependencies: ${Object.keys(pkg.dependencies || {}).join(', ')}
Dev Dependencies: ${Object.keys(pkg.devDependencies || {}).join(', ')}
Scripts: ${Object.keys(scripts).join(', ')}

Project Analysis:
${treeContext}

Generate COMPREHENSIVE documentation with the following sections:

## 1. Project Overview
- What this project does (purpose and value proposition)
- Key features and capabilities
- Target users or use cases
- Project status (production-ready, experimental, etc.)

## 2. Architecture & Design
- Overall system architecture (monolith, microservices, library, etc.)
- Design patterns and principles used
- Key architectural decisions and their rationale
- Component interaction and data flow
- Technology choices and why they were made

## 3. Main Modules & Organization
- Detailed breakdown of top-level directories
- Purpose and responsibility of each module
- How modules interact with each other
- Module dependencies and relationships
- File organization conventions

## 4. Technology Stack
- Programming languages and versions
- Frameworks and libraries (with purposes)
- Build tools and bundlers
- Testing frameworks
- Development tools (linting, formatting, etc.)
- Runtime environments

## 5. Getting Started
- Prerequisites and system requirements
- Installation instructions (step-by-step)
- Configuration needed
- How to run the project (development mode)
- How to run tests${hasTests ? ' (reference scripts)' : ''}
- How to build for production${hasBuild ? ' (reference scripts)' : ''}
- Common issues and troubleshooting

## 6. Development Workflow
- Code organization best practices
- Branching strategy (if evident from structure)
- Testing approach${hasTests ? ' (unit, integration, e2e)' : ''}
- Linting and code quality${hasLint ? ' (reference configs)' : ''}
- CI/CD setup (if evident from .github, etc.)

## 7. Key Dependencies & Their Roles
- Critical runtime dependencies (what they do and why needed)
- Important dev dependencies (their purposes)
- External services or APIs integrated

Use file:// links for all file and directory references. 
Be comprehensive, detailed, and specific.
Include code examples where helpful.
Use mermaid diagrams where appropriate to visualize architecture or flow.

Format as clean, well-structured markdown with proper headings.`;

    const response = await this.aiProvider.sendMessage([
      { role: 'system', content: 'You are a senior technical documentation expert and software architect. Generate comprehensive, in-depth documentation that helps developers understand the project quickly and thoroughly. Analyze the actual codebase structure, dependencies, and organization to provide accurate, detailed insights. Include practical examples, architecture diagrams (mermaid), and actionable guidance. Write in clear, professional markdown.' },
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

    const prompt = `Document this module comprehensively:

Module: ${moduleLink}
Path: ${node.path}
Files: ${node.fileCount || 0}
Subdirectories: ${node.directoryCount || 0}
Languages: ${Array.from(node.languages || []).join(', ')}

Module Contents (with file:// links):
${childrenLinks}

Project Context:
${treeContext}${codeSection}

Generate IN-DEPTH documentation with these sections:

## 1. Module Purpose & Responsibility
- What this module does (core responsibility)
- Why this module exists (problem it solves)
- Role in the overall project architecture
- Boundaries and what this module does NOT do

## 2. Key Components & Files
- Important files and their specific roles
- Entry points or main exports
- Configuration files (if any)
- Helper utilities vs core functionality
- Public API vs internal implementation

## 3. Functionality & Features
- Main features provided by this module
- APIs, classes, functions exported
- Data models or types defined
- Algorithms or business logic implemented
- External integrations (APIs, services, databases)

## 4. Internal Structure & Organization
- How files are organized within the module
- Submodules or sub-components
- Dependencies between files
- Shared utilities or common code
- Design patterns used

## 5. Usage & Integration
- How other modules use this module
- Import/require patterns
- Configuration needed
- Example usage with code snippets
- Common use cases

## 6. Dependencies & Requirements
- External packages required
- Internal module dependencies
- System requirements or prerequisites
- Environment variables or configuration

## 7. Technical Details
- Key algorithms or approaches
- Performance considerations
- Error handling patterns
- Testing approach (if test files present)
- Known limitations or constraints

Use file:// links for all files and directories.
Be comprehensive and specific.
Include code examples from the actual codebase when relevant.
Use mermaid diagrams to visualize complex relationships or flows.

Format as clean, detailed markdown.`;

    const response = await this.aiProvider.sendMessage([
      { role: 'system', content: 'You are a senior software engineer and technical writer specializing in module documentation. Analyze code structure, dependencies, and implementation to generate comprehensive, accurate documentation. Provide deep insights into module architecture, design decisions, and usage patterns. Use actual code examples and create helpful diagrams. Write clear, detailed markdown that helps developers understand and use the module effectively.' },
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

    const lines = node.file.content.split('\n').length;
    const imports = node.file.content.match(/^import .+$/gm) || [];
    const exports = node.file.content.match(/^export .+$/gm) || [];
    
    const prompt = `Document this file comprehensively:

File: ${fileLink}
Path: ${node.path}
Language: ${node.file.language}
Size: ${node.file.size} bytes
Lines: ${lines}
Imports: ${imports.length}
Exports: ${exports.length}

File Content:
\`\`\`${node.file.language}
${content}
\`\`\`

Generate DETAILED documentation with these sections:

## 1. File Purpose & Responsibility
- What this file does (single responsibility)
- Why this file exists in the codebase
- Role within its parent module
- What type of file it is (model, controller, utility, test, config, etc.)

## 2. Exports & Public API
- All exported functions, classes, interfaces, types, constants
- For each export: signature, purpose, parameters, return values
- Public API surface and intended usage
- Which exports are primary vs secondary

## 3. Key Implementation Details
- Important functions and their logic
- Algorithms or business logic implemented
- Data structures or types defined
- State management approach (if applicable)
- Error handling patterns

## 4. Dependencies & Imports
- External packages imported (and why)
- Internal modules imported (and their purpose)
- Dependency relationships
- Side effects from imports

## 5. Internal Functions & Helpers
- Private/internal functions and their purposes
- Helper utilities specific to this file
- Implementation details not part of public API

## 6. Usage Examples & Patterns
- How to import and use this file's exports
- Common usage patterns with code examples
- Best practices for using the API
- Integration with other parts of the codebase

## 7. Technical Considerations
- Performance characteristics
- Thread-safety or async behavior
- Error cases and handling
- Edge cases to be aware of
- Testing coverage (if evident)

## 8. Type Information (if applicable)
- TypeScript types/interfaces defined
- Generic parameters and constraints
- Type safety guarantees

Be comprehensive and specific.
Include actual code examples from the file.
Explain complex logic in detail.
Use mermaid diagrams for complex flows or class relationships.

Format as detailed, technical markdown.`;

    const response = await this.aiProvider.sendMessage([
      { role: 'system', content: 'You are a principal software engineer and expert technical writer specializing in code documentation. Analyze source code deeply to understand its purpose, implementation, and API. Generate comprehensive, detailed documentation that helps developers understand not just WHAT the code does, but WHY and HOW. Explain complex logic, algorithms, and design decisions. Provide practical usage examples and highlight important edge cases or gotchas. Write in clear, technical markdown with proper code formatting and diagrams.' },
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
