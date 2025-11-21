/**
 * Template Loader
 * 
 * Loads and compiles Handlebars templates
 */

import * as core from '@actions/core';
import Handlebars from 'handlebars';
import * as fs from 'fs/promises';
import * as path from 'path';

export class TemplateLoader {
  private static cache = new Map<string, HandlebarsTemplateDelegate>();

  /**
   * Load template from file
   */
  static async loadTemplate(templatePath: string): Promise<HandlebarsTemplateDelegate> {
    // Check cache
    if (this.cache.has(templatePath)) {
      return this.cache.get(templatePath)!;
    }

    try {
      const templateContent = await fs.readFile(templatePath, 'utf-8');
      const template = Handlebars.compile(templateContent);
      this.cache.set(templatePath, template);
      
      core.debug(`Loaded template: ${templatePath}`);
      return template;
    } catch (error) {
      core.error(`Failed to load template ${templatePath}: ${error}`);
      throw error;
    }
  }

  /**
   * Load template from string
   */
  static compileTemplate(templateString: string): HandlebarsTemplateDelegate {
    return Handlebars.compile(templateString);
  }

  /**
   * Load built-in template
   */
  static async loadBuiltInTemplate(name: 'review' | 'summary' | 'suggestions'): Promise<HandlebarsTemplateDelegate> {
    const templatePath = path.join(__dirname, 'templates', `${name}.hbs`);
    return this.loadTemplate(templatePath);
  }

  /**
   * Register Handlebars helper
   */
  static registerHelper(name: string, helper: Handlebars.HelperDelegate): void {
    Handlebars.registerHelper(name, helper);
  }

  /**
   * Register common helpers
   */
  static registerCommonHelpers(): void {
    // Uppercase helper
    this.registerHelper('upper', (str: string) => str.toUpperCase());
    
    // Lowercase helper
    this.registerHelper('lower', (str: string) => str.toLowerCase());
    
    // Truncate helper
    this.registerHelper('truncate', (str: string, length: number) => {
      if (str.length <= length) return str;
      return str.substring(0, length) + '...';
    });
    
    // Join array helper
    this.registerHelper('join', (arr: unknown[], separator: string) => {
      if (!Array.isArray(arr)) return '';
      return arr.join(separator);
    });
    
    // Conditional equality
    this.registerHelper('eq', (a: unknown, b: unknown) => a === b);
    
    // File extension
    this.registerHelper('ext', (filename: string) => {
      return path.extname(filename).substring(1);
    });
  }

  /**
   * Clear template cache
   */
  static clearCache(): void {
    this.cache.clear();
  }
}

// Register common helpers on load
TemplateLoader.registerCommonHelpers();