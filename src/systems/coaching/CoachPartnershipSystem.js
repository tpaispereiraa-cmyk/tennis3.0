import { COACH_METHODS, inferCoachMethodForPlayer } from './CoachIdentitySystem.js';

function clamp(v, lo = 0, hi = 100) {
  return Math.max(lo, Math.min(hi, Math.round(v)));
}

function getAttr(player, key, fallback = 55) {
  return player?.attrs?.[key] ?? player?.attrs?.[key.toLowerCase?.()] ?? fallback;
}

export function computeCoachFit(player, coach, ctx = {}) {
  if (!player || !coach) return 0;
  const desired = inferCoachMethodForPlayer(player);
  const methodMatch = desired === coach.method ? 24 : coach.method === 'MENTAL' && (getAttr(player, 'mentalidade') < 58) ? 16 : 0;
  const age = player.age ?? 25;
  const rank = player.rankPosition ?? 999;
  const repFit = rank <= 10 ? coach.reputation * 0.26 : rank <= 50 ? coach.reputation * 0.18 : Math.max(0, 76 - coach.reputation) * 0.10;
  const ambitionFit = rank <= 30 ? coach.ambition * 0.16 : Math.max(0, 75 - coach.ambition) * 0.10;
  const personality = player.personality?.pressPersona?.id ?? player.personality?.temperament?.id ?? '';
  const temperFit = coach.temperament === 'CALMO' && String(personality).includes('CONTROL') ? 8
    : coach.temperament === 'INTENSO' && (getAttr(player, 'agressividade') >= 70) ? 8
    : coach.temperament === 'EXIGENTE' && getAttr(player, 'regularidade') >= 68 ? 7
    : 3;
  const veteranFit = coach.method === 'REFORMADOR' && age >= 30 ? 12 : 0;
  const youngFit = coach.method === 'FORMADOR' && age <= 22 ? 14 : 0;
  const results = ctx.seasonMetrics?.[player.id] ?? {};
  const pressure = (rank <= 8 ? 8 : 0) + ((results.titles ?? 0) === 0 && rank <= 20 ? 5 : 0);
  return clamp(34 + methodMatch + repFit + ambitionFit + temperFit + veteranFit + youngFit - pressure * 0.45);
}

export function createPartnership(player, coach, year, reason = 'MARKET_MATCH', ctx = {}) {
  const alignment = computeCoachFit(player, coach, ctx);
  const expectation = clamp((100 - Math.min(player.rankPosition ?? 100, 100)) * 0.55 + coach.reputation * 0.35 + coach.ambition * 0.20);
  const id = `part_${player.id}_${coach.id}_${year}`;
  const method = COACH_METHODS[coach.method] ?? COACH_METHODS.FORMADOR;
  const contractYears = coach.ambition >= 76 || (player.rankPosition ?? 999) <= 12 ? 3 : (alignment >= 68 ? 2 : 1);
  return {
    id,
    playerId: player.id,
    coachId: coach.id,
    startYear: year,
    endYear: null,
    contractStartYear: year,
    contractEndYear: year + contractYears - 1,
    contractYears,
    renewals: 0,
    status: 'ACTIVE',
    reason,
    coachName: coach.name,
    coachMethod: coach.method,
    coachMethodLabel: method.label,
    confidence: clamp(48 + alignment * 0.35),
    trust: clamp(44 + alignment * 0.34),
    friction: clamp(28 + expectation * 0.12 - alignment * 0.14),
    expectation,
    alignment,
    momentum: 'NEW',
    publicStatus: alignment >= 76 ? 'PROMISING' : expectation >= 72 ? 'PRESSURED' : 'QUIET',
    tacticalFocus: method.tacticalFocus,
    developmentFocus: method.developmentFocus?.slice(0, 2) ?? [],
    titlesTogether: 0,
    slamsTogether: 0,
    bestRank: player.rankPosition ?? null,
    history: [{
      year,
      type: 'START',
      text: `${player.name} inicia parceria com ${coach.name}.`,
      reason,
    }],
  };
}

