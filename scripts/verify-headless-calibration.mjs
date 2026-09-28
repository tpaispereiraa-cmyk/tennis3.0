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

function sumMap(map = {}) {
  return Object.values(map).reduce((sum, value) => sum + (Number(value) || 0), 0);
}

function average(values = []) {
  const valid = values.filter(Number.isFinite);
  return valid.length ? valid.reduce((sum, value) => sum + value, 0) / valid.length : null;
}

function emergencyRate(stats = {}) {
  const rally = (stats.contactLog ?? []).filter(item => !item?.isReturnContact);
  const emergency = rally.filter(item => item?.bodyState === 'STRETCHED' || item?.bodyState === 'LATE');
  return rally.length ? emergency.length / rally.length : 0;
}

function validateMatch(result, courtKey) {
  const a = result?.stats?.a ?? {};
  const b = result?.stats?.b ?? {};
  const points = result?.points ?? 0;
  const outcomes = sumMap(a.pointsWonByOutcome) + sumMap(b.pointsWonByOutcome);
  assert.equal(outcomes, points, `${courtKey}: partição de outcomes não fecha`);
  assert.equal(a.pointOutcomeCount ?? (a.pointOutcomeLog ?? []).length, points, `${courtKey}: trilha A perdeu pontos`);
  assert.equal(b.pointOutcomeCount ?? (b.pointOutcomeLog ?? []).length, points, `${courtKey}: trilha B perdeu pontos`);
  assert.equal(a.winners ?? 0, a.pointsWonByOutcome?.WINNER ?? 0, `${courtKey}: winners A duplicados`);
  assert.equal(b.winners ?? 0, b.pointsWonByOutcome?.WINNER ?? 0, `${courtKey}: winners B duplicados`);
  assert.equal(a.forcedErrors ?? 0, a.pointsLostByOutcome?.FORCED_ERROR ?? 0, `${courtKey}: FE A duplicados`);
  assert.equal(b.forcedErrors ?? 0, b.pointsLostByOutcome?.FORCED_ERROR ?? 0, `${courtKey}: FE B duplicados`);
  assert.ok(emergencyRate(a) <= 0.38, `${courtKey}: emergência de rally A excessiva`);
  assert.ok(emergencyRate(b) <= 0.38, `${courtKey}: emergência de rally B excessiva`);

  const returnLogs = [...(a.returnLog ?? []), ...(b.returnLog ?? [])];
  assert.ok(returnLogs.length >= 12, `${courtKey}: cobertura insuficiente de devoluções`);
  const returnEmergencies = returnLogs.filter(item => item?.returnRealEmergency || item?.shotEngine?.returnRealEmergency).length;
  const returnEmergencyRate = returnEmergencies / returnLogs.length;
  assert.ok(returnEmergencyRate <= 0.32, `${courtKey}: emergência de devolução excessiva (${(returnEmergencyRate * 100).toFixed(1)}%)`);

  const serveThreats = [...(a.serveLog ?? []), ...(b.serveLog ?? [])]
    .map(item => item?.pressureHint)
    .filter(Number.isFinite);
  const avgThreat = average(serveThreats);
  assert.ok(avgThreat > 0.22 && avgThreat < 0.90, `${courtKey}: ameaça do saque saturada`);
  assert.ok(Math.max(...serveThreats) - Math.min(...serveThreats) >= 0.08, `${courtKey}: ameaça do saque sem gradação`);

  const outcomeKinds = new Set([
    ...Object.keys(a.pointsWonByOutcome ?? {}),
    ...Object.keys(b.pointsWonByOutcome ?? {}),
  ]);
  assert.ok(outcomeKinds.size >= 3, `${courtKey}: desfechos sem variedade`);

  return {
    courtKey,
    winner: result?.winner?.name ?? null,
    sets: result?.sets ?? null,
    points,
    avgRally: average(a.rallyLengths ?? []),
    avgServeThreat: avgThreat,
    rallyEmergency: {
      Vantorini: emergencyRate(a),
      Hassan: emergencyRate(b),
    },
    returnEmergencyRate,
    approachConversion: {
      Vantorini: {
        intents: (a.shotLog ?? []).filter(item => item?.intent === 'APPROACH').length,
        transitions: a.netApproaches ?? 0,
        actions: (a.shotLog ?? []).length,
      },
      Hassan: {
        intents: (b.shotLog ?? []).filter(item => item?.intent === 'APPROACH').length,
        transitions: b.netApproaches ?? 0,
        actions: (b.shotLog ?? []).length,
      },
    },
    outcomes: {
      Vantorini: a.pointsWonByOutcome,
      Hassan: b.pointsWonByOutcome,
    },
  };
}

const vite = await createServer({
  server: { middlewareMode: true },
  appType: 'custom',
  logLevel: 'error',
});
const originalRandom = Math.random;
Math.random = mulberry32(0xCA11B7A7);

try {
  const headless = await vite.ssrLoadModule('/src/core/Headless.jsx');
  const matrix = [];
  for (const courtKey of ['US_OPEN', 'ROLAND_GARROS', 'WIMBLEDON']) {
    const result = headless.simulateMatchHeadless(
      { namedKey: 'VANTORINI' },
      { namedKey: 'HASSAN' },
      courtKey,
      3,
    );
    matrix.push(validateMatch(result, courtKey));
  }
  const approachTotals = matrix.reduce((total, item) => ({
    intents: total.intents + item.approachConversion.Vantorini.intents + item.approachConversion.Hassan.intents,
    transitions: total.transitions + item.approachConversion.Vantorini.transitions + item.approachConversion.Hassan.transitions,
  }), { intents: 0, transitions: 0 });
  assert.ok(approachTotals.intents === 0 || approachTotals.transitions > 0, 'Intenção APPROACH não virou transição física em nenhuma superfície');
  // Uma transição também pode nascer de bola curta, resposta fraca ou janela
  // espontânea de HUNTER/PROACTIVE. Portanto netApproaches não é subconjunto
  // estrito de intent=APPROACH; o teto correto é o total de ações registradas.
  const totalShotActions = matrix.reduce((sum, item) => sum
    + item.approachConversion.Vantorini.actions
    + item.approachConversion.Hassan.actions, 0);
  assert.ok(approachTotals.transitions <= totalShotActions, 'Transições de rede excederam o volume total de ações');
  process.stdout.write(`${JSON.stringify({ calibrationVersion: 'movement-engine-v3', matrix }, null, 2)}\n`);
} finally {
  Math.random = originalRandom;
  await vite.close();
}
