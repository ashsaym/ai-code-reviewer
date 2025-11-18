/**
 * Logger utility
 * 
 * Wrapper around @actions/core logging with enhanced formatting
 */

import * as core from '@actions/core';

export class Logger {
  private static context: string = '';

  /**
   * Set logging context
   */
  static setContext(context: string): void {
    this.context = context;
  }

  /**
   * Format message with context
   */
  private static format(message: string): string {
    return this.context ? `[${this.context}] ${message}` : message;
  }

  /**
   * Log info message
   */
  static info(message: string): void {
    core.info(this.format(message));
  }

  /**
   * Log debug message
   */
  static debug(message: string): void {
    core.debug(this.format(message));
  }

  /**
   * Log warning message
   */
  static warning(message: string): void {
    core.warning(this.format(message));
  }

  /**
   * Log error message
   */
  static error(message: string): void {
    core.error(this.format(message));
  }

  /**
   * Log group start
   */
  static startGroup(name: string): void {
    core.startGroup(this.format(name));
  }

  /**
   * Log group end
   */
  static endGroup(): void {
    core.endGroup();
  }

  /**
   * Log with emoji
   */
  static emoji(emoji: string, message: string): void {
    core.info(`${emoji} ${this.format(message)}`);
  }

  /**
   * Log success
   */
  static success(message: string): void {
    this.emoji('✅', message);
  }

  /**
   * Log progress
   */
  static progress(message: string): void {
    this.emoji('🔄', message);
  }

  /**
   * Log metrics
   */
  static metrics(metrics: Record<string, any>): void {
    const formatted = Object.entries(metrics)
      .map(([key, value]) => `${key}: ${value}`)
      .join(', ');
    this.info(`Metrics - ${formatted}`);
  }
}
