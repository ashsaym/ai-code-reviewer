/**
 * File Documentor
 * 
 * Generates comprehensive documentation for individual files
 */

import * as core from '@actions/core';
import { readFileSync } from 'fs';
import { BaseProvider } from '../providers/BaseProvider';

export interface FileDocumentation {
  path: string;
  purpose: string;
  exports: ExportItem[];
  dependencies: string[];
  complexity: 'low' | 'medium' | 'high';
  keyFunctions: FunctionDoc[];
  keyClasses: ClassDoc[];
  usageExamples: string[];
  modificationGuide: string;
  relatedFiles: string[];
  fullAnalysis: string;
}

export interface ExportItem {
  name: string;
  type: 'function' | 'class' | 'interface' | 'type' | 'constant' | 'variable';
  signature?: string;
  description: string;
}

export interface FunctionDoc {
  name: string;
  signature: string;
  purpose: string;
  parameters: ParameterDoc[];
  returns: string;
  throwsErrors: string[];
  examples: string[];
  complexity: string;
}

export interface ParameterDoc {
  name: string;
  type: string;
  description: string;
  optional: boolean;
  defaultValue?: string;
}

export interface ClassDoc {
  name: string;
  purpose: string;
  properties: PropertyDoc[];
  methods: MethodDoc[];
  inheritance: string[];
  interfaces: string[];
  usagePattern: string;
}

export interface PropertyDoc {
  name: string;
  type: string;
  visibility: 'public' | 'private' | 'protected';
  description: string;
}

export interface MethodDoc {
  name: string;
  signature: string;
  purpose: string;
  visibility: 'public' | 'private' | 'protected';
  isStatic: boolean;
  isAsync: boolean;
}

export class FileDocumentor {
  constructor(private aiProvider: BaseProvider) {}

  async generateFileDocumentation(
    filePath: string,
    projectContext: string,
    moduleContext: string,
    retryFn: <T>(op: () => Promise<T>, ctx: string) => Promise<T>
  ): Promise<FileDocumentation> {
    core.debug(`Generating comprehensive documentation for ${filePath}`);

    let content = '';
    try {
      content = readFileSync(filePath, 'utf-8');
    } catch (error) {
      core.warning(`Could not read file ${filePath}: ${error}`);
      throw error;
    }

    // Truncate very large files for analysis
    const maxChars = 50000;
    const truncatedContent = content.length > maxChars 
      ? content.slice(0, maxChars) + '\n\n... (file truncated for analysis)'
      : content;

    // Generate comprehensive file analysis
    const analysis = await retryFn(
      () => this.analyzeFile(filePath, truncatedContent, projectContext, moduleContext),
      `File analysis for ${filePath}`
    );

    return analysis;
  }

  private async analyzeFile(
    filePath: string,
    content: string,
    projectContext: string,
    moduleContext: string
  ): Promise<FileDocumentation> {
    const prompt = `Analyze this file comprehensively and provide detailed documentation:

FILE: ${filePath}
PROJECT CONTEXT: ${projectContext}
MODULE CONTEXT: ${moduleContext}

FILE CONTENT:
\`\`\`
${content}
\`\`\`

Provide a comprehensive analysis in JSON format with the following structure:
{
  "path": "${filePath}",
  "purpose": "Detailed explanation of what this file does and why it exists",
  "exports": [
    {
      "name": "exported item name",
      "type": "function|class|interface|type|constant|variable",
      "signature": "full type signature if applicable",
      "description": "what this export does and when to use it"
    }
  ],
  "dependencies": ["list of imports and what they're used for"],
  "complexity": "low|medium|high with reasoning",
  "keyFunctions": [
    {
      "name": "function name",
      "signature": "full function signature",
      "purpose": "what it does and why",
      "parameters": [
        {
          "name": "param name",
          "type": "param type",
          "description": "what this parameter is for",
          "optional": true/false,
          "defaultValue": "if applicable"
        }
      ],
      "returns": "what it returns and in what scenarios",
      "throwsErrors": ["what errors can be thrown"],
      "examples": ["code examples showing usage"],
      "complexity": "complexity assessment"
    }
  ],
  "keyClasses": [
    {
      "name": "class name",
      "purpose": "what this class represents and does",
      "properties": [
        {
          "name": "property name",
          "type": "property type",
          "visibility": "public|private|protected",
          "description": "what this property stores"
        }
      ],
      "methods": [
        {
          "name": "method name",
          "signature": "full signature",
          "purpose": "what it does",
          "visibility": "public|private|protected",
          "isStatic": true/false,
          "isAsync": true/false
        }
      ],
      "inheritance": ["parent classes"],
      "interfaces": ["implemented interfaces"],
      "usagePattern": "how to instantiate and use this class"
    }
  ],
  "usageExamples": ["practical code examples showing how to use this file's exports"],
  "modificationGuide": "Detailed guide on how to modify this file, what to watch out for, what breaks if you change X, common pitfalls",
  "relatedFiles": ["files that depend on this or that this depends on"],
  "fullAnalysis": "A comprehensive narrative analysis covering: architecture decisions, design patterns used, performance considerations, error handling approach, testing strategy, security implications, and anything a developer needs to understand to work with this file effectively"
}

Ensure the response is valid JSON. Be extremely detailed and thorough.`;

    const response = await this.aiProvider.sendMessage([
      {
        role: 'system',
        content: 'You are an expert code analyst and technical writer. Provide extremely detailed, comprehensive code documentation. Output valid JSON only.',
      },
      { role: 'user', content: prompt },
    ], { responseFormat: 'json' });

    try {
      const parsed = JSON.parse(response.content);
      return parsed as FileDocumentation;
    } catch (error) {
      core.warning(`Failed to parse file documentation JSON for ${filePath}: ${error}`);
      // Return a basic structure
      return {
        path: filePath,
        purpose: response.content,
        exports: [],
        dependencies: [],
        complexity: 'medium',
        keyFunctions: [],
        keyClasses: [],
        usageExamples: [],
        modificationGuide: 'Analysis parsing failed',
        relatedFiles: [],
        fullAnalysis: response.content,
      };
    }
  }
}
