export interface ReviewCommentTemplate {
  title: string;
  description: string;
  copyText: string;
  example: string;
}

export const reviewCommentTemplates: ReviewCommentTemplate[] = [
  {
    title: '租金上涨 & 续签固定租期',
    description: '当房东和租客同意涨租，并且签订了新的固定期限租约时。',
    copyText: 'Rent increased to [新租金] effective [生效日期]. Lease renewed for [几个月/年], new end date [新截止日期].',
    example: 'Rent increased to $650/week effective 10 Oct 2026. Lease renewed for 12 months, new end date 09 Oct 2027.',
  },
  {
    title: '转为周期性租约',
    description: '当租客不签固定期，或按法定程序转为周期性租约时。',
    copyText: 'Rent increased to [新租金] effective [生效日期]. Tenancy rolling onto a periodic lease.',
    example: 'Rent increased to $650/wk from 10/10/2026. Tenancy continuing as periodic.',
  },
  {
    title: '租金保持不变',
    description: '经过评估后，决定本次不涨租时。',
    copyText: 'Rent reviewed on [评估日期]. Owner advised no increase at this time.',
    example: "Rent reviewed 15 Sep 2026. No rent increase applied as per owner's instruction (good tenant/market rate). Next review in 6 months.",
  },
];
