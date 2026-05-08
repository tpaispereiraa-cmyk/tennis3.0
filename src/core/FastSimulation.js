import { SHOT_ENGINE_OFFLINE, buildOfflineShotEvent } from '../systems/shotlab/ShotEngineOffline.js';

const OFFLINE_SURFACE_MAP = Object.freeze({
  ROLAND_GARROS: 'CLAY',
  WIMBLEDON: 'GRASS',
  US_OPEN: 'HARD',
  O2_ARENA: 'INDOOR',
  INDOOR_MASTERS: 'INDOOR',
  AUSTRALIAN_OPEN: 'HARD',
  CLAY: 'CLAY',
  GRASS: 'GRASS',
  HARD: 'HARD',
  INDOOR: 'INDOOR',
});

export function courtKeyToSurface(courtKey) {
  return OFFLINE_SURFACE_MAP[courtKey] ?? 'HARD';
}

function buildOfflineFastResult(playerA = null, playerB = null, surface = 'HARD', bestOf = 3) {
  const event = buildOfflineShotEvent({ phase: 'fast_simulation', surface, bestOf });
  return {
    code: SHOT_ENGINE_OFFLINE,
    shotEngineOffline: event,
    winner: null,
    loser: null,
    players: { a: playerA, b: playerB },
    format: bestOf,
    sets: [0, 0],
    setsDetail: [],
    winnerSets: 0,
    loserSets: 0,
    upsetFactor: 0,
    stats: { a: {}, b: {} },
    telemetry: {
      mode: 'fast',
      surface: courtKeyToSurface(surface),
      validationFlags: [SHOT_ENGINE_OFFLINE],
    },
    heat: null,
    retirement: null,
    result: { traitMetrics: { a: {}, b: {} } },
    log: ['SHOT_ENGINE_OFFLINE: fast simulation disabled until the new shot engine exists.'],
  };
}

export function simulateMatchFast(playerA, playerB, surface = 'HARD', bestOf = 3) {
  return buildOfflineFastResult(playerA, playerB, surface, bestOf);
}

export function simulateTournamentFast(players, surface = 'HARD', bestOf = 3) {
  return {
    code: SHOT_ENGINE_OFFLINE,
    shotEngineOffline: buildOfflineShotEvent({ phase: 'fast_tournament', surface, bestOf }),
    rounds: [],
    champion: null,
    results: {},
  };
}

export async function simulateTournamentFastAsync(players, surface = 'HARD', bestOf = 3, onProgress = null) {
  if (onProgress) onProgress(0, Math.max(0, (players?.length ?? 0) - 1));
  return simulateTournamentFast(players, surface, bestOf);
}
