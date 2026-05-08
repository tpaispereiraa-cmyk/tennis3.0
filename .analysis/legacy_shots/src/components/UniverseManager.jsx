/**
 * UniverseManager.jsx
 * ─────────────────────────────────────────────────────────────────
 * Modo Universo — Calendário Anual Completo
 *
 * • 128 jogadores no tour: 16 originais + 112 newgens (20-36 anos)
 * • 32 prospects: gerados entre 15-22 anos
 * • 43 torneios por temporada (4 GS + 9 M1000 + 9 ATP500 + 13 ATP250 + 6 Prospects + 2 Finals)
 * • Sistema de ranking estilo ATP com defesa de pontos
 * • Qualifying simulado antes de cada chave principal
 * • Brackets com seeding, BYE e wildcards
 * • Grand Slams: 5 sets | Demais: 3 sets
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { NAMED_PLAYERS, overallRating, getPlayerPhoto } from '../players.js';
import { generateNewgenBatch, generateNewgen } from '../NewgenSystem.js';
import { advanceSeason, currentAge, updateSurfaceStats, computeSurfaceIdentity, applyCareerAlcunhas } from '../DevelopmentSystem.js';
import { simulateMatchMid, simulateAndCollectHighlights } from '../Headless.jsx';
import { simulateMatchFast, courtKeyToSurface } from '../FastSimulation.js';
import {
  CALENDAR,
  roundIndexToLabel, computeTournamentPoints,
  selectTournamentPlayers, runQualifying, generateBracket, advanceRound,
  createSeasonSlots, updateSeasonSlots, buildATPFirstRound, prepareTournamentPackageSync,
} from '../TournamentSystem.js';
import {
  generateTournamentPreferences,
  migrateTournamentPreferences,
  getTournamentBonus,
} from '../TournamentPreferences.js';
import {
  createRankingStore, registerResult, computeRanking,
  resetProspectRanking, applyPointsDefense,
  TOURNAMENT_POINTS,
} from '../RankingSystem.js';
import TournamentBracket from './TournamentBracket.jsx';
import { PLAY_STYLES, SIGNATURE_SHOTS, RALLY_PATTERNS } from '../styles.js';
import { gameTick, initGameState, onBounce } from '../game.js';
import { GameState, TRAIL_LEN, TIMING } from '../constants.js';
import { mag3 } from '../math.js';
import { processSeasonRetirements, computeRetirementChance, retirementRiskLabel, tryBecomeCoach } from '../RetirementSystem.js';
import { initPlayerFinance, awardPrizeMoney, processYearEndFinances } from '../FinanceSystem.js';
import { createEmptyPoolState, assignNewgenPhoto, releaseRetiredPhotos } from '../NewgenImagePool.js';
import { generateKits, getAppearance } from '../pixel/appearances.js';
import { ovrTier, potentialNarrative, scoutSummary, topStrengths } from '../ScoutProfile.js';
import { updatePerceptions } from '../CircuitPerceptions.js';
import {
  rollPreTournamentInjury, shouldWithdraw, tickInjury,
  applyInjuryToPlayer, decayPhysicalCondition, recoverPhysicalCondition,
  ensurePhysicalCondition, buildInjuryEvent, injuryStatusLabel,
  applyPreTournamentInjuries,
} from '../InjurySystem.js';
import DefinitiveME from '../NEWME1.0.jsx';
import MatchOverScreen from './MatchOverScreen.jsx';
import TracePanel from './TracePanel.jsx';
import DebugLog from './DebugLog.jsx';
import {
  applyFormModifier, calcTournamentFormDeltas,
  applySeasonReset, clampFormPoints, FORM_POINTS_TABLE, updateRecentForm,
} from '../formas.jsx';
import { RivalrySystem } from '../RivalrySystem.js';
import ChronicleEngine from '../ChronicleEngine.js';
import { NewsEngine, generateTournamentNews, generateUpcomingTournamentNews, generateYearEndNews, genTournamentWrap, genCoachRetirement, generateSponsorNewsFromChronicleEvents, careerMomentNarrativeLine, genLifeEventArticle } from '../NewsEngine.js';
import { generateBreakingNewsArticles, generateBreakingTournamentFollowups } from '../NewsEngine.js';
import { appendTacticHistory, calcTrustDelta, applyTrustDelta, generateFastSimTacticEntry } from '../CoachTacticTracker.js';
import {
  generateCoachPool,
  updateAllCoachReputations,
  replenishCoachPool,
  serializeCoachPool,
  deserializeCoachPool,
  ageCoachPool,
  getCoachRetirementType,
} from '../CoachingSystem.js';
import { rollCoachSignature } from '../SignatureShots.js';
import {
  assignCoachesToAll,
  processCoachContracts,
  pickCoachForPlayer,
} from '../CoachContractSystem.js';
import {
  initPartnership,
  processAllPartnerships,
  generateSeasonGoal,
  getPartnershipState,
} from '../CoachPartnershipSystem.js';
import { computeHOFData } from '../HallOfFame.js';
import { narrateMatchLight } from '../MatchNarrator.js';
import { processPersonalityEvolution, migratePlayerPersonality } from '../PlayerPersonality.js';
import { updatePlayerPhaseTwo, pushMatchRating } from '../PhaseTwo.js';
import { migratePlayerLifeData } from '../PlayerLifeData.js';
import { rollLifeEvents, migrateLifeEventLog } from '../LifeEventSystem.js';
import {
  migrateBreakingNewsState,
  maybeTriggerBreakingNews,
  tickBreakingNews,
  processBreakingNewsSeasonClose,
} from '../BreakingNewsSystem.js';
import { initSponsorPool } from '../SponsorPool.js';
import {
  runSponsorshipWindow,
  monitorContracts,
  handleRetirementSponsors,
  handleScandal,
  computeSponsorRecords,
} from '../SponsorContractSystem.js';
import { computeRating } from '../IndividualRating.jsx';

// ═══════════════════════════════════════════════════════════════════
// SLIM MATCH RESULT — remove campos pesados antes de salvar no estado
// ═══════════════════════════════════════════════════════════════════
/**
 * Remove campos grandes do HeadlessResult que NÃO são necessários após
 * a partida ser armazenada no bracket. Esses campos (gs, log, ticks, points
 * e rallyLengths/serveLog dentro de stats) podem somar 50–150 KB por partida.
 * Num torneio com 63 partidas × 48 torneios na temporada = ~3 000–9 000 partidas
 * acumuladas no React state sem nunca serem lidas de volta.
 *
 * Campos MANTIDOS (todos lidos após o torneio):
 *   sets, setsDetail          → UI do bracket, rivalidade, records
 *   stats.a / stats.b         → IndividualRating (sem rallyLengths/serveLog)
 *   retirement                → eventos de lesão
 *   inMatchInjuryEvents       → eventos de lesão
 *   heat                      → exibição de heat no bracket
 *   traitMetrics              → métricas de traits sombra
 *   winner / loser            → identidade (já nos jogadores, mas por segurança)
 *
 * Campos REMOVIDOS (nunca lidos após armazenamento):
 *   gs                        → GameState completo (~30–80 KB de física/log)
 *   log                       → ~300 strings de debug
 *   ticks / points            → contadores de profiling
 *   stats.*.rallyLengths      → array de todos os rallies (~300 números)
 *   stats.*.serveLog          → array de todos os saques
 */
function slimMatchResult(res) {
  if (!res) return res;
  function slimStats(s) {
    if (!s) return s;
    const { rallyLengths: _rl, serveLog: _sl, ...rest } = s;
    return rest;
  }
  const { gs: _gs, log: _log, ticks: _ticks, points: _pts, ...slim } = res;
  if (slim.stats) {
    slim.stats = {
      a: slimStats(slim.stats.a),
      b: slimStats(slim.stats.b),
    };
  }
  return slim;
}

// ═══════════════════════════════════════════════════════════════════
// DESIGN TOKENS
// ═══════════════════════════════════════════════════════════════════

const U = {
  bg: '#080F0C', bgMid: '#0D1A12', bgPanel: '#111D16',
  bgLight: '#162419', bgHover: '#1C3020',
  clay: '#C4572A', clayLight: '#D97448',
  grass: '#2E7D32', grassLight: '#43A047',
  hard: '#1565C0', hardLight: '#1976D2',
  indoor: '#6A1B9A', indoorLight: '#7B1FA2',
  gold: '#FFD700', white: '#FFFFFF',
  textDim: 'rgba(255,255,255,.58)', textFaint: 'rgba(255,255,255,.26)',
  border: 'rgba(255,255,255,.08)', borderMid: 'rgba(255,255,255,.14)',
  display: "'Oswald', sans-serif", body: "'Source Sans 3', sans-serif",
  mono: "'DM Mono', monospace",
};

const SURFACE_COLOR = {
  CLAY:   { main: '#C4572A', light: '#D97448', label: 'Saibro',  icon: '🏺' },
  GRASS:  { main: '#2E7D32', light: '#43A047', label: 'Grama',   icon: '🌿' },
  HARD:   { main: '#1565C0', light: '#1976D2', label: 'Dura',    icon: '🏙️' },
  INDOOR: { main: '#6A1B9A', light: '#7B1FA2', label: 'Indoor',  icon: '🏟️' },
};

const CAT_COLOR = {
  GRAND_SLAM:    { main: '#FFD700', label: 'Grand Slam',    icon: '⭐' },
  MASTERS_1000:  { main: '#E040FB', label: 'Masters 1000',  icon: '🏆' },
  ATP_500:       { main: '#00BCD4', label: 'ATP 500',       icon: '🥇' },
  ATP_250:       { main: '#66BB6A', label: 'ATP 250',       icon: '🎯' },
  ATP_PROSPECTS: { main: '#FF7043', label: 'Prospects',     icon: '🌱' },
  FINALS:        { main: '#F44336', label: 'Finals',        icon: '👑' },
  PROSPECTS_FINALS: { main: '#FF7043', label: 'Prospects Finals', icon: '🌟' },
  OLYMPICS:      { main: '#1976D2', label: 'Jogos Olímpicos', icon: '🥇' },
};

// ═══════════════════════════════════════════════════════════════════
// CSS
// ═══════════════════════════════════════════════════════════════════

function injectCSS() {
  if (document.getElementById('uv-styles')) return;
  const css = `
.uv-screen{width:100%;min-height:100vh;background:#080F0C;font-family:'Source Sans 3',sans-serif;color:#FFF;overflow-y:auto;display:flex;flex-direction:column}
.uv-topbar{height:48px;background:#0D1A12;border-bottom:2px solid #C4572A;display:flex;align-items:center;padding:0 28px;gap:16px;flex-shrink:0;z-index:30}
.uv-back-btn{background:none;border:1px solid rgba(255,255,255,.10);color:rgba(255,255,255,.55);font-family:'Oswald',sans-serif;font-size:11px;font-weight:500;letter-spacing:2px;padding:4px 14px;cursor:pointer;text-transform:uppercase;transition:all .15s}
.uv-back-btn:hover{background:#1C3020;color:#FFF;border-color:rgba(255,255,255,.22)}
.uv-scroll{overflow-y:auto;scrollbar-width:thin;scrollbar-color:#162419 transparent}
.uv-scroll::-webkit-scrollbar{width:3px}
.uv-scroll::-webkit-scrollbar-thumb{background:#162419}
.uv-card{background:#111D16;border:1px solid rgba(255,255,255,.08);transition:all .18s}
.uv-card:hover{background:#162419;border-color:rgba(255,255,255,.16)}
.uv-btn{border:none;cursor:pointer;font-family:'Oswald',sans-serif;font-weight:600;letter-spacing:2px;text-transform:uppercase;transition:all .15s}
.uv-btn-primary{background:#C4572A;color:#FFF;padding:10px 24px;font-size:12px}
.uv-btn-primary:hover{background:#D97448}
.uv-btn-primary:disabled{background:#1C3020;color:rgba(255,255,255,.25);cursor:not-allowed}
.uv-btn-ghost{background:none;border:1px solid rgba(255,255,255,.14);color:rgba(255,255,255,.6);padding:6px 16px;font-size:10px}
.uv-btn-ghost:hover{background:#162419;color:#FFF;border-color:rgba(255,255,255,.28)}
.uv-bracket-match{background:#0D1A12;border:1px solid rgba(255,255,255,.08);padding:7px 10px;margin-bottom:3px;cursor:pointer;transition:all .13s;position:relative}
.uv-bracket-match:hover{background:#111D16;border-color:rgba(255,255,255,.18)}
.uv-bracket-match.won{border-left:3px solid #FFD700}
.uv-player-row{display:flex;align-items:center;padding:8px 16px;border-bottom:1px solid rgba(255,255,255,.06);cursor:pointer;transition:background .12s}
.uv-player-row:hover{background:#162419}
.uv-tab{background:none;border:none;border-bottom:2px solid transparent;color:rgba(255,255,255,.45);font-family:'Oswald',sans-serif;font-size:11px;font-weight:500;letter-spacing:2px;padding:10px 18px;cursor:pointer;text-transform:uppercase;transition:all .15s}
.uv-tab.active{color:#FFF;border-bottom-color:#C4572A}
.uv-tab:hover{color:#FFF}
@keyframes uv-up{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
.uv-a1{animation:uv-up .35s .04s both}
.uv-a2{animation:uv-up .35s .10s both}
.uv-a3{animation:uv-up .35s .16s both}
@keyframes uv-pulse{0%,100%{opacity:.5}50%{opacity:1}}
.uv-live{animation:uv-pulse 1.4s infinite}
  `;
  const el = document.createElement('style');
  el.id = 'uv-styles';
  el.textContent = css;
  document.head.appendChild(el);
}

// ═══════════════════════════════════════════════════════════════════
// PRÉ-JOGO — REDESIGN
// ═══════════════════════════════════════════════════════════════════

function injectPreGameCSS() {
  if (document.getElementById('pg-styles')) return;
  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Space+Mono:wght@400;700&family=Barlow+Condensed:ital,wght@0,300;0,400;0,600;0,700;0,800;1,400;1,600&display=swap');

    @keyframes pg-up    { from{opacity:0;transform:translateY(22px)} to{opacity:1;transform:translateY(0)} }
    @keyframes pg-in    { from{opacity:0} to{opacity:1} }
    @keyframes pg-left  { from{opacity:0;transform:translateX(-36px)} to{opacity:1;transform:translateX(0)} }
    @keyframes pg-right { from{opacity:0;transform:translateX(36px)} to{opacity:1;transform:translateX(0)} }
    @keyframes pg-scan  { 0%{transform:translateY(-100%)} 100%{transform:translateY(200vh)} }
    @keyframes pg-vs    { 0%{opacity:0;transform:scale(.3) rotate(-10deg)} 55%{transform:scale(1.1) rotate(2deg)} 100%{opacity:1;transform:scale(1) rotate(0)} }
    @keyframes pg-glow  { 0%,100%{opacity:.5} 50%{opacity:1} }
    @keyframes pg-shine { 0%{background-position:-300% 0} 100%{background-position:300% 0} }
    @keyframes pg-pulse-r { 0%,100%{box-shadow:0 0 20px var(--rc)33} 50%{box-shadow:0 0 50px var(--rc)77} }
    @keyframes pg-fill  { from{width:0} to{width:var(--tw)} }

    .pg-screen {
      position:fixed; inset:0; z-index:200;
      background:#02040A;
      font-family:'Barlow Condensed',sans-serif;
      overflow-y:auto; overflow-x:hidden;
      scrollbar-width:thin; scrollbar-color:#0d1117 transparent;
    }
    .pg-scan-line {
      position:fixed; top:0; left:0; right:0; height:1px;
      background:linear-gradient(90deg,transparent,rgba(255,255,255,.18),transparent);
      animation:pg-scan 9s linear infinite; pointer-events:none; z-index:9999;
    }
    .pg-glass {
      background:rgba(255,255,255,.026);
      border:1px solid rgba(255,255,255,.07);
      backdrop-filter:blur(2px);
    }
    .pg-label {
      font-family:'Space Mono',monospace; font-size:8px;
      letter-spacing:.26em; text-transform:uppercase; color:rgba(255,255,255,.3);
    }
    .pg-skip {
      background:none; border:1px solid rgba(255,255,255,.1);
      color:rgba(255,255,255,.35); font-family:'Space Mono',monospace;
      font-size:9px; letter-spacing:.18em; padding:6px 16px;
      cursor:pointer; text-transform:uppercase; transition:all .2s;
    }
    .pg-skip:hover { border-color:rgba(255,255,255,.3); color:rgba(255,255,255,.7); }
    .pg-cta-main {
      background:linear-gradient(135deg,#B84E24 0%,#D4723E 100%);
      border:none; color:#FFF;
      font-family:'Bebas Neue',sans-serif; font-size:26px; letter-spacing:.32em;
      padding:18px 72px; cursor:pointer; position:relative; overflow:hidden;
      clip-path:polygon(16px 0,100% 0,calc(100% - 16px) 100%,0 100%);
      transition:transform .2s,box-shadow .2s;
      box-shadow:0 8px 48px rgba(180,78,36,.45);
    }
    .pg-cta-main::after {
      content:''; position:absolute; inset:0;
      background:linear-gradient(90deg,transparent,rgba(255,255,255,.16),transparent);
      background-size:300% 100%; animation:pg-shine 2.8s ease-in-out infinite;
    }
    .pg-cta-main:hover { transform:translateY(-3px); box-shadow:0 14px 56px rgba(180,78,36,.6); }
    .pg-cta-sec {
      background:none; cursor:pointer; transition:all .15s;
      font-family:'Space Mono',monospace; font-size:9px;
      letter-spacing:.2em; text-transform:uppercase; padding:10px 28px;
    }
    .pg-bar-track {
      height:5px; border-radius:3px; overflow:hidden;
      background:rgba(255,255,255,.055); display:flex; position:relative;
    }
    .pg-bar-a { border-radius:3px 0 0 3px; transition:width .7s ease; }
    .pg-bar-b { border-radius:0 3px 3px 0; flex:1; }
    .pg-midline {
      position:absolute; left:50%; top:0; bottom:0; width:1px;
      background:rgba(255,255,255,.1); transform:translateX(-50%);
    }
  `;
  const el = document.createElement('style');
  el.id = 'pg-styles'; el.textContent = css;
  document.head.appendChild(el);
}

// ── Surface DNA ────────────────────────────────────────────────────
const PG_SURF = {
  CLAY:   { key:'CLAY',   label:'Saibro',      color:'#C4572A', glow:'rgba(196,87,42,', bg:'rgba(196,87,42,.12)' },
  GRASS:  { key:'GRASS',  label:'Grama',        color:'#2E7D32', glow:'rgba(46,125,50,',  bg:'rgba(46,125,50,.12)'  },
  HARD:   { key:'HARD',   label:'Quadra Dura', color:'#1565C0', glow:'rgba(21,101,192,', bg:'rgba(21,101,192,.12)'  },
  INDOOR: { key:'INDOOR', label:'Indoor',      color:'#6A1B9A', glow:'rgba(106,27,154,', bg:'rgba(106,27,154,.12)'  },
};

// ── Configs ────────────────────────────────────────────────────────
const PG_CAT = {
  GRAND_SLAM:    { label:'Grand Slam',    color:'#FFD700', icon:'⭐' },
  MASTERS_1000:  { label:'Masters 1000',  color:'#E040FB', icon:'🏆' },
  ATP_500:       { label:'ATP 500',       color:'#00BCD4', icon:'🥇' },
  ATP_250:       { label:'ATP 250',       color:'#66BB6A', icon:'🎯' },
  FINALS:        { label:'Finals',        color:'#F44336', icon:'👑' },
  ATP_PROSPECTS: { label:'Prospects',     color:'#FF7043', icon:'🌱' },
};

const PG_ROUND = {0:'1ª Ronda',1:'2ª Ronda',2:'3ª Ronda',3:'Oitavas',4:'Quartas',5:'Semifinal',6:'Final'};

const PG_STYLE = {
  AGG_BASELINER: { label:'Agg. Baseliner', icon:'⚡', color:'#FF6B35' },
  CTR_PUNCHER:   { label:'Counter-Puncher',icon:'🛡️', color:'#FF4444' },
  ALL_COURT:     { label:'All-Court',      icon:'🎭', color:'#FFD700' },
  SRV_VOL:       { label:'Serve & Volley', icon:'🏃', color:'#00FF88' },
  BIG_SERVER:    { label:'Big Server',     icon:'💣', color:'#AA44FF' },
  RETRIEVER:     { label:'Retriever',      icon:'🐢', color:'#00AAFF' },
  TAKEALLRISK:   { label:'Take All Risk',  icon:'🎲', color:'#FF69B4' },
  GRINDER:       { label:'Grinder',        icon:'⚙️', color:'#FFA726' },
  PWR_BASE:      { label:'Power Baseline', icon:'🔥', color:'#FF5722' },
  TACT_TEC:      { label:'Tactical',       icon:'🧠', color:'#26C6DA' },
  NET_SPEC:      { label:'Net Spec.',      icon:'🕸️', color:'#66BB6A' },
  ADPT_TAC:      { label:'Adaptativo',     icon:'🔄', color:'#AB47BC' },
  MOMENTUM_PLAYER:{ label:'Momentum',      icon:'📈', color:'#EF5350' },
};

const PG_RIVALRY = {
  CLASSIC:      { label:'Rivalidade Clássica',  color:'#FFD700', icon:'⚔️'  },
  DOMINATION:   { label:'Dominância',           color:'#EF5350', icon:'👑'  },
  GIANT_KILLER: { label:'Caçador de Gigantes',  color:'#FF9800', icon:'🎯'  },
  GRUDGE:       { label:'Guerra de Atrito',      color:'#E91E63', icon:'🔥'  },
  FINALS_CURSE: { label:'Maldição das Finais',   color:'#AA44FF', icon:'🏆'  },
  THRONE_RIVALS:{ label:'Rivais do Trono',       color:'#00BCD4', icon:'💎'  },
  ERA_CLASH:    { label:'Choque de Eras',        color:'#66BB6A', icon:'🌀'  },
};

const PG_STATUS_WEIGHT = { LEGENDARY:4, INTENSE:3, ACTIVE:2, BREWING:1, FROZEN:0 };

const SIG_SHOT_LABEL = {
  INSIDE_OUT_FH:'Inside-Out FH', TOPSPIN_CROSS:'Topspin Cross', SHORT_ANGLE_FH:'Ângulo Curto',
  SLICE_BH:'Slice BH', DROP_SHOT:'Drop Shot', BIG_SERVE:'Saque Dom.', VOLLEY_FINISH:'Voleio',
  BANANA_BH:'Banana BH', DTL_BH:'BH DTL', FLAT_WINNER:'Flat Winner',
};
const RALLY_PAT_LABEL = {
  CROSS_HEAVY:'Cruzado Dom.', DTL_HUNTER:'Caçador DTL', DEEP_GRINDER:'Fundão',
  SHORT_ANGLE_BUILDER:'Ângulo Curto', CENTRE_CONTROL:'Centro', AGGRESSIVE_EARLY:'Ataque Precoce',
  SERVE_PLUS_ONE:'Serve+1', NET_APPROACH:'Rede', DEFENSIVE_BASE:'Defesa Base', RHYTHM_DISRUPTION:'Quebra Ritmo',
};

// ── Helpers ────────────────────────────────────────────────────────
function pgSurfKey(courtKey) {
  if (!courtKey) return 'HARD';
  if (courtKey === 'ROLAND_GARROS') return 'CLAY';
  if (courtKey === 'WIMBLEDON')     return 'GRASS';
  if (courtKey === 'INDOOR')        return 'INDOOR';
  return 'HARD';
}

function pgOvrColor(v) {
  return v >= 90 ? '#FFD700' : v >= 82 ? '#00BCD4' : v >= 72 ? '#66BB6A' : '#94a3b8';
}

function pgSeasonStats(playerId, hist, year) {
  let wins = 0, losses = 0, titles = 0, gsWins = 0;
  Object.values(hist ?? {}).forEach(res => {
    const s = res._season ?? res.tournament?.season ?? res.tournament?.year;
    if (s !== year) return;
    const cat = res.tournament?.category;
    if (res._slim) {
      (res.matches ?? []).forEach(({ w, l }) => { if (w === playerId) wins++; else if (l === playerId) losses++; });
      if (res.champion?.id === playerId) { titles++; if (cat==='GRAND_SLAM') gsWins++; }
    } else {
      const { bracket, tournament } = res;
      if (!bracket?.rounds) return;
      bracket.rounds.forEach(rnd => rnd.forEach(m => {
        if (!m.winner || m.isBye) return;
        if (m.winner.id === playerId) wins++;
        else { const l = m.playerA?.id===m.winner.id ? m.playerB : m.playerA; if (l?.id===playerId) losses++; }
      }));
      if (bracket.champion?.id === playerId) { titles++; if (tournament?.category==='GRAND_SLAM') gsWins++; }
    }
  });
  return { wins, losses, titles, gsWins };
}

function pgH2H(idA, idB, rivalrySystem, hist) {
  const rivalry = rivalrySystem?.getRivalry?.(idA, idB) || null;
  let rawA = 0, rawB = 0, lastMatches = [];
  Object.values(hist ?? {}).forEach(res => {
    if (res._slim) {
      (res.matches ?? []).forEach(({ w, l }) => {
        if (!((w===idA&&l===idB)||(w===idB&&l===idA))) return;
        if (w===idA) rawA++; else rawB++;
        lastMatches.push({ winnerId:w, year:res._season, tourName:res.tournament?.name, cat:res.tournament?.category });
      });
    } else {
      const { bracket, tournament } = res;
      if (!bracket?.rounds) return;
      bracket.rounds.forEach((rnd, ri) => rnd.forEach(m => {
        if (!m.winner || m.isBye) return;
        const ids = [m.playerA?.id, m.playerB?.id].filter(Boolean);
        if (!ids.includes(idA) || !ids.includes(idB)) return;
        const w = m.winner?.id;
        if (w===idA) rawA++; else if (w===idB) rawB++;
        lastMatches.push({ winnerId:w, year:tournament?.season, tourName:tournament?.name, cat:tournament?.category, roundIdx:ri });
      }));
    }
  });
  const wA = rivalry ? (rivalry.p1Id===idA ? rivalry.p1Wins : rivalry.p2Wins) : rawA;
  const wB = rivalry ? (rivalry.p1Id===idA ? rivalry.p2Wins : rivalry.p1Wins) : rawB;
  return { wA, wB, total: wA+wB, rivalry, lastMatches: lastMatches.slice(-6).reverse() };
}

// ── Edge computation (who leads each dimension) ────────────────────
function computeEdges(pA, pB, surfKey) {
  const a = pA.attrs ?? {}, b = pB.attrs ?? {};
  const dims = [
    { key:'serve',    label:'SAQUE',     icon:'💥',
      sA:(a.srv1Vel??70)*.55+(a.srv2Vel??60)*.25+(a.srv1Pct??65)*.2,
      sB:(b.srv1Vel??70)*.55+(b.srv2Vel??60)*.25+(b.srv1Pct??65)*.2 },
    { key:'return',   label:'RETORNO',   icon:'🔄',
      sA:(a.retorno??a.consistencia??70)*.5+(a.reflexos??a.velocidade??65)*.3+(a.bhPotencia??70)*.2,
      sB:(b.retorno??b.consistencia??70)*.5+(b.reflexos??b.velocidade??65)*.3+(b.bhPotencia??70)*.2 },
    { key:'baseline', label:'FUNDO',     icon:'🎾',
      sA:(a.fhPotencia??70)*.4+(a.consistencia??70)*.35+(a.bhPotencia??70)*.25,
      sB:(b.fhPotencia??70)*.4+(b.consistencia??70)*.35+(b.bhPotencia??70)*.25 },
    { key:'mental',   label:'MENTAL',    icon:'🧠',
      sA:(a.mentalidade??a.pressao??a.clutch??70),
      sB:(b.mentalidade??b.pressao??b.clutch??70) },
    { key:'movement', label:'FÍSICO',    icon:'⚡',
      sA:(a.velocidade??70)*.6+(a.resistencia??a.stamina??70)*.4,
      sB:(b.velocidade??70)*.6+(b.resistencia??b.stamina??70)*.4 },
    { key:'form',     label:'FORMA',     icon:'📈',
      sA:50+Math.max(-28,Math.min(28,(pA.formPoints??0)*1.1)),
      sB:50+Math.max(-28,Math.min(28,(pB.formPoints??0)*1.1)) },
  ];
  // Surface advantage
  const saA = pA.surfaceIdentity, saB = pB.surfaceIdentity;
  dims.push({ key:'surface', label:'SUPERFÍCIE', icon:'🏟️',
    sA: saA?.surface?.toUpperCase()===surfKey ? 55+(saA.winRate??52) : 48,
    sB: saB?.surface?.toUpperCase()===surfKey ? 55+(saB.winRate??52) : 48,
  });

  return dims.map(d => {
    const tot = d.sA + d.sB;
    const pA2 = tot > 0 ? (d.sA/tot)*100 : 50;
    const diff = d.sA - d.sB;
    const edge = Math.abs(diff) < 2.5 ? 'EVEN' : diff > 0 ? 'A' : 'B';
    const mag = Math.min(1, Math.abs(diff) / 22);
    return { ...d, pA: pA2, pB: 100-pA2, edge, mag };
  });
}

// ── Matchup narrative ──────────────────────────────────────────────
function pgMatchupNote(sA, sB) {
  const notes = {
    'AGG_BASELINER_vs_CTR_PUNCHER': 'O Baseliner busca terminar cedo; o Counter-Puncher absorve e replica no timing.',
    'AGG_BASELINER_vs_RETRIEVER':   'Winner vs. parede. O Retriever devolve tudo — quantos erros precisa para cair?',
    'AGG_BASELINER_vs_GRINDER':     'Agressividade vs. topspin pesado. O Grinder vai segurar até o Baseliner errar.',
    'SRV_VOL_vs_CTR_PUNCHER':       'Subida à rede vs. o melhor passador — cada voleio é uma aposta.',
    'BIG_SERVER_vs_CTR_PUNCHER':    'Saque rápido vs. rally longo. Quem dita o ritmo define a partida.',
    'BIG_SERVER_vs_BIG_SERVER':     'Batalha de saques. O primeiro break vai valer ouro.',
    'GRINDER_vs_RETRIEVER':         'Fundão pesado vs. paciência — dois jogadores que não erram primeiro.',
    'ALL_COURT_vs_ALL_COURT':       'Dois all-courters — decide nas transições e nos grandes momentos.',
    'TAKEALLRISK_vs_CTR_PUNCHER':   'Caos vs. controle. O All-Risk cria situações impossíveis; o Counter precisa de paciência.',
    'THRONE_RIVALS_default':        'Dois que já estiveram no topo — cada ponto carrega o peso do legado.',
  };
  const k1 = `${sA}_vs_${sB}`, k2 = `${sB}_vs_${sA}`;
  return notes[k1] || notes[k2] || 'Confronto equilibrado em estilos — detalhes de execução decidem.';
}

// ── Pre-match paragraph ────────────────────────────────────────────
function pgNarrative(pA, pB, h2h, surfKey, tournament) {
  const nA = pA.name, nB = pB.name;
  const surfLabel = { CLAY:'saibro', GRASS:'grama', HARD:'quadra dura', INDOOR:'indoor' }[surfKey] ?? 'quadra';
  const saA = pA.surfaceIdentity, saB = pB.surfaceIdentity;
  const aHome = saA?.surface?.toUpperCase() === surfKey;
  const bHome = saB?.surface?.toUpperCase() === surfKey;
  const fpA = pA.formPoints ?? 0, fpB = pB.formPoints ?? 0;
  const rivalry = h2h.rivalry;
  const rankA = pA.rankPosition ?? 99, rankB = pB.rankPosition ?? 99;
  const rankDiff = Math.abs(rankA - rankB);

  if (rivalry?.status === 'LEGENDARY') {
    return `Uma rivalidade lendária chega a ${tournament?.name ?? 'este torneio'}. ${nA} e ${nB} acumulam ${h2h.wA}–${h2h.wB} em ${h2h.total} encontros ao longo de ${rivalry.seasons?.length ?? '?'} temporadas. ${aHome ? `${nA} está em casa no ${surfLabel}.` : bHome ? `${nB} está em casa nesta superfície.` : `Nenhum dos dois tem vantagem clara de superfície.`} Seja qual for o resultado, este é mais um capítulo de uma história que o circuito vai citar por anos.`;
  }
  if (rivalry?.status === 'INTENSE') {
    const leader = h2h.wA > h2h.wB ? nA : h2h.wB > h2h.wA ? nB : null;
    const trail  = leader === nA ? nB : nA;
    return leader
      ? `${nA} e ${nB} têm uma série intensa — ${h2h.wA}–${h2h.wB} no H2H. ${leader} lidera, mas a diferença é menor do que o circuito sente quando esses dois jogam. ${bHome ? `${nB} tem o ${surfLabel} como trunfo.` : aHome ? `${nA} tem a superfície do seu lado.` : ''}`
      : `${nA} e ${nB} — uma série intensa que o H2H empatado não resume. Cada partida entre eles tem um peso que os números não capturam completamente.`;
  }
  if (h2h.total === 0) {
    if (rankDiff >= 25) {
      const fav = rankA < rankB ? nA : nB;
      return `Primeiro encontro entre ${nA} e ${nB}. ${fav} chega com vantagem de ranking, mas estreias têm lógica própria — sem H2H, sem padrão estabelecido. ${aHome ? `${nA} tem o ${surfLabel} do seu lado.` : bHome ? `${nB} tem a superfície como argumento.` : ''}`;
    }
    return `Primeira vez que ${nA} e ${nB} se encontram profissionalmente. Sem H2H para consultar — os dois vão se ler em tempo real. ${aHome ? `${nA} chega em terreno familiar no ${surfLabel}.` : bHome ? `${nB} está em casa nesta superfície.` : ''}`;
  }
  if (aHome && !bHome && fpA > 8)
    return `${nA} em forma e em casa no ${surfLabel}. Uma combinação pesada para ${nB}, que vai precisar de um nível excepcional para inverter um H2H de ${h2h.wA}–${h2h.wB} nessas condições.`;
  if (bHome && !aHome && fpB > 8)
    return `${nB} em forma e em casa no ${surfLabel}. ${nA} chega com H2H de ${h2h.wA}–${h2h.wB} — mas a superfície e o ritmo recente de ${nB} são argumentos pesados do outro lado.`;
  if (fpA > 15 && fpB < -8)
    return `${nA} atravessa um excelente momento; ${nB} busca reencontrar o melhor nível. O H2H de ${h2h.wA}–${h2h.wB} dá contexto histórico, mas forma atual é um argumento diferente.`;
  if (fpB > 15 && fpA < -8)
    return `${nB} em alta; ${nA} com resultados irregulares recentes. O H2H de ${h2h.wA}–${h2h.wB} é história — hoje o momento de ${nB} pode falar mais alto.`;
  const lead = h2h.wA > h2h.wB ? nA : h2h.wB > h2h.wA ? nB : null;
  const gap  = Math.abs(h2h.wA - h2h.wB);
  if (lead && gap >= 3)
    return `${lead} chega com vantagem consistente no H2H — ${h2h.wA}–${h2h.wB} em ${h2h.total} encontros. O adversário vai precisar mudar algo estrutural para inverter essa narrativa. ${aHome ? `${nA} tem o ${surfLabel} do seu lado.` : bHome ? `${nB} tem a superfície como argumento.` : ''}`;
  return `${nA} e ${nB} chegam a mais um duelo com H2H apertado — ${h2h.wA}–${h2h.wB} em ${h2h.total} partidas. Sem favorito claro além dos dados de hoje. ${aHome ? `${nA} tem o ${surfLabel} do seu lado.` : bHome ? `${nB} está em casa nesta superfície.` : ''}`;
}

// ════════════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ════════════════════════════════════════════════════════════════════

function PGPhoto({ player, size=70 }) {
  const photo = getPlayerPhoto(player);
  const [ok, setOk] = React.useState(!!photo);
  const initials = player?.name?.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase() ?? '??';
  const base = {
    width:size, height:size, borderRadius:3, overflow:'hidden', flexShrink:0,
    background:`${player?.color??'#111'}22`,
    border:`1.5px solid ${player?.color??'rgba(255,255,255,.1)'}44`,
    display:'flex', alignItems:'center', justifyContent:'center',
    fontSize:size*.33, fontWeight:800, color:'#fff', fontFamily:"'Bebas Neue',sans-serif",
  };
  if (photo&&ok) return (
    <div style={base}>
      <img src={photo} alt={player?.name} onError={()=>setOk(false)}
        style={{width:'100%',height:'100%',objectFit:'cover',objectPosition:'top center'}} />
    </div>
  );
  return <div style={base}>{initials}</div>;
}

// ── Mini form dots ─────────────────────────────────────────────────
function PGFormDots({ player, count=8 }) {
  const hist = (player.formHistory ?? []).slice(-count).reverse();
  if (!hist.length) return <span style={{fontFamily:"'Space Mono',monospace",fontSize:8,color:'rgba(255,255,255,.18)'}}>—</span>;
  return (
    <div style={{display:'flex',gap:3,alignItems:'center'}}>
      {hist.map((e,i) => {
        const won = e.delta > 0;
        const c = won ? '#2ECC71' : '#EF5350';
        const title = `${e.tournamentName??''} ${e.year??''} (${won?'V':'D'})`;
        return <div key={i} title={title} style={{
          width:7, height:7, borderRadius:'50%', flexShrink:0,
          background:won?c:'transparent', border:`1.5px solid ${c}`,
          boxShadow:won?`0 0 5px ${c}55`:'none',
        }}/>;
      })}
    </div>
  );
}

// ── Player side panel ──────────────────────────────────────────────
function PGPlayerCard({ player, side, seasonStats, surfKey, colorOther, delay=0 }) {
  const ovr  = overallRating(player.attrs);
  const ovrC = pgOvrColor(ovr);
  const sty  = PG_STYLE[player.styleId] ?? { label:player.styleId??'—', icon:'🎾', color:'#94a3b8' };
  const fp   = player.formPoints ?? 0;
  const formC = fp > 10 ? '#2ECC71' : fp < -10 ? '#EF5350' : '#FFD700';
  const formLbl = fp > 15 ? '↑ EM ALTA' : fp > 5 ? '↑ BOA FORMA' : fp < -15 ? '↓ EM BAIXA' : fp < -5 ? '↓ IRREGULAR' : '→ NEUTRO';
  const isLeft = side === 'left';
  const pColor = player.color ?? sty.color ?? '#888';
  const saHome = player.surfaceIdentity?.surface?.toUpperCase() === surfKey;

  const sigIds = player.signatureShots ?? (player.signatureShot ? [player.signatureShot] : null);
  const sigId  = sigIds?.[0];

  const attrs = [
    { k:'FH',   v: player.attrs?.fhPotencia??70,   c:'#FF6B35' },
    { k:'BH',   v: player.attrs?.bhPotencia??70,   c:'#FFB300' },
    { k:'SRV',  v: player.attrs?.srv1Vel??70,      c:'#AA44FF' },
    { k:'CONS', v: player.attrs?.consistencia??70, c:'#00BCD4' },
    { k:'MENT', v: player.attrs?.mentalidade??player.attrs?.pressao??70, c:'#E91E63' },
    { k:'VEL',  v: player.attrs?.velocidade??70,   c:'#2ECC71' },
  ];

  return (
    <div style={{
      display:'flex', flexDirection:'column', gap:10,
      animation:`${isLeft?'pg-left':'pg-right'} .5s ${delay}s both`,
    }}>
      {/* Main card */}
      <div className="pg-glass" style={{
        padding:'16px', borderTop:`2px solid ${pColor}99`,
        position:'relative', overflow:'hidden',
      }}>
        {/* Color wash */}
        <div style={{
          position:'absolute', inset:0, pointerEvents:'none',
          background:`radial-gradient(ellipse 70% 50% at ${isLeft?'0%':'100%'} 0%, ${pColor}09 0%, transparent 70%)`,
        }}/>

        {/* Header */}
        <div style={{display:'flex', alignItems:'flex-start', gap:12, marginBottom:14, position:'relative'}}>
          <PGPhoto player={player} size={62} />
          <div style={{flex:1, minWidth:0}}>
            <div style={{
              fontFamily:"'Bebas Neue',sans-serif", fontSize:24, letterSpacing:'.06em',
              lineHeight:.95, color:'#FFF', marginBottom:5,
              overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
            }}>{player.name}</div>
            <div style={{display:'flex', gap:5, flexWrap:'wrap', marginBottom:7}}>
              <span style={{
                fontFamily:"'Space Mono',monospace", fontSize:8, padding:'2px 7px',
                background:`${sty.color}12`, border:`1px solid ${sty.color}35`,
                color:sty.color, letterSpacing:'.07em',
              }}>{sty.icon} {sty.label}</span>
              {player.nationality && <span style={{
                fontFamily:"'Space Mono',monospace", fontSize:8, padding:'2px 7px',
                background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.09)',
                color:'rgba(255,255,255,.45)', letterSpacing:'.06em',
              }}>{player.nationality}</span>}
              {saHome && <span style={{
                fontFamily:"'Space Mono',monospace", fontSize:8, padding:'2px 7px',
                background:'rgba(255,215,0,.07)', border:'1px solid rgba(255,215,0,.2)',
                color:'#FFD700', letterSpacing:'.06em',
              }}>🏡 CASA</span>}
            </div>
            <div style={{display:'flex', gap:16, alignItems:'flex-end'}}>
              <div>
                <div className="pg-label">RANK</div>
                <div style={{fontFamily:"'Bebas Neue',sans-serif", fontSize:28,
                  color:player.rankPosition===1?'#FFD700':'rgba(255,255,255,.9)',
                  lineHeight:1, letterSpacing:'.04em'}}>
                  #{player.rankPosition??'—'}
                </div>
              </div>
              <div>
                <div className="pg-label">NÍVEL</div>
                <div style={{fontFamily:"'Bebas Neue',sans-serif", fontSize:28,
                  color:ovrTier(ovr).color, lineHeight:1, letterSpacing:'.04em'}}>{ovrTier(ovr).grade}</div>
              </div>
              <div>
                <div className="pg-label">IDADE</div>
                <div style={{fontFamily:"'Bebas Neue',sans-serif", fontSize:22,
                  color:'rgba(255,255,255,.6)', lineHeight:1.1}}>{player.age??'—'}a</div>
              </div>
            </div>
          </div>
        </div>

        {/* Sig shot + rally */}
        {(sigId || player.rallyPattern) && (
          <div style={{display:'flex', gap:7, marginBottom:12}}>
            {sigId && (
              <div style={{flex:1, padding:'5px 9px',
                background:'rgba(255,107,53,.07)', border:'1px solid rgba(255,107,53,.22)',borderRadius:2}}>
                <div className="pg-label" style={{marginBottom:2}}>GOLPE PRINCIPAL</div>
                <div style={{fontSize:11,fontWeight:700,color:'#FF6B35'}}>
                  ⭐ {SIG_SHOT_LABEL[sigId]??sigId}
                  {sigIds.length>1 && <span style={{color:'rgba(255,107,53,.5)',fontSize:9}}> +{sigIds.length-1}</span>}
                </div>
              </div>
            )}
            {player.rallyPattern && (
              <div style={{flex:1, padding:'5px 9px',
                background:'rgba(0,188,212,.06)', border:'1px solid rgba(0,188,212,.18)',borderRadius:2}}>
                <div className="pg-label" style={{marginBottom:2}}>PADRÃO RALLY</div>
                <div style={{fontSize:11,fontWeight:700,color:'#00BCD4'}}>
                  🎯 {RALLY_PAT_LABEL[player.rallyPattern]??player.rallyPattern}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Strengths — qualitative, sem números */}
        <div style={{display:'flex',flexDirection:'column',gap:4,marginBottom:11}}>
          {topStrengths(player.attrs, 3).map(s => (
            <div key={s.key} style={{display:'flex',alignItems:'center',gap:7}}>
              <div className="pg-label" style={{width:38,flexShrink:0,color:s.catColor}}>{s.label.split(' ')[0].toUpperCase()}</div>
              <div style={{flex:1,height:3,borderRadius:2,background:'rgba(255,255,255,.055)',overflow:'hidden'}}>
                <div style={{height:'100%',width:`${s.tier==='elite'?92:s.tier==='great'?76:60}%`,borderRadius:2,
                  background:`linear-gradient(90deg,${s.catColor},${s.catColor}88)`,
                  boxShadow:`0 0 4px ${s.catColor}40`}}/>
              </div>
              <div style={{fontFamily:"'Space Mono',monospace",fontSize:7,
                color:s.catColor,width:36,textAlign:'right',letterSpacing:'.04em'}}>
                {s.tier==='elite'?'ELITE':s.tier==='great'?'FORTE':'SÓLIDO'}
              </div>
            </div>
          ))}
        </div>

        {/* Form */}
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <span style={{fontFamily:"'Space Mono',monospace",fontSize:8,color:formC,
            fontWeight:700,letterSpacing:'.1em'}}>{formLbl}</span>
          <PGFormDots player={player} count={8} />
        </div>
      </div>

      {/* Season mini-card */}
      <div className="pg-glass" style={{padding:'11px 14px'}}>
        <div className="pg-label" style={{marginBottom:8}}>TEMPORADA</div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:4,textAlign:'center'}}>
          {[
            {l:'V-D', v:`${seasonStats.wins}-${seasonStats.losses}`, c:'rgba(255,255,255,.75)'},
            {l:'Títulos', v:seasonStats.titles, c:seasonStats.titles>0?'#FFD700':'rgba(255,255,255,.18)'},
            {l:'GS', v:seasonStats.gsWins, c:seasonStats.gsWins>0?'#E91E63':'rgba(255,255,255,.18)'},
            {l:'Form', v:fp>0?`+${fp}`:fp, c:formC},
          ].map(s => (
            <div key={s.l}>
              <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:18,
                color:s.c,letterSpacing:'.03em',lineHeight:1}}>{s.v}</div>
              <div className="pg-label" style={{marginTop:1,fontSize:7}}>{s.l}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Edge Battle center column ──────────────────────────────────────
function PGEdgeBattle({ edges, pA, pB, colorA, colorB }) {
  const edgeCountA = edges.filter(e=>e.edge==='A').length;
  const edgeCountB = edges.filter(e=>e.edge==='B').length;

  return (
    <div style={{display:'flex',flexDirection:'column',gap:8}}>
      {/* Header */}
      <div className="pg-glass" style={{padding:'10px 14px'}}>
        <div className="pg-label" style={{textAlign:'center',marginBottom:8}}>VANTAGEM POR DIMENSÃO</div>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
          <div style={{textAlign:'left'}}>
            <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:30,color:colorA,lineHeight:1}}>{edgeCountA}</div>
            <div className="pg-label" style={{fontSize:7}}>{pA.name.split(' ').pop()}</div>
          </div>
          <div style={{fontFamily:"'Space Mono',monospace",fontSize:9,color:'rgba(255,255,255,.25)',letterSpacing:'.1em'}}>
            DIMENSÕES
          </div>
          <div style={{textAlign:'right'}}>
            <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:30,color:colorB,lineHeight:1}}>{edgeCountB}</div>
            <div className="pg-label" style={{fontSize:7}}>{pB.name.split(' ').pop()}</div>
          </div>
        </div>
      </div>

      {/* Each dimension */}
      {edges.map((d, i) => {
        const isA = d.edge==='A', isB = d.edge==='B', isE = d.edge==='EVEN';
        const cA = isA ? colorA : 'rgba(255,255,255,.1)';
        const cB = isB ? colorB : 'rgba(255,255,255,.08)';
        const edgeC = isA ? colorA : isB ? colorB : 'rgba(255,255,255,.3)';
        const nameA = pA.name.split(' ').pop();
        const nameB = pB.name.split(' ').pop();
        return (
          <div key={d.key} style={{animation:`pg-up .4s ${.3+i*.06}s both`}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:4}}>
              <div style={{
                fontFamily:"'Space Mono',monospace",fontSize:7,letterSpacing:'.15em',
                color: isA ? colorA : 'rgba(255,255,255,.2)',
                fontWeight: isA ? 700 : 400,
              }}>{isA ? `▶ ${nameA.toUpperCase()}` : `${Math.round(d.pA)}%`}</div>
              <div style={{display:'flex',alignItems:'center',gap:5}}>
                <span style={{fontSize:10}}>{d.icon}</span>
                <span style={{
                  fontFamily:"'Space Mono',monospace",fontSize:8,letterSpacing:'.18em',
                  color: isE ? 'rgba(255,255,255,.4)' : edgeC,
                  fontWeight:700,
                }}>{d.label}</span>
              </div>
              <div style={{
                fontFamily:"'Space Mono',monospace",fontSize:7,letterSpacing:'.15em',
                color: isB ? colorB : 'rgba(255,255,255,.2)',
                fontWeight: isB ? 700 : 400, textAlign:'right',
              }}>{isB ? `${nameB.toUpperCase()} ◀` : `${Math.round(d.pB)}%`}</div>
            </div>
            <div className="pg-bar-track">
              <div className="pg-bar-a" style={{
                width:`${d.pA}%`,
                background: isA ? `linear-gradient(90deg,${colorA}cc,${colorA}77)` : 'rgba(255,255,255,.09)',
                boxShadow: isA && d.mag > .45 ? `0 0 8px ${colorA}66` : 'none',
              }}/>
              <div className="pg-bar-b" style={{
                background: isB ? `linear-gradient(90deg,${colorB}77,${colorB}cc)` : 'rgba(255,255,255,.06)',
                boxShadow: isB && d.mag > .45 ? `0 0 8px ${colorB}66` : 'none',
              }}/>
              <div className="pg-midline"/>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── H2H History ────────────────────────────────────────────────────
function PGH2HHistory({ h2h, pA, pB, colorA, colorB }) {
  if (!h2h.lastMatches.length) return null;
  const catConf = { GRAND_SLAM:{c:'#FFD700',l:'GS'}, MASTERS_1000:{c:'#E040FB',l:'M'}, ATP_500:{c:'#00BCD4',l:'500'}, ATP_250:{c:'#66BB6A',l:'250'}, FINALS:{c:'#F44336',l:'FIN'} };
  const roundL = {0:'R1',1:'R2',2:'R3',3:'QF',4:'QF',5:'SF',6:'F'};
  return (
    <div>
      <div className="pg-label" style={{marginBottom:9,textAlign:'center'}}>HISTÓRICO DO DUELO</div>
      <div style={{display:'flex',flexDirection:'column',gap:4}}>
        {h2h.lastMatches.slice(0,5).map((m,i) => {
          const wonByA = m.winnerId === pA.id;
          const wc = wonByA ? colorA : colorB;
          const wName = wonByA ? pA.name : pB.name;
          const cc = catConf[m.cat];
          const rl = roundL[m.roundIdx] ?? '';
          return (
            <div key={i} style={{
              display:'flex', alignItems:'center', gap:8, padding:'6px 10px',
              background:'rgba(255,255,255,.022)', borderRadius:2,
              borderLeft:`2px solid ${wc}66`,
              animation:`pg-in .3s ${.07*i}s both`,
            }}>
              <div style={{
                width:20, height:20, borderRadius:'50%', flexShrink:0,
                background:`${wc}18`, border:`1px solid ${wc}44`,
                display:'flex',alignItems:'center',justifyContent:'center',
                fontFamily:"'Bebas Neue',sans-serif",fontSize:9,color:wc,
              }}>{wonByA?'A':'B'}</div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,
                  color:wc,fontSize:12,letterSpacing:'.05em',lineHeight:1,
                  overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                  {wName.split(' ').pop()}
                </div>
                <div style={{fontFamily:"'Space Mono',monospace",fontSize:7,
                  color:'rgba(255,255,255,.28)',letterSpacing:'.04em',marginTop:1,
                  overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                  {m.tourName??'—'}{rl?` · ${rl}`:''}
                </div>
              </div>
              <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:2,flexShrink:0}}>
                {cc && <span style={{fontFamily:"'Space Mono',monospace",fontSize:7,color:cc.c}}>{cc.l}</span>}
                <span style={{fontFamily:"'Space Mono',monospace",fontSize:8,color:'rgba(255,255,255,.28)'}}>{m.year??'—'}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ════════════════════════════════════════════════════════════════════
function PreGameAnalysis({ preGamePending, universeState, onStart, onStartHighlights, onSimHighlights, onSkip }) {
  React.useEffect(() => { injectPreGameCSS(); }, []);

  const { playerA, playerB, tournament, roundIdx, bestOf } = preGamePending;
  const year    = universeState?.year ?? 2025;
  const hist    = {
    ...(universeState?.historicalTournamentResults ?? {}),
    ...(universeState?.tournamentResults ?? {}),
  };
  const rs      = universeState?.rivalrySystem;
  const surfKey = pgSurfKey(tournament?.courtKey);
  const surf    = PG_SURF[surfKey] ?? PG_SURF.HARD;
  const catCfg  = PG_CAT[tournament?.category] ?? { label:tournament?.category??'Torneio', color:'#888', icon:'🎾' };
  const roundLbl = PG_ROUND[roundIdx] ?? (roundIdx!=null?`R${roundIdx+1}`:'Partida');

  const statsA = React.useMemo(() => pgSeasonStats(playerA.id, hist, year), [playerA.id, year]);
  const statsB = React.useMemo(() => pgSeasonStats(playerB.id, hist, year), [playerB.id, year]);
  const h2h    = React.useMemo(() => pgH2H(playerA.id, playerB.id, rs, hist), [playerA.id, playerB.id]);
  const edges  = React.useMemo(() => computeEdges(playerA, playerB, surfKey), [playerA.id, playerB.id, surfKey]);

  const narrative = pgNarrative(playerA, playerB, h2h, surfKey, tournament);
  const matchNote = pgMatchupNote(playerA.styleId, playerB.styleId);

  const styA = PG_STYLE[playerA.styleId] ?? { label:playerA.styleId??'—', icon:'🎾', color:'#888' };
  const styB = PG_STYLE[playerB.styleId] ?? { label:playerB.styleId??'—', icon:'🎾', color:'#888' };
  const colorA = playerA.color ?? styA.color ?? '#C4572A';
  const colorB = playerB.color ?? styB.color ?? '#1565C0';

  const rivalry    = h2h.rivalry;
  const rivalryCfg = rivalry ? (PG_RIVALRY[rivalry.type] ?? PG_RIVALRY.CLASSIC) : null;
  const statusW    = rivalry ? (PG_STATUS_WEIGHT[rivalry.status] ?? 0) : 0;
  const pctA  = h2h.total > 0 ? Math.round(h2h.wA/h2h.total*100) : 50;

  const lastSurf = playerA.surfaceIdentity?.surface?.toUpperCase()===surfKey;
  const lastSurfB = playerB.surfaceIdentity?.surface?.toUpperCase()===surfKey;

  return (
    <div className="pg-screen">
      <div className="pg-scan-line"/>

      {/* ════ TOPBAR ════ */}
      <div style={{
        position:'sticky', top:0, zIndex:100,
        display:'flex', justifyContent:'space-between', alignItems:'center',
        padding:'0 24px', height:42,
        background:`rgba(2,4,10,.97)`,
        borderBottom:`1px solid ${surf.color}28`,
        backdropFilter:'blur(16px)',
        animation:'pg-in .3s both',
      }}>
        <div style={{display:'flex', alignItems:'center', gap:10}}>
          <div style={{width:2, height:16, background:surf.color, opacity:.65}}/>
          <span style={{
            fontFamily:"'Space Mono',monospace", fontSize:8,
            letterSpacing:'.28em', color:'rgba(255,255,255,.3)', textTransform:'uppercase',
          }}>PRÉ-JOGO · {catCfg.icon} {catCfg.label} · {surf.label} · {roundLbl}</span>
        </div>
        <button className="pg-skip" onClick={onSkip}>PULAR →</button>
      </div>

      {/* ════ HERO — Names collision ════ */}
      <div style={{
        position:'relative', overflow:'hidden', paddingBottom:0,
        background:`linear-gradient(180deg, ${surf.bg} 0%, transparent 100%)`,
      }}>
        {/* Atmospheric glow */}
        <div style={{
          position:'absolute', inset:0, pointerEvents:'none',
          background:`radial-gradient(ellipse 110% 70% at 50% -5%, ${surf.color}1A 0%, transparent 60%)`,
          animation:'pg-glow 5s ease-in-out infinite',
        }}/>
        {/* Diagonal divider line */}
        <div style={{
          position:'absolute', left:'50%', top:0, bottom:0, width:1,
          background:`linear-gradient(180deg, transparent, ${surf.color}33, transparent)`,
          transform:'translateX(-50%)',
        }}/>

        <div style={{position:'relative', maxWidth:1160, margin:'0 auto', padding:'40px 28px 32px'}}>
          {/* Tournament pill */}
          <div style={{display:'flex', justifyContent:'center', marginBottom:22, animation:'pg-in .5s .1s both'}}>
            <div style={{
              display:'inline-flex', alignItems:'center', gap:8,
              padding:'5px 18px',
              border:`1px solid ${catCfg.color}2E`,
              background:`${catCfg.color}0A`,
            }}>
              <span style={{fontSize:12}}>{catCfg.icon}</span>
              <span style={{fontFamily:"'Space Mono',monospace", fontSize:9, letterSpacing:'.22em',
                color:catCfg.color, textTransform:'uppercase'}}>
                {tournament?.name ?? 'Torneio'} · {roundLbl} · MD{bestOf}
              </span>
            </div>
          </div>

          {/* Huge names */}
          <div style={{display:'flex', alignItems:'center', justifyContent:'center', gap:0}}>
            {/* Player A */}
            <div style={{flex:1, textAlign:'right', paddingRight:36, animation:'pg-left .7s .12s both'}}>
              <div style={{
                fontFamily:"'Bebas Neue',sans-serif", lineHeight:.9,
                fontSize:'clamp(28px,4.5vw,52px)', letterSpacing:'.05em',
                color:'rgba(255,255,255,.55)',
              }}>{playerA.name.split(' ').slice(0,-1).join(' ')}</div>
              <div style={{
                fontFamily:"'Bebas Neue',sans-serif", lineHeight:.9,
                fontSize:'clamp(46px,7vw,82px)', letterSpacing:'.04em',
                color:colorA, textShadow:`0 0 80px ${colorA}66, 0 0 30px ${colorA}44`,
              }}>{playerA.name.split(' ').pop()}</div>
              <div style={{display:'flex', justifyContent:'flex-end', alignItems:'center', gap:8, marginTop:8}}>
                <span style={{fontFamily:"'Space Mono',monospace",fontSize:9,
                  color:'rgba(255,255,255,.35)',letterSpacing:'.1em'}}>#{playerA.rankPosition??'—'}</span>
                <span style={{padding:'2px 8px',background:`${styA.color}12`,
                  border:`1px solid ${styA.color}30`,fontFamily:"'Space Mono',monospace",
                  fontSize:8,color:styA.color,letterSpacing:'.07em'}}>
                  {styA.icon} {styA.label}
                </span>
                {lastSurf && <span style={{padding:'2px 8px',background:'rgba(255,215,0,.07)',
                  border:'1px solid rgba(255,215,0,.2)',fontFamily:"'Space Mono',monospace",
                  fontSize:8,color:'#FFD700',letterSpacing:'.06em'}}>🏡 CASA</span>}
              </div>
            </div>

            {/* VS + H2H */}
            <div style={{flexShrink:0, display:'flex',flexDirection:'column',alignItems:'center',gap:8}}>
              <div style={{
                fontFamily:"'Bebas Neue',sans-serif",
                fontSize:'clamp(40px,6.5vw,70px)',
                color:surf.color, lineHeight:1, letterSpacing:'.1em',
                animation:'pg-vs .75s .4s both',
                textShadow:`0 0 50px ${surf.color}AA`,
              }}>VS</div>
              {h2h.total > 0 ? (
                <div style={{textAlign:'center',animation:'pg-up .4s .65s both'}}>
                  <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:24,letterSpacing:'.04em',lineHeight:1}}>
                    <span style={{color:h2h.wA>=h2h.wB?colorA:'rgba(255,255,255,.35)'}}>{h2h.wA}</span>
                    <span style={{color:'rgba(255,255,255,.15)',margin:'0 5px'}}>–</span>
                    <span style={{color:h2h.wB>=h2h.wA?colorB:'rgba(255,255,255,.35)'}}>{h2h.wB}</span>
                  </div>
                  <div className="pg-label" style={{marginTop:2}}>H2H · {h2h.total} partidas</div>
                </div>
              ) : (
                <div style={{fontFamily:"'Space Mono',monospace",fontSize:8,
                  color:'rgba(255,255,255,.22)',letterSpacing:'.14em',textAlign:'center',
                  animation:'pg-in .4s .65s both'}}>1º ENCONTRO</div>
              )}
            </div>

            {/* Player B */}
            <div style={{flex:1, paddingLeft:36, animation:'pg-right .7s .12s both'}}>
              <div style={{
                fontFamily:"'Bebas Neue',sans-serif", lineHeight:.9,
                fontSize:'clamp(28px,4.5vw,52px)', letterSpacing:'.05em',
                color:'rgba(255,255,255,.55)',
              }}>{playerB.name.split(' ').slice(0,-1).join(' ')}</div>
              <div style={{
                fontFamily:"'Bebas Neue',sans-serif", lineHeight:.9,
                fontSize:'clamp(46px,7vw,82px)', letterSpacing:'.04em',
                color:colorB, textShadow:`0 0 80px ${colorB}66, 0 0 30px ${colorB}44`,
              }}>{playerB.name.split(' ').pop()}</div>
              <div style={{display:'flex', alignItems:'center', gap:8, marginTop:8}}>
                <span style={{fontFamily:"'Space Mono',monospace",fontSize:9,
                  color:'rgba(255,255,255,.35)',letterSpacing:'.1em'}}>#{playerB.rankPosition??'—'}</span>
                <span style={{padding:'2px 8px',background:`${styB.color}12`,
                  border:`1px solid ${styB.color}30`,fontFamily:"'Space Mono',monospace",
                  fontSize:8,color:styB.color,letterSpacing:'.07em'}}>
                  {styB.icon} {styB.label}
                </span>
                {lastSurfB && <span style={{padding:'2px 8px',background:'rgba(255,215,0,.07)',
                  border:'1px solid rgba(255,215,0,.2)',fontFamily:"'Space Mono',monospace",
                  fontSize:8,color:'#FFD700',letterSpacing:'.06em'}}>🏡 CASA</span>}
              </div>
            </div>
          </div>

          {/* ── Rivalry banner (if exists) ── */}
          {rivalry && rivalryCfg && statusW >= 2 && (
            <div style={{
              marginTop:22, padding:'12px 22px',
              border:`1px solid ${rivalryCfg.color}44`,
              background:`linear-gradient(90deg, ${rivalryCfg.color}0A 0%, ${rivalryCfg.color}05 50%, ${rivalryCfg.color}0A 100%)`,
              display:'flex', alignItems:'center', gap:14,
              animation:'pg-up .5s .8s both',
              boxShadow:`0 0 40px ${rivalryCfg.color}12`,
              '--rc': rivalryCfg.color,
            }}>
              <span style={{fontSize:20, animation:'pg-glow 2.5s ease-in-out infinite'}}>{rivalryCfg.icon}</span>
              <div style={{flex:1}}>
                <div style={{
                  fontFamily:"'Space Mono',monospace", fontSize:9, letterSpacing:'.22em',
                  color:rivalryCfg.color, fontWeight:700, textTransform:'uppercase', marginBottom:3,
                }}>{rivalryCfg.label}
                  {rivalry.status === 'LEGENDARY' && <span style={{marginLeft:8,
                    fontFamily:"'Space Mono',monospace",fontSize:8,letterSpacing:'.1em',
                    padding:'1px 6px',background:`${rivalryCfg.color}22`,
                    border:`1px solid ${rivalryCfg.color}44`,color:rivalryCfg.color}}>LENDÁRIA</span>}
                  {rivalry.status === 'INTENSE' && <span style={{marginLeft:8,
                    fontFamily:"'Space Mono',monospace",fontSize:8,letterSpacing:'.1em',
                    padding:'1px 6px',background:`${rivalryCfg.color}22`,
                    border:`1px solid ${rivalryCfg.color}44`,color:rivalryCfg.color}}>INTENSA</span>}
                </div>
                {rivalry.narrative && (
                  <div style={{fontFamily:"'Barlow Condensed',sans-serif", fontStyle:'italic',
                    fontSize:12, color:`${rivalryCfg.color}BB`, lineHeight:1.4}}>
                    {rivalry.narrative}
                  </div>
                )}
              </div>
              <div style={{flexShrink:0,textAlign:'right'}}>
                <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:24,
                  color:rivalryCfg.color,lineHeight:1}}>{h2h.wA}–{h2h.wB}</div>
                <div className="pg-label" style={{fontSize:7}}>H2H TOTAL</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ════ BODY ════ */}
      <div style={{maxWidth:1160, margin:'0 auto', padding:'0 28px 52px', display:'flex', flexDirection:'column', gap:14}}>

        {/* ── Narrative ── */}
        <div className="pg-glass" style={{
          padding:'16px 20px', borderLeft:`3px solid ${surf.color}55`,
          animation:'pg-up .5s .5s both',
        }}>
          <div className="pg-label" style={{marginBottom:7}}>CONTEXTO DA PARTIDA</div>
          <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontStyle:'italic',
            fontSize:15,color:'rgba(255,255,255,.6)',lineHeight:1.6}}>
            {narrative}
          </div>
        </div>

        {/* ── 3-col: player A | center | player B ── */}
        <div style={{display:'grid', gridTemplateColumns:'1fr minmax(220px,280px) 1fr', gap:14}}>
          <PGPlayerCard player={playerA} side="left"  seasonStats={statsA} surfKey={surfKey} colorOther={colorB} delay={.15}/>

          {/* Center column */}
          <div style={{display:'flex',flexDirection:'column',gap:12}}>
            {/* Edge battle */}
            <div className="pg-glass" style={{padding:'14px 16px', animation:'pg-up .4s .3s both'}}>
              <PGEdgeBattle edges={edges} pA={playerA} pB={playerB} colorA={colorA} colorB={colorB}/>
            </div>

            {/* H2H bar */}
            {h2h.total > 0 && (
              <div className="pg-glass" style={{padding:'14px 16px', animation:'pg-up .4s .55s both'}}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:7}}>
                  <span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:18,color:colorA,lineHeight:1}}>{h2h.wA}</span>
                  <div className="pg-label" style={{textAlign:'center'}}>H2H · {h2h.total} PARTIDAS</div>
                  <span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:18,color:colorB,lineHeight:1}}>{h2h.wB}</span>
                </div>
                <div className="pg-bar-track" style={{height:6,marginBottom:5}}>
                  <div className="pg-bar-a" style={{
                    width:`${pctA}%`,
                    background:`linear-gradient(90deg,${colorA},${colorA}88)`,
                    boxShadow:h2h.wA>h2h.wB?`0 0 10px ${colorA}55`:'none',
                  }}/>
                  <div className="pg-bar-b" style={{
                    background:`linear-gradient(90deg,${colorB}88,${colorB})`,
                    boxShadow:h2h.wB>h2h.wA?`0 0 10px ${colorB}55`:'none',
                  }}/>
                  <div className="pg-midline"/>
                </div>
                <div style={{display:'flex',justifyContent:'space-between'}}>
                  <span style={{fontFamily:"'Space Mono',monospace",fontSize:8,color:`${colorA}88`}}>{pctA}%</span>
                  <span style={{fontFamily:"'Space Mono',monospace",fontSize:8,color:`${colorB}88`}}>{100-pctA}%</span>
                </div>
                <div style={{marginTop:12}}>
                  <PGH2HHistory h2h={h2h} pA={playerA} pB={playerB} colorA={colorA} colorB={colorB}/>
                </div>
              </div>
            )}

            {/* Style note */}
            <div className="pg-glass" style={{padding:'12px 16px', animation:'pg-up .4s .7s both'}}>
              <div className="pg-label" style={{marginBottom:7}}>CHOQUE DE ESTILOS</div>
              <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
                <span style={{fontFamily:"'Space Mono',monospace",fontSize:8,
                  color:styA.color,letterSpacing:'.07em',fontWeight:700}}>{styA.icon} {styA.label}</span>
                <div style={{flex:1,height:1,background:'rgba(255,255,255,.08)'}}/>
                <span style={{fontFamily:"'Space Mono',monospace",fontSize:8,
                  color:styB.color,letterSpacing:'.07em',fontWeight:700}}>{styB.icon} {styB.label}</span>
              </div>
              <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontStyle:'italic',
                fontSize:12,color:'rgba(255,255,255,.45)',lineHeight:1.45,textAlign:'center'}}>
                {matchNote}
              </div>
            </div>
          </div>

          <PGPlayerCard player={playerB} side="right" seasonStats={statsB} surfKey={surfKey} colorOther={colorA} delay={.22}/>
        </div>

        {/* ── CTA ── */}
        <div style={{
          display:'flex', flexDirection:'column', alignItems:'center', gap:11,
          paddingTop:8, animation:'pg-up .5s 1s both',
        }}>
          <button className="pg-cta-main" onClick={onStart}>▶ PARTIDA COMPLETA</button>
          <div style={{display:'flex',gap:10}}>
            {onSimHighlights && (
              <button className="pg-cta-sec" onClick={onSimHighlights}
                style={{
                  border:'1px solid rgba(100,180,255,.3)',color:'rgba(100,180,255,.75)',
                  background:'rgba(100,180,255,.06)',
                }}
                onMouseEnter={e=>{e.currentTarget.style.background='rgba(100,180,255,.13)';e.currentTarget.style.color='#64B4FF';}}
                onMouseLeave={e=>{e.currentTarget.style.background='rgba(100,180,255,.06)';e.currentTarget.style.color='rgba(100,180,255,.75)';}}>
                🎬 SIMULAR + HIGHLIGHTS
              </button>
            )}
            {onStartHighlights && (
              <button className="pg-cta-sec" onClick={onStartHighlights}
                style={{
                  border:'1px solid rgba(255,215,0,.28)',color:'rgba(255,215,0,.75)',
                  background:'rgba(255,215,0,.05)',
                }}
                onMouseEnter={e=>{e.currentTarget.style.background='rgba(255,215,0,.14)';e.currentTarget.style.color='#FFD700';}}
                onMouseLeave={e=>{e.currentTarget.style.background='rgba(255,215,0,.05)';e.currentTarget.style.color='rgba(255,215,0,.75)';}}>
                ⚡ SÓ OS HIGHLIGHTS
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// SEASON PLANNING — gera planos anuais para todos os jogadores NPC
// ═══════════════════════════════════════════════════════════════════

/**
 * Gera o mapa de season counts zerados para todos os jogadores.
 * Rastreia quantos ATP 250 e 500 cada um já jogou na temporada.
 */
function buildSeasonSlots(tourPlayers) {
  const slots = {};
  for (const player of tourPlayers) {
    slots[player.id] = createSeasonSlots();
  }
  return slots;
}

// ═══════════════════════════════════════════════════════════════════
// RECORDS STORE — stats acumuladas por jogador, independente do histórico
// Atualizado incrementalmente a cada torneio concluído.
// Nunca é apagado — sobrevive ao trimming do historicalTournamentResults.
// ═══════════════════════════════════════════════════════════════════

const GS_IDS_SET = new Set(['JAN_GS_MERIDIAN','MAI_GS_ROLAND','JUN_GS_ALBION','AGO_GS_EMPIRE']);

/** Retorna (criando se necessário) o objeto de stats de um jogador no store. */
function _rsGet(store, id) {
  if (!store.playerStats[id]) {
    store.playerStats[id] = {
      // identity snapshot — atualizado sempre que temos o player object
      name: null, nationality: null, age: null, color: null, styleId: null, photo: null,
      // títulos por categoria
      titles:0, gs:0, masters:0, atp500:0, atp250:0, atp100:0,
      finals_titles:0, prospects_titles:0, prospects_finals_titles:0,
      // finais / semifinais
      finals:0, finalLosses:0, semifinals:0,
      gsFinalsWon:0, gsFinalsLost:0,
      // GS vencidos (array de IDs — para career grand slam)
      gsWonIds:[],
      // W/L / partidas
      wins:0, losses:0, matchesPlayed:0,
      surfWins:{HARD:0,CLAY:0,GRASS:0,INDOOR:0},
      surfLosses:{HARD:0,CLAY:0,GRASS:0,INDOOR:0},
      surfTitles:{HARD:0,CLAY:0,GRASS:0,INDOOR:0},
      // streaks
      winStreak:0, curStreak:0,
      // sets / bagels / tiebreaks
      bagels:0, doubleBagels:0, tiebreaksWon:0,
      setsWon:0, setsLost:0,
      // execução de golpe / saque
      aces:0, winners:0, doubleFaults:0, unforcedErrors:0,
      // temporadas com título (array de anos)
      titleYears:[],
      // idade nos títulos
      youngestChampAge:null, oldestChampAge:null,
      // pontos
      careerPts:0,
      // dados por temporada — mantém últimas MAX_SEASON_DATA seasons
      seasonData:{},
    };
  }
  const s = store.playerStats[id];
  if (s.aces == null) s.aces = 0;
  if (s.winners == null) s.winners = 0;
  if (s.doubleFaults == null) s.doubleFaults = 0;
  if (s.unforcedErrors == null) s.unforcedErrors = 0;
  return store.playerStats[id];
}

const MAX_SEASON_DATA = 20; // guarda até 20 temporadas de seasonData por jogador

/** Snapshot de identidade do jogador (para exibição mesmo após aposentadoria). */
function _rsSnap(s, player) {
  if (!player) return;
  s.name        = player.name;
  s.nationality = player.nationality;
  s.age         = player.age ?? s.age;
  s.color       = player.color ?? s.color;
  s.styleId     = player.styleId ?? s.styleId;
  s.photo       = player.photo   ?? s.photo;
}

function _rsSeasonData(s, yr) {
  if (!s.seasonData[yr]) {
    s.seasonData[yr] = {
      pts:0, titles:0, wins:0, matchesPlayed:0,
      aces:0, winners:0, doubleFaults:0, unforcedErrors:0,
    };
  }
  if (s.seasonData[yr].matchesPlayed == null) s.seasonData[yr].matchesPlayed = 0;
  if (s.seasonData[yr].aces == null) s.seasonData[yr].aces = 0;
  if (s.seasonData[yr].winners == null) s.seasonData[yr].winners = 0;
  if (s.seasonData[yr].doubleFaults == null) s.seasonData[yr].doubleFaults = 0;
  if (s.seasonData[yr].unforcedErrors == null) s.seasonData[yr].unforcedErrors = 0;
  return s.seasonData[yr];
}

/**
 * Atualiza o recordsStore com um resultado de torneio.
 * Funciona tanto com formato full-bracket quanto slim.
 * @param {object} store  — recordsStore mutável (cópia rasa já feita pelo caller)
 * @param {object} result — resultado do torneio (bracket ou slim)
 * @param {number} year   — temporada do torneio
 * @param {object} playerMap — { [id]: player } para snapshots de identidade
 */
function updateRecordsStoreWithResult(store, result, year, playerMap) {
  const { tournament } = result;
  if (!tournament) return;
  const { category, surface, id: tid } = tournament;
  const surf = surface ?? 'HARD';

  const pm = playerMap ?? {};
  const snap = (s, id) => _rsSnap(s, pm[id]);

  // ── helper: processar um set result de uma partida ───────────────
  function processSets(wId, lId, sd, winnerIsA) {
    if (!sd?.length) return;
    const ws = _rsGet(store, wId);
    const ls = lId ? _rsGet(store, lId) : null;
    const wBagels = sd.filter(([a,b]) => winnerIsA ? b===0 : a===0).length;
    const lBagels = sd.filter(([a,b]) => winnerIsA ? a===0 : b===0).length;
    ws.bagels += wBagels;
    if (wBagels >= 2) ws.doubleBagels++;
    if (ls) { ls.bagels += lBagels; }
    sd.forEach(([a,b]) => {
      const [wG,lG] = winnerIsA ? [a,b] : [b,a];
      ws.setsWon++;
      if (ls) { ls.setsLost++; if (lG > wG) ls.setsWon++; }
      if (a===7 || b===7) ws.tiebreaksWon++;
    });
  }

  function processMatchStats(pAId, pBId, stats) {
    const aStats = stats?.a;
    const bStats = stats?.b;
    if (pAId && aStats) {
      const s = _rsGet(store, pAId);
      const season = _rsSeasonData(s, year);
      const aces = aStats.aces ?? 0;
      const winners = aStats.winners ?? 0;
      const doubleFaults = aStats.doubleFaults ?? 0;
      const unforcedErrors = aStats.unforcedErrors ?? 0;
      s.aces += aces;
      s.winners += winners;
      s.doubleFaults += doubleFaults;
      s.unforcedErrors += unforcedErrors;
      season.aces += aces;
      season.winners += winners;
      season.doubleFaults += doubleFaults;
      season.unforcedErrors += unforcedErrors;
    }
    if (pBId && bStats) {
      const s = _rsGet(store, pBId);
      const season = _rsSeasonData(s, year);
      const aces = bStats.aces ?? 0;
      const winners = bStats.winners ?? 0;
      const doubleFaults = bStats.doubleFaults ?? 0;
      const unforcedErrors = bStats.unforcedErrors ?? 0;
      s.aces += aces;
      s.winners += winners;
      s.doubleFaults += doubleFaults;
      s.unforcedErrors += unforcedErrors;
      season.aces += aces;
      season.winners += winners;
      season.doubleFaults += doubleFaults;
      season.unforcedErrors += unforcedErrors;
    }
  }

  if (result._slim) {
    // ── SLIM FORMAT ──────────────────────────────────────────────────
    if (result.champion) {
      const s = _rsGet(store, result.champion.id);
      snap(s, result.champion.id);
      s.titles++;
      if (category==='GRAND_SLAM')       { s.gs++; if (!s.gsWonIds.includes(tid)) s.gsWonIds.push(tid); }
      if (category==='MASTERS_1000')     s.masters++;
      if (category==='ATP_500')          s.atp500++;
      if (category==='ATP_250')          s.atp250++;
      if (category==='FINALS')           s.finals_titles++;
      if (category==='OLYMPICS')         s.olympic_gold = (s.olympic_gold ?? 0) + 1;

      s.surfTitles[surf] = (s.surfTitles[surf]||0) + 1;
      s.finals++;
      if (category==='GRAND_SLAM') s.gsFinalsWon++;
      if (!s.titleYears.includes(year)) s.titleYears.push(year);
      const age = pm[result.champion.id]?.age ?? s.age;
      if (age) {
        if (s.youngestChampAge===null || age < s.youngestChampAge) s.youngestChampAge = age;
        if (s.oldestChampAge===null   || age > s.oldestChampAge)   s.oldestChampAge   = age;
      }
      _rsSeasonData(s, year).titles++;
    }
    if (result.finalist) {
      const s = _rsGet(store, result.finalist.id);
      snap(s, result.finalist.id);
      s.finals++;
      s.finalLosses++;
      if (category==='GRAND_SLAM') s.gsFinalsLost++;
    }
    (result.semis ?? []).forEach(sf => {
      const s = _rsGet(store, sf.id);
      snap(s, sf.id);
      s.semifinals++;
    });
    (result.matches ?? []).forEach(({ w, l, sd, wa=true, st=null }) => {
      const ws = _rsGet(store, w);
      snap(ws, w);
      ws.wins++;
      ws.matchesPlayed++;
      ws.surfWins[surf] = (ws.surfWins[surf]||0) + 1;
      ws.curStreak++;
      if (ws.curStreak > ws.winStreak) ws.winStreak = ws.curStreak;
      const wSeason = _rsSeasonData(ws, year);
      wSeason.wins++;
      wSeason.matchesPlayed++;
      processSets(w, l, sd, wa);
      if (l) {
        const ls = _rsGet(store, l);
        snap(ls, l);
        ls.losses++;
        ls.matchesPlayed++;
        ls.surfLosses[surf] = (ls.surfLosses[surf]||0) + 1;
        ls.curStreak = 0;
        _rsSeasonData(ls, year).matchesPlayed++;
      }
      processMatchStats(wa ? w : l, wa ? l : w, st);
    });
    for (const [pid, pts] of Object.entries(result.pts ?? {})) {
      const s = _rsGet(store, pid);
      s.careerPts += pts;
      _rsSeasonData(s, year).pts += pts;
    }

  } else {
    // ── FULL BRACKET FORMAT ─────────────────────────────────────────
    const { bracket } = result;
    if (!bracket) return;

    if (bracket.champion) {
      const champ = bracket.champion;
      const s = _rsGet(store, champ.id);
      snap(s, champ.id);
      s.titles++;
      if (category==='GRAND_SLAM')       { s.gs++; if (!s.gsWonIds.includes(tid)) s.gsWonIds.push(tid); }
      if (category==='MASTERS_1000')     s.masters++;
      if (category==='ATP_500')          s.atp500++;
      if (category==='ATP_250')          s.atp250++;
      if (category==='ATP_100')          s.atp100++;
      if (category==='FINALS')           s.finals_titles++;
      if (category==='OLYMPICS')         s.olympic_gold = (s.olympic_gold ?? 0) + 1;

      s.surfTitles[surf] = (s.surfTitles[surf]||0) + 1;
      if (!s.titleYears.includes(year)) s.titleYears.push(year);
      const age = pm[champ.id]?.age ?? s.age;
      if (age) {
        if (s.youngestChampAge===null || age < s.youngestChampAge) s.youngestChampAge = age;
        if (s.oldestChampAge===null   || age > s.oldestChampAge)   s.oldestChampAge   = age;
      }
      _rsSeasonData(s, year).titles++;
    }

    if (bracket.rounds) {
      bracket.rounds.forEach(round => {
        round.forEach(match => {
          if (!match.winner || match.isBye) return;
          const winner = match.winner;
          const pA = match.playerA ?? match.player1;
          const pB = match.playerB ?? match.player2;
          const loser = pA?.id === winner.id ? pB : pA;
          const ws = _rsGet(store, winner.id);
          snap(ws, winner.id);
          ws.wins++;
          ws.matchesPlayed++;
          ws.surfWins[surf] = (ws.surfWins[surf]||0) + 1;
          ws.curStreak++;
          if (ws.curStreak > ws.winStreak) ws.winStreak = ws.curStreak;
          const wSeason = _rsSeasonData(ws, year);
          wSeason.wins++;
          wSeason.matchesPlayed++;
          processSets(winner.id, loser?.id, match.result?.setsDetail ?? match.setsDetail, pA?.id === winner.id);
          processMatchStats(pA?.id, pB?.id, match.result?.stats ?? null);
          if (loser?.id) {
            const ls = _rsGet(store, loser.id);
            snap(ls, loser.id);
            ls.losses++;
            ls.matchesPlayed++;
            ls.surfLosses[surf] = (ls.surfLosses[surf]||0) + 1;
            ls.curStreak = 0;
            _rsSeasonData(ls, year).matchesPlayed++;
          }
        });
      });

      // finalist & champion finals count
      const finalRound = bracket.rounds[bracket.rounds.length - 1];
      if (finalRound && bracket.champion) {
        const finalMatch = finalRound[0];
        if (finalMatch && !finalMatch.isBye) {
          const pA = finalMatch.playerA ?? finalMatch.player1;
          const pB = finalMatch.playerB ?? finalMatch.player2;
          const champId = bracket.champion.id;
          const runnerId = pA?.id === champId ? pB?.id : pA?.id;
          const cs = _rsGet(store, champId);
          cs.finals++;
          if (category==='GRAND_SLAM') cs.gsFinalsWon++;
          if (runnerId) {
            const rs = _rsGet(store, runnerId);
            snap(rs, runnerId);
            rs.finals++;
            rs.finalLosses++;
            if (category==='GRAND_SLAM') rs.gsFinalsLost++;
          }
        }
      }
      // semis
      if (bracket.rounds.length >= 2) {
        const sfRound = bracket.rounds[bracket.rounds.length - 2];
        sfRound?.forEach(m => {
          if (m.isBye || !m.winner) return;
          const pA = m.playerA ?? m.player1;
          const pB = m.playerB ?? m.player2;
          const lId = pA?.id === m.winner.id ? pB?.id : pA?.id;
          if (lId) { const ls = _rsGet(store, lId); snap(ls, lId); ls.semifinals++; }
        });
      }
    }

    // pontos
    try {
      const pointMap = computeTournamentPoints(tournament, bracket, TOURNAMENT_POINTS);
      for (const [pid, { points }] of pointMap) {
        if (points > 0) {
          const s = _rsGet(store, pid);
          s.careerPts += points;
          _rsSeasonData(s, year).pts += points;
        }
      }
    } catch(_) {}
  }

  // trim seasonData para MAX_SEASON_DATA seasons mais recentes
  for (const s of Object.values(store.playerStats)) {
    const keys = Object.keys(s.seasonData).map(Number).sort((a,b) => a-b);
    if (keys.length > MAX_SEASON_DATA) {
      keys.slice(0, keys.length - MAX_SEASON_DATA).forEach(k => delete s.seasonData[k]);
    }
  }
}

/**
 * Constrói um recordsStore do zero a partir do histórico existente.
 * Usado na migração de saves antigos (one-time).
 */
function buildRecordsStoreFromHistory(state) {
  const store = { _version: 1, playerStats: {} };
  const allPlayers = [
    ...(state.tourPlayers ?? []),
    ...(state.prospects ?? []),
    ...(state.retiredPlayers ?? []),
  ];
  const playerMap = Object.fromEntries(allPlayers.map(p => [p.id, p]));

  const allResults = {
    ...(state.historicalTournamentResults ?? {}),
    ...(state.tournamentResults ?? {}),
  };

  // ordena por temporada + weekIndex para curStreak ser correto
  const ordered = Object.values(allResults)
    .filter(r => r.tournament && (r._slim || r.bracket))
    .sort((a,b) => {
      const yA = a._season ?? a.tournament?.season ?? 0;
      const yB = b._season ?? b.tournament?.season ?? 0;
      if (yA !== yB) return yA - yB;
      return (a.tournament?.weekIndex??0) - (b.tournament?.weekIndex??0);
    });

  for (const res of ordered) {
    const year = res._season ?? res.tournament?.season ?? state.year;
    updateRecordsStoreWithResult(store, res, year, playerMap);
  }

  return store;
}

/** Retorna o recordsStore atual, criando/migrando se necessário. */
function getOrMigrateRecordsStore(state) {
  if (state.recordsStore?._version === 1 &&
      Object.keys(state.recordsStore.playerStats ?? {}).length > 0) {
    return state.recordsStore;
  }
  // migração one-time
  return buildRecordsStoreFromHistory(state);
}

// ═══════════════════════════════════════════════════════════════════
// SLIM FORMAT — reduz tamanho do save ao virar o ano
// ═══════════════════════════════════════════════════════════════════

/**
 * Converte um resultado completo de torneio (com bracket enorme)
 * em um objeto mínimo que preserva tudo que os consumers precisam.
 * Redução típica: ~98% do tamanho original.
 */
function slimifyTournamentResult(result, year) {
  // Se já está slim, devolve intacto (champion, matches, pts preservados).
  // Atualiza _season apenas se ainda não definido.
  if (result?._slim) {
    return { ...result, _season: result._season ?? year };
  }
  const { bracket, tournament } = result ?? {};
  if (!tournament) return null;

  const slim = {
    _slim: true,
    _season: year,
    tournament: {
      id: tournament.id, name: tournament.name, category: tournament.category,
      surface: tournament.surface, season: tournament.season ?? year,
      weekIndex: tournament.weekIndex, isSlam: tournament.isSlam ?? false,
      isMasters: tournament.isMasters ?? false, bestOf: tournament.bestOf ?? 3,
      isProspects: tournament.isProspects ?? false,
    },
    champion:  null,
    finalist:  null,
    semis:     [],
    matches:   [],   // [{ w: id, l: id }]
    pts:       {},   // { [playerId]: number }
  };

  if (!bracket) return slim;

  // Champion
  if (bracket.champion) {
    slim.champion = { id: bracket.champion.id, name: bracket.champion.name };
  }

  if (bracket.rounds?.length > 0) {
    // Finalist — perdedor da última rodada
    const finalRound = bracket.rounds[bracket.rounds.length - 1];
    const finalMatch = finalRound?.[0];
    if (finalMatch && !finalMatch.isBye && bracket.champion) {
      const a = finalMatch.playerA ?? finalMatch.player1;
      const b = finalMatch.playerB ?? finalMatch.player2;
      const loser = (a?.id === bracket.champion.id) ? b : a;
      if (loser?.id) slim.finalist = { id: loser.id, name: loser.name };
    }

    // Semifinalistas — perdedores da penúltima rodada
    if (bracket.rounds.length >= 2) {
      const sfRound = bracket.rounds[bracket.rounds.length - 2];
      sfRound?.forEach(m => {
        if (m.isBye || !m.winner) return;
        const a = m.playerA ?? m.player1;
        const b = m.playerB ?? m.player2;
        const loser = (a?.id === m.winner.id) ? b : a;
        if (loser?.id) slim.semis.push({ id: loser.id, name: loser.name });
      });
    }

    // Todos os resultados W/L (apenas IDs)
    bracket.rounds.forEach(round => {
      round.forEach(match => {
        if (!match.winner || match.isBye) return;
        const a = match.playerA ?? match.player1;
        const b = match.playerB ?? match.player2;
        const loser = match.loser ?? ((a?.id === match.winner.id) ? b : a);
        if (match.winner?.id && loser?.id) {
          const sd = match.result?.setsDetail ?? match.setsDetail ?? null;
          const pA = match.playerA ?? match.player1;
          const entry = { w: match.winner.id, l: loser.id };
          if (sd?.length) {
            entry.sd = sd.map(([a,b]) => [a,b]);
            entry.wa = (pA?.id === match.winner.id); // winner é playerA?
          }
          if (match.result?.stats?.a || match.result?.stats?.b) {
            entry.st = {
              a: match.result?.stats?.a ? {
                aces: match.result.stats.a.aces ?? 0,
                winners: match.result.stats.a.winners ?? 0,
                doubleFaults: match.result.stats.a.doubleFaults ?? 0,
                unforcedErrors: match.result.stats.a.unforcedErrors ?? 0,
              } : null,
              b: match.result?.stats?.b ? {
                aces: match.result.stats.b.aces ?? 0,
                winners: match.result.stats.b.winners ?? 0,
                doubleFaults: match.result.stats.b.doubleFaults ?? 0,
                unforcedErrors: match.result.stats.b.unforcedErrors ?? 0,
              } : null,
            };
          }
          slim.matches.push(entry);
        }
      });
    });
  }

  // Pontos pré-computados
  try {
    const pointMap = computeTournamentPoints(tournament, bracket, TOURNAMENT_POINTS);
    for (const [pid, { points }] of pointMap) {
      if (points > 0) slim.pts[pid] = (slim.pts[pid] ?? 0) + points;
    }
  } catch (_) {}

  return slim;
}

/**
 * Versão mínima de um jogador aposentado para exibição no HOF e recordes.
 * Descarta attrs, _devState, traits, coachHistory, injuryHistory, etc.
 */
function slimifyRetiredPlayer(p) {
  return {
    id: p.id, name: p.name, nationality: p.nationality,
    styleId: p.styleId, signatureShots: p.signatureShots ?? [],
    color: p.color, age: p.age, photo: p.photo ?? null,
    namedPlayerKey: p.namedPlayerKey ?? null,
    retirementInfo: p.retirementInfo ?? null,
    // ── histórico permanente (lendas com ≥3 GS chegam aqui com tudo) ──
    careerTitles:      p.careerTitles      ?? { gs:0, masters:0, finals:0, atp500:0, atp250:0, atp100:0 },
    alcunha:           p.alcunha           ?? null,
    _careerTitles:     p._careerTitles     ?? 0,
    _careerGrandSlams: p._careerGrandSlams ?? 0,
    _careerWins:       p._careerWins       ?? 0,
    _careerFinals:     p._careerFinals     ?? 0,
    _rankHistory:      p._rankHistory      ?? [],
    _seasonHistory:    p._seasonHistory    ?? [],
    birthYear:         p.birthYear         ?? null,
    peakAge:           p.peakAge           ?? null,
    personality:       p.personality       ?? null,
    surfaceStats:      p.surfaceStats      ?? null,
    surfaceIdentity:   p.surfaceIdentity   ?? null,
    dna:               p.dna               ?? null,
    injuryHistory:     p.injuryHistory     ?? [],
    lifeEventLog:      p.lifeEventLog      ?? [],
    _isSlimRetired: true,
  };
}

// ═══════════════════════════════════════════════════════════════════
// INICIALIZAÇÃO DO UNIVERSO
// ═══════════════════════════════════════════════════════════════════

function buildUniverse() {
  // 16 jogadores originais — gera 5 kits, kit[0] é a aparência canônica
  const named = Object.values(NAMED_PLAYERS).map(p => ({
    ...p,
    formPoints: 0,
    formHistory: [],
    kits:           generateKits(p.id, p.namedPlayerKey, 5),
    activeKitIndex: 0,
  }));

  // Inicializa o pool de imagens para newgens
  const poolOpts = { _poolState: createEmptyPoolState() };

  // 64 newgens para completar 192 do tour (128 named + 64 = 192)
  const newgensTour = generateNewgenBatch(2025, 64, {
    ageRange: [20, 36], ...poolOpts,
  }).map(p => ({ ...p, formPoints: 0, formHistory: [] }));

  const rankingStore = createRankingStore();

  // Seed pontos iniciais dos jogadores nomeados.
  // Fórmula: 129 - initialRank (rank 1 = 128 pts, rank 128 = 1 pt).
  // Calculado diretamente do initialRank — não depende de initialPts no players.js.
  for (const p of named) {
    const rank = p.initialRank ?? 999;
    const pts  = Math.max(0, 129 - rank);
    if (pts > 0) {
      rankingStore.playerResults[p.id] = [{
        tournamentId:   '__seed__',
        tournamentName: 'Carry-over 2024',
        category:       'ATP_250',
        points:         pts,
        round:          'W',
        season:         2024,
        weekIndex:      0,
        mandatory:      false,
      }];
    }
  }

  // Ranking inicial: named players pelo initialRank, restante por OVR
  const allTour = [...named, ...newgensTour];
  const tourPlayers = allTour.sort((a, b) => {
    const aRank = a.initialRank ?? 9999;
    const bRank = b.initialRank ?? 9999;
    if (aRank !== bRank) return aRank - bRank;
    return overallRating(b.attrs) - overallRating(a.attrs);
  }).map((p, idx) => ({ ...p, rankPosition: idx + 1 }));

  // Calcula ranking inicial
  const initialRanked     = computeRanking(rankingStore, tourPlayers.map(p => p.id));
  const initRankMap       = Object.fromEntries(initialRanked.map(r => [r.playerId, r.position]));
  const tourPlayersSynced = tourPlayers.map(p => ({ ...p, rankPosition: initRankMap[p.id] ?? p.rankPosition }));

  const tourPlayersWithPrefs = tourPlayersSynced.map(p => migrateTournamentPreferences({ ...p }));
  const playerSeasonSlots    = buildSeasonSlots(tourPlayersWithPrefs);
  const chronicleEngine      = new ChronicleEngine();

  const tourPlayersWithPersonality = tourPlayersWithPrefs.map(p =>
    p.personality ? p : migratePlayerPersonality({ ...p })
  );

  const tourPlayersWithLife = tourPlayersWithPersonality.map(p => {
    let np = migrateLifeEventLog(p);
    np = migratePlayerLifeData(np);
    // ── Kit migration: jogadores sem kits (save antigo) recebem kits agora ──
    if (!np.kits?.length) {
      np = { ...np, kits: generateKits(np.id, np.namedPlayerKey ?? null, 5), activeKitIndex: 0 };
    }
    return np;
  });

  const initialCoachPool = generateCoachPool(2025, 250);
  const { players: tourWithCoaches, coachPool: finalCoachPool } =
    assignCoachesToAll(tourPlayersWithLife, initialCoachPool, 2025);

  const coachMap = Object.fromEntries(finalCoachPool.map(c => [c.id, c]));
  const tourWithPartnerships = tourWithCoaches.map(p => {
    const coach = p.coach ? coachMap[p.coach.coachId] : null;
    const withPartnership = coach ? initPartnership(p, coach, 2025) : p;
    return migrateBreakingNewsState(withPartnership);
  });
  const seasonOpenBreaking = maybeTriggerBreakingNews(
    tourWithPartnerships,
    2025,
    {},
    { phase: 'SEASON_OPEN', tournament: CALENDAR[0] },
  );
  const tourAtSeasonOpen = seasonOpenBreaking.players ?? tourWithPartnerships;
  const initialPreparedTournamentPackage = buildPreparedTournamentPackage(
    CALENDAR[0],
    tourAtSeasonOpen,
    [],
    playerSeasonSlots,
    2025,
  );
  const initialNewsEngine = new NewsEngine();
  const initialBreakingArticles = generateBreakingNewsArticles(
    seasonOpenBreaking.events ?? [],
    tourAtSeasonOpen,
    2025,
  );
  initialNewsEngine.push([
    ...initialBreakingArticles,
    ...generateUpcomingTournamentNews(
      CALENDAR[0],
      initialPreparedTournamentPackage,
      { year: 2025, tourPlayers: tourAtSeasonOpen, prospects: [], tournamentResults: {}, historicalTournamentResults: {} },
      { seasonStart: true },
    ),
  ]);

  return {
    year: 2025,
    season: 1,
    newgenImagePool: poolOpts._poolState,
    tourPlayers:  tourAtSeasonOpen.map(p  => initPlayerFinance(p)),
    prospects:    [],
    rankingStore,
    calendarIndex: 0,
    preparedTournamentPackage: initialPreparedTournamentPackage,
    tournamentResults: {},
    historicalTournamentResults: {}, // acumula resultados de TODAS as temporadas
    recordsStore: { _version:1, playerStats:{} }, // stats acumuladas — nunca apagado
    events: [...(seasonOpenBreaking.events ?? []).map(e => ({ ...e, year: 2025 }))],
    view: null,
    retiredPlayers: [],
    
    playerSeasonSlots,   // { playerId → SeasonSlots } — contadores de slots usados
    rivalrySystem: new RivalrySystem(), // instância viva — atualizada fora do reducer
    chronicleEngine,
    newsEngine: initialNewsEngine,       // motor de jornalismo — feed de artigos

    // ── Sponsorship System (Fases 3–5) ───────────────────────────
    sponsorPool: initSponsorPool(),
    pendingOffers: [],
    highestPaidPlayerId: null,

    // ── Coaching System ───────────────────────────────────────────
    // Pool já com todos os coaches distribuídos.
    // processCoachContracts() no ADVANCE_YEAR cuida de renovações e trocas.
    coachPool: finalCoachPool,
  };
}

// ═══════════════════════════════════════════════════════════════════
// REDUCER
// ═══════════════════════════════════════════════════════════════════

function reducer(state, action) {
  switch (action.type) {
    case 'SET_PREPARED_TOURNAMENT_PACKAGE':
      return { ...state, preparedTournamentPackage: action.package ?? null };

    case 'SET_VIEW':
      return { ...state, view: action.view };

    case 'SKIP_TOURNAMENT': {
      // Avança calendarIndex sem simular (usado para Olimpíadas em anos não-olímpicos)
      return { ...state, calendarIndex: state.calendarIndex + 1, preparedTournamentPackage: null };
    }

    case 'APPLY_TOURNAMENT_RESULT': {
      const { tournamentId, result, tournament } = action;
      const { bracket, qualifiers, preQualWinners } = result;

      // ── Rotação de kits por torneio ────────────────────────────────────────
      // Cada jogador sorteia um dos seus 5 kits no início de cada torneio.
      // Usa tournamentId + playerId como semente para ser determinístico
      // (replay do mesmo torneio = mesmo kit).
      function pickKitIndex(playerId, tId, numKits) {
        if (!numKits || numKits <= 1) return 0;
        let h = 5381;
        const s = `${tId}|${playerId}`;
        for (let i = 0; i < s.length; i++) {
          h = ((h << 5) + h) + s.charCodeAt(i);
          h = h & 0x7fffffff;
        }
        return h % numKits;
      }
      const tourPlayersWithKits = state.tourPlayers.map(p => {
        if (!p.kits?.length) return p;
        const idx = pickKitIndex(p.id, tournamentId, p.kits.length);
        if (idx === p.activeKitIndex) return p; // sem mudança, evita re-render
        return { ...p, activeKitIndex: idx };
      });
      const newStore = { ...state.rankingStore };
      const isProspects = false; // prospects removed
      const pointMap = computeTournamentPoints(tournament, bracket, TOURNAMENT_POINTS);
      const tInfo = { id: tournament.id, name: tournament.name, category: tournament.category, weekIndex: tournament.weekIndex, season: state.year };

      // Mapa de todos os jogadores para atualizar finance rapidamente
      const allPlayersById = Object.fromEntries(
        [...tourPlayersWithKits, ...state.prospects].map(p => [p.id, p])
      );

      for (const [pid, { round, points }] of pointMap) {
        registerResult(newStore, pid, tInfo, round, isProspects);
        // ── Finance: prize money ──────────────────────────────────────────────
        const fp = allPlayersById[pid];
        if (fp) awardPrizeMoney(fp, tournament.category, round, state.year, tournament.name);
      }

      // Pontos de Qualify (Q): jogadores que passaram o qualify e entram no main draw
      if (!isProspects && qualifiers?.length > 0) {
        const qPts = TOURNAMENT_POINTS[tournament.category]?.['Q'] ?? 0;
        if (qPts > 0) {
          for (const q of qualifiers) {
            registerResult(newStore, q.id, tInfo, 'Q', false);
          }
        }
      }

      // Pontos de Pré-Qualify (PQ): jogadores que venceram o pré-qualify (ranks 65-128)
      if (!isProspects && preQualWinners?.length > 0) {
        const pqPts = TOURNAMENT_POINTS[tournament.category]?.['PQ'] ?? 0;
        if (pqPts > 0) {
          for (const q of preQualWinners) {
            registerResult(newStore, q.id, tInfo, 'PQ', false);
          }
        }
      }

      // Recalcula rankings
      const allIds = state.tourPlayers.map(p => p.id);
      const ranked = computeRanking(newStore, allIds);
      const prospectRanked = [];

      // Atualiza rankPosition
      const rankMap = Object.fromEntries(ranked.map(r => [r.playerId, r.position]));
      const prospectRankMap = {};

      // ── LESÕES: atualizar estado pós-torneio ──────────────────
      const injuryMeta = result.updatedByInjury ?? {};
      const withdrawals = result.injuryWithdrawals ?? new Set();
      const injEventsRaw = result.injuryEvents ?? [];

      const injuryEventsForTimeline = injEventsRaw
        .filter(Boolean)
        .filter(e => {
          const player = state.tourPlayers.find(p => p.id === e.playerId);
          const pos = player?.rankPosition ?? 99;
          const grade = injuryMeta[e.playerId]?.injury?.grade ?? e.injury?.grade ?? 1;
          return pos <= 50 || grade >= 2;
        })
        .map(e => ({ ...e, year: state.year }));

      // ── FORMA: calcular deltas deste torneio ─────────────────────
      const bracketRounds = result.bracket?.rounds ?? [];
      const totalBRounds  = bracketRounds.length;
      const formDeltaMap  = new Map();
      const formHistMap   = {};
      const participatedIds = new Set();
      const ROUND_FULL_LABEL = {
        F: 'Final', SF: 'Semifinal', QF: 'Quartas', R16: 'Oitavas', R32: '3ª Rodada',
      };
      bracketRounds.forEach((round, roundIdx) => {
        const fromEnd      = totalBRounds - 1 - roundIdx;
        const formRoundIdx = Math.max(0, Math.min(4, 4 - fromEnd));
        const rl           = fromEnd === 0 ? 'F' : fromEnd === 1 ? 'SF' : fromEnd === 2 ? 'QF' : fromEnd === 3 ? 'R16' : 'R32';
        const rlFull       = ROUND_FULL_LABEL[rl] ?? rl;
        const row          = FORM_POINTS_TABLE[formRoundIdx] ?? { win: 0, loss: 0 };
        round.forEach(match => {
          if (match.isBye || !match.winner) return;
          if (match.playerA?.id) participatedIds.add(match.playerA.id);
          if (match.playerB?.id) participatedIds.add(match.playerB.id);
          const winId  = match.winner.id;
          const loser  = match.playerA?.id === winId ? match.playerB : match.playerA;
          if (!loser) return;
          const loseId = loser.id;
          formDeltaMap.set(winId,  (formDeltaMap.get(winId)  ?? 0) + row.win);
          formDeltaMap.set(loseId, (formDeltaMap.get(loseId) ?? 0) + row.loss);
          if (!formHistMap[winId])  formHistMap[winId]  = [];
          if (!formHistMap[loseId]) formHistMap[loseId] = [];
          formHistMap[winId].push({  round: rl, label: `Vence a ${rlFull}`,   delta: row.win,  tournamentName: tournament.name, year: state.year });
          formHistMap[loseId].push({ round: rl, label: `Perde na ${rlFull}`,  delta: row.loss, tournamentName: tournament.name, year: state.year });
        });
      });
      for (const q of qualifiers ?? []) participatedIds.add(q.id);
      for (const pq of preQualWinners ?? []) participatedIds.add(pq.id);
      const breakingResolvedEvents = [];

      const updatedTourPlayers = tourPlayersWithKits.map(p => {
        // Aplica estado de lesão atualizado da rodada
        let np = injuryMeta[p.id] ?? ensurePhysicalCondition(p);
        // Decai condição física de quem jogou; recupera quem ficou fora
        if (withdrawals.has(p.id)) {
          np = recoverPhysicalCondition(np);
        } else {
          np = decayPhysicalCondition(np, tournament);
        }
        // Tick da lesão (avança 1 slot)
        np = tickInjury(np);
        const breakingTick = tickBreakingNews(np, {
          year: state.year,
          tournament,
          participated: participatedIds.has(p.id),
        });
        np = breakingTick.player;
        if (breakingTick.events?.length) {
          breakingResolvedEvents.push(...breakingTick.events);
        }
        // Aplica delta de forma (macro — formPoints para ranking)
        const fDelta = formDeltaMap.get(p.id) ?? 0;
        const newFP  = clampFormPoints((np.formPoints ?? 0) + fDelta);
        const newFH  = fDelta !== 0
          ? [...(np.formHistory ?? []), ...(formHistMap[p.id] ?? [])]
          : (np.formHistory ?? []);
        // FASE 2.1 — Atualizar recentForm (micro — por superfície, para motor de jogo)
        // Percorrer os rounds para encontrar a partida deste jogador e seu resultado
        const surf = tournament.surface ?? 'HARD';
        const oppRank = np.rankPosition ?? 99;
        let npWithForm = { ...np, formPoints: newFP, formHistory: newFH, rankPosition: rankMap[p.id] ?? np.rankPosition };

        // FASE 2 (nova): partidas de qualifying — eliminados nunca chegavam ao main draw
        // mas precisam ter recentForm atualizado (IFR congelava para quem só jogou classify)
        const qualRoundsData = result.qualRoundsData ?? [];
        for (const qm of qualRoundsData) {
          const isA = qm.playerA?.id === p.id;
          const isB = qm.playerB?.id === p.id;
          if (!isA && !isB) continue;
          const opp = isA ? qm.playerB : qm.playerA;
          const won = qm.winner?.id === p.id;
          npWithForm = updateRecentForm(npWithForm, {
            won,
            surface: qm.surface ?? surf,
            oppRank: opp?.rankPosition ?? 99,
            sets: qm.sets ?? [0, 0],
          });
        }

        const champId = bracket.champion?.id;
        bracketRounds.forEach(round => {
          round.forEach(match => {
            if (match.isBye || !match.winner || !match.playerA || !match.playerB) return;
            const isA = match.playerA.id === p.id;
            const isB = match.playerB.id === p.id;
            if (!isA && !isB) return;
            const opp = isA ? match.playerB : match.playerA;
            const won = match.winner.id === p.id;
            // FASE 3: extrair tiebreaks do match result para tiebreakForm
            const myStats  = isA ? match.result?.stats?.a : match.result?.stats?.b;
            const oppStats = isA ? match.result?.stats?.b : match.result?.stats?.a;
            const tbWon    = myStats?.tiebreaksWon  ?? null;
            const tbLost   = oppStats?.tiebreaksWon ?? null;
            npWithForm = updateRecentForm(npWithForm, {
              won,
              surface: surf,
              oppRank: opp.rankPosition ?? 99,
              sets:    match.result?.sets ?? [0, 0],
              tiebreakWon:  tbWon  !== null && (tbWon  > 0) ? true  : (tbWon  !== null ? false : null),
              tiebreakLost: tbLost !== null && (tbLost > 0) ? true  : null,
            });
            // FASE 4 — Atualizar surfaceStats histórico de carreira
            const isFinal = champId && won && match.winner.id === champId &&
              bracketRounds.indexOf(round) === bracketRounds.length - 1;
            npWithForm = updateSurfaceStats(npWithForm, {
              won,
              surface: surf,
              isTournamentTitle: isFinal,
            });
          });
        });
        // Recalcular surfaceIdentity após cada torneio (barato — só leitura de surfaceStats)
        const newIdentity = computeSurfaceIdentity(npWithForm);
        if (newIdentity) npWithForm = { ...npWithForm, surfaceIdentity: newIdentity };

        // ── Fase 2: match rating individual (IndividualRating) ──────────────────
        // Para cada partida do jogador neste torneio, extrai rating da engine completa
        bracketRounds.forEach(round => {
          round.forEach(match => {
            if (match.isBye || !match.result?.stats || !match.playerA || !match.playerB) return;
            const isA = match.playerA.id === p.id;
            const isB = match.playerB.id === p.id;
            if (!isA && !isB) return;
            const matchStats = isA ? match.result.stats.a : match.result.stats.b;
            if (!matchStats) return;
            // shotCount: total de golpes (engine completa tem attackShots/defenseShots)
            const shotCount = (matchStats.attackShots ?? 0) + (matchStats.defenseShots ?? 0) +
              (matchStats.qualityCount ?? matchStats.winners ?? 0);
            if (shotCount > 0 || matchStats.qualityCount > 0) {
              const rating = computeRating(matchStats, Math.max(shotCount, matchStats.qualityCount ?? 1));
              npWithForm = pushMatchRating(npWithForm, rating.score);
            } else {
              // Fallback para FastSimulation: usa winners/aces/erros para eficiência básica
              const w   = matchStats.winners ?? 0;
              const a   = matchStats.aces    ?? 0;
              const ue  = matchStats.unforcedErrors ?? 0;
              const fe  = matchStats.forcedErrors   ?? 0;
              const est = Math.max(w + a + ue + fe, 1);
              if (est > 1) {
                const effRating = computeRating(
                  { ...matchStats, attackShots: w + a, defenseShots: fe, qualityCount: 0 },
                  est
                );
                npWithForm = pushMatchRating(npWithForm, effRating.score);
              }
            }
          });
        });

        // ── Fase 2: atualiza IFR + Visibilidade + SponsorSignal ────────────────
        npWithForm = updatePlayerPhaseTwo(npWithForm, {
          year: state.year,
          newsEngine:    state.newsEngine    ?? null,
          rivalrySystem: state.rivalrySystem ?? null,
          allPlayers:    state.tourPlayers,
        });

        // FASE 2: CoachTacticTracker → modo headless/fast
        // Gera entradas sintéticas de histórico tático para cada partida do jogador.
        // No modo visual, o tracker recebe log ponto-a-ponto; aqui usamos stats agregados.
        if (npWithForm.coach?.coachId) {
          bracketRounds.forEach(round => {
            round.forEach(match => {
              if (match.isBye || !match.winner || !match.playerA || !match.playerB) return;
              const isA = match.playerA.id === npWithForm.id;
              const isB = match.playerB.id === npWithForm.id;
              if (!isA && !isB) return;
              const matchStats = isA ? match.result?.stats?.a : match.result?.stats?.b;
              if (!matchStats) return;
              const won = match.winner.id === npWithForm.id;
              const fromEnd = bracketRounds.length - 1 - bracketRounds.indexOf(round);
              const rl = fromEnd === 0 ? 'F' : fromEnd === 1 ? 'SF' : fromEnd === 2 ? 'QF' : fromEnd === 3 ? 'R16' : 'R32';
              const tacticEntry = generateFastSimTacticEntry(npWithForm, { won, stats: matchStats, surface: surf, roundLabel: rl });
              if (tacticEntry) {
                const trustDelta = calcTrustDelta(tacticEntry.report);
                const updatedCoach = appendTacticHistory(
                  applyTrustDelta(npWithForm.coach, trustDelta),
                  tacticEntry.report,
                  [],
                  tacticEntry.matchContext,
                );
                if (updatedCoach) npWithForm = { ...npWithForm, coach: updatedCoach };
              }
            });
          });
        }

        return npWithForm;
      });

      const updatedProspects = [];
      // legacy: state.prospects.map(p => ({
      //   ...ensurePhysicalCondition(p),
      //   rankPosition: p.rankPosition,
      // }));

      // Evento narrativo
      const champ = bracket.champion;
      const newEvents = [];
      if (champ) newEvents.push({ type: 'title', text: `${champ.name} vence ${tournament.name}`, tournamentId, year: state.year });
      newEvents.push(...injuryEventsForTimeline);

      // ── Olimpíadas: atualiza careerTitles.olympic nos jogadores ──────────────
      if (tournament.isOlympic) {
        const _rounds = bracket.rounds ?? [];
        const _finalMatch = _rounds.at(-1)?.[0];
        const _sfRound = _rounds.at(-2) ?? [];
        const _finalistId = _finalMatch
          ? (_finalMatch.playerA?.id === champ?.id ? _finalMatch.playerB?.id : _finalMatch.playerA?.id)
          : null;
        const _bronzeIds = new Set();
        for (const m of _sfRound) {
          if (m.isBye || !m.winner || !m.playerA || !m.playerB) continue;
          const _loser = m.playerA.id === m.winner.id ? m.playerB : m.playerA;
          if (_loser) _bronzeIds.add(_loser.id);
        }
        // Aplica medals nos updatedTourPlayers depois (override feito logo abaixo)
        for (let _i = 0; _i < updatedTourPlayers.length; _i++) {
          const _p = updatedTourPlayers[_i];
          const _oly = { ...(_p.careerTitles?.olympic ?? { gold: 0, silver: 0, bronze: 0 }) };
          if (champ && _p.id === champ.id)         _oly.gold   = (_oly.gold   ?? 0) + 1;
          else if (_p.id === _finalistId)           _oly.silver = (_oly.silver ?? 0) + 1;
          else if (_bronzeIds.has(_p.id))           _oly.bronze = (_oly.bronze ?? 0) + 1;
          else continue;
          updatedTourPlayers[_i] = {
            ..._p,
            careerTitles: { ...(_p.careerTitles ?? {}), olympic: _oly },
          };
        }
        if (champ) newEvents.push({ type: 'olympic_gold', text: `${champ.name} conquista ouro olímpico`, tournamentId, year: state.year });
      }

      // ── Lesões em campo e abandonos (do resultado de cada partida do bracket) ──
      const bracketRoundsForInMatch = result.bracket?.rounds ?? [];
      for (const round of bracketRoundsForInMatch) {
        for (const match of round) {
          if (!match.result) continue;
          // Abandono
          if (match.result.retirement) {
            const ret = match.result.retirement;
            newEvents.push({
              type: 'in_match_retirement',
              text: `${ret.playerName} abandona partida em ${tournament.name} por lesão (${ret.injuryType})`,
              playerId: ret.playerId,
              playerName: ret.playerName,
              year: state.year,
              injury: { grade: ret.severity === 'SEVERE' ? 3 : 2, type: ret.injuryType },
            });
          }
          // MTO sem abandono
          if (match.result.inMatchInjuryEvents?.length > 0 && !match.result.retirement) {
            for (const ev of match.result.inMatchInjuryEvents.slice(0, 1)) {
              if (ev.type === 'in_match_injury') {
                const player = state.tourPlayers.find(p => p.id === ev.playerId);
                const pos = player?.rankPosition ?? 99;
                if (pos <= 30) { // só logar MTO de top-30
                  newEvents.push({
                    ...ev,
                    year: state.year,
                    text: `${ev.playerName} para para atendimento médico em ${tournament.name}`,
                  });
                }
              }
            }
          }
        }
      }

      // ── RIVALIDADES: alimenta sistema com cada partida do bracket ──
      const rs = state.rivalrySystem;
      if (rs) {
        const totalRounds = bracketRounds.length;
        bracketRounds.forEach((round, roundIdx) => {
          const fromEnd = totalRounds - 1 - roundIdx;
          const rl = fromEnd === 0 ? 'F' : fromEnd === 1 ? 'SF' : fromEnd === 2 ? 'QF' : fromEnd === 3 ? 'R16' : 'R32';
          round.forEach(match => {
            if (match.isBye || !match.winner || !match.playerA || !match.playerB) return;
            const winnerId = match.winner.id;
            const loserId  = (match.playerA.id === winnerId ? match.playerB : match.playerA).id;
            rs.updateFromMatch({
              player1Id:  match.playerA.id,
              player2Id:  match.playerB.id,
              winnerId,
              round:      rl,
              category:   tournament.category,
              tournament: tournament.name,
              season:     state.year,
              setsDetail: match.result?.setsDetail ?? [],
            }, { players: [...updatedTourPlayers, ...updatedProspects] });
          });
        });
      }

      const newResult = { bracket, qualifiers, preQualWinners: preQualWinners ?? [], tournament };

      // ── Records Store: atualiza incrementalmente ───────────────────
      const allPlayersForSnap = [...(state.tourPlayers ?? []), ...(state.prospects ?? [])];
      const snapMap = Object.fromEntries(allPlayersForSnap.map(p => [p.id, p]));
      const currentRecordsStore = getOrMigrateRecordsStore(state);
      // Deep-copy cada objeto de stats individual para evitar mutação de referências
      // compartilhadas quando o React StrictMode invoca o reducer duas vezes.
      // Um shallow spread ({ ...currentRecordsStore.playerStats }) copia apenas as
      // chaves do mapa — os objetos internos continuam sendo a mesma referência, então
      // os ++ do updateRecordsStoreWithResult corrompem o estado "original" na 2ª chamada.
      const updatedRecordsStore = {
        _version: 1,
        playerStats: Object.fromEntries(
          Object.entries(currentRecordsStore.playerStats).map(([id, v]) => [id, {
            ...v,
            gsWonIds:   [...(v.gsWonIds   ?? [])],
            titleYears: [...(v.titleYears ?? [])],
            surfWins:   { ...(v.surfWins   ?? {}) },
            surfLosses: { ...(v.surfLosses ?? {}) },
            surfTitles: { ...(v.surfTitles ?? {}) },
            seasonData: Object.fromEntries(
              Object.entries(v.seasonData ?? {}).map(([yr, sd]) => [yr, { ...sd }])
            ),
          }])
        ),
      };
      updateRecordsStoreWithResult(updatedRecordsStore, newResult, state.year, snapMap);

      // ── Fase 4/5: monitorar contratos ativos após torneio ────────
      let postMonitorTourPlayers = updatedTourPlayers;
      let postMonitorProspects   = updatedProspects;
      let postMonitorPool        = state.sponsorPool;
      let postMonitorNews        = [];
      let breakingWaveEvents     = [];
      if (state.sponsorPool) {
        const gsWinnerId = tournament?.category === 'GRAND_SLAM'
          ? bracket?.champion?.id ?? null : null;
        const injured6plus = [...updatedTourPlayers, ...updatedProspects]
          .filter(p => p.injury?.active && (p.injury?.monthsOut ?? 0) >= 6);
        const monResult = monitorContracts(
          { ...state, players: [...updatedTourPlayers, ...updatedProspects] },
          { tournament, grandSlamWinnerId: gsWinnerId, injuredPlayers: injured6plus }
        );
        const monMap = Object.fromEntries((monResult.state.players ?? []).map(p => [p.id, p]));
        postMonitorTourPlayers = updatedTourPlayers.map(p => monMap[p.id] ?? p);
        postMonitorProspects   = updatedProspects.map(p => monMap[p.id] ?? p);
        postMonitorPool        = monResult.state.sponsorPool ?? state.sponsorPool;
        if (monResult.news.length > 0 && state.newsEngine) {
          // Cap: máximo 2 artigos de patrocínio por torneio.
          // Prioriza ELITE e jogadores melhor ranqueados.
          const _monNewsSorted = [...monResult.news].sort((a, b) => {
            const aElite = (a.type === 'SPONSOR_ELITE') ? 1 : 0;
            const bElite = (b.type === 'SPONSOR_ELITE') ? 1 : 0;
            if (aElite !== bElite) return bElite - aElite;
            return (a.player?.rankPosition ?? 999) - (b.player?.rankPosition ?? 999);
          });
          postMonitorNews = _monNewsSorted.slice(0, 2);
        }
      }

      const nextCalendarIndex = state.calendarIndex + 1;
      const nextTournament = CALENDAR[nextCalendarIndex] ?? null;
      if (nextTournament) {
        const breakingWave = maybeTriggerBreakingNews(
          postMonitorTourPlayers,
          state.year,
          state,
          { phase: 'TOURNAMENT', tournament: nextTournament },
        );
        postMonitorTourPlayers = breakingWave.players ?? postMonitorTourPlayers;
        breakingWaveEvents = breakingWave.events ?? [];
      }
      const nextPreparedTournamentPackage = nextTournament
        ? buildPreparedTournamentPackage(
            nextTournament,
            postMonitorTourPlayers,
            postMonitorProspects,
            state.playerSeasonSlots ?? {},
            state.year,
          )
        : null;

      const postStateView = {
        ...state,
        tourPlayers: postMonitorTourPlayers,
        prospects: postMonitorProspects,
        tournamentResults: {
          ...state.tournamentResults,
          [tournamentId]: newResult,
        },
      };
      const breakingEvents = [...breakingResolvedEvents, ...breakingWaveEvents].map(e => ({ ...e, year: e.year ?? state.year }));
      const postNewsArticles = generateTournamentNews(tournament, bracket, postStateView, result).slice(0, 6);
      const previewNewsArticles = nextTournament && nextPreparedTournamentPackage
        ? generateUpcomingTournamentNews(nextTournament, nextPreparedTournamentPackage, postStateView, { seasonStart: false }).slice(0, 2)
        : [];
      const breakingNewsArticles = generateBreakingNewsArticles(breakingEvents, postMonitorTourPlayers, state.year);
      const breakingFollowupArticles = generateBreakingTournamentFollowups(
        tournament,
        { bracket, qualifiers, preQualWinners: preQualWinners ?? [] },
        postStateView,
      );
      if (state.newsEngine) {
        state.newsEngine.push([...postNewsArticles, ...previewNewsArticles]);
        if (postMonitorNews.length > 0) state.newsEngine.append(postMonitorNews);
        if (breakingFollowupArticles.length > 0) state.newsEngine.append(breakingFollowupArticles);
        if (breakingNewsArticles.length > 0) state.newsEngine.append(breakingNewsArticles);
      }

      return {
        ...state,
        sponsorPool: postMonitorPool,
        rankingStore: newStore,
        recordsStore: updatedRecordsStore,
        tourPlayers: postMonitorTourPlayers,
        prospects: postMonitorProspects,
        preparedTournamentPackage: nextPreparedTournamentPackage,
        tournamentResults: {
          ...state.tournamentResults,
          [tournamentId]: newResult,
        },
        historicalTournamentResults: state.historicalTournamentResults ?? {},
        events: [...state.events, ...newEvents, ...breakingEvents],
        calendarIndex: nextCalendarIndex,
      };
    }

    case 'ADVANCE_YEAR': {
      // ── RANKING: preserva pontos do ano anterior com defesa rolling ──
      // Em vez de criar um store zerado, copia o store atual e aplica
      // applyPointsDefense para expirar resultados com mais de 1 ano.
      // Prospects resetam (circuito jovem — ranking anual por design).
      const newStore = {
        playerResults:   { ...state.rankingStore.playerResults },
        prospectResults: {},   // prospects resetam todo ano
        ranked:          [],
        prospectRanked:  [],
      };
      // Copia profunda dos resultados por jogador (evita mutação do state anterior)
      for (const pid of Object.keys(newStore.playerResults)) {
        newStore.playerResults[pid] = [...newStore.playerResults[pid]];
      }
      // Expira resultados com mais de 1 temporada (weekIndex=-1 para não expirar nada no início)
      applyPointsDefense(newStore, state.year + 1, -1);
      const nextYear = state.year + 1;

      // ── 1. DESENVOLVIMENTO (atributos, declínio, alcunhas) ────
      // Mapeia category do calendário → titleType do DevelopmentSystem
      const CAT_TO_TITLE = {
        GRAND_SLAM:       'SLAM',
        MASTERS_1000:     'MASTERS',
        ATP_500:          'ATP500',
        ATP_250:          'ATP250',
        ATP_100:          'ATP100',
        FINALS:           'ATP500',       // ATP Finals = peso de 500
      };
      const TITLE_ORDER = ['SLAM', 'MASTERS', 'ATP500', 'ATP250', 'ATP100'];
      const SURFACE_FROM_CAT = {
        GRAND_SLAM: null, // surface varies — handled per tournament below
        MASTERS_1000: null, FINALS: null, ATP_500: null, ATP_250: null,
      };
      const titleWinners = {};
      // ── Coletar seasonMetrics: wins, finals, surface wins, tiebreaks, etc. ──
      const seasonMetrics = {};
      const _smAdd = (pid, field, val = 1) => {
        if (!pid) return;
        seasonMetrics[pid] = seasonMetrics[pid] ?? {};
        seasonMetrics[pid][field] = (seasonMetrics[pid][field] ?? 0) + val;
      };

      for (const res of Object.values(state.tournamentResults)) {
        const { bracket, tournament } = res ?? {};
        // Suporta tanto formato completo (bracket) quanto slim (res._slim)
        if (!bracket && !res?._slim) continue;
        const cat       = tournament?.category ?? '';
        const surface   = tournament?.surface  ?? null;  // 'CLAY'|'GRASS'|'HARD'|'INDOOR'
        const isGS      = cat === 'GRAND_SLAM';
        const isMasters = cat === 'MASTERS_1000';
        const isIndoor  = surface === 'INDOOR';
        const titleType = CAT_TO_TITLE[cat] ?? 'ATP250';

        // Campeão — formato completo usa bracket.champion, slim usa res.champion
        const champ = res._slim ? res.champion : bracket?.champion;
        if (champ) {
          const existing = titleWinners[champ.id];
          if (!existing || TITLE_ORDER.indexOf(titleType) < TITLE_ORDER.indexOf(existing))
            titleWinners[champ.id] = titleType;
          if (isIndoor) _smAdd(champ.id, 'indoorTitles');
          // ── Contagem total de títulos (usada em metas de parceria) ──
          _smAdd(champ.id, 'titles');

          // Contagem por categoria — acumula TODOS os títulos (não só o melhor do ano)
          seasonMetrics[champ.id] = seasonMetrics[champ.id] ?? {};
          const _ct = seasonMetrics[champ.id].titlesByCategory = seasonMetrics[champ.id].titlesByCategory ?? {};
          const _CT_KEY = { GRAND_SLAM: 'gs', MASTERS_1000: 'masters', FINALS: 'finals', ATP_500: 'atp500', ATP_250: 'atp250', ATP_100: 'atp100' };
          const _ctKey = _CT_KEY[cat] ?? 'atp250';
          _ct[_ctKey] = (_ct[_ctKey] ?? 0) + 1;
        }

        // ── Resultados slim: extrair wins/finals/semis das arrays do slim ──
        if (res._slim) {
          // Finals: campeão + finalista (+ especializações por categoria)
          if (champ?.id)         _smAdd(champ.id,        'finals');
          if (res.finalist?.id)  _smAdd(res.finalist.id, 'finals');
          if (isGS) {
            if (champ?.id)        _smAdd(champ.id,        'slamFinals');
            if (res.finalist?.id) _smAdd(res.finalist.id, 'slamFinals');
          }
          if (isMasters) {
            if (champ?.id)        _smAdd(champ.id,        'mastersFinals');
            if (res.finalist?.id) _smAdd(res.finalist.id, 'mastersFinals');
          }
          // Semifinalistas
          for (const sf of (res.semis ?? [])) {
            if (sf?.id) {
              _smAdd(sf.id, 'semifinalReached');
              if (isGS) _smAdd(sf.id, 'slamSFs');
            }
          }
          // Wins + surface wins por match
          for (const m of (res.matches ?? [])) {
            if (!m.w) continue;
            _smAdd(m.w, 'wins');
            if (surface === 'CLAY')                     _smAdd(m.w, 'clayWins');
            if (surface === 'GRASS')                    _smAdd(m.w, 'grassWins');
            if (surface === 'HARD' || surface === 'INDOOR') _smAdd(m.w, 'hardWins');
          }
          continue; // tiebreaks/matchPoints não disponíveis em slim — aceitável
        }

        // ── Formato completo (bracket): percorrer rounds ──
        const rounds = bracket.rounds ?? [];
        const totalRounds = rounds.length;
        for (let ri = 0; ri < rounds.length; ri++) {
          const isLastRound   = ri === totalRounds - 1;
          const isSecondLast  = ri === totalRounds - 2;
          for (const match of rounds[ri]) {
            if (match.isBye || !match.winner || !match.result) continue;
            const winnerId = match.winner.id;
            const loserId  = (match.playerA?.id === winnerId ? match.playerB : match.playerA)?.id;

            // Wins
            _smAdd(winnerId, 'wins');

            // Finals / semifinals
            if (isLastRound) {
              _smAdd(winnerId, 'finals');
              if (loserId) _smAdd(loserId, 'finals');
              // Título
              _smAdd(winnerId, 'titles');
              // Slam / Masters specific
              if (isGS)      { _smAdd(winnerId, 'slamFinals');    if (loserId) _smAdd(loserId, 'slamFinals'); }
              if (isMasters) { _smAdd(winnerId, 'mastersFinals'); if (loserId) _smAdd(loserId, 'mastersFinals'); }
            }
            if (isSecondLast) {
              _smAdd(winnerId, 'semifinalReached');
              if (loserId) _smAdd(loserId, 'semifinalReached');
              if (isGS) { _smAdd(winnerId, 'slamSFs'); if (loserId) _smAdd(loserId, 'slamSFs'); }
            }

            // Surface wins
            if (surface === 'CLAY')   _smAdd(winnerId, 'clayWins');
            if (surface === 'GRASS')  _smAdd(winnerId, 'grassWins');
            if (surface === 'HARD' || surface === 'INDOOR') _smAdd(winnerId, 'hardWins');

            // Tiebreaks + match points saved from detailed match result
            const tm = match.result?.traitMetrics;
            if (tm) {
              if (tm.a?.tiebreaksWon && match.playerA?.id === winnerId)    _smAdd(winnerId, 'tiebreaksWon', tm.a.tiebreaksWon);
              if (tm.b?.tiebreaksWon && match.playerB?.id === winnerId)    _smAdd(winnerId, 'tiebreaksWon', tm.b.tiebreaksWon);
              if (tm.a?.matchPointsSaved && match.playerA?.id === winnerId) _smAdd(winnerId, 'matchPointsSaved', tm.a.matchPointsSaved);
              if (tm.b?.matchPointsSaved && match.playerB?.id === winnerId) _smAdd(winnerId, 'matchPointsSaved', tm.b.matchPointsSaved);
            }
          }
        }
      }

      const { updatedPlayers: updatedTour, events: tourDevEvents } = advanceSeason(state.tourPlayers, state.year, 12, titleWinners, seasonMetrics, state.coachPool ?? []);
      const updatedProspectsRaw = [];
      const prospDevEvents = [];

      // ── Finance: processa custos anuais para todos os jogadores ──────────
      for (const p of updatedTour)          { initPlayerFinance(p); processYearEndFinances(p, state.year); }


      // ── Fase 2: recalcula IFR + Visibilidade anualmente ──────────────────
      const phase2Opts = { year: state.year, newsEngine: state.newsEngine, rivalrySystem: state.rivalrySystem, allPlayers: updatedTour };
      for (let i = 0; i < updatedTour.length; i++)
        updatedTour[i] = updatePlayerPhaseTwo(updatedTour[i], phase2Opts);

      // Coleta eventos de migração de estilo para a timeline
      const styleMigEvents = [...(tourDevEvents ?? []), ...(prospDevEvents ?? [])]
        .filter(e => e.type === 'STYLE_MIGRATION')
        .map(e => ({ ...e, year: state.year }));

      // ── Personalidade pré-aquecimento para o sistema de patrocínio ──────
      // processPersonalityEvolution roda mais tarde (linha ~2068, precisa de finalTourPlayers).
      // Mas o sponsorshipWindow precisa de personality.marketability atualizada para calcular
      // interesse de marcas corretamente. Fazemos uma passagem antecipada aqui,
      // usando rankPosition (já atualizado pelo último torneio) + dados disponíveis.
      {
        const _prevRkSponsor = Object.fromEntries(
          [...state.tourPlayers, ...state.prospects].map(p => [p.id, p.rankPosition ?? 999])
        );
        for (let i = 0; i < updatedTour.length; i++) {
          updatedTour[i] = processPersonalityEvolution(updatedTour[i], {
            currentRank:   updatedTour[i].rankPosition ?? 999,
            prevRank:      _prevRkSponsor[updatedTour[i].id] ?? 999,
            titleWon:      titleWinners[updatedTour[i].id] ?? null,
            seasonMetrics: seasonMetrics[updatedTour[i].id] ?? {},
            year:          state.year,
            rivalrySystem: state.rivalrySystem ?? null,
          });
        }
        // Recalcula phaseTwo.sponsorSignal com a marketability já atualizada
        for (let i = 0; i < updatedTour.length; i++)
          updatedTour[i] = updatePlayerPhaseTwo(updatedTour[i], phase2Opts);
      }

      // ── Fase 3/4/5: janela anual de patrocínio ───────────────────
      let _sponsorResult = null;
      if (state.sponsorPool) {
        try {
          _sponsorResult = runSponsorshipWindow({
            ...state,
            players: [...updatedTour],
            year: state.year,
          });
          const _spMap = Object.fromEntries(
            (_sponsorResult.state.players ?? []).map(p => [p.id, p])
          );
          for (let i = 0; i < updatedTour.length; i++) {
            if (_spMap[updatedTour[i].id]) updatedTour[i] = _spMap[updatedTour[i].id];
          }

          if (_sponsorResult.news.length > 0 && state.newsEngine) {
            // Cap: máximo 5 artigos de patrocínio por temporada.
            // Prioridade: ELITE > rescisão ELITE > assinatura top-ranked > renovação.
            const _spNewsSorted = [..._sponsorResult.news].sort((a, b) => {
              const spTier = t => t.type === 'SPONSOR_ELITE' ? 3
                : (t.subtype === 'TERMINATION' || t.subtype === 'ELITE_LOSS') ? 2
                : 1;
              if (spTier(a) !== spTier(b)) return spTier(b) - spTier(a);
              return (a.player?.rankPosition ?? 999) - (b.player?.rankPosition ?? 999);
            });
            state.newsEngine.append(_spNewsSorted.slice(0, 5));
          }
          if (_sponsorResult.chronicleEvents?.length > 0 && state.chronicleEngine) {
            state.chronicleEngine._sponsorEvents = [
              ...(state.chronicleEngine._sponsorEvents ?? []),
              ..._sponsorResult.chronicleEvents,
            ];
            // FASE 2: chronicle events ELITE → artigos no NewsEngine
            // (signings e terminations normais já geram artigos via _buildSigningArticle;
            //  aqui cobrimos os milestones de carreira que só existiam no chronicle)
            if (state.newsEngine) {
              const allPlayersForSponsor = [...(updatedTour ?? [])];
              const eliteMilestoneArticles = generateSponsorNewsFromChronicleEvents(
                _sponsorResult.chronicleEvents,
                allPlayersForSponsor,
                state.year,
              );
              if (eliteMilestoneArticles.length > 0) {
                state.newsEngine.append(eliteMilestoneArticles);
              }
            }
          }
        } catch (e) {
          // silencioso — não interrompe o avanço de temporada
          console.warn('[SponsorshipWindow] erro:', e?.message);
        }
      }

      // ── Alcunhas de carreira (Grand Slam completo, Slam King, GOAT, etc.) ──
      // Requer dados HOF — roda uma vez por temporada após o advanceSeason.
      try {
        const hofStateForAlcunha = {
          tourPlayers: updatedTour,
          prospects: [],
          retiredPlayers: state.retiredPlayers ?? [],
          historicalTournamentResults: state.historicalTournamentResults ?? {},
          tournamentResults: state.tournamentResults ?? {},
          year: state.year,
        };
        const { allStats: hofStats } = computeHOFData(hofStateForAlcunha);
        const allPlayersForAlcunha = [...updatedTour, ...(state.retiredPlayers ?? [])];
        const { updatedPlayers: withCareerAlcunhas } = applyCareerAlcunhas(allPlayersForAlcunha, hofStats);
        const alcunhaById = Object.fromEntries(withCareerAlcunhas.map(p => [p.id, p.alcunha]));
        // Reaplica somente onde houve mudança (não sobrescreve todo o objeto)
        for (const arr of [updatedTour]) {
          for (let i = 0; i < arr.length; i++) {
            const newA = alcunhaById[arr[i].id];
            if (newA && !arr[i].alcunha) arr[i] = { ...arr[i], alcunha: newA };
          }
        }
        if (state.retiredPlayers) {
          for (let i = 0; i < state.retiredPlayers.length; i++) {
            const newA = alcunhaById[state.retiredPlayers[i].id];
            if (newA && !state.retiredPlayers[i].alcunha) {
              state.retiredPlayers[i] = { ...state.retiredPlayers[i], alcunha: newA };
            }
          }
        }
      } catch(e) {
        // silencioso — não interrompe o avanço de temporada
      }

      // ── 2. APOSENTADORIAS DO TOUR ─────────────────────────────
      const breakingSeasonClose = processBreakingNewsSeasonClose(updatedTour, state.year);
      const {
        activePlayers,
        retiredPlayers: newlyRetiredFromSystem,
        events: retEventsCore,
      } = processSeasonRetirements(
        breakingSeasonClose.activePlayers,
        state.year,
        state.tournamentResults,
      );
      const newlyRetired = [
        ...breakingSeasonClose.retiredPlayers,
        ...newlyRetiredFromSystem,
      ];
      const retEvents = [
        ...(breakingSeasonClose.events ?? []),
        ...(retEventsCore ?? []),
      ];
      const retiredCount = newlyRetired.length;

      // ── 3. NOVOS NEWGENS: substituem aposentados direto no tour ──
      // Libera fotos dos aposentados antes de atribuir aos novos
      const poolAfterRelease = releaseRetiredPhotos(
        newlyRetired,
        state.newgenImagePool ?? createEmptyPoolState(),
      );
      const newgenPoolOpts = { _poolState: poolAfterRelease };
      const newTourEntrants = Array.from({ length: retiredCount }, () =>
        generateNewgen(nextYear, { ageRange: [16, 23], ...newgenPoolOpts })
      ).map(p => {
        let np = migrateTournamentPreferences({ ...p });
        np = migrateLifeEventLog(np);
        np = migratePlayerLifeData(np);
        return np;
      });
      const updatedImagePool = newgenPoolOpts._poolState;

      // ── 4. MONTAR ARRAYS FINAIS ───────────────────────────────
      const TARGET_TOUR = 192;
      const finalTourPlayers = [...new Map(
        [...activePlayers, ...newTourEntrants].map(p => [p.id, p])
      ).values()].slice(0, TARGET_TOUR);
      const finalProspects   = [];
      const allRetired       = [...newlyRetired];

      // ── COACHING: processCoachContracts ──────────────────────
      const prevRankMap = Object.fromEntries(
        state.tourPlayers.map(p => [p.id, p.rankPosition ?? 999])
      );
      const allForContracts = finalTourPlayers;

      // ── COACHING (Bloco B): Envelhecimento e aposentadoria de coaches ──
      // Envelhece todos os coaches e sorteia aposentadorias ANTES de
      // processCoachContracts, para que pupilos liberados sejam reassigned nesta
      // mesma passagem.
      const {
        pool:           poolAfterAging,
        retiredCoaches: coachesRetiredThisSeason,
        freedPupilIds:  coachRetirementFreedIds,
      } = ageCoachPool(
        state.coachPool ?? [],
        state.year,
        allForContracts,
        titleWinners,
      );

      // Marca jogadores que perderam técnico por aposentadoria como coachless
      const freedIdSet = new Set(coachRetirementFreedIds);
      const allForContractsAfterAging = freedIdSet.size > 0
        ? allForContracts.map(p => freedIdSet.has(p.id) ? { ...p, coach: null } : p)
        : allForContracts;

      // Gera notícias de aposentadoria de coaches
      // — também envia ao newsEngine como artigos completos
      const coachRetirementArticles = coachesRetiredThisSeason.map(coach => {
        const lastPupil = coach.currentPupilId
          ? allForContracts.find(p => p.id === coach.currentPupilId) ?? null
          : null;
        const retType = getCoachRetirementType(coach);
        return genCoachRetirement({ coach, lastPupil, retirementType: retType, year: state.year });
      });
      // Normaliza para o shape da timeline (text + icon) e marca como sem tournamentId
      const coachRetirementNews = coachRetirementArticles.map(art => ({
        type:       'retirement',
        text:       art.headline,
        year:       art.year ?? state.year,
        icon:       '🎓',
        playerId:   art.coach?.id ?? null,
        playerName: art.coach?.name ?? null,
        isCoach:    true,
        _article:   art,   // artigo completo disponível para views que queiram mais detalhe
      }));

      const {
        players: allAfterContracts,
        coachPool: poolAfterContracts,
        events: contractEvents,
      } = processCoachContracts(
        allForContractsAfterAging,
        poolAfterAging,
        state.year,
        prevRankMap,
        titleWinners,
      );

      // Re-separa tour e prospects após contratos
      const allAfterMap = Object.fromEntries(allAfterContracts.map(p => [p.id, p]));
      const tourAfterContracts      = finalTourPlayers.map(p => allAfterMap[p.id] ?? p);
      const prospectsAfterContracts = [];

      // ── COACHING: initPartnership para jogadores que ganharam novo técnico ──
      // Qualquer jogador que mudou de técnico (contratEvents.COACH_HIRED) precisa
      // de bond/goal inicializados para a nova parceria.
      const coachMapForInit = Object.fromEntries(poolAfterContracts.map(c => [c.id, c]));
      const allAfterInit = allAfterContracts.map(p => {
        if (!p.coach) return p;
        if (p.coach.bondScore !== undefined) return p;   // já inicializado
        const coach = coachMapForInit[p.coach.coachId];
        return coach ? initPartnership(p, coach, state.year) : p;
      });

      // ── PARTNERSHIP: avalia metas, atualiza bonds, marcos e gera novas metas ──
      const {
        players:   allAfterPartnership,
        coachPool: poolAfterPartnership,
        events:    partnershipEvents,
      } = processAllPartnerships(
        allAfterInit,
        poolAfterContracts,
        state.year,
        seasonMetrics,
        titleWinners,
        prevRankMap,
      );

      // Re-separa após parcerias
      const allPartnerMap = Object.fromEntries(allAfterPartnership.map(p => [p.id, p]));
      const tourAfterPartnership      = tourAfterContracts.map(p => allPartnerMap[p.id] ?? p);
      const prospectsAfterPartnership = [];

      // ── 7. RANKINGS ───────────────────────────────────────────
      const ranked = computeRanking(newStore, finalTourPlayers.map(p => p.id));
      const prospectRanked = [];
      const rankMap = Object.fromEntries(ranked.map(r => [r.playerId, r.position]));
      const prospectRankMap = {};

      // ── 7.5 EVOLUÇÃO DE PERSONALIDADE ────────────────────────
      // Roda após rankMap calculado e após _seasonHistory atualizado.
      // Processa tour + prospects em um único passo.
      const allAfterPersonality = [
        ...tourAfterPartnership,
        // prospectsAfterPartnership removed
      ].map(p =>
        processPersonalityEvolution(p, {
          currentRank:   rankMap[p.id]           ?? 999,
          prevRank:      prevRankMap[p.id]        ?? 999,
          titleWon:      titleWinners[p.id]       ?? null,
          seasonMetrics: seasonMetrics[p.id]      ?? {},
          year:          state.year,
          rivalrySystem: state.rivalrySystem      ?? null,
        })
      );
      const _personMap              = Object.fromEntries(allAfterPersonality.map(p => [p.id, p]));
      const tourAfterPersonality    = tourAfterPartnership.map(p => _personMap[p.id] ?? p);
      const prospectsAfterPersonality = [];

      // ── 7.6 LIFE EVENTS ──────────────────────────────────────
      // Rola eventos de vida fora da quadra para cada jogador.
      // Roda após personalidade (marketability já atualizada).
      const _lifeEventResults = [...tourAfterPersonality, ...prospectsAfterPersonality].map(p => {
        const isInjured  = !!(p.injury?.slotsRemaining > 0);
        const titleWon   = !!(titleWinners[p.id]);
        const rank       = rankMap[p.id] ?? 999;
        return rollLifeEvents(
          migrateLifeEventLog(migratePlayerLifeData(p)),
          state.year,
          { rank, titleWonThisSeason: titleWon, injured: isInjured }
        );
      });
      const _lifeMap = Object.fromEntries(
        _lifeEventResults.map(r => [r.player.id, r.player])
      );
      const tourAfterLife      = tourAfterPersonality.map(p      => _lifeMap[p.id] ?? p);
      const prospectsAfterLife = [];

      // ── 7.7 LIFE EVENT NEWS — envia eventos noticiáveis ao NewsEngine ──
      if (state.newsEngine) {
        const allLifeEvents = _lifeEventResults.flatMap(r => r.events ?? []);
        const newsworthyEvents = allLifeEvents.filter(e => e.newsworthy);
        if (newsworthyEvents.length > 0) {
          const lifeArticles = newsworthyEvents
            .map(event => {
              const player = _lifeMap[
                _lifeEventResults.find(r => (r.events ?? []).includes(event))?.player?.id
              ];
              if (!player) return null;
              return genLifeEventArticle(player, event, state.year);
            })
            .filter(Boolean);
          if (lifeArticles.length > 0) state.newsEngine.append(lifeArticles);
        }
      }

      // ── 8. EVENTOS ────────────────────────────────────────────
      const promoted = []; // prospects system removed – always empty
      const promoEvents = promoted.map(p => ({
        type: 'promotion',
        text: `${p.name} promovido das prospects para o tour principal`,
        playerId: p.id,
        playerName: p.name,
        year: state.year,
        icon: '⬆️',
      }));

      const agedOutEvents = []; // agedOutProspects removed
      const _agedOutProspects_noop = [].map(p => ({
        type: 'prospect_retired',
        text: p.retirementInfo.message,
        playerId: p.id,
        playerName: p.name,
        year: state.year,
        icon: '📋',
      }));

      let seasonOpenBreakingNext = { players: null, events: [] };

      let yearEvents = [
        { type: 'year', text: `Temporada ${nextYear} começa`, year: nextYear },
        ...retEvents,
        ...promoEvents,
        // aged-out só entra na timeline se o jogador era top-8 prospects
        // agedOutEvents removed
        // Migrações de estilo por declínio físico
        ...styleMigEvents,
        // Marcos e eventos de parceria técnico-jogador
        ...partnershipEvents.filter(Boolean),
        // Trocas de técnico relevantes (contratações também)
        // Sintetiza text com nomes de jogador/técnico para NoticiasView
        ...(contractEvents ?? []).filter(e =>
          e.type === 'COACH_FIRED' || e.type === 'COACH_RENEWED' || e.type === 'COACH_HIRED'
        ).map(e => {
          const player = allAfterContracts.find(p => p.id === e.playerId);
          const coach  = poolAfterContracts.find(c => c.id === e.coachId);
          const pName  = player?.name ?? `Jogador ${e.playerId}`;
          const cName  = coach?.name ?? coach?.fullName ?? `Técnico ${e.coachId}`;
          const text = e.type === 'COACH_HIRED'
            ? `${pName} contrata ${cName} como novo técnico`
            : e.type === 'COACH_FIRED'
            ? `${pName} dispensa técnico ${cName}`
            : `${pName} renova contrato com técnico ${cName}`;
          return { ...e, text, year: state.year };
        }),
        // Aposentadorias de técnicos (Bloco B)
        ...coachRetirementNews,
      ];

      // ── 9. RESUMO DE TEMPORADA (para modal) ──────────────────
      // Calcula OVR ganhos/perdidos usando _seasonHistory
      const allUpdated = [...finalTourPlayers, ...finalProspects];
      const ovrChanges = allUpdated
        .map(p => {
          const hist = p._seasonHistory;
          const last = Array.isArray(hist) ? hist[hist.length - 1] : null;
          return last ? { player: p, delta: last.ovrDelta, ovrBefore: last.ovrBefore, ovrAfter: last.ovr } : null;
        })
        .filter(Boolean)
        .filter(x => x.delta !== 0);

      const topGainers = [...ovrChanges].filter(x => x.delta > 0).sort((a,b) => b.delta - a.delta).slice(0,5);
      const topLosers  = [...ovrChanges].filter(x => x.delta < 0).sort((a,b) => a.delta - b.delta).slice(0,5);

      // Lesões do ano — escaneia injuryHistory de todos os jogadores
      // (mais confiável do que filtrar events, pega todas independente de ranking)
      const allPlayersThisYear = [...updatedTour];
      const yearInjuriesSet = new Map(); // playerId → melhor evento
      // Também pega eventos de lesão que passaram pela timeline (com year marcado)
      for (const e of state.events) {
        if ((e.type === 'injury' || e.type === 'injury_wd') && e.year === state.year) {
          const id = e.playerId;
          const grade = e.injury?.grade ?? 1;
          const existing = yearInjuriesSet.get(id);
          if (!existing || grade > (existing.injury?.grade ?? 1)) {
            yearInjuriesSet.set(id, e);
          }
        }
      }
      // Complementa com injuryHistory dos jogadores (captura lesões que não entraram na timeline)
      for (const p of allPlayersThisYear) {
        const hist = p.injuryHistory ?? [];
        for (const h of hist) {
          if (h.year === state.year || h.slot >= (state.calendarIndex ?? 0) - 41) {
            const id = p.id;
            if (!yearInjuriesSet.has(id)) {
              yearInjuriesSet.set(id, {
                type: 'injury',
                playerName: p.name,
                playerId: id,
                injury: { grade: h.grade, type: h.type },
                text: `${p.name} — ${h.type ?? '?'} (Grau ${h.grade})`,
                year: state.year,
              });
            }
          }
        }
      }
      const yearInjuries = Array.from(yearInjuriesSet.values());

      // ── Coletar campeões de todos os torneios do ano ──────────
      const champions = [];
      for (const res of Object.values(state.tournamentResults)) {
        const { bracket, tournament } = res ?? {};
        // Suporta formato completo (bracket) e slim (res._slim)
        const champ   = res._slim ? res.champion   : bracket?.champion;
        const finalist = res._slim ? res.finalist  : (() => {
          const finalRound = bracket?.rounds?.at(-1) ?? [];
          const finalMatch = finalRound[0];
          return finalMatch && champ
            ? (finalMatch.playerA?.id === champ.id ? finalMatch.playerB : finalMatch.playerA)
            : null;
        })();
        const setsDetail = res._slim ? [] : (bracket?.rounds?.at(-1)?.[0]?.result?.setsDetail ?? []);

        if (!tournament || !champ) continue;
        champions.push({
          tournament: {
            id: tournament.id, name: tournament.name,
            category: tournament.category, surface: tournament.surface,
            weekIndex: tournament.weekIndex ?? 0,
          },
          champion: { id: champ.id, name: champ.name, nationality: champ.nationality, styleId: champ.styleId, styleData: champ.styleData, color: champ.color },
          finalist: finalist ? { id: finalist.id, name: finalist.name, nationality: finalist.nationality } : null,
          setsDetail,
        });
      }
      // Ordena por prestígio (GS > FINALS > M1000 > 500 > 250) e depois por weekIndex
      const catOrder = { GRAND_SLAM:0, FINALS:1, MASTERS_1000:2, ATP_500:3, ATP_250:4, ATP_100:5 };
      champions.sort((a,b) => {
        const co = (catOrder[a.tournament.category]??9) - (catOrder[b.tournament.category]??9);
        return co !== 0 ? co : (a.tournament.weekIndex - b.tournament.weekIndex);
      });

      // ── Calcular premiações do ano ─────────────────────────────
      // Número 1 da temporada (maior wins no tour principal)
      const allTourSorted = [...activePlayers].sort((a,b) => (a.rankPosition??999)-(b.rankPosition??999));
      const noOne = allTourSorted[0] ?? null;
      // Mais melhorado (maior delta OVR positivo)
      const mostImproved = topGainers[0]?.player ?? null;
      // Campeão de mais Grand Slams no ano
      const gsChampCounts = {};
      for (const c of champions) {
        if (c.tournament.category === 'GRAND_SLAM') {
          gsChampCounts[c.champion.id] = (gsChampCounts[c.champion.id] ?? 0) + 1;
        }
      }
      const gsKing = Object.entries(gsChampCounts).sort((a,b)=>b[1]-a[1])[0];
      const gsKingPlayer = gsKing ? activePlayers.find(p=>p.id===gsKing[0]) : null;
      // Maior número de títulos totais no ano
      const titleCounts = {};
      for (const c of champions) {
        titleCounts[c.champion.id] = (titleCounts[c.champion.id] ?? 0) + 1;
      }
      const mostTitlesEntry = Object.entries(titleCounts).sort((a,b)=>b[1]-a[1])[0];
      const mostTitlesPlayer = mostTitlesEntry ? [...activePlayers,...promoted].find(p=>p.id===mostTitlesEntry[0]) : null;
      const mostTitlesCount = mostTitlesEntry?.[1] ?? 0;
      // Melhor newcomer (promoted player com melhor ranking final)
      const bestNewcomer = [...promoted].sort((a,b)=>(a.rankPosition??999)-(b.rankPosition??999))[0] ?? null;

      const awards = {
        noOne,
        mostImproved,
        gsKingPlayer,
        gsKingCount: gsKing?.[1] ?? 0,
        mostTitlesPlayer,
        mostTitlesCount,
        bestNewcomer,
      };

      const yearSummary = {
        year: state.year,
        topGainers,
        topLosers,
        injuries: yearInjuries,
        retired: allRetired,
        newTourEntrants,
        champions,
        awards,
        seasonMetrics,
      };

      // Jogadores com rankPosition atualizado para o novo ano
      // Usa tourAfterLife/prospectsAfterLife (já com personalidade e life events evoluídos)
      const newTourPlayers  = tourAfterLife.map(p => {
        const newRank = rankMap[p.id] ?? p.rankPosition ?? 999;
        const prevHist = Array.isArray(p._rankHistory) ? p._rankHistory : [];
        // Evita duplicar o mesmo ano se advanceSeason for chamado mais de uma vez
        const rankHistUpdated = prevHist.some(h => h.year === nextYear)
          ? prevHist
          : [...prevHist, { year: nextYear, rank: newRank }];
        return {
          ...p,
          rankPosition: newRank,
          formPoints: applySeasonReset(p.formPoints ?? 0),
          _rankHistory: rankHistUpdated,
        };
      });

      // ── Percepções do circuito: atualiza uma vez por temporada ─────────
      // Roda depois do rank final — usa o histórico completo da temporada.
      const newTourPlayersWithPerceptions = newTourPlayers.map(p => {
        try {
          return updatePerceptions(p, state.tournamentResults, state.year, newTourPlayers);
        } catch (_) { return p; }
      });
      newTourPlayers.splice(0, newTourPlayers.length, ...newTourPlayersWithPerceptions);

      seasonOpenBreakingNext = maybeTriggerBreakingNews(
        newTourPlayers,
        nextYear,
        state,
        { phase: 'SEASON_OPEN', tournament: CALENDAR[0] },
      );
      newTourPlayers.splice(
        0,
        newTourPlayers.length,
        ...(seasonOpenBreakingNext.players ?? newTourPlayers),
      );
      yearEvents.unshift(
        ...((seasonOpenBreakingNext.events ?? []).map(e => ({ ...e, year: nextYear }))),
      );

      const updatedProspects = [];

      // Regenera planos de temporada com os novos rankings e preferências
      // Cada jogador re-planeja seus torneios para o ano seguinte
      
      const newSeasonSlots = buildSeasonSlots(newTourPlayers);
      const seasonOpenPreparedTournamentPackage = buildPreparedTournamentPackage(
        CALENDAR[0],
        newTourPlayers,
        updatedProspects,
        newSeasonSlots,
        nextYear,
      );

      // ── CRÔNICAS: gera entrada narrativa do ano antes de avançar ──
      if (state.chronicleEngine) {
        state.chronicleEngine.generateYearEntry(state);
      }

      // ── COACHING: atualiza reputações dos coaches com resultados da temporada ──
      let updatedCoachPool = updateAllCoachReputations(
        poolAfterPartnership,
        allAfterPartnership,
        titleWinners,
        prevRankMap,
      );
      // Garante mínimo de 20 coaches livres no pool
      updatedCoachPool = replenishCoachPool(updatedCoachPool, nextYear, 20);

      // ── COACHING (Fase 3): sincroniza reputationSnapshot nos jogadores ───
      // Depois de updateAllCoachReputations, a reputação dos coaches mudou.
      // O growthMultiplierForAttr lê player.coach.reputationSnapshot, que foi
      // salvo no momento da contratação e nunca mais atualizado. Corrigimos aqui.
      const _syncRepSnapshot = (players) => players.map(p => {
        if (!p.coach?.coachId) return p;
        const updatedC = updatedCoachPool.find(c => c.id === p.coach.coachId);
        if (!updatedC) return p;
        if (updatedC.reputation === (p.coach.reputationSnapshot ?? p.coach.reputation)) return p;
        return { ...p, coach: { ...p.coach, reputationSnapshot: updatedC.reputation } };
      });
      // _syncRepSnapshot é aplicado no return abaixo sobre newTourPlayers e updatedProspects

      // ── Fase 5: encerrar contratos de aposentados ────────────────
      if (state.sponsorPool) {
        try {
          for (const retired of newlyRetired) {
            const { state: sAfter, news: rNews } = handleRetirementSponsors(
              { ...state, players: [...updatedTour] },
              retired
            );
            if (sAfter.sponsorPool) state = { ...state, sponsorPool: sAfter.sponsorPool };
            const retiredIdx = updatedTour.findIndex(p => p.id === retired.id);
            if (retiredIdx >= 0 && sAfter.players) {
              const updated = sAfter.players.find(p => p.id === retired.id);
              if (updated) updatedTour[retiredIdx] = updated;
            }
            if (rNews.length > 0 && state.newsEngine) state.newsEngine.append(rNews);
          }
        } catch (e) {
          console.warn('[RetirementSponsors] erro:', e?.message);
        }
      }

      // ── COACHING (Fase 4): Ex-jogadores viram técnicos ───────────
      // 1. Para cada aposentado do tour: tenta criar coach RETIRED_PLAYER
      const newCoachesFromRetired = [];
      for (const retired of newlyRetired) {
        const newCoach = tryBecomeCoach(retired, state.year);
        if (newCoach) newCoachesFromRetired.push(newCoach);
      }
      if (newCoachesFromRetired.length > 0) {
        updatedCoachPool = [...updatedCoachPool, ...newCoachesFromRetired];
      }

      // 2. Liberar coaches cujo pupilo se aposentou
      //    (updateAllCoachReputations já faz isso se pupilo não é encontrado,
      //     mas essa passagem garante consistência explícita para newlyRetired)
      const retiredIds = new Set(newlyRetired.map(p => p.id));
      updatedCoachPool = updatedCoachPool.map(c => {
        if (c.availability === 'CONTRACTED' && retiredIds.has(c.currentPupilId)) {
          return { ...c, availability: 'FREE', currentPupilId: null };
        }
        return c;
      });

      // ── RIVALIDADES: notifica aposentadorias e poda rivalidades velhas ──
      if (state.rivalrySystem) {
        for (const p of allRetired) {
          state.rivalrySystem.onRetirement(p.id);
        }
        state.rivalrySystem.pruneStale(state.year);
      }

      return {
        ...state,
        year: nextYear,
        season: state.season + 1,
        newgenImagePool: updatedImagePool,
        rankingStore: newStore,
        tourPlayers:  _syncRepSnapshot(newTourPlayers),
        prospects:    [],
        retiredPlayers: (() => {
          // Slim os novos aposentados + os antigos já no state
          // Mantém apenas quem tem potencial HOF (≥3 Grand Slams)
          // Os outros são deletados permanentemente para economizar espaço

          // 1. Construir histórico completo (old + new slim entries)
          const allSlim = {};
          for (const [key, res] of Object.entries(state.historicalTournamentResults ?? {})) {
            allSlim[key] = res._slim ? res : slimifyTournamentResult(res, res._season ?? state.year - 1);
          }
          // Adiciona current year slim
          for (const [tid, res] of Object.entries(state.tournamentResults ?? {})) {
            const slim = slimifyTournamentResult(res, state.year);
            if (slim) allSlim[`${tid}_${state.year}`] = slim;
          }

          // 2. Contar GS por jogador
          const gsCount = {};
          for (const res of Object.values(allSlim)) {
            const champId = res._slim ? res.champion?.id : res.bracket?.champion?.id;
            const cat = res.tournament?.category;
            if (champId && cat === 'GRAND_SLAM') {
              gsCount[champId] = (gsCount[champId] ?? 0) + 1;
            }
          }

          // 3. Mesclar antigos + novos; slim e cull
          const allRetiredMerged = [...(state.retiredPlayers ?? []), ...allRetired];
          return allRetiredMerged
            .filter((p, i, arr) => arr.findIndex(x => x.id === p.id) === i) // dedup
            .filter(p => (gsCount[p.id] ?? 0) >= 3)   // só potencial HOF
            .map(p => p._isSlimRetired ? p : slimifyRetiredPlayer(p));
        })(),
        tournamentResults: {},
        historicalTournamentResults: (() => {
          // Slim todos os existentes + adiciona current year slim
          const result = {};
          for (const [key, res] of Object.entries(state.historicalTournamentResults ?? {})) {
            result[key] = res._slim ? res : slimifyTournamentResult(res, res._season ?? state.year - 1);
          }
          for (const [tid, res] of Object.entries(state.tournamentResults ?? {})) {
            const slim = slimifyTournamentResult(res, state.year);
            if (slim) result[`${tid}_${state.year}`] = slim;
          }
          return result;
        })(),
        calendarIndex: 0,
        preparedTournamentPackage: seasonOpenPreparedTournamentPackage,
        events: [...state.events, ...yearEvents],
        yearSummary,
        
        playerSeasonSlots: newSeasonSlots,
        chronicleEngine: state.chronicleEngine,
        newsEngine: (() => {
          // Passa newTourPlayers/updatedProspects para que generateYearEndNews
          // acesse personality já evoluída (pós step 7.5)
          const yearEndArticles = generateYearEndNews({
            ...state,
            tourPlayers: newTourPlayers,
            prospects:   updatedProspects,
            events:      [...state.events, ...yearEvents],
          });
          if (state.newsEngine && yearEndArticles.length > 0) {
            state.newsEngine.push(yearEndArticles);
          }
          const seasonOpenBreakingArticles = generateBreakingNewsArticles(
            seasonOpenBreakingNext.events ?? [],
            newTourPlayers,
            nextYear,
          );
          if (state.newsEngine && seasonOpenBreakingArticles.length > 0) {
            state.newsEngine.append(seasonOpenBreakingArticles);
          }
          const nextSeasonPreviewArticles = generateUpcomingTournamentNews(
            CALENDAR[0],
            seasonOpenPreparedTournamentPackage,
            {
              ...state,
              year: nextYear,
              tourPlayers: newTourPlayers,
              prospects: updatedProspects,
              tournamentResults: {},
              historicalTournamentResults: state.historicalTournamentResults ?? {},
            },
            { seasonStart: true },
          );
          if (state.newsEngine && nextSeasonPreviewArticles.length > 0) {
            state.newsEngine.append(nextSeasonPreviewArticles);
          }
          // Aposentadorias de técnicos como artigos completos no Jornal
          if (state.newsEngine && coachRetirementArticles.length > 0) {
            state.newsEngine.append(coachRetirementArticles);
          }
          return state.newsEngine;
        })(),
        // ── Coaching (Fase 2): pool com reputações atualizadas ────
        coachPool: updatedCoachPool,

        // ── Sponsorship (Fases 3–5) ───────────────────────────────
        sponsorPool: _sponsorResult?.state?.sponsorPool ?? state.sponsorPool,
        pendingOffers: _sponsorResult?.acceptedOffers ?? [],
        highestPaidPlayerId: (() => {
          const pool = _sponsorResult?.state?.sponsorPool ?? state.sponsorPool;
          if (!pool) return null;
          const totals = {};
          for (const sp of Object.values(pool.states ?? {})) {
            for (const c of sp.contracts ?? []) {
              totals[c.playerId] = (totals[c.playerId] ?? 0) + c.annualFee;
            }
          }
          return Object.entries(totals).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
        })(),
        recordsStore: (() => {
          // Atualiza snapshots de identidade (age muda todo ano) sem recalcular stats
          const base = getOrMigrateRecordsStore(state);
          const allP = [...(newTourPlayers ?? []), ...(updatedProspects ?? [])];
          const updated = { _version:1, playerStats: { ...base.playerStats } };
          for (const p of allP) {
            const s = updated.playerStats[p.id];
            if (s) _rsSnap(s, p);
          }
          return updated;
        })(),
      };
    }

    case 'DISMISS_SUMMARY':
      return { ...state, yearSummary: null };

    // ── COACHING: Fase 2 ─────────────────────────────────────────
    case 'HIRE_COACH': {
      // action = { playerId, coachId, season }
      const { playerId, coachId, season: hireSeason } = action;
      const coach  = (state.coachPool ?? []).find(c => c.id === coachId);
      const player = [...state.tourPlayers, ...state.prospects].find(p => p.id === playerId);
      if (!coach || !player) return state;

      // Validações
      if (player.coach)                    return state; // já tem técnico
      if (coach.availability !== 'FREE')   return state; // não disponível

      const updatedPlayer = {
        ...player,
        coach: {
          coachId:            coach.id,
          name:               coach.name,
          fullName:           coach.fullName,
          philosophy:         coach.philosophy,
          specialty:          coach.specialty,
          specialtySurface:   coach.specialtySurface ?? null,
          startSeason:        hireSeason ?? state.year,
          reputationSnapshot: coach.reputation, // snapshot para growthMultiplier
        },
        coachHistory: player.coachHistory ?? [],
      };
      const updatedCoach = {
        ...coach,
        availability:   'CONTRACTED',
        currentPupilId: playerId,
      };

      const newCoachPool    = (state.coachPool ?? []).map(c => c.id === coachId ? updatedCoach : c);
      const newTourPlayers  = state.tourPlayers.map(p  => p.id === playerId ? updatedPlayer : p);
      const newProspects    = [];

      return { ...state, coachPool: newCoachPool, tourPlayers: newTourPlayers, prospects: newProspects };
    }

    case 'FIRE_COACH': {
      // action = { playerId, coachId, season, reason }
      const { playerId: fPlayerId, coachId: fCoachId, season: fireSeason, reason = 'VOLUNTARY' } = action;
      const fCoach  = (state.coachPool ?? []).find(c => c.id === fCoachId);
      const fPlayer = [...state.tourPlayers, ...state.prospects].find(p => p.id === fPlayerId);
      if (!fCoach || !fPlayer || !fPlayer.coach) return state;

      const startSeason = fPlayer.coach.startSeason ?? fireSeason;

      const historyEntry = {
        coachId:          fCoach.id,
        name:             fCoach.name,
        fullName:         fCoach.fullName ?? fCoach.name,
        philosophy:       fCoach.philosophy,
        specialty:        fCoach.specialty ?? [],
        specialtySurface: fCoach.specialtySurface ?? null,
        startSeason,
        endSeason:        fireSeason ?? state.year,
        seasons:          (fireSeason ?? state.year) - startSeason,
        titlesUnder:      (fPlayer._seasonHistory ?? []).filter(h => h.year >= startSeason && h.year <= (fireSeason ?? state.year) && h.titleWon).length,
        peakRankUnder:    fPlayer.rankPosition ?? 999,
        dismissalReason:  reason,
        coachOrigin:      fCoach.origin ?? 'GENERATED',
        coachRepAtFiring: fCoach.reputation,
      };

      const fUpdatedPlayer = {
        ...fPlayer,
        coach: null,
        coachHistory: [...(fPlayer.coachHistory ?? []), historyEntry],
      };

      let newRep = fCoach.reputation;
      if (reason === 'RESULTS')  newRep = Math.max(0, newRep - 8);
      if (reason === 'CONFLICT') newRep = Math.max(0, newRep - 5);

      const fUpdatedCoach = {
        ...fCoach,
        reputation:     newRep,
        availability:   'FREE',
        currentPupilId: null,
        formerPupils:   [...(fCoach.formerPupils ?? []), {
          playerId: fPlayerId, playerName: fPlayer.name,
          startSeason, endSeason: fireSeason ?? state.year,
          titlesUnder: historyEntry.titlesUnder, peakRankUnder: historyEntry.peakRankUnder,
          dismissalReason: reason,
        }],
      };

      const fNewCoachPool   = (state.coachPool ?? []).map(c => c.id === fCoachId ? fUpdatedCoach : c);
      const fNewTourPlayers = state.tourPlayers.map(p => p.id === fPlayerId ? fUpdatedPlayer : p);
      const fNewProspects   = state.prospects.map(p   => p.id === fPlayerId ? fUpdatedPlayer : p);

      return { ...state, coachPool: fNewCoachPool, tourPlayers: fNewTourPlayers, prospects: fNewProspects };
    }

    default:
      return state;
  }
}

// ═══════════════════════════════════════════════════════════════════
// SIMULAÇÃO DO BRACKET
// ═══════════════════════════════════════════════════════════════════

/**
 * Aplica bônus de torneio favorito (TournamentPreferences) sobre os attrs de um jogador.
 * Retorna um novo objeto de attrs com mental e physical escalados se o jogador tem preferência.
 */
function applyTournamentBonus(player, tournamentId) {
  const bonus = getTournamentBonus(player, tournamentId);
  if (!bonus || (bonus.mental === 0 && bonus.physical === 0)) return player;
  const attrs = { ...player.attrs };
  // mental: afeta mental, composure, pressure
  if (bonus.mental > 0) {
    if (attrs.mental    != null) attrs.mental    = Math.min(99, attrs.mental    + bonus.mental    * 10);
    if (attrs.composure != null) attrs.composure = Math.min(99, attrs.composure + bonus.mental    * 8);
    if (attrs.pressure  != null) attrs.pressure  = Math.min(99, attrs.pressure  + bonus.mental    * 6);
  }
  // physical: afeta speed, stamina, agility
  if (bonus.physical > 0) {
    if (attrs.speed   != null) attrs.speed   = Math.min(99, attrs.speed   + bonus.physical * 8);
    if (attrs.stamina != null) attrs.stamina = Math.min(99, attrs.stamina + bonus.physical * 6);
    if (attrs.agility != null) attrs.agility = Math.min(99, attrs.agility + bonus.physical * 5);
  }
  return { ...player, attrs };
}

function clonePreparedTournamentPackage(pkg) {
  if (!pkg) return null;
  return {
    ...pkg,
    injuryWithdrawals: new Set(pkg.injuryWithdrawals ? [...pkg.injuryWithdrawals] : []),
    injuryEvents: [...(pkg.injuryEvents ?? [])],
    updatedByInjury: { ...(pkg.updatedByInjury ?? {}) },
    preQualWinners: [...(pkg.preQualWinners ?? [])],
    qualifiers: [...(pkg.qualifiers ?? [])],
    directEntrants: [...(pkg.directEntrants ?? [])],
    mainDrawPlayers: [...(pkg.mainDrawPlayers ?? [])],
    qualRoundsData: [...(pkg.qualRoundsData ?? [])],
    playerSeasonSlotsAfterSelection: Object.fromEntries(
      Object.entries(pkg.playerSeasonSlotsAfterSelection ?? {}).map(([key, value]) => [key, value ? { ...value } : value])
    ),
    preQualBracket: pkg.preQualBracket ? {
      ...pkg.preQualBracket,
      rounds: (pkg.preQualBracket.rounds ?? []).map(round => round.map(match => ({ ...match }))),
      qualifiers: [...(pkg.preQualBracket.qualifiers ?? [])],
    } : null,
    qualifyingBracket: pkg.qualifyingBracket ? {
      ...pkg.qualifyingBracket,
      rounds: (pkg.qualifyingBracket.rounds ?? []).map(round => round.map(match => ({ ...match }))),
      qualifiers: [...(pkg.qualifyingBracket.qualifiers ?? [])],
    } : null,
    bracket: pkg.bracket ? {
      ...pkg.bracket,
      rounds: (pkg.bracket.rounds ?? []).map(round => round.map(match => ({ ...match }))),
    } : null,
  };
}

function createFastPrepareMatchResolver(surface, bestOf) {
  return (playerA, playerB) => {
    const simA = playerA.formPoints ? { ...playerA, attrs: applyFormModifier(playerA.attrs, playerA.formPoints) } : playerA;
    const simB = playerB.formPoints ? { ...playerB, attrs: applyFormModifier(playerB.attrs, playerB.formPoints) } : playerB;
    const result = simulateMatchFast(simA, simB, surface, bestOf);
    const winner = result.winner?.id === playerA.id ? playerA : playerB;
    return { winner, result };
  };
}

function buildPreparedTournamentPackage(tournament, tourPlayers, prospects, playerSeasonSlots = {}, seasonYear = null) {
  const surface = courtKeyToSurface(tournament.courtKey ?? tournament.surface);
  const bestOf = tournament.bestOf ?? 3;
  return prepareTournamentPackageSync({
    tournament,
    tourPlayers,
    prospects,
    playerSeasonSlots,
    seasonYear,
    matchResolver: createFastPrepareMatchResolver(surface, bestOf),
    applySeasonSlotTracking: false,
  });
}

/**
 * Roda qualifying + chave principal, retornando bracket completo.
 *
 * @param {object}   tournament
 * @param {object[]} tourPlayers
 * @param {object[]} prospects
 * @param {function} onProgress

 * @param {object}   playerSeasonSlots  { playerId → SeasonSlots } — contadores de slots
 */
async function runTournament(tournament, tourPlayers, prospects, onProgress, playerSeasonSlots = {}, partialStateRef = null, seasonYear = null, rivalrySystem = null, preparedPackage = null) {
  const SURFACE_COURT = { CLAY: 'ROLAND_GARROS', GRASS: 'WIMBLEDON', HARD: 'US_OPEN', INDOOR: 'O2_ARENA' };
  const courtKey  = SURFACE_COURT[tournament.surface] ?? 'US_OPEN';
  const bestOf    = tournament.bestOf ?? 3;
  const prepared = preparedPackage ? clonePreparedTournamentPackage(preparedPackage) : null;
  const preQualWinners = prepared?.preQualWinners ?? [];
  const qualifiers = prepared?.qualifiers ?? [];
  const allMainDraw = prepared?.mainDrawPlayers ?? [];
  const injuryWithdrawals = prepared?.injuryWithdrawals ?? new Set();
  const injuryEvents = prepared?.injuryEvents ?? [];
  const updatedByInjury = prepared?.updatedByInjury ?? {};
  let qualRoundsData = [...(prepared?.qualRoundsData ?? [])];

  if (!prepared) {
    const { qualifyOut = 0, preQualIn = 0 } = tournament;
    const pqOut = tournament.preQualOut ?? Math.ceil(preQualIn / 2);
    const sorted = [...tourPlayers].sort((a, b) => (a.rankPosition ?? 999) - (b.rankPosition ?? 999));
    const sortedProsp = [...prospects].sort((a, b) => (a.rankPosition ?? 999) - (b.rankPosition ?? 999));
    const { mainDraw: rawMain, qualifying: rawQual, preQualifying: rawPreQual } = selectTournamentPlayers(
      tournament, sorted, sortedProsp, new Set(), playerSeasonSlots,
    );

    if (['ATP_500','ATP_250','MASTERS_1000'].includes(tournament.category)) {
      for (const player of [...rawMain, ...rawQual]) {
        if (!playerSeasonSlots[player.id]) playerSeasonSlots[player.id] = createSeasonSlots();
        updateSeasonSlots(playerSeasonSlots[player.id], player, tournament);
      }
    }

    const injuries = applyPreTournamentInjuries([...rawMain, ...rawQual, ...rawPreQual], tournament, seasonYear);
    qualRoundsData = [];
    const getPlayer = (player) => {
      if (injuries.injuryWithdrawals.has(player.id)) return null;
      return applyInjuryToPlayer(injuries.updatedByInjury[player.id] ?? player);
    };

    let builtPreQualWinners = [];
    if (rawPreQual.length > 0 && pqOut > 0) {
      const pool = rawPreQual.map(getPlayer).filter(Boolean);
      if (pool.length > 0) {
        builtPreQualWinners = await runQualifyingAsync(pool, pqOut, courtKey, bestOf, onProgress);
      }
    }

    let builtQualifiers = [];
    if ((rawQual.length > 0 || builtPreQualWinners.length > 0) && qualifyOut > 0) {
      const pool = [...rawQual.map(getPlayer).filter(Boolean), ...builtPreQualWinners];
      if (pool.length > 0) {
        builtQualifiers = await runQualifyingAsync(pool, qualifyOut, courtKey, bestOf, onProgress);
      }
    }

    preQualWinners.splice(0, preQualWinners.length, ...builtPreQualWinners);
    qualifiers.splice(0, qualifiers.length, ...builtQualifiers);
    allMainDraw.splice(0, allMainDraw.length, ...[...rawMain.map(getPlayer).filter(Boolean), ...builtQualifiers].slice(0, tournament.draw));
    injuryWithdrawals.clear?.();
    for (const id of injuries.injuryWithdrawals) injuryWithdrawals.add(id);
    injuryEvents.splice(0, injuryEvents.length, ...(injuries.injuryEvents ?? []));
    Object.assign(updatedByInjury, injuries.updatedByInjury ?? {});
  }

  if (partialStateRef) {
    partialStateRef._qualifiers    = qualifiers;
    partialStateRef._preQualWinners = preQualWinners;
  }

  // 5. Bracket principal
  const bracket = await runBracketAsync(
    allMainDraw,
    courtKey,
    bestOf,
    onProgress,
    partialStateRef?._snapshotRef ?? null,
    tournament,
    rivalrySystem,
    prepared?.bracket ?? null,
  );

  return { bracket, qualifiers, preQualWinners, wildcards: [], injuryWithdrawals, injuryEvents, updatedByInjury, qualRoundsData };
}
/**
 * Simula qualifying: pool de N jogadores → M classificados.
 * Usa eliminatória simples randomizada.
 */
/**
 * Roda qualifying com eliminatória real em bracket.
 * Todos os jogadores jogam a cada rodada (pares). Odd player recebe bye.
 * Continua até restar <= spotsToFill jogadores.
 *
 * Exemplo: 64 → 32 (1 rodada), 32 → 16 (1 rodada), etc.
 * Para preQual: 64 jogadores → 1 rodada → 32 passam.
 * Para qualify: 64 (32 diretos + 32 do preQual) → 1 rodada → 32 qualificados.
 */
async function runQualifyingAsync(players, spotsToFill, courtKey, bestOf, onProgress) {
  if (!players?.length || spotsToFill <= 0) return [];

  const surface = courtKeyToSurface(courtKey);

  const fastSim = (a, b) => {
    const sA = a.formPoints ? { ...a, attrs: applyFormModifier(a.attrs, a.formPoints) } : a;
    const sB = b.formPoints ? { ...b, attrs: applyFormModifier(b.attrs, b.formPoints) } : b;
    const res = simulateMatchFast(sA, sB, surface, bestOf);
    return res.winner.id === a.id ? a : b;
  };

  // Embaralha para randomizar os confrontos
  let current = [...players];
  for (let i = current.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [current[i], current[j]] = [current[j], current[i]];
  }

  // Roda rodadas de eliminação até ter <= spotsToFill vencedores
  while (current.length > spotsToFill) {
    await new Promise(r => setTimeout(r, 0)); // yield para não travar UI
    const next = [];
    for (let i = 0; i < current.length; i += 2) {
      if (i + 1 >= current.length) {
        next.push(current[i]); // número ímpar: último recebe bye
      } else {
        next.push(fastSim(current[i], current[i + 1]));
      }
    }
    current = next;
  }

  return current.slice(0, spotsToFill);
}

/**
 * Roda o bracket principal (eliminatória simples).
 * Suporta chaves de qualquer tamanho, aplica BYE para completar potência de 2.
 */
async function runBracketAsync(players, courtKey, bestOf, onProgress, snapshotRef = null, tournament = null, rivalrySystem = null, preparedBracketTemplate = null) {
  // Próxima potência de 2
  let totalSlots = preparedBracketTemplate?.totalSlots ?? 1;
  while (totalSlots < players.length) totalSlots *= 2;
  const byeCount = preparedBracketTemplate?.byeCount ?? (totalSlots - players.length);

  // Ordena por ranking e monta R1 com distribuição ATP real de seeds
  const seeded = [...players].sort((a, b) => (a.rankPosition ?? 999) - (b.rankPosition ?? 999));
  const r1Template = preparedBracketTemplate?.rounds?.[0]
    ? preparedBracketTemplate.rounds[0].map(match => ({ ...match, result: null }))
    : buildATPFirstRound(seeded, totalSlots);
  const totalMatches = r1Template.length;

  const rounds = [];

  // Função auxiliar: salva snapshot parcial compatível com TournamentBracket savedState
  const saveSnapshot = (currentRoundIndex) => {
    if (!snapshotRef) return;
    snapshotRef.current = {
      rounds: rounds.map(r => [...r]),
      currentRound: currentRoundIndex,
      isComplete: false,
      champion: null,
      totalSlots,
      byeCount,
      drawSize: players.length,
    };
  };

  // R1 inicial: BYEs já resolvidos pelo buildATPFirstRound
  const r1Pending = r1Template.map(m => ({ ...m }));
  rounds.push(r1Pending);
  saveSnapshot(0);

  // Simula matches reais da R1
  for (let i = 0; i < totalMatches; i++) {
    if (r1Pending[i].isBye) continue; // BYE já resolvido
    const a = r1Pending[i].playerA;
    const b = r1Pending[i].playerB;
    let winner = null;
    let matchResult = null;
    if (a && b) {
      const simA = applyTournamentBonus(a.formPoints ? { ...a, attrs: applyFormModifier(a.attrs, a.formPoints) } : a, tournament.id);
      const simB = applyTournamentBonus(b.formPoints ? { ...b, attrs: applyFormModifier(b.attrs, b.formPoints) } : b, tournament.id);
      const res = simulateMatchMid({ playerData: simA }, { playerData: simB }, courtKey, bestOf, rivalrySystem, tournament?.isSlam ?? false, { category: tournament?.category, round: 'R64' });
      const aWon = res.sets[0] > res.sets[1];
      winner = aWon ? a : b;
      matchResult = slimMatchResult(res);
      // ── Narração leve para enriquecer artigos do NewsEngine ──
      try {
        const surfKey = (tournament?.surface ?? 'HARD').toUpperCase();
        matchResult.narration = narrateMatchLight(aWon ? a : b, aWon ? b : a, res, surfKey);
      } catch { /* silencioso */ }
      if (onProgress) await onProgress({
        phase: 'main',
        roundIndex: 0,
        roundLabel: null,
        roundLabelFull: null,
        playerA: a, playerB: b,
        result: res,
        winner: aWon ? a : b,
        loser: aWon ? b : a,
      });
      // Yield para o React renderizar o overlay antes da próxima partida
      await new Promise(r => setTimeout(r, 0));
    }
    r1Pending[i] = { playerA: a, playerB: b, winner, isBye: false, result: matchResult };
    saveSnapshot(0);
  }


  // Rodadas seguintes
  let current = r1Pending.map(m => m.winner).filter(Boolean);
  let currentRoundIndex = 1;

  while (current.length > 1) {
    // Inicializa round com matches pendentes para snapshot imediato
    const roundMatches = [];
    for (let i = 0; i < current.length; i += 2) {
      const a = current[i];
      const b = current[i + 1] ?? null;
      roundMatches.push({ playerA: a, playerB: b, winner: !b ? a : null, isBye: !b, result: null });
    }
    rounds.push(roundMatches);
    saveSnapshot(currentRoundIndex);

    const next = [];
    for (let i = 0; i < roundMatches.length; i++) {
      const { playerA: a, playerB: b } = roundMatches[i];
      let winner = roundMatches[i].winner;
      let matchResult = null;

      if (b) {
        const simA = applyTournamentBonus(a.formPoints ? { ...a, attrs: applyFormModifier(a.attrs, a.formPoints) } : a, tournament.id);
        const simB = applyTournamentBonus(b.formPoints ? { ...b, attrs: applyFormModifier(b.attrs, b.formPoints) } : b, tournament.id);
        const sz = current.length;
        const rl = sz === 2 ? 'F' : sz === 4 ? 'SF' : sz === 8 ? 'QF' : sz === 16 ? 'R16' : sz === 32 ? 'R32' : sz === 64 ? 'R64' : `R${sz}`;
        const rlFull = { F:'Final', SF:'Semifinal', QF:'Quartas de Final', R16:'Oitavas', R32:'3ª Rodada', R64:'2ª Rodada' }[rl] ?? rl;
        const res = simulateMatchMid({ playerData: simA }, { playerData: simB }, courtKey, bestOf, rivalrySystem, tournament?.isSlam ?? false, { category: tournament?.category, round: rl });
        const aWon = res.sets[0] > res.sets[1];
        winner = aWon ? a : b;
        matchResult = slimMatchResult(res);
        // ── Narração leve (SF e F recebem narração completa via NewsEngine;
        //    aqui garantimos headline básica para todas as rodadas) ──
        try {
          const surfKey = (tournament?.surface ?? 'HARD').toUpperCase();
          matchResult.narration = narrateMatchLight(aWon ? a : b, aWon ? b : a, res, surfKey);
        } catch { /* silencioso */ }
        if (onProgress) await onProgress({
          phase: 'main',
          roundIndex: currentRoundIndex,
          roundLabel: rl,
          roundLabelFull: rlFull,
          playerA: a, playerB: b,
          result: res,
          winner: aWon ? a : b,
          loser: aWon ? b : a,
        });
        // Yield para o React renderizar o overlay antes da próxima partida
        await new Promise(r => setTimeout(r, 0));
      }

      roundMatches[i] = { playerA: a, playerB: b, winner, isBye: !b, result: matchResult };
      saveSnapshot(currentRoundIndex);
      next.push(winner);
    }

    current = next;
    currentRoundIndex++;
  }

  const champion = current[0] ?? null;

  return {
    rounds,
    champion,
    totalSlots,
    byeCount,
    drawSize: players.length,
  };
}

/**
 * Distribui jogadores nas posições do bracket com seeding ATP-like.
 */
function buildBracketSlots(seeded, byeIds, totalSlots) {
  const slots = new Array(totalSlots).fill(null);

  // Seed positions: 0, last, quarter, 3/4, etc.
  const positions = [];
  positions.push(0);
  if (totalSlots >= 2) positions.push(totalSlots - 1);
  if (totalSlots >= 4) { positions.push(Math.floor(totalSlots / 2)); positions.push(Math.floor(totalSlots / 2) - 1); }
  if (totalSlots >= 8) {
    positions.push(Math.floor(totalSlots / 4));
    positions.push(totalSlots - Math.floor(totalSlots / 4) - 1);
    positions.push(Math.floor(totalSlots * 3 / 4));
    positions.push(Math.floor(totalSlots / 4) - 1); // era totalSlots*3/4-1 = DUPLICATA!
  }
  // Fill remaining positions
  const used = new Set(positions);
  for (let i = 1; positions.length < totalSlots; i++) {
    if (!used.has(i)) { positions.push(i); used.add(i); }
  }

  for (let i = 0; i < seeded.length; i++) {
    slots[positions[i]] = seeded[i];
  }

  return slots;
}

// ═══════════════════════════════════════════════════════════════════
// COMPONENTES AUXILIARES
// ═══════════════════════════════════════════════════════════════════

function OvrBadge({ player, surface }) {
  const ovr = overallRating(player.attrs);
  return <span style={{ fontFamily: U.mono, fontSize: 14, fontWeight: 700, color: ovrTier(ovr).color }}>{ovrTier(ovr).grade}</span>;
}

function RankBadge({ rank }) {
  const color = rank <= 8 ? U.gold : rank <= 32 ? U.white : U.textDim;
  return (
    <span style={{ fontFamily: U.mono, fontSize: 10, color, minWidth: 28, textAlign: 'right' }}>
      #{rank}
    </span>
  );
}

function SurfaceTag({ surface }) {
  const sc = SURFACE_COLOR[surface] ?? SURFACE_COLOR.HARD;
  return (
    <span style={{ background: `${sc.main}22`, border: `1px solid ${sc.main}55`, color: sc.light, fontFamily: U.display, fontSize: 8, fontWeight: 600, letterSpacing: 2, padding: '2px 6px', textTransform: 'uppercase' }}>
      {sc.icon} {sc.label}
    </span>
  );
}

function CatBadge({ category }) {
  const cc = CAT_COLOR[category] ?? { main: '#888', label: category, icon: '🎾' };
  return (
    <span style={{ background: `${cc.main}22`, border: `1px solid ${cc.main}55`, color: cc.main, fontFamily: U.display, fontSize: 8, fontWeight: 600, letterSpacing: 2, padding: '2px 6px', textTransform: 'uppercase' }}>
      {cc.icon} {cc.label}
    </span>
  );
}

function PlayerChip({ player, rank, isWinner, highlight }) {
  if (!player) return (
    <div style={{ padding: '5px 10px', color: U.textFaint, fontFamily: U.mono, fontSize: 10 }}>BYE</div>
  );
  const ovr = overallRating(player.attrs);
  const natFlag = player.nationality ? ` · ${player.nationality}` : '';
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8, padding: '5px 10px',
      background: highlight ? 'rgba(255,215,0,.07)' : 'transparent',
    }}>
      <PlayerFace player={player} size={28} gold={isWinner} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: U.display, fontSize: 12, fontWeight: 600, color: isWinner ? U.gold : U.white, letterSpacing: 1, textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {player.name}{natFlag}
        </div>
        <div style={{ fontFamily: U.mono, fontSize: 9, color: U.textFaint }}>{ovrTier(ovr).grade}</div>
      </div>
      {rank && <RankBadge rank={rank} />}
      {isWinner && <span style={{ fontSize: 10 }}>🏆</span>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// TELAS
// ═══════════════════════════════════════════════════════════════════

// ── Home Screen ─────────────────────────────────────────────────────
function UniverseHomeScreen({ onInit, onBack }) {
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const countByCategory = CALENDAR.reduce((acc, t) => {
    acc[t.category] = (acc[t.category] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="uv-screen">
      <div className="uv-topbar">
        <button className="uv-back-btn" onClick={onBack}>← Voltar</button>
        <div style={{ width: 1, height: 20, background: U.border }} />
        <span style={{ fontFamily: U.display, fontSize: 15, fontWeight: 600, letterSpacing: 3, color: U.white }}>MODO UNIVERSO</span>
      </div>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32, overflow: 'auto' }}>
        <div className="uv-a1" style={{ textAlign: 'center', maxWidth: 700, width: '100%' }}>
          <div style={{ fontFamily: U.mono, fontSize: 9, letterSpacing: 8, color: U.clay, marginBottom: 12 }}>MODO UNIVERSO · TEMPORADA COMPLETA</div>
          <div style={{ fontFamily: U.display, fontWeight: 700, fontSize: 64, lineHeight: 0.9, color: U.white, textTransform: 'uppercase', letterSpacing: -2, marginBottom: 32 }}>
            Universo<br /><span style={{ color: U.clay }}>Tennis</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, marginBottom: 32 }}>
            {Object.entries(countByCategory).map(([cat, count]) => {
              const cc = CAT_COLOR[cat] ?? { main: '#888', label: cat, icon: '🎾' };
              return (
                <div key={cat} style={{ background: U.bgPanel, border: `1px solid ${cc.main}33`, padding: '12px 8px', textAlign: 'center' }}>
                  <div style={{ fontSize: 18, marginBottom: 4 }}>{cc.icon}</div>
                  <div style={{ fontFamily: U.display, fontSize: 20, fontWeight: 700, color: cc.main }}>{count}</div>
                  <div style={{ fontFamily: U.mono, fontSize: 8, color: U.textFaint, letterSpacing: 1, marginTop: 2 }}>{cc.label}</div>
                </div>
              );
            })}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 32 }}>
            {[{ n: 128, label: 'Jogadores no Tour', icon: '🎾' }, { n: 32, label: 'Prospects', icon: '🌱' }, { n: 43, label: 'Torneios/Ano', icon: '📅' }].map(item => (
              <div key={item.label} style={{ background: U.bgPanel, border: `1px solid ${U.border}`, padding: 16, textAlign: 'center' }}>
                <div style={{ fontSize: 16, marginBottom: 4 }}>{item.icon}</div>
                <div style={{ fontFamily: U.display, fontSize: 28, fontWeight: 700, color: U.white }}>{item.n}</div>
                <div style={{ fontFamily: U.mono, fontSize: 9, color: U.textFaint }}>{item.label}</div>
              </div>
            ))}
          </div>

          <button className="uv-btn uv-btn-primary" onClick={onInit} style={{ fontSize: 14, padding: '14px 48px' }}>
            Iniciar Universo →
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Dashboard / Calendário ──────────────────────────────────────────
function SeasonDashboard({ state, dispatch, onBack }) {
  const [tab, setTab] = useState('calendar'); // 'calendar' | 'ranking' | 'prospects'
  const [ceremonyData, setCeremonyData] = useState(null); // { tournament, bracket }
  const [simulating, setSimulating] = useState(false);
  const [simProgress, setSimProgress] = useState(0);

  const nextTournament = CALENDAR[state.calendarIndex];
  const allDone = state.calendarIndex >= CALENDAR.length;

  if (state.view?.type === 'bracket') {
    const res = state.tournamentResults[state.view.id];
    return (
      <BracketView
        result={res}
        players={state.tourPlayers}
        prospects={state.prospects}
        onBack={() => dispatch({ type: 'SET_VIEW', view: null })}
      />
    );
  }

  if (state.view?.type === 'ranking') {
    return (
      <RankingView
        players={state.tourPlayers}
        rankingStore={state.rankingStore}
        onBack={() => dispatch({ type: 'SET_VIEW', view: null })}
      />
    );
  }

  const handleRunNext = async () => {
    if (simulating || allDone) return;
    const tournament = CALENDAR[state.calendarIndex];

    // Olimpíadas: só ocorrem em anos olímpicos (year % 4 === 0)
    // Em outros anos, o slot é pulado silenciosamente
    if (tournament.isOlympic) {
      if (state.year % 4 !== 0) {
        dispatch({ type: 'SKIP_TOURNAMENT' });
        return;
      }
      // Ano olímpico: simula com runTournamentFast usando selectOlympicPlayers
      setSimulating(true);
      const loopSlots = Object.fromEntries(
        Object.entries(state.playerSeasonSlots ?? {}).map(([k, v]) => [k, { ...v }])
      );
      try {
        const { bracket, qualifiers, preQualWinners, wildcards, injuryWithdrawals, injuryEvents, updatedByInjury } = runTournamentFast(
          tournament, state.tourPlayers, state.prospects, loopSlots,
        );
        dispatch({
          type: 'APPLY_TOURNAMENT_RESULT',
          tournamentId: tournament.id,
          result: { bracket, qualifiers, preQualWinners, wildcards,
            injuryWithdrawals: injuryWithdrawals ?? new Set(),
            injuryEvents: injuryEvents ?? [], updatedByInjury: updatedByInjury ?? {} },
          tournament,
        });
      } finally {
        setSimulating(false);
      }
      return;
    }

    // ATP100 é sempre simulado silenciosamente — nunca pede interação
    if (tournament.isATP100 || tournament.category === 'ATP_100') {
      setSimulating(true);
      const loopSlots = Object.fromEntries(
        Object.entries(state.playerSeasonSlots ?? {}).map(([k, v]) => [k, { ...v }])
      );
      try {
        const { bracket, qualifiers, preQualWinners, wildcards, injuryWithdrawals, injuryEvents, updatedByInjury } = runTournamentFast(
          tournament, state.tourPlayers, state.prospects, loopSlots,
        );
        dispatch({
          type: 'APPLY_TOURNAMENT_RESULT',
          tournamentId: tournament.id,
          result: { bracket, qualifiers, preQualWinners, wildcards,
            injuryWithdrawals: injuryWithdrawals ?? new Set(),
            injuryEvents: injuryEvents ?? [], updatedByInjury: updatedByInjury ?? {} },
          tournament,
        });
      } finally {
        setSimulating(false);
      }
      return;
    }

    setSimulating(true);
    setSimProgress(0);

    try {
      let matchCount = 0;
      const onProgress = () => { matchCount++; setSimProgress(matchCount); };

      const result = await runTournament(
        tournament,
        state.tourPlayers,
        state.prospects,
        onProgress,
        state.playerSeasonSlots ?? {},
        null,
        state.year,
        state.rivalrySystem ?? null,
      );

      dispatch({
        type: 'APPLY_TOURNAMENT_RESULT',
        tournamentId: tournament.id,
        result,
        tournament,
      });

      // Mostra cerimônia se houver campeão (não para Prospects nem Challengers)
      const champ = getResChampion(result);
      const skipCeremony = tournament.category === 'ATP_100';
      if (champ && !skipCeremony) {
        let wrapData = null;
        try {
          const wrapArt = genTournamentWrap({
            tournament, bracket: result.bracket, year: state.year,
            updatedByInjury: result.updatedByInjury ?? {},
            injuryWithdrawals: result.injuryWithdrawals ?? new Set(),
            allPlayers: [...state.tourPlayers, ...(state.prospects ?? [])],
          });
          wrapData = wrapArt?.wrapData ?? null;
        } catch {}
        setCeremonyData({ tournament, bracket: result.bracket, wrapData });
      }
    } finally {
      setSimulating(false);
    }
  };

  // Agrupa torneios por mês
  const byMonth = {};
  for (const t of CALENDAR) {
    if (!byMonth[t.month]) byMonth[t.month] = [];
    byMonth[t.month].push(t);
  }

  return (
    <div className="uv-screen">
      <div className="uv-topbar">
        <button className="uv-back-btn" onClick={onBack}>← Voltar</button>
        <div style={{ width: 1, height: 20, background: U.border }} />
        <span style={{ fontFamily: U.display, fontSize: 14, fontWeight: 600, letterSpacing: 3, color: U.white }}>UNIVERSO · {state.year}</span>
        <div style={{ flex: 1 }} />
        <span style={{ fontFamily: U.mono, fontSize: 10, color: U.textFaint }}>{state.calendarIndex}/{CALENDAR.length} torneios</span>
      </div>

      {/* Tabs */}
      <div style={{ background: U.bgMid, borderBottom: `1px solid ${U.border}`, display: 'flex', padding: '0 24px', flexShrink: 0 }}>
        {['calendar', 'ranking', 'prospects'].map(t => (
          <button key={t} className={`uv-tab${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}>
            {t === 'calendar' ? '📅 Calendário' : t === 'ranking' ? '📊 Ranking' : '🌱 Prospects'}
          </button>
        ))}
      </div>

      {/* Next tournament bar */}
      {!allDone && (
        <div style={{ background: U.bgPanel, borderBottom: `1px solid ${U.border}`, padding: '10px 24px', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
          {nextTournament && (
            <>
              <span style={{ fontSize: 18 }}>{nextTournament.icon}</span>
              <div>
                <div style={{ fontFamily: U.display, fontSize: 13, fontWeight: 600, letterSpacing: 1, color: U.white }}>{nextTournament.name}</div>
                <div style={{ display: 'flex', gap: 8, marginTop: 3 }}>
                  <CatBadge category={nextTournament.category} />
                  <SurfaceTag surface={nextTournament.surface} />
                  <span style={{ fontFamily: U.mono, fontSize: 9, color: U.textFaint }}>DRAW {nextTournament.draw} · {nextTournament.bestOf === 5 ? 'BO5' : 'BO3'}</span>
                </div>
              </div>
              <div style={{ flex: 1 }} />
              {simulating ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div className="uv-live" style={{ fontFamily: U.mono, fontSize: 10, color: U.clay }}>● SIMULANDO</div>
                  <span style={{ fontFamily: U.mono, fontSize: 10, color: U.textFaint }}>{simProgress} jogos</span>
                </div>
              ) : (
                <button className="uv-btn uv-btn-primary" onClick={handleRunNext}>
                  Simular {nextTournament.name} →
                </button>
              )}
            </>
          )}
        </div>
      )}

      {allDone && (
        <div style={{ background: '#1a2700', borderBottom: `1px solid #4CAF5033`, padding: '10px 24px', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
          <span>🏆</span>
          <span style={{ fontFamily: U.display, fontSize: 13, letterSpacing: 1, color: '#4CAF50' }}>TEMPORADA {state.year} CONCLUÍDA</span>
          <div style={{ flex: 1 }} />
          <button className="uv-btn uv-btn-primary" style={{ background: '#2E7D32' }} onClick={() => dispatch({ type: 'ADVANCE_YEAR' })}>
            Avançar para {state.year + 1} →
          </button>
        </div>
      )}

      {/* Content */}
      <div className="uv-scroll" style={{ flex: 1, padding: 24 }}>
        {tab === 'calendar' && (
          <div>
            {Object.entries(byMonth).map(([month, tournaments]) => (
              <div key={month} style={{ marginBottom: 28 }}>
                <div style={{ fontFamily: U.display, fontSize: 11, fontWeight: 600, letterSpacing: 4, color: U.textFaint, marginBottom: 10, textTransform: 'uppercase' }}>
                  {month}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {tournaments.map(t => {
                    const done = !!state.tournamentResults[t.id];
                    const isNext = CALENDAR[state.calendarIndex]?.id === t.id;
                    const cc = CAT_COLOR[t.category] ?? { main: '#888' };
                    const sc = SURFACE_COLOR[t.surface] ?? SURFACE_COLOR.HARD;
                    const result = state.tournamentResults[t.id];
                    const champ = getResChampion(result);

                    return (
                      <div
                        key={t.id}
                        onClick={() => done && dispatch({ type: 'SET_VIEW', view: { type: 'bracket', id: t.id } })}
                        style={{
                          background: isNext ? `${cc.main}11` : done ? U.bgPanel : U.bgMid,
                          border: `1px solid ${isNext ? cc.main + '55' : done ? U.border : U.border}`,
                          padding: '10px 16px',
                          display: 'flex', alignItems: 'center', gap: 12,
                          cursor: done ? 'pointer' : 'default',
                          opacity: !done && !isNext && !simulating ? 0.6 : 1,
                          transition: 'all .15s',
                        }}
                        className={done ? 'uv-card' : ''}
                      >
                        <span style={{ fontSize: 16, flexShrink: 0 }}>{t.icon}</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontFamily: U.display, fontSize: 13, fontWeight: 600, letterSpacing: 1, color: done ? U.white : isNext ? U.white : U.textDim, textTransform: 'uppercase' }}>
                            {t.name}
                          </div>
                          <div style={{ display: 'flex', gap: 6, marginTop: 3, alignItems: 'center' }}>
                            <CatBadge category={t.category} />
                            <SurfaceTag surface={t.surface} />
                            <span style={{ fontFamily: U.mono, fontSize: 8, color: U.textFaint }}>
                              {t.draw} jogadores {t.bestOf === 5 ? '· BO5' : ''}{t.isOlympic ? (state.year % 4 === 0 ? ' · ANO OLÍMPICO 🥇' : ' · somente anos olímpicos') : ''}
                            </span>
                          </div>
                        </div>

                        {done && champ && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <PlayerFace player={champ} size={22} gold />
                            <div>
                              <div style={{ fontFamily: U.display, fontSize: 10, fontWeight: 600, color: U.gold, letterSpacing: 1, textTransform: 'uppercase' }}>{champ.name}</div>
                              <div style={{ fontFamily: U.mono, fontSize: 8, color: U.textFaint }}>{champ.nationality}</div>
                            </div>
                            <span style={{ fontSize: 12 }}>🏆</span>
                          </div>
                        )}

                        {isNext && !simulating && (
                          <span style={{ fontFamily: U.mono, fontSize: 9, color: cc.main, letterSpacing: 2 }}>PRÓXIMO</span>
                        )}
                        {isNext && simulating && (
                          <span className="uv-live" style={{ fontFamily: U.mono, fontSize: 9, color: U.clay }}>● AO VIVO</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'ranking' && (
          <RankingTab players={state.tourPlayers} rankingStore={state.rankingStore} dispatch={dispatch} />
        )}

        {tab === 'prospects' && (
          <ProspectsTab prospects={state.prospects} rankingStore={state.rankingStore} />
        )}
      </div>
    </div>
  );
}

// ── Ranking Tab ─────────────────────────────────────────────────────
function RankingTab({ players, rankingStore, dispatch }) {
  const ranked = rankingStore.ranked.length > 0 ? rankingStore.ranked : players.map((p, i) => ({ playerId: p.id, position: i + 1, points: 0 }));
  const playerMap = Object.fromEntries(players.map(p => [p.id, p]));

  return (
    <div>
      <div style={{ fontFamily: U.mono, fontSize: 9, letterSpacing: 4, color: U.textFaint, marginBottom: 16 }}>RANKING DO TOUR PRINCIPAL</div>
      {ranked.slice(0, 100).map(entry => {
        const p = playerMap[entry.playerId];
        if (!p) return null;
        const ovr = overallRating(p.attrs);
        const pos = entry.position;
        const posColor = pos <= 8 ? U.gold : pos <= 32 ? U.white : U.textDim;

        return (
          <div key={p.id} className="uv-player-row" style={{ alignItems: 'center', gap: 10 }}>
            <span style={{ fontFamily: U.mono, fontSize: 12, fontWeight: 700, color: posColor, minWidth: 32, textAlign: 'right' }}>{pos}</span>
            <PlayerFace player={p} size={26} />
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: U.display, fontSize: 12, fontWeight: 600, color: U.white, letterSpacing: 1, textTransform: 'uppercase' }}>{p.name}</div>
              <div style={{ fontFamily: U.mono, fontSize: 9, color: U.textFaint }}>{p.nationality} · {p.styleId} · {p.age}a</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: U.mono, fontSize: 12, fontWeight: 700, color: U.white }}>{entry.points} pts</div>
              <div style={{ fontFamily: U.mono, fontSize: 9, color: U.textFaint }}>{ovrTier(ovr).grade}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Prospects Tab ────────────────────────────────────────────────────
function ProspectsTab({ prospects, rankingStore }) {
  const pRanked = rankingStore.prospectRanked.length > 0
    ? rankingStore.prospectRanked
    : prospects.map((p, i) => ({ playerId: p.id, position: i + 1, points: 0 }));
  const playerMap = Object.fromEntries(prospects.map(p => [p.id, p]));

  return (
    <div>
      <div style={{ fontFamily: U.mono, fontSize: 9, letterSpacing: 4, color: U.textFaint, marginBottom: 16 }}>RANKING PROSPECTS</div>
      {pRanked.map(entry => {
        const p = playerMap[entry.playerId];
        if (!p) return null;
        const ovr = overallRating(p.attrs);
        return (
          <div key={p.id} className="uv-player-row" style={{ gap: 10 }}>
            <span style={{ fontFamily: U.mono, fontSize: 12, fontWeight: 700, color: entry.position <= 8 ? '#FF7043' : U.textDim, minWidth: 32, textAlign: 'right' }}>{entry.position}</span>
            <PlayerFace player={p} size={26} />
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: U.display, fontSize: 12, fontWeight: 600, color: U.white, letterSpacing: 1, textTransform: 'uppercase' }}>{p.name}</div>
              <div style={{ fontFamily: U.mono, fontSize: 9, color: U.textFaint }}>{p.nationality} · {p.age}a</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: U.mono, fontSize: 12, fontWeight: 700, color: '#FF7043' }}>{entry.points} pts</div>
              <div style={{ fontFamily: U.mono, fontSize: 9, color: U.textFaint }}>{ovrTier(ovr).grade}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Bracket View ─────────────────────────────────────────────────────

/** Lê o campeão de um resultado slim ou full sem quebrar. */
function getResChampion(res) {
  if (!res) return null;
  return res._slim ? res.champion : (res.bracket?.champion ?? null);
}

function BracketView({ result, players, prospects, onBack }) {
  const [selectedRound, setSelectedRound] = useState(0);

  if (!result) return (
    <div className="uv-screen">
      <div className="uv-topbar"><button className="uv-back-btn" onClick={onBack}>← Voltar</button></div>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: U.textFaint, fontFamily: U.mono }}>Resultado não encontrado</div>
      </div>
    </div>
  );

  const tournament = result.tournament ?? {};
  const sc = SURFACE_COLOR[tournament.surface] ?? SURFACE_COLOR.HARD;
  const cc = CAT_COLOR[tournament.category] ?? { main: '#888', label: tournament.category, icon: '🎾' };
  const allPlayers = [...players, ...prospects];
  const playerMap = Object.fromEntries(allPlayers.map(p => [p.id, p]));
  const champion = getResChampion(result);

  // ── SLIM FORMAT (loaded from save) ──────────────────────────────
  if (result._slim) {
    const finalist = result.finalist;
    const semis    = result.semis ?? [];
    const matches  = result.matches ?? []; // [{w,l}]

    // Reconstruct podium rows
    const podium = [
      champion  ? { rank: 1, icon: '🏆', label: 'Campeão',     color: U.gold,    p: champion  } : null,
      finalist  ? { rank: 2, icon: '🥈', label: 'Finalista',   color: U.textDim, p: finalist  } : null,
      ...semis.map(s => ({ rank: 3, icon: '🥉', label: 'Semifinal', color: U.textFaint, p: s })),
    ].filter(Boolean);

    // Group remaining W/L matches as simple list
    const champId    = champion?.id;
    const finalistId = finalist?.id;
    const semiIds    = new Set(semis.map(s => s.id));

    // Assign round label heuristic from podium membership
    const getRoundLabel = (wId, lId) => {
      if (wId === champId)    return 'Final';
      if (semiIds.has(lId))   return 'Semifinal';
      return '—';
    };

    return (
      <div className="uv-screen">
        <div className="uv-topbar">
          <button className="uv-back-btn" onClick={onBack}>← Voltar</button>
          <div style={{ width: 1, height: 20, background: U.border }} />
          <span style={{ fontSize: 14 }}>{tournament.icon}</span>
          <div>
            <div style={{ fontFamily: U.display, fontSize: 14, fontWeight: 700, letterSpacing: 2, color: U.white, textTransform: 'uppercase' }}>{tournament.name}</div>
          </div>
          <div style={{ flex: 1 }} />
          <CatBadge category={tournament.category} />
          <SurfaceTag surface={tournament.surface} />
        </div>

        <div className="uv-scroll" style={{ flex: 1, padding: 20 }}>
          {/* Pódio */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontFamily: U.mono, fontSize: 8, letterSpacing: 4, color: U.textFaint, marginBottom: 10 }}>RESULTADOS</div>
            {podium.map(({ rank, icon, label, color, p }) => {
              const pFull = playerMap[p.id];
              return (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: `1px solid ${U.border}` }}>
                  <span style={{ fontSize: rank === 1 ? 22 : 16, width: 28, textAlign: 'center' }}>{icon}</span>
                  <PlayerFace player={pFull ?? p} size={rank === 1 ? 30 : 22} gold={rank === 1} />
                  <div>
                    <div style={{ fontFamily: U.mono, fontSize: 7, letterSpacing: 3, color: U.textFaint }}>{label}</div>
                    <div style={{ fontFamily: U.display, fontSize: rank === 1 ? 15 : 12, fontWeight: 700, color, letterSpacing: 1, textTransform: 'uppercase' }}>{p.name}</div>
                    <div style={{ fontFamily: U.mono, fontSize: 8, color: U.textFaint }}>{p.nationality ?? (pFull?.nationality ?? '')}</div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Todos os confrontos */}
          {matches.length > 0 && (
            <div>
              <div style={{ fontFamily: U.mono, fontSize: 8, letterSpacing: 4, color: U.textFaint, marginBottom: 10 }}>CONFRONTOS ({matches.length})</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 6 }}>
                {matches.map(({ w, l }, i) => {
                  const wp = playerMap[w];
                  const lp = playerMap[l];
                  const rl = getRoundLabel(w, l);
                  return (
                    <div key={i} style={{ background: U.bgPanel, border: `1px solid ${U.border}`, padding: '6px 10px', display: 'flex', alignItems: 'center', gap: 8 }}>
                      {rl !== '—' && <span style={{ fontFamily: U.mono, fontSize: 7, color: cc.main, letterSpacing: 1, minWidth: 48 }}>{rl}</span>}
                      <div style={{ flex: 1, fontFamily: U.display, fontSize: 10, fontWeight: 700, color: U.white, letterSpacing: 1, textTransform: 'uppercase' }}>
                        {wp?.name ?? w}
                      </div>
                      <span style={{ fontFamily: U.mono, fontSize: 8, color: U.textFaint }}>def.</span>
                      <div style={{ flex: 1, fontFamily: U.display, fontSize: 10, color: U.textDim, letterSpacing: 1, textTransform: 'uppercase' }}>
                        {lp?.name ?? l}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── FULL BRACKET FORMAT (live / mid-season, não-salvo) ───────────
  const { bracket, qualifiers } = result;
  const { rounds } = bracket;

  const roundLabels = rounds.map((_, ri) => {
    const fromEnd = rounds.length - 1 - ri;
    const labels = ['Final', 'Semifinal', 'Quartas', 'Oitavas', '3ª Rod.', '2ª Rod.', '1ª Rod.'];
    return labels[fromEnd] ?? `Rodada ${ri + 1}`;
  });

  const currentMatches = rounds[selectedRound] ?? [];

  return (
    <div className="uv-screen">
      <div className="uv-topbar">
        <button className="uv-back-btn" onClick={onBack}>← Voltar</button>
        <div style={{ width: 1, height: 20, background: U.border }} />
        <span style={{ fontSize: 14 }}>{tournament.icon}</span>
        <div>
          <div style={{ fontFamily: U.display, fontSize: 14, fontWeight: 700, letterSpacing: 2, color: U.white, textTransform: 'uppercase' }}>{tournament.name}</div>
        </div>
        <div style={{ flex: 1 }} />
        <CatBadge category={tournament.category} />
        <SurfaceTag surface={tournament.surface} />
      </div>

      {champion && (
        <div style={{ background: `${cc.main}14`, borderBottom: `1px solid ${cc.main}44`, padding: '12px 24px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 20 }}>🏆</span>
          <div>
            <div style={{ fontFamily: U.mono, fontSize: 8, letterSpacing: 3, color: U.textFaint }}>CAMPEÃO</div>
            <div style={{ fontFamily: U.display, fontSize: 18, fontWeight: 700, color: U.gold, letterSpacing: 2, textTransform: 'uppercase' }}>{champion.name}</div>
            <div style={{ fontFamily: U.mono, fontSize: 9, color: U.textFaint }}>{champion.nationality} · {champion.styleId}</div>
          </div>
        </div>
      )}

      <div style={{ background: U.bgMid, borderBottom: `1px solid ${U.border}`, display: 'flex', padding: '0 20px', overflow: 'auto', flexShrink: 0 }}>
        {roundLabels.map((label, ri) => (
          <button key={ri} className={`uv-tab${selectedRound === ri ? ' active' : ''}`} onClick={() => setSelectedRound(ri)}>
            {label} ({rounds[ri].filter(m => !m.isBye).length})
          </button>
        ))}
      </div>

      <div className="uv-scroll" style={{ flex: 1, padding: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 8 }}>
          {currentMatches.map((match, mi) => {
            const isWon = (p) => p && match.winner?.id === p.id;
            const setScore = match.result
              ? `${match.result.sets[0]}–${match.result.sets[1]}`
              : match.isBye ? 'BYE' : '–';

            if (match.isBye && !match.playerB) {
              return (
                <div key={mi} style={{ background: U.bgPanel, border: `1px solid ${U.border}`, padding: 2, opacity: 0.5 }}>
                  <PlayerChip player={match.playerA} isWinner={true} />
                  <div style={{ padding: '4px 10px', fontFamily: U.mono, fontSize: 9, color: U.textFaint }}>BYE</div>
                </div>
              );
            }

            return (
              <div key={mi} style={{ background: U.bgPanel, border: `1px solid ${U.border}`, padding: 2 }}>
                <PlayerChip player={match.playerA} isWinner={isWon(match.playerA)} />
                <div style={{ display: 'flex', alignItems: 'center', padding: '2px 10px', gap: 8 }}>
                  <div style={{ flex: 1, height: 1, background: U.border }} />
                  <span style={{ fontFamily: U.mono, fontSize: 10, color: U.textFaint }}>{setScore}</span>
                  {match.result && (
                    <span style={{ fontFamily: U.mono, fontSize: 9, color: U.textFaint }}>
                      {match.result.setsDetail?.map(([a,b]) => `${a}–${b}`).join(' ')}
                    </span>
                  )}
                  <div style={{ flex: 1, height: 1, background: U.border }} />
                </div>
                <PlayerChip player={match.playerB} isWinner={isWon(match.playerB)} />
              </div>
            );
          })}
        </div>

        {qualifiers?.length > 0 && selectedRound === 0 && (
          <div style={{ marginTop: 24 }}>
            <div style={{ fontFamily: U.mono, fontSize: 8, letterSpacing: 4, color: U.textFaint, marginBottom: 8 }}>QUALIFICADOS ({qualifiers.length})</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {qualifiers.map(q => (
                <div key={q.id} style={{ background: U.bgPanel, border: `1px solid ${U.border}`, padding: '4px 10px', fontFamily: U.display, fontSize: 10, color: U.textDim, letterSpacing: 1, textTransform: 'uppercase' }}>
                  {q.name}
                </div>
              ))}
            </div>
          </div>
        )}
        {result?.preQualWinners?.length > 0 && selectedRound === 0 && (
          <div style={{ marginTop: 12 }}>
            <div style={{ fontFamily: U.mono, fontSize: 8, letterSpacing: 4, color: U.textFaint, marginBottom: 8 }}>PRÉ-QUALIFY WINNERS ({result.preQualWinners.length})</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {result.preQualWinners.map(q => (
                <div key={q.id} style={{ background: U.bgPanel, border: `1px solid ${U.border}`, padding: '4px 10px', fontFamily: U.display, fontSize: 10, color: U.textFaint, letterSpacing: 1, textTransform: 'uppercase', opacity: 0.7 }}>
                  {q.name}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Ranking View ─────────────────────────────────────────────────────
function RankingView({ players, rankingStore, onBack }) {
  return (
    <div className="uv-screen">
      <div className="uv-topbar">
        <button className="uv-back-btn" onClick={onBack}>← Voltar</button>
        <div style={{ width: 1, height: 20, background: U.border }} />
        <span style={{ fontFamily: U.display, fontSize: 14, fontWeight: 600, letterSpacing: 3, color: U.white }}>RANKING TOUR</span>
      </div>
      <div className="uv-scroll" style={{ flex: 1, padding: 20 }}>
        <RankingTab players={players} rankingStore={rankingStore} dispatch={() => {}} />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// END YEAR CEREMONY — Cerimônia de Encerramento de Temporada
// ═══════════════════════════════════════════════════════════════════

const _EY_CSS = `
@keyframes _ey_in    { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
@keyframes _ey_zoom  { from{opacity:0;transform:scale(.92)} to{opacity:1;transform:scale(1)} }
@keyframes _ey_pulse { 0%,100%{opacity:.7} 50%{opacity:1} }
@keyframes _ey_glow  { 0%,100%{text-shadow:0 0 20px var(--ey-c,#FFD700)} 50%{text-shadow:0 0 60px var(--ey-c,#FFD700),0 0 120px var(--ey-c,#FFD700)} }
@keyframes _ey_scan  { 0%{transform:translateY(-100%)} 100%{transform:translateY(200%)} }
@keyframes _ey_star  { 0%,100%{transform:scale(1) rotate(0deg);opacity:.8} 50%{transform:scale(1.3) rotate(180deg);opacity:1} }
@keyframes _ey_bar   { from{width:0} to{width:100%} }
@keyframes _ey_count { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
._ey_overlay {
  position:fixed;inset:0;z-index:9998;
  background:#02040A;
  display:flex;flex-direction:column;overflow:hidden;
  animation:_ey_zoom .5s cubic-bezier(.16,1,.3,1);
  font-family:'Barlow Condensed','Oswald',sans-serif;
}
._ey_stars {
  position:absolute;inset:0;pointer-events:none;overflow:hidden;
}
._ey_star_dot {
  position:absolute;border-radius:50%;background:white;
  animation:_ey_pulse linear infinite;
}
._ey_scanline {
  position:absolute;left:0;right:0;height:2px;
  background:linear-gradient(90deg,transparent,rgba(255,215,0,.15),transparent);
  animation:_ey_scan 6s linear infinite;pointer-events:none;
}
._ey_tab_btn {
  padding:14px 20px;border:none;cursor:pointer;background:transparent;
  font-family:'DM Mono',monospace;font-size:9px;letter-spacing:3px;text-transform:uppercase;
  border-bottom:2px solid transparent;transition:all .2s;flex:1;
}
._ey_tab_btn:hover { background:rgba(255,255,255,.03); }
._ey_tab_btn.active { border-bottom-color:#FFD700;color:#FFD700; }
._ey_card {
  background:rgba(255,255,255,.032);border:1px solid rgba(255,255,255,.07);
  padding:14px 16px;transition:background .15s;
}
._ey_card:hover { background:rgba(255,255,255,.055); }
._ey_award_card {
  background:linear-gradient(135deg,rgba(255,255,255,.04),rgba(255,255,255,.015));
  border:1px solid rgba(255,255,255,.1);padding:20px 24px;
  position:relative;overflow:hidden;
}
._ey_pill {
  display:inline-flex;align-items:center;gap:5px;
  padding:3px 10px;border:1px solid rgba(255,255,255,.12);
  font-family:'DM Mono',monospace;font-size:8px;letter-spacing:2px;text-transform:uppercase;
  color:rgba(255,255,255,.45);
}
`;

function _ey_injectCSS() {
  if (document.getElementById('_ey_styles')) return;
  const s = document.createElement('style');
  s.id = '_ey_styles'; s.textContent = _EY_CSS;
  document.head.appendChild(s);
}

// Starfield background
function EyStars({ count = 60 }) {
  const stars = React.useMemo(() => {
    const s = [];
    for (let i = 0; i < count; i++) {
      s.push({
        left: `${Math.random()*100}%`,
        top: `${Math.random()*100}%`,
        size: Math.random() * 2 + 0.5,
        dur: `${2 + Math.random() * 4}s`,
        delay: `${Math.random() * 4}s`,
        opacity: 0.1 + Math.random() * 0.35,
      });
    }
    return s;
  }, []);
  return (
    <div className="_ey_stars">
      <div className="_ey_scanline" />
      {stars.map((s, i) => (
        <div key={i} className="_ey_star_dot" style={{
          left: s.left, top: s.top,
          width: s.size, height: s.size,
          opacity: s.opacity,
          animationDuration: s.dur,
          animationDelay: s.delay,
        }} />
      ))}
    </div>
  );
}

// Score formatter
function fmtScore(setsDetail) {
  if (!setsDetail?.length) return '';
  return setsDetail.map(([a,b]) => `${a}–${b}`).join(' ');
}

const CAT_META = {
  GRAND_SLAM:    { color:'#FFD700', label:'Grand Slam',   short:'GS',     icon:'⭐' },
  FINALS:        { color:'#F44336', label:'ATP Finals',   short:'FINALS', icon:'👑' },
  MASTERS_1000:  { color:'#CE93D8', label:'Masters 1000', short:'M1000',  icon:'🏆' },
  ATP_500:       { color:'#4DD0E1', label:'ATP 500',      short:'500',    icon:'🥇' },
  ATP_250:       { color:'#81C784', label:'ATP 250',      short:'250',    icon:'🎯' },
  ATP_PROSPECTS: { color:'#FF8A65', label:'Prospects',    short:'PROS',   icon:'🌱' },
  PROSPECTS_FINALS: { color:'#FF8A65', label:'Prospects Finals', short:'PF', icon:'🌟' },
  OLYMPICS:      { color:'#1976D2', label:'Jogos Olímpicos', short:'OLY', icon:'🥇' },
};

const SURF_META = {
  CLAY:   { color:'#C4572A', label:'Saibro' },
  GRASS:  { color:'#2E7D32', label:'Grama' },
  HARD:   { color:'#1565C0', label:'Dura' },
  INDOOR: { color:'#6A1B9A', label:'Indoor' },
};

// ── TAB: TEMPORADA (Overview) ────────────────────────────────────
function TabTemporada({ summary }) {
  const { year, champions, awards, topGainers, retired } = summary;
  const gsChamps = champions.filter(c => c.tournament.category === 'GRAND_SLAM');
  const finalsChamp = champions.find(c => c.tournament.category === 'FINALS');

  return (
    <div style={{ padding: '28px 32px 40px', display: 'flex', flexDirection: 'column', gap: 32 }}>

      {/* #1 Reveal */}
      {awards.noOne && (
        <div style={{
          position: 'relative', overflow: 'hidden',
          padding: '32px 36px',
          background: 'linear-gradient(135deg, rgba(255,215,0,.06) 0%, rgba(255,215,0,.02) 100%)',
          border: '1px solid rgba(255,215,0,.2)',
          borderLeft: '3px solid #FFD700',
          animation: '_ey_in .5s ease',
        }}>
          <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: '40%',
            background: 'linear-gradient(90deg, transparent, rgba(255,215,0,.03))', pointerEvents: 'none' }} />
          <div style={{
            fontFamily: "'DM Mono',monospace", fontSize: 9, letterSpacing: 5,
            color: '#FFD700', textTransform: 'uppercase', marginBottom: 10, opacity: .7,
          }}>Nº 1 do Mundo · Temporada {year}</div>
          <div style={{
            fontFamily: "'Barlow Condensed','Oswald',sans-serif",
            fontSize: 'clamp(40px,6vw,72px)', fontWeight: 900,
            color: '#FFD700', lineHeight: .9, letterSpacing: -1,
            textShadow: '0 0 40px rgba(255,215,0,.3)',
            animation: '_ey_glow 4s ease-in-out infinite',
            '--ey-c': '#FFD700',
          }}>{awards.noOne.name}</div>
          <div style={{ display: 'flex', gap: 24, marginTop: 14, flexWrap: 'wrap' }}>
            <span className="_ey_pill">{awards.noOne.nationality}</span>
            <span className="_ey_pill">{awards.noOne.styleData?.label ?? awards.noOne.styleId}</span>
            {awards.mostTitlesPlayer?.id === awards.noOne.id && (
              <span className="_ey_pill" style={{ color:'#FFD700', borderColor:'rgba(255,215,0,.3)' }}>
                {awards.mostTitlesCount} títulos na temporada
              </span>
            )}
          </div>
        </div>
      )}

      {/* Grand Slam Row */}
      {gsChamps.length > 0 && (
        <div>
          <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, letterSpacing: 4, color: 'rgba(255,215,0,.55)', textTransform: 'uppercase', marginBottom: 14 }}>
            ⭐ Grand Slams
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(gsChamps.length, 4)}, 1fr)`, gap: 4 }}>
            {gsChamps.map((c, i) => {
              const surf = SURF_META[c.tournament.surface] ?? { color: '#888', label: '?' };
              return (
                <div key={i} className="_ey_card" style={{
                  borderLeft: `3px solid ${surf.color}`,
                  animation: `_ey_in .4s ease ${i * .08}s both`,
                }}>
                  <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 8, letterSpacing: 2, color: surf.color, textTransform: 'uppercase', marginBottom: 6 }}>
                    {c.tournament.name}
                  </div>
                  <div style={{ fontFamily: "'Barlow Condensed','Oswald',sans-serif", fontSize: 22, fontWeight: 700, color: '#fff', lineHeight: 1.1 }}>
                    {c.champion.name}
                  </div>
                  {c.finalist && (
                    <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: 'rgba(255,255,255,.3)', marginTop: 4 }}>
                      def. {c.finalist.name} {fmtScore(c.setsDetail)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ATP Finals */}
      {finalsChamp && (
        <div>
          <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, letterSpacing: 4, color: 'rgba(244,67,54,.65)', textTransform: 'uppercase', marginBottom: 14 }}>
            👑 ATP Finals
          </div>
          <div className="_ey_card" style={{ borderLeft: '3px solid #F44336', display: 'flex', alignItems: 'center', gap: 20 }}>
            <div>
              <div style={{ fontFamily: "'Barlow Condensed','Oswald',sans-serif", fontSize: 28, fontWeight: 800, color: '#fff' }}>
                {finalsChamp.champion.name}
              </div>
              {finalsChamp.finalist && (
                <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: 'rgba(255,255,255,.35)', marginTop: 4 }}>
                  def. {finalsChamp.finalist.name} {fmtScore(finalsChamp.setsDetail)}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 3-column: Most Improved, Newcomer, Retired count */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
        {awards.mostImproved && (
          <div className="_ey_card" style={{ borderLeft: '3px solid #52C46A', animation: '_ey_in .5s ease .2s both' }}>
            <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 8, letterSpacing: 2, color: '#52C46A', marginBottom: 6 }}>MAIS EVOLUÍDO</div>
            <div style={{ fontFamily: "'Barlow Condensed','Oswald',sans-serif", fontSize: 20, fontWeight: 700, color: '#fff' }}>{awards.mostImproved.name}</div>
            <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, color: '#52C46A', marginTop: 3 }}>
              Maior evolução da temporada · {awards.mostImproved.age} anos
            </div>
          </div>
        )}
        {awards.bestNewcomer && (
          <div className="_ey_card" style={{ borderLeft: '3px solid #4A90C4', animation: '_ey_in .5s ease .3s both' }}>
            <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 8, letterSpacing: 2, color: '#4A90C4', marginBottom: 6 }}>REVELAÇÃO</div>
            <div style={{ fontFamily: "'Barlow Condensed','Oswald',sans-serif", fontSize: 20, fontWeight: 700, color: '#fff' }}>{awards.bestNewcomer.name}</div>
            <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, color: '#4A90C4', marginTop: 3 }}>
              #{awards.bestNewcomer.rankPosition ?? '?'} · 1º ano no tour
            </div>
          </div>
        )}
        <div className="_ey_card" style={{ borderLeft: '3px solid rgba(255,255,255,.2)', animation: '_ey_in .5s ease .4s both' }}>
          <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 8, letterSpacing: 2, color: 'rgba(255,255,255,.35)', marginBottom: 6 }}>APOSENTADOS</div>
          <div style={{ fontFamily: "'Barlow Condensed','Oswald',sans-serif", fontSize: 40, fontWeight: 900, color: 'rgba(255,255,255,.6)', lineHeight: 1 }}>
            {retired.length}
          </div>
          <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, color: 'rgba(255,255,255,.25)', marginTop: 3 }}>
            0 promovidos das prospects
          </div>
        </div>
      </div>
    </div>
  );
}

// ── TAB: PREMIAÇÕES ──────────────────────────────────────────────
function TabPremiacoes({ summary }) {
  const { year, awards, topGainers, topLosers, champions, seasonMetrics } = summary;

  const gsKingLabel = awards.gsKingCount >= 3 ? 'DOMINADOR DOS GRAND SLAMS' :
                      awards.gsKingCount === 2 ? 'REI DOS GRAND SLAMS' : 'CAMPEÃO DE GRAND SLAM';

  const allAwards = [
    {
      icon: '🥇', title: 'Jogador do Ano',
      name: awards.noOne?.name ?? '—',
      sub: awards.noOne ? `Nº 1 mundial · ${awards.noOne.nationality}` : '',
      color: '#FFD700',
      desc: awards.noOne ? `${awards.noOne.name} dominou a temporada ${year} e encerrou o ano no topo do ranking mundial.` : '',
    },
    ...(awards.gsKingPlayer ? [{
      icon: '⭐', title: gsKingLabel,
      name: awards.gsKingPlayer.name,
      sub: `${awards.gsKingCount} Grand Slam${awards.gsKingCount > 1 ? 's' : ''} em ${year}`,
      color: '#FFD700',
      desc: `Uma temporada histórica nos Grand Slams. ${awards.gsKingPlayer.name} conquistou ${awards.gsKingCount} troféu${awards.gsKingCount > 1 ? 's' : ''} no principais torneios do mundo.`,
    }] : []),
    ...(awards.mostTitlesPlayer && awards.mostTitlesCount > 1 ? [{
      icon: '🏆', title: 'Mais Títulos na Temporada',
      name: awards.mostTitlesPlayer.name,
      sub: `${awards.mostTitlesCount} títulos em ${year}`,
      color: '#CE93D8',
      desc: `Com ${awards.mostTitlesCount} troféus em ${year}, ${awards.mostTitlesPlayer.name} foi o jogador mais vitorioso da temporada.`,
    }] : []),
    ...(awards.mostImproved ? [{
      icon: '📈', title: 'Mais Evoluído',
      name: awards.mostImproved.name,
      sub: `Maior evolução · ${awards.mostImproved.nationality}`,
      color: '#52C46A',
      desc: `Desenvolvimento impressionante. ${awards.mostImproved.name} foi o jogador que mais cresceu em nível absoluto durante ${year}.`,
    }] : []),
    ...(awards.bestNewcomer ? [{
      icon: '🌱', title: 'Revelação do Ano',
      name: awards.bestNewcomer.name,
      sub: `#${awards.bestNewcomer.rankPosition ?? '?'} · 1º ano no tour principal`,
      color: '#4A90C4',
      desc: `Subiu das prospects e se firmou. ${awards.bestNewcomer.name} foi a maior surpresa do tour em ${year}.`,
    }] : []),
  ];

  return (
    <div style={{ padding: '28px 32px 40px', display: 'flex', flexDirection: 'column', gap: 28 }}>
      {/* Main awards */}
      <div>
        <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, letterSpacing: 4, color: 'rgba(255,215,0,.55)', textTransform: 'uppercase', marginBottom: 16 }}>
          Prêmios Individuais
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {allAwards.map((a, i) => (
            <div key={i} className="_ey_award_card" style={{
              borderLeft: `3px solid ${a.color}`,
              animation: `_ey_in .4s ease ${i * .1}s both`,
            }}>
              <div style={{ position: 'absolute', top: -20, right: -20, fontSize: 80, opacity: .04, userSelect: 'none' }}>{a.icon}</div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                <div style={{ fontSize: 28, lineHeight: 1, flexShrink: 0 }}>{a.icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 8, letterSpacing: 3, color: a.color, textTransform: 'uppercase', marginBottom: 4 }}>{a.title}</div>
                  <div style={{ fontFamily: "'Barlow Condensed','Oswald',sans-serif", fontSize: 26, fontWeight: 800, color: '#fff', lineHeight: 1.1 }}>{a.name}</div>
                  <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: 'rgba(255,255,255,.4)', marginTop: 4 }}>{a.sub}</div>
                  {a.desc && <div style={{ fontFamily: "'Barlow Condensed','Oswald',sans-serif", fontSize: 13, color: 'rgba(255,255,255,.45)', lineHeight: 1.5, marginTop: 8 }}>{a.desc}</div>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* OVR gainers */}
      <div>
        <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, letterSpacing: 4, color: '#52C46A', textTransform: 'uppercase', marginBottom: 12 }}>
          ▲ Maiores Evoluções da Temporada
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {topGainers.map(({ player, delta, ovrBefore, ovrAfter }, i) => (
            <div key={player.id} className="_ey_card" style={{
              display: 'flex', alignItems: 'center', gap: 12,
              borderLeft: '2px solid #52C46A',
              animation: `_ey_in .35s ease ${i * .07}s both`,
            }}>
              <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 12, color: 'rgba(82,196,106,.4)', minWidth: 20, textAlign: 'center' }}>#{i+1}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: "'Barlow Condensed','Oswald',sans-serif", fontSize: 16, fontWeight: 700, color: '#fff' }}>{player.name}</div>
                <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 8, color: 'rgba(255,255,255,.3)' }}>{player.age}a · {player.nationality}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                {(() => {
                  const gBefore = ovrTier(ovrBefore).grade;
                  const gAfter  = ovrTier(ovrAfter).grade;
                  const changed = gBefore !== gAfter;
                  return (
                    <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: 'rgba(255,255,255,.3)', letterSpacing: 1 }}>
                      {changed
                        ? <><span style={{ color: 'rgba(255,255,255,.25)' }}>{gBefore}</span> <span style={{ color: '#52C46A' }}>→ {gAfter}</span></>
                        : <span style={{ color: 'rgba(82,196,106,.4)' }}>{gAfter} ↑</span>
                      }
                    </div>
                  );
                })()}
                <div style={{ fontFamily: "'Barlow Condensed','Oswald',sans-serif", fontSize: 22, fontWeight: 800, color: '#52C46A', lineHeight: 1 }}>Maior evolução</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* OVR losers */}
      <div>
        <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, letterSpacing: 4, color: '#D45050', textTransform: 'uppercase', marginBottom: 12 }}>
          ▼ Maiores Declínios da Temporada
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {topLosers.map(({ player, delta, ovrBefore, ovrAfter }, i) => (
            <div key={player.id} className="_ey_card" style={{
              display: 'flex', alignItems: 'center', gap: 12,
              borderLeft: '2px solid #D45050',
            }}>
              <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 12, color: 'rgba(212,80,80,.4)', minWidth: 20, textAlign: 'center' }}>#{i+1}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: "'Barlow Condensed','Oswald',sans-serif", fontSize: 16, fontWeight: 700, color: 'rgba(255,255,255,.6)' }}>{player.name}</div>
                <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 8, color: 'rgba(255,255,255,.25)' }}>{player.age}a · {player.nationality}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                {(() => {
                  const gBefore = ovrTier(ovrBefore).grade;
                  const gAfter  = ovrTier(ovrAfter).grade;
                  const changed = gBefore !== gAfter;
                  return (
                    <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: 'rgba(255,255,255,.25)', letterSpacing: 1 }}>
                      {changed
                        ? <><span style={{ color: 'rgba(255,255,255,.3)' }}>{gBefore}</span> <span style={{ color: '#D45050' }}>→ {gAfter}</span></>
                        : <span style={{ color: 'rgba(212,80,80,.4)' }}>{gAfter} ↓</span>
                      }
                    </div>
                  );
                })()}
                <div style={{ fontFamily: "'Barlow Condensed','Oswald',sans-serif", fontSize: 22, fontWeight: 800, color: '#D45050', lineHeight: 1 }}>Declínio</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── TAB: CAMPEÕES ────────────────────────────────────────────────
function TabCampeoes({ summary }) {
  const { champions } = summary;
  const [filter, setFilter] = React.useState('ALL');

  const filterOpts = [
    { id: 'ALL', label: 'Todos' },
    { id: 'GRAND_SLAM', label: 'Grand Slams' },
    { id: 'FINALS', label: 'Finals' },
    { id: 'MASTERS_1000', label: 'Masters' },
    { id: 'ATP_500', label: 'ATP 500' },
    { id: 'ATP_250', label: 'ATP 250' },
  ];

  const filtered = filter === 'ALL' ? champions : champions.filter(c => c.tournament.category === filter);

  // Title count per player (filtered)
  const titleCounts = {};
  for (const c of champions) {
    titleCounts[c.champion.name] = (titleCounts[c.champion.name] ?? 0) + 1;
  }

  return (
    <div style={{ padding: '24px 32px 40px' }}>
      {/* Filter bar */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, flexWrap: 'wrap' }}>
        {filterOpts.map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)} style={{
            padding: '6px 14px', border: 'none', cursor: 'pointer',
            fontFamily: "'DM Mono',monospace", fontSize: 8, letterSpacing: 2, textTransform: 'uppercase',
            background: filter === f.id ? 'rgba(255,215,0,.15)' : 'rgba(255,255,255,.04)',
            color: filter === f.id ? '#FFD700' : 'rgba(255,255,255,.4)',
            borderBottom: filter === f.id ? '2px solid #FFD700' : '2px solid transparent',
          }}>{f.label}</button>
        ))}
      </div>

      {/* Champions grid */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {filtered.map((c, i) => {
          const cat = CAT_META[c.tournament.category] ?? { color: '#888', label: '?', icon: '?' };
          const surf = SURF_META[c.tournament.surface ?? 'HARD'] ?? { color: '#888' };
          const tc = titleCounts[c.champion.name];
          return (
            <div key={i} className="_ey_card" style={{
              display: 'grid', gridTemplateColumns: '120px 1fr auto',
              gap: 16, alignItems: 'center',
              borderLeft: `3px solid ${surf.color}`,
              animation: `_ey_in .35s ease ${i * .04}s both`,
            }}>
              {/* Tournament */}
              <div>
                <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 7, letterSpacing: 2, color: surf.color, textTransform: 'uppercase', marginBottom: 3 }}>
                  {surf.label}
                </div>
                <div style={{ fontFamily: "'Barlow Condensed','Oswald',sans-serif", fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,.7)', lineHeight: 1.2 }}>
                  {c.tournament.name}
                </div>
                <div style={{ marginTop: 4 }}>
                  <span style={{
                    fontFamily: "'DM Mono',monospace", fontSize: 7, letterSpacing: 2, padding: '2px 6px',
                    background: `${cat.color}18`, border: `1px solid ${cat.color}44`,
                    color: cat.color, textTransform: 'uppercase',
                  }}>{cat.label}</span>
                </div>
              </div>
              {/* Champion */}
              <div>
                <div style={{ fontFamily: "'Barlow Condensed','Oswald',sans-serif", fontSize: 22, fontWeight: 800, color: '#fff', lineHeight: 1 }}>
                  {c.champion.name}
                </div>
                {c.finalist && (
                  <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: 'rgba(255,255,255,.3)', marginTop: 4 }}>
                    def. {c.finalist.name}
                    {c.setsDetail?.length > 0 && <span style={{ color: 'rgba(255,255,255,.2)', marginLeft: 8 }}>{fmtScore(c.setsDetail)}</span>}
                  </div>
                )}
              </div>
              {/* Title count badge */}
              {tc > 1 && (
                <div style={{
                  background: 'rgba(255,215,0,.12)', border: '1px solid rgba(255,215,0,.25)',
                  padding: '6px 12px', textAlign: 'center', flexShrink: 0,
                }}>
                  <div style={{ fontFamily: "'Barlow Condensed','Oswald',sans-serif", fontSize: 24, fontWeight: 900, color: '#FFD700', lineHeight: 1 }}>{tc}×</div>
                  <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 7, color: 'rgba(255,215,0,.6)', letterSpacing: 1 }}>títulos</div>
                </div>
              )}
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, color: 'rgba(255,255,255,.25)', padding: '20px 0', textAlign: 'center' }}>
            Nenhum torneio nesta categoria.
          </div>
        )}
      </div>
    </div>
  );
}

// ── TAB: APOSENTADOS ─────────────────────────────────────────────
function TabAposentados({ summary }) {
  const { retired, year } = summary;

  // Split tour vs prospects
  const tourRetired = retired.filter(p => p.retirementInfo?.type !== 'PROSPECT_AGED_OUT');
  const prospectsRetired = retired.filter(p => p.retirementInfo?.type === 'PROSPECT_AGED_OUT');

  const RETIRE_TYPES = {
    AGE_DECLINE: { label: 'Declínio físico', icon: '⏳', color: '#9E9E9E' },
    LOW_PERFORMANCE: { label: 'Baixo desempenho', icon: '📉', color: '#607D8B' },
    INJURY_FORCED: { label: 'Forçado por lesão', icon: '🩹', color: '#F44336' },
    VOLUNTARY: { label: 'Voluntária', icon: '🎾', color: '#78909C' },
    PROSPECT_AGED_OUT: { label: 'Prospects — sem promover', icon: '📋', color: '#546E7A' },
  };

  return (
    <div style={{ padding: '28px 32px 40px', display: 'flex', flexDirection: 'column', gap: 28 }}>

      {tourRetired.length === 0 && prospectsRetired.length === 0 ? (
        <div style={{
          padding: '60px 0', textAlign: 'center',
          fontFamily: "'DM Mono',monospace", fontSize: 11, color: 'rgba(255,255,255,.2)',
          letterSpacing: 3,
        }}>NENHUMA APOSENTADORIA NESTA TEMPORADA</div>
      ) : null}

      {/* Tour Retirements */}
      {tourRetired.length > 0 && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
            <div style={{ width: 2, height: 22, background: 'rgba(255,255,255,.3)' }} />
            <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, letterSpacing: 4, color: 'rgba(255,255,255,.45)', textTransform: 'uppercase' }}>
              Tour Principal — {tourRetired.length} aposentadoria{tourRetired.length > 1 ? 's' : ''}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {tourRetired.map((p, i) => {
              const info = p.retirementInfo ?? {};
              const rt = RETIRE_TYPES[info.type] ?? { label: 'Aposentadoria', icon: '🎾', color: '#78909C' };
              const isLegend = (info.peakRank ?? info.rankAtRetirement ?? 999) <= 10;
              return (
                <div key={i} className="_ey_card" style={{
                  borderLeft: `3px solid ${isLegend ? 'rgba(255,215,0,.5)' : 'rgba(255,255,255,.15)'}`,
                  animation: `_ey_in .45s ease ${i * .1}s both`,
                  background: isLegend ? 'rgba(255,215,0,.04)' : 'rgba(255,255,255,.032)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                    <div style={{ fontSize: 22, lineHeight: 1, flexShrink: 0, marginTop: 2 }}>{rt.icon}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
                        <span style={{
                          fontFamily: "'Barlow Condensed','Oswald',sans-serif",
                          fontSize: 22, fontWeight: 800,
                          color: isLegend ? '#FFD700' : 'rgba(255,255,255,.8)', lineHeight: 1,
                        }}>{p.name}</span>
                        {isLegend && <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 8, color: 'rgba(255,215,0,.6)', letterSpacing: 2 }}>LENDA</span>}
                      </div>
                      <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 8, color: 'rgba(255,255,255,.35)', marginTop: 4, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                        {info.age && <span>{info.age} anos</span>}
                        {info.rankAtRetirement && <span>#{info.rankAtRetirement} no ranking</span>}
                        {p.nationality && <span>{p.nationality}</span>}
                        {p.styleData?.label && <span>{p.styleData.label}</span>}
                      </div>
                      {info.message && (
                        <div style={{ fontFamily: "'Barlow Condensed','Oswald',sans-serif", fontSize: 13, color: 'rgba(255,255,255,.35)', lineHeight: 1.5, marginTop: 8 }}>
                          {info.message}
                        </div>
                      )}
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 7, letterSpacing: 2, color: rt.color, textTransform: 'uppercase', marginBottom: 4 }}>
                        {rt.label}
                      </div>
                      {info.career?.seasons && (
                        <div style={{ fontFamily: "'Barlow Condensed','Oswald',sans-serif", fontSize: 18, fontWeight: 700, color: 'rgba(255,255,255,.3)' }}>
                          {info.career.seasons} temp.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Prospects aged out */}
      {prospectsRetired.length > 0 && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
            <div style={{ width: 2, height: 16, background: '#546E7A' }} />
            <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, letterSpacing: 4, color: '#546E7A', textTransform: 'uppercase' }}>
              Prospects — Encerramento de carreira jovem ({prospectsRetired.length})
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 4 }}>
            {prospectsRetired.map((p, i) => (
              <div key={i} className="_ey_card" style={{ borderLeft: '2px solid #37474F', opacity: .7 }}>
                <div style={{ fontFamily: "'Barlow Condensed','Oswald',sans-serif", fontSize: 16, fontWeight: 700, color: 'rgba(255,255,255,.5)' }}>{p.name}</div>
                <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 8, color: 'rgba(255,255,255,.25)', marginTop: 3 }}>
                  {p.age ?? (p.retirementInfo?.age)} anos · #{p.rankPosition ?? '?'} prospects
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── TAB: REVELAÇÕES (Talent Hunter) ─────────────────────────────
function TabRevelacoes({ summary, allPlayers }) {
  const { newTourEntrants = [], year } = summary;

  // Sub-20 talent scan — jogadores com até 19 anos no tour principal
  const talents = React.useMemo(() => {
    const pool = allPlayers ?? [];
    return pool
      .filter(p => {
        const age = p.age ?? 99;
        return age <= 19;
      })
      .sort((a, b) => (a.rankPosition ?? 999) - (b.rankPosition ?? 999))
      .slice(0, 20);
  }, [allPlayers]);

  const getGrade = (p) => {
    const pot = p.potential ?? 'REGULAR';
    if (['LENDA', 'ELITE'].includes(pot)) return { label: 'ELITE', color: '#C9A84C' };
    if (pot === 'CAMPEAO') return { label: 'CAMPEÃO', color: '#52C46A' };
    return { label: 'PROMESSA', color: '#4A8EC2' };
  };

  return (
    <div style={{ padding: '28px 32px 40px', display: 'flex', flexDirection: 'column', gap: 32 }}>

      {/* Talent Hunter Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ width: 2, height: 32, background: '#C9A84C' }} />
        <div>
          <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, letterSpacing: 4, color: '#C9A84C', textTransform: 'uppercase' }}>
            Talent Hunter · ATP-100
          </div>
          <div style={{ fontFamily: "'Barlow Condensed','Oswald',sans-serif", fontSize: 22, fontWeight: 900, color: '#fff', marginTop: 3 }}>
            Jovens Sub-20 no Circuito
          </div>
          <div style={{ fontFamily: "'Barlow Condensed','Oswald',sans-serif", fontSize: 12, color: 'rgba(255,255,255,.3)', marginTop: 2 }}>
            Jogadores com até 19 anos ativos no tour profissional em {year}
          </div>
        </div>
      </div>

      {/* Talent list */}
      {talents.length === 0 ? (
        <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, color: 'rgba(255,255,255,.2)', padding: '28px 0', letterSpacing: 2 }}>
          NENHUM JOGADOR SUB-20 NO CIRCUITO NESTA TEMPORADA.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {talents.map((p, i) => {
            const grade = getGrade(p);
            const ovr = p._ovrSnapshot ?? 0;
            const isNew = newTourEntrants.some(n => n.id === p.id);
            return (
              <div key={p.id} style={{
                display: 'flex', alignItems: 'center', gap: 14,
                background: 'rgba(255,255,255,.03)',
                border: `1px solid ${isNew ? grade.color + '44' : 'rgba(255,255,255,.06)'}`,
                borderLeft: `3px solid ${grade.color}`,
                padding: '10px 16px',
                borderRadius: 2,
              }}>
                <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, color: 'rgba(255,255,255,.22)', minWidth: 28, textAlign: 'center' }}>
                  #{p.rankPosition ?? '—'}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                    <div style={{ fontFamily: "'Barlow Condensed','Oswald',sans-serif", fontSize: 19, fontWeight: 800, color: '#fff' }}>
                      {p.name}
                    </div>
                    {isNew && (
                      <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 7, color: grade.color, letterSpacing: 2, border: `1px solid ${grade.color}44`, padding: '1px 6px' }}>
                        ESTREANTE
                      </span>
                    )}
                    <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 7, color: grade.color, letterSpacing: 2, border: `1px solid ${grade.color}33`, padding: '1px 6px' }}>
                      {grade.label}
                    </span>
                  </div>
                  <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 8, color: 'rgba(255,255,255,.3)', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <span>{p.nationality}</span>
                    <span>{p.age} anos</span>
                    <span>{p.styleId}</span>
                    {p.naturalSignature && <span>✦ {p.naturalSignature.replace(/_/g,' ')}</span>}
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 7, color: 'rgba(255,255,255,.25)', marginBottom: 2 }}>NÍVEL</div>
                  <div style={{ fontFamily: "'Barlow Condensed','Oswald',sans-serif", fontSize: 30, fontWeight: 900, color: grade.color, lineHeight: 1 }}>{grade?.grade ?? ovrTier(ovr).grade}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* New entrants this season */}
      {newTourEntrants.length > 0 && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
            <div style={{ width: 2, height: 20, background: '#52C46A' }} />
            <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, letterSpacing: 3, color: '#52C46A', textTransform: 'uppercase' }}>
              Novos Profissionais {year} — {newTourEntrants.length} jogadores
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 4 }}>
            {newTourEntrants.map((p, i) => (
              <div key={p.id} style={{
                padding: '8px 12px', border: '1px solid rgba(82,196,106,.18)',
                borderLeft: '2px solid #52C46A', background: 'rgba(82,196,106,.04)',
              }}>
                <div style={{ fontFamily: "'Barlow Condensed','Oswald',sans-serif", fontSize: 16, fontWeight: 800, color: '#fff' }}>{p.name}</div>
                <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 7.5, color: 'rgba(255,255,255,.3)', marginTop: 3 }}>
                  {p.nationality} · {p.age} anos · {p.styleId}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── TAB: LESÕES ──────────────────────────────────────────────────
function TabLesoes({ summary }) {
  const { injuries } = summary;
  const INJURY_GRADE = {
    1: { color: '#FFC107', label: 'Leve',    bg: 'rgba(255,193,7,.08)' },
    2: { color: '#FF9800', label: 'Moderada', bg: 'rgba(255,152,0,.08)' },
    3: { color: '#F44336', label: 'Grave',   bg: 'rgba(244,67,54,.08)' },
  };

  const deduped = Object.values(
    injuries.reduce((acc, e) => {
      const id = e.playerId ?? e.playerName ?? e.text;
      const prev = acc[id];
      const grade = e.injury?.grade ?? 1;
      if (!prev || grade > (prev.injury?.grade ?? 1)) acc[id] = e;
      return acc;
    }, {})
  ).sort((a,b) => (b.injury?.grade ?? 1) - (a.injury?.grade ?? 1));

  return (
    <div style={{ padding: '28px 32px 40px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
        <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, letterSpacing: 4, color: '#FFC107', textTransform: 'uppercase' }}>
          🩹 Relatório Médico — {deduped.length} lesões registradas
        </div>
        <div style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
          {[1,2,3].map(g => {
            const meta = INJURY_GRADE[g];
            const cnt = deduped.filter(e => (e.injury?.grade ?? 1) === g).length;
            return cnt > 0 ? (
              <span key={g} style={{ fontFamily: "'DM Mono',monospace", fontSize: 8, padding: '3px 10px', letterSpacing: 1, border: `1px solid ${meta.color}44`, color: meta.color }}>
                G{g}: {cnt}
              </span>
            ) : null;
          })}
        </div>
      </div>

      {deduped.length === 0 ? (
        <div style={{ padding: '60px 0', textAlign: 'center', fontFamily: "'DM Mono',monospace", fontSize: 11, color: 'rgba(255,255,255,.2)', letterSpacing: 3 }}>
          TEMPORADA SEM LESÕES REGISTRADAS
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {deduped.map((e, i) => {
            const grade = e.injury?.grade ?? 1;
            const meta = INJURY_GRADE[grade] ?? INJURY_GRADE[1];
            return (
              <div key={i} className="_ey_card" style={{
                display: 'flex', alignItems: 'center', gap: 12,
                borderLeft: `3px solid ${meta.color}`,
                background: meta.bg,
                animation: `_ey_in .35s ease ${i * .05}s both`,
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: "'Barlow Condensed','Oswald',sans-serif", fontSize: 18, fontWeight: 700, color: '#fff' }}>
                    {e.playerName ?? '—'}
                  </div>
                  <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 8, color: 'rgba(255,255,255,.35)', marginTop: 3 }}>
                    {e.injury?.type ?? 'Tipo desconhecido'}
                  </div>
                </div>
                <div style={{ flexShrink: 0, textAlign: 'right' }}>
                  <div style={{ fontFamily: "'Barlow Condensed','Oswald',sans-serif", fontSize: 22, fontWeight: 900, color: meta.color, lineHeight: 1 }}>G{grade}</div>
                  <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 7, letterSpacing: 1, color: meta.color, opacity: .7, marginTop: 2 }}>{meta.label}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── TAB: RATINGS ─────────────────────────────────────────────────
function TabRatings({ allPlayers }) {
  const [filter, setFilter] = React.useState('all'); // 'all' | 'up' | 'down' | 'same'

  const rows = React.useMemo(() => {
    return [...(allPlayers ?? [])]
      .map(p => {
        const hist = p._seasonHistory;
        const last = Array.isArray(hist) ? hist[hist.length - 1] : null;
        const delta    = last ? (last.ovrDelta ?? 0) : 0;
        const ovrAfter = last ? (last.ovr ?? p.ovr ?? 0) : (p.ovr ?? 0);
        return { id: p.id, name: p.name, rank: p.rankPosition ?? 999, delta, ovrAfter };
      })
      .filter(r => {
        if (filter === 'up')   return r.delta > 0;
        if (filter === 'down') return r.delta < 0;
        if (filter === 'same') return r.delta === 0;
        return true;
      })
      .sort((a, b) => a.rank - b.rank);
  }, [allPlayers, filter]);

  const FILTERS = [
    { id: 'all',  label: 'Todos',     icon: '◈' },
    { id: 'up',   label: 'Subiram',   icon: '▲' },
    { id: 'down', label: 'Caíram',    icon: '▼' },
    { id: 'same', label: 'Estável',   icon: '—' },
  ];

  return (
    <div style={{ padding: '28px 32px 40px' }}>
      {/* Header + filtros */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, letterSpacing: 4, color: '#FFD700', textTransform: 'uppercase' }}>
          📊 Variação de Rating — {(allPlayers ?? []).length} jogadores
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          {FILTERS.map(f => (
            <button key={f.id} onClick={() => setFilter(f.id)} style={{
              background: filter === f.id ? 'rgba(255,215,0,.18)' : 'rgba(255,255,255,.04)',
              border: `1px solid ${filter === f.id ? 'rgba(255,215,0,.5)' : 'rgba(255,255,255,.1)'}`,
              color: filter === f.id ? '#FFD700' : 'rgba(255,255,255,.4)',
              fontFamily: "'DM Mono',monospace", fontSize: 8, letterSpacing: 2,
              padding: '5px 14px', cursor: 'pointer', transition: 'all .15s',
              textTransform: 'uppercase',
            }}>
              {f.icon} {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tabela */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {/* Cabeçalho */}
        <div style={{
          display: 'grid', gridTemplateColumns: '52px 1fr 70px 80px',
          padding: '6px 14px',
          fontFamily: "'DM Mono',monospace", fontSize: 7, letterSpacing: 3,
          color: 'rgba(255,255,255,.25)', textTransform: 'uppercase',
          borderBottom: '1px solid rgba(255,255,255,.06)',
          marginBottom: 4,
        }}>
          <span>RANK</span>
          <span>JOGADOR</span>
          <span style={{ textAlign: 'right' }}>RATING</span>
          <span style={{ textAlign: 'right' }}>VARIAÇÃO</span>
        </div>

        {rows.length === 0 && (
          <div style={{ padding: '60px 0', textAlign: 'center', fontFamily: "'DM Mono',monospace", fontSize: 11, color: 'rgba(255,255,255,.2)', letterSpacing: 3 }}>
            NENHUM JOGADOR NESTE FILTRO
          </div>
        )}

        {rows.map((r, i) => {
          const isUp   = r.delta > 0;
          const isDown = r.delta < 0;
          const deltaColor = isUp ? '#4CAF50' : isDown ? '#F44336' : 'rgba(255,255,255,.25)';
          const deltaBg    = isUp ? 'rgba(76,175,80,.07)' : isDown ? 'rgba(244,67,54,.07)' : 'transparent';
          const deltaStr   = isUp ? `+${r.delta}` : isDown ? `${r.delta}` : '—';
          const icon       = isUp ? '▲' : isDown ? '▼' : '·';

          return (
            <div key={r.id} style={{
              display: 'grid', gridTemplateColumns: '52px 1fr 70px 80px',
              alignItems: 'center',
              padding: '9px 14px',
              background: i % 2 === 0 ? 'rgba(255,255,255,.02)' : 'transparent',
              borderLeft: `2px solid ${isUp ? '#4CAF5055' : isDown ? '#F4433655' : 'transparent'}`,
              transition: 'background .15s',
              animation: `_ey_in .25s ease ${Math.min(i, 30) * .018}s both`,
            }}>
              {/* Rank */}
              <div style={{
                fontFamily: "'DM Mono',monospace", fontSize: 11, fontWeight: 700,
                color: r.rank <= 10 ? '#FFD700' : r.rank <= 30 ? 'rgba(255,215,0,.55)' : 'rgba(255,255,255,.3)',
              }}>
                #{r.rank}
              </div>

              {/* Nome */}
              <div style={{
                fontFamily: "'Barlow Condensed','Oswald',sans-serif",
                fontSize: 17, fontWeight: r.rank <= 20 ? 700 : 500,
                color: r.rank <= 10 ? '#fff' : 'rgba(255,255,255,.75)',
                letterSpacing: .3,
              }}>
                {r.name}
              </div>

              {/* Nível atual */}
              <div style={{
                textAlign: 'right',
                fontFamily: "'DM Mono',monospace", fontSize: 12, fontWeight: 600,
                color: ovrTier(r.ovrAfter).color, opacity: .7,
              }}>
                {ovrTier(r.ovrAfter).grade}
              </div>

              {/* Delta de nível */}
              {(() => {
                const gBefore = ovrTier(r.ovrAfter - r.delta).grade;
                const gAfter  = ovrTier(r.ovrAfter).grade;
                const changed = gBefore !== gAfter;
                return (
                  <div style={{
                    textAlign: 'right',
                    fontFamily: "'Barlow Condensed','Oswald',sans-serif",
                    fontSize: 16, fontWeight: 800,
                    color: deltaColor,
                    background: deltaBg,
                    padding: '2px 10px',
                    letterSpacing: .5,
                  }}>
                    <span style={{ fontSize: 10, marginRight: 4, verticalAlign: 'middle' }}>{icon}</span>
                    {changed ? `${gBefore}→${gAfter}` : deltaStr}
                  </div>
                );
              })()}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── TAB: NOVIDADES DO CIRCUITO ──────────────────────────────────
function TabNovidades({ summary }) {
  const { newTourEntrants = [], retired = [], year } = summary;

  const PLAY_STYLES_LABEL = {
    AGGRESSIVE_BASELINER: 'Baseliner Agressivo',
    ALL_COURT: 'All Court',
    BIG_SERVER: 'Servidor',
    COUNTER_PUNCHER: 'Defensor',
    NET_RUSHER: 'Chega à Rede',
    SERVE_VOLLEY: 'Serve & Volley',
  };

  // Ordena por potencial (ovr attr aproximado)
  const sorted = [...newTourEntrants].sort((a, b) => {
    const oA = a.attrs ? Object.values(a.attrs).reduce((s, v) => s + v, 0) / Object.keys(a.attrs).length : 0;
    const oB = b.attrs ? Object.values(b.attrs).reduce((s, v) => s + v, 0) / Object.keys(b.attrs).length : 0;
    return oB - oA;
  });

  const tourRetiredCount = retired.filter(p => p.retirementInfo?.type !== 'PROSPECT_AGED_OUT').length;

  return (
    <div style={{ padding: '28px 32px 40px' }}>

      {/* Header resumo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginBottom: 28, padding: '16px 20px', background: 'rgba(76,175,80,.06)', border: '1px solid rgba(76,175,80,.2)', borderLeft: '3px solid rgba(76,175,80,.6)' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: "'Barlow Condensed','Oswald',sans-serif", fontSize: 40, fontWeight: 900, color: '#4CAF50', lineHeight: 1 }}>{sorted.length}</div>
          <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 7, letterSpacing: 3, color: 'rgba(255,255,255,.35)', textTransform: 'uppercase', marginTop: 3 }}>Novos no Circuito</div>
        </div>
        <div style={{ width: 1, height: 48, background: 'rgba(255,255,255,.1)' }} />
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: "'Barlow Condensed','Oswald',sans-serif", fontSize: 40, fontWeight: 900, color: 'rgba(255,255,255,.4)', lineHeight: 1 }}>{tourRetiredCount}</div>
          <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 7, letterSpacing: 3, color: 'rgba(255,255,255,.35)', textTransform: 'uppercase', marginTop: 3 }}>Vagas Abertas</div>
        </div>
        <div style={{ flex: 1, fontFamily: "'Barlow Condensed','Oswald',sans-serif", fontSize: 14, color: 'rgba(255,255,255,.3)', lineHeight: 1.5 }}>
          {sorted.length} novos talentos entram no Tour Principal em {year + 1} para substituir as saídas da temporada {year}.
        </div>
      </div>

      {sorted.length === 0 ? (
        <div style={{ padding: '60px 0', textAlign: 'center', fontFamily: "'DM Mono',monospace", fontSize: 11, color: 'rgba(255,255,255,.2)', letterSpacing: 3 }}>
          NENHUM NOVATO ESTA TEMPORADA
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {/* Cabeçalho */}
          <div style={{ display: 'grid', gridTemplateColumns: '32px 1fr 80px 70px 90px', gap: 0, padding: '6px 14px', borderBottom: '1px solid rgba(255,255,255,.07)', marginBottom: 4 }}>
            {['#','JOGADOR','IDADE','NÍVEL','ESTILO'].map((h, i) => (
              <div key={h} style={{ fontFamily: "'DM Mono',monospace", fontSize: 7, letterSpacing: 3, color: 'rgba(255,255,255,.25)', textTransform: 'uppercase', textAlign: i >= 2 ? 'center' : undefined }}>{h}</div>
            ))}
          </div>

          {sorted.map((p, i) => {
            const attrs = p.attrs ?? {};
            const attrVals = Object.values(attrs).filter(v => typeof v === 'number');
            const ovr = attrVals.length ? Math.round(attrVals.reduce((s, v) => s + v, 0) / attrVals.length) : 0;
            const age = p.age ?? (p.birthYear ? year + 1 - p.birthYear : null);
            const styleLabel = PLAY_STYLES_LABEL[p.styleId] ?? (p.styleId ?? '—');
            const potential = p.potential ?? null;
            const isTop = i < 3;
            const potColor = potential >= 90 ? '#FFD700' : potential >= 80 ? '#4CAF50' : potential >= 70 ? '#00BCD4' : 'rgba(255,255,255,.3)';

            return (
              <div key={p.id ?? i} className="_ey_card" style={{
                display: 'grid', gridTemplateColumns: '32px 1fr 80px 70px 90px',
                gap: 0, padding: '12px 14px',
                borderLeft: isTop ? `3px solid ${i === 0 ? '#4CAF50' : 'rgba(76,175,80,.4)'}` : '3px solid rgba(255,255,255,.06)',
                background: isTop ? 'rgba(76,175,80,.05)' : 'transparent',
                animation: `_ey_in .35s ease ${i * .04}s both`,
              }}>
                {/* Rank */}
                <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 12, fontWeight: 700, color: isTop ? '#4CAF50' : 'rgba(255,255,255,.25)', alignSelf: 'center' }}>
                  {i + 1}
                </div>

                {/* Nome + país */}
                <div style={{ alignSelf: 'center', minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
                    <span style={{ fontFamily: "'Barlow Condensed','Oswald',sans-serif", fontSize: 21, fontWeight: 800, color: isTop ? '#fff' : 'rgba(255,255,255,.8)', lineHeight: 1, textTransform: 'uppercase' }}>
                      {p.name}
                    </span>
                    {potential >= 80 && (
                      <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 7, color: potColor, letterSpacing: 2, border: `1px solid ${potColor}55`, padding: '1px 6px' }}>
                        {['GERACIONAL','LENDA'].includes(potential) ? '✦ TALENTO' : ['ELITE','CAMPEAO'].includes(potential) ? 'PROMESSA' : 'TOUR'}
                      </span>
                    )}
                  </div>
                  <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 8, color: 'rgba(255,255,255,.3)', marginTop: 2, letterSpacing: 1 }}>
                    {p.nationality ?? '—'}
                    {p.alcunha && <span style={{ marginLeft: 8, color: 'rgba(255,255,255,.2)' }}>"{p.alcunha}"</span>}
                  </div>
                </div>

                {/* Idade */}
                <div style={{ fontFamily: "'Barlow Condensed','Oswald',sans-serif", fontSize: 22, fontWeight: 700, color: 'rgba(255,255,255,.55)', textAlign: 'center', alignSelf: 'center' }}>
                  {age ?? '—'}
                  <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 8, color: 'rgba(255,255,255,.25)', marginLeft: 2 }}>a</span>
                </div>

                {/* Nível */}
                <div style={{ fontFamily: "'Barlow Condensed','Oswald',sans-serif", fontSize: 20, fontWeight: 900, color: ovrTier(ovr).color, textAlign: 'center', alignSelf: 'center' }}>
                  {ovrTier(ovr).grade}
                </div>

                {/* Estilo */}
                <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 8, color: 'rgba(255,255,255,.35)', textAlign: 'center', letterSpacing: 1, alignSelf: 'center', textTransform: 'uppercase', lineHeight: 1.4 }}>
                  {styleLabel}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── MAIN CEREMONY ────────────────────────────────────────────────
function TabGala({ summary, allPlayers, onDismiss }) {
  const { year, awards, retired = [], newTourEntrants = [], champions = [], topGainers = [] } = summary;
  const nextYear = year + 1;
  const [revealStep, setRevealStep] = React.useState(1);

  React.useEffect(() => {
    setRevealStep(1);
    let step = 1;
    const timer = setInterval(() => {
      step += 1;
      setRevealStep(step);
      if (step >= 5) clearInterval(timer);
    }, 850);
    return () => clearInterval(timer);
  }, [year]);

  const styleLabel = React.useCallback((player) => {
    if (!player) return 'Jogador';
    return player.styleData?.label
      ?? PLAY_STYLES[player.styleId]?.label
      ?? String(player.styleId ?? 'Jogador').replace(/_/g, ' ');
  }, []);

  const playerOvr = React.useCallback((player) => {
    if (!player) return 0;
    if (typeof player._ovrSnapshot === 'number') return player._ovrSnapshot;
    return overallRating(player.attrs ?? {});
  }, []);

  const getStrengths = React.useCallback((player, n = 3) => {
    if (!player?.attrs) return [];
    return topStrengths(player.attrs, n).map(s => s.label);
  }, []);

  const proAwards = React.useMemo(() => {
    const list = [];
    if (awards?.noOne) list.push({ kicker: 'Jogador do Ano', color: '#FFD700', icon: 'T', player: awards.noOne, detail: `Nº 1 do mundo e referência máxima da temporada ${year}.` });
    if (awards?.gsKingPlayer) list.push({ kicker: awards.gsKingCount >= 3 ? 'Dominador dos Slams' : 'Rei dos Slams', color: '#F6C453', icon: 'GS', player: awards.gsKingPlayer, detail: `${awards.gsKingCount} Grand Slam${awards.gsKingCount > 1 ? 's' : ''} conquistado${awards.gsKingCount > 1 ? 's' : ''} no ano.` });
    if (awards?.mostImproved) list.push({ kicker: 'Mais Evoluído', color: '#52C46A', icon: 'UP', player: awards.mostImproved, detail: 'Maior salto técnico e competitivo da temporada.' });
    return list.slice(0, 3);
  }, [awards, year]);

  const u22Pool = React.useMemo(() => [...(allPlayers ?? [])].filter(p => (p?.age ?? 99) <= 22).sort((a, b) => (a.rankPosition ?? 999) - (b.rankPosition ?? 999)), [allPlayers]);

  const u22Awards = React.useMemo(() => {
    const bestU22 = u22Pool[0] ?? null;
    const risingU22 = topGainers.find(({ player }) => (player?.age ?? 99) <= 22)?.player ?? null;
    const entrantU22 = [...newTourEntrants].filter(p => (p?.age ?? 99) <= 22).sort((a, b) => (a.rankPosition ?? 999) - (b.rankPosition ?? 999))[0] ?? null;
    return [
      bestU22 ? { kicker: 'Líder Sub-22', color: '#6FD3FF', icon: 'U22', player: bestU22, detail: `Melhor posicionado entre os jovens no começo de ${nextYear}.` } : null,
      risingU22 ? { kicker: 'Ascensão Jovem', color: '#8BE28B', icon: 'RISE', player: risingU22, detail: 'Evolução de nível que mudou o teto de expectativa.' } : null,
      entrantU22 ? { kicker: 'Estreante para Vigiar', color: '#FF9F68', icon: 'NEW', player: entrantU22, detail: 'Novo nome que já entrou pedindo atenção do circuito.' } : null,
    ].filter(Boolean);
  }, [u22Pool, topGainers, newTourEntrants, nextYear]);

  const retirementSpotlight = React.useMemo(() => [...retired]
    .filter(p => p?.retirementInfo?.type !== 'PROSPECT_AGED_OUT')
    .sort((a, b) => {
      const aPeak = a?.retirementInfo?.peakRank ?? a?.retirementInfo?.rankAtRetirement ?? 999;
      const bPeak = b?.retirementInfo?.peakRank ?? b?.retirementInfo?.rankAtRetirement ?? 999;
      if (aPeak !== bPeak) return aPeak - bPeak;
      const aGs = a?._careerGrandSlams ?? a?.careerTitles?.gs ?? 0;
      const bGs = b?._careerGrandSlams ?? b?.careerTitles?.gs ?? 0;
      return bGs - aGs;
    }).slice(0, 2), [retired]);

  const watchList = React.useMemo(() => [...newTourEntrants].sort((a, b) => {
    const potA = typeof a.potential === 'number' ? a.potential : playerOvr(a);
    const potB = typeof b.potential === 'number' ? b.potential : playerOvr(b);
    return potB - potA;
  }).slice(0, 4), [newTourEntrants, playerOvr]);

  const headlineChampions = React.useMemo(() => {
    const catOrder = { GRAND_SLAM: 0, FINALS: 1, MASTERS_1000: 2, ATP_500: 3, ATP_250: 4, ATP_100: 5 };
    return [...champions].sort((a, b) => (catOrder[a.tournament.category] ?? 9) - (catOrder[b.tournament.category] ?? 9)).slice(0, 5);
  }, [champions]);

  const revealStyle = (step) => ({
    opacity: revealStep >= step ? 1 : 0,
    transform: revealStep >= step ? 'translateY(0)' : 'translateY(26px)',
    transition: 'opacity .55s ease, transform .55s ease',
  });

  return (
    <div style={{ padding: '26px 28px 40px', display: 'flex', flexDirection: 'column', gap: 22 }}>
      <div style={{ position: 'relative', overflow: 'hidden', padding: '28px 30px 30px', border: '1px solid rgba(255,215,0,.16)', background: 'radial-gradient(circle at top left, rgba(255,215,0,.14), transparent 34%), linear-gradient(135deg, rgba(10,14,24,.94), rgba(5,8,13,.98))', boxShadow: '0 18px 60px rgba(0,0,0,.35)' }}>
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,.03), transparent)', transform: 'translateX(-100%)', animation: '_ey_scan 5.5s linear infinite' }} />
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 8, letterSpacing: 5, color: 'rgba(255,215,0,.55)', textTransform: 'uppercase', marginBottom: 8 }}>The Season Awards</div>
            <div style={{ fontFamily: "'Barlow Condensed','Oswald',sans-serif", fontSize: 'clamp(42px,7vw,78px)', fontWeight: 900, lineHeight: .9, color: '#F5E7AE', textShadow: '0 0 35px rgba(255,215,0,.18)' }}>NIGHT OF {year}</div>
            <div style={{ fontFamily: "'Barlow Condensed','Oswald',sans-serif", fontSize: 18, color: 'rgba(255,255,255,.55)', marginTop: 10, maxWidth: 760, lineHeight: 1.45 }}>Uma noite para coroar os gigantes do circuito, homenagear os que saem de cena e apresentar os nomes que vão incendiar a temporada {nextYear}.</div>
          </div>
          <button onClick={onDismiss} style={{ alignSelf: 'center', background: 'linear-gradient(135deg, rgba(255,215,0,.2), rgba(255,215,0,.08))', border: '1px solid rgba(255,215,0,.35)', color: '#FFD700', cursor: 'pointer', fontFamily: "'Barlow Condensed','Oswald',sans-serif", fontSize: 14, fontWeight: 800, letterSpacing: 3, textTransform: 'uppercase', padding: '12px 24px' }}>Abrir {nextYear}</button>
        </div>
      </div>

      <div style={{ ...revealStyle(1), display: 'grid', gridTemplateColumns: '1.3fr .9fr', gap: 10 }}>
        <div className="_ey_award_card" style={{ borderLeft: '4px solid #FFD700', minHeight: 220 }}>
          <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 8, letterSpacing: 4, color: '#FFD700', textTransform: 'uppercase', marginBottom: 8 }}>Troféu Supremo</div>
          <div style={{ fontFamily: "'Barlow Condensed','Oswald',sans-serif", fontSize: 16, color: 'rgba(255,255,255,.45)', textTransform: 'uppercase', letterSpacing: 2 }}>Jogador do Ano</div>
          <div style={{ fontFamily: "'Barlow Condensed','Oswald',sans-serif", fontSize: 'clamp(40px,5vw,62px)', fontWeight: 900, color: '#fff', lineHeight: .92, marginTop: 8 }}>{awards?.noOne?.name ?? 'Sem vencedor'}</div>
          {awards?.noOne && <>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 12 }}>
              <span className="_ey_pill">{awards.noOne.nationality}</span>
              <span className="_ey_pill">{styleLabel(awards.noOne)}</span>
              <span className="_ey_pill">#{awards.noOne.rankPosition ?? 1}</span>
            </div>
            <div style={{ fontFamily: "'Barlow Condensed','Oswald',sans-serif", fontSize: 16, color: 'rgba(255,255,255,.5)', marginTop: 16, lineHeight: 1.45, maxWidth: 760 }}>{awards.gsKingPlayer?.id === awards.noOne.id ? `${awards.noOne.name} dominou os grandes palcos e ainda fechou o ano na liderança do mundo.` : `${awards.noOne.name} terminou a corrida anual como referência absoluta do circuito profissional.`}</div>
          </>}
        </div>
        <div className="_ey_card" style={{ borderLeft: '3px solid rgba(255,255,255,.18)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 8, letterSpacing: 3, color: 'rgba(255,255,255,.35)', textTransform: 'uppercase', marginBottom: 10 }}>Headlines da Noite</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div><div style={{ fontFamily: "'Barlow Condensed','Oswald',sans-serif", fontSize: 28, fontWeight: 900, color: '#52C46A', lineHeight: 1 }}>{newTourEntrants.length}</div><div style={{ fontFamily: "'DM Mono',monospace", fontSize: 8, color: 'rgba(255,255,255,.3)', letterSpacing: 2 }}>NOVOS PROFISSIONAIS</div></div>
              <div><div style={{ fontFamily: "'Barlow Condensed','Oswald',sans-serif", fontSize: 28, fontWeight: 900, color: '#D4A86A', lineHeight: 1 }}>{retired.filter(p => p?.retirementInfo?.type !== 'PROSPECT_AGED_OUT').length}</div><div style={{ fontFamily: "'DM Mono',monospace", fontSize: 8, color: 'rgba(255,255,255,.3)', letterSpacing: 2 }}>GRANDES SAÍDAS</div></div>
              <div><div style={{ fontFamily: "'Barlow Condensed','Oswald',sans-serif", fontSize: 28, fontWeight: 900, color: '#6FD3FF', lineHeight: 1 }}>{u22Pool.length}</div><div style={{ fontFamily: "'DM Mono',monospace", fontSize: 8, color: 'rgba(255,255,255,.3)', letterSpacing: 2 }}>SUB-22 NO TOUR</div></div>
            </div>
          </div>
          <div style={{ fontFamily: "'Barlow Condensed','Oswald',sans-serif", fontSize: 14, lineHeight: 1.5, color: 'rgba(255,255,255,.42)' }}>O circuito chega em {nextYear} com mudança de guarda, novos rostos e mais pressão no topo.</div>
        </div>
      </div>

      <div style={{ ...revealStyle(2), display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div className="_ey_card" style={{ borderLeft: '3px solid #FFD700' }}>
          <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 8, letterSpacing: 4, color: '#FFD700', textTransform: 'uppercase', marginBottom: 14 }}>Premiações Profissionais</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            {proAwards.map((award) => <div key={award.kicker} style={{ padding: '14px 14px 16px', background: 'rgba(255,255,255,.03)', border: `1px solid ${award.color}22`, minHeight: 172 }}><div style={{ fontFamily: "'DM Mono',monospace", fontSize: 8, letterSpacing: 2, color: award.color, textTransform: 'uppercase', marginBottom: 10 }}>{award.icon} {award.kicker}</div><div style={{ fontFamily: "'Barlow Condensed','Oswald',sans-serif", fontSize: 24, fontWeight: 800, color: '#fff', lineHeight: 1 }}>{award.player.name}</div><div style={{ fontFamily: "'DM Mono',monospace", fontSize: 8, color: 'rgba(255,255,255,.32)', marginTop: 4 }}>{award.player.nationality} · {styleLabel(award.player)}</div><div style={{ fontFamily: "'Barlow Condensed','Oswald',sans-serif", fontSize: 13, color: 'rgba(255,255,255,.44)', marginTop: 10, lineHeight: 1.45 }}>{award.detail}</div></div>)}
          </div>
        </div>
        <div className="_ey_card" style={{ borderLeft: '3px solid #6FD3FF' }}>
          <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 8, letterSpacing: 4, color: '#6FD3FF', textTransform: 'uppercase', marginBottom: 14 }}>Gala Sub-22</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            {u22Awards.map((award) => <div key={award.kicker} style={{ padding: '14px 14px 16px', background: 'rgba(255,255,255,.03)', border: `1px solid ${award.color}22`, minHeight: 172 }}><div style={{ fontFamily: "'DM Mono',monospace", fontSize: 8, letterSpacing: 2, color: award.color, textTransform: 'uppercase', marginBottom: 10 }}>{award.icon} {award.kicker}</div><div style={{ fontFamily: "'Barlow Condensed','Oswald',sans-serif", fontSize: 24, fontWeight: 800, color: '#fff', lineHeight: 1 }}>{award.player.name}</div><div style={{ fontFamily: "'DM Mono',monospace", fontSize: 8, color: 'rgba(255,255,255,.32)', marginTop: 4 }}>{award.player.age} anos · #{award.player.rankPosition ?? '?'}</div><div style={{ fontFamily: "'Barlow Condensed','Oswald',sans-serif", fontSize: 13, color: 'rgba(255,255,255,.44)', marginTop: 10, lineHeight: 1.45 }}>{award.detail}</div></div>)}
          </div>
        </div>
      </div>

      <div style={{ ...revealStyle(3), display: 'grid', gridTemplateColumns: '1.05fr .95fr', gap: 10 }}>
        <div className="_ey_card" style={{ borderLeft: '3px solid rgba(255,255,255,.22)' }}>
          <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 8, letterSpacing: 4, color: 'rgba(255,255,255,.45)', textTransform: 'uppercase', marginBottom: 14 }}>Legado e Despedidas</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {retirementSpotlight.map((player) => {
              const info = player.retirementInfo ?? {};
              const gs = player._careerGrandSlams ?? player.careerTitles?.gs ?? 0;
              const peak = info.peakRank ?? info.rankAtRetirement ?? player.rankPosition ?? '?';
              const photo = getPlayerPhoto(player);
              return <div key={player.id} style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: 16, alignItems: 'stretch', padding: 10, background: 'rgba(255,255,255,.025)', border: '1px solid rgba(255,255,255,.06)' }}><div style={{ minHeight: 120, position: 'relative', overflow: 'hidden', background: 'linear-gradient(135deg, rgba(255,255,255,.08), rgba(255,255,255,.02))', display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-start', padding: 10 }}>{photo && <img src={photo} alt={player.name} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', objectPosition: 'center center', background: 'rgba(3,6,8,.45)' }} />}{photo && <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(3,6,8,.08), rgba(3,6,8,.58))' }} />}<div style={{ position: 'relative', zIndex: 1, fontFamily: "'DM Mono',monospace", fontSize: 8, color: '#FFD700', letterSpacing: 2, background: 'rgba(0,0,0,.45)', padding: '3px 6px' }}>PICO #{peak}</div></div><div><div style={{ fontFamily: "'Barlow Condensed','Oswald',sans-serif", fontSize: 28, fontWeight: 800, color: '#fff', lineHeight: 1 }}>{player.name}</div><div style={{ fontFamily: "'DM Mono',monospace", fontSize: 8, color: 'rgba(255,255,255,.35)', letterSpacing: 2, marginTop: 4 }}>{player.nationality} · {styleLabel(player)} · {info.age ?? player.age ?? '?'} anos</div><div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', marginTop: 12 }}><div><div style={{ fontFamily: "'DM Mono',monospace", fontSize: 7, color: 'rgba(255,255,255,.25)' }}>GRAND SLAMS</div><div style={{ fontFamily: "'Barlow Condensed','Oswald',sans-serif", fontSize: 22, color: '#F0D07F' }}>{gs}</div></div><div><div style={{ fontFamily: "'DM Mono',monospace", fontSize: 7, color: 'rgba(255,255,255,.25)' }}>TEMPORADAS</div><div style={{ fontFamily: "'Barlow Condensed','Oswald',sans-serif", fontSize: 22, color: '#fff' }}>{info.career?.seasons ?? '—'}</div></div><div><div style={{ fontFamily: "'DM Mono',monospace", fontSize: 7, color: 'rgba(255,255,255,.25)' }}>SAÍDA</div><div style={{ fontFamily: "'Barlow Condensed','Oswald',sans-serif", fontSize: 18, color: 'rgba(255,255,255,.7)' }}>{info.type ?? 'Aposentadoria'}</div></div></div>{info.message && <div style={{ fontFamily: "'Barlow Condensed','Oswald',sans-serif", fontSize: 14, color: 'rgba(255,255,255,.42)', lineHeight: 1.5, marginTop: 10 }}>{info.message}</div>}</div></div>;
            })}
          </div>
        </div>
        <div className="_ey_card" style={{ borderLeft: '3px solid #A57BFF' }}>
          <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 8, letterSpacing: 4, color: '#A57BFF', textTransform: 'uppercase', marginBottom: 14 }}>Palco dos Campeões</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {headlineChampions.map((entry, idx) => {
              const cat = CAT_META[entry.tournament.category] ?? { color: '#888', icon: '•', label: entry.tournament.category, short: entry.tournament.category };
              return <div key={`${entry.tournament.id}-${idx}`} style={{ display: 'grid', gridTemplateColumns: '70px 1fr auto', gap: 12, alignItems: 'center', padding: '10px 12px', background: 'rgba(255,255,255,.028)', border: '1px solid rgba(255,255,255,.05)' }}><div style={{ fontFamily: "'DM Mono',monospace", fontSize: 8, color: cat.color, letterSpacing: 2, textTransform: 'uppercase' }}>{cat.short}</div><div><div style={{ fontFamily: "'Barlow Condensed','Oswald',sans-serif", fontSize: 18, fontWeight: 800, color: '#fff' }}>{entry.champion.name}</div><div style={{ fontFamily: "'DM Mono',monospace", fontSize: 8, color: 'rgba(255,255,255,.28)' }}>{entry.tournament.name}</div></div><div style={{ fontFamily: "'Barlow Condensed','Oswald',sans-serif", fontSize: 16, color: cat.color }}>{cat.icon}</div></div>;
            })}
          </div>
        </div>
      </div>

      <div style={{ ...revealStyle(4) }} className="_ey_card">
        <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 8, letterSpacing: 4, color: '#52C46A', textTransform: 'uppercase', marginBottom: 16 }}>Jogadores para Ficar de Olho em {nextYear}</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
          {watchList.map((player) => {
            const photo = getPlayerPhoto(player);
            const strengths = getStrengths(player, 3);
            const ovr = playerOvr(player);
            const grade = ovrTier(ovr);
            return <div key={player.id} style={{ background: 'rgba(255,255,255,.022)', border: '1px solid rgba(255,255,255,.06)', overflow: 'hidden' }}><div style={{ height: 188, position: 'relative', background: 'linear-gradient(135deg, rgba(111,211,255,.14), rgba(255,255,255,.02))' }}>{photo && <img src={photo} alt={player.name} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', objectPosition: 'center center', background: 'rgba(2,4,10,.5)' }} />}{photo && <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(2,4,10,.08), rgba(2,4,10,.72))' }} />}<div style={{ position: 'absolute', top: 10, left: 10, fontFamily: "'DM Mono',monospace", fontSize: 7, color: '#fff', letterSpacing: 2, background: 'rgba(0,0,0,.45)', padding: '3px 6px' }}>#{player.rankPosition ?? 'NEW'}</div><div style={{ position: 'absolute', right: 10, bottom: 10, fontFamily: "'Barlow Condensed','Oswald',sans-serif", fontSize: 34, fontWeight: 900, color: grade.color, textShadow: '0 0 20px rgba(0,0,0,.35)' }}>{grade.grade}</div></div><div style={{ padding: '12px 12px 14px' }}><div style={{ fontFamily: "'Barlow Condensed','Oswald',sans-serif", fontSize: 24, fontWeight: 800, color: '#fff', lineHeight: 1 }}>{player.name}</div><div style={{ fontFamily: "'DM Mono',monospace", fontSize: 8, color: 'rgba(255,255,255,.32)', letterSpacing: 1.5, marginTop: 4 }}>{player.nationality} · {player.age} anos · {styleLabel(player)}</div><div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>{strengths.map((s) => <span key={s} className="_ey_pill" style={{ color: '#CBE7FF', borderColor: 'rgba(111,211,255,.22)' }}>{s}</span>)}</div><div style={{ fontFamily: "'Barlow Condensed','Oswald',sans-serif", fontSize: 13, color: 'rgba(255,255,255,.46)', lineHeight: 1.45, marginTop: 10 }}>{scoutSummary(player)}</div><div style={{ fontFamily: "'DM Mono',monospace", fontSize: 8, color: '#7FDBB6', letterSpacing: 1.5, marginTop: 10, textTransform: 'uppercase' }}>Imprensa: {potentialNarrative(player)}</div></div></div>;
          })}
        </div>
      </div>

      <div style={{ ...revealStyle(5) }} className="_ey_card">
        <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 8, letterSpacing: 4, color: 'rgba(255,255,255,.45)', textTransform: 'uppercase', marginBottom: 10 }}>Último chamado</div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 18, flexWrap: 'wrap' }}>
          <div><div style={{ fontFamily: "'Barlow Condensed','Oswald',sans-serif", fontSize: 30, fontWeight: 900, color: '#fff', lineHeight: 1 }}>O palco apaga. A temporada {nextYear} está pronta.</div><div style={{ fontFamily: "'Barlow Condensed','Oswald',sans-serif", fontSize: 15, color: 'rgba(255,255,255,.42)', marginTop: 8, lineHeight: 1.45 }}>Os premiados já foram coroados. Agora é hora de descobrir quem sustenta o status, quem explode e quem toma o circuito de assalto.</div></div>
          <button onClick={onDismiss} style={{ background: 'linear-gradient(135deg, rgba(255,215,0,.18), rgba(255,215,0,.08))', border: '1px solid rgba(255,215,0,.32)', color: '#FFD700', cursor: 'pointer', fontFamily: "'Barlow Condensed','Oswald',sans-serif", fontSize: 14, fontWeight: 800, letterSpacing: 3, textTransform: 'uppercase', padding: '12px 20px' }}>Começar {nextYear}</button>
        </div>
      </div>
    </div>
  );
}

function YearSummaryModal({ summary, onDismiss, allPlayers }) {
  React.useEffect(() => { _ey_injectCSS(); }, []);
  const [tab, setTab] = React.useState('gala');
  if (!summary) return null;

  const { year } = summary;
  const nextYear = year + 1;
  const isGalaTab = tab === 'gala';

  const TABS = [
    { id: 'gala',       label: 'Gala',       icon: '✦' },
    { id: 'temporada',  label: 'Temporada',  icon: '✦' },
    { id: 'premiacoes', label: 'Premiações',  icon: '🏆' },
    { id: 'campeoes',   label: 'Campeões',    icon: '⭐' },
    { id: 'aposentados',label: 'Aposentados', icon: '🎾' },
    { id: 'novidades',  label: 'Novidades',   icon: '🌱' },
    { id: 'revelacoes', label: 'Talent Hunter', icon: '🔭' },
    { id: 'lesoes',     label: 'Lesões',      icon: '🩹' },
    { id: 'ratings',    label: 'Ratings',     icon: '📊' },
  ];

  return (
    <div className="_ey_overlay" style={{ zIndex: 9999 }}>
      <EyStars />

      {/* Main panel */}
      <div style={{
        position: 'relative', zIndex: 1,
        width: '100%', height: '100%',
        display: 'flex', flexDirection: 'column',
        background: 'linear-gradient(180deg, #02040A 0%, #05090F 100%)',
      }}>

        {/* ── CINEMATIC HEADER ── */}
        <div style={{
          flexShrink: 0, position: 'relative', overflow: 'hidden',
          background: 'linear-gradient(135deg, #050B14 0%, #02040A 60%)',
          borderBottom: '1px solid rgba(255,215,0,.12)',
          padding: '20px 32px 16px',
        }}>
          {/* Gold accent line */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, #FFD700, #FFD70066, transparent)' }} />

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 8, letterSpacing: 6, color: 'rgba(255,215,0,.5)', textTransform: 'uppercase', marginBottom: 6 }}>
                {isGalaTab ? 'Night Of Tennis' : 'Encerramento Oficial da Temporada'}
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 16 }}>
                <div style={{
                  fontFamily: "'Barlow Condensed','Oswald',sans-serif",
                  fontSize: 'clamp(36px,5vw,56px)', fontWeight: 900,
                  color: '#FFD700', lineHeight: .9, letterSpacing: -1,
                  textShadow: '0 0 30px rgba(255,215,0,.25)',
                }}>
                  {isGalaTab ? `GALA ${year}` : `TEMPORADA ${year}`}
                </div>
                <div style={{
                  fontFamily: "'DM Mono',monospace", fontSize: 10, letterSpacing: 3,
                  color: 'rgba(255,255,255,.2)', alignSelf: 'flex-end', paddingBottom: 4,
                }}>
                  {isGalaTab ? 'AWARDS' : 'FIM'}
                </div>
              </div>
            </div>
            <button onClick={onDismiss} style={{
              background: 'linear-gradient(135deg, rgba(255,215,0,.15), rgba(255,215,0,.08))',
              border: '1px solid rgba(255,215,0,.3)',
              color: '#FFD700', cursor: 'pointer',
              fontFamily: "'Barlow Condensed','Oswald',sans-serif",
              fontSize: 14, fontWeight: 700, letterSpacing: 4, textTransform: 'uppercase',
              padding: '12px 28px', transition: 'all .2s',
            }}
              onMouseEnter={e => { e.target.style.background = 'rgba(255,215,0,.25)'; }}
              onMouseLeave={e => { e.target.style.background = 'linear-gradient(135deg, rgba(255,215,0,.15), rgba(255,215,0,.08))'; }}
            >
              Iniciar {nextYear} →
            </button>
          </div>
        </div>

        {/* ── TAB BAR ── */}
        <div style={{
          flexShrink: 0, display: 'flex',
          background: '#030608',
          borderBottom: '1px solid rgba(255,255,255,.06)',
        }}>
          {TABS.map(t => (
            <button key={t.id} className={`_ey_tab_btn${tab === t.id ? ' active' : ''}`}
              onClick={() => setTab(t.id)}
              style={{ color: tab === t.id ? '#FFD700' : 'rgba(255,255,255,.3)' }}
            >
              <span style={{ marginRight: 5 }}>{t.icon}</span>{t.label}
            </button>
          ))}
        </div>

        {/* ── SCROLLABLE CONTENT ── */}
        <div style={{ flex: 1, overflowY: 'auto', scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,215,0,.2) transparent' }}>
          {tab === 'gala'        && <TabGala        summary={summary} allPlayers={allPlayers} onDismiss={onDismiss} />}
          {tab === 'temporada'   && <TabTemporada   summary={summary} />}
          {tab === 'premiacoes'  && <TabPremiacoes  summary={summary} />}
          {tab === 'campeoes'    && <TabCampeoes    summary={summary} />}
          {tab === 'aposentados' && <TabAposentados summary={summary} />}
          {tab === 'novidades'   && <TabNovidades   summary={summary} />}
          {tab === 'revelacoes'  && <TabRevelacoes  summary={summary} allPlayers={allPlayers} />}
          {tab === 'lesoes'      && <TabLesoes      summary={summary} />}
          {tab === 'ratings'     && <TabRatings     allPlayers={allPlayers} />}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════════

import BroadcastUniverse from './BroadcastUniverse.jsx';
import HeadlessOverlay from './HeadlessOverlay.jsx';

// ═══════════════════════════════════════════════════════════════════
// TOURNAMENT CEREMONY — cerimônia pós-final
// Props: tournament, bracket, state, onClose
// ═══════════════════════════════════════════════════════════════════

const _CER_CSS = `
@keyframes _cer_fadein  { from{opacity:0}to{opacity:1} }
@keyframes _cer_rise    { from{opacity:0;transform:translateY(28px)}to{opacity:1;transform:translateY(0)} }
@keyframes _cer_zoom    { from{opacity:0;transform:scale(.9)}to{opacity:1;transform:scale(1)} }
@keyframes _cer_trophy  { 0%,100%{transform:translateY(0) rotate(-3deg)}50%{transform:translateY(-10px) rotate(3deg)} }
@keyframes _cer_glow    { 0%,100%{filter:drop-shadow(0 0 12px var(--cer-sc))}50%{filter:drop-shadow(0 0 28px var(--cer-sc))} }
@keyframes _cer_confetti{ 0%{transform:translateY(-10px) rotate(0deg);opacity:1}100%{transform:translateY(110vh) rotate(600deg);opacity:0} }
@keyframes _cer_score_pop{ 0%{transform:scale(1.6);opacity:0}60%{transform:scale(.95)}100%{transform:scale(1);opacity:1} }
@keyframes _cer_scan    { 0%{background-position:0 0}100%{background-position:0 100%} }

._cer_overlay{
  position:fixed;inset:0;z-index:9999;
  background:rgba(0,0,0,.94) url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='4' height='4'%3E%3Crect width='1' height='1' fill='rgba(255,255,255,.015)'/%3E%3C/svg%3E");
  display:flex;align-items:center;justify-content:center;
  animation:_cer_fadein .35s ease;overflow:hidden;
}
._cer_panel{
  position:relative;width:min(97vw,1100px);max-height:94vh;
  background:linear-gradient(160deg,#0d110d,#090c09);
  border:1px solid rgba(255,255,255,.08);
  outline:1px solid rgba(255,255,255,.03);
  outline-offset:4px;
  display:flex;flex-direction:column;overflow:hidden;
  animation:_cer_zoom .45s cubic-bezier(.16,1,.3,1);
}
._cer_confetti_piece{
  position:absolute;top:-16px;pointer-events:none;border-radius:2px;
  animation:_cer_confetti linear infinite;
}
._cer_photo_winner{
  width:clamp(110px,14vw,160px);height:clamp(110px,14vw,160px);
  border-radius:50%;overflow:hidden;flex-shrink:0;
  border:3px solid var(--cer-sc);
  animation:_cer_glow 3s ease-in-out infinite;
}
._cer_photo_runner{
  width:clamp(72px,9vw,100px);height:clamp(72px,9vw,100px);
  border-radius:50%;overflow:hidden;flex-shrink:0;
  border:2px solid rgba(255,255,255,.18);
  filter:grayscale(.4);
}
._cer_set_w{
  display:flex;align-items:center;justify-content:center;
  width:42px;height:42px;
  font-family:'Barlow Condensed',sans-serif;font-weight:800;font-size:24px;
  animation:_cer_score_pop .4s cubic-bezier(.16,1,.3,1) backwards;
}
._cer_set_l{
  display:flex;align-items:center;justify-content:center;
  width:42px;height:42px;
  font-family:'Barlow Condensed',sans-serif;font-weight:700;font-size:20px;
  color:rgba(255,255,255,.3);
}
._cer_tab{
  font-family:'Space Mono',monospace;font-size:8px;letter-spacing:.4em;
  text-transform:uppercase;padding:9px 20px;border:none;cursor:pointer;
  transition:all .15s;background:transparent;
  border-bottom:2px solid transparent;
}
._cer_tab.active{border-bottom-color:var(--cer-sc);color:var(--cer-sc);}
._cer_tab:not(.active){color:rgba(255,255,255,.32);}
._cer_fact{
  padding:14px 18px;
  border-left:2px solid var(--cer-sc);
  background:rgba(255,255,255,.02);
  animation:_cer_rise .4s ease backwards;
  font-family:'Crimson Pro',Georgia,serif;font-size:14px;line-height:1.75;
  color:rgba(242,237,228,.78);
}
._cer_stat_card{
  padding:14px 16px;background:rgba(255,255,255,.03);
  border:1px solid rgba(255,255,255,.06);
}
._cer_btn_close{
  position:absolute;top:12px;right:14px;z-index:20;
  background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);
  color:rgba(255,255,255,.45);cursor:pointer;width:30px;height:30px;
  display:flex;align-items:center;justify-content:center;
  font-size:14px;transition:all .15s;
}
._cer_btn_close:hover{background:rgba(255,255,255,.14);color:#fff;}
._cer_section_hd{
  font-family:'Space Mono',monospace;font-size:7px;letter-spacing:.5em;
  text-transform:uppercase;color:rgba(255,255,255,.28);margin-bottom:12px;
}
`;

function _cerInjectCSS() {
  if (document.getElementById('_cer_css_v2')) return;
  const s = document.createElement('style');
  s.id = '_cer_css_v2'; s.textContent = _CER_CSS;
  document.head.appendChild(s);
}

function _CerSemiPlayerRow({ p }) {
  const photo = getPlayerPhoto(p);
  const [photoOk, setPhotoOk] = React.useState(!!photo);
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '7px 10px', marginBottom: 5,
      background: 'rgba(255,255,255,.02)',
      border: '1px solid rgba(255,255,255,.05)',
    }}>
      <div style={{
        width: 28, height: 28, borderRadius: '50%', overflow: 'hidden',
        flexShrink: 0, background: p?.color ? `${p.color}22` : '#151915',
        border: '1px solid rgba(255,255,255,.1)',
      }}>
        {photo && photoOk
          ? <img src={photo} onError={() => setPhotoOk(false)}
              style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }} />
          : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontFamily: "'Bebas Neue',sans-serif", color: 'rgba(255,255,255,.5)' }}>
              {p?.name?.charAt(0)}
            </div>
        }
      </div>
      <div>
        <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 600, fontSize: 12, color: 'rgba(255,255,255,.4)', textTransform: 'uppercase', lineHeight: 1 }}>
          {p?.name?.split(' ').slice(-1)[0]}
        </div>
        <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 7, color: 'rgba(255,255,255,.2)' }}>
          {p?.nationality}
        </div>
      </div>
    </div>
  );
}

// Confetti
function _CerConfetti({ sc }) {
  const pieces = React.useMemo(() => {
    const cols = [sc, '#FFD700', '#fff', '#FF6B35', '#00FF88', sc + 'bb'];
    return Array.from({ length: 36 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 4,
      dur: Math.random() * 3 + 3,
      size: Math.random() * 7 + 3,
      color: cols[Math.floor(Math.random() * cols.length)],
      rot: Math.random() * 360,
    }));
  }, [sc]);
  return (
    <>
      {pieces.map(p => (
        <div key={p.id} className="_cer_confetti_piece" style={{
          left: `${p.left}%`,
          width: p.size, height: p.size * (Math.random() > .5 ? 1 : 2.5),
          background: p.color,
          animationDuration: `${p.dur}s`,
          animationDelay: `${p.delay}s`,
          transform: `rotate(${p.rot}deg)`,
        }} />
      ))}
    </>
  );
}

// Photo with fallback
function _CerPhoto({ player, winner, sc }) {
  const photo = getPlayerPhoto(player);
  const [ok, setOk] = React.useState(!!photo);
  const initials = player?.name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() ?? '?';
  const cls = winner ? '_cer_photo_winner' : '_cer_photo_runner';
  const inner = photo && ok
    ? <img src={photo} alt={player?.name} onError={() => setOk(false)}
        style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center' }} />
    : <div style={{
        width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: player?.color ? `${player.color}28` : '#192019',
        fontFamily: "'Bebas Neue',sans-serif", fontSize: winner ? 52 : 36,
        fontWeight: 700, color: 'rgba(255,255,255,.7)',
      }}>{initials}</div>;
  return <div className={cls} style={winner ? { '--cer-sc': sc } : {}}>{inner}</div>;
}

// Surface config
function _cerSurface(courtKey) {
  const MAP = {
    US_OPEN:       { label: 'Quadra Dura',  icon: '🏙️', color: '#1565C0', key: 'HARD'   },
    ROLAND_GARROS: { label: 'Saibro',       icon: '🏺',  color: '#C4572A', key: 'CLAY'   },
    WIMBLEDON:     { label: 'Grama',         icon: '🌿',  color: '#2E7D32', key: 'GRASS'  },
    O2_ARENA:      { label: 'Indoor',        icon: '🏟️', color: '#6A1B9A', key: 'INDOOR' },
  };
  return MAP[courtKey] ?? MAP.US_OPEN;
}

// Generate procedural fun facts
function _cerFacts(tournament, champion, runner, finalMatch, bracket) {
  if (!champion) return [];
  const facts = [];
  const seed = champion.name ?? 'x';
  const sd = finalMatch?.result?.setsDetail ?? [];
  const ct = champion.careerTitles ?? {};
  const champOvr = overallRating(champion.attrs ?? {});
  const runnerOvr = runner ? overallRating(runner.attrs ?? {}) : 0;
  const champIsA = finalMatch?.winner?.id === finalMatch?.playerA?.id;
  const style = PLAY_STYLES[champion.styleId];
  const rounds = bracket?.rounds ?? [];

  // Duração da final
  if (sd.length >= 3) {
    const totalGames = sd.reduce((s, [a, b]) => s + a + b, 0);
    const sets = sd.length;
    const maxSets = tournament.bestOf === 5 ? 5 : 3;
    if (sets === maxSets) {
      facts.push(`🔥 Final épica! ${sets} sets e ${totalGames} games — batalha máxima de um lado ao outro da quadra.`);
    } else {
      facts.push(`⚡ ${champion.name.split(' ')[0]} dominou em ${sets} sets com ${totalGames} games — eficiência impecável.`);
    }
  } else if (sd.length === 2) {
    const totalGames = sd.reduce((s, [a, b]) => s + a + b, 0);
    facts.push(`💨 Final resolvida em 2 sets. ${champion.name.split(' ')[0]} foi implacável — ${totalGames} games no total.`);
  }

  // Set heroico
  const bigSet = sd.find(([a, b]) => a + b >= 18);
  if (bigSet) {
    facts.push(`🎭 O set ${bigSet[0]}–${bigSet[1]} foi um dos mais tensos — desgaste físico e mental no limite.`);
  }

  // OVR upside-down
  if (runner && runnerOvr > champOvr + 3) {
    facts.push(`📈 A zebra aconteceu! ${champion.name.split(' ')[0]} (${ovrTier(champOvr).grade}) derrubou o favorito ${runner.name.split(' ')[0]} (${ovrTier(runnerOvr).grade}).`);
  } else if (runner && champOvr > runnerOvr + 5) {
    facts.push(`👑 Favorito confirmado. ${champion.name.split(' ')[0]} (${ovrTier(champOvr).grade}) mostrou porque é o melhor.`);
  }

  // Títulos
  if (tournament.isOlympic) {
    const oly = ct.olympic ?? {};
    const golds = oly.gold ?? 1;
    if (golds === 1) facts.push(`🥇 OURO OLÍMPICO! ${champion.name.split(' ')[0]} escreve história — medalha que vai além do ranking.`);
    else facts.push(`🥇🥇 ${golds}º ouro olímpico de ${champion.name.split(' ')[0]} — um legado que ultrapassa qualquer circuito.`);
  } else if (tournament.isSlam) {
    const gs = ct.gs ?? 0;
    if (gs === 1) facts.push(`⭐ PRIMEIRO Grand Slam de ${champion.name.split(' ')[0]}. A carreira nunca mais será a mesma.`);
    else if (gs === 2) facts.push(`⭐⭐ Dois Grand Slams — ${champion.name.split(' ')[0]} já pertence à história do tênis.`);
    else if (gs >= 5) facts.push(`⭐ ${gs} Grand Slams — lenda viva em ação. ${champion.name.split(' ')[0]} é de outro planeta.`);
    else facts.push(`⭐ ${gs}º Grand Slam de ${champion.name.split(' ')[0]} — a coleção cresce.`);
  } else if (tournament.isMasters) {
    const m = ct.masters ?? 0;
    if (m === 1) facts.push(`🏆 Primeiro Masters 1000! ${champion.name.split(' ')[0]} chega ao topo do circuito.`);
    else facts.push(`🏆 ${m}º Masters 1000 — consistência de campeão.`);
  }

  // Estilo de jogo
  if (style) {
    const styleDescs = {
      AGG_BASELINER: 'pressão constante do fundo transformada em troféu',
      CTR_PUNCHER: 'contra-ataques letais que destruíram o adversário',
      ALL_COURT: 'versatilidade completa em cada momento decisivo',
      SRV_VOL: 'saque devastador e voleios de alta cirurgia',
      BIG_SERVER: 'saque dominador como arma definitiva',
      RETRIEVER: 'defesa inabalável até criar o ponto decisivo',
      TAKEALLRISK: 'tênis explosivo com risco máximo — e recompensa máxima',
      GRINDER: 'paciência infinita, consistência letal',
      PWR_BASE: 'bolas planas de velocidade assassina',
      TACT_TEC: 'inteligência tática como principal arma',
      NET_SPEC: 'domínio absoluto da rede',
      ADPT_TAC: 'leitura do jogo e adaptação constante',
    };
    const d = styleDescs[champion.styleId];
    if (d) facts.push(`🎯 A fórmula do título: ${d}.`);
  }

  // Partidas jogadas
  const champWins = rounds.reduce((acc, rnd) =>
    acc + rnd.filter(m => m.winner?.id === champion.id && !m.isBye).length, 0);
  if (champWins > 0) {
    facts.push(`📊 ${champion.name.split(' ')[0]} venceu ${champWins} partidas nesta campanha — sem conceder derrota.`);
  }

  // Runner-up
  if (runner) {
    facts.push(`🥈 ${runner.name.split(' ')[0]} chegou longe — a final foi um duelo de estilos diferentes e altíssimo nível.`);
  }

  return facts.slice(0, 5);
}

// ─────────────────────────────────────────────────────────────────
// JOURNALIST REPORT — cobertura narrativa do torneio
// ─────────────────────────────────────────────────────────────────

function _jPick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function _jFmtScore(setsDetail, winnerIsA) {
  if (!setsDetail?.length) return '';
  return setsDetail.map(([a, b]) => winnerIsA ? `${a}–${b}` : `${b}–${a}`).join(' ');
}

function _jTotalGames(setsDetail) {
  return (setsDetail ?? []).reduce((s, [a, b]) => s + a + b, 0);
}

function _jHasTiebreak(setsDetail) {
  return (setsDetail ?? []).some(([a, b]) => (a === 7 && b === 6) || (a === 6 && b === 7));
}

function _jRoundName(fromEnd) {
  if (fromEnd === 0) return 'Final';
  if (fromEnd === 1) return 'Semifinal';
  if (fromEnd === 2) return 'Quartas de Final';
  if (fromEnd === 3) return 'Oitavas';
  return `Rodada ${fromEnd + 1}`;
}

function _buildJournalistReport(tournament, bracket, state) {
  const rounds     = bracket?.rounds ?? [];
  const champion   = bracket?.champion;
  if (!champion || !rounds.length) return null;

  const totalRounds = rounds.length;
  const isGS       = tournament?.isSlam;
  const isMasters  = tournament?.isMasters;
  const year       = state?.year ?? '';
  const tourName   = tournament?.name ?? 'Torneio';
  const surface    = tournament?.surface ?? 'HARD';

  // ── Coleta todos os jogadores e partidas ─────────────────────────
  const allPlayers = new Map();
  const allMatches = []; // { match, roundIdx, fromEnd }
  rounds.forEach((rnd, ri) => {
    const fromEnd = totalRounds - 1 - ri;
    rnd.forEach(m => {
      if (m.isBye) return;
      if (m.playerA) allPlayers.set(m.playerA.id, m.playerA);
      if (m.playerB) allPlayers.set(m.playerB.id, m.playerB);
      if (m.winner && m.playerA && m.playerB) {
        allMatches.push({ match: m, roundIdx: ri, fromEnd });
      }
    });
  });

  const champOvr = overallRating(champion.attrs ?? {});

  // ── Favorito (maior OVR no draw) ─────────────────────────────────
  let favorite = null;
  let favoriteOvr = 0;
  for (const [, p] of allPlayers) {
    const o = overallRating(p.attrs ?? {});
    if (o > favoriteOvr) { favoriteOvr = o; favorite = p; }
  }
  const favIsChamp = favorite?.id === champion.id;

  // ── Quando o favorito caiu (se não ganhou) ────────────────────────
  let favEliminatedBy = null, favEliminatedRound = null;
  if (!favIsChamp && favorite) {
    for (const { match, fromEnd } of allMatches) {
      const loser = match.winner?.id === match.playerA?.id ? match.playerB : match.playerA;
      if (loser?.id === favorite.id) {
        favEliminatedBy = match.winner;
        favEliminatedRound = fromEnd;
        break;
      }
    }
  }

  // ── Caminho do campeão ────────────────────────────────────────────
  const champPath = allMatches
    .filter(({ match }) => match.winner?.id === champion.id)
    .sort((a, b) => a.roundIdx - b.roundIdx)
    .map(({ match, fromEnd }) => {
      const opp    = match.playerA?.id === champion.id ? match.playerB : match.playerA;
      const isA    = match.playerA?.id === champion.id;
      const sd     = match.result?.setsDetail ?? [];
      const score  = _jFmtScore(sd, isA);
      const oppOvr = opp ? overallRating(opp.attrs ?? {}) : 0;
      const totalG = _jTotalGames(sd);
      const sets   = sd.length;
      const hasTB  = _jHasTiebreak(sd);
      return { opp, score, oppOvr, totalG, sets, hasTB, roundName: _jRoundName(fromEnd), fromEnd };
    });

  // ── Maior zebra ───────────────────────────────────────────────────
  let bigUpset = null, bigUpsetDiff = 0;
  for (const { match, fromEnd } of allMatches) {
    const w = match.winner;
    const l = match.playerA?.id === w?.id ? match.playerB : match.playerA;
    if (!w || !l) continue;
    const diff = overallRating(l.attrs ?? {}) - overallRating(w?.attrs ?? {});
    if (diff > bigUpsetDiff) {
      bigUpsetDiff = diff;
      const sd   = match.result?.setsDetail ?? [];
      const isA  = match.playerA?.id === w.id;
      bigUpset = { winner: w, loser: l, diff, score: _jFmtScore(sd, isA), roundName: _jRoundName(fromEnd) };
    }
  }

  // ── Partida mais épica (mais games totais + tiebreaks) ────────────
  let epicMatch = null, epicScore = 0;
  for (const { match, fromEnd } of allMatches) {
    const sd    = match.result?.setsDetail ?? [];
    const total = _jTotalGames(sd);
    const tbs   = sd.filter(([a, b]) => (a === 7 && b === 6) || (a === 6 && b === 7)).length;
    const score = total + tbs * 8 + (sd.length >= 3 ? 15 : 0);
    if (score > epicScore) {
      epicScore = score;
      const w   = match.winner;
      const l   = match.playerA?.id === w?.id ? match.playerB : match.playerA;
      const isA = match.playerA?.id === w?.id;
      epicMatch = { winner: w, loser: l, score: _jFmtScore(sd, isA), total, tbs, sets: sd.length, roundName: _jRoundName(fromEnd), sd };
    }
  }

  // ── Partida mais dominante (menor games do perdedor por set) ──────
  let dominantMatch = null, dominantScore = 999;
  for (const { match, fromEnd } of allMatches) {
    const sd = match.result?.setsDetail ?? [];
    if (sd.length < 2) continue;
    const w   = match.winner;
    const l   = match.playerA?.id === w?.id ? match.playerB : match.playerA;
    const isA = match.playerA?.id === w?.id;
    const loserGames = sd.reduce((s, [a, b]) => s + (isA ? b : a), 0);
    if (loserGames < dominantScore) {
      dominantScore = loserGames;
      dominantMatch = { winner: w, loser: l, score: _jFmtScore(sd, isA), loserGames, roundName: _jRoundName(fromEnd) };
    }
  }

  // ── Prospect (mais jovem a chegar longe) ─────────────────────────
  const U23_CUTOFF = 23;
  let prospect = null, prospectDeepness = -1;
  for (const { match, fromEnd } of allMatches) {
    // procura perdedores jovens que chegaram longe
    const w = match.winner;
    const l = match.playerA?.id === w?.id ? match.playerB : match.playerA;
    for (const p of [w, l]) {
      if (!p || p.id === champion.id) continue;
      const age = p.age ?? 99;
      if (age > U23_CUTOFF) continue;
      const depth = totalRounds - 1 - match.roundIdx; // quanto mais perto da final, maior
      // "fromEnd" menor = mais próximo da final
      const deepness = (totalRounds - 1) - fromEnd + (w?.id === p.id ? 0.5 : 0);
      if (deepness > prospectDeepness) {
        prospectDeepness = deepness;
        const deepRound = w?.id === p.id
          ? allMatches.filter(({ match: m }) => m.winner?.id === p.id).length
          : null;
        prospect = {
          player: p,
          age,
          exitRound: w?.id === p.id ? null : _jRoundName(fromEnd),
          deepestRound: _jRoundName(fromEnd),
          wasWinner: w?.id === p.id,
        };
      }
    }
  }

  // ── Decepção (top-3 OVR que saiu antes das semis) ────────────────
  let disappointment = null;
  const topPlayers = [...allPlayers.values()]
    .filter(p => p.id !== champion.id)
    .sort((a, b) => overallRating(b.attrs ?? {}) - overallRating(a.attrs ?? {}))
    .slice(0, 4);

  for (const p of topPlayers) {
    const exitInfo = allMatches.find(({ match, fromEnd }) => {
      const l = match.playerA?.id === match.winner?.id ? match.playerB : match.playerA;
      return l?.id === p.id && fromEnd >= 2; // saiu antes das semis
    });
    if (exitInfo) {
      const elimBy = exitInfo.match.winner;
      disappointment = { player: p, ovr: overallRating(p.attrs ?? {}), eliminatedBy: elimBy, round: _jRoundName(exitInfo.fromEnd) };
      break;
    }
  }

  return {
    champion, champOvr, champPath,
    favorite, favoriteOvr, favIsChamp, favEliminatedBy, favEliminatedRound,
    bigUpset, bigUpsetDiff,
    epicMatch, dominantMatch,
    prospect,
    disappointment,
    tourName, isGS, isMasters, year, surface,
  };
}

function _JournalistReport({ report, sc }) {
  const T = {
    disp: "'Barlow Condensed',sans-serif",
    mono: "'Space Mono',monospace",
    serif: "'Crimson Pro',Georgia,serif",
  };

  if (!report) return (
    <div style={{ padding: '40px 32px', color: 'rgba(255,255,255,.3)', fontFamily: T.serif, fontSize: 16, textAlign: 'center' }}>
      Dados insuficientes para gerar a cobertura.
    </div>
  );

  const {
    champion, champOvr, champPath,
    favorite, favoriteOvr, favIsChamp, favEliminatedBy, favEliminatedRound,
    bigUpset, bigUpsetDiff,
    epicMatch, dominantMatch,
    prospect, disappointment,
    tourName, isGS, isMasters, year,
  } = report;

  const fn  = n => n?.split(' ').pop() ?? n ?? '—'; // sobrenome
  const ffn = n => n ?? '—'; // nome completo

  // ── Bloco de seção do jornalista ─────────────────────────────────
  function Section({ icon, title, delay = 0, children }) {
    return (
      <div style={{
        marginBottom: 28,
        animation: `_cer_rise .45s ease ${delay}s backwards`,
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12,
          borderBottom: `1px solid ${sc}22`, paddingBottom: 8,
        }}>
          <span style={{ fontSize: 16 }}>{icon}</span>
          <span style={{
            fontFamily: T.mono, fontSize: 8, letterSpacing: '.4em',
            color: sc, textTransform: 'uppercase',
          }}>{title}</span>
        </div>
        <div style={{
          fontFamily: T.serif, fontSize: 15.5, lineHeight: 1.82,
          color: 'rgba(242,237,228,.82)',
        }}>
          {children}
        </div>
      </div>
    );
  }

  // ── Helpers de texto ─────────────────────────────────────────────
  function P({ children, style }) {
    return <p style={{ margin: '0 0 10px 0', ...style }}>{children}</p>;
  }

  function Highlight({ children }) {
    return <strong style={{ color: '#fff', fontWeight: 700 }}>{children}</strong>;
  }

  function Score({ children }) {
    return <span style={{
      fontFamily: T.mono, fontSize: 11, color: sc,
      background: `${sc}14`, padding: '1px 7px',
      border: `1px solid ${sc}33`,
      margin: '0 3px',
    }}>{children}</span>;
  }

  // ── Abertura ─────────────────────────────────────────────────────
  const openings = isGS ? [
    `${tourName} de ${year} entrou para a história com ${ffn(champion.name)} erguendo o troféu. Mas o que aconteceu nos dez dias anteriores merece ser contado além do placar.`,
    `Quando a poeira baixou em ${tourName}, o nome gravado no troféu era o de ${ffn(champion.name)}. A jornada para chegar lá foi tudo menos simples.`,
    `${tourName} ${year}. O Grand Slam terminou. ${ffn(champion.name)} é campeão. Esta é a história de como chegamos aqui.`,
  ] : [
    `${tourName} chegou ao fim. ${ffn(champion.name)} é o campeão. Mas o torneio guardou muito mais do que o nome no troféu.`,
    `A semana em ${tourName} acabou do jeito certo para ${ffn(champion.name)}. O caminho até o título, porém, não foi passeio.`,
    `${tourName} de ${year} terminou. Aqui está o que aconteceu — do primeiro ponto até o troféu nas mãos de ${ffn(champion.name)}.`,
  ];

  // ── Caminho do campeão ────────────────────────────────────────────
  let champPathText = null;
  if (champPath.length > 0) {
    const hardest = champPath.reduce((best, r) =>
      (r.totalG + r.sets * 5) > (best.totalG + best.sets * 5) ? r : best, champPath[0]);
    const easiest = champPath.reduce((best, r) =>
      (r.totalG) < (best.totalG) ? r : best, champPath[0]);

    const intro = _jPick([
      `${fn(champion.name)} precisou vencer ${champPath.length} partidas para chegar ao título.`,
      `A campanha de ${fn(champion.name)} durou ${champPath.length} partidas — cada uma com sua própria história.`,
      `Do ${champPath[0]?.roundName ?? 'início'} à Final, ${fn(champion.name)} não perdeu uma partida sequer.`,
    ]);

    const hardestLine = hardest ? _jPick([
      ` O teste mais duro veio na ${hardest.roundName}, contra ${ffn(hardest.opp?.name)} — ${hardest.sets} sets e ${hardest.totalG} games${hardest.hasTB ? ', com tiebreak' : ''}.`,
      ` ${hardest.roundName} foi o ponto de maior atrito: ${ffn(hardest.opp?.name)} levou ${fn(champion.name)} ao limite em ${hardest.sets} sets.`,
    ]) : '';

    const easiestLine = easiest && easiest !== hardest ? _jPick([
      ` Na ${easiest.roundName}, contra ${ffn(easiest.opp?.name)}, a mensagem foi clara: ${easiest.score}.`,
      ` O momento mais claro de domínio foi na ${easiest.roundName} — ${fn(champion.name)} despachou ${ffn(easiest.opp?.name)} por ${easiest.score} sem cerimônia.`,
    ]) : '';

    champPathText = intro + hardestLine + easiestLine;
  }

  // ── Favorito ─────────────────────────────────────────────────────
  let favText = null;
  if (favIsChamp) {
    favText = _jPick([
      `${ffn(champion.name)} entrou em ${tourName} como o favorito (${ovrTier(champOvr).grade}) e confirmou o que o ranking já dizia. Nem sempre o favoritismo encontra essa correspondência — desta vez encontrou.`,
      `O favorito venceu. ${ffn(champion.name)}, ${ovrTier(champOvr).grade}, fez exatamente o que se esperava. Em tênis isso é mais raro do que parece — e merece ser reconhecido.`,
      `Quando o favorito ganha, fica fácil dizer que era previsível. Mas ${ffn(champion.name)} não apenas ganhou — dominou o torneio de ponta a ponta como seu nível ${ovrTier(champOvr).grade} prometia.`,
    ]);
  } else if (favorite && favEliminatedBy) {
    const roundName = favEliminatedRound != null ? _jRoundName(favEliminatedRound) : 'cedo';
    favText = _jPick([
      `${ffn(favorite.name)} chegou a ${tourName} como o favorito do draw (${ovrTier(favoriteOvr).grade}). Não chegou ao troféu. Foi eliminado na ${roundName} por ${ffn(favEliminatedBy?.name)} — uma das viradas mais comentadas do torneio.`,
      `O drama da semana não foi só na Final. ${ffn(favorite.name)}, favorito de nível ${ovrTier(favoriteOvr).grade}, não passou da ${roundName}. ${ffn(favEliminatedBy?.name)} encerrou a campanha antes que ela se tornasse o que todos esperavam.`,
      `Favorito vencedor é notícia; favorito eliminado é história. ${ffn(favorite.name)} (${ovrTier(favoriteOvr).grade}) saiu na ${roundName}, abatido por ${ffn(favEliminatedBy?.name)}. O torneio ficou em aberto a partir daí.`,
    ]);
  }

  // ── Zebra ─────────────────────────────────────────────────────────
  let zebraText = null;
  if (bigUpset && bigUpsetDiff >= 3) {
    const { winner, loser, diff, score, roundName } = bigUpset;
    const wOvr = overallRating(winner.attrs ?? {});
    const lOvr = overallRating(loser.attrs ?? {});
    zebraText = _jPick([
      `A zebra do torneio foi ${ffn(winner.name)} derrubando ${ffn(loser.name)} na ${roundName}. Uma diferença de ${Math.round(diff)} pontos de OVR (${wOvr} vs ${lOvr}) no papel — e nada disso na quadra. Placar: ${score}.`,
      `Se você apostou em ${ffn(loser.name)} na ${roundName}, foi uma aposta que parecia segura. ${ffn(winner.name)} discordou: ${score}. A diferença de OVR era de ${Math.round(diff)} pontos — tudo ignorado em quadra.`,
      `${ffn(winner.name)} não devia vencer ${ffn(loser.name)} na ${roundName}. ${ovrTier(wOvr).grade} contra ${ovrTier(lOvr).grade}. Mas o tênis não lê relatórios de scout. ${score}.`,
    ]);
  }

  // ── Partida épica ────────────────────────────────────────────────
  let epicText = null;
  if (epicMatch) {
    const { winner, loser, score, total, tbs, sets, roundName } = epicMatch;
    const tbLine = tbs > 0 ? ` com ${tbs === 1 ? 'um tiebreak' : `${tbs} tiebreaks`}` : '';
    epicText = _jPick([
      `A partida que o público não vai esquecer foi ${ffn(winner?.name)} vs ${ffn(loser?.name)} na ${roundName}: ${sets} sets${tbLine}, ${total} games no total. Placar final: ${score}. O tipo de confronto que define torneios.`,
      `${roundName}: ${ffn(winner?.name)} e ${ffn(loser?.name)} passaram ${total} games se destruindo${tbLine}. ${score}. Quando acabou, os dois saíram sabendo que tinham participado de algo especial.`,
      `O melhor tênis da semana aconteceu na ${roundName}. ${ffn(winner?.name)} e ${ffn(loser?.name)}, ${sets} sets${tbLine}. ${total} games de altíssimo nível. O placar diz ${score} — mas o placar não conta metade da história.`,
    ]);
  }

  // ── Partida dominante ────────────────────────────────────────────
  let dominantText = null;
  if (dominantMatch && dominantMatch.loserGames <= 4 && dominantMatch.winner?.id !== epicMatch?.winner?.id) {
    const { winner, loser, score, loserGames, roundName } = dominantMatch;
    dominantText = _jPick([
      `O aviso mais claro do torneio veio de ${ffn(winner?.name)}: ${score} sobre ${ffn(loser?.name)} na ${roundName}. Só ${loserGames} games cedidos. Uma lição.`,
      `${ffn(winner?.name)} não quis perder tempo na ${roundName}. ${score} contra ${ffn(loser?.name)}. ${loserGames === 0 ? 'Nenhum game cedido' : `Apenas ${loserGames} games para o adversário`}. Dominância raramente vista neste nível.`,
    ]);
  }

  // ── Prospect ─────────────────────────────────────────────────────
  let prospectText = null;
  if (prospect?.player && prospect.player.id !== champion.id) {
    const p = prospect.player;
    const pStyle = PLAY_STYLES[p.styleId];
    prospectText = _jPick([
      `Entre os jovens do draw, ${ffn(p.name)} (${p.age} anos) foi o nome que ficou. Chegou até a ${prospect.deepestRound} — o suficiente para mostrar que esse nome vai aparecer muito mais vezes nos próximos anos.`,
      `${p.age} anos, ${pStyle ? pStyle.label : 'estilo definido'}. ${ffn(p.name)} não veio para ser figurante — chegou até a ${prospect.deepestRound} e deixou a pergunta no ar: quanto falta para ele estar brigando pelo troféu?`,
      `A promessa do torneio tinha nome: ${ffn(p.name)}, ${p.age} anos. A ${prospect.deepestRound} foi seu teto desta vez. Mas o que mostrou não foi de alguém que veio aprender — foi de alguém que veio competir.`,
    ]);
  }

  // ── Decepção ──────────────────────────────────────────────────────
  let disappointmentText = null;
  if (disappointment && disappointment.player.id !== champion.id && (!favorite || disappointment.player.id !== favorite.id)) {
    const p = disappointment.player;
    disappointmentText = _jPick([
      `A decepção do torneio teve rosto: ${ffn(p.name)} (${ovrTier(disappointment.ovr).grade}), esperado para chegar longe, caiu ainda nas ${disappointment.round} para ${ffn(disappointment.eliminatedBy?.name)}. O tênis raramente respeita reputações.`,
      `${ffn(p.name)} entrou em ${tourName} de nível ${ovrTier(disappointment.ovr).grade} e saiu antes do esperado, eliminado nas ${disappointment.round} por ${ffn(disappointment.eliminatedBy?.name)}. Uma campanha para esquecer depressa.`,
    ]);
  }

  // ── Encerramento ─────────────────────────────────────────────────
  const closings = [
    `${tourName} ${year} acabou. O troféu ficou com ${ffn(champion.name)}. As histórias ficam com todos.`,
    `Fim de ${tourName}. Próxima parada no calendário. Mas ${fn(champion.name)} sai daqui diferente — com um título que não se apaga.`,
    `O circuito segue. Mas antes de mudar de página, vale guardar o que aconteceu aqui: ${ffn(champion.name)}, campeão de ${tourName} ${year}.`,
  ];

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px 32px' }}>

      {/* Byline */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12, marginBottom: 22,
        paddingBottom: 14, borderBottom: `1px solid ${sc}22`,
        animation: '_cer_rise .35s ease backwards',
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: '50%',
          background: `${sc}22`, border: `1px solid ${sc}44`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18, flexShrink: 0,
        }}>✍️</div>
        <div>
          <div style={{ fontFamily: T.mono, fontSize: 9, color: 'rgba(255,255,255,.7)', letterSpacing: '.2em' }}>
            COBERTURA ESPECIAL
          </div>
          <div style={{ fontFamily: T.mono, fontSize: 7, color: 'rgba(255,255,255,.3)', letterSpacing: '.3em', marginTop: 3 }}>
            {tourName.toUpperCase()} · {year} · RELATÓRIO COMPLETO
          </div>
        </div>
      </div>

      {/* Abertura */}
      <div style={{
        fontFamily: T.serif, fontSize: 17, lineHeight: 1.85,
        color: 'rgba(242,237,228,.9)', marginBottom: 28,
        animation: '_cer_rise .4s ease .05s backwards',
      }}>
        <P>{_jPick(openings)}</P>
      </div>

      {/* Seções */}
      {champPathText && (
        <Section icon="🗺️" title="O Caminho do Campeão" delay={0.1}>
          <P>{champPathText}</P>
          {/* linha por rodada */}
          <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 5 }}>
            {champPath.map((r, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '6px 10px',
                background: r.fromEnd === 0 ? `${sc}12` : 'rgba(255,255,255,.025)',
                border: `1px solid ${r.fromEnd === 0 ? sc + '44' : 'rgba(255,255,255,.06)'}`,
                borderLeft: `3px solid ${r.fromEnd === 0 ? sc : 'rgba(255,255,255,.12)'}`,
              }}>
                <span style={{ fontFamily: T.mono, fontSize: 7, color: 'rgba(255,255,255,.3)', letterSpacing: '.2em', minWidth: 90, textTransform: 'uppercase' }}>{r.roundName}</span>
                <span style={{ fontFamily: T.disp, fontSize: 14, color: 'rgba(255,255,255,.8)', fontWeight: 700, textTransform: 'uppercase', flex: 1 }}>
                  {r.opp?.name ?? '—'}
                </span>
                {r.score && (
                  <Score>{r.score}</Score>
                )}
                {r.hasTB && <span style={{ fontSize: 10 }}>⚡</span>}
              </div>
            ))}
          </div>
        </Section>
      )}

      {favText && (
        <Section icon={favIsChamp ? '👑' : '💥'} title={favIsChamp ? 'O Favorito Confirmado' : 'A Queda do Favorito'} delay={0.18}>
          <P>{favText}</P>
        </Section>
      )}

      {zebraText && (
        <Section icon="🐆" title="A Grande Zebra" delay={0.24}>
          <P>{zebraText}</P>
        </Section>
      )}

      {epicText && (
        <Section icon="🔥" title="A Partida da Semana" delay={0.3}>
          <P>{epicText}</P>
        </Section>
      )}

      {dominantText && (
        <Section icon="⚙️" title="Demolição" delay={0.35}>
          <P>{dominantText}</P>
        </Section>
      )}

      {prospectText && (
        <Section icon="🌱" title="A Promessa" delay={0.38}>
          <P>{prospectText}</P>
        </Section>
      )}

      {disappointmentText && (
        <Section icon="📉" title="A Decepção" delay={0.42}>
          <P>{disappointmentText}</P>
        </Section>
      )}

      {/* Closing */}
      <div style={{
        marginTop: 8,
        padding: '16px 20px',
        background: `${sc}0a`,
        border: `1px solid ${sc}22`,
        borderLeft: `3px solid ${sc}`,
        fontFamily: T.serif, fontSize: 15, lineHeight: 1.75,
        color: `${sc}cc`, fontStyle: 'italic',
        animation: '_cer_rise .45s ease .48s backwards',
      }}>
        {_jPick(closings)}
      </div>
    </div>
  );
}

function TournamentCeremony({ tournament, bracket, wrapData: wrapDataProp = null, state, onClose }) {
  _cerInjectCSS();
  const [tab, setTab] = React.useState('recap');
  const [expandedId, setExpandedId] = React.useState(null);

  const sc = _cerSurface(tournament?.courtKey ?? tournament?.surface ?? 'US_OPEN');

  const champion = bracket?.champion ?? null;
  const rounds = bracket?.rounds ?? [];
  const finalRound = rounds[rounds.length - 1] ?? [];
  const finalMatch = finalRound.find(m => m.winner && !m.isBye) ?? null;
  const runner = finalMatch
    ? (finalMatch.playerA?.id === champion?.id ? finalMatch.playerB : finalMatch.playerA)
    : null;
  const sd = finalMatch?.result?.setsDetail ?? [];
  const champIsA = finalMatch?.winner?.id === finalMatch?.playerA?.id;

  const styleChamp = PLAY_STYLES[champion?.styleId];
  const styleRunner = PLAY_STYLES[runner?.styleId];
  const champOvr = champion ? overallRating(champion.attrs ?? {}) : 0;
  const runnerOvr = runner ? overallRating(runner.attrs ?? {}) : 0;
  const ct = champion?.careerTitles ?? {};
  const totalTitles = (ct.gs ?? 0) + (ct.masters ?? 0) + (ct.finals ?? 0) + (ct.atp500 ?? 0) + (ct.atp250 ?? 0);

  const facts = React.useMemo(() =>
    _cerFacts(tournament, champion, runner, finalMatch, bracket),
    [champion?.id, runner?.id]
  );

  // Journalist report — computed once
  const journalistReport = React.useMemo(() =>
    _buildJournalistReport(tournament, bracket, state),
    [champion?.id]
  );

  const isGS = tournament?.isSlam;
  const isMasters = tournament?.isMasters;
  const catLabel = isGS ? 'GRAND SLAM' : isMasters ? 'MASTERS 1000'
    : tournament?.category === 'FINALS' ? 'ATP FINALS'
    : tournament?.category === 'ATP_500' ? 'ATP 500' : 'ATP 250';

  // Total players
  const totalPlayers = new Set(
    rounds.flatMap(r => r.flatMap(m => [m.playerA?.id, m.playerB?.id].filter(Boolean)))
  ).size;

  // Semis losers
  const semiRound = rounds[rounds.length - 2] ?? [];
  const semiLosers = semiRound
    .filter(m => m.winner && !m.isBye)
    .map(m => m.playerA?.id === m.winner?.id ? m.playerB : m.playerA)
    .filter(p => p && p.id !== champion?.id && p.id !== runner?.id)
    .slice(0, 2);

  const CSS_VAR = { '--cer-sc': sc.color };

  return (
    <div className="_cer_overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <_CerConfetti sc={sc.color} />

      <div className="_cer_panel" style={CSS_VAR}>
        <button className="_cer_btn_close" onClick={onClose}>✕</button>

        {/* ── HEADER ── */}
        <div style={{
          padding: '16px 28px 14px',
          background: `linear-gradient(135deg, ${sc.color}1a 0%, transparent 60%)`,
          borderBottom: `1px solid ${sc.color}33`,
          display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0,
        }}>
          <span style={{ fontSize: 28 }}>{tournament?.icon ?? '🏆'}</span>
          <div>
            <div style={{
              fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 900,
              fontSize: 'clamp(18px,2.6vw,26px)', color: '#fff',
              letterSpacing: '.07em', textTransform: 'uppercase', lineHeight: 1,
            }}>{tournament?.name}</div>
            <div style={{ display: 'flex', gap: 8, marginTop: 5, alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{
                fontFamily: "'Space Mono',monospace", fontSize: 7, letterSpacing: '.4em',
                color: sc.color, background: `${sc.color}18`, border: `1px solid ${sc.color}44`,
                padding: '2px 8px', textTransform: 'uppercase',
              }}>{catLabel}</span>
              <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 8, color: 'rgba(255,255,255,.35)', letterSpacing: '.2em' }}>
                {sc.icon} {sc.label}
              </span>
              {tournament?.location && (
                <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 8, color: 'rgba(255,255,255,.25)', letterSpacing: '.15em' }}>
                  📍 {tournament.location}
                </span>
              )}
              <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 8, color: 'rgba(255,255,255,.25)', letterSpacing: '.15em' }}>
                {state?.year}
              </span>
            </div>
          </div>
          <div style={{ flex: 1 }} />
          <div style={{ fontSize: 38, animation: '_cer_trophy 2.5s ease-in-out infinite' }}>🏆</div>
        </div>

        {/* ── TAB BAR ── */}
        <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,.07)', background: 'rgba(0,0,0,.25)', flexShrink: 0 }}>
          {[['recap', '🏆 PÓDIO'], ['stats', '📊 STATS'], ['draw', 'BRACKET'], ['press', '📰 JORNALISMO']].map(([id, label]) => (
            <button key={id} className={`_cer_tab${tab === id ? ' active' : ''}`}
              onClick={() => setTab(id)}>{label}</button>
          ))}
        </div>

        {/* ── CONTENT ── */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>

          {/* ══════════ TAB: PÓDIO ══════════ */}
          {tab === 'recap' && (
            <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

              {/* CAMPEÃO */}
              <div style={{
                flex: '0 0 clamp(240px,36%,360px)',
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                justifyContent: 'center', padding: '28px 24px',
                background: `linear-gradient(170deg, ${sc.color}14, transparent 65%)`,
                borderRight: '1px solid rgba(255,255,255,.06)',
                position: 'relative', overflow: 'hidden',
              }}>
                <div style={{
                  position: 'absolute', top: '50%', left: '50%',
                  transform: 'translate(-50%,-50%)',
                  width: 280, height: 280, borderRadius: '50%',
                  background: `radial-gradient(circle, ${sc.color}18 0%, transparent 70%)`,
                  pointerEvents: 'none',
                }} />
                <div style={{
                  fontFamily: "'Space Mono',monospace", fontSize: 7, letterSpacing: '.55em',
                  color: `${sc.color}88`, textTransform: 'uppercase', marginBottom: 18,
                  animation: '_cer_rise .5s ease backwards',
                }}>🏆 Campeão</div>
                <div style={{ animation: '_cer_zoom .6s cubic-bezier(.16,1,.3,1) .1s backwards' }}>
                  <_CerPhoto player={champion} winner sc={sc.color} />
                </div>
                <div style={{
                  fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 900,
                  fontSize: 'clamp(18px,2.4vw,24px)', color: '#fff', letterSpacing: '.05em',
                  textTransform: 'uppercase', textAlign: 'center', marginTop: 16, lineHeight: 1.1,
                  animation: '_cer_rise .5s ease .2s backwards',
                }}>{champion?.name}</div>
                <div style={{
                  display: 'flex', gap: 8, marginTop: 7, alignItems: 'center', justifyContent: 'center',
                  flexWrap: 'wrap', animation: '_cer_rise .5s ease .3s backwards',
                }}>
                  <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 9, color: 'rgba(255,255,255,.45)' }}>
                    {champion?.nationality}
                  </span>
                  {styleChamp && <>
                    <span style={{ color: 'rgba(255,255,255,.2)' }}>·</span>
                    <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 9, color: `${sc.color}cc` }}>
                      {styleChamp.icon} {styleChamp.label}
                    </span>
                  </>}
                </div>
                <div style={{
                  marginTop: 12, padding: '5px 16px',
                  background: `${sc.color}22`, border: `1px solid ${sc.color}55`,
                  fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 800,
                  fontSize: 16, color: sc.color, letterSpacing: '.1em',
                  animation: '_cer_zoom .5s ease .35s backwards',
                }}>{ovrTier(champOvr).grade}</div>
                {sd.length > 0 && (
                  <div style={{ marginTop: 22, animation: '_cer_rise .5s ease .4s backwards' }}>
                    <div style={{
                      fontFamily: "'Space Mono',monospace", fontSize: 6, letterSpacing: '.4em',
                      color: 'rgba(255,255,255,.25)', textAlign: 'center', marginBottom: 8,
                    }}>RESULTADO FINAL</div>
                    <div style={{ display: 'flex', gap: 4, marginBottom: 4, justifyContent: 'center' }}>
                      {sd.map(([a, b], si) => {
                        const v = champIsA ? a : b;
                        const ov = champIsA ? b : a;
                        const won = v > ov;
                        return (
                          <div key={si} className="_cer_set_w" style={{
                            animationDelay: `${.45 + si * .09}s`,
                            background: won ? `${sc.color}28` : 'rgba(255,255,255,.04)',
                            border: `1px solid ${won ? sc.color + '77' : 'rgba(255,255,255,.1)'}`,
                            color: won ? sc.color : 'rgba(255,255,255,.5)',
                          }}>{v}</div>
                        );
                      })}
                    </div>
                    <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                      {sd.map(([a, b], si) => {
                        const v = champIsA ? b : a;
                        return <div key={si} className="_cer_set_l" style={{ animationDelay: `${.5 + si * .09}s` }}>{v}</div>;
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* VICE + SEMIS */}
              <div style={{
                flex: '0 0 clamp(160px,22%,240px)',
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                padding: '24px 16px', borderRight: '1px solid rgba(255,255,255,.06)',
                overflowY: 'auto',
              }}>
                <div style={{
                  fontFamily: "'Space Mono',monospace", fontSize: 7, letterSpacing: '.45em',
                  color: 'rgba(255,255,255,.25)', textTransform: 'uppercase', marginBottom: 14,
                  animation: '_cer_rise .5s ease .3s backwards',
                }}>Vice</div>
                <div style={{ animation: '_cer_zoom .6s cubic-bezier(.16,1,.3,1) .3s backwards' }}>
                  <_CerPhoto player={runner} winner={false} sc={sc.color} />
                </div>
                <div style={{
                  fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700,
                  fontSize: 15, color: 'rgba(255,255,255,.6)', letterSpacing: '.04em',
                  textTransform: 'uppercase', textAlign: 'center', marginTop: 12, lineHeight: 1.2,
                  animation: '_cer_rise .5s ease .4s backwards',
                }}>{runner?.name}</div>
                <div style={{
                  fontFamily: "'Space Mono',monospace", fontSize: 8,
                  color: 'rgba(255,255,255,.28)', marginTop: 4,
                  animation: '_cer_rise .5s ease .45s backwards',
                }}>{runner?.nationality}</div>
                {styleRunner && (
                  <div style={{
                    fontFamily: "'Space Mono',monospace", fontSize: 8,
                    color: 'rgba(255,255,255,.25)', marginTop: 3,
                    animation: '_cer_rise .5s ease .48s backwards',
                  }}>{styleRunner.icon} {styleRunner.label}</div>
                )}
                <div style={{
                  marginTop: 8, fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 600,
                  fontSize: 14, color: 'rgba(255,255,255,.35)',
                  animation: '_cer_rise .5s ease .5s backwards',
                }}>{ovrTier(runnerOvr).grade}</div>
                {semiLosers.length > 0 && (
                  <div style={{ width: '100%', marginTop: 24, animation: '_cer_rise .5s ease .6s backwards' }}>
                    <div style={{
                      fontFamily: "'Space Mono',monospace", fontSize: 6, letterSpacing: '.4em',
                      color: 'rgba(255,255,255,.2)', textTransform: 'uppercase',
                      marginBottom: 10, textAlign: 'center',
                    }}>Semifinalistas</div>
                    {semiLosers.map((p, i) => (
                      <_CerSemiPlayerRow key={p?.id ?? i} p={p} />
                    ))}
                  </div>
                )}
              </div>

              {/* INFO COLUMN */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '24px 26px', display: 'flex', flexDirection: 'column', gap: 22 }}>
                <div>
                  <div className="_cer_section_hd" style={{ color: `${sc.color}88` }}>⚡ Destaques</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                    {facts.map((f, i) => (
                      <div key={i} className="_cer_fact" style={{ animationDelay: `${.15 + i * .08}s` }}>{f}</div>
                    ))}
                  </div>
                </div>
                {totalTitles > 0 && (
                  <div>
                    <div className="_cer_section_hd">Palmarès de {champion?.name?.split(' ')[0]}</div>
                    <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                      {[
                        ['⭐', 'GS', ct.gs ?? 0, '#FFD700'],
                        ['🏆', 'M1000', ct.masters ?? 0, '#E8C84A'],
                        ['🥇', 'Finals', ct.finals ?? 0, '#C84FEB'],
                        ['🎖️', 'A500', ct.atp500 ?? 0, '#4A90D9'],
                        ['🎗️', 'A250', ct.atp250 ?? 0, '#2ECC71'],
                        ['🥇', 'Ouro OLY', ct.olympic?.gold ?? 0, '#1976D2'],
                      ].filter(([,,n]) => n > 0).map(([icon, label, n, color]) => (
                        <div key={label} style={{
                          padding: '9px 14px', background: `${color}0e`,
                          border: `1px solid ${color}33`, textAlign: 'center', minWidth: 58,
                          clipPath: 'polygon(5px 0,100% 0,calc(100% - 5px) 100%,0 100%)',
                        }}>
                          <div style={{ fontSize: 14, marginBottom: 4 }}>{icon}</div>
                          <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 800, fontSize: 24, color, lineHeight: 1 }}>{n}</div>
                          <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 6, color: `${color}88`, letterSpacing: '.25em', marginTop: 3, textTransform: 'uppercase' }}>{label}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ══════════ TAB: STATS ══════════ */}
          {tab === 'stats' && (() => {
            const heatClr = n => {
              if (n == null) return 'rgba(255,255,255,.25)';
              if (n >= 85) return '#FFD700';
              if (n >= 75) return '#FF5533';
              if (n >= 62) return '#FF9944';
              if (n >= 48) return '#FFD700';
              if (n >= 35) return '#7ab4ff';
              return '#4A7A9B';
            };

            const roundHeatData = (() => {
              const allR = bracket.rounds ?? [];
              const totalR = allR.length;
              return allR.map((rnd, ri) => {
                const fromEnd = totalR - 1 - ri;
                const label = fromEnd === 0 ? 'Final' : fromEnd === 1 ? 'Semifinal' : fromEnd === 2 ? 'Quartas' : fromEnd === 3 ? 'Oitavas' : `R${rnd.filter(m=>!m.isBye).length*2}`;
                const heats = rnd.map(m => m.result?.heat?.score ?? m.result?.heat?.peak ?? null).filter(v => v != null);
                const avg = heats.length ? Math.round(heats.reduce((s,v)=>s+v,0)/heats.length) : null;
                const peak = heats.length ? Math.round(Math.max(...heats)) : null;
                return { label, avg, peak, games: heats.length, fromEnd };
              }).reverse();
            })();

            const epicRanking = (() => {
              const allR = bracket.rounds ?? [];
              const totalR = allR.length;
              const matches = [];
              allR.forEach((rnd, ri) => {
                const fromEnd = totalR - 1 - ri;
                const rl = fromEnd === 0 ? 'Final' : fromEnd === 1 ? 'Semifinal' : fromEnd === 2 ? 'Quartas' : fromEnd === 3 ? 'Oitavas' : `R${rnd.filter(m=>!m.isBye).length*2}`;
                rnd.forEach(m => {
                  if (m.isBye || !m.winner) return;
                  const sd2 = m.result?.setsDetail ?? [];
                  const heat = m.result?.heat?.score ?? m.result?.heat?.peak ?? 0;
                  const tbs = sd2.filter(([a,b]) => (a===7&&b===6)||(a===6&&b===7)).length;
                  const scoreN = heat + sd2.length * 4 + tbs * 8;
                  const l = m.playerA?.id === m.winner?.id ? m.playerB : m.playerA;
                  matches.push({ w: m.winner, l, sd: sd2, heat, sets: sd2.length, tbs, round: rl, scoreN });
                });
              });
              return matches.sort((a,b) => b.scoreN - a.scoreN).slice(0, 5);
            })();

            const finalistPaths = (() => {
              const allR = bracket.rounds ?? [];
              const totalR = allR.length;
              const players = [champion, runner, ...semiLosers].filter(Boolean);
              return players.map(player => {
                const wins = [];
                allR.forEach((rnd, ri) => {
                  const fromEnd = totalR - 1 - ri;
                  const rl = fromEnd === 0 ? 'F' : fromEnd === 1 ? 'SF' : fromEnd === 2 ? 'QF' : fromEnd === 3 ? 'R16' : 'R32';
                  rnd.forEach(m => {
                    if (m.winner?.id !== player.id || m.isBye) return;
                    const opp = m.playerA?.id === player.id ? m.playerB : m.playerA;
                    const isA = m.playerA?.id === player.id;
                    const sd2 = m.result?.setsDetail ?? [];
                    const score = sd2.map(([a,b]) => `${isA?a:b}-${isA?b:a}`).join(' ');
                    wins.push({ opp, score, round: rl, sets: sd2.length });
                  });
                });
                const isChamp = player.id === champion?.id;
                const badge = isChamp ? '🏆' : player.id === runner?.id ? '🥈' : '🥉';
                return { player, wins, badge, isChamp };
              });
            })();

            const milestones = (() => {
              const ms = [];
              if (champion) {
                const ct2 = champion.careerTitles ?? {};
                const isSlam = tournament?.isSlam;
                const isMasters = tournament?.isMasters;
                if (isSlam && (ct2.gs ?? 0) === 1) ms.push({ icon: '⭐', text: `Primeiro Grand Slam de carreira de ${champion.name}` });
                else if (isSlam && (ct2.gs ?? 0) >= 5) ms.push({ icon: '📜', text: `${champion.name} chega a ${ct2.gs} Grand Slams — território histórico` });
                else if (isSlam) ms.push({ icon: '⭐', text: `${ct2.gs ?? 1}º Grand Slam de ${champion.name}` });
                if (isMasters && (ct2.masters ?? 0) === 1) ms.push({ icon: '🏆', text: `Primeiro Masters 1000 de ${champion.name}` });
                if (tournament?.category === 'FINALS' && (ct2.finals ?? 0) === 1) ms.push({ icon: '🥇', text: `Primeiro ATP Finals de ${champion.name}` });
                const totalT = (ct2.gs??0)+(ct2.masters??0)+(ct2.finals??0)+(ct2.atp500??0)+(ct2.atp250??0);
                if ([10,20,30,50].includes(totalT)) ms.push({ icon: '🎯', text: `${champion.name} atinge ${totalT} títulos na carreira` });
                (champion.personality?.careerMoments ?? [])
                  .filter(m => m.year === state?.year)
                  .forEach(m => {
                    if (m.type === 'FIRST_SLAM') ms.push({ icon: '🌟', text: m.title ?? `Primeiro Slam histórico de ${champion.name}` });
                    if (m.type === 'DROUGHT_END') ms.push({ icon: '💧', text: m.title ?? `Fim da seca de títulos de ${champion.name}` });
                    if (m.type === 'COMEBACK') ms.push({ icon: '🔄', text: m.title ?? `Retorno definitivo de ${champion.name}` });
                  });
              }
              return ms.slice(0, 6);
            })();

            const totalMatches = rounds.reduce((s,r)=>s+r.filter(m=>!m.isBye&&m.winner).length,0);

            return (
              <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 26 }}>

                {/* Heat por rodada */}
                <div>
                  <div className="_cer_section_hd" style={{ color: `${sc.color}88` }}>🌡️ Heat por Rodada</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                    {roundHeatData.map((rd, i) => (
                      <div key={i} style={{
                        display: 'grid', gridTemplateColumns: '90px 1fr 52px 42px',
                        alignItems: 'center', gap: 12, padding: '9px 14px',
                        background: rd.fromEnd === 0 ? `${sc.color}0a` : 'rgba(255,255,255,.02)',
                        border: `1px solid ${rd.fromEnd === 0 ? sc.color+'22' : 'rgba(255,255,255,.05)'}`,
                      }}>
                        <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 8, color: rd.fromEnd === 0 ? sc.color : 'rgba(255,255,255,.35)', letterSpacing: '.2em', textTransform: 'uppercase' }}>{rd.label}</div>
                        <div style={{ height: 6, background: 'rgba(255,255,255,.06)', borderRadius: 3, overflow: 'hidden' }}>
                          {rd.avg != null && <div style={{ height: '100%', width: `${rd.avg}%`, background: heatClr(rd.avg), borderRadius: 3, transition: 'width .4s' }} />}
                        </div>
                        <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700, fontSize: 18, color: rd.avg != null ? heatClr(rd.avg) : 'rgba(255,255,255,.2)', textAlign: 'right', lineHeight: 1 }}>
                          {rd.avg ?? '—'}
                        </div>
                        <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 7, color: 'rgba(255,255,255,.25)', textAlign: 'right' }}>
                          {rd.games > 0 ? `${rd.games}j` : '—'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Top partidas épicas */}
                {epicRanking.length > 0 && (
                  <div>
                    <div className="_cer_section_hd">🔥 Partidas Mais Épicas</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                      {epicRanking.map((m, i) => {
                        const scoreStr = m.sd.map(([a,b])=>`${a}-${b}`).join(' ');
                        return (
                          <div key={i} style={{
                            display: 'flex', alignItems: 'center', gap: 10,
                            padding: '9px 14px',
                            background: i === 0 ? `${sc.color}0c` : 'rgba(255,255,255,.02)',
                            border: `1px solid ${i === 0 ? sc.color+'33' : 'rgba(255,255,255,.05)'}`,
                            borderLeft: `3px solid ${heatClr(m.heat)}`,
                          }}>
                            <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 900, fontSize: 20, color: heatClr(m.heat), minWidth: 26, lineHeight: 1 }}>{i+1}</div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700, fontSize: 13, color: '#fff', textTransform: 'uppercase', letterSpacing: '.04em' }}>
                                {m.w?.name} <span style={{ color: 'rgba(255,255,255,.3)', fontWeight: 400 }}>def.</span> {m.l?.name}
                              </div>
                              <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 7, color: 'rgba(255,255,255,.3)', marginTop: 2, letterSpacing: '.1em' }}>
                                {m.round} · {scoreStr}
                              </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              {m.tbs > 0 && <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 7, color: '#FFD700', background: 'rgba(255,215,0,.1)', border: '1px solid rgba(255,215,0,.2)', padding: '2px 6px' }}>TB</span>}
                              <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 800, fontSize: 16, color: heatClr(m.heat), minWidth: 32, textAlign: 'right', lineHeight: 1 }}>{m.heat > 0 ? m.heat : '—'}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Caminhos dos finalistas */}
                <div>
                  <div className="_cer_section_hd">🗺️ Caminhos dos Finalistas</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {finalistPaths.map(({ player, wins, badge, isChamp }, pi) => (
                      <div key={player?.id ?? pi} style={{
                        padding: '12px 16px',
                        background: isChamp ? `${sc.color}08` : 'rgba(255,255,255,.02)',
                        border: `1px solid ${isChamp ? sc.color+'22' : 'rgba(255,255,255,.06)'}`,
                      }}>
                        <div style={{
                          fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 800,
                          fontSize: 15, color: isChamp ? sc.color : 'rgba(255,255,255,.6)',
                          textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 8,
                        }}>{badge} {player?.name}</div>
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                          {wins.map((w, wi) => (
                            <div key={wi} style={{
                              display: 'flex', flexDirection: 'column', alignItems: 'center',
                              padding: '5px 10px', minWidth: 72,
                              background: 'rgba(255,255,255,.03)',
                              border: '1px solid rgba(255,255,255,.07)',
                            }}>
                              <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 6, color: 'rgba(255,255,255,.25)', letterSpacing: '.2em', textTransform: 'uppercase', marginBottom: 3 }}>{w.round}</div>
                              <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 600, fontSize: 12, color: 'rgba(255,255,255,.65)', textTransform: 'uppercase', letterSpacing: '.03em', textAlign: 'center' }}>{w.opp?.name?.split(' ').pop() ?? '?'}</div>
                              <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 8, color: isChamp ? sc.color : 'rgba(255,255,255,.35)', marginTop: 2 }}>{w.score}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recordes e marcos */}
                {milestones.length > 0 && (
                  <div>
                    <div className="_cer_section_hd">📜 Recordes & Marcos</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {milestones.map((m, i) => (
                        <div key={i} style={{
                          display: 'flex', alignItems: 'center', gap: 12,
                          padding: '11px 16px',
                          background: 'rgba(255,255,255,.025)',
                          border: `1px solid ${sc.color}22`,
                          borderLeft: `3px solid ${sc.color}`,
                          animation: `_cer_rise .4s ease ${i * .07}s backwards`,
                        }}>
                          <span style={{ fontSize: 18, flexShrink: 0 }}>{m.icon}</span>
                          <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 16, color: 'rgba(255,255,255,.82)', letterSpacing: '.04em', fontWeight: 600 }}>{m.text}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Stats gerais */}
                <div>
                  <div className="_cer_section_hd">Dados Gerais</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                    {[
                      ['Draw', totalPlayers, '👥'],
                      ['Rodadas', rounds.length, '🔢'],
                      ['Sets na Final', sd.length, '🎾'],
                      ['Games na Final', sd.reduce((s,[a,b])=>s+a+b,0), '📊'],
                      ['Partidas Totais', totalMatches, '🏸'],
                      ['No Pódio', semiLosers.length + 2, '🏟️'],
                    ].map(([label, val, icon]) => (
                      <div key={label} className="_cer_stat_card">
                        <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 7, color: 'rgba(255,255,255,.28)', letterSpacing: '.3em', textTransform: 'uppercase', marginBottom: 6 }}>{icon} {label}</div>
                        <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 800, fontSize: 28, color: 'rgba(255,255,255,.8)', lineHeight: 1 }}>{val}</div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            );
          })()}

          {/* ══════════ TAB: BRACKET ══════════ */}
          {tab === 'draw' && (
            <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>
              <div className="_cer_section_hd" style={{ color: `${sc.color}88` }}>Resultados por Rodada</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {[...rounds].reverse().map((round, revIdx) => {
                  const fromEnd = revIdx;
                  const roundLabel = fromEnd === 0 ? '🏆 FINAL' : fromEnd === 1 ? 'SEMIFINAIS' : fromEnd === 2 ? 'QUARTAS DE FINAL' : fromEnd === 3 ? 'OITAVAS' : `R${round.filter(m => !m.isBye).length * 2}`;
                  return (
                    <div key={revIdx}>
                      <div style={{
                        fontFamily: "'Space Mono',monospace", fontSize: 7, letterSpacing: '.45em',
                        color: fromEnd === 0 ? sc.color : 'rgba(255,255,255,.25)',
                        textTransform: 'uppercase', marginBottom: 8,
                        borderLeft: `3px solid ${fromEnd === 0 ? sc.color : 'rgba(255,255,255,.08)'}`,
                        paddingLeft: 10,
                      }}>{roundLabel}</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        {round.filter(m => !m.isBye && m.playerA && m.playerB).map((m, mi) => {
                          const wa = m.winner?.id === m.playerA?.id;
                          const msd = m.result?.setsDetail ?? [];
                          const isChampMatch = m.winner?.id === champion?.id && fromEnd === 0;
                          return (
                            <div key={mi} style={{
                              display: 'flex', alignItems: 'center', gap: 10,
                              padding: '9px 14px',
                              background: isChampMatch ? `${sc.color}0a` : 'rgba(255,255,255,.02)',
                              border: `1px solid ${isChampMatch ? `${sc.color}22` : 'rgba(255,255,255,.05)'}`,
                            }}>
                              <div style={{
                                flex: 1, fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700,
                                fontSize: 13, textTransform: 'uppercase', letterSpacing: '.04em',
                                color: wa ? (fromEnd === 0 ? sc.color : '#fff') : 'rgba(255,255,255,.38)',
                              }}>{m.playerA?.name}</div>
                              <div style={{ display: 'flex', gap: 3 }}>
                                {msd.map(([a, b], si) => (
                                  <div key={si} style={{
                                    fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 800,
                                    fontSize: 13, minWidth: 16, textAlign: 'center',
                                    color: a > b ? (wa ? (fromEnd === 0 ? sc.color : 'rgba(255,255,255,.7)') : 'rgba(255,255,255,.5)') : 'rgba(255,255,255,.18)',
                                  }}>{a}</div>
                                ))}
                              </div>
                              <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 7, color: 'rgba(255,255,255,.15)' }}>vs</div>
                              <div style={{ display: 'flex', gap: 3 }}>
                                {msd.map(([a, b], si) => (
                                  <div key={si} style={{
                                    fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 800,
                                    fontSize: 13, minWidth: 16, textAlign: 'center',
                                    color: b > a ? (!wa ? (fromEnd === 0 ? sc.color : 'rgba(255,255,255,.7)') : 'rgba(255,255,255,.5)') : 'rgba(255,255,255,.18)',
                                  }}>{b}</div>
                                ))}
                              </div>
                              <div style={{
                                flex: 1, fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700,
                                fontSize: 13, textTransform: 'uppercase', letterSpacing: '.04em',
                                textAlign: 'right',
                                color: !wa ? (fromEnd === 0 ? sc.color : '#fff') : 'rgba(255,255,255,.38)',
                              }}>{m.playerB?.name}</div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ══════════ TAB: JORNALISMO ══════════ */}
          {tab === 'press' && (() => {
            const feed = state?.newsEngine?.feed ?? [];
            const upcomingTournament = CALENDAR[state?.calendarIndex] ?? null;
            const tourneyArticles = feed.filter(a =>
              a.tournament?.id === tournament?.id ||
              (
                upcomingTournament &&
                a.tournament?.id === upcomingTournament.id &&
                (a.type === 'PREVIEW' || a.type === 'PREDICTION')
              ) ||
              (a.player?.id === champion?.id && a.year === state?.year && !a.tournament)
            );

            const TYPE_PRIORITY = { CHAMPION:0, RECORD:1, EPIC_MATCH:1, UPSET:2, RIVALRY:2, INJURY:3, PROSPECT:3, PREVIEW:4, PREDICTION:4, ANALYSIS:5, TOURNAMENT_WRAP:6, RUMOR:7, COLUMN:8 };
            const sorted = [...tourneyArticles].sort((a,b) => (TYPE_PRIORITY[a.type]??9) - (TYPE_PRIORITY[b.type]??9));

            const TYPE_META = {
              CHAMPION:        { icon: '🏆', label: 'Campeão',       color: '#E8C84A' },
              UPSET:           { icon: '⚡', label: 'Zebra',         color: '#FF6B35' },
              EPIC_MATCH:      { icon: '🔥', label: 'Duelo Épico',   color: '#EF5350' },
              RIVALRY:         { icon: '⚔️', label: 'Rivalidade',    color: '#E040FB' },
              RECORD:          { icon: '📈', label: 'Recorde',       color: '#2ECC71' },
              INJURY:          { icon: '🩹', label: 'Lesão',         color: '#F44336' },
              COMEBACK:        { icon: '🔄', label: 'Retorno',       color: '#00BCD4' },
              PROSPECT:        { icon: '🌱', label: 'Revelação',     color: '#66BB6A' },
              RETIREMENT:      { icon: '🌅', label: 'Aposentadoria', color: '#90A4AE' },
              ANALYSIS:        { icon: '📋', label: 'Análise',       color: '#4A90D9' },
              COLUMN:          { icon: '✍️', label: 'Coluna',        color: '#D4A017' },
              RUMOR:           { icon: '🔮', label: 'Rumor',         color: '#AB47BC' },
              TOURNAMENT_WRAP: { icon: '📰', label: 'Balanço',       color: '#5CB8E4' },
              SPONSOR_ELITE:   { icon: '👑', label: 'Patrocínio',    color: '#FFD700' },
              SPONSOR:         { icon: '🤝', label: 'Patrocínio',    color: '#60C8FF' },
            };

            if (sorted.length === 0) {
              return (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, padding: '40px' }}>
                  <div style={{ fontSize: 36, opacity: 0.25 }}>📰</div>
                  <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 9, letterSpacing: '.3em', color: 'rgba(255,255,255,.2)', textTransform: 'uppercase' }}>
                    Nenhum artigo encontrado
                  </div>
                  <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 13, color: 'rgba(255,255,255,.18)', textAlign: 'center', maxWidth: 320 }}>
                    Os artigos são gerados automaticamente após cada torneio e aparecem aqui na próxima abertura da cerimônia.
                  </div>
                </div>
              );
            }

            return (
              <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ marginBottom: 6 }}>
                  <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 7, letterSpacing: '.35em', color: 'rgba(255,255,255,.22)', textTransform: 'uppercase' }}>
                    {sorted.length} artigo{sorted.length !== 1 ? 's' : ''} · {tournament?.name}
                  </div>
                </div>

                {sorted.map((art, idx) => {
                  const meta = TYPE_META[art.type] ?? { icon: '📄', label: art.type, color: '#888' };
                  const j = typeof art.journalist === 'object' ? art.journalist : null;
                  const jName  = j?.name ?? (typeof art.journalist === 'string' ? art.journalist : '');
                  const jIcon  = j?.icon  ?? '';
                  const jColor = j?.color ?? meta.color;
                  const isExpanded = expandedId === (art.id ?? idx);
                  const isWrap = art.type === 'TOURNAMENT_WRAP';

                  return (
                    <div
                      key={art.id ?? idx}
                      onClick={() => setExpandedId(isExpanded ? null : (art.id ?? idx))}
                      style={{
                        padding: '13px 16px',
                        background: isExpanded ? `${meta.color}0c` : 'rgba(255,255,255,.025)',
                        border: `1px solid ${isExpanded ? meta.color+'44' : 'rgba(255,255,255,.06)'}`,
                        borderLeft: `3px solid ${meta.color}`,
                        cursor: 'pointer',
                        transition: 'background .12s, border .12s',
                        animation: `_cer_rise .3s ease ${Math.min(idx*.04,.4)}s backwards`,
                      }}
                    >
                      {/* Topo do card */}
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 9 }}>
                        <div style={{
                          display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0,
                          padding: '3px 7px',
                          background: `${meta.color}18`, border: `1px solid ${meta.color}33`,
                        }}>
                          <span style={{ fontSize: 10 }}>{meta.icon}</span>
                          <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 6, color: meta.color, letterSpacing: '.18em', textTransform: 'uppercase' }}>{meta.label}</span>
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{
                            fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700,
                            fontSize: 16, color: '#fff', lineHeight: 1.2, letterSpacing: '.03em',
                          }}>{art.headline}</div>
                          {art.deck && !isExpanded && (
                            <div style={{ fontFamily: "'Crimson Pro',Georgia,serif", fontSize: 13, color: 'rgba(255,255,255,.45)', marginTop: 3, lineHeight: 1.35 }}>{art.deck}</div>
                          )}
                        </div>
                        <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 10, color: 'rgba(255,255,255,.2)', flexShrink: 0, marginTop: 2 }}>
                          {isExpanded ? '▲' : '▼'}
                        </div>
                      </div>

                      {/* Corpo expandido */}
                      {isExpanded && (
                        <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${meta.color}22` }}>
                          {art.deck && (
                            <div style={{ fontFamily: "'Crimson Pro',Georgia,serif", fontSize: 14, color: 'rgba(255,255,255,.6)', marginBottom: 10, lineHeight: 1.5, fontStyle: 'italic' }}>
                              {art.deck}
                            </div>
                          )}
                          <div style={{ fontFamily: "'Crimson Pro',Georgia,serif", fontSize: 15, color: 'rgba(242,237,228,.82)', lineHeight: 1.78 }}>
                            {art.body}
                          </div>
                          {isWrap && art.wrapData?.heat && (
                            <div style={{ marginTop: 12, padding: '10px 14px', background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.07)', display: 'flex', gap: 20, alignItems: 'center' }}>
                              <div>
                                <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 6, color: 'rgba(255,255,255,.3)', letterSpacing: '.2em', marginBottom: 2 }}>HEAT MÉDIO</div>
                                <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 800, fontSize: 26, color: '#FF9944', lineHeight: 1 }}>{art.wrapData.heat.avg}</div>
                              </div>
                              <div>
                                <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 6, color: 'rgba(255,255,255,.3)', letterSpacing: '.2em', marginBottom: 2 }}>TIER</div>
                                <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700, fontSize: 14, color: 'rgba(255,255,255,.55)' }}>{art.wrapData.heat.tier}</div>
                              </div>
                              {art.wrapData.injured?.length > 0 && (
                                <div>
                                  <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 6, color: 'rgba(255,255,255,.3)', letterSpacing: '.2em', marginBottom: 2 }}>LESIONADOS</div>
                                  <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700, fontSize: 14, color: '#EF5350' }}>{art.wrapData.injured.length}</div>
                                </div>
                              )}
                            </div>
                          )}
                          {art.tags?.length > 0 && (
                            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 10 }}>
                              {art.tags.slice(0,6).map((tag,ti) => (
                                <span key={ti} style={{ fontFamily: "'Space Mono',monospace", fontSize: 7, color: 'rgba(255,255,255,.28)', background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)', padding: '2px 6px', letterSpacing: '.1em' }}>#{tag}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Rodapé jornalista */}
                      {jName && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 7 }}>
                          <span style={{ fontSize: 10 }}>{jIcon}</span>
                          <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 7, color: jColor, letterSpacing: '.12em', opacity: 0.65 }}>{jName}</span>
                          {art.year && <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 7, color: 'rgba(255,255,255,.15)', letterSpacing: '.1em', marginLeft: 3 }}>{art.year}</span>}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })()}

        </div>{/* ── END CONTENT ── */}

        {/* ── FOOTER ── */}
        <div style={{
          borderTop: '1px solid rgba(255,255,255,.06)',
          padding: '10px 24px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'rgba(0,0,0,.3)', flexShrink: 0,
        }}>
          <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 7, color: 'rgba(255,255,255,.2)', letterSpacing: '.3em' }}>
            {tournament?.name?.toUpperCase()} · {state?.year} · {sc.label.toUpperCase()}
          </div>
          <button onClick={onClose} style={{
            fontFamily: "'Space Mono',monospace", fontSize: 8, letterSpacing: '.4em',
            textTransform: 'uppercase', padding: '8px 24px', cursor: 'pointer',
            background: `${sc.color}22`, border: `1px solid ${sc.color}55`,
            color: sc.color, transition: 'all .15s',
          }}>
            Continuar →
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// buildCompactClips — selects 5 essential moments from allClips
// ─────────────────────────────────────────────────────────────────────────────
function buildCompactClips(allClips) {
  if (!allClips?.length) return [];
  if (allClips.length <= 5) return allClips;

  const used = new Set();
  const result = [];

  function add(clip, reason = '?') {
    if (!clip || used.has(clip.chronIdx)) return false;
    used.add(clip.chronIdx);
    result.push({ ...clip, _selectionReason: reason });
    return true;
  }

  // 1. First notable moment (skip generic low-priority types)
  const SKIP = ['GAME_POINT', 'BREAK_POINT'];
  add(
    allClips.find(c => !SKIP.includes(c.type)) ?? allClips[0],
    'primeiro momento notável'
  );

  // 2. Best rally (longest — threshold aligned with new RALLY_EPIC = 10)
  const bestRally = [...allClips]
    .filter(c => c.rallyLength >= 7)
    .sort((a, b) => b.rallyLength - a.rallyLength)[0];
  if (bestRally) add(bestRally, `melhor rally (${bestRally.rallyLength} bolas)`);

  // 3. Most dramatic non-terminal moment (highest priority, not match/final).
  //    BREAK_POINT: only converted ones (break real) — saved break points são enganosos.
  //    Prefer converted moments as a tiebreaker for all other types.
  const dramatic = [...allClips]
    .filter(c => {
      if (used.has(c.chronIdx)) return false;
      if (['MATCH_POINT','FINAL_POINT','GAME_POINT'].includes(c.type)) return false;
      if (c.type === 'BREAK_POINT' && c.pointWinnerIdx !== c.momentHolderIdx) return false;
      return true;
    })
    .sort((a, b) => {
      if (b.priority !== a.priority) return b.priority - a.priority;
      const aConv = (a.pointWinnerIdx === a.momentHolderIdx) ? 0 : 1;
      const bConv = (b.pointWinnerIdx === b.momentHolderIdx) ? 0 : 1;
      return aConv - bConv;
    })[0];
  if (dramatic) add(dramatic, `momento mais dramático (prioridade ${dramatic?.priority})`);

  // 4. Last match point save (drama of the near-miss) + the converted match point.
  //    If all match points were converted on first try, just show last two.
  const mps = allClips.filter(c => c.type === 'MATCH_POINT');
  const convertedMps = mps.filter(c => c.pointWinnerIdx === c.momentHolderIdx);
  const savedMps     = mps.filter(c => c.pointWinnerIdx !== c.momentHolderIdx);
  if (savedMps.length > 0 && convertedMps.length > 0) {
    add(savedMps[savedMps.length - 1],      'último match point salvo (tensão)');
    add(convertedMps[convertedMps.length - 1], 'match point convertido (vencedor)');
  } else {
    for (const mp of mps.slice(-2)) add(mp, 'match point');
  }

  // 5. Final point (always last)
  add(allClips[allClips.length - 1], 'ponto final da partida');

  return result.sort((a, b) => a.chronIdx - b.chronIdx);
}

// buildHighlightsClips — curated middle ground: all decisive moments, no filler
// Strategy: everything that changes tension. GAME_POINT excluded (too routine).
// Break points capped so a hold-fest doesn't flood the reel.
// SET_POINT: only shows converted ones (holder won the point) — unconverted set
// points that were saved/lost are confusing and misleading to the viewer.
// ─────────────────────────────────────────────────────────────────────────────
function buildHighlightsClips(allClips) {
  if (!allClips?.length) return [];

  const HIGH_PRI   = ['MATCH_POINT', 'FINAL_POINT', 'FIFTH_SET_OPENER',
                      'EPIC_RALLY_CLUTCH', 'TIEBREAK_CRITICAL'];
  const MEDIUM_PRI = ['SET_POINT', 'EPIC_RALLY'];
  // BREAK_POINT: apenas convertidos
  // GAME_POINT: nunca

  const result = [];
  const used   = new Set();

  function add(clip, reason) {
    if (!clip || used.has(clip.chronIdx)) return false;
    used.add(clip.chronIdx);
    result.push({ ...clip, _selectionReason: reason });
    return true;
  }

  // 1. All HIGH priority — always keep every one
  for (const c of allClips) {
    if (HIGH_PRI.includes(c.type)) add(c, `alta prioridade (${c.type})`);
  }

  // 2. MEDIUM priority
  //    SET_POINT: only converted ones (holder won the point), cap 1 per set.
  //    If no converted set point exists for a set, show the last one anyway
  //    (dramatic even if saved).
  //    EPIC_RALLY: all.
  const spBySet = {};
  for (const c of allClips) {
    if (c.type !== 'SET_POINT' || used.has(c.chronIdx)) continue;
    const key = `${c.s0}-${c.s1}`;
    if (!spBySet[key]) spBySet[key] = { converted: [], saved: [] };
    const wasConverted = c.pointWinnerIdx === c.momentHolderIdx;
    if (wasConverted) spBySet[key].converted.push(c);
    else              spBySet[key].saved.push(c);
  }
  for (const { converted, saved } of Object.values(spBySet)) {
    // Prefer converted: show last converted set point (the winning moment).
    const toShow = converted.length > 0
      ? converted[converted.length - 1]
      : saved[saved.length - 1]; // fallback: last saved (still dramatic context)
    const spReason = converted.length > 0 ? 'set point convertido' : 'set point (fallback — nenhum convertido)';
    if (toShow) add(toShow, spReason);
  }
  for (const c of allClips) {
    if (c.type === 'EPIC_RALLY' && !used.has(c.chronIdx)) add(c, `rally épico (${c.rallyLength} bolas)`);
  }

  // 3. BREAK_POINT — somente breaks CONVERTIDOS (receiver venceu o ponto = break real)
  //    Break points salvos são enganosos no replay ao vivo: o ponto pode divergir
  //    da simulação original, mostrando um "break point" sem break na tela.
  //    Cap: 1 por set, máximo 3 total. Preferência: mais tarde no set (mais pressão).
  const bpBySet = {};
  const bpConverted = allClips
    .filter(c =>
      c.type === 'BREAK_POINT' &&
      !used.has(c.chronIdx) &&
      c.pointWinnerIdx === c.momentHolderIdx // apenas breaks reais
    )
    .sort((a, b) => (b.g0 + b.g1) - (a.g0 + a.g1)); // mais tarde no set = mais pressão
  let bpTotal = 0;
  for (const c of bpConverted) {
    if (bpTotal >= 3) break;
    const setKey = `${c.s0}-${c.s1}`;
    if ((bpBySet[setKey] ?? 0) >= 1) continue;
    add(c, `break convertido — games ${c.g0}–${c.g1} no set`);
    bpBySet[setKey] = (bpBySet[setKey] ?? 0) + 1;
    bpTotal++;
  }

  // 4. Ensure FINAL_POINT is always included
  const last = allClips[allClips.length - 1];
  if (last) add(last);

  return result.sort((a, b) => a.chronIdx - b.chronIdx);
}

// ─────────────────────────────────────────────────────────────────────────────
// CinematicReel — Sim Highlights experience
// Phases: SELECT → INTRO → LIVE → (next clip) → DONE
// ─────────────────────────────────────────────────────────────────────────────
const REEL_INTRO_DURATION = 2200;  // ms before auto-advancing intro to live

function CinematicReel({
  simHlState,
  gsRef,
  trailRef,
  frameHistoryRef,
  speedRef,
  simSpeed,
  setSimSpeed,
  coachPool = [],
  onDone,
}) {
  const { allClips = [], result, playerA, playerB } = simHlState;
  const compactClips    = React.useMemo(() => buildCompactClips(allClips),    [allClips]);
  const highlightsClips = React.useMemo(() => buildHighlightsClips(allClips), [allClips]);

  const [mode,       setMode]      = useState(null);           // null | 'compact' | 'highlights' | 'extended'
  const [clipIdx,    setClipIdx]   = useState(0);
  const [phase,      setPhase]     = useState('INTRO');        // 'INTRO' | 'LIVE'
  const [showDone,   setShowDone]  = useState(false);
  const [snap,       setSnap]      = useState(null);
  const [pointDone,  setPointDone] = useState(false);
  const [introAnim,  setIntroAnim] = useState(false);         // trigger re-animation on clip change

  const rafRef           = useRef(null);
  const introTimer       = useRef(null);
  const autoDoneTimer    = useRef(null);
  const runningRef       = useRef(false);
  const replayBaseRef    = useRef(null);
  // Stable refs so DefinitiveME never sees new object references on re-render
  const stableBugMode    = useRef(false);
  const stableBugSave    = useRef(1);
  const stableSetBugMode = useRef(() => {});

  const clips = mode === 'compact' ? compactClips : mode === 'highlights' ? highlightsClips : allClips;
  const clip  = clips[clipIdx];

  // ── takeSnap — stable fn, called only at clip-load and point-end ──
  // The canvas in NEWME1.0 reads gsRef directly every RAF frame, so we
  // do NOT need to call this 60x/s. Only call it when HUD data changes.
  const takeSnapFn = useCallback((gs) => {
    setSnap({
      players: gs.players.map(p => ({
        ...p,
        styleData: { ...(p.styleData ?? {}) },
        ctx:       { ...(p.ctx       ?? {}) },
        stamina: p.stamina,
        namedPlayerKey: p.namedPlayerKey,
        setsHistory: p.setsHistory,
        _heatGrid: p._heatGrid ? new Uint16Array(p._heatGrid) : null,
      })),
      ball:         { ...gs.ball },
      gameState:    gs.gameState,
      rally: gs.rally, maxRally: gs.maxRally,
      totalPoints:  gs.totalPoints ?? 0,
      setsDetail:   gs.setsDetail  ?? [],
      server:       gs.server      ?? 0,
      ballZ:        gs.ball?.pos?.z ?? 0,
      ballSpeed:    0,
      courtMeta:    gs.courtMeta,
      bounceLog:    gs.bounceLog    ? [...gs.bounceLog]    : [],
      debugEvents:  [],
      trace:        null,
      inTiebreak:   gs.inTiebreak  ?? false,
      tbScore:      gs.tbScore     ? [...gs.tbScore]     : [0, 0],
      heat:         gs.heat        ? { ...gs.heat }      : null,
      pointHistory: gs.pointHistory ? [...gs.pointHistory] : [],
    });
  }, []); // eslint-disable-line

  const buildReplayGs = useCallback((baseGs, frame) => {
    if (!baseGs || !frame) return null;
    const basePlayers = baseGs.players ?? [];
    const framePlayers = frame.players ?? [];
    return {
      ...baseGs,
      _bounce: onBounce,
      gameState: frame.gameState ?? baseGs.gameState,
      rally: frame.rally ?? baseGs.rally ?? 0,
      totalPoints: frame.totalPoints ?? baseGs.totalPoints ?? 0,
      server: frame.server ?? baseGs.server ?? 0,
      receiver: frame.receiver ?? baseGs.receiver ?? 1,
      inTiebreak: frame.inTiebreak ?? baseGs.inTiebreak ?? false,
      tbScore: frame.tbScore ? [...frame.tbScore] : (baseGs.tbScore ? [...baseGs.tbScore] : [0, 0]),
      pointHistory: frame.pointHistory ? [...frame.pointHistory] : (baseGs.pointHistory ? [...baseGs.pointHistory] : []),
      lastShotEvent: frame.lastShotEvent ? JSON.parse(JSON.stringify(frame.lastShotEvent)) : null,
      lastBouncePos: frame.lastBouncePos ? { ...frame.lastBouncePos } : null,
      pendingHitLabels: frame.pendingHitLabels ? JSON.parse(JSON.stringify(frame.pendingHitLabels)) : [],
      pendingOutcomeLabels: frame.pendingOutcomeLabels ? JSON.parse(JSON.stringify(frame.pendingOutcomeLabels)) : [],
      pendingFlash: frame.pendingFlash ? { ...frame.pendingFlash } : null,
      pendingScreenFx: frame.pendingScreenFx ? JSON.parse(JSON.stringify(frame.pendingScreenFx)) : null,
      ball: {
        ...(baseGs.ball ?? {}),
        ...(frame.ball ?? {}),
        pos: { ...(frame.ball?.pos ?? baseGs.ball?.pos ?? {}) },
        vel: { ...(frame.ball?.vel ?? baseGs.ball?.vel ?? {}) },
      },
      players: basePlayers.map((bp, i) => {
        const fp = framePlayers[i];
        if (!fp) return bp;
        return {
          ...bp,
          pos: { ...(fp.pos ?? bp.pos ?? {}) },
          vel: { ...(fp.vel ?? bp.vel ?? {}) },
          atNet: fp.atNet ?? bp.atNet ?? false,
          stamina: fp.stamina ?? bp.stamina ?? 1,
          ctx: {
            ...(bp.ctx ?? {}),
            ...(fp.ctx ?? {}),
          },
        };
      }),
    };
  }, []);

  // ── Load a clip snapshot into gsRef ───────────────────────────────
  const loadSnapshot = useCallback((idx) => {
    const clipList = mode === 'compact' ? compactClips : mode === 'highlights' ? highlightsClips : allClips;
    const clipData = clipList[idx];
    if (!clipData) return;

    // Prefer serveSnapshot (saved at the exact SERVING tick in headless) over
    // gsSnapshot (saved at PRE_SERVE). serveSnapshot guarantees player positions
    // and stateTimer are byte-for-byte identical to what the headless used when
    // it started consuming the recorded randomSequence — making replay deterministic.
    const raw = clipData.serveSnapshot ?? clipData.gsSnapshot;
    if (!raw) return;

    try {
      const gs = JSON.parse(JSON.stringify(raw));
      gs._bounce = onBounce;
      replayBaseRef.current = JSON.parse(JSON.stringify(gs));

      // If we fell back to gsSnapshot (old clips without serveSnapshot),
      // do the manual PRE_SERVE skip as before.
      if (!clipData.serveSnapshot && gs.gameState === GameState.PRE_SERVE) {
        gs._rvPosTarget = null;
        const bigDt = 0.05;
        for (let i = 0; i < 50 && gs.gameState === GameState.PRE_SERVE; i++) {
          gs.stateTimer += bigDt;
          const sv = gs.players[gs.server];
          const rv = gs.players[gs.receiver];
          const HALF_L = 23.77 / 2;
          const sx = gs.serveLeft ? -1.5 : 1.5;
          sv.pos.x += (sx - sv.pos.x) * 0.5;
          sv.pos.y += (sv.side * (HALF_L + 0.5) - sv.pos.y) * 0.5;
          rv.pos.x += ((gs.serveLeft ? 2.0 : -2.0) - rv.pos.x) * 0.5;
          rv.pos.y += (rv.side * (HALF_L + 2.0) - rv.pos.y) * 0.5;
        }
        gs.stateTimer = (TIMING.preServeDelay ?? 1.2) + 0.01;
        const sv = gs.players[gs.server];
        gs.ball.pos.x = sv.pos.x;
        gs.ball.pos.y = sv.pos.y;
        gs.ball.pos.z = 0.8;
        gs.ball.inFlight = false;
      }

      gsRef.current = gs;
      if (frameHistoryRef) frameHistoryRef.current = clipData.replayFrames ? [...clipData.replayFrames] : [];
      takeSnapFn(gs);
    } catch {}
    if (trailRef) trailRef.current = [];
  }, [allClips, compactClips, highlightsClips, mode, gsRef, trailRef, frameHistoryRef, takeSnapFn]); // eslint-disable-line

  // ── Navigate to a clip ────────────────────────────────────────────
  const goToClip = useCallback((idx, startPhase = 'INTRO') => {
    if (rafRef.current)    cancelAnimationFrame(rafRef.current);
    if (introTimer.current) clearTimeout(introTimer.current);
    if (autoDoneTimer.current) clearTimeout(autoDoneTimer.current);
    runningRef.current = false;

    setClipIdx(idx);
    setPhase(startPhase);
    setPointDone(false);
    setIntroAnim(v => !v);   // flip to re-trigger CSS animation

    if (startPhase === 'LIVE') {
      // loadSnapshot calls takeSnapFn — do NOT setSnap(null) or it overwrites the HUD
      loadSnapshot(idx);
    } else {
      setSnap(null);  // INTRO phase: clear HUD while card is showing
    }
  }, [loadSnapshot]);

  const goLive = useCallback(() => {
    if (introTimer.current) clearTimeout(introTimer.current);
    setPhase('LIVE');
    setPointDone(false);
    loadSnapshot(clipIdx);  // calls takeSnapFn internally — do NOT setSnap(null) after this
  }, [clipIdx, loadSnapshot]);

  const handleNext = useCallback(() => {
    if (phase === 'INTRO') { goLive(); return; }
    const next = clipIdx + 1;
    if (next >= clips.length) { setShowDone(true); }
    else { goToClip(next, 'INTRO'); }
  }, [phase, clipIdx, clips, goLive, goToClip]);

  const handlePrev = useCallback(() => {
    if (clipIdx > 0) goToClip(clipIdx - 1, 'INTRO');
  }, [clipIdx, goToClip]);

  // ── Intro auto-advance ─────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'INTRO' || !mode) return;
    introTimer.current = setTimeout(goLive, REEL_INTRO_DURATION);
    return () => clearTimeout(introTimer.current);
  }, [phase, clipIdx, mode]); // eslint-disable-line

  // ── Live game loop ─────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'LIVE' || showDone) return;
    const recordedFrames = clip?.replayFrames ?? [];
    let running = true;
    runningRef.current = true;

    if (recordedFrames.length > 0 && replayBaseRef.current) {
      let framePtr = 0;
      let lastTs = null;
      let carryFrames = 0;
      const loopRecorded = () => {
        if (!running || !replayBaseRef.current) return;
        const now = performance.now();
        if (lastTs == null) lastTs = now;
        const deltaMs = Math.min(100, now - lastTs);
        lastTs = now;
        const speed = Math.max(0.25, Number(speedRef?.current ?? 1));
        carryFrames += (deltaMs / (1000 / 60)) * speed;
        const framesToAdvance = Math.max(1, Math.floor(carryFrames));
        if (framesToAdvance >= 1) carryFrames -= framesToAdvance;

        for (let i = 0; i < framesToAdvance; i++) {
          const frame = recordedFrames[Math.min(framePtr, recordedFrames.length - 1)];
          const replayGs = buildReplayGs(replayBaseRef.current, frame);
          if (replayGs) {
            gsRef.current = replayGs;
            if (trailRef) trailRef.current = frame?.trail ? frame.trail.map((t) => ({ ...t })) : [];
            takeSnapFn(replayGs);
          }
          framePtr++;
          if (framePtr >= recordedFrames.length) {
            running = false;
            runningRef.current = false;
            setPointDone(true);
            return;
          }
        }
        rafRef.current = requestAnimationFrame(loopRecorded);
      };
      rafRef.current = requestAnimationFrame(loopRecorded);
      return () => {
        running = false;
        runningRef.current = false;
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
      };
    }

    // Fallback legado: re-simulação determinística
    // CRITICAL: must match DT_HEADLESS = 1/120 exactly.
    // The random sequence was recorded with DT=1/120 — using a different DT
    // changes when each gameTick consumes a random number, making the physics
    // diverge even with the same sequence. We run 2 ticks per RAF frame
    // (2 × 1/120 = 1/60 wall-clock) to maintain correct visual speed.
    const DT = 1 / 120;
    const TICKS_PER_FRAME = 2;
    const randomSequence = clip?.randomSequence;
    let rIdx = 0;
    let _origRandom = null;
    if (randomSequence?.length > 0) {
      _origRandom = Math.random;
      Math.random = () => rIdx < randomSequence.length ? randomSequence[rIdx++] : _origRandom();
    }

    const restoreRandom = () => {
      if (_origRandom) { Math.random = _origRandom; _origRandom = null; }
    };

    function loop() {
      if (!running || !gsRef.current) { restoreRandom(); return; }
      const gs = gsRef.current;

      const speed = speedRef?.current ?? 1;
      const ticksThisFrame = Math.round(TICKS_PER_FRAME * speed);

      for (let t = 0; t < ticksThisFrame; t++) {
        // Skip serve windup so the ball launches immediately
        if (gs.gameState === GameState.SERVING && gs.stateTimer <= (TIMING.serveWindup ?? 0.4)) {
          gs.stateTimer = (TIMING.serveWindup ?? 0.4) + 0.01;
        }
        gameTick(gs, DT);
        if (gs.ball?.inFlight && trailRef) {
          trailRef.current = trailRef.current ?? [];
          trailRef.current.push({ ...gs.ball.pos });
          if (trailRef.current.length > TRAIL_LEN) trailRef.current.shift();
        }
        if (gs.gameState === GameState.POINT_END || gs.gameState === GameState.GAME_OVER) {
          restoreRandom();
          // Flush POINT_END transitions synchronously
          for (let i = 0; i < 120 && gs.gameState === GameState.POINT_END; i++) gameTick(gs, DT);
          takeSnapFn(gs);
          running = false;
          runningRef.current = false;
          setPointDone(true);
          return;
        }
      }

      rafRef.current = requestAnimationFrame(loop);
    }

    rafRef.current = requestAnimationFrame(loop);
    return () => {
      running = false;
      runningRef.current = false;
      restoreRandom();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [phase, clipIdx, clip, showDone, buildReplayGs, takeSnapFn]); // eslint-disable-line

  // ── Auto-advance after point ends ─────────────────────────────────
  useEffect(() => {
    if (!pointDone) return;
    autoDoneTimer.current = setTimeout(handleNext, 1800);
    return () => clearTimeout(autoDoneTimer.current);
  }, [pointDone]); // eslint-disable-line

  // ── Keyboard navigation ────────────────────────────────────────────
  useEffect(() => {
    const h = (e) => {
      if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); handleNext(); }
      if (e.key === 'ArrowLeft')                     { e.preventDefault(); handlePrev(); }
      if (e.key === 'Escape')                         onDone();
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [handleNext, handlePrev, onDone]);

  // ── MODE SELECT ────────────────────────────────────────────────────
  if (!mode) {
    return (
      <div style={{
        width:'100vw', height:'100vh', overflow:'hidden',
        background:'linear-gradient(160deg,#030d07 0%,#050c11 55%,#07050d 100%)',
        display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
        fontFamily:"'Space Mono',monospace", color:'#F2EDE4', gap:0,
      }}>
        {/* Glow */}
        <div style={{ position:'absolute', top:'20%', left:'30%', width:400, height:400, borderRadius:'50%',
          background:'radial-gradient(circle,rgba(74,144,217,.08),transparent 70%)', filter:'blur(60px)', pointerEvents:'none' }}/>
        <div style={{ position:'absolute', bottom:'15%', right:'25%', width:300, height:300, borderRadius:'50%',
          background:'radial-gradient(circle,rgba(232,200,74,.06),transparent 70%)', filter:'blur(50px)', pointerEvents:'none' }}/>

        {/* Header */}
        <div style={{ textAlign:'center', marginBottom:56, position:'relative', zIndex:1 }}>
          <div style={{ fontSize:9, letterSpacing:'.55em', color:'rgba(255,255,255,.2)', marginBottom:16, textTransform:'uppercase' }}>
            {playerA?.name?.toUpperCase()} vs {playerB?.name?.toUpperCase()}
          </div>
          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:900,
            fontSize:'clamp(28px,4vw,48px)', letterSpacing:'.06em', textTransform:'uppercase',
            color:'#F2EDE4', lineHeight:1 }}>
            SIM HIGHLIGHTS
          </div>
          <div style={{ width:60, height:2, background:'rgba(255,255,255,.12)', margin:'20px auto 0' }}/>
        </div>

        {/* Cards */}
        <div style={{ display:'flex', gap:20, position:'relative', zIndex:1, padding:'0 24px', flexWrap:'wrap', justifyContent:'center' }}>
          {[
            {
              id:'compact',
              title:'COMPACTO',
              sub:'Os 5 momentos que definiram a partida',
              count: compactClips.length,
              countLabel:'momentos essenciais',
              color:'#E8C84A',
              icon:'⚡',
              types: [...new Set(compactClips.map(c=>c.label))].slice(0,4),
            },
            {
              id:'highlights',
              title:'HIGHLIGHTS',
              sub:'Cada virada, break e rally decisivo',
              count: highlightsClips.length,
              countLabel:'momentos curados',
              color:'#A78BFA',
              icon:'🎯',
              types: [...new Set(highlightsClips.map(c=>c.label))].slice(0,5),
            },
            {
              id:'extended',
              title:'EXTENDIDO',
              sub:'A partida completa em highlights',
              count: allClips.length,
              countLabel:'momentos capturados',
              color:'#4A90D9',
              icon:'🎬',
              types: [...new Set(allClips.map(c=>c.label))].slice(0,5),
            },
          ].map(opt => (
            <div key={opt.id}
              onClick={() => {
                const modeClips = opt.id === 'compact' ? compactClips : opt.id === 'highlights' ? highlightsClips : allClips;
                const modeLabel = opt.id === 'compact' ? 'CURTO' : opt.id === 'highlights' ? 'MÉDIO' : 'ESTENDIDO';
                console.group(`%c[HL-REEL] Modo ${modeLabel} — ${modeClips.length} clips selecionados`, 'color:#FFD700;font-weight:bold');
                modeClips.forEach((c, i) => {
                  const converted = c.pointWinnerIdx === c.momentHolderIdx;
                  console.log(
                    `%c  #${String(i+1).padStart(2)} ${c.type.padEnd(20)} %c${converted ? '✅ convertido' : '❌ não convertido'}%c  sets=${c.s0}-${c.s1} games=${c.g0}-${c.g1}  score="${c.score}"  motivo="${c._selectionReason ?? '?'}"`,
                    `color:${c.color}`,
                    `color:${converted ? '#22c55e' : '#ef4444'}`,
                    'color:#666'
                  );
                });
                console.groupEnd();
                setMode(opt.id); goToClip(0, 'INTRO');
              }}
              style={{
                width:'clamp(200px,26vw,280px)',
                padding:'28px 24px 24px',
                background:'rgba(255,255,255,.028)',
                border:`1px solid ${opt.color}28`,
                cursor:'pointer', position:'relative', overflow:'hidden',
                transition:'all .18s ease',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background=`${opt.color}0e`;
                e.currentTarget.style.borderColor=`${opt.color}66`;
                e.currentTarget.style.transform='translateY(-3px)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background='rgba(255,255,255,.028)';
                e.currentTarget.style.borderColor=`${opt.color}28`;
                e.currentTarget.style.transform='none';
              }}
            >
              <div style={{ fontSize:26, marginBottom:12 }}>{opt.icon}</div>
              <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:900,
                fontSize:26, letterSpacing:'.1em', color:opt.color, marginBottom:6 }}>
                {opt.title}
              </div>
              <div style={{ fontSize:9, letterSpacing:'.12em', color:'rgba(255,255,255,.4)', marginBottom:20, lineHeight:1.6 }}>
                {opt.sub}
              </div>
              <div style={{ fontFamily:"'Barlow Condensed',sans-serif",
                fontSize:42, fontWeight:900, color:'#fff', lineHeight:1, marginBottom:4 }}>
                {opt.count}
              </div>
              <div style={{ fontSize:8, letterSpacing:'.2em', color:'rgba(255,255,255,.25)', marginBottom:20 }}>
                {opt.countLabel.toUpperCase()}
              </div>
              {opt.types.length > 0 && (
                <div style={{ display:'flex', flexWrap:'wrap', gap:5 }}>
                  {opt.types.map(t => (
                    <span key={t} style={{
                      fontSize:7, letterSpacing:'.15em', padding:'3px 8px',
                      background:`${opt.color}14`, border:`1px solid ${opt.color}30`,
                      color:`${opt.color}cc`,
                    }}>{t}</span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Close */}
        <button onClick={onDone} style={{
          marginTop:48, background:'transparent', border:'none', cursor:'pointer',
          fontSize:8, letterSpacing:'.3em', color:'rgba(255,255,255,.2)',
          fontFamily:"'Space Mono',monospace", textTransform:'uppercase',
          padding:'10px 24px',
          transition:'color .15s',
        }}
          onMouseEnter={e=>e.currentTarget.style.color='rgba(255,255,255,.5)'}
          onMouseLeave={e=>e.currentTarget.style.color='rgba(255,255,255,.2)'}
        >
          ← VOLTAR AO BRACKET
        </button>
      </div>
    );
  }

  // ── DONE / RESULT SCREEN ──────────────────────────────────────────
  if (showDone) {
    const aWon = (result?.sets?.[0]??0) > (result?.sets?.[1]??0);
    const winnerP = aWon ? playerA : playerB;
    const loserP  = aWon ? playerB : playerA;
    const scoreStr = (result?.setsDetail ?? [])
      .map(([a,b]) => aWon ? `${a}\u2013${b}` : `${b}\u2013${a}`)
      .join('   ');
    const ovrW = winnerP?.attrs ? overallRating(winnerP.attrs) : '—';
    const ovrL = loserP?.attrs  ? overallRating(loserP.attrs)  : '—';
    return (
      <div style={{
        width:'100vw', height:'100vh',
        background:'linear-gradient(160deg,#020b05 0%,#04080e 60%,#06040b 100%)',
        display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
        fontFamily:"'Space Mono',monospace", color:'#F2EDE4', gap:32,
        overflow:'hidden',
      }}>
        <div style={{ position:'absolute', top:'20%', left:'50%', transform:'translateX(-50%)',
          width:600, height:600, borderRadius:'50%',
          background:'radial-gradient(circle,rgba(232,200,74,.07),transparent 65%)',
          filter:'blur(80px)', pointerEvents:'none' }}/>

        <div style={{ fontSize:9, letterSpacing:'.5em', color:'rgba(255,255,255,.2)', textAlign:'center' }}>
          RESULTADO FINAL
        </div>
        <div style={{ textAlign:'center', position:'relative', zIndex:1 }}>
          <div style={{ fontSize:10, letterSpacing:'.38em', color:'#E8C84A', marginBottom:14 }}>VENCEDOR</div>
          <div style={{
            fontFamily:"'Barlow Condensed',sans-serif", fontWeight:900,
            fontSize:'clamp(40px,7vw,80px)', textTransform:'uppercase',
            letterSpacing:'.04em', color:'#E8C84A', lineHeight:.9,
          }}>{winnerP?.name ?? '—'}</div>
          <div style={{ fontSize:9, letterSpacing:'.18em', color:'rgba(255,255,255,.3)', marginTop:10 }}>
            {ovrTier(ovrW).grade} · {ovrTier(ovrW).label}
          </div>
          <div style={{ fontFamily:"'Barlow Condensed',sans-serif",
            fontSize:'clamp(24px,3vw,36px)', fontWeight:700,
            letterSpacing:'.22em', color:'#E8C84A', marginTop:20, marginBottom:8 }}>
            {scoreStr}
          </div>
          <div style={{ fontSize:9, letterSpacing:'.14em', color:'rgba(255,255,255,.2)' }}>
            vs {loserP?.name ?? '—'}  ·  {ovrTier(ovrL).grade}
          </div>
        </div>
        <div style={{ fontSize:8, letterSpacing:'.25em', color:'rgba(255,255,255,.18)' }}>
          {clips.length} momento{clips.length !== 1 ? 's' : ''} exibido{clips.length !== 1 ? 's' : ''}
        </div>
        <button onClick={onDone} style={{
          fontFamily:"'Space Mono',monospace", fontSize:9, fontWeight:700,
          letterSpacing:'.28em', textTransform:'uppercase',
          background:'rgba(232,200,74,.1)', border:'1px solid rgba(232,200,74,.35)',
          color:'#E8C84A', padding:'14px 40px', cursor:'pointer',
          clipPath:'polygon(6px 0,100% 0,calc(100% - 6px) 100%,0 100%)',
          marginTop:8,
        }}>
          ✓ CONCLUIR
        </button>
      </div>
    );
  }

  if (!clip) return null;

  // ── PROGRESS BAR ─────────────────────────────────────────────────
  const ProgressStrips = () => (
    <div style={{
      position:'absolute', top:0, left:0, right:0, zIndex:300,
      display:'flex', gap:3, padding:'10px 14px',
      pointerEvents:'none',
    }}>
      {clips.map((_, i) => (
        <div key={i} style={{
          flex:1, height:2, borderRadius:1,
          background:'rgba(255,255,255,.12)',
          overflow:'hidden', position:'relative',
        }}>
          {i < clipIdx && (
            <div style={{ position:'absolute', inset:0, background:'rgba(255,255,255,.55)' }}/>
          )}
          {i === clipIdx && phase === 'LIVE' && (
            <div style={{ position:'absolute', inset:0, background:'rgba(255,255,255,.55)',
              animation:`reel-strip-fill ${REEL_INTRO_DURATION * 3}ms linear forwards` }}/>
          )}
          {i === clipIdx && phase === 'INTRO' && (
            <div style={{ position:'absolute', inset:0, background:`${clip.color}aa`,
              animation:`reel-strip-fill ${REEL_INTRO_DURATION}ms linear forwards` }}/>
          )}
        </div>
      ))}
    </div>
  );

  // ── NAV CONTROLS ──────────────────────────────────────────────────
  const NavControls = () => (
    <div style={{
      position:'absolute', bottom:0, left:0, right:0, zIndex:300,
      display:'flex', alignItems:'center', justifyContent:'space-between',
      padding:'0 20px 18px',
      background:'linear-gradient(0deg,rgba(0,0,0,.7) 0%,transparent 100%)',
      pointerEvents:'none',
    }}>
      {/* Prev */}
      <button onClick={handlePrev} disabled={clipIdx === 0} style={{
        pointerEvents:'all', background:'transparent',
        border:'1px solid rgba(255,255,255,.12)', color:'rgba(255,255,255,.4)',
        fontFamily:"'Space Mono',monospace", fontSize:8, letterSpacing:'.22em',
        padding:'9px 18px', cursor:'pointer', textTransform:'uppercase',
        clipPath:'polygon(5px 0,100% 0,calc(100% - 5px) 100%,0 100%)',
        opacity: clipIdx === 0 ? 0 : 1, transition:'opacity .2s',
      }}>← ANTERIOR</button>

      {/* Center: close */}
      <button onClick={onDone} style={{
        pointerEvents:'all', background:'transparent', border:'none',
        cursor:'pointer', fontSize:8, letterSpacing:'.22em', color:'rgba(255,255,255,.2)',
        fontFamily:"'Space Mono',monospace", textTransform:'uppercase', padding:'9px',
      }}>✕</button>

      {/* Next */}
      <button onClick={handleNext} style={{
        pointerEvents:'all',
        background: phase === 'INTRO' ? `${clip.color}20` : 'rgba(255,255,255,.06)',
        border:`1px solid ${phase === 'INTRO' ? clip.color + '55' : 'rgba(255,255,255,.14)'}`,
        color: phase === 'INTRO' ? clip.color : 'rgba(255,255,255,.55)',
        fontFamily:"'Space Mono',monospace", fontSize:8, letterSpacing:'.22em',
        padding:'9px 18px', cursor:'pointer', textTransform:'uppercase',
        clipPath:'polygon(5px 0,100% 0,calc(100% - 5px) 100%,0 100%)',
        transition:'all .15s',
      }}>
        {clipIdx + 1 >= clips.length && phase === 'LIVE' ? '🏆 RESULTADO' : 'PRÓXIMO →'}
      </button>
    </div>
  );

  // ── INTRO CARD ────────────────────────────────────────────────────
  const IntroCard = () => {
    const playerAName = playerA?.name ?? '?';
    const playerBName = playerB?.name ?? '?';
    const holderName  = clip.momentHolderIdx === 0 ? playerAName : playerBName;
    const winnerName  = clip.pointWinnerIdx  === 0 ? playerAName : playerBName;
    const winnerMatchesHolder = clip.pointWinnerIdx === clip.momentHolderIdx;

    const SCORE_LABELS = ['0', '15', '30', '40', 'Ad'];
    const snap = clip.gsSnapshot;
    const snapSv   = snap ? snap.players[snap.server]   : null;
    const snapRv   = snap ? snap.players[snap.receiver] : null;
    const scorePts0 = snap && !snap.inTiebreak ? (SCORE_LABELS[snap.players[0]?.score] ?? snap.players[0]?.score) : null;
    const scorePts1 = snap && !snap.inTiebreak ? (SCORE_LABELS[snap.players[1]?.score] ?? snap.players[1]?.score) : null;
    const snapScoreStr = snap
      ? snap.inTiebreak
        ? `TB ${snap.tbScore[0]}–${snap.tbScore[1]}`
        : `${snap.players[0]?.games}–${snap.players[1]?.games}  (${scorePts0}–${scorePts1})`
      : clip.score;
    const modeLabel = mode === 'compact' ? 'CURTO' : mode === 'highlights' ? 'MÉDIO' : 'ESTENDIDO';

    console.group(
      `%c[HL ${clipIdx+1}/${clips.length}] ${clip.type} — ${clip.label}`,
      `color:${clip.color};font-weight:bold`
    );
    console.log(`%c📋 MOTIVO DA SELEÇÃO`, 'color:#FFD700;font-weight:bold',
      clip._selectionReason ?? '(sem razão registrada)');
    console.log(`%c🎬 MODO`, 'color:#888', modeLabel,
      `| clip ${clipIdx+1} de ${clips.length}`);
    console.log(`%c📺 FRASE EXIBIDA`, 'color:#aaa', `"${clip.contextLine}"`);
    console.groupCollapsed(`%c🎾 ESTADO DO JOGO no PRE_SERVE (inicio do ponto)`, 'color:#74ACDF');
      console.log(`  Sets    : ${clip.s0}–${clip.s1}`);
      console.log(`  Games   : ${clip.g0}–${clip.g1}`);
      console.log(`  Placar  : ${snapScoreStr}`);
      if (snap) {
        console.log(`  Servidor: ${snapSv?.name} | score idx=${snapSv?.score}`);
        console.log(`  Receiver: ${snapRv?.name} | score idx=${snapRv?.score}`);
        if (snap.inTiebreak) console.log(`  ⚡ TIEBREAK: ${snap.tbScore[0]}–${snap.tbScore[1]}`);
      }
    console.groupEnd();
    console.groupCollapsed(`%c⚡ MOMENTO`, 'color:#FF8C42');
      console.log(`  Tipo         : ${clip.type}`);
      console.log(`  Detentor mom.: ${holderName} (idx ${clip.momentHolderIdx})`);
      console.log(`  Servidor     : ${clip.serverName} (idx ${clip.serverIdx})`);
      if (clip.rallyLength > 0) console.log(`  Rally        : ${clip.rallyLength} bolas`);
    console.groupEnd();
    console.groupCollapsed(
      `%c${winnerMatchesHolder ? '✅ RESULTADO: CONVERTIDO' : '❌ RESULTADO: NÃO CONVERTIDO'}`,
      `color:${winnerMatchesHolder ? '#22c55e' : '#ef4444'};font-weight:bold`
    );
      console.log(`  Quem fez o ponto: ${winnerName} (idx ${clip.pointWinnerIdx})`);
      console.log(`  Holder era      : ${holderName} (idx ${clip.momentHolderIdx})`);
      console.log(`  Match           : ${winnerMatchesHolder
        ? `✅ ${holderName} GANHOU o ponto → momento convertido`
        : `❌ ${holderName} PERDEU o ponto → ${winnerName} salvou/venceu`}`);
      if (!winnerMatchesHolder) {
        console.warn(`  ⚠️  ATENÇÃO: O replay vai mostrar o ponto sendo PERDIDO pelo holder.`
          + ` Se este clip apareceu mesmo assim, verifique a lógica de filtro.`);
      }
    console.groupEnd();
    console.log(`%c📦 raw clip`, 'color:#555', clip);
    console.groupEnd();

    const glow = clip.color;
    return (
      <div style={{
        position:'absolute', inset:0, zIndex:200,
        background:`linear-gradient(160deg, #020508 0%, #040810 50%, #060408 100%)`,
        display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
        overflow:'hidden',
      }}>
        {/* Ambient glow */}
        <div style={{
          position:'absolute', top:'10%', left:'50%', transform:'translateX(-50%)',
          width:700, height:500, borderRadius:'50%',
          background:`radial-gradient(circle, ${glow}18 0%, transparent 65%)`,
          filter:'blur(60px)', pointerEvents:'none',
          animation:'reel-glow-pulse 3s ease-in-out infinite',
        }}/>
        {/* Scanlines */}
        <div style={{
          position:'absolute', inset:0, pointerEvents:'none',
          backgroundImage:'repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(0,0,0,.15) 3px,rgba(0,0,0,.15) 4px)',
          opacity:.4,
        }}/>

        {/* Content */}
        <div style={{
          position:'relative', zIndex:1,
          display:'flex', flexDirection:'column', alignItems:'center',
          gap:0, textAlign:'center', padding:'0 40px', maxWidth:700,
          animation:'reel-intro-in .5s cubic-bezier(.16,1,.3,1) both',
        }}>
          {/* Type badge */}
          <div style={{
            display:'inline-flex', alignItems:'center', gap:8,
            padding:'7px 20px', marginBottom:36,
            background:`${glow}18`, border:`1px solid ${glow}55`,
            fontFamily:"'Space Mono',monospace", fontSize:10, fontWeight:700,
            letterSpacing:'.32em', color:glow, textTransform:'uppercase',
            animation:'reel-badge-in .4s cubic-bezier(.16,1,.3,1) .1s both',
          }}>
            <div style={{ width:6, height:6, borderRadius:'50%', background:glow,
              boxShadow:`0 0 10px ${glow}`, animation:'reel-dot-pulse 1.5s ease-in-out infinite' }}/>
            {clip.label}
          </div>

          {/* Player names */}
          <div style={{
            display:'flex', alignItems:'center', gap:24, marginBottom:28,
            animation:'reel-intro-in .5s cubic-bezier(.16,1,.3,1) .15s both',
          }}>
            <div style={{
              fontFamily:"'Barlow Condensed',sans-serif", fontWeight:900,
              fontSize:'clamp(28px,5vw,60px)', textTransform:'uppercase',
              letterSpacing:'.04em', lineHeight:.9,
              color: clip.momentHolderIdx === 0 ? '#F2EDE4' : 'rgba(255,255,255,.38)',
            }}>{playerA?.name?.split(' ').pop()?.toUpperCase() ?? '—'}</div>
            <div style={{ fontFamily:"'Space Mono',monospace", fontSize:11,
              color:'rgba(255,255,255,.2)', letterSpacing:'.2em', flexShrink:0 }}>vs</div>
            <div style={{
              fontFamily:"'Barlow Condensed',sans-serif", fontWeight:900,
              fontSize:'clamp(28px,5vw,60px)', textTransform:'uppercase',
              letterSpacing:'.04em', lineHeight:.9,
              color: clip.momentHolderIdx === 1 ? '#F2EDE4' : 'rgba(255,255,255,.38)',
            }}>{playerB?.name?.split(' ').pop()?.toUpperCase() ?? '—'}</div>
          </div>

          {/* Context line */}
          <div style={{
            fontFamily:"'Barlow',sans-serif", fontSize:'clamp(14px,1.8vw,20px)',
            color:'rgba(255,255,255,.65)', lineHeight:1.5, marginBottom:28,
            fontWeight:400,
            animation:'reel-intro-in .5s cubic-bezier(.16,1,.3,1) .22s both',
          }}>
            {clip.contextLine}
          </div>

          {/* Score block — Sets prominent, games secondary */}
          <div style={{
            display:'flex', flexDirection:'column', alignItems:'center', gap:10,
            animation:'reel-intro-in .5s cubic-bezier(.16,1,.3,1) .30s both',
          }}>
            {/* Set label */}
            <div style={{
              fontFamily:"'Space Mono',monospace", fontSize:8, letterSpacing:'.3em',
              color:'rgba(255,255,255,.28)', textTransform:'uppercase',
            }}>
              {(clip.s0 + clip.s1 + 1)}º set
            </div>

            {/* Sets score — the big number */}
            <div style={{ display:'flex', alignItems:'center', gap:20 }}>
              <div style={{
                fontFamily:"'Barlow Condensed',sans-serif", fontWeight:900,
                fontSize:'clamp(48px,7vw,80px)', lineHeight:1,
                color: clip.s0 >= clip.s1 ? '#F2EDE4' : 'rgba(255,255,255,.35)',
              }}>{clip.s0}</div>
              <div style={{
                fontFamily:"'Space Mono',monospace", fontSize:11,
                color:'rgba(255,255,255,.15)', letterSpacing:'.1em',
              }}>–</div>
              <div style={{
                fontFamily:"'Barlow Condensed',sans-serif", fontWeight:900,
                fontSize:'clamp(48px,7vw,80px)', lineHeight:1,
                color: clip.s1 >= clip.s0 ? '#F2EDE4' : 'rgba(255,255,255,.35)',
              }}>{clip.s1}</div>
            </div>

            {/* Divider */}
            <div style={{ width:40, height:1, background:'rgba(255,255,255,.08)' }}/>

            {/* Games + points — secondary */}
            <div style={{
              fontFamily:"'Barlow Condensed',sans-serif", fontWeight:600,
              fontSize:'clamp(14px,2vw,20px)', letterSpacing:'.1em',
              color:'rgba(255,255,255,.55)',
            }}>{clip.score}</div>
          </div>

          {/* Rally length badge (only for rally clips) */}
          {clip.rallyLength >= 10 && (
            <div style={{
              marginTop:20, padding:'6px 18px',
              background:'rgba(79,195,247,.08)', border:'1px solid rgba(79,195,247,.2)',
              fontFamily:"'Space Mono',monospace", fontSize:8, letterSpacing:'.22em',
              color:'rgba(79,195,247,.7)',
              animation:'reel-intro-in .4s cubic-bezier(.16,1,.3,1) .38s both',
            }}>
              {clip.rallyLength} BOLAS
            </div>
          )}
        </div>

        {/* Bottom hint */}
        <div style={{
          position:'absolute', bottom:64, left:0, right:0,
          textAlign:'center', zIndex:1,
          fontFamily:"'Space Mono',monospace", fontSize:7,
          color:'rgba(255,255,255,.14)', letterSpacing:'.3em',
          animation:'reel-intro-in .4s ease .6s both',
        }}>
          → AVANÇAR  ·  ← VOLTAR  ·  ESC SAIR
        </div>
      </div>
    );
  };

  // ── LIVE HUD ──────────────────────────────────────────────────────
  const LiveHUD = () => (
    <>
      {/* Type badge top-left */}
      <div style={{
        position:'absolute', top:26, left:16, zIndex:150,
        display:'flex', alignItems:'center', gap:7,
        padding:'6px 14px',
        background:`${clip.color}18`, border:`1px solid ${clip.color}44`,
        fontFamily:"'Space Mono',monospace", fontSize:8, fontWeight:700,
        letterSpacing:'.24em', color:clip.color, textTransform:'uppercase',
        pointerEvents:'none',
      }}>
        <div style={{ width:5, height:5, borderRadius:'50%', background:clip.color,
          boxShadow:`0 0 8px ${clip.color}`, animation:'reel-dot-pulse 1.5s ease-in-out infinite' }}/>
        {clip.label}
      </div>
      {/* Clip counter top-right */}
      <div style={{
        position:'absolute', top:30, right:16, zIndex:150,
        fontFamily:"'Space Mono',monospace", fontSize:8, letterSpacing:'.2em',
        color:'rgba(255,255,255,.3)', pointerEvents:'none',
      }}>
        {clipIdx + 1} / {clips.length}
      </div>
      {/* Context line bottom-left (subtle) */}
      <div style={{
        position:'absolute', bottom:52, left:16, zIndex:150,
        fontFamily:"'Barlow Condensed',sans-serif", fontSize:13,
        color:'rgba(255,255,255,.28)', letterSpacing:'.05em',
        pointerEvents:'none', maxWidth:'60vw',
      }}>
        {clip.contextLine}
      </div>
    </>
  );

  return (
    <div style={{ width:'100vw', height:'100vh', position:'relative', overflow:'hidden', background:'#050505' }}>

      {/* Inject reel CSS animations once */}
      <style>{`
        @keyframes reel-strip-fill { from{width:0} to{width:100%} }
        @keyframes reel-glow-pulse { 0%,100%{opacity:.6} 50%{opacity:1} }
        @keyframes reel-dot-pulse  { 0%,100%{opacity:.4;transform:scale(1)} 50%{opacity:1;transform:scale(1.3)} }
        @keyframes reel-intro-in   { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        @keyframes reel-badge-in   { from{opacity:0;transform:scale(.88)} to{opacity:1;transform:scale(1)} }
      `}</style>

      {/* NEWME1.0 — always mounted, fades in during LIVE */}
      <div style={{
        position:'absolute', inset:0,
        opacity: phase === 'LIVE' ? 1 : 0,
        transition:'opacity .35s ease',
        pointerEvents: phase === 'LIVE' ? 'auto' : 'none',
      }}>
        <DefinitiveME
          gsRef={gsRef}
          trailRef={trailRef}
          snap={snap}
          onMenu={onDone}
          simSpeed={simSpeed}
          setSimSpeed={setSimSpeed}
          speedRef={speedRef}
          frameHistoryRef={frameHistoryRef}
          bugMode={stableBugMode.current}
          setBugMode={stableSetBugMode.current}
          bugSpeedSaveRef={stableBugSave}
          coachPool={coachPool}
          universePlayerA={playerA}
          universePlayerB={playerB}
          disableCameraMotion={true}
        />
      </div>

      {/* Progress strips */}
      <ProgressStrips />

      {/* INTRO card */}
      {phase === 'INTRO' && <IntroCard key={`intro-${clipIdx}-${introAnim}`} />}

      {/* Live HUD */}
      {phase === 'LIVE' && <LiveHUD />}

      {/* Navigation */}
      <NavControls />
    </div>
  );
}

export default function UniverseManager({ onBack }) {
  useEffect(() => { injectCSS(); }, []);

  const [phase, setPhase] = useState('home');
  const [universeState, setUniverseState] = useState(null);
  const [simulating, setSimulating] = useState(false);
  const [simProgress, setSimProgress] = useState(0);
  const [simMode, setSimMode] = useState('headless'); // 'headless' | 'fast'
  const [stopOnBreaking, setStopOnBreaking] = useState(true);
  const [simBreakingArticle, setSimBreakingArticle] = useState(null);
  const [simEvent, setSimEvent] = useState(null);       // latest match event
  const [simFeed, setSimFeed] = useState([]);           // last N match events
  const [simTournament, setSimTournament] = useState(null); // current tournament being simmed
  const [simTotal, setSimTotal] = useState(0);          // expected total matches
  const simFeedRef = useRef([]);
  const stopSimRef  = useRef(false);   // set to true to abort headless simulation
  const [liveBracketTournament, setLiveBracketTournament] = useState(null);
  const liveBracketSavedStateRef   = useRef(null); // persists bracket progress across navigations
  const liveBracketLastIdRef       = useRef(null); // id of the last opened tournament
  const [watchMatchState, setWatchMatchState] = useState(null);
  const [highlightsModeRef] = useState({ current: false }); // usar ref-in-state para não re-render
  const [highlightsPaused, setHighlightsPaused] = useState(false); // true = mostrando ponto ao vivo
  const [hlFilters, setHlFilters] = useState({ gamePoint: true, breakPoint: true, setPoint: true, matchPoint: true });
  const hlFiltersRef = useRef({ gamePoint: true, breakPoint: true, setPoint: true, matchPoint: true });
  const [hlFeed, setHlFeed] = useState([]); // feed de pontos durante headless
  const hlFeedRef = useRef([]);
  const [preGamePending, setPreGamePending] = useState(null);
  const countBreakingArticles = useCallback((stateLike) => (
    (stateLike?.newsEngine?.feed ?? []).filter(article => article?.type === 'BREAKING').length
  ), []);
  const getLatestBreakingArticle = useCallback((stateLike) => (
    (stateLike?.newsEngine?.feed ?? []).find(article => article?.type === 'BREAKING') ?? null
  ), []);
  // Sim-Highlights state: lista de clips prontos para replay
  const [simHlState, setSimHlState] = useState(null); // { allClips, result, playerA, playerB, onResult, keyA, keyB }

  // ME refs
  const gsRef = useRef(null);
  const trailRef = useRef(null);
  const frameHistoryRef = useRef(null);
  const speedRef = useRef(1);
  const [simSpeed, setSimSpeed] = useState(1);
  const [snap, setSnap] = useState(null);
  const [ceremonyData, setCeremonyData] = useState(null); // { tournament, bracket }
  const rafRef = useRef(null);

  const universeDispatch = useCallback((action) => {
    setUniverseState(prev => reducer(prev, action));
  }, []);

  const handleInitUniverse = () => {
    setUniverseState(buildUniverse());
    setPhase('running');
  };

  useEffect(() => {
    if (!universeState || simulating) return;
    const currentTournament = CALENDAR[universeState.calendarIndex];
    if (!currentTournament) return;
    const currentPackage = universeState.preparedTournamentPackage;
    if (currentPackage?.tournamentId === currentTournament.id && currentPackage?.seasonYear === universeState.year) return;
    const nextPackage = buildPreparedTournamentPackage(
      currentTournament,
      universeState.tourPlayers,
      universeState.prospects,
      universeState.playerSeasonSlots ?? {},
      universeState.year,
    );
    universeDispatch({ type: 'SET_PREPARED_TOURNAMENT_PACKAGE', package: nextPackage });
  }, [
    universeState?.calendarIndex,
    universeState?.year,
    universeState?.tourPlayers,
    universeState?.prospects,
    universeState?.preparedTournamentPackage,
    simulating,
    universeDispatch,
  ]);

  // ── Simulação Rápida (FastSimulation) ──────────────────────────────
  // Constrói um bracket completo usando simulateMatchFast em vez do engine real.
  // Compatível com o formato esperado por APPLY_TOURNAMENT_RESULT.
  const runTournamentFast = useCallback((tournament, tourPlayers, prospects, playerSeasonSlots = {}, preparedPackage = null) => {
    const surface = courtKeyToSurface(tournament.courtKey ?? tournament.surface);
    const bestOf  = tournament.bestOf ?? 3;
    const { qualifyOut = 0, preQualIn = 0 } = tournament;
    const pqOut   = tournament.preQualOut ?? Math.ceil(preQualIn / 2);
    const prepared = clonePreparedTournamentPackage(
      preparedPackage
      ?? (universeState?.preparedTournamentPackage?.tournamentId === tournament.id
        ? universeState.preparedTournamentPackage
        : null)
    );

    // ── 1. Seleciona pools ────────────────────────────────────────────
    let rawMain = prepared?.rawMainDraw ?? [];
    let rawQual = prepared?.rawQualifying ?? [];
    let rawPreQual = prepared?.rawPreQualifying ?? [];
    if (!prepared) {
      const sorted      = [...tourPlayers].sort((a, b) => (a.rankPosition ?? 999) - (b.rankPosition ?? 999));
      const sortedProsp = [...prospects].sort((a, b) => (a.rankPosition ?? 999) - (b.rankPosition ?? 999));
      ({ mainDraw: rawMain, qualifying: rawQual, preQualifying: rawPreQual } = selectTournamentPlayers(
        tournament, sorted, sortedProsp, new Set(), playerSeasonSlots,
      ));
    }

    // Atualiza season slots
    if (['ATP_500','ATP_250','MASTERS_1000'].includes(tournament.category)) {
      for (const player of [...rawMain, ...rawQual]) {
        if (!playerSeasonSlots[player.id]) playerSeasonSlots[player.id] = createSeasonSlots();
        updateSeasonSlots(playerSeasonSlots[player.id], player, tournament);
      }
    }

    // ── 2. Função auxiliar de match rápido ───────────────────────────
    const fastMatch = (a, b) => {
      const sA = a.formPoints ? { ...a, attrs: applyFormModifier(a.attrs, a.formPoints) } : a;
      const sB = b.formPoints ? { ...b, attrs: applyFormModifier(b.attrs, b.formPoints) } : b;
      const res = simulateMatchFast(sA, sB, surface, bestOf);
      return res.winner.id === a.id ? a : b;
    };

    // ── 3a. PRÉ-QUALIFY: preQualIn → pqOut passam ───────────────────
    const preQualWinners = [...(prepared?.preQualWinners ?? [])];
    // FASE 2: rastrear partidas de qualifying para updateRecentForm dos eliminados
    const qualRoundsData = [...(prepared?.qualRoundsData ?? [])];  // [{playerA, playerB, winner, surface, sets}]
    if (!prepared && rawPreQual.length > 0 && pqOut > 0) {
      const pool = [...rawPreQual].sort(() => Math.random() - 0.5);
      for (let i = 0; i + 1 < pool.length && preQualWinners.length < pqOut; i += 2) {
        const sA = pool[i], sB = pool[i + 1];
        const res = simulateMatchFast(sA, sB, surface, bestOf);
        const winnerPlayer = res.winner.id === sA.id ? sA : sB;
        preQualWinners.push(winnerPlayer);
        qualRoundsData.push({ playerA: sA, playerB: sB, winner: winnerPlayer, surface, sets: res.sets ?? [0, 0] });
      }
    }

    // ── 3b. QUALIFY: qualDirectIn + preQualWinners → qualifyOut passam
    const qualifiers = [...(prepared?.qualifiers ?? [])];
    if (!prepared && (rawQual.length > 0 || preQualWinners.length > 0) && qualifyOut > 0) {
      const pool = [...rawQual, ...preQualWinners].sort(() => Math.random() - 0.5);
      for (let i = 0; i + 1 < pool.length && qualifiers.length < qualifyOut; i += 2) {
        const sA = pool[i], sB = pool[i + 1];
        const res = simulateMatchFast(sA, sB, surface, bestOf);
        const winnerPlayer = res.winner.id === sA.id ? sA : sB;
        qualifiers.push(winnerPlayer);
        qualRoundsData.push({ playerA: sA, playerB: sB, winner: winnerPlayer, surface, sets: res.sets ?? [0, 0] });
      }
    }

    // ── 4. Main draw ─────────────────────────────────────────────────
    const allMainDraw = prepared ? [...(prepared.mainDrawPlayers ?? [])] : [...rawMain, ...qualifiers].slice(0, tournament.draw);

    // ── 5. Lesões em todos os participantes (lógica canônica compartilhada) ──
    let fastWithdrawals = prepared?.injuryWithdrawals ?? new Set();
    let fastInjuryEvents = prepared?.injuryEvents ?? [];
    let fastUpdatedByInjury = prepared?.updatedByInjury ?? {};
    let activeDraw = [...allMainDraw];
    if (!prepared) {
      const allFastParticipants = [...rawMain, ...rawQual, ...rawPreQual, ...allMainDraw]
        .filter((p, i, arr) => p && arr.findIndex(x => x?.id === p.id) === i);
      const injuries = applyPreTournamentInjuries(allFastParticipants, tournament, null);
      fastWithdrawals = injuries.injuryWithdrawals;
      fastInjuryEvents = injuries.injuryEvents;
      fastUpdatedByInjury = injuries.updatedByInjury;
      activeDraw = allMainDraw
        .filter(p => p && !fastWithdrawals.has(p.id))
        .map(p => {
          const up = fastUpdatedByInjury[p.id] ?? p;
          return applyInjuryToPlayer(up);
        });
    }

    // ── 6. Bracket rápido ────────────────────────────────────────────
    let totalSlots = prepared?.bracket?.totalSlots ?? 1;
    while (totalSlots < activeDraw.length) totalSlots *= 2;
    const seeded     = [...activeDraw].sort((a, b) => (a.rankPosition ?? 999) - (b.rankPosition ?? 999));
    const r1Template = prepared?.bracket?.rounds?.[0]
      ? prepared.bracket.rounds[0].map(match => ({ ...match, result: null }))
      : buildATPFirstRound(seeded, totalSlots);

    const _rl = (sz) => sz === 2 ? 'F' : sz === 4 ? 'SF' : sz === 8 ? 'QF' : sz === 16 ? 'R16' : sz === 32 ? 'R32' : sz === 64 ? 'R64' : sz === 128 ? 'R128' : 'R?';
    const _opts = (a, b, rl) => ({ tournamentTier: tournament.category, roundLabel: rl, rankA: a?.rankPosition ?? null, rankB: b?.rankPosition ?? null });

    // Prepara jogador para FastSim: aplica forma + bônus de torneio favorito
    const prepFast = (p) => {
      let s = p.formPoints ? { ...p, attrs: applyFormModifier(p.attrs, p.formPoints) } : p;
      s = applyTournamentBonus(s, tournament.id);
      return s;
    };

    const rounds = [];
    const r1 = r1Template.map(m => {
      if (m.isBye || !m.playerA || !m.playerB) return m;
      const a = m.playerA, b = m.playerB;
      const result = simulateMatchFast(prepFast(a), prepFast(b), surface, bestOf, _opts(a, b, _rl(totalSlots)));
      const winner = result.winner.id === a.id ? a : b;
      return { ...m, winner, isBye: false, result };
    });
    rounds.push(r1);

    let current = r1.map(m => m.winner).filter(Boolean);
    while (current.length > 1) {
      const rl = _rl(current.length);
      const roundMatches = [];
      const next = [];
      for (let i = 0; i < current.length; i += 2) {
        const a = current[i], b = current[i + 1] ?? null;
        if (!b) { roundMatches.push({ playerA: a, playerB: null, winner: a, isBye: true, result: null }); next.push(a); continue; }
        const result = simulateMatchFast(prepFast(a), prepFast(b), surface, bestOf, _opts(a, b, rl));
        const winner = result.winner.id === a.id ? a : b;
        roundMatches.push({ playerA: a, playerB: b, winner, isBye: false, result });
        next.push(winner);
      }
      rounds.push(roundMatches);
      current = next;
    }

    return {
      bracket: { rounds, champion: current[0] ?? null, totalSlots },
      qualifiers,
      preQualWinners,
      wildcards: [],
      injuryWithdrawals: fastWithdrawals,
      injuryEvents: fastInjuryEvents,
      updatedByInjury: fastUpdatedByInjury,
      qualRoundsData,  // FASE 2: partidas de qualifying para updateRecentForm
    };
  }, [universeState?.preparedTournamentPackage]);
  // Simula um range de torneios usando FastSimulation.
  // mode: 'month' | 'champions' | 'year' | 'decade'
  const handleFastSimulateRange = useCallback(async (mode) => {
    if (simulating || !universeState) return;

    // ── SINGLE: simula apenas o torneio atual com FastSimulation ─────
    if (mode === 'single') {
      const calIdx = universeState.calendarIndex;
      if (calIdx >= CALENDAR.length) return;
      const tournament = CALENDAR[calIdx];
      stopSimRef.current = false;
      setSimulating(true);
      setSimProgress(0);
      setSimMode('headless');
      setSimTournament(tournament);
      setSimTotal(1);
      setSimProgress(0);
      try {
        const loopSeasonSlots = Object.fromEntries(
          Object.entries(universeState.playerSeasonSlots ?? {}).map(([k, v]) => [k, { ...v }])
        );
        const { bracket, qualifiers, preQualWinners, wildcards, injuryWithdrawals, injuryEvents, updatedByInjury } = runTournamentFast(
          tournament,
          universeState.tourPlayers,
          universeState.prospects,
          loopSeasonSlots,
          universeState.preparedTournamentPackage?.tournamentId === tournament.id
            ? universeState.preparedTournamentPackage
            : null,
        );
        if (!stopSimRef.current) {
          universeDispatch({
            type: 'APPLY_TOURNAMENT_RESULT',
            tournamentId: tournament.id,
            result: { bracket, qualifiers, preQualWinners, wildcards, injuryWithdrawals: injuryWithdrawals ?? new Set(), injuryEvents: injuryEvents ?? [], updatedByInjury: updatedByInjury ?? {} },
            tournament,
          });
        }
      } finally {
        setSimulating(false);
        setSimProgress(0);
        setSimMode('headless');
        setSimTournament(null);
      }
      return;
    }

    // ── DECADE: 10 anos completos em fast sim ────────────────────────
    if (mode === 'decade') {
      stopSimRef.current = false;
      setSimulating(true);
      setSimProgress(0);
      setSimMode('headless');
      setSimBreakingArticle(null);
      setSimTotal(10 * CALENDAR.length);
      try {
        let currentState = universeState;
        let breakingSeenCount = countBreakingArticles(currentState);
        for (let year = 0; year < 10; year++) {
          // Simula o ano inteiro a partir do calendarIndex atual (ou 0 se já acabou)
          const startIdx = currentState.calendarIndex >= CALENDAR.length ? 0 : currentState.calendarIndex;

          // Se a temporada já terminou, avança o ano antes de simular
          if (currentState.calendarIndex >= CALENDAR.length) {
            currentState = reducer(currentState, { type: 'ADVANCE_YEAR' });
          }

          const loopSeasonSlots = Object.fromEntries(
            Object.entries(currentState.playerSeasonSlots ?? {}).map(([k, v]) => [k, { ...v }])
          );

          // Simula todos os torneios da temporada
          for (let idx = currentState.calendarIndex; idx < CALENDAR.length; idx++) {
            if (stopSimRef.current) break;
            const tournament = CALENDAR[idx];
            setSimProgress(year * CALENDAR.length + idx);
            setSimTournament(tournament);
            await new Promise(r => setTimeout(r, 0));

            // Olimpíadas: pula em anos não-olímpicos
            if (tournament.isOlympic && currentState.year % 4 !== 0) {
              currentState = reducer(currentState, { type: 'SKIP_TOURNAMENT' });
              continue;
            }

            const { bracket, qualifiers, preQualWinners, wildcards, injuryWithdrawals, injuryEvents, updatedByInjury } = runTournamentFast(
              tournament,
              currentState.tourPlayers,
              currentState.prospects,
              loopSeasonSlots,
            );

            const nextState = reducer(currentState, {
              type: 'APPLY_TOURNAMENT_RESULT',
              tournamentId: tournament.id,
              result: { bracket, qualifiers, preQualWinners, wildcards, injuryWithdrawals: injuryWithdrawals ?? new Set(), injuryEvents: injuryEvents ?? [], updatedByInjury: updatedByInjury ?? {} },
              tournament,
            });
            currentState = { ...nextState, playerSeasonSlots: loopSeasonSlots };
            const nextBreakingCount = countBreakingArticles(nextState);
            if (nextBreakingCount > breakingSeenCount) {
              const newestBreaking = getLatestBreakingArticle(nextState);
              if (newestBreaking) setSimBreakingArticle(newestBreaking);
              if (stopOnBreaking) stopSimRef.current = true;
            }
            breakingSeenCount = nextBreakingCount;
          }

          if (stopSimRef.current) break;
          // Avança o ano ao fim da temporada
          currentState = reducer(currentState, { type: 'ADVANCE_YEAR' });
          setSimProgress((year + 1) * CALENDAR.length);
        }
        setUniverseState(currentState);
      } finally {
        setSimulating(false);
        setSimProgress(0);
        setSimMode('headless');
        setSimTournament(null);
      }
      return;
    }

    const startIdx = universeState.calendarIndex;
    if (startIdx >= CALENDAR.length) return;

    // Determina até qual índice simular
    const currentMonthNum = CALENDAR[startIdx]?.monthNum ?? 1;
    let endIdx;
    if (mode === 'month') {
      // Todos os torneios do mês atual
      endIdx = startIdx;
      while (endIdx < CALENDAR.length && CALENDAR[endIdx].monthNum === currentMonthNum) endIdx++;
    } else if (mode === 'champions') {
      // Até o DEZ_ATP_FINALS (inclusive)
      const champIdx = CALENDAR.findIndex(t => t.id === 'DEZ_ATP_FINALS');
      endIdx = champIdx >= 0 ? champIdx + 1 : CALENDAR.length;
      if (endIdx <= startIdx) endIdx = CALENDAR.length; // já passou, vai até o fim
    } else {
      // Ano inteiro
      endIdx = CALENDAR.length;
    }

    stopSimRef.current = false;
    setSimulating(true);
    setSimProgress(0);
    setSimMode('headless');
    setSimBreakingArticle(null);
    setSimTotal(endIdx - startIdx);
    try {
      let currentState = universeState;
      let breakingSeenCount = countBreakingArticles(currentState);
      const total = endIdx - startIdx;
      // Cria cópias mutáveis dos planos e slots para o loop (slots são atualizados a cada torneio)
      const loopSeasonSlots = Object.fromEntries(
        Object.entries(currentState.playerSeasonSlots ?? {}).map(([k, v]) => [k, { ...v }])
      );

      let done = 0;

      for (let idx = startIdx; idx < endIdx; idx++) {
        if (stopSimRef.current) break;
        const tournament = CALENDAR[idx];
        setSimTournament(tournament);
        setSimProgress(done);

        // Yield para não travar a UI entre torneios
        await new Promise(r => setTimeout(r, 0));

        // Olimpíadas: pula em anos não-olímpicos
        if (tournament.isOlympic && currentState.year % 4 !== 0) {
          currentState = reducer(currentState, { type: 'SKIP_TOURNAMENT' });
          done++;
          continue;
        }

        const { bracket, qualifiers, preQualWinners, wildcards, injuryWithdrawals, injuryEvents, updatedByInjury } = runTournamentFast(
          tournament,
          currentState.tourPlayers,
          currentState.prospects,
          loopSeasonSlots,
        );

        // Aplica resultado e atualiza snapshot local
        const nextState = reducer(currentState, {
          type: 'APPLY_TOURNAMENT_RESULT',
          tournamentId: tournament.id,
          result: { bracket, qualifiers, preQualWinners, wildcards, injuryWithdrawals: injuryWithdrawals ?? new Set(), injuryEvents: injuryEvents ?? [], updatedByInjury: updatedByInjury ?? {} },
          tournament,
        });
        // Preserva os slots atualizados no snapshot local
        currentState = { ...nextState, playerSeasonSlots: loopSeasonSlots };
        const nextBreakingCount = countBreakingArticles(nextState);
        if (nextBreakingCount > breakingSeenCount) {
          const newestBreaking = getLatestBreakingArticle(nextState);
          if (newestBreaking) setSimBreakingArticle(newestBreaking);
          if (stopOnBreaking) stopSimRef.current = true;
        }
        breakingSeenCount = nextBreakingCount;
        done++;
        setSimProgress(done);
      }

      // Commit final de uma vez (mesmo se parou no meio — salva o progresso)
      setUniverseState(currentState);
    } finally {
      setSimulating(false);
      setSimProgress(0);
      setSimMode('headless');
      setSimTournament(null);
    }
  }, [simulating, universeState, runTournamentFast, countBreakingArticles, getLatestBreakingArticle, stopOnBreaking]);

  const handleSimulate = useCallback(async (mode) => {
    if (simulating || !universeState) return;
    const calIdx = universeState.calendarIndex;
    if (calIdx >= CALENDAR.length) return;

    // ── Range modes (headless, multiple tournaments) ──────────────────
    if (mode === 'sim_month' || mode === 'sim_grandslam' || mode === 'sim_year' || mode === 'sim_decade') {

      // ── DECADE: 10 anos completos em headless ──────────────────────
      if (mode === 'sim_decade') {
        setSimulating(true);
        setSimProgress(0);
        setSimMode('headless');
        setSimTournament(null);
        setSimEvent(null);
        setSimFeed([]);
        setSimBreakingArticle(null);
        simFeedRef.current = [];
        stopSimRef.current = false;
        try {
          let currentState = universeState;
          let breakingSeenCount = countBreakingArticles(currentState);
          for (let year = 0; year < 10; year++) {
            if (stopSimRef.current) break;
            // Se a temporada já terminou, avança antes de simular
            if (currentState.calendarIndex >= CALENDAR.length) {
              currentState = reducer(currentState, { type: 'ADVANCE_YEAR' });
            }

            const loopSeasonSlots = Object.fromEntries(
              Object.entries(currentState.playerSeasonSlots ?? {}).map(([k, v]) => [k, { ...v }])
            );

            for (let idx = currentState.calendarIndex; idx < CALENDAR.length; idx++) {
              if (stopSimRef.current) break;
              const tournament = CALENDAR[idx];
              setSimTournament(tournament);
              setSimProgress(year * CALENDAR.length + idx);
              await new Promise(r => setTimeout(r, 0));

              // Olimpíadas: pula em anos não-olímpicos
              if (tournament.isOlympic && currentState.year % 4 !== 0) {
                currentState = reducer(currentState, { type: 'SKIP_TOURNAMENT' });
                continue;
              }

              let matchCount = 0;
              const onProgress = async (event) => {
                if (stopSimRef.current) {
                  const e = new Error('SIM_STOPPED'); e.isStopRequest = true; throw e;
                }
                matchCount++;
                setSimProgress(year * CALENDAR.length + idx * 10 + matchCount);
                if (event) {
                  setSimEvent(event);
                  simFeedRef.current = [{ ...event, id: matchCount + idx * 100 }, ...simFeedRef.current].slice(0, 14);
                  setSimFeed([...simFeedRef.current]);
                }
              };

              try {
                let result;
                if (tournament.isATP100 || tournament.category === 'ATP_100') {
                  const { bracket, qualifiers, preQualWinners, wildcards, injuryWithdrawals, injuryEvents, updatedByInjury } = runTournamentFast(
                    tournament, currentState.tourPlayers, currentState.prospects, loopSeasonSlots,
                  );
                  result = { bracket, qualifiers, preQualWinners, wildcards,
                    injuryWithdrawals: injuryWithdrawals ?? new Set(),
                    injuryEvents: injuryEvents ?? [], updatedByInjury: updatedByInjury ?? {} };
                } else {
                  result = await runTournament(
                    tournament,
                    currentState.tourPlayers,
                    currentState.prospects,
                    onProgress,
                    loopSeasonSlots,
                    null,
                    currentState.year,
                    currentState.rivalrySystem ?? null,
                  );
                }
                const nextState = reducer(currentState, {
                  type: 'APPLY_TOURNAMENT_RESULT',
                  tournamentId: tournament.id,
                  result,
                  tournament,
                });
                currentState = { ...nextState, playerSeasonSlots: loopSeasonSlots };
                const nextBreakingCount = countBreakingArticles(nextState);
                if (nextBreakingCount > breakingSeenCount) {
                  const newestBreaking = getLatestBreakingArticle(nextState);
                  if (newestBreaking) setSimBreakingArticle(newestBreaking);
                  if (stopOnBreaking) stopSimRef.current = true;
                }
                breakingSeenCount = nextBreakingCount;
              } catch (e) {
                if (e.isStopRequest) break;
                throw e;
              }
            }

            if (stopSimRef.current) break;
            // Avança o ano
            currentState = reducer(currentState, { type: 'ADVANCE_YEAR' });
          }
          setUniverseState(currentState);
        } finally {
          setSimulating(false);
          setSimProgress(0);
          setSimTournament(null);
          setSimEvent(null);
          setSimFeed([]);
          simFeedRef.current = [];
          setSimMode('headless');
        }
        return;
      }
      const currentMonthNum = CALENDAR[calIdx]?.monthNum ?? 1;
      let endIdx;
      if (mode === 'sim_month') {
        // Todos os torneios do mês atual, para antes do próximo mês
        endIdx = calIdx;
        while (endIdx < CALENDAR.length && CALENDAR[endIdx].monthNum === currentMonthNum) endIdx++;
      } else if (mode === 'sim_grandslam') {
        // Para ANTES do próximo Grand Slam ou Finals de dezembro
        endIdx = calIdx;
        while (endIdx < CALENDAR.length) {
          const t = CALENDAR[endIdx];
          if (t.category === 'GRAND_SLAM' || t.category === 'FINALS') break;
          endIdx++;
        }
        // Se já estamos no grand slam/finals, avança um (não simula ele)
        if (endIdx === calIdx) endIdx = calIdx; // permanece sem simular nada
      } else {
        // Ano inteiro — até o último torneio
        endIdx = CALENDAR.length;
      }

      if (endIdx <= calIdx) return; // nada a simular

      setSimulating(true);
      setSimProgress(0);
      setSimMode('headless');
      setSimTournament(null);
      setSimEvent(null);
      setSimFeed([]);
      setSimBreakingArticle(null);
      simFeedRef.current = [];
      stopSimRef.current = false;
      try {
        let currentState = universeState;
        let breakingSeenCount = countBreakingArticles(currentState);
        const loopSeasonSlots = Object.fromEntries(
          Object.entries(currentState.playerSeasonSlots ?? {}).map(([k, v]) => [k, { ...v }])
        );
        let done = 0;
        for (let idx = calIdx; idx < endIdx; idx++) {
          if (stopSimRef.current) break;
          const tournament = CALENDAR[idx];
          setSimTournament(tournament);
          setSimProgress(done);
          await new Promise(r => setTimeout(r, 0));

          // Olimpíadas: pula em anos não-olímpicos
          if (tournament.isOlympic && currentState.year % 4 !== 0) {
            currentState = reducer(currentState, { type: 'SKIP_TOURNAMENT' });
            done++;
            continue;
          }

          let matchCount = 0;
          const onProgress = async (event) => {
            if (stopSimRef.current) {
              const e = new Error('SIM_STOPPED'); e.isStopRequest = true; throw e;
            }
            matchCount++;
            setSimProgress(done * 10 + matchCount);
            if (event) {
              setSimEvent(event);
              simFeedRef.current = [{ ...event, id: matchCount }, ...simFeedRef.current].slice(0, 14);
              setSimFeed([...simFeedRef.current]);
            }
          };
          try {
            let result;
            if (tournament.isATP100 || tournament.category === 'ATP_100') {
              // ATP100 sempre fast, sem overlay interativo
              const { bracket, qualifiers, preQualWinners, wildcards, injuryWithdrawals, injuryEvents, updatedByInjury } = runTournamentFast(
                tournament, currentState.tourPlayers, currentState.prospects, loopSeasonSlots,
              );
              result = { bracket, qualifiers, preQualWinners, wildcards,
                injuryWithdrawals: injuryWithdrawals ?? new Set(),
                injuryEvents: injuryEvents ?? [], updatedByInjury: updatedByInjury ?? {} };
            } else {
              result = await runTournament(
                tournament,
                currentState.tourPlayers,
                currentState.prospects,
                onProgress,
                loopSeasonSlots,
                null,
                currentState.year,
                currentState.rivalrySystem ?? null,
              );
            }
            const nextState = reducer(currentState, {
              type: 'APPLY_TOURNAMENT_RESULT',
              tournamentId: tournament.id,
              result,
              tournament,
            });
            currentState = { ...nextState, playerSeasonSlots: loopSeasonSlots };
            const nextBreakingCount = countBreakingArticles(nextState);
            if (nextBreakingCount > breakingSeenCount) {
              const newestBreaking = getLatestBreakingArticle(nextState);
              if (newestBreaking) setSimBreakingArticle(newestBreaking);
              if (stopOnBreaking) stopSimRef.current = true;
            }
            breakingSeenCount = nextBreakingCount;
            done++;
            setSimProgress(done);
          } catch (e) {
            if (e.isStopRequest) break;
            throw e;
          }
        }
        setUniverseState(currentState);
      } finally {
        setSimulating(false);
        setSimProgress(0);
        setSimTournament(null);
        setSimEvent(null);
        setSimFeed([]);
        simFeedRef.current = [];
        setSimMode('headless');
      }
      return;
    }

    // ── Modo padrão: simula apenas o torneio atual (headless) ──────────
    const tournament = CALENDAR[calIdx];

    // ATP100 nunca usa headless interativo — sempre fast e silencioso
    if (tournament.isATP100 || tournament.category === 'ATP_100') {
      setSimulating(true);
      const loopSlots = Object.fromEntries(
        Object.entries(universeState.playerSeasonSlots ?? {}).map(([k, v]) => [k, { ...v }])
      );
      try {
        const { bracket, qualifiers, preQualWinners, wildcards, injuryWithdrawals, injuryEvents, updatedByInjury } = runTournamentFast(
          tournament, universeState.tourPlayers, universeState.prospects, loopSlots,
        );
        universeDispatch({
          type: 'APPLY_TOURNAMENT_RESULT',
          tournamentId: tournament.id,
          result: { bracket, qualifiers, preQualWinners, wildcards,
            injuryWithdrawals: injuryWithdrawals ?? new Set(),
            injuryEvents: injuryEvents ?? [], updatedByInjury: updatedByInjury ?? {} },
          tournament,
        });
      } catch(e) {
        if (!e.isStopRequest) console.error('[handleSimulate] ATP100 fast error:', e);
      } finally {
        setSimulating(false);
      }
      return;
    }

    stopSimRef.current = false;   // clear any previous stop request
    setSimulating(true);
    setSimProgress(0);
    setSimMode('headless');
    setSimTournament(tournament);
    setSimEvent(null);
    setSimFeed([]);
    simFeedRef.current = [];
    const estTotal = Math.max(1, (tournament.draw ?? 32) - 1);
    setSimTotal(estTotal);

    // ── Verifica se existe snapshot parcial para retomar ──────────────
    const hasSavedState = liveBracketSavedStateRef.current
      && liveBracketLastIdRef.current === tournament.id
      && !liveBracketSavedStateRef.current.done;

    const partialStateRef = { _qualifiers: [], _snapshotRef: { current: null } };

    // Se tem snapshot parcial, pre-carrega para que o resume saiba o ponto de parada
    if (hasSavedState) {
      partialStateRef._snapshotRef.current = liveBracketSavedStateRef.current.bracket ?? null;
      partialStateRef._qualifiers = liveBracketSavedStateRef.current.qualifiers ?? [];
    }

    try {
      let matchCount = 0;
      const onProgress = async (event) => {
        if (stopSimRef.current) {
          const abortErr = new Error('SIM_STOPPED');
          abortErr.isStopRequest = true;
          throw abortErr;
        }
        matchCount++;
        setSimProgress(matchCount);
        if (event) {
          setSimEvent(event);
          simFeedRef.current = [{ ...event, id: matchCount }, ...simFeedRef.current].slice(0, 14);
          setSimFeed([...simFeedRef.current]);
        }
      };

      let result;
      if (hasSavedState && partialStateRef._snapshotRef.current) {
        // ── Resume: continua a partir do snapshot salvo ────────────────
        // Reconstrói os jogadores vivos do último round completo
        const savedBracket = partialStateRef._snapshotRef.current;
        const SURFACE_COURT = { CLAY: 'ROLAND_GARROS', GRASS: 'WIMBLEDON', HARD: 'US_OPEN', INDOOR: 'O2_ARENA' };
        const courtKey = SURFACE_COURT[tournament.surface] ?? 'US_OPEN';
        const bestOf   = tournament.bestOf ?? 3;

        // Pega sobreviventes do último round completo
        const lastCompleteRound = savedBracket.rounds[savedBracket.currentRound - 1] ?? savedBracket.rounds[0];
        const survivors = (lastCompleteRound ?? [])
          .filter(m => m.winner)
          .map(m => m.winner)
          .filter(Boolean);

        // Se não sobrou ninguém (round incompleto), pega os winners do round anterior
        const startPlayers = survivors.length > 1
          ? survivors
          : (savedBracket.rounds[savedBracket.currentRound] ?? [])
              .map(m => m.playerA ?? m.winner).filter(Boolean);

        // Continua o bracket a partir dos sobreviventes
        const resumedBracket = await runBracketAsync(
          startPlayers,
          courtKey,
          bestOf,
          onProgress,
          partialStateRef._snapshotRef,
          tournament,
          universeState.rivalrySystem ?? null,
        );

        // Mescla rounds anteriores com os novos
        const mergedRounds = [
          ...savedBracket.rounds.slice(0, savedBracket.currentRound),
          ...resumedBracket.rounds,
        ];

        result = {
          bracket: { ...resumedBracket, rounds: mergedRounds },
          qualifiers: partialStateRef._qualifiers ?? [],
          preQualWinners: [],
          wildcards: [],
          injuryWithdrawals: new Set(),
          injuryEvents: [],
          updatedByInjury: {},
        };
        liveBracketSavedStateRef.current = null; // limpa o snapshot
      } else {
        // ── Fresh start ────────────────────────────────────────────────
        result = await runTournament(
          tournament,
          universeState.tourPlayers,
          universeState.prospects,
          onProgress,
          universeState.playerSeasonSlots ?? {},
          partialStateRef,
          universeState.year,
          universeState.rivalrySystem ?? null,
          universeState.preparedTournamentPackage?.tournamentId === tournament.id
            ? universeState.preparedTournamentPackage
            : null,
        );
      }
      universeDispatch({
        type: 'APPLY_TOURNAMENT_RESULT',
        tournamentId: tournament.id,
        result,
        tournament,
      });

      // Mostra cerimônia após torneios principais
      const skipCeremony = tournament.isProspects || tournament.isATP100
        || tournament.category === 'ATP_100';
      if (getResChampion(result) && !skipCeremony) {
        // Gera wrapData aqui, antes do newsEngine processar — para a aba ANÁLISE
        let wrapData = null;
        try {
          const wrapArt = genTournamentWrap({
            tournament,
            bracket: result.bracket,
            year: universeState.year,
            updatedByInjury: result.updatedByInjury ?? {},
            injuryWithdrawals: result.injuryWithdrawals ?? new Set(),
            allPlayers: [...universeState.tourPlayers, ...(universeState.prospects ?? [])],
          });
          wrapData = wrapArt?.wrapData ?? null;
        } catch (we) {
          console.warn('[handleSimulate] wrapData falhou:', we);
        }
        setCeremonyData({ tournament, bracket: result.bracket, wrapData });
      }
    } catch (e) {
      // Se o usuário parou, salva o estado parcial para continuar no bracket
      if (e.isStopRequest && partialStateRef._snapshotRef.current) {
        liveBracketSavedStateRef.current = {
          phase: 'MAIN_DRAW',
          qBracket: null,
          qDone: true,
          bracket: partialStateRef._snapshotRef.current,
          qualifiers: partialStateRef._qualifiers ?? [],
          done: false,
        };
        liveBracketLastIdRef.current = tournament.id;
      } else if (!e.isStopRequest) {
        console.error('[handleSimulate] Erro ao simular torneio:', e);
      }
    } finally {
      setSimulating(false);
      setSimProgress(0);
      setSimTournament(null);
      setSimEvent(null);
      setSimFeed([]);
      simFeedRef.current = [];
    }
  }, [simulating, universeState, universeDispatch, countBreakingArticles, getLatestBreakingArticle, stopOnBreaking]);


  // ── SAVE / LOAD ───────────────────────────────────────────────────────
  const handleSaveGame = useCallback(() => {
    if (!universeState) return;
    const s = universeState;

    // Slim historicalTournamentResults (pode ter entradas ainda não-slimificadas)
    const slimHistorical = {};
    for (const [key, res] of Object.entries(s.historicalTournamentResults ?? {})) {
      slimHistorical[key] = res._slim ? res : slimifyTournamentResult(res, res._season ?? s.year - 1);
    }

    // Slim retiredPlayers — mantém só potencial HOF (≥3 GS)
    const gsCountSave = {};
    for (const res of Object.values(slimHistorical)) {
      const champId = res?.champion?.id;
      if (champId && res.tournament?.category === 'GRAND_SLAM') {
        gsCountSave[champId] = (gsCountSave[champId] ?? 0) + 1;
      }
    }
    const slimRetired = (s.retiredPlayers ?? [])
      .filter(p => (gsCountSave[p.id] ?? 0) >= 3)
      .map(p => p._isSlimRetired ? p : slimifyRetiredPlayer(p));

    // Transient runtime-only keys that must never be serialised.
    // _aiTrace  → holds `sc` which back-references `player` (circular).
    // _finalShot → shot execution state, recreated each point.
    // ctx        → rally context created by createCtx() in game.js, recreated each point.
    // These keys can appear on ANY player object embedded anywhere in the payload
    // (tourPlayers, prospects, bracket.playerA/playerB/champion, etc.), so we use
    // a JSON replacer that strips them at every depth instead of patching each site.
    const TRANSIENT_KEYS = new Set(['_aiTrace', '_finalShot', 'ctx']);
    const safeReplacer = (key, value) => (TRANSIENT_KEYS.has(key) ? undefined : value);

    const payload = {
      _version: 2,
      year:                        s.year,
      season:                      s.season,
      calendarIndex:               s.calendarIndex,
      tourPlayers:                 s.tourPlayers,
      prospects:                   s.prospects,
      retiredPlayers:              slimRetired,
      rankingStore:                s.rankingStore,
      tournamentResults:           (() => {
        const slimCurrent = {};
        for (const [k, res] of Object.entries(s.tournamentResults ?? {})) {
          slimCurrent[k] = res._slim ? res : slimifyTournamentResult(res, res._season ?? s.year);
        }
        return slimCurrent;
      })(),
      historicalTournamentResults: slimHistorical,
      events:                      s.events                      ?? [],
      
      playerSeasonSlots:           s.playerSeasonSlots           ?? {},
      newgenImagePool:             s.newgenImagePool             ?? {},
      yearSummary:                 s.yearSummary                 ?? null,
      rivalrySystem:               s.rivalrySystem?.toJSON?.()   ?? null,
      chronicleEngine:             s.chronicleEngine?.toJSON?.() ?? null,
      newsEngine:                  s.newsEngine?.toJSON?.()      ?? null,
      sponsorPool:                 s.sponsorPool                 ?? null,
      pendingOffers:               s.pendingOffers               ?? [],
      highestPaidPlayerId:         s.highestPaidPlayerId         ?? null,
      recordsStore:                s.recordsStore                ?? { _version:1, playerStats:{} },
    };
    const json = JSON.stringify(payload, safeReplacer);
    const blob = new Blob([json], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `hv_universe_T${s.season ?? 1}_${s.year ?? 2025}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [universeState]);

  const handleLoadGame = useCallback(() => {
    const input    = document.createElement('input');
    input.type     = 'file';
    input.accept   = '.json,application/json';
    input.onchange = (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target.result);

          const rivalrySystem   = new RivalrySystem();
          rivalrySystem.fromJSON(data.rivalrySystem ?? null);

          const chronicleEngine = new ChronicleEngine();
          chronicleEngine.fromJSON(data.chronicleEngine ?? null);

          const newsEngine = NewsEngine.fromJSON(data.newsEngine ?? null);

          // ── Migra coach.signature ausente nos jogadores ────────────────────
          // Saves anteriores à Fase 7 têm player.coach sem o campo signature.
          // Busca no coachPool; se não achar, rola um novo baseado na filosofia.
          const _coachPool = data.coachPool ?? [];
          const _syncCoachSignature = (players) => (players ?? []).map(p => {
            if (!p.coach?.coachId) return p;           // sem técnico
            if (p.coach.signature)  return p;           // já tem — save novo
            const fullCoach = _coachPool.find(c => c.id === p.coach.coachId);
            const sig = fullCoach?.signature
              ?? rollCoachSignature(p.coach?.philosophy ?? 'ALL_COURT');
            return { ...p, coach: { ...p.coach, signature: sig } };
          });

          // ── Sincroniza careerTitles a partir do recordsStore ──────────────
          // Garante que saves antigos (onde careerTitles estava zerado) mostrem
          // os títulos corretos — o recordsStore é a fonte de verdade acumulada.
          const _rs = data.recordsStore ?? { _version:1, playerStats:{} };
          const _syncCareerTitles = (players) => (players ?? []).map(p => {
            const st = _rs.playerStats?.[p.id];
            if (!st) return p;
            const synced = {
              gs:      st.gs      ?? 0,
              masters: st.masters ?? 0,
              finals:  st.finals_titles ?? 0,
              atp500:  st.atp500  ?? 0,
              atp250:  st.atp250  ?? 0,
              atp100:  st.atp100  ?? 0,
              olympic: st.olympic_gold > 0 ? { gold: st.olympic_gold } : (p.careerTitles?.olympic ?? undefined),
            };
            // Só substitui se o objeto atual ainda estiver totalmente zerado
            // (saves novos já terão os valores corretos no próprio objeto)
            const ct = p.careerTitles ?? {};
            const currentTotal = (ct.gs??0)+(ct.masters??0)+(ct.finals??0)+(ct.atp500??0)+(ct.atp250??0)+(ct.atp100??0);
            const syncedTotal  = synced.gs+synced.masters+synced.finals+synced.atp500+synced.atp250+synced.atp100;
            if (currentTotal === 0 && syncedTotal > 0) {
              return { ...p, careerTitles: synced,
                _careerTitles:     st.titles  ?? syncedTotal,
                _careerGrandSlams: st.gs      ?? 0,
                _careerWins:       st.wins    ?? p._careerWins    ?? 0,
                _careerFinals:     st.finals  ?? p._careerFinals  ?? 0,
              };
            }
            return p;
          });

          const loaded = {
            year:                        data.year                        ?? 2025,
            season:                      data.season                      ?? 1,
            calendarIndex:               data.calendarIndex               ?? 0,
            tourPlayers:                 _syncCoachSignature(_syncCareerTitles(data.tourPlayers ?? [])),
            prospects:                   data.prospects                   ?? [],
            retiredPlayers:              _syncCoachSignature(_syncCareerTitles(data.retiredPlayers ?? [])),
            rankingStore:                data.rankingStore                ?? { playerResults: {}, prospectResults: {}, ranked: [], prospectRanked: [] },
            tournamentResults:           data.tournamentResults           ?? {},
            historicalTournamentResults: data.historicalTournamentResults ?? {},
            events:                      data.events                      ?? [],
            
            playerSeasonSlots:           data.playerSeasonSlots           ?? {},
            newgenImagePool:             data.newgenImagePool             ?? {},
            yearSummary:                 data.yearSummary                 ?? null,
            preparedTournamentPackage:   null,
            view:                        null,
            rivalrySystem,
            chronicleEngine,
            newsEngine,
            sponsorPool:                 data.sponsorPool         ?? initSponsorPool(),
            pendingOffers:               data.pendingOffers       ?? [],
            highestPaidPlayerId:         data.highestPaidPlayerId ?? null,
            recordsStore:                data.recordsStore        ?? { _version:1, playerStats:{} },
          };

          setUniverseState(loaded);
        } catch (err) {
          console.error('[LoadGame] Erro ao carregar save:', err);
          alert('Erro ao carregar o arquivo. Verifique se é um save válido.');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }, []);

  const handleViewBracket = useCallback((tournament) => {
    // Only clear saved state when opening a DIFFERENT tournament
    // Use liveBracketLastIdRef so we still know the last id after the user
    // clicked "voltar" and liveBracketTournament became null
    if (liveBracketLastIdRef.current !== tournament.id) {
      liveBracketSavedStateRef.current = null;
    }
    liveBracketLastIdRef.current = tournament.id;
    setLiveBracketTournament(tournament);
  }, []);

  const handleBracketApplyResult = useCallback((bracket, qualifiers) => {
    if (!liveBracketTournament || !universeState) return;
    const t = liveBracketTournament;
    const prepared = universeState.preparedTournamentPackage?.tournamentId === t.id
      ? universeState.preparedTournamentPackage
      : null;
    const result = {
      bracket,
      qualifiers,
      preQualWinners: prepared?.preQualWinners ?? [],
      wildcards: [],
      injuryWithdrawals: prepared?.injuryWithdrawals ?? new Set(),
      injuryEvents: prepared?.injuryEvents ?? [],
      updatedByInjury: prepared?.updatedByInjury ?? {},
      qualRoundsData: prepared?.qualRoundsData ?? [],
    };
    universeDispatch({
      type: 'APPLY_TOURNAMENT_RESULT',
      tournamentId: t.id,
      result,
      tournament: t,
    });
    liveBracketSavedStateRef.current = null;
    liveBracketLastIdRef.current     = null;
    setLiveBracketTournament(null);

    // Mostra cerimônia se houver campeão (mesma regra dos outros caminhos)
    const skipCeremony = t.isProspects || t.isATP100
      || t.category === 'ATP_100';
    if (getResChampion(result) && !skipCeremony) {
      let wrapData = null;
      try {
        const wrapArt = genTournamentWrap({
          tournament: t, bracket,
          year: universeState.year,
          updatedByInjury: result.updatedByInjury ?? {},
          injuryWithdrawals: result.injuryWithdrawals ?? new Set(),
          allPlayers: [...universeState.tourPlayers, ...(universeState.prospects ?? [])],
        });
        wrapData = wrapArt?.wrapData ?? null;
      } catch {}
      setCeremonyData({ tournament: t, bracket, wrapData });
    }
  }, [liveBracketTournament, universeState, universeDispatch]);

  // Game loop for watching matches
  useEffect(() => {
    if (!watchMatchState) return;
    const DT_FIXED = 1 / 60;
    let running = true;
    const prev = { g0: -1, g1: -1, s0: -1, s1: -1, tb: false };

    // Classifica o tipo de ponto atual (em PRE_SERVE)
    // Retorna: { isGamePoint, isBreakPoint, isSetPoint, isMatchPoint } ou null
    function classifyPoint(gs) {
      if (gs.gameState !== GameState.PRE_SERVE) return null;
      const sv = gs.players[gs.server];
      const rv = gs.players[gs.receiver];
      const setsNeeded = gs.setsToWin ?? 2;

      let isBreakPoint = false, isGamePoint = false;

      if (gs.inTiebreak) {
        const tbSv = gs.tbScore[gs.server];
        const tbRv = gs.tbScore[gs.receiver];
        isGamePoint  = tbSv >= 6 && tbSv >= tbRv;   // servidor pode fechar TB
        isBreakPoint = tbRv >= 6 && tbRv >= tbSv;   // receiver pode fechar TB
        if (!isGamePoint && !isBreakPoint) return null;
      } else {
        isGamePoint  = sv.score >= 3 && (sv.score > rv.score || sv.score === 4);
        isBreakPoint = rv.score >= 3 && (rv.score > sv.score || rv.score === 4);
        if (!isGamePoint && !isBreakPoint) return null;
      }

      // Set point: quem vai ganhar o game pode fechar o set?
      const svGames = sv.games, rvGames = rv.games;
      let isSetPoint = false;
      if (isGamePoint && (svGames >= 5 || (gs.inTiebreak))) isSetPoint = true;
      if (isBreakPoint && (rvGames >= 5 || (gs.inTiebreak))) isSetPoint = true;

      // Match point: quem pode fechar o set está a um set do título?
      let isMatchPoint = false;
      if (isSetPoint) {
        if (isGamePoint && sv.sets === setsNeeded - 1) isMatchPoint = true;
        if (isBreakPoint && rv.sets === setsNeeded - 1) isMatchPoint = true;
      }

      return { isGamePoint, isBreakPoint, isSetPoint, isMatchPoint };
    }

    // Deve parar e mostrar ao vivo este ponto?
    function shouldStop(gs) {
      const c = classifyPoint(gs);
      if (!c) return false;
      const f = hlFiltersRef.current;
      if (c.isMatchPoint && f.matchPoint) return true;
      if (c.isSetPoint   && f.setPoint)   return true;
      if (c.isBreakPoint && f.breakPoint) return true;
      if (c.isGamePoint  && f.gamePoint)  return true;
      return false;
    }

    // Label curto para o feed
    function pointLabel(gs) {
      const c = classifyPoint(gs);
      if (!c) return null;
      if (c.isMatchPoint) return { text: 'MATCH POINT', color: '#FF4444' };
      if (c.isSetPoint)   return { text: 'SET POINT',   color: '#FFD700' };
      if (c.isBreakPoint) return { text: 'BREAK POINT', color: '#FF8C42' };
      if (c.isGamePoint)  return { text: 'GAME POINT',  color: '#66BB6A' };
      return null;
    }

    function gameJustEnded(gs) {
      const g0 = gs.players[0].games, g1 = gs.players[1].games;
      const s0 = gs.players[0].sets,  s1 = gs.players[1].sets;
      if (s0 !== prev.s0 || s1 !== prev.s1) return true;
      if (g0 !== prev.g0 || g1 !== prev.g1) return true;
      if (prev.tb && !gs.inTiebreak) return true;
      return false;
    }

    function savePrev(gs) {
      prev.g0 = gs.players[0].games; prev.g1 = gs.players[1].games;
      prev.s0 = gs.players[0].sets;  prev.s1 = gs.players[1].sets;
      prev.tb = gs.inTiebreak;
    }

    function takeSnap(gs) {
      setSnap({
        players: gs.players.map(p => ({
          ...p,
          styleData: { ...(p.styleData ?? {}) },
          ctx: { ...(p.ctx ?? {}) },
          stamina: p.stamina,
          namedPlayerKey: p.namedPlayerKey,
          setsHistory: p.setsHistory,
          _heatGrid: p._heatGrid ? new Uint16Array(p._heatGrid) : null,
        })),
        ball: { ...gs.ball },
        gameState: gs.gameState,
        rally: gs.rally, maxRally: gs.maxRally,
        totalPoints: gs.totalPoints ?? 0,
        setsDetail: gs.setsDetail ?? [],
        server: gs.server ?? 0,
        ballZ: gs.ball.pos.z,
        ballSpeed: Math.round(mag3(gs.ball.vel) * 3.6),
        courtMeta: gs.courtMeta,
        bounceLog: gs.bounceLog ? [...gs.bounceLog] : [],
        debugEvents: gs.debugEvents ? [...gs.debugEvents] : [],
        trace: gs.trace ?? null,
        inTiebreak: gs.inTiebreak ?? false,
        tbScore: gs.tbScore ? [...gs.tbScore] : [0, 0],
        heat: gs.heat ? { ...gs.heat } : null,
        pointHistory: gs.pointHistory ? [...gs.pointHistory] : [],
      });
    }

    const SCORE_LABELS = ['0', '15', '30', '40', 'Ad'];
    function formatScore(gs) {
      if (gs.inTiebreak) return `TB ${gs.tbScore[0]}–${gs.tbScore[1]}`;
      const sv = gs.players[gs.server], rv = gs.players[gs.receiver];
      const sg = SCORE_LABELS[sv.score] ?? sv.score;
      const rg = SCORE_LABELS[rv.score] ?? rv.score;
      return `${sv.games}-${rv.games} (${sg}-${rg})`;
    }

    function loop() {
      if (!running || !gsRef.current) return;
      const gs = gsRef.current;

      // ── HIGHLIGHTS: headless até encontrar ponto para parar ───────────
      if (highlightsModeRef.current && !highlightsPaused) {
        let ticks = 0;
        // Snapshot do estado antes do ponto para poder logar no feed
        let prePointSnap = null;

        while (running && ticks < 800) {
          // Em PRE_SERVE: captura estado antes de simular e verifica se para
          if (gs.gameState === GameState.PRE_SERVE) {
            const lbl = pointLabel(gs);
            if (lbl) {
              // Guarda snap do pré-ponto para adicionar ao feed depois
              prePointSnap = {
                label: lbl,
                serverName: gs.players[gs.server].name,
                receiverName: gs.players[gs.receiver].name,
                score: formatScore(gs),
                s0: gs.players[0].sets, s1: gs.players[1].sets,
                g0: gs.players[0].games, g1: gs.players[1].games,
              };
            }
            if (shouldStop(gs)) {
              savePrev(gs);
              setHighlightsPaused(true);
              break;
            }
          }

          gameTick(gs, DT_FIXED);
          ticks++;
          if (gs.gameState === GameState.GAME_OVER) { running = false; break; }

          // Pula POINT_END: adiciona ao feed e avança
          if (gs.gameState === GameState.POINT_END && prePointSnap) {
            // Quem ganhou o ponto?
            const p0 = gs.players[0], p1 = gs.players[1];
            // Avança até sair do POINT_END
            for (let i = 0; i < 90 && gs.gameState === GameState.POINT_END; i++) gameTick(gs, DT_FIXED);
            // Adiciona ao feed
            const entry = { ...prePointSnap, id: Date.now() + ticks };
            hlFeedRef.current = [entry, ...hlFeedRef.current].slice(0, 12);
            setHlFeed([...hlFeedRef.current]);
            prePointSnap = null;
            continue;
          }
          if (gs.gameState === GameState.POINT_END) {
            for (let i = 0; i < 90 && gs.gameState === GameState.POINT_END; i++) gameTick(gs, DT_FIXED);
          }
        }

        takeSnap(gs);
        if (gs.gameState === GameState.GAME_OVER) { running = false; return; }
        rafRef.current = requestAnimationFrame(loop);
        return;
      }

      // ── NORMAL ou HIGHLIGHTS AO VIVO ─────────────────────────────────
      gameTick(gs, DT_FIXED * (speedRef.current ?? 1));
      if (gs.ball.inFlight) {
        trailRef.current.push({ ...gs.ball.pos });
        if (trailRef.current.length > TRAIL_LEN) trailRef.current.shift();
      } else if (trailRef.current.length > 0) {
        trailRef.current.shift();
      }
      takeSnap(gs);
      if (gs.gameState === GameState.GAME_OVER) { running = false; return; }

      if (highlightsModeRef.current && highlightsPaused && gameJustEnded(gs)) {
        setHighlightsPaused(false);
      }

      rafRef.current = requestAnimationFrame(loop);
    }

    if (gsRef.current) savePrev(gsRef.current);
    rafRef.current = requestAnimationFrame(loop);
    return () => { running = false; if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [watchMatchState, highlightsPaused]);

  useEffect(() => { speedRef.current = simSpeed; }, [simSpeed]);

  // ── Auto-simulate ATP_100 and ATP_PROSPECTS tournaments (qualifying + main draw) without asking ──
  useEffect(() => {
    if (simulating || !universeState || liveBracketTournament || watchMatchState || preGamePending) return;
    const calIdx = universeState.calendarIndex;
    if (calIdx >= CALENDAR.length) return;
    const nextT = CALENDAR[calIdx];
    if (!nextT) return;
    const isAutoSimTournament =
      nextT.isATP100 || nextT.isProspects ||
      nextT.category === 'ATP_100';
    if (!isAutoSimTournament) return;
    // Already simulated?
    if (universeState.tournamentResults?.[nextT.id]) return;

    // Fire fast simulation automatically
    setSimulating(true);
    setSimProgress(0);
    setSimMode('headless');
    setSimTournament(nextT);
    setSimEvent(null);
    setSimFeed([]);
    simFeedRef.current = [];
    const loopSeasonSlots = Object.fromEntries(
      Object.entries(universeState.playerSeasonSlots ?? {}).map(([k, v]) => [k, { ...v }])
    );

    Promise.resolve().then(() => {
      try {
        const { bracket, qualifiers, preQualWinners, wildcards, injuryWithdrawals, injuryEvents, updatedByInjury } = runTournamentFast(
          nextT,
          universeState.tourPlayers,
          universeState.prospects,
          loopSeasonSlots,
        );
        universeDispatch({
          type: 'APPLY_TOURNAMENT_RESULT',
          tournamentId: nextT.id,
          result: { bracket, qualifiers, preQualWinners, wildcards, injuryWithdrawals: injuryWithdrawals ?? new Set(), injuryEvents: injuryEvents ?? [], updatedByInjury: updatedByInjury ?? {} },
          tournament: nextT,
        });
      } catch (e) {
        console.error('[AutoSim] erro ao simular', nextT.name, e);
      } finally {
        setSimulating(false);
        setSimProgress(0);
        setSimTournament(null);
        setSimEvent(null);
        setSimFeed([]);
        simFeedRef.current = [];
        setSimMode('headless');
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [universeState?.calendarIndex, simulating, liveBracketTournament, watchMatchState, preGamePending]);

  const handleWatchMatch = useCallback((match, roundIdx, matchIdx, onResult) => {
    const { playerA, playerB } = match;
    if (!playerA || !playerB) return;
    const courtKey = liveBracketTournament?.courtKey ?? 'US_OPEN';
    const bestOf   = liveBracketTournament?.bestOf ?? 3;
    // Show pre-game analysis before starting the match engine
    setPreGamePending({ playerA, playerB, courtKey, bestOf, roundIdx, matchIdx, onResult,
      tournament: liveBracketTournament });
  }, [liveBracketTournament]);

  const handleLaunchMatch = useCallback((mode = 'full') => {
    if (!preGamePending) return;
    const { playerA, playerB, courtKey, bestOf, roundIdx, matchIdx, onResult } = preGamePending;
    const keyA = `__WATCH_${playerA.id}__`;
    const keyB = `__WATCH_${playerB.id}__`;

    // ── Modo "Simular e Ver Highlights" ─────────────────────────────
    if (mode === 'sim-highlights') {
      setPreGamePending(null);
      // Roda headless num timeout para não bloquear o render do loading
      setTimeout(() => {
        try {
          const { result, allClips } = simulateAndCollectHighlights(
            { playerData: playerA },
            { playerData: playerB },
            courtKey,
            bestOf,
            universeState?.rivalrySystem ?? null,
            preGamePending?.tournament?.isSlam ?? false,
          );
          // Injeta temporariamente nas NAMED_PLAYERS para o 2D funcionar
          NAMED_PLAYERS[keyA] = playerA;
          NAMED_PLAYERS[keyB] = playerB;
          setSimHlState({ allClips, result, playerA, playerB, onResult, keyA, keyB });
        } catch (e) {
          console.error('[SimHL] Erro:', e);
        }
      }, 0);
      return;
    }

    NAMED_PLAYERS[keyA] = playerA;
    NAMED_PLAYERS[keyB] = playerB;
    const _isSlam = preGamePending?.tournament?.isSlam ?? false;
    gsRef.current = initGameState(null, null, keyA, keyB, courtKey, bestOf);
    gsRef.current.isSlam = _isSlam;
    trailRef.current = [];
    frameHistoryRef.current = [];
    highlightsModeRef.current = (mode === 'highlights');
    setHighlightsPaused(false);
    hlFeedRef.current = [];
    setHlFeed([]);
    setSnap(null);
    setPreGamePending(null);
    setWatchMatchState({ playerA, playerB, courtKey, bestOf, roundIdx, matchIdx, onResult, keyA, keyB,
                         tournamentId: preGamePending?.tournament?.id ?? null, isSlam: _isSlam });
  }, [preGamePending, highlightsModeRef]);

  if (phase === 'home') {
    return <UniverseHomeScreen onInit={handleInitUniverse} onBack={onBack} />;
  }

  if (!universeState) return null;

  // PRÉ-JOGO
  if (preGamePending) {
    return (
      <PreGameAnalysis
        preGamePending={preGamePending}
        universeState={universeState}
        onStart={() => handleLaunchMatch('full')}
        onStartHighlights={() => handleLaunchMatch('highlights')}
        onSimHighlights={() => handleLaunchMatch('sim-highlights')}
        onSkip={handleLaunchMatch}
      />
    );
  }

  // SIM-HIGHLIGHTS PLAYER
  if (simHlState) {
    return (
      <CinematicReel
        simHlState={simHlState}
        gsRef={gsRef}
        trailRef={trailRef}
        frameHistoryRef={frameHistoryRef}
        speedRef={speedRef}
        simSpeed={simSpeed}
        setSimSpeed={setSimSpeed}
        coachPool={universeState?.coachPool ?? []}
        onDone={() => {
          const { result, onResult, keyA, keyB } = simHlState;
          delete NAMED_PLAYERS[keyA];
          delete NAMED_PLAYERS[keyB];
          if (onResult) {
            onResult({ sets: result.sets, setsDetail: result.setsDetail });
          }
          setSimHlState(null);
        }}
      />
    );
  }

  // WATCH MATCH
  if (watchMatchState) {
    const isOver = snap?.gameState === GameState.GAME_OVER;
    const p0 = snap?.players?.[0];
    const p1 = snap?.players?.[1];

    const handleMatchDone = () => {
      delete NAMED_PLAYERS[watchMatchState.keyA];
      delete NAMED_PLAYERS[watchMatchState.keyB];
      if (snap && watchMatchState.onResult) {
        const sets = [p0?.sets ?? 0, p1?.sets ?? 0];
        const setsDetail = snap.setsDetail ?? [];
        watchMatchState.onResult({ sets, setsDetail });
      }
      setWatchMatchState(null);
      setSnap(null);
    };

    if (isOver) {
      return (
        <div style={{ width: '100vw', height: '100vh', background: '#05080e', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          <MatchOverScreen
            p0={p0} p1={p1}
            maxRally={snap?.maxRally ?? 0}
            totalPoints={snap?.totalPoints ?? 0}
            bounceLog={snap?.bounceLog ?? []}
            debugEvents={snap?.debugEvents ?? []}
            onNew={handleMatchDone}
            onSame={handleMatchDone}
          />
        </div>
      );
    }

    return (
      <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', background: '#050505', position: 'relative' }}>
        <DefinitiveME
          gsRef={gsRef}
          trailRef={trailRef}
          snap={snap}
          onMenu={handleMatchDone}
          simSpeed={simSpeed}
          setSimSpeed={setSimSpeed}
          speedRef={speedRef}
          frameHistoryRef={frameHistoryRef}
          bugMode={false}
          setBugMode={() => {}}
          bugSpeedSaveRef={{ current: 1 }}
          coachPool={universeState?.coachPool ?? []}
          tournamentId={watchMatchState?.tournamentId ?? null}
          universePlayerA={watchMatchState?.playerA ?? null}
          universePlayerB={watchMatchState?.playerB ?? null}
        />
        <DebugLog gsRef={gsRef} />
        <TracePanel gsRef={gsRef} />


        {/* ── HIGHLIGHTS CURTAIN — cobre a quadra durante o headless ──── */}
        {highlightsModeRef.current && (
          <div style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            opacity: highlightsPaused ? 0 : 1,
            pointerEvents: highlightsPaused ? 'none' : 'auto',
            transition: 'opacity .4s ease',
            background: 'linear-gradient(160deg, #030d07 0%, #050c11 60%, #07050d 100%)',
            display: 'flex', flexDirection: 'column',
            fontFamily: "'Space Mono',monospace",
            overflow: 'hidden',
          }}>

            {/* Scanline sutil */}
            <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0, opacity: .025,
              backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, #fff 2px, #fff 3px)',
              backgroundSize: '100% 4px' }} />
            <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
              backgroundImage: 'radial-gradient(ellipse 80% 60% at 50% 50%, rgba(196,87,42,.07) 0%, transparent 70%)' }} />

            {/* Top bar */}
            <div style={{
              position: 'relative', zIndex: 1,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '13px 28px', flexShrink: 0,
              borderBottom: '1px solid rgba(255,255,255,.05)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#4CAF50',
                  boxShadow: '0 0 10px #4CAF50', animation: 'ho-pulse 1.5s infinite' }} />
                <span style={{ fontSize: 9, color: 'rgba(255,255,255,.35)', letterSpacing: '.3em' }}>HIGHLIGHTS · AVANÇANDO</span>
              </div>
              <span style={{ fontSize: 8, color: 'rgba(255,255,255,.15)', letterSpacing: '.15em' }}>
                {watchMatchState?.playerA?.name?.toUpperCase()} vs {watchMatchState?.playerB?.name?.toUpperCase()}
              </span>
            </div>

            {/* Placar central + mini quadra */}
            <div style={{
              position: 'relative', zIndex: 1, flexShrink: 0,
              display: 'flex', alignItems: 'stretch',
              borderBottom: '1px solid rgba(255,255,255,.05)',
            }}>
              {/* ── Scoreboard (esquerda) ── */}
              <div style={{
                flex: 1, padding: '20px 28px',
                display: 'flex', flexDirection: 'column', gap: 6, justifyContent: 'center',
              }}>
                {[0, 1].map(pi => {
                  const p = snap?.players?.[pi];
                  if (!p) return null;
                  const isServer = snap?.server === pi;
                  const PLAYER_COLOR = pi === 0 ? '#4FC3F7' : '#FF8A65';
                  const setsDetail = snap?.setsDetail ?? [];
                  return (
                    <div key={pi} style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '10px 14px',
                      background: 'rgba(255,255,255,.025)',
                      border: `1px solid rgba(255,255,255,.07)`,
                      borderLeft: `3px solid ${PLAYER_COLOR}`,
                    }}>
                      {/* Name + serve indicator */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          display: 'flex', alignItems: 'center', gap: 7,
                        }}>
                          {isServer && (
                            <div style={{
                              width: 7, height: 7, borderRadius: '50%',
                              background: '#E07050', boxShadow: '0 0 6px #E07050', flexShrink: 0,
                            }}/>
                          )}
                          <span style={{
                            fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700, fontSize: 18,
                            color: '#fff', textTransform: 'uppercase', letterSpacing: '.03em',
                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                          }}>{p.name}</span>
                        </div>
                      </div>
                      {/* Set boxes */}
                      <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
                        {setsDetail.map((sd, si) => {
                          const myGames  = sd?.[pi]  ?? 0;
                          const oppGames = sd?.[1-pi] ?? 0;
                          const won = myGames > oppGames;
                          return (
                            <div key={si} style={{
                              width: 28, height: 28,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700, fontSize: 17,
                              color: won ? PLAYER_COLOR : 'rgba(255,255,255,.25)',
                              background: won ? `${PLAYER_COLOR}18` : 'rgba(255,255,255,.03)',
                              border: `1px solid ${won ? PLAYER_COLOR + '55' : 'rgba(255,255,255,.07)'}`,
                            }}>{myGames}</div>
                          );
                        })}
                        {/* Games atual */}
                        <div style={{
                          width: 28, height: 28, marginLeft: 3,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700, fontSize: 17,
                          color: '#fff',
                          background: 'rgba(255,255,255,.08)',
                          border: '1px solid rgba(255,255,255,.18)',
                        }}>{p.games ?? 0}</div>
                        {/* Pontos */}
                        <div style={{
                          width: 36, height: 28, marginLeft: 2,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700, fontSize: 17,
                          color: isServer ? '#E07050' : 'rgba(255,255,255,.4)',
                          background: isServer ? 'rgba(196,87,42,.12)' : 'transparent',
                          border: `1px solid ${isServer ? 'rgba(196,87,42,.3)' : 'rgba(255,255,255,.05)'}`,
                        }}>
                          {['0','15','30','40','Ad'][p.score ?? 0] ?? '0'}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {/* Column headers */}
                <div style={{
                  display: 'flex', justifyContent: 'flex-end', gap: 3, paddingRight: 0,
                  marginTop: -2,
                }}>
                  {(snap?.setsDetail ?? []).map((_, si) => (
                    <div key={si} style={{
                      width: 28, textAlign: 'center',
                      fontFamily: 'monospace', fontSize: 7,
                      color: 'rgba(255,255,255,.2)', letterSpacing: '.1em',
                    }}>S{si+1}</div>
                  ))}
                  <div style={{ width: 31, textAlign: 'center', fontFamily: 'monospace', fontSize: 7, color: 'rgba(255,255,255,.2)' }}>J</div>
                  <div style={{ width: 38, textAlign: 'center', fontFamily: 'monospace', fontSize: 7, color: 'rgba(255,255,255,.2)' }}>PT</div>
                </div>
              </div>

              {/* ── Mini quadra de quiques (direita) ── */}
              <div style={{
                width: 140, flexShrink: 0, borderLeft: '1px solid rgba(255,255,255,.05)',
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                justifyContent: 'center', padding: '12px 16px', gap: 8,
              }}>
                <div style={{ fontSize: 7, letterSpacing: '.3em', color: 'rgba(255,255,255,.18)' }}>QUIQUES</div>
                {(() => {
                  const bounceLog = snap?.bounceLog ?? [];
                  const W = 100, H = 160, PAD = 8;
                  const cw = W - PAD*2, ch = H - PAD*2;
                  const COURT_HL = 11.885, COURT_HW = 4.115;
                  function toSvg(x, y) {
                    return [
                      PAD + ((x + COURT_HW) / (COURT_HW*2)) * cw,
                      PAD + ((y + COURT_HL) / (COURT_HL*2)) * ch,
                    ];
                  }
                  const [nX1, nY] = toSvg(-COURT_HW, 0);
                  const [nX2]     = toSvg( COURT_HW, 0);
                  const [sLx]     = toSvg(-COURT_HW*(4.115/5.485), 0);
                  const [sRx]     = toSvg( COURT_HW*(4.115/5.485), 0);
                  const [sMx]     = toSvg(0, 0);
                  const [,svcTy]  = toSvg(0, -COURT_HL*0.55);
                  const [,svcBy]  = toSvg(0,  COURT_HL*0.55);

                  // last 40 bounces, fade older ones
                  const dots = bounceLog.slice(-40);
                  const COLORS = ['#4FC3F7', '#FF8A65'];
                  return (
                    <svg width={W} height={H} style={{ display: 'block' }}>
                      <rect x={PAD} y={PAD} width={cw} height={ch} fill="#0e1f0e" rx={2}/>
                      <rect x={PAD} y={PAD} width={cw} height={ch} fill="none" stroke="rgba(255,255,255,.18)" strokeWidth={1}/>
                      {/* Singles lines */}
                      <line x1={sLx} y1={PAD} x2={sLx} y2={PAD+ch} stroke="rgba(255,255,255,.1)" strokeWidth={.7}/>
                      <line x1={sRx} y1={PAD} x2={sRx} y2={PAD+ch} stroke="rgba(255,255,255,.1)" strokeWidth={.7}/>
                      {/* Net */}
                      <line x1={nX1} y1={nY} x2={nX2} y2={nY} stroke="rgba(255,255,255,.45)" strokeWidth={1.5}/>
                      {/* Service lines */}
                      <line x1={sLx} y1={svcTy} x2={sRx} y2={svcTy} stroke="rgba(255,255,255,.08)" strokeWidth={.7}/>
                      <line x1={sLx} y1={svcBy} x2={sRx} y2={svcBy} stroke="rgba(255,255,255,.08)" strokeWidth={.7}/>
                      <line x1={sMx} y1={nY} x2={sMx} y2={svcTy} stroke="rgba(255,255,255,.07)" strokeWidth={.7}/>
                      <line x1={sMx} y1={nY} x2={sMx} y2={svcBy} stroke="rgba(255,255,255,.07)" strokeWidth={.7}/>
                      {dots.map((b, i) => {
                        if (b.x == null || b.y == null) return null;
                        const [dx, dy] = toSvg(b.x, b.y);
                        const age = i / dots.length;
                        const opacity = 0.25 + age * 0.75;
                        const r = age > 0.85 ? 3.5 : 2;
                        const col = b.type === 'out' ? '#FF5555' : (COLORS[b.player] ?? '#aaa');
                        return <circle key={i} cx={dx} cy={dy} r={r} fill={col} opacity={opacity}/>;
                      })}
                      {/* Last bounce ring */}
                      {(() => {
                        const last = dots[dots.length-1];
                        if (!last || last.x == null) return null;
                        const [lx, ly] = toSvg(last.x, last.y);
                        const col = last.type === 'out' ? '#FF5555' : (COLORS[last.player] ?? '#aaa');
                        return <circle cx={lx} cy={ly} r={6} fill="none" stroke={col} strokeWidth={1.5} opacity={.5}/>;
                      })()}
                    </svg>
                  );
                })()}
                {/* Legend */}
                <div style={{ display: 'flex', gap: 8 }}>
                  {(snap?.players ?? []).map((p, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: i === 0 ? '#4FC3F7' : '#FF8A65' }}/>
                      <span style={{ fontFamily: 'monospace', fontSize: 7, color: 'rgba(255,255,255,.35)' }}>
                        {p?.name?.split(' ').pop()?.slice(0,8)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Corpo: toggles esquerda + feed direita */}
            <div style={{
              position: 'relative', zIndex: 1, flex: 1,
              display: 'grid', gridTemplateColumns: '300px 1fr',
              overflow: 'hidden',
            }}>

              {/* Toggles */}
              <div style={{ borderRight: '1px solid rgba(255,255,255,.05)', padding: '22px 28px', overflowY: 'auto' }}>
                <div style={{ fontSize: 7, color: 'rgba(255,255,255,.2)', letterSpacing: '.35em', marginBottom: 18, textTransform: 'uppercase' }}>
                  PARAR EM
                </div>
                {[
                  { key: 'matchPoint', label: 'Match Point', sub: 'Fecha o jogo',      color: '#FF4444' },
                  { key: 'setPoint',   label: 'Set Point',   sub: 'Fecha o set',       color: '#FFD700' },
                  { key: 'breakPoint', label: 'Break Point', sub: 'Quebra de serviço', color: '#FF8C42' },
                  { key: 'gamePoint',  label: 'Game Point',  sub: 'Confirma o serviço',color: '#66BB6A' },
                ].map(({ key, label, sub, color }) => {
                  const active = hlFilters[key];
                  return (
                    <div key={key}
                      onClick={() => {
                        const next = { ...hlFiltersRef.current, [key]: !hlFiltersRef.current[key] };
                        hlFiltersRef.current = next;
                        setHlFilters(next);
                      }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 14, marginBottom: 10,
                        cursor: 'pointer', padding: '11px 14px',
                        background: active ? `${color}0e` : 'rgba(255,255,255,.02)',
                        border: `1px solid ${active ? `${color}38` : 'rgba(255,255,255,.05)'}`,
                        transition: 'all .15s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = active ? `${color}1a` : 'rgba(255,255,255,.04)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = active ? `${color}0e` : 'rgba(255,255,255,.02)'; }}
                    >
                      <div style={{
                        width: 34, height: 18, borderRadius: 9, flexShrink: 0,
                        background: active ? color : 'rgba(255,255,255,.1)',
                        position: 'relative', transition: 'all .2s',
                        boxShadow: active ? `0 0 14px ${color}55` : 'none',
                      }}>
                        <div style={{
                          position: 'absolute', top: 3, width: 12, height: 12, borderRadius: '50%',
                          background: '#fff', transition: 'left .2s', left: active ? 19 : 3,
                        }} />
                      </div>
                      <div>
                        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.1em',
                          color: active ? color : 'rgba(255,255,255,.25)' }}>{label}</div>
                        <div style={{ fontSize: 8, color: 'rgba(255,255,255,.18)', letterSpacing: '.06em', marginTop: 2 }}>{sub}</div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Feed */}
              <div style={{ overflowY: 'auto', padding: '22px 0' }}>
                <div style={{ fontSize: 7, color: 'rgba(255,255,255,.2)', letterSpacing: '.35em',
                  padding: '0 28px 14px', textTransform: 'uppercase' }}>PONTOS ESPECIAIS</div>
                {hlFeed.length === 0
                  ? (
                    <div style={{ padding: '60px 28px', textAlign: 'center' }}>
                      <div style={{ fontSize: 32, opacity: .1, marginBottom: 14 }}>🎾</div>
                      <div style={{ fontSize: 8, color: 'rgba(255,255,255,.1)', letterSpacing: '.25em' }}>AGUARDANDO…</div>
                    </div>
                  )
                  : hlFeed.map((item, i) => (
                    <div key={item.id ?? i} style={{
                      padding: '12px 28px', borderBottom: '1px solid rgba(255,255,255,.04)',
                      background: i === 0 ? 'rgba(255,255,255,.02)' : 'transparent',
                      display: 'flex', alignItems: 'center', gap: 18,
                      animation: i === 0 ? 'ho-slide-up .25s ease both' : 'none',
                    }}>
                      <div style={{
                        flexShrink: 0, padding: '4px 10px',
                        background: `${item.label.color}12`, border: `1px solid ${item.label.color}38`,
                        fontSize: 7, fontWeight: 700, color: item.label.color, letterSpacing: '.18em',
                        whiteSpace: 'nowrap',
                      }}>{item.label.text}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, color: 'rgba(255,255,255,.7)', fontWeight: 700, letterSpacing: '.06em' }}>
                          {item.serverName}
                        </div>
                        <div style={{ fontSize: 8, color: 'rgba(255,255,255,.22)', letterSpacing: '.05em', marginTop: 2 }}>
                          {item.score}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0, fontSize: 8, color: 'rgba(255,255,255,.18)', letterSpacing: '.08em' }}>
                        <div>Set {item.s0}–{item.s1}</div>
                        <div style={{ marginTop: 2 }}>{item.g0}–{item.g1}</div>
                      </div>
                    </div>
                  ))
                }
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // LIVE BRACKET
  if (liveBracketTournament) {
    const existingResult = universeState.tournamentResults?.[liveBracketTournament.id];
    return (
      <TournamentBracket
        tournament={liveBracketTournament}
        tourPlayers={universeState.tourPlayers}
        prospects={universeState.prospects}
        preparedPackage={universeState.preparedTournamentPackage?.tournamentId === liveBracketTournament.id
          ? universeState.preparedTournamentPackage
          : null}
        existingResult={existingResult}
        savedState={liveBracketSavedStateRef.current}
        onBack={() => setLiveBracketTournament(null)}
        onWatchMatch={handleWatchMatch}
        onApplyResult={handleBracketApplyResult}
        onSaveProgress={(s) => { liveBracketSavedStateRef.current = s; }}
        playerSeasonSlots={universeState.playerSeasonSlots ?? {}}
        historicalTournamentResults={universeState.historicalTournamentResults ?? {}}
        currentYear={universeState.year}
        allPlayers={[...universeState.tourPlayers, ...(universeState.retiredPlayers ?? [])]}
      />
    );
  }

  // BROADCAST HUB
  return (
    <>
      <BroadcastUniverse
        state={universeState}
        dispatch={universeDispatch}
        onBack={() => setPhase('home')}
        onSimulate={handleSimulate}
        onFastSimulateRange={handleFastSimulateRange}
        onViewBracket={handleViewBracket}
        simulating={simulating}
        simProgress={simProgress}
        simMode={simMode}
        stopOnBreaking={stopOnBreaking}
        onToggleStopOnBreaking={setStopOnBreaking}
        onSaveGame={handleSaveGame}
        onLoadGame={handleLoadGame}
      />
      {simulating && simMode === 'headless' && (
        <HeadlessOverlay
          tournament={simTournament}
          simEvent={simEvent}
          simFeed={simFeed}
          simProgress={simProgress}
          simTotal={simTotal}
          stopOnBreaking={stopOnBreaking}
          onToggleStopOnBreaking={setStopOnBreaking}
          breakingArticle={simBreakingArticle}
          onStop={() => { stopSimRef.current = true; }}
        />
      )}
      {ceremonyData && (
        <TournamentCeremony
          tournament={ceremonyData.tournament}
          bracket={ceremonyData.bracket}
          wrapData={ceremonyData.wrapData ?? null}
          state={universeState}
          onClose={() => setCeremonyData(null)}
        />
      )}
      {universeState?.yearSummary && (
        <YearSummaryModal
          summary={universeState.yearSummary}
          allPlayers={universeState.tourPlayers}
          onDismiss={() => universeDispatch({ type: 'DISMISS_SUMMARY' })}
        />
      )}
    </>
  );
}





