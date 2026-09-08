import { describe, expect, it } from 'vitest';
import {
  allNavigationItems,
  mobileMoreItems,
  mobilePrimaryItems,
  selectedNavigationKey,
} from './navigation';

describe('navigation model', () => {
  it('keeps every destination reachable exactly once on mobile', () => {
    const all = allNavigationItems.map(item => item.key).sort();
    const mobile = [...mobilePrimaryItems, ...mobileMoreItems]
      .map(item => item.key)
      .sort();

    expect(mobile).toEqual(all);
    expect(new Set(mobile).size).toBe(all.length);
  });

  it('limits the primary mobile bar to four items', () => {
    expect(mobilePrimaryItems).toHaveLength(4);
  });

  it('selects properties for property detail routes', () => {
    expect(selectedNavigationKey('/properties/42')).toBe('properties');
  });

  it('falls back to properties for unknown routes', () => {
    expect(selectedNavigationKey('/missing')).toBe('properties');
  });
});
