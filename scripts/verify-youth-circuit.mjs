import assert from 'node:assert/strict';
import { ensureJuniorCircuitProfile, recordJuniorCircuitTournament, summarizeYouthCircuitSeason } from '../src/systems/youth/YouthCircuitSystem.js';
import { createYouthCohortUniverse } from '../src/systems/youth/YouthCohortUniverseSystem.js';

const player = ensureJuniorCircuitProfile({
  id: 'jr-1', age: 16, rankPosition: 5,
  youthProfile: { junior: { status: 'UNSTARTED' } },
  careerTitles: {},
}, 2025);
assert.equal(player.youthProfile.junior.status, 'ACTIVE');

const champion = recordJuniorCircuitTournament(player, { isProspectsFinals: false }, { round: 'F', points: 120, isChampion: true, isFinalist: true }, 2025);
assert.equal(champion.youthProfile.junior.titles, 1);
assert.equal(champion.careerTitles.prospects, 1);
assert.equal(champion.youthProfile.junior.seasonLedger[0].points, 120);

const universe = summarizeYouthCircuitSeason(createYouthCohortUniverse(2025, 64), 2025, 64);
assert.equal(universe.circuitHistory.length, 1);
assert.equal(universe.circuitHistory[0].bands.length, 4);
console.log('Youth circuit verification passed.');
