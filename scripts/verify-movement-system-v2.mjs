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

const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' });
const originalRandom = Math.random;
Math.random = mulberry32(0x10C0FFEE);
try {
  const headless = await vite.ssrLoadModule('/src/core/Headless.jsx');
  const result = headless.simulateMatchHeadless(
    { namedKey: 'VANTORINI' },
    { namedKey: 'HASSAN' },
    'US_OPEN',
    3,
  );
  const contacts = [...(result?.stats?.a?.contactLog ?? []), ...(result?.stats?.b?.contactLog ?? [])]
    .filter(item => !item?.isReturnContact);
  assert.ok(contacts.length >= 70, 'partida não gerou contatos suficientes para auditoria');
  const audited = contacts.filter(item => item.movementEngineVersion === 'movement-engine-v3');
  assert.ok(audited.length / contacts.length >= 0.92, 'telemetria v3 ausente em contatos do rally');
  assert.ok(audited.every(item => Number.isFinite(item.movementCoherence) && item.movementCoherence >= 0 && item.movementCoherence <= 1));
  assert.ok(audited.every(item => item.footingSurface === 'HARD'), 'US Open registrou piso corporal incorreto');
  assert.equal(audited.filter(item => item.surfaceSlide).length, 0, 'slide de saibro apareceu na dura');
  const structural = new Set(['WAIT_COLLAPSED', 'LOW_AFTER_WAIT', 'RUNAROUND_RUSHED']);
  const contradictions = audited.filter(item => (item.movementCoherenceFlags ?? []).some(flag => structural.has(flag)));
  assert.ok(contradictions.length / Math.max(1, audited.length) <= 0.05, 'contradições estruturais demais na cadeia de movimento');
  const emergency = contacts.filter(item => item.bodyState === 'STRETCHED' || item.bodyState === 'LATE').length / contacts.length;
  assert.ok(emergency <= 0.36, `emergência global excessiva: ${emergency}`);
  process.stdout.write(`${JSON.stringify({
    version: 'movement-engine-v3',
    points: result.points,
    contacts: contacts.length,
    audited: audited.length,
    emergencyRate: +emergency.toFixed(3),
    structuralContradictionRate: +(contradictions.length / Math.max(1, audited.length)).toFixed(3),
    averageCoherence: +(audited.reduce((sum, item) => sum + item.movementCoherence, 0) / Math.max(1, audited.length)).toFixed(3),
  }, null, 2)}\n`);
} finally {
  Math.random = originalRandom;
  await vite.close();
}
