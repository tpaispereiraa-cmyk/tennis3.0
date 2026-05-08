// ============================================
// RECORDSVIEW.JSX — Aba de Recordes do BroadcastHub
// ============================================
// Sub-abas: BLADERS (carreira + temporada) | SIGNATURE BLADES
// Todos os recordes em Top 3
// ============================================

import React, { useState, useMemo } from 'react';
import { TEAMS } from './data.js';

// ─── Paleta e fontes consistentes com o Hub ───
const C = {
  gold:     '#ffd700',
  cyan:     '#00d4ff',
  purple:   '#c084fc',
  green:    '#34d399',
  orange:   '#f97316',
  red:      '#ef4444',
  pink:     '#f472b6',
  blue:     '#60a5fa',
  text:     'rgba(255,255,255,0.88)',
  dim:      'rgba(255,255,255,0.35)',
  vdim:     'rgba(255,255,255,0.15)',
  bg:       'rgba(255,255,255,0.03)',
  bgHover:  'rgba(255,255,255,0.06)',
  border:   'rgba(255,255,255,0.07)',
};

const MEDAL = ['🥇','🥈','🥉'];
const MEDAL_COLOR = [C.gold, '#c0c0c0', '#cd7f32'];

// ─── Helper: nome curto ───
const shortName = (n = '') => {
  const nick = n.match(/"([^"]+)"/)?.[1];
  const cleanParts = n.replace(/"[^"]*"\s*/, '').trim().split(' ');
  if (nick) return `${cleanParts[0]} "${nick}"`;
  return cleanParts.length > 1 ? `${cleanParts[0]} ${cleanParts[cleanParts.length-1]}` : n;
};

// ─── Helper: flag from country string ───
const flag = (c = '') => c.split(' ')[0] || '';

// ─── Helper: calcular pontos de uma temporada específica para um jogador ───
const getSeasonPoints = (universeManager, playerId, year) => {
  const pointsArray = universeManager.pointsHistory?.get(playerId) || [];
  return pointsArray.filter(e => e.year === year).reduce((s, e) => s + e.points, 0);
};

// ─── Helper: melhor temporada de pontos de um jogador ───
const getBestSeasonPoints = (universeManager, playerId) => {
  const hist = universeManager.playerHistories?.get(playerId);
  // PRIMEIRO: usar campo permanente (não expira, salvo ao fim de cada temporada)
  if (hist?.bestSeasonPointsEver != null && hist.bestSeasonPointsEver > 0) {
    return { points: hist.bestSeasonPointsEver, year: hist.bestSeasonPointsYear };
  }
  // FALLBACK: allTimeSeasons (também permanente)
  if (Array.isArray(hist?.allTimeSeasons) && hist.allTimeSeasons.length > 0) {
    const best = hist.allTimeSeasons.reduce((a, b) => b.pts > a.pts ? b : a, { pts: 0 });
    if (best.pts > 0) return { points: best.pts, year: best.y };
  }
  // ÚLTIMO RECURSO: pointsHistory (só tem os últimos 18 meses)
  const pointsArray = universeManager.pointsHistory?.get(playerId) || [];
  const byYear = {};
  pointsArray.forEach(e => { byYear[e.year] = (byYear[e.year] || 0) + e.points; });
  let best = 0, bestYear = null;
  Object.entries(byYear).forEach(([y, pts]) => { if (pts > best) { best = pts; bestYear = +y; } });
  return { points: best, year: bestYear };
};

// ─── Helper: títulos em uma temporada específica ───
const titlesInYear = (universeManager, playerId, year) => {
  const hist = universeManager.playerHistories?.get(playerId);
  return (hist?.titles?.detailedList || []).filter(t => t.year === year).length;
};

// ─── Helper: melhor temporada de títulos ───
const getBestSeasonTitles = (universeManager, playerId) => {
  const hist = universeManager.playerHistories?.get(playerId);
  // PRIMEIRO: usar campo permanente
  if (hist?.bestSeasonTitlesEver != null && hist.bestSeasonTitlesEver > 0) {
    return { titles: hist.bestSeasonTitlesEver, year: hist.bestSeasonTitlesYear };
  }
  // FALLBACK: allTimeSeasons
  if (Array.isArray(hist?.allTimeSeasons) && hist.allTimeSeasons.length > 0) {
    const best = hist.allTimeSeasons.reduce((a, b) => b.t > a.t ? b : a, { t: 0 });
    if (best.t > 0) return { titles: best.t, year: best.y };
  }
  // ÚLTIMO RECURSO: detailedList
  const list = hist?.titles?.detailedList || [];
  const byYear = {};
  list.forEach(t => { byYear[t.year] = (byYear[t.year] || 0) + 1; });
  let best = 0, bestYear = null;
  Object.entries(byYear).forEach(([y, n]) => { if (n > best) { best = n; bestYear = +y; } });
  return { titles: best, year: bestYear };
};

// ─── Helper: win rate de um jogador ───
const getWinRate = (universeManager, playerId) => {
  const hist = universeManager.playerHistories?.get(playerId);
  const total = (hist?.totalMatches || 0);
  const wins  = (hist?.wins || 0);
  return total >= 10 ? +(wins / total * 100).toFixed(1) : 0;
};