export function applyPartnershipToPlayer(player, partnership) {
  if (!player || !partnership) return player;
  return {
    ...player,
    coaching: {
      activeCoachId: partnership.coachId,
      activeCoachName: partnership.coachName ?? null,
      coachMethod: partnership.coachMethod ?? null,
      coachMethodLabel: partnership.coachMethodLabel ?? null,
      partnershipId: partnership.id,
      confidence: partnership.confidence,
      trust: partnership.trust,
      friction: partnership.friction,
      expectation: partnership.expectation,
      alignment: partnership.alignment,
      startYear: partnership.startYear,
      publicStatus: partnership.publicStatus,
      tacticalFocus: partnership.tacticalFocus,
      developmentFocus: partnership.developmentFocus ?? [],
      momentum: partnership.momentum,
      contractEndYear: partnership.contractEndYear ?? null,
      contractYears: partnership.contractYears ?? null,
      renewals: partnership.renewals ?? 0,
      history: partnership.history ?? [],
    },
  };
}

export function evaluatePartnershipSeason(player, coach, partnership, year, ctx = {}) {
  if (!player || !coach || !partnership) return { partnership, player, events: [] };
  const metrics = ctx.seasonMetrics?.[player.id] ?? {};
  const titles = metrics.titles ?? 0;
  const slams = metrics.titlesByCategory?.gs ?? 0;
  const rank = player.rankPosition ?? 999;
  const prevRank = ctx.prevRankMap?.[player.id] ?? rank;
  const rankJump = Math.max(0, prevRank - rank);
  const injured = !!player.injury || (player.injuryHistory ?? []).some(e => e.year === year);
  let confidence = partnership.confidence + titles * 5 + slams * 7 + Math.min(10, rankJump * 0.25) - (injured ? 4 : 0);
  const shockEffects = player.circuitShock?.currentEffects ?? {};
  let trust = partnership.trust + Math.min(8, partnership.alignment * 0.04) + (titles ? 3 : -1) - (partnership.friction > 70 ? 4 : 0) + Number(shockEffects.coachTrust ?? 0);
  let friction = partnership.friction + (partnership.expectation > 74 && !titles ? 8 : -3) + (injured ? 4 : 0) - (slams ? 8 : 0) + Number(shockEffects.coachFriction ?? 0);
  confidence = clamp(confidence);
  trust = clamp(trust);
  friction = clamp(friction);
  const seasons = Math.max(1, year - partnership.startYear + 1);
  const next = {
    ...partnership,
    confidence,
    trust,
    friction,
    titlesTogether: (partnership.titlesTogether ?? 0) + titles,
    slamsTogether: (partnership.slamsTogether ?? 0) + slams,
    bestRank: partnership.bestRank ? Math.min(partnership.bestRank, rank) : rank,
    momentum: slams ? 'ERA_RISING' : titles ? 'SURGING' : friction >= 72 ? 'TENSE' : confidence >= 74 ? 'STABLE' : 'SEARCHING',
  };
  const events = [];
  if (seasons >= 3 && (next.slamsTogether >= 2 || next.titlesTogether >= 8) && next.publicStatus !== 'ERA') {
    next.publicStatus = 'ERA';
    events.push({ type: 'COACH_ERA', playerId: player.id, coachId: coach.id, year, confidence, trust, friction, publicStatus: next.publicStatus, text: `${player.name} e ${coach.name} ja parecem uma era, nao uma parceria.` });
  }
  const shouldBreak = seasons >= 2 && (friction >= 82 || (confidence <= 34 && trust <= 38));
  if (shouldBreak) {
    next.status = 'ENDED';
    next.endYear = year;
    next.publicStatus = friction >= 82 ? 'RUPTURE' : 'EXHAUSTED';
    events.push({ type: 'COACH_RUPTURE', playerId: player.id, coachId: coach.id, year, confidence, trust, friction, publicStatus: next.publicStatus, text: `${player.name} encerra parceria com ${coach.name} depois de uma temporada pesada.` });
  } else if (titles || slams || friction >= 72 || rankJump >= 25) {
    events.push({ type: slams ? 'COACH_SLAM' : friction >= 72 ? 'COACH_TENSION' : rankJump >= 25 ? 'COACH_BREAKTHROUGH' : 'COACH_RENEWED', playerId: player.id, coachId: coach.id, year, confidence, trust, friction, publicStatus: next.publicStatus, text: buildPartnershipLine(player, coach, next, { titles, slams, rankJump }) });
  }
  next.history = [
    ...(partnership.history ?? []),
    ...events.map(e => ({ year, type: e.type, text: e.text })),
  ].slice(-12);
  return { partnership: next, player: applyPartnershipToPlayer(player, next), events };
}

