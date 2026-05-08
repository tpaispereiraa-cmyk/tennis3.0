// ═══════════════════════════════════════════════════════════════════
// ── SERVE EV + RETURN EV SYSTEM ─────────────────────────────────
import { COURT, TIMING, GameState } from '../../core/constants.js';
import { v2, clamp, rand, mag3 } from '../../core/math.js';
import { launchBall } from '../../core/physics.js';
import { getWingControle, getWingPotencia } from '../../domain/players/attributes.js';
import { mergeGeneratedPrefs } from '../../domain/players/playerPrefs.js';
import { computeSigmaX, getAtpSpinMultipliers } from './ballOutputEngine.js';
import { playSound } from '../audio/sound.js';
import { pushShotVFX } from '../vfx/vfx.js';

const FALLBACK_POINT_STATE = () => [];
const FALLBACK_TRAIT_FX = () => ({ serveMult: 1.0 });
const FALLBACK_PUSH_TECH = () => {};
const _f2 = (n) => (typeof n === 'number' ? (n >= 0 ? ' ' : '') + n.toFixed(2) : '   ???');
const _f1 = (n) => (typeof n === 'number' ? (n >= 0 ? ' ' : '') + n.toFixed(1) : '  ???');

const SR_DEPS = {
  getPointPressureState: FALLBACK_POINT_STATE,
  getUnifiedPlayerTraitFx: FALLBACK_TRAIT_FX,
  pushTech: FALLBACK_PUSH_TECH,
};

export function configureServeReturnSystem(deps = {}) {
  SR_DEPS.getPointPressureState = deps.getPointPressureState ?? FALLBACK_POINT_STATE;
  SR_DEPS.getUnifiedPlayerTraitFx = deps.getUnifiedPlayerTraitFx ?? FALLBACK_TRAIT_FX;
  SR_DEPS.pushTech = deps.pushTech ?? FALLBACK_PUSH_TECH;
}

export const RETURN_PILLS_PTBR = {
  BLOCK_RETURN: 'BLOQUEIO',
  CHIP_RETURN: 'CHIP',
  NEUTRAL_RETURN: 'NEUTRA',
  DRIVE_RETURN: 'AGRESSIVA',
  STEP_IN_RETURN: 'ENTRADA',
  COUNTER_RETURN: 'CONTRA-ATAQUE',
  LATE_BLOCK: 'BLOQ. TARDIO',
  STRETCH_RETURN: 'ESTICADA',
};

// ═══════════════════════════════════════════════════════════════════
//
// Replaces the flat weighted-random serve selection with:
//   A) ServeDecisionEV: candidateGen → pressureScore/safetyScore/
//                       rewardScore/patternScore → softmax pick
//   B) ReturnPositioningEV: receiver moves to best position BEFORE
//      the serve based on server's history (no telepathy).
//   C) ReturnShotEV: first ball of rally uses EV to choose how to
//      return (chip, block, drive, lob) based on serve type/speed.
//
// All existing physics (launchBall, spin, scatter, faultProb base,
// SERVE_DEFS) remain untouched — only the selection is replaced.
// ────────────────────────────────────────────────────────────────────

// ── Clamp helper ─────────────────────────────────────────────────
function _c01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }

function getServeIdentityPrefs(player) {
  const merged = mergeGeneratedPrefs(player?.attrs ?? {}, player?.prefs ?? {});
  if (player) player.prefs = merged;
  return merged;
}

function getServeNetAverage(attrs = {}) {
  const volley = attrs.volley ?? 50;
  const smash = attrs.smash ?? 50;
  return (volley + smash) / 2;
}

function getPrimaryControl(attrs = {}) {
  return Math.max(getWingControle(attrs, false), getWingControle(attrs, true));
}

function getPrimaryPower(attrs = {}) {
  return Math.max(getWingPotencia(attrs, false), getWingPotencia(attrs, true));
}

function getTouchSkill(attrs = {}) {
  const slice = attrs.slice ?? 60;
  const control = getPrimaryControl(attrs);
  const volley = attrs.volley ?? 50;
  return (slice + control + volley) / 300;
}

// ── A) SERVE DECISION EV ─────────────────────────────────────────

// Serve candidate: wraps a SERVE_DEFS index with intent metadata.
function makeServeCand(defIdx, dir, tags, tXOverride = null) {
  return { defIdx, dir, tags, tXOverride };
}

// Build serve candidates for current situation (8–12 options).
function generateServeCands(isSec, sl, servePower = 0.70) {
  const cands = [];

  // SERVE_DEFS indices:
  // 0=FLAT-T  1=FLAT-WIDE  2=FLAT-BODY  3=SLICE-WIDE
  // 4=SLICE-T  5=KICK-BODY  6=KICK-T

  if (!isSec) {
    // 1st serve: full arsenal, aggressive options available
    cands.push(makeServeCand(0, 'T',    ['RUSH']));          // FLAT-T
    cands.push(makeServeCand(1, 'WIDE', ['OPEN']));          // FLAT-WIDE
    cands.push(makeServeCand(2, 'BODY', ['JAM']));           // FLAT-BODY
    cands.push(makeServeCand(3, 'WIDE', ['OPEN']));          // SLICE-WIDE
    cands.push(makeServeCand(4, 'T',    ['RUSH']));          // SLICE-T
    cands.push(makeServeCand(5, 'BODY', ['JAM']));           // KICK-BODY
    cands.push(makeServeCand(6, 'T',    ['SAFE']));          // KICK-T
    // Style extras
    if (servePower >= 0.85)  // Big server / serve-volleyer analog
      cands.push(makeServeCand(1, 'WIDE', ['OPEN', 'RUSH']));  // extra FLAT-WIDE
    if (servePower <= 0.55)  // defensive server analog
      cands.push(makeServeCand(6, 'T', ['SAFE']));            // extra KICK-T
  } else {
    // 2nd serve: conservative. No FLAT-WIDE (too risky). KICK dominates.
    cands.push(makeServeCand(5, 'BODY', ['JAM',  'SAFE']));  // KICK-BODY
    cands.push(makeServeCand(6, 'T',    ['SAFE']));           // KICK-T
    cands.push(makeServeCand(3, 'WIDE', ['OPEN', 'SAFE']));  // SLICE-WIDE (moderate)
    cands.push(makeServeCand(4, 'T',    ['SAFE']));           // SLICE-T
    cands.push(makeServeCand(2, 'BODY', ['JAM',  'SAFE']));  // FLAT-BODY (risky but available)
    // 2º saque não deve virar 1º saque disfarçado; flat só aparece para canhões.
    if (servePower > 0.86)
      cands.push(makeServeCand(0, 'T', ['SAFE']));            // FLAT-T raro, conservador
  }

  return cands;
}

// PressureScore: does this serve displacement the receiver?
function servePressureScore(c, sCtx) {
  let p = 0.45;
  const rvX = sCtx.rvX;  // receiver X (signed)

  // WIDE: effective when receiver is central; weaker when already wide
  if (c.dir === 'WIDE') {
    p += _c01((1.0 - Math.abs(rvX) / 2.0)) * 0.35;
    if (sCtx.rvIsWide) p -= 0.18;  // receiver already covering wide
  }
  // BODY: jams when receiver is inside or has narrow stance
  if (c.dir === 'BODY') p += sCtx.rvIsInside ? 0.28 : 0.10;
  // T: effective when receiver has drifted wide
  if (c.dir === 'T')    p += sCtx.rvIsWide ? 0.25 : 0.08;

  // Spin type bonus: slice/kick create extra discomfort
  const physType = sCtx.serveDefs[c.defIdx][0];
  if (physType === 'SLICE') p += 0.10;  // lateral bounce hard to handle
  if (physType === 'KICK')  p += sCtx.rvIsInside ? 0.14 : 0.06;  // high kick to body

  return _c01(p);
}

// SafetyScore: how likely is this serve to go IN?
function serveSafetyScore(c, sCtx) {
  let s = 0.72;  // neutral base
  const physType = sCtx.serveDefs[c.defIdx][0];
  const isSec = sCtx.isSec;

  if (physType === 'KICK')  s += isSec ? 0.22 : 0.10;
  if (physType === 'FLAT')  s -= isSec ? 0.32 : 0.10;
  if (physType === 'SLICE') s -= isSec ? 0.08 : 0.02;
  if (c.dir === 'WIDE')     s -= isSec ? 0.22 : 0.08;
  if (c.dir === 'T')        s -= 0.04;  // T slightly riskier than body

  // Aggressive depth increases miss chance
  const tYMid = isSec ? 0.56 : 0.64;
  s -= Math.max(0, tYMid - 0.68) * 1.0;

  // Break point: extra caution on 2nd serve
  if (sCtx.isBreakPoint && isSec) s += 0.10;

  // Stamina: tired servers are less precise
  if (sCtx.stamina < 0.55) s -= 0.07;

  // Recent faults: dial back on 2nd serve
  if (sCtx.recentFaults >= 2 && isSec) s += 0.08;

  return _c01(s);
}

// RewardScore: pure win potential (ace / weak return opportunity)
function serveRewardScore(c, sCtx) {
  let r = 0.30;  // base
  const physType = sCtx.serveDefs[c.defIdx][0];
  const isSec = sCtx.isSec;

  // FLAT-WIDE hardest to return, highest reward on 1st
  if (physType === 'FLAT' && c.dir === 'WIDE' && !isSec) r += 0.30;
  if (physType === 'FLAT' && c.dir === 'T' && !isSec)    r += 0.20;

  // SLICE-WIDE: medium reward (harder to attack after awkward bounce)
  if (physType === 'SLICE' && c.dir === 'WIDE') r += 0.18;

  // Big server amplification
  if ((sCtx.saqAttr ?? 60) >= 82 && physType === 'FLAT') r += 0.12;
  if ((sCtx.netAttr ?? 50) >= 78 && c.dir === 'WIDE') r += 0.10;

  // 2nd serve: reward drops (safety > reward)
  if (isSec) r *= 0.50;

  // Recent ace streak: this type is working, keep it
  if (sCtx.serve1InStreak >= 3 && physType === sCtx.lastPhysType) r += 0.08;

  return _c01(r);
}

// PatternScore: reward variation, punish spam
function servePatternScore(c, sCtx) {
  const hist = sCtx.serveHistory;
  if (hist.length < 2) return 0.55;  // neutral early on

  let p = 0.55;
  const recent = hist.slice(-3);

  // Count consecutive same direction
  const sameDir = recent.filter(h => h.dir === c.dir).length;
  if (sameDir >= 2) p -= 0.25;
  else if (sameDir === 0) p += 0.18;

  // Count consecutive same physType
  const physType = sCtx.serveDefs[c.defIdx][0];
  const samePT = recent.filter(h => h.physType === physType).length;
  if (samePT >= 2) p -= 0.12;
  else if (samePT === 0) p += 0.10;

  return _c01(p);
}

