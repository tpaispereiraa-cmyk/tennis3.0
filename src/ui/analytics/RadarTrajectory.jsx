import React, { useMemo, useState } from 'react';

const SURFACE_COLORS = {
  CLAY: '#D4561E', HARD: '#68B6FF', GRASS: '#57D38C',
  INDOOR: '#B894FF', STREET: '#EF9F27', CARPET: '#E48AB0',
};

const CAT_LABELS = {
  GRAND_SLAM: 'GS', MASTERS_1000: 'M1000', ATP_500: '500', ATP_250: '250',
  ATP_100: 'CH100', ATP_75: 'CH75', ATP_50: 'CH50', ATP_25: 'CH25',
  SLAM_CLASH: 'APEX', FINALS: 'FINALS', ATP_PROSPECTS: 'JR', JUNIOR_50: 'J50', JUNIOR_100: 'J100', JUNIOR_SLAM: 'J-SLAM', PROSPECTS_FINALS: 'JR FINALS',
};

function rankTone(delta) {
  if (delta > 0) return '#57D38C';
  if (delta < 0) return '#FF8A80';
  return 'rgba(242,237,228,.48)';
}

export default function RadarTrajectory({ player, timeline = [] }) {
  const [selectedId, setSelectedId] = useState(null);
  const rows = useMemo(() => [...timeline].slice(-20), [timeline]);
  const selected = rows.find(row => row.id === selectedId) ?? rows.at(-1) ?? null;
  const ranked = rows.filter(row => Number.isFinite(row.rankAfter));
  const maxRank = Math.max(10, ...ranked.map(row => Math.max(row.rankBefore ?? 0, row.rankAfter ?? 0)));
  const minRank = Math.max(1, Math.min(...ranked.map(row => Math.min(row.rankBefore ?? 999, row.rankAfter ?? 999)), maxRank));
  const range = Math.max(8, maxRank - minRank);
  const chartWidth = 760;
  const chartHeight = 235;
  const padding = { top: 20, right: 18, bottom: 36, left: 42 };
  const innerW = chartWidth - padding.left - padding.right;
  const innerH = chartHeight - padding.top - padding.bottom;
  const xFor = index => padding.left + (rows.length <= 1 ? innerW / 2 : (index / (rows.length - 1)) * innerW);
  const yFor = rank => padding.top + ((rank - minRank) / range) * innerH;
  const points = rows.map((row, index) => ({ ...row, index, x:xFor(index), y:yFor(row.rankAfter ?? maxRank) }));
  const line = points.map(point => `${point.x},${point.y}`).join(' ');
  const bestRank = ranked.length ? Math.min(...ranked.map(row => row.rankAfter)) : null;
  const movement = ranked.reduce((sum, row) => sum + (row.rankDelta ?? 0), 0);

  if (!rows.length) return <section style={{ border:'1px solid rgba(255,255,255,.10)', padding:20, background:'rgba(255,255,255,.018)', marginTop:20 }}>
    <div style={{ fontFamily:"'Space Mono', monospace", fontSize:8, letterSpacing:'.22em', color:'rgba(242,237,228,.45)' }}>TRAJETÓRIA RECENTE</div>
    <div style={{ fontFamily:"'Barlow', sans-serif", fontSize:14, color:'rgba(242,237,228,.62)', marginTop:10 }}>A linha começa a ser desenhada quando {player?.name ?? 'este jogador'} conclui torneios acompanhados.</div>
  </section>;

  return <section style={{ border:'1px solid rgba(232,200,74,.28)', padding:'18px 18px 14px', background:'linear-gradient(135deg,rgba(232,200,74,.055),rgba(255,255,255,.012))', marginTop:20, overflow:'hidden' }}>
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'end', gap:16, flexWrap:'wrap', marginBottom:12 }}>
      <div><div style={{ fontFamily:"'Space Mono', monospace", fontSize:8, letterSpacing:'.22em', color:'#E8C84A' }}>ARQUIVO DE FORMA · ÚLTIMOS {rows.length} TORNEIOS</div><div style={{ fontFamily:"'Bebas Neue', sans-serif", fontSize:34, letterSpacing:'.03em', color:'#F3EFE8', marginTop:5 }}>TRAJETÓRIA DE RANKING</div></div>
      <div style={{ display:'flex', gap:14, fontFamily:"'Space Mono', monospace", fontSize:8, letterSpacing:'.12em' }}><span style={{ color:rankTone(movement) }}>{movement > 0 ? '▲' : movement < 0 ? '▼' : '•'} {Math.abs(movement)} POSIÇÕES</span><span style={{ color:'rgba(242,237,228,.55)' }}>MELHOR #{bestRank ?? '—'}</span></div>
    </div>
    <div style={{ overflowX:'auto' }}><svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} style={{ display:'block', minWidth:620, width:'100%', height:'auto' }} role="img" aria-label={`Trajetória de ranking de ${player?.name ?? 'jogador'}`}>
      {[0,.25,.5,.75,1].map(step => { const rank = Math.round(minRank + range * step); const y = padding.top + innerH * step; return <g key={step}><line x1={padding.left} y1={y} x2={chartWidth-padding.right} y2={y} stroke="rgba(255,255,255,.08)" strokeDasharray="3 5"/><text x={padding.left-8} y={y+3} textAnchor="end" fill="rgba(242,237,228,.42)" fontSize="9" fontFamily="monospace">#{rank}</text></g>; })}
      {points.length > 1 && <polyline points={line} fill="none" stroke="#E8C84A" strokeWidth="2.3" strokeLinejoin="round" strokeLinecap="round" />}
      {points.map(point => <g key={point.id} onClick={() => setSelectedId(point.id)} style={{ cursor:'pointer' }}><circle cx={point.x} cy={point.y} r={selected?.id === point.id ? 6 : 4.5} fill={SURFACE_COLORS[point.surface] ?? '#E8C84A'} stroke="#071015" strokeWidth="2"/><text x={point.x} y={chartHeight-12} textAnchor="middle" fill="rgba(242,237,228,.48)" fontSize="8" fontFamily="monospace">{point.index + 1}</text></g>)}
    </svg></div>
    {selected && <div style={{ display:'grid', gridTemplateColumns:'1fr auto auto', gap:12, alignItems:'center', padding:'11px 12px', borderTop:'1px solid rgba(255,255,255,.10)', marginTop:5, background:'rgba(0,0,0,.16)' }}>
      <div><div style={{ fontFamily:"'Barlow Condensed', sans-serif", fontWeight:700, fontSize:18, color:'#F3EFE8', textTransform:'uppercase' }}>{selected.tournamentName}</div><div style={{ fontFamily:"'Space Mono', monospace", fontSize:8, color:'rgba(242,237,228,.48)', marginTop:3 }}>{CAT_LABELS[selected.category] ?? selected.category} · {selected.roundLabel?.toUpperCase()} · {selected.surface}</div></div>
      <div style={{ textAlign:'right', fontFamily:"'Bebas Neue', sans-serif", fontSize:25, color:rankTone(selected.rankDelta) }}>#{selected.rankBefore ?? '—'} → #{selected.rankAfter ?? '—'}</div>
      <div style={{ textAlign:'right', fontFamily:"'Space Mono', monospace", fontSize:9, color:'#E8C84A' }}>+{selected.points ?? 0} PTS</div>
    </div>}
    <div style={{ marginTop:13, display:'grid', gap:0 }}>
      {[...rows].reverse().map(row => <div key={`row-${row.id}`} onClick={() => setSelectedId(row.id)} style={{ cursor:'pointer', display:'grid', gridTemplateColumns:'minmax(0,1fr) 76px 86px 82px', gap:10, alignItems:'center', padding:'8px 2px', borderTop:'1px solid rgba(255,255,255,.06)' }}>
        <div style={{ minWidth:0 }}><div style={{ fontFamily:"'Barlow Condensed', sans-serif", fontWeight:700, fontSize:16, color:'#F3EFE8', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{row.tournamentName}</div><div style={{ fontFamily:"'Space Mono', monospace", fontSize:7, color:SURFACE_COLORS[row.surface] ?? 'rgba(242,237,228,.48)', letterSpacing:'.12em' }}>{CAT_LABELS[row.category] ?? row.category} · {row.roundLabel?.toUpperCase()}</div></div>
        <div style={{ fontFamily:"'Space Mono', monospace", fontSize:9, color:rankTone(row.rankDelta), textAlign:'right' }}>{row.rankDelta > 0 ? '▲' : row.rankDelta < 0 ? '▼' : '•'} {Math.abs(row.rankDelta ?? 0)}</div>
        <div style={{ fontFamily:"'Space Mono', monospace", fontSize:9, color:'rgba(242,237,228,.62)', textAlign:'right' }}>#{row.rankBefore ?? '—'} → #{row.rankAfter ?? '—'}</div>
        <div style={{ fontFamily:"'Space Mono', monospace", fontSize:9, color:'#E8C84A', textAlign:'right' }}>+{row.points ?? 0}</div>
      </div>)}
    </div>
  </section>;
}
