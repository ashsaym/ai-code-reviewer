/**
 * Full Scan Engine
 * 
 * Orchestrates comprehensive codebase analysis with multiple passes
 */

import * as core from '@actions/core';
import { CodebaseMapper } from './CodebaseMapper';
import { FileAggregator } from './FileAggregator';
import { BaseProvider } from '../providers/BaseProvider';
import {
  ScanType,
  ScanScope,
  ScanResult,
  ScanPhase,
  ModuleAnalysis,
  FileGroup,
  Finding,
  CodebaseMap,
} from './types';

export class FullScanEngine {
  private workspacePath: string;
  private provider: BaseProvider;
  private scanType: ScanType;
  private scanScope: ScanScope;
  private customIncludePatterns?: string[];
  private customExcludePatterns?: string[];
  private maxTokensPerCall: number;

  constructor(
    workspacePath: string,
    provider: BaseProvider,
    scanType: ScanType,
    scanScope: ScanScope,
    customIncludePatterns?: string[],
    customExcludePatterns?: string[]
  ) {
    this.workspacePath = workspacePath;
    this.provider = provider;
    this.scanType = scanType;
    this.scanScope = scanScope;
    this.customIncludePatterns = customIncludePatterns;
    this.customExcludePatterns = customExcludePatterns;
    this.maxTokensPerCall = provider.getMaxTokens();
  }

  /**
   * Execute full scan
   */
  async execute(): Promise<ScanResult> {
    const startTime = Date.now();
    const scanId = `scan-${Date.now()}`;

    core.info('🚀 Starting Full Codebase Scan');
    core.info(`  Type: ${this.scanType}`);
    core.info(`  Scope: ${this.scanScope}`);
    core.info(`  Max Tokens/Call: ${this.maxTokensPerCall.toLocaleString()}`);
    core.info('');

    // Phase 1: Map the codebase
    const mapper = new CodebaseMapper(
      this.workspacePath,
      this.scanScope,
      this.customIncludePatterns,
      this.customExcludePatterns
    );
    const codebaseMap = await mapper.createMap();

    core.info(`📊 Codebase Statistics:`);
    core.info(`  Files: ${codebaseMap.statistics.totalFiles}`);
    core.info(`  Lines: ${codebaseMap.statistics.totalLines.toLocaleString()}`);
    core.info(`  Tokens: ${codebaseMap.statistics.totalTokens.toLocaleString()}`);
    core.info('');

    // Save codebase map
    const mapPath = `/tmp/codebase-map-${scanId}.json`;
    await mapper.saveToFile(codebaseMap, mapPath);

    // Phase 2: Group files intelligently
    const aggregator = new FileAggregator(this.maxTokensPerCall);
    const phases = this.createScanPhases(codebaseMap, aggregator);

    core.info(`📋 Scan Plan:`);
    for (const phase of phases) {
      core.info(`  ${phase.name}: ${phase.expectedCalls} LLM calls`);
    }
    core.info('');

    // Phase 3: Execute analysis
    const phaseResults = [];
    let totalCalls = 0;
    let totalTokens = 0;

    for (const phase of phases) {
      core.startGroup(`🔍 ${phase.name}`);
      
      const moduleAnalyses: ModuleAnalysis[] = [];

      for (const group of phase.fileGroups) {
        core.info(`Analyzing: ${group.name} (${group.files.length} files, ${group.totalTokens.toLocaleString()} tokens)`);

        const analysis = await this.analyzeFileGroup(phase, group, codebaseMap);
        moduleAnalyses.push(analysis);
        
        totalCalls++;
        totalTokens += analysis.tokensUsed;

        core.info(`  ✓ Found ${analysis.findings.length} findings`);
      }

      // Synthesize phase results
      const phaseSummary = await this.synthesizePhase(phase, moduleAnalyses);

      phaseResults.push({
        name: phase.name,
        moduleAnalyses,
        summary: phaseSummary,
      });

      core.endGroup();
    }

    // Phase 4: Overall synthesis
    core.startGroup('🎯 Synthesizing Results');
    const synthesis = await this.synthesizeOverall(phaseResults, codebaseMap);
    core.endGroup();

    // Phase 5: Compile results
    const duration = Date.now() - startTime;
    const allFindings = phaseResults.flatMap(p => 
      p.moduleAnalyses.flatMap(m => m.findings)
    );

    const result: ScanResult = {
      scanId,
      scanType: this.scanType,
      timestamp: new Date().toISOString(),
      duration,
      codebaseMap,
      phases: phaseResults,
      overallFindings: allFindings,
      statistics: {
        totalFiles: codebaseMap.statistics.totalFiles,
        filesAnalyzed: codebaseMap.files.length,
        totalCalls,
        totalTokens,
        criticalIssues: allFindings.filter(f => f.severity === 'critical').length,
        highIssues: allFindings.filter(f => f.severity === 'high').length,
        mediumIssues: allFindings.filter(f => f.severity === 'medium').length,
        lowIssues: allFindings.filter(f => f.severity === 'low').length,
      },
      recommendations: synthesis.recommendations,
      executiveSummary: synthesis.executiveSummary,
    };

    core.info('');
    core.info('✅ Scan Complete!');
    core.info(`  Duration: ${(duration / 1000 / 60).toFixed(1)} minutes`);
    core.info(`  LLM Calls: ${totalCalls}`);
    core.info(`  Total Tokens: ${totalTokens.toLocaleString()}`);
    core.info(`  Findings: ${allFindings.length} (${result.statistics.criticalIssues} critical, ${result.statistics.highIssues} high)`);

    return result;
  }

