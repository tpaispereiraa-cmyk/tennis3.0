import { CASE_PHASES, SCALE_COST, SHOCK_MODES, migrateCircuitShockState, pulseKey, seededUnit, weightedSeededPick } from './ShockTypes.js';
import { definitionWeight, listEligibleDefinitions } from './ShockCatalog.js';
import { scoreCandidateForDefinition } from './ShockRiskModel.js';
import { openShockCase, advanceShockCase } from './ShockCaseEngine.js';
import { migratePlayerShockState, projectLegacyBreakingNews } from './ShockMigration.js';
import { applyShockCaseUpdate, isShockUnavailable } from './ShockConsequences.js';
import { advanceWorldShocks, applyWorldPressure, openWorldShock } from './WorldShockSystem.js';
import { ensureMoralCore, recoverMoralLoad } from './MoralCore.js';

function stateFrom(rawState, year) {
  const looksLikeUniverse = rawState && (Array.isArray(rawState.tourPlayers) || rawState.calendarIndex != null || rawState.rankingStore);
  return migrateCircuitShockState(rawState?.circuitShock ?? rawState?.directorState ?? (looksLikeUniverse ? null : rawState), year);
}
function coverageTier(score) { return score >= 78 ? 'GLOBAL' : score >= 52 ? 'MAJOR' : 'SPECIALIST'; }

export function migrateShockPlayer(player, year) {
  return projectLegacyBreakingNews(ensureMoralCore(migratePlayerShockState(player, year)));
}

export function tickPlayerShock(player, context = {}) {
  let next = migrateShockPlayer(player, context.year);
  const events = [];
  for (const rawCase of [...(next.circuitShock?.activeCases ?? [])]) {
    const result = advanceShockCase(rawCase, next, context);
    next = applyShockCaseUpdate(result.player, result.caseState, result.events);
    events.push(...result.events);
  }
  next = projectLegacyBreakingNews(recoverMoralLoad(next, .35));
  return { player: next, events };
}

export function runCircuitShockPulse(rawPlayers = [], year, rawState = {}, context = {}) {
  let director = stateFrom(rawState, year);
  let players = rawPlayers.map(player => migrateShockPlayer(player, year));
  if (director.mode === SHOCK_MODES.OFF) return { players, events: [], directorState: director };
  const key = pulseKey(year, context);
  if (director.processedPulses.includes(key)) return { players, events: [], directorState: director };

  const worldTick = advanceWorldShocks(director.activeWorldCases, { ...context, year, seed: director.seed });
  director = { ...director, activeWorldCases: worldTick.activeCases, worldModifiers: worldTick.worldModifiers };
  players = applyWorldPressure(players, worldTick.worldModifiers);
  const events = [...worldTick.events];
  const processedPulses = [...director.processedPulses, key].slice(-120);
  director = { ...director, processedPulses, metrics: { ...director.metrics, pulses: (director.metrics?.pulses ?? 0) + 1 } };

  const phase = context.phase ?? 'TOURNAMENT';
  const chance = director.mode === SHOCK_MODES.DRAMATIC
    ? (phase === 'SEASON_OPEN' ? .30 : .034)
    : (phase === 'SEASON_OPEN' ? .13 : .012);
  if (seededUnit(director.seed, key, 'trigger') >= chance || director.spentBudget >= director.annualBudget) return { players, events, directorState: director };

  const definitions = listEligibleDefinitions(director, director.mode, { ...context, year })
    .filter(def => (SCALE_COST[def.scale] ?? 1) + director.spentBudget <= director.annualBudget)
    .map(def => ({ ...def, weight: definitionWeight(def, director.mode) }));
  const def = weightedSeededPick(definitions, `${director.seed}:${key}:definition`);
  if (!def) return { players, events, directorState: director };

  let opened;
  let actorIndex = -1;
  let newsworthiness = 45;
  if (def.scope === 'WORLD') {
    opened = openWorldShock(def, year, context, director.seed);
    director.activeWorldCases = [...director.activeWorldCases, opened.caseState].slice(-12);
  } else {
    const candidates = players.map((player, index) => ({ player, index, ...scoreCandidateForDefinition(player, def, { ...context, year, ...director.worldModifiers }) }))
      .filter(candidate => candidate.eligible)
      .map(candidate => ({ ...candidate, weight: Math.max(1, candidate.occurrenceRisk) }));
    const candidate = weightedSeededPick(candidates, `${director.seed}:${key}:${def.id}:actor`);
    if (!candidate) return { players, events, directorState: director };
    actorIndex = candidate.index;
    newsworthiness = candidate.newsworthiness;
    opened = openShockCase(def, candidate.player, year, context, director.seed);
    players[actorIndex] = applyShockCaseUpdate(candidate.player, opened.caseState, opened.events);
  }
  for (const event of opened.events) event.coverageTier = coverageTier(newsworthiness);
  events.push(...opened.events);
  const cooldownUntil = year + Number(def.cooldownYears ?? 1);
  director = {
    ...director,
    spentBudget: director.spentBudget + (SCALE_COST[def.scale] ?? 1),
    lastSeismicYear: ['SEISMIC', 'ERA_DEFINING'].includes(def.scale) ? year : director.lastSeismicYear,
    familyCooldowns: { ...director.familyCooldowns, [def.family]: cooldownUntil },
    history: [...director.history, { caseId: opened.caseState.id, type: def.id, family: def.family, scale: def.scale, year, actorId: actorIndex >= 0 ? players[actorIndex].id : null }].slice(-160),
    metrics: { ...director.metrics, casesOpened: (director.metrics.casesOpened ?? 0) + 1, publicBreaks: (director.metrics.publicBreaks ?? 0) + opened.events.length, integrityCases: (director.metrics.integrityCases ?? 0) + (def.family === 'INTEGRITY' ? 1 : 0), seismicCases: (director.metrics.seismicCases ?? 0) + (['SEISMIC', 'ERA_DEFINING'].includes(def.scale) ? 1 : 0) },
  };
  return { players: players.map(projectLegacyBreakingNews), events, directorState: director };
}

export function isCircuitShockUnavailable(player) { return isShockUnavailable(player) || Boolean(player?.breakingNews?.scandal?.active || player?.breakingNews?.healthCrisis?.status === 'OUT'); }

export function closeCircuitShockSeason(players = [], seasonYear) {
  const activePlayers = [], retiredPlayers = [], events = [];
  for (const player of players.map(p => migrateShockPlayer(p, seasonYear))) {
    const farewell = [...(player.circuitShock?.activeCases ?? []), ...(player.circuitShock?.caseHistory ?? [])].find(c => c.type === 'FAREWELL_ANNOUNCEMENT' && c.openedYear === seasonYear);
    if (farewell) {
      const retired = { ...player, retirementInfo: { type: 'CIRCUIT_SHOCK_FAREWELL', year: seasonYear, age: player.age ?? 25, rankAtRetirement: player.rankPosition ?? player.rank ?? '?', message: `${player.name} encerra a carreira depois de uma temporada de despedida.` } };
      retiredPlayers.push(retired);
      events.push({ type: 'breaking_retirement', year: seasonYear, playerId: player.id, playerName: player.name, text: `${player.name} fecha a cortina ao fim de sua despedida.` });
    } else activePlayers.push(player);
  }
  return { activePlayers, retiredPlayers, events };
}
