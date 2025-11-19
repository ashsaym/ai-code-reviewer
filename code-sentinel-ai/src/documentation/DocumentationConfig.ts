/**
 * Documentation Configuration
 * 
 * Configuration and types for comprehensive documentation generation
 */

export interface DocumentationConfig {
  depth: 'minimal' | 'standard' | 'detailed' | 'comprehensive';
  moduleBatchSize: number;
  maxModules: number;
  includeFiles: boolean;
  outputFormat: 'markdown' | 'html' | 'both';
  includeDiagrams: boolean;
  includeExamples: boolean;
  includeDependencies: boolean;
}

/**
 * Depth settings control the level of detail in generated documentation.
 * These settings are reflected in the AI prompts and content generation.
 */
export const DEPTH_SETTINGS = {
  minimal: {
    projectOverview: true,
    modulesSummary: true,
    fileDetails: false,
    architectureDiagram: false,
    codeExamples: false,
    dependencyAnalysis: false,
    usageGuides: false,
    apiReference: false,
    description: 'Quick overview with basic structure',
  },
  standard: {
    projectOverview: true,
    modulesSummary: true,
    fileDetails: false,
    architectureDiagram: true,
    codeExamples: true,
    dependencyAnalysis: true,
    usageGuides: true,
    apiReference: true,
    description: 'Balanced documentation for typical projects',
  },
  detailed: {
    projectOverview: true,
    modulesSummary: true,
    fileDetails: true,
    architectureDiagram: true,
    codeExamples: true,
    dependencyAnalysis: true,
    usageGuides: true,
    apiReference: true,
    modificationGuides: true,
    troubleshooting: true,
    description: 'Deep dive with file-level documentation',
  },
  comprehensive: {
    projectOverview: true,
    modulesSummary: true,
    fileDetails: true,
    architectureDiagram: true,
    codeExamples: true,
    dependencyAnalysis: true,
    usageGuides: true,
    apiReference: true,
    modificationGuides: true,
    troubleshooting: true,
    designDecisions: true,
    performanceConsiderations: true,
    securityAnalysis: true,
    testingStrategy: true,
    deploymentGuide: true,
    description: 'Maximum detail with architectural insights, security, and operational guidance',
  },
};
