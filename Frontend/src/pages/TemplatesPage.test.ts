import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('./TemplatesPage.tsx', import.meta.url), 'utf8');

describe('TemplatesPage review comments', () => {
  it('renders every fixed review-comment template with the existing copy action', () => {
    expect(source).toContain("import { reviewCommentTemplates } from '../data/reviewCommentTemplates';");
    expect(source).toContain('Review Comments');
    expect(source).toContain('reviewCommentTemplates.map(template => (');
    expect(source).toContain('copy(template.title, template.copyText)');
  });
});
