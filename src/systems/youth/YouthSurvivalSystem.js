/**
 * Youth survival is deterministic per player/season, so reloads do not rewrite
 * a life story. It models exits from the pathway, not a judgment of potential.
 */

function hash(value) {
  let result = 2166136261;
  for (const char of String(value ?? 'survival')) {
    result ^= char.charCodeAt(0);
    result = Math.imul(result, 16777619);
  }
  return result >>> 0;
}

function exitReason(player, seed) {
  const profile = player.youthProfile ?? {};
  const origin = profile.origin ?? {};
  const academy = profile.academy ?? {};
  const ledger = profile.junior?.seasonLedger ?? [];
  const recent = ledger.at(-1);
  const options = [];
  if (origin.access === 'LIMITED' || origin.access === 'MODEST') options.push('FINANCIAL');
  if (origin.familySupport === 'FRAGILE') options.push('PERSONAL');
  if ((player.rankPosition ?? 999) > 48 || (recent?.wins ?? 0) === 0) options.push('PLATEAU');
  if (academy.status === 'INDEPENDENT') options.push('STRUCTURE');
  options.push('PERSONAL');
  return options[seed % options.length];
}

export function getJuniorExitRisk(player = {}, year = null) {
  const age = Number(player.age ?? 14);
  const profile = player.youthProfile ?? {};
  const origin = profile.origin ?? {};
  const junior = profile.junior ?? {};
  const rank = Number(player.rankPosition ?? 64);
  let risk = age <= 14 ? 0.018 : age === 15 ? 0.028 : age === 16 ? 0.045 : age === 17 ? 0.06 : 0.075;
  if (origin.access === 'LIMITED') risk += 0.055;
  if (origin.access === 'MODEST') risk += 0.025;
  if (origin.familySupport === 'FRAGILE') risk += 0.045;
  if (profile.academy?.status === 'INDEPENDENT') risk += 0.016;
  if (rank > 48) risk += 0.025;
  if (rank <= 12) risk -= 0.035;
  if ((junior.titles ?? 0) > 0) risk -= 0.02;
  // A resposta de densidade garante acesso/observação, nunca resultados.
  if (player.competitiveDensityRole?.supportExpiresYear && (year == null || year <= player.competitiveDensityRole.supportExpiresYear)) risk -= 0.025;
  return Math.max(0.008, Math.min(0.22, risk));
}

export function resolveJuniorSurvival(players = [], year = 2025) {
  const active = [];
  const droppedOut = [];
  for (const player of players) {
    const seed = hash(`${player.id ?? player.name}:${year}:survival`);
    const roll = (seed % 10000) / 10000;
    const risk = getJuniorExitRisk(player, year);
    if (roll >= risk) {
      active.push(player);
      continue;
    }
    const reason = exitReason(player, seed >>> 7);
    droppedOut.push({
      ...player,
      juniorStatus: 'WITHDRAWN',
      youthProfile: player.youthProfile ? {
        ...player.youthProfile,
        junior: { ...player.youthProfile.junior, status: 'WITHDRAWN', exitYear: year, exitReason: reason },
        transition: { ...player.youthProfile.transition, status: 'EXITED_JUNIOR_PATHWAY' },
        milestones: [...(player.youthProfile.milestones ?? []), { type: 'JUNIOR_PATHWAY_EXIT', year, reason }].slice(-40),
      } : player.youthProfile,
      retirementInfo: {
        ...(player.retirementInfo ?? {}),
        year,
        reason: `JUNIOR_${reason}`,
        isYouthExit: true,
      },
    });
  }
  return { active, droppedOut };
}

export function summarizeYouthSurvivalSeason(universe = {}, year = 2025) {
  const byBand = Object.values((universe.cohorts ?? []).reduce((acc, cohort) => {
    const id = cohort.ageBand;
    const current = acc[id] ?? { ageBand: id, competitive: 0 };
    current.competitive += cohort.competitive ?? 0;
    acc[id] = current;
    return acc;
  }, {})).map((entry, index) => {
    const rate = [0.035, 0.055, 0.08, 0.115][index] ?? 0.08;
    return { ...entry, estimatedExits: Math.round(entry.competitive * rate) };
  });
  return {
    ...universe,
    survivalHistory: [...(universe.survivalHistory ?? []), { year, bands: byBand }].slice(-20),
  };
}
