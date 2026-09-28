import assert from 'node:assert/strict';
import {
  getSurfaceFootingProfile,
  normalizeMovementSurface,
  updateSurfaceFooting,
} from '../src/systems/movement/SurfaceFooting.js';

function player(adaptacao = 70) {
  return {
    pos: { x: 0, y: 10 },
    vel: { x: 5, y: 0 },
    attrs: { adaptacao, equilibrio: 78 },
  };
}

const gs = surface => ({ courtPhysics: { surface } });

assert.equal(normalizeMovementSurface('SAIBRO'), 'CLAY');
assert.equal(normalizeMovementSurface('GRAMA'), 'GRASS');
assert.equal(normalizeMovementSurface('ASFALTO'), 'STREET');
assert.equal(normalizeMovementSurface('VELUDO'), 'CARPET');

const clayPlayer = player(82);
const clay = updateSurfaceFooting(clayPlayer, gs('CLAY'), {
  target: { x: 1.2, y: 10 },
  currentSpeed: 5,
  baseDecel: 10,
});
assert.equal(clay.slideActive, true, 'saibro deve abrir slide perto do ponto de frenagem');
assert.ok(clay.slideControl > 0.75, 'jogador adaptado precisa controlar o slide');
assert.ok(clay.brakingDistance > 1.2, 'saibro precisa de distância real para frear');

const hard = updateSurfaceFooting(player(82), gs('HARD'), {
  target: { x: 1.2, y: 10 },
  currentSpeed: 5,
  baseDecel: 10,
});
assert.equal(hard.slideActive, false, 'dura não pode receber slide de saibro automaticamente');
assert.ok(hard.traction > clay.traction);

const grassPoor = player(35);
const poorState = updateSurfaceFooting(grassPoor, gs('GRASS'), {
  target: { x: -2, y: 10 },
  currentSpeed: 5,
  baseDecel: 10,
});
const grassElite = player(92);
const eliteState = updateSurfaceFooting(grassElite, gs('GRASS'), {
  target: { x: -2, y: 10 },
  currentSpeed: 5,
  baseDecel: 10,
});
assert.ok(poorState.slipRisk > eliteState.slipRisk, 'adaptação deve reduzir escorregão na inversão sobre grama');
assert.ok(poorState.stability < eliteState.stability, 'especialista precisa sustentar melhor a base na grama');

const asphalt = getSurfaceFootingProfile(player(70), gs('STREET'));
const carpet = getSurfaceFootingProfile(player(70), gs('CARPET'));
assert.ok(asphalt.decelMult > carpet.decelMult, 'asfalto deve travar mais o pé que carpete');
assert.ok(asphalt.energyMult > carpet.energyMult, 'asfalto quente/abrasivo deve custar mais energia');

console.log('SurfaceFooting: saibro, grama, dura, asfalto e carpete validados.');
