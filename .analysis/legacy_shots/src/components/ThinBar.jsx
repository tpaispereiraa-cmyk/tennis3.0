import React from 'react';

/** Thin horizontal progress bar */
export default function ThinBar({ val, color, bg = '#0a1020' }) {
  return (
    <div style={{ height: 3, background: bg, borderRadius: 2, overflow: 'hidden' }}>
      <div style={{
        height: '100%', width: `${Math.round(val * 100)}%`,
        background: color, borderRadius: 2, transition: 'width 0.4s',
      }} />
    </div>
  );
}
