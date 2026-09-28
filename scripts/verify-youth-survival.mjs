import assert from 'node:assert/strict';
import { getJuniorExitRisk, resolveJuniorSurvival, summarizeYouthSurvivalSeason } from '../src/systems/youth/YouthSurvivalSystem.js';
import { createYouthCohortUniverse } from '../src/systems/youth/YouthCohortUniverseSystem.js';

const stable = { id: 'stable', age: 16, rankPosition: 4, youthProfile: { origin: { access: 'PRIVILEGED', familySupport: 'STRONG' }, academy: { status: 'AFFILIATED' }, junior: { titles: 2 } } };
const vulnerable = { id: 'vulnerable', age: 18, rankPosition: 63, youthProfile: { origin: { access: 'LIMITED', familySupport: 'FRAGILE' }, academy: { status: 'INDEPENDENT' }, junior: { titles: 0, seasonLedger: [] }, transition: {}, milestones: [] } };
assert.ok(getJuniorExitRisk(vulnerable) > getJuniorExitRisk(stable));
const first = resolveJuniorSurvival([stable, vulnerable], 2025);
const second = resolveJuniorSurvival([stable, vulnerable], 2025);
assert.deepEqual(first, second, 'a saída precisa ser estável ao recarregar a temporada');
const summary = summarizeYouthSurvivalSeason(createYouthCohortUniverse(2025, 64), 2025);
assert.equal(summary.survivalHistory[0].bands.length, 4);
console.log('Youth survival verification passed.');
