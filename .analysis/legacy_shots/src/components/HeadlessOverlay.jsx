/**
 * HeadlessOverlay.jsx — v2
 * Melhorias: drama badges · stats A×B · contadores reais · identity banner
 */

import React, { useEffect, useMemo } from 'react';
import { overallRating } from '../players.js';
import { ovrTier } from '../ScoutProfile.js';
import { PLAY_STYLES } from '../styles.js';

// ─── Paleta de superfícies ───────────────────────────────────────
const SURFACE_THEME = {
  CLAY:   { main: '#C4572A', light: '#E07050', glow: 'rgba(196,87,42,.45)',   bg: 'rgba(196,87,42,.06)',  label: 'Saibro',  icon: '🏺' },
  GRASS:  { main: '#2E7D32', light: '#4CAF50', glow: 'rgba(46,125,50,.45)',   bg: 'rgba(46,125,50,.06)',  label: 'Grama',   icon: '🌿' },
  HARD:   { main: '#1565C0', light: '#2196F3', glow: 'rgba(21,101,192,.45)',  bg: 'rgba(21,101,192,.06)', label: 'Hard',    icon: '🏙️' },
  INDOOR: { main: '#6A1B9A', light: '#9C27B0', glow: 'rgba(106,27,154,.45)', bg: 'rgba(106,27,154,.06)', label: 'Indoor',  icon: '🏟️' },
};

const CAT_THEME = {
  GRAND_SLAM:       { color: '#FFD700', short: 'GS',     tier: 4 },
  MASTERS_1000:     { color: '#E040FB', short: 'M1000',  tier: 3 },
  ATP_500:          { color: '#00BCD4', short: 'A500',   tier: 2 },
  ATP_250:          { color: '#66BB6A', short: 'A250',   tier: 1 },
  ATP_PROSPECTS:    { color: '#FF7043', short: 'PROS',   tier: 1 },
  FINALS:           { color: '#F44336', short: 'FINALS', tier: 4 },
  PROSPECTS_FINALS: { color: '#FF7043', short: 'P.FIN',  tier: 3 },
};

const ROUND_FULL = {
  R128:'1ª Rodada', R64:'2ª Rodada', R32:'3ª Rodada', R16:'Oitavas',
  QF:'Quartas', SF:'Semifinal', F:'Final', QQ:'Qualifying',
};

// ═══════════════════════════════════════════════════════════════════
// ANÁLISE DE DRAMA
// ═══════════════════════════════════════════════════════════════════