function serveIdentityScore(c, sCtx) {
  const prefs = sCtx.servePrefs || {};
  const physType = sCtx.serveDefs[c.defIdx][0];
  const isSec = sCtx.isSec;
  let score = 0.52;

  switch (prefs.serveProfile) {
    case 'CANNON':
      if (!isSec && physType === 'FLAT') score += 0.22;
      if (!isSec && (c.dir === 'T' || c.dir === 'WIDE')) score += 0.10;
      if (isSec && c.dir === 'WIDE') score -= 0.14;
      if (isSec && physType === 'KICK') score -= 0.06;
      break;
    case 'PRECISION':
      if (c.dir === 'T') score += 0.18;
      if (physType === 'SLICE' && c.dir === 'T') score += 0.06;
      if (isSec && physType === 'FLAT' && c.dir === 'WIDE') score -= 0.14;
      break;
    case 'BODY_JAMMER':
      if (c.dir === 'BODY') score += 0.22;
      if (physType === 'FLAT' || physType === 'KICK') score += 0.04;
      if (c.dir === 'WIDE') score -= 0.08;
      break;
    case 'WIDE_OPENER':
      if (c.dir === 'WIDE') score += 0.22;
      if (physType === 'SLICE' && c.dir === 'WIDE') score += 0.08;
      if (c.dir === 'BODY') score -= 0.07;
      break;
    case 'KICK_BUILDER':
      if (physType === 'KICK') score += isSec ? 0.24 : 0.12;
      if (isSec && physType === 'FLAT') score -= 0.14;
      if (c.dir === 'T') score += 0.05;
      break;
    default:
      if (c.dir !== 'BODY' && !isSec) score += 0.03;
      break;
  }

  if (!isSec) {
    switch (prefs.serve1Bias) {
      case 'POWER': if (physType === 'FLAT') score += 0.16; break;
      case 'T':     if (c.dir === 'T') score += 0.14; break;
      case 'BODY':  if (c.dir === 'BODY') score += 0.14; break;
      case 'WIDE':  if (c.dir === 'WIDE') score += 0.14; break;
      case 'SHAPE': if (physType !== 'FLAT') score += 0.12; break;
      default: score += 0.03; break;
    }
  } else {
    switch (prefs.serve2Bias) {
      case 'KICK':  if (physType === 'KICK') score += 0.20; break;
      case 'T':     if (c.dir === 'T') score += 0.12; break;
      case 'BODY':  if (c.dir === 'BODY') score += 0.12; break;
      case 'SLICE': if (physType === 'SLICE') score += 0.16; break;
      case 'SAFE':
        if (physType === 'KICK') score += 0.12;
        if (c.dir === 'WIDE' && physType === 'FLAT') score -= 0.12;
        break;
      default:
        score += 0.02;
        break;
    }
  }

  if (sCtx.isBreakPoint) {
    switch (prefs.pressureServe) {
      case 'BOLD':
        if (!isSec && physType === 'FLAT') score += 0.16;
        if (isSec && c.dir === 'WIDE') score -= 0.08;
        break;
      case 'SPOT':
        if (c.dir === 'T') score += 0.16;
        if (physType === 'SLICE' && c.dir === 'T') score += 0.05;
        break;
      case 'BODY_LOCK':
        if (c.dir === 'BODY') score += 0.18;
        break;
      case 'KICK_TRUST':
        if (physType === 'KICK') score += 0.18;
        break;
      case 'SAFE_RESET':
        if (isSec && physType === 'KICK') score += 0.14;
        if (physType === 'FLAT' && c.dir === 'WIDE') score -= 0.12;
        break;
      default:
        break;
    }
  }

  return _c01(score);
}

function serveTacticalScore(c, sCtx) {
  const state = sCtx.tacticalState;
  if (!state) return 0.52;
  let score = 0.52;
  score += state.dirBias?.[c.dir] ?? 0;
  if (state.hotDir === c.dir) score += 0.08;
  if (state.varyFrom === c.dir) score -= 0.18;
  if (state.counterOpenDir === c.dir) score += 0.10;
  if (state.anticipatedDir === c.dir) score -= 0.08 + (state.patternPressure ?? 0) * 0.08;
  return _c01(score);
}

// Score a serve candidate → {EV, sub}
function scoreServeCand(c, sCtx) {
  const sP = servePressureScore(c, sCtx);
  const sR = serveRewardScore(c, sCtx);
  const sS = serveSafetyScore(c, sCtx);
  const sV = servePatternScore(c, sCtx);
  const sI = serveIdentityScore(c, sCtx);
  const sT = serveTacticalScore(c, sCtx);

  let EV;
  if (sCtx.isSec) {
    // 2nd serve: safety dominates
    EV = 0.16 * sP + 0.08 * sR + 0.39 * sS + 0.10 * sV + 0.14 * sI + 0.13 * sT;
  } else {
    // 1st serve: balanced — pressure and reward matter more
    EV = 0.24 * sP + 0.18 * sR + 0.16 * sS + 0.10 * sV + 0.18 * sI + 0.14 * sT;
  }

  return { c, EV, sub: { pressure: sP, reward: sR, safety: sS, pattern: sV, identity: sI, tactical: sT } };
}

// Softmax pick for serve (shared temperature logic)
function serveTemperature(sCtx) {
  let t = 0.18;
  // Clear read of receiver position → more decisive
  if (sCtx.rvIsInside && !sCtx.isSec) t *= 0.75;
  if (sCtx.rvIsWide)                   t *= 0.80;
  // 2nd serve: more conservative (lower temp = more predictable/safe)
  if (sCtx.isSec) t *= 0.70;
  // Break point: very cautious on 2nd
  if (sCtx.isBreakPoint && sCtx.isSec) t *= 0.60;
  return Math.max(0.06, Math.min(0.32, t));
}

// Main EV serve selection — returns a scored candidate
function evPickServe(isSec, sl, sv, rv, isBreakPoint, serveDefs) {
  const mc = sv.ctx.matchCtx;
  const serveHistory = mc.serveHistory || [];
  const servePrefs = getServeIdentityPrefs(sv);
  const tacticalState = computeServePatternState(sv.ctx.matchCtx, rv.ctx.matchCtx, isSec, sl);

  // Build context object
  const rvX       = rv.pos.x;
  const rvY       = rv.pos.y;
  const rvSide    = rv.side;
  const rvBaseY   = rvSide * (COURT.halfL + 2.0);

  // Receiver posture (heuristic, no telepathy — pure position read)
  const rvIsWide   = Math.abs(rvX) > 1.1;
  const rvIsInside = Math.abs(rvY) < Math.abs(rvBaseY) - 0.8;  // stepped in from baseline
  const rvIsDeep   = Math.abs(rvY) > Math.abs(rvBaseY) + 0.5;  // far behind baseline

  const sCtx = {
    isSec, sl,
    saqAttr:  sv.attrs?.saqueForca ?? 60,
    netAttr:  getServeNetAverage(sv.attrs ?? {}),
    rvX, rvIsWide, rvIsInside, rvIsDeep,
    isBreakPoint, stamina: sv.stamina ?? 1.0,
    serveHistory,
    serve1InStreak: mc.serve1InStreak || 0,
    recentFaults:   mc.recentFaults   || 0,
    lastPhysType:   serveHistory.length ? serveHistory[serveHistory.length - 1].physType : null,
    serveDefs,
    servePrefs,
    tacticalState,
  };

  const cands  = generateServeCands(isSec, sl, (sv.attrs?.saqueForca ?? sv.attrs?.saque ?? 60) / 100);
  const scored = cands.map(c => scoreServeCand(c, sCtx));
  const temp   = serveTemperature(sCtx);

  // Softmax pick
  const maxEV = Math.max(...scored.map(s => s.EV));
  const exps  = scored.map(s => Math.exp((s.EV - maxEV) / temp));
  const sum   = exps.reduce((a, b) => a + b, 0);
  let r = Math.random() * sum;
  for (let i = 0; i < scored.length; i++) {
    r -= exps[i]; if (r <= 0) return { picked: scored[i], sCtx, scored };
  }
  return { picked: scored[scored.length - 1], sCtx, scored };
}

// Derive serveIntent from candidate tags
function deriveServeIntent(c) {
  if (c.tags.includes('OPEN'))  return c.tags.includes('RUSH') ? 'RUSH' : 'OPEN';
  if (c.tags.includes('JAM'))   return 'JAM';
  if (c.tags.includes('SAFE'))  return 'SAFE';
  if (c.tags.includes('RUSH'))  return 'RUSH';
  return 'SAFE';
}

// Push to serveHistory (circular, max 8)
function pushServeHistory(mc, entry) {
  mc.serveHistory = mc.serveHistory || [];
  mc.serveHistory.push(entry);
  if (mc.serveHistory.length > 8) mc.serveHistory.shift();
}

function computeServePatternState(serverMc, receiverMc, isSec, sl) {
  const hist = (serverMc?.serveHistory || []).filter(h => h.isSec === isSec).slice(-6);
  const result = {
    anticipatedDir: null,
    hotDir: null,
    varyFrom: null,
    counterOpenDir: null,
    dirBias: { WIDE: 0, T: 0, BODY: 0 },
    patternPressure: 0,
  };
  if (!hist.length) return result;

  const recentSide = hist.filter(h => h.serveLeft === sl).slice(-4);
  const sample = recentSide.length >= 2 ? recentSide : hist;
  const counts = { WIDE: 0, T: 0, BODY: 0 };
  const wins = { WIDE: 0, T: 0, BODY: 0 };
  const aggressiveReads = { WIDE: 0, T: 0, BODY: 0 };
  const discomfortReads = { WIDE: 0, T: 0, BODY: 0 };
  const aggressiveFamilies = new Set(['DRIVE_ATTACK', 'DRIVE_NEUTRAL', 'COUNTER_UP', 'BLOCK_BODY']);
  const discomfortFamilies = new Set(['CHIP_STRETCH', 'BLOCK_STRETCH', 'CHIP_RESET', 'BLOCK_RESET', 'RESET_BODY']);

  sample.forEach((h, idx) => {
    const w = Math.pow(0.84, sample.length - 1 - idx);
    const dir = h.dir || 'T';
    counts[dir] += w;
    if (h.won) wins[dir] += w;
    if (aggressiveFamilies.has(h.returnFamily)) aggressiveReads[dir] += w;
    if (discomfortFamilies.has(h.returnFamily)) discomfortReads[dir] += w;
  });

  const total = counts.WIDE + counts.T + counts.BODY || 1;
  const dirs = ['WIDE', 'T', 'BODY'];
  dirs.forEach(dir => {
    const share = counts[dir] / total;
    const winRate = counts[dir] > 0 ? wins[dir] / counts[dir] : 0.5;
    const anticipation = Math.max(0, share - 0.34) * 0.55 + aggressiveReads[dir] * 0.18;
    const comfort = discomfortReads[dir] * 0.10;
    result.dirBias[dir] = clamp((winRate - 0.52) * 0.55 - anticipation + comfort, -0.35, 0.35);
  });

  const sortedByShare = [...dirs].sort((a, b) => counts[b] - counts[a]);
  const sortedByBias = [...dirs].sort((a, b) => result.dirBias[b] - result.dirBias[a]);
  const topDir = sortedByShare[0];
  const topShare = counts[topDir] / total;
  const topWinRate = counts[topDir] > 0 ? wins[topDir] / counts[topDir] : 0.5;
  const topAggroReads = aggressiveReads[topDir];

  if (topShare >= 0.52 || sample.slice(-3).filter(h => h.dir === topDir).length >= 2) {
    result.anticipatedDir = topDir;
  }
  if (topShare >= 0.52 && topWinRate < 0.50 + Math.max(0, topAggroReads - 0.5) * 0.05) {
    result.varyFrom = topDir;
    result.patternPressure = clamp(topShare * 0.9 + topAggroReads * 0.12, 0, 1);
  } else if (topWinRate >= 0.64 && topShare <= 0.58) {
    result.hotDir = topDir;
  }

  result.counterOpenDir = sortedByBias[0];
  if (result.counterOpenDir === result.varyFrom) {
    result.counterOpenDir = sortedByBias[1] ?? result.counterOpenDir;
  }

  if (result.anticipatedDir === 'T' && (aggressiveReads.T > 0.7 || topShare > 0.56)) {
    result.dirBias.BODY += 0.08;
    result.dirBias.WIDE += 0.10;
  }
  if (result.anticipatedDir === 'BODY' && aggressiveReads.BODY > 0.45) {
    result.dirBias.WIDE += 0.12;
  }
  if (result.anticipatedDir === 'WIDE' && aggressiveReads.WIDE > 0.45) {
    result.dirBias.BODY += 0.08;
    result.dirBias.T += 0.08;
  }

  dirs.forEach(dir => { result.dirBias[dir] = clamp(result.dirBias[dir], -0.35, 0.35); });
  return result;
}

