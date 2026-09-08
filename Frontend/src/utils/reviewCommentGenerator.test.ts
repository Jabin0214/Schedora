import { describe, expect, it } from 'vitest';
import { buildReviewComment } from './reviewCommentGenerator';

describe('buildReviewComment', () => {
  it('builds a rent increase for a fixed term', () => {
    expect(buildReviewComment({
      rent: '650/week',
      startDate: '2026-03-10',
      tenancyType: 'fixed',
      term: '6 months',
      endDate: '2026-09-07',
    })).toBe('Rent increased to $650/week from 10 Mar 2026, with a 6 months fixed term until 07 Sep 2026.');
  });

  it('builds a rent hold for a periodic tenancy', () => {
    expect(buildReviewComment({
      rent: '',
      startDate: '2026-03-10',
      tenancyType: 'periodic',
      term: '',
      endDate: '',
    })).toBe('Rent remains the same from 10 Mar 2026. Tenancy continuing as periodic.');
  });
});
