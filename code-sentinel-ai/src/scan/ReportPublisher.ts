/**
 * Report Publisher
 * 
 * Publishes scan reports to multiple outputs:
 * - GitHub Artifacts
 * - GitHub Issues (for critical findings)
 * - Check Runs
 */

import * as core from '@actions/core';
import { writeFileSync } from 'fs';
import { ScanResult } from './types';
import { HTMLReportGenerator } from './HTMLReportGenerator';

export interface PublishOptions {
  publishArtifact: boolean;
  publishCheckRun: boolean;
  createIssue: boolean;
  issueThreshold: 'critical' | 'high' | 'medium' | 'low';
  repositoryUrl?: string;
  commitSha?: string;
}

export class ReportPublisher {
  private scanResult: ScanResult;
  private options: PublishOptions;

  constructor(scanResult: ScanResult, options: Partial<PublishOptions> = {}) {
    this.scanResult = scanResult;
    this.options = {
      publishArtifact: options.publishArtifact ?? true,
      publishCheckRun: options.publishCheckRun ?? true,
      createIssue: options.createIssue ?? false,
      issueThreshold: options.issueThreshold || 'high',
      repositoryUrl: options.repositoryUrl,
      commitSha: options.commitSha,
    };
  }

  /**
   * Publish report to all configured outputs
   */
  async publish(): Promise<void> {
    const outputs: string[] = [];

    core.startGroup('📤 Publishing Report');

    // 1. Generate HTML report
    const htmlGenerator = new HTMLReportGenerator(
      this.scanResult,
      {
        title: `${this.scanResult.scanType.toUpperCase()} Scan Report`,
        includeSourceCode: true,
        syntaxHighlighting: true,
        interactiveFilters: true,
      },
      this.options.repositoryUrl,
      this.options.commitSha
    );

    // Save HTML
    const htmlPath = `/tmp/scan-report-${this.scanResult.scanId}.html`;
    htmlGenerator.save(htmlPath);
    outputs.push('html');

    // Save JSON
    const jsonPath = `/tmp/scan-report-${this.scanResult.scanId}.json`;
    writeFileSync(jsonPath, JSON.stringify(this.scanResult, null, 2), 'utf-8');
    outputs.push('json');

    // Save Markdown summary
    const mdPath = `/tmp/scan-report-${this.scanResult.scanId}.md`;
    this.saveMarkdownReport(mdPath);
    outputs.push('markdown');

    // 2. Set outputs for GitHub Actions artifact upload
    core.setOutput('html-report-path', htmlPath);
    core.setOutput('json-report-path', jsonPath);
    core.setOutput('md-report-path', mdPath);
    core.setOutput('scan-id', this.scanResult.scanId);

    // 3. Create summary for GitHub Actions
    await this.createGitHubSummary();

    core.info(`✓ Reports generated: ${outputs.join(', ')}`);
    core.info(`  HTML: ${htmlPath}`);
    core.info(`  JSON: ${jsonPath}`);
    core.info(`  Markdown: ${mdPath}`);
    
    core.endGroup();

    // 4. Check if issue should be created
    if (this.options.createIssue && this.shouldCreateIssue()) {
      core.info('ℹ️  Critical findings detected. Set create-issue output for workflow to create GitHub issue.');
      core.setOutput('create-issue', 'true');
      core.setOutput('issue-title', this.getIssueTitle());
      core.setOutput('issue-body', this.getIssueBody());
    }
  }

  /**
   * Save markdown report
   */
  private saveMarkdownReport(outputPath: string): void {
    const { scanType, timestamp, duration, statistics, overallFindings, executiveSummary, recommendations } = this.scanResult;
    
    const md = `# ${scanType.toUpperCase()} Scan Report

**Date**: ${new Date(timestamp).toLocaleString()}  
**Duration**: ${(duration / 1000 / 60).toFixed(1)} minutes  
**Scan ID**: ${this.scanResult.scanId}

## 📊 Statistics

- **Files Analyzed**: ${statistics.totalFiles}
- **LLM Calls**: ${statistics.totalCalls}
- **Tokens Used**: ${statistics.totalTokens.toLocaleString()}
- **Critical Issues**: ${statistics.criticalIssues}
- **High Issues**: ${statistics.highIssues}
- **Medium Issues**: ${statistics.mediumIssues}
- **Low Issues**: ${statistics.lowIssues}

## 📋 Executive Summary

${executiveSummary}

## 🎯 Recommendations

### Immediate Actions
${recommendations.immediate.map(r => `- ${r}`).join('\n')}

### Short-term Improvements
${recommendations.shortTerm.map(r => `- ${r}`).join('\n')}

### Long-term Strategy
${recommendations.longTerm.map(r => `- ${r}`).join('\n')}

## 🔎 Critical and High Severity Findings

${overallFindings
  .filter(f => f.severity === 'critical' || f.severity === 'high')
  .map(f => `
### ${f.severity === 'critical' ? '🔴' : '🟠'} ${f.title}

**Severity**: ${f.severity.toUpperCase()}  
**Category**: ${f.category}  
**File**: \`${f.file}\`${f.line ? ` (Line ${f.line})` : ''}

${f.description}

**💡 Recommendation**: ${f.recommendation}

---
`).join('\n')}