// ─── Helper: round win rate ───
const getRoundWinRate = (universeManager, playerId) => {
  const hist = universeManager.playerHistories?.get(playerId);
  const total = (hist?.roundWins || 0) + (hist?.roundLosses || 0);
  const wins  = (hist?.roundWins || 0);
  return total >= 20 ? +(wins / total * 100).toFixed(1) : 0;
};

// ─── Helper: consecutivos sem perder (best win streak) ───
const getBestStreak = (universeManager, playerId) => {
  const hist = universeManager.playerHistories?.get(playerId);
  return hist?.bestWinStreak || 0;
};

// ─── Helper: anos ativos (evitando debutYear fixo 2024) ───
const getYearsActive = (universeManager, playerId) => {
  const player = (TEAMS || [])[playerId];
  return Math.max((player?.age || 25) - 18, 0);
};

// ─── Helper: número de tipos de título (breadth) ───
const getTitleBreadth = (universeManager, playerId) => {
  const hist = universeManager.playerHistories?.get(playerId);
  if (!hist?.titles) return 0;
  const t = hist.titles;
  return [
    t.kingsCourtTitles, t.premierTitles, t.signatureClashTitles, t.invitationalTitles,
    t.mastersTitles, t.challengerTitles, t.openTitles, t.redemptionTitles
  ].filter(n => n > 0).length;
};

// ─── Helper: calcular "dominant season" — maior diferença de pontos vs #2 ───
const getDominanceScore = (universeManager, playerId) => {
  const { points, year } = getBestSeasonPoints(universeManager, playerId);
  if (!year) return 0;
  const allPlayers = TEAMS || [];
  let secondBest = 0;
  allPlayers.forEach((_, id) => {
    if (id === playerId) return;
    const pts = getSeasonPoints(universeManager, id, year);
    if (pts > secondBest) secondBest = pts;
  });
  return points - secondBest;
};

// ─── Helper: upsets causados (vitórias como underdog ≥15 posições) ───
// Prioridade: campo permanente (upsetsCaused) → fallback scan matchHistory restante
const getUpsetsCaused = (universeManager, playerId) => {
  const hist = universeManager.playerHistories?.get(playerId);
  if (hist?.upsetsCaused != null) return hist.upsetsCaused;
  // Fallback para saves antigos sem o campo permanente
  const matches = universeManager.matchHistory || [];
  let count = 0;
  const rankings = universeManager.getBBPRanking?.() || [];
  matches.forEach(m => {
    if (m.winnerId !== playerId) return;
    const loserId = m.player1Id === playerId ? m.player2Id : m.player1Id;
    const wRank = rankings.findIndex(r => r.playerId === playerId) + 1;
    const lRank = rankings.findIndex(r => r.playerId === loserId) + 1;
    if (wRank > lRank && (wRank - lRank) >= 15) count++;
  });
  return count;
};

// ─── Helper: total de burst wins na carreira ───
const getBurstWins = (universeManager, playerId) => {
  const hist = universeManager.playerHistories?.get(playerId);
  return hist?.winsByBurst || 0;
};

// ─── Helper: Kings Court titles ───
const getKingsCourtTitles = (universeManager, playerId) => {
  const hist = universeManager.playerHistories?.get(playerId);
  return hist?.titles?.kingsCourtTitles || 0;
};

// ─── Helper: maior lossStreak (troféu de sofrimento) ───
const getWorstLossStreak = (universeManager, playerId) => {
  const hist = universeManager.playerHistories?.get(playerId);
  return hist?.bestLossStreak || 0;
};

