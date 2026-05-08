// ============================================
// MODERN BRACKET - REDESIGN VISUAL 2025
// ============================================

import React, { useState, useEffect, useMemo } from 'react';
import './ModernBracket.css';
import PhaseProgressScreen from './PhaseProgressScreen.jsx';
import BattlePhysicsEngine from './BattlePhysicsEngine.js';
import { applyFormMultiplier } from './BattleEngine.js';
import { useTurbo } from './TurboContext.jsx';
import WarRoomOverlay from './WarRoomOverlay.jsx';
import { useWarRoomData } from './WarRoomDataCollector.jsx';
import { runHeadlessMD3 } from './HeadlessBattle.js';
import { TEAMS } from './data.js';
import { MENTALITIES } from './UniverseManager.js';
import { playerShortName } from './utils/playerName.js';

// ============================================
// STYLES
// ============================================
const BRACKET_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;600;700;900&family=Rajdhani:wght@400;500;600;700&display=swap');

  @keyframes mb-scan    { 0%{transform:translateY(-100%)} 100%{transform:translateY(100vh)} }
  @keyframes mb-pulse   { 0%,100%{opacity:.5;transform:scale(1)} 50%{opacity:1;transform:scale(1.05)} }
  @keyframes mb-glow    { 0%,100%{box-shadow:0 0 20px rgba(255,215,0,.2)} 50%{box-shadow:0 0 40px rgba(255,215,0,.5)} }
  @keyframes mb-shimmer { 0%{transform:translateX(-100%)} 100%{transform:translateX(100%)} }
  @keyframes mb-spin    { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
  @keyframes mb-entry   { 0%{opacity:0;transform:translateY(12px)} 100%{opacity:1;transform:translateY(0)} }
  @keyframes turboPulse {
    0%,100% { box-shadow: 0 0 0 1px #fbbf24, 0 0 20px rgba(251,191,36,.4); }
    50%     { box-shadow: 0 0 0 2px #fbbf24, 0 0 40px rgba(251,191,36,.8); }
  }
  @keyframes celebrationPop {
    0%  { transform:scale(.9); opacity:0; }
    50% { transform:scale(1.05); }
    100%{ transform:scale(1);   opacity:1; }
  }

  /* ---- VS screen animations ---- */
  @keyframes vs-flicker {
    0%,95%,100%{opacity:1}
    96%{opacity:.6}
    97%{opacity:1}
    98%{opacity:.7}
    99%{opacity:1}
  }
  @keyframes vs-scanline {
    0%  {transform:translateY(-100%)}
    100%{transform:translateY(100%)}
  }
  @keyframes vs-glow-left {
    0%,100%{box-shadow: -60px 0 120px rgba(var(--p1r),var(--p1g),var(--p1b),.18), inset 0 0 60px rgba(var(--p1r),var(--p1g),var(--p1b),.06)}
    50%    {box-shadow: -60px 0 180px rgba(var(--p1r),var(--p1g),var(--p1b),.28), inset 0 0 80px rgba(var(--p1r),var(--p1g),var(--p1b),.10)}
  }
  @keyframes vs-glow-right {
    0%,100%{box-shadow: 60px 0 120px rgba(var(--p2r),var(--p2g),var(--p2b),.18), inset 0 0 60px rgba(var(--p2r),var(--p2g),var(--p2b),.06)}
    50%    {box-shadow: 60px 0 180px rgba(var(--p2r),var(--p2g),var(--p2b),.28), inset 0 0 80px rgba(var(--p2r),var(--p2g),var(--p2b),.10)}
  }
  @keyframes vs-logo-pulse {
    0%,100%{transform:scale(1);    text-shadow:0 0 40px rgba(255,215,0,.6),0 0 80px rgba(255,100,0,.3)}
    50%    {transform:scale(1.04); text-shadow:0 0 60px rgba(255,215,0,.9),0 0 120px rgba(255,100,0,.5)}
  }
  @keyframes stat-bar-fill { from{width:0} to{width:var(--w)} }
  @keyframes h2h-pop { 0%{opacity:0;transform:scale(.8)} 100%{opacity:1;transform:scale(1)} }
  @keyframes slide-from-left  { from{opacity:0;transform:translateX(-30px)} to{opacity:1;transform:translateX(0)} }
  @keyframes slide-from-right { from{opacity:0;transform:translateX(30px)}  to{opacity:1;transform:translateX(0)} }
  @keyframes vs-entry { from{opacity:0;transform:scale(1.2)} to{opacity:1;transform:scale(1)} }

  .mb-root { font-family:'Rajdhani',sans-serif; }
  .mb-root::before {
    content:''; position:fixed; top:0; left:0; right:0; height:2px;
    background:linear-gradient(90deg,transparent,rgba(255,215,0,.12),transparent);
    animation:mb-scan 7s linear infinite; pointer-events:none; z-index:0;
  }

  /* TAB BAR */
  .mb-tab-bar {
    display:flex; border-bottom:1px solid rgba(255,255,255,.07);
    background:rgba(0,0,0,.45); backdrop-filter:blur(14px);
    padding:0 24px; gap:2px; position:sticky; top:0; z-index:50;
  }
  .mb-tab {
    font-family:'Orbitron',monospace; font-size:10px; font-weight:700; letter-spacing:.18em;
    padding:15px 24px; border:none; background:transparent;
    color:rgba(255,255,255,.3); cursor:pointer; position:relative;
    transition:color .15s ease; white-space:nowrap; text-transform:uppercase;
  }
  .mb-tab:hover { color:rgba(255,255,255,.65); }
  .mb-tab.active { color:#ffd700; }
  .mb-tab.active::after {
    content:''; position:absolute; bottom:0; left:0; right:0; height:2px;
    background:linear-gradient(90deg,transparent,#ffd700,transparent);
    box-shadow:0 0 8px rgba(255,215,0,.6);
  }

  /* MATCH CARD */
  .mb-match-card {
    background:rgba(255,255,255,.025);
    border:1px solid rgba(255,255,255,.07);
    clip-path:polygon(8px 0%,100% 0%,calc(100% - 8px) 100%,0% 100%);
    cursor:pointer; transition:all .18s ease;
    position:relative; overflow:hidden; margin-bottom:10px;
  }
  .mb-match-card:hover { border-color:rgba(255,215,0,.22); transform:translateY(-2px); background:rgba(255,255,255,.045); }
  .mb-match-card.completed  { border-color:rgba(34,197,94,.22); }
  .mb-match-card.is-current { border-color:rgba(251,191,36,.55); animation:turboPulse 2.5s ease-in-out infinite; }
  .mb-match-card.turbo-proc { border-color:#fbbf24; animation:turboPulse 1.2s ease-in-out infinite; }

  /* PLAYER ROW */
  .mb-player-row { display:flex; align-items:center; gap:10px; padding:10px 14px; transition:background .15s ease; }
  .mb-player-row.winner { background:rgba(34,197,94,.07); }
  .mb-player-row.loser  { opacity:.55; }

  .mb-rank-tag {
    font-family:'Orbitron',monospace; font-size:8px; font-weight:700; letter-spacing:.08em;
    padding:2px 7px; border:1px solid; flex-shrink:0;
    clip-path:polygon(4px 0%,100% 0%,calc(100% - 4px) 100%,0% 100%);
  }
  .mb-rank-tag.w { color:#4ade80; border-color:rgba(74,222,128,.4); background:rgba(74,222,128,.09); }
  .mb-rank-tag.n { color:#c084fc; border-color:rgba(192,132,252,.3); background:rgba(192,132,252,.06); }

  .mb-avatar {
    width:28px; height:28px; flex-shrink:0; overflow:hidden;
    clip-path:polygon(4px 0%,100% 0%,calc(100% - 4px) 100%,0% 100%);
    border:1px solid rgba(255,255,255,.12);
    display:flex; align-items:center; justify-content:center;
  }
  .mb-player-name { font-family:'Rajdhani',sans-serif; font-size:14px; font-weight:600; color:rgba(255,255,255,.8); flex:1; overflow:hidden; white-space:nowrap; text-overflow:ellipsis; }
  .mb-player-name.w { color:#fff; font-weight:700; }
  .mb-score { font-family:'Orbitron',monospace; font-size:16px; font-weight:900; min-width:18px; text-align:center; }
  .mb-score.w { color:#4ade80; }
  .mb-score.l { color:rgba(255,255,255,.25); }

  .mb-vs-divider { display:flex; align-items:center; gap:8px; padding:3px 14px; border-top:1px solid rgba(255,255,255,.04); border-bottom:1px solid rgba(255,255,255,.04); }
  .mb-vs-line { flex:1; height:1px; background:linear-gradient(90deg,transparent,rgba(255,255,255,.07),transparent); }
  .mb-vs-text { font-family:'Orbitron',monospace; font-size:8px; font-weight:700; letter-spacing:.2em; color:rgba(255,255,255,.2); }

  .mb-round-title { font-family:'Orbitron',monospace; font-size:9px; font-weight:700; letter-spacing:.22em; color:rgba(255,215,0,.65); text-align:center; padding:8px 0 12px; text-transform:uppercase; border-bottom:1px solid rgba(255,215,0,.1); margin-bottom:12px; }
  .mb-round-count { font-family:'Rajdhani',sans-serif; font-size:11px; font-weight:600; color:rgba(255,255,255,.28); display:block; margin-top:4px; letter-spacing:.1em; }

  .mb-sim-btn {
    font-family:'Orbitron',monospace; font-size:8px; font-weight:700; letter-spacing:.1em;
    padding:12px 8px; border:1px solid; cursor:pointer;
    clip-path:polygon(7px 0%,100% 0%,calc(100% - 7px) 100%,0% 100%);
    transition:all .18s ease; position:relative; overflow:hidden;
    display:flex; flex-direction:column; align-items:center; gap:5px; text-transform:uppercase; background:none;
  }
  .mb-sim-btn::before { content:''; position:absolute; inset:0; background:linear-gradient(90deg,transparent,rgba(255,255,255,.06),transparent); transform:translateX(-100%); transition:transform .4s ease; }
  .mb-sim-btn:hover:not(:disabled)::before { transform:translateX(100%); }
  .mb-sim-btn:hover:not(:disabled) { transform:translateY(-2px); }
  .mb-sim-btn:disabled { opacity:.35; cursor:not-allowed; }
  .mb-sim-btn.pur { background:rgba(139,92,246,.12); border-color:rgba(139,92,246,.45); color:#a78bfa; }
  .mb-sim-btn.blu { background:rgba(59,130,246,.12);  border-color:rgba(59,130,246,.45);  color:#93c5fd; }
  .mb-sim-btn.amb { background:rgba(245,158,11,.12);  border-color:rgba(245,158,11,.45);  color:#fcd34d; }
  .mb-sim-btn.red { background:rgba(239,68,68,.12);   border-color:rgba(239,68,68,.45);   color:#fca5a5; }
  .mb-sim-btn.pur:hover:not(:disabled) { border-color:rgba(139,92,246,.85); box-shadow:0 0 22px rgba(139,92,246,.3); }
  .mb-sim-btn.blu:hover:not(:disabled) { border-color:rgba(59,130,246,.85);  box-shadow:0 0 22px rgba(59,130,246,.3); }
  .mb-sim-btn.amb:hover:not(:disabled) { border-color:rgba(245,158,11,.85);  box-shadow:0 0 22px rgba(245,158,11,.3); }
  .mb-sim-btn.red:hover:not(:disabled) { border-color:rgba(239,68,68,.85);   box-shadow:0 0 22px rgba(239,68,68,.3); }

  .mb-pill { font-family:'Orbitron',monospace; font-size:7px; font-weight:700; letter-spacing:.15em; padding:3px 11px; border:1px solid; clip-path:polygon(4px 0%,100% 0%,calc(100% - 4px) 100%,0% 100%); display:inline-flex; align-items:center; gap:5px; text-transform:uppercase; }
  .mb-pill.done { color:#4ade80; border-color:rgba(74,222,128,.3); background:rgba(74,222,128,.06); }
  .mb-pill.proc { color:#fbbf24; border-color:rgba(251,191,36,.45); background:rgba(251,191,36,.07); }
  .mb-pill.next { color:#ffd700; border-color:rgba(255,215,0,.38);  background:rgba(255,215,0,.05); }

  .mb-next-card { background:rgba(255,215,0,.03); border:1px solid rgba(255,215,0,.25); clip-path:polygon(12px 0%,100% 0%,calc(100% - 12px) 100%,0% 100%); padding:22px 26px; animation:mb-glow 3.5s ease-in-out infinite; }
  .mb-play-btn { font-family:'Orbitron',monospace; font-size:11px; font-weight:700; letter-spacing:.18em; padding:15px 0; width:100%; background:linear-gradient(135deg,rgba(255,215,0,.16),rgba(255,100,0,.1)); border:1px solid rgba(255,215,0,.55); color:#ffd700; cursor:pointer; text-transform:uppercase; clip-path:polygon(8px 0%,100% 0%,calc(100% - 8px) 100%,0% 100%); transition:all .18s ease; position:relative; overflow:hidden; }
  .mb-play-btn::before { content:''; position:absolute; inset:0; background:linear-gradient(90deg,transparent,rgba(255,215,0,.1),transparent); transform:translateX(-100%); transition:transform .45s ease; }
  .mb-play-btn:hover { box-shadow:0 0 30px rgba(255,215,0,.3); border-color:rgba(255,215,0,.9); }
  .mb-play-btn:hover::before { transform:translateX(100%); }

  .mb-back-btn { font-family:'Rajdhani',sans-serif; font-weight:700; font-size:13px; letter-spacing:.12em; padding:8px 20px; border:1px solid rgba(255,255,255,.14); background:rgba(255,255,255,.04); color:rgba(255,255,255,.5); cursor:pointer; transition:all .15s ease; clip-path:polygon(6px 0%,100% 0%,calc(100% - 6px) 100%,0% 100%); }
  .mb-back-btn:hover { border-color:rgba(255,215,0,.5); color:#ffd700; background:rgba(255,215,0,.07); }
  .mb-tier-badge { font-family:'Orbitron',monospace; font-size:9px; font-weight:700; letter-spacing:.14em; padding:4px 14px; border:1px solid; clip-path:polygon(6px 0%,100% 0%,calc(100% - 6px) 100%,0% 100%); display:inline-flex; align-items:center; gap:8px; }
  .mb-progress-bar { height:3px; background:rgba(255,255,255,.06); overflow:hidden; }
  .mb-progress-fill { height:100%; background:linear-gradient(90deg,#8b5cf6,#c084fc); transition:width .15s ease; }
  .mb-empty { display:flex; flex-direction:column; align-items:center; justify-content:center; padding:100px 40px; gap:14px; }
  .mb-modal-overlay { position:fixed; inset:0; background:rgba(0,0,0,.88); z-index:9999; display:flex; align-items:center; justify-content:center; padding:16px; backdrop-filter:blur(12px); }
  .mb-modal { background:linear-gradient(135deg,#0d1117 0%,#111827 100%); border:1px solid rgba(255,215,0,.22); clip-path:polygon(14px 0%,100% 0%,calc(100% - 14px) 100%,0% 100%); padding:30px 28px; max-width:560px; width:100%; max-height:90vh; overflow-y:auto; box-shadow:0 0 60px rgba(0,0,0,.6); }

  /* ========== VERSUS SCREEN ========== */
  .vs-screen {
    position:relative; min-height:100vh; overflow:hidden;
    background:#080c14;
  }
  .vs-scanline {
    position:absolute; inset:0; pointer-events:none; z-index:2;
    background:repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,.08) 2px, rgba(0,0,0,.08) 4px);
  }
  .vs-scanline::after {
    content:''; position:absolute; top:0; left:0; right:0; height:60px;
    background:linear-gradient(180deg,rgba(255,255,255,.03),transparent);
    animation:vs-scanline 6s linear infinite;
  }

  /* Player panels */
  .vs-panel {
    position:relative; display:flex; flex-direction:column; flex:1;
    overflow:hidden; cursor:default;
  }
  .vs-panel-left  { animation:slide-from-left  .6s cubic-bezier(.22,1,.36,1) both; }
  .vs-panel-right { animation:slide-from-right .6s cubic-bezier(.22,1,.36,1) both; }

  /* Player image area */
  .vs-img-area {
    position:relative; height:380px; overflow:hidden;
    display:flex; align-items:flex-end; justify-content:center;
  }
  .vs-img-area::after {
    content:''; position:absolute; bottom:0; left:0; right:0; height:160px;
    background:linear-gradient(to top, #080c14, transparent);
    z-index:2; pointer-events:none;
  }
  .vs-player-img {
    height:360px; width:auto; object-fit:contain;
    position:relative; z-index:1; filter:drop-shadow(0 0 30px var(--pcolor));
    transition:transform .3s ease;
  }
  .vs-panel:hover .vs-player-img { transform:scale(1.03); }

  /* Name block */
  .vs-name-block { padding:0 28px 10px; position:relative; z-index:3; }

  /* VS center */
  .vs-center {
    display:flex; flex-direction:column; align-items:center; justify-content:center;
    min-width:130px; position:relative; z-index:5; flex-shrink:0;
    animation:vs-entry .5s .3s cubic-bezier(.22,1,.36,1) both;
  }
  .vs-logo {
    font-family:'Orbitron',monospace; font-weight:900; font-size:56px; line-height:1;
    color:#ffd700; letter-spacing:.05em;
    animation:vs-logo-pulse 2.5s ease-in-out infinite;
    animation:vs-flicker 8s linear infinite, vs-logo-pulse 2.5s ease-in-out infinite;
    text-shadow:0 0 40px rgba(255,215,0,.7), 0 0 80px rgba(255,100,0,.4);
  }
  .vs-round-label {
    font-family:'Orbitron',monospace; font-size:8px; font-weight:700; letter-spacing:.22em;
    color:rgba(255,215,0,.55); margin-top:10px; text-transform:uppercase; text-align:center;
  }
  .vs-divider { width:1px; background:linear-gradient(180deg,transparent,rgba(255,215,0,.3),transparent); height:200px; margin:12px 0; }

  /* Stats section */
  .vs-stats-grid { padding:10px 20px 28px; display:flex; flex-direction:column; gap:6px; position:relative; z-index:3; }
  .vs-stat-row { display:flex; flex-direction:column; gap:3px; }
  .vs-stat-label { font-family:'Orbitron',monospace; font-size:7px; font-weight:700; letter-spacing:.2em; color:rgba(255,255,255,.28); text-transform:uppercase; }
  .vs-stat-value { font-family:'Rajdhani',sans-serif; font-size:15px; font-weight:700; color:#fff; line-height:1.1; }
  .vs-stat-value.gold { color:#ffd700; }
  .vs-stat-value.cyan { color:#00d4ff; }
  .vs-stat-value.red  { color:#f87171; }
  .vs-stat-value.green{ color:#4ade80; }

  /* Attribute bar */
  .vs-attr-bar { height:4px; background:rgba(255,255,255,.07); position:relative; overflow:hidden; clip-path:polygon(2px 0%,100% 0%,calc(100% - 2px) 100%,0% 100%); }
  .vs-attr-fill { height:100%; position:absolute; top:0; transition:width .8s .2s cubic-bezier(.22,1,.36,1); }
  .vs-attr-fill.left  { left:0; }
  .vs-attr-fill.right { right:0; }

  /* Blade card */
  .vs-blade-card {
    background:rgba(255,255,255,.025); border:1px solid rgba(255,255,255,.06);
    clip-path:polygon(5px 0%,100% 0%,calc(100% - 5px) 100%,0% 100%);
    padding:8px 12px; margin-bottom:5px;
    transition:border-color .2s ease;
  }
  .vs-blade-card:hover { border-color:rgba(255,215,0,.2); }
  .vs-blade-card.signature { border-color:rgba(255,215,0,.3); background:rgba(255,215,0,.04); }

  /* H2H record */
  .vs-h2h {
    background:rgba(255,255,255,.02); border:1px solid rgba(255,255,255,.06);
    clip-path:polygon(8px 0%,100% 0%,calc(100% - 8px) 100%,0% 100%);
    padding:14px 18px; position:relative; z-index:10;
    animation:h2h-pop .5s .6s cubic-bezier(.22,1,.36,1) both;
  }

  /* Tournament milestone pills */
  .vs-milestone {
    display:flex; flex-direction:column; align-items:center; gap:4px;
    padding:10px 12px; background:rgba(255,255,255,.025);
    border:1px solid rgba(255,255,255,.07);
    clip-path:polygon(5px 0%,100% 0%,calc(100% - 5px) 100%,0% 100%);
    flex:1; min-width:0;
  }
  .vs-milestone-num { font-family:'Orbitron',monospace; font-weight:900; font-size:22px; line-height:1; }
  .vs-milestone-lbl { font-family:'Orbitron',monospace; font-size:6px; font-weight:700; letter-spacing:.15em; color:rgba(255,255,255,.3); text-align:center; text-transform:uppercase; }

  /* Form dot */
  .vs-form-dot { width:20px; height:20px; border-radius:2px; display:flex; align-items:center; justify-content:center; font-size:9px; font-weight:900; font-family:'Orbitron',monospace; }
  .vs-form-dot.W { background:rgba(74,222,128,.2); border:1px solid rgba(74,222,128,.5); color:#4ade80; }
  .vs-form-dot.L { background:rgba(248,113,113,.15); border:1px solid rgba(248,113,113,.4); color:#f87171; }
`;

// ============================================
// UTILITIES
// ============================================
const getBaseId = (id) => {
  if (!id) return '';
  return (typeof id === 'number' ? String(id) : id).replace(/_pos\d+$/, '');
};
const idsMatch = (a, b) => getBaseId(a) === getBaseId(b);

const ROUND_PT = { R64:'Rodada de 64', R32:'Rodada de 32', R16:'Oitavas', QF:'Quartas', SF:'Semis', F:'Final' };
const FINISH_ICONS = { BURST_FINISH:'💥', RING_OUT_FINISH:'🌀', KO_FINISH:'👊', SPIN_FINISH:'⚡' };
const FINISH_NAMES = { BURST_FINISH:'Burst Finish', RING_OUT_FINISH:'Ring Out', KO_FINISH:'KO Finish', SPIN_FINISH:'Spin Finish' };
const TIER_CFG = {
  GRAND_SLAM:  { label:'GRAND SLAM',   color:'#ffd700', border:'rgba(255,215,0,.5)', icon:'⭐' },
  MASTERS:     { label:'MASTERS 1000', color:'#c084fc', border:'rgba(192,132,252,.5)', icon:'🏆' },
  CHALLENGERS: { label:'CHALLENGERS',  color:'#60a5fa', border:'rgba(96,165,250,.5)', icon:'🥇' },
  PROSPECTS:   { label:'PROSPECTS',    color:'#34d399', border:'rgba(52,211,153,.5)', icon:'🥈' },
};

// Parse hex color to r,g,b
const hexToRgb = (hex) => {
  if (!hex) return '120,80,200';
  const c = hex.replace('#','');
  const r = parseInt(c.substring(0,2),16)||120;
  const g = parseInt(c.substring(2,4),16)||80;
  const b = parseInt(c.substring(4,6),16)||200;
  return `${r},${g},${b}`;
};

// ============================================
// VERSUS SCREEN COMPONENT
// ============================================
const VersusScreen = ({ match, universeManager, onPlay, roundKey, tournament }) => {
  const p1 = match?.player1;
  const p2 = match?.player2;

  if (!p1 || !p2) return (
    <div className="mb-empty">
      <div style={{fontSize:48,opacity:.2}}>⚔️</div>
      <div style={{fontFamily:"'Orbitron',monospace",fontSize:10,fontWeight:700,letterSpacing:'.22em',color:'rgba(255,255,255,.18)'}}>NENHUMA PARTIDA ATIVA</div>
      <div style={{fontFamily:"'Rajdhani',sans-serif",fontSize:13,color:'rgba(255,255,255,.15)',marginTop:4}}>Aguardando próxima fase...</div>
    </div>
  );

  // Resolve team data from TEAMS array
  const getTeamData = (player) => {
    const pid = typeof player.id === 'number' ? player.id : parseInt(player.id);
    return TEAMS[pid] || TEAMS.find(t => t.name === player.name) || {};
  };

  // Get player career stats
  const getCareerStats = (player) => {
    const pid = player.id;
    const history = universeManager.playerHistories?.get(
      typeof pid === 'number' ? pid : parseInt(pid)
    ) || {};

    const tournHistory = history.tournamentHistory || [];

    // Count appearances by round
    const qfCount  = tournHistory.filter(t => ['QF','SF','F','CHAMPION'].includes(t.eliminatedRound)).length;
    const sfCount  = tournHistory.filter(t => ['SF','F','CHAMPION'].includes(t.eliminatedRound)).length;
    const finCount = tournHistory.filter(t => ['F','CHAMPION'].includes(t.eliminatedRound)).length;
    const titles   = (history.titles?.total) || 0;
    const gsCount  = history.titles?.grandSlams || 0;

    // Best ranking from ranking history
    const rankArr = universeManager.getBBPRanking ? universeManager.getBBPRanking() : [];
    const currentRankObj = rankArr.find(r => r.playerId == pid);
    const currentRank = currentRankObj?.rank || 0;

    // Recent form from matchHistory
    const matchHist = universeManager.matchHistory || [];
    const playerMatches = matchHist.filter(m =>
      m.player1?.id == pid || m.player2?.id == pid
    ).slice(-5);
    const recentForm = playerMatches.map(m => m.winner?.id == pid ? 'W' : 'L');

    return {
      wins: history.wins || 0,
      losses: history.losses || 0,
      winsByBurst: history.winsByBurst || 0,
      winsByRingOut: history.winsByRingOut || 0,
      winsBySpin: history.winsBySpin || 0,
      qfCount, sfCount, finCount, titles, gsCount,
      currentRank, recentForm,
      totalMatches: history.totalMatches || 0,
    };
  };

  // Head to head
  const getH2H = (p1id, p2id) => {
    const matchHist = universeManager.matchHistory || [];

    // Normaliza para string para comparação segura (int vs string)
    const id1 = String(p1id);
    const id2 = String(p2id);

    // Nomes dos jogadores (fallback para saves antigos que só têm strings)
    const name1 = TEAMS[p1id]?.name || '';
    const name2 = TEAMS[p2id]?.name || '';

    const clashes = matchHist.filter(m => {
      // Prefere IDs explícitos (novos saves)
      if (m.player1Id !== undefined && m.player2Id !== undefined) {
        const a = String(m.player1Id), b = String(m.player2Id);
        return (a === id1 && b === id2) || (a === id2 && b === id1);
      }
      // Fallback: compara por nome (saves antigos)
      const a = m.player1, b = m.player2;
      return (a === name1 && b === name2) || (a === name2 && b === name1);
    });

    let p1wins = 0, p2wins = 0, draws = 0;
    let p1RoundWins = 0, p2RoundWins = 0;
    let p1Bursts = 0, p2Bursts = 0, p1RingOuts = 0, p2RingOuts = 0;
    let lastWinner = null;

    clashes.forEach(m => {
      // Determina vencedor via ID ou nome
      const wonByP1 = m.winnerId !== undefined
        ? String(m.winnerId) === id1
        : m.winner === name1;
      const wonByP2 = m.winnerId !== undefined
        ? String(m.winnerId) === id2
        : m.winner === name2;

      if (wonByP1)      { p1wins++; lastWinner = 'p1'; }
      else if (wonByP2) { p2wins++; lastWinner = 'p2'; }
      else              draws++;

      // Rounds individuais
      if (m.score) {
        const isP1PlayerA = m.winnerId !== undefined
          ? String(m.player1Id) === id1
          : m.player1 === name1;
        p1RoundWins += isP1PlayerA ? (m.score.playerA || 0) : (m.score.playerB || 0);
        p2RoundWins += isP1PlayerA ? (m.score.playerB || 0) : (m.score.playerA || 0);
      }

      // Finishes por round
      if (m.rounds && Array.isArray(m.rounds)) {
        m.rounds.forEach(r => {
          if (!r || r.winner === 'DRAW') return;
          const method = (r.method || '').toUpperCase();
          const rWonByP1 = m.winnerId !== undefined
            ? String(r.winner) === id1
            : r.winner === name1 || String(r.winner) === id1;
          if (method.includes('BURST'))            { rWonByP1 ? p1Bursts++ : p2Bursts++; }
          if (method.includes('RING') || method.includes('KO')) { rWonByP1 ? p1RingOuts++ : p2RingOuts++; }
        });
      }
    });

    const totalRounds = p1RoundWins + p2RoundWins;
    return {
      p1wins, p2wins, draws,
      total: clashes.length,
      p1RoundWins, p2RoundWins, totalRounds,
      p1Bursts, p2Bursts, p1RingOuts, p2RingOuts,
      lastWinner,
      clashes
    };
  };

  // Get blades (deck)
  const getBlades = (player) => {
    const pid = typeof player.id === 'number' ? player.id : parseInt(player.id);
    const sigBlade = universeManager.signatureBlades?.get(pid)?.blade;
    const seasonBlades = universeManager.seasonBlades?.get(pid) || [];
    const deck = player.deck || [];
    return { sigBlade, seasonBlades, deck };
  };

  const t1 = getTeamData(p1);
  const t2 = getTeamData(p2);
  const s1 = getCareerStats(p1);
  const s2 = getCareerStats(p2);
  const h2h = getH2H(p1.id, p2.id);
  const b1 = getBlades(p1);
  const b2 = getBlades(p2);

  // Colors
  const c1 = t1.colors?.[0] || '#8b5cf6';
  const c2 = t2.colors?.[0] || '#ef4444';
  const rgb1 = hexToRgb(c1);
  const rgb2 = hexToRgb(c2);

  // Mentality info
  const getMentalityInfo = (mentality) => {
    try { return MENTALITIES[mentality] || { name: mentality, icon:'⚡', color:'#888' }; }
    catch { return { name: mentality || '—', icon:'⚡', color:'#888' }; }
  };
  const ment1 = getMentalityInfo(t1.mentality);
  const ment2 = getMentalityInfo(t2.mentality);

  // Attributes normalized to %
  const attrs = ['attack','defense','stamina','speed','technique'];
  const getAttr = (team, key) => ((team.attributes?.[key] || 5) / 20) * 100;

  // Winrate
  const wr1 = s1.totalMatches > 0 ? Math.round((s1.wins / s1.totalMatches) * 100) : 0;
  const wr2 = s2.totalMatches > 0 ? Math.round((s2.wins / s2.totalMatches) * 100) : 0;

  const roundName = ROUND_PT[roundKey] || roundKey || '—';

  // Render one side stats panel
  const renderStatsPanel = (player, team, stats, blades, isLeft) => {
    const ment = getMentalityInfo(team.mentality);
    const color = isLeft ? c1 : c2;
    const winrate = isLeft ? wr1 : wr2;
    const attr = (key) => getAttr(team, key);
    const milestonesRow = [
      { num: stats.qfCount,  lbl:'Quartas', col:'#60a5fa' },
      { num: stats.sfCount,  lbl:'Semis',   col:'#c084fc' },
      { num: stats.finCount, lbl:'Finais',  col:'#fbbf24' },
      { num: stats.titles,   lbl:'Títulos', col:'#ffd700' },
    ];

    return (
      <div style={{ display:'flex', flexDirection:'column', gap:12 }}>

        {/* ── MILESTONES ── */}
        <div>
          <div style={{fontFamily:"'Orbitron',monospace",fontSize:7,fontWeight:700,letterSpacing:'.2em',color:'rgba(255,255,255,.28)',marginBottom:8}}>TRAJETÓRIA</div>
          <div style={{display:'flex',gap:5}}>
            {milestonesRow.map(m => (
              <div key={m.lbl} className="vs-milestone">
                <span className="vs-milestone-num" style={{color:m.col}}>{m.num}</span>
                <span className="vs-milestone-lbl">{m.lbl}</span>
              </div>
            ))}
          </div>
          {stats.gsCount > 0 && (
            <div style={{marginTop:5,fontFamily:"'Orbitron',monospace",fontSize:7,fontWeight:700,color:'#ffd700',letterSpacing:'.15em'}}>
              ⭐ {stats.gsCount} GRAND SLAM{stats.gsCount>1?'S':''}
            </div>
          )}
        </div>

        {/* ── RANK + RECORD ── */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
          <div className="vs-stat-row">
            <span className="vs-stat-label">RANKING ATUAL</span>
            <span className="vs-stat-value gold">#{stats.currentRank || '—'}</span>
          </div>
          <div className="vs-stat-row">
            <span className="vs-stat-label">WINRATE</span>
            <span className="vs-stat-value" style={{color:winrate>=60?'#4ade80':winrate>=40?'#fcd34d':'#f87171'}}>{winrate}%</span>
          </div>
          <div className="vs-stat-row">
            <span className="vs-stat-label">VITÓRIAS / DERROTAS</span>
            <span className="vs-stat-value"><span style={{color:'#4ade80'}}>{stats.wins}</span><span style={{color:'rgba(255,255,255,.3)'}}> / </span><span style={{color:'#f87171'}}>{stats.losses}</span></span>
          </div>
          <div className="vs-stat-row">
            <span className="vs-stat-label">FORMA ATUAL</span>
            <div style={{display:'flex',gap:3,marginTop:2}}>
              {stats.recentForm.length > 0
                ? stats.recentForm.slice(-5).map((r,i) => <div key={i} className={`vs-form-dot ${r}`}>{r}</div>)
                : <span style={{fontFamily:"'Rajdhani',sans-serif",color:'rgba(255,255,255,.3)',fontSize:12}}>Sem dados</span>
              }
            </div>
          </div>
        </div>

        {/* ── FINISH TYPES ── */}
        <div>
          <div style={{fontFamily:"'Orbitron',monospace",fontSize:7,fontWeight:700,letterSpacing:'.2em',color:'rgba(255,255,255,.28)',marginBottom:8}}>FINALIZAÇÕES</div>
          <div style={{display:'flex',gap:5}}>
            {[
              {icon:'💥',lbl:'Burst',val:stats.winsByBurst},
              {icon:'🌀',lbl:'Ring Out',val:stats.winsByRingOut},
              {icon:'⚡',lbl:'Spin',val:stats.winsBySpin},
            ].map(f => (
              <div key={f.lbl} style={{flex:1,padding:'7px 8px',background:'rgba(255,255,255,.02)',border:'1px solid rgba(255,255,255,.06)',textAlign:'center'}}>
                <div style={{fontSize:14}}>{f.icon}</div>
                <div style={{fontFamily:"'Orbitron',monospace",fontWeight:900,fontSize:14,color:'#fff',marginTop:2}}>{f.val}</div>
                <div style={{fontFamily:"'Orbitron',monospace",fontSize:6,fontWeight:700,letterSpacing:'.1em',color:'rgba(255,255,255,.3)',marginTop:2}}>{f.lbl}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── ATTRIBUTES ── */}
        <div>
          <div style={{fontFamily:"'Orbitron',monospace",fontSize:7,fontWeight:700,letterSpacing:'.2em',color:'rgba(255,255,255,.28)',marginBottom:8}}>ATRIBUTOS</div>
          {attrs.map(a => (
            <div key={a} style={{marginBottom:6}}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:2}}>
                <span style={{fontFamily:"'Rajdhani',sans-serif",fontSize:11,fontWeight:600,color:'rgba(255,255,255,.45)',textTransform:'capitalize'}}>{a}</span>
                <span style={{fontFamily:"'Orbitron',monospace",fontSize:10,fontWeight:700,color}}>{team.attributes?.[a]||0}</span>
              </div>
              <div className="vs-attr-bar">
                <div className={`vs-attr-fill ${isLeft?'left':'right'}`}
                  style={{width:`${attr(a)}%`,background:`linear-gradient(90deg,${color}cc,${color})`}}/>
              </div>
            </div>
          ))}
        </div>

        {/* ── STYLE ── */}
        <div style={{padding:'10px 12px',background:`rgba(${isLeft?rgb1:rgb2},.06)`,border:`1px solid rgba(${isLeft?rgb1:rgb2},.2)`}}>
          <div style={{fontFamily:"'Orbitron',monospace",fontSize:7,fontWeight:700,letterSpacing:'.2em',color:'rgba(255,255,255,.28)',marginBottom:6}}>ESTILO DE JOGO</div>
          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
            <span style={{fontSize:18}}>{ment.icon}</span>
            <span style={{fontFamily:"'Orbitron',monospace",fontSize:10,fontWeight:700,color:ment.color||color}}>{ment.name}</span>
          </div>
          <div style={{fontFamily:"'Rajdhani',sans-serif",fontSize:12,color:'rgba(255,255,255,.5)',lineHeight:1.4}}>
            {team.playStyle || ment.description || '—'}
          </div>
          {team.country && <div style={{marginTop:6,fontFamily:"'Rajdhani',sans-serif",fontSize:12,color:'rgba(255,255,255,.4)'}}>{team.country}</div>}
        </div>

        {/* ── DECK ── */}
        <div>
          <div style={{fontFamily:"'Orbitron',monospace",fontSize:7,fontWeight:700,letterSpacing:'.2em',color:'rgba(255,255,255,.28)',marginBottom:8}}>DECK DO TORNEIO</div>
          {blades.sigBlade && (
            <div className="vs-blade-card signature">
              <div style={{display:'flex',alignItems:'center',gap:8}}>
                <span style={{fontFamily:"'Orbitron',monospace",fontSize:7,fontWeight:700,color:'#ffd700',letterSpacing:'.1em',padding:'1px 6px',border:'1px solid rgba(255,215,0,.3)',background:'rgba(255,215,0,.07)'}}>⭐ SIG</span>
                <div style={{flex:1}}>
                  <div style={{fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:13,color:'#ffd700'}}>{blades.sigBlade.signatureName || blades.sigBlade.name || 'Signature Blade'}</div>
                  <div style={{fontFamily:"'Orbitron',monospace",fontSize:7,color:'rgba(255,255,255,.35)',letterSpacing:'.1em'}}>{blades.sigBlade.type || '—'} • ATK {blades.sigBlade.atk||blades.sigBlade.layer?.atk||'—'} DEF {blades.sigBlade.def||blades.sigBlade.layer?.def||'—'}</div>
                </div>
              </div>
            </div>
          )}
          {(blades.deck.length > 0 ? blades.deck.slice(0,4) : blades.seasonBlades.slice(0,4)).map((blade, i) => {
            if (!blade) return null;
            const isThisSig = blade.isSignature || blade.signatureName;
            if (isThisSig && blades.sigBlade) return null; // already shown
            return (
              <div key={i} className="vs-blade-card">
                <div style={{display:'flex',alignItems:'center',gap:8}}>
                  <span style={{fontFamily:"'Orbitron',monospace",fontSize:7,fontWeight:700,color:color,letterSpacing:'.1em',padding:'1px 6px',border:`1px solid ${color}44`,background:`${color}11`}}>
                    #{i+1}
                  </span>
                  <div style={{flex:1}}>
                    <div style={{fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:13,color:'rgba(255,255,255,.85)'}}>{blade.signatureName || blade.name || `Blade ${i+1}`}</div>
                    <div style={{fontFamily:"'Orbitron',monospace",fontSize:7,color:'rgba(255,255,255,.3)',letterSpacing:'.1em'}}>{blade.type||'—'} • ATK {blade.atk||blade.layer?.atk||'—'} DEF {blade.def||blade.layer?.def||'—'}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="vs-screen" style={{animation:'mb-entry .3s ease-out'}}>
      <style>{`
        .vs-screen { --p1r:${rgb1.split(',')[0]}; --p1g:${rgb1.split(',')[1]}; --p1b:${rgb1.split(',')[2]}; --p2r:${rgb2.split(',')[0]}; --p2g:${rgb2.split(',')[1]}; --p2b:${rgb2.split(',')[2]}; }
        .vs-panel-left  { --pcolor: ${c1}; }
        .vs-panel-right { --pcolor: ${c2}; }
      `}</style>
      <div className="vs-scanline"/>

      {/* ── HERO SECTION: PLAYERS + VS ─────────────────────────── */}
      <div style={{
        display:'flex', alignItems:'stretch', position:'relative',
        background:`linear-gradient(135deg, rgba(${rgb1},.08) 0%, #080c14 50%, rgba(${rgb2},.08) 100%)`,
        borderBottom:'1px solid rgba(255,255,255,.06)',
      }}>
        {/* Ambient glow panels */}
        <div style={{position:'absolute',top:0,left:0,width:'50%',height:'100%',background:`radial-gradient(ellipse at left center, rgba(${rgb1},.12) 0%, transparent 70%)`,pointerEvents:'none'}}/>
        <div style={{position:'absolute',top:0,right:0,width:'50%',height:'100%',background:`radial-gradient(ellipse at right center, rgba(${rgb2},.12) 0%, transparent 70%)`,pointerEvents:'none'}}/>

        {/* Player 1 */}
        <div className="vs-panel vs-panel-left" style={{flex:1,borderRight:'1px solid rgba(255,255,255,.04)'}}>
          <div className="vs-img-area">
            <div style={{position:'absolute',inset:0,background:`radial-gradient(ellipse at center bottom, rgba(${rgb1},.2) 0%, transparent 65%)`,zIndex:1}}/>
            {t1.fullBodyUrl || t1.photoUrl
              ? <img src={t1.fullBodyUrl||t1.photoUrl} alt={p1.name} className="vs-player-img" style={{filter:`drop-shadow(0 0 40px ${c1}88)`}}/>
              : <div style={{width:140,height:300,background:`linear-gradient(135deg,${c1}33,${c1}11)`,border:`2px solid ${c1}44`,display:'flex',alignItems:'center',justifyContent:'center',position:'relative',zIndex:1}}>
                  <span style={{fontFamily:"'Orbitron',monospace",fontWeight:900,fontSize:60,color:`${c1}88`}}>{p1.name?.charAt(0)}</span>
                </div>
            }
          </div>
          <div className="vs-name-block">
            <div style={{fontFamily:"'Orbitron',monospace",fontSize:7,fontWeight:700,letterSpacing:'.22em',color:`rgba(${rgb1},.7)`,marginBottom:4}}>PLAYER 1</div>
            <h2 style={{fontFamily:"'Orbitron',monospace",fontWeight:900,fontSize:'clamp(14px,1.8vw,22px)',color:'#fff',lineHeight:1.1,marginBottom:4}}>
              {p1.name}
            </h2>
            <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
              <span style={{fontFamily:"'Orbitron',monospace",fontSize:9,fontWeight:700,padding:'3px 10px',border:`1px solid ${c1}66`,color:c1,background:`${c1}11`}}>#{s1.currentRank}</span>
              <span style={{fontFamily:"'Orbitron',monospace",fontSize:7,fontWeight:700,letterSpacing:'.12em',color:'rgba(255,255,255,.35)'}}>{t1.tier||'PRO'}</span>
              {t1.country && <span style={{fontFamily:"'Rajdhani',sans-serif",fontSize:13,color:'rgba(255,255,255,.4)'}}>{t1.country}</span>}
            </div>
          </div>
        </div>

        {/* VS Center */}
        <div className="vs-center">
          <div className="vs-logo">VS</div>
          <div className="vs-divider"/>
          <div className="vs-round-label">{roundName}</div>
          {tournament && <div style={{fontFamily:"'Orbitron',monospace",fontSize:6,fontWeight:700,letterSpacing:'.15em',color:'rgba(255,215,0,.35)',marginTop:6,textAlign:'center',maxWidth:100,lineHeight:1.4}}>{tournament.name}</div>}
        </div>

        {/* Player 2 */}
        <div className="vs-panel vs-panel-right" style={{flex:1,borderLeft:'1px solid rgba(255,255,255,.04)'}}>
          <div className="vs-img-area" style={{justifyContent:'center'}}>
            <div style={{position:'absolute',inset:0,background:`radial-gradient(ellipse at center bottom, rgba(${rgb2},.2) 0%, transparent 65%)`,zIndex:1}}/>
            {t2.fullBodyUrl || t2.photoUrl
              ? <img src={t2.fullBodyUrl||t2.photoUrl} alt={p2.name} className="vs-player-img" style={{filter:`drop-shadow(0 0 40px ${c2}88)`,transform:'scaleX(-1)'}}/>
              : <div style={{width:140,height:300,background:`linear-gradient(135deg,${c2}33,${c2}11)`,border:`2px solid ${c2}44`,display:'flex',alignItems:'center',justifyContent:'center',position:'relative',zIndex:1}}>
                  <span style={{fontFamily:"'Orbitron',monospace",fontWeight:900,fontSize:60,color:`${c2}88`}}>{p2.name?.charAt(0)}</span>
                </div>
            }
          </div>
          <div className="vs-name-block" style={{textAlign:'right'}}>
            <div style={{fontFamily:"'Orbitron',monospace",fontSize:7,fontWeight:700,letterSpacing:'.22em',color:`rgba(${rgb2},.7)`,marginBottom:4}}>PLAYER 2</div>
            <h2 style={{fontFamily:"'Orbitron',monospace",fontWeight:900,fontSize:'clamp(14px,1.8vw,22px)',color:'#fff',lineHeight:1.1,marginBottom:4}}>
              {p2.name}
            </h2>
            <div style={{display:'flex',gap:8,alignItems:'center',justifyContent:'flex-end',flexWrap:'wrap'}}>
              {t2.country && <span style={{fontFamily:"'Rajdhani',sans-serif",fontSize:13,color:'rgba(255,255,255,.4)'}}>{t2.country}</span>}
              <span style={{fontFamily:"'Orbitron',monospace",fontSize:7,fontWeight:700,letterSpacing:'.12em',color:'rgba(255,255,255,.35)'}}>{t2.tier||'PRO'}</span>
              <span style={{fontFamily:"'Orbitron',monospace",fontSize:9,fontWeight:700,padding:'3px 10px',border:`1px solid ${c2}66`,color:c2,background:`${c2}11`}}>#{s2.currentRank}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── H2H BAR ─────────────────────────────────────────────── */}
      <div style={{padding:'16px 28px 20px',background:'rgba(0,0,0,.35)',borderBottom:'1px solid rgba(255,255,255,.05)'}}>
        <div className="vs-h2h">
          <div style={{fontFamily:"'Orbitron',monospace",fontSize:8,fontWeight:700,letterSpacing:'.22em',color:'rgba(255,215,0,.55)',textAlign:'center',marginBottom:14}}>
            HEAD TO HEAD · {h2h.total} CONFRONTO{h2h.total!==1?'S':''}
          </div>

          {/* Main W/L bar */}
          <div style={{display:'grid',gridTemplateColumns:'1fr auto 1fr',gap:16,alignItems:'center',marginBottom:h2h.total>0?14:0}}>
            {/* P1 wins */}
            <div style={{textAlign:'right'}}>
              <span style={{fontFamily:"'Orbitron',monospace",fontWeight:900,fontSize:36,color:c1,textShadow:`0 0 20px ${c1}66`}}>{h2h.p1wins}</span>
              <div style={{fontFamily:"'Orbitron',monospace",fontSize:7,letterSpacing:'.15em',color:'rgba(255,255,255,.3)'}}>VITÓRIAS</div>
            </div>
            {/* Bar */}
            <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:6,minWidth:200}}>
              <div style={{width:'100%',height:8,background:'rgba(255,255,255,.06)',position:'relative',overflow:'hidden',borderRadius:2}}>
                {h2h.total > 0 ? <>
                  <div style={{position:'absolute',top:0,left:0,height:'100%',width:`${(h2h.p1wins/h2h.total)*100}%`,background:c1,transition:'width .8s ease'}}/>
                  <div style={{position:'absolute',top:0,right:0,height:'100%',width:`${(h2h.p2wins/h2h.total)*100}%`,background:c2,transition:'width .8s ease'}}/>
                </> : <div style={{position:'absolute',inset:0,background:'rgba(255,255,255,.04)',display:'flex',alignItems:'center',justifyContent:'center'}}><span style={{fontFamily:"'Orbitron',monospace",fontSize:7,color:'rgba(255,255,255,.2)'}}>PRIMEIRO CONFRONTO</span></div>}
              </div>
              {h2h.total > 0 && (
                <div style={{fontFamily:"'Orbitron',monospace",fontSize:7,color:'rgba(255,255,255,.3)',letterSpacing:'.12em'}}>
                  {h2h.p1wins > h2h.p2wins ? `${playerShortName(p1)} DOMINA` : h2h.p2wins > h2h.p1wins ? `${playerShortName(p2)} DOMINA` : 'EMPATADOS'}
                </div>
              )}
            </div>
            {/* P2 wins */}
            <div>
              <span style={{fontFamily:"'Orbitron',monospace",fontWeight:900,fontSize:36,color:c2,textShadow:`0 0 20px ${c2}66`}}>{h2h.p2wins}</span>
              <div style={{fontFamily:"'Orbitron',monospace",fontSize:7,letterSpacing:'.15em',color:'rgba(255,255,255,.3)'}}>VITÓRIAS</div>
            </div>
          </div>

          {/* Extra stats: rounds + finishes */}
          {h2h.total > 0 && (
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8,marginTop:4}}>
              {/* Rounds */}
              <div style={{background:'rgba(255,255,255,.03)',border:'1px solid rgba(255,255,255,.07)',padding:'8px 12px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <div style={{fontFamily:"'Orbitron',monospace",fontSize:7,letterSpacing:'.1em',color:'rgba(255,215,0,.4)'}}>🔄 ROUNDS</div>
                <div style={{display:'flex',gap:8,alignItems:'center'}}>
                  <span style={{fontFamily:"'Orbitron',monospace",fontSize:13,fontWeight:900,color:c1}}>{h2h.p1RoundWins}</span>
                  <span style={{fontFamily:"'Orbitron',monospace",fontSize:9,color:'rgba(255,255,255,.2)'}}>—</span>
                  <span style={{fontFamily:"'Orbitron',monospace",fontSize:13,fontWeight:900,color:c2}}>{h2h.p2RoundWins}</span>
                </div>
              </div>
              {/* Bursts */}
              <div style={{background:'rgba(255,255,255,.03)',border:'1px solid rgba(255,255,255,.07)',padding:'8px 12px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <div style={{fontFamily:"'Orbitron',monospace",fontSize:7,letterSpacing:'.1em',color:'rgba(255,215,0,.4)'}}>💥 BURSTS</div>
                <div style={{display:'flex',gap:8,alignItems:'center'}}>
                  <span style={{fontFamily:"'Orbitron',monospace",fontSize:13,fontWeight:900,color:c1}}>{h2h.p1Bursts}</span>
                  <span style={{fontFamily:"'Orbitron',monospace",fontSize:9,color:'rgba(255,255,255,.2)'}}>—</span>
                  <span style={{fontFamily:"'Orbitron',monospace",fontSize:13,fontWeight:900,color:c2}}>{h2h.p2Bursts}</span>
                </div>
              </div>
              {/* Ring Outs */}
              <div style={{background:'rgba(255,255,255,.03)',border:'1px solid rgba(255,255,255,.07)',padding:'8px 12px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <div style={{fontFamily:"'Orbitron',monospace",fontSize:7,letterSpacing:'.1em',color:'rgba(255,215,0,.4)'}}>💨 RING OUTS</div>
                <div style={{display:'flex',gap:8,alignItems:'center'}}>
                  <span style={{fontFamily:"'Orbitron',monospace",fontSize:13,fontWeight:900,color:c1}}>{h2h.p1RingOuts}</span>
                  <span style={{fontFamily:"'Orbitron',monospace",fontSize:9,color:'rgba(255,255,255,.2)'}}>—</span>
                  <span style={{fontFamily:"'Orbitron',monospace",fontSize:13,fontWeight:900,color:c2}}>{h2h.p2RingOuts}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── STATS SECTION ────────────────────────────────────────── */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:0}}>
        {/* Player 1 stats */}
        <div style={{padding:'24px 28px',borderRight:'1px solid rgba(255,255,255,.05)'}}>
          <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:16,paddingBottom:10,borderBottom:`1px solid ${c1}33`}}>
            <div style={{width:3,height:16,background:c1,borderRadius:2}}/>
            <span style={{fontFamily:"'Orbitron',monospace",fontSize:9,fontWeight:700,letterSpacing:'.18em',color:c1}}>{playerShortName(p1).toUpperCase()}</span>
          </div>
          {renderStatsPanel(p1, t1, s1, b1, true)}
        </div>

        {/* Player 2 stats */}
        <div style={{padding:'24px 28px'}}>
          <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:16,paddingBottom:10,borderBottom:`1px solid ${c2}33`}}>
            <div style={{width:3,height:16,background:c2,borderRadius:2}}/>
            <span style={{fontFamily:"'Orbitron',monospace",fontSize:9,fontWeight:700,letterSpacing:'.18em',color:c2}}>{playerShortName(p2).toUpperCase()}</span>
          </div>
          {renderStatsPanel(p2, t2, s2, b2, false)}
        </div>
      </div>

      {/* ── PLAY BUTTON ────────────────────────────────────────── */}
      <div style={{padding:'24px 28px 40px',background:'linear-gradient(to top,rgba(0,0,0,.4),transparent)'}}>
        <div style={{maxWidth:500,margin:'0 auto'}}>
          <button className="mb-play-btn" onClick={onPlay} style={{fontSize:13,padding:'18px 0'}}>
            ⚔️ &nbsp; INICIAR BATALHA &nbsp; ⚔️
          </button>
          <div style={{textAlign:'center',marginTop:10,fontFamily:"'Orbitron',monospace",fontSize:7,fontWeight:700,letterSpacing:'.2em',color:'rgba(255,255,255,.2)'}}>
            {tournament?.matchFormat} · {roundName}
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================
// TOURNAMENT HISTORY TAB
// ============================================
const MEDAL_EMO = ['🥇','🥈','🥉'];

const TournamentHistoryTab = ({ tournament, viewingTournament, universeManager, tierInfo }) => {
  const [subTab, setSubTab] = useState('champions');

  // ── Determinar nome canônico do torneio ────────────────────────────────
  const tournamentName = tournament?.name || viewingTournament?.name || '';

  // ── Filtrar tournamentArchive por este torneio ─────────────────────────
  const allEditions = useMemo(() => {
    if (!universeManager?.tournamentArchive || !tournamentName) return [];
    const editions = [];
    universeManager.tournamentArchive.forEach((val) => {
      if (val.tournamentName === tournamentName) {
        editions.push(val);
      }
    });
    return editions.sort((a, b) => a.year !== b.year ? a.year - b.year : a.month - b.month);
  }, [universeManager, tournamentName]);

  // ── Sem histórico ──────────────────────────────────────────────────────
  if (allEditions.length === 0) return (
    <div style={{maxWidth:1600,margin:'0 auto',padding:'24px',animation:'mb-entry .3s ease-out'}}>
      <div className="mb-empty">
        <div style={{fontSize:48,opacity:.2}}>📜</div>
        <div style={{fontFamily:"'Orbitron',monospace",fontSize:10,fontWeight:700,letterSpacing:'.22em',color:'rgba(255,255,255,.18)'}}>SEM HISTÓRICO</div>
        <div style={{fontFamily:"'Rajdhani',sans-serif",fontSize:13,color:'rgba(255,255,255,.15)',marginTop:4}}>
          Este torneio ainda não tem edições concluídas.
        </div>
      </div>
    </div>
  );

  const accentColor = tierInfo?.color || '#ffd700';
  const accentBorder = tierInfo?.border || 'rgba(255,215,0,.35)';

  return (
    <div style={{maxWidth:1600,margin:'0 auto',padding:'20px 24px 56px',animation:'mb-entry .3s ease-out'}}>
      {/* Sub-tab bar */}
      <div style={{display:'flex',gap:4,marginBottom:24,borderBottom:`1px solid rgba(255,255,255,.07)`,paddingBottom:0}}>
        {[
          {key:'champions', label:'🏆 Campeões'},
          {key:'records',   label:'📊 Recordes'},
        ].map(({key,label}) => (
          <button key={key}
            onClick={() => setSubTab(key)}
            style={{
              background:'none',border:'none',cursor:'pointer',padding:'10px 20px',
              fontFamily:"'Orbitron',monospace",fontSize:9,fontWeight:700,letterSpacing:'.16em',
              color: subTab===key ? accentColor : 'rgba(255,255,255,.3)',
              borderBottom: subTab===key ? `2px solid ${accentColor}` : '2px solid transparent',
              marginBottom:'-1px',transition:'all .2s',
            }}>
            {label}
          </button>
        ))}
        <div style={{flex:1}}/>
        <div style={{alignSelf:'center',fontFamily:"'Rajdhani',sans-serif",fontSize:11,color:'rgba(255,255,255,.2)',paddingRight:4}}>
          {allEditions.length} {allEditions.length===1?'edição':'edições'}
        </div>
      </div>

      {/* ── SUB-TAB: CAMPEÕES ─────────────────────────────────────────── */}
      {subTab === 'champions' && (
        <ChampionsTimeline
          editions={allEditions}
          universeManager={universeManager}
          accentColor={accentColor}
          accentBorder={accentBorder}
        />
      )}

      {/* ── SUB-TAB: RECORDES ─────────────────────────────────────────── */}
      {subTab === 'records' && (
        <TournamentRecords
          editions={allEditions}
          tournamentName={tournamentName}
          universeManager={universeManager}
          accentColor={accentColor}
          accentBorder={accentBorder}
        />
      )}
    </div>
  );
};

// ─── Champions Timeline ───────────────────────────────────────────────────────
const ChampionsTimeline = ({ editions, universeManager, accentColor, accentBorder }) => {
  const getPlayerData = (name) => {
    if (!name) return null;
    const idx = TEAMS.findIndex(p => p.name === name);
    if (idx === -1) return null;
    return { ...TEAMS[idx], id: idx };
  };

  const getPlayerColors = (p) => {
    if (!p) return ['#888','#444'];
    return p.colors || ['#888','#444'];
  };

  // Contar títulos por campeão (nesta edição)
  const titleCounts = {};
  editions.forEach(ed => {
    const name = ed.championName || ed.champion?.name;
    if (name) titleCounts[name] = (titleCounts[name] || 0) + 1;
  });

  const mostTitles = Math.max(...Object.values(titleCounts), 0);

  return (
    <div>
      {/* Legend */}
      <div style={{display:'flex',alignItems:'center',gap:24,marginBottom:20,padding:'10px 16px',background:'rgba(255,255,255,.02)',border:'1px solid rgba(255,255,255,.05)'}}>
        <div style={{fontFamily:"'Orbitron',monospace",fontSize:8,fontWeight:700,letterSpacing:'.15em',color:accentColor}}>
          {Object.keys(titleCounts).length} campeões diferentes
        </div>
        <div style={{fontFamily:"'Rajdhani',sans-serif",fontSize:12,color:'rgba(255,255,255,.35)'}}>
          · Recorde: {mostTitles} título{mostTitles!==1?'s':''} ({Object.entries(titleCounts).filter(([,v])=>v===mostTitles).map(([k])=>k).join(', ')})
        </div>
      </div>

      {/* Grid de plates */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))',gap:12}}>
        {editions.map((ed, i) => {
          const champName = ed.championName || ed.champion?.name || '???';
          const runnerUpName = ed.runnerUp?.name || '—';
          const player = getPlayerData(champName);
          const colors = getPlayerColors(player);
          const isMostTitled = titleCounts[champName] === mostTitles && mostTitles > 1;
          const monthNames = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
          const monthLabel = ed.month ? monthNames[ed.month-1] : '';

          return (
            <div key={i} style={{
              position:'relative',overflow:'hidden',
              background:`linear-gradient(135deg, rgba(${colors[0].startsWith('#') ? hexToRgb(colors[0]) : colors[0]},.08) 0%, rgba(255,255,255,.02) 100%)`,
              border:`1px solid ${isMostTitled ? accentColor+'99' : 'rgba(255,255,255,.07)'}`,
              padding:'16px',
              transition:'border-color .2s',
            }}>
              {/* Shimmer de destaque para multi-campeão */}
              {isMostTitled && (
                <div style={{position:'absolute',top:0,right:0,padding:'3px 8px',background:accentColor,fontFamily:"'Orbitron',monospace",fontSize:6,fontWeight:900,letterSpacing:'.1em',color:'#000'}}>
                  ×{titleCounts[champName]}
                </div>
              )}

              {/* Ano/mês */}
              <div style={{fontFamily:"'Orbitron',monospace",fontSize:11,fontWeight:900,color:'rgba(255,255,255,.15)',letterSpacing:'.08em',marginBottom:12}}>
                {ed.year} <span style={{fontSize:8,fontWeight:400,color:'rgba(255,255,255,.2)'}}>{monthLabel}</span>
              </div>

              {/* Ícone + nome do campeão */}
              <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:10}}>
                {player?.iconUrl
                  ? <img src={player.iconUrl} alt="" style={{width:40,height:40,objectFit:'cover',borderRadius:'50%',border:`2px solid ${accentColor}55`}}/>
                  : <div style={{width:40,height:40,borderRadius:'50%',background:`linear-gradient(135deg,${colors[0]||'#888'},${colors[1]||'#444'})`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,border:`2px solid ${accentColor}55`}}>
                      {champName[0]||'?'}
                    </div>
                }
                <div>
                  <div style={{fontFamily:"'Orbitron',monospace",fontSize:7,fontWeight:700,letterSpacing:'.12em',color:accentColor,marginBottom:3}}>🏆 CAMPEÃO</div>
                  <div style={{fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:15,color:'#fff',lineHeight:1.2}}>{champName}</div>
                  {player?.country && <div style={{fontFamily:"'Rajdhani',sans-serif",fontSize:11,color:'rgba(255,255,255,.35)',marginTop:2}}>{player.country}</div>}
                </div>
              </div>

              {/* Runner-up */}
              <div style={{display:'flex',alignItems:'center',gap:6,padding:'6px 8px',background:'rgba(255,255,255,.03)',borderTop:'1px solid rgba(255,255,255,.05)'}}>
                <span style={{fontSize:10,opacity:.5}}>🥈</span>
                <span style={{fontFamily:"'Rajdhani',sans-serif",fontSize:12,color:'rgba(255,255,255,.4)',fontWeight:600}}>
                  {runnerUpName}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ─── Tournament Records ────────────────────────────────────────────────────────
const TournamentRecords = ({ editions, tournamentName, universeManager, accentColor, accentBorder }) => {
  // ── Calcular todas as estatísticas por jogador para ESTE torneio ──────
  const playerStats = useMemo(() => {
    const stats = {};

    const ensure = (name) => {
      if (!stats[name]) {
        stats[name] = {
          name,
          appearances: 0,
          titles: 0,
          finals: 0,       // final (incluindo título)
          semis: 0,        // semi (incluindo final+título)
          qf: 0,           // quartas (incluindo semi+final+título)
          yearFirst: null,
          yearLast: null,
          consecutiveTitles: 0,
          _titlesYears: [],
        };
      }
      return stats[name];
    };

    editions.forEach(ed => {
      const champName = ed.championName || ed.champion?.name;
      const runnerUp  = ed.runnerUp?.name;
      const year      = ed.year;

      if (champName) {
        const s = ensure(champName);
        s.appearances++;
        s.titles++;
        s.finals++;
        s.semis++;
        s.qf++;
        if (!s.yearFirst || year < s.yearFirst) s.yearFirst = year;
        if (!s.yearLast  || year > s.yearLast)  s.yearLast  = year;
        s._titlesYears.push(year);
      }
      if (runnerUp && runnerUp !== '—' && runnerUp !== champName) {
        const s = ensure(runnerUp);
        s.appearances++;
        s.finals++;
        s.semis++;
        s.qf++;
        if (!s.yearFirst || year < s.yearFirst) s.yearFirst = year;
        if (!s.yearLast  || year > s.yearLast)  s.yearLast  = year;
      }

      // Bracket SF/QF/R16 para contar aparições mais profundas
      const bracket = ed.bracket;
      if (bracket) {
        const processRound = (roundKey, statKey) => {
          const matches = bracket[roundKey] || [];
          matches.forEach(m => {
            [m.player1, m.player2].forEach(p => {
              if (!p?.name || p.name === champName || p.name === runnerUp) return;
              const s = ensure(p.name);
              s.appearances++;
              s[statKey]++;
              if (!s.yearFirst || year < s.yearFirst) s.yearFirst = year;
              if (!s.yearLast  || year > s.yearLast)  s.yearLast  = year;
            });
          });
        };
        processRound('SF', 'semis');
        processRound('QF', 'qf');
      }
    });

    // Calcular maior sequência de títulos consecutivos
    Object.values(stats).forEach(s => {
      const years = [...s._titlesYears].sort((a,b)=>a-b);
      let maxSeq = 0, curSeq = 0;
      years.forEach((y, i) => {
        if (i === 0 || y === years[i-1]+1) { curSeq++; maxSeq = Math.max(maxSeq, curSeq); }
        else curSeq = 1;
      });
      s.consecutiveTitles = maxSeq;
    });

    return Object.values(stats).sort((a,b) => b.titles - a.titles || b.appearances - a.appearances);
  }, [editions]);

  const getPlayer = (name) => {
    const idx = TEAMS.findIndex(p => p.name === name);
    return idx !== -1 ? { ...TEAMS[idx], id: idx } : null;
  };

  const total = editions.length;
  if (total === 0) return null;

  // ── Seções de recordes ─────────────────────────────────────────────────
  const topByTitles = [...playerStats].sort((a,b) => b.titles - a.titles).slice(0,5);
  const topByFinals = [...playerStats].sort((a,b) => b.finals - a.finals).slice(0,5);
  const topBySemis  = [...playerStats].sort((a,b) => b.semis  - a.semis ).slice(0,5);
  const topByApps   = [...playerStats].sort((a,b) => b.appearances - a.appearances).slice(0,5);
  const topBySeq    = [...playerStats].filter(p => p.consecutiveTitles >= 2).sort((a,b) => b.consecutiveTitles - a.consecutiveTitles).slice(0,3);

  // Dominância: mais títulos em anos separados
  const dominanceRatio = topByTitles[0] ? +(topByTitles[0].titles / total * 100).toFixed(0) : 0;

  const RecordSection = ({ title, icon, players, statKey, statLabel, extraInfo }) => (
    <div style={{background:'rgba(255,255,255,.02)',border:'1px solid rgba(255,255,255,.06)',padding:'16px',marginBottom:12}}>
      <div style={{fontFamily:"'Orbitron',monospace",fontSize:8,fontWeight:700,letterSpacing:'.18em',color:accentColor,marginBottom:14,display:'flex',alignItems:'center',gap:8}}>
        <span>{icon}</span>{title}
      </div>
      <div style={{display:'flex',flexDirection:'column',gap:7}}>
        {players.map((p, i) => {
          const teamData = getPlayer(p.name);
          const colors = teamData?.colors || ['#888','#444'];
          const medal = MEDAL_EMO[i] || `${i+1}.`;
          return (
            <div key={p.name} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 10px',
              background: i===0 ? `rgba(${hexToRgb(accentColor)},.06)` : 'rgba(255,255,255,.015)',
              border: i===0 ? `1px solid ${accentColor}33` : '1px solid rgba(255,255,255,.04)',
            }}>
              <span style={{fontSize:14,minWidth:22,textAlign:'center'}}>{medal}</span>
              {teamData?.iconUrl
                ? <img src={teamData.iconUrl} alt="" style={{width:28,height:28,objectFit:'cover',borderRadius:'50%',border:`1.5px solid ${colors[0]}55`}}/>
                : <div style={{width:28,height:28,borderRadius:'50%',background:`linear-gradient(135deg,${colors[0]||'#888'},${colors[1]||'#444'})`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,flexShrink:0}}>
                    {p.name[0]}
                  </div>
              }
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:14,color:i===0?'#fff':'rgba(255,255,255,.75)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>
                  {p.name}
                </div>
                {extraInfo && <div style={{fontFamily:"'Rajdhani',sans-serif",fontSize:11,color:'rgba(255,255,255,.3)'}}>
                  {extraInfo(p)}
                </div>}
              </div>
              <div style={{textAlign:'right',flexShrink:0}}>
                <div style={{fontFamily:"'Orbitron',monospace",fontWeight:900,fontSize:18,color:i===0?accentColor:'rgba(255,255,255,.5)'}}>
                  {p[statKey]}
                </div>
                <div style={{fontFamily:"'Rajdhani',sans-serif",fontSize:9,color:'rgba(255,255,255,.25)',letterSpacing:'.08em'}}>
                  {statLabel}
                </div>
              </div>
            </div>
          );
        })}
        {players.length === 0 && (
          <div style={{fontFamily:"'Rajdhani',sans-serif",fontSize:12,color:'rgba(255,255,255,.2)',textAlign:'center',padding:'12px 0'}}>
            Sem dados suficientes
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div>
      {/* Overview chips */}
      <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:20}}>
        {[
          { label:'Edições', val: total, icon:'📅' },
          { label:'Campeões distintos', val: topByTitles.filter(p=>p.titles>0).length, icon:'🏅' },
          { label:'Campeão mais vezes', val: topByTitles[0] ? `${topByTitles[0].name} (×${topByTitles[0].titles})` : '—', icon:'👑' },
          { label:'Taxa de dominância', val: `${dominanceRatio}%`, icon:'📈' },
        ].map(chip => (
          <div key={chip.label} style={{padding:'8px 14px',background:'rgba(255,255,255,.03)',border:`1px solid ${accentBorder}`,display:'flex',gap:8,alignItems:'center'}}>
            <span style={{fontSize:14}}>{chip.icon}</span>
            <div>
              <div style={{fontFamily:"'Orbitron',monospace",fontSize:7,letterSpacing:'.1em',color:'rgba(255,255,255,.3)'}}>{chip.label}</div>
              <div style={{fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:13,color:'#fff'}}>{chip.val}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Colunas duplas */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
        <RecordSection
          title="MAIS TÍTULOS" icon="🏆"
          players={topByTitles.filter(p=>p.titles>0)}
          statKey="titles" statLabel="TÍTULOS"
          extraInfo={p => p.yearFirst===p.yearLast ? `${p.yearFirst}` : `${p.yearFirst}–${p.yearLast}`}
        />
        <RecordSection
          title="MAIS FINAIS" icon="⚔️"
          players={topByFinals.filter(p=>p.finals>0)}
          statKey="finals" statLabel="FINAIS"
          extraInfo={p => `${p.titles} título${p.titles!==1?'s':''}`}
        />
        <RecordSection
          title="MAIS SEMIFINAIS" icon="🔥"
          players={topBySemis.filter(p=>p.semis>0)}
          statKey="semis" statLabel="SEMIS"
          extraInfo={p => `${p.finals} final${p.finals!==1?'is':''}`}
        />
        <RecordSection
          title="MAIS APARIÇÕES" icon="📋"
          players={topByApps.filter(p=>p.appearances>0)}
          statKey="appearances" statLabel="EDIÇÕES"
          extraInfo={p => `${p.titles} título${p.titles!==1?'s':''}`}
        />
      </div>

      {/* Sequências (largura total, só se tiver dados) */}
      {topBySeq.length > 0 && (
        <RecordSection
          title="MAIOR SEQUÊNCIA DE TÍTULOS CONSECUTIVOS" icon="⚡"
          players={topBySeq}
          statKey="consecutiveTitles" statLabel="CONSECUTIVOS"
          extraInfo={p => `${p.titles} total · ${p._titlesYears.join(', ')}`}
        />
      )}
    </div>
  );
};

// ============================================
// MAIN COMPONENT
// ============================================
const ModernBracket = ({
  universeManager,
  viewingTournament = null,
  onPlayMatch,
  onBack,
  turboMode,
  setTurboMode,
  autoPlayQueue,
  setAutoPlayQueue,
  onTournamentComplete
}) => {
  const [activeTab, setActiveTab]               = useState('overall');
  const [selectedMatch, setSelectedMatch]       = useState(null);
  const [matchDetails, setMatchDetails]         = useState(null);
  const [refreshKey, setRefreshKey]             = useState(0);
  const [completedMatches, setCompletedMatches] = useState(new Set());
  const [lastCompletedMatch, setLastCompletedMatch] = useState(null);
  const [isSimulating, setIsSimulating]         = useState(false);
  const [simProgress, setSimProgress]           = useState({ current:0, total:0, label:'' });
  const [isTournamentCompleting, setIsTournamentCompleting] = useState(false);
  const [isAdvancingPhase, setIsAdvancingPhase] = useState(false);
  const [phaseProgress, setPhaseProgress]       = useState({ phaseName:'', currentMatch:null, totalMatches:0, completedMatches:0, lastResult:null });

  const turboContext = useTurbo(); // eslint-disable-line
  const warRoom      = useWarRoomData();

  // ── Data resolution ───────────────────────────────────────────────────────
  let bracket = null, tournament = null, currentMatch = null, currentRound = null, isViewingArchived = false;
  if (viewingTournament) {
    const key = `${viewingTournament.year}-${viewingTournament.month}-${viewingTournament.index}`;
    const arch = universeManager.tournamentArchive.get(key);
    if (arch) { bracket = arch.bracket; tournament = arch.tournament; isViewingArchived = true; }
    else { bracket = universeManager.currentBracket; tournament = universeManager.getCurrentTournament(); currentMatch = universeManager.getCurrentMatch(); currentRound = universeManager.currentRound; }
  } else {
    bracket = universeManager.currentBracket;
    tournament = universeManager.getCurrentTournament();
    currentMatch = universeManager.getCurrentMatch();
    currentRound = universeManager.currentRound;
  }

  // ── Effects ───────────────────────────────────────────────────────────────
  useEffect(() => { setRefreshKey(p => p+1); }, [universeManager.currentBracket, universeManager.currentRound]);

  useEffect(() => {
    const cb = universeManager.currentBracket;
    if (!cb || !autoPlayQueue) return;
    const newDone = new Set();
    Object.values(cb).flat().forEach(m => { if (m?.winner != null) newDone.add(m.matchId); });
    const justDone = Array.from(newDone).find(id => !completedMatches.has(id));
    if (justDone) {
      const m = Object.values(cb).flat().find(m => m?.matchId === justDone);
      if (m) { setLastCompletedMatch(m); setTimeout(() => setLastCompletedMatch(null), 1000); }
    }
    setCompletedMatches(newDone);
  }, [universeManager.currentBracket, autoPlayQueue]); // eslint-disable-line

  useEffect(() => {
    if (!autoPlayQueue || !turboMode || !warRoom.isActive) return;
    const { matches, currentIndex } = autoPlayQueue;
    const isCompleted = m => m?.winner != null;
    if (currentIndex > 0) {
      const last = matches[currentIndex-1];
      if (last && isCompleted(last)) {
        const result = last.result || {};
        const winner = result.winner || last.winner;
        const loser = last.player1?.name === winner ? last.player2 : last.player1;
        warRoom.recordMatch({ winner:winner?.name||winner||'Unknown', loser:loser?.name||loser||'Unknown', score:result.score||'0-0', isUpset:false, isPerfect:result.isPerfect||false, maxCombo:result.maxCombo||0, duration:result.duration||0 });
      }
    }
    if (currentIndex >= matches.length && isCompleted(matches[matches.length-1])) {
      setTimeout(() => { warRoom.endPhase(); setTurboMode(false); setAutoPlayQueue(null); }, 1000);
    } else if (currentIndex < matches.length) {
      const curr = matches[currentIndex];
      if (curr && !isCompleted(curr)) warRoom.startMatch({ player1:curr.player1?.name||'P1', player2:curr.player2?.name||'P2' });
    }
  }, [autoPlayQueue, turboMode, warRoom]); // eslint-disable-line

  // ── Helpers ───────────────────────────────────────────────────────────────
  const isMatchCompleted = m => m?.winner != null;
  const isCurrentMatch   = m => !(!currentMatch || !m) && m.matchId === currentMatch.matchId;
  const getRoundNamePT   = r => ROUND_PT[r] || r;

  const getPlayerRank = (playerId) => {
    if (!playerId) return 0;
    try { return universeManager.getBBPRanking().find(r => r.playerId == playerId)?.rank || 0; }
    catch { return 0; }
  };

  const getSeriesScore = (match) => {
    if (!match?.score) return null;
    if (match.score.playerA !== undefined) return { p1: match.score.playerA, p2: match.score.playerB };
    return null;
  };

  const getMatchLog = (match) => {
    if (!match?.matchId) return null;
    const p1id = match.player1?.id, p2id = match.player2?.id;
    if (p1id && p2id) {
      const log = universeManager.matchLog.find(l =>
        l.matchId === match.matchId &&
        ((idsMatch(l.playerAId,p1id) && idsMatch(l.playerBId,p2id)) ||
         (idsMatch(l.playerAId,p2id) && idsMatch(l.playerBId,p1id)))
      );
      if (log) return log;
    }
    return universeManager.matchLog.find(l => l.matchId === match.matchId) || null;
  };

  const handleMatchClick = (match) => {
    if (isMatchCompleted(match)) { setMatchDetails(getMatchLog(match)); setSelectedMatch(match); }
    else if (!isViewingArchived && isCurrentMatch(match)) { setSelectedMatch(match); }
  };

  const tierInfo = (() => {
    const cfg = TIER_CFG[tournament?.tier] || {};
    return { icon: cfg.icon||'🎮', label: cfg.label||tournament?.tier||'', color: cfg.color||'#fff', border: cfg.border||'rgba(255,255,255,.3)' };
  })();

  // ── Sim handlers ──────────────────────────────────────────────────────────
  const handleTurboPhase = () => {
    if (!currentRound || currentRound === 'COMPLETE') return;
    const matches = (bracket[currentRound]||[]).filter(m => !isMatchCompleted(m));
    if (!matches.length) return;
    const phaseName = getRoundNamePT(currentRound);
    warRoom.startPhase(phaseName, matches.length);
    setTurboMode(true);
    setAutoPlayQueue({ matches, currentIndex:0, phaseName });
    setTimeout(() => {
      const first = matches[0];
      if (first) { warRoom.startMatch({ player1:first.player1?.name||'P1', player2:first.player2?.name||'P2' }); onPlayMatch(first); }
    }, 300);
  }; // eslint-disable-line

  const handleSimulateHeadless = async (targetRound) => {
    if (isSimulating || !currentRound || currentRound === 'COMPLETE') return;
    const roundsOrder = ['R64','R32','R16','QF','SF','F'];
    
    // ✅ CORREÇÃO: Se está visualizando um torneio, use ele ao invés do getCurrentTournament()
    const tourn = viewingTournament || universeManager.getCurrentTournament();
    const matchFormat = tourn?.matchFormat || 'MD3';
    const winsNeeded = matchFormat==='MD5'?3:matchFormat==='MD7'?4:2;
    const startIdx = roundsOrder.indexOf(currentRound);
    let endIdx = targetRound==='CURRENT'?startIdx:targetRound==='ALL'?roundsOrder.length-1:roundsOrder.indexOf(targetRound);
    if (endIdx < startIdx) return;
    const roundsToProcess = roundsOrder.slice(startIdx, endIdx+1);

    // ── Helper: monta context de traits para um match ──
    const buildCtx = (p1, p2, round) => {
      try {
        const um = universeManager;
        const getFormaName = (id) => { try { return um.formManager?.getTracker(id)?.getFormaState()?.name || 'NEUTRAL'; } catch(e) { return 'NEUTRAL'; } };
        const getH2HAdv = (idA, idB) => {
          try {
            const riv = um.rivalrySystem?.getRivalry(idA, idB);
            if (!riv) return 0;
            const key = um.rivalrySystem._key ? um.rivalrySystem._key(idA, idB) : null;
            const isP1 = key && key.startsWith(String(idA));
            return isP1 ? (riv.p1Wins - riv.p2Wins) : (riv.p2Wins - riv.p1Wins);
          } catch(e) { return 0; }
        };
        const getLastLostVsOpp = (idA, idB) => {
          try {
            const hist = (um.matchHistory || []).filter(m => (m.player1Id===idA||m.player2Id===idA) && (m.player1Id===idB||m.player2Id===idB));
            if (!hist.length) return false;
            return hist[hist.length-1].winnerId !== idA;
          } catch(e) { return false; }
        };
        const getTourneyWins = (id) => {
          try {
            let wins = 0;
            for (const stg of Object.values(um.currentBracket || {})) { if (!Array.isArray(stg)) continue; stg.forEach(m => { if (m.winner?.id === id) wins++; }); }
            return wins;
          } catch(e) { return 0; }
        };
        return {
          tournamentStage: round,
          tournamentTier: tourn?.tier || '',
          team1FormaName: getFormaName(p1.id),
          team2FormaName: getFormaName(p2.id),
          team1H2HAdv: getH2HAdv(p1.id, p2.id),
          team2H2HAdv: getH2HAdv(p2.id, p1.id),
          team1LastLostVsOpp: getLastLostVsOpp(p1.id, p2.id),
          team2LastLostVsOpp: getLastLostVsOpp(p2.id, p1.id),
          team1TourneyWins: getTourneyWins(p1.id),
          team2TourneyWins: getTourneyWins(p2.id),
        };
      } catch(e) { return { tournamentStage: round, tournamentTier: '' }; }
    };

    setIsSimulating(true);
    try {
      for (const round of roundsToProcess) {
        if (!universeManager.currentBracket[round]) break;
        const matches = universeManager.currentBracket[round].filter(m => !m.winner);
        if (!matches.length) { if (round !== roundsToProcess[roundsToProcess.length-1]) { universeManager.advanceRound(); setRefreshKey(k=>k+1); } continue; }
        let done = 0;
        setSimProgress({ current:0, total:matches.length, label:getRoundNamePT(round) });
        for (const match of matches) {
          const p1=match.player1, p2=match.player2;
          if (!p1||!p2||!p1.deck||!p2.deck) continue;
          const maxRounds = winsNeeded*2-1;
          
          // ✅ CORREÇÃO: Determinar arena baseado no torneio correto (viewingTournament ou atual)
          const arenaOrder = Array.from({length:maxRounds}, (_,i) => {
            // Se está visualizando um torneio, usar a arena dele
            if (viewingTournament) {
              // Se o torneio tem arena específica (não é 'ALL')
              if (viewingTournament.arena && viewingTournament.arena !== 'ALL') {
                // Mapa de conversão de nomes do calendário para códigos internos
                const nameMap = {
                  'BB-10': 'BB10_COMPETITIVE',
                  'BB-10 Competitive': 'BB10_COMPETITIVE',
                  'Prismatic Nexus': 'NEXUS',
                  'Volcanic Rage': 'VOLCANIC_RAGE',
                  'Colosseum Carnage': 'COLOSSEUM_CARNAGE',
                  'Vortex Coliseum': 'VORTEX_COLISEUM',
                  'Pinball Inferno': 'PINBALL_INFERNO',
                  'Pangea Platform': 'PANGEA_PLATFORM',
                  'Killer Sides': 'KILLER_SIDES',
                  'Storm Track': 'STORM_TRACK',
                  'Tidal Surge': 'TIDAL_SURGE',
                  'Domination Zones': 'DOMINATION_ZONES',
                };
                return nameMap[viewingTournament.arena] || viewingTournament.arena;
              }
            }
            // Caso contrário, usar o método normal do UniverseManager
            return universeManager._pickArena(round, i);
          });
          
          const ctx = buildCtx(p1, p2, round);
          const result = await runHeadlessMD3({...p1,id:p1.id},{...p2,id:p2.id},arenaOrder,matchFormat,null,ctx);
          const winnerId = result.winner?.id??(result.score.team1>result.score.team2?p1.id:p2.id);
          const det = { 
            score:{playerA:result.score.team1,playerB:result.score.team2}, 
            rounds:result.rounds.map(r=>({ 
              winner:r.winner==='team1'?p1.id:r.winner==='team2'?p2.id:null, 
              winnerName:r.winnerBey?.name||'', 
              method:r.method||'SPIN_FINISH',
              // 🎯 NOVO: Preservar bey1 e bey2 para análise de Signature Blade
              bey1: r.bey1,
              bey2: r.bey2,
              launch1: r.launch1,
              launch2: r.launch2
            })), 
            format:matchFormat, 
            duration:0, 
            awards:result.rounds.flatMap(r=>r.replayData?.awards||[]) 
          };
          universeManager.recordMatchWinner(match.matchId, winnerId, det);
          done++; setSimProgress({ current:done, total:matches.length, label:getRoundNamePT(round) }); setRefreshKey(k=>k+1);
          await new Promise(res=>setTimeout(res,20));
        }
        if (round !== roundsToProcess[roundsToProcess.length-1]) { universeManager.advanceRound(); setRefreshKey(k=>k+1); await new Promise(res=>setTimeout(res,50)); }
      }
      const lastRound = roundsToProcess[roundsToProcess.length-1];
      if (lastRound==='F') {
        setIsTournamentCompleting(true);
        const finalResult = universeManager.advanceRound();
        if (finalResult && onTournamentComplete) setTimeout(()=>onTournamentComplete(finalResult),100);
        setRefreshKey(k=>k+1);
      } else { universeManager.advanceRound(); setRefreshKey(k=>k+1); await new Promise(res=>setTimeout(res,100)); }
    } finally { setIsSimulating(false); setSimProgress({current:0,total:0,label:''}); setRefreshKey(k=>k+1); }
  };

  /* eslint-disable no-unused-vars */
  const runRealMatch = async (player1,player2,arena,roundsNeeded) => {
    const rounds=[]; let scoreA=0,scoreB=0,winner=null;
    const bey1Data=player1.beyblade||player1, bey2Data=player2.beyblade||player2;
    // Arena stat modifiers removidos. Arena preference está no BASE (deck building).
    // Forma: aplicada sobre o BASE (antes dos atributos do player — já feito no deck build)
    let mb1=applyFormMultiplier(bey1Data, player1.formMultiplier||1);
    let mb2=applyFormMultiplier(bey2Data, player2.formMultiplier||1);
    for (let rn=1;rn<=roundsNeeded*2-1;rn++) {
      if (winner) break;
      const engine=new BattlePhysicsEngine(arena);
      engine.initializeBattle(mb1,mb2,{name:player1.name||player1.id},{name:player2.name||player2.id},{power:8+Math.random()*2},{power:8+Math.random()*2});
      const rr=engine.simulate();
      rounds.push({roundNumber:rn,winner:rr.winner===1?player1:player2,finishType:rr.finishType,duration:rr.duration});
      if(rr.winner===1) scoreA++; else scoreB++;
      if(scoreA>=roundsNeeded) winner=player1; else if(scoreB>=roundsNeeded) winner=player2;
    }
    return { winner, score:{playerA:scoreA,playerB:scoreB}, rounds, format:`MD${roundsNeeded*2-1}` };
  };
  /* eslint-enable no-unused-vars */

  // ── Render helpers ────────────────────────────────────────────────────────
  const renderPlayerRow = (player, isWinner, match, isP1) => {
    if (!player) return (
      <div className="mb-player-row">
        <span className="mb-rank-tag n">#—</span>
        <div className="mb-avatar" style={{background:'rgba(255,255,255,.05)'}}>
          <span style={{color:'rgba(255,255,255,.2)',fontSize:11}}>?</span>
        </div>
        <span className="mb-player-name" style={{color:'rgba(255,255,255,.22)'}}>TBD</span>
      </div>
    );
    const name  = player.name||player.id||'—';
    const rank  = getPlayerRank(player.id||'');
    const ss    = getSeriesScore(match);
    const score = ss ? (isP1 ? ss.p1 : ss.p2) : null;
    const done  = isMatchCompleted(match);
    return (
      <div className={`mb-player-row ${isWinner?'winner':done?'loser':''}`}>
        <span className={`mb-rank-tag ${isWinner?'w':'n'}`}>#{rank||'—'}</span>
        <div className="mb-avatar">
          {player.iconUrl
            ? <img src={player.iconUrl} alt={name} style={{width:'100%',height:'100%',objectFit:'cover'}}/>
            : <div style={{width:'100%',height:'100%',display:'flex',alignItems:'center',justifyContent:'center',background:player.colors?.[0]||'#7c3aed',color:'#fff',fontWeight:700,fontSize:12}}>{name.charAt(0)}</div>
          }
        </div>
        <span className={`mb-player-name ${isWinner?'w':''}`}>{name}</span>
        {score !== null && <span className={`mb-score ${isWinner?'w':'l'}`}>{score}</span>}
      </div>
    );
  };

  const renderMatch = (match, roundKey, idx) => {
    const isComp  = isMatchCompleted(match);
    const isCurr  = isCurrentMatch(match);
    const isTP    = turboMode && autoPlayQueue && isCurr;
    const justDone = lastCompletedMatch?.matchId === match.matchId;
    let p1w=false, p2w=false;
    if (isComp && match.winner) {
      if (match.player1 && idsMatch(match.winner.id, match.player1.id)) p1w=true;
      else if (match.player2 && idsMatch(match.winner.id, match.player2.id)) p2w=true;
    }
    let cls = 'mb-match-card';
    if (isTP) cls += ' turbo-proc';
    else if (isCurr && !turboMode) cls += ' is-current';
    else if (isComp) cls += ' completed';
    return (
      <div key={`${roundKey}-${idx}-${refreshKey}`} className={cls}
           style={{ animation: justDone ? 'celebrationPop .5s ease-out' : undefined }}
           onClick={() => handleMatchClick(match)}>
        {isTP && <div style={{position:'absolute',inset:0,background:'linear-gradient(90deg,transparent,rgba(251,191,36,.06),transparent)',animation:'mb-shimmer 1.8s infinite',pointerEvents:'none'}}/>}
        {renderPlayerRow(match.player1, p1w, match, true)}
        <div className="mb-vs-divider">
          <div className="mb-vs-line"/>
          <span className="mb-vs-text">{isComp ? '✓' : 'VS'}</span>
          <div className="mb-vs-line"/>
        </div>
        {renderPlayerRow(match.player2, p2w, match, false)}
        <div style={{padding:'6px 14px 10px',display:'flex',justifyContent:'center'}}>
          {isTP && <span className="mb-pill proc"><span style={{animation:'mb-spin 1s linear infinite',display:'inline-block',fontSize:9}}>⚡</span>PROCESSANDO</span>}
          {!isTP && isCurr && !isViewingArchived && <span className="mb-pill next"><span style={{width:5,height:5,borderRadius:'50%',background:'#ffd700',display:'inline-block',animation:'mb-pulse 2s infinite'}}/>PRÓXIMO</span>}
          {isComp && !isTP && <span className="mb-pill done">✓ VER DETALHES</span>}
        </div>
      </div>
    );
  };

  const renderRound = (roundKey) => {
    const matches = bracket[roundKey]||[];
    if (!matches.length) return null;
    return (
      <div key={`r-${roundKey}-${refreshKey}`} style={{display:'flex',flexDirection:'column',minWidth:268}}>
        <div className="mb-round-title">
          {getRoundNamePT(roundKey)}
          <span className="mb-round-count">{matches.length} {matches.length===1?'partida':'partidas'}</span>
        </div>
        <div style={{display:'flex',flexDirection:'column',flex:1,justifyContent:'center'}}>
          {matches.map((m,i) => renderMatch(m, roundKey, i))}
        </div>
      </div>
    );
  };

  // ── Modal ─────────────────────────────────────────────────────────────────
  const MatchDetailsModal = ({ match, details, onClose }) => {
    if (!match || !details) return null;
    const p1=match.player1, p2=match.player2, winner=match.winner;
    const p1Name=p1?.name||'TBD', p2Name=p2?.name||'TBD';
    const rounds=details.rounds||[];
    return (
      <div className="mb-modal-overlay" onClick={onClose}>
        <div className="mb-modal" onClick={e=>e.stopPropagation()}>
          <div style={{textAlign:'center',marginBottom:22}}>
            <div style={{fontFamily:"'Orbitron',monospace",fontSize:9,fontWeight:700,letterSpacing:'.22em',color:'rgba(255,215,0,.55)',marginBottom:14}}>RESUMO DO MATCH</div>
            <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:16}}>
              <span style={{fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:16,color:idsMatch(winner?.id,p1?.id)?'#4ade80':'rgba(255,255,255,.4)'}}>{p1Name}</span>
              <span style={{fontFamily:"'Orbitron',monospace",fontWeight:900,fontSize:24,color:'#ffd700'}}>{details.score?.playerA||0} — {details.score?.playerB||0}</span>
              <span style={{fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:16,color:idsMatch(winner?.id,p2?.id)?'#4ade80':'rgba(255,255,255,.4)'}}>{p2Name}</span>
            </div>
            <div style={{marginTop:8,color:'#4ade80',fontFamily:"'Rajdhani',sans-serif",fontWeight:600,fontSize:13}}>🏆 {winner?.name||''}</div>
          </div>
          <div style={{fontFamily:"'Orbitron',monospace",fontSize:8,fontWeight:700,letterSpacing:'.2em',color:'rgba(255,215,0,.45)',marginBottom:10}}>ROUNDS</div>
          <div style={{display:'flex',flexDirection:'column',gap:8,marginBottom:20}}>
            {rounds.length ? rounds.map((rnd,i)=>{
              const rWinnerId=rnd.winner;
              const rIsP1=idsMatch(rWinnerId,p1?.id);
              const rWinnerName=rIsP1?p1Name:p2Name;
              const method=rnd.method||rnd.finishType||'SPIN_FINISH';
              return (
                <div key={i} style={{background:'rgba(255,255,255,.025)',border:'1px solid rgba(255,255,255,.07)',padding:'11px 14px'}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:5}}>
                    <span style={{fontFamily:"'Orbitron',monospace",fontSize:8,fontWeight:700,letterSpacing:'.15em',color:'rgba(255,255,255,.3)'}}>ROUND {i+1}</span>
                    <span style={{fontFamily:"'Rajdhani',sans-serif",fontWeight:700,color:'#4ade80',fontSize:13}}>✓ {rWinnerName}</span>
                  </div>
                  <div style={{display:'flex',alignItems:'center',gap:8,color:'rgba(255,255,255,.45)',fontSize:13,fontFamily:"'Rajdhani',sans-serif",fontWeight:600}}>
                    <span style={{fontSize:15}}>{FINISH_ICONS[method]||'🎯'}</span>
                    <span>{FINISH_NAMES[method]||method}</span>
                  </div>
                </div>
              );
            }) : <div style={{color:'rgba(255,255,255,.25)',textAlign:'center',padding:'28px',fontFamily:"'Rajdhani',sans-serif",fontSize:14}}>Detalhes não disponíveis</div>}
          </div>
          {details.duration && (
            <div style={{display:'flex',justifyContent:'space-around',padding:'14px',background:'rgba(74,222,128,.05)',border:'1px solid rgba(74,222,128,.12)',marginBottom:18}}>
              <div style={{textAlign:'center'}}>
                <div style={{fontFamily:"'Orbitron',monospace",fontWeight:900,color:'#4ade80',fontSize:18}}>{rounds.length}</div>
                <div style={{fontFamily:"'Rajdhani',sans-serif",color:'rgba(255,255,255,.35)',fontSize:12}}>Rounds</div>
              </div>
              <div style={{textAlign:'center'}}>
                <div style={{fontFamily:"'Orbitron',monospace",fontWeight:900,color:'#c084fc',fontSize:18}}>{details.duration}s</div>
                <div style={{fontFamily:"'Rajdhani',sans-serif",color:'rgba(255,255,255,.35)',fontSize:12}}>Duração</div>
              </div>
            </div>
          )}
          <button className="mb-play-btn" onClick={onClose} style={{background:'rgba(255,255,255,.04)',borderColor:'rgba(255,255,255,.12)',color:'rgba(255,255,255,.45)'}}>FECHAR</button>
        </div>
      </div>
    );
  };

  // ── Guard states ──────────────────────────────────────────────────────────
  if (isAdvancingPhase) return (
    <PhaseProgressScreen phaseName={phaseProgress.phaseName} currentMatch={phaseProgress.currentMatch}
      totalMatches={phaseProgress.totalMatches} completedMatches={phaseProgress.completedMatches}
      lastResult={phaseProgress.lastResult} onCancel={()=>setIsAdvancingPhase(false)}/>
  );

  if (!bracket || !tournament) {
    if (isTournamentCompleting) return (
      <div style={{minHeight:'100vh',background:'#0d1117',display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:16}}>
        <style>{BRACKET_STYLES}</style>
        <div style={{fontSize:64,animation:'mb-pulse 1.5s infinite'}}>🏆</div>
        <div style={{fontFamily:"'Orbitron',monospace",fontWeight:900,color:'#ffd700',fontSize:16,letterSpacing:'.15em'}}>PREPARANDO CERIMÔNIA...</div>
      </div>
    );
    return (
      <div style={{minHeight:'100vh',background:'#0d1117',display:'flex',alignItems:'center',justifyContent:'center'}}>
        <style>{BRACKET_STYLES}</style>
        <div style={{padding:40,border:'1px solid rgba(239,68,68,.3)',textAlign:'center',maxWidth:400}}>
          <div style={{fontFamily:"'Orbitron',monospace",fontSize:12,fontWeight:700,color:'#f87171',marginBottom:12}}>BRACKET INDISPONÍVEL</div>
          <p style={{color:'rgba(255,255,255,.45)',fontFamily:"'Rajdhani',sans-serif",marginBottom:20}}>O chaveamento do torneio ainda não foi criado.</p>
          <button onClick={onBack} className="mb-back-btn">← VOLTAR</button>
        </div>
      </div>
    );
  }

  const roundsOrder     = ['R64','R32','R16','QF','SF','F'];
  const availableRounds = roundsOrder.filter(r => bracket[r]?.length > 0);

  // ── MAIN RENDER ───────────────────────────────────────────────────────────
  return (
    <div key={`bk-${refreshKey}`} className="mb-root"
      style={{minHeight:'100vh',background:'linear-gradient(160deg,#0d1117 0%,#0f1924 55%,#0d1117 100%)',color:'#fff',paddingTop:autoPlayQueue?'120px':'0',transition:'padding-top .3s ease'}}>
      <style>{BRACKET_STYLES}</style>

      {warRoom.isActive && (
        <WarRoomOverlay
          phase={warRoom.phase} totalMatches={warRoom.totalMatches} completedMatches={warRoom.completedMatches}
          currentMatch={warRoom.currentMatch} recentResults={warRoom.recentResults} stats={warRoom.stats}
          onSkip={()=>{ setAutoPlayQueue(null); setTurboMode(false); warRoom.reset(); }}
          onClose={()=>{ setAutoPlayQueue(null); setTurboMode(false); warRoom.reset(); }}
        />
      )}

      {/* ── HEADER ────────────────────────────────────────────────────── */}
      <div style={{background:'rgba(0,0,0,.55)',backdropFilter:'blur(16px)',borderBottom:'1px solid rgba(255,255,255,.06)',padding:'16px 24px'}}>
        <div style={{maxWidth:1600,margin:'0 auto',display:'flex',alignItems:'flex-start',gap:20}}>
          <button onClick={onBack} className="mb-back-btn" style={{marginTop:6}}>← VOLTAR</button>
          <div style={{flex:1}}>
            <div style={{marginBottom:8}}>
              <span className="mb-tier-badge" style={{color:tierInfo.color,borderColor:tierInfo.border}}>
                <span style={{fontSize:15}}>{tierInfo.icon}</span>
                <span style={{fontFamily:"'Orbitron',monospace",fontSize:8,fontWeight:700,letterSpacing:'.14em'}}>{tierInfo.label}</span>
              </span>
            </div>
            <h1 style={{fontFamily:"'Orbitron',monospace",fontWeight:900,fontSize:'clamp(17px,2.8vw,30px)',color:'#fff',letterSpacing:'.03em',lineHeight:1.1,marginBottom:7}}>
              {tournament.name}
            </h1>
            <div style={{display:'flex',gap:14,color:'rgba(255,255,255,.38)',fontFamily:"'Rajdhani',sans-serif",fontSize:13,fontWeight:600,flexWrap:'wrap'}}>
              <span>👥 {tournament.participants} participantes</span>
              <span>•</span>
              <span>🎯 {tournament.matchFormat}</span>
              {currentRound && currentRound !== 'COMPLETE' && <>
                <span>•</span>
                <span style={{color:tierInfo.color}}>⚡ {getRoundNamePT(currentRound)}</span>
              </>}
            </div>
          </div>
        </div>
      </div>

      {/* ── TAB BAR ───────────────────────────────────────────────────── */}
      <div className="mb-tab-bar">
        {[
          {key:'overall',  label:'Overall'},
          {key:'next',     label:'Próximo Combate'},
          {key:'history',  label:'História'},
        ].map(({key,label}) => (
          <button key={key} className={`mb-tab ${activeTab===key?'active':''}`} onClick={()=>setActiveTab(key)}>
            {label}
          </button>
        ))}
      </div>

      {/* ── TAB: OVERALL ────────────────────────────────────────────── */}
      {activeTab === 'overall' && (
        <div style={{maxWidth:1600,margin:'0 auto',padding:'24px 24px 56px',animation:'mb-entry .3s ease-out'}}>
          {!isViewingArchived && currentRound !== 'COMPLETE' && (
            <div style={{marginBottom:22}}>
              {isSimulating && (
                <div style={{display:'flex',alignItems:'center',gap:14,padding:'10px 16px',background:'rgba(139,92,246,.09)',border:'1px solid rgba(139,92,246,.28)',marginBottom:12}}>
                  <span style={{fontFamily:"'Orbitron',monospace",fontSize:8,fontWeight:700,letterSpacing:'.18em',color:'#c084fc',whiteSpace:'nowrap'}}>🤖 SIMULANDO {simProgress.label.toUpperCase()}</span>
                  <div className="mb-progress-bar" style={{flex:1}}>
                    <div className="mb-progress-fill" style={{width:simProgress.total>0?`${(simProgress.current/simProgress.total)*100}%`:'0%'}}/>
                  </div>
                  <span style={{fontFamily:"'Orbitron',monospace",fontSize:8,color:'#a78bfa',whiteSpace:'nowrap'}}>{simProgress.current}/{simProgress.total}</span>
                </div>
              )}
              <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10}}>
                <button className="mb-sim-btn pur" onClick={()=>handleSimulateHeadless('CURRENT')} disabled={isSimulating}>
                  <span style={{fontSize:18}}>🤖</span><span>Simular</span><span style={{fontSize:8,opacity:.65}}>{getRoundNamePT(currentRound)}</span>
                </button>
                {['R64','R32','R16'].includes(currentRound) && (
                  <button className="mb-sim-btn blu" onClick={()=>handleSimulateHeadless('QF')} disabled={isSimulating}>
                    <span style={{fontSize:18}}>⚡</span><span>Até Quartas</span><span style={{fontSize:8,opacity:.65}}>QF</span>
                  </button>
                )}
                {['R64','R32','R16','QF'].includes(currentRound) && (
                  <button className="mb-sim-btn amb" onClick={()=>handleSimulateHeadless('SF')} disabled={isSimulating}>
                    <span style={{fontSize:18}}>🔥</span><span>Até Semis</span><span style={{fontSize:8,opacity:.65}}>SF</span>
                  </button>
                )}
                <button className="mb-sim-btn red" disabled={isSimulating} onClick={()=>handleSimulateHeadless('ALL')}
                  style={{gridColumn:(!['R64','R32','R16'].includes(currentRound)&&!['R64','R32','R16','QF'].includes(currentRound))?'span 3':'auto'}}>
                  <span style={{fontSize:18}}>🏆</span><span>Todo Torneio</span><span style={{fontSize:8,opacity:.65}}>FULL SIM</span>
                </button>
              </div>
            </div>
          )}

          <div style={{background:'rgba(255,255,255,.012)',border:'1px solid rgba(255,255,255,.05)',padding:'20px',overflowX:'auto',scrollbarWidth:'thin',scrollbarColor:'rgba(255,215,0,.2) rgba(0,0,0,.2)'}}>
            <div style={{display:'flex',gap:26,padding:'4px 2px',minWidth:'min-content'}}>
              {availableRounds.map(r => renderRound(r))}
            </div>
          </div>

          {currentMatch && !isViewingArchived && currentRound !== 'COMPLETE' && (
            <div style={{marginTop:24}}>
              <div style={{fontFamily:"'Orbitron',monospace",fontSize:8,fontWeight:700,letterSpacing:'.22em',color:'rgba(255,215,0,.45)',marginBottom:12,display:'flex',alignItems:'center',gap:8}}>
                <span style={{width:5,height:5,borderRadius:'50%',background:'#ffd700',display:'inline-block',animation:'mb-pulse 2s infinite'}}/>
                PRÓXIMO CONFRONTO
              </div>
              <div className="mb-next-card">
                <div style={{display:'grid',gridTemplateColumns:'1fr auto 1fr',gap:20,alignItems:'center',marginBottom:16}}>
                  <div style={{textAlign:'center'}}>
                    <div style={{fontFamily:"'Orbitron',monospace",fontSize:11,color:'#c084fc',marginBottom:6}}>#{getPlayerRank(currentMatch.player1?.id)}</div>
                    <div style={{fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:'clamp(15px,2vw,22px)',color:'#fff'}}>{currentMatch.player1?.name||'TBD'}</div>
                  </div>
                  <div style={{textAlign:'center'}}>
                    <div style={{fontFamily:"'Orbitron',monospace",fontWeight:900,fontSize:22,color:'rgba(255,255,255,.12)',letterSpacing:'.1em'}}>VS</div>
                    <div style={{fontFamily:"'Orbitron',monospace",fontSize:7,color:'rgba(255,215,0,.38)',letterSpacing:'.2em',marginTop:5}}>{getRoundNamePT(currentRound)}</div>
                  </div>
                  <div style={{textAlign:'center'}}>
                    <div style={{fontFamily:"'Orbitron',monospace",fontSize:11,color:'#c084fc',marginBottom:6}}>#{getPlayerRank(currentMatch.player2?.id)}</div>
                    <div style={{fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:'clamp(15px,2vw,22px)',color:'#fff'}}>{currentMatch.player2?.name||'TBD'}</div>
                  </div>
                </div>
                <button className="mb-play-btn" onClick={()=>onPlayMatch&&onPlayMatch(currentMatch)}>
                  ⚔️ &nbsp; JOGAR ESTA PARTIDA
                </button>
              </div>
            </div>
          )}

          <div style={{marginTop:22,display:'flex',alignItems:'center',justifyContent:'center',gap:20,flexWrap:'wrap',padding:'12px 16px',background:'rgba(255,255,255,.015)',border:'1px solid rgba(255,255,255,.05)'}}>
            {[
              {bg:'rgba(34,197,94,.12)',  bd:'rgba(34,197,94,.3)',  label:'Vencedor'},
              {bg:'rgba(255,215,0,.06)',  bd:'rgba(255,215,0,.35)', label:'Próximo Match'},
              {bg:'rgba(255,255,255,.025)',bd:'rgba(255,255,255,.08)',label:'Pendente'},
              {bg:'rgba(34,197,94,.05)',  bd:'rgba(74,222,128,.25)',label:'Ver detalhes'},
            ].map(l=>(
              <div key={l.label} style={{display:'flex',alignItems:'center',gap:8}}>
                <div style={{width:28,height:16,background:l.bg,border:`1px solid ${l.bd}`}}/>
                <span style={{fontFamily:"'Rajdhani',sans-serif",fontSize:12,fontWeight:600,color:'rgba(255,255,255,.35)'}}>{l.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── TAB: PRÓXIMO COMBATE ─────────────────────────────────────── */}
      {activeTab === 'next' && (
        <VersusScreen
          match={currentMatch}
          universeManager={universeManager}
          onPlay={() => onPlayMatch && currentMatch && onPlayMatch(currentMatch)}
          roundKey={currentRound}
          tournament={tournament}
        />
      )}

      {/* ── TAB: HISTÓRIA ────────────────────────────────────────────── */}
      {activeTab === 'history' && (
        <TournamentHistoryTab
          tournament={tournament}
          viewingTournament={viewingTournament}
          universeManager={universeManager}
          tierInfo={tierInfo}
        />
      )}

      {/* ── MODAL ─────────────────────────────────────────────────────── */}
      {selectedMatch && matchDetails && (
        <MatchDetailsModal match={selectedMatch} details={matchDetails}
          onClose={()=>{ setSelectedMatch(null); setMatchDetails(null); }}/>
      )}
    </div>
  );
};

export default ModernBracket;