function analyzeMatchDrama(event, rivalrySystem = null) {
  const noop = { badges: [], identity: null };
  if (!event?.result || !event?.winner || !event?.loser) return noop;

  const { result, winner, loser, roundLabel } = event;
  const sd     = result.setsDetail ?? [];
  const sets   = result.sets ?? [0, 0];
  const aWon   = sets[0] > sets[1];
  const sw     = aWon ? result.stats?.a : result.stats?.b;   // stats vencedor
  const sl     = aWon ? result.stats?.b : result.stats?.a;   // stats perdedor
  const ovrW   = winner.attrs ? overallRating(winner.attrs) : 0;
  const ovrL   = loser.attrs  ? overallRating(loser.attrs)  : 0;
  const rankW  = winner.rankPosition ?? 999;
  const rankL  = loser.rankPosition  ?? 999;
  const ageW   = winner.age ?? null;
  const ageL   = loser.age  ?? null;

  const badges = [];
  let identity = null;

  // ── 5 SETS ────────────────────────────────────────────────────
  const totalSets  = sets[0] + sets[1];
  const totalGames = sd.reduce((s,[a,b])=>s+a+b, 0);
  const tiebreaks  = sd.filter(([a,b]) => (a===7&&b===6)||(a===6&&b===7)).length;
  if (totalSets >= 5) {
    badges.push({ label: 'ÉPICO 5S', bg: '#633806', fg: '#FAC775' });
    identity = { title: 'ÉPICO — 5 SETS', sub: `${tiebreaks} tiebreak${tiebreaks!==1?'s':''} · ${totalGames} games` };
  } else if (totalSets === 4 && tiebreaks >= 2) {
    badges.push({ label: 'BATALHA', bg: '#3C3489', fg: '#CECBF6' });
    identity = { title: 'BATALHA DE 4 SETS', sub: `${tiebreaks} tiebreaks disputados` };
  } else if (tiebreaks >= 1 && totalSets <= 3) {
    badges.push({ label: `${tiebreaks}TB`, bg: '#0C447C', fg: '#B5D4F4' });
  }

  // ── BAGEL (6-0) ───────────────────────────────────────────────
  const bagels = sd.filter(([a,b]) => (a===6&&b===0)||(a===0&&b===6)).length;
  if (bagels >= 2) {
    badges.push({ label: `${bagels}× BAGEL`, bg: '#791F1F', fg: '#F7C1C1' });
    if (!identity) identity = { title: 'DOMÍNIO TOTAL', sub: `${bagels} bagels · ${sw?.aces??0} aces` };
  } else if (bagels === 1) {
    badges.push({ label: 'BAGEL', bg: '#A32D2D', fg: '#FCEBEB' });
  }

  // ── ZEBRA ─────────────────────────────────────────────────────
  const ovrDiff = ovrL - ovrW;
  const isZebra = ovrDiff >= 5 || (rankL < rankW - 10 && rankL <= 50);
  if (isZebra) {
    const zLabel = rankL < rankW ? `ZEBRA #${rankL}` : `ZEBRA +${ovrTier(ovrW).grade}`;
    badges.push({ label: zLabel, bg: '#26215C', fg: '#AFA9EC' });
    if (!identity) identity = {
      title: 'ZEBRA',
      sub: ovrDiff >= 5 ? `${ovrTier(ovrW).grade} derruba ${ovrTier(ovrL).grade}` : `#${rankW} elimina #${rankL}`,
    };
  }

  // ── VIRADA (perdeu 1º set 6-0/6-1 e buscou) ──────────────────
  const fsW = aWon ? sd[0]?.[0] : sd[0]?.[1];
  const fsL = aWon ? sd[0]?.[1] : sd[0]?.[0];
  if (fsW !== undefined && fsL !== undefined && fsW <= 1 && fsL === 6 && totalSets >= 3) {
    badges.push({ label: 'VIRADA', bg: '#085041', fg: '#9FE1CB' });
    if (!identity) identity = { title: 'VIRADA ÉPICA', sub: `Perdeu 1º set 6-${fsW} e buscou` };
  }

  // ── VETERANO (≥ 33 anos em campo) ────────────────────────────
  const maxAge = Math.max(ageW ?? 0, ageL ?? 0);
  if (maxAge >= 33) {
    const veteran = (ageW ?? 0) >= (ageL ?? 0) ? winner : loser;
    const isVetWinner = veteran.id === winner.id;
    badges.push({ label: `VETERANO ${maxAge}a`, bg: '#27500A', fg: '#C0DD97' });
    if (!identity && isVetWinner && maxAge >= 36) {
      identity = { title: 'VETERANO', sub: `${veteran.name?.split(' ').pop()} — ${maxAge} anos ainda em campo` };
    }
  }

  // ── PRODÍGIO (≤ 20 anos em campo) ────────────────────────────
  const minAge = Math.min(
    ageW != null ? ageW : 99,
    ageL != null ? ageL : 99,
  );
  if (minAge <= 20 && minAge > 0) {
    const prodigy = (ageW ?? 99) <= (ageL ?? 99) ? winner : loser;
    badges.push({ label: `PRODÍGIO ${minAge}a`, bg: '#042C53', fg: '#85B7EB' });
    if (!identity && prodigy.id === winner.id) {
      identity = { title: 'PRODÍGIO', sub: `${prodigy.name?.split(' ').pop()} com ${minAge} anos avança` };
    }
  }

  // ── RIVALIDADE ────────────────────────────────────────────────
  if (rivalrySystem) {
    const rivalry = rivalrySystem.getRivalry?.(winner.id, loser.id) ?? null;
    if (rivalry && rivalry.intensity >= 0.55) {
      const isLegendary = rivalry.status === 'LEGENDARY';
      badges.push({
        label: isLegendary ? 'RIVALIDADE LENDÁRIA' : 'RIVALIDADE',
        bg: isLegendary ? '#26215C' : '#3C3489',
        fg: isLegendary ? '#CECBF6' : '#AFA9EC',
      });
      if (!identity) {
        const total = rivalry.totalMatches ?? 0;
        identity = {
          title: isLegendary ? 'CLÁSSICO LENDÁRIO' : 'RIVALIDADE INTENSA',
          sub: `${total} confronto${total!==1?'s':''} na história`,
        };
      }
    }
  }

  // ── DERBY (mesma nacionalidade) ───────────────────────────────
  if (winner.nationality && loser.nationality && winner.nationality === loser.nationality) {
    badges.push({ label: `DERBY ${winner.nationality}`, bg: '#712B13', fg: '#F5C4B3' });
    if (!identity) identity = {
      title: 'CLÁSSICO NACIONAL',
      sub: `${winner.nationality} — confronto entre compatriotas`,
    };
  }

  // ── ELITE (ambos OVR ≥ 88) ────────────────────────────────────
  if (ovrW >= 88 && ovrL >= 88) {
    badges.push({ label: 'ELITE', bg: '#085041', fg: '#5DCAA5' });
    if (!identity) identity = {
      title: 'DUELO DE ELITE',
      sub: `${ovrTier(ovrW).grade} vs ${ovrTier(ovrL).grade} — topo da pirâmide`,
    };
  }

  // ── SAQUE-CANHÃO (≥ 15 aces na partida) ──────────────────────
  const totalAces = (result.stats?.a?.aces ?? 0) + (result.stats?.b?.aces ?? 0);
  if (totalAces >= 15) {
    badges.push({ label: `${totalAces} ACES`, bg: '#633806', fg: '#FAC775' });
    if (!identity) identity = {
      title: 'SAQUE-CANHÃO',
      sub: `${totalAces} aces — o saque foi arma decisiva`,
    };
  }

  // ── MARATONA (≥ 200 pontos) ───────────────────────────────────
  const totalPoints = result.points ?? 0;
  if (totalPoints >= 200) {
    badges.push({ label: 'MARATONA', bg: '#2C2C2A', fg: '#D3D1C7' });
    if (!identity) identity = {
      title: 'MARATONA',
      sub: `${totalPoints} pontos disputados — resistência máxima`,
    };
  }

  // ── Final / Semifinal sem drama adicional ─────────────────────
  if (!identity && roundLabel === 'F') {
    const scoreStr = sd.map(([a,b])=>`${aWon?a:b}-${aWon?b:a}`).join(' ');
    identity = { title: 'CAMPEÃO', sub: scoreStr };
  } else if (!identity && roundLabel === 'SF') {
    identity = { title: 'SEMIFINAL', sub: `${winner.name?.split(' ').pop()} vai à final` };
  }

  return { badges, identity };
}

function fmtScore(setsDetail, winnerIsA) {
  if (!setsDetail?.length) return '';
  return setsDetail.map(([a, b]) => {
    const w = winnerIsA ? a : b;
    const l = winnerIsA ? b : a;
    return `${w}-${l}`;
  }).join('  ');
}

// ═══════════════════════════════════════════════════════════════════
// CSS
// ═══════════════════════════════════════════════════════════════════