export function finalizeServeReturnPattern(gs, pd, serverWon, isAce) {
  if (!pd) return;
  const server = gs.players[gs.server];
  const receiver = gs.players[gs.receiver];
  const serverMc = server?.ctx?.matchCtx;
  const receiverMc = receiver?.ctx?.matchCtx;
  if (!serverMc || !receiverMc) return;

  const serveEntry = [...(serverMc.serveHistory || [])].reverse().find(e => e.pointNum === pd.pointNum);
  const returnPlan = receiver?.ctx?._returnPlan ?? null;
  if (serveEntry) {
    serveEntry.outcome = serverWon ? (isAce ? 'ACE' : 'WON') : 'LOST';
    serveEntry.won = !!serverWon;
    serveEntry.returnFamily = returnPlan?.family ?? null;
    serveEntry.returnHint = receiver?.ctx?._returnHint ?? null;
    serveEntry.serverWon = !!serverWon;
  }

  const lastReturn = [...(receiverMc.returnHistory || [])].reverse().find(e => e.pointNum === pd.pointNum || !e.pointNum);
  if (lastReturn) {
    lastReturn.pointNum = pd.pointNum;
    lastReturn.serverWon = !!serverWon;
    lastReturn.receiverWon = !serverWon;
    lastReturn.serveDir = pd.dir;
    lastReturn.serveType = pd.physType;
  }

  serverMc.servePatternState = computeServePatternState(serverMc, receiverMc, pd.isFirst ? false : true, pd.serveLeft);
  receiverMc.returnReadState = {
    anticipatedDir: serverMc.servePatternState.anticipatedDir,
    punishDir: serverMc.servePatternState.varyFrom,
    openDir: serverMc.servePatternState.counterOpenDir,
    patternPressure: serverMc.servePatternState.patternPressure,
  };

  // Memória de posicionamento de retorno (eixo X/Y) para o TennisMovement.
  // Aprende com a direção do saque atual + resultado do ponto.
  // scale final esperado: -1..1 (positivo = tender para lado wide atual / recuar)
  const serveSideSign = pd.serveLeft ? 1 : -1;
  let sampleX = 0;
  if (pd.dir === 'WIDE') sampleX = serveSideSign * 0.75;
  else if (pd.dir === 'T') sampleX = -serveSideSign * 0.62;
  else if (pd.dir === 'BODY') sampleX = 0;

  const resultMod = serverWon ? 1.0 : 0.75; // quando retornador ganhou, suaviza viés
  const harshServe = pd.kmh >= 188 || pd.physType === 'KICK' ? 1 : 0;
  const sampleY = (harshServe ? 0.55 : 0.10) * resultMod; // positivo = passo atrás

  receiverMc.returnPosXBias = _c01(Math.abs((receiverMc.returnPosXBias ?? 0) * 0.82 + sampleX * 0.18)) * Math.sign((receiverMc.returnPosXBias ?? 0) * 0.82 + sampleX * 0.18);
  receiverMc.returnDepthBias = _c01(Math.abs((receiverMc.returnDepthBias ?? 0) * 0.80 + sampleY * 0.20)) * Math.sign((receiverMc.returnDepthBias ?? 0) * 0.80 + sampleY * 0.20);
  if (!serverWon && pd.isFirst) {
    // Se o retornador conseguiu ganhar no 1º saque, pode entrar um pouco mais no próximo.
    receiverMc.returnDepthBias = clamp(receiverMc.returnDepthBias - 0.10, -1, 1);
  }
}

function buildServeFirstBallPlan(serveData, returnPlan, server) {
  if (!serveData || !returnPlan || !server) return null;
  const attrs = server.attrs ?? {};
  const attackSkill = ((attrs.visaoTatica ?? 60) + getPrimaryControl(attrs)) / 200;
  const powerSkill = getPrimaryPower(attrs) / 100;
  const adaptSkill = (attrs.adaptacao ?? 60) / 100;
  const confidence = clamp(attackSkill * 0.45 + powerSkill * 0.35 + adaptSkill * 0.20, 0, 1);

  let motive = 'PRESS_OPEN';
  let preferredDir = 'OPEN';
  let depthBias = 0.74;
  let shotBias = null;
  let intensityBonus = 0.06;
  let planStrength = 0.38;

  switch (returnPlan.family) {
    case 'BLOCK_STRETCH':
    case 'CHIP_STRETCH':
      motive = 'FINISH_OPEN';
      preferredDir = 'OPEN';
      depthBias = 0.82;
      shotBias = powerSkill > 0.68 ? 'ACCEL' : 'SHORT_ACCEL';
      intensityBonus = 0.22;
      planStrength = 0.88;
      break;
    case 'BLOCK_BODY':
    case 'RESET_BODY':
      motive = 'JAM_BODY';
      preferredDir = 'BODY';
      depthBias = 0.76;
      shotBias = powerSkill > 0.64 ? 'ACCEL' : 'TOPSPIN';
      intensityBonus = 0.14;
      planStrength = 0.72;
      break;
    case 'BLOCK_RESET':
      motive = 'PRESS_OPEN';
      preferredDir = serveData.dir === 'BODY' ? 'OPEN' : 'SAME';
      depthBias = 0.76;
      shotBias = powerSkill > 0.66 ? 'ACCEL' : 'TOPSPIN';
      intensityBonus = 0.10;
      planStrength = 0.66;
      break;
    case 'CHIP_RESET':
      motive = 'DRAG_FORWARD';
      preferredDir = 'OPEN';
      depthBias = 0.71;
      shotBias = 'TOPSPIN';
      intensityBonus = 0.04;
      planStrength = 0.54;
      break;
    case 'COUNTER_UP':
      motive = 'BUILD_HEAVY';
      preferredDir = 'BODY';
      depthBias = 0.78;
      shotBias = 'TOPSPIN';
      intensityBonus = 0.03;
      planStrength = 0.44;
      break;
    case 'DRIVE_ATTACK':
      motive = 'PRESS_OPEN';
      preferredDir = serveData.dir === 'WIDE' ? 'SAME' : 'OPEN';
      depthBias = 0.77;
      shotBias = 'TOPSPIN';
      intensityBonus = 0.02;
      planStrength = 0.34;
      break;
    case 'DRIVE_NEUTRAL':
      motive = 'BUILD_SPACE';
      preferredDir = 'OPEN';
      depthBias = 0.73;
      shotBias = 'TOPSPIN';
      intensityBonus = 0.00;
      planStrength = 0.26;
      break;
    default:
      break;
  }

  if (serveData.physType === 'KICK' && returnPlan.family !== 'DRIVE_ATTACK') {
    depthBias = Math.max(depthBias, 0.77);
    if (shotBias === 'ACCEL' && confidence < 0.72) shotBias = 'TOPSPIN';
  }
  if (serveData.dir === 'BODY' && preferredDir === 'OPEN') {
    planStrength += 0.04;
  }

  return {
    active: true,
    motive,
    preferredDir,
    depthBias: clamp(depthBias, 0.60, 0.86),
    shotBias,
    intensityBonus: clamp(intensityBonus, -0.02, 0.18),
    planStrength: clamp(planStrength + confidence * 0.10, 0.20, 0.90),
    expiresRally: 2,
    sourceFamily: returnPlan.family,
    serveDir: serveData.dir,
    servePhysType: serveData.physType,
  };
}

function buildReturnRecoveryPlanV2(serveData, returnPlan, receiver) {
  if (!serveData || !returnPlan || !receiver) return null;

  const attrs = receiver.attrs ?? {};
  const adapt = (attrs.adaptacao ?? 60) / 100;
  const recup = (attrs.recuperacao ?? 60) / 100;
  const devolucao = (attrs.devolucao ?? 60) / 100;
  const control = getPrimaryControl(attrs) / 100;

  let motive = 'BUILD_SPACE';
  let preferredDir = 'OPEN';
  let depthBias = 0.74;
  let shotBias = 'TOPSPIN';
  let intensityBonus = 0.00;
  let planStrength = 0.26 + adapt * 0.12 + recup * 0.10;

  switch (returnPlan.family) {
    case 'BLOCK_STRETCH':
    case 'CHIP_STRETCH':
      motive = 'NEUTRALIZE';
      preferredDir = 'BODY';
      depthBias = 0.68 + recup * 0.06;
      shotBias = control > 0.70 ? 'DRIVE' : 'TOPSPIN';
      intensityBonus = -0.04 + recup * 0.04;
      break;
    case 'BLOCK_BODY':
    case 'RESET_BODY':
      motive = 'BUILD_SPACE';
      preferredDir = adapt > 0.62 ? 'OPEN' : 'BODY';
      depthBias = 0.72 + adapt * 0.06;
      shotBias = adapt > 0.64 ? 'DRIVE' : 'TOPSPIN';
      intensityBonus = adapt > 0.68 ? 0.03 : 0.00;
      break;
    case 'BLOCK_RESET':
      motive = adapt > 0.64 ? 'PRESS_OPEN' : 'BUILD_SPACE';
      preferredDir = serveData.dir === 'WIDE' ? 'SAME' : 'OPEN';
      depthBias = 0.74 + adapt * 0.05;
      shotBias = adapt > 0.66 && control > 0.68 ? 'DRIVE' : 'TOPSPIN';
      intensityBonus = -0.01 + adapt * 0.04;
      break;
    case 'CHIP_RESET':
      motive = 'DRAG_FORWARD';
      preferredDir = 'OPEN';
      depthBias = 0.70 + adapt * 0.05;
      shotBias = 'SLICE';
      intensityBonus = -0.03 + adapt * 0.03;
      break;
    case 'COUNTER_UP':
      motive = 'PRESS_OPEN';
      preferredDir = 'OPEN';
      depthBias = 0.78;
      shotBias = devolucao > 0.76 ? 'ACCEL' : 'DRIVE';
      intensityBonus = 0.05 + adapt * 0.04;
      planStrength += 0.08;
      break;
    case 'DRIVE_ATTACK':
    case 'DRIVE_NEUTRAL':
      motive = 'PRESS_OPEN';
      preferredDir = serveData.dir === 'BODY' ? 'OPEN' : 'SAME';
      depthBias = 0.76 + adapt * 0.04;
      shotBias = devolucao > 0.72 ? 'DRIVE' : 'TOPSPIN';
      intensityBonus = 0.02 + adapt * 0.05;
      planStrength += 0.05;
      break;
    default:
      break;
  }

  return {
    active: true,
    motive,
    preferredDir,
    depthBias: clamp(depthBias, 0.62, 0.86),
    shotBias,
    intensityBonus: clamp(intensityBonus, -0.06, 0.14),
    planStrength: clamp(planStrength, 0.22, 0.78),
    expiresRally: adapt > 0.72 ? 3 : 2,
    sourceFamily: returnPlan.family,
    serveDir: serveData.dir,
    servePhysType: serveData.physType,
  };
}

