import assert from 'node:assert/strict';
import { createServer } from 'vite';

globalThis.window ??= {};
const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' });
const summary = {};
try {
  const { NAMED_PLAYERS } = await vite.ssrLoadModule('/src/domain/players/players.js');
  const { simulateMatchMid } = await vite.ssrLoadModule('/src/core/Headless.jsx');
  const matches = Number(process.env.FINGERPRINT_MATCHES ?? 2);
  const opponent = NAMED_PLAYERS.HASSAN ?? Object.values(NAMED_PLAYERS).find(p => /Hassan/i.test(p.name));
  assert.ok(opponent);
  for (const id of (process.env.FINGERPRINT_PLAYER ? [process.env.FINGERPRINT_PLAYER] : ['NAKAMURA', 'VANTORINI', 'KASPERK', 'BJORNSTAD'])) {
    const player = NAMED_PLAYERS[id];
    assert.ok(player);
    const total = { shots: 0, families: {}, directions: {}, serveDirections: {}, blueprints: {}, patterns: {}, approaches: 0, runarounds: 0, returnAttacks: 0, serves: 0, dropConsidered: 0, dropGapSum: 0, dropGapMin: 9, insideContactCount: 0, cleanContactCount: 0, contactTimeSum: 0, contactTimeSamples: 0, contactHeightSum: 0, baselineDepthSum: 0, positionSamples: 0, rallyLengthSum: 0, rallyLengthCount: 0 };
    for (let i = 0; i < matches; i++) {
      const result = simulateMatchMid({ playerData: i ? opponent : player }, { playerData: i ? player : opponent }, 'US_OPEN', 3);
      const p = result.gs.players.find(p => p.id === player.id || p.name === player.name);
      const fp = p?.ctx?.matchCtx?.behaviorFingerprint;
      assert.ok(fp?.shots > 0, `${id}: sem golpes observados; jogadores=${result.gs.players.map(x => `${x.id}:${x.name}:${x.ctx?.matchCtx?.behaviorFingerprint?.shots ?? 0}`).join(',')}`);
      for (const key of ['shots', 'approaches', 'runarounds', 'returnAttacks', 'serves', 'dropConsidered', 'dropGapSum', 'insideContactCount', 'cleanContactCount', 'contactTimeSum', 'contactTimeSamples', 'contactHeightSum', 'baselineDepthSum', 'positionSamples']) total[key] += fp[key] ?? 0;
      total.dropGapMin = Math.min(total.dropGapMin, fp.dropGapMin ?? 9);
      for (const key of ['families', 'directions', 'serveDirections', 'blueprints', 'patterns']) for (const [k, v] of Object.entries(fp[key] ?? {})) total[key][k] = (total[key][k] ?? 0) + v;
      for (const length of p?.stats?.rallyLengths ?? []) { total.rallyLengthSum += length; total.rallyLengthCount++; }
    }
    const pct = (count) => +(100 * count / Math.max(1, total.shots)).toFixed(1);
    summary[id] = { shots: total.shots, dropPct: pct(total.families.DROP ?? 0), dropConsidered: total.dropConsidered, dropGapMean: +(total.dropGapSum / Math.max(1, total.dropConsidered)).toFixed(3), dropGapMin: +total.dropGapMin.toFixed(3), insideContactCount: total.insideContactCount, cleanContactCount: total.cleanContactCount, slicePct: pct(total.families.SLICE ?? 0),
      topspinPct: pct(total.families.TOPSPIN ?? 0), flatPct: pct(total.families.FLAT_DRIVE ?? 0),
      crossPct: pct(total.directions.CROSS ?? 0), dtlPct: pct(total.directions.DTL ?? 0),
      shortAnglePct: pct(total.blueprints.TOPSPIN_SHORT_ANGLE ?? 0), approachPct: pct(total.approaches),
      runaroundPct: pct(total.runarounds), returnAttackCount: total.returnAttacks,
      serveWidePct: +(100 * (total.serveDirections.WIDE ?? 0) / Math.max(1, total.serves)).toFixed(1),
      serveBodyPct: +(100 * (total.serveDirections.BODY ?? 0) / Math.max(1, total.serves)).toFixed(1),
      serveTPct: +(100 * (total.serveDirections.CENTER ?? 0) / Math.max(1, total.serves)).toFixed(1),
      contactTimeS: total.contactTimeSamples ? +(total.contactTimeSum / total.contactTimeSamples).toFixed(3) : null,
      rallyLengthMean: total.rallyLengthCount ? +(total.rallyLengthSum / total.rallyLengthCount).toFixed(2) : null,
      baselineDepthM: +(total.baselineDepthSum / Math.max(1, total.positionSamples)).toFixed(2),
      contactHeightM: +(total.contactHeightSum / Math.max(1, total.shots)).toFixed(2), patterns: total.patterns };
  }
  if (!process.env.FINGERPRINT_PLAYER) {
    assert.ok(summary.NAKAMURA.slicePct > summary.VANTORINI.slicePct + 8, 'Nakamura perdeu seu perfil de slice');
    assert.ok(summary.VANTORINI.runaroundPct > summary.KASPERK.runaroundPct + 3, 'Vantorini perdeu a busca pelo forehand');
    assert.ok(summary.KASPERK.baselineDepthM > summary.VANTORINI.baselineDepthM + 0.1, 'Kasperk não recupera mais fundo');
  }
  console.log(JSON.stringify(summary, null, 2));
} finally {
  await vite.close();
}
