import { isTiebreakSetScore } from '../../core/constants.js';

const CATEGORY_WEIGHT = {
  ATP_PROSPECTS: 0.28,
  ATP_100: 0.36,
  ATP_250: 0.46,
  ATP_500: 0.6,
  SLAM_CLASH: 0.72,
  MASTERS_1000: 0.8,
  GRAND_SLAM: 1,
  FINALS: 0.92,
  OLYMPICS: 0.95,
};

const ROUND_WEIGHT = {
  R128: 0.18,
  R64: 0.24,
  R32: 0.3,
  R16: 0.42,
  QF: 0.58,
  SF: 0.76,
  F: 1,
  W: 1,
};

const MAGNITUDE_META = [
  { id: 'SEISMIC', min: 88, label: 'sísmico', duration: 'LONG', weeks: 20 },
  { id: 'MAJOR', min: 70, label: 'maior', duration: 'LONG', weeks: 12 },
  { id: 'HEAVY', min: 54, label: 'pesado', duration: 'MEDIUM', weeks: 8 },
  { id: 'NOTICEABLE', min: 36, label: 'sensível', duration: 'MEDIUM', weeks: 4 },
  { id: 'MINOR', min: 0, label: 'leve', duration: 'SHORT', weeks: 2 },
];

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function normRank(rank) {
  const value = Number(rank);
  return Number.isFinite(value) && value > 0 ? value : 999;
}

function categoryWeight(category) {
  return CATEGORY_WEIGHT[category] ?? 0.42;
}

function roundWeight(round) {
  return ROUND_WEIGHT[round] ?? 0.3;
}

function inferMagnitude(score) {
  return MAGNITUDE_META.find((entry) => score >= entry.min) ?? MAGNITUDE_META.at(-1);
}

function buildPressureChange(kind, magnitudeId) {
  if (kind === 'TITLE') {
    if (magnitudeId === 'SEISMIC' || magnitudeId === 'MAJOR') return 'expectativa explode';
    if (magnitudeId === 'HEAVY') return 'pressão sobe';
    return 'pressão moderada';
  }
  if (kind === 'UPSET') return 'olhares se voltam';
  if (kind === 'RIVALRY') return 'ferida reabre';
  if (kind === 'EPIC_MATCH') return 'respeito cresce';
  return 'temperatura muda';
}

function buildNarrativeType(kind, score, extras = {}) {
  if (kind === 'TITLE') {
    if (extras.isUnderdogTitle) return 'coroação improvável';
    if (extras.isFirstBigTitle) return 'mudança de patamar';
    if (extras.isLegacyTitle) return 'legado reforçado';
    return score >= 70 ? 'afirmação de status' : 'título com eco';
  }
  if (kind === 'UPSET') {
    if ((extras.rankSwing ?? 0) >= 50) return 'choque de circuito';
    return 'zebra legitimadora';
  }
  if (kind === 'RIVALRY') return 'capítulo de rivalidade';
  if (kind === 'EPIC_MATCH') return 'guerra de desgaste';
  if (kind === 'ANALYSIS') return 'sinal de tendência';
  return 'impacto de circuito';
}

function buildAreas(kind, score, extras = {}) {
  const areas = new Set(['MEDIA_MEMORY']);
  if (kind === 'TITLE') {
    areas.add('REPUTATION');
    areas.add('EXPECTATION');
    if (score >= 54) areas.add('SEASON_RACE');
    if (score >= 70) areas.add('LEGACY');
  }
  if (kind === 'UPSET') {
    areas.add('REPUTATION');
    areas.add('EXPECTATION');
    areas.add('FORM_READ');
  }
  if (kind === 'RIVALRY') {
    areas.add('RIVALRY');
    areas.add('EXPECTATION');
  }
  if (kind === 'EPIC_MATCH') {
    areas.add('FORM_READ');
    areas.add('MENTAL_AURA');
  }
  if (kind === 'ANALYSIS') {
    areas.add('SEASON_RACE');
    areas.add('EXPECTATION');
  }
  if (extras.affectsSurfaceIdentity) areas.add('SURFACE_IDENTITY');
  return [...areas];
}

function buildTags(kind, tournament, round, score, extras = {}) {
  const tags = new Set();
  if (kind === 'TITLE') tags.add('title-impact');
  if (kind === 'UPSET') tags.add('upset-impact');
  if (kind === 'RIVALRY') tags.add('rivalry-impact');
  if (kind === 'EPIC_MATCH') tags.add('epic-impact');
  if (kind === 'ANALYSIS') tags.add('trend-impact');
  if (tournament?.category) tags.add(String(tournament.category).toLowerCase());
  if (tournament?.surface) tags.add(String(tournament.surface).toLowerCase());
  if (round) tags.add(String(round).toLowerCase());
  if (score >= 88) tags.add('memory-anchor');
  if (score >= 70) tags.add('season-turning-point');
  if (extras.rankSwing >= 30) tags.add('ranking-shock');
  if (extras.isFirstBigTitle) tags.add('breakthrough');
  if (extras.isLegacyTitle) tags.add('legacy-pressure');
  if (extras.isUnderdogTitle) tags.add('underdog-run');
  if (extras.rivalryHeat >= 0.7) tags.add('rivalry-heat');
  return [...tags];
}

