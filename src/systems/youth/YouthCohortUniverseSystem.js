/**
 * YouthCohortUniverseSystem.js
 * ───────────────────────────────────────────────────────────────────────────
 * Universo juvenil abstrato. Não cria milhares de objetos Player: cada bloco
 * representa uma coorte regional e etária, mantendo o save leve. Os patches
 * seguintes poderão materializar apenas os jovens que chegarem ao radar.
 */

export const YOUTH_COHORT_VERSION = 2;

const REGIONS = ['AMERICAS', 'EUROPE', 'AFRICA', 'ASIA_PACIFIC', 'WEST_ASIA', 'NORDICS'];
const AGE_BANDS = [
  { id: 'CHILDREN', min: 6, max: 9, population: 2700 },
  { id: 'PRE_JUNIORS', min: 10, max: 13, population: 2300 },
  { id: 'JUNIORS', min: 14, max: 15, population: 1150 },
  { id: 'SENIOR_JUNIORS', min: 16, max: 18, population: 750 },
];

const REGION_NATIONALITIES = {
  AMERICAS: ['USA', 'BRA', 'ARG', 'CAN', 'COL', 'CHI', 'MEX'],
  EUROPE: ['ESP', 'FRA', 'ITA', 'GER', 'SRB', 'POL', 'GBR', 'AUT', 'CHE'],
  AFRICA: ['RSA', 'MAR', 'TUN', 'EGY', 'NGA'],
  ASIA_PACIFIC: ['JPN', 'AUS', 'KOR', 'CHN', 'IND'],
  WEST_ASIA: ['TUR', 'ISR', 'KAZ', 'UAE'],
  NORDICS: ['SWE', 'NOR', 'DEN', 'FIN'],
};

function hash(value) {
  let result = 2166136261;
  for (const char of String(value)) {
    result ^= char.charCodeAt(0);
    result = Math.imul(result, 16777619);
  }
  return result >>> 0;
}

function buildCohorts(year) {
  return AGE_BANDS.flatMap((band, bandIndex) => REGIONS.map((region, regionIndex) => {
    const seed = hash(`${year}:${band.id}:${region}`);
    const regionalWeight = 0.72 + ((seed % 57) / 100);
    const population = Math.max(24, Math.round((band.population / REGIONS.length) * regionalWeight));
    const competitive = Math.max(3, Math.round(population * (bandIndex < 2 ? 0.11 : 0.18)));
    const eliteWatchlist = Math.max(1, Math.round(competitive * (bandIndex < 2 ? 0.025 : 0.06)));
    return {
      id: `${year}-${band.id}-${region}`,
      region,
      ageBand: band.id,
      ageMin: band.min,
      ageMax: band.max,
      population,
      competitive,
      eliteWatchlist,
      seed,
    };
  }));
}

function summarize(cohorts, activeProspects = 0) {
  const totalPopulation = cohorts.reduce((sum, cohort) => sum + cohort.population, 0);
  const competitivePopulation = cohorts.reduce((sum, cohort) => sum + cohort.competitive, 0);
  const eliteWatchlist = cohorts.reduce((sum, cohort) => sum + cohort.eliteWatchlist, 0);
  return { totalPopulation, competitivePopulation, eliteWatchlist, activeProspects };
}

export function createYouthCohortUniverse(year = 2025, activeProspects = 0) {
  const cohorts = buildCohorts(year);
  return {
    version: YOUTH_COHORT_VERSION,
    year,
    cohorts,
    summary: summarize(cohorts, activeProspects),
    history: [],
  };
}

export function ensureYouthCohortUniverse(universe, year = 2025, activeProspects = 0) {
  if (!universe || typeof universe !== 'object' || !Array.isArray(universe.cohorts)) {
    return createYouthCohortUniverse(year, activeProspects);
  }
  const cohorts = universe.cohorts.filter(cohort => cohort && typeof cohort === 'object');
  return {
    ...universe,
    version: YOUTH_COHORT_VERSION,
    year: universe.year ?? year,
    cohorts,
    summary: { ...summarize(cohorts, activeProspects), ...(universe.summary ?? {}), activeProspects },
    history: Array.isArray(universe.history) ? universe.history.slice(-20) : [],
  };
}

