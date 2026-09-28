import assert from 'node:assert/strict';
import { createServer } from 'vite';

const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' });
const surfaces = await vite.ssrLoadModule('/src/systems/surfaces/SurfaceIdentitySystem.js');
const fast = await vite.ssrLoadModule('/src/core/FastSimulation.js');
const newgens = await vite.ssrLoadModule('/src/systems/newgen/NewgenSystem.js');
const playersModule = await vite.ssrLoadModule('/src/domain/players/players.js');
const {
  SURFACE_KEYS, SURFACE_PROFILE_VERSION, createSurfaceProfile,
  ensureSurfaceProfile, getSurfaceMatchEffects, recordSurfaceMatch,
} = surfaces;
const { simulateMatchFast } = fast;

function mulberry32(seed) {
  let value = seed >>> 0;
  return () => {
    value += 0x6D2B79F5;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function basePlayer(id) {
  return {
    id, name: id, birthYear: 2004, nationality: 'BRA', styleId: 'ALL_COURT', age: 24,
    attrs: {
      saqueForca: 78, saquePrecisao: 79, devolucao: 78, leitura: 80,
      fhPotencia: 80, fhControle: 80, bhPotencia: 78, bhControle: 80,
      topspin: 79, slice: 77, volley: 74, smash: 76, defesa: 78,
      velocidade: 79, explosividade: 78, resistencia: 80, recuperacao: 78,
      regularidade: 80, mentalidade: 80, visaoTatica: 80, adaptacao: 78,
    },
    prefs: { rallyCadence: 'BALANCED', netGame: 'OPPORTUNIST' },
    surfaceStats: Object.fromEntries(SURFACE_KEYS.map(key => [key, { wins: 0, losses: 0, titlesWon: 0 }])),
  };
}

function forcedSpecialist(id, surface) {
  const player = basePlayer(id);
  const profile = createSurfaceProfile(player, { source: 'TEST', year: 2028 });
  for (const key of SURFACE_KEYS) {
    profile.dna[key] = { affinity: key === surface ? 96 : 48, archetype: key === surface ? { id: surface === 'CLAY' ? 'CLAY_ARCHITECT' : 'LOW_BOUNCE_READER', label: 'Teste funcional' } : null };
    profile.mastery[key] = { experience: key === surface ? 91 : 42, adaptation: key === surface ? 93 : 48, confidence: key === surface ? 72 : 50 };
  }
  return { ...player, surfaceProfile: profile };
}

const legacy = basePlayer('LEGACY');
legacy.surfaceStats.CLAY = { wins: 42, losses: 10, titlesWon: 6 };
const migrated = ensureSurfaceProfile(legacy, { year: 2042, source: 'SAVE_MIGRATION' });
assert.equal(migrated.surfaceProfile.version, SURFACE_PROFILE_VERSION);
assert.deepEqual(Object.keys(migrated.surfaceProfile.dna), SURFACE_KEYS);
assert.deepEqual(ensureSurfaceProfile(migrated, { year: 2050 }).surfaceProfile, migrated.surfaceProfile, 'migracao deve ser idempotente');

const bornWithIdentity = newgens.generateNewgen(2044, { nationality: 'ESP', ageRange: [17, 17] });
assert.equal(bornWithIdentity.surfaceProfile?.version, SURFACE_PROFILE_VERSION, 'newgen deve chegar com identidade formativa');
assert.deepEqual(Object.keys(bornWithIdentity.surfaceProfile.dna), SURFACE_KEYS);
assert.equal(bornWithIdentity.surfaceProfile.source, 'NEWGEN');

const migratedCast = Object.values(playersModule.NAMED_PLAYERS).map(player => ensureSurfaceProfile(player, { year: 2025, source: 'UNIVERSE_CREATION' }));
const castLeaders = Object.fromEntries(SURFACE_KEYS.map(surface => {
  const leader = [...migratedCast].sort((a, b) => b.surfaceProfile.dna[surface].affinity - a.surfaceProfile.dna[surface].affinity)[0];
  assert.ok(leader.surfaceProfile.dna[surface].affinity >= 70, `${surface} precisa ter nomes naturalmente fortes no elenco existente`);
  return [surface, { name: leader.name, affinity: leader.surfaceProfile.dna[surface].affinity, archetype: leader.surfaceProfile.dna[surface].archetype?.label ?? null }];
}));

const dnaBefore = JSON.stringify(migrated.surfaceProfile.dna);
let evolved = migrated;
for (let i = 0; i < 12; i += 1) evolved = recordSurfaceMatch(evolved, { surface: 'GRASS', won: i < 9, year: 2043, importance: 0.5 });
assert.equal(JSON.stringify(evolved.surfaceProfile.dna), dnaBefore, 'resultado profissional nao pode reescrever Surface DNA');
assert.ok(evolved.surfaceProfile.mastery.GRASS.experience > migrated.surfaceProfile.mastery.GRASS.experience);
assert.ok(evolved.surfaceProfile.legacy.GRASS.matches >= 12);

for (const surface of SURFACE_KEYS) {
  const fx = getSurfaceMatchEffects(forcedSpecialist(`SPEC_${surface}`, surface), surface);
  assert.equal(fx.surface, surface);
  assert.ok(fx.strength > 0.45, `${surface} deveria produzir encaixe forte`);
  assert.ok(Object.keys(fx.shotBias).length > 0, `${surface} precisa alterar vocabulario de golpes`);
}

const clay = forcedSpecialist('CLAY_KING', 'CLAY');
const grass = forcedSpecialist('GRASS_MASTER', 'GRASS');
let clayWinsOnClay = 0;
let clayWinsOnGrass = 0;
const sample = 700;
Math.random = mulberry32(0x51FACE);
for (let i = 0; i < sample; i += 1) {
  if (simulateMatchFast(clay, grass, 'CLAY', 3).winner.id === clay.id) clayWinsOnClay += 1;
  if (simulateMatchFast(clay, grass, 'GRASS', 3).winner.id === clay.id) clayWinsOnGrass += 1;
}
const clayRate = clayWinsOnClay / sample;
const grassRate = clayWinsOnGrass / sample;
assert.ok(clayRate > 0.53, `especialista de saibro deveria ser favorito no saibro (${clayRate})`);
assert.ok(grassRate < 0.49, `especialista de grama deveria inverter o confronto (${grassRate})`);
assert.ok(clayRate - grassRate > 0.10, 'troca de piso precisa mudar claramente o favoritismo');

console.log(JSON.stringify({
  version: SURFACE_PROFILE_VERSION,
  surfaces: SURFACE_KEYS,
  migrationIdempotent: true,
  dnaStableAfterResults: true,
  existingCastLeaders: castLeaders,
  claySpecialistWinRateOnClay: +clayRate.toFixed(3),
  claySpecialistWinRateOnGrass: +grassRate.toFixed(3),
}, null, 2));
await vite.close();
