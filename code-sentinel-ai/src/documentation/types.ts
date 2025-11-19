/**
 * Documentation Mode Types
 */

export interface DocumentationResult {
  projectName: string;
  generatedAt: string;
  sections: DocumentationSection[];
  fullMarkdown: string;
  statistics: DocumentationStatistics;
}

export interface DocumentationSection {
  id: string;
  title: string;
  content: string;
  subsections: DocumentationSubsection[];
  order: number;
}

export interface DocumentationSubsection {
  title: string;
  content: string;
}

export interface DocumentationStatistics {
  filesAnalyzed: number;
  sectionsGenerated: number;
  totalWords: number;
  tokensUsed: number;
  estimatedCost: number;
}

export type DocumentationScope = 
  | 'full'           // Complete documentation
  | 'api-only'       // API reference only
  | 'guide-only'     // User guides only
  | 'architecture'   // Architecture docs only
  | 'minimal';       // README + Getting Started

export interface DocumentationOptions {
  scope: DocumentationScope;
  includeExamples: boolean;
  includeDiagrams: boolean;
  includeAPI: boolean;
  outputFormat: 'markdown' | 'html' | 'both';
}
