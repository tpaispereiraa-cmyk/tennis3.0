import assert from 'node:assert/strict';
import {
  createYouthCohortUniverse,
  ensureYouthCohortUniverse,
  advanceYouthCohortUniverse,
} from '../src/systems/youth/YouthCohortUniverseSystem.js';

const initial = createYouthCohortUniverse(2025, 64);
assert.equal(initial.cohorts.length, 24);
assert.ok(initial.summary.totalPopulation > 6000);
assert.equal(initial.summary.activeProspects, 64);
assert.ok(initial.cohorts.every(cohort => !('players' in cohort)), 'coortes não podem materializar jogadores');

const next = advanceYouthCohortUniverse(initial, 2026, 64);
assert.equal(next.year, 2026);
assert.equal(next.history.length, 1);
assert.equal(next.summary.activeProspects, 64);

const migrated = ensureYouthCohortUniverse({ ...initial, summary: { totalPopulation: 1 } }, 2025, 61);
assert.equal(migrated.summary.activeProspects, 61);
console.log('Youth cohort universe verification passed.');
