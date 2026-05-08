/**
 * FastSimulation.js  v2
 * ─────────────────────────────────────────────────────────────────
 * Motor de simulação RÁPIDA — sem physics, sem AI, sem ticks.
 * v2: muito mais rebuscado que a v1, mas ainda ~500-1000x mais
 * rápido que o Headless.
 *
 * Simula separadamente:
 *   • Saque e retorno (primeiro saque / segundo saque / dupla falta / ace)
 *   • Rallies com comprimento por estilo (baseliner vs serve-volley)
 *   • Games ponto-a-ponto com deuce/advantage real
 *   • Tiebreak ponto-a-ponto com troca de saque alternada
 *   • Momentum intra-set (break afeta pressão dos games seguintes)
 *   • Fadiga acumulada set a set (stamina + recovery)
 *   • Variância de "dia de jogo" por mentalidade
 *   • Forma (formPoints) aplicada nos atributos
 *   • Stats básicas: aces, DFs, winners, errors, 1ºSrv%, tiebreaksWon
 */

import { overallRating, migrateAttrsToV3 } from './players.js';
import { matchDayVarV3 } from './players.js';
import { getTraitStrengthMods, migratePlayerDNA, collectTraitContexts } from './TraitSystem.js';
import { applyFormModifier } from './formas.jsx';
import { heatScoreToTier } from './MatchHeat.js';

// ═══════════════════════════════════════════════════════════════════
// RNG
// ═══════════════════════════════════════════════════════════════════

