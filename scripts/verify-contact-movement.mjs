import assert from 'node:assert/strict';
import { createServer } from 'vite';

globalThis.window ??= {};

function countBy(items, key) {
  return items.reduce((counts, item) => {
    const value = item?.[key] ?? 'UNKNOWN';
    counts[value] = (counts[value] ?? 0) + 1;
    return counts;
  }, {});
}

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

function rallyEmergencyRate(log = []) {
  const rally = log.filter(item => !item?.isReturnContact);
  const emergency = rally.filter(item => item?.bodyState === 'STRETCHED' || item?.bodyState === 'LATE');
  return rally.length > 0 ? emergency.length / rally.length : 0;
}

const vite = await createServer({
  server: { middlewareMode: true },
  appType: 'custom',
  logLevel: 'error',
});
const originalRandom = Math.random;
Math.random = mulberry32(0xC07AC7);

try {
  const qualityModule = await vite.ssrLoadModule('/src/systems/shotengine/ShotQuality.js');
  const headless = await vite.ssrLoadModule('/src/core/Headless.jsx');

  const baseContext = {
    body: {
      canContact: true,
      playerPos: { x: 0, y: 10 },
      distanceToBall: 0.88,
      baseReach: 0.90,
      normalContactReach: 1.026,
      reach: 1.026,
      arrivalMargin: 0.04,
      contactReadiness: 0.68,
      contactSettleTime: 0.08,
      commitDistance: 0.88,
      contactPositionError: 0.10,
      contactClass: 'NORMAL_HIT',
      emergencyReachActive: false,
    },
    ballState: {
      z: 0.92,
      vz: -0.2,
      pos: { x: 0.75, y: 9.2 },
      bounceCount: 1,
    },
  };

  assert.equal(
    qualityModule.classifyBodyState(baseContext),
    'PLANTED',
    'Contato normal e preparado não pode virar STRETCHED',
  );

  assert.equal(
    qualityModule.classifyBodyState({
      ...baseContext,
      body: {
        ...baseContext.body,
        distanceToBall: 1.28,
        reach: 1.10,
        arrivalMargin: -0.19,
        contactReadiness: 0.18,
        contactSettleTime: 0,
        contactPositionError: 0.48,
        contactClass: 'EMERGENCY_REACH',
        emergencyReachActive: true,
      },
    }),
    'STRETCHED',
    'Alcance emergencial real precisa continuar existindo',
  );

  assert.equal(
    qualityModule.classifyBodyState({
      ...baseContext,
      body: {
        ...baseContext.body,
        distanceToBall: 1.02,
        reach: 1.08,
        arrivalMargin: -0.08,
        contactReadiness: 0.34,
        contactSettleTime: 0,
        contactPositionError: 0.24,
        contactClass: 'MOVING_HIT',
      },
    }),
    'MOVING',
    'Groundstroke em movimento não pode ser confundido com estirada',
  );

  const result = headless.simulateMatchHeadless(
    { namedKey: 'VANTORINI' },
    { namedKey: 'HASSAN' },
    'US_OPEN',
    3,
  );

  const logA = result?.stats?.a?.contactLog ?? [];
  const logB = result?.stats?.b?.contactLog ?? [];
  assert.ok(logA.length >= 40 && logB.length >= 40, 'Headless não produziu contatos suficientes');

  const emergencyA = rallyEmergencyRate(logA);
  const emergencyB = rallyEmergencyRate(logB);
  assert.ok(emergencyA <= 0.35, `Vantorini ainda tem emergência demais no rally: ${emergencyA}`);
  assert.ok(emergencyB <= 0.35, `Hassan ainda tem emergência demais no rally: ${emergencyB}`);

  const report = {
    result: {
      winner: result?.winner?.name ?? null,
      sets: result?.sets ?? null,
      points: result?.points ?? null,
    },
    Vantorini: {
      rallyEmergencyRate: +emergencyA.toFixed(3),
      bodyStates: countBy(logA, 'bodyState'),
      contactClasses: countBy(logA, 'contactClass'),
    },
    Hassan: {
      rallyEmergencyRate: +emergencyB.toFixed(3),
      bodyStates: countBy(logB, 'bodyState'),
      contactClasses: countBy(logB, 'contactClass'),
    },
  };
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
} finally {
  Math.random = originalRandom;
  await vite.close();
}
