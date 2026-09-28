/**
 * FastSimulation.js
 * ---------------------------------------------------------------------------
 * Motor de simulação rápida agregado.
 *
 * Não usa Headless, physics, gameTick, shot engine em tempo real, replay ou DOM.
 * A granularidade é: ponto -> game -> set -> match, com modelos probabilísticos
 * para saque, retorno, rally, momentum, fadiga, superfície, estilo, traits,
 * forma e mindset temporário de torneio.
 */

import { overallRating } from '../domain/players/players.js';
import { getCourtIdentity } from '../domain/players/PlayerCourtIdentity.js';
import { applyCompetitiveAttributeImpact, applyFormModifier } from '../systems/progression/formas.jsx';
import { collectTraitContexts, getTraitStrengthMods } from '../systems/traits/TraitSystem.js';
import { buildMatchTelemetry } from '../systems/analytics/simulationTelemetry.js';
import { finalizeMatchHeat } from '../systems/analytics/MatchHeat.js';
import { applySurfaceTalentToAttrs } from '../systems/progression/arvoredetalentos.jsx';
import { getSurfaceMatchEffects, normalizeSurfaceKey } from '../systems/surfaces/SurfaceIdentitySystem.js';
import { MATCH_RULES, isTiebreakSetScore } from './constants.js';
import { estimateFirstServeInProbability, estimateServePointWinProbability } from '../systems/shotengine/ServeExchangeEngine.js';

const SURFACE_MAP = Object.freeze({
  ROLAND_GARROS: 'CLAY',
  WIMBLEDON: 'GRASS',
  US_OPEN: 'HARD',
  O2_ARENA: 'INDOOR',
  INDOOR_MASTERS: 'INDOOR',
  AUSTRALIAN_OPEN: 'HARD',
  URBAN_COURT: 'STREET',
  CARPET_COURT: 'CARPET',
  CLAY: 'CLAY',
  GRASS: 'GRASS',
  HARD: 'HARD',
  INDOOR: 'INDOOR',
  STREET: 'STREET',
  CARPET: 'CARPET',
});

const SURFACE_PROFILE = Object.freeze({
  CLAY: {
    serve: 0.84, return: 1.11, rallyMean: 5.2, rallySd: 2.7, fatigue: 1.16,
    topspin: 0.18, slice: 0.04, net: -0.06, defense: 0.15, attack: -0.03,
    style: { CTR_PUNCHER: 0.05, RETRIEVER: 0.05, AGG_BASELINER: 0.02, BIG_SERVER: -0.04, SRV_VOL: -0.05 },
  },
  GRASS: {
    serve: 1.22, return: 0.90, rallyMean: 2.9, rallySd: 1.4, fatigue: 0.88,
    topspin: -0.04, slice: 0.14, net: 0.14, defense: -0.03, attack: 0.09,
    style: { SRV_VOL: 0.08, BIG_SERVER: 0.07, ALL_COURT: 0.04, RETRIEVER: -0.03, CTR_PUNCHER: -0.03 },
  },
  HARD: {
    serve: 1.00, return: 1.00, rallyMean: 3.8, rallySd: 2.1, fatigue: 1.00,
    topspin: 0.04, slice: 0.04, net: 0.02, defense: 0.04, attack: 0.06,
    style: { AGG_BASELINER: 0.04, ALL_COURT: 0.03, TAKEALLRISK: 0.02, RETRIEVER: -0.01 },
  },
  INDOOR: {
    serve: 1.16, return: 0.92, rallyMean: 3.1, rallySd: 1.7, fatigue: 0.92,
    topspin: -0.02, slice: 0.06, net: 0.08, defense: -0.02, attack: 0.10,
    style: { BIG_SERVER: 0.08, SRV_VOL: 0.07, AGG_BASELINER: 0.03, RETRIEVER: -0.04, CTR_PUNCHER: -0.02 },
  },
  // Asfalto: bounce altíssimo, físico intenso, potência domina
  STREET: {
    serve: 1.08, return: 0.97, rallyMean: 3.4, rallySd: 1.9, fatigue: 1.34,
    topspin: 0.06, slice: -0.03, net: -0.02, defense: -0.04, attack: 0.12,
    style: { POWER_BASELINER: 0.07, BIG_SERVER: 0.06, AGG_BASELINER: 0.05, CTR_PUNCHER: -0.04, RETRIEVER: -0.06, GRINDER: -0.05 },
  },
  // Veludo: ultra-rápido, bounce mínimo, ace é arma definitiva
  CARPET: {
    serve: 1.30, return: 0.86, rallyMean: 2.4, rallySd: 1.2, fatigue: 0.78,
    topspin: -0.08, slice: 0.10, net: 0.18, defense: -0.06, attack: 0.08,
    style: { BIG_SERVER: 0.14, SRV_VOL: 0.12, NET_SPECIALIST: 0.08, RETRIEVER: -0.06, CTR_PUNCHER: -0.05, GRINDER: -0.08 },
  },
});

const NET_FREQ = Object.freeze({
  SRV_VOL: 0.30,
  ALL_COURT: 0.18,
  BIG_SERVER: 0.11,
  TAKEALLRISK: 0.09,
  AGG_BASELINER: 0.07,
  CTR_PUNCHER: 0.05,
  RETRIEVER: 0.035,
});

const RALLY_MULT = Object.freeze({
  RETRIEVER: 1.36,
  CTR_PUNCHER: 1.28,
  ALL_COURT: 1.00,
  AGG_BASELINER: 0.94,
  BIG_SERVER: 0.84,
  SRV_VOL: 0.78,
  TAKEALLRISK: 0.76,
});

const STYLE_SURFACE_ALIASES = Object.freeze({
  PWR_BASE: ['POWER_BASELINER', 'AGG_BASELINER'],
  NET_SPEC: ['NET_SPECIALIST', 'SRV_VOL'],
  ADPT_TAC: ['ALL_COURT'],
  TACT_TEC: ['CTR_PUNCHER', 'ALL_COURT'],
});

