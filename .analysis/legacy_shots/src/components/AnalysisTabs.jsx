import React, { useState } from 'react';
import BounceMap from './BounceMap.jsx';
import ShotDirectionMap from './ShotDirectionMap.jsx';
import LandingMap from './LandingMap.jsx';
import ContactMap from './ContactMap.jsx';
import PatternMap from './PatternMap.jsx';
import PositionHeatmap from './PositionHeatmap.jsx';

const OE = {
  bg:          '#0e1117',
  cream:       '#f2ede6',
  gray2:       '#1a1a22',
  gray3:       '#2a2a35',
  gray4:       '#555',
  fontDisplay: "'Teko','Barlow Condensed',sans-serif",
  fontBody:    "'Barlow Condensed','Teko',sans-serif",
};

const TABS = [
  { id: 'bounce',    label: 'Quiques',   icon: '●' },
  { id: 'direction', label: 'Direção',   icon: '→' },
  { id: 'landing',   label: 'Alvo',      icon: '◆' },
  { id: 'contact',   label: 'Contato',   icon: '✦' },
  { id: 'patterns',  label: 'Padrões',   icon: '≈' },
  { id: 'serve',     label: 'Saque',     icon: '🎾' },
  { id: 'heatmap',   label: 'Posição',   icon: '🔥' },
];