let cssInjected = false;
function injectCSS() {
  if (cssInjected) return;
  cssInjected = true;
  const css = `
    @keyframes ho-fade-in   { from{opacity:0} to{opacity:1} }
    @keyframes ho-slide-up  { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
    @keyframes ho-score-in  { from{opacity:0;transform:scale(.72) translateY(6px)} to{opacity:1;transform:scale(1) translateY(0)} }
    @keyframes ho-scan      { 0%{transform:translateY(-100%)} 100%{transform:translateY(100vh)} }
    @keyframes ho-pulse     { 0%,100%{opacity:.5;transform:scale(1)} 50%{opacity:1;transform:scale(1.15)} }
    @keyframes ho-blink     { 0%,100%{opacity:1} 45%,55%{opacity:.15} }
    @keyframes ho-result-in { from{opacity:0;transform:scale(.93)} to{opacity:1;transform:scale(1)} }
    @keyframes ho-feed-new  { from{background:rgba(255,255,255,.08)} to{background:transparent} }
    @keyframes ho-identity  { from{opacity:0;transform:translateX(-8px)} to{opacity:1;transform:translateX(0)} }
    @keyframes ho-badge-pop { from{opacity:0;transform:scale(.7)} to{opacity:1;transform:scale(1)} }
    @keyframes ho-counter   { from{opacity:0;transform:translateY(-8px)} to{opacity:1;transform:translateY(0)} }
    @keyframes ho-spin-anim { to{transform:rotate(360deg)} }

    .ho-overlay {
      position:fixed; inset:0; z-index:9999;
      display:flex; flex-direction:column;
      background:rgba(3,8,6,.94); backdrop-filter:blur(4px);
      font-family:'Source Sans 3',sans-serif;
      animation:ho-fade-in .3s ease both; overflow:hidden;
    }
    .ho-scanline { position:absolute; inset:0; pointer-events:none; overflow:hidden; opacity:.035; }
    .ho-scanline::after {
      content:''; position:absolute; left:0; right:0; height:2px;
      background:linear-gradient(90deg,transparent,var(--ho-main,#FFD700),transparent);
      animation:ho-scan 7s linear infinite;
    }
    .ho-grid {
      position:absolute; inset:0; pointer-events:none;
      background-image:linear-gradient(rgba(255,255,255,.01) 1px,transparent 1px),
                       linear-gradient(90deg,rgba(255,255,255,.01) 1px,transparent 1px);
      background-size:60px 60px;
      mask-image:radial-gradient(ellipse 80% 80% at 50% 50%,black 10%,transparent 100%);
    }
    .ho-content { position:relative; z-index:2; display:flex; flex-direction:column; height:100vh; }

    .ho-header {
      padding:14px 28px 11px; border-bottom:1px solid rgba(255,255,255,.07);
      background:rgba(0,0,0,.3); display:flex; align-items:center; gap:18px; flex-shrink:0;
    }
    .ho-live-dot {
      width:9px; height:9px; border-radius:50%;
      background:#FF4444; box-shadow:0 0 12px #FF4444;
      animation:ho-blink 1.1s ease-in-out infinite; flex-shrink:0;
    }
    .ho-live-label { font-family:'Oswald',sans-serif; font-size:11px; font-weight:700; letter-spacing:.35em; color:#FF4444; text-transform:uppercase; }
    .ho-tourn-name { font-family:'Oswald',sans-serif; font-weight:700; font-size:clamp(15px,2vw,24px); letter-spacing:.05em; color:#FFF; text-transform:uppercase; line-height:1; }
    .ho-tourn-meta { font-family:'DM Mono',monospace; font-size:9px; letter-spacing:.22em; color:rgba(255,255,255,.35); text-transform:uppercase; margin-top:4px; }

    .ho-round-bar { display:flex; align-items:center; gap:0; padding:9px 28px; background:rgba(0,0,0,.2); border-bottom:1px solid rgba(255,255,255,.05); flex-shrink:0; }
    .ho-round-step { display:flex; align-items:center; font-family:'Oswald',sans-serif; font-size:10px; font-weight:600; letter-spacing:.18em; text-transform:uppercase; color:rgba(255,255,255,.2); transition:color .3s; }
    .ho-round-step.active { color:var(--ho-main,#FFD700); }
    .ho-round-step.done   { color:rgba(255,255,255,.42); }
    .ho-round-connector   { flex:1; height:1px; background:rgba(255,255,255,.1); margin:0 8px; max-width:40px; }
    .ho-round-connector.done { background:rgba(255,255,255,.28); }

    .ho-body { flex:1; display:grid; grid-template-columns:1fr 300px; overflow:hidden; min-height:0; }

    .ho-match-panel { display:flex; flex-direction:column; padding:18px 22px 16px 28px; border-right:1px solid rgba(255,255,255,.06); overflow:hidden; min-height:0; }

    .ho-identity-banner { display:flex; align-items:center; gap:12px; margin-bottom:14px; flex-shrink:0; animation:ho-identity .3s ease both; }
    .ho-identity-accent { width:3px; flex-shrink:0; border-radius:2px; background:var(--ho-main,#FFD700); align-self:stretch; min-height:28px; }
    .ho-identity-title { font-family:'Oswald',sans-serif; font-size:11px; font-weight:700; letter-spacing:.4em; color:var(--ho-main,#FFD700); text-transform:uppercase; line-height:1; margin-bottom:3px; }
    .ho-identity-sub { font-family:'DM Mono',monospace; font-size:9px; color:rgba(255,255,255,.32); letter-spacing:.1em; }
    .ho-identity-badges { display:flex; gap:5px; flex-wrap:wrap; margin-left:auto; }
    .ho-badge { font-family:'DM Mono',monospace; font-size:9px; font-weight:700; letter-spacing:.12em; padding:3px 7px; border-radius:3px; text-transform:uppercase; flex-shrink:0; animation:ho-badge-pop .25s cubic-bezier(.16,1,.3,1) both; }

    .ho-scoreboard { flex:1; display:flex; flex-direction:column; justify-content:center; gap:0; animation:ho-result-in .3s ease both; min-height:0; }
    .ho-player-row { display:flex; align-items:center; gap:12px; padding:12px 0; position:relative; }
    .ho-player-row + .ho-player-row { border-top:1px solid rgba(255,255,255,.05); }
    .ho-player-avatar { width:42px; height:42px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-family:'Oswald',sans-serif; font-size:14px; font-weight:700; color:#000; flex-shrink:0; border:2px solid rgba(255,255,255,.18); }
    .ho-player-avatar.winner { border-color:var(--ho-main,#FFD700); box-shadow:0 0 18px var(--ho-glow,rgba(255,215,0,.35)); }
    .ho-player-info { flex:1; min-width:0; }
    .ho-player-name { font-family:'Oswald',sans-serif; font-weight:700; font-size:clamp(17px,2.3vw,30px); letter-spacing:.02em; text-transform:uppercase; color:#FFF; line-height:1; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .ho-player-name.winner { color:var(--ho-light,#FFD700); }
    .ho-player-name.loser  { color:rgba(255,255,255,.38); }
    .ho-player-sub { font-family:'DM Mono',monospace; font-size:9px; color:rgba(255,255,255,.28); letter-spacing:.08em; margin-top:3px; }
    .ho-sets-row { display:flex; gap:4px; align-items:center; flex-shrink:0; }
    .ho-set-box { width:42px; height:42px; display:flex; align-items:center; justify-content:center; font-family:'Oswald',sans-serif; font-size:20px; font-weight:700; border:1px solid rgba(255,255,255,.1); background:rgba(255,255,255,.03); animation:ho-score-in .3s ease both; }
    .ho-set-box.won  { background:var(--ho-bg,rgba(255,215,0,.08)); border-color:var(--ho-main,#FFD700); color:var(--ho-light,#FFD700); }
    .ho-set-box.lost { color:rgba(255,255,255,.22); }
    .ho-trophy-badge { position:absolute; right:0; top:50%; transform:translateY(-50%); font-size:18px; opacity:0; }
    .ho-trophy-badge.show { opacity:1; animation:ho-badge-pop .4s ease .15s both; }

    @keyframes ho-rank-shine {
      0%   { background-position:200% center; }
      100% { background-position:-200% center; }
    }
    @keyframes ho-rank-pulse {
      0%,100% { opacity:1; }
      50%      { opacity:.65; }
    }

    .ho-stats-ab { margin-top:14px; flex-shrink:0; animation:ho-slide-up .4s ease .12s both; }
    .ho-stats-row { display:grid; grid-template-columns:repeat(4,1fr); gap:4px; }
    .ho-stat-chip { background:rgba(255,255,255,.03); border:1px solid rgba(255,255,255,.07); padding:7px 5px; text-align:center; }
    .ho-stat-chip.w { background:rgba(46,125,50,.12); border-color:rgba(46,125,50,.35); }
    .ho-stat-main { font-family:'Oswald',sans-serif; font-size:17px; font-weight:700; line-height:1; }
    .ho-stat-main.win  { color:#4CAF50; }
    .ho-stat-main.neu  { color:#FFF; }
    .ho-stat-main.lose { color:rgba(255,255,255,.35); }
    .ho-stat-vs  { font-family:'DM Mono',monospace; font-size:10px; color:rgba(255,255,255,.28); letter-spacing:.06em; margin:2px 0 0; }
    .ho-stat-lbl { font-family:'DM Mono',monospace; font-size:8px; color:rgba(255,255,255,.25); letter-spacing:.14em; text-transform:uppercase; margin-top:2px; }

    .ho-computing { margin-top:12px; padding:10px 14px; background:rgba(255,255,255,.025); border:1px solid rgba(255,255,255,.07); border-left:3px solid var(--ho-main,#FFD700); display:flex; align-items:center; gap:12px; flex-shrink:0; animation:ho-slide-up .4s ease .22s both; }
    .ho-spin { width:16px; height:16px; border-radius:50%; border:2px solid rgba(255,255,255,.1); border-top-color:var(--ho-main,#FFD700); animation:ho-spin-anim .8s linear infinite; flex-shrink:0; }

    .ho-feed-panel { display:flex; flex-direction:column; background:rgba(0,0,0,.2); overflow:hidden; min-height:0; }
    .ho-feed-header { padding:14px 14px 9px; font-family:'DM Mono',monospace; font-size:9px; letter-spacing:.32em; color:rgba(255,255,255,.22); text-transform:uppercase; border-bottom:1px solid rgba(255,255,255,.05); flex-shrink:0; }
    .ho-feed-list { flex:1; overflow-y:auto; overflow-x:hidden; display:flex; flex-direction:column; }
    .ho-feed-list::-webkit-scrollbar { width:2px; }
    .ho-feed-list::-webkit-scrollbar-thumb { background:rgba(255,255,255,.07); }
    .ho-feed-item { padding:9px 12px; border-bottom:1px solid rgba(255,255,255,.04); animation:ho-slide-up .22s ease both; }
    .ho-feed-item:first-child { animation:ho-feed-new .7s ease both; }
    .ho-feed-phase { font-family:'DM Mono',monospace; font-size:8px; letter-spacing:.18em; color:var(--ho-main,#FFD700); text-transform:uppercase; margin-bottom:3px; display:flex; align-items:center; gap:5px; }
    .ho-feed-winner { font-family:'Oswald',sans-serif; font-size:13px; font-weight:700; color:#FFF; letter-spacing:.04em; text-transform:uppercase; line-height:1.2; }
    .ho-feed-loser  { font-family:'Oswald',sans-serif; font-size:11px; color:rgba(255,255,255,.3); letter-spacing:.04em; text-transform:uppercase; }
    .ho-feed-score  { font-family:'DM Mono',monospace; font-size:11px; color:var(--ho-light,rgba(255,255,255,.6)); letter-spacing:.04em; margin-top:2px; }
    .ho-feed-badge  { font-family:'DM Mono',monospace; font-size:8px; font-weight:700; letter-spacing:.1em; padding:1px 5px; border-radius:2px; text-transform:uppercase; flex-shrink:0; }

    .ho-counters { padding:10px 12px; border-top:1px solid rgba(255,255,255,.05); display:grid; grid-template-columns:repeat(4,1fr); gap:6px; flex-shrink:0; }
    .ho-counter-item { text-align:center; }
    .ho-counter-val { font-family:'Oswald',sans-serif; font-size:15px; font-weight:700; line-height:1; animation:ho-counter .25s ease both; }
    .ho-counter-lbl { font-family:'DM Mono',monospace; font-size:7px; color:rgba(255,255,255,.22); letter-spacing:.14em; text-transform:uppercase; margin-top:2px; }

    .ho-progress-bar  { flex-shrink:0; height:3px; background:rgba(255,255,255,.07); }
    .ho-progress-fill { height:100%; background:var(--ho-main,#FFD700); box-shadow:0 0 10px var(--ho-glow); transition:width .4s ease; }

    .ho-footer { padding:9px 28px; background:rgba(0,0,0,.3); border-top:1px solid rgba(255,255,255,.05); display:flex; align-items:center; justify-content:space-between; flex-shrink:0; }
    .ho-footer-count  { font-family:'DM Mono',monospace; font-size:10px; color:rgba(255,255,255,.32); letter-spacing:.12em; }
    .ho-footer-engine { font-family:'DM Mono',monospace; font-size:9px; color:rgba(255,255,255,.16); letter-spacing:.18em; text-transform:uppercase; }

    .ho-stop-btn { position:absolute; top:11px; right:20px; z-index:10; display:flex; align-items:center; gap:7px; padding:6px 14px; background:rgba(0,0,0,.55); border:1px solid rgba(255,70,70,.3); color:rgba(255,110,110,.82); font-family:'DM Mono',monospace; font-size:10px; font-weight:700; letter-spacing:.25em; text-transform:uppercase; cursor:pointer; backdrop-filter:blur(6px); transition:background .12s,border-color .12s,color .12s; }
    .ho-stop-btn:hover { background:rgba(255,50,50,.15); border-color:rgba(255,80,80,.55); color:#ff7777; }
    .ho-stop-icon { width:8px; height:8px; background:currentColor; flex-shrink:0; }

    .ho-glow-tl { position:absolute; top:-100px; left:-100px; width:380px; height:380px; border-radius:50%; background:radial-gradient(circle,var(--ho-glow),transparent 70%); pointer-events:none; filter:blur(40px); }
    .ho-glow-br { position:absolute; bottom:-100px; right:-50px; width:320px; height:320px; border-radius:50%; background:radial-gradient(circle,var(--ho-glow),transparent 70%); pointer-events:none; filter:blur(50px); }

    .ho-waiting { flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:12px; }
    .ho-waiting-icon { font-size:52px; opacity:.22; animation:ho-pulse 2s ease-in-out infinite; }
    .ho-waiting-text { font-family:'Oswald',sans-serif; font-size:18px; font-weight:600; letter-spacing:.3em; color:rgba(255,255,255,.14); text-transform:uppercase; }
    .ho-waiting-sub  { font-family:'DM Mono',monospace; font-size:9px; color:rgba(255,255,255,.1); letter-spacing:.28em; }
  `;
  const el = document.createElement('style');
  el.id = 'ho-styles'; el.textContent = css;
  document.head.appendChild(el);
}

