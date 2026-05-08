export const O_OUTRO_MUNDO = {
  TOUR_TARGET: 192,
  JUNIOR_TARGET: 64,
  JUNIOR_AGE_MIN: 14,
  JUNIOR_AGE_MAX: 18,
  JUNIOR_MAX_AGE: 18,
  JUNIOR_AGE_OUT: 19,
  JUNIOR_PROMOTION_RANK: 16,
  JUNIOR_FORCED_PROMOTION_AGE: 19,
  NEW_TOUR_ENTRANT_AGE_MIN: 19,
  NEW_TOUR_ENTRANT_AGE_MAX: 23,
};

export function isJuniorPlayer(player) {
  return !!(player?.isProspect || player?.circuitLevel === 'JUNIOR');
}

export function isJuniorEligible(player) {
  return isJuniorPlayer(player) && (player?.age ?? 99) <= O_OUTRO_MUNDO.JUNIOR_MAX_AGE;
}

export function buildJuniorCareerTitles(careerTitles = {}) {
  return {
    ...careerTitles,
    gs: careerTitles.gs ?? 0,
    slamClash: careerTitles.slamClash ?? 0,
    masters: careerTitles.masters ?? 0,
    finals: careerTitles.finals ?? 0,
    atp500: careerTitles.atp500 ?? 0,
    atp250: careerTitles.atp250 ?? 0,
    atp100: careerTitles.atp100 ?? 0,
    prospects: careerTitles.prospects ?? 0,
    prospectsFinals: careerTitles.prospectsFinals ?? 0,
  };
}

export function markAsJunior(player, seasonYear) {
  return {
    ...player,
    age: Math.min(player.age ?? O_OUTRO_MUNDO.JUNIOR_AGE_MAX, O_OUTRO_MUNDO.JUNIOR_AGE_MAX),
    birthYear: player.birthYear ?? (seasonYear - (player.age ?? O_OUTRO_MUNDO.JUNIOR_AGE_MAX)),
    isProspect: true,
    circuitLevel: 'JUNIOR',
    juniorStatus: 'ATIVO',
    careerTitles: buildJuniorCareerTitles(player.careerTitles),
  };
}

export function markAsProfessional(player) {
  return {
    ...player,
    isProspect: false,
    circuitLevel: 'PRO',
    juniorStatus: null,
    careerTitles: buildJuniorCareerTitles(player.careerTitles),
  };
}

export function orderJuniorCandidates(players = []) {
  return [...players].sort((a, b) => {
    const rankA = a.rankPosition ?? 999;
    const rankB = b.rankPosition ?? 999;
    if (rankA !== rankB) return rankA - rankB;
    const ovrA = Number(a?._ovrSeed ?? 0);
    const ovrB = Number(b?._ovrSeed ?? 0);
    if (ovrA !== ovrB) return ovrB - ovrA;
    return String(a.id ?? '').localeCompare(String(b.id ?? ''));
  });
}