// ─── Compute ALL records in one pass ───
export function computeAllRecords(universeManager) {
  if (!universeManager) return null;

  const allPlayers = TEAMS || [];
  const currentYear = universeManager.currentYear;

  // Gather per-player career stats
  const players = allPlayers.map((player, id) => {
    const hist = universeManager.playerHistories?.get(id) || {};
    const sigData = universeManager.signatureBlades?.get(id);
    const sig = sigData?.blade;
    const sigStats = sigData?.stats || {};
    const { points: bestPts, year: bestPtsYear } = getBestSeasonPoints(universeManager, id);
    const { titles: bestTitles, year: bestTitlesYear } = getBestSeasonTitles(universeManager, id);
    const currentSeasonPts = getSeasonPoints(universeManager, id, currentYear);
    const currentSeasonTitles = titlesInYear(universeManager, id, currentYear);

    return {
      id,
      name: player.name,
      shortName: shortName(player.name),
      country: player.country || '',
      colors: player.colors || ['#888','#444'],
      iconUrl: player.iconUrl,
      photoUrl: player.photoUrl,
      age: player.age || 25,
      status: player.status,
      // Career
      totalPoints:       universeManager.historicalRankings?.get(id) || 0,
      totalMatches:      hist.totalMatches || 0,
      totalWins:         hist.wins || 0,
      totalLosses:       hist.losses || 0,
      roundWins:         hist.roundWins || 0,
      roundLosses:       hist.roundLosses || 0,
      totalTitles:       hist.titles?.total || 0,
      kingsCourtTitles:  hist.titles?.kingsCourtTitles || 0,
      premierTitles:     hist.titles?.premierTitles || 0,
      signatureClashTitles:(hist.titles?.signatureClashTitles || 0) + (hist.titles?.invitationalTitles || 0),
      mastersTitles:     hist.titles?.mastersTitles || 0,
      openTitles:        hist.titles?.openTitles || 0,
      challengerTitles:  hist.titles?.challengerTitles || 0,
      redemptionTitles:  hist.titles?.redemptionTitles || 0,
      risingStarTitles:  hist.titles?.risingStarTitles || 0,
      risingFinalsTitles:hist.titles?.risingFinalsTitles || 0,
      bestWinStreak:     hist.bestWinStreak || 0,
      bestLossStreak:    hist.bestLossStreak || 0,
      winsByBurst:       hist.winsByBurst || 0,
      winsBySpin:        hist.winsBySpin || 0,
      winsByRingOut:     hist.winsByRingOut || 0,
      lossesByBurst:     hist.lossesByBurst || 0,
      titleBreadth:      getTitleBreadth(universeManager, id),
      winRate:           getWinRate(universeManager, id),
      roundWinRate:      getRoundWinRate(universeManager, id),
      yearsActive:       getYearsActive(universeManager, id),
      // Best season
      bestSeasonPts: bestPts,
      bestSeasonPtsYear: bestPtsYear,
      bestSeasonTitles:  bestTitles,
      bestSeasonTitlesYear: bestTitlesYear,
      // Current season
      currentSeasonPts,
      currentSeasonTitles,
      // Months at top tracking
      monthsAtTop:      hist.monthsAtTop || 0,
      currentTopStreak: hist.currentTopStreak || 0,
      longestTopStreak: hist.longestTopStreak || 0,
      // Signature blade
      sigName:            sig?.signatureName || sig?.name || '—',
      sigType:            sig?.type || '—',
      sigWins:            sigStats.totalWins || 0,
      sigLosses:          sigStats.totalLosses || 0,
      sigRounds:          sigStats.totalRounds || 0,
      sigBurstWins:       sigStats.winsByBurst || 0,
      sigSpinWins:        sigStats.winsBySpin || 0,
      sigRingOutWins:     sigStats.winsByRingOut || 0,
      sigBestStreak:      sigStats.bestWinStreak || 0,
      sigVsSignatureWins: sigStats.winsAgainstSignatures || 0,
      sigWinRate:         sigStats.totalRounds > 20 ? +(sigStats.totalWins / sigStats.totalRounds * 100).toFixed(1) : 0,
    };
  });

  // ─── BLADERS — CAREER RECORDS ───
  const career = {
    mostPoints:           [...players].sort((a,b) => b.totalPoints - a.totalPoints).slice(0,3),
    mostTitles:           [...players].sort((a,b) => b.totalTitles - a.totalTitles).slice(0,3),
    mostKingsCourt:       [...players].sort((a,b) => b.kingsCourtTitles - a.kingsCourtTitles).slice(0,3),
    mostPremierTitles:    [...players].sort((a,b) => b.premierTitles - a.premierTitles).slice(0,3),
    mostSignatureClash:   [...players].filter(p => p.signatureClashTitles > 0).sort((a,b) => b.signatureClashTitles - a.signatureClashTitles).slice(0,3),
    mostOpen:             [...players].filter(p => p.openTitles > 0).sort((a,b) => b.openTitles - a.openTitles).slice(0,3),
    mostMasters:          [...players].sort((a,b) => b.mastersTitles - a.mastersTitles).slice(0,3),
    mostChallenger:       [...players].filter(p => p.challengerTitles > 0).sort((a,b) => b.challengerTitles - a.challengerTitles).slice(0,3),
    mostMatches:          [...players].sort((a,b) => b.totalMatches - a.totalMatches).slice(0,3),
    mostWins:             [...players].sort((a,b) => b.totalWins - a.totalWins).slice(0,3),
    bestWinRate:          [...players].filter(p => p.totalMatches >= 30).sort((a,b) => b.winRate - a.winRate).slice(0,3),
    bestRoundWinRate:     [...players].filter(p => p.roundWins + p.roundLosses >= 60).sort((a,b) => b.roundWinRate - a.roundWinRate).slice(0,3),
    mostRoundWins:        [...players].sort((a,b) => b.roundWins - a.roundWins).slice(0,3),
    longestWinStreak:     [...players].sort((a,b) => b.bestWinStreak - a.bestWinStreak).slice(0,3),
    longestLossStreak:    [...players].sort((a,b) => b.bestLossStreak - a.bestLossStreak).slice(0,3),
    mostBurstWins:        [...players].sort((a,b) => b.winsByBurst - a.winsByBurst).slice(0,3),
    mostSpinWins:         [...players].sort((a,b) => b.winsBySpin - a.winsBySpin).slice(0,3),
    mostRingOutWins:      [...players].sort((a,b) => b.winsByRingOut - a.winsByRingOut).slice(0,3),
    mostTitleBreadth:     [...players].filter(p => p.titleBreadth > 0).sort((a,b) => b.titleBreadth - a.titleBreadth).slice(0,3),
    longestCareer:        [...players].sort((a,b) => b.yearsActive - a.yearsActive).slice(0,3),
    // Novos: Rs amadores
    mostRisingStarTitles: [...players].filter(p => p.risingStarTitles > 0).sort((a,b) => b.risingStarTitles - a.risingStarTitles).slice(0,3),
    mostRisingFinals:     [...players].filter(p => p.risingFinalsTitles > 0).sort((a,b) => b.risingFinalsTitles - a.risingFinalsTitles).slice(0,3),
  };

  // ─── BLADERS — SEASON RECORDS ───
  // Expande TODAS as temporadas de TODOS os jogadores como entradas individuais
  // para permitir que o mesmo jogador ocupe múltiplas posições no top 3.

  // Pontos por temporada — flatten de todos os jogadores × todos os anos
  const allSeasonPtsEntries = [];
  players.forEach(player => {
    const pointsArray = universeManager.pointsHistory?.get(player.id) || [];
    const byYear = {};
    pointsArray.forEach(e => { byYear[e.year] = (byYear[e.year] || 0) + e.points; });
    Object.entries(byYear).forEach(([y, pts]) => {
      if (pts > 0) {
        allSeasonPtsEntries.push({ ...player, bestSeasonPts: pts, bestSeasonPtsYear: +y });
      }
    });
  });
  allSeasonPtsEntries.sort((a, b) => b.bestSeasonPts - a.bestSeasonPts);

  // Títulos por temporada — flatten de todos os jogadores × todos os anos
  const allSeasonTitlesEntries = [];
  players.forEach(player => {
    const hist = universeManager.playerHistories?.get(player.id);
    const list = hist?.titles?.detailedList || [];
    const byYear = {};
    list.forEach(t => { byYear[t.year] = (byYear[t.year] || 0) + 1; });
    Object.entries(byYear).forEach(([y, n]) => {
      if (n > 0) {
        allSeasonTitlesEntries.push({ ...player, bestSeasonTitles: n, bestSeasonTitlesYear: +y });
      }
    });
  });
  allSeasonTitlesEntries.sort((a, b) => b.bestSeasonTitles - a.bestSeasonTitles);

  const season = {
    bestSeasonPts:    allSeasonPtsEntries.slice(0, 3),
    bestSeasonTitles: allSeasonTitlesEntries.slice(0, 3),
    // Current season
    currentPts:     [...players].filter(p => p.currentSeasonPts > 0).sort((a,b) => b.currentSeasonPts - a.currentSeasonPts).slice(0,3),
    currentTitles:  [...players].filter(p => p.currentSeasonTitles > 0).sort((a,b) => b.currentSeasonTitles - a.currentSeasonTitles).slice(0,3),
    // Meses no topo
    mostMonthsAtTop:      [...players].filter(p => p.monthsAtTop > 0).sort((a,b) => b.monthsAtTop - a.monthsAtTop).slice(0,3),
    longestTopStreak:     [...players].filter(p => p.longestTopStreak > 0).sort((a,b) => b.longestTopStreak - a.longestTopStreak).slice(0,3),
  };

  // ─── SIGNATURE BLADES RECORDS ───
  const blades = {
    mostRoundWins:     [...players].filter(p => p.sigRounds > 0).sort((a,b) => b.sigWins - a.sigWins).slice(0,3),
    bestWinRate:       [...players].filter(p => p.sigRounds > 20).sort((a,b) => b.sigWinRate - a.sigWinRate).slice(0,3),
    mostRoundsPlayed:  [...players].filter(p => p.sigRounds > 0).sort((a,b) => b.sigRounds - a.sigRounds).slice(0,3),
    mostBurstWins:     [...players].filter(p => p.sigRounds > 0).sort((a,b) => b.sigBurstWins - a.sigBurstWins).slice(0,3),
    mostSpinWins:      [...players].filter(p => p.sigRounds > 0).sort((a,b) => b.sigSpinWins - a.sigSpinWins).slice(0,3),
    mostRingOutWins:   [...players].filter(p => p.sigRounds > 0).sort((a,b) => b.sigRingOutWins - a.sigRingOutWins).slice(0,3),
    longestStreak:     [...players].filter(p => p.sigRounds > 0).sort((a,b) => b.sigBestStreak - a.sigBestStreak).slice(0,3),
    vsSignaturesWins:  [...players].filter(p => p.sigVsSignatureWins > 0).sort((a,b) => b.sigVsSignatureWins - a.sigVsSignatureWins).slice(0,3),
  };

  return { career, season, blades, players, currentYear };
}

