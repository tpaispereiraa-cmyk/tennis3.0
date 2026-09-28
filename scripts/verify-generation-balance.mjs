import assert from 'node:assert/strict';
import { applyYouthAgeCaps, exposeYouthPotentialForDevelopment } from '../src/systems/youth/YouthDevelopmentGuardrails.js';
import { getYouthFormationGrowthMultiplier } from '../src/systems/youth/YouthAcademySystem.js';
import { createYouthCohortUniverse, getCohortMaterializationBlueprint } from '../src/systems/youth/YouthCohortUniverseSystem.js';
import { createCompetitiveDensityState, planCompetitiveDensity, consumeCompetitiveDirective, getProjectedCompetitiveCeiling } from '../src/systems/youth/CompetitiveDensityDirector.js';

const attrs = value => Object.fromEntries(['velocidade','explosividade','resistencia','defesa','fhPotencia','fhControle','bhPotencia','bhControle','topspin','slice','saqueForca','saquePrecisao','devolucao','volley','smash','leitura','visaoTatica','mentalidade','regularidade','recuperacao','adaptacao'].map(key => [key, value]));
const prodigy = { id:'latent', age:15, attrs:attrs(90), youthProfile:{ maturation:{} } };
const capped = applyYouthAgeCaps(prodigy);
assert.ok(capped.attrs.fhPotencia < 90, 'o jovem precisa competir sob o cap');
assert.equal(exposeYouthPotentialForDevelopment(capped, 15).attrs.fhPotencia, 90, 'o treino precisa enxergar o talento latente');
assert.equal(applyYouthAgeCaps({ ...capped, age:17 }).attrs.fhPotencia, 90, 'o cap não pode destruir talento');

const academyPlayer = { age:16, youthProfile:{ academy:{ status:'AFFILIATED', lens:'SERVE_FIRST', alignment:'ALIGNED' }, origin:{ access:'STABLE', familySupport:'PRESENT' } } };
assert.ok(getYouthFormationGrowthMultiplier(academyPlayer, 'saqueForca', 16) > getYouthFormationGrowthMultiplier(academyPlayer, 'slice', 16));

const dominant = { id:'splus', name:'S Plus', age:24, birthYear:2001, peakAge:27, potential:'GERACIONAL', attrs:attrs(95), _devState:{ovrTarget:96}, careerTrajectory:{realization:82} };
const field = Array.from({length:12}, (_,i)=>({ id:`b-${i}`, name:`B ${i}`, age:23, birthYear:2002, peakAge:27, potential:'CAMPEAO', attrs:attrs(72), _devState:{ovrTarget:75}, careerTrajectory:{realization:68} }));
let density = planCompetitiveDensity([dominant, ...field], 2025, createCompetitiveDensityState(2025));
assert.equal(density.pendingDirectives.length, 2, 'um S+ isolado deve receber exatamente duas respostas');
assert.deepEqual(density.pendingDirectives.map(item=>item.role), ['ERA_RIVAL','ERA_CHALLENGER']);

const cohort = createYouthCohortUniverse(2025, 64);
const blueprint = getCohortMaterializationBlueprint(cohort, 2026, 0, density.pendingDirectives[0]);
assert.equal(blueprint.potential, 'LENDA');
assert.equal(blueprint.developmentStyle, 'EXPLOSIVE');
const candidate = { id:'rival', name:'Rival', potential:blueprint.potential, attrs:attrs(68), _devState:{ovrTarget:78}, careerTrajectory:{realization:61} };
const consumed = consumeCompetitiveDirective(density, candidate, 2026);
assert.equal(consumed.player.competitiveDensityRole.guaranteesResults, false);
assert.ok(getProjectedCompetitiveCeiling(consumed.player) >= 88);
assert.equal(consumed.state.pendingDirectives.length, 1);
const stablePlan = planCompetitiveDensity([dominant, consumed.player, ...field], 2026, consumed.state);
assert.equal(stablePlan.pendingDirectives.length, 1, 'diretivas pendentes e rivais materializados não podem se multiplicar');

const naturalRivals = [90, 89].map((target, index) => ({ id:`natural-${index}`, name:'Natural', age:24, birthYear:2001, peakAge:27, potential:'LENDA', attrs:attrs(84), _devState:{ovrTarget:target}, careerTrajectory:{realization:80} }));
const balanced = planCompetitiveDensity([dominant, ...naturalRivals], 2025, createCompetitiveDensityState(2025));
assert.equal(balanced.pendingDirectives.length, 0, 'uma era já competitiva não pode ser inflada');

console.log('Generation balance and competitive density verification passed.');