// Fix #1: mapear o sistema moderno de prefs para rallyMult e netFreq.
// rallyCadence define o comprimento médio do rally (paciente = rallies longos).
// buildStyle refina o multiplicador com especialidade tática.
const CADENCE_RALLY_MULT = Object.freeze({
  PATIENT:      1.30,
  MEASURED:     1.14,
  BALANCED:     1.00,
  EARLY_ATTACK: 0.88,
  EXPLOSIVE:    0.76,
});
const CADENCE_NET_FREQ = Object.freeze({
  PATIENT:      0.04,
  MEASURED:     0.06,
  BALANCED:     0.08,
  EARLY_ATTACK: 0.10,
  EXPLOSIVE:    0.12,
});
const BUILD_RALLY_DELTA = Object.freeze({
  HEAVY_SPIN_PRESSURE: +0.10,  // empurra o rival para trás — rallies mais longos
  SLICE_CONTROL:       +0.08,  // bola lenta quebra o ritmo
  COUNTER_REDIRECT:    +0.06,  // absorve e redireciona
  CROSS_DOMINANT:      +0.02,  // construção consistente
  VARIED:               0.00,
  CROSS_BUILDER:        0.00,
  DTL_HUNTER:          -0.04,  // busca o winner paralelo cedo
  DROP_VARIATION:      -0.06,  // variação desequilibra e encurta o ponto
  CROSS_SHORT_ANGLE:   -0.06,  // ângulo curto termina o ponto mais rápido
  CENTRE_CONTROL:      +0.04,
});
const BUILD_NET_DELTA = Object.freeze({
  DROP_VARIATION:      +0.04,  // drop + sobe à rede
  CROSS_SHORT_ANGLE:   +0.03,
  DTL_HUNTER:          +0.02,
  HEAVY_SPIN_PRESSURE: -0.02,  // baseliner puro
  SLICE_CONTROL:       -0.01,
  COUNTER_REDIRECT:    -0.01,
});

function resolveRallyMult(player) {
  const prefs = player?.prefs ?? null;
  if (!prefs) return RALLY_MULT[player?.styleId ?? 'AGG_BASELINER'] ?? 1.00;
  const base = CADENCE_RALLY_MULT[prefs.rallyCadence] ?? 1.00;
  const delta = BUILD_RALLY_DELTA[prefs.buildStyle] ?? 0;
  const v = getCourtIdentity(player).shotVocabulary;
  return clamp(base + delta + (v.intentBias.BUILD ?? 0) * 0.14 - (v.intentBias.PRESSURE ?? 0) * 0.14, 0.68, 1.42);
}

function resolveNetFreq(player) {
  const prefs = player?.prefs ?? null;
  if (!prefs) return NET_FREQ[player?.styleId ?? 'AGG_BASELINER'] ?? 0.07;
  const netGame = prefs.netGame ?? 'RELUCTANT';
  const netBase = netGame === 'HUNTER' ? 0.28 : netGame === 'PROACTIVE' ? 0.18
    : netGame === 'OPPORTUNIST' ? 0.11 : netGame === 'RELUCTANT' ? 0.05 : 0.03;
  const cadenceBase = CADENCE_NET_FREQ[prefs.rallyCadence] ?? 0.08;
  const delta = BUILD_NET_DELTA[prefs.buildStyle] ?? 0;
  return clamp((netBase + cadenceBase) / 2 + delta + getCourtIdentity(player).positioning.netFollowBias * 0.12, 0.02, 0.34);
}

function resolveSurfaceStyleBonus(surfaceMeta, style) {
  const direct = surfaceMeta?.style?.[style];
  if (Number.isFinite(direct)) return direct;
  for (const alias of STYLE_SURFACE_ALIASES[style] ?? []) {
    const aliased = surfaceMeta?.style?.[alias];
    if (Number.isFinite(aliased)) return aliased;
  }
  return 0;
}

const clamp = (v, min, max) => {
  const safe = Number(v);
  return Number.isFinite(safe)
    ? Math.max(min, Math.min(max, safe))
    : (min + max) / 2;
};
const rnd = () => Math.random();
const roll = (p) => rnd() < p;
const sig = (x, k = 1) => 1 / (1 + Math.exp(-k * x));
const avg = (values) => values.length ? values.reduce((sum, v) => sum + v, 0) / values.length : 0;

