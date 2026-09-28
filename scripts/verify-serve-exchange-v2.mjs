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

const pct = (a, b) => b > 0 ? a / b : 0;
const addStats = (target, stats = {}, playerIndex = 0) => {
  for (const key of ['gamesServed','gamesHeld','pointsWonServing','pointsLostServing','serve1Total','serve1In','serve1WonPoints','serve1LostPoints','serve2WonPoints','serve2LostPoints','aces','doubleFaults','winners','unforcedErrors','forcedErrors']) {
    target[key] = (target[key] ?? 0) + (stats[key] ?? 0);
  }
  target.serveLog.push(...(stats.serveLog ?? []));
  target.returnLog.push(...(stats.returnLog ?? []));
  target.pointOutcomeLog.push(...(stats.pointOutcomeLog ?? []).map(item => ({
    ...item,
    serverIsPlayer: item.server === playerIndex,
  })));
};
const summarizePhysical = stats => {
  const firstPlayed = (stats.serve1WonPoints ?? 0) + (stats.serve1LostPoints ?? 0);
  const secondPlayed = (stats.serve2WonPoints ?? 0) + (stats.serve2LostPoints ?? 0);
  const challenges = stats.returnLog.map(item => item.returnChallenge).filter(Boolean);
  const advantages = stats.returnLog.map(item => item.serveAdvantage).filter(Boolean);
  const outcomeCounts = stats.returnLog.reduce((acc, item) => {
    const key = item.returnOutcome ?? 'UNKNOWN';
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
  const servicePointOutcomes = stats.pointOutcomeLog
    .filter(item => item.serverIsPlayer)
    .reduce((acc, item) => {
      const result = item.perspective === 'WON' ? 'W' : 'L';
      const key = `${result}:${item.outcomeType ?? 'OTHER'}`;
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {});
  const serviceRallyBands = stats.pointOutcomeLog
    .filter(item => item.serverIsPlayer)
    .reduce((acc, item) => {
      const result = item.perspective === 'WON' ? 'W' : 'L';
      const band = (item.rally ?? 0) <= 1 ? 'serve_or_return' : (item.rally ?? 0) <= 3 ? 'plus_one' : 'rally';
      const key = `${result}:${band}`;
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {});
  return {
    holdPct: +(pct(stats.gamesHeld, stats.gamesServed) * 100).toFixed(1),
    servePointPct: +(pct(stats.pointsWonServing, stats.pointsWonServing + stats.pointsLostServing) * 100).toFixed(1),
    firstInPct: +(pct(stats.serve1In, stats.serve1Total) * 100).toFixed(1),
    firstWonPct: +(pct(stats.serve1WonPoints, firstPlayed) * 100).toFixed(1),
    secondWonPct: +(pct(stats.serve2WonPoints, secondPlayed) * 100).toFixed(1),
    acesPerServiceGame: +(pct(stats.aces, stats.gamesServed)).toFixed(2),
    doubleFaultsPerServiceGame: +(pct(stats.doubleFaults, stats.gamesServed)).toFixed(2),
    winners: stats.winners ?? 0,
    unforcedErrors: stats.unforcedErrors ?? 0,
    forcedErrors: stats.forcedErrors ?? 0,
    avgReturnQuality: +(stats.returnLog.reduce((sum, item) => sum + (item.quality ?? 0), 0) / Math.max(1, stats.returnLog.length)).toFixed(3),
    returnOutcomes: outcomeCounts,
    pointOutcomes: servicePointOutcomes,
    rallyBands: serviceRallyBands,
    avgDeliveryThreat: +(stats.serveLog.reduce((sum, item) => sum + (item.delivery?.threat ?? 0), 0) / Math.max(1, stats.serveLog.length)).toFixed(3),
    compromisedReturnPct: +(pct(challenges.filter(item => item.compromised || item.realEmergency || item.jammed).length, challenges.length) * 100).toFixed(1),
    emergencyReturnPct: +(pct(challenges.filter(item => item.realEmergency).length, challenges.length) * 100).toFixed(1),
    strongResidualPct: +(pct(advantages.filter(item => item.level === 'STRONG' || item.level === 'DOMINANT').length, advantages.length) * 100).toFixed(1),
  };
};
const summarizeFast = stats => ({
  holdPct: +(pct(stats.gamesHeld, stats.gamesServed) * 100).toFixed(1),
  firstInPct: +(pct(stats.serve1In, stats.serve1Total) * 100).toFixed(1),
  firstWonPct: +(pct(stats.serve1Won, stats.serve1In) * 100).toFixed(1),
  secondWonPct: +(pct(stats.serve2Won, stats.serve2In) * 100).toFixed(1),
});

const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' });
const originalRandom = Math.random;
Math.random = mulberry32(0x5E2E2026);

try {
  const exchange = await vite.ssrLoadModule('/src/systems/shotengine/ServeExchangeEngine.js');
  const { NAMED_PLAYERS } = await vite.ssrLoadModule('/src/domain/players/players.js');
  const { simulateMatchFast } = await vite.ssrLoadModule('/src/core/FastSimulation.js');
  const { simulateMatchHeadless } = await vite.ssrLoadModule('/src/core/Headless.jsx');
  const elite = NAMED_PLAYERS.AJUBA;
  const returner = NAMED_PLAYERS.BJORNSTAD;
  const medium = NAMED_PLAYERS.PETROV;
  const controlledElite = {
    ...medium,
    id: 'SERVE_TEST_ELITE',
    name: 'Controle Elite',
    attrs: { ...medium.attrs, saqueForca: 96, saquePrecisao: 91 },
  };
  const controlledMedium = {
    ...medium,
    id: 'SERVE_TEST_MEDIUM',
    name: 'Controle Médio',
    attrs: { ...medium.attrs, saqueForca: 66, saquePrecisao: 74 },
  };

  const eliteDelivery = exchange.buildServeDelivery({ server: elite, caps: { servePower:.99, servePrecision:.92, tacticalVision:.82 }, kmh:202, isFirst:true, family:'SERVE_FLAT', direction:'WIDE' });
  const mediumDelivery = exchange.buildServeDelivery({ server: medium, caps: { servePower:.70, servePrecision:.82, tacticalVision:.76 }, kmh:172, isFirst:true, family:'SERVE_FLAT', direction:'CENTER' });
  assert.ok(eliteDelivery.threat > mediumDelivery.threat + 0.10, 'Saque elite precisa criar ameaça claramente superior');
  assert.ok(mediumDelivery.threat >= 0.48, 'Primeiro saque médio bem executado precisa preservar iniciativa');
  assert.ok(exchange.serveFaultChance({ precision:.92,power:.99,isFirst:true,family:'SERVE_FLAT',direction:'WIDE' }) >= 0.25, 'Primeiro saque agressivo não pode entrar perto de 90%');

  const fastTotals = Object.fromEntries([elite.id, medium.id, returner.id].map(id => [id, { gamesServed:0,gamesHeld:0,serve1Total:0,serve1In:0,serve1Won:0,serve2In:0,serve2Won:0 }]));
  for (let i = 0; i < 120; i++) {
    const pair = i % 2 === 0 ? [elite, returner] : [medium, returner];
    const result = simulateMatchFast(pair[0], pair[1], 'HARD', 3);
    for (const [player, stats] of [[pair[0], result.stats.a], [pair[1], result.stats.b]]) {
      for (const key of Object.keys(fastTotals[player.id])) fastTotals[player.id][key] += stats[key] ?? 0;
    }
  }

  const physicalStats = {
    [controlledElite.id]: { serveLog:[],returnLog:[],pointOutcomeLog:[] },
    [controlledMedium.id]: { serveLog:[],returnLog:[],pointOutcomeLog:[] },
  };
  for (let i = 0; i < 8; i++) {
    const eliteFirst = i % 2 === 0;
    const physical = simulateMatchHeadless(
      { playerData: eliteFirst ? controlledElite : controlledMedium },
      { playerData: eliteFirst ? controlledMedium : controlledElite },
      'US_OPEN',
      3,
    );
    addStats(physicalStats[controlledElite.id], eliteFirst ? physical.stats.a : physical.stats.b, eliteFirst ? 0 : 1);
    addStats(physicalStats[controlledMedium.id], eliteFirst ? physical.stats.b : physical.stats.a, eliteFirst ? 1 : 0);
  }

  const report = {
    version: exchange.SERVE_EXCHANGE_VERSION,
    deliveries: { elite:eliteDelivery, medium:mediumDelivery },
    fast120: Object.fromEntries(Object.entries(fastTotals).map(([id,stats]) => [id,summarizeFast(stats)])),
    physicalControlled: {
      [controlledElite.id]: summarizePhysical(physicalStats[controlledElite.id]),
      [controlledMedium.id]: summarizePhysical(physicalStats[controlledMedium.id]),
    },
  };
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);

  const fastElite = report.fast120[elite.id];
  const fastMedium = report.fast120[medium.id];
  assert.ok(fastElite.holdPct >= 70 && fastElite.holdPct <= 96, `Fast elite hold fora da faixa: ${fastElite.holdPct}`);
  assert.ok(fastMedium.holdPct >= 60 && fastMedium.holdPct <= 91, `Fast médio hold fora da faixa: ${fastMedium.holdPct}`);
  assert.ok(fastElite.holdPct > fastMedium.holdPct, 'Sacador elite precisa superar o médio em hold agregado');
  assert.ok(fastElite.firstInPct >= 54 && fastElite.firstInPct <= 74, `1º saque elite irreal: ${fastElite.firstInPct}`);
  const physicalElite = report.physicalControlled[controlledElite.id];
  const physicalMedium = report.physicalControlled[controlledMedium.id];
  assert.ok(physicalElite.firstInPct <= 78, `Headless voltou ao 1º saque artificialmente alto: ${physicalElite.firstInPct}`);
  assert.ok(physicalMedium.compromisedReturnPct > 0, 'Novo contrato não produziu nenhuma devolução comprometida');
  assert.ok(physicalMedium.strongResidualPct > 0, 'Saque não chegou vivo ao +1 em nenhum ponto');
  assert.ok(physicalElite.holdPct >= 65 && physicalElite.holdPct <= 92, `Hold físico elite fora da faixa: ${physicalElite.holdPct}`);
  assert.ok(physicalMedium.holdPct >= 62 && physicalMedium.holdPct <= 90, `Hold físico médio fora da faixa: ${physicalMedium.holdPct}`);
  assert.ok(physicalMedium.avgReturnQuality < physicalElite.avgReturnQuality, `Saque elite não reduziu a qualidade da devolução: ${physicalMedium.avgReturnQuality} vs ${physicalElite.avgReturnQuality}`);
  assert.ok(physicalMedium.compromisedReturnPct > physicalElite.compromisedReturnPct, `Saque elite não comprometeu mais devoluções: ${physicalMedium.compromisedReturnPct} vs ${physicalElite.compromisedReturnPct}`);
} finally {
  Math.random = originalRandom;
  await vite.close();
}
