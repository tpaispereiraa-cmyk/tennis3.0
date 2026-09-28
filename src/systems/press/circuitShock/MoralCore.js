import { clamp, seededUnit } from './ShockTypes.js';

const ARCHETYPE_BIAS = Object.freeze({
  WARRIOR: { loyalty: 10, accountability: 6 },
  PERFECTIONIST: { ruleRespect: 9, selfControl: 7, rationalization: 5 },
  REBEL: { ruleRespect: -14, selfControl: -5, empathy: 3 },
  PREDATOR: { empathy: -6, riskTolerance: 10, rationalization: 8 },
  TACTICIAN: { selfControl: 10, riskTolerance: -4 },
  DREAMER: { empathy: 10, selfControl: -3 },
  ARTIST: { empathy: 5, ruleRespect: -3 },
});

function baseDimension(player, key, low = 34, spread = 55) {
  return Math.round(low + seededUnit(player.id ?? player.name, 'moral', key) * spread);
}

export function createMoralCore(player) {
  const archetype = player.personality?.competitiveArchetype?.id ?? '';
  const bias = ARCHETYPE_BIAS[archetype] ?? {};
  const core = {
    integrity: baseDimension(player, 'integrity'),
    ruleRespect: baseDimension(player, 'ruleRespect'),
    loyalty: baseDimension(player, 'loyalty'),
    empathy: baseDimension(player, 'empathy'),
    selfControl: baseDimension(player, 'selfControl'),
    accountability: baseDimension(player, 'accountability'),
    riskTolerance: baseDimension(player, 'riskTolerance'),
    rationalization: baseDimension(player, 'rationalization', 18, 64),
  };
  for (const [key, value] of Object.entries(bias)) core[key] = clamp((core[key] ?? 50) + value);
  return {
    version: 1,
    core,
    moralStress: 0,
    guiltLoad: 0,
    trustInInstitutions: baseDimension(player, 'institutions', 28, 60),
    lastDecision: null,
  };
}

export function ensureMoralCore(player) {
  if (!player) return player;
  const shock = player.circuitShock ?? {};
  const moral = shock.moral?.core ? shock.moral : createMoralCore(player);
  return { ...player, circuitShock: { ...shock, moral, moralHistory: [...(shock.moralHistory ?? [])] } };
}

export function moralProtectionScore(player) {
  const p = ensureMoralCore(player);
  const m = p.circuitShock.moral;
  const c = m.core;
  const life = p.lifeSimulation?.currentEffects ?? {};
  const coachTrust = p.coaching?.trust ?? 50;
  return clamp(
    c.integrity * .28 + c.ruleRespect * .16 + c.selfControl * .14 + c.accountability * .11
    + c.empathy * .06 + coachTrust * .08 + Math.max(0, life.support ?? 0) * 1.2
    - c.rationalization * .10 - (m.moralStress ?? 0) * .12,
  );
}

export function chooseMoralResponse(player, caseState, context = {}) {
  const p = ensureMoralCore(player);
  const m = p.circuitShock.moral;
  const c = m.core;
  const evidence = caseState.evidenceStrength ?? 0;
  const fear = clamp((p.personality?.currentState?.pressureLevel ?? 20) + (m.moralStress ?? 0) * .55 + evidence * .25);
  const truth = caseState.truth?.culpability ?? 0;
  const scores = {
    DISCLOSE: c.integrity * .34 + c.accountability * .34 + c.empathy * .12 + evidence * .18 - fear * .12,
    COOPERATE: c.ruleRespect * .29 + c.selfControl * .25 + c.accountability * .20 + evidence * .18,
    DENY: fear * .34 + c.selfControl * .12 + (100 - c.accountability) * .18 + (100 - evidence) * .18,
    BLAME_TEAM: fear * .24 + c.rationalization * .30 + (100 - c.loyalty) * .26 + truth * .10,
    CONCEAL: truth * .25 + fear * .24 + c.rationalization * .25 + (100 - c.integrity) * .28,
    WITHDRAW: fear * .30 + c.empathy * .10 + c.selfControl * .18 + (context.healthRisk ?? 0) * .28,
  };
  if ((caseState.family ?? '') !== 'INTEGRITY') {
    delete scores.CONCEAL;
    delete scores.BLAME_TEAM;
  }
  const ranked = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  return { id: ranked[0]?.[0] ?? 'COOPERATE', scores: Object.fromEntries(ranked), fear: Math.round(fear) };
}

export function applyMoralDecision(player, caseState, decision, year) {
  const p = ensureMoralCore(player);
  const moral = { ...p.circuitShock.moral, core: { ...p.circuitShock.moral.core } };
  const deltas = {
    DISCLOSE: { integrity: 1, accountability: 2, moralStress: -7, guiltLoad: -8 },
    COOPERATE: { accountability: 1, moralStress: -4, guiltLoad: -3 },
    DENY: { moralStress: 4, guiltLoad: caseState.truth?.culpability > 45 ? 8 : 0 },
    BLAME_TEAM: { loyalty: -2, rationalization: 2, moralStress: 5, guiltLoad: 6 },
    CONCEAL: { integrity: -3, accountability: -2, rationalization: 3, moralStress: 8, guiltLoad: 12 },
    WITHDRAW: { selfControl: 1, moralStress: -3 },
  }[decision.id] ?? {};
  for (const key of Object.keys(moral.core)) {
    if (deltas[key]) moral.core[key] = clamp(moral.core[key] + deltas[key]);
  }
  moral.moralStress = clamp((moral.moralStress ?? 0) + (deltas.moralStress ?? 0));
  moral.guiltLoad = clamp((moral.guiltLoad ?? 0) + (deltas.guiltLoad ?? 0));
  moral.lastDecision = { caseId: caseState.id, decision: decision.id, year };
  return {
    ...p,
    circuitShock: {
      ...p.circuitShock,
      moral,
      moralHistory: [...(p.circuitShock.moralHistory ?? []), { caseId: caseState.id, decision: decision.id, year, fear: decision.fear }].slice(-32),
    },
  };
}

export function recoverMoralLoad(player, amount = 1) {
  const p = ensureMoralCore(player);
  return {
    ...p,
    circuitShock: {
      ...p.circuitShock,
      moral: {
        ...p.circuitShock.moral,
        moralStress: clamp((p.circuitShock.moral.moralStress ?? 0) - amount),
        guiltLoad: clamp((p.circuitShock.moral.guiltLoad ?? 0) - amount * .35),
      },
    },
  };
}

