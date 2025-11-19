/**
 * Tree Builder
 * 
 * Builds hierarchical tree structure of entire codebase for documentation
 */

import * as core from '@actions/core';
import { CodebaseMap, FileMetadata } from '../common/types';

export interface TreeNode {
  name: string;
  path: string;
  absolutePath: string;
  type: 'root' | 'directory' | 'file';
  children?: TreeNode[];
  file?: FileMetadata;
  depth: number;
  fileCount?: number;
  directoryCount?: number;
  languages?: Set<string>;
}

export interface TreeLevel {
  depth: number;
  nodes: TreeNode[];
  type: 'root' | 'modules' | 'submodules' | 'files';
}

export class TreeBuilder {
  private root: TreeNode | null = null;
  private allNodes: Map<string, TreeNode> = new Map();

  constructor(private codebaseMap: CodebaseMap) {}

  /**
   * Build complete hierarchical tree of entire codebase
   */
  buildCompleteTree(): TreeNode {
    core.info('🌳 Building complete codebase tree...');
    
    this.root = {
      name: this.codebaseMap.projectName,
      path: '',
      absolutePath: this.codebaseMap.rootPath,
      type: 'root',
      children: [],
      depth: 0,
      fileCount: 0,
      directoryCount: 0,
      languages: new Set(),
    };

    this.allNodes.set('', this.root);

    // Add all files to tree
    for (const file of this.codebaseMap.files) {
      this.addFileToTree(file);
    }

    // Calculate statistics for each node
    this.calculateNodeStatistics(this.root);

    core.info(`  ✓ Tree built with ${this.allNodes.size} nodes`);
    core.info(`  ✓ Max depth: ${this.getMaxDepth(this.root)}`);
    
    return this.root;
  }

  /**
   * Get tree organized by levels for hierarchical documentation
   * Level 0: Root
   * Level 1: Top-level folders (modules)
   * Level 2: Subfolders (submodules)
   * Level N: All files
   */
  getTreeByLevels(): TreeLevel[] {
    if (!this.root) {
      this.buildCompleteTree();
    }

    const levels: TreeLevel[] = [];
    
    // Level 0: Root
    levels.push({
      depth: 0,
      nodes: [this.root!],
      type: 'root',
    });

    // Collect all directory nodes by depth
    const directoriesByDepth = new Map<number, TreeNode[]>();
    const allFiles: TreeNode[] = [];

    this.collectNodesByDepth(this.root!, directoriesByDepth, allFiles);

    // Add directory levels
    const maxDepth = Math.max(...Array.from(directoriesByDepth.keys()));
    for (let depth = 1; depth <= maxDepth; depth++) {
      const nodes = directoriesByDepth.get(depth) || [];
      if (nodes.length > 0) {
        levels.push({
          depth,
          nodes,
          type: depth === 1 ? 'modules' : 'submodules',
        });
      }
    }

    // Add files level (all files together)
    if (allFiles.length > 0) {
      levels.push({
        depth: maxDepth + 1,
        nodes: allFiles,
        type: 'files',
      });
    }

    return levels;
  }

  /**
   * Get markdown representation of tree structure
   */
  getTreeAsMarkdown(maxDepth: number = 10): string {
    if (!this.root) {
      this.buildCompleteTree();
    }

    return this.nodeToMarkdown(this.root!, 0, maxDepth);
  }

  /**
   * Get ASCII tree representation
   */
  getTreeAsASCII(maxDepth: number = 5): string {
    if (!this.root) {
      this.buildCompleteTree();
    }

    return this.nodeToASCII(this.root!, '', true, maxDepth, 0);
  }

  /**
   * Get clickable file:// link for a path
   */
  static getFileLink(absolutePath: string, displayName?: string): string {
    const encoded = absolutePath.replace(/ /g, '%20');
    const display = displayName || absolutePath;
    return `[${display}](file://${encoded})`;
  }

  /**
   * Get all nodes at a specific depth
   */
  getNodesAtDepth(depth: number): TreeNode[] {
    const nodes: TreeNode[] = [];
    this.collectNodesAtDepth(this.root!, depth, nodes);
    return nodes;
  }

  /**
   * Get directory node by path
   */
  getNodeByPath(relativePath: string): TreeNode | undefined {
    return this.allNodes.get(relativePath);
  }

