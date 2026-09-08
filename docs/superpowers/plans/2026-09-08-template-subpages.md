# Template Subpages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Divide Templates into switchable Report Description and Review Comments sections.

**Architecture:** Keep tab selection as local page state. Extract the two permitted tab keys into a tiny pure module so the default and panel mapping are covered without adding a browser test framework. Keep report-template fetch behavior inside its panel and render Review Comments independently from local data.

**Tech Stack:** React 19, TypeScript, Ant Design, Vitest.

---

### Task 1: Define template section state

**Files:**
- Create: `Frontend/src/pages/templateSections.ts`
- Test: `Frontend/src/pages/templateSections.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/pages/templateSections.test.ts`

Expected: FAIL because `./templateSections` does not exist.

- [ ] **Step 3: Write minimal implementation**

```ts
export const templateSections = [
  { key: 'reports', label: '报告描述' },
  { key: 'review-comments', label: 'Review Comments' },
] as const;

export type TemplateSection = (typeof templateSections)[number]['key'];
export const defaultTemplateSection: TemplateSection = 'reports';
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/pages/templateSections.test.ts`

Expected: PASS.

### Task 2: Render a focused panel for each section

**Files:**
- Modify: `Frontend/src/pages/TemplatesPage.tsx`
- Modify: `Frontend/src/pages/templateSections.test.ts`

- [ ] **Step 1: Extend the test with the selected-panel mapping**

```ts
import { panelForTemplateSection } from './templateSections';

it('maps each tab to its own panel', () => {
  expect(panelForTemplateSection('reports')).toBe('reports');
  expect(panelForTemplateSection('review-comments')).toBe('review-comments');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/pages/templateSections.test.ts`

Expected: FAIL because `panelForTemplateSection` is not exported.

- [ ] **Step 3: Add the panel mapping and use it in the page**

```ts
export function panelForTemplateSection(section: TemplateSection): TemplateSection {
  return section;
}
```

In `TemplatesPage.tsx`, add `Tabs` from Ant Design, initialize local section state with `defaultTemplateSection`, and use two tab items. Place the existing report UI exclusively in the reports panel. Place the Review Comments cards exclusively in the Review Comments panel. Keep the Review Comments panel renderable when the report API errors.

- [ ] **Step 4: Run focused test and frontend build**

Run: `npm test -- src/pages/templateSections.test.ts && npm run build`

Expected: PASS and a successful production build.

### Task 3: Regression verification

**Files:**
- Verify only: `Frontend/src/pages/TemplatesPage.tsx`

- [ ] **Step 1: Run the complete frontend test suite**

Run: `npm test`

Expected: all tests pass.

- [ ] **Step 2: Verify the live Templates page**

Open `http://127.0.0.1:5097/templates`. Confirm the Report Description tab shows its original selector and General card, and Review Comments shows the three cards without the report content.

- [ ] **Step 3: Commit**

```bash
git add Frontend/src/pages/TemplatesPage.tsx Frontend/src/pages/templateSections.ts Frontend/src/pages/templateSections.test.ts Backend/wwwroot docs/superpowers/specs/2026-09-08-template-subpages-design.md docs/superpowers/plans/2026-09-08-template-subpages.md
git commit -m "feat: split templates into focused sections"
```