// ── B) RETURN POSITIONING EV ──────────────────────────────────────
// Receiver decides WHERE to stand before the serve based on:
//   - server's observed serve history (dirs + types)
//   - tendências derivadas de attrs (saque + netGame pref) quando histórico é raso
//   - 1st vs 2nd serve context

// Compute a simple serve probability map from history
// serverAttrs: { saque, agressividade, netGame (pref) }
function serveHistoryProbs(mc, isSec, serverAttrs = {}, tacticalState = null) {
  const hist = (mc?.serveHistory || []).filter(h => h.isSec === isSec);

  // Prior baseado em attrs — substitui os arquétipos.
  // saque alto + agressividade alta → mais WIDE (abertura agressiva)
  // saque alto + netGame HUNTER/PROACTIVE → mais T (rush ao centro, aproximação)
  // saque médio/baixo → mais BODY + T (segurança)
  // v4: saqueForca para potência de saque; visaoTatica para intenção tática
  const saqPct   = (serverAttrs.saqueForca ?? 60) / 100;
  const agPct    = (serverAttrs.visaoTatica ?? 60) / 100;
  const netGame  = serverAttrs.netGame ?? 'RELUCTANT'; // pref do jogador

  // Tendência de WIDE: saques agressivos preferem abertura de quadra
  const wideBase = 0.22 + saqPct * 0.14 + agPct * 0.08;
  // Tendência de T: net hunters usam T para rush; controladores usam T para segurança
  const tBase    = (netGame === 'HUNTER' || netGame === 'PROACTIVE')
    ? 0.38 + saqPct * 0.10
    : 0.30 + (1 - agPct) * 0.10;
  // BODY: complemento
  const bodyBase = Math.max(0.15, 1.0 - wideBase - tBase);

  // Normalizar para somar 1.0
  const total = wideBase + tBase + bodyBase;
  const prior = {
    WIDE: wideBase / total,
    T:    tBase    / total,
    BODY: bodyBase / total,
  };

  if (hist.length < 3) return prior;  // confiar no prior até ter dados suficientes

  // Weighted history (recent decays at 0.82 per shot back)
  const counts = { WIDE: 0, T: 0, BODY: 0 };
  hist.forEach((h, i) => {
    const weight = Math.pow(0.82, hist.length - 1 - i);
    counts[h.dir] = (counts[h.dir] || 0) + weight;
  });
  const histTotal  = Object.values(counts).reduce((a, b) => a + b, 0.001);
  const empirical  = { WIDE: counts.WIDE / histTotal, T: counts.T / histTotal, BODY: counts.BODY / histTotal };

  // Blend: 60% empírico, 40% prior
  const blend = 0.60;
  const probs = {
    WIDE: blend * empirical.WIDE + (1 - blend) * prior.WIDE,
    T:    blend * empirical.T    + (1 - blend) * prior.T,
    BODY: blend * empirical.BODY + (1 - blend) * prior.BODY,
  };
  if (tacticalState?.anticipatedDir && probs[tacticalState.anticipatedDir] != null) {
    probs[tacticalState.anticipatedDir] += 0.08 + (tacticalState.patternPressure ?? 0) * 0.06;
    const sum2 = probs.WIDE + probs.T + probs.BODY;
    probs.WIDE /= sum2; probs.T /= sum2; probs.BODY /= sum2;
  }
  return probs;
}

// Return positioning candidates: lateral × depth = 6-9 combos
function generateReturnPosCands(isSec, sl) {
  // Lateral bias (relative to base return position)
  // Positive = toward T side, Negative = toward Wide side
  // (actual direction depends on serveLeft; we normalise by sign)
  const laterals = [
    { rxBias: 0.0,   tag: 'CENTER' },
    { rxBias: -0.6,  tag: 'SHIFT_WIDE' },   // drift wide (cover wide serve)
    { rxBias:  0.5,  tag: 'SHIFT_T' },      // drift toward T
  ];
  const depths = [
    { ryBias: 0.0,  tag: 'NORMAL' },
    { ryBias: 1.0,  tag: 'STEP_IN' },       // metres forward (into court)
    { ryBias: -0.8, tag: 'STEP_BACK' },     // metres backward
  ];

  const cands = [];
  laterals.forEach(l => depths.forEach(d => {
    cands.push({ rxBias: l.rxBias, ryBias: d.ryBias, tags: [l.tag, d.tag] });
  }));
  return cands;
}

// Score a return positioning candidate
function scoreReturnPosCand(rc, rCtx) {
  const probs = rCtx.serveProbs;
  const anticipatedDir = rCtx.tacticalRead?.anticipatedDir ?? null;
  const openDir = rCtx.tacticalRead?.openDir ?? null;
  const patternPressure = rCtx.tacticalRead?.patternPressure ?? 0;

  // coverageScore: how well does this position cover the likely serves?
  // SHIFT_T covers T and BODY better; SHIFT_WIDE covers WIDE.
  let coverage = 0;
  const isShiftT    = rc.tags.includes('SHIFT_T');
  const isShiftWide = rc.tags.includes('SHIFT_WIDE');
  const isCenter    = rc.tags.includes('CENTER');
  const isStepIn    = rc.tags.includes('STEP_IN');
  const isStepBack  = rc.tags.includes('STEP_BACK');

  if (isCenter)    coverage = (probs.T + probs.BODY) * 0.55 + probs.WIDE * 0.35;
  if (isShiftT)    coverage = probs.T * 0.75 + probs.BODY * 0.60 + probs.WIDE * 0.12;
  if (isShiftWide) coverage = probs.WIDE * 0.72 + probs.T * 0.22 + probs.BODY * 0.18;

  if (anticipatedDir === 'T' && isShiftT) coverage += 0.12 + patternPressure * 0.08;
  if (anticipatedDir === 'BODY' && isCenter) coverage += 0.11 + patternPressure * 0.06;
  if (anticipatedDir === 'WIDE' && isShiftWide) coverage += 0.12 + patternPressure * 0.08;
  if (openDir === 'WIDE' && isShiftT) coverage -= 0.04;
  if (openDir === 'BODY' && isShiftWide) coverage -= 0.04;

  // attackScore: step-in gives return advantage on 2nd serve or weak server
  let attack = 0;
  if (rCtx.isSec && isStepIn)  attack = 0.35 * (rCtx.returnAggroMode);
  if (!rCtx.isSec && isStepIn) attack = -0.10;  // stepping in against fast 1st = risky

  // riskScore: stepping in against big server 1st is dangerous
  let risk = 0;
  if (isStepIn  && !rCtx.isSec && rCtx.serverPower > 0.72) risk = -0.22;
  if (isStepBack && rCtx.isSec) risk = -0.10;  // stepping back on slow 2nd wastes advantage

  const EV = _c01(coverage + attack + risk);
  return { rc, EV };
}

// Pick return position via EV
function evPickReturnPos(rv, sv, gs) {
  const mc   = sv.ctx.matchCtx;
  const rvMc = rv.ctx.matchCtx;
  const isSec  = sv.faults === 1;
  const sl     = gs.serveLeft;
  const tacticalRead = computeServePatternState(mc, rvMc, isSec, sl);

  const serveProbs   = serveHistoryProbs(mc, isSec, { ...(sv.attrs ?? {}), netGame: sv.prefs?.netGame }, tacticalRead);
  const returnAggro  = rvMc.returnAggroMode || 0;
  // v4: saqueForca define a potência bruta do saque; saquePrecisao já foi usado em precAttr
  const _svSaqPct    = (sv.attrs?.saqueForca ?? 60) / 100;
  const serverPower  = 0.68 + _svSaqPct * 0.28; // saqueForca=50→0.82, saqueForca=90→0.93

  const rCtx = { isSec, serveProbs, returnAggroMode: returnAggro, serverPower, tacticalRead };
  const cands  = generateReturnPosCands(isSec, sl);
  const scored = cands.map(rc => scoreReturnPosCand(rc, rCtx));
  rvMc.returnReadState = {
    anticipatedDir: tacticalRead.anticipatedDir,
    openDir: tacticalRead.counterOpenDir,
    patternPressure: tacticalRead.patternPressure,
  };

  const temp = isSec ? 0.22 : 0.18;
  const maxEV = Math.max(...scored.map(s => s.EV));
  const exps  = scored.map(s => Math.exp((s.EV - maxEV) / temp));
  const sumE  = exps.reduce((a, b) => a + b, 0);
  let r = Math.random() * sumE;
  for (let i = 0; i < scored.length; i++) {
    r -= exps[i]; if (r <= 0) return scored[i].rc;
  }
  return scored[scored.length - 1].rc;
}

// ── C) RETURN SHOT EV ────────────────────────────────────────────
// Called when the receiver makes first contact (rally === 0, i.e.
// serve return). Returns a hint object { type, targetXBias, depthBias }
// that aiDecideShot will use via the normal EV pipeline.
// We don't bypass aiDecideShot — we just pre-seed the intent.

// Classify incoming serve quality for the receiver
function classifyServeForReturn(ball, quality, sStyle) {
  const spd3d = Math.sqrt(ball.vel.x**2 + ball.vel.y**2 + ball.vel.z**2);
  const kmh   = spd3d * 3.6;

  // Height at contact matters a lot (kick serve = high, flat = low)
  const isHigh = ball.pos.z > 1.10;
  // [FIX] Classificação realista de saques ATP:
  // 1º saque ATP médio: ~195 km/h → deve ser HARD para o retornador
  // Threshold anterior (160 km/h) era muito baixo — classificava 90% dos saques como NEUTRAL
  const isFast    = kmh > 175;   // saque acima da média ATP = difícil de atacar
  const isVFast   = kmh > 200;   // saque de elite — quase impossível de atacar
  const isVSlow   = kmh < 120;   // saque muito lento (2º saque fraco) = fácil de atacar

  if (quality < 0.35 || (isVFast && isHigh))           return 'HARD';
  if (quality < 0.50 || (isFast  && isHigh))            return 'HARD';
  if (isFast && quality >= 0.55)                         return 'HARD';   // saque rápido e bem colocado
  if (quality >= 0.68 && (isVSlow || (!isFast && !isHigh))) return 'EASY'; // 2º saque real fraco
  return 'NEUTRAL';
}

