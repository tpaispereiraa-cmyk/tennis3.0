import assert from 'node:assert/strict';
import { FootworkStance, planContactFootwork } from '../src/systems/movement/FootworkPlanner.js';
import { resolveStrokeWing } from '../src/systems/shotengine/PlayerShotCapabilities.js';

function player(overrides = {}) {
  return {
    id: 0,
    side: 1,
    pos: { x: 0, y: 10.1 },
    vel: { x: 0, y: 0 },
    stamina: 0.9,
    reach: 0.9,
    playerSpeed: 8.0,
    handedness: 'right',
    attrs: {
      fhPotencia: 82,
      fhControle: 80,
      bhPotencia: 72,
      bhControle: 75,
      equilibrio: 78,
    },
    ctx: {},
    ...overrides,
  };
}

function gs(x = 1.2, rally = 4) {
  return { rally, ball: { lastHitBy: 1, pos: { x, y: 9.4, z: 0.9 } } };
}

const right = player();
const fh = planContactFootwork({
  player: right,
  gs: gs(1.2),
  point: { x: 1.2, y: 9.4, z: 0.9, t: 0.62 },
  phase: 'CONTACT_WINDOW',
  profile: { preferredContactZ: 0.92 },
});
assert.equal(fh.wing, 'FOREHAND');
assert.ok(fh.bodyTarget.x < 1.2, 'destro deve montar o corpo à esquerda da bola no forehand');
assert.ok(Math.abs(1.2 - fh.bodyTarget.x - fh.idealContactRadius) < 0.02);

const bhPlayer = player();
const bh = planContactFootwork({
  player: bhPlayer,
  gs: gs(-1.3),
  point: { x: -1.3, y: 9.5, z: 0.9, t: 0.66 },
  phase: 'CONTACT_WINDOW',
});
assert.equal(bh.wing, 'BACKHAND');
assert.ok(bh.bodyTarget.x > -1.3, 'destro deve montar o corpo à direita da bola no backhand');

const left = player({ handedness: 'left', ctx: {} });
assert.equal(resolveStrokeWing(left, { pos: { x: -0.8 } }), 'FOREHAND', 'ala precisa respeitar canhoto');
assert.equal(resolveStrokeWing(left, { pos: { x: 0.8 } }), 'BACKHAND', 'backhand do canhoto fica no lado oposto');

const rushed = player();
const emergency = planContactFootwork({
  player: rushed,
  gs: gs(2.8, 5),
  point: { x: 2.8, y: 9.6, z: 0.72, t: 0.18 },
  phase: 'CONTACT_EMERGENCY',
});
assert.equal(emergency.stance, FootworkStance.EMERGENCY, 'bola sem tempo precisa aceitar base de sobrevivência');
assert.ok(emergency.preparationQuality < fh.preparationQuality);

const weapon = player({
  ctx: {},
  attrs: { fhPotencia: 94, fhControle: 90, bhPotencia: 58, bhControle: 60, equilibrio: 82 },
});
const runAround = planContactFootwork({
  player: weapon,
  gs: gs(-0.55, 6),
  point: { x: -0.55, y: 9.7, z: 0.92, t: 0.78 },
  phase: 'CONTACT_WINDOW',
});
assert.equal(runAround.wing, 'FOREHAND_RUNAROUND', 'arma de forehand deve contornar backhand apenas com tempo');
assert.equal(runAround.runAround, true);

console.log('FootworkPlanner: mão dominante, alas, bases, spacing e run-around validados.');