const rnd      = () => Math.random();
const rndN     = (lo, hi) => lo + rnd() * (hi - lo);
function randn(mean, sd) {
  let u = 0, v = 0;
  while (!u) u = rnd();
  while (!v) v = rnd();
  return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
function sig(x, k = 1) { return 1 / (1 + Math.exp(-k * x)); }

// ═══════════════════════════════════════════════════════════════════
// PESOS DE SUPERFÍCIE
// ═══════════════════════════════════════════════════════════════════

const SURFACE_WEIGHTS = {
  CLAY: {
    saque: -0.05, devolucao: 0.15,
    topspin: 0.55, resistencia: 0.45, agressividade: -0.05,
    controle: 0.38, regularidade: 0.25,
    potencia: 0.20,
    velocidade: 0.18, mentalidade: 0.15,
    slice: 0.14, jogoDeRede: -0.10,
    _styleMult: { CTR_PUNCHER: 0.07, RETRIEVER: 0.05, AGG_BASELINER: 0.02,
                  SRV_VOL: -0.06, BIG_SERVER: -0.07 },
    _serveImportance: 0.28,
    _rallyMean: 4.5, _rallySd: 3.2,
  },
  GRASS: {
    saque: 0.65, jogoDeRede: 0.50,
    explosividade: 0.35, leitura: 0.22,
    mentalidade: 0.18, velocidade: 0.12,
    topspin: -0.10, resistencia: -0.06,
    _styleMult: { SRV_VOL: 0.09, BIG_SERVER: 0.07, ALL_COURT: 0.02,
                  CTR_PUNCHER: -0.05, RETRIEVER: -0.04 },
    _serveImportance: 0.58,
    _rallyMean: 2.8, _rallySd: 1.8,
  },
  HARD: {
    potencia: 0.32, controle: 0.30,
    saque: 0.28, velocidade: 0.22,
    mentalidade: 0.22, explosividade: 0.18,
    agressividade: 0.18, leitura: 0.18,
    _styleMult: { AGG_BASELINER: 0.04, ALL_COURT: 0.03,
                  TAKEALLRISK: 0.02, RETRIEVER: -0.02 },
    _serveImportance: 0.42,
    _rallyMean: 3.5, _rallySd: 2.5,
  },
  INDOOR: {
    saque: 0.52, potencia: 0.35,
    controle: 0.24, mentalidade: 0.24,
    agressividade: 0.22, jogoDeRede: 0.18,
    _styleMult: { BIG_SERVER: 0.08, SRV_VOL: 0.07, AGG_BASELINER: 0.02,
                  CTR_PUNCHER: -0.03, RETRIEVER: -0.05 },
    _serveImportance: 0.52,
    _rallyMean: 3.0, _rallySd: 2.0,
  },
};

const COURT_TO_SURFACE = {
  ROLAND_GARROS: 'CLAY', WIMBLEDON: 'GRASS',
  US_OPEN: 'HARD', O2_ARENA: 'INDOOR', INDOOR_MASTERS: 'INDOOR',
  AUSTRALIAN_OPEN: 'HARD',
  CLAY: 'CLAY', GRASS: 'GRASS', HARD: 'HARD', INDOOR: 'INDOOR',
};

export function courtKeyToSurface(courtKey) {
  return COURT_TO_SURFACE[courtKey] ?? 'HARD';
}

// ═══════════════════════════════════════════════════════════════════
// PERFIL DO JOGADOR
// ═══════════════════════════════════════════════════════════════════

function buildProfile(player, surface, traitContexts) {
  const rawAttrs = player.attrs || {};
  // Auto-migra attrs antigos se necessário
  const attrs = (rawAttrs.fhPotencia !== undefined || rawAttrs.srv1Vel !== undefined)
    ? migrateAttrsToV3(rawAttrs)
    : rawAttrs;

  const sw    = SURFACE_WEIGHTS[surface] || SURFACE_WEIGHTS.HARD;
  const ovr   = overallRating(attrs);

  // Aplica forma
  const fp = player.formPoints ?? 0;
  const ea = fp !== 0 ? applyFormModifier(attrs, fp) : attrs;

  // Score de força por superfície
  let attrBonus = 0, totalW = 0;
  for (const [attr, w] of Object.entries(sw)) {
    if (attr.startsWith('_')) continue;
    const val = ea[attr] ?? 60;
    attrBonus += (val - 60) * w;
    totalW    += Math.abs(w);
  }
  if (totalW > 0) attrBonus = attrBonus / totalW * 5.5;
  const styleBonus = (sw._styleMult?.[player.styleId] ?? 0) * ovr;

  if (!player.dna && player.potential) migratePlayerDNA(player);
  const { selfBonus: traitBonus } = getTraitStrengthMods(player, surface, traitContexts);

  const strength = ovr + attrBonus + styleBonus + traitBonus;

  const n = (k, d = 60) => clamp((ea[k] ?? d) / 100, 0, 1);

  const style = player.styleId ?? 'AGG_BASELINER';

  const NET_FREQ = {
    SRV_VOL: 0.30, ALL_COURT: 0.18, AGG_BASELINER: 0.08,
    CTR_PUNCHER: 0.05, BIG_SERVER: 0.12, RETRIEVER: 0.04, TAKEALLRISK: 0.10,
  };
  const RALLY_MULT = {
    CTR_PUNCHER: 1.35, RETRIEVER: 1.40, AGG_BASELINER: 0.95,
    TAKEALLRISK: 0.80, BIG_SERVER: 0.85, SRV_VOL: 0.80, ALL_COURT: 1.00,
  };

  return {
    id: player.id, name: player.name, style, strength,
    // Saque (unificado)
    srv1Power: n('saque'), srv1Prec: n('saque'),
    srv2Power: n('saque', 55), srv2Prec: n('saque', 55),
    serveAggr: n('agressividade', 58),
    // Retorno
    returnPow: n('potencia', 60), returnPos: n('leitura', 62),
    returnSkill: n('devolucao', 62),
    reflexo: n('jogoDeRede', 58), // reflexo derivado de jogoDeRede
    // Rally
    consistency: n('controle'), fhPow: n('potencia'), bhPow: n('potencia'),
    topspin: n('topspin', 58), slice: n('slice', 55),
    patience: n('agressividade', 60), // paciência = inverso de agressividade no rally
    movement: n('velocidade'),
    agility: n('explosividade', 58), stamina0: n('resistencia'),
    recovery: n('mentalidade', 60), mental: n('mentalidade'),
    aggression: n('agressividade', 58), reading: n('leitura', 58),
    regularidade: n('regularidade', 70), // nova: variância pessoal
    // Rede
    volley: n('jogoDeRede', 55), netInstinct: n('jogoDeRede', 50), smash: n('jogoDeRede', 55),
    // Comportamental
    netFreq: NET_FREQ[style] ?? 0.07,
    rallyMult: RALLY_MULT[style] ?? 1.00,
    // Stats
    stats: {
      aces: 0, doubleFaults: 0,
      serve1In: 0, serve1Total: 0,
      serve2In: 0, serve2Total: 0,
      serve1Won: 0, serve2Won: 0,
      winners: 0, unforcedErrors: 0, forcedErrors: 0,
      rallyLengths: [],
      gamesServed: 0, gamesHeld: 0,
      gamesReturned: 0, gamesConverted: 0,
      tiebreaksWon: 0,
    },
  };
}

// ═══════════════════════════════════════════════════════════════════
// QUALIDADE DE RALLY
// ═══════════════════════════════════════════════════════════════════

function rallyQuality(p, surface, fatigue, momentum) {
  let q = 0.50
    + (p.consistency - 0.60) * 0.35   // controle: mais impacto que antes
    + (p.fhPow       - 0.60) * 0.20
    + (p.bhPow       - 0.60) * 0.16
    + (p.movement    - 0.60) * 0.16
    + (p.agility     - 0.60) * 0.10
    + (p.reading     - 0.60) * 0.12;

  if (surface === 'CLAY')   q += (p.topspin    - 0.58) * 0.22 + (1 - p.aggression) * 0.06; // paciência
  if (surface === 'GRASS')  q += (p.volley     - 0.55) * 0.16 + (p.reflexo  - 0.58) * 0.12
                                + (p.slice      - 0.55) * 0.14; // slice é arma real em grama
  if (surface === 'INDOOR') q += (p.aggression - 0.58) * 0.14;

  // regularidade afeta variância intra-match do rally quality
  const regVariance = (1 - (p.regularidade ?? 0.70)) * 0.04;
  const regNoise = (Math.random() - 0.5) * regVariance * 2;
  q += regNoise;

  q -= fatigue * 0.16;
  q += momentum * 0.05;

  return clamp(q, 0.05, 0.95);
}

// ═══════════════════════════════════════════════════════════════════
// SIMULAÇÃO DE PONTO
// ═══════════════════════════════════════════════════════════════════

function simulatePoint(srv, ret, surface, opts) {
  const { fatigue = 0, momentum = 0, isFirstSrv = true, pressure = 0 } = opts;
  const sw = SURFACE_WEIGHTS[surface] || SURFACE_WEIGHTS.HARD;
  const si = sw._serveImportance ?? 0.42;

  const fatPen = fatigue * 0.12;
  const srvSpd = (isFirstSrv ? srv.srv1Power : srv.srv2Power) - fatPen * 0.6;
  const srvPrc = (isFirstSrv ? srv.srv1Prec  : srv.srv2Prec)  - fatPen * 0.4;
  const retRef = ret.reflexo    - fatPen * 0.5;
  const retPos = ret.returnPos  - fatPen * 0.3;
  // devolucaoSaque: amortece a penalidade de saque rápido no FastSim
  // retSkill=0.50→factor=0.72 (saque rápido dói muito); retSkill=0.90→factor=0.92 (absorve melhor)
  const retSkill = (ret.returnSkill ?? 0.62);
  const retReturnFactor = 0.70 + retSkill * 0.25;  // 0.70..0.93

  srv.stats[isFirstSrv ? 'serve1Total' : 'serve2Total']++;

  // ── Entra ou não? ──
  const inProb = isFirstSrv
    ? 0.60 + srvPrc * 0.22
    : 0.82 + srv.srv2Prec * 0.12;

  if (rnd() > inProb) {
    if (!isFirstSrv) {
      srv.stats.doubleFaults++;
      return { serverWins: false, isDF: true, isFault: false, rallyLen: 0 };
    }
    return { serverWins: false, isDF: false, isFault: true, rallyLen: 0 };
  }

  srv.stats[isFirstSrv ? 'serve1In' : 'serve2In']++;

  // ── Ace ──
  // Cap reduzido 0.25→0.14: no FastSim o aceProb já derivava de srvSpd normalizado
  // mas o cap alto permitia aces em ~25% dos saques que entravam.
  // ATP real: top servers têm ~15-20% de aces/1ºSrv, média ~8-10%.
  // Com cap=0.14 e baseProb ~0.04 para srv médio: 4-14% é o range real.
  const aceProb = clamp(
    (srvSpd - 0.50) * 0.22 * si * (2.0 - retReturnFactor)  // devolucaoSaque alta → menos aces
    + (isFirstSrv ? 0.018 : 0)
    - retRef * 0.16
    + momentum * 0.015,
    0, 0.14
  );
  if (rnd() < aceProb) {
    srv.stats.aces++;
    srv.stats[isFirstSrv ? 'serve1Won' : 'serve2Won']++;
    return { serverWins: true, isAce: true, isFault: false, isDF: false, isWinner: true, rallyLen: 1 };
  }

  // ── Retorno fraco / winner direto ──
  const weakRetProb = clamp(
    (srvSpd * 0.20 + srvPrc * 0.12) * si * (2.0 - retReturnFactor)  // devolucaoSaque alta → menos returns fracos
    - (retPos + retRef) * 0.10
    + (isFirstSrv ? 0.01 : -0.02),
    0, 0.20
  );
  if (rnd() < weakRetProb) {
    srv.stats[isFirstSrv ? 'serve1Won' : 'serve2Won']++;
    srv.stats.winners++;
    return { serverWins: true, isFault: false, isDF: false, isWinner: true, rallyLen: 2 };
  }

  // ── Rally ──
  const rm = (srv.rallyMult + ret.rallyMult) / 2;
  const rawLen = Math.max(2, randn(sw._rallyMean * rm, sw._rallySd));
  const rallyLen = Math.round(clamp(rawLen, 1, 50));
  srv.stats.rallyLengths.push(rallyLen);
  ret.stats.rallyLengths.push(rallyLen);

  const sqS = rallyQuality(srv, surface, fatigue,  momentum);
  const sqR = rallyQuality(ret, surface, fatigue, -momentum);

  const pressurePen  = pressure * (0.04 - srv.mental * 0.02);
  const pressureGain = pressure * (0.02 + ret.mental * 0.01);
  const aggBonus = rallyLen > 5
    ? (srv.aggression - ret.aggression) * 0.06
    : 0;
  const netBonus = rnd() < srv.netFreq * (1 - fatigue * 0.4)
    ? srv.volley * 0.15 - ret.returnPow * 0.05
    : 0;

  let sWin = 0.50
    + (sqS - sqR) * 0.45
    - pressurePen + pressureGain
    + aggBonus + netBonus
    + momentum * 0.04;

  sWin = clamp(sWin, 0.12, 0.88);

  const serverWins = rnd() < sWin;
  const isWinner   = serverWins  && rallyLen <= 4 && rnd() < 0.35 * srv.aggression;
  const isError    = !serverWins && rallyLen <= 3 && rnd() < 0.40;

  if (serverWins) {
    srv.stats[isFirstSrv ? 'serve1Won' : 'serve2Won']++;
    if (isWinner) srv.stats.winners++;
  } else {
    if (isError) srv.stats.unforcedErrors++;
    else         ret.stats.forcedErrors++;
  }

  return { serverWins, isFault: false, isDF: false, isWinner, rallyLen };
}

// ═══════════════════════════════════════════════════════════════════
// SIMULAÇÃO DE GAME (ponto-a-ponto com deuce/Ad)
// ═══════════════════════════════════════════════════════════════════

function simulateGame(srv, ret, surface, opts) {
  const { fatigue = 0, momentum = 0, pressure = 0 } = opts;
  let sS = 0, rS = 0; // score 0=0, 1=15, 2=30, 3=40
  let pts = 0;

  srv.stats.gamesServed++;
  srv.stats.gamesReturned = (srv.stats.gamesReturned ?? 0);
  ret.stats.gamesReturned = (ret.stats.gamesReturned ?? 0) + 1;

  const pt = (first) => {
    const res = simulatePoint(srv, ret, surface, { fatigue, momentum, isFirstSrv: first, pressure });
    pts++;
    if (res.isFault) {
      const r2 = simulatePoint(srv, ret, surface, { fatigue, momentum, isFirstSrv: false, pressure });
      pts++;
      return r2.isDF ? false : r2.serverWins;
    }
    return res.serverWins;
  };

  while (true) {
    const sw = pt(true);
    if (sw) sS++;
    else    rS++;

    // Deuce / Ad
    if (sS === 3 && rS === 3) {
      // Resolver deuce em loop
      while (true) {
        const adWin = pt(true);
        pts++;
        if (adWin) {
          // Ad servidor — mais um
          const finish = pt(true);
          pts++;
          if (finish) { srv.stats.gamesHeld++; return { serverWon: true, pointsPlayed: pts }; }
          // Volta ao deuce
        } else {
          // Ad returner — mais um
          const finish2 = pt(true);
          pts++;
          if (!finish2) { ret.stats.gamesConverted++; return { serverWon: false, pointsPlayed: pts }; }
        }
      }
    }

    // Vitória normal
    if (sS >= 4 && sS > rS) { srv.stats.gamesHeld++; return { serverWon: true, pointsPlayed: pts }; }
    if (rS >= 4 && rS > sS) { ret.stats.gamesConverted++; return { serverWon: false, pointsPlayed: pts }; }
  }
}

// ═══════════════════════════════════════════════════════════════════
// TIEBREAK (ponto-a-ponto)
// ═══════════════════════════════════════════════════════════════════

function simulateTiebreak(pA, pB, surface, fatigue) {
  let ptA = 0, ptB = 0, played = 0;
  let curSrv = 0; // 0=A, 1=B

  while (true) {
    const srv = curSrv === 0 ? pA : pB;
    const ret = curSrv === 0 ? pB : pA;
    const maxPts = Math.max(ptA, ptB);
    const pressure = maxPts >= 5 ? 0.4 + (maxPts - 5) * 0.15 : 0;

    const res = simulatePoint(srv, ret, surface, { fatigue, momentum: 0, isFirstSrv: true, pressure });
    let srvWon = res.serverWins;
    if (res.isFault) {
      const r2 = simulatePoint(srv, ret, surface, { fatigue, momentum: 0, isFirstSrv: false, pressure });
      srvWon = r2.isDF ? false : r2.serverWins;
    }

    if (curSrv === 0) { if (srvWon) ptA++; else ptB++; }
    else              { if (srvWon) ptB++; else ptA++; }
    played++;

    if (ptA >= 7 && ptA - ptB >= 2) { pA.stats.tiebreaksWon++; return { winnerIsA: true,  score: [ptA, ptB] }; }
    if (ptB >= 7 && ptB - ptA >= 2) { pB.stats.tiebreaksWon++; return { winnerIsA: false, score: [ptA, ptB] }; }

    // Troca de saque: a cada 2 pontos (1º muda depois de 1 ponto)
    if (played === 1 || played % 2 === 1) curSrv = 1 - curSrv;
  }
}

// ═══════════════════════════════════════════════════════════════════
// SIMULAÇÃO DE SET
// ═══════════════════════════════════════════════════════════════════

function simulateSet(profA, profB, surface, opts) {
  let gA = 0, gB = 0, totalPts = 0;
  let srvA = opts.serverIsA ?? (rnd() < 0.5);
  const { fatigue = [0, 0], momentum = 0 } = opts;
  let mmt = clamp(momentum, -0.30, 0.30);

  while (true) {
    const srv = srvA ? profA : profB;
    const ret = srvA ? profB : profA;
    const fat = srvA ? fatigue[0] : fatigue[1];
    const gMax = Math.max(gA, gB);
    const pressure = gMax >= 5 ? 0.2 + (gMax - 5) * 0.12 : 0;

    const { serverWon, pointsPlayed } = simulateGame(srv, ret, surface, {
      fatigue: fat,
      momentum: srvA ? mmt : -mmt,
      pressure,
    });
    totalPts += pointsPlayed;

    if (serverWon) {
      if (srvA) { gA++; mmt = clamp(mmt + 0.06, -0.3, 0.3); }
      else       { gB++; mmt = clamp(mmt - 0.06, -0.3, 0.3); }
    } else {
      if (srvA) { gB++; mmt = clamp(mmt - 0.10, -0.3, 0.3); }
      else       { gA++; mmt = clamp(mmt + 0.10, -0.3, 0.3); }
    }

    srvA = !srvA;

    if (gA >= 6 && gA - gB >= 2) return { gamesA: gA, gamesB: gB, totalPts };
    if (gB >= 6 && gB - gA >= 2) return { gamesA: gA, gamesB: gB, totalPts };

    if (gA === 6 && gB === 6) {
      const avgFat = (fatigue[0] + fatigue[1]) / 2;
      const tb = simulateTiebreak(profA, profB, surface, avgFat);
      if (tb.winnerIsA) { gA = 7; } else { gB = 7; }
      return { gamesA: gA, gamesB: gB, totalPts, tbScore: tb.score };
    }
  }
}

// ═══════════════════════════════════════════════════════════════════
// VARIÂNCIA E FADIGA
// ═══════════════════════════════════════════════════════════════════

function matchDayVar(mental) {
  // DEPRECATED: mantido para compatibilidade, usa regularidade se disponível
  // A nova versão é matchDayVarV3(regularidade) em attributes.js
  return matchDayVarV3(mental * 100);  // mental é 0-1, regularidade é 0-100
}

function updateFatigue(fat, prof, setLen) {
  const gain = (setLen / 60) * (0.06 - prof.stamina0 * 0.04);
  const rec  = prof.recovery * 0.015;
  return clamp(fat + gain - rec, 0, 0.45);
}

// ═══════════════════════════════════════════════════════════════════
// FUNÇÃO PRINCIPAL
// ═══════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════
// HEAT APROXIMADO PARA FAST SIMULATION
// ═══════════════════════════════════════════════════════════════════

/**
 * Calcula um heat score aproximado (0-100) a partir dos dados disponíveis
 * no FastSimulation — sem gs, sem ponto a ponto, mas fiel ao espírito do
 * MatchHeat: rallies longos, tiebreaks, drama e surpresa elevam; DFs e
 * sets desequilibrados puxam para baixo.
 */
function calcMatchHeatFast(statsA, statsB, setsDetail, upsetFactor) {
  const BASELINE = 32;
  let heat = BASELINE;

  // ── Rally length (backbone principal, igual ao MatchHeat real) ──
  const allRallies = [...(statsA.rallyLengths ?? []), ...(statsB.rallyLengths ?? [])];
  if (allRallies.length > 0) {
    const avgRally   = allRallies.reduce((a, b) => a + b, 0) / allRallies.length;
    const longRallies = allRallies.filter(r => r >= 10).length;
    const maxRally   = Math.max(...allRallies);
    heat += clamp((avgRally - 3.0) * 3.5, -6, 22);   // rally 3=neutro, 8=+17
    heat += longRallies * 1.8;                        // cada rally >=10 bolas
    if (maxRally >= 20) heat += 8;                    // rally épico único
    else if (maxRally >= 15) heat += 4;
  }

  // ── Tiebreaks — tensão permanente ──
  const tiebreakSets = setsDetail.filter(([a, b]) => a === 7 || b === 7).length;
  heat += tiebreakSets * 9;

  // ── Sets disputados ──
  const closeSets = setsDetail.filter(([a, b]) => Math.abs(a - b) <= 2).length;
  heat += closeSets * 3.5;

  // ── Número de sets (3 sets = partida foi para o final) ──
  if (setsDetail.length === 3) heat += 6;
  if (setsDetail.length === 5) heat += 10;

  // ── Drama (upset) ──
  heat += upsetFactor * 14;

  // ── Penalidade: duplas faltas esfria o jogo ──
  const totalDFs = (statsA.doubleFaults ?? 0) + (statsB.doubleFaults ?? 0);
  heat -= totalDFs * 0.7;

  // ── Penalidade: bagel/bread em algum set ──
  const bagels = setsDetail.filter(([a, b]) => a === 0 || b === 0).length;
  heat -= bagels * 5;

  heat = clamp(heat, 0, 100);

  // Peak: nos melhores momentos (tiebreaks + rallies épicos) costuma
  // ser significativamente maior que o score final (que já decaiu)
  const peakBonus = tiebreakSets * 5 + (upsetFactor >= 0.5 ? 8 : 0) + (allRallies.length > 0 && Math.max(...allRallies) >= 20 ? 10 : 0);
  const peak = clamp(heat + peakBonus, heat, 100);

  return {
    score: Math.round(heat),
    peak:  Math.round(peak),
    tier:  heatScoreToTier(peak),
  };
}

export function simulateMatchFast(playerA, playerB, surface = 'HARD', bestOf = 3, opts = {}) {
  const surf = COURT_TO_SURFACE[surface] ?? surface ?? 'HARD';

  const matchCtx = [];
  if (bestOf === 5) matchCtx.push('bestOf5');
  const tier = opts.tournamentTier ?? null;
  const rl   = opts.roundLabel     ?? null;
  if (tier === 'GRAND_SLAM')               matchCtx.push('grandSlam');
  if (rl === 'F' || rl === 'SF')           matchCtx.push('knockoutRound', 'decisiveMoment');
  if (rl === 'QF')                         matchCtx.push('knockoutRound', 'quarterFinal+');
  if (['R16','R32','R64','R128'].includes(rl)) matchCtx.push('knockoutRound');

  const rA = opts.rankA ?? null, rB = opts.rankB ?? null;
  const rawCtxA = [...matchCtx], rawCtxB = [...matchCtx];
  if (rA !== null && rB !== null) {
    const diff = Math.abs(rA - rB);
    if (diff >= 20) {
      if (rA > rB) { rawCtxA.push('underdog'); rawCtxB.push('topSeed'); }
      else         { rawCtxA.push('topSeed');  rawCtxB.push('underdog'); }
    }
    if (rA <= 2) rawCtxA.push('vsTopSeed');
    if (rB <= 2) rawCtxB.push('vsTopSeed');
  }

  const ctxA = collectTraitContexts(playerA, {
    surface: surf,
    bestOf,
    isSlam: tier === 'GRAND_SLAM',
    roundLabel: rl,
    rankPos: rA,
    oppRank: rB,
    extraContexts: rawCtxA,
  });
  const ctxB = collectTraitContexts(playerB, {
    surface: surf,
    bestOf,
    isSlam: tier === 'GRAND_SLAM',
    roundLabel: rl,
    rankPos: rB,
    oppRank: rA,
    extraContexts: rawCtxB,
  });

  const profA = buildProfile(playerA, surf, ctxA);
  const profB = buildProfile(playerB, surf, ctxB);

  const { opponentDebuff: debA } = getTraitStrengthMods(playerA, surf, ctxA);
  const { opponentDebuff: debB } = getTraitStrengthMods(playerB, surf, ctxB);
  const strA = profA.strength - debB * profB.strength * 0.15;
  const strB = profB.strength - debA * profA.strength * 0.15;

  // Variância de dia — baseada em regularidade pessoal (v3)
  const varA = matchDayVarV3((profA.regularidade ?? 0.70) * 100);
  const varB = matchDayVarV3((profB.regularidade ?? 0.70) * 100);
  profA.consistency = clamp(profA.consistency + varA,       0.15, 0.95);
  profB.consistency = clamp(profB.consistency + varB,       0.15, 0.95);
  profA.mental      = clamp(profA.mental      + varA * 0.5, 0.10, 1.00);
  profB.mental      = clamp(profB.mental      + varB * 0.5, 0.10, 1.00);
  profA.srv1Power   = clamp(profA.srv1Power   + varA * 0.4, 0.20, 0.98);
  profB.srv1Power   = clamp(profB.srv1Power   + varB * 0.4, 0.20, 0.98);

  let mmt = clamp((strA - strB) * 0.008, -0.25, 0.25);

  const setsToWin = bestOf === 5 ? 3 : 2;
  let sA = 0, sB = 0;
  const setsDetail = [];
  let fatA = 0, fatB = 0;
  let srvIsA = rnd() < 0.5;

  while (sA < setsToWin && sB < setsToWin) {
    const sr = simulateSet(profA, profB, surf, {
      serverIsA: srvIsA,
      fatigue: [fatA, fatB],
      momentum: mmt,
    });
    setsDetail.push([sr.gamesA, sr.gamesB]);
    if (sr.gamesA > sr.gamesB) { sA++; mmt = clamp(mmt + 0.08, -0.35, 0.35); }
    else                       { sB++; mmt = clamp(mmt - 0.08, -0.35, 0.35); }

    fatA = updateFatigue(fatA, profA, sr.totalPts);
    fatB = updateFatigue(fatB, profB, sr.totalPts);
    srvIsA = !srvIsA;
  }

  const aWon   = sA > sB;
  const winner = aWon ? playerA : playerB;
  const loser  = aWon ? playerB : playerA;

  const pBaseA = sig((strA - strB) * 0.12);
  const upsetFactor = aWon
    ? Math.max(0, 0.5 - pBaseA)
    : Math.max(0, pBaseA - 0.5);

  // ── Retirement estimado (fast sim não tem engine real de lesão) ──────────
  // Chance de ~1-3% de partidas com desgaste alto terminarem por abandono.
  // Baseado em: partidas de 3 sets + upset + rally longo médio.
  const allFastRallies = [
    ...(profA.stats.rallyLengths ?? []),
    ...(profB.stats.rallyLengths ?? []),
  ];
  const avgFastRally = allFastRallies.length > 0
    ? allFastRallies.reduce((a, b) => a + b, 0) / allFastRallies.length
    : 3.0;
  const retirementChance = setsDetail.length >= 3
    ? 0.006 + clamp(upsetFactor * 2, 0, 1) * 0.010 + clamp((avgFastRally - 4) / 20, 0, 1) * 0.008
    : 0.002;
  const hadRetirement = Math.random() < retirementChance;
  const fastRetirement = hadRetirement ? {
    playerIdx:  aWon ? 1 : 0,   // perdedor abandonou
    playerName: loser.name,
    playerId:   loser.id,
    injuryType: ['HAMSTRING', 'ANKLE', 'KNEE', 'ABDOMINAL'][Math.floor(Math.random() * 4)],
    severity:   Math.random() < 0.5 ? 'MODERATE' : 'SEVERE',
    score:      `${sA}-${sB}`,
    isFastEstimate: true,
  } : null;

  return {
    winner, loser,
    sets: [sA, sB],
    setsDetail,
    winnerSets: aWon ? sA : sB,
    loserSets:  aWon ? sB : sA,
    upsetFactor: clamp(upsetFactor * 2, 0, 1),
    stats: { a: profA.stats, b: profB.stats },
    heat: calcMatchHeatFast(profA.stats, profB.stats, setsDetail, clamp(upsetFactor * 2, 0, 1)),
    retirement: fastRetirement,
    result: {
      traitMetrics: {
        a: { tiebreaksWon: profA.stats.tiebreaksWon },
        b: { tiebreaksWon: profB.stats.tiebreaksWon },
      },
    },
    log: [],
  };
}

// ═══════════════════════════════════════════════════════════════════
// TORNEIO FAST
// ═══════════════════════════════════════════════════════════════════

export function simulateTournamentFast(players, surface = 'HARD', bestOf = 3) {
  const bracket = [...players];
  if (bracket.length % 2 !== 0) bracket.pop();

  const rounds = [];
  let current  = bracket;

  while (current.length > 1) {
    const roundMatches = [], nextRound = [];
    for (let i = 0; i < current.length; i += 2) {
      const pA = current[i], pB = current[i + 1];
      const r  = simulateMatchFast(pA, pB, surface, bestOf);
      roundMatches.push({ playerA: pA, playerB: pB, winner: r.winner, loser: r.loser,
        sets: r.sets, setsDetail: r.setsDetail, upsetFactor: r.upsetFactor, result: r });
      nextRound.push(r.winner);
    }
    rounds.push(roundMatches);
    current = nextRound;
  }

  const champion = current[0] ?? null;
  const results  = {};
  const labels   = ['R128','R64','R32','R16','QF','SF','F'];
  const off      = Math.max(0, labels.length - rounds.length);

  for (let ri = 0; ri < rounds.length; ri++) {
    const lbl = labels[off + ri] ?? `R${ri + 1}`;
    for (const m of rounds[ri])
      if (m.loser?.id != null)
        results[m.loser.id] = { roundReached: lbl, roundIndex: ri };
  }
  if (champion?.id != null)
    results[champion.id] = { roundReached: 'W', roundIndex: rounds.length };

  return { rounds, champion, results };
}

function yieldToMain() { return new Promise(r => setTimeout(r, 0)); }

export async function simulateTournamentFastAsync(players, surface = 'HARD', bestOf = 3, onProgress = null) {
  const bracket = [...players];
  if (bracket.length % 2 !== 0) bracket.pop();

  const total   = bracket.length - 1;
  let done      = 0;
  const rounds  = [];
  let current   = bracket;

  while (current.length > 1) {
    const roundMatches = [], nextRound = [];
    for (let i = 0; i < current.length; i += 2) {
      const pA = current[i], pB = current[i + 1];
      await yieldToMain();
      const r = simulateMatchFast(pA, pB, surface, bestOf);
      roundMatches.push({ playerA: pA, playerB: pB, winner: r.winner, loser: r.loser,
        sets: r.sets, setsDetail: r.setsDetail, upsetFactor: r.upsetFactor, result: r });
      nextRound.push(r.winner);
      done++;
      if (onProgress) onProgress(done, total);
    }
    rounds.push(roundMatches);
    current = nextRound;
  }

  const champion = current[0] ?? null;
  const results  = {};
  const labels   = ['R128','R64','R32','R16','QF','SF','F'];
  const off      = Math.max(0, labels.length - rounds.length);

  for (let ri = 0; ri < rounds.length; ri++) {
    const lbl = labels[off + ri] ?? `R${ri + 1}`;
    for (const m of rounds[ri])
      if (m.loser?.id != null)
        results[m.loser.id] = { roundReached: lbl, roundIndex: ri };
  }
  if (champion?.id != null)
    results[champion.id] = { roundReached: 'W', roundIndex: rounds.length };

  return { rounds, champion, results };
}
