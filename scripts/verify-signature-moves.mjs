import assert from 'node:assert/strict';
import { seedRand } from '../src/core/math.js';
import { applySignatureMoveToDecision, applySignatureMoveToServe } from '../src/systems/shotengine/SignatureMoves.js';
import { ShotFamily, ShotIntent } from '../src/systems/shotengine/ShotTypes.js';

function player(signature) {
  return {
    id: 'signature-player', naturalSignature: signature, stamina: 1,
    attrs: { mentalidade: 92, regularidade: 92 }, ctx: {},
  };
}

function groundContext(signature) {
  const p = player(signature);
  return {
    gs: { players: [{ sets: 0, games: 0 }, { sets: 0, games: 0 }] },
    player: p,
    body: { contactReadiness: .90 },
  };
}

const clean = { quality: .88, bodyState: 'PLANTED' };
const baseDecision = Object.freeze({
  family: ShotFamily.TOPSPIN, intent: ShotIntent.BUILD, blueprintId: 'TOPSPIN_DEEP_CROSS',
  trajectoryProfile: Object.freeze({ powerAdd: .7, topspinMult: 1.1, curveSpin: 0, netClearanceAdd: .12 }),
});

let activated = null;
for (let seed = 1; seed < 300 && !activated; seed += 1) {
  seedRand(seed);
  const context = groundContext('FH_TOPSPIN_CROSS');
  const result = applySignatureMoveToDecision(context, clean, baseDecision);
  if (result.signatureMove) activated = { result, context };
}
assert.ok(activated, 'a assinatura elegível precisa poder ativar');
assert.equal(activated.result.signatureMove.id, 'FH_TOPSPIN_CROSS');
assert.ok(activated.result.trajectoryProfile.topspinMult > baseDecision.trajectoryProfile.topspinMult, 'a assinatura deve alterar a rotação física');
assert.equal(applySignatureMoveToDecision(activated.context, clean, baseDecision).signatureMove, undefined, 'a mesma assinatura não pode repetir no mesmo game');

const badContact = applySignatureMoveToDecision(groundContext('FH_TOPSPIN_CROSS'), { quality: .31, bodyState: 'LATE' }, baseDecision);
assert.equal(badContact.signatureMove, undefined, 'contato atrasado não pode disparar assinatura');

const serveBase = Object.freeze({ family: ShotFamily.SERVE_FLAT, isFirst: true, quality: .92, power: 30, netClearance: .5, actualSpinX: 0, actualSpinZ: 0, reason: 'test' });
let serveActivated = null;
for (let seed = 1; seed < 300 && !serveActivated; seed += 1) {
  seedRand(seed);
  const p = player('SERVE_FLAT_BOMB');
  const result = applySignatureMoveToServe(serveBase, p, { players: [{ sets: 0, games: 0 }, { sets: 0, games: 0 }] });
  if (result.signatureMove) serveActivated = result;
}
assert.ok(serveActivated, 'saque assinatura elegível precisa poder ativar');
assert.ok(serveActivated.power > serveBase.power, 'saque bomba deve ganhar ritmo, não uma família nova');

console.log('signature moves ok', { ground: activated.result.signatureMove.id, serve: serveActivated.signatureMove.id });
