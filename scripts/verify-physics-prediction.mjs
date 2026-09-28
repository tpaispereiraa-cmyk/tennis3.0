import assert from 'node:assert/strict';
import { advanceBallPhysics, predictTrajectory } from '../src/core/physics.js';
import { PHYSICS } from '../src/core/constants.js';

const courtPhysics = {
  surface: 'DURA',
  restitution: 0.72,
  groundFriction: 0.82,
  humidityFriction: 0.01,
  bounceVariance: 0.09,
};

const wind = {
  isIndoor: false,
  airDensity: PHYSICS.airDensity,
  windDir: 0.42,
  windStrength: 2.6,
  gustActive: false,
};

function makeBall(overrides = {}) {
  return {
    pos: { x: -0.7, y: -8.4, z: 1.06 },
    vel: { x: 2.4, y: 20.5, z: 2.9 },
    spin: { x: -13.5, y: 0.2, z: 3.1 },
    inFlight: true,
    bounceCount: 0,
    outGraceTimer: 0,
    ...overrides,
  };
}

function simulateRealFirstBounce(source, environment = null) {
  const ball = structuredClone(source);
  let elapsed = 0;
  let landing = null;
  while (!landing && elapsed < 2.8) {
    const before = elapsed;
    advanceBallPhysics(ball, 1 / 60, {
      environment,
      courtPhysics,
      airDensity: environment?.airDensity ?? PHYSICS.airDensity,
      applyBounceVariance: false,
      onSubstep: (state, subDt, bounced) => {
        elapsed += subDt;
        if (bounced && !landing) landing = { x: state.pos.x, y: state.pos.y, t: elapsed };
        return !landing;
      },
    });
    if (elapsed === before) break;
  }
  return landing;
}

function assertLandingAligned(label, source, environment = null) {
  const before = structuredClone(source);
  const predicted = predictTrajectory(
    source,
    8.2,
    2.8,
    environment?.airDensity ?? PHYSICS.airDensity,
    courtPhysics,
    null,
    environment,
  );
  const actual = simulateRealFirstBounce(source, environment);
  assert.ok(predicted.landPoint, `${label}: previsão não encontrou o primeiro quique`);
  assert.ok(actual, `${label}: simulação real não encontrou o primeiro quique`);
  const landingError = Math.hypot(predicted.landPoint.x - actual.x, predicted.landPoint.y - actual.y);
  assert.ok(landingError < 0.12, `${label}: pouso divergiu ${landingError.toFixed(3)}m`);
  assert.ok(Math.abs(predicted.landPoint.t - actual.t) <= 1 / 120 + 1e-9, `${label}: tempo divergiu`);
  assert.deepEqual(source, before, `${label}: o preditor alterou a bola real`);
  assert.equal(predicted.uncertainty.bounceVariance, courtPhysics.bounceVariance);
  return predicted;
}

assertLandingAligned('topspin sem vento', makeBall());
assertLandingAligned('trajetória com vento', makeBall(), wind);
assertLandingAligned('signature slice', makeBall({
  spin: { x: 11.8, y: 0, z: 5.2 },
  _sliceProfile: 'DEEP_NEUTRAL',
  _sliceCarryMult: 1.04,
  _sigBounce: 0.88,
  _sigBounceSpin: 1.22,
}), wind);
assertLandingAligned('drop shot', makeBall({
  pos: { x: 0.35, y: -3.8, z: 0.94 },
  vel: { x: -0.4, y: 8.2, z: 1.85 },
  spin: { x: 6.8, y: 0, z: 0.25 },
  _isDropShot: true,
  _sliceProfile: 'SHORT_VARIATION',
}), wind);

const windy = assertLandingAligned('vento repetível', makeBall(), wind);
const calm = predictTrajectory(makeBall(), 8.2, 2.8, PHYSICS.airDensity, courtPhysics);
assert.ok(Math.abs(windy.landPoint.x - calm.landPoint.x) > 1e-5, 'o vento precisa alterar a previsão');

console.log('✓ previsão e partida usam o mesmo núcleo físico (erro de discretização < 12cm)');
console.log('✓ spin decay, vento, signature bounce, slice e drop permanecem alinhados');
console.log('✓ irregularidade do piso é exposta como incerteza sem contaminar a previsão média');
