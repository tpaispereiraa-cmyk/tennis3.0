/**
 * TournamentBracket.jsx — Visual Bracket v4 · Broadcast Edition
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { overallRating, getPlayerPhoto } from '../../domain/players/players.js';
import { buildIdentityDuel, buildPlayerIdentity } from '../../domain/players/PlayerIdentity.js';
import { ovrTier } from '../../systems/scouting/ScoutProfile.js';
import { generatePrefs, getArchetype, getRallyIntentMeta } from '../../domain/players/playerPrefs.js';
import { narrateMatch } from '../../systems/press/MatchNarrator.js';
import {
  selectTournamentPlayers,
  createSeasonSlots,
  updateSeasonSlots,
  generateBracket,
  advanceRound,
  generateQualifyingBracket,
  advanceQualifyingRound,
} from '../../systems/tournaments/TournamentSystem.js';
import { simulateMatchHeadless, simulateMatchSlim, simulateMatchMid } from '../../core/Headless.jsx';
import { simulateMatchFast, courtKeyToSurface } from '../../core/FastSimulation.js';
import HeadlessOverlay from '../game/HeadlessOverlay.jsx';
import { rollPreTournamentInjury, shouldWithdraw, applyInjuryToPlayer, ensurePhysicalCondition, applyPreTournamentInjuries } from '../../systems/health/InjurySystem.js';
import { getPlayerTraits } from '../../systems/traits/TraitSystem.js';
import { BROADCAST_THEME as T, SURFACE_THEME } from '../theme/uiTheme.js';
import { isTiebreakSetScore } from '../../core/constants.js';

// ── Tokens ────────────────────────────────────────────────────────────
const SURFACE_CLR = {
  CLAY:   { ...SURFACE_THEME.CLAY, icon: '🧱' },
  GRASS:  { ...SURFACE_THEME.GRASS, icon: '🌿' },
  HARD:   { ...SURFACE_THEME.HARD, icon: '🎾' },
  INDOOR: { ...SURFACE_THEME.INDOOR, icon: '🏟️' },
};

const CAT_CLR = {
  GRAND_SLAM:       '#E8C84A',
  SLAM_CLASH:       '#FF8A3D',
  MASTERS_1000:     '#C84FEB',
  ATP_500:          '#4A90D9',
  ATP_250:          '#2ECC71',
  ATP_PROSPECTS:    '#FF7043',
  FINALS:           '#E8C84A',
  PROSPECTS_FINALS: '#FF7043',
};

const CAT_LABEL = {
  GRAND_SLAM:       'Grand Slam',
  SLAM_CLASH:       'Apex Major',
  MASTERS_1000:     'Masters 1000',
  ATP_500:          'ATP 500',
  ATP_250:          'ATP 250',
  ATP_PROSPECTS:    'Juniors',
  FINALS:           'ATP Finals',
  PROSPECTS_FINALS: 'Junior Finals',
};

// ── Layout ────────────────────────────────────────────────────────────
const PLAYER_H = 62;
const MATCH_H  = PLAYER_H * 2 + 3;
const MATCH_W  = 290;
const COL_GAP  = 68;
const COL_STEP = MATCH_W + COL_GAP;
const LABEL_H  = 44;

// ── CSS ───────────────────────────────────────────────────────────────
function injectStyles() {
  if (document.getElementById('tb4-styles')) return;
  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Space+Mono:wght@400;700&family=Barlow+Condensed:wght@300;400;600;700;900&family=Barlow:wght@400;600&display=swap');

    @keyframes tb-in      { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
    @keyframes tb-blink   { 0%,100%{opacity:1} 50%{opacity:.12} }
    @keyframes tb-rise    { from{opacity:0;transform:translateX(-12px)} to{opacity:1;transform:translateX(0)} }
    @keyframes tb-bar     { from{transform:scaleX(0)} to{transform:scaleX(1)} }
    @keyframes tb-glow    { 0%,100%{box-shadow:0 0 20px rgba(232,200,74,.1),inset 0 0 40px rgba(232,200,74,.03)} 50%{box-shadow:0 0 60px rgba(232,200,74,.35),inset 0 0 60px rgba(232,200,74,.07)} }
    @keyframes tb-pulse   { 0%,100%{opacity:.3;transform:scale(1)} 50%{opacity:1;transform:scale(1.2)} }
    @keyframes tb-drift   { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(30px,-20px) scale(1.06)} }
    @keyframes tb-pop     { 0%{transform:scale(.88);opacity:0} 65%{transform:scale(1.04)} 100%{transform:scale(1);opacity:1} }
    @keyframes tb-shimmer { 0%{transform:translateX(-150%)} 100%{transform:translateX(250%)} }
    @keyframes tb-slide   { from{opacity:0;transform:translateY(24px)} to{opacity:1;transform:translateY(0)} }
    @keyframes mr-in { from{opacity:0;transform:translateY(32px)} to{opacity:1;transform:translateY(0)} }
    @keyframes mr-fade { from{opacity:0} to{opacity:1} }

    .mr-overlay {
      position:fixed; inset:0; z-index:9000;
      background:rgba(2,4,6,.82); backdrop-filter:blur(6px);
      display:flex; align-items:center; justify-content:center;
      animation:mr-fade .18s ease;
      padding:20px;
    }
    .mr-panel {
      background:#080D10;
      border:1px solid rgba(242,237,228,.08);
      width:100%; max-width:680px; max-height:88vh;
      overflow-y:auto; position:relative;
      animation:mr-in .22s cubic-bezier(.2,.8,.3,1);
      clip-path:polygon(8px 0,100% 0,calc(100% - 8px) 100%,0 100%);
    }
    .mr-panel::-webkit-scrollbar { width:2px }
    .mr-panel::-webkit-scrollbar-thumb { background:rgba(255,255,255,.1); border-radius:2px }
    .mr-close {
      position:absolute; top:14px; right:18px;
      background:transparent; border:none; cursor:pointer;
      font-family:'Space Mono',monospace; font-size:10px; letter-spacing:.2em;
      color:rgba(242,237,228,.28); padding:4px 8px;
      transition:color .14s;
    }
    .mr-close:hover { color:rgba(242,237,228,.8); }
    .mr-section {
      padding:13px 16px; margin-bottom:10px;
      border-left:2px solid;
    }
    .mr-tag {
      font-family:'Space Mono',monospace; font-size:7.5px; letter-spacing:.14em;
      padding:2px 8px; border:1px solid;
    }
    .mc.done.resumable { cursor:pointer; }
    .mc.done.resumable:hover {
      border-color:rgba(242,237,228,.18);
      background:#0D1215;
    }
    .mc.done.resumable:hover .mc-resume-hint { opacity:1; transform:translateY(0) scale(1); }
    .mc-resume-hint {
      position:absolute; inset:0;
      display:flex; align-items:center; justify-content:center;
      background:rgba(3,5,7,.72); backdrop-filter:blur(3px);
      opacity:0; transform:translateY(4px) scale(.97);
      transition:opacity .16s ease, transform .16s ease;
      pointer-events:none;
    }
    .mc-resume-badge {
      display:flex; align-items:center; gap:7px;
      padding:8px 16px;
      background:rgba(15,21,24,.9);
      border:1px solid rgba(242,237,228,.14);
      clip-path:polygon(5px 0,100% 0,calc(100% - 5px) 100%,0 100%);
    }
    .mc-resume-badge-icon {
      font-size:13px; line-height:1;
    }
    .mc-resume-badge-text {
      font-family:'Space Mono',monospace; font-size:7.5px;
      letter-spacing:.22em; color:rgba(242,237,228,.6);
      text-transform:uppercase;
    }

    .tb-screen {
      width:100%; min-height:100vh;
      background:#030507;
      color:#F2EDE4; font-family:'Barlow Condensed',sans-serif;
      display:flex; flex-direction:column; overflow-y:auto;
      position:relative;
    }

    /* ── SCROLLBAR ── */
    ::-webkit-scrollbar { width:3px; height:3px }
    ::-webkit-scrollbar-thumb { background:rgba(212,86,30,.35); border-radius:2px }
    ::-webkit-scrollbar-track { background:transparent }
    .tb-scroll::-webkit-scrollbar { width:3px; height:3px }
    .tb-scroll::-webkit-scrollbar-thumb { background:rgba(212,86,30,.3); border-radius:2px }

    /* ── BUTTONS ── */
    .tb-btn {
      font-family:'Space Mono',monospace; font-size:8.5px; font-weight:700;
      letter-spacing:.2em; padding:8px 16px; cursor:pointer;
      transition:all .14s ease; text-transform:uppercase; white-space:nowrap; border:none;
      clip-path:polygon(5px 0,100% 0,calc(100% - 5px) 100%,0 100%);
      display:flex; align-items:center; gap:6px;
    }
    .tb-btn:disabled { opacity:.22; cursor:not-allowed; }
    .tb-btn-back  { background:transparent; border:1px solid rgba(255,255,255,.1); color:rgba(242,237,228,.42); }
    .tb-btn-back:hover { background:rgba(232,200,74,.06); border-color:rgba(232,200,74,.4); color:#E8C84A; }

    /* ── MATCH CARD ── */
    .mc {
      background:#0C1115;
      border:1px solid rgba(255,255,255,.07);
      transition:border-color .18s, background .18s, box-shadow .18s;
      position:relative; overflow:hidden;
      clip-path:polygon(6px 0,100% 0,calc(100% - 6px) 100%,0 100%);
    }
    .mc::before {
      content:''; position:absolute; inset:0; pointer-events:none;
      background:linear-gradient(110deg,transparent 30%,rgba(255,255,255,.014) 50%,transparent 70%);
      animation:tb-shimmer 7s ease-in-out infinite;
    }
    .mc.playable {
      border-color:rgba(232,200,74,.2);
      box-shadow:0 0 0 0 transparent;
      cursor:pointer;
    }
    .mc.playable:hover {
      border-color:rgba(232,200,74,.7);
      background:#141E26;
      box-shadow:0 0 32px rgba(232,200,74,.12), inset 0 0 20px rgba(232,200,74,.04);
    }
    .mc.playable:hover .mc-hover { opacity:1; pointer-events:all; }
    .mc.done   { border-color:rgba(255,255,255,.04); }
    .mc.bye    { opacity:.35; border-color:transparent; }

    /* Player row */
    .mc-row {
      display:flex; align-items:center; gap:7px;
      padding:0 12px; height:${PLAYER_H}px; box-sizing:border-box;
      position:relative;
    }
    .mc-row.won  { background:rgba(232,200,74,.06); }
    .mc-row.lost { opacity:.24; filter:grayscale(.5); }
    .mc-div { height:1px; background:rgba(255,255,255,.04); }

    .mc-seed {
      font-family:'Space Mono',monospace; font-size:8px;
      color:rgba(232,200,74,.45); min-width:20px; text-align:right; flex-shrink:0;
    }
    .mc-name {
      font-family:'Barlow Condensed',sans-serif; font-size:17px; font-weight:700;
      letter-spacing:.04em; text-transform:uppercase;
      flex:1; min-width:0; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
    }
    .mc-nat {
      font-family:'Space Mono',monospace; font-size:7px; letter-spacing:.14em;
      color:rgba(242,237,228,.3); white-space:nowrap; flex-shrink:0;
    }
    .mc-scores {
      display:flex; flex-direction:column; align-items:flex-end; gap:1px; flex-shrink:0;
    }
    .mc-set {
      font-family:'Space Mono',monospace; font-size:9px;
      letter-spacing:.04em; color:rgba(242,237,228,.28); white-space:nowrap;
    }
    .mc-set.w { color:#E8C84A; font-weight:700; font-size:10px; }
    .mc-set.tb { font-size:7px; opacity:.6; }
    .mc-ovr {
      font-family:'Space Mono',monospace; font-size:10px; letter-spacing:.08em;
      min-width:40px; text-align:right; flex-shrink:0; line-height:1;
    }
    .mc-mindset {
      font-family:'Space Mono',monospace; font-size:8px; font-weight:700;
      letter-spacing:.08em; min-width:22px; text-align:center; flex-shrink:0;
      line-height:1; cursor:help;
    }

    /* Hover overlay */
    .mc-hover {
      position:absolute; inset:0;
      background:rgba(3,5,7,.88);
      display:flex; align-items:center; justify-content:center; gap:9px;
      opacity:0; pointer-events:none; transition:opacity .14s;
    }
    .mc-act {
      font-family:'Space Mono',monospace; font-size:8.5px; font-weight:700;
      letter-spacing:.16em; padding:8px 16px; border:none; cursor:pointer;
      text-transform:uppercase; transition:all .1s;
      clip-path:polygon(4px 0,100% 0,calc(100% - 4px) 100%,0 100%);
    }
    .mc-act-sim   { background:rgba(212,86,30,.3); border:1px solid rgba(212,86,30,.6); color:#F06428; }
    .mc-act-sim:hover { background:rgba(212,86,30,.6); color:#fff; }
    .mc-act-watch { background:rgba(74,144,217,.25); border:1px solid rgba(74,144,217,.5); color:#4A90D9; }
    .mc-act-watch:hover { background:rgba(74,144,217,.5); color:#fff; }

    /* Round label */
    .round-hd {
      font-family:'Space Mono',monospace; font-size:10px; font-weight:700;
      letter-spacing:.36em; text-transform:uppercase; text-align:center;
    }
    .round-hd.active { font-size:11px; }

    /* Phase tabs */
    .phase-tab {
      font-family:'Space Mono',monospace; font-size:9px; font-weight:700;
      letter-spacing:.22em; padding:12px 22px; border:none; background:transparent;
      cursor:pointer; white-space:nowrap; text-transform:uppercase;
      border-bottom:2px solid transparent; transition:all .14s;
    }

    /* Champion banner */
    .champ-banner {
      background:linear-gradient(135deg,rgba(232,200,74,.12),rgba(232,200,74,.03));
      border:1px solid rgba(232,200,74,.36); padding:32px 40px;
      animation:tb-glow 3s ease-in-out infinite;
      clip-path:polygon(10px 0,100% 0,calc(100% - 10px) 100%,0 100%);
    }

    /* Dropdown */
    .tb-dropdown-menu {
      position:absolute; top:calc(100% + 8px); right:0;
      background:#0A0E12; border:1px solid rgba(212,86,30,.25);
      min-width:220px; z-index:200;
      box-shadow:0 16px 48px rgba(0,0,0,.9), 0 0 0 1px rgba(255,255,255,.03);
      animation:tb-in .15s ease both;
    }
    .tb-dropdown-header {
      padding:9px 16px 8px;
      border-bottom:1px solid rgba(255,255,255,.06);
      font-family:'Space Mono',monospace; font-size:7px; letter-spacing:.4em;
      text-transform:uppercase; color:rgba(242,237,228,.25);
    }
    .tb-dropdown-opt {
      display:flex; align-items:center; gap:9px;
      padding:11px 16px; cursor:pointer; transition:background .1s;
      border-bottom:1px solid rgba(255,255,255,.04);
      font-family:'Space Mono',monospace; font-size:8px; font-weight:700;
      letter-spacing:.16em; text-transform:uppercase;
    }
    .tb-dropdown-opt:last-child { border-bottom:none; }
    .tb-dropdown-opt:hover { background:rgba(212,86,30,.08); }
    .tb-dropdown-opt-icon { font-size:15px; width:22px; text-align:center; flex-shrink:0; }

    /* Featured match panel */
    .featured-panel {
      position:relative; overflow:hidden;
      border-bottom:1px solid rgba(255,255,255,.06);
    }
    .featured-panel::before {
      content:''; position:absolute; inset:0; pointer-events:none;
      background:linear-gradient(110deg,transparent 25%,rgba(255,255,255,.012) 50%,transparent 75%);
      animation:tb-shimmer 8s ease-in-out infinite;
    }

    /* Stat bar */
    .stat-bar-track {
      height:5px; background:rgba(255,255,255,.05); overflow:hidden;
      clip-path:polygon(2px 0,100% 0,calc(100% - 2px) 100%,0 100%);
      position:relative;
    }
    .stat-bar-fill {
      height:100%; position:absolute;
      transform-origin:left center;
      animation:tb-bar .7s cubic-bezier(.22,1,.36,1) both;
    }
  `;
  const el = document.createElement('style');
  el.id = 'tb4-styles';
  el.textContent = css;
  document.head.appendChild(el);
}

// ── Helpers ───────────────────────────────────────────────────────────
function runSingleMatch(pA, pB, courtKey, bestOf, tournament = null) {
  const matchMeta = tournament ? { category: tournament.category, format: tournament.format ?? null, isSlamClash: !!tournament.isSlamClash } : null;
  const res = simulateMatchHeadless({ playerData: pA }, { playerData: pB }, courtKey, bestOf, null, !!tournament?.isSlam, matchMeta);
  return { winner: res.sets[0] > res.sets[1] ? pA : pB, result: compactBracketResult(res) };
}

function runSingleMatchSlim(pA, pB, courtKey, bestOf, tournament = null) {
  const matchMeta = tournament ? { category: tournament.category, format: tournament.format ?? null, isSlamClash: !!tournament.isSlamClash } : null;
  const res = simulateMatchSlim({ playerData: pA }, { playerData: pB }, courtKey, bestOf, null, !!tournament?.isSlam, matchMeta);
  return { winner: res.sets[0] > res.sets[1] ? pA : pB, result: compactBracketResult(res) };
}

function runSingleMatchFast(pA, pB, courtKey, bestOf, tournament = null) {
  const surface = courtKeyToSurface(courtKey);
  const res = simulateMatchFast(pA, pB, surface, bestOf, { format: tournament?.format ?? null, tournamentTier: tournament?.category ?? null });
  return { winner: res.sets[0] > res.sets[1] ? pA : pB, result: compactBracketResult(res) };
}

function runSingleMatchMid(pA, pB, courtKey, bestOf, tournament = null) {
  const matchMeta = tournament ? { category: tournament.category, format: tournament.format ?? null, isSlamClash: !!tournament.isSlamClash } : null;
  const res = simulateMatchMid({ playerData: pA }, { playerData: pB }, courtKey, bestOf, null, !!tournament?.isSlam, matchMeta);
  return { winner: res.sets[0] > res.sets[1] ? pA : pB, result: compactBracketResult(res) };
}

function compactPlayerMatchState(player) {
  if (!player) return null;
  return {
    id: player.id,
    name: player.name,
    _matchPlan: player._matchPlan ?? null,
    ctx: player.ctx
      ? {
          currentIntent: player.ctx.currentIntent ?? null,
          pressureScore: player.ctx.pressureScore ?? null,
          netIntent: player.ctx.netIntent ?? null,
          momentum: player.ctx.momentum ?? null,
          confidence: player.ctx.confidence ?? null,
        }
      : null,
  };
}

function compactMatchStatsSide(side) {
  if (!side) return {};
  const {
    serveLog,
    rallyLengths,
    recentGames,
    pointSeq,
    momentumTrail,
    ...rest
  } = side;
  return {
    ...rest,
    byType: side.byType ? { ...side.byType } : undefined,
  };
}

function compactBracketResult(result) {
  if (!result) return result;
  return {
    _slim: !!result._slim,
    sets: Array.isArray(result.sets) ? [...result.sets] : [0, 0],
    setsDetail: Array.isArray(result.setsDetail) ? result.setsDetail.map(([a, b]) => [a, b]) : [],
    stats: {
      a: compactMatchStatsSide(result.stats?.a),
      b: compactMatchStatsSide(result.stats?.b),
    },
    telemetry: result.telemetry ? { ...result.telemetry } : undefined,
    edgeCases: Array.isArray(result.edgeCases) ? [...result.edgeCases] : undefined,
    retirement: result.retirement ?? null,
    inMatchInjuryEvents: Array.isArray(result.inMatchInjuryEvents) ? [...result.inMatchInjuryEvents] : [],
    matchNarrativeDossier: result.matchNarrativeDossier ? { ...result.matchNarrativeDossier } : undefined,
    matchStoryCapsules: Array.isArray(result.matchStoryCapsules) ? result.matchStoryCapsules.slice(-12).map(e => ({ ...e })) : undefined,
    winner: compactPlayerMatchState(result.winner),
    loser: compactPlayerMatchState(result.loser),
    log: Array.isArray(result.log) ? result.log.slice(-120) : [],
  };
}

// Seleciona engine de acordo com categoria e rodada atual.
// Qualifying fica fast. ATP 250/500 usam fastsim antes da QF e mid depois.
// Masters/GS usam fastsim antes da R16 e mid depois.
function getAutoEngine(drawSize, playersInRound, tournament = null, phase = 'main') {
  if (phase === 'qualifying') return runSingleMatchFast;
  const category = tournament?.category ?? null;
  if (category === 'SLAM_CLASH') {
    return playersInRound <= 8 ? runSingleMatch : runSingleMatchSlim;
  }
  if (category === 'ATP_250' || category === 'ATP_500') {
    return playersInRound > 8 ? runSingleMatchFast : runSingleMatchMid;
  }
  if (category === 'MASTERS_1000' || category === 'GRAND_SLAM') {
    return playersInRound > 16 ? runSingleMatchFast : runSingleMatchMid;
  }
  if (playersInRound <= 16) return runSingleMatchMid;
  if (drawSize >= 128)     return runSingleMatchSlim;
  return runSingleMatchMid;
}

// Returns true if we should STOP simulating at this round given the target.
// Uses match count of the current round to identify QF/SF/F stages, regardless of
// how many total rounds exist (since rounds are added dynamically to the bracket).
// target: 'all' | 'phase' | 'qf' | 'sf' | 'f'
// ri: current round index
// startRound: the round index when simulation started (for 'phase')
// rounds: current rounds array (to count matches in current round)
function shouldStopBefore(target, ri, startRound, rounds) {
  if (target === 'all')   return false;                     // simulate everything
  if (target === 'phase') return ri > startRound;           // only simulate starting round
  // Count real matches (non-bye, has both players) in this round
  const playable = rounds[ri]?.filter(m => !m.isBye && m.playerA && m.playerB).length ?? 0;
  if (target === 'f')  return playable <= 1;  // stop if this is the final (1 match)
  if (target === 'sf') return playable <= 2;  // stop if this is SF or later
  if (target === 'qf') return playable <= 4;  // stop if this is QF or later
  return false;
}

function applyAndAdvance(bracket, ri, mi, winner, result) {
  const newRounds = bracket.rounds.map((round, r) =>
    r !== ri ? round : round.map((m, i) => i !== mi ? m : { ...m, winner, result })
  );
  let nb = { ...bracket, rounds: newRounds };
  if (newRounds[ri].every(m => m.winner != null || (!m.playerA && !m.playerB)))
    nb = advanceRound(nb);
  return nb;
}

function applyAndAdvanceQ(qb, ri, mi, winner, result) {
  const newRounds = qb.rounds.map((round, r) =>
    r !== ri ? round : round.map((m, i) => i !== mi ? m : { ...m, winner, result })
  );
  let nq = { ...qb, rounds: newRounds };
  if (newRounds[ri].every(m => m.winner != null || (!m.playerA && !m.playerB)))
    nq = advanceQualifyingRound(nq);
  return nq;
}

function buildSeedMap(rounds) {
  if (!rounds?.[0]) return {};
  const players = rounds[0].flatMap(m => [m.playerA, m.playerB]).filter(Boolean);
  const sorted  = [...players].sort((a, b) => (a.rankPosition ?? 999) - (b.rankPosition ?? 999));
  const map = {};
  sorted.slice(0, 16).forEach((p, i) => { map[p.id] = i + 1; });
  return map;
}

function sumCareerTitles(player) {
  return Object.values(player?.careerTitles ?? {}).reduce((acc, value) => acc + (Number(value) || 0), 0);
}

function getSurfaceSnapshot(player, surface) {
  const ss = player?.surfaceStats?.[surface] ?? {};
  const wins = ss.wins ?? 0;
  const losses = ss.losses ?? 0;
  const total = wins + losses;
  return {
    wins,
    losses,
    total,
    titlesWon: ss.titlesWon ?? 0,
    winPct: total > 0 ? Math.round((wins / total) * 100) : null,
  };
}

function getRecentRecord(player, count = 8) {
  const results = player?.recentForm?.results ?? [];
  const slice = results.slice(-count);
  const wins = slice.filter(r => r?.won).length;
  const losses = Math.max(0, slice.length - wins);
  return {
    wins,
    losses,
    total: slice.length,
    label: slice.length ? `${wins}-${losses}` : 'sem dados',
  };
}

function pctFromRatio(won, lost) {
  const total = (won ?? 0) + (lost ?? 0);
  return total > 0 ? Math.round(((won ?? 0) / total) * 100) : null;
}

function formatPct(value) {
  return value == null || Number.isNaN(value) ? '--' : `${Math.round(value)}%`;
}

function formatSignedDiff(diff, invert = false) {
  if (diff == null) return '--';
  const value = invert ? -diff : diff;
  if (value === 0) return 'empate';
  return `${value > 0 ? '+' : ''}${value}`;
}

function getClutchSnapshot(player) {
  const tb = player?.recentForm?.tiebreakForm ?? 0.5;
  return {
    raw: tb,
    pct: Math.round(tb * 100),
  };
}

function getPlayerIdentityLine(player) {
  const age = player?.age ?? (player?.birthYear ? (new Date().getFullYear() - player.birthYear) : null);
  return [
    player?.nationality ?? '--',
    age ? `${age}a` : null,
    player?.styleId ?? null,
  ].filter(Boolean).join(' · ');
}

function safePlayerName(player, fallback = 'Jogador') {
  return player?.name ?? fallback;
}

function safeFirstName(player, fallback = 'Jogador') {
  return safePlayerName(player, fallback).split(' ')[0] || fallback;
}

function safeLastName(player, fallback = 'Jogador') {
  const parts = safePlayerName(player, fallback).split(' ').filter(Boolean);
  return parts[parts.length - 1] || fallback;
}

function normalizePair(idA, idB) {
  return [String(idA), String(idB)].sort().join('__');
}

function collectH2H(playerA, playerB, historicalTournamentResults = {}) {
  if (!playerA?.id || !playerB?.id) return null;
  const key = normalizePair(playerA.id, playerB.id);
  const summary = {
    total: 0,
    aWins: 0,
    bWins: 0,
    seasonAWins: 0,
    seasonBWins: 0,
    finalsCount: 0,
    surface: null,
    bySurface: {},
    lastMeeting: null,
  };
  const surfaceMap = {};

  for (const res of Object.values(historicalTournamentResults ?? {})) {
    if (!res) continue;
    const year = res._season ?? res.tournament?.season ?? null;
    const surface = res.tournament?.surface ?? null;
    const tName = res.tournament?.name ?? null;
    const rounds = res._slim ? [] : (res.bracket?.rounds ?? []);

    for (const round of rounds) {
      for (const match of round ?? []) {
        if (!match?.winner || !match?.playerA || !match?.playerB) continue;
        if (normalizePair(match.playerA.id, match.playerB.id) !== key) continue;
        summary.total += 1;
        if ((round?.length ?? 0) === 1) summary.finalsCount += 1;
        const winnerId = match.winner?.id;
        if (winnerId === playerA.id) summary.aWins += 1;
        if (winnerId === playerB.id) summary.bWins += 1;
        if (year != null && year === new Date().getFullYear()) {
          if (winnerId === playerA.id) summary.seasonAWins += 1;
          if (winnerId === playerB.id) summary.seasonBWins += 1;
        }
        if (surface) {
          surfaceMap[surface] ??= { surface, aWins: 0, bWins: 0, total: 0 };
          surfaceMap[surface].total += 1;
          if (winnerId === playerA.id) surfaceMap[surface].aWins += 1;
          if (winnerId === playerB.id) surfaceMap[surface].bWins += 1;
        }
        const score = match.result?.setsDetail?.map(([a, b]) => `${a}-${b}`).join(' ') ?? null;
        const stamp = Number(year ?? 0);
        if (!summary.lastMeeting || stamp >= summary.lastMeeting.year) {
          summary.lastMeeting = {
            year: stamp,
            tournament: tName,
            surface,
            winnerId,
            score,
          };
        }
      }
    }
  }

  if (summary.lastMeeting?.surface && surfaceMap[summary.lastMeeting.surface]) {
    summary.surface = surfaceMap[summary.lastMeeting.surface];
  }
  summary.bySurface = surfaceMap;

  return summary.total > 0 ? summary : null;
}

function makeFeaturedInsight(playerA, playerB, surface, h2h) {
  const aSurface = getSurfaceSnapshot(playerA, surface);
  const bSurface = getSurfaceSnapshot(playerB, surface);
  const aForm = getRecentRecord(playerA, 8);
  const bForm = getRecentRecord(playerB, 8);
  const aClutch = getClutchSnapshot(playerA);
  const bClutch = getClutchSnapshot(playerB);

  if (h2h?.total >= 3) {
    if (h2h.aWins === h2h.bWins) return `Serie equilibrada: ${h2h.aWins}-${h2h.bWins} no H2H.`;
    const leader = h2h.aWins > h2h.bWins ? playerA : playerB;
    const leadW = Math.max(h2h.aWins, h2h.bWins);
    const trailW = Math.min(h2h.aWins, h2h.bWins);
    return `${safeFirstName(leader)} chega com vantagem no H2H: ${leadW}-${trailW}.`;
  }
  if (aSurface.winPct != null && bSurface.winPct != null && Math.abs(aSurface.winPct - bSurface.winPct) >= 18) {
    const leader = aSurface.winPct > bSurface.winPct ? playerA : playerB;
    const pct = Math.max(aSurface.winPct, bSurface.winPct);
    return `${safeFirstName(leader)} traz perfil mais forte na superficie: ${pct}% de aproveitamento.`;
  }
  if (Math.abs(aClutch.pct - bClutch.pct) >= 14) {
    const leader = aClutch.pct > bClutch.pct ? playerA : playerB;
    return `${safeFirstName(leader)} entra com leitura melhor de tiebreak e ponto grande.`;
  }
  if (aForm.total && bForm.total) {
    const leader = aForm.wins > bForm.wins ? playerA : playerB;
    if (aForm.wins !== bForm.wins) return `${safeFirstName(leader)} chega em forma melhor nas ultimas ${Math.max(aForm.total, bForm.total)} partidas.`;
  }
  return 'Confronto sem favorito claro: forma, superficie e pressao chegam bem proximas.';
}

function getMatchStatRows(result) {
  const statsA = result?.stats?.a ?? {};
  const statsB = result?.stats?.b ?? {};
  return [
    {
      label: 'ACES',
      a: statsA.aces ?? 0,
      b: statsB.aces ?? 0,
    },
    {
      label: '1O SAQUE',
      a: formatPct(statsA.serve1InPct ?? pctFromRatio(statsA.serve1In ?? 0, statsA.serve1Miss ?? 0)),
      b: formatPct(statsB.serve1InPct ?? pctFromRatio(statsB.serve1In ?? 0, statsB.serve1Miss ?? 0)),
    },
    {
      label: 'PTS 1O',
      a: formatPct(statsA.serve1WonPct ?? pctFromRatio(statsA.serve1WonPoints, statsA.serve1LostPoints)),
      b: formatPct(statsB.serve1WonPct ?? pctFromRatio(statsB.serve1WonPoints, statsB.serve1LostPoints)),
    },
    {
      label: 'PTS 2O',
      a: formatPct(statsA.serve2WonPct ?? pctFromRatio(statsA.serve2WonPoints, statsA.serve2LostPoints)),
      b: formatPct(statsB.serve2WonPct ?? pctFromRatio(statsB.serve2WonPoints, statsB.serve2LostPoints)),
    },
    {
      label: 'WINNERS',
      a: statsA.winners ?? 0,
      b: statsB.winners ?? 0,
    },
    {
      label: 'UE',
      a: statsA.ue ?? 0,
      b: statsB.ue ?? 0,
    },
    {
      label: 'BREAK PTS',
      a: `${statsA.gamesConverted ?? 0}/${statsA.gamesReturned ?? 0}`,
      b: `${statsB.gamesConverted ?? 0}/${statsB.gamesReturned ?? 0}`,
    },
  ];
}

function getBoxscoreInsight(result, winner, loser) {
  const statsW = result?.winner?.stats ?? result?.stats?.a ?? {};
  const statsL = result?.loser?.stats ?? result?.stats?.b ?? {};
  const aceGap = (statsW.aces ?? 0) - (statsL.aces ?? 0);
  const winnerGap = (statsW.winners ?? 0) - (statsL.winners ?? 0);
  const ueGap = (statsL.ue ?? 0) - (statsW.ue ?? 0);
  const breakGap = (statsW.gamesConverted ?? 0) - (statsL.gamesConverted ?? 0);

  if (aceGap >= 8) return `${winner?.name?.split(' ')[0] ?? 'O vencedor'} controlou o match pelo saque, abrindo ${aceGap} aces de frente.`;
  if (winnerGap >= 8) return `${winner?.name?.split(' ')[0] ?? 'O vencedor'} acelerou mais e terminou com ${winnerGap} winners a mais.`;
  if (ueGap >= 8) return `${loser?.name?.split(' ')[0] ?? 'O derrotado'} vazou mais no erro nao forcado, cedendo ${ueGap} bolas de margem.`;
  if (breakGap >= 2) return `${winner?.name?.split(' ')[0] ?? 'O vencedor'} foi mais letal nas poucas janelas de break que o jogo abriu.`;
  return 'O confronto foi decidido em margens curtas, com pouca diferenca entre controle e agressao.';
}

function sumCareerRecord(player) {
  let wins = 0;
  let losses = 0;
  for (const raw of Object.values(player?.surfaceStats ?? {})) {
    wins += raw?.wins ?? raw?.w ?? 0;
    losses += raw?.losses ?? raw?.l ?? 0;
  }
  const total = wins + losses;
  return {
    wins,
    losses,
    total,
    winPct: total > 0 ? Math.round((wins / total) * 100) : null,
  };
}

function getCareerDeepStats(player, historicalTournamentResults = {}, surface = 'HARD') {
  const stats = {
    qf: 0,
    sf: 0,
    finals: 0,
    titles: 0,
    finalsWon: 0,
    finalsLost: 0,
    surfaceFinals: 0,
    surfaceTitles: 0,
  };
  if (!player?.id) return stats;

  for (const res of Object.values(historicalTournamentResults ?? {})) {
    const rounds = res?._slim ? [] : (res?.bracket?.rounds ?? []);
    const tournamentSurface = res?.tournament?.surface ?? null;
    for (const round of rounds) {
      const size = round?.length ?? 0;
      for (const match of round ?? []) {
        if (!match?.playerA || !match?.playerB) continue;
        const involved = match.playerA.id === player.id || match.playerB.id === player.id;
        if (!involved) continue;
        if (size === 4) stats.qf += 1;
        if (size === 2) stats.sf += 1;
        if (size === 1) {
          stats.finals += 1;
          if (tournamentSurface === surface) stats.surfaceFinals += 1;
          if (match.winner?.id === player.id) {
            stats.titles += 1;
            stats.finalsWon += 1;
            if (tournamentSurface === surface) stats.surfaceTitles += 1;
          } else if (match.winner) {
            stats.finalsLost += 1;
          }
        }
      }
    }
  }

  return stats;
}

function getPlayerTraitBadges(player, limit = 4) {
  try {
    return (getPlayerTraits(player) ?? [])
      .slice(0, limit)
      .map(slot => slot?.name ?? slot?.traitId)
      .filter(Boolean);
  } catch {
    return [];
  }
}

function getPlayerStyleSnapshot(player) {
  const prefs = player?.prefs ?? generatePrefs(player?.attrs ?? {});
  const archetype = getArchetype(prefs);
  return {
    archetype,
    prefs,
    buildStyle: prefs?.buildStyle ?? '--',
    intent: getRallyIntentMeta(prefs)?.label ?? '--',
    net: prefs?.netGame ?? '--',
  };
}

function sanitizeBracketSavedState(savedState, tournamentId = null) {
  if (!savedState || typeof savedState !== 'object') return null;
  const bracket = savedState.bracket ?? null;
  const qBracket = savedState.qBracket ?? null;
  const phase = savedState.phase ?? null;
  const qualifiers = Array.isArray(savedState.qualifiers) ? savedState.qualifiers.filter(Boolean) : [];
  const claimedTournamentId = savedState.tournamentId ?? null;
  const hasBracketRounds = Array.isArray(bracket?.rounds) && bracket.rounds.length > 0;
  const hasQRounds = Array.isArray(qBracket?.rounds) && qBracket.rounds.length > 0;

  if (tournamentId && claimedTournamentId && claimedTournamentId !== tournamentId) return null;
  if (phase === 'MAIN_DRAW' && !hasBracketRounds) return null;
  if (phase === 'QUALIFYING' && !hasQRounds) return null;
  if (!phase && !hasBracketRounds && !hasQRounds) return null;

  return {
    phase: phase ?? (hasBracketRounds ? 'MAIN_DRAW' : 'QUALIFYING'),
    qBracket: hasQRounds ? qBracket : null,
    qDone: hasQRounds ? !!savedState.qDone : !!hasBracketRounds,
    bracket: hasBracketRounds ? bracket : null,
    qualifiers,
    done: !!savedState.done,
    tournamentId: claimedTournamentId ?? tournamentId ?? null,
  };
}

function getCareerStatPanels(player, historicalTournamentResults, surface) {
  const titles = player?.careerTitles ?? {};
  const deep = getCareerDeepStats(player, historicalTournamentResults, surface);
  const record = sumCareerRecord(player);
  const bestRank = player?.careerBest ?? player?.rankPosition ?? null;
  const surfaceSnap = getSurfaceSnapshot(player, surface);
  return {
    bestRank,
    record,
    deep,
    surfaceSnap,
    titles,
  };
}

// ── Foto do jogador (com fallback para iniciais) ──────────────────
function PlayerFace({ player, size = 20, borderColor }) {
  const photo = getPlayerPhoto(player?.namedPlayerKey || player);
  const [imgOk, setImgOk] = React.useState(!!photo);
  const bc = borderColor || (player?.color ? `${player.color}66` : 'rgba(255,255,255,.2)');
  const initials = player?.name?.slice(0, 2)?.toUpperCase() ?? '?';
  const sizeStyle = { width: size, height: size, borderRadius: '50%', flexShrink: 0, overflow: 'hidden', border: `1.5px solid ${bc}`, background: player?.color || '#1a2a1a', display: 'flex', alignItems: 'center', justifyContent: 'center' };
  if (photo && imgOk) {
    return (
      <div style={sizeStyle}>
        <img src={photo} alt={player?.name} onError={() => setImgOk(false)}
          style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center' }} />
      </div>
    );
  }
  return (
    <div style={{ ...sizeStyle, fontSize: size * 0.38, fontWeight: 700, color: '#fff', fontFamily: "'Barlow Condensed',sans-serif" }}>
      {initials}
    </div>
  );
}

function MindsetBadge({ mindset }) {
  const m = mindset ?? { tier: '0', label: 'Focado', modifier: 1, reason: 'Preparacao normal' };
  const iconMap = {
    '+++': '▲▲▲',
    '++': '▲▲',
    '+': '▲',
    '0': '•',
    '-': '▼',
    '--': '▼▼',
    '---': '▼▼▼',
  };
  const colorMap = {
    '+++': '#5CFF9B',
    '++': '#8CFFB8',
    '+': '#B8FFD0',
    '0': 'rgba(242,237,228,.3)',
    '-': '#FFB36B',
    '--': '#FF7A62',
    '---': '#FF4D5E',
  };
  const tier = m.tier ?? '0';
  const color = colorMap[tier] ?? colorMap['0'];
  const pct = Math.round(((m.modifier ?? 1) - 1) * 100);
  const pctText = pct === 0 ? '100% dos atributos neste torneio' : `${pct > 0 ? '+' : ''}${pct}% neste torneio`;
  const title = `${m.label ?? 'Focado'}: ${m.reason ?? 'Preparacao normal'} (${pctText})`;

  return (
    <span
      className="mc-mindset"
      title={title}
      style={{
        color,
        opacity: tier === '0' ? .55 : .95,
        textShadow: tier !== '0' ? `0 0 10px ${color}55` : 'none',
      }}
    >
      {iconMap[tier] ?? iconMap['0']}
    </span>
  );
}

// ── Helper: format set scores from setsDetail ─────────────────────────
function formatSetScores(result, playerIsA) {
  if (!result) return null;
  // setsDetail: [[gA,gB], ...] per set
  if (result.setsDetail && result.setsDetail.length > 0) {
    return result.setsDetail.map(([gA, gB]) => ({
      mine: playerIsA ? gA : gB,
      opp:  playerIsA ? gB : gA,
    }));
  }
  // fallback: just sets won
  return null;
}


// ── Helpers visuais ────────────────────────────────────────────────────
function ATTR(attrs, key) { return attrs?.[key] ?? 50; }

function StatBar({ label, valA, valB, color, delay = 0 }) {
  const total = valA + valB || 1;
  const pctA = Math.round((valA / total) * 100);
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, alignItems: 'center' }}>
        <span style={{ fontFamily: T.disp, fontSize: 20, color: T.white, letterSpacing: '.04em', lineHeight: 1 }}>{valA}</span>
        <span style={{ fontFamily: T.mono, fontSize: 7, letterSpacing: '.3em', color: 'rgba(242,237,228,.3)', textTransform: 'uppercase' }}>{label}</span>
        <span style={{ fontFamily: T.disp, fontSize: 20, color: T.white, letterSpacing: '.04em', lineHeight: 1 }}>{valB}</span>
      </div>
      <div style={{ position: 'relative', height: 5, background: 'rgba(255,255,255,.05)', display: 'flex', overflow: 'hidden', clipPath: 'polygon(2px 0,100% 0,calc(100% - 2px) 100%,0 100%)' }}>
        <div className="stat-bar-fill" style={{ width: `${pctA}%`, background: color, animationDelay: `${delay}s` }} />
        <div className="stat-bar-fill" style={{ width: `${100 - pctA}%`, background: `${color}44`, animationDelay: `${delay}s` }} />
      </div>
    </div>
  );
}

// ── Featured Match — Grande Confronto da Rodada ────────────────────────
function FeaturedMatch({ match, roundLabel, roundLabelFull, sc, seedMap, surface = 'HARD', historicalTournamentResults = {}, currentYear = null, tournament = null }) {
  if (!match || !match.playerA || !match.playerB) return null;
  const { playerA, playerB, winner, result } = match;
  const ovrA = overallRating(playerA.attrs);
  const ovrB = overallRating(playerB.attrs);
  const sA = seedMap?.[playerA.id];
  const sB = seedMap?.[playerB.id];

  const isPlayed = !!winner;
  const winnerIsA = winner?.id === playerA.id;
  const h2h = collectH2H(playerA, playerB, historicalTournamentResults);
  const aSurface = getSurfaceSnapshot(playerA, surface);
  const bSurface = getSurfaceSnapshot(playerB, surface);
  const aForm = getRecentRecord(playerA, 8);
  const bForm = getRecentRecord(playerB, 8);
  const aClutch = getClutchSnapshot(playerA);
  const bClutch = getClutchSnapshot(playerB);
  const aTitles = sumCareerTitles(playerA);
  const bTitles = sumCareerTitles(playerB);
  const featuredInsight = makeFeaturedInsight(playerA, playerB, surface, h2h);
  const identityDuel = useMemo(() => buildIdentityDuel(playerA, playerB, { surfaceKey: surface }), [playerA, playerB, surface]);

  const setsA = result?.sets?.[0] ?? (result?.setsDetail?.filter(([a,b]) => a > b).length ?? 0);
  const setsB = result?.sets?.[1] ?? (result?.setsDetail?.filter(([a,b]) => b > a).length ?? 0);
  const featScoreStr = isPlayed
    ? (result?.format === 'SUPER_TB_10'
        ? (result?.setsDetail?.[0] ? `${winnerIsA ? result.setsDetail[0][0] : result.setsDetail[0][1]}-${winnerIsA ? result.setsDetail[0][1] : result.setsDetail[0][0]}` : (winnerIsA ? `${setsA}-${setsB}` : `${setsB}-${setsA}`))
        : (winnerIsA ? `${setsA}-${setsB}` : `${setsB}-${setsA}`))
    : null;

  const compareRows = [
    {
      label: 'FORMA',
      aValue: aForm.label,
      bValue: bForm.label,
      aBar: aForm.wins,
      bBar: bForm.wins,
      note: 'ultimas 8',
    },
    {
      label: `${surface} %`,
      aValue: aSurface.winPct != null ? `${aSurface.winPct}%` : '--',
      bValue: bSurface.winPct != null ? `${bSurface.winPct}%` : '--',
      aBar: aSurface.winPct ?? 0,
      bBar: bSurface.winPct ?? 0,
      note: 'na superficie',
    },
    {
      label: 'TIEBREAK',
      aValue: `${aClutch.pct}%`,
      bValue: `${bClutch.pct}%`,
      aBar: aClutch.pct,
      bBar: bClutch.pct,
      note: 'frieza recente',
    },
    {
      label: 'TITULOS',
      aValue: aTitles,
      bValue: bTitles,
      aBar: aTitles,
      bBar: bTitles,
      note: 'carreira',
    },
  ];

  const centerChips = [
    h2h?.total ? { label: 'H2H', value: `${h2h.aWins}-${h2h.bWins}` } : { label: 'H2H', value: '1o duelo' },
    currentYear && h2h?.total ? { label: `${currentYear}`, value: `${h2h.seasonAWins}-${h2h.seasonBWins}` } : { label: 'surface', value: SURFACE_CLR[surface]?.label ?? surface },
    tournament?.category ? { label: 'evento', value: CAT_LABEL[tournament.category] ?? tournament.category } : null,
  ].filter(Boolean);

  const PlayerCard = ({ player, seed, ovr, align = 'left', dimmed = false, isWinner = false }) => (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      opacity: dimmed ? .38 : 1,
      transition: 'opacity .3s',
      alignItems: align === 'right' ? 'flex-end' : 'flex-start',
      textAlign: align,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexDirection: align === 'right' ? 'row-reverse' : 'row' }}>
        <PlayerFace player={player} size={56} borderColor={isWinner ? T.gold : `${sc.main}55`} />
        <div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: align === 'right' ? 'flex-end' : 'flex-start', flexWrap: 'wrap', marginBottom: 4 }}>
            {seed && <span style={{ fontFamily: T.mono, fontSize: 7.5, color: T.gold, letterSpacing: '.18em' }}>[{seed}] SEED</span>}
            {player.rankPosition && <span style={{ fontFamily: T.mono, fontSize: 7.5, color: 'rgba(242,237,228,.46)', letterSpacing: '.18em' }}>#{player.rankPosition}</span>}
          </div>
          <div style={{ fontFamily: T.disp, fontSize: 'clamp(24px,2.65vw,38px)', color: isWinner ? T.gold : T.white, letterSpacing: '.04em', lineHeight: .9, textTransform: 'uppercase' }}>
            {player.name}
          </div>
          <div style={{ fontFamily: T.mono, fontSize: 7.5, color: 'rgba(242,237,228,.34)', letterSpacing: '.16em', marginTop: 6 }}>
            {getPlayerIdentityLine(player)}
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: align === 'right' ? 'flex-end' : 'flex-start' }}>
        <div style={{ background: 'rgba(255,255,255,.04)', border: `1px solid ${ovrTier(ovr).color}44`, padding: '6px 12px', textAlign: 'center', clipPath: 'polygon(4px 0,100% 0,calc(100% - 4px) 100%,0 100%)' }}>
          <div style={{ fontFamily: T.disp, fontSize: 24, color: ovrTier(ovr).color, lineHeight: 1 }}>{ovrTier(ovr).grade}</div>
          <div style={{ fontFamily: T.mono, fontSize: 6, color: 'rgba(242,237,228,.3)', letterSpacing: '.28em' }}>NIVEL</div>
        </div>
        <div style={{ background: 'rgba(255,255,255,.04)', border: `1px solid ${sc.main}22`, padding: '6px 12px', textAlign: 'center', clipPath: 'polygon(4px 0,100% 0,calc(100% - 4px) 100%,0 100%)' }}>
          <div style={{ fontFamily: T.disp, fontSize: 24, color: sc.light, lineHeight: 1 }}>{sumCareerTitles(player)}</div>
          <div style={{ fontFamily: T.mono, fontSize: 6, color: 'rgba(242,237,228,.3)', letterSpacing: '.28em' }}>TITULOS</div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="featured-panel" style={{
      background: `linear-gradient(135deg, ${sc.main}12 0%, rgba(3,5,7,.98) 40%, rgba(3,5,7,.98) 60%, ${sc.main}08 100%)`,
      padding: '0',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 28px 0' }}>
        <div style={{ width: 3, height: 16, background: sc.main, flexShrink: 0 }} />
        <span style={{ fontFamily: T.mono, fontSize: 8, letterSpacing: '.44em', color: `${sc.light}`, textTransform: 'uppercase' }}>
          {isPlayed ? 'RESULTADO DA ' : 'FEATURE MATCH · '}{roundLabelFull?.toUpperCase()}
        </span>
        <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg, ${sc.main}44, transparent)` }} />
        {isPlayed && (
          <span style={{ fontFamily: T.disp, fontSize: 14, color: T.gold, letterSpacing: '.18em' }}>
            {safeLastName(winner).toUpperCase()}
          </span>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr minmax(290px, 360px) 1fr', gap: 18, padding: '18px 28px 14px', alignItems: 'start' }}>
        <PlayerCard player={playerA} seed={sA} ovr={ovrA} align="left" dimmed={isPlayed && !winnerIsA} isWinner={isPlayed && winnerIsA} />

        <div style={{ padding: '4px 10px 0', minWidth: 0 }}>
          <div style={{ textAlign: 'center', marginBottom: 14 }}>
            {isPlayed ? (
              <div style={{ fontFamily: T.disp, fontSize: 44, color: sc.main, letterSpacing: '.1em', lineHeight: 1 }}>
                {featScoreStr}
              </div>
            ) : (
              <>
                <div style={{ fontFamily: T.disp, fontSize: 52, color: `${sc.main}88`, letterSpacing: '.08em', lineHeight: 1 }}>VS</div>
                <div style={{ fontFamily: T.mono, fontSize: 7, color: 'rgba(242,237,228,.2)', letterSpacing: '.4em', marginTop: 4 }}>
                  {roundLabelFull?.toUpperCase()}
                </div>
              </>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 14 }}>
            {centerChips.map((chip, idx) => (
              <div key={`${chip.label}-${idx}`} style={{ minWidth: 82, background: 'rgba(255,255,255,.04)', border: `1px solid ${sc.main}22`, padding: '6px 10px', textAlign: 'center', clipPath: 'polygon(4px 0,100% 0,calc(100% - 4px) 100%,0 100%)' }}>
                <div style={{ fontFamily: T.mono, fontSize: 6, color: 'rgba(242,237,228,.3)', letterSpacing: '.28em', textTransform: 'uppercase' }}>{chip.label}</div>
                <div style={{ fontFamily: T.disp, fontSize: 24, color: chip.label === 'H2H' ? T.gold : T.white, lineHeight: 1, marginTop: 2 }}>{chip.value}</div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {compareRows.map((row, i) => {
              const total = Math.max(1, row.aBar + row.bBar);
              const aPct = Math.max(10, Math.round((row.aBar / total) * 100));
              const bPct = Math.max(10, Math.round((row.bBar / total) * 100));
              return (
                <div key={row.label} style={{ border: '1px solid rgba(255,255,255,.05)', background: 'rgba(255,255,255,.018)', padding: '8px 10px 9px', clipPath: 'polygon(4px 0,100% 0,calc(100% - 4px) 100%,0 100%)' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 10 }}>
                    <div style={{ fontFamily: T.disp, fontSize: 24, color: winnerIsA || !isPlayed ? sc.light : T.white, lineHeight: 1 }}>{row.aValue}</div>
                    <div style={{ fontFamily: T.mono, fontSize: 7, color: T.gold, letterSpacing: '.24em', textTransform: 'uppercase', textAlign: 'center' }}>{row.label}</div>
                    <div style={{ fontFamily: T.disp, fontSize: 24, color: !winnerIsA || !isPlayed ? '#8CF1B2' : T.white, lineHeight: 1, textAlign: 'right' }}>{row.bValue}</div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 10, marginTop: 7 }}>
                    <div className="stat-bar-track">
                      <div className="stat-bar-fill" style={{ width: `${aPct}%`, background: `linear-gradient(90deg, ${sc.main}, ${sc.light})`, animationDelay: `${i * 0.05}s` }} />
                    </div>
                    <div style={{ fontFamily: T.mono, fontSize: 6, color: 'rgba(242,237,228,.24)', letterSpacing: '.2em', textTransform: 'uppercase' }}>{row.note}</div>
                    <div className="stat-bar-track">
                      <div className="stat-bar-fill" style={{ width: `${bPct}%`, background: 'linear-gradient(90deg, rgba(140,241,178,.35), #8CF1B2)', marginLeft: 'auto', transformOrigin: 'right center', animationDelay: `${i * 0.05}s` }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <PlayerCard player={playerB} seed={sB} ovr={ovrB} align="right" dimmed={isPlayed && winnerIsA} isWinner={isPlayed && !winnerIsA} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr .8fr', gap: 18, padding: '0 28px 20px' }}>
        <div style={{ background: 'rgba(255,255,255,.025)', border: '1px solid rgba(255,255,255,.06)', padding: '14px 16px', clipPath: 'polygon(6px 0,100% 0,calc(100% - 6px) 100%,0 100%)' }}>
          <div style={{ fontFamily: T.mono, fontSize: 7, color: sc.light, letterSpacing: '.32em', textTransform: 'uppercase', marginBottom: 8 }}>Leitura do duelo</div>
          <div style={{ fontFamily: T.body, fontSize: 15, fontWeight: 600, color: T.white, lineHeight: 1.55 }}>{featuredInsight}</div>
        </div>
        <div style={{ background: 'rgba(255,255,255,.025)', border: '1px solid rgba(255,255,255,.06)', padding: '14px 16px', clipPath: 'polygon(6px 0,100% 0,calc(100% - 6px) 100%,0 100%)' }}>
          <div style={{ fontFamily: T.mono, fontSize: 7, color: sc.light, letterSpacing: '.32em', textTransform: 'uppercase', marginBottom: 8 }}>Ultimo encontro</div>
          <div style={{ fontFamily: T.disp, fontSize: 24, color: T.white, lineHeight: 1 }}>
            {h2h?.lastMeeting ? `${h2h.lastMeeting.year}` : 'sem historico'}
          </div>
          <div style={{ fontFamily: T.body, fontSize: 13, color: 'rgba(242,237,228,.58)', lineHeight: 1.45, marginTop: 6 }}>
            {h2h?.lastMeeting
              ? `${h2h.lastMeeting.tournament ?? 'Evento'}${h2h.lastMeeting.score ? ` · ${h2h.lastMeeting.score}` : ''}`
              : `Primeiro duelo em ${tournament?.name ?? 'chave atual'}.`}
          </div>
        </div>
      </div>

      {identityDuel && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr .9fr 1fr', gap: 18, padding: '0 28px 22px' }}>
          {[identityDuel.a, identityDuel.b].map((identity, idx) => (
            <div key={identity.player?.id ?? idx} style={{ background: 'rgba(255,255,255,.025)', border: '1px solid rgba(255,255,255,.06)', padding: '14px 16px', clipPath: 'polygon(6px 0,100% 0,calc(100% - 6px) 100%,0 100%)' }}>
              <div style={{ fontFamily: T.mono, fontSize: 7, color: idx === 0 ? sc.main : '#8CF1B2', letterSpacing: '.32em', textTransform: 'uppercase', marginBottom: 8 }}>
                {idx === 0 ? 'DNA A' : 'DNA B'}
              </div>
              <div style={{ fontFamily: T.disp, fontSize: 22, color: T.white, lineHeight: 1, textTransform: 'uppercase' }}>
                {identity.signature.headline}
              </div>
              <div style={{ fontFamily: T.body, fontSize: 13, color: 'rgba(242,237,228,.62)', lineHeight: 1.55, marginTop: 8 }}>
                {identity.signature.subline}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                {[identity.signature.moodTag, identity.signature.formTag, identity.signature.reputationTag].filter(Boolean).map((tag) => (
                  <span key={tag} style={{ fontFamily: T.mono, fontSize: 7, color: 'rgba(242,237,228,.72)', border: '1px solid rgba(242,237,228,.1)', padding: '4px 7px', letterSpacing: '.12em', textTransform: 'uppercase' }}>
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          ))}

          <div style={{ background: 'rgba(255,255,255,.025)', border: '1px solid rgba(255,255,255,.06)', padding: '14px 16px', clipPath: 'polygon(6px 0,100% 0,calc(100% - 6px) 100%,0 100%)' }}>
            <div style={{ fontFamily: T.mono, fontSize: 7, color: sc.light, letterSpacing: '.32em', textTransform: 'uppercase', marginBottom: 8 }}>Contraste</div>
            {[identityDuel.contrast.tempo, identityDuel.contrast.risk, identityDuel.contrast.persona, identityDuel.contrast.mood].map((line, idx) => (
              <div key={idx} style={{ fontFamily: T.body, fontSize: 13, color: 'rgba(242,237,228,.7)', lineHeight: 1.55, marginBottom: idx === 3 ? 0 : 8 }}>
                {line}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Encontra o confronto destaque da rodada ────────────────────────────
function findFeaturedMatch(rounds, currentRound, seedMap) {
  const round = rounds?.[currentRound];
  if (!round) return null;
  // Playable (não jogado, tem ambos jogadores)
  const playable = round.filter(m => !m.winner && m.playerA && m.playerB && !m.isBye);
  if (playable.length === 0) {
    // Fallback: qualquer com ambos jogadores
    const any = round.filter(m => m.playerA && m.playerB && !m.isBye);
    if (any.length === 0) return null;
    return any.reduce((best, m) => {
      const scoreM = (seedMap?.[m.playerA?.id] ?? 99) + (seedMap?.[m.playerB?.id] ?? 99);
      const scoreB = (seedMap?.[best.playerA?.id] ?? 99) + (seedMap?.[best.playerB?.id] ?? 99);
      return scoreM < scoreB ? m : best;
    });
  }
  return playable.reduce((best, m) => {
    const scoreM = (seedMap?.[m.playerA?.id] ?? 99) + (seedMap?.[m.playerB?.id] ?? 99);
    const scoreB = (seedMap?.[best.playerA?.id] ?? 99) + (seedMap?.[best.playerB?.id] ?? 99);
    return scoreM < scoreB ? m : best;
  });
}

// ── Card de partida individual ─────────────────────────────────────────
function MatchCard({ match, ri, mi, isCurrent, simulating, onSim, onWatch, seedMap, onResume }) {
  const { playerA, playerB, winner, result, isBye } = match;
  const aWon  = winner?.id === playerA?.id;
  const bWon  = winner?.id === playerB?.id;
  const played = !!winner;
  const canPlay = isCurrent && !winner && playerA && playerB && !isBye;
  const canResume = played && !!result?.setsDetail?.length && !!onResume;
  const hasDossier = !!result?.matchNarrativeDossier || (result?.matchStoryCapsules?.length ?? 0) > 0;

  const aScores = played ? formatSetScores(result, true)  : null;
  const bScores = played ? formatSetScores(result, false) : null;

  const rankA = playerA?.rankPosition ?? null;
  const rankB = playerB?.rankPosition ?? null;

  if (isBye && playerA && !playerB) {
    return (
      <div className="mc bye" style={{ height: MATCH_H }}>
        <div className="mc-row won">
          <span className="mc-seed">{seedMap?.[playerA.id] ? `[${seedMap[playerA.id]}]` : ''}</span>
          <PlayerFace player={playerA} size={28} borderColor={`${T.gold}55`} />
          <span className="mc-name" style={{ color: T.gold, fontSize: 16 }}>{playerA.name}</span>
          <MindsetBadge mindset={playerA.tournamentMindset} />
          <span style={{ fontFamily: T.mono, fontSize: 7, color: 'rgba(242,237,228,.18)', marginLeft: 4, flexShrink: 0, letterSpacing: '.24em' }}>BYE</span>
        </div>
        <div className="mc-div" />
        <div className="mc-row" style={{ opacity: .12 }}>
          <span className="mc-name" style={{ fontFamily: T.mono, fontSize: 11, color: T.faint }}>—</span>
        </div>
      </div>
    );
  }

  if (!playerA && !playerB) return null;

  const ScoreCell = ({ scores, won }) => {
    if (!scores) return null;
    return (
      <div className="mc-scores" style={{ paddingRight: 2 }}>
        {scores.map((s, si) => {
          const isTb = isTiebreakSetScore(s.mine, s.opp);
          return (
            <span key={si} className={`mc-set${won ? ' w' : ''}${isTb ? ' tb' : ''}`}>
              {s.mine}-{s.opp}
            </span>
          );
        })}
      </div>
    );
  };

  return (
    <div className={`mc ${canPlay ? 'playable' : played ? `done${canResume ? ' resumable' : ''}` : ''}`}
      style={{ height: MATCH_H }}
      onClick={canResume ? () => onResume(match) : undefined}
    >
      {/* Surface accent on winner side */}
      {played && <div style={{ position: 'absolute', top: 0, left: 0, width: 2, height: PLAYER_H, background: T.gold, opacity: aWon ? .7 : .1 }} />}
      {played && <div style={{ position: 'absolute', bottom: 0, left: 0, width: 2, height: PLAYER_H, background: T.gold, opacity: bWon ? .7 : .1 }} />}
      {hasDossier && (
        <div style={{
          position:'absolute', top:3, right:5, zIndex:2,
          fontFamily:T.mono, fontSize:6, letterSpacing:'.18em',
          color:T.gold, border:`1px solid ${T.gold}33`,
          background:'rgba(232,200,74,.08)', padding:'2px 5px',
          textTransform:'uppercase',
        }}>
          dossier
        </div>
      )}

      {/* Player A */}
      <div className={`mc-row ${aWon ? 'won' : bWon && played ? 'lost' : ''}`}>
        <span className="mc-seed">{playerA && seedMap?.[playerA.id] ? `[${seedMap[playerA.id]}]` : ''}</span>
        {playerA && <PlayerFace player={playerA} size={30} borderColor={aWon ? `${T.gold}66` : undefined} />}
        <span className="mc-name" style={{ color: aWon ? T.gold : T.white, fontSize: 16 }}>
          {playerA?.name ?? '—'}
        </span>
        {playerA && <MindsetBadge mindset={playerA.tournamentMindset} />}
        {!played && (
          <span className="mc-ovr" style={{ color: rankA ? T.gold : 'rgba(242,237,228,.22)', opacity:.75 }}>
            {rankA ? `#${rankA}` : '---'}
          </span>
        )}
        <ScoreCell scores={aScores} won={aWon} />
      </div>

      <div className="mc-div" />

      {/* Player B */}
      <div className={`mc-row ${bWon ? 'won' : aWon && played ? 'lost' : ''}`}>
        <span className="mc-seed">{playerB && seedMap?.[playerB.id] ? `[${seedMap[playerB.id]}]` : ''}</span>
        {playerB && <PlayerFace player={playerB} size={30} borderColor={bWon ? `${T.gold}66` : undefined} />}
        <span className="mc-name" style={{ color: bWon ? T.gold : playerB ? T.white : 'rgba(242,237,228,.18)', fontSize: 16 }}>
          {playerB?.name ?? '—'}
        </span>
        {playerB && <MindsetBadge mindset={playerB.tournamentMindset} />}
        {!played && (
          <span className="mc-ovr" style={{ color: rankB ? T.gold : 'rgba(242,237,228,.22)', opacity:.75 }}>
            {rankB ? `#${rankB}` : '---'}
          </span>
        )}
        <ScoreCell scores={bScores} won={bWon} />
      </div>

      {/* Hover actions */}
      {canPlay && (
        <div className="mc-hover">
          <button className="mc-act mc-act-sim" disabled={simulating}
            onClick={e => { e.stopPropagation(); onSim?.(ri, mi); }}>
            ▶ SIMULAR
          </button>
          {onWatch && (
            <button className="mc-act mc-act-watch" disabled={simulating}
              onClick={e => { e.stopPropagation(); onWatch(match, ri, mi); }}>
              👁 VER
            </button>
          )}
        </div>
      )}
      {/* Resume hint on played cards */}
      {canResume && (
        <div className="mc-resume-hint">
          <div className="mc-resume-badge">
            <span className="mc-resume-badge-icon">📰</span>
            <span className="mc-resume-badge-text">{hasDossier ? 'Ver Dossiê' : 'Ver Résumé'}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Canvas do bracket ──────────────────────────────────────────────────
function BracketCanvas({ rounds, currentRound, done, simulating, seedMap, onSim, onWatch, roundLabels, accent, onResume }) {
  if (!rounds?.length) return null;

  const nRounds = rounds.length;
  const totalH  = rounds[0].length * PLAYER_H * 2;
  const totalW  = nRounds * COL_STEP - COL_GAP;
  const ac      = accent ?? 'rgba(255,255,255,.15)';

  return (
    <div style={{ display: 'inline-block', minWidth: totalW, animation: 'tb-in .25s both' }}>

      {/* Round headers */}
      <div style={{ display: 'flex', height: LABEL_H, marginBottom: 14 }}>
        {rounds.map((_, ri) => {
          const isActive = ri === currentRound && !done;
          const isPast   = ri < currentRound || done;
          return (
            <div key={ri} style={{
              width: MATCH_W,
              marginRight: ri < nRounds - 1 ? COL_GAP : 0,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end',
              gap: 4, paddingBottom: 8,
              borderBottom: isActive ? `2px solid ${ac}` : isPast ? `1px solid rgba(255,255,255,.06)` : `1px solid rgba(255,255,255,.03)`,
            }}>
              {isActive && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 2 }}>
                  <div style={{ width: 5, height: 5, borderRadius: '50%', background: ac, boxShadow: `0 0 8px ${ac}`, animation: 'tb-pulse 1.5s ease-in-out infinite' }} />
                  <span style={{ fontFamily: T.mono, fontSize: 7, color: ac, letterSpacing: '.3em', textTransform: 'uppercase' }}>AO VIVO</span>
                </div>
              )}
              <span className={`round-hd ${isActive ? 'active' : ''}`} style={{
                color: isActive ? T.white : isPast ? 'rgba(242,237,228,.22)' : 'rgba(242,237,228,.12)',
                textShadow: isActive ? `0 0 20px ${ac}` : 'none',
                transition: 'color .3s',
              }}>
                {roundLabels?.[ri] ?? `R${ri + 1}`}
              </span>
              <span style={{ fontFamily: T.mono, fontSize: 7, color: 'rgba(242,237,228,.18)', letterSpacing: '.2em' }}>
                {rounds[ri].filter(m => m.playerA || m.playerB).length} partidas
              </span>
            </div>
          );
        })}
      </div>

      {/* Main bracket area */}
      <div style={{ position: 'relative', width: totalW, height: totalH }}>

        {/* Connection SVG lines */}
        <svg style={{ position: 'absolute', inset: 0, width: totalW, height: totalH, pointerEvents: 'none', overflow: 'visible' }}>
          {rounds.slice(0, -1).map((round, ri) => {
            const nNext = rounds[ri + 1].length;
            return Array.from({ length: nNext }, (_, pi) => {
              const spanCur  = Math.pow(2, ri + 1) * PLAYER_H;
              const spanNext = Math.pow(2, ri + 2) * PLAYER_H;
              const y0   = (pi * 2)     * spanCur  + spanCur  / 2;
              const y1   = (pi * 2 + 1) * spanCur  + spanCur  / 2;
              const yMid = pi           * spanNext + spanNext / 2;
              const xRight = ri * COL_STEP + MATCH_W;
              const xJoin  = ri * COL_STEP + MATCH_W + COL_GAP * 0.5;
              const xNext  = (ri + 1) * COL_STEP;
              const m0 = round[pi * 2];
              const m1 = round[pi * 2 + 1];
              const lit0 = !!m0?.winner;
              const lit1 = !!m1?.winner;
              const litM = lit0 && lit1;
              const lc = v => v ? ac : 'rgba(255,255,255,.05)';
              const sw = v => v ? 1.5 : 1;
              return (
                <g key={`c${ri}-${pi}`}>
                  <line x1={xRight} y1={y0}   x2={xJoin} y2={y0}   stroke={lc(lit0)} strokeWidth={sw(lit0)} />
                  <line x1={xRight} y1={y1}   x2={xJoin} y2={y1}   stroke={lc(lit1)} strokeWidth={sw(lit1)} />
                  <line x1={xJoin}  y1={y0}   x2={xJoin} y2={y1}   stroke={lc(litM)} strokeWidth={sw(litM)} />
                  <line x1={xJoin}  y1={yMid} x2={xNext} y2={yMid} stroke={lc(litM)} strokeWidth={sw(litM)} />
                  {litM && <circle cx={xJoin} cy={yMid} r={3} fill={ac} opacity={.6} />}
                </g>
              );
            });
          })}
        </svg>

        {/* Match cards */}
        {rounds.map((round, ri) =>
          round.map((match, mi) => {
            if (!match.playerA && !match.playerB) return null;
            const spanH   = Math.pow(2, ri + 1) * PLAYER_H;
            const centerY = mi * spanH + spanH / 2;
            const top     = centerY - MATCH_H / 2;
            const left    = ri * COL_STEP;
            const isCur   = ri === currentRound && !done;
            return (
              <div key={match.matchId ?? `r${ri}m${mi}`} style={{ position: 'absolute', top, left, width: MATCH_W }}>
                <MatchCard match={match} ri={ri} mi={mi} isCurrent={isCur}
                  simulating={simulating} onSim={onSim} onWatch={onWatch} seedMap={seedMap} onResume={onResume} />
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// ── Match Résumé Modal ─────────────────────────────────────────────────
const SECTION_STYLES = {
  tactical:  { border: 'rgba(74,144,217,.5)',  bg: 'rgba(74,144,217,.04)',  label: 'RESUMO TÁTICO',     color: 'rgba(74,144,217,.75)'  },
  turning:   { border: 'rgba(232,200,74,.55)', bg: 'rgba(232,200,74,.04)',  label: 'PONTO DE VIRADA',   color: 'rgba(232,200,74,.75)'  },
  pattern:   { border: 'rgba(200,79,235,.5)',  bg: 'rgba(200,79,235,.04)',  label: 'PADRÃO DOMINANTE',  color: 'rgba(200,79,235,.75)'  },
  plan:      { border: 'rgba(46,204,113,.45)', bg: 'rgba(46,204,113,.04)',  label: 'PLANO × RESULTADO', color: 'rgba(46,204,113,.7)'   },
  rivalry:   { border: 'rgba(212,86,30,.5)',   bg: 'rgba(212,86,30,.04)',   label: 'RIVALIDADE',        color: 'rgba(212,86,30,.75)'   },
};

const TAG_COLORS = {
  COMEBACK: '#E8C84A', EPIC: '#C84FEB', CLUTCH_SAVE: '#E8C84A',
  SURGICAL: '#2ECC71', STRAIGHT_SETS: '#4A90D9', BAGEL: '#F06428',
  NET_DOMINANCE: '#C84FEB', MARATHON: '#F06428', BLITZ: '#4A90D9',
  SERVE_DOMINANCE: '#4A90D9', ACE_MACHINE: '#4A90D9',
  RIVALRY_LEGENDARY: '#E8C84A', RIVALRY_GRUDGE: '#F06428', H2H_COMEBACK: '#E8C84A',
  GENERATIONAL: '#C84FEB', LEGACY_MATCH: '#E8C84A',
};

function NarrativeSection({ type, text }) {
  if (!text) return null;
  const s = SECTION_STYLES[type];
  return (
    <div className="mr-section" style={{ borderLeftColor: s.border, background: s.bg, marginBottom: 10 }}>
      <div style={{ fontFamily: T.mono, fontSize: 7.5, letterSpacing: '.22em', color: s.color, textTransform: 'uppercase', marginBottom: 7 }}>
        {s.label}
      </div>
      <p style={{ fontFamily: T.body, fontSize: 13.5, color: 'rgba(242,237,228,.72)', lineHeight: 1.7, margin: 0 }}>
        {text}
      </p>
    </div>
  );
}

function DefinitiveDossierPanel({ dossier, capsules = [], accent }) {
  const moments = dossier?.topMoments?.length ? dossier.topMoments : capsules.slice(-5).reverse();
  if (!dossier && !moments.length) return null;
  const heatPct = Math.round((dossier?.heatScore ?? 0) * 100);
  const tone = dossier?.heatScore >= 0.72 ? T.gold : accent || T.clayLight;
  return (
    <div style={{
      border:'1px solid rgba(242,237,228,.08)',
      background:'linear-gradient(135deg, rgba(232,200,74,.075), rgba(255,255,255,.018))',
      padding:'14px 16px',
      clipPath:'polygon(8px 0,100% 0,calc(100% - 8px) 100%,0 100%)',
    }}>
      <div style={{ fontFamily:T.mono, fontSize:7, color:tone, letterSpacing:'.34em', textTransform:'uppercase', marginBottom:8 }}>
        Dossie DefinitiveME
      </div>
      <div style={{ fontFamily:T.disp, fontSize:26, color:T.white, lineHeight:1.05, textTransform:'uppercase', letterSpacing:'.04em' }}>
        {dossier?.headline ?? moments[0]?.title ?? 'Historia da partida'}
      </div>
      <div style={{ fontFamily:T.body, fontSize:13.5, color:'rgba(242,237,228,.68)', lineHeight:1.55, marginTop:8 }}>
        {dossier?.thesis ?? moments[0]?.oneLine}
      </div>
      <div style={{ display:'flex', gap:7, flexWrap:'wrap', marginTop:12 }}>
        {[
          dossier?.heatLabel ? `${dossier.heatLabel} ${heatPct}%` : null,
          dossier?.avgQuality != null ? `qualidade ${dossier.avgQuality}` : null,
          dossier?.avgRally != null ? `rally medio ${dossier.avgRally}` : null,
          dossier?.dominantIdentity?.label ? `tom ${dossier.dominantIdentity.label}` : null,
        ].filter(Boolean).map(tag => (
          <span key={tag} style={{
            fontFamily:T.mono, fontSize:7, color:`${tone}CC`, border:`1px solid ${tone}36`,
            background:`${tone}0C`, padding:'4px 7px', letterSpacing:'.14em',
            textTransform:'uppercase',
          }}>
            {tag}
          </span>
        ))}
      </div>
      {moments.length > 0 && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))', gap:8, marginTop:14 }}>
          {moments.slice(0, 4).map((m, idx) => (
            <div key={m.id ?? idx} style={{
              borderLeft:`2px solid ${m.color ?? tone}`,
              background:'rgba(255,255,255,.024)',
              padding:'10px 11px',
            }}>
              <div style={{ fontFamily:T.mono, fontSize:6.5, color:m.color ?? tone, letterSpacing:'.18em', textTransform:'uppercase', marginBottom:5 }}>
                momento {idx + 1}
              </div>
              <div style={{ fontFamily:T.disp, fontSize:16, color:T.white, lineHeight:1.05 }}>
                {m.title}
              </div>
              <div style={{ fontFamily:T.body, fontSize:11.5, color:'rgba(242,237,228,.54)', lineHeight:1.4, marginTop:5 }}>
                {m.oneLine ?? m.paragraphs?.[0]}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MatchResumeModal({ match, surface, roundLabel, onClose, historicalTournamentResults = {}, currentYear = null, tournament = null }) {
  const { playerA, playerB, winner, result } = match;
  const loser = playerA?.id === winner?.id ? playerB : playerA;
  const winnerIsA = winner?.id === playerA?.id;
  const h2h = collectH2H(playerA, playerB, historicalTournamentResults);
  const boxRows = getMatchStatRows(result);
  const winnerPlayer = winner;
  const loserPlayer = loser;
  const winnerTitles = sumCareerTitles(winnerPlayer);
  const loserTitles = sumCareerTitles(loserPlayer);
  const surfKey = surface?.toUpperCase() ?? 'HARD';
  const winnerSurface = getSurfaceSnapshot(winnerPlayer, surfKey);
  const loserSurface = getSurfaceSnapshot(loserPlayer, surfKey);
  const winnerForm = getRecentRecord(winnerPlayer, 10);
  const loserForm = getRecentRecord(loserPlayer, 10);
  const boxInsight = getBoxscoreInsight(result, winnerPlayer, loserPlayer);
  const winnerCareer = getCareerStatPanels(winnerPlayer, historicalTournamentResults, surfKey);
  const loserCareer = getCareerStatPanels(loserPlayer, historicalTournamentResults, surfKey);
  const winnerStyle = getPlayerStyleSnapshot(winnerPlayer);
  const loserStyle = getPlayerStyleSnapshot(loserPlayer);
  const winnerTraits = getPlayerTraitBadges(winnerPlayer, 4);
  const loserTraits = getPlayerTraitBadges(loserPlayer, 4);
  const winnerIdentity = useMemo(() => buildPlayerIdentity(winnerPlayer, { surfaceKey: surfKey }), [winnerPlayer, surfKey]);
  const loserIdentity = useMemo(() => buildPlayerIdentity(loserPlayer, { surfaceKey: surfKey }), [loserPlayer, surfKey]);
  const definitiveDossier = result?.matchNarrativeDossier ?? null;
  const definitiveCapsules = result?.matchStoryCapsules ?? [];

  const narration = useMemo(() => {
    if (!result?.setsDetail?.length) return null;
    try {
      // Build narResult compatible with narrateMatch
      const narResult = {
        winner,
        setsDetail: result.setsDetail ?? [],
        stats: { a: result.stats?.a ?? {}, b: result.stats?.b ?? {} },
        gs: { players: [playerA, playerB] },
        log: result.log ?? [],
      };
      // Enrich winner/loser with ctx from headless result if available
      const winnerEnriched = {
        ...winner,
        ctx:        result.winner?.ctx        ?? winner?.ctx,
        _matchPlan: result.winner?._matchPlan ?? winner?._matchPlan,
      };
      const loserResult = winnerIsA ? result.loser : result.winner;
      const loserEnriched = {
        ...loser,
        ctx:        loserResult?.ctx        ?? loser?.ctx,
        _matchPlan: loserResult?._matchPlan ?? loser?._matchPlan,
      };
      return narrateMatch(winnerEnriched, loserEnriched, narResult, surface?.toUpperCase() ?? 'HARD');
    } catch (e) {
      console.warn('[MatchResumeModal] narrateMatch failed:', e);
      return null;
    }
  }, [match, surface]);

  const sc = SURFACE_CLR[surfKey] ?? SURFACE_CLR.HARD;
  const ovrW = winner ? overallRating(winner.attrs) : null;
  const ovrL = loser  ? overallRating(loser.attrs)  : null;

  const scoreStr = result?.setsDetail
    ?.map(([a, b]) => winnerIsA ? `${a}-${b}` : `${b}-${a}`)
    .join('  ') ?? '';

  const notableTags = (narration?.tags ?? []).filter(t =>
    ['COMEBACK','EPIC','CLUTCH_SAVE','SURGICAL','BAGEL','NET_DOMINANCE',
     'MARATHON','BLITZ','RIVALRY_LEGENDARY','H2H_COMEBACK','GENERATIONAL',
     'RETIREMENT','IN_MATCH_INJURY','MTO_COMEBACK'].includes(t)
  ).slice(0, 8);

  return (
    <div className="mr-overlay" onClick={onClose}>
      <div className="mr-panel" onClick={e => e.stopPropagation()} style={{ maxWidth: 1420 }}>
        <button className="mr-close" onClick={onClose}>X FECHAR</button>

        <div style={{ height: 3, background: `linear-gradient(90deg, ${sc.main}, ${sc.light}, transparent)` }} />

        <div style={{ padding: '22px 24px 10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
            <span style={{ fontFamily: T.mono, fontSize: 7.5, letterSpacing: '.24em', color: sc.light, textTransform: 'uppercase' }}>
              {sc.label}
            </span>
            {roundLabel && (
              <>
                <span style={{ color: 'rgba(242,237,228,.15)' }}>/</span>
                <span style={{ fontFamily: T.mono, fontSize: 7.5, letterSpacing: '.22em', color: 'rgba(242,237,228,.35)', textTransform: 'uppercase' }}>
                  {roundLabel}
                </span>
              </>
            )}
            {tournament?.name && (
              <>
                <span style={{ color: 'rgba(242,237,228,.15)' }}>/</span>
                <span style={{ fontFamily: T.mono, fontSize: 7.5, letterSpacing: '.22em', color: 'rgba(242,237,228,.35)', textTransform: 'uppercase' }}>
                  {tournament.name}
                </span>
              </>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 16, alignItems: 'center', marginBottom: 18 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <PlayerFace player={winnerPlayer} size={48} borderColor={T.gold} />
                <div>
                  <div style={{ fontFamily: T.disp, fontSize: 34, color: T.gold, letterSpacing: '.04em', lineHeight: .9, textTransform: 'uppercase' }}>
                    {winner?.name ?? '--'}
                  </div>
                  <div style={{ fontFamily: T.mono, fontSize: 8, color: 'rgba(232,200,74,.45)', letterSpacing: '.12em', marginTop: 4 }}>
                    #{winnerPlayer?.rankPosition ?? '--'} / NIVEL {ovrW ? ovrTier(ovrW).grade : '--'} / {getPlayerIdentityLine(winnerPlayer)}
                  </div>
                </div>
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: T.mono, fontSize: 8, color: 'rgba(242,237,228,.26)', letterSpacing: '.3em', textTransform: 'uppercase', marginBottom: 8 }}>placar</div>
              <div style={{ fontFamily: T.disp, fontSize: 42, color: T.gold, lineHeight: 1, letterSpacing: '.08em' }}>{scoreStr}</div>
              {result?.retirement && (
                <div style={{ marginTop: 6, fontFamily: T.mono, fontSize: 8, letterSpacing: '.18em', color: '#FF8080' }}>
                  abandono
                </div>
              )}
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'flex-end' }}>
                <div>
                  <div style={{ fontFamily: T.disp, fontSize: 34, color: 'rgba(242,237,228,.48)', letterSpacing: '.04em', lineHeight: .9, textTransform: 'uppercase' }}>
                    {loser?.name ?? '--'}
                  </div>
                  <div style={{ fontFamily: T.mono, fontSize: 8, color: 'rgba(242,237,228,.24)', letterSpacing: '.12em', marginTop: 4 }}>
                    #{loserPlayer?.rankPosition ?? '--'} / NIVEL {ovrL ? ovrTier(ovrL).grade : '--'} / {getPlayerIdentityLine(loserPlayer)}
                  </div>
                </div>
                <PlayerFace player={loserPlayer} size={48} borderColor="rgba(242,237,228,.18)" />
              </div>
            </div>
          </div>

          {narration?.headline && (
            <div style={{
              fontFamily: T.body, fontSize: 16, fontWeight: 600,
              color: T.white, lineHeight: 1.5,
              paddingBottom: 18, borderBottom: `1px solid rgba(242,237,228,.07)`,
            }}>
              {narration.headline}
            </div>
          )}
          {!narration && (
            <div style={{ fontFamily: T.mono, fontSize: 9, color: 'rgba(242,237,228,.2)', letterSpacing: '.15em' }}>
              DADOS INSUFICIENTES PARA NARRAÇÃO
            </div>
          )}
        </div>

        {(definitiveDossier || definitiveCapsules.length > 0) && (
          <div style={{ padding: '0 24px 16px' }}>
            <DefinitiveDossierPanel
              dossier={definitiveDossier}
              capsules={definitiveCapsules}
              accent={sc.light}
            />
          </div>
        )}

        <div style={{ padding: '0 24px 16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr .92fr 1fr', gap: 14 }}>
            {[
              { player: winnerPlayer, career: winnerCareer, form: winnerForm, surfaceSnap: winnerSurface, style: winnerStyle, traits: winnerTraits, color: T.gold, align: 'left' },
              { player: loserPlayer, career: loserCareer, form: loserForm, surfaceSnap: loserSurface, style: loserStyle, traits: loserTraits, color: '#8CF1B2', align: 'right' },
            ].map((side, idx) => (
              <div key={side.player?.id ?? idx} style={{ display:'flex', flexDirection:'column', gap:10, gridColumn: idx === 0 ? '1 / 2' : '3 / 4' }}>
                <div style={{ border:`1px solid ${side.color}24`, background:'rgba(255,255,255,.018)', padding:'12px 14px' }}>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8 }}>
                    {[
                      ['rank', `#${side.player?.rankPosition ?? '--'}`],
                      ['pico', `#${side.career.bestRank ?? '--'}`],
                      ['idade', side.player?.age ? `${side.player.age}a` : '--'],
                      ['titulos', sumCareerTitles(side.player)],
                    ].map(([label, value]) => (
                      <div key={label}>
                        <div style={{ fontFamily:T.mono, fontSize:6.5, color:'rgba(242,237,228,.28)', letterSpacing:'.22em', textTransform:'uppercase', marginBottom:4 }}>{label}</div>
                        <div style={{ fontFamily:T.disp, fontSize:24, color:side.color, lineHeight:1 }}>{value}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ border:'1px solid rgba(242,237,228,.06)', background:'rgba(255,255,255,.018)', padding:'10px 14px' }}>
                  <div style={{ fontFamily:T.mono, fontSize:6.5, color:'rgba(242,237,228,.28)', letterSpacing:'.22em', textTransform:'uppercase', marginBottom:7 }}>carreira e piso</div>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>
                    {[
                      ['W-L', side.career.record.total ? `${side.career.record.wins}-${side.career.record.losses}` : '--'],
                      ['win %', side.career.record.winPct != null ? `${side.career.record.winPct}%` : '--'],
                      [`${surfKey} %`, side.surfaceSnap.winPct != null ? `${side.surfaceSnap.winPct}%` : '--'],
                      ['QF', side.career.deep.qf],
                      ['SF', side.career.deep.sf],
                      ['F', side.career.deep.finals],
                    ].map(([label, value]) => (
                      <div key={label}>
                        <div style={{ fontFamily:T.mono, fontSize:6, color:'rgba(242,237,228,.24)', letterSpacing:'.2em', textTransform:'uppercase', marginBottom:4 }}>{label}</div>
                        <div style={{ fontFamily:T.disp, fontSize:20, color:T.white, lineHeight:1 }}>{value}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ border:'1px solid rgba(242,237,228,.06)', background:'rgba(255,255,255,.018)', padding:'10px 14px' }}>
                  <div style={{ fontFamily:T.mono, fontSize:6.5, color:'rgba(242,237,228,.28)', letterSpacing:'.22em', textTransform:'uppercase', marginBottom:7 }}>identidade</div>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                    {[side.style.archetype?.label ?? side.style.archetype?.abbr, side.style.buildStyle, side.style.intent, side.style.net].filter(Boolean).map(tag => (
                      <span key={tag} style={{ fontFamily:T.mono, fontSize:7, color:`${side.color}CC`, border:`1px solid ${side.color}2E`, padding:'4px 7px', textTransform:'uppercase', letterSpacing:'.12em' }}>{String(tag).replaceAll('_', ' ')}</span>
                    ))}
                    {(side.traits.length ? side.traits : ['sem traits expostos']).map(trait => (
                      <span key={trait} style={{ fontFamily:T.cond, fontSize:12, color:T.white, background:'rgba(255,255,255,.03)', padding:'4px 8px' }}>{trait}</span>
                    ))}
                  </div>
                </div>
              </div>
            ))}

            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              <div style={{ border:'1px solid rgba(242,237,228,.06)', background:'rgba(255,255,255,.018)', padding:'12px 14px' }}>
                <div style={{ fontFamily:T.mono, fontSize:6.5, color:sc.light, letterSpacing:'.24em', textTransform:'uppercase', marginBottom:8 }}>H2H expandido</div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr auto 1fr', gap:8, alignItems:'center' }}>
                  <div style={{ fontFamily:T.disp, fontSize:24, color:T.gold, lineHeight:1 }}>{h2h ? h2h.aWins : 0}</div>
                  <div style={{ fontFamily:T.mono, fontSize:6.5, color:'rgba(242,237,228,.3)', letterSpacing:'.22em', textTransform:'uppercase', textAlign:'center' }}>carreira</div>
                  <div style={{ fontFamily:T.disp, fontSize:24, color:'#8CF1B2', lineHeight:1, textAlign:'right' }}>{h2h ? h2h.bWins : 0}</div>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr auto 1fr', gap:8, alignItems:'center', marginTop:8 }}>
                  <div style={{ fontFamily:T.disp, fontSize:20, color:T.gold, lineHeight:1 }}>{h2h ? h2h.seasonAWins : '--'}</div>
                  <div style={{ fontFamily:T.mono, fontSize:6.5, color:'rgba(242,237,228,.3)', letterSpacing:'.22em', textTransform:'uppercase', textAlign:'center' }}>{currentYear ?? 'ano'}</div>
                  <div style={{ fontFamily:T.disp, fontSize:20, color:'#8CF1B2', lineHeight:1, textAlign:'right' }}>{h2h ? h2h.seasonBWins : '--'}</div>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr auto 1fr', gap:8, alignItems:'center', marginTop:8 }}>
                  <div style={{ fontFamily:T.disp, fontSize:20, color:T.gold, lineHeight:1 }}>{h2h?.bySurface?.[surfKey]?.aWins ?? '--'}</div>
                  <div style={{ fontFamily:T.mono, fontSize:6.5, color:'rgba(242,237,228,.3)', letterSpacing:'.22em', textTransform:'uppercase', textAlign:'center' }}>{surfKey}</div>
                  <div style={{ fontFamily:T.disp, fontSize:20, color:'#8CF1B2', lineHeight:1, textAlign:'right' }}>{h2h?.bySurface?.[surfKey]?.bWins ?? '--'}</div>
                </div>
                <div style={{ marginTop:10, fontFamily:T.body, fontSize:13, color:'rgba(242,237,228,.64)', lineHeight:1.55 }}>
                  {h2h?.lastMeeting
                    ? `Ultimo encontro: ${h2h.lastMeeting.tournament ?? 'Evento'}${h2h.lastMeeting.score ? `, ${h2h.lastMeeting.score}` : ''}. Finais entre eles: ${h2h.finalsCount ?? 0}.`
                    : 'Primeiro encontro entre os dois no save atual.'}
                </div>
              </div>

              <div style={{ border:'1px solid rgba(242,237,228,.06)', background:'rgba(255,255,255,.018)', padding:'12px 14px' }}>
                <div style={{ fontFamily:T.mono, fontSize:6.5, color:sc.light, letterSpacing:'.24em', textTransform:'uppercase', marginBottom:8 }}>medidas do duelo</div>
                <div style={{ display:'grid', gap:6 }}>
                  {[
                    ['gap ranking', formatSignedDiff((winnerPlayer?.rankPosition ?? 999) - (loserPlayer?.rankPosition ?? 999), true)],
                    ['gap pico', formatSignedDiff((winnerCareer.bestRank ?? 999) - (loserCareer.bestRank ?? 999), true)],
                    ['gap idade', formatSignedDiff((winnerPlayer?.age ?? 0) - (loserPlayer?.age ?? 0), false)],
                    ['gap titulos', formatSignedDiff(sumCareerTitles(winnerPlayer) - sumCareerTitles(loserPlayer), false)],
                    ['gap win %', formatSignedDiff((winnerCareer.record.winPct ?? 0) - (loserCareer.record.winPct ?? 0), false)],
                  ].map(([label, value]) => (
                    <div key={label} style={{ display:'grid', gridTemplateColumns:'1fr auto', gap:8, alignItems:'center' }}>
                      <div style={{ fontFamily:T.mono, fontSize:6.2, color:'rgba(242,237,228,.26)', letterSpacing:'.22em', textTransform:'uppercase' }}>{label}</div>
                      <div style={{ fontFamily:T.disp, fontSize:18, color:T.white, lineHeight:1 }}>{value}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1.05fr .95fr', gap: 18, padding: '0 24px 18px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ border: '1px solid rgba(242,237,228,.08)', background: 'rgba(255,255,255,.018)', clipPath: 'polygon(8px 0,100% 0,calc(100% - 8px) 100%,0 100%)' }}>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(242,237,228,.06)', fontFamily: T.mono, fontSize: 7, color: sc.light, letterSpacing: '.34em', textTransform: 'uppercase' }}>
                Match boxscore
              </div>
              <div>
                {boxRows.map((row, idx) => (
                  <div key={row.label} style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 14, alignItems: 'center', padding: '11px 16px', borderBottom: idx === boxRows.length - 1 ? 'none' : '1px solid rgba(242,237,228,.05)' }}>
                    <div style={{ fontFamily: T.disp, fontSize: 28, color: T.gold, lineHeight: 1 }}>{row.a}</div>
                    <div style={{ fontFamily: T.mono, fontSize: 7, color: T.gold, letterSpacing: '.28em', textTransform: 'uppercase', minWidth: 92, textAlign: 'center' }}>{row.label}</div>
                    <div style={{ fontFamily: T.disp, fontSize: 28, color: '#8CF1B2', lineHeight: 1, textAlign: 'right' }}>{row.b}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ border: '1px solid rgba(242,237,228,.08)', background: 'rgba(255,255,255,.018)', padding: '14px 16px', clipPath: 'polygon(8px 0,100% 0,calc(100% - 8px) 100%,0 100%)' }}>
              <div style={{ fontFamily: T.mono, fontSize: 7, color: sc.light, letterSpacing: '.34em', textTransform: 'uppercase', marginBottom: 8 }}>Leitura numerica</div>
              <div style={{ fontFamily: T.body, fontSize: 14, color: 'rgba(242,237,228,.78)', lineHeight: 1.65 }}>{boxInsight}</div>
            </div>

            {narration && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <NarrativeSection type="tactical" text={narration.tactical_summary} />
                <NarrativeSection type="turning"  text={narration.turning_point} />
                <NarrativeSection type="pattern"  text={narration.pattern_highlight} />
                {narration.plan_vs_result   && <NarrativeSection type="plan"    text={narration.plan_vs_result} />}
                {narration.rivalry_context  && <NarrativeSection type="rivalry" text={narration.rivalry_context} />}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ border: '1px solid rgba(242,237,228,.08)', background: 'rgba(255,255,255,.018)', padding: '14px 16px', clipPath: 'polygon(8px 0,100% 0,calc(100% - 8px) 100%,0 100%)' }}>
              <div style={{ fontFamily: T.mono, fontSize: 7, color: sc.light, letterSpacing: '.34em', textTransform: 'uppercase', marginBottom: 10 }}>Duelo e contexto</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 12, alignItems: 'center' }}>
                <div>
                  <div style={{ fontFamily: T.disp, fontSize: 24, color: T.gold, lineHeight: 1 }}>{winnerTitles}</div>
                  <div style={{ fontFamily: T.mono, fontSize: 7, color: 'rgba(242,237,228,.28)', letterSpacing: '.24em' }}>titulos</div>
                </div>
                <div style={{ fontFamily: T.mono, fontSize: 7, color: T.gold, letterSpacing: '.24em', textTransform: 'uppercase' }}>carreira</div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: T.disp, fontSize: 24, color: '#8CF1B2', lineHeight: 1 }}>{loserTitles}</div>
                  <div style={{ fontFamily: T.mono, fontSize: 7, color: 'rgba(242,237,228,.28)', letterSpacing: '.24em' }}>titulos</div>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 12, alignItems: 'center', marginTop: 12 }}>
                <div>
                  <div style={{ fontFamily: T.disp, fontSize: 24, color: T.gold, lineHeight: 1 }}>{winnerForm.label}</div>
                  <div style={{ fontFamily: T.mono, fontSize: 7, color: 'rgba(242,237,228,.28)', letterSpacing: '.24em' }}>ultimas 10</div>
                </div>
                <div style={{ fontFamily: T.mono, fontSize: 7, color: T.gold, letterSpacing: '.24em', textTransform: 'uppercase' }}>forma</div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: T.disp, fontSize: 24, color: '#8CF1B2', lineHeight: 1 }}>{loserForm.label}</div>
                  <div style={{ fontFamily: T.mono, fontSize: 7, color: 'rgba(242,237,228,.28)', letterSpacing: '.24em' }}>ultimas 10</div>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 12, alignItems: 'center', marginTop: 12 }}>
                <div>
                  <div style={{ fontFamily: T.disp, fontSize: 24, color: T.gold, lineHeight: 1 }}>{winnerSurface.winPct != null ? `${winnerSurface.winPct}%` : '--'}</div>
                  <div style={{ fontFamily: T.mono, fontSize: 7, color: 'rgba(242,237,228,.28)', letterSpacing: '.24em' }}>{surfKey}</div>
                </div>
                <div style={{ fontFamily: T.mono, fontSize: 7, color: T.gold, letterSpacing: '.24em', textTransform: 'uppercase' }}>surface</div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: T.disp, fontSize: 24, color: '#8CF1B2', lineHeight: 1 }}>{loserSurface.winPct != null ? `${loserSurface.winPct}%` : '--'}</div>
                  <div style={{ fontFamily: T.mono, fontSize: 7, color: 'rgba(242,237,228,.28)', letterSpacing: '.24em' }}>{surfKey}</div>
                </div>
              </div>
            </div>

            <div style={{ border: '1px solid rgba(242,237,228,.08)', background: 'rgba(255,255,255,.018)', padding: '14px 16px', clipPath: 'polygon(8px 0,100% 0,calc(100% - 8px) 100%,0 100%)' }}>
              <div style={{ fontFamily: T.mono, fontSize: 7, color: sc.light, letterSpacing: '.34em', textTransform: 'uppercase', marginBottom: 10 }}>H2H</div>
              <div style={{ fontFamily: T.disp, fontSize: 34, color: T.white, lineHeight: 1 }}>
                {h2h ? `${h2h.aWins}-${h2h.bWins}` : '1o duelo'}
              </div>
              <div style={{ fontFamily: T.body, fontSize: 13.5, color: 'rgba(242,237,228,.64)', lineHeight: 1.55, marginTop: 8 }}>
                {h2h
                  ? `Na temporada ${currentYear ?? 'atual'}: ${h2h.seasonAWins}-${h2h.seasonBWins}. Ultimo encontro em ${h2h.lastMeeting?.year ?? '--'}${h2h.lastMeeting?.tournament ? `, ${h2h.lastMeeting.tournament}` : ''}.`
                  : 'Ainda nao havia confronto registrado entre os dois no historico salvo do circuito.'}
              </div>
            </div>

            {notableTags.length > 0 && (
              <div style={{ border: '1px solid rgba(242,237,228,.08)', background: 'rgba(255,255,255,.018)', padding: '14px 16px', clipPath: 'polygon(8px 0,100% 0,calc(100% - 8px) 100%,0 100%)' }}>
                <div style={{ fontFamily: T.mono, fontSize: 7, color: sc.light, letterSpacing: '.34em', textTransform: 'uppercase', marginBottom: 10 }}>Tags da partida</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {notableTags.map(tag => (
                    <span key={tag} className="mr-tag" style={{
                      color: TAG_COLORS[tag] ? `${TAG_COLORS[tag]}cc` : 'rgba(242,237,228,.28)',
                      borderColor: TAG_COLORS[tag] ? `${TAG_COLORS[tag]}44` : 'rgba(242,237,228,.1)',
                    }}>
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div style={{ padding: '0 24px 22px' }}>
          <div style={{ border: '1px solid rgba(242,237,228,.08)', background: 'rgba(255,255,255,.018)', clipPath: 'polygon(8px 0,100% 0,calc(100% - 8px) 100%,0 100%)' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(242,237,228,.06)', fontFamily: T.mono, fontSize: 7, color: sc.light, letterSpacing: '.34em', textTransform: 'uppercase' }}>
              Dossie completo do confronto
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr .9fr 1fr', gap: 14, padding: '16px' }}>
              {[
                { player: winnerPlayer, career: winnerCareer, style: winnerStyle, traits: winnerTraits, color: T.gold, align: 'left', side: 'A' },
                { player: loserPlayer, career: loserCareer, style: loserStyle, traits: loserTraits, color: '#8CF1B2', align: 'right', side: 'B' },
              ].map((side, idx) => (
                <div key={side.side} style={{ display: 'flex', flexDirection: 'column', gap: 10, gridColumn: idx === 0 ? '1 / 2' : '3 / 4' }}>
                  <div style={{ padding: '14px 14px 12px', background: 'rgba(255,255,255,.02)', border: `1px solid ${side.color}22` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: side.align === 'right' ? 'flex-end' : 'flex-start' }}>
                      {side.align === 'left' && <PlayerFace player={side.player} size={38} borderColor={side.color} />}
                      <div style={{ textAlign: side.align }}>
                        <div style={{ fontFamily: T.disp, fontSize: 24, color: side.color, lineHeight: 1, textTransform: 'uppercase' }}>{side.player?.name ?? '--'}</div>
                        <div style={{ fontFamily: T.mono, fontSize: 7, color: 'rgba(242,237,228,.34)', letterSpacing: '.18em', marginTop: 4 }}>
                          {side.player?.nationality ?? '--'} / #{side.player?.rankPosition ?? '--'} / pico #{side.career.bestRank ?? '--'}
                        </div>
                      </div>
                      {side.align === 'right' && <PlayerFace player={side.player} size={38} borderColor={side.color} />}
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    {[
                      ['IDADE', side.player?.age ? `${side.player.age}a` : '--'],
                      ['TITULOS', sumCareerTitles(side.player)],
                      ['QF', side.career.deep.qf],
                      ['SF', side.career.deep.sf],
                      ['FINAIS', side.career.deep.finals],
                      [`${surfKey} TIT.`, side.career.surfaceSnap.titlesWon ?? 0],
                      ['W-L', side.career.record.total ? `${side.career.record.wins}-${side.career.record.losses}` : '--'],
                      ['WIN %', side.career.record.winPct != null ? `${side.career.record.winPct}%` : '--'],
                    ].map(([label, value]) => (
                      <div key={label} style={{ padding: '10px 11px', background: 'rgba(255,255,255,.018)', border: '1px solid rgba(242,237,228,.06)' }}>
                        <div style={{ fontFamily: T.mono, fontSize: 6.5, color: 'rgba(242,237,228,.28)', letterSpacing: '.24em', textTransform: 'uppercase', marginBottom: 4 }}>{label}</div>
                        <div style={{ fontFamily: T.disp, fontSize: 22, color: side.color, lineHeight: 1 }}>{value}</div>
                      </div>
                    ))}
                  </div>

                  <div style={{ padding: '12px 13px', background: 'rgba(255,255,255,.018)', border: '1px solid rgba(242,237,228,.06)' }}>
                    <div style={{ fontFamily: T.mono, fontSize: 6.5, color: 'rgba(242,237,228,.28)', letterSpacing: '.24em', textTransform: 'uppercase', marginBottom: 7 }}>Titulos por tier</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6 }}>
                      {[
                        ['GS', side.player?.careerTitles?.gs ?? 0],
                        ['CS', side.player?.careerTitles?.slamClash ?? 0],
                        ['M1000', side.player?.careerTitles?.masters ?? 0],
                        ['500', side.player?.careerTitles?.atp500 ?? 0],
                      ].map(([label, value]) => (
                        <div key={label} style={{ background: 'rgba(255,255,255,.02)', border: `1px solid ${side.color}1C`, padding: '8px 6px', textAlign: 'center' }}>
                          <div style={{ fontFamily: T.disp, fontSize: 18, color: side.color, lineHeight: 1 }}>{value}</div>
                          <div style={{ fontFamily: T.mono, fontSize: 6, color: 'rgba(242,237,228,.28)', letterSpacing: '.2em', marginTop: 2 }}>{label}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div style={{ padding: '12px 13px', background: 'rgba(255,255,255,.018)', border: '1px solid rgba(242,237,228,.06)' }}>
                    <div style={{ fontFamily: T.mono, fontSize: 6.5, color: 'rgba(242,237,228,.28)', letterSpacing: '.24em', textTransform: 'uppercase', marginBottom: 7 }}>Identidade e traits</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                      {[side.style.archetype?.label ?? side.style.archetype?.abbr ?? '--', side.style.buildStyle, side.style.intent, side.style.net].filter(Boolean).map(tag => (
                        <span key={tag} style={{ fontFamily: T.mono, fontSize: 7, color: `${side.color}CC`, border: `1px solid ${side.color}2E`, padding: '4px 7px', textTransform: 'uppercase', letterSpacing: '.12em' }}>{String(tag).replaceAll('_', ' ')}</span>
                      ))}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {(side.traits.length ? side.traits : ['sem traits expostos']).map(trait => (
                        <span key={trait} style={{ fontFamily: T.cond, fontSize: 12, color: T.white, background: 'rgba(255,255,255,.03)', padding: '4px 8px' }}>{trait}</span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ padding: '14px', background: 'rgba(255,255,255,.018)', border: '1px solid rgba(242,237,228,.06)' }}>
                  <div style={{ fontFamily: T.mono, fontSize: 7, color: sc.light, letterSpacing: '.28em', textTransform: 'uppercase', marginBottom: 8 }}>Comparativo bruto</div>
                  <div style={{ display: 'grid', gap: 8 }}>
                    {[
                      ['gap ranking', formatSignedDiff((winnerPlayer?.rankPosition ?? 999) - (loserPlayer?.rankPosition ?? 999), true)],
                      ['gap melhor ranking', formatSignedDiff((winnerCareer.bestRank ?? 999) - (loserCareer.bestRank ?? 999), true)],
                      ['gap idade', formatSignedDiff((winnerPlayer?.age ?? 0) - (loserPlayer?.age ?? 0), false)],
                      ['gap titulos', formatSignedDiff(sumCareerTitles(winnerPlayer) - sumCareerTitles(loserPlayer), false)],
                      ['gap win % carreira', formatSignedDiff((winnerCareer.record.winPct ?? 0) - (loserCareer.record.winPct ?? 0), false)],
                      [`gap ${surfKey}`, formatSignedDiff((winnerCareer.surfaceSnap.winPct ?? 0) - (loserCareer.surfaceSnap.winPct ?? 0), false)],
                    ].map(([label, value]) => (
                      <div key={label} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8, alignItems: 'center', borderBottom: '1px solid rgba(242,237,228,.04)', paddingBottom: 6 }}>
                        <div style={{ fontFamily: T.mono, fontSize: 6.5, color: 'rgba(242,237,228,.3)', letterSpacing: '.22em', textTransform: 'uppercase' }}>{label}</div>
                        <div style={{ fontFamily: T.disp, fontSize: 20, color: T.white, lineHeight: 1 }}>{value}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ padding: '14px', background: 'rgba(255,255,255,.018)', border: '1px solid rgba(242,237,228,.06)' }}>
                  <div style={{ fontFamily: T.mono, fontSize: 7, color: sc.light, letterSpacing: '.28em', textTransform: 'uppercase', marginBottom: 8 }}>H2H expandido</div>
                  <div style={{ display: 'grid', gap: 8 }}>
                    {[
                      ['carreira', h2h ? `${h2h.aWins}-${h2h.bWins}` : '1o duelo'],
                      ['temporada atual', h2h ? `${h2h.seasonAWins}-${h2h.seasonBWins}` : '--'],
                      [`na ${surfKey}`, h2h?.bySurface?.[surfKey] ? `${h2h.bySurface[surfKey].aWins}-${h2h.bySurface[surfKey].bWins}` : '--'],
                      ['finais entre eles', h2h?.finalsCount ?? 0],
                      ['ultimo encontro', h2h?.lastMeeting?.year ? `${h2h.lastMeeting.year}` : 'sem historico'],
                    ].map(([label, value]) => (
                      <div key={label} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8, alignItems: 'center' }}>
                        <div style={{ fontFamily: T.mono, fontSize: 6.5, color: 'rgba(242,237,228,.3)', letterSpacing: '.22em', textTransform: 'uppercase' }}>{label}</div>
                        <div style={{ fontFamily: T.disp, fontSize: 22, color: T.gold, lineHeight: 1 }}>{value}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ fontFamily: T.body, fontSize: 13, color: 'rgba(242,237,228,.6)', lineHeight: 1.55, marginTop: 10 }}>
                    {h2h?.lastMeeting
                      ? `${h2h.lastMeeting.tournament ?? 'Evento'}${h2h.lastMeeting.surface ? ` em ${h2h.lastMeeting.surface}` : ''}${h2h.lastMeeting.score ? `, placar ${h2h.lastMeeting.score}` : ''}.`
                      : 'Ainda nao ha confronto salvo suficiente para montar uma narrativa historica mais longa.'}
                  </div>
                </div>

                <div style={{ padding: '14px', background: 'rgba(255,255,255,.018)', border: '1px solid rgba(242,237,228,.06)' }}>
                  <div style={{ fontFamily: T.mono, fontSize: 7, color: sc.light, letterSpacing: '.28em', textTransform: 'uppercase', marginBottom: 8 }}>Leitura editorial do matchup</div>
                  <div style={{ fontFamily: T.body, fontSize: 13.5, color: 'rgba(242,237,228,.72)', lineHeight: 1.7 }}>
                    {`${safeFirstName(winnerPlayer, 'Jogador A')} chega com ${sumCareerTitles(winnerPlayer)} titulos e pico de #${winnerCareer.bestRank ?? '--'}, enquanto ${safeFirstName(loserPlayer, 'Jogador B')} responde com ${sumCareerTitles(loserPlayer)} titulos e pico de #${loserCareer.bestRank ?? '--'}. O confronto mistura ${winnerStyle.archetype?.label ?? 'identidade propria'} contra ${loserStyle.archetype?.label ?? 'outro idioma competitivo'}, com vantagem de ${surfKey.toLowerCase()} de ${formatSignedDiff((winnerCareer.surfaceSnap.winPct ?? 0) - (loserCareer.surfaceSnap.winPct ?? 0), false)} para o lado esquerdo do painel.`}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div style={{ padding: '0 24px 22px' }}>
          <div style={{ border: '1px solid rgba(242,237,228,.08)', background: 'rgba(255,255,255,.018)', clipPath: 'polygon(8px 0,100% 0,calc(100% - 8px) 100%,0 100%)' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(242,237,228,.06)', fontFamily: T.mono, fontSize: 7, color: sc.light, letterSpacing: '.34em', textTransform: 'uppercase' }}>
              Identidade que entrou em quadra
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, padding: '16px' }}>
              {[winnerIdentity, loserIdentity].map((identity, idx) => (
                <div key={identity.player?.id ?? idx} style={{ padding: '14px 14px 12px', background: 'rgba(255,255,255,.02)', border: `1px solid ${(idx === 0 ? T.gold : '#8CF1B2')}22` }}>
                  <div style={{ fontFamily: T.disp, fontSize: 24, color: idx === 0 ? T.gold : '#8CF1B2', lineHeight: 1, textTransform: 'uppercase' }}>
                    {identity.signature.headline}
                  </div>
                  <div style={{ fontFamily: T.body, fontSize: 13, color: 'rgba(242,237,228,.68)', lineHeight: 1.6, marginTop: 8 }}>
                    {identity.signature.subline}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                    {[identity.signature.moodTag, identity.signature.formTag, identity.signature.reputationTag].filter(Boolean).map((tag) => (
                      <span key={tag} style={{ fontFamily: T.mono, fontSize: 7, color: 'rgba(242,237,228,.72)', border: '1px solid rgba(242,237,228,.1)', padding: '4px 7px', letterSpacing: '.12em', textTransform: 'uppercase' }}>
                        {tag}
                      </span>
                    ))}
                  </div>
                  <div style={{ marginTop: 10, fontFamily: T.body, fontSize: 12.5, color: 'rgba(242,237,228,.58)', lineHeight: 1.5 }}>
                    Leitura pública: {identity.reputation.consensus ?? 'sem consenso consolidado'}.
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ height: 2, background: `linear-gradient(90deg, transparent, ${sc.main}66, transparent)` }} />
      </div>
    </div>
  );
}

// ── Round labels ───────────────────────────────────────────────────────
function roundNameFromSize(players, short) {
  const MAP_SHORT = {
    128:'R128', 64:'R64', 32:'R32', 16:'OITAVAS',
    8:'QUARTAS', 4:'SEMIFINAL', 2:'FINAL',
  };
  const MAP_FULL = {
    128:'128 avos', 64:'64 avos', 32:'32 avos', 16:'Oitavas',
    8:'Quartas', 4:'Semifinal', 2:'Final',
  };
  return (short ? MAP_SHORT : MAP_FULL)[players] ?? (short ? `R${players}` : `${players} avos`);
}

function mainLabels(rounds) {
  return rounds.map(r => roundNameFromSize(r.length * 2, true));
}

function mainLabelsFull(rounds) {
  return rounds.map(r => roundNameFromSize(r.length * 2, false));
}

function qualLabels(rounds) {
  const total = rounds.length;
  return rounds.map((_, ri) => {
    const fe = total - 1 - ri;
    if (fe === 0) return 'FINAL QUAL.';
    if (fe === 1) return 'SEMI QUAL.';
    return `FASE ${ri + 1}`;
  });
}


export default function TournamentBracket({
  tournament,
  tourPlayers,
  prospects,
  preparedPackage = null,
  existingResult,
  savedState,
  onBack,
  onWatchMatch,
  onApplyResult,
  onSaveProgress,
  playerSeasonSlots = {},
  historicalTournamentResults = {},
  currentYear = null,
  allPlayers = [],
}) {
  useEffect(() => { injectStyles(); }, []);
  const safeSavedState = useMemo(() => sanitizeBracketSavedState(savedState, tournament?.id ?? null), [savedState, tournament?.id]);

  // ── Restore from savedState or start fresh ───────────────────────────
  const initPhase  = safeSavedState?.phase      ?? (preparedPackage?.bracket ? 'MAIN_DRAW' : 'QUALIFYING');
  const initQB     = safeSavedState?.qBracket   ?? preparedPackage?.qualifyingBracket ?? null;
  const initQDone  = safeSavedState?.qDone      ?? Boolean(preparedPackage?.bracket);
  const initB      = safeSavedState?.bracket    ?? preparedPackage?.bracket ?? null;
  const initQuals  = safeSavedState?.qualifiers ?? preparedPackage?.qualifiers ?? [];
  const initDone   = safeSavedState?.done       ?? false;

  const [phase,      setPhase]   = useState(initPhase);
  const [qBracket,   setQB]      = useState(initQB);
  const [qDone,      setQD]      = useState(initQDone);
  const [bracket,    setBracket] = useState(initB);
  const [qualifiers, setQuals]   = useState(initQuals);
  const [done,       setDone]    = useState(initDone);
  const [simulating, setSim]     = useState(false);
  const [fastMenuOpen,    setFastMenu]    = useState(false);
  const [headlessMenuOpen, setHeadlessMenu] = useState(false);
  const [resumeMatch,    setResumeMatch]  = useState(null);  // match object for résumé modal
  const [resumeRoundLabel, setResumeRoundLabel] = useState(null);

  // ── Main view tabs: bracket / vencedores / recordes ──────────────
  const SHOW_HISTORY_CATS = ['GRAND_SLAM','SLAM_CLASH','MASTERS_1000','ATP_500','ATP_250','FINALS'];
  const showHistoryTabs = SHOW_HISTORY_CATS.includes(tournament.category);
  const [mainTab, setMainTab] = useState('bracket');

  // ── Close dropdowns on outside click — AFTER useState ───────────────
  useEffect(() => {
    if (!fastMenuOpen && !headlessMenuOpen) return;
    const close = () => { setFastMenu(false); setHeadlessMenu(false); };
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [fastMenuOpen, headlessMenuOpen]);

  // ── HeadlessOverlay state ──────────────────────────────────────────
  const [overlayMode,    setOverlayMode]    = useState(false);
  const [overlayEvent,   setOverlayEvent]   = useState(null);
  const [overlayFeed,    setOverlayFeed]    = useState([]);
  const [overlayTotal,   setOverlayTotal]   = useState(0);
  const [overlayProgress, setOverlayProgress] = useState(0);
  const overlayFeedRef = useRef([]);

  const qRef = useRef(safeSavedState?.qBracket ?? preparedPackage?.qualifyingBracket ?? null);
  const bRef = useRef(initB);

  const sc       = SURFACE_CLR[tournament.surface] ?? SURFACE_CLR.HARD;
  const catColor = CAT_CLR[tournament.category] ?? '#888';
  const courtKey = tournament.courtKey ?? 'US_OPEN';
  const bestOf   = tournament.bestOf ?? 3;
  const hasQ     = (tournament.qualifyOut ?? 0) > 0 && !tournament.isFinals;

  // ── Persist progress to parent whenever bracket/phase changes ────────
  const saveProgress = useCallback((overrides = {}) => {
    onSaveProgress?.({
      tournamentId: tournament?.id ?? null,
      phase,
      qBracket: qRef.current,
      qDone,
      bracket: bRef.current,
      qualifiers,
      done,
      qRef: qRef.current,
      bRef: bRef.current,
      ...overrides,
    });
  }, [phase, qDone, qualifiers, done, onSaveProgress]);

  // ── INIT ─────────────────────────────────────────────────────────────
  useEffect(() => {
    // If restored from savedState, skip init
    if (safeSavedState) return;
    if (bRef.current || qRef.current) return;

    if (existingResult) {
      const b = existingResult.bracket;
      bRef.current = b;
      setBracket(b);
      setQuals(existingResult.qualifiers ?? []);
      setDone(true);
      setPhase('MAIN_DRAW');
      return;
    }

    if (preparedPackage?.bracket) {
      qRef.current = preparedPackage.qualifyingBracket ?? null;
      bRef.current = preparedPackage.bracket;
      setQB(preparedPackage.qualifyingBracket ?? null);
      setQD(true);
      setBracket(preparedPackage.bracket);
      setQuals(preparedPackage.qualifiers ?? []);
      setPhase('MAIN_DRAW');
      return;
    }

    try {
      const sortedTourPlayers = [...tourPlayers].sort((a, b) => (a.rankPosition ?? 999) - (b.rankPosition ?? 999));
      const sortedJuniors   = [...prospects].sort((a, b) => (a.rankPosition ?? 999) - (b.rankPosition ?? 999));

      // ── Lesões pré-torneio (lógica canônica — igual ao runTournament) ──
      const allBracketPlayers = [...sortedTourPlayers, ...sortedJuniors];
      const { injuryWithdrawals: injuredSet, updatedByInjury: injuryMap } =
        applyPreTournamentInjuries(allBracketPlayers, tournament, null);

      const injuryUpdatedPlayers = sortedTourPlayers.map(p => injuryMap[p.id] ?? p);
      const injuryUpdatedJuniors = sortedJuniors.map(p => injuryMap[p.id] ?? p);

      const { mainDraw, qualifying, preQualifying } = selectTournamentPlayers(
        tournament, injuryUpdatedPlayers, injuryUpdatedJuniors, injuredSet, playerSeasonSlots
      );
      qRef._mainDraw = mainDraw;

      // Atualiza season slots para M1000/500/250 (igual ao runTournament)
      if (['ATP_500','ATP_250','MASTERS_1000'].includes(tournament.category)) {
        for (const player of [...mainDraw, ...qualifying]) {
          if (!playerSeasonSlots[player.id]) playerSeasonSlots[player.id] = createSeasonSlots();
          updateSeasonSlots(playerSeasonSlots[player.id], player, tournament);
        }
      }

      if (hasQ && (qualifying.length > 0 || preQualifying.length > 0)) {
        // ── Simula qualifying silenciosamente (2 fases se necessário) ──
        // Fase 1: Pré-Qualify (ranks 65-128) → metade avança
        let preQualWinners = [];
        if (preQualifying.length > 0) {
          const pqOut = Math.ceil(preQualifying.length / 2);
          let pq = generateQualifyingBracket(preQualifying, pqOut);
          while (!pq.isComplete) {
            const ri = pq.currentRound;
            if (ri >= pq.rounds.length) break;
            let any = false;
            for (let mi = 0; mi < pq.rounds[ri].length; mi++) {
              const m = pq.rounds[ri][mi];
              if (m.winner || !m.playerA || !m.playerB || m.isBye) continue;
              any = true;
              const { winner, result } = runSingleMatchFast(m.playerA, m.playerB, courtKey, bestOf, tournament);
              pq = applyAndAdvanceQ(pq, ri, mi, winner, result);
            }
            if (!any) break;
          }
          preQualWinners = pq.qualifiers ?? [];
        }

        // Fase 2: Qualify = qualifying direto + vencedores do pré-qual
        const qualPool = [...qualifying, ...preQualWinners];
        const qualifyOut = tournament.qualifyOut ?? 0;
        let quals = [];
        if (qualPool.length > 0 && qualifyOut > 0) {
          let q = generateQualifyingBracket(qualPool, qualifyOut);
          while (!q.isComplete) {
            const ri = q.currentRound;
            if (ri >= q.rounds.length) break;
            let any = false;
            for (let mi = 0; mi < q.rounds[ri].length; mi++) {
              const m = q.rounds[ri][mi];
              if (m.winner || !m.playerA || !m.playerB || m.isBye) continue;
              any = true;
              const { winner, result } = runSingleMatchFast(m.playerA, m.playerB, courtKey, bestOf, tournament);
              q = applyAndAdvanceQ(q, ri, mi, winner, result);
            }
            if (!any) break;
          }
          quals = q.qualifiers ?? [];
          qRef.current = q;
          setQB(q);
          setQD(true);
        }

        // Main draw: diretos + qualificados
        const allPlayers = [...mainDraw, ...quals]
          .sort((a, b) => (a.rankPosition ?? 999) - (b.rankPosition ?? 999))
          .slice(0, tournament.draw);
        const b2 = generateBracket(tournament, allPlayers);
        bRef.current = b2;
        setBracket(b2);
        setQuals(quals);
        setPhase('MAIN_DRAW');
      } else {
        const all = [...mainDraw]
          .sort((a, b) => (a.rankPosition ?? 999) - (b.rankPosition ?? 999))
          .slice(0, tournament.draw);
        const b = generateBracket(tournament, all);
        bRef.current = b;
        setBracket(b);
        setPhase('MAIN_DRAW');
      }
    } catch (e) {
      console.error('[TournamentBracket] init:', e);
    }
  }, [safeSavedState]); // eslint-disable-line

  // ── Auto-complete qualifying if savedState restored to QUALIFYING phase ──
  useEffect(() => {
    if (!safeSavedState) return;
    if (phase !== 'QUALIFYING' || qDone || !qRef.current) return;
    let q = qRef.current;
    while (!q.isComplete) {
      const ri = q.currentRound;
      if (ri >= q.rounds.length) break;
      let any = false;
      for (let mi = 0; mi < q.rounds[ri].length; mi++) {
        const m = q.rounds[ri][mi];
        if (m.winner || !m.playerA || !m.playerB || m.isBye) continue;
        any = true;
        const { winner, result } = runSingleMatchFast(m.playerA, m.playerB, courtKey, bestOf, tournament);
        q = applyAndAdvanceQ(q, ri, mi, winner, result);
      }
      if (!any) break;
    }
    qRef.current = q;
    setQB(q);
    setQD(true);
    const quals = q.qualifiers ?? [];
    setQuals(quals);
    if (!bRef.current) {
      const allP = [...(qRef._mainDraw ?? []), ...quals]
        .sort((a, b) => (a.rankPosition ?? 999) - (b.rankPosition ?? 999))
        .slice(0, tournament.draw);
      const b3 = generateBracket(tournament, allP);
      bRef.current = b3;
      setBracket(b3);
    }
    setPhase('MAIN_DRAW');
  }, []); // eslint-disable-line

  const startMainDraw = useCallback(() => {
    const quals = qRef.current?.qualifiers ?? [];
    const all = [...(qRef._mainDraw ?? []), ...quals]
      .sort((a, b) => (a.rankPosition ?? 999) - (b.rankPosition ?? 999))
      .slice(0, tournament.draw);
    const b = generateBracket(tournament, all);
    bRef.current = b;
    setBracket(b);
    setQuals(quals);
    setPhase('MAIN_DRAW');
    onSaveProgress?.({ phase: 'MAIN_DRAW', qBracket: qRef.current, qDone: true, bracket: b, qualifiers: quals, done: false, qRef: qRef.current, bRef: b });
  }, [tournament, prospects, onSaveProgress, safeSavedState]);

  const commitB = useCallback((b) => {
    bRef.current = b;
    setBracket(b);
    if (b.isComplete) {
      setDone(true);
      onApplyResult?.(b, qualifiers);
      onSaveProgress?.(null); // clear saved state on completion
    } else {
      onSaveProgress?.({ phase: 'MAIN_DRAW', qBracket: qRef.current, qDone: true, bracket: b, qualifiers, done: false, qRef: qRef.current, bRef: b });
    }
  }, [qualifiers, onApplyResult, onSaveProgress]);

  const commitQ = useCallback((q) => {
    qRef.current = q;
    setQB(q);
    const isDone = q.isComplete;
    if (isDone) setQD(true);
    onSaveProgress?.({ phase: 'QUALIFYING', qBracket: q, qDone: isDone, bracket: bRef.current, qualifiers, done: false, qRef: q, bRef: bRef.current });
  }, [qualifiers, onSaveProgress]);

  // ── Sim qualifying ──────────────────────────────────────────────────
  const simQ = useCallback(async (ri, mi) => {
    const q = qRef.current;
    if (!q || simulating) return;
    const m = q.rounds[ri]?.[mi];
    if (!m || m.winner || !m.playerA || !m.playerB) return;
    setSim(true); await new Promise(r => setTimeout(r, 0));
    try {
      const { winner, result } = runSingleMatchSlim(m.playerA, m.playerB, courtKey, bestOf, tournament);
      commitQ(applyAndAdvanceQ(qRef.current, ri, mi, winner, result));
    } finally { setSim(false); }
  }, [simulating, courtKey, bestOf, commitQ]);

  const simQRound = useCallback(async () => {
    if (!qRef.current || simulating || qDone) return;
    setSim(true); await new Promise(r => setTimeout(r, 0));
    try {
      let cur = qRef.current;
      const ri = cur.currentRound;
      for (let mi = 0; mi < cur.rounds[ri].length; mi++) {
        const m = cur.rounds[ri][mi];
        if (m.winner || !m.playerA || !m.playerB || m.isBye) continue;
        const { winner, result } = runSingleMatchSlim(m.playerA, m.playerB, courtKey, bestOf, tournament);
        cur = applyAndAdvanceQ(cur, ri, mi, winner, result);
      }
      qRef.current = cur; commitQ(cur);
    } finally { setSim(false); }
  }, [simulating, qDone, courtKey, bestOf, commitQ]);

  const simQAll = useCallback(async () => {
    if (!qRef.current || simulating || qDone) return;
    setSim(true); await new Promise(r => setTimeout(r, 0));
    try {
      let cur = qRef.current;
      while (!cur.isComplete) {
        const ri = cur.currentRound;
        if (ri >= cur.rounds.length) break;
        let any = false;
        for (let mi = 0; mi < cur.rounds[ri].length; mi++) {
          const m = cur.rounds[ri][mi];
          if (m.winner || !m.playerA || !m.playerB || m.isBye) continue;
          any = true;
          const { winner, result } = runSingleMatchSlim(m.playerA, m.playerB, courtKey, bestOf, tournament);
          cur = applyAndAdvanceQ(cur, ri, mi, winner, result);
        }
        if (!any) break;
        await new Promise(r => setTimeout(r, 0));
      }
      qRef.current = cur; commitQ(cur);
    } finally { setSim(false); }
  }, [simulating, qDone, courtKey, bestOf, commitQ]);

  // ── Sim main draw ───────────────────────────────────────────────────
  const simM = useCallback(async (ri, mi) => {
    const b = bRef.current;
    if (!b || simulating) return;
    const m = b.rounds[ri]?.[mi];
    if (!m || m.winner || !m.playerA || !m.playerB) return;
    setSim(true); await new Promise(r => setTimeout(r, 0));
    try {
      const { winner, result } = runSingleMatchSlim(m.playerA, m.playerB, courtKey, bestOf, tournament);
      commitB(applyAndAdvance(bRef.current, ri, mi, winner, result));
    } finally { setSim(false); }
  }, [simulating, courtKey, bestOf, commitB]);

  const simMRound = useCallback(async () => {
    if (!bRef.current || simulating || done) return;
    setSim(true); await new Promise(r => setTimeout(r, 0));
    try {
      let cur = bRef.current;
      const ri = cur.currentRound;
      for (let mi = 0; mi < cur.rounds[ri].length; mi++) {
        const m = cur.rounds[ri][mi];
        if (m.winner || !m.playerA || !m.playerB || m.isBye) continue;
        const { winner, result } = runSingleMatchSlim(m.playerA, m.playerB, courtKey, bestOf, tournament);
        cur = applyAndAdvance(cur, ri, mi, winner, result);
      }
      bRef.current = cur; commitB(cur);
    } finally { setSim(false); }
  }, [simulating, done, courtKey, bestOf, commitB]);

  const simMAll = useCallback(async () => {
    if (!bRef.current || simulating || done) return;
    setSim(true); await new Promise(r => setTimeout(r, 0));
    try {
      let cur = bRef.current;
      while (!cur.isComplete) {
        const ri = cur.currentRound;
        if (ri >= cur.rounds.length) break;
        let any = false;
        for (let mi = 0; mi < cur.rounds[ri].length; mi++) {
          const m = cur.rounds[ri][mi];
          if (m.winner || !m.playerA || !m.playerB || m.isBye) continue;
          any = true;
          const { winner, result } = runSingleMatchSlim(m.playerA, m.playerB, courtKey, bestOf, tournament);
          cur = applyAndAdvance(cur, ri, mi, winner, result);
        }
        if (!any) break;
        await new Promise(r => setTimeout(r, 0));
      }
      bRef.current = cur; commitB(cur);
    } finally { setSim(false); }
  }, [simulating, done, courtKey, bestOf, commitB]);

  // ── Generic sim-to-target (Q or Main) ───────────────────────────────
  // engineFn: runSingleMatch | runSingleMatchFast
  // target: 'phase' | 'qf' | 'sf' | 'f' | 'all'
  // isHeadless: whether to show HeadlessOverlay
  const simQToTarget = useCallback(async (target, engineFn, isHeadless = false) => {
    if (!qRef.current || simulating || qDone) return;
    if (isHeadless) {
      setOverlayMode(true);
      setOverlayEvent(null);
      setOverlayFeed([]);
      setOverlayProgress(0);
      setOverlayTotal(0);
      overlayFeedRef.current = [];
    }
    setSim(true); await new Promise(r => setTimeout(r, 0));
    try {
      let cur = qRef.current;
      const startRound = cur.currentRound;
      let matchCount = 0;
      while (!cur.isComplete) {
        const ri = cur.currentRound;
        if (ri >= cur.rounds.length) break;
        if (shouldStopBefore(target, ri, startRound, cur.rounds)) break;
        let any = false;
        for (let mi = 0; mi < cur.rounds[ri].length; mi++) {
          const m = cur.rounds[ri][mi];
          if (m.winner || !m.playerA || !m.playerB || m.isBye) continue;
          any = true;
          const resolvedFnQ = engineFn === 'auto'
            ? getAutoEngine(tournament?.draw ?? 32, cur.rounds[ri].length * 2, tournament, 'qualifying')
            : engineFn;
          const { winner, result } = resolvedFnQ(m.playerA, m.playerB, courtKey, bestOf, tournament);
          if (isHeadless) {
            matchCount++;
            const loser = winner.id === m.playerA.id ? m.playerB : m.playerA;
            const event = { id: matchCount, playerA: m.playerA, playerB: m.playerB, winner, loser, result, roundLabel: 'QQ', roundLabelFull: 'Qualifying', phase: 'qualifying' };
            setOverlayEvent(event);
            setOverlayProgress(matchCount);
            overlayFeedRef.current = [event, ...overlayFeedRef.current].slice(0, 14);
            setOverlayFeed([...overlayFeedRef.current]);
            // Yield após cada partida para o React renderizar o overlay
            await new Promise(r => setTimeout(r, 0));
          }
          cur = applyAndAdvanceQ(cur, ri, mi, winner, result);
        }
        if (!any) break;
        if (!isHeadless) await new Promise(r => setTimeout(r, 0));
      }
      qRef.current = cur; commitQ(cur);
    } finally {
      setSim(false);
      if (isHeadless) {
        // Pequeno delay antes de fechar overlay para o usuário ver o resultado final
        await new Promise(r => setTimeout(r, 800));
        setOverlayMode(false);
        setOverlayEvent(null);
        setOverlayFeed([]);
        overlayFeedRef.current = [];
      }
    }
  }, [simulating, qDone, courtKey, bestOf, commitQ]);

  // Round label mapping (from end of bracket)
  const getRoundLabel = useCallback((ri, rounds) => {
    const players = Array.isArray(rounds) ? rounds[ri]?.length * 2 : Math.pow(2, (rounds - ri));
    return roundNameFromSize(players, true);
  }, []);
  const getRoundLabelFull = useCallback((ri, rounds) => {
    const players = Array.isArray(rounds) ? rounds[ri]?.length * 2 : Math.pow(2, (rounds - ri));
    return roundNameFromSize(players, false);
  }, []);

  const simMToTarget = useCallback(async (target, engineFn, isHeadless = false) => {
    if (!bRef.current || simulating || done) return;
    if (isHeadless) {
      const estTotal = Math.max(1, (tournament.draw ?? 32) - 1 + (tournament.qualifyOut ?? 0) * 2);
      setOverlayMode(true);
      setOverlayEvent(null);
      setOverlayFeed([]);
      setOverlayProgress(0);
      setOverlayTotal(estTotal);
      overlayFeedRef.current = [];
    }
    setSim(true); await new Promise(r => setTimeout(r, 0));
    try {
      let cur = bRef.current;
      const startRound = cur.currentRound;
      let matchCount = 0;
      while (!cur.isComplete) {
        const ri = cur.currentRound;
        if (ri >= cur.rounds.length) break;
        if (shouldStopBefore(target, ri, startRound, cur.rounds)) break;
        let any = false;
        for (let mi = 0; mi < cur.rounds[ri].length; mi++) {
          const m = cur.rounds[ri][mi];
          if (m.winner || !m.playerA || !m.playerB || m.isBye) continue;
          any = true;
          const resolvedFnM = engineFn === 'auto'
            ? getAutoEngine(tournament?.draw ?? 32, cur.rounds[ri].length * 2, tournament, 'main')
            : engineFn;
          const { winner, result } = resolvedFnM(m.playerA, m.playerB, courtKey, bestOf, tournament);
          if (isHeadless) {
            matchCount++;
            const loser = winner.id === m.playerA.id ? m.playerB : m.playerA;
            const rl = getRoundLabel(ri, cur.rounds);
            const rlfull = getRoundLabelFull(ri, cur.rounds);
            const event = { id: matchCount, playerA: m.playerA, playerB: m.playerB, winner, loser, result, roundLabel: rl, roundLabelFull: rlfull, phase: 'main' };
            setOverlayEvent(event);
            setOverlayProgress(matchCount);
            overlayFeedRef.current = [event, ...overlayFeedRef.current].slice(0, 14);
            setOverlayFeed([...overlayFeedRef.current]);
            // Yield após cada partida para o React renderizar o overlay
            await new Promise(r => setTimeout(r, 0));
          }
          cur = applyAndAdvance(cur, ri, mi, winner, result);
        }
        if (!any) break;
        if (!isHeadless) await new Promise(r => setTimeout(r, 0));
      }
      bRef.current = cur; commitB(cur);
    } finally {
      setSim(false);
      if (isHeadless) {
        // Pequeno delay antes de fechar overlay para o usuário ver o resultado final
        await new Promise(r => setTimeout(r, 800));
        setOverlayMode(false);
        setOverlayEvent(null);
        setOverlayFeed([]);
        overlayFeedRef.current = [];
      }
    }
  }, [simulating, done, courtKey, bestOf, commitB, tournament, getRoundLabel, getRoundLabelFull]);

  const watchM = useCallback((match, ri, mi) => {
    if (!onWatchMatch) return;
    onWatchMatch(match, ri, mi, (result) => {
      const cur = bRef.current;
      if (!cur) return;
      const winner = result.sets[0] > result.sets[1] ? match.playerA : match.playerB;
      const nb = applyAndAdvance(cur, ri, mi, winner, result);
      bRef.current = nb; commitB(nb);
    });
  }, [onWatchMatch, commitB]);

  // ── Loading ───────────────────────────────────────────────────────────
  if (!bracket && !qBracket) {
    return (
      <div className="tb-screen" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontFamily: T.mono, fontSize: 9, color: T.faint, letterSpacing: 5, animation: 'tb-blink 1s infinite' }}>
          GERANDO CHAVE…
        </span>
      </div>
    );
  }

  const champion = bracket?.champion;
  const qSeed    = qBracket ? buildSeedMap(qBracket.rounds) : {};
  const mSeed    = bracket  ? buildSeedMap(bracket.rounds)  : {};

  // Derived for featured match
  const curRound = bracket?.currentRound ?? 0;
  const mLabelsFull = bracket ? mainLabelsFull(bracket.rounds) : [];
  const mLabels     = bracket ? mainLabels(bracket.rounds) : [];
  const featuredMatch = (phase === 'MAIN_DRAW' && bracket && !done)
    ? findFeaturedMatch(bracket.rounds, curRound, mSeed)
    : null;
  // After done, show the final match
  const finalMatch = (phase === 'MAIN_DRAW' && bracket && done)
    ? bracket.rounds?.[bracket.rounds.length - 1]?.[0]
    : null;

  const SIM_OPTS = [
    { target:'phase', icon:'▶', label:'Simular Fase' },
    { target:'qf',    icon:'⚡', label:'Até Quartas' },
    { target:'sf',    icon:'⚡', label:'Até Semifinal' },
    { target:'f',     icon:'⚡', label:'Até Final' },
    { target:'all',   icon:'🏆', label:'Simular Tudo' },
  ];

  const DropBtn = ({ label, color, menuOpen, setMenu, onSelect }) => (
    <div style={{ position: 'relative' }} onClick={e => e.stopPropagation()}>
      <button className="tb-btn" disabled={simulating}
        onClick={() => !simulating && setMenu(v => !v)}
        style={{
          background: menuOpen ? `${color}22` : `${color}10`,
          border: `1px solid ${menuOpen ? color : color + '55'}`, color,
          display: 'flex', alignItems: 'center', gap: 6,
        }}
      >
        {label}
        <span style={{ fontSize: 7, opacity: .6 }}>{menuOpen ? '▲' : '▼'}</span>
      </button>
      {menuOpen && (
        <div className="tb-dropdown-menu">
          <div className="tb-dropdown-header">{label}</div>
          {SIM_OPTS.map(o => (
            <div key={o.target} className="tb-dropdown-opt" style={{ color }}
              onClick={() => { setMenu(false); onSelect(o.target); }}
            >
              <span className="tb-dropdown-opt-icon">{o.icon}</span>
              {o.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="tb-screen">

      {/* ── Background orbs ──────────────────────────────────────────── */}
      <div style={{ position:'fixed', inset:0, pointerEvents:'none', zIndex:0, overflow:'hidden' }}>
        <div style={{
          position:'absolute', top:'-10%', right:'-5%', width:700, height:700, borderRadius:'50%',
          background:`radial-gradient(circle, ${sc.main}15 0%, transparent 65%)`,
          filter:'blur(80px)', animation:'tb-drift 20s ease-in-out infinite',
        }} />
        <div style={{
          position:'absolute', bottom:'-15%', left:'-8%', width:500, height:500, borderRadius:'50%',
          background:`radial-gradient(circle, rgba(232,200,74,.06) 0%, transparent 65%)`,
          filter:'blur(70px)', animation:'tb-drift 26s ease-in-out infinite reverse',
        }} />
        <div style={{
          position:'absolute', inset:0,
          backgroundImage:`linear-gradient(${sc.main}10 1px, transparent 1px), linear-gradient(90deg, ${sc.main}08 1px, transparent 1px)`,
          backgroundSize:'80px 80px',
          maskImage:'radial-gradient(ellipse 70% 50% at 60% 30%, rgba(0,0,0,.5), transparent)',
          WebkitMaskImage:'radial-gradient(ellipse 70% 50% at 60% 30%, rgba(0,0,0,.5), transparent)',
        }} />
      </div>

      {/* ── TOP BAR — Broadcast header ──────────────────────────────── */}
      <div style={{
        position:'sticky', top:0, zIndex:40,
        background:'rgba(3,5,7,.95)', backdropFilter:'blur(20px)',
        borderBottom:`1px solid ${sc.main}28`,
        flexShrink:0, display:'flex', alignItems:'stretch',
        minHeight:64,
      }}>
        {/* Left block — tournament identity */}
        <div style={{
          display:'flex', alignItems:'center', gap:14, padding:'10px 22px',
          borderRight:`1px solid rgba(255,255,255,.06)`,
          background:'rgba(0,0,0,.3)', flexShrink:0, minWidth:0,
        }}>
          <button className="tb-btn tb-btn-back" onClick={onBack} style={{ flexShrink:0 }}>
            ← VOLTAR
          </button>
          <div style={{ width:3, height:36, background:sc.main, opacity:.8, flexShrink:0, clipPath:'polygon(0 0,100% 6%,100% 94%,0 100%)' }} />
          <span style={{ fontSize:22, flexShrink:0 }}>{tournament.icon}</span>
          <div style={{ minWidth:0 }}>
            <div style={{ fontFamily:T.disp, fontSize:'clamp(20px,2vw,28px)', letterSpacing:'.06em', color:T.white, lineHeight:.9, textTransform:'uppercase', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
              {tournament.name}
            </div>
            <div style={{ display:'flex', gap:6, marginTop:5, flexWrap:'wrap', alignItems:'center' }}>
              <span style={{ background:`${sc.main}18`, border:`1px solid ${sc.main}44`, color:sc.light, fontFamily:T.mono, fontSize:7.5, padding:'3px 9px', letterSpacing:'.22em', clipPath:'polygon(3px 0,100% 0,calc(100% - 3px) 100%,0 100%)' }}>
                {sc.icon} {sc.label.toUpperCase()}
              </span>
              <span style={{ background:`${catColor}14`, border:`1px solid ${catColor}38`, color:catColor, fontFamily:T.mono, fontSize:7.5, padding:'3px 9px', letterSpacing:'.18em', clipPath:'polygon(3px 0,100% 0,calc(100% - 3px) 100%,0 100%)' }}>
                {CAT_LABEL[tournament.category] ?? tournament.category}
              </span>
              <span style={{ fontFamily:T.mono, fontSize:7, color:'rgba(242,237,228,.28)', letterSpacing:'.16em' }}>
                {tournament.draw}P · {tournament.format === 'SUPER_TB_10' ? 'STB10' : (bestOf === 5 ? 'BO5' : 'BO3')} · {tournament.location}
              </span>
            </div>
          </div>
        </div>

        {/* Center — current round info */}
        <div style={{ flex:1, display:'flex', alignItems:'center', padding:'0 22px', minWidth:0, gap:14 }}>
          {!done && bracket && (
            <>
              <div>
                <div style={{ fontFamily:T.mono, fontSize:7, letterSpacing:'.4em', color:'rgba(242,237,228,.25)', textTransform:'uppercase', marginBottom:3 }}>
                  RODADA ATUAL
                </div>
                <div style={{ fontFamily:T.disp, fontSize:24, letterSpacing:'.06em', color:sc.light, lineHeight:1, textTransform:'uppercase' }}>
                  {mLabels[curRound] ?? `R${curRound+1}`}
                </div>
              </div>
              <div style={{ width:1, height:32, background:'rgba(255,255,255,.08)' }} />
              <div>
                <div style={{ fontFamily:T.mono, fontSize:7, letterSpacing:'.4em', color:'rgba(242,237,228,.25)', textTransform:'uppercase', marginBottom:3 }}>
                  PARTIDAS
                </div>
                <div style={{ fontFamily:T.disp, fontSize:24, letterSpacing:'.06em', color:T.white, lineHeight:1 }}>
                  {bracket.rounds?.[curRound]?.filter(m => !m.isBye && m.playerA && m.playerB).length ?? 0}
                </div>
              </div>
              <div style={{ width:1, height:32, background:'rgba(255,255,255,.08)' }} />
              <div>
                <div style={{ fontFamily:T.mono, fontSize:7, letterSpacing:'.4em', color:'rgba(242,237,228,.25)', textTransform:'uppercase', marginBottom:3 }}>
                  JOGADORES
                </div>
                <div style={{ fontFamily:T.disp, fontSize:24, letterSpacing:'.06em', color:T.white, lineHeight:1 }}>
                  {tournament.draw}
                </div>
              </div>
            </>
          )}
          {done && champion && (
            <div style={{ display:'flex', alignItems:'center', gap:14 }}>
              <span style={{ fontSize:28 }}>🏆</span>
              <div>
                <div style={{ fontFamily:T.mono, fontSize:7, letterSpacing:'.44em', color:T.gold, textTransform:'uppercase', marginBottom:4 }}>CAMPEÃO</div>
                <div style={{ fontFamily:T.disp, fontSize:'clamp(22px,2.5vw,34px)', letterSpacing:'.06em', color:T.gold, lineHeight:.9, textTransform:'uppercase' }}>{champion.name}</div>
                <div style={{ fontFamily:T.mono, fontSize:7, color:'rgba(242,237,228,.35)', letterSpacing:'.18em', marginTop:4 }}>{champion.nationality} · {ovrTier(overallRating(champion.attrs)).grade}</div>
              </div>
            </div>
          )}
        </div>

        {/* Right — action buttons */}
        <div style={{ display:'flex', alignItems:'center', gap:8, padding:'0 18px', borderLeft:'1px solid rgba(255,255,255,.06)', flexShrink:0 }}>
          {phase === 'QUALIFYING' && !qDone && (
            <>
              <DropBtn label="⚡ RÁPIDA"   color={T.gold}       menuOpen={fastMenuOpen}     setMenu={setFastMenu}     onSelect={t => simQToTarget(t, runSingleMatchFast, false)} />
              <DropBtn label="● HEADLESS" color={T.grassLight} menuOpen={headlessMenuOpen} setMenu={setHeadlessMenu} onSelect={t => simQToTarget(t, 'auto', true)} />
            </>
          )}
          {phase === 'QUALIFYING' && qDone && (
            <button className="tb-btn" onClick={startMainDraw} style={{ background:'rgba(232,200,74,.15)', border:`1px solid ${T.gold}55`, color:T.gold, fontSize:9, padding:'9px 20px' }}>
              🏆 CHAVE PRINCIPAL →
            </button>
          )}
          {phase === 'MAIN_DRAW' && !done && !existingResult && (
            <>
              <DropBtn label="⚡ RÁPIDA"   color={T.gold}       menuOpen={fastMenuOpen}     setMenu={setFastMenu}     onSelect={t => simMToTarget(t, runSingleMatchFast, false)} />
              <DropBtn label="● HEADLESS" color={T.grassLight} menuOpen={headlessMenuOpen} setMenu={setHeadlessMenu} onSelect={t => simMToTarget(t, 'auto', true)} />
            </>
          )}
        </div>
      </div>

      {/* ── MAIN TABS: Bracket / Vencedores / Recordes ──────────────── */}
      {showHistoryTabs && (
        <div style={{
          background:'rgba(3,5,7,.95)', backdropFilter:'blur(12px)',
          borderBottom:`1px solid ${sc.main}22`,
          display:'flex', padding:'0 22px', flexShrink:0, gap:0,
        }}>
          {[
            { id:'bracket',    label:'BRACKET',    icon:'⚔️' },
            { id:'vencedores', label:'VENCEDORES', icon:'🏆' },
            { id:'recordes',   label:'RECORDES',   icon:'📈' },
          ].map(t => (
            <button key={t.id}
              onClick={() => setMainTab(t.id)}
              style={{
                background:'none', border:'none', cursor:'pointer',
                borderBottom: mainTab === t.id ? `2px solid ${sc.main}` : '2px solid transparent',
                color: mainTab === t.id ? sc.light : 'rgba(242,237,228,.3)',
                fontFamily:"'Space Mono',monospace", fontSize:9, letterSpacing:'.28em',
                padding:'14px 20px', textTransform:'uppercase',
                transition:'all .15s',
              }}
            >
              <span style={{ marginRight:6 }}>{t.icon}</span>{t.label}
            </button>
          ))}
        </div>
      )}

      {/* ── PHASE TABS ───────────────────────────────────────────────── */}
      {mainTab === 'bracket' && hasQ && bracket && (
        <div style={{
          background:'rgba(3,5,7,.92)', backdropFilter:'blur(12px)',
          borderBottom:`1px solid rgba(255,255,255,.05)`,
          display:'flex', padding:'0 22px', flexShrink:0, gap:2,
        }}>
          {[
            { id:'QUALIFYING', label:'QUALIFYING', sub:`Qualify→${tournament.qualifyOut ?? 0}`, color:T.clay },
            { id:'MAIN_DRAW',  label:'CHAVE PRINCIPAL', sub:`${tournament.draw}P`, color:T.gold },
          ].map(tab => (
            <button key={tab.id}
              className="phase-tab"
              onClick={() => setPhase(tab.id)}
              style={{
                color: phase === tab.id ? tab.color : 'rgba(242,237,228,.25)',
                borderBottom: phase === tab.id ? `2px solid ${tab.color}` : '2px solid transparent',
                display:'flex', alignItems:'center', gap:8,
              }}
            >
              {tab.label}
              <span style={{ fontFamily:T.mono, fontSize:7, letterSpacing:'.22em', color: phase === tab.id ? `${tab.color}88` : 'rgba(242,237,228,.18)' }}>
                {tab.sub}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* ── FEATURED MATCH PANEL ─────────────────────────────────────── */}
      {mainTab === 'bracket' && phase === 'MAIN_DRAW' && bracket && (featuredMatch || finalMatch) && (
        <FeaturedMatch
          match={featuredMatch ?? finalMatch}
          roundLabel={mLabels[curRound]}
          roundLabelFull={mLabelsFull[curRound] ?? (done ? 'Final' : '')}
          sc={sc}
          seedMap={mSeed}
          surface={tournament.surface}
          historicalTournamentResults={historicalTournamentResults}
          currentYear={currentYear}
          tournament={tournament}
        />
      )}

      {/* ── QUALIFYING featured ───────────────────────────────────────── */}
      {mainTab === 'bracket' && phase === 'QUALIFYING' && qBracket && !qDone && (() => {
        const qFeat = findFeaturedMatch(qBracket.rounds, qBracket.currentRound ?? 0, qSeed);
        return qFeat ? (
          <FeaturedMatch
            match={qFeat}
            roundLabel="QUALIFYING"
            roundLabelFull="Qualifying"
            sc={{ main: T.clay, light: T.clayLight, glow: T.clayGlow, label:'Saibro', icon:'CLAY' }}
            seedMap={qSeed}
            surface={tournament.surface}
            historicalTournamentResults={historicalTournamentResults}
            currentYear={currentYear}
            tournament={tournament}
          />
        ) : null;
      })()}

      {/* ── BRACKET SCROLL AREA ──────────────────────────────────────── */}
      {mainTab === 'bracket' && <div className="tb-scroll" style={{ flex:1, overflow:'auto', padding:'28px 28px 80px', minHeight:0, position:'relative', zIndex:1 }}>

        {/* ── QUALIFYING ── */}
        {phase === 'QUALIFYING' && qBracket && (
          <>
            {qDone && (
              <div style={{
                background:'rgba(212,86,30,.07)', border:`1px solid ${T.clay}33`,
                padding:'14px 20px', marginBottom:28,
                display:'flex', alignItems:'center', gap:12, flexWrap:'wrap',
                clipPath:'polygon(6px 0,100% 0,calc(100% - 6px) 100%,0 100%)',
              }}>
                <span style={{ fontFamily:T.disp, fontSize:20, color:T.clay, flexShrink:0, letterSpacing:'.1em' }}>
                  ✓ {(qBracket.qualifiers ?? []).length} CLASSIFICADOS
                </span>
                <div style={{ flex:1, height:1, background:`linear-gradient(90deg,${T.clay}44,transparent)` }} />
                {(qBracket.qualifiers ?? []).map(p => (
                  <span key={p.id} style={{
                    fontFamily:T.cond, fontSize:14, fontWeight:700, letterSpacing:'.07em',
                    color:T.white, textTransform:'uppercase',
                    background:'rgba(212,86,30,.1)', border:`1px solid ${T.clay}33`,
                    padding:'3px 11px',
                    clipPath:'polygon(3px 0,100% 0,calc(100% - 3px) 100%,0 100%)',
                  }}>
                    {p.name}
                  </span>
                ))}
              </div>
            )}
            <BracketCanvas
              rounds={qBracket.rounds}
              currentRound={qBracket.currentRound ?? 0}
              done={qDone}
              simulating={simulating}
              seedMap={qSeed}
              onSim={simQ}
              onWatch={null}
              roundLabels={qualLabels(qBracket.rounds)}
              accent={T.clay}
              onResume={(match) => {
                const ri = qBracket.rounds.findIndex(r => r.some(m => m === match));
                const rl = qualLabels(qBracket.rounds)[ri] ?? null;
                setResumeMatch(match);
                setResumeRoundLabel(rl);
              }}
            />
          </>
        )}

        {/* ── MAIN DRAW ── */}
        {phase === 'MAIN_DRAW' && bracket && (
          <>
            <BracketCanvas
              rounds={bracket.rounds}
              currentRound={bracket.currentRound ?? 0}
              done={done}
              simulating={simulating}
              seedMap={mSeed}
              onSim={simM}
              onWatch={onWatchMatch ? watchM : null}
              roundLabels={mLabels}
              accent={sc.light}
              onResume={(match) => {
                const ri = bracket.rounds.findIndex(r => r.some(m => m === match));
                const rl = mLabels[ri] ?? null;
                setResumeMatch(match);
                setResumeRoundLabel(rl);
              }}
            />

            {done && champion && (
              <div className="champ-banner" style={{ display:'flex', alignItems:'center', gap:28, marginTop:48 }}>
                <span style={{ fontSize:56 }}>🏆</span>
                <div>
                  <div style={{ fontFamily:T.mono, fontSize:8, letterSpacing:'.5em', color:T.faint, marginBottom:8, textTransform:'uppercase' }}>
                    Campeão · {tournament.name}
                  </div>
                  <div style={{ fontFamily:T.disp, fontSize:'clamp(48px,6vw,80px)', letterSpacing:'.04em', color:T.gold, textTransform:'uppercase', lineHeight:.82, textShadow:`0 0 60px rgba(232,200,74,.4)` }}>
                    {champion.name}
                  </div>
                  <div style={{ fontFamily:T.mono, fontSize:10, color:T.dim, marginTop:10, letterSpacing:'.22em' }}>
                    {champion.nationality} · {champion.styleId} · {ovrTier(overallRating(champion.attrs)).grade}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>}

      {/* ── ABA VENCEDORES ───────────────────────────────────────────── */}
      {mainTab === 'vencedores' && (() => {
        // Coleta todos os resultados históricos deste torneio
        const wins = [];
        const playerMap = Object.fromEntries(allPlayers.map(p => [p.id, p]));
        for (const [key, res] of Object.entries(historicalTournamentResults)) {
          if (!res?.tournament) continue;
          if (res.tournament.id !== tournament.id) continue;
          const year = res._season ?? res.tournament?.season ?? '?';
          const champId = res._slim ? res.champion?.id : res.bracket?.champion?.id;
          const champName = res._slim ? res.champion?.name : res.bracket?.champion?.name;
          const finalistName = res._slim ? res.finalist?.name : (() => {
            const b = res.bracket;
            if (!b) return null;
            const fr = b.rounds[b.rounds.length - 1]?.[0];
            if (!fr || !b.champion) return null;
            return (fr.playerA?.id === b.champion.id ? fr.playerB : fr.playerA)?.name ?? null;
          })();
          // Score da final
          let finalScore = null;
          if (!res._slim && res.bracket) {
            const fr = res.bracket.rounds[res.bracket.rounds.length - 1]?.[0];
            if (fr?.result?.setsDetail?.length) {
              finalScore = fr.result.setsDetail.map(([a,b]) => `${a}-${b}`).join(' ');
            }
          }
          const fullPlayer = champId ? playerMap[champId] : null;
          const rankAtTime = fullPlayer?.rankPosition ?? null;
          const ageAtTime = fullPlayer && fullPlayer.birthYear ? (year - fullPlayer.birthYear) : null;
          wins.push({ year, champName, champId, finalistName, finalScore, rankAtTime, ageAtTime });
        }
        // Também inclui resultado do ano atual se existir
        const curr = Object.values({
          ...(existingResult ? { curr: { ...existingResult, _season: currentYear, tournament } } : {}),
        });
        wins.sort((a, b) => Number(b.year) - Number(a.year));

        return (
          <div style={{ flex:1, overflow:'auto', padding:'32px 36px 80px' }}>
            <div style={{ fontFamily:"'Space Mono',monospace", fontSize:8, letterSpacing:'.4em', color:`${sc.main}88`, textTransform:'uppercase', marginBottom:24 }}>
              PALMARÉS · {tournament.name}
            </div>
            {wins.length === 0 ? (
              <div style={{ textAlign:'center', padding:'80px 0', fontFamily:"'Space Mono',monospace", fontSize:9, color:'rgba(255,255,255,.2)', letterSpacing:'.3em' }}>
                NENHUM VENCEDOR REGISTRADO AINDA
              </div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:3 }}>
                {/* Header */}
                <div style={{ display:'grid', gridTemplateColumns:'72px 1fr 1fr 100px 80px', gap:0, padding:'6px 16px', borderBottom:'1px solid rgba(255,255,255,.07)' }}>
                  {['ANO','CAMPEÃO','FINALISTA','SETS','RANK/IDADE'].map((h,i) => (
                    <div key={h} style={{ fontFamily:"'Space Mono',monospace", fontSize:7, letterSpacing:'.3em', color:'rgba(255,255,255,.25)', textTransform:'uppercase', textAlign: i===3?'center':undefined }}>{h}</div>
                  ))}
                </div>
                {wins.map((w, i) => (
                  <div key={w.year} style={{
                    display:'grid', gridTemplateColumns:'72px 1fr 1fr 100px 80px',
                    gap:0, padding:'13px 16px',
                    background: i===0 ? `${sc.main}12` : i%2===0 ? 'rgba(255,255,255,.018)' : 'transparent',
                    borderLeft: i===0 ? `4px solid ${T.gold}` : '4px solid transparent',
                    alignItems:'center',
                    animation:`tb-rise .3s ease ${i*.04}s both`,
                  }}>
                    <div style={{ fontFamily:"'Space Mono',monospace", fontSize:14, fontWeight:700, color: i===0 ? T.gold : 'rgba(255,255,255,.5)', letterSpacing:1 }}>{w.year}</div>
                    <div style={{ fontFamily:"'Barlow Condensed','Oswald',sans-serif", fontSize:20, fontWeight:800, textTransform:'uppercase', letterSpacing:.5, color: i===0 ? T.gold : '#fff' }}>
                      {w.champName ?? '—'}
                    </div>
                    <div style={{ fontFamily:"'Barlow Condensed','Oswald',sans-serif", fontSize:16, color:'rgba(255,255,255,.55)', textTransform:'uppercase', letterSpacing:.3 }}>
                      {w.finalistName ?? '—'}
                    </div>
                    <div style={{ fontFamily:"'Space Mono',monospace", fontSize:10, color:'rgba(255,255,255,.4)', textAlign:'center', letterSpacing:.5 }}>
                      {w.finalScore ?? '—'}
                    </div>
                    <div style={{ fontFamily:"'Space Mono',monospace", fontSize:9, color:'rgba(255,255,255,.35)', letterSpacing:.5 }}>
                      {w.rankAtTime ? `#${w.rankAtTime}` : '—'}{w.ageAtTime ? ` · ${w.ageAtTime}a` : ''}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })()}

      {/* ── ABA RECORDES ─────────────────────────────────────────────── */}
      {mainTab === 'recordes' && (() => {
        const playerMap = Object.fromEntries(allPlayers.map(p => [p.id, p]));
        // Agrega dados por jogador neste torneio
        const byPlayer = {};
        const allRes = { ...historicalTournamentResults };
        if (existingResult) allRes[`${tournament.id}_curr`] = { ...existingResult, _season: currentYear, tournament };

        for (const [, res] of Object.entries(allRes)) {
          if (!res?.tournament || res.tournament.id !== tournament.id) continue;
          const year = res._season ?? res.tournament?.season ?? 0;
          const champId = res._slim ? res.champion?.id : res.bracket?.champion?.id;
          const champName = res._slim ? res.champion?.name : res.bracket?.champion?.name;

          // Coleta partidas
          const matches = res._slim
            ? (res.matches ?? []).map(m => ({ w: m.w, l: m.l }))
            : (res.bracket?.rounds ?? []).flatMap(r => r.filter(m => !m.isBye && m.winner).map(m => ({ w: m.winner.id, l: (m.playerA?.id === m.winner.id ? m.playerB : m.playerA)?.id })));

          // Conta titles, finals, wins, losses
          const addStat = (id, name, field, val=1) => {
            if (!id) return;
            if (!byPlayer[id]) byPlayer[id] = { id, name: name ?? id, titles:0, finals:0, wins:0, losses:0 };
            byPlayer[id][field] = (byPlayer[id][field] ?? 0) + val;
          };

          if (champId) addStat(champId, champName, 'titles');
          const finalistId = res._slim ? res.finalist?.id : (() => {
            const b = res.bracket; if (!b?.champion) return null;
            const fr = b.rounds[b.rounds.length-1]?.[0]; if (!fr) return null;
            return (fr.playerA?.id === b.champion.id ? fr.playerB : fr.playerA)?.id;
          })();
          const finalistName = res._slim ? res.finalist?.name : (() => {
            const b = res.bracket; if (!b?.champion) return null;
            const fr = b.rounds[b.rounds.length-1]?.[0]; if (!fr) return null;
            return (fr.playerA?.id === b.champion.id ? fr.playerB : fr.playerA)?.name;
          })();
          if (finalistId && finalistId !== champId) addStat(finalistId, finalistName, 'finals');

          for (const m of matches) {
            if (m.w) { const p = playerMap[m.w]; addStat(m.w, p?.name, 'wins'); }
            if (m.l) { const p = playerMap[m.l]; addStat(m.l, p?.name, 'losses'); }
          }
        }

        const players = Object.values(byPlayer);
        const mostTitles  = [...players].sort((a,b) => b.titles  - a.titles  || b.wins - a.wins).slice(0,5);
        const mostFinals  = [...players].sort((a,b) => (b.titles+b.finals) - (a.titles+a.finals)).slice(0,5);
        const mostWins    = [...players].sort((a,b) => b.wins    - a.wins).slice(0,5);
        const bestWinPct  = [...players].filter(p => p.wins+p.losses >= 3).sort((a,b) => {
          const pa = a.wins/(a.wins+a.losses); const pb = b.wins/(b.wins+b.losses);
          return pb - pa;
        }).slice(0,5);

        const Section = ({ title, icon, rows, cols, getRow }) => (
          <div style={{ marginBottom:32 }}>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12, paddingBottom:8, borderBottom:`1px solid ${sc.main}22` }}>
              <span style={{ fontSize:18 }}>{icon}</span>
              <span style={{ fontFamily:"'Space Mono',monospace", fontSize:8, letterSpacing:'.35em', color:sc.light, textTransform:'uppercase' }}>{title}</span>
            </div>
            {rows.length === 0 ? (
              <div style={{ fontFamily:"'Space Mono',monospace", fontSize:8, color:'rgba(255,255,255,.2)', letterSpacing:'.2em' }}>DADOS INSUFICIENTES</div>
            ) : rows.map((p, i) => {
              const vals = getRow(p);
              return (
                <div key={p.id ?? i} style={{
                  display:'flex', alignItems:'center', gap:14, padding:'10px 14px',
                  background: i===0 ? `${sc.main}12` : 'rgba(255,255,255,.02)',
                  borderLeft: i===0 ? `3px solid ${T.gold}` : '3px solid transparent',
                  marginBottom:2,
                }}>
                  <span style={{ fontFamily:"'Space Mono',monospace", fontSize:11, fontWeight:700, color: i===0 ? T.gold : 'rgba(255,255,255,.3)', minWidth:20 }}>#{i+1}</span>
                  <span style={{ fontFamily:"'Barlow Condensed','Oswald',sans-serif", fontSize:17, fontWeight:700, textTransform:'uppercase', color: i===0 ? '#fff' : 'rgba(255,255,255,.75)', flex:1 }}>{p.name}</span>
                  {vals.map((v, vi) => (
                    <span key={vi} style={{ fontFamily:"'Space Mono',monospace", fontSize:13, fontWeight:700, color: vi===0 ? sc.light : 'rgba(255,255,255,.4)', minWidth:40, textAlign:'right' }}>{v}</span>
                  ))}
                </div>
              );
            })}
          </div>
        );

        return (
          <div style={{ flex:1, overflow:'auto', padding:'32px 36px 80px' }}>
            <div style={{ fontFamily:"'Space Mono',monospace", fontSize:8, letterSpacing:'.4em', color:`${sc.main}88`, textTransform:'uppercase', marginBottom:28 }}>
              RECORDES · {tournament.name}
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:32 }}>
              <div>
                <Section title="Mais Títulos" icon="🏆" rows={mostTitles} getRow={p => [`${p.titles} TÍT`]} />
                <Section title="Mais Vitórias" icon="⚔️" rows={mostWins} getRow={p => [`${p.wins}V ${p.losses}D`]} />
              </div>
              <div>
                <Section title="Mais Finais" icon="🥈" rows={mostFinals} getRow={p => [`${p.titles+p.finals} FIN`, `${p.titles} TÍT`]} />
                <Section title="Melhor Aproveitamento" icon="📊" rows={bestWinPct} getRow={p => [`${Math.round(p.wins/(p.wins+p.losses)*100)}%`, `${p.wins}V`]} />
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Bottom accent line ───────────────────────────────────────── */}
      <div style={{
        position:'fixed', bottom:0, left:0, right:0, height:2, zIndex:30,
        background:`linear-gradient(90deg,transparent,${sc.main} 25%,${T.gold} 50%,${sc.main} 75%,transparent)`,
        boxShadow:`0 0 20px ${sc.main}55`,
        pointerEvents:'none',
      }} />

      {/* ── HEADLESS OVERLAY ─────────────────────────────────────────── */}
      {overlayMode && (
        <HeadlessOverlay
          tournament={tournament}
          simEvent={overlayEvent}
          simFeed={overlayFeed}
          simProgress={overlayProgress}
          simTotal={overlayTotal || Math.max(overlayProgress + 1, 1)}
        />
      )}

      {/* ── MATCH RÉSUMÉ MODAL ───────────────────────────────────────── */}
      {resumeMatch && (
        <MatchResumeModal
          match={resumeMatch}
          surface={tournament.surface ?? 'HARD'}
          roundLabel={resumeRoundLabel}
          onClose={() => { setResumeMatch(null); setResumeRoundLabel(null); }}
          historicalTournamentResults={historicalTournamentResults}
          currentYear={currentYear}
          tournament={tournament}
        />
      )}
    </div>
  );
}
