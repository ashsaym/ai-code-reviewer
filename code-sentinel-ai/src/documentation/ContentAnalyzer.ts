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
              endpoints.push({
                path: match[1],
                method: getMatch ? 'GET' : postMatch ? 'POST' : putMatch ? 'PUT' : 'DELETE',
                description: this.extractDescription(lines, idx),
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
      f.path.match(/\.(ts|js)$/) && 
      !f.path.includes('test') &&
      !f.path.includes('spec')
    );

    sourceFiles.slice(0, 50).forEach(file => {
      try {
        const content = readFileSync(file.path, 'utf-8');
        
        // Match class declarations
        const classMatches = content.matchAll(/export\s+class\s+(\w+)/g);
        for (const match of classMatches) {
          components.push({
            name: match[1],
            type: 'class',
            description: '',
            location: file.path,
            publicAPI: [],
          });
        }

        // Match exported functions
        const funcMatches = content.matchAll(/export\s+(?:async\s+)?function\s+(\w+)/g);
        for (const match of funcMatches) {
          components.push({
            name: match[1],
            type: 'function',
            description: '',
            location: file.path,
            publicAPI: [],
          });
        }
      } catch (error) {
        core.debug(`Failed to parse ${file.path}: ${error}`);
      }
    });

    return components.slice(0, 30); // Limit to top 30 components
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

  private extractDescription(lines: string[], startIdx: number): string {
    // Look for comments above the line
    for (let i = startIdx - 1; i >= Math.max(0, startIdx - 5); i--) {
      const line = lines[i].trim();
      if (line.startsWith('//') || line.startsWith('*')) {
        return line.replace(/^[/\s*]+/, '').trim();
      }
    }
    return '';
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