  private addFileToTree(file: FileMetadata): void {
    const pathParts = file.relativePath.split('/').filter(p => p.length > 0);
    let currentPath = '';
    let currentNode = this.root!;

    // Create directory nodes
    for (let i = 0; i < pathParts.length - 1; i++) {
      const part = pathParts[i];
      currentPath = currentPath ? `${currentPath}/${part}` : part;

      let childNode = this.allNodes.get(currentPath);
      
      if (!childNode) {
        childNode = {
          name: part,
          path: currentPath,
          absolutePath: `${this.codebaseMap.rootPath}/${currentPath}`,
          type: 'directory',
          children: [],
          depth: i + 1,
          fileCount: 0,
          directoryCount: 0,
          languages: new Set(),
        };
        
        currentNode.children!.push(childNode);
        this.allNodes.set(currentPath, childNode);
      }

      currentNode = childNode;
    }

    // Add file node
    const fileName = pathParts[pathParts.length - 1];
    const fileNode: TreeNode = {
      name: fileName,
      path: file.relativePath,
      absolutePath: file.path,
      type: 'file',
      file,
      depth: pathParts.length,
    };

    currentNode.children!.push(fileNode);
  }

  private calculateNodeStatistics(node: TreeNode): void {
    if (node.type === 'file') {
      return;
    }

    let fileCount = 0;
    let directoryCount = 0;
    const languages = new Set<string>();

    for (const child of node.children || []) {
      if (child.type === 'file') {
        fileCount++;
        if (child.file?.language) {
          languages.add(child.file.language);
        }
      } else {
        directoryCount++;
        this.calculateNodeStatistics(child);
        fileCount += child.fileCount || 0;
        directoryCount += child.directoryCount || 0;
        child.languages?.forEach(lang => languages.add(lang));
      }
    }

    node.fileCount = fileCount;
    node.directoryCount = directoryCount;
    node.languages = languages;
  }

  private collectNodesByDepth(
    node: TreeNode,
    directoriesByDepth: Map<number, TreeNode[]>,
    allFiles: TreeNode[]
  ): void {
    if (node.type === 'file') {
      allFiles.push(node);
      return;
    }

    if (node.type === 'directory') {
      if (!directoriesByDepth.has(node.depth)) {
        directoriesByDepth.set(node.depth, []);
      }
      directoriesByDepth.get(node.depth)!.push(node);
    }

    for (const child of node.children || []) {
      this.collectNodesByDepth(child, directoriesByDepth, allFiles);
    }
  }

  private collectNodesAtDepth(node: TreeNode, targetDepth: number, result: TreeNode[]): void {
    if (node.depth === targetDepth) {
      result.push(node);
      return;
    }

    for (const child of node.children || []) {
      this.collectNodesAtDepth(child, targetDepth, result);
    }
  }

  private getMaxDepth(node: TreeNode): number {
    if (node.type === 'file') {
      return node.depth;
    }

    let maxDepth = node.depth;
    for (const child of node.children || []) {
      maxDepth = Math.max(maxDepth, this.getMaxDepth(child));
    }

    return maxDepth;
  }

  private nodeToMarkdown(node: TreeNode, currentDepth: number, maxDepth: number): string {
    if (currentDepth > maxDepth) {
      return '';
    }

    const indent = '  '.repeat(currentDepth);
    const fileLink = TreeBuilder.getFileLink(node.absolutePath, node.name);
    const suffix = node.type === 'directory' ? '/' : '';
    
    let markdown = `${indent}- ${fileLink}${suffix}`;
    
    if (node.type !== 'file' && node.fileCount !== undefined) {
      markdown += ` (${node.fileCount} files, ${node.directoryCount} dirs)`;
    }
    
    markdown += '\n';

    if (node.children && currentDepth < maxDepth) {
      // Sort: directories first, then files
      const sorted = [...node.children].sort((a, b) => {
        if (a.type !== b.type) {
          return a.type === 'directory' ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      });

      for (const child of sorted) {
        markdown += this.nodeToMarkdown(child, currentDepth + 1, maxDepth);
      }
    }

    return markdown;
  }

  private nodeToASCII(node: TreeNode, prefix: string, isLast: boolean, maxDepth: number, currentDepth: number): string {
    if (currentDepth > maxDepth) {
      return '';
    }

    const connector = isLast ? '└── ' : '├── ';
    const suffix = node.type === 'directory' ? '/' : '';
    let result = `${prefix}${connector}${node.name}${suffix}`;
    
    if (node.type !== 'file' && node.fileCount !== undefined) {
      result += ` (${node.fileCount} files)`;
    }
    
    result += '\n';

    if (node.children && currentDepth < maxDepth) {
      const newPrefix = prefix + (isLast ? '    ' : '│   ');
      
      // Sort: directories first, then files
      const sorted = [...node.children].sort((a, b) => {
        if (a.type !== b.type) {
          return a.type === 'directory' ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      });

      for (let i = 0; i < sorted.length; i++) {
        const child = sorted[i];
        const childIsLast = i === sorted.length - 1;
        result += this.nodeToASCII(child, newPrefix, childIsLast, maxDepth, currentDepth + 1);
      }
    }

    return result;
  }
}
