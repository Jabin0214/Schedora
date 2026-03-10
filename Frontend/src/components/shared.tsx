import React from 'react';
import { InspectionType } from '../types/api';

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

// ── Inspection type → label + color ───────────────────────────
export const typeLabels: Record<InspectionType, { label: string; color: string }> = {
  [InspectionType.MoveIn]:  { label: '入住检查', color: 'cyan'    },
  [InspectionType.MoveOut]: { label: '退房检查', color: 'gold'    },
  [InspectionType.Routine]: { label: '例行检查', color: 'green'   },
  [InspectionType.Other]:   { label: '其他',     color: 'default' },
};
