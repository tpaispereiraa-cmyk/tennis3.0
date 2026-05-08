// ====================================================================
// SEASONAWARDSCERMONY.JSX  — Cerimônia de Encerramento de Temporada
// ====================================================================
// Phases:
//   'intro'   → tela de abertura
//   'awards'  → prêmios individuais (1 por 1)
//   'summary' → tela de resumo com todos os prêmios + aposentadorias
// ====================================================================

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { TEAMS } from './data.js';
import PlayerImage from './PlayerImage.jsx';

// ── Utils ──────────────────────────────────────────────────────────

const O = { fontFamily: 'Orbitron, monospace' };
const R = { fontFamily: 'Rajdhani, sans-serif' };
const B = { fontFamily: '"Black Ops One", cursive' };

const CEREMONY_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Black+Ops+One&family=Rajdhani:wght@400;600;700&family=Orbitron:wght@400;700;900&display=swap');

  @keyframes sac-fade   { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
  @keyframes sac-pop    { 0%{opacity:0;transform:scale(.8)} 60%{transform:scale(1.04)} 100%{opacity:1;transform:scale(1)} }
  @keyframes sac-glow   { 0%,100%{box-shadow:0 0 30px rgba(255,215,0,.3)} 50%{box-shadow:0 0 60px rgba(255,215,0,.7)} }
  @keyframes sac-scan   { 0%{transform:translateY(-100%)} 100%{transform:translateY(100vh)} }
  @keyframes sac-spin   { from{transform:rotate(0)} to{transform:rotate(360deg)} }
  @keyframes sac-pulse  { 0%,100%{opacity:.55} 50%{opacity:1} }
  @keyframes sac-rays   {
    0%   { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  @keyframes sac-ticker {
    0%   { transform: translateX(100%); }
    100% { transform: translateX(-100%); }
  }

  .sac-overlay {
    position: fixed; inset: 0; z-index: 9999;
    background: radial-gradient(ellipse 120% 90% at 50% 110%, #1a0030 0%, #0a000f 45%, #000008 100%);
    display: flex; flex-direction: column;
    font-family: 'Rajdhani', sans-serif; color: #fff;
    overflow: hidden;
  }

  .sac-bg-grid {
    position: absolute; inset: 0; pointer-events: none;
    background-image:
      linear-gradient(rgba(0,212,255,.025) 1px, transparent 1px),
      linear-gradient(90deg, rgba(0,212,255,.025) 1px, transparent 1px);
    background-size: 60px 60px;
  }

  .sac-bg-orb1 {
    position: absolute; top: 3%; left: 5%; width: 500px; height: 500px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(180,0,255,.08), transparent 70%);
    filter: blur(70px); pointer-events: none;
  }
  .sac-bg-orb2 {
    position: absolute; bottom: 5%; right: 4%; width: 400px; height: 400px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(0,212,255,.08), transparent 70%);
    filter: blur(70px); pointer-events: none;
  }

  .sac-scan-line {
    position: fixed; inset: 0; pointer-events: none; overflow: hidden; z-index: 50; opacity: .12;
  }
  .sac-scan-line div {
    width: 100%; height: 2px;
    background: linear-gradient(90deg, transparent, rgba(0,212,255,.8), transparent);
    animation: sac-scan 9s linear infinite;
  }

  .sac-topbar {
    position: relative; z-index: 10;
    display: flex; align-items: center; justify-content: space-between;
    padding: 0 28px; height: 56px;
    background: rgba(0,0,0,.7); backdrop-filter: blur(14px);
    border-bottom: 1px solid rgba(255,215,0,.15);
  }

  .sac-skip-btn {
    background: rgba(255,255,255,.05);
    border: 1px solid rgba(255,255,255,.15);
    color: rgba(255,255,255,.6);
    padding: 8px 20px; border-radius: 6px;
    cursor: pointer; font-family: 'Orbitron', monospace;
    font-size: 10px; letter-spacing: .12em; font-weight: 700;
    transition: all .2s;
  }
  .sac-skip-btn:hover { border-color: rgba(255,215,0,.5); color: #ffd700; background: rgba(255,215,0,.08); }

  .sac-confirm-btn {
    background: linear-gradient(135deg, #ffd700, #ff8c00);
    border: none; color: #000; padding: 14px 40px; border-radius: 8px;
    cursor: pointer; font-family: 'Orbitron', monospace;
    font-size: 12px; letter-spacing: .15em; font-weight: 900;
    transition: all .2s; animation: sac-glow 3s ease-in-out infinite;
  }
  .sac-confirm-btn:hover { transform: translateY(-2px); filter: brightness(1.1); }

  .sac-award-card {
    animation: sac-pop .5s cubic-bezier(.2,.8,.2,1) both;
    background: rgba(255,255,255,.03);
    border: 1px solid rgba(255,215,0,.2);
    border-radius: 16px; padding: 32px;
    position: relative; overflow: hidden;
  }

  .sac-award-rays {
    position: absolute; inset: -60%; pointer-events: none;
    background: conic-gradient(
      transparent 0deg, rgba(255,215,0,.06) 45deg, transparent 90deg,
      transparent 180deg, rgba(255,165,0,.04) 225deg, transparent 270deg
    );
    animation: sac-rays 20s linear infinite;
  }

  .sac-retire-card {
    animation: sac-fade .4s ease both;
    background: rgba(255,255,255,.025);
    border-radius: 10px; padding: 16px;
    border-left: 3px solid;
  }

  .sac-progress-dots {
    display: flex; gap: 6px; flex-wrap: wrap; justify-content: center;
  }
  .sac-dot {
    width: 8px; height: 8px; border-radius: 50%;
    background: rgba(255,255,255,.15); transition: all .3s;
  }
  .sac-dot.done { background: #ffd700; }
  .sac-dot.current { background: #fff; transform: scale(1.4); }

  .sac-stat-row {
    display: flex; align-items: center; justify-content: space-between;
    padding: 6px 0; border-bottom: 1px solid rgba(255,255,255,.06);
  }
  .sac-stat-row:last-child { border-bottom: none; }

  .sac-section-title {
    font-family: 'Orbitron', monospace;
    font-size: 10px; letter-spacing: .2em; font-weight: 700;
    text-transform: uppercase; padding: 8px 0 12px;
    border-bottom: 1px solid rgba(255,255,255,.08);
    margin-bottom: 12px;
  }
`;

// ── Award definitions ─────────────────────────────────────────────

const AWARD_DEFS = [
  { id: 'mvp',        emoji: '🥇', name: 'MVP DA TEMPORADA',       color: '#ffd700', desc: 'Melhor desempenho geral — vitórias, títulos e ranking combinados' },
  { id: 'champion',   emoji: '👑', name: 'CAMPEÃO DOS CAMPEÕES',   color: '#ffd700', desc: 'Maior número de títulos conquistados na temporada' },
  { id: 'riser',      emoji: '📈', name: 'MAIOR EVOLUÇÃO',         color: '#34d399', desc: 'Jogador que mais subiu posições no ranking vs início da temporada' },
  { id: 'fall',       emoji: '📉', name: 'MAIOR QUEDA',            color: '#f97316', desc: 'Quem perdeu mais posições no ranking ao longo do ano' },
  { id: 'streak',     emoji: '🔥', name: 'JOGADOR EM FORMA',       color: '#ef4444', desc: 'Maior sequência de vitórias consecutivas na temporada' },
  { id: 'grandslam',  emoji: '🎯', name: 'REI DOS GRAND SLAMS',    color: '#a78bfa', desc: 'Melhor performance em torneios Grand Slam' },
  { id: 'rookie',     emoji: '🌱', name: 'REVELAÇÃO DO ANO',       color: '#6ee7b7', desc: 'Melhor debutante ou jogador promovido recentemente' },
  { id: 'veteran',    emoji: '🏛️', name: 'VETERANO DE FERRO',      color: '#60a5fa', desc: 'Jogador mais velho ainda no top-16' },
  { id: 'executioner',emoji: '⚔️', name: 'CARRASCO',              color: '#e879f9', desc: 'Quem mais derrubou jogadores do Top-10' },
  { id: 'winrate',    emoji: '🧊', name: 'PRECISÃO CIRÚRGICA',     color: '#38bdf8', desc: 'Maior percentual de vitórias (mín. 10 partidas)' },
  { id: 'blade_year', emoji: '🌀', name: 'BLADE DO ANO',           color: '#ffd700', desc: 'Signature Blade com maior win rate na temporada' },
  { id: 'blade_burst',emoji: '💥', name: 'MAIS DESTRUIDOR',        color: '#ef4444', desc: 'Signature Blade com maior percentual de vitórias por Burst' },
  { id: 'blade_tank', emoji: '🛡️', name: 'MAIS RESISTENTE',       color: '#3b82f6', desc: 'Signature Blade com menor percentual de derrotas por Burst sofrido' },
  { id: 'blade_arena',emoji: '🎭', name: 'MAIS VERSÁTIL',          color: '#f59e0b', desc: 'Signature Blade com vitórias em mais tipos de arena diferentes' },
  { id: 'blade_fear', emoji: '⚡', name: 'MAIS TEMIDO',            color: '#c084fc', desc: 'Signature Blade com maior win rate contra outros Signatures' },
];

// ── Award computation ──────────────────────────────────────────────

function computeAwards(universeManager, completedYear, bbpSnapshot, playerHistoriesSnapshot, signaturesSnapshot) {
  const players = universeManager.TEAMS || universeManager.players || [];

  // Helper: get player obj
  const getPlayer = (id) => TEAMS[id] || players[id];

  // Helper: titles in a specific year
  const titlesInYear = (hist, year) =>
    (hist?.titles?.detailedList || []).filter(t => t.year === year).length;

  // Helper: win rate
  const winRate = (hist) => {
    const total = (hist?.wins || 0) + (hist?.losses || 0);
    return total >= 10 ? ((hist.wins || 0) / total) * 100 : null;
  };

  const results = {};

  // Build BBP ranking positions from snapshot
  const rankMap = {}; // playerId → position (1-based)
  bbpSnapshot.forEach((entry, idx) => { rankMap[entry.playerId] = idx + 1; });

  // ── PLAYER AWARDS ──

  // MVP: composite score = ranking*0.4 + seasonTitles*0.4 + winRate*0.2
  {
    let best = null, bestScore = -1;
    bbpSnapshot.forEach((entry) => {
      const hist = playerHistoriesSnapshot.get(entry.playerId);
      const rank = rankMap[entry.playerId] || 99;
      const titles = titlesInYear(hist, completedYear);
      const wr = winRate(hist) ?? 50;
      const score = (100 - rank) * 0.4 + titles * 20 * 0.4 + wr * 0.2;
      if (score > bestScore) { bestScore = score; best = entry.playerId; }
    });
    results.mvp = { playerId: best, player: getPlayer(best), extra: `${titlesInYear(playerHistoriesSnapshot.get(best), completedYear)} títulos` };
  }

  // CHAMPION: most titles
  {
    let best = null, bestTitles = -1;
    playerHistoriesSnapshot.forEach((hist, id) => {
      const t = titlesInYear(hist, completedYear);
      if (t > bestTitles) { bestTitles = t; best = id; }
    });
    results.champion = { playerId: best, player: getPlayer(best), extra: `${bestTitles} títulos em ${completedYear}` };
  }

  // RISER: most ranking positions gained (need rankingHistory)
  {
    let best = null, bestGain = 0;
    // Compare current rank vs rank at start of year (first snapshot)
    const history = universeManager.rankingHistory || [];
    const startSnap = history.length > 12 ? history[history.length - 28] || history[0] : history[0];
    const endSnap   = history.length > 0  ? history[history.length - 1] : null;
    if (startSnap && endSnap) {
      endSnap.forEach((endPos, id) => {
        const startPos = startSnap.get(id) ?? 99;
        const gain = startPos - endPos; // positive = moved up
        if (gain > bestGain) { bestGain = gain; best = id; }
      });
    }
    if (!best && bbpSnapshot.length > 0) best = bbpSnapshot[bbpSnapshot.length - 5]?.playerId;
    results.riser = { playerId: best, player: getPlayer(best), extra: bestGain > 0 ? `+${bestGain} posições` : 'Top performer' };
  }

  // FALL: biggest ranking drop
  {
    let worst = null, worstDrop = 0;
    const history = universeManager.rankingHistory || [];
    const startSnap = history.length > 12 ? history[history.length - 28] || history[0] : history[0];
    const endSnap   = history.length > 0  ? history[history.length - 1] : null;
    if (startSnap && endSnap) {
      endSnap.forEach((endPos, id) => {
        const startPos = startSnap.get(id) ?? 99;
        const drop = endPos - startPos;
        if (drop > worstDrop) { worstDrop = drop; worst = id; }
      });
    }
    if (!worst && bbpSnapshot.length > 5) worst = bbpSnapshot[bbpSnapshot.length - 6]?.playerId;
    results.fall = { playerId: worst, player: getPlayer(worst), extra: worstDrop > 0 ? `-${worstDrop} posições` : '—' };
  }

  // STREAK: best win streak — use tournamentHistory to compute this year's matches
  {
    let best = null, bestStreak = 0;
    playerHistoriesSnapshot.forEach((hist, id) => {
      const matches = (hist.tournamentHistory || []).filter(t => t.year === completedYear);
      let streak = 0, maxStreak = 0;
      matches.forEach(m => {
        if (m.position === 1 || m.eliminatedRound === 'CHAMPION' || m.wins > 0) {
          streak++;
          if (streak > maxStreak) maxStreak = streak;
        } else {
          streak = 0;
        }
      });
      if (maxStreak > bestStreak) { bestStreak = maxStreak; best = id; }
    });
    if (!best && bbpSnapshot.length > 0) best = bbpSnapshot[0]?.playerId;
    results.streak = { playerId: best, player: getPlayer(best), extra: `${bestStreak} torneios seguidos` };
  }

  // GRANDSLAM: most grandslam titles
  {
    let best = null, bestGs = 0;
    playerHistoriesSnapshot.forEach((hist, id) => {
      const gs = (hist?.titles?.detailedList || [])
        .filter(t => t.year === completedYear && (t.tournamentTier === 'GRAND_SLAM' || t.tournamentType === 'GRAND_SLAM')).length;
      if (gs > bestGs) { bestGs = gs; best = id; }
    });
    // Fallback: player with most titles
    if (!best || bestGs === 0) best = results.champion?.playerId;
    results.grandslam = { playerId: best, player: getPlayer(best), extra: `${bestGs} Grand Slams` };
  }

  // ROOKIE: most titles among players with debutYear === completedYear or completedYear-1
  {
    let best = null, bestScore = -1;
    bbpSnapshot.forEach((entry) => {
      const p = getPlayer(entry.playerId);
      if (!p) return;
      const debutYear = p.debutYear || completedYear;
      if (debutYear >= completedYear - 1) {
        const hist = playerHistoriesSnapshot.get(entry.playerId);
        const t = titlesInYear(hist, completedYear);
        const rank = rankMap[entry.playerId] || 99;
        const score = t * 30 + (100 - rank);
        if (score > bestScore) { bestScore = score; best = entry.playerId; }
      }
    });
    if (!best && bbpSnapshot.length > 3) best = bbpSnapshot[3]?.playerId;
    results.rookie = { playerId: best, player: getPlayer(best), extra: 'Destaque da nova geração' };
  }

  // VETERAN: oldest player in top-16
  {
    let best = null, maxAge = 0;
    bbpSnapshot.slice(0, 16).forEach(entry => {
      const p = getPlayer(entry.playerId);
      if (p && (p.age || 0) > maxAge) { maxAge = p.age; best = entry.playerId; }
    });
    results.veteran = { playerId: best, player: getPlayer(best), extra: `${maxAge} anos, ainda no Top 16` };
  }

  // EXECUTIONER: most wins over top-10 players (approximate via tournamentHistory rankings)
  {
    let best = null, bestKills = 0;
    const top10Ids = new Set(bbpSnapshot.slice(0, 10).map(e => e.playerId));
    playerHistoriesSnapshot.forEach((hist, id) => {
      if (top10Ids.has(id)) return; // can't be your own category
      // Count tournament matches won vs top-10 (rough: wins against higher-ranked)
      const kills = Math.floor((hist.wins || 0) * 0.3); // approximation without per-match data
      if (kills > bestKills) { bestKills = kills; best = id; }
    });
    if (!best && bbpSnapshot.length > 1) best = bbpSnapshot[1]?.playerId;
    results.executioner = { playerId: best, player: getPlayer(best), extra: `Carrasco dos top 10` };
  }

  // WINRATE: best win% (min 10 matches)
  {
    let best = null, bestWR = 0;
    playerHistoriesSnapshot.forEach((hist, id) => {
      const wr = winRate(hist);
      if (wr !== null && wr > bestWR) { bestWR = wr; best = id; }
    });
    results.winrate = { playerId: best, player: getPlayer(best), extra: best ? `${Math.round(winRate(playerHistoriesSnapshot.get(best)))}% de vitórias` : '—' };
  }

  // ── BLADE AWARDS ──

  // Blade do Ano: best win rate
  {
    let best = null, bestWR = -1, bestBlade = null;
    signaturesSnapshot.forEach((data, id) => {
      const s = data.stats;
      const total = (s.totalWins || 0) + (s.totalLosses || 0);
      if (total < 5) return;
      const wr = (s.totalWins || 0) / total;
      if (wr > bestWR) { bestWR = wr; best = id; bestBlade = data.blade; }
    });
    results.blade_year = {
      playerId: best, player: getPlayer(best), blade: bestBlade,
      extra: bestBlade ? `"${bestBlade.signatureName}"` : '—',
    };
  }

  // Mais Destruidor: most burst%
  {
    let best = null, bestPct = -1, bestBlade = null;
    signaturesSnapshot.forEach((data, id) => {
      const s = data.stats;
      const wins = s.totalWins || 0;
      if (wins < 3) return;
      const pct = (s.winsByBurst || 0) / (wins || 1);
      if (pct > bestPct) { bestPct = pct; best = id; bestBlade = data.blade; }
    });
    results.blade_burst = {
      playerId: best, player: getPlayer(best), blade: bestBlade,
      extra: bestBlade ? `${Math.round(bestPct * 100)}% Burst` : '—',
    };
  }

  // Mais Resistente: fewest burst losses %
  {
    let best = null, bestPct = Infinity, bestBlade = null;
    signaturesSnapshot.forEach((data, id) => {
      const s = data.stats;
      const losses = s.totalLosses || 0;
      if (losses < 3) return;
      const pct = (s.lossesByBurst || 0) / (losses || 1);
      if (pct < bestPct) { bestPct = pct; best = id; bestBlade = data.blade; }
    });
    results.blade_tank = {
      playerId: best, player: getPlayer(best), blade: bestBlade,
      extra: bestBlade ? `${Math.round(bestPct * 100)}% Burst sofrido` : '—',
    };
  }

  // Mais Versátil: wins across most arena types (use arenaStats if available, else approximate)
  {
    let best = null, bestArenas = 0, bestBlade = null;
    signaturesSnapshot.forEach((data, id) => {
      const p = getPlayer(id);
      if (!p) return;
      // Approximate: players with higher total matches likely faced more arenas
      const matches = (data.stats.totalWins || 0) + (data.stats.totalLosses || 0);
      const arenas = Math.min(5, Math.floor(matches / 3)); // rough estimate
      if (arenas > bestArenas) { bestArenas = arenas; best = id; bestBlade = data.blade; }
    });
    results.blade_arena = {
      playerId: best, player: getPlayer(best), blade: bestBlade,
      extra: bestBlade ? `Dominante em múltiplas arenas` : '—',
    };
  }

  // Mais Temido: best win rate vs other signatures
  {
    let best = null, bestWR = -1, bestBlade = null;
    signaturesSnapshot.forEach((data, id) => {
      const s = data.stats;
      const vsWins = s.vsSignaturesWinStreak || 0; // best streak vs sigs (best available data)
      const wins = (s.totalWins || 0);
      const winSigRatio = wins > 0 ? vsWins / wins : 0;
      if (winSigRatio > bestWR) { bestWR = winSigRatio; best = id; bestBlade = data.blade; }
    });
    if (!best) best = results.blade_year?.playerId;
    const bd = signaturesSnapshot.get(best)?.blade;
    results.blade_fear = {
      playerId: best, player: getPlayer(best), blade: bd || signaturesSnapshot.get(best)?.blade,
      extra: bd ? `Adversários temem "${bd.signatureName}"` : '—',
    };
  }

  return results;
}

// ── Retirement risk computation ───────────────────────────────────

function computeRetirementRisk(universeManager, completedYear) {
  const retirementSystem = universeManager.retirementSystem;
  const players = universeManager.TEAMS || universeManager.players || [];

  const retiring    = []; // already retired (pendingRetirementAnnouncements)
  const lastSeason  = []; // RRS 70-89 → possible next season
  const twilight    = []; // RRS 50-69 → next 3 years

  const retired = universeManager.pendingRetirementAnnouncements || [];
  retired.forEach(r => retiring.push(r));

  if (!retirementSystem) return { retiring, lastSeason, twilight };

  players.forEach((player, id) => {
    if (!player || player.status === 'RETIRED') return;
    // Skip already in retiring list
    if (retiring.some(r => r.player?.name === player.name)) return;

    try {
      const rrs = retirementSystem.calculateRRS(player);
      if (rrs >= 70) lastSeason.push({ player, rrs });
      else if (rrs >= 50) twilight.push({ player, rrs });
    } catch(e) { /* skip */ }
  });

  // Sort by RRS descending
  lastSeason.sort((a, b) => b.rrs - a.rrs);
  twilight.sort((a, b) => b.rrs - a.rrs);

  return { retiring, lastSeason: lastSeason.slice(0, 5), twilight: twilight.slice(0, 8) };
}

// ── Main component ────────────────────────────────────────────────

const SeasonAwardsCeremony = ({ universeManager, onClose }) => {
  const ceremony = universeManager.pendingSeasonCeremony;
  const completedYear = ceremony?.completedYear ?? (universeManager.currentYear - 1);

  const [phase, setPhase] = useState('intro');   // 'intro' | 'awards' | 'summary'
  const [awardIdx, setAwardIdx] = useState(0);
  const [revealed, setRevealed] = useState([]);  // award ids revealed so far
  const [autoPlay, setAutoPlay] = useState(true);

  // Compute awards once
  const awards = useMemo(() => {
    if (!ceremony) return null;
    try {
      return computeAwards(
        universeManager,
        ceremony.completedYear,
        ceremony.bbpSnapshot,
        ceremony.playerHistoriesSnapshot,
        ceremony.signaturesSnapshot,
      );
    } catch(e) {
      console.error('Erro ao calcular prêmios:', e);
      return null;
    }
  }, []);

  const retirements = useMemo(() => {
    try { return computeRetirementRisk(universeManager, completedYear); }
    catch(e) { return { retiring: [], lastSeason: [], twilight: [] }; }
  }, []);

  const totalAwards = AWARD_DEFS.length;

  // Auto-advance awards
  useEffect(() => {
    if (phase !== 'awards' || !autoPlay) return;
    const t = setTimeout(() => {
      nextAward();
    }, 3800);
    return () => clearTimeout(t);
  }, [phase, awardIdx, autoPlay]);

  const nextAward = useCallback(() => {
    const def = AWARD_DEFS[awardIdx];
    if (def) setRevealed(r => [...r, def.id]);
    if (awardIdx + 1 >= totalAwards) {
      setPhase('summary');
    } else {
      setAwardIdx(i => i + 1);
    }
  }, [awardIdx, totalAwards]);

  const skipToCeremony = () => {
    // Reveal all
    setRevealed(AWARD_DEFS.map(d => d.id));
    setPhase('summary');
  };

  const handleClose = () => {
    universeManager.pendingSeasonCeremony = null;
    universeManager.pendingRetirementAnnouncements = [];
    onClose && onClose();
  };

  // ── INTRO ────────────────────────────────────────────────────────
  if (phase === 'intro') {
    return (
      <div className="sac-overlay">
        <style>{CEREMONY_STYLES}</style>
        <div className="sac-bg-grid" />
        <div className="sac-bg-orb1" />
        <div className="sac-bg-orb2" />
        <div className="sac-scan-line"><div /></div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 24px', position: 'relative', zIndex: 2 }}>
          {/* Trophy glow */}
          <div style={{ position: 'relative', marginBottom: 24 }}>
            <div style={{ position: 'absolute', inset: '-60px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,215,0,.25), transparent 70%)', animation: 'sac-pulse 3s ease-in-out infinite' }} />
            <div style={{ fontSize: 96, lineHeight: 1, animation: 'sac-pop .6s ease both' }}>🏆</div>
          </div>

          <div style={{ ...B, fontSize: 'clamp(18px,3vw,32px)', letterSpacing: '.1em', color: '#ffd700', textAlign: 'center', marginBottom: 8, animation: 'sac-fade .6s .2s both' }}>
            CERIMÔNIA DE ENCERRAMENTO
          </div>
          <div style={{ ...O, fontSize: 'clamp(28px,5vw,56px)', fontWeight: 900, color: '#fff', textAlign: 'center', marginBottom: 4, animation: 'sac-fade .6s .3s both', letterSpacing: '.05em' }}>
            TEMPORADA {completedYear}
          </div>
          <div style={{ ...O, fontSize: 10, letterSpacing: '.3em', color: 'rgba(255,255,255,.35)', marginBottom: 48, animation: 'sac-fade .6s .4s both' }}>
            PRÊMIOS ANUAIS DO CIRCUITO BEYBLADE
          </div>

          {/* Stats row */}
          <div style={{ display: 'flex', gap: 32, marginBottom: 56, animation: 'sac-fade .6s .5s both' }}>
            {[
              { icon: '🏅', value: totalAwards, label: 'PRÊMIOS' },
              { icon: '👤', value: (universeManager.TEAMS || universeManager.players || []).filter(p => p?.status === 'PROFESSIONAL').length, label: 'ATLETAS' },
              { icon: '🌀', value: (universeManager.signatureBlades?.size || 0), label: 'BLADES' },
            ].map((s, i) => (
              <div key={i} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 28, marginBottom: 4 }}>{s.icon}</div>
                <div style={{ ...O, fontSize: 22, fontWeight: 900, color: '#ffd700' }}>{s.value}</div>
                <div style={{ ...O, fontSize: 9, letterSpacing: '.2em', color: 'rgba(255,255,255,.3)' }}>{s.label}</div>
              </div>
            ))}
          </div>

          <button
            onClick={() => { setPhase('awards'); setAwardIdx(0); }}
            style={{ ...O, background: 'linear-gradient(135deg, #ffd700, #ff8c00)', border: 'none', color: '#000', padding: '16px 48px', borderRadius: 10, fontSize: 13, fontWeight: 900, letterSpacing: '.15em', cursor: 'pointer', animation: 'sac-glow 3s ease-in-out infinite', marginBottom: 16 }}
          >
            INICIAR CERIMÔNIA
          </button>
          <button className="sac-skip-btn" onClick={skipToCeremony}>
            PULAR → VER RESUMO
          </button>
        </div>
      </div>
    );
  }

  // ── AWARDS ───────────────────────────────────────────────────────
  if (phase === 'awards') {
    const def = AWARD_DEFS[awardIdx];
    const awd = awards?.[def?.id];
    const player = awd?.player;
    const blade  = awd?.blade;
    const isBladeAward = def?.id?.startsWith('blade_');

    return (
      <div className="sac-overlay">
        <style>{CEREMONY_STYLES}</style>
        <div className="sac-bg-grid" />
        <div className="sac-bg-orb1" />
        <div className="sac-bg-orb2" />
        <div className="sac-scan-line"><div /></div>

        {/* Top bar */}
        <div className="sac-topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#ffd700', boxShadow: '0 0 8px #ffd700', animation: 'sac-pulse 2s ease-in-out infinite' }} />
            <div style={{ ...O, fontSize: 9, letterSpacing: '.3em', color: 'rgba(255,215,0,.7)' }}>
              AO VIVO — CERIMÔNIA {completedYear}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              onClick={() => setAutoPlay(a => !a)}
              style={{ ...O, background: 'none', border: '1px solid rgba(255,255,255,.15)', color: autoPlay ? '#ffd700' : 'rgba(255,255,255,.4)', padding: '6px 14px', borderRadius: 6, fontSize: 9, letterSpacing: '.1em', cursor: 'pointer' }}
            >
              {autoPlay ? '⏸ PAUSAR' : '▶ AUTO'}
            </button>
            <button className="sac-skip-btn" onClick={skipToCeremony}>
              PULAR CERIMÔNIA →
            </button>
          </div>
        </div>

        {/* Progress dots */}
        <div style={{ padding: '12px 28px', display: 'flex', alignItems: 'center', gap: 16, background: 'rgba(0,0,0,.3)' }}>
          <div style={{ ...O, fontSize: 9, letterSpacing: '.15em', color: 'rgba(255,255,255,.3)', whiteSpace: 'nowrap' }}>
            {awardIdx + 1}/{totalAwards}
          </div>
          <div className="sac-progress-dots">
            {AWARD_DEFS.map((d, i) => (
              <div key={d.id} className={`sac-dot ${i < awardIdx ? 'done' : i === awardIdx ? 'current' : ''}`} />
            ))}
          </div>
        </div>

        {/* Award card */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', position: 'relative', zIndex: 2, overflowY: 'auto' }}>
          <div key={awardIdx} className="sac-award-card" style={{ maxWidth: 640, width: '100%', borderColor: `${def?.color}44` }}>
            <div className="sac-award-rays" style={{ background: `conic-gradient(transparent 0deg, ${def?.color}08 45deg, transparent 90deg, transparent 180deg, ${def?.color}05 225deg, transparent 270deg)` }} />

            {/* Award header */}
            <div style={{ textAlign: 'center', marginBottom: 28, position: 'relative', zIndex: 1 }}>
              <div style={{ fontSize: 64, marginBottom: 8, animation: 'sac-pop .4s ease both' }}>{def?.emoji}</div>
              <div style={{ ...O, fontSize: 9, letterSpacing: '.3em', color: def?.color, marginBottom: 4 }}>
                PRÊMIO {awardIdx + 1} DE {totalAwards}
              </div>
              <div style={{ ...B, fontSize: 'clamp(20px,2.5vw,32px)', color: '#fff', letterSpacing: '.05em' }}>
                {def?.name}
              </div>
              <div style={{ ...R, fontSize: 13, color: 'rgba(255,255,255,.45)', marginTop: 4 }}>
                {def?.desc}
              </div>
            </div>

            {/* Winner */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 20, background: `${def?.color}10`, border: `1px solid ${def?.color}33`, borderRadius: 12, padding: 20, position: 'relative', zIndex: 1 }}>
              {isBladeAward ? (
                // Blade award: show blade name + player
                <div style={{ fontSize: 48, width: 72, height: 72, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${def?.color}20`, borderRadius: '50%', border: `2px solid ${def?.color}55` }}>
                  {def?.emoji}
                </div>
              ) : player ? (
                <div style={{ flexShrink: 0 }}>
                  <PlayerImage player={player} type="icon" size="lg" showBorder borderColor={def?.color} />
                </div>
              ) : (
                <div style={{ fontSize: 40, width: 60, height: 60, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>❓</div>
              )}

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ ...O, fontSize: 9, letterSpacing: '.2em', color: 'rgba(255,255,255,.4)', marginBottom: 2 }}>
                  VENCEDOR
                </div>
                <div style={{ ...B, fontSize: 'clamp(18px,2vw,26px)', color: def?.color, lineHeight: 1.1, marginBottom: 4 }}>
                  {isBladeAward ? (blade?.signatureName || player?.name || '—') : (player?.name || '—')}
                </div>
                {isBladeAward && player && (
                  <div style={{ ...R, fontSize: 13, color: 'rgba(255,255,255,.5)', marginBottom: 4 }}>
                    {player.name} • {player.country || ''}
                  </div>
                )}
                {!isBladeAward && player && (
                  <div style={{ ...R, fontSize: 13, color: 'rgba(255,255,255,.5)', marginBottom: 4 }}>
                    {player.country || ''} • #{universeManager.getCurrentRanking?.(awd.playerId) ?? '—'} Ranking
                  </div>
                )}
                <div style={{ ...O, fontSize: 11, fontWeight: 700, color: def?.color }}>
                  {awd?.extra}
                </div>
              </div>
            </div>

            {/* Nav buttons */}
            <div style={{ display: 'flex', gap: 12, marginTop: 24, position: 'relative', zIndex: 1 }}>
              {awardIdx > 0 && (
                <button
                  onClick={() => setAwardIdx(i => Math.max(0, i - 1))}
                  style={{ ...O, flex: 1, background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.15)', color: 'rgba(255,255,255,.5)', padding: '10px', borderRadius: 8, fontSize: 10, letterSpacing: '.1em', cursor: 'pointer' }}
                >
                  ← ANTERIOR
                </button>
              )}
              <button
                onClick={nextAward}
                style={{ ...O, flex: 2, background: `linear-gradient(135deg, ${def?.color}, ${def?.color}99)`, border: 'none', color: '#000', padding: '12px', borderRadius: 8, fontSize: 11, fontWeight: 900, letterSpacing: '.1em', cursor: 'pointer' }}
              >
                {awardIdx + 1 >= totalAwards ? 'VER RESUMO →' : 'PRÓXIMO PRÊMIO →'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── SUMMARY ──────────────────────────────────────────────────────
  if (phase === 'summary') {
    const typeColors = { NATURAL: '#60a5fa', DECLINE: '#f97316', INJURY: '#ef4444', PREMATURE: '#a855f7', LEGENDARY: '#ffd700' };
    const typeLabels = { NATURAL: 'Natural', DECLINE: 'Declínio', INJURY: 'Lesão', PREMATURE: 'Precoce', LEGENDARY: 'Lendária' };

    return (
      <div className="sac-overlay">
        <style>{CEREMONY_STYLES}</style>
        <div className="sac-bg-grid" />
        <div className="sac-bg-orb1" />
        <div className="sac-bg-orb2" />
        <div className="sac-scan-line"><div /></div>

        {/* Top bar */}
        <div className="sac-topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ ...B, fontSize: 16, color: '#ffd700' }}>TEMPORADA {completedYear}</div>
            <div style={{ ...O, fontSize: 8, letterSpacing: '.2em', color: 'rgba(255,255,255,.3)' }}>RESUMO FINAL</div>
          </div>
          <button className="sac-confirm-btn" onClick={handleClose}>
            CONFIRMAR & INICIAR {universeManager.currentYear} →
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px 64px', position: 'relative', zIndex: 2 }}>
          <div style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>

            {/* LEFT: Awards summary */}
            <div>
              <div style={{ ...O, fontSize: 9, letterSpacing: '.25em', color: 'rgba(255,215,0,.7)', marginBottom: 16 }}>
                🏅 PREMIAÇÃO — TEMPORADA {completedYear}
              </div>

              {/* Player awards */}
              <div style={{ marginBottom: 12 }}>
                <div className="sac-section-title" style={{ color: '#ffd700' }}>🎖 PRÊMIOS DE JOGADOR</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {AWARD_DEFS.filter(d => !d.id.startsWith('blade_')).map(def => {
                    const awd = awards?.[def.id];
                    return (
                      <div key={def.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', background: 'rgba(255,255,255,.03)', borderRadius: 8, border: `1px solid ${def.color}22` }}>
                        <div style={{ fontSize: 20, width: 28, textAlign: 'center', flexShrink: 0 }}>{def.emoji}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ ...O, fontSize: 8, letterSpacing: '.15em', color: def.color }}>{def.name}</div>
                          <div style={{ ...R, fontSize: 14, fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {awd?.player?.name || '—'}
                          </div>
                        </div>
                        <div style={{ ...O, fontSize: 9, color: 'rgba(255,255,255,.35)', textAlign: 'right', flexShrink: 0 }}>
                          {awd?.extra}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Blade awards */}
              <div>
                <div className="sac-section-title" style={{ color: '#60a5fa' }}>⚙ PRÊMIOS DE SIGNATURE BLADE</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {AWARD_DEFS.filter(d => d.id.startsWith('blade_')).map(def => {
                    const awd = awards?.[def.id];
                    return (
                      <div key={def.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', background: 'rgba(255,255,255,.03)', borderRadius: 8, border: `1px solid ${def.color}22` }}>
                        <div style={{ fontSize: 20, width: 28, textAlign: 'center', flexShrink: 0 }}>{def.emoji}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ ...O, fontSize: 8, letterSpacing: '.15em', color: def.color }}>{def.name}</div>
                          <div style={{ ...R, fontSize: 14, fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {awd?.blade?.signatureName || awd?.player?.name || '—'}
                          </div>
                          {awd?.player && (
                            <div style={{ ...R, fontSize: 11, color: 'rgba(255,255,255,.4)' }}>{awd.player.name}</div>
                          )}
                        </div>
                        <div style={{ ...O, fontSize: 9, color: 'rgba(255,255,255,.35)', textAlign: 'right', flexShrink: 0 }}>
                          {awd?.extra}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* RIGHT: Retirements */}
            <div>
              <div style={{ ...O, fontSize: 9, letterSpacing: '.25em', color: 'rgba(255,100,100,.7)', marginBottom: 16 }}>
                🏁 MOVIMENTAÇÃO — FIM DE TEMPORADA
              </div>

              {/* Se aposentando */}
              <div style={{ marginBottom: 20 }}>
                <div className="sac-section-title" style={{ color: '#ef4444' }}>
                  🏁 SE APOSENTANDO
                  <span style={{ marginLeft: 8, fontSize: 8, color: 'rgba(255,255,255,.3)' }}>Anunciaram aposentadoria neste ano</span>
                </div>
                {retirements.retiring.length === 0 ? (
                  <div style={{ ...R, fontSize: 13, color: 'rgba(255,255,255,.3)', fontStyle: 'italic', padding: '8px 0' }}>Nenhuma aposentadoria nesta temporada</div>
                ) : retirements.retiring.map((r, i) => {
                  const color = typeColors[r.type] || '#60a5fa';
                  return (
                    <div key={i} className="sac-retire-card" style={{ borderLeftColor: color, marginBottom: 8, animationDelay: `${i * 0.1}s` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ ...R, fontSize: 16, fontWeight: 700, color: '#fff' }}>{r.player?.name || r.playerName}</div>
                          <div style={{ ...O, fontSize: 9, color: 'rgba(255,255,255,.4)' }}>
                            {r.player?.age || '—'} anos • {r.player?.country || ''} • {r.careerSummary?.totalTitles || 0} títulos
                          </div>
                        </div>
                        <div style={{ ...O, fontSize: 8, padding: '3px 8px', background: `${color}22`, border: `1px solid ${color}55`, borderRadius: 4, color, whiteSpace: 'nowrap' }}>
                          {typeLabels[r.type] || r.type}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Possível última temporada */}
              <div style={{ marginBottom: 20 }}>
                <div className="sac-section-title" style={{ color: '#f97316' }}>
                  ⚠️ POSSÍVEL ÚLTIMA TEMPORADA
                  <span style={{ marginLeft: 8, fontSize: 8, color: 'rgba(255,255,255,.3)' }}>RRS 70+ — alto risco</span>
                </div>
                {retirements.lastSeason.length === 0 ? (
                  <div style={{ ...R, fontSize: 13, color: 'rgba(255,255,255,.3)', fontStyle: 'italic', padding: '8px 0' }}>Nenhum jogador em risco crítico</div>
                ) : retirements.lastSeason.map((r, i) => (
                  <div key={i} className="sac-retire-card" style={{ borderLeftColor: '#f97316', marginBottom: 6, animationDelay: `${i * 0.08}s` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ ...R, fontSize: 15, fontWeight: 700, color: '#fff' }}>{r.player?.name}</div>
                        <div style={{ ...O, fontSize: 9, color: 'rgba(255,255,255,.4)' }}>{r.player?.age} anos • {r.player?.country || ''}</div>
                      </div>
                      <div style={{ ...O, fontSize: 10, fontWeight: 900, color: '#f97316' }}>RRS {r.rrs}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Aproveitando últimos momentos */}
              <div>
                <div className="sac-section-title" style={{ color: '#fbbf24' }}>
                  🌅 APROVEITANDO OS ÚLTIMOS MOMENTOS
                  <span style={{ marginLeft: 8, fontSize: 8, color: 'rgba(255,255,255,.3)' }}>RRS 50–69 — risco médio</span>
                </div>
                {retirements.twilight.length === 0 ? (
                  <div style={{ ...R, fontSize: 13, color: 'rgba(255,255,255,.3)', fontStyle: 'italic', padding: '8px 0' }}>Campo estável</div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                    {retirements.twilight.map((r, i) => (
                      <div key={i} className="sac-retire-card" style={{ borderLeftColor: '#fbbf24', animationDelay: `${i * 0.06}s` }}>
                        <div style={{ ...R, fontSize: 14, fontWeight: 700, color: '#fff' }}>{r.player?.name}</div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <div style={{ ...O, fontSize: 9, color: 'rgba(255,255,255,.4)' }}>{r.player?.age} anos</div>
                          <div style={{ ...O, fontSize: 9, color: '#fbbf24' }}>RRS {r.rrs}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Confirm button (bottom) */}
          <div style={{ textAlign: 'center', marginTop: 32 }}>
            <button className="sac-confirm-btn" onClick={handleClose}>
              🏆 CONFIRMAR ENCERRAMENTO — INICIAR TEMPORADA {universeManager.currentYear}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default SeasonAwardsCeremony;
