import { generateInterview } from '../press/InterviewEngine.js';

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function getRelationshipState(bondScore = 50) {
  if (bondScore >= 50) return 'STABLE';
  if (bondScore >= 30) return 'TENSION';
  if (bondScore >= 15) return 'CRISIS';
  return 'RUPTURE';
}

function collectPlayerImpacts(articles = []) {
  const buckets = new Map();

  const pushFor = (playerId, payload) => {
    if (!playerId) return;
    const current = buckets.get(playerId) ?? [];
    current.push(payload);
    buckets.set(playerId, current);
  };

  for (const article of articles) {
    const impact = article?.narrativeImpact;
    if (!impact) continue;
    if (article?.player?.id) pushFor(article.player.id, { article, impact, role: 'PRIMARY' });
    if (article?.playerB?.id) pushFor(article.playerB.id, { article, impact, role: 'SECONDARY' });
  }

  return buckets;
}

function buildInterviewContext(player, impactEntries = []) {
  const strongest = [...impactEntries].sort((a, b) => (b.impact?.magnitude ?? 0) - (a.impact?.magnitude ?? 0))[0] ?? null;
  if (!strongest) return 'PRE_TOURNAMENT';
  if (strongest.role === 'PRIMARY' && strongest.impact?.kind === 'CHAMPION') return 'CAREER_MILESTONE';
  if (strongest.role === 'PRIMARY') return 'POST_WIN';
  if (strongest.impact?.kind === 'UPSET') return 'POST_UPSET_LOSS';
  return 'POST_LOSS';
}

function buildNarrativeBeat(player, impactEntries = []) {
  const primary = impactEntries.filter((entry) => entry.role === 'PRIMARY');
  const secondary = impactEntries.filter((entry) => entry.role === 'SECONDARY');
  const hasChampion = primary.some((entry) => entry.impact?.kind === 'CHAMPION');
  const hasUpsetWin = primary.some((entry) => entry.impact?.kind === 'UPSET');
  const hasUpsetLoss = secondary.some((entry) => entry.impact?.kind === 'UPSET');

  if (hasChampion) {
    return `${player.name} sai deste capítulo com mudança clara de patamar e passa a carregar uma cobrança nova na bagagem.`;
  }
  if (hasUpsetWin) {
    return `${player.name} ganhou tração pública depois de uma vitória que o circuito não consegue mais tratar como acaso.`;
  }
  if (hasUpsetLoss) {
    return `${player.name} deixa o torneio com uma ferida aberta e mais perguntas do que respostas confortáveis.`;
  }
  if (primary.length >= 2) {
    return `${player.name} vive uma sequência que reforça a ideia de que sua narrativa competitiva está se consolidando.`;
  }
  if (secondary.length >= 2) {
    return `${player.name} entra no próximo torneio carregando pressão acumulada por resultados que ainda pesam na conversa pública.`;
  }
  return `${player.name} segue no centro da conversa do circuito, mas agora com nuances mais difíceis de ignorar.`;
}

function summarizeInterview(interview, fallbackQuote = '') {
  if (!interview || typeof interview !== 'object') {
    return fallbackQuote
      ? { quote: fallbackQuote, generatedAt: Date.now() }
      : null;
  }

  const leadAnswer = Array.isArray(interview.pairs)
    ? interview.pairs.find((pair) => typeof pair?.answer === 'string' && pair.answer.trim())
    : null;

  return {
    contextId: interview.contextId ?? null,
    headline: interview.headline ?? '',
    quote: leadAnswer?.answer ?? fallbackQuote ?? '',
    generatedAt: interview.generatedAt ?? Date.now(),
    journalist: interview.journalist
      ? {
          id: interview.journalist.id ?? null,
          name: interview.journalist.name ?? '',
          outlet: interview.journalist.outlet ?? '',
          icon: interview.journalist.icon ?? '',
        }
      : null,
  };
}

