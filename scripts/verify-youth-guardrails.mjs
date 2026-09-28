import assert from 'node:assert/strict';
import { applyYouthAgeCaps, getYouthAttributeCap } from '../src/systems/youth/YouthDevelopmentGuardrails.js';

const prodigy = {
  age: 15,
  attrs: { fhPotencia: 94, saqueForca: 91, mentalidade: 90, velocidade: 88 },
  youthProfile: { maturation: {} },
};
const capped = applyYouthAgeCaps(prodigy);
assert.equal(capped.attrs.fhPotencia, 71);
assert.equal(capped.attrs.saqueForca, 66);
assert.equal(capped.attrs.mentalidade, 69);
assert.equal(capped.attrs.velocidade, 65);
assert.equal(capped.youthProfile.maturation.uncapsAtAge, 17);
assert.equal(capped.youthProfile.maturation.latentAttrs.fhPotencia, 94);
assert.equal(getYouthAttributeCap(17, 'fhPotencia'), null);
assert.equal(applyYouthAgeCaps({ ...capped, age: 17 }).attrs.fhPotencia, 94);
console.log('Youth maturity guardrails verification passed.');
