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
  },
};
