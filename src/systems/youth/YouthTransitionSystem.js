/**
 * Bridges the visible junior circuit and the professional tour. Ranking alone
 * is not a passport: age, competitive evidence and readiness all matter.
 */
import { ensureYouthShadowHistory } from './YouthShadowHistorySystem.js';

export function getProfessionalReadiness(player = {}) {
  const age = Number(player.age ?? 14);
  const rank = Number(player.rankPosition ?? 64);
  const junior = player.youthProfile?.junior ?? {};
  const ledger = junior.seasonLedger ?? [];
  const currentSeason = ledger.at(-1) ?? {};
  let score = Math.max(0, Math.min(42, (age - 14) * 11));
  score += Math.max(0, Math.min(34, (65 - rank) * 0.55));
  score += Math.min(12, (junior.titles ?? 0) * 5);
  score += Math.min(8, (currentSeason.wins ?? 0) * 0.8);
  if (junior.peakTier === 'JUNIOR_ELITE') score += 7;
  if (junior.peakTier === 'JUNIOR_MASTERS') score += 12;
  return Math.round(Math.max(0, Math.min(100, score)));
}

export function isReadyForProfessionalTransition(player = {}) {
  const age = Number(player.age ?? 14);
  if (age >= 19) return true;
  if (age < 17) return false;
  const threshold = age === 17 ? 58 : 48;
  return getProfessionalReadiness(player) >= threshold;
}

export function promoteYouthToProfessional(player = {}, year = 2025, context = {}) {
  const readiness = getProfessionalReadiness(player);
  const youthProfile = player.youthProfile;
  if (!youthProfile) return { ...player, professionalReadiness: readiness };
  const promoted = {
    ...player,
    professionalReadiness: readiness,
    youthProfile: {
      ...youthProfile,
      junior: { ...youthProfile.junior, status: 'GRADUATED', graduationYear: year },
      transition: {
        ...youthProfile.transition,
        status: 'PRO_DEBUT',
        route: 'JUNIOR_GRADUATE',
        proDebutYear: youthProfile.transition?.proDebutYear ?? year,
        readiness,
      },
      milestones: [...(youthProfile.milestones ?? []), { type: 'PRO_TRANSITION', year, route: 'JUNIOR_GRADUATE', readiness }].slice(-40),
    },
  };
  return ensureYouthShadowHistory(promoted, { year, trigger: 'PRO_TRANSITION', cohortUniverse: context.cohortUniverse });
}

/** Labels a generated fallback as an exception from the abstract cohort, never an unexplained adult spawn. */
export function materializeAlternativePathway(player = {}, year = 2025, context = {}) {
  const youthProfile = player.youthProfile;
  if (!youthProfile) return player;
  const route = youthProfile.origin?.id === 'LATE_DISCOVERY' ? 'LATE_DISCOVERY' : 'COHORT_BREAKTHROUGH';
  const materialized = {
    ...player,
    professionalReadiness: Math.max(48, getProfessionalReadiness(player)),
    youthProfile: {
      ...youthProfile,
      source: 'COHORT_MATERIALIZATION',
      cohortOrigin: context.blueprint ? {
        cohortId: context.blueprint.cohortId,
        region: context.blueprint.region,
        ageBand: context.blueprint.ageBand,
        signal: context.blueprint.signal,
        materializedYear: year,
      } : youthProfile.cohortOrigin,
      junior: {
        ...youthProfile.junior,
        status: 'ALTERNATIVE_PATHWAY',
        circuitEntryYear: youthProfile.junior?.circuitEntryYear ?? Math.max(youthProfile.birthYear ?? year, year - Math.max(1, (player.age ?? 18) - 14)),
        peakTier: youthProfile.junior?.peakTier ?? 'UNTRACKED',
      },
      transition: {
        ...youthProfile.transition,
        status: 'PRO_DEBUT',
        route,
        proDebutYear: year,
      },
      milestones: [...(youthProfile.milestones ?? []), { type: 'COHORT_MATERIALIZED', year, route }].slice(-40),
    },
  };
  return ensureYouthShadowHistory(materialized, { year, trigger: 'ALTERNATIVE_PATHWAY', cohortUniverse: context.cohortUniverse });
}

export function materializeJuniorFromCohort(player = {}, year = 2025, context = {}) {
  const youthProfile = player.youthProfile;
  if (!youthProfile) return player;
  return {
    ...player,
    youthProfile: {
      ...youthProfile,
      source: 'COHORT_MATERIALIZATION',
      cohortOrigin: context.blueprint ? {
        cohortId: context.blueprint.cohortId,
        region: context.blueprint.region,
        ageBand: context.blueprint.ageBand,
        signal: context.blueprint.signal,
        materializedYear: year,
      } : youthProfile.cohortOrigin,
      junior: {
        ...youthProfile.junior,
        status: 'ACTIVE',
        circuitEntryYear: youthProfile.junior?.circuitEntryYear ?? year,
        materializedYear: year,
      },
      milestones: [...(youthProfile.milestones ?? []), { type: 'COHORT_MATERIALIZED', year, route: 'JUNIOR_RADAR' }].slice(-40),
    },
  };
}
