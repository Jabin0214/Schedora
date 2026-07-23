import React from 'react';

// ── Page section title (Notion-style bold heading) ─────────────
export const IndTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ display: 'flex', alignItems: 'center' }}>
    <span style={{
      fontSize: '20px',
      fontWeight: 700,
      color: '#37352F',
      letterSpacing: 0,
    }}>
      {children}
    </span>
  </div>
);
