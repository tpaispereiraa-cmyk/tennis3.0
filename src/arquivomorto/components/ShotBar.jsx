import React from 'react';
import { SHOT_COLORS } from '../../core/constants.js';

/** Horizontal stacked bar showing shot type distribution */
export default function ShotBar({ byType }) {
  const entries = Object.entries(byType).filter(([,v]) => v > 0).sort(([,a],[,b]) => b-a);
  const total   = entries.reduce((s,[,v]) => s+v, 0) || 1;
  return (
    <div style={{ display:'flex', height:10, borderRadius:4, overflow:'hidden', width:'100%' }}>
      {entries.map(([k, v]) => (
        <div key={k} title={`${k}: ${v}`}
             style={{ flex: v/total, background: SHOT_COLORS[k] || '#555', minWidth:1 }} />
      ))}
    </div>
  );
}
