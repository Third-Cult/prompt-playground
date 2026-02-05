/**
 * Message Template Service Interface
 * 
 * Responsibilities:
 * - Load message templates from config files
 * - Render templates with variable substitution
 * - Support multiple template formats
 */
export interface IMessageTemplateService {
  /**
   * Load templates from config file
   * 
   * @param configPath - Path to template config file (JSON)
   */
  loadTemplates(configPath: string): Promise<void>;

  /**
   * Render a template with variables
   * 
   * @param templateName - Name of the template to render
   * @param variables - Variables to substitute in template
   * @returns Rendered template object
   */
  render(templateName: string, variables: Record<string, any>): any;

  /**
   * Get raw template (for testing/debugging)
   * 
   * @param templateName - Name of the template
   * @returns Raw template object or null if not found
   */
  getTemplate(templateName: string): any;

  /**
   * Check if template exists
   * 
   * @param templateName - Name of the template
   * @returns true if template exists
   */
  hasTemplate(templateName: string): boolean;
}
