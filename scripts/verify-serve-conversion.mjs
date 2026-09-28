import assert from 'node:assert/strict';
import { createServer } from 'vite';

globalThis.window ??= {};

function mulberry32(seed) {
  let value = seed >>> 0;
  return () => {
    value += 0x6D2B79F5;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function countBy(items, key) {
  return items.reduce((counts, item) => {
    const value = item?.[key] ?? 'UNKNOWN';
    counts[value] = (counts[value] ?? 0) + 1;
    return counts;
  }, {});
}

function sumMap(map = {}) {
  return Object.values(map).reduce((sum, value) => sum + (Number(value) || 0), 0);
}

function average(items, key) {
  const values = items.map(item => item?.[key]).filter(Number.isFinite);
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}

const vite = await createServer({
  server: { middlewareMode: true },
  appType: 'custom',
  logLevel: 'error',
});
const originalRandom = Math.random;
Math.random = mulberry32(0x5E2C06);

try {
  const returns = await vite.ssrLoadModule('/src/systems/shotengine/ReturnEngine.js');
  const headless = await vite.ssrLoadModule('/src/core/Headless.jsx');

  const baseContext = {
    capabilities: {
      return: 0.78,
      reading: 0.82,
      wingControl: 0.76,
      explosiveness: 0.72,
    },
    body: {
      arrivalMargin: -0.08,
      contactReadiness: 0.34,
      contactPositionError: 0.36,
      reach: 1.08,
    },
    player: { pos: { x: 0, y: 13.8 } },
    ballState: { pos: { x: 1.16, y: 13.0, z: 0.98 } },
    gs: {
      server: 0,
      _servePatternHistory: [],
      _pendingServeData: {
        isFirst: true,
        kmh: 184,
        dir: 'WIDE',
        pressureHint: 0.72,
        wideHint: 0.80,
      },
    },
  };
  const rawStretched = { quality: 0.43, bodyState: 'STRETCHED', canContact: true };
  const normalReturn = returns.normalizeReturnContact(baseContext, rawStretched);
  assert.equal(normalReturn.bodyState, 'MOVING', 'Bloqueio reativo alcançável não pode continuar como STRETCHED');
  assert.equal(normalReturn.returnContact.realEmergency, false, 'Janela reativa normal não pode ser emergência real');

  const emergencyReturn = returns.normalizeReturnContact({
    ...baseContext,
    body: {
      ...baseContext.body,
      arrivalMargin: -0.28,
      contactReadiness: 0.08,
      contactPositionError: 0.82,
    },
    ballState: { pos: { x: 2.05, y: 13.0, z: 0.98 } },
  }, rawStretched);
  assert.equal(emergencyReturn.returnContact.realEmergency, true, 'Devolução realmente fora do alcance precisa permanecer emergência');
  assert.ok(['STRETCHED', 'LATE'].includes(emergencyReturn.bodyState), 'Emergência real perdeu o estado corporal');

  const result = headless.simulateMatchHeadless(
    { namedKey: 'VANTORINI' },
    { namedKey: 'HASSAN' },
    'US_OPEN',
    3,
  );
  const statsA = result?.stats?.a ?? {};
  const statsB = result?.stats?.b ?? {};
  const returnsA = statsA.returnLog ?? [];
  const returnsB = statsB.returnLog ?? [];
  const servesA = statsA.serveLog ?? [];
  const servesB = statsB.serveLog ?? [];
  assert.ok(
    returnsA.length >= 8 && returnsB.length >= 8,
    `Headless não produziu devoluções suficientes: A=${returnsA.length} B=${returnsB.length}`,
  );

  const emergencyA = returnsA.filter(item => item?.returnRealEmergency || item?.shotEngine?.returnRealEmergency).length / returnsA.length;
  const emergencyB = returnsB.filter(item => item?.returnRealEmergency || item?.shotEngine?.returnRealEmergency).length / returnsB.length;
  assert.ok(emergencyA <= 0.38, `Vantorini ainda tem devoluções emergenciais demais: ${emergencyA}`);
  assert.ok(emergencyB <= 0.38, `Hassan ainda tem devoluções emergenciais demais: ${emergencyB}`);
  const avgServeThreatA = average(servesA, 'pressureHint');
  const avgServeThreatB = average(servesB, 'pressureHint');
  assert.ok(avgServeThreatA > 0.25 && avgServeThreatA < 0.94, `Pressão de saque A saturada ou morta: ${avgServeThreatA}`);
  assert.ok(avgServeThreatB > 0.25 && avgServeThreatB < 0.94, `Pressão de saque B saturada ou morta: ${avgServeThreatB}`);

  const outcomesWon = sumMap(statsA.pointsWonByOutcome) + sumMap(statsB.pointsWonByOutcome);
  const totalPoints = result?.points ?? outcomesWon;
  assert.equal(outcomesWon, totalPoints, 'Cada ponto deve possuir exatamente um desfecho');
  assert.equal(statsA.winners ?? 0, statsA.pointsWonByOutcome?.WINNER ?? 0, 'Winners A divergem da classificação exclusiva');
  assert.equal(statsB.winners ?? 0, statsB.pointsWonByOutcome?.WINNER ?? 0, 'Winners B divergem da classificação exclusiva');
  assert.equal(statsA.forcedErrors ?? 0, statsA.pointsLostByOutcome?.FORCED_ERROR ?? 0, 'Erros forçados A foram contados em duplicidade');
  assert.equal(statsB.forcedErrors ?? 0, statsB.pointsLostByOutcome?.FORCED_ERROR ?? 0, 'Erros forçados B foram contados em duplicidade');

  process.stdout.write(`${JSON.stringify({
    result: {
      winner: result?.winner?.name ?? null,
      sets: result?.sets ?? null,
      points: totalPoints,
    },
    Vantorini: {
      returnEmergencyRate: +emergencyA.toFixed(3),
      avgServeThreat: +avgServeThreatA.toFixed(3),
      returnPostures: countBy(returnsA, 'returnPosture'),
      outcomesWon: statsA.pointsWonByOutcome,
      outcomesLost: statsA.pointsLostByOutcome,
      winners: statsA.winners,
      forcedErrors: statsA.forcedErrors,
      unforcedErrors: statsA.unforcedErrors,
    },
    Hassan: {
      returnEmergencyRate: +emergencyB.toFixed(3),
      avgServeThreat: +avgServeThreatB.toFixed(3),
      returnPostures: countBy(returnsB, 'returnPosture'),
      outcomesWon: statsB.pointsWonByOutcome,
      outcomesLost: statsB.pointsLostByOutcome,
      winners: statsB.winners,
      forcedErrors: statsB.forcedErrors,
      unforcedErrors: statsB.unforcedErrors,
    },
  }, null, 2)}\n`);
} finally {
  Math.random = originalRandom;
  await vite.close();
}
