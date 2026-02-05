import fs from 'fs/promises';
import { IMessageTemplateService } from './interfaces/IMessageTemplateService';
import { logger } from '../../utils/logger';

/**
 * MessageTemplateService
 * 
 * Loads and renders JSON templates for Discord messages
 */
export class MessageTemplateService implements IMessageTemplateService {
  private templates: Map<string, any> = new Map();

  /**
   * Load templates from JSON config file
   */
  async loadTemplates(configPath: string): Promise<void> {
    try {
      const content = await fs.readFile(configPath, 'utf-8');
      const parsed = JSON.parse(content);

      // Store templates (skip entries starting with _)
      Object.entries(parsed).forEach(([name, template]) => {
        if (!name.startsWith('_')) {
          this.templates.set(name, template);
        }
      });

      logger.info(`Loaded ${this.templates.size} templates from ${configPath}`);
    } catch (error) {
      throw new Error(`Failed to load templates: ${(error as Error).message}`);
    }
  }

  /**
   * Render a template with variable substitution
   */
  render(templateName: string, variables: Record<string, any>): any {
    const template = this.templates.get(templateName);
    if (!template) {
      throw new Error(`Template not found: ${templateName}`);
    }

    // Deep clone to avoid mutation
    const rendered = JSON.parse(JSON.stringify(template));

    // Replace variables recursively
    return this.replaceVariables(rendered, variables);
  }

  /**
   * Get raw template
   */
  getTemplate(templateName: string): any {
    return this.templates.get(templateName);
  }

  /**
   * Check if template exists
   */
  hasTemplate(templateName: string): boolean {
    return this.templates.has(templateName);
  }

  /**
   * Recursively replace {{variable}} placeholders in template
   */
  private replaceVariables(obj: any, variables: Record<string, any>): any {
    if (typeof obj === 'string') {
      // Check if the entire string is a single variable (e.g., "{{color}}")
      // This preserves the original type (number, boolean, etc.)
      const singleVarMatch = obj.match(/^\{\{(\w+)\}\}$/);
      if (singleVarMatch) {
        const key = singleVarMatch[1];
        if (key in variables) {
          // Return the actual value (preserving its type)
          return variables[key] != null ? variables[key] : obj;
        }
      }

      // Replace {{variable}} with value in strings containing text
      return obj.replace(/\{\{(\w+)\}\}/g, (match, key) => {
        if (key in variables) {
          const value = variables[key];
          // Convert to string, preserving null/undefined as empty string
          return value !== null && value !== undefined ? String(value) : '';
        }
        return match; // Leave unreplaced if variable not found
      });
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.replaceVariables(item, variables));
    }

    if (typeof obj === 'object' && obj !== null) {
      const result: any = {};
      for (const [key, value] of Object.entries(obj)) {
        // Skip keys starting with _ (documentation fields)
        if (!key.startsWith('_')) {
          result[key] = this.replaceVariables(value, variables);
        }
      }
      return result;
    }

    return obj;
  }
}
