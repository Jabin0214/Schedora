import { describe, expect, it } from 'vitest';
import { reviewCommentTemplates } from './reviewCommentTemplates';

describe('review comment templates', () => {
  it('keeps the three approved scenarios in display order', () => {
    expect(reviewCommentTemplates.map(template => template.title)).toEqual([
      '租金上涨 & 续签固定租期',
      '转为周期性租约',
      '租金保持不变',
    ]);
  });

  it('copies only the English writing template', () => {
    expect(reviewCommentTemplates.map(template => template.copyText)).toEqual([
      'Rent increased to [新租金] effective [生效日期]. Lease renewed for [几个月/年], new end date [新截止日期].',
      'Rent increased to [新租金] effective [生效日期]. Tenancy rolling onto a periodic lease.',
      'Rent reviewed on [评估日期]. Owner advised no increase at this time.',
    ]);
  });
});
