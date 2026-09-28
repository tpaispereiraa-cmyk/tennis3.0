import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  applySplitStepToSteering,
  beginSplitStep,
  getSplitStepImpulse,
  getSplitStepSkill,
  updateSplitStep,
} from '../src/systems/movement/SplitStep.js';

function player(skill, id = 1) {
  return {
    id,
    vel: { x: 3.1, y: 0.25 },
    attrs: { leitura: skill, explosividade: skill, velocidade: skill, devolucao: skill },
    _tm: { recoverInertiaTimer: 0, splitStep: null },
  };
}

function game(point = 12, rally = 3) {
  return {
    ball: { lastHitBy: 0 },
    rally,
    _currentPointId: point,
    pointHistory: [],
  };
}

const limited = player(38);
const elite = player(94);
assert.ok(getSplitStepSkill(elite, true) > getSplitStepSkill(limited, true));
const limitedSplit = beginSplitStep(limited, game(), false);
const eliteSplit = beginSplitStep(elite, game(), false);
assert.ok(eliteSplit.quality > limitedSplit.quality, 'elite deve produzir split de maior qualidade');
assert.ok(eliteSplit.landingOffset <= limitedSplit.landingOffset, 'elite deve pousar mais perto da janela ideal');

const airborne = player(65);
const airborneState = beginSplitStep(airborne, game(18), false);
airborneState.phase = 'AIRBORNE';
airborneState.landingTimer = 0.06;
const steered = applySplitStepToSteering(airborne, {
  desiredVx: -5,
  desiredVy: 0,
  maxAccelStep: 1,
  maxDecelStep: 1,
});
assert.ok(steered.desiredVx > -2, 'no ar o jogador deve conservar momentum em vez de inverter instantaneamente');
assert.ok(steered.maxAccelStep > 0, 'split não pode congelar completamente o jogador');

for (let i = 0; i < 30 && airborne._tm.splitStep.phase === 'AIRBORNE'; i++) {
  updateSplitStep(airborne, 1 / 60);
}
assert.notEqual(airborne._tm.splitStep.phase, 'AIRBORNE', 'jogador precisa aterrissar');
assert.ok(getSplitStepImpulse(airborne) > 0 || airborne._tm.splitStep.timing === 'MISSED');

const timings = new Set();
for (let point = 0; point < 240; point++) {
  const stressed = point % 3 === 0;
  const sample = player(stressed ? 24 : 42, 3);
  if (stressed) {
    sample.vel.x = 5.8;
    sample._tm.recoverInertiaTimer = 0.22;
  }
  timings.add(beginSplitStep(sample, game(point, point % 8), point % 2 === 0).timing);
}
assert.ok(timings.has('ON_TIME'), 'modelo precisa produzir splits corretos');
assert.ok(timings.has('LATE'), 'modelo precisa produzir splits atrasados');
assert.ok(timings.has('MISSED'), 'modelo precisa produzir splits perdidos');

const movementSource = fs.readFileSync(new URL('../src/systems/movement/TennisMovement.js', import.meta.url), 'utf8');
assert.equal(movementSource.includes('player.vel.x *= 0.42'), false, 'congelamento exponencial antigo ainda existe');
assert.equal(movementSource.includes('player.vel.y *= 0.42'), false, 'congelamento exponencial antigo ainda existe');

console.log('✓ split de elite pousa melhor e produz primeira passada superior');
console.log('✓ fase aérea conserva momentum sem congelar o jogador');
console.log('✓ existem timings ON_TIME, LATE e MISSED conforme habilidade/contexto');
console.log('✓ multiplicador exponencial 0.42 foi removido');
