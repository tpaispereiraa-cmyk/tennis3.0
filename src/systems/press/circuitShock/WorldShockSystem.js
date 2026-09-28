import { advanceShockCase, openShockCase } from './ShockCaseEngine.js';

const WORLD_EFFECTS = {
  FEDERATION_CRISIS: { integrityScrutiny: 12, schedulePressure: 2, playerSolidarity: 2 },
  TOURNAMENT_COLLAPSE: { prizeMoneyConfidence: -10, schedulePressure: 8 },
  PLAYER_BOYCOTT: { playerSolidarity: 12, schedulePressure: 10, commercialConfidence: -4 },
  RULE_REVOLUTION: { tacticalUncertainty: 10, institutionalAttention: 12 },
  SURFACE_CRISIS: { medicalScrutiny: 14, injuryConcern: 8 },
};

export function openWorldShock(definition, year, context, seed) {
  const opened = openShockCase(definition, null, year, context, seed);
  return { ...opened, caseState: { ...opened.caseState, worldEffects: WORLD_EFFECTS[definition.id] ?? {} } };
}

export function advanceWorldShocks(cases = [], context = {}) {
  const activeCases = [];
  const events = [];
  for (const rawCase of cases) {
    const result = advanceShockCase(rawCase, null, context);
    events.push(...result.events);
    if (result.caseState.phase !== 'CLOSED') activeCases.push(result.caseState);
  }
  const worldModifiers = {};
  for (const c of activeCases) for (const [key, value] of Object.entries(c.worldEffects ?? {})) worldModifiers[key] = (worldModifiers[key] ?? 0) + value;
  return { activeCases, events, worldModifiers };
}

export function applyWorldPressure(players = [], worldModifiers = {}) {
  const pressure = Number(worldModifiers.schedulePressure ?? 0) + Number(worldModifiers.injuryConcern ?? 0) * .35;
  const support = Number(worldModifiers.playerSolidarity ?? 0) * .3;
  if (!pressure && !support) return players;
  return players.map(player => ({
    ...player,
    circuitShock: {
      ...(player.circuitShock ?? {}),
      worldEffects: { pressure: Math.round(pressure * 10) / 10, support: Math.round(support * 10) / 10 },
    },
  }));
}
