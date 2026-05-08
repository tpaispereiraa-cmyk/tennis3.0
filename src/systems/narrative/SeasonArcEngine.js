function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function safeNumber(value, fallback = 0) {
  return Number.isFinite(value) ? value : fallback;
}

function getCareerStage(player) {
  const age = player?.age ?? 25;
  if (age <= 20) return { id: 'PRODIGY', label: 'Prodigio' };
  if (age <= 24) return { id: 'ASCENDING', label: 'Ascendente' };
  if (age <= 30) return { id: 'PRIME', label: 'Auge competitivo' };
  if (age <= 34) return { id: 'VETERAN', label: 'Veterano ainda relevante' };
  return { id: 'LATE_CAREER', label: 'Fim de ciclo competitivo' };
}

function getInitialRank(player) {
  const history = Array.isArray(player?._rankHistory) ? player._rankHistory : [];
  const first = history[0]?.rank ?? null;
  return first ?? player?.initialRank ?? player?.rankPosition ?? 999;
}

function getRankTrend(player) {
  const currentRank = player?.rankPosition ?? 999;
  const initialRank = getInitialRank(player);
  const delta = initialRank - currentRank;
  return {
    initialRank,
    currentRank,
    delta,
    direction: delta >= 12 ? 'RISING' : delta <= -12 ? 'FALLING' : 'STABLE',
  };
}

function getFormSignal(player) {
  const recentForm = player?.recentForm ?? {};
  const formScore = safeNumber(recentForm.formScore, 0.5);
  const hotStreak = safeNumber(recentForm.hotStreak, 0);
  const coldStreak = safeNumber(recentForm.coldStreak, 0);
  const formPoints = safeNumber(player?.formPoints, 0);
  const lastRatings = Array.isArray(player?.matchRatingHistory) ? player.matchRatingHistory.slice(-5) : [];
  const ratingAvg = lastRatings.length
    ? lastRatings.reduce((sum, value) => sum + value, 0) / lastRatings.length
    : null;
  const score = clamp(
    45
    + (formScore - 0.5) * 50
    + hotStreak * 4
    - coldStreak * 4
    + Math.max(-10, Math.min(10, formPoints / 4))
    + (ratingAvg != null ? (ratingAvg - 6.5) * 5 : 0),
    0,
    100,
  );
  return {
    score,
    hotStreak,
    coldStreak,
    state: score >= 72 ? 'HOT' : score >= 58 ? 'WARM' : score <= 34 ? 'COLD' : 'NEUTRAL',
  };
}

function getExpectationSignal(player) {
  const publicNarrative = String(player?.publicNarrativeMemory?.publicNarrative?.line ?? player?.personality?.currentState?.publicNarrative ?? '').toLowerCase();
  const market = safeNumber(player?.personality?.marketability?.score, 30);
  const rank = player?.rankPosition ?? 999;
  let score = market * 0.45;

  if (rank <= 5) score += 30;
  else if (rank <= 15) score += 22;
  else if (rank <= 30) score += 14;
  else if (rank <= 60) score += 8;

  if (/consenso|patamar|domin|alvo nas costas|cobrança|cobranca/.test(publicNarrative)) score += 16;
  if (/pressão|pressao|ferida aberta|duvida|debate|rotulo|rótulo/.test(publicNarrative)) score += 10;
  if (/ameaça|ameaca|validação|validacao|tendência|tendencia/.test(publicNarrative)) score += 12;

  return {
    score: clamp(score, 0, 100),
    label: score >= 72 ? 'Expectativa alta' : score >= 50 ? 'Expectativa crescente' : 'Expectativa controlada',
    publicNarrative,
  };
}

function getBigResultSignal(player) {
  const history = Array.isArray(player?._seasonHistory) ? player._seasonHistory : [];
  const recent = history.slice(-2);
  let score = 0;
  let latestLabel = null;

  for (const season of recent) {
    const title = String(season?.titleWon ?? '').toUpperCase();
    if (title === 'SLAM' || title === 'GRAND_SLAM') {
      score += 38;
      latestLabel = latestLabel ?? 'titulo de Slam';
    } else if (title === 'MASTERS' || title === 'MASTERS_1000') {
      score += 28;
      latestLabel = latestLabel ?? 'titulo grande';
    } else if (title === 'ATP500') {
      score += 18;
      latestLabel = latestLabel ?? 'titulo relevante';
    } else if (title === 'ATP250') {
      score += 10;
      latestLabel = latestLabel ?? 'titulo recente';
    }

    const finals = safeNumber(season?.finals, 0);
    score += Math.min(10, finals * 3);
  }

  const slams = safeNumber(player?.careerTitles?.gs, 0);
  const masters = safeNumber(player?.careerTitles?.masters, 0);
  if (slams > 0) latestLabel = latestLabel ?? `${slams} Slam${slams > 1 ? 's' : ''} na carreira`;
  else if (masters > 0) latestLabel = latestLabel ?? `${masters} Masters na carreira`;

  return {
    score: clamp(score, 0, 100),
    latestLabel,
    championStatus: score >= 28 ? 'CHAMPION' : score >= 12 ? 'CONTENDER' : 'CHASER',
  };
}

