import React from 'react';
import ThinBar from './ThinBar.jsx';

export default function MomentumBar({ val, color }) {
  const pct     = Math.round(val * 100);
  const barColor = val > 0.65 ? '#FFD700' : val < 0.35 ? '#556677' : color;
  const label    = val > 0.72 ? '🔥' : val < 0.28 ? '📉' : '';
  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: 2 }}>
        <span style={{ fontSize: 8, color: '#3a5060', letterSpacing: 1 }}>MOMENTUM</span>
        <span style={{ fontSize: 8, color: barColor, fontWeight: 700 }}>{label} {pct}%</span>
      </div>
      <ThinBar val={val} color={barColor} />
    </div>
  );
}
