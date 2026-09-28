import assert from 'node:assert/strict';
import { evaluateStrokePreparation } from '../src/systems/movement/StrokePreparation.js';
import { planContactFootwork } from '../src/systems/movement/FootworkPlanner.js';
import { evaluateExecutionQuality } from '../src/systems/shotengine/ShotExecutionQuality.js';

function player(overrides = {}) {
  return {
    id: 0,
    side: 1,
    pos: { x: 0, y: 10 },
    stamina: 0.9,
    reach: 0.9,
    playerSpeed: 8,
    handedness: 'right',
    attrs: {
      fhPotencia: 90, fhControle: 86,
      bhPotencia: 68, bhControle: 72,
      equilibrio: 82,
    },
    ctx: {},
    ...overrides,
  };
}

const cleanPlan = {
  wing: 'FOREHAND', stance: 'SEMI_OPEN', idealContactRadius: 0.78,
  preparationQuality: 0.86, bodyCommitment: 0.72, runAround: false,
};
const clean = evaluateStrokePreparation({
  player: player(), ball: { pos: { x: 0.78 } }, plan: cleanPlan,
  naturalWing: 'FOREHAND', readiness: 0.82, arrivalMargin: 0.12, spacingQuality: 0.94,
});
assert.equal(clean.actualWing, 'FOREHAND');
assert.equal(clean.mode, 'PREPARED');
assert.ok(clean.mechanicalIntegrity > 0.78);
assert.ok(clean.powerTransfer > 0.95);

const lateSwitch = evaluateStrokePreparation({
  player: player(), ball: { pos: { x: -0.72 } }, plan: { ...cleanPlan, bodyCommitment: 0.94 },
  naturalWing: 'BACKHAND', readiness: 0.80, arrivalMargin: -0.08, spacingQuality: 0.70,
});
assert.equal(lateSwitch.actualWing, 'BACKHAND', 'a física final deve impedir forehand impossível');
assert.equal(lateSwitch.lateSwitch, true);
assert.ok(lateSwitch.switchSeverity > 0.65);
assert.ok(lateSwitch.mechanicalIntegrity < clean.mechanicalIntegrity);
assert.ok(lateSwitch.powerTransfer < clean.powerTransfer);

const earlySwitch = evaluateStrokePreparation({
  player: player(), ball: { pos: { x: -0.72 } },
  plan: { ...cleanPlan, preparationQuality: 0.42, bodyCommitment: 0.08 },
  naturalWing: 'BACKHAND', readiness: 0.12, arrivalMargin: 0.24, spacingQuality: 0.78,
});
assert.ok(earlySwitch.switchSeverity < lateSwitch.switchSeverity, 'correção precoce precisa custar menos');

const jammed = evaluateStrokePreparation({
  player: player(), ball: { pos: { x: 0.06 } }, plan: cleanPlan,
  naturalWing: 'BODY', readiness: 0.58, arrivalMargin: 0.01, spacingQuality: 0.32,
});
assert.equal(jammed.jammed, true);
assert.ok(['JAMMED', 'ADAPTED', 'SURVIVAL'].includes(jammed.mode));
assert.ok(jammed.directionFreedom < clean.directionFreedom);

const left = player({ handedness: 'left', pos: { x: 0, y: 10 }, ctx: {} });
const leftPlan = planContactFootwork({
  player: left,
  gs: { rally: 3, ball: { lastHitBy: 1, pos: { x: -0.9, y: 9.5, z: 0.9 } } },
  point: { x: -0.9, y: 9.5, z: 0.9, t: 0.62 },
  phase: 'CONTACT_WINDOW',
});
assert.equal(leftPlan.wing, 'FOREHAND');
assert.ok(leftPlan.bodyTarget.x > -0.9, 'canhoto deve montar o corpo à direita da bola no forehand');

const weapon = player({ attrs: { fhPotencia: 96, fhControle: 92, bhPotencia: 56, bhControle: 58, equilibrio: 84 } });
const runAroundPlan = planContactFootwork({
  player: weapon,
  gs: { rally: 5, ball: { lastHitBy: 1, pos: { x: -0.55, y: 9.6, z: 0.9 } } },
  point: { x: -0.55, y: 9.6, z: 0.9, t: 0.82 },
  phase: 'CONTACT_WINDOW',
});
weapon.pos = { ...runAroundPlan.bodyTarget };
const runAround = evaluateStrokePreparation({
  player: weapon,
  ball: { pos: { x: -0.55, y: 9.6, z: 0.9 } },
  plan: runAroundPlan,
  naturalWing: 'FOREHAND', readiness: 0.78, arrivalMargin: 0.11, spacingQuality: 0.90,
});
assert.equal(runAround.runAround, true);
assert.ok(runAround.recoveryExposure >= 0.35, 'forehand invertido precisa cobrar recuperação');

const baseCaps = {
  wingControl: 0.82, wingPower: 0.86, reading: 0.76, consistency: 0.78,
  topspin: 0.76, spinSecurity: 0.72, tacticalVision: 0.74, mentality: 0.72,
};
const bodyBase = { contactReadiness: 0.78, arrivalMargin: 0.08 };
const quality = { quality: 0.78, bodyState: 'PLANTED' };
const decision = { family: 'TOPSPIN', intent: 'PRESSURE' };
const cleanExecution = evaluateExecutionQuality(
  { capabilities: baseCaps, body: { ...bodyBase, strokePreparation: clean } }, quality, decision,
);
const switchedExecution = evaluateExecutionQuality(
  { capabilities: baseCaps, body: { ...bodyBase, strokePreparation: lateSwitch } }, quality, decision,
);
assert.ok(cleanExecution.executionQuality > switchedExecution.executionQuality);
assert.ok(cleanExecution.directionFreedom > switchedExecution.directionFreedom);

console.log('StrokePreparation: ala, compromisso, troca tardia, jam, canhoto, run-around e execução validados.');

