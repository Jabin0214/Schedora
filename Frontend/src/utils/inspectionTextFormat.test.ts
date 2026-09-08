import { describe, expect, it } from 'vitest';
import { formatInspectionTemplateForCopy } from './inspectionTextFormat';

describe('formatInspectionTemplateForCopy', () => {
  it('adds breathing room around section headings while preserving checklist lines', () => {
    const raw = [
      'Overall Presentation:',
      'The property was clean.',
      'Move-in Checks & Observations:',
      'The following items were checked with no issue noted:',
      '- Fixed heating source',
      '- Kitchen rangehood and extraction system',
      'Assessment:',
      'No immediate action is required.',
    ].join('\n');

    expect(formatInspectionTemplateForCopy(raw)).toBe([
      'Overall Presentation:',
      '',
      'The property was clean.',
      '',
      'Move-in Checks & Observations:',
      '',
      'The following items were checked with no issue noted:',
      '- Fixed heating source',
      '- Kitchen rangehood and extraction system',
      '',
      'Assessment:',
      '',
      'No immediate action is required.',
    ].join('\n'));
  });
});
