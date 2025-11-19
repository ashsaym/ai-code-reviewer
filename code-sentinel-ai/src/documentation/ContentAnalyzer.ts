/**
 * Content Analyzer
 * 
 * Analyzes codebase to extract content for documentation
 */

import { readFileSync } from 'fs';
import * as core from '@actions/core';
import { CodebaseMap } from '../common/types';

export interface AnalyzedContent {
  apiEndpoints: APIEndpoint[];
  configurations: ConfigurationItem[];
  mainComponents: Component[];
  dependencies: DependencyInfo[];
  examples: CodeExample[];
}

export interface APIEndpoint {
  path: string;
  method: string;
  description: string;
  parameters: Parameter[];
  responses: Response[];
  location: string;
}

export interface Parameter {
  name: string;
  type: string;
  required: boolean;
  description: string;
}

export interface Response {
  status: number;
  description: string;
  schema?: string;
}

export interface ConfigurationItem {
  name: string;
  type: string;
  defaultValue?: string;
  description: string;
  required: boolean;
  examples: string[];
}

export interface Component {
  name: string;
  type: 'class' | 'function' | 'module' | 'service';
  description: string;
  location: string;
  publicAPI: string[];
}

export interface DependencyInfo {
  name: string;
  version: string;
  purpose: string;
  type: 'production' | 'development';
}

export interface CodeExample {
  title: string;
  description: string;
  code: string;
  language: string;
}

export class ContentAnalyzer {
  constructor(private codebaseMap: CodebaseMap) {}

  async analyze(): Promise<AnalyzedContent> {
    core.info('🔍 Analyzing codebase content...');

    const apiEndpoints = this.extractAPIEndpoints();
    const configurations = this.extractConfigurations();
    const mainComponents = this.extractComponents();
    const dependencies = this.extractDependencies();
    const examples = this.extractExamples();

    return {
      apiEndpoints,
      configurations,
      mainComponents,
      dependencies,
      examples,
    };
  }

  /**
   * Get package.json for project metadata (only for technical info like dependencies)
   */
  getPackageJson(): any {
    return this.codebaseMap.dependencies?.packageJson || {};
  }

  /**
   * Get code samples from specific files for analysis
   */
  getFilesContent(filePaths: string[], maxCharsPerFile: number = 3000): Array<{path: string, content: string, language: string}> {
    const samples: Array<{path: string, content: string, language: string}> = [];
    
    for (const filePath of filePaths) {
      const file = this.codebaseMap.files.find(f => f.path === filePath || f.relativePath === filePath);
      if (!file) continue;
      
      const truncatedContent = file.content.length > maxCharsPerFile
        ? file.content.slice(0, maxCharsPerFile) + '\n\n// ... (file truncated for analysis)'
        : file.content;
      
      samples.push({
        path: file.relativePath,
        content: truncatedContent,
        language: file.language
      });
    }

    return samples;
  }

  /**
   * Get all files in a specific directory/module
   */
  getModuleFiles(modulePath: string): Array<{path: string, relativePath: string, language: string, size: number}> {
    return this.codebaseMap.files
      .filter(f => f.relativePath.startsWith(modulePath))
      .map(f => ({
        path: f.path,
        relativePath: f.relativePath,
        language: f.language,
        size: f.size
      }));
  }