// ─── Subcomponent: Podium (Top 3 card) ───
const PodiumCard = ({ rank, player, value, label, sublabel, color = C.gold }) => {
  if (!player) return null;
  const colors = player.colors || ['#666','#333'];
  const accentColor = rank === 0 ? C.gold : rank === 1 ? '#c0c0c0' : '#cd7f32';

  return (
    <div style={{
      flex: 1,
      minWidth: 0,
      background: `linear-gradient(160deg, rgba(${rank===0?'255,215,0':'255,255,255'},0.04) 0%, rgba(0,0,0,0) 100%)`,
      border: `1px solid ${accentColor}33`,
      borderTop: `2px solid ${accentColor}`,
      borderRadius: 4,
      padding: '14px 12px 12px',
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      transition: 'border-color .2s',
      clipPath: 'polygon(6px 0%, 100% 0%, calc(100% - 6px) 100%, 0% 100%)',
    }}>
      {/* Medal + rank */}
      <div style={{ display:'flex', alignItems:'center', gap:6, justifyContent:'space-between' }}>
        <span style={{ fontSize: rank === 0 ? 20 : 16 }}>{MEDAL[rank]}</span>
        <span style={{ fontFamily:'Orbitron,monospace', fontSize:8, color:C.dim, letterSpacing:'.2em' }}>#{rank+1}</span>
      </div>

      {/* Player name */}
      <div>
        <div style={{ fontFamily:'Rajdhani,sans-serif', fontWeight:700, fontSize:13, color:C.text, lineHeight:1.2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
          {player.shortName}
        </div>
        <div style={{ fontFamily:'Orbitron,monospace', fontSize:7, color:C.dim, marginTop:2, letterSpacing:'.05em' }}>
          {flag(player.country)}
        </div>
      </div>

      {/* Value */}
      <div style={{ marginTop:'auto', display:'flex', flexDirection:'column', gap:2 }}>
        <div style={{ fontFamily:'Black Ops One,cursive', fontSize: typeof value === 'string' && value.length > 6 ? 18 : 24, color: accentColor, lineHeight:1, filter:`drop-shadow(0 0 8px ${accentColor}66)` }}>
          {value}
        </div>
        <div style={{ fontFamily:'Orbitron,monospace', fontSize:7, color:`${color}99`, letterSpacing:'.12em', textTransform:'uppercase' }}>
          {label}
        </div>
        {sublabel && <div style={{ fontFamily:'Rajdhani,sans-serif', fontSize:10, color:C.dim }}>{sublabel}</div>}
      </div>
    </div>
  );
};

// ─── Subcomponent: Record Block (título + 3 podiums) ───
const RecordBlock = ({ title, icon, top3, getValue, getLabel, getSublabel, color = C.gold }) => {
  if (!top3 || top3.length === 0) return (
    <div style={{ background:C.bg, border:`1px solid ${C.border}`, borderRadius:4, padding:'16px 14px', opacity:.4 }}>
      <div style={{ fontFamily:'Orbitron,monospace', fontSize:8, color:C.dim, letterSpacing:'.25em' }}>{icon} {title}</div>
      <div style={{ fontFamily:'Rajdhani,sans-serif', fontSize:11, color:C.vdim, marginTop:8 }}>Sem dados ainda — simule mais temporadas</div>
    </div>
  );

  return (
    <div style={{ background:C.bg, border:`1px solid ${C.border}`, borderRadius:4, padding:'14px 12px', display:'flex', flexDirection:'column', gap:10 }}>
      {/* Header */}
      <div style={{ fontFamily:'Orbitron,monospace', fontSize:8, fontWeight:700, color:`${color}cc`, letterSpacing:'.25em', display:'flex', alignItems:'center', gap:6 }}>
        <span style={{ fontSize:14 }}>{icon}</span>
        {title}
      </div>
      {/* Podiums */}
      <div style={{ display:'flex', gap:6 }}>
        {top3.map((p, i) => (
          <PodiumCard
            key={`${p.id}-${i}`}
            rank={i}
            player={p}
            value={getValue(p, i)}
            label={getLabel(p, i)}
            sublabel={getSublabel ? getSublabel(p, i) : null}
            color={color}
          />
        ))}
        {/* Fill empty slots */}
        {[...Array(Math.max(0, 3 - top3.length))].map((_, i) => (
          <div key={`empty-${i}`} style={{ flex:1, background:'rgba(255,255,255,.01)', border:`1px dashed ${C.vdim}`, borderRadius:4, opacity:.3, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <span style={{ fontFamily:'Orbitron,monospace', fontSize:8, color:C.vdim }}>—</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Section header ───
const SectionHeader = ({ icon, title, color = C.gold }) => (
  <div style={{ display:'flex', alignItems:'center', gap:10, margin:'28px 0 14px', paddingBottom:8, borderBottom:`1px solid ${color}33` }}>
    <span style={{ fontSize:18 }}>{icon}</span>
    <div>
      <div style={{ fontFamily:'Orbitron,monospace', fontSize:9, fontWeight:700, letterSpacing:'.4em', color:`${color}cc`, textTransform:'uppercase' }}>{title}</div>
    </div>
    <div style={{ flex:1, height:1, background:`linear-gradient(90deg,${color}22,transparent)`, marginLeft:8 }} />
  </div>
);

// ─── BLADERS TAB ───
const BladersTab = ({ records }) => {
  const { career, season, currentYear } = records;

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:0 }}>

      <SectionHeader icon="👑" title="Grandes Títulos" color={C.gold} />
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
        <RecordBlock
          title="MAIS TÍTULOS — CARREIRA" icon="🏆" top3={career.mostTitles} color={C.gold}
          getValue={p => p.totalTitles} getLabel={() => 'títulos totais'}
          getSublabel={p => `${p.kingsCourtTitles} KC · ${p.premierTitles} Premier`}
        />
        <RecordBlock
          title="MAIS TÍTULOS — TEMPORADA" icon="🗓️" top3={season.bestSeasonTitles} color={C.gold}
          getValue={p => p.bestSeasonTitles} getLabel={() => 'em uma temporada'}
          getSublabel={p => p.bestSeasonTitlesYear ? `Ano ${p.bestSeasonTitlesYear}` : null}
        />
        <RecordBlock
          title="MAIS KINGS COURT" icon="👑" top3={career.mostKingsCourt} color={C.purple}
          getValue={p => p.kingsCourtTitles} getLabel={() => 'Kings Court'}
        />
        <RecordBlock
          title="MAIS PREMIERS" icon="⭐" top3={career.mostPremierTitles} color={C.cyan}
          getValue={p => p.premierTitles} getLabel={() => 'Premier títulos'}
        />
        <RecordBlock
          title="MAIS SIGNATURE CLASH" icon="✍️" top3={career.mostSignatureClash} color={'#fde68a'}
          getValue={p => p.signatureClashTitles} getLabel={() => 'Signature Clash'}
          getSublabel={p => `MD7 · 1500pts`}
        />
        <RecordBlock
          title="MAIS CROSSOVER OPENS" icon="🌐" top3={career.mostOpen} color={'#86efac'}
          getValue={p => p.openTitles} getLabel={() => 'Crossover Open'}
          getSublabel={p => `Pros vs Rising Stars`}
        />
        <RecordBlock
          title="MAIS MASTERS" icon="💎" top3={career.mostMasters} color={C.purple}
          getValue={p => p.mastersTitles} getLabel={() => 'Masters títulos'}
        />
        <RecordBlock
          title="MAIS CHALLENGERS" icon="🔵" top3={career.mostChallenger} color={C.blue}
          getValue={p => p.challengerTitles} getLabel={() => 'Challenger títulos'}
        />
        <RecordBlock
          title="MAIOR VARIEDADE DE TÍTULOS" icon="🌈" top3={career.mostTitleBreadth} color={C.orange}
          getValue={p => `${p.titleBreadth}/7`} getLabel={() => 'tiers distintos'}
          getSublabel={p => `${p.totalTitles} títulos total`}
        />
      </div>

      <SectionHeader icon="⭐" title="Circuito Amador" color={C.orange} />
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
        <RecordBlock
          title="MAIS RISING FINALS" icon="🌟" top3={career.mostRisingFinals} color={C.gold}
          getValue={p => p.risingFinalsTitles} getLabel={() => 'Rising Finals'}
        />
        <RecordBlock
          title="MAIS RISING STAR" icon="🌠" top3={career.mostRisingStarTitles} color={C.orange}
          getValue={p => p.risingStarTitles} getLabel={() => 'Rising Star'}
        />
      </div>

      <SectionHeader icon="💎" title="Pontos" color={C.cyan} />
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
        <RecordBlock
          title="MAIS PONTOS — CARREIRA" icon="📊" top3={career.mostPoints} color={C.cyan}
          getValue={p => p.totalPoints.toLocaleString()} getLabel={() => 'pontos históricos'}
        />
        <RecordBlock
          title="MELHOR TEMPORADA (PONTOS)" icon="📅" top3={season.bestSeasonPts} color={C.cyan}
          getValue={p => p.bestSeasonPts.toLocaleString()} getLabel={() => 'em uma temporada'}
          getSublabel={p => p.bestSeasonPtsYear ? `Ano ${p.bestSeasonPtsYear}` : null}
        />
        <RecordBlock
          title={`LIDERANDO TEMPORADA ${currentYear}`} icon="⚡" top3={season.currentPts} color={C.green}
          getValue={p => p.currentSeasonPts.toLocaleString()} getLabel={() => `pontos em ${currentYear}`}
        />
        <RecordBlock
          title={`TÍTULOS EM ${currentYear}`} icon="🔥" top3={season.currentTitles} color={C.green}
          getValue={p => p.currentSeasonTitles} getLabel={() => `títulos em ${currentYear}`}
        />
      </div>

      <SectionHeader icon="⚔️" title="Performance" color={C.orange} />
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
        <RecordBlock
          title="MAIS VITÓRIAS — CARREIRA" icon="🥊" top3={career.mostWins} color={C.orange}
          getValue={p => p.totalWins} getLabel={() => 'vitórias'}
          getSublabel={p => `em ${p.totalMatches} partidas`}
        />
        <RecordBlock
          title="MELHOR WIN RATE (mín. 30 partidas)" icon="📈" top3={career.bestWinRate} color={C.orange}
          getValue={p => `${p.winRate}%`} getLabel={() => 'win rate'}
          getSublabel={p => `${p.totalWins}W / ${p.totalLosses}L`}
        />
        <RecordBlock
          title="MAIS PARTIDAS JOGADAS" icon="🎮" top3={career.mostMatches} color={C.dim}
          getValue={p => p.totalMatches} getLabel={() => 'partidas'}
          getSublabel={p => `${p.yearsActive} anos de carreira`}
        />
        <RecordBlock
          title="MAIS ROUNDS VENCIDOS" icon="🎯" top3={career.mostRoundWins} color={C.purple}
          getValue={p => p.roundWins} getLabel={() => 'rounds ganhos'}
        />
        <RecordBlock
          title="MELHOR ROUND WIN RATE (mín. 60 rounds)" icon="🎲" top3={career.bestRoundWinRate} color={C.purple}
          getValue={p => `${p.roundWinRate}%`} getLabel={() => 'rounds win rate'}
          getSublabel={p => `${p.roundWins} de ${p.roundWins + p.roundLosses}`}
        />
      </div>

      <SectionHeader icon="🔥" title="Sequências & Domínio" color={C.red} />
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
        <RecordBlock
          title="MAIOR SEQUÊNCIA DE VITÓRIAS" icon="🔥" top3={career.longestWinStreak} color={C.red}
          getValue={p => p.bestWinStreak} getLabel={() => 'vitórias seguidas'}
        />
        <RecordBlock
          title="MAIOR SEQUÊNCIA DE DERROTAS" icon="💔" top3={career.longestLossStreak} color={C.dim}
          getValue={p => p.bestLossStreak} getLabel={() => 'derrotas seguidas'}
          getSublabel={p => `${p.totalTitles > 0 ? 'Sobreviveu' : 'Nunca voltou'}`}
        />
        <RecordBlock
          title="MAIOR CARREIRA" icon="⏳" top3={career.longestCareer} color={C.blue}
          getValue={p => `${p.yearsActive}a`} getLabel={() => 'anos ativos'}
          getSublabel={p => `${p.totalTitles} títulos`}
        />
      </div>

      <SectionHeader icon="👑" title="Domínio do Ranking" color={C.gold} />
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
        <RecordBlock
          title="MAIOR SEQUÊNCIA NO TOPO" icon="🏔️" top3={season.longestTopStreak} color={C.gold}
          getValue={p => `${p.longestTopStreak}m`} getLabel={() => 'meses consecutivos como #1'}
          getSublabel={p => `${p.monthsAtTop} total na carreira`}
        />
        <RecordBlock
          title="MAIS MESES COMO #1 (TOTAL)" icon="📅" top3={season.mostMonthsAtTop} color={C.purple}
          getValue={p => `${p.monthsAtTop}m`} getLabel={() => 'meses no topo (soma)'}
          getSublabel={p => p.longestTopStreak > 0 ? `Maior streak: ${p.longestTopStreak}m` : null}
        />
      </div>

      <SectionHeader icon="💥" title="Métodos de Vitória" color={C.pink} />
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10 }}>
        <RecordBlock
          title="MAIS BURST FINISHES" icon="💥" top3={career.mostBurstWins} color={C.pink}
          getValue={p => p.winsByBurst} getLabel={() => 'burst wins'}
        />
        <RecordBlock
          title="MAIS SPIN OUTS" icon="🌀" top3={career.mostSpinWins} color={C.cyan}
          getValue={p => p.winsBySpin} getLabel={() => 'spin out wins'}
        />
        <RecordBlock
          title="MAIS RING OUTS" icon="💨" top3={career.mostRingOutWins} color={C.orange}
          getValue={p => p.winsByRingOut} getLabel={() => 'ring out wins'}
        />
      </div>

    </div>
  );
};

// ─── SIGNATURE BLADES TAB ───
const SignatureTab = ({ records }) => {
  const { blades, players } = records;

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:0 }}>

      <SectionHeader icon="⚔️" title="Performance das Signature Blades" color={C.gold} />
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
        <RecordBlock
          title="MAIS ROUNDS VENCIDOS (SIGNATURE)" icon="🏅" top3={blades.mostRoundWins} color={C.gold}
          getValue={p => p.sigWins} getLabel={() => 'rounds vencidos'}
          getSublabel={p => p.sigName !== '—' ? p.sigName : null}
        />
        <RecordBlock
          title="MELHOR WIN RATE (mín. 20 rounds)" icon="📊" top3={blades.bestWinRate} color={C.gold}
          getValue={p => `${p.sigWinRate}%`} getLabel={() => 'win rate'}
          getSublabel={p => p.sigName !== '—' ? p.sigName : null}
        />
        <RecordBlock
          title="MAIS ROUNDS DISPUTADOS" icon="⚔️" top3={blades.mostRoundsPlayed} color={C.cyan}
          getValue={p => p.sigRounds} getLabel={() => 'rounds totais'}
          getSublabel={p => p.sigName !== '—' ? p.sigName : null}
        />
        <RecordBlock
          title="MAIOR SEQUÊNCIA (SIGNATURE)" icon="🔥" top3={blades.longestStreak} color={C.red}
          getValue={p => p.sigBestStreak} getLabel={() => 'rounds seguidos'}
          getSublabel={p => p.sigName !== '—' ? p.sigName : null}
        />
        <RecordBlock
          title="MAIS VITÓRIAS VS SIGNATURES" icon="👑" top3={blades.vsSignaturesWins} color={C.purple}
          getValue={p => p.sigVsSignatureWins} getLabel={() => 'vs outras signatures'}
          getSublabel={p => p.sigName !== '—' ? p.sigName : null}
        />
      </div>

      <SectionHeader icon="💥" title="Métodos de Finalização (Signature)" color={C.pink} />
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10 }}>
        <RecordBlock
          title="MAIS BURSTS (SIGNATURE)" icon="💥" top3={blades.mostBurstWins} color={C.pink}
          getValue={p => p.sigBurstWins} getLabel={() => 'burst wins'}
          getSublabel={p => p.sigName !== '—' ? p.sigName : null}
        />
        <RecordBlock
          title="MAIS SPIN OUTS (SIGNATURE)" icon="🌀" top3={blades.mostSpinWins} color={C.cyan}
          getValue={p => p.sigSpinWins} getLabel={() => 'spin out wins'}
          getSublabel={p => p.sigName !== '—' ? p.sigName : null}
        />
        <RecordBlock
          title="MAIS RING OUTS (SIGNATURE)" icon="💨" top3={blades.mostRingOutWins} color={C.orange}
          getValue={p => p.sigRingOutWins} getLabel={() => 'ring out wins'}
          getSublabel={p => p.sigName !== '—' ? p.sigName : null}
        />
      </div>

      {/* Signature blade index — all player blades listed */}
      <SectionHeader icon="📋" title="Índice de Signature Blades" color={C.blue} />
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:6 }}>
        {players.filter(p => p.sigName !== '—' && p.sigRounds > 0).sort((a,b) => b.sigWins - a.sigWins).map(p => (
          <div key={p.id} style={{
            background: C.bg,
            border: `1px solid ${C.border}`,
            borderLeft: `3px solid ${p.colors[0] || C.gold}`,
            borderRadius: 4,
            padding: '10px 12px',
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
            clipPath: 'polygon(4px 0%,100% 0%,calc(100% - 4px) 100%,0% 100%)',
          }}>
            <div style={{ fontFamily:'Rajdhani,sans-serif', fontWeight:700, fontSize:11, color:C.text, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.sigName}</div>
            <div style={{ fontFamily:'Orbitron,monospace', fontSize:7, color:`${p.colors[0] || C.gold}99`, letterSpacing:'.1em' }}>{p.sigType}</div>
            <div style={{ fontFamily:'Rajdhani,sans-serif', fontSize:10, color:C.dim }}>{p.shortName}</div>
            <div style={{ display:'flex', gap:8, marginTop:2 }}>
              <span style={{ fontFamily:'Orbitron,monospace', fontSize:8, color:C.green }}>{p.sigWins}W</span>
              <span style={{ fontFamily:'Orbitron,monospace', fontSize:8, color:C.red }}>{p.sigLosses}L</span>
              {p.sigWinRate > 0 && <span style={{ fontFamily:'Orbitron,monospace', fontSize:8, color:C.gold }}>{p.sigWinRate}%</span>}
            </div>
          </div>
        ))}
        {players.filter(p => p.sigName !== '—' && p.sigRounds > 0).length === 0 && (
          <div style={{ gridColumn:'1 / -1', textAlign:'center', fontFamily:'Orbitron,monospace', fontSize:9, color:C.vdim, padding:'32px 0' }}>
            Nenhuma Signature Blade disputou rounds ainda
          </div>
        )}
      </div>

    </div>
  );
};