function classifyServeForReturnV2(ball, quality, sv, rv) {
  // _servePhysType, _serveDir e _serveExitKmh são setados em tickServing diretamente na bola.
  // sv._pendingServeData NÃO é usado aqui — os dados já estão no objeto ball.
  const spd3d = Math.sqrt(ball.vel.x**2 + ball.vel.y**2 + ball.vel.z**2);
  const kmh      = ball._serveExitKmh ?? (spd3d * 3.6);
  const physType = ball._servePhysType ?? 'FLAT';
  const dir      = ball._serveDir      ?? 'T';
  const isHigh = ball.pos.z > 1.10;
  const serveNum = ball._serveNumber ?? ((sv?.faults ?? 0) === 1 ? 2 : 1);
  const isSecond = serveNum === 2;
  const isFast = kmh > 175;
  const isVFast = kmh > 200;
  const isSlow = isSecond ? kmh < 158 : kmh < 135;
  const isAttackable2nd = isSecond && kmh < 152 && quality >= 0.55;
  const latGap = Math.abs((ball?.pos?.x ?? 0) - (rv?.pos?.x ?? 0));
  const stretch = latGap > 1.35 || (dir === 'WIDE' && latGap > 0.95);
  const jammed = dir === 'BODY' && latGap < 0.70;
  const kickPlayable = physType === 'KICK' && isHigh && kmh < 182 && latGap < 1.45;

  let kind = 'NEUTRAL';
  if (quality < 0.35 || (isVFast && isHigh) || (isFast && quality >= 0.55) || stretch) kind = 'HARD';
  else if (
    quality >= (isSecond ? 0.56 : 0.66) &&
    (isAttackable2nd || (isSlow && (!isHigh || isSecond) && kmh < (isSecond ? 164 : 138)))
  ) kind = 'EASY';
  if (kickPlayable && kind === 'HARD') kind = 'NEUTRAL';

  return { kind, kmh, physType, dir, isHigh, isFast, isVFast, isSlow, isSecond, isAttackable2nd, stretch, jammed, kickPlayable, quality };
}

// Given serve context, pre-compute a return intent hint
// This nudges the EV system (already called in aiDecideShot) toward
// the right return type. We don't override — just set ctx fields.
export function computeReturnIntent(rv, sv, ball, quality, gsRally) {
  if (gsRally !== 0) return;  // only for first touch (serve return)

  const serveInfo = classifyServeForReturnV2(ball, quality, sv, rv);
  const rvMc = rv.ctx.matchCtx;
  const serveIntent = sv.ctx.matchCtx.serveIntent || 'SAFE';
  const attrs = rv.attrs ?? {};
  const retSkill = (attrs.devolucao ?? 60) / 100;
  const adapt = (attrs.adaptacao ?? 60) / 100;
  const recup = (attrs.recuperacao ?? 60) / 100;
  const control = clamp((getPrimaryControl(attrs) / 100) * 0.45 + retSkill * 0.55, 0, 1);
  const read = (attrs.leitura ?? 60) / 100;
  const aggr = (attrs.visaoTatica ?? 60) / 100;
  const touch = getTouchSkill(attrs);
  const canDrive = retSkill > 0.64 && control > 0.60;
  const canChip = touch > 0.62;

  let family = 'RESET';
  if (serveInfo.stretch) family = canChip ? 'CHIP_STRETCH' : 'BLOCK_STRETCH';
  else if (serveInfo.jammed) family = control > 0.62 ? 'BLOCK_BODY' : 'RESET_BODY';
  else if (serveInfo.kind === 'EASY' && canDrive && aggr > 0.56) family = 'DRIVE_ATTACK';
  else if (serveInfo.kind === 'HARD' && canChip && (serveInfo.physType === 'SLICE' || serveInfo.isHigh)) family = 'CHIP_RESET';
  else if (serveInfo.kind === 'HARD') family = 'BLOCK_RESET';
  else if (serveInfo.kind === 'NEUTRAL' && serveInfo.physType === 'KICK' && canDrive && read > 0.74 && serveInfo.kmh < 160) family = 'COUNTER_UP';
  else if (serveInfo.kind === 'NEUTRAL' && serveInfo.dir === 'BODY') family = 'BLOCK_BODY';
  else if (serveInfo.kind === 'NEUTRAL' && canDrive && aggr > 0.62 && serveInfo.kmh < (serveInfo.isSecond ? 166 : 155) && quality >= 0.60) family = 'DRIVE_NEUTRAL';

  // Decide aggro mode for this return
  let aggroBoost = 0;
  if (serveInfo.kind === 'EASY')    aggroBoost =  serveInfo.isSecond ? 0.18 : 0.10;
  if (serveInfo.kind === 'HARD')    aggroBoost = -0.46;
  if (serveIntent === 'OPEN')  aggroBoost -= 0.14;  // server opened court, be careful
  if (serveIntent === 'JAM')   aggroBoost += 0.08;  // jam = receiver can drive out
  aggroBoost += clamp((retSkill - 0.60) * 0.18, -0.08, 0.08);
  aggroBoost += clamp((adapt - 0.60) * 0.08, -0.04, 0.04);
  aggroBoost += clamp((recup - 0.60) * 0.07, -0.04, 0.04);
  if (serveInfo.kickPlayable) aggroBoost += clamp((retSkill - 0.66) * 0.10, 0, 0.04);
  if (family === 'DRIVE_ATTACK' || family === 'DRIVE_NEUTRAL' || family === 'COUNTER_UP') aggroBoost += 0.07;
  if (family === 'CHIP_STRETCH' || family === 'CHIP_RESET') aggroBoost -= 0.06;
  if (family === 'BLOCK_RESET' || family === 'RESET_BODY') aggroBoost -= 0.12;

  // returnAggroMode drifts toward new value over time (smoothed)
  const recoveryBlend = 0.18 + adapt * 0.10 + recup * 0.08;
  rvMc.returnAggroMode = _c01((rvMc.returnAggroMode || 0) * (1 - recoveryBlend) + _c01(0.5 + aggroBoost) * recoveryBlend);

  // Intent hint: set on ctx so EV rally system can use it on rally shot 1
  // 'neutralize' → hit deep middle to kill server's +1 angle
  // 'attack'     → drive aggressively (2nd serve / easy)
  // 'defend'     → chip back / reset (hard serve)
  const returnHint = serveInfo.kind === 'EASY'   ? 'attack'
                   : serveInfo.kind === 'HARD'   ? 'defend'
                   : serveIntent === 'OPEN' ? 'neutralize'
                   : 'neutralize';

  let returnPill = 'NEUTRAL_RETURN';
  if (family.includes('STRETCH')) returnPill = 'STRETCH_RETURN';
  else if (family.includes('CHIP')) returnPill = 'CHIP_RETURN';
  else if (family.includes('BLOCK') && serveInfo.kind === 'HARD') returnPill = 'BLOCK_RETURN';
  else if (family === 'DRIVE_ATTACK' || family === 'DRIVE_NEUTRAL') returnPill = 'DRIVE_RETURN';
  else if (family === 'COUNTER_UP') returnPill = 'COUNTER_RETURN';
  if (serveInfo.isAttackable2nd && (family === 'DRIVE_ATTACK' || family === 'DRIVE_NEUTRAL' || family === 'COUNTER_UP')) {
    returnPill = 'STEP_IN_RETURN';
  }

  rv.ctx._returnHint = returnHint;
  rv.ctx._returnPlan = {
    family,
    pill: returnPill,
    pillLabel: RETURN_PILLS_PTBR[returnPill] ?? 'NEUTRA',
    serveKind: serveInfo.kind,
    serveDir: serveInfo.dir,
    servePhysType: serveInfo.physType,
    aggression: _c01(0.5 + aggroBoost),
    stretch: serveInfo.stretch,
    jammed: serveInfo.jammed,
  };
  // Constrói servePointData a partir dos campos da bola (setados em tickServing).
  // sv._pendingServeData nunca é setado — os dados corretos vivem no objeto ball.
  const servePointData = {
    dir:      ball._serveDir      ?? serveInfo.dir,
    physType: ball._servePhysType ?? serveInfo.physType,
    kmh:      ball._serveExitKmh  ?? serveInfo.kmh,
    isFirst:  (sv.faults ?? 0) === 0,
  };
  sv.ctx._servePatternPlan = buildServeFirstBallPlan(servePointData, rv.ctx._returnPlan, sv);
  rv.ctx._returnRecoveryPlan = buildReturnRecoveryPlanV2(servePointData, rv.ctx._returnPlan, rv);

  // returnHistory
  rvMc.returnHistory = rvMc.returnHistory || [];
  rvMc.returnHistory.push({
    hint: returnHint,
    family,
    quality,
    serveDir: serveInfo.dir,
    serveType: serveInfo.physType,
    pointNum: sv?._pendingServeData?.pointNum ?? null,
  });
  if (rvMc.returnHistory.length > 6) rvMc.returnHistory.shift();
}

export function applyReturnPlanToShot(player, shot, gs) {
  if (!player || !shot || !gs) return shot;
  if (gs.rally !== 0 || player.id !== gs.receiver) return shot;
  const plan = player.ctx?._returnPlan;
  if (!plan?.family) return shot;

  const targetSignY = -player.side;
  const absTargetY = Math.abs(shot.targetY ?? 0);
  const deepNeutralY = clamp(COURT.halfL * 0.70, COURT.serviceLineY * 0.94, COURT.halfL * 0.84);
  const deepAttackY = clamp(COURT.halfL * 0.78, COURT.serviceLineY * 0.98, COURT.halfL * 0.90);
  const serveKmh = gs.ball?._serveExitKmh ?? plan.kmh ?? 180;
  const serveNum = gs.ball?._serveNumber ?? 1;
  const weakSecond = serveNum === 2 && serveKmh < 168;
  const attackableServe = weakSecond || plan.serveKind === 'EASY';

  const pinMiddle = (mid = 0.52) => {
    shot.targetX = clamp((shot.targetX ?? 0) * mid, -0.9, 0.9);
  };
  const keepBody = () => {
    shot.targetX = clamp((shot.targetX ?? 0) * 0.40, -0.55, 0.55);
  };
  const setDepth = (targetAbsY) => {
    const blend = 0.55;
    const base = absTargetY > 0 ? absTargetY : targetAbsY;
    shot.targetY = targetSignY * clamp(base * (1 - blend) + targetAbsY * blend, COURT.serviceLineY * 0.84, COURT.halfL * 0.92);
  };

  switch (plan.family) {
    case 'BLOCK_STRETCH':
    case 'BLOCK_RESET':
      shot.type = 'FLAT';
      shot.power = clamp((shot.power ?? 0) * 0.82, 26, 56);
      shot.netClearance = Math.max(shot.netClearance ?? 0.34, 0.42);
      pinMiddle(0.50);
      setDepth(deepNeutralY * 1.00);
      shot._returnQualityTax = 0.085;
      break;
    case 'BLOCK_BODY':
    case 'RESET_BODY':
      shot.type = 'FLAT';
      shot.power = clamp((shot.power ?? 0) * 0.80, 25, 54);
      shot.netClearance = Math.max(shot.netClearance ?? 0.34, 0.42);
      keepBody();
      setDepth(deepNeutralY * 1.00);
      shot._returnQualityTax = 0.035;
      break;
    case 'CHIP_STRETCH':
    case 'CHIP_RESET':
      shot.type = 'SLICE';
      shot.power = clamp((shot.power ?? 0) * 0.74, 24, 50);
      shot.netClearance = Math.max(shot.netClearance ?? 0.36, 0.50);
      pinMiddle(0.62);
      setDepth(deepNeutralY * 0.98);
      shot._returnQualityTax = 0.11;
      break;
    case 'DRIVE_ATTACK':
      shot.type = 'TOPSPIN';
      shot.power = clamp((shot.power ?? 0) * (attackableServe ? 1.08 : 0.97), 30, attackableServe ? 72 : 64);
      shot.netClearance = Math.max(shot.netClearance ?? 0.32, attackableServe ? 0.26 : 0.30);
      shot.targetX = clamp((shot.targetX ?? 0) * (attackableServe ? 1.16 : 1.06), -2.55, 2.55);
      setDepth(deepAttackY);
      shot._returnQualityTax = attackableServe ? 0.065 : 0.11;
      break;
    case 'DRIVE_NEUTRAL':
      shot.type = 'TOPSPIN';
      shot.power = clamp((shot.power ?? 0) * (attackableServe ? 0.96 : 0.88), 28, attackableServe ? 66 : 60);
      shot.netClearance = Math.max(shot.netClearance ?? 0.32, attackableServe ? 0.32 : 0.38);
      shot.targetX = clamp((shot.targetX ?? 0) * (attackableServe ? 0.98 : 0.84), -2.05, 2.05);
      setDepth((attackableServe ? deepAttackY : deepNeutralY) * 1.00);
      shot._returnQualityTax = attackableServe ? 0.045 : 0.075;
      break;
    case 'COUNTER_UP':
      shot.type = 'TOPSPIN';
      shot.power = clamp((shot.power ?? 0) * (attackableServe ? 1.00 : 0.90), 29, attackableServe ? 72 : 64);
      shot.netClearance = Math.max(shot.netClearance ?? 0.32, attackableServe ? 0.32 : 0.38);
      if (attackableServe) shot.targetX = clamp((shot.targetX ?? 0) * 1.08, -2.10, 2.10);
      else keepBody();
      setDepth((attackableServe ? deepAttackY : deepNeutralY) * 1.00);
      shot._returnQualityTax = attackableServe ? 0.025 : 0.05;
      break;
    default:
      break;
  }

  shot._returnPlanFamily = plan.family;
  shot._returnPillLabel = plan.pillLabel ?? null;
  shot._attackableServeReturn = attackableServe;

  // Consome o contexto de return imediatamente após a devolução do saque.
  // Evita que decisões/vfx de rally seguinte continuem lendo estado de return.
  if (player?.ctx) {
    player.ctx._returnRecoveryPlan = null;
    player.ctx._returnPlan = null;
    player.ctx._returnHint = null;
  }

  return shot;
}

