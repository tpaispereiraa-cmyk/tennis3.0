import assert from 'node:assert/strict';
import {
  getProfessionalReadiness,
  isReadyForProfessionalTransition,
  promoteYouthToProfessional,
  materializeAlternativePathway,
} from '../src/systems/youth/YouthTransitionSystem.js';

const prospect = {
  id: 'ready-17', age: 17, rankPosition: 3,
  youthProfile: { origin: { id: 'LOCAL_CLUB' }, birthYear: 2008, junior: { titles: 2, peakTier: 'JUNIOR_ELITE', seasonLedger: [{ wins: 8 }] }, transition: {}, milestones: [] },
};
assert.ok(getProfessionalReadiness(prospect) >= 58);
assert.equal(isReadyForProfessionalTransition({ ...prospect, age: 16 }), false);
assert.equal(isReadyForProfessionalTransition(prospect), true);
const promoted = promoteYouthToProfessional(prospect, 2025);
assert.equal(promoted.youthProfile.transition.route, 'JUNIOR_GRADUATE');
const alternative = materializeAlternativePathway({ ...prospect, age: 20 }, 2025);
assert.equal(alternative.youthProfile.source, 'COHORT_MATERIALIZATION');
assert.equal(alternative.youthProfile.transition.status, 'PRO_DEBUT');
console.log('Youth transition verification passed.');