/** Decide a continuidade só quando o vínculo chega ao fim. Rupturas seguem sendo
 * possíveis antes disso, mas uma temporada ruim isolada não vira troca automática. */
export function evaluatePartnershipContract(player, coach, partnership, year, ctx = {}) {
  if (!player || !coach || !partnership || partnership.status !== 'ACTIVE') return { partnership, player, events: [] };
  const contractEndYear = partnership.contractEndYear ?? year;
  if (year < contractEndYear) return { partnership, player, events: [] };

  const metrics = ctx.seasonMetrics?.[player.id] ?? {};
  const titles = metrics.titles ?? 0;
  const slams = metrics.titlesByCategory?.gs ?? 0;
  const score = (partnership.confidence ?? 50) * 0.31
    + (partnership.trust ?? 50) * 0.31
    + (partnership.alignment ?? 50) * 0.24
    - (partnership.friction ?? 30) * 0.22
    + Math.min(10, titles * 2 + slams * 5);
  const renew = score >= 55 && (partnership.friction ?? 0) < 76;
  const events = [];
  let next;

  if (renew) {
    const years = partnership.publicStatus === 'ERA' || (partnership.trust ?? 0) >= 76 ? 3 : 2;
    next = {
      ...partnership,
      contractStartYear: year + 1,
      contractEndYear: year + years,
      contractYears: years,
      renewals: (partnership.renewals ?? 0) + 1,
      momentum: (partnership.trust ?? 0) >= 76 ? 'STABLE' : partnership.momentum,
    };
    events.push({
      type: 'COACH_RENEWAL', playerId: player.id, coachId: coach.id, year,
      confidence: next.confidence, trust: next.trust, friction: next.friction,
      contractEndYear: next.contractEndYear,
      text: `${player.name} renova com ${coach.name} até o fim de ${next.contractEndYear}.`,
    });
  } else {
    next = { ...partnership, status:'ENDED', endYear:year, publicStatus:'CONTRACT_ENDED', momentum:'CLOSED' };
    events.push({
      type: 'COACH_CONTRACT_END', playerId: player.id, coachId: coach.id, year,
      confidence: next.confidence, trust: next.trust, friction: next.friction,
      text: `${player.name} e ${coach.name} encerram o contrato sem renovação.`,
    });
  }
  next.history = [...(partnership.history ?? []), ...events.map(event => ({ year, type:event.type, text:event.text }))].slice(-16);
  return { partnership: next, player: applyPartnershipToPlayer(player, next), events };
}

/**
 * Pulso curto da parceria, aplicado após torneios e na virada de cada mês.
 * Não encerra contratos nem substitui técnicos: só deixa a relação acumular
 * memória antes de uma futura decisão de mercado.
 */
