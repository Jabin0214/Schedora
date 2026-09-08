export const templateSections = [
  { key: 'reports', label: '报告描述' },
  { key: 'review-comments', label: 'Review Comments' },
] as const;

export type TemplateSection = (typeof templateSections)[number]['key'];

export const defaultTemplateSection: TemplateSection = 'reports';