// ═══════════════════════════════════════════════════════════════════
// SUB-COMPONENTES
// ═══════════════════════════════════════════════════════════════════

function RoundStepper({ roundLabel, surface, drawSize }) {
  const theme = SURFACE_THEME[surface] ?? SURFACE_THEME.HARD;
  let rounds;
  if (drawSize >= 64)      rounds = ['QQ','R32','R16','QF','SF','F'];
  else if (drawSize >= 32) rounds = ['QQ','R16','QF','SF','F'];
  else if (drawSize >= 16) rounds = ['QQ','QF','SF','F'];
  else                     rounds = ['SF','F'];
  const cur = rounds.indexOf(roundLabel ?? 'QQ');
  return (
    <div className="ho-round-bar">
      {rounds.map((r, i) => (
        <React.Fragment key={r}>
          <div className={`ho-round-step${i===cur?' active':''}${i<cur?' done':''}`}
               style={{ '--ho-main': theme.main }}>
            {ROUND_FULL[r] ?? r}
          </div>
          {i < rounds.length-1 && <div className={`ho-round-connector${i<cur?' done':''}`} />}
        </React.Fragment>
      ))}
    </div>
  );
}

// Converte código de 3 letras (interno) para ISO 3166-1 alpha-2 (para flagcdn.com)
function natToISO2(nat) {
  const MAP = {
    ESP:'es', ITA:'it', FRA:'fr', GER:'de', SRB:'rs', AUS:'au', USA:'us',
    BRA:'br', ARG:'ar', RUS:'ru', JPN:'jp', CAN:'ca', KOR:'kr', CHN:'cn',
    SWE:'se', NOR:'no', CHE:'ch', POR:'pt', POL:'pl', GRE:'gr', DEN:'dk',
    AUT:'at', UKR:'ua', RSA:'za', CZE:'cz', BEL:'be', HUN:'hu', CHI:'cl',
    COL:'co', MEX:'mx', EGY:'eg', MAR:'ma', IND:'in', NZL:'nz', FIN:'fi',
    CRO:'hr', NGR:'ng', GHA:'gh',
  };
  return MAP[nat] ?? null;
}