function classifyArc(player, signals) {
  const { rank, form, expectation, bigResult, careerStage } = signals;
  const publicNarrative = expectation.publicNarrative;
  const age = player?.age ?? 25;

  if (bigResult.championStatus === 'CHAMPION' && expectation.score >= 70) {
    return {
      id: 'CROWN_DEFENSE',
      label: 'Defesa de trono',
      tone: 'PRESSURED',
      summary: 'O ano virou defesa de status: o circuito agora mede se o jogador consegue sustentar a nova altura.',
    };
  }

  if (careerStage.id === 'PRODIGY' && rank.delta >= 18 && form.score >= 58) {
    return {
      id: 'PRODIGY_SURGE',
      label: 'Explosao de prodigio',
      tone: 'ASCENDANT',
      summary: 'A temporada ganhou cheiro de salto geracional e cada semana passa a funcionar como teste de legitimacao.',
    };
  }

  if (careerStage.id === 'VETERAN' && form.score >= 58 && rank.delta >= 8) {
    return {
      id: 'VETERAN_RECHARGE',
      label: 'Veterano em reaceleração',
      tone: 'RESURGENT',
      summary: 'O circuito voltou a enxergar vida longa na campanha e a temporada ganhou contornos de reação adulta.',
    };
  }

  if (rank.delta >= 15 && form.score >= 62) {
    return {
      id: 'ASSERTION_RUN',
      label: 'Temporada de afirmação',
      tone: 'ASCENDANT',
      summary: 'Resultados, forma e ranking contam a mesma história: o jogador está transformando promessa em presença.',
    };
  }

  if (rank.delta <= -12 && expectation.score >= 55) {
    return {
      id: 'PRESSURED_SLIDE',
      label: 'Temporada sob cobrança',
      tone: 'FRAGILE',
      summary: 'O ano entrou numa zona delicada, em que cada torneio vale também como resposta para a pressão acumulada.',
    };
  }

  if (careerStage.id === 'LATE_CAREER' && (form.score >= 54 || bigResult.score >= 18)) {
    return {
      id: 'LATE_LEGACY_PUSH',
      label: 'Corrida por legado',
      tone: 'NOSTALGIC',
      summary: 'A temporada é lida menos como rotina e mais como uma tentativa consciente de escrever mais um capitulo importante.',
    };
  }

  if (/ferida aberta|pressão acumulada|pressao acumulada|duvida|debate/.test(publicNarrative) && form.score <= 45) {
    return {
      id: 'REDEMPTION_SEARCH',
      label: 'Busca por redenção',
      tone: 'UNSTABLE',
      summary: 'O circuito percebe um ano em que o jogador ainda tenta responder ao que deu errado nas semanas anteriores.',
    };
  }

  if (form.score >= 68 && expectation.score <= 48 && age <= 27) {
    return {
      id: 'QUIET_BUILD',
      label: 'Crescimento silencioso',
      tone: 'STEADY',
      summary: 'A temporada sobe em silêncio, com mais consistência do que manchete, mas já começa a empurrar a hierarquia do circuito.',
    };
  }

  return {
    id: 'OPEN_SEASON',
    label: 'Temporada em aberto',
    tone: 'NEUTRAL',
    summary: 'Ainda não há um arco dominante: o ano segue aberto, esperando o torneio que organize a narrativa.',
  };
}

function buildChapterLabel(arc, signals) {
  if (arc.id === 'CROWN_DEFENSE' && signals.form.state === 'HOT') return 'campeao tentando sustentar autoridade';
  if (arc.id === 'PRODIGY_SURGE') return 'jovem empurrando o circuito para uma nova leitura';
  if (arc.id === 'PRESSURED_SLIDE') return 'favorito tentando frear a erosao da propria narrativa';
  if (arc.id === 'REDEMPTION_SEARCH') return 'nome grande buscando resposta rapida';
  if (arc.id === 'VETERAN_RECHARGE') return 'veterano recolocando o nome na conversa';
  if (arc.id === 'QUIET_BUILD') return 'campanha silenciosa que comeca a ganhar peso';
  return 'temporada ainda sem roteiro definitivo';
}

export function buildSeasonArc(player, { year = null } = {}) {
  const rank = getRankTrend(player);
  const form = getFormSignal(player);
  const expectation = getExpectationSignal(player);
  const bigResult = getBigResultSignal(player);
  const careerStage = getCareerStage(player);

  const signals = {
    rank,
    form,
    expectation,
    bigResult,
    careerStage,
  };

  const arc = classifyArc(player, signals);
  const volatility = clamp(
    Math.abs(rank.delta) * 0.7
    + Math.abs(form.score - 50) * 0.6
    + Math.abs(expectation.score - 50) * 0.35,
    0,
    100,
  );

  return {
    id: arc.id,
    label: arc.label,
    tone: arc.tone,
    year,
    summary: arc.summary,
    chapterLabel: buildChapterLabel(arc, signals),
    volatility,
    stage: careerStage,
    signals: {
      rank,
      form,
      expectation,
      bigResult,
    },
  };
}
