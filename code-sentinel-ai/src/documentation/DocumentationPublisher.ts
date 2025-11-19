/**
 * Documentation Report Publisher
 * 
 * Publishes generated documentation in various formats
 */

import * as core from '@actions/core';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { DocumentationResult } from './types';

export interface PublishOptions {
  outputDir?: string;
  formats: ('markdown' | 'html')[];
  createGitHubPages?: boolean;
  createArtifact?: boolean;
}

export class DocumentationPublisher {
  constructor(
    private result: DocumentationResult,
    private options: PublishOptions
  ) {}

  async publish(): Promise<void> {
    core.startGroup('📤 Publishing Documentation');

    const outputDir = this.options.outputDir || './docs-output';
    
    try {
      // Create output directory
      mkdirSync(outputDir, { recursive: true });

      // Publish markdown
      if (this.options.formats.includes('markdown')) {
        await this.publishMarkdown(outputDir);
      }

      // Publish HTML
      if (this.options.formats.includes('html')) {
        await this.publishHTML(outputDir);
      }

      // Set GitHub Actions outputs
      core.setOutput('documentation-path', join(outputDir, 'README.md'));
      core.setOutput('html-path', join(outputDir, 'index.html'));
      core.setOutput('sections-count', this.result.sections.length);
      core.setOutput('words-count', this.result.statistics.totalWords);

      core.info('✅ Documentation published successfully');
      core.info(`  Output directory: ${outputDir}`);
      core.info(`  Sections: ${this.result.sections.length}`);
      core.info(`  Words: ${this.result.statistics.totalWords.toLocaleString()}`);
      
      core.endGroup();
    } catch (error) {
      core.endGroup();
      throw error;
    }
  }

  private async publishMarkdown(outputDir: string): Promise<void> {
    core.info('📝 Publishing Markdown documentation...');

    const mainPath = join(outputDir, 'README.md');
    writeFileSync(mainPath, this.result.fullMarkdown, 'utf-8');

    // Also save individual sections
    const sectionsDir = join(outputDir, 'sections');
    mkdirSync(sectionsDir, { recursive: true });

    this.result.sections.forEach(section => {
      const fileName = `${section.order}-${section.id}.md`;
      const filePath = join(sectionsDir, fileName);
      const content = `# ${section.title}\n\n${section.content}`;
      writeFileSync(filePath, content, 'utf-8');
    });

    core.info(`  ✓ Markdown saved to ${mainPath}`);
  }

  private async publishHTML(outputDir: string): Promise<void> {
    core.info('🌐 Publishing HTML documentation...');

    const html = this.generateHTML();
    const htmlPath = join(outputDir, 'index.html');
    writeFileSync(htmlPath, html, 'utf-8');

    core.info(`  ✓ HTML saved to ${htmlPath}`);
  }

  private generateHTML(): string {
    const tocItems = this.result.sections
      .map(s => `<li><a href="#${s.id}">${s.title}</a></li>`)
      .join('\n');

    const sectionsHTML = this.result.sections
      .map(s => `
        <section id="${s.id}" class="doc-section">
          <h2>${s.title}</h2>
          <div class="content">${this.markdownToHTML(s.content)}</div>
        </section>
      `)
      .join('\n');

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${this.result.projectName} Documentation</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      line-height: 1.6;
      color: #333;
      background: #f5f5f5;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
      display: grid;
      grid-template-columns: 250px 1fr;
      gap: 2rem;
      padding: 2rem;
    }
    .sidebar {
      background: white;
      padding: 2rem;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      position: sticky;
      top: 2rem;
      height: fit-content;
    }
    .sidebar h3 {
      margin-bottom: 1rem;
      color: #2563eb;
    }
    .sidebar ul {
      list-style: none;
    }
    .sidebar li {
      margin-bottom: 0.5rem;
    }
    .sidebar a {
      text-decoration: none;
      color: #666;
      transition: color 0.2s;
    }
    .sidebar a:hover {
      color: #2563eb;
    }
    .main-content {
      background: white;
      padding: 3rem;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .header {
      grid-column: 1 / -1;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 3rem;
      border-radius: 8px;
      margin-bottom: 2rem;
    }
    .header h1 {
      font-size: 2.5rem;
      margin-bottom: 0.5rem;
    }
    .header .meta {
      opacity: 0.9;
      font-size: 0.9rem;
    }
    .doc-section {
      margin-bottom: 3rem;
    }
    .doc-section h2 {
      color: #2563eb;
      margin-bottom: 1rem;
      padding-bottom: 0.5rem;
      border-bottom: 2px solid #e5e7eb;
    }
    .content pre {
      background: #f9fafb;
      padding: 1rem;
      border-radius: 4px;
      overflow-x: auto;
      margin: 1rem 0;
    }
    .content code {
      background: #f9fafb;
      padding: 0.2rem 0.4rem;
      border-radius: 3px;
      font-family: 'Courier New', monospace;
      font-size: 0.9em;
    }
    .content pre code {
      background: none;
      padding: 0;
    }
    .footer {
      grid-column: 1 / -1;
      text-align: center;
      padding: 2rem;
      color: #666;
      font-size: 0.9rem;
    }
    @media (max-width: 768px) {
      .container {
        grid-template-columns: 1fr;
      }
      .sidebar {
        position: static;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${this.result.projectName}</h1>
      <div class="meta">
        Documentation generated on ${new Date(this.result.generatedAt).toLocaleDateString()}
        | ${this.result.sections.length} sections
        | ${this.result.statistics.totalWords.toLocaleString()} words
      </div>
    </div>
    
    <aside class="sidebar">
      <h3>📚 Contents</h3>
      <ul>
        ${tocItems}
      </ul>
    </aside>
    
    <main class="main-content">
      ${sectionsHTML}
    </main>
    
    <footer class="footer">
      <p>Documentation generated by <strong>Code Sentinel AI</strong></p>
      <p>Analyzed ${this.result.statistics.filesAnalyzed} files</p>
    </footer>
  </div>
  
  <script>
    // Smooth scrolling for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    });
  </script>
</body>
</html>`;
  }

  private markdownToHTML(markdown: string): string {
    // Simple markdown to HTML conversion
    let html = markdown;

    // Code blocks
    html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>');
    
    // Headers
    html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');
    
    // Bold
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    
    // Italic
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
    
    // Inline code
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
    
    // Links
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
    
    // Paragraphs
    html = html.replace(/\n\n/g, '</p><p>');
    html = '<p>' + html + '</p>';

    return html;
  }
}