function FlagImg({ nat, size = 28 }) {
  const iso2 = natToISO2(nat);
  if (!iso2) return null;
  return (
    <img
      src={`https://flagcdn.com/w40/${iso2}.png`}
      alt={nat}
      style={{
        width: size, height: 'auto',
        borderRadius: 2,
        flexShrink: 0,
        display: 'block',
        objectFit: 'cover',
        boxShadow: '0 1px 4px rgba(0,0,0,.5)',
      }}
    />
  );
}

// Retorna estilo visual da faixa de ranking
function getRankTier(pos) {
  if (!pos || pos < 1) return null;
  if (pos <= 3)   return {
    label: `#${pos}`, icon: '♦',
    bg: 'linear-gradient(90deg,#B8860B,#FFD700,#FFF8DC,#FFD700,#B8860B)',
    color: '#000', border: '1px solid #FFD700',
    glow: '0 0 14px rgba(255,215,0,.7), 0 0 28px rgba(255,215,0,.3)',
    fontSize: 'clamp(13px,1.6vw,18px)', letterSpacing: '.12em',
    animation: 'ho-rank-shine 2.4s linear infinite',
  };
  if (pos <= 10)  return {
    label: `#${pos}`, icon: '●',
    bg: 'linear-gradient(90deg,#1a3a5c,#1e5fa8,#3b82d4,#1e5fa8,#1a3a5c)',
    color: '#a8d4ff', border: '1px solid #3b82d4',
    glow: '0 0 10px rgba(59,130,212,.55)',
    fontSize: 'clamp(13px,1.6vw,18px)', letterSpacing: '.1em',
    animation: 'ho-rank-pulse 3s ease-in-out infinite',
  };
  if (pos <= 30)  return {
    label: `#${pos}`, icon: '●',
    bg: 'linear-gradient(90deg,#1a3d2b,#1f6b3a,#2ea05a,#1f6b3a,#1a3d2b)',
    color: '#7ee8a2', border: '1px solid #2ea05a',
    glow: '0 0 8px rgba(46,160,90,.45)',
    fontSize: 'clamp(12px,1.5vw,17px)', letterSpacing: '.08em',
    animation: 'ho-rank-pulse 4s ease-in-out infinite',
  };
  if (pos <= 50)  return {
    label: `#${pos}`, icon: '●',
    bg: 'rgba(120,50,180,.18)',
    color: '#c084fc', border: '1px solid rgba(192,132,252,.4)',
    glow: '0 0 6px rgba(168,85,247,.3)',
    fontSize: 'clamp(12px,1.5vw,16px)', letterSpacing: '.07em',
    animation: null,
  };
  if (pos <= 100) return {
    label: `#${pos}`, icon: '●',
    color: '#f97316', border: '1px solid rgba(249,115,22,.35)',
    bg: 'rgba(180,70,20,.14)',
    glow: '0 0 5px rgba(249,115,22,.25)',
    fontSize: 'clamp(11px,1.4vw,15px)', letterSpacing: '.06em',
    animation: null,
  };
  return {
    label: `#${pos}`, icon: null,
    bg: 'rgba(255,255,255,.05)',
    color: 'rgba(255,255,255,.35)', border: '1px solid rgba(255,255,255,.1)',
    glow: 'none',
    fontSize: 'clamp(11px,1.4vw,14px)', letterSpacing: '.05em',
    animation: null,
  };
}