export function buildNarrativeImpact(kind, payload = {}) {
  const tournament = payload.tournament ?? null;
  const round = payload.round ?? 'R32';
  const winner = payload.winner ?? payload.player ?? null;
  const loser = payload.loser ?? payload.playerB ?? null;
  const winnerRank = normRank(winner?.rankPosition);
  const loserRank = normRank(loser?.rankPosition);
  const rankSwing = loser && winner ? Math.max(0, winnerRank - loserRank) : 0;
  const categoryScore = categoryWeight(tournament?.category) * 46;
  const roundScore = roundWeight(round) * 26;
  const rivalryHeat = clamp(Number(payload.rivalry?.intensity ?? payload.rivalryHeat ?? 0), 0, 1);
  const scorelineDrama = clamp(Number(payload.scorelineDrama ?? 0), 0, 1);
  const upsetBonus = kind === 'UPSET' ? clamp(rankSwing / 80, 0, 1) * 22 : 0;
  const rivalryBonus = (kind === 'RIVALRY' ? 10 : 0) + rivalryHeat * 16;
  const epicBonus = kind === 'EPIC_MATCH' ? 12 + scorelineDrama * 12 : 0;
  const titleBonus = kind === 'TITLE' ? 14 : 0;
  const extras = {
    rankSwing,
    rivalryHeat,
    isUnderdogTitle: kind === 'TITLE' && rankSwing >= 18,
    isFirstBigTitle: !!payload.isFirstBigTitle,
    isLegacyTitle: !!payload.isLegacyTitle,
    affectsSurfaceIdentity: !!payload.affectsSurfaceIdentity,
  };

  const intensity = clamp(
    Math.round(categoryScore + roundScore + upsetBonus + rivalryBonus + epicBonus + titleBonus),
    12,
    96
  );
  const magnitude = inferMagnitude(intensity);
  const narrativeType = buildNarrativeType(kind, intensity, extras);
  const affectedAreas = buildAreas(kind, intensity, extras);
  const tags = buildTags(kind, tournament, round, intensity, extras);

  return {
    engineVersion: 1,
    kind,
    narrativeType,
    magnitude: magnitude.id,
    magnitudeLabel: magnitude.label,
    intensity,
    pressureShift: buildPressureChange(kind, magnitude.id),
    suggestedDuration: {
      band: magnitude.duration,
      weeks: magnitude.weeks,
    },
    affectedAreas,
    tags,
    context: {
      tournamentId: tournament?.id ?? null,
      tournamentCategory: tournament?.category ?? null,
      surface: tournament?.surface ?? null,
      round,
      winnerId: winner?.id ?? null,
      loserId: loser?.id ?? null,
      winnerRank: winnerRank < 999 ? winnerRank : null,
      loserRank: loserRank < 999 ? loserRank : null,
      rankSwing,
      rivalryHeat: Number(rivalryHeat.toFixed(2)),
    },
    summary: `${narrativeType} com impacto ${magnitude.label} no circuito`,
  };
}

function computeScorelineDrama(match) {
  const sets = match?.result?.setsDetail ?? [];
  if (!sets.length) return 0;
  const tbSets = sets.filter(([a, b]) => isTiebreakSetScore(a, b)).length;
  const closeSets = sets.filter(([a, b]) => Math.abs(a - b) <= 2).length;
  return clamp((tbSets * 0.4) + (closeSets / Math.max(1, sets.length)) * 0.6, 0, 1);
}

export function buildChampionImpact({ tournament, bracket, rivalry = null, winner, loser, round = 'F', isFirstBigTitle = false, isLegacyTitle = false }) {
  return buildNarrativeImpact('TITLE', {
    tournament,
    round,
    winner: winner ?? bracket?.champion ?? null,
    loser: loser ?? null,
    rivalry,
    isFirstBigTitle,
    isLegacyTitle,
  });
}

export function buildUpsetImpact({ tournament, match, round = 'R32' }) {
  const winner = match?.winner ?? null;
  const loser = match?.playerA?.id === winner?.id ? match?.playerB : match?.playerA;
  return buildNarrativeImpact('UPSET', {
    tournament,
    round,
    winner,
    loser,
    scorelineDrama: computeScorelineDrama(match),
  });
}

export function buildEpicMatchImpact({ tournament, match, round = 'R32' }) {
  const winner = match?.winner ?? null;
  const loser = match?.playerA?.id === winner?.id ? match?.playerB : match?.playerA;
  return buildNarrativeImpact('EPIC_MATCH', {
    tournament,
    round,
    winner,
    loser,
    scorelineDrama: computeScorelineDrama(match),
  });
}

export function buildRivalryImpact({ tournament, match, rivalry, round = 'F' }) {
  const winner = match?.winner ?? null;
  const loser = match?.playerA?.id === winner?.id ? match?.playerB : match?.playerA;
  return buildNarrativeImpact('RIVALRY', {
    tournament,
    round,
    winner,
    loser,
    rivalry,
    rivalryHeat: rivalry?.intensity ?? 0,
    scorelineDrama: computeScorelineDrama(match),
  });
}

export function buildTournamentTrendImpact({ tournament, champion, strongestSignal = null }) {
  return buildNarrativeImpact('ANALYSIS', {
    tournament,
    round: 'W',
    player: champion ?? null,
    playerB: strongestSignal ?? null,
  });
}