export function applyPartnershipPulse(player, coach, partnership, context = {}) {
  if (!player || !coach || !partnership || partnership.status !== 'ACTIVE') {
    return { partnership, player, events: [] };
  }

  const participated = !!context.participated;
  const formDelta = Number(context.formDelta ?? 0);
  const wonTitle = !!context.wonTitle;
  const injured = !!context.injured;
  const monthlyPulse = !!context.monthlyPulse;
  const major = ['GRAND_SLAM', 'SLAM_CLASH', 'MASTERS_1000', 'FINALS'].includes(context.tournament?.category);
  const expectation = partnership.expectation ?? 50;
  let confidenceDelta = 0;
  let trustDelta = 0;
  let frictionDelta = 0;

  if (participated) {
    if (wonTitle) {
      confidenceDelta += major ? 5 : 3;
      trustDelta += major ? 3 : 2;
      frictionDelta -= 2;
    } else if (formDelta > 0) {
      confidenceDelta += 1;
      trustDelta += 1;
      frictionDelta -= 1;
    } else if (formDelta < 0) {
      confidenceDelta -= major ? 2 : 1;
      if (expectation >= 72) frictionDelta += major ? 2 : 1;
    }
  }

  if (injured) {
    confidenceDelta -= 2;
    frictionDelta += 2;
  }
  if (monthlyPulse && !injured && (partnership.alignment ?? 0) >= 68 && (partnership.friction ?? 0) < 52) {
    trustDelta += 1;
  }

  if (!confidenceDelta && !trustDelta && !frictionDelta) {
    return { partnership, player, events: [] };
  }

  const next = {
    ...partnership,
    confidence: clamp((partnership.confidence ?? 50) + confidenceDelta),
    trust: clamp((partnership.trust ?? 50) + trustDelta),
    friction: clamp((partnership.friction ?? 28) + frictionDelta),
    momentum: wonTitle ? 'SURGING' : injured ? 'TESTED' : (partnership.friction ?? 0) + frictionDelta >= 70 ? 'TENSE' : partnership.momentum,
    lastPulse: {
      year: context.year ?? null,
      tournamentId: context.tournament?.id ?? null,
      tournamentName: context.tournament?.name ?? null,
      confidenceDelta,
      trustDelta,
      frictionDelta,
    },
  };

  if (next.publicStatus !== 'ERA') {
    next.publicStatus = next.friction >= 72
      ? 'PRESSURED'
      : next.trust >= 74 && next.confidence >= 68
        ? 'PROMISING'
        : next.publicStatus;
  }

  const events = [];
  if (wonTitle || injured || (major && formDelta <= -4 && expectation >= 72)) {
    const text = wonTitle
      ? `${player.name} e ${coach.name} saem de ${context.tournament?.name ?? 'um torneio'} com a sensação de método validado.`
      : injured
        ? `A lesão em ${context.tournament?.name ?? 'torneio'} testa a confiança entre ${player.name} e ${coach.name}.`
        : `${player.name} deixa ${context.tournament?.name ?? 'o torneio'} sob cobrança, e a parceria com ${coach.name} sente o peso da expectativa.`;
    const type = wonTitle ? 'COACH_TOURNAMENT_HIGH' : injured ? 'COACH_INJURY_TENSION' : 'COACH_TOURNAMENT_TENSION';
    events.push({ type, playerId: player.id, coachId: coach.id, coachName: coach.name, year: context.year, tournamentId: context.tournament?.id ?? null, text });
    next.history = [...(partnership.history ?? []), { year: context.year, type, text }].slice(-16);
  }

  return { partnership: next, player: applyPartnershipToPlayer(player, next), events };
}

function buildPartnershipLine(player, coach, partnership, facts) {
  if (facts.slams) return `${coach.name} vira parte central do grande titulo de ${player.name}.`;
  if (facts.rankJump >= 25) return `${player.name} salta no ranking e o metodo de ${coach.name} ganha credito no circuito.`;
  if (partnership.friction >= 72) return `${player.name} e ${coach.name} mantem o projeto, mas a relacao entra em zona sensivel.`;
  return `${player.name} e ${coach.name} renovam a sensacao de projeto vivo.`;
}

export function getPlayerCoach(player, coachMarket) {
  const id = player?.coaching?.activeCoachId;
  return id ? coachMarket?.coachesById?.[id] ?? null : null;
}

export function getPartnershipForPlayer(player, coachMarket) {
  const id = player?.coaching?.partnershipId;
  return id ? coachMarket?.partnershipsById?.[id] ?? null : null;
}
