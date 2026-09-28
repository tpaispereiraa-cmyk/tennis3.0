/**
 * Cheap youth circuit layer. Children are represented by seasonal aggregates;
 * only the visible junior pool stores individual results and a compact ledger.
 */

const ROUND_WEIGHT = { F: 5, SF: 4, QF: 3, R16: 2, R32: 1, Q: 1, PQ: 1 };
const TIER_WEIGHT = { JUNIOR_REGIONAL: 1, JUNIOR_NATIONAL: 2, JUNIOR_INTERNATIONAL: 3, JUNIOR_ELITE: 4, JUNIOR_MASTERS: 5, JUNIOR_SLAM: 6 };
import { ensureYouthShadowHistory } from './YouthShadowHistorySystem.js';

export function getJuniorCircuitTier(player = {}) {
  const age = Number(player.age ?? 14);
  const rank = Number(player.rankPosition ?? 999);
  if (rank <= 8 && age >= 16) return 'JUNIOR_ELITE';
  if (rank <= 24) return 'JUNIOR_INTERNATIONAL';
  if (rank <= 48) return 'JUNIOR_NATIONAL';
  return 'JUNIOR_REGIONAL';
}

export function ensureJuniorCircuitProfile(player = {}, year = 2025) {
  if (!player.youthProfile) return player;
  const junior = player.youthProfile.junior ?? {};
  const tier = junior.peakTier ?? getJuniorCircuitTier(player);
  const recorded = {
    ...player,
    youthProfile: {
      ...player.youthProfile,
      junior: {
        ...junior,
        status: 'ACTIVE',
        circuitEntryYear: junior.circuitEntryYear ?? year,
        peakTier: tier,
        titles: junior.titles ?? 0,
        finals: junior.finals ?? 0,
        seasonLedger: Array.isArray(junior.seasonLedger) ? junior.seasonLedger.slice(-8) : [],
      },
    },
  };
  return recorded;
}

export function recordJuniorCircuitTournament(player = {}, tournament = {}, result = {}, year = 2025, context = {}) {
  const initialized = ensureJuniorCircuitProfile(player, year);
  if (!initialized.youthProfile) return initialized;
  const junior = initialized.youthProfile.junior;
  const round = result.round ?? null;
  if (!round) return initialized;
  const champion = Boolean(result.isChampion);
  const finalist = Boolean(result.isFinalist);
  const tier = tournament.isProspectsFinals
    ? 'JUNIOR_MASTERS'
    : tournament.isJuniorSlam
      ? 'JUNIOR_SLAM'
      : tournament.juniorTier === 'INTERNATIONAL'
        ? 'JUNIOR_INTERNATIONAL'
        : getJuniorCircuitTier(initialized);
  const oldLedger = junior.seasonLedger ?? [];
  const current = oldLedger.find(entry => entry.year === year) ?? {
    year, events: 0, wins: 0, bestRound: null, titles: 0, finals: 0, points: 0,
  };
  const updated = {
    ...current,
    events: current.events + 1,
    wins: current.wins + Math.max(0, (ROUND_WEIGHT[round] ?? 0) - 1),
    bestRound: (ROUND_WEIGHT[round] ?? 0) >= (ROUND_WEIGHT[current.bestRound] ?? 0) ? round : current.bestRound,
    titles: current.titles + (champion ? 1 : 0),
    finals: current.finals + (finalist ? 1 : 0),
    points: current.points + Math.max(0, Number(result.points ?? 0)),
  };
  const seasonLedger = [...oldLedger.filter(entry => entry.year !== year), updated].slice(-8);
  const recorded = {
    ...initialized,
    careerTitles: {
      ...(initialized.careerTitles ?? {}),
      prospects: (initialized.careerTitles?.prospects ?? 0) + (champion && !tournament.isProspectsFinals ? 1 : 0),
      prospectsFinals: (initialized.careerTitles?.prospectsFinals ?? 0) + (champion && tournament.isProspectsFinals ? 1 : 0),
      juniorSlams: (initialized.careerTitles?.juniorSlams ?? 0) + (champion && tournament.isJuniorSlam ? 1 : 0),
    },
    youthProfile: {
      ...initialized.youthProfile,
      junior: {
        ...junior,
        peakTier: (TIER_WEIGHT[tier] ?? 0) >= (TIER_WEIGHT[junior.peakTier] ?? 0) ? tier : junior.peakTier,
        titles: (junior.titles ?? 0) + (champion ? 1 : 0),
        slamTitles: (junior.slamTitles ?? 0) + (champion && tournament.isJuniorSlam ? 1 : 0),
        finals: (junior.finals ?? 0) + (finalist ? 1 : 0),
        seasonLedger,
      },
    },
  };
  if (champion || (recorded.rankPosition ?? 999) <= 8) {
    return ensureYouthShadowHistory(recorded, { year, trigger: champion ? 'JUNIOR_TITLE' : 'TOP_JUNIOR', cohortUniverse: context.cohortUniverse });
  }
  return recorded;
}

export function summarizeYouthCircuitSeason(universe = {}, year = 2025, activeProspects = 0) {
  const cohorts = universe.cohorts ?? [];
  const byBand = Object.values(cohorts.reduce((acc, cohort) => {
    const id = cohort.ageBand;
    const current = acc[id] ?? { ageBand: id, population: 0, competitive: 0 };
    current.population += cohort.population ?? 0;
    current.competitive += cohort.competitive ?? 0;
    acc[id] = current;
    return acc;
  }, {})).map((entry) => ({
    ...entry,
    events: Math.max(2, Math.round(entry.competitive / 38)),
    breakthroughSignals: Math.max(1, Math.round(entry.competitive / 92)),
  }));
  return {
    ...universe,
    circuitHistory: [...(universe.circuitHistory ?? []), {
      year,
      activeProspects,
      bands: byBand,
    }].slice(-20),
  };
}