function applyPlayerNarrativeConsequences(player, entries = [], year, stateLike = {}) {
  if (!entries.length) return player;

  const updated = { ...player };
  const primary = entries.filter((entry) => entry.role === 'PRIMARY');
  const secondary = entries.filter((entry) => entry.role === 'SECONDARY');
  const positiveWeight = primary.reduce((sum, entry) => sum + Math.max(1, Math.round((entry.impact?.intensity ?? 40) / 20)), 0);
  const negativeWeight = secondary.reduce((sum, entry) => sum + Math.max(1, Math.round((entry.impact?.intensity ?? 40) / 22)), 0);
  const strongest = [...entries].sort((a, b) => (b.impact?.magnitude ?? 0) - (a.impact?.magnitude ?? 0))[0] ?? null;
  const beat = buildNarrativeBeat(updated, entries);

  if (updated.personality?.currentState) {
    const currentState = { ...updated.personality.currentState };
    const previousMood = currentState.mood ?? 'HUNGRY';
    currentState.pressureLevel = clamp((currentState.pressureLevel ?? 20) + negativeWeight * 5 - positiveWeight * 3, 5, 95);

    if (positiveWeight >= 4) {
      currentState.mood = strongest?.impact?.kind === 'CHAMPION'
        ? ((updated.rankPosition ?? 999) <= 12 ? 'DOMINANT' : 'VINDICATED')
        : (['FRUSTRATED', 'SEARCHING', 'BITTER', 'VULNERABLE'].includes(previousMood) ? 'GALVANIZED' : 'CONFIDENT');
    } else if (negativeWeight >= 4) {
      currentState.mood = strongest?.impact?.kind === 'UPSET'
        ? 'FRUSTRATED'
        : ((currentState.pressureLevel ?? 20) >= 65 ? 'OVERWHELMED' : 'VULNERABLE');
    }

    currentState.publicNarrative = beat;
    currentState.lastNarrativeShift = {
      season: year,
      source: strongest?.impact?.kind ?? 'NARRATIVE',
      positiveWeight,
      negativeWeight,
    };

    updated.personality = {
      ...updated.personality,
      currentState,
      marketability: updated.personality?.marketability
        ? {
            ...updated.personality.marketability,
            score: clamp((updated.personality.marketability.score ?? 30) + positiveWeight * 2 - negativeWeight, 0, 100),
          }
        : updated.personality?.marketability,
    };
  }

  if (updated.coach) {
    const nextBond = clamp((updated.coach.bondScore ?? 50) + positiveWeight * 2 - negativeWeight * 2, 0, 100);
    updated.coach = {
      ...updated.coach,
      bondScore: nextBond,
      relationshipState: getRelationshipState(nextBond),
      lastNarrativePulse: {
        season: year,
        note: positiveWeight >= negativeWeight
          ? 'A parceria absorveu bem o momento recente e saiu fortalecida da semana.'
          : 'A pressão do resultado recente caiu sobre a parceria e deixou a relação mais sensível.',
      },
    };
  }

  updated.phaseTwo = {
    ...(updated.phaseTwo ?? {}),
    visibility: clamp((updated.phaseTwo?.visibility ?? 50) + positiveWeight * 3 - negativeWeight * 2, 0, 100),
    sponsorSignal: clamp((updated.phaseTwo?.sponsorSignal ?? 50) + positiveWeight * 3 - negativeWeight * 2, 0, 100),
    narrativeMomentum: {
      season: year,
      trend: positiveWeight > negativeWeight ? 'SURGING' : negativeWeight > positiveWeight ? 'PRESSURED' : 'STABLE',
      note: beat,
    },
  };

  try {
    updated.latestInterview = summarizeInterview(generateInterview(
      updated,
      buildInterviewContext(updated, entries),
      stateLike,
      { tournament: strongest?.article?.tournament?.name ?? '', rivalName: strongest?.article?.playerB?.name ?? null },
      2,
    ), beat);
  } catch (_) {
    updated.latestInterview = {
      contextId: buildInterviewContext(updated, entries),
      headline: beat,
      quote: beat,
      generatedAt: Date.now(),
    };
  }

  return updated;
}

function applyRivalryConsequences(rivalrySystem, articles = [], year) {
  if (!rivalrySystem?.getRivalry) return;

  for (const article of articles) {
    const impact = article?.narrativeImpact;
    const playerA = article?.player;
    const playerB = article?.playerB;
    if (!impact || !playerA?.id || !playerB?.id) continue;
    if (impact.kind !== 'RIVALRY' && article?.type !== 'RIVALRY' && article?.type !== 'EPIC_MATCH') continue;

    const rivalry = rivalrySystem.getRivalry(playerA.id, playerB.id);
    if (!rivalry) continue;

    const emotionalCharge = clamp((rivalry.emotionalCharge ?? 0) + ((impact.intensity ?? 40) / 35), 0, 6);
    rivalry.emotionalCharge = emotionalCharge;
    rivalry.lastNarrativeBeat = {
      season: year,
      type: impact.kind,
      summary: article.headline ?? impact.summary ?? '',
    };
    rivalry.narrative = emotionalCharge >= 3
      ? `${playerA.name} e ${playerB.name} seguem empurrando um ao outro para uma rivalidade que o circuito já trata como assunto recorrente.`
      : rivalry.narrative;

    if (emotionalCharge >= 4 && rivalry.status === 'ACTIVE') rivalry.status = 'INTENSE';
  }
}

export function applyNarrativeConsequences({
  players = [],
  articles = [],
  rivalrySystem = null,
  year,
  stateLike = {},
} = {}) {
  const impactMap = collectPlayerImpacts(articles);
  const updatedPlayers = players.map((player) =>
    applyPlayerNarrativeConsequences(player, impactMap.get(player.id) ?? [], year, stateLike)
  );

  applyRivalryConsequences(rivalrySystem, articles, year);

  return {
    players: updatedPlayers,
    playerImpacts: impactMap,
  };
}