// ── End of SERVE EV + RETURN EV ──────────────────────────────────
// ═══════════════════════════════════════════════════════════════════

export function tickPreServe(gs, dt) {
  const sv = gs.players[gs.server], rv = gs.players[gs.receiver], ball = gs.ball;
  sv.ctx._servePatternPlan = null;
  rv.ctx._returnRecoveryPlan = null;
  rv.ctx._returnPlan = null;
  rv.ctx._returnHint = null;
  const sx = gs.serveLeft ? -1.5 : 1.5;
  // Receptor posicionado ATRÁS da baseline para receber saque (+2m atrás)
  const rvBaseY = rv.side * (COURT.halfL + 2.0);
  sv.vel = v2(0, 0);
  rv.vel = v2(0, 0);
  sv.pos.x += (sx - sv.pos.x) * 0.15;
  sv.pos.y += (sv.side * (COURT.halfL + 0.5) - sv.pos.y) * 0.12;

  // ── Return Positioning EV ─────────────────────────────────────────
  // Compute position once at the start of PRE_SERVE (stateTimer ~ 0)
  // and store it; receiver drifts there during the wait.
  if (gs.stateTimer < 0.05 || !gs._rvPosTarget) {
    const rc = evPickReturnPos(rv, sv, gs);
    // Apply lateral bias: positive rxBias shifts toward T side (toward center)
    // Sign of shift depends on serveLeft (which half the serve goes to)
    const baseX = gs.serveLeft ? COURT.singlesW * 0.22 : -COURT.singlesW * 0.22;
    const biasSign = gs.serveLeft ? -1 : 1;  // T is at x≈0, so shifting toward T = inward
    gs._rvPosTarget = {
      x: baseX + biasSign * rc.rxBias,
      y: rvBaseY - rv.side * rc.ryBias,  // ryBias>0 = avança (STEP_IN); sinal negado corrige inversão
      tags: rc.tags,
    };

    // Debug log
    if (typeof window !== 'undefined' && window.EV_DEBUG) {
      console.log(`[RPOS] ${rv.name} → [${rc.tags.join('+')}] rx:${rc.rxBias.toFixed(1)} ry:${rc.ryBias.toFixed(1)} isSec:${sv.faults===1}`);
    }
  }

  const rvTargetX = clamp(gs._rvPosTarget.x, -COURT.singlesW / 2 + 0.2, COURT.singlesW / 2 - 0.2);
  const rvTargetY = clamp(gs._rvPosTarget.y, rv.side > 0 ? COURT.halfL + 0.5 : -(COURT.halfL + 4.0), rv.side > 0 ? COURT.halfL + 4.0 : -(COURT.halfL + 0.5));

  rv.pos.x += (rvTargetX - rv.pos.x) * 0.10;
  rv.pos.y += (rvTargetY - rv.pos.y) * 0.12;
  ball.pos.x = sv.pos.x; ball.pos.y = sv.pos.y; ball.pos.z = 0.8;
  if (gs.stateTimer > TIMING.preServeDelay) {
    gs._rvPosTarget = null;  // clear for next point
    gs.gameState = GameState.SERVING; gs.stateTimer = 0;
  }
}

