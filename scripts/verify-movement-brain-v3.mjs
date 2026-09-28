import assert from 'node:assert/strict';
import { beginMovementPerception, updateMovementPerception } from '../src/systems/movement/MovementPerception.js';
import { stabilizeMovementPlan } from '../src/systems/movement/MovementPlanState.js';
import { updateCourtMovementState } from '../src/systems/movement/CourtMovementState.js';

function player(id, leitura = 70) {
  return {
    id, side: 1, pos: { x: 0, y: 10.5 }, vel: { x: 0, y: 0 }, atNet: false,
    attrs: { leitura, visaoTatica: leitura, explosividade: leitura, velocidade: leitura, devolucao: leitura },
    prefs: { netGame: 'OPPORTUNIST', rallyCadence: 'BALANCED' },
    ctx: { courtMode: 'BASE', netPhase: 'BASE' }, _tm: {},
  };
}

function ball(hidden = {}) {
  return {
    pos: { x: 0.4, y: -8.5, z: 1.6 }, vel: { x: 2.8, y: 27, z: 1.2 }, spin: { x: -18, y: 0, z: 4 },
    inFlight: true, bounceCount: 0, lastBounceSide: -1, lastHitBy: 0, ...hidden,
  };
}

const pA = player(1, 74);
const pB = player(1, 74);
const gsA = { ball: ball({ _isDropShot: true, _wrongFoot: { active: true, targetX: 4 }, _servePhysType: 'SLICE' }), rally: 2, receiver: 1, _currentPointId: 9 };
const gsB = { ball: ball({ _isDropShot: false, _wrongFoot: null, _servePhysType: 'FLAT' }), rally: 2, receiver: 1, _currentPointId: 9 };
beginMovementPerception(pA, gsA, gsA.ball);
beginMovementPerception(pB, gsB, gsB.ball);
for (let i = 0; i < 18; i += 1) {
  updateMovementPerception(pA, gsA, 1 / 60);
  updateMovementPerception(pB, gsB, 1 / 60);
}
assert.deepEqual(pA._tm.perception.estimate, pB._tm.perception.estimate, 'metadados secretos alteraram a crença física');
assert.equal(pA._perceptionState.inferredShape, pB._perceptionState.inferredShape);

const low = player(2, 38);
const elite = player(2, 94);
const lowGs = { ball: ball(), rally: 2, receiver: 2, _currentPointId: 11 };
const eliteGs = { ball: ball(), rally: 2, receiver: 2, _currentPointId: 11 };
beginMovementPerception(low, lowGs, lowGs.ball);
beginMovementPerception(elite, eliteGs, eliteGs.ball);
for (let i = 0; i < 12; i += 1) {
  updateMovementPerception(low, lowGs, 1 / 60);
  updateMovementPerception(elite, eliteGs, 1 / 60);
}
assert.ok(elite._perceptionState.confidence > low._perceptionState.confidence, 'leitura não antecipou aquisição');
assert.ok(Math.abs(elite._perceptionState.laneError) < Math.abs(low._perceptionState.laneError), 'elite não reduziu erro lateral');

const mover = player(4, 70);
mover._tm = {};
const first = stabilizeMovementPlan(mover, { x: 2.6, y: 8.2, z: 0.9, t: 0.65, phase: 'TRAVEL', bounceCount: 0 }, { shotKey: 's1', confidence: 0.28, bounceCount: 0, dt: 1 / 60 });
const secretFlip = stabilizeMovementPlan(mover, { x: -2.6, y: 8.2, z: 0.9, t: 0.62, phase: 'TRAVEL', bounceCount: 0 }, { shotKey: 's1', confidence: 0.30, bounceCount: 0, dt: 1 / 60 });
assert.ok(secretFlip.x > 1.5, 'plano virou de lado sem evidência suficiente');
const evidencedFlip = stabilizeMovementPlan(mover, { x: -2.6, y: 8.2, z: 0.9, t: 0.42, phase: 'TRAVEL', bounceCount: 1 }, { shotKey: 's1', confidence: 0.78, bounceCount: 1, dt: 1 / 60 });
assert.ok(evidencedFlip.x < 0, 'evidência de quique não permitiu corrigir a rota');
assert.ok(evidencedFlip.correctionCost > 0, 'grande correção não cobrou custo corporal');

const netPlayer = player(5, 80);
netPlayer.pos.y = 4.2;
netPlayer.ctx.courtMode = 'TRANSITION';
netPlayer.ctx._approachQuality = 0.82;
const courtState = updateCourtMovementState(netPlayer, {}, ball());
assert.equal(courtState.mode, 'NET', 'transição não consolidou a chegada à rede');
assert.equal(netPlayer.atNet, true);

console.log('movement brain v3 ok', {
  semanticLeak: false,
  lowConfidence: +low._perceptionState.confidence.toFixed(3),
  eliteConfidence: +elite._perceptionState.confidence.toFixed(3),
  revisionCost: evidencedFlip.correctionCost,
  courtMode: courtState.mode,
});