  /**
   * Create scan phases based on type
   */
  private createScanPhases(codebaseMap: CodebaseMap, aggregator: FileAggregator): ScanPhase[] {
    if (this.scanType === 'security') {
      return this.createSecurityPhases(codebaseMap, aggregator);
    }
    
    if (this.scanType === 'quality') {
      return this.createQualityPhases(codebaseMap, aggregator);
    }
    
    if (this.scanType === 'documentation') {
      return this.createDocumentationPhases(codebaseMap, aggregator);
    }
    
    if (this.scanType === 'architecture') {
      return this.createArchitecturePhases(codebaseMap, aggregator);
    }

    // 'all' - comprehensive scan
    return [
      ...this.createSecurityPhases(codebaseMap, aggregator),
      ...this.createQualityPhases(codebaseMap, aggregator),
      ...this.createArchitecturePhases(codebaseMap, aggregator),
    ];
  }

  /**
   * Create security scan phases
   */
  private createSecurityPhases(codebaseMap: CodebaseMap, aggregator: FileAggregator): ScanPhase[] {
    const securityGroups = aggregator.groupByCategory(codebaseMap, 'security');
    const infrastructureGroups = aggregator.groupByCategory(codebaseMap, 'infrastructure');
    const configGroups = aggregator.groupByCategory(codebaseMap, 'config');

    return [
      {
        name: 'Security Analysis',
        description: 'Deep security vulnerability analysis',
        fileGroups: securityGroups,
        systemPrompt: this.getSecurityPrompt(),
        maxTokensPerCall: this.maxTokensPerCall,
        expectedCalls: securityGroups.length,
      },
      {
        name: 'Infrastructure Security',
        description: 'API, database, and infrastructure security',
        fileGroups: infrastructureGroups,
        systemPrompt: this.getInfrastructureSecurityPrompt(),
        maxTokensPerCall: this.maxTokensPerCall,
        expectedCalls: infrastructureGroups.length,
      },
      {
        name: 'Configuration Security',
        description: 'Configuration and deployment security',
        fileGroups: configGroups,
        systemPrompt: this.getConfigSecurityPrompt(),
        maxTokensPerCall: this.maxTokensPerCall,
        expectedCalls: configGroups.length,
      },
    ];
  }

  /**
   * Create quality scan phases
   */
  private createQualityPhases(codebaseMap: CodebaseMap, aggregator: FileAggregator): ScanPhase[] {
    const businessLogicGroups = aggregator.groupByCategory(codebaseMap, 'business-logic');

    return [
      {
        name: 'Code Quality Analysis',
        description: 'Code quality, best practices, and maintainability',
        fileGroups: businessLogicGroups,
        systemPrompt: this.getQualityPrompt(),
        maxTokensPerCall: this.maxTokensPerCall,
        expectedCalls: businessLogicGroups.length,
      },
    ];
  }