function RankBadge({ pos }) {
  if (!pos) return null;
  const t = getRankTier(pos);
  if (!t) return null;
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      background: t.bg,
      border: t.border,
      borderRadius: 3,
      boxShadow: t.glow,
      padding: '3px 10px 3px 8px',
      flexShrink: 0,
      animation: t.animation ?? undefined,
      backgroundSize: '200% 100%',
    }}>
      {t.icon && (
        <span style={{ fontSize: 7, color: t.color, opacity: .7, lineHeight: 1 }}>{t.icon}</span>
      )}
      <span style={{
        fontFamily: "'Oswald',sans-serif", fontWeight: 700,
        fontSize: t.fontSize,
        color: t.color,
        letterSpacing: t.letterSpacing,
        lineHeight: 1,
        textShadow: pos <= 3 ? '0 1px 3px rgba(0,0,0,.6)' : 'none',
      }}>{t.label}</span>
    </div>
  );
}

function PlayerRow({ player, setsDetail, isWinner, playerIndex }) {
  if (!player) return null;
  const init = player.name?.slice(0,2)?.toUpperCase() ?? '??';
  const my  = setsDetail?.map(([a,b]) => playerIndex===0 ? a : b) ?? [];
  const opp = setsDetail?.map(([a,b]) => playerIndex===0 ? b : a) ?? [];
  return (
    <div className="ho-player-row">
      <div className={`ho-player-avatar${isWinner?' winner':''}`}
           style={{ background: player.color ?? '#2A3A2A' }}>{init}</div>
      <FlagImg nat={player.nationality} size={28} />
      <div className="ho-player-info" style={{ display:'flex', alignItems:'center', gap:10, minWidth:0 }}>
        <div className={`ho-player-name${isWinner?' winner':' loser'}`}>{player.name}</div>
        <RankBadge pos={player.rankPosition} />
      </div>
      <div className="ho-sets-row">
        {my.map((s,i) => (
          <div key={i} className={`ho-set-box${s>(opp[i]??0)?' won':' lost'}`}
               style={{ animationDelay:`${i*.06}s` }}>{s}</div>
        ))}
      </div>
      {isWinner && <div className="ho-trophy-badge show">🏆</div>}
    </div>
  );
}

