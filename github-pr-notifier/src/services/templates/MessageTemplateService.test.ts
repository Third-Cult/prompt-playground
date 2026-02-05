import { MessageTemplateService } from './MessageTemplateService';
import fs from 'fs/promises';
import path from 'path';

describe('MessageTemplateService', () => {
  let service: MessageTemplateService;
  let tempDir: string;
  let templatePath: string;

  beforeEach(async () => {
    service = new MessageTemplateService();

    // Create temporary directory for test templates
    tempDir = path.join(__dirname, '__test_templates__');
    await fs.mkdir(tempDir, { recursive: true });
    templatePath = path.join(tempDir, 'test-templates.json');
  });

  afterEach(async () => {
    // Clean up temp directory
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe('loadTemplates', () => {
    it('loads templates from JSON file', async () => {
      const templates = {
        test_template: {
          message: 'Hello {{name}}',
        },
      };

      await fs.writeFile(templatePath, JSON.stringify(templates));
      await service.loadTemplates(templatePath);

      expect(service.hasTemplate('test_template')).toBe(true);
    });

    it('skips fields starting with underscore', async () => {
      const templates = {
        _description: 'This is documentation',
        _version: '1.0.0',
        test_template: {
          message: 'Test',
        },
      };

      await fs.writeFile(templatePath, JSON.stringify(templates));
      await service.loadTemplates(templatePath);

      expect(service.hasTemplate('_description')).toBe(false);
      expect(service.hasTemplate('_version')).toBe(false);
      expect(service.hasTemplate('test_template')).toBe(true);
    });

    it('throws error for invalid JSON', async () => {
      await fs.writeFile(templatePath, '{ invalid json }');

      await expect(service.loadTemplates(templatePath)).rejects.toThrow(
        'Failed to load templates'
      );
    });

    it('throws error for non-existent file', async () => {
      await expect(service.loadTemplates('/nonexistent/file.json')).rejects.toThrow(
        'Failed to load templates'
      );
    });
  });

  describe('render', () => {
    beforeEach(async () => {
      const templates = {
        simple: {
          message: 'Hello {{name}}',
        },
        nested: {
          embeds: [
            {
              title: '{{title}}',
              fields: [
                {
                  name: 'Field',
                  value: '{{value}}',
                },
              ],
            },
          ],
        },
        multiple_vars: {
          text: '{{var1}} and {{var2}}',
        },
        with_documentation: {
          message: 'Test {{var}}',
          _description: 'This should be filtered out',
        },
      };

      await fs.writeFile(templatePath, JSON.stringify(templates));
      await service.loadTemplates(templatePath);
    });

    it('replaces simple variable', () => {
      const result = service.render('simple', { name: 'World' });

      expect(result.message).toBe('Hello World');
    });

    it('replaces variables in nested objects', () => {
      const result = service.render('nested', {
        title: 'Test Title',
        value: 'Test Value',
      });

      expect(result.embeds[0].title).toBe('Test Title');
      expect(result.embeds[0].fields[0].value).toBe('Test Value');
    });

    it('replaces multiple variables', () => {
      const result = service.render('multiple_vars', {
        var1: 'First',
        var2: 'Second',
      });

      expect(result.text).toBe('First and Second');
    });

    it('leaves unreplaced variables as-is', () => {
      const result = service.render('simple', { other: 'value' });

      expect(result.message).toBe('Hello {{name}}');
    });

    it('filters out documentation fields', () => {
      const result = service.render('with_documentation', { var: 'test' });

      expect(result.message).toBe('Test test');
      expect(result._description).toBeUndefined();
    });

    it('handles null and undefined variables', () => {
      const result = service.render('simple', { name: null });

      expect(result.message).toBe('Hello ');
    });

    it('converts numbers to strings', () => {
      const result = service.render('simple', { name: 123 });

      expect(result.message).toBe('Hello 123');
    });

    it('throws error for non-existent template', () => {
      expect(() => service.render('nonexistent', {})).toThrow('Template not found');
    });

    it('does not mutate original template', () => {
      const originalTemplate = service.getTemplate('simple');
      service.render('simple', { name: 'Test' });
      const afterTemplate = service.getTemplate('simple');

      expect(afterTemplate).toEqual(originalTemplate);
    });
  });

  describe('getTemplate', () => {
    beforeEach(async () => {
      const templates = {
        test: { message: 'Test' },
      };

      await fs.writeFile(templatePath, JSON.stringify(templates));
      await service.loadTemplates(templatePath);
    });

    it('returns raw template', () => {
      const template = service.getTemplate('test');

      expect(template).toEqual({ message: 'Test' });
    });

    it('returns undefined for non-existent template', () => {
      const template = service.getTemplate('nonexistent');

      expect(template).toBeUndefined();
    });
  });

  describe('hasTemplate', () => {
    beforeEach(async () => {
      const templates = {
        exists: { message: 'Test' },
      };

      await fs.writeFile(templatePath, JSON.stringify(templates));
      await service.loadTemplates(templatePath);
    });

    it('returns true for existing template', () => {
      expect(service.hasTemplate('exists')).toBe(true);
    });

    it('returns false for non-existent template', () => {
      expect(service.hasTemplate('nonexistent')).toBe(false);
    });
  });
});