  /**
   * Create architecture scan phases
   */
  private createArchitecturePhases(codebaseMap: CodebaseMap, aggregator: FileAggregator): ScanPhase[] {
    const allGroups = aggregator.groupByModule(codebaseMap);

    return [
      {
        name: 'Architecture Review',
        description: 'High-level architecture and design patterns',
        fileGroups: allGroups,
        systemPrompt: this.getArchitecturePrompt(),
        maxTokensPerCall: this.maxTokensPerCall,
        expectedCalls: allGroups.length,
      },
    ];
  }

  /**
   * Create documentation phases
   */
  private createDocumentationPhases(codebaseMap: CodebaseMap, aggregator: FileAggregator): ScanPhase[] {
    const allGroups = aggregator.groupByModule(codebaseMap);

    return [
      {
        name: 'Documentation Generation',
        description: 'Generate comprehensive project documentation',
        fileGroups: allGroups,
        systemPrompt: this.getDocumentationPrompt(),
        maxTokensPerCall: this.maxTokensPerCall,
        expectedCalls: allGroups.length,
      },
    ];
  }

  /**
   * Analyze a group of files
   */
  private async analyzeFileGroup(
    phase: ScanPhase,
    group: FileGroup,
    codebaseMap: CodebaseMap
  ): Promise<ModuleAnalysis> {
    // Build context
    const contextPrompt = this.buildContextPrompt(group, codebaseMap);
    
    // Send to LLM
    const response = await this.provider.sendMessage([
      { role: 'system', content: phase.systemPrompt },
      { role: 'user', content: contextPrompt },
    ], { responseFormat: 'json' });

    // Parse findings
    const findings = this.parseFindings(response.content, group);

    return {
      moduleName: group.name,
      filesAnalyzed: group.files.length,
      tokensUsed: response.usage.totalTokens,
      findings,
      summary: this.extractSummary(response.content),
      recommendations: this.extractRecommendations(response.content),
    };
  }

  /**
   * Build context prompt for file group
   */
  private buildContextPrompt(group: FileGroup, codebaseMap: CodebaseMap): string {
    const fileContents = group.files.map(file => `
## File: ${file.relativePath}
**Language**: ${file.language}
**Lines**: ${file.lines}
**Module**: ${file.module}

\`\`\`${file.language.toLowerCase()}
${file.content}
\`\`\`
`).join('\n\n');

    return `
# Codebase Analysis Request

## Project Context
- **Project**: ${codebaseMap.projectName}
- **Total Files**: ${codebaseMap.statistics.totalFiles}
- **Languages**: ${Object.keys(codebaseMap.statistics.filesByLanguage).join(', ')}

## This Analysis Group
- **Group**: ${group.name}
- **Category**: ${group.category}
- **Files**: ${group.files.length}

## Files to Analyze
${fileContents}

## Instructions
**CRITICAL**: You MUST respond in JSON format. Analyze these files and provide your findings as a JSON object with the following structure:

\`\`\`json
{
  "summary": "Brief overview of this module",
  "findings": [
    {
      "severity": "critical|high|medium|low|info",
      "category": "security|performance|maintainability|etc",
      "title": "Short title",
      "description": "Detailed description",
      "file": "relative/path/to/file",
      "line": 42,
      "code": "problematic code snippet",
      "recommendation": "How to fix"
    }
  ],
  "recommendations": ["List of improvement suggestions"]
}
\`\`\`

Return ONLY the JSON object, no additional text before or after.
`;
  }

  /**
   * Parse findings from LLM response
   */
  private parseFindings(content: string, group: FileGroup): Finding[] {
    try {
      const parsed = JSON.parse(content);
      return (parsed.findings || []).map((f: any, index: number) => ({
        id: `${group.id}-finding-${index + 1}`,
        severity: f.severity || 'info',
        category: f.category || 'general',
        title: f.title || 'Untitled Finding',
        description: f.description || '',
        file: f.file || '',
        line: f.line,
        code: f.code,
        recommendation: f.recommendation || '',
        references: f.references || [],
      }));
    } catch (error) {
      core.warning(`Failed to parse findings: ${error}`);
      return [];
    }
  }

  /**
   * Extract summary from response
   */
  private extractSummary(content: string): string {
    try {
      const parsed = JSON.parse(content);
      return parsed.summary || 'No summary available';
    } catch {
      return content.substring(0, 500);
    }
  }

