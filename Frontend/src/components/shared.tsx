import React from 'react';
import type { TaskTypeConfig } from '../types/api';

// ── Page section title (cyan left bar + uppercase label) ───────
export const IndTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
    <span style={{
      display: 'inline-block',
      width: 3,
      height: 18,
      background: '#00d4ff',
      boxShadow: '0 0 6px rgba(0,212,255,0.55)',
      flexShrink: 0,
    }} />
    <span style={{
      fontSize: '13px',
      fontWeight: 700,
      letterSpacing: '3px',
      textTransform: 'uppercase',
      color: '#e6edf3',
    }}>
      {children}
    </span>
  </div>
);

// ── Shared dark modal styles ───────────────────────────────────
export const modalStyles = {
  content: { background: '#161b22', padding: 0 },
  header:  { background: '#0d1117', borderBottom: '1px solid #30363d', padding: '10px 16px' },
  body:    { padding: '16px 24px', background: '#161b22' },
  footer:  { background: '#161b22', borderTop: '1px solid #30363d', padding: '8px 16px' },
};

// ── Lookup helper for dynamic task types ──────────────────────
export function getTypeConfig(
  types: TaskTypeConfig[],
  id: number | undefined
): TaskTypeConfig | undefined {
  if (id === undefined) return undefined;
  return types.find(t => t.id === id);
}
