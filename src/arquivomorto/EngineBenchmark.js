import { simulateMatchFast } from '../core/FastSimulation.js';
import { simulateMatchHeadless, simulateMatchMid, simulateMatchSlim } from '../core/Headless.jsx';
import { buildMatchTelemetry, diffTelemetry } from '../systems/analytics/simulationTelemetry.js';

export const ENGINE_BENCHMARK_SCENARIOS = [
  { id: 'hard_balanced', courtKey: 'US_OPEN', bestOf: 3 },
  { id: 'clay_long', courtKey: 'ROLAND_GARROS', bestOf: 3 },
  { id: 'grass_short', courtKey: 'WIMBLEDON', bestOf: 3 },
  { id: 'indoor_pressure', courtKey: 'O2_ARENA', bestOf: 3 },
];

function toSurface(courtKey) {
  if (courtKey === 'ROLAND_GARROS') return 'CLAY';
  if (courtKey === 'WIMBLEDON') return 'GRASS';
  if (courtKey === 'O2_ARENA') return 'INDOOR';
  return 'HARD';
}

function pickPlayers(players = []) {
  const [a, b] = players;
  return [a, b];
}

export function runEngineBenchmark(players = [], scenarios = ENGINE_BENCHMARK_SCENARIOS) {
  const [playerA, playerB] = pickPlayers(players);
  if (!playerA || !playerB) {
    throw new Error('runEngineBenchmark precisa de dois jogadores.');
  }

  return scenarios.map((scenario) => {
    const headless = simulateMatchHeadless(playerA, playerB, scenario.courtKey, scenario.bestOf);
    const slim = simulateMatchSlim(playerA, playerB, scenario.courtKey, scenario.bestOf);
    const mid = simulateMatchMid(playerA, playerB, scenario.courtKey, scenario.bestOf);
    const fast = simulateMatchFast(playerA, playerB, toSurface(scenario.courtKey), scenario.bestOf);

    const headlessTelemetry = headless.telemetry ?? buildMatchTelemetry(headless.stats.a, headless.stats.b, { mode: 'headless' });
    const slimTelemetry = slim.telemetry ?? buildMatchTelemetry(slim.stats.a, slim.stats.b, { mode: 'slim' });
    const midTelemetry = mid.telemetry ?? buildMatchTelemetry(mid.stats.a, mid.stats.b, { mode: 'mid' });
    const fastTelemetry = fast.telemetry ?? buildMatchTelemetry(fast.stats.a, fast.stats.b, { mode: 'fast' });

    return {
      scenario,
      headless: headlessTelemetry,
      slim: slimTelemetry,
      mid: midTelemetry,
      fast: fastTelemetry,
      driftVsHeadless: {
        slim: diffTelemetry(slimTelemetry, headlessTelemetry),
        mid: diffTelemetry(midTelemetry, headlessTelemetry),
        fast: diffTelemetry(fastTelemetry, headlessTelemetry),
      },
    };
  });
}
