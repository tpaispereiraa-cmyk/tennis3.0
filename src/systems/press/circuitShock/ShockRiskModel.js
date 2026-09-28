import { clamp, seededUnit } from './ShockTypes.js';
import { ensureMoralCore, moralProtectionScore } from './MoralCore.js';

function recentRankPressure(player) {
  const rank = Number(player.rank ?? player.ranking ?? 250);
  const peak = Number(player.careerHighRank ?? player.careerStats?.bestRank ?? rank);
  return clamp((rank - peak) * .45 + Math.max(0, rank - 80) * .08);
}

function financePressure(player) {
  const finance = player.finance ?? player.finances ?? {};
  const balance = Number(finance.balance ?? finance.cash ?? player.money ?? 0);
  const debt = Number(finance.debt ?? 0);
  const lowCash = balance < 0 ? 70 : balance < 25000 ? 35 : balance < 100000 ? 14 : 0;
  return clamp(lowCash + Math.min(45, Math.max(0, debt) / 10000));
}

export function buildShockRiskProfile(rawPlayer, context = {}) {
  const player = ensureMoralCore(rawPlayer);
  const moral = player.circuitShock.moral;
  const life = player.lifeSimulation?.currentEffects ?? {};
  const current = player.personality?.currentState ?? {};
  const physical = Number(player.physicalCondition ?? player.condition ?? 82);
  const age = Number(player.age ?? 24);
  const coachTrust = Number(player.coaching?.trust ?? 50);
  const careerPressure = clamp(recentRankPressure(player) + Number(current.pressureLevel ?? 18) * .55);
  const financial = financePressure(player);
  const health = clamp((100 - physical) * .72 + Math.max(0, life.injuryRisk ?? 0) * 3.5 + Math.max(0, age - 29) * 2);
  const isolation = clamp(58 - coachTrust * .45 - Math.max(0, life.support ?? 0) * 2.5);
  const moralProtection = moralProtectionScore(player);
  const opportunity = clamp(25 + Number(context.integrityScrutiny ?? 0) * -1 + seededUnit(player.id, context.year, 'opportunity') * 35);
  const integrity = clamp(
    careerPressure * .22 + financial * .25 + isolation * .13 + opportunity * .18
    + moral.core.riskTolerance * .13 + moral.core.rationalization * .17
    + (moral.moralStress ?? 0) * .18 - moralProtection * .42,
  );
  const publicLife = clamp(careerPressure * .30 + isolation * .26 + Number(current.mood === 'BAD' ? 24 : 0));
  const competitive = clamp(careerPressure * .28 + Math.max(0, 30 - age) * .45 + Number(player.potential ?? 50) * .16);

  // Fama mede apenas cobertura. Nunca aumenta a chance causal de culpa.
  const rank = Number(player.rank ?? player.ranking ?? 300);
  const fame = Number(player.marketability ?? player.popularity ?? player.reputation?.score ?? 35);
  const majors = Number(player.careerStats?.grandSlams ?? player.grandSlams ?? 0);
  const newsworthiness = clamp(fame * .55 + Math.max(0, 105 - rank) * .24 + Math.min(24, majors * 4));
  return { player, careerPressure, financial, health, isolation, integrity, publicLife, competitive, moralProtection, newsworthiness };
}

export function scoreCandidateForDefinition(player, definition, context = {}) {
  const profile = buildShockRiskProfile(player, context);
  const channel = definition.riskChannel ?? 'publicLife';
  const base = Number(profile[channel] ?? 25);
  const age = Number(player.age ?? 24);
  const active = player.circuitShock?.activeCases?.some(c => c.phase !== 'CLOSED');
  const eligible = !player.retired && !active && (!definition.minAge || age >= definition.minAge) && (!definition.maxAge || age <= definition.maxAge);
  return {
    eligible,
    occurrenceRisk: eligible ? clamp(base + (definition.riskBias ?? 0), 1, 96) : 0,
    newsworthiness: profile.newsworthiness,
    profile,
  };
}