export function tickServing(gs, dt) {
  if (gs.stateTimer <= TIMING.serveWindup) return;
  const sv    = gs.players[gs.server], ball = gs.ball, sStyle = sv.styleData;
  const isSec = sv.faults === 1;
  gs.lastServeFirst   = !isSec;
  gs.receiverTouched  = false;
  const sl = gs.serveLeft; // serve direction shorthand

  // ── Smart serve selection ──────────────────────────────────────────────────
  // 7 serve types: [0]FLAT-T [1]FLAT-WIDE [2]FLAT-BODY [3]SLICE-WIDE
  //                [4]SLICE-T [5]KICK-BODY [6]KICK-T
  // [physType, spin, logName, clrMin, clrMax, sideSpinMult]
  // FLAT clearance elevado (0.38-0.52m) para compensar imprecisão de launchBall em saques diagonais rápidos.
  // SLICE/KICK já têm trajetória mais lenta/arredondada, clearance menor é suficiente.
  const SERVE_DEFS = [
    ['FLAT',  0,  'FLAT-T',      0.38, 0.52, 0.10],  // flat: quase sem sidespin
    ['FLAT',  0,  'FLAT-WIDE',   0.40, 0.54, 0.10],
    ['FLAT',  0,  'FLAT-BODY',   0.40, 0.54, 0.10],
    ['SLICE', -1, 'SLICE-WIDE',  0.34, 0.45, 1.18],  // slice segue abrindo, mas menos automático
    ['SLICE', -1, 'SLICE-T',     0.32, 0.42, 1.08],  // T slice mais sutil e menos ace-factory
    ['KICK',  1,  'KICK-BODY',   0.52, 0.68, 0.45],  // era 0.75 → kick: sidespin suave, bounce alto
    ['KICK',  1,  'KICK-T',      0.46, 0.62, 0.45],  // era 0.75 → kick: sobe e desvia
  ];

  // ── Serve Decision EV ──────────────────────────────────────────────────────
  // Replaces the old weighted-random pick. Uses pressure/safety/reward/pattern
  // scoring + softmax to choose physType + direction. All physics unchanged.
  const rv = gs.players[gs.receiver];
  const scoreState = SR_DEPS.getPointPressureState(gs);
  const isBreakPoint = scoreState[gs.receiver]?.isBreakPoint ?? false;

  const { picked: evPick, sCtx: evSCtx, scored: evScored } =
    evPickServe(isSec, sl, sv, rv, isBreakPoint, SERVE_DEFS);
  const chosen = evPick.c.defIdx;

  const [physType, svcSpin, svcName, clrMin, clrMax, sideSpinMult] = SERVE_DEFS[chosen];

  // ── Signature Shot: BIG_SERVE — detectar se este saque é um golpe assinatura.
  // O saque vai por caminho separado (evPickServe), nunca passa pelo evChooseShot
  // nem pelo loop de boost de EV. Detectar aqui para que pushShotVFX
  // exiba o label dourado corretamente.
  const _SERVE_SIG_KEYS = new Set([
    'SERVE_FLAT_BOMB', 'SERVE_KICK_HIGH',
    'SERVE_SLICE_WIDE', 'SERVE_JAM_BODY', 'SERVE_T_LASER',
  ]);
  const isSignatureServe = !isSec &&
    !!sv.naturalSignature &&
    _SERVE_SIG_KEYS.has(sv.naturalSignature);

  // ── Power: 1º saque diferencia por tipo para dar realismo ─────────────────
  // FLAT: máxima velocidade; SLICE: moderado; KICK: mais lento mas com efeito
  // traitServeMult: CANHAO_SAQUE, PRECISAO_CIRURGICA, SEGUNDO_SAQUE_ARMA, etc.
  const svTraitFx   = SR_DEPS.getUnifiedPlayerTraitFx(sv, gs);
  const traitServeDelta = svTraitFx.serveMult - 1;
  const traitServMult = 1 + traitServeDelta * (isSec ? 0.34 : 0.46);
  const mult1 = (sv.mods ? sv.mods.serveMult1 : 1.0) * traitServMult;
  const mult2 = (sv.mods ? sv.mods.serveMult2 : 1.0) * traitServMult;
  let svcPow;
  // Serve power from attrs.saque (v3): 0–100 scale
  // saque=50 → ~55-65 m/s (198-234 km/h) flat first | saque=90 → ~65-75 m/s (234-270 km/h)
  // saqueForca: define o range de velocidade (km/h) do saque
  const _saqAttr = sv.attrs?.saqueForca ?? sv.attrs?.saque ?? 60;
  // Calibrado para velocidades ATP reais (m/s direto → km/h = m/s * 3.6)
  // saque=50→184-214km/h (1º) / 126-148km/h (2º)
  // saque=90→212-253km/h (1º) / 143-171km/h (2º) — elite tier correto
  const _srv1Min = 41 + _saqAttr * 0.20;   // saque=50→51.0  saque=90→59.0  (m/s)
  const _srv1Max = 46 + _saqAttr * 0.27;   // saque=50→59.5  saque=90→70.3  (m/s)
  const _srv2Min = 27 + _saqAttr * 0.105;
  const _srv2Max = 31 + _saqAttr * 0.135;
  if (!isSec) {
    if      (physType === 'FLAT')  svcPow = rand(_srv1Min, _srv1Max) * mult1;
    else if (physType === 'SLICE') svcPow = rand(_srv1Min * 0.77, _srv1Max * 0.79) * mult1;
    else                           svcPow = rand(_srv1Min * 0.66, _srv1Max * 0.71) * mult1;
  } else {
    const maxSec = _srv1Min * mult1 * 0.72;  // 2º saque: bem mais contido
    if      (physType === 'FLAT')  svcPow = Math.min(rand(_srv2Min, _srv2Max) * mult2, maxSec * 0.88);
    else if (physType === 'SLICE') svcPow = Math.min(rand(_srv2Min, _srv2Max) * mult2 * 0.82, maxSec * 0.94);
    else                           svcPow = Math.min(rand(_srv2Min, _srv2Max) * mult2 * 0.90, maxSec * 0.90);
  }
  // Big server bonus: saque ≥ 85 gives extra kick on 1st flat
  if (isSec) {
    svcPow *= physType === 'FLAT' ? 0.90 : physType === 'SLICE' ? 0.86 : 0.88;
    svcPow *= physType === 'FLAT' ? 0.86 : physType === 'SLICE' ? 0.82 : 0.84;
  }
  if (_saqAttr >= 85 && !isSec && physType === 'FLAT') svcPow *= 1.03 + (_saqAttr - 85) * 0.002;

  // ── Court surface serve bonus: grama/indoor favorecem sacadores; saibro penaliza ──
  // serveBonus +0.12 (Wimbledon) = 12% mais força de saque; -0.10 (RG) = 10% menos.
  const courtServeBonus = gs.courtMods?.serveBonus ?? 0;
  svcPow *= (1 + courtServeBonus);

  // svcPow já está em m/s reais (calibrado nas fórmulas _srv1Min/_srv1Max acima).
  // Não há mais SERVE_SPEED_SCALE — a divisão anterior reduzia o saque para ~144km/h.
  let svcPowFis = svcPow;

  // Hard cap ATP: recordes reais ~250km/h. BIG_SERVER saque=99 pode chegar a ~239km/h.
  // 66.4 m/s × 3.6 = 239 km/h — nível elite absoluto correto.
  const ATP_MAX_SERVE_MS = 69.4; // ≈ 250 km/h — teto extremo, mais raro
  svcPowFis = Math.min(svcPowFis, ATP_MAX_SERVE_MS);
  let svcClr = rand(clrMin, clrMax);

  // Target Y: 2º saque vai para o centro da caixa (50-62%), nunca perto da service line
  const tYfrac = isSec ? rand(0.50, 0.62) : rand(0.58, 0.70);
  let tY = -sv.side * COURT.serviceLineY * tYfrac;
  // Diagonal rule: sl=true → ball must land at x>=0; sl=false → x<=0
  let tX;
  switch (chosen) {
    case 0: tX = sl ? rand(0.10, 0.60) : rand(-0.60, -0.10); break;  // FLAT-T
    case 1: tX = sl ? rand(1.4, 2.4)  : rand(-2.4, -1.4); break;     // FLAT-WIDE
    case 2: tX = sl ? rand(0.5, 1.4)  : rand(-1.4, -0.5); break;     // FLAT-BODY
    case 3: tX = sl ? rand(1.0, 1.9)  : rand(-1.9, -1.0); break;     // SLICE-WIDE
    case 4: tX = sl ? rand(0.10, 0.7) : rand(-0.7, -0.10); break;    // SLICE-T
    case 5: tX = sl ? rand(0.4, 1.3)  : rand(-1.3, -0.4); break;     // KICK-BODY
    case 6: tX = sl ? rand(0.10, 0.6) : rand(-0.6, -0.10); break;    // KICK-T
    default: tX = 0;
  }

  // ── Probabilidade de falta (mecanismo principal de fault rate realístico) ──
  // Calibrado para ATP real: srv1Prec=90 → ~77% in; srv1Prec=78 → ~72%; srv1Prec=70 → ~68%.
  const staminaFracSv  = sv.stamina ?? 1.0;
  const fatiguePenalty = (1 - staminaFracSv) * (isSec ? 0.05 : 0.08);
  // FIX: coeff 0.05→0.20 — mentalidade importa de verdade em break points
  // mental=97 (Nakamura): bpPenalty=0.006 (quase protegido) | mental=68 (Ajuba): 0.064 (sente o peso)
  const bpPenalty      = isBreakPoint && isSec ? (1 - (sv.mods?.pressaoFactor ?? 0.70)) * 0.20 : 0;

  // v4: saque split — precisão para scatter/faultRate, força para velocidade da bola
  const precAttr = sv.attrs?.saquePrecisao ?? sv.attrs?.saque ?? 70;
  const servePrecMult = clamp(sv.mods?.servePrecisaoMult ?? 1.0, 0.85, 1.30);
  const serveScatterMult = clamp((sv.mods?.serveScatter ?? 0.75) / 0.75, 0.70, 1.30);
  const servePrecisionStability = clamp(0.90 + (servePrecMult - 1.0) * 0.90, 0.78, 1.20);
  // FIX: fórmula anterior dava ~9.8% de dupla falta para saque:92 — muito acima do real ATP (~3-5%).
  // Fórmula ajustada: base 0.04 (ATP elite mínimo) + escala 0.18 por falta de precisão.
  //   saque:92 → 5.4% | saque:85 → 6.7% | saque:70 → 9.4% | saque:50 → 13%
  // 1º saque: mantido — variabilidade alta é parte do design (serve para abrir risco/recompensa).
  const baseFaultRate = isSec
    ? clamp((0.020 + (1 - precAttr / 100) * 0.070) / servePrecisionStability, 0.012, 0.11)
    : (0.20 + (1 - precAttr / 100) * 0.34) / servePrecisionStability;
  const faultProb = clamp(baseFaultRate + fatiguePenalty + bpPenalty, 0, 0.55);
  // FASE 2.2: serveMod > 1 = mais confiante = menos faltas; < 1 = menos confiante = mais faltas
  const faultProbFinal = clamp(faultProb / (sv._formMods?.serveMod ?? 1.0), 0, 0.55);

  let isLongFault = false, isNetFault = false;
  if (Math.random() < faultProbFinal) {
    // Saque falhado: direcionar propositalmente para fora da caixa
    // 1º saque: agressivo → 60% LONG / 20% WIDE / 20% NET
    // 2º saque: conservador, mira central → menos LONG (vai curto, não longo)
    //           30% LONG / 45% WIDE / 25% NET
    const r = Math.random();
    // 1º saque batido acima dos 2m: ângulo descendente natural dificulta bater na rede.
    // Faltas reais ATP: ~75% LONG / ~16% WIDE / ~9% NET.
    // 2º saque (kick/slice mais conservador): mais chance de raspar a fita.
    const longThresh = isSec ? 0.42 : 0.76;
    const wideThresh = isSec ? 0.90 : 0.92;  // 1º: 76% LONG 16% WIDE 8% NET | 2º: 42% LONG 48% WIDE 10% NET
    const faultDir = r < longThresh ? 'LONG' : r < wideThresh ? 'WIDE' : 'NET';
    if (faultDir === 'LONG') {
      // 1º saque: tYfrac 0.58-0.70 → |tY| 3.71-4.48m → mult mínimo = 6.4/4.48 = 1.43 → usar 1.80+
      // 2º saque: tYfrac 0.50-0.62 → |tY| 3.20-3.97m → mult mínimo = 6.4/3.20 = 2.00 → usar 2.05+
      const longMult = isSec ? (2.05 + Math.random() * 0.20) : (1.80 + Math.random() * 0.20);
      tY *= longMult;
      isLongFault = true;   // pula o clamp de tY abaixo (senão clamp anula a correção)
    } else if (faultDir === 'WIDE') {
      tX = Math.sign(tX || (sl ? 1 : -1)) * (COURT.singlesW / 2 + 0.25 + Math.random() * 0.60);
    } else {
      isNetFault = true;    // vel.z será forçado negativo APÓS launchBall (netClearance é ignorado)
    }
    // Track fault for serve EV pattern memory
    if (sv.ctx.matchCtx) {
      sv.ctx.matchCtx.recentFaults = Math.min(4, (sv.ctx.matchCtx.recentFaults || 0) + 1);
      if (!isSec) sv.ctx.matchCtx.serve1InStreak = 0;
    }
  }

  // ── ATP Shot Engine — Serve Strike Quality (serveSQ) ─────────────────────
  // Serve não tem Contact Space (não reage à bola), mas tem qualidade de execução
  // baseada em atributo saque + fadiga. Este SQ alimenta computeSigmaX e getAtpSpinMultipliers,
  // alinhando o saque com a mesma física dos groundstrokes.
  //
  // precAttr=92 (elite) → serveSQ≈0.88 (1º) / 0.80 (2º)
  // precAttr=70 (médio) → serveSQ≈0.72 (1º) / 0.64 (2º)
  // precAttr=50 (fraco) → serveSQ≈0.62 (1º) / 0.54 (2º)
  const staminaFracSq = sv.stamina ?? 1.0;
  const fatigueSqMod  = 0.88 + staminaFracSq * 0.12; // stamina=1.0→1.00 | stamina=0.5→0.94 | stamina=0→0.88
  const secPenalty    = isSec ? 0.08 : 0.0;           // 2º saque conservador = menos qualidade de execução
  const serveSQMult   = clamp(0.92 + (servePrecMult - 1.0) * 0.55, 0.84, 1.14);
  const serveSQ       = clamp((0.50 + precAttr / 100 * 0.45) * fatigueSqMod * serveSQMult - secPenalty - (isSec ? 0.075 : 0), 0.35, 0.95);

  // ── Dispersão gaussiana de trajetória — agora via computeSigmaX ───────────
  // Substitui o gaussian manual (sigma = sigmaBase × (1-precFrac) × 0.5).
  // computeSigmaX usa a mesma calibração ATP dos groundstrokes:
  //   FLAT serve  → FLAT  σXMax=0.80 (saque plano, alta velocidade, menos margem)
  //   KICK serve  → TOPSPIN σXMax=0.55 (spin Magnus dá margem extra)
  //   SLICE serve → SLICE  σXMax=0.45 (mais controlado lateralmente)
  // Mapeamento de physType → shotType equivalente para σ
  const serveToShotType = { FLAT: 'FLAT', KICK: 'TOPSPIN', SLICE: 'SLICE' };
  const serveSigmaType  = serveToShotType[physType] ?? 'FLAT';
  const SERVE_HALF_S    = COURT.singlesW / 2;

  // σX ATP calibrado: precisão controla o alvo, mas saque forte paga risco lateral real.
  const _saqForcaAttr = sv.attrs?.saqueForca ?? sv.attrs?.saque ?? 60;
  let serveSigmaX = computeSigmaX(
    serveSigmaType, serveSQ, tX, SERVE_HALF_S,
    precAttr,   // saque attr faz papel de controle (precisão = controle para saques)
    _saqForcaAttr,
    'FULL',     // serve sempre é swing completo
    sv.pos.x
  ) * serveScatterMult;

  if (physType === 'SLICE') serveSigmaX *= 1.22;
  if (isSec) serveSigmaX *= 1.10;

  // Box-Muller para aplicar σX no scatter
  const gaussRand = (sigma) => {
    const u1 = Math.max(1e-9, Math.random()), u2 = Math.random();
    return sigma * Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  };
  // σX → X scatter direto. Y scatter usa 65% do X (profundidade tem menos variância que lateral)
  tX += gaussRand(serveSigmaX);
  tY += gaussRand(serveSigmaX * 0.58);

  // 2º saque: alvo mais central e seguro
  if (isSec) {
    tX *= 0.76;
    tY *= 0.92;
  }

  // Clamp tX à metade diagonal correta com margem de segurança de 0.50m da sideline
  // [PATCH] Exceto WIDE faults: já foram colocados além da sideline, não clampar
  const sideLimit = COURT.singlesW / 2 - 0.50;
  const minX = sl ? 0.0 : -sideLimit;
  const maxX = sl ? sideLimit : 0.0;
  const isWideFault = Math.abs(tX) > COURT.singlesW / 2;   // detecta se foi wide fault
  if (!isWideFault) tX = Math.max(minX, Math.min(maxX, tX));

  // Clamp tY dentro da caixa de serviço (0→serviceLineY na metade do receptor)
  // Limitar a 95% da service line para evitar que saques longos se tornem DFs triviais
  // EXCEÇÃO: isLongFault — tY já foi empurrado além da service line propositalmente, não clampar
  const minAbsY = COURT.serviceLineY * 0.20;   // mínimo: 20% da caixa — evita alvos impossíveis raspando a rede
  const maxAbsY = COURT.serviceLineY * 0.96;   // máximo: 96% (margem antes da service line)
  const tYsign = Math.sign(tY) || -sv.side;
  if (!isLongFault) tY = tYsign * Math.max(minAbsY, Math.min(maxAbsY, Math.abs(tY)));

  if (!isSec) sv.stats.serve1Total++; else sv.stats.serve2Total++;

  // ── Determine display target name ──────────────────────────────────────────
  const absX = Math.abs(tX);
  let tgtName;
  if   (absX < 0.8) tgtName = 'T';
  else if (absX < 1.6) tgtName = 'BODY';
  else tgtName = 'WIDE';

  // ── Launch ─────────────────────────────────────────────────────────────────
  ball.pos.x = sv.pos.x; ball.pos.y = sv.pos.y;
  // Altura de contato dinâmica: jogadores com saque mais forte/alto atingem maior ponto de contato.
  // Saque lançado de um ponto um pouco mais alto para aumentar a janela de passagem
  // sobre a rede sem distorcer o solver nem alongar artificialmente a trajetória.
  // saqAttr=50 → 2.66m | saqAttr=70 → 2.80m | saqAttr=90 → 2.94m
  // 2º saque: -0.03m para continuar conservador sem cair demais na saída.
  const hitHeightSrv = clamp(2.66 + (_saqAttr - 50) * 0.007, 2.60, 3.00) - (isSec ? 0.01 : 0);
  // No saque, a rede não pode virar o gargalo principal. Em vez de exigir a
  // clearance inteira do preset (que exagera o arco), pedimos só uma fração
  // moderada acima da fita. Isso preserva a ideia do tipo de saque sem jogar
  // o quique para fora da caixa.
  const serveNetMinZ = COURT.netHeight + clamp(0.05 + svcClr * (isSec ? 0.14 : 0.12), 0.08, isSec ? 0.14 : 0.12);
  const serveFlightOptions = { flightProfile: { netMinZ: serveNetMinZ } };
  ball._serveNumber = isSec ? 2 : 1;
  launchBall(ball, { x: sv.pos.x, y: sv.pos.y }, tX, tY, svcSpin, svcPowFis, svcClr, hitHeightSrv, null, null, serveFlightOptions);
  ball._serveNetTouched = false;
  ball._lipNet = false;

  // NET fault: vel.z forçado negativo para garantir que a bola bate na rede.
  // Isso é INDEPENDENTE do solver — é a falta proposital via faultProb.
  if (isNetFault) {
    ball.vel.z = -(Math.abs(ball.vel.z) + 1.5 + Math.random() * 1.0);
  }

  // Captura velocidade de saída da raquete (medição realista como radar ATP)
  // launchBall já definiu ball.vel — mag3 aqui é a velocidade no instante do contato
  ball._serveExitKmh = Math.round(mag3(ball.vel) * 3.6);

  // Registra qualidade estimada do saque no servidor para o mecanismo de carryover.
  // O receiver vai usar sv._lastQuality para calcular a penalidade de momentum.
  // Fórmula: 1º saque ~180-230km/h → Q 0.65-0.90 | 2º saque ~130-160km/h → Q 0.45-0.65
  sv._lastQuality = isSec
    ? clamp(0.30 + (ball._serveExitKmh - 112) / 360, 0.30, 0.66)
    : clamp(0.37 + (ball._serveExitKmh - 112) / 290, 0.37, 0.90);

  const sm = svcPowFis * 0.6;
  // ── Spin por família de saque — Fase ATP ──────────────────────────────────
  // getAtpSpinMultipliers usa o atributo topspin/slice do servidor para escalar o RPM real.
  // Antes: multiplicadores fixos independentes do jogador.
  // Agora: jogador com topspin=85 produz kick com quique ~25% mais alto que topspin=50.
  //
  // Mapeamento: KICK usa topspinMult (topspin attribute → kick bounce height)
  //             SLICE usa sliceMult (slice attribute → serve slice lateral)
  //             FLAT: spin mínimo (não muda — FLAT serve não tem efeito relevante)
  const serveSpinMults = getAtpSpinMultipliers(
    physType === 'KICK' ? 'HEAVY_TOP' : physType === 'SLICE' ? 'SLICE' : 'FLAT',
    sv.attrs,
    sv.mods,
    serveSQ
  );
  const { topspinMult: serveTopMult, sliceMult: serveSlcMult } = serveSpinMults;

  if (physType === 'KICK') {
    // FIX P3.3: sidespin do KICK com variância gaussiana — cada kick é ligeiramente diferente,
    // tornando mais difícil para o receptor prever a direção exata do desvio lateral.
    const kickSideVariance = (Math.random() + Math.random() - 1.0) * 0.12;
    ball.spin.x = -sm * 2.8 * serveTopMult * Math.sign(ball.vel.y);  // ATP: topspinMult amplifica quique
    ball.spin.z = sm * (sideSpinMult + kickSideVariance) * (sl ? 1 : -1);
  } else if (physType === 'SLICE') {
    ball.spin.x =  sm * 0.6  * serveSlcMult * Math.sign(ball.vel.y); // ATP: sliceMult amplifica corte lateral
    ball.spin.z = sm * sideSpinMult * (sl ? 1 : -1);
  } else {
    ball.spin.x = -sm * 0.15 * Math.sign(ball.vel.y);                // FLAT: spin mínimo (inalterado)
    ball.spin.z = 0;
  }

  // Guarda alvo para log de delta no 1º quique (validação do solver)
  ball._serveTargetY = tY;
  ball._servePhysType = physType;
  ball._serveDir      = tgtName;   // 'T' | 'BODY' | 'WIDE' — usado para ajuste de ace
  gs.log.push(`🎾 [${sStyle.abbr}] ${isSec?'2º':'1º'} SAQUE ${svcName} · ${ball._serveExitKmh}km/h → ${tgtName}`);
  ball.lastHitBy = gs.server; sv.shotCount++;

  // ── Registrar dados do saque para resolvePoint ────────────────────────────
  gs._pendingServeData = {
    isFirst:  !isSec,
    kmh:      ball._serveExitKmh,
    physType: physType,
    dir:      tgtName,
    serveLeft: sl,
    pointNum: gs.totalPoints + 1,
  };

  // ── Match context: record serve direction for serve+1 tactic ──
  if (sv.ctx.matchCtx) {
    const absXServe = Math.abs(tX);
    if   (absXServe < 0.8) sv.ctx.matchCtx.serveDir = 'BODY';
    else if (sl)           sv.ctx.matchCtx.serveDir = 'RIGHT';
    else                   sv.ctx.matchCtx.serveDir = 'LEFT';
    sv.ctx.matchCtx.serveN = (sv.ctx.matchCtx.serveN || 0) + 1;

    // ── EV: record serve intent and history ────────────────────────
    const intent = deriveServeIntent(evPick.c);
    sv.ctx.matchCtx.serveIntent  = intent;
    sv.ctx.matchCtx.servePhys    = physType;
    // push to circular history (will be updated with outcome later)
    pushServeHistory(sv.ctx.matchCtx, {
      dir:      evPick.c.dir,
      physType: physType,
      isSec:    isSec,
      serveLeft: sl,
      pointNum: gs.totalPoints + 1,
      outcome:  'IN',  // optimistic; fault resolution will not update this easily
    });
    // update serve1InStreak
    if (!isSec) sv.ctx.matchCtx.serve1InStreak = (sv.ctx.matchCtx.serve1InStreak || 0) + 1;
    sv.ctx.matchCtx.recentFaults = 0;  // reset on successful serve

    // ── EV Debug log ───────────────────────────────────────────────
    if (typeof window !== 'undefined' && window.EV_DEBUG) {
      const top2 = [...evScored].sort((a,b)=>b.EV-a.EV).slice(0,2);
      console.log(`[SV-EV] ${sv.name} ${isSec?'2nd':'1st'} | recv:[x:${_f2(rv.pos.x)} ${evSCtx.rvIsWide?'WIDE':evSCtx.rvIsInside?'IN':'MID'}] | intent:${intent}`);
      top2.forEach((s,i)=>{ const ch=s===evPick?'★':` ${i+1}`; console.log(`  ${ch} ${SERVE_DEFS[s.c.defIdx][2].padEnd(12)} dir:${s.c.dir.padEnd(5)} EV:${s.EV.toFixed(3)} [P:${s.sub.pressure.toFixed(2)} R:${s.sub.reward.toFixed(2)} S:${s.sub.safety.toFixed(2)} V:${s.sub.pattern.toFixed(2)}]`); });
    }
  }

  // ── Tech log ───────────────────────────────────────────────────────────────
  SR_DEPS.pushTech(gs,
    `[SQ] ${isSec?'2º':'1º'} SAQUE │ ${sv.name} │ ${svcName} │ ${ball._serveExitKmh}km/h │ alvo:${tgtName} │ intent:${sv.ctx.matchCtx.serveIntent||'?'} │ falta:${sv.faults} │ serveSQ:${serveSQ.toFixed(2)} │ σX:${serveSigmaX.toFixed(3)}m\n` +
    `     servidor  pos(x=${_f2(sv.pos.x)}, y=${_f2(sv.pos.y)})\n` +
    `     receptor  pos(x=${_f2(rv.pos.x)}, y=${_f2(rv.pos.y)}) [${evSCtx.rvIsWide?'WIDE':evSCtx.rvIsInside?'INSIDE':'MID'}]\n` +
    `     alvo      pos(x=${_f2(tX)}, y=${_f2(tY)})  clr:${_f2(svcClr)}m\n` +
    `     bola vel  (x=${_f2(ball.vel.x)}, y=${_f2(ball.vel.y)}, z=${_f2(ball.vel.z)})\n` +
    `     bola spin (x=${_f1(ball.spin.x)}, z=${_f1(ball.spin.z)})`
  );

  playSound('HIT', { speed: Math.round(Math.sqrt(ball.vel.x**2+ball.vel.y**2+ball.vel.z**2)*3.6) });
  pushShotVFX(gs, sv, svcName, isSec ? 0.55 : 0.92, false, isSignatureServe);
  // Serve-and-volley removido — arquétipo SRV_VOL não está mais ativo no jogo.
  // Subida à rede acontece apenas via lógica de approach durante o rally (game.js ~2036).
  gs.gameState = GameState.RALLY; gs.stateTimer = 0; gs.serveBounced = false; gs.isFirstBounce = true;
}
