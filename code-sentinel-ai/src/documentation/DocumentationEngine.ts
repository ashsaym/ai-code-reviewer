/**
 * Documentation Engine
 * 
 * Main orchestrator for documentation generation
 */

import * as core from '@actions/core';
import { BaseProvider } from '../providers/BaseProvider';
import { CodebaseMapper } from '../common/CodebaseMapper';
import { ContentAnalyzer, AnalyzedContent } from './ContentAnalyzer';
import { DocumentationResult, DocumentationScope } from './types';

export class DocumentationEngine {
  constructor(
    private workspacePath: string,
    private aiProvider: BaseProvider,
    private scope: DocumentationScope = 'full',
    private includePatterns?: string[],
    private excludePatterns?: string[]
  ) {}

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

      // 3. Generate documentation sections based on scope
      const sections = await this.generateSections(codebaseMap, analyzedContent);
      
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

  private async generateSections(codebaseMap: any, content: AnalyzedContent) {
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

    // Project Overview
    if (shouldInclude.overview) {
      core.info('📝 Generating project overview...');
      const overview = await this.generateOverview(codebaseMap, content);
      sections.push({ ...overview, order: order++ });
    }

    // Architecture
    if (shouldInclude.architecture) {
      core.info('🏗️  Documenting architecture...');
      const architecture = await this.generateArchitecture(codebaseMap, content);
      sections.push({ ...architecture, order: order++ });
    }

    // API Reference
    if (shouldInclude.api && content.apiEndpoints.length > 0) {
      core.info('📡 Creating API reference...');
      const apiRef = await this.generateAPIReference(content);
      sections.push({ ...apiRef, order: order++ });
    }

    // Getting Started
    if (shouldInclude.gettingStarted) {
      core.info('🚀 Writing getting started guide...');
      const gettingStarted = await this.generateGettingStarted(codebaseMap, content);
      sections.push({ ...gettingStarted, order: order++ });
    }

    // User Guide
    if (shouldInclude.userGuide) {
      core.info('👤 Creating user guide...');
      const userGuide = await this.generateUserGuide(codebaseMap, content);
      sections.push({ ...userGuide, order: order++ });
    }

    // Configuration Reference
    if (shouldInclude.configuration && content.configurations.length > 0) {
      core.info('⚙️  Documenting configuration...');
      const configRef = await this.generateConfigReference(content);
      sections.push({ ...configRef, order: order++ });
    }

    // Developer Guide
    if (shouldInclude.developerGuide) {
      core.info('💻 Creating developer guide...');
      const devGuide = await this.generateDeveloperGuide(codebaseMap, content);
      sections.push({ ...devGuide, order: order++ });
    }

    // Examples
    if (shouldInclude.examples && content.examples.length > 0) {
      core.info('📖 Adding examples...');
      const examples = await this.generateExamples(content);
      sections.push({ ...examples, order: order++ });
    }

    return sections;
  }

  private async generateOverview(codebaseMap: any, content: AnalyzedContent) {
    const prompt = `Generate a comprehensive project overview for this project:

Project: ${codebaseMap.projectName}
Files: ${codebaseMap.files.length}
Languages: ${Object.keys(codebaseMap.statistics.languageBreakdown).join(', ')}
Main Components: ${content.mainComponents.slice(0, 10).map(c => c.name).join(', ')}
Dependencies: ${content.dependencies.slice(0, 10).map(d => d.name).join(', ')}

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

  private async generateArchitecture(codebaseMap: any, content: AnalyzedContent) {
    const prompt = `Document the system architecture:

Project: ${codebaseMap.projectName}
Structure: ${JSON.stringify(codebaseMap.structure, null, 2).slice(0, 2000)}
Components: ${content.mainComponents.map(c => `${c.name} (${c.type})`).join(', ')}
Dependencies: ${content.dependencies.map(d => d.name).join(', ')}

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

  private async generateAPIReference(content: AnalyzedContent) {
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

${endpointsDoc}

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

  private async generateGettingStarted(codebaseMap: any, content: AnalyzedContent) {
    const prompt = `Create a getting started guide:

Project: ${codebaseMap.projectName}
Dependencies: ${content.dependencies.slice(0, 10).map(d => `${d.name}@${d.version}`).join(', ')}

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

  private async generateUserGuide(codebaseMap: any, content: AnalyzedContent) {
    const prompt = `Create a user guide for this project:

Project: ${codebaseMap.projectName}
Components: ${content.mainComponents.slice(0, 15).map(c => c.name).join(', ')}
Configuration: ${content.configurations.length} options available

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

  private async generateDeveloperGuide(codebaseMap: any, content: AnalyzedContent) {
    const prompt = `Create a developer/contributor guide:

Project: ${codebaseMap.projectName}
Files: ${codebaseMap.files.length}
Components: ${content.mainComponents.length}

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