  /**
   * Extract recommendations from response
   */
  private extractRecommendations(content: string): string[] {
    try {
      const parsed = JSON.parse(content);
      return parsed.recommendations || [];
    } catch {
      return [];
    }
  }

  /**
   * Synthesize phase results
   */
  private async synthesizePhase(_phase: ScanPhase, analyses: ModuleAnalysis[]): Promise<string> {
    const summaries = analyses.map(a => `### ${a.moduleName}\n${a.summary}`).join('\n\n');
    const totalFindings = analyses.reduce((sum, a) => sum + a.findings.length, 0);

    const prompt = `
Synthesize the following module analyses into a cohesive phase summary:

${summaries}

Total findings: ${totalFindings}

Provide a 2-3 paragraph summary highlighting:
1. Key patterns and trends
2. Most critical issues
3. Overall assessment
`;

    const response = await this.provider.sendMessage([
      { role: 'system', content: 'You are a technical summarization expert.' },
      { role: 'user', content: prompt },
    ]);

    return response.content;
  }

  /**
   * Synthesize overall results
   */
  private async synthesizeOverall(
    phaseResults: any[],
    codebaseMap: CodebaseMap
  ): Promise<{ executiveSummary: string; recommendations: any }> {
    const phaseSummaries = phaseResults.map(p => `## ${p.name}\n${p.summary}`).join('\n\n');

    const prompt = `
Generate an executive summary for a comprehensive codebase analysis:

Project: ${codebaseMap.projectName}
Files analyzed: ${codebaseMap.statistics.totalFiles}

${phaseSummaries}

Provide in JSON format:
{
  "executiveSummary": "2-3 paragraph executive summary",
  "immediate": ["Critical actions needed now"],
  "shortTerm": ["Actions for next sprint/month"],
  "longTerm": ["Strategic improvements"]
}
`;

    const response = await this.provider.sendMessage([
      { role: 'system', content: 'You are a technical executive summary expert.' },
      { role: 'user', content: prompt },
    ], { responseFormat: 'json' });

    try {
      const parsed = JSON.parse(response.content);
      return {
        executiveSummary: parsed.executiveSummary || '',
        recommendations: {
          immediate: parsed.immediate || [],
          shortTerm: parsed.shortTerm || [],
          longTerm: parsed.longTerm || [],
        },
      };
    } catch {
      return {
        executiveSummary: response.content,
        recommendations: { immediate: [], shortTerm: [], longTerm: [] },
      };
    }
  }

  // System prompts for different scan types
  private getSecurityPrompt(): string {
    return `You are a senior security engineer specialized in application security and vulnerability assessment.

Analyze the provided code for security vulnerabilities including:
- SQL injection, XSS, CSRF
- Authentication/authorization flaws
- Insecure data storage
- Cryptographic issues
- API security
- Dependency vulnerabilities
- Secrets in code

Be thorough and provide actionable recommendations.

Respond in JSON format with the following structure:
{
  "summary": "Brief summary of security analysis",
  "findings": [
    {
      "severity": "critical|high|medium|low|info",
      "category": "security",
      "title": "Short title",
      "description": "Detailed description",
      "file": "relative/path/to/file",
      "line": 42,
      "code": "problematic code snippet",
      "recommendation": "How to fix"
    }
  ],
  "recommendations": ["List of security improvement suggestions"]
}`;
  }

  private getInfrastructureSecurityPrompt(): string {
    return `You are an infrastructure security expert.

Analyze APIs, databases, caching, and infrastructure code for:
- API security (rate limiting, authentication, input validation)
- Database security (SQL injection, access control)
- Network security
- Container/deployment security
- Logging and monitoring gaps

Respond in JSON format with the following structure:
{
  "summary": "Brief summary of infrastructure security analysis",
  "findings": [
    {
      "severity": "critical|high|medium|low|info",
      "category": "infrastructure-security",
      "title": "Short title",
      "description": "Detailed description",
      "file": "relative/path/to/file",
      "line": 42,
      "code": "problematic code snippet",
      "recommendation": "How to fix"
    }
  ],
  "recommendations": ["List of infrastructure security improvement suggestions"]
}`;
  }