  private extractAPIEndpoints(): APIEndpoint[] {
    const endpoints: APIEndpoint[] = [];
    const routeFiles = this.codebaseMap.files.filter(f => 
      f.path.includes('route') || 
      f.path.includes('controller') || 
      f.path.includes('endpoint')
    );

    // Simple pattern matching - can be enhanced with AST parsing
    routeFiles.forEach(file => {
      try {
        const content = readFileSync(file.path, 'utf-8');
        const lines = content.split('\n');

        lines.forEach((line, idx) => {
          // Match common route patterns
          const getMatch = line.match(/\.get\(['"`]([^'"`]+)['"`]/);
          const postMatch = line.match(/\.post\(['"`]([^'"`]+)['"`]/);
          const putMatch = line.match(/\.put\(['"`]([^'"`]+)['"`]/);
          const deleteMatch = line.match(/\.delete\(['"`]([^'"`]+)['"`]/);

          if (getMatch || postMatch || putMatch || deleteMatch) {
            const match = getMatch || postMatch || putMatch || deleteMatch;
            if (match) {
              // Calculate character position for the line
              const linePosition = lines.slice(0, idx).join('\n').length;
              endpoints.push({
                path: match[1],
                method: getMatch ? 'GET' : postMatch ? 'POST' : putMatch ? 'PUT' : 'DELETE',
                description: this.extractDescriptionFromPosition(content, linePosition),
                parameters: [],
                responses: [],
                location: `${file.path}:${idx + 1}`,
              });
            }
          }
        });
      } catch (error) {
        core.debug(`Failed to parse ${file.path}: ${error}`);
      }
    });

    return endpoints;
  }

  private extractConfigurations(): ConfigurationItem[] {
    const configs: ConfigurationItem[] = [];
    const configFiles = this.codebaseMap.files.filter(f =>
      f.path.includes('config') ||
      f.path.endsWith('.env.example') ||
      f.path.endsWith('action.yml')
    );

    configFiles.forEach(file => {
      try {
        const content = readFileSync(file.path, 'utf-8');
        const lines = content.split('\n');

        lines.forEach(line => {
          // Match environment variables
          const envMatch = line.match(/^([A-Z_]+)=(.+)$/);
          if (envMatch) {
            configs.push({
              name: envMatch[1],
              type: 'environment',
              defaultValue: envMatch[2],
              description: '',
              required: true,
              examples: [envMatch[2]],
            });
          }

          // Match action inputs (YAML)
          const inputMatch = line.match(/^\s+(\w+[-\w]*):$/);
          if (inputMatch && file.path.endsWith('.yml')) {
            configs.push({
              name: inputMatch[1],
              type: 'input',
              description: '',
              required: false,
              examples: [],
            });
          }
        });
      } catch (error) {
        core.debug(`Failed to parse config ${file.path}: ${error}`);
      }
    });

    return configs;
  }

  private extractComponents(): Component[] {
    const components: Component[] = [];
    const sourceFiles = this.codebaseMap.files.filter(f =>
      f.path.match(/\.(ts|js|py|java|go|rs|cpp|c|cs|rb|php)$/) && 
      !f.path.includes('test') &&
      !f.path.includes('spec') &&
      !f.path.includes('.min.')
    );

    sourceFiles.forEach(file => {
      try {
        const content = file.content;
        
        // Match class declarations (multiple languages)
        const classPatterns = [
          /(?:export\s+)?class\s+(\w+)/g,  // JS/TS
          /class\s+(\w+)(?:\s*<[^>]*>)?\s*[:{]/g,  // Java/C#/Generic
          /class\s+(\w+)\s*\(/g,  // Python
        ];
        
        for (const pattern of classPatterns) {
          const matches = content.matchAll(pattern);
          for (const match of matches) {
            if (match[1] && !components.find(c => c.name === match[1])) {
              const description = this.extractDescriptionFromPosition(content, match.index || 0);
              components.push({
                name: match[1],
                type: 'class',
                description,
                location: file.relativePath,
                publicAPI: [],
              });
            }
          }
        }

        // Match exported functions
        const funcPatterns = [
          /(?:export\s+)?(?:async\s+)?function\s+(\w+)/g,  // JS/TS
          /def\s+(\w+)\s*\(/g,  // Python
          /func\s+(\w+)\s*\(/g,  // Go
        ];
        
        for (const pattern of funcPatterns) {
          const matches = content.matchAll(pattern);
          for (const match of matches) {
            if (match[1] && !components.find(c => c.name === match[1])) {
              const description = this.extractDescriptionFromPosition(content, match.index || 0);
              components.push({
                name: match[1],
                type: 'function',
                description,
                location: file.relativePath,
                publicAPI: [],
              });
            }
          }
        }

        // Match interfaces/types (TypeScript)
        const interfaceMatches = content.matchAll(/(?:export\s+)?interface\s+(\w+)/g);
        for (const match of interfaceMatches) {
          if (!components.find(c => c.name === match[1])) {
            const description = this.extractDescriptionFromPosition(content, match.index || 0);
            components.push({
              name: match[1],
              type: 'module',
              description,
              location: file.relativePath,
              publicAPI: [],
            });
          }
        }
      } catch (error) {
        core.debug(`Failed to parse ${file.path}: ${error}`);
      }
    });

    return components;
  }

  private extractDescriptionFromPosition(content: string, position: number): string {
    // Look backwards for JSDoc or comments
    const before = content.slice(Math.max(0, position - 500), position);
    const lines = before.split('\n').reverse();
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('*') && !trimmed.startsWith('*/')) {
        return trimmed.replace(/^\*\s*/, '').trim();
      }
      if (trimmed.startsWith('//')) {
        return trimmed.replace(/^\/\/\s*/, '').trim();
      }
      if (trimmed.startsWith('#')) {
        return trimmed.replace(/^#\s*/, '').trim();
      }
    }
    
    return '';
  }

  private extractDependencies(): DependencyInfo[] {
    const deps: DependencyInfo[] = [];
    
    if (this.codebaseMap.dependencies.packageJson) {
      const pkg = this.codebaseMap.dependencies.packageJson;
      const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
      Object.entries(allDeps || {}).forEach(([name, version]) => {
        deps.push({
          name,
          version: version as string,
          purpose: this.guessPurpose(name),
          type: 'production',
        });
      });
    }

    return deps;
  }

  private extractExamples(): CodeExample[] {
    const examples: CodeExample[] = [];
    const exampleFiles = this.codebaseMap.files.filter(f =>
      f.path.includes('example') ||
      f.path.includes('demo') ||
      f.path.includes('sample')
    );

    exampleFiles.slice(0, 5).forEach(file => {
      try {
        const content = readFileSync(file.path, 'utf-8');
        const fileName = file.path.split('/').pop() || 'example';
        examples.push({
          title: fileName,
          description: `Example from ${file.path}`,
          code: content.slice(0, 500),
          language: file.language,
        });
      } catch (error) {
        core.debug(`Failed to read example ${file.path}: ${error}`);
      }
    });

    return examples;
  }



  private guessPurpose(packageName: string): string {
    const purposes: Record<string, string> = {
      'express': 'Web framework',
      'react': 'UI library',
      'vue': 'UI framework',
      'axios': 'HTTP client',
      'typescript': 'Type safety',
      'jest': 'Testing framework',
      'eslint': 'Code linting',
      'prettier': 'Code formatting',
      'webpack': 'Module bundler',
      'rollup': 'Module bundler',
    };

    return purposes[packageName] || 'Dependency';
  }
}
