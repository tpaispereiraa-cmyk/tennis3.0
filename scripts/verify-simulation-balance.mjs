import assert from 'node:assert/strict';
import { createServer } from 'vite';

globalThis.window ??= {};
const report = process.stdout.write.bind(process.stdout);

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

function resolvePlayer(pool, pattern) {
  const player = pool.find(candidate => pattern.test(candidate?.name ?? ''));
  assert.ok(player, `Jogador não encontrado: ${pattern}`);
  return player;
}

function runSeries(simulate, playerA, playerB, count, options = {}) {
  let winsA = 0;
  for (let index = 0; index < count; index++) {
    const swapped = index % 2 === 1;
    const first = swapped ? playerB : playerA;
    const second = swapped ? playerA : playerB;
    const result = simulate(first, second, options);
    const winnerId = Array.isArray(result?.sets)
      ? (result.sets[0] > result.sets[1] ? first.id : second.id)
      : result?.winner?.id;
    if (winnerId === playerA.id) winsA++;
    assert.ok(
      (result?.setsDetail ?? []).every(pair =>
        Array.isArray(pair) && pair.every(Number.isFinite)
      ),
      'Placar não finito detectado',
    );
  }
  return winsA / count;
}

const vite = await createServer({
  server: { middlewareMode: true },
  appType: 'custom',
  logLevel: 'error',
});

const originalRandom = Math.random;
const benchmarkSeed = Number(process.env.BALANCE_SEED ?? 0xC0FFEE);
Math.random = mulberry32(Number.isFinite(benchmarkSeed) ? benchmarkSeed : 0xC0FFEE);

try {
  const playersModule = await vite.ssrLoadModule('/src/domain/players/players.js');
  const forms = await vite.ssrLoadModule('/src/systems/progression/formas.jsx');
  const fast = await vite.ssrLoadModule('/src/core/FastSimulation.js');
  const headless = await vite.ssrLoadModule('/src/core/Headless.jsx');

  const players = Object.values(playersModule.NAMED_PLAYERS ?? {});
  const vantorini = resolvePlayer(players, /Vantorini/i);
  const hassan = resolvePlayer(players, /Hassan/i);
  const baseHassan = playersModule.overallRating(hassan.attrs);
  const baseVantorini = playersModule.overallRating(vantorini.attrs);
  const hotHassan = playersModule.overallRating(forms.applyFormModifier(hassan.attrs, 100));
  const coldVantorini = playersModule.overallRating(forms.applyFormModifier(vantorini.attrs, -100));

  assert.ok(hotHassan - baseHassan <= 4, 'Forma positiva ainda altera talento demais');
  assert.ok(baseVantorini - coldVantorini <= 4, 'Forma negativa ainda altera talento demais');
  assert.equal(forms.capTournamentFormDelta(86), 25);
  assert.equal(forms.applyMonthlyFormRegression(100), 82);
  assert.equal(forms.applySeasonReset(100), 25);

  Math.random = mulberry32(benchmarkSeed + 11);
  const fastHard = runSeries(
    (a, b) => fast.simulateMatchFast(a, b, 'HARD', 3, { tournamentTier: 'MASTERS_1000' }),
    vantorini,
    hassan,
    800,
  );
  Math.random = mulberry32(benchmarkSeed + 23);
  const fastStreet = runSeries(
    (a, b) => fast.simulateMatchFast(a, b, 'STREET', 3, { tournamentTier: 'GRAND_SLAM' }),
    vantorini,
    hassan,
    300,
  );
  const equalOpponent = {
    ...vantorini,
    id: `${vantorini.id}_BALANCE_CLONE`,
    name: `${vantorini.name} Clone`,
    attrs: { ...vantorini.attrs },
  };
  Math.random = mulberry32(benchmarkSeed + 37);
  const fastSymmetry = runSeries(
    (a, b) => fast.simulateMatchFast(a, b, 'HARD', 3),
    vantorini,
    equalOpponent,
    800,
  );

  assert.ok(fastHard >= 0.72 && fastHard <= 0.99, `Favoritismo Fast fora da faixa: ${fastHard}`);
  assert.ok(fastStreet >= 0.68 && fastStreet <= 1, `Street Fast fora da faixa: ${fastStreet}`);
  assert.ok(fastSymmetry >= 0.43 && fastSymmetry <= 0.57, `Viés de lado no Fast: ${fastSymmetry}`);
  report(`Fast: hard=${fastHard.toFixed(3)} street=${fastStreet.toFixed(3)} symmetry=${fastSymmetry.toFixed(3)}\n`);

  const heavy = process.env.BALANCE_HEAVY === '1';
  const midCount = heavy ? 12 : 8;
  // O full Headless mantém buffers visuais muito grandes fora do navegador.
  // A calibração automatizada usa Mid, que compartilha o mesmo motor físico;
  // full Headless fica como smoke opcional.
  const headlessCount = heavy ? 2 : 0;
  Math.random = mulberry32(benchmarkSeed + 51);
  const midHard = runSeries(
    (a, b) => headless.simulateMatchMid(
      { playerData: a },
      { playerData: b },
      'US_OPEN',
      3,
      null,
      false,
      { category: 'MASTERS_1000', round: 'QF' },
    ),
    vantorini,
    hassan,
    midCount,
  );
  report(`Mid: hard=${midHard.toFixed(3)} n=${midCount}\n`);
  Math.random = mulberry32(benchmarkSeed + 73);
  const headlessHard = headlessCount > 0
    ? runSeries(
        (a, b) => headless.simulateMatchHeadless(
          { playerData: a },
          { playerData: b },
          'US_OPEN',
          3,
          null,
          false,
          { category: 'MASTERS_1000', round: 'QF', radarFollowed: true },
        ),
        vantorini,
        hassan,
        headlessCount,
      )
    : null;
  if (headlessHard != null) report(`Headless: hard=${headlessHard.toFixed(3)} n=${headlessCount}\n`);

  report(`${JSON.stringify({
    form: {
      hassan: { base: baseHassan, hot: hotHassan },
      vantorini: { base: baseVantorini, cold: coldVantorini },
    },
    winRates: {
      fastHard,
      fastStreet,
      fastSymmetry,
      midHard,
      headlessHard,
    },
    samples: {
      fastHard: 800,
      fastStreet: 300,
      fastSymmetry: 800,
      midHard: midCount,
      headlessHard: headlessCount,
    },
  }, null, 2)}\n`);
} finally {
  Math.random = originalRandom;
  await vite.close();
}
