// 🌀 BROADCAST HUB — UNIVERSE EDITION (REVAMPED)
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Calendar, Trophy, Users, Play, TrendingUp, Award, Star, Zap, ChevronRight, BarChart3, Swords, Radio } from 'lucide-react';
import { TEAMS } from './data.js';
import { CALENDAR_STRUCTURE } from './CalendarConfig.js';
import { LAUNCH_TECHNIQUES } from './UniverseManager.js';
import PlayerImage from './PlayerImage.jsx';
import { runHeadlessMD3, runHeadlessMD3Sync } from './HeadlessBattle.js';
import WarRoomOverlay from './WarRoomOverlay.jsx';
import RecordsView from './RecordsView.jsx';
import ChronicleView from './ChronicleView.jsx';
import { useWarRoomData } from './WarRoomDataCollector.jsx';
import { AnalyticsTab } from './AnalyticsTab.jsx';
import { RisingStarsView, EnhancedCalendarView } from './BroadcastHub_UI_Additions.jsx';
import SeasonAwardsCeremony from './SeasonAwardsCeremony.jsx';
import { resolveArenaPicks, isTournamentEligibleForPick } from './ArenaPick.js';

// ============================================
// STYLES
// ============================================
const HUB_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Black+Ops+One&family=Rajdhani:wght@400;600;700&family=Orbitron:wght@400;700;900&display=swap');

  @keyframes hub-scan    { 0%{transform:translateY(-100%)} 100%{transform:translateY(100vh)} }
  @keyframes hub-pulse   { 0%,100%{opacity:.5;transform:scale(1)} 50%{opacity:1;transform:scale(1.06)} }
  @keyframes hub-spin    { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
  @keyframes hub-blink   { 0%,100%{opacity:1} 50%{opacity:.3} }
  @keyframes hub-entry   { 0%{opacity:0;transform:translateY(10px)} 100%{opacity:1;transform:translateY(0)} }
  @keyframes hub-glow    { 0%,100%{box-shadow:0 0 20px rgba(255,215,0,.25)} 50%{box-shadow:0 0 40px rgba(255,215,0,.55)} }
  @keyframes hub-shimmer { 0%{transform:translateX(-100%)} 100%{transform:translateX(100%)} }
  
  /* ✨ ANIMAÇÕES PREMIUM PARA TORNEIOS ESPECIAIS ✨ */
  @keyframes premium-glow { 
    0%,100% { 
      box-shadow: 0 0 30px rgba(255,215,0,.3), 0 0 60px rgba(255,165,0,.2), inset 0 0 40px rgba(255,215,0,.05);
    } 
    50% { 
      box-shadow: 0 0 50px rgba(255,215,0,.6), 0 0 100px rgba(255,165,0,.4), inset 0 0 60px rgba(255,215,0,.1);
    } 
  }
  
  @keyframes premium-pulse { 
    0%,100% { transform: scale(1); } 
    50% { transform: scale(1.01); } 
  }
  
  @keyframes premium-float { 
    0%,100% { transform: translateY(0px); } 
    50% { transform: translateY(-5px); } 
  }
  
  @keyframes premium-shimmer {
    0% { background-position: -200% center; }
    100% { background-position: 200% center; }
  }
  
  @keyframes premium-border {
    0% { border-color: rgba(255,215,0,.6); box-shadow: 0 0 20px rgba(255,215,0,.3); }
    25% { border-color: rgba(255,165,0,.7); box-shadow: 0 0 30px rgba(255,165,0,.4); }
    50% { border-color: rgba(255,215,0,.8); box-shadow: 0 0 40px rgba(255,215,0,.5); }
    75% { border-color: rgba(255,140,0,.7); box-shadow: 0 0 30px rgba(255,140,0,.4); }
    100% { border-color: rgba(255,215,0,.6); box-shadow: 0 0 20px rgba(255,215,0,.3); }
  }
  
  @keyframes premium-rays {
    0% { transform: rotate(0deg) scale(1); opacity: .15; }
    50% { transform: rotate(180deg) scale(1.1); opacity: .25; }
    100% { transform: rotate(360deg) scale(1); opacity: .15; }
  }

  .hub-card {
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.08);
    clip-path: polygon(10px 0%, 100% 0%, calc(100% - 10px) 100%, 0% 100%);
    transition: border-color .2s ease;
  }
  .hub-card:hover { border-color: rgba(255,215,0,0.2); }
  
  /* ✨ ESTILO PREMIUM PARA TORNEIOS MASTERS E PREMIER ✨ */
  .tournament-premium {
    position: relative;
    background: linear-gradient(135deg, rgba(255,215,0,.08) 0%, rgba(255,165,0,.05) 50%, rgba(255,140,0,.08) 100%);
    border: 2px solid rgba(255,215,0,.6);
    animation: premium-glow 4s ease-in-out infinite, premium-pulse 6s ease-in-out infinite;
    overflow: hidden;
  }
  
  /* Raios de luz rotativos */
  .tournament-premium::before {
    content: '';
    position: absolute;
    inset: -100%;
    background: conic-gradient(
      transparent 0deg,
      rgba(255,215,0,.15) 45deg,
      transparent 90deg,
      transparent 180deg,
      rgba(255,165,0,.1) 225deg,
      transparent 270deg
    );
    animation: premium-rays 12s linear infinite;
    pointer-events: none;
    z-index: 0;
  }
  
  /* Shimmer effect */
  .tournament-premium::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(
      90deg,
      transparent 0%,
      rgba(255,255,255,.1) 45%,
      rgba(255,255,255,.2) 50%,
      rgba(255,255,255,.1) 55%,
      transparent 100%
    );
    background-size: 200% 100%;
    animation: premium-shimmer 3s linear infinite;
    pointer-events: none;
    z-index: 1;
  }
  
  /* Conteúdo do torneio premium fica acima dos efeitos */
  .tournament-premium > * {
    position: relative;
    z-index: 2;
  }
  
  /* Badge premium especial */
  .premium-badge-glow {
    animation: premium-pulse 3s ease-in-out infinite;
    text-shadow: 0 0 10px rgba(255,215,0,.8), 0 0 20px rgba(255,165,0,.6);
  }

  .hub-tab {
    font-family: 'Orbitron', monospace;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: .2em;
    padding: 14px 20px;
    border: none;
    background: transparent;
    color: rgba(255,255,255,.3);
    cursor: pointer;
    position: relative;
    transition: color .15s ease;
    white-space: nowrap;
  }
  .hub-tab:hover { color: rgba(255,255,255,.65); }
  .hub-tab.active { color: #ffd700; }
  .hub-tab.active::after {
    content: '';
    position: absolute;
    bottom: 0; left: 0; right: 0;
    height: 2px;
    background: linear-gradient(90deg, transparent, #ffd700, transparent);
    box-shadow: 0 0 8px rgba(255,215,0,0.6);
  }

  .rank-row {
    display: flex; align-items: center; gap: 10px;
    padding: 8px 12px;
    clip-path: polygon(6px 0%, 100% 0%, calc(100% - 6px) 100%, 0% 100%);
    border: 1px solid rgba(255,255,255,0.06);
    background: rgba(255,255,255,0.02);
    cursor: pointer;
    transition: all .15s ease;
  }
  .rank-row:hover { background: rgba(255,255,255,0.05); border-color: rgba(255,215,0,0.2); transform: translateX(2px); }

  .month-card {
    clip-path: polygon(8px 0%, 100% 0%, calc(100% - 8px) 100%, 0% 100%);
    border: 1px solid rgba(255,255,255,0.07);
    background: rgba(255,255,255,0.03);
    cursor: pointer;
    transition: all .18s cubic-bezier(.22,1,.36,1);
    padding: 14px 12px;
    display: flex; flex-direction: column; gap: 5px;
  }
  .month-card:hover { transform: translateY(-3px); border-color: rgba(255,215,0,0.3); }
  .month-card.current { border-color: rgba(255,215,0,0.5); background: rgba(255,215,0,0.07); animation: hub-glow 3s ease-in-out infinite; }
  .month-card.past { opacity: 0.4; }

  .tier-gs { color: #ffd700; border-color: rgba(255,215,0,0.5); }
  .tier-m  { color: #c084fc; border-color: rgba(192,132,252,0.5); }
  .tier-ch { color: #60a5fa; border-color: rgba(96,165,250,0.5); }
  .tier-sp { color: #34d399; border-color: rgba(52,211,153,0.5); }
  .tier-fi { color: #f87171; border-color: rgba(248,113,113,0.5); }
  .tier-ro { color: #94a3b8; border-color: rgba(148,163,184,0.5); }
  .tier-inv { color: #fde68a; border-color: rgba(253,230,138,0.5); }
  .tier-opn { color: #86efac; border-color: rgba(134,239,172,0.5); }

  .tier-badge {
    font-family: 'Orbitron', monospace;
    font-size: 8px; font-weight: 700; letter-spacing: .15em;
    padding: 2px 8px; border: 1px solid;
    clip-path: polygon(4px 0%, 100% 0%, calc(100% - 4px) 100%, 0% 100%);
  }

  .action-btn {
    font-family: 'Orbitron', monospace; font-size: 10px; font-weight: 700; letter-spacing: .12em;
    padding: 14px 12px; border: 1px solid; cursor: pointer;
    clip-path: polygon(8px 0%, 100% 0%, calc(100% - 8px) 100%, 0% 100%);
    transition: all .18s ease; position: relative; overflow: hidden;
    display: flex; flex-direction: column; align-items: center; gap: 4px;
  }
  .action-btn::before {
    content: ''; position: absolute; inset: 0;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent);
    transform: translateX(-100%); transition: transform .4s ease;
  }
  .action-btn:hover::before { transform: translateX(100%); }
  .action-btn:hover { transform: translateY(-2px); }

  .btn-gold   { background: linear-gradient(135deg,rgba(255,215,0,.12),rgba(255,100,0,.08)); border-color: rgba(255,215,0,.5);  color: #ffd700; box-shadow: 0 0 20px rgba(255,215,0,.15); }
  .btn-gold:hover   { box-shadow: 0 0 32px rgba(255,215,0,.3);   border-color: rgba(255,215,0,.8); }
  .btn-premium { 
    background: linear-gradient(135deg,rgba(255,215,0,.2),rgba(255,165,0,.15),rgba(255,215,0,.2)); 
    border: 2px solid rgba(255,215,0,.7);
    color: #ffd700; 
    box-shadow: 0 0 30px rgba(255,215,0,.3), 0 0 60px rgba(255,165,0,.2), inset 0 0 20px rgba(255,215,0,.1);
    position: relative;
    overflow: hidden;
  }
  .btn-premium::before {
    background: linear-gradient(90deg, transparent, rgba(255,255,255,.2), transparent);
  }
  .btn-premium:hover { 
    box-shadow: 0 0 40px rgba(255,215,0,.5), 0 0 80px rgba(255,165,0,.3), inset 0 0 30px rgba(255,215,0,.15);
    border-color: rgba(255,215,0,1);
    transform: translateY(-3px) scale(1.01);
  }
  .btn-cyan   { background: linear-gradient(135deg,rgba(0,212,255,.1),rgba(123,47,255,.06)); border-color: rgba(0,212,255,.4); color: #00d4ff; box-shadow: 0 0 16px rgba(0,212,255,.12); }
  .btn-cyan:hover   { box-shadow: 0 0 28px rgba(0,212,255,.25);  border-color: rgba(0,212,255,.7); }
  .btn-orange { background: linear-gradient(135deg,rgba(255,100,0,.1),rgba(239,68,68,.06));  border-color: rgba(255,100,0,.4); color: #ff6400; box-shadow: 0 0 16px rgba(255,100,0,.12); }
  .btn-orange:hover { box-shadow: 0 0 28px rgba(255,100,0,.25);  border-color: rgba(255,100,0,.7); }

  .sim-btn {
    font-family: 'Orbitron', monospace; font-size: 10px; font-weight: 700; letter-spacing: .14em;
    padding: 9px 20px;
    clip-path: polygon(7px 0%, 100% 0%, calc(100% - 7px) 100%, 0% 100%);
    border: 1px solid rgba(255,215,0,.5);
    background: linear-gradient(135deg,rgba(255,215,0,.12),rgba(255,80,0,.08));
    color: #ffd700; cursor: pointer; transition: all .18s ease;
  }
  .sim-btn:hover:not(:disabled) { box-shadow: 0 0 24px rgba(255,215,0,.3); border-color: rgba(255,215,0,.8); }
  .sim-btn:disabled { opacity: .5; cursor: not-allowed; }

  .hub-back-btn {
    font-family: 'Rajdhani', sans-serif; font-weight: 700; font-size: 13px; letter-spacing: .14em;
    padding: 8px 20px; border: 1px solid rgba(255,255,255,.18); background: rgba(255,255,255,.05);
    color: rgba(255,255,255,.6); cursor: pointer; transition: all .15s ease;
    clip-path: polygon(6px 0%, 100% 0%, calc(100% - 6px) 100%, 0% 100%);
  }
  .hub-back-btn:hover { border-color: rgba(255,215,0,.5); color: #ffd700; background: rgba(255,215,0,.08); }

  .sim-progress-bar { height: 3px; background: rgba(255,255,255,.06); overflow: hidden; }
  .sim-progress-fill { height: 100%; background: linear-gradient(to right,#ffd700,#ff8c00); transition: width .15s ease; }

  .tourn-row {
    display: flex; align-items: center; gap: 12px; padding: 10px 14px;
    border: 1px solid rgba(255,255,255,0.06); background: rgba(255,255,255,0.02);
    clip-path: polygon(6px 0%, 100% 0%, calc(100% - 6px) 100%, 0% 100%);
    transition: all .15s ease;
  }
  .tourn-row:hover { background: rgba(255,255,255,0.05); border-color: rgba(255,215,0,0.18); }

  .top4-card {
    clip-path: polygon(10px 0%, 100% 0%, calc(100% - 10px) 100%, 0% 100%);
    border: 1px solid rgba(255,255,255,0.08); background: rgba(255,255,255,0.03);
    padding: 16px 12px; display: flex; flex-direction: column; align-items: center; gap: 8px;
    cursor: pointer; transition: all .18s cubic-bezier(.22,1,.36,1); text-align: center;
  }
  .top4-card:hover { transform: translateY(-4px) scale(1.02); }

  .hub-section-label {
    font-family: 'Orbitron', monospace; font-size: 9px; font-weight: 700;
    letter-spacing: .3em; color: rgba(255,215,0,.5); text-transform: uppercase; margin-bottom: 12px;
  }

  .hub-scroll::-webkit-scrollbar { width: 4px; }
  .hub-scroll::-webkit-scrollbar-track { background: rgba(255,255,255,.02); }
  .hub-scroll::-webkit-scrollbar-thumb { background: rgba(255,215,0,.2); border-radius: 2px; }
`;

// ============================================
// HELPERS
// ============================================
const getMonthName = (m) => ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'][m - 1];

const tierMeta = {
  PC: { label:'PREMIER',       cls:'tier-gs', color:'#ffd700', pts:'2000' }, // Premier Championship (antigo GS)
  GS: { label:'PREMIER',       cls:'tier-gs', color:'#ffd700', pts:'2000' }, // Compatibilidade
  EM: { label:'ELITE MASTERS', cls:'tier-m',  color:'#c084fc', pts:'1000' }, // Elite Masters
  M:  { label:'ELITE MASTERS', cls:'tier-m',  color:'#c084fc', pts:'1000' }, // Compatibilidade
  RS: { label:'RISING STAR',   cls:'tier-ch', color:'#60a5fa', pts:'500'  }, // Rising Star Series
  RC: { label:'REGIONAL',      cls:'tier-ro', color:'#94a3b8', pts:'250'  }, // Regional Circuit
  RO: { label:'REGIONAL',      cls:'tier-ro', color:'#94a3b8', pts:'250'  }, // Compatibilidade
  CH: { label:'CHAMPIONSHIP',  cls:'tier-ch', color:'#60a5fa', pts:'1500' }, // Championship
  SP: { label:'SPECIAL',       cls:'tier-sp', color:'#34d399', pts:'400'  }, // Special Events
  FI: { label:'GRAND FINALS',  cls:'tier-fi', color:'#f87171', pts:'1500' }, // Grand Finals
  INV:{ label:'SIGNATURE CLASH', cls:'tier-inv',color:'#fde68a', pts:'1500' }, // New Year's Signature Clash
  OPN:{ label:'OPEN',          cls:'tier-opn',color:'#86efac', pts:'750'  }, // Crossover Open
};

// ============================================
// HELPERS DE SIMULAÇÃO
// ============================================
const ROUNDS_ORDER = ['R64', 'R32', 'R16', 'QF', 'SF', 'F'];

// Delay por partida (ms) — usado apenas no modo WarRoom (torneio único com visual)
const ROUND_MATCH_DELAY = { R64: 4, R32: 4, R16: 4, QF: 6, SF: 8, F: 10 };
// Delay entre fases (transição de round) — apenas modo WarRoom
const ROUND_PHASE_DELAY = { R64: 8, R32: 10, R16: 12, QF: 15, SF: 20, F: 0 };
// No modo turbo (season sim), yield ao browser a cada N partidas — sem sleep, apenas macrotask break
const TURBO_YIELD_EVERY = 50; // yield a cada 50 partidas — browser responsivo sem overhead excessivo de Promise

const getRoundNamePT = (round) => {
  const names = { R64:'Rodada de 64', R32:'Rodada de 32', R16:'Oitavas', QF:'Quartas', SF:'Semis', F:'Final', ROUND_ROBIN:'Liga' };
  return names[round] || round;
};

const runTournamentHeadless = async (universeManager, warRoom, stopRef, labelPrefix, turbo = false) => {
  const tournament = universeManager.getCurrentTournament();
  const matchFormat = tournament?.matchFormat || 'MD3';
  const winsNeeded = matchFormat === 'MD1' ? 1 : matchFormat === 'MD5' ? 3 : matchFormat === 'MD7' ? 4 : 2;

  const startRound = universeManager.currentRound;

  // ── Helper: monta o context de traits para um match ──
  const buildMatchContext = (p1, p2, round, tourn) => {
    try {
      const um = universeManager;
      const tid = tourn?.tier || '';

      // Forma dos jogadores
      const getFormaName = (id) => {
        try { return um.formManager?.getTracker(id)?.getFormaState()?.name || 'NEUTRAL'; } catch(e) { return 'NEUTRAL'; }
      };

      // H2H via RivalrySystem
      const getH2HAdv = (idA, idB) => {
        try {
          const enc = um.rivalrySystem?.getEncounters(idA, idB);
          if (!enc) return 0;
          const riv = um.rivalrySystem?.getRivalry(idA, idB);
          if (!riv) return 0;
          // p1Wins é sempre do menor ID na key — ajustar perspectiva
          const key = um.rivalrySystem._key ? um.rivalrySystem._key(idA, idB) : null;
          const isP1 = key && key.startsWith(String(idA));
          return isP1 ? (riv.p1Wins - riv.p2Wins) : (riv.p2Wins - riv.p1Wins);
        } catch(e) { return 0; }
      };

      // ⚡ H2H last result: O(1) via índice em vez de O(n) filter em matchHistory
      const getLastLostVsOpp = (idA, idB) => {
        try {
          const lastWinner = um._h2hLastResult?.get(`${idA}|${idB}`);
          if (lastWinner === undefined) return false;
          return lastWinner !== idA;
        } catch(e) { return false; }
      };

      // ⚡ TourneyWins: O(1) via cache incremental em vez de iterar bracket
      const getTourneyWins = (id) => {
        try { return um._tourneyWinsCache?.get(id) || 0; } catch(e) { return 0; }
      };

      return {
        tournamentStage: round,
        tournamentTier: tid,
        team1FormaName: getFormaName(p1.id),
        team2FormaName: getFormaName(p2.id),
        team1H2HAdv: getH2HAdv(p1.id, p2.id),
        team2H2HAdv: getH2HAdv(p2.id, p1.id),
        team1LastLostVsOpp: getLastLostVsOpp(p1.id, p2.id),
        team2LastLostVsOpp: getLastLostVsOpp(p2.id, p1.id),
        team1TourneyWins: getTourneyWins(p1.id),
        team2TourneyWins: getTourneyWins(p2.id),
      };
    } catch(e) {
      return { tournamentStage: round, tournamentTier: '' };
    }
  };

  // ===== ROUND ROBIN (Kings Court / Rising Finals) =====
  if (startRound === 'ROUND_ROBIN') {
    const matches = universeManager.currentBracket?.ROUND_ROBIN || [];
    const pending = matches.filter(m => !m.winner);

    warRoom.startPhase(labelPrefix ? `${labelPrefix} — Liga` : 'SIMULANDO LIGA', pending.length);

    let _rrMatchCount = 0;
    for (const match of pending) {
      if (stopRef.current) return null;
      const p1 = match.player1;
      const p2 = match.player2;

      if (!p1 || !p2 || !p1.deck || !p2.deck) {
        universeManager.recordMatchWinner(match.matchId, p1?.id, {});
        warRoom.recordMatch({ winner: { name: p1?.name || '?' }, loser: { name: p2?.name || '?' }, score: 'W/O' });
        continue;
      }

      warRoom.startMatch({ player1: p1.name, player2: p2.name });
      const maxRounds = winsNeeded * 2 - 1;

      // Kings Court ROUND_ROBIN NÃO tem pick de arena (muito volume de partidas)
      const arenaOrder = Array.from({ length: maxRounds }, (_, i) => universeManager._pickArena('ROUND_ROBIN', i));

      const ctx = buildMatchContext(p1, p2, 'ROUND_ROBIN', tournament);
      const result = await runHeadlessMD3({ ...p1, id: p1.id }, { ...p2, id: p2.id }, arenaOrder, matchFormat, null, ctx);
      const winnerId = result.winner?.id ?? (result.score.team1 > result.score.team2 ? p1.id : p2.id);
      const winnerObj = winnerId === p1.id ? p1 : p2;
      const loserObj  = winnerId === p1.id ? p2 : p1;

      const matchDetails = {
        score: { playerA: result.score.team1, playerB: result.score.team2 },
        rounds: result.rounds.map(r => ({ winner: r.winner === 'team1' ? p1.id : r.winner === 'team2' ? p2.id : null, method: r.method || 'SPIN_FINISH', bey1: r.bey1, bey2: r.bey2, launch1: r.launch1, launch2: r.launch2 })),
        format: matchFormat, duration: 0, awards: []
      };

      universeManager.recordMatchWinner(match.matchId, winnerId, matchDetails);
      warRoom.recordMatch({ winner: { name: winnerObj.name }, loser: { name: loserObj.name }, score: `${result.score.team1}-${result.score.team2}`, rounds: result.rounds, isUpset: false, isPerfect: false });

      // Turbo: yield ao browser a cada N partidas (macrotask break sem sleep artificial)
      // Normal (WarRoom): sem delay no Round Robin (volume muito alto)
      _rrMatchCount++;
      if (turbo && _rrMatchCount % TURBO_YIELD_EVERY === 0) {
        await new Promise(r => setTimeout(r, 0));
      }
    }

    warRoom.endPhase();
    const completed = universeManager.completeRoundRobin();
    return completed;
  }

  // ===== KNOCKOUT NORMAL =====
  const startIdx = ROUNDS_ORDER.indexOf(startRound);
  if (startIdx === -1) return null;
  const roundsToProcess = ROUNDS_ORDER.slice(startIdx);

  let _koMatchCount = 0;
  for (const round of roundsToProcess) {
    if (stopRef.current) return null;
    if (!universeManager.currentBracket?.[round]) break;

    const matches = universeManager.currentBracket[round].filter(m => !m.winner);
    if (matches.length === 0) {
      if (round !== 'F') universeManager.advanceRound();
      continue;
    }

    const phaseName = labelPrefix
      ? `${labelPrefix} — ${getRoundNamePT(round)}`
      : `SIMULANDO ${getRoundNamePT(round).toUpperCase()}`;
    warRoom.startPhase(phaseName, matches.length);

    for (const match of matches) {
      if (stopRef.current) return null;
      const p1 = match.player1;
      const p2 = match.player2;
      if (!p1 || !p2 || !p1.deck || !p2.deck) {
        universeManager.recordMatchWinner(match.matchId, p1?.id, {});
        warRoom.recordMatch({ winner: { name: p1?.name || '?' }, loser: { name: p2?.name || '?' }, score: 'W/O' });
        continue;
      }

      warRoom.startMatch({ player1: p1.name, player2: p2.name });

      const maxRounds = winsNeeded * 2 - 1;

      // ─── Arena Pick System (Premier & Kings Court) — silencioso ───
      let arenaOrder;
      if (isTournamentEligibleForPick(tournament)) {
        const rankings = universeManager.getBBPRanking();
        const p1Rank = rankings.findIndex(r => r.playerId === p1.id) + 1 || 999;
        const p2Rank = rankings.findIndex(r => r.playerId === p2.id) + 1 || 999;
        const higher = p1Rank <= p2Rank ? p1 : p2;
        const lower  = p1Rank <= p2Rank ? p2 : p1;
        const pickResult = resolveArenaPicks(higher, lower, matchFormat);
        arenaOrder = pickResult.arenas;
      } else {
        arenaOrder = Array.from({ length: maxRounds }, (_, i) =>
          universeManager._pickArena(round, i)
        );
      }

      const ctx = buildMatchContext(p1, p2, round, tournament);
      const result = await runHeadlessMD3(
        { ...p1, id: p1.id },
        { ...p2, id: p2.id },
        arenaOrder,
        matchFormat,
        null,
        ctx
      );

      const winnerId = result.winner?.id ?? (result.score.team1 > result.score.team2 ? p1.id : p2.id);
      const winnerObj = winnerId === p1.id ? p1 : p2;
      const loserObj  = winnerId === p1.id ? p2 : p1;

      const matchDetails = {
        score: { playerA: result.score.team1, playerB: result.score.team2 },
        rounds: result.rounds.map(r => ({
          winner: r.winner === 'team1' ? p1.id : r.winner === 'team2' ? p2.id : null,
          winnerName: r.winnerBey?.name || '',
          method: r.method || 'SPIN_FINISH',
          bey1: r.bey1,
          bey2: r.bey2,
          launch1: r.launch1,
          launch2: r.launch2
        })),
        format: matchFormat,
        duration: 0,
        awards: result.rounds.flatMap(r => r.replayData?.awards || [])
      };

      universeManager.recordMatchWinner(match.matchId, winnerId, matchDetails);

      // Em turbo warRoom é NOOP — skip upset detection e recordMatch
      if (!turbo) {
        const rankings = universeManager.getBBPRanking();
        const p1Rank = rankings.findIndex(r => r.playerId === p1.id) + 1;
        const p2Rank = rankings.findIndex(r => r.playerId === p2.id) + 1;
        const rankDiff = Math.abs(p1Rank - p2Rank);
        const isUpset = rankDiff >= 15 && (
          (winnerId === p1.id && p1Rank > p2Rank) ||
          (winnerId === p2.id && p2Rank > p1Rank)
        );
        warRoom.recordMatch({
          winner: { name: winnerObj.name },
          loser:  { name: loserObj.name  },
          score:  `${result.score.team1}-${result.score.team2}`,
          rounds: result.rounds,
          isUpset,
          isPerfect: false
        });
      }

      // Turbo: yield a cada N partidas (macrotask break — deixa o browser respirar sem sleep artificial)
      // Normal (WarRoom): delay real por partida para o overlay animar suavemente
      _koMatchCount++;
      if (turbo) {
        if (_koMatchCount % TURBO_YIELD_EVERY === 0) await new Promise(r => setTimeout(r, 0));
      } else {
        const matchDelay = ROUND_MATCH_DELAY[round] ?? 15;
        if (matchDelay > 0) await new Promise(r => setTimeout(r, matchDelay));
      }
    }

    warRoom.endPhase();

    if (round === 'F') {
      const completed = universeManager.advanceRound();
      return completed;
    } else {
      universeManager.advanceRound();
      // Turbo: sem delay entre fases — Normal: delay para transição visual
      if (!turbo) {
        const phaseDelay = ROUND_PHASE_DELAY[round] ?? 30;
        if (phaseDelay > 0) await new Promise(r => setTimeout(r, phaseDelay));
      }
    }
  }
  return null;
};

// ============================================
// TURBO: SIMULAÇÃO SÍNCRONA (sem WarRoom, sem delays, sem re-renders por partida)
// 100% FIEL ao runTournamentHeadless: arena pick, buildMatchContext, traits completos.
// Único trade-off: sem dados de WarRoom (upset detection, labels de fase).
// ============================================
const runTournamentSync = (universeManager, stopRef) => {
  const tournament = universeManager.getCurrentTournament();
  if (!tournament) return null;

  const matchFormat = tournament.matchFormat || 'MD3';
  const winsNeeded  = matchFormat === 'MD5' ? 3 : matchFormat === 'MD7' ? 4 : 2;
  const startRound  = universeManager.currentRound;

  // Idêntico ao buildMatchContext de runTournamentHeadless
  const buildCtx = (p1, p2, round) => {
    try {
      const um = universeManager;
      const tid = tournament.tier || '';

      // Forma: O(1) lookup via FormManager tracker
      const getFormaName = (id) => { try { return um.formManager?.getTracker(id)?.getFormaState()?.name || 'NEUTRAL'; } catch(e) { return 'NEUTRAL'; } };

      // H2H: O(1) via RivalrySystem map
      const getH2HAdv = (idA, idB) => {
        try {
          const riv = um.rivalrySystem?.getRivalry(idA, idB);
          if (!riv) return 0;
          const key = um.rivalrySystem._key ? um.rivalrySystem._key(idA, idB) : null;
          const isP1 = key && key.startsWith(String(idA));
          return isP1 ? (riv.p1Wins - riv.p2Wins) : (riv.p2Wins - riv.p1Wins);
        } catch(e) { return 0; }
      };

      // ⚡ H2H last result: O(1) via _h2hLastResult index em vez de O(n) filter em matchHistory
      const getLastLostVsOpp = (idA, idB) => {
        try {
          const lastWinner = um._h2hLastResult?.get(`${idA}|${idB}`);
          if (lastWinner === undefined) return false;
          return lastWinner !== idA; // idA perdeu o último?
        } catch(e) { return false; }
      };

      // ⚡ TourneyWins: O(1) via cache incremental em vez de iterar o bracket inteiro
      const getTourneyWins = (id) => {
        try { return um._tourneyWinsCache?.get(id) || 0; } catch(e) { return 0; }
      };

      return {
        tournamentStage: round,
        tournamentTier: tid,
        team1FormaName: getFormaName(p1.id),
        team2FormaName: getFormaName(p2.id),
        team1H2HAdv: getH2HAdv(p1.id, p2.id),
        team2H2HAdv: getH2HAdv(p2.id, p1.id),
        team1LastLostVsOpp: getLastLostVsOpp(p1.id, p2.id),
        team2LastLostVsOpp: getLastLostVsOpp(p2.id, p1.id),
        team1TourneyWins: getTourneyWins(p1.id),
        team2TourneyWins: getTourneyWins(p2.id),
      };
    } catch(e) {
      return { tournamentStage: round, tournamentTier: '' };
    }
  };

  // Arena pick idêntico ao runTournamentHeadless
  const getArenaOrder = (p1, p2, round) => {
    const maxRounds = winsNeeded * 2 - 1;
    if (isTournamentEligibleForPick(tournament)) {
      const rankings = universeManager.getBBPRanking();
      const p1Rank = rankings.findIndex(r => r.playerId === p1.id) + 1 || 999;
      const p2Rank = rankings.findIndex(r => r.playerId === p2.id) + 1 || 999;
      const higher = p1Rank <= p2Rank ? p1 : p2;
      const lower  = p1Rank <= p2Rank ? p2 : p1;
      return resolveArenaPicks(higher, lower, matchFormat).arenas;
    }
    return Array.from({ length: maxRounds }, (_, i) => universeManager._pickArena(round, i));
  };

  const runMatch = (p1, p2, round) => {
    const arenaOrder = getArenaOrder(p1, p2, round);
    const ctx = buildCtx(p1, p2, round);
    const result = runHeadlessMD3Sync({ ...p1, id: p1.id }, { ...p2, id: p2.id }, arenaOrder, matchFormat, ctx);
    if (!result) return null;
    const winnerId = result.winner?.id ?? (result.score.team1 > result.score.team2 ? p1.id : p2.id);
    return {
      winnerId,
      matchDetails: {
        score: { playerA: result.score.team1, playerB: result.score.team2 },
        rounds: result.rounds.map(r => ({
          winner: r.winner === 'team1' ? p1.id : r.winner === 'team2' ? p2.id : null,
          method: r.method || 'SPIN_FINISH',
          bey1: r.bey1, bey2: r.bey2, launch1: r.launch1, launch2: r.launch2
        })),
        format: matchFormat, duration: 0, awards: []
      }
    };
  };

  // ── ROUND ROBIN ──────────────────────────────────────────────────
  if (startRound === 'ROUND_ROBIN') {
    const matches = (universeManager.currentBracket?.ROUND_ROBIN || []).filter(m => !m.winner);
    for (const match of matches) {
      if (stopRef.current) return null;
      const p1 = match.player1, p2 = match.player2;
      if (!p1 || !p2 || !p1.deck || !p2.deck) { universeManager.recordMatchWinner(match.matchId, p1?.id, {}); continue; }
      const r = runMatch(p1, p2, 'ROUND_ROBIN');
      if (r) universeManager.recordMatchWinner(match.matchId, r.winnerId, r.matchDetails);
    }
    return universeManager.completeRoundRobin();
  }

  // ── KNOCKOUT ─────────────────────────────────────────────────────
  const startIdx = ROUNDS_ORDER.indexOf(startRound);
  if (startIdx === -1) return null;

  for (const round of ROUNDS_ORDER.slice(startIdx)) {
    if (stopRef.current) return null;
    if (!universeManager.currentBracket?.[round]) break;

    const matches = universeManager.currentBracket[round].filter(m => !m.winner);
    if (matches.length === 0) { if (round !== 'F') universeManager.advanceRound(); continue; }

    for (const match of matches) {
      if (stopRef.current) return null;
      const p1 = match.player1, p2 = match.player2;
      if (!p1 || !p2 || !p1.deck || !p2.deck) { universeManager.recordMatchWinner(match.matchId, p1?.id, {}); continue; }
      const r = runMatch(p1, p2, round);
      if (r) universeManager.recordMatchWinner(match.matchId, r.winnerId, r.matchDetails);
    }

    if (round === 'F') return universeManager.advanceRound();
    else universeManager.advanceRound();
  }
  return null;
};

// ============================================
// NOOP WAR ROOM — usado em simulações longas
// ============================================
const NOOP_WAR_ROOM = {
  isActive: false,
  phase: '',
  totalMatches: 0,
  completedMatches: 0,
  currentMatch: null,
  recentResults: [],
  stats: {},
  startPhase: () => {},
  startMatch: () => {},
  recordMatch: () => {},
  endPhase: () => {},
  reset: () => {},
};

// ============================================
// SIM PROGRESS OVERLAY — Barra de progresso leve
// ============================================
const MONTH_NAMES_FULL = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const TIER_COLORS = {
  PREMIER_CHAMPIONSHIP: '#ffd700',
  ELITE_MASTERS: '#60a5fa',
  RISING_STAR: '#34d399',
  REGIONAL_CIRCUIT: '#f472b6',
  SPECIAL: '#a78bfa',
};

// ─── Cores por tier para os quadrinhos ────────────────────────────────────────
const TIER_BOX_CONFIG = {
  KINGS_COURT:   { color: '#ffd700', glow: 'rgba(255,215,0,0.55)',   label: 'KINGS COURT',   emoji: '👑' },
  PREMIER:       { color: '#f43f5e', glow: 'rgba(244,63,94,0.50)',   label: 'PREMIER',       emoji: '⭐' },
  SIGNATURE_CLASH: { color: '#fde68a', glow: 'rgba(253,230,138,0.50)', label: 'SIGNATURE CLASH', emoji: '✍️' },
  INVITATIONAL:  { color: '#cd7f32', glow: 'rgba(205,127,50,0.50)',  label: 'INVITATIONAL',  emoji: '🎖️' }, // legado
  MASTERS:       { color: '#a855f7', glow: 'rgba(168,85,247,0.50)',  label: 'MASTERS',       emoji: '💎' },
  OPEN:          { color: '#06b6d4', glow: 'rgba(6,182,212,0.45)',   label: 'OPEN',          emoji: '🌐' },
  CHALLENGER:    { color: '#3b82f6', glow: 'rgba(59,130,246,0.45)', label: 'CHALLENGER',    emoji: '🔵' },
  REDEMPTION:    { color: '#10b981', glow: 'rgba(16,185,129,0.45)', label: 'REDEMPTION',    emoji: '🌿' },
  RISING_STAR:   { color: '#34d399', glow: 'rgba(52,211,153,0.40)', label: 'RISING STAR',   emoji: '🌱' },
  RISING_FINALS: { color: '#f97316', glow: 'rgba(249,115,22,0.50)', label: 'RISING FINALS', emoji: '🔥' },
};

const RANK_MEDAL_COLORS = ['#ffd700','#c0c0c0','#cd7f32','#60a5fa'];

const SimProgressOverlay = ({ data, onStop, universeManager, stopAtPremier, setStopAtPremier, stopAtKingsCourt, setStopAtKingsCourt }) => {
  const { month, year, tournamentName, tier, current, total, seasonCurrent, seasonTotal, mode } = data;
  const pct     = total > 0 ? Math.round((current / total) * 100) : 0;
  const tierCfg = TIER_BOX_CONFIG[tier] || TIER_BOX_CONFIG.MASTERS;
  const isMulti = mode === 'multiseason';

  // Flat list of all tournaments
  const allTournaments = React.useMemo(() => {
    const list = [];
    for (const m of (CALENDAR_STRUCTURE.months || [])) {
      for (let i = 0; i < (m.tournaments || []).length; i++) {
        list.push({ month: m.id, index: i, name: m.tournaments[i].name, tier: m.tournaments[i].tier });
      }
    }
    return list;
  }, []);

  const getChampion = (t) => {
    if (!universeManager) return null;
    const key = `${year}-${t.month}-${t.index}`;
    const rec = universeManager.tournamentHistory?.get(key);
    if (rec?.completed && rec.champion !== undefined) return TEAMS[rec.champion] || null;
    return null;
  };

  const top4 = React.useMemo(() => {
    if (!universeManager) return [];
    try {
      return universeManager.getBBPRanking().slice(0, 4).map(e => ({
        ...TEAMS[e.playerId], rank: e.rank, bbpPoints: e.points, playerId: e.playerId,
      }));
    } catch { return []; }
  }, [current, universeManager]);

  // Rows: 15, 15, remainder
  const row1 = allTournaments.slice(0, 15);
  const row2 = allTournaments.slice(15, 30);
  const row3 = allTournaments.slice(30);

  const TournamentBox = ({ t }) => {
    const cfg   = TIER_BOX_CONFIG[t.tier] || TIER_BOX_CONFIG.MASTERS;
    const champ = getChampion(t);
    return (
      <div title={`${t.name} (${cfg.label})`} style={{
        width: 72, height: 72, flexShrink: 0,
        border: `1.5px solid ${cfg.color}${champ ? 'cc' : '38'}`,
        borderRadius: 5,
        background: champ
          ? `radial-gradient(circle, ${cfg.color}14 0%, rgba(0,0,0,0.6) 100%)`
          : 'rgba(255,255,255,0.02)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden', position: 'relative',
        boxShadow: champ ? `0 0 8px ${cfg.glow}` : 'none',
      }}>
        {champ ? (
          <img src={champ.iconUrl || champ.photoUrl} alt="" style={{ width:'88%', height:'88%', objectFit:'cover', borderRadius:3 }} onError={e=>e.target.style.opacity=0} />
        ) : (
          <span style={{ fontSize:14, opacity:0.14 }}>{cfg.emoji}</span>
        )}
        {/* corner ticks */}
        <div style={{ position:'absolute', top:0, left:0, width:5, height:5,
          borderTop:`1.5px solid ${cfg.color}${champ?'aa':'28'}`, borderLeft:`1.5px solid ${cfg.color}${champ?'aa':'28'}`, borderRadius:'3px 0 0 0' }} />
        <div style={{ position:'absolute', bottom:0, right:0, width:5, height:5,
          borderBottom:`1.5px solid ${cfg.color}${champ?'aa':'28'}`, borderRight:`1.5px solid ${cfg.color}${champ?'aa':'28'}`, borderRadius:'0 0 3px 0' }} />
      </div>
    );
  };

  const TierRow = ({ row }) => (
    <div style={{ display:'flex', gap:5, justifyContent:'center' }}>
      {row.map((t, i) => <TournamentBox key={i} t={t} />)}
    </div>
  );

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.88)',
      backdropFilter: 'blur(12px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'Rajdhani', sans-serif",
    }}>
      {/* scanline */}
      <div style={{ position:'absolute', inset:0, pointerEvents:'none',
        background:'repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(255,255,255,0.008) 2px,rgba(255,255,255,0.008) 4px)' }} />

      {/* ── Central container ── */}
      <div style={{
        position: 'relative',
        display: 'flex', flexDirection: 'column', gap: 16,
        padding: '22px 28px 18px',
        maxWidth: 1170, width: '96vw',
        background: 'rgba(8,8,18,0.7)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 12,
        boxShadow: '0 8px 60px rgba(0,0,0,0.7)',
      }}>

        {/* ── GRID DE TORNEIOS ── */}
        <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
          <TierRow row={row1} />
          <TierRow row={row2} />
          {row3.length > 0 && <TierRow row={row3} />}
        </div>

        {/* ── DIVIDER ── */}
        <div style={{ height:1, background:'rgba(255,255,255,0.07)' }} />

        {/* ── INFO DO TORNEIO ATUAL ── */}
        <div style={{ textAlign:'center', display:'flex', flexDirection:'column', alignItems:'center', gap:6 }}>
          {/* Gear + Mês + Ano */}
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <span style={{ display:'inline-block', animation:'hub-spin 2s linear infinite', fontSize:16, color:'rgba(255,255,255,0.35)' }}>⚙</span>
            <span style={{ fontFamily:"'Orbitron',monospace", fontSize:26, fontWeight:900, color:'#fff', letterSpacing:'0.06em', lineHeight:1 }}>
              {MONTH_NAMES_FULL[(month||1)-1]?.toUpperCase() || '—'}
            </span>
            <span style={{ fontFamily:"'Orbitron',monospace", fontSize:13, fontWeight:700, color:'rgba(255,215,0,0.55)', letterSpacing:'0.18em' }}>
              {year}{isMulti && seasonTotal ? ` · TEMP ${seasonCurrent}/${seasonTotal===Infinity?'∞':seasonTotal}` : ''}
            </span>
          </div>

          {/* Torneio atual */}
          <div style={{ fontFamily:"'Orbitron',monospace", fontSize:12, color:tierCfg.color,
            letterSpacing:'0.13em', textTransform:'uppercase',
            textShadow:`0 0 14px ${tierCfg.color}88` }}>
            {tournamentName || '—'}
          </div>

          {/* Progress bar */}
          <div style={{ width:'340px', height:3, background:'rgba(255,255,255,0.08)', borderRadius:2, overflow:'hidden' }}>
            <div style={{ height:'100%', width:`${pct}%`, borderRadius:2, transition:'width 0.4s',
              background:`linear-gradient(90deg, ${tierCfg.color}77, ${tierCfg.color})`,
              boxShadow:`0 0 8px ${tierCfg.color}88` }} />
          </div>
          <div style={{ fontFamily:"'Orbitron',monospace", fontSize:9, color:'rgba(255,255,255,0.2)', letterSpacing:'0.18em' }}>
            TORNEIO {current}/{total} — {pct}%
          </div>
        </div>

        {/* ── DIVIDER ── */}
        <div style={{ height:1, background:'rgba(255,255,255,0.07)' }} />

        {/* ── TOP 4 RANKING ── */}
        <div>
          <div style={{ fontFamily:"'Orbitron',monospace", fontSize:8, color:'rgba(255,255,255,0.18)', letterSpacing:'0.22em', marginBottom:8, textAlign:'center' }}>
            ▶ TOP 4 RANKING — {year}
          </div>
          <div style={{ display:'flex', gap:10 }}>
            {top4.length === 0
              ? <div style={{ flex:1, textAlign:'center', color:'rgba(255,255,255,0.15)', fontFamily:"'Orbitron',monospace", fontSize:10, padding:'12px 0' }}>SEM DADOS</div>
              : top4.map((player, idx) => {
                const mc = RANK_MEDAL_COLORS[idx];
                return (
                  <div key={idx} style={{
                    flex:1, display:'flex', alignItems:'center', gap:10,
                    padding:'10px 14px', borderRadius:8,
                    border:`1.5px solid ${mc}35`,
                    background:`linear-gradient(135deg, ${mc}0a, rgba(0,0,0,0.4))`,
                    position:'relative', overflow:'hidden',
                    boxShadow: idx===0 ? `0 0 18px ${mc}33` : 'none',
                  }}>
                    {/* rank badge */}
                    <div style={{ fontFamily:"'Orbitron',monospace", fontSize:16, fontWeight:900,
                      color:mc, opacity:0.7, minWidth:22, textAlign:'center', lineHeight:1 }}>
                      #{idx+1}
                    </div>
                    {/* avatar */}
                    {(player?.iconUrl||player?.photoUrl)
                      ? <img src={player.iconUrl||player.photoUrl} alt="" onError={e=>e.target.style.opacity=0}
                          style={{ width:40, height:40, borderRadius:'50%', objectFit:'cover', border:`2px solid ${mc}77`, flexShrink:0 }} />
                      : <div style={{ width:40, height:40, borderRadius:'50%', background:`${mc}18`, border:`2px solid ${mc}44`,
                          display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontSize:16, color:mc }}>
                          {idx===0?'👑':idx===1?'⭐':idx===2?'🥉':'🔵'}
                        </div>
                    }
                    {/* name + pts */}
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontFamily:"'Orbitron',monospace", fontSize:9, color:'rgba(255,255,255,0.7)',
                        overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', letterSpacing:'0.05em' }}>
                        {player?.name?.split('"')?.[1] || player?.name || '—'}
                      </div>
                      <div style={{ fontFamily:"'Orbitron',monospace", fontSize:17, fontWeight:900, color:mc,
                        textShadow:`0 0 10px ${mc}88`, lineHeight:1.1, marginTop:2 }}>
                        {(player?.bbpPoints||0).toLocaleString()}
                        <span style={{ fontSize:8, color:`${mc}88`, letterSpacing:'0.15em', marginLeft:4 }}>PTS</span>
                      </div>
                    </div>
                    {/* corner */}
                    <div style={{ position:'absolute', top:0, left:0, width:10, height:10,
                      borderTop:`1.5px solid ${mc}66`, borderLeft:`1.5px solid ${mc}66`, borderRadius:'6px 0 0 0' }} />
                  </div>
                );
              })
            }
          </div>
        </div>

        {/* ── PAUSE-AT CHECKBOXES ── */}
        <div style={{ display:'flex', justifyContent:'center', gap:20, paddingTop:2 }}>
          {[
            { id:'premier',    label:'Parar em Premier',     color:'#f43f5e', checked: stopAtPremier,    setter: setStopAtPremier    },
            { id:'kingscourt', label:'Parar em Kings Court', color:'#ffd700', checked: stopAtKingsCourt, setter: setStopAtKingsCourt },
          ].map(({ id, label, color, checked, setter }) => (
            <label key={id} onClick={() => setter(v => !v)} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              cursor: 'pointer', userSelect: 'none',
              padding: '5px 14px',
              border: `1px solid ${checked ? color + '66' : 'rgba(255,255,255,0.1)'}`,
              borderRadius: 3,
              background: checked ? `${color}10` : 'transparent',
              transition: 'all .15s',
            }}>
              {/* Custom checkbox box */}
              <div style={{
                width: 13, height: 13, borderRadius: 2, flexShrink: 0,
                border: `1.5px solid ${checked ? color : 'rgba(255,255,255,0.25)'}`,
                background: checked ? `${color}33` : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all .15s',
              }}>
                {checked && <div style={{ width:7, height:7, borderRadius:1, background: color }} />}
              </div>
              <span style={{
                fontFamily: "'Orbitron', monospace",
                fontSize: 8,
                letterSpacing: '.18em',
                color: checked ? color : 'rgba(255,255,255,0.28)',
                transition: 'color .15s',
                textTransform: 'uppercase',
              }}>
                {label}
              </span>
            </label>
          ))}
        </div>

        {/* ── STOP BUTTON ── */}
        <div style={{ display:'flex', justifyContent:'center', paddingTop:2 }}>
          <button onClick={onStop} style={{
            background:'transparent', border:'1px solid rgba(255,255,255,0.12)',
            color:'rgba(255,255,255,0.3)', fontFamily:"'Orbitron',monospace",
            fontSize:8, letterSpacing:'0.25em', padding:'7px 28px', cursor:'pointer', borderRadius:2,
          }}
          onMouseEnter={e=>{e.currentTarget.style.borderColor='rgba(255,60,60,0.45)';e.currentTarget.style.color='rgba(255,60,60,0.65)';}}
          onMouseLeave={e=>{e.currentTarget.style.borderColor='rgba(255,255,255,0.12)';e.currentTarget.style.color='rgba(255,255,255,0.3)';}}>
            ■ PARAR
          </button>
        </div>

      </div>
    </div>
  );
};

// ============================================
// LAUNCH VIEW - Estatísticas de Launch Techniques
// ============================================
const LaunchView = ({ analytics }) => {
  const [expanded, setExpanded] = useState({});

  if (!analytics || !analytics.roundStats || !analytics.roundStats.byLaunchTechnique) {
    return (
      <div style={{ padding:'40px 28px', maxWidth:1400, margin:'0 auto' }}>
        <div style={{ textAlign:'center', padding:60, color:'rgba(255,255,255,0.3)' }}>
          <Zap size={48} style={{opacity:0.3, marginBottom:16}}/>
          <div style={{fontFamily:'Orbitron,monospace', fontSize:14, letterSpacing:'.2em'}}>
            SEM DADOS DE LAUNCH TECHNIQUES
          </div>
          <div style={{fontSize:12, marginTop:8}}>
            Simule alguns torneios para coletar estatísticas
          </div>
        </div>
      </div>
    );
  }

  const ltMap = analytics.roundStats.byLaunchTechnique;

  const ltData = Array.from(ltMap.entries())
    .map(([technique, data]) => ({
      technique,
      ...data,
      config: LAUNCH_TECHNIQUES[technique] || {
        name: technique,
        icon: '⚪',
        color: '#94a3b8',
        desc: 'Unknown technique'
      }
    }))
    .sort((a, b) => b.winRate - a.winRate);

  const totalUses = ltData.reduce((sum, lt) => sum + lt.uses, 0);

  const toggleExpand = (technique) => {
    setExpanded(prev => ({ ...prev, [technique]: !prev[technique] }));
  };

  const getPerformanceColor = (winRate) => {
    if (winRate >= 0.58) return '#22c55e';
    if (winRate >= 0.52) return '#ffd700';
    if (winRate >= 0.48) return '#f97316';
    return '#ef4444';
  };

  return (
    <div style={{ padding:'40px 28px', maxWidth:1400, margin:'0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom:32 }}>
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:8 }}>
          <Zap size={24} style={{color:'#ffd700'}}/>
          <h2 style={{ fontFamily:'Orbitron,monospace', fontSize:22, fontWeight:900, letterSpacing:'.15em', margin:0, color:'#ffd700' }}>
            LAUNCH TECHNIQUES ANALYTICS
          </h2>
        </div>
        <div style={{ fontFamily:'Rajdhani', fontSize:13, color:'rgba(255,255,255,0.4)', letterSpacing:'.05em' }}>
          Análise de taxa de vitória por técnica de lançamento • Total de {totalUses.toLocaleString()} lançamentos registrados
        </div>
      </div>

      {/* Lista de Launch Techniques */}
      <div style={{ display:'grid', gap:8 }}>
        {ltData.map((lt) => {
          const usagePercent = totalUses > 0 ? (lt.uses / totalUses * 100).toFixed(1) : '0.0';
          const winPercent = (lt.winRate * 100).toFixed(1);
          const performanceColor = getPerformanceColor(lt.winRate);
          const isOpen = !!expanded[lt.technique];

          // Head-to-head matchups, sorted by win rate desc
          const vsData = lt.vsLaunch
            ? Array.from(lt.vsLaunch.entries())
                .map(([opp, stats]) => ({
                  opp,
                  ...stats,
                  config: LAUNCH_TECHNIQUES[opp] || { name: opp, icon: '⚪', color: '#94a3b8' }
                }))
                .filter(v => v.uses >= 1)
                .sort((a, b) => b.winRate - a.winRate)
            : [];

          return (
            <div key={lt.technique} style={{ borderRadius: 10, overflow:'hidden', border:`1px solid rgba(255,255,255,0.07)` }}>
              {/* ROW PRINCIPAL */}
              <div
                className="hub-card"
                onClick={() => vsData.length > 0 && toggleExpand(lt.technique)}
                style={{
                  padding:'16px 20px',
                  position:'relative',
                  overflow:'hidden',
                  borderLeftColor: lt.config.color,
                  borderLeftWidth: 3,
                  cursor: vsData.length > 0 ? 'pointer' : 'default',
                  margin: 0,
                  borderRadius: isOpen ? '10px 10px 0 0' : 10,
                  transition: 'background 0.15s'
                }}
              >
                <div style={{
                  position:'absolute', inset:0,
                  background:`linear-gradient(90deg, ${performanceColor}08 0%, transparent 60%)`,
                  pointerEvents:'none'
                }}/>

                <div style={{ position:'relative', display:'grid', gridTemplateColumns:'auto 1fr auto auto', gap:16, alignItems:'center' }}>
                  {/* Icon & Name */}
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <div style={{
                      fontSize:26, width:44, height:44,
                      display:'flex', alignItems:'center', justifyContent:'center',
                      background:`${lt.config.color}15`, borderRadius:8,
                      border:`1px solid ${lt.config.color}40`
                    }}>
                      {lt.config.icon}
                    </div>
                    <div>
                      <div style={{ fontFamily:'Orbitron,monospace', fontSize:14, fontWeight:700, letterSpacing:'.08em', color:'rgba(255,255,255,0.9)', marginBottom:2 }}>
                        {lt.config.name}
                      </div>
                      <div style={{ fontSize:10, color:'rgba(255,255,255,0.35)', letterSpacing:'.03em' }}>
                        {lt.config.desc}
                      </div>
                    </div>
                  </div>

                  {/* Win Rate Bar */}
                  <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline' }}>
                      <div style={{ fontSize:10, color:'rgba(255,255,255,0.4)', fontFamily:'Rajdhani', fontWeight:600, letterSpacing:'.08em' }}>
                        WIN RATE GERAL
                      </div>
                      <div style={{ fontSize:18, fontWeight:700, fontFamily:'Orbitron,monospace', color: performanceColor }}>
                        {winPercent}%
                      </div>
                    </div>
                    <div style={{ height:6, background:'rgba(255,255,255,0.05)', borderRadius:3, overflow:'hidden' }}>
                      <div style={{
                        height:'100%', width:`${winPercent}%`,
                        background:`linear-gradient(90deg, ${performanceColor} 0%, ${performanceColor}cc 100%)`,
                        boxShadow:`0 0 8px ${performanceColor}40`, transition:'width 0.5s ease'
                      }}/>
                    </div>
                  </div>

                  {/* Stats */}
                  <div style={{ display:'flex', gap:16, alignItems:'center' }}>
                    <div style={{ textAlign:'center' }}>
                      <div style={{ fontSize:9, color:'rgba(255,255,255,0.35)', marginBottom:2, fontFamily:'Rajdhani', letterSpacing:'.05em' }}>USOS</div>
                      <div style={{ fontSize:15, fontWeight:700, fontFamily:'Orbitron,monospace', color:'rgba(255,255,255,0.9)' }}>{lt.uses}</div>
                      <div style={{ fontSize:9, color:'rgba(255,255,255,0.25)' }}>{usagePercent}%</div>
                    </div>
                    <div style={{ width:1, height:36, background:'rgba(255,255,255,0.08)' }}/>
                    <div style={{ textAlign:'center' }}>
                      <div style={{ fontSize:9, color:'rgba(255,255,255,0.35)', marginBottom:2, fontFamily:'Rajdhani', letterSpacing:'.05em' }}>W / L</div>
                      <div style={{ fontSize:13, fontFamily:'Orbitron,monospace' }}>
                        <span style={{ color:'#22c55e', fontWeight:700 }}>{lt.wins}</span>
                        <span style={{ color:'rgba(255,255,255,0.3)', margin:'0 3px' }}>/</span>
                        <span style={{ color:'#ef4444', fontWeight:700 }}>{lt.losses}</span>
                      </div>
                    </div>
                  </div>

                  {/* Expand toggle */}
                  {vsData.length > 0 && (
                    <div style={{ color:'rgba(255,255,255,0.4)', fontSize:11, display:'flex', alignItems:'center', gap:4, fontFamily:'Rajdhani', letterSpacing:'.05em' }}>
                      <span>{vsData.length} matchups</span>
                      <span style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0)', transition:'transform 0.2s', display:'inline-block' }}>▼</span>
                    </div>
                  )}
                </div>
              </div>

              {/* LINHAS HEAD-TO-HEAD */}
              {isOpen && vsData.length > 0 && (
                <div style={{ background:'rgba(0,0,0,0.35)', borderTop:'1px solid rgba(255,255,255,0.06)' }}>
                  {vsData.map((vs, idx) => {
                    const vsWin = (vs.winRate * 100).toFixed(1);
                    const vsColor = getPerformanceColor(vs.winRate);
                    return (
                      <div
                        key={vs.opp}
                        style={{
                          display:'grid', gridTemplateColumns:'auto 1fr auto',
                          gap:14, alignItems:'center',
                          padding:'11px 20px 11px 44px',
                          borderBottom: idx < vsData.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                          background: idx % 2 === 0 ? 'rgba(255,255,255,0.015)' : 'transparent'
                        }}
                      >
                        {/* Opponent */}
                        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                          <div style={{ width:2, height:24, background:`${lt.config.color}60`, borderRadius:1 }}/>
                          <span style={{ fontSize:16 }}>{vs.config.icon}</span>
                          <span style={{ fontFamily:'Rajdhani', fontSize:13, fontWeight:600, color:'rgba(255,255,255,0.65)', letterSpacing:'.04em' }}>
                            vs {vs.config.name}
                          </span>
                        </div>

                        {/* Mini bar */}
                        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                          <div style={{ flex:1, height:4, background:'rgba(255,255,255,0.05)', borderRadius:2, overflow:'hidden' }}>
                            <div style={{
                              height:'100%', width:`${vsWin}%`,
                              background:`linear-gradient(90deg, ${vsColor} 0%, ${vsColor}bb 100%)`,
                              transition:'width 0.4s ease'
                            }}/>
                          </div>
                          <div style={{ fontSize:13, fontWeight:700, fontFamily:'Orbitron,monospace', color: vsColor, minWidth:44, textAlign:'right' }}>
                            {vsWin}%
                          </div>
                        </div>

                        {/* W/L */}
                        <div style={{ fontSize:12, fontFamily:'Orbitron,monospace', color:'rgba(255,255,255,0.45)', whiteSpace:'nowrap' }}>
                          <span style={{ color:'#22c55e' }}>{vs.wins}W</span>
                          <span style={{ color:'rgba(255,255,255,0.2)', margin:'0 3px' }}>/</span>
                          <span style={{ color:'#ef4444' }}>{vs.losses}L</span>
                          <span style={{ color:'rgba(255,255,255,0.25)', fontSize:10, marginLeft:4 }}>({vs.uses})</span>
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

      {/* Performance Summary */}
      <div className="hub-card" style={{ marginTop:24, padding:20 }}>
        <div style={{ fontFamily:'Orbitron,monospace', fontSize:13, fontWeight:700, marginBottom:14, letterSpacing:'.1em', color:'rgba(255,255,255,0.7)' }}>
          📊 RESUMO DE PERFORMANCE
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(180px, 1fr))', gap:14 }}>
          <div>
            <div style={{ fontSize:11, color:'rgba(255,255,255,0.4)', marginBottom:4 }}>Técnicas Fortes (≥58%)</div>
            <div style={{ fontSize:22, fontWeight:700, fontFamily:'Orbitron,monospace', color:'#22c55e' }}>
              {ltData.filter(lt => lt.winRate >= 0.58).length}
            </div>
          </div>
          <div>
            <div style={{ fontSize:11, color:'rgba(255,255,255,0.4)', marginBottom:4 }}>Técnicas Boas (52-57%)</div>
            <div style={{ fontSize:22, fontWeight:700, fontFamily:'Orbitron,monospace', color:'#ffd700' }}>
              {ltData.filter(lt => lt.winRate >= 0.52 && lt.winRate < 0.58).length}
            </div>
          </div>
          <div>
            <div style={{ fontSize:11, color:'rgba(255,255,255,0.4)', marginBottom:4 }}>Técnicas Fracas (&lt;48%)</div>
            <div style={{ fontSize:22, fontWeight:700, fontFamily:'Orbitron,monospace', color:'#ef4444' }}>
              {ltData.filter(lt => lt.winRate < 0.48).length}
            </div>
          </div>
          <div>
            <div style={{ fontSize:11, color:'rgba(255,255,255,0.4)', marginBottom:4 }}>Mais Usada</div>
            <div style={{ fontSize:13, fontWeight:700, fontFamily:'Orbitron,monospace', color:'rgba(255,255,255,0.9)' }}>
              {[...ltData].sort((a,b) => b.uses - a.uses)[0]?.config.icon} {[...ltData].sort((a,b) => b.uses - a.uses)[0]?.config.name || 'N/A'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================
// MAIN COMPONENT
// ============================================
const BroadcastHub = ({ universeManager, onNavigate, onStartTournament, onTournamentComplete, onLoadComplete }) => {
  const [currentView, setCurrentView] = useState('geral');
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simMode, setSimMode] = useState('');
  const [simProgress, setSimProgress] = useState({ current: 0, total: 0, label: '' });
  const [simOverlay, setSimOverlay] = useState(null); // { month, year, tournamentName, tier, current, total, ... }
  const [refreshKey, setRefreshKey] = useState(0);
  const [showSeasonCeremony, setShowSeasonCeremony] = useState(false);
  const [showSimMenu, setShowSimMenu] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null); // null | 'saving' | 'saved' | 'loading' | 'error'
  const [stopAtPremier, setStopAtPremier] = useState(false);
  const [stopAtKingsCourt, setStopAtKingsCourt] = useState(false);
  const stopSimRef = useRef(false);
  const simMenuRef = useRef(null);
  const loadFileRef = useRef(null);

  // ── SAVE / LOAD ──────────────────────────────────────────────────
  const handleSave = () => {
    if (!universeManager) return;

    const triggerDownload = (jsonString, filename) => {
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    };

    try {
      setSaveStatus('saving');
      const data = universeManager.exportToJSON();
      const year  = universeManager.currentYear  || 2024;
      const month = universeManager.currentMonth || 1;

      let jsonString;
      try {
        jsonString = JSON.stringify(data);
      } catch (sizeErr) {
        // Fallback de emergência: omite matchHistory (todos os recordes permanentes estão preservados)
        // Isso NÃO é um save incompleto — HoF, recordes, newgens, ranking e crônicas estão todos presentes.
        // matchHistory é o histórico bruto de partidas; os recordes derivados dele vivem em playerHistories.
        console.warn('⚠️ Fallback de save ativado (matchHistory omitido por tamanho):', sizeErr.message);
        const fallbackData = { ...data, matchHistory: [] };
        jsonString = JSON.stringify(fallbackData);
        triggerDownload(jsonString, `bblade_save_${year}_m${month}.json`);
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus(null), 2500);
        console.info('✅ Save concluído (histórico de partidas omitido — todos os recordes preservados)');
        return;
      }

      const sizeMB = (jsonString.length / 1024 / 1024).toFixed(1);
      console.info(`💾 Save: ${sizeMB}MB`);
      if (sizeMB > 80) console.warn(`⚠️ Save grande (${sizeMB}MB) — considere salvar com mais frequência.`);

      triggerDownload(jsonString, `bblade_save_${year}_m${month}.json`);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus(null), 2500);
    } catch (e) {
      console.error('Erro ao salvar:', e);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus(null), 3000);
    }
  };

  const handleLoad = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !universeManager) return;
    try {
      setSaveStatus('loading');
      await universeManager.importFromFile(file);
      setRefreshKey(k => k + 1);
      if (onLoadComplete) onLoadComplete(); // propaga re-render global para App.jsx
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus(null), 2500);
    } catch (err) {
      console.error('Erro ao carregar:', err);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus(null), 3000);
    }
    // Limpar input para permitir re-load do mesmo arquivo
    e.target.value = '';
  };

  // Fecha dropdown ao clicar fora — usa ref para NÃO fechar quando clica dentro do menu
  useEffect(() => {
    if (!showSimMenu) return;
    const handler = (e) => {
      if (simMenuRef.current && simMenuRef.current.contains(e.target)) return;
      setShowSimMenu(false);
    };
    document.addEventListener('click', handler, true);
    return () => document.removeEventListener('click', handler, true);
  }, [showSimMenu]);
  const warRoom = useWarRoomData();

  const currentMonth = universeManager.currentMonth;
  const currentYear  = universeManager.currentYear;

  const startTournamentWithCorrectIndex = (showOpening = false) => {
    if (onStartTournament) {
      const nextTournament = universeManager.getNextAvailableTournament();
      if (nextTournament) onStartTournament(nextTournament.index, showOpening);
    }
  };

  const rawRankings = universeManager.getBBPRanking();
  const rankings = rawRankings.map(entry => ({
    ...TEAMS[entry.playerId],
    rank: entry.rank,
    bbpPoints: entry.points,
    playerId: entry.playerId,
  }));

  const currentEvent = universeManager.getCurrentTournament();

  // SIMULAR TORNEIO ATUAL (com WarRoom + Recap)
  const simulateCurrentTournament = async () => {
    if (isSimulating) return;
    const nextTournament = universeManager.getNextAvailableTournament();
    if (!nextTournament) { alert('Nenhum torneio disponivel!'); return; }

    stopSimRef.current = false;
    setIsSimulating(true);
    setSimMode('tournament');

    try {
      if (nextTournament.index === 0) universeManager.captureMonthRankingSnapshot?.();
      universeManager.startTournament(nextTournament.index);
      setRefreshKey(k => k + 1);

      const result = await runTournamentHeadless(universeManager, warRoom, stopSimRef, null);

      if (result && result.champion && !stopSimRef.current) {
        warRoom.reset();
        if (onTournamentComplete) setTimeout(() => onTournamentComplete(result), 300);
      }
    } catch (e) {
      console.error('Erro ao simular torneio:', e);
    } finally {
      setIsSimulating(false);
      setSimMode('');
      stopSimRef.current = false;
      setRefreshKey(k => k + 1);
    }
  };

  // SIMULAR TEMPORADA COMPLETA — overlay leve sem WarRoom
  const simulateFullSeason = async () => {
    if (isSimulating) return;
    const targetYear = universeManager.currentYear;
    const totalTournaments = CALENDAR_STRUCTURE.months.reduce((s, m) => s + (m.tournaments?.length || 0), 0);

    stopSimRef.current = false;
    setIsSimulating(true);
    setSimMode('season');
    let tourCount = 0;

    try {
      while (!stopSimRef.current) {
        if (universeManager.pendingYearEnd) break;
        const nextTournament = universeManager.getNextAvailableTournament();
        if (!nextTournament) break;
        if (nextTournament.year > targetYear) break;

        tourCount++;
        setSimOverlay({
          mode: 'season',
          month: nextTournament.month,
          year: nextTournament.year,
          tournamentName: nextTournament.tournament.name,
          tier: nextTournament.tournament.tier,
          current: tourCount,
          total: totalTournaments,
        });

        // ── PARAR antes de Premier ou Kings Court se marcado ──
        // Checa ANTES de rodar para o torneio ficar disponível para jogar manualmente
        const upcomingTier = nextTournament.tournament.tier;
        if (stopAtPremier && upcomingTier === 'PREMIER') { stopSimRef.current = true; break; }
        if (stopAtKingsCourt && upcomingTier === 'KINGS_COURT') { stopSimRef.current = true; break; }

        if (nextTournament.index === 0) universeManager.captureMonthRankingSnapshot?.();
        universeManager.startTournament(nextTournament.index);

        // Turbo async: yields a cada TURBO_YIELD_EVERY partidas — mantém browser responsivo
        universeManager._turboMode = true;
        await runTournamentHeadless(universeManager, NOOP_WAR_ROOM, stopSimRef, null, true);
        universeManager._turboMode = false;

        // Yield por torneio — deixa o browser respirar e atualiza o overlay
        await new Promise(r => setTimeout(r, 0));
      }

      if (!stopSimRef.current) {
        setSimOverlay(null);
        setRefreshKey(k => k + 1);
        if (universeManager.pendingYearEnd) {
          setShowSeasonCeremony('finalizar');
        } else {
          setShowSeasonCeremony('banner');
        }
      }
    } catch (e) {
      console.error('Erro ao simular temporada:', e);
    } finally {
      setSimOverlay(null);
      setIsSimulating(false);
      setSimMode('');
      stopSimRef.current = false;
      setRefreshKey(k => k + 1);
    }
  };

  // ===== SIMULAR N TEMPORADAS — overlay leve sem WarRoom =====
  const simulateNSeasons = async (n) => {
    if (isSimulating) return;
    setShowSimMenu(false);

    const isInfinite = n === Infinity;
    const startYear  = universeManager.currentYear;
    const tourPerSeason = CALENDAR_STRUCTURE.months.reduce((s, m) => s + (m.tournaments?.length || 0), 0);

    stopSimRef.current = false;
    setIsSimulating(true);
    setSimMode('multiseason');
    let totalTournamentsSimulated = 0;
    let seasonsDone = 0;

    try {
      while (!stopSimRef.current) {
        if (!isInfinite && seasonsDone >= n) break;

        const currentSeasonYear = universeManager.currentYear;
        let tourCount = 0;

        while (!stopSimRef.current) {
          if (universeManager.pendingYearEnd) break;
          const nextTournament = universeManager.getNextAvailableTournament();
          if (!nextTournament) break;
          if (nextTournament.year > currentSeasonYear) break;

          tourCount++;
          totalTournamentsSimulated++;

          setSimOverlay({
            mode: 'multiseason',
            month: nextTournament.month,
            year: nextTournament.year,
            tournamentName: nextTournament.tournament.name,
            tier: nextTournament.tournament.tier,
            current: tourCount,
            total: tourPerSeason,
            seasonCurrent: seasonsDone + 1,
            seasonTotal: isInfinite ? Infinity : n,
          });

          // ── PARAR antes de Premier ou Kings Court se marcado ──
          const upcomingTier2 = nextTournament.tournament.tier;
          if (stopAtPremier && upcomingTier2 === 'PREMIER') { stopSimRef.current = true; break; }
          if (stopAtKingsCourt && upcomingTier2 === 'KINGS_COURT') { stopSimRef.current = true; break; }

          if (nextTournament.index === 0) universeManager.captureMonthRankingSnapshot?.();
          universeManager.startTournament(nextTournament.index);

          // Turbo async: yields a cada TURBO_YIELD_EVERY partidas — mantém browser responsivo
          universeManager._turboMode = true;
          const result = await runTournamentHeadless(universeManager, NOOP_WAR_ROOM, stopSimRef, null, true);
          universeManager._turboMode = false;
          if (!result) break;

          await new Promise(r => setTimeout(r, 0));
        }

        if (universeManager.pendingYearEnd && !stopSimRef.current) {
          universeManager.finalizeSeasonTransition();
        }

        seasonsDone++;
      }

      if (!stopSimRef.current) {
        setSimOverlay(null);
        setRefreshKey(k => k + 1);
        alert(`✅ ${seasonsDone} TEMPORADAS SIMULADAS!\n\nDe ${startYear} a ${universeManager.currentYear - 1}\n${totalTournamentsSimulated} torneios concluídos.`);
      }
    } catch (e) {
      console.error('Erro ao simular temporadas:', e);
      alert(`❌ Erro: ${e.message}`);
    } finally {
      setSimOverlay(null);
      setIsSimulating(false);
      setSimMode('');
      stopSimRef.current = false;
      setRefreshKey(k => k + 1);
    }
  };

  const tabs = [
    { id:'geral',        label:'GERAL'           },
    { id:'calendario',   label:'CALENDÁRIO'      },
    { id:'rankings',     label:'RANKINGS'        },
    { id:'rising-stars', label:'RISING STARS'    },
    { id:'noticias',     label:'NOTÍCIAS'        },
    { id:'analytics',    label:'ANALYTICS'       },
    { id:'eras',         label:'🏛️ ERAS'         },
    { id:'recordes',     label:'RECORDES'        },
    { id:'hall-of-fame', label:'🏛️ HALL OF FAME' },
    { id:'chronicles',   label:'📖 CRÔNICAS'      },
  ];

  return (
    <div style={{ width:'100vw', minHeight:'100vh', background:'radial-gradient(ellipse 120% 90% at 50% 110%, #1a0030 0%, #0a000f 45%, #000008 100%)', position:'relative', overflow:'hidden', fontFamily:'Rajdhani, sans-serif', color:'white' }}>
      <style>{HUB_STYLES}</style>

      <div style={{ position:'fixed', inset:0, pointerEvents:'none', backgroundImage:'linear-gradient(rgba(0,212,255,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(0,212,255,0.025) 1px,transparent 1px)', backgroundSize:'60px 60px', maskImage:'radial-gradient(ellipse 80% 60% at 50% 100%, black, transparent)', WebkitMaskImage:'radial-gradient(ellipse 80% 60% at 50% 100%, black, transparent)' }} />
      <div style={{ position:'fixed', top:'3%', left:'5%', width:500, height:500, borderRadius:'50%', background:'radial-gradient(circle,rgba(180,0,255,0.07),transparent 70%)', filter:'blur(70px)', pointerEvents:'none' }} />
      <div style={{ position:'fixed', bottom:'5%', right:'4%', width:400, height:400, borderRadius:'50%', background:'radial-gradient(circle,rgba(0,212,255,0.07),transparent 70%)', filter:'blur(70px)', pointerEvents:'none' }} />
      <div style={{ position:'fixed', top:'40%', left:'40%', width:600, height:600, borderRadius:'50%', background:'radial-gradient(circle,rgba(255,215,0,0.03),transparent 65%)', filter:'blur(50px)', pointerEvents:'none' }} />
      <div style={{ position:'fixed', inset:0, pointerEvents:'none', overflow:'hidden', zIndex:50, opacity:.12 }}>
        <div style={{ width:'100%', height:'2px', background:'linear-gradient(90deg,transparent,rgba(0,212,255,0.8),transparent)', animation:'hub-scan 9s linear infinite' }} />
      </div>

      {/* TOP BAR */}
      <div style={{ position:'sticky', top:0, zIndex:40, background:'rgba(0,0,0,0.75)', backdropFilter:'blur(14px)', borderBottom:'1px solid rgba(255,215,0,0.1)', height:56, display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 28px', gap:16 }}>
        <div style={{ display:'flex', alignItems:'center', gap:14 }}>
          <div style={{ width:6, height:6, borderRadius:'50%', background: isSimulating ? '#00ff88' : '#ffd700', boxShadow:`0 0 8px ${isSimulating ? '#00ff88' : '#ffd700'}`, animation:'hub-pulse 2s ease-in-out infinite' }} />
          <div>
            <div style={{ fontFamily:'Orbitron,monospace', fontSize:11, letterSpacing:'.4em', color:'rgba(255,215,0,0.75)', textTransform:'uppercase' }}>BAYBLADE: UNIVERSE — BROADCAST HUB</div>
            {isSimulating && simMode === 'season' && <div style={{ fontFamily:'Orbitron,monospace', fontSize:8, letterSpacing:'.2em', color:'#00ff88', animation:'hub-blink 1s ease-in-out infinite' }}>● SIMULANDO TEMPORADA {currentYear} — TORNEIO {simProgress.current}/28: {simProgress.label}</div>}
            {isSimulating && simMode === 'multiseason' && <div style={{ fontFamily:'Orbitron,monospace', fontSize:8, letterSpacing:'.2em', color:'#ec4899', animation:'hub-blink 1s ease-in-out infinite' }}>● SIMULANDO {simProgress.total === '∞' ? '∞' : `${simProgress.current}/${simProgress.total}`} TEMPORADAS — {simProgress.label}</div>}
            {isSimulating && simMode === 'tournament' && <div style={{ fontFamily:'Orbitron,monospace', fontSize:8, letterSpacing:'.2em', color:'#00ff88', animation:'hub-blink 1s ease-in-out infinite' }}>● SIMULANDO TORNEIO...</div>}
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ fontFamily:'Orbitron,monospace', fontSize:9, letterSpacing:'.25em', color:'rgba(255,255,255,0.3)', textAlign:'right' }}>
            {getMonthName(currentMonth).toUpperCase()}<br/>
            <span style={{ color:'rgba(255,215,0,0.4)', fontSize:11 }}>{currentYear}</span>
          </div>
          <div style={{ width:1, height:28, background:'rgba(255,255,255,0.1)' }} />
          <button className="sim-btn" onClick={simulateFullSeason} disabled={isSimulating}>
            {isSimulating && simMode === 'season' ? <><span style={{ display:'inline-block', animation:'hub-spin 1s linear infinite', marginRight:6 }}>⚙</span>T{simProgress.current}/28</> : isSimulating ? <><span style={{ display:'inline-block', animation:'hub-spin 1s linear infinite', marginRight:6 }}>⚙</span>SIMULANDO...</> : <>⚡ SIMULAR TEMPORADA</>}
          </button>

          {/* ── MULTI-SEASON DROPDOWN ───────────────────────────────── */}
          <div ref={simMenuRef} style={{ position:'relative' }}>
            {isSimulating && simMode === 'multiseason' ? (
              <button className="sim-btn" onClick={() => { stopSimRef.current = true; }} style={{ background:'linear-gradient(135deg,#ff4466,#8b0020)', minWidth:180 }}>
                <span style={{ display:'inline-block', animation:'hub-spin 1s linear infinite', marginRight:6 }}>⚙</span>
                {simProgress.total === '∞' ? `S${simProgress.current} ∞` : `S${simProgress.current}/${simProgress.total}`} — PARAR
              </button>
            ) : (
              <button
                className="sim-btn"
                onClick={() => !isSimulating && setShowSimMenu(v => !v)}
                disabled={isSimulating}
                style={{ background:'linear-gradient(135deg,#8b5cf6,#ec4899)', minWidth:180, display:'flex', alignItems:'center', gap:8 }}
              >
                <span>⚡⚡</span>
                <span>SIMULAR TEMPORADAS</span>
                <span style={{ marginLeft:'auto', fontSize:10, opacity:0.8 }}>{showSimMenu ? '▲' : '▼'}</span>
              </button>
            )}

            {showSimMenu && !isSimulating && (
              <div style={{
                position:'absolute', top:'calc(100% + 6px)', right:0, zIndex:100,
                background:'rgba(10,0,20,0.97)', border:'1px solid rgba(139,92,246,0.5)',
                borderRadius:10, overflow:'hidden', minWidth:200,
                boxShadow:'0 8px 32px rgba(139,92,246,0.3)',
              }}>
                {[
                  { label:'⚡ Simular 5 temporadas',      n:5       },
                  { label:'⚡⚡ Simular 10 temporadas',   n:10      },
                  { label:'⚡⚡⚡ Simular 30 temporadas', n:30      },
                  { label:'∞ Simular infinitamente',       n:Infinity},
                ].map(({ label, n }) => (
                  <button
                    key={n}
                    onClick={() => simulateNSeasons(n)}
                    style={{
                      display:'block', width:'100%', padding:'11px 18px', textAlign:'left',
                      background:'transparent', border:'none', borderBottom:'1px solid rgba(139,92,246,0.15)',
                      color: n === Infinity ? '#ff88cc' : 'rgba(255,255,255,0.9)',
                      fontFamily:'Rajdhani,sans-serif', fontSize:13, fontWeight:600,
                      cursor:'pointer', letterSpacing:'.04em',
                      transition:'background .15s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(139,92,246,0.2)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button className="hub-back-btn" onClick={() => onNavigate && onNavigate('MENU')}>← MENU</button>
          
          {/* ── SAVE / LOAD ── */}
          <div style={{ width:1, height:28, background:'rgba(255,255,255,0.1)' }} />
          
          {/* Input oculto para load */}
          <input
            ref={loadFileRef}
            type="file"
            accept=".json"
            style={{ display:'none' }}
            onChange={handleLoad}
          />

          {/* LOAD */}
          <button
            onClick={() => loadFileRef.current?.click()}
            disabled={isSimulating || saveStatus === 'loading'}
            title="Carregar save (JSON)"
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'rgba(96,165,250,0.1)',
              border: '1px solid rgba(96,165,250,0.3)',
              borderRadius: 4,
              padding: '6px 14px',
              fontFamily: 'Orbitron, monospace',
              fontSize: 10,
              letterSpacing: '.15em',
              color: saveStatus === 'loading' ? '#93c5fd' : 'rgba(147,197,253,0.85)',
              cursor: isSimulating ? 'not-allowed' : 'pointer',
              opacity: isSimulating ? 0.4 : 1,
              transition: 'all .2s',
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={e => { if (!isSimulating) e.currentTarget.style.background = 'rgba(96,165,250,0.2)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(96,165,250,0.1)'; }}
          >
            {saveStatus === 'loading' ? (
              <span style={{ display:'inline-block', animation:'hub-spin 1s linear infinite' }}>⚙</span>
            ) : '📂'}
            LOAD
          </button>

          {/* SAVE */}
          <button
            onClick={handleSave}
            disabled={isSimulating || saveStatus === 'saving'}
            title="Salvar universo (JSON)"
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: saveStatus === 'saved'
                ? 'rgba(34,197,94,0.15)'
                : saveStatus === 'error'
                  ? 'rgba(239,68,68,0.15)'
                  : 'rgba(201,168,76,0.1)',
              border: `1px solid ${
                saveStatus === 'saved' ? 'rgba(34,197,94,0.4)'
                : saveStatus === 'error' ? 'rgba(239,68,68,0.4)'
                : 'rgba(201,168,76,0.3)'
              }`,
              borderRadius: 4,
              padding: '6px 14px',
              fontFamily: 'Orbitron, monospace',
              fontSize: 10,
              letterSpacing: '.15em',
              color: saveStatus === 'saved' ? '#86efac'
                   : saveStatus === 'error' ? '#fca5a5'
                   : saveStatus === 'saving' ? '#fde68a'
                   : 'rgba(253,230,138,0.85)',
              cursor: isSimulating ? 'not-allowed' : 'pointer',
              opacity: isSimulating ? 0.4 : 1,
              transition: 'all .2s',
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={e => { if (!isSimulating && !saveStatus) e.currentTarget.style.background = 'rgba(201,168,76,0.18)'; }}
            onMouseLeave={e => { if (!saveStatus) e.currentTarget.style.background = 'rgba(201,168,76,0.1)'; }}
          >
            {saveStatus === 'saving' ? (
              <span style={{ display:'inline-block', animation:'hub-spin 1s linear infinite' }}>⚙</span>
            ) : saveStatus === 'saved' ? '✓' : saveStatus === 'error' ? '✕' : '💾'}
            {saveStatus === 'saved' ? 'SALVO!' : saveStatus === 'error' ? 'ERRO' : 'SAVE'}
          </button>
        </div>
      </div>

      {isSimulating && (
        <div className="sim-progress-bar" style={{ position:'sticky', top:56, zIndex:39 }}>
          <div className="sim-progress-fill" style={{ width:`${simProgress.total > 0 ? Math.floor((simProgress.current/simProgress.total)*100) : 0}%` }} />
        </div>
      )}

      {/* NAV TABS */}
      <div style={{ position:'sticky', top:isSimulating?59:56, zIndex:38, background:'rgba(0,0,0,0.6)', backdropFilter:'blur(10px)', borderBottom:'1px solid rgba(255,255,255,0.06)', display:'flex', padding:'0 28px', gap:4 }}>
        {tabs.map(tab => (
          <button key={tab.id} className={`hub-tab ${currentView===tab.id?'active':''}`} onClick={() => setCurrentView(tab.id)}>{tab.label}</button>
        ))}
        <div style={{ marginLeft:'auto', display:'flex', alignItems:'center' }}>
          <div style={{ fontFamily:'Orbitron,monospace', fontSize:9, letterSpacing:'.15em', color:'rgba(255,255,255,0.2)' }}>{rankings.length} FIGHTERS CLASSIFICADOS</div>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div style={{ maxWidth:1400, margin:'0 auto', padding:'24px 28px 64px' }}>

        {/* TOP 4 e Active Tournament - APENAS NA ABA GERAL */}
        {currentView === 'geral' && (
          <>
            <div style={{ marginBottom:20, animation:'hub-entry .4s ease both' }}>
              <div className="hub-section-label">⚡ BBP RANKINGS — TOP 4</div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8 }}>
                {rankings.slice(0,4).map((player,idx) => {
                  const pColor = player.colors?.[0] || '#ffd700';
                  const rankColors = ['#ffd700','#cbd5e1','#c97c3a','#60a5fa'];
                  return (
                    <div key={idx} className="top4-card" onClick={() => onNavigate && onNavigate('PLAYER_PROFILE', player.playerId)} style={{ borderColor:`${pColor}33` }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor=`${pColor}66`; e.currentTarget.style.boxShadow=`0 0 24px ${pColor}22`; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor=`${pColor}33`; e.currentTarget.style.boxShadow=''; }}>
                      <div style={{ fontFamily:'Black Ops One,cursive', fontSize:28, color:rankColors[idx], lineHeight:1, textShadow:`0 0 20px ${rankColors[idx]}88` }}>#{idx+1}</div>
                      <img src={player.iconUrl||player.photoUrl} alt="" onError={e=>{e.target.src=player.photoUrl;}} style={{ width:52, height:52, borderRadius:'50%', objectFit:'cover', border:`2px solid ${pColor}55`, boxShadow:`0 0 12px ${pColor}44` }} />
                      <div style={{ fontFamily:'Rajdhani,sans-serif', fontWeight:700, fontSize:12, color:'rgba(255,255,255,0.9)', lineHeight:1.2 }}>{player.name.replace(/"[^"]*"\s*/,'').split(' ').slice(0,2).join(' ')}</div>
                      <div style={{ fontSize:11 }}>{player.country.split(' ')[0]}</div>
                      <div style={{ fontFamily:'Orbitron,monospace', fontSize:13, fontWeight:700, color:rankColors[idx] }}>{player.bbpPoints||0}<span style={{fontSize:8,opacity:.6,marginLeft:3}}>PTS</span></div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={{ height:1, background:'linear-gradient(90deg,rgba(255,215,0,0.35),transparent)', marginBottom:20 }} />

            {/* FINALIZAR TEMPORADA (fim de dezembro, antes da virada) */}
            {universeManager.pendingYearEnd && (
              <FinalizarTemporadaPanel
                completedYear={universeManager.currentYear}
                onFinalizar={() => {
                  universeManager.finalizeSeasonTransition();
                  setShowSeasonCeremony('ceremony');
                  setRefreshKey(k => k + 1);
                }}
              />
            )}

            {/* Active tournament (só mostra se NÃO houver pendingYearEnd) */}
            {!universeManager.pendingYearEnd && currentEvent && (
              <ActiveTournamentPanel event={currentEvent} onStart={startTournamentWithCorrectIndex} onSimulateTournament={simulateCurrentTournament} isSimulating={isSimulating} currentYear={currentYear} currentMonth={currentMonth} />
            )}

            {/* Season awards banner (após finalizar) */}
            {!universeManager.pendingYearEnd && !currentEvent && showSeasonCeremony === 'banner' && (
              <SeasonEndedBanner
                completedYear={universeManager.pendingSeasonCeremony?.completedYear ?? currentYear - 1}
                nextYear={currentYear}
                onStartCeremony={() => setShowSeasonCeremony('ceremony')}
              />
            )}
            {!universeManager.pendingYearEnd && !currentEvent && showSeasonCeremony !== 'banner' && showSeasonCeremony !== 'ceremony' && universeManager.pendingSeasonCeremony && (
              <SeasonEndedBanner
                completedYear={universeManager.pendingSeasonCeremony?.completedYear ?? currentYear - 1}
                nextYear={currentYear}
                onStartCeremony={() => setShowSeasonCeremony('ceremony')}
              />
            )}
          </>
        )}

        {/* Tab content */}
        {currentView==='geral'      && <GeralView universeManager={universeManager} currentYear={currentYear} currentMonth={currentMonth} />}
        {currentView==='calendario' && <EnhancedCalendarView universeManager={universeManager} currentMonth={currentMonth} currentYear={currentYear} onNavigate={onNavigate} />}
        {currentView==='rankings'   && <RankingsView rankings={rankings} onNavigate={onNavigate} universeManager={universeManager} />}
        {currentView==='rising-stars' && <RisingStarsView universeManager={universeManager} onNavigate={onNavigate} />}
        {currentView==='noticias'   && <NoticiasView universeManager={universeManager} rankings={rankings} currentYear={currentYear} />}
        {currentView==='analytics'  && <AnalyticsTab analytics={universeManager?.analyticsManager} />}
        {currentView==='eras'       && <ErasView universeManager={universeManager} />}
        {currentView==='recordes'   && <RecordsView universeManager={universeManager} />}
        {currentView==='hall-of-fame' && <HallOfFameView universeManager={universeManager} />}
        {currentView==='chronicles'   && <ChronicleView  universeManager={universeManager} />}
      </div>

      <div style={{ position:'fixed', bottom:0, left:0, right:0, height:2, background:'linear-gradient(90deg,transparent,rgba(255,180,0,0.7) 30%,#ffd700 50%,rgba(255,180,0,0.7) 70%,transparent)', boxShadow:'0 0 40px rgba(255,215,0,0.4)', pointerEvents:'none', zIndex:30 }} />

      {/* WAR ROOM OVERLAY - Mostrado durante simulações de torneio único */}
      {warRoom.isActive && (
        <WarRoomOverlay
          phase={warRoom.phase}
          totalMatches={warRoom.totalMatches}
          completedMatches={warRoom.completedMatches}
          currentMatch={warRoom.currentMatch}
          recentResults={warRoom.recentResults}
          stats={warRoom.stats}
          universeManager={universeManager}
          onSkip={() => { stopSimRef.current = true; warRoom.reset(); }}
          onClose={() => { stopSimRef.current = true; warRoom.reset(); setIsSimulating(false); setSimMode(''); }}
        />
      )}

      {/* SIM PROGRESS OVERLAY - Temporada / Multi-temporada */}
      {simOverlay && (
        <SimProgressOverlay
          data={simOverlay}
          onStop={() => { stopSimRef.current = true; }}
          universeManager={universeManager}
          stopAtPremier={stopAtPremier}
          setStopAtPremier={setStopAtPremier}
          stopAtKingsCourt={stopAtKingsCourt}
          setStopAtKingsCourt={setStopAtKingsCourt}
        />
      )}

      {/* SEASON AWARDS CEREMONY */}
      {showSeasonCeremony === 'ceremony' && (
        <SeasonAwardsCeremony
          universeManager={universeManager}
          onClose={() => {
            setShowSeasonCeremony(false);
            setRefreshKey(k => k + 1);
          }}
        />
      )}

    </div>
  );
};


// ============================================
// FINALIZAR TEMPORADA PANEL
// ============================================
const FinalizarTemporadaPanel = ({ completedYear, onFinalizar }) => {
  const [hover, setHover] = React.useState(false);

  return (
    <div style={{
      animation: 'hub-entry .5s ease both',
      background: 'linear-gradient(135deg, rgba(255,60,60,.10) 0%, rgba(255,140,0,.06) 50%, rgba(255,215,0,.10) 100%)',
      border: '2px solid rgba(255,215,0,.7)',
      borderRadius: 16,
      padding: '36px 40px',
      position: 'relative',
      overflow: 'hidden',
      marginBottom: 20,
      textAlign: 'center',
    }}>
      {/* Rays */}
      <div style={{
        position: 'absolute', inset: '-100%', pointerEvents: 'none',
        background: 'conic-gradient(transparent 0deg, rgba(255,215,0,.08) 45deg, transparent 90deg, transparent 180deg, rgba(255,140,0,.05) 225deg, transparent 270deg)',
        animation: 'hub-spin 15s linear infinite',
      }} />

      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* Badge */}
        <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 9, letterSpacing: '.4em', color: 'rgba(255,215,0,.5)', marginBottom: 12 }}>
          TEMPORADA ENCERRADA
        </div>

        {/* Title */}
        <div style={{ fontFamily: '"Black Ops One", cursive', fontSize: 'clamp(28px,4vw,52px)', color: '#ffd700', letterSpacing: '.04em', lineHeight: 1, marginBottom: 8, textShadow: '0 0 40px rgba(255,215,0,.5)' }}>
          {completedYear} — FIM DE TEMPORADA
        </div>
        <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 15, color: 'rgba(255,255,255,.45)', marginBottom: 32 }}>
          Todos os torneios concluídos · Clique para oficializar a virada de temporada
        </div>

        {/* Main button */}
        <button
          onClick={onFinalizar}
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => setHover(false)}
          style={{
            fontFamily: 'Orbitron, monospace',
            background: hover
              ? 'linear-gradient(135deg, #fff700, #ff8c00)'
              : 'linear-gradient(135deg, #ffd700, #ff6600)',
            border: 'none',
            color: '#000',
            padding: '20px 60px',
            borderRadius: 12,
            cursor: 'pointer',
            fontSize: 16,
            fontWeight: 900,
            letterSpacing: '.18em',
            boxShadow: hover ? '0 0 60px rgba(255,215,0,.8)' : '0 0 30px rgba(255,215,0,.4)',
            transform: hover ? 'scale(1.04)' : 'scale(1)',
            transition: 'all .2s ease',
            animation: 'hub-glow 2.5s ease-in-out infinite',
          }}
        >
          🏆 FINALIZAR TEMPORADA
        </button>

        <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 8, letterSpacing: '.2em', color: 'rgba(255,255,255,.25)', marginTop: 16 }}>
          ISSO ATIVARÁ A CERIMÔNIA DE PREMIAÇÃO E INICIARÁ {completedYear + 1}
        </div>
      </div>
    </div>
  );
};

// ============================================
// SEASON ENDED BANNER
// ============================================
const SeasonEndedBanner = ({ completedYear, nextYear, onStartCeremony }) => {
  return (
    <div style={{
      animation: 'hub-entry .5s ease both',
      background: 'linear-gradient(135deg, rgba(255,215,0,.08) 0%, rgba(255,165,0,.04) 50%, rgba(255,140,0,.08) 100%)',
      border: '2px solid rgba(255,215,0,.5)',
      borderRadius: 16,
      padding: '28px 32px',
      position: 'relative',
      overflow: 'hidden',
      marginBottom: 20,
    }}>
      {/* Animated rays */}
      <div style={{
        position: 'absolute', inset: '-100%', pointerEvents: 'none',
        background: 'conic-gradient(transparent 0deg, rgba(255,215,0,.06) 45deg, transparent 90deg, transparent 180deg, rgba(255,165,0,.04) 225deg, transparent 270deg)',
        animation: 'hub-spin 20s linear infinite',
      }} />

      <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
            <span style={{ fontSize: 32 }}>🏁</span>
            <div>
              <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 9, letterSpacing: '.3em', color: 'rgba(255,215,0,.6)', marginBottom: 2 }}>
                TEMPORADA ENCERRADA
              </div>
              <div style={{ fontFamily: '"Black Ops One", cursive', fontSize: 'clamp(20px,2.5vw,32px)', color: '#ffd700', letterSpacing: '.05em', lineHeight: 1 }}>
                ANO {completedYear} FINALIZADO
              </div>
            </div>
          </div>
          <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 14, color: 'rgba(255,255,255,.5)', paddingLeft: 44 }}>
            Todos os torneios concluídos · Iniciando temporada {nextYear} após a cerimônia
          </div>
        </div>

        <button
          onClick={onStartCeremony}
          style={{
            fontFamily: 'Orbitron, monospace',
            background: 'linear-gradient(135deg, #ffd700, #ff8c00)',
            border: 'none', color: '#000',
            padding: '16px 32px',
            borderRadius: 10, cursor: 'pointer',
            fontSize: 12, fontWeight: 900, letterSpacing: '.12em',
            whiteSpace: 'nowrap',
            boxShadow: '0 0 30px rgba(255,215,0,.4)',
            animation: 'hub-glow 3s ease-in-out infinite',
            flexShrink: 0,
          }}
        >
          🏆 CERIMÔNIA DE ENCERRAMENTO
        </button>
      </div>
    </div>
  );
};

// ============================================
// ACTIVE TOURNAMENT PANEL
// ============================================
const ActiveTournamentPanel = ({ event, onStart, onSimulateTournament, isSimulating, currentYear, currentMonth }) => {
  const tierKey = event.tier==='PREMIER_CHAMPIONSHIP'?'PC':
                  event.tier==='GRAND_SLAM'?'PC':
                  event.tier==='PREMIER'?'PC':
                  event.tier==='ELITE_MASTERS'?'EM':
                  event.tier==='MASTERS'?'EM':
                  event.tier==='RISING_STAR'?'RS':
                  event.tier==='REGIONAL_CIRCUIT'?'RC':
                  event.tier==='CHAMPIONSHIP'?'CH':
                  event.tier==='SPECIAL'?'SP':
                  event.tier==='GRAND_FINALS'?'FI':
                  event.tier==='SIGNATURE_CLASH'?'INV':event.tier==='INVITATIONAL'?'INV':
                  event.tier==='OPEN'?'OPN':'EM';
  const meta = tierMeta[tierKey] || tierMeta['M'];
  
  // ✨ Verificar se é torneio premium (999+ pontos)
  const isPremiumTournament = meta.pts >= 999;
  
  const statItems = [
    { label:'PARTICIPANTES', value:event.participants },
    { label:'FORMATO',       value:event.matchFormat },
    { label:'ARENA',         value:event.arena },
    { label:'MAX PONTOS',    value:meta.pts },
    { label:'ROUNDS',        value:event.participants===64?'6':event.participants===32?'5':event.participants===48?'6':'4' },
  ];
  
  return (
    <div style={{ marginBottom:24, animation:'hub-entry .4s ease .05s both' }}>
      {/* 👑 Banner especial para torneios premium */}
      {isPremiumTournament && (
        <div style={{
          fontFamily: 'Orbitron,monospace',
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '.25em',
          padding: '10px 20px',
          marginBottom: 10,
          background: 'linear-gradient(90deg, transparent, rgba(255,215,0,.15), transparent)',
          border: '1px solid rgba(255,215,0,.3)',
          borderLeft: 'none',
          borderRight: 'none',
          color: '#ffd700',
          textAlign: 'center',
          animation: 'premium-pulse 3s ease-in-out infinite',
          textShadow: '0 0 10px rgba(255,215,0,.6)',
          clipPath: 'polygon(20px 0%, calc(100% - 20px) 0%, 100% 50%, calc(100% - 20px) 100%, 20px 100%, 0% 50%)'
        }}>
          ⭐ TORNEIO PREMIUM • {meta.pts} PONTOS BBP ⭐
        </div>
      )}
      
      {/* Card com classe premium se for torneio especial */}
      <div 
        className={`hub-card ${isPremiumTournament ? 'tournament-premium' : ''}`}
        style={{ 
          padding:'22px 24px', 
          borderColor: isPremiumTournament ? 'rgba(255,215,0,.6)' : `${meta.color}33`,
          boxShadow: isPremiumTournament ? 'none' : `0 0 40px ${meta.color}11`
        }}
      >
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:16 }}>
          <div>
            <div className="hub-section-label" style={{ marginBottom:6 }}>
              {isPremiumTournament ? '👑' : '🔴'} TORNEIO ATIVO — {getMonthName(currentMonth).toUpperCase()} {currentYear}
            </div>
            <div style={{ 
              fontFamily:'Black Ops One,cursive', 
              fontSize:'clamp(20px,2.5vw,30px)', 
              lineHeight:1, 
              background: isPremiumTournament 
                ? 'linear-gradient(135deg, #ffd700 0%, #ffed4e 25%, #ff8c00 50%, #ffd700 75%, #ffed4e 100%)'
                : `linear-gradient(90deg,#fff 0%,${meta.color} 60%)`,
              backgroundSize: isPremiumTournament ? '200% 100%' : 'auto',
              animation: isPremiumTournament ? 'premium-shimmer 3s linear infinite' : 'none',
              WebkitBackgroundClip:'text', 
              WebkitTextFillColor:'transparent', 
              filter: isPremiumTournament 
                ? 'drop-shadow(0 0 20px rgba(255,215,0,.7)) drop-shadow(0 0 40px rgba(255,165,0,.5))'
                : `drop-shadow(0 0 14px ${meta.color}55)`
            }}>
              {event.name}
            </div>
          </div>
          <div 
            className={`tier-badge ${meta.cls} ${isPremiumTournament ? 'premium-badge-glow' : ''}`}
            style={{ marginTop:4 }}
          >
            {meta.label}
          </div>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:6, marginBottom:16 }}>
          {statItems.map(({label,value}) => (
            <div key={label} className="hub-card" style={{ padding:'10px 12px', textAlign:'center' }}>
              <div style={{ fontFamily:'Orbitron,monospace', fontSize:8, letterSpacing:'.2em', color:'rgba(255,255,255,0.3)', marginBottom:4 }}>{label}</div>
              <div style={{ fontFamily:'Rajdhani,sans-serif', fontWeight:700, fontSize:16, color:'rgba(255,255,255,0.9)' }}>{value}</div>
            </div>
          ))}
        </div>
        {event.description && (
          <div style={{ fontFamily:'Rajdhani,sans-serif', fontSize:13, color:'rgba(255,255,255,0.4)', marginBottom:16, fontStyle:'italic', borderLeft:`2px solid ${meta.color}44`, paddingLeft:12 }}>{event.description}</div>
        )}
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {/* Botão principal em destaque - COM CERIMÔNIA */}
          <button 
            className={`action-btn ${isPremiumTournament ? 'btn-premium' : 'btn-gold'}`}
            onClick={() => onStart(true)} 
            style={{ 
              width:'100%', 
              padding:'18px 24px', 
              fontSize:18,
              background: isPremiumTournament 
                ? 'linear-gradient(135deg, rgba(255,215,0,.2), rgba(255,165,0,.15), rgba(255,215,0,.2))'
                : undefined,
              animation: isPremiumTournament ? 'premium-pulse 2s ease-in-out infinite' : undefined
            }}
          >
            <span style={{fontSize:24}}>{isPremiumTournament ? '👑' : '🏆'}</span>
            <span style={{fontSize:20, fontWeight:700}}>INICIAR TORNEIO {isPremiumTournament ? 'PREMIUM' : ''}</span>
            <span style={{fontFamily:'Rajdhani,sans-serif',fontSize:11,opacity:.6,fontWeight:400}}>com cerimônia</span>
          </button>
          
          {/* Botões secundários lado a lado */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            <button className="action-btn btn-cyan" onClick={() => onStart(false)}>
              <span style={{fontSize:16}}>▶</span>
              <span>JOGAR</span>
              <span style={{fontFamily:'Rajdhani,sans-serif',fontSize:10,opacity:.6,fontWeight:400}}>direto ao bracket</span>
            </button>
            <button className="action-btn btn-orange" onClick={onSimulateTournament} disabled={isSimulating} style={{ opacity: isSimulating ? 0.5 : 1, cursor: isSimulating ? 'not-allowed' : 'pointer' }}>
              <span style={{fontSize:16}}>{isSimulating ? '⚙' : '⚡'}</span>
              <span>{isSimulating ? 'SIMULANDO...' : 'SIMULAR'}</span>
              <span style={{fontFamily:'Rajdhani,sans-serif',fontSize:10,opacity:.6,fontWeight:400}}>headless + war room</span>
            </button>
          </div>
        </div>
        
        {/* ✨ Estrelas decorativas para torneios premium */}
        {isPremiumTournament && (
          <>
            <div style={{ position:'absolute', top:10, left:10, fontSize:20, opacity:.3, animation:'premium-float 3s ease-in-out infinite' }}>✨</div>
            <div style={{ position:'absolute', top:15, right:15, fontSize:16, opacity:.4, animation:'premium-float 4s ease-in-out infinite .5s' }}>⭐</div>
            <div style={{ position:'absolute', bottom:15, left:20, fontSize:14, opacity:.35, animation:'premium-float 3.5s ease-in-out infinite 1s' }}>💫</div>
            <div style={{ position:'absolute', bottom:20, right:25, fontSize:18, opacity:.3, animation:'premium-float 4.5s ease-in-out infinite 1.5s' }}>✨</div>
          </>
        )}
      </div>
    </div>
  );
};

// ============================================
// CALENDAR VIEW
// ============================================
const CalendarView = ({ currentMonth, currentYear, onMonthSelect, universeManager }) => {
  const months = [
    {id:1, name:'Janeiro',   emoji:'🎆', season:'PRIMAVERA'},
    {id:2, name:'Fevereiro', emoji:'💎', season:'PRIMAVERA'},
    {id:3, name:'Março',     emoji:'🎪', season:'PRIMAVERA'},
    {id:4, name:'Abril',     emoji:'🌸', season:'VERÃO'},
    {id:5, name:'Maio',      emoji:'🎰', season:'VERÃO'},
    {id:6, name:'Junho',     emoji:'💀', season:'VERÃO'},
    {id:7, name:'Julho',     emoji:'🌀', season:'OUTONO'},
    {id:8, name:'Agosto',    emoji:'⭐', season:'OUTONO'},
    {id:9, name:'Setembro',  emoji:'🍂', season:'OUTONO'},
    {id:10,name:'Outubro',   emoji:'🏟️', season:'INVERNO'},
    {id:11,name:'Novembro',  emoji:'⚡', season:'INVERNO'},
    {id:12,name:'Dezembro',  emoji:'❄️', season:'INVERNO'},
  ];
  const seasonColors = {PRIMAVERA:'#34d399',VERÃO:'#fbbf24',OUTONO:'#f97316',INVERNO:'#60a5fa'};
  
  return (
    <div style={{ animation:'hub-entry .4s ease both' }}>
      {/* Título */}
      <div style={{ marginBottom:20 }}>
        <div style={{
          fontFamily:'Black Ops One,cursive',
          fontSize:'clamp(24px,3vw,38px)',
          lineHeight:1,
          background:'linear-gradient(180deg,#fff 0%,#ffd700 50%,#ff8c00 100%)',
          WebkitBackgroundClip:'text',
          WebkitTextFillColor:'transparent',
          filter:'drop-shadow(0 0 16px rgba(255,165,0,0.35))',
          marginBottom:6
        }}>
          CALENDÁRIO {currentYear}
        </div>
        <div style={{
          fontFamily:'Orbitron,monospace',
          fontSize:9, letterSpacing:'.25em',
          color:'rgba(255,255,255,0.25)'
        }}>
          4 PREMIER · 1 SIGNATURE CLASH · 10 ELITE MASTERS · 1 CROSSOVER OPEN · 6 RISING STARS · 14 REGIONAL · 7 SPECIAL
        </div>
      </div>
      
      {/* Grid de Meses */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8, marginBottom:32 }}>
        {months.map(month => {
          const isCurrent = month.id===currentMonth, isPast = month.id<currentMonth;
          const sColor = seasonColors[month.season];
          return (
            <div
              key={month.id}
              className={`month-card${isCurrent?' current':isPast?' past':''}`}
              onClick={() => onMonthSelect && onMonthSelect(month)}
              style={{ borderColor:isCurrent?'rgba(255,215,0,0.5)':`${sColor}22` }}
            >
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <span style={{ fontSize:20 }}>{month.emoji}</span>
                {isCurrent && (
                  <span style={{
                    fontFamily:'Orbitron,monospace',
                    fontSize:7, letterSpacing:'.15em',
                    color:'#ffd700',
                    border:'1px solid rgba(255,215,0,0.5)',
                    padding:'2px 6px',
                    clipPath:'polygon(3px 0%,100% 0%,calc(100% - 3px) 100%,0% 100%)'
                  }}>
                    ATUAL
                  </span>
                )}
              </div>
              <div style={{
                fontFamily:'Rajdhani,sans-serif',
                fontWeight:700, fontSize:15,
                color:isCurrent?'#ffd700':'rgba(255,255,255,0.85)'
              }}>
                {month.name}
              </div>
              <div style={{
                fontFamily:'Orbitron,monospace',
                fontSize:8, letterSpacing:'.15em',
                color:sColor,
                opacity:isPast?.5:.7
              }}>
                {month.season}
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Lista Completa de Torneios */}
      <CompleteTournamentsTimeline
        currentYear={currentYear}
        currentMonth={currentMonth}
        universeManager={universeManager}
      />
    </div>
  );
};

// ============================================
// COMPLETE TOURNAMENTS TIMELINE (TODOS OS TORNEIOS)
// ============================================
const CompleteTournamentsTimeline = ({ currentYear, currentMonth, universeManager }) => {
  const allTournaments = [
    // JANEIRO (4 torneios — Invitational novo como index 0)
    {month:1, index:0, name:"New Year's Signature Clash",        tier:'INV', emoji:'✍️'},
    {month:1, index:1, name:'Genesis Premier Championship',      tier:'PC',  emoji:'🎆'},
    {month:1, index:2, name:'New Year Rising Star',              tier:'RS',  emoji:'⚡'},
    {month:1, index:3, name:'Rookie Circuit',                    tier:'RC',  emoji:'🎯'},
    // FEVEREIRO (3 torneios)
    {month:2, index:0, name:'Prismatic Nexus Elite Masters',     tier:'EM', emoji:'💎'},
    {month:2, index:1, name:'Vortex Coliseum Elite Masters',     tier:'EM', emoji:'🌀'},
    {month:2, index:2, name:'Winter Regional Circuit',           tier:'RC', emoji:'❄️'},
    // MARÇO (3 torneios)
    {month:3, index:0, name:'Continental War',                   tier:'SP', emoji:'🎪'},
    {month:3, index:1, name:'Spring Rising Star',                tier:'RS', emoji:'⚡'},
    {month:3, index:2, name:'Continental Qualifiers',            tier:'RC', emoji:'🌍'},
    // ABRIL (2 torneios)
    {month:4, index:0, name:'Vernal Premier Championship',       tier:'PC', emoji:'🌸'},
    {month:4, index:1, name:'Spring Circuit',                    tier:'RC', emoji:'🌱'},
    // MAIO (3 torneios)
    {month:5, index:0, name:'Storm Track Elite Masters',         tier:'EM', emoji:'⛈️'},
    {month:5, index:1, name:'Killer Sides Elite Masters',        tier:'EM', emoji:'⚔️'},
    {month:5, index:2, name:'Mediterranean Rising Star',         tier:'RS', emoji:'🌊'},
    // JUNHO (3 torneios)
    {month:6, index:0, name:'Mid-Season Invitational',           tier:'SP', emoji:'🌴'},
    {month:6, index:1, name:'Pre-Zenith Rising Star',            tier:'RS', emoji:'⚡'},
    {month:6, index:2, name:'Last Chance Qualifier',             tier:'SP', emoji:'🎯'},
    // JULHO (2 torneios)
    {month:7, index:0, name:'Zenith Premier Championship',       tier:'PC', emoji:'🏆'},
    {month:7, index:1, name:'Summer Classic Circuit',            tier:'RC', emoji:'☀️'},
    // AGOSTO (5 torneios — Crossover Open novo como index 0)
    {month:8, index:0, name:'The Crossover Open',                tier:'OPN', emoji:'🌐'},
    {month:8, index:1, name:'Tidal Surge Elite Masters',         tier:'EM',  emoji:'🌊'},
    {month:8, index:2, name:'Carnage Colosseum Elite Masters',   tier:'EM',  emoji:'🏛️'},
    {month:8, index:3, name:'Summer Slam Rising Star',           tier:'RS',  emoji:'⚡'},
    {month:8, index:4, name:'All-Star Skills Competition',       tier:'SP',  emoji:'⭐'},
    // SETEMBRO (3 torneios)
    {month:9, index:0, name:'Domination Zones Elite Masters',    tier:'EM', emoji:'🎯'},
    {month:9, index:1, name:'Pinball Inferno Elite Masters',     tier:'EM', emoji:'🎰'},
    {month:9, index:2, name:'Autumn Classic Circuit',            tier:'RC', emoji:'🍂'},
    // OUTUBRO (4 torneios)
    {month:10,index:0, name:'Pangea Platform Elite Masters',     tier:'EM', emoji:'🌍'},
    {month:10,index:1, name:'BB-10 Competitive Elite Masters',   tier:'EM', emoji:'🏟️'},
    {month:10,index:2, name:'Halloween Havoc Rising Star',       tier:'RS', emoji:'🎃'},
    {month:10,index:3, name:'Last Chance Circuit',               tier:'RC', emoji:'🔥'},
    // NOVEMBRO (3 torneios)
    {month:11,index:0, name:'Apex Premier Championship',         tier:'PC', emoji:'🗽'},
    {month:11,index:1, name:'Championship Chase',                tier:'CH', emoji:'⚡'},
    {month:11,index:2, name:'Pre-Finals Warm-up Circuit',        tier:'RC', emoji:'🎯'},
    // DEZEMBRO (3 torneios)
    {month:12,index:0, name:'Grand Finals',                      tier:'FI', emoji:'👑'},
    {month:12,index:1, name:'Champions Exhibition',              tier:'SP', emoji:'🎪'},
    {month:12,index:2, name:'New Generation Showcase',           tier:'RC', emoji:'✨'},
  ];
  
  const monthNames = ['','Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  
  const getTournamentChampion = (t) => {
    if (!universeManager) return null;
    const key = `${currentYear}-${t.month}-${t.index}`;
    const data = universeManager.tournamentHistory.get(key);
    if (data?.completed && data.champion!==undefined) return TEAMS[data.champion];
    return null;
  };
  
  const isTournamentPast = (t) => {
    return t.month < currentMonth;
  };
  
  const isTournamentCurrent = (t) => {
    return t.month === currentMonth;
  };
  
  return (
    <div>
      <div className="hub-section-label">
        📋 TODOS OS TORNEIOS — {allTournaments.length} EVENTOS • {currentYear}
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
        {allTournaments.map((t, idx) => {
          const meta = tierMeta[t.tier] || tierMeta['M'];
          const champ = getTournamentChampion(t);
          const isPast = isTournamentPast(t);
          const isCurrent = isTournamentCurrent(t);
          
          return (
            <div
              key={`${t.month}-${t.index}`}
              className="tourn-row"
              style={{
                opacity: isPast ? 0.6 : 1,
                borderColor: isCurrent ? 'rgba(255,215,0,0.25)' : 'rgba(255,255,255,0.06)',
                background: isCurrent ? 'rgba(255,215,0,0.04)' : 'rgba(255,255,255,0.02)',
                animation:`hub-entry .4s ease ${idx * 0.02}s both`
              }}
            >
              {/* Mês */}
              <div style={{
                fontFamily:'Orbitron,monospace',
                fontSize:9, fontWeight:700,
                letterSpacing:'.1em',
                color: isCurrent ? '#ffd700' : 'rgba(255,255,255,0.3)',
                minWidth:32
              }}>
                {monthNames[t.month]}
              </div>
              
              {/* Emoji */}
              <span style={{ fontSize:18, minWidth:24 }}>{t.emoji}</span>
              
              {/* Nome */}
              <div style={{ flex:1 }}>
                <div style={{
                  fontFamily:'Rajdhani,sans-serif',
                  fontWeight:700,
                  fontSize:14,
                  color: isCurrent ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.85)'
                }}>
                  {t.name}
                </div>
              </div>
              
              {/* Campeão (se torneio já aconteceu) */}
              {champ && (
                <div style={{
                  display:'flex',
                  alignItems:'center',
                  gap:8,
                  padding:'6px 12px',
                  border:'1px solid rgba(255,215,0,0.3)',
                  clipPath:'polygon(4px 0%,100% 0%,calc(100% - 4px) 100%,0% 100%)',
                  background:'rgba(255,215,0,0.06)',
                  marginRight:8
                }}>
                  <span style={{fontSize:12}}>🏆</span>
                  <img
                    src={champ.iconUrl||champ.photoUrl}
                    alt=""
                    onError={e=>{e.target.src=champ.photoUrl;}}
                    style={{
                      width:24, height:24,
                      borderRadius:'50%',
                      objectFit:'cover',
                      border:`2px solid ${champ.colors?.[0] || '#ffd700'}44`
                    }}
                  />
                  <div>
                    <div style={{
                      fontFamily:'Orbitron,monospace',
                      fontSize:7, letterSpacing:'.12em',
                      color:'rgba(255,215,0,0.7)'
                    }}>
                      CAMPEÃO
                    </div>
                    <div style={{
                      fontFamily:'Rajdhani,sans-serif',
                      fontWeight:700,
                      fontSize:11,
                      color:'rgba(255,255,255,0.85)'
                    }}>
                      {champ.name.replace(/"[^"]*"\s*/,'').split(' ').slice(0,2).join(' ')}
                    </div>
                  </div>
                </div>
              )}
              
              {/* Pontos */}
              <div style={{ textAlign:'right', minWidth:60 }}>
                <div style={{
                  fontFamily:'Orbitron,monospace',
                  fontSize:13, fontWeight:700,
                  color:meta.color
                }}>
                  {meta.pts}
                </div>
                <div style={{
                  fontFamily:'Orbitron,monospace',
                  fontSize:7, letterSpacing:'.1em',
                  color:'rgba(255,255,255,0.2)'
                }}>
                  PTS
                </div>
              </div>
              
              {/* Tier Badge */}
              <div className={`tier-badge ${meta.cls}`}>
                {t.tier}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ============================================
// RANKINGS VIEW
// ============================================
const RankingsView = ({ rankings: bbpRankings, onNavigate, universeManager }) => {
  const [rankTab, setRankTab] = useState('bbp'); // 'bbp' | 'season' | 'historical'

  // Build season & historical rankings in same shape as bbpRankings
  const seasonRankings = universeManager
    ? universeManager.getSeasonRanking().map(entry => ({
        ...TEAMS[entry.playerId],
        rank: 0,
        bbpPoints: entry.points,
        playerId: entry.playerId,
      })).sort((a,b) => b.bbpPoints - a.bbpPoints).map((p,i) => ({...p, rank:i+1}))
    : [];

  const historicalRankings = universeManager
    ? universeManager.getHistoricalRanking().map(entry => ({
        ...TEAMS[entry.playerId],
        rank: 0,
        bbpPoints: entry.points,
        playerId: entry.playerId,
      })).sort((a,b) => b.bbpPoints - a.bbpPoints).map((p,i) => ({...p, rank:i+1}))
    : [];

  const rankings = rankTab === 'bbp' ? bbpRankings : rankTab === 'season' ? seasonRankings : historicalRankings;

  const currentYear = universeManager?.currentYear || '';

  // Tab accent config
  const tabCfg = {
    bbp:        { color: '#ffd700', glow: 'rgba(255,215,0,0.25)',  label: '🏆 BBP',        sub: 'ÚLTIMAS 52 SEMANAS · EXPIRA EM 18 MESES' },
    season:     { color: '#60a5fa', glow: 'rgba(96,165,250,0.25)', label: '📅 TEMPORADA',  sub: `PONTOS DE ${currentYear} · ZERA EM JANEIRO` },
    historical: { color: '#c084fc', glow: 'rgba(192,132,252,0.25)',label: '🌟 CARREIRA',   sub: 'ALL-TIME · REGISTRO PERMANENTE' },
  };
  const cfg = tabCfg[rankTab];

  const handlePlayerClick = (player) => onNavigate && onNavigate('PLAYER_PROFILE', player.playerId);
  const rankColors = {0:'#ffd700',1:'#cbd5e1',2:'#c97c3a',3:'#60a5fa'};
  return (
    <div style={{ animation:'hub-entry .4s ease both' }}>
      <div style={{ marginBottom:20 }}>
        <div style={{ fontFamily:'Black Ops One,cursive', fontSize:'clamp(24px,3vw,38px)', lineHeight:1, background:'linear-gradient(180deg,#fff 0%,#ffd700 50%,#ff8c00 100%)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', filter:'drop-shadow(0 0 16px rgba(255,165,0,0.35))', marginBottom:10 }}>BBP RANKINGS</div>

        {/* ── SUB-ABAS ── */}
        <div style={{ display:'flex', gap:0, borderRadius:8, overflow:'hidden', border:'1px solid rgba(255,255,255,0.1)', marginBottom:10 }}>
          {Object.entries(tabCfg).map(([id, t]) => (
            <button
              key={id}
              onClick={() => setRankTab(id)}
              style={{
                flex:1,
                padding:'8px 4px',
                background: rankTab===id ? `${t.color}22` : 'rgba(255,255,255,0.03)',
                border:'none',
                borderRight: id !== 'historical' ? '1px solid rgba(255,255,255,0.08)' : 'none',
                borderBottom: rankTab===id ? `2px solid ${t.color}` : '2px solid transparent',
                color: rankTab===id ? t.color : 'rgba(255,255,255,0.35)',
                fontFamily:'Orbitron,monospace',
                fontSize:9,
                fontWeight:700,
                letterSpacing:'.1em',
                cursor:'pointer',
                transition:'all .2s',
                whiteSpace:'nowrap',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div style={{ fontFamily:'Orbitron,monospace', fontSize:9, letterSpacing:'.25em', color: cfg.color, opacity:.55 }}>{cfg.sub}</div>
      </div>

      {/* Top 4 */}
      <div style={{ marginBottom:16 }}>
        <div className="hub-section-label">🏆 TOP 4 — GRAND FINALS GARANTIDO</div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8 }}>
          {rankings.slice(0,4).map((player,idx) => {
            const pColor = player.colors?.[0]||'#ffd700';
            return (
              <div key={idx} className="top4-card" onClick={() => handlePlayerClick(player)} style={{ borderColor:`${pColor}33` }}
                onMouseEnter={e=>{e.currentTarget.style.borderColor=`${pColor}66`;e.currentTarget.style.boxShadow=`0 0 20px ${pColor}22`;}}
                onMouseLeave={e=>{e.currentTarget.style.borderColor=`${pColor}33`;e.currentTarget.style.boxShadow='';}}>
                <div style={{ fontFamily:'Black Ops One,cursive', fontSize:26, color:rankColors[idx]||'#60a5fa', lineHeight:1 }}>#{idx+1}</div>
                <img src={player.iconUrl||player.photoUrl} alt="" onError={e=>{e.target.src=player.photoUrl;}} style={{ width:52, height:52, borderRadius:'50%', objectFit:'cover', border:`2px solid ${pColor}55`, boxShadow:`0 0 12px ${pColor}44` }} />
                <div style={{ fontFamily:'Rajdhani,sans-serif', fontWeight:700, fontSize:12, color:'rgba(255,255,255,0.9)', lineHeight:1.2 }}>{player.name.replace(/"[^"]*"\s*/,'').split(' ').slice(0,2).join(' ')}</div>
                <div style={{ fontSize:11 }}>{player.country.split(' ')[0]}</div>
                <div style={{ fontFamily:'Orbitron,monospace', fontSize:13, fontWeight:700, color:rankColors[idx]||'#60a5fa' }}>{player.bbpPoints||0}<span style={{fontSize:8,opacity:.6,marginLeft:3}}>PTS</span></div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ height:1, background:`linear-gradient(90deg,${cfg.color}44,transparent)`, marginBottom:16 }} />

      {/* Ranks 5-8 */}
      <div style={{ marginBottom:16 }}>
        <div className="hub-section-label" style={{ color:`${cfg.color}88` }}>◆ RANKS 5–8 — FINALS RACE ELEGÍVEL</div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8 }}>
          {rankings.slice(4,8).map((player,idx) => {
            const pColor = player.colors?.[0]||'#60a5fa';
            return (
              <div key={idx} className="top4-card" onClick={() => handlePlayerClick(player)} style={{ borderColor:'rgba(96,165,250,0.2)' }}
                onMouseEnter={e=>{e.currentTarget.style.borderColor='rgba(96,165,250,0.45)';}}
                onMouseLeave={e=>{e.currentTarget.style.borderColor='rgba(96,165,250,0.2)';}}>
                <div style={{ fontFamily:'Black Ops One,cursive', fontSize:22, color:'#60a5fa', lineHeight:1 }}>#{idx+5}</div>
                <img src={player.iconUrl||player.photoUrl} alt="" onError={e=>{e.target.src=player.photoUrl;}} style={{ width:44, height:44, borderRadius:'50%', objectFit:'cover', border:`2px solid ${pColor}44` }} />
                <div style={{ fontFamily:'Rajdhani,sans-serif', fontWeight:700, fontSize:12, color:'rgba(255,255,255,0.85)', lineHeight:1.2 }}>{player.name.replace(/"[^"]*"\s*/,'').split(' ').slice(0,2).join(' ')}</div>
                <div style={{ fontSize:11 }}>{player.country.split(' ')[0]}</div>
                <div style={{ fontFamily:'Orbitron,monospace', fontSize:12, fontWeight:700, color:'#60a5fa' }}>{player.bbpPoints||0}<span style={{fontSize:8,opacity:.6,marginLeft:3}}>PTS</span></div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ height:1, background:`linear-gradient(90deg,${cfg.color}44,transparent)`, marginBottom:16 }} />

      {/* Top 32 */}
      <div style={{ marginBottom:16 }}>
        <div className="hub-section-label" style={{ color:`${cfg.color}88` }}>● TOP 32 — ELITE MASTERS ACCESS</div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:4 }}>
          {rankings.slice(0,32).map((player,idx) => {
            const isTop4=idx<4, isTop8=idx<8;
            const pColor=player.colors?.[0]||'#fff';
            const numColor=isTop4?'#ffd700':isTop8?cfg.color:'rgba(255,255,255,0.35)';
            return (
              <div key={idx} className="rank-row" onClick={() => handlePlayerClick(player)} style={{ borderColor:isTop4?'rgba(255,215,0,0.15)':isTop8?`${cfg.color}22`:'rgba(255,255,255,0.06)' }}>
                <div style={{ fontFamily:'Orbitron,monospace', fontSize:10, fontWeight:700, color:numColor, minWidth:28, textAlign:'center' }}>#{idx+1}</div>
                <img src={player.iconUrl||player.photoUrl} alt="" onError={e=>{e.target.src=player.photoUrl;}} style={{ width:28, height:28, borderRadius:'50%', objectFit:'cover', border:`1px solid ${pColor}33` }} />
                <div style={{ flex:1 }}>
                  <div style={{ fontFamily:'Rajdhani,sans-serif', fontWeight:700, fontSize:13, color:'rgba(255,255,255,0.85)' }}>{player.name.replace(/"[^"]*"\s*/,'').split(' ').slice(0,2).join(' ')}</div>
                  <div style={{ fontSize:10, color:'rgba(255,255,255,0.3)' }}>{player.country}</div>
                </div>
                <div style={{ fontFamily:'Orbitron,monospace', fontSize:12, fontWeight:700, color:isTop4?'#ffd700':isTop8?cfg.color:'rgba(255,255,255,0.5)' }}>{player.bbpPoints||0}</div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ height:1, background:'linear-gradient(90deg,rgba(255,255,255,0.1),transparent)', marginBottom:16 }} />

      {/* Others 33-64 */}
      <div>
        <div className="hub-section-label" style={{ color:'rgba(255,255,255,0.2)' }}>○ OUTROS COMPETIDORES — RANKS 33–64</div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:4 }}>
          {rankings.slice(32,64).map((player,idx) => {
            const pColor=player.colors?.[0]||'#fff';
            return (
              <div key={idx} className="rank-row" onClick={() => handlePlayerClick(player)}>
                <div style={{ fontFamily:'Orbitron,monospace', fontSize:10, fontWeight:700, color:'rgba(255,255,255,0.25)', minWidth:28, textAlign:'center' }}>#{idx+33}</div>
                <img src={player.iconUrl||player.photoUrl} alt="" onError={e=>{e.target.src=player.photoUrl;}} style={{ width:28, height:28, borderRadius:'50%', objectFit:'cover', border:`1px solid ${pColor}22`, opacity:.7 }} />
                <div style={{ flex:1 }}>
                  <div style={{ fontFamily:'Rajdhani,sans-serif', fontWeight:700, fontSize:13, color:'rgba(255,255,255,0.55)' }}>{player.name.replace(/"[^"]*"\s*/,'').split(' ').slice(0,2).join(' ')}</div>
                  <div style={{ fontSize:10, color:'rgba(255,255,255,0.2)' }}>{player.country}</div>
                </div>
                <div style={{ fontFamily:'Orbitron,monospace', fontSize:11, fontWeight:700, color:'rgba(255,255,255,0.35)' }}>{player.bbpPoints||0}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ============================================
// GERAL VIEW (COM SUB-ABAS)
// ============================================
const GeralView = ({ universeManager, currentYear, currentMonth }) => {
  const [subTab, setSubTab] = useState('news');
  
  return (
    <div style={{ animation:'hub-entry .4s ease both' }}>
      {/* Sub-Tabs */}
      <div style={{ display:'flex', gap:0, borderBottom:'1px solid rgba(255,255,255,0.08)', marginBottom:20 }}>
        <button
          className={`hub-tab ${subTab==='news'?'active':''}`}
          onClick={() => setSubTab('news')}
          style={{ padding:'10px 16px' }}
        >
          📰 NEWS
        </button>
        <button
          className={`hub-tab ${subTab==='proximos'?'active':''}`}
          onClick={() => setSubTab('proximos')}
          style={{ padding:'10px 16px' }}
        >
          🔜 PRÓXIMOS TORNEIOS
        </button>
      </div>
      
      {/* Sub-Tab Content */}
      {subTab === 'news' && <NewsSubView universeManager={universeManager} currentYear={currentYear} />}
      {subTab === 'proximos' && <ProximosTorneiosSubView universeManager={universeManager} currentYear={currentYear} currentMonth={currentMonth} />}
    </div>
  );
};

// ============================================
// NEWS SUB-VIEW
// ============================================
const NewsSubView = ({ universeManager, currentYear }) => {
  // Gerar notícias baseadas no histórico de torneios E no newsEngine
  const news = [];
  
  // ✅ ADICIONAR: Notícias do NewsEngine (inclui rivalidades!)
  if (universeManager.newsEngine && universeManager.newsEngine.newsHistory) {
    const engineNews = universeManager.newsEngine.newsHistory
      .filter(n => {
        const newsDate = new Date(n.timestamp);
        return newsDate.getFullYear() === currentYear;
      })
      .slice(0, 10); // Top 10 notícias
    
    engineNews.forEach(n => {
      const player1 = n.players?.[0] ? TEAMS[n.players[0]] : null;
      const player2 = n.players?.[1] ? TEAMS[n.players[1]] : null;
      
      news.push({
        id: n.id,
        type: n.category || n.type?.toLowerCase(),
        icon: n.icon || '📰',
        color: n.color || '#60a5fa',
        title: n.title,
        desc: n.description,
        timestamp: new Date(n.timestamp).toLocaleDateString('pt-BR'),
        player: player1,
        players: [player1, player2].filter(Boolean),
        stats: n.stats
      });
    });
  }
  
  // Pegar histórico de torneios
  const history = Array.from(universeManager.tournamentHistory.entries())
    .map(([key, data]) => ({ key, ...data }))
    .filter(t => t.completed && t.year === currentYear)
    .sort((a,b) => {
      const [ya,ma] = a.key.split('-').map(Number);
      const [yb,mb] = b.key.split('-').map(Number);
      return ya === yb ? mb - ma : yb - ya;
    });
  
  // Notícias de campeões
  history.slice(0,5).forEach((tournament, idx) => {
    const champ = TEAMS[tournament.champion];
    const tier = tournament.tier || 'ELITE_MASTERS';
    const tierLabels = {
      'PREMIER_CHAMPIONSHIP': 'Premier Championship',
      'GRAND_SLAM': 'Premier Championship',
      'ELITE_MASTERS': 'Elite Masters',
      'MASTERS': 'Elite Masters',
      'RISING_STAR': 'Rising Star',
      'REGIONAL_CIRCUIT': 'Regional Circuit',
      'CHAMPIONSHIP': 'Championship',
      'SPECIAL': 'Special Event',
      'GRAND_FINALS': 'Grand Finals'
    };
    
    news.push({
      id: `champ-${tournament.key}`,
      type: 'champion',
      icon: '🏆',
      color: '#ffd700',
      title: `${champ?.name.replace(/"[^"]*"\s*/,'')} conquista ${tierLabels[tier]}!`,
      desc: `Vitória épica no ${tournament.name || 'torneio'} - ${tournament.month}/${tournament.year}`,
      timestamp: `${tournament.month}/${tournament.year}`,
      player: champ,
    });
  });
  
  // Notícias de rivalidades (se houver players com muitos encontros)
  const rankings = universeManager.getBBPRanking();
  if (rankings.length >= 2) {
    news.push({
      id: 'rivalry-1',
      type: 'rivalry',
      icon: '⚔️',
      color: '#ef4444',
      title: 'Rivalidade esquenta no topo!',
      desc: `${TEAMS[rankings[0].playerId]?.name.replace(/"[^"]*"\s*/,'')} e ${TEAMS[rankings[1].playerId]?.name.replace(/"[^"]*"\s*/,'')} dominam a temporada`,
      timestamp: `${currentYear}`,
    });
  }
  
  // Notícia de mudança de ranking (se houver)
  if (rankings.length >= 4) {
    const top4 = rankings.slice(0,4).map(r => TEAMS[r.playerId]);
    news.push({
      id: 'ranking-shift',
      type: 'ranking',
      icon: '📊',
      color: '#60a5fa',
      title: 'Mudanças no Top 4!',
      desc: `Novo cenário competitivo com ${top4[0]?.name.replace(/"[^"]*"\s*/,'')} liderando`,
      timestamp: `${currentYear}`,
    });
  }
  
  // Notícia de dinastia (se alguém ganhou múltiplos torneios)
  const champCounts = {};
  history.forEach(t => {
    if (t.champion !== undefined) {
      champCounts[t.champion] = (champCounts[t.champion] || 0) + 1;
    }
  });
  const multiChamps = Object.entries(champCounts).filter(([_, count]) => count >= 2);
  if (multiChamps.length > 0) {
    const [playerId, count] = multiChamps[0];
    const player = TEAMS[playerId];
    news.push({
      id: 'dynasty',
      type: 'dynasty',
      icon: '👑',
      color: '#c084fc',
      title: `${player?.name.replace(/"[^"]*"\s*/,'')} estabelece dinastia!`,
      desc: `${count} títulos conquistados nesta temporada`,
      timestamp: `${currentYear}`,
      player: player,
    });
  }
  
  if (news.length === 0) {
    return (
      <div style={{ textAlign:'center', padding:'60px 0', color:'rgba(255,255,255,0.3)' }}>
        <div style={{ fontSize:40, marginBottom:12 }}>📰</div>
        <div style={{ fontFamily:'Orbitron,monospace', fontSize:12, letterSpacing:'.2em' }}>
          Nenhuma notícia ainda
        </div>
      </div>
    );
  }
  
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
      {news.map((item, idx) => (
        <div
          key={item.id}
          className="hub-card"
          style={{
            padding:'18px 20px',
            borderColor:`${item.color}33`,
            animation:`hub-entry .4s ease ${idx * 0.05}s both`,
            cursor:'pointer'
          }}
          onMouseEnter={e => e.currentTarget.style.borderColor = `${item.color}66`}
          onMouseLeave={e => e.currentTarget.style.borderColor = `${item.color}33`}
        >
          <div style={{ display:'flex', alignItems:'flex-start', gap:16 }}>
            <div style={{
              fontSize:32,
              width:50, height:50,
              display:'flex', alignItems:'center', justifyContent:'center',
              border:`2px solid ${item.color}44`,
              borderRadius:'50%',
              background:`${item.color}11`,
              flexShrink:0
            }}>
              {item.icon}
            </div>
            
            <div style={{ flex:1 }}>
              <div style={{
                fontFamily:'Rajdhani,sans-serif',
                fontWeight:700,
                fontSize:16,
                color:`rgba(255,255,255,0.95)`,
                marginBottom:4,
                lineHeight:1.3
              }}>
                {item.title}
              </div>
              
              <div style={{
                fontFamily:'Rajdhani,sans-serif',
                fontSize:13,
                color:'rgba(255,255,255,0.5)',
                marginBottom:8
              }}>
                {item.desc}
              </div>
              
              {item.player && (
                <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:10 }}>
                  <img
                    src={item.player.iconUrl || item.player.photoUrl}
                    alt=""
                    onError={e => { e.target.src = item.player.photoUrl; }}
                    style={{
                      width:32, height:32,
                      borderRadius:'50%',
                      objectFit:'cover',
                      border:`2px solid ${item.player.colors?.[0] || item.color}44`
                    }}
                  />
                  <div>
                    <div style={{
                      fontFamily:'Rajdhani,sans-serif',
                      fontWeight:700,
                      fontSize:12,
                      color:'rgba(255,255,255,0.85)'
                    }}>
                      {item.player.name.replace(/"[^"]*"\s*/,'').split(' ').slice(0,2).join(' ')}
                    </div>
                    <div style={{
                      fontSize:10,
                      color:'rgba(255,255,255,0.4)'
                    }}>
                      {item.player.country}
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <div style={{
              fontFamily:'Orbitron,monospace',
              fontSize:9,
              letterSpacing:'.12em',
              color:'rgba(255,255,255,0.3)',
              textAlign:'right',
              minWidth:60
            }}>
              {item.timestamp}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

// ============================================
// PRÓXIMOS TORNEIOS SUB-VIEW
// ============================================
const ProximosTorneiosSubView = ({ universeManager, currentYear, currentMonth }) => {
  const allTournaments = [
    // JANEIRO (4 torneios — Invitational novo como index 0)
    {month:1, index:0, name:"New Year's Signature Clash",        tier:'INV', emoji:'✍️'},
    {month:1, index:1, name:'Genesis Premier Championship',      tier:'PC',  emoji:'🎆'},
    {month:1, index:2, name:'New Year Rising Star',              tier:'RS',  emoji:'⚡'},
    {month:1, index:3, name:'Rookie Circuit',                    tier:'RC',  emoji:'🎯'},
    // FEVEREIRO (3 torneios)
    {month:2, index:0, name:'Prismatic Nexus Elite Masters',     tier:'EM', emoji:'💎'},
    {month:2, index:1, name:'Vortex Coliseum Elite Masters',     tier:'EM', emoji:'🌀'},
    {month:2, index:2, name:'Winter Regional Circuit',           tier:'RC', emoji:'❄️'},
    // MARÇO (3 torneios)
    {month:3, index:0, name:'Continental War',                   tier:'SP', emoji:'🎪'},
    {month:3, index:1, name:'Spring Rising Star',                tier:'RS', emoji:'⚡'},
    {month:3, index:2, name:'Continental Qualifiers',            tier:'RC', emoji:'🌍'},
    // ABRIL (2 torneios)
    {month:4, index:0, name:'Vernal Premier Championship',       tier:'PC', emoji:'🌸'},
    {month:4, index:1, name:'Spring Circuit',                    tier:'RC', emoji:'🌱'},
    // MAIO (3 torneios)
    {month:5, index:0, name:'Storm Track Elite Masters',         tier:'EM', emoji:'⛈️'},
    {month:5, index:1, name:'Killer Sides Elite Masters',        tier:'EM', emoji:'⚔️'},
    {month:5, index:2, name:'Mediterranean Rising Star',         tier:'RS', emoji:'🌊'},
    // JUNHO (3 torneios)
    {month:6, index:0, name:'Mid-Season Invitational',           tier:'SP', emoji:'🌴'},
    {month:6, index:1, name:'Pre-Zenith Rising Star',            tier:'RS', emoji:'⚡'},
    {month:6, index:2, name:'Last Chance Qualifier',             tier:'SP', emoji:'🎯'},
    // JULHO (2 torneios)
    {month:7, index:0, name:'Zenith Premier Championship',       tier:'PC', emoji:'🏆'},
    {month:7, index:1, name:'Summer Classic Circuit',            tier:'RC', emoji:'☀️'},
    // AGOSTO (5 torneios — Crossover Open novo como index 0)
    {month:8, index:0, name:'The Crossover Open',                tier:'OPN', emoji:'🌐'},
    {month:8, index:1, name:'Tidal Surge Elite Masters',         tier:'EM',  emoji:'🌊'},
    {month:8, index:2, name:'Carnage Colosseum Elite Masters',   tier:'EM',  emoji:'🏛️'},
    {month:8, index:3, name:'Summer Slam Rising Star',           tier:'RS',  emoji:'⚡'},
    {month:8, index:4, name:'All-Star Skills Competition',       tier:'SP',  emoji:'⭐'},
    // SETEMBRO (3 torneios)
    {month:9, index:0, name:'Domination Zones Elite Masters',    tier:'EM', emoji:'🎯'},
    {month:9, index:1, name:'Pinball Inferno Elite Masters',     tier:'EM', emoji:'🎰'},
    {month:9, index:2, name:'Autumn Classic Circuit',            tier:'RC', emoji:'🍂'},
    // OUTUBRO (4 torneios)
    {month:10,index:0, name:'Pangea Platform Elite Masters',     tier:'EM', emoji:'🌍'},
    {month:10,index:1, name:'BB-10 Competitive Elite Masters',   tier:'EM', emoji:'🏟️'},
    {month:10,index:2, name:'Halloween Havoc Rising Star',       tier:'RS', emoji:'🎃'},
    {month:10,index:3, name:'Last Chance Circuit',               tier:'RC', emoji:'🔥'},
    // NOVEMBRO (3 torneios)
    {month:11,index:0, name:'Apex Premier Championship',         tier:'PC', emoji:'🗽'},
    {month:11,index:1, name:'Championship Chase',                tier:'CH', emoji:'⚡'},
    {month:11,index:2, name:'Pre-Finals Warm-up Circuit',        tier:'RC', emoji:'🎯'},
    // DEZEMBRO (3 torneios)
    {month:12,index:0, name:'Grand Finals',                      tier:'FI', emoji:'👑'},
    {month:12,index:1, name:'Champions Exhibition',              tier:'SP', emoji:'🎪'},
    {month:12,index:2, name:'New Generation Showcase',           tier:'RC', emoji:'✨'},
  ];
  
  // Filtrar apenas torneios futuros
  const upcomingTournaments = allTournaments.filter(t => {
    return t.month > currentMonth || (t.month === currentMonth);
  }).filter(t => {
    // Verificar se não foi completado ainda
    const key = `${currentYear}-${t.month}-${t.index}`;
    const data = universeManager.tournamentHistory.get(key);
    return !data || !data.completed;
  });
  
  if (upcomingTournaments.length === 0) {
    return (
      <div style={{ textAlign:'center', padding:'60px 0', color:'rgba(255,255,255,0.3)' }}>
        <div style={{ fontSize:40, marginBottom:12 }}>🏁</div>
        <div style={{ fontFamily:'Orbitron,monospace', fontSize:12, letterSpacing:'.2em' }}>
          Todos os torneios da temporada foram concluídos
        </div>
      </div>
    );
  }
  
  return (
    <div>
      <div className="hub-section-label">
        📅 PRÓXIMOS TORNEIOS — {upcomingTournaments.length} EVENTOS
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
        {upcomingTournaments.map((t, idx) => {
          const meta = tierMeta[t.tier] || tierMeta['M'];
          const monthNames = ['','Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
          
          return (
            <div
              key={`${t.month}-${t.index}`}
              className="tourn-row"
              style={{ animation:`hub-entry .4s ease ${idx * 0.03}s both` }}
            >
              <div style={{
                fontFamily:'Orbitron,monospace',
                fontSize:9, fontWeight:700,
                letterSpacing:'.1em',
                color:'rgba(255,255,255,0.3)',
                minWidth:32
              }}>
                {monthNames[t.month]}
              </div>
              
              <span style={{ fontSize:18, minWidth:24 }}>{t.emoji}</span>
              
              <div style={{ flex:1 }}>
                <div style={{
                  fontFamily:'Rajdhani,sans-serif',
                  fontWeight:700,
                  fontSize:14,
                  color:'rgba(255,255,255,0.9)'
                }}>
                  {t.name}
                </div>
              </div>
              
              <div style={{ textAlign:'right', minWidth:60 }}>
                <div style={{
                  fontFamily:'Orbitron,monospace',
                  fontSize:13, fontWeight:700,
                  color:meta.color
                }}>
                  {meta.pts}
                </div>
                <div style={{
                  fontFamily:'Orbitron,monospace',
                  fontSize:7, letterSpacing:'.1em',
                  color:'rgba(255,255,255,0.2)'
                }}>
                  PTS
                </div>
              </div>
              
              <div className={`tier-badge ${meta.cls}`}>
                {t.tier}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ============================================
// NOTÍCIAS VIEW
// ============================================
const NoticiasView = ({ universeManager, rankings, currentYear }) => {
  // Gerar todas as notícias da temporada
  const allNews = [];
  
  // Histórico de torneios
  const history = Array.from(universeManager.tournamentHistory.entries())
    .map(([key, data]) => ({ key, ...data }))
    .filter(t => t.completed && t.year === currentYear)
    .sort((a,b) => {
      const [ya,ma] = a.key.split('-').map(Number);
      const [yb,mb] = b.key.split('-').map(Number);
      return ya === yb ? mb - ma : yb - ya;
    });
  
  // Notícias de cada torneio
  history.forEach(tournament => {
    const champ = TEAMS[tournament.champion];
    const tier = tournament.tier || 'ELITE_MASTERS';
    const tierLabels = {
      'PREMIER_CHAMPIONSHIP': 'Premier Championship',
      'GRAND_SLAM': 'Premier Championship',
      'ELITE_MASTERS': 'Elite Masters',
      'MASTERS': 'Elite Masters',
      'RISING_STAR': 'Rising Star',
      'REGIONAL_CIRCUIT': 'Regional Circuit',
      'CHAMPIONSHIP': 'Championship',
      'SPECIAL': 'Special Event',
      'GRAND_FINALS': 'Grand Finals'
    };
    const tierColors = {
      'PREMIER_CHAMPIONSHIP': '#ffd700',
      'GRAND_SLAM': '#ffd700',
      'ELITE_MASTERS': '#c084fc',
      'MASTERS': '#c084fc',
      'RISING_STAR': '#60a5fa',
      'REGIONAL_CIRCUIT': '#94a3b8',
      'CHAMPIONSHIP': '#60a5fa',
      'SPECIAL': '#34d399',
      'GRAND_FINALS': '#f87171'
    };
    
    allNews.push({
      id: `champ-${tournament.key}`,
      type: 'tournament',
      icon: '🏆',
      color: tierColors[tier] || '#ffd700',
      title: `${champ?.name.replace(/"[^"]*"\s*/,'')} vence ${tierLabels[tier]}!`,
      desc: `Campeão do ${tournament.name || 'torneio'}`,
      timestamp: `${tournament.month}/${tournament.year}`,
      month: tournament.month,
      player: champ,
      tier: tierLabels[tier]
    });
  });
  
  // Notícia de líder do ranking
  if (rankings.length > 0) {
    const leader = TEAMS[rankings[0].playerId];
    allNews.push({
      id: 'ranking-leader',
      type: 'ranking',
      icon: '👑',
      color: '#ffd700',
      title: `${leader?.name.replace(/"[^"]*"\s*/,'')} lidera o ranking BBP!`,
      desc: `${rankings[0].points} pontos no total`,
      timestamp: `${currentYear}`,
      month: 99, // Para aparecer por último
      player: leader
    });
  }
  
  // Notícias de rivalidades
  if (rankings.length >= 2) {
    allNews.push({
      id: 'top-rivalry',
      type: 'rivalry',
      icon: '⚔️',
      color: '#ef4444',
      title: 'Batalha pelo topo!',
      desc: `${TEAMS[rankings[0].playerId]?.name.replace(/"[^"]*"\s*/,'')} vs ${TEAMS[rankings[1].playerId]?.name.replace(/"[^"]*"\s*/,'')} - diferença de ${Math.abs(rankings[0].points - rankings[1].points)} pontos`,
      timestamp: `${currentYear}`,
      month: 98
    });
  }
  
  // Dinastias
  const champCounts = {};
  history.forEach(t => {
    if (t.champion !== undefined) {
      champCounts[t.champion] = (champCounts[t.champion] || 0) + 1;
    }
  });
  Object.entries(champCounts)
    .filter(([_, count]) => count >= 2)
    .forEach(([playerId, count]) => {
      const player = TEAMS[playerId];
      allNews.push({
        id: `dynasty-${playerId}`,
        type: 'dynasty',
        icon: '🔥',
        color: '#c084fc',
        title: `${player?.name.replace(/"[^"]*"\s*/,'')} em sequência vitoriosa!`,
        desc: `${count} títulos conquistados nesta temporada`,
        timestamp: `${currentYear}`,
        month: 97,
        player: player
      });
    });
  
  // Ordenar por mês (mais recentes primeiro)
  allNews.sort((a, b) => b.month - a.month);
  
  if (allNews.length === 0) {
    return (
      <div style={{ animation:'hub-entry .4s ease both', textAlign:'center', padding:'80px 0' }}>
        <div style={{ fontSize:48, marginBottom:16 }}>📰</div>
        <div style={{ fontFamily:'Orbitron,monospace', fontSize:14, letterSpacing:'.3em', color:'rgba(255,255,255,0.25)', marginBottom:8 }}>NOTÍCIAS</div>
        <div style={{ fontFamily:'Rajdhani,sans-serif', fontSize:14, color:'rgba(255,255,255,0.3)' }}>Aguardando os primeiros eventos da temporada...</div>
      </div>
    );
  }
  
  return (
    <div style={{ animation:'hub-entry .4s ease both' }}>
      <div style={{ marginBottom:20 }}>
        <div style={{
          fontFamily:'Black Ops One,cursive',
          fontSize:'clamp(24px,3vw,38px)',
          lineHeight:1,
          background:'linear-gradient(180deg,#fff 0%,#ffd700 50%,#ff8c00 100%)',
          WebkitBackgroundClip:'text',
          WebkitTextFillColor:'transparent',
          filter:'drop-shadow(0 0 16px rgba(255,165,0,0.35))',
          marginBottom:6
        }}>
          NOTÍCIAS DA TEMPORADA
        </div>
        <div style={{
          fontFamily:'Orbitron,monospace',
          fontSize:9, letterSpacing:'.25em',
          color:'rgba(255,255,255,0.25)'
        }}>
          {allNews.length} HISTÓRIAS • {currentYear}
        </div>
      </div>
      
      <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
        {allNews.map((item, idx) => (
          <div
            key={item.id}
            className="hub-card"
            style={{
              padding:'18px 20px',
              borderColor:`${item.color}33`,
              animation:`hub-entry .4s ease ${idx * 0.04}s both`
            }}
            onMouseEnter={e => e.currentTarget.style.borderColor = `${item.color}66`}
            onMouseLeave={e => e.currentTarget.style.borderColor = `${item.color}33`}
          >
            <div style={{ display:'flex', alignItems:'flex-start', gap:16 }}>
              <div style={{
                fontSize:32,
                width:50, height:50,
                display:'flex', alignItems:'center', justifyContent:'center',
                border:`2px solid ${item.color}44`,
                borderRadius:'50%',
                background:`${item.color}11`,
                flexShrink:0
              }}>
                {item.icon}
              </div>
              
              <div style={{ flex:1 }}>
                {item.tier && (
                  <div style={{
                    fontFamily:'Orbitron,monospace',
                    fontSize:8, fontWeight:700,
                    letterSpacing:'.15em',
                    color:item.color,
                    marginBottom:4
                  }}>
                    {item.tier.toUpperCase()}
                  </div>
                )}
                
                <div style={{
                  fontFamily:'Rajdhani,sans-serif',
                  fontWeight:700,
                  fontSize:16,
                  color:'rgba(255,255,255,0.95)',
                  marginBottom:4,
                  lineHeight:1.3
                }}>
                  {item.title}
                </div>
                
                <div style={{
                  fontFamily:'Rajdhani,sans-serif',
                  fontSize:13,
                  color:'rgba(255,255,255,0.5)',
                  marginBottom:item.player ? 10 : 0
                }}>
                  {item.desc}
                </div>
                
                {item.player && (
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <img
                      src={item.player.iconUrl || item.player.photoUrl}
                      alt=""
                      onError={e => { e.target.src = item.player.photoUrl; }}
                      style={{
                        width:32, height:32,
                        borderRadius:'50%',
                        objectFit:'cover',
                        border:`2px solid ${item.player.colors?.[0] || item.color}44`
                      }}
                    />
                    <div>
                      <div style={{
                        fontFamily:'Rajdhani,sans-serif',
                        fontWeight:700,
                        fontSize:12,
                        color:'rgba(255,255,255,0.85)'
                      }}>
                        {item.player.name.replace(/"[^"]*"\s*/,'').split(' ').slice(0,2).join(' ')}
                      </div>
                      <div style={{
                        fontSize:10,
                        color:'rgba(255,255,255,0.4)'
                      }}>
                        {item.player.country}
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              <div style={{
                fontFamily:'Orbitron,monospace',
                fontSize:9,
                letterSpacing:'.12em',
                color:'rgba(255,255,255,0.3)',
                textAlign:'right',
                minWidth:60
              }}>
                {item.timestamp}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ============================================
// PLACEHOLDER VIEW (Em Construção)
// ============================================
// ============================================
// 🏛️ HALL OF FAME VIEW
// ============================================

const HOF_RETIREMENT_TYPES = {
  LEGENDARY: { label: 'LENDÁRIO',   color: '#ffd700', bg: 'rgba(255,215,0,0.15)',  icon: '👑' },
  NATURAL:   { label: 'NATURAL',    color: '#a0e0ff', bg: 'rgba(160,224,255,0.1)', icon: '🌅' },
  DECLINE:   { label: 'DECLÍNIO',   color: '#ff9900', bg: 'rgba(255,153,0,0.12)',  icon: '📉' },
  INJURY:    { label: 'LESÃO',      color: '#ff4444', bg: 'rgba(255,68,68,0.12)',  icon: '🩹' },
  PREMATURE: { label: 'PRECOCE',    color: '#c084fc', bg: 'rgba(192,132,252,0.12)',icon: '⚡' },
};

function generateNarrativePhrase(careerSummary, retirementType) {
  const { totalTitles = 0, peakRanking = 99, yearsActive = 0, totalWins = 0, totalMatches = 0 } = careerSummary || {};
  const wr = totalMatches > 0 ? Math.round((totalWins / totalMatches) * 100) : 0;

  if (retirementType === 'LEGENDARY') {
    if (totalTitles >= 10) return `Uma era definida por domínio absoluto — ${totalTitles} títulos e um legado que poucos ousarão igualar.`;
    if (totalTitles >= 5)  return `${totalTitles} títulos, ${yearsActive} anos de excelência. O nome que ficou gravado na história.`;
    return `Chegou ao topo e nunca olhou para trás. Uma carreira que transcendeu o esporte.`;
  }
  if (retirementType === 'INJURY') {
    if (totalTitles >= 3) return `${totalTitles} títulos antes de ser derrubado pelas lesões. O que poderia ter sido ainda assombra a imaginação.`;
    return `O corpo cedeu antes da hora. Uma carreira interrompida no auge, mas não esquecida.`;
  }
  if (retirementType === 'PREMATURE') {
    if (peakRanking <= 10) return `Surpreendeu o mundo ao se aposentar jovem — Top ${peakRanking} de pico, caminho ainda pela frente.`;
    return `Escolheu sair cedo demais. O burnout venceu o talento, mas a passagem foi marcante.`;
  }
  if (retirementType === 'DECLINE') {
    if (totalTitles >= 5) return `${totalTitles} títulos antes da queda. Lutou até o fim com a mesma garra que o consagrou.`;
    if (peakRanking <= 8) return `Viveu no topo (Top ${peakRanking}) e resistiu ao declínio mais tempo do que qualquer um esperava.`;
    return `Competiu até as últimas forças. Respeito à dedicação, mesmo no crepúsculo da carreira.`;
  }
  // NATURAL
  if (totalTitles >= 8)   return `${totalTitles} títulos, ${yearsActive} temporadas de pura dominância. Aposentou-se nos seus próprios termos.`;
  if (totalTitles >= 4)   return `Sólido, consistente e vitorioso. ${totalTitles} títulos e ${wr}% de aproveitamento falam por si.`;
  if (peakRanking <= 5)   return `Top ${peakRanking} de pico — a elite sentiu sua presença. Uma carreira honesta e bem vivida.`;
  if (yearsActive >= 10)  return `${yearsActive} anos no circuito. Poucos viram tanto, poucos resistiram tanto.`;
  return `Deu tudo o que tinha durante ${yearsActive || '?'} temporada${yearsActive === 1 ? '' : 's'}. O esporte é mais rico por ter passado por aqui.`;
}

function isHallOfFameWorthy(careerSummary, retirementType) {
  const { totalTitles = 0, peakRanking = 99 } = careerSummary || {};
  return retirementType === 'LEGENDARY' || peakRanking <= 5 || totalTitles >= 5;
}

const HallOfFameView = ({ universeManager }) => {
  const [subTab, setSubTab] = useState('hof');

  const retirementSystem = universeManager?.retirementSystem;
  const allRetired = React.useMemo(() => {
    if (!retirementSystem) return [];
    const result = [];
    retirementSystem.retiredPlayers.forEach((data, playerId) => {
      const basePlayer = TEAMS[playerId] || {};
      result.push({
        playerId,
        name: data.player?.name || basePlayer.name || `Jogador #${playerId}`,
        country: data.player?.country || basePlayer.country || '',
        photoUrl: data.player?.photoUrl || basePlayer.photoUrl,
        iconUrl: data.player?.iconUrl || basePlayer.iconUrl,
        colors: data.player?.colors || basePlayer.colors || ['#333','#666'],
        retirementType: data.type || 'NATURAL',
        careerSummary: data.careerSummary || {},
        retirementYear: data.retirementDate?.year || data.player?.retirement?.retirementYear || '?',
        age: data.player?.age,
      });
    });
    // Fallback: scan TEAMS directly for RETIRED players not caught by retirementSystem
    // RETIRED_AMATEUR = Rising Stars que nunca chegaram ao profissional — NÃO contam
    TEAMS.forEach((player, idx) => {
      if (player.status === 'RETIRED' && !retirementSystem.retiredPlayers.has(idx)) {
        result.push({
          playerId: idx,
          name: player.name,
          country: player.country || '',
          photoUrl: player.photoUrl,
          iconUrl: player.iconUrl,
          colors: player.colors || ['#333','#666'],
          retirementType: player.retirement?.retirementReason || 'NATURAL',
          careerSummary: player.retirement?.careerSummary || {},
          retirementYear: player.retirement?.retirementYear || '?',
          age: player.age,
        });
      }
    });
    return result.sort((a,b) => (b.retirementYear||0) - (a.retirementYear||0));
  }, [retirementSystem, universeManager]);

  const hofMembers = React.useMemo(() =>
    allRetired.filter(r => isHallOfFameWorthy(r.careerSummary, r.retirementType))
      .sort((a,b) => (a.careerSummary?.peakRanking||99) - (b.careerSummary?.peakRanking||99)),
    [allRetired]);

  const stats = React.useMemo(() => {
    const byType = {};
    allRetired.forEach(r => { byType[r.retirementType] = (byType[r.retirementType]||0) + 1; });
    const avgTitles = allRetired.length ? (allRetired.reduce((s,r)=>s+(r.careerSummary?.totalTitles||0),0)/allRetired.length).toFixed(1) : 0;
    const mostTitles = allRetired.reduce((best,r) => (r.careerSummary?.totalTitles||0) > (best?.careerSummary?.totalTitles||0) ? r : best, null);
    const longestCareer = allRetired.reduce((best,r) => (r.careerSummary?.yearsActive||0) > (best?.careerSummary?.yearsActive||0) ? r : best, null);
    return { byType, avgTitles, mostTitles, longestCareer, total: allRetired.length, hofCount: hofMembers.length };
  }, [allRetired, hofMembers]);

  const subTabs = [
    { id: 'hof',         label: '🏛️ HALL OF FAME',          count: hofMembers.length },
    { id: 'all',         label: '📋 APOSENTADOS',            count: allRetired.length },
    { id: 'rivalidades', label: '⚔️ RIVALIDADES LENDÁRIAS',  count: null },
    { id: 'legado',      label: '📊 LEGADO',                 count: null },
  ];

  return (
    <div style={{ animation:'hub-entry .4s ease both', padding:'0 28px 60px' }}>
      {/* Header */}
      <div style={{ textAlign:'center', padding:'40px 0 32px', position:'relative' }}>
        <div style={{ position:'absolute', top:0, left:'50%', transform:'translateX(-50%)', width:600, height:200, background:'radial-gradient(ellipse,rgba(255,215,0,0.06),transparent 70%)', pointerEvents:'none' }} />
        <div style={{ fontFamily:'Orbitron,monospace', fontSize:10, letterSpacing:'.5em', color:'rgba(255,215,0,0.5)', marginBottom:12, textTransform:'uppercase' }}>Eternamente Lembrados</div>
        <div style={{ fontFamily:'Black Ops One,cursive', fontSize:'clamp(32px,4vw,52px)', background:'linear-gradient(135deg,#fff 0%,#ffd700 40%,#ff9500 70%,#ffd700 100%)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', letterSpacing:'.04em', lineHeight:1 }}>
          HALL OF FAME
        </div>
        <div style={{ fontFamily:'Rajdhani,sans-serif', fontSize:14, color:'rgba(255,255,255,0.35)', marginTop:10 }}>
          {allRetired.length === 0 ? 'Nenhum aposentado ainda — simule temporadas para ver lendas nascerem.' : `${allRetired.length} carreira${allRetired.length===1?'':'s'} encerrada${allRetired.length===1?'':'s'} · ${hofMembers.length} imortai${hofMembers.length===1?'':'s'}`}
        </div>
      </div>

      {/* Sub-tabs */}
      <div style={{ display:'flex', gap:4, marginBottom:32, borderBottom:'1px solid rgba(255,215,0,0.1)', paddingBottom:0 }}>
        {subTabs.map(t => (
          <button key={t.id} onClick={()=>setSubTab(t.id)} style={{
            fontFamily:'Orbitron,monospace', fontSize:10, letterSpacing:'.15em', padding:'10px 20px',
            background: subTab===t.id ? 'rgba(255,215,0,0.12)' : 'transparent',
            color: subTab===t.id ? '#ffd700' : 'rgba(255,255,255,0.4)',
            border:'none', borderBottom: subTab===t.id ? '2px solid #ffd700' : '2px solid transparent',
            cursor:'pointer', transition:'all .2s', display:'flex', alignItems:'center', gap:8
          }}>
            {t.label}
            {t.count !== null && <span style={{ background:'rgba(255,215,0,0.15)', color:'#ffd700', fontSize:9, padding:'1px 6px', borderRadius:10 }}>{t.count}</span>}
          </button>
        ))}
      </div>

      {/* ─── SUB-TAB: HALL OF FAME ─── */}
      {subTab === 'hof' && (
        <div>
          {hofMembers.length === 0 ? (
            <div style={{ textAlign:'center', padding:'60px 0' }}>
              <div style={{ fontSize:48, marginBottom:16, opacity:.3 }}>🏛️</div>
              <div style={{ fontFamily:'Orbitron,monospace', fontSize:11, letterSpacing:'.3em', color:'rgba(255,255,255,0.2)' }}>NENHUM MEMBRO AINDA</div>
              <div style={{ fontFamily:'Rajdhani,sans-serif', fontSize:14, color:'rgba(255,255,255,0.2)', marginTop:8 }}>Critério: tipo LENDÁRIO, peak top 5 ou 5+ títulos</div>
            </div>
          ) : (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(340px,1fr))', gap:20 }}>
              {hofMembers.map((r, i) => {
                const type = HOF_RETIREMENT_TYPES[r.retirementType] || HOF_RETIREMENT_TYPES.NATURAL;
                const cs = r.careerSummary;
                const wr = cs.totalMatches > 0 ? Math.round((cs.totalWins/cs.totalMatches)*100) : 0;
                const phrase = generateNarrativePhrase(cs, r.retirementType);
                const isLegendary = r.retirementType === 'LEGENDARY';
                return (
                  <div key={r.playerId} style={{
                    position:'relative', borderRadius:16, overflow:'hidden',
                    background: isLegendary
                      ? 'linear-gradient(135deg,rgba(30,15,0,0.95) 0%,rgba(20,10,0,0.9) 100%)'
                      : 'linear-gradient(135deg,rgba(10,5,20,0.95) 0%,rgba(5,3,15,0.9) 100%)',
                    border: isLegendary ? '1px solid rgba(255,215,0,0.4)' : '1px solid rgba(255,255,255,0.08)',
                    animation: isLegendary ? 'hub-glow 3s ease-in-out infinite' : 'hub-entry .4s ease both',
                    animationDelay: `${i*0.06}s`,
                  }}>
                    {/* Top color band from player colors */}
                    <div style={{ height:3, background:`linear-gradient(90deg,${r.colors[0]||'#333'},${r.colors[1]||'#666'})` }} />

                    {/* Gold shimmer overlay for legendary */}
                    {isLegendary && (
                      <div style={{ position:'absolute', inset:0, background:'linear-gradient(135deg,rgba(255,215,0,0.03) 0%,transparent 50%,rgba(255,165,0,0.03) 100%)', pointerEvents:'none' }} />
                    )}

                    <div style={{ padding:'20px 20px 18px', display:'flex', gap:16, alignItems:'flex-start' }}>
                      {/* Photo */}
                      <div style={{ flexShrink:0, position:'relative' }}>
                        <div style={{ width:72, height:72, borderRadius:12, overflow:'hidden', background:'rgba(255,255,255,0.05)', border:`2px solid ${r.colors[0]||'#333'}40` }}>
                          {r.photoUrl
                            ? <img src={r.photoUrl} alt={r.name} style={{ width:'100%', height:'100%', objectFit:'cover' }} onError={e=>{e.target.style.display='none'}} />
                            : <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:28 }}>👤</div>
                          }
                        </div>
                        {isLegendary && (
                          <div style={{ position:'absolute', bottom:-4, right:-4, width:20, height:20, borderRadius:'50%', background:'#ffd700', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, boxShadow:'0 0 10px rgba(255,215,0,0.6)' }}>👑</div>
                        )}
                      </div>

                      {/* Info */}
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4, flexWrap:'wrap' }}>
                          <div style={{ fontFamily:'Black Ops One,cursive', fontSize:16, color:'#fff', lineHeight:1, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{r.name}</div>
                        </div>
                        <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:10 }}>
                          <span style={{ fontSize:11, color:'rgba(255,255,255,0.4)' }}>{r.country}</span>
                          <span style={{ fontSize:9, color:'rgba(255,255,255,0.2)' }}>·</span>
                          <span style={{ fontFamily:'Orbitron,monospace', fontSize:9, color:'rgba(255,255,255,0.3)' }}>RET. {r.retirementYear}</span>
                          {r.age && <><span style={{ fontSize:9, color:'rgba(255,255,255,0.2)' }}>·</span><span style={{ fontFamily:'Orbitron,monospace', fontSize:9, color:'rgba(255,255,255,0.3)' }}>{r.age} anos</span></>}
                        </div>

                        {/* Stats row */}
                        <div style={{ display:'flex', gap:12, marginBottom:12, flexWrap:'wrap' }}>
                          {[
                            { label:'TÍTULOS', val: cs.totalTitles||0, highlight: (cs.totalTitles||0) >= 5 },
                            { label:'PEAK',    val: cs.peakRanking <= 99 ? `#${cs.peakRanking}` : '—', highlight: (cs.peakRanking||99) <= 5 },
                            { label:'WIN%',    val: cs.totalMatches > 0 ? `${wr}%` : '—', highlight: wr >= 65 },
                            { label:'CARREIRA',val: cs.yearsActive > 0 ? `${cs.yearsActive}a` : '—', highlight: false },
                          ].map(s => (
                            <div key={s.label} style={{ textAlign:'center' }}>
                              <div style={{ fontFamily:'Orbitron,monospace', fontSize: s.highlight ? 15 : 13, fontWeight:'bold', color: s.highlight ? '#ffd700' : 'rgba(255,255,255,0.7)', lineHeight:1 }}>{s.val}</div>
                              <div style={{ fontFamily:'Orbitron,monospace', fontSize:7, color:'rgba(255,255,255,0.3)', letterSpacing:'.1em', marginTop:2 }}>{s.label}</div>
                            </div>
                          ))}
                        </div>

                        {/* Retirement badge */}
                        <div style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'3px 10px', borderRadius:20, background:type.bg, border:`1px solid ${type.color}30`, marginBottom:10 }}>
                          <span style={{ fontSize:10 }}>{type.icon}</span>
                          <span style={{ fontFamily:'Orbitron,monospace', fontSize:8, letterSpacing:'.15em', color:type.color }}>{type.label}</span>
                        </div>
                      </div>
                    </div>

                    {/* Narrative phrase */}
                    <div style={{ margin:'0 20px 18px', padding:'12px 14px', borderRadius:8, background:'rgba(255,255,255,0.03)', borderLeft:`3px solid ${isLegendary ? '#ffd700' : r.colors[0]||'#444'}60` }}>
                      <div style={{ fontFamily:'Rajdhani,sans-serif', fontSize:12, color:'rgba(255,255,255,0.5)', lineHeight:1.6, fontStyle:'italic' }}>{phrase}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ─── SUB-TAB: TODOS OS APOSENTADOS ─── */}
      {subTab === 'all' && (
        <div>
          {allRetired.length === 0 ? (
            <div style={{ textAlign:'center', padding:'60px 0' }}>
              <div style={{ fontSize:48, marginBottom:16, opacity:.3 }}>💤</div>
              <div style={{ fontFamily:'Orbitron,monospace', fontSize:11, letterSpacing:'.3em', color:'rgba(255,255,255,0.2)' }}>NENHUM APOSENTADO AINDA</div>
            </div>
          ) : (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))', gap:12 }}>
              {allRetired.map((r, i) => {
                const type = HOF_RETIREMENT_TYPES[r.retirementType] || HOF_RETIREMENT_TYPES.NATURAL;
                const cs = r.careerSummary;
                const wr = cs.totalMatches > 0 ? Math.round((cs.totalWins/cs.totalMatches)*100) : 0;
                const worthy = isHallOfFameWorthy(cs, r.retirementType);
                return (
                  <div key={r.playerId} style={{
                    borderRadius:12, overflow:'hidden',
                    background:'rgba(10,5,20,0.8)',
                    border: worthy ? '1px solid rgba(255,215,0,0.25)' : '1px solid rgba(255,255,255,0.06)',
                    animation:'hub-entry .3s ease both', animationDelay:`${i*0.04}s`,
                    transition:'border-color .2s',
                  }}>
                    <div style={{ height:2, background:`linear-gradient(90deg,${r.colors[0]||'#333'},${r.colors[1]||'#555'})` }} />
                    <div style={{ padding:'14px 16px', display:'flex', gap:12, alignItems:'center' }}>
                      {/* Icon */}
                      <div style={{ width:44, height:44, borderRadius:8, overflow:'hidden', flexShrink:0, background:'rgba(255,255,255,0.05)' }}>
                        {r.iconUrl
                          ? <img src={r.iconUrl} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} onError={e=>{e.target.style.display='none'}} />
                          : <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 }}>🌀</div>
                        }
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:3 }}>
                          {worthy && <span style={{ fontSize:10 }}>⭐</span>}
                          <div style={{ fontFamily:'Rajdhani,sans-serif', fontWeight:700, fontSize:14, color:'#fff', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{r.name}</div>
                        </div>
                        <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
                          <span style={{ fontFamily:'Orbitron,monospace', fontSize:8, color:'rgba(255,255,255,0.3)' }}>{r.country}</span>
                          <span style={{ fontFamily:'Orbitron,monospace', fontSize:8, color:'rgba(255,255,255,0.25)' }}>· {r.retirementYear}</span>
                        </div>
                      </div>
                    </div>
                    <div style={{ padding:'0 16px 14px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                      <div style={{ display:'flex', gap:10 }}>
                        <div style={{ textAlign:'center' }}>
                          <div style={{ fontFamily:'Orbitron,monospace', fontSize:12, color:(cs.totalTitles||0)>=3?'#ffd700':'rgba(255,255,255,0.6)' }}>{cs.totalTitles||0}</div>
                          <div style={{ fontFamily:'Orbitron,monospace', fontSize:7, color:'rgba(255,255,255,0.25)', letterSpacing:'.1em' }}>TÍTULOS</div>
                        </div>
                        <div style={{ textAlign:'center' }}>
                          <div style={{ fontFamily:'Orbitron,monospace', fontSize:12, color:(cs.peakRanking||99)<=5?'#ffd700':'rgba(255,255,255,0.6)' }}>{cs.peakRanking&&cs.peakRanking<99?`#${cs.peakRanking}`:'—'}</div>
                          <div style={{ fontFamily:'Orbitron,monospace', fontSize:7, color:'rgba(255,255,255,0.25)', letterSpacing:'.1em' }}>PEAK</div>
                        </div>
                        {cs.totalMatches > 0 && (
                          <div style={{ textAlign:'center' }}>
                            <div style={{ fontFamily:'Orbitron,monospace', fontSize:12, color:'rgba(255,255,255,0.6)' }}>{wr}%</div>
                            <div style={{ fontFamily:'Orbitron,monospace', fontSize:7, color:'rgba(255,255,255,0.25)', letterSpacing:'.1em' }}>WIN%</div>
                          </div>
                        )}
                      </div>
                      <div style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'3px 8px', borderRadius:12, background:type.bg, border:`1px solid ${type.color}25` }}>
                        <span style={{ fontSize:9 }}>{type.icon}</span>
                        <span style={{ fontFamily:'Orbitron,monospace', fontSize:7, letterSpacing:'.1em', color:type.color }}>{type.label}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ─── SUB-TAB: RIVALIDADES LENDÁRIAS ─── */}
      {subTab === 'rivalidades' && (() => {
        const rs = universeManager?.rivalrySystem;

        // Coletar rivalidades que envolvem pelo menos um aposentado OU de intensidade alta
        const legendaryRivalries = rs ? rs.getLegendaryRivalries() : [];

        const RTYPE_HOF = {
          CLASSIC:       { icon:'⚔️',  label:'Clássica',            color:'#ffd700',  desc:'Equilíbrio épico' },
          DOMINATION:    { icon:'👑',  label:'Dominância',           color:'#ef4444',  desc:'Controle absoluto' },
          GIANT_KILLER:  { icon:'🎯',  label:'Caçador de Gigantes',  color:'#22c55e',  desc:'David x Golias' },
          GRUDGE:        { icon:'🔥',  label:'Rancor',               color:'#f97316',  desc:'Guerra de atrito' },
          FINALS_CURSE:  { icon:'🏆',  label:'Maldição das Finais',  color:'#c084fc',  desc:'Destino nas finais' },
          THRONE_RIVALS: { icon:'💎',  label:'Rivais do Trono',      color:'#06b6d4',  desc:'Batalha pelo #1' },
          ERA_CLASH:     { icon:'🌀',  label:'Choque de Eras',       color:'#a855f7',  desc:'Gerações em conflito' },
        };

        const getPlayerInfo = (id) => {
          const p = universeManager?.getPlayerById?.(id) || TEAMS[id] || {};
          const retData = universeManager?.retirementSystem?.retiredPlayers?.get(id);
          return {
            id,
            name:        p.name || `#${id}`,
            country:     p.country || '',
            photoUrl:    p.photoUrl || p.iconUrl,
            colors:      p.colors || ['#555'],
            age:         p.age,
            isRetired:   p.status === 'RETIRED' || p.status === 'RETIRED_AMATEUR',
            totalTitles: retData?.careerSummary?.totalTitles || universeManager?.playerHistories?.get(id)?.titles?.total || 0,
            peakRanking: p.careerPeak?.ranking || 99,
          };
        };

        return (
          <div>
            {legendaryRivalries.length === 0 ? (
              <div style={{ textAlign:'center', padding:'80px 0' }}>
                <div style={{ fontSize:52, marginBottom:16, opacity:.25 }}>⚔️</div>
                <div style={{ fontFamily:'Orbitron,monospace', fontSize:11, letterSpacing:'.3em', color:'rgba(255,255,255,0.2)' }}>NENHUMA RIVALIDADE LENDÁRIA AINDA</div>
                <div style={{ fontFamily:'Rajdhani,sans-serif', fontSize:14, color:'rgba(255,255,255,0.2)', marginTop:8 }}>
                  Continue simulando temporadas — grandes rivalidades precisam de tempo para amadurecer.
                </div>
              </div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:28 }}>

                {/* ── Intro ── */}
                <div style={{ textAlign:'center', padding:'8px 0 4px', borderBottom:'1px solid rgba(255,255,255,0.06)', paddingBottom:24, marginBottom:8 }}>
                  <div style={{ fontFamily:'Rajdhani,sans-serif', fontSize:15, color:'rgba(255,255,255,0.4)', maxWidth:600, margin:'0 auto' }}>
                    As rivalidades que definiram eras — confrontos que transcendem partidas e se tornam parte da história do circuito.
                  </div>
                </div>

                {legendaryRivalries.map((r, i) => {
                  const p1  = getPlayerInfo(r.p1Id);
                  const p2  = getPlayerInfo(r.p2Id);
                  const t   = RTYPE_HOF[r.type] || RTYPE_HOF.CLASSIC;
                  const isFrozen = r.status === 'FROZEN';
                  const intPct   = Math.round(r.intensity * 100);
                  const winnerSide = r.p1Wins > r.p2Wins ? p1 : (r.p2Wins > r.p1Wins ? p2 : null);

                  return (
                    <div key={r.key} style={{
                      position:'relative', borderRadius:20, overflow:'hidden',
                      border: `1px solid ${t.color}30`,
                      background:`linear-gradient(135deg, ${t.color}06, rgba(0,0,0,.6))`,
                    }}>
                      {/* Cinematic glow */}
                      <div style={{ position:'absolute', inset:0, background:`radial-gradient(ellipse 70% 50% at 50% 0%,${t.color}0e,transparent 60%)`, pointerEvents:'none' }} />

                      {/* Top band */}
                      <div style={{ height:3, background:`linear-gradient(90deg,transparent,${t.color},transparent)` }} />

                      <div style={{ padding:'28px 32px', position:'relative' }}>
                        {/* ── Header: Tipo + Intensidade ── */}
                        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:24 }}>
                          <div style={{ display:'inline-flex', alignItems:'center', gap:7, padding:'5px 14px', borderRadius:20, background:`${t.color}18`, border:`1px solid ${t.color}40` }}>
                            <span style={{ fontSize:14 }}>{t.icon}</span>
                            <span style={{ fontFamily:'Orbitron,monospace', fontSize:9, letterSpacing:'.15em', color:t.color }}>{t.label}</span>
                          </div>
                          {isFrozen && (
                            <div style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'4px 12px', borderRadius:20, background:'rgba(96,165,250,0.1)', border:'1px solid rgba(96,165,250,0.3)' }}>
                              <span style={{ fontSize:11 }}>❄️</span>
                              <span style={{ fontFamily:'Orbitron,monospace', fontSize:8, letterSpacing:'.12em', color:'#60a5fa' }}>ENCERRADA</span>
                            </div>
                          )}
                          <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:10 }}>
                            <div style={{ fontFamily:'Orbitron,monospace', fontSize:8, color:'rgba(255,255,255,0.3)' }}>INTENSIDADE</div>
                            <div style={{ fontFamily:'Black Ops One,cursive', fontSize:22, color:t.color, textShadow:`0 0 16px ${t.color}66` }}>{intPct}%</div>
                          </div>
                        </div>

                        {/* ── DUEL HEADER: P1 vs P2 ── */}
                        <div style={{ display:'grid', gridTemplateColumns:'1fr auto 1fr', gap:0, alignItems:'center', marginBottom:24 }}>

                          {/* Player 1 */}
                          {[p1, p2].map((p, pi) => {
                            const wins = pi === 0 ? r.p1Wins : r.p2Wins;
                            const isWinner = winnerSide?.id === p.id;
                            const pc = p.colors?.[0] || '#888';
                            const isRight = pi === 1;
                            return (
                              <div key={p.id} style={{ display:'flex', flexDirection:'column', alignItems: isRight ? 'flex-end' : 'flex-start', gap:8 }}>
                                <div style={{ display:'flex', flexDirection: isRight ? 'row-reverse' : 'row', alignItems:'center', gap:14 }}>
                                  {/* Photo */}
                                  <div style={{ width:70, height:70, borderRadius:12, overflow:'hidden', border:`2px solid ${pc}${isWinner?'90':'40'}`, background:'rgba(0,0,0,0.4)', flexShrink:0, position:'relative' }}>
                                    {isWinner && <div style={{ position:'absolute', inset:0, background:`${pc}18` }} />}
                                    {p.photoUrl
                                      ? <img src={p.photoUrl} alt={p.name} style={{ width:'100%', height:'100%', objectFit:'cover' }} onError={e=>{e.target.style.display='none'}} />
                                      : <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'Black Ops One,cursive', fontSize:26, color:pc }}>{p.name[0]}</div>
                                    }
                                  </div>
                                  <div style={{ textAlign: isRight ? 'right' : 'left' }}>
                                    <div style={{ fontFamily:'Black Ops One,cursive', fontSize:'clamp(14px,1.5vw,18px)', color:isWinner ? pc : 'rgba(255,255,255,0.85)', lineHeight:1.1, marginBottom:4, textShadow: isWinner ? `0 0 14px ${pc}66` : 'none' }}>
                                      {p.name}
                                    </div>
                                    <div style={{ fontFamily:'Rajdhani,sans-serif', fontSize:12, color:'rgba(255,255,255,0.35)' }}>
                                      {p.country}{p.isRetired ? ' · Aposentado' : ''}
                                    </div>
                                    {p.peakRanking <= 10 && (
                                      <div style={{ fontFamily:'Orbitron,monospace', fontSize:8, color:'#ffd700', marginTop:2 }}>Peak #{p.peakRanking}</div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}

                          {/* VS + Record central */}
                          <div style={{ textAlign:'center', padding:'0 24px' }}>
                            <div style={{ display:'flex', alignItems:'center', gap:12, justifyContent:'center', marginBottom:4 }}>
                              <div style={{ textAlign:'right' }}>
                                <div style={{ fontFamily:'Black Ops One,cursive', fontSize:42, color: r.p1Wins >= r.p2Wins ? (p1.colors?.[0]||t.color) : 'rgba(255,255,255,0.4)', lineHeight:1, textShadow: r.p1Wins > r.p2Wins ? `0 0 24px ${p1.colors?.[0]||t.color}88` : 'none' }}>{r.p1Wins}</div>
                              </div>
                              <div style={{ fontFamily:'Orbitron,monospace', fontSize:11, color:'rgba(255,255,255,0.2)', letterSpacing:'.1em' }}>VS</div>
                              <div style={{ textAlign:'left' }}>
                                <div style={{ fontFamily:'Black Ops One,cursive', fontSize:42, color: r.p2Wins >= r.p1Wins ? (p2.colors?.[0]||t.color) : 'rgba(255,255,255,0.4)', lineHeight:1, textShadow: r.p2Wins > r.p1Wins ? `0 0 24px ${p2.colors?.[0]||t.color}88` : 'none' }}>{r.p2Wins}</div>
                              </div>
                            </div>
                            <div style={{ fontFamily:'Orbitron,monospace', fontSize:7.5, color:'rgba(255,255,255,0.25)', letterSpacing:'.15em' }}>{r.totalMatches} PARTIDAS</div>
                            {/* Barra de domínio */}
                            <div style={{ height:4, borderRadius:2, background:'rgba(255,255,255,0.08)', overflow:'hidden', margin:'10px 0 4px' }}>
                              <div style={{ height:'100%', width:`${r.totalMatches>0?Math.round((r.p1Wins/r.totalMatches)*100):50}%`, background:`linear-gradient(90deg,${p1.colors?.[0]||'#60a5fa'},${p2.colors?.[0]||'#f97316'})`, transition:'width .8s ease' }} />
                            </div>
                            <div style={{ display:'flex', justifyContent:'space-between', fontFamily:'Orbitron,monospace', fontSize:6.5, color:'rgba(255,255,255,0.2)' }}>
                              <span>{r.totalMatches>0?Math.round((r.p1Wins/r.totalMatches)*100):50}%</span>
                              <span>{r.totalMatches>0?Math.round((r.p2Wins/r.totalMatches)*100):50}%</span>
                            </div>
                          </div>
                        </div>

                        {/* ── STATS GRID ── */}
                        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8, marginBottom:18 }}>
                          {[
                            { label:'FINAIS', val: r.finalsMatches,      icon:'🏆', c:'#c084fc' },
                            { label:'TIE-BREAKS', val: r.tieBreaks,      icon:'⚡', c:'#f97316' },
                            { label:'TEMPORADAS', val: r.seasons?.length||0, icon:'📅', c:'#60a5fa' },
                            { label:'PRESTÍGIO', val: Math.round(r.totalPrestige||0), icon:'💫', c:'#ffd700' },
                          ].map(s => (
                            <div key={s.label} style={{ textAlign:'center', padding:'12px 8px', borderRadius:10, background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)' }}>
                              <div style={{ fontSize:16, marginBottom:4 }}>{s.icon}</div>
                              <div style={{ fontFamily:'Black Ops One,cursive', fontSize:22, color:s.c, lineHeight:1 }}>{s.val}</div>
                              <div style={{ fontFamily:'Orbitron,monospace', fontSize:6.5, letterSpacing:'.12em', color:'rgba(255,255,255,0.25)', marginTop:3 }}>{s.label}</div>
                            </div>
                          ))}
                        </div>

                        {/* ── NARRATIVA ── */}
                        {r.narrative && (
                          <p style={{ fontFamily:'Rajdhani,sans-serif', fontSize:14.5, lineHeight:1.75, color:'rgba(255,255,255,0.6)', margin:'0 0 16px', fontStyle:'italic', borderLeft:`3px solid ${t.color}50`, paddingLeft:16 }}>
                            "{r.narrative}"
                          </p>
                        )}

                        {/* ── KEY MOMENTS ── */}
                        {r.keyMoments?.length > 0 && (() => {
                          const moments = [...r.keyMoments].reverse().slice(0,4);
                          return (
                            <div>
                              <div style={{ fontFamily:'Orbitron,monospace', fontSize:8, letterSpacing:'.25em', color:'rgba(255,255,255,0.2)', marginBottom:10 }}>MOMENTOS QUE DEFINIRAM A RIVALIDADE</div>
                              <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
                                {moments.map((m, mi) => {
                                  const winnerInfo = m.winnerId === r.p1Id ? p1 : p2;
                                  const wc = winnerInfo.colors?.[0] || t.color;
                                  const roundLabel = { F:'FINAL', SF:'SEMI-FINAL', QF:'QUARTAS', R16:'OITAVAS', R32:'R32' }[m.round] || (m.round||'');
                                  const isBig = m.isFinal || m.prestige >= 4;
                                  return (
                                    <div key={mi} style={{ display:'flex', gap:12, alignItems:'center', padding:'8px 12px', borderRadius:8, background: isBig ? `${wc}08` : 'rgba(255,255,255,0.02)', border:`1px solid ${isBig?wc+'25':'rgba(255,255,255,0.05)'}` }}>
                                      <div style={{ width:6, height:6, borderRadius:'50%', background:wc, flexShrink:0, boxShadow: isBig ? `0 0 8px ${wc}` : 'none' }} />
                                      <div style={{ flex:1 }}>
                                        <span style={{ fontFamily:'Rajdhani,sans-serif', fontWeight:700, fontSize:13, color: isBig ? wc : 'rgba(255,255,255,0.7)' }}>
                                          {winnerInfo.name} venceu
                                        </span>
                                        {m.isTieBreak && <span style={{ fontFamily:'Orbitron,monospace', fontSize:7, color:'#f97316', marginLeft:8, letterSpacing:'.1em' }}>TIE-BREAK</span>}
                                        {m.isFinal && <span style={{ fontFamily:'Orbitron,monospace', fontSize:7, color:'#c084fc', marginLeft:8, letterSpacing:'.1em' }}>FINAL</span>}
                                      </div>
                                      <div style={{ fontFamily:'Orbitron,monospace', fontSize:7, color:'rgba(255,255,255,0.25)', whiteSpace:'nowrap' }}>
                                        {roundLabel} {m.tier || ''} {m.year ? `· ${m.year}` : ''}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })()}

      {/* ─── SUB-TAB: LEGADO ─── */}
      {subTab === 'legado' && (
        <div style={{ maxWidth:800, margin:'0 auto' }}>
          {allRetired.length === 0 ? (
            <div style={{ textAlign:'center', padding:'60px 0' }}>
              <div style={{ fontSize:48, marginBottom:16, opacity:.3 }}>📊</div>
              <div style={{ fontFamily:'Orbitron,monospace', fontSize:11, letterSpacing:'.3em', color:'rgba(255,255,255,0.2)' }}>SEM DADOS AINDA</div>
            </div>
          ) : (
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
              {/* Panorama */}
              <div style={{ gridColumn:'1/-1', background:'rgba(255,215,0,0.04)', border:'1px solid rgba(255,215,0,0.12)', borderRadius:16, padding:'24px 28px' }}>
                <div style={{ fontFamily:'Orbitron,monospace', fontSize:9, letterSpacing:'.3em', color:'rgba(255,215,0,0.5)', marginBottom:20 }}>PANORAMA GERAL</div>
                <div style={{ display:'flex', gap:40, flexWrap:'wrap' }}>
                  {[
                    { label:'TOTAL APOSENTADOS', val: stats.total, color:'#a0e0ff' },
                    { label:'IMORTAIS (HoF)',     val: stats.hofCount, color:'#ffd700' },
                    { label:'MÉDIA DE TÍTULOS',   val: stats.avgTitles, color:'rgba(255,255,255,0.7)' },
                  ].map(s => (
                    <div key={s.label}>
                      <div style={{ fontFamily:'Black Ops One,cursive', fontSize:32, color:s.color, lineHeight:1 }}>{s.val}</div>
                      <div style={{ fontFamily:'Orbitron,monospace', fontSize:8, letterSpacing:'.2em', color:'rgba(255,255,255,0.3)', marginTop:4 }}>{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Por tipo */}
              <div style={{ background:'rgba(10,5,20,0.8)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:16, padding:'22px 24px' }}>
                <div style={{ fontFamily:'Orbitron,monospace', fontSize:9, letterSpacing:'.3em', color:'rgba(255,255,255,0.3)', marginBottom:16 }}>TIPOS DE APOSENTADORIA</div>
                <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                  {Object.entries(HOF_RETIREMENT_TYPES).map(([key, t]) => {
                    const count = stats.byType[key] || 0;
                    const pct = stats.total > 0 ? Math.round((count/stats.total)*100) : 0;
                    return (
                      <div key={key} style={{ display:'flex', alignItems:'center', gap:12 }}>
                        <span style={{ fontSize:13 }}>{t.icon}</span>
                        <div style={{ flex:1 }}>
                          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                            <span style={{ fontFamily:'Orbitron,monospace', fontSize:8, color:t.color, letterSpacing:'.1em' }}>{t.label}</span>
                            <span style={{ fontFamily:'Orbitron,monospace', fontSize:8, color:'rgba(255,255,255,0.4)' }}>{count}</span>
                          </div>
                          <div style={{ height:3, borderRadius:2, background:'rgba(255,255,255,0.06)' }}>
                            <div style={{ height:'100%', borderRadius:2, background:t.color, width:`${pct}%`, transition:'width .6s ease' }} />
                          </div>
                        </div>
                        <span style={{ fontFamily:'Orbitron,monospace', fontSize:8, color:'rgba(255,255,255,0.25)', minWidth:28 }}>{pct}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Destaques */}
              <div style={{ background:'rgba(10,5,20,0.8)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:16, padding:'22px 24px' }}>
                <div style={{ fontFamily:'Orbitron,monospace', fontSize:9, letterSpacing:'.3em', color:'rgba(255,255,255,0.3)', marginBottom:16 }}>DESTAQUES HISTÓRICOS</div>
                <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                  {stats.mostTitles && (
                    <div>
                      <div style={{ fontFamily:'Orbitron,monospace', fontSize:8, color:'rgba(255,215,0,0.5)', letterSpacing:'.15em', marginBottom:4 }}>🏆 MAIS TÍTULOS</div>
                      <div style={{ fontFamily:'Rajdhani,sans-serif', fontSize:15, fontWeight:700, color:'#fff' }}>{stats.mostTitles.name}</div>
                      <div style={{ fontFamily:'Orbitron,monospace', fontSize:9, color:'#ffd700' }}>{stats.mostTitles.careerSummary?.totalTitles||0} títulos</div>
                    </div>
                  )}
                  {stats.longestCareer && (
                    <div>
                      <div style={{ fontFamily:'Orbitron,monospace', fontSize:8, color:'rgba(160,224,255,0.5)', letterSpacing:'.15em', marginBottom:4 }}>⏳ MAIOR CARREIRA</div>
                      <div style={{ fontFamily:'Rajdhani,sans-serif', fontSize:15, fontWeight:700, color:'#fff' }}>{stats.longestCareer.name}</div>
                      <div style={{ fontFamily:'Orbitron,monospace', fontSize:9, color:'#a0e0ff' }}>{stats.longestCareer.careerSummary?.yearsActive||0} temporadas</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ============================================
// 🏛️ ERAS VIEW
// ============================================

const ERA_TYPE_STYLE = {
  Attack:    { color: '#e8892a', glow: 'rgba(232,137,42,0.3)',  label: 'Attack',   dot: '#e8892a' },
  Defense:   { color: '#7ec8e3', glow: 'rgba(126,200,227,0.3)', label: 'Defense',  dot: '#7ec8e3' },
  Stamina:   { color: '#50c878', glow: 'rgba(80,200,120,0.3)',  label: 'Stamina',  dot: '#50c878' },
  Balance:   { color: '#c9a84c', glow: 'rgba(201,168,76,0.3)',  label: 'Balance',  dot: '#c9a84c' },
  Contested: { color: '#e74c3c', glow: 'rgba(231,76,60,0.3)',   label: 'Contestada',dot: '#e74c3c' },
};

function EraCard({ era, isActive, index }) {
  const [expanded, setExpanded] = React.useState(false);
  const typeStyle = ERA_TYPE_STYLE[era.dominantType] || ERA_TYPE_STYLE.Contested;
  // Para era ativa (endYear null): usa era.seasons (contador incremental)
  // Para era fechada: calcula pelo intervalo de anos
  const seasons = era.endYear != null
    ? (era.endYear - era.startYear + 1)
    : (era.seasons > 0 ? era.seasons : null);
  const yearRange = era.endYear != null ? `${era.startYear} – ${era.endYear}` : `${era.startYear} — ATUAL`;
  const stats = era.stats || {};
  const rivalry = era.canonicalRivalry;

  const topTypeEntry = Object.entries(stats.typeWins || {}).sort((a,b) => b[1]-a[1])[0];

  return (
    <div style={{
      background: isActive
        ? `linear-gradient(135deg, rgba(201,168,76,0.08) 0%, rgba(13,11,24,0.95) 100%)`
        : 'rgba(13,11,24,0.7)',
      border: `1px solid ${isActive ? 'rgba(201,168,76,0.35)' : 'rgba(201,168,76,0.12)'}`,
      borderRadius: 4,
      overflow: 'hidden',
      position: 'relative',
      transition: 'all 0.2s',
      marginBottom: 12,
    }}>
      {/* Top accent */}
      <div style={{
        height: 2,
        background: `linear-gradient(90deg, transparent, ${typeStyle.color}, transparent)`,
      }} />

      {/* Card header - sempre visível */}
      <div
        onClick={() => setExpanded(!expanded)}
        style={{ padding: '20px 24px', cursor: 'pointer', display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, alignItems: 'center' }}
      >
        <div>
          {/* Era number + years */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
            <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 10, letterSpacing: '0.4em', color: typeStyle.color, textTransform: 'uppercase' }}>
              Era {era.number}
            </span>
            <span style={{ fontSize: 11, color: 'rgba(232,226,212,0.4)', letterSpacing: '0.15em' }}>
              {yearRange}
            </span>
            {isActive && (
              <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 8px', background: 'rgba(201,168,76,0.15)', border: '1px solid rgba(201,168,76,0.4)', borderRadius: 2, color: '#f0cc6e', letterSpacing: '0.2em', textTransform: 'uppercase' }}>
                EM ANDAMENTO
              </span>
            )}
          </div>
          {/* Era name */}
          <div style={{
            fontFamily: 'Playfair Display, Georgia, serif',
            fontSize: 'clamp(18px, 2.5vw, 26px)',
            fontWeight: 700,
            fontStyle: 'italic',
            color: isActive ? '#f0cc6e' : '#e8e2d4',
            lineHeight: 1.2,
          }}>
            {era.name}
          </div>
          {/* Tagline */}
          {era.tagline && (
            <div style={{ fontFamily: 'Georgia, serif', fontSize: 13, fontStyle: 'italic', color: 'rgba(232,226,212,0.4)', marginTop: 4 }}>
              "{era.tagline}"
            </div>
          )}
        </div>
        {/* Right side: type tag + expand */}
        <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
          <span style={{
            fontSize: 9, fontWeight: 700, padding: '3px 10px',
            border: `1px solid ${typeStyle.color}`,
            borderRadius: 2, color: typeStyle.color,
            letterSpacing: '0.2em', textTransform: 'uppercase',
            background: `${typeStyle.glow.replace('0.3', '0.08')}`,
          }}>
            {typeStyle.label}
          </span>
          <span style={{ color: 'rgba(201,168,76,0.5)', fontSize: 16 }}>
            {expanded ? '▲' : '▼'}
          </span>
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div style={{ padding: '0 24px 24px', animation: 'hub-entry 0.3s ease both' }}>
          <div style={{ borderTop: '1px solid rgba(201,168,76,0.1)', paddingTop: 20 }}>
            {/* Stats grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: 12, marginBottom: 20 }}>
              {[
                { val: seasons != null ? seasons : '—', label: 'Temporadas' },
                { val: stats.totalTournaments != null ? stats.totalTournaments : '—', label: 'Torneios' },
                { val: stats.grandSlams != null ? stats.grandSlams : '—', label: 'Premiers' },
                { val: stats.retirements != null ? stats.retirements : '—', label: 'Aposentadorias' },
              ].map((s, i) => (
                <div key={i} style={{ textAlign: 'center', padding: '12px 8px', background: 'rgba(201,168,76,0.04)', borderRadius: 2 }}>
                  <div style={{ fontFamily: 'Playfair Display, serif', fontSize: 28, fontWeight: 900, color: typeStyle.color, lineHeight: 1, marginBottom: 4 }}>
                    {s.val}
                  </div>
                  <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 9, color: 'rgba(232,226,212,0.4)', textTransform: 'uppercase', letterSpacing: '0.2em' }}>
                    {s.label}
                  </div>
                </div>
              ))}
            </div>

            {/* Type distribution */}
            {stats.totalTournaments > 0 && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 10, color: 'rgba(201,168,76,0.5)', letterSpacing: '0.3em', textTransform: 'uppercase', marginBottom: 10 }}>
                  Distribuição de Tipos
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {Object.entries(stats.typeWins || {}).filter(([,v]) => v > 0).sort((a,b) => b[1]-a[1]).map(([type, wins]) => {
                    const pct = Math.round((wins / stats.totalTournaments) * 100);
                    const ts = ERA_TYPE_STYLE[type] || ERA_TYPE_STYLE.Contested;
                    return (
                      <div key={type} style={{ display: 'grid', gridTemplateColumns: '80px 1fr 40px', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 11, color: ts.color, fontWeight: 600 }}>{type}</span>
                        <div style={{ height: 4, background: 'rgba(255,255,255,0.05)', borderRadius: 2 }}>
                          <div style={{ height: '100%', width: `${pct}%`, background: ts.color, borderRadius: 2, transition: 'width 0.5s ease' }} />
                        </div>
                        <span style={{ fontSize: 11, color: 'rgba(232,226,212,0.5)', textAlign: 'right' }}>{pct}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Champion + Rivalry */}
            <div style={{ display: 'grid', gridTemplateColumns: rivalry ? '1fr 1fr' : '1fr', gap: 16 }}>
              {era.championName && (
                <div style={{ padding: '12px 16px', background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.15)', borderRadius: 2 }}>
                  <div style={{ fontSize: 9, color: 'rgba(201,168,76,0.5)', letterSpacing: '0.4em', textTransform: 'uppercase', marginBottom: 6 }}>Rei da Era</div>
                  <div style={{ fontFamily: 'Playfair Display, serif', fontSize: 16, fontWeight: 700, color: '#f0cc6e' }}>{era.championName}</div>
                </div>
              )}
              {rivalry && (
                <div style={{ padding: '12px 16px', background: 'rgba(201,168,76,0.04)', border: '1px solid rgba(201,168,76,0.1)', borderRadius: 2 }}>
                  <div style={{ fontSize: 9, color: 'rgba(201,168,76,0.5)', letterSpacing: '0.4em', textTransform: 'uppercase', marginBottom: 6 }}>Rivalidade Canônica</div>
                  <div style={{ fontFamily: 'Playfair Display, serif', fontSize: 14, fontWeight: 700 }}>
                    {rivalry.p1Name} <span style={{ color: 'rgba(232,226,212,0.35)', fontSize: 11, fontStyle: 'italic' }}>vs</span> {rivalry.p2Name}
                  </div>
                  <div style={{ fontSize: 12, color: 'rgba(232,226,212,0.45)', marginTop: 3 }}>
                    {rivalry.p1Wins}–{rivalry.p2Wins} · {rivalry.total} confrontos
                  </div>
                </div>
              )}
            </div>

            {/* Champions list */}
            {era.champions?.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <div style={{ fontSize: 10, color: 'rgba(201,168,76,0.5)', letterSpacing: '0.3em', textTransform: 'uppercase', marginBottom: 8 }}>
                  Campeões de Temporada
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {era.champions.map((c, i) => (
                    <span key={i} style={{
                      fontFamily: 'Rajdhani, sans-serif', fontSize: 11,
                      padding: '3px 10px', background: 'rgba(201,168,76,0.06)',
                      border: '1px solid rgba(201,168,76,0.15)', borderRadius: 2,
                      color: 'rgba(232,226,212,0.7)',
                    }}>
                      <span style={{ color: 'rgba(201,168,76,0.5)', marginRight: 4 }}>{c.year}</span>{c.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ErasView({ universeManager }) {
  const [manualMode, setManualMode] = React.useState(false);
  const [manualName, setManualName] = React.useState('');

  const eraSystem = universeManager?.eraSystem;
  const eras = eraSystem?.eras || [];
  const currentEra = eraSystem?.getCurrentEra?.();
  const currentYear = universeManager?.currentYear || 2024;
  const globalStats = eraSystem?.getGlobalStats?.() || {};

  if (eras.length === 0) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'rgba(232,226,212,0.4)' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🏛️</div>
        <div style={{ fontFamily: 'Playfair Display, serif', fontSize: 24, fontStyle: 'italic', marginBottom: 8 }}>
          Nenhuma Era registrada ainda
        </div>
        <div style={{ fontSize: 14 }}>Simule temporadas para que a história comece a ser escrita.</div>
      </div>
    );
  }

  const handleManualTransition = () => {
    if (!manualName.trim()) return;
    universeManager.manualEraTransition(manualName.trim());
    setManualMode(false);
    setManualName('');
  };

  return (
    <div style={{ animation: 'hub-entry .4s ease both', padding: '0 0 40px' }}>
      {/* ── HEADER ── */}
      <div style={{ padding: '40px 32px 32px', borderBottom: '1px solid rgba(201,168,76,0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 11, letterSpacing: '0.5em', color: 'rgba(201,168,76,0.7)', textTransform: 'uppercase', marginBottom: 8 }}>
              Arquivo Histórico
            </div>
            <h2 style={{
              fontFamily: 'Playfair Display, serif',
              fontSize: 'clamp(28px, 4vw, 48px)',
              fontWeight: 900, fontStyle: 'italic',
              margin: 0, lineHeight: 1.1,
            }}>
              O Modo <span style={{ color: '#f0cc6e' }}>Eras</span>
            </h2>
            <p style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 14, color: 'rgba(232,226,212,0.45)', marginTop: 8, maxWidth: 500 }}>
              Cada época tem seu rei. Cada rei deixa uma sombra.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {[
              { val: eras.length, label: 'Eras' },
              { val: eras.filter(e => e.endYear != null).length, label: 'Concluídas' },
              { val: currentYear - 2024, label: 'Anos' },
            ].map((s, i) => (
              <div key={i} style={{ textAlign: 'center', padding: '12px 20px', background: 'rgba(201,168,76,0.05)', border: '1px solid rgba(201,168,76,0.15)', borderRadius: 2 }}>
                <div style={{ fontFamily: 'Playfair Display, serif', fontSize: 28, fontWeight: 900, color: '#f0cc6e', lineHeight: 1 }}>{s.val}</div>
                <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 9, color: 'rgba(232,226,212,0.4)', textTransform: 'uppercase', letterSpacing: '0.2em', marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── TIMELINE VISUAL ── */}
      <div style={{ padding: '32px', display: 'flex', gap: 4, alignItems: 'stretch', marginBottom: 32, overflowX: 'auto' }}>
        {eras.map((era, i) => {
          const ts = ERA_TYPE_STYLE[era.dominantType] || ERA_TYPE_STYLE.Contested;
          const isActive = era.id === currentEra?.id;
          const seasons = era.endYear != null ? (era.endYear - era.startYear + 1) : (currentYear - era.startYear + 1);
          const width = Math.max(60, seasons * 40);
          return (
            <div key={era.id} style={{
              minWidth: width, flex: seasons,
              background: isActive ? `linear-gradient(to top, ${ts.glow}, rgba(0,0,0,0))` : `linear-gradient(to top, ${ts.color}20, rgba(0,0,0,0))`,
              border: `1px solid ${ts.color}${isActive ? '80' : '30'}`,
              borderRadius: 2,
              padding: '12px 10px 8px',
              position: 'relative',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}>
              {/* Top color bar */}
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: ts.color, borderRadius: '2px 2px 0 0', opacity: isActive ? 1 : 0.4 }} />
              <div style={{ fontFamily: 'Playfair Display, serif', fontSize: 12, fontWeight: 700, fontStyle: 'italic', color: isActive ? '#f0cc6e' : 'rgba(232,226,212,0.7)', marginBottom: 4, lineHeight: 1.2 }}>
                {era.name}
              </div>
              <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 10, color: ts.color, letterSpacing: '0.1em' }}>
                {era.startYear}{era.endYear ? `–${era.endYear}` : '→'}
              </div>
              {isActive && (
                <div style={{ position: 'absolute', bottom: 4, right: 6, width: 6, height: 6, borderRadius: '50%', background: '#f0cc6e', boxShadow: '0 0 6px #f0cc6e', animation: 'hub-pulse 2s infinite' }} />
              )}
            </div>
          );
        })}
      </div>

      {/* ── ERA CARDS ── */}
      <div style={{ padding: '0 32px' }}>
        <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 10, letterSpacing: '0.4em', color: 'rgba(201,168,76,0.5)', textTransform: 'uppercase', marginBottom: 16 }}>
          Arquivo Completo
        </div>
        {[...eras].reverse().map((era, i) => (
          <EraCard key={era.id} era={era} isActive={era.id === currentEra?.id} index={i} />
        ))}
      </div>

      {/* ── MANUAL TRANSITION ── */}
      <div style={{ padding: '32px 32px 0' }}>
        <div style={{ padding: 24, background: 'rgba(201,168,76,0.04)', border: '1px solid rgba(201,168,76,0.12)', borderRadius: 4 }}>
          <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 10, letterSpacing: '0.4em', color: 'rgba(201,168,76,0.5)', textTransform: 'uppercase', marginBottom: 12 }}>
            📌 Transição Manual
          </div>
          <p style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 14, color: 'rgba(232,226,212,0.5)', marginBottom: 16 }}>
            Declare o fim de uma era sem esperar pelos gatilhos automáticos. O passado é sempre reescrito pelo presente.
          </p>
          {!manualMode ? (
            <button
              onClick={() => setManualMode(true)}
              style={{ background: 'transparent', border: '1px solid rgba(201,168,76,0.3)', borderRadius: 2, padding: '10px 24px', fontFamily: 'Rajdhani, sans-serif', fontSize: 13, fontWeight: 600, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(201,168,76,0.7)', cursor: 'pointer' }}
            >
              Declarar Nova Era
            </button>
          ) : (
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <input
                type="text"
                value={manualName}
                onChange={e => setManualName(e.target.value)}
                placeholder="Nome da nova era..."
                style={{ flex: 1, minWidth: 200, background: 'rgba(201,168,76,0.05)', border: '1px solid rgba(201,168,76,0.3)', borderRadius: 2, padding: '10px 14px', fontFamily: 'Georgia, serif', fontSize: 15, fontStyle: 'italic', color: '#e8e2d4', outline: 'none' }}
                onKeyDown={e => { if (e.key === 'Enter') handleManualTransition(); if (e.key === 'Escape') setManualMode(false); }}
                autoFocus
              />
              <button
                onClick={handleManualTransition}
                disabled={!manualName.trim()}
                style={{ background: manualName.trim() ? 'rgba(201,168,76,0.8)' : 'rgba(201,168,76,0.2)', border: 'none', borderRadius: 2, padding: '10px 20px', fontFamily: 'Rajdhani, sans-serif', fontSize: 13, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#0a0005', cursor: manualName.trim() ? 'pointer' : 'not-allowed' }}
              >
                Confirmar
              </button>
              <button
                onClick={() => { setManualMode(false); setManualName(''); }}
                style={{ background: 'transparent', border: '1px solid rgba(201,168,76,0.2)', borderRadius: 2, padding: '10px 16px', fontFamily: 'Rajdhani, sans-serif', fontSize: 13, color: 'rgba(232,226,212,0.4)', cursor: 'pointer' }}
              >
                Cancelar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const PlaceholderView = ({ icon, title }) => (
  <div style={{ animation:'hub-entry .4s ease both', textAlign:'center', padding:'80px 0' }}>
    <div style={{ fontSize:64, marginBottom:20, opacity:0.3 }}>{icon}</div>
    <div style={{
      fontFamily:'Black Ops One,cursive',
      fontSize:'clamp(28px,3vw,42px)',
      lineHeight:1,
      background:'linear-gradient(180deg,#fff 0%,rgba(255,255,255,0.3) 100%)',
      WebkitBackgroundClip:'text',
      WebkitTextFillColor:'transparent',
      marginBottom:12
    }}>
      {title}
    </div>
    <div style={{
      fontFamily:'Orbitron,monospace',
      fontSize:11, letterSpacing:'.25em',
      color:'rgba(255,255,255,0.2)',
      marginBottom:6
    }}>
      EM CONSTRUÇÃO
    </div>
    <div style={{
      fontFamily:'Rajdhani,sans-serif',
      fontSize:13,
      color:'rgba(255,255,255,0.25)'
    }}>
      Esta funcionalidade estará disponível em breve
    </div>
  </div>
);

export default BroadcastHub;