function randn(mean, sd) {
  let u = 0;
  let v = 0;
  while (!u) u = rnd();
  while (!v) v = rnd();
  return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export function courtKeyToSurface(courtKey) {
  return SURFACE_MAP[String(courtKey ?? '').toUpperCase()] ?? normalizeSurfaceKey(courtKey);
}

function a(attrs, key, fallback = 60) {
  return Number(attrs?.[key] ?? fallback);
}

function n(attrs, key, fallback = 60) {
  return clamp(a(attrs, key, fallback) / 100, 0, 1);
}

function applyMindsetAttrs(attrs, mindset) {
  const mult = mindset?.modifier ?? 1;
  if (!attrs || mult === 1) return attrs;
  const impact = clamp((mult - 1) * 20, -4, 4);
  return applyCompetitiveAttributeImpact(attrs, impact);
}

function resolveAttrs(player, surface) {
  const base = { ...(player?.attrs ?? {}) };
  const contextAlreadyApplied = player?._matchContextApplied === true;
  const formAdjusted = !contextAlreadyApplied && player?.formPoints
    ? applyFormModifier(base, player.formPoints)
    : base;
  const mindsetAdjusted = contextAlreadyApplied
    ? formAdjusted
    : applyMindsetAttrs(formAdjusted, player?.tournamentMindset);
  try {
    return applySurfaceTalentToAttrs(mindsetAdjusted, player, surface)?.attrs ?? mindsetAdjusted;
  } catch {
    return mindsetAdjusted;
  }
}

function buildContext(player, opponent, surface, bestOf, options) {
  const contexts = [];
  if (bestOf >= 5) contexts.push('bestOf5');
  if (options?.tournamentTier === 'GRAND_SLAM' || options?.category === 'GRAND_SLAM') contexts.push('grandSlam');
  if (['F', 'SF'].includes(options?.roundLabel ?? options?.round)) contexts.push('decisiveMoment', 'knockoutRound');
  if (['QF', 'R16', 'R32', 'R64', 'R128'].includes(options?.roundLabel ?? options?.round)) contexts.push('knockoutRound');

  const rank = player?.rankPosition ?? options?.rankA ?? null;
  const oppRank = opponent?.rankPosition ?? options?.rankB ?? null;
  if (rank != null && oppRank != null) {
    if (rank <= 8) contexts.push('topSeed');
    if (oppRank <= 8) contexts.push('vsTopSeed');
    if (rank - oppRank >= 20) contexts.push('underdog');
  }

  return collectTraitContexts(player, {
    surface,
    bestOf,
    isSlam: contexts.includes('grandSlam'),
    roundLabel: options?.roundLabel ?? options?.round ?? null,
    rankPos: rank,
    oppRank,
    extraContexts: contexts,
  });
}

function buildProfile(player, opponent, surface, bestOf, options) {
  const attrs = resolveAttrs(player, surface);
  const surfaceMeta = SURFACE_PROFILE[surface] ?? SURFACE_PROFILE.HARD;
  const traitContexts = buildContext(player, opponent, surface, bestOf, options);
  const traitMods = getTraitStrengthMods(player, surface, traitContexts);
  const surfaceFx = getSurfaceMatchEffects(player, surface);
  const ovr = overallRating(attrs);
  const style = player?.styleId ?? 'AGG_BASELINER';
  const serve = (
    n(attrs, 'saqueForca') * 0.54 +
    n(attrs, 'saquePrecisao') * 0.36 +
    n(attrs, 'mentalidade') * 0.10
  ) * surfaceMeta.serve + surfaceFx.serveQuality;
  const secondServe = (
    n(attrs, 'saquePrecisao') * 0.58 +
    n(attrs, 'mentalidade') * 0.18 +
    n(attrs, 'regularidade') * 0.24
  ) * (surfaceMeta.serve * 0.72 + 0.28);
  const ret = (
    n(attrs, 'devolucao') * 0.56 +
    n(attrs, 'leitura') * 0.22 +
    n(attrs, 'explosividade') * 0.12 +
    n(attrs, 'visaoTatica') * 0.10
  ) * surfaceMeta.return + surfaceFx.returnQuality;
  const fh = n(attrs, 'fhPotencia') * 0.46 + n(attrs, 'fhControle') * 0.42 + n(attrs, 'topspin') * 0.12;
  const bh = n(attrs, 'bhPotencia') * 0.42 + n(attrs, 'bhControle') * 0.46 + n(attrs, 'slice') * 0.12;
  const rally = (
    Math.max(fh, bh) * 0.34 +
    ((fh + bh) / 2) * 0.20 +
    n(attrs, 'visaoTatica') * 0.14 +
    n(attrs, 'leitura') * 0.12 +
    n(attrs, 'regularidade') * 0.12 +
    n(attrs, 'defesa') * 0.08
  );
  const attack = (
    n(attrs, 'fhPotencia') * 0.24 +
    n(attrs, 'bhPotencia') * 0.19 +
    n(attrs, 'saqueForca') * 0.18 +
    n(attrs, 'visaoTatica') * 0.15 +
    n(attrs, 'explosividade') * 0.13 +
    n(attrs, 'volley') * 0.06 +
    n(attrs, 'smash') * 0.05
  ) + surfaceMeta.attack;
  const power = (
    n(attrs, 'fhPotencia') * 0.35 +
    n(attrs, 'bhPotencia') * 0.25 +
    n(attrs, 'saqueForca') * 0.25 +
    n(attrs, 'explosividade') * 0.15
  );
  const defense = (
    n(attrs, 'defesa') * 0.30 +
    n(attrs, 'velocidade') * 0.20 +
    n(attrs, 'explosividade') * 0.15 +
    n(attrs, 'bhControle') * 0.14 +
    n(attrs, 'leitura') * 0.13 +
    n(attrs, 'resistencia') * 0.08
  ) + surfaceMeta.defense;
  const net = (n(attrs, 'volley') * 0.58 + n(attrs, 'smash') * 0.27 + n(attrs, 'leitura') * 0.15) + surfaceMeta.net;
  const clutch = n(attrs, 'mentalidade') * 0.50 + n(attrs, 'regularidade') * 0.25 + n(attrs, 'recuperacao') * 0.15 + n(attrs, 'adaptacao') * 0.10;
  const stamina = n(attrs, 'resistencia') * 0.55 + n(attrs, 'recuperacao') * 0.30 + n(attrs, 'regularidade') * 0.15;
  const styleBonus = resolveSurfaceStyleBonus(surfaceMeta, style);
  const strength = ovr
    + styleBonus * 35
    + (traitMods.selfBonus ?? 0)
    + surfaceFx.strength * 4.2;

  return {
    player,
    attrs,
    surfaceFx,
    surface,
    style,
    strength,
    serve: clamp(serve, 0.10, 1.25),
    secondServe: clamp(secondServe, 0.10, 1.15),
    servePower: n(attrs, 'saqueForca'),
    servePrecision: n(attrs, 'saquePrecisao'),
    returnSkill: clamp(ret, 0.10, 1.18),
    fh: clamp(fh, 0.05, 1.10),
    bh: clamp(bh, 0.05, 1.10),
    rally: clamp(rally, 0.05, 1.12),
    attack: clamp(attack, 0.05, 1.16),
    power: clamp(power, 0.05, 1.12),
    defense: clamp(defense, 0.05, 1.16),
    net: clamp(net, 0.05, 1.12),
    clutch: clamp(clutch, 0.05, 1.08),
    stamina: clamp(stamina / Math.max(0.90, surfaceFx.staminaMult), 0.05, 1.10),
    adaptation: n(attrs, 'adaptacao'),
    consistency: n(attrs, 'regularidade'),
    topspin: n(attrs, 'topspin'),
    slice: n(attrs, 'slice'),
    traitMods,
    netFreq: resolveNetFreq(player),
    rallyMult: resolveRallyMult(player),
    competitiveAnchor: 0,
    stats: createStats(),
  };
}

function createStats() {
  return {
    aces: 0,
    doubleFaults: 0,
    winners: 0,
    unforcedErrors: 0,
    forcedErrors: 0,
    serve1Total: 0,
    serve1In: 0,
    serve1Won: 0,
    serve2Total: 0,
    serve2In: 0,
    serve2Won: 0,
    gamesServed: 0,
    gamesHeld: 0,
    gamesReturned: 0,
    gamesConverted: 0,
    breakPointsWon: 0,
    breakPointsFaced: 0,
    breakPointsOpportunities: 0,
    breakPointsSaved: 0,
    tiebreaksWon: 0,
    tiebreakPointsPlayed: 0,
    tiebreakPointsWon: 0,
    pointsWonServing: 0,
    pointsLostServing: 0,
    pointsWonReturning: 0,
    pointsLostReturning: 0,
    rallyLengths: [],   // mantido para compatibilidade — calcHeat usa rallySum/rallyMax
    rallySum: 0,
    rallyCount: 0,
    rallyMax: 0,
    longRallies: 0,
    attackShots: 0,
    defenseShots: 0,
    qualityCount: 0,
    byType: {},
    pointWinsByType: {},
  };
}

function bumpMap(obj, key, amount = 1) {
  obj[key] = (obj[key] ?? 0) + amount;
}

function registerPointOutcome(server, receiver, serverWins) {
  if (serverWins) {
    server.stats.pointsWonServing++;
    receiver.stats.pointsLostReturning++;
  } else {
    server.stats.pointsLostServing++;
    receiver.stats.pointsWonReturning++;
  }
}

function rallyLength(surface, srv, ret) {
  const meta = SURFACE_PROFILE[surface] ?? SURFACE_PROFILE.HARD;
  const mult = (srv.rallyMult + ret.rallyMult) / 2;
  const len = Math.round(clamp(randn(meta.rallyMean * mult, meta.rallySd), 1, 42));
  // Fix #2: rastrear sum e max inline em vez de guardar todos os valores.
  // Evita Math.max(...array) com spread em arrays grandes no calcHeat.
  for (const st of [srv.stats, ret.stats]) {
    st.rallySum = (st.rallySum ?? 0) + len;
    st.rallyCount = (st.rallyCount ?? 0) + 1;
    if (len > (st.rallyMax ?? 0)) st.rallyMax = len;
    if (len >= 10) st.longRallies = (st.longRallies ?? 0) + 1;
  }
  return len;
}

function rallyQuality(profile, opponent, surface, fatigue, momentum, pressure, len, isServer) {
  let q = 0.50
    + (profile.rally - 0.60) * 0.44
    + (profile.attack - opponent.defense) * (len <= 4 ? 0.16 : 0.08)
    + (profile.defense - opponent.attack) * (len >= 6 ? 0.14 : 0.05)
    + (profile.clutch - 0.60) * pressure * 0.15
    + profile.adaptation * Math.min(0.07, len * 0.006)
    // Projecao condensada dos ganhos comportamentais usados pelo motor completo
    // (leitura, contato, footwork e vocabulario adequado ao piso).
    + (profile.surfaceFx?.strength ?? 0) * 0.042
    + (profile.competitiveAnchor ?? 0)
    + momentum * 0.055
    - fatigue * 0.15;

  if (surface === 'CLAY')   q += (profile.topspin - 0.58) * 0.13 + (profile.stamina - 0.58) * 0.08;
  if (surface === 'GRASS')  q += (profile.slice - 0.55) * 0.09 + (profile.net - 0.55) * 0.08;
  if (surface === 'INDOOR') q += (profile.attack - 0.58) * 0.08;
  if (surface === 'STREET') q += (profile.power - 0.58) * 0.12 + (profile.stamina - 0.55) * 0.10;
  if (surface === 'CARPET') q += (profile.serve - 0.58) * 0.16 + (profile.net - 0.55) * 0.10;
  if (isServer && len <= 3) q += (profile.serve - opponent.returnSkill) * 0.09;

  const volatility = (1 - profile.consistency) * 0.045;
  q += randn(0, volatility);
  return clamp(q, 0.06, 0.94);
}

function simulatePoint(server, receiver, surface, state) {
  const pressure = state.pressure ?? 0;
  const momentum = state.momentum ?? 0;
  const sFat = state.serverFatigue ?? 0;
  const rFat = state.receiverFatigue ?? 0;
  const firstServePressureRelief = server.clutch * pressure * 0.035;
  const firstIn = clamp(
    estimateFirstServeInProbability({ precision: server.servePrecision, power: server.servePower, consistency: server.consistency })
      - pressure * 0.018 + firstServePressureRelief - sFat * 0.06,
    0.50,
    0.74,
  );

  server.stats.serve1Total++;
  if (!roll(firstIn)) {
    return simulateSecondServe(server, receiver, surface, state);
  }

  server.stats.serve1In++;
  const aceProb = clamp((server.serve - receiver.returnSkill) * 0.13 + (server.serve - 0.55) * 0.06 + (surface === 'CARPET' ? 0.038 : surface === 'GRASS' ? 0.022 : surface === 'INDOOR' ? 0.018 : surface === 'STREET' ? 0.008 : 0), 0.004, 0.22);
  if (roll(aceProb)) {
    server.stats.aces++;
    server.stats.winners++;
    server.stats.serve1Won++;
    bumpMap(server.stats.byType, 'serve');
    bumpMap(server.stats.pointWinsByType, 'serve');
    registerPointOutcome(server, receiver, true);
    return { serverWins: true, rallyLen: 1, winnerType: 'ace' };
  }

  return simulateRallyPoint(server, receiver, surface, state, true);
}

function simulateSecondServe(server, receiver, surface, state) {
  const pressure = state.pressure ?? 0;
  const sFat = state.serverFatigue ?? 0;
  const secondIn = clamp(0.76 + server.secondServe * 0.18 + server.clutch * pressure * 0.035 - pressure * 0.055 - sFat * 0.06, 0.62, 0.94);

  server.stats.serve2Total++;
  if (!roll(secondIn)) {
    server.stats.doubleFaults++;
    receiver.stats.forcedErrors++;
    registerPointOutcome(server, receiver, false);
    return { serverWins: false, rallyLen: 0, winnerType: 'doubleFault' };
  }

  server.stats.serve2In++;
  return simulateRallyPoint(server, receiver, surface, state, false);
}

function simulateRallyPoint(server, receiver, surface, state, firstServe) {
  const pressure = state.pressure ?? 0;
  const len = rallyLength(surface, server, receiver);
  const expectedServePoint = estimateServePointWinProbability({
    serve: server.serve,
    secondServe: server.secondServe,
    returnSkill: receiver.returnSkill,
    isFirst: firstServe,
    surfaceServe: SURFACE_PROFILE[surface]?.serve ?? 1,
  });
  const serveEdge = expectedServePoint - 0.50;
  const qServer = rallyQuality(server, receiver, surface, state.serverFatigue ?? 0, state.momentum ?? 0, pressure, len, true);
  const qReturn = rallyQuality(receiver, server, surface, state.receiverFatigue ?? 0, -(state.momentum ?? 0), pressure, len, false);
  const netBonus = roll(server.netFreq * clamp(1 - (state.serverFatigue ?? 0), 0.55, 1))
    ? (server.net - receiver.defense) * 0.10
    : 0;
  const returnAttack = len <= 3 && roll(receiver.attack * 0.16)
    ? (receiver.returnSkill + receiver.attack - server.secondServe) * 0.045
    : 0;
  const pServer = clamp(0.50 + (qServer - qReturn) * 0.60 + serveEdge + netBonus - returnAttack, 0.10, 0.90);
  const serverWins = roll(pServer);

  const attacking = serverWins ? server : receiver;
  const defending = serverWins ? receiver : server;
  const winnerChance = clamp((attacking.attack - defending.defense) * 0.20 + (len <= 4 ? 0.16 : 0.05), 0.03, 0.42);
  const errorChance = clamp((1 - attacking.consistency) * 0.12 + pressure * 0.025 + (len >= 8 ? 0.035 : 0), 0.02, 0.24);

  if (serverWins) {
    server.stats[firstServe ? 'serve1Won' : 'serve2Won']++;
    bumpMap(server.stats.pointWinsByType, firstServe ? 'servePlusOne' : 'rally');
  } else {
    bumpMap(receiver.stats.pointWinsByType, 'return');
  }
  registerPointOutcome(server, receiver, serverWins);

  if (roll(winnerChance)) {
    attacking.stats.winners++;
    attacking.stats.attackShots++;
    bumpMap(attacking.stats.byType, len <= 2 ? 'return' : 'rally');
  } else if (roll(errorChance)) {
    attacking.stats.unforcedErrors++;
  } else {
    defending.stats.forcedErrors++;
    defending.stats.defenseShots++;
  }
  attacking.stats.qualityCount++;
  defending.stats.qualityCount++;

  return { serverWins, rallyLen: len, winnerType: serverWins ? 'serverRally' : 'returnerRally' };
}

// Fix #4: pressão de game agora considera o contexto de set/match.
// Deuce a 5-5 no 3º set é muito mais pesado que deuce a 1-1 no 1º.
function pressureForGame(s, r, setCtx = null) {
  const gameScore = s >= 3 && r >= 3 ? 0.62
    : (s >= 3 && r >= 2) || (r >= 3 && s >= 2) ? 0.45
    : Math.max(s, r) >= 2 ? 0.22 : 0.05;
  if (!setCtx) return gameScore;
  // Multiplicador de contexto: set decider, placar de games apertado no final
  const { setsA, setsB, setsToWin, gamesA, gamesB } = setCtx;
  const isDeciderSet = setsA + setsB === (setsToWin - 1) * 2;
  const isLateGame = Math.min(gamesA, gamesB) >= 4;
  const setContextMult = isDeciderSet && isLateGame ? 1.28
    : isDeciderSet ? 1.14
    : isLateGame ? 1.08 : 1.00;
  return clamp(gameScore * setContextMult, 0.05, 0.88);
}

function simulateGame(server, receiver, surface, state) {
  let s = 0;
  let r = 0;
  let guard = 0;
  let points = 0;

  server.stats.gamesServed++;
  receiver.stats.gamesReturned++;

  while (guard < 40) {
    guard++;
    const pressure = pressureForGame(s, r, state.setCtx ?? null);
    const receiverHadBP = r >= 3 && r > s;
    const point = simulatePoint(server, receiver, surface, {
      ...state,
      pressure,
    });
    points++;
    if (point.serverWins) s++;
    else r++;

    if (receiverHadBP) {
      server.stats.breakPointsFaced++;
      receiver.stats.breakPointsOpportunities++;
      if (point.serverWins) server.stats.breakPointsSaved++;
      else receiver.stats.breakPointsWon++;
    }

    if (s >= MATCH_RULES.pointsPerGame) {
      server.stats.gamesHeld++;
      return { serverWon: true, points };
    }
    if (r >= MATCH_RULES.pointsPerGame) {
      receiver.stats.gamesConverted++;
      return { serverWon: false, points };
    }
  }

  const fallbackServerWon = roll(clamp(0.56 + (server.serve - receiver.returnSkill) * 0.15, 0.30, 0.76));
  if (fallbackServerWon) server.stats.gamesHeld++;
  else receiver.stats.gamesConverted++;
  return { serverWon: fallbackServerWon, points };
}

function simulateTiebreak(profileA, profileB, surface, fatigueA, fatigueB, target = MATCH_RULES.tiebreakPoints) {
  let aPts = 0;
  let bPts = 0;
  let played = 0;
  let serverIsA = roll(0.5);
  let guard = 0;

  while (guard < 80) {
    guard++;
    const server = serverIsA ? profileA : profileB;
    const receiver = serverIsA ? profileB : profileA;
    const point = simulatePoint(server, receiver, surface, {
      pressure: Math.max(aPts, bPts) >= target - 2 ? 0.68 : 0.38,
      momentum: 0,
      serverFatigue: serverIsA ? fatigueA : fatigueB,
      receiverFatigue: serverIsA ? fatigueB : fatigueA,
    });
    if (serverIsA) {
      if (point.serverWins) aPts++;
      else bPts++;
    } else if (point.serverWins) bPts++;
    else aPts++;

    profileA.stats.tiebreakPointsPlayed++;
    profileB.stats.tiebreakPointsPlayed++;
    if ((serverIsA && point.serverWins) || (!serverIsA && !point.serverWins)) profileA.stats.tiebreakPointsWon++;
    else profileB.stats.tiebreakPointsWon++;

    played++;
    if (aPts >= target && aPts - bPts >= MATCH_RULES.tiebreakWinBy) {
      profileA.stats.tiebreaksWon++;
      return { winnerIsA: true, score: [aPts, bPts] };
    }
    if (bPts >= target && bPts - aPts >= MATCH_RULES.tiebreakWinBy) {
      profileB.stats.tiebreaksWon++;
      return { winnerIsA: false, score: [aPts, bPts] };
    }
    if (played === 1 || played % 2 === 1) serverIsA = !serverIsA;
  }

  const winnerIsA = aPts >= bPts;
  if (winnerIsA) profileA.stats.tiebreaksWon++;
  else profileB.stats.tiebreaksWon++;
  return { winnerIsA, score: winnerIsA ? [Math.max(aPts, target), Math.max(bPts, target - 2)] : [Math.max(aPts, target - 2), Math.max(bPts, target)] };
}

function updateFatigue(fatigue, profile, pointsPlayed, surface) {
  const surfaceDrain = SURFACE_PROFILE[surface]?.fatigue ?? 1;
  const gain = (pointsPlayed / 70) * (0.10 - profile.stamina * 0.055) * surfaceDrain;
  const recovery = profile.stamina * 0.012;
  return clamp(fatigue + gain - recovery, 0, 0.45);
}

function simulateSet(profileA, profileB, surface, state) {
  let gamesA = 0;
  let gamesB = 0;
  let points = 0;
  let serverIsA = state.serverIsA ?? roll(0.5);
  let momentum = state.momentum ?? 0;
  let guard = 0;

  while (guard < 20) {
    guard++;
    const server = serverIsA ? profileA : profileB;
    const receiver = serverIsA ? profileB : profileA;
    const g = simulateGame(server, receiver, surface, {
      momentum: serverIsA ? momentum : -momentum,
      serverFatigue: serverIsA ? state.fatigueA : state.fatigueB,
      receiverFatigue: serverIsA ? state.fatigueB : state.fatigueA,
      setCtx: {                   // Fix #4: contexto de set para pressureForGame
        setsA: state.setsA ?? 0,
        setsB: state.setsB ?? 0,
        setsToWin: state.setsToWin ?? 2,
        gamesA,
        gamesB,
      },
    });
    points += g.points;

    if (g.serverWon) {
      if (serverIsA) gamesA++;
      else gamesB++;
      momentum = clamp(momentum + (serverIsA ? 0.035 : -0.035), -0.32, 0.32);
    } else {
      if (serverIsA) gamesB++;
      else gamesA++;
      momentum = clamp(momentum + (serverIsA ? -0.085 : 0.085), -0.32, 0.32);
    }
    // Fix #5: decaimento natural de momentum por game.
    // No tênis real o momentum é volátil — um break no game 1 não deve pesar
    // igualmente no game 10. Decai 8% por game, preservando o sinal mas
    // reduzindo a magnitude gradualmente.
    momentum *= 0.92;

    if (gamesA >= MATCH_RULES.gamesPerSet && gamesA - gamesB >= 2) return { gamesA, gamesB, points, nextServerIsA: !serverIsA, momentum };
    if (gamesB >= MATCH_RULES.gamesPerSet && gamesB - gamesA >= 2) return { gamesA, gamesB, points, nextServerIsA: !serverIsA, momentum };
    if (gamesA === MATCH_RULES.tiebreakAt && gamesB === MATCH_RULES.tiebreakAt) {
      const tb = simulateTiebreak(profileA, profileB, surface, state.fatigueA, state.fatigueB);
      return {
        gamesA: tb.winnerIsA ? MATCH_RULES.tiebreakSetWinnerGames : MATCH_RULES.tiebreakAt,
        gamesB: tb.winnerIsA ? MATCH_RULES.tiebreakAt : MATCH_RULES.tiebreakSetWinnerGames,
        points,
        nextServerIsA: !serverIsA,
        momentum: clamp(momentum + (tb.winnerIsA ? 0.06 : -0.06), -0.32, 0.32),
        tiebreakScore: tb.score,
      };
    }
    serverIsA = !serverIsA;
  }

  const winnerIsA = gamesA >= gamesB;
  return { gamesA: winnerIsA ? MATCH_RULES.gamesPerSet : gamesA, gamesB: winnerIsA ? gamesB : MATCH_RULES.gamesPerSet, points, nextServerIsA: !serverIsA, momentum };
}

function calcHeat(statsA, statsB, setsDetail, upsetFactor) {
  // Fix #2: usar valores pré-computados em vez de spread de array grande
  const totalCount = (statsA.rallyCount ?? 0) + (statsB.rallyCount ?? 0);
  const avgRally = totalCount > 0 ? ((statsA.rallySum ?? 0) + (statsB.rallySum ?? 0)) / totalCount : 3;
  const maxRally = Math.max(statsA.rallyMax ?? 0, statsB.rallyMax ?? 0);
  const longRallies = (statsA.longRallies ?? 0) + (statsB.longRallies ?? 0);
  const closeSets = setsDetail.filter(([aScore, bScore]) => Math.abs(aScore - bScore) <= 2).length;
  const tiebreaks = setsDetail.filter(([aScore, bScore]) => isTiebreakSetScore(aScore, bScore)).length;
  const decider = setsDetail.length >= 3 ? 7 : 0;
  let score = 30 + (avgRally - 3) * 3.5 + longRallies * 1.4 + closeSets * 4 + tiebreaks * 10 + decider + upsetFactor * 16;
  if (maxRally >= 18) score += 7;
  if (setsDetail.some(([aScore, bScore]) => Math.min(aScore, bScore) <= 1)) score -= 4;
  score = clamp(Math.round(score), 0, 100);
  const peak = clamp(Math.round(score + tiebreaks * 5 + (maxRally >= 18 ? 8 : 0) + upsetFactor * 8), score, 100);
  return { score, peak, tier: heatScoreToTier(peak) };
}

function finishResult(playerA, playerB, profileA, profileB, sets, setsDetail, options, surface, pBaseA, matchTiebreakScore = null) {
  const aWon = sets[0] > sets[1];
  const winner = aWon ? playerA : playerB;
  const loser = aWon ? playerB : playerA;
  const upsetFactor = clamp((aWon ? Math.max(0, 0.5 - pBaseA) : Math.max(0, pBaseA - 0.5)) * 2, 0, 1);
  const heat = finalizeMatchHeat({
    statsA: profileA.stats,
    statsB: profileB.stats,
    setsDetail,
    points: (profileA.stats.pointsWonServing ?? 0) + (profileA.stats.pointsWonReturning ?? 0) +
      (profileB.stats.pointsWonServing ?? 0) + (profileB.stats.pointsWonReturning ?? 0),
  });
  const telemetry = buildMatchTelemetry(profileA.stats, profileB.stats, {
    mode: 'fast',
    surface,
    courtKey: surface,
    validationFlags: ['FAST_SIM_AGGREGATE'],
  });
  const retirement = maybeRetirement(loser, setsDetail, profileA.stats, profileB.stats, upsetFactor);

  return {
    winner,
    loser,
    format: options?.format ?? null,
    matchTiebreakScore,
    sets,
    setsDetail,
    winnerSets: aWon ? sets[0] : sets[1],
    loserSets: aWon ? sets[1] : sets[0],
    upsetFactor,
    stats: { a: profileA.stats, b: profileB.stats },
    telemetry,
    heat,
    retirement,
    traitMetrics: {
      a: { tiebreaksWon: profileA.stats.tiebreaksWon },
      b: { tiebreaksWon: profileB.stats.tiebreaksWon },
    },
    storyTags: upsetFactor > 0.45 ? ['zebra'] : [],
    log: [],
  };
}

function maybeRetirement(loser, setsDetail, statsA, statsB, upsetFactor) {
  const totalCount = (statsA.rallyCount ?? 0) + (statsB.rallyCount ?? 0);
  const avgRally = totalCount > 0 ? ((statsA.rallySum ?? 0) + (statsB.rallySum ?? 0)) / totalCount : 3;
  const longMatch = setsDetail.length >= 3 || setsDetail.length >= 5;
  const chance = longMatch
    ? 0.002 + upsetFactor * 0.006 + clamp((avgRally - 5) / 20, 0, 1) * 0.006
    : 0.0008;
  if (!roll(chance)) return null;
  return {
    playerName: loser?.name,
    playerId: loser?.id,
    injuryType: ['HAMSTRING', 'ANKLE', 'KNEE', 'ABDOMINAL'][Math.floor(rnd() * 4)],
    severity: roll(0.68) ? 'MODERATE' : 'SEVERE',
    isFastEstimate: true,
  };
}

function simulateSuperTiebreak(profileA, profileB, surface) {
  const tb = simulateTiebreak(profileA, profileB, surface, 0, 0, 10);
  return {
    sets: tb.winnerIsA ? [1, 0] : [0, 1],
    setsDetail: [tb.score],
    matchTiebreakScore: tb.score,
  };
}

export function simulateMatchFast(playerA, playerB, surface = 'HARD', bestOf = 3, options = {}) {
  const resolvedSurface = courtKeyToSurface(surface);
  const profileA = buildProfile(playerA, playerB, resolvedSurface, bestOf, { ...options, rankA: playerA?.rankPosition, rankB: playerB?.rankPosition });
  const profileB = buildProfile(playerB, playerA, resolvedSurface, bestOf, { ...options, rankA: playerB?.rankPosition, rankB: playerA?.rankPosition });
  const debuffA = profileA.traitMods?.opponentDebuff ?? 0;
  const debuffB = profileB.traitMods?.opponentDebuff ?? 0;
  const strengthA = profileA.strength - debuffB * 0.12;
  const strengthB = profileB.strength - debuffA * 0.12;
  const pBaseA = clamp(sig((strengthA - strengthB) / 10.5), 0.035, 0.965);
  const priorAnchorA = clamp((pBaseA - 0.5) * 0.004, -0.002, 0.002);
  // Um nível diário persistente cria zebras explicáveis sem transformar cada
  // ponto em loteria. Regularidade reduz, mas nunca elimina, essa oscilação.
  const matchDayA = clamp(
    randn(0, 0.025 + (1 - profileA.consistency) * 0.060),
    -0.10,
    0.10,
  );
  const matchDayB = clamp(
    randn(0, 0.025 + (1 - profileB.consistency) * 0.060),
    -0.10,
    0.10,
  );
  profileA.competitiveAnchor = priorAnchorA + matchDayA;
  profileB.competitiveAnchor = -priorAnchorA + matchDayB;

  if (options?.format === 'SUPER_TB_10') {
    const stb = simulateSuperTiebreak(profileA, profileB, resolvedSurface);
    return finishResult(playerA, playerB, profileA, profileB, stb.sets, stb.setsDetail, options, resolvedSurface, pBaseA, stb.matchTiebreakScore);
  }

  const setsToWin = bestOf >= 5 ? 3 : 2;
  const sets = [0, 0];
  const setsDetail = [];
  let fatigueA = 0;
  let fatigueB = 0;
  let serverIsA = roll(0.5);
  let momentum = clamp((strengthA - strengthB) * 0.006, -0.22, 0.22);
  let guard = 0;

  while (sets[0] < setsToWin && sets[1] < setsToWin && guard < 7) {
    guard++;
    const setResult = simulateSet(profileA, profileB, resolvedSurface, { serverIsA, fatigueA, fatigueB, momentum, setsA: sets[0], setsB: sets[1], setsToWin });
    setsDetail.push([setResult.gamesA, setResult.gamesB]);
    if (setResult.gamesA > setResult.gamesB) sets[0]++;
    else sets[1]++;
    fatigueA = updateFatigue(fatigueA, profileA, setResult.points, resolvedSurface);
    fatigueB = updateFatigue(fatigueB, profileB, setResult.points, resolvedSurface);
    serverIsA = setResult.nextServerIsA;
    momentum = setResult.momentum;
  }

  return finishResult(playerA, playerB, profileA, profileB, sets, setsDetail, options, resolvedSurface, pBaseA);
}

export function simulateTournamentFast(players, surface = 'HARD', bestOf = 3) {
  const pool = [...(players ?? [])].filter(Boolean);
  const _profileCache = new Map(); // Fix #6
  const rounds = [];
  let current = pool;

  while (current.length > 1) {
    const round = [];
    const next = [];
    for (let i = 0; i < current.length; i += 2) {
      const playerA = current[i];
      const playerB = current[i + 1] ?? null;
      if (!playerB) {
        round.push({ playerA, playerB: null, winner: playerA, isBye: true, result: null });
        next.push(playerA);
        continue;
      }
      const result = simulateMatchFast(playerA, playerB, surface, bestOf, { _profileCache });
      round.push({ playerA, playerB, winner: result.winner, loser: result.loser, isBye: false, result, sets: result.sets, setsDetail: result.setsDetail, upsetFactor: result.upsetFactor });
      next.push(result.winner);
    }
    rounds.push(round);
    current = next;
  }

  return {
    rounds,
    champion: current[0] ?? null,
    results: buildTournamentResults(rounds, current[0] ?? null),
  };
}

function buildTournamentResults(rounds, champion) {
  const results = {};
  const labels = ['R128', 'R64', 'R32', 'R16', 'QF', 'SF', 'F'];
  const offset = Math.max(0, labels.length - rounds.length);
  for (let ri = 0; ri < rounds.length; ri++) {
    const label = labels[offset + ri] ?? `R${ri + 1}`;
    for (const match of rounds[ri]) {
      if (match.loser?.id != null) results[match.loser.id] = { roundReached: label, roundIndex: ri };
    }
  }
  if (champion?.id != null) results[champion.id] = { roundReached: 'W', roundIndex: rounds.length };
  return results;
}

function yieldToMain() {
  return new Promise(resolve => setTimeout(resolve, 0));
}

export async function simulateTournamentFastAsync(players, surface = 'HARD', bestOf = 3, onProgress = null) {
  const pool = [...(players ?? [])].filter(Boolean);
  const total = Math.max(0, pool.length - 1);
  const rounds = [];
  let current = pool;
  let done = 0;
  if (onProgress) onProgress(done, total);

  // Fix #3: yield uma vez por rodada (máx 7 yields num slam de 128 players)
  // em vez de uma vez por match (127 yields). Reduz overhead de scheduling
  // de setTimeout em ~120× sem perder responsividade perceptível na UI.
  while (current.length > 1) {
    await yieldToMain();
    const round = [];
    const next = [];
    for (let i = 0; i < current.length; i += 2) {
      const playerA = current[i];
      const playerB = current[i + 1] ?? null;
      if (!playerB) {
        round.push({ playerA, playerB: null, winner: playerA, isBye: true, result: null });
        next.push(playerA);
        continue;
      }
      const result = simulateMatchFast(playerA, playerB, surface, bestOf, { _profileCache });
      round.push({ playerA, playerB, winner: result.winner, loser: result.loser, isBye: false, result, sets: result.sets, setsDetail: result.setsDetail, upsetFactor: result.upsetFactor });
      next.push(result.winner);
      done++;
    }
    rounds.push(round);
    current = next;
    if (onProgress) onProgress(done, total);
  }

  return {
    rounds,
    champion: current[0] ?? null,
    results: buildTournamentResults(rounds, current[0] ?? null),
  };
}
