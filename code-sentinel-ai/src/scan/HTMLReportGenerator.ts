/**
 * HTML Report Generator
 * 
 * Generates beautiful, interactive HTML reports with:
 * - Syntax highlighting
 * - File tree navigation
 * - Filtering by severity/category
 * - Direct links to GitHub files
 * - Downloadable JSON data
 */

import { writeFileSync } from 'fs';
import * as core from '@actions/core';
import { ScanResult, Finding, HTMLReportOptions } from './types';

export class HTMLReportGenerator {
  private scanResult: ScanResult;
  private options: HTMLReportOptions;
  private repositoryUrl?: string;
  private commitSha?: string;

  constructor(
    scanResult: ScanResult,
    options: Partial<HTMLReportOptions> = {},
    repositoryUrl?: string,
    commitSha?: string
  ) {
    this.scanResult = scanResult;
    this.options = {
      title: options.title || `${scanResult.scanType.toUpperCase()} Scan Report`,
      includeSourceCode: options.includeSourceCode ?? true,
      syntaxHighlighting: options.syntaxHighlighting ?? true,
      interactiveFilters: options.interactiveFilters ?? true,
      generatePDF: options.generatePDF ?? false,
    };
    this.repositoryUrl = repositoryUrl;
    this.commitSha = commitSha;
  }

  /**
   * Generate complete HTML report
   */
  generate(): string {
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${this.escapeHtml(this.options.title)}</title>
    ${this.generateStyles()}
</head>
<body>
    <div class="container">
        ${this.generateHeader()}
        ${this.generateExecutiveSummary()}
        ${this.generateStatistics()}
        ${this.generateFilters()}
        ${this.generateFindings()}
        ${this.generatePhaseDetails()}
        ${this.generateCodebaseMap()}
        ${this.generateFooter()}
    </div>
    ${this.generateScripts()}
    ${this.generateDataEmbeds()}
</body>
</html>
    `.trim();

    return html;
  }

  /**
   * Save report to file
   */
  save(outputPath: string): void {
    const html = this.generate();
    writeFileSync(outputPath, html, 'utf-8');
    core.info(`✓ HTML report saved to ${outputPath}`);
  }

  /**
   * Generate CSS styles
   */
  private generateStyles(): string {
    return `
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica', 'Arial', sans-serif;
            line-height: 1.6;
            color: #24292f;
            background: #f6f8fa;
        }

        .container {
            max-width: 1400px;
            margin: 0 auto;
            padding: 20px;
        }

