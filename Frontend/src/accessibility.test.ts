import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const appSource = readFileSync(new URL('./App.tsx', import.meta.url), 'utf8');
const appStyles = readFileSync(new URL('./App.css', import.meta.url), 'utf8');
const globalStyles = readFileSync(new URL('./index.css', import.meta.url), 'utf8');

describe('application accessibility contracts', () => {
  it('provides skip navigation and a focusable main target', () => {
    expect(appSource).toContain('href="#main-content"');
    expect(appSource).toContain('id="main-content"');
    expect(appSource).toContain('tabIndex={-1}');
  });

  it('defines focus visibility and reduced motion behavior', () => {
    expect(globalStyles).toContain(':focus-visible');
    expect(`${globalStyles}\n${appStyles}`).toContain('prefers-reduced-motion: reduce');
  });

  it('keeps desktop navigation visible until mobile navigation takes over', () => {
    expect(appSource).toContain('breakpoint="md"');
    expect(appStyles).toContain('@media (max-width: 768px)');
  });
});
