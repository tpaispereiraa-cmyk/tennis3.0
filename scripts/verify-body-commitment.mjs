import assert from 'node:assert/strict';
import {
  applyBodyCommitmentToSteering,
  createBodyCommitment,
  getBodyCommitmentPenalty,
  updateBodyCommitment,
} from '../src/systems/movement/BodyCommitment.js';

function makePlayer(skill = 60, velX = 3.2) {
  const player = {
    pos: { x: 0, y: 11.8 },
    vel: { x: velX, y: 0 },
    attrs: {
      leitura: skill,
      explosividade: skill,
      velocidade: skill,
      equilibrio: skill,
    },
    _tm: {},
    _perceptionState: { confidence: 0.52 },
  };
  player._tm.bodyCommitment = createBodyCommitment(player, 'shot-1');
  return player;
}

const defender = makePlayer(60);
const reversal = updateBodyCommitment(defender, { x: -4, y: 11.8 }, 1 / 60, {
  shotKey: 'shot-1',
  perceptionConfidence: 0.52,
  perceptionSkill: 0.60,
  targetTime: 0.42,
});
assert.equal(reversal.phase, 'BRAKING', 'bola atrás do movimento deve exigir frenagem');
assert.ok(reversal.reversalTimer > 0);
assert.ok(reversal.fooled);
assert.ok(getBodyCommitmentPenalty(defender) > 0);

const steering = applyBodyCommitmentToSteering(defender, {
  desiredVx: -5,
  desiredVy: 0,
  maxAccelStep: 1,
  maxDecelStep: 1,
});
assert.ok(steering.desiredVx > -5, 'corpo deve conservar parte da direção anterior');
assert.ok(steering.maxAccelStep < 1, 'reaceleração oposta deve ser reduzida');

for (let i = 0; i < 30; i++) {
  updateBodyCommitment(defender, { x: -4, y: 11.8 }, 1 / 60, {
    shotKey: 'shot-1', perceptionConfidence: 0.78, perceptionSkill: 0.60, targetTime: 0.30,
  });
}
assert.ok(defender._tm.bodyCommitment.direction.x < -0.8, 'após frear, corpo deve assumir a nova direção');
assert.equal(defender._tm.bodyCommitment.reversalTimer, 0);

const limited = makePlayer(38);
const elite = makePlayer(94);
const limitedState = updateBodyCommitment(limited, { x: -4, y: 11.8 }, 1 / 60, {
  shotKey: 'shot-1', perceptionConfidence: 0.55, perceptionSkill: 0.38, targetTime: 0.38, designedWrongFoot: true,
});
const eliteState = updateBodyCommitment(elite, { x: -4, y: 11.8 }, 1 / 60, {
  shotKey: 'shot-1', perceptionConfidence: 0.55, perceptionSkill: 0.94, targetTime: 0.38, designedWrongFoot: true,
});
assert.ok(eliteState.reversalDuration < limitedState.reversalDuration, 'elite deve frear e reorganizar antes');
assert.ok(eliteState.reversalSeverity < limitedState.reversalSeverity, 'elite deve sofrer menos com a inversão');

const balanced = makePlayer(65, 0);
updateBodyCommitment(balanced, { x: 4, y: 11.8 }, 1 / 60, {
  shotKey: 'shot-2', perceptionConfidence: 0.22, perceptionSkill: 0.65, targetTime: 0.70,
});
assert.equal(balanced._tm.bodyCommitment.phase, 'READING', 'sem urgência/confiança não deve adivinhar um lado');

console.log('✓ recuperação no sentido errado produz frenagem e inversão física');
console.log('✓ direção antiga reduz a primeira aceleração para o novo lado');
console.log('✓ leitura/equilíbrio de elite reduzem duração e severidade do contrapé');
console.log('✓ jogador equilibrado não escolhe lado antes de ter pista suficiente');

