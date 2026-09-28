import assert from 'node:assert/strict';
import {
  YOUTH_PROFILE_VERSION,
  createYouthProfile,
  ensureYouthProfile,
} from '../src/systems/youth/YouthFoundationSystem.js';
import { buildYouthOriginSummary } from '../src/systems/youth/YouthOriginsSystem.js';
import { describeYouthAcademy } from '../src/systems/youth/YouthAcademySystem.js';

const player = { id: 'junior-ana-01', name: 'Ana Silva', age: 15, birthYear: 2010 };
const first = createYouthProfile(player, 2025, 'JUNIOR_NEWGEN');
const second = createYouthProfile(player, 2025, 'JUNIOR_NEWGEN');

assert.deepEqual(first, second, 'a origem de um newgen precisa ser determinística');
assert.equal(first.version, YOUTH_PROFILE_VERSION);
assert.equal(first.birthYear, 2010);
assert.ok(first.origin.id);
assert.ok(first.childhood.firstCourt);
assert.ok(first.childhood.formativeConstraint);
assert.ok(buildYouthOriginSummary(first)?.includes(first.childhood.firstCourt));
assert.ok(['AFFILIATED', 'INDEPENDENT'].includes(first.academy.status));
assert.ok(describeYouthAcademy(first.academy));

const migrated = ensureYouthProfile({
  ...player,
  youthProfile: {
    origin: { id: 'CUSTOM_ORIGIN' },
    junior: { status: 'ACTIVE', titles: 3 },
    milestones: [{ type: 'FIRST_TITLE', year: 2024 }],
  },
}, 2025, 'SAVE_MIGRATION');

assert.equal(migrated.youthProfile.version, YOUTH_PROFILE_VERSION);
assert.equal(migrated.youthProfile.origin.id, 'CUSTOM_ORIGIN');
assert.equal(migrated.youthProfile.junior.status, 'ACTIVE');
assert.equal(migrated.youthProfile.junior.titles, 3);
assert.deepEqual(migrated.youthProfile.milestones, [{ type: 'FIRST_TITLE', year: 2024 }]);
assert.ok(migrated.youthProfile.childhood.firstMotivation);
assert.ok(migrated.youthProfile.academy.lens);

console.log('Youth foundation verification passed.');
