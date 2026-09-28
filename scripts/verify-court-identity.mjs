import assert from 'node:assert/strict';
import { getCourtIdentity } from '../src/domain/players/PlayerCourtIdentity.js';
import { seedRand } from '../src/core/math.js';
import { decideConcreteShot, generateShotCandidates } from '../src/systems/shotengine/ShotTacticalBrain.js';

const attrs = { fhPotencia: 82, bhPotencia: 80, slice: 78, leitura: 80, adaptacao: 75 };
const make = (id, courtIdentity) => ({ id, attrs, pos: { x: 1, y: 8.3 }, prefs: { buildStyle: 'VARIED', rallyCadence: 'BALANCED', netGame: 'OPPORTUNIST' }, courtIdentity, ctx: { matchCtx: { touchVariation: { heat: 0, cooldownPoints: 0 } } } });
const power = make('power', { shotVocabulary: { familyBias: { FLAT_DRIVE: 0.15, TOPSPIN: -0.06 }, directionBias: { DTL: 0.12 }, blueprintBias: { FLAT_DTL: 0.12 } } });
const builder = make('builder', { shotVocabulary: { familyBias: { TOPSPIN: 0.13, FLAT_DRIVE: -0.05 }, directionBias: { CROSS: 0.12 }, blueprintBias: { TOPSPIN_DEEP_CROSS: 0.12 } } });
const specialist = make('specialist', { shotVocabulary: { familyBias: { DROP: 0.15 }, blueprintBias: { DROP_DISGUISED_CROSS: 0.14 }, variationTolerance: 0.15 } });
const generic = make('generic', { shotVocabulary: { familyBias: { DROP: -0.04 } } });
function context(player, quality = 0.78, opponentY = -10.1) {
  return { player, opponent: { id: 'o', pos: { x: -1.6, y: opponentY }, vel: { x: 0.4, y: 0 }, ctx: {} },
    prefs: player.prefs, phase: 'RALLY_ATTACK', side: 1,
    capabilities: { wing: 'FOREHAND', wingPower: 0.80, wingControl: 0.82, forehandPower: 0.82, forehandControl: 0.82, topspin: 0.8, slice: 0.78, touch: 0.82, tacticalVision: 0.82, aggression: 0.7, consistency: 0.8, reading: 0.8, defense: 0.7, movement: 0.7, volley: 0.7, smash: 0.7 },
    body: { contactReadiness: 0.82, arrivalMargin: 0.08 }, ballState: { pos: { x: 1, y: 7.7, z: 1.05 }, z: 1.05 }, score: { rally: 4 }, memory: { shots: [] }, gs: {} };
}
const clean = { quality: 0.78, bodyState: 'PLANTED' };
const score = (player, id) => generateShotCandidates(context(player), clean).candidates.find(c => c.blueprint.id === id)?.score;
assert.ok(score(power, 'FLAT_DTL') > score(builder, 'FLAT_DTL') + 0.1);
assert.ok(score(builder, 'TOPSPIN_DEEP_CROSS') > score(power, 'TOPSPIN_DEEP_CROSS') + 0.1);
assert.ok(score(specialist, 'DROP_DISGUISED_CROSS') > score(generic, 'DROP_DISGUISED_CROSS') + 0.1);
assert.equal(generateShotCandidates(context(specialist), { quality: 0.3, bodyState: 'LATE' }).candidates.some(c => c.blueprint.family === 'DROP'), false);
assert.notDeepEqual(getCourtIdentity(make('one', {})).timing, getCourtIdentity(make('two', {})).timing);
function distribution(player, count = 400) {
  const result = { flat: 0, topspin: 0, drop: 0, cross: 0, dtl: 0 };
  for (let i = 0; i < count; i++) {
    seedRand(9000 + i);
    const decision = decideConcreteShot(context(player), clean);
    if (decision.family === 'FLAT_DRIVE') result.flat++;
    if (decision.family === 'TOPSPIN') result.topspin++;
    if (decision.family === 'DROP') result.drop++;
    if (decision.direction === 'CROSS') result.cross++;
    if (decision.direction === 'DTL') result.dtl++;
  }
  return result;
}
const distributions = { power: distribution(power), builder: distribution(builder), specialist: distribution(specialist), generic: distribution(generic) };
assert.ok(distributions.power.flat > distributions.builder.flat);
assert.ok(distributions.builder.topspin > distributions.power.topspin);
assert.ok(distributions.specialist.drop > distributions.generic.drop);
console.log('court identity ok', distributions);