function StatsAB({ result }) {
  if (!result?.stats) return null;
  const { a, b } = result.stats;
  const aWon = (result.sets?.[0]??0) > (result.sets?.[1]??0);
  const sw = aWon ? a : b;
  const sl = aWon ? b : a;
  const p1W = sw.serve1Total > 0 ? Math.round(sw.serve1In/sw.serve1Total*100) : 0;
  const p1L = sl.serve1Total > 0 ? Math.round(sl.serve1In/sl.serve1Total*100) : 0;
  const chips = [
    { lbl:'ACES',  vw:sw.aces??0,           vl:sl.aces??0,            better:(w,l)=>w>l  },
    { lbl:'1ºSRV', vw:`${p1W}%`,             vl:`${p1L}%`,             better:(w,l)=>parseInt(w)>=parseInt(l) },
    { lbl:'WINN',  vw:sw.winners??0,          vl:sl.winners??0,         better:(w,l)=>w>l  },
    { lbl:'UE',    vw:sw.unforcedErrors??0,   vl:sl.unforcedErrors??0,  better:(w,l)=>w<l  },
  ];
  return (
    <div className="ho-stats-ab">
      <div className="ho-stats-row">
        {chips.map(({ lbl, vw, vl, better }) => {
          const win = better(vw, vl);
          return (
            <div key={lbl} className={`ho-stat-chip${win?' w':''}`}>
              <div className={`ho-stat-main${win?' win':' neu'}`}>{vw}</div>
              <div className="ho-stat-vs">vs {vl}</div>
              <div className="ho-stat-lbl">{lbl}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function IdentityBanner({ event, theme, rivalrySystem }) {
  const { identity } = analyzeMatchDrama(event, rivalrySystem);
  if (!identity) return null;
  return (
    <div className="ho-identity-banner">
      <div className="ho-identity-accent" />
      <div>
        <div className="ho-identity-title" style={{ '--ho-main': theme.main }}>{identity.title}</div>
        <div className="ho-identity-sub">{identity.sub}</div>
      </div>
    </div>
  );
}

function FeedItem({ event, index, surfaceTheme, rivalrySystem }) {
  if (!event?.winner || !event?.loser) return null;
  const aWon = event.winner.id === event.playerA?.id;
  const scoreStr = fmtScore(event.result?.setsDetail, aWon);
  const phase = event.roundLabel ? (ROUND_FULL[event.roundLabel] ?? event.roundLabel) : 'Qualifying';
  const { badges } = analyzeMatchDrama(event, rivalrySystem);
  const ovrL = event.loser.attrs ? overallRating(event.loser.attrs) : null;
  return (
    <div className="ho-feed-item" style={{ animationDelay:`${index*.03}s` }}>
      <div className="ho-feed-phase" style={{ '--ho-main': surfaceTheme.main }}>
        <span>{phase}</span>
        {badges.slice(0,2).map((b,i) => (
          <span key={i} className="ho-feed-badge" style={{ background:b.bg, color:b.fg }}>{b.label}</span>
        ))}
      </div>
      <div className="ho-feed-winner">{event.winner.name}</div>
      <div className="ho-feed-loser">
        def. {event.loser.name}
        {ovrL ? <span style={{ color:'rgba(255,255,255,.2)', fontSize:10 }}> · {ovrL}</span> : null}
      </div>
      {scoreStr && <div className="ho-feed-score" style={{ '--ho-light': surfaceTheme.light }}>{scoreStr}</div>}
    </div>
  );
}

function TournamentCounters({ feed, theme, rivalrySystem }) {
  const c = useMemo(() => {
    let zebras=0, epicos=0, aces=0, bagels=0;
    for (const ev of feed) {
      const { badges } = analyzeMatchDrama(ev, rivalrySystem);
      if (badges.some(b=>b.label.startsWith('ZEBRA'))) zebras++;
      if (badges.some(b=>b.label.startsWith('ÉPICO')||b.label==='BATALHA')) epicos++;
      if (badges.some(b=>b.label.includes('BAGEL'))) bagels++;
      aces += (ev.result?.stats?.a?.aces??0) + (ev.result?.stats?.b?.aces??0);
    }
    return { zebras, epicos, aces, bagels };
  }, [feed.length]);
  return (
    <div className="ho-counters">
      {[
        { lbl:'ZEBRAS', val:c.zebras, color:'#AFA9EC' },
        { lbl:'ÉPICOS', val:c.epicos, color:'#FAC775' },
        { lbl:'ACES',   val:c.aces,   color:theme.light },
        { lbl:'BAGELS', val:c.bagels, color:'#F7C1C1' },
      ].map(({ lbl, val, color }) => (
        <div key={lbl} className="ho-counter-item">
          <div className="ho-counter-val" style={{ color }} key={val}>{val}</div>
          <div className="ho-counter-lbl">{lbl}</div>
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════════

export default function HeadlessOverlay({
  tournament,
  simEvent,
  simFeed = [],
  simProgress = 0,
  simTotal = 1,
  stopOnBreaking = false,
  onToggleStopOnBreaking = null,
  breakingArticle = null,
  onStop,
  rivalrySystem = null,
}) {
  useEffect(() => { injectCSS(); }, []);

  const surface  = tournament?.surface ?? 'HARD';
  const category = tournament?.category ?? 'ATP_250';
  const theme    = SURFACE_THEME[surface] ?? SURFACE_THEME.HARD;
  const catTheme = CAT_THEME[category]   ?? CAT_THEME.ATP_250;
  const pct      = simTotal > 0 ? Math.min(100, Math.round(simProgress/simTotal*100)) : 0;
  const curRound = simEvent?.roundLabel ?? (simEvent?.phase==='qualifying' ? 'QQ' : null);
  const aWon     = simEvent ? simEvent.winner?.id === simEvent.playerA?.id : false;

  const cssVars = {
    '--ho-main':  theme.main,
    '--ho-light': theme.light,
    '--ho-glow':  theme.glow,
    '--ho-bg':    theme.bg,
  };

  return (
    <div className="ho-overlay" style={cssVars}>
      <div className="ho-glow-tl" />
      <div className="ho-glow-br" />
      <div className="ho-scanline" />
      <div className="ho-grid" />

      <div className="ho-content" style={{ position:'relative' }}>

        {onStop && (
          <button className="ho-stop-btn" onClick={onStop}>
            <div className="ho-stop-icon" /> Parar
          </button>
        )}
        {onToggleStopOnBreaking && (
          <button
            onClick={() => onToggleStopOnBreaking(!stopOnBreaking)}
            style={{
              position:'absolute', top:22, right:onStop ? 118 : 22, zIndex:5,
              fontFamily:"'DM Mono', monospace", fontSize:10, letterSpacing:'.16em',
              textTransform:'uppercase', padding:'10px 12px',
              color: stopOnBreaking ? '#FFB3B3' : 'rgba(255,255,255,.46)',
              background: stopOnBreaking ? 'rgba(255,82,82,.14)' : 'rgba(255,255,255,.04)',
              border:`1px solid ${stopOnBreaking ? 'rgba(255,82,82,.35)' : 'rgba(255,255,255,.08)'}`,
              cursor:'pointer'
            }}
          >
            {stopOnBreaking ? 'pausar em breaking: on' : 'pausar em breaking: off'}
          </button>
        )}

        {/* HEADER */}
        <div className="ho-header">
          <div className="ho-live-dot" />
          <span className="ho-live-label">AO VIVO</span>
          <div style={{ width:1, height:22, background:'rgba(255,255,255,.1)' }} />
          {tournament ? (
            <div>
              <div className="ho-tourn-name">
                <span style={{ color:catTheme.color, marginRight:8 }}>{catTheme.short}</span>
                {tournament.icon} {tournament.name}
              </div>
              <div className="ho-tourn-meta">
                {theme.icon} {theme.label}
                {tournament.location ? ` · ${tournament.location}` : ''}
                {tournament.month    ? ` · ${tournament.month}` : ''}
                {` · ${tournament.draw??'?'} jogadores`}
                {tournament.bestOf === 5 ? ' · BEST OF 5' : ''}
              </div>
            </div>
          ) : (
            <div className="ho-tourn-name" style={{ color:'rgba(255,255,255,.25)' }}>Iniciando simulação…</div>
          )}
          <div style={{ marginLeft:'auto', display:'flex', gap:7, alignItems:'center' }}>
            {Array.from({ length:catTheme.tier }).map((_,i) => (
              <div key={i} style={{ width:7, height:7, borderRadius:'50%', background:catTheme.color, boxShadow:`0 0 7px ${catTheme.color}`, animation:'ho-pulse 2s ease-in-out infinite', animationDelay:`${i*.22}s` }} />
            ))}
          </div>
        </div>

        {/* ROUND STEPPER */}
        {tournament && (
          <RoundStepper roundLabel={curRound} surface={surface} drawSize={tournament.draw??32} />
        )}

        {breakingArticle && (
          <div style={{ margin:'0 0 14px', padding:'14px 16px', border:'1px solid rgba(255,82,82,.35)', background:'linear-gradient(90deg, rgba(255,82,82,.16), rgba(255,82,82,.05))' }}>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
              <div style={{ width:8, height:8, borderRadius:'50%', background:'#FF5252', boxShadow:'0 0 12px #FF5252' }} />
              <div style={{ fontFamily:"'DM Mono', monospace", fontSize:10, letterSpacing:'.2em', color:'#FF9E9E', textTransform:'uppercase' }}>Breaking detectada durante a simulação</div>
            </div>
            <div style={{ fontFamily:"'Oswald', sans-serif", fontSize:24, letterSpacing:'.05em', lineHeight:1.1, color:'#fff', textTransform:'uppercase' }}>
              {breakingArticle.headline}
            </div>
            <div style={{ fontFamily:"'DM Mono', monospace", fontSize:10, color:'rgba(255,255,255,.5)', marginTop:6, letterSpacing:'.12em' }}>
              {stopOnBreaking ? 'A simulação será interrompida ao fechar o torneio atual.' : 'A simulação continua, mas a redação já mudou de assunto.'}
            </div>
          </div>
        )}

        {/* BODY */}
        <div className="ho-body">

          {/* LEFT */}
          <div className="ho-match-panel">
            {simEvent?.playerA && simEvent?.playerB ? (
              <>
                <IdentityBanner event={simEvent} theme={theme} rivalrySystem={rivalrySystem} />
                <div className="ho-scoreboard" key={simEvent.id ?? simProgress}>
                  <PlayerRow player={simEvent.playerA} setsDetail={simEvent.result?.setsDetail} isWinner={aWon}  playerIndex={0} />
                  <PlayerRow player={simEvent.playerB} setsDetail={simEvent.result?.setsDetail} isWinner={!aWon} playerIndex={1} />
                </div>

                {/* ── BADGES GRANDES — abaixo do placar ── */}
                {(() => {
                  const { badges } = analyzeMatchDrama(simEvent, rivalrySystem);
                  if (!badges.length) return null;
                  return (
                    <div style={{
                      display: 'flex', flexWrap: 'wrap', gap: 8,
                      padding: '14px 0 4px',
                      borderTop: '1px solid rgba(255,255,255,.06)',
                      marginTop: 4, flexShrink: 0,
                    }}>
                      {badges.map((b, i) => (
                        <span key={i} style={{
                          background: b.bg,
                          color: b.fg,
                          fontFamily: "'DM Mono', monospace",
                          fontSize: 13,
                          fontWeight: 700,
                          letterSpacing: '.18em',
                          padding: '7px 16px',
                          borderRadius: 4,
                          textTransform: 'uppercase',
                          animation: `ho-badge-pop .3s cubic-bezier(.16,1,.3,1) ${i * .08}s both`,
                          border: `1px solid ${b.fg}33`,
                        }}>
                          {b.label}
                        </span>
                      ))}
                    </div>
                  );
                })()}

                <StatsAB result={simEvent.result} />
                <div className="ho-computing">
                  <div className="ho-spin" />
                  <div>
                    <div style={{ fontFamily:"'DM Mono',monospace", fontSize:10, color:theme.light, letterSpacing:'.14em' }}>PROCESSANDO PRÓXIMA PARTIDA</div>
                    <div style={{ fontFamily:"'DM Mono',monospace", fontSize:8, color:'rgba(255,255,255,.22)', letterSpacing:'.12em', marginTop:2 }}>
                      {simEvent.result?.points??'—'} pontos · {simEvent.result?.setsDetail?.length??0} sets
                    </div>
                  </div>
                  <div style={{ marginLeft:'auto', fontFamily:"'Oswald',sans-serif", fontSize:20, fontWeight:700, color:theme.main }}>
                    {simProgress}<span style={{ fontSize:11, color:'rgba(255,255,255,.28)', marginLeft:3 }}>/{simTotal}</span>
                  </div>
                </div>
              </>
            ) : (
              <div className="ho-waiting">
                <div className="ho-waiting-icon">{tournament?.icon ?? '🎾'}</div>
                <div className="ho-waiting-text">Preparando chave</div>
                <div className="ho-waiting-sub">Processando qualifying e draw…</div>
              </div>
            )}
          </div>

          {/* RIGHT: feed */}
          <div className="ho-feed-panel">
            <div className="ho-feed-header">📋 Resultados ao vivo</div>
            <div className="ho-feed-list">
              {simFeed.length === 0 ? (
                <div style={{ padding:20, textAlign:'center', color:'rgba(255,255,255,.1)', fontFamily:"'DM Mono',monospace", fontSize:9, letterSpacing:'.2em' }}>
                  AGUARDANDO PARTIDAS…
                </div>
              ) : (
                simFeed.map((ev, i) => (
                  <FeedItem key={ev.id??i} event={ev} index={i} surfaceTheme={theme} rivalrySystem={rivalrySystem} />
                ))
              )}
            </div>
            {simFeed.length > 0 && <TournamentCounters feed={simFeed} theme={theme} rivalrySystem={rivalrySystem} />}
          </div>
        </div>

        {/* PROGRESS */}
        <div className="ho-progress-bar">
          <div className="ho-progress-fill" style={{ width:`${pct}%` }} />
        </div>

        {/* FOOTER */}
        <div className="ho-footer">
          <div className="ho-footer-count">
            <span style={{ color:theme.light, fontWeight:700 }}>{simProgress}</span>
            <span style={{ color:'rgba(255,255,255,.2)' }}> / {simTotal} partidas · </span>
            <span style={{ color:theme.light }}>{pct}%</span>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
            <div style={{ width:5, height:5, borderRadius:'50%', background:'#4CAF50', boxShadow:'0 0 7px #4CAF50', animation:'ho-pulse 1.5s ease-in-out infinite' }} />
            <div className="ho-footer-engine">Headless Engine · Modo Universo</div>
          </div>
        </div>

      </div>
    </div>
  );
}