        /* Header */
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 40px;
            border-radius: 12px;
            margin-bottom: 30px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
        }

        .header h1 {
            font-size: 2.5em;
            margin-bottom: 10px;
        }

        .header .subtitle {
            opacity: 0.9;
            font-size: 1.1em;
        }

        /* Stats Cards */
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }

        .stat-card {
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            border-left: 4px solid #667eea;
        }

        .stat-value {
            font-size: 2em;
            font-weight: bold;
            color: #667eea;
        }

        .stat-label {
            color: #666;
            font-size: 0.9em;
            margin-top: 5px;
        }

        /* Executive Summary */
        .executive-summary {
            background: white;
            padding: 30px;
            border-radius: 8px;
            margin-bottom: 30px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }

        .executive-summary h2 {
            color: #667eea;
            margin-bottom: 15px;
        }

        /* Filters */
        .filters {
            background: white;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 20px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }

        .filter-group {
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
        }

        .filter-btn {
            padding: 8px 16px;
            border: 2px solid #ddd;
            background: white;
            border-radius: 20px;
            cursor: pointer;
            transition: all 0.3s;
        }

        .filter-btn:hover {
            border-color: #667eea;
            color: #667eea;
        }

        .filter-btn.active {
            background: #667eea;
            color: white;
            border-color: #667eea;
        }

        /* Findings */
        .findings-section {
            margin-bottom: 30px;
        }

        .finding-card {
            background: white;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 15px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            border-left: 4px solid #ddd;
            transition: transform 0.2s;
        }

        .finding-card:hover {
            transform: translateX(5px);
        }

        .finding-card.critical {
            border-left-color: #d73a49;
        }

        .finding-card.high {
            border-left-color: #ff6b6b;
        }

        .finding-card.medium {
            border-left-color: #f39c12;
        }

        .finding-card.low {
            border-left-color: #3498db;
        }

        .finding-card.info {
            border-left-color: #95a5a6;
        }

        .finding-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
        }

        .finding-title {
            font-size: 1.2em;
            font-weight: bold;
            color: #24292f;
        }

        .severity-badge {
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 0.85em;
            font-weight: bold;
            text-transform: uppercase;
        }

        .severity-badge.critical {
            background: #d73a49;
            color: white;
        }

        .severity-badge.high {
            background: #ff6b6b;
            color: white;
        }

        .severity-badge.medium {
            background: #f39c12;
            color: white;
        }

        .severity-badge.low {
            background: #3498db;
            color: white;
        }

        .severity-badge.info {
            background: #95a5a6;
            color: white;
        }

        .finding-meta {
            display: flex;
            gap: 15px;
            margin: 10px 0;
            font-size: 0.9em;
            color: #666;
        }

        .finding-description {
            margin: 15px 0;
            line-height: 1.8;
        }

        .code-block {
            background: #f6f8fa;
            padding: 15px;
            border-radius: 6px;
            overflow-x: auto;
            margin: 15px 0;
            border: 1px solid #d0d7de;
        }

        .code-block pre {
            font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
            font-size: 0.9em;
        }

        .recommendation {
            background: #e6f7ff;
            padding: 15px;
            border-radius: 6px;
            border-left: 3px solid #1890ff;
            margin-top: 15px;
        }

        .recommendation strong {
            color: #1890ff;
        }

        /* File Link */
        .file-link {
            color: #0366d6;
            text-decoration: none;
            font-weight: 500;
        }

        .file-link:hover {
            text-decoration: underline;
        }

        /* Tabs */
        .tabs {
            display: flex;
            gap: 10px;
            margin-bottom: 20px;
            border-bottom: 2px solid #ddd;
        }

        .tab {
            padding: 12px 24px;
            background: transparent;
            border: none;
            cursor: pointer;
            font-size: 1em;
            color: #666;
            border-bottom: 3px solid transparent;
            transition: all 0.3s;
        }

        .tab:hover {
            color: #667eea;
        }

        .tab.active {
            color: #667eea;
            border-bottom-color: #667eea;
        }

        .tab-content {
            background: white;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }

        .tab-pane {
            display: none;
        }

        .tab-pane.active {
            display: block;
        }

        /* Tree View */
        .tree {
            font-family: monospace;
        }

        .tree-item {
            padding: 4px;
            cursor: pointer;
        }

        .tree-item:hover {
            background: #f6f8fa;
        }

        .tree-folder {
            font-weight: bold;
            color: #0366d6;
        }

        .tree-file {
            color: #24292f;
        }

        /* Footer */
        .footer {
            text-align: center;
            padding: 30px;
            color: #666;
            border-top: 1px solid #ddd;
            margin-top: 50px;
        }

        /* Utilities */
        .hidden {
            display: none !important;
        }

        .mb-20 {
            margin-bottom: 20px;
        }

        .download-btn {
            background: #667eea;
            color: white;
            padding: 10px 20px;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 1em;
            margin-right: 10px;
        }

        .download-btn:hover {
            background: #5568d3;
        }
    </style>
    `;
  }

  /**
   * Generate header section
   */
  private generateHeader(): string {
    const { scanType, timestamp, duration, codebaseMap } = this.scanResult;
    const durationMin = (duration / 1000 / 60).toFixed(1);

    return `
    <div class="header">
        <h1>🔍 ${this.escapeHtml(this.options.title)}</h1>
        <div class="subtitle">
            <strong>Project:</strong> ${this.escapeHtml(codebaseMap.projectName)} | 
            <strong>Scan Type:</strong> ${this.escapeHtml(scanType)} | 
            <strong>Date:</strong> ${new Date(timestamp).toLocaleString()} | 
            <strong>Duration:</strong> ${durationMin} minutes
        </div>
        <div class="subtitle" style="margin-top: 10px;">
            <button class="download-btn" onclick="downloadJSON()">📥 Download JSON Report</button>
            <button class="download-btn" onclick="downloadCSV()">📊 Download CSV</button>
            ${this.repositoryUrl ? `<button class="download-btn" onclick="window.open('${this.repositoryUrl}', '_blank')">🔗 View Repository</button>` : ''}
        </div>
    </div>
    `;
  }

  /**
   * Generate executive summary
   */
  private generateExecutiveSummary(): string {
    return `
    <div class="executive-summary">
        <h2>📋 Executive Summary</h2>
        <p>${this.escapeHtml(this.scanResult.executiveSummary)}</p>
        
        <h3 style="margin-top: 20px;">Immediate Actions</h3>
        <ul>
            ${this.scanResult.recommendations.immediate.map(r => `<li>${this.escapeHtml(r)}</li>`).join('')}
        </ul>
        
        <h3 style="margin-top: 20px;">Short-term Improvements</h3>
        <ul>
            ${this.scanResult.recommendations.shortTerm.map(r => `<li>${this.escapeHtml(r)}</li>`).join('')}
        </ul>
    </div>
    `;
  }

  /**
   * Generate statistics cards
   */
  private generateStatistics(): string {
    const { statistics } = this.scanResult;

    return `
    <div class="stats-grid">
        <div class="stat-card">
            <div class="stat-value">${statistics.totalFiles}</div>
            <div class="stat-label">Files Analyzed</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">${statistics.totalCalls}</div>
            <div class="stat-label">LLM Calls</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">${statistics.totalTokens.toLocaleString()}</div>
            <div class="stat-label">Tokens Used</div>
        </div>
        <div class="stat-card">
            <div class="stat-value" style="color: #d73a49;">${statistics.criticalIssues}</div>
            <div class="stat-label">Critical Issues</div>
        </div>
        <div class="stat-card">
            <div class="stat-value" style="color: #ff6b6b;">${statistics.highIssues}</div>
            <div class="stat-label">High Issues</div>
        </div>
        <div class="stat-card">
            <div class="stat-value" style="color: #f39c12;">${statistics.mediumIssues}</div>
            <div class="stat-label">Medium Issues</div>
        </div>
    </div>
    `;
  }

  /**
   * Generate filters section
   */
  private generateFilters(): string {
    if (!this.options.interactiveFilters) return '';

    return `
    <div class="filters">
        <div style="margin-bottom: 15px;"><strong>Filter by Severity:</strong></div>
        <div class="filter-group">
            <button class="filter-btn active" data-severity="all" onclick="filterBySeverity('all')">All</button>
            <button class="filter-btn" data-severity="critical" onclick="filterBySeverity('critical')">Critical</button>
            <button class="filter-btn" data-severity="high" onclick="filterBySeverity('high')">High</button>
            <button class="filter-btn" data-severity="medium" onclick="filterBySeverity('medium')">Medium</button>
            <button class="filter-btn" data-severity="low" onclick="filterBySeverity('low')">Low</button>
            <button class="filter-btn" data-severity="info" onclick="filterBySeverity('info')">Info</button>
        </div>
    </div>
    `;
  }

  /**
   * Generate findings section
   */
  private generateFindings(): string {
    const findings = this.scanResult.overallFindings;

    return `
    <div class="findings-section">
        <h2 class="mb-20">🔎 All Findings (${findings.length})</h2>
        ${findings.map(f => this.generateFindingCard(f)).join('')}
    </div>
    `;
  }

  /**
   * Generate a single finding card
   */
  private generateFindingCard(finding: Finding): string {
    const githubLink = this.getGitHubLink(finding.file, finding.line);

    return `
    <div class="finding-card ${finding.severity}" data-severity="${finding.severity}">
        <div class="finding-header">
            <div class="finding-title">${this.escapeHtml(finding.title)}</div>
            <span class="severity-badge ${finding.severity}">${finding.severity}</span>
        </div>
        
        <div class="finding-meta">
            <span>📁 ${githubLink ? `<a href="${githubLink}" class="file-link" target="_blank">${this.escapeHtml(finding.file)}</a>` : this.escapeHtml(finding.file)}</span>
            ${finding.line ? `<span>📍 Line ${finding.line}</span>` : ''}
            <span>🏷️ ${this.escapeHtml(finding.category)}</span>
        </div>
        
        <div class="finding-description">
            ${this.escapeHtml(finding.description)}
        </div>
        
        ${finding.code ? `
        <div class="code-block">
            <pre><code>${this.escapeHtml(finding.code)}</code></pre>
        </div>
        ` : ''}
        
        <div class="recommendation">
            <strong>💡 Recommendation:</strong> ${this.escapeHtml(finding.recommendation)}
        </div>
    </div>
    `;
  }

  /**
   * Generate phase details section
   */
  private generatePhaseDetails(): string {
    return `
    <div class="tab-content mb-20">
        <div class="tabs">
            ${this.scanResult.phases.map((p, i) => `
                <button class="tab ${i === 0 ? 'active' : ''}" onclick="switchTab(${i})">${this.escapeHtml(p.name)}</button>
            `).join('')}
        </div>
        
        ${this.scanResult.phases.map((p, i) => `
            <div class="tab-pane ${i === 0 ? 'active' : ''}" id="phase-${i}">
                <h3>${this.escapeHtml(p.name)}</h3>
                <p>${this.escapeHtml(p.summary)}</p>
                
                <h4 style="margin-top: 20px;">Module Analyses:</h4>
                ${p.moduleAnalyses.map(m => `
                    <div style="margin: 15px 0; padding: 15px; background: #f6f8fa; border-radius: 6px;">
                        <strong>${this.escapeHtml(m.moduleName)}</strong> - ${m.filesAnalyzed} files, ${m.findings.length} findings
                        <p style="margin-top: 10px;">${this.escapeHtml(m.summary)}</p>
                    </div>
                `).join('')}
            </div>
        `).join('')}
    </div>
    `;
  }

  /**
   * Generate codebase map section
   */
  private generateCodebaseMap(): string {
    return `
    <div class="tab-content">
        <h2 class="mb-20">📂 Codebase Structure</h2>
        <div class="tree">
            ${this.generateTreeNode(this.scanResult.codebaseMap.structure)}
        </div>
    </div>
    `;
  }

  /**
   * Generate tree node recursively
   */
  private generateTreeNode(node: any, depth: number = 0): string {
    const indent = '  '.repeat(depth);
    
    if (node.type === 'file') {
      const githubLink = this.getGitHubLink(node.metadata.relativePath);
      return `${indent}<div class="tree-item tree-file">📄 ${githubLink ? `<a href="${githubLink}" target="_blank">${this.escapeHtml(node.name)}</a>` : this.escapeHtml(node.name)}</div>`;
    }
    
    const children = node.children?.map((c: any) => this.generateTreeNode(c, depth + 1)).join('') || '';
    return `${indent}<div class="tree-item tree-folder">📁 ${this.escapeHtml(node.name)}</div>${children}`;
  }

  /**
   * Generate JavaScript
   */
  private generateScripts(): string {
    return `
    <script>
        // Filter by severity
        function filterBySeverity(severity) {
            const cards = document.querySelectorAll('.finding-card');
            const buttons = document.querySelectorAll('.filter-btn');
            
            buttons.forEach(btn => btn.classList.remove('active'));
            document.querySelector('[data-severity="' + severity + '"]').classList.add('active');
            
            cards.forEach(card => {
                if (severity === 'all' || card.dataset.severity === severity) {
                    card.style.display = 'block';
                } else {
                    card.style.display = 'none';
                }
            });
        }

        // Switch tabs
        function switchTab(index) {
            const tabs = document.querySelectorAll('.tab');
            const panes = document.querySelectorAll('.tab-pane');
            
            tabs.forEach(tab => tab.classList.remove('active'));
            panes.forEach(pane => pane.classList.remove('active'));
            
            tabs[index].classList.add('active');
            panes[index].classList.add('active');
        }

        // Download JSON
        function downloadJSON() {
            const data = JSON.parse(document.getElementById('scan-data').textContent);
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'scan-report.json';
            a.click();
        }

        // Download CSV
        function downloadCSV() {
            const data = JSON.parse(document.getElementById('scan-data').textContent);
            const findings = data.overallFindings;
            
            let csv = 'Severity,Category,Title,File,Line,Description,Recommendation\\n';
            findings.forEach(f => {
                csv += \`"\${f.severity}","\${f.category}","\${f.title}","\${f.file}","\${f.line || ''}","\${f.description.replace(/"/g, '""')}","\${f.recommendation.replace(/"/g, '""')}"\\n\`;
            });
            
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'scan-findings.csv';
            a.click();
        }
    </script>
    `;
  }

  /**
   * Embed scan data as JSON
   */
  private generateDataEmbeds(): string {
    return `
    <script type="application/json" id="scan-data">
    ${JSON.stringify(this.scanResult, null, 2)}
    </script>
    `;
  }

  /**
   * Generate footer
   */
  private generateFooter(): string {
    return `
    <div class="footer">
        <p>Generated by Code Sentinel AI Full Scan</p>
        <p>Scan ID: ${this.scanResult.scanId}</p>
    </div>
    `;
  }

  /**
   * Get GitHub file link
   */
  private getGitHubLink(file: string, line?: number): string | null {
    if (!this.repositoryUrl || !this.commitSha) return null;
    
    const baseUrl = this.repositoryUrl.replace(/\.git$/, '');
    return `${baseUrl}/blob/${this.commitSha}/${file}${line ? `#L${line}` : ''}`;
  }

  /**
   * Escape HTML
   */
  private escapeHtml(text: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    };
    return text.replace(/[&<>"']/g, m => map[m]);
  }
}