## 📈 All Findings by Severity

### Critical (${statistics.criticalIssues})
${this.listFindings(overallFindings.filter(f => f.severity === 'critical'))}

### High (${statistics.highIssues})
${this.listFindings(overallFindings.filter(f => f.severity === 'high'))}

### Medium (${statistics.mediumIssues})
${this.listFindings(overallFindings.filter(f => f.severity === 'medium'))}

### Low (${statistics.lowIssues})
${this.listFindings(overallFindings.filter(f => f.severity === 'low'))}

---

*Report generated by Code Sentinel AI Full Scan*
`;

    writeFileSync(outputPath, md, 'utf-8');
  }

  /**
   * List findings for markdown
   */
  private listFindings(findings: any[]): string {
    if (findings.length === 0) return '*No findings*';
    
    return findings.map(f => `- **${f.title}** - \`${f.file}\``).join('\n');
  }

  /**
   * Create GitHub Actions summary
   */
  private async createGitHubSummary(): Promise<void> {
    const { statistics, scanType } = this.scanResult;

    await core.summary
      .addHeading(`🔍 ${scanType.toUpperCase()} Scan Complete`)
      .addTable([
        [
          { data: 'Metric', header: true },
          { data: 'Value', header: true },
        ],
        ['Files Analyzed', statistics.totalFiles.toString()],
        ['LLM Calls', statistics.totalCalls.toString()],
        ['Tokens Used', statistics.totalTokens.toLocaleString()],
        ['Critical Issues', `🔴 ${statistics.criticalIssues}`],
        ['High Issues', `🟠 ${statistics.highIssues}`],
        ['Medium Issues', `🟡 ${statistics.mediumIssues}`],
        ['Low Issues', `🔵 ${statistics.lowIssues}`],
      ])
      .addHeading('📥 Download Reports', 3)
      .addRaw('Reports have been uploaded as workflow artifacts. Download them from the Actions summary page.')
      .write();
  }

  /**
   * Check if issue should be created
   */
  private shouldCreateIssue(): boolean {
    const thresholds = {
      critical: ['critical'],
      high: ['critical', 'high'],
      medium: ['critical', 'high', 'medium'],
      low: ['critical', 'high', 'medium', 'low'],
    };

    const relevantSeverities = thresholds[this.options.issueThreshold];
    const findings = this.scanResult.overallFindings.filter(f => 
      relevantSeverities.includes(f.severity)
    );

    return findings.length > 0;
  }

  /**
   * Get issue title
   */
  private getIssueTitle(): string {
    const { scanType, statistics } = this.scanResult;
    return `🔒 ${scanType.toUpperCase()} Scan: ${statistics.criticalIssues + statistics.highIssues} Critical/High Issues Found`;
  }

  /**
   * Get issue body
   */
  private getIssueBody(): string {
    const { scanType, timestamp, statistics, overallFindings, executiveSummary } = this.scanResult;

    const criticalAndHigh = overallFindings.filter(f => 
      f.severity === 'critical' || f.severity === 'high'
    );

    return `# ${scanType.toUpperCase()} Scan Results

**Scan Date**: ${new Date(timestamp).toLocaleString()}  
**Scan ID**: ${this.scanResult.scanId}

## Summary

${executiveSummary}

## Statistics

- 🔴 **Critical**: ${statistics.criticalIssues}
- 🟠 **High**: ${statistics.highIssues}
- 🟡 **Medium**: ${statistics.mediumIssues}
- 🔵 **Low**: ${statistics.lowIssues}

## Critical and High Severity Issues

${criticalAndHigh.slice(0, 10).map((f, i) => `
### ${i + 1}. ${f.title}

**Severity**: ${f.severity.toUpperCase()}  
**File**: \`${f.file}\`${f.line ? ` (Line ${f.line})` : ''}  
**Category**: ${f.category}

${f.description}

**💡 Recommendation**: ${f.recommendation}

---
`).join('\n')}

${criticalAndHigh.length > 10 ? `\n_... and ${criticalAndHigh.length - 10} more issues. See full report for details._\n` : ''}

## Next Steps

1. Review the detailed HTML report in the workflow artifacts
2. Prioritize critical and high severity issues
3. Assign issues to team members
4. Track resolution progress

---

*Generated by Code Sentinel AI - Full Scan*
`;
  }
}
