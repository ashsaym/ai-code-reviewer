/**
 * Module Documentor
 * 
 * Generates comprehensive documentation for modules/directories
 */

import * as core from '@actions/core';
import { BaseProvider } from '../providers/BaseProvider';
import { FileDocumentation } from './FileDocumentor';

export interface ModuleDocumentation {
  name: string;
  path: string;
  purpose: string;
  architecture: string;
  publicAPI: string[];
  internalStructure: string;
  files: FileDocumentation[];
  dependencies: ModuleDependency[];
  exports: ModuleExport[];
  usageGuide: string;
  modificationGuide: string;
  designPatterns: string[];
  performanceNotes: string;
  securityConsiderations: string;
  testingStrategy: string;
  commonPitfalls: string[];
  relatedModules: string[];
  fullAnalysis: string;
}

export interface ModuleDependency {
  module: string;
  purpose: string;
  criticalityLevel: 'critical' | 'high' | 'medium' | 'low';
  whatBreaksIfRemoved: string;
}

export interface ModuleExport {
  name: string;
  type: string;
  description: string;
  whenToUse: string;
  examples: string[];
}

export class ModuleDocumentor {
  constructor(private aiProvider: BaseProvider) {}

  async generateModuleDocumentation(
    moduleName: string,
    modulePath: string,
    files: any[],
    projectContext: string,
    fileDocumentations: FileDocumentation[],
    retryFn: <T>(op: () => Promise<T>, ctx: string) => Promise<T>
  ): Promise<ModuleDocumentation> {
    core.info(`📦 Generating comprehensive documentation for module: ${moduleName}`);

    const fileSummaries = fileDocumentations.map(fd => 
      `${fd.path}: ${fd.purpose}`
    ).join('\n');

    const moduleAnalysis = await retryFn(
      () => this.analyzeModule(
        moduleName,
        modulePath,
        files,
        projectContext,
        fileSummaries,
        fileDocumentations
      ),
      `Module analysis for ${moduleName}`
    );

    return {
      ...moduleAnalysis,
      files: fileDocumentations,
    };
  }

  private async analyzeModule(
    moduleName: string,
    modulePath: string,
    files: any[],
    projectContext: string,
    fileSummaries: string,
    fileDocumentations: FileDocumentation[]
  ): Promise<Omit<ModuleDocumentation, 'files'>> {
    const fileList = files.map(f => f.path).join('\n');
    const exportsList = fileDocumentations.flatMap(fd => 
      fd.exports.map(e => `${e.name} (${e.type}) from ${fd.path}`)
    ).join('\n');

    const prompt = `Analyze this module comprehensively:

MODULE: ${moduleName}
PATH: ${modulePath}
PROJECT CONTEXT: ${projectContext}

FILES IN MODULE:
${fileList}

FILE SUMMARIES:
${fileSummaries}

EXPORTS FROM THIS MODULE:
${exportsList}

Provide an extremely detailed analysis in JSON format:
{
  "name": "${moduleName}",
  "path": "${modulePath}",
  "purpose": "Detailed explanation of what this module does, why it exists, and its role in the project",
  "architecture": "Detailed description of the module's architecture: how files are organized, what patterns are used, how components interact",
  "publicAPI": ["List of all public exports and what they're for"],
  "internalStructure": "Detailed explanation of internal organization, private utilities, helper functions, and how they support the public API",
  "dependencies": [
    {
      "module": "dependency module name",
      "purpose": "why this module depends on it",
      "criticalityLevel": "critical|high|medium|low",
      "whatBreaksIfRemoved": "specific functionality that would break"
    }
  ],
  "exports": [
    {
      "name": "export name",
      "type": "function|class|interface|type|constant",
      "description": "what it does in detail",
      "whenToUse": "scenarios where you should use this",
      "examples": ["code examples showing usage"]
    }
  ],
  "usageGuide": "Comprehensive guide on how to use this module: import patterns, common use cases, integration with other modules, typical workflows",
  "modificationGuide": "Detailed guide on modifying this module: what to do if you need to add features, what to watch out for, what can break, testing considerations, backward compatibility",
  "designPatterns": ["Design patterns used in this module with explanations"],
  "performanceNotes": "Performance characteristics, bottlenecks, optimization opportunities, scalability considerations",
  "securityConsiderations": "Security implications, what to be careful about, input validation, authentication/authorization, sensitive data handling",
  "testingStrategy": "How this module should be tested, what tests exist, what coverage is needed, edge cases to consider",
  "commonPitfalls": ["Common mistakes developers make when using or modifying this module"],
  "relatedModules": ["Other modules that work closely with this one"],
  "fullAnalysis": "A comprehensive narrative covering: overall design philosophy, evolution of the module, technical debt, future improvements needed, integration points, cross-cutting concerns, and deep insights that only an experienced developer would know"
}

Be extremely thorough and detailed. Provide insights that would help both new users and experienced developers. Output valid JSON only.`;

    const response = await this.aiProvider.sendMessage([
      {
        role: 'system',
        content: 'You are a senior software architect and technical documentation expert. Provide comprehensive, deeply insightful module documentation. Output valid JSON only.',
      },
      { role: 'user', content: prompt },
    ], { responseFormat: 'json' });

    try {
      const parsed = JSON.parse(response.content);
      return parsed as Omit<ModuleDocumentation, 'files'>;
    } catch (error) {
      core.warning(`Failed to parse module documentation JSON for ${moduleName}: ${error}`);
      // Return a basic structure
      return {
        name: moduleName,
        path: modulePath,
        purpose: response.content,
        architecture: '',
        publicAPI: [],
        internalStructure: '',
        dependencies: [],
        exports: [],
        usageGuide: '',
        modificationGuide: '',
        designPatterns: [],
        performanceNotes: '',
        securityConsiderations: '',
        testingStrategy: '',
        commonPitfalls: [],
        relatedModules: [],
        fullAnalysis: response.content,
      };
    }
  }
}
