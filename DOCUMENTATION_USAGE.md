# Code Sentinel AI - Documentation Generation

This guide explains how to use Code Sentinel AI to generate comprehensive, in-depth documentation for any repository.

## Overview

Code Sentinel AI can analyze your codebase and generate comprehensive documentation using AI. It uses a hierarchical tree-based approach to document:

1. **Project Overview** - Root-level architecture, technology stack, and getting started guide
2. **Module Documentation** - Detailed documentation for each major directory/module
3. **File Documentation** - (Optional) Detailed documentation for individual files

## Quick Start

### Using with GitHub Actions

Add this workflow to `.github/workflows/documentation.yml`:

```yaml
name: Generate Documentation

on:
  workflow_dispatch:  # Manual trigger
  push:
    branches: [main]

jobs:
  generate-docs:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Generate Documentation
        uses: ashsaym/ai-code-reviewer/code-sentinel-ai@main
        with:
          mode: documentation
          api-key: ${{ secrets.OPENAI_API_KEY }}
          model: gpt-4o-mini  # or gpt-4o for higher quality
          
          # Documentation configuration
          doc-depth: comprehensive  # minimal, standard, detailed, or comprehensive
          doc-include-files: true   # Include individual file documentation
          documentation-scope: full  # full, api-only, guide-only, architecture, minimal
          documentation-output-dir: ./docs-generated
          
      - name: Upload Documentation
        uses: actions/upload-artifact@v4
        with:
          name: documentation
          path: ./docs-generated
```

### Manual Testing

You can test documentation generation locally:

```bash
# Set your API key
export OPENAI_API_KEY="your-api-key-here"

# Run the action in documentation mode
cd code-sentinel-ai
npm install
npm run build

# Use the built action
node dist/index.js
```

## Configuration Options

### Documentation Depth Levels

Choose the depth level based on your needs:

- **`minimal`** - Quick overview with basic structure
  - Project overview
  - Module summary
  - Basic architecture
  
- **`standard`** (default) - Balanced documentation for typical projects
  - Everything in minimal
  - Architecture diagrams
  - Code examples
  - Dependency analysis
  - Usage guides
  - API reference

- **`detailed`** - Deep dive with file-level documentation
  - Everything in standard
  - File-level documentation
  - Modification guides
  - Troubleshooting

- **`comprehensive`** - Maximum detail with architectural insights
  - Everything in detailed
  - Design decisions
  - Performance considerations
  - Security analysis
  - Testing strategy
  - Deployment guide

### Input Parameters

| Parameter | Description | Default |
|-----------|-------------|---------|
| `mode` | Set to `documentation` | `review` |
| `api-key` | OpenAI API key (required) | - |
| `model` | AI model to use | `gpt-4o-mini` |
| `doc-depth` | Documentation depth level | `standard` |
| `doc-module-batch-size` | Modules to process in parallel | `3` |
| `doc-max-modules` | Max modules to document (0=all) | `0` |
| `doc-include-files` | Include file documentation | `true` |
| `doc-output-format` | Output format | `markdown` |
| `doc-include-diagrams` | Include mermaid diagrams | `true` |
| `doc-include-examples` | Include code examples | `true` |
| `doc-include-dependencies` | Include dependency analysis | `true` |
| `doc-include-patterns` | File patterns to include | (all files) |
| `doc-exclude-patterns` | File patterns to exclude | (build artifacts) |
| `documentation-scope` | Documentation scope | `full` |
| `documentation-formats` | Output formats (comma-separated) | `markdown,html` |
| `documentation-output-dir` | Output directory | `./docs-generated` |

### File Patterns

By default, the documentation generator includes all files except common build artifacts:

**Default excludes:**
- `**/node_modules/**`
- `**/dist/**`
- `**/build/**`
- `**/.git/**`
- `**/coverage/**`
- `**/*.min.js`
- `**/*.map`

**Custom patterns:**

You can specify custom include/exclude patterns:

```yaml
- name: Generate Documentation
  uses: ashsaym/ai-code-reviewer/code-sentinel-ai@main
  with:
    mode: documentation
    api-key: ${{ secrets.OPENAI_API_KEY }}
    
    # Only document src and docs directories
    doc-include-patterns: 'src/**/*,docs/**/*'
    
    # Exclude test files
    doc-exclude-patterns: '**/*.test.ts,**/*.spec.ts'
```

## Output

The documentation generator creates:

### Markdown Format
- `docs-generated/README.md` - Complete documentation in a single file
- `docs-generated/sections/*.md` - Individual sections for easier navigation

