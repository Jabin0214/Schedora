# Review Comment Templates Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add three fixed, copy-ready Review Comment templates below the existing report-description template on the Templates page.

**Architecture:** A focused front-end module owns the three fixed records. `TemplatesPage` renders them below the existing General card and uses its existing clipboard helper, messages, and card styling.

**Tech Stack:** React 19, TypeScript, Ant Design, Vite, Vitest.

---

## File structure

- Create: `Frontend/src/data/reviewCommentTemplates.ts` — record type and the three fixed templates.
- Create: `Frontend/src/data/reviewCommentTemplates.test.ts` — record ordering and precise clipboard text tests.
- Modify: `Frontend/src/pages/TemplatesPage.tsx` — renders the Review Comments section.

### Task 1: Define the fixed review-comment records

**Files:**
- Create: `Frontend/src/data/reviewCommentTemplates.ts`
- Test: `Frontend/src/data/reviewCommentTemplates.test.ts`

- [ ] **Step 1: Write the failing data-contract test**

```ts
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
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `npm test -- --run Frontend/src/data/reviewCommentTemplates.test.ts`

Expected: FAIL because the imported module does not exist.

- [ ] **Step 3: Add the minimal data module**

```ts
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
```

- [ ] **Step 4: Run the data-contract test and confirm it passes**

Run: `npm test -- --run Frontend/src/data/reviewCommentTemplates.test.ts`

Expected: PASS with two tests passing.

- [ ] **Step 5: Commit the template data**

```bash
git add Frontend/src/data/reviewCommentTemplates.ts Frontend/src/data/reviewCommentTemplates.test.ts
git commit -m "feat: add fixed review comment templates"
```

### Task 2: Render and copy review-comment cards

**Files:**
- Modify: `Frontend/src/pages/TemplatesPage.tsx:1-109`

- [ ] **Step 1: Import the fixed records**

Add:

```ts
import { reviewCommentTemplates } from '../data/reviewCommentTemplates';
```

- [ ] **Step 2: Render the section after the existing General card**

```tsx
<div style={{ marginTop: 24 }}>
  <h2 style={{ fontSize: 18, marginBottom: 0 }}>Review Comments</h2>
  {reviewCommentTemplates.map(template => (
    <Card key={template.title} title={template.title} size="small" style={{ marginTop: 12 }}>
      <p style={{ marginTop: 0, color: '#6B6B69' }}>{template.description}</p>
      <div style={previewStyle}>{template.copyText}</div>
      <div style={{ marginTop: 12, fontSize: 13, color: '#6B6B69' }}>
        实际范例：{template.example}
      </div>
      <Button
        type="primary"
        icon={<CopyOutlined />}
        onClick={() => copy(template.title, template.copyText)}
        style={{ marginTop: 12 }}
      >
        复制模板
      </Button>
    </Card>
  ))}
</div>
```

- [ ] **Step 3: Verify the production build**

Run: `npm run build`

Expected: command exits 0 and Vite emits a production bundle.

- [ ] **Step 4: Run all front-end tests**

Run: `npm test`

Expected: command exits 0 with existing tests and the new data-contract test passing.

- [ ] **Step 5: Commit the rendered section**

```bash
git add Frontend/src/pages/TemplatesPage.tsx
git commit -m "feat: show review comment templates"
```

