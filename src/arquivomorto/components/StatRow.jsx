import React from 'react';

/** One comparison row in the match-over stats table */
export default function StatRow({ label, valA, valB, fmtA, fmtB, higherIsBetter = true }) {
  const a = typeof valA === 'number' ? valA : 0;
  const b = typeof valB === 'number' ? valB : 0;
  const aWins = higherIsBetter ? a >= b : a <= b;
  const bWins = higherIsBetter ? b >= a : b <= a;
  const cA = a === b ? '#4a6070' : aWins ? '#FF6B35' : '#3a5060';
  const cB = a === b ? '#4a6070' : bWins ? '#00D4FF' : '#3a5060';
  const total = Math.max(a + b, 1);

  return (
    <div style={{ display:'grid', gridTemplateColumns:'1fr auto 1fr', gap:8,
                  alignItems:'center', padding:'4px 0', borderBottom:'1px solid #0d1520' }}>
      <div style={{ textAlign:'right' }}>
        <span style={{ fontSize:15, fontWeight:900, color:cA }}>{fmtA ?? valA}</span>
      </div>
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', minWidth:150 }}>
        <span style={{ fontSize:8, color:'#3a5060', letterSpacing:1, whiteSpace:'nowrap', marginBottom:3 }}>{label}</span>
        <div style={{ width:'100%', display:'flex', height:4, borderRadius:2, overflow:'hidden', gap:1 }}>
          <div style={{ flex: a/total, background: cA==='#3a5060'?'#1a2535':cA, borderRadius:'2px 0 0 2px', transition:'flex 0.6s' }}/>
          <div style={{ flex: b/total, background: cB==='#3a5060'?'#1a2535':cB, borderRadius:'0 2px 2px 0', transition:'flex 0.6s' }}/>
        </div>
      </div>
      <div style={{ textAlign:'left' }}>
        <span style={{ fontSize:15, fontWeight:900, color:cB }}>{fmtB ?? valB}</span>
      </div>
    </div>
  );
}
