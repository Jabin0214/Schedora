import React from 'react';
import type { TaskTypeConfig } from '../types/api';

// ── Page section title (Notion-style bold heading) ─────────────
export const IndTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ display: 'flex', alignItems: 'center' }}>
    <span style={{
      fontSize: '20px',
      fontWeight: 700,
      color: '#37352F',
      letterSpacing: '-0.3px',
    }}>
      {children}
    </span>
  </div>
);

// ── Shared modal styles ────────────────────────────────────────
export const modalStyles = {
  content: { background: '#FFFFFF', padding: 0 },
  header:  { background: '#FFFFFF', borderBottom: '1px solid #E9E9E7', padding: '12px 20px' },
  body:    { padding: '16px 24px', background: '#FFFFFF' },
  footer:  { background: '#FFFFFF', borderTop: '1px solid #E9E9E7', padding: '8px 16px' },
};

// ── Lookup helper for dynamic task types ──────────────────────
export function getTypeConfig(
  types: TaskTypeConfig[],
  id: number | undefined
): TaskTypeConfig | undefined {
  if (id === undefined) return undefined;
  return types.find(t => t.id === id);
}
