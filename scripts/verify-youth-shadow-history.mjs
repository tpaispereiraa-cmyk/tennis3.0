import assert from 'node:assert/strict';
import { ensureYouthShadowHistory, hasYouthShadowHistory } from '../src/systems/youth/YouthShadowHistorySystem.js';

const player = {
  id: 'shadow-1', age: 17, birthYear: 2008,
  youthProfile: { birthYear: 2008, origin: { discoveryAge: 7 }, childhood: { formativeConstraint: 'deslocamentos longos' } },
};
const first = ensureYouthShadowHistory(player, { year: 2025, trigger: 'TOP_JUNIOR', cohortUniverse: { circuitHistory: [{ year: 2024 }] } });
const second = ensureYouthShadowHistory(first, { year: 2027, trigger: 'PRO_TRANSITION' });
assert.equal(first.youthProfile.shadowHistory.length, 5);
assert.equal(second.youthProfile.shadowHistoryGeneratedYear, 2025, 'a biografia não pode ser reescrita');
assert.deepEqual(second.youthProfile.shadowHistory, first.youthProfile.shadowHistory);
assert.equal(hasYouthShadowHistory(second), true);
console.log('Youth shadow history verification passed.');
