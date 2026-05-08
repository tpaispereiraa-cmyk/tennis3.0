/**
 * NEWME1.0.jsx — História Viva · New Match Engine 1.0
 *
 * Engine visual repensado do zero: Night Session Premium aesthetic
 *   - Stadium full-black background, floodlit court
 *   - Court scale 0.76 (vs 0.63 anterior) — muito maior
 *   - Arquibancada 3 níveis com seções coloridas e concreto escuro
 *   - Publicidade em todos os 4 muros
 *   - Torcida viva em todos os 4 lados (420 pessoas, sempre animadas)
 *   - Juiz na cadeira elevada icônica, gandulas com bolinhas
 *   - Superfícies com paletas icônicas (USO azul / RG barro / Wimbledon verde)
 * Props: { gsRef, trailRef, snap, onMenu, simSpeed, setSimSpeed, speedRef }
 */

import React, { useRef, useEffect, useState } from 'react';
import { MatchRatingBadge } from './IndividualRating.jsx';
import { GameState, TIMING } from './constants.js';
import { VFX_TYPES } from './vfx.js';
import { traceServeDump } from './trace.js';
import { NAMED_PLAYERS, getPlayerPhoto } from './players.js';
import { getAppearance } from './pixel/appearances.js';
import { toggleSound, isSoundOn } from './sound.js';
import SoundSettings from './components/SoundSettings.jsx';
import { INSTRUCTION_ICONS, PHILOSOPHY_LABELS } from './CoachAdvisor.js';
import { generateExecutionReport, calcTrustDelta, applyTrustDelta } from './CoachTacticTracker.js';
import { analyzeMatch } from './CoachAnalyzer.js';
import { generateInstructions } from './CoachAdvisor.js';
import { runChangeover } from './CoachInfluencer.js';
import { readHeat } from './MatchHeat.js';
import { getBuildStyleMeta, getNetGameMeta, getRallyCadenceMeta, getRiskProfileMeta, generatePrefs } from './playerPrefs.js';
import { SIGNATURE_SHOTS as NEW_SIG_SHOTS } from './SignatureShots.js';
import { ovrTier } from './ScoutProfile.js';
import { getWindHUDInfo } from './EnvironmentSystem.js';
// ── Design tokens — ME.html dark premium aesthetic ────────────────────────────
const RG = {
  bg:          '#050A07',
  bgMid:       '#080F0A',
  bgPanel:     '#0C1610',
  bgLight:     '#111D15',
  clay:        '#C4572A',
  clayLight:   '#E07040',
  lime:        '#60FF90',
  white:       '#F2EDE8',
  textDim:     'rgba(242,237,232,.55)',
  textFaint:   'rgba(242,237,232,.28)',
  border:      'rgba(255,255,255,.07)',
  borderMid:   'rgba(255,255,255,.13)',
  borderBright:'rgba(255,255,255,.20)',
  display:     "'Barlow Condensed', sans-serif",
  body:        "'Barlow', sans-serif",
  mono:        "'Space Mono', monospace",
  gold:        '#FFD700',
};

function _visualCanPlayerWinGameNow(gs, playerId) {
  const player = gs.players?.[playerId];
  const opp = gs.players?.[1 - playerId];
  if (!player || !opp) return false;
  if (gs.inTiebreak) {
    const tb = gs.tbScore || [0, 0];
    return tb[playerId] >= 6 && (tb[playerId] - tb[1 - playerId]) >= 1;
  }
  if (player.score === 4) return true;
  return player.score === 3 && opp.score <= 2;
}

function _visualCanPlayerWinSetNow(gs, playerId) {
  const player = gs.players?.[playerId];
  const opp = gs.players?.[1 - playerId];
  if (!player || !opp) return false;
  if (!_visualCanPlayerWinGameNow(gs, playerId)) return false;
  if (gs.inTiebreak) return true;
  const nextGames = (player.games || 0) + 1;
  return nextGames >= 6 && (nextGames - (opp.games || 0)) >= 2;
}

function _visualCanPlayerWinMatchNow(gs, playerId) {
  const setsNeeded = gs.setsToWin ?? 2;
  const currentSets = gs.players?.[playerId]?.sets || 0;
  return (currentSets + (_visualCanPlayerWinSetNow(gs, playerId) ? 1 : 0)) >= setsNeeded;
}

function getVisualPressureState(gs) {
  const server = gs.server ?? 0;
  const receiver = gs.receiver ?? (server === 0 ? 1 : 0);
  const players = gs.players || [];
  const states = players.map((player, playerId) => ({
    playerId,
    isGamePoint: _visualCanPlayerWinGameNow(gs, playerId),
    isSetPoint: _visualCanPlayerWinSetNow(gs, playerId),
    isMatchPoint: _visualCanPlayerWinMatchNow(gs, playerId),
    isBreakPoint: false,
    isDefendingBreakPoint: false,
    isDefendingSetPoint: false,
    isDefendingMatchPoint: false,
  }));

  if (!gs.inTiebreak && states[receiver] && states[server]) {
    states[receiver].isBreakPoint = states[receiver].isGamePoint;
    states[server].isDefendingBreakPoint = states[receiver].isBreakPoint;
  }

  states.forEach((state, idx) => {
    const opp = states[1 - idx];
    state.isDefendingSetPoint = !!opp?.isSetPoint;
    state.isDefendingMatchPoint = !!opp?.isMatchPoint;
  });

  const leader = states.find(s => s.isMatchPoint)
    || states.find(s => s.isSetPoint)
    || states.find(s => s.isBreakPoint)
    || states.find(s => s.isGamePoint)
    || null;

  const rally = gs.rally ?? 0;
  const deuceLike = !gs.inTiebreak && players[0] && players[1] &&
    ((players[0].score === 3 && players[1].score === 3) || players[0].score === 4 || players[1].score === 4);
  const tbClutch = !!gs.inTiebreak && Math.max(gs.tbScore?.[0] || 0, gs.tbScore?.[1] || 0) >= 5;
  const isClutch = deuceLike || tbClutch || rally >= 10;

  let momentType = null;
  let label = '';
  let subLabel = '';
  let playerId = leader?.playerId ?? null;

  if (leader?.isMatchPoint) {
    momentType = 'match';
    label = 'MATCH POINT';
    subLabel = 'One point from closing the match';
  } else if (leader?.isSetPoint) {
    momentType = 'set';
    label = 'SET POINT';
    subLabel = 'One point from taking the set';
  } else if (leader?.isBreakPoint) {
    momentType = 'break';
    label = 'BREAK POINT';
    subLabel = 'Returner can steal the game';
  } else if (leader?.isGamePoint) {
    momentType = 'game';
    label = 'GAME POINT';
    subLabel = 'Server can close the game now';
  } else if (isClutch) {
    momentType = 'clutch';
    label = deuceLike ? 'DEUCE BATTLE' : tbClutch ? 'TIEBREAK TENSION' : 'CLUTCH RALLY';
    subLabel = deuceLike ? 'Margins are razor-thin' : tbClutch ? 'Every point is amplified' : 'Pressure building through the exchange';
  } else if (rally >= 8) {
    momentType = 'rally';
    label = `${rally} SHOTS`;
    subLabel = 'Crowd rising with the exchange';
  }

  return { states, leader, momentType, label, subLabel, playerId, isClutch };
}

function prettyServeDir(dir) {
  return dir === 'WIDE' ? 'WIDE' : dir === 'BODY' ? 'BODY' : dir === 'T' ? 'T' : dir || 'MIX';
}

function prettyServePhys(type) {
  return type === 'FLAT' ? 'FLAT' : type === 'SLICE' ? 'SLICE' : type === 'KICK' ? 'KICK' : type || 'MIX';
}

function prettyServeBias(bias) {
  return ({
    T_HEAVY: 'T HEAVY',
    BODY_HEAVY: 'BODY HEAVY',
    WIDE_HEAVY: 'WIDE HEAVY',
    T_MIX: 'T MIX',
    BODY_MIX: 'BODY MIX',
    WIDE_MIX: 'WIDE MIX',
    SAFE_CENTRE: 'SAFE MIX',
    BALANCED: 'BALANCED',
  })[bias] || (bias ? String(bias).replaceAll('_', ' ') : 'BALANCED');
}

function prettyServeIntent(intent) {
  return ({
    OPEN: 'OPEN',
    JAM: 'JAM',
    SAFE: 'SAFE',
    RUSH: 'RUSH',
  })[intent] || (intent ? String(intent).toUpperCase() : 'SETUP');
}

function prettyPlanMotive(motive) {
  return ({
    FINISH_OPEN: 'S+1 FINISH',
    PRESS_OPEN: 'S+1 PRESS',
    BUILD_HEAVY: 'HEAVY BUILD',
    BUILD_SPACE: 'BUILD SPACE',
    JAM_BODY: 'BODY PRESS',
    DRAG_FORWARD: 'DRAG FORWARD',
    NEUTRALIZE: 'RECOVER',
  })[motive] || (motive ? String(motive).replaceAll('_', ' ') : 'S+1');
}

function getServeBroadcastState(gs, pressureInfo = null) {
  if (!gs?.players?.length) return null;
  const serverIdx = gs.server ?? 0;
  const receiverIdx = gs.receiver ?? (serverIdx === 0 ? 1 : 0);
  const server = gs.players?.[serverIdx];
  const receiver = gs.players?.[receiverIdx];
  if (!server) return null;

  const prefs = server.prefs || generatePrefs(server.attrs || {});
  const serverMc = server.ctx?.matchCtx || {};
  const receiverMc = receiver?.ctx?.matchCtx || {};
  const pd = gs._pendingServeData || null;
  const bias = (server.faults === 1 ? prefs.serve2Bias : prefs.serve1Bias) || 'BALANCED';
  const patternState = serverMc.servePatternState || {};
  const readState = receiverMc.returnReadState || {};
  const plan = server.ctx?._servePatternPlan || null;
  const pressureMoment = pressureInfo?.momentType || null;

  const primaryLabel = pd
    ? `${pd.isFirst ? '1ST' : '2ND'} ${prettyServePhys(pd.physType)} ${prettyServeDir(pd.dir)}`
    : `${server.faults === 1 ? '2ND' : '1ST'} ${prettyServeBias(bias)}`;

  const subLabel = pd
    ? `${prettyServeIntent(serverMc.serveIntent)} pattern${plan?.motive ? ` · ${prettyPlanMotive(plan.motive)}` : ''}`
    : `${server.name?.split(' ').pop() || 'SERVER'} building serve pattern`;

  const tags = [
    { label: prettyServeIntent(serverMc.serveIntent), tone: 'accent' },
    plan?.motive ? { label: prettyPlanMotive(plan.motive), tone: 'light' } : null,
    (readState.patternPressure ?? patternState.patternPressure ?? 0) >= 0.34 && (readState.anticipatedDir || patternState.anticipatedDir)
      ? { label: `READ ${prettyServeDir(readState.anticipatedDir || patternState.anticipatedDir)}`, tone: 'warn' }
      : null,
    (patternState.varyFrom || readState.punishDir)
      ? { label: `VARY ${prettyServeDir(patternState.varyFrom || readState.punishDir)}`, tone: 'neutral' }
      : null,
    (patternState.counterOpenDir || readState.openDir)
      ? { label: `SPACE ${prettyServeDir(patternState.counterOpenDir || readState.openDir)}`, tone: 'good' }
      : null,
    pressureMoment ? { label: `${String(pressureMoment).toUpperCase()} POINT`, tone: 'hot' } : null,
  ].filter(Boolean).slice(0, 4);

  return {
    primaryLabel,
    subLabel,
    tags,
  };
}

// ── Surface palettes ──────────────────────────────────────────────────────────
const SURF = {
  HARD:   { label:'Hard',   venue:'US Open',      color:'#1e4f96', dark:'#163a72', line:'rgba(255,255,255,0.90)', dust:'rgba(120,160,220,0.55)', bg:'#04090f', rgb:'10,28,65'  },
  CLAY:   { label:'Saibro', venue:'Roland Garros', color:'#b03a0e', dark:'#8a2e08', line:'rgba(235,215,195,0.88)', dust:'rgba(200,100,50,0.65)',  bg:'#0f0500', rgb:'70,20,5'   },
  GRASS:  { label:'Grama',  venue:'Wimbledon',     color:'#155c2e', dark:'#0e4020', line:'rgba(255,255,255,0.88)', dust:'rgba(60,140,80,0.55)',    bg:'#010a02', rgb:'8,40,12'   },
  INDOOR: { label:'Indoor', venue:'Paris',         color:'#12124a', dark:'#0a0a32', line:'rgba(180,200,255,0.85)', dust:'rgba(80,100,200,0.45)',   bg:'#010108', rgb:'8,8,50'    },
};

import { getVenueOverride } from './courtConfigs.js';
import { getCourtImages } from './courtImages.js';


const SHOT_META = {
  TOPSPIN:      { label:'TOPSPIN',      color: RG.lime,        emoji:'🎾' },
  FLAT:         { label:'FLAT',         color:'#00D4FF',        emoji:'⚡' },
  SLICE:        { label:'SLICE',        color:'#FFD700',        emoji:'✂️' },
  VOLLEY:       { label:'VOLEIO',       color: RG.clayLight,   emoji:'🥊' },
  SMASH:        { label:'SMASH',        color:'#FF4444',        emoji:'💥' },
  DROP:         { label:'DROP SHOT',    color:'#A78BFA',        emoji:'💧' },
  LOB_DEF:      { label:'LOB',          color:'#7ab4ff',        emoji:'☁️' },
  LOB_ATK:      { label:'LOB ATK',      color:'#FF8844',        emoji:'🚀' },
  BANANA:       { label:'BANANA',       color:'#FFD700',        emoji:'🍌' },
  SHORT_ANGLE:  { label:'ÂNGULO',       color:'#FF2266',        emoji:'📐' },
  SLICE_SHORT:  { label:'SLICE CURTO',  color:'#FFCC44',        emoji:'🔪' },
  PASSING:      { label:'PASSING',      color: RG.lime,        emoji:'💨' },
  'FLAT-T':     { label:'SAQUE FLAT·T', color:'#FFD700',        emoji:'⚡' },
  'FLAT-WIDE':  { label:'SAQUE WIDE',   color:'#FFD700',        emoji:'⚡' },
  'FLAT-BODY':  { label:'SAQUE BODY',   color: RG.clayLight,   emoji:'⚡' },
  'SLICE-WIDE': { label:'SAQUE SLICE',  color:'#00D4FF',        emoji:'🔪' },
  'SLICE-T':    { label:'SAQUE SLICE·T',color:'#00D4FF',        emoji:'🔪' },
  'KICK-BODY':  { label:'SAQUE KICK',   color: RG.lime,        emoji:'🦵' },
  'KICK-T':     { label:'SAQUE KICK·T', color: RG.lime,        emoji:'🦵' },
};

const NATIONALITY_FLAGS = {
  VANTORINI:'ITA · #1', KASPERK:'DEN · #2',  WEN_ZHAO:'CHN · #3',
  VOLKOV:'RUS · #4',    ABIODUN:'NGR · #5',  LEROUX:'FRA · #6',
  AJUBA:'BRA · #7',     DELGADO:'ARG · #8',  NAKAMURA:'JPN · #9',
  PAPADOPOULOS:'GRE · #10', MAGNUSSON:'NOR · #11', YAMAMOTO:'JPN · #12',
  NDLOVU:'RSA · #13',   FEKETE:'HUN · #14',  MENSAH:'GHA · #15',
};

const SC_LABELS = ['0','15','30','40','AD'];

// ── Helpers ───────────────────────────────────────────────────────────────────
function lerp(a,b,t){ return a+(b-a)*Math.min(1,Math.max(0,t)); }
function clamp(v,lo,hi){ return v<lo?lo:v>hi?hi:v; }
function lighten(hex,a){
  const r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16);
  return `rgb(${Math.min(255,r+Math.round(255*a))},${Math.min(255,g+Math.round(255*a))},${Math.min(255,b+Math.round(255*a))})`;
}
function darken(hex,a){
  const r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16);
  return `rgb(${Math.max(0,r-Math.round(255*a))},${Math.max(0,g-Math.round(255*a))},${Math.max(0,b-Math.round(255*a))})`;
}
function lerpAngle(a,b,t){
  let d=b-a;
  while(d>Math.PI)d-=Math.PI*2;
  while(d<-Math.PI)d+=Math.PI*2;
  return a+d*t;
}
function mulberry32(seed){ return function(){ let t=seed+=0x6D2B79F5; t=Math.imul(t^t>>>15,t|1); t^=t+Math.imul(t^t>>>7,t|61); return((t^t>>>14)>>>0)/4294967296; }; }

// ── Court dimensions ──────────────────────────────────────────────────────────
const COURT_W_M = 23.77;
const COURT_H_M = 10.97;

function getShotDrawType(shotType){
  if(!shotType) return 'ready';
  const s=String(shotType).toUpperCase();
  if(s==='SMASH') return 'overhead';
  if(s==='DROP'||s==='SLICE'||s==='LOB_DEF'||s==='LOB_ATK') return 'backhand';
  if(s.startsWith('KICK')||s.startsWith('FLAT-')||s.startsWith('SLICE-')) return 'serve';
  return 'forehand';
}

// ─────────────────────────────────────────────────────────────────────────────
// FASE 6: Coach Changeover Card
// ─────────────────────────────────────────────────────────────────────────────

const PHIL_COLOR = {
  OFFENSIVE: '#F06428', DEFENSIVE: '#2860A8',
  COMPLETE: '#22c55e', SPECIALIST: '#E8C84A', MENTAL: '#AA44FF',
};

// Ícone e cor por diagKey
const DIAG_META = {
  executed_worked:  { icon: '✓', color: '#22c55e' },
  executed_neutral: { icon: '→', color: '#E8C84A' },
  executed_failed:  { icon: '↺', color: '#F06428' },
  ignored_worked:   { icon: '?', color: '#E8C84A' },
  ignored_failed:   { icon: '✗', color: '#ef4444' },
  partial:          { icon: '~', color: '#94a3b8' },
};

function CoachChangeoverCard({ instructions, coachName, philosophy, executionReport, trust, onDismiss }) {
  if (!instructions?.length) return null;
  const philColor = PHIL_COLOR[philosophy] ?? '#F2EDE4';
  const philLabel = PHILOSOPHY_LABELS[philosophy] ?? philosophy;
  const hasReport = !!executionReport;
  const report    = executionReport;
  const diagMeta  = report ? (DIAG_META[report.diagKey] ?? DIAG_META.partial) : null;
  const trustPct  = trust != null ? Math.round(trust * 100) : null;
  const trustColor = trustPct >= 70 ? '#22c55e' : trustPct >= 40 ? '#E8C84A' : '#ef4444';

  return (
    <div style={{
      position: 'fixed', bottom: 80, left: '50%', transform: 'translateX(-50%)',
      zIndex: 9500,
      background: 'rgba(6,8,12,0.97)',
      border: `1px solid ${philColor}44`,
      boxShadow: `0 0 40px ${philColor}18, 0 8px 32px rgba(0,0,0,.7)`,
      minWidth: 300, maxWidth: 400,
      fontFamily: "'Space Mono', monospace",
      pointerEvents: 'auto',
      animation: 'coachCardIn .35s cubic-bezier(.16,1,.3,1)',
      overflow: 'hidden',
    }}>

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 14px 8px',
        borderBottom: '1px solid rgba(255,255,255,.06)',
        background: `${philColor}0A`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13 }}>🎓</span>
          <div>
            <div style={{ fontSize: 9, letterSpacing: 2, color: philColor, textTransform: 'uppercase' }}>
              {coachName}
            </div>
            <div style={{ fontSize: 7, letterSpacing: 1.5, color: 'rgba(242,237,228,.3)', textTransform: 'uppercase', marginTop: 1 }}>
              {philLabel}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {trustPct !== null && (
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 7, color: 'rgba(242,237,228,.3)', letterSpacing: 1, textTransform: 'uppercase' }}>Confiança</div>
              <div style={{ fontSize: 10, color: trustColor, fontWeight: 700 }}>{trustPct}%</div>
            </div>
          )}
          <button
            onClick={onDismiss}
            style={{ background: 'none', border: 'none', color: 'rgba(242,237,228,.25)', cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: '2px 4px' }}
          >×</button>
        </div>
      </div>

      {/* Bloco 1: Relatório de execução anterior */}
      {hasReport && (
        <div style={{
          padding: '10px 14px',
          borderBottom: '1px solid rgba(255,255,255,.05)',
          background: 'rgba(0,0,0,.3)',
        }}>
          <div style={{ fontSize: 7, letterSpacing: 2, color: 'rgba(242,237,228,.3)', textTransform: 'uppercase', marginBottom: 6 }}>
            Instrução anterior · {INSTRUCTION_ICONS[report.instruction?.type] ?? '🎯'} {report.instruction?.label ?? '—'}
          </div>
          {report.complianceLabel && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 5 }}>
              <span style={{ fontSize: 10, color: diagMeta.color, flexShrink: 0, marginTop: 1 }}>{diagMeta.icon}</span>
              <div>
                <div style={{ fontSize: 9, color: 'rgba(242,237,228,.75)', lineHeight: 1.3 }}>
                  {report.complianceLabel}
                </div>
                {report.complianceDetail && (
                  <div style={{ fontSize: 7, color: 'rgba(242,237,228,.35)', marginTop: 1 }}>
                    {report.complianceDetail}
                  </div>
                )}
              </div>
            </div>
          )}
          {report.winRate?.delta !== null && report.winRate?.priorWR !== null && (
            <div style={{ fontSize: 7, color: report.winRate.delta >= 0.1 ? '#22c55e' : report.winRate.delta <= -0.1 ? '#ef4444' : '#E8C84A', marginBottom: 6, letterSpacing: .5 }}>
              PONTOS: {report.winRate.recentWR}%
              <span style={{ color: 'rgba(242,237,228,.3)' }}>
                {' '}(era {report.winRate.priorWR}% — {report.winRate.delta >= 0 ? '+' : ''}{Math.round(report.winRate.delta * 100)}pp)
              </span>
            </div>
          )}
          <div style={{
            padding: '6px 8px',
            background: `${diagMeta.color}0D`,
            border: `1px solid ${diagMeta.color}28`,
            fontSize: 8,
            color: diagMeta.color,
            fontStyle: 'italic',
            lineHeight: 1.4,
          }}>
            "{report.diagText}"
          </div>
        </div>
      )}

      {/* Bloco 2: Nova instrução */}
      <div style={{ padding: '10px 14px 12px' }}>
        <div style={{ fontSize: 7, letterSpacing: 2, color: 'rgba(242,237,228,.3)', textTransform: 'uppercase', marginBottom: 7 }}>
          Nova instrução
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {instructions.map((inst, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'flex-start', gap: 10,
              padding: '7px 10px',
              background: inst.priority === 'HIGH' ? `${philColor}12` : 'rgba(242,237,228,.03)',
              border: `1px solid ${inst.priority === 'HIGH' ? philColor + '40' : 'rgba(242,237,228,.07)'}`,
            }}>
              <span style={{ fontSize: 13, flexShrink: 0 }}>
                {INSTRUCTION_ICONS[inst.type] ?? '🎯'}
              </span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 9, color: inst.priority === 'HIGH' ? '#F2EDE4' : 'rgba(242,237,228,.6)', letterSpacing: .3, lineHeight: 1.35 }}>
                  {inst.label}
                </div>
                <div style={{ fontSize: 7, color: 'rgba(242,237,228,.25)', letterSpacing: 1, marginTop: 2 }}>
                  {inst.durationGames}g · {inst.priority}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes coachCardIn {
          from { opacity: 0; transform: translateX(-50%) translateY(18px) scale(0.95); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0)     scale(1);    }
        }
      `}</style>
    </div>
  );
}

// ── ShotLogPanel — log compacto de golpes para análise de Q% e velocidade ───
function ShotLogPanel({ gsRef, snap, onClose }) {
  const [events, setEvents] = useState([]);
  const scrollRef = useRef(null);
  const lastCountRef = useRef(0);

  useEffect(() => {
    const interval = setInterval(() => {
      const gs = gsRef?.current;
      if (!gs?.debugEvents) return;
      const evs = gs.debugEvents.filter(e => e.type === 'SHOT_EVENT');
      if (evs.length !== lastCountRef.current) {
        lastCountRef.current = evs.length;
        setEvents([...evs]);
      }
    }, 120);
    return () => clearInterval(interval);
  }, [gsRef]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [events]);

  const p0 = snap?.players?.[0];
  const p1 = snap?.players?.[1];
  const nameOf = (id) => (id === 0 ? p0 : p1)?.name?.split(' ').pop() ?? `P${id}`;
  const abbrOf = (id) => nameOf(id).slice(0, 8).toUpperCase();

  const qColor = (q) => q >= 0.70 ? RG.lime : q >= 0.50 ? '#FFD700' : q >= 0.30 ? RG.clayLight : '#FF4444';
  const shotLabel = (type) => {
    const map = { TOPSPIN:'TSP', FLAT:'FLT', SLICE:'SLC', VOLLEY:'VOL', HALF_VOLLEY:'HVL',
                  SMASH:'SMH', LOB_ATK:'LOB', LOB_DEF:'LDF', DROP:'DRP', PASSING:'PAS' };
    return map[type] ?? type?.slice(0,3) ?? '???';
  };

  const stats = [0, 1].map(id => {
    const mine = events.filter(e => e.playerId === id);
    if (!mine.length) return null;
    const avgQ = mine.reduce((a, e) => a + e.quality, 0) / mine.length;
    const avgKmh = mine.reduce((a, e) => a + e.power, 0) / mine.length;
    const maxKmh = Math.max(...mine.map(e => e.power));
    return { avgQ, avgKmh, maxKmh, n: mine.length };
  });

  const byType = {};
  events.forEach(e => {
    const k = `${e.playerId}:${e.shotType}`;
    if (!byType[k]) byType[k] = { playerId: e.playerId, type: e.shotType, qs: [], kmhs: [] };
    byType[k].qs.push(e.quality);
    byType[k].kmhs.push(e.power);
  });
  const typeRows = Object.values(byType).map(t => ({
    ...t,
    avgQ: t.qs.reduce((a, v) => a + v, 0) / t.qs.length,
    avgKmh: t.kmhs.reduce((a, v) => a + v, 0) / t.kmhs.length,
    n: t.qs.length,
  })).sort((a, b) => b.n - a.n);

  const monoStyle = { fontFamily: RG.mono };
  const th = { fontSize: 8, color: RG.textFaint, letterSpacing: 2, textTransform: 'uppercase', padding: '4px 6px', textAlign: 'left', borderBottom: `1px solid ${RG.border}` };
  const td = { fontSize: 10, padding: '3px 6px', borderBottom: `1px solid ${RG.border}22` };

  return (
    <div style={{
      position: 'fixed', top: 44, right: 240, bottom: 0, width: 460, zIndex: 180,
      background: RG.bgPanel, borderLeft: `1px solid ${RG.border}`, display: 'flex',
      flexDirection: 'column', ...monoStyle,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '8px 12px', borderBottom: `1px solid ${RG.borderMid}`, flexShrink: 0 }}>
        <span style={{ fontSize: 9, letterSpacing: 3, color: RG.lime, fontWeight: 700, textTransform: 'uppercase' }}>
          📊 Shot Analysis
        </span>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 9, color: RG.textFaint }}>{events.length} golpes</span>
          <button onClick={onClose} style={{
            background: 'none', border: `1px solid ${RG.border}`, color: RG.textFaint,
            fontSize: 10, cursor: 'pointer', padding: '2px 8px', fontFamily: RG.mono,
          }}>✕</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, background: RG.border, flexShrink: 0 }}>
        {[0, 1].map(id => {
          const s = stats[id];
          return (
            <div key={id} style={{ background: RG.bgPanel, padding: '8px 12px' }}>
              <div style={{ fontSize: 8, color: RG.textFaint, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 5 }}>
                {abbrOf(id)}
              </div>
              {s ? (
                <div style={{ display: 'flex', gap: 14 }}>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: qColor(s.avgQ), lineHeight: 1 }}>{Math.round(s.avgQ * 100)}%</div>
                    <div style={{ fontSize: 7, color: RG.textFaint, letterSpacing: 1, marginTop: 2 }}>AVG Q</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#00D4FF', lineHeight: 1 }}>{Math.round(s.avgKmh)}</div>
                    <div style={{ fontSize: 7, color: RG.textFaint, letterSpacing: 1, marginTop: 2 }}>AVG km/h</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: RG.white, lineHeight: 1 }}>{s.maxKmh}</div>
                    <div style={{ fontSize: 7, color: RG.textFaint, letterSpacing: 1, marginTop: 2 }}>MAX km/h</div>
                  </div>
                </div>
              ) : (
                <div style={{ fontSize: 9, color: RG.textFaint }}>—</div>
              )}
            </div>
          );
        })}
      </div>

      <ShotLogTabs events={events} typeRows={typeRows}
        abbrOf={abbrOf} shotLabel={shotLabel} qColor={qColor}
        th={th} td={td} monoStyle={monoStyle} scrollRef={scrollRef} />
    </div>
  );
}

function ShotLogTabs({ events, typeRows, abbrOf, shotLabel, qColor, th, td, monoStyle, scrollRef }) {
  const [tab, setTab] = useState('log');
  const tabBtn = (id, label) => (
    <button key={id} onClick={() => setTab(id)} style={{
      background: 'none', border: 'none', borderBottom: `2px solid ${tab === id ? RG.lime : 'transparent'}`,
      color: tab === id ? RG.lime : RG.textFaint, fontSize: 8, letterSpacing: 2, cursor: 'pointer',
      padding: '6px 14px', fontFamily: RG.mono, fontWeight: 700, textTransform: 'uppercase',
      transition: 'all 0.15s',
    }}>{label}</button>
  );

  return (
    <>
      <div style={{ display: 'flex', borderBottom: `1px solid ${RG.border}`, flexShrink: 0 }}>
        {tabBtn('log', 'Log')}
        {tabBtn('tipo', 'Por Tipo')}
      </div>

      {tab === 'log' && (
        <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', ...monoStyle }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>{['#','JOGADOR','GOLPE','DIR','Q%','km/h'].map(h => <th key={h} style={th}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {events.map((e, i) => (
                <tr key={i} style={{ background: i % 2 === 0 ? 'transparent' : `${RG.bgLight}88` }}>
                  <td style={{ ...td, color: RG.textFaint, fontSize: 8 }}>{i + 1}</td>
                  <td style={{ ...td, color: RG.white, fontSize: 9 }}>{abbrOf(e.playerId)}</td>
                  <td style={{ ...td, color: RG.white }}>{shotLabel(e.shotType)}</td>
                  <td style={{ ...td, color: e.dirLabel === 'CC' ? '#60C0FF' : e.dirLabel === 'DTL' ? RG.clayLight : RG.textFaint, fontSize: 9 }}>{e.dirLabel}</td>
                  <td style={{ ...td, color: qColor(e.quality), fontWeight: 700 }}>{Math.round(e.quality * 100)}%</td>
                  <td style={{ ...td, color: '#00D4FF' }}>{e.power}</td>
                </tr>
              ))}
              {events.length === 0 && (
                <tr><td colSpan={6} style={{ ...td, color: RG.textFaint, textAlign: 'center', padding: 20 }}>aguardando golpes...</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'tipo' && (
        <div style={{ flex: 1, overflowY: 'auto', ...monoStyle }}>
          {[0, 1].map(pid => {
            const rows = typeRows.filter(r => r.playerId === pid).sort((a, b) => b.n - a.n);
            if (!rows.length) return null;
            return (
              <div key={pid}>
                <div style={{ fontSize: 8, letterSpacing: 3, color: RG.textFaint, textTransform: 'uppercase',
                  padding: '8px 12px 4px', borderBottom: `1px solid ${RG.border}` }}>{abbrOf(pid)}</div>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>{['TIPO','N','AVG Q%','AVG km/h'].map(h => <th key={h} style={th}>{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => (
                      <tr key={i} style={{ background: i % 2 === 0 ? 'transparent' : `${RG.bgLight}88` }}>
                        <td style={{ ...td, color: RG.white, fontWeight: 700 }}>{r.type}</td>
                        <td style={{ ...td, color: RG.textFaint }}>{r.n}</td>
                        <td style={{ ...td, color: qColor(r.avgQ), fontWeight: 700 }}>{Math.round(r.avgQ * 100)}%</td>
                        <td style={{ ...td, color: '#00D4FF' }}>{Math.round(r.avgKmh)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })}
          {typeRows.length === 0 && (
            <div style={{ padding: 20, color: RG.textFaint, fontSize: 9, textAlign: 'center' }}>aguardando golpes...</div>
          )}
        </div>
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
export default function DefinitiveME({ gsRef, trailRef, snap, onMenu, simSpeed, setSimSpeed, speedRef,
                                       frameHistoryRef, bugMode, setBugMode, bugSpeedSaveRef,
                                       coachPool = [], tournamentId = null,
                                       universePlayerA = null, universePlayerB = null,
                                       disableCameraMotion = false }) {
  const canvasRef       = useRef(null);
  const CLRef           = useRef({});
  const animRef         = useRef(null);
  const dprRef          = useRef(1);

  // Particle systems
  const dustRef         = useRef([]);
  const sparksRef       = useRef([]);
  const shockwaveRef    = useRef([]);
  const footRef         = useRef([]);
  const flashRef        = useRef({ alpha:0, color:'#fff' });
  const rallyAtmRef     = useRef(0);
  const shakeRef        = useRef({ x:0, y:0, mag:0, t:0, dur:0 });
  const momentRef       = useRef({ type:null, alpha:0, pulse:0, label:'' });
  const freezeFrameRef  = useRef({ t:0, gs:null });
  const cameraRef       = useRef({ zoom:1, x:0, y:0 });
  const servePulseRef   = useRef({ t:0, dur:0, power:0 });
  const impactPulseRef  = useRef({ t:0, dur:0, power:0 });
  const prevRallyRef    = useRef(0);
  const prevServeRef    = useRef(false);

  // Offscreen layers
  const bgLayerRef      = useRef(null);
  const bgLayerCtxRef   = useRef(null);
  const courtLayerRef   = useRef(null);
  const courtLayerCtxRef = useRef(null);
  const courtLayerSurfRef= useRef(null);
  const crowdSeatsRef   = useRef(null);
  const crowdBlinkRef   = useRef([]);
  const crowdTimerRef   = useRef(0);
  // ── Fase 6: crowd wave + flags ────────────────────────────────────────
  const crowdWaveRef    = useRef(0);      // phase 0..2π
  const crowdWaveIntRef = useRef(0);      // intensity 0..1
  const celebStateRef   = useRef({});     // pid → { timer, maxTimer, series, color, isDestroidor, isMaquina }
  const flagsRef        = useRef([]);     // flag positions (built once)
  const crowdRoarRef    = useRef(0);      // burst alpha for ace/winner
  const crowdRoarDecRef = useRef(0);
  const crowdPeopleRef  = useRef([]);  // live animated crowd figures

  // Per-frame state
  const lastShotRef     = useRef([{ type:'ready', label:'—', color:'#fff' }, { type:'ready', label:'—', color:'#fff' }]);
  const lastSpeedRef    = useRef(0);
  const lastBounceRef   = useRef(0);
  const lastBallVelRef  = useRef({ x:0, y:0, z:0 });
  const facingAnglesRef = useRef({});
  // ── Shot Intent Overlay refs (sincronizados com bugOverlay state) ─────────
  const bugOverlayRef   = useRef(false);   // mirror de bugOverlay para o rAF loop
  const shotIntentRef   = useRef(null);    // { lastShotEvent, lastBouncePos } do frame atual
  const playerImagesRef = useRef({}); // preloaded player portrait images
  const ballMarksRef    = useRef([]); // clay ball marks [{x,y,rx,ry,angle,age,maxAge}]
  const wornLayerRef    = useRef(null); // offscreen worn-paths canvas (per surf, lazy built)
  const wearLayerRef     = useRef(null); // offscreen canvas que acumula desgaste gradual
  const wearLayerCtxRef  = useRef(null);
  const wearLayerSurfRef = useRef(null); // track surface para invalidar ao mudar
  const courtImgRef      = useRef({ img: null, loadedFor: null }); // imagem customizada de quadra (única)

  // Hit label pills (React overlay)
  const [hitLabels, setHitLabels]         = useState([]);
  const hitLabelTimerRef                   = useRef(null);
  const [outcomeLabels, setOutcomeLabels]  = useState([]);
  const outcomeLabelTimerRef               = useRef(null);

  const [soundOn, setSoundOn]                     = useState(() => isSoundOn());
  const [showSoundSettings, setShowSoundSettings] = useState(false);

  // FASE 6: Changeover card de técnico
  const [coachCard, setCoachCard] = useState(null); // { instructions, coachName, philosophy, executionReport, trust } | null
  const prevInstructionsRef = useRef([]); // instruções do changeover anterior para gerar relatório
  const matchLogRef = useRef([]); // log de pontos para CoachAnalyzer
  const prevTotalPointsRef = useRef(0); // detecta novo ponto para popular matchLog

  // ── Medical Time Out overlay ───────────────────────────────────────────────
  const [mtoOverlay, setMtoOverlay] = useState(null); // { playerName, injuryLabel, severity, canContinue } | null
  const prevMtoStateRef = useRef(false); // detecta transição MEDICAL_TIMEOUT

  // ── Modo Caça Bug ─────────────────────────────────────────────────────────
  const [bugOverlay, setBugOverlay]   = useState(false);
  const [rewindIdx,  setRewindIdx]    = useState(null); // null = live
  const rewindGsRef    = useRef(null);  // override for frame loop
  const rewindTrailRef = useRef(null);  // override trail for frame loop

  // ── Sync bugOverlay state → ref (acessível no rAF loop sem closure stale) ──
  React.useEffect(() => { bugOverlayRef.current = bugOverlay; }, [bugOverlay]);

  // ── Sync rewindIdx → shotIntentRef: lê dados do frame para o canvas overlay ──
  React.useEffect(() => {
    if (!bugOverlay) { shotIntentRef.current = null; return; }
    const hist = frameHistoryRef?.current ?? [];
    const frame = (rewindIdx !== null && hist[rewindIdx]) ? hist[rewindIdx]
                : (hist.length > 0 ? hist[hist.length - 1] : null);
    if (!frame) { shotIntentRef.current = null; return; }
    shotIntentRef.current = {
      lastShotEvent: frame.lastShotEvent ?? null,
      lastBouncePos: frame.lastBouncePos ?? null,
      players: frame.players ?? [],
    };
  }, [bugOverlay, rewindIdx]); // eslint-disable-line

  // ── Shot Log (análise compacta de golpes) ─────────────────────────────────
  const [showShotLog, setShowShotLog] = useState(false);

  // ── Layout calculator ─────────────────────────────────────────────────────
  function recalcLayout(W, H) {
    const topUI  = 52;
    const botUI  = 110;
    const sideUI = 220;
    const availW = W - sideUI * 2, availH = H - topUI - botUI;
    const ratio  = COURT_W_M / COURT_H_M;
    const SCALE  = 0.63;
    let cW = availW * SCALE, cH = cW / ratio;
    if (cH > availH * SCALE) { cH = availH * SCALE; cW = cH * ratio; }
    const cx = sideUI + (availW - cW) / 2;
    const cy = topUI  + (availH - cH) / 2;
    const WALL_T    = 14;
    const STAND_MIN = 32;
    const venue     = getVenueOverride(tournamentId);
    const rbScale   = venue.rbScale ?? 1.0;
    const rbW = Math.max(18, (cx - sideUI - WALL_T - STAND_MIN) * rbScale);
    const rbH = Math.max(18, (cy - topUI  - WALL_T - STAND_MIN) * rbScale);
    CLRef.current = {
      x:cx, y:cy, w:cW, h:cH,
      cx:cx+cW/2, cy:cy+cH/2,
      rbW, rbH,
      sTop: cy+(1.37/COURT_H_M)*cH,
      sBot: cy+cH-(1.37/COURT_H_M)*cH,
      srvL: cx+(6.4/COURT_W_M)*cW,
      srvR: cx+cW-(6.4/COURT_W_M)*cW,
      playerR: Math.max(9, Math.min(20, cH*0.8/COURT_H_M)),
      scaleW: cW/COURT_W_M,
      scaleH: cH/COURT_H_M,
    };
  }

  function toCanvas(courtY, courtX) {
    const CL = CLRef.current;
    return { x: CL.cx + courtY * CL.scaleW, y: CL.cy + courtX * CL.scaleH };
  }

  // ── Main effect ───────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // ── Preload player portrait images (fonte única: NAMED_PLAYERS[id].photo) ──
    // Escalonado: uma imagem a cada 80ms para evitar ERR_HTTP2_PROTOCOL_ERROR
    // quando o catbox.moe recebe 30+ requisições simultâneas no mount.
    const _preloadEntries = Object.entries(NAMED_PLAYERS);
    const _loadImage = (id, np, attempt = 0) => {
      const url = getPlayerPhoto(id);
      if (!url) return;
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        playerImagesRef.current[id] = img;
        const surname = (np.name || '').split(' ').pop().toUpperCase();
        playerImagesRef.current[surname] = img;
      };
      img.onerror = () => {
        // Retry uma vez após 2s em caso de falha de rede
        if (attempt === 0) setTimeout(() => _loadImage(id, np, 1), 2000);
      };
      img.src = url;
    };
    _preloadEntries.forEach(([id, np], i) => {
      setTimeout(() => _loadImage(id, np), i * 80);
    });

    function resize() {
      const dpr = window.devicePixelRatio || 1;
      dprRef.current = dpr;
      const cssW = window.innerWidth, cssH = window.innerHeight;
      canvas.width  = Math.round(cssW * dpr);
      canvas.height = Math.round(cssH * dpr);
      canvas.style.width  = cssW + 'px';
      canvas.style.height = cssH + 'px';
      recalcLayout(cssW, cssH);

      const bg = document.createElement('canvas');
      bg.width = cssW; bg.height = cssH;
      bgLayerRef.current    = bg;
      bgLayerCtxRef.current = bg.getContext('2d');

      const cl = document.createElement('canvas');
      cl.width = cssW; cl.height = cssH;
      courtLayerRef.current    = cl;
      courtLayerCtxRef.current = cl.getContext('2d');
      courtLayerSurfRef.current = null;

      // Create / resize the wearLayer (acumula desgaste — preserva conteúdo via drawImage)
      const wl = document.createElement('canvas');
      wl.width = cssW; wl.height = cssH;
      const wlCtx = wl.getContext('2d');
      if (wearLayerRef.current) {
        try { wlCtx.drawImage(wearLayerRef.current, 0, 0, cssW, cssH); } catch(_) {}
      }
      wearLayerRef.current    = wl;
      wearLayerCtxRef.current = wlCtx;

      crowdPeopleRef.current = buildCrowdPeople(cssW, cssH);    // live animated figures
      flagsRef.current = buildFlags(cssW, cssH);  // FASE 6: recalc flag positions
      drawStaticBG(bgLayerCtxRef.current, cssW, cssH);
    }
    resize();
    window.addEventListener('resize', resize);

    // ── CROWD — NEWME1.0 ─────────────────────────────────────────────────────
    function buildCrowdPeople(W, H) {
      const CL = CLRef.current;
      if (!CL.y) return [];
      const rand = mulberry32(0xF00DC0FF);
      const RB_H = CL.rbH || 50;
      const RB_W = CL.rbW || 50;
      const WALL = 18;

      // Stand boundaries (where crowd sits)
      const topMax   = CL.y - RB_H - WALL - 2;
      const botMin   = CL.y + CL.h + RB_H + WALL + 2;
      const leftMax  = Math.max(0, CL.x - RB_W - WALL - 2);
      const rightMin = CL.x + CL.w + RB_W + WALL + 2;

      // Vibrant fan gear — real stadium colors
      const BODY_COLORS = [
        '#1A3A8F','#0D2E78','#2244AA','#0F2060', // blues (majority)
        '#8B0000','#A01010','#CC1111','#7A0808', // reds
        '#FFFFFF','#F0F0F0','#E8E8E8',           // whites
        '#1A6B1A','#0D5A0D','#228B22',           // greens
        '#222222','#111111','#333333',           // darks
        '#D4A800','#C8960A','#FFD700',           // yellows/golds
        '#4A1A8F','#6A2AAA',                     // purples
        '#FF6600','#E05500',                     // oranges
      ];
      const HEAD_COLORS = [
        '#c89060','#d4a872','#be8858','#c8a068',
        '#e8c89a','#f0d0a8','#b89060',
        '#8a6040','#9a7050','#704830',
        '#f4d8b8','#e8ccaa','#d4b890',
        '#5a3820','#4a2a18',
      ];
      const ACCENT_COLORS = [
        '#FFD700','#FF2222','#4499FF','#00FFAA',
        '#FFFFFF','#FF8800','#00CCFF','#FF00FF',
      ];

      const people = [];
      const TOTAL  = 420; // NEWME: 260 → 420

      const topArea   = topMax > 10 ? W * Math.max(0, topMax - 8)    : 0;
      const botArea   = H - botMin > 10 ? W * Math.max(0, H - botMin - 8) : 0;
      const leftArea  = leftMax > 6 ? leftMax * Math.max(1, botMin - topMax) : 0;
      const rightArea = W - rightMin > 6 ? (W - rightMin) * Math.max(1, botMin - topMax) : 0;
      const totalArea = topArea + botArea + leftArea + rightArea || 1;

      const zoneData = [
        { zone:'top',   area: topArea },
        { zone:'bot',   area: botArea },
        { zone:'left',  area: leftArea },
        { zone:'right', area: rightArea },
      ];

      for (const { zone, area } of zoneData) {
        const n = Math.round((area / totalArea) * TOTAL);
        for (let i = 0; i < n; i++) {
          let x, y;
          if (zone === 'top' && topMax > 10) {
            x = 10 + rand() * (W - 20);
            y = 6  + rand() * Math.max(2, topMax - 8);
          } else if (zone === 'bot' && H - botMin > 10) {
            x = 10 + rand() * (W - 20);
            y = botMin + 4 + rand() * Math.max(2, H - botMin - 10);
          } else if (zone === 'left' && leftMax > 6) {
            x = 4 + rand() * Math.max(2, leftMax - 6);
            y = topMax + rand() * Math.max(1, botMin - topMax);
          } else if (zone === 'right' && W - rightMin > 6) {
            x = rightMin + 4 + rand() * Math.max(2, W - rightMin - 6);
            y = topMax + rand() * Math.max(1, botMin - topMax);
          } else { continue; }

          const r         = 3.0 + rand() * 2.0;
          const hasAccent = rand() < 0.25;
          const isVip     = rand() < 0.06;
          people.push({
            x, y,
            r: isVip ? r * 1.45 : r,
            bodyColor: hasAccent
              ? ACCENT_COLORS[Math.floor(rand() * ACCENT_COLORS.length)]
              : BODY_COLORS[Math.floor(rand() * BODY_COLORS.length)],
            headColor: HEAD_COLORS[Math.floor(rand() * HEAD_COLORS.length)],
            bob:      rand() * Math.PI * 2,
            spd:      0.016 + rand() * 0.040,
            active:   rand() < 0.55,   // 55% always animated (up from 42%)
            zone,
            hasPhone: rand() < 0.12,
          });
        }
      }
      return people;
    }

    function drawLiveCrowd(ctx, W, H, intensity, roar) {
      const people = crowdPeopleRef.current;
      if (!people || !people.length) return;
      const t = performance.now() * 0.001;

      const baseBob  = 1.8;
      const extraBob = intensity * 5.5 + roar * 9.0;
      const armThresh = 0.55 - intensity * 0.28 - roar * 0.35;

      ctx.save();
      people.forEach(p => {
        const phase = t * p.spd * 55 + p.bob;
        const sinV  = Math.sin(phase);

        const b = p.active
          ? sinV * (baseBob + extraBob)
          : sinV * (0.8 + roar * 4.0);

        const cheer = p.active && sinV > armThresh;

        // ── Body ──────────────────────────────────────────────────────
        ctx.globalAlpha = 0.80 + intensity * 0.15 + roar * 0.05;
        ctx.fillStyle = p.bodyColor;
        ctx.beginPath(); ctx.arc(p.x, p.y + b, p.r, 0, Math.PI * 2); ctx.fill();

        // ── Head ──────────────────────────────────────────────────────
        ctx.globalAlpha = 0.72 + intensity * 0.14 + roar * 0.06;
        ctx.fillStyle   = p.headColor;
        ctx.beginPath(); ctx.arc(p.x, p.y - p.r * 0.92 + b, p.r * 0.62, 0, Math.PI * 2); ctx.fill();

        // ── Raised arms ────────────────────────────────────────────────
        if (cheer) {
          const armA = Math.min(1, (sinV - armThresh) / (1 - armThresh));
          ctx.globalAlpha = 0.55 + armA * 0.35;
          ctx.strokeStyle = p.headColor;
          ctx.lineWidth   = Math.max(1.0, p.r * 0.65);
          ctx.lineCap     = 'round';
          ctx.beginPath();
          ctx.moveTo(p.x - p.r,       p.y + b);
          ctx.lineTo(p.x - p.r * 2.1, p.y - p.r * 1.9 + b - armA * 1.5);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(p.x + p.r,       p.y + b);
          ctx.lineTo(p.x + p.r * 2.1, p.y - p.r * 1.9 + b - armA * 1.5);
          ctx.stroke();

          // ── Phone flash ───────────────────────────────────────────────
          if (p.hasPhone && Math.sin(t * 5.2 + p.bob * 4.7) > 0.55) {
            const fa = 0.55 + roar * 0.40;
            ctx.globalAlpha = fa;
            ctx.fillStyle   = '#d0e8ff';
            ctx.beginPath();
            ctx.arc(p.x + p.r * 1.7, p.y - p.r * 2.2 + b, p.r * 0.42, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = fa * 0.28;
            ctx.fillStyle   = '#aad0ff';
            ctx.beginPath();
            ctx.arc(p.x + p.r * 1.7, p.y - p.r * 2.2 + b, p.r * 1.0, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      });
      ctx.globalAlpha = 1;
      ctx.restore();
    }


    function drawStaticBG(bgCtx, W, H) {
      const CL = CLRef.current;
      bgCtx.clearRect(0,0,W,H);
      // NEWME1.0: Pure black arena background
      bgCtx.fillStyle = '#000000';
      bgCtx.fillRect(0,0,W,H);
      if (!CL.y) return;

      const WALL = 18;
      const RB_W = CL.rbW || 50;
      const RB_H = CL.rbH || 50;

      // Stand zone boundaries
      const topStandBot  = CL.y - RB_H - WALL;
      const botStandTop  = CL.y + CL.h + RB_H + WALL;
      const leftStandW   = Math.max(0, CL.x - RB_W - WALL);
      const rightStandX  = CL.x + CL.w + RB_W + WALL;
      const rightStandW  = Math.max(0, W - rightStandX);
      const sideStandH   = botStandTop - topStandBot;

      // ── STAND ZONES ───────────────────────────────────────────────────────
      if (topStandBot > 0)   drawStands(bgCtx, 0, 0, W, topStandBot, 'top');
      if (H - botStandTop > 0) drawStands(bgCtx, 0, botStandTop, W, H - botStandTop, 'bot');
      if (leftStandW > 0)    drawStands(bgCtx, 0, topStandBot, leftStandW, sideStandH, 'left');
      if (rightStandW > 0)   drawStands(bgCtx, rightStandX, topStandBot, rightStandW, sideStandH, 'right');

      // ── ADVERTISING WALLS (top/bot baseline + side walls) ─────────────────
      drawAdvertisingWall(bgCtx, 0,                   CL.y - RB_H - WALL, W,    WALL, 'h');
      drawAdvertisingWall(bgCtx, 0,                   CL.y + CL.h + RB_H, W,    WALL, 'h');
      drawAdvertisingWall(bgCtx, CL.x - RB_W - WALL, CL.y - RB_H,        WALL, CL.h + RB_H*2, 'v');
      drawAdvertisingWall(bgCtx, CL.x + CL.w + RB_W, CL.y - RB_H,        WALL, CL.h + RB_H*2, 'v');

      // ── FLOODLIGHT GLOW (static soft cones from towers) ──────────────────
      drawFloodlightTowers(bgCtx, W, H);
    }

    // ── NEWME1.0: Dark concrete arena stands ────────────────────────────────
    function drawStands(bgCtx, sx, sy, sw, sh, zone) {
      if (sh <= 0 || sw <= 0) return;
      const rand = mulberry32(0xBBCCDD11 + (zone === 'top' ? 1 : zone === 'bot' ? 2 : zone === 'left' ? 3 : 4));

      // Pure black base
      bgCtx.fillStyle = '#000000';
      bgCtx.fillRect(sx, sy, sw, sh);

      const isSide = zone === 'left' || zone === 'right';

      // 3 tiers: each separated by a dark concrete aisle
      const TIER_COUNT = 3;
      const tierH = sh / TIER_COUNT;
      const AISLE_H = Math.max(3, tierH * 0.10);
      const ROW_H   = Math.max(6, Math.min(10, (tierH - AISLE_H) / 7));

      // Section seat-block colors — real stadium palette (navy, red, gray, silver)
      const SECTION_PALETTE = [
        '#0D1F55', '#112268', '#0A1840',  // navy sections
        '#6B0000', '#7A0A0A', '#550000',  // red sections
        '#1A1A1A', '#222222', '#151515',  // dark gray sections
        '#1A1A3A', '#12124A',             // dark blue-purple
      ];

      for (let tier = 0; tier < TIER_COUNT; tier++) {
        const tierTop  = zone === 'top'
          ? sy + sh - (tier + 1) * tierH
          : sy + tier * tierH;
        const tierRows = Math.floor((tierH - AISLE_H) / ROW_H);

        // Aisle between tiers (dark concrete strip)
        const aisleY = zone === 'top'
          ? tierTop + tierH - AISLE_H
          : tierTop;
        bgCtx.fillStyle = '#0a0a0a';
        bgCtx.fillRect(sx, aisleY, sw, AISLE_H);
        bgCtx.fillStyle = 'rgba(255,255,255,0.05)';
        bgCtx.fillRect(sx, aisleY, sw, 1);

        // Seat rows in this tier
        for (let row = 0; row < tierRows; row++) {
          const ry = zone === 'top'
            ? tierTop + (tierRows - 1 - row) * ROW_H
            : aisleY + AISLE_H + row * ROW_H;

          // Step background
          bgCtx.fillStyle = row % 2 === 0 ? '#0c0c0c' : '#080808';
          bgCtx.fillRect(sx, ry, sw, ROW_H);

          const SEAT_W  = Math.max(7, Math.min(11, ROW_H * 1.05));
          const SEAT_H  = ROW_H * 0.65;
          const seatY   = ry + ROW_H * 0.20;
          const NCOLS   = Math.floor(sw / SEAT_W);
          // Each section is ~10 cols wide with a consistent color
          const sectionOffset = (tier * 3 + row) * 7;

          for (let col = 0; col < NCOLS; col++) {
            const sx2 = sx + col * SEAT_W + SEAT_W * 0.08;
            const sw2 = SEAT_W * 0.84;
            const secIdx = Math.floor((col + sectionOffset) / 10) % SECTION_PALETTE.length;
            const isOccupied = rand() > 0.08;
            const brightness  = 0.50 + rand() * 0.42;

            bgCtx.save();
            bgCtx.globalAlpha = isOccupied ? brightness : brightness * 0.45;
            bgCtx.fillStyle = SECTION_PALETTE[secIdx];
            bgCtx.fillRect(sx2, seatY, sw2, SEAT_H);

            if (isOccupied && SEAT_H > 3) {
              // Person head
              bgCtx.globalAlpha = brightness * 0.80;
              const skinTone = rand() > 0.5 ? '#d4a870' : '#c89060';
              bgCtx.fillStyle = skinTone;
              bgCtx.beginPath();
              bgCtx.arc(sx2 + sw2 * 0.5, seatY - 1.2, sw2 * 0.24, 0, Math.PI * 2);
              bgCtx.fill();
            }
            bgCtx.restore();
          }
        }

        // Floodlight housing bar at top of each tier (top/bot stands only)
        if (!isSide && tier === TIER_COUNT - 1) {
          const barY = zone === 'top' ? tierTop : tierTop + tierH - 6;
          bgCtx.fillStyle = '#111111';
          bgCtx.fillRect(sx, barY, sw, 6);
          // Light units
          const N_LIGHTS = Math.floor(sw / 80);
          for (let li = 0; li < N_LIGHTS; li++) {
            const lx = sx + sw * (0.05 + li * (0.90 / Math.max(1, N_LIGHTS - 1)));
            bgCtx.fillStyle = '#1a1a1a';
            bgCtx.fillRect(lx - 18, barY, 36, 6);
            for (let dl = 0; dl < 4; dl++) {
              bgCtx.fillStyle = 'rgba(255,245,200,0.30)';
              bgCtx.beginPath();
              bgCtx.arc(lx - 9 + dl * 6, barY + 3, 1.8, 0, Math.PI * 2);
              bgCtx.fill();
            }
          }
        }
      }

      // VIP section: first row closest to court — slightly warmer color
      const vipY = zone === 'top' ? sy + sh - ROW_H - AISLE_H : sy + AISLE_H;
      bgCtx.save();
      bgCtx.globalAlpha = 0.35;
      bgCtx.fillStyle = '#2A1800';
      bgCtx.fillRect(sx, vipY, sw, ROW_H);
      bgCtx.globalAlpha = 0.18;
      bgCtx.fillStyle = '#FFD700';
      bgCtx.fillRect(sx, vipY, sw, 2);
      bgCtx.restore();
    }

    // ── NEWME1.0: Advertising boards on walls ──────────────────────────────────
    function drawAdvertisingWall(bgCtx, wx, wy, ww, wh, orient) {
      // Base wall
      bgCtx.fillStyle = '#0a0a0a';
      bgCtx.fillRect(wx, wy, ww, wh);

      // Ad panels: alternating brand colors
      const AD_COLORS = [
        { bg:'#005288', text:'#FFFFFF' },  // deep blue
        { bg:'#8B0000', text:'#FFFFFF' },  // dark red
        { bg:'#1A5C1A', text:'#FFFFFF' },  // dark green
        { bg:'#1A1A6E', text:'#FFFFFF' },  // navy
        { bg:'#5A3E00', text:'#FFD700' },  // dark gold
        { bg:'#2A0A2A', text:'#FF88FF' },  // purple
        { bg:'#003322', text:'#00FF88' },  // dark teal
        { bg:'#1A0000', text:'#FF4444' },  // dark red alt
      ];
      const AD_LABELS = ['ROLEX','OPPO','IBM','INFOSYS','NITTO','LAVAZZA','HEINEKEN','EMIRATES'];

      if (orient === 'h') {
        // Horizontal wall — panels side by side
        const N = 8;
        const pw = ww / N;
        for (let i = 0; i < N; i++) {
          const ac = AD_COLORS[i % AD_COLORS.length];
          bgCtx.fillStyle = ac.bg;
          bgCtx.fillRect(wx + i * pw, wy, pw - 1, wh);
          if (wh >= 8) {
            bgCtx.fillStyle = ac.text;
            bgCtx.font = `bold ${Math.max(6, wh * 0.55)}px 'Space Mono', monospace`;
            bgCtx.textAlign = 'center';
            bgCtx.textBaseline = 'middle';
            bgCtx.globalAlpha = 0.80;
            bgCtx.fillText(AD_LABELS[i % AD_LABELS.length], wx + i * pw + pw / 2, wy + wh / 2);
            bgCtx.globalAlpha = 1;
          }
        }
      } else {
        // Vertical wall — panels stacked
        const N = Math.min(6, Math.floor(wh / 24));
        const ph = wh / Math.max(N, 1);
        for (let i = 0; i < N; i++) {
          const ac = AD_COLORS[i % AD_COLORS.length];
          bgCtx.fillStyle = ac.bg;
          bgCtx.fillRect(wx, wy + i * ph, ww, ph - 1);
          if (ww >= 10) {
            bgCtx.save();
            bgCtx.translate(wx + ww / 2, wy + i * ph + ph / 2);
            bgCtx.rotate(-Math.PI / 2);
            bgCtx.fillStyle = ac.text;
            bgCtx.font = `bold ${Math.max(5, ww * 0.45)}px 'Space Mono', monospace`;
            bgCtx.textAlign = 'center';
            bgCtx.textBaseline = 'middle';
            bgCtx.globalAlpha = 0.80;
            bgCtx.fillText(AD_LABELS[i % AD_LABELS.length], 0, 0);
            bgCtx.globalAlpha = 1;
            bgCtx.restore();
          }
        }
      }

      // Bright edge highlight toward court
      bgCtx.fillStyle = 'rgba(255,255,255,0.14)';
      if (orient === 'h') {
        bgCtx.fillRect(wx, wy + wh - 1.5, ww, 1.5);
      } else {
        bgCtx.fillRect(orient === 'v' ? wx + ww - 1.5 : wx, wy, 1.5, wh);
      }
    }

    // ── NEWME1.0: Floodlight towers (6 towers, static glow) ──────────────────
    function drawFloodlightTowers(bgCtx, W, H) {
      const CL = CLRef.current;
      if (!CL.y) return;

      // 6 tower positions (3 per long side, slightly above top stand)
      const towerY = CL.y * 0.15; // very top of screen
      const towers = [
        { x: W * 0.15, y: towerY },
        { x: W * 0.50, y: towerY },
        { x: W * 0.85, y: towerY },
        { x: W * 0.15, y: H - towerY },
        { x: W * 0.50, y: H - towerY },
        { x: W * 0.85, y: H - towerY },
      ];

      towers.forEach(({ x, y }) => {
        // Subtle fan beam toward court center
        const tx = CL.cx, ty = CL.cy;
        const dist = Math.hypot(tx - x, ty - y);
        const coneHalfW = dist * 0.22;
        const ang = Math.atan2(ty - y, tx - x);
        const perp = ang + Math.PI / 2;

        bgCtx.save();
        bgCtx.globalAlpha = 0.042;
        const bx1 = tx + Math.cos(perp) * coneHalfW;
        const by1 = ty + Math.sin(perp) * coneHalfW;
        const bx2 = tx - Math.cos(perp) * coneHalfW;
        const by2 = ty - Math.sin(perp) * coneHalfW;
        const grad = bgCtx.createLinearGradient(x, y, tx, ty);
        grad.addColorStop(0,   'rgba(255,245,200,0)');
        grad.addColorStop(0.3, 'rgba(255,245,200,0.75)');
        grad.addColorStop(1,   'rgba(255,245,200,0)');
        bgCtx.fillStyle = grad;
        bgCtx.beginPath();
        bgCtx.moveTo(x, y);
        bgCtx.lineTo(bx1, by1);
        bgCtx.lineTo(bx2, by2);
        bgCtx.closePath();
        bgCtx.fill();
        bgCtx.restore();
      });
    }


    function updateCrowdBlink(W, H) {
      const now = performance.now();
      const gs = gsRef.current;
      const dt2 = 1/60;

      // ── FASE 6: crowd wave intensity driven by rally ─────────────────
      const rally3 = gs?.rally ?? 0;
      const targetWaveInt = clamp((rally3 - 4) / 12, 0, 1);
      crowdWaveIntRef.current = lerp(crowdWaveIntRef.current, targetWaveInt, 0.04);
      crowdWaveRef.current = (crowdWaveRef.current + dt2 * (0.8 + crowdWaveIntRef.current * 1.4)) % (Math.PI * 2);

      // ── FASE 6: roar burst (ace/winner) ─────────────────────────────
      if (crowdRoarDecRef.current > 0) {
        crowdRoarRef.current = Math.max(0, crowdRoarRef.current - dt2 * crowdRoarDecRef.current);
        if (crowdRoarRef.current <= 0) crowdRoarDecRef.current = 0;
      }

      // Blink individual seats (phone flashes, wave highlights)
      if (now - crowdTimerRef.current < 600) return;
      crowdTimerRef.current = now;
      const bgCtx = bgLayerCtxRef.current;
      const seats = crowdSeatsRef.current;
      if (!bgCtx || !seats) return;

      // Wave: highlight seats along the wave front
      const wavePhase = crowdWaveRef.current;
      const waveInt   = crowdWaveIntRef.current;
      if (waveInt > 0.08) {
        seats.forEach((s, i) => {
          // Map seat X position to a wave phase
          const seatPhase = (s.x / (W || 1)) * Math.PI * 4;
          const waveDist  = Math.abs(Math.sin(wavePhase - seatPhase));
          if (waveDist > 0.82) {
            // Seat is in the wave crest — briefly light up (stand + sit animation)
            bgCtx.save();
            bgCtx.globalAlpha = waveInt * waveDist * 0.55;
            // Simulate stand-up: draw slightly above normal position
            bgCtx.fillStyle = `rgba(240,225,180,0.9)`;  // skin/shirt color
            bgCtx.beginPath(); bgCtx.arc(s.x, s.y - 2.5, s.r * 1.15, 0, Math.PI*2); bgCtx.fill();
            bgCtx.restore();
          }
        });
      }

      // Random phone flashes + seat blinks
      const count = 6 + Math.floor(Math.random()*10) + Math.floor(waveInt * 8);
      for (let i = 0; i < count; i++) {
        const idx = crowdBlinkRef.current[Math.floor(Math.random()*crowdBlinkRef.current.length)];
        if (idx === undefined) continue;
        const s = seats[idx];
        const rowColor = Math.floor(s.y/8)%2===0 ? '#1a2a1a' : '#0e160e';
        bgCtx.fillStyle = rowColor; bgCtx.beginPath(); bgCtx.arc(s.x,s.y,s.r+2,0,Math.PI*2); bgCtx.fill();
        const isFlash = Math.random() < 0.30;
        s.brightness = isFlash ? 0.85+Math.random()*0.15 : 0.25+Math.random()*0.40;
        bgCtx.fillStyle = isFlash ? `rgba(200,230,255,${s.brightness})` : `rgba(180,60,50,${s.brightness*0.8})`;
        bgCtx.beginPath(); bgCtx.arc(s.x,s.y,s.r,0,Math.PI*2); bgCtx.fill();
      }
    }

    // ── FASE 6: Bandeiras nas arquibancadas ──────────────────────────────────
    function buildFlags(W, H) {
      const CL = CLRef.current;
      if (!CL.y) return [];
      const RB_H = CL.rbH || 60;
      const WALL = 14;
      const topAisleY = CL.y - RB_H - WALL - 4; // bottom of top stands = aisle row
      const botAisleY = CL.y + CL.h + RB_H + WALL + 4;
      const rand = mulberry32(0xF1A65E);
      const flags = [];
      // Top stand flags — spread along width
      for (let i = 0; i < 9; i++) {
        const x = W * (0.06 + i * 0.10);
        const color = ['#C4572A','#A8C832','#FFD700','#00D4FF','#FF4444','#FFFFFF',
                        '#FF8844','#4488FF','#00FF88'][i % 9];
        flags.push({ x, y: topAisleY - 18, color, seedOff: rand()*100, zone:'top' });
      }
      // Bottom stand flags
      for (let i = 0; i < 9; i++) {
        const x = W * (0.06 + i * 0.10);
        const color = ['#FFD700','#C4572A','#00D4FF','#A8C832','#FF4444','#FFFFFF',
                        '#4488FF','#FF8844','#00FF88'][(i+3) % 9];
        flags.push({ x, y: botAisleY + 12, color, seedOff: rand()*100, zone:'bot' });
      }
      return flags;
    }

    function drawFlags(ctx, W, H, wavePhase, waveInt) {
      if (!flagsRef.current.length) flagsRef.current = buildFlags(W, H);
      const now = performance.now() * 0.001;
      const flags = flagsRef.current;
      ctx.save();
      flags.forEach(f => {
        // Flag wave: sinusoidal flutter, amplitude grows with wave intensity
        const flutter = 0.3 + waveInt * 0.7;
        const angle = Math.sin(now * 2.2 + f.seedOff) * 0.22 * flutter;
        const poleH = 18;
        const flagW = 12, flagH = 7;
        ctx.save();
        ctx.translate(f.x, f.y);
        // Pole
        ctx.strokeStyle = 'rgba(180,170,150,0.70)';
        ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -poleH); ctx.stroke();
        // Flag body (trapezoid, wavy)
        ctx.save();
        ctx.translate(0, -poleH);
        ctx.rotate(angle);
        // Flag gradient: solid color + shadow edge
        const fg = ctx.createLinearGradient(0, 0, flagW, 0);
        fg.addColorStop(0, f.color);
        fg.addColorStop(0.6, f.color);
        fg.addColorStop(1, `${f.color}88`);
        ctx.fillStyle = fg;
        ctx.globalAlpha = 0.72 + waveInt * 0.18;
        // Wavy flag shape
        ctx.beginPath();
        ctx.moveTo(0, 0);
        const mid = flagW * 0.5;
        const wave2 = Math.sin(now * 3.5 + f.seedOff) * 1.8 * flutter;
        ctx.bezierCurveTo(mid * 0.5, wave2, mid, wave2 * 0.6, flagW, flagH * 0.4);
        ctx.lineTo(flagW, flagH);
        ctx.bezierCurveTo(mid, flagH + Math.abs(wave2) * 0.5, mid * 0.5, flagH - wave2 * 0.5, 0, flagH);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
        ctx.restore();
      });
      ctx.restore();
    }

    // ── FASE 6: Crowd roar flash overlay (after ace/winner) ──────────────────
    function triggerCrowdRoar() {
      crowdRoarRef.current = 1.0;
      crowdRoarDecRef.current = 1.4; // decays fully in ~0.7s
    }

    function drawCrowdRoarOverlay(ctx, W, H) {
      const roar = crowdRoarRef.current;
      if (roar < 0.02) return;
      const CL = CLRef.current;
      ctx.save();
      // Warm glow rising from stands into court area
      const rg = ctx.createRadialGradient(W/2, CL.y ?? H*0.3, 10, W/2, CL.y ?? H*0.3, H * 0.55);
      rg.addColorStop(0, 'rgba(255,255,255,0)');
      rg.addColorStop(0.55, `rgba(255,220,100,${roar * 0.04})`);
      rg.addColorStop(1, `rgba(255,160,50,${roar * 0.10})`);
      ctx.fillStyle = rg;
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }

    // ── Particles ─────────────────────────────────────────────────────────

    // paintWear: acumula marcas de desgaste no canvas persistente
    function paintWear(x, y, radiusX, radiusY, alpha, surfId) {
      const wCtx = wearLayerCtxRef.current;
      if (!wCtx) return;
      if (wearLayerSurfRef.current !== surfId) {
        wCtx.clearRect(0, 0, wearLayerRef.current.width, wearLayerRef.current.height);
        wearLayerSurfRef.current = surfId;
      }
      wCtx.save();
      wCtx.globalCompositeOperation = 'source-over';
      wCtx.globalAlpha = alpha;
      const g = wCtx.createRadialGradient(x, y, 0, x, y, Math.max(radiusX, radiusY));
      g.addColorStop(0,   'rgba(0,0,0,0.55)');
      g.addColorStop(0.4, 'rgba(0,0,0,0.18)');
      g.addColorStop(1,   'rgba(0,0,0,0.00)');
      wCtx.fillStyle = g;
      wCtx.save();
      wCtx.scale(1, radiusY / radiusX);
      wCtx.beginPath();
      wCtx.arc(x, y * (radiusX / radiusY), radiusX, 0, Math.PI * 2);
      wCtx.fill();
      wCtx.restore();
      wCtx.restore();
    }

    function spawnDust(pos, surf, speed = 1.0) {
      const count = Math.round(10 + speed * 14);
      for (let i = 0; i < count; i++) {
        const a   = (Math.random() - 0.5) * Math.PI * 1.6;
        const s   = (0.8 + Math.random() * 2.8) * Math.max(0.5, speed * 0.7);
        const big = i < 4;
        dustRef.current.push({
          x: pos.x + (Math.random()-0.5)*10, y: pos.y + (Math.random()-0.5)*4,
          vx: Math.cos(a)*s, vy: Math.sin(a)*s*0.35 - 0.6 - Math.random()*0.4,
          rot: Math.random()*Math.PI*2, rotV: (Math.random()-0.5)*0.18,
          rx: big ? 8+Math.random()*14 : 3+Math.random()*9,
          ry: big ? 5+Math.random()*9  : 2+Math.random()*5,
          life: 1, decay: big ? 0.018+Math.random()*0.018 : 0.032+Math.random()*0.04,
          color: surf.dust, alpha: big ? 0.28 : 0.42,
        });
      }
      for (let i = 0; i < Math.round(speed*5); i++) {
        const a = Math.random()*Math.PI*2, s = 3+Math.random()*5*speed;
        dustRef.current.push({
          x: pos.x, y: pos.y, vx: Math.cos(a)*s, vy: Math.sin(a)*s*0.25-1,
          rot: 0, rotV: 0, rx: 1.5, ry: 1.5,
          life: 1, decay: 0.06+Math.random()*0.06, color: surf.dust, alpha: 0.55,
        });
      }
    }
    function spawnSparks(pos, color, quality=0.5, dir=0) {
      const count = Math.round(10 + quality*18);
      for (let i = 0; i < count; i++) {
        const spread = Math.PI*0.55, baseAngle = dir+(Math.random()-0.5)*spread;
        const spd = (2+Math.random()*6)*(0.5+quality*0.8);
        const len = 1.5 + quality*4*Math.random();
        sparksRef.current.push({
          x: pos.x, y: pos.y,
          vx: Math.cos(baseAngle)*spd, vy: Math.sin(baseAngle)*spd*0.45,
          life: 1, decay: 0.055+Math.random()*0.08,
          r: 1.2+Math.random()*2.2, len, angle: baseAngle, color,
          glow: quality > 0.65,
        });
      }
      sparksRef.current.push({
        x: pos.x, y: pos.y, vx: 0, vy: 0,
        life: 1, decay: 0.09, r: 0, maxR: 18+quality*22, isBurst: true, color,
      });
    }
    function spawnShockwave(pos, surfColor, speed=1.0) {
      shockwaveRef.current.push({ x:pos.x, y:pos.y, r:3, maxR:20+speed*28, life:1, decay:0.048, color:surfColor, lineW:2.5 });
      if (speed > 0.3) {
        shockwaveRef.current.push({ x:pos.x, y:pos.y, r:2, maxR:10+speed*14, life:1, decay:0.09, color:surfColor, lineW:1.2, inner:true });
      }
    }
    function spawnFoot(pos, color, angle=0) {
      footRef.current.push({ x:pos.x, y:pos.y, life:1, decay:0.004, color, angle, rx:5, ry:2.5 });
      if (footRef.current.length > 120) footRef.current.splice(0,20);
    }
    function updateParticles() {
      for (let i = dustRef.current.length-1; i >= 0; i--) {
        const p = dustRef.current[i];
        p.x+=p.vx; p.y+=p.vy; p.vx*=0.86; p.vy=p.vy*0.86+0.06; p.rot+=p.rotV;
        p.life-=p.decay; if(p.life<=0) dustRef.current.splice(i,1);
      }
      for (let i = sparksRef.current.length-1; i >= 0; i--) {
        const p = sparksRef.current[i];
        if (!p.isBurst) { p.x+=p.vx; p.y+=p.vy; p.vx*=0.84; p.vy=p.vy*0.84+0.05; }
        else { p.r=lerp(p.r,p.maxR,0.15); }
        p.life-=p.decay; if(p.life<=0) sparksRef.current.splice(i,1);
      }
      for (let i = shockwaveRef.current.length-1; i >= 0; i--) {
        const p = shockwaveRef.current[i];
        p.r=lerp(p.r,p.maxR,0.13); p.life-=p.decay;
        if(p.life<=0) shockwaveRef.current.splice(i,1);
      }
      for (let i = footRef.current.length-1; i >= 0; i--) {
        footRef.current[i].life-=footRef.current[i].decay;
        if(footRef.current[i].life<=0) footRef.current.splice(i,1);
      }
    }

    // ── Background ────────────────────────────────────────────────────────
    function drawBG(ctx, W, H, surf) {
      // Static bg layer (stands + advertising walls + spotlight towers)
      if (bgLayerRef.current) {
        ctx.drawImage(bgLayerRef.current, 0, 0);
      } else {
        ctx.fillStyle = '#000000'; ctx.fillRect(0,0,W,H);
      }

      const CL = CLRef.current;
      if (!CL.x) return;

      const WALL = 18;
      const surfKey = surf===SURF.CLAY?'CLAY':surf===SURF.GRASS?'GRASS':surf===SURF.INDOOR?'INDOOR':'HARD';
      const VC = {
        CLAY:   { outer:'#AA3310', outerDark:'#882A0A', accent:'#C4572A' },
        GRASS:  { outer:'#1A5C20', outerDark:'#114018', accent:'#2A8830' },
        HARD:   { outer:'#0E3E84', outerDark:'#092E6A', accent:'#1855A8' },
        INDOOR: { outer:'#18188A', outerDark:'#101068', accent:'#2828AA' },
      }[surfKey];

      // Venue override on outer court / bloom
      const venue = getVenueOverride(tournamentId);
      if (venue.runbackColor) {
        VC.outer     = venue.runbackColor;
        VC.outerDark = darken(venue.runbackColor, 0.08);
      }
      const bloomRgb = venue.floodTint ?? surf.rgb;

      // ── OUTER COURT (runback zone — same surface color) ──────────────
      const RB_W = CL.rbW || 50;
      const RB_H = CL.rbH || 50;
      const outerX = CL.x - RB_W, outerY = CL.y - RB_H;
      const outerW = CL.w + RB_W*2, outerH = CL.h + RB_H*2;

      const rbg = ctx.createLinearGradient(outerX, outerY, outerX, outerY + outerH);
      rbg.addColorStop(0,   VC.outerDark);
      rbg.addColorStop(0.5, VC.outer);
      rbg.addColorStop(1,   VC.outerDark);
      ctx.fillStyle = rbg;
      ctx.fillRect(outerX, outerY, outerW, outerH);

      // ── FLOODLIT CENTER BLOOM — NEWME1.0 stronger atmosphere ─────────
      // Bright hot center, rapid falloff to dark arena (like real night session)
      const bloomR = Math.max(outerW, outerH) * 0.75;
      const bloom = ctx.createRadialGradient(CL.cx, CL.cy, 0, CL.cx, CL.cy, bloomR);
      bloom.addColorStop(0,    `rgba(${bloomRgb},0.30)`);
      bloom.addColorStop(0.35, `rgba(${bloomRgb},0.14)`);
      bloom.addColorStop(0.65, `rgba(${bloomRgb},0.05)`);
      bloom.addColorStop(1,    'transparent');
      ctx.fillStyle = bloom;
      ctx.fillRect(outerX - 20, outerY - 20, outerW + 40, outerH + 40);

      // Warm white overhead glow (floodlight color temperature)
      const warmGlow = ctx.createRadialGradient(CL.cx, CL.cy, 0, CL.cx, CL.cy, bloomR * 0.5);
      warmGlow.addColorStop(0,   'rgba(255,248,230,0.06)');
      warmGlow.addColorStop(0.5, 'rgba(255,248,230,0.02)');
      warmGlow.addColorStop(1,   'transparent');
      ctx.fillStyle = warmGlow;
      ctx.fillRect(outerX, outerY, outerW, outerH);

      // Wall inner edges — hard shadow between runback and stands
      ctx.fillStyle = 'rgba(0,0,0,0.65)';
      ctx.fillRect(outerX, outerY - 3, outerW, 3);
      ctx.fillRect(outerX, outerY + outerH, outerW, 3);
    }

    // ── Atmosphere ────────────────────────────────────────────────────────
    function drawAtmosphere(ctx, W, H, CL, rallyIntensity) {
      // ── Vignette: tighter focus on court centre ──────────────────────────
      const vigR0 = W * (0.12 + rallyIntensity * 0.04);  // tighter inner radius in rally
      const vig = ctx.createRadialGradient(W/2, CL.cy, vigR0, W/2, CL.cy, W * 0.72);
      vig.addColorStop(0, 'transparent');
      vig.addColorStop(0.65, `rgba(0,0,0,${0.18 + rallyIntensity * 0.08})`);
      vig.addColorStop(1, `rgba(0,0,0,${0.62 + rallyIntensity * 0.22})`);
      ctx.fillStyle = vig; ctx.fillRect(0,0,W,H);

      // ── Court edge shadow: top/bottom inner-shadow feel ──────────────────
      if (CL.y) {
        const topShadow = ctx.createLinearGradient(0, CL.y, 0, CL.y + CL.h * 0.12);
        topShadow.addColorStop(0, 'rgba(0,0,0,0.22)');
        topShadow.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = topShadow;
        ctx.fillRect(CL.x - CL.rbW, CL.y, CL.w + CL.rbW*2, CL.h * 0.12);

        const botShadow = ctx.createLinearGradient(0, CL.y + CL.h, 0, CL.y + CL.h * 0.88);
        botShadow.addColorStop(0, 'rgba(0,0,0,0.22)');
        botShadow.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = botShadow;
        ctx.fillRect(CL.x - CL.rbW, CL.y + CL.h * 0.88, CL.w + CL.rbW*2, CL.h * 0.12);
      }
      ctx.save(); ctx.globalAlpha = 0.018+rallyIntensity*0.025;
      [0.22,0.50,0.78].forEach((xf,bi) => {
        const lx=W*xf, jitter=Math.sin(performance.now()*0.00022+bi*2.1)*8;
        const lg=ctx.createLinearGradient(lx+jitter,0,lx+jitter,CL.y+CL.h);
        lg.addColorStop(0,'rgba(255,240,180,0)'); lg.addColorStop(0.5,`rgba(255,240,180,${0.55+rallyIntensity*0.35})`); lg.addColorStop(1,'rgba(255,240,180,0)');
        ctx.fillStyle=lg; ctx.beginPath();
        ctx.moveTo(lx+jitter-55,0); ctx.lineTo(lx+jitter+55,0); ctx.lineTo(lx+jitter+14,CL.y+CL.h); ctx.lineTo(lx+jitter-14,CL.y+CL.h);
        ctx.closePath(); ctx.fill();
      });
      ctx.restore();
      if (rallyIntensity>0.35) {
        const ha=(rallyIntensity-0.35)/0.65*0.12;
        const hv=ctx.createRadialGradient(W/2,H/2,W*0.3,W/2,H/2,W*0.8);
        hv.addColorStop(0,'transparent'); hv.addColorStop(1,`rgba(180,40,0,${ha})`);
        ctx.fillStyle=hv; ctx.fillRect(0,0,W,H);
      }
      if (flashRef.current.alpha>0) {
        ctx.save(); ctx.globalAlpha=flashRef.current.alpha*0.18; ctx.fillStyle=flashRef.current.color; ctx.fillRect(0,0,W,H);
        flashRef.current.alpha=Math.max(0,flashRef.current.alpha-0.06); ctx.restore();
      }
    }

    // ── Court surface — NEWME1.0 ─────────────────────────────────────────────
    function drawCourt(ctx, CL, surf, gs) {
      const { x,y,w,h,cx,cy,sTop,sBot,srvL,srvR } = CL;
      const venue = getVenueOverride(tournamentId);

      // ── IMAGEM CUSTOMIZADA (única — runback + quadra compostos) ──────────
      const cImgs = courtImgRef.current;
      const _hasCourtImages = !!cImgs.img;
      if (_hasCourtImages) {
        const rbW = CL.rbW || 0, rbH = CL.rbH || 0;
        ctx.drawImage(cImgs.img, x - rbW, y - rbH, w + rbW * 2, h + rbH * 2);
        // Linhas, rede e overlays continuam sendo desenhados por cima
      }

      // Venue pode sobrescrever cores base
      const courtColor   = venue.courtColor   ?? surf.color;
      const courtDark    = venue.courtDark    ?? surf.dark;
      const runbackColor = venue.runbackColor ?? null; // usado depois no bg

      // ── INNER COURT BASE + TEXTURA + WORN — pulados se há imagens ────────
      if (!_hasCourtImages) {

      // ── INNER COURT BASE ─────────────────────────────────────────────────
      // Richer surface colors — USO blue / RG clay / Wimbledon green
      const cg = ctx.createLinearGradient(x, y, x, y+h);
      cg.addColorStop(0,    courtDark);
      cg.addColorStop(0.22, courtColor);
      cg.addColorStop(0.50, lighten(courtColor, 0.04));
      cg.addColorStop(0.78, courtColor);
      cg.addColorStop(1,    courtDark);
      ctx.fillStyle = cg;
      ctx.fillRect(x, y, w, h);

      // ── SERVICE BOX DIFFERENTIATION (slightly lighter) ─────────────────
      // In USO / AO, service boxes are noticeably lighter than the outer court
      const svcBrighter = surf === SURF.HARD   ? 0.12
                        : surf === SURF.INDOOR ? 0.08
                        : surf === SURF.CLAY   ? 0.05
                        :                        0.04;  // grass minimal
      if (svcBrighter > 0) {
        ctx.save();
        ctx.fillStyle = `rgba(255,255,255,${svcBrighter})`;
        // Service boxes: between sTop/sBot and srvL/srvR
        ctx.fillRect(srvL, sTop, srvR - srvL, sBot - sTop);
        ctx.restore();
      }

      // ── SURFACE TEXTURE ──────────────────────────────────────────────────
      let seed = 0xC4A7F3;
      const lcg = () => { seed = (seed * 1664525 + 1013904223) & 0xffffffff; return (seed >>> 0) / 0xffffffff; };

      if (surf === SURF.CLAY) {
        ctx.save();
        const grainColors = ['rgba(220,100,40,', 'rgba(180,70,20,', 'rgba(245,145,65,', 'rgba(160,55,10,'];
        const STEP = 4;
        for (let gx = x; gx < x+w; gx += STEP) {
          for (let gy = y; gy < y+h; gy += STEP) {
            if (lcg() < 0.16) {
              const col = grainColors[Math.floor(lcg()*grainColors.length)];
              ctx.fillStyle = col + (0.04 + lcg()*0.10) + ')';
              const sz = 0.8 + lcg()*1.8;
              ctx.fillRect(gx + lcg()*STEP, gy + lcg()*STEP, sz, sz);
            }
          }
        }
        ctx.globalAlpha = 0.04; ctx.strokeStyle = '#ffaa55'; ctx.lineWidth = 0.6;
        for (let yi = y; yi < y+h; yi += 4 + Math.floor(lcg()*3)) {
          ctx.beginPath(); ctx.moveTo(x, yi); ctx.lineTo(x+w, yi + (lcg()-0.5)*1.2); ctx.stroke();
        }
        ctx.globalAlpha = 0.018; ctx.strokeStyle = '#ffd0a0'; ctx.lineWidth = 0.8;
        for (let xi = x - h; xi < x+w; xi += 18 + Math.floor(lcg()*6)) {
          ctx.beginPath(); ctx.moveTo(xi, y); ctx.lineTo(xi+h, y+h); ctx.stroke();
        }
        ctx.restore();
      }

      if (surf === SURF.GRASS) {
        const STRIPE_W = Math.max(10, w / 20);
        for (let xi = x, si = 0; xi < x+w; xi += STRIPE_W, si++) {
          ctx.save();
          ctx.globalAlpha = si % 2 === 0 ? 0.09 : 0.00;
          ctx.fillStyle = '#88ffaa';
          ctx.fillRect(xi, y, Math.min(STRIPE_W, x+w-xi), h);
          ctx.restore();
        }
        ctx.save();
        for (let gx = x; gx < x+w; gx += 3) {
          for (let gy = y; gy < y+h; gy += 3) {
            if (lcg() < 0.12) {
              ctx.fillStyle = lcg() > 0.5 ? 'rgba(55,130,45,0.07)' : 'rgba(110,190,75,0.05)';
              ctx.fillRect(gx + lcg()*3, gy + lcg()*3, 1+lcg(), 1+lcg()*2);
            }
          }
        }
        ctx.restore();
      }

      if (surf === SURF.HARD || surf === SURF.INDOOR) {
        ctx.save();
        for (let gx = x; gx < x+w; gx += 5) {
          for (let gy = y; gy < y+h; gy += 5) {
            if (lcg() < 0.10) {
              ctx.fillStyle = `rgba(${lcg()>0.5?'255,255,255':'100,140,255'},${0.02+lcg()*0.035})`;
              ctx.fillRect(gx + lcg()*5, gy + lcg()*5, 1+lcg()*1.2, 1+lcg()*1.2);
            }
          }
        }
        // Subtle horizontal texture lines
        ctx.globalAlpha = 0.020; ctx.strokeStyle = '#aabbff'; ctx.lineWidth = 0.7;
        for (let yi = y; yi < y+h; yi += 8) { ctx.beginPath();ctx.moveTo(x,yi);ctx.lineTo(x+w,yi);ctx.stroke(); }
        ctx.restore();
      }

      // ── WORN TRAFFIC PATHS ────────────────────────────────────────────────
      const wornA = surf === SURF.CLAY ? 0.10 : surf === SURF.GRASS ? 0.08 : 0.045;
      // Baseline worn zones
      const bw = ctx.createRadialGradient(cx, y + h*0.08, 0, cx, y + h*0.08, w*0.30);
      bw.addColorStop(0, `rgba(255,255,255,${wornA*1.3})`);
      bw.addColorStop(0.5, `rgba(255,255,255,${wornA*0.5})`);
      bw.addColorStop(1, 'transparent');
      ctx.fillStyle = bw; ctx.fillRect(x, y, w, h*0.22);
      const bw2 = ctx.createRadialGradient(cx, y + h*0.92, 0, cx, y + h*0.92, w*0.30);
      bw2.addColorStop(0, `rgba(255,255,255,${wornA*1.3})`);
      bw2.addColorStop(0.5, `rgba(255,255,255,${wornA*0.5})`);
      bw2.addColorStop(1, 'transparent');
      ctx.fillStyle = bw2; ctx.fillRect(x, y + h*0.78, w, h*0.22);
      // T-zone path
      const tg = ctx.createLinearGradient(cx, sTop, cx, sBot);
      tg.addColorStop(0, 'transparent');
      tg.addColorStop(0.35, `rgba(255,255,255,${wornA*0.7})`);
      tg.addColorStop(0.65, `rgba(255,255,255,${wornA*0.7})`);
      tg.addColorStop(1, 'transparent');
      ctx.fillStyle = tg; ctx.fillRect(cx - 14, sTop, 28, sBot - sTop);

      // Clay sweep marks near baseline
      if (surf === SURF.CLAY) {
        ctx.save(); ctx.globalAlpha = 0.05;
        ctx.strokeStyle = '#ff7733'; ctx.lineWidth = 1.8;
        for (let sw2 = 0; sw2 < 5; sw2++) {
          const ys = y + h * 0.03 + sw2 * 5;
          ctx.beginPath(); ctx.moveTo(x + w*0.05, ys); ctx.lineTo(x + w*0.95, ys + (lcg()-0.5)*2); ctx.stroke();
          const ys2 = y + h * 0.97 - sw2 * 5;
          ctx.beginPath(); ctx.moveTo(x + w*0.05, ys2); ctx.lineTo(x + w*0.95, ys2 + (lcg()-0.5)*2); ctx.stroke();
        }
        ctx.restore();
      }

      } // end if(!_hasCourtImages)

      // ── COURT LINES — glow pass ───────────────────────────────────────
      const lc = surf.line;
      ctx.save();
      ctx.shadowColor = 'rgba(255,255,255,0.35)';
      ctx.shadowBlur  = 4;
      ctx.strokeStyle = lc; ctx.lineWidth = 1.2; ctx.lineCap = 'square';
      ctx.strokeRect(x, y, w, h);
      ctx.beginPath();
      ctx.moveTo(x,    sTop); ctx.lineTo(x+w,  sTop);
      ctx.moveTo(x,    sBot); ctx.lineTo(x+w,  sBot);
      ctx.moveTo(srvL, sTop); ctx.lineTo(srvL, sBot);
      ctx.moveTo(srvR, sTop); ctx.lineTo(srvR, sBot);
      ctx.moveTo(srvL, cy);   ctx.lineTo(srvR, cy);
      ctx.stroke();
      ctx.shadowBlur = 0; ctx.restore();

      // ── COURT LINES — crisp solid ─────────────────────────────────────
      ctx.strokeStyle = lc; ctx.lineWidth = 2.0; ctx.lineCap = 'square';
      ctx.strokeRect(x, y, w, h);
      function hL(yy, x1, x2) { ctx.beginPath();ctx.moveTo(x1,yy);ctx.lineTo(x2,yy);ctx.stroke(); }
      function vL(xx, y1, y2) { ctx.beginPath();ctx.moveTo(xx,y1);ctx.lineTo(xx,y2);ctx.stroke(); }
      hL(sTop, x,    x+w);
      hL(sBot, x,    x+w);
      vL(srvL, sTop, sBot);
      vL(srvR, sTop, sBot);
      hL(cy,   srvL, srvR);
      hL(cy,   x,    x + 10);
      hL(cy,   x+w-10, x+w);

      // ── NET — full-width mesh ─────────────────────────────────────────
      const netX   = cx;
      // Net spans full runback width (+ 6px overhang each side)
      const netY1  = y - (CL.rbH||0) - 6;
      const netY2  = y + h + (CL.rbH||0) + 6;
      const netLen = netY2 - netY1;
      const poleR  = 5;
      const tapeW  = 5;

      // Net shadow (cast right onto court)
      const nShadow = ctx.createLinearGradient(netX, 0, netX + 20, 0);
      nShadow.addColorStop(0, 'rgba(0,0,0,0.28)');
      nShadow.addColorStop(1, 'transparent');
      ctx.fillStyle = nShadow;
      ctx.fillRect(netX, netY1, 20, netLen);

      // Net mesh fabric — vertical strands across full length
      ctx.save();
      const MESH_V = 7;
      const MESH_H = 9;
      ctx.strokeStyle = 'rgba(170,160,140,0.22)'; ctx.lineWidth = 0.7;
      for (let ny = netY1 + 4; ny < netY2 - 4; ny += MESH_V) {
        ctx.beginPath(); ctx.moveTo(netX - 1, ny); ctx.lineTo(netX - 1, Math.min(ny + MESH_V*0.6, netY2-4)); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(netX + 1, ny); ctx.lineTo(netX + 1, Math.min(ny + MESH_V*0.6, netY2-4)); ctx.stroke();
      }
      ctx.strokeStyle = 'rgba(160,150,130,0.13)'; ctx.lineWidth = 0.5;
      for (let hy = netY1 + 6; hy < netY2 - 4; hy += MESH_H) {
        ctx.beginPath(); ctx.moveTo(netX - tapeW/2 - 1, hy); ctx.lineTo(netX + tapeW/2 + 1, hy); ctx.stroke();
      }
      ctx.restore();

      // Net body fill
      const netGrad = ctx.createLinearGradient(netX - 2, 0, netX + 5, 0);
      netGrad.addColorStop(0, 'rgba(20,14,8,0.92)');
      netGrad.addColorStop(0.5, 'rgba(40,30,18,0.86)');
      netGrad.addColorStop(1, 'rgba(20,14,8,0.82)');
      ctx.fillStyle = netGrad;
      ctx.fillRect(netX - 2, netY1 + poleR*2, 4, netLen - poleR*4);

      // White top tape — full width
      const tapeGrad = ctx.createLinearGradient(netX - tapeW/2, 0, netX + tapeW/2, 0);
      tapeGrad.addColorStop(0, 'rgba(240,235,225,0.95)');
      tapeGrad.addColorStop(0.4, 'rgba(255,255,255,1.0)');
      tapeGrad.addColorStop(1, 'rgba(200,195,180,0.88)');
      ctx.fillStyle = tapeGrad;
      ctx.fillRect(netX - tapeW/2, netY1 + poleR*2, tapeW, netLen - poleR*4);

      // Pole caps
      const poleInTop = y - 8, poleInBot = y + h + 8;
      ctx.fillStyle = '#c8c0a8';
      ctx.beginPath(); ctx.arc(netX, poleInTop, poleR, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(netX, poleInBot, poleR, 0, Math.PI*2); ctx.fill();

      // Pole body
      const poleGrad = ctx.createLinearGradient(netX - poleR, 0, netX + poleR, 0);
      poleGrad.addColorStop(0, '#555');
      poleGrad.addColorStop(0.35, '#aaa');
      poleGrad.addColorStop(0.65, '#ddd');
      poleGrad.addColorStop(1, '#555');
      ctx.fillStyle = poleGrad;
      ctx.fillRect(netX - poleR, netY1, poleR*2, netLen);

      // Pole highlight
      ctx.fillStyle = 'rgba(255,255,255,0.20)';
      ctx.fillRect(netX - 1, netY1 + 4, 1.5, netLen - 8);

      // ── INNER COURT LIGHTING GRADIENT ─────────────────────────────────────
      // Subtle center-bright, edge-slightly-darker (overhead lights effect)
      const lmap = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(w, h) * 0.62);
      lmap.addColorStop(0,    'rgba(255,255,255,0.06)');
      lmap.addColorStop(0.45, 'rgba(255,255,255,0.02)');
      lmap.addColorStop(1,    'rgba(0,0,0,0.08)');
      ctx.fillStyle = lmap;
      ctx.fillRect(x, y, w, h);

      // ── SHOW HIT ZONE HIGHLIGHT (if recent shot) ─────────────────────────
      if (gs?.lastHitZone) {
        const hz = gs.lastHitZone;
        const hzPos = toCanvas(hz.y, hz.x);
        const hzR = 22 + (1 - (hz.age ?? 0)) * 14;
        const hzA = Math.max(0, 0.22 - (hz.age ?? 0) * 0.22);
        if (hzA > 0.01) {
          const hzg = ctx.createRadialGradient(hzPos.x, hzPos.y, 0, hzPos.x, hzPos.y, hzR);
          hzg.addColorStop(0, `rgba(255,255,255,${hzA})`);
          hzg.addColorStop(1, 'transparent');
          ctx.fillStyle = hzg;
          ctx.beginPath(); ctx.arc(hzPos.x, hzPos.y, hzR, 0, Math.PI*2); ctx.fill();
        }
      }

      // Service box flash on serve
      if (gs && (gs.gameState === GameState.PRE_SERVE || gs.gameState === GameState.SERVING)) {
        const sv = gs.players?.[gs.server];
        if (sv) {
          const isRight = sv.side > 0;
          const bx1 = isRight ? srvR : x, bx2 = isRight ? x+w : srvL;
          const by1 = gs.serveLeft ? y : cy, by2 = gs.serveLeft ? cy : y+h;
          ctx.save();
          ctx.strokeStyle = `${RG.clay}bb`; ctx.lineWidth = 1.4; ctx.setLineDash([4,3]);
          ctx.strokeRect(Math.min(bx1,bx2), Math.min(by1,by2), Math.abs(bx2-bx1), Math.abs(by2-by1));
          ctx.fillStyle = `${RG.clay}06`;
          ctx.fillRect(Math.min(bx1,bx2), Math.min(by1,by2), Math.abs(bx2-bx1), Math.abs(by2-by1));
          ctx.setLineDash([]); ctx.restore();
        }
      }

      // ── VENUE PERSONALITY ───────────────────────────────────────────────
      drawVenueDetails(ctx, CL, surf, venue);
    }

    // ── Venue label + Grand Slam decorations ─────────────────────────────────
    function drawVenueDetails(ctx, CL, surf, venue) {
      if (!venue || (!venue.venueLabel && !venue.grandSlam)) return;
      const { x, y, w, h, cx, cy, sTop, sBot, srvL, srvR } = CL;
      const accent = venue.accentColor ?? '#ffffff';
      const label  = venue.venueLabel ?? '';
      const alpha  = venue.labelAlpha ?? 0.055;

      ctx.save();

      // ── 1. Baseline glow (Grand Slam only) ────────────────────────────
      if (venue.grandSlam && venue.baselineGlow) {
        ctx.fillStyle = venue.baselineGlow;
        // top baseline band
        ctx.fillRect(x, y, w, 6);
        // bottom baseline band
        ctx.fillRect(x, y + h - 6, w, 6);
      }

      // ── 2. Venue label — stamped on each half, rotated, subtle ────────
      if (label) {
        const fontSize = Math.round(w * 0.038);
        ctx.globalAlpha = alpha;
        ctx.fillStyle   = accent;
        ctx.font        = `900 ${fontSize}px 'Arial Narrow', Arial, sans-serif`;
        ctx.textAlign   = 'center';
        ctx.textBaseline = 'middle';
        ctx.letterSpacing = '0.18em';

        // Top half (between baseline and net)
        ctx.save();
        ctx.translate(cx, (y + cy) / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText(label, 0, 0);
        ctx.restore();

        // Bottom half (mirror)
        ctx.save();
        ctx.translate(cx, (cy + y + h) / 2);
        ctx.rotate(Math.PI / 2);
        ctx.fillText(label, 0, 0);
        ctx.restore();
      }

      ctx.globalAlpha = 1;

      // ── 3. Corner decorations (Grand Slam only) ───────────────────────
      if (venue.grandSlam) {
        const style  = venue.cornerStyle ?? 'diamond';
        const cAlpha = 0.55;
        const sz     = Math.max(10, Math.min(20, w * 0.028));

        ctx.strokeStyle = accent;
        ctx.lineWidth   = 1.5;
        ctx.globalAlpha = cAlpha;

        // 4 corners: [x, y] of the inner corner (court line intersection)
        const corners = [
          [x,   y],
          [x+w, y],
          [x,   y+h],
          [x+w, y+h],
        ];

        for (const [cx2, cy2] of corners) {
          const dx = cx2 === x ? 1 : -1;
          const dy = cy2 === y ? 1 : -1;

          if (style === 'diamond') {
            ctx.beginPath();
            ctx.moveTo(cx2 + dx * sz * 0.5, cy2);
            ctx.lineTo(cx2 + dx * sz, cy2 + dy * sz * 0.5);
            ctx.lineTo(cx2 + dx * sz * 0.5, cy2 + dy * sz);
            ctx.lineTo(cx2, cy2 + dy * sz * 0.5);
            ctx.closePath();
            ctx.stroke();
          } else if (style === 'cross') {
            const arm = sz * 0.8;
            ctx.beginPath();
            ctx.moveTo(cx2, cy2 + dy * 4);
            ctx.lineTo(cx2, cy2 + dy * arm);
            ctx.moveTo(cx2 + dx * 4, cy2);
            ctx.lineTo(cx2 + dx * arm, cy2);
            ctx.stroke();
            // center dot
            ctx.fillStyle = accent;
            ctx.beginPath();
            ctx.arc(cx2 + dx * 4, cy2 + dy * 4, 2, 0, Math.PI * 2);
            ctx.fill();
          } else { // arc
            ctx.beginPath();
            ctx.arc(cx2, cy2, sz, 0, Math.PI / 2);
            // pick correct arc quarter
            const startA = cy2 === y
              ? (cx2 === x ? 0 : Math.PI / 2)
              : (cx2 === x ? 3 * Math.PI / 2 : Math.PI);
            ctx.beginPath();
            ctx.arc(cx2, cy2, sz, startA, startA + Math.PI / 2);
            ctx.stroke();
          }
        }

        // ── 4. Service-line accent dots (Grand Slam signature marks) ──
        ctx.globalAlpha = 0.45;
        ctx.fillStyle   = accent;
        const dotR      = 3;
        // T intersections
        [[srvL, sTop],[srvR, sTop],[srvL, sBot],[srvR, sBot],
         [cx,   sTop],[cx,   sBot]].forEach(([px, py]) => {
          ctx.beginPath(); ctx.arc(px, py, dotR, 0, Math.PI * 2); ctx.fill();
        });
      }

      ctx.globalAlpha = 1;
      ctx.restore();
    }

    function drawServeBox(ctx, CL, gs) {
      if (!gs) return;
      if (gs.gameState!==GameState.PRE_SERVE && gs.gameState!==GameState.SERVING) return;
      const { x,y,w,h,cx,cy,sTop,sBot,srvL,srvR }=CL;
      const sv=gs.players[gs.server]; if(!sv) return;
      const isRight=sv.side>0;
      const bx1=isRight?srvR:x, bx2=isRight?x+w:srvL;
      const by1=gs.serveLeft?y:cy, by2=gs.serveLeft?cy:y+h;
      ctx.save();
      ctx.strokeStyle=`${RG.clay}bb`; ctx.lineWidth=1.4; ctx.setLineDash([4,3]);
      ctx.strokeRect(Math.min(bx1,bx2),Math.min(by1,by2),Math.abs(bx2-bx1),Math.abs(by2-by1));
      ctx.fillStyle=`${RG.clay}06`;
      ctx.fillRect(Math.min(bx1,bx2),Math.min(by1,by2),Math.abs(bx2-bx1),Math.abs(by2-by1));
      ctx.setLineDash([]);

      const intel = getServeBroadcastState(gs);
      if (intel?.primaryLabel) {
        const cxBox = Math.min(bx1,bx2) + Math.abs(bx2-bx1) * 0.5;
        const cyBox = Math.min(by1,by2) - 10;
        ctx.save();
        ctx.font = `700 10px ${RG.mono}`;
        const textW = ctx.measureText(intel.primaryLabel).width;
        const padX = 10;
        const boxW = textW + padX * 2;
        const boxH = 18;
        ctx.fillStyle = 'rgba(5,10,7,0.86)';
        ctx.strokeStyle = `${RG.clay}88`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(cxBox - boxW / 2, cyBox - boxH / 2, boxW, boxH, 8);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = RG.white;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(intel.primaryLabel, cxBox, cyBox + 0.5);
        ctx.restore();
      }

      ctx.restore();
    }

    // ── Umpire chair + ball kids — NEWME1.0 ────────────────────────────────────
    function drawVenuePersonnel(ctx, CL, surf) {
      const accent    = surf===SURF.CLAY ? '#C4572A' : surf===SURF.GRASS ? '#2A7A30' : surf===SURF.INDOOR ? '#3A2AA0' : '#1A5AA8';
      const chairJerseyColor = surf===SURF.CLAY ? '#C4572A' : surf===SURF.GRASS ? '#225E22' : '#1A2A6E';

      // ── UMPIRE CHAIR ─────────────────────────────────────────────────────
      // Positioned right of net on right sideline (CL.srvR is the singles sideline)
      // Elevated chair — visible from top-down: base platform + legs + person + umbrella
      const chairX = CL.srvR + (CL.x + CL.w - CL.srvR) * 0.38;
      const chairY = CL.cy;          // at net height

      // Shadow
      ctx.save();
      ctx.globalAlpha = 0.25;
      ctx.fillStyle = '#000';
      ctx.beginPath(); ctx.ellipse(chairX, chairY + 14, 14, 4, 0, 0, Math.PI*2); ctx.fill();
      ctx.restore();

      // Chair legs (4 posts, top-down view shows as two rectangles)
      ctx.fillStyle = '#555';
      ctx.fillRect(chairX - 8, chairY - 2, 3, 14);
      ctx.fillRect(chairX + 5, chairY - 2, 3, 14);

      // Seat platform
      ctx.fillStyle = chairJerseyColor;
      ctx.beginPath();
      ctx.roundRect(chairX - 10, chairY - 8, 20, 10, 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.25)';
      ctx.lineWidth = 0.8;
      ctx.stroke();

      // Person torso
      ctx.fillStyle = accent;
      ctx.beginPath(); ctx.ellipse(chairX, chairY - 16, 6, 5, 0, 0, Math.PI*2); ctx.fill();

      // Head
      ctx.fillStyle = '#d4a870';
      ctx.beginPath(); ctx.arc(chairX, chairY - 23, 4.5, 0, Math.PI*2); ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.20)'; ctx.lineWidth = 0.6;
      ctx.stroke();

      // Umbrella / parasol (viewed from top: rounded cap)
      ctx.save();
      ctx.globalAlpha = 0.72;
      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.arc(chairX, chairY - 32, 10, Math.PI, Math.PI*2);
      ctx.closePath(); ctx.fill();
      // Umbrella stripe
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(chairX, chairY - 32); ctx.lineTo(chairX, chairY - 22); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(chairX - 8, chairY - 28); ctx.lineTo(chairX, chairY - 22); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(chairX + 8, chairY - 28); ctx.lineTo(chairX, chairY - 22); ctx.stroke();
      ctx.restore();

      // Label
      ctx.save();
      ctx.globalAlpha = 0.55;
      ctx.fillStyle = 'rgba(255,255,255,0.80)';
      ctx.font = `bold 7px 'Space Mono', monospace`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('JUIZ', chairX, chairY - 42);
      ctx.restore();

      // ── BALL KIDS — 4 corners of the runback zone ────────────────────────
      // They crouch near the back corners, holding a ball
      const RB = Math.max(20, CL.rbH * 0.55);
      const kidPositions = [
        { x: CL.x + CL.w * 0.20, y: CL.y - RB * 0.55 },            // top-left area
        { x: CL.x + CL.w * 0.80, y: CL.y - RB * 0.55 },            // top-right area
        { x: CL.x + CL.w * 0.20, y: CL.y + CL.h + RB * 0.55 },     // bot-left
        { x: CL.x + CL.w * 0.80, y: CL.y + CL.h + RB * 0.55 },     // bot-right
      ];

      // Jersey color per tournament (matches accent)
      const kidJersey = surf===SURF.CLAY ? '#C85A2A' : surf===SURF.GRASS ? '#2A7A30' : '#1A2A8E';

      kidPositions.forEach(({ x, y }) => {
        ctx.save();

        // Shadow
        ctx.globalAlpha = 0.20;
        ctx.fillStyle = '#000';
        ctx.beginPath(); ctx.ellipse(x, y + 7, 7, 2.5, 0, 0, Math.PI*2); ctx.fill();

        // Body
        ctx.globalAlpha = 0.90;
        ctx.fillStyle = kidJersey;
        ctx.beginPath(); ctx.arc(x, y + 2, 6, 0, Math.PI*2); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.20)'; ctx.lineWidth = 0.7; ctx.stroke();

        // Head
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#d0a070';
        ctx.beginPath(); ctx.arc(x, y - 5, 4, 0, Math.PI*2); ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.18)'; ctx.lineWidth = 0.5; ctx.stroke();

        // Ball (held in front — small yellow circle)
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#CCDD00';
        ctx.beginPath(); ctx.arc(x + 9, y, 3.5, 0, Math.PI*2); ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.22)'; ctx.lineWidth = 0.6; ctx.stroke();
        // Ball seam
        ctx.strokeStyle = 'rgba(0,0,0,0.15)'; ctx.lineWidth = 0.5;
        ctx.beginPath(); ctx.arc(x + 9, y, 2.2, 0.2, Math.PI - 0.2); ctx.stroke();

        ctx.restore();
      });
    }


    // ── Player ────────────────────────────────────────────────────────────
    // ── Ball marks on clay (persistent bounce imprints) ─────────────────
    function drawBallMarks(ctx, CL, surf) {
      if (surf !== SURF.CLAY) return;
      const marks = ballMarksRef.current;
      if (!marks.length) return;
      ctx.save();
      for (const m of marks) {
        const lifeF = 1 - m.age / m.maxAge;
        if (lifeF <= 0) continue;
        const alpha = lifeF * 0.55;
        // Outer dirty halo (clay displaced)
        const halo = ctx.createRadialGradient(m.x, m.y, m.rx * 0.3, m.x, m.y, m.rx * 2.2);
        halo.addColorStop(0, `rgba(80,30,5,${alpha * 0.45})`);
        halo.addColorStop(0.5, `rgba(100,40,8,${alpha * 0.20})`);
        halo.addColorStop(1, 'transparent');
        ctx.fillStyle = halo;
        ctx.save();
        ctx.translate(m.x, m.y);
        ctx.rotate(m.angle);
        ctx.scale(1, m.ry / m.rx);
        ctx.beginPath(); ctx.arc(0, 0, m.rx * 2.2, 0, Math.PI*2); ctx.fill();
        // Inner imprint ellipse (slightly darker than surface)
        ctx.fillStyle = `rgba(60,18,3,${alpha * 0.60})`;
        ctx.beginPath(); ctx.ellipse(0, 0, m.rx, m.ry, 0, 0, Math.PI*2); ctx.fill();
        // Bright rim (clay pushed up)
        ctx.strokeStyle = `rgba(210,120,55,${alpha * 0.45})`;
        ctx.lineWidth = 0.8;
        ctx.beginPath(); ctx.ellipse(0, 0, m.rx + 0.8, m.ry + 0.8, 0, 0, Math.PI*2); ctx.stroke();
        ctx.restore();
      }
      ctx.restore();
    }

    // ── drawJerseyPattern — appearance-driven jersey overlay ─────────────────
    // Reads shirtPattern, stripeColor, stripeColor2, accentColor from appearance.
    // Called INSIDE ctx.clip() (circle already clipped).
    function drawJerseyPattern(ctx, R, baseColor, appearance) {
      const pat    = appearance?.shirtPattern ?? 'clean';
      const sc1    = appearance?.stripeColor  ?? lighten(baseColor, 0.55);
      const sc2    = appearance?.stripeColor2 ?? darken(baseColor, 0.30);
      const acc    = appearance?.accentColor  ?? sc1;
      const A1 = 0.78, A2 = 0.58, A3 = 0.38; // alpha levels for overlays

      ctx.save();

      switch (pat) {

        // ── clean: no overlay (base gradient only) ──────────────────────────
        case 'clean': break;

        // ── stripe_h: one horizontal band across the chest ──────────────────
        case 'stripe_h':
          ctx.fillStyle = sc1;
          ctx.globalAlpha = A1;
          ctx.fillRect(-R-2, -R*0.22, (R+2)*2, R*0.44);
          ctx.globalAlpha = 1;
          break;

        // ── stripe_h2: two horizontal bands ─────────────────────────────────
        case 'stripe_h2':
          ctx.globalAlpha = A1;
          ctx.fillStyle = sc1;
          ctx.fillRect(-R-2, -R*0.40, (R+2)*2, R*0.22);
          ctx.fillStyle = sc2;
          ctx.fillRect(-R-2,  R*0.10, (R+2)*2, R*0.22);
          ctx.globalAlpha = 1;
          break;

        // ── stripe_v: two vertical bands flanking centre ─────────────────────
        case 'stripe_v':
          ctx.globalAlpha = A1;
          ctx.fillStyle = sc1;
          ctx.fillRect(-R*0.24, -R-2, R*0.16, (R+2)*2);
          ctx.fillStyle = sc2 !== sc1 ? sc2 : lighten(sc1, 0.25);
          ctx.fillRect( R*0.08, -R-2, R*0.16, (R+2)*2);
          ctx.globalAlpha = 1;
          break;

        // ── stripe_v_single: one bold central stripe ─────────────────────────
        case 'stripe_v_single':
          ctx.fillStyle = sc1;
          ctx.globalAlpha = A1;
          ctx.fillRect(-R*0.13, -R-2, R*0.26, (R+2)*2);
          ctx.globalAlpha = 1;
          break;

        // ── stripe_side: colour panels on both sides ─────────────────────────
        case 'stripe_side':
          ctx.globalAlpha = A2;
          ctx.fillStyle = sc1;
          ctx.fillRect(-R-2, -R-2, R*0.52, (R+2)*2); // left panel
          ctx.fillRect( R*0.50, -R-2, R*0.54, (R+2)*2); // right panel
          ctx.globalAlpha = 1;
          break;

        // ── shoulder_panel: coloured shoulders / raglan ───────────────────────
        case 'shoulder_panel': {
          ctx.globalAlpha = A1;
          ctx.fillStyle = sc1;
          // Left shoulder arc
          ctx.beginPath();
          ctx.moveTo(-R-2, -R-2);
          ctx.lineTo(-R*0.10, -R-2);
          ctx.lineTo(-R*0.42, -R*0.10);
          ctx.lineTo(-R-2, -R*0.10);
          ctx.closePath(); ctx.fill();
          // Right shoulder arc
          ctx.beginPath();
          ctx.moveTo(R+2, -R-2);
          ctx.lineTo( R*0.10, -R-2);
          ctx.lineTo( R*0.42, -R*0.10);
          ctx.lineTo(R+2, -R*0.10);
          ctx.closePath(); ctx.fill();
          ctx.globalAlpha = 1;
          break;
        }

        // ── raglan: diagonal raglan sleeves ────────────────────────────────────
        case 'raglan': {
          ctx.globalAlpha = A1;
          ctx.fillStyle = sc1;
          ctx.beginPath();
          ctx.moveTo(-R-2, -R-2);
          ctx.lineTo( R*0.20, -R-2);
          ctx.lineTo(-R*0.28,  R*0.18);
          ctx.lineTo(-R-2,  R*0.18);
          ctx.closePath(); ctx.fill();
          ctx.beginPath();
          ctx.moveTo(R+2, -R-2);
          ctx.lineTo(-R*0.20, -R-2);
          ctx.lineTo( R*0.28,  R*0.18);
          ctx.lineTo(R+2,  R*0.18);
          ctx.closePath(); ctx.fill();
          ctx.globalAlpha = 1;
          break;
        }

        // ── blocked: two-tone horizontal split ────────────────────────────────
        case 'blocked':
          ctx.fillStyle = sc1;
          ctx.globalAlpha = A2;
          ctx.fillRect(-R-2, -R-2, (R+2)*2, R * 0.55); // upper half
          ctx.globalAlpha = 1;
          break;

        // ── blocked_v: vertical two-tone ─────────────────────────────────────
        case 'blocked_v':
          ctx.fillStyle = sc1;
          ctx.globalAlpha = A2;
          ctx.fillRect(-R-2, -R-2, R*1.02, (R+2)*2); // left half
          ctx.globalAlpha = 1;
          break;

        // ── diagonal: single diagonal slash ──────────────────────────────────
        case 'diagonal': {
          ctx.globalAlpha = A1;
          ctx.fillStyle = sc1;
          ctx.beginPath();
          ctx.moveTo(-R*0.50, -R-2);
          ctx.lineTo( R+2,    R*0.50);
          ctx.lineTo( R+2,    R*0.82);
          ctx.lineTo(-R*0.18, -R-2);
          ctx.closePath(); ctx.fill();
          ctx.globalAlpha = 1;
          break;
        }

        // ── diagonal2: two diagonal slashes ──────────────────────────────────
        case 'diagonal2': {
          ctx.globalAlpha = A2;
          for (let d = 0; d < 2; d++) {
            ctx.fillStyle = d === 0 ? sc1 : sc2;
            ctx.beginPath();
            const ox = d * R * 0.44;
            ctx.moveTo(-R*0.68 + ox, -R-2);
            ctx.lineTo( R*0.82 + ox,  R+2);
            ctx.lineTo( R*0.52 + ox,  R+2);
            ctx.lineTo(-R*0.98 + ox, -R-2);
            ctx.closePath(); ctx.fill();
          }
          ctx.globalAlpha = 1;
          break;
        }

        // ── cross_stripe: H + V crossing stripe ──────────────────────────────
        case 'cross_stripe':
          ctx.globalAlpha = A2;
          ctx.fillStyle = sc1;
          ctx.fillRect(-R-2, -R*0.18, (R+2)*2, R*0.36); // H
          ctx.fillRect(-R*0.13, -R-2, R*0.26, (R+2)*2); // V
          ctx.globalAlpha = 1;
          break;

        // ── pinstripe: many thin vertical lines ──────────────────────────────
        case 'pinstripe':
          ctx.globalAlpha = 0.28;
          ctx.strokeStyle = sc1;
          ctx.lineWidth = Math.max(0.8, R * 0.06);
          for (let x = -R; x <= R; x += R * 0.28) {
            ctx.beginPath(); ctx.moveTo(x, -R-2); ctx.lineTo(x, R+2); ctx.stroke();
          }
          ctx.globalAlpha = 1;
          break;

        // ── pinstripe_h: many thin horizontal lines ───────────────────────────
        case 'pinstripe_h':
          ctx.globalAlpha = 0.22;
          ctx.strokeStyle = sc1;
          ctx.lineWidth = Math.max(0.8, R * 0.05);
          for (let y = -R; y <= R; y += R * 0.26) {
            ctx.beginPath(); ctx.moveTo(-R-2, y); ctx.lineTo(R+2, y); ctx.stroke();
          }
          ctx.globalAlpha = 1;
          break;

        // ── swoosh: curved arc stripe ─────────────────────────────────────────
        case 'swoosh': {
          ctx.globalAlpha = A2;
          ctx.strokeStyle = sc1;
          ctx.lineWidth = R * 0.22;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(-R*0.85, R*0.30);
          ctx.bezierCurveTo(-R*0.20, -R*0.60, R*0.45, -R*0.50, R*0.90, R*0.20);
          ctx.stroke();
          ctx.globalAlpha = 1;
          break;
        }

        // ── swoosh2: double swoosh ────────────────────────────────────────────
        case 'swoosh2': {
          ctx.lineCap = 'round';
          [[sc1, A2, 0], [sc2, A1 * 0.6, R * 0.28]].forEach(([c, a, dy]) => {
            ctx.globalAlpha = a;
            ctx.strokeStyle = c;
            ctx.lineWidth = R * 0.17;
            ctx.beginPath();
            ctx.moveTo(-R*0.85, R*0.22 + dy);
            ctx.bezierCurveTo(-R*0.18, -R*0.62 + dy, R*0.40, -R*0.52 + dy, R*0.88, R*0.16 + dy);
            ctx.stroke();
          });
          ctx.globalAlpha = 1;
          break;
        }

        // ── arc: curved chest-panel arc ──────────────────────────────────────
        case 'arc': {
          ctx.globalAlpha = A2;
          ctx.strokeStyle = sc1;
          ctx.lineWidth = R * 0.28;
          ctx.beginPath();
          ctx.arc(0, -R*0.55, R*0.78, Math.PI * 0.18, Math.PI * 0.82);
          ctx.stroke();
          ctx.globalAlpha = 1;
          break;
        }

        // ── collar_v: V-collar detail ─────────────────────────────────────────
        case 'collar_v': {
          ctx.globalAlpha = A1 * 0.9;
          ctx.strokeStyle = sc1;
          ctx.lineWidth = R * 0.14;
          ctx.lineJoin = 'round';
          ctx.beginPath();
          ctx.moveTo(-R*0.30, -R*0.72);
          ctx.lineTo(0, -R*0.32);
          ctx.lineTo( R*0.30, -R*0.72);
          ctx.stroke();
          ctx.globalAlpha = 1;
          break;
        }

        // ── polo_placket: polo button strip ──────────────────────────────────
        case 'polo_placket': {
          ctx.globalAlpha = A2;
          ctx.fillStyle = sc1;
          ctx.fillRect(-R*0.08, -R*0.82, R*0.16, R*0.72);
          // buttons
          ctx.globalAlpha = A1;
          ctx.fillStyle = lighten(sc1, 0.45);
          const bPositions = [-0.68, -0.48, -0.28];
          bPositions.forEach(by => {
            ctx.beginPath();
            ctx.arc(0, R*by, R*0.055, 0, Math.PI*2);
            ctx.fill();
          });
          ctx.globalAlpha = 1;
          break;
        }

        // ── chest_panel: rectangular logo/panel area ──────────────────────────
        case 'chest_panel': {
          ctx.globalAlpha = A2;
          ctx.fillStyle = sc1;
          ctx.beginPath();
          ctx.roundRect(-R*0.50, -R*0.60, R, R*0.52, R*0.08);
          ctx.fill();
          ctx.globalAlpha = 1;
          break;
        }

        // ── shoulder_drop: coloured drop from both shoulders ──────────────────
        case 'shoulder_drop': {
          ctx.globalAlpha = A1;
          ctx.fillStyle = sc1;
          // Left drop
          ctx.beginPath();
          ctx.moveTo(-R*0.60, -R-2);
          ctx.lineTo(-R*0.25, -R-2);
          ctx.lineTo(-R*0.55,  R*0.05);
          ctx.closePath(); ctx.fill();
          ctx.fillStyle = sc2 !== sc1 ? sc2 : sc1;
          // Right drop
          ctx.beginPath();
          ctx.moveTo( R*0.60, -R-2);
          ctx.lineTo( R*0.25, -R-2);
          ctx.lineTo( R*0.55,  R*0.05);
          ctx.closePath(); ctx.fill();
          ctx.globalAlpha = 1;
          break;
        }

        // ── hoop: concentric rings on chest ──────────────────────────────────
        case 'hoop': {
          ctx.globalAlpha = A2;
          [0.55, 0.30].forEach((r, i) => {
            ctx.strokeStyle = i === 0 ? sc1 : sc2;
            ctx.lineWidth = R * 0.13;
            ctx.beginPath();
            ctx.arc(0, -R*0.18, R*r, 0, Math.PI*2);
            ctx.stroke();
          });
          ctx.globalAlpha = 1;
          break;
        }

        // ── checkerboard: mini chequered band ────────────────────────────────
        case 'checkerboard': {
          const sq = R * 0.28;
          const bandTop = -R*0.26, bandH = sq * 2;
          ctx.globalAlpha = A2;
          for (let xi = -4; xi <= 4; xi++) {
            for (let yi = 0; yi < 2; yi++) {
              if ((xi + yi) % 2 === 0) {
                ctx.fillStyle = sc1;
                ctx.fillRect(xi * sq, bandTop + yi * sq, sq, sq);
              }
            }
          }
          ctx.globalAlpha = 1;
          break;
        }

        // ── zigzag: chevron/zigzag stripe ────────────────────────────────────
        case 'zigzag': {
          ctx.globalAlpha = A2;
          ctx.strokeStyle = sc1;
          ctx.lineWidth = R * 0.16;
          ctx.lineJoin = 'miter';
          const step = R * 0.36;
          ctx.beginPath();
          for (let xi = -4; xi <= 4; xi++) {
            const x0 = xi * step, x1 = x0 + step * 0.5;
            if (xi === -4) ctx.moveTo(x0, -R*0.30);
            ctx.lineTo(x1, -R*0.10);
            ctx.lineTo(x0 + step, -R*0.30);
          }
          ctx.stroke();
          ctx.globalAlpha = 1;
          break;
        }

        // ── dots: polka-dot pattern ───────────────────────────────────────────
        case 'dots': {
          ctx.globalAlpha = A3;
          ctx.fillStyle = sc1;
          const dotR = R * 0.10, spacing = R * 0.38;
          for (let xi = -3; xi <= 3; xi++) {
            for (let yi = -3; yi <= 3; yi++) {
              const ox = (yi % 2 === 0 ? 0 : spacing * 0.5);
              ctx.beginPath();
              ctx.arc(xi * spacing + ox, yi * spacing, dotR, 0, Math.PI*2);
              ctx.fill();
            }
          }
          ctx.globalAlpha = 1;
          break;
        }

        // ── gradient_wash: vertical gradient wash of accent over base ─────────
        case 'gradient_wash': {
          const gw = ctx.createLinearGradient(0, -R, 0, R);
          gw.addColorStop(0,   sc1 + 'cc');
          gw.addColorStop(0.5, sc1 + '44');
          gw.addColorStop(1,   'transparent');
          ctx.fillStyle = gw;
          ctx.fillRect(-R-2, -R-2, (R+2)*2, (R+2)*2);
          break;
        }

        // ── gradient_side: horizontal gradient wash ───────────────────────────
        case 'gradient_side': {
          const gs2 = ctx.createLinearGradient(-R, 0, R, 0);
          gs2.addColorStop(0,   sc1 + 'dd');
          gs2.addColorStop(0.42, 'transparent');
          gs2.addColorStop(0.58, 'transparent');
          gs2.addColorStop(1,   sc2 + 'dd');
          ctx.fillStyle = gs2;
          ctx.fillRect(-R-2, -R-2, (R+2)*2, (R+2)*2);
          break;
        }

        // ── stripe_3: triple vertical stripe ─────────────────────────────────
        case 'stripe_3': {
          ctx.globalAlpha = A1;
          const s3 = R * 0.14;
          [[-R*0.32, sc1], [0 - s3/2, sc2], [R*0.18, sc1]].forEach(([x, c]) => {
            ctx.fillStyle = c;
            ctx.fillRect(x, -R-2, s3, (R+2)*2);
          });
          ctx.globalAlpha = 1;
          break;
        }

        // ── stripe_side_single: one coloured side panel ────────────────────────
        case 'stripe_side_single':
          ctx.fillStyle = sc1;
          ctx.globalAlpha = A2;
          ctx.fillRect(-R-2, -R-2, R*0.46, (R+2)*2);
          ctx.globalAlpha = 1;
          break;

        // ── wave: wavy horizontal band ────────────────────────────────────────
        case 'wave': {
          ctx.globalAlpha = A2;
          ctx.strokeStyle = sc1;
          ctx.lineWidth = R * 0.22;
          ctx.beginPath();
          ctx.moveTo(-R-2, -R*0.08);
          for (let xi = -R; xi <= R+2; xi += R*0.30) {
            const waveY = -R*0.08 + Math.sin((xi / R) * Math.PI * 1.5) * R * 0.18;
            ctx.lineTo(xi, waveY);
          }
          ctx.stroke();
          ctx.globalAlpha = 1;
          break;
        }

        // ── flame: flame-like bottom burst ───────────────────────────────────
        case 'flame': {
          const fg = ctx.createLinearGradient(0, R*0.10, 0, -R*0.50);
          fg.addColorStop(0, sc1 + 'cc');
          fg.addColorStop(0.5, sc1 + '66');
          fg.addColorStop(1, 'transparent');
          ctx.fillStyle = fg;
          ctx.beginPath();
          ctx.moveTo(-R-2, R*0.10);
          // Flame tongues going up
          for (let xi = -R; xi <= R; xi += R*0.38) {
            const tipY = -R * (0.38 + Math.abs(Math.sin(xi / R * Math.PI)) * 0.22);
            ctx.lineTo(xi + R*0.19, tipY);
            ctx.lineTo(xi + R*0.38, R*0.10);
          }
          ctx.lineTo(R+2, R*0.10);
          ctx.closePath(); ctx.fill();
          break;
        }

        // ── tiger: diagonal animal-stripe inspired ────────────────────────────
        case 'tiger': {
          ctx.globalAlpha = A3;
          ctx.fillStyle = sc1;
          const tStripes = [
            [[-R*0.80, -R-2], [-R*0.52, -R-2], [-R*0.14,  R+2], [-R*0.42,  R+2]],
            [[-R*0.10, -R-2], [ R*0.18, -R-2], [ R*0.56,  R+2], [ R*0.28,  R+2]],
            [[ R*0.50, -R-2], [ R*0.78, -R-2], [ R+2,     R*0.62], [ R+2,    R*0.18]],
          ];
          tStripes.forEach(pts => {
            ctx.beginPath();
            pts.forEach(([x,y], i) => i===0 ? ctx.moveTo(x,y) : ctx.lineTo(x,y));
            ctx.closePath(); ctx.fill();
          });
          ctx.globalAlpha = 1;
          break;
        }

        // ── mesh_panel: mesh-like texture on sides ────────────────────────────
        case 'mesh_panel': {
          ctx.globalAlpha = 0.22;
          ctx.strokeStyle = sc1;
          ctx.lineWidth = 0.8;
          // Left side mesh
          for (let y = -R; y <= R; y += R*0.22) {
            ctx.beginPath(); ctx.moveTo(-R-2, y); ctx.lineTo(-R*0.45, y); ctx.stroke();
          }
          for (let x = -R; x <= -R*0.45; x += R*0.22) {
            ctx.beginPath(); ctx.moveTo(x, -R-2); ctx.lineTo(x, R+2); ctx.stroke();
          }
          // Right side mesh
          for (let y = -R; y <= R; y += R*0.22) {
            ctx.beginPath(); ctx.moveTo(R+2, y); ctx.lineTo(R*0.45, y); ctx.stroke();
          }
          for (let x = R*0.45; x <= R; x += R*0.22) {
            ctx.beginPath(); ctx.moveTo(x, -R-2); ctx.lineTo(x, R+2); ctx.stroke();
          }
          ctx.globalAlpha = 1;
          break;
        }

        // ── number_block: chest block like a jersey number background ──────────
        case 'number_block': {
          ctx.globalAlpha = A3;
          ctx.fillStyle = sc1;
          const nbW = R*0.82, nbH = R*0.68;
          const nbX = -nbW/2, nbY = -R*0.58;
          ctx.beginPath();
          ctx.roundRect(nbX, nbY, nbW, nbH, R*0.10);
          ctx.fill();
          // Thin border
          ctx.globalAlpha = A2 * 0.5;
          ctx.strokeStyle = lighten(sc1, 0.35);
          ctx.lineWidth = Math.max(0.8, R * 0.06);
          ctx.beginPath();
          ctx.roundRect(nbX, nbY, nbW, nbH, R*0.10);
          ctx.stroke();
          ctx.globalAlpha = 1;
          break;
        }

        default: break;
      }

      ctx.restore();
    }

    // ── drawShortsDetail — shorts stripe / pattern overlay ───────────────────
    // Called inside the shorts rect clip zone.
    function drawShortsDetail(ctx, R, shortsC, appearance) {
      const pat  = appearance?.shortsPattern ?? appearance?.shirtPattern ?? 'clean';
      const sc1  = appearance?.stripeColor   ?? lighten(shortsC, 0.55);
      const acc  = appearance?.accentColor   ?? sc1;

      ctx.save();
      switch (pat) {
        case 'stripe_h':
        case 'stripe_h2': {
          ctx.globalAlpha = 0.40;
          ctx.fillStyle = sc1;
          ctx.fillRect(-R-2, R*0.52, (R+2)*2, R*0.16);
          ctx.globalAlpha = 1;
          break;
        }
        case 'stripe_v':
        case 'stripe_v_single': {
          ctx.globalAlpha = 0.35;
          ctx.fillStyle = sc1;
          ctx.fillRect(-R*0.14, R*(1/3), R*0.28, R*(2/3));
          ctx.globalAlpha = 1;
          break;
        }
        case 'stripe_side':
        case 'stripe_side_single': {
          ctx.globalAlpha = 0.30;
          ctx.fillStyle = acc;
          ctx.fillRect(-R-2, R*(1/3), R*0.38, R*(2/3));
          ctx.fillRect( R*0.62, R*(1/3), R*0.42, R*(2/3));
          ctx.globalAlpha = 1;
          break;
        }
        case 'diagonal':
        case 'diagonal2': {
          ctx.globalAlpha = 0.28;
          ctx.strokeStyle = sc1;
          ctx.lineWidth = R * 0.14;
          ctx.beginPath();
          ctx.moveTo(-R*0.80, R*(1/3) + R*0.14);
          ctx.lineTo(R*0.80, R + R*0.14);
          ctx.stroke();
          ctx.globalAlpha = 1;
          break;
        }
        case 'blocked':
        case 'blocked_v': {
          ctx.globalAlpha = 0.25;
          ctx.fillStyle = sc1;
          ctx.fillRect(-R-2, R*(1/3), R+2, R*(2/3));
          ctx.globalAlpha = 1;
          break;
        }
        case 'pinstripe': {
          ctx.globalAlpha = 0.20;
          ctx.strokeStyle = sc1;
          ctx.lineWidth = Math.max(0.7, R * 0.055);
          for (let x = -R; x <= R; x += R * 0.28) {
            ctx.beginPath(); ctx.moveTo(x, R*(1/3)); ctx.lineTo(x, R+2); ctx.stroke();
          }
          ctx.globalAlpha = 1;
          break;
        }
        default: break; // most patterns → plain shorts, distinction via color alone
      }
      ctx.restore();
    }

    function tearPath(ctx,R,TIP){
      const a=Math.asin(0.55);
      ctx.beginPath(); ctx.arc(0,0,R,Math.PI/2+a,Math.PI/2-a+Math.PI*2);
      ctx.lineTo(0,R+TIP); ctx.closePath();
    }

    function drawPlayer(ctx, p, gs, CL, surf) {
      const pos=toCanvas(p.pos.y,p.pos.x);
      const px=pos.x, py=pos.y;
      const R=CL.playerR;
      const color=p.color||'#ffffff';
      const mom=p.ctx?.momentum??0.5;
      const stam=p.stamina??1.0;
      const q=p._lastQuality??1.0;
      const t=performance.now();
      const pIdx=p.side>0?1:0;
      const isSwinging=p.swinging;
      const swingProg=isSwinging?clamp(p.swingTimer/TIMING.swingDuration,0,1):0;
      const drawType=isSwinging?getShotDrawType(lastShotRef.current[pIdx]?.type):'ready';
      const skinC=((p.kits?.length ? p.kits[p.activeKitIndex ?? 0] : null) || p.appearance)?.skin||'#c8a06a';
      const BR=Math.max(2,R*0.22);
      const TIP=R*0.88;

      // ── DNA / Trait / Injury context ─────────────────────────────────────
      const styleId   = p.styleId ?? 'AGG_BASELINER';
      const footState = p.ctx?._footingState ?? 'striding';  // 'planted'|'striding'|'offBalance'
      const rallyPres = p.ctx?.rallyPressure ?? 0;
      const seriesWon = p.ctx?.seriesWon ?? 0;
      const ewma      = p.ctx?._momentumEWMA ?? 0.5;
      const injury    = p.injury;
      const injType   = injury?.type ?? null;
      const injPlaying = injury?.isPlayingThrough ?? false;
      const legInjury = injType === 'KNEE' || injType === 'ANKLE' || injType === 'HAMSTRING';

      // Trait flags from dna.slots
      const traitIds  = new Set((p.dna?.slots ?? []).map(s => s.traitId));
      const isMaquina = traitIds.has('MAQUINA') || traitIds.has('INQUEBRAVEL');
      const isDestroidor = traitIds.has('DESTRUIDOR_MORAL');
      const isBigServer = styleId === 'BIG_SERVER';
      const isSrvVol    = styleId === 'SRV_VOL';
      const isRetriever = styleId === 'RETRIEVER' || styleId === 'CTR_PUNCHER' || styleId === 'GRINDER';

      // ── Injury limp: offset para perna lesionada ──────────────────────────
      // Jogador com lesão de perna joga com bob assimétrico — um "coxear" sutil
      const limpPhase  = legInjury && injPlaying ? Math.sin(t * 0.0085 + pIdx * 2.1) : 0;
      const limpOffset = legInjury && injPlaying ? limpPhase * R * 0.18 : 0;

      // ── offBalance wobble: tremble no token quando desequilibrado ──────────
      const isOffBalance = footState === 'offBalance';
      const wobbleX = isOffBalance ? Math.sin(t * 0.042 + pIdx) * R * 0.14 : 0;
      const wobbleY = isOffBalance ? Math.cos(t * 0.038 + pIdx * 1.3) * R * 0.09 : 0;

      const cvx=(p.vel?.y??0)*CL.scaleW, cvy=(p.vel?.x??0)*CL.scaleH;
      const spd=Math.hypot(cvx,cvy);
      const pid=p.id??pIdx;
      const fa=facingAnglesRef.current;

      let targetAngle;
      if (isSwinging && gs?.ball) {
        const bp=toCanvas(gs.ball.pos.y,gs.ball.pos.x);
        targetAngle=Math.atan2(bp.y-py,bp.x-px);
      } else if (spd>2) {
        targetAngle=Math.atan2(cvy,cvx);
      } else {
        targetAngle=p.side>0?Math.PI:0;
      }
      if (fa[pid]===undefined) fa[pid]=targetAngle;
      fa[pid]=lerpAngle(fa[pid],targetAngle,isSwinging?0.30:spd>5?0.22:0.10);
      const tokenRot=fa[pid]-Math.PI/2;

      ctx.save();
      ctx.translate(px + wobbleX, py + wobbleY);

      // ── Aura (momentum) — colorida por jogador ──────────────────────────
      if (mom>0.65) {
        const pulse=0.5+0.5*Math.sin(t*(0.002+mom*0.004));
        const aA=(mom-0.65)/0.35*0.40*pulse;
        const ag=ctx.createRadialGradient(0,0,R*0.8,0,0,R*2.4);
        ag.addColorStop(0,`${color}${Math.round(aA*255).toString(16).padStart(2,'0')}`);
        ag.addColorStop(1,'transparent');
        ctx.fillStyle=ag; ctx.beginPath();ctx.arc(0,0,R*2.4,0,Math.PI*2);ctx.fill();
        ctx.strokeStyle=`${color}${Math.round(aA*0.6*255).toString(16).padStart(2,'0')}`; ctx.lineWidth=1.4;
        ctx.beginPath();ctx.arc(0,0,R*1.6,0,Math.PI*2);ctx.stroke();
      } else if (mom<0.32) {
        const pulse=0.5+0.5*Math.sin(t*0.0018);
        const aA=(0.32-mom)/0.32*0.28*pulse;
        ctx.strokeStyle=`rgba(90,100,150,${aA})`; ctx.lineWidth=1.2; ctx.setLineDash([3,4]);
        ctx.beginPath();ctx.arc(0,0,R*1.6,0,Math.PI*2);ctx.stroke(); ctx.setLineDash([]);
      }

      // ── Rally pressure ring — anel vermelho pulsante sob stress físico ───
      // Diferente do momentum (psicológico), pressão é posicional/física.
      // Aparece quando rallyPressure > 0.45. Cresce com a pressão.
      if (rallyPres > 0.45) {
        const pressIntensity = (rallyPres - 0.45) / 0.55;
        const pressPulse = 0.5 + 0.5 * Math.sin(t * 0.028 + pIdx * 1.7);
        const pressA = pressIntensity * 0.55 * pressPulse;
        const pressR = R * (1.85 + pressIntensity * 0.4);
        ctx.strokeStyle = `rgba(255,${Math.round(60 - pressIntensity * 40)},${Math.round(40 - pressIntensity * 30)},${pressA})`;
        ctx.lineWidth = 1.8 + pressIntensity * 1.2;
        ctx.setLineDash([2 + pressIntensity * 2, 3 + pressIntensity * 1.5]);
        ctx.beginPath(); ctx.arc(0, 0, pressR, 0, Math.PI * 2); ctx.stroke();
        ctx.setLineDash([]);
        // Inner flicker — só acima de 0.72
        if (rallyPres > 0.72) {
          const innerA = (rallyPres - 0.72) / 0.28 * 0.22 * pressPulse;
          const ig = ctx.createRadialGradient(0, 0, R * 0.5, 0, 0, R * 1.4);
          ig.addColorStop(0, `rgba(255,60,30,0)`);
          ig.addColorStop(1, `rgba(255,60,30,${innerA})`);
          ctx.fillStyle = ig;
          ctx.beginPath(); ctx.arc(0, 0, R * 1.4, 0, Math.PI * 2); ctx.fill();
        }
      }

      // ── offBalance indicator: X vermelho quando completamente fora de posição ─
      if (isOffBalance && rallyPres > 0.55) {
        const obA = Math.min(1, (rallyPres - 0.55) / 0.35) * 0.55;
        ctx.save();
        ctx.strokeStyle = `rgba(255,80,80,${obA})`;
        ctx.lineWidth = 1.5;
        const xs = R * 0.55;
        ctx.beginPath(); ctx.moveTo(-xs, -xs); ctx.lineTo(xs, xs); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(xs, -xs); ctx.lineTo(-xs, xs); ctx.stroke();
        ctx.restore();
      }

      // ── planted indicator: flash verde explosivo ao fixar posição ────────
      if (footState === 'planted' && gs?.ball?.inFlight) {
        const plantPulse = 0.5 + 0.5 * Math.sin(t * 0.05);
        ctx.strokeStyle = `rgba(100,255,140,${0.35 * plantPulse})`;
        ctx.lineWidth = 2.2;
        ctx.beginPath(); ctx.arc(0, 0, R * 1.35, 0, Math.PI * 2); ctx.stroke();
      }

      // ── Reach ring ────────────────────────────────────────────────────────
      if (gs) {
        const ball=gs.ball, bp=toCanvas(ball.pos.y,ball.pos.x);
        const dist=Math.hypot(bp.x-px,bp.y-py);
        const rPx=(p.reach??0.85)*CL.scaleW;
        const coming=(p.side>0&&ball.vel?.y>0)||(p.side<0&&ball.vel?.y<0);
        if (ball.inFlight&&coming&&dist<rPx*3.0) {
          const prox=Math.max(0,1-dist/(rPx*3.0));
          // offBalance: reach ring sempre vermelho (sem chance de boa qualidade)
          const rcQ = isOffBalance ? 0 : q;
          const rc=rcQ>0.60?`rgba(168,200,50,${0.07+prox*0.22})`:rcQ>0.35?`rgba(196,87,42,${0.07+prox*0.22})`:`rgba(255,60,60,${0.09+prox*0.24})`;
          ctx.strokeStyle=rc; ctx.lineWidth=1.4; ctx.setLineDash([4,5]);
          ctx.beginPath();ctx.arc(0,0,rPx,0,Math.PI*2);ctx.stroke(); ctx.setLineDash([]);
        }
      }

      // Prep rings
      const prepFrac1 = p._prepFrac1 ?? 0;
      const prepFrac2 = p._prepFrac2 ?? 0;
      const ball2 = gs?.ball;
      if (ball2?.inFlight && prepFrac1 > 0.02) {
        const r1 = R * 1.55;
        const startAngle = -Math.PI / 2;
        const endAngle1  = startAngle + prepFrac1 * Math.PI * 2;
        ctx.strokeStyle = 'rgba(255,255,255,0.06)';
        ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.arc(0, 0, r1, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = prepFrac1 >= 1.0
          ? `rgba(0,255,136,${0.7 + prepFrac2 * 0.25})`
          : `rgba(0,220,100,${0.4 + prepFrac1 * 0.4})`;
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(0, 0, r1, startAngle, endAngle1, false); ctx.stroke();
        if (prepFrac1 >= 1.0 && prepFrac2 > 0.01) {
          const r2 = R * 1.95;
          const endAngle2 = startAngle + prepFrac2 * Math.PI * 2;
          ctx.strokeStyle = 'rgba(255,255,255,0.05)';
          ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(0, 0, r2, 0, Math.PI * 2); ctx.stroke();
          ctx.strokeStyle = prepFrac2 >= 1.0 ? 'rgba(255,215,0,0.92)' : `rgba(255,215,0,${0.45 + prepFrac2 * 0.45})`;
          ctx.lineWidth = 3;
          ctx.beginPath(); ctx.arc(0, 0, r2, startAngle, endAngle2, false); ctx.stroke();
        }
        if (prepFrac1 >= 1.0 && prepFrac2 < 0.06) {
          const pulseA = (1 - prepFrac2 / 0.06) * 0.5;
          ctx.strokeStyle = `rgba(0,255,136,${pulseA})`;
          ctx.lineWidth = 5;
          ctx.beginPath(); ctx.arc(0, 0, r1 + 4, 0, Math.PI * 2); ctx.stroke();
        }
      }

      // ── Dynamic shadow ─────────────────────────────────────────────────
      const LIGHT_OX = 6, LIGHT_OY = 4;
      const velOX = (p.vel?.y ?? 0) * CL.scaleW * 0.10;
      const velOY = (p.vel?.x ?? 0) * CL.scaleH * 0.10;
      // Injury: sombra levemente torta para lesão de perna
      const shadowSkewX = legInjury && injPlaying ? limpOffset * 0.6 : 0;
      ctx.save();
      ctx.translate(LIGHT_OX + velOX + shadowSkewX, LIGHT_OY + velOY);
      ctx.filter = 'blur(3px)';
      ctx.scale(1.2, 0.32);
      const shadowGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, R + 6);
      shadowGrad.addColorStop(0, 'rgba(0,0,0,0.50)');
      shadowGrad.addColorStop(0.5, 'rgba(0,0,0,0.22)');
      shadowGrad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = shadowGrad;
      ctx.beginPath(); ctx.arc(0, 0, R + 6, 0, Math.PI * 2); ctx.fill();
      ctx.filter = 'none';
      ctx.restore();

      // ── Speed oval squash ──────────────────────────────────────────────
      const spdNorm   = Math.min(spd / 70, 1.0);
      // offBalance: squash exagerado (corpo fora de controle)
      const squashAmt = spdNorm * (isOffBalance ? 0.38 : 0.24);
      const ovalLong  = 1.0 + squashAmt * 1.15;
      const ovalShort = 1.0 - squashAmt * 0.85;
      const moveAngle = spd > 2 ? Math.atan2(cvy, cvx) : tokenRot + Math.PI / 2;

      // ── Jersey circle ─────────────────────────────────────────────────
      ctx.save();
      ctx.rotate(moveAngle);
      ctx.scale(ovalLong, ovalShort);

      // Outer border ring
      ctx.save();
      ctx.beginPath(); ctx.arc(0, 0, R + 1.5, 0, Math.PI * 2);
      ctx.fillStyle = darken(color, 0.55); ctx.fill();
      ctx.restore();

      // Main circle clip with jersey pattern
      ctx.save();
      ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2); ctx.clip();

      // Base fill — shirt color (top 2/3)
      const jg = ctx.createRadialGradient(-R*0.28, -R*0.32, 0, 0, 0, R);
      jg.addColorStop(0, lighten(color, 0.32));
      jg.addColorStop(0.55, color);
      jg.addColorStop(1, darken(color, 0.38));
      ctx.fillStyle = jg; ctx.fillRect(-R-2, -R-2, (R+2)*2, (R+2)*2);

      // Shorts — bottom 1/3 of the circle
      const appearance = (p.kits?.length ? p.kits[p.activeKitIndex ?? 0] : null)
        || p.appearance
        || getAppearance(p.namedPlayerKey, p.id ?? pIdx);
      const shortsC = appearance?.shortsColor;
      if (shortsC) {
        const shortsY = R * (1/3);
        ctx.save();
        ctx.beginPath();
        ctx.rect(-R-2, shortsY, (R+2)*2, R - shortsY + 2);
        ctx.clip();
        const sg = ctx.createRadialGradient(0, R*0.6, 0, 0, R*0.6, R*0.9);
        sg.addColorStop(0, lighten(shortsC, 0.20));
        sg.addColorStop(0.6, shortsC);
        sg.addColorStop(1, darken(shortsC, 0.35));
        ctx.fillStyle = sg; ctx.fillRect(-R-2, shortsY, (R+2)*2, R - shortsY + 2);
        // Shorts pattern detail
        drawShortsDetail(ctx, R, shortsC, appearance);
        // Subtle dividing line (waistband)
        ctx.strokeStyle = darken(shortsC, 0.25);
        ctx.lineWidth = Math.max(1, R * 0.12);
        ctx.globalAlpha = 0.55;
        const chordHW = Math.sqrt(Math.max(0, R*R - shortsY*shortsY));
        ctx.beginPath(); ctx.moveTo(-chordHW, shortsY); ctx.lineTo(chordHW, shortsY); ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.restore();
      }

      // Jersey pattern — appearance-driven (shirtPattern + stripeColor + accentColor)
      drawJerseyPattern(ctx, R, color, appearance);

      // Highlight gloss
      const gloss = ctx.createRadialGradient(-R*0.25, -R*0.30, 0, -R*0.1, -R*0.1, R*0.75);
      gloss.addColorStop(0, 'rgba(255,255,255,0.28)');
      gloss.addColorStop(0.45, 'rgba(255,255,255,0.07)');
      gloss.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = gloss; ctx.fillRect(-R-2, -R-2, (R+2)*2, (R+2)*2);

      // Injury overlay: leve tint vermelho sobre o token para lesão grave
      if (injType && injury.grade >= 2 && !injPlaying) {
        ctx.fillStyle = 'rgba(220,40,40,0.12)';
        ctx.fillRect(-R-2, -R-2, (R+2)*2, (R+2)*2);
      }
      // In-match injury overlay: pulsante para lesão em campo ativa
      if (p._inMatchInjury || (p.injury?.inMatchActive)) {
        const pTime = (Date.now() % 1200) / 1200;
        const pulse = 0.5 + 0.5 * Math.sin(pTime * Math.PI * 2);
        const sev = p._inMatchInjury?.severity ?? 'MODERATE';
        const col = sev === 'SEVERE' ? `rgba(255,40,40,${0.10 + pulse * 0.14})`
                  : sev === 'MODERATE' ? `rgba(255,120,0,${0.08 + pulse * 0.12})`
                  : `rgba(255,200,0,${0.06 + pulse * 0.08})`;
        ctx.fillStyle = col;
        ctx.fillRect(-R-2, -R-2, (R+2)*2, (R+2)*2);
        // Ícone ⚕ flutuante acima do token
        ctx.save();
        ctx.font = `${Math.round(R * 0.72)}px sans-serif`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.globalAlpha = 0.55 + pulse * 0.45;
        ctx.fillText('⚕', 0, -R * 1.55);
        ctx.globalAlpha = 1;
        ctx.restore();
      }
      ctx.restore();

      // Outer stroke
      ctx.strokeStyle = 'rgba(255,255,255,0.28)'; ctx.lineWidth = 1.1;
      ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2); ctx.stroke();

      // Swing flash
      if (isSwinging && swingProg > 0.28 && swingProg < 0.72) {
        const flashA = 0.22 * (1 - Math.abs(swingProg - 0.50) / 0.22);
        ctx.save();
        ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2); ctx.clip();
        ctx.fillStyle = `rgba(255,255,255,${flashA})`;
        ctx.fillRect(-R-2, -R-2, (R+2)*2, (R+2)*2);
        ctx.restore();
      }

      ctx.restore(); // oval squash

      // ── Head indicator ────────────────────────────────────────────────────
      {
        const hAngle = fa[pid];
        // Injury: head indicator oscila para lesão de perna (desequilíbrio)
        const injHeadWobble = legInjury && injPlaying ? limpPhase * 0.12 : 0;
        const hDist  = R * 0.78;
        const hx3    = Math.cos(hAngle + injHeadWobble) * hDist;
        const hy3    = Math.sin(hAngle + injHeadWobble) * hDist;
        const hR3    = R * 0.32;
        const hgr = ctx.createRadialGradient(
          hx3 - hR3 * 0.18, hy3 - hR3 * 0.22, 0,
          hx3, hy3, hR3
        );
        hgr.addColorStop(0,   lighten(skinC, 0.18));
        hgr.addColorStop(0.55, skinC);
        hgr.addColorStop(1,   darken(skinC, 0.25));
        ctx.save();
        ctx.fillStyle = hgr;
        ctx.beginPath(); ctx.arc(hx3, hy3, hR3, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = darken(color, 0.16);
        ctx.beginPath(); ctx.arc(hx3, hy3, hR3 * 0.80, Math.PI, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.20)'; ctx.lineWidth = 0.65;
        ctx.beginPath(); ctx.arc(hx3, hy3, hR3, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
      }

      // ── Racket arm — diferenciado por arquétipo ────────────────────────
      {
        const facing = fa[pid];
        let racketAngle = facing;
        let armExtend = 0;
        const isServe = gs?.gameState === GameState.SERVING || gs?.gameState === GameState.PRE_SERVE;
        const shotT = lastShotRef.current[pIdx]?.type || '';
        const isBH = shotT === 'BH' || (isSwinging && gs?.ball &&
          ((gs.ball.pos.y - p.pos.y) * p.side) < 0);

        if (isSwinging) {
          const swingDir = isBH ? 1 : -1;
          if (swingProg < 0.38) {
            const tt = swingProg / 0.38;
            // BIG_SERVER: backswing mais amplo e dramático
            const backswingArc = isBigServer ? Math.PI * 0.72 : isRetriever ? Math.PI * 0.40 : Math.PI * 0.55;
            racketAngle = facing + swingDir * lerp(0, backswingArc, tt);
            armExtend = tt * R * (isBigServer ? 0.60 : 0.45);
          } else if (swingProg < 0.62) {
            const tt = (swingProg - 0.38) / 0.24;
            // AGG_BASELINER / BIG_SERVER: follow-through mais além da linha
            const forwardArc = isBigServer ? -Math.PI * 0.42 : isRetriever ? -Math.PI * 0.22 : -Math.PI * 0.30;
            const backArc    = isBigServer ? Math.PI * 0.72 : isRetriever ? Math.PI * 0.40 : Math.PI * 0.55;
            racketAngle = facing + swingDir * lerp(backArc, forwardArc, tt);
            armExtend = (1 - Math.abs(tt - 0.5) * 2) * R * (isBigServer ? 1.05 : 0.85) + R * 0.45;
          } else {
            const tt = (swingProg - 0.62) / 0.38;
            const forwardArc = isBigServer ? -Math.PI * 0.42 : isRetriever ? -Math.PI * 0.22 : -Math.PI * 0.30;
            const recoverArc = isBigServer ? -Math.PI * 0.65 : -Math.PI * 0.55;
            racketAngle = facing + swingDir * lerp(forwardArc, recoverArc, tt);
            armExtend = (1 - tt) * R * (isBigServer ? 0.80 : 0.65);
          }

        } else if (isServe && gs?.gameState === GameState.SERVING) {
          // ── Serve animation por arquétipo ──────────────────────────────
          const tSec = t * 0.001;

          if (isBigServer) {
            // BIG_SERVER: arremesso alto, body lean para a frente, racket power position
            // Ciclo completo: toss (0-0.4) → coil (0.4-0.7) → power position (0.7-1.0) → repeat
            const cycle = (tSec % 2.2) / 2.2;
            if (cycle < 0.35) {
              // Toss: braço sobe devagar
              const tt = cycle / 0.35;
              racketAngle = -Math.PI / 2 + lerp(0.45, 0.0, tt); // sobe
              armExtend = R * lerp(0.1, 0.55, tt);
            } else if (cycle < 0.65) {
              // Power position: coil máximo, racket vai atrás
              const tt = (cycle - 0.35) / 0.30;
              racketAngle = -Math.PI / 2 + lerp(0.0, -0.85, tt); // puxa para trás
              armExtend = R * lerp(0.55, 0.75, tt);
            } else {
              // Waiting / reset: racket equilibrado
              const tt = (cycle - 0.65) / 0.35;
              racketAngle = -Math.PI / 2 + lerp(-0.85, 0.45, tt);
              armExtend = R * lerp(0.75, 0.1, tt);
            }
            // Lean para frente durante power position
            // (visual apenas — o token em si não se move para não causar confusão de posição)

          } else if (isSrvVol) {
            // SRV_VOL: saque rápido e compacto, já com postura de aproximação
            const cycle = (tSec % 1.8) / 1.8;
            racketAngle = -Math.PI / 2 + Math.sin(cycle * Math.PI * 2) * 0.35;
            armExtend = R * (0.25 + Math.max(0, Math.sin(cycle * Math.PI * 2)) * 0.35);

          } else if (isRetriever) {
            // RETRIEVER: saque seguro, movimento mínimo, conservador
            racketAngle = -Math.PI / 2 + Math.sin(tSec * 1.2) * 0.18;
            armExtend = R * 0.18 + Math.sin(tSec * 1.8) * R * 0.08;

          } else {
            // Default: serve original
            racketAngle = -Math.PI / 2 + Math.sin(tSec * 3) * 0.25;
            armExtend = R * 0.3 + Math.sin(tSec * 5) * R * 0.15;
          }
        }

        const ARM_LEN = R + 4 + armExtend;

        const armStartX = Math.cos(facing) * (R * 0.72);
        const armStartY = Math.sin(facing) * (R * 0.72);
        const armEndX   = Math.cos(racketAngle) * ARM_LEN;
        const armEndY   = Math.sin(racketAngle) * ARM_LEN;

        // Arm com limp para lesão de perna (ombro levemente assimétrico)
        const armSkewY = legInjury && injPlaying ? limpOffset * 0.3 : 0;

        ctx.save();
        ctx.strokeStyle = skinC;
        ctx.lineWidth = Math.max(2, R * 0.32);
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(armStartX, armStartY + armSkewY);
        ctx.lineTo(armEndX, armEndY + armSkewY);
        ctx.stroke();

        const racX = armEndX;
        const racY = armEndY + armSkewY;
        const rAppearance = (p.kits?.length ? p.kits[p.activeKitIndex ?? 0] : null)
          || p.appearance
          || getAppearance(p.namedPlayerKey, p.id ?? pIdx);
        const rColor = rAppearance?.racketColor || darken(color, 0.35);
        const rStrings = rAppearance?.racketStrings || '#ccff00';
        const rFrame = Math.max(3, R * 0.52);
        const rHandle = Math.max(2, R * 0.32);

        ctx.save();
        ctx.translate(racX, racY);
        ctx.rotate(racketAngle + Math.PI / 2);

        // Handle
        ctx.strokeStyle = darken(rColor, 0.15);
        ctx.lineWidth = Math.max(1.5, R * 0.18);
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(0, 0); ctx.lineTo(0, rHandle + 2);
        ctx.stroke();

        ctx.stroke();

        // Frame
        ctx.strokeStyle = rColor;
        ctx.lineWidth = Math.max(1.5, R * 0.20);
        ctx.beginPath();
        ctx.ellipse(0, -(rFrame * 0.72), rFrame * 0.58, rFrame, 0, 0, Math.PI * 2);
        ctx.stroke();

        // Frame highlight
        ctx.strokeStyle = lighten(rColor, 0.35);
        ctx.lineWidth = Math.max(0.6, R * 0.08);
        ctx.beginPath();
        ctx.ellipse(-rFrame * 0.22, -(rFrame * 0.72) - rFrame * 0.28, rFrame * 0.22, rFrame * 0.38, 0, 0, Math.PI * 2);
        ctx.stroke();

        // Strings
        ctx.strokeStyle = rStrings + 'bb';
        ctx.lineWidth = Math.max(0.6, R * 0.09);
        ctx.beginPath(); ctx.moveTo(0, -(rFrame * 0.72) - rFrame); ctx.lineTo(0, -(rFrame * 0.72) + rFrame); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-rFrame * 0.55, -(rFrame * 0.72)); ctx.lineTo(rFrame * 0.55, -(rFrame * 0.72)); ctx.stroke();

        // Motion smear at contact
        if (isSwinging && swingProg > 0.36 && swingProg < 0.64) {
          const smearA = 0.45 * (1 - Math.abs(swingProg - 0.50) / 0.14);
          ctx.strokeStyle = `rgba(255,255,200,${smearA})`;
          ctx.lineWidth = Math.max(1, R * 0.14);
          ctx.beginPath();
          ctx.ellipse(0, -(rFrame * 0.72), rFrame * 0.72, rFrame * 1.22, 0, 0, Math.PI * 2);
          ctx.stroke();
          ctx.strokeStyle = `rgba(204,255,0,${smearA * 0.7})`;
          ctx.lineWidth = Math.max(0.8, R * 0.10);
          const off = isBH ? -rFrame * 0.28 : rFrame * 0.28;
          ctx.beginPath(); ctx.moveTo(off, -(rFrame * 0.72) - rFrame * 0.7); ctx.lineTo(off, -(rFrame * 0.72) + rFrame * 0.7); ctx.stroke();
        }

        ctx.restore();
        ctx.restore();
      }

      // ── Celebration burst — pós-ponto, proporcional a seriesWon e DNA ────
      // celebTimerRef acumula tempo de celebração. Decresce no loop principal.
      // Acedido via celebStateRef.current[pid] = { timer, series, color, isDestroidor, isMaquina }
      {
        const cs = celebStateRef.current?.[pid];
        if (cs && cs.timer > 0) {
          const prog = cs.timer / cs.maxTimer;
          const scale = 1.0 + prog * (cs.isDestroidor ? 0.26 : cs.series >= 5 ? 0.16 : cs.series >= 3 ? 0.10 : 0.05);
          const burstA = prog * (cs.isDestroidor ? 0.92 : cs.series >= 5 ? 0.70 : cs.series >= 3 ? 0.50 : 0.28);

          if (!cs.isMaquina) {
            // Burst ring
            ctx.save();
            const burstR = R * (1.4 + (1 - prog) * (cs.isDestroidor ? 2.8 : cs.series >= 5 ? 2.0 : 1.2));
            const bg = ctx.createRadialGradient(0, 0, R * 0.8, 0, 0, burstR);
            bg.addColorStop(0, `${cs.color}${Math.round(burstA * 255).toString(16).padStart(2,'0')}`);
            bg.addColorStop(1, 'transparent');
            ctx.fillStyle = bg;
            ctx.beginPath(); ctx.arc(0, 0, burstR, 0, Math.PI * 2); ctx.fill();

            // Scale pulse
            ctx.scale(scale, scale);
            ctx.strokeStyle = `${cs.color}${Math.round(burstA * 0.7 * 255).toString(16).padStart(2,'0')}`;
            ctx.lineWidth = cs.isDestroidor ? 3.5 : 2;
            ctx.beginPath(); ctx.arc(0, 0, R * 1.15, 0, Math.PI * 2); ctx.stroke();

            // DESTRUIDOR_MORAL: raios dourados saindo do token
            if (cs.isDestroidor && cs.series >= 5) {
              ctx.strokeStyle = `rgba(255,215,0,${burstA * 0.85})`;
              ctx.lineWidth = 1.8;
              for (let r = 0; r < 8; r++) {
                const ang = (r / 8) * Math.PI * 2 + (1 - prog) * 0.8;
                const r1 = R * 1.3;
                const r2 = R * (1.8 + (1 - prog) * 1.4);
                ctx.beginPath();
                ctx.moveTo(Math.cos(ang) * r1, Math.sin(ang) * r1);
                ctx.lineTo(Math.cos(ang) * r2, Math.sin(ang) * r2);
                ctx.stroke();
              }
            }
            ctx.restore();
          }
          // MAQUINA / INQUEBRAVEL: token permanece absolutamente estático — sem nada
        }
      }

      // Stamina bar — fica piscante quando em pressão alta
      const STAM_BY = R + 7;
      if (stam<0.97) {
        const bw=R*2.0, bh=2.5, bx=-bw/2, by=STAM_BY;
        // Stress flicker: pisca rapidamente quando stamina baixa E pressão alta
        const stressFlicker = stam < 0.35 && rallyPres > 0.55
          ? 0.5 + 0.5 * Math.sin(t * 0.055) : 1.0;
        ctx.fillStyle='rgba(0,0,0,0.55)'; ctx.fillRect(bx,by,bw,bh);
        ctx.globalAlpha = stressFlicker;
        ctx.fillStyle=stam>0.5?RG.lime:stam>0.25?RG.clayLight:'rgba(255,60,60,0.92)';
        ctx.fillRect(bx,by,bw*stam,bh);
        ctx.globalAlpha = 1;
      }

      // ── Name tag — abaixo da barra de stamina ───────────────────────────
      {
        const surname=p.name?p.name.split(' ').pop():'?';
        const fontSize = Math.max(9, R * 0.76);
        ctx.save();
        ctx.font=`700 ${fontSize}px ${RG.display}`;
        const tw=ctx.measureText(surname).width;
        const lp=5, lw=tw+lp*2, lh=Math.round(fontSize + 4);
        const tagY = STAM_BY + 2.5 + 3; // just below stamina bar
        const rx = -lw/2;
        // Background pill
        ctx.fillStyle=`${RG.bgPanel}ee`;
        ctx.beginPath();
        ctx.roundRect(rx, tagY, lw, lh, 3);
        ctx.fill();
        // Accent left strip
        const tagAccent = injType && injPlaying ? 'rgba(255,80,80,0.9)' : RG.clay;
        ctx.fillStyle=tagAccent;
        ctx.beginPath();
        ctx.roundRect(rx, tagY, 3, lh, [3, 0, 0, 3]);
        ctx.fill();
        // Text
        ctx.fillStyle=RG.white;
        ctx.textAlign='center';
        ctx.textBaseline='middle';
        ctx.fillText(surname, 0, tagY + lh/2);
        // Ícone de lesão
        if (injType && injPlaying) {
          const injIcon = { KNEE:'🦵', ANKLE:'🦶', HAMSTRING:'🩹', BACK:'🧍', SHOULDER:'💪', WRIST:'🖐', ELBOW:'💪' }[injType] ?? '⚕';
          ctx.font = `${Math.max(7, R*0.55)}px sans-serif`;
          ctx.textAlign = 'right';
          ctx.fillText(injIcon, rx + lw - 3, tagY + lh/2);
        }
        ctx.restore();
      }

      ctx.restore(); // translate
    }



    // ── Ball trail ────────────────────────────────────────────────────────
    function drawTrail(ctx, trail) {
      if (!trail||trail.length<3) return;
      const CL=CLRef.current;
      const last=trail[trail.length-1], prev=trail[trail.length-2];
      const rawSpd=Math.hypot(last.x-prev.x,last.y-prev.y)*60;
      const fastFrac=clamp(rawSpd/18,0,1);
      const isLobTrail=(last.z??0)>1.5;

      ctx.save();
      const pts=trail.map(t=>{ const pos=toCanvas(t.y,t.x); const zOff=(t.z??0)*CL.scaleH*0.55; return {x:pos.x,y:pos.y-zOff,z:t.z??0}; });

      // Camada 1: glow externo amplo
      ctx.globalAlpha=0.14+fastFrac*0.10;
      ctx.strokeStyle=isLobTrail?'#60b8ff':fastFrac>0.6?'#ff6600':'#d4a830';
      ctx.lineWidth=16+fastFrac*26; ctx.lineCap='round'; ctx.lineJoin='round';
      ctx.filter='blur(7px)';
      ctx.beginPath(); pts.forEach((p,i)=>i===0?ctx.moveTo(p.x,p.y):ctx.lineTo(p.x,p.y)); ctx.stroke();
      ctx.filter='none';

      // Camada 2: aberração cromática (alta velocidade)
      if (fastFrac>0.55) {
        const aberOff=fastFrac*3;
        ctx.save(); ctx.globalAlpha=(fastFrac-0.55)*0.18; ctx.strokeStyle='rgba(255,60,0,1)';
        ctx.lineWidth=4+fastFrac*6; ctx.lineCap='round'; ctx.lineJoin='round';
        ctx.beginPath(); pts.forEach((p,i)=>i===0?ctx.moveTo(p.x-aberOff,p.y):ctx.lineTo(p.x-aberOff,p.y)); ctx.stroke(); ctx.restore();
        ctx.save(); ctx.globalAlpha=(fastFrac-0.55)*0.18; ctx.strokeStyle='rgba(0,200,255,1)';
        ctx.lineWidth=4+fastFrac*6; ctx.lineCap='round'; ctx.lineJoin='round';
        ctx.beginPath(); pts.forEach((p,i)=>i===0?ctx.moveTo(p.x+aberOff,p.y):ctx.lineTo(p.x+aberOff,p.y)); ctx.stroke(); ctx.restore();
      }

      // Camada 3: ribbon principal
      for (let i=1;i<pts.length;i++) {
        const frac=i/pts.length, p0=pts[i-1], p1=pts[i];
        let hue,sat,lgt;
        if (isLobTrail)          { hue=205;sat=80;lgt=lerp(40,82,frac); }
        else if (fastFrac>0.7)   { hue=lerp(36,18,frac);sat=100;lgt=lerp(50,92,frac); }
        else                     { hue=lerp(44,54,frac);sat=95;lgt=lerp(46,78,frac); }
        ctx.globalAlpha=frac*0.88;
        ctx.strokeStyle=`hsl(${hue},${sat}%,${Math.round(lgt)}%)`;
        ctx.lineWidth=lerp(0.5,6+fastFrac*5,frac); ctx.lineCap='round';
        ctx.shadowColor=`hsl(${hue},${sat}%,${Math.round(lgt*0.6)}%)`; ctx.shadowBlur=frac*8;
        ctx.beginPath(); ctx.moveTo(p0.x,p0.y); ctx.lineTo(p1.x,p1.y); ctx.stroke();
      }
      ctx.shadowBlur=0;

      // Camada 3.5: núcleo branco para dar leitura premium ao rastro
      for (let i=1;i<pts.length;i++) {
        const frac=i/pts.length, p0=pts[i-1], p1=pts[i];
        ctx.globalAlpha=0.08 + frac * (0.22 + fastFrac * 0.16);
        ctx.strokeStyle=isLobTrail?'rgba(215,245,255,0.95)':'rgba(255,250,232,0.96)';
        ctx.lineWidth=lerp(0.45,2.2+fastFrac*2.4,frac);
        ctx.lineCap='round';
        ctx.beginPath(); ctx.moveTo(p0.x,p0.y); ctx.lineTo(p1.x,p1.y); ctx.stroke();
      }

      // Camada 4: ponto de cabeça brilhante
      if (pts.length>0) {
        const tip=pts[pts.length-1], headR=3.5+fastFrac*4;
        const hg=ctx.createRadialGradient(tip.x,tip.y,0,tip.x,tip.y,headR*2.5);
        const hColor=isLobTrail?'#80d8ff':fastFrac>0.6?'#ffcc44':'#ffe080';
        hg.addColorStop(0,hColor); hg.addColorStop(0.4,hColor+'aa'); hg.addColorStop(1,'transparent');
        ctx.globalAlpha=0.9; ctx.fillStyle=hg;
        ctx.beginPath(); ctx.arc(tip.x,tip.y,headR*2.5,0,Math.PI*2); ctx.fill();
        ctx.globalAlpha=1; ctx.fillStyle='#ffffff';
        ctx.beginPath(); ctx.arc(tip.x,tip.y,headR*0.5,0,Math.PI*2); ctx.fill();
      }

      // Camada 5: speed lines
      if (fastFrac>0.60&&pts.length>3) {
        const tip=pts[pts.length-1], prev3=pts[pts.length-3];
        const ang=Math.atan2(tip.y-prev3.y,tip.x-prev3.x);
        ctx.globalAlpha=(fastFrac-0.60)*0.80; ctx.strokeStyle='#ffe070'; ctx.lineWidth=1; ctx.shadowBlur=0;
        for (let s=-3;s<=3;s++) {
          if(s===0) continue;
          const a2=ang+s*0.18, len=8+fastFrac*18;
          ctx.beginPath();
          ctx.moveTo(tip.x-Math.cos(a2)*len*0.2,tip.y-Math.sin(a2)*len*0.2);
          ctx.lineTo(tip.x-Math.cos(a2)*(len+10+fastFrac*12),tip.y-Math.sin(a2)*(len+10+fastFrac*12));
          ctx.stroke();
        }
      }
      ctx.restore();
    }

    // ── FASE 3: Motion blur direcional real ───────────────────────────────
    // Calcula os pixels de blur na direção oposta ao movimento da bola.
    // Gera 4 cópias fantasmais com decaimento, dando impressão de velocidade.
    function drawBallMotionBlur(ctx, ball, ballX, ballY, ballR, fastF) {
      if (fastF < 0.25) return; // só em bolas rápidas
      const CL = CLRef.current;
      // Direção do movimento em canvas coords
      const vx = ball.vel.y * CL.scaleW;  // court Y → canvas X
      const vy = ball.vel.x * CL.scaleH;  // court X → canvas Y (ignorar Z para blur)
      const spd = Math.hypot(vx, vy);
      if (spd < 1) return;
      const nx = vx / spd, ny = vy / spd; // vetor unitário da direção
      const blurLen = Math.min(ballR * 3.5, fastF * 28); // comprimento do blur
      const STEPS = 5;
      ctx.save();
      for (let s = 1; s <= STEPS; s++) {
        const t = s / STEPS;
        const ox = -nx * blurLen * t;
        const oy = -ny * blurLen * t;
        // Alpha decai rapidamente: mais opaco perto da bola, quase invisível no fim
        const bAlpha = (1 - t) * (1 - t) * (0.18 + fastF * 0.22);
        // Raio também decai levemente
        const bR = ballR * (1 - t * 0.35);
        ctx.globalAlpha = bAlpha;
        // Gradiente rápido para dar textura ao blur
        const bg = ctx.createRadialGradient(
          ballX + ox - bR * 0.2, ballY + oy - bR * 0.2, 0,
          ballX + ox, ballY + oy, bR
        );
        if (fastF > 0.65) {
          bg.addColorStop(0, '#ffffff');
          bg.addColorStop(0.3, '#fffad0');
          bg.addColorStop(1, '#c08800');
        } else {
          bg.addColorStop(0, '#fffde8');
          bg.addColorStop(0.4, '#e0c84c');
          bg.addColorStop(1, '#8a7010');
        }
        ctx.fillStyle = bg;
        ctx.beginPath(); ctx.arc(ballX + ox, ballY + oy, bR, 0, Math.PI*2); ctx.fill();
      }
      ctx.restore();
    }

    // ── Ball ─────────────────────────────────────────────────────────────
    function drawBall(ctx, gs, surf) {
      const ball=gs.ball, CL=CLRef.current;
      const pos=toCanvas(ball.pos.y,ball.pos.x);
      const bz=Math.max(0,ball.pos.z), zOff=bz*CL.scaleH*0.55;
      const ballX=pos.x, groundY=pos.y, ballY=groundY-zOff;
      const spd=Math.sqrt(ball.vel.x**2+ball.vel.y**2+(ball.vel.z||0)**2)*3.6;
      const fastF=clamp(spd/160,0,1);
      const sc2=Math.max(0.25,1-bz*0.55);
      const ballR=Math.max(3.5,5+bz*1.6+fastF*1.5);

      // Guard: skip draw if any position/size value is non-finite
      if (!isFinite(ballX) || !isFinite(ballY) || !isFinite(ballR) || !isFinite(fastF)) return;

      // ── Ball Z-shadow: expands+fades when high, contracts+darkens when low ──
      if (bz>0.01) {
        ctx.save();
        // Outer diffuse shadow (grows with height)
        const bshOuter = Math.max(4, 10 + bz * 3.5);
        const bshAlphaOuter = Math.max(0, 0.22 - bz * 0.06);
        if (bz > 0.5 && bshAlphaOuter > 0.02) {
          ctx.globalAlpha = bshAlphaOuter;
          ctx.filter = `blur(${Math.min(6, bz * 2.2)}px)`;
          ctx.fillStyle = 'rgba(0,0,0,0.6)';
          ctx.beginPath(); ctx.ellipse(ballX + 3, groundY + 2, bshOuter, bshOuter * 0.35, 0, 0, Math.PI*2); ctx.fill();
          ctx.filter = 'none';
        }
        // Core sharp shadow (contracts+darkens when near ground)
        const sa = Math.max(0.04, 0.55 * sc2);
        const sw = Math.max(3.5, 9.5 * Math.max(0.3, sc2));
        ctx.globalAlpha = sa;
        ctx.fillStyle = 'rgba(0,0,0,0.92)';
        ctx.beginPath(); ctx.ellipse(ballX + 2, groundY + 2, sw, sw * 0.36, 0, 0, Math.PI*2); ctx.fill();
        ctx.restore();
      }
      if (bz>0.12) {
        ctx.save(); const la=Math.min(0.50,bz*0.16);
        ctx.strokeStyle=`rgba(240,230,150,${la})`; ctx.lineWidth=1; ctx.setLineDash([2,4]);
        ctx.beginPath();ctx.moveTo(ballX,groundY);ctx.lineTo(ballX,ballY);ctx.stroke(); ctx.setLineDash([]);
        ctx.strokeStyle=`rgba(240,230,150,${la*0.55})`; ctx.lineWidth=0.9;
        const cs=5; ctx.beginPath();ctx.moveTo(ballX-cs,groundY-2);ctx.lineTo(ballX+cs,groundY+2);ctx.moveTo(ballX+cs,groundY-2);ctx.lineTo(ballX-cs,groundY+2);ctx.stroke(); ctx.restore();
      }
      ctx.save();
      const haloR=Math.max(0.1, ballR+3+fastF*12), haloAlpha=0.12+fastF*0.28;
      const haloColor=fastF>0.7?RG.clay:'#c9a84c';
      ctx.shadowColor=haloColor; ctx.shadowBlur=18+fastF*20;
      const halo=ctx.createRadialGradient(ballX,ballY,0,ballX,ballY,haloR);
      halo.addColorStop(0,haloColor+'55'); halo.addColorStop(1,'transparent');
      ctx.globalAlpha=haloAlpha; ctx.fillStyle=halo; ctx.beginPath();ctx.arc(ballX,ballY,haloR,0,Math.PI*2);ctx.fill(); ctx.restore();

      // ── FASE 3: Motion blur direcional ────────────────────────────────
      drawBallMotionBlur(ctx, ball, ballX, ballY, ballR, fastF);

      // ── FASE 3: Glow branco sutil no impacto / alta velocidade ─────────
      // Pequeno halo branco que aparece quando a bola está rápida ou recém batida
      if (fastF > 0.35) {
        ctx.save();
        const wGlowR = ballR * (1 + fastF * 0.55);
        const wGlowA = fastF * 0.18;
        const wg = ctx.createRadialGradient(ballX - ballR*0.15, ballY - ballR*0.15, 0, ballX, ballY, wGlowR);
        wg.addColorStop(0, `rgba(255,255,255,${wGlowA * 1.8})`);
        wg.addColorStop(0.35, `rgba(255,248,200,${wGlowA})`);
        wg.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = wg;
        ctx.beginPath(); ctx.arc(ballX, ballY, wGlowR, 0, Math.PI*2); ctx.fill();
        ctx.restore();
      }

      if (fastF > 0.45 || bz > 1.25) {
        ctx.save();
        const ringAlpha = Math.min(0.34, 0.10 + fastF * 0.24 + bz * 0.03);
        const ringR = ballR * (1.75 + fastF * 0.7 + bz * 0.08);
        ctx.globalAlpha = ringAlpha;
        ctx.strokeStyle = fastF > 0.72 ? 'rgba(255,212,92,0.95)' : 'rgba(210,235,255,0.82)';
        ctx.lineWidth = 1.2 + fastF * 1.8;
        ctx.shadowColor = fastF > 0.72 ? 'rgba(255,180,54,0.65)' : 'rgba(120,210,255,0.55)';
        ctx.shadowBlur = 10 + fastF * 12;
        ctx.beginPath();
        ctx.arc(ballX, ballY, ringR, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      ctx.save();
      ctx.shadowColor=fastF>0.7?'#ffaa22':'#c9a84c'; ctx.shadowBlur=8+fastF*14;
      const bg3=ctx.createRadialGradient(ballX-1.5,ballY-1.5,0,ballX,ballY,ballR);
      if (fastF>0.65) { bg3.addColorStop(0,'#ffffff');bg3.addColorStop(0.25,'#fffae0');bg3.addColorStop(0.65,'#e0a020');bg3.addColorStop(1,'#804000'); }
      else { bg3.addColorStop(0,'#fffde8');bg3.addColorStop(0.35,'#e0c84c');bg3.addColorStop(0.80,'#a08818');bg3.addColorStop(1,'#706010'); }
      ctx.fillStyle=bg3; ctx.beginPath();ctx.arc(ballX,ballY,ballR,0,Math.PI*2);ctx.fill();
      // ── Especular (highlight branco) posicionado em relação à luz ──────
      // Luz vem do canto superior-esquerdo: highlight fica em (-0.28, -0.28)
      ctx.fillStyle='rgba(255,255,255,0.45)';
      ctx.beginPath();ctx.arc(ballX-ballR*0.28,ballY-ballR*0.28,ballR*0.30,0,Math.PI*2);ctx.fill();
      // Micro ponto brilhante extra
      ctx.fillStyle='rgba(255,255,255,0.70)';
      ctx.beginPath();ctx.arc(ballX-ballR*0.38,ballY-ballR*0.38,ballR*0.10,0,Math.PI*2);ctx.fill();
      ctx.restore();
    }

    // ── Draw particles ────────────────────────────────────────────────────
    function drawParticles(ctx) {
      ctx.save();
      // ── Shockwave rings ──
      shockwaveRef.current.forEach(sw => {
        const a = Math.max(0, sw.life);
        ctx.save();
        ctx.globalAlpha = a * (sw.inner ? 0.40 : 0.60);
        ctx.strokeStyle = sw.color; ctx.lineWidth = sw.lineW * a;
        ctx.shadowColor = sw.color; ctx.shadowBlur = sw.inner ? 4 : 10;
        ctx.beginPath(); ctx.ellipse(sw.x, sw.y, sw.r, sw.r*0.32, 0, 0, Math.PI*2); ctx.stroke();
        ctx.restore();
      });
      // ── Bounce dust (elíptico com rotação) ──
      dustRef.current.forEach(d => {
        const a = Math.max(0, d.life);
        ctx.save(); ctx.globalAlpha = a * d.alpha;
        ctx.translate(d.x, d.y); ctx.rotate(d.rot);
        const g = ctx.createRadialGradient(0,0,0,0,0,Math.max(d.rx,d.ry));
        g.addColorStop(0,   d.color); g.addColorStop(0.5, d.color); g.addColorStop(1,'transparent');
        ctx.fillStyle = g; ctx.scale(1, d.ry/d.rx);
        ctx.beginPath(); ctx.arc(0,0,d.rx,0,Math.PI*2); ctx.fill();
        ctx.restore();
      });
      // ── Impact sparks (streaks elongados + burst ring) ──
      sparksRef.current.forEach(s => {
        const a = Math.max(0, s.life);
        ctx.save();
        if (s.isBurst) {
          ctx.globalAlpha = a * 0.55; ctx.strokeStyle = s.color;
          ctx.lineWidth = 2.5*a; ctx.shadowColor = s.color; ctx.shadowBlur = 12;
          ctx.beginPath(); ctx.arc(s.x,s.y,s.r,0,Math.PI*2); ctx.stroke();
        } else {
          ctx.globalAlpha = a * 0.92; ctx.strokeStyle = s.color;
          ctx.lineWidth = s.r*a; ctx.lineCap = 'round';
          if (s.glow) { ctx.shadowColor = s.color; ctx.shadowBlur = 8; }
          const len = s.len*a;
          ctx.beginPath(); ctx.moveTo(s.x,s.y); ctx.lineTo(s.x-Math.cos(s.angle)*len, s.y-Math.sin(s.angle)*len); ctx.stroke();
          ctx.globalAlpha = a*0.5; ctx.fillStyle = '#ffffff';
          ctx.beginPath(); ctx.arc(s.x,s.y,s.r*0.5*a,0,Math.PI*2); ctx.fill();
        }
        ctx.restore();
      });
      // ── Footstep marks ──
      footRef.current.forEach(f => {
        ctx.save(); ctx.globalAlpha = Math.max(0,f.life)*0.30;
        ctx.fillStyle = f.color; ctx.translate(f.x,f.y); ctx.rotate(f.angle);
        ctx.beginPath(); ctx.ellipse(0,0,f.rx,f.ry,0,0,Math.PI*2); ctx.fill();
        ctx.restore();
      });
      ctx.restore();
    }

    // ── VFX queue ─────────────────────────────────────────────────────────
    function drawVFX(ctx, gs) {
      const now=performance.now();
      const queue=gs.vfxQueue;
      for (let i=queue.length-1;i>=0;i--) {
        const ev=queue[i], cfg=VFX_TYPES[ev.type];
        if(!cfg) continue;
        const age=now-ev.born;
        if(age>cfg.dur) continue;
        const t=age/cfg.dur;
        const alpha=clamp(t<0.12?t/0.12:t<0.68?1:1-(t-0.68)/0.32,0,1);
        if(ev.rawCY===undefined) continue;
        const p2=toCanvas(ev.rawCY,ev.rawCX);
        const yOff=-t*(ev.type==='GAME'||ev.type==='SET'?22:36);
        const sc3=1+t*(ev.type==='SET'?0.16:0.14);

        ctx.save(); ctx.globalAlpha=alpha; ctx.translate(p2.x,p2.y+yOff); ctx.scale(sc3,sc3);

        if (ev.type==='GAME'||ev.type==='SET') {
          if(t<0.08) flashRef.current={alpha:ev.type==='SET'?1.2:0.85,color:cfg.color};
          ctx.shadowColor=cfg.color; ctx.shadowBlur=60;
          ctx.fillStyle=cfg.color+'22'; ctx.fillRect(-120,-cfg.fs*0.9,240,cfg.fs*1.8);
          ctx.shadowBlur=0;
        }
        if((ev.type==='ACE'||ev.type==='WINNER')&&t<0.06) {
          flashRef.current={alpha:0.65,color:cfg.color};
          // ── FASE 6: dispara crowd roar ─────────────────────────────
          triggerCrowdRoar();
        }

        let drawColor=cfg.color;
        if (ev.type==='SHOT'&&ev.quality!==undefined) {
          drawColor=ev.quality>=0.75?RG.lime:ev.quality>=0.55?'#FFD700':ev.quality>=0.35?RG.clayLight:'#FF4444';
        }
        ctx.shadowColor=drawColor; ctx.shadowBlur=ev.type==='GAME'||ev.type==='SET'?28:14;
        ctx.fillStyle=drawColor;

        if (ev.type==='SHOT') {
          const label=ev.label||'';
          ctx.font=`900 18px ${RG.display}`;
          const tw2=ctx.measureText(label).width, ph=22, pw=tw2+18, pr=5;
          ctx.save(); ctx.globalAlpha*=0.82; ctx.fillStyle=`${RG.bgPanel}cc`;
          ctx.beginPath();ctx.roundRect(-pw/2,-ph/2,pw,ph,pr);ctx.fill();
          ctx.fillStyle=drawColor; ctx.fillRect(-pw/2,-ph/2,3,ph); ctx.restore();
          ctx.fillStyle=drawColor; ctx.shadowColor=drawColor; ctx.shadowBlur=16;
          ctx.font=`900 18px ${RG.display}`; ctx.fillText(label,2,0);
        } else {
          ctx.font=`900 ${cfg.fs||12}px ${RG.display}`;
          ctx.fillText(`${cfg.emoji||''} ${ev.label||ev.type}`,0,0);
        }
        ctx.restore();
      }
    }

    function freezeVisualFrame(gs, dur = 0.045) {
      if (!gs) return;
      try {
        freezeFrameRef.current = { t: dur, gs: JSON.parse(JSON.stringify(gs)) };
      } catch {
        freezeFrameRef.current = { t: dur, gs };
      }
    }

    // ── Frame loop ────────────────────────────────────────────────────────
    function frame() {
      const sourceGs = rewindGsRef.current || gsRef.current;
      if(!sourceGs){ animRef.current=requestAnimationFrame(frame); return; }
      const ctx=canvas.getContext('2d');
      const dpr=dprRef.current||1;
      ctx.setTransform(dpr,0,0,dpr,0,0);
      const W=canvas.width/dpr, H=canvas.height/dpr;
      // recalcLayout only when canvas size changes (resize handler covers most cases)
      const CL=CLRef.current;
      if (!CL.w || Math.abs(CL.w - (W - 440)) > 20) recalcLayout(W, H);
      const surfId=sourceGs.courtVisual?.surface||'HARD';
      const courtCacheKey = `${surfId}:${tournamentId??''}:${!!courtImgRef.current.img}`;
      const surf=SURF[surfId]||SURF.HARD;
      const dt  = Math.min(0.06, 1/60);

      // Hit label processing
      if (sourceGs.pendingHitLabels&&sourceGs.pendingHitLabels.length>0) {
        const incoming=sourceGs.pendingHitLabels.splice(0);
        const now2=Date.now();
        const ballSpd=sourceGs.ball.inFlight?Math.round(Math.sqrt(sourceGs.ball.vel.y**2+sourceGs.ball.vel.x**2+(sourceGs.ball.vel.z||0)**2)*3.6):0;
        if(ballSpd>10) lastSpeedRef.current=ballSpd;
        const newPills=incoming.map((pl,i)=>{
          const idx=pl.playerSide>0?1:0;
          const meta=SHOT_META[pl.shotType]||{label:pl.shotType,color:'#fff',emoji:'🎾'};
          lastShotRef.current[idx]={type:pl.shotType,label:meta.label,color:meta.color};
          const player=sourceGs.players?.find(p=>p.id===pl.playerId);
          let px2=50,py2=50;
          if(player&&CL.scaleW){ const cp=toCanvas(player.pos.y,player.pos.x); px2=(cp.x/W)*100; py2=(cp.y/H)*100; }
          return{...pl,...meta,id:now2+i+Math.random(),born:now2,px:px2,py:py2,speed:ballSpd};
        });
        setHitLabels(prev=>[...prev.slice(-4),...newPills]);
      }

      // Outcome labels (ACE / WINNER / OUT / NET / DOUBLE_FAULT) → HTML overlay
      if (sourceGs.pendingOutcomeLabels?.length > 0) {
        const incoming2 = sourceGs.pendingOutcomeLabels.splice(0);
        const now3      = Date.now();
        const newOutcome = incoming2.map((ol, i) => {
          let px2 = 50, py2 = 50;
          if (CL.scaleW) {
            const cp = toCanvas(ol.rawCY, ol.rawCX);
            px2 = (cp.x / W) * 100;
            py2 = (cp.y / H) * 100;
          }
          return { ...ol, id: now3 + i + Math.random(), born: now3, px: px2, py: py2 };
        });
        setOutcomeLabels(prev => [...prev.slice(-3), ...newOutcome]);
        setHitLabels([]); // limpa shot labels ao fim do ponto — evita duplo WINNER/OUT/NET

        const bigOutcome = incoming2.find(ol => {
          const tag = `${ol?.label || ''} ${ol?.type || ''}`.toUpperCase();
          return tag.includes('ACE') || tag.includes('WINNER');
        });
        if (bigOutcome && !rewindGsRef.current) {
          const aceLike = `${bigOutcome?.label || ''} ${bigOutcome?.type || ''}`.toUpperCase().includes('ACE');
          impactPulseRef.current = { t: aceLike ? 0.28 : 0.22, dur: aceLike ? 0.28 : 0.22, power: aceLike ? 1 : 0.8 };
          if (!disableCameraMotion) {
            shakeRef.current = { x:0, y:0, mag: aceLike ? 1.05 : 0.78, t: aceLike ? 0.34 : 0.26, dur: aceLike ? 0.34 : 0.26 };
          }
          flashRef.current = { alpha: aceLike ? 1.0 : 0.82, color: aceLike ? '#ffd86a' : '#ffffff' };
          freezeVisualFrame(sourceGs, aceLike ? 0.055 : 0.04);
        }
      }
      if(sourceGs.ball.inFlight){ const spd2=Math.sqrt(sourceGs.ball.vel.y**2+sourceGs.ball.vel.x**2+(sourceGs.ball.vel.z||0)**2)*3.6; if(spd2>10) lastSpeedRef.current=Math.round(spd2); }

      // Bounce effects
      const bc=sourceGs.ball.bounceCount??0;
      if(bc!==lastBounceRef.current&&sourceGs.ball.pos.z<0.15){
        const bpos2=toCanvas(sourceGs.ball.pos.y,sourceGs.ball.pos.x);
        const bspd=Math.sqrt(sourceGs.ball.vel.x**2+sourceGs.ball.vel.y**2)*3.6/120;
        spawnDust(bpos2,surf,bspd); spawnShockwave(bpos2,surf.dust,bspd);
        paintWear(bpos2.x, bpos2.y, 14+bspd*10, 7+bspd*5, 0.012+bspd*0.018, surfId);
        // Clay ball marks: ellipse oriented along ball travel direction
        if (surf === SURF.CLAY) {
          const velAngle = Math.atan2(sourceGs.ball.vel.x * CL.scaleH, sourceGs.ball.vel.y * CL.scaleW);
          const speedF = clamp(bspd, 0.2, 1.2);
          ballMarksRef.current.push({
            x: bpos2.x, y: bpos2.y,
            rx: 3.5 + speedF * 2.0,
            ry: 2.0 + speedF * 0.8,
            angle: velAngle,
            age: 0,
            maxAge: 380 + Math.floor(Math.random() * 120), // frames till fade
          });
          // Keep at most 60 marks
          if (ballMarksRef.current.length > 60) ballMarksRef.current.shift();
        }
        lastBounceRef.current=bc;
      }
      // Impact sparks
      const cv=sourceGs.ball.vel, pv=lastBallVelRef.current;
      const velDelta=Math.hypot(cv.x-pv.x,cv.y-pv.y,(cv.z||0)-(pv.z||0));
      if(velDelta>12&&sourceGs.ball.inFlight){
        const hitter=sourceGs.players.find(p=>p.id===sourceGs.ball.lastHitBy);
        if(hitter){
          const hpos=toCanvas(hitter.pos.y,hitter.pos.x);
          const q2=hitter._lastQuality??0.5;
          // Mishit: sparks mais intensas e vermelhas, sem flash brilhante
          const lastPill=sourceGs.pendingHitLabels?.[sourceGs.pendingHitLabels.length-1];
          const isMishitSpark=lastPill?.mishit || q2<0.30;
          const sparkColor=isMishitSpark?'#FF2244':q2>0.70?RG.lime:q2>0.45?RG.clay:'#FF3333';
          const shotAngle=Math.atan2(cv.y-pv.y,cv.x-pv.x);
          // Mishit: dobra as sparks (chama spawnSparks duas vezes com leve offset de ângulo)
          spawnSparks(hpos,sparkColor,isMishitSpark?Math.min(q2+0.4,1.0):q2,shotAngle);
          if(isMishitSpark) spawnSparks(hpos,'#FF6644',0.55,shotAngle+0.4);
          if(q2>0.65&&!isMishitSpark) flashRef.current={alpha:q2*0.7,color:sparkColor};
          if (!isMishitSpark && q2 > 0.8 && (sourceGs.rally ?? 0) <= 2 && !rewindGsRef.current) {
            impactPulseRef.current = { t:0.18, dur:0.18, power:0.6 + q2 * 0.45 };
            if (!disableCameraMotion) {
              shakeRef.current = { x:0, y:0, mag:0.38 + q2 * 0.55, t:0.16, dur:0.16 };
            }
            freezeVisualFrame(sourceGs, 0.028);
          }
        }
      }

      const pressureState = getVisualPressureState(sourceGs);
      const momentBonus = pressureState.momentType === 'match' ? 0.42
        : pressureState.momentType === 'set' ? 0.32
        : pressureState.momentType === 'break' ? 0.24
        : pressureState.momentType === 'game' ? 0.14
        : pressureState.momentType === 'clutch' ? 0.20
        : pressureState.momentType === 'rally' ? 0.10
        : 0;
      const targetAtm=clamp(((sourceGs.rally ?? 0)-3)/14 + momentBonus,0,1);
      rallyAtmRef.current=lerp(rallyAtmRef.current,targetAtm,pressureState.momentType ? 0.055 : 0.025);

      // ── Celebration state decay ───────────────────────────────────────────
      const dt_celeb = Math.min(0.05, 1/60);
      const cs = celebStateRef.current;
      for (const pid in cs) {
        if (cs[pid].timer > 0) cs[pid].timer = Math.max(0, cs[pid].timer - dt_celeb);
      }

      const srvPulse = servePulseRef.current;
      if (srvPulse.t > 0) srvPulse.t = Math.max(0, srvPulse.t - dt);
      const impPulse = impactPulseRef.current;
      if (impPulse.t > 0) impPulse.t = Math.max(0, impPulse.t - dt);
      const frz = freezeFrameRef.current;
      if (frz.t > 0) frz.t = Math.max(0, frz.t - dt);
      else frz.gs = null;

      // ── Camera shake update ──────────────────────────────────────────────
      const shk = shakeRef.current;
      if (disableCameraMotion) {
        shk.t = 0;
        shk.x = 0;
        shk.y = 0;
      } else if (shk.t > 0) {
        shk.t = Math.max(0, shk.t - dt);
        const shakeFrac = shk.t / shk.dur;
        shk.x = (Math.random()-0.5) * shk.mag * shakeFrac * 3.5;
        shk.y = (Math.random()-0.5) * shk.mag * shakeFrac * 2.0;
      } else { shk.x = 0; shk.y = 0; }

      // ── Detect serve → trigger shake on strong serve ─────────────────────
      const bspeed2 = Math.sqrt(sourceGs.ball.vel.x**2+sourceGs.ball.vel.y**2+(sourceGs.ball.vel.z||0)**2)*3.6;
      const isServeState = sourceGs.gameState === GameState.PRE_SERVE || sourceGs.gameState === GameState.SERVING;
      const wasServe = prevServeRef.current;
      prevServeRef.current = isServeState;
      if (!disableCameraMotion && !isServeState && wasServe && bspeed2 > 140) {
        // Strong serve just launched
        const shakeMag = clamp((bspeed2 - 140) / 80, 0, 1);
        shakeRef.current = { x:0, y:0, mag:shakeMag, t:0.28, dur:0.28 };
        flashRef.current = { alpha: shakeMag * 0.45, color: surf.line };
        servePulseRef.current = { t:0.26, dur:0.26, power:0.45 + shakeMag * 0.8 };
      }

      const gs = (!rewindGsRef.current && frz.t > 0 && frz.gs) ? frz.gs : sourceGs;

      // ── Match moment overlay logic ────────────────────────────────────────
      const mom2 = momentRef.current;
      const newMoment = pressureState.momentType;
      if (newMoment !== mom2.type) {
        mom2.type = newMoment;
        mom2.label = pressureState.label || '';
        mom2.subLabel = pressureState.subLabel || '';
        if (newMoment && !rewindGsRef.current) {
          flashRef.current = {
            alpha: newMoment === 'match' ? 0.34 : newMoment === 'set' ? 0.26 : newMoment === 'break' ? 0.20 : 0.14,
            color: newMoment === 'match' ? '#ffd54a' : newMoment === 'set' ? '#ff9d5c' : newMoment === 'break' ? '#ff6247' : '#7ce7ff',
          };
        }
      }
      if (newMoment === 'rally') {
        mom2.label = pressureState.label || `${gs.rally ?? 0} SHOTS`;
        mom2.subLabel = pressureState.subLabel || 'Crowd rising with the exchange';
      }
      mom2.alpha = newMoment ? Math.min(1, mom2.alpha + dt*3.5) : Math.max(0, mom2.alpha - dt*5);
      mom2.pulse = (mom2.pulse + dt * 2.8) % (Math.PI * 2);

      // ── Cinematic camera: zoom + drift + shake ────────────────────────────
      const cam = cameraRef.current;
      const servePulse = disableCameraMotion ? 0 : (srvPulse.dur > 0 ? srvPulse.t / srvPulse.dur : 0);
      const impactPulse = disableCameraMotion ? 0 : (impPulse.dur > 0 ? impPulse.t / impPulse.dur : 0);
      const speedZoom = disableCameraMotion ? 0 : clamp((bspeed2 - 110) / 140, 0, 1) * 0.018;
      const momentZoom = disableCameraMotion ? 0 : pressureState.momentType === 'match' ? 0.055
        : pressureState.momentType === 'set' ? 0.042
        : pressureState.momentType === 'break' ? 0.032
        : pressureState.momentType === 'game' ? 0.022
        : pressureState.momentType === 'clutch' ? 0.028
        : pressureState.momentType === 'rally' ? 0.014
        : 0;
      const targetZoom = disableCameraMotion ? 1 : 1 + momentZoom + speedZoom + servePulse * (srvPulse.power || 0) * 0.045 + impactPulse * (impPulse.power || 0) * 0.032;
      cam.zoom = lerp(cam.zoom, targetZoom, pressureState.momentType ? 0.10 : 0.06);
      const focusPos = toCanvas(gs.ball.pos.y, gs.ball.pos.x);
      const targetCamX = disableCameraMotion ? 0 : clamp((W * 0.5 - focusPos.x) * (0.025 + momentZoom * 0.45), -20, 20);
      const targetCamY = disableCameraMotion ? 0 : clamp((H * 0.5 - focusPos.y) * (0.015 + momentZoom * 0.30), -12, 12);
      cam.x = lerp(cam.x, targetCamX, pressureState.momentType ? 0.09 : 0.045);
      cam.y = lerp(cam.y, targetCamY, pressureState.momentType ? 0.09 : 0.045);

      ctx.save();
      ctx.translate(W * 0.5 + shk.x, H * 0.5 + shk.y);
      ctx.scale(cam.zoom, cam.zoom);
      ctx.translate(-W * 0.5 + cam.x, -H * 0.5 + cam.y);

      drawBG(ctx,W,H,surf);
      drawLiveCrowd(ctx, W, H, rallyAtmRef.current, crowdRoarRef.current);
      drawAtmosphere(ctx,W,H,CL,rallyAtmRef.current);
      // ── FASE 6: bandeiras + crowd roar overlay ───────────────────────
      drawFlags(ctx, W, H, crowdWaveRef.current, crowdWaveIntRef.current);
      drawCrowdRoarOverlay(ctx, W, H);
      drawVenuePersonnel(ctx,CL,surf);

      // Court layer (cached per surface)
      if(courtLayerRef.current&&courtLayerCtxRef.current){
        if(courtLayerSurfRef.current!==courtCacheKey){
          const clCtx=courtLayerCtxRef.current; clCtx.clearRect(0,0,W,H);
          drawCourt(clCtx,CL,surf,gs); courtLayerSurfRef.current=courtCacheKey;
          ballMarksRef.current = []; // clear ball marks on surface change
        }
        ctx.drawImage(courtLayerRef.current,0,0);
        // Desgaste gradual acumulado
        if (wearLayerRef.current) {
          ctx.save(); ctx.globalCompositeOperation='multiply'; ctx.globalAlpha=0.72;
          ctx.drawImage(wearLayerRef.current,0,0); ctx.restore();
        }
        drawServeBox(ctx,CL,gs);
      } else { drawCourt(ctx,CL,surf,gs); }

      // Footstep marks
      gs.players.forEach(p=>{
        if(!p?.pos) return;
        const spd3=Math.hypot(p.vel?.x||0,p.vel?.y||0);
        if(spd3>3.5&&Math.random()<0.08){
          const fp=toCanvas(p.pos.y,p.pos.x);
          const angle=Math.atan2((p.vel?.y||0)*CLRef.current.scaleH,(p.vel?.x||0)*CLRef.current.scaleW);
          spawnFoot(fp,p.color+'55',angle);
          paintWear(fp.x,fp.y,6,3,0.003,surfId);
        }
      });
      lastBallVelRef.current={...gs.ball.vel};

      updateParticles(); drawParticles(ctx); drawTrail(ctx, rewindTrailRef.current || trailRef.current);

      // Age ball marks and draw them (below players, above court)
      ballMarksRef.current = ballMarksRef.current.filter(m => m.age < m.maxAge);
      ballMarksRef.current.forEach(m => m.age++);
      drawBallMarks(ctx, CL, surf);

      // Players sorted by distance from ball
      const ball2=gs.ball, bpos3=toCanvas(ball2.pos.y,ball2.pos.x);
      const plist=gs.players.filter(p=>p?.pos);
      plist.sort((a,b)=>{ const pa=toCanvas(a.pos.y,a.pos.x),pb=toCanvas(b.pos.y,b.pos.x); return Math.hypot(pb.x-bpos3.x,pb.y-bpos3.y)-Math.hypot(pa.x-bpos3.x,pa.y-bpos3.y); });
      plist.forEach(p=>drawPlayer(ctx,p,gs,CL,surf));

      drawBall(ctx,gs,surf); drawVFX(ctx,gs);

      // ── Close camera transform ────────────────────────────────────────────
      ctx.restore();

      // ── Match moment overlay (canvas, bottom center) ──────────────────────
      const mom3 = momentRef.current;
      if (mom3.alpha > 0.02 && mom3.type) {
        const pSin = Math.sin(mom3.pulse) * 0.5 + 0.5;
        const mAlpha = mom3.alpha;
        const mColor = mom3.type === 'match' ? `rgba(255,215,0,${mAlpha})`
                     : mom3.type === 'set'    ? `rgba(255,155,92,${mAlpha})`
                     : mom3.type === 'break'  ? `rgba(255,80,55,${mAlpha})`
                     : mom3.type === 'game'   ? `rgba(120,225,255,${mAlpha * 0.92})`
                     : mom3.type === 'clutch' ? `rgba(214,190,255,${mAlpha * 0.9})`
                     :                          `rgba(0,210,255,${mAlpha * 0.85})`;
        const subLabel = mom3.subLabel || (mom3.type === 'match' ? 'Championship pressure'
                       : mom3.type === 'set' ? 'One point from taking the set'
                       : mom3.type === 'break' ? 'Returner can steal the game'
                       : mom3.type === 'game' ? 'Server can close the game now'
                       : mom3.type === 'clutch' ? 'Pressure is peaking'
                       : 'Crowd rising with the exchange');

        // Subtle canvas tint
        const tintA = mAlpha * (0.06 + pSin * 0.04);
        ctx.save();
        ctx.fillStyle = mom3.type === 'match' ? `rgba(200,150,0,${tintA})`
                       : mom3.type === 'set'    ? `rgba(195,92,28,${tintA})`
                       : mom3.type === 'break'  ? `rgba(160,30,20,${tintA})`
                       : mom3.type === 'game'   ? `rgba(26,110,150,${tintA * 0.82})`
                       : mom3.type === 'clutch' ? `rgba(96,70,140,${tintA * 0.76})`
                       :                          `rgba(0,140,180,${tintA * 0.6})`;
        ctx.fillRect(0, 0, W, H);

        const vignette = ctx.createLinearGradient(0, H, 0, H - 120);
        vignette.addColorStop(0, mom3.type === 'match' ? `rgba(200,150,0,${mAlpha * 0.18})`
                               : mom3.type === 'set'    ? `rgba(210,100,35,${mAlpha * 0.18})`
                               : mom3.type === 'break'  ? `rgba(190,45,25,${mAlpha * 0.16})`
                               : mom3.type === 'game'   ? `rgba(42,145,190,${mAlpha * 0.15})`
                               : mom3.type === 'clutch' ? `rgba(120,90,200,${mAlpha * 0.14})`
                               :                          `rgba(0,160,210,${mAlpha * 0.12})`);
        vignette.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = vignette;
        ctx.fillRect(0, H - 140, W, 140);

        // Pill label
        ctx.font = `700 ${mom3.type === 'match' ? 12 : 10}px 'Barlow Condensed', sans-serif`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        const mW = Math.max(150, ctx.measureText(mom3.label).width + 40);
        const mH = mom3.type === 'rally' ? 30 : 34, mX = W/2, mY = H - 82 + pSin * 2.5;

        const panelGrad = ctx.createLinearGradient(mX - mW/2, mY, mX + mW/2, mY);
        panelGrad.addColorStop(0, `rgba(5,10,8,${mAlpha * 0.92})`);
        panelGrad.addColorStop(0.5, `rgba(12,22,17,${mAlpha * 0.96})`);
        panelGrad.addColorStop(1, `rgba(5,10,8,${mAlpha * 0.92})`);
        ctx.fillStyle = panelGrad;
        ctx.beginPath(); ctx.roundRect(mX - mW/2, mY - mH/2, mW, mH, 5); ctx.fill();

        ctx.strokeStyle = mom3.type === 'match' ? `rgba(255,215,0,${mAlpha * 0.75})`
                       : mom3.type === 'set'    ? `rgba(255,168,92,${mAlpha * 0.74})`
                       : mom3.type === 'break'  ? `rgba(255,96,70,${mAlpha * 0.70})`
                       : mom3.type === 'game'   ? `rgba(120,235,255,${mAlpha * 0.62})`
                       : mom3.type === 'clutch' ? `rgba(214,190,255,${mAlpha * 0.60})`
                       :                          `rgba(90,220,255,${mAlpha * 0.55})`;
        ctx.lineWidth = 1.2;
        ctx.stroke();

        ctx.fillStyle = mColor;
        ctx.fillRect(mX - mW/2, mY - mH/2, 4, mH);
        ctx.fillRect(mX + mW/2 - 4, mY - mH/2, 4, mH);

        if (mom3.type === 'match') { ctx.shadowColor = 'rgba(255,215,0,0.8)'; ctx.shadowBlur = 10 + pSin * 6; }
        else if (mom3.type === 'set') { ctx.shadowColor = 'rgba(255,155,92,0.78)'; ctx.shadowBlur = 9 + pSin * 5; }
        else if (mom3.type === 'break') { ctx.shadowColor = 'rgba(255,80,55,0.7)'; ctx.shadowBlur = 7 + pSin * 4; }
        else if (mom3.type === 'game') { ctx.shadowColor = 'rgba(120,225,255,0.68)'; ctx.shadowBlur = 7 + pSin * 3.5; }
        else if (mom3.type === 'clutch') { ctx.shadowColor = 'rgba(214,190,255,0.62)'; ctx.shadowBlur = 8 + pSin * 4; }
        ctx.fillStyle = mColor;
        ctx.font = `800 ${mom3.type === 'match' ? 16 : mom3.type === 'set' ? 15 : 14}px 'Barlow Condensed', sans-serif`;
        ctx.fillText(mom3.label, mX, mY - 5);
        ctx.shadowBlur = 0;
        ctx.font = `600 8px 'Space Mono', monospace`;
        ctx.fillStyle = `rgba(255,255,255,${mAlpha * 0.72})`;
        ctx.fillText(subLabel.toUpperCase(), mX, mY + 9);
        ctx.shadowBlur = 0;
        ctx.restore();
      }

      // ── Shot Intent Overlay — desenho direto no canvas do jogo ────────────
      if (bugOverlayRef.current && shotIntentRef.current) {
        const si   = shotIntentRef.current;
        const ev   = si.lastShotEvent;
        const bnc  = si.lastBouncePos;
        const splayers = si.players || [];

        if (ev) {
          ctx.save();

          // ── helpers canvas ──────────────────────────────────────────────
          // toCanvas(gameY, gameX) → {x, y} — mesmo sistema do engine
          const opponentId = ev.playerId === 0 ? 1 : 0;
          const opponent   = splayers.find(p => p.id === opponentId);
          const playerSide = ev.playerSide ?? (ev.playerId === 0 ? 1 : -1);

          // sigma em metros → pixels (eixo X usando scaleW, Y usando scaleH)
          const sigma  = ev.sigma ?? 0;
          const sigPxW = sigma * CL.scaleW;
          const sigPxH = sigma * CL.scaleH * 0.80;

          const q = ev.quality ?? 0.5;
          // quality → cor da elipse
          const ellipseRGBA = q >= 0.75 ? [96,255,144]
                            : q >= 0.50 ? [255,215,0]
                            : q >= 0.30 ? [240,100,40]
                            :             [255,68,68];
          const [er,eg,eb] = ellipseRGBA;

          // ── Zona aberta ─────────────────────────────────────────────────
          // Quadra do adversário (lado oposto ao batedor)
          if (opponent) {
            const oppX = opponent.pos.x;
            const openLeft = oppX > 0;  // oponente à direita → lado esquerdo aberto

            // X: metade aberta da quadra (em coordenadas de jogo)
            const zoneXMin = openLeft ? -4.115 : 0;
            const zoneXMax = openLeft ?  0     : 4.115;
            // Y: quadra adversária (lado oposto ao jogador que bateu)
            const zoneYMin = playerSide > 0 ? -11.885 : 0;
            const zoneYMax = playerSide > 0 ?  0      : 11.885;

            const zTL = toCanvas(zoneYMin, zoneXMin);
            const zBR = toCanvas(zoneYMax, zoneXMax);
            const zW  = Math.abs(zBR.x - zTL.x);
            const zH  = Math.abs(zBR.y - zTL.y);

            ctx.fillStyle = 'rgba(96,255,144,0.10)';
            ctx.fillRect(Math.min(zTL.x, zBR.x), Math.min(zTL.y, zBR.y), zW, zH);

            ctx.strokeStyle = 'rgba(96,255,144,0.40)';
            ctx.lineWidth   = 1;
            ctx.setLineDash([4, 5]);
            ctx.strokeRect(Math.min(zTL.x, zBR.x), Math.min(zTL.y, zBR.y), zW, zH);
            ctx.setLineDash([]);

            // Label "ABERTA"
            const zMidX = (zTL.x + zBR.x) / 2;
            const zMidY = (zTL.y + zBR.y) / 2;
            ctx.font = `600 ${Math.max(8, CL.scaleW * 0.5)}px 'Space Mono', monospace`;
            ctx.textAlign   = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle   = 'rgba(96,255,144,0.55)';
            ctx.fillText('ABERTA', zMidX, zMidY);
          }

          // ── Elipse de dispersão σ ───────────────────────────────────────
          if (sigma > 0.01 && ev.intentX !== undefined) {
            const aim = toCanvas(ev.intentY, ev.intentX);
            ctx.save();
            ctx.beginPath();
            ctx.ellipse(aim.x, aim.y, Math.max(sigPxW, 3), Math.max(sigPxH, 3), 0, 0, Math.PI * 2);
            ctx.fillStyle   = `rgba(${er},${eg},${eb},0.15)`;
            ctx.fill();
            ctx.strokeStyle = `rgba(${er},${eg},${eb},0.60)`;
            ctx.lineWidth   = 1.5;
            ctx.setLineDash([4, 4]);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.restore();
          }

          // ── Alvo intencional — cruz + ponto dourado ─────────────────────
          if (ev.intentX !== undefined) {
            const aim  = toCanvas(ev.intentY, ev.intentX);
            const ARM  = Math.max(6, CL.scaleW * 0.4);
            ctx.strokeStyle = '#FFD700';
            ctx.lineWidth   = 2;
            ctx.shadowColor = 'rgba(255,215,0,0.8)';
            ctx.shadowBlur  = 6;
            ctx.beginPath(); ctx.moveTo(aim.x - ARM, aim.y); ctx.lineTo(aim.x + ARM, aim.y); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(aim.x, aim.y - ARM); ctx.lineTo(aim.x, aim.y + ARM); ctx.stroke();
            ctx.shadowBlur = 0;
            ctx.beginPath(); ctx.arc(aim.x, aim.y, 3, 0, Math.PI * 2);
            ctx.fillStyle = '#FFD700'; ctx.fill();

            // Label de quality
            const qPct = Math.round(q * 100);
            const qColor = q >= 0.75 ? '#60FF90' : q >= 0.50 ? '#FFD700' : q >= 0.30 ? '#F06428' : '#FF4444';
            ctx.font = `700 ${Math.max(9, CL.scaleW * 0.55)}px 'Space Mono', monospace`;
            ctx.textAlign    = 'center';
            ctx.textBaseline = 'bottom';
            ctx.fillStyle    = 'rgba(0,0,0,0.6)';
            ctx.fillText(`Q${qPct}%`, aim.x + 1, aim.y - ARM - 1);
            ctx.fillStyle = qColor;
            ctx.fillText(`Q${qPct}%`, aim.x, aim.y - ARM - 2);
          }

          // ── Quique real — círculo branco + × vermelho ───────────────────
          if (bnc) {
            const bp  = toCanvas(bnc.y, bnc.x);
            const R   = Math.max(5, CL.scaleW * 0.35);
            ctx.strokeStyle = 'rgba(255,255,255,0.9)';
            ctx.lineWidth   = 2;
            ctx.shadowColor = 'rgba(255,255,255,0.6)';
            ctx.shadowBlur  = 5;
            ctx.beginPath(); ctx.arc(bp.x, bp.y, R, 0, Math.PI * 2); ctx.stroke();
            ctx.shadowBlur = 0;
            const C = R * 0.55;
            ctx.strokeStyle = '#FF4444';
            ctx.lineWidth   = 1.8;
            ctx.beginPath(); ctx.moveTo(bp.x - C, bp.y - C); ctx.lineTo(bp.x + C, bp.y + C); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(bp.x + C, bp.y - C); ctx.lineTo(bp.x - C, bp.y + C); ctx.stroke();

            // Label "QUIQUE"
            ctx.font = `600 ${Math.max(8, CL.scaleW * 0.45)}px 'Space Mono', monospace`;
            ctx.textAlign    = 'center';
            ctx.textBaseline = 'top';
            ctx.fillStyle    = 'rgba(0,0,0,0.55)';
            ctx.fillText('QUIQUE', bp.x + 1, bp.y + R + 3);
            ctx.fillStyle = 'rgba(255,255,255,0.80)';
            ctx.fillText('QUIQUE', bp.x, bp.y + R + 2);
          }

          // ── Linha de intenção: batedor → alvo ──────────────────────────
          if (ev.intentX !== undefined && ev.fromX !== undefined) {
            const from = toCanvas(ev.fromY, ev.fromX);
            const aim2 = toCanvas(ev.intentY, ev.intentX);
            ctx.strokeStyle = 'rgba(255,215,0,0.25)';
            ctx.lineWidth   = 1;
            ctx.setLineDash([5, 6]);
            ctx.beginPath(); ctx.moveTo(from.x, from.y); ctx.lineTo(aim2.x, aim2.y); ctx.stroke();
            ctx.setLineDash([]);
          }

          // ── Legenda compacta (canto superior da quadra) ─────────────────
          const legX = CL.x + 4;
          const legY = CL.y + 6;
          const legFS = Math.max(8, CL.scaleW * 0.48);
          const legItems = [
            { color: '#FFD700',         text: `🎯 Mira  σ=${(ev.sigma??0).toFixed(2)}m` },
            { color: 'rgba(96,255,144,0.85)', text: '🟢 Zona aberta' },
            { color: '#FFFFFF',         text: '⭕ Quique real' },
          ];
          ctx.font = `500 ${legFS}px 'Space Mono', monospace`;
          ctx.textAlign    = 'left';
          ctx.textBaseline = 'top';
          legItems.forEach(({ color, text }, i) => {
            const lx = legX + 2, ly = legY + i * (legFS + 3);
            ctx.fillStyle = 'rgba(0,0,0,0.55)';
            ctx.fillText(text, lx + 1, ly + 1);
            ctx.fillStyle = color;
            ctx.fillText(text, lx, ly);
          });

          ctx.restore();
        }
      }
      // ── fim Shot Intent Overlay ───────────────────────────────────────────

      animRef.current=requestAnimationFrame(frame);
    }
    animRef.current=requestAnimationFrame(frame);
    return ()=>{ window.removeEventListener('resize',resize); if(animRef.current) cancelAnimationFrame(animRef.current); };
  }, []); // eslint-disable-line

  // ── Preload court image quando tournamentId muda ─────────────────────────
  useEffect(() => {
    const url = getCourtImages(tournamentId);
    if (!url) {
      courtImgRef.current = { img: null, loadedFor: tournamentId };
      return;
    }
    if (courtImgRef.current.loadedFor === tournamentId && courtImgRef.current.img) return;

    courtImgRef.current = { img: null, loadedFor: tournamentId };
    courtLayerSurfRef.current = null; // invalida cache

    const img = new Image();
    img.onload  = () => { courtImgRef.current.img = img; courtLayerSurfRef.current = null; };
    img.onerror = () => {};
    img.src = url;
  }, [tournamentId]);

  // Hit label cleanup
  useEffect(()=>{
    if(!hitLabels.length) return;
    hitLabelTimerRef.current=setTimeout(()=>{ const now=Date.now(); setHitLabels(prev=>prev.filter(l=>now-l.born<1600)); },200);
    outcomeLabelTimerRef.current=setTimeout(()=>{ const now=Date.now(); setOutcomeLabels(prev=>prev.filter(l=>now-l.born<2200)); },300);
    return ()=>{ clearTimeout(hitLabelTimerRef.current); clearTimeout(outcomeLabelTimerRef.current); };
  },[hitLabels]);

  // FASE 6: Popula matchLogRef a cada ponto — alimenta o CoachAnalyzer
  useEffect(() => {
    if (!snap) return;
    if (snap.gameState !== GameState.POINT_END) return;
    const total = snap.totalPoints ?? 0;
    if (total <= prevTotalPointsRef.current) return; // ponto já registrado
    prevTotalPointsRef.current = total;

    const gs = gsRef.current;
    if (!gs) return;

    const p0 = gs.players?.[0];
    const p1 = gs.players?.[1];
    if (!p0 || !p1) return;

    const won = gs.pointWinnerIdx === 0;
    // Detecta break point: p0 está sacando E p1 pode fechar o game
    const serverIdx = gs.server ?? 0;
    const p0Score = p0.score ?? 0;
    const p1Score = p1.score ?? 0;
    const receiverP = gs.players[1 - serverIdx];
    const serverP   = gs.players[serverIdx];
    const receiverScore = receiverP?.score ?? 0;
    const serverScore   = serverP?.score ?? 0;
    const isBreakPoint  = receiverScore >= 3 && (receiverScore > serverScore || receiverScore === 4);

    // Detecta erro do oponente (p1) a partir do motivo do ponto
    const reason = gs.lastPointReason ?? '';
    const oppError = won && (reason.includes('[REDE]') || reason.includes('[FORA]') || reason.includes('DUPLA FALTA'));

    // Tipo de shot aproximado do último ponto (do contexto do player 0)
    // ctx.lastShotType é escrito a cada golpe em game.js — fonte confiável
    const lastShotType    = p0?.ctx?.lastShotType ?? gs.ball?.lastShotType ?? null;
    const oppLastShotType = p1?.ctx?.lastShotType ?? null;

    const entry = {
      won,
      rallyLen:    gs.rally ?? 0,
      oppNet:      p1.atNet ?? false,
      isBreakPoint,
      shotType:    lastShotType,
      intent:      p0?.ctx?.lastIntent ?? null,
      oppShotType: oppLastShotType,
      oppError,
    };

    matchLogRef.current = [...matchLogRef.current, entry].slice(-150); // mantém últimos 150 pontos

    // ── Disparo de celebração visual por DNA ──────────────────────────────
    const winnerIdx = gs.pointWinnerIdx ?? -1;
    if (winnerIdx >= 0) {
      const winner = gs.players[winnerIdx];
      if (winner) {
        const pid = winner.id ?? winnerIdx;
        const wSeries = winner.ctx?.seriesWon ?? 0;
        const wTraits = new Set((winner.dna?.slots ?? []).map(s => s.traitId));
        const wIsDestroidor = wTraits.has('DESTRUIDOR_MORAL');
        const wIsMaquina    = wTraits.has('MAQUINA') || wTraits.has('INQUEBRAVEL');
        // Duração da celebração escala com series e trait
        const maxTimer = wIsMaquina ? 0 :
                         wIsDestroidor ? (wSeries >= 3 ? 1.8 : 1.1) :
                         wSeries >= 5 ? 1.4 :
                         wSeries >= 3 ? 0.9 :
                         wSeries >= 1 ? 0.45 : 0.25;
        celebStateRef.current[pid] = {
          timer: maxTimer,
          maxTimer: Math.max(maxTimer, 0.01),
          series: wSeries,
          color: winner.color ?? '#ffffff',
          isDestroidor: wIsDestroidor,
          isMaquina: wIsMaquina,
        };
      }
    }
  }, [snap?.totalPoints, snap?.gameState]); // eslint-disable-line

  // Reset matchLog ao iniciar nova partida
  useEffect(() => {
    if (!snap) return;
    if ((snap.totalPoints ?? 0) === 0) {
      matchLogRef.current = [];
      prevTotalPointsRef.current = 0;
    }
  }, [snap?.players?.[0]?.name]); // eslint-disable-line

  // FASE 6: Changeover card — detecta gs._pendingCoachChangeover
  useEffect(() => {
    if (!snap) return;
    const gs = gsRef.current;
    if (!gs || !gs._pendingCoachChangeover) return;
    gs._pendingCoachChangeover = false; // consumir o sinal

    // Coleta log de ponto atual (simplificado: extrai de resolvePoint events)
    // O matchLogRef é atualizado a cada ponto via resolvePoint via gs.log
    const players = gs.players ?? [];
    const player0 = players[0];
    if (!player0?.coach?.coachId) return; // sem técnico, sem card

    const coach = coachPool.find(c => c.id === player0.coach.coachId);
    if (!coach) return;

    try {
      const opp   = players[1];

      // Gerar relatório de execução das instruções anteriores
      const execReport = generateExecutionReport(
        matchLogRef.current,
        prevInstructionsRef.current,
        coach,
      );

      const result = runChangeover(
        player0, opp, matchLogRef.current, coach,
        analyzeMatch, generateInstructions,
      );

      if (result?.instructions?.length > 0) {
        // Calcular delta de trust e atualizar no player0.coach
        if (execReport && player0.coach) {
          const delta = calcTrustDelta(execReport);
          player0.coach = applyTrustDelta(player0.coach, delta);
        }

        // Salvar instruções atuais como "anteriores" para o próximo changeover
        prevInstructionsRef.current = result.instructions;

        setCoachCard({
          instructions: result.instructions,
          coachName: coach.fullName ?? coach.name,
          philosophy: coach.philosophy,
          executionReport: execReport,
          trust: player0.coach?.trust ?? null,
        });
        // Auto-dismiss após 10s (ligeiramente maior para o usuário ler o relatório)
        setTimeout(() => setCoachCard(null), 10000);
      }
    } catch (e) {
      console.warn('[Fase6] Changeover coach error:', e);
    }
  }, [snap?.players?.[0]?.games, snap?.players?.[1]?.games]); // dispara a cada mudança de game

  // ── MTO overlay — detecta MEDICAL_TIMEOUT ────────────────────────────────
  useEffect(() => {
    if (!snap) return;
    const isMTO = snap.gameState === GameState.MEDICAL_TIMEOUT;
    const wasNotMTO = !prevMtoStateRef.current;
    prevMtoStateRef.current = isMTO;

    // Entrou no MTO agora
    if (isMTO && wasNotMTO) {
      const gs = gsRef.current;
      const mto = gs?.mto ?? snap?.mto;
      if (!mto) return;

      const INJURY_LABELS = {
        ANKLE: 'Tornozelo', HAMSTRING: 'Posterior da Coxa',
        KNEE: 'Joelho', BACK: 'Lombar',
        ABDOMINAL: 'Abdômen', WRIST: 'Pulso',
        ELBOW: 'Cotovelo', SHOULDER: 'Ombro',
        CRAMP: 'Cãibra Muscular',
      };
      const SEV_LABELS = { MINOR: 'Leve', MODERATE: 'Moderada', SEVERE: 'Grave' };
      const player = snap.players?.[mto.playerIdx];
      setMtoOverlay({
        playerName:   player?.name ?? 'Jogador',
        injuryLabel:  INJURY_LABELS[mto.injuryType] ?? mto.injuryType,
        severity:     SEV_LABELS[mto.severity] ?? mto.severity,
        severityKey:  mto.severity,
        durationSecs: mto.durationSecs ?? 5,
      });
    }

    // Saiu do MTO — limpa overlay após 1.5s (para transição suave)
    if (!isMTO && !wasNotMTO) {
      setTimeout(() => setMtoOverlay(null), 1500);
    }
  }, [snap?.gameState]); // eslint-disable-line

  // ── Derived snap values ───────────────────────────────────────────────────
  const p0=snap?.players?.[0], p1=snap?.players?.[1];
  const gs=gsRef.current;
  const srv=snap?.server??0;
  const sc=s=>SC_LABELS[Math.min(s??0,4)];
  const isDeuce=p0&&p1&&p0.score>=3&&p1.score>=3&&p0.score===p1.score;
  const isAdv0=p0&&p1&&p0.score>3&&p0.score>p1.score;
  const isAdv1=p0&&p1&&p1.score>3&&p1.score>p0.score;
  const inTB = snap?.inTiebreak ?? false;
  const tbScore = snap?.tbScore ?? [0,0];
  const pts0=inTB?String(tbScore[0]):isDeuce?'DEU':isAdv0?'ADV':isAdv1?'—':sc(p0?.score);
  const pts1=inTB?String(tbScore[1]):isDeuce?'DEU':isAdv1?'ADV':isAdv0?'—':sc(p1?.score);
  const curSet=Math.max((p0?.sets??0)+(p1?.sets??0),0);
  const setLabel=inTB?`SET ${curSet+1} · TIEBREAK`:`SET ${curSet+1} · ${p0?.games??0}–${p1?.games??0}`;
  const surfId=gs?.courtVisual?.surface||'HARD';
  const surf2=SURF[surfId]||SURF.HARD;
  const courtName=gs?.courtMeta?.name||surf2.venue;
  const lastShot0=lastShotRef.current[0], lastShot1=lastShotRef.current[1];
  const lastSpeed=lastSpeedRef.current;

  return (
    <div style={{ position:'relative', width:'100%', height:'100%', background:'#020804', overflow:'hidden', fontFamily:RG.body }}>
      {/* Film grain */}
      <div style={{ position:'fixed', inset:0, zIndex:9998, pointerEvents:'none', opacity:0.025,
        backgroundImage:`url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        backgroundSize:'160px' }} />

      {/* Canvas */}
      <canvas ref={canvasRef} style={{ position:'absolute', inset:0, width:'100%', height:'100%' }} />

      {/* Hit label pills — v2: modern pill redesign */}
      {hitLabels.map(hl => {
        const q    = hl.quality ?? 0.5;
        const qPct = Math.round(q * 100);

        // Quality tier
        const tier = q >= 0.88 ? { label:'WINNER',  color:'#00FF88', glow:'rgba(0,255,136,0.35)' }
                   : q >= 0.70 ? { label:'LIMPO',   color:'#7FFF5A', glow:'rgba(127,255,90,0.28)' }
                   : q >= 0.45 ? { label:'OK',      color:'#FFD700', glow:'rgba(255,215,0,0.25)'  }
                   : q >= 0.25 ? { label:'TENSO',   color:'#FF8C00', glow:'rgba(255,140,0,0.28)'  }
                   :             { label:'ERRO',     color:'#FF3355', glow:'rgba(255,51,85,0.30)'  };

        // Wing label: null para saques / sem info
        const wing = hl.isBackhand === true  ? 'BH'
                   : hl.isBackhand === false ? 'FH'
                   : null;

        const wingBg    = wing === 'FH' ? 'rgba(100,180,255,0.18)' : 'rgba(255,160,80,0.15)';
        const wingColor = wing === 'FH' ? '#82C4FF' : '#FFB060';

        const baseAnim = hl.isSignature ? 'hlPopSig 2.0s cubic-bezier(.22,.68,0,1.2) forwards'
                       : 'hlPop 1.8s cubic-bezier(.22,.68,0,1.2) forwards';

        /* ── MISHIT ─────────────────────────────────────────────── */
        if (hl.mishit) {
          const mc = '#FF3355';
          return (
            <div key={hl.id} style={{
              position:'absolute', left:`${hl.px}%`, top:`${hl.py}%`,
              transform:'translate(-50%, calc(-100% - 18px))',
              zIndex:30, pointerEvents:'none', animation: baseAnim,
            }}>
              <div style={{
                position:'relative',
                background:'rgba(12,2,4,0.92)',
                border:`1px solid ${mc}44`,
                borderRadius:20,
                boxShadow:`0 6px 28px rgba(0,0,0,0.85), 0 0 20px ${mc}22`,
                backdropFilter:'blur(14px)',
                overflow:'hidden',
                minWidth:140,
              }}>
                {/* Glow top strip */}
                <div style={{ height:2, background:`linear-gradient(90deg,transparent,${mc}88,transparent)` }} />
                <div style={{ padding:'8px 14px 10px' }}>
                  {/* Row 1: wing + tier */}
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:5 }}>
                    {wing && (
                      <span style={{
                        fontFamily:RG.mono, fontSize:8, letterSpacing:2, fontWeight:700,
                        color: wingColor, background: wingBg,
                        borderRadius:20, padding:'2px 7px',
                      }}>{wing}</span>
                    )}
                    <span style={{
                      fontFamily:RG.mono, fontSize:8, letterSpacing:3,
                      color: mc, fontWeight:700, marginLeft:'auto',
                    }}>💢 TIMING</span>
                  </div>
                  {/* Row 2: shot name */}
                  <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:8 }}>
                    <span style={{ fontSize:14 }}>{hl.emoji}</span>
                    <span style={{
                      fontFamily:RG.display, fontSize:16, fontWeight:800,
                      color:'#FF5577', letterSpacing:1.5, textTransform:'uppercase',
                    }}>{hl.label}</span>
                  </div>
                  {/* Quality bar */}
                  <div style={{ height:3, borderRadius:99, background:'rgba(255,255,255,0.07)', overflow:'hidden' }}>
                    <div style={{ height:'100%', width:`${qPct}%`, borderRadius:99, background:`linear-gradient(90deg,${mc}88,${mc})` }} />
                  </div>
                </div>
              </div>
            </div>
          );
        }

        /* ── SIGNATURE ──────────────────────────────────────────── */
        if (hl.isSignature) {
          const sc = '#FFD700';
          return (
            <div key={hl.id} style={{
              position:'absolute', left:`${hl.px}%`, top:`${hl.py}%`,
              transform:'translate(-50%, calc(-100% - 18px))',
              zIndex:31, pointerEvents:'none', animation: baseAnim,
            }}>
              <div style={{
                position:'relative',
                background:'rgba(14,10,0,0.95)',
                border:`1px solid ${sc}40`,
                borderRadius:22,
                boxShadow:`0 6px 32px rgba(0,0,0,0.9), 0 0 28px ${sc}28, 0 0 52px ${sc}10`,
                backdropFilter:'blur(14px)',
                overflow:'hidden',
                minWidth:152,
              }}>
                {/* Shimmer */}
                <div style={{
                  position:'absolute', inset:0, pointerEvents:'none',
                  background:'linear-gradient(105deg,transparent 35%,rgba(255,215,0,0.07) 50%,transparent 65%)',
                  animation:'hlShimmer 1.8s ease-in-out infinite',
                }} />
                {/* Glow strip */}
                <div style={{ height:2, background:`linear-gradient(90deg,transparent,${sc}66,transparent)` }} />
                {/* Signature header */}
                <div style={{
                  display:'flex', alignItems:'center', gap:5,
                  padding:'5px 14px 4px',
                  background:`linear-gradient(90deg,${sc}18,${sc}08)`,
                  borderBottom:`1px solid ${sc}22`,
                }}>
                  <span style={{ fontSize:9, color:sc }}>★</span>
                  <span style={{
                    fontFamily:RG.mono, fontSize:7, letterSpacing:3,
                    color:sc, fontWeight:700, textTransform:'uppercase',
                    textShadow:`0 0 8px ${sc}`,
                  }}>GOLPE ASSINATURA</span>
                </div>
                <div style={{ padding:'8px 14px 10px' }}>
                  {/* Wing + speed row */}
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:6 }}>
                    {wing ? (
                      <span style={{
                        fontFamily:RG.mono, fontSize:8, letterSpacing:2, fontWeight:700,
                        color: wingColor, background: wingBg, borderRadius:20, padding:'2px 7px',
                      }}>{wing}</span>
                    ) : <span />}
                    {hl.speed > 10 && (
                      <span style={{
                        fontFamily:RG.mono, fontSize:9, color:`${sc}CC`, letterSpacing:1, fontWeight:700,
                      }}>{hl.speed} <span style={{ fontSize:7, opacity:.7 }}>km/h</span></span>
                    )}
                  </div>
                  {/* Shot name */}
                  <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:8 }}>
                    <span style={{ fontSize:14 }}>{hl.emoji}</span>
                    <span style={{
                      fontFamily:RG.display, fontSize:17, fontWeight:800,
                      color:sc, letterSpacing:1.5, textTransform:'uppercase',
                      textShadow:`0 0 12px ${sc}70`,
                    }}>{hl.label}</span>
                  </div>
                  {/* Quality bar — gold glow */}
                  <div style={{ height:3, borderRadius:99, background:'rgba(255,215,0,0.10)', overflow:'hidden' }}>
                    <div style={{
                      height:'100%', width:`${qPct}%`, borderRadius:99,
                      background:`linear-gradient(90deg,${sc}88,${sc})`,
                      boxShadow:`0 0 6px ${sc}80`,
                    }} />
                  </div>
                </div>
              </div>
            </div>
          );
        }

        /* ── NORMAL SHOT ────────────────────────────────────────── */
        const ac = hl.color || tier.color;
        return (
          <div key={hl.id} style={{
            position:'absolute', left:`${hl.px}%`, top:`${hl.py}%`,
            transform:'translate(-50%, calc(-100% - 18px))',
            zIndex:30, pointerEvents:'none', animation: baseAnim,
          }}>
            <div style={{
              position:'relative',
              background:'rgba(6,10,7,0.90)',
              border:`1px solid ${ac}30`,
              borderRadius:20,
              boxShadow:`0 6px 24px rgba(0,0,0,0.80), 0 0 18px ${tier.glow}`,
              backdropFilter:'blur(16px)',
              overflow:'hidden',
              minWidth:132,
            }}>
              {/* Quality glow strip at top */}
              <div style={{
                height:2.5,
                background:`linear-gradient(90deg,transparent,${tier.color}${Math.round(q*200).toString(16).padStart(2,'0')},transparent)`,
              }} />
              <div style={{ padding:'8px 14px 10px' }}>
                {/* Row 1: wing pill  +  tier label  +  speed */}
                <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:5 }}>
                  {wing && (
                    <span style={{
                      fontFamily:RG.mono, fontSize:8, letterSpacing:2, fontWeight:700,
                      color: wingColor, background: wingBg,
                      borderRadius:20, padding:'2px 7px', flexShrink:0,
                    }}>{wing}</span>
                  )}
                  <span style={{
                    fontFamily:RG.mono, fontSize:8, letterSpacing:3,
                    color: tier.color, fontWeight:700,
                    textTransform:'uppercase', flexGrow:1,
                  }}>{tier.label}</span>
                  {hl.speed > 10 && (
                    <span style={{
                      fontFamily:RG.mono, fontSize:9, color:'rgba(255,255,255,0.35)',
                      letterSpacing:.5, flexShrink:0,
                    }}>{hl.speed}<span style={{ fontSize:7 }}> km/h</span></span>
                  )}
                </div>
                {/* Row 2: emoji + shot name */}
                <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:8 }}>
                  <span style={{ fontSize:13 }}>{hl.emoji}</span>
                  <span style={{
                    fontFamily:RG.display, fontSize:15, fontWeight:800,
                    color: ac, letterSpacing:1.5, textTransform:'uppercase',
                    textShadow:`0 0 10px ${ac}50`,
                  }}>{hl.label}</span>
                </div>
                {/* Row 3: quality bar */}
                <div style={{ height:3, borderRadius:99, background:'rgba(255,255,255,0.07)', overflow:'hidden' }}>
                  <div style={{
                    height:'100%', width:`${qPct}%`, borderRadius:99,
                    background:`linear-gradient(90deg,${tier.color}77,${tier.color})`,
                    boxShadow: q >= 0.70 ? `0 0 5px ${tier.color}90` : 'none',
                  }} />
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {/* ── Outcome pills — ACE / WINNER / OUT / NET / DOUBLE FAULT ── */}
      {outcomeLabels.map(ol => {
        const cfg = {
          ACE:          { label:'ACE',          emoji:'⚡', color:'#FFD700', glow:'rgba(255,215,0,0.45)',   sub:'rgba(255,215,0,0.12)',  border:'rgba(255,215,0,0.30)',  positive:true  },
          WINNER:       { label:'WINNER',        emoji:'✦',  color:'#00FF88', glow:'rgba(0,255,136,0.40)',  sub:'rgba(0,255,136,0.10)',  border:'rgba(0,255,136,0.28)', positive:true  },
          OUT:          { label:'OUT',           emoji:'',   color:'#FF6644', glow:'rgba(255,102,68,0.38)', sub:'rgba(255,102,68,0.09)', border:'rgba(255,102,68,0.25)', positive:false },
          NET:          { label:'REDE',          emoji:'',   color:'#FF8040', glow:'rgba(255,128,64,0.36)', sub:'rgba(255,128,64,0.09)', border:'rgba(255,128,64,0.22)', positive:false },
          DOUBLE_FAULT: { label:'DUPLA FALTA',   emoji:'',   color:'#FF3355', glow:'rgba(255,51,85,0.40)',  sub:'rgba(255,51,85,0.10)',  border:'rgba(255,51,85,0.28)', positive:false },
        }[ol.type] ?? { label: ol.label, emoji:'', color:'#ffffff', glow:'rgba(255,255,255,0.2)', sub:'rgba(255,255,255,0.06)', border:'rgba(255,255,255,0.15)', positive:true };

        const isPositive = cfg.positive;
        const anim = isPositive
          ? 'outcomePop 2.2s cubic-bezier(.16,.68,0,1.1) forwards'
          : 'outcomePopErr 1.9s cubic-bezier(.16,.68,0,1.1) forwards';

        return (
          <div key={ol.id} style={{
            position: 'absolute',
            left: `${ol.px}%`,
            top:  `${ol.py}%`,
            transform: 'translate(-50%, calc(-100% - 22px))',
            zIndex: 35,
            pointerEvents: 'none',
            animation: anim,
          }}>
            {/* Outer glow bloom */}
            <div style={{
              position: 'absolute', inset: -10,
              borderRadius: 40,
              background: `radial-gradient(ellipse at center, ${cfg.glow} 0%, transparent 70%)`,
              pointerEvents: 'none',
            }} />

            <div style={{
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 0,
            }}>
              {/* Main pill */}
              <div style={{
                position: 'relative',
                background: `rgba(5,8,6,0.88)`,
                border: `1.5px solid ${cfg.border}`,
                borderRadius: 50,
                boxShadow: `0 8px 32px rgba(0,0,0,0.85), 0 0 24px ${cfg.glow}, inset 0 1px 0 rgba(255,255,255,0.06)`,
                backdropFilter: 'blur(18px)',
                overflow: 'hidden',
                minWidth: ol.type === 'DOUBLE_FAULT' ? 156 : 100,
              }}>
                {/* Top glow line */}
                <div style={{
                  height: 1.5,
                  background: `linear-gradient(90deg, transparent, ${cfg.color}CC, transparent)`,
                  borderRadius: '50px 50px 0 0',
                }} />

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: cfg.emoji ? 8 : 0,
                  padding: '10px 22px 11px',
                }}>
                  {cfg.emoji && (
                    <span style={{
                      fontSize: ol.type === 'ACE' ? 16 : 13,
                      filter: ol.type === 'ACE' ? `drop-shadow(0 0 6px ${cfg.color})` : 'none',
                      lineHeight: 1,
                    }}>{cfg.emoji}</span>
                  )}
                  <span style={{
                    fontFamily: RG.display,
                    fontSize: ol.type === 'DOUBLE_FAULT' ? 13 : ol.type === 'ACE' ? 20 : 17,
                    fontWeight: 900,
                    letterSpacing: ol.type === 'ACE' ? 4 : 3,
                    color: cfg.color,
                    textTransform: 'uppercase',
                    textShadow: `0 0 16px ${cfg.glow}, 0 0 32px ${cfg.glow}`,
                    lineHeight: 1,
                  }}>{cfg.label}</span>
                </div>

                {/* Bottom glow line */}
                <div style={{
                  height: 1,
                  background: `linear-gradient(90deg, transparent, ${cfg.color}55, transparent)`,
                }} />
              </div>

              {/* Connector dot */}
              <div style={{
                width: 4, height: 4,
                borderRadius: 99,
                background: cfg.color,
                boxShadow: `0 0 8px ${cfg.color}`,
                marginTop: 4,
                opacity: 0.7,
              }} />
            </div>
          </div>
        );
      })}

      {/* ── TOP BAR ── */}
      <div style={{ position:'fixed', top:0, left:0, right:0, height:44, zIndex:200,
        background:'rgba(2,5,3,.97)', backdropFilter:'blur(16px)',
        borderBottom:`1px solid rgba(255,255,255,.06)`,
        boxShadow:'0 1px 0 rgba(255,255,255,.04), 0 4px 20px rgba(0,0,0,.6)',
        display:'flex', alignItems:'center', padding:'0 16px', gap:0 }}>

        {/* Bottom accent line with surface color */}
        <div style={{
          position:'absolute', bottom:0, left:0, right:0, height:1,
          background:`linear-gradient(90deg,transparent,${surf2.color}88 20%,${surf2.color}44 50%,transparent)`,
          pointerEvents:'none',
        }}/>

        {/* Logo */}
        <button onClick={onMenu} style={{ display:'flex', alignItems:'center', gap:0, background:'none',
          border:'none', cursor:'pointer', padding:'0 16px 0 0', borderRight:`1px solid rgba(255,255,255,.07)`, marginRight:16,
          flexShrink:0 }}>
          <span style={{ background:RG.clay, color:RG.white, fontFamily:RG.display, fontSize:10,
            fontWeight:900, letterSpacing:5, padding:'4px 12px 3px', textTransform:'uppercase',
            clipPath:'polygon(0 0,100% 0,calc(100% - 4px) 100%,0 100%)',
          }}>HV</span>
        </button>

        {/* Surface + venue */}
        <div style={{ display:'flex', flexDirection:'column', gap:1, marginRight:16, flexShrink:0 }}>
          <span style={{ fontFamily:RG.display, fontSize:11, fontWeight:800, letterSpacing:4,
            textTransform:'uppercase', color:surf2.color, lineHeight:1 }}>{surf2.label}</span>
          <span style={{ fontFamily:RG.mono, fontSize:7, letterSpacing:3, textTransform:'uppercase',
            color:RG.textFaint, lineHeight:1 }}>{courtName}</span>
        </div>

        {/* Wind HUD — visível sempre que há vento relevante */}
        {(() => {
          const windInfo = getWindHUDInfo(gs?.environment);
          if (!windInfo || windInfo.kmh < 5) return null;
          const windColor = windInfo.isGust ? '#F4A840' : windInfo.kmh >= 20 ? '#E07050' : 'rgba(255,255,255,.55)';
          return (
            <div style={{ display:'flex', alignItems:'center', gap:4, marginRight:14, flexShrink:0,
              padding:'2px 8px', border:`1px solid ${windColor}33`, background:`${windColor}0D`,
            }}>
              <span style={{ fontSize:9 }}>💨</span>
              <div style={{ display:'flex', flexDirection:'column', gap:0 }}>
                <span style={{ fontFamily:RG.mono, fontSize:9, fontWeight:700, color:windColor,
                  letterSpacing:1, lineHeight:1 }}>{windInfo.kmh} km/h</span>
                <span style={{ fontFamily:RG.mono, fontSize:6, color:windColor, letterSpacing:2,
                  textTransform:'uppercase', lineHeight:1, opacity:.8 }}>{windInfo.dir}{windInfo.isGust ? ' GUST' : ''}</span>
              </div>
            </div>
          );
        })()}

        <div style={{ width:1, height:22, background:'rgba(255,255,255,.07)', marginRight:16, flexShrink:0 }} />

        {/* Set info */}
        <span style={{ fontFamily:RG.display, fontSize:12, fontWeight:700, letterSpacing:4,
          color:RG.white, marginRight:14, flexShrink:0 }}>{setLabel}</span>

        {/* LIVE dot */}
        <div style={{ display:'flex', alignItems:'center', gap:5, flexShrink:0,
          padding:'2px 10px', border:`1px solid ${RG.clay}33`,
          background:`${RG.clay}10`,
        }}>
          <div style={{ width:5, height:5, borderRadius:'50%', background:RG.clay,
            boxShadow:`0 0 8px ${RG.clay}`, animation:'pulse 1.2s infinite', flexShrink:0 }}/>
          <span style={{ fontFamily:RG.mono, fontSize:7, fontWeight:700, letterSpacing:3,
            color:RG.clay, textTransform:'uppercase' }}>LIVE</span>
        </div>

        {gs && <SituationPill gs={gs} />}
        {snap?.heat && <HeatPill heat={snap.heat} />}

        {/* Speed controls */}
        <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:5 }}>
          <span style={{ fontFamily:RG.mono, fontSize:8, letterSpacing:2, color:RG.textFaint, marginRight:2 }}>VEL</span>
          {[0.5,1,2,4,8,16,32].map(v=>(
            <button key={v} onClick={()=>{ if(setSimSpeed) setSimSpeed(v); if(speedRef) speedRef.current=v; }}
              style={{ fontFamily:RG.mono, fontSize:8, fontWeight:700, letterSpacing:2,
                color:simSpeed===v?RG.white:RG.textFaint,
                padding:'2px 8px', border:`1px solid ${simSpeed===v?RG.borderBright:RG.border}`,
                background:simSpeed===v?`${RG.bgLight}`:'none', cursor:'pointer' }}>{v}×</button>
          ))}
          <div style={{ width:1, height:20, background:RG.border, margin:'0 4px' }} />
          {/* Sound toggle */}
          <button
            onClick={async () => { const on = await toggleSound(); setSoundOn(on); }}
            title="Ligar/desligar som"
            style={{ display:'flex', alignItems:'center', gap:4, fontFamily:RG.mono, fontSize:8, fontWeight:700,
              letterSpacing:2, color:soundOn?RG.lime:RG.textFaint,
              padding:'3px 10px', border:`1px solid ${soundOn?RG.lime+'44':RG.border}`,
              background:soundOn?`${RG.lime}12`:'none', cursor:'pointer',
              textTransform:'uppercase', transition:'all 0.2s' }}
          >
            <span style={{ fontSize:12 }}>{soundOn ? '🔊' : '🔇'}</span>
          </button>
          {/* Sound settings */}
          <button
            onClick={() => setShowSoundSettings(s => !s)}
            title="Configurações de som"
            style={{ display:'flex', alignItems:'center', gap:3, fontFamily:RG.mono, fontSize:8,
              color:showSoundSettings?RG.clay:RG.textFaint,
              padding:'3px 8px', border:`1px solid ${showSoundSettings?RG.clay+'55':RG.border}`,
              background:showSoundSettings?`${RG.clay}14`:'none', cursor:'pointer',
              transition:'all 0.2s' }}
          >
            <span style={{ fontSize:11 }}>⚙</span>
          </button>
          <div style={{ width:1, height:20, background:RG.border, margin:'0 4px' }} />
          <button
            onClick={() => {
              if (!bugOverlay) {
                if (bugSpeedSaveRef) bugSpeedSaveRef.current = speedRef?.current ?? 1;
                if (speedRef) speedRef.current = 0;
                const hist = frameHistoryRef?.current ?? [];
                const idx = hist.length > 0 ? hist.length - 1 : null;
                setRewindIdx(idx);
                if (idx !== null) {
                  const frame = hist[idx];
                  const baseGs = gsRef.current;
                  rewindGsRef.current = { ...baseGs, ball: { ...baseGs.ball, ...frame.ball }, players: frame.players.map(fp => { const rp = baseGs.players.find(p => p.id === fp.id); return rp ? { ...rp, pos: fp.pos, vel: fp.vel } : fp; }), pendingHitLabels: [], pendingOutcomeLabels: [], pendingFlash: null, pendingScreenFx: null };
                  rewindTrailRef.current = frame.trail;
                }
                setBugOverlay(true);
              } else {
                rewindGsRef.current = null;
                rewindTrailRef.current = null;
                setRewindIdx(null);
                if (speedRef && bugSpeedSaveRef) speedRef.current = bugSpeedSaveRef.current;
                setBugOverlay(false);
              }
            }}
            style={{ display:'flex', alignItems:'center', gap:5, fontFamily:RG.mono, fontSize:8, fontWeight:700,
              letterSpacing:2, color:bugOverlay?'#FF4444':RG.textFaint,
              padding:'3px 10px', border:`1px solid ${bugOverlay?'#FF444488':RG.border}`,
              background:bugOverlay?'rgba(255,68,68,0.12)':'none', cursor:'pointer',
              textTransform:'uppercase', transition:'all 0.2s' }}
          >
            <span style={{ fontSize:11 }}>🐛</span> Bug
          </button>
          <div style={{ width:1, height:20, background:RG.border, margin:'0 4px' }} />
          <button
            onClick={() => setShowShotLog(v => !v)}
            style={{ display:'flex', alignItems:'center', gap:5, fontFamily:RG.mono, fontSize:8, fontWeight:700,
              letterSpacing:2, color:showShotLog?RG.lime:RG.textFaint,
              padding:'3px 10px', border:`1px solid ${showShotLog?RG.lime+'55':RG.border}`,
              background:showShotLog?`${RG.lime}0d`:'none', cursor:'pointer',
              textTransform:'uppercase', transition:'all 0.2s' }}
          >
            <span style={{ fontSize:11 }}>📊</span> Shots
          </button>
        </div>
      </div>

      {/* ── LEFT PANEL — p1 ── */}
      {p1 && (
        <div style={{ position:'fixed', top:64, left:0, bottom:16, width:194, zIndex:145,
          borderRight:`1px solid ${RG.border}`, overflow:'hidden', pointerEvents:'none',
          opacity:0.88,
          background:'linear-gradient(180deg, rgba(3,7,5,.26), rgba(3,7,5,.04) 18%, rgba(3,7,5,.12) 100%)',
          boxShadow:'inset -18px 0 32px rgba(0,0,0,.14)' }}>
          <SidePanel p={p1} isServer={srv===1} playerImages={playerImagesRef.current}
            surfColor={surf2.color} lastShot={lastShotRef.current[1]} side="left" />
        </div>
      )}

      {/* ── RIGHT PANEL — p0 ── */}
      {p0 && (
        <div style={{ position:'fixed', top:64, right:0, bottom:16, width:194, zIndex:145,
          borderLeft:`1px solid ${RG.border}`, overflow:'hidden', pointerEvents:'none',
          opacity:0.88,
          background:'linear-gradient(180deg, rgba(3,7,5,.26), rgba(3,7,5,.04) 18%, rgba(3,7,5,.12) 100%)',
          boxShadow:'inset 18px 0 32px rgba(0,0,0,.14)' }}>
          <SidePanel p={p0} isServer={srv===0} playerImages={playerImagesRef.current}
            surfColor={surf2.color} lastShot={lastShotRef.current[0]} side="right" />
        </div>
      )}

      {/* ── FLOATING SCORE BUG ── */}
      {p0 && p1 && (
        <div style={{ position:'fixed', bottom:18, left:'50%', transform:'translateX(-50%)',
          zIndex:200, pointerEvents:'none' }}>
          <ScoreBug p0={p0} p1={p1} pts0={pts0} pts1={pts1} srv={srv} surfColor={surf2.color} curSet={curSet} heat={snap?.heat} pointHistory={snap?.pointHistory ?? []} snap={snap} />
        </div>
      )}

      {/* ── MODO CAÇA BUG OVERLAY ── */}
      {bugOverlay && (
        <BugModeOverlay
          frameHistory={frameHistoryRef?.current ?? []}
          rewindIdx={rewindIdx}
          canvasRef={canvasRef}
          dprRef={dprRef}
          gsRef={gsRef}
          rewindGsRef={rewindGsRef}
          rewindTrailRef={rewindTrailRef}
          onChangeIdx={(idx) => {
            setRewindIdx(idx);
            const hist = frameHistoryRef?.current ?? [];
            if (idx !== null && hist[idx]) {
              const frame = hist[idx];
              const baseGs = gsRef.current;
              rewindGsRef.current = {
                ...baseGs,
                ball: { ...baseGs.ball, ...frame.ball },
                players: frame.players.map(fp => {
                  const rp = baseGs.players?.find(p => p.id === fp.id);
                  return rp ? { ...rp, pos: fp.pos, vel: fp.vel } : fp;
                }),
                pendingHitLabels: [], pendingOutcomeLabels: [],
                pendingFlash: null,
                pendingScreenFx: null,
              };
              rewindTrailRef.current = frame.trail;
            }
          }}
          onClose={() => {
            rewindGsRef.current = null;
            rewindTrailRef.current = null;
            setRewindIdx(null);
            if (speedRef && bugSpeedSaveRef) speedRef.current = bugSpeedSaveRef.current;
            setBugOverlay(false);
          }}
        />
      )}

      {/* ── SHOT LOG PANEL ──────────────────────────────────────────────────── */}
      {showShotLog && (
        <ShotLogPanel gsRef={gsRef} snap={snap} onClose={() => setShowShotLog(false)} />
      )}

      {/* ── POST-MATCH SERVE ANALYSIS ────────────────────────────────────── */}
      {snap?.gameState === GameState.GAME_OVER && (
        <ServeAnalysisPanel snap={snap} onMenu={onMenu} />
      )}

      {/* ── SOUND SETTINGS OVERLAY ────────────────────────────────────────── */}
      {showSoundSettings && (
        <>
          <div
            onClick={() => setShowSoundSettings(false)}
            style={{ position:'fixed', inset:0, zIndex:8999 }}
          />
          <SoundSettings onClose={() => setShowSoundSettings(false)} />
        </>
      )}

      {/* ── FASE 6: COACH CHANGEOVER CARD ────────────────────────────────── */}
      {coachCard && (
        <CoachChangeoverCard
          instructions={coachCard.instructions}
          coachName={coachCard.coachName}
          philosophy={coachCard.philosophy}
          executionReport={coachCard.executionReport ?? null}
          trust={coachCard.trust ?? null}
          onDismiss={() => setCoachCard(null)}
        />
      )}

      {/* ── MEDICAL TIME OUT OVERLAY ───────────────────────────────────────── */}
      {mtoOverlay && snap?.gameState === GameState.MEDICAL_TIMEOUT && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9100,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          pointerEvents: 'none',
        }}>
          {/* Subtle dark tint */}
          <div style={{
            position: 'absolute', inset: 0,
            background: 'rgba(0,0,0,0.42)',
            backdropFilter: 'blur(2px)',
          }} />
          {/* MTO Card */}
          <div style={{
            position: 'relative', zIndex: 1,
            background: 'linear-gradient(135deg, rgba(12,18,28,0.97) 0%, rgba(20,28,42,0.97) 100%)',
            border: `1.5px solid ${mtoOverlay.severityKey === 'SEVERE' ? '#FF4444' : mtoOverlay.severityKey === 'MODERATE' ? '#FF8C00' : '#FFD700'}`,
            borderRadius: 8,
            padding: '20px 28px',
            minWidth: 280, maxWidth: 340,
            textAlign: 'center',
            boxShadow: `0 0 32px ${mtoOverlay.severityKey === 'SEVERE' ? 'rgba(255,68,68,0.25)' : 'rgba(255,140,0,0.20)'}`,
            animation: 'mtoCardIn .4s cubic-bezier(.16,1,.3,1)',
          }}>
            <div style={{ fontSize: 11, letterSpacing: 3, color: '#888', fontFamily: "'Barlow Condensed', sans-serif", marginBottom: 8 }}>
              PARADA MÉDICA
            </div>
            <div style={{ fontSize: 22, marginBottom: 4 }}>🚑</div>
            <div style={{
              fontSize: 17, fontWeight: 700, color: '#fff',
              fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: 1,
              marginBottom: 6,
            }}>
              {mtoOverlay.playerName}
            </div>
            <div style={{
              fontSize: 13, color: '#aaa',
              fontFamily: "'Barlow Condensed', sans-serif",
              marginBottom: 10,
            }}>
              {mtoOverlay.injuryLabel}
            </div>
            <div style={{
              display: 'inline-block',
              padding: '3px 12px',
              borderRadius: 3,
              fontSize: 11, fontWeight: 700, letterSpacing: 2,
              fontFamily: "'Barlow Condensed', sans-serif",
              background: mtoOverlay.severityKey === 'SEVERE' ? 'rgba(255,68,68,0.18)'
                : mtoOverlay.severityKey === 'MODERATE' ? 'rgba(255,140,0,0.18)'
                : 'rgba(255,215,0,0.15)',
              color: mtoOverlay.severityKey === 'SEVERE' ? '#FF6666'
                : mtoOverlay.severityKey === 'MODERATE' ? '#FFA040'
                : '#FFD700',
              border: `1px solid ${mtoOverlay.severityKey === 'SEVERE' ? '#FF444444'
                : mtoOverlay.severityKey === 'MODERATE' ? '#FF8C0044'
                : '#FFD70044'}`,
            }}>
              {mtoOverlay.severity.toUpperCase()}
            </div>
          </div>
        </div>
      )}

      {/* ── RETIREMENT OVERLAY (GAME_OVER por abandono) ────────────────────── */}
      {snap?.gameState === GameState.GAME_OVER && snap?.matchRetirement && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9050,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          pointerEvents: 'none',
        }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.38)' }} />
          <div style={{
            position: 'relative', zIndex: 1,
            background: 'linear-gradient(135deg, rgba(14,10,10,0.97) 0%, rgba(28,16,16,0.97) 100%)',
            border: '1.5px solid rgba(255,68,68,0.55)',
            borderRadius: 8,
            padding: '22px 32px',
            minWidth: 300, maxWidth: 360,
            textAlign: 'center',
            boxShadow: '0 0 40px rgba(255,68,68,0.18)',
          }}>
            <div style={{ fontSize: 11, letterSpacing: 3, color: '#888', fontFamily: "'Barlow Condensed', sans-serif", marginBottom: 8 }}>
              ABANDONO POR LESÃO
            </div>
            <div style={{ fontSize: 26, marginBottom: 6 }}>🏳️</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#FF9090', fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: 1, marginBottom: 4 }}>
              {snap.matchRetirement.playerName}
            </div>
            <div style={{ fontSize: 12, color: '#888', fontFamily: "'Barlow Condensed', sans-serif" }}>
              retira-se da partida
            </div>
          </div>
        </div>
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:ital,wght@0,300;0,400;0,600;0,700;0,800;0,900;1,400;1,700&family=Barlow:wght@300;400;600&family=Space+Mono:wght@400;700&display=swap');
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes matchPointPulse {
          0%   { opacity:1; box-shadow:0 0 18px rgba(255,215,0,0.6); letter-spacing:3px }
          50%  { opacity:0.75; box-shadow:0 0 28px rgba(255,215,0,0.85); letter-spacing:3.5px }
          100% { opacity:1; box-shadow:0 0 18px rgba(255,215,0,0.6); letter-spacing:3px }
        @keyframes mtoCardIn {
          from { opacity:0; transform: scale(0.88) translateY(18px); }
          to   { opacity:1; transform: scale(1) translateY(0); }
        }
        }
        @keyframes statPulse { 0%,100%{opacity:1} 50%{opacity:0.6} }
        @keyframes serveDotPulse { 0%,100%{opacity:.6;transform:scale(1)} 50%{opacity:1;transform:scale(1.3)} }
        @keyframes barShimmer { 0%{transform:translateX(-100%)} 100%{transform:translateX(300%)} }
        @keyframes hlPop {
          0%   { opacity:0; transform:translate(-50%,calc(-100% - 8px)) scale(0.82) }
          8%   { opacity:1; transform:translate(-50%,calc(-100% - 20px)) scale(1.06) }
          14%  { transform:translate(-50%,calc(-100% - 18px)) scale(0.98) }
          18%  { transform:translate(-50%,calc(-100% - 20px)) scale(1.01) }
          65%  { opacity:1; transform:translate(-50%,calc(-100% - 30px)) }
          100% { opacity:0; transform:translate(-50%,calc(-100% - 52px)) scale(0.94) }
        }
        @keyframes hlPopSig {
          0%   { opacity:0; transform:translate(-50%,calc(-100% - 8px)) scale(0.76) }
          7%   { opacity:1; transform:translate(-50%,calc(-100% - 22px)) scale(1.10) }
          13%  { transform:translate(-50%,calc(-100% - 18px)) scale(0.97) }
          18%  { transform:translate(-50%,calc(-100% - 22px)) scale(1.02) }
          65%  { opacity:1; transform:translate(-50%,calc(-100% - 34px)) }
          100% { opacity:0; transform:translate(-50%,calc(-100% - 58px)) scale(0.92) }
        }
        @keyframes hlShimmer {
          0%   { transform:translateX(-100%) }
          60%  { transform:translateX(250%) }
          100% { transform:translateX(250%) }
        }
        @keyframes mishitPulse {
          0%   { box-shadow: 0 4px 28px rgba(0,0,0,.9), 0 0 32px #FF335550; transform:scale(1.08) }
          45%  { box-shadow: 0 4px 28px rgba(0,0,0,.9), 0 0 10px #FF335520; transform:scale(0.97) }
          100% { box-shadow: 0 4px 28px rgba(0,0,0,.9), 0 0 18px #FF335530; transform:scale(1) }
        }
        @keyframes bugPulse { 0%,100%{box-shadow:0 0 12px #FF444466} 50%{box-shadow:0 0 28px #FF444499} }
        @keyframes scanline { 0%{transform:translateY(-100%)} 100%{transform:translateY(100vh)} }
        @keyframes momentumFlare { 0%,100%{opacity:.7;transform:scaleX(1)} 50%{opacity:1;transform:scaleX(1.015)} }
        @keyframes runDotIn { 0%{opacity:0;transform:scale(0.4)} 100%{opacity:1;transform:scale(1)} }
        @keyframes runBadgePop { 0%{opacity:0;transform:translateY(4px) scale(0.85)} 60%{transform:translateY(-1px) scale(1.06)} 100%{opacity:1;transform:translateY(0) scale(1)} }
        @keyframes nameGlowPulse { 0%,100%{text-shadow:0 0 8px var(--mg-color,#fff3)} 50%{text-shadow:0 0 18px var(--mg-color,#fff6), 0 0 32px var(--mg-color,#fff2)} }
        @keyframes outcomePop {
          0%   { opacity:0; transform:translate(-50%, calc(-100% - 10px)) scale(0.72); filter:blur(4px); }
          10%  { opacity:1; transform:translate(-50%, calc(-100% - 26px)) scale(1.08); filter:blur(0); }
          22%  { transform:translate(-50%, calc(-100% - 22px)) scale(1.0); }
          70%  { opacity:1; transform:translate(-50%, calc(-100% - 22px)) scale(1.0); }
          100% { opacity:0; transform:translate(-50%, calc(-100% - 38px)) scale(0.90); }
        }
        @keyframes outcomePopErr {
          0%   { opacity:0; transform:translate(-50%, calc(-100% - 10px)) scale(0.78); filter:blur(3px); }
          08%  { opacity:1; transform:translate(-50%, calc(-100% - 22px)) scale(1.04); filter:blur(0); }
          16%  { transform:translate(-50%, calc(-100% - 20px)) scale(0.98); }
          55%  { opacity:1; transform:translate(-50%, calc(-100% - 20px)) scale(1.0); }
          100% { opacity:0; transform:translate(-50%, calc(-100% - 32px)) scale(0.92); }
        }
      `}</style>
    </div>
  );
}

// ── BugModeOverlay ────────────────────────────────────────────────────────────
function BugModeOverlay({ frameHistory, rewindIdx, canvasRef, dprRef, gsRef, rewindGsRef, rewindTrailRef, onChangeIdx, onClose }) {
  const [expanded, setExpanded] = React.useState(true);
  const totalFrames = frameHistory.length;
  const currentFrame = (rewindIdx !== null && frameHistory[rewindIdx]) ? frameHistory[rewindIdx] : null;

  // ── Capture screen ───────────────────────────────────────────────────────
  function captureScreen() {
    const canvas = canvasRef?.current;
    if (!canvas) return;

    const dpr  = dprRef?.current || 1;
    const W    = canvas.width;
    const H    = canvas.height;
    const LW   = W / dpr; // logical width
    const LH   = H / dpr;

    const off  = document.createElement('canvas');
    off.width  = W;
    off.height = H;
    const ctx  = off.getContext('2d');
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    // Draw game canvas
    try { ctx.drawImage(canvas, 0, 0); } catch(e) { console.warn('canvas taint?', e); }

    // Compute derived data
    const frame = currentFrame || (frameHistory.length ? frameHistory[frameHistory.length - 1] : null);
    if (!frame) { triggerDownload(off, 'bug-capture-empty.png'); return; }

    const ball    = frame.ball;
    const speedKmh = frame.ballSpeed || 0;
    const dirRad  = Math.atan2(ball.vel.y, ball.vel.x);
    const dirDeg  = ((dirRad * 180 / Math.PI) + 360) % 360;
    const velMag  = Math.sqrt((ball.vel.x||0)**2 + (ball.vel.y||0)**2 + (ball.vel.z||0)**2);
    const SCALE   = dpr;

    // ── Debug panel overlay ───────────────────────────────────────────────
    const PX      = 20 * SCALE;
    const PY      = (LH * 0.55) * SCALE;
    const PW      = LW * 0.98 * SCALE;
    const PH      = LH * 0.42 * SCALE;

    // Semi-transparent panel
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.88)';
    ctx.fillRect(PX, PY, PW, PH);
    ctx.strokeStyle = '#FF444488';
    ctx.lineWidth   = 2 * SCALE;
    ctx.strokeRect(PX, PY, PW, PH);

    // Title bar
    ctx.fillStyle = 'rgba(255,68,68,0.22)';
    ctx.fillRect(PX, PY, PW, 28 * SCALE);
    ctx.fillStyle = '#FF4444';
    ctx.font = `700 ${11 * SCALE}px 'Space Mono', monospace`;
    ctx.fillText(`🐛  MODO CAÇA BUG  ·  Frame #${frame.frameIdx}  ·  ${speedKmh} km/h  ·  Rally ${frame.rally}  ·  ${frame.gameState}`, PX + 12 * SCALE, PY + 18 * SCALE);

    // Columns
    const COL   = PX + 12 * SCALE;
    const ROW   = PY + 44 * SCALE;
    const FS    = 9 * SCALE;
    const LH2   = 14 * SCALE;
    ctx.font    = `600 ${FS}px 'Space Mono', monospace`;

    // Col 1 — Ball
    ctx.fillStyle = '#A8C832';
    ctx.fillText('── BOLA ──────────────────────────────────', COL, ROW);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(`Pos     X=${ball.pos.x.toFixed(3)}m  Y=${ball.pos.y.toFixed(3)}m  Z=${ball.pos.z.toFixed(3)}m  (altura=${ball.pos.z.toFixed(2)}m)`, COL, ROW + LH2);
    ctx.fillText(`Vel     vx=${ball.vel.x.toFixed(3)}  vy=${ball.vel.y.toFixed(3)}  vz=${(ball.vel.z||0).toFixed(3)}  m/s`, COL, ROW + LH2*2);
    ctx.fillText(`Speed   ${speedKmh} km/h  |  |v|=${velMag.toFixed(2)} m/s`, COL, ROW + LH2*3);
    ctx.fillText(`Dir     ${dirDeg.toFixed(1)}°  (atan2 vx,vy)`, COL, ROW + LH2*4);
    ctx.fillText(`Flight  ${ball.inFlight ? 'YES' : 'NO'}  |  Bounces: ${ball.bounceCount ?? 0}  |  Spin: ${Number(ball.spin ?? 0).toFixed(3)}`, COL, ROW + LH2*5);
    ctx.fillText(`LastHit ${ball.lastHitBy ?? 'none'}`, COL, ROW + LH2*6);

    // Col 2 — Players
    const COL2 = COL + LW * 0.36 * SCALE;
    ctx.fillStyle = '#A8C832';
    ctx.fillText('── JOGADORES ─────────────────────────────', COL2, ROW);
    frame.players.forEach((p, i) => {
      const vy = Math.hypot(p.vel?.x||0, p.vel?.y||0);
      ctx.fillStyle = p.color || '#FFFFFF';
      ctx.fillText(`${p.name || ('P' + (i+1))}`, COL2, ROW + LH2 * (i * 4 + 1));
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(`  Pos  X=${(p.pos.x||0).toFixed(3)}m  Y=${(p.pos.y||0).toFixed(3)}m`, COL2, ROW + LH2 * (i * 4 + 2));
      ctx.fillText(`  Vel  vx=${(p.vel?.x||0).toFixed(3)}  vy=${(p.vel?.y||0).toFixed(3)}  |v|=${vy.toFixed(2)} m/s`, COL2, ROW + LH2 * (i * 4 + 3));
    });

    // Col 3 — Trail points (last 10)
    const COL3 = COL + LW * 0.70 * SCALE;
    ctx.fillStyle = '#A8C832';
    ctx.fillText('── TRAIL (últimos 10 pts) ─────────────────', COL3, ROW);
    ctx.fillStyle = '#FFFFFF';
    const trail = frame.trail || [];
    const showTrail = trail.slice(-10);
    showTrail.forEach((t, i) => {
      ctx.fillText(`[${trail.length - showTrail.length + i}] x=${t.x?.toFixed(3)} y=${t.y?.toFixed(3)} z=${t.z?.toFixed(3)}`, COL3, ROW + LH2 * (i + 1));
    });

    ctx.restore();

    // Footer
    ctx.save();
    ctx.fillStyle = 'rgba(255,68,68,0.7)';
    ctx.font = `500 ${8 * SCALE}px 'Space Mono', monospace`;
    ctx.fillText(`Capturado em ${new Date().toLocaleString('pt-BR')}  ·  Frame #${frame.frameIdx}  ·  História Viva Match Engine`, PX + 8 * SCALE, PY + PH - 6 * SCALE);
    ctx.restore();

    triggerDownload(off, `bug-frame-${frame.frameIdx}.png`);
  }

  function triggerDownload(canvas, filename) {
    canvas.toBlob(blob => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a   = document.createElement('a');
      a.href    = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 3000);
    }, 'image/png');
  }

  function triggerTextDownload(text, filename) {
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 3000);
  }

  function generateRatingHealthDebug() {
    const gs  = gsRef?.current;
    const now = new Date().toLocaleString('pt-BR');
    const sep = (c = '─', n = 72) => c.repeat(n);
    const bar = (v, max = 100) => {
      const filled = Math.round(Math.max(0, Math.min(1, v / max)) * 20);
      return '[' + '█'.repeat(filled) + '░'.repeat(20 - filled) + ']';
    };
    const lines = [];

    // ── cabeçalho ────────────────────────────────────────────────
    lines.push(sep('═'));
    lines.push(`  RATING & HEALTH DEBUG  ·  ${now}`);
    lines.push(sep('═'));

    // ── helper para um jogador ───────────────────────────────────
    function playerBlock(label, uPlayer, gsPlayer) {
      lines.push('');
      lines.push(sep('─'));
      lines.push(`  ${label}: ${uPlayer?.name ?? gsPlayer?.name ?? '?'}`);
      lines.push(sep('─'));

      // ── HEALTH ─────────────────────────────────────────────────
      lines.push('  ── SAÚDE / physicalCondition ──');

      const cond      = uPlayer?.physicalCondition ?? null;
      const age       = uPlayer?.age ?? 25;
      const res       = uPlayer?.attrs?.resistencia ?? 70;
      const injury    = uPlayer?.injury;
      const injHist   = uPlayer?.injuryHistory ?? [];

      lines.push(`  physicalCondition  : ${cond != null ? cond.toFixed(1) : 'N/A (nunca inicializado)'}`);
      lines.push(`  ${bar(cond ?? 0)}  ${cond != null ? Math.round(cond) + '/100' : '—'}`);
      lines.push(`  Idade              : ${age}`);
      lines.push(`  Resistência (attr) : ${res}`);

      // Decays simulados
      const decayMult = (1.3 - (res / 100) * 0.6);
      const ageMult   = age >= 35 ? 1.4 * 1.6 : age >= 32 ? 1.4 : 1.0;
      const d250      = +(1.5 * decayMult * ageMult).toFixed(2);
      const dMasters  = +((1.5 + 1.5) * decayMult * ageMult).toFixed(2);
      const dSlam     = +((1.5 + 2.5 + 1.0) * decayMult * ageMult).toFixed(2);
      const recBase   = +(4.0 * (0.7 + (res / 100) * 0.6) * (age >= 36 ? 0.55 : age >= 33 ? 0.7 : 1.0)).toFixed(2);

      lines.push('');
      lines.push('  Decaimento por torneio (estimado):');
      lines.push(`    ATP 250    : -${d250}  por participação`);
      lines.push(`    Masters    : -${dMasters}  por participação`);
      lines.push(`    Grand Slam : -${dSlam}  por participação`);
      lines.push(`    Descanso   : +${recBase}  por slot de descanso`);
      lines.push('');
      lines.push('  ⚠ ATENÇÃO: jogadores fora do draw também decaem (bug conhecido).');
      lines.push('    Com 43 torneios/temporada, todos os 128 decaem em cada torneio');
      lines.push('    mesmo os que não participaram. Só injury-withdrawals recuperam.');

      // Net estimado da temporada (20 partidos, 23 descansos — mas todos 43 decaem)
      const netBug  = +(43 * d250 * -1 + 23 * recBase).toFixed(1);
      const netOk   = +(20 * d250 * -1 + 23 * recBase).toFixed(1);
      lines.push('');
      lines.push(`  Net estimado/temporada (bug ativo)  : ${netBug > 0 ? '+' : ''}${netBug}`);
      lines.push(`  Net estimado/temporada (sem bug)    : ${netOk > 0 ? '+' : ''}${netOk}`);

      // Lesão atual
      if (injury && injury.slotsRemaining > 0) {
        lines.push('');
        lines.push(`  Lesão ativa: grade ${injury.grade}  |  slots restantes: ${injury.slotsRemaining}`);
        lines.push(`  Tipo: ${injury.type ?? '?'}  |  Desde torneio: ${injury.fromTournament ?? '?'}`);
      } else {
        lines.push('');
        lines.push('  Sem lesão ativa no momento.');
      }
      lines.push(`  Histórico de lesões: ${injHist.length} ocorrências`);
      if (injHist.length > 0) {
        injHist.slice(-3).forEach(inj => {
          lines.push(`    → ${inj.type ?? '?'}  grade ${inj.grade ?? '?'}  temporada ${inj.season ?? '?'}  duração ${inj.duration ?? '?'} slots`);
        });
      }

      // ── STAMINA em jogo (game state) ──────────────────────────
      const stam = gsPlayer?.stamina ?? null;
      lines.push('');
      lines.push('  ── STAMINA EM JOGO (engine) ──');
      lines.push(`  stamina atual  : ${stam != null ? stam.toFixed(3) : 'N/A'}`);
      lines.push(`  ${stam != null ? bar(stam, 1) : '—'}  ${stam != null ? (stam * 100).toFixed(1) + '%' : '—'}`);

      // ── RATING ─────────────────────────────────────────────────
      lines.push('');
      lines.push('  ── RATING / matchRatingHistory ──');

      const rHist = uPlayer?.matchRatingHistory ?? [];
      lines.push(`  Histórico (últimas ${rHist.length} / max 20):`);
      if (rHist.length === 0) {
        lines.push('    (vazio — nenhum rating foi registrado ainda)');
        lines.push('    Causa: partidas sem stats completas (FastSim sem winners/aces/erros)');
        lines.push('    ou est ≤ 1 no fallback do UniverseManager.');
      } else {
        const chunk = rHist.slice(-10);
        chunk.forEach((r, i) => {
          const tier = r >= 9.0 ? 'EXCEPCIONAL' : r >= 7.5 ? 'DOMINANTE' : r >= 6.0 ? 'SÓLIDO' : r >= 4.5 ? 'REGULAR' : 'FRACO';
          lines.push(`    [${rHist.length - chunk.length + i + 1}] ${r.toFixed(1)}  ${bar(r, 10)}  ${tier}`);
        });
        const avg5  = rHist.slice(-5).reduce((a, b) => a + b, 0) / Math.min(5, rHist.length);
        const avg20 = rHist.reduce((a, b) => a + b, 0) / rHist.length;
        lines.push('');
        lines.push(`  Média últimas 5   : ${avg5.toFixed(2)}`);
        lines.push(`  Média todas (${rHist.length.toString().padStart(2)}) : ${avg20.toFixed(2)}`);
      }

      // ── IFR / PhaseTwo ─────────────────────────────────────────
      const pt = uPlayer?.phaseTwo;
      if (pt) {
        lines.push('');
        lines.push('  ── IFR / phaseTwo ──');
        lines.push(`  sponsorSignal : ${pt.sponsorSignal ?? '?'}`);
        lines.push(`  ifr           : ${pt.ifr ?? '?'}  (${pt.ifrTier ?? '?'})`);
        lines.push(`  visibility    : ${pt.visibility ?? '?'}`);
        if (pt.ifrComponents) {
          const c = pt.ifrComponents;
          lines.push('  Componentes IFR:');
          lines.push(`    resultados   : ${c.resultados ?? '?'}`);
          lines.push(`    ranking      : ${c.ranking ?? '?'}`);
          lines.push(`    vsExpect     : ${c.vsExpect ?? '?'}`);
          lines.push(`    titulos      : ${c.titulos ?? '?'}`);
          lines.push(`    matchRating  : ${c.matchRating ?? '?'}`);
          lines.push(`    saude        : ${c.saude ?? '?'}`);
        }
      } else {
        lines.push('');
        lines.push('  phaseTwo: não inicializado (updatePlayerPhaseTwo nunca rodou para este jogador)');
      }

      // ── recentForm ─────────────────────────────────────────────
      const rf = uPlayer?.recentForm;
      if (rf) {
        lines.push('');
        lines.push('  ── recentForm ──');
        lines.push(`  formScore   : ${rf.formScore?.toFixed(3) ?? '?'}`);
        lines.push(`  hotStreak   : ${rf.hotStreak ?? 0}`);
        lines.push(`  coldStreak  : ${rf.coldStreak ?? 0}`);
        const rfResults = rf.results ?? [];
        lines.push(`  resultados  : ${rfResults.length} registrados`);
        if (rfResults.length > 0) {
          rfResults.slice(-5).forEach(r => {
            lines.push(`    ${r.won ? '✓' : '✗'}  oppRank=${r.oppRank ?? '?'}  surface=${r.surface ?? '?'}`);
          });
        }
      }
    }

    // ── Jogadores ────────────────────────────────────────────────
    const gsP0 = gs?.players?.[0];
    const gsP1 = gs?.players?.[1];

    playerBlock('JOGADOR A (esquerda)', universePlayerA, gsP0);
    playerBlock('JOGADOR B (direita)',  universePlayerB, gsP1);

    // ── Notas de diagnóstico ─────────────────────────────────────
    lines.push('');
    lines.push(sep('═'));
    lines.push('  NOTAS DE DIAGNÓSTICO');
    lines.push(sep('─'));
    lines.push('  1. HEALTH: Se net/temporada for muito negativo, o bug de decay global');
    lines.push('     (todos os 128 jogadores decaem em cada um dos 43 torneios) é a causa.');
    lines.push('     Fix: só decair jogadores que estavam no draw do torneio.');
    lines.push('');
    lines.push('  2. RATING: Se matchRatingHistory está vazio, as partidas do FastSim não');
    lines.push('     têm stats suficientes para computeRating. O IFR usa fallback neutro (50).');
    lines.push('     Fix: garantir que FastSim popula winners/aces/unforcedErrors.');
    lines.push('');
    lines.push('  3. FORM POINTS (formação): Perder na R32 = -8pts, ganhar = +6pts.');
    lines.push('     Jogadores fora do torneio recebem 0, mas ainda decaem fisicamente.');
    lines.push(sep('═'));

    const txt = lines.join('\n');

    // Copia para clipboard
    navigator.clipboard?.writeText(txt).then(() => {
      console.log('[RatingHealthDebug] Copiado para clipboard!');
    }).catch(() => {
      console.log('[RatingHealthDebug]\n' + txt);
    });

    // Também dispara download
    const blob = new Blob([txt], { type: 'text/plain' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `rating-health-debug-${Date.now()}.txt`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 3000);
  }

  function generateDebugReport() {
    const gs       = gsRef?.current;
    const hist     = frameHistory;
    const curFrame = (rewindIdx !== null && hist[rewindIdx]) ? hist[rewindIdx] : (hist.length ? hist[hist.length-1] : null);
    const now      = new Date().toLocaleString('pt-BR');
    const sep      = (char = '─', len = 100) => char.repeat(len);
    const f2       = v => (v == null ? '   ?' : (v >= 0 ? ' ' : '') + Number(v).toFixed(2));
    const f3       = v => (v == null ? '    ?' : (v >= 0 ? ' ' : '') + Number(v).toFixed(3));
    const pct      = v => (v == null ? '  ?' : String(Math.round(Number(v) * 100)).padStart(3) + '%');
    const bar10    = v => { const n = Math.round(Math.max(0, Math.min(1, v ?? 0)) * 10); return '█'.repeat(n) + '░'.repeat(10 - n); };
    const yesno    = v => v ? '✓ SIM' : '✗ NÃO';
    const lines    = [];

    // ══════════════════════════════════════════════════════════════════════════
    lines.push(sep('═', 100));
    lines.push('');
    lines.push('  🐛  HISTÓRIA VIVA MATCH ENGINE — DIAGNÓSTICO FORENSE COMPLETO');
    lines.push(`  Gerado: ${now}`);
    lines.push(`  Janela analisada: últimos ${hist.length} frames  (~${((hist.length / 60)).toFixed(1)}s a 60fps)`);
    if (curFrame) {
      lines.push(`  Frame de referência: #${curFrame.frameIdx}  |  Rally: ${curFrame.rally}  |  Estado: ${curFrame.gameState}  |  Bola: ${curFrame.ballSpeed} km/h`);
    }
    lines.push('');
    lines.push(sep('═', 100));
    lines.push('');

    // ══ SEÇÃO 0 — SNAPSHOT LIVE DO GS ═══════════════════════════════════════
    lines.push(sep('═', 100));
    lines.push('  SEÇÃO 0 ── ESTADO VIVO DO MOTOR (gsRef.current no momento do clique)');
    lines.push(sep('═', 100));
    if (gs) {
      const p0 = gs.players?.[0], p1 = gs.players?.[1];
      const SL = ['0','15','30','40','Ad'];
      lines.push('');
      lines.push(`  ┌─ PLACAR ─────────────────────────────────────────────────────────`);
      lines.push(`  │  ${(p0?.name ?? 'P0').padEnd(22)} vs  ${p1?.name ?? 'P1'}`);
      lines.push(`  │  Sets:  ${p0?.sets ?? '?'} - ${p1?.sets ?? '?'}   Games: ${p0?.games ?? '?'} - ${p1?.games ?? '?'}   Score: ${SL[p0?.score ?? 0] ?? '?'} - ${SL[p1?.score ?? 0] ?? '?'}`);
      lines.push(`  │  Servidor: ${gs.players?.[gs.server]?.name ?? '?'}   gameState: ${gs.gameState}   Rally: ${gs.rally}   Total pontos: ${gs.totalPoints}`);
      lines.push(`  │  isFirstBounce: ${yesno(gs.isFirstBounce)}   serveBounced: ${yesno(gs.serveBounced)}   receiverTouched: ${yesno(gs.receiverTouched)}`);
      lines.push(`  └──────────────────────────────────────────────────────────────────`);
      lines.push('');

      // Per-player live state
      [p0, p1].forEach((p, i) => {
        if (!p) return;
        const spd = Math.hypot(p.vel?.x ?? 0, p.vel?.y ?? 0);
        lines.push(`  ┌─ JOGADOR ${i} — ${p.name} ──────────────────────────────────────────────`);
        lines.push(`  │  Posição:    X=${f3(p.pos?.x)}m   Y=${f3(p.pos?.y)}m   atNet=${yesno(p.atNet)}`);
        lines.push(`  │  Vel:        vx=${f3(p.vel?.x)} vy=${f3(p.vel?.y)} |v|=${f2(spd)}m/s`);
        lines.push(`  │  basePos:    X=${f3(p.basePos?.x)}m   Y=${f3(p.basePos?.y)}m   side=${p.side}`);
        lines.push(`  │  Stamina:    ${pct(p.stamina)}  [${bar10(p.stamina)}]   playerSpeed: ${p.playerSpeed?.toFixed(2) ?? '?'}`);
        lines.push(`  │  Style:      ${p.styleId ?? '?'} (${p.styleData?.abbr ?? '?'})   namedKey: ${p.namedPlayerKey ?? '?'}`);
        lines.push(`  │  ── CTX ──`);
        lines.push(`  │  Intent:     ${p.ctx?.currentIntent ?? '?'}   courtMode: ${p.ctx?.courtMode ?? '?'}`);
        lines.push(`  │  Momentum:   ${pct(p.ctx?.momentum)}  [${bar10(p.ctx?.momentum ?? 0.5)}]   EWMA: ${p.ctx?._momentumEWMA?.toFixed(3) ?? '?'}`);
        lines.push(`  │  Pressure:   underPressure=${yesno(p.ctx?.underPressure)}   rallyPressure=${p.ctx?.rallyPressure?.toFixed(3) ?? '?'}`);
        lines.push(`  │  RallyBalls: ${p.ctx?.rallyBalls ?? 0}   lobsReceived: ${p.ctx?.lobsReceived ?? 0}   bodySpam: ${p.ctx?._bodySpamCount ?? 0}`);
        lines.push(`  │  ── MOVIMENTO ──`);
        lines.push(`  │  _arrivalMargin:  ${p._arrivalMargin != null ? p._arrivalMargin.toFixed(4) + 's' : 'undefined'}   ${p._arrivalMargin != null ? (p._arrivalMargin > 0.3 ? '✓ tempo sobrando' : p._arrivalMargin > 0 ? '⚠ justo' : '✗ ATRASADO') : ''}`);
        lines.push(`  │  _posLocked:      ${yesno(p._posLocked)}`);
        lines.push(`  │  _stableTarget:   X=${f3(p._stableTarget?.x)}  Y=${f3(p._stableTarget?.y)}`);
        lines.push(`  │  _footingState:   ${p.ctx?._footingState ?? '?'}`);
        lines.push(`  │  _postHitRecovery:${p._postHitRecoveryTimer?.toFixed(3) ?? '0.000'}s restante`);
        lines.push(`  │  _postHitPause:   ${p.ctx?._postHitPause?.toFixed(3) ?? '0.000'}s restante`);
        lines.push(`  │  _serveShortDet:  ${yesno(p._serveShortDetected)}`);
        lines.push(`  │  _readPauseFrames:${p._readPauseFrames ?? 0}`);
        lines.push(`  │  shotCount: ${p.shotCount ?? 0}   winnerCount: ${p.winnerCount ?? 0}   errorCount: ${p.errorCount ?? 0}`);
        lines.push(`  └──────────────────────────────────────────────────────────────────`);
        lines.push('');
      });

      lines.push(`  ┌─ BOLA ───────────────────────────────────────────────────────────`);
      const b = gs.ball;
      const bspd = Math.hypot(b?.vel?.x ?? 0, b?.vel?.y ?? 0, b?.vel?.z ?? 0);
      lines.push(`  │  Pos:     X=${f3(b?.pos?.x)}m   Y=${f3(b?.pos?.y)}m   Z=${f3(b?.pos?.z)}m`);
      lines.push(`  │  Vel:     vx=${f3(b?.vel?.x)} vy=${f3(b?.vel?.y)} vz=${f3(b?.vel?.z)}   |v|=${f2(bspd)}m/s  (${Math.round(bspd * 3.6)}km/h)`);
      lines.push(`  │  Spin:    x=${f3(b?.spin?.x)} y=${f3(b?.spin?.y)} z=${f3(b?.spin?.z)}`);
      lines.push(`  │  inFlight: ${yesno(b?.inFlight)}   bounceCount: ${b?.bounceCount ?? 0}   lastHitBy: ${b?.lastHitBy ?? 'none'}   lastShotType: ${b?.lastShotType ?? '?'}`);
      lines.push(`  │  _serveTargetY: ${b?._serveTargetY?.toFixed(3) ?? '?'}   _serveExitKmh: ${b?._serveExitKmh ?? '?'}`);
      lines.push(`  │  Quadra: ${gs.courtMeta?.name ?? '?'} (${gs.courtMeta?.surface ?? '?'})`);
      lines.push(`  └──────────────────────────────────────────────────────────────────`);
    } else {
      lines.push('  [gs não disponível no momento do clique]');
    }
    lines.push('');

    // ══ SEÇÃO 1 — FRAME-A-FRAME COMPLETO ════════════════════════════════════
    lines.push(sep('═', 100));
    lines.push(`  SEÇÃO 1 ── VARREDURA FRAME-A-FRAME — ${hist.length} frames completos (~5 segundos)`);
    lines.push(`             Cada frame = 1 tick do motor. 60fps = 60 frames/s.`);
    lines.push(sep('═', 100));
    lines.push('');

    if (hist.length === 0) {
      lines.push('  [histórico vazio — nenhum frame registrado]');
    } else {
      const latest = hist[hist.length - 1];

      // ── Header tabela frame-a-frame
      lines.push(
        '  Frame#  ΔT(ms)   T-ago   State        Rally  Speed    ' +
        '  Ball  X      Y      Z    Fly  Bnc  ' +
        '  P0  X      Y     |v|   ' +
        '  P1  X      Y     |v|'
      );
      lines.push('  ' + sep('─', 98));

      hist.forEach((f, i) => {
        const dtMs  = latest.ts - f.ts;
        const dFromPrev = i > 0 ? (f.ts - hist[i-1].ts) : 0;
        const tAgo  = dtMs < 100 ? ' LIVE' : `-${(dtMs / 1000).toFixed(2)}s`;
        const b     = f.ball;
        const bspd3 = Math.sqrt((b.vel.x||0)**2 + (b.vel.y||0)**2 + (b.vel.z||0)**2);
        const p0    = f.players?.[0];
        const p1    = f.players?.[1];
        const p0spd = Math.hypot(p0?.vel?.x ?? 0, p0?.vel?.y ?? 0);
        const p1spd = Math.hypot(p1?.vel?.x ?? 0, p1?.vel?.y ?? 0);

        lines.push(
          `  ${String(f.frameIdx).padStart(7)}` +
          `  ${String(dFromPrev).padStart(5)}ms` +
          `  ${tAgo.padEnd(7)}` +
          `  ${(f.gameState ?? '?').padEnd(12)}` +
          `  ${String(f.rally ?? 0).padStart(4)}` +
          `  ${String(f.ballSpeed ?? 0).padStart(5)}km/h` +
          `  ${(b.pos.x).toFixed(3).padStart(7)} ${(b.pos.y).toFixed(3).padStart(7)} ${(b.pos.z).toFixed(3).padStart(6)}` +
          `  ${b.inFlight ? 'VOO' : 'CHÃ'}` +
          `  ${String(b.bounceCount ?? 0).padStart(3)}` +
          `  ${(p0?.pos?.x ?? 0).toFixed(2).padStart(7)} ${(p0?.pos?.y ?? 0).toFixed(2).padStart(7)} ${p0spd.toFixed(2).padStart(5)}` +
          `  ${(p1?.pos?.x ?? 0).toFixed(2).padStart(7)} ${(p1?.pos?.y ?? 0).toFixed(2).padStart(7)} ${p1spd.toFixed(2).padStart(5)}`
        );
      });

      lines.push('');

      // ── Análise de eventos detectados no histórico
      lines.push(sep('─', 100));
      lines.push('  EVENTOS DETECTADOS NO HISTÓRICO (mudanças de estado)');
      lines.push(sep('─', 100));
      let prevState = null, prevRally = null, prevFlight = null, prevBounce = null;
      hist.forEach((f, i) => {
        const b = f.ball;
        const tAgo = `-${((latest.ts - f.ts) / 1000).toFixed(2)}s`;
        if (f.gameState !== prevState) {
          lines.push(`  [${tAgo}] Frame#${f.frameIdx}  gameState mudou: ${prevState ?? 'inicio'} → ${f.gameState}`);
          prevState = f.gameState;
        }
        if (f.rally !== prevRally && prevRally !== null) {
          lines.push(`  [${tAgo}] Frame#${f.frameIdx}  rally mudou: ${prevRally} → ${f.rally}`);
          prevRally = f.rally;
        } else if (prevRally === null) prevRally = f.rally;
        if (b.inFlight !== prevFlight && prevFlight !== null) {
          lines.push(`  [${tAgo}] Frame#${f.frameIdx}  bola.inFlight: ${prevFlight ? 'VOO' : 'CHÃO'} → ${b.inFlight ? 'VOO' : 'CHÃO'}`);
          prevFlight = b.inFlight;
        } else if (prevFlight === null) prevFlight = b.inFlight;
        if (b.bounceCount !== prevBounce && prevBounce !== null && b.bounceCount > prevBounce) {
          lines.push(`  [${tAgo}] Frame#${f.frameIdx}  QUIQUE #${b.bounceCount}  pos=X${b.pos.x.toFixed(2)} Y${b.pos.y.toFixed(2)} Z${b.pos.z.toFixed(2)}`);
          prevBounce = b.bounceCount;
        } else if (prevBounce === null) prevBounce = b.bounceCount;
      });

      lines.push('');

      // ── Análise de velocidade dos jogadores
      lines.push(sep('─', 100));
      lines.push('  ANÁLISE DE VELOCIDADE — P0 e P1 frame-a-frame (|v| m/s)');
      lines.push(sep('─', 100));
      lines.push('  Quando velocidade ~0 = parado/congelado, velocidade alta = sprint');
      lines.push('');

      // Detectar freezes / sprints
      const freezeThresh = 0.3;
      const sprintThresh = 4.0;
      [0, 1].forEach(pi => {
        const pname = hist[0]?.players?.[pi]?.name ?? `P${pi}`;
        let freezeStart = null, sprintStart = null;
        lines.push(`  ${pname} — eventos de movimento:`);
        hist.forEach((f, i) => {
          const p = f.players?.[pi];
          const spd = Math.hypot(p?.vel?.x ?? 0, p?.vel?.y ?? 0);
          const tAgo = `-${((latest.ts - f.ts) / 1000).toFixed(2)}s`;

          if (spd < freezeThresh && freezeStart === null) {
            freezeStart = { frame: f.frameIdx, tAgo, x: p?.pos?.x, y: p?.pos?.y };
          } else if (spd >= freezeThresh && freezeStart !== null) {
            const dur = f.frameIdx - freezeStart.frame;
            if (dur >= 2) {
              lines.push(`    FREEZE [${freezeStart.tAgo}→${tAgo}] ${dur} frames (~${(dur/60*1000).toFixed(0)}ms) em X${freezeStart.x?.toFixed(2)} Y${freezeStart.y?.toFixed(2)}`);
            }
            freezeStart = null;
          }

          if (spd >= sprintThresh && sprintStart === null) {
            sprintStart = { frame: f.frameIdx, tAgo, spd };
          } else if (spd < sprintThresh && sprintStart !== null) {
            const dur = f.frameIdx - sprintStart.frame;
            if (dur >= 3) {
              lines.push(`    SPRINT [${sprintStart.tAgo}→${tAgo}] ${dur} frames (~${(dur/60*1000).toFixed(0)}ms) pico=${sprintStart.spd.toFixed(2)}m/s`);
            }
            sprintStart = null;
          }
        });
        // close open ranges
        if (freezeStart) lines.push(`    FREEZE [${freezeStart.tAgo}→LIVE] (em andamento)`);
        if (sprintStart) lines.push(`    SPRINT [${sprintStart.tAgo}→LIVE] (em andamento)`);
        lines.push('');
      });

      // ── Distância bola-jogador por frame
      lines.push(sep('─', 100));
      lines.push('  DISTÂNCIA BOLA ↔ JOGADOR — frame-a-frame (detecta quem perseguia a bola)');
      lines.push('  Frame#    T-ago      Dist P0→Bola   Dist P1→Bola   Bola voo?  lastHitBy  P0 spd   P1 spd');
      lines.push('  ' + sep('─', 90));
      hist.forEach(f => {
        const b  = f.ball;
        const p0 = f.players?.[0];
        const p1 = f.players?.[1];
        const d0 = Math.hypot((p0?.pos?.x ?? 0) - b.pos.x, (p0?.pos?.y ?? 0) - b.pos.y);
        const d1 = Math.hypot((p1?.pos?.x ?? 0) - b.pos.x, (p1?.pos?.y ?? 0) - b.pos.y);
        const tAgo = latest.ts - f.ts < 100 ? ' LIVE' : `-${((latest.ts - f.ts)/1000).toFixed(2)}s`;
        const p0spd = Math.hypot(p0?.vel?.x ?? 0, p0?.vel?.y ?? 0);
        const p1spd = Math.hypot(p1?.vel?.x ?? 0, p1?.vel?.y ?? 0);
        lines.push(
          `  ${String(f.frameIdx).padStart(7)}  ${tAgo.padEnd(8)}` +
          `  ${d0.toFixed(2).padStart(11)}m` +
          `  ${d1.toFixed(2).padStart(11)}m` +
          `  ${(b.inFlight ? 'VOO' : 'CHÃ').padEnd(9)}` +
          `  ${String(b.lastHitBy ?? '-').padEnd(9)}` +
          `  ${p0spd.toFixed(2).padStart(6)}m/s` +
          `  ${p1spd.toFixed(2).padStart(6)}m/s`
        );
      });
    }
    lines.push('');

    // ══ SEÇÃO 2 — DECISÕES IA / MOVIMENTO (snapshot atual do gs) ════════════
    lines.push(sep('═', 100));
    lines.push('  SEÇÃO 2 ── ESTADO INTERNO DA IA — DECISÕES DE MOVIMENTO (snapshot vivo)');
    lines.push('             Explica POR QUE cada jogador está na posição que está');
    lines.push(sep('═', 100));
    lines.push('');

    if (gs) {
      [gs.players?.[0], gs.players?.[1]].forEach((p, pi) => {
        if (!p) return;
        const bspd = Math.hypot(gs.ball?.vel?.x ?? 0, gs.ball?.vel?.y ?? 0, gs.ball?.vel?.z ?? 0);
        const pspd = Math.hypot(p.vel?.x ?? 0, p.vel?.y ?? 0);
        const distToBall = Math.hypot((p.pos?.x ?? 0) - (gs.ball?.pos?.x ?? 0), (p.pos?.y ?? 0) - (gs.ball?.pos?.y ?? 0));
        const isMyBall = gs.ball?.lastHitBy !== p.id;
        const coming = (p.side > 0 && (gs.ball?.vel?.y ?? 0) > 0) || (p.side < 0 && (gs.ball?.vel?.y ?? 0) < 0);
        const onMySide = Math.sign(gs.ball?.pos?.y ?? 0) === p.side || Math.abs(gs.ball?.pos?.y ?? 0) < 0.5;
        const justHit = gs.ball?.lastHitBy === p.id;

        lines.push(`  ┌─ ${p.name} (P${pi}) ─────────────────────────────────────────────────────────`);
        lines.push(`  │`);
        lines.push(`  │  POSIÇÃO ATUAL:    X=${f3(p.pos?.x)}m  Y=${f3(p.pos?.y)}m   (velocidade: ${pspd.toFixed(2)}m/s)`);
        lines.push(`  │  POSIÇÃO BASE:     X=${f3(p.basePos?.x)}m  Y=${f3(p.basePos?.y)}m   (onde deveria estar em neutro)`);
        lines.push(`  │  ALVO ESTÁVEL:     X=${f3(p._stableTarget?.x)}m  Y=${f3(p._stableTarget?.y)}m   (blend suavizado do target)`);
        lines.push(`  │`);
        lines.push(`  │  ── ANÁLISE DA SITUAÇÃO ──`);
        lines.push(`  │  Bola vindo para mim?    ${yesno(coming)}   (vel.y ${(gs.ball?.vel?.y ?? 0) > 0 ? '>' : '<'} 0, side=${p.side})`);
        lines.push(`  │  Bola no meu lado?       ${yesno(onMySide)}`);
        lines.push(`  │  Acabei de bater?        ${yesno(justHit)}   (lastHitBy=${gs.ball?.lastHitBy ?? 'none'} vs id=${p.id})`);
        lines.push(`  │  Distância até bola:     ${distToBall.toFixed(2)}m`);
        lines.push(`  │  Bola em voo:            ${yesno(gs.ball?.inFlight)}`);
        lines.push(`  │`);
        lines.push(`  │  ── BLOQUEIOS DE MOVIMENTO ──`);
        lines.push(`  │  _posLocked:             ${yesno(p._posLocked)}   ${p._posLocked ? '⚠ CONGELADO esperando o golpe' : ''}`);
        lines.push(`  │  _postHitRecoveryTimer:  ${(p._postHitRecoveryTimer ?? 0).toFixed(3)}s   ${(p._postHitRecoveryTimer ?? 0) > 0 ? '⚠ em modo recovery pós-golpe (blend rápido)' : '✓ ok'}`);
        lines.push(`  │  _postHitPause (ctx):    ${(p.ctx?._postHitPause ?? 0).toFixed(3)}s   ${(p.ctx?._postHitPause ?? 0) > 0 ? '⚠ FREEZE pós-golpe (vel*0.75, return early)' : '✓ ok'}`);
        lines.push(`  │  _readPauseFrames:       ${p._readPauseFrames ?? 0}   ${(p._readPauseFrames ?? 0) > 0 ? '⚠ micro-pausa de leitura pós-bater' : '✓ ok'}`);
        lines.push(`  │  _serveShortDetected:    ${yesno(p._serveShortDetected)}   ${p._serveShortDetected ? '★ detectou saque curto — freeze desativado' : ''}`);
        lines.push(`  │  atNet:                  ${yesno(p.atNet)}`);
        lines.push(`  │`);
        lines.push(`  │  ── TIMING DE CHEGADA ──`);
        if (p._arrivalMargin != null) {
          const m = p._arrivalMargin;
          lines.push(`  │  _arrivalMargin:  ${m.toFixed(4)}s   ${m > 0.4 ? '✓ chegando cedo — pode reduzir vel' : m > 0 ? '⚠ chegando justo' : '✗ CHEGARÁ TARDE — sprint máximo'}`);
          lines.push(`  │  Urgência implícita: ${m > 0.4 ? 'JOG (82% vel)' : m > 0.1 ? 'RUN (93% vel)' : 'SPRINT (100% vel)'}`);
        } else {
          lines.push(`  │  _arrivalMargin:  undefined — bola não vindo para este jogador`);
        }
        lines.push(`  │`);
        lines.push(`  │  ── CONTEXTO TÁTICO ──`);
        lines.push(`  │  Intent:          ${p.ctx?.currentIntent ?? '?'}   courtMode: ${p.ctx?.courtMode ?? '?'}`);
        lines.push(`  │  footingState:    ${p.ctx?._footingState ?? '?'}   ${p.ctx?._footingState === 'planted' ? '★ explosão extra (+30% accel)' : p.ctx?._footingState === 'offBalance' ? '⚠ desequilibrado (-20% accel)' : ''}`);
        lines.push(`  │  Stamina:         ${pct(p.stamina)}   speedMin=${((0.55 + (p.stamina ?? 1) * 0.45) * (p.playerSpeed ?? 5.4)).toFixed(2)}m/s → speedMax=${(p.playerSpeed ?? 5.4).toFixed(2)}m/s`);
        lines.push(`  │  rallyPressure:   ${(p.ctx?.rallyPressure ?? 0).toFixed(3)}   underPressure: ${yesno(p.ctx?.underPressure)}`);
        lines.push(`  │  nextIntentBoost: ${p.ctx?.nextIntentBoost ?? 'none'}   intentBoostTimer: ${p.ctx?.intentBoostTimer ?? 0}`);
        lines.push(`  │`);
        lines.push(`  │  ── DIAGNÓSTICO AUTOMÁTICO ──`);
        const diags = [];
        if ((p.ctx?._postHitPause ?? 0) > 0)        diags.push(`  ⚠ FREEZE ativo (${(p.ctx._postHitPause * 1000).toFixed(0)}ms restantes) — vel multiplicada por 0.75, return early`);
        if (p._posLocked)                            diags.push(`  ⚠ POS-LOCKED — esperando bola chegar, alvo congelado na posição atual`);
        if ((p._arrivalMargin ?? 1) < -0.2)          diags.push(`  ✗ CHEGARÁ TARDE (margin=${p._arrivalMargin?.toFixed(3)}s) — give-up pode ativar se < ${gs?.INERTIA?.giveUpMargin ?? '-0.6'}s`);
        if (justHit && coming)                       diags.push(`  ⚠ ACABOU DE BATER mas bola voltando — recovery vs pursuit conflict`);
        if (!coming && !onMySide && !justHit)        diags.push(`  ℹ Bola no lado adversário — em recovery/split-step`);
        if ((p.ctx?._footingState) === 'offBalance') diags.push(`  ⚠ OFF-BALANCE — aceleração reduzida em ~20%`);
        if (diags.length === 0) diags.push('  ✓ Nenhum bloqueio detectado — movimento normal');
        diags.forEach(d => lines.push(`  │${d}`));
        lines.push(`  └──────────────────────────────────────────────────────────────────`);
        lines.push('');
      });
    } else {
      lines.push('  [gs não disponível]');
    }

    // ══ SEÇÃO 3 — TRACE IA: TODOS OS PONTOS COM SHOTS DETALHADOS ════════════
    lines.push(sep('═', 100));
    lines.push('  SEÇÃO 3 ── TRACE DA IA — DECISÕES DE GOLPE (últimos 8 pontos + ponto atual)');
    lines.push('             Cada golpe: contexto completo, candidatos, qualidade, diagnóstico');
    lines.push(sep('═', 100));
    lines.push('');

    const trace = gs?.trace;
    if (trace) {
      const points = trace.points?.all?.() ?? [];
      const allPts = [...points];
      if (trace._current) allPts.push({ ...trace._current, _inProgress: true });

      if (allPts.length === 0) {
        lines.push('  [sem dados de trace]');
      } else {
        allPts.slice(-8).forEach((pt, ptIdx) => {
          lines.push('');
          lines.push(sep('─', 100));
          lines.push(`  PONTO ${pt.pointId ?? (ptIdx + 1)} ${pt._inProgress ? '(EM ANDAMENTO ●)' : '(encerrado)'}  —  Set ${pt.set}  Game ${pt.game}  Score ${pt.score}  Servidor: ${pt.server ?? '?'}`);
          if (pt.endReason) {
            lines.push(`  Resultado: ${pt.winner ?? '?'} venceu  via=${pt.endReason}  rally=${pt.rally ?? '?'}`);
            lines.push(`  Detalhe:   "${pt.endDetail ?? ''}"`);
          }
          if (pt.serve) {
            const sv = pt.serve;
            lines.push(`  Saque:     ${sv.kmh ?? '?'}km/h  ${sv.physType ?? '?'}-${sv.dir ?? '?'}  ${sv.isFirst ? '1º' : '2º'} saque  ACE=${yesno(sv.isAce)}  serverWon=${yesno(sv.serverWon)}`);
          }
          lines.push(sep('─', 100));

          (pt.shots ?? []).forEach((sh, si) => {
            lines.push('');
            lines.push(`  [GOLPE ${si + 1}/${pt.shots.length}]  ${sh.hitter}  →  ${sh.receiver}   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
            lines.push(`    Tipo:       ${sh.shotType}   spin=${sh.spin ?? '?'}   potência=${sh.power}km/h`);
            lines.push(`    Situação:   ${sh.ballLabel ?? '?'}  ${sh.ballReasons?.length ? '[' + sh.ballReasons.join(', ') + ']' : ''}`);
            lines.push(`    ContactZ:   ${sh.contactZ?.toFixed(3) ?? '?'}m   zone: ${sh.contactZone ?? '?'}`);
            lines.push(`    Intent:     ${sh.intent ?? '?'}  —  "${sh.intentReason ?? '?'}"`);
            lines.push(`    Posições:`);
            lines.push(`      Batedor:   X=${sh.hitterPos?.x ?? '?'}  Y=${sh.hitterPos?.y ?? '?'}   atNet=${yesno(sh.atNet)}`);
            lines.push(`      Oponente:  X=${sh.oppPos?.x ?? '?'}  Y=${sh.oppPos?.y ?? '?'}   [${sh.oppLateral ?? '?'}/${sh.oppDepth ?? '?'}]   openSide=${sh.openSide ?? '?'}   out%=${sh.oppOut ?? '?'}`);
            lines.push(`      Bola:      X=${sh.ballPos?.x ?? '?'}  Y=${sh.ballPos?.y ?? '?'}  Z=${sh.ballPos?.z ?? '?'}`);
            lines.push(`    Alvo:       X=${sh.target?.x ?? '?'}  Y=${sh.target?.y ?? '?'}  dir=${sh.target?.dir ?? '?'}  depth=${sh.target?.depth ?? '?'}  width=${sh.target?.width ?? '?'}`);
            if (sh.bounce) lines.push(`    Quique:     X=${sh.bounce?.x ?? '?'}  Y=${sh.bounce?.y ?? '?'}   erro=${sh.landErr ?? '?'}m`);
            if (sh.outcome) lines.push(`    Resultado:  ${sh.outcome}`);
            lines.push(`    Momentum:   ${sh.momentum ?? '?'}   Stamina: ${sh.stamina ?? '?'}%   inControl: ${sh.inControl ?? '?'}   oppOut: ${sh.oppOut ?? '?'}`);

            // Quality breakdown completo
            const qb = sh.qualBreakdown;
            if (qb) {
              lines.push(`    ┌─ QUALIDADE DO GOLPE ──────────────────────────────────────────────────────────`);
              lines.push(`    │  FINAL: ${qb.final?.toFixed(4) ?? '?'}  [${bar10(qb.final)}]  ${(qb.final ?? 0) >= 0.80 ? '✓ EXCELENTE' : (qb.final ?? 0) >= 0.60 ? '▲ BOA' : (qb.final ?? 0) >= 0.40 ? '▼ MEDIANA' : '✗ RUIM'}`);
              lines.push(`    │  positionCeiling=${qb.positionCeiling?.toFixed(4) ?? '?'}  depthRatio=${qb.depthRatio?.toFixed(3) ?? '?'}`);
              lines.push(`    │  approachQual=${qb.approachQual?.toFixed(4) ?? '?'}  arrivalMargin=${qb.arrivalMargin?.toFixed(4) ?? '?'}s  pressureLoad=${qb.pressureLoad?.toFixed(3) ?? '?'}`);
              lines.push(`    │  prepFrac1=${qb.prepFrac1?.toFixed(3) ?? '?'}  prepFrac2=${qb.prepFrac2?.toFixed(3) ?? '?'}  prepScore=${qb.prepScore?.toFixed(3) ?? '?'}`);
              lines.push(`    │  skillFactor=${qb.skillFactor?.toFixed(3) ?? '?'} [${qb.skillAttr ?? '?'}]  heightMod=${qb.heightMod?.toFixed(3) ?? '?'} [z=${qb.bz?.toFixed(2) ?? '?'}m]`);
              lines.push(`    │  rawQuality=${qb.rawQuality?.toFixed(4) ?? '?'}  positioning=${qb.positioning?.toFixed(4) ?? '?'}`);
              if ((qb.reflexoNetBoost ?? 0) > 0) lines.push(`    │  reflexoNetBoost=+${qb.reflexoNetBoost?.toFixed(3)}`);
              // Auto-diagnóstico
              if ((qb.final ?? 0) < 0.55) {
                lines.push(`    │  ── DIAGNÓSTICO BAIXA QUALIDADE:`);
                if ((qb.positionCeiling ?? 1) < 0.65) lines.push(`    │    ✗ Teto posição baixo (${qb.positionCeiling?.toFixed(3)}) — jogador muito atrás da baseline`);
                if ((qb.pressureLoad ?? 0) > 0.70)    lines.push(`    │    ✗ Bola difícil (pressureLoad=${qb.pressureLoad?.toFixed(3)}) — vel/profundidade extremas`);
                if ((qb.prepFrac1 ?? 0) < 0.30)       lines.push(`    │    ✗ Prep insuficiente (${(( qb.prepFrac1 ?? 0)*100).toFixed(0)}%) — parado por pouco tempo`);
                if ((qb.arrivalMargin ?? 1) < 0)       lines.push(`    │    ✗ Chegou atrasado (margin=${qb.arrivalMargin?.toFixed(3)}s)`);
              }
              lines.push(`    └────────────────────────────────────────────────────────────────────────────────`);
            } else {
              lines.push(`    Qualidade: ${sh.quality ?? '?'}  (breakdown detalhado não disponível)`);
            }

            if (sh.whyChosen) lines.push(`    Por que escolheu: "${sh.whyChosen}"`);

            // Todos os candidatos considerados
            if (sh.top5?.length) {
              lines.push(`    ┌─ CANDIDATOS AVALIADOS PELA IA ────────────────────────────────────────────────`);
              sh.top5.forEach((c, ci) => {
                const mark = c.isChosen ? '★ ESCOLHIDO' : '○';
                lines.push(
                  `    │  ${mark.padEnd(11)} #${ci + 1}  ${(c.shotType ?? '?').padEnd(12)}` +
                  `  EV=${c.ev.toFixed(4)}  P=${c.prob?.toFixed(3) ?? '?'}` +
                  `  dir=${(c.dir ?? '?').padEnd(5)}  depth=${(c.depth ?? '?').padEnd(5)}  power=${c.power ?? '?'}%` +
                  `  [S=${c.safety ?? '?'} Pres=${c.pressure ?? '?'} Fin=${c.finish ?? '?'} Rhy=${c.rhythm ?? '?'}]` +
                  `${c.tags?.length ? '  [' + c.tags.join(',') + ']' : ''}`
                );
              });
              lines.push(`    └────────────────────────────────────────────────────────────────────────────────`);
            }
          });

          if (pt._inProgress && (!pt.shots || pt.shots.length === 0)) {
            lines.push('  (nenhum golpe registrado ainda neste ponto em andamento)');
          }
        });
      }
    } else {
      lines.push('  [gs.trace não disponível]');
    }
    lines.push('');

    // ══ SEÇÃO 4 — LOG DO JOGO ══════════════════════════════════════════════
    lines.push(sep('═', 100));
    lines.push('  SEÇÃO 4 ── LOG DO JOGO (gs.log — todos os eventos)');
    lines.push(sep('═', 100));
    lines.push('');
    const log = gs?.log ?? [];
    if (log.length === 0) {
      lines.push('  [log vazio]');
    } else {
      log.slice(-120).forEach(l => lines.push(`  ${l}`));
      if (log.length > 120) lines.push(`  ... (${log.length - 120} entradas anteriores omitidas)`);
    }
    lines.push('');

    // ══ SEÇÃO 5 — LOG TÉCNICO ══════════════════════════════════════════════
    lines.push(sep('═', 100));
    lines.push('  SEÇÃO 5 ── LOG TÉCNICO — techLog (ponto a ponto)');
    lines.push(sep('═', 100));
    lines.push('');
    const techLog = gs?.techLog ?? [];
    if (techLog.length === 0) {
      lines.push('  [techLog vazio]');
    } else {
      techLog.slice(-200).forEach(l => lines.push(`  ${l}`));
      if (techLog.length > 200) lines.push(`  ... (${techLog.length - 200} linhas anteriores omitidas)`);
    }
    const ptBuf = gs?._ptBuf ?? [];
    if (ptBuf.length > 0) {
      lines.push('');
      lines.push('  ── Ponto atual em andamento (não flushed ainda):');
      ptBuf.forEach(l => lines.push(`  ${l}`));
    }
    lines.push('');

    // ══ SEÇÃO 6 — SHOT EVENTS (debugEvents) ════════════════════════════════
    lines.push(sep('═', 100));
    lines.push('  SEÇÃO 6 ── SHOT EVENTS — debugEvents (últimos 60)');
    lines.push(sep('═', 100));
    lines.push('');
    lines.push('  Rally | Player         | ShotType        | Spin    | Power   | From X      Y    | To X      Y    | Dir   | Depth | Qual  | TacState       | Press');
    lines.push('  ' + sep('─', 96));
    const devts = gs?.debugEvents ?? [];
    devts.slice(-60).forEach(ev => {
      const pName = gs?.players?.[ev.playerId]?.name ?? `P${ev.playerId}`;
      lines.push(
        `  ${String(ev.rallyBallIndex ?? 0).padStart(5)} | ${pName.padEnd(14)} | ${String(ev.shotType ?? '?').padEnd(15)} | ${String(ev.spin ?? '?').padEnd(7)} | ` +
        `${String(ev.power ?? 0).padStart(6)}km/h | ` +
        `${(ev.fromX ?? 0).toFixed(2).padStart(7)} ${(ev.fromY ?? 0).toFixed(2).padStart(6)} | ` +
        `${(ev.toX ?? 0).toFixed(2).padStart(6)} ${(ev.toY ?? 0).toFixed(2).padStart(6)} | ` +
        `${String(ev.dirLabel ?? '?').padEnd(5)} | ${String(ev.depthBucket ?? '?').padEnd(5)} | ` +
        `${(ev.quality ?? 0).toFixed(3).padStart(5)} | ${String(ev.tacticalState ?? '?').padEnd(14)} | ${ev.underPressure ? 'SIM' : 'não'}`
      );
    });
    lines.push('');

    // ══ SEÇÃO 7 — BOUNCE LOG ════════════════════════════════════════════════
    lines.push(sep('═', 100));
    lines.push('  SEÇÃO 7 ── BOUNCE LOG — quiques registrados (últimos 50)');
    lines.push(sep('═', 100));
    lines.push('');
    const bounceLog = gs?.bounceLog ?? [];
    if (bounceLog.length === 0) {
      lines.push('  [sem quiques registrados]');
    } else {
      bounceLog.slice(-50).forEach((b, i) => {
        lines.push(`  [${String(i + 1).padStart(2)}] X=${b.x?.toFixed(4) ?? '?'}  Y=${b.y?.toFixed(4) ?? '?'}  type=${b.type ?? '?'}  player=${b.player ?? '?'}  shotType=${b.shotType ?? '?'}  z=${b.z?.toFixed(3) ?? '?'}`);
      });
    }
    lines.push('');

    // ══ SEÇÃO 8 — TRAIL DA BOLA ════════════════════════════════════════════
    lines.push(sep('═', 100));
    lines.push('  SEÇÃO 8 ── TRAIL DA BOLA — posições dos frames do frame de referência');
    lines.push(sep('═', 100));
    lines.push('');
    if (curFrame?.trail?.length) {
      curFrame.trail.forEach((t, i) => {
        lines.push(`  [${String(i).padStart(3)}]  X=${t.x?.toFixed(4) ?? '?'}  Y=${t.y?.toFixed(4) ?? '?'}  Z=${t.z?.toFixed(4) ?? '?'}`);
      });
    } else {
      lines.push('  [trail vazio no frame de referência]');
    }
    lines.push('');

    // ══ SEÇÃO 9 — CONFIGURAÇÃO FÍSICA / CONSTANTES RELEVANTES ══════════════
    lines.push(sep('═', 100));
    lines.push('  SEÇÃO 9 ── CONFIGURAÇÃO DO MOTOR — constantes de física e movimento');
    lines.push(sep('═', 100));
    lines.push('');
    if (gs) {
      const p0 = gs.players?.[0];
      lines.push(`  COURT:    halfL=${gs.court?.halfL ?? '?'}m  halfW=${gs.court?.halfW ?? '?'}m  serviceLineY=${gs.court?.serviceLineY ?? '?'}m  netHeight=${gs.court?.netHeight ?? '?'}m`);
      lines.push(`  PHYSICS:  surface=${gs.courtMeta?.surface ?? '?'}  airDensity=${gs.environment?.airDensity ?? '?'}  altitude=${gs.environment?.altitude ?? '?'}m`);
      if (gs.courtPhysics) {
        lines.push(`  COURT PHYSICS:  restitution=${gs.courtPhysics.restitution ?? '?'}  groundFriction=${gs.courtPhysics.groundFriction ?? '?'}`);
      }
      if (p0) {
        lines.push(`  PLAYER SPEED (P0):  ${p0.playerSpeed?.toFixed(3) ?? '?'} m/s base   accel=${p0.playerAccel ?? '?'}  decel=${p0.playerDecel ?? '?'}`);
      }
    }
    lines.push('');

    // ══ Footer ══════════════════════════════════════════════════════════════
    lines.push(sep('═', 100));
    lines.push(`  🐛  DIAGNÓSTICO FORENSE COMPLETO — Frame #${curFrame?.frameIdx ?? '?'} — ${now}`);
    lines.push(`  ${hist.length} frames analisados · ${(gs?.totalPoints ?? 0)} pontos jogados · gs.rally=${gs?.rally ?? '?'}`);
    lines.push(sep('═', 100));

    const txt     = lines.join('\n');
    const frameId = curFrame?.frameIdx ?? 'live';
    triggerTextDownload(txt, `debug-forense-frame-${frameId}.txt`);
  }

  // ── Slider: scrub through history ────────────────────────────────────────
  function handleSlider(e) {
    const idx = parseInt(e.target.value, 10);
    onChangeIdx(idx);
  }

  // Time offset label
  function getTimeOffset(frame) {
    if (!frame || totalFrames === 0) return 'ao vivo';
    const latest = frameHistory[totalFrames - 1];
    const diffMs = latest.ts - frame.ts;
    if (diffMs < 500) return 'ao vivo';
    return `-${(diffMs / 1000).toFixed(1)}s`;
  }

  const ball = currentFrame?.ball;
  const speedKmh = currentFrame?.ballSpeed || 0;
  const dirDeg = ball ? (((Math.atan2(ball.vel.y, ball.vel.x) * 180 / Math.PI) + 360) % 360).toFixed(1) : '—';

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ position:'fixed', inset:0, zIndex:2000, pointerEvents:'none' }}>
      {/* Scanline effect to signal paused mode */}
      <div style={{ position:'absolute', inset:0, backgroundImage:'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(255,68,68,0.03) 3px, rgba(255,68,68,0.03) 4px)', pointerEvents:'none' }} />
      {/* Red corner border */}
      <div style={{ position:'absolute', inset:0, boxShadow:'inset 0 0 60px rgba(255,68,68,0.18)', pointerEvents:'none', border:'2px solid rgba(255,68,68,0.5)', animation:'bugPulse 1.5s ease-in-out infinite' }} />

      {/* Main Bug Panel — bottom overlay */}
      <div style={{ position:'absolute', bottom:0, left:0, right:0, pointerEvents:'auto', background:'rgba(8,4,4,0.95)', borderTop:'2px solid #FF4444', boxShadow:'0 -8px 40px rgba(255,68,68,0.3)' }}>

        {/* Toggle expand handle */}
        <div
          onClick={() => setExpanded(e => !e)}
          style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 20px', cursor:'pointer', borderBottom:'1px solid rgba(255,68,68,0.2)' }}
        >
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <span style={{ fontFamily:"'Space Mono',monospace", fontSize:10, fontWeight:700, letterSpacing:4, color:'#FF4444', textTransform:'uppercase' }}>🐛 Modo Caça Bug</span>
            <span style={{ fontFamily:"'Space Mono',monospace", fontSize:9, color:'rgba(255,255,255,0.4)', letterSpacing:2 }}>● PAUSADO</span>
            {currentFrame && (
              <>
                <span style={{ fontFamily:"'Space Mono',monospace", fontSize:9, color:'rgba(255,255,255,0.3)', letterSpacing:1 }}>·</span>
                <span style={{ fontFamily:"'Space Mono',monospace", fontSize:9, color:'rgba(255,100,100,0.8)', letterSpacing:2 }}>Frame #{currentFrame.frameIdx}</span>
                <span style={{ fontFamily:"'Space Mono',monospace", fontSize:9, color:'rgba(255,255,255,0.3)' }}>·</span>
                <span style={{ fontFamily:"'Space Mono',monospace", fontSize:9, color:'rgba(255,255,255,0.5)' }}>{getTimeOffset(currentFrame)}</span>
              </>
            )}
          </div>
          <div style={{ display:'flex', gap:10, alignItems:'center' }}>
            <button
              onClick={(e) => { e.stopPropagation(); captureScreen(); }}
              style={{ fontFamily:"'Space Mono',monospace", fontSize:9, fontWeight:700, letterSpacing:2, color:'#A8C832', padding:'4px 14px', border:'1px solid rgba(168,200,50,0.5)', background:'rgba(168,200,50,0.1)', cursor:'pointer', textTransform:'uppercase' }}
            >📸 Capturar Screen</button>
            <button
              onClick={(e) => { e.stopPropagation(); generateDebugReport(); }}
              style={{ fontFamily:"'Space Mono',monospace", fontSize:9, fontWeight:700, letterSpacing:2, color:'#00D4FF', padding:'4px 14px', border:'1px solid rgba(0,212,255,0.5)', background:'rgba(0,212,255,0.08)', cursor:'pointer', textTransform:'uppercase' }}
            >📄 Debug Completo</button>
            <button
              onClick={(e) => { e.stopPropagation(); generateRatingHealthDebug(); }}
              style={{ fontFamily:"'Space Mono',monospace", fontSize:9, fontWeight:700, letterSpacing:2, color:'#A8FF60', padding:'4px 14px', border:'1px solid rgba(168,255,96,0.5)', background:'rgba(168,255,96,0.08)', cursor:'pointer', textTransform:'uppercase' }}
            >💊 Rating &amp; Health</button>
            <button
              onClick={(e) => { e.stopPropagation(); onClose(); }}
              style={{ fontFamily:"'Space Mono',monospace", fontSize:9, fontWeight:700, letterSpacing:2, color:'#FF4444', padding:'4px 14px', border:'1px solid rgba(255,68,68,0.5)', background:'rgba(255,68,68,0.1)', cursor:'pointer', textTransform:'uppercase' }}
            >✕ Fechar</button>
            <span style={{ fontFamily:"'Space Mono',monospace", fontSize:14, color:'rgba(255,255,255,0.3)', userSelect:'none' }}>{expanded ? '▼' : '▲'}</span>
          </div>
        </div>

        {expanded && (
          <div style={{ padding:'14px 20px 16px', display:'flex', flexDirection:'column', gap:14 }}>

            {/* Timeline slider */}
            {totalFrames > 1 && (
              <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <span style={{ fontFamily:"'Space Mono',monospace", fontSize:9, letterSpacing:3, color:'rgba(255,68,68,0.8)', textTransform:'uppercase' }}>◀ Timeline</span>
                  <span style={{ fontFamily:"'Space Mono',monospace", fontSize:9, color:'rgba(255,255,255,0.4)' }}>
                    {getTimeOffset(frameHistory[0])} ←→ ao vivo · {totalFrames} frames
                  </span>
                </div>
                <div style={{ position:'relative', height:28, display:'flex', alignItems:'center' }}>
                  {/* Track */}
                  <div style={{ position:'absolute', left:0, right:0, height:4, background:'rgba(255,255,255,0.1)', borderRadius:2 }}>
                    <div style={{ position:'absolute', left:0, width:`${rewindIdx !== null ? (rewindIdx / (totalFrames - 1)) * 100 : 100}%`, height:'100%', background:'linear-gradient(90deg,#FF4444,#FF8844)', borderRadius:2 }} />
                  </div>
                  <input
                    type='range' min={0} max={totalFrames - 1}
                    value={rewindIdx ?? totalFrames - 1}
                    onChange={handleSlider}
                    style={{ position:'relative', width:'100%', appearance:'none', WebkitAppearance:'none', background:'transparent', cursor:'pointer', height:28, accentColor:'#FF4444' }}
                  />
                </div>
                {/* Frame ticks every ~60 frames */}
                <div style={{ display:'flex', justifyContent:'space-between' }}>
                  {Array.from({ length: Math.min(10, totalFrames) }, (_, i) => {
                    const idx = Math.round((i / 9) * (totalFrames - 1));
                    const f = frameHistory[idx];
                    return (
                      <span key={i} style={{ fontFamily:"'Space Mono',monospace", fontSize:7, color:'rgba(255,255,255,0.25)', letterSpacing:1 }}>
                        {f ? getTimeOffset(f) : ''}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Live data readout */}
            {currentFrame && ball && (
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:16 }}>

                {/* Ball position */}
                <div style={{ background:'rgba(255,68,68,0.06)', border:'1px solid rgba(255,68,68,0.2)', padding:'10px 14px' }}>
                  <div style={{ fontFamily:"'Space Mono',monospace", fontSize:8, letterSpacing:3, color:'#FF6666', textTransform:'uppercase', marginBottom:8 }}>🎾 Posição Bola</div>
                  {[['X (lateral)', ball.pos.x.toFixed(3), 'm'], ['Y (profund.)', ball.pos.y.toFixed(3), 'm'], ['Z (altura)', ball.pos.z.toFixed(3), 'm']].map(([l,v,u]) => (
                    <div key={l} style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
                      <span style={{ fontFamily:"'Space Mono',monospace", fontSize:9, color:'rgba(255,255,255,0.4)' }}>{l}</span>
                      <span style={{ fontFamily:"'Space Mono',monospace", fontSize:9, fontWeight:700, color:'#FFFFFF' }}>{v}<span style={{ color:'rgba(255,255,255,0.3)', marginLeft:2 }}>{u}</span></span>
                    </div>
                  ))}
                </div>

                {/* Ball velocity & direction */}
                <div style={{ background:'rgba(255,136,68,0.06)', border:'1px solid rgba(255,136,68,0.2)', padding:'10px 14px' }}>
                  <div style={{ fontFamily:"'Space Mono',monospace", fontSize:8, letterSpacing:3, color:'#FF8844', textTransform:'uppercase', marginBottom:8 }}>⚡ Velocidade / Dir</div>
                  {[['vx', ball.vel.x.toFixed(3), 'm/s'], ['vy', ball.vel.y.toFixed(3), 'm/s'], ['vz', (ball.vel.z||0).toFixed(3), 'm/s'], ['Speed', speedKmh, 'km/h'], ['Direção', dirDeg, '°']].map(([l,v,u]) => (
                    <div key={l} style={{ display:'flex', justifyContent:'space-between', marginBottom:2 }}>
                      <span style={{ fontFamily:"'Space Mono',monospace", fontSize:9, color:'rgba(255,255,255,0.4)' }}>{l}</span>
                      <span style={{ fontFamily:"'Space Mono',monospace", fontSize:9, fontWeight:700, color:'#FFB084' }}>{v}<span style={{ color:'rgba(255,255,255,0.3)', marginLeft:2 }}>{u}</span></span>
                    </div>
                  ))}
                </div>

                {/* Ball state */}
                <div style={{ background:'rgba(168,200,50,0.06)', border:'1px solid rgba(168,200,50,0.2)', padding:'10px 14px' }}>
                  <div style={{ fontFamily:"'Space Mono',monospace", fontSize:8, letterSpacing:3, color:'#A8C832', textTransform:'uppercase', marginBottom:8 }}>📊 Estado Bola</div>
                  {[['Em voo', ball.inFlight ? '✓ SIM' : '✗ NÃO', ''], ['Bounces', ball.bounceCount ?? 0, ''], ['Spin', Number(ball.spin ?? 0).toFixed(3), ''], ['Último hit', ball.lastHitBy ?? '—', ''], ['Rally', currentFrame.rally, '']].map(([l,v,u]) => (
                    <div key={l} style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
                      <span style={{ fontFamily:"'Space Mono',monospace", fontSize:9, color:'rgba(255,255,255,0.4)' }}>{l}</span>
                      <span style={{ fontFamily:"'Space Mono',monospace", fontSize:9, fontWeight:700, color: String(v).startsWith('✓') ? '#A8C832' : String(v).startsWith('✗') ? '#FF4444' : '#FFFFFF' }}>{String(v)}</span>
                    </div>
                  ))}
                </div>

                {/* Players */}
                <div style={{ background:'rgba(122,180,255,0.06)', border:'1px solid rgba(122,180,255,0.2)', padding:'10px 14px' }}>
                  <div style={{ fontFamily:"'Space Mono',monospace", fontSize:8, letterSpacing:3, color:'#7ab4ff', textTransform:'uppercase', marginBottom:8 }}>👤 Jogadores</div>
                  {(currentFrame.players || []).map((p, i) => {
                    const spd = Math.hypot(p.vel?.x||0, p.vel?.y||0);
                    return (
                      <div key={i} style={{ marginBottom:6 }}>
                        <div style={{ fontFamily:"'Space Mono',monospace", fontSize:8, fontWeight:700, color: p.color || '#FFFFFF', marginBottom:2 }}>{p.name || 'P'+(i+1)}</div>
                        <div style={{ fontFamily:"'Space Mono',monospace", fontSize:8, color:'rgba(255,255,255,0.5)' }}>X={p.pos.x.toFixed(2)}m Y={p.pos.y.toFixed(2)}m</div>
                        <div style={{ fontFamily:"'Space Mono',monospace", fontSize:8, color:'rgba(255,255,255,0.4)' }}>|v|={spd.toFixed(2)}m/s</div>
                      </div>
                    );
                  })}
                </div>

              </div>
            )}

          </div>
        )}
      </div>
    </div>
  );
}

// ── HeatPill ──────────────────────────────────────────────────────────────────
function HeatPill({ heat }) {
  if (!heat) return null;
  const { score, peak, tier } = readHeat({ heat });
  const barW = `${score}%`;

  return (
    <div style={{
      marginLeft: 14,
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '4px 12px 4px 10px',
      border: `1px solid ${tier.color}44`,
      borderLeft: `3px solid ${tier.color}`,
      background: `${tier.color}0D`,
      clipPath: 'polygon(0 0,100% 0,calc(100% - 5px) 100%,0 100%)',
      boxShadow: tier.glow ? `0 0 14px ${tier.glow}` : 'none',
      animation: tier.pulse ? 'pulse 1.1s ease-in-out infinite' : 'none',
      minWidth: 110,
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* fill bar background */}
      <div style={{
        position: 'absolute', inset: 0, left: 0, top: 0,
        width: barW,
        background: `linear-gradient(90deg, ${tier.color}18, transparent)`,
        transition: 'width 0.8s ease',
        pointerEvents: 'none',
      }} />

      {/* icon */}
      <span style={{ fontSize: 11, flexShrink: 0, position: 'relative' }}>🌡</span>

      {/* score */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 1, position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
          <span style={{
            fontFamily: RG.display, fontSize: 18, fontWeight: 900, lineHeight: 1,
            color: tier.color,
            textShadow: tier.glow ? `0 0 10px ${tier.glow}` : 'none',
          }}>{score}</span>
          <span style={{ fontFamily: RG.mono, fontSize: 7, color: `${tier.color}88`, letterSpacing: 1 }}>/ 100</span>
        </div>
        <span style={{
          fontFamily: RG.mono, fontSize: 7, letterSpacing: 3,
          color: `${tier.color}BB`, textTransform: 'uppercase', lineHeight: 1,
        }}>{tier.label}</span>
      </div>
    </div>
  );
}

// ── SituationPill ─────────────────────────────────────────────────────────────
function SituationPill({ gs }) {
  const p0=gs.players?.[0], p1=gs.players?.[1];
  if(!p0||!p1) return null;
  const sv=gs.server, rec=1-sv;
  const srvS=gs.players[sv]?.score??0, recS=gs.players[rec]?.score??0;
  const isBP = recS >= 3 && recS >= srvS;
  const setsNeeded = 2;
  const isMP = (p0.sets === setsNeeded - 1 || p1.sets === setsNeeded - 1) &&
               (p0.games >= 5 || p1.games >= 5) &&
               Math.abs(p0.games - p1.games) >= 1;
  const leader = p0.games > p1.games ? p0 : p1;
  const trailer = p0.games > p1.games ? p1 : p0;
  const isSP = !isMP && leader.games >= 5 && (leader.games - trailer.games) >= 1 &&
               !(leader.games >= 6 && trailer.games >= 6);
  const rally = gs.rally ?? 0;
  const isLong = rally >= 10;

  // Quem está pressionando no BP
  const bpPlayer = isBP ? gs.players[rec] : null;

  if (isMP) {
    const mpPlayer = p0.sets === setsNeeded - 1 ? p0 : p1;
    return (
      <div style={{ marginLeft:16, display:'flex', alignItems:'center', gap:0 }}>
        <div style={{
          display:'flex', alignItems:'center', gap:10,
          background:'linear-gradient(90deg,rgba(255,215,0,0.18),rgba(255,215,0,0.06))',
          border:'1px solid rgba(255,215,0,0.55)',
          borderLeft:'3px solid #FFD700',
          padding:'5px 16px 5px 12px',
          animation:'matchPointPulse 0.7s ease-in-out infinite',
          boxShadow:'0 0 24px rgba(255,215,0,0.35), inset 0 0 20px rgba(255,215,0,0.06)',
          clipPath:'polygon(0 0,100% 0,calc(100%-6px) 100%,0 100%)',
        }}>
          <span style={{ fontSize:14 }}>👑</span>
          <div>
            <div style={{ fontFamily:RG.display, fontSize:11, fontWeight:900, letterSpacing:4,
              color:'#FFD700', textTransform:'uppercase', lineHeight:1 }}>MATCH POINT</div>
            <div style={{ fontFamily:RG.mono, fontSize:7, letterSpacing:3,
              color:'rgba(255,215,0,0.6)', marginTop:2 }}>{(mpPlayer.name||'').split(' ').pop().toUpperCase()}</div>
          </div>
        </div>
      </div>
    );
  }

  if (isBP) {
    return (
      <div style={{ marginLeft:16, display:'flex', alignItems:'center' }}>
        <div style={{
          display:'flex', alignItems:'center', gap:8,
          background:'rgba(255,50,30,0.12)',
          border:'1px solid rgba(255,80,53,0.4)',
          borderLeft:'3px solid #FF5035',
          padding:'4px 14px 4px 10px',
          animation:'pulse 0.9s infinite',
          boxShadow:'0 0 16px rgba(255,50,30,0.3)',
          clipPath:'polygon(0 0,100% 0,calc(100%-5px) 100%,0 100%)',
        }}>
          <span style={{ fontSize:12 }}>⚡</span>
          <div>
            <div style={{ fontFamily:RG.display, fontSize:11, fontWeight:800, letterSpacing:4,
              color:'#FF6045', textTransform:'uppercase', lineHeight:1 }}>BREAK POINT</div>
            {bpPlayer && <div style={{ fontFamily:RG.mono, fontSize:7, letterSpacing:2,
              color:'rgba(255,80,53,0.65)', marginTop:2 }}>{(bpPlayer.name||'').split(' ').pop().toUpperCase()}</div>}
          </div>
        </div>
      </div>
    );
  }

  if (isSP) {
    return (
      <div style={{ marginLeft:16 }}>
        <div style={{
          display:'flex', alignItems:'center', gap:8,
          background:'rgba(0,200,255,0.08)',
          border:'1px solid rgba(0,212,255,0.3)',
          borderLeft:'3px solid #00D4FF',
          padding:'4px 14px 4px 10px',
          animation:'pulse 1.2s infinite',
          boxShadow:'0 0 14px rgba(0,200,255,0.2)',
          clipPath:'polygon(0 0,100% 0,calc(100%-5px) 100%,0 100%)',
        }}>
          <span style={{ fontSize:11 }}>🎾</span>
          <div style={{ fontFamily:RG.display, fontSize:11, fontWeight:800, letterSpacing:4,
            color:'#00D4FF', textTransform:'uppercase', lineHeight:1 }}>SET POINT</div>
        </div>
      </div>
    );
  }

  if (isLong) {
    return (
      <div style={{ marginLeft:16 }}>
        <div style={{
          display:'flex', alignItems:'center', gap:6,
          background:'rgba(0,200,255,0.06)',
          border:'1px solid rgba(0,200,255,0.2)',
          padding:'3px 10px',
        }}>
          <span style={{ fontFamily:RG.mono, fontSize:9, fontWeight:700, letterSpacing:2,
            color:'rgba(0,200,255,0.8)' }}>{rally}</span>
          <span style={{ fontFamily:RG.mono, fontSize:7, letterSpacing:2,
            color:'rgba(0,200,255,0.45)', textTransform:'uppercase' }}>golpes</span>
        </div>
      </div>
    );
  }

  return null;
}

// ── Signature shot label map ──────────────────────────────────────────────────
const SIG_LABELS = {
  INSIDE_OUT_FH:  'Inside-Out FH',
  SLICE_BH:       'Slice BH',
  BIG_SERVE:      'Big Serve',
  BANANA_BH:      'Banana BH',
  TOPSPIN_CROSS:  'Topspin Cross',
  DROP_SHOT:      'Drop Shot',
  DTL_BH:         'DTL BH',
  VOLLEY_FINISH:  'Volley Finish',
  FLAT_WINNER:    'Flat Winner',
  SHORT_ANGLE_FH: 'Short Angle FH',
};

// ── Attribute display names ───────────────────────────────────────────────────
const ATTR_LABELS = {
  velocidade:'Velocidade', explosividade:'Explosividade', agilidadeLateral:'Agilidade Lat.',
  resistencia:'Resistência', alcance:'Alcance', fhPotencia:'FH Potência',
  bhPotencia:'BH Potência', consistencia:'Consistência', topspin:'Topspin',
  slice:'Slice', srv1Vel:'Saque Vel.', srv1Prec:'Saque Prec.', srv2Efeito:'Saque Efeito',
  dropShot:'Drop Shot', lobDef:'Lob Def', lobAtk:'Lob Atk', smash:'Smash',
  passing:'Passing', volley:'Volley', instintoRede:'Inst. Rede', reflexo:'Reflexo',
  coberturaLob:'Cob. Lob', mentalidade:'Mentalidade', recuperacao:'Recuperação',
  paciencia:'Paciência', agresDecisoria:'Agres. Decis.', leituraDeJogo:'Leitura',
};

// ── HeatmapMiniCourt ─────────────────────────────────────────────────────────
// Renders a mini tennis court (player's half) with a position heatmap overlay.
// Props: heatGrid (Uint16Array 12×16), playerSide (1 or -1), surfColor
//
// Grid layout:
//   ROWS = 16 — depth axis: row 0 = net, row 15 = baseline
//   COLS = 12 — lateral axis: col 0 = left sideline, col 11 = right sideline
//
function HeatmapMiniCourt({ heatGrid, playerSide, surfColor }) {
  const canvasRef = React.useRef(null);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !heatGrid) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    const COLS = 12, ROWS = 16;
    const PAD = { l: 6, r: 6, t: 6, b: 14 }; // b: room for baseline label
    const cW = W - PAD.l - PAD.r;
    const cH = H - PAD.t - PAD.b;
    const cX = PAD.l, cY = PAD.t;

    ctx.clearRect(0, 0, W, H);

    // ── Court background ─────────────────────────────────────────────────────
    const sc = surfColor || '#1e4f96';
    const surfBg = ctx.createLinearGradient(cX, cY, cX, cY + cH);
    surfBg.addColorStop(0,   sc + 'cc');
    surfBg.addColorStop(0.5, sc + 'ee');
    surfBg.addColorStop(1,   sc + '99');
    ctx.fillStyle = surfBg;
    ctx.fillRect(cX, cY, cW, cH);

    // ── Heatmap cells ────────────────────────────────────────────────────────
    // Find max for normalization
    let maxVal = 1;
    for (let i = 0; i < heatGrid.length; i++) if (heatGrid[i] > maxVal) maxVal = heatGrid[i];

    const cellW = cW / COLS;
    const cellH = cH / ROWS;

    for (let row = 0; row < ROWS; row++) {
      // Row 0 = net side, row 15 = baseline
      // playerSide > 0: their half has Y > 0, row 0 = net (Y≈0), row 15 = baseline (Y≈halfL)
      // We always render net at top of the mini-court
      const drawRow = row; // net=top
      for (let col = 0; col < COLS; col++) {
        const v = heatGrid[row * COLS + col] / maxVal; // 0..1
        if (v < 0.01) continue;

        const px = cX + col * cellW;
        const py = cY + drawRow * cellH;

        // Heat color: cold (blue-green) → warm (yellow) → hot (red-orange)
        // using a 4-stop gradient sampled per cell
        let r, g, b;
        if (v < 0.25) {
          // transparent → cyan-blue
          const t = v / 0.25;
          r = Math.round(lerp(0, 0, t));
          g = Math.round(lerp(0, 180, t));
          b = Math.round(lerp(255, 255, t));
        } else if (v < 0.55) {
          // cyan → lime-yellow
          const t = (v - 0.25) / 0.30;
          r = Math.round(lerp(0, 200, t));
          g = Math.round(lerp(180, 255, t));
          b = Math.round(lerp(255, 0, t));
        } else if (v < 0.80) {
          // yellow → orange
          const t = (v - 0.55) / 0.25;
          r = Math.round(lerp(200, 255, t));
          g = Math.round(lerp(255, 120, t));
          b = 0;
        } else {
          // orange → red-white core
          const t = (v - 0.80) / 0.20;
          r = 255;
          g = Math.round(lerp(120, 255, t * 0.4));
          b = Math.round(lerp(0, 200, t * 0.5));
        }

        const alpha = 0.15 + v * 0.72;
        ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`;
        ctx.fillRect(px + 0.5, py + 0.5, cellW - 1, cellH - 1);
      }
    }

    // ── Gaussian blur effect: draw again with blur for smooth look ────────────
    // Simple approach: draw a slightly larger, blurred pass per hot cell
    ctx.save();
    ctx.filter = 'blur(3px)';
    ctx.globalAlpha = 0.35;
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const v = heatGrid[row * COLS + col] / maxVal;
        if (v < 0.30) continue;
        let r, g, b;
        if (v < 0.55) { r = 200; g = 255; b = 0; }
        else if (v < 0.80) { r = 255; g = 160; b = 0; }
        else { r = 255; g = 80; b = 0; }
        ctx.fillStyle = `rgba(${r},${g},${b},${v * 0.6})`;
        ctx.fillRect(cX + col * cellW - 1, cY + row * cellH - 1, cellW + 2, cellH + 2);
      }
    }
    ctx.filter = 'none';
    ctx.globalAlpha = 1;
    ctx.restore();

    // ── Court lines ─────────────────────────────────────────────────────────
    ctx.strokeStyle = 'rgba(255,255,255,0.80)';
    ctx.lineWidth = 1;

    // Outer boundary (the half-court rectangle)
    ctx.strokeRect(cX + 0.5, cY + 0.5, cW - 1, cH - 1);

    // Net line (top edge of the half-court)
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(cX, cY + 1.5); ctx.lineTo(cX + cW, cY + 1.5); ctx.stroke();

    // Service line (~6.4m from net, out of 11.885m total = 53.8% depth)
    const srvLineY = cY + cH * (6.4 / 11.885);
    ctx.strokeStyle = 'rgba(255,255,255,0.60)';
    ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(cX, srvLineY); ctx.lineTo(cX + cW, srvLineY); ctx.stroke();

    // Centre service line (vertical, only between net and service line)
    ctx.beginPath(); ctx.moveTo(cX + cW / 2, cY); ctx.lineTo(cX + cW / 2, srvLineY); ctx.stroke();

    // Sideline reduction: singles width = 8.23m / total width 10.97m ≈ 75%
    // We're showing singles court only, so just draw the half-court within singles
    // Centre mark at baseline
    ctx.strokeStyle = 'rgba(255,255,255,0.50)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cX + cW / 2 - 3, cY + cH - 0.5);
    ctx.lineTo(cX + cW / 2 + 3, cY + cH - 0.5);
    ctx.stroke();

    // ── Net tape glow ────────────────────────────────────────────────────────
    const netGlow = ctx.createLinearGradient(cX, cY, cX + cW, cY);
    netGlow.addColorStop(0,   'rgba(255,255,255,0)');
    netGlow.addColorStop(0.5, 'rgba(255,255,255,0.55)');
    netGlow.addColorStop(1,   'rgba(255,255,255,0)');
    ctx.fillStyle = netGlow;
    ctx.fillRect(cX, cY, cW, 2.5);

    // ── Label: NET / BASELINE ────────────────────────────────────────────────
    ctx.fillStyle = 'rgba(255,255,255,0.32)';
    ctx.font = `500 7px 'Space Mono', monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('NET', cX + cW / 2, cY + 3);
    ctx.textBaseline = 'bottom';
    ctx.fillText('BASELINE', cX + cW / 2, cY + cH - 2);

    // ── "No data" state ──────────────────────────────────────────────────────
    if (maxVal <= 1) {
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      ctx.font = `600 8px 'Space Mono', monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('aguardando dados…', cX + cW / 2, cY + cH / 2);
    }

  }, [heatGrid, surfColor]);

  return (
    <canvas
      ref={canvasRef}
      width={196}
      height={130}
      style={{ display: 'block', width: '100%', height: 'auto', imageRendering: 'pixelated' }}
    />
  );
}

// ── SidePanel ─────────────────────────────────────────────────────────────────
function SidePanel({ p, isServer, playerImages, surfColor, lastShot, side }) {
  const mom  = p.ctx?.momentum ?? 0.5;
  const stam = p.stamina ?? 1.0;
  const namedData = p.namedPlayerKey ? NAMED_PLAYERS[p.namedPlayerKey] : null;
  const nat  = namedData?.nationality || (p.styleData?.abbr || '');
  const sc   = surfColor || RG.clay;

  const pKey    = (p.name || '').split(' ').pop().toUpperCase();
  const portrait = playerImages?.[pKey] || playerImages?.[p.name?.toUpperCase()];
  const hasPortrait = portrait && portrait.complete && portrait.naturalWidth > 0;

  const momColor  = mom  > 0.65 ? '#60FF90' : mom  > 0.38 ? '#FFD700' : '#FF5050';
  const stamColor = stam > 0.60 ? '#60FF90' : stam > 0.32 ? '#FFD700' : '#FF5050';

  // Prefs — usa campo baked ou gera do zero
  const prefs = p.prefs ?? (p.attrs ? generatePrefs(p.attrs) : null);
  const bs = prefs ? getBuildStyleMeta(prefs.buildStyle)   : null;
  const rc = prefs ? getRallyCadenceMeta(prefs.rallyCadence) : null;
  const rp = prefs ? getRiskProfileMeta(prefs.riskProfile) : null;
  const ng = prefs ? getNetGameMeta(prefs.netGame)         : null;

  // Signature shots
  const sigIds = p.signatureShots ?? (p.naturalSignature ? [p.naturalSignature] : []);
  const sig1 = sigIds[0] ? NEW_SIG_SHOTS[sigIds[0]] : null;
  const sig2 = sigIds[1] ? NEW_SIG_SHOTS[sigIds[1]] : null;

  // Rating grade
  const ovr = p.attrs ? (p.attrs.fhPotencia !== undefined
    ? Object.values(p.attrs).filter(v => typeof v === 'number').reduce((a,b)=>a+b,0) /
      Object.values(p.attrs).filter(v => typeof v === 'number').length
    : 65) : 65;
  const grade = ovrTier(Math.round(ovr));

  const isLeft = side === 'left';

  return (
    <div style={{
      display:'flex', flexDirection:'column', height:'100%', overflow:'hidden',
      background: RG.bgPanel,
      fontFamily: RG.mono,
    }}>

      {/* ── HEADER: foto + nome + nacionalidade ── */}
      <div style={{
        position:'relative', overflow:'hidden',
        background:`linear-gradient(180deg, ${sc}18 0%, transparent 100%)`,
        borderBottom:`1px solid ${RG.border}`,
        padding:'10px 12px 8px',
        display:'flex', alignItems:'center', gap:10,
        flexShrink:0,
      }}>
        {/* Foto / avatar */}
        <div style={{
          width:44, height:44, borderRadius:2, flexShrink:0, overflow:'hidden',
          border:`1.5px solid ${sc}55`, background:'rgba(0,0,0,.4)',
        }}>
          {hasPortrait
            ? <img src={portrait.src} style={{ width:'100%', height:'100%', objectFit:'cover' }} alt="" />
            : <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center',
                fontFamily:RG.display, fontSize:18, fontWeight:900, color:sc }}>
                {(p.name||'?').charAt(0)}
              </div>
          }
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontFamily:RG.display, fontSize:13, fontWeight:900, color:RG.white,
            letterSpacing:1, textTransform:'uppercase', lineHeight:1,
            whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
            {p.name}
          </div>
          <div style={{ fontFamily:RG.mono, fontSize:7, letterSpacing:4,
            color:`${sc}CC`, marginTop:3, textTransform:'uppercase' }}>
            {nat}
          </div>
        </div>
        {/* Grade de nível */}
        <div style={{ textAlign:'center', flexShrink:0 }}>
          <div style={{ fontFamily:RG.display, fontSize:22, fontWeight:900,
            color:grade.color, lineHeight:1 }}>{grade.grade}</div>
          <div style={{ fontFamily:RG.mono, fontSize:5, letterSpacing:2,
            color:`${grade.color}88`, textTransform:'uppercase', marginTop:1 }}>NÍVEL</div>
        </div>
      </div>

      {/* ── SCORE ── */}
      <div style={{
        padding:'7px 12px', borderBottom:`1px solid ${RG.border}`,
        background:'rgba(0,0,0,0.3)', flexShrink:0,
      }}>
        <div style={{ display:'flex', gap:4 }}>
          {[
            { lbl:'SETS',   val: p.sets  ?? 0, accent: true },
            { lbl:'GAMES',  val: p.games ?? 0, accent: false },
            { lbl:'PONTOS', val: ['0','15','30','40','Ad'][Math.min(p.score ?? 0, 4)], accent: false },
          ].map(({ lbl, val, accent }) => (
            <div key={lbl} style={{
              flex:1, display:'flex', flexDirection:'column', alignItems:'center',
              padding:'5px 4px',
              background: accent ? `${sc}18` : 'rgba(255,255,255,.03)',
              border:`1px solid ${accent ? `${sc}44` : RG.border}`,
            }}>
              <div style={{ fontFamily:RG.mono, fontSize:6, letterSpacing:3,
                color: accent ? `${sc}99` : RG.textFaint,
                textTransform:'uppercase', marginBottom:2 }}>{lbl}</div>
              <div style={{ fontFamily:RG.display, fontSize:20, fontWeight:900,
                lineHeight:1, color: accent ? sc : RG.white }}>{val}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── MOMENTO + STAMINA ── */}
      <div style={{ padding:'10px 14px 8px', borderBottom:`1px solid ${RG.border}`, flexShrink:0 }}>
        {[
          { lbl:'MOMENTO', val:mom,  color:momColor,  fill:`linear-gradient(90deg,${momColor}88,${momColor})` },
          { lbl:'STAMINA', val:stam, color:stamColor, fill:`linear-gradient(90deg,${stamColor}88,${stamColor})` },
        ].map(({ lbl, val, color, fill }) => (
          <div key={lbl} style={{ marginBottom:8 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:3 }}>
              <span style={{ fontSize:6, letterSpacing:3, color:RG.textFaint, textTransform:'uppercase' }}>{lbl}</span>
              <span style={{ fontFamily:RG.display, fontSize:12, fontWeight:800, color, lineHeight:1 }}>
                {Math.round(val * 100)}
              </span>
            </div>
            <div style={{ height:3, background:'rgba(255,255,255,.05)', overflow:'hidden' }}>
              <div style={{ height:'100%', width:`${Math.round(val*100)}%`, background:fill,
                transition:'width .5s cubic-bezier(.4,0,.2,1)', boxShadow:`0 0 6px ${color}88` }}/>
            </div>
          </div>
        ))}
      </div>

      {/* ── SIGNATURE SHOTS ── */}
      {(sig1 || sig2) && (
        <div style={{ padding:'9px 12px', borderBottom:`1px solid ${RG.border}`, flexShrink:0 }}>
          <div style={{ fontSize:5, letterSpacing:3, color:RG.textFaint, textTransform:'uppercase', marginBottom:6 }}>GOLPE ASSINATURA</div>
          <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
            {[sig1, sig2].filter(Boolean).map((sig, i) => (
              <div key={i} style={{
                display:'flex', alignItems:'center', gap:7,
                background:'rgba(255,215,0,.05)', border:'1px solid rgba(255,215,0,.18)',
                borderLeft:'3px solid #FFD700', padding:'5px 8px',
              }}>
                <span style={{ fontSize:14 }}>{sig.emoji}</span>
                <span style={{ fontFamily:RG.display, fontSize:11, fontWeight:800,
                  color:'#FFD700', letterSpacing:1, textTransform:'uppercase' }}>{sig.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── PREFS CHIPS ── */}
      {prefs && (
        <div style={{ padding:'9px 12px', borderBottom:`1px solid ${RG.border}`, flexShrink:0 }}>
          <div style={{ fontSize:5, letterSpacing:3, color:RG.textFaint, textTransform:'uppercase', marginBottom:6 }}>ESTILO DE JOGO</div>
          <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
            {[
              { meta:bs, color:sc,        label:'CONSTRUÇÃO' },
              { meta:rc, color:'#FFB74D', label:'CADÊNCIA' },
              { meta:rp, color:'#FF7043', label:'RISCO' },
              { meta:ng, color:'#26C6DA', label:'REDE' },
            ].filter(r => r.meta).map(({ meta, color, label }) => (
              <div key={label} style={{ display:'flex', alignItems:'center', gap:6 }}>
                <span style={{ fontSize:5, letterSpacing:2, color:`${color}77`,
                  textTransform:'uppercase', width:46, flexShrink:0 }}>{label}</span>
                <div style={{ flex:1, display:'flex', alignItems:'center', gap:5,
                  background:`${color}08`, borderLeft:`2px solid ${color}55`, padding:'3px 7px' }}>
                  <span style={{ fontSize:10 }}>{meta.icon}</span>
                  <span style={{ fontFamily:RG.display, fontSize:10, fontWeight:700,
                    color, textTransform:'uppercase', letterSpacing:.5, lineHeight:1 }}>{meta.label}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── ÚLTIMO GOLPE ── */}
      {lastShot && (() => {
        const SHOT_META_LOCAL = {
          TOPSPIN:  { label:'TOPSPIN',  emoji:'🌀', color:'#FF8C42' },
          SLICE:    { label:'SLICE',    emoji:'🌊', color:'#60CFFF' },
          FLAT:     { label:'FLAT',     emoji:'💥', color:'#FFD700' },
          ACCEL:    { label:'WINNER',   emoji:'⚡', color:'#60FF90' },
          LOB_ATK:  { label:'LOB',      emoji:'🌈', color:'#AA80FF' },
          LOB_DEF:  { label:'LOB',      emoji:'☁️', color:'#7ab4ff' },
          DROP:     { label:'DROP',     emoji:'🪶', color:'#FFB74D' },
          SERVE:    { label:'SAQUE',    emoji:'💥', color:sc },
          PASSING:  { label:'PASSING',  emoji:'🏹', color:'#60FF90' },
          VOLLEY:   { label:'VOLLEY',   emoji:'🥊', color:'#26C6DA' },
          SMASH:    { label:'SMASH',    emoji:'🔥', color:'#FF5050' },
        };
        const meta = SHOT_META_LOCAL[lastShot.type] ?? { label:lastShot.type, emoji:'🎾', color:sc };
        return (
          <div style={{ padding:'8px 12px', borderBottom:`1px solid ${RG.border}`, flexShrink:0 }}>
            <div style={{ fontSize:5, letterSpacing:3, color:RG.textFaint, textTransform:'uppercase', marginBottom:5 }}>ÚLTIMO GOLPE</div>
            <div style={{ display:'flex', alignItems:'center', gap:7,
              background:`${meta.color}0E`, border:`1px solid ${meta.color}33`,
              borderLeft:`3px solid ${meta.color}`, padding:'5px 9px' }}>
              <span style={{ fontSize:13 }}>{meta.emoji}</span>
              <span style={{ fontFamily:RG.display, fontSize:13, fontWeight:800,
                color:meta.color, letterSpacing:2, textTransform:'uppercase' }}>{meta.label}</span>
              {lastShot.isError && (
                <span style={{ fontFamily:RG.mono, fontSize:6, color:'#FF6060',
                  letterSpacing:1, marginLeft:'auto' }}>ERRO</span>
              )}
            </div>
          </div>
        );
      })()}

      {/* ── ESTATÍSTICAS DA PARTIDA ── */}
      {(() => {
        const st = p.stats ?? {};
        const served  = st.gamesServed  ?? 0;
        const held    = st.gamesHeld    ?? 0;
        const holdPct = served > 0 ? Math.round((held / served) * 100) : null;
        const aces    = st.aces             ?? 0;
        const winners = st.winners          ?? 0;
        const ue      = st.unforcedErrors   ?? 0;
        const fe      = st.forcedErrors     ?? 0;
        const erros   = ue + fe;
        const hasAny  = served > 0 || aces > 0 || winners > 0 || erros > 0;
        if (!hasAny) return null;

        const statRows = [
          {
            lbl: 'HOLD RATE',
            val: holdPct !== null ? `${holdPct}%` : '—',
            sub: served > 0 ? `${held}/${served}` : null,
            color: holdPct === null ? RG.textFaint
                 : holdPct >= 78 ? '#60FF90'
                 : holdPct >= 60 ? '#FFD700' : '#FF5050',
          },
          {
            lbl: 'ACES',
            val: String(aces),
            sub: null,
            color: aces >= 3 ? '#FFD700' : aces > 0 ? '#60CFFF' : RG.textFaint,
          },
          {
            lbl: 'WINNERS',
            val: String(winners),
            sub: null,
            color: winners >= 5 ? '#60FF90' : winners > 0 ? '#A8FF80' : RG.textFaint,
          },
          {
            lbl: 'ERROS',
            val: String(erros),
            sub: ue !== erros ? `${ue} NF · ${fe} F` : null,
            color: erros === 0 ? '#60FF90' : erros <= 5 ? '#FFD700' : '#FF5050',
          },
        ];

        return (
          <div style={{ padding:'8px 12px', borderBottom:`1px solid ${RG.border}`, flexShrink:0 }}>
            <div style={{ fontSize:5, letterSpacing:3, color:RG.textFaint, textTransform:'uppercase', marginBottom:6 }}>ESTATÍSTICAS</div>
            <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
              {statRows.map(({ lbl, val, sub, color }) => (
                <div key={lbl} style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                  <span style={{ fontFamily:RG.mono, fontSize:6, letterSpacing:2,
                    color:RG.textFaint, textTransform:'uppercase' }}>{lbl}</span>
                  <div style={{ textAlign:'right' }}>
                    <span style={{ fontFamily:RG.display, fontSize:13, fontWeight:800, color, lineHeight:1 }}>{val}</span>
                    {sub && (
                      <div style={{ fontFamily:RG.mono, fontSize:5, color:`${color}77`, letterSpacing:1, marginTop:1 }}>{sub}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* ── RATING DA PARTIDA ── */}
      <MatchRatingBadge stats={p.stats} shotCount={p.shotCount} surfColor={sc} />

      {/* ── HEATMAP ── */}
      <div style={{ padding:'8px 10px 0', flex:1, minHeight:0 }}>
        <div style={{ fontSize:5, letterSpacing:3, color:RG.textFaint, textTransform:'uppercase', marginBottom:5 }}>POSICIONAMENTO</div>
        <HeatmapMiniCourt
          heatGrid={p.heatGrid}
          playerSide={p.side ?? 1}
          surfColor={sc}
        />
      </div>

    </div>
  );
}

function RunStrip({ pointHistory = [], p0color, p1color, seriesWon0, seriesWon1, ewma0, ewma1 }) {
  // Mostra os últimos 12 pontos, do mais antigo (esq) ao mais recente (dir)
  const SHOW = 12;
  const pts = pointHistory.slice(-SHOW);

  // Quem está em run? seriesWon >= 3
  const run0 = seriesWon0 >= 3;
  const run1 = seriesWon1 >= 3;
  const runCount = run0 ? seriesWon0 : run1 ? seriesWon1 : 0;
  const runSide  = run0 ? 0 : run1 ? 1 : null;
  const runColor = runSide === 0 ? p0color : runSide === 1 ? p1color : '#fff';

  // Threshold de momentum "em chamas": EWMA > 0.68
  const hot0 = ewma0 > 0.68;
  const hot1 = ewma1 > 0.68;

  if (pts.length === 0) return null;

  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4, marginBottom:6 }}>

      {/* Badge de run — aparece quando alguém está em sequência */}
      {runSide !== null && runCount >= 3 && (
        <div style={{
          display:'flex', alignItems:'center', gap:5,
          background:`${runColor}18`,
          border:`1px solid ${runColor}44`,
          borderRadius:4,
          padding:'2px 8px',
          animation:'runBadgePop .35s cubic-bezier(.16,1,.3,1) both',
        }}>
          <span style={{ fontSize:11 }}>{runCount >= 6 ? '🔥🔥' : '🔥'}</span>
          <span style={{
            fontFamily:RG.mono, fontSize:9, letterSpacing:2,
            color:runColor, textTransform:'uppercase', fontWeight:700,
          }}>
            {runCount} PTS · {runSide === 0 ? 'P1' : 'P2'}
          </span>
        </div>
      )}

      {/* Fita de pontos */}
      <div style={{ display:'flex', alignItems:'center', gap:3, position:'relative' }}>

        {/* Barra de tug-of-war de momentum abaixo dos dots */}
        <div style={{
          position:'absolute', bottom:-5, left:0, right:0, height:2,
          background:'rgba(255,255,255,.06)', borderRadius:1,
          overflow:'hidden',
        }}>
          {/* Posição do "tug": ewma0 puxa esquerda, ewma1 puxa direita */}
          {/* Centro = 0.5. Se ewma0=0.7 e ewma1=0.5 → barra vai mais para esquerda */}
          <div style={{
            position:'absolute',
            left:0,
            width:`${Math.round(ewma0 / (ewma0 + ewma1) * 100)}%`,
            top:0, bottom:0,
            background:`linear-gradient(90deg,${p0color}99,${p0color}44)`,
            transition:'width 1.2s ease',
          }}/>
        </div>

        {pts.map((pt, i) => {
          const isP0 = pt.winner === 0;
          const col  = isP0 ? p0color : p1color;
          const isLast = i === pts.length - 1;
          const isAce  = pt.reason === 'ace';
          const isWin  = pt.reason === 'winner' || pt.reason === 'out_of_reach';
          const isDbl  = pt.reason === 'double_fault';
          const size   = isLast ? 10 : 7;
          return (
            <div key={i} style={{
              width:  size,
              height: size,
              borderRadius: isAce ? 2 : '50%',  // ace = quadrado, rally = círculo
              background: isLast
                ? col
                : isDbl ? 'rgba(255,80,80,.55)' : `${col}${isWin ? 'DD' : '88'}`,
              boxShadow: isLast
                ? `0 0 ${isAce ? 10 : 7}px ${col}CC, 0 0 16px ${col}55`
                : 'none',
              border: isLast ? `1px solid ${col}` : '1px solid rgba(255,255,255,.08)',
              transition:'all .2s',
              animation: isLast ? 'runDotIn .25s cubic-bezier(.16,1,.3,1) both' : 'none',
              flexShrink:0,
            }}/>
          );
        })}

        {/* Indicadores de momentum "on fire" nos extremos */}
        {hot0 && (
          <div style={{
            position:'absolute', left:-18,
            fontSize:10, lineHeight:1,
            opacity:0.85,
            filter:`drop-shadow(0 0 4px ${p0color})`,
          }}>⚡</div>
        )}
        {hot1 && (
          <div style={{
            position:'absolute', right:-18,
            fontSize:10, lineHeight:1,
            opacity:0.85,
            filter:`drop-shadow(0 0 4px ${p1color})`,
          }}>⚡</div>
        )}
      </div>
    </div>
  );
}

function ScoreBug({ p0, p1, pts0, pts1, srv, surfColor, curSet, heat, pointHistory, snap }) {
  const sc = surfColor || RG.clay;
  const heatData = heat ? readHeat({ heat }) : null;
  const heatTier = heatData?.tier ?? null;
  const heatScore = heatData?.score ?? 0;
  const pressureInfo = getVisualPressureState({
    players: [p0, p1],
    server: srv,
    receiver: srv === 0 ? 1 : 0,
    inTiebreak: !!(p0?.tbScore != null || p1?.tbScore != null),
    tbScore: [p0?.tbScore ?? 0, p1?.tbScore ?? 0],
    setsToWin: p0?.ctx?.setsToWin ?? p1?.ctx?.setsToWin ?? 2,
    rally: 0,
  });
  const serveIntel = getServeBroadcastState(snap, pressureInfo);
  const pressurePalette = pressureInfo.momentType === 'match' ? '#ffd54a'
    : pressureInfo.momentType === 'set' ? '#ff9d5c'
    : pressureInfo.momentType === 'break' ? '#ff6247'
    : pressureInfo.momentType === 'game' ? '#7ce7ff'
    : pressureInfo.momentType === 'clutch' ? '#d9c0ff'
    : sc;

  // Cores dos jogadores para o RunStrip — usa cor do jogador ou fallback por posição
  const p0color = p0?.color || '#00BFFF';
  const p1color = p1?.color || '#FF6B35';
  const seriesWon0 = p0?.ctx?.seriesWon ?? 0;
  const seriesWon1 = p1?.ctx?.seriesWon ?? 0;
  const ewma0 = p0?.ctx?._momentumEWMA ?? 0.5;
  const ewma1 = p1?.ctx?._momentumEWMA ?? 0.5;

  const totalSets = Math.max(
    (p0?.setsHistory?.length ?? 0),
    (p1?.setsHistory?.length ?? 0),
    curSet ?? 0,
  );
  const setCount = Math.max(2, Math.min(5, totalSets + 1));

  const Row = ({ p, pts, isServer, idx, opp, playerIndex }) => {
    const state = pressureInfo.states?.[playerIndex] || {};
    const isUnderSpotlight = pressureInfo.playerId === playerIndex && !!pressureInfo.momentType;
    const isDefendingSpotlight = pressureInfo.playerId === (1 - playerIndex) && (
      state.isDefendingBreakPoint || state.isDefendingSetPoint || state.isDefendingMatchPoint
    );
    const sets = [];
    for (let si = 0; si < setCount; si++) {
      const finished = p?.setsHistory?.[si] !== undefined;
      const isCurrent = si === (curSet ?? 0);
      let val, won = false;
      if (finished) {
        val = p.setsHistory[si];
        won = val > (opp?.setsHistory?.[si] ?? 0);
      } else if (isCurrent) {
        val = p?.games ?? 0;
      } else {
        val = '';
      }
      sets.push({ val, finished, isCurrent, won });
    }

    const isAdv = pts === 'ADV';
    const isDeu = pts === 'DEU';
    const isDash = pts === '—';
    const ptsColor = isAdv ? sc : isDeu ? RG.textFaint : isDash ? 'rgba(255,255,255,.2)' : RG.white;

    return (
      <div style={{
        display:'flex', alignItems:'stretch',
        borderTop: idx === 1 ? `1px solid rgba(255,255,255,.07)` : 'none',
        background: isUnderSpotlight
          ? `${pressurePalette}14`
          : isDefendingSpotlight
            ? 'rgba(255,255,255,.04)'
            : isServer ? 'rgba(255,255,255,.025)' : 'transparent',
        position:'relative',
      }}>
        {(isUnderSpotlight || isDefendingSpotlight) && (
          <div style={{
            position:'absolute', inset:0,
            background: isUnderSpotlight
              ? `linear-gradient(90deg, ${pressurePalette}18, transparent 78%)`
              : 'linear-gradient(90deg, rgba(255,255,255,.08), transparent 78%)',
            pointerEvents:'none',
          }}/>
        )}
        {/* Server pulse bar on left edge */}
        <div style={{
          position:'absolute', left:0, top:0, bottom:0, width:2,
          background: isServer
            ? `linear-gradient(180deg,transparent,${sc},transparent)`
            : 'transparent',
          opacity: isServer ? 0.9 : 0,
          transition:'opacity .3s',
        }}/>

        {/* Serve dot */}
        <div style={{
          width:22, display:'flex', alignItems:'center', justifyContent:'center',
          flexShrink:0,
        }}>
          {isServer && (
            <div style={{
              width:6, height:6, borderRadius:'50%',
              background:sc, boxShadow:`0 0 10px ${sc}cc`,
              animation:'serveDotPulse 1.4s ease-in-out infinite',
            }}/>
          )}
        </div>

        {/* Player name */}
        <div style={{
          width:120, paddingRight:8, display:'flex', flexDirection:'column',
          justifyContent:'center', paddingTop:10, paddingBottom:10,
          position:'relative',
        }}>
          {/* Momentum glow: aparece quando EWMA > 0.68 */}
          {(() => {
            const ewma = p?.ctx?._momentumEWMA ?? 0.5;
            const series = p?.ctx?.seriesWon ?? 0;
            const isHot  = ewma > 0.68;
            const isVeryHot = ewma > 0.78;
            if (!isHot) return null;
            return (
              <div style={{
                position:'absolute', inset:0,
                background:`linear-gradient(90deg,${sc}${isVeryHot ? '22' : '14'},transparent 80%)`,
                animation:`momentumFlare ${isVeryHot ? '1.4s' : '2.2s'} ease-in-out infinite`,
                pointerEvents:'none',
              }}/>
            );
          })()}
          <div style={{
            fontFamily:RG.display, fontSize:14, fontWeight:800,
            letterSpacing:1, textTransform:'uppercase',
            color: isUnderSpotlight ? RG.white : isServer ? RG.white : RG.textDim,
            whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis',
            lineHeight:1,
            // Glow animado no nome quando momentum alto
            '--mg-color': sc,
            animation: (p?.ctx?._momentumEWMA ?? 0.5) > 0.78 ? 'nameGlowPulse 1.6s ease-in-out infinite' : 'none',
          }}>
            {(p?.name || '').split(' ').pop()}
          </div>
          <div style={{
            fontFamily:RG.mono, fontSize:7, letterSpacing:2,
            color:RG.textFaint, marginTop:2, textTransform:'uppercase',
          }}>{NATIONALITY_FLAGS[p?.namedPlayerKey] || p?.styleData?.abbr || ''}</div>
          {(state.isMatchPoint || state.isSetPoint || state.isBreakPoint || state.isGamePoint) && (
            <div style={{
              marginTop:4,
              fontFamily:RG.mono,
              fontSize:6,
              letterSpacing:1.8,
              color:pressurePalette,
              textTransform:'uppercase',
              textShadow:`0 0 10px ${pressurePalette}44`,
            }}>
              {state.isMatchPoint ? 'Match Pt' : state.isSetPoint ? 'Set Pt' : state.isBreakPoint ? 'Break Pt' : 'Game Pt'}
            </div>
          )}
        </div>

        {/* Set score columns */}
        {sets.map((s, si) => (
          <div key={si} style={{
            width:36, display:'flex', alignItems:'center', justifyContent:'center',
            borderLeft:'1px solid rgba(255,255,255,.06)',
            position:'relative',
          }}>
            {s.isCurrent && (
              <div style={{
                position:'absolute', top:0, left:0, right:0, height:2,
                background:`linear-gradient(90deg,transparent,${sc}88,transparent)`,
              }}/>
            )}
            <span style={{
              fontFamily:RG.display,
              fontSize: s.isCurrent ? 26 : 20,
              fontWeight: s.won ? 900 : s.isCurrent ? 700 : 400,
              color: s.finished
                ? (s.won ? RG.white : RG.textFaint)
                : s.isCurrent ? RG.white : 'rgba(255,255,255,.15)',
              lineHeight:1,
              textShadow: s.isCurrent ? `0 0 14px ${RG.white}33` : 'none',
              transition:'all .2s',
            }}>
              {s.val === '' ? '·' : s.val}
            </span>
          </div>
        ))}

        {/* Points — visually separated */}
        <div style={{
          width:58, display:'flex', alignItems:'center', justifyContent:'center',
          borderLeft:`2px solid rgba(255,255,255,.12)`,
          background: isAdv ? `${sc}14` : 'transparent',
          position:'relative',
        }}>
          {isAdv && (
            <div style={{
              position:'absolute', inset:0,
              boxShadow:`inset 0 0 12px ${sc}22`,
            }}/>
          )}
          <span style={{
            fontFamily:RG.display,
            fontSize: isAdv || isDeu ? 14 : 30,
            fontWeight:900, lineHeight:1,
            color:ptsColor,
            letterSpacing: isAdv || isDeu ? 1 : 0,
            textShadow: !isAdv && !isDeu && !isDash ? `0 0 16px ${RG.white}33` : 'none',
            transition:'color .15s',
          }}>{pts}</span>
        </div>

        {/* Heat ball — only on first row (idx===0), spans both rows visually */}
        {idx === 0 && (
          <div style={{
            width:34, display:'flex', alignItems:'center', justifyContent:'center',
            borderLeft:'1px solid rgba(255,255,255,.06)',
            position:'relative',
          }}>
            {heatTier ? (
              <div style={{
                width:16, height:16, borderRadius:'50%',
                background: `radial-gradient(circle at 38% 35%, ${heatTier.color}FF 0%, ${heatTier.color}CC 45%, ${heatTier.color}44 100%)`,
                boxShadow: `0 0 ${heatScore > 75 ? 12 : heatScore > 48 ? 7 : 3}px ${heatTier.color}${heatScore > 75 ? 'CC' : '77'}, 0 0 ${heatScore > 75 ? 24 : 10}px ${heatTier.color}${heatScore > 75 ? '55' : '22'}`,
                animation: heatTier.pulse ? 'serveDotPulse 1.1s ease-in-out infinite' : 'none',
                transition: 'background 1s ease, box-shadow 1s ease',
                flexShrink: 0,
              }} />
            ) : (
              <div style={{
                width:14, height:14, borderRadius:'50%',
                background:'rgba(255,255,255,.08)',
                border:'1px solid rgba(255,255,255,.12)',
              }} />
            )}
          </div>
        )}
        {idx === 1 && (
          <div style={{ width:34, borderLeft:'1px solid rgba(255,255,255,.06)' }} />
        )}
      </div>
    );
  };

  const setLabels = Array.from({ length: setCount }, (_, i) => `S${i+1}`);

  return (
    <>
      {/* RunStrip — fita de pontos + indicador de momentum */}
      <RunStrip
        pointHistory={pointHistory}
        p0color={p0color}
        p1color={p1color}
        seriesWon0={seriesWon0}
        seriesWon1={seriesWon1}
        ewma0={ewma0}
        ewma1={ewma1}
      />
      {pressureInfo.momentType && (
        <div style={{
          display:'flex', alignItems:'center', justifyContent:'space-between',
          gap:12,
          padding:'7px 12px',
          background:`linear-gradient(90deg, rgba(0,0,0,.72), ${pressurePalette}26, rgba(0,0,0,.72))`,
          border:`1px solid ${pressurePalette}44`,
          borderBottom:'none',
          backdropFilter:'blur(18px)',
          boxShadow:`0 8px 22px rgba(0,0,0,.35), inset 0 1px 0 rgba(255,255,255,.06)`,
        }}>
          <span style={{
            fontFamily:RG.display, fontSize:16, fontWeight:900, letterSpacing:1.2,
            color:pressurePalette, textTransform:'uppercase',
            textShadow:`0 0 14px ${pressurePalette}55`,
          }}>
            {pressureInfo.label}
          </span>
          <span style={{
            fontFamily:RG.mono, fontSize:7, letterSpacing:2, textTransform:'uppercase',
            color:'rgba(255,255,255,.72)',
          }}>
            {pressureInfo.subLabel}
          </span>
        </div>
      )}
      <div style={{
        display:'flex', alignItems:'center', justifyContent:'space-between',
        padding:'5px 12px 6px',
        background:`linear-gradient(90deg, rgba(0,0,0,.55), ${pressurePalette}18, rgba(0,0,0,.55))`,
        borderLeft:`1px solid ${pressurePalette}33`,
        borderRight:`1px solid ${pressurePalette}33`,
        borderTop:`1px solid rgba(255,255,255,.06)`,
        borderBottom:'1px solid rgba(255,255,255,.05)',
        backdropFilter:'blur(16px)',
      }}>
        <span style={{
          fontFamily:RG.mono, fontSize:7, letterSpacing:2.2,
          color:'rgba(255,255,255,.72)', textTransform:'uppercase',
        }}>
          {srv === 0 ? `${(p0?.name || '').split(' ').pop()} serving` : `${(p1?.name || '').split(' ').pop()} serving`}
        </span>
        <span style={{
          fontFamily:RG.display, fontSize:12, fontWeight:800, letterSpacing:1.4,
          color:pressureInfo.momentType ? pressurePalette : (heatTier?.color || sc), textTransform:'uppercase',
          textShadow:`0 0 12px ${pressureInfo.momentType ? pressurePalette : (heatTier?.color || sc)}44`,
        }}>
          {pressureInfo.momentType ? pressureInfo.label : (heatTier?.label || 'Match Flow')}
        </span>
      </div>
      {serveIntel && (
        <div style={{
          display:'flex',
          alignItems:'center',
          justifyContent:'space-between',
          gap:10,
          padding:'7px 12px',
          background:'linear-gradient(90deg, rgba(255,255,255,.035), rgba(255,255,255,.015), rgba(255,255,255,.035))',
          borderLeft:`1px solid ${pressurePalette}22`,
          borderRight:`1px solid ${pressurePalette}22`,
          borderBottom:'1px solid rgba(255,255,255,.05)',
          backdropFilter:'blur(14px)',
        }}>
          <div style={{ minWidth: 0, display:'flex', flexDirection:'column', gap:2 }}>
            <div style={{
              fontFamily:RG.display,
              fontSize:14,
              fontWeight:900,
              letterSpacing:1.1,
              color:RG.white,
              textTransform:'uppercase',
              lineHeight:1,
              textShadow:`0 0 10px ${sc}33`,
              whiteSpace:'nowrap',
              overflow:'hidden',
              textOverflow:'ellipsis',
            }}>
              {serveIntel.primaryLabel}
            </div>
            <div style={{
              fontFamily:RG.mono,
              fontSize:7,
              letterSpacing:1.8,
              color:'rgba(255,255,255,.56)',
              textTransform:'uppercase',
              whiteSpace:'nowrap',
              overflow:'hidden',
              textOverflow:'ellipsis',
            }}>
              {serveIntel.subLabel}
            </div>
          </div>
          <div style={{
            display:'flex',
            alignItems:'center',
            justifyContent:'flex-end',
            gap:6,
            flexWrap:'wrap',
            maxWidth: 230,
          }}>
            {serveIntel.tags.map((tag, i) => {
              const tone = tag.tone;
              const bg = tone === 'accent' ? `${sc}22`
                : tone === 'warn' ? 'rgba(255,108,84,.16)'
                : tone === 'good' ? 'rgba(96,255,144,.14)'
                : tone === 'hot' ? `${pressurePalette}22`
                : 'rgba(255,255,255,.06)';
              const color = tone === 'accent' ? sc
                : tone === 'warn' ? '#ff8d74'
                : tone === 'good' ? '#7dffaf'
                : tone === 'hot' ? pressurePalette
                : 'rgba(255,255,255,.78)';
              const border = tone === 'accent' ? `${sc}44`
                : tone === 'warn' ? 'rgba(255,108,84,.30)'
                : tone === 'good' ? 'rgba(96,255,144,.28)'
                : tone === 'hot' ? `${pressurePalette}40`
                : 'rgba(255,255,255,.10)';
              return (
                <span key={`${tag.label}-${i}`} style={{
                  fontFamily:RG.mono,
                  fontSize:7,
                  letterSpacing:1.6,
                  textTransform:'uppercase',
                  color,
                  background:bg,
                  border:`1px solid ${border}`,
                  borderRadius:999,
                  padding:'3px 7px',
                  boxShadow: tone === 'hot' ? `0 0 12px ${pressurePalette}22` : 'none',
                  whiteSpace:'nowrap',
                }}>
                  {tag.label}
                </span>
              );
            })}
          </div>
        </div>
      )}
      <div style={{
        background:`linear-gradient(180deg, rgba(8,16,12,.98), rgba(3,7,5,.96) 22%, rgba(4,7,6,.98) 100%)`,
        backdropFilter:'blur(22px)',
        border:`1px solid rgba(255,255,255,.10)`,
        borderTop:`2px solid ${sc}`,
        overflow:'hidden',
        boxShadow:`0 18px 54px rgba(0,0,0,.88), 0 0 0 1px rgba(255,255,255,.04), 0 -2px 24px ${sc}33, inset 0 1px 0 rgba(255,255,255,.05)`,
        minWidth:300,
        clipPath:'polygon(0 0,100% 0,calc(100% - 8px) 100%,8px 100%)',
      }}>

      {/* Column headers */}
      <div style={{
        display:'flex', alignItems:'center',
        background:'rgba(0,0,0,.45)',
        borderBottom:`1px solid rgba(255,255,255,.07)`,
        padding:'4px 0',
      }}>
        {/* serve dot column */}
        <div style={{ width:22 }}/>
        {/* name */}
        <div style={{ width:120,
          fontFamily:RG.mono, fontSize:6, letterSpacing:4,
          color:RG.textFaint, textTransform:'uppercase', paddingRight:8 }}>JOGADOR</div>
        {/* set labels */}
        {setLabels.map((lbl, si) => (
          <div key={si} style={{
            width:36, textAlign:'center',
            fontFamily:RG.mono, fontSize:7, letterSpacing:2,
            color: si === (curSet ?? 0) ? sc : RG.textFaint,
            textTransform:'uppercase',
            borderLeft:'1px solid rgba(255,255,255,.06)',
          }}>{lbl}</div>
        ))}
        {/* points header */}
        <div style={{
          width:58, textAlign:'center',
          fontFamily:RG.mono, fontSize:7, letterSpacing:2,
          color:RG.textFaint, textTransform:'uppercase',
          borderLeft:'2px solid rgba(255,255,255,.12)',
        }}>PTO</div>
        {/* heat column header */}
        <div style={{
          width:34, display:'flex', alignItems:'center', justifyContent:'center',
          borderLeft:'1px solid rgba(255,255,255,.06)',
        }}>
          <span style={{ fontFamily:RG.mono, fontSize:6, letterSpacing:2, color:RG.textFaint, textTransform:'uppercase' }}>🌡</span>
        </div>
      </div>

      <Row p={p1} pts={pts1} isServer={srv === 1} idx={0} opp={p0} playerIndex={1} />
      <Row p={p0} pts={pts0} isServer={srv === 0} idx={1} opp={p1} playerIndex={0} />
    </div>
    </>
  );
}


function ScoreRow({ p, pts, isServer, color, curSet }) {
  const isADV=pts==='ADV', isDEU=pts==='DEU';
  return (
    <div style={{ display:'grid', gridTemplateColumns:'1fr 56px 56px 56px 80px', alignItems:'center', flex:1, background:isServer?`${RG.clay}08`:'transparent', borderBottom:`1px solid ${RG.border}`, padding:'0 14px' }}>
      <div style={{ display:'flex', alignItems:'center', gap:7 }}>
        {isServer&&<div style={{ width:7, height:7, borderRadius:'50%', background:RG.clay, boxShadow:`0 0 8px ${RG.clay}cc` }} />}
        <div style={{ width:3, height:26, background:color, flexShrink:0 }} />
        <div>
          <div style={{ fontFamily:RG.display, fontSize:22, fontWeight:600, letterSpacing:1, color:RG.white, lineHeight:1, textTransform:'uppercase' }}>{p.name}</div>
          <div style={{ fontFamily:RG.mono, fontSize:9, letterSpacing:2, textTransform:'uppercase', color:RG.textFaint }}>{NATIONALITY_FLAGS[p.namedPlayerKey]||p.styleData?.abbr||''}</div>
        </div>
      </div>
      {[0,1,2].map(si=>{
        let val, isActive=false;
        const histVal = p.setsHistory?.[si];
        if (histVal !== undefined) {
          // set já concluído (usa setsHistory — correto para ganhador e perdedor)
          val = histVal;
        } else if (si === curSet) {
          // set em andamento → mostra games atuais
          val = p.games ?? 0;
          isActive = true;
        } else {
          val = '—';
        }
        return (
          <div key={si} style={{ fontFamily:RG.display, fontSize:isActive?28:24, fontWeight:isActive?700:500, color:histVal!==undefined?RG.clay:isActive?RG.white:RG.textFaint, textAlign:'center', lineHeight:1, textShadow:isActive?`0 0 12px ${RG.white}44`:undefined }}>
            {val}
          </div>
        );
      })}
      <div style={{ fontFamily:RG.display, fontSize:isADV||isDEU?18:34, fontWeight:700, color:isADV?RG.clay:isDEU?RG.textFaint:RG.white, textAlign:'center', lineHeight:1, borderLeft:`1px solid ${RG.border}`, letterSpacing:pts.length>2?2:0 }}>{pts}</div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  SERVE ANALYSIS PANEL — pós-jogo, paleta RG do definitiveME
// ═══════════════════════════════════════════════════════════════════════════

function ServeAnalysisPanel({ snap, onMenu }) {
  const [tab, setTab] = useState('overview');
  const [traceTxt, setTraceTxt] = useState(null);

  const p0 = snap?.players?.[0];
  const p1 = snap?.players?.[1];
  if (!p0 || !p1) return null;

  const winner = p0.sets > p1.sets ? p0 : p1;
  const fmtPct = (a, b) => b > 0 ? `${Math.round(a / b * 100)}%` : '—';
  const avg = arr => arr.length ? Math.round(arr.reduce((s, v) => s + (v.kmh || 0), 0) / arr.length) : null;

  function block(p) {
    const s = p.stats;
    const log1 = (s.serveLog || []).filter(l => l.isFirst);
    const log2 = (s.serveLog || []).filter(l => !l.isFirst);
    const t1 = s.serve1WonPoints + s.serve1LostPoints;
    const t2 = s.serve2WonPoints + s.serve2LostPoints;
    return {
      name: p.name, color: p.color, style: p.styleData?.abbr,
      s1Pct:    fmtPct(s.serve1In, s.serve1Total),
      s1WinPct: fmtPct(s.serve1WonPoints, t1),
      s2WinPct: fmtPct(s.serve2WonPoints, t2),
      holdPct:  fmtPct(s.gamesHeld, s.gamesServed),
      holdRaw:  `${s.gamesHeld ?? 0}/${s.gamesServed ?? 0}`,
      breakPct: fmtPct(s.gamesConverted, s.gamesReturned),
      breakRaw: `${s.gamesConverted ?? 0}/${s.gamesReturned ?? 0}`,
      retWin:   fmtPct(s.pointsWonReturning, (s.pointsWonReturning ?? 0) + (s.pointsLostReturning ?? 0)),
      srvWin:   fmtPct(s.pointsWonServing,   (s.pointsWonServing  ?? 0) + (s.pointsLostServing  ?? 0)),
      avgKmh1:  avg(log1), avgKmh2: avg(log2),
      aces: s.aces ?? 0, dfs: s.doubleFaults ?? 0,
      log: s.serveLog || [], log1, log2, raw: s,
    };
  }

  const b0 = block(p0), b1 = block(p1);

  // Cor por qualidade vs benchmark ATP
  const qclr = (raw, good, bad, inv = false) => {
    const n = parseInt(raw);
    if (isNaN(n)) return '#666';
    if (inv) return n < good ? '#4ade80' : n > bad ? '#f87171' : '#fbbf24';
    return n > good ? '#4ade80' : n < bad ? '#f87171' : '#fbbf24';
  };

  const RGp = {
    bg: '#0a1a10', surface: '#0F2218', border: '#1C3D28',
    clay: '#C4572A', lime: '#A8C832', white: '#f0ede6',
    faint: '#4a6a4a', mono: "'Space Mono', monospace",
    display: "'Barlow Condensed', sans-serif",
  };

  const TAB = (active) => ({
    fontFamily: RGp.display, fontWeight: 600, fontSize: 12,
    letterSpacing: 3, textTransform: 'uppercase',
    padding: '7px 18px', border: `1px solid ${active ? RGp.lime : RGp.border}`,
    background: active ? `${RGp.lime}18` : 'transparent',
    color: active ? RGp.lime : RGp.faint, cursor: 'pointer',
  });

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9500,
      background: 'rgba(8,18,10,0.95)', backdropFilter: 'blur(16px)',
      display: 'flex', flexDirection: 'column',
      fontFamily: "'Barlow', sans-serif", color: RGp.white,
      overflowY: 'auto',
    }}>
      {/* Header */}
      <div style={{
        background: RGp.surface, borderBottom: `1px solid ${RGp.border}`,
        padding: '16px 32px', display: 'flex', alignItems: 'center', gap: 24, flexShrink: 0,
      }}>
        <div>
          <div style={{ fontFamily: RGp.mono, fontSize: 10, letterSpacing: 4, color: RGp.faint, marginBottom: 6 }}>
            FIM DE PARTIDA · ANÁLISE DE SAQUE &amp; RETURN
          </div>
          <div style={{ fontFamily: RGp.display, fontWeight: 700, fontSize: 26, letterSpacing: 2, color: RGp.lime }}>
            🏆 {winner.name}
            <span style={{ color: RGp.faint, fontWeight: 400, fontSize: 15, marginLeft: 14 }}>
              {p0.sets}–{p1.sets} sets
            </span>
          </div>
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', gap: 8 }}>
          {[['overview','VISÃO GERAL'],['chart','GRÁFICOS'],['trace','TRACE LOG']].map(([id, lbl]) => (
            <button key={id} style={TAB(tab === id)} onClick={() => {
              if (id === 'trace' && !traceTxt) setTraceTxt(traceServeDump(snap));
              setTab(id);
            }}>{lbl}</button>
          ))}
        </div>
        <button onClick={onMenu} style={{ ...TAB(false), borderColor: RGp.clay, color: RGp.clay, marginLeft: 16 }}>
          ← MENU
        </button>
      </div>

      {/* Body */}
      <div style={{ flex: 1, padding: '24px 32px' }}>

        {/* ── OVERVIEW ── */}
        {tab === 'overview' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            {[b0, b1].map((b, i) => (
              <div key={i} style={{
                background: RGp.surface, border: `1px solid ${RGp.border}`,
                borderTop: `3px solid ${b.color}`, padding: 24,
              }}>
                {/* Player header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                  <div style={{ width: 4, height: 44, background: b.color }} />
                  <div>
                    <div style={{ fontFamily: RGp.display, fontWeight: 700, fontSize: 22, letterSpacing: 1 }}>{b.name}</div>
                    <div style={{ fontFamily: RGp.mono, fontSize: 9, color: RGp.faint, letterSpacing: 3 }}>{b.style}</div>
                  </div>
                </div>

                {/* SAQUE */}
                <div style={{ fontFamily: RGp.mono, fontSize: 10, letterSpacing: 4, color: RGp.clay, marginBottom: 12, borderBottom: `1px solid ${RGp.border}`, paddingBottom: 8 }}>SAQUE</div>
                {[
                  ['HOLD RATE', b.holdPct, b.holdRaw, 78, 65, false, 'ATP ref: ~81%'],
                  ['1º SAQUE IN%', b.s1Pct, null, 63, 55, false, 'ATP ref: 62-65%'],
                  ['WIN% 1º SAQUE', b.s1WinPct, null, 68, 58, false, 'ATP ref: ~71%'],
                  ['WIN% 2º SAQUE', b.s2WinPct, null, 50, 42, false, 'ATP ref: ~50%'],
                  ['VELOCIDADE 1º', b.avgKmh1 ? `${b.avgKmh1}km/h` : '—', null, 180, 155, false, 'ATP ref: 185-210'],
                  ['ACES', String(b.aces), null, 5, 0, false, ''],
                  ['DUPLAS FALTAS', String(b.dfs), null, 2, 4, true, 'baixo = melhor'],
                ].map(([lbl, val, sub, good, bad, inv, note]) => (
                  <div key={lbl} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid ${RGp.bg}` }}>
                    <div>
                      <div style={{ fontSize: 11, color: RGp.faint, letterSpacing: 1 }}>{lbl}</div>
                      {note && <div style={{ fontFamily: RGp.mono, fontSize: 9, color: '#2a4a2a' }}>{note}</div>}
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontFamily: RGp.display, fontWeight: 700, fontSize: 18, color: qclr(val, good, bad, inv) }}>{val ?? '—'}</div>
                      {sub && <div style={{ fontFamily: RGp.mono, fontSize: 10, color: RGp.faint }}>{sub}</div>}
                    </div>
                  </div>
                ))}

                {/* RETURN */}
                <div style={{ fontFamily: RGp.mono, fontSize: 10, letterSpacing: 4, color: RGp.clay, marginBottom: 12, borderBottom: `1px solid ${RGp.border}`, paddingBottom: 8, marginTop: 20 }}>RETURN</div>
                {[
                  ['BREAK RATE', b.breakPct, b.breakRaw, 25, 15, false, 'ATP ref: ~19-23%'],
                  ['WIN% RECEBENDO', b.retWin, null, 38, 28, false, 'ATP ref: ~29-38%'],
                  ['WIN% SACANDO', b.srvWin, null, 60, 50, false, ''],
                ].map(([lbl, val, sub, good, bad, inv, note]) => (
                  <div key={lbl} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid ${RGp.bg}` }}>
                    <div>
                      <div style={{ fontSize: 11, color: RGp.faint, letterSpacing: 1 }}>{lbl}</div>
                      {note && <div style={{ fontFamily: RGp.mono, fontSize: 9, color: '#2a4a2a' }}>{note}</div>}
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontFamily: RGp.display, fontWeight: 700, fontSize: 18, color: qclr(val, good, bad, inv) }}>{val ?? '—'}</div>
                      {sub && <div style={{ fontFamily: RGp.mono, fontSize: 10, color: RGp.faint }}>{sub}</div>}
                    </div>
                  </div>
                ))}

                {/* Direção */}
                {b.log.length > 0 && (
                  <div style={{ marginTop: 18 }}>
                    <div style={{ fontFamily: RGp.mono, fontSize: 10, letterSpacing: 4, color: RGp.clay, marginBottom: 10, borderBottom: `1px solid ${RGp.border}`, paddingBottom: 8 }}>DIREÇÃO</div>
                    {['T','BODY','WIDE'].map(dir => {
                      const pts = b.log.filter(l => l.dir === dir);
                      const won = pts.filter(l => l.won).length;
                      const p   = pts.length > 0 ? Math.round(won / pts.length * 100) : null;
                      if (!pts.length) return null;
                      const clr = p >= 63 ? '#4ade80' : p >= 50 ? RGp.lime : '#f87171';
                      return (
                        <div key={dir} style={{ marginBottom: 10 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                            <span style={{ fontFamily: RGp.mono, fontSize: 10, color: RGp.faint, letterSpacing: 2 }}>{dir}</span>
                            <span style={{ fontFamily: RGp.display, fontSize: 13, fontWeight: 700, color: clr }}>{won}/{pts.length} ({p}%)</span>
                          </div>
                          <div style={{ height: 5, background: RGp.border, borderRadius: 0, position: 'relative' }}>
                            <div style={{ height: '100%', width: `${p ?? 0}%`, background: clr, opacity: 0.75 }} />
                            <div style={{ position: 'absolute', left: '63%', top: 0, bottom: 0, width: 1, background: `${RGp.lime}60` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Tipo de saque */}
                {b.log.length > 0 && (
                  <div style={{ marginTop: 18 }}>
                    <div style={{ fontFamily: RGp.mono, fontSize: 10, letterSpacing: 4, color: RGp.clay, marginBottom: 10, borderBottom: `1px solid ${RGp.border}`, paddingBottom: 8 }}>TIPO</div>
                    {['FLAT','SLICE','KICK'].map(type => {
                      const pts = b.log.filter(l => l.physType === type);
                      const won = pts.filter(l => l.won).length;
                      const p   = pts.length > 0 ? Math.round(won / pts.length * 100) : null;
                      if (!pts.length) return null;
                      const spd = Math.round(pts.reduce((a, l) => a + (l.kmh || 0), 0) / pts.length);
                      return (
                        <div key={type} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: `1px solid ${RGp.bg}` }}>
                          <span style={{ fontFamily: RGp.mono, fontSize: 10, color: RGp.faint }}>{type}</span>
                          <span style={{ fontFamily: RGp.mono, fontSize: 10, color: '#2a5a2a' }}>{spd} km/h</span>
                          <span style={{ fontFamily: RGp.display, fontSize: 13, fontWeight: 700, color: p >= 60 ? '#4ade80' : p < 45 ? '#f87171' : '#fbbf24' }}>
                            {won}/{pts.length} ({p}%)
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ── GRÁFICOS ── */}
        {tab === 'chart' && (
          <div>
            <div style={{ fontFamily: RGp.mono, fontSize: 10, letterSpacing: 4, color: RGp.faint, marginBottom: 24 }}>
              GRÁFICOS DE SAQUE — evolução ponto a ponto
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }}>
              {[b0, b1].map((b, i) => (
                <div key={i}>
                  <div style={{ fontFamily: RGp.display, fontWeight: 600, fontSize: 18, color: b.color, letterSpacing: 2, marginBottom: 20 }}>
                    {b.name}
                  </div>
                  <RGServeTimelineChart log={b.log} color={b.color} bgColor={RGp.border} />
                  <RGServeSpeedChart    log={b.log} color={b.color} bgColor={RGp.border} />
                  <RGServeDirChart      log={b.log} color={b.color} rgp={RGp} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── TRACE LOG ── */}
        {tab === 'trace' && (
          <div>
            <div style={{ fontFamily: RGp.mono, fontSize: 10, letterSpacing: 4, color: RGp.faint, marginBottom: 16 }}>
              SERVE TRACE LOG — dados de saque ponto a ponto (últimos 10 pontos)
            </div>
            <pre style={{
              fontFamily: RGp.mono, fontSize: 11, lineHeight: 1.75,
              color: '#6a9a6a', background: RGp.surface,
              border: `1px solid ${RGp.border}`, padding: '20px 24px',
              overflowX: 'auto', whiteSpace: 'pre',
            }}>
              {traceTxt || 'Carregando trace...'}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

// ── RGServeTimelineChart ──────────────────────────────────────────────────────
function RGServeTimelineChart({ log, color, bgColor }) {
  if (!log || log.length < 4) return (
    <div style={{ color: '#4a6a4a', fontSize: 12, marginBottom: 20 }}>dados insuficientes (mín. 4 pontos)</div>
  );
  const W = 420, H = 120, P = { l: 38, r: 16, t: 14, b: 26 }, WIN = 8;
  const pts = [];
  for (let i = WIN - 1; i < log.length; i++) {
    const sl = log.slice(i - WIN + 1, i + 1);
    pts.push({ x: i, y: sl.filter(l => l.won).length / WIN });
  }
  const xs = i => P.l + (i / Math.max(log.length - 1, 1)) * (W - P.l - P.r);
  const ys = v => P.t + (1 - v) * (H - P.t - P.b);
  const ATP = 0.63;
  const path  = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${xs(p.x).toFixed(1)},${ys(p.y).toFixed(1)}`).join(' ');
  const area  = path + ` L${xs(pts[pts.length-1].x).toFixed(1)},${ys(0).toFixed(1)} L${xs(pts[0].x).toFixed(1)},${ys(0).toFixed(1)} Z`;
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 9, letterSpacing: 3, color: '#4a6a4a', marginBottom: 8 }}>WIN% SAQUE (janela {WIN} pts)</div>
      <svg width={W} height={H} style={{ overflow: 'visible', maxWidth: '100%' }}>
        {[0, 0.25, 0.5, 0.75, 1].map(v => (
          <g key={v}>
            <line x1={P.l} x2={W-P.r} y1={ys(v)} y2={ys(v)} stroke={bgColor} strokeWidth={1} />
            <text x={P.l-4} y={ys(v)+4} fill="#4a6a4a" fontSize={9} textAnchor="end">{Math.round(v*100)}%</text>
          </g>
        ))}
        <line x1={P.l} x2={W-P.r} y1={ys(ATP)} y2={ys(ATP)} stroke="#A8C83244" strokeWidth={1} strokeDasharray="5,3" />
        <text x={W-P.r+3} y={ys(ATP)+4} fill="#A8C83277" fontSize={8}>ATP</text>
        <path d={area} fill={color} opacity={0.07} />
        <path d={path}  fill="none" stroke={color} strokeWidth={2} />
        {pts.map((p, i) => (
          <circle key={i} cx={xs(p.x)} cy={ys(p.y)} r={2.5}
            fill={p.y >= ATP ? '#4ade80' : '#f87171'} opacity={0.8} />
        ))}
      </svg>
    </div>
  );
}

// ── RGServeSpeedChart ─────────────────────────────────────────────────────────
function RGServeSpeedChart({ log, color }) {
  if (!log || log.length < 3) return null;
  const W = 420, H = 100, P = { l: 38, r: 16, t: 12, b: 24 };
  const withKmh = log.filter(l => l.kmh);
  if (!withKmh.length) return null;
  const maxK = Math.max(240, ...withKmh.map(l => l.kmh));
  const minK = Math.min(80,  ...withKmh.map(l => l.kmh));
  const xs = i  => P.l + (i / Math.max(log.length-1, 1)) * (W - P.l - P.r);
  const ys = km => P.t + (1 - (km - minK) / (maxK - minK)) * (H - P.t - P.b);
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 9, letterSpacing: 3, color: '#4a6a4a', marginBottom: 8 }}>VELOCIDADE km/h  ● 1º saque  ○ 2º saque  (opacidade = ganhou/perdeu)</div>
      <svg width={W} height={H} style={{ overflow: 'visible', maxWidth: '100%' }}>
        {[185, 165].map(ref => (
          <g key={ref}>
            <line x1={P.l} x2={W-P.r} y1={ys(ref)} y2={ys(ref)} stroke="#A8C83222" strokeWidth={1} strokeDasharray="4,3" />
            <text x={P.l-4} y={ys(ref)+4} fill="#A8C83255" fontSize={8} textAnchor="end">{ref}</text>
          </g>
        ))}
        {log.map((l, i) => l.kmh ? (
          <circle key={i} cx={xs(i)} cy={ys(l.kmh)} r={l.isFirst ? 3.5 : 2.5}
            fill={l.isFirst ? color : '#A8C832'}
            stroke={l.won ? 'none' : 'rgba(255,80,80,0.6)'} strokeWidth={1}
            opacity={l.won ? 0.85 : 0.35} />
        ) : null)}
      </svg>
    </div>
  );
}

// ── RGServeDirChart ───────────────────────────────────────────────────────────
function RGServeDirChart({ log, color, rgp }) {
  if (!log || log.length < 3) return null;
  const dirs = ['T','BODY','WIDE'].map(dir => {
    const pts = log.filter(l => l.dir === dir);
    const won = pts.filter(l => l.won).length;
    return { dir, n: pts.length, won, pct: pts.length > 0 ? won/pts.length : null };
  }).filter(d => d.n > 0);
  if (!dirs.length) return null;
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 9, letterSpacing: 3, color: '#4a6a4a', marginBottom: 12 }}>WIN% POR DIREÇÃO  (linha = ref. ATP 63%)</div>
      {dirs.map(d => {
        const clr = d.pct >= 0.63 ? '#4ade80' : d.pct >= 0.50 ? rgp.lime : '#f87171';
        return (
          <div key={d.dir} style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 10, color: rgp.faint, letterSpacing: 2 }}>{d.dir}</span>
              <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 14, fontWeight: 700, color: clr }}>
                {d.won}/{d.n} ({d.pct != null ? Math.round(d.pct*100)+'%' : '—'})
              </span>
            </div>
            <div style={{ height: 6, background: rgp.border, position: 'relative' }}>
              <div style={{ height: '100%', width: `${(d.pct??0)*100}%`, background: clr, opacity: 0.75 }} />
              <div style={{ position: 'absolute', left: '63%', top: 0, bottom: 0, width: 1, background: `${rgp.lime}55` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
