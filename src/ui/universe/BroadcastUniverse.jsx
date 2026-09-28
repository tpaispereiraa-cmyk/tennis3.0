/**
 * BroadcastUniverse.jsx
 * —”€—
 * Broadcast Hub visual para o Modo Universo
 * Recebe { state, dispatch, onBack } direto do UniverseManager
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ovrTier } from '../../systems/scouting/ScoutProfile.js';
import { overallRating, getPlayerPhoto } from '../../domain/players/players.js';
import { mergeGeneratedPrefs } from '../../domain/players/playerPrefs.js';
import { CALENDAR, computeTournamentPoints } from '../../systems/tournaments/TournamentSystem.js';
import { TOURNAMENT_POINTS } from '../../systems/ranking/RankingSystem.js';
import { getPlayerTraits } from '../../systems/traits/TraitSystem.js';
import DefinitivePlayerProfile from '../players/DefinitivePlayerProfile.jsx';
import ChronicleView from '../press/ChronicleView.jsx';
import JornalView from '../press/JornalView.jsx';
import PressCenter from '../press/PressCenter.jsx';
import AnalystView from '../press/AnalystView.jsx';
import HallOfFameView from '../history/HallOfFameView.jsx';
import ErasView from '../history/ErasView.jsx';
import { computeCoachRecords } from '../../systems/coaching/CoachNarrativeSystem.js';
import { COACH_METHODS } from '../../systems/coaching/CoachIdentitySystem.js';
import InterviewView from '../press/InterviewView.jsx';
import { BROADCAST_THEME as T, SURFACE_THEME } from '../theme/uiTheme.js';
import { isTiebreakSetScore } from '../../core/constants.js';
import { roundLabelCopy } from '../../systems/radar/RadarSystem.js';
import RadarTrajectory from '../analytics/RadarTrajectory.jsx';
import { buildFollowedPlayerTimeline } from '../../systems/radar/PlayerLifeTimeline.js';
import CompaniesView from '../sponsors/CompaniesView.jsx';
import { repairLegacyArticle } from '../../core/textEncoding.js';

// """"""""""""""""""""""""""""""""""""""""""""""""""""""""""""•""""""
// HIST—RIA VIVA — DESIGN TOKENS
// """"""""""""""""""""""""""""""""""""""""""""""""""""""""""""•""""""
const SURFACE = {
  CLAY:   { ...SURFACE_THEME.CLAY, icon: '🟫' },
  GRASS:  { ...SURFACE_THEME.GRASS, icon: '🌿' },
  HARD:   { ...SURFACE_THEME.HARD, icon: '🔷' },
  INDOOR: { ...SURFACE_THEME.INDOOR, icon: '🏟️' },
};

const CAT = {
  GRAND_SLAM:      { main: '#E8C84A', label: 'Grand Slam',     icon: '⭐', pts: 2000 },
  SLAM_CLASH:      { main: '#FF8A3D', label: 'Apex Major',     icon: '✦', pts: 1250 },
  ATP_100:         { main: '#FF7043', label: 'Challenger 100', icon: '●', pts: 100 },
  ATP_75:          { main: '#A1887F', label: 'Challenger 75',  icon: '●', pts: 75 },
  ATP_50:          { main: '#BCAAA4', label: 'Challenger 50',  icon: '●', pts: 50 },
  ATP_25:          { main: '#D7CCC8', label: 'Challenger 25',  icon: '●', pts: 25 },
  MASTERS_1000:    { main: '#E040FB', label: 'Masters 1000',   icon: '◆', pts: 1000 },
  ATP_500:         { main: '#00BCD4', label: 'ATP 500',        icon: '◇', pts: 500  },
  ATP_250:         { main: '#66BB6A', label: 'ATP 250',        icon: '●', pts: 250  },
  ATP_PROSPECTS:   { main: '#FF7043', label: 'Juniors',        icon: '✦', pts: 150  },
  JUNIOR_50:       { main: '#B7B3B0', label: 'Junior 50',    icon: '●', pts: 50 },
  JUNIOR_100:      { main: '#FFB067', label: 'Junior 100',   icon: '●', pts: 100 },
  JUNIOR_SLAM:     { main: '#FFD166', label: 'Junior Slam',  icon: '★', pts: 500 },
  FINALS:          { main: '#F44336', label: 'ATP Finals',     icon: '★', pts: 1500 },
  PROSPECTS_FINALS:{ main: '#FF7043', label: 'Junior Finals',  icon: '✶', pts: 500  },
};

// """"""""""""""""""""""""""""""""""""""""""""""""""""""""""""•""""""
// CSS INJECTION
// """"""""""""""""""""""""""""""""""""""""""""""""""""""""""""•""""""
function LiveClock() {
  const [time, setTime] = React.useState(() => new Date().toLocaleTimeString('pt-BR', { hour12: false }));
  React.useEffect(() => {
    const t = setInterval(() => setTime(new Date().toLocaleTimeString('pt-BR', { hour12: false })), 1000);
    return () => clearInterval(t);
  }, []);
  return <span>{time}</span>;
}

function injectStyles() {
  if (document.getElementById('bu-styles')) return;
  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Space+Mono:wght@400;700&family=Barlow+Condensed:wght@300;400;600;700;900&family=Barlow:wght@300;400;600&display=swap');

    @keyframes bu-scan      { 0%{transform:translateY(-100vh)} 100%{transform:translateY(200vh)} }
    @keyframes bu-pulse     { 0%,100%{opacity:.3;transform:scale(1)} 50%{opacity:1;transform:scale(1.18)} }
    @keyframes bu-blink     { 0%,100%{opacity:1} 50%{opacity:.08} }
    @keyframes bu-in        { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
    @keyframes bu-wipe      { from{opacity:0;transform:translateX(-24px)} to{opacity:1;transform:translateX(0)} }
    @keyframes bu-glow-gold { 0%,100%{box-shadow:0 0 20px rgba(232,200,74,.08),inset 0 0 40px rgba(232,200,74,.02)} 50%{box-shadow:0 0 50px rgba(232,200,74,.28),inset 0 0 60px rgba(232,200,74,.06)} }
    @keyframes bu-rise      { from{opacity:0;transform:translateX(-16px)} to{opacity:1;transform:translateX(0)} }
    @keyframes bu-bar       { from{transform:scaleX(0)} to{transform:scaleX(1)} }
    @keyframes bu-dropdown  { from{opacity:0;transform:translateY(-8px) scale(.97)} to{opacity:1;transform:translateY(0) scale(1)} }
    @keyframes bu-ticker    { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
    @keyframes bu-onair     { 0%,100%{opacity:1;box-shadow:0 0 10px #FF2020,0 0 22px #FF202066} 50%{opacity:.35;box-shadow:0 0 3px #FF2020} }
    @keyframes bu-shimmer   { 0%{transform:translateX(-120%)} 100%{transform:translateX(220%)} }
    @keyframes bu-countup   { from{filter:blur(6px);opacity:0;transform:scaleY(1.2) translateY(4px)} to{filter:blur(0);opacity:1;transform:scaleY(1) translateY(0)} }
    @keyframes bu-pop       { 0%{transform:scale(0.84);opacity:0} 65%{transform:scale(1.05)} 100%{transform:scale(1);opacity:1} }
    .bu-reduce-motion *, .bu-reduce-motion *::before, .bu-reduce-motion *::after { animation-duration:.01ms !important; animation-iteration-count:1 !important; transition-duration:.01ms !important; scroll-behavior:auto !important; }
    @keyframes bu-slide-up  { from{opacity:0;transform:translateY(32px)} to{opacity:1;transform:translateY(0)} }
    @keyframes bu-orb-drift { 0%,100%{transform:translate(0,0) scale(1)} 33%{transform:translate(60px,-40px) scale(1.1)} 66%{transform:translate(-30px,30px) scale(.93)} }
    @keyframes bu-orb-drift2{ 0%,100%{transform:translate(0,0) scale(1)} 33%{transform:translate(-70px,30px) scale(.9)} 66%{transform:translate(40px,-50px) scale(1.08)} }
    @keyframes bu-sim-pulse { 0%,100%{opacity:.55} 50%{opacity:1} }

    .bu-screen {
      width:100%; min-height:100vh;
      background:#030507;
      font-family:'Barlow',sans-serif; color:#F2EDE4;
      position:relative; overflow-x:hidden;
    }

    .bu-tab {
      font-family:'Space Mono',monospace; font-size:8px; font-weight:700;
      letter-spacing:.2em; padding:0 14px; height:44px;
      border:none; background:transparent; color:rgba(242,237,228,.22);
      cursor:pointer; position:relative; transition:color .2s;
      white-space:nowrap; text-transform:uppercase; flex-shrink:0;
      display:flex; align-items:center; gap:6px;
    }
    .bu-tab:hover { color:rgba(242,237,228,.62); }
    .bu-tab.active { color:#E8C84A; }
    .bu-tab.active::after {
      content:''; position:absolute; bottom:0; left:10px; right:10px; height:2px;
      background:linear-gradient(90deg,transparent,#E8C84A 25%,#E8C84A 75%,transparent);
      box-shadow:0 0 16px rgba(232,200,74,.8);
    }
    .bu-tab.locked { color:rgba(242,237,228,.09); cursor:not-allowed; }
    .bu-tab-dot {
      width:4px; height:4px; border-radius:50%; flex-shrink:0;
      background:currentColor; opacity:.4;
    }
    .bu-tab.active .bu-tab-dot { opacity:1; animation:bu-pulse 2.5s ease-in-out infinite; }

    .bu-card {
      background:rgba(255,255,255,.02); border:1px solid rgba(255,255,255,.07);
      clip-path:polygon(8px 0%,100% 0%,calc(100% - 8px) 100%,0% 100%);
      transition:all .2s ease;
    }
    .bu-card:hover { background:rgba(255,255,255,.05); border-color:rgba(255,255,255,.14); }

    .bu-bcast-panel {
      position:relative; overflow:hidden;
      background:rgba(5,9,7,.97);
      border:1px solid rgba(255,255,255,.07);
      transition:border-color .25s ease, box-shadow .25s ease;
    }
    .bu-bcast-panel::before {
      content:''; position:absolute; inset:0; pointer-events:none;
      background:linear-gradient(110deg,transparent 28%,rgba(255,255,255,.016) 50%,transparent 72%);
      animation:bu-shimmer 6s ease-in-out infinite;
    }

    .bu-row {
      display:flex; align-items:center; gap:10px; padding:10px 14px;
      border:1px solid rgba(255,255,255,.05); background:rgba(255,255,255,.016);
      transition:all .15s ease; cursor:pointer;
      clip-path:polygon(5px 0%,100% 0%,calc(100% - 5px) 100%,0% 100%);
    }
    .bu-row:hover { background:rgba(255,255,255,.05); border-color:rgba(212,86,30,.25); transform:translateX(3px); }

    .bu-scroll::-webkit-scrollbar { width:2px; height:2px; }
    .bu-scroll::-webkit-scrollbar-track { background:transparent; }
    .bu-scroll::-webkit-scrollbar-thumb { background:rgba(212,86,30,.4); border-radius:2px; }

    .bu-back {
      font-family:'Space Mono',monospace; font-size:8px; font-weight:700;
      letter-spacing:.2em; padding:6px 14px;
      border:1px solid rgba(255,255,255,.08); background:transparent;
      color:rgba(242,237,228,.38); cursor:pointer; transition:all .15s;
      text-transform:uppercase;
      clip-path:polygon(4px 0%,100% 0%,calc(100% - 4px) 100%,0% 100%);
    }
    .bu-back:hover { border-color:rgba(232,200,74,.4); color:#E8C84A; background:rgba(232,200,74,.05); }

    .bu-section {
      font-family:'Space Mono',monospace; font-size:7.5px; font-weight:700;
      letter-spacing:.44em; color:rgba(242,237,228,.2);
      text-transform:uppercase; margin-bottom:12px;
      display:flex; align-items:center; gap:10px;
    }
    .bu-section::after {
      content:''; flex:1; height:1px; background:linear-gradient(90deg,rgba(255,255,255,.06),transparent);
    }

    .bu-stat-card {
      background:rgba(255,255,255,.018); border:1px solid rgba(255,255,255,.06);
      padding:18px 14px; text-align:center; transition:all .22s ease;
      clip-path:polygon(8px 0%,100% 0%,calc(100% - 8px) 100%,0% 100%);
    }
    .bu-stat-card:hover { border-color:rgba(232,200,74,.22); background:rgba(232,200,74,.04); }

    .bu-month-pill {
      background:rgba(255,255,255,.018); border:1px solid rgba(255,255,255,.07);
      padding:14px 12px; cursor:pointer;
      transition:all .22s cubic-bezier(.22,1,.36,1);
      display:flex; flex-direction:column; gap:5px;
      clip-path:polygon(6px 0%,100% 0%,calc(100% - 6px) 100%,0% 100%);
    }
    .bu-month-pill:hover { transform:translateY(-3px); border-color:rgba(232,200,74,.3); background:rgba(232,200,74,.04); }
    .bu-month-pill.done { opacity:.5; }
    .bu-month-pill.current { border-color:rgba(232,200,74,.45); background:rgba(232,200,74,.05); animation:bu-glow-gold 3s ease-in-out infinite; }

    .bu-construction { display:flex; flex-direction:column; align-items:center; justify-content:center; min-height:400px; gap:16px; }

    .bu-rank-num-gold   { color:#E8C84A; }
    .bu-rank-num-silver { color:#CBD5E1; }
    .bu-rank-num-bronze { color:#C97C3A; }

    .bu-fast-menu {
      position:absolute; top:calc(100% + 8px); right:0;
      background:#090D11; border:1px solid rgba(212,86,30,.22);
      min-width:272px; z-index:200;
      animation:bu-dropdown .2s cubic-bezier(.22,.68,0,1.2) both;
      box-shadow:0 24px 72px rgba(0,0,0,.95), 0 0 0 1px rgba(255,255,255,.03);
    }
    .bu-fast-opt {
      display:flex; align-items:center; gap:12px; padding:13px 16px;
      cursor:pointer; transition:background .12s;
      border-bottom:1px solid rgba(255,255,255,.04);
    }
    .bu-fast-opt:last-child { border-bottom:none; }
    .bu-fast-opt:hover { background:rgba(212,86,30,.08); }
    .bu-fast-opt-icon { font-size:18px; width:28px; text-align:center; flex-shrink:0; }
    .bu-fast-opt-label {
      font-family:'Barlow Condensed',sans-serif; font-size:13px;
      font-weight:700; letter-spacing:.12em; color:#D4561E;
      text-transform:uppercase;
    }
    .bu-fast-opt-sub {
      font-family:'Space Mono',monospace; font-size:8px;
      color:rgba(242,237,228,.22); letter-spacing:.1em; margin-top:2px;
    }

    .bu-attr-track { height:4px; background:rgba(255,255,255,.05); overflow:hidden; clip-path:polygon(2px 0,100% 0,calc(100% - 2px) 100%,0 100%); }
    .bu-attr-fill { height:100%; animation:bu-bar .6s ease both; }

    .bu-ticker-track { display:flex; gap:0; white-space:nowrap; animation:bu-ticker 34s linear infinite; }
    .bu-ticker-track:hover { animation-play-state:paused; }

    .bu-highlight {
      flex-shrink:0; width:192px;
      border:1px solid rgba(255,255,255,.06);
      background:rgba(6,10,8,.98);
      transition:all .22s cubic-bezier(.22,1,.36,1); overflow:hidden; position:relative;
    }
    .bu-highlight:hover { border-color:rgba(232,200,74,.32); transform:translateY(-6px); box-shadow:0 20px 56px rgba(0,0,0,.9), 0 0 0 1px rgba(232,200,74,.18); }

    .bu-onair {
      display:inline-flex; align-items:center; gap:5px;
      background:#BB1010; padding:3px 9px 3px 7px;
      font-family:'Space Mono',monospace; font-size:7px; font-weight:700; letter-spacing:.35em; color:#fff;
    }
    .bu-onair-dot { width:5px; height:5px; border-radius:50%; background:#fff; animation:bu-onair 0.9s ease-in-out infinite; }

    .bu-cta {
      font-family:'Space Mono',monospace; font-size:8px; font-weight:700; letter-spacing:.18em;
      padding:8px 14px; cursor:pointer; text-transform:uppercase;
      transition:all .15s ease; display:flex; align-items:center; gap:6px; border:none;
      clip-path:polygon(5px 0,100% 0,calc(100% - 5px) 100%,0 100%);
    }
    .bu-cta:disabled { opacity:.25; cursor:not-allowed; }
    .bu-cta-primary { background:rgba(212,86,30,.2); border:1px solid rgba(212,86,30,.45); color:#F06428; }
    .bu-cta-primary:hover:not(:disabled) { background:rgba(212,86,30,.38); color:#fff; }
    .bu-cta-fast { background:rgba(232,200,74,.09); border:1px solid rgba(232,200,74,.32); color:#E8C84A; }
    .bu-cta-fast:hover:not(:disabled) { background:rgba(232,200,74,.2); }
    .bu-cta-save { background:rgba(80,190,100,.07); border:1px solid rgba(80,190,100,.28); color:#5EBE78; }
    .bu-cta-save:hover:not(:disabled) { background:rgba(80,190,100,.18); }
    .bu-cta-load { background:rgba(74,144,217,.07); border:1px solid rgba(74,144,217,.28); color:#4A90D9; }
    .bu-cta-load:hover:not(:disabled) { background:rgba(74,144,217,.18); }
    .bu-cta-back { background:transparent; border:1px solid rgba(255,255,255,.09); color:rgba(242,237,228,.38); }
    .bu-cta-back:hover:not(:disabled) { border-color:rgba(232,200,74,.4); color:#E8C84A; background:rgba(232,200,74,.05); }
    .bu-cta-advance { background:rgba(46,204,113,.1); border:1px solid rgba(46,204,113,.35); color:#2ECC71; }
    .bu-cta-advance:hover:not(:disabled) { background:rgba(46,204,113,.25); }

  `;
  const el = document.createElement('style');
  el.id = 'bu-styles';
  el.textContent = css;
  document.head.appendChild(el);
}

// """"""""""""""""""""""""""""""""""""""""""""""""""""""""""""•""""""
// HELPERS
// """"""""""""""""""""""""""""""""""""""""""""""""""""""""""""•""""""
function SurfacePill({ surface, small }) {
  const s = SURFACE[surface] ?? SURFACE.HARD;
  return (
    <span style={{
      background:`${s.main}18`, border:`1px solid ${s.main}45`, color:s.light,
      fontFamily:T.mono, fontSize:small?7:8, fontWeight:700, letterSpacing:'.2em',
      padding:`2px ${small?6:8}px`, textTransform:'uppercase', whiteSpace:'nowrap',
      clipPath:'polygon(3px 0,100% 0,calc(100% - 3px) 100%,0 100%)',
    }}>
      {s.label}
    </span>
  );
}

function CatPill({ category, small }) {
  const c = CAT[category] ?? { main:'#888', label:category, icon:'•' };
  return (
    <span style={{
      background:`${c.main}15`, border:`1px solid ${c.main}40`, color:c.main,
      fontFamily:T.mono, fontSize:small?7:8, fontWeight:700, letterSpacing:'.2em',
      padding:`2px ${small?6:8}px`, textTransform:'uppercase', whiteSpace:'nowrap',
      clipPath:'polygon(3px 0,100% 0,calc(100% - 3px) 100%,0 100%)',
    }}>
      {c.label}
    </span>
  );
}

function PlayerAvatar({ player, size = 32, showRank, rank, highlight }) {
  if (!player) return null;
  const ovr = overallRating(player.attrs);
  const borderColor = highlight ? T.gold : (player.color ? `${player.color}88` : T.border);
  return (
    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
      <PlayerFace player={player} size={size} borderColor={borderColor} shadow={highlight ? `0 0 10px ${T.goldFaint}` : undefined} />
      <div>
        <div style={{ fontFamily:T.cond, fontSize:14, fontWeight:700, color:highlight ? T.gold : T.white, letterSpacing:'.06em', textTransform:'uppercase', lineHeight:1.2 }}>
          {player.name}
        </div>
        <div style={{ fontFamily:T.mono, fontSize:8, color:T.faint, letterSpacing:'.18em', marginTop:2 }}>
          {player.nationality}{player.styleId ? ` · ${player.styleId}` : ''} · {ovrTier(ovr).grade}
        </div>
      </div>
      {showRank && rank && (
        <span style={{ fontFamily:T.disp, fontSize:14, color:rank <= 8 ? T.gold : T.dim, marginLeft:4, letterSpacing:'.06em' }}>#{rank}</span>
      )}
    </div>
  );
}

// — Foto do jogador com fallback para iniciais —
function PlayerFace({ player, size = 28, borderColor, shadow }) {
  const photo = getPlayerPhoto(player?.namedPlayerKey || player);
  const [imgOk, setImgOk] = React.useState(!!photo);
  const bc = borderColor || (player?.color ? `${player.color}66` : 'rgba(255,255,255,.15)');
  const initials = player?.name?.slice(0, 2)?.toUpperCase() ?? '?';
  const sizeStyle = { width: size, height: size, borderRadius: '50%', flexShrink: 0, overflow: 'hidden', border: `1.5px solid ${bc}`, boxShadow: shadow || 'none', background: player?.color || '#1a2a1a' };
  if (photo && imgOk) {
    return (
      <div style={{ ...sizeStyle, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <img src={photo} alt={player?.name} onError={() => setImgOk(false)}
          style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center' }} />
      </div>
    );
  }
  return (
    <div style={{ ...sizeStyle, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.35, fontWeight: 700, color: '#fff', fontFamily: T.disp }}>
      {initials}
    </div>
  );
}

function TournamentIcon({ tournament, size = 28 }) {
  const s = SURFACE[tournament.surface] ?? SURFACE.HARD;
  return (
    <div style={{ width:size, height:size, borderRadius:'50%', background:`${s.main}22`, border:`1px solid ${s.main}55`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:size * 0.5, flexShrink:0 }}>
      {tournament.icon}
    </div>
  );
}

// """"""""""""""""""""""""""""""""""""""""""""""""""""""""""""•""""""
// CONSTRUÇÃO VIEW (reutilizável)
// """"""""""""""""""""""""""""""""""""""""""""""""""""""""""""•""""""
function ConstructionView({ label, icon = '🛠️' }) {
  return (
    <div className="bu-construction">
      <div style={{ fontSize:48, filter:'grayscale(.5)' }}>{icon}</div>
      <div style={{ fontFamily:T.disp, fontSize:28, color:'rgba(242,237,228,.12)', letterSpacing:'.1em', textTransform:'uppercase' }}>Em Construção</div>
      <div style={{ fontFamily:T.mono, fontSize:9, color:'rgba(242,237,228,.1)', letterSpacing:'.36em' }}>{label?.toUpperCase()}</div>
    </div>
  );
}

// """"""""""""""""""""""""""""""""""""""""""""""""""""""""""""•""""""
// WAR ROOM — sub-components
// """"""""""""""""""""""""""""""""""""""""""""""""""""""""""""•""""""

// Mapeia tipo de artigo para cor e ícone (fallback seguro)
const NEWS_COLOR = {
  BREAKING:        { c: '#FF5252', i: '⚠',  label: 'Breaking News' },
  PREVIEW:         { c: '#5CB8E4', i: '🗓️', label: 'Pré-Torneio'   },
  PREDICTION:      { c: '#26C6DA', i: '◎',  label: 'Palpite'       },
  CHAMPION:        { c: '#E8C84A', i: '🏆', label: 'Campeão'       },
  UPSET:           { c: '#FF6B35', i: '⚡', label: 'Zebra'         },
  EPIC_MATCH:      { c: '#EF5350', i: '🔥', label: 'Duelo Épico'   },
  RIVALRY:         { c: '#E040FB', i: '⚔️', label: 'Rivalidade'    },
  RECORD:          { c: '#2ECC71', i: '◆',  label: 'Recorde'       },
  INJURY:          { c: '#F44336', i: '✚',  label: 'Lesão'         },
  COMEBACK:        { c: '#00BCD4', i: '↩',  label: 'Retorno'       },
  PROSPECT:        { c: '#66BB6A', i: '🌱', label: 'Revelação'     },
  RETIREMENT:      { c: '#90A4AE', i: '◼',  label: 'Aposentadoria' },
  ANALYSIS:        { c: '#4A90D9', i: '◫',  label: 'Análise'       },
  COLUMN:          { c: '#D4A017', i: '✎',  label: 'Coluna'        },
  RUMOR:           { c: '#AB47BC', i: '◌',  label: 'Rumor'         },
  TOURNAMENT_WRAP: { c: '#5CB8E4', i: '▣',  label: 'Balanço'       },
};

function getEditorialWeight(article) {
  if (!article) return -1;
  const typeBoost = {
    BREAKING: 120,
    CHAMPION: 80,
    RETIREMENT: 76,
    UPSET: 72,
    EPIC_MATCH: 68,
    INJURY: 62,
    COMEBACK: 58,
    PREVIEW: 46,
    PREDICTION: 42,
    TOURNAMENT_WRAP: 38,
  }[article.type] ?? 34;
  const categoryBoost = {
    GRAND_SLAM: 18,
    FINALS: 16,
    MASTERS_1000: 10,
    ATP_500: 6,
    ATP_250: 4,
  }[article.tournament?.category] ?? 0;
  const freshness = Math.max(0, 12 - ((Date.now() - (article.createdAt ?? Date.now())) / (1000 * 60 * 60)));
  return typeBoost + categoryBoost + freshness;
}

function buildCircuitBriefs({ nextT, leader, seasonLeaders, latestBreakingArticle, bySurface, year }) {
  const briefs = [];
  if (latestBreakingArticle) briefs.push({ key:'breaking-case', kicker:'caso em andamento', text:latestBreakingArticle.headline, accent:'#FF5252' });
  if (nextT) briefs.push({ key:'next-tournament', kicker:'janela do próximo torneio', text:`${nextT.name} abre o próximo ciclo em ${nextT.location ?? 'local indefinido'}.`, accent:(SURFACE[nextT.surface] ?? SURFACE.HARD).light });
  if (leader) briefs.push({ key:'leader', kicker:'líder do mundo', text:`${leader.name} segue como referência principal da temporada ${year}.`, accent:T.gold });
  if (seasonLeaders[0]?.player) briefs.push({ key:'titles', kicker:'caça aos títulos', text:`${seasonLeaders[0].player.name} lidera a corrida com ${seasonLeaders[0].titles} título${seasonLeaders[0].titles > 1 ? 's' : ''}.`, accent:T.clayLight });
  const dominantSurface = Object.entries(bySurface ?? {}).sort((a, b) => b[1] - a[1])[0];
  if (dominantSurface) {
    const surf = SURFACE[dominantSurface[0]] ?? SURFACE.HARD;
    briefs.push({ key:'surface', kicker:'temperatura da temporada', text:`${surf.label} já recebeu ${dominantSurface[1]} torneio${dominantSurface[1] > 1 ? 's' : ''} e começa a desenhar a cara do ano.`, accent:surf.light });
  }
  return briefs.slice(0, 5);
}

function summarizeRace(race) {
  if (!race) return null;
  const leaders = (race.contenders ?? []).slice(0, 2).map(entry => entry?.player?.name).filter(Boolean);
  if (leaders.length >= 2) return `${leaders[0]} e ${leaders[1]} puxam ${race.label.toLowerCase()}.`;
  if (leaders.length === 1) return `${leaders[0]} aparece no centro de ${race.label.toLowerCase()}.`;
  return race.summary ?? null;
}

function buildEditorialEdition({
  latestBreakingArticle,
  heroArticle,
  seasonAct,
  tournamentChapter,
  featuredRace,
  nextT,
  pressureLineup = [],
  seasonLeaders = [],
  leader = null,
  year = null,
}) {
  const topPressure = pressureLineup[0] ?? null;
  const titleLeader = seasonLeaders?.[0]?.player ?? leader ?? null;
  const chapterSummary = tournamentChapter?.summary ?? seasonAct?.summary ?? null;
  const raceSummary = summarizeRace(featuredRace);

  if (latestBreakingArticle) {
    return {
      leadType: 'BREAKING',
      title: latestBreakingArticle.headline,
      contextLine: latestBreakingArticle.deck ?? chapterSummary ?? 'O circuito inteiro reage ao capítulo mais urgente da semana.',
      reasonLine: chapterSummary ?? latestBreakingArticle.body?.split('\n')?.[0] ?? 'A narrativa principal do momento já está alterando a leitura pública do circuito.',
      temperatureLabel: 'reação imediata',
      oneThingLine: latestBreakingArticle.deck ?? latestBreakingArticle.headline,
    };
  }

  if (heroArticle) {
    return {
      leadType: heroArticle.type,
      title: heroArticle.headline,
      contextLine: heroArticle.deck ?? chapterSummary ?? raceSummary ?? 'A edição do dia se organiza ao redor da história mais pesada do circuito.',
      reasonLine: chapterSummary ?? raceSummary ?? heroArticle.body?.split('\n')?.[0] ?? 'O momento atual começa a definir como o próximo capítulo será lido.',
      temperatureLabel: tournamentChapter?.label?.toLowerCase?.() ?? seasonAct?.label?.toLowerCase?.() ?? 'pressão crescente',
      oneThingLine: heroArticle.deck ?? chapterSummary ?? raceSummary ?? 'O estado do circuito está mudando mais pela narrativa do que pelo placar cru.',
    };
  }

  if (tournamentChapter) {
    return {
      leadType: 'CHAPTER',
      title: tournamentChapter.label,
      contextLine: tournamentChapter.summary,
      reasonLine: raceSummary ?? chapterSummary ?? 'O próximo trecho do calendário já começa a reorganizar a cobrança do circuito.',
      temperatureLabel: tournamentChapter.label.toLowerCase(),
      oneThingLine: tournamentChapter.summary,
    };
  }

  if (featuredRace) {
    return {
      leadType: 'RACE',
      title: featuredRace.label,
      contextLine: featuredRace.summary ?? raceSummary ?? 'A temporada já tem uma disputa grande o suficiente para puxar a atenção do circuito.',
      reasonLine: raceSummary ?? `A corrida ganha peso conforme ${nextT?.name ?? 'o próximo torneio'} se aproxima.`,
      temperatureLabel: 'corrida em formação',
      oneThingLine: featuredRace.summary ?? raceSummary,
    };
  }

  if (topPressure) {
    return {
      leadType: 'PRESSURE',
      title: `${topPressure.name} entra no foco`,
      contextLine: `${topPressure.name} chega como nome mais sensível do próximo trecho do circuito.`,
      reasonLine: `${topPressure.name} aparece na linha de fogo da semana e pode mudar a leitura pública com uma única campanha forte ou fraca.`,
      temperatureLabel: 'pressão concentrada',
      oneThingLine: `${topPressure.name} é hoje o melhor termômetro para entender o humor competitivo do circuito.`,
    };
  }

  if (titleLeader) {
    return {
      leadType: 'SEASON',
      title: `${titleLeader.name} dita o tom de ${year ?? 'agora'}`,
      contextLine: `${titleLeader.name} continua organizando a leitura da temporada no topo do circuito.`,
      reasonLine: nextT ? `${nextT.name} vai ajudar a dizer se a vantagem atual é domínio real ou só uma boa largada.` : 'O calendário ainda vai mostrar o quanto essa liderança é estável.',
      temperatureLabel: 'temporada ganhando forma',
      oneThingLine: `${titleLeader.name} é hoje a referência que o resto do circuito precisa encarar.`,
    };
  }

  return {
    leadType: 'OPEN',
    title: 'A redação espera a primeira grande ruptura',
    contextLine: 'O circuito ainda está juntando peças antes de entregar uma história dominante.',
    reasonLine: nextT ? `${nextT.name} pode ser o primeiro torneio a realmente dar uma cara para a temporada.` : 'A próxima sequência de torneios vai começar a definir quem merece o centro da capa.',
    temperatureLabel: 'calma instável',
    oneThingLine: 'Ainda não há manchete dominante, mas o universo já está pronto para reagir quando ela nascer.',
  };
}

function buildNarrativeMap({ players = [], seasonLeaders = [], leader = null }) {
  const pool = [...players].filter(Boolean);
  const byPressure = [...pool]
    .filter((player) => (player?.currentState?.pressureLevel ?? 0) >= 55)
    .sort((a, b) => (b?.currentState?.pressureLevel ?? 0) - (a?.currentState?.pressureLevel ?? 0));

  const byNarrativeHeat = [...pool]
    .filter((player) => player?.publicNarrativeMemory?.publicNarrative?.line)
    .sort((a, b) => (b?.publicNarrativeMemory?.intensity ?? 0) - (a?.publicNarrativeMemory?.intensity ?? 0));

  const inForm = [...seasonLeaders.map(({ player }) => player), ...pool.filter((player) => {
    const mood = player?.currentState?.mood ?? '';
    return /CONFIDENT|GALVANIZED|VINDICATED|DOMINANT/i.test(mood);
  })]
    .filter((player, index, array) => player && array.findIndex((entry) => entry?.id === player?.id) === index)
    .slice(0, 4);

  const vulnerable = byPressure
    .filter((player) => /FRUSTRATED|VULNERABLE|OVERWHELMED/i.test(player?.currentState?.mood ?? '') || /pressão|pressao|ferida|tropeço|tropeco|rótulo|rotulo/i.test(player?.publicNarrativeMemory?.publicNarrative?.line ?? ''))
    .slice(0, 4);

  const targets = [...seasonLeaders.map(({ player }) => player), leader]
    .filter((player, index, array) => player && array.findIndex((entry) => entry?.id === player?.id) === index)
    .slice(0, 4);

  const buildLine = (player, fallback) =>
    player?.publicNarrativeMemory?.publicNarrative?.line
    ?? player?.currentState?.publicNarrative
    ?? player?.latestInterview?.quote
    ?? fallback;

  return {
    ascension: inForm.map((player) => ({
      player,
      line: buildLine(player, `${player.name} está empurrando a própria leitura para cima.`),
    })),
    vulnerable: vulnerable.map((player) => ({
      player,
      line: buildLine(player, `${player.name} entra na semana com pressão acumulada.`),
    })),
    targets: targets.map((player) => ({
      player,
      line: buildLine(player, `${player.name} já não entra mais fora do foco do circuito.`),
    })),
    publicDebate: byNarrativeHeat.slice(0, 4).map((player) => ({
      player,
      line: buildLine(player, `${player.name} está no centro da conversa pública.`),
    })),
  };
}

function trimEditorialSections({
  latestBreakingArticle,
  secondaryArticles = [],
  circuitBriefs = [],
  editorialNotes = [],
  pressureLineup = [],
  topRivalries = [],
  seasonLeaders = [],
  spotlightPlayers = [],
  narrativeMap,
}) {
  const heatLevel =
    (latestBreakingArticle ? 3 : 0)
    + Math.min(2, secondaryArticles.length >= 3 ? 2 : secondaryArticles.length)
    + Math.min(2, pressureLineup.length)
    + Math.min(2, (narrativeMap?.publicDebate?.length ?? 0));

  const isHighHeat = heatLevel >= 6;
  const isLowHeat = heatLevel <= 2;

  return {
    isHighHeat,
    isLowHeat,
    visibleBriefs: isHighHeat ? circuitBriefs.slice(0, 2) : circuitBriefs.slice(0, 4),
    visibleNotes: isHighHeat ? editorialNotes.slice(0, 3) : editorialNotes.slice(0, 4),
    visibleSecondary: isLowHeat ? secondaryArticles.slice(0, 2) : secondaryArticles.slice(0, 3),
    visibleRivalries: isHighHeat ? topRivalries.slice(0, 3) : topRivalries.slice(0, 5),
    visibleSeasonLeaders: isHighHeat ? seasonLeaders.slice(0, 3) : seasonLeaders.slice(0, 4),
    visibleSpotlights: isHighHeat ? spotlightPlayers.slice(0, 3) : spotlightPlayers.slice(0, 4),
    showNarrativeGrid: !isLowHeat || !!latestBreakingArticle,
  };
}

function BreakingNewsOverlay({ article, onDismiss, onOpen }) {
  if (!article) return null;
  const accent = '#FF5252';
  return (
    <div style={{ position:'fixed', inset:0, zIndex:1200, background:'rgba(3,5,7,.78)', backdropFilter:'blur(10px)', display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}>
      <div style={{ width:'min(920px, 94vw)', background:'linear-gradient(180deg, rgba(18,10,10,.98) 0%, rgba(8,10,14,.98) 100%)', border:`1px solid ${accent}55`, boxShadow:`0 24px 90px rgba(0,0,0,.85), 0 0 0 1px ${accent}22`, position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', inset:0, background:`radial-gradient(circle at 85% 15%, ${accent}22, transparent 40%)`, pointerEvents:'none' }} />
        <div style={{ display:'flex', alignItems:'center', gap:10, padding:'16px 22px', borderBottom:`1px solid ${accent}33`, background:`linear-gradient(90deg, ${accent}22, transparent)` }}>
          <span className="bu-onair"><span className="bu-onair-dot" />BREAKING NEWS</span>
          <span style={{ fontFamily:T.mono, fontSize:8, letterSpacing:'.22em', color:`${accent}CC`, textTransform:'uppercase' }}>{article.tournament?.name?.toUpperCase?.() ?? 'Circuito Mundial'}</span>
        </div>
        <div style={{ padding:'26px 26px 22px' }}>
          <div style={{ fontFamily:T.disp, fontSize:'clamp(32px,4.8vw,64px)', letterSpacing:'.04em', color:T.white, lineHeight:1.02, textTransform:'uppercase', marginBottom:14 }}>
            {article.headline}
          </div>
          {article.deck && <div style={{ fontFamily:T.cond, fontSize:20, color:T.dim, lineHeight:1.5, marginBottom:18 }}>{article.deck}</div>}
          <div style={{ fontFamily:T.body, fontSize:15, color:'rgba(242,237,228,.6)', lineHeight:1.8, marginBottom:20 }}>
            {article.body?.split('\n').slice(0, 2).join(' ') ?? 'O circuito inteiro reage. A cobertura completa já domina a redação do dia.'}
          </div>
          <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
            <button className="bu-cta bu-cta-primary" onClick={onOpen}><span>▶</span><span>Abrir cobertura</span></button>
            <button className="bu-cta bu-cta-fast" onClick={onDismiss}><span>→</span><span>Continuar</span></button>
            <button className="bu-cta bu-cta-back" onClick={onDismiss}>Fechar alerta</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function NewsTypePill({ type, small }) {
  const cfg = NEWS_COLOR[type] ?? { c: T.faint, i: '·', label: type };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      fontFamily: T.mono, fontSize: small ? 7 : 8, letterSpacing: '.16em',
      textTransform: 'uppercase', padding: small ? '2px 5px' : '3px 8px',
      background: `${cfg.c}12`, border: `1px solid ${cfg.c}33`, color: cfg.c,
      whiteSpace: 'nowrap', flexShrink: 0,
    }}>
      {cfg.i} {cfg.label}
    </span>
  );
}

// Artigo hero — ocupa posição de destaque
function NewsHero({ article, onClick }) {
  if (!article) return null;
  const cfg = NEWS_COLOR[article.type] ?? { c: T.gold, i: '•', label: '' };
  const sc = article.tournament?.surface ? (SURFACE[article.tournament.surface] ?? SURFACE.HARD) : null;

  return (
    <div onClick={onClick} style={{
      background: 'rgba(255,255,255,.022)', border: `1px solid ${cfg.c}28`,
      borderLeft: `3px solid ${cfg.c}`, padding: '22px 24px',
      cursor: onClick ? 'pointer' : 'default', position: 'relative', overflow: 'hidden',
      transition: 'all .2s ease',
    }}
      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,.045)'; e.currentTarget.style.borderColor = `${cfg.c}55`; }}
      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,.022)'; e.currentTarget.style.borderColor = `${cfg.c}28`; }}
    >
      {sc && <div style={{ position:'absolute', top:0, right:0, width:'30%', height:'100%', background:`radial-gradient(ellipse at 100% 50%, ${sc.main}11, transparent 70%)`, pointerEvents:'none' }} />}
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
        <NewsTypePill type={article.type} />
        {article.tournament && <span style={{ fontFamily:T.mono, fontSize:7, color:T.faint, letterSpacing:'.22em' }}>{article.tournament.name?.toUpperCase()}</span>}
        {article.journalist && <span style={{ marginLeft:'auto', fontFamily:T.mono, fontSize:7, color:`${cfg.c}99`, letterSpacing:'.14em' }}>{article.journalist.icon} {article.journalist.name}</span>}
      </div>
      <div style={{ fontFamily:T.disp, fontSize:'clamp(20px,2.5vw,30px)', letterSpacing:'.03em', color:T.white, lineHeight:1.1, marginBottom:8, textTransform:'uppercase' }}>
        {article.headline}
      </div>
      {article.deck && (
        <div style={{ fontFamily:T.cond, fontSize:13, fontWeight:400, color:T.dim, lineHeight:1.55, marginBottom:14 }}>
          {article.deck}
        </div>
      )}
      {article.body && (
        <div style={{ fontFamily:T.body, fontSize:12, color:'rgba(242,237,228,.4)', lineHeight:1.7, display:'-webkit-box', WebkitLineClamp:3, WebkitBoxOrient:'vertical', overflow:'hidden' }}>
          {article.body}
        </div>
      )}
      <div style={{ marginTop:12, fontFamily:T.mono, fontSize:7, color:`${cfg.c}77`, letterSpacing:'.24em', textTransform:'uppercase' }}>
        LER MAIS ⬺
      </div>
    </div>
  );
}

// Artigo card — versão compacta para o grid
function NewsCard({ article, onClick, accent }) {
  if (!article) return null;
  const cfg = NEWS_COLOR[article.type] ?? { c: T.faint, i: '•', label: '' };
  const color = accent ?? cfg.c;

  return (
    <div onClick={onClick} style={{
      background: 'rgba(255,255,255,.018)', border: `1px solid rgba(255,255,255,.06)`,
      borderTop: `2px solid ${color}55`, padding: '14px 16px',
      cursor: onClick ? 'pointer' : 'default', transition: 'all .18s ease',
    }}
      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,.04)'; e.currentTarget.style.borderTopColor = color; }}
      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,.018)'; e.currentTarget.style.borderTopColor = `${color}55`; }}
    >
      <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:8 }}>
        <NewsTypePill type={article.type} small />
        {article.tournament && <span style={{ fontFamily:T.mono, fontSize:6.5, color:T.faint, letterSpacing:'.18em', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{article.tournament.name?.toUpperCase()}</span>}
      </div>
      <div style={{ fontFamily:T.disp, fontSize:14, letterSpacing:'.04em', color:T.white, textTransform:'uppercase', lineHeight:1.15, marginBottom:6 }}>
        {article.headline}
      </div>
      {article.deck && (
        <div style={{ fontFamily:T.cond, fontSize:11.5, color:T.faint, lineHeight:1.5, display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>
          {article.deck}
        </div>
      )}
      {article.journalist && (
        <div style={{ marginTop:8, fontFamily:T.mono, fontSize:6.5, color:`${color}88`, letterSpacing:'.14em' }}>
          {article.journalist.icon} {article.journalist.name}
        </div>
      )}
    </div>
  );
}

// Rivalry flash — banner de rivalidade
function RivalryFlash({ rivalry, allPlayers }) {
  if (!rivalry) return null;
  const p1 = allPlayers?.find(p => p.id === rivalry.p1Id);
  const p2 = allPlayers?.find(p => p.id === rivalry.p2Id);
  if (!p1 || !p2) return null;
  const cfg = { c:'#E040FB' };
  return (
    <div style={{
      display:'flex', alignItems:'center', gap:10, padding:'10px 14px',
      background:'rgba(224,64,251,.04)', border:'1px solid rgba(224,64,251,.15)',
      borderLeft:'2px solid rgba(224,64,251,.6)',
    }}>
      <span style={{ fontSize:12 }}>⚔️</span>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontFamily:T.cond, fontSize:12, fontWeight:700, color:'rgba(242,237,228,.8)', textTransform:'uppercase', letterSpacing:'.06em', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
          {p1.name.split(' ').pop()} <span style={{ color:'#E040FB', opacity:.7 }}>vs</span> {p2.name.split(' ').pop()}
        </div>
        <div style={{ fontFamily:T.mono, fontSize:7, color:T.faint, letterSpacing:'.14em' }}>
          {rivalry.wins1}–{rivalry.wins2} · {rivalry.label ?? rivalry.type}
        </div>
      </div>
      <div style={{ fontFamily:T.disp, fontSize:18, color:'#E040FB', lineHeight:1 }}>{rivalry.total}</div>
      <div style={{ fontFamily:T.mono, fontSize:6.5, color:T.faint }}>DUELOS</div>
    </div>
  );
}

// """"""""""""""""""""""""""""""""""""""""""""""""""""""""""""•""""""
// GERAL VIEW — War Room
// """"""""""""""""""""""""""""""""""""""""""""""""""""""""""""•""""""
function NewsroomCommandDeck({ year, calendarIndex, total, pct, heroArticle, orderedFeed, leader, leaderPts, top8, seasonLeaders, nextT, nextSurf, onViewBracket, onSimulate, simulating, simProgress, onOpenArticle, onOpenTab, onOpenProfile }) {
  const metrics = [
    ['cobertura', orderedFeed.length, 'peças no arquivo'],
    ['líder', leader ? `#1` : '—', leader?.name ?? 'ranking em formação'],
    ['títulos', seasonLeaders[0]?.titles ?? 0, seasonLeaders[0]?.player?.name ?? 'ninguém isolado'],
  ];
  return <div style={{ padding:'24px 28px 30px', maxWidth:1540, margin:'0 auto', animation:'bu-slide-up .35s ease both' }}>
    <div style={{ display:'grid', gridTemplateColumns:'minmax(0,1.55fr) minmax(310px,.58fr)', gap:14, alignItems:'stretch' }}>
      <section style={{ minHeight:390, padding:'clamp(24px,3vw,42px)', position:'relative', overflow:'hidden', border:'1px solid rgba(232,200,74,.22)', background:'linear-gradient(140deg, rgba(232,200,74,.10), rgba(255,255,255,.018) 48%, rgba(0,0,0,.18))' }}>
        <div style={{ position:'absolute', inset:'auto -8% -42% auto', width:440, height:440, borderRadius:'50%', background:`radial-gradient(circle, ${(nextSurf?.main ?? T.gold)}22, transparent 68%)`, pointerEvents:'none' }} />
        <div style={{ position:'relative', zIndex:1, display:'flex', gap:10, alignItems:'center', fontFamily:T.mono, fontSize:8, letterSpacing:'.25em', color:T.gold, textTransform:'uppercase' }}><span className="bu-onair"><span className="bu-onair-dot" />redação ao vivo</span> temporada {year} · {calendarIndex}/{total}</div>
        <div style={{ position:'relative', zIndex:1, fontFamily:T.mono, fontSize:8, letterSpacing:'.3em', color:T.faint, textTransform:'uppercase', marginTop:36 }}>a pauta que organiza o circuito</div>
        <h1 style={{ position:'relative', zIndex:1, fontFamily:T.disp, fontSize:'clamp(42px,5.4vw,80px)', lineHeight:.9, letterSpacing:'.02em', textTransform:'uppercase', color:T.white, maxWidth:940, margin:'12px 0 14px' }}>{heroArticle?.headline ?? 'O circuito aguarda a primeira história grande.'}</h1>
        <div style={{ position:'relative', zIndex:1, maxWidth:790, fontFamily:T.body, fontSize:16, color:T.dim, lineHeight:1.65 }}>{heroArticle?.deck ?? 'Simule o próximo torneio para a redação transformar resultados em uma história viva, comparável e com memória.'}</div>
        {heroArticle?.statLine && <div style={{ position:'relative', zIndex:1, marginTop:20, padding:'12px 14px', maxWidth:750, borderLeft:`3px solid ${T.gold}`, background:'rgba(232,200,74,.08)', fontFamily:T.mono, fontSize:8, lineHeight:1.65, letterSpacing:'.1em', color:'rgba(242,237,228,.72)' }}>{heroArticle.statLine}</div>}
        {heroArticle && <button onClick={() => onOpenArticle(heroArticle)} style={{ position:'relative', zIndex:1, marginTop:22, padding:'11px 15px', fontFamily:T.mono, fontWeight:700, fontSize:8, letterSpacing:'.16em', textTransform:'uppercase', border:`1px solid ${T.gold}77`, background:'rgba(232,200,74,.1)', color:T.gold, cursor:'pointer' }}>abrir matéria de capa →</button>}
      </section>
      <aside style={{ display:'grid', gridTemplateRows:'auto auto 1fr', gap:14 }}>
        <div style={{ padding:'18px', border:'1px solid rgba(255,255,255,.08)', background:'rgba(255,255,255,.018)' }}><div style={{ fontFamily:T.mono, fontSize:7, letterSpacing:'.24em', textTransform:'uppercase', color:T.faint, marginBottom:12 }}>estado da temporada</div><div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>{metrics.map(([label,value,detail]) => <div key={label} style={{ minWidth:0 }}><div style={{ fontFamily:T.disp, fontSize:30, color:T.gold, lineHeight:.9 }}>{value}</div><div style={{ fontFamily:T.mono, fontSize:6.5, color:T.faint, letterSpacing:'.14em', textTransform:'uppercase', marginTop:6 }}>{label}</div><div style={{ fontFamily:T.body, fontSize:11, color:T.dim, marginTop:4, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{detail}</div></div>)}</div></div>
        <div style={{ padding:'18px', border:'1px solid rgba(255,255,255,.08)', background:'rgba(255,255,255,.018)' }}><div style={{ display:'flex', justifyContent:'space-between', fontFamily:T.mono, fontSize:7, letterSpacing:'.2em', color:T.faint, textTransform:'uppercase' }}><span>temporada em curso</span><span>{pct}%</span></div><div style={{ height:5, marginTop:10, background:'rgba(255,255,255,.06)' }}><div style={{ height:'100%', width:`${pct}%`, background:`linear-gradient(90deg,${T.clay},${T.gold})` }} /></div></div>
        <div style={{ padding:'18px', border:'1px solid rgba(255,255,255,.08)', background:'rgba(255,255,255,.018)' }}><div style={{ fontFamily:T.mono, fontSize:7, letterSpacing:'.24em', textTransform:'uppercase', color:T.faint, marginBottom:10 }}>próximo compromisso</div>{nextT ? <><div style={{ fontFamily:T.disp, fontSize:27, color:T.white, textTransform:'uppercase', lineHeight:1 }}>{nextT.name}</div><div style={{ display:'flex', gap:7, marginTop:10, flexWrap:'wrap' }}><CatPill category={nextT.category} small /><SurfacePill surface={nextT.surface} small /></div><div style={{ display:'flex', gap:8, marginTop:16 }}><button onClick={() => onViewBracket?.(nextT)} disabled={simulating} className="bu-cta bu-cta-load" style={{ flex:1, justifyContent:'center' }}>chave</button><button onClick={() => onSimulate?.()} disabled={simulating} className="bu-cta bu-cta-primary" style={{ flex:1, justifyContent:'center' }}>{simulating ? `${simProgress}...` : 'simular'}</button></div></> : <div style={{ fontFamily:T.cond, fontSize:18, color:T.grassLight, textTransform:'uppercase' }}>temporada concluída</div>}</div>
      </aside>
    </div>
    <div style={{ display:'grid', gridTemplateColumns:'minmax(0,1fr) minmax(300px,.52fr)', gap:14, marginTop:14 }}>
      <section style={{ border:'1px solid rgba(255,255,255,.08)', background:'rgba(255,255,255,.018)', padding:'18px' }}><div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', gap:12, marginBottom:13 }}><div style={{ fontFamily:T.mono, fontSize:8, letterSpacing:'.24em', textTransform:'uppercase', color:T.faint }}>mesa de dados</div><button onClick={() => onOpenTab?.('analistas')} style={{ border:0, background:'transparent', color:T.gold, cursor:'pointer', fontFamily:T.mono, fontSize:7, letterSpacing:'.16em', textTransform:'uppercase' }}>ver análises →</button></div><div style={{ display:'grid', gridTemplateColumns:'repeat(3,minmax(0,1fr))', gap:10 }}>{orderedFeed.slice(1,4).map((article,index) => <button key={article.id ?? index} onClick={() => onOpenArticle(article)} style={{ textAlign:'left', minHeight:138, padding:'13px 14px', cursor:'pointer', border:`1px solid ${(NEWS_COLOR[article.type]?.c ?? T.gold)}55`, borderTop:`3px solid ${(NEWS_COLOR[article.type]?.c ?? T.gold)}`, background:'rgba(255,255,255,.018)' }}><div style={{ fontFamily:T.mono, fontSize:7, color:T.faint, letterSpacing:'.16em', textTransform:'uppercase' }}>{article.journalist?.name ?? 'redação de dados'}</div><div style={{ fontFamily:T.cond, fontSize:18, color:T.white, textTransform:'uppercase', lineHeight:1.08, marginTop:9 }}>{article.headline}</div><div style={{ fontFamily:T.mono, fontSize:7, color:T.dim, lineHeight:1.5, marginTop:9 }}>{article.statLine ?? article.deck}</div></button>)}</div></section>
      <section style={{ border:'1px solid rgba(255,255,255,.08)', background:'rgba(255,255,255,.018)', padding:'18px' }}><div style={{ fontFamily:T.mono, fontSize:8, letterSpacing:'.24em', textTransform:'uppercase', color:T.faint, marginBottom:13 }}>topo em disputa</div><div style={{ display:'grid', gap:8 }}>{top8.slice(0,4).map(({ player, pts }, index) => <button key={player.id} onClick={() => onOpenProfile?.(player)} style={{ display:'grid', gridTemplateColumns:'30px 1fr auto', alignItems:'center', gap:9, padding:'7px 0', border:'none', borderBottom:index === 3 ? 'none' : '1px solid rgba(255,255,255,.06)', background:'transparent', cursor:'pointer', textAlign:'left' }} title={`Abrir ficha de ${player.name}`}><div style={{ fontFamily:T.disp, fontSize:22, color:index === 0 ? T.gold : T.dim }}>#{index + 1}</div><PlayerAvatar player={player} size={27} /><div style={{ fontFamily:T.mono, fontSize:8, color:T.faint }}>{pts.toLocaleString()}</div></button>)}</div></section>
    </div>
  </div>;
}

function GeralView({ state, onViewBracket, onSimulate, onFastSimulate, simulating, simProgress, onOpenTab, onOpenProfile }) {
  const { tourPlayers, prospects, rankingStore, tournamentResults, calendarIndex, year } = state;
  const [selectedArticle, setSelectedArticle] = React.useState(null);

  const playerMap    = Object.fromEntries(tourPlayers.map(p => [p.id, p]));
  const prospectMap  = Object.fromEntries(prospects.map(p => [p.id, p]));
  const allPlayers   = [...tourPlayers, ...prospects];
  const completed    = Object.values(tournamentResults);
  const total        = CALENDAR.length;
  const pct          = total > 0 ? Math.round((calendarIndex / total) * 100) : 0;
  const nextT        = CALENDAR[calendarIndex];
  const isSeasonDone = calendarIndex >= total;

  const feed = (state?.newsEngine?.feed ?? []).map(repairLegacyArticle);
  const orderedFeed = [...feed].sort((a, b) => getEditorialWeight(b) - getEditorialWeight(a));
  const latestBreakingArticle = orderedFeed.find(article => article?.type === 'BREAKING') ?? null;
  const heroArticle = orderedFeed[0] ?? null;
  const secondaryArticles = orderedFeed.slice(1, 4);
  const sidebarArticles = orderedFeed.slice(4, 8);

  const leader    = rankingStore.ranked.length > 0 ? playerMap[rankingStore.ranked[0].playerId] : null;
  const leaderPts = rankingStore.ranked[0]?.points ?? 0;
  const top8      = rankingStore.ranked.slice(0, 8)
    .map(r => ({ player: playerMap[r.playerId] ?? prospectMap[r.playerId], pts: r.points }))
    .filter(e => e.player);

  const recentWins = completed
    .filter(r => r._slim ? r.champion : r.bracket?.champion)
    .slice(-12).reverse();

  const champCount = {};
  completed.forEach(r => {
    const c = r._slim ? r.champion : r.bracket?.champion;
    if (c) champCount[c.id] = (champCount[c.id] || 0) + 1;
  });
  const seasonLeaders = Object.entries(champCount)
    .sort((a,b) => b[1]-a[1]).slice(0,6)
    .map(([id,titles]) => ({ player: playerMap[id] ?? prospectMap[id], titles }))
    .filter(e => e.player);

  const bySurface = {};
  completed.forEach(r => { const s=r.tournament?.surface; if(s) bySurface[s]=(bySurface[s]||0)+1; });

  const rivalrySystem = state?.rivalrySystem;
  const topRivalries  = rivalrySystem
    ? Array.from(rivalrySystem.rivalries?.values?.() ?? [])
        .sort((a,b) => (b.total??0)-(a.total??0)).slice(0,5)
    : [];

  const nextSurf = nextT ? (SURFACE[nextT.surface] ?? SURFACE.HARD) : SURFACE.HARD;
  const nextCat  = nextT ? (CAT[nextT.category] ?? { main:T.gold, label:nextT?.category, pts:'--' }) : null;
  const circuitBriefs = buildCircuitBriefs({ nextT, leader, seasonLeaders, latestBreakingArticle, bySurface, year });
  const editorialNotes = orderedFeed.slice(0, 10).filter(article => article !== heroArticle).slice(0, 4);
  const preparedCalendarContext = state?.preparedTournamentPackage?.calendarContext ?? null;
  const seasonAct = preparedCalendarContext?.seasonAct ?? null;
  const tournamentChapter = preparedCalendarContext?.tournamentChapter ?? null;
  const featuredRace = preparedCalendarContext?.narrativeRaces?.featured?.[0] ?? null;
  const pressureLineup = [
    ...(preparedCalendarContext?.pressuredFavorites ?? []).map((playerId) => playerMap[playerId] ?? prospectMap[playerId]).filter(Boolean),
    ...(preparedCalendarContext?.championTargets ?? []).map((playerId) => playerMap[playerId] ?? prospectMap[playerId]).filter(Boolean),
    ...(preparedCalendarContext?.respectedFloaters ?? []).map((playerId) => playerMap[playerId] ?? prospectMap[playerId]).filter(Boolean),
  ].filter((player, index, array) => array.findIndex((entry) => entry?.id === player?.id) === index).slice(0, 4);
  const spotlightPlayers = [
    ...seasonLeaders.map(({ player }) => player),
    ...top8.slice(0, 4).map(({ player }) => player),
  ].filter((player, index, array) => player && array.findIndex((entry) => entry?.id === player?.id) === index).slice(0, 4);
  const editorialEdition = buildEditorialEdition({
    latestBreakingArticle,
    heroArticle,
    seasonAct,
    tournamentChapter,
    featuredRace,
    nextT,
    pressureLineup,
    seasonLeaders,
    leader,
    year,
  });
  const circuitTemperature = editorialEdition.temperatureLabel;
  const ifYouReadOneThing = editorialEdition.oneThingLine;
  const narrativeMap = buildNarrativeMap({
    players: allPlayers,
    seasonLeaders,
    leader,
  });
  const editorialTrim = trimEditorialSections({
    latestBreakingArticle,
    secondaryArticles,
    circuitBriefs,
    editorialNotes,
    pressureLineup,
    topRivalries,
    seasonLeaders,
    spotlightPlayers,
    narrativeMap,
  });
  const interviewVoices = [...allPlayers]
    .filter((player) => player?.latestInterview?.quote)
    .sort((a, b) => (b?.publicNarrativeMemory?.intensity ?? 0) - (a?.publicNarrativeMemory?.intensity ?? 0))
    .slice(0, 3);
  const analystPulse = orderedFeed.filter((article) => ['ANALYSIS', 'PREDICTION', 'COLUMN'].includes(article?.type)).slice(0, 3);
  const newsroomCards = [
    {
      id: 'imprensa',
      title: 'Central de Imprensa',
      accent: '#5CB8E4',
      line: heroArticle?.headline ?? 'A redação principal já está empilhando as histórias da temporada.',
      sub: `${orderedFeed.length} peça${orderedFeed.length !== 1 ? 's' : ''} no radar editorial`,
    },
    {
      id: 'analistas',
      title: 'Mesa dos Analistas',
      accent: '#E8C84A',
      line: analystPulse[0]?.headline ?? featuredRace?.summary ?? 'Os analistas já têm tese para o próximo capítulo do circuito.',
      sub: analystPulse[0]?.deck ?? summarizeRace(featuredRace) ?? 'Leitura tática, favoritismo e contestação pública.',
    },
    {
      id: 'entrevistas',
      title: 'Vozes do Circuito',
      accent: '#57D38C',
      line: interviewVoices[0]?.latestInterview?.quote ?? 'As falas mais recentes dos jogadores ajudam a medir confiança, desgaste e cobrança.',
      sub: interviewVoices[0]?.name ?? 'Entrevistas de vestiário e reação do circuito',
    },
    {
      id: 'chronicles',
      title: 'Arquivo Vivo',
      accent: '#C46BFF',
      line: editorialNotes[0]?.headline ?? 'O universo já está acumulando memória suficiente para começar a contar sua própria história.',
      sub: 'Crônicas, registros e camada histórica de longo prazo.',
    },
  ];

  const tickerItems = recentWins.map(r => {
    const c = r._slim ? r.champion : r.bracket?.champion;
    const t = r.tournament;
    const sc = SURFACE[t?.surface] ?? SURFACE.HARD;
    return c ? `${t?.name?.toUpperCase()}  |  ${c.name.toUpperCase()}  |  ${sc.label.toUpperCase()}` : null;
  }).filter(Boolean);
  const tickerText = tickerItems.join('            ');

  if (selectedArticle) {
    const cfg = NEWS_COLOR[selectedArticle.type] ?? { c:T.gold, i:'?', label:'' };
    return (
      <div style={{ padding:'32px 48px', animation:'bu-in .3s ease both' }}>
        <button onClick={() => setSelectedArticle(null)} style={{
          fontFamily:T.mono, fontSize:9, letterSpacing:'.24em', padding:'8px 18px',
          background:'transparent', border:'1px solid rgba(255,255,255,.1)',
          color:T.faint, cursor:'pointer', marginBottom:28, textTransform:'uppercase', display:'block',
        }}>VOLTAR A CENTRAL</button>
        <div style={{ maxWidth:900, margin:'0 auto' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:18 }}>
            <NewsTypePill type={selectedArticle.type} />
            {selectedArticle.tournament && <span style={{ fontFamily:T.mono, fontSize:9, color:T.faint, letterSpacing:'.2em' }}>{selectedArticle.tournament.name?.toUpperCase()}</span>}
            <div style={{ flex:1 }} />
            {selectedArticle.journalist && <span style={{ fontFamily:T.mono, fontSize:9, color:`${cfg.c}aa`, letterSpacing:'.14em' }}>{selectedArticle.journalist.name} · {selectedArticle.journalist.outlet}</span>}
          </div>
          <div style={{ fontFamily:T.disp, fontSize:'clamp(32px,4vw,56px)', letterSpacing:'.03em', color:T.white, textTransform:'uppercase', lineHeight:1.05, marginBottom:14, borderLeft:`4px solid ${cfg.c}`, paddingLeft:22 }}>
            {selectedArticle.headline}
          </div>
          {selectedArticle.deck && <div style={{ fontFamily:T.cond, fontSize:18, fontWeight:400, color:T.dim, lineHeight:1.6, marginBottom:28, paddingLeft:26 }}>{selectedArticle.deck}</div>}
          <div style={{ height:1, background:`linear-gradient(90deg,${cfg.c}44,transparent)`, marginBottom:32 }} />
          {selectedArticle.body && (
            <div style={{ fontFamily:T.body, fontSize:16, color:'rgba(242,237,228,.75)', lineHeight:1.9, paddingLeft:4, whiteSpace:'pre-line' }}>
              {selectedArticle.body}
            </div>
          )}
          {selectedArticle.tags?.length > 0 && (
            <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginTop:40 }}>
              {selectedArticle.tags.map(tag => (
                <span key={tag} style={{ fontFamily:T.mono, fontSize:8, color:T.faint, letterSpacing:'.2em', background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.07)', padding:'4px 10px' }}>#{tag}</span>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return <NewsroomCommandDeck
    year={year}
    calendarIndex={calendarIndex}
    total={total}
    pct={pct}
    heroArticle={heroArticle}
    orderedFeed={orderedFeed}
    leader={leader}
    leaderPts={leaderPts}
    top8={top8}
    seasonLeaders={seasonLeaders}
    nextT={nextT}
    nextSurf={nextSurf}
    onViewBracket={onViewBracket}
    onSimulate={onSimulate}
    simulating={simulating}
    simProgress={simProgress}
    onOpenArticle={setSelectedArticle}
    onOpenTab={onOpenTab}
    onOpenProfile={onOpenProfile}
  />;

  return (
    <div style={{ animation:'bu-slide-up .4s cubic-bezier(.22,.68,0,1.2) both' }}>
      <div style={{ display:'flex', alignItems:'center', gap:20, padding:'20px 40px 18px', borderBottom:'1px solid rgba(255,255,255,.06)', background:'rgba(255,255,255,.012)' }}>
        <span className="bu-onair" style={{ flexShrink:0 }}><span className="bu-onair-dot" />LIVE</span>
        <div style={{ width:1, height:18, background:'rgba(255,255,255,.12)' }} />
        <div>
          <div style={{ fontFamily:T.disp, fontSize:'clamp(28px,3vw,44px)', letterSpacing:'.08em', color:T.white, textTransform:'uppercase', lineHeight:1 }}>Edição do Dia</div>
          <div style={{ fontFamily:T.mono, fontSize:8, letterSpacing:'.26em', color:T.clay, textTransform:'uppercase', marginTop:4 }}>broadcast hub · universo tênis</div>
        </div>
        <div style={{ flex:1 }} />
        <div style={{ display:'flex', alignItems:'center', gap:14 }}>
          <div style={{ textAlign:'right' }}>
            <div style={{ fontFamily:T.disp, fontSize:22, letterSpacing:'.1em', color:T.gold, lineHeight:1 }}>T.{year}</div>
            <div style={{ fontFamily:T.mono, fontSize:8, color:T.faint, letterSpacing:'.24em', marginTop:2 }}>{calendarIndex}/{total} TORNEIOS · {pct}%</div>
          </div>
          <div style={{ width:140, height:5, background:'rgba(255,255,255,.06)', position:'relative', borderRadius:2 }}>
            <div style={{ position:'absolute', left:0, top:0, bottom:0, width:`${pct}%`, background:`linear-gradient(90deg,${T.clay},${T.gold})`, borderRadius:2, transition:'width .4s' }} />
          </div>
        </div>
      </div>

      {tickerText && (
        <div style={{ background:'rgba(212,86,30,.07)', borderBottom:'1px solid rgba(212,86,30,.2)', height:34, display:'flex', alignItems:'center', overflow:'hidden' }}>
          <div style={{ flexShrink:0, padding:'0 18px', fontFamily:T.mono, fontSize:8, fontWeight:700, letterSpacing:'.3em', color:T.clay, textTransform:'uppercase', borderRight:'1px solid rgba(212,86,30,.2)', background:'rgba(212,86,30,.1)', height:'100%', display:'flex', alignItems:'center', whiteSpace:'nowrap' }}>RESULTADOS</div>
          <div style={{ flex:1, overflow:'hidden', position:'relative' }}>
            <div className="bu-ticker-track">
              {[tickerText, tickerText].map((tt,ti) => (
                <span key={ti} style={{ fontFamily:T.mono, fontSize:8.5, color:T.dim, letterSpacing:'.16em', padding:'0 56px', whiteSpace:'nowrap' }}>{tt}</span>
              ))}
            </div>
          </div>
        </div>
      )}

      <div style={{ padding:'24px 28px 0' }}>
        {(editorialTrim.isHighHeat || editorialTrim.isLowHeat) && (
          <div style={{ marginBottom:14, padding:'12px 16px', border:`1px solid ${editorialTrim.isHighHeat ? 'rgba(255,82,82,.24)' : 'rgba(255,255,255,.08)'}`, background:editorialTrim.isHighHeat ? 'linear-gradient(90deg, rgba(255,82,82,.10), rgba(255,255,255,.02))' : 'rgba(255,255,255,.018)' }}>
            <div style={{ fontFamily:T.mono, fontSize:8, letterSpacing:'.26em', color:editorialTrim.isHighHeat ? '#FF8A80' : T.faint, textTransform:'uppercase', marginBottom:5 }}>
              {editorialTrim.isHighHeat ? 'cobertura em alta rotação' : 'cobertura em formação'}
            </div>
            <div style={{ fontFamily:T.body, fontSize:13, color:T.dim, lineHeight:1.58 }}>
              {editorialTrim.isHighHeat
                ? 'A home reduziu ruído secundário para deixar a história dominante e as tensões centrais respirarem melhor.'
                : 'O circuito ainda está acumulando densidade. Alguns painéis narrativos encolhem até a temporada produzir sinais mais fortes.'}
            </div>
          </div>
        )}

        {latestBreakingArticle && (
          <div onClick={() => setSelectedArticle(latestBreakingArticle)} style={{ display:'flex', alignItems:'center', gap:14, padding:'14px 18px', marginBottom:14, border:latestBreakingArticle.spotlight === 'COVER' ? '1px solid rgba(232,200,74,.3)' : '1px solid rgba(255,82,82,.22)', background:latestBreakingArticle.spotlight === 'COVER' ? 'linear-gradient(90deg, rgba(232,200,74,.18) 0%, rgba(255,82,82,.06) 55%, transparent 100%)' : 'linear-gradient(90deg, rgba(255,82,82,.16) 0%, rgba(255,82,82,.04) 55%, transparent 100%)', cursor:'pointer' }}>
            <span className="bu-onair"><span className="bu-onair-dot" />{latestBreakingArticle.spotlight === 'COVER' ? 'CAPA' : 'BREAKING'}</span>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontFamily:T.disp, fontSize:'clamp(18px,1.8vw,28px)', lineHeight:1.05, color:T.white, textTransform:'uppercase', letterSpacing:'.04em' }}>{latestBreakingArticle.headline}</div>
              <div style={{ fontFamily:T.body, fontSize:13, color:'rgba(242,237,228,.56)', marginTop:4, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{latestBreakingArticle.deck ?? 'A cobertura urgente domina o circuito.'}</div>
            </div>
            <div style={{ fontFamily:T.mono, fontSize:8, color:latestBreakingArticle.spotlight === 'COVER' ? T.gold : '#FF8A80', letterSpacing:'.22em', textTransform:'uppercase' }}>
              {latestBreakingArticle.spotlight === 'COVER' ? 'manchete principal' : 'abrir cobertura'}
            </div>
          </div>
        )}

        <div style={{ display:'grid', gridTemplateColumns:'1.3fr .9fr', gap:14, marginBottom:14 }}>
          <div style={{ border:'1px solid rgba(255,255,255,.07)', background:'linear-gradient(180deg, rgba(255,255,255,.02), rgba(255,255,255,.01))', minHeight:420, position:'relative', overflow:'hidden' }}>
            {heroArticle ? (
              <div onClick={() => setSelectedArticle(heroArticle)} style={{ padding:'30px 32px 28px', cursor:'pointer', height:'100%', position:'relative' }}>
                {heroArticle.tournament?.surface && <div style={{ position:'absolute', top:0, right:0, width:'42%', height:'100%', background:`radial-gradient(ellipse at 100% 30%, ${(SURFACE[heroArticle.tournament.surface] ?? SURFACE.HARD).main}14, transparent 70%)`, pointerEvents:'none' }} />}
                <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16, position:'relative', zIndex:1 }}>
                  <NewsTypePill type={heroArticle.type} />
                  {heroArticle.spotlight === 'COVER' && <span style={{ fontFamily:T.mono, fontSize:8, color:T.gold, letterSpacing:'.24em', textTransform:'uppercase', padding:'4px 8px', border:'1px solid rgba(232,200,74,.35)', background:'rgba(232,200,74,.08)' }}>matéria de capa</span>}
                  {heroArticle.tournament && <span style={{ fontFamily:T.mono, fontSize:8, color:T.faint, letterSpacing:'.22em' }}>{heroArticle.tournament.name?.toUpperCase()}</span>}
                  {heroArticle.journalist && <span style={{ marginLeft:'auto', fontFamily:T.mono, fontSize:8, color:'rgba(242,237,228,.36)', letterSpacing:'.14em' }}>{heroArticle.journalist.name}</span>}
                </div>
                <div style={{ fontFamily:T.mono, fontSize:8, color:heroArticle.spotlight === 'COVER' ? T.gold : T.clay, letterSpacing:'.32em', textTransform:'uppercase', marginBottom:12, position:'relative', zIndex:1 }}>
                  {heroArticle.spotlight === 'COVER' ? 'capa do circuito' : 'a história dominante do circuito'}
                </div>
                <div style={{ fontFamily:T.disp, fontSize:'clamp(34px,4vw,58px)', letterSpacing:'.03em', color:T.white, lineHeight:1.02, marginBottom:14, textTransform:'uppercase', position:'relative', zIndex:1 }}>{editorialEdition.title}</div>
                <div style={{ fontFamily:T.cond, fontSize:18, color:T.dim, lineHeight:1.58, maxWidth:900, position:'relative', zIndex:1 }}>{editorialEdition.contextLine}</div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginTop:18, position:'relative', zIndex:1 }}>
                  <div style={{ padding:'12px 12px 10px', border:'1px solid rgba(255,255,255,.06)', background:'rgba(255,255,255,.02)' }}>
                    <div style={{ fontFamily:T.mono, fontSize:7, color:T.faint, letterSpacing:'.22em', textTransform:'uppercase', marginBottom:6 }}>por que isso importa</div>
                    <div style={{ fontFamily:T.body, fontSize:13, color:'rgba(242,237,228,.72)', lineHeight:1.6 }}>{editorialEdition.reasonLine}</div>
                  </div>
                  <div style={{ padding:'12px 12px 10px', border:`1px solid ${T.gold}22`, background:'rgba(232,200,74,.06)' }}>
                    <div style={{ fontFamily:T.mono, fontSize:7, color:T.gold, letterSpacing:'.22em', textTransform:'uppercase', marginBottom:6 }}>temperatura do circuito</div>
                    <div style={{ fontFamily:T.cond, fontSize:16, color:T.white, lineHeight:1.45, textTransform:'uppercase' }}>{circuitTemperature}</div>
                  </div>
                </div>
                <div style={{ marginTop:18, fontFamily:T.mono, fontSize:8, color:'rgba(242,237,228,.45)', letterSpacing:'.28em', textTransform:'uppercase', position:'relative', zIndex:1 }}>ler cobertura completa</div>
              </div>
            ) : (
              <div style={{ height:'100%', padding:'42px 32px', display:'flex', flexDirection:'column', justifyContent:'center' }}>
                <div style={{ fontFamily:T.disp, fontSize:'clamp(42px,5vw,72px)', letterSpacing:'.04em', color:'rgba(242,237,228,.08)', textTransform:'uppercase', lineHeight:.9 }}>
                  {isSeasonDone ? 'TEMPORADA ENCERRADA' : 'AGUARDANDO A PRIMEIRA CAPA'}
                </div>
                <div style={{ fontFamily:T.body, fontSize:15, color:T.dim, lineHeight:1.7, maxWidth:740, marginTop:16 }}>
                  {isSeasonDone ? `A temporada ${year} já entregou ${completed.length} eventos e está pronta para o próximo capítulo.` : 'Simule o próximo torneio para o Broadcast começar a organizar o circuito como uma redação viva.'}
                </div>
              </div>
            )}
          </div>

          <div style={{ display:'grid', gridTemplateRows:'auto auto 1fr', gap:14 }}>
            <div style={{ border:'1px solid rgba(255,255,255,.07)', background:'rgba(255,255,255,.018)', padding:'18px 18px 16px' }}>
              <div style={{ fontFamily:T.mono, fontSize:7, letterSpacing:'.28em', color:T.faint, textTransform:'uppercase', marginBottom:8 }}>painel do momento</div>
              {seasonAct && <div style={{ fontFamily:T.cond, fontSize:18, color:T.white, textTransform:'uppercase', lineHeight:1.2 }}>{seasonAct.label}</div>}
              <div style={{ fontFamily:T.body, fontSize:13, color:T.dim, lineHeight:1.6, marginTop:8 }}>{seasonAct?.summary ?? tournamentChapter?.summary ?? 'O circuito ainda está acumulando contexto para a próxima grande guinada.'}</div>
              {featuredRace && <div style={{ marginTop:12, paddingTop:12, borderTop:'1px solid rgba(255,255,255,.06)' }}><div style={{ fontFamily:T.mono, fontSize:7, color:T.gold, letterSpacing:'.2em', textTransform:'uppercase', marginBottom:5 }}>corrida principal</div><div style={{ fontFamily:T.cond, fontSize:15, color:T.white, textTransform:'uppercase' }}>{featuredRace.label}</div><div style={{ fontFamily:T.body, fontSize:12.5, color:T.dim, lineHeight:1.55, marginTop:6 }}>{featuredRace.summary}</div></div>}
            </div>

            <div style={{ border:'1px solid rgba(255,255,255,.07)', background:'rgba(255,255,255,.018)', padding:'18px 18px 16px' }}>
              <div style={{ fontFamily:T.mono, fontSize:7, letterSpacing:'.28em', color:T.clay, textTransform:'uppercase', marginBottom:8 }}>se você só ler uma coisa hoje</div>
              <div style={{ fontFamily:T.body, fontSize:13.5, color:T.white, lineHeight:1.65 }}>{editorialEdition.oneThingLine}</div>
            </div>

            <div style={{ border:'1px solid rgba(255,255,255,.07)', background:'rgba(255,255,255,.018)', padding:'18px 18px 14px' }}>
              <div style={{ fontFamily:T.mono, fontSize:7, letterSpacing:'.28em', color:T.gold, textTransform:'uppercase', marginBottom:10 }}>linha de fogo</div>
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {(pressureLineup.length > 0 ? pressureLineup : top8.slice(0, 4).map(({ player }) => player)).map((player, index) => (
                  <div key={player.id ?? index} style={{ padding:'8px 0', borderBottom:index === 3 ? 'none' : '1px solid rgba(255,255,255,.05)' }}>
                    <PlayerAvatar player={player} size={28} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 360px', gap:14, marginBottom:14 }}>
          <div style={{ border:'1px solid rgba(255,255,255,.07)', background:'rgba(255,255,255,.018)', padding:'18px 18px 16px' }}>
            <div style={{ fontFamily:T.mono, fontSize:8, letterSpacing:'.32em', color:T.faint, textTransform:'uppercase', marginBottom:12 }}>radar do circuito</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
              {editorialTrim.visibleBriefs.map(item => (
                <div key={item.key} style={{ padding:'12px 12px 11px', background:`${item.accent}10`, border:`1px solid ${item.accent}28`, minHeight:96 }}>
                  <div style={{ fontFamily:T.mono, fontSize:7, color:`${item.accent}CC`, letterSpacing:'.22em', textTransform:'uppercase', marginBottom:7 }}>{item.kicker}</div>
                  <div style={{ fontFamily:T.cond, fontSize:15, color:T.white, lineHeight:1.35 }}>{item.text}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ border:'1px solid rgba(255,255,255,.07)', background:'rgba(255,255,255,.018)', padding:'18px 18px 16px' }}>
            <div style={{ fontFamily:T.mono, fontSize:8, letterSpacing:'.32em', color:T.faint, textTransform:'uppercase', marginBottom:12 }}>caderno principal</div>
            <div style={{ display:'grid', gap:10 }}>
              {editorialTrim.visibleSecondary.map((art, i) => {
                const cfg = NEWS_COLOR[art.type] ?? { c:T.faint };
                return (
                  <div key={art.id ?? i} onClick={() => setSelectedArticle(art)} style={{ padding:'14px 15px', cursor:'pointer', borderLeft:`3px solid ${cfg.c}55`, background:'rgba(255,255,255,.014)', border:'1px solid rgba(255,255,255,.05)' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
                      <NewsTypePill type={art.type} small />
                      {art.tournament && <span style={{ fontFamily:T.mono, fontSize:7.5, color:T.faint, letterSpacing:'.18em', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{art.tournament.name?.toUpperCase()}</span>}
                    </div>
                    <div style={{ fontFamily:T.disp, fontSize:'clamp(16px,1.5vw,22px)', letterSpacing:'.04em', color:T.white, textTransform:'uppercase', lineHeight:1.14, marginBottom:8 }}>{art.headline}</div>
                    {art.deck && <div style={{ fontFamily:T.cond, fontSize:13, color:T.faint, lineHeight:1.55 }}>{art.deck}</div>}
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ border:'1px solid rgba(255,255,255,.07)', background:'rgba(0,0,0,.15)', padding:'18px 18px 16px' }}>
            <div style={{ fontFamily:T.mono, fontSize:8, letterSpacing:'.32em', color:T.faint, textTransform:'uppercase', marginBottom:12 }}>próximo capítulo</div>
            {nextT ? (
              <>
                <div style={{ fontFamily:T.disp, fontSize:'clamp(20px,2vw,28px)', letterSpacing:'.04em', color:T.white, textTransform:'uppercase', lineHeight:1.08 }}>{nextT.name}</div>
                <div style={{ display:'flex', gap:6, flexWrap:'wrap', margin:'10px 0 12px' }}>
                  <CatPill category={nextT.category} small />
                  <SurfacePill surface={nextT.surface} small />
                  <span style={{ fontFamily:T.mono, fontSize:8, color:T.faint, letterSpacing:'.16em', alignSelf:'center' }}>{nextT.location}</span>
                </div>
                {tournamentChapter && <div style={{ fontFamily:T.cond, fontSize:15, color:nextSurf.light, textTransform:'uppercase', lineHeight:1.3 }}>{tournamentChapter.label}</div>}
                <div style={{ fontFamily:T.body, fontSize:13, color:T.dim, lineHeight:1.62, marginTop:8 }}>{tournamentChapter?.summary ?? 'O próximo torneio ainda espera sua função narrativa se revelar.'}</div>
                <div style={{ display:'flex', gap:8, marginTop:16 }}>
                  {onViewBracket && <button onClick={() => !simulating && onViewBracket(nextT)} disabled={simulating} style={{ flex:1, fontFamily:T.mono, fontSize:8, fontWeight:700, letterSpacing:'.16em', padding:'10px 0', border:'1px solid rgba(74,144,217,.45)', background:'rgba(74,144,217,.1)', color:'#4A90D9', cursor:simulating?'not-allowed':'pointer', textTransform:'uppercase', transition:'all .15s', opacity:simulating ? .4 : 1 }}>VER CHAVE</button>}
                  {onSimulate && <button onClick={() => !simulating && onSimulate()} disabled={simulating} style={{ flex:1, fontFamily:T.mono, fontSize:8, fontWeight:700, letterSpacing:'.16em', padding:'10px 0', border:`1px solid ${simulating?'rgba(255,255,255,.08)':nextSurf.main+'66'}`, background:simulating?'rgba(255,255,255,.02)':`${nextSurf.main}18`, color:simulating?T.faint:nextSurf.light, cursor:simulating?'not-allowed':'pointer', textTransform:'uppercase', transition:'all .15s' }}>SIMULAR{simulating?` ${simProgress}...`:''}</button>}
                </div>
              </>
            ) : (
              <div style={{ fontFamily:T.disp, fontSize:22, color:T.grassLight, textTransform:'uppercase' }}>CONCLUÍDA</div>
            )}
          </div>
        </div>

        {editorialTrim.showNarrativeGrid && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:14, marginBottom:14 }}>
          {[
            { key:'ascension', title:'mudança de patamar', accent:T.grassLight, items:narrativeMap.ascension, empty:'Nenhum nome dominou contexto suficiente ainda.' },
            { key:'vulnerable', title:'feridas abertas', accent:'#FF8A80', items:narrativeMap.vulnerable, empty:'O topo ainda não carrega rachaduras públicas fortes.' },
            { key:'targets', title:'alvos nas costas', accent:T.gold, items:narrativeMap.targets, empty:'Ainda não há um nome claramente sendo caçado pelo circuito.' },
            { key:'publicDebate', title:'debate público', accent:'#C46BFF', items:narrativeMap.publicDebate, empty:'A conversa pública ainda está difusa.' },
          ].map((section) => (
            <div key={section.key} style={{ border:'1px solid rgba(255,255,255,.07)', background:'rgba(255,255,255,.018)', padding:'18px 18px 16px' }}>
              <div style={{ fontFamily:T.mono, fontSize:8, letterSpacing:'.32em', color:section.accent, textTransform:'uppercase', marginBottom:12 }}>{section.title}</div>
              {section.items.length > 0 ? (
                <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                  {section.items.map(({ player, line }, index) => (
                    <div key={`${section.key}-${player?.id ?? index}`} style={{ paddingBottom:index === section.items.length - 1 ? 0 : 10, borderBottom:index === section.items.length - 1 ? 'none' : '1px solid rgba(255,255,255,.05)' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:7 }}>
                        <PlayerFace player={player} size={22} borderColor={`${section.accent}55`} />
                        <div style={{ fontFamily:T.cond, fontSize:13, fontWeight:700, color:T.white, letterSpacing:'.05em', textTransform:'uppercase', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                          {player?.name ?? 'Circuito'}
                        </div>
                      </div>
                      <div style={{ fontFamily:T.body, fontSize:12.5, color:T.dim, lineHeight:1.58 }}>
                        {line}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ fontFamily:T.body, fontSize:12.5, color:T.faint, lineHeight:1.58 }}>
                  {section.empty}
                </div>
              )}
            </div>
          ))}
        </div>
        )}

        <div style={{ display:'grid', gridTemplateColumns:'1fr 360px', gap:14, paddingBottom:20 }}>
          <div style={{ border:'1px solid rgba(255,255,255,.07)', background:'rgba(255,255,255,.018)', padding:'18px 18px 16px' }}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
              <div>
                <div style={{ fontFamily:T.mono, fontSize:8, letterSpacing:'.32em', color:T.faint, textTransform:'uppercase', marginBottom:12 }}>rivalidades ativas</div>
                {topRivalries.length > 0 ? (
                  <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
                    {editorialTrim.visibleRivalries.map(r => <RivalryFlash key={r.key} rivalry={r} allPlayers={allPlayers} />)}
                  </div>
                ) : (
                  <div style={{ fontFamily:T.mono, fontSize:9, color:T.faint, letterSpacing:'.18em' }}>Rivalidades emergem com o tempo</div>
                )}
              </div>
              <div>
                <div style={{ fontFamily:T.mono, fontSize:8, letterSpacing:'.32em', color:T.faint, textTransform:'uppercase', marginBottom:12 }}>notas da redação</div>
                <div style={{ display:'grid', gap:8 }}>
                  {editorialTrim.visibleNotes.map((art, i) => {
                    const cfg = NEWS_COLOR[art.type] ?? { c:T.faint };
                    return (
                      <div key={art.id ?? i} onClick={() => setSelectedArticle(art)} style={{ display:'grid', gridTemplateColumns:'auto 1fr', gap:10, alignItems:'start', padding:'10px 0', borderBottom:'1px solid rgba(255,255,255,.04)', cursor:'pointer' }}>
                        <div style={{ width:8, height:8, borderRadius:'50%', background:cfg.c, boxShadow:`0 0 10px ${cfg.c}` }} />
                        <div>
                          <div style={{ fontFamily:T.cond, fontSize:14, color:T.white, lineHeight:1.35 }}>{art.headline}</div>
                          <div style={{ fontFamily:T.mono, fontSize:7.5, color:T.faint, letterSpacing:'.16em', textTransform:'uppercase', marginTop:5 }}>{cfg.label}{art.tournament?.name ? ` · ${art.tournament.name}` : ''}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <div style={{ display:'grid', gridTemplateRows:'auto auto auto', gap:14 }}>
            <div style={{ border:'1px solid rgba(255,255,255,.07)', background:'rgba(232,200,74,.06)', padding:'18px 18px 16px' }}>
              <div style={{ fontFamily:T.mono, fontSize:8, letterSpacing:'.32em', color:T.gold, textTransform:'uppercase', marginBottom:10 }}>estado do topo</div>
              {leader ? (
                <>
                  <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                    <div style={{ fontFamily:T.disp, fontSize:48, color:T.gold, lineHeight:1 }}>#1</div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontFamily:T.disp, fontSize:22, color:T.white, textTransform:'uppercase', lineHeight:1.05 }}>{leader.name}</div>
                      <div style={{ fontFamily:T.mono, fontSize:8, color:T.faint, letterSpacing:'.16em', marginTop:3 }}>{leaderPts.toLocaleString()} pts · {leader.nationality}</div>
                    </div>
                    <PlayerFace player={leader} size={46} borderColor="rgba(232,200,74,.5)" shadow="0 0 18px rgba(232,200,74,.3)" />
                  </div>
                  <div style={{ marginTop:12, display:'flex', flexDirection:'column', gap:6 }}>
                    {top8.slice(1, 4).map(({ player, pts }, i) => (
                      <div key={player.id} style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <span style={{ fontFamily:T.mono, fontSize:8, color:T.faint, minWidth:18 }}>#{i + 2}</span>
                        <PlayerFace player={player} size={20} borderColor="rgba(255,255,255,.15)" />
                        <span style={{ fontFamily:T.cond, fontSize:12, color:T.dim, textTransform:'uppercase', flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{player.name}</span>
                        <span style={{ fontFamily:T.mono, fontSize:8, color:T.faint }}>{pts.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : <div style={{ fontFamily:T.mono, fontSize:10, color:T.faint, letterSpacing:'.22em' }}>Simule um torneio</div>}
            </div>

            <div style={{ border:'1px solid rgba(255,255,255,.07)', background:'rgba(255,255,255,.018)', padding:'18px 18px 16px' }}>
              <div style={{ fontFamily:T.mono, fontSize:8, letterSpacing:'.32em', color:T.faint, textTransform:'uppercase', marginBottom:10 }}>nomes do momento</div>
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {(editorialTrim.visibleSpotlights.length > 0 ? editorialTrim.visibleSpotlights : top8.slice(0,4).map(({ player }) => player)).map((player, index) => (
                  <div key={player.id ?? index} style={{ padding:'8px 0', borderBottom:index === 3 ? 'none' : '1px solid rgba(255,255,255,.05)' }}>
                    <PlayerAvatar player={player} size={30} />
                  </div>
                ))}
              </div>
            </div>

            {seasonLeaders.length > 0 && (
              <div style={{ border:'1px solid rgba(255,255,255,.07)', background:'linear-gradient(180deg, rgba(232,200,74,.05), rgba(255,255,255,.015))', padding:'18px 18px 16px' }}>
                <div style={{ fontFamily:T.mono, fontSize:8, letterSpacing:'.32em', color:T.gold, textTransform:'uppercase', marginBottom:10 }}>títulos no ano</div>
                <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                  {seasonLeaders.slice(0, 4).map(({ player, titles }, i) => (
                    <div key={player.id} style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <span style={{ fontFamily:T.mono, fontSize:8, color:[T.gold,'#CBD5E1','#C97C3A',T.faint][i], minWidth:12 }}>{i+1}</span>
                      <PlayerFace player={player} size={20} borderColor="rgba(255,255,255,.15)" />
                      <span style={{ fontFamily:T.cond, fontSize:12, color:T.dim, textTransform:'uppercase', flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{player.name}</span>
                      <span style={{ fontFamily:T.disp, fontSize:18, color:[T.gold,'#CBD5E1','#C97C3A',T.faint][i] }}>{titles}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:14, paddingBottom:20 }}>
          {newsroomCards.map((card) => (
            <div key={card.id} onClick={() => onOpenTab?.(card.id)} style={{ border:'1px solid rgba(255,255,255,.07)', background:`linear-gradient(180deg, ${card.accent}10, rgba(255,255,255,.018))`, padding:'18px 18px 16px', cursor:'pointer', minHeight:170 }}>
              <div style={{ fontFamily:T.mono, fontSize:8, letterSpacing:'.32em', color:card.accent, textTransform:'uppercase', marginBottom:10 }}>
                {card.title}
              </div>
              <div style={{ fontFamily:T.cond, fontSize:17, color:T.white, lineHeight:1.35, textTransform:'uppercase' }}>
                {card.line}
              </div>
              <div style={{ fontFamily:T.body, fontSize:12.5, color:T.dim, lineHeight:1.6, marginTop:10 }}>
                {card.sub}
              </div>
              <div style={{ marginTop:12, fontFamily:T.mono, fontSize:7, color:`${card.accent}CC`, letterSpacing:'.22em', textTransform:'uppercase' }}>
                abrir canal
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// """"""""""""""""""""""""""""""""""""""""""""""""""""""""""""•""""""
// CALENDÁRIO VIEW
// """"""""""""""""""""""""""""""""""""""""""""""""""""""""""""•""""""
function CalendarioView({ state, onViewBracket }) {
  const [openMonth, setOpenMonth] = useState(null);
  const { tournamentResults, calendarIndex, year } = state;

  const MONTHS_META = [
    { num:1,  name:'Janeiro',   short:'JAN' },
    { num:2,  name:'Fevereiro', short:'FEV' },
    { num:3,  name:'Março',     short:'MAR' },
    { num:4,  name:'Abril',     short:'ABR' },
    { num:5,  name:'Maio',      short:'MAI' },
    { num:6,  name:'Junho',     short:'JUN' },
    { num:7,  name:'Julho',     short:'JUL' },
    { num:8,  name:'Agosto',    short:'AGO' },
    { num:9,  name:'Setembro',  short:'SET' },
    { num:10, name:'Outubro',   short:'OUT' },
    { num:11, name:'Novembro',  short:'NOV' },
    { num:12, name:'Dezembro',  short:'DEZ' },
  ];

  const byMonth = {};
  CALENDAR.forEach(t => { const m=t.monthNum; if(!byMonth[m]) byMonth[m]=[]; byMonth[m].push(t); });
  const currentMonthNum = CALENDAR[calendarIndex]?.monthNum ?? 12;
  const weekTone = (weekIndex = 0) => {
    const hue = (weekIndex * 37 + 18) % 360;
    return {
      line: `hsla(${hue}, 78%, 62%, .58)`,
      fill: `linear-gradient(135deg, hsla(${hue}, 72%, 52%, .16), rgba(255,255,255,.02) 68%)`,
      chip: `hsla(${hue}, 82%, 72%, .92)`,
      soft: `hsla(${hue}, 88%, 70%, .12)`,
    };
  };

  const monthStatus = (n) => {
    const tours = byMonth[n] ?? [];
    if (!tours.length) return 'empty';
    if (n < currentMonthNum && tours.every(t => !!tournamentResults[t.id])) return 'done';
    if (n === currentMonthNum) return 'current';
    if (n < currentMonthNum) return 'done';
    return 'future';
  };

  const totalGs    = CALENDAR.filter(t=>t.category==='GRAND_SLAM').length;
  const totalM1000 = CALENDAR.filter(t=>t.category==='MASTERS_1000').length;
  const totalDone  = Object.keys(tournamentResults).length;
  const totalAll   = CALENDAR.length;
  const nextTournament = CALENDAR[calendarIndex] ?? null;

  return (
    <div style={{ animation:'bu-in .4s ease both' }}>
      <div style={{ padding:'32px 40px 28px', borderBottom:'1px solid rgba(255,255,255,.06)', display:'flex', alignItems:'flex-end', justifyContent:'space-between' }}>
        <div>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
            <div style={{ width:24, height:2, background:T.clay }} />
            <span style={{ fontFamily:T.mono, fontSize:9, letterSpacing:'.44em', color:T.clay, textTransform:'uppercase' }}>TEMPORADA {year}</span>
          </div>
          <div style={{ fontFamily:T.disp, fontSize:'clamp(40px,4.5vw,64px)', letterSpacing:'.04em', color:T.white, textTransform:'uppercase', lineHeight:.95 }}>
            Calendário<br/><span style={{ color:T.clay, opacity:.45 }}>Anual</span>
          </div>
        </div>
        <div style={{ display:'flex', gap:28, alignItems:'flex-end' }}>
          {[
            { label:'GRAND SLAMS',  val:totalGs,    color:T.gold },
            { label:'MASTERS 1000', val:totalM1000, color:'#C84FEB' },
            { label:'TOTAL',        val:totalAll,   color:T.dim },
            { label:'CONCLUÍDOS',   val:totalDone,  color:T.grassLight },
          ].map(s => (
            <div key={s.label} style={{ textAlign:'right' }}>
              <div style={{ fontFamily:T.disp, fontSize:38, color:s.color, lineHeight:1 }}>{s.val}</div>
              <div style={{ fontFamily:T.mono, fontSize:8, color:T.faint, letterSpacing:'.28em', textTransform:'uppercase', marginTop:2 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding:'32px 40px' }}>
        {nextTournament && (
          <div style={{ display:'grid', gridTemplateColumns:'auto minmax(0,1fr) auto', gap:18, alignItems:'center', marginBottom:22, padding:'16px 18px', border:`1px solid ${(CAT[nextTournament.category] ?? CAT.ATP_250).main}55`, background:`linear-gradient(90deg, ${(CAT[nextTournament.category] ?? CAT.ATP_250).main}18, rgba(255,255,255,.015))` }}>
            <div style={{ fontFamily:T.mono, fontSize:8, color:(CAT[nextTournament.category] ?? CAT.ATP_250).main, letterSpacing:'.2em' }}>EM JOGO AGORA</div>
            <div><div style={{ fontFamily:T.cond, fontSize:22, fontWeight:800, letterSpacing:'.04em', color:T.white, textTransform:'uppercase' }}>{nextTournament.name}</div><div style={{ fontFamily:T.mono, fontSize:8, color:T.dim, letterSpacing:'.14em', marginTop:3 }}>{(CAT[nextTournament.category] ?? CAT.ATP_250).label} · {nextTournament.location} · {nextTournament.month}</div></div>
            {onViewBracket && <button onClick={() => onViewBracket(nextTournament)} style={{ border:`1px solid ${(CAT[nextTournament.category] ?? CAT.ATP_250).main}`, background:'transparent', color:T.white, padding:'10px 13px', cursor:'pointer', fontFamily:T.mono, fontSize:8, letterSpacing:'.14em' }}>ABRIR CHAVE →</button>}
          </div>
        )}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(6,1fr)', gap:8, marginBottom:32 }}>
          {MONTHS_META.map(m => {
            const status  = monthStatus(m.num);
            const tours   = byMonth[m.num] ?? [];
            const isOpen  = openMonth === m.num;
            const done    = status==='done';
            const current = status==='current';
            const future  = status==='future';
            const borderC = current ? 'rgba(232,200,74,.55)' : done ? 'rgba(46,204,113,.28)' : 'rgba(255,255,255,.07)';
            const bg      = current ? 'rgba(232,200,74,.06)' : done ? 'rgba(46,204,113,.03)' : 'rgba(255,255,255,.015)';
            return (
              <div key={m.num}>
                <div onClick={() => tours.length && setOpenMonth(isOpen ? null : m.num)}
                  style={{ border:`1px solid ${borderC}`, background:bg, padding:'18px 16px',
                    cursor:tours.length?'pointer':'default', transition:'all .18s', position:'relative', overflow:'hidden' }}
                  onMouseEnter={e => { if(tours.length) e.currentTarget.style.background=done?'rgba(46,204,113,.07)':current?'rgba(232,200,74,.1)':'rgba(255,255,255,.04)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background=bg; }}
                >
                  <div style={{ position:'absolute', top:0, left:0, right:0, height:2, background:current?T.gold:done?T.grassLight:'rgba(255,255,255,.04)' }} />
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
                    <span style={{ fontFamily:T.disp, fontSize:13, letterSpacing:'.08em', color:T.faint }}>{m.short}</span>
                    {current && <span style={{ fontFamily:T.mono, fontSize:7, letterSpacing:'.18em', color:T.gold, border:'1px solid rgba(232,200,74,.4)', padding:'2px 5px' }}>ATUAL</span>}
                    {done    && <span style={{ fontFamily:T.mono, fontSize:10, color:T.grassLight }}>✓</span>}
                  </div>
                  <div style={{ fontFamily:T.disp, fontSize:22, letterSpacing:'.04em', color:current?T.gold:done?T.grassLight:T.dim, textTransform:'uppercase', lineHeight:1, marginBottom:6 }}>
                    {m.name}
                  </div>
                  <div style={{ fontFamily:T.mono, fontSize:8, color:T.faint, letterSpacing:'.16em' }}>
                    {tours.length} torneio{tours.length!==1?'s':''}
                  </div>
                </div>

                {isOpen && (
                  <div style={{ border:'1px solid rgba(255,255,255,.08)', borderTop:'none', background:'rgba(0,0,0,.35)', padding:'12px 16px' }}>
                    {Object.values(
                      tours.reduce((acc, t) => {
                        const key = t.weekIndex ?? 999;
                        if (!acc[key]) acc[key] = { weekIndex:key, tours:[] };
                        acc[key].tours.push(t);
                        return acc;
                      }, {})
                    )
                      .sort((a, b) => a.weekIndex - b.weekIndex)
                      .map(({ weekIndex, tours: weekTours }) => {
                        const tone = weekTone(weekIndex);
                        const hasParallelATP = weekTours.filter(t => t.parallelGroup && (t.category === 'ATP_250' || t.category === 'ATP_500')).length > 1;
                        return (
                          <div key={`${m.num}-${weekIndex}`} style={{
                            marginBottom:10,
                            border:`1px solid ${tone.line}`,
                            background:tone.fill,
                            boxShadow: hasParallelATP ? `inset 0 0 0 1px ${tone.soft}` : 'none',
                          }}>
                            <div style={{
                              display:'flex',
                              alignItems:'center',
                              justifyContent:'space-between',
                              gap:10,
                              padding:'10px 12px',
                              borderBottom:'1px solid rgba(255,255,255,.05)',
                              background: hasParallelATP ? 'rgba(255,255,255,.025)' : 'rgba(255,255,255,.015)',
                            }}>
                              <div style={{ display:'flex', alignItems:'center', gap:8, minWidth:0 }}>
                                <span style={{
                                  fontFamily:T.mono,
                                  fontSize:9,
                                  letterSpacing:'.18em',
                                  color:tone.chip,
                                  border:`1px solid ${tone.line}`,
                                  padding:'3px 7px',
                                  background:'rgba(0,0,0,.22)',
                                  textTransform:'uppercase',
                                }}>
                                  W{String(weekIndex).padStart(2,'0')}
                                </span>
                                <span style={{ fontFamily:T.cond, fontSize:12, color:T.white, letterSpacing:'.08em', textTransform:'uppercase' }}>
                                  {weekTours.length} evento{weekTours.length !== 1 ? 's' : ''}
                                </span>
                              </div>
                              {hasParallelATP && (
                                <span style={{
                                  fontFamily:T.mono,
                                  fontSize:8,
                                  color:T.gold,
                                  letterSpacing:'.16em',
                                  textTransform:'uppercase',
                                  border:'1px solid rgba(232,200,74,.34)',
                                  padding:'3px 6px',
                                  background:'rgba(232,200,74,.08)',
                                  whiteSpace:'nowrap',
                                }}>
                                  semana paralela
                                </span>
                              )}
                            </div>

                            <div style={{ padding:'2px 12px 6px' }}>
                              {weekTours.map((t, idx) => {
                                const res   = tournamentResults[t.id];
                                const champ = res?._slim ? res.champion : res?.bracket?.champion;
                                const cat   = CAT[t.category] ?? { main:'#888', icon:'•' };
                                const isParallel = !!t.parallelGroup && (t.category === 'ATP_250' || t.category === 'ATP_500');
                                return (
                                  <div key={t.id} style={{ padding:'8px 0', borderBottom: idx === weekTours.length - 1 ? 'none' : '1px solid rgba(255,255,255,.05)', display:'flex', alignItems:'center', gap:8 }}>
                                    <span style={{ fontSize:11 }}>{cat.icon}</span>
                                    <div style={{ flex:1, minWidth:0 }}>
                                      <div style={{ display:'flex', alignItems:'center', gap:6, minWidth:0 }}>
                                        <div style={{ fontFamily:T.cond, fontSize:12, fontWeight:700, color:champ?T.white:T.dim, letterSpacing:'.04em', textTransform:'uppercase', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{t.name}</div>
                                        {isParallel && (
                                          <span style={{
                                            fontFamily:T.mono,
                                            fontSize:7,
                                            color:tone.chip,
                                            letterSpacing:'.14em',
                                            textTransform:'uppercase',
                                            border:`1px solid ${tone.line}`,
                                            padding:'2px 4px',
                                            background:'rgba(0,0,0,.18)',
                                            flexShrink:0,
                                          }}>
                                            W{String(weekIndex).padStart(2,'0')}
                                          </span>
                                        )}
                                      </div>
                                      <div style={{ marginTop:3, display:'flex', alignItems:'center', gap:6, flexWrap:'wrap' }}>
                                        <SurfacePill surface={t.surface} small />
                                        {isParallel && (
                                          <span style={{ fontFamily:T.mono, fontSize:7, color:T.faint, letterSpacing:'.12em', textTransform:'uppercase' }}>
                                            bloco paralelo
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    {champ ? (
                                      <div style={{ display:'flex', alignItems:'center', gap:5, flexShrink:0 }}>
                                        <PlayerFace player={champ} size={18} borderColor={`${cat.main}55`} />
                                        <span style={{ fontFamily:T.mono, fontSize:8, color:cat.main, letterSpacing:'.1em', whiteSpace:'nowrap' }}>{champ.name.split(' ').pop()}</span>
                                      </div>
                                    ) : (
                                      <span style={{ fontFamily:T.mono, fontSize:7.5, color:T.faint, letterSpacing:'.12em' }}>pendente</span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// """"""""""""""""""""""""""""""""""""""""""""""""""""""""""""•""""""
// RANKINGS VIEW
// """"""""""""""""""""""""""""""""""""""""""""""""""""""""""""•""""""
function RankingsView({ state, dispatch }) {
  const [mainTab,   setMainTab]   = useState('tour');
  const [tourSub,   setTourSub]   = useState('live');
  const [selPlayer, setSelPlayer] = useState(null);

  const { tourPlayers, prospects, rankingStore, tournamentResults, historicalTournamentResults } = state;
  const allTournamentResults = { ...(historicalTournamentResults ?? {}), ...(tournamentResults ?? {}) };
  const playerMap   = Object.fromEntries(tourPlayers.map(p=>[p.id,p]));
  const prospectMap = Object.fromEntries(prospects.map(p=>[p.id,p]));

  const liveRanking = rankingStore.ranked
    .map(e => ({ player:playerMap[e.playerId], position:e.position, points:e.points, used:e.used ?? [] }))
    .filter(e=>e.player);

  const careerPts = {};
  const allRankingResults = {
    ...(historicalTournamentResults ?? {}),
    ...(tournamentResults ?? {}),
  };
  Object.values(allRankingResults).forEach(res => {
    const { bracket, tournament } = res;
    if (!bracket || !tournament) return;
    try {
      const pm = computeTournamentPoints(tournament, bracket, TOURNAMENT_POINTS);
      for (const [pid,{points}] of pm) careerPts[pid] = (careerPts[pid]||0)+points;
    } catch(e){}
  });
  const historicalRanking = Object.entries(careerPts)
    .sort((a,b)=>b[1]-a[1])
    .map(([pid,points],idx) => ({ player:playerMap[pid]??prospectMap[pid], position:idx+1, points, used:[] }))
    .filter(e=>e.player);

  const juniorRanking = rankingStore.prospectRanked
    .map(e => ({ player:prospectMap[e.playerId], position:e.position, points:e.points, used:e.used ?? [] }))
    .filter(e=>e.player);

  const isNextGenPlayer = (player) => {
    const age = Number(player?.age);
    if (!Number.isFinite(age)) return false;
    return age < 22;
  };
  const rebuildPositions = (rows) => rows.map((entry, idx) => ({ ...entry, position: idx + 1 }));
  const nextGenLiveRanking = rebuildPositions(liveRanking.filter(entry => isNextGenPlayer(entry.player)));
  const nextGenHistoricalRanking = rebuildPositions(historicalRanking.filter(entry => isNextGenPlayer(entry.player)));
  const tourList   = tourSub==='live' ? liveRanking : historicalRanking;
  const nextGenList = tourSub==='live' ? nextGenLiveRanking : nextGenHistoricalRanking;
  const rankColor  = p => p===1?T.gold : p===2?'#CBD5E1' : p===3?'#C97C3A' : p<=8?'rgba(232,200,74,.7)' : p<=32?T.dim : T.faint;

  // list precisa estar antes do return condicional para uso na navegação da ficha
  const list = mainTab==='juniors' ? juniorRanking : mainTab === 'nextgen' ? nextGenList : tourList;
  const top60 = list.slice(0, 60);

  const calendarById = useMemo(() => Object.fromEntries(CALENDAR.map((t) => [t.id, t])), []);
  const rankingResultsByPlayer = mainTab === 'juniors'
    ? (rankingStore?.prospectResults ?? {})
    : (rankingStore?.playerResults ?? {});

  const seasonPointsByPlayer = {};
  Object.entries(rankingResultsByPlayer).forEach(([playerId, results]) => {
    seasonPointsByPlayer[playerId] = (results ?? [])
      .filter(r => Number(r?.season) === Number(state.year))
      .reduce((sum, r) => sum + Number(r?.points ?? 0), 0);
  });

  const form20ByPlayer = (() => {
    const byPlayer = {};
    const calendarOrder = Object.fromEntries(CALENDAR.map((t, i) => [t.id, i]));
    const results = Object.values(tournamentResults ?? {})
      .filter(res => Number(res?.tournament?.year ?? state.year) === Number(state.year))
      .sort((a, b) => (calendarOrder[a?.tournament?.id] ?? 999) - (calendarOrder[b?.tournament?.id] ?? 999));
    const pushMatch = (winnerId, loserId) => {
      if (!winnerId || !loserId) return;
      if (!byPlayer[winnerId]) byPlayer[winnerId] = [];
      if (!byPlayer[loserId]) byPlayer[loserId] = [];
      byPlayer[winnerId].push(1);
      byPlayer[loserId].push(0);
    };
    results.forEach((res) => {
      if (res?._slim) {
        (res.matches ?? []).forEach(match => pushMatch(match.w, match.l));
        return;
      }
      (res?.bracket?.rounds ?? []).forEach(round => {
        (round ?? []).forEach(match => {
          if (!match || match.isBye || !match.winner) return;
          const pA = match.playerA ?? match.player1;
          const pB = match.playerB ?? match.player2;
          const loser = match.winner?.id === pA?.id ? pB : pA;
          pushMatch(match.winner?.id, loser?.id);
        });
      });
    });
    const out = {};
    Object.entries(byPlayer).forEach(([playerId, arr]) => {
      const recent = arr.slice(-20);
      const wins = recent.reduce((sum, v) => sum + v, 0);
      const total = recent.length;
      out[playerId] = { wins, losses: total - wins, total, pct: total ? Math.round((wins / total) * 100) : 0 };
    });
    return out;
  })();

  const enrichedList = list.map(entry => {
    const player = entry.player;
    const historyRank = (player?._rankHistory ?? []).find(h => Number(h.year) === Number(state.year))?.rank;
    const seasonStartRank = historyRank ?? player?.rankPosition ?? entry.position;
    const rankMove = Number.isFinite(Number(seasonStartRank)) ? Number(seasonStartRank) - Number(entry.position) : 0;
    const seasonPoints = seasonPointsByPlayer[player.id] ?? 0;
    const defendingPoints = mainTab === 'juniors' ? 0 : (rankingStore?.playerResults?.[player.id] ?? [])
      .filter(r => Number(r?.season) === Number(state.year) - 1)
      .reduce((sum, r) => sum + Number(r?.points ?? 0), 0);
    const form20 = form20ByPlayer[player.id] ?? { wins:0, losses:0, total:0, pct:0 };
    const pointsRank = Math.min(1, seasonPoints / 5000);
    const formRank = form20.total ? form20.pct / 100 : 0.45;
    const moveRank = Math.max(-1, Math.min(1, rankMove / 20));
    const ovrRank = Math.min(1, overallRating(player.attrs ?? {}) / 100);
    const momentum = Math.round(Math.max(0, Math.min(100, (formRank * 46) + (pointsRank * 28) + ((moveRank + 1) / 2 * 16) + (ovrRank * 10))));
    return { ...entry, seasonStartRank, rankMove, seasonPoints, defendingPoints, form20, momentum };
  });

  const analyticsList = mainTab === 'juniors' ? enrichedList : (tourSub === 'live' ? enrichedList : []);
  const risingPlayers = analyticsList.filter(e => e.rankMove > 0).sort((a,b) => b.rankMove - a.rankMove || b.seasonPoints - a.seasonPoints).slice(0,5);
  const fallingPlayers = analyticsList.filter(e => e.rankMove < 0).sort((a,b) => a.rankMove - b.rankMove || a.form20.pct - b.form20.pct).slice(0,5);
  const seasonPointLeaders = analyticsList.filter(e => e.seasonPoints > 0).sort((a,b) => b.seasonPoints - a.seasonPoints).slice(0,5);
  const formLeaders = analyticsList.filter(e => e.form20.total >= 8).sort((a,b) => b.form20.pct - a.form20.pct || b.form20.wins - a.form20.wins).slice(0,5);
  const pressureAlerts = analyticsList.filter(e => e.position <= 20 && e.form20.total >= 8 && (e.form20.pct < 50 || e.rankMove < -4)).sort((a,b) => a.form20.pct - b.form20.pct).slice(0,5);

  const buildRankingStoreAudit = useCallback((playerId, rankingEntry, isProspect = false) => {
    const rawResults = isProspect
      ? (rankingStore?.prospectResults?.[playerId] ?? [])
      : (rankingStore?.playerResults?.[playerId] ?? []);
    const usedIds = new Set((rankingEntry?.used ?? []).map((r) => `${r.tournamentId}|${r.season}|${r.round}|${r.points}`));
    const activeResults = rawResults.filter((r) => Number(r?.points ?? 0) > 0);
    const usedResults = activeResults.filter((r) => usedIds.size === 0 || usedIds.has(`${r.tournamentId}|${r.season}|${r.round}|${r.points}`));
    const source = usedResults.length ? usedResults : activeResults;

    const audit = {
      active_results_total: activeResults.length,
      active_results_used: usedResults.length || source.length,
      active_points_total_raw: activeResults.reduce((sum, r) => sum + Number(r?.points ?? 0), 0),
      active_points_used_sum: source.reduce((sum, r) => sum + Number(r?.points ?? 0), 0),
      active_points_mandatory: source.filter((r) => r?.mandatory).reduce((sum, r) => sum + Number(r?.points ?? 0), 0),
      active_points_optional: source.filter((r) => !r?.mandatory).reduce((sum, r) => sum + Number(r?.points ?? 0), 0),
      active_titles: 0,
      active_finals: 0,
      active_slam_titles: 0,
      active_slam_finals: 0,
      active_masters_titles: 0,
      active_atp500_titles: 0,
      active_atp250_titles: 0,
      active_points_from_slams: 0,
      active_points_from_masters: 0,
      active_points_from_500: 0,
      active_points_from_250: 0,
      active_points_from_100: 0,
      active_points_from_finals: 0,
      active_points_from_other: 0,
      active_points_clay: 0,
      active_points_hard: 0,
      active_points_grass: 0,
      active_points_indoor: 0,
      active_best_result: '',
      active_best_result_category: '',
      active_best_result_tournament: '',
      active_best_8_sources: '',
      active_all_sources: '',
    };

    const roundWeight = { W: 9, F: 8, SF: 7, QF: 6, R16: 5, R32: 4, R64: 3, R128: 2, Q: 1, PQ: 0 };
    const categoryPointKey = {
      GRAND_SLAM: 'active_points_from_slams',
      SLAM_CLASH: 'active_points_from_slams',
      MASTERS_1000: 'active_points_from_masters',
      ATP_500: 'active_points_from_500',
      ATP_250: 'active_points_from_250',
      ATP_100: 'active_points_from_100',
      FINALS: 'active_points_from_finals',
    };
    const titleKey = {
      GRAND_SLAM: 'active_slam_titles',
      SLAM_CLASH: 'active_slam_titles',
      MASTERS_1000: 'active_masters_titles',
      ATP_500: 'active_atp500_titles',
      ATP_250: 'active_atp250_titles',
    };

    const sourceRows = source.map((r) => {
      const tournament = calendarById[r?.tournamentId] ?? {};
      const category = r?.category ?? tournament.category ?? '';
      const surface = String(tournament.surface ?? r?.surface ?? '').toUpperCase();
      const points = Number(r?.points ?? 0);
      const round = r?.round ?? '';
      const catKey = categoryPointKey[category] ?? 'active_points_from_other';
      audit[catKey] += points;

      if (surface.includes('CLAY')) audit.active_points_clay += points;
      else if (surface.includes('GRASS')) audit.active_points_grass += points;
      else if (surface.includes('INDOOR')) audit.active_points_indoor += points;
      else audit.active_points_hard += points;

      if (round === 'W') {
        audit.active_titles += 1;
        if (titleKey[category]) audit[titleKey[category]] += 1;
      }
      if (round === 'W' || round === 'F') {
        audit.active_finals += 1;
        if (category === 'GRAND_SLAM' || category === 'SLAM_CLASH') audit.active_slam_finals += 1;
      }

      const currentBest = roundWeight[audit.active_best_result] ?? -99;
      const nextBest = roundWeight[round] ?? -99;
      if (nextBest > currentBest || (nextBest === currentBest && points > (audit.active_best_result_points ?? -1))) {
        audit.active_best_result = round;
        audit.active_best_result_category = category;
        audit.active_best_result_tournament = r?.tournamentName ?? tournament.name ?? r?.tournamentId ?? '';
        audit.active_best_result_points = points;
      }

      return {
        name: r?.tournamentName ?? tournament.name ?? r?.tournamentId ?? 'Torneio',
        category,
        surface: tournament.surface ?? r?.surface ?? '',
        round,
        points,
        season: r?.season ?? '',
        mandatory: r?.mandatory ? 'MAND' : 'OPT',
      };
    }).sort((a, b) => b.points - a.points);

    audit.active_points_surface_profile = [
      ['CLAY', audit.active_points_clay],
      ['HARD', audit.active_points_hard],
      ['GRASS', audit.active_points_grass],
      ['INDOOR', audit.active_points_indoor],
    ].sort((a, b) => b[1] - a[1]).map(([surface, points]) => `${surface}:${points}`).join('|');
    audit.active_best_8_sources = sourceRows
      .slice(0, 8)
      .map((s) => `${s.name}:${s.points}:${s.round}:${s.category}:${s.surface}:${s.mandatory}`)
      .join('|');
    audit.active_all_sources = sourceRows
      .map((s) => `${s.name}:${s.points}:${s.round}:${s.category}:${s.surface}:${s.season}:${s.mandatory}`)
      .join('|');
    delete audit.active_best_result_points;
    return audit;
  }, [calendarById, rankingStore]);

  const buildPlayerTournamentAudit = useCallback((playerId, sourceResults) => {
    const audit = {
      events_played: 0,
      matches_won: 0,
      matches_lost: 0,
      titles_total: 0,
      finals_total: 0,
      slam_titles: 0,
      slam_finals: 0,
      masters_titles: 0,
      atp500_titles: 0,
      atp250_titles: 0,
      points_from_slams: 0,
      points_from_masters: 0,
      points_from_500: 0,
      points_from_250: 0,
      points_from_finals: 0,
      points_clay: 0,
      points_hard: 0,
      points_grass: 0,
      points_indoor: 0,
      best_result: '',
      best_result_category: '',
      best_result_tournament: '',
      top_points_sources: '',
    };

    const pointSources = [];
    const roundWeight = { W: 7, F: 6, SF: 5, QF: 4, R16: 3, R32: 2, R64: 1, R128: 0, Q: -1 };
    const categoryPointKey = {
      GRAND_SLAM: 'points_from_slams',
      MASTERS_1000: 'points_from_masters',
      ATP_500: 'points_from_500',
      ATP_250: 'points_from_250',
      FINALS: 'points_from_finals',
    };
    const titleKey = {
      GRAND_SLAM: 'slam_titles',
      MASTERS_1000: 'masters_titles',
      ATP_500: 'atp500_titles',
      ATP_250: 'atp250_titles',
    };

    Object.values(sourceResults ?? {}).forEach((res) => {
      const tournament = res?.tournament;
      const bracket = res?.bracket;
      if (!tournament || !bracket?.rounds?.length) return;

      let pointsEntry = null;
      try {
        pointsEntry = computeTournamentPoints(tournament, bracket, TOURNAMENT_POINTS).get(playerId) ?? null;
      } catch (e) {
        pointsEntry = null;
      }

      let played = Boolean(pointsEntry);
      let wonMatches = 0;
      let lostMatches = 0;
      let finalist = false;

      bracket.rounds.forEach((round, roundIdx) => {
        round.forEach((match) => {
          const isA = match?.playerA?.id === playerId;
          const isB = match?.playerB?.id === playerId;
          if (!isA && !isB) return;
          if (match?.isBye) return;
          played = true;
          if (match?.winner?.id === playerId) wonMatches += 1;
          else lostMatches += 1;
          if (roundIdx === bracket.rounds.length - 1) finalist = true;
        });
      });

      if (!played) return;

      audit.events_played += 1;
      audit.matches_won += wonMatches;
      audit.matches_lost += lostMatches;

      const category = tournament.category ?? '';
      const surface = String(tournament.surface ?? '').toUpperCase();
      const points = Number(pointsEntry?.points ?? 0);
      const round = pointsEntry?.round ?? (bracket?.champion?.id === playerId ? 'W' : '');

      const catKey = categoryPointKey[category];
      if (catKey) audit[catKey] += points;

      if (surface.includes('CLAY')) audit.points_clay += points;
      else if (surface.includes('GRASS')) audit.points_grass += points;
      else if (surface.includes('INDOOR')) audit.points_indoor += points;
      else audit.points_hard += points;

      if (points > 0) {
        pointSources.push({
          name: tournament.name ?? tournament.id ?? 'Torneio',
          category,
          surface: tournament.surface ?? '',
          points,
          round,
        });
      }

      if (bracket?.champion?.id === playerId) {
        audit.titles_total += 1;
        if (titleKey[category]) audit[titleKey[category]] += 1;
      }
      if (finalist) {
        audit.finals_total += 1;
        if (category === 'GRAND_SLAM') audit.slam_finals += 1;
      }

      const currentBest = roundWeight[audit.best_result] ?? -99;
      const nextBest = roundWeight[round] ?? -99;
      if (nextBest > currentBest || (nextBest === currentBest && points > (audit.best_result_points ?? -1))) {
        audit.best_result = round;
        audit.best_result_category = category;
        audit.best_result_tournament = tournament.name ?? tournament.id ?? '';
        audit.best_result_points = points;
      }
    });

    const totalMatches = audit.matches_won + audit.matches_lost;
    audit.match_win_pct = totalMatches ? Math.round((audit.matches_won / totalMatches) * 1000) / 10 : '';
    audit.points_surface_profile = [
      ['CLAY', audit.points_clay],
      ['HARD', audit.points_hard],
      ['GRASS', audit.points_grass],
      ['INDOOR', audit.points_indoor],
    ].sort((a, b) => b[1] - a[1]).map(([surface, points]) => `${surface}:${points}`).join('|');
    audit.top_points_sources = pointSources
      .sort((a, b) => b.points - a.points)
      .slice(0, 8)
      .map((s) => `${s.name}:${s.points}:${s.round}:${s.surface}`)
      .join('|');
    delete audit.best_result_points;
    return audit;
  }, []);

  const handleDownloadTop60 = useCallback(() => {
    if (!top60.length) return;

    const attrKeys = Array.from(new Set(
      top60.flatMap(({ player }) => Object.keys(player?.attrs ?? {}))
    )).sort();
    const prefKeys = Array.from(new Set(
      top60.flatMap(({ player }) => Object.keys(mergeGeneratedPrefs(player?.attrs ?? {}, player?.prefs ?? {})))
    )).sort();

    const headers = [
      'rank_position',
      'ranking_scope',
      'ranking_tab',
      'season_year',
      'player_id',
      'name',
      'nationality',
      'age',
      'points',
      'overall',
      'overall_grade',
      'style_id',
      'signature_shot',
      'rally_pattern',
      'dna_score',
      'dna_tier',
      'potential',
      'traits_count',
      'traits_ids',
      'traits_tiers',
      'active_results_total',
      'active_results_used',
      'active_points_total_raw',
      'active_points_used_sum',
      'active_points_mandatory',
      'active_points_optional',
      'active_titles',
      'active_finals',
      'active_slam_titles',
      'active_slam_finals',
      'active_masters_titles',
      'active_atp500_titles',
      'active_atp250_titles',
      'active_points_from_slams',
      'active_points_from_masters',
      'active_points_from_500',
      'active_points_from_250',
      'active_points_from_100',
      'active_points_from_finals',
      'active_points_from_other',
      'active_points_clay',
      'active_points_hard',
      'active_points_grass',
      'active_points_indoor',
      'active_points_surface_profile',
      'active_best_result',
      'active_best_result_category',
      'active_best_result_tournament',
      'active_best_8_sources',
      'active_all_sources',
      'season_events_played',
      'season_matches_won',
      'season_matches_lost',
      'season_match_win_pct',
      'season_titles_total',
      'season_finals_total',
      'season_slam_titles',
      'season_slam_finals',
      'season_masters_titles',
      'season_atp500_titles',
      'season_atp250_titles',
      'season_points_from_slams',
      'season_points_from_masters',
      'season_points_from_500',
      'season_points_from_250',
      'season_points_from_finals',
      'season_points_clay',
      'season_points_hard',
      'season_points_grass',
      'season_points_indoor',
      'season_points_surface_profile',
      'season_best_result',
      'season_best_result_category',
      'season_best_result_tournament',
      'season_top_points_sources',
      'career_events_played',
      'career_matches_won',
      'career_matches_lost',
      'career_match_win_pct',
      'career_titles_total',
      'career_finals_total',
      'career_slam_titles',
      'career_slam_finals',
      'career_masters_titles',
      'career_atp500_titles',
      'career_atp250_titles',
      'career_points_from_slams',
      'career_points_from_masters',
      'career_points_from_500',
      'career_points_from_250',
      'career_points_from_finals',
      'career_points_clay',
      'career_points_hard',
      'career_points_grass',
      'career_points_indoor',
      'career_points_surface_profile',
      'career_best_result',
      'career_best_result_category',
      'career_best_result_tournament',
      'career_top_points_sources',
    ];

    const csvEscape = (value) => {
      if (value == null) return '';
      const text = String(value);
      return /[",\n;]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
    };

    const rows = top60.map(({ player, position, points, used }) => {
      const attrs = player?.attrs ?? {};
      const prefs = mergeGeneratedPrefs(attrs, player?.prefs ?? {});
      const traits = getPlayerTraits(player);
      const ovr = overallRating(attrs);
      const grade = ovrTier(ovr).grade;
      const activeAudit = buildRankingStoreAudit(player?.id, { used }, mainTab === 'juniors');
      const seasonAudit = buildPlayerTournamentAudit(player?.id, tournamentResults);
      const careerAudit = buildPlayerTournamentAudit(player?.id, allTournamentResults);

      const base = {
        rank_position: position,
        ranking_scope: mainTab === 'juniors' ? 'junior' : mainTab === 'nextgen' ? (tourSub === 'live' ? 'nextgen_live' : 'nextgen_historico') : (tourSub === 'live' ? 'tour_live' : 'tour_historico'),
        ranking_tab: mainTab,
        season_year: state.year,
        player_id: player?.id ?? '',
        name: player?.name ?? '',
        nationality: player?.nationality ?? '',
        age: player?.age ?? '',
        points,
        overall: ovr,
        overall_grade: grade,
        style_id: player?.styleId ?? '',
        signature_shot: player?.signatureShot ?? '',
        rally_pattern: player?.rallyPattern ?? '',
        dna_score: player?.dna?.score ?? '',
        dna_tier: player?.dna?.tier ?? '',
        potential: player?.potential ?? '',
        traits_count: traits.length,
        traits_ids: traits.map((trait) => trait.traitId).join('|'),
        traits_tiers: traits.map((trait) => `${trait.traitId}:${trait.tier}`).join('|'),
        ...activeAudit,
        ...Object.fromEntries(Object.entries(seasonAudit).map(([key, value]) => [`season_${key}`, value])),
        ...Object.fromEntries(Object.entries(careerAudit).map(([key, value]) => [`career_${key}`, value])),
      };

      attrKeys.forEach((key) => {
        base[`attr_${key}`] = attrs[key] ?? '';
      });
      prefKeys.forEach((key) => {
        base[`pref_${key}`] = prefs[key] ?? '';
      });

      return base;
    });

    const allHeaders = [
      ...headers,
      ...attrKeys.map((key) => `attr_${key}`),
      ...prefKeys.map((key) => `pref_${key}`),
    ];

    const csv = [
      allHeaders.join(','),
      ...rows.map((row) => allHeaders.map((header) => csvEscape(row[header])).join(',')),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ranking_top60_${mainTab}_${tourSub}_${state.year}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [top60, mainTab, tourSub, state.year, tournamentResults, allTournamentResults, buildPlayerTournamentAudit, buildRankingStoreAudit]);

  if (selPlayer) {
    const rankingKeys = list.map(e => e.player.id);
    const handleNavigate = (id) => {
      const entry = list.find(e => e.player.id === id);
      if (entry) setSelPlayer(entry.player);
    };
    return (
      <DefinitivePlayerProfile
        playerData={selPlayer}
        onBack={() => setSelPlayer(null)}
        allKeys={rankingKeys}
        onNavigate={handleNavigate}
        allPlayers={[...tourPlayers, ...prospects]}
        rankingStore={rankingStore}
        tournamentResults={allTournamentResults}
        dispatch={dispatch}
        year={state.year}
        rivalrySystem={state.rivalrySystem ?? null}
        newsEngine={state.newsEngine ?? null}
        sponsorPool={state.sponsorPool ?? null}
        coachMarket={state.coachMarket ?? null}
        chronicleEngine={state.chronicleEngine ?? null}
        historyBook={state.historyBook ?? null}
        radarFollowed={(state.radar?.followedPlayerIds ?? []).includes(selPlayer.id)}
        onToggleRadar={(player) => {
          const ids = state.radar?.followedPlayerIds ?? [];
          dispatch?.({ type:'SET_RADAR_FOLLOWED', playerIds: ids.includes(player.id) ? ids.filter(id => id !== player.id) : [...ids, player.id] });
        }}
      />
    );
  }

  const RankingPulseCard = ({ title, rows, color, mode = 'move', empty = 'Sem dados suficientes ainda.' }) => (
    <div style={{
      border:`1px solid ${color}2E`,
      background:`linear-gradient(180deg, ${color}10, rgba(255,255,255,.014))`,
      padding:'13px 14px',
      minHeight:148,
      overflow:'hidden',
    }}>
      <div style={{ fontFamily:T.mono, fontSize:7.5, color, letterSpacing:'.24em', textTransform:'uppercase', marginBottom:12 }}>
        {title}
      </div>
      {rows.length ? rows.map((entry) => (
        <div key={entry.player.id} onClick={() => setSelPlayer(entry.player)} style={{ display:'grid', gridTemplateColumns:'minmax(0,1fr) auto', alignItems:'center', gap:10, marginBottom:8, cursor:'pointer' }}>
          <div style={{ minWidth:0 }}>
            <div style={{ fontFamily:T.cond, fontSize:14, color:T.white, fontWeight:800, textTransform:'uppercase', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
              {entry.player.name}
            </div>
            <div style={{ fontFamily:T.mono, fontSize:7, color:T.faint, letterSpacing:'.12em', marginTop:1 }}>
              #{entry.position} · {entry.player.nationality}
            </div>
          </div>
          <div style={{ fontFamily:T.disp, fontSize:23, color, lineHeight:1, textAlign:'right' }}>
            {mode === 'move' ? `${entry.rankMove > 0 ? '+' : ''}${entry.rankMove}`
              : mode === 'points' ? entry.seasonPoints.toLocaleString()
              : mode === 'form' ? `${entry.form20.wins}-${entry.form20.losses}`
              : entry.momentum}
          </div>
        </div>
      )) : (
        <div style={{ fontFamily:T.body, fontSize:12, color:'rgba(242,237,228,.38)', lineHeight:1.55 }}>{empty}</div>
      )}
    </div>
  );

  const PRESS_VISION_BANK = {
    LEGEND_PEAK: [
      'Um icone no controle total do proprio tempo.',
      'A carreira ja virou legado, mas o presente ainda assusta.',
      'O circuito assiste a um grande nome jogando com autoridade de era.',
    ],
    LEGEND_LATE: [
      'Um icone lendario tentando esticar as ultimas grandes temporadas.',
      'A grandeza ainda aparece, mesmo quando o calendario ja cobra juros.',
      'O nome pesa mais que a idade, mas a margem de erro diminuiu.',
    ],
    DOMINANT_NUMBER_ONE: [
      'O numero um joga como se o ranking fosse consequencia, nao objetivo.',
      'A lideranca parece menos disputa e mais confirmacao semanal.',
      'O circuito inteiro mede sua temporada contra este padrao.',
    ],
    VULNERABLE_NUMBER_ONE: [
      'Ainda lidera, mas a sensacao e de uma coroa sob vigilancia.',
      'O ranking diz controle; a forma recente pede cautela.',
      'Numero um por pontos, mas ja nao por unanimidade emocional.',
    ],
    TOP_ELITE_RISING: [
      'Ja nao e promessa de elite; e ameaca concreta ao topo.',
      'A subida tem cara de permanencia, nao de pico isolado.',
      'O circuito comeca a tratar seu nome como problema semanal.',
    ],
    TOP_ELITE_STABLE: [
      'Um nome de elite que aprendeu a viver entre expectativas altas.',
      'Regularidade, peso e poucos buracos: perfil de top consolidado.',
      'Nao precisa fazer barulho para continuar ocupando espaco nobre.',
    ],
    TOP_ELITE_FALLING: [
      'A posicao ainda impressiona, mas a curva recente acende alerta.',
      'Segue no alto, embora o tenis ja mostre sinais de desgaste.',
      'O ranking protege a reputacao por enquanto.',
    ],
    LOW_POTENTIAL_OVERACHIEVER_TOP10: [
      'Uma surpresa de resiliencia que virou referencia no circuito.',
      'Sem rotulo de genio, construiu uma carreira que venceu previsoes.',
      'O ranking conta uma historia melhor que qualquer projecao antiga.',
    ],
    LOW_POTENTIAL_OVERACHIEVER: [
      'Um jogador que transformou teto modesto em carreira respeitavel.',
      'Pouca badalacao, muita entrega e resultados acima do esperado.',
      'Nao parecia destinado a muito, mas insistiu ate virar assunto.',
    ],
    HIGH_POTENTIAL_DELIVERING: [
      'O talento finalmente conversa com o resultado.',
      'A promessa deixou de ser estetica e virou producao.',
      'Um teto alto que comeca a aparecer tambem na tabela.',
    ],
    HIGH_POTENTIAL_STALLED_PRIME: [
      'Um prodigio que nunca encontrou seu ritmo.',
      'A promessa ainda existe no papel, mas a carreira segue sem resposta.',
      'O circuito ja nao pergunta sobre teto; pergunta por que ele nao apareceu.',
    ],
    HIGH_POTENTIAL_LATE_BLOOM: [
      'Depois de anos de cobranca, finalmente parece haver uma resposta.',
      'A carreira atrasou, mas o talento ainda tenta reescrever a manchete.',
      'Um antigo projeto de estrela com sinais tardios de combustao.',
    ],
    HIGH_POTENTIAL_YOUNG_HYPE: [
      'Um jovem de teto alto que ainda carrega mais futuro que passado.',
      'A expectativa e grande, mas a carreira ainda esta aprendendo a respirar.',
      'O circuito observa como quem espera a primeira grande prova.',
    ],
    YOUNG_BREAKOUT: [
      'A temporada tem cheiro de ruptura geracional.',
      'O nome saiu da lista de promessas e entrou no mapa de perigos reais.',
      'Poucos jovens estao acelerando com esta naturalidade.',
    ],
    YOUNG_UNPROVEN: [
      'Ainda e mais hipotese que realidade, mas a hipotese interessa.',
      'Ha sinais, ha pressa externa e ainda falta uma resposta grande.',
      'O talento pede paciencia antes de pedir manchete.',
    ],
    NEXTGEN_LEADER: [
      'O rosto mais forte da corrida NextGEN neste momento.',
      'Entre os jovens, poucos parecem tao prontos para o circuito adulto.',
      'A nova geracao ja tem um nome para perseguir.',
    ],
    NEXTGEN_PRESSURE: [
      'A idade protege, mas a expectativa ja comeca a cobrar.',
      'Ainda jovem, mas ja sem o conforto do anonimato.',
      'O proximo passo precisa aparecer antes que o hype mude de tom.',
    ],
    PRIME_SURGE: [
      'No auge fisico, encontrou uma marcha que muda a temporada.',
      'A idade e o momento finalmente apontam para o mesmo lado.',
      'Parece menos fase e mais chegada ao proprio centro competitivo.',
    ],
    PRIME_STABLE: [
      'Um profissional em plena faixa de rendimento, sólido e previsível.',
      'Nao encanta sempre, mas entrega quase toda semana.',
      'O ranking reflete uma carreira em ritmo funcional.',
    ],
    PRIME_STUCK: [
      'Uma carreira no meio do caminho: boa demais para sumir, insuficiente para romper.',
      'A sensacao e de estabilidade sem vertigem.',
      'Falta um golpe de temporada para sair da zona morna.',
    ],
    LATE_CAREER_SURPRISE: [
      'Uma arrancada tardia que obriga o circuito a rever julgamentos.',
      'A idade sugeria teto; a temporada respondeu com porta aberta.',
      'O nome reaparece quando muita gente ja tinha parado de olhar.',
    ],
    VETERAN_RESILIENT: [
      'Um veterano que ainda ganha jogos pela soma de oficio e orgulho.',
      'A experiencia continua comprando tempo competitivo.',
      'Pode nao ter explosao, mas conhece atalhos que jovens ainda ignoram.',
    ],
    VETERAN_DECLINE: [
      'A carreira ainda tem nome, mas o ranking ja sente o peso dos anos.',
      'O declinio nao e colapso; e erosao lenta.',
      'Cada boa semana parece mais preciosa que a anterior.',
    ],
    VETERAN_LAST_DANCE: [
      'Tem cheiro de ultimos grandes argumentos no circuito.',
      'A pergunta ja nao e quanto pode subir, mas quanto ainda pode resistir.',
      'Joga contra rivais e contra o calendario.',
    ],
    RANKING_CLIMBER: [
      'A subida no ranking ja virou a historia da temporada.',
      'Poucos nomes ganharam tanto terreno com tanta clareza.',
      'A tabela esta se ajustando a uma realidade nova.',
    ],
    RANKING_FREEFALL: [
      'A queda pede explicacao antes que vire identidade.',
      'O ranking esta contando uma historia que a equipe precisa interromper.',
      'Cada semana ruim transforma preocupacao em narrativa.',
    ],
    FORM_HOT: [
      'A forma recente faz o ranking parecer atrasado.',
      'Neste recorte, poucos jogadores parecem tao perigosos.',
      'O momento e melhor que a etiqueta atual.',
    ],
    FORM_COLD: [
      'A fase recente esfriou a conversa ao redor do nome.',
      'Os resultados pedem reparo antes de qualquer ambicao maior.',
      'A imprensa ja troca expectativa por cautela.',
    ],
    POINTS_RACE_STAR: [
      'A producao anual coloca seu nome no centro da temporada.',
      'Nao e so ranking acumulado: este ano tambem pertence a ele.',
      'Os pontos novos sustentam uma candidatura real.',
    ],
    POINTS_EMPTY: [
      'A temporada ainda procura uma campanha que mude o tom.',
      'Pouco ponto novo, pouca manchete nova.',
      'O ano ainda nao ofereceu argumento forte.',
    ],
    TOP50_DANGER: [
      'Um top 50 que ninguem quer ver cedo na chave.',
      'Ranking medio, potencial de estrago alto.',
      'Perigoso demais para ser tratado como numero comum.',
    ],
    TOP100_FLOATING: [
      'Vive na fronteira onde uma semana muda tudo.',
      'Ainda busca transformar presenca em permanencia.',
      'O ranking existe, mas a seguranca ainda nao.',
    ],
    JOURNEYMAN_STEADY: [
      'Um trabalhador do circuito, mais constante que espetacular.',
      'Nao vende sonho grande, mas entrega resistencia semanal.',
      'Carreira de oficio, pontos e sobrevivencia.',
    ],
    UNDERDOG_STORY: [
      'Uma historia de resistencia que ganhou mais paginas que o previsto.',
      'Segue provando que previsão baixa não encerra carreira.',
      'O circuito adora quando um nome assim insiste ate incomodar.',
    ],
    FORMER_HYPE_SILENT: [
      'Antes cercado por hype, agora tenta recuperar voz no circuito.',
      'O silencio atual pesa mais porque a expectativa ja foi alta.',
      'A promessa antiga virou pergunta incomoda.',
    ],
    FORMER_FAILURE_REBORN: [
      'Depois de ser tratado como caso perdido, voltou a produzir duvida.',
      'A velha critica ainda existe, mas os resultados comecam a responder.',
      'O circuito talvez tenha julgado cedo demais.',
    ],
    CONSISTENT_FINALIST: [
      'Chega longe com frequencia, mas ainda precisa transformar presenca em trofeu.',
      'A consistencia e clara; falta o ultimo argumento.',
      'Finalista recorrente, campeao ainda em negociacao.',
    ],
    SMALL_TITLES_BIG_VOLUME: [
      'Empilha semanas boas, mesmo sem dominar os maiores palcos.',
      'Construiu valor em volume, nao em uma unica explosao.',
      'A carreira cresce pela soma, nao pelo susto.',
    ],
    SURFACE_SPECIALIST: [
      'Especialista o bastante para mudar qualquer chave no piso certo.',
      'Seu perigo depende do calendario, mas no terreno certo e real.',
      'Nao e universal, mas tem territorio proprio.',
    ],
    INJURY_SHADOW: [
      'A avaliacao publica passa pelo corpo tanto quanto pelo tenis.',
      'O circuito ainda espera uma sequencia sem interrupcoes.',
      'O talento existe; a disponibilidade decide a manchete.',
    ],
    DEFAULT_SOLID: [
      'Uma temporada em construcao, sem rotulo definitivo.',
      'O ranking oferece pistas, mas ainda nao uma frase final.',
      'Um nome em avaliacao aberta pela imprensa do circuito.',
    ],
  };

  const pickStable = (arr, key) => arr[Math.abs(String(key).split('').reduce((n, ch) => ((n * 31) + ch.charCodeAt(0)) | 0, 7)) % arr.length];

  const buildPressVision = (entry) => {
    const player = entry.player;
    const age = Number(player?.age ?? 0);
    const ovr = overallRating(player?.attrs ?? {});
    const pot = Number(player?.potential ?? player?.ceiling ?? player?.attrs?.potencial ?? ovr);
    const rank = Number(entry.position);
    const move = Number(entry.rankMove ?? 0);
    const form = Number(entry.form20?.pct ?? 0);
    const formTotal = Number(entry.form20?.total ?? 0);
    const ptsYear = Number(entry.seasonPoints ?? 0);
    const titles = Number(player?.careerTitles ?? player?.titles ?? player?.stats?.titles ?? 0);
    const gs = Number(player?.grandSlams ?? player?.gs ?? player?.stats?.gs ?? 0);
    const highPot = pot >= 86 || (pot - ovr) >= 10;
    const lowPot = pot <= 72;
    const young = age > 0 && age < 22;
    const prime = age >= 24 && age <= 29;
    const veteran = age >= 32;
    const late = age >= 34;
    const elite = rank <= 10;
    const legend = gs >= 3 || titles >= 20 || (rank <= 3 && age >= 30);
    const hot = formTotal >= 8 && form >= 70;
    const cold = formTotal >= 8 && form < 45;

    let category = 'DEFAULT_SOLID';
    if (legend && rank <= 5 && !late) category = 'LEGEND_PEAK';
    else if (legend && late) category = 'LEGEND_LATE';
    else if (rank === 1 && hot) category = 'DOMINANT_NUMBER_ONE';
    else if (rank === 1 && cold) category = 'VULNERABLE_NUMBER_ONE';
    else if (young && rank <= 20) category = 'NEXTGEN_LEADER';
    else if (young && highPot && rank > 80) category = 'HIGH_POTENTIAL_YOUNG_HYPE';
    else if (young && move > 12) category = 'YOUNG_BREAKOUT';
    else if (young && cold) category = 'NEXTGEN_PRESSURE';
    else if (highPot && prime && rank > 45 && move <= 3) category = 'HIGH_POTENTIAL_STALLED_PRIME';
    else if (highPot && age >= 29 && move > 8) category = 'HIGH_POTENTIAL_LATE_BLOOM';
    else if (highPot && (elite || ptsYear >= 1200)) category = 'HIGH_POTENTIAL_DELIVERING';
    else if (lowPot && elite) category = 'LOW_POTENTIAL_OVERACHIEVER_TOP10';
    else if (lowPot && (rank <= 50 || move > 8)) category = 'LOW_POTENTIAL_OVERACHIEVER';
    else if (veteran && rank <= 20 && hot) category = 'VETERAN_RESILIENT';
    else if (late && rank > 60) category = 'VETERAN_LAST_DANCE';
    else if (veteran && (cold || move < -6)) category = 'VETERAN_DECLINE';
    else if (age >= 30 && move > 10) category = 'LATE_CAREER_SURPRISE';
    else if (move > 15) category = 'RANKING_CLIMBER';
    else if (move < -12) category = 'RANKING_FREEFALL';
    else if (hot) category = 'FORM_HOT';
    else if (cold) category = 'FORM_COLD';
    else if (ptsYear >= 1800) category = 'POINTS_RACE_STAR';
    else if (ptsYear === 0 && rank > 20) category = 'POINTS_EMPTY';
    else if (elite && move >= 0) category = 'TOP_ELITE_STABLE';
    else if (elite && move < 0) category = 'TOP_ELITE_FALLING';
    else if (rank <= 20 && move > 3) category = 'TOP_ELITE_RISING';
    else if (rank <= 50) category = 'TOP50_DANGER';
    else if (rank <= 100 && highPot) category = 'FORMER_HYPE_SILENT';
    else if (rank <= 100) category = 'TOP100_FLOATING';
    else if (prime && move > 5) category = 'PRIME_SURGE';
    else if (prime && rank <= 60) category = 'PRIME_STABLE';
    else if (prime) category = 'PRIME_STUCK';
    else if (lowPot) category = 'UNDERDOG_STORY';
    else category = 'JOURNEYMAN_STEADY';

    return pickStable(PRESS_VISION_BANK[category] ?? PRESS_VISION_BANK.DEFAULT_SOLID, `${player.id}-${state.year}-${category}`);
  };

  const natToISO2 = (nat) => {
    const MAP = {
      ESP:'es', ITA:'it', FRA:'fr', GER:'de', SRB:'rs', AUS:'au', USA:'us',
      BRA:'br', ARG:'ar', RUS:'ru', JPN:'jp', CAN:'ca', KOR:'kr', CHN:'cn',
      SWE:'se', NOR:'no', CHE:'ch', POR:'pt', POL:'pl', GRE:'gr', DEN:'dk',
      AUT:'at', UKR:'ua', RSA:'za', CZE:'cz', BEL:'be', HUN:'hu', CHI:'cl',
      COL:'co', MEX:'mx', EGY:'eg', MAR:'ma', IND:'in', NZL:'nz', FIN:'fi',
      CRO:'hr', NGR:'ng', GHA:'gh', NED:'nl',
    };
    return MAP[String(nat ?? '').trim().toUpperCase()] ?? null;
  };

  const RankingFlag = ({ nat, size = 20 }) => {
    const iso2 = natToISO2(nat);
    if (!iso2) return null;
    return (
      <img
        src={`https://flagcdn.com/w40/${iso2}.png`}
        alt={nat}
        style={{
          width:size,
          height:'auto',
          borderRadius:2,
          flexShrink:0,
          display:'block',
          objectFit:'cover',
          boxShadow:'0 1px 4px rgba(0,0,0,.5)',
        }}
      />
    );
  };

  const RankRow = ({ entry, idx }) => {
    const { player, position, points, rankMove, seasonPoints, defendingPoints, form20, momentum } = entry;
    const pc    = rankColor(position);
    const ovr   = overallRating(player.attrs);
    const isTop = position <= 3;
    const moveColor = rankMove > 0 ? '#55D98B' : rankMove < 0 ? '#FF6B6B' : T.faint;
    const formColor = form20.pct >= 75 ? '#55D98B' : form20.pct >= 60 ? '#A3D977' : form20.pct >= 45 ? T.gold : '#FF6B6B';
    const momentumColor = momentum >= 78 ? '#55D98B' : momentum >= 58 ? T.gold : momentum >= 40 ? '#FF9F43' : '#FF6B6B';
    const pressVision = buildPressVision(entry);
    return (
      <div onClick={() => setSelPlayer(player)} style={{
        display:'grid',
        gridTemplateColumns:'74px 44px minmax(170px,260px) 68px 126px minmax(300px,1fr) 128px 98px 108px 96px 108px 108px',
        alignItems:'center',
        gap:12,
        padding: isTop ? '14px 22px' : '10px 22px',
        borderBottom:'1px solid rgba(255,255,255,.04)',
        background: position===1 ? 'rgba(232,200,74,.04)' : position<=3 ? 'rgba(255,255,255,.02)' : 'transparent',
        cursor:'pointer', transition:'background .15s',
        animation:`bu-in .3s ${idx*.012}s both`,
      }}
        onMouseEnter={e => { e.currentTarget.style.background='rgba(255,255,255,.04)'; }}
        onMouseLeave={e => { e.currentTarget.style.background=position===1?'rgba(232,200,74,.04)':position<=3?'rgba(255,255,255,.02)':'transparent'; }}
      >
        <div style={{ fontFamily:T.disp, fontSize:isTop?31:20, color:pc, textAlign:'right', lineHeight:1 }}>#{position}</div>
        <PlayerFace player={player} size={isTop?38:30} borderColor={player.color?`${player.color}55`:T.border} />
        <div style={{ fontFamily:T.cond, fontSize:isTop?18:15, fontWeight:900, color:T.white, letterSpacing:'.07em', textTransform:'uppercase', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', minWidth:0 }}>
          {player.name}
        </div>
        <div style={{ fontFamily:T.disp, fontSize:isTop?21:18, color:T.dim, lineHeight:1 }}>
          {player.age}<span style={{ fontSize:10, color:T.faint }}>a</span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:7, minWidth:0 }}>
          <RankingFlag nat={player.nationality} size={21} />
          <span style={{ fontFamily:T.mono, fontSize:8, color:T.faint, letterSpacing:'.14em', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{player.nationality}</span>
        </div>
        <div style={{
          minHeight:34,
          display:'flex',
          alignItems:'center',
          padding:'0 10px',
          borderLeft:'1px solid rgba(255,255,255,.045)',
          color:'rgba(242,237,228,.58)',
          fontFamily:T.body,
          fontSize:12,
          lineHeight:1.35,
          overflow:'hidden',
        }}>
          <span style={{ display:'block', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
            {pressVision}
          </span>
        </div>
        <div>
          <div style={{ display:'flex', alignItems:'baseline', justifyContent:'space-between', gap:8 }}>
            <span style={{ fontFamily:T.disp, fontSize:22, color:formColor, lineHeight:1 }}>
              {form20.total ? `${form20.wins}-${form20.losses}` : '—'}
            </span>
            <span style={{ fontFamily:T.mono, fontSize:8, color:formColor }}>{form20.total ? `${form20.pct}%` : ''}</span>
          </div>
          <div style={{ height:4, background:'rgba(255,255,255,.055)', borderRadius:3, overflow:'hidden', marginTop:5 }}>
            <div style={{ width:`${form20.total ? form20.pct : 0}%`, height:'100%', background:formColor, borderRadius:3 }} />
          </div>
          <div style={{ fontFamily:T.mono, fontSize:7, color:T.faint, letterSpacing:'.14em', marginTop:3 }}>FORMA 20</div>
        </div>
        <div style={{ textAlign:'right' }}>
          <div style={{ fontFamily:T.disp, fontSize:22, color:momentumColor, lineHeight:1 }}>{momentum}</div>
          <div style={{ fontFamily:T.mono, fontSize:7, color:T.faint, letterSpacing:'.14em', marginTop:2 }}>MOMENTUM</div>
        </div>
        <div style={{ textAlign:'right' }}>
          <div style={{ fontFamily:T.disp, fontSize:22, color:T.gold, lineHeight:1 }}>{seasonPoints.toLocaleString()}</div>
          <div style={{ fontFamily:T.mono, fontSize:7, color:T.faint, letterSpacing:'.14em', marginTop:2 }}>PTS ANO</div>
        </div>
        <div style={{ textAlign:'right' }} title="Pontos ativos da temporada anterior que ainda serão defendidos até o fim do calendário.">
          <div style={{ fontFamily:T.disp, fontSize:20, color:defendingPoints ? '#FF9F43' : T.faint, lineHeight:1 }}>{defendingPoints ? defendingPoints.toLocaleString() : '—'}</div>
          <div style={{ fontFamily:T.mono, fontSize:7, color:T.faint, letterSpacing:'.14em', marginTop:2 }}>DEFESA</div>
        </div>
        <div style={{ textAlign:'right' }}>
          <div style={{ fontFamily:T.disp, fontSize:22, color:moveColor, lineHeight:1 }}>
            {rankMove > 0 ? `▲${rankMove}` : rankMove < 0 ? `▼${Math.abs(rankMove)}` : '•'}
          </div>
          <div style={{ fontFamily:T.mono, fontSize:7, color:T.faint, letterSpacing:'.14em', marginTop:2 }}>MOV.</div>
        </div>
        <div style={{ textAlign:'right' }}>
          <div style={{ fontFamily:T.disp, fontSize:isTop?25:20, color:pc, lineHeight:1 }}>{points.toLocaleString()}</div>
          <div style={{ fontFamily:T.mono, fontSize:7, color:T.faint, letterSpacing:'.16em', marginTop:2 }}>PTS</div>
        </div>
      </div>
    );
  };

  return (
    <div style={{ animation:'bu-in .4s ease both' }}>
      <div style={{ padding:'32px 40px 0', borderBottom:'1px solid rgba(255,255,255,.06)' }}>
        <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', marginBottom:0 }}>
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
              <div style={{ width:24, height:2, background:T.clay }} />
              <span style={{ fontFamily:T.mono, fontSize:9, letterSpacing:'.44em', color:T.clay, textTransform:'uppercase' }}>T.{state.year}</span>
            </div>
            <div style={{ fontFamily:T.disp, fontSize:'clamp(40px,4.5vw,64px)', letterSpacing:'.04em', color:T.white, textTransform:'uppercase', lineHeight:.95, marginBottom:20 }}>
              Rankings
            </div>
          </div>
          <div style={{ display:'flex', gap:0, alignSelf:'flex-end' }}>
            {[{id:'tour',label:'TOUR PRINCIPAL'},{id:'nextgen',label:'RANKING NEXTGEN'},{id:'juniors',label:'RANKING JUNIOR'}].map(t => (
              <button key={t.id} onClick={() => setMainTab(t.id)} style={{
                fontFamily:T.mono, fontSize:9, letterSpacing:'.22em', padding:'12px 28px',
                background:mainTab===t.id?'rgba(255,255,255,.06)':'transparent',
                border:'none', borderBottom:mainTab===t.id?`2px solid ${T.gold}`:'2px solid transparent',
                color:mainTab===t.id?T.gold:T.faint, cursor:'pointer', transition:'all .15s', textTransform:'uppercase',
              }}>{t.label}</button>
            ))}
          </div>
        </div>
      </div>

      {(mainTab==='tour' || mainTab==='nextgen') && (
        <div style={{ display:'flex', gap:8, padding:'12px 40px', background:'rgba(255,255,255,.015)', borderBottom:'1px solid rgba(255,255,255,.06)' }}>
          {[{id:'live',label:'TEMPORADA ATUAL'},{id:'historico',label:'HISTORICO DE CARREIRA'}].map(s => (
            <button key={s.id} onClick={() => setTourSub(s.id)} style={{
              fontFamily:T.mono, fontSize:8.5, letterSpacing:'.2em', padding:'8px 18px',
              background:tourSub===s.id?'rgba(232,200,74,.12)':'rgba(255,255,255,.04)',
              border:tourSub===s.id?'1px solid rgba(232,200,74,.35)':'1px solid rgba(255,255,255,.08)',
              color:tourSub===s.id?T.gold:T.faint, cursor:'pointer', transition:'all .15s', textTransform:'uppercase',
            }}>{s.label}</button>
          ))}
          <div style={{ flex:1 }} />
          <button onClick={handleDownloadTop60} disabled={!top60.length} style={{
            fontFamily:T.mono, fontSize:8.5, letterSpacing:'.18em', padding:'8px 16px',
            background:top60.length ? 'rgba(74,144,217,.12)' : 'rgba(255,255,255,.03)',
            border:top60.length ? '1px solid rgba(74,144,217,.35)' : '1px solid rgba(255,255,255,.08)',
            color:top60.length ? '#7DB8FF' : T.faint, cursor:top60.length ? 'pointer' : 'not-allowed',
            transition:'all .15s', textTransform:'uppercase', marginRight:12,
          }}>
            Baixar Top 60
          </button>
          <span style={{ fontFamily:T.mono, fontSize:8.5, color:T.faint, letterSpacing:'.2em', alignSelf:'center' }}>{list.length} JOGADORES</span>
        </div>
      )}

      {mainTab==='juniors' && (
        <div style={{ display:'flex', gap:8, padding:'12px 40px', background:'rgba(255,255,255,.015)', borderBottom:'1px solid rgba(255,255,255,.06)' }}>
          <div style={{ flex:1 }} />
          <button onClick={handleDownloadTop60} disabled={!top60.length} style={{
            fontFamily:T.mono, fontSize:8.5, letterSpacing:'.18em', padding:'8px 16px',
            background:top60.length ? 'rgba(74,144,217,.12)' : 'rgba(255,255,255,.03)',
            border:top60.length ? '1px solid rgba(74,144,217,.35)' : '1px solid rgba(255,255,255,.08)',
            color:top60.length ? '#7DB8FF' : T.faint, cursor:top60.length ? 'pointer' : 'not-allowed',
            transition:'all .15s', textTransform:'uppercase', marginRight:12,
          }}>
            Baixar Top 60
          </button>
          <span style={{ fontFamily:T.mono, fontSize:8.5, color:T.faint, letterSpacing:'.2em', alignSelf:'center' }}>{list.length} JOGADORES</span>
        </div>
      )}

      {analyticsList.length > 0 && tourSub === 'live' && (
        <div style={{ padding:'18px 40px 6px' }}>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(5,minmax(0,1fr))', gap:10 }}>
            <RankingPulseCard title="Em alta" rows={risingPlayers} color="#55D98B" mode="move" empty="Sem grandes subidas registradas." />
            <RankingPulseCard title="Em queda" rows={fallingPlayers} color="#FF6B6B" mode="move" empty="Ninguém desabando no ranking por enquanto." />
            <RankingPulseCard title="Mais pontos no ano" rows={seasonPointLeaders} color={T.gold} mode="points" empty="A temporada ainda não pontuou o bastante." />
            <RankingPulseCard title="Melhor forma 20J" rows={formLeaders} color="#7DB8FF" mode="form" empty="Ainda faltam jogos para uma leitura de forma 20." />
            <RankingPulseCard title="Alerta Top 20" rows={pressureAlerts} color="#FF9F43" mode="form" empty="Top 20 sem alerta forte neste momento." />
          </div>
        </div>
      )}

      <div style={{ padding:'14px 40px 36px' }}>
        <div style={{ border:'1px solid rgba(255,255,255,.07)', background:'rgba(255,255,255,.012)', overflow:'hidden' }}>
          <div style={{
            display:'grid',
            gridTemplateColumns:'74px 44px minmax(170px,260px) 68px 126px minmax(300px,1fr) 128px 98px 108px 96px 108px 108px',
            gap:12,
            padding:'10px 22px',
            borderBottom:'1px solid rgba(255,255,255,.07)',
            background:'rgba(255,255,255,.025)',
            fontFamily:T.mono,
            fontSize:7.5,
            color:'rgba(242,237,228,.38)',
            letterSpacing:'.2em',
            textTransform:'uppercase',
          }}>
            <div style={{ textAlign:'right' }}>Rank</div>
            <div></div>
            <div>Nome</div>
            <div>Idade</div>
            <div>Nacionalidade</div>
            <div>Visão da imprensa</div>
            <div>Forma 20</div>
            <div style={{ textAlign:'right' }}>Momentum</div>
            <div style={{ textAlign:'right' }}>Pts Ano</div>
            <div style={{ textAlign:'right' }}>Defesa</div>
            <div style={{ textAlign:'right' }}>Mov.</div>
            <div style={{ textAlign:'right' }}>Pts</div>
          </div>
          <div style={{ maxHeight:'calc(100vh - 318px)', overflowY:'auto' }}>
          {list.length===0 ? (
            <div style={{ padding:'80px 40px', textAlign:'center', fontFamily:T.mono, fontSize:10, color:T.faint, letterSpacing:'.3em' }}>SIMULE TORNEIOS PARA GERAR O RANKING</div>
          ) : enrichedList.map((entry,idx) => <RankRow key={entry.player.id} entry={entry} idx={idx} />)}
          </div>
        </div>
      </div>
    </div>
  );
}

// """"""""""""""""""""""""""""""""""""""""""""""""""""""""""""•""""""
// NOTÍCIAS VIEW
// """"""""""""""""""""""""""""""""""""""""""""""""""""""""""""•""""""
function NoticiasView({ state }) {
  const { tournamentResults, events, year } = state;
  const playerMapAll = Object.fromEntries([...state.tourPlayers, ...state.prospects].map(p=>[p.id,p]));
  const allResults = Object.values(tournamentResults).filter(r => r._slim ? r.champion : r.bracket?.champion);
  const lastResult = allResults[allResults.length-1] ?? null;

  const champItems = lastResult ? (() => {
    const champ = lastResult._slim ? lastResult.champion : lastResult.bracket?.champion;
    const t = lastResult.tournament;
    const cc = CAT[t.category] ?? { main:'#888', icon:'?', label:t.category };
    return [{ id:`champ-${t.id}`, icon:cc.icon, color:cc.main, title:`${champ.name} vence ${t.name}`, desc:`${t.location} · ${t.month} ${year}`, player:champ, category:t.category, priority:100 }];
  })() : [];

  const EVENT_META = {
    injury:                  { icon:'[lesao]', color:'#F44336' },
    injury_wd:               { icon:'[lesao]', color:'#EF5350' },
    injury_return:           { icon:'[volta]', color:'#4CAF50' },
    in_match_injury:         { icon:'[atenc]', color:'#FF9800' },
    in_match_retirement:     { icon:'[amb]',   color:'#E53935' },
    retirement:              { icon:'[apos]',  color:'#90A4AE' },
    promotion:               { icon:'[promo]', color:'#00BCD4' },
    prospect_retired:        { icon:'[fin]',   color:'rgba(242,237,228,.28)' },
    STYLE_MIGRATION:         { icon:'[estilo]',color:'#CE93D8' },
    PARTNERSHIP_MILESTONE:   { icon:'[marco]', color:'#FFD54F' },
    PARTNERSHIP_RUPTURE:     { icon:'[rupt]',  color:'#EF5350' },
    PARTNERSHIP_STATE_CHANGE:{ icon:'[rel]',   color:'rgba(242,237,228,.38)' },
    COACH_HIRED:             { icon:'[trein]', color:'#80DEEA' },
    COACH_FIRED:             { icon:'[disp]',  color:'#FF8A65' },
    COACH_RENEWED:           { icon:'[renov]', color:'#A5D6A7' },
  };

  const ICON_MAP = {
    injury:'[L]', injury_wd:'[L]', injury_return:'[ok]', in_match_injury:'[!]',
    in_match_retirement:'[retiro]', retirement:'[apos]', promotion:'[promo]',
    prospect_retired:'[fin]', STYLE_MIGRATION:'[mig]', PARTNERSHIP_MILESTONE:'[marco]',
    PARTNERSHIP_RUPTURE:'[rupt]', PARTNERSHIP_STATE_CHANGE:'[rel]',
    COACH_HIRED:'[t+]', COACH_FIRED:'[t-]', COACH_RENEWED:'[tren]',
    year:'[ano]', title:'[camp]',
  };

  const EVENT_PRIORITY = {
    injury:8, in_match_retirement:8, injury_wd:7, retirement:7,
    PARTNERSHIP_RUPTURE:6, PARTNERSHIP_MILESTONE:5, COACH_FIRED:5,
    promotion:5, COACH_HIRED:4, COACH_RENEWED:4, STYLE_MIGRATION:4,
    in_match_injury:3, injury_return:3, PARTNERSHIP_STATE_CHANGE:2,
    year:1, title:0, prospect_retired:1,
  };

  const COLOR_MAP = {
    injury:'#F44336', injury_wd:'#EF5350', injury_return:'#4CAF50',
    in_match_injury:'#FF9800', in_match_retirement:'#E53935',
    retirement:'#90A4AE', promotion:'#00BCD4', prospect_retired:'rgba(242,237,228,.28)',
    STYLE_MIGRATION:'#CE93D8', PARTNERSHIP_MILESTONE:'#FFD54F',
    PARTNERSHIP_RUPTURE:'#EF5350', PARTNERSHIP_STATE_CHANGE:'rgba(242,237,228,.38)',
    COACH_HIRED:'#80DEEA', COACH_FIRED:'#FF8A65', COACH_RENEWED:'#A5D6A7',
  };

  const allEvents = events
    .filter(ev => ev.text && ev.type!=='title' && (ev.year===undefined || ev.year===year))
    .map((ev,i) => ({
      id:`ev-${i}-${ev.type}`, color:COLOR_MAP[ev.type]??T.dim,
      title:ev.text, desc:ev.tournamentId?`${ev.tournamentId.replace(/_/g,' ')} · T.${ev.year??year}`:`T.${ev.year??year}`,
      player:ev.playerId?(playerMapAll[ev.playerId]??null):null,
      priority:EVENT_PRIORITY[ev.type]??2, type:ev.type,
    }))
    .sort((a,b) => b.priority-a.priority);

  const allItems = [...champItems, ...allEvents];
  const featured = allItems.slice(0,3);
  const rest     = allItems.slice(3);

  const typeLabel = (type) => {
    const map = {
      injury:'LESAO', injury_wd:'RETIRADA', injury_return:'RETORNO', in_match_injury:'ATENDIMENTO',
      in_match_retirement:'ABANDONO', retirement:'APOSENTADORIA', promotion:'PROMOCAO',
      STYLE_MIGRATION:'EVOLUCAO', PARTNERSHIP_MILESTONE:'MARCO', PARTNERSHIP_RUPTURE:'RUPTURA',
      COACH_HIRED:'TECNICO', COACH_FIRED:'DISPENSA', COACH_RENEWED:'RENOVACAO',
    };
    return map[type] ?? type?.toUpperCase() ?? 'EVENTO';
  };

  return (
    <div style={{ animation:'bu-in .4s ease both' }}>
      <div style={{ padding:'32px 40px 28px', borderBottom:'1px solid rgba(255,255,255,.06)', display:'flex', alignItems:'flex-end', gap:20 }}>
        <div>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
            <div style={{ width:24, height:2, background:T.clay }} />
            <span style={{ fontFamily:T.mono, fontSize:9, letterSpacing:'.44em', color:T.clay, textTransform:'uppercase' }}>TEMPORADA {year}</span>
          </div>
          <div style={{ fontFamily:T.disp, fontSize:'clamp(40px,4.5vw,64px)', letterSpacing:'.04em', color:T.white, textTransform:'uppercase', lineHeight:.95 }}>Noticias</div>
        </div>
        <div style={{ flex:1 }} />
        <div style={{ fontFamily:T.mono, fontSize:9, color:T.faint, letterSpacing:'.24em', alignSelf:'center' }}>
          {allItems.length} EVENTOS REGISTRADOS
        </div>
      </div>

      {allItems.length===0 ? (
        <div className="ui-empty-state" style={{ minHeight:'60vh', border:'none', background:'transparent', boxShadow:'none' }}>
          <div className="ui-empty-kicker">Redação</div>
          <div className="ui-empty-title">Nenhuma notícia ainda</div>
          <div className="ui-empty-copy">Simule torneios para abrir a cobertura do circuito, destravar manchetes e alimentar a redação.</div>
        </div>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 400px' }}>
          <div style={{ borderRight:'1px solid rgba(255,255,255,.06)' }}>
            {featured.map((item,i) => (
              <div key={item.id} style={{
                padding: i===0 ? '28px 40px' : '20px 40px',
                borderBottom:'1px solid rgba(255,255,255,.05)',
                borderLeft:`3px solid ${item.color}${i===0?'':'55'}`,
                background: i===0 ? `${item.color}06` : 'rgba(255,255,255,.012)',
              }}>
                <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
                  <div style={{ padding:'3px 8px', background:`${item.color}18`, border:`1px solid ${item.color}33` }}>
                    <span style={{ fontFamily:T.mono, fontSize:7.5, color:item.color, letterSpacing:'.2em', textTransform:'uppercase' }}>
                      {item.category ? (CAT[item.category]?.label ?? item.category) : typeLabel(item.type)}
                    </span>
                  </div>
                  <span style={{ fontFamily:T.mono, fontSize:8, color:T.faint, letterSpacing:'.12em' }}>{item.desc}</span>
                  {item.player && <PlayerFace player={item.player} size={20} borderColor={`${item.color}44`} />}
                </div>
                <div style={{ fontFamily:T.cond, fontSize: i===0?20:15, fontWeight:700, letterSpacing:'.06em', color:T.white, lineHeight:1.2, textTransform:'uppercase' }}>
                  {item.title}
                </div>
              </div>
            ))}

            {rest.length>0 && (
              <div style={{ padding:'24px 40px' }}>
                <div style={{ fontFamily:T.mono, fontSize:8, letterSpacing:'.34em', color:T.faint, textTransform:'uppercase', marginBottom:14 }}>MAIS EVENTOS</div>
                <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                  {rest.map(item => (
                    <div key={item.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 12px', background:'rgba(255,255,255,.018)', borderLeft:`2px solid ${item.color}44` }}>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontFamily:T.cond, fontSize:12, fontWeight:700, color:T.dim, letterSpacing:'.04em', textTransform:'uppercase', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{item.title}</div>
                      </div>
                      <span style={{ fontFamily:T.mono, fontSize:7.5, color:T.faint, letterSpacing:'.1em', flexShrink:0 }}>{item.desc}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div style={{ padding:'28px 24px' }}>
            <div style={{ fontFamily:T.mono, fontSize:8, letterSpacing:'.34em', color:T.faint, textTransform:'uppercase', marginBottom:16 }}>CAMPEOES RECENTES</div>
            {Object.values(state.tournamentResults)
              .filter(r => r._slim ? r.champion : r.bracket?.champion)
              .slice(-12).reverse()
              .map((r,i) => {
                const c = r._slim ? r.champion : r.bracket?.champion;
                const t = r.tournament;
                if (!c) return null;
                const cc = CAT[t?.category] ?? { main:'#888', icon:'?' };
                return (
                  <div key={i} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 0', borderBottom:'1px solid rgba(255,255,255,.04)' }}>
                    <PlayerFace player={c} size={24} borderColor={`${cc.main}44`} />
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontFamily:T.cond, fontSize:13, fontWeight:700, color:T.white, letterSpacing:'.04em', textTransform:'uppercase', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.name}</div>
                      <div style={{ fontFamily:T.mono, fontSize:7.5, color:T.faint, letterSpacing:'.12em', marginTop:1 }}>{t?.name}</div>
                    </div>
                    <SurfacePill surface={t?.surface} small />
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}

// """"""""""""""""""""""""""""""""""""""""""""""""""""""""""""•""""""
// ANALYTICS VIEW
// """"""""""""""""""""""""""""""""""""""""""""""""""""""""""""•""""""

// — Configs locais (SIGNATURE_SHOTS / RALLY_PATTERNS não exportados ainda) —
const AN_STYLES = {
  // Estilos originais
  AGG_BASELINER: { label:'Agg. Baseliner',      icon:'◆',  color:'#FF6B35', refs:'Djokovic · Alcaraz'      },
  CTR_PUNCHER:   { label:'Counter-Puncher',      icon:'◆', color:'#FF4444', refs:'Nadal · Murray'          },
  ALL_COURT:     { label:'All-Court',            icon:'◆',  color:'#FFD700', refs:'Federer · Graf'          },
  SRV_VOL:       { label:'Serve & Volley',       icon:'◆',  color:'#00FF88', refs:'McEnroe · Edberg'        },
  BIG_SERVER:    { label:'Big Server',           icon:'◆',  color:'#AA44FF', refs:'Isner · Karlovic'        },
  RETRIEVER:     { label:'Retriever',            icon:'◆',  color:'#00AAFF', refs:'Wozniacki · Ferrer'      },
  TAKEALLRISK:   { label:'Take All Risk',        icon:'◆',  color:'#FF69B4', refs:'Kyrgios · Gulbis'        },
  // Estilos expandidos
  GRINDER:       { label:'Grinder',              icon:'◆',  color:'#FF8800', refs:'Hewitt · Robredo'        },
  PWR_BASE:      { label:'Power Baseliner',      icon:'◆',  color:'#FF3300', refs:'Medvedev · Agassi'       },
  TACT_TEC:      { label:'Tactical Technician',  icon:'◆',  color:'#00CCFF', refs:'Henin · Stosur'          },
  NET_SPEC:      { label:'Net Specialist',       icon:'◆', color:'#88FF44', refs:'Navratilova · Rafter'    },
  ADPT_TAC:      { label:'Adaptive Tactical',    icon:'◆',  color:'#C84FEB', refs:'Thiem · Zverev'          },
};

const AN_SIGS = {
  // Forehand
  INSIDE_OUT_FH:    { label:'Inside-Out FH',       icon:'•',  color:'#FF6B35' },
  INSIDE_IN_FH:     { label:'Forehand Inside-In',  icon:'•',  color:'#FF8C42' },
  BANANA_FH:        { label:'Banana FH',           icon:'•',  color:'#FFD700' },
  HEAVY_TOPSPIN_CC: { label:'Cruzado Pesado',      icon:'•',  color:'#FF6B35' },
  SHORT_ANGLE_FH:   { label:'Ângulo Curto FH',      icon:'•',   color:'#FFC107' },
  RUNNING_FH:       { label:'FH em Corrida',       icon:'•',  color:'#FF9800' },
  // Topspin pesado
  HEAVY_TOP_CC:     { label:'Topspin Pesado CC',   icon:'•',  color:'#00BCD4' },
  HEAVY_TOP_DTL:    { label:'Topspin Pesado DTL',  icon:'•',  color:'#0097A7' },
  HEAVY_TOP_BODY:   { label:'Topspin no Corpo',    icon:'•',  color:'#26C6DA' },
  // Backhand
  DTL_BH:           { label:'Backhand DTL',        icon:'•',  color:'#E91E63' },
  BANANA_BH:        { label:'Banana BH',           icon:'•',  color:'#FFC107' },
  SLICE_BH:         { label:'Slice BH',            icon:'•',  color:'#2ECC71' },
  BH_CHIP_RETURN:   { label:'Chip BH',             icon:'•',  color:'#4CAF50' },
  TOPSPIN_CROSS:    { label:'Topspin Cruzado',     icon:'•',  color:'#00BCD4' },
  SHORT_ANGLE_BH:   { label:'Ângulo Curto BH',      icon:'•',   color:'#00E5FF' },
  // Táticos
  DROP_SHOT:        { label:'Drop Shot',           icon:'•',  color:'#F48FB1' },
  MOONBALL:         { label:'Moonball',            icon:'•',  color:'#B0BEC5' },
  TOPSPIN_PASS:     { label:'Passing Topspin',     icon:'•',  color:'#66BB6A' },
  SLICE_APPROACH:   { label:'Slice Aproximação',   icon:'•',  color:'#81C784' },
  LOB_ATTACK:       { label:'Lob Ofensivo',        icon:'•',  color:'#AB47BC' },
  // Saque
  BIG_SERVE:        { label:'Saque Dominador',     icon:'•',  color:'#AA44FF' },
  FLAT_SERVE_T:     { label:'Saque no T',          icon:'•',  color:'#7E57C2' },
  WIDE_SLICE_SERVE: { label:'Saque Slice Aberto',  icon:'•',  color:'#9575CD' },
  KICK_SERVE:       { label:'Kick Serve',          icon:'•',  color:'#8D6E63' },
  BODY_SERVE:       { label:'Saque no Corpo',      icon:'•',  color:'#A1887F' },
  // Rede
  VOLLEY_FINISH:    { label:'Voleio Finalizador',  icon:'•',  color:'#00FF88' },
  DROP_VOLLEY:      { label:'Drop Volley',         icon:'•',  color:'#80CBC4' },
  SWINGING_VOLLEY:  { label:'Swing Volley',        icon:'•',  color:'#26A69A' },
  SMASH:            { label:'Smash',               icon:'•',  color:'#EF5350' },
  // Power
  FLAT_WINNER:      { label:'Flat Winner',         icon:'•',  color:'#EF5350' },
  // Defesa
  DEFENSIVE_SLICE:  { label:'Slice Defensivo',     icon:'•', color:'#78909C' },
  RUNNING_DOWN_LOB: { label:'Defesa em Corrida',   icon:'•', color:'#90A4AE' },
};

const AN_RALLY = {
  CROSS_HEAVY:         { label:'Cruzado Dominante',    icon:'◇',  color:'#FF6B35' },
  DTL_HUNTER:          { label:'Caçador DTL',           icon:'◇',  color:'#EF5350' },
  DEEP_GRINDER:        { label:'Fundão Implacável',     icon:'◇',  color:'#FF4444' },
  SHORT_ANGLE_BUILDER: { label:'Construtor de Ângulos', icon:'◇',   color:'#FFD700' },
  CENTRE_CONTROL:      { label:'Controle Central',      icon:'◇',  color:'#CBD5E1' },
  AGGRESSIVE_EARLY:    { label:'Ataque Precoce',        icon:'◇',  color:'#FF69B4' },
  SERVE_PLUS_ONE:      { label:'Serve + 1',             icon:'◇', color:'#AA44FF' },
  NET_APPROACH:        { label:'Aproximação Rede',      icon:'◇',  color:'#00FF88' },
  DEFENSIVE_BASE:      { label:'Base Defensiva',        icon:'◇', color:'#00AAFF' },
  RHYTHM_DISRUPTION:   { label:'Quebra de Ritmo',       icon:'◇',  color:'#2ECC71' },
};

// — computeAnalytics: extrai win rates por estilo/sig/rally —
function computeAnalytics(state) {
  const allResults = {
    ...(state.historicalTournamentResults ?? {}),
    ...(state.tournamentResults ?? {}),
  };

  if (!allResults || Object.keys(allResults).length === 0) return null;

  // Mapa de id  — jogador (inclui aposentados)
  const allPlayers = [
    ...(state.tourPlayers ?? []),
    ...(state.prospects   ?? []),
    ...(state.retiredPlayers ?? []),
  ];
  const pMap = Object.fromEntries(allPlayers.map(p => [p.id, p]));

  // Acumuladores: { key  — { wins, losses, vs: { oppKey  — { wins, losses } } } }
  const styleAcc  = {};
  const sigAcc    = {};
  const rallyAcc  = {};

  const acc = (store, key, won, oppKey) => {
    if (!key) return;
    if (!store[key]) store[key] = { wins:0, losses:0, vs:{} };
    if (won) store[key].wins++; else store[key].losses++;
    if (oppKey && oppKey !== key) {
      if (!store[key].vs[oppKey]) store[key].vs[oppKey] = { wins:0, losses:0 };
      if (won) store[key].vs[oppKey].wins++; else store[key].vs[oppKey].losses++;
    }
  };

  Object.values(allResults).forEach(res => {
    if (res._slim) {
      // Slim format — temos apenas IDs, buscar estilo no playerMap
      (res.matches ?? []).forEach(({ w, l }) => {
        const wp = pMap[w];
        const lp = pMap[l];
        const wSty = wp?.styleId; const lSty = lp?.styleId;
        acc(styleAcc, wSty, true,  lSty);
        acc(styleAcc, lSty, false, wSty);
        const wSig = wp?.signatureShot; const lSig = lp?.signatureShot;
        acc(sigAcc, wSig, true,  lSig);
        acc(sigAcc, lSig, false, wSig);
        const wRly = wp?.rallyPattern; const lRly = lp?.rallyPattern;
        acc(rallyAcc, wRly, true,  lRly);
        acc(rallyAcc, lRly, false, wRly);
      });
      return;
    }
    const { bracket } = res;
    if (!bracket?.rounds) return;
    bracket.rounds.forEach(round => {
      round.forEach(match => {
        if (!match.winner || match.isBye) return;
        const winnerId = match.winner.id;
        const loser    = match.playerA?.id === winnerId ? match.playerB : match.playerA;
        if (!loser?.id) return;

        const wp = pMap[winnerId];
        const lp = pMap[loser.id];

        // Arquétipos
        const wSty = wp?.styleId; const lSty = lp?.styleId;
        acc(styleAcc, wSty, true,  lSty);
        acc(styleAcc, lSty, false, wSty);

        // Golpes assinatura
        const wSig = wp?.signatureShot; const lSig = lp?.signatureShot;
        acc(sigAcc, wSig, true,  lSig);
        acc(sigAcc, lSig, false, wSig);

        // Rally patterns
        const wRly = wp?.rallyPattern; const lRly = lp?.rallyPattern;
        acc(rallyAcc, wRly, true,  lRly);
        acc(rallyAcc, lRly, false, wRly);
      });
    });
  });

  const toRows = (acc, cfg) =>
    Object.entries(acc)
      .filter(([k]) => cfg[k])
      .map(([k, d]) => {
        const total   = d.wins + d.losses;
        const winRate = total > 0 ? d.wins / total : 0.5;
        const vs = Object.entries(d.vs)
          .filter(([ok]) => cfg[ok])
          .map(([ok, od]) => {
            const ot = od.wins + od.losses;
            return { key:ok, cfg:cfg[ok], wins:od.wins, losses:od.losses,
              total:ot, winRate: ot > 0 ? od.wins / ot : 0.5 };
          })
          .sort((a,b) => b.winRate - a.winRate);
        return { key:k, cfg:cfg[k], wins:d.wins, losses:d.losses, total, winRate, vs };
      })
      .sort((a,b) => b.winRate - a.winRate);

  const totalMatches = Object.values(allResults)
    .reduce((s, r) => s + (r._slim
      ? (r.matches?.length ?? 0)
      : (r.bracket?.rounds?.reduce((rs, rnd) => rs + rnd.filter(m => m.winner && !m.isBye).length, 0) ?? 0)
    ), 0);

  return {
    styles:  toRows(styleAcc,  AN_STYLES),
    sigs:    toRows(sigAcc,    AN_SIGS),
    rally:   toRows(rallyAcc,  AN_RALLY),
    totalMatches,
    seasons: new Set(Object.values(allResults).map(r => r._season ?? r.tournament?.season ?? r.tournament?.year).filter(Boolean)).size,
  };
}

// — Cor de performance —
function anPerfColor(wr) {
  if (wr >= 0.58) return '#2ECC71';
  if (wr >= 0.54) return '#A8E063';
  if (wr >= 0.50) return '#E8C84A';
  if (wr >= 0.46) return '#FF9800';
  return '#EF5350';
}

// — Barra de win rate —
function AnBar({ winRate, height=5 }) {
  const pct = (winRate * 100).toFixed(1);
  const c   = anPerfColor(winRate);
  return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', gap:3 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline' }}>
        <div style={{ fontFamily:T.mono, fontSize:8, color:RC.dim, letterSpacing:'.08em' }}>WIN RATE</div>
        <div style={{ fontFamily:T.mono, fontSize:16, fontWeight:700, color:c }}>{pct}%</div>
      </div>
      <div style={{ height, background:'rgba(242,237,228,.05)', borderRadius:2, overflow:'hidden',
        clipPath:`polygon(${height/2}px 0,100% 0,calc(100% - ${height/2}px) 100%,0 100%)` }}>
        <div style={{ height:'100%', width:`${pct}%`, background:`linear-gradient(90deg,${c},${c}bb)`,
          boxShadow:`0 0 8px ${c}50`, transition:'width .5s ease' }}/>
      </div>
    </div>
  );
}

// — Card de linha expandível —
function AnRow({ row, rankIdx }) {
  const [open, setOpen] = React.useState(false);
  const { cfg, wins, losses, total, winRate, vs } = row;
  const pc = anPerfColor(winRate);
  const dominated = winRate >= 0.58;
  const weak      = winRate < 0.44;

  return (
    <div style={{ borderRadius:4, overflow:'hidden',
      border:`1px solid ${dominated ? pc+'44' : weak ? '#EF535044' : 'rgba(242,237,228,.07)'}`,
      background: dominated ? `${pc}06` : weak ? '#EF535006' : 'rgba(242,237,228,.02)',
    }}>
      {/* Main row */}
      <div onClick={() => vs.length && setOpen(o => !o)} style={{
        padding:'12px 16px', borderLeft:`3px solid ${cfg.color}`,
        cursor: vs.length ? 'pointer' : 'default',
        display:'grid', gridTemplateColumns:'auto 1fr auto', gap:12, alignItems:'center',
        position:'relative', overflow:'hidden',
      }}>
        <div style={{ position:'absolute', inset:0,
          background:`linear-gradient(90deg,${cfg.color}08,transparent 50%)`, pointerEvents:'none' }}/>

        {/* Rank + icon + label */}
        <div style={{ display:'flex', alignItems:'center', gap:10, position:'relative' }}>
          <div style={{ fontFamily:T.mono, fontSize:8, color:RC.vdim, width:16, textAlign:'right' }}>
            #{rankIdx+1}
          </div>
          <div style={{ width:38, height:38, borderRadius:4, display:'flex', alignItems:'center',
            justifyContent:'center', fontSize:20,
            background:`${cfg.color}15`, border:`1px solid ${cfg.color}35` }}>
            {cfg.icon}
          </div>
          <div>
            <div style={{ fontFamily:T.disp, fontSize:13, fontWeight:700,
              color:'rgba(242,237,228,.9)', letterSpacing:'.06em' }}>
              {cfg.label}
            </div>
            {cfg.refs && (
              <div style={{ fontFamily:T.mono, fontSize:8, color:RC.dim, marginTop:1 }}>
                {cfg.refs}
              </div>
            )}
          </div>
        </div>

        {/* Win rate bar */}
        <div style={{ position:'relative' }}>
          <AnBar winRate={winRate} />
        </div>

        {/* W / L + toggle */}
        <div style={{ display:'flex', alignItems:'center', gap:12, position:'relative' }}>
          {/* Badges */}
          {dominated && (
            <div style={{ padding:'2px 6px', background:'#2ECC7120', border:'1px solid #2ECC7155',
              fontFamily:T.mono, fontSize:7, color:'#2ECC71', letterSpacing:'.1em' }}>FORTE</div>
          )}
          {weak && (
            <div style={{ padding:'2px 6px', background:'#EF535020', border:'1px solid #EF535055',
              fontFamily:T.mono, fontSize:7, color:'#EF5350', letterSpacing:'.1em' }}>FRACO</div>
          )}
          <div style={{ textAlign:'right', minWidth:60 }}>
            <div style={{ fontFamily:T.mono, fontSize:8, color:RC.dim, marginBottom:2 }}>W / L</div>
            <div style={{ fontFamily:T.mono, fontSize:11 }}>
              <span style={{ color:'#2ECC71', fontWeight:700 }}>{wins}</span>
              <span style={{ color:RC.vdim, margin:'0 3px' }}>/</span>
              <span style={{ color:'#EF5350', fontWeight:700 }}>{losses}</span>
            </div>
            <div style={{ fontFamily:T.mono, fontSize:8, color:RC.dim }}>{total} partidas</div>
          </div>
          {vs.length > 0 && (
            <div style={{ fontFamily:T.mono, fontSize:8, color:RC.dim,
              transform: open ? 'rotate(180deg)' : 'none', transition:'transform .2s' }}>⌄</div>
          )}
        </div>
      </div>

      {/* Expandable matchups */}
      {open && vs.length > 0 && (
        <div style={{ background:'rgba(0,0,0,.3)', borderTop:'1px solid rgba(242,237,228,.05)' }}>
          {vs.map((v, vi) => {
            const vpc = anPerfColor(v.winRate);
            const vpct = (v.winRate * 100).toFixed(1);
            return (
              <div key={v.key} style={{
                display:'grid', gridTemplateColumns:'auto 1fr auto',
                gap:10, alignItems:'center',
                padding:'9px 16px 9px 60px',
                borderBottom: vi < vs.length-1 ? '1px solid rgba(242,237,228,.04)' : 'none',
                background: vi%2===0 ? 'rgba(242,237,228,.01)' : 'transparent',
              }}>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <div style={{ width:2, height:20, background:`${cfg.color}55`, borderRadius:1 }}/>
                  <span style={{ fontSize:14 }}>{v.cfg.icon}</span>
                  <span style={{ fontFamily:T.cond ?? T.disp, fontSize:12,
                    color:'rgba(242,237,228,.6)', letterSpacing:'.04em' }}>
                    vs {v.cfg.label}
                  </span>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <div style={{ flex:1, height:3, background:'rgba(242,237,228,.05)', borderRadius:2, overflow:'hidden' }}>
                    <div style={{ height:'100%', width:`${vpct}%`,
                      background:`linear-gradient(90deg,${vpc},${vpc}bb)`, transition:'width .4s' }}/>
                  </div>
                  <div style={{ fontFamily:T.mono, fontSize:12, fontWeight:700,
                    color:vpc, minWidth:42, textAlign:'right' }}>{vpct}%</div>
                </div>
                <div style={{ fontFamily:T.mono, fontSize:10, color:RC.dim, whiteSpace:'nowrap' }}>
                  <span style={{ color:'#2ECC71' }}>{v.wins}W</span>
                  <span style={{ color:RC.vdim, margin:'0 3px' }}>/</span>
                  <span style={{ color:'#EF5350' }}>{v.losses}L</span>
                  <span style={{ color:RC.vdim, fontSize:9, marginLeft:4 }}>({v.total})</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// — Resumo de balanceamento —
function AnBalanceSummary({ rows, label }) {
  const strong = rows.filter(r => r.winRate >= 0.58);
  const ok     = rows.filter(r => r.winRate >= 0.46 && r.winRate < 0.58);
  const weak   = rows.filter(r => r.winRate < 0.46);
  return (
    <div style={{ background:RC.bg, border:`1px solid ${RC.border}`, borderRadius:4,
      padding:'14px 18px', display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12 }}>
      <div>
        <div style={{ fontFamily:T.mono, fontSize:8, color:RC.dim, letterSpacing:'.1em', marginBottom:4 }}>
          {label?.toUpperCase() || 'ELEMENTOS'}
        </div>
        <div style={{ fontFamily:T.mono, fontSize:20, color:RC.text, fontWeight:700 }}>{rows.length}</div>
      </div>
      {[
        { l:'Fortes 058%',   c:'#2ECC71', n:strong.length, items:strong },
        { l:'Neutros',        c:RC.gold,   n:ok.length,     items:ok     },
        { l:'Fracos <46%',   c:'#EF5350', n:weak.length,   items:weak   },
      ].map(s => (
        <div key={s.l}>
          <div style={{ fontFamily:T.mono, fontSize:8, color:s.c, letterSpacing:'.1em', marginBottom:4 }}>
            {s.l}
          </div>
          <div style={{ fontFamily:T.mono, fontSize:20, color:s.c, fontWeight:700 }}>{s.n}</div>
          {s.items.length > 0 && (
            <div style={{ fontFamily:T.mono, fontSize:9, color:RC.dim, marginTop:3 }}>
              {s.items.slice(0,2).map(r => r.cfg.icon).join(' ')}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// — Painel por sub-aba —
function AnSection({ rows, label, emptyMsg }) {
  if (!rows || rows.length === 0) {
    return (
      <div style={{ textAlign:'center', padding:'60px 0', color:RC.dim }}>
        <div style={{ fontSize:36, marginBottom:12, opacity:.3 }}>◇</div>
        <div style={{ fontFamily:T.mono, fontSize:10, letterSpacing:'.3em' }}>{emptyMsg}</div>
      </div>
    );
  }
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
      <AnBalanceSummary rows={rows} label={label} />
      <div style={{ height:8 }}/>
      {rows.map((r, i) => <AnRow key={r.key} row={r} rankIdx={i} />)}
    </div>
  );
}

// — Main AnalyticsView —
function AnalyticsView({ state }) {
  const [sub, setSub] = React.useState('arquétipos');
  const data = useMemo(() => {
    try { return computeAnalytics(state); } catch(e) { console.error(e); return null; }
  }, [state]);

  const subs = [
    { id:'arquétipos', label:'ARQUÉTIPOS',        count: data?.styles.length },
    { id:'golpes',     label:'GOLPES ASSINATURA',  count: data?.sigs.length  },
    { id:'rally',      label:'PADR"ES DE RALLY',   count: data?.rally.length },
  ];

  if (!data) return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:'60vh' }}>
      <div style={{ fontFamily:T.disp, fontSize:32, color:'rgba(242,237,228,.08)', letterSpacing:'.1em', textTransform:'uppercase', marginBottom:12 }}>Sem Dados Suficientes</div>
      <div style={{ fontFamily:T.mono, fontSize:9, color:'rgba(242,237,228,.06)', letterSpacing:'.3em' }}>JOGUE TORNEIOS PARA GERAR ESTATÍSTICAS</div>
    </div>
  );

  return (
    <div style={{ animation:'bu-in .4s ease both' }}>
      <div style={{ padding:'32px 40px 28px', borderBottom:'1px solid rgba(255,255,255,.06)' }}>
        <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', marginBottom:28 }}>
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
              <div style={{ width:24, height:2, background:T.clay }} />
              <span style={{ fontFamily:T.mono, fontSize:9, letterSpacing:'.44em', color:T.clay, textTransform:'uppercase' }}>MODO UNIVERSO</span>
            </div>
            <div style={{ fontFamily:T.disp, fontSize:'clamp(40px,4.5vw,64px)', letterSpacing:'.04em', color:T.white, textTransform:'uppercase', lineHeight:.95 }}>Analytics</div>
          </div>
          <div style={{ display:'flex', gap:12, alignItems:'flex-end' }}>
            {[
              { label:'PARTIDAS',   val:data.totalMatches.toLocaleString() },
              { label:'TEMPORADAS', val:data.seasons },
              { label:'ARQU0TIPOS', val:data.styles.length },
              { label:'GOLPES SIG.', val:data.sigs.length },
            ].map(s => (
              <div key={s.label} style={{ padding:'14px 22px', background:'rgba(255,255,255,.03)', border:'1px solid rgba(255,255,255,.07)', textAlign:'center', minWidth:110 }}>
                <div style={{ fontFamily:T.disp, fontSize:32, color:T.gold, lineHeight:1 }}>{s.val}</div>
                <div style={{ fontFamily:T.mono, fontSize:7.5, color:T.faint, letterSpacing:'.2em', textTransform:'uppercase', marginTop:6 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ display:'flex', gap:6 }}>
          {subs.map(s => (
            <button key={s.id} onClick={() => setSub(s.id)} style={{
              padding:'10px 24px', cursor:'pointer', transition:'all .15s',
              background: sub===s.id ? 'rgba(232,200,74,.12)' : 'rgba(255,255,255,.03)',
              border: sub===s.id ? '1px solid rgba(232,200,74,.35)' : '1px solid rgba(255,255,255,.07)',
              color: sub===s.id ? T.gold : T.faint,
              fontFamily:T.mono, fontSize:9, letterSpacing:'.16em', textTransform:'uppercase',
            }}>
              {s.label}
              {s.count>0 && <span style={{ marginLeft:8, padding:'1px 7px', background:'rgba(242,237,228,.08)', fontSize:8, color:T.dim }}>{s.count}</span>}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding:'28px 40px' }}>
      {sub==='arquétipos' && <AnSection rows={data.styles} label="Arquétipos"        emptyMsg="SEM DADOS DE ESTILOS — SIMULE TORNEIOS" />}
        {sub==='golpes'     && <AnSection rows={data.sigs}    label="Golpes Assinatura" emptyMsg="SEM DADOS DE GOLPES — SIMULE TORNEIOS" />}
        {sub==='rally'      && <AnSection rows={data.rally}   label="Padrões de Rally"  emptyMsg="SEM DADOS DE RALLY — SIMULE TORNEIOS" />}
      </div>
    </div>
  );
}

// """"""""""""""""""""""""""""""""""""""""""""""""""""""""""""•""""""
// RECORDES VIEW (em construção, mas com placeholders)
// """"""""""""""""""""""""""""""""""""""""""""""""""""""""""""•""""""
// """"""""""""""""""""""""""""""""""""""""""""""""""""""""""""•""""""
// RECORDES — helpers
// """"""""""""""""""""""""""""""""""""""""""""""""""""""""""""•""""""
const RC = {
  gold:   '#E8C84A', silver:'#CBD5E1', bronze:'#C97C3A',
  cyan:   '#00BCD4', purple:'#C84FEB', green: '#2ECC71',
  orange: '#FF7043', red:   '#EF5350', pink:  '#F48FB1',
  blue:   '#4A90D9', grass: '#2ECC71', clay:  '#D4561E',
  dim:    'rgba(242,237,228,0.38)', vdim:'rgba(242,237,228,0.12)',
  bg:     'rgba(242,237,228,0.025)', border:'rgba(242,237,228,0.07)',
  text:   'rgba(242,237,228,0.9)',
};
const MEDAL_COLOR = [RC.gold, RC.silver, RC.bronze];
const SHOT_TYPE_ORDER = [
  'FLAT', 'TOPSPIN', 'DRIVE', 'SLICE', 'VOLLEY', 'DROP', 'DROP2',
  'SMASH', 'LOB_DEF', 'LOB_ATK', 'BANANA', 'PASSING',
  'SHORT_ANGLE', 'SLICE_SHORT', 'HALF_VOLLEY', 'HEAVY_TOP',
  'ACCEL', 'SHORT_ACCEL',
];
const SHOT_TYPE_META = {
  FLAT:         { label: 'Flat', color: RC.silver },
  TOPSPIN:      { label: 'Topspin', color: RC.red },
  DRIVE:        { label: 'Drive', color: RC.orange },
  SLICE:        { label: 'Slice', color: RC.cyan },
  VOLLEY:       { label: 'Volley', color: RC.green },
  DROP:         { label: 'Drop Shot', color: RC.pink },
  DROP2:        { label: 'Drop Shot 2', color: RC.pink },
  SMASH:        { label: 'Smash', color: RC.gold },
  LOB_DEF:      { label: 'Lob Defensivo', color: RC.blue },
  LOB_ATK:      { label: 'Lob Ofensivo', color: RC.purple },
  BANANA:       { label: 'Banana', color: '#FFB74D' },
  PASSING:      { label: 'Passing', color: '#7E57C2' },
  SHORT_ANGLE:  { label: 'ângulo Curto', color: '#4DD0E1' },
  SLICE_SHORT:  { label: 'Slice Curto', color: '#26C6DA' },
  HALF_VOLLEY:  { label: 'Half Volley', color: '#66BB6A' },
  HEAVY_TOP:    { label: 'Heavy Top', color: '#EC407A' },
  ACCEL:        { label: 'Aceleração', color: '#FF7043' },
  SHORT_ACCEL:  { label: 'Aceleração Curta', color: '#FF8A65' },
};

// Lê recordes do recordsStore incremental — O(jogadores), não O(histórico)
function computeTennisRecords(state) {
  const { year: currentYear } = state;

  // — 1. Obter ou migrar o store —
  const store = state.recordsStore;
  const hasStore = store?._version === 1 && Object.keys(store.playerStats ?? {}).length > 0;

  // Fallback: se save antigo sem store, recalcula do histórico (one-time, fica lento)
  if (!hasStore) {
    return _computeTennisRecordsLegacy(state);
  }

  const GS_IDS = ['B1_GS_MERIDIAN','B2_GS_TERRA','B3_GS_HIGHLAND','B4_GS_URBAN','B5_GS_VELVET','B6_GS_CRYSTAL'];
  const fmtAvg = (value) => Number.isFinite(value) ? +value.toFixed(2) : 0;

  // Conta partidas por jogador/temporada a partir do histórico, para suportar médias anuais
  // inclusive em saves que ainda não persistiam matchesPlayed dentro de seasonData.
  const seasonMatchIndex = {};
  const bumpSeasonMatch = (playerId, yearValue) => {
    if (!playerId || yearValue == null) return;
    if (!seasonMatchIndex[playerId]) seasonMatchIndex[playerId] = {};
    seasonMatchIndex[playerId][yearValue] = (seasonMatchIndex[playerId][yearValue] ?? 0) + 1;
  };
  const countResultMatches = (res, yr) => {
    if (!res) return;
    if (res._slim) {
      for (const match of res.matches ?? []) {
        bumpSeasonMatch(match.w, yr);
        bumpSeasonMatch(match.l, yr);
      }
      return;
    }
    const bracket = res.bracket;
    if (!bracket?.rounds) return;
    for (const round of bracket.rounds) {
      for (const match of round ?? []) {
        if (!match?.winner || match.isBye) continue;
        const pA = match.playerA ?? match.player1;
        const pB = match.playerB ?? match.player2;
        bumpSeasonMatch(pA?.id, yr);
        bumpSeasonMatch(pB?.id, yr);
      }
    }
  };
  Object.values(state.historicalTournamentResults ?? {}).forEach((seasonMap) => {
    const seasonYear = Number(seasonMap?.year ?? seasonMap?.season ?? seasonMap?.__year);
    if (Number.isFinite(seasonYear)) {
      Object.values(seasonMap ?? {}).forEach((res) => countResultMatches(res, seasonYear));
    }
  });
  Object.values(state.tournamentResults ?? {}).forEach((res) => countResultMatches(res, currentYear));

  // — 2. Monta lista de "players" enriquecidos a partir do store —
  // Para cada entrada do store, busca o player vivo para ratings/foto atuais.
  // Se não encontrado (aposentado pré-slim), usa o snapshot salvo no store.
  const allLivePlayers = [
    ...(state.tourPlayers ?? []),
    ...(state.prospects ?? []),
    ...(state.retiredPlayers ?? []),
  ];
  const playerMap = Object.fromEntries(allLivePlayers.map(p => [p.id, p]));

  const players = Object.entries(store.playerStats).map(([storeId, s]) => {
    const playerId = s.id ?? storeId;
    const p = playerMap[playerId];

    // identity: prefere player vivo; fallback para snapshot no store
    const name        = p?.name        ?? s.name;
    const nationality = p?.nationality ?? s.nationality;
    const age         = p?.age         ?? s.age;
    const color       = p?.color       ?? s.color;
    const styleId     = p?.styleId     ?? s.styleId;
    const photo       = p?.photo       ?? s.photo;
    if (!name) return null; // entrada vazia, ignorar

    // player-like object para RPodium (precisa de .player)
    const playerObj = p ?? { id: playerId, name, nationality, age, color, styleId, photo };

    // Campos derivados
    const winRate     = s.matchesPlayed >= 100 ? +((s.wins / s.matchesPlayed)*100).toFixed(1) : 0;
    const finalsRate  = s.finals >= 3 ? +((s.titles / s.finals)*100).toFixed(1) : null;
    const totalSets   = s.setsWon + s.setsLost;
    const setsWinRate = totalSets >= 10 ? +((s.setsWon / totalSets)*100).toFixed(1) : null;
    const titleBreadth = Object.keys(
      Object.entries({
        GRAND_SLAM: s.gs, MASTERS_1000: s.masters, ATP_500: s.atp500,
        ATP_250: s.atp250, ATP_100: s.atp100, FINALS: s.finals_titles,
      }).filter(([,v]) => v > 0).reduce((o,[k,v])=>(o[k]=v,o),{})
    ).length;
    const dominantSurf = Object.entries(s.surfTitles ?? {}).sort((a,b)=>b[1]-a[1])[0]?.[0] ?? 'HARD';
    const careerGrandSlam = GS_IDS.every(id => (s.gsWonIds ?? []).includes(id));
    const longevidade = (s.titleYears ?? []).length;
    const yearsWithTitles = [...new Set(s.titleYears ?? [])].sort((a,b)=>a-b);
    const titleEra = yearsWithTitles.reduce((run, yr, index) => {
      const current = index && yr === yearsWithTitles[index-1] + 1 ? run.current + 1 : 1;
      return { current, best: Math.max(run.best, current) };
    }, { current:0, best:0 }).best;

    const surfWinRate = {
      HARD:   (s.surfWins?.HARD  + s.surfLosses?.HARD  ) >= 100 ? +((s.surfWins.HARD   / (s.surfWins.HARD   + s.surfLosses.HARD  )) * 100).toFixed(1) : null,
      CLAY:   (s.surfWins?.CLAY  + s.surfLosses?.CLAY  ) >= 100 ? +((s.surfWins.CLAY   / (s.surfWins.CLAY   + s.surfLosses.CLAY  )) * 100).toFixed(1) : null,
      GRASS:  (s.surfWins?.GRASS + s.surfLosses?.GRASS ) >= 100 ? +((s.surfWins.GRASS  / (s.surfWins.GRASS  + s.surfLosses.GRASS )) * 100).toFixed(1) : null,
      INDOOR: (s.surfWins?.INDOOR+ s.surfLosses?.INDOOR) >= 100 ? +((s.surfWins.INDOOR / (s.surfWins.INDOOR + s.surfLosses.INDOOR)) * 100).toFixed(1) : null,
      STREET: (s.surfWins?.STREET+ s.surfLosses?.STREET) >= 30 ? +((s.surfWins.STREET / (s.surfWins.STREET + s.surfLosses.STREET)) * 100).toFixed(1) : null,
      CARPET: (s.surfWins?.CARPET+ s.surfLosses?.CARPET) >= 30 ? +((s.surfWins.CARPET / (s.surfWins.CARPET + s.surfLosses.CARPET)) * 100).toFixed(1) : null,
    };

    // Best season
    let bestSeasonPts=0, bestSeasonPtsYr=null, bestSeasonTitles=0, bestSeasonTitlesYr=null, bestSeasonWins=0;
    let bestSeasonAces=0, bestSeasonAcesYr=null, bestSeasonWinners=0, bestSeasonWinnersYr=null;
    let bestSeasonAcesAvg=0, bestSeasonAcesAvgYr=null, bestSeasonAcesAvgMatches=0;
    let bestSeasonWinnersAvg=0, bestSeasonWinnersAvgYr=null, bestSeasonWinnersAvgMatches=0;
    Object.entries(s.seasonData ?? {}).forEach(([yr, d]) => {
      if (d.pts    > bestSeasonPts)    { bestSeasonPts=d.pts;       bestSeasonPtsYr=+yr;    }
      if (d.titles > bestSeasonTitles) { bestSeasonTitles=d.titles; bestSeasonTitlesYr=+yr; }
      if (d.wins   > bestSeasonWins)   bestSeasonWins = d.wins;
      if ((d.aces ?? 0) > bestSeasonAces) { bestSeasonAces = d.aces ?? 0; bestSeasonAcesYr = +yr; }
      if ((d.winners ?? 0) > bestSeasonWinners) { bestSeasonWinners = d.winners ?? 0; bestSeasonWinnersYr = +yr; }
      const seasonMatches = d.matchesPlayed ?? seasonMatchIndex[playerId]?.[+yr] ?? 0;
      if (seasonMatches > 0) {
        const acesAvg = fmtAvg((d.aces ?? 0) / seasonMatches);
        const winnersAvg = fmtAvg((d.winners ?? 0) / seasonMatches);
        if (acesAvg > bestSeasonAcesAvg) {
          bestSeasonAcesAvg = acesAvg;
          bestSeasonAcesAvgYr = +yr;
          bestSeasonAcesAvgMatches = seasonMatches;
        }
        if (winnersAvg > bestSeasonWinnersAvg) {
          bestSeasonWinnersAvg = winnersAvg;
          bestSeasonWinnersAvgYr = +yr;
          bestSeasonWinnersAvgMatches = seasonMatches;
        }
      }
    });

    const currentSeasonMatches = s.seasonData?.[currentYear]?.matchesPlayed ?? seasonMatchIndex[playerId]?.[currentYear] ?? 0;
    const careerAcesPerMatch = s.matchesPlayed > 0 ? fmtAvg((s.aces ?? 0) / s.matchesPlayed) : 0;
    const careerWinnersPerMatch = s.matchesPlayed > 0 ? fmtAvg((s.winners ?? 0) / s.matchesPlayed) : 0;
    const currentSeasonAcesPerMatch = currentSeasonMatches > 0 ? fmtAvg((s.seasonData?.[currentYear]?.aces ?? 0) / currentSeasonMatches) : 0;
    const currentSeasonWinnersPerMatch = currentSeasonMatches > 0 ? fmtAvg((s.seasonData?.[currentYear]?.winners ?? 0) / currentSeasonMatches) : 0;
    const pointWinsByType = SHOT_TYPE_ORDER.reduce((acc, shotType) => {
      acc[shotType] = s.pointWinsByType?.[shotType] ?? 0;
      return acc;
    }, {});

    return {
      // identity
      id: playerId, player: playerObj,
      name, nationality, age, color, styleId,
      overallRating: p?.attrs ? overallRating(p.attrs) : 0,
      // raw stats (passado direto do store)
      titles: s.titles, gs: s.gs, masters: s.masters, atp500: s.atp500,
      atp250: s.atp250, atp100: s.atp100,
      finals_titles: s.finals_titles, prospects_titles: s.prospects_titles,
      prospects_finals_titles: s.prospects_finals_titles,
      finals: s.finals, finalLosses: s.finalLosses ?? 0,
      semifinals: s.semifinals ?? 0,
      gsFinalsWon: s.gsFinalsWon, gsFinalsLost: s.gsFinalsLost,
      wins: s.wins, losses: s.losses, matchesPlayed: s.matchesPlayed,
      surfWins: s.surfWins ?? {HARD:0,CLAY:0,GRASS:0,STREET:0,CARPET:0,INDOOR:0},
      surfLosses: s.surfLosses ?? {HARD:0,CLAY:0,GRASS:0,STREET:0,CARPET:0,INDOOR:0},
      surfTitles: s.surfTitles ?? {HARD:0,CLAY:0,GRASS:0,STREET:0,CARPET:0,INDOOR:0},
      winStreak: s.winStreak, careerPts: s.careerPts,
      bagels: s.bagels ?? 0, doubleBagels: s.doubleBagels ?? 0,
      tiebreaksWon: s.tiebreaksWon ?? 0,
      setsWon: s.setsWon ?? 0, setsLost: s.setsLost ?? 0,
      aces: s.aces ?? 0, winners: s.winners ?? 0,
      pointWinsByType,
      doubleFaults: s.doubleFaults ?? 0, unforcedErrors: s.unforcedErrors ?? 0,
      youngestChampAge: s.youngestChampAge, oldestChampAge: s.oldestChampAge,
      // derived
      winRate, finalsRate, titleBreadth, dominantSurf,
      careerGrandSlam, longevidade, titleEra, surfWinRate, setsWinRate,
      bestSeasonPts, bestSeasonPtsYr, bestSeasonTitles, bestSeasonTitlesYr, bestSeasonWins,
      bestSeasonAces, bestSeasonAcesYr, bestSeasonWinners, bestSeasonWinnersYr,
      bestSeasonAcesAvg, bestSeasonAcesAvgYr, bestSeasonAcesAvgMatches,
      bestSeasonWinnersAvg, bestSeasonWinnersAvgYr, bestSeasonWinnersAvgMatches,
      careerAcesPerMatch, careerWinnersPerMatch,
      currentSeasonPts:    s.seasonData?.[currentYear]?.pts    ?? 0,
      currentSeasonTitles: s.seasonData?.[currentYear]?.titles ?? 0,
      currentSeasonAces:   s.seasonData?.[currentYear]?.aces   ?? 0,
      currentSeasonWinners:s.seasonData?.[currentYear]?.winners?? 0,
      currentSeasonMatches,
      currentSeasonAcesPerMatch,
      currentSeasonWinnersPerMatch,
      currentSeasonDoubleFaults: s.seasonData?.[currentYear]?.doubleFaults ?? 0,
      currentSeasonUnforcedErrors: s.seasonData?.[currentYear]?.unforcedErrors ?? 0,
      seasonData: s.seasonData ?? {},
    };
  }).filter(Boolean);

  // — 3. Helpers —”€—
  const top3 = (arr, sortFn, filterFn) =>
    (filterFn ? arr.filter(filterFn) : arr).sort(sortFn).slice(0,10);
  const byDesc = (fn) => (a,b) => fn(b) - fn(a);
  const shotPointLeaders = SHOT_TYPE_ORDER.reduce((acc, shotType) => {
    acc[shotType] = top3(
      players
        .map(s => ({
          ...s,
          shotType,
          shotPoints: s.pointWinsByType?.[shotType] ?? 0,
        })),
      byDesc(s => s.shotPoints),
      s => s.shotPoints > 0
    );
    return acc;
  }, {});

  const allSeasonPts    = [];
  const allSeasonTitles = [];
  const allSeasonAces   = [];
  const allSeasonWinners = [];
  const allSeasonAcesAvg = [];
  const allSeasonWinnersAvg = [];
  const matchRecords = (store.matchRecords ?? []).map(m => ({
    ...m,
    winner: playerMap[m.winnerId] ?? { id:m.winnerId, name:`#${m.winnerId}` },
    loser: playerMap[m.loserId] ?? { id:m.loserId, name:`#${m.loserId}` },
  }));
  players.forEach(s => {
    Object.entries(s.seasonData).forEach(([yr, d]) => {
      if (d.pts    > 0) allSeasonPts.push({    ...s, bestSeasonPts:    d.pts,    bestSeasonPtsYr:    +yr });
      if (d.titles > 0) allSeasonTitles.push({ ...s, bestSeasonTitles: d.titles, bestSeasonTitlesYr: +yr });
      if ((d.aces ?? 0) > 0) allSeasonAces.push({ ...s, bestSeasonAces: d.aces ?? 0, bestSeasonAcesYr: +yr });
      if ((d.winners ?? 0) > 0) allSeasonWinners.push({ ...s, bestSeasonWinners: d.winners ?? 0, bestSeasonWinnersYr: +yr });
      const seasonMatches = d.matchesPlayed ?? seasonMatchIndex[s.id]?.[+yr] ?? 0;
      if (seasonMatches > 0 && (d.aces ?? 0) > 0) {
        allSeasonAcesAvg.push({ ...s, bestSeasonAcesAvg: fmtAvg((d.aces ?? 0) / seasonMatches), bestSeasonAcesAvgYr: +yr, bestSeasonAcesAvgMatches: seasonMatches });
      }
      if (seasonMatches > 0 && (d.winners ?? 0) > 0) {
        allSeasonWinnersAvg.push({ ...s, bestSeasonWinnersAvg: fmtAvg((d.winners ?? 0) / seasonMatches), bestSeasonWinnersAvgYr: +yr, bestSeasonWinnersAvgMatches: seasonMatches });
      }
    });
  });

  // — 4. Monta e retorna o objeto de recordes —
  return {
    players, currentYear,
    career: {
      mostTitles:        top3(players, byDesc(s=>s.titles),          s=>s.titles>0),
      mostGS:            top3(players, byDesc(s=>s.gs),              s=>s.gs>0),
      mostMasters:       top3(players, byDesc(s=>s.masters),         s=>s.masters>0),
      mostATP500:        top3(players, byDesc(s=>s.atp500),          s=>s.atp500>0),
      mostATP250:        top3(players, byDesc(s=>s.atp250),          s=>s.atp250>0),
      mostFinalsTitles:  top3(players, byDesc(s=>s.finals_titles),   s=>s.finals_titles>0),
      mostChallengers:   top3(players, byDesc(s=>s.atp100),          s=>s.atp100>0),
      mostTitleBreadth:  top3(players, byDesc(s=>s.titleBreadth),    s=>s.titleBreadth>1),
      mostFinals:        top3(players, byDesc(s=>s.finals),          s=>s.finals>0),
      mostSemis:         top3(players, byDesc(s=>s.semifinals),      s=>s.semifinals>0),
      mostGSFinals:      top3(players, byDesc(s=>s.gsFinalsWon+s.gsFinalsLost), s=>s.gsFinalsWon+s.gsFinalsLost>0),
      bestGSRecord:      top3(players, byDesc(s=>s.gsFinalsWon),     s=>s.gsFinalsWon>0),
      mostCareerPts:     top3(players, byDesc(s=>s.careerPts),       s=>s.careerPts>0),
      mostWins:          top3(players, byDesc(s=>s.wins),            s=>s.wins>0),
      bestWinRate:       top3(players, byDesc(s=>s.winRate),         s=>s.matchesPlayed>=100),
      bestFinalsRate:    top3(players, byDesc(s=>s.finalsRate??0),   s=>s.finalsRate!==null),
      mostMatches:       top3(players, byDesc(s=>s.matchesPlayed),   s=>s.matchesPlayed>0),
      longestWinStreak:  top3(players, byDesc(s=>s.winStreak),       s=>s.winStreak>0),
      hardTitles:        top3(players, byDesc(s=>s.surfTitles.HARD??0),   s=>(s.surfTitles.HARD??0)>0),
      clayTitles:        top3(players, byDesc(s=>s.surfTitles.CLAY??0),   s=>(s.surfTitles.CLAY??0)>0),
      grassTitles:       top3(players, byDesc(s=>s.surfTitles.GRASS??0),  s=>(s.surfTitles.GRASS??0)>0),
      indoorTitles:      top3(players, byDesc(s=>s.surfTitles.INDOOR??0), s=>(s.surfTitles.INDOOR??0)>0),
      hardWins:          top3(players, byDesc(s=>s.surfWins.HARD??0),     s=>(s.surfWins.HARD??0)>0),
      clayWins:          top3(players, byDesc(s=>s.surfWins.CLAY??0),     s=>(s.surfWins.CLAY??0)>0),
      grassWins:         top3(players, byDesc(s=>s.surfWins.GRASS??0),    s=>(s.surfWins.GRASS??0)>0),
      indoorWins:        top3(players, byDesc(s=>s.surfWins.INDOOR??0),   s=>(s.surfWins.INDOOR??0)>0),
      hardWinRate:       top3(players, byDesc(s=>s.surfWinRate.HARD??0),   s=>s.surfWinRate.HARD!==null),
      clayWinRate:       top3(players, byDesc(s=>s.surfWinRate.CLAY??0),   s=>s.surfWinRate.CLAY!==null),
      grassWinRate:      top3(players, byDesc(s=>s.surfWinRate.GRASS??0),  s=>s.surfWinRate.GRASS!==null),
      indoorWinRate:     top3(players, byDesc(s=>s.surfWinRate.INDOOR??0), s=>s.surfWinRate.INDOOR!==null),
      streetTitles:      top3(players, byDesc(s=>s.surfTitles.STREET??0), s=>(s.surfTitles.STREET??0)>0),
      streetWins:        top3(players, byDesc(s=>s.surfWins.STREET??0), s=>(s.surfWins.STREET??0)>0),
      streetWinRate:     top3(players, byDesc(s=>s.surfWinRate.STREET??0), s=>s.surfWinRate.STREET!==null),
      carpetTitles:      top3(players, byDesc(s=>s.surfTitles.CARPET??0), s=>(s.surfTitles.CARPET??0)>0),
      carpetWins:        top3(players, byDesc(s=>s.surfWins.CARPET??0), s=>(s.surfWins.CARPET??0)>0),
      carpetWinRate:     top3(players, byDesc(s=>s.surfWinRate.CARPET??0), s=>s.surfWinRate.CARPET!==null),
      prospectsTitles:   top3(players, byDesc(s=>s.prospects_titles),       s=>s.prospects_titles>0),
      prospectsFinals:   top3(players, byDesc(s=>s.prospects_finals_titles), s=>s.prospects_finals_titles>0),
      mostFinalLosses:   top3(players, byDesc(s=>s.finalLosses),      s=>s.finalLosses>0),
      mostLongevidade:   top3(players, byDesc(s=>s.longevidade),       s=>s.longevidade>1),
      longestTitleEra:   top3(players, byDesc(s=>s.titleEra),          s=>s.titleEra>1),
      youngestChamp:     top3(players, (a,b)=>(a.youngestChampAge??99)-(b.youngestChampAge??99), s=>s.youngestChampAge!==null),
      oldestChamp:       top3(players, (a,b)=>(b.oldestChampAge??0)-(a.oldestChampAge??0),       s=>s.oldestChampAge!==null),
      careerGrandSlam:   players.filter(s=>s.careerGrandSlam).sort(byDesc(s=>s.gs)),
      mostBagels:        top3(players, byDesc(s=>s.bagels),            s=>s.bagels>0),
      mostDoubleBagels:  top3(players, byDesc(s=>s.doubleBagels),      s=>s.doubleBagels>0),
      mostTiebreaks:     top3(players, byDesc(s=>s.tiebreaksWon),      s=>s.tiebreaksWon>0),
      bestSetsWinRate:   top3(players, byDesc(s=>s.setsWinRate??0),    s=>s.setsWinRate!==null),
      mostAces:          top3(players, byDesc(s=>s.aces),              s=>s.aces>0),
      mostWinners:       top3(players, byDesc(s=>s.winners),           s=>s.winners>0),
      bestAcesPerMatch:  top3(players, byDesc(s=>s.careerAcesPerMatch), s=>s.matchesPlayed>=12 && s.careerAcesPerMatch>0),
      bestWinnersPerMatch: top3(players, byDesc(s=>s.careerWinnersPerMatch), s=>s.matchesPlayed>=12 && s.careerWinnersPerMatch>0),
      shotPointLeaders,
      mostDoubleFaults:  top3(players, byDesc(s=>s.doubleFaults),      s=>s.doubleFaults>0),
      mostUnforcedErrors:top3(players, byDesc(s=>s.unforcedErrors),    s=>s.unforcedErrors>0),
    },
    legendary: {
      matches: matchRecords,
      longest: [...matchRecords].sort((a,b) => b.totalGames-a.totalGames).slice(0, 8),
      rallies: [...matchRecords].filter(m=>m.maxRally>0).sort((a,b)=>b.maxRally-a.maxRally).slice(0,8),
      pressure: [...matchRecords].filter(m=>m.tiebreaks>0 || m.heat>0).sort((a,b)=>(b.tiebreaks*20+b.heat)-(a.tiebreaks*20+a.heat)).slice(0,8),
      serving: [...matchRecords].filter(m=>m.aces>0).sort((a,b)=>b.aces-a.aces).slice(0,8),
    },
    season: {
      bestSeasonPts:    allSeasonPts.sort((a,b)=>b.bestSeasonPts-a.bestSeasonPts).slice(0,10),
      bestSeasonTitles: allSeasonTitles.sort((a,b)=>b.bestSeasonTitles-a.bestSeasonTitles).slice(0,10),
      bestSeasonWins:   top3(players, byDesc(s=>s.bestSeasonWins),       s=>s.bestSeasonWins>0),
      bestSeasonAces:   allSeasonAces.sort((a,b)=>b.bestSeasonAces-a.bestSeasonAces).slice(0,10),
      bestSeasonWinners:allSeasonWinners.sort((a,b)=>b.bestSeasonWinners-a.bestSeasonWinners).slice(0,10),
      bestSeasonAcesAvg: allSeasonAcesAvg.sort((a,b)=>b.bestSeasonAcesAvg-a.bestSeasonAcesAvg).slice(0,10),
      bestSeasonWinnersAvg: allSeasonWinnersAvg.sort((a,b)=>b.bestSeasonWinnersAvg-a.bestSeasonWinnersAvg).slice(0,10),
      currentPts:       top3(players, byDesc(s=>s.currentSeasonPts),     s=>s.currentSeasonPts>0),
      currentTitles:    top3(players, byDesc(s=>s.currentSeasonTitles),  s=>s.currentSeasonTitles>0),
      currentAces:      top3(players, byDesc(s=>s.currentSeasonAces),    s=>s.currentSeasonAces>0),
      currentWinners:   top3(players, byDesc(s=>s.currentSeasonWinners), s=>s.currentSeasonWinners>0),
      currentAcesAvg:   top3(players, byDesc(s=>s.currentSeasonAcesPerMatch), s=>s.currentSeasonMatches>=3 && s.currentSeasonAcesPerMatch>0),
      currentWinnersAvg: top3(players, byDesc(s=>s.currentSeasonWinnersPerMatch), s=>s.currentSeasonMatches>=3 && s.currentSeasonWinnersPerMatch>0),
      currentDoubleFaults: top3(players, byDesc(s=>s.currentSeasonDoubleFaults), s=>s.currentSeasonDoubleFaults>0),
      currentUnforcedErrors: top3(players, byDesc(s=>s.currentSeasonUnforcedErrors), s=>s.currentSeasonUnforcedErrors>0),
    },
  };
}


// Legacy: recalcula do histórico completo (usado apenas para migração de saves antigos)
function _computeTennisRecordsLegacy(state) {
  const { tournamentResults, historicalTournamentResults, tourPlayers, prospects, rankingStore, year: currentYear } = state;
  // Combina histórico de temporadas passadas com resultados da temporada atual
  const allResults = {
    ...(historicalTournamentResults ?? {}),
    ...(tournamentResults ?? {}),
  };
  const allPlayers = [...tourPlayers, ...prospects, ...(state.retiredPlayers ?? [])];
  const playerMap = Object.fromEntries(allPlayers.map(p => [p.id, p]));

  // Por jogador: acumular tudo em uma única passada pelos resultados
  const stats = {}; // playerId → statsObj
  const getS = (id) => {
    if (!stats[id]) stats[id] = {
      id,
      titles:0, gs:0, masters:0, atp500:0, atp250:0, atp100:0,
      finals_titles:0, prospects_titles:0, prospects_finals_titles:0,
      titlesByCategory:{}, titlesBySurface:{},
      finals:0, semifinals:0, qf:0, r16:0,
      careerPts:0, wins:0, losses:0,
      surfWins:{HARD:0,CLAY:0,GRASS:0,STREET:0,CARPET:0,INDOOR:0}, surfLosses:{HARD:0,CLAY:0,GRASS:0,STREET:0,CARPET:0,INDOOR:0},
      surfTitles:{HARD:0,CLAY:0,GRASS:0,STREET:0,CARPET:0,INDOOR:0},
      winStreak:0, curStreak:0,
      matchesPlayed:0,
      seasonData:{}, // year → { pts, titles, wins }
      gsFinalsWon:0, gsFinalsLost:0,
      youngestChampAge:null, youngestChampName:null,
      oldestChampAge:null, oldestChampName:null,
      // idade por categoria — para o recorde "campeão mais jovem por categoria"
      youngestChampAgeByCategory: { GRAND_SLAM:null, MASTERS_1000:null, ATP_500:null, ATP_250:null, ATP_100:null, FINALS:null },
      oldestChampAgeByCategory:  { GRAND_SLAM:null, MASTERS_1000:null, ATP_500:null, ATP_250:null, ATP_100:null, FINALS:null },
      // novos campos
      finalLosses:0,         // derrotas em finais (todas as categorias)
      gsWonIds: new Set(),   // IDs dos GS vencidos (career grand slam)
      titleYears: new Set(), // anos em que teve pelo menos 1 título
      bagels:0, doubleBagels:0, tiebreaksWon:0,
      setsWon:0, setsLost:0,
    };
    return stats[id];
  };

  // Rastrear streak global por jogador (resultados ordenados por weekIndex)
  const orderedResults = Object.values(allResults)
    .filter(r => r.tournament && (r._slim || r.bracket))
    .sort((a, b) => {
      const seasonDiff = (a._season ?? a.tournament.season??0) - (b._season ?? b.tournament.season??0);
      return seasonDiff !== 0 ? seasonDiff : (a.tournament.weekIndex??0) - (b.tournament.weekIndex??0);
    });

  // Per result: extrair info de cada partida
  orderedResults.forEach(res => {
    const { tournament } = res;
    if (!tournament) return;
    const { category, surface, season } = tournament;
    const yr   = res._season ?? season ?? currentYear;
    const surf = surface ?? 'HARD';

    if (res._slim) {
      // — SLIM FORMAT —
      // Champion
      if (res.champion) {
        const champ = res.champion;
        const s = getS(champ.id);
        s.titles++;
        if (category === 'GRAND_SLAM')       s.gs++;
        if (category === 'MASTERS_1000')     s.masters++;
        if (category === 'ATP_500')          s.atp500++;
        if (category === 'ATP_250')          s.atp250++;
        if (category === 'FINALS')           s.finals_titles++;
        if (category === 'ATP_PROSPECTS' || category === 'JUNIOR_50' || category === 'JUNIOR_100' || category === 'JUNIOR_SLAM')    s.prospects_titles++;
        if (category === 'PROSPECTS_FINALS') s.prospects_finals_titles++;
        s.titlesByCategory[category] = (s.titlesByCategory[category]||0) + 1;
        s.surfTitles[surf] = (s.surfTitles[surf]||0) + 1;
        if (!s.seasonData[yr]) s.seasonData[yr] = { pts:0, titles:0, wins:0 };
        s.seasonData[yr].titles++;
        s.finals++;
        if (category === 'GRAND_SLAM') { s.gsFinalsWon++; s.gsWonIds.add(tournament.id); }
        s.titleYears.add(yr);
        const player = playerMap[champ.id];
        if (player) {
          const age = player.age ?? 25;
          if (s.youngestChampAge === null || age < s.youngestChampAge) s.youngestChampAge = age;
          if (s.oldestChampAge === null || age > s.oldestChampAge) s.oldestChampAge = age;
          // por categoria
          const CAT_AGE_KEYS = ['GRAND_SLAM','MASTERS_1000','ATP_500','ATP_250','ATP_100','FINALS'];
          if (CAT_AGE_KEYS.includes(category)) {
            if (s.youngestChampAgeByCategory[category] === null || age < s.youngestChampAgeByCategory[category]) s.youngestChampAgeByCategory[category] = age;
            if (s.oldestChampAgeByCategory[category]  === null || age > s.oldestChampAgeByCategory[category])  s.oldestChampAgeByCategory[category]  = age;
          }
        }
      }
      // Finalist
      if (res.finalist) {
        const rs = getS(res.finalist.id);
        rs.finals++;
        rs.finalLosses++;
        if (category === 'GRAND_SLAM') rs.gsFinalsLost++;
      }
      // Semis
      (res.semis ?? []).forEach(sf => { getS(sf.id).semifinals++; });
      // All matches for W/L
      (res.matches ?? []).forEach(({ w, l, sd, wa=true }) => {
        const ws = getS(w);
        ws.wins++;
        ws.matchesPlayed++;
        ws.surfWins[surf] = (ws.surfWins[surf]||0) + 1;
        ws.curStreak++;
        if (ws.curStreak > ws.winStreak) ws.winStreak = ws.curStreak;
        if (!ws.seasonData[yr]) ws.seasonData[yr] = { pts:0, titles:0, wins:0 };
        ws.seasonData[yr].wins++;
        // sets stats
        if (sd?.length) {
          // wa=true  — a=winner's games, b=loser's games; wa=false  — reversed
          const wBagelsInMatch = sd.filter(([a,b]) => wa ? b===0 : a===0).length;
          const lBagelsInMatch = sd.filter(([a,b]) => wa ? a===0 : b===0).length;
          ws.bagels += wBagelsInMatch;
          if (wBagelsInMatch >= 2) ws.doubleBagels++;
          sd.forEach(([a,b]) => {
            ws.setsWon++;
            if (l) getS(l).setsLost++;
            if (isTiebreakSetScore(a, b)) ws.tiebreaksWon++;
          });
          if (l) {
            const ls = getS(l);
            // loser vence um set quando tem mais games que o winner naquele set
            sd.forEach(([a,b]) => {
              const lG = wa ? b : a;
              const wG = wa ? a : b;
              if (lG > wG) ls.setsWon++;
            });
            ls.bagels += lBagelsInMatch;
          }
        }
        if (l) {
          const ls = getS(l);
          ls.losses++;
          ls.matchesPlayed++;
          ls.surfLosses[surf] = (ls.surfLosses[surf]||0) + 1;
          ls.curStreak = 0;
          if (!ls.seasonData[yr]) ls.seasonData[yr] = { pts:0, titles:0, wins:0 };
        }
      });
      // Pre-computed points
      for (const [pid, pts] of Object.entries(res.pts ?? {})) {
        const s = getS(pid);
        s.careerPts += pts;
        if (!s.seasonData[yr]) s.seasonData[yr] = { pts:0, titles:0, wins:0 };
        s.seasonData[yr].pts += pts;
      }

    } else {
      // — FULL BRACKET FORMAT (temporada atual / saves antigos) —
      const { bracket } = res;
      if (!bracket) return;

      if (bracket.champion) {
        const champ = bracket.champion;
        const s = getS(champ.id);
        s.titles++;
        if (category === 'GRAND_SLAM')      { s.gs++; }
        if (category === 'MASTERS_1000')    { s.masters++; }
        if (category === 'ATP_500')         { s.atp500++; }
        if (category === 'ATP_250')         { s.atp250++; }
        if (category === 'ATP_100')         { s.atp100++; }
        if (category === 'FINALS')          { s.finals_titles++; }
        if (category === 'ATP_PROSPECTS' || category === 'JUNIOR_50' || category === 'JUNIOR_100' || category === 'JUNIOR_SLAM')   { s.prospects_titles++; }
        if (category === 'PROSPECTS_FINALS'){ s.prospects_finals_titles++; }
        s.titlesByCategory[category] = (s.titlesByCategory[category]||0) + 1;
        s.surfTitles[surf] = (s.surfTitles[surf]||0) + 1;
        if (!s.seasonData[yr]) s.seasonData[yr] = { pts:0, titles:0, wins:0 };
        s.seasonData[yr].titles++;
        if (category === 'GRAND_SLAM') { s.gsWonIds.add(tournament.id); }
        s.titleYears.add(yr);
        const player = playerMap[champ.id];
        if (player) {
          const age = player.age ?? 25;
          if (s.youngestChampAge === null || age < s.youngestChampAge) { s.youngestChampAge = age; }
          if (s.oldestChampAge === null || age > s.oldestChampAge) { s.oldestChampAge = age; }
          // por categoria
          const CAT_AGE_KEYS_F = ['GRAND_SLAM','MASTERS_1000','ATP_500','ATP_250','ATP_100','FINALS'];
          if (CAT_AGE_KEYS_F.includes(category)) {
            if (s.youngestChampAgeByCategory[category] === null || age < s.youngestChampAgeByCategory[category]) s.youngestChampAgeByCategory[category] = age;
            if (s.oldestChampAgeByCategory[category]  === null || age > s.oldestChampAgeByCategory[category])  s.oldestChampAgeByCategory[category]  = age;
          }
        }
      }

      if (bracket.rounds) {
        bracket.rounds.forEach(round => {
          round.forEach(match => {
            if (!match.winner || match.isBye) return;
            const winner = match.winner;
            const loser = match.player1?.id === winner.id ? match.player2 : match.player1;
            const ws = getS(winner.id);
            ws.wins++;
            ws.matchesPlayed++;
            ws.surfWins[surf] = (ws.surfWins[surf]||0) + 1;
            ws.curStreak++;
            if (ws.curStreak > ws.winStreak) ws.winStreak = ws.curStreak;
            if (!ws.seasonData[yr]) ws.seasonData[yr] = { pts:0, titles:0, wins:0 };
            ws.seasonData[yr].wins++;
            // sets & bagels from full bracket
            const sd = match.result?.setsDetail ?? match.setsDetail ?? null;
            if (sd?.length) {
              const winnerIsA = (match.playerA ?? match.player1)?.id === winner.id;
              const wBagelsInMatch = sd.filter(([a,b]) => winnerIsA ? b===0 : a===0).length;
              const lBagelsInMatch = sd.filter(([a,b]) => winnerIsA ? a===0 : b===0).length;
              ws.bagels += wBagelsInMatch;
              if (wBagelsInMatch >= 2) ws.doubleBagels++;
              sd.forEach(([a,b]) => {
                ws.setsWon++;
                if (isTiebreakSetScore(a, b)) ws.tiebreaksWon++;
                if (loser?.id) getS(loser.id).setsLost++;
              });
              if (loser?.id) {
                const ls2 = getS(loser.id);
                sd.forEach(([a,b]) => {
                  const lG = winnerIsA ? b : a;
                  const wG = winnerIsA ? a : b;
                  if (lG > wG) ls2.setsWon++;
                });
                ls2.bagels += lBagelsInMatch;
              }
            }
            if (loser && loser.id) {
              const ls = getS(loser.id);
              ls.losses++;
              ls.matchesPlayed++;
              ls.surfLosses[surf] = (ls.surfLosses[surf]||0) + 1;
              ls.curStreak = 0;
              if (!ls.seasonData[yr]) ls.seasonData[yr] = { pts:0, titles:0, wins:0 };
            }
          });
        });

        const finalRound = bracket.rounds[bracket.rounds.length - 1];
        if (finalRound && bracket.champion) {
          const finalMatch = finalRound[0];
          if (finalMatch && !finalMatch.isBye) {
            const runnerId = finalMatch.player1?.id === bracket.champion.id
              ? finalMatch.player2?.id
              : finalMatch.player1?.id;
            if (runnerId) {
              const rs = getS(runnerId);
              rs.finals++;
              rs.finalLosses++;
              if (category === 'GRAND_SLAM') rs.gsFinalsLost++;
            }
            getS(bracket.champion.id).finals++;
            if (category === 'GRAND_SLAM') { getS(bracket.champion.id).gsFinalsWon++; getS(bracket.champion.id).gsWonIds.add(tournament.id); }
          }
        }
        if (bracket.rounds.length >= 2) {
          const sfRound = bracket.rounds[bracket.rounds.length - 2];
          sfRound?.forEach(m => {
            if (!m.isBye && m.player1) getS(m.player1.id).semifinals++;
            if (!m.isBye && m.player2) getS(m.player2.id).semifinals++;
          });
        }
      }

      try {
        const pointMap = computeTournamentPoints(tournament, bracket, TOURNAMENT_POINTS);
        for (const [pid, { points }] of pointMap) {
          const s = getS(pid);
          s.careerPts += points;
          if (!s.seasonData[yr]) s.seasonData[yr] = { pts:0, titles:0, wins:0 };
          s.seasonData[yr].pts += points;
        }
      } catch(e) {}
    }
  });

  // Convert to array and join player data
  const players = Object.values(stats).map(s => {
    const p = playerMap[s.id];
    if (!p) return null;
    const winRate = s.matchesPlayed >= 100 ? +((s.wins / s.matchesPlayed)*100).toFixed(1) : 0;
    const finalsRate = s.finals >= 3 ? +((s.titles / s.finals)*100).toFixed(1) : null;
    // Best season
    let bestSeasonPts=0, bestSeasonPtsYr=null, bestSeasonTitles=0, bestSeasonTitlesYr=null, bestSeasonWins=0;
    Object.entries(s.seasonData).forEach(([yr, d]) => {
      if (d.pts > bestSeasonPts) { bestSeasonPts=d.pts; bestSeasonPtsYr=+yr; }
      if (d.titles > bestSeasonTitles) { bestSeasonTitles=d.titles; bestSeasonTitlesYr=+yr; }
      if (d.wins > bestSeasonWins) bestSeasonWins=d.wins;
    });
    const titleBreadth = Object.keys(s.titlesByCategory).length;
    const dominantSurf = Object.entries(s.surfTitles).sort((a,b)=>b[1]-a[1])[0]?.[0] ?? 'HARD';
    // Novos campos derivados
    const longevidade = s.titleYears.size; // anos com pelo menos 1 título
    const gsIds = s.gsWonIds;
    const GS_IDS = ['B1_GS_MERIDIAN','B2_GS_TERRA','B3_GS_HIGHLAND','B4_GS_URBAN','B5_GS_VELVET','B6_GS_CRYSTAL'];
    const careerGrandSlam = GS_IDS.every(id => gsIds.has(id));
    const surfWinRate = {
      HARD:   s.surfWins.HARD + s.surfLosses.HARD >= 100 ? +((s.surfWins.HARD   / (s.surfWins.HARD + s.surfLosses.HARD)) * 100).toFixed(1) : null,
      CLAY:   s.surfWins.CLAY + s.surfLosses.CLAY >= 100 ? +((s.surfWins.CLAY   / (s.surfWins.CLAY + s.surfLosses.CLAY)) * 100).toFixed(1) : null,
      GRASS:  s.surfWins.GRASS + s.surfLosses.GRASS >= 100 ? +((s.surfWins.GRASS / (s.surfWins.GRASS + s.surfLosses.GRASS)) * 100).toFixed(1) : null,
      INDOOR: s.surfWins.INDOOR + s.surfLosses.INDOOR >= 100 ? +((s.surfWins.INDOOR / (s.surfWins.INDOOR + s.surfLosses.INDOOR)) * 100).toFixed(1) : null,
    };
    const totalSets = s.setsWon + s.setsLost;
    const setsWinRate = totalSets >= 10 ? +((s.setsWon / totalSets)*100).toFixed(1) : null;
    return {
      ...s, player:p,
      name: p.name, nationality: p.nationality, age: p.age,
      styleId: p.styleId, signatureShot: p.signatureShot, color: p.color,
      overallRating: overallRating(p.attrs),
      winRate, finalsRate, titleBreadth, dominantSurf,
      bestSeasonPts, bestSeasonPtsYr, bestSeasonTitles, bestSeasonTitlesYr, bestSeasonWins,
      currentSeasonPts: s.seasonData[currentYear]?.pts ?? 0,
      currentSeasonTitles: s.seasonData[currentYear]?.titles ?? 0,
      longevidade, careerGrandSlam, surfWinRate, setsWinRate,
      finalLosses: s.finalLosses,
      bagels: s.bagels, doubleBagels: s.doubleBagels, tiebreaksWon: s.tiebreaksWon,
      setsWon: s.setsWon, setsLost: s.setsLost,
    };
  }).filter(Boolean);

  // Helper: sort and top3
  const top3 = (arr, sortFn, filterFn) => (filterFn ? arr.filter(filterFn) : arr).sort(sortFn).slice(0,10);
  const byDesc = (fn) => (a,b) => fn(b) - fn(a);

  // All season — player combinations (flat)
  const allSeasonPts = [];
  const allSeasonTitles = [];
  players.forEach(s => {
    Object.entries(s.seasonData).forEach(([yr, d]) => {
      if (d.pts > 0) allSeasonPts.push({ ...s, bestSeasonPts:d.pts, bestSeasonPtsYr:+yr });
      if (d.titles > 0) allSeasonTitles.push({ ...s, bestSeasonTitles:d.titles, bestSeasonTitlesYr:+yr });
    });
  });

  return {
    players, currentYear,
    career: {
      mostTitles:         top3(players, byDesc(s=>s.titles),   s=>s.titles>0),
      mostGS:             top3(players, byDesc(s=>s.gs),       s=>s.gs>0),
      mostMasters:        top3(players, byDesc(s=>s.masters),  s=>s.masters>0),
      mostATP500:         top3(players, byDesc(s=>s.atp500),   s=>s.atp500>0),
      mostATP250:         top3(players, byDesc(s=>s.atp250),   s=>s.atp250>0),
      mostFinalsTitles:   top3(players, byDesc(s=>s.finals_titles), s=>s.finals_titles>0),
      mostChallengers:    top3(players, byDesc(s=>s.atp100),   s=>s.atp100>0),
      mostTitleBreadth:   top3(players, byDesc(s=>s.titleBreadth), s=>s.titleBreadth>1),
      mostFinals:         top3(players, byDesc(s=>s.finals),   s=>s.finals>0),
      mostSemis:          top3(players, byDesc(s=>s.semifinals),s=>s.semifinals>0),
      mostGSFinals:       top3(players, byDesc(s=>s.gsFinalsWon+s.gsFinalsLost), s=>s.gsFinalsWon+s.gsFinalsLost>0),
      bestGSRecord:       top3(players, byDesc(s=>s.gsFinalsWon), s=>s.gsFinalsWon>0),
      mostCareerPts:      top3(players, byDesc(s=>s.careerPts), s=>s.careerPts>0),
      mostWins:           top3(players, byDesc(s=>s.wins),     s=>s.wins>0),
      bestWinRate:        top3(players, byDesc(s=>s.winRate),  s=>s.matchesPlayed>=100),
      bestFinalsRate:     top3(players, byDesc(s=>s.finalsRate??0), s=>s.finalsRate!==null),
      mostMatches:        top3(players, byDesc(s=>s.matchesPlayed), s=>s.matchesPlayed>0),
      longestWinStreak:   top3(players, byDesc(s=>s.winStreak), s=>s.winStreak>0),
      hardTitles:         top3(players, byDesc(s=>s.surfTitles.HARD??0), s=>(s.surfTitles.HARD??0)>0),
      clayTitles:         top3(players, byDesc(s=>s.surfTitles.CLAY??0), s=>(s.surfTitles.CLAY??0)>0),
      grassTitles:        top3(players, byDesc(s=>s.surfTitles.GRASS??0),(s=>(s.surfTitles.GRASS??0)>0)),
      indoorTitles:       top3(players, byDesc(s=>s.surfTitles.INDOOR??0),s=>(s.surfTitles.INDOOR??0)>0),
      hardWins:           top3(players, byDesc(s=>s.surfWins.HARD??0),   s=>(s.surfWins.HARD??0)>0),
      clayWins:           top3(players, byDesc(s=>s.surfWins.CLAY??0),   s=>(s.surfWins.CLAY??0)>0),
      grassWins:          top3(players, byDesc(s=>s.surfWins.GRASS??0),  s=>(s.surfWins.GRASS??0)>0),
      indoorWins:         top3(players, byDesc(s=>s.surfWins.INDOOR??0), s=>(s.surfWins.INDOOR??0)>0),
      hardWinRate:        top3(players, byDesc(s=>s.surfWinRate.HARD??0),   s=>s.surfWinRate.HARD!==null),
      clayWinRate:        top3(players, byDesc(s=>s.surfWinRate.CLAY??0),   s=>s.surfWinRate.CLAY!==null),
      grassWinRate:       top3(players, byDesc(s=>s.surfWinRate.GRASS??0),  s=>s.surfWinRate.GRASS!==null),
      indoorWinRate:      top3(players, byDesc(s=>s.surfWinRate.INDOOR??0), s=>s.surfWinRate.INDOOR!==null),
      prospectsTitles:    top3(players, byDesc(s=>s.prospects_titles), s=>s.prospects_titles>0),
      prospectsFinals:    top3(players, byDesc(s=>s.prospects_finals_titles), s=>s.prospects_finals_titles>0),
      // novos
      mostFinalLosses:    top3(players, byDesc(s=>s.finalLosses), s=>s.finalLosses>0),
      mostLongevidade:    top3(players, byDesc(s=>s.longevidade), s=>s.longevidade>1),
      youngestChamp:      top3(players, (a,b)=>(a.youngestChampAge??99)-(b.youngestChampAge??99), s=>s.youngestChampAge!==null),
      oldestChamp:        top3(players, (a,b)=>(b.oldestChampAge??0)-(a.oldestChampAge??0), s=>s.oldestChampAge!==null),
      // por categoria — campeão mais jovem/velho
      youngestChampByCategory: Object.fromEntries(
        ['GRAND_SLAM','MASTERS_1000','ATP_500','ATP_250','ATP_100','FINALS'].map(cat => [
          cat,
          top3(players,
            (a,b) => (a.youngestChampAgeByCategory?.[cat]??99) - (b.youngestChampAgeByCategory?.[cat]??99),
            s => s.youngestChampAgeByCategory?.[cat] !== null && s.youngestChampAgeByCategory?.[cat] !== undefined
          )
        ])
      ),
      oldestChampByCategory: Object.fromEntries(
        ['GRAND_SLAM','MASTERS_1000','ATP_500','ATP_250','ATP_100','FINALS'].map(cat => [
          cat,
          top3(players,
            (a,b) => (b.oldestChampAgeByCategory?.[cat]??0) - (a.oldestChampAgeByCategory?.[cat]??0),
            s => s.oldestChampAgeByCategory?.[cat] !== null && s.oldestChampAgeByCategory?.[cat] !== undefined
          )
        ])
      ),
      careerGrandSlam:    players.filter(s=>s.careerGrandSlam).sort(byDesc(s=>s.gs)),
      mostBagels:         top3(players, byDesc(s=>s.bagels), s=>s.bagels>0),
      mostDoubleBagels:   top3(players, byDesc(s=>s.doubleBagels), s=>s.doubleBagels>0),
      mostTiebreaks:      top3(players, byDesc(s=>s.tiebreaksWon), s=>s.tiebreaksWon>0),
      bestSetsWinRate:    top3(players, byDesc(s=>s.setsWinRate??0), s=>s.setsWinRate!==null),
    },
    season: {
      bestSeasonPts:    allSeasonPts.sort((a,b)=>b.bestSeasonPts-a.bestSeasonPts).slice(0,10),
      bestSeasonTitles: allSeasonTitles.sort((a,b)=>b.bestSeasonTitles-a.bestSeasonTitles).slice(0,10),
      bestSeasonWins:   top3(players, byDesc(s=>s.bestSeasonWins), s=>s.bestSeasonWins>0),
      currentPts:       top3(players, byDesc(s=>s.currentSeasonPts), s=>s.currentSeasonPts>0),
      currentTitles:    top3(players, byDesc(s=>s.currentSeasonTitles), s=>s.currentSeasonTitles>0),
    },
  };
}

// — Podium card —
function RPodium({ rank, entry, value, label, sublabel, color=RC.gold }) {
  if (!entry) return null;
  const { player } = entry;
  const ac = MEDAL_COLOR[rank] ?? RC.dim;
  return (
    <div style={{
      flex:1, minWidth:0, borderRadius:4,
      background:`linear-gradient(160deg,rgba(255,255,255,${rank===0?'.05':'.02'}) 0%,transparent 100%)`,
      border:`1px solid ${ac}33`, borderTop:`2px solid ${ac}`,
      padding:'12px 10px 10px', display:'flex', flexDirection:'column', gap:7,
    }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <span style={{ fontSize:rank===0?20:15 }}>{['🥇','🥈','🥉'][rank] ?? '•'}</span>
        <span style={{ fontFamily:T.mono, fontSize:7, color:RC.dim, letterSpacing:3 }}>#{rank+1}</span>
      </div>
      <div style={{ display:'flex', alignItems:'center', gap:6 }}>
        <PlayerFace player={player} size={26} borderColor={`${ac}55`} />
        <div style={{ minWidth:0 }}>
          <div style={{ fontFamily:T.disp, fontSize:11, fontWeight:700, color:RC.text,
            overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', textTransform:'uppercase', letterSpacing:1 }}>
            {player.name}
          </div>
          <div style={{ fontFamily:T.mono, fontSize:7, color:RC.dim, marginTop:1 }}>
            {player.nationality} · {player.age}a
          </div>
        </div>
      </div>
      <div style={{ marginTop:'auto' }}>
        <div style={{ fontFamily:T.disp, fontSize:value?.toString().length>5?20:26, fontWeight:900,
          color:ac, lineHeight:1, filter:`drop-shadow(0 0 8px ${ac}55)` }}>
          {value}
        </div>
        <div style={{ fontFamily:T.mono, fontSize:7, color:`${color}88`, letterSpacing:2, textTransform:'uppercase', marginTop:2 }}>
          {label}
        </div>
        {sublabel && <div style={{ fontFamily:T.mono, fontSize:8, color:RC.dim, marginTop:2 }}>{sublabel}</div>}
      </div>
    </div>
  );
}

function RRecordRow({ rank, entry, value, label, sublabel, color=RC.gold }) {
  if (!entry) return null;
  const { player } = entry;
  const accent = color?.startsWith?.('rgba') ? '#9CA3AF' : color;
  const medalColor = MEDAL_COLOR[rank] ?? null;
  const isPodium = rank < 3;
  return (
    <div style={{
      display:'grid', gridTemplateColumns:'42px minmax(0,1fr) auto', alignItems:'center', gap:10,
      minHeight:52, padding:'8px 11px',
      border:`1px solid ${isPodium ? `${medalColor}55` : RC.border}`,
      borderLeft:`3px solid ${isPodium ? medalColor : `${accent}55`}`,
      borderRadius:5,
      background:isPodium ? `linear-gradient(90deg, ${medalColor}24 0%, ${medalColor}0E 38%, rgba(255,255,255,.018) 100%)` : 'rgba(255,255,255,.018)',
      boxShadow:isPodium ? `inset 0 0 26px ${medalColor}10` : 'none',
    }}>
      <div style={{
        width:30, height:30, borderRadius:6, display:'flex', alignItems:'center', justifyContent:'center',
        fontFamily:T.disp, fontSize:isPodium ? 19 : 15,
        color:isPodium ? '#050607' : RC.dim,
        background:isPodium ? medalColor : 'rgba(255,255,255,.04)',
        border:`1px solid ${isPodium ? medalColor : RC.border}`,
      }}>{rank + 1}</div>
      <div style={{ display:'flex', alignItems:'center', gap:9, minWidth:0 }}>
        <PlayerFace player={player} size={30} borderColor={`${isPodium ? medalColor : accent}66`} />
        <div style={{ minWidth:0 }}>
          <div style={{ fontFamily:T.disp, fontSize:14, color:RC.text, letterSpacing:'.04em', textTransform:'uppercase', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
            {player.name}
          </div>
          <div style={{ fontFamily:T.mono, fontSize:7.5, color:RC.dim, letterSpacing:'.08em', textTransform:'uppercase', marginTop:1 }}>
            {player.nationality} · {player.age}a{sublabel ? ` · ${sublabel}` : ''}
          </div>
        </div>
      </div>
      <div style={{ textAlign:'right', minWidth:86 }}>
        <div style={{ fontFamily:T.disp, fontSize:22, color:isPodium ? medalColor : accent, lineHeight:1 }}>{value}</div>
        <div style={{ fontFamily:T.mono, fontSize:7, color:`${accent}99`, letterSpacing:'.14em', textTransform:'uppercase', marginTop:2 }}>{label}</div>
      </div>
    </div>
  );
}

function TecnicosBancoView({ state }) {
  const U = {
    display: T.disp,
    mono: T.mono,
    body: T.body,
    text: T.text,
    textDim: T.dim,
    subtle: T.vdim,
    gold: T.gold,
  };
  const allPlayers = [...(state.tourPlayers ?? []), ...(state.prospects ?? [])];
  const records = computeCoachRecords(state.coachMarket, allPlayers);
  const coaches = records.ranking ?? [];
  const free = coaches.filter(c => c.marketStatus === 'FREE').slice(0, 12);
  const active = coaches.filter(c => c.marketStatus !== 'FREE');
  const playerMap = Object.fromEntries(allPlayers.map(p => [p.id, p]));
  const totalRep = coaches.reduce((s, c) => s + (c.reputation ?? 0), 0);
  const hot = active
    .filter(c => c.activePlayerName)
    .sort((a, b) => (b.reputation ?? 0) - (a.reputation ?? 0) || (b.recordScore ?? 0) - (a.recordScore ?? 0))
    .slice(0, 6);
  const legendary = (records.legendaryPartnerships ?? []).slice(0, 6);
  const metric = (label, value, tone = U.gold) => (
    <div style={{ border:`1px solid ${tone}26`, background:`${tone}08`, padding:'10px 12px' }}>
      <div style={{ fontFamily:U.display, fontSize:28, color:tone, lineHeight:1 }}>{value}</div>
      <div style={{ fontFamily:U.mono, fontSize:7, color:U.subtle, letterSpacing:'.16em', textTransform:'uppercase', marginTop:4 }}>{label}</div>
    </div>
  );
  const Card = ({ coach }) => {
    const method = COACH_METHODS[coach.method] ?? COACH_METHODS.FORMADOR;
    return (
      <div style={{ border:`1px solid ${method.color}28`, background:`${method.color}08`, padding:13, minHeight:112 }}>
        <div style={{ display:'flex', justifyContent:'space-between', gap:12, marginBottom:7 }}>
          <div style={{ fontFamily:U.display, fontSize:22, color:U.text, lineHeight:.9, textTransform:'uppercase' }}>{coach.name}</div>
          <div style={{ fontFamily:U.display, fontSize:26, color:method.color, lineHeight:1 }}>{coach.recordScore}</div>
        </div>
        <div style={{ display:'flex', gap:5, flexWrap:'wrap', marginBottom:8 }}>
          {[method.label, coach.originLabel, coach.activePlayerName ? `com ${coach.activePlayerName}` : 'livre'].filter(Boolean).map(tag => (
            <span key={tag} style={{ fontFamily:U.mono, fontSize:7, letterSpacing:'.12em', textTransform:'uppercase', color:method.color, border:`1px solid ${method.color}2A`, padding:'4px 6px' }}>{tag}</span>
          ))}
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:6 }}>
          {[['REP', coach.reputation], ['GS', coach.slams], ['TIT', coach.titles]].map(([k,v]) => (
            <div key={k} style={{ border:'1px solid rgba(255,255,255,.06)', padding:'6px 7px' }}>
              <div style={{ fontFamily:U.mono, fontSize:6, color:U.subtle, letterSpacing:2 }}>{k}</div>
              <div style={{ fontFamily:U.display, fontSize:20, color:U.text }}>{v ?? 0}</div>
            </div>
          ))}
        </div>
      </div>
    );
  };
  return (
    <div style={{ padding:18, color:U.text }}>
      <div style={{ fontFamily:U.mono, fontSize:8, letterSpacing:4, color:U.gold, textTransform:'uppercase', marginBottom:10 }}>Banco Vivo</div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(5,minmax(0,1fr))', gap:8, marginBottom:16 }}>
        {metric('técnicos no circuito', coaches.length)}
        {metric('parcerias ativas', active.length, '#5BB8E4')}
        {metric('livres', free.length, '#8DD7A5')}
        {metric('eras registradas', legendary.length, '#E8C84A')}
        {metric('rep média', coaches.length ? Math.round(totalRep / coaches.length) : 0, '#FFB86B')}
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1.1fr .9fr', gap:16 }}>
        <section>
          <div style={{ fontFamily:U.display, fontSize:32, textTransform:'uppercase', marginBottom:10 }}>Ranking de técnicos</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,minmax(0,1fr))', gap:10 }}>
            {coaches.slice(0, 12).map(coach => <Card key={coach.id} coach={coach} />)}
          </div>
        </section>
        <section style={{ display:'grid', gap:14 }}>
          <div>
            <div style={{ fontFamily:U.display, fontSize:26, textTransform:'uppercase', marginBottom:8 }}>Em alta</div>
            <div style={{ display:'grid', gap:7, marginBottom:14 }}>
              {hot.map(c => {
                const method = COACH_METHODS[c.method] ?? COACH_METHODS.FORMADOR;
                return (
                  <div key={`hot-${c.id}`} style={{ border:`1px solid ${method.color}26`, borderLeft:`3px solid ${method.color}`, background:`${method.color}07`, padding:'9px 10px' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', gap:10 }}>
                      <div style={{ minWidth:0 }}>
                        <div style={{ fontFamily:U.display, fontSize:19, color:U.text, textTransform:'uppercase', lineHeight:1 }}>{c.name}</div>
                        <div style={{ fontFamily:U.mono, fontSize:7, color:U.subtle, letterSpacing:'.12em', textTransform:'uppercase', marginTop:3 }}>{method.label} · com {c.activePlayerName}</div>
                      </div>
                      <div style={{ fontFamily:U.display, fontSize:22, color:method.color, lineHeight:1 }}>{c.reputation}</div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{ fontFamily:U.display, fontSize:26, textTransform:'uppercase', marginBottom:8 }}>Livres no mercado</div>
            <div style={{ display:'grid', gap:7 }}>{free.slice(0, 6).map(c => <Card key={c.id} coach={c} />)}</div>
          </div>
          <div>
            <div style={{ fontFamily:U.display, fontSize:26, textTransform:'uppercase', marginBottom:8 }}>Parcerias lendárias</div>
            <div style={{ display:'grid', gap:7, marginBottom:14 }}>
              {legendary.map(part => {
                const coach = state.coachMarket?.coachesById?.[part.coachId];
                const player = playerMap[part.playerId];
                return (
                  <div key={part.id} style={{ border:'1px solid rgba(232,200,74,.22)', background:'rgba(232,200,74,.05)', padding:'9px 10px' }}>
                    <div style={{ fontFamily:U.display, fontSize:18, color:U.text, textTransform:'uppercase', lineHeight:1 }}>{player?.name ?? part.playerId} + {coach?.name ?? part.coachName ?? part.coachId}</div>
                    <div style={{ fontFamily:U.mono, fontSize:7, color:U.gold, letterSpacing:'.12em', textTransform:'uppercase', marginTop:4 }}>{part.slamsTogether ?? 0} GS · {part.titlesTogether ?? 0} títulos · desde {part.startYear}</div>
                  </div>
                );
              })}
              {legendary.length === 0 && (
                <div style={{ border:'1px solid rgba(255,255,255,.07)', color:U.subtle, padding:'10px 12px', fontFamily:U.mono, fontSize:8, letterSpacing:'.12em', textTransform:'uppercase' }}>Ainda sem era consolidada</div>
              )}
            </div>
            <div style={{ fontFamily:U.display, fontSize:26, textTransform:'uppercase', marginBottom:8 }}>Eventos recentes</div>
            <div style={{ display:'grid', gap:7 }}>
              {(records.recentEvents ?? []).slice(0, 8).map((event, idx) => (
                <div key={`${event.type}-${idx}`} style={{ border:'1px solid rgba(255,255,255,.07)', background:'rgba(255,255,255,.018)', padding:'9px 10px' }}>
                  <div style={{ fontFamily:U.mono, fontSize:7, color:U.subtle, letterSpacing:2, textTransform:'uppercase' }}>{event.type} · {event.year}</div>
                  <div style={{ fontFamily:U.body, fontSize:12, color:U.textDim, lineHeight:1.45 }}>{event.text}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

// — Record block —€—
function RBlock({ title, icon, top3, getValue, getLabel, getSublabel, color=RC.gold }) {
  const [open, setOpen] = React.useState(false);
  const accent = color?.startsWith?.('rgba') ? '#9CA3AF' : color;
  if (!top3 || top3.length === 0) return (
    <div style={{ background:RC.bg, border:`1px solid ${RC.border}`, borderRadius:4,
      padding:'14px 12px', opacity:.45 }}>
      <div style={{ fontFamily:T.mono, fontSize:8, color:RC.dim, letterSpacing:3 }}>{icon} {title}</div>
      <div style={{ fontFamily:T.disp, fontSize:10, color:RC.vdim, marginTop:8 }}>Sem dados — simule mais torneios</div>
    </div>
  );
  const leader = top3[0];
  const podium = top3.slice(0, 3);
  const leaderValue = getValue(leader);
  const leaderLabel = getLabel(leader);
  const leaderSublabel = getSublabel ? getSublabel(leader) : null;
  return (
    <div style={{
      background:'linear-gradient(180deg, rgba(255,255,255,.032), rgba(255,255,255,.015))',
      border:`1px solid ${open ? `${accent}55` : RC.border}`,
      borderRadius:6,
      overflow:'hidden',
      boxShadow:open ? `0 18px 50px rgba(0,0,0,.28), inset 0 0 36px ${accent}08` : 'none',
    }}>
      <button type="button" onClick={() => setOpen(v => !v)} style={{
        width:'100%', border:'none', cursor:'pointer', textAlign:'left', padding:'13px 14px',
        background:`linear-gradient(90deg, ${accent}12 0%, rgba(255,255,255,.018) 48%, transparent 100%)`,
        color:RC.text, display:'grid', gridTemplateColumns:'minmax(0,1fr) auto', gap:14, alignItems:'center',
      }}>
        <div style={{ minWidth:0 }}>
          <div style={{
            display:'flex',
            alignItems:'center',
            gap:10,
            margin:'-4px 0 12px',
            minHeight:34,
            padding:'8px 11px',
            border:`1px solid ${accent}33`,
            borderLeft:`4px solid ${accent}`,
            borderRadius:5,
            background:`linear-gradient(90deg, ${accent}22 0%, ${accent}0C 58%, rgba(255,255,255,.018) 100%)`,
            boxShadow:`inset 0 0 24px ${accent}08`,
          }}>
            <span style={{ width:9, height:9, borderRadius:'50%', background:accent, boxShadow:`0 0 16px ${accent}AA`, flexShrink:0 }} />
            <span style={{ fontFamily:T.mono, fontSize:13, fontWeight:900, color:`${accent}ff`, letterSpacing:'.16em', textTransform:'uppercase', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
              {title}
            </span>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:10, minWidth:0 }}>
            <div style={{ width:36, height:36, borderRadius:8, background:RC.gold, color:'#050607', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:T.disp, fontSize:22, lineHeight:1, boxShadow:`0 0 24px ${RC.gold}30` }}>
              1
            </div>
            <PlayerFace player={leader.player} size={34} borderColor={`${RC.gold}88`} />
            <div style={{ minWidth:0 }}>
              <div style={{ fontFamily:T.disp, fontSize:16, color:RC.text, textTransform:'uppercase', letterSpacing:'.04em', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                {leader.player.name}
              </div>
              <div style={{ fontFamily:T.mono, fontSize:7.5, color:RC.dim, letterSpacing:'.1em', textTransform:'uppercase', marginTop:1 }}>
                {leader.player.nationality} · top {Math.min(10, top3.length)} disponível{leaderSublabel ? ` · ${leaderSublabel}` : ''}
              </div>
            </div>
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:14 }}>
          <div style={{ textAlign:'right' }}>
            <div style={{ fontFamily:T.disp, fontSize:30, color:RC.gold, lineHeight:1, filter:`drop-shadow(0 0 10px ${RC.gold}40)` }}>{leaderValue}</div>
            <div style={{ fontFamily:T.mono, fontSize:7, color:`${accent}99`, letterSpacing:'.16em', textTransform:'uppercase', marginTop:2 }}>{leaderLabel}</div>
          </div>
          <div style={{ width:28, height:28, borderRadius:5, border:`1px solid ${accent}44`, color:accent, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:T.disp, fontSize:20, transform:open ? 'rotate(180deg)' : 'rotate(0deg)', transition:'transform .18s ease' }}>
            ˅
          </div>
        </div>
      </button>
      {open && (
        <div style={{ padding:'11px 12px 13px', display:'flex', flexDirection:'column', gap:8, animation:'bu-dropdown .18s ease both' }}>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3, minmax(0, 1fr))', gap:7, marginBottom:3 }}>
            {podium.map((entry, i) => (
              <RPodium key={`${entry.id}-podium-${i}`} rank={i} entry={entry}
                value={getValue(entry)} label={getLabel(entry)}
                sublabel={getSublabel ? getSublabel(entry) : null} color={accent} />
            ))}
          </div>
          {top3.map((entry, i) => (
            <RRecordRow key={`${entry.id}-row-${i}`} rank={i} entry={entry}
              value={getValue(entry)} label={getLabel(entry)}
              sublabel={getSublabel ? getSublabel(entry) : null} color={accent} />
          ))}
        </div>
      )}
      {!open && (
        <div style={{ padding:'0 14px 12px', display:'flex', gap:6, alignItems:'center' }}>
          {podium.map((entry, i) => (
            <div key={`${entry.id}-mini-${i}`} style={{ flex:1, minWidth:0, display:'flex', alignItems:'center', gap:7, padding:'6px 8px', border:`1px solid ${MEDAL_COLOR[i]}33`, background:`${MEDAL_COLOR[i]}10`, borderRadius:5 }}>
              <span style={{ fontFamily:T.disp, fontSize:14, color:MEDAL_COLOR[i], lineHeight:1 }}>{i+1}</span>
              <div style={{ minWidth:0, flex:1, fontFamily:T.disp, fontSize:10, color:RC.text, textTransform:'uppercase', letterSpacing:'.04em', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{entry.player.name}</div>
              <span style={{ fontFamily:T.mono, fontSize:8, color:MEDAL_COLOR[i] }}>{getValue(entry)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// — Section header —
function RSec({ icon, title, color=RC.gold }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:10, margin:'28px 0 12px',
      paddingBottom:8, borderBottom:`1px solid ${color}33` }}>
      <span style={{ fontSize:18 }}>{icon}</span>
      <div style={{ fontFamily:T.mono, fontSize:9, fontWeight:700, letterSpacing:5,
        color:`${color}cc`, textTransform:'uppercase' }}>{title}</div>
      <div style={{ flex:1, height:1, background:`linear-gradient(90deg,${color}22,transparent)`, marginLeft:8 }} />
    </div>
  );
}

function RIntro({ eyebrow, title, text, color=RC.gold }) {
  return (
    <div style={{
      marginBottom: 18,
      padding: '14px 16px',
      background: `linear-gradient(180deg, ${color}12 0%, rgba(255,255,255,0.02) 100%)`,
      border: `1px solid ${color}22`,
      borderLeft: `3px solid ${color}`,
      borderRadius: 4,
    }}>
      <div style={{ fontFamily:T.mono, fontSize:8, letterSpacing:'.28em', color:`${color}cc`, textTransform:'uppercase', marginBottom:8 }}>
        {eyebrow}
      </div>
      <div style={{ fontFamily:T.disp, fontSize:22, color:RC.text, textTransform:'uppercase', letterSpacing:'.05em', marginBottom:8 }}>
        {title}
      </div>
      <div style={{ fontFamily:T.body, fontSize:13, lineHeight:1.65, color:RC.dim, maxWidth:840 }}>
        {text}
      </div>
    </div>
  );
}

// — Tab: Carreira —”€—
function RecordCarreiraTab({ records }) {
  const { career } = records;
  return (
    <div style={{ display:'flex', flexDirection:'column' }}>
      <RIntro eyebrow="especialistas" title="Quem dominou cada piso" text="Os líderes aqui não são só campeões: são jogadores que aprenderam a transformar cada superfície em território próprio." color={RC.blue} />

      <RSec icon="•" title="Títulos — Carreira" color={RC.gold} />
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
        <RBlock icon="•" title="MAIS TÍTULOS" color={RC.gold} top3={career.mostTitles}
          getValue={s=>s.titles} getLabel={()=>'títulos totais'}
          getSublabel={s=>`${s.gs} GS · ${s.masters} M1000`} />
        <RBlock icon="•" title="MAIS GRAND SLAMS" color={RC.gold} top3={career.mostGS}
          getValue={s=>s.gs} getLabel={()=>'Grand Slams'} />
        <RBlock icon="•" title="MAIS MASTERS 1000" color={RC.purple} top3={career.mostMasters}
          getValue={s=>s.masters} getLabel={()=>'Masters 1000'} />
        <RBlock icon="•" title="MAIS ATP FINALS" color={'#F97316'} top3={career.mostFinalsTitles}
          getValue={s=>s.finals_titles} getLabel={()=>'ATP Finals'} />
        <RBlock icon="•" title="MAIS ATP 500" color={RC.cyan} top3={career.mostATP500}
          getValue={s=>s.atp500} getLabel={()=>'ATP 500'} />
        <RBlock icon="•" title="MAIS ATP 250" color={RC.green} top3={career.mostATP250}
          getValue={s=>s.atp250} getLabel={()=>'ATP 250'} />
        <RBlock icon="•" title="MAIS CHALLENGERS" color={RC.dim} top3={career.mostChallengers}
          getValue={s=>s.atp100} getLabel={()=>'Challengers'} />
        <RBlock icon="•" title="MAIOR VARIEDADE DE TÍTULOS" color={RC.orange} top3={career.mostTitleBreadth}
          getValue={s=>`${s.titleBreadth}`} getLabel={()=>'categorias distintas'}
          getSublabel={s=>`${s.titles} títulos total`} />
      </div>

      <RSec icon="•" title="Grand Slams" color={RC.gold} />
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
        <RBlock icon="•" title="MAIS FINAIS DE GS" color={RC.gold} top3={career.mostGSFinals}
          getValue={s=>s.gsFinalsWon+s.gsFinalsLost} getLabel={()=>'finais de GS'}
          getSublabel={s=>`${s.gsFinalsWon}W · ${s.gsFinalsLost}L`} />
        <RBlock icon="•" title="MAIS GS VENCIDOS (em finais)" color={RC.gold} top3={career.bestGSRecord}
          getValue={s=>s.gsFinalsWon} getLabel={()=>'GS ganhos em final'}
          getSublabel={s=>s.gsFinalsLost>0?`${s.gsFinalsLost} derrotas`:null} />
      </div>

      <RSec icon="•" title="Temporada" color={RC.cyan} />
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
        <RBlock icon="•" title="MELHOR TEMPORADA (PONTOS)" color={RC.cyan}
          top3={season.bestSeasonPts}
          getValue={s=>s.bestSeasonPts.toLocaleString()} getLabel={()=>'pontos em uma temporada'}
          getSublabel={s=>s.bestSeasonPtsYr?`Temporada ${s.bestSeasonPtsYr}`:null} />
        <RBlock icon="•" title="MAIS TÍTULOS EM UMA TEMPORADA" color={RC.gold}
          top3={season.bestSeasonTitles}
          getValue={s=>s.bestSeasonTitles} getLabel={()=>'títulos em uma temporada'}
          getSublabel={s=>s.bestSeasonTitlesYr?`Temporada ${s.bestSeasonTitlesYr}`:null} />
        <RBlock icon="•" title="MAIS VITÓRIAS EM UMA TEMPORADA" color={RC.orange}
          top3={season.bestSeasonWins}
          getValue={s=>s.bestSeasonWins} getLabel={()=>'vitórias em uma temporada'} />
        <RBlock icon="•" title="MAIS PONTOS CARREIRA" color={RC.cyan}
          top3={career.mostCareerPts}
          getValue={s=>s.careerPts.toLocaleString()} getLabel={()=>'pontos acumulados'} />
        <RBlock icon={`a`} title={`LIDERANDO TEMPORADA ${currentYear}`} color={RC.green}
          top3={season.currentPts}
          getValue={s=>s.currentSeasonPts.toLocaleString()} getLabel={()=>`pts em ${currentYear}`} />
        <RBlock icon="•" title={`TÍTULOS EM ${currentYear}`} color={RC.green}
          top3={season.currentTitles}
          getValue={s=>s.currentSeasonTitles} getLabel={()=>`títulos em ${currentYear}`} />
      </div>

      <RSec icon="•" title="Performance & Sequências" color={RC.orange} />
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
        <RBlock icon="•" title="MAIS VITÓRIAS — CARREIRA" color={RC.orange} top3={career.mostWins}
          getValue={s=>s.wins} getLabel={()=>'vitórias'}
          getSublabel={s=>`em ${s.matchesPlayed} partidas`} />
        <RBlock icon="•" title="MELHOR WIN RATE (mín. 15 partidas)" color={RC.orange}
          top3={career.bestWinRate}
          getValue={s=>`${s.winRate}%`} getLabel={()=>'win rate'}
          getSublabel={s=>`${s.wins}V · ${s.losses}D`} />
        <RBlock icon="•" title="MAIS PARTIDAS JOGADAS" color={RC.dim} top3={career.mostMatches}
          getValue={s=>s.matchesPlayed} getLabel={()=>'partidas'} />
        <RBlock icon="•" title="MAIS FINAIS JOGADAS" color={RC.purple} top3={career.mostFinals}
          getValue={s=>s.finals} getLabel={()=>'finais'}
          getSublabel={s=>`${s.titles} vencidas (${s.finalsRate??'—'}%)`} />
        <RBlock icon="•" title="MELHOR APROVEITAMENTO EM FINAIS" color={RC.gold}
          top3={career.bestFinalsRate}
          getValue={s=>`${s.finalsRate}%`} getLabel={()=>'finais ganhas (mín. 3)'}
          getSublabel={s=>`${s.titles}V · ${s.finals-s.titles}D`} />
        <RBlock icon="•" title="MAIOR SEQUÊNCIA DE VITÓRIAS" color={RC.red} top3={career.longestWinStreak}
          getValue={s=>s.winStreak} getLabel={()=>'vitórias consecutivas'} />
        <RBlock icon="•" title="MAIS SEMIFINAIS" color={RC.blue} top3={career.mostSemis}
          getValue={s=>s.semifinals} getLabel={()=>'semifinais'} />
        <RBlock icon="•" title="MAIS DERROTAS EM FINAIS" color={RC.dim} top3={career.mostFinalLosses}
          getValue={s=>s.finalLosses} getLabel={()=>'finais perdidas'}
          getSublabel={s=>`${s.titles} vencidas de ${s.finals} total`} />
      </div>

      <RSec icon="•" title="Idade & Longevidade" color={RC.pink} />
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
        <RBlock icon="•" title="CAMPEÃO MAIS JOVEM — GERAL" color={RC.green} top3={career.youngestChamp}
          getValue={s=>`${s.youngestChampAge}a`} getLabel={()=>'idade do 1º título'}
          getSublabel={s=>`${s.titles} título(s) carreira`} />
        <RBlock icon="•" title="CAMPEÃO MAIS VELHO — GERAL" color={RC.orange} top3={career.oldestChamp}
          getValue={s=>`${s.oldestChampAge}a`} getLabel={()=>'idade do último título'} />
        <RBlock icon="•" title="MAIS ANOS COM TÍTULO" color={'#A78BFA'} top3={career.mostLongevidade}
          getValue={s=>s.longevidade} getLabel={()=>'temporadas com ao menos 1 título'}
          getSublabel={s=>`${s.titles} títulos totais`} />
      </div>

      {/* — Campeão mais jovem/velho por categoria — */}
      {(() => {
        const CATS = [
          { key:'GRAND_SLAM',   label:'Grand Slam',    icon:'⭐', color:'#E8C84A' },
          { key:'MASTERS_1000', label:'Masters 1000',  icon:'◆', color:'#E040FB' },
          { key:'ATP_500',      label:'ATP 500',        icon:'◇', color:'#00BCD4' },
          { key:'ATP_250',      label:'ATP 250',        icon:'●', color:'#66BB6A' },
          { key:'ATP_100',      label:'ATP 100',        icon:'○', color:'#FF7043' },
          { key:'FINALS',       label:'ATP Finals',     icon:'★', color:'#F44336' },
        ];
        return (
          <>
            <RSec icon="•" title="Campeão Mais Jovem por Categoria" color={RC.green} />
            <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
              {CATS.map(({ key, label, icon, color }) => {
                const entries = career.youngestChampByCategory?.[key] ?? [];
                if (!entries.length) return null;
                return (
                  <div key={key} style={{ background:RC.panel, border:`1px solid ${color}22`, borderLeft:`3px solid ${color}`, padding:'10px 14px' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
                      <span style={{ fontSize:14 }}>{icon}</span>
                      <span style={{ fontFamily:T.mono, fontSize:8, letterSpacing:3, color:`${color}cc`, textTransform:'uppercase' }}>{label}</span>
                    </div>
                    <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                      {entries.map((s, ri) => {
                        const age = s.youngestChampAgeByCategory?.[key];
                        if (age == null) return null;
                        const medals = ['🥇','🥈','🥉'];
                        return (
                          <div key={s.id ?? ri} style={{ display:'flex', alignItems:'center', gap:8, flex:1, minWidth:160, background:`${color}08`, border:`1px solid ${color}20`, padding:'7px 11px' }}>
                            <span style={{ fontSize:12 }}>{medals[ri] ?? '·'}</span>
                            <PlayerFace player={s.player} size={26} borderColor={`${color}55`} />
                            <div style={{ flex:1, minWidth:0 }}>
                              <div style={{ fontFamily:T.disp, fontSize:11, color:RC.text, textTransform:'uppercase', letterSpacing:.5, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{s.name}</div>
                              <div style={{ fontFamily:T.mono, fontSize:8, color:T.dim }}>{s.nationality}</div>
                            </div>
                            <div style={{ fontFamily:T.disp, fontSize:22, color, lineHeight:1 }}>{age}<span style={{ fontSize:10, color:`${color}99` }}>a</span></div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            <RSec icon="•" title="Campeão Mais Velho por Categoria" color={RC.orange} />
            <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
              {CATS.map(({ key, label, icon, color }) => {
                const entries = career.oldestChampByCategory?.[key] ?? [];
                if (!entries.length) return null;
                return (
                  <div key={key} style={{ background:RC.panel, border:`1px solid ${color}22`, borderLeft:`3px solid ${color}`, padding:'10px 14px' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
                      <span style={{ fontSize:14 }}>{icon}</span>
                      <span style={{ fontFamily:T.mono, fontSize:8, letterSpacing:3, color:`${color}cc`, textTransform:'uppercase' }}>{label}</span>
                    </div>
                    <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                      {entries.map((s, ri) => {
                        const age = s.oldestChampAgeByCategory?.[key];
                        if (age == null) return null;
                        const medals = ['🥇','🥈','🥉'];
                        return (
                          <div key={s.id ?? ri} style={{ display:'flex', alignItems:'center', gap:8, flex:1, minWidth:160, background:`${color}08`, border:`1px solid ${color}20`, padding:'7px 11px' }}>
                            <span style={{ fontSize:12 }}>{medals[ri] ?? '·'}</span>
                            <PlayerFace player={s.player} size={26} borderColor={`${color}55`} />
                            <div style={{ flex:1, minWidth:0 }}>
                              <div style={{ fontFamily:T.disp, fontSize:11, color:RC.text, textTransform:'uppercase', letterSpacing:.5, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{s.name}</div>
                              <div style={{ fontFamily:T.mono, fontSize:8, color:T.dim }}>{s.nationality}</div>
                            </div>
                            <div style={{ fontFamily:T.disp, fontSize:22, color, lineHeight:1 }}>{age}<span style={{ fontSize:10, color:`${color}99` }}>a</span></div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        );
      })()}

      {career.careerGrandSlam?.length > 0 && (<>
        <RSec icon="•" title="Career Grand Slam" color={RC.gold} />
        <div style={{ background:RC.bg, border:`1px solid ${RC.gold}44`, borderRadius:4, padding:'14px 12px' }}>
          <div style={{ fontFamily:T.mono, fontSize:8, color:`${RC.gold}99`, letterSpacing:3, marginBottom:10 }}>
            VENCERAM TODOS OS 6 GRAND SLAMS NA CARREIRA
          </div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
            {career.careerGrandSlam.map((s,i) => (
              <div key={s.id} style={{ display:'flex', alignItems:'center', gap:8,
                background:`${RC.gold}0D`, border:`1px solid ${RC.gold}33`, borderRadius:4,
                padding:'8px 12px' }}>
                <PlayerFace player={s.player} size={28} borderColor={`${RC.gold}55`} />
                <div>
                  <div style={{ fontFamily:T.disp, fontSize:11, fontWeight:700, color:RC.text, textTransform:'uppercase', letterSpacing:1 }}>{s.name}</div>
                  <div style={{ fontFamily:T.mono, fontSize:7, color:RC.dim, marginTop:1 }}>{s.nationality} · {s.gs} GS · {s.titles} títulos</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </>)}
    </div>
  );
}

// — Tab: Superfícies —
function RecordSuperficieTab({ records }) {
  const { career } = records;
  return (
    <div style={{ display:'flex', flexDirection:'column' }}>

      <RSec icon="•" title="Quadra Dura" color={RC.blue} />
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
        <RBlock icon="•" title="MAIS TÍTULOS — QUADRA DURA" color={RC.blue} top3={career.hardTitles}
          getValue={s=>s.surfTitles.HARD??0} getLabel={()=>'títulos em Hard'} />
        <RBlock icon="•" title="MAIS VITÓRIAS — QUADRA DURA" color={RC.blue} top3={career.hardWins}
          getValue={s=>s.surfWins.HARD??0} getLabel={()=>'vitórias em Hard'} />
        <RBlock icon="•" title="MELHOR WIN RATE — HARD (mín. 100)" color={RC.blue} top3={career.hardWinRate}
          getValue={s=>`${s.surfWinRate.HARD}%`} getLabel={()=>'win rate em Hard'}
          getSublabel={s=>`${s.surfWins.HARD}V · ${s.surfLosses.HARD}D`} />
      </div>

      <RSec icon="•" title="Saibro" color={RC.clay} />
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
        <RBlock icon="•" title="MAIS TÍTULOS — SAIBRO" color={RC.clay} top3={career.clayTitles}
          getValue={s=>s.surfTitles.CLAY??0} getLabel={()=>'títulos em Saibro'} />
        <RBlock icon="•" title="MAIS VITÓRIAS — SAIBRO" color={RC.clay} top3={career.clayWins}
          getValue={s=>s.surfWins.CLAY??0} getLabel={()=>'vitórias em Saibro'} />
        <RBlock icon="•" title="MELHOR WIN RATE — SAIBRO (mín. 100)" color={RC.clay} top3={career.clayWinRate}
          getValue={s=>`${s.surfWinRate.CLAY}%`} getLabel={()=>'win rate em Saibro'}
          getSublabel={s=>`${s.surfWins.CLAY}V · ${s.surfLosses.CLAY}D`} />
      </div>

      <RSec icon="•" title="Grama" color={RC.grass} />
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
        <RBlock icon="•" title="MAIS TÍTULOS — GRAMA" color={RC.grass} top3={career.grassTitles}
          getValue={s=>s.surfTitles.GRASS??0} getLabel={()=>'títulos em Grama'} />
        <RBlock icon="•" title="MAIS VITÓRIAS — GRAMA" color={RC.grass} top3={career.grassWins}
          getValue={s=>s.surfWins.GRASS??0} getLabel={()=>'vitórias em Grama'} />
        <RBlock icon="•" title="MELHOR WIN RATE — GRAMA (mín. 100)" color={RC.grass} top3={career.grassWinRate}
          getValue={s=>`${s.surfWinRate.GRASS}%`} getLabel={()=>'win rate em Grama'}
          getSublabel={s=>`${s.surfWins.GRASS}V · ${s.surfLosses.GRASS}D`} />
      </div>

      <RSec icon="•" title="Indoor" color={RC.purple ?? '#AA44FF'} />
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
        <RBlock icon="•" title="MAIS TÍTULOS — INDOOR" color={RC.purple ?? '#AA44FF'} top3={career.indoorTitles}
          getValue={s=>s.surfTitles.INDOOR??0} getLabel={()=>'títulos em Indoor'} />
        <RBlock icon="•" title="MAIS VITÓRIAS — INDOOR" color={RC.purple ?? '#AA44FF'} top3={career.indoorWins}
          getValue={s=>s.surfWins.INDOOR??0} getLabel={()=>'vitórias em Indoor'} />
        <RBlock icon="•" title="MELHOR WIN RATE — INDOOR (mín. 100)" color={RC.purple ?? '#AA44FF'} top3={career.indoorWinRate}
          getValue={s=>`${s.surfWinRate.INDOOR}%`} getLabel={()=>'win rate em Indoor'}
          getSublabel={s=>`${s.surfWins.INDOOR}V · ${s.surfLosses.INDOOR}D`} />
      </div>
    </div>
  );
}

// — Tab: Juniors —€—
function RecordJuniorsTab({ records, state }) {
  const { career } = records;
  const prospects = (state?.prospects ?? []).map(p => ({
    id:p.id, player:p, name:p.name, age:p.age ?? 0,
    overall: p.attrs ? overallRating(p.attrs) : (p.overallRating ?? 0),
    potential: p.potential ?? p.potentialRating ?? 0,
  }));
  const youngest = [...prospects].filter(p=>p.age>0).sort((a,b)=>a.age-b.age).slice(0,10);
  const strongest = [...prospects].filter(p=>p.overall>0).sort((a,b)=>b.overall-a.overall).slice(0,10);
  const potential = [...prospects].filter(p=>p.potential>0).sort((a,b)=>b.potential-a.potential).slice(0,10);
  return (
    <div style={{ display:'flex', flexDirection:'column' }}>
      <RSec icon="•" title="Juniors" color={'#FF7043'} />
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
        <RBlock icon="•" title="MAIS TÍTULOS PROSPECTS" color={'#FF7043'} top3={career.prospectsTitles}
          getValue={s=>s.prospects_titles} getLabel={()=>'títulos no circuito'} />
        <RBlock icon="•" title="MAIS FINAIS JUNIORS" color={RC.gold} top3={career.prospectsFinals}
          getValue={s=>s.prospects_finals_titles} getLabel={()=>'Junior Finals'} />
        <RBlock icon="•" title="MAIS JOVEM DA GERAÇÃO" color={RC.green} top3={youngest}
          getValue={s=>`${s.age}a`} getLabel={()=>'idade no circuito junior'} />
        <RBlock icon="•" title="MAIOR OVERALL PROSPECT" color={RC.purple} top3={strongest}
          getValue={s=>s.overall} getLabel={()=>'overall atual'} />
        <RBlock icon="•" title="MAIOR TETO PROJETADO" color={RC.cyan} top3={potential}
          getValue={s=>s.potential} getLabel={()=>'potencial'} />
      </div>
    </div>
  );
}

// — Tab: Sets & Partidas —
function RecordSetsTab({ records }) {
  const { career } = records;
  return (
    <div style={{ display:'flex', flexDirection:'column' }}>

      <RSec icon="•" title="Domínio — Sets" color={RC.red} />
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
        <RBlock icon="•" title="MAIS BAGELS DADOS (6-0)" color={RC.red} top3={career.mostBagels}
          getValue={s=>s.bagels} getLabel={()=>'sets 6-0 aplicados'}
          getSublabel={s=>`em ${s.matchesPlayed} partidas`} />
        <RBlock icon="•" title="MAIS DOUBLE BAGELS (6-0 6-0)" color={'#E53E3E'} top3={career.mostDoubleBagels}
          getValue={s=>s.doubleBagels} getLabel={()=>'double bagels'}
          getSublabel={s=>`${s.bagels} bagels total`} />
        <RBlock icon="•" title="MELHOR % SETS VENCIDOS (mín. 10)" color={RC.orange} top3={career.bestSetsWinRate}
          getValue={s=>`${s.setsWinRate}%`} getLabel={()=>'sets ganhos'}
          getSublabel={s=>`${s.setsWon}V · ${s.setsLost}D`} />
      </div>

      <RSec icon="•" title="Tiebreaks" color={RC.cyan} />
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
        <RBlock icon="•" title="MAIS TIEBREAKS VENCIDOS" color={RC.cyan} top3={career.mostTiebreaks}
          getValue={s=>s.tiebreaksWon} getLabel={()=>'tiebreaks ganhos'}
          getSublabel={s=>`${s.matchesPlayed} partidas jogadas`} />
      </div>

      <div style={{ marginTop:16, padding:'12px 14px', background:RC.bg,
        border:`1px solid ${RC.border}`, borderRadius:4,
        fontFamily:T.mono, fontSize:8, color:RC.dim, lineHeight:1.8 }}>
        <span style={{ color:`${RC.orange}99`, marginRight:6 }}>◆</span>
        Bagels e tiebreaks são rastreados a partir desta temporada.
        Dados históricos (temporadas anteriores) são incluídos automaticamente conforme o save acumula.
      </div>
    </div>
  );
}

function RecordLegadoTab({ records }) {
  const { career } = records;
  return (
    <div style={{ display:'flex', flexDirection:'column' }}>
      <RIntro eyebrow="legado histórico" title="Quem empilhou grandeza" text="Esta página olha para o peso real de uma carreira: títulos, palcos grandes, profundidade competitiva e a capacidade de sustentar o topo por anos." color={RC.gold} />

      <RSec icon="•" title="Títulos e Hierarquia" color={RC.gold} />
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
        <RBlock icon="•" title="MAIS TÍTULOS" color={RC.gold} top3={career.mostTitles} getValue={s=>s.titles} getLabel={()=>'títulos totais'} getSublabel={s=>`${s.gs} GS · ${s.masters} M1000`} />
        <RBlock icon="•" title="MAIS GRAND SLAMS" color={RC.gold} top3={career.mostGS} getValue={s=>s.gs} getLabel={()=>'Grand Slams'} />
        <RBlock icon="•" title="MAIS MASTERS 1000" color={RC.purple} top3={career.mostMasters} getValue={s=>s.masters} getLabel={()=>'Masters 1000'} />
        <RBlock icon="•" title="MAIS ATP FINALS" color={'#F97316'} top3={career.mostFinalsTitles} getValue={s=>s.finals_titles} getLabel={()=>'ATP Finals'} />
        <RBlock icon="•" title="MAIS ATP 500" color={RC.cyan} top3={career.mostATP500} getValue={s=>s.atp500} getLabel={()=>'ATP 500'} />
        <RBlock icon="•" title="MAIS ATP 250" color={RC.green} top3={career.mostATP250} getValue={s=>s.atp250} getLabel={()=>'ATP 250'} />
        <RBlock icon="•" title="MAIS CHALLENGERS" color={RC.dim} top3={career.mostChallengers} getValue={s=>s.atp100} getLabel={()=>'Challengers'} />
        <RBlock icon="•" title="MAIOR VARIEDADE DE TÍTULOS" color={RC.orange} top3={career.mostTitleBreadth} getValue={s=>`${s.titleBreadth}`} getLabel={()=>'categorias distintas'} getSublabel={s=>`${s.titles} títulos no total`} />
      </div>

      <RSec icon="•" title="Palcos Máximos" color={RC.gold} />
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
        <RBlock icon="•" title="MAIS FINAIS DE GS" color={RC.gold} top3={career.mostGSFinals} getValue={s=>s.gsFinalsWon+s.gsFinalsLost} getLabel={()=>'finais de GS'} getSublabel={s=>`${s.gsFinalsWon}W · ${s.gsFinalsLost}L`} />
        <RBlock icon="•" title="MAIS GS VENCIDOS" color={RC.gold} top3={career.bestGSRecord} getValue={s=>s.gsFinalsWon} getLabel={()=>'GS ganhos em final'} getSublabel={s=>s.gsFinalsLost>0?`${s.gsFinalsLost} derrotas`:null} />
      </div>

      <RSec icon="•" title="Profundidade de Carreira" color={RC.orange} />
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
        <RBlock icon="•" title="MAIS PONTOS CARREIRA" color={RC.cyan} top3={career.mostCareerPts} getValue={s=>s.careerPts.toLocaleString()} getLabel={()=>'pontos acumulados'} />
        <RBlock icon="•" title="MAIS VITÓRIAS — CARREIRA" color={RC.orange} top3={career.mostWins} getValue={s=>s.wins} getLabel={()=>'vitórias'} getSublabel={s=>`em ${s.matchesPlayed} partidas`} />
        <RBlock icon="•" title="MELHOR WIN RATE (mín. 100)" color={RC.orange} top3={career.bestWinRate} getValue={s=>`${s.winRate}%`} getLabel={()=>'win rate'} getSublabel={s=>`${s.wins}V · ${s.losses}D`} />
        <RBlock icon="•" title="MAIS PARTIDAS JOGADAS" color={RC.dim} top3={career.mostMatches} getValue={s=>s.matchesPlayed} getLabel={()=>'partidas'} />
        <RBlock icon="•" title="MAIS FINAIS JOGADAS" color={RC.purple} top3={career.mostFinals} getValue={s=>s.finals} getLabel={()=>'finais'} getSublabel={s=>`${s.titles} vencidas (${s.finalsRate??'—'}%)`} />
        <RBlock icon="•" title="MELHOR APROVEITAMENTO EM FINAIS" color={RC.gold} top3={career.bestFinalsRate} getValue={s=>`${s.finalsRate}%`} getLabel={()=>'finais ganhas (mín. 3)'} getSublabel={s=>`${s.titles}V · ${s.finals-s.titles}D`} />
        <RBlock icon="•" title="MAIOR SEQUÊNCIA DE VITÓRIAS" color={RC.red} top3={career.longestWinStreak} getValue={s=>s.winStreak} getLabel={()=>'vitórias consecutivas'} />
        <RBlock icon="•" title="MAIS SEMIFINAIS" color={RC.blue} top3={career.mostSemis} getValue={s=>s.semifinals} getLabel={()=>'semifinais'} />
        <RBlock icon="•" title="MAIS DERROTAS EM FINAIS" color={RC.dim} top3={career.mostFinalLosses} getValue={s=>s.finalLosses} getLabel={()=>'finais perdidas'} getSublabel={s=>`${s.titles} vencidas de ${s.finals} total`} />
      </div>

      <RSec icon="•" title="Idade e Longevidade" color={RC.pink} />
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
        <RBlock icon="•" title="CAMPEÃO MAIS JOVEM — GERAL" color={RC.green} top3={career.youngestChamp} getValue={s=>`${s.youngestChampAge}a`} getLabel={()=>'idade do 1º título'} getSublabel={s=>`${s.titles} título(s)`} />
        <RBlock icon="•" title="CAMPEÃO MAIS VELHO — GERAL" color={RC.orange} top3={career.oldestChamp} getValue={s=>`${s.oldestChampAge}a`} getLabel={()=>'idade do último título'} />
        <RBlock icon="•" title="MAIS ANOS COM TÍTULO" color={'#A78BFA'} top3={career.mostLongevidade} getValue={s=>s.longevidade} getLabel={()=>'temporadas com ao menos 1 título'} getSublabel={s=>`${s.titles} títulos totais`} />
        <RBlock icon="•" title="MAIOR ERA CONSECUTIVA" color={RC.gold} top3={career.longestTitleEra} getValue={s=>s.titleEra} getLabel={()=>'anos seguidos com título'} getSublabel={s=>`${s.titles} títulos na carreira`} />
      </div>

      {career.careerGrandSlam?.length > 0 && (
        <>
          <RSec icon="•" title="Career Grand Slam" color={RC.gold} />
          <div style={{ background:RC.bg, border:`1px solid ${RC.gold}44`, borderRadius:4, padding:'14px 12px' }}>
            <div style={{ fontFamily:T.mono, fontSize:8, color:`${RC.gold}99`, letterSpacing:3, marginBottom:10 }}>
              VENCERAM TODOS OS 6 GRAND SLAMS NA CARREIRA
            </div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
              {career.careerGrandSlam.map((s) => (
                <div key={s.id} style={{ display:'flex', alignItems:'center', gap:8, background:`${RC.gold}0D`, border:`1px solid ${RC.gold}33`, borderRadius:4, padding:'8px 12px' }}>
                  <PlayerFace player={s.player} size={28} borderColor={`${RC.gold}55`} />
                  <div>
                    <div style={{ fontFamily:T.disp, fontSize:11, fontWeight:700, color:RC.text, textTransform:'uppercase', letterSpacing:1 }}>{s.name}</div>
                    <div style={{ fontFamily:T.mono, fontSize:7, color:RC.dim, marginTop:1 }}>{s.nationality} · {s.gs} GS · {s.titles} títulos</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function RecordTemporadaTab({ records }) {
  const { season, currentYear } = records;
  return (
    <div style={{ display:'flex', flexDirection:'column' }}>
      <RIntro eyebrow="corrida anual" title={`O peso da temporada ${currentYear}`} text="Aqui entram os picos anuais. 0 a página para acompanhar explosões de pontos, empilhamento de títulos e quem está produzindo mais volume estatístico neste momento." color={RC.cyan} />

      <RSec icon="•" title="Melhores Temporadas Já Registradas" color={RC.cyan} />
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
        <RBlock icon="•" title="MELHOR TEMPORADA (PONTOS)" color={RC.cyan} top3={season.bestSeasonPts} getValue={s=>s.bestSeasonPts.toLocaleString()} getLabel={()=>'pontos em uma temporada'} getSublabel={s=>s.bestSeasonPtsYr?`Temporada ${s.bestSeasonPtsYr}`:null} />
        <RBlock icon="•" title="MAIS TÍTULOS EM UMA TEMPORADA" color={RC.gold} top3={season.bestSeasonTitles} getValue={s=>s.bestSeasonTitles} getLabel={()=>'títulos em uma temporada'} getSublabel={s=>s.bestSeasonTitlesYr?`Temporada ${s.bestSeasonTitlesYr}`:null} />
        <RBlock icon="•" title="MAIS VITÓRIAS EM UMA TEMPORADA" color={RC.orange} top3={season.bestSeasonWins} getValue={s=>s.bestSeasonWins} getLabel={()=>'vitórias em uma temporada'} />
        <RBlock icon="•" title="MAIS WINNERS EM UMA TEMPORADA" color={RC.red} top3={season.bestSeasonWinners} getValue={s=>s.bestSeasonWinners.toLocaleString()} getLabel={()=>'winners em uma temporada'} getSublabel={s=>s.bestSeasonWinnersYr?`Temporada ${s.bestSeasonWinnersYr}`:null} />
        <RBlock icon="•" title="MAIS ACES EM UMA TEMPORADA" color={RC.blue} top3={season.bestSeasonAces} getValue={s=>s.bestSeasonAces.toLocaleString()} getLabel={()=>'aces em uma temporada'} getSublabel={s=>s.bestSeasonAcesYr?`Temporada ${s.bestSeasonAcesYr}`:null} />
        <RBlock icon="•" title="MELHOR M0DIA DE WINNERS/JOGO" color={RC.red} top3={season.bestSeasonWinnersAvg} getValue={s=>s.bestSeasonWinnersAvg.toFixed(2)} getLabel={()=>'winners por jogo na temporada'} getSublabel={s=>`${s.bestSeasonWinnersAvgMatches} partidas · ${s.bestSeasonWinnersAvgYr}`} />
        <RBlock icon="•" title="MELHOR M0DIA DE ACES/JOGO" color={RC.blue} top3={season.bestSeasonAcesAvg} getValue={s=>s.bestSeasonAcesAvg.toFixed(2)} getLabel={()=>'aces por jogo na temporada'} getSublabel={s=>`${s.bestSeasonAcesAvgMatches} partidas · ${s.bestSeasonAcesAvgYr}`} />
      </div>

      <RSec icon="•" title={`Líderes de ${currentYear}`} color={RC.green} />
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
        <RBlock icon="•" title={`PONTOS EM ${currentYear}`} color={RC.green} top3={season.currentPts} getValue={s=>s.currentSeasonPts.toLocaleString()} getLabel={()=>`pts em ${currentYear}`} />
        <RBlock icon="•" title={`TÍTULOS EM ${currentYear}`} color={RC.green} top3={season.currentTitles} getValue={s=>s.currentSeasonTitles} getLabel={()=>`títulos em ${currentYear}`} />
        <RBlock icon="•" title={`WINNERS EM ${currentYear}`} color={RC.red} top3={season.currentWinners} getValue={s=>s.currentSeasonWinners.toLocaleString()} getLabel={()=>`winners em ${currentYear}`} />
        <RBlock icon="•" title={`ACES EM ${currentYear}`} color={RC.blue} top3={season.currentAces} getValue={s=>s.currentSeasonAces.toLocaleString()} getLabel={()=>`aces em ${currentYear}`} />
        <RBlock icon="•" title={`WINNERS/JOGO EM ${currentYear}`} color={RC.red} top3={season.currentWinnersAvg} getValue={s=>s.currentSeasonWinnersPerMatch.toFixed(2)} getLabel={()=>`média de winners`} getSublabel={s=>`${s.currentSeasonMatches} partidas`} />
        <RBlock icon="•" title={`ACES/JOGO EM ${currentYear}`} color={RC.blue} top3={season.currentAcesAvg} getValue={s=>s.currentSeasonAcesPerMatch.toFixed(2)} getLabel={()=>`média de aces`} getSublabel={s=>`${s.currentSeasonMatches} partidas`} />
        <RBlock icon="•" title={`DOUBLE FAULTS EM ${currentYear}`} color={RC.orange} top3={season.currentDoubleFaults} getValue={s=>s.currentSeasonDoubleFaults.toLocaleString()} getLabel={()=>`duplas faltas em ${currentYear}`} />
        <RBlock icon="•" title={`ERROS NÃO FORÇADOS EM ${currentYear}`} color={RC.dim} top3={season.currentUnforcedErrors} getValue={s=>s.currentSeasonUnforcedErrors.toLocaleString()} getLabel={()=>`UNF em ${currentYear}`} />
      </div>
    </div>
  );
}

function RecordExecucaoTab({ records }) {
  const { career } = records;
  const shotSections = SHOT_TYPE_ORDER.map((shotType) => ({
    shotType,
    title: `PONTOS COM ${SHOT_TYPE_META[shotType]?.label?.toUpperCase?.() ?? shotType}`,
    color: SHOT_TYPE_META[shotType]?.color ?? RC.purple,
    top3: career.shotPointLeaders?.[shotType] ?? [],
    label: SHOT_TYPE_META[shotType]?.label ?? shotType,
  }));
  return (
    <div style={{ display:'flex', flexDirection:'column' }}>
      <RIntro eyebrow="produção em quadra" title="Volume, agressão e custo" text="Esta página acompanha o lado mais bruto da execução: quem mais produziu winners e aces, quem mais viveu de tiebreak e quem pagou o preço do risco com duplas faltas e erros." color={RC.red} />

      <RSec icon="•" title="Estatísticas de Execução — Carreira" color={RC.red} />
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
        <RBlock icon="•" title="MAIS WINNERS — CARREIRA" color={RC.red} top3={career.mostWinners} getValue={s=>s.winners.toLocaleString()} getLabel={()=>'winners'} getSublabel={s=>`${s.matchesPlayed} partidas`} />
        <RBlock icon="•" title="MAIS ACES — CARREIRA" color={RC.blue} top3={career.mostAces} getValue={s=>s.aces.toLocaleString()} getLabel={()=>'aces'} />
        <RBlock icon="•" title="MELHOR M0DIA DE WINNERS/JOGO" color={RC.red} top3={career.bestWinnersPerMatch} getValue={s=>s.careerWinnersPerMatch.toFixed(2)} getLabel={()=>'winners por jogo'} getSublabel={s=>`${s.matchesPlayed} partidas`} />
        <RBlock icon="•" title="MELHOR M0DIA DE ACES/JOGO" color={RC.blue} top3={career.bestAcesPerMatch} getValue={s=>s.careerAcesPerMatch.toFixed(2)} getLabel={()=>'aces por jogo'} getSublabel={s=>`${s.matchesPlayed} partidas`} />
        <RBlock icon="•" title="MAIS DOUBLE FAULTS — CARREIRA" color={RC.orange} top3={career.mostDoubleFaults} getValue={s=>s.doubleFaults.toLocaleString()} getLabel={()=>'duplas faltas'} />
        <RBlock icon="•" title="MAIS ERROS NÃO FORÇADOS — CARREIRA" color={RC.dim} top3={career.mostUnforcedErrors} getValue={s=>s.unforcedErrors.toLocaleString()} getLabel={()=>'UNF acumulados'} />
      </div>

      <RSec icon="•" title="Domínio de Sets" color={RC.red} />
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
        <RBlock icon="•" title="MAIS SETS PERFEITOS (4-0)" color={RC.red} top3={career.mostBagels} getValue={s=>s.bagels} getLabel={()=>'sets 4-0 aplicados'} getSublabel={s=>`em ${s.matchesPlayed} partidas`} />
        <RBlock icon="•" title="MAIS DOUBLE 4-0" color={'#E53E3E'} top3={career.mostDoubleBagels} getValue={s=>s.doubleBagels} getLabel={()=>'duas parciais 4-0'} getSublabel={s=>`${s.bagels} sets perfeitos`} />
        <RBlock icon="•" title="MELHOR % DE SETS VENCIDOS (mín. 10)" color={RC.orange} top3={career.bestSetsWinRate} getValue={s=>`${s.setsWinRate}%`} getLabel={()=>'sets ganhos'} getSublabel={s=>`${s.setsWon}V · ${s.setsLost}D`} />
        <RBlock icon="•" title="MAIS TIEBREAKS VENCIDOS" color={RC.cyan} top3={career.mostTiebreaks} getValue={s=>s.tiebreaksWon} getLabel={()=>'tiebreaks ganhos'} getSublabel={s=>`${s.matchesPlayed} partidas`} />
      </div>

      <RSec icon="•" title="Pontos por Shot Type" color={RC.purple} />
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
        {shotSections.map(({ shotType, title, color, top3, label }) => (
          <RBlock
            key={shotType}
            icon="•"
            title={title}
            color={color}
            top3={top3}
            getValue={s=>s.shotPoints.toLocaleString()}
            getLabel={()=>`pontos vencidos com ${label.toLowerCase()}`}
            getSublabel={s=>`${s.matchesPlayed} partidas`}
          />
        ))}
      </div>

      <div style={{ marginTop:16, padding:'12px 14px', background:RC.bg, border:`1px solid ${RC.border}`, borderRadius:4, fontFamily:T.mono, fontSize:8, color:RC.dim, lineHeight:1.8 }}>
        <span style={{ color:`${RC.orange}99`, marginRight:6 }}>◆</span>
        Este painel agora usa o golpe final real do ponto salvo no records store. Saves antigos ainda vão preencher isso aos poucos conforme novas partidas forem sendo jogadas.
      </div>

      <RSec icon="•" title="Asfalto" color={RC.orange} />
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
        <RBlock icon="•" title="MAIS TÍTULOS · ASFALTO" color={RC.orange} top3={career.streetTitles} getValue={s=>s.surfTitles.STREET??0} getLabel={()=>'títulos no Asfalto'} />
        <RBlock icon="•" title="MAIS VITÓRIAS · ASFALTO" color={RC.orange} top3={career.streetWins} getValue={s=>s.surfWins.STREET??0} getLabel={()=>'vitórias no Asfalto'} />
        <RBlock icon="•" title="MELHOR WIN RATE · ASFALTO" color={RC.orange} top3={career.streetWinRate} getValue={s=>`${s.surfWinRate.STREET}%`} getLabel={()=>'aproveitamento no Asfalto'} />
      </div>

      <RSec icon="•" title="Veludo" color={RC.pink} />
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
        <RBlock icon="•" title="MAIS TÍTULOS · VELUDO" color={RC.pink} top3={career.carpetTitles} getValue={s=>s.surfTitles.CARPET??0} getLabel={()=>'títulos no Veludo'} />
        <RBlock icon="•" title="MAIS VITÓRIAS · VELUDO" color={RC.pink} top3={career.carpetWins} getValue={s=>s.surfWins.CARPET??0} getLabel={()=>'vitórias no Veludo'} />
        <RBlock icon="•" title="MELHOR WIN RATE · VELUDO" color={RC.pink} top3={career.carpetWinRate} getValue={s=>`${s.surfWinRate.CARPET}%`} getLabel={()=>'aproveitamento no Veludo'} />
      </div>
    </div>
  );
}

function RecordPartidasTab({ records }) {
  const matches = records.legendary?.matches ?? [];
  const featured = records.legendary?.pressure?.[0] ?? records.legendary?.longest?.[0];
  const lists = [
    { title:'AS MAIS LONGAS', items:records.legendary?.longest ?? [], value:m=>`${m.totalGames} games` },
    { title:'MAIOR PRESSÃO', items:records.legendary?.pressure ?? [], value:m=>m.tiebreaks ? `${m.tiebreaks} tiebreak${m.tiebreaks>1?'s':''}` : 'alta tensão' },
    { title:'MAIORES RALLIES', items:records.legendary?.rallies ?? [], value:m=>`${m.maxRally} bolas` },
  ];
  const line = m => `${m.winner?.name ?? 'Vencedor'} d. ${m.loser?.name ?? 'adversário'} · ${m.score || 'placar registrado'}`;
  return <div style={{ display:'flex', flexDirection:'column' }}>
    <RIntro eyebrow="memória do circuito" title="Partidas que ficaram" text="O almanaque agora guarda as partidas, não apenas os totais: placares apertados, pressão, rallies e noites que mudaram um torneio." color={RC.gold} />
    {!featured ? <div style={{ padding:'24px 16px', border:`1px solid ${RC.border}`, background:RC.bg, fontFamily:T.body, color:RC.dim }}>A primeira partida concluída passa a morar aqui. O arquivo começa a contar a própria história.</div> : <>
      <div style={{ padding:'20px', border:`1px solid ${RC.gold}66`, background:`${RC.gold}0A`, marginBottom:18 }}>
        <div style={{ fontFamily:T.mono, fontSize:8, color:RC.gold, letterSpacing:'.24em', marginBottom:10 }}>PARTIDA EM DESTAQUE · {featured.tournamentName?.toUpperCase()} · {featured.year}</div>
        <div style={{ fontFamily:T.disp, fontSize:28, color:T.white, lineHeight:1.05 }}>{line(featured)}</div>
        <div style={{ fontFamily:T.body, color:T.dim, marginTop:10 }}>Foram {featured.totalGames} games {featured.tiebreaks ? `e ${featured.tiebreaks} tiebreak${featured.tiebreaks>1?'s':''}` : ''} numa partida que ficou marcada no circuito.</div>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10 }}>
        {lists.map(section => <div key={section.title} style={{ border:`1px solid ${RC.border}`, background:RC.bg, padding:'12px' }}><div style={{ fontFamily:T.mono, fontSize:8, color:RC.dim, letterSpacing:'.18em', marginBottom:10 }}>{section.title}</div>{section.items.slice(0,4).map(m=><div key={m.key} style={{ padding:'8px 0', borderTop:`1px solid ${RC.border}`, fontFamily:T.body, fontSize:12, color:T.dim }}><div style={{ color:T.white }}>{line(m)}</div><div style={{ fontFamily:T.mono, fontSize:8, color:RC.gold, marginTop:3 }}>{section.value(m)} · {m.tournamentName}</div></div>)}</div>)}
      </div>
    </>}
  </div>;
}

function RecordDuelosTab({ state }) {
  const rivalries = Array.from(state?.rivalrySystem?.rivalries?.values?.() ?? [])
    .filter(r => (r?.totalMatches ?? 0) > 0)
    .sort((a, b) => {
      const intensityDiff = (b?.intensity ?? 0) - (a?.intensity ?? 0);
      if (intensityDiff !== 0) return intensityDiff;
      return (b?.totalMatches ?? 0) - (a?.totalMatches ?? 0);
    });

  const allPlayers = [
    ...(state?.tourPlayers ?? []),
    ...(state?.retiredPlayers ?? []),
    ...(state?.prospects ?? []),
  ];
  const playerMap = new Map(allPlayers.map(p => [p.id, p]));
  const recordedDuels = Object.values((state?.recordsStore?.matchRecords ?? []).reduce((acc, m) => {
    const ids = [m.winnerId, m.loserId].sort();
    const key = ids.join('__');
    const d = acc[key] ?? { key, p1Id:ids[0], p2Id:ids[1], p1Wins:0, p2Wins:0, totalMatches:0, intensity:0, status:'EM FORMAÇÃO', type:'H2H' };
    if (m.winnerId === d.p1Id) d.p1Wins++; else d.p2Wins++;
    d.totalMatches++;
    d.intensity += (m.tiebreaks ?? 0) * .22 + (m.heat ?? 0) / 500 + (m.totalGames ?? 0) / 100;
    acc[key] = d;
    return acc;
  }, {}));
  const sourceDuels = rivalries.length ? rivalries : recordedDuels;

  const duels = sourceDuels.sort((a,b)=>(b.intensity??0)-(a.intensity??0) || (b.totalMatches??0)-(a.totalMatches??0)).slice(0, 12).map((r) => {
    const p1 = playerMap.get(r.p1Id) ?? { id: r.p1Id, name: `#${r.p1Id}` };
    const p2 = playerMap.get(r.p2Id) ?? { id: r.p2Id, name: `#${r.p2Id}` };
    const total = r.totalMatches ?? 0;
    const p1Wins = r.p1Wins ?? 0;
    const p2Wins = r.p2Wins ?? 0;
    const leader = p1Wins >= p2Wins ? p1 : p2;
    const leadWins = Math.max(p1Wins, p2Wins);
    const trailWins = Math.min(p1Wins, p2Wins);
    return {
      key: r.key,
      p1,
      p2,
      total,
      status: r.status ?? 'BREWING',
      type: r.type ?? 'CLASSIC',
      narrative: r.narrative ?? '',
      leader,
      score: `${leadWins}-${trailWins}`,
      intensity: Math.round((r.intensity ?? 0) * 100),
    };
  });

  return (
    <div style={{ display:'flex', flexDirection:'column' }}>
      <RIntro eyebrow="confrontos diretos" title="Duelos e rivalidades ativas" text="Aqui entram os maiores head-to-head do circuito: quem domina, quem equilibra e quais confrontos já viraram narrativa de era." color={RC.purple} />
      {duels.length === 0 ? (
        <div style={{ marginTop:8, padding:'18px 16px', border:`1px solid ${RC.border}`, background:RC.bg, fontFamily:T.mono, fontSize:9, color:RC.dim, letterSpacing:'.12em', textTransform:'uppercase' }}>
          Ainda não há confrontos registrados. Assim que o primeiro torneio terminar, os head-to-head começam a ganhar memória aqui — sem esperar a rivalidade “graduar”.
        </div>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
          {duels.map((d) => (
            <div key={d.key} style={{ border:`1px solid ${RC.border}`, background:'rgba(255,255,255,.02)', padding:'12px 14px' }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
                <div style={{ fontFamily:T.disp, fontSize:18, color:T.white, letterSpacing:'.03em', lineHeight:1 }}>
                  {d.p1.name} vs {d.p2.name}
                </div>
                <div style={{ fontFamily:T.mono, fontSize:8, color:RC.purple, letterSpacing:'.16em', textTransform:'uppercase' }}>
                  {d.total} duelos
                </div>
              </div>
              <div style={{ display:'flex', alignItems:'baseline', gap:8, marginBottom:6 }}>
                <div style={{ fontFamily:T.disp, fontSize:26, color:RC.gold, lineHeight:1 }}>{d.score}</div>
                <div style={{ fontFamily:T.mono, fontSize:8, color:RC.dim, letterSpacing:'.12em', textTransform:'uppercase' }}>
                  líder: {d.leader.name}
                </div>
              </div>
              <div style={{ fontFamily:T.mono, fontSize:8, color:RC.dim, letterSpacing:'.12em', textTransform:'uppercase' }}>
                {d.type} · {d.status} · intensidade {d.intensity}%
              </div>
              {d.narrative ? (
                <div style={{ marginTop:8, fontFamily:T.body, fontSize:12, color:T.dim, lineHeight:1.55 }}>
                  {d.narrative}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// — MAIN RecordesView —
function RecordesView({ state }) {
  const [tab, setTab] = useState('legado');
  const records = useMemo(() => {
    try { return computeTennisRecords(state); } catch(e) { return null; }
  }, [state]);

  const tabs = [
    { id:'legado',     label:'LEGADO',      color:RC.gold   },
    { id:'temporada',  label:'TEMPORADA',   color:RC.cyan   },
    { id:'execucao',   label:'EXECUÇÃO',    color:RC.red    },
    { id:'partidas',   label:'PARTIDAS',    color:RC.gold   },
    { id:'duelos',     label:'DUELOS',      color:RC.purple },
    { id:'superficie', label:'SUPERFÍCIES', color:RC.cyan   },
    { id:'prospects',  label:'PROSPECTS',   color:'#FF7043' },
  ];

  return (
    <div style={{ animation:'bu-in .4s ease both' }}>
      <div style={{ padding:'32px 40px 0', borderBottom:'1px solid rgba(255,255,255,.06)' }}>
        <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', paddingBottom:0, marginBottom:0 }}>
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
              <div style={{ width:24, height:2, background:T.clay }} />
              <span style={{ fontFamily:T.mono, fontSize:9, letterSpacing:'.44em', color:T.clay, textTransform:'uppercase' }}>MODO UNIVERSO</span>
            </div>
            <div style={{ fontFamily:T.disp, fontSize:'clamp(40px,4.5vw,64px)', letterSpacing:'.04em', color:T.white, textTransform:'uppercase', lineHeight:.95, marginBottom:20 }}>
              Recordes<br/><span style={{ opacity:.3 }}>Históricos</span>
            </div>
            <div style={{ fontFamily:T.body, fontSize:13, color:T.dim, maxWidth:720, lineHeight:1.7, marginBottom:18 }}>
              Um almanaque vivo do circuito: o que uma carreira acumulou, o que está acontecendo agora e as partidas que viraram memória.
            </div>
          </div>
          <div style={{ fontFamily:T.mono, fontSize:8, color:T.faint, letterSpacing:'.24em', alignSelf:'center', paddingBottom:20, textTransform:'uppercase' }}>
            marcas vivas · histórias · superfícies · gerações
          </div>
        </div>
        <div style={{ display:'flex', gap:0 }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              background: tab===t.id ? `${t.color}12` : 'transparent',
              borderTop:'none', borderLeft:'none', borderRight:'none',
              borderBottom: tab===t.id ? `3px solid ${t.color}` : '3px solid transparent',
              outline:'none', cursor:'pointer',
              color: tab===t.id ? t.color : RC.dim,
              fontFamily:T.mono, fontSize:9, fontWeight:700, letterSpacing:'.24em',
              padding:'12px 32px', transition:'all .15s', textTransform:'uppercase',
            }}>{t.label}</button>
          ))}
        </div>
      </div>

      <div style={{ padding:'32px 40px' }}>
        {!records ? (
          <div style={{ textAlign:'center', padding:'80px 0', fontFamily:T.mono, fontSize:11, color:RC.vdim, letterSpacing:'.3em' }}>
            NENHUM DADO DISPONÍVEL — SIMULE TORNEIOS PRIMEIRO
          </div>
        ) : (
          <>
            {tab==='legado'     && <RecordLegadoTab     records={records} />}
            {tab==='temporada'  && <RecordTemporadaTab  records={records} />}
            {tab==='execucao'   && <RecordExecucaoTab   records={records} />}
            {tab==='partidas'   && <RecordPartidasTab    records={records} />}
            {tab==='duelos'     && <RecordDuelosTab     state={state} />}
            {tab==='superficie' && <RecordSuperficieTab records={records} />}
            {tab==='prospects'  && <RecordJuniorsTab  records={records} state={state} />}
          </>
        )}
      </div>
    </div>
  );
}

// """"""""""""""""""""""""""""""""""""""""""""""""""""""""""""•""""""
// LESÕES VIEW
// """"""""""""""""""""""""""""""""""""""""""""""""""""""""""""•""""""
const INJURY_TYPE_LABELS = {
  WRIST:      { label: 'Pulso',          icon: '✚' },
  ELBOW:      { label: 'Cotovelo',       icon: '✚' },
  SHOULDER:   { label: 'Ombro',          icon: '✚' },
  BACK:       { label: 'Lombar',         icon: '✚' },
  KNEE:       { label: 'Joelho',         icon: '✚' },
  ANKLE:      { label: 'Tornozelo',      icon: '✚' },
  HAMSTRING:  { label: 'Post. da Coxa',  icon: '✚' },
  ABDOMINAL:  { label: 'Abdominal',      icon: '✚' },
};

const INJURY_GRADE_META = {
  1: { label: 'Leve',     color: '#66BB6A', bg: 'rgba(102,187,106,.12)' },
  2: { label: 'Moderada', color: '#FFCA28', bg: 'rgba(255,202,40,.12)'  },
  3: { label: 'Grave',    color: '#FF7043', bg: 'rgba(255,112,67,.12)'  },
  4: { label: 'Cirurgia', color: '#EF5350', bg: 'rgba(239,83,80,.14)'   },
};

function LesõesView({ state }) {
  const allPlayers = [...(state.tourPlayers ?? []), ...(state.prospects ?? [])];
  const rankMap    = Object.fromEntries(
    (state.rankingStore?.ranked ?? []).map(e => [e.playerId, e.position])
  );

  const injured = allPlayers
    .filter(p => p.injury && !p.retired)
    .map(p => ({ ...p, _rank: rankMap[p.id] ?? 999 }))
    .sort((a, b) => a._rank - b._rank);

  const hasInjured = injured.length > 0;

  const summary = { 1: 0, 2: 0, 3: 0, 4: 0 };
  injured.forEach(p => { summary[p.injury.grade] = (summary[p.injury.grade] ?? 0) + 1; });

  return (
    <div style={{ padding: '32px 40px', maxWidth: 1100, margin: '0 auto', animation: 'bu-in .35s ease' }}>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, marginBottom: 28 }}>
        <h2 style={{ fontFamily: T.disp, fontSize: 38, letterSpacing: '.06em', color: T.white, margin: 0 }}>
          ENFERMARIA
        </h2>
        <span style={{ fontFamily: T.mono, fontSize: 10, color: T.dim, letterSpacing: '.15em' }}>
          LESÕES ATIVAS · T.{state.year}
        </span>
      </div>

      {hasInjured && (
        <div style={{ display: 'flex', gap: 10, marginBottom: 32, flexWrap: 'wrap' }}>
          <div style={{
            fontFamily: T.mono, fontSize: 11, color: T.dim,
            padding: '6px 14px', border: `1px solid ${T.border}`, borderRadius: 4, letterSpacing: '.1em',
          }}>
            {injured.length} JOGADOR{injured.length !== 1 ? 'ES' : ''} FORA
          </div>
          {[4, 3, 2, 1].map(g => summary[g] > 0 && (
            <div key={g} style={{
              fontFamily: T.mono, fontSize: 10, letterSpacing: '.1em',
              padding: '6px 12px', borderRadius: 4,
              color: INJURY_GRADE_META[g].color,
              background: INJURY_GRADE_META[g].bg,
              border: `1px solid ${INJURY_GRADE_META[g].color}33`,
            }}>
              {summary[g]}▶ {INJURY_GRADE_META[g].label.toUpperCase()}
            </div>
          ))}
        </div>
      )}

      {!hasInjured && (
        <div className="ui-empty-state" style={{ minHeight: 220 }}>
          <div className="ui-empty-kicker">Enfermaria</div>
          <div className="ui-empty-title" style={{ fontSize: 28 }}>Enfermaria vazia</div>
          <div className="ui-empty-copy">Nenhum jogador tem lesão ativa neste momento. O circuito segue inteiro.</div>
        </div>
      )}

      {hasInjured && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {injured.map((player, idx) => {
            const inj       = player.injury;
            const grade     = INJURY_GRADE_META[inj.grade] ?? INJURY_GRADE_META[1];
            const type      = INJURY_TYPE_LABELS[inj.type] ?? { label: inj.type ?? 'Lesão', icon: '✚' };
            const rank      = player._rank;
            const slots     = inj.slotsRemaining ?? 0;
            const isSurgery = inj.grade === 4;
            const isPlaying = inj.grade === 1 && slots === 0;
            const photo     = typeof getPlayerPhoto === 'function' ? getPlayerPhoto(player.id) : null;

            const statusText = isSurgery
              ? `Cirurgia — fora por ${slots} torneio${slots !== 1 ? 's' : ''}`
              : isPlaying
              ? 'Jogando com restrições'
              : slots === 0 ? 'Retorno próximo'
              : slots === 1 ? 'Fora do próximo torneio'
              : `Fora por ${slots} torneio${slots !== 1 ? 's' : ''}`;

            const maxSlots = isSurgery ? 30 : inj.grade === 3 ? 12 : inj.grade === 2 ? 4 : 1;
            const barPct   = isPlaying ? 15 : Math.min(100, Math.round((slots / maxSlots) * 100));

            return (
              <div key={player.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '52px 1fr auto',
                  alignItems: 'center',
                  background: T.bgCard,
                  border: `1px solid ${T.border}`,
                  borderLeft: `3px solid ${grade.color}`,
                  borderRadius: 6,
                  padding: '14px 20px 14px 16px',
                  animation: `bu-wipe .25s ease ${idx * 0.04}s both`,
                  cursor: 'default',
                  transition: 'background .15s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = T.bgHover}
                onMouseLeave={e => e.currentTarget.style.background = T.bgCard}
              >
                {/* Rank */}
                <div style={{ textAlign: 'center' }}>
                  <div style={{
                    fontFamily: T.disp, fontSize: 22, lineHeight: 1,
                    color: rank <= 10 ? T.gold : rank <= 32 ? T.dim : T.faint,
                  }}>
                    {rank <= 900 ? `#${rank}` : '—'}
                  </div>
                </div>

                {/* Info */}
                <div style={{ paddingLeft: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                    {photo ? (
                      <img src={photo} alt="" style={{
                        width: 32, height: 32, borderRadius: '50%',
                        objectFit: 'cover', border: `2px solid ${grade.color}44`, flexShrink: 0,
                      }} />
                    ) : (
                      <div style={{
                        width: 32, height: 32, borderRadius: '50%',
                        background: `${grade.color}20`, border: `2px solid ${grade.color}44`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0, fontFamily: T.disp, fontSize: 12, color: grade.color,
                      }}>
                        {(player.name ?? '?')[0]}
                      </div>
                    )}
                    <div>
                      <div style={{ fontFamily: T.cond, fontWeight: 700, fontSize: 17, color: T.white, lineHeight: 1.1 }}>
                        {player.name}
                      </div>
                      <div style={{ fontFamily: T.mono, fontSize: 9, color: T.faint, letterSpacing: '.12em', marginTop: 1 }}>
                        {player.nationality ?? player.country ?? ''}
                        {player.age ? ` · ${player.age} anos` : ''}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <span style={{
                      fontFamily: T.mono, fontSize: 9, letterSpacing: '.12em',
                      color: grade.color, background: grade.bg,
                      border: `1px solid ${grade.color}33`,
                      padding: '2px 8px', borderRadius: 3,
                    }}>
                      {type.icon} {type.label.toUpperCase()} · {grade.label.toUpperCase()}
                    </span>
                    <span style={{ fontFamily: T.body, fontSize: 12, color: T.dim }}>
                      {statusText}
                    </span>
                  </div>

                  {!isPlaying && slots > 0 && (
                    <div style={{
                      marginTop: 10, height: 3, borderRadius: 2,
                      background: T.ghost, overflow: 'hidden', width: '100%', maxWidth: 280,
                    }}>
                      <div style={{
                        height: '100%', borderRadius: 2,
                        width: `${barPct}%`,
                        background: grade.color, opacity: .7,
                        animation: 'bu-bar .5s ease both', transformOrigin: 'left',
                      }} />
                    </div>
                  )}
                </div>

                {/* Grade badge */}
                <div style={{ textAlign: 'right' }}>
                  <div style={{
                    fontFamily: T.disp, fontSize: 28, lineHeight: 1,
                    color: grade.color, textShadow: `0 0 20px ${grade.color}66`,
                  }}>
                    {isSurgery ? 'SIM' : inj.grade}
                  </div>
                  <div style={{ fontFamily: T.mono, fontSize: 8, color: grade.color, letterSpacing: '.12em', opacity: .7, marginTop: 2 }}>
                    GRAU
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function RTDView({ state }) {
  const year = state?.year ?? 2025;
  const [sort, setSort] = useState({ key: 'seasonDelta', dir: 'desc' });
  const [selectedId, setSelectedId] = useState(null);
  const fmtAge = (age) => {
    const n = Number(age);
    return Number.isFinite(n) ? `${Math.floor(n)} anos` : 'idade nao registrada';
  };
  const attrLabel = (key) => ({
    velocidade: 'Velocidade',
    explosividade: 'Explosividade',
    resistencia: 'Resistencia',
    defesa: 'Defesa',
    fhPotencia: 'FH Potencia',
    fhControle: 'FH Controle',
    bhPotencia: 'BH Potencia',
    bhControle: 'BH Controle',
    topspin: 'Topspin',
    slice: 'Slice',
    saqueForca: 'Saque Forca',
    saquePrecisao: 'Saque Precisao',
    devolucao: 'Devolucao',
    volley: 'Volley',
    smash: 'Smash',
    leitura: 'Leitura',
    visaoTatica: 'Visao Tatica',
    mentalidade: 'Mentalidade',
    regularidade: 'Regularidade',
    recuperacao: 'Recuperacao',
    adaptacao: 'Adaptacao',
  }[key] ?? String(key).replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase()));
  const attrChangesFor = (player, ledger) => {
    const attrs = player?.attrs ?? {};
    const seasonDelta = ledger?.seasonAttrDelta;
    const latestSeason = [...(player?._seasonHistory ?? [])].reverse().find(h => h.year === year || h.year === year + 1);
    const rawDelta = seasonDelta && Object.keys(seasonDelta).length
      ? seasonDelta
      : latestSeason?.attrChanges && Object.keys(latestSeason.attrChanges).length
        ? latestSeason.attrChanges
        : player?._devState?.attrGrowthAccum ?? {};
    return Object.entries(rawDelta ?? {})
      .map(([key, delta]) => ({
        key,
        label: attrLabel(key),
        delta: Number(delta) || 0,
        current: Number(attrs[key] ?? 0),
      }))
      .filter(item => Math.abs(item.delta) >= 0.01)
      .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
  };
  const baseRows = useMemo(() => {
    return [...(state?.tourPlayers ?? [])]
      .map(player => {
        const currentOverall = overallRating(player.attrs ?? {});
        const ledger = player.developmentLedger ?? {};
        const debutOverall = ledger.debutOverall ?? player._proDebutOverall ?? player._ovrSeed ?? currentOverall;
        const seasonStartOverall = ledger.currentYear === year
          ? (ledger.seasonStartOverall ?? currentOverall)
          : currentOverall;
        const seasonDelta = ledger.currentYear === year
          ? (ledger.seasonDelta ?? (currentOverall - seasonStartOverall))
          : 0;
        const careerDelta = ledger.careerDelta ?? (currentOverall - debutOverall);
        const lastMonthDelta = ledger.currentYear === year ? (ledger.lastMonthDelta ?? 0) : 0;
        const attrChanges = attrChangesFor(player, ledger);
        const upCount = attrChanges.filter(a => a.delta > 0).length;
        const downCount = attrChanges.filter(a => a.delta < 0).length;
        return { player, currentOverall, debutOverall, seasonDelta, careerDelta, lastMonthDelta, attrChanges, upCount, downCount };
      });
  }, [state?.tourPlayers, year]);
  const rows = useMemo(() => {
    const dir = sort.dir === 'asc' ? 1 : -1;
    const valueOf = (row) => {
      if (sort.key === 'rank') return row.player.rankPosition ?? 999;
      if (sort.key === 'name') return row.player.name ?? '';
      if (sort.key === 'currentOverall') return row.currentOverall;
      if (sort.key === 'seasonDelta') return row.seasonDelta;
      if (sort.key === 'careerDelta') return row.careerDelta;
      if (sort.key === 'debutOverall') return row.debutOverall;
      if (sort.key === 'lastMonthDelta') return row.lastMonthDelta;
      if (sort.key === 'upCount') return row.upCount;
      if (sort.key === 'downCount') return row.downCount;
      return 0;
    };
    return [...baseRows].sort((a, b) => {
      const av = valueOf(a), bv = valueOf(b);
      if (typeof av === 'string' || typeof bv === 'string') return String(av).localeCompare(String(bv)) * dir;
      return ((av > bv ? 1 : av < bv ? -1 : 0) * dir) || ((a.player.rankPosition ?? 999) - (b.player.rankPosition ?? 999));
    });
  }, [baseRows, sort]);
  const selectedRow = rows.find(r => r.player.id === selectedId) ?? rows[0] ?? null;

  const fmtDelta = (value) => {
    const n = Number(value) || 0;
    if (Math.abs(n) < 0.05) return '0.0';
    return `${n > 0 ? '+' : ''}${n.toFixed(1)}`;
  };
  const deltaColor = (value) => value > 0.05 ? '#7FDBB6' : value < -0.05 ? '#FF8A80' : 'rgba(242,237,228,.42)';
  const biggestRise = [...baseRows].filter(r => r.seasonDelta > 0).sort((a, b) => b.seasonDelta - a.seasonDelta).slice(0, 3);
  const biggestFall = [...baseRows].filter(r => r.seasonDelta < 0).sort((a, b) => a.seasonDelta - b.seasonDelta).slice(0, 3);
  const setSortKey = (key) => setSort(prev => ({ key, dir: prev.key === key && prev.dir === 'desc' ? 'asc' : 'desc' }));
  const SortHead = ({ id, children }) => (
    <button onClick={() => setSortKey(id)} style={{
      background:'transparent', border:'none', padding:0, textAlign:'left', cursor:'pointer',
      fontFamily:T.mono, fontSize:7.5, color:sort.key === id ? T.gold : 'rgba(242,237,228,.38)',
      letterSpacing:'.16em', textTransform:'uppercase',
    }}>
      {children} {sort.key === id ? (sort.dir === 'desc' ? '↓' : '↑') : ''}
    </button>
  );
  const gains = selectedRow?.attrChanges?.filter(a => a.delta > 0).sort((a, b) => b.delta - a.delta) ?? [];
  const losses = selectedRow?.attrChanges?.filter(a => a.delta < 0).sort((a, b) => a.delta - b.delta) ?? [];
  const strongest = Object.entries(selectedRow?.player?.attrs ?? {})
    .map(([key, value]) => ({ key, label: attrLabel(key), value: Number(value) || 0 }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  return (
    <div style={{ padding:'28px clamp(18px,3vw,42px)', animation:'bu-in .35s ease both' }}>
      <div style={{ display:'flex', alignItems:'end', justifyContent:'space-between', gap:18, marginBottom:22 }}>
        <div>
          <div style={{ fontFamily:T.mono, fontSize:8, color:T.gold, letterSpacing:'.34em', textTransform:'uppercase', marginBottom:8 }}>
            RTD · REAL TIME DEVELOPMENT
          </div>
          <div style={{ fontFamily:T.disp, fontSize:'clamp(34px,5vw,72px)', color:T.white, letterSpacing:'.04em', lineHeight:.9, textTransform:'uppercase' }}>
            Evolucao viva
          </div>
          <div style={{ fontFamily:T.body, fontSize:13, color:'rgba(242,237,228,.52)', marginTop:10, maxWidth:720, lineHeight:1.6 }}>
            Quanto cada jogador ganhou ou perdeu de overall nesta temporada, quanto mudou desde a estreia profissional e com que overall entrou no circuito.
          </div>
        </div>
        <div style={{ fontFamily:T.mono, fontSize:8, color:'rgba(242,237,228,.35)', letterSpacing:'.18em', textTransform:'uppercase' }}>
          Ano {year} · {rows.length} jogadores
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(2,minmax(0,1fr))', gap:12, marginBottom:18 }}>
        <RTDHighlight title="Maiores saltos da temporada" rows={biggestRise} color="#7FDBB6" fmtDelta={fmtDelta} />
        <RTDHighlight title="Maiores quedas da temporada" rows={biggestFall} color="#FF8A80" fmtDelta={fmtDelta} />
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'minmax(0,1.35fr) minmax(360px,.65fr)', gap:16, alignItems:'start' }}>
        <div style={{ border:'1px solid rgba(255,255,255,.07)', background:'rgba(255,255,255,.018)', overflow:'hidden' }}>
          <div style={{ display:'grid', gridTemplateColumns:'64px 1.8fr repeat(6, minmax(82px,.62fr))', padding:'10px 14px', borderBottom:'1px solid rgba(255,255,255,.07)' }}>
            <SortHead id="rank">Rank</SortHead><SortHead id="name">Jogador</SortHead><SortHead id="currentOverall">OVR</SortHead><SortHead id="seasonDelta">Temp.</SortHead><SortHead id="lastMonthDelta">Mês</SortHead><SortHead id="careerDelta">Carreira</SortHead><SortHead id="upCount">Up</SortHead><SortHead id="downCount">Down</SortHead>
          </div>
          <div style={{ maxHeight:'62vh', overflow:'auto' }}>
            {rows.map((row, idx) => {
              const active = row.player.id === selectedRow?.player?.id;
              return (
                <div key={row.player.id} style={{
                  display:'grid', gridTemplateColumns:'64px 1.8fr repeat(6, minmax(82px,.62fr))',
                  alignItems:'center', padding:'11px 14px', borderBottom:'1px solid rgba(255,255,255,.045)',
                  background:active ? 'rgba(232,200,74,.07)' : idx % 2 ? 'rgba(255,255,255,.012)' : 'transparent',
                  borderLeft:active ? `3px solid ${T.gold}` : '3px solid transparent',
                }}>
                  <div style={{ fontFamily:T.mono, fontSize:10, color:'rgba(242,237,228,.28)' }}>#{row.player.rankPosition ?? '-'}</div>
                  <button onClick={() => setSelectedId(row.player.id)} style={{ display:'flex', alignItems:'center', gap:10, minWidth:0, background:'transparent', border:'none', padding:0, textAlign:'left', cursor:'pointer' }}>
                    <PlayerAvatar player={row.player} size={30} />
                    <div style={{ minWidth:0 }}>
                      <div style={{ fontFamily:T.cond, fontSize:16, color:active ? T.gold : T.white, fontWeight:800, textTransform:'uppercase', letterSpacing:'.04em', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{row.player.name}</div>
                      <div style={{ fontFamily:T.mono, fontSize:7, color:'rgba(242,237,228,.25)', letterSpacing:'.14em' }}>{row.player.nationality ?? '--'} · {fmtAge(row.player.age)}</div>
                    </div>
                  </button>
                  <div style={{ fontFamily:T.disp, fontSize:24, color:T.white }}>{row.currentOverall.toFixed(1)}</div>
                  <div style={{ fontFamily:T.disp, fontSize:24, color:deltaColor(row.seasonDelta) }}>{fmtDelta(row.seasonDelta)}</div>
                  <div style={{ fontFamily:T.disp, fontSize:24, color:deltaColor(row.lastMonthDelta) }}>{fmtDelta(row.lastMonthDelta)}</div>
                  <div style={{ fontFamily:T.disp, fontSize:24, color:deltaColor(row.careerDelta) }}>{fmtDelta(row.careerDelta)}</div>
                  <div style={{ fontFamily:T.disp, fontSize:22, color:'#7FDBB6' }}>{row.upCount}</div>
                  <div style={{ fontFamily:T.disp, fontSize:22, color:'#FF8A80' }}>{row.downCount}</div>
                </div>
              );
            })}
          </div>
        </div>

        {selectedRow && (
          <div style={{ border:'1px solid rgba(232,200,74,.18)', background:'linear-gradient(180deg, rgba(232,200,74,.06), rgba(255,255,255,.018))', padding:18, position:'sticky', top:18 }}>
            <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:14 }}>
              <PlayerAvatar player={selectedRow.player} size={46} />
              <div style={{ minWidth:0 }}>
                <div style={{ fontFamily:T.disp, fontSize:30, color:T.gold, lineHeight:1, textTransform:'uppercase' }}>{selectedRow.player.name}</div>
                <div style={{ fontFamily:T.mono, fontSize:8, color:'rgba(242,237,228,.36)', letterSpacing:'.16em', marginTop:4 }}>#{selectedRow.player.rankPosition ?? '--'} · {selectedRow.player.nationality ?? '--'} · OVR {selectedRow.currentOverall.toFixed(1)}</div>
              </div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, marginBottom:16 }}>
              {[['Temporada', selectedRow.seasonDelta], ['Mes', selectedRow.lastMonthDelta], ['Carreira', selectedRow.careerDelta]].map(([label, value]) => (
                <div key={label} style={{ border:'1px solid rgba(255,255,255,.06)', background:'rgba(0,0,0,.18)', padding:'10px 8px' }}>
                  <div style={{ fontFamily:T.mono, fontSize:6.5, color:'rgba(242,237,228,.3)', letterSpacing:'.18em', textTransform:'uppercase' }}>{label}</div>
                  <div style={{ fontFamily:T.disp, fontSize:28, color:deltaColor(value), lineHeight:1, marginTop:5 }}>{fmtDelta(value)}</div>
                </div>
              ))}
            </div>
            <RTDAttrBlock title="Atributos que subiram" rows={gains} color="#7FDBB6" empty="Nenhuma alta registrada ainda." fmtDelta={fmtDelta} />
            <RTDAttrBlock title="Atributos que desceram" rows={losses} color="#FF8A80" empty="Nenhuma queda registrada ainda." fmtDelta={fmtDelta} />
            <div style={{ marginTop:14 }}>
              <div style={{ fontFamily:T.mono, fontSize:7, color:'rgba(242,237,228,.34)', letterSpacing:'.25em', textTransform:'uppercase', marginBottom:10 }}>Top atributos atuais</div>
              {strongest.map(attr => (
                <div key={attr.key} style={{ marginBottom:8 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', gap:8, marginBottom:4 }}>
                    <span style={{ fontFamily:T.cond, fontSize:13, color:T.white, fontWeight:800, textTransform:'uppercase' }}>{attr.label}</span>
                    <span style={{ fontFamily:T.mono, fontSize:10, color:T.gold }}>{attr.value}</span>
                  </div>
                  <div style={{ height:4, background:'rgba(255,255,255,.06)' }}><div style={{ height:'100%', width:`${Math.max(0, Math.min(100, attr.value))}%`, background:T.gold }} /></div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function RTDAttrBlock({ title, rows, color, empty, fmtDelta }) {
  return (
    <div style={{ marginTop:12 }}>
      <div style={{ fontFamily:T.mono, fontSize:7, color, letterSpacing:'.25em', textTransform:'uppercase', marginBottom:8 }}>{title}</div>
      {rows.length ? rows.map(attr => (
        <div key={attr.key} style={{ display:'grid', gridTemplateColumns:'1fr auto auto', gap:10, alignItems:'center', padding:'7px 0', borderBottom:'1px solid rgba(255,255,255,.045)' }}>
          <div style={{ minWidth:0 }}>
            <div style={{ fontFamily:T.cond, fontSize:14, color:T.white, fontWeight:800, textTransform:'uppercase', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{attr.label}</div>
            <div style={{ height:3, background:'rgba(255,255,255,.06)', marginTop:4 }}><div style={{ height:'100%', width:`${Math.max(0, Math.min(100, attr.current))}%`, background:color }} /></div>
          </div>
          <div style={{ fontFamily:T.disp, fontSize:20, color }}>{fmtDelta(attr.delta)}</div>
          <div style={{ fontFamily:T.mono, fontSize:10, color:'rgba(242,237,228,.54)', minWidth:26, textAlign:'right' }}>{Math.round(attr.current)}</div>
        </div>
      )) : (
        <div style={{ fontFamily:T.body, fontSize:12, color:'rgba(242,237,228,.35)', padding:'8px 0' }}>{empty}</div>
      )}
    </div>
  );
}

function RTDHighlight({ title, rows, color, fmtDelta }) {
  return (
    <div style={{ border:`1px solid ${color}22`, background:`linear-gradient(180deg, ${color}10, rgba(255,255,255,.014))`, padding:16, minHeight:120 }}>
      <div style={{ fontFamily:T.mono, fontSize:7, color, letterSpacing:'.25em', textTransform:'uppercase', marginBottom:12 }}>{title}</div>
      {rows.length ? rows.map(row => (
        <div key={row.player.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:10, marginBottom:8 }}>
          <div style={{ fontFamily:T.cond, fontSize:15, color:T.white, fontWeight:800, textTransform:'uppercase', overflow:'hidden', whiteSpace:'nowrap', textOverflow:'ellipsis' }}>{row.player.name}</div>
          <div style={{ fontFamily:T.disp, fontSize:24, color }}>{fmtDelta(row.seasonDelta)}</div>
        </div>
      )) : (
        <div style={{ fontFamily:T.body, fontSize:12, color:'rgba(242,237,228,.38)' }}>Ainda sem variacao registrada nesta temporada.</div>
      )}
    </div>
  );
}

// """"""""""""""""""""""""""""""""""""""""""""""""""""""""""""•""""""
// COMPONENTE PRINCIPAL
// """"""""""""""""""""""""""""""""""""""""""""""""""""""""""""•""""""
function ArquivoVivoView({ state, onOpen }) {
  const completed = Object.keys(state?.tournamentResults ?? {}).length;
  const cards = [
    ['recordes', 'Recordes', 'Marcas que definem a escala do circuito.', '#E8C84A'],
    ['chronicles', 'Crônicas', 'Capítulos e temporadas que merecem ser lembrados.', '#7DD8FF'],
    ['hall-of-fame', 'Hall da Fama', 'Carreiras que já viraram parte da história.', '#FF8A80'],
  ];
  return <div style={{ padding:'clamp(26px,4vw,58px)', maxWidth:1180, margin:'0 auto', animation:'bu-in .35s ease' }}>
    <div style={{ fontFamily:T.mono, fontSize:8, letterSpacing:'.32em', color:T.gold, marginBottom:12 }}>MEMÓRIA DO CIRCUITO · {state?.year}</div>
    <h1 style={{ fontFamily:T.disp, fontSize:'clamp(48px,8vw,104px)', lineHeight:.82, letterSpacing:'.03em', margin:0, color:T.white }}>ARQUIVO<br/><span style={{ color:T.gold }}>VIVO</span></h1>
    <p style={{ maxWidth:620, fontFamily:T.body, fontSize:15, color:T.dim, lineHeight:1.7, margin:'22px 0 34px' }}>O que hoje é resultado, amanhã é memória. Aqui o universo organiza suas eras, seus feitos e as histórias que sobrevivem ao placar.</p>
    <div style={{ display:'grid', gridTemplateColumns:'repeat(3,minmax(0,1fr))', gap:14 }}>
      {cards.map(([id,title,copy,color], index) => <button key={id} onClick={() => onOpen(id)} style={{ textAlign:'left', minHeight:190, padding:22, background:`linear-gradient(145deg, ${color}18, rgba(255,255,255,.02))`, border:`1px solid ${color}55`, cursor:'pointer', color:T.white }}>
        <div style={{ fontFamily:T.mono, fontSize:8, color, letterSpacing:'.18em' }}>0{index+1} · ABRIR</div>
        <div style={{ fontFamily:T.disp, fontSize:36, margin:'34px 0 8px', letterSpacing:'.04em' }}>{title}</div>
        <div style={{ fontFamily:T.body, fontSize:12, color:T.dim, lineHeight:1.5 }}>{copy}</div>
      </button>)}
    </div>
    <div style={{ marginTop:24, fontFamily:T.mono, fontSize:8, color:T.faint, letterSpacing:'.18em' }}>{completed} TORNEIOS JÁ ENTRARAM NO ARQUIVO DESTA TEMPORADA</div>
  </div>;
}

function RadarDevelopmentPanel({ player, year }) {
  const attrLabel = (key) => ({
    velocidade:'Velocidade', explosividade:'Explosividade', resistencia:'Resistência', defesa:'Defesa',
    fhPotencia:'FH potência', fhControle:'FH controle', bhPotencia:'BH potência', bhControle:'BH controle',
    topspin:'Topspin', slice:'Slice', saqueForca:'Saque força', saquePrecisao:'Saque precisão', devolucao:'Devolução',
    volley:'Voleio', smash:'Smash', leitura:'Leitura', visaoTatica:'Visão tática', mentalidade:'Mentalidade',
    regularidade:'Regularidade', recuperacao:'Recuperação', adaptacao:'Adaptação',
  }[key] ?? key);
  const current = overallRating(player?.attrs ?? {});
  const ledger = player?.developmentLedger ?? {};
  const seasonDelta = Number(ledger.seasonDelta ?? 0);
  const careerDelta = Number(ledger.careerDelta ?? (current - (ledger.debutOverall ?? current)));
  const monthly = [...(ledger.history ?? [])]
    .filter(row => Number.isFinite(Number(row?.afterOverall)))
    .slice(-18);
  const chartRows = monthly.length ? monthly : [{ id:'today', afterOverall:current, year, monthIndex:null, delta:0 }];
  const minOvr = Math.floor(Math.min(...chartRows.map(row => Number(row.afterOverall)), current) - 1);
  const maxOvr = Math.ceil(Math.max(...chartRows.map(row => Number(row.afterOverall)), current) + 1);
  const range = Math.max(2, maxOvr - minOvr);
  const chartW = 640, chartH = 156, pad = { left:30, right:12, top:14, bottom:24 };
  const innerW = chartW - pad.left - pad.right, innerH = chartH - pad.top - pad.bottom;
  const points = chartRows.map((row, index) => ({
    ...row,
    x:pad.left + (chartRows.length <= 1 ? innerW / 2 : index / (chartRows.length - 1) * innerW),
    y:pad.top + (1 - ((Number(row.afterOverall) - minOvr) / range)) * innerH,
  }));
  const line = points.map(point => `${point.x},${point.y}`).join(' ');
  const attrDeltas = Object.entries(ledger.seasonAttrDelta ?? ledger.lastAttrDelta ?? {})
    .map(([key, delta]) => ({ key, label:attrLabel(key), delta:Number(delta) || 0, value:Number(player?.attrs?.[key] ?? 0) }))
    .filter(row => Math.abs(row.delta) >= .01)
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
  const rises = attrDeltas.filter(row => row.delta > 0).slice(0, 3);
  const falls = attrDeltas.filter(row => row.delta < 0).slice(0, 3);
  const movements = [...monthly].filter(row => Math.abs(Number(row.delta ?? 0)) >= .01).reverse().slice(0, 6);
  const seasonRows = [...(player?._seasonHistory ?? [])].slice(-5).reverse();
  const delta = (value) => `${value > 0 ? '+' : ''}${Number(value || 0).toFixed(1)}`;
  const tone = (value) => value > .01 ? '#7FDBB6' : value < -.01 ? '#FF8A80' : T.dim;
  const phase = player?.careerTrajectory?.forecast?.label ?? player?.careerTrajectory?.window?.phase?.replaceAll('_', ' ') ?? 'EM DESENVOLVIMENTO';

  return <section style={{ marginTop:20, border:'1px solid rgba(125,216,255,.26)', background:'linear-gradient(145deg,rgba(125,216,255,.055),rgba(255,255,255,.014))', padding:'clamp(16px,2.2vw,24px)' }}>
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'end', gap:16, flexWrap:'wrap', marginBottom:16 }}>
      <div>
        <div style={{ fontFamily:T.mono, fontSize:8, color:'#7DD8FF', letterSpacing:'.23em' }}>EVOLUÇÃO DO JOGADOR · ANO {year}</div>
        <div style={{ fontFamily:T.disp, fontSize:34, color:T.white, lineHeight:1, marginTop:5 }}>DESENVOLVIMENTO</div>
      </div>
      <div style={{ fontFamily:T.mono, fontSize:8, color:T.gold, letterSpacing:'.13em', textTransform:'uppercase' }}>{phase}</div>
    </div>

    <div style={{ display:'grid', gridTemplateColumns:'repeat(4,minmax(110px,1fr))', gap:8 }}>
      {[
        ['OVERALL', current.toFixed(1), T.white],
        ['TEMPORADA', delta(seasonDelta), tone(seasonDelta)],
        ['ÚLTIMO CICLO', delta(Number(ledger.lastMonthDelta ?? 0)), tone(Number(ledger.lastMonthDelta ?? 0))],
        ['CARREIRA', delta(careerDelta), tone(careerDelta)],
      ].map(([label, value, color]) => <div key={label} style={{ padding:'10px 11px', background:'rgba(0,0,0,.17)', border:'1px solid rgba(255,255,255,.06)' }}>
        <div style={{ fontFamily:T.mono, fontSize:6.5, letterSpacing:'.17em', color:T.faint }}>{label}</div>
        <div style={{ fontFamily:T.disp, fontSize:28, lineHeight:1, color, marginTop:6 }}>{value}</div>
      </div>)}
    </div>

    <div style={{ marginTop:16, padding:'12px 10px 4px', background:'rgba(0,0,0,.14)', overflowX:'auto' }}>
      <div style={{ fontFamily:T.mono, fontSize:7, color:T.faint, letterSpacing:'.16em', margin:'0 4px 8px' }}>CURVA DE OVERALL · ÚLTIMOS {chartRows.length} REGISTROS</div>
      <svg viewBox={`0 0 ${chartW} ${chartH}`} style={{ display:'block', minWidth:480, width:'100%', height:'auto' }} role="img" aria-label={`Evolução de overall de ${player?.name ?? 'jogador'}`}>
        {[0, .5, 1].map(step => { const y = pad.top + innerH * step; const value = (maxOvr - range * step).toFixed(0); return <g key={step}><line x1={pad.left} x2={chartW-pad.right} y1={y} y2={y} stroke="rgba(255,255,255,.08)" strokeDasharray="3 4"/><text x={pad.left-6} y={y+3} textAnchor="end" fill="rgba(242,237,228,.38)" fontSize="8" fontFamily="monospace">{value}</text></g>; })}
        {points.length > 1 && <polyline points={line} fill="none" stroke="#7DD8FF" strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round" />}
        {points.map((point, index) => <g key={`${point.year}:${point.monthIndex}:${index}`}><circle cx={point.x} cy={point.y} r="3.7" fill={Number(point.delta) < 0 ? '#FF8A80' : '#7DD8FF'} stroke="#071015" strokeWidth="1.5"/>{index === points.length - 1 && <text x={point.x} y={point.y-9} textAnchor="middle" fill="#F3EFE8" fontSize="9" fontFamily="monospace">{Number(point.afterOverall).toFixed(1)}</text>}</g>)}
      </svg>
    </div>

    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))', gap:14, marginTop:16 }}>
      <div>
        <div style={{ fontFamily:T.mono, fontSize:7, color:'#7FDBB6', letterSpacing:'.18em', marginBottom:7 }}>ATRIBUTOS EM ALTA</div>
        {rises.length ? rises.map(row => <div key={row.key} style={{ display:'grid', gridTemplateColumns:'1fr auto auto', gap:8, padding:'6px 0', borderTop:'1px solid rgba(255,255,255,.06)' }}><span style={{ fontFamily:T.cond, fontWeight:700, color:T.white }}>{row.label}</span><span style={{ fontFamily:T.mono, fontSize:9, color:'#7FDBB6' }}>{delta(row.delta)}</span><span style={{ fontFamily:T.mono, fontSize:9, color:T.dim }}>{Math.round(row.value)}</span></div>) : <div style={{ fontFamily:T.body, fontSize:12, color:T.faint }}>Ainda sem ganho registrado.</div>}
      </div>
      <div>
        <div style={{ fontFamily:T.mono, fontSize:7, color:'#FF8A80', letterSpacing:'.18em', marginBottom:7 }}>ATRIBUTOS EM QUEDA</div>
        {falls.length ? falls.map(row => <div key={row.key} style={{ display:'grid', gridTemplateColumns:'1fr auto auto', gap:8, padding:'6px 0', borderTop:'1px solid rgba(255,255,255,.06)' }}><span style={{ fontFamily:T.cond, fontWeight:700, color:T.white }}>{row.label}</span><span style={{ fontFamily:T.mono, fontSize:9, color:'#FF8A80' }}>{delta(row.delta)}</span><span style={{ fontFamily:T.mono, fontSize:9, color:T.dim }}>{Math.round(row.value)}</span></div>) : <div style={{ fontFamily:T.body, fontSize:12, color:T.faint }}>Nenhuma queda registrada.</div>}
      </div>
      <div>
        <div style={{ fontFamily:T.mono, fontSize:7, color:T.gold, letterSpacing:'.18em', marginBottom:7 }}>MOVIMENTOS DE OVERALL</div>
        {movements.length ? movements.map((row, index) => <div key={`${row.year}:${row.monthIndex}:${index}`} style={{ display:'flex', justifyContent:'space-between', gap:8, padding:'6px 0', borderTop:'1px solid rgba(255,255,255,.06)' }}><span style={{ fontFamily:T.mono, fontSize:8, color:T.faint }}>{row.year}{row.monthIndex != null ? ` · CICLO ${Number(row.monthIndex)+1}` : ''}</span><span style={{ fontFamily:T.mono, fontSize:9, color:tone(Number(row.delta)) }}>{delta(Number(row.delta))} → {Number(row.afterOverall).toFixed(1)}</span></div>) : seasonRows.length ? seasonRows.map(row => <div key={row.year} style={{ display:'flex', justifyContent:'space-between', gap:8, padding:'6px 0', borderTop:'1px solid rgba(255,255,255,.06)' }}><span style={{ fontFamily:T.mono, fontSize:8, color:T.faint }}>{row.year}</span><span style={{ fontFamily:T.mono, fontSize:9, color:tone(Number(row.ovrDelta)) }}>{delta(Number(row.ovrDelta))} → {Number(row.ovr).toFixed(1)}</span></div>) : <div style={{ fontFamily:T.body, fontSize:12, color:T.faint }}>Os movimentos aparecem após o primeiro ciclo de desenvolvimento.</div>}
      </div>
    </div>
  </section>;
}

function RadarLifeTimeline({ player, state }) {
  const timeline = React.useMemo(() => buildFollowedPlayerTimeline(player, state), [player, state]);
  if (!timeline.length) return null;
  return <section style={{ marginTop:20, border:'1px solid rgba(232,200,74,.28)', padding:20, background:'linear-gradient(135deg,rgba(232,200,74,.065),rgba(255,255,255,.012))' }}>
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', gap:12, marginBottom:14 }}>
      <div style={{ fontFamily:T.mono, fontSize:8, letterSpacing:'.24em', color:'#E8C84A' }}>ARQUIVO DE VIDA · {player.name.toUpperCase()}</div>
      <div style={{ fontFamily:T.mono, fontSize:7, color:T.faint }}>{timeline.length} MARCOS</div>
    </div>
    <div style={{ position:'relative', display:'grid', gap:0, paddingLeft:17 }}>
      <div style={{ position:'absolute', left:4, top:5, bottom:5, width:1, background:'rgba(232,200,74,.25)' }} />
      {timeline.map(item => <div key={item.id} style={{ position:'relative', padding:'0 0 12px 14px' }}>
        <span style={{ position:'absolute', left:-1, top:2, width:10, height:10, borderRadius:99, background:item.color, boxShadow:`0 0 0 3px ${item.color}22` }} />
        <div style={{ display:'flex', gap:8, alignItems:'baseline', flexWrap:'wrap' }}>
          <span style={{ fontFamily:T.mono, fontSize:7, color:item.color, letterSpacing:'.14em' }}>{String(item.date.month || 1).padStart(2,'0')}/{item.date.year}</span>
          <span style={{ fontFamily:T.mono, fontSize:7, color:T.faint, letterSpacing:'.13em' }}>{item.kind}</span>
          <strong style={{ fontFamily:T.cond, fontSize:16, color:T.white, textTransform:'uppercase' }}>{item.icon} {item.title}</strong>
        </div>
        {item.text && <div style={{ marginTop:2, fontFamily:T.body, fontSize:12, color:T.dim }}>{item.text}</div>}
        {!!item.impactTags?.length && <div style={{ display:'flex', flexWrap:'wrap', gap:5, marginTop:7 }}>
          {item.impactTags.map(impact => <span
            key={impact.label}
            title={impact.text}
            style={{
              padding:'3px 6px',
              border:`1px solid ${impact.tone === 'good' ? 'rgba(127,219,182,.32)' : 'rgba(255,138,128,.32)'}`,
              background:impact.tone === 'good' ? 'rgba(127,219,182,.08)' : 'rgba(255,138,128,.08)',
              color:impact.tone === 'good' ? '#7FDBB6' : '#FF8A80',
              fontFamily:T.mono,
              fontSize:7,
              letterSpacing:'.08em',
            }}
          >{impact.label}</span>)}
        </div>}
      </div>)}
    </div>
  </section>;
}

function RadarView({ state, dispatch, onOpenProfile }) {
  const [trajectoryPlayerId, setTrajectoryPlayerId] = React.useState(null);
  const [exportingPdf, setExportingPdf] = React.useState(false);
  const reportRef = React.useRef(null);
  const radar = state?.radar ?? { followedPlayerIds: [], matchLog: [], weeklyDigest: [] };
  const followedIds = radar.followedPlayerIds ?? [];
  const allPlayers = [...(state?.tourPlayers ?? []), ...(state?.prospects ?? [])];
  const playerById = new Map(allPlayers.map(player => [player.id, player]));
  const followed = followedIds.map(id => playerById.get(id)).filter(Boolean);
  const trajectoryPlayer = followed.find(player => player.id === trajectoryPlayerId) ?? followed[0] ?? null;
  const suggestions = [...allPlayers]
    .filter(player => !followedIds.includes(player.id))
    .sort((a, b) => (a.rankPosition ?? 9999) - (b.rankPosition ?? 9999))
    .slice(0, 16);
  const setFollowed = (ids) => dispatch?.({ type:'SET_RADAR_FOLLOWED', playerIds:ids });
  const latestDigest = [...(radar.weeklyDigest ?? [])].reverse()
    .find((digest) => digest.entries?.some((entry) => entry.matches > 0 || entry.outcome))
    ?? radar.weeklyDigest?.at(-1)
    ?? null;
  const allRecentMatches = [...(radar.matchLog ?? [])].slice(-40).reverse();
  const allRecentAlerts = [...(radar.alerts ?? [])].slice(-40).reverse();
  const recentYearbook = radar.seasonRecaps?.at(-1) ?? null;
  const recentMatches = trajectoryPlayer
    ? allRecentMatches.filter(match => match.playerAId === trajectoryPlayer.id || match.playerBId === trajectoryPlayer.id).slice(0, 10)
    : [];
  const recentAlerts = trajectoryPlayer
    ? allRecentAlerts.filter(alert => alert.playerIds?.includes(trajectoryPlayer.id)).slice(0, 8)
    : [];
  const selectedDigestEntry = trajectoryPlayer
    ? latestDigest?.entries?.find(entry => entry.playerId === trajectoryPlayer.id) ?? null
    : null;
  const exportFollowedPdf = async () => {
    if (!trajectoryPlayer || !reportRef.current || exportingPdf) return;
    setExportingPdf(true);
    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import('html2canvas'), import('jspdf')]);
      const canvas = await html2canvas(reportRef.current, { scale: 1.7, backgroundColor:'#07100f', useCORS:true, logging:false, windowWidth:reportRef.current.scrollWidth });
      const pdf = new jsPDF({ orientation:'p', unit:'mm', format:'a4', compress:true });
      const margin = 10;
      const pageWidth = 210 - margin * 2;
      const imageHeight = canvas.height * pageWidth / canvas.width;
      const pageHeight = 297 - margin * 2;
      let offset = 0;
      pdf.setFillColor(7, 16, 15);
      pdf.rect(0, 0, 210, 297, 'F');
      while (offset < imageHeight) {
        if (offset > 0) { pdf.addPage(); pdf.setFillColor(7, 16, 15); pdf.rect(0, 0, 210, 297, 'F'); }
        pdf.addImage(canvas.toDataURL('image/png'), 'PNG', margin, margin - offset, pageWidth, imageHeight, undefined, 'FAST');
        offset += pageHeight;
      }
      const safeName = trajectoryPlayer.name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/gi,'-').replace(/^-|-$/g,'').toLowerCase();
      pdf.save(`radar-${safeName}-${state?.worldDate?.year ?? state?.year ?? 'save'}.pdf`);
    } catch (error) {
      console.error('[Radar] falha ao exportar PDF:', error);
      window.alert('Não foi possível gerar o PDF deste dossiê. Tente novamente.');
    } finally { setExportingPdf(false); }
  };

  return <div style={{ maxWidth:1180, margin:'0 auto', padding:'clamp(26px,4vw,56px)', animation:'bu-in .35s ease' }}>
    <div style={{ display:'flex', justifyContent:'space-between', gap:18, alignItems:'end', flexWrap:'wrap', marginBottom:28 }}>
      <div>
        <div style={{ fontFamily:T.mono, fontSize:8, letterSpacing:'.32em', color:T.gold, marginBottom:10 }}>COBERTURA DIRIGIDA · {followed.length}/4</div>
        <h1 style={{ fontFamily:T.disp, fontSize:'clamp(52px,8vw,96px)', lineHeight:.82, letterSpacing:'.03em', margin:0, color:T.white }}>RADAR<br/><span style={{ color:T.gold }}>DO CIRCUITO</span></h1>
      </div>
      <div style={{ maxWidth:370, fontFamily:T.body, fontSize:14, lineHeight:1.65, color:T.dim }}>Os jogos de cada acompanhado são resolvidos pelo Headless completo, mesmo quando o restante do torneio usa simulação rápida.</div>
    </div>

    {followed.length > 0 && <div style={{ display:'flex', gap:10, alignItems:'center', flexWrap:'wrap', margin:'-10px 0 20px', padding:'10px 12px', border:'1px solid rgba(255,255,255,.08)', background:'rgba(255,255,255,.018)' }}>
      <span style={{ fontFamily:T.mono, fontSize:7, color:T.faint, letterSpacing:'.18em' }}>FILTRO DE ALERTAS</span>
      <button onClick={() => dispatch?.({ type:'SET_RADAR_SETTINGS', settings:{ showMatchAlerts: !(radar.settings?.showMatchAlerts !== false) } })} style={{ border:'1px solid rgba(232,200,74,.35)', background:radar.settings?.showMatchAlerts !== false ? 'rgba(232,200,74,.12)' : 'transparent', color:T.white, cursor:'pointer', padding:'6px 9px', fontFamily:T.mono, fontSize:7 }}>PARTIDAS {radar.settings?.showMatchAlerts !== false ? 'ON' : 'OFF'}</button>
      <button onClick={() => dispatch?.({ type:'SET_RADAR_SETTINGS', settings:{ showMajorOnly: !(radar.settings?.showMajorOnly ?? true) } })} style={{ border:'1px solid rgba(125,216,255,.35)', background:radar.settings?.showMajorOnly ?? true ? 'rgba(125,216,255,.12)' : 'transparent', color:T.white, cursor:'pointer', padding:'6px 9px', fontFamily:T.mono, fontSize:7 }}>SÓ GRANDES {radar.settings?.showMajorOnly ?? true ? 'ON' : 'OFF'}</button>
    </div>}

    {followed.length === 0 ? <div style={{ border:'1px solid rgba(232,200,74,.38)', padding:28, background:'linear-gradient(135deg,rgba(232,200,74,.10),rgba(255,255,255,.02))', marginBottom:18 }}>
      <div style={{ fontFamily:T.disp, fontSize:34, color:T.white }}>OBSERVE O CIRCUITO COMO SEMPRE — OU ESCOLHA UMA HISTÓRIA</div>
      <div style={{ marginTop:9, fontFamily:T.body, fontSize:14, color:T.dim, lineHeight:1.65 }}>Com zero nomes, nada muda no Universo. Ao acompanhar alguém, o Radar passa a guardar jogos, momentos e resumos desse jogador.</div>
    </div> : <>
      <section style={{ display:'flex', gap:8, overflowX:'auto', padding:'0 0 12px', marginBottom:8, borderBottom:'1px solid rgba(255,255,255,.10)' }}>
        {followed.map(player => {
          const active = player.id === trajectoryPlayer?.id;
          return <div key={player.id} style={{ display:'flex', flexShrink:0, border:`1px solid ${active ? '#E8C84A88' : 'rgba(255,255,255,.12)'}`, background:active ? 'rgba(232,200,74,.11)' : 'rgba(255,255,255,.018)' }}>
            <button onClick={() => setTrajectoryPlayerId(player.id)} style={{ display:'flex', alignItems:'center', gap:9, border:'none', background:'transparent', color:active ? T.white : T.dim, cursor:'pointer', padding:'9px 10px', textAlign:'left' }}>
              <PlayerAvatar player={player} size={28} />
              <span><span style={{ display:'block', fontFamily:T.mono, fontSize:7, color:active ? T.gold : T.faint, letterSpacing:'.14em' }}>#{player.rankPosition ?? '—'} · RADAR</span><span style={{ display:'block', fontFamily:T.cond, fontSize:16, fontWeight:800, marginTop:2, maxWidth:150, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{player.name}</span></span>
            </button>
            <button onClick={() => setFollowed(followedIds.filter(id => id !== player.id))} title={`Parar de acompanhar ${player.name}`} style={{ border:'none', borderLeft:'1px solid rgba(255,255,255,.08)', background:'transparent', color:T.faint, cursor:'pointer', padding:'0 9px', fontSize:16 }}>×</button>
          </div>;
        })}
      </section>
      {trajectoryPlayer && <div style={{ display:'flex', justifyContent:'space-between', gap:14, alignItems:'end', flexWrap:'wrap', margin:'16px 0 18px' }}>
        <div><div style={{ fontFamily:T.mono, fontSize:8, color:T.gold, letterSpacing:'.22em' }}>DOSSIÊ INDIVIDUAL</div><div style={{ fontFamily:T.disp, fontSize:42, color:T.white, lineHeight:.9, marginTop:6 }}>{trajectoryPlayer.name}</div></div>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
          <button onClick={exportFollowedPdf} disabled={exportingPdf} style={{ border:'1px solid rgba(125,216,255,.46)', background:'rgba(125,216,255,.10)', color:T.white, cursor:exportingPdf?'wait':'pointer', padding:'9px 12px', fontFamily:T.mono, fontSize:8, letterSpacing:'.12em' }}>{exportingPdf ? 'GERANDO PDF...' : 'EXPORTAR PDF'}</button>
          <button onClick={() => onOpenProfile?.(trajectoryPlayer)} style={{ border:'1px solid rgba(232,200,74,.42)', background:'rgba(232,200,74,.08)', color:T.white, cursor:'pointer', padding:'9px 12px', fontFamily:T.mono, fontSize:8, letterSpacing:'.12em' }}>ABRIR PERFIL</button>
        </div>
      </div>}
      <div ref={reportRef} style={{ background:'#07100f', padding:'1px 0' }}>
      {selectedDigestEntry && <section style={{ border:'1px solid rgba(125,216,255,.28)', padding:20, background:'rgba(125,216,255,.045)', marginBottom:20 }}>
        <div style={{ fontFamily:T.mono, fontSize:8, letterSpacing:'.24em', color:'#7DD8FF' }}>ÚLTIMO EPISÓDIO · {latestDigest.tournamentName?.toUpperCase()}</div>
        <div style={{ borderLeft:`2px solid ${selectedDigestEntry.outcome?.round === 'W' || selectedDigestEntry.won ? '#57D38C' : '#D4561E'}`, padding:'2px 0 2px 11px', fontFamily:T.body, fontSize:13, color:T.dim, marginTop:14 }}>
          <strong style={{ color:T.white, fontFamily:T.cond, fontSize:21 }}>{selectedDigestEntry.playerName}</strong>
          <div style={{ marginTop:3, fontFamily:T.mono, fontSize:8, color:selectedDigestEntry.outcome?.round === 'W' ? '#57D38C' : '#7DD8FF', letterSpacing:'.12em' }}>{selectedDigestEntry.outcomeLabel?.toUpperCase()} · #{selectedDigestEntry.rank ?? '—'} {selectedDigestEntry.outcome ? `· +${selectedDigestEntry.outcome.points} PTS` : ''}</div>
          {selectedDigestEntry.campaign?.length > 0 ? <div style={{ marginTop:9, display:'grid', gap:4 }}>{selectedDigestEntry.campaign.map(match => { const won = match.winnerId === selectedDigestEntry.playerId; return <div key={match.id} style={{ display:'grid', gridTemplateColumns:'auto 1fr auto', gap:7, alignItems:'center', fontFamily:T.mono, fontSize:8, color:T.faint }}><span style={{ color:won ? '#57D38C' : '#FF8A80' }}>{won ? 'V' : 'D'}</span><span>{roundLabelCopy(match.roundLabel).toUpperCase()} · {won ? 'AVANÇOU' : 'ELIMINADO'}</span><span style={{ color:T.gold }}>{match.score ?? '—'}</span></div>; })}</div> : <div style={{ marginTop:7, fontSize:12 }}>não entrou nesta chave</div>}
        </div>
      </section>}
      {trajectoryPlayer && <>
        <RadarTrajectory player={trajectoryPlayer} timeline={radar.rankTimeline?.[trajectoryPlayer.id] ?? []} />
        <RadarDevelopmentPanel player={trajectoryPlayer} year={state?.year} />
        <RadarLifeTimeline player={trajectoryPlayer} state={state} />
      </>}
      <section style={{ border:'1px solid rgba(255,255,255,.10)', padding:20, background:'rgba(255,255,255,.018)' }}>
        <div style={{ fontFamily:T.mono, fontSize:8, letterSpacing:'.24em', color:T.faint, marginBottom:14 }}>ÚLTIMAS PARTIDAS COM FIDELIDADE MÁXIMA</div>
        {recentMatches.length ? recentMatches.map(match => <div key={match.id} style={{ display:'grid', gridTemplateColumns:'1fr auto', gap:12, padding:'11px 0', borderTop:'1px solid rgba(255,255,255,.07)' }}><div><span style={{ fontFamily:T.cond, fontSize:17, color:T.white }}>{match.headline}</span><div style={{ fontFamily:T.mono, fontSize:8, color:T.faint, letterSpacing:'.12em', marginTop:4 }}>{match.tournamentName?.toUpperCase()} · {roundLabelCopy(match.roundLabel).toUpperCase()} · HEADLESS</div></div><div style={{ fontFamily:T.mono, fontSize:9, color:T.gold, alignSelf:'center' }}>{match.score || '—'}</div></div>) : <div style={{ fontFamily:T.body, color:T.dim }}>Ainda não houve jogos dos acompanhados nesta temporada.</div>}
      </section>
      {recentAlerts.length > 0 && <section style={{ marginTop:20, border:'1px solid rgba(212,86,30,.28)', padding:20, background:'rgba(212,86,30,.035)' }}>
        <div style={{ fontFamily:T.mono, fontSize:8, letterSpacing:'.24em', color:'#FF9A6A', marginBottom:10 }}>SINAIS QUE O RADAR MARCOU</div>
        {recentAlerts.map(alert => <div key={alert.id} style={{ padding:'9px 0', borderTop:'1px solid rgba(255,255,255,.07)', fontFamily:T.cond, color:T.white, fontSize:17 }}><span style={{ color:'#FF9A6A', fontFamily:T.mono, fontSize:8, marginRight:8 }}>{alert.type.replaceAll('_',' ')}</span>{alert.headline}<span style={{ color:T.faint, fontFamily:T.mono, fontSize:7, marginLeft:8 }}>{alert.tournamentName}</span></div>)}
      </section>}
      {recentYearbook && <section style={{ marginTop:20, border:'1px solid rgba(196,107,255,.35)', padding:20, background:'rgba(196,107,255,.045)' }}>
        <div style={{ fontFamily:T.mono, fontSize:8, letterSpacing:'.24em', color:'#D6A8FF' }}>ARQUIVO DO RADAR · {recentYearbook.year}</div>
        <div style={{ fontFamily:T.disp, color:T.white, fontSize:32, marginTop:8 }}>{recentYearbook.headline}</div>
        <div style={{ display:'flex', gap:12, flexWrap:'wrap', marginTop:14 }}>{recentYearbook.stories?.map(story => <div key={story.playerId} style={{ borderLeft:'2px solid #D6A8FF', paddingLeft:10, color:T.dim, fontFamily:T.body, fontSize:13 }}><strong style={{ color:T.white }}>{story.playerName}</strong> · {story.wins}/{story.matches} vitórias no Radar</div>)}</div>
      </section>}
      </div>
    </>}

    {followed.length < 4 && <section style={{ marginTop:20, border:'1px solid rgba(255,255,255,.10)', padding:20 }}>
      <div style={{ fontFamily:T.mono, fontSize:8, letterSpacing:'.24em', color:T.faint, marginBottom:12 }}>ADICIONAR AO RADAR</div>
      <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>{suggestions.map(player => <button key={player.id} onClick={() => setFollowed([...followedIds, player.id])} style={{ border:'1px solid rgba(255,255,255,.15)', background:'rgba(255,255,255,.025)', color:T.white, cursor:'pointer', padding:'9px 11px', fontFamily:T.cond, fontSize:15 }}>{player.name} <span style={{ color:T.gold, fontFamily:T.mono, fontSize:8 }}>#{player.rankPosition ?? '—'}</span></button>)}</div>
    </section>}
  </div>;
}

export default function BroadcastUniverse({ state, dispatch, onBack, onSimulate, onFastSimulateRange, onViewBracket, simulating = false, simProgress = 0, simMode = 'headless', onSaveGame, onLoadGame, onRestoreAutosave, stopOnBreaking = false, onToggleStopOnBreaking = null }) {
  const [currentTab, setCurrentTab] = useState('geral');
  const [navArea, setNavArea] = useState('agora');
  const [accessibilityOpen, setAccessibilityOpen] = useState(false);
  const [comfortMode, setComfortMode] = useState(() => ({ highContrast:false, reducedMotion:false, spacious:false }));
  const [fastMenuOpen, setFastMenuOpen] = useState(false);
  const [simMenuOpen,  setSimMenuOpen]  = useState(false);
  const [dismissedBreakingId, setDismissedBreakingId] = useState(null);
  const [profilePlayer, setProfilePlayer] = useState(null);
  const followedCount = state?.radar?.followedPlayerIds?.length ?? 0;

  useEffect(() => { injectStyles(); }, []);

  useEffect(() => {
    if (!fastMenuOpen && !simMenuOpen) return;
    const close = () => { setFastMenuOpen(false); setSimMenuOpen(false); };
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [fastMenuOpen, simMenuOpen]);

  const navAreas = [
    { id:'agora', label:'AGORA', tabs:[['geral','Central'], ['imprensa','Cobertura'], ...(followedCount ? [['radar', `Radar ${followedCount}/4`]] : [])] },
    { id:'circuito', label:'CIRCUITO', tabs:[['calendario','Calendário'], ['rankings','Rankings'], ['analytics','Performance']] },
    { id:'pessoas', label:'PESSOAS', tabs:[['tecnicos','Técnicos'], ['rtd','Evolução'], ['lesoes','Enfermaria']] },
    { id:'mercado', label:'MERCADO', tabs:[['empresas','Empresas']] },
    { id:'arquivo', label:'ARQUIVO', tabs:[['arquivo-vivo','Arquivo Vivo'], ['recordes','Recordes'], ['chronicles','Crônicas'], ['eras','Livro das Eras'], ['hall-of-fame','Hall da Fama']] },
  ];
  const utilityTabs = [['analistas','Análises'], ['entrevistas','Entrevistas']];
  const visibleTabs = [...(navAreas.find(area => area.id === navArea)?.tabs ?? []), ...utilityTabs];
  const openTab = (tabId) => {
    const containingArea = navAreas.find(area => area.tabs.some(([id]) => id === tabId));
    if (containingArea) setNavArea(containingArea.id);
    setCurrentTab(tabId);
  };

  const nextT = CALENDAR[state?.calendarIndex];
  const latestBreakingArticle = (state?.newsEngine?.feed ?? []).find(article => article?.type === 'BREAKING') ?? null;
  const latestCircuitShift = state?.latestCircuitShift ?? null;
  const showBreakingOverlay = latestBreakingArticle && latestBreakingArticle.id !== dismissedBreakingId;
  const totalDone = state ? Object.keys(state.tournamentResults).length : 0;
  const totalTournaments = CALENDAR.length;
  const isSeasonDone = state ? state.calendarIndex >= totalTournaments : false;
  const pct = totalTournaments > 0 ? (state?.calendarIndex ?? 0) / totalTournaments : 0;

  // Surface accent for background orbs
  const nextSurf = nextT ? (SURFACE[nextT.surface] ?? SURFACE.HARD) : SURFACE.HARD;
  const accentColor = simulating ? T.grassLight : nextSurf.main;

  return (
    <div className={`bu-screen ${comfortMode.reducedMotion ? 'bu-reduce-motion' : ''}`} style={{ filter:comfortMode.highContrast ? 'contrast(1.16)' : undefined, letterSpacing:comfortMode.spacious ? '.015em' : undefined }}>
      {showBreakingOverlay && (
        <BreakingNewsOverlay
          article={latestBreakingArticle}
          onDismiss={() => setDismissedBreakingId(latestBreakingArticle.id)}
          onOpen={() => {
            setDismissedBreakingId(latestBreakingArticle.id);
            setCurrentTab('geral');
          }}
        />
      )}

      {/* — ANIMATED BACKGROUND LAYERS — */}
      {/* Slow-moving ambient orbs */}
      <div style={{ position:'fixed', inset:0, pointerEvents:'none', zIndex:0, overflow:'hidden' }}>
        {/* Primary orb — surface color */}
        <div style={{
          position:'absolute', top:'-15%', right:'-8%',
          width:700, height:700, borderRadius:'50%',
          background:`radial-gradient(circle, ${accentColor}18 0%, transparent 65%)`,
          filter:'blur(80px)',
          animation:'bu-orb-drift 18s ease-in-out infinite',
          transition:'background 2s ease',
        }} />
        {/* Secondary orb — gold */}
        <div style={{
          position:'absolute', bottom:'-20%', left:'-5%',
          width:600, height:600, borderRadius:'50%',
          background:'radial-gradient(circle, rgba(232,200,74,.07) 0%, transparent 65%)',
          filter:'blur(70px)',
          animation:'bu-orb-drift2 22s ease-in-out infinite',
        }} />
        {/* Subtle deep orb */}
        <div style={{
          position:'absolute', top:'40%', left:'30%',
          width:400, height:400, borderRadius:'50%',
          background:`radial-gradient(circle, ${T.clay}08 0%, transparent 70%)`,
          filter:'blur(90px)',
          animation:'bu-orb-drift 28s ease-in-out infinite reverse',
        }} />
        {/* Court line grid */}
        <div style={{
          position:'absolute', inset:0,
          backgroundImage:'linear-gradient(rgba(255,255,255,.012) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.012) 1px, transparent 1px)',
          backgroundSize:'72px 72px',
          maskImage:'radial-gradient(ellipse 80% 60% at 60% 40%, rgba(0,0,0,.6), transparent)',
          WebkitMaskImage:'radial-gradient(ellipse 80% 60% at 60% 40%, rgba(0,0,0,.6), transparent)',
        }} />
        {/* Scanline */}
        <div style={{ width:'100%', height:1, background:`linear-gradient(90deg,transparent,${accentColor}22,transparent)`, animation:'bu-scan 14s linear infinite', opacity:.5, transition:'background 2s ease' }} />
      </div>

      {/* — TOP BAR — BROADCAST STATION — */}
      <div style={{
        position:'sticky', top:0, zIndex:100,
        background:'rgba(3,5,7,.94)', backdropFilter:'blur(20px)',
        borderBottom:`1px solid rgba(255,255,255,.06)`,
        height:56,
        display:'flex', alignItems:'stretch',
      }}>
        {/* Station ID — left edge */}
        <div style={{
          display:'flex', alignItems:'center', gap:14, padding:'0 22px',
          borderRight:'1px solid rgba(255,255,255,.06)',
          background:'rgba(0,0,0,.3)',
          flexShrink:0,
        }}>
          <span className="bu-onair"><span className="bu-onair-dot" />LIVE</span>
          <div>
            <div style={{ fontFamily:T.disp, fontSize:17, letterSpacing:'.14em', color:T.white, lineHeight:1, textTransform:'uppercase' }}>
              HV <span style={{ color:T.gold }}>Universo</span>
            </div>
            <div style={{ fontFamily:T.mono, fontSize:7, letterSpacing:'.3em', color:'rgba(242,237,228,.25)', marginTop:1 }}>
              SEASON {state?.year} · CH-01
            </div>
          </div>
        </div>

        {/* Center — sim status or progress */}
        <div style={{ flex:1, display:'flex', alignItems:'center', padding:'0 22px', minWidth:0 }}>
          {simulating ? (
            <div style={{ display:'flex', alignItems:'center', gap:12, width:'100%' }}>
              <div style={{ width:6, height:6, borderRadius:'50%', background:T.grassLight, boxShadow:`0 0 10px ${T.grassLight}`, animation:'bu-pulse 0.8s ease-in-out infinite', flexShrink:0 }} />
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontFamily:T.mono, fontSize:8, color:T.grassLight, letterSpacing:'.22em', animation:'bu-blink 1.2s ease-in-out infinite', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                  {simMode === 'fast'
                    ? `⚡ FASTSIM — ${simProgress} TORNEIO${simProgress !== 1 ? 'S' : ''} PROCESSADO${simProgress !== 1 ? 'S' : ''}`
                    : `▶ SIMULANDO — ${nextT?.name?.toUpperCase()} · ${simProgress} PARTIDAS`
                  }
                </div>
                <div style={{ marginTop:4, height:2, background:'rgba(255,255,255,.06)', overflow:'hidden' }}>
                  <div className="bu-sim-bar-fill" style={{ height:'100%', width:'60%', background:`linear-gradient(90deg,${T.grassLight},${T.grassLight}88)` }} />
                </div>
              </div>
           {onToggleStopOnBreaking && (
                <button
                  onClick={() => onToggleStopOnBreaking(!stopOnBreaking)}
                  style={{ fontFamily:T.mono, fontSize:7.5, letterSpacing:'.18em', textTransform:'uppercase', color:stopOnBreaking ? '#FF8A80' : T.faint, background:stopOnBreaking ? 'rgba(255,82,82,.12)' : 'rgba(255,255,255,.03)', border:`1px solid ${stopOnBreaking ? 'rgba(255,82,82,.38)' : 'rgba(255,255,255,.08)'}`, padding:'8px 10px', cursor:'pointer', whiteSpace:'nowrap' }}
                >
                  {stopOnBreaking ? 'pausar em breaking: on' : 'pausar em breaking: off'}
            </button>
           )}
           <button onClick={() => setAccessibilityOpen(v => !v)} aria-label="Opções de leitura" style={{ fontFamily:T.mono, fontSize:9, color:T.white, background:accessibilityOpen ? 'rgba(232,200,74,.16)' : 'rgba(255,255,255,.04)', border:`1px solid ${accessibilityOpen ? T.gold : 'rgba(255,255,255,.12)'}`, padding:'8px 9px', cursor:'pointer' }}>A+</button>
            </div>
          ) : (
            <div style={{ display:'flex', alignItems:'center', gap:16, width:'100%' }}>
              {/* Segmented season progress */}
              <div style={{ flex:1, height:4, background:'rgba(255,255,255,.04)', position:'relative', overflow:'hidden', maxWidth:340 }}>
                <div style={{ position:'absolute', inset:0, display:'flex' }}>
                  {CALENDAR.slice(0, state?.calendarIndex ?? 0).map((t, i) => {
                    const sc = SURFACE[t.surface] ?? SURFACE.HARD;
                    return <div key={i} style={{ flex:1, background:sc.main, opacity:.75 }} />;
                  })}
                  {CALENDAR.slice(state?.calendarIndex ?? 0).map((_,i) => (
                    <div key={i} style={{ flex:1, background:'rgba(255,255,255,.03)' }} />
                  ))}
                </div>
                {!isSeasonDone && (
                  <div style={{ position:'absolute', top:-1, bottom:-1, left:`${pct*100}%`, width:2, background:'#fff', boxShadow:'0 0 8px rgba(255,255,255,.9)', transition:'left .4s ease' }} />
                )}
              </div>
              <div style={{ display:'flex', gap:3, alignItems:'center', flexShrink:0 }}>
                <span style={{ fontFamily:T.disp, fontSize:18, color: isSeasonDone ? T.grassLight : T.gold, letterSpacing:'.06em', lineHeight:1 }}>
                  {Math.round(pct*100)}%
                </span>
                <span style={{ fontFamily:T.mono, fontSize:7, color:'rgba(242,237,228,.22)', letterSpacing:'.16em', marginTop:2 }}>
                  {state?.calendarIndex}/{totalTournaments}
                </span>
              </div>
              {nextT && !isSeasonDone && (
                <div style={{ fontFamily:T.mono, fontSize:7.5, color:'rgba(242,237,228,.3)', letterSpacing:'.18em', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', maxWidth:220 }}>
                  PRÓXIMO: <span style={{ color:nextSurf.light }}>{nextT.name}</span>
                </div>
              )}
              {isSeasonDone && (
                <div style={{ fontFamily:T.mono, fontSize:8, color:T.grassLight, letterSpacing:'.2em' }}>✓ TEMPORADA CONCLUÍDA</div>
              )}
            </div>
          )}
        </div>

        {/* Right — clock + controls */}
        <div style={{ display:'flex', alignItems:'center', gap:8, padding:'0 16px', borderLeft:'1px solid rgba(255,255,255,.06)', flexShrink:0 }}>
          {/* Live clock */}
          <div style={{ padding:'0 14px 0 0', borderRight:'1px solid rgba(255,255,255,.05)', marginRight:6 }}>
            <div style={{ fontFamily:T.mono, fontSize:13, fontWeight:700, color:'rgba(242,237,228,.45)', letterSpacing:'.12em', lineHeight:1 }}>
              <LiveClock />
            </div>
          </div>

          {onToggleStopOnBreaking && (
            <button
              onClick={() => !simulating && onToggleStopOnBreaking(!stopOnBreaking)}
              disabled={simulating}
              style={{ fontFamily:T.mono, fontSize:7, letterSpacing:'.18em', textTransform:'uppercase', color:stopOnBreaking ? '#FF8A80' : T.faint, background:stopOnBreaking ? 'rgba(255,82,82,.12)' : 'rgba(255,255,255,.03)', border:`1px solid ${stopOnBreaking ? 'rgba(255,82,82,.38)' : 'rgba(255,255,255,.08)'}`, padding:'8px 10px', cursor:simulating ? 'not-allowed' : 'pointer', whiteSpace:'nowrap', opacity:simulating ? .45 : 1 }}
            >
              breakings: {stopOnBreaking ? 'pausar' : 'ignorar'}
            </button>
          )}

          {/* — SIMULAR dropdown — */}
          {!isSeasonDone && onSimulate && (
            <div style={{ position:'relative' }} onClick={e => e.stopPropagation()}>
              <button
                className="bu-cta bu-cta-primary"
                onClick={() => !simulating && setSimMenuOpen(v => !v)}
                disabled={simulating}
              >
                <span style={{ fontSize:10 }}>▶</span>
                <span>SIMULAR</span>
                <span style={{ fontSize:7, opacity:.6 }}>{simMenuOpen ? '▴' : '▾'}</span>
              </button>
              {simMenuOpen && (
                <div className="bu-fast-menu">
                  <div style={{ padding:'10px 16px 8px', borderBottom:'1px solid rgba(255,255,255,.06)', fontFamily:T.mono, fontSize:7, letterSpacing:'.4em', color:`${T.clay}66`, textTransform:'uppercase' }}>
                    ◈ MODO SIMULAÇÃO
                  </div>
                  {[
                    { mode:'sim_month',    icon:'▦', label:'Simular Mês',             sub:`Todos os torneios de ${CALENDAR[state?.calendarIndex]?.month ?? 'Jan'}` },
                    { mode:'sim_grandslam',icon:'⭐', label:'Até Grand Slam / Finals', sub:'Para antes do próximo GS ou Finals' },
                    { mode:'sim_year',     icon:'🗓️', label:'Ano Inteiro',            sub:'Todos os torneios restantes' },
                    { mode:'sim_5years',   icon:'⏩', label:'Simular 5 Anos',          sub:`${state?.year}→${(state?.year??2025)+4} · avança temporadas` },
                    { mode:'sim_decade',   icon:'⏩', label:'Simular 10 Anos',         sub:`${state?.year}→${(state?.year??2025)+9} · avança temporadas` },
                    { mode:'sim_15years',  icon:'⏩', label:'Simular 15 Anos',         sub:`${state?.year}→${(state?.year??2025)+14} · avança temporadas` },
                    { mode:'sim_20years',  icon:'⏩', label:'Simular 20 Anos',         sub:`${state?.year}→${(state?.year??2025)+19} · avança temporadas` },
                  ].map(opt => (
                    <div key={opt.mode} className="bu-fast-opt" onClick={() => { setSimMenuOpen(false); onSimulate(opt.mode); }}>
                      <span className="bu-fast-opt-icon">{opt.icon}</span>
                      <div>
                        <div className="bu-fast-opt-label" style={{ color:T.clayLight }}>{opt.label}</div>
                        <div className="bu-fast-opt-sub">{opt.sub}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* — RÁPIDO dropdown — */}
          {!isSeasonDone && onFastSimulateRange && (
            <div style={{ position:'relative' }} onClick={e => e.stopPropagation()}>
              <button
                className="bu-cta bu-cta-fast"
                onClick={() => !simulating && setFastMenuOpen(v => !v)}
                disabled={simulating}
              >
                <span>⚡</span>
                <span>RÁPIDO</span>
                <span style={{ fontSize:7, opacity:.6 }}>{fastMenuOpen ? '▴' : '▾'}</span>
              </button>
              {fastMenuOpen && (
                <div className="bu-fast-menu">
                  <div style={{ padding:'10px 16px 8px', borderBottom:'1px solid rgba(255,255,255,.06)', fontFamily:T.mono, fontSize:7, letterSpacing:'.4em', color:'rgba(232,200,74,.4)', textTransform:'uppercase' }}>
                    ⚡ FASTSIM
                  </div>
                  {[
                    { mode:'month',    icon:'▦', label:'Simular Mês',      sub:`Torneios de ${CALENDAR[state?.calendarIndex]?.month ?? 'Jan'}` },
                    { mode:'champions',icon:'★', label:'Até o Champions', sub:'Até ATP Finals de Dezembro' },
                    { mode:'year',     icon:'🗓️', label:'Ano Inteiro',    sub:'Todos os restantes da temporada' },
                    { mode:'5years',   icon:'⏩', label:'5 Anos',           sub:`${state?.year}→${(state?.year??2025)+4}` },
                    { mode:'decade',   icon:'⏩', label:'10 Anos',          sub:`${state?.year}→${(state?.year??2025)+9}` },
                    { mode:'15years',  icon:'⏩', label:'15 Anos',          sub:`${state?.year}→${(state?.year??2025)+14}` },
                    { mode:'20years',  icon:'⏩', label:'20 Anos',          sub:`${state?.year}→${(state?.year??2025)+19}` },
                  ].map(opt => (
                    <div key={opt.mode} className="bu-fast-opt" onClick={() => { setFastMenuOpen(false); onFastSimulateRange(opt.mode); }}>
                      <span className="bu-fast-opt-icon">{opt.icon}</span>
                      <div>
                        <div className="bu-fast-opt-label">{opt.label}</div>
                        <div className="bu-fast-opt-sub">{opt.sub}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* — Avançar ano — */}
          {isSeasonDone && dispatch && (
            <button className="bu-cta bu-cta-advance" onClick={() => dispatch({ type:'ADVANCE_YEAR' })}>
              <span>→</span>
              <span>ANO {(state?.year ?? 2025) + 1}</span>
            </button>
          )}

          {/* Divider */}
          <div style={{ width:1, height:24, background:'rgba(255,255,255,.06)', margin:'0 2px' }} />

          {onSaveGame && <button className="bu-cta bu-cta-save" onClick={onSaveGame} disabled={simulating}><span>💾</span><span>SALVAR</span></button>}
          {onRestoreAutosave && <button className="bu-cta" onClick={onRestoreAutosave} disabled={simulating} title="Recuperar o backup automatico mais recente"><span>↶</span><span>RECUPERAR</span></button>}
          <button className="bu-cta" onClick={() => { setNavArea('agora'); setCurrentTab('radar'); }} disabled={simulating} title="Configurar jogadores acompanhados"><span>◉</span><span>RADAR {followedCount}/4</span></button>
          {onLoadGame && <button className="bu-cta bu-cta-load" onClick={onLoadGame} disabled={simulating}><span>📂</span><span>CARREGAR</span></button>}

          <button className="bu-cta bu-cta-back" onClick={onBack}>  VOLTAR</button>
        </div>
      </div>

      {/* — NAVIGATION — CHANNEL SELECTOR — */}
      <div style={{
        position:'sticky', top:56, zIndex:99,
        background:'rgba(3,5,7,.90)', backdropFilter:'blur(14px)',
        borderBottom:'1px solid rgba(255,255,255,.05)',
        display:'flex', overflowX:'auto', padding:'0 10px',
        gap:2,
      }} className="bu-scroll">
        {navAreas.map(area => (
          <button
            key={area.id}
            onClick={() => { setNavArea(area.id); openTab(area.tabs[0][0]); }}
            style={{ border:'none', borderBottom:navArea === area.id ? `2px solid ${T.gold}` : '2px solid transparent', background:navArea === area.id ? 'rgba(232,200,74,.08)' : 'transparent', color:navArea === area.id ? T.gold : 'rgba(242,237,228,.52)', cursor:'pointer', fontFamily:T.mono, fontSize:8, letterSpacing:'.18em', padding:'15px 13px 12px', whiteSpace:'nowrap' }}
          >{area.label}</button>
        ))}
        <span style={{ width:1, background:'rgba(255,255,255,.08)', margin:'9px 5px' }} />
        {visibleTabs.map(([id, label]) => (
          <button
            key={id}
            className={`bu-tab ${currentTab === id ? 'active' : ''}`}
            onClick={() => openTab(id)}
          >
            <span className="bu-tab-dot" />
            {label}
          </button>
        ))}
        {/* Right fade */}
        <div style={{ flexShrink:0, width:40, background:'linear-gradient(90deg,transparent,rgba(3,5,7,.9))', pointerEvents:'none', position:'sticky', right:0 }} />
      </div>

      {accessibilityOpen && (
        <div style={{ position:'fixed', zIndex:120, top:64, right:16, width:260, padding:15, background:'rgba(5,9,12,.98)', border:`1px solid ${T.gold}66`, boxShadow:'0 18px 42px rgba(0,0,0,.45)' }}>
          <div style={{ fontFamily:T.mono, fontSize:8, letterSpacing:'.2em', color:T.gold, marginBottom:10 }}>LEITURA & CONFORTO</div>
          {[['highContrast','Contraste reforçado'],['spacious','Mais respiro no texto'],['reducedMotion','Reduzir movimento']].map(([key,label]) => <label key={key} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:12, padding:'9px 0', borderTop:'1px solid rgba(255,255,255,.07)', fontFamily:T.body, fontSize:12, color:T.white, cursor:'pointer' }}><span>{label}</span><input type="checkbox" checked={comfortMode[key]} onChange={() => setComfortMode(prev => ({ ...prev, [key]:!prev[key] }))} /></label>)}
        </div>
      )}

      {latestCircuitShift && (
        <button
          onClick={() => openTab('imprensa')}
          style={{ width:'100%', position:'relative', zIndex:3, display:'grid', gridTemplateColumns:'auto minmax(0,1fr) auto', gap:14, alignItems:'center', textAlign:'left', padding:'11px 24px', border:'none', borderBottom:'1px solid rgba(102,199,255,.22)', background:'linear-gradient(90deg,rgba(102,199,255,.14),rgba(232,200,74,.07),transparent)', color:T.white, cursor:'pointer' }}
        >
          <span style={{ fontFamily:T.mono, fontSize:8, color:'#7DD8FF', letterSpacing:'.24em', whiteSpace:'nowrap' }}>ECOS DA ÚLTIMA SEMANA</span>
          <span style={{ minWidth:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', fontFamily:T.cond, fontWeight:700, fontSize:16, letterSpacing:'.05em', textTransform:'uppercase' }}>{latestCircuitShift.headline}</span>
          <span style={{ fontFamily:T.mono, fontSize:7.5, color:'rgba(242,237,228,.5)', letterSpacing:'.16em', whiteSpace:'nowrap' }}>ABRIR COBERTURA →</span>
        </button>
      )}

      {/* — BOTTOM ACCENT LINE — */}
      <div style={{
        position:'fixed', bottom:0, left:0, right:0, height:2, zIndex:100,
        background:`linear-gradient(90deg,transparent,${T.clay} 20%,${T.gold} 50%,${T.grassLight} 80%,transparent)`,
        boxShadow:`0 0 20px ${T.clay}55`,
        pointerEvents:'none',
        transition:'background 2s ease',
      }} />

      {/* — CONTENT — */}
      <div className="bu-scroll" style={{ width:'100%', padding:'0 0 80px', minHeight:'calc(100vh - 100px)', position:'relative', zIndex:1 }}>
        {currentTab === 'geral'        && state && <GeralView state={state} onViewBracket={onViewBracket} onSimulate={onSimulate} onFastSimulate={onFastSimulateRange} simulating={simulating} simProgress={simProgress} onOpenTab={openTab} onOpenProfile={setProfilePlayer} />}
        {currentTab === 'calendario'   && state && <CalendarioView state={state} onViewBracket={onViewBracket} />}
        {currentTab === 'rankings'     && state && <RankingsView state={state} dispatch={dispatch} />}
        {currentTab === 'tecnicos'     && state && <TecnicosBancoView state={state} />}
        {currentTab === 'rtd'          && state && <RTDView state={state} />}
        {currentTab === 'imprensa'     && state && <PressCenter state={state} />}
        {currentTab === 'analistas'    && state && <AnalystView state={state} />}
        {currentTab === 'entrevistas'  && state && <InterviewView state={state} />}
        {currentTab === 'recordes'     && state && <RecordesView state={state} />}
        {currentTab === 'arquivo-vivo' && state && <ArquivoVivoView state={state} onOpen={openTab} />}
        {currentTab === 'analytics'    && state && <AnalyticsView state={state} />}
        {currentTab === 'hall-of-fame' && state && <HallOfFameView state={state} />}
        {currentTab === 'chronicles'   && state && <ChronicleView state={state} />}
        {currentTab === 'eras'         && state && <ErasView state={state} onOpenProfile={setProfilePlayer} />}
        {currentTab === 'lesoes'        && state && <LesõesView state={state} />}
        {currentTab === 'radar'         && state && <RadarView state={state} dispatch={dispatch} onOpenProfile={setProfilePlayer} />}
        {currentTab === 'empresas'      && state && <CompaniesView state={state} onOpenPlayer={setProfilePlayer} />}
      </div>
      {profilePlayer && (
        <DefinitivePlayerProfile
          playerData={profilePlayer}
          rankingStore={state?.rankingStore}
          allPlayers={[...(state?.tourPlayers ?? []), ...(state?.prospects ?? [])]}
          tournamentResults={{ ...(state?.historicalTournamentResults ?? {}), ...(state?.tournamentResults ?? {}) }}
          rivalrySystem={state?.rivalrySystem ?? null}
          newsEngine={state?.newsEngine ?? null}
          sponsorPool={state?.sponsorPool ?? null}
          coachMarket={state?.coachMarket ?? null}
          chronicleEngine={state?.chronicleEngine ?? null}
          historyBook={state?.historyBook ?? null}
          dispatch={dispatch}
          year={state?.year ?? null}
          radarFollowed={(state?.radar?.followedPlayerIds ?? []).includes(profilePlayer.id)}
          onToggleRadar={(player) => {
            const ids = state?.radar?.followedPlayerIds ?? [];
            dispatch?.({ type:'SET_RADAR_FOLLOWED', playerIds: ids.includes(player.id) ? ids.filter(id => id !== player.id) : [...ids, player.id] });
          }}
          onBack={() => setProfilePlayer(null)}
        />
      )}
    </div>
  );
}




