import assert from 'node:assert/strict';
import { seedRand } from '../src/core/math.js';
import { SHOT_BLUEPRINTS } from '../src/systems/shotengine/ShotBlueprints.js';
import { buildShotExecution } from '../src/systems/shotengine/ShotExecution.js';
import { decideConcreteShot, generateShotCandidates } from '../src/systems/shotengine/ShotTacticalBrain.js';

function context({ buildStyle = 'VARIED', riskProfile = 'CALCULATED', signature = null, caps = {}, phase = 'RALLY_ATTACK', opponent = {}, player = {}, body = {}, ball = {}, memory = {} } = {}) {
  const prefs = { buildStyle, riskProfile, rallyCadence: 'BALANCED', netGame: 'OPPORTUNIST' };
  return {
    phase, side: 1,
    player: { id: 'p', pos: { x: 1.55, y: 8.15 }, prefs, naturalSignature: signature, ctx: { rallyPressure: 0.14, matchCtx: { touchVariation: { heat: 0, cooldownPoints: 0 } } }, ...player },
    opponent: { id: 'o', pos: { x: -1.65, y: -10.15 }, vel: { x: 0.62, y: 0 }, ctx: {}, ...opponent },
    prefs,
    capabilities: { wing: 'FOREHAND', wingPower: 0.78, wingControl: 0.79, forehandPower: 0.82, forehandControl: 0.80, topspin: 0.78, slice: 0.68, touch: 0.70, tacticalVision: 0.78, aggression: 0.70, consistency: 0.76, reading: 0.75, defense: 0.65, movement: 0.72, volley: 0.64, smash: 0.64, mentality: 0.72, stamina: 0.90, ...caps },
    body: { contactReadiness: 0.80, arrivalMargin: 0.05, ...body },
    ballState: { pos: { x: 1.45, y: 7.75, z: 1.05 }, z: 1.05, speed: 22, ...ball },
    score: { rally: 5 }, memory: { shots: [], ...memory }, gs: {},
  };
}

const clean = { quality: 0.77, bodyState: 'PLANTED' };
assert.ok(SHOT_BLUEPRINTS.length >= 28, 'o repertório concreto encolheu');
assert.equal(new Set(SHOT_BLUEPRINTS.map((bp) => bp.id)).size, SHOT_BLUEPRINTS.length, 'ids de blueprint duplicados');
const banana = SHOT_BLUEPRINTS.find((bp) => bp.id === 'BANANA_CURVE');
assert.ok(banana && banana.trajectory.curveSpin >= 0.8, 'banana precisa possuir curva física forte');

const poorDrop = generateShotCandidates(context({ buildStyle: 'DROP_VARIATION', body: { contactReadiness: 0.28, arrivalMargin: -0.14 }, ball: { pos: { x: 0.4, y: 9.55, z: 0.43 }, z: 0.43 } }), { quality: 0.40, bodyState: 'LOW_PICKUP' });
assert.equal(poorDrop.candidates.some((candidate) => candidate.blueprint.family === 'DROP'), false, 'contato baixo e atrasado não pode gerar drop ofensivo');

const passing = generateShotCandidates(context({ phase: 'PASSING', opponent: { pos: { x: 0.5, y: -5.8 } } }), clean);
assert.ok(passing.candidates.some((candidate) => candidate.blueprint.id === 'TOPSPIN_PASS_CROSS'), 'passada de topspin ausente');
assert.ok(passing.candidates.some((candidate) => candidate.blueprint.id === 'LOB_TOPSPIN_PASS'), 'lob de passada ausente');

function distribution(ctx, n = 500) {
  const counts = {};
  for (let i = 0; i < n; i += 1) {
    seedRand(1000 + i);
    const id = decideConcreteShot(ctx, clean).blueprintId;
    counts[id] = (counts[id] ?? 0) + 1;
  }
  return counts;
}

const touchCounts = distribution(context({ buildStyle: 'DROP_VARIATION', caps: { touch: 0.82, slice: 0.78, wingControl: 0.83 } }));
const touchVariations = Object.entries(touchCounts).filter(([id]) => id.includes('DROP') || id.includes('SHORT')).reduce((sum, [, count]) => sum + count, 0);
assert.ok(touchVariations > 100, 'artista de toque não expressa variação');
assert.ok(Object.keys(touchCounts).length >= 3, 'artista de toque virou spam de um único golpe');

const powerCounts = distribution(context({ buildStyle: 'DTL_HUNTER', riskProfile: 'ALLOUT', caps: { touch: 0.46, slice: 0.49, wingPower: 0.92, forehandPower: 0.94 } }));
const powerDrops = Object.entries(powerCounts).filter(([id]) => id.includes('DROP')).reduce((sum, [, count]) => sum + count, 0);
assert.ok(powerDrops <= 10, 'jogador de potência sem toque está usando drop em excesso');
assert.ok(Object.keys(powerCounts).some((id) => id.startsWith('FLAT_')), 'agressor não escolhe drives planos');

const bananaCtx = context({ buildStyle: 'HEAVY_SPIN_PRESSURE', signature: 'FH_BANANA_CROSS', caps: { topspin: 0.94, wingControl: 0.87 } });
const bananaCounts = distribution(bananaCtx);
assert.ok((bananaCounts.BANANA_CURVE ?? 0) > 80, 'assinatura banana não aparece de forma perceptível');
assert.ok((bananaCounts.BANANA_CURVE ?? 0) < 400, 'assinatura banana virou spam automático');

let bananaDecision = null;
for (let i = 0; i < 100 && !bananaDecision; i += 1) {
  seedRand(5000 + i);
  const decision = decideConcreteShot(bananaCtx, clean);
  if (decision.blueprintId === 'BANANA_CURVE') bananaDecision = decision;
}
assert.ok(bananaDecision, 'não foi possível executar a banana');
const execution = buildShotExecution(bananaCtx, clean, bananaDecision);
assert.ok(Math.abs(execution.actualSpinZ) > 5, 'banana não recebeu curva lateral na execução');
assert.equal(execution.blueprintId, 'BANANA_CURVE');

console.log('shot brain v2 ok', { blueprints: SHOT_BLUEPRINTS.length, touchCounts, powerCounts, bananaCounts, bananaSpinZ: execution.actualSpinZ.toFixed(2) });
