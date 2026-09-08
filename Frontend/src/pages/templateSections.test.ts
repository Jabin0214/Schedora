import { describe, expect, it } from 'vitest';
import { defaultTemplateSection, templateSections } from './templateSections';

describe('template sections', () => {
  it('defaults to report descriptions and exposes the two focused sections', () => {
    expect(defaultTemplateSection).toBe('reports');
    expect(templateSections).toEqual([
      { key: 'reports', label: '报告描述' },
      { key: 'review-comments', label: 'Review Comments' },
    ]);
  });
});