/** Rolls the abstract generations forward once, without simulating individuals. */
export function advanceYouthCohortUniverse(universe, nextYear, activeProspects = 0) {
  const current = ensureYouthCohortUniverse(universe, nextYear - 1, activeProspects);
  const cohorts = buildCohorts(nextYear);
  const previousSummary = summarize(current.cohorts, current.summary?.activeProspects ?? 0);
  return {
    version: YOUTH_COHORT_VERSION,
    year: nextYear,
    cohorts,
    summary: summarize(cohorts, activeProspects),
    history: [...current.history, {
      year: current.year,
      totalPopulation: previousSummary.totalPopulation,
      competitivePopulation: previousSummary.competitivePopulation,
      eliteWatchlist: previousSummary.eliteWatchlist,
      activeProspects: previousSummary.activeProspects,
    }].slice(-20),
    circuitHistory: Array.isArray(current.circuitHistory) ? current.circuitHistory.slice(-20) : [],
    survivalHistory: Array.isArray(current.survivalHistory) ? current.survivalHistory.slice(-20) : [],
  };
}

function potentialFromRoll(roll, quality = 0) {
  const shifted = Math.max(0, Math.min(.9999, roll - quality * .018));
  if (shifted < .01) return 'GERACIONAL';
  if (shifted < .06) return 'LENDA';
  if (shifted < .22) return 'ELITE';
  if (shifted < .52) return 'CAMPEAO';
  if (shifted < .82) return 'COMUM';
  return 'ABAIXO_DA_MEDIA';
}

/** Converte um lugar abstrato da coorte em uma origem concreta e reproduzível. */
export function getCohortMaterializationBlueprint(universe, year, slot = 0, directive = null) {
  const current = ensureYouthCohortUniverse(universe, year, 0);
  const candidates = current.cohorts.filter(cohort => ['JUNIORS', 'SENIOR_JUNIORS'].includes(cohort.ageBand));
  const totalWeight = candidates.reduce((sum, cohort) => sum + Math.max(1, cohort.eliteWatchlist ?? 1), 0);
  const seed = hash(`${year}:materialize:${slot}:${directive?.id ?? 'organic'}`);
  let cursor = seed % Math.max(1, totalWeight);
  let cohort = candidates[0] ?? current.cohorts[0];
  for (const item of candidates) {
    cursor -= Math.max(1, item.eliteWatchlist ?? 1);
    if (cursor < 0) { cohort = item; break; }
  }
  const quality = ((cohort?.eliteWatchlist ?? 1) / Math.max(1, cohort?.competitive ?? 1) - .04) * 8;
  const nationalities = REGION_NATIONALITIES[cohort?.region] ?? REGION_NATIONALITIES.EUROPE;
  return {
    cohortId: cohort?.id ?? null,
    region: cohort?.region ?? 'EUROPE',
    ageBand: cohort?.ageBand ?? 'JUNIORS',
    nationality: nationalities[(seed >>> 7) % nationalities.length],
    potential: directive?.forcePotential ?? potentialFromRoll(((seed >>> 11) % 10000) / 10000, quality),
    ageRange: directive ? (directive.role === 'ERA_RIVAL' ? [17, 18] : [16, 18]) : null,
    developmentStyle: directive ? (directive.role === 'ERA_RIVAL' ? 'EXPLOSIVE' : 'EARLY_BLOOMER') : null,
    signal: directive ? 'DIRECTED_COMPETITIVE_RESPONSE' : quality > .08 ? 'STRONG_COHORT' : 'ORGANIC_COHORT',
    directiveId: directive?.id ?? null,
    seed,
  };
}