  private getConfigSecurityPrompt(): string {
    return `You are a DevSecOps expert.

Analyze configuration files for:
- Exposed secrets and credentials
- Insecure default configurations
- CI/CD pipeline security
- Container security (Dockerfile)
- Infrastructure as Code issues

Respond in JSON format with the following structure:
{
  "summary": "Brief summary of configuration security analysis",
  "findings": [
    {
      "severity": "critical|high|medium|low|info",
      "category": "config-security",
      "title": "Short title",
      "description": "Detailed description",
      "file": "relative/path/to/file",
      "line": 42,
      "code": "problematic code snippet",
      "recommendation": "How to fix"
    }
  ],
  "recommendations": ["List of configuration security improvement suggestions"]
}`;
  }

  private getQualityPrompt(): string {
    return `You are a senior software engineer focused on code quality and maintainability.

Analyze code for:
- Code smells and anti-patterns
- Best practices violations
- Performance issues
- Maintainability concerns
- Testing gaps
- Documentation quality

Respond in JSON format with the following structure:
{
  "summary": "Brief summary of code quality analysis",
  "findings": [
    {
      "severity": "critical|high|medium|low|info",
      "category": "quality",
      "title": "Short title",
      "description": "Detailed description",
      "file": "relative/path/to/file",
      "line": 42,
      "code": "problematic code snippet",
      "recommendation": "How to fix"
    }
  ],
  "recommendations": ["List of code quality improvement suggestions"]
}`;
  }

  private getArchitecturePrompt(): string {
    return `You are a software architect.

Analyze the overall architecture for:
- Design patterns usage
- Separation of concerns
- Scalability considerations
- Module coupling and cohesion
- Architectural anti-patterns
- Improvement opportunities

Respond in JSON format with the following structure:
{
  "summary": "Brief summary of architecture analysis",
  "findings": [
    {
      "severity": "critical|high|medium|low|info",
      "category": "architecture",
      "title": "Short title",
      "description": "Detailed description",
      "file": "relative/path/to/file",
      "line": 42,
      "code": "problematic code snippet",
      "recommendation": "How to fix"
    }
  ],
  "recommendations": ["List of architectural improvement suggestions"]
}`;
  }

  private getDocumentationPrompt(): string {
    return `You are a senior technical writer and documentation expert specializing in creating comprehensive, world-class open-source project documentation.

Your task is to analyze the provided code and generate DETAILED, PRECISE, and INFORMATIVE documentation that would be suitable for a professional open-source project.

Create documentation covering:

## 1. Project Overview
- Clear, compelling project description and purpose
- Key features and capabilities
- Target audience and use cases
- Problem it solves and value proposition

## 2. Architecture Documentation
- High-level system architecture diagram (described in text)
- Component breakdown and responsibilities
- Design patterns and architectural decisions
- Data flow and control flow
- Module interactions and dependencies
- Technology stack and rationale

## 3. API Documentation
- All public APIs, functions, and methods
- Input parameters, return types, and exceptions
- Code examples for each major function
- Authentication and authorization (if applicable)
- Rate limits and constraints

## 4. Setup & Installation
- Prerequisites and system requirements
- Step-by-step installation instructions
- Configuration options and environment variables
- Troubleshooting common setup issues

## 5. Usage Guide
- Quick start guide with minimal example
- Common use cases and workflows
- Best practices and recommendations
- Integration examples
- Advanced usage patterns

## 6. Development Guide
- Development environment setup
- Code structure and organization
- Coding standards and conventions
- Testing strategy and how to run tests
- Contribution guidelines
- Build and deployment process

## 7. Configuration Reference
- All configuration options with descriptions
- Default values and valid ranges
- Configuration file examples
- Environment-specific configurations

## 8. Troubleshooting & FAQ
- Common issues and solutions
- Error messages and their meanings
- Performance optimization tips
- Debugging techniques

## 9. API Reference
- Complete API reference for all public interfaces
- Request/response examples
- Error codes and handling

## 10. Examples & Tutorials
- Real-world usage examples
- Step-by-step tutorials
- Sample projects and templates

Ensure the documentation is:
- **Precise**: Accurate technical details with no ambiguity
- **Informative**: Rich context explaining WHY, not just WHAT
- **Complete**: Cover all aspects thoroughly
- **Well-structured**: Logical organization with clear hierarchy
- **User-friendly**: Written for both beginners and advanced users
- **Searchable**: Include keywords and cross-references
- **Maintainable**: Easy to update as code evolves

Format your response in well-structured Markdown with proper headings, code blocks, tables, and examples.`;
  }
}
