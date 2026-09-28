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

function average(log, key) {
  const values = log.map(item => item?.[key]).filter(Number.isFinite);
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}

function countBy(log, key) {
  return log.reduce((counts, item) => {
    const value = item?.[key] ?? 'UNKNOWN';
    counts[value] = (counts[value] ?? 0) + 1;
    return counts;
  }, {});
}

function modeSplit(log) {
  return {
    rally: countBy(log.filter(item => !item?.isReturnContact), 'executionMode'),
    returns: countBy(log.filter(item => item?.isReturnContact), 'executionMode'),
  };
}

const vite = await createServer({
  server: { middlewareMode: true },
  appType: 'custom',
  logLevel: 'error',
});
const originalRandom = Math.random;
Math.random = mulberry32(0xE034B);

try {
  const executionQualityModule = await vite.ssrLoadModule('/src/systems/shotengine/ShotExecutionQuality.js');
  const errorModule = await vite.ssrLoadModule('/src/systems/shotengine/ShotErrorModel.js');
  const headless = await vite.ssrLoadModule('/src/core/Headless.jsx');

  const baseCaps = {
    wingPower: 0.78,
    wingControl: 0.84,
    topspin: 0.82,
    slice: 0.66,
    touch: 0.70,
    reading: 0.80,
    tacticalVision: 0.82,
    consistency: 0.84,
    mentality: 0.78,
    errorResistance: 0.80,
    spinSecurity: 0.81,
    defense: 0.72,
  };
  const baseContext = {
    capabilities: baseCaps,
    body: {
      contactReadiness: 0.74,
      arrivalMargin: 0.04,
      contactPositionError: 0.08,
      reach: 1.04,
    },
    player: { pos: { x: 0, y: 10 }, naturalSignature: null },
    opponent: { pos: { x: 1.5, y: -10 } },
    ballState: { pos: { x: 0.7, y: 9.2 }, z: 0.92 },
    gs: { courtMods: {} },
  };
  const cleanQuality = { quality: 0.72, bodyState: 'PLANTED', canContact: true };
  const build = { family: 'TOPSPIN', intent: 'BUILD', direction: 'CROSS' };
  const finish = { family: 'TOPSPIN', intent: 'FINISH', direction: 'DTL', finishMode: 'kill' };
  const buildProfile = executionQualityModule.evaluateExecutionQuality(baseContext, cleanQuality, build);
  const finishProfile = executionQualityModule.evaluateExecutionQuality(baseContext, cleanQuality, finish);

  assert.ok(finishProfile.intentDemand > buildProfile.intentDemand, 'FINISH precisa exigir mais da execução que BUILD');
  assert.ok(buildProfile.intentFit > finishProfile.intentFit, 'Contato idêntico deve encaixar melhor em BUILD que em FINISH');
  assert.equal(buildProfile.executionMode, 'FULL', 'BUILD limpo e bem preparado deve sair inteiro');
  assert.equal(finishProfile.executionMode, 'SHAPED', 'A mesma bola pode exigir uma finalização com margem');

  const powerOnlyContext = {
    ...baseContext,
    capabilities: { ...baseCaps, wingPower: 0.96, wingControl: 0.44, consistency: 0.50, reading: 0.58 },
  };
  const balancedFlat = executionQualityModule.evaluateExecutionQuality(baseContext, cleanQuality, { ...build, family: 'FLAT_DRIVE' });
  const powerOnlyFlat = executionQualityModule.evaluateExecutionQuality(powerOnlyContext, cleanQuality, { ...build, family: 'FLAT_DRIVE' });
  assert.ok(balancedFlat.technique > powerOnlyFlat.technique, 'Potência sem controle não pode executar o flat como um jogador completo');

  const emergencyContext = {
    ...baseContext,
    body: {
      contactReadiness: 0.18,
      arrivalMargin: -0.20,
      contactPositionError: 0.46,
      reach: 1.08,
      defensiveContact: { active: true },
    },
  };
  const emergencyQuality = { quality: 0.42, bodyState: 'STRETCHED', canContact: true };
  const defend = { family: 'TOPSPIN', intent: 'DEFEND', direction: 'CENTER' };
  const emergencyDefendProfile = executionQualityModule.evaluateExecutionQuality(emergencyContext, emergencyQuality, defend);
  const emergencyFinishProfile = executionQualityModule.evaluateExecutionQuality(emergencyContext, emergencyQuality, finish);
  assert.equal(emergencyDefendProfile.executionMode, 'SURVIVAL', 'Contato emergencial precisa produzir execução de sobrevivência');
  const defendRisk = errorModule.estimateErrorPressure({
    context: emergencyContext,
    quality: { ...emergencyQuality, executionProfile: emergencyDefendProfile },
    decision: defend,
    shotDef: { baseRisk: 0.30 },
  });
  const finishRisk = errorModule.estimateErrorPressure({
    context: emergencyContext,
    quality: { ...emergencyQuality, executionProfile: emergencyFinishProfile },
    decision: finish,
    shotDef: { baseRisk: 0.30 },
  });
  assert.ok(finishRisk > defendRisk, 'Acelerar esticado deve custar mais que sobreviver com margem');

  const result = headless.simulateMatchHeadless(
    { namedKey: 'VANTORINI' },
    { namedKey: 'HASSAN' },
    'US_OPEN',
    3,
  );
  const logA = result?.stats?.a?.shotLog ?? [];
  const logB = result?.stats?.b?.shotLog ?? [];
  assert.ok(logA.length >= 40 && logB.length >= 40, 'Headless não produziu golpes suficientes');
  assert.ok(logA.every(item => Number.isFinite(item.executionQuality)), 'Telemetria A perdeu executionQuality');
  assert.ok(logB.every(item => Number.isFinite(item.intentFit)), 'Telemetria B perdeu intentFit');
  assert.ok(logA.every(item => Number.isFinite(item.mechanicalIntegrity)), 'Telemetria A perdeu integridade mecânica');
  assert.ok(logB.every(item => Number.isFinite(item.wingSwitchSeverity)), 'Telemetria B perdeu severidade de troca de ala');
  assert.ok(logA.some(item => item.strokePreparationMode === 'PREPARED'), 'Nenhuma preparação corporal íntegra foi observada');
  assert.ok(
    [...logA, ...logB].some(item => ['ADAPTED', 'JAMMED', 'SURVIVAL', 'COMPROMISED'].includes(item.strokePreparationMode)),
    'A partida não produziu nenhuma adaptação corporal',
  );
  assert.ok(logA.some(item => item.executionMode === 'FULL'), 'Nenhuma execução FULL foi observada');
  assert.ok(logA.some(item => item.executionMode !== 'FULL') || logB.some(item => item.executionMode !== 'FULL'), 'Nenhuma execução sob compromisso foi observada');

  process.stdout.write(`${JSON.stringify({
    synthetic: {
      build: buildProfile,
      finish: finishProfile,
      emergencyRisk: { defend: +defendRisk.toFixed(3), finish: +finishRisk.toFixed(3) },
    },
    match: {
      winner: result?.winner?.name ?? null,
      sets: result?.sets ?? null,
      Vantorini: {
        avgContactQuality: average(logA, 'quality'),
        avgExecutionQuality: average(logA, 'executionQuality'),
        avgIntentFit: average(logA, 'intentFit'),
        avgErrorRisk: average(logA, 'errorRisk'),
        avgMissChance: average(logA, 'missChance'),
        executionModes: countBy(logA, 'executionMode'),
        strokePreparationModes: countBy(logA, 'strokePreparationMode'),
        avgMechanicalIntegrity: average(logA, 'mechanicalIntegrity'),
        avgWingSwitchSeverity: average(logA, 'wingSwitchSeverity'),
        executionModesByPhase: modeSplit(logA),
      },
      Hassan: {
        avgContactQuality: average(logB, 'quality'),
        avgExecutionQuality: average(logB, 'executionQuality'),
        avgIntentFit: average(logB, 'intentFit'),
        avgErrorRisk: average(logB, 'errorRisk'),
        avgMissChance: average(logB, 'missChance'),
        executionModes: countBy(logB, 'executionMode'),
        strokePreparationModes: countBy(logB, 'strokePreparationMode'),
        avgMechanicalIntegrity: average(logB, 'mechanicalIntegrity'),
        avgWingSwitchSeverity: average(logB, 'wingSwitchSeverity'),
        executionModesByPhase: modeSplit(logB),
      },
    },
  }, null, 2)}\n`);
} finally {
  Math.random = originalRandom;
  await vite.close();
}