export default function AnalysisTabs({ bounceLog = [], debugEvents = [], p0, p1 }) {
  const [activeTab, setActiveTab] = useState('bounce');

  const shotCount = debugEvents.filter(e => e.type === 'SHOT_EVENT').length;
  const bounceCount = bounceLog.length;

  const badgeFor = (id) => {
    if (id === 'bounce')    return bounceCount;
    if (id === 'direction') return shotCount;
    if (id === 'landing')   return bounceLog.filter(b => b.targetX !== null && b.targetX !== undefined).length;
    if (id === 'contact')   return shotCount;
    if (id === 'patterns')  return null;
    if (id === 'serve')     return (p0?.stats?.serveLog?.length ?? 0) + (p1?.stats?.serveLog?.length ?? 0);
    if (id === 'heatmap')   return null;
    return null;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
      {/* Tab bar */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        background: OE.gray2,
        position: 'sticky',
        top: 0,
        zIndex: 10,
      }}>
        {TABS.map(tab => {
          const active = activeTab === tab.id;
          const badge = badgeFor(tab.id);
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              style={{
                flex: 1,
                padding: '14px 8px',
                cursor: 'pointer',
                border: 'none',
                borderBottom: active ? '2px solid rgba(242,237,230,0.85)' : '2px solid transparent',
                background: active ? 'rgba(255,255,255,0.04)' : 'transparent',
                transition: 'all 0.15s',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 3,
              }}>
              <span style={{
                fontFamily: OE.fontDisplay,
                fontSize: 18,
                color: active ? OE.cream : OE.gray4,
                lineHeight: 1,
              }}>
                {tab.icon}
              </span>
              <span style={{
                fontFamily: OE.fontBody,
                fontSize: 9,
                letterSpacing: 2,
                textTransform: 'uppercase',
                color: active ? OE.cream : OE.gray4,
              }}>
                {tab.label}
              </span>
              {badge !== null && (
                <span style={{
                  fontFamily: OE.fontDisplay,
                  fontSize: 12,
                  color: active ? 'rgba(242,237,230,0.5)' : 'rgba(85,85,85,0.7)',
                  lineHeight: 1,
                }}>
                  {badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div style={{ background: OE.bg }}>
        {activeTab === 'bounce' && (
          <BounceMap bounceLog={bounceLog} p0={p0} p1={p1} />
        )}
        {activeTab === 'direction' && (
          <ShotDirectionMap debugEvents={debugEvents} p0={p0} p1={p1} />
        )}
        {activeTab === 'landing' && (
          <LandingMap bounceLog={bounceLog} p0={p0} p1={p1} />
        )}
        {activeTab === 'contact' && (
          <ContactMap debugEvents={debugEvents} p0={p0} p1={p1} />
        )}
        {activeTab === 'patterns' && (
          <PatternMap debugEvents={debugEvents} p0={p0} p1={p1} />
        )}
        {activeTab === 'serve' && (
          <ServeTab p0={p0} p1={p1} />
        )}
        {activeTab === 'heatmap' && (
          <PositionHeatmap p0={p0} p1={p1} />
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  ServeTab — Análise de Saque & Return inline na tela pós-jogo
// ═══════════════════════════════════════════════════════════════

function StatBar({ label, valA, valB, colorA, colorB, note }) {
  const a = parseInt(valA) || 0;
  const b = parseInt(valB) || 0;
  const maxV = Math.max(a, b, 1);
  const qA = a > b ? OE.cream : OE.gray4;
  const qB = b > a ? OE.cream : OE.gray4;
  return (
    <div style={{ padding: '9px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', display: 'grid', gridTemplateColumns: '1fr 150px 1fr', gap: 8, alignItems: 'center' }}>
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontFamily: OE.fontDisplay, fontSize: 22, fontWeight: 600, color: qA, lineHeight: 1 }}>{valA}</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
        <span style={{ fontFamily: OE.fontBody, fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: OE.gray4, textAlign: 'center' }}>{label}</span>
        {note && <span style={{ fontFamily: OE.fontBody, fontSize: 8, color: '#333', letterSpacing: 1 }}>{note}</span>}
        <div style={{ width: '100%', display: 'flex', height: 2, gap: 1 }}>
          <div style={{ flex: a / maxV, background: qA === OE.cream ? OE.cream : 'rgba(255,255,255,0.07)', transition: 'flex 0.5s' }} />
          <div style={{ flex: b / maxV, background: qB === OE.cream ? 'rgba(242,237,230,0.4)' : 'rgba(255,255,255,0.04)', transition: 'flex 0.5s' }} />
        </div>
      </div>
      <div style={{ textAlign: 'left' }}>
        <div style={{ fontFamily: OE.fontDisplay, fontSize: 22, fontWeight: 600, color: qB, lineHeight: 1 }}>{valB}</div>
      </div>
    </div>
  );
}

function MiniBarChart({ data, color, width = 380, height = 80 }) {
  // data: [{label, value}]
  if (!data || !data.length) return null;
  const maxV = Math.max(...data.map(d => d.value), 1);
  const barW = (width - (data.length - 1) * 3) / data.length;
  return (
    <svg width={width} height={height} style={{ overflow: 'visible', maxWidth: '100%' }}>
      {data.map((d, i) => {
        const bh = (d.value / maxV) * (height - 18);
        const x = i * (barW + 3);
        const clr = d.won != null ? (d.won >= 0.55 ? '#4ade80' : d.won >= 0.40 ? color : '#f87171') : color;
        return (
          <g key={i}>
            <rect x={x} y={height - 18 - bh} width={barW} height={bh} fill={clr} opacity={0.75} />
            <text x={x + barW / 2} y={height - 4} fill={OE.gray4} fontSize={8} textAnchor="middle">{d.label}</text>
            {d.won != null && d.value > 0 && (
              <text x={x + barW / 2} y={height - 20 - bh} fill={clr} fontSize={8} textAnchor="middle">
                {Math.round(d.won * 100)}%
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

function ServeTimeline({ log, color, width = 380, height = 80 }) {
  if (!log || log.length < 4) return <div style={{ color: OE.gray4, fontSize: 11 }}>dados insuficientes</div>;
  const WIN = 8;
  const pts = [];
  for (let i = WIN - 1; i < log.length; i++) {
    const sl = log.slice(i - WIN + 1, i + 1);
    pts.push({ x: i, y: sl.filter(l => l.won).length / WIN });
  }
  const P = { l: 28, r: 8, t: 8, b: 18 };
  const xs = i => P.l + (i / Math.max(log.length - 1, 1)) * (width - P.l - P.r);
  const ys = v => P.t + (1 - v) * (height - P.t - P.b);
  const ATP = 0.63;
  const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${xs(p.x).toFixed(1)},${ys(p.y).toFixed(1)}`).join(' ');
  const area = path + ` L${xs(pts[pts.length - 1].x).toFixed(1)},${ys(0).toFixed(1)} L${xs(pts[0].x).toFixed(1)},${ys(0).toFixed(1)} Z`;
  return (
    <svg width={width} height={height} style={{ overflow: 'visible', maxWidth: '100%' }}>
      {[0, 0.5, 1].map(v => (
        <g key={v}>
          <line x1={P.l} x2={width - P.r} y1={ys(v)} y2={ys(v)} stroke="rgba(255,255,255,0.05)" strokeWidth={1} />
          <text x={P.l - 3} y={ys(v) + 4} fill={OE.gray4} fontSize={8} textAnchor="end">{Math.round(v * 100)}%</text>
        </g>
      ))}
      <line x1={P.l} x2={width - P.r} y1={ys(ATP)} y2={ys(ATP)} stroke="rgba(242,237,230,0.18)" strokeWidth={1} strokeDasharray="4,3" />
      <text x={width - P.r + 2} y={ys(ATP) + 3} fill="rgba(242,237,230,0.3)" fontSize={7}>ATP</text>
      <path d={area} fill={color} opacity={0.07} />
      <path d={path} fill="none" stroke={color} strokeWidth={1.5} />
      {pts.map((p, i) => (
        <circle key={i} cx={xs(p.x)} cy={ys(p.y)} r={2}
          fill={p.y >= ATP ? '#4ade80' : '#f87171'} opacity={0.7} />
      ))}
    </svg>
  );
}

function ServeCourtDiagram({ log, p }) {
  // Draw a mini court (top-down) showing serve landing zones with color = win/lose
  // Court dimensions: width=10.97m, half-length=11.885m
  // Service box: x -4.115..4.115, y 0..6.4 (para o server do lado -y)
  if (!log || log.length < 2) return null;
  const CW = 200, CH = 120; // canvas size for service boxes
  // Only show serve logs that bounced (kmh present)
  const pts = log.filter(l => l.kmh);
  if (!pts.length) return null;

  // Map court coords to canvas
  // Court x: -4.115..4.115 → 0..CW
  // Show only service box y: 0..6.4 (normalize)
  const cx = x => (x + 4.115) / 8.23 * CW;
  const cy = y => (1 - Math.abs(y) / 6.4) * CH;

  // Direction labels
  const dirColors = { T: '#7ab4ff', BODY: '#fbbf24', WIDE: '#f87171' };

  return (
    <div>
      <div style={{ fontSize: 9, color: OE.gray4, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 6 }}>
        PONTOS DE QUIQUE DO SAQUE — ● ganhou  ○ perdeu
      </div>
      <svg width={CW} height={CH + 16} style={{ overflow: 'visible' }}>
        {/* Service box outline */}
        <rect x={0} y={0} width={CW} height={CH} fill="rgba(255,255,255,0.02)" stroke="rgba(255,255,255,0.12)" strokeWidth={1} />
        {/* Center line */}
        <line x1={CW / 2} y1={0} x2={CW / 2} y2={CH} stroke="rgba(255,255,255,0.08)" strokeWidth={1} />
        {/* Net (bottom) */}
        <line x1={0} y1={CH} x2={CW} y2={CH} stroke="rgba(255,255,255,0.25)" strokeWidth={2} />
        <text x={CW / 2} y={CH + 12} fill={OE.gray4} fontSize={8} textAnchor="middle">REDE</text>
        {/* Labels T / WIDE */}
        <text x={6} y={12} fill="#7ab4ff" fontSize={8}>T</text>
        <text x={6} y={CH - 4} fill="#7ab4ff" fontSize={8}>T</text>
        <text x={CW - 20} y={12} fill="#f87171" fontSize={8}>WIDE</text>
        <text x={CW - 20} y={CH - 4} fill="#f87171" fontSize={8}>WIDE</text>
        {pts.map((l, i) => {
          // Estimate bounce position from direction
          // Since we don't have exact bounce x/y from serveLog (only kmh/dir),
          // we use dir to estimate x range and isFirst for depth
          const dirX = l.dir === 'T' ? (Math.random() * 0.8 + 0.5) * (Math.random() > 0.5 ? 1 : -1)
                     : l.dir === 'WIDE' ? (Math.random() * 0.8 + 3.0) * (Math.random() > 0.5 ? 1 : -1)
                     : (Math.random() * 1.2) * (Math.random() > 0.5 ? 1 : -1); // BODY
          const depY = l.isFirst ? (Math.random() * 2 + 4.0) : (Math.random() * 2.5 + 3.0);
          const px = cx(dirX), py = cy(depY);
          const clr = dirColors[l.dir] || OE.cream;
          return l.won
            ? <circle key={i} cx={px} cy={py} r={3} fill={clr} opacity={0.7} />
            : <circle key={i} cx={px} cy={py} r={3} fill="none" stroke={clr} strokeWidth={1} opacity={0.5} />;
        })}
      </svg>
    </div>
  );
}

function PlayerServeCard({ p }) {
  const s = p?.stats;
  if (!s) return null;
  const log = s.serveLog || [];
  const log1 = log.filter(l => l.isFirst !== false);
  const log2 = log.filter(l => l.isFirst === false);
  const fmtPct = (a, b) => b > 0 ? `${Math.round(a / b * 100)}%` : '—';
  const avgKmh = arr => arr.length ? Math.round(arr.reduce((a, l) => a + (l.kmh || 0), 0) / arr.length) : null;

  const t1 = s.serve1WonPoints + s.serve1LostPoints;
  const t2 = s.serve2WonPoints + s.serve2LostPoints;

  // Serve win% by direction for chart
  const dirData = ['T', 'BODY', 'WIDE'].map(dir => {
    const pts = log.filter(l => l.dir === dir);
    const won = pts.filter(l => l.won).length;
    return { label: dir, value: pts.length, won: pts.length > 0 ? won / pts.length : null };
  });

  // Serve win% by type
  const typeData = ['FLAT', 'SLICE', 'KICK'].map(type => {
    const pts = log.filter(l => l.physType === type);
    const won = pts.filter(l => l.won).length;
    return { label: type, value: pts.length, won: pts.length > 0 ? won / pts.length : null };
  });

  const holdPct = s.gamesServed > 0 ? `${Math.round(s.gamesHeld / s.gamesServed * 100)}%` : '—';
  const breakPct = s.gamesReturned > 0 ? `${Math.round(s.gamesConverted / s.gamesReturned * 100)}%` : '—';
  const avg1 = avgKmh(log1), avg2 = avgKmh(log2);

  return (
    <div style={{ flex: 1, padding: '20px 24px', borderRight: '1px solid rgba(255,255,255,0.05)' }}>
      {/* Player header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18, paddingBottom: 12, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ width: 4, height: 32, background: p.color, flexShrink: 0 }} />
        <div>
          <div style={{ fontFamily: OE.fontDisplay, fontSize: 20, fontWeight: 600, color: OE.cream, letterSpacing: 1 }}>{p.name}</div>
          <div style={{ fontFamily: OE.fontBody, fontSize: 9, color: OE.gray4, letterSpacing: 2 }}>{p.styleData?.abbr}</div>
        </div>
      </div>

      {/* Key stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 18 }}>
        {[
          ['HOLD RATE', holdPct, `${s.gamesHeld ?? 0}/${s.gamesServed ?? 0}`, holdPct !== '—' && parseInt(holdPct) >= 78 ? '#4ade80' : parseInt(holdPct) < 65 ? '#f87171' : '#fbbf24'],
          ['BREAK RATE', breakPct, `${s.gamesConverted ?? 0}/${s.gamesReturned ?? 0}`, breakPct !== '—' && parseInt(breakPct) >= 25 ? '#4ade80' : parseInt(breakPct) < 15 ? '#f87171' : '#fbbf24'],
          ['WIN% 1º SAQ.', fmtPct(s.serve1WonPoints, t1), `ATP ref: ~71%`, parseInt(fmtPct(s.serve1WonPoints,t1)) >= 68 ? '#4ade80' : parseInt(fmtPct(s.serve1WonPoints,t1)) < 55 ? '#f87171' : '#fbbf24'],
          ['WIN% 2º SAQ.', fmtPct(s.serve2WonPoints, t2), `ATP ref: ~50%`, parseInt(fmtPct(s.serve2WonPoints,t2)) >= 50 ? '#4ade80' : parseInt(fmtPct(s.serve2WonPoints,t2)) < 42 ? '#f87171' : '#fbbf24'],
          ['VEL. 1º SAQUE', avg1 ? `${avg1}km/h` : '—', 'ATP: 185-210', avg1 >= 180 ? '#4ade80' : avg1 < 155 ? '#f87171' : '#fbbf24'],
          ['VEL. 2º SAQUE', avg2 ? `${avg2}km/h` : '—', 'ATP: 145-165', avg2 >= 145 ? '#4ade80' : avg2 < 120 ? '#f87171' : '#fbbf24'],
        ].map(([lbl, val, note, clr]) => (
          <div key={lbl} style={{ background: 'rgba(255,255,255,0.02)', padding: '10px 12px', borderLeft: `2px solid ${clr || OE.gray4}` }}>
            <div style={{ fontFamily: OE.fontBody, fontSize: 8, color: OE.gray4, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 4 }}>{lbl}</div>
            <div style={{ fontFamily: OE.fontDisplay, fontSize: 20, fontWeight: 700, color: clr || OE.cream, lineHeight: 1 }}>{val}</div>
            <div style={{ fontFamily: OE.fontBody, fontSize: 8, color: '#333', marginTop: 3 }}>{note}</div>
          </div>
        ))}
      </div>

      {/* Win% por direção — bar chart */}
      {dirData.some(d => d.value > 0) && (
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontFamily: OE.fontBody, fontSize: 9, color: OE.gray4, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>WIN% POR DIREÇÃO</div>
          {dirData.filter(d => d.value > 0).map(d => {
            const pctVal = d.won != null ? Math.round(d.won * 100) : null;
            const clr = pctVal >= 63 ? '#4ade80' : pctVal >= 50 ? OE.cream : '#f87171';
            return (
              <div key={d.label} style={{ marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                  <span style={{ fontFamily: OE.fontBody, fontSize: 10, color: OE.gray4, letterSpacing: 2 }}>{d.label}</span>
                  <span style={{ fontFamily: OE.fontDisplay, fontSize: 13, fontWeight: 600, color: clr }}>
                    {pctVal != null ? `${pctVal}%` : '—'}  <span style={{ color: OE.gray4, fontWeight: 400, fontSize: 10 }}>({d.value} pts)</span>
                  </span>
                </div>
                <div style={{ height: 4, background: 'rgba(255,255,255,0.05)', position: 'relative' }}>
                  <div style={{ height: '100%', width: `${pctVal ?? 0}%`, background: clr, opacity: 0.7, transition: 'width 0.6s' }} />
                  <div style={{ position: 'absolute', left: '63%', top: 0, bottom: 0, width: 1, background: 'rgba(255,255,255,0.2)' }} />
                </div>
              </div>
            );
          })}
          <div style={{ fontFamily: OE.fontBody, fontSize: 8, color: '#2a2a2a', marginTop: 2 }}>linha = referência ATP 63%</div>
        </div>
      )}

      {/* Win% timeline */}
      {log.length >= 4 && (
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontFamily: OE.fontBody, fontSize: 9, color: OE.gray4, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>
            WIN% SAQUE — janela móvel (8 pts)
          </div>
          <ServeTimeline log={log} color={p.color} width={340} height={72} />
        </div>
      )}

      {/* Tipo de saque */}
      {typeData.some(d => d.value > 0) && (
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontFamily: OE.fontBody, fontSize: 9, color: OE.gray4, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>TIPO DE SAQUE</div>
          {typeData.filter(d => d.value > 0).map(d => {
            const pctVal = d.won != null ? Math.round(d.won * 100) : null;
            const pts = log.filter(l => l.physType === d.label);
            const spd = pts.length ? Math.round(pts.reduce((a, l) => a + (l.kmh || 0), 0) / pts.length) : null;
            const clr = pctVal >= 60 ? '#4ade80' : pctVal < 45 ? '#f87171' : '#fbbf24';
            return (
              <div key={d.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                <span style={{ fontFamily: OE.fontBody, fontSize: 10, color: OE.gray4, letterSpacing: 1 }}>{d.label}</span>
                <span style={{ fontFamily: OE.fontBody, fontSize: 10, color: '#333' }}>{spd ? `${spd} km/h` : ''}</span>
                <span style={{ fontFamily: OE.fontDisplay, fontSize: 14, fontWeight: 600, color: clr }}>
                  {pctVal != null ? `${pctVal}%` : '—'} <span style={{ color: OE.gray4, fontWeight: 400, fontSize: 10 }}>({d.value})</span>
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Mini court diagram */}
      <ServeCourtDiagram log={log} p={p} />
    </div>
  );
}

function ServeTab({ p0, p1 }) {
  const s0 = p0?.stats, s1 = p1?.stats;
  if (!s0 || !s1) return <div style={{ padding: 32, color: OE.gray4 }}>Sem dados de saque disponíveis.</div>;

  const fmtPct = (a, b) => b > 0 ? `${Math.round(a / b * 100)}%` : '—';
  const t01 = s0.serve1WonPoints + s0.serve1LostPoints;
  const t02 = s0.serve2WonPoints + s0.serve2LostPoints;
  const t11 = s1.serve1WonPoints + s1.serve1LostPoints;
  const t12 = s1.serve2WonPoints + s1.serve2LostPoints;

  return (
    <div style={{ fontFamily: OE.fontBody, color: OE.cream }}>
      {/* Comparative stats header */}
      <div style={{ padding: '16px 24px 8px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ fontFamily: OE.fontDisplay, fontSize: 11, letterSpacing: 4, color: OE.gray4, textTransform: 'uppercase', marginBottom: 4 }}>
          COMPARATIVO SAQUE & RETURN
        </div>
        <StatBar
          label="HOLD RATE" note="ATP ref: ~81%"
          valA={fmtPct(s0.gamesHeld, s0.gamesServed)}
          valB={fmtPct(s1.gamesHeld, s1.gamesServed)}
        />
        <StatBar
          label="WIN% 1º SAQUE" note="ATP ref: ~71%"
          valA={fmtPct(s0.serve1WonPoints, t01)}
          valB={fmtPct(s1.serve1WonPoints, t11)}
        />
        <StatBar
          label="WIN% 2º SAQUE" note="ATP ref: ~50%"
          valA={fmtPct(s0.serve2WonPoints, t02)}
          valB={fmtPct(s1.serve2WonPoints, t12)}
        />
        <StatBar
          label="BREAK RATE" note="ATP ref: ~19-23%"
          valA={fmtPct(s0.gamesConverted, s0.gamesReturned)}
          valB={fmtPct(s1.gamesConverted, s1.gamesReturned)}
        />
        <StatBar
          label="WIN% SACANDO"
          valA={fmtPct(s0.pointsWonServing, (s0.pointsWonServing ?? 0) + (s0.pointsLostServing ?? 0))}
          valB={fmtPct(s1.pointsWonServing, (s1.pointsWonServing ?? 0) + (s1.pointsLostServing ?? 0))}
        />
        <StatBar
          label="WIN% RECEBENDO"
          valA={fmtPct(s0.pointsWonReturning, (s0.pointsWonReturning ?? 0) + (s0.pointsLostReturning ?? 0))}
          valB={fmtPct(s1.pointsWonReturning, (s1.pointsWonReturning ?? 0) + (s1.pointsLostReturning ?? 0))}
        />
      </div>

      {/* Per-player detailed cards */}
      <div style={{ display: 'flex' }}>
        <PlayerServeCard p={p0} />
        <PlayerServeCard p={p1} />
      </div>
    </div>
  );
}
