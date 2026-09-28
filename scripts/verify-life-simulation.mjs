import assert from 'node:assert/strict';
import { ensureLifeSimulation, getLifeMatchModifiers, processMonthlyLifeSimulation } from '../src/systems/life/LifeSimulationSystem.js';

const basePlayer = ensureLifeSimulation({
  id: 'life-test', name: 'Teste', age: 28, physicalCondition: 82,
  attrs: { mentalidade: 70, regularidade: 70, resistencia: 70 },
  lifeData: { personal: { familyPlan: { id: 'CAREER_FIRST' }, children: { has: false } }, social: {}, publicImage: { id: 'LOW_PROFILE' } },
  personality: { marketability: { score: 50 }, competitiveArchetype: { id: 'PERFECTIONIST' } },
}, { year: 2025, month: 1 });

const january = processMonthlyLifeSimulation([basePlayer], { year: 2025, month: 1 }, {
  'life-test': [{ type: 'BURNOUT_WARNING', dateKey: '2025-01', marketImpact: 0 }],
});
const player = january.players[0];
assert.equal(player.lifeSimulation.activeSituations[0].type, 'BURNOUT_CYCLE');
assert.ok(getLifeMatchModifiers(player).mentalidade < 0, 'burnout deve afetar o contexto de partida');
assert.ok(player.lifeSimulation.monthlyDecisions.length === 1);
console.log('Life simulation checks passed.');
