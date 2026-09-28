import { SHOCK_MODES, createCircuitShockState } from './ShockTypes.js';
import { runCircuitShockPulse } from './CircuitShockSystem.js';
import { buildShockRiskProfile } from './ShockRiskModel.js';

export function auditShockWorld(state = {}, players = []) {
  const director = state.circuitShock ?? state;
  const issues = [];
  const ids = new Set();
  for (const item of director.history ?? []) {
    if (ids.has(item.caseId)) issues.push(`Caso duplicado: ${item.caseId}`);
    ids.add(item.caseId);
  }
  for (const player of players) {
    for (const c of player.circuitShock?.activeCases ?? []) {
      if (c.family === 'INTEGRITY' && c.phase === 'PUBLIC_BREAK' && c.verdict) issues.push(`Veredito antecipado: ${c.id}`);
      if (c.truth && player.circuitShock?.publicHistory?.some(event => event.caseId === c.id && JSON.stringify(event).includes(c.truth.id))) issues.push(`Verdade privada vazou: ${c.id}`);
    }
  }
  return { ok: issues.length === 0, issues, metrics: director.metrics ?? {}, activeWorldCases: director.activeWorldCases?.length ?? 0 };
}

export function verifyShockDeterminism(players, year = 2025) {
  const state = createCircuitShockState(year, { mode: SHOCK_MODES.DRAMATIC, seed: 'audit-seed' });
  const context = { phase: 'SEASON_OPEN', slot: 'AUDIT' };
  const a = runCircuitShockPulse(players, year, state, context);
  const b = runCircuitShockPulse(players, year, state, context);
  return JSON.stringify({ events: a.events, history: a.directorState.history }) === JSON.stringify({ events: b.events, history: b.directorState.history });
}

export function verifyFameSeparation(player) {
  const low = buildShockRiskProfile({ ...player, marketability: 1, popularity: 1 }, { year: 2025 });
  const famous = buildShockRiskProfile({ ...player, marketability: 100, popularity: 100 }, { year: 2025 });
  return {
    causalRiskStable: low.integrity === famous.integrity,
    coverageChanges: famous.newsworthiness > low.newsworthiness,
    low: { integrity: low.integrity, newsworthiness: low.newsworthiness },
    famous: { integrity: famous.integrity, newsworthiness: famous.newsworthiness },
  };
}