### HTML Format (if enabled)
- `docs-generated/index.html` - Beautiful, styled HTML documentation with:
  - Responsive layout
  - Table of contents sidebar
  - Syntax-highlighted code blocks
  - Smooth scrolling navigation

## Features

### Comprehensive Analysis

The documentation generator performs deep analysis:

1. **Tree-based Structure Analysis**
   - Analyzes the complete directory tree
   - Identifies module relationships
   - Understands project organization

2. **Code Content Analysis**
   - Reads and analyzes actual source code
   - Extracts exports, imports, functions, classes
   - Identifies patterns and conventions

3. **Dependency Analysis**
   - Analyzes package.json, requirements.txt, go.mod, etc.
   - Identifies technology stack
   - Documents external integrations

4. **Intelligent Prompts**
   - Uses comprehensive AI prompts for in-depth analysis
   - Provides architectural insights
   - Explains design decisions
   - Includes practical examples

### AI Models

Recommended models:

- **gpt-4o-mini** - Fast and cost-effective, good for most projects
- **gpt-4o** - Higher quality, better for complex projects
- **gpt-4-turbo** - Alternative high-quality option

## Tips for Best Results

1. **Choose the Right Depth**
   - Use `comprehensive` for important projects or when onboarding new developers
   - Use `standard` for regular documentation needs
   - Use `minimal` for quick overviews

2. **Customize Patterns**
   - Focus on source directories to reduce cost
   - Exclude test files if not needed
   - Include configuration files for deployment docs

3. **Review and Edit**
   - AI-generated documentation is a starting point
   - Review and edit for accuracy
   - Add project-specific context

4. **Incremental Documentation**
   - Use `doc-max-modules: 5` to limit scope and cost
   - Document critical modules first
   - Expand coverage over time

## Cost Estimation

Documentation generation costs depend on:
- Codebase size (files and lines)
- Depth level chosen
- Model used
- Whether file documentation is included

Typical costs with gpt-4o-mini:
- Small project (~10 files): $0.01 - $0.05
- Medium project (~50 files): $0.10 - $0.30
- Large project (~200 files): $0.50 - $2.00
- Very large project (~500+ files): $2.00 - $10.00

Use `doc-max-modules` to limit scope and cost.

## Troubleshooting

### No Files Found

If you see "📊 Found 0 files to document", check:

1. **Workspace Path**
   - Ensure `GITHUB_WORKSPACE` is set correctly
   - Check the current working directory

2. **Include Patterns**
   - Default patterns match all files
   - Custom patterns must match at least one file

3. **Exclude Patterns**
   - Check if excludes are too aggressive
   - Review the warning messages for actual patterns used

The generator will show diagnostic information including:
- Current path
- Patterns being used
- Directory contents

### API Errors

- **Rate Limits**: Add delays between API calls (automatic retry with backoff)
- **Timeout**: Increase `timeout` parameter (default: 300000ms = 5 minutes)
- **Invalid API Key**: Check `OPENAI_API_KEY` secret

### Poor Quality Documentation

- Try a better model (gpt-4o instead of gpt-4o-mini)
- Increase depth level
- Ensure source code is well-organized and commented
- The AI uses actual code content - better code = better docs

## Examples

### Minimal Quick Overview

```yaml
- name: Generate Quick Overview
  uses: ashsaym/ai-code-reviewer/code-sentinel-ai@main
  with:
    mode: documentation
    api-key: ${{ secrets.OPENAI_API_KEY }}
    doc-depth: minimal
    doc-include-files: false
```

### Comprehensive API Documentation

```yaml
- name: Generate API Docs
  uses: ashsaym/ai-code-reviewer/code-sentinel-ai@main
  with:
    mode: documentation
    api-key: ${{ secrets.OPENAI_API_KEY }}
    model: gpt-4o  # Higher quality
    doc-depth: comprehensive
    doc-include-files: true
    doc-include-patterns: 'src/**/*.ts'  # Only source files
    documentation-output-dir: ./docs/api
```

### Architecture Documentation Only

```yaml
- name: Generate Architecture Docs
  uses: ashsaym/ai-code-reviewer/code-sentinel-ai@main
  with:
    mode: documentation
    api-key: ${{ secrets.OPENAI_API_KEY }}
    documentation-scope: architecture
    doc-depth: detailed
    doc-include-files: false
```

## Support

For issues or questions:
- Open an issue on GitHub
- Check existing documentation
- Review the code in `code-sentinel-ai/src/documentation/`