// ─── MAIN COMPONENT ───
const RecordsView = ({ universeManager }) => {
  const [tab, setTab] = useState('bladers');

  const records = useMemo(() => computeAllRecords(universeManager), [universeManager]);

  const tabs = [
    { id: 'bladers',    label: '👤 BLADERS',           color: C.gold   },
    { id: 'signatures', label: '⚔️ SIGNATURE BLADES',  color: C.purple },
  ];

  if (!records) return (
    <div style={{ padding:'60px 28px', textAlign:'center', fontFamily:'Orbitron,monospace', fontSize:10, color:C.vdim, letterSpacing:'.3em' }}>
      NENHUM DADO DISPONÍVEL — SIMULE TORNEIOS PRIMEIRO
    </div>
  );

  return (
    <div style={{ animation:'hub-entry .4s ease both', padding:'0 28px 80px' }}>

      {/* ─── PAGE HEADER ─── */}
      <div style={{ textAlign:'center', padding:'36px 0 28px', position:'relative' }}>
        <div style={{ position:'absolute', top:0, left:'50%', transform:'translateX(-50%)', width:700, height:180, background:'radial-gradient(ellipse,rgba(255,215,0,0.05),transparent 70%)', pointerEvents:'none' }} />
        <div style={{ fontFamily:'Orbitron,monospace', fontSize:9, letterSpacing:'.6em', color:'rgba(255,215,0,0.45)', marginBottom:10, textTransform:'uppercase' }}>
          Registros da História
        </div>
        <div style={{ fontFamily:'Black Ops One,cursive', fontSize:'clamp(28px,4vw,48px)', background:'linear-gradient(135deg,#fff 0%,#ffd700 40%,#ff9500 70%,#ffd700 100%)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', letterSpacing:'.04em', lineHeight:1 }}>
          RECORDES
        </div>
        <div style={{ fontFamily:'Rajdhani,sans-serif', fontSize:13, color:'rgba(255,255,255,0.3)', marginTop:10 }}>
          Carreira · Temporada · Top 3 em cada categoria
        </div>
      </div>

      {/* ─── SUB-TABS ─── */}
      <div style={{ display:'flex', gap:4, marginBottom:28, borderBottom:`1px solid ${C.border}`, paddingBottom:0 }}>
        {tabs.map(t => (
          <button
            key={t.id}
            className="hub-tab"
            onClick={() => setTab(t.id)}
            style={{
              background: tab === t.id ? `${t.color}18` : 'transparent',
              borderBottom: tab === t.id ? `2px solid ${t.color}` : '2px solid transparent',
              color: tab === t.id ? t.color : C.dim,
              fontFamily: 'Orbitron,monospace',
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '.2em',
              padding: '10px 18px',
              cursor: 'pointer',
              border: 'none',
              outline: 'none',
              transition: 'all .15s ease',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ─── CONTENT ─── */}
      {tab === 'bladers'    && <BladersTab    records={records} />}
      {tab === 'signatures' && <SignatureTab  records={records} />}
    </div>
  );
};

export default RecordsView;
