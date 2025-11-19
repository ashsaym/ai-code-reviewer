/**
 * Documentation Engine
 * 
 * Main orchestrator for documentation generation with hierarchical progressive analysis
 */

import * as core from '@actions/core';
import { BaseProvider } from '../providers/BaseProvider';
import { CodebaseMapper } from '../common/CodebaseMapper';
import { ContentAnalyzer, AnalyzedContent } from './ContentAnalyzer';
import { DocumentationResult, DocumentationScope } from './types';
import { DocumentationConfig, DEPTH_SETTINGS } from './DocumentationConfig';
import { FileDocumentor } from './FileDocumentor';
import { ModuleDocumentor } from './ModuleDocumentor';

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
  private depthSettings: any;
  private fileDocumentor: FileDocumentor;
  private moduleDocumentor: ModuleDocumentor;

  constructor(
    private workspacePath: string,
    private aiProvider: BaseProvider,
    private scope: DocumentationScope = 'full',
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
    
    this.depthSettings = DEPTH_SETTINGS[this.config.depth];
    this.fileDocumentor = new FileDocumentor(aiProvider);
    this.moduleDocumentor = new ModuleDocumentor(aiProvider);
    
    core.info(`📚 Documentation Config: depth=${this.config.depth}, moduleBatch=${this.config.moduleBatchSize}, includeFiles=${this.config.includeFiles}`);
  }

  /**
   * Retry logic with exponential backoff for transient failures
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

  async execute(): Promise<DocumentationResult> {
    core.startGroup('📚 Generating Project Documentation');

    const startTime = Date.now();
    let totalTokens = 0;

    try {
      // 1. Map the codebase
      core.info('🗺️  Mapping codebase structure...');
      const mapper = new CodebaseMapper(
        this.workspacePath,
        'full-codebase',
        this.includePatterns,
        this.excludePatterns
      );
      const codebaseMap = await mapper.createMap();

      core.info(`📊 Found ${codebaseMap.files.length} files to document`);

      // 2. Analyze content
      core.info('🔍 Analyzing codebase content...');
      const contentAnalyzer = new ContentAnalyzer(codebaseMap);
      const analyzedContent = await contentAnalyzer.analyze();

      // 3. Generate documentation using hierarchical progressive approach
      core.info('🎯 Using hierarchical progressive documentation generation...');
      const sections = await this.generateSectionsProgressively(codebaseMap, analyzedContent);
      
      for (const section of sections) {
        totalTokens += section.content.length / 4; // Rough estimate
      }

      // 4. Compile full markdown
      const fullMarkdown = this.compileMarkdown(sections, codebaseMap.projectName);

      // 5. Calculate statistics
      const statistics = {
        filesAnalyzed: codebaseMap.files.length,
        sectionsGenerated: sections.length,
        totalWords: fullMarkdown.split(/\s+/).length,
        tokensUsed: Math.round(totalTokens),
        estimatedCost: (totalTokens / 1000000) * 2.0, // Rough estimate $2/1M tokens
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
   * Hierarchical progressive documentation generation
   * Layer 1: High-level project context
   * Layer 2: Module/component summaries 
   * Layer 3: Detailed sections with full context
   */
  private async generateSectionsProgressively(codebaseMap: any, content: AnalyzedContent) {
    const sections = [];
    let order = 1;

    // Determine which sections to generate based on scope
    const shouldInclude = {
      overview: this.scope === 'full' || this.scope === 'minimal',
      architecture: this.scope === 'full' || this.scope === 'architecture',
      api: this.scope === 'full' || this.scope === 'api-only',
      gettingStarted: this.scope === 'full' || this.scope === 'minimal',
      userGuide: this.scope === 'full' || this.scope === 'guide-only',
      developerGuide: this.scope === 'full',
      configuration: this.scope === 'full' || this.scope === 'guide-only',
      examples: this.scope === 'full' || this.scope === 'guide-only',
    };

    // LAYER 1: High-level project understanding (lightweight, fast)
    core.info('📋 Layer 1: Generating high-level project context...');
    const projectContext = await this.generateProjectContext(codebaseMap, content);
    core.info(`  ✓ Project context generated (${projectContext.length} chars)`);

    // LAYER 2: Module-level summaries (parallel where possible)
    core.info('🔷 Layer 2: Generating module summaries...');
    const moduleSummaries = await this.generateModuleSummaries(codebaseMap, content, projectContext);
    core.info(`  ✓ Generated ${moduleSummaries.length} module summaries`);

    // LAYER 3: Detailed sections with full context (sequential with retry)

    core.info('📝 Layer 3: Generating detailed sections with full context...');
    const enrichedContext = `${projectContext}\n\n## Module Summaries:\n${moduleSummaries.join('\n\n')}`;

    // Project Overview
    if (shouldInclude.overview) {
      const overview = await this.retryWithBackoff(
        () => this.generateOverview(codebaseMap, content, enrichedContext),
        'Project overview generation'
      );
      sections.push({ ...overview, order: order++ });
      core.info(`  ✓ Project overview complete`);
    }

    // Architecture
    if (shouldInclude.architecture) {
      const architecture = await this.retryWithBackoff(
        () => this.generateArchitecture(codebaseMap, content, enrichedContext),
        'Architecture documentation'
      );
      sections.push({ ...architecture, order: order++ });
      core.info(`  ✓ Architecture documentation complete`);
    }

    // API Reference
    if (shouldInclude.api && content.apiEndpoints.length > 0) {
      const apiRef = await this.retryWithBackoff(
        () => this.generateAPIReference(content, enrichedContext),
        'API reference generation'
      );
      sections.push({ ...apiRef, order: order++ });
      core.info(`  ✓ API reference complete`);
    }

    // Getting Started
    if (shouldInclude.gettingStarted) {
      const gettingStarted = await this.retryWithBackoff(
        () => this.generateGettingStarted(codebaseMap, content, enrichedContext),
        'Getting started guide'
      );
      sections.push({ ...gettingStarted, order: order++ });
      core.info(`  ✓ Getting started guide complete`);
    }

    // User Guide
    if (shouldInclude.userGuide) {
      const userGuide = await this.retryWithBackoff(
        () => this.generateUserGuide(codebaseMap, content, enrichedContext),
        'User guide'
      );
      sections.push({ ...userGuide, order: order++ });
      core.info(`  ✓ User guide complete`);
    }

    // Configuration Reference (no AI call needed)
    if (shouldInclude.configuration && content.configurations.length > 0) {
      const configRef = await this.generateConfigReference(content);
      sections.push({ ...configRef, order: order++ });
      core.info(`  ✓ Configuration reference complete`);
    }

    // Developer Guide
    if (shouldInclude.developerGuide) {
      const devGuide = await this.retryWithBackoff(
        () => this.generateDeveloperGuide(codebaseMap, content, enrichedContext),
        'Developer guide'
      );
      sections.push({ ...devGuide, order: order++ });
      core.info(`  ✓ Developer guide complete`);
    }

    // Examples
    if (shouldInclude.examples && content.examples.length > 0) {
      core.info('📖 Adding examples...');
      const examples = await this.generateExamples(content);
      sections.push({ ...examples, order: order++ });
    }

    return sections;
  }

  /**
   * Layer 1: Generate lightweight high-level project context
   */
  private async generateProjectContext(codebaseMap: any, content: AnalyzedContent): Promise<string> {
    const prompt = `Provide a concise project summary:

Project: ${codebaseMap.projectName}
Files: ${codebaseMap.files.length}
Languages: ${Object.keys(codebaseMap.statistics.languageBreakdown).join(', ')}
Key Components: ${content.mainComponents.slice(0, 10).map(c => c.name).join(', ')}

Provide in 3-4 sentences:
1. What this project does
2. Primary technology stack
3. Main architectural pattern`;

    const response = await this.retryWithBackoff(
      () => this.aiProvider.sendMessage([
        { role: 'system', content: 'You are a technical analyst. Provide concise, factual summaries.' },
        { role: 'user', content: prompt },
      ]),
      'Project context generation'
    );

    return response.content;
  }

  /**
   * Layer 2: Generate module-level summaries in parallel batches
   */
  private async generateModuleSummaries(
    codebaseMap: any,
    content: AnalyzedContent,
    projectContext: string
  ): Promise<string[]> {
    // Group files by top-level directory (modules)
    const moduleMap = new Map<string, any[]>();
    
    codebaseMap.files.forEach((file: any) => {
      const parts = file.path.split('/');
      const moduleIdx = parts.findIndex((p: string) => p === 'src') + 1;
      if (moduleIdx > 0 && moduleIdx < parts.length) {
        const moduleName = parts[moduleIdx];
        if (!moduleMap.has(moduleName)) {
          moduleMap.set(moduleName, []);
        }
        moduleMap.get(moduleName)!.push(file);
      }
    });

    const summaries: string[] = [];
    const modules = Array.from(moduleMap.entries()).slice(0, 15); // Limit to top 15 modules

    // Process modules in batches of 3 for controlled parallelism
    const batchSize = 3;
    for (let i = 0; i < modules.length; i += batchSize) {
      const batch = modules.slice(i, i + batchSize);
      const batchPromises = batch.map(([moduleName, files]) =>
        this.retryWithBackoff(
          async () => {
            const components = content.mainComponents.filter(c => 
              c.location.includes(`/${moduleName}/`)
            );
            
            const prompt = `Summarize the '${moduleName}' module in 2-3 sentences:

Files: ${files.length}
Components: ${components.map(c => c.name).join(', ') || 'None identified'}

Project Context: ${projectContext}

What is the purpose of this module?`;

            const response = await this.aiProvider.sendMessage([
              { role: 'system', content: 'You are a code analyst. Provide brief module summaries.' },
              { role: 'user', content: prompt },
            ]);

            return `**${moduleName}**: ${response.content}`;
          },
          `Module summary for '${moduleName}'`
        )
      );

      const batchResults = await Promise.all(batchPromises);
      summaries.push(...batchResults);
      
      // Small delay between batches to avoid rate limiting
      if (i + batchSize < modules.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    return summaries;
  }

  private async generateOverview(
    codebaseMap: any,
    content: AnalyzedContent,
    context?: string
  ) {
    const contextSection = context ? `\n\nProject Context:\n${context}\n` : '';
    const prompt = `Generate a comprehensive project overview for this project:

Project: ${codebaseMap.projectName}
Files: ${codebaseMap.files.length}
Languages: ${Object.keys(codebaseMap.statistics.languageBreakdown).join(', ')}
Main Components: ${content.mainComponents.slice(0, 10).map(c => c.name).join(', ')}
Dependencies: ${content.dependencies.slice(0, 10).map(d => d.name).join(', ')}${contextSection}

Write a detailed overview including:
1. Project purpose and goals
2. Key features and capabilities
3. Technology stack
4. Project structure overview
5. Target audience

Format as markdown. Be informative and comprehensive.`;

    const response = await this.aiProvider.sendMessage([
      { role: 'system', content: 'You are a technical documentation expert writing clear, comprehensive project documentation.' },
      { role: 'user', content: prompt },
    ]);

    return {
      id: 'overview',
      title: 'Project Overview',
      content: response.content,
      subsections: [],
    };
  }

  private async generateArchitecture(
    codebaseMap: any,
    content: AnalyzedContent,
    context?: string
  ) {
    const contextSection = context ? `\n\nProject Context:\n${context}\n` : '';
    const prompt = `Document the system architecture:

Project: ${codebaseMap.projectName}
Structure: ${JSON.stringify(codebaseMap.structure, null, 2).slice(0, 2000)}
Components: ${content.mainComponents.map(c => `${c.name} (${c.type})`).join(', ')}
Dependencies: ${content.dependencies.map(d => d.name).join(', ')}${contextSection}

Create comprehensive architecture documentation including:
1. High-level system architecture
2. Component breakdown and relationships
3. Data flow
4. Design patterns used
5. Technology choices and rationale

Include mermaid diagrams where helpful. Format as markdown.`;

    const response = await this.aiProvider.sendMessage([
      { role: 'system', content: 'You are a software architect creating detailed technical documentation.' },
      { role: 'user', content: prompt },
    ]);

    return {
      id: 'architecture',
      title: 'Architecture',
      content: response.content,
      subsections: [],
    };
  }

  private async generateAPIReference(content: AnalyzedContent, context?: string) {
    const contextSection = context ? `\n\nProject Context:\n${context}\n` : '';
    const endpointsDoc = content.apiEndpoints.map(ep => `
### ${ep.method} ${ep.path}

**Location:** \`${ep.location}\`

${ep.description || 'No description available'}

${ep.parameters.length > 0 ? `
**Parameters:**
${ep.parameters.map(p => `- \`${p.name}\` (${p.type})${p.required ? ' *required*' : ''}: ${p.description}`).join('\n')}
` : ''}

${ep.responses.length > 0 ? `
**Responses:**
${ep.responses.map(r => `- ${r.status}: ${r.description}`).join('\n')}
` : ''}
`).join('\n---\n');

    const prompt = `Enhance this API reference documentation:

${endpointsDoc}${contextSection}

Add:
1. Usage examples for each endpoint
2. Authentication details if applicable
3. Rate limiting information
4. Common error scenarios
5. Best practices

Format as markdown with code examples.`;

    const response = await this.aiProvider.sendMessage([
      { role: 'system', content: 'You are an API documentation specialist.' },
      { role: 'user', content: prompt },
    ]);

    return {
      id: 'api-reference',
      title: 'API Reference',
      content: response.content,
      subsections: [],
    };
  }

  private async generateGettingStarted(
    codebaseMap: any,
    content: AnalyzedContent,
    context?: string
  ) {
    const contextSection = context ? `\n\nProject Context:\n${context}\n` : '';
    const prompt = `Create a getting started guide:

Project: ${codebaseMap.projectName}
Dependencies: ${content.dependencies.slice(0, 10).map(d => `${d.name}@${d.version}`).join(', ')}${contextSection}

Write a comprehensive getting started guide with:
1. Prerequisites (Node, Python, etc.)
2. Installation steps
3. Initial configuration
4. First run instructions
5. Verification steps
6. Common issues and troubleshooting

Format as markdown with clear step-by-step instructions.`;

    const response = await this.aiProvider.sendMessage([
      { role: 'system', content: 'You are a technical writer creating user-friendly setup guides.' },
      { role: 'user', content: prompt },
    ]);

    return {
      id: 'getting-started',
      title: 'Getting Started',
      content: response.content,
      subsections: [],
    };
  }

  private async generateUserGuide(
    codebaseMap: any,
    content: AnalyzedContent,
    context?: string
  ) {
    const contextSection = context ? `\n\nProject Context:\n${context}\n` : '';
    const prompt = `Create a user guide for this project:

Project: ${codebaseMap.projectName}
Components: ${content.mainComponents.slice(0, 15).map(c => c.name).join(', ')}
Configuration: ${content.configurations.length} options available${contextSection}

Write a comprehensive user guide covering:
1. Basic usage
2. Common workflows
3. Feature overview
4. Tips and best practices
5. FAQ

Format as markdown with practical examples.`;

    const response = await this.aiProvider.sendMessage([
      { role: 'system', content: 'You are a user experience writer creating clear user guides.' },
      { role: 'user', content: prompt },
    ]);

    return {
      id: 'user-guide',
      title: 'User Guide',
      content: response.content,
      subsections: [],
    };
  }

  private async generateConfigReference(content: AnalyzedContent) {
    const configDoc = content.configurations.map(cfg => `
### \`${cfg.name}\`

**Type:** ${cfg.type}
**Required:** ${cfg.required ? 'Yes' : 'No'}
${cfg.defaultValue ? `**Default:** \`${cfg.defaultValue}\`` : ''}

${cfg.description || 'No description available'}

${cfg.examples.length > 0 ? `
**Examples:**
\`\`\`
${cfg.examples.join('\n')}
\`\`\`
` : ''}
`).join('\n');

    return {
      id: 'configuration',
      title: 'Configuration Reference',
      content: `# Configuration Options\n\n${configDoc}`,
      subsections: [],
    };
  }

  private async generateDeveloperGuide(
    codebaseMap: any,
    content: AnalyzedContent,
    context?: string
  ) {
    const contextSection = context ? `\n\nProject Context:\n${context}\n` : '';
    const prompt = `Create a developer/contributor guide:

Project: ${codebaseMap.projectName}
Files: ${codebaseMap.files.length}
Components: ${content.mainComponents.length}${contextSection}

Write a developer guide including:
1. Development environment setup
2. Project structure for developers
3. Coding standards and conventions
4. Testing guidelines
5. Pull request process
6. Build and deployment

Format as markdown with clear guidelines.`;

    const response = await this.aiProvider.sendMessage([
      { role: 'system', content: 'You are a developer relations expert creating contributor guides.' },
      { role: 'user', content: prompt },
    ]);

    return {
      id: 'developer-guide',
      title: 'Developer Guide',
      content: response.content,
      subsections: [],
    };
  }

  private async generateExamples(content: AnalyzedContent) {
    const examplesDoc = content.examples.map(ex => `
## ${ex.title}

${ex.description}

\`\`\`${ex.language}
${ex.code}
\`\`\`
`).join('\n');

    return {
      id: 'examples',
      title: 'Examples',
      content: `# Examples\n\n${examplesDoc}`,
      subsections: [],
    };
  }

  private compileMarkdown(sections: any[], projectName: string): string {
    let markdown = `# ${projectName} Documentation\n\n`;
    markdown += `*Generated on ${new Date().toLocaleDateString()}*\n\n`;
    markdown += `## Table of Contents\n\n`;

    // Table of contents
    sections.forEach((section, idx) => {
      markdown += `${idx + 1}. [${section.title}](#${section.title.toLowerCase().replace(/\s+/g, '-')})\n`;
    });

    markdown += '\n---\n\n';

    // Sections
    sections.forEach(section => {
      markdown += `## ${section.title}\n\n`;
      markdown += `${section.content}\n\n`;
      markdown += '---\n\n';
    });

    markdown += `\n\n*Documentation generated by Code Sentinel AI*\n`;

    return markdown;
  }
}
