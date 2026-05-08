/**
 * CircuitPerceptions.js — Percepções dinâmicas do circuito
 * ─────────────────────────────────────────────────────────────────
 * O circuito aprende sobre cada jogador conforme as temporadas passam.
 * Percepções emergem dos resultados reais — e podem estar erradas por anos.
 *
 * Cada percepção:
 *   id         — identificador único
 *   claim      — a afirmação ("Especialista em saibro")
 *   status     — UNCONFIRMED | CONFIRMED | DISPUTED | REFUTED
 *   confidence — 0–100 (cresce com evidências repetidas)
 *   since      — temporada em que emergiu
 *   updatedAt  — última temporada em que mudou
 *   evidence   — dados que geraram essa percepção (para debug)
 *
 * Export principal:
 *   updatePerceptions(player, tournamentResults, year) → player com .perceptions[]
 *   buildPerceptionNarrative(perceptions, player)      → parágrafo em prosa
 *   getMarketAssessment(player, year)                  → string de avaliação de mercado
 */

// ─────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

function safeLower(value) {
  return String(value ?? '').toLowerCase();
}

function normalizeNarrativeTags(tags = []) {
  return new Set((Array.isArray(tags) ? tags : []).map((tag) => safeLower(tag)));
}

function buildEmptyNarrativeMemory(year) {
  return {
    year,
    impacts: [],
    cues: {},
    directHits: 0,
    positiveHits: 0,
    negativeHits: 0,
    dominantCueId: null,
    publicNarrative: {
      tone: 'NEUTRAL',
      stage: 'QUIET',
      line: 'O circuito ainda nao tem narrativa publica forte o suficiente para enquadrar este jogador.',
    },
  };
}

function pushCue(cues, id, delta, impact, sourceRole, tone = 'positive') {
  if (!id || !delta) return;
  const prev = cues[id] ?? {
    score: 0,
    positive: 0,
    negative: 0,
    hits: 0,
    tags: new Set(),
    kinds: new Set(),
    lastYear: impact?.context?.year ?? impact?.year ?? null,
    sourceRoles: new Set(),
  };
  prev.score += delta;
  if (tone === 'negative') prev.negative += Math.abs(delta);
  else prev.positive += Math.abs(delta);
  prev.hits += 1;
  prev.lastYear = impact?.context?.year ?? impact?.year ?? prev.lastYear;
  prev.sourceRoles.add(sourceRole);
  for (const tag of normalizeNarrativeTags(impact?.tags)) prev.tags.add(tag);
  if (impact?.kind) prev.kinds.add(impact.kind);
  cues[id] = prev;
}

function summarizePublicNarrative(cues) {
  const entries = Object.entries(cues)
    .map(([id, value]) => ({ id, ...value }))
    .sort((a, b) => Math.abs(b.score) - Math.abs(a.score));

  if (!entries.length) {
    return {
      tone: 'NEUTRAL',
      stage: 'QUIET',
      line: 'O circuito ainda nao tem narrativa publica forte o suficiente para enquadrar este jogador.',
    };
  }

  const dominant = entries[0];
  const tone = dominant.score >= 0 ? 'POSITIVE' : 'NEGATIVE';
  const magnitude = Math.abs(dominant.score);
  const stage = magnitude >= 8 ? 'CONSOLIDATED' : magnitude >= 5 ? 'BUILDING' : 'EMERGENT';

  const labels = {
    rising_fast: 'uma ascensao que deixou de parecer acaso',
    giant_killer: 'uma ameaca real aos favoritos do circuito',
    clutch_player: 'um nome que o circuito respeita em jogo grande',
    slam_hunter: 'um competidor que cresce nos maiores palcos',
    top10_wall: 'um jogador que ainda escorrega quando o topo aperta',
    slam_choker: 'um nome que ainda carrega duvida nos Slams',
    collapses_tiebreak: 'um competidor que o circuito ainda teme ver vacilar nos momentos curtos',
  };

  const base = labels[dominant.id] ?? 'um retrato publico em movimento';
  const stageLine = stage === 'CONSOLIDATED'
    ? 'ja virou consenso de circuito'
    : stage === 'BUILDING'
      ? 'esta se consolidando semana apos semana'
      : 'comecou a ganhar corpo';

  return {
    tone,
    stage,
    line: tone === 'POSITIVE'
      ? `A narrativa publica sobre este jogador aponta para ${base} e isso ${stageLine}.`
      : `A conversa publica passou a trata-lo como ${base}, e esse rotulo ${stageLine}.`,
  };
}

function collectNarrativeMemory(player, narrativeFeed = [], year) {
  const playerId = player?.id;
  if (!playerId || !Array.isArray(narrativeFeed) || !narrativeFeed.length) {
    return buildEmptyNarrativeMemory(year);
  }

  const memory = buildEmptyNarrativeMemory(year);

  for (const article of narrativeFeed) {
    const impact = article?.narrativeImpact;
    if (!impact) continue;
    const impactYear = impact?.context?.year ?? article?.year ?? year;
    if (impactYear !== year) continue;

    const primaryId = article?.player?.id ?? impact?.context?.winnerId ?? null;
    const secondaryId = article?.playerB?.id ?? impact?.context?.loserId ?? null;
    const isPrimary = primaryId === playerId;
    const isSecondary = secondaryId === playerId;
    if (!isPrimary && !isSecondary) continue;

    memory.impacts.push({
      kind: impact.kind ?? null,
      narrativeType: impact.narrativeType ?? null,
      magnitude: impact.magnitude ?? 0,
      intensity: impact.intensity ?? 0,
      tags: [...normalizeNarrativeTags(impact.tags)],
      role: isPrimary ? 'PRIMARY' : 'SECONDARY',
    });
    memory.directHits += 1;

    const weight = Math.max(1, Math.round(((impact.magnitude ?? 40) + (impact.intensity ?? 40)) / 55));
    const tags = normalizeNarrativeTags(impact.tags);

    if (isPrimary) {
      memory.positiveHits += 1;
      switch (impact.kind) {
        case 'CHAMPION':
          pushCue(memory.cues, 'rising_fast', weight + 1, impact, 'PRIMARY', 'positive');
          if (tags.has('grand-slam')) pushCue(memory.cues, 'slam_hunter', weight + 1, impact, 'PRIMARY', 'positive');
          pushCue(memory.cues, 'clutch_player', 1, impact, 'PRIMARY', 'positive');
          break;
        case 'UPSET':
          pushCue(memory.cues, 'giant_killer', weight + 1, impact, 'PRIMARY', 'positive');
          pushCue(memory.cues, 'rising_fast', 1, impact, 'PRIMARY', 'positive');
          break;
        case 'EPIC_MATCH':
          pushCue(memory.cues, 'clutch_player', weight, impact, 'PRIMARY', 'positive');
          break;
        case 'RIVALRY':
          pushCue(memory.cues, 'clutch_player', 1, impact, 'PRIMARY', 'positive');
          break;
        case 'TREND':
          pushCue(memory.cues, 'rising_fast', 1, impact, 'PRIMARY', 'positive');
          break;
        default:
          break;
      }
    }

    if (isSecondary) {
      memory.negativeHits += 1;
      switch (impact.kind) {
        case 'UPSET':
          pushCue(memory.cues, 'top10_wall', -(weight + 1), impact, 'SECONDARY', 'negative');
          break;
        case 'CHAMPION':
          if (tags.has('grand-slam')) pushCue(memory.cues, 'slam_choker', -weight, impact, 'SECONDARY', 'negative');
          break;
        case 'EPIC_MATCH':
          pushCue(memory.cues, 'collapses_tiebreak', -1, impact, 'SECONDARY', 'negative');
          break;
        default:
          break;
      }
    }
  }

  const sortedCues = Object.entries(memory.cues)
    .map(([id, value]) => ({ id, ...value }))
    .sort((a, b) => Math.abs(b.score) - Math.abs(a.score));
  memory.dominantCueId = sortedCues[0]?.id ?? null;
  memory.publicNarrative = summarizePublicNarrative(memory.cues);
  return memory;
}

function serializeCueMemory(entry = {}) {
  return {
    score: entry.score ?? 0,
    positive: entry.positive ?? 0,
    negative: entry.negative ?? 0,
    hits: entry.hits ?? 0,
    lastYear: entry.lastYear ?? null,
    tags: [...(entry.tags ?? [])],
    kinds: [...(entry.kinds ?? [])],
    sourceRoles: [...(entry.sourceRoles ?? [])],
  };
}

function getConsensusStage(perception) {
  const confidence = perception?.confidence ?? 0;
  const trend = perception?.trend ?? null;
  if (trend === 'STICKY') return 'STICKY';
  if (trend === 'CONTESTED') return 'CONTESTED';
  if (confidence >= 75) return 'ESTABLISHED';
  if (confidence >= 50) return 'CONSOLIDATING';
  return 'EMERGENT';
}

function annotatePerceptionWithNarrative(perception, cue, year) {
  const positive = cue?.positive ?? 0;
  const negative = cue?.negative ?? 0;
  let trend = 'STATIC';

  if (positive > 0 && negative > 0) trend = 'CONTESTED';
  else if (positive >= 5 && (perception?.confidence ?? 0) >= 55) trend = 'BUILDING';
  else if (positive >= 2 && (perception?.since ?? year) === year) trend = 'EMERGENT';
  else if (negative >= 3 && (perception?.status === 'CONFIRMED' || perception?.status === 'UNCONFIRMED')) trend = 'CONTESTED';

  const isNegativeLabel = ['slam_choker', 'top10_wall', 'collapses_tiebreak', 'injury_prone', 'off_court_questions', 'in_decline'].includes(perception?.id);
  if (isNegativeLabel && (perception?.confidence ?? 0) >= 45 && positive >= 2 && negative >= 2) {
    trend = 'STICKY';
  }

  const memory = cue ? serializeCueMemory(cue) : { score: 0, positive: 0, negative: 0, hits: 0, lastYear: year, tags: [], kinds: [], sourceRoles: [] };
  return {
    ...perception,
    trend,
    consensusStage: getConsensusStage({ ...perception, trend }),
    memory,
  };
}

function mergeNarrativeCueIntoPerception(existing, def, cue, year) {
  if (!cue) return existing;
  const base = existing ?? {
    id: def?.id ?? null,
    claim: def?.claim ?? existing?.claim ?? null,
    icon: def?.icon ?? existing?.icon ?? null,
    color: def?.color ?? existing?.color ?? null,
    status: 'UNCONFIRMED',
    confidence: 0,
    since: year,
    updatedAt: year,
    evidence: {},
  };

  const positive = cue.positive ?? 0;
  const negative = cue.negative ?? 0;
  const direction = positive - negative;
  const boost = clamp(Math.abs(direction) * 6 + (cue.hits ?? 0) * 2, 0, 22);
  const nextConfidence = clamp((base.confidence ?? 0) + boost, 12, 96);
  let status = base.status ?? 'UNCONFIRMED';

  if (direction > 0) {
    status = nextConfidence >= 60 ? 'CONFIRMED' : 'UNCONFIRMED';
  } else if (direction < 0 && status !== 'REFUTED') {
    status = nextConfidence >= 45 ? 'DISPUTED' : 'UNCONFIRMED';
  }

  return annotatePerceptionWithNarrative({
    ...base,
    claim: def?.claim ?? base.claim,
    icon: def?.icon ?? base.icon,
    color: def?.color ?? base.color,
    status,
    confidence: nextConfidence,
    updatedAt: year,
    evidence: {
      ...(base.evidence ?? {}),
      narrative: {
        score: direction,
        hits: cue.hits ?? 0,
        positive,
        negative,
      },
    },
  }, cue, year);
}

/** Win rate de um jogador em uma superfície a partir de tournamentResults */
function surfaceWinRate(playerId, surface, tournamentResults) {
  let wins = 0, losses = 0;
  for (const res of Object.values(tournamentResults ?? {})) {
    const t = res?.tournament ?? res?._tournament;
    if (!t || t.surface !== surface) continue;
    const bracket = res.bracket ?? res._bracket;
    if (!bracket) continue;
    for (const round of (bracket.rounds ?? [])) {
      for (const match of (round ?? [])) {
        if (!match?.winner) continue;
        if (match.playerA?.id === playerId || match.playerB?.id === playerId) {
          if (match.winner.id === playerId) wins++; else losses++;
        }
      }
    }
  }
  const total = wins + losses;
  return total >= 3 ? { wins, losses, rate: wins / total, total } : null;
}

/** Coleta stats de tiebreak win rate de um jogador */
function tiebreakWinRate(playerId, tournamentResults) {
  let tbWins = 0, tbLosses = 0;
  for (const res of Object.values(tournamentResults ?? {})) {
    const bracket = res.bracket ?? res._bracket;
    if (!bracket) continue;
    for (const round of (bracket.rounds ?? [])) {
      for (const match of (round ?? [])) {
        if (!match?.winner || !match?.result?.setsDetail) continue;
        const isA = match.playerA?.id === playerId;
        const isB = match.playerB?.id === playerId;
        if (!isA && !isB) continue;
        for (const [gA, gB] of (match.result.setsDetail ?? [])) {
          const isTb = (gA === 7 && gB === 6) || (gA === 6 && gB === 7);
          if (!isTb) continue;
          const wonTb = (isA && gA > gB) || (isB && gB > gA);
          if (wonTb) tbWins++; else tbLosses++;
        }
      }
    }
  }
  const total = tbWins + tbLosses;
  return total >= 4 ? { wins: tbWins, losses: tbLosses, rate: tbWins / total, total } : null;
}

/** Win rate num torneio de Grand Slam vs outros */
function slamVsOtherRate(playerId, tournamentResults) {
  let slamW = 0, slamL = 0, otherW = 0, otherL = 0;
  for (const res of Object.values(tournamentResults ?? {})) {
    const t = res?.tournament ?? res?._tournament;
    const bracket = res.bracket ?? res._bracket;
    if (!bracket) continue;
    const isSlam = t?.category === 'GRAND_SLAM';
    for (const round of (bracket.rounds ?? [])) {
      for (const match of (round ?? [])) {
        if (!match?.winner) continue;
        if (match.playerA?.id !== playerId && match.playerB?.id !== playerId) continue;
        const won = match.winner.id === playerId;
        if (isSlam) { if (won) slamW++; else slamL++; }
        else        { if (won) otherW++; else otherL++; }
      }
    }
  }
  const slamTotal = slamW + slamL, otherTotal = otherW + otherL;
  if (slamTotal < 4 || otherTotal < 6) return null;
  return {
    slamRate:  slamW / slamTotal,  slamTotal,
    otherRate: otherW / otherTotal, otherTotal,
    diff: (slamW / slamTotal) - (otherW / otherTotal),
  };
}

/** % de vitórias do jogador vs oponentes top-10 */
function topTenWinRate(playerId, tournamentResults, allPlayers) {
  const top10Ids = new Set(
    allPlayers.filter(p => (p.rankPosition ?? 999) <= 10).map(p => p.id)
  );
  let wins = 0, losses = 0;
  for (const res of Object.values(tournamentResults ?? {})) {
    const bracket = res.bracket ?? res._bracket;
    if (!bracket) continue;
    for (const round of (bracket.rounds ?? [])) {
      for (const match of (round ?? [])) {
        if (!match?.winner) continue;
        const isA = match.playerA?.id === playerId;
        const isB = match.playerB?.id === playerId;
        if (!isA && !isB) continue;
        const oppId = isA ? match.playerB?.id : match.playerA?.id;
        if (!top10Ids.has(oppId)) continue;
        if (match.winner.id === playerId) wins++; else losses++;
      }
    }
  }
  const total = wins + losses;
  return total >= 3 ? { wins, losses, rate: wins / total, total } : null;
}

/** Coleta aces por partida aproximado a partir das stats do jogador */
function getAcesPerMatch(player, tournamentResults) {
  // Usa careerTitles como proxy — no futuro pode usar stats detalhadas
  const srv = player.attrs?.saqueForca ?? 0;
  const prec = player.attrs?.saquePrecisao ?? 0;
  // Estimativa baseada nos atributos de saque
  return (srv * 0.06 + prec * 0.02);
}

// ─────────────────────────────────────────────────────────────────
// DEFINIÇÕES DE PERCEPÇÃO
// ─────────────────────────────────────────────────────────────────

const PERCEPTION_DEFS = {

  // ── Superfícies ──────────────────────────────────────────────
  clay_specialist: {
    claim: 'Especialista em saibro',
    icon: '🔴',
    color: '#b03a0e',
    evaluate: (player, results, allPlayers, year) => {
      const r = surfaceWinRate(player.id, 'CLAY', results);
      if (!r) return null;
      if (r.rate > 0.65 && r.total >= 6) return { status: 'CONFIRMED', confidence: clamp(Math.round((r.rate - 0.65) * 200 + 60), 55, 95), evidence: { winRate: r.rate, matches: r.total } };
      if (r.rate > 0.55 && r.total >= 4) return { status: 'UNCONFIRMED', confidence: 35, evidence: { winRate: r.rate, matches: r.total } };
      if (r.rate < 0.40 && r.total >= 5) return { status: 'REFUTED', confidence: 80, evidence: { winRate: r.rate, matches: r.total } };
      return null;
    },
  },

  grass_specialist: {
    claim: 'Especialista em grama',
    icon: '🌿',
    color: '#155c2e',
    evaluate: (player, results, allPlayers, year) => {
      const r = surfaceWinRate(player.id, 'GRASS', results);
      if (!r) return null;
      if (r.rate > 0.65 && r.total >= 5) return { status: 'CONFIRMED', confidence: clamp(Math.round((r.rate - 0.65) * 200 + 55), 50, 95), evidence: { winRate: r.rate, matches: r.total } };
      if (r.rate < 0.35 && r.total >= 5) return { status: 'REFUTED', confidence: 75, evidence: { winRate: r.rate, matches: r.total } };
      return null;
    },
  },

  hard_specialist: {
    claim: 'Dominante em quadra rápida',
    icon: '🔵',
    color: '#1e4f96',
    evaluate: (player, results, allPlayers, year) => {
      const r = surfaceWinRate(player.id, 'HARD', results);
      if (!r) return null;
      if (r.rate > 0.68 && r.total >= 8) return { status: 'CONFIRMED', confidence: clamp(Math.round((r.rate - 0.68) * 200 + 60), 55, 95), evidence: { winRate: r.rate, matches: r.total } };
      if (r.rate < 0.38 && r.total >= 6) return { status: 'REFUTED', confidence: 70, evidence: { winRate: r.rate } };
      return null;
    },
  },

  indoor_specialist: {
    claim: 'Especialista em indoor',
    icon: '🏟️',
    color: '#12124a',
    evaluate: (player, results, allPlayers, year) => {
      const r = surfaceWinRate(player.id, 'INDOOR', results);
      if (!r) return null;
      if (r.rate > 0.68 && r.total >= 5) return { status: 'CONFIRMED', confidence: clamp(Math.round((r.rate - 0.68) * 200 + 55), 50, 90), evidence: { winRate: r.rate, matches: r.total } };
      return null;
    },
  },

  // ── Momentos decisivos ────────────────────────────────────────
  clutch_player: {
    claim: 'Clutch em momentos decisivos',
    icon: '⚡',
    color: '#FFD700',
    evaluate: (player, results, allPlayers, year) => {
      const r = tiebreakWinRate(player.id, results);
      if (!r) return null;
      const mental = player.attrs?.mentalidade ?? 60;
      if (r.rate > 0.60 && r.total >= 6) return { status: 'CONFIRMED', confidence: clamp(Math.round((r.rate - 0.60) * 200 + 55 + (mental - 60) * 0.3), 50, 95), evidence: { tbRate: r.rate, tbs: r.total } };
      if (r.rate > 0.52 && r.total >= 4) return { status: 'UNCONFIRMED', confidence: 30, evidence: { tbRate: r.rate } };
      return null;
    },
  },

  collapses_tiebreak: {
    claim: 'Irregular em tiebreaks',
    icon: '📉',
    color: '#ef4444',
    evaluate: (player, results, allPlayers, year) => {
      const r = tiebreakWinRate(player.id, results);
      if (!r) return null;
      if (r.rate < 0.38 && r.total >= 6) return { status: 'CONFIRMED', confidence: clamp(Math.round((0.38 - r.rate) * 200 + 55), 50, 90), evidence: { tbRate: r.rate, tbs: r.total } };
      if (r.rate < 0.45 && r.total >= 4) return { status: 'UNCONFIRMED', confidence: 28, evidence: { tbRate: r.rate } };
      return null;
    },
  },

  // ── Slams ─────────────────────────────────────────────────────
  slam_hunter: {
    claim: 'Eleva o nível nos Grand Slams',
    icon: '⭐',
    color: '#FFD700',
    evaluate: (player, results, allPlayers, year) => {
      const r = slamVsOtherRate(player.id, results);
      if (!r) return null;
      if (r.diff > 0.12 && r.slamTotal >= 6) return { status: 'CONFIRMED', confidence: clamp(Math.round(r.diff * 300 + 45), 50, 90), evidence: { slamRate: r.slamRate, otherRate: r.otherRate } };
      if (r.diff > 0.06 && r.slamTotal >= 4) return { status: 'UNCONFIRMED', confidence: 28, evidence: { diff: r.diff } };
      return null;
    },
  },

  slam_choker: {
    claim: 'Abaixo do esperado nos Slams',
    icon: '😬',
    color: '#f97316',
    evaluate: (player, results, allPlayers, year) => {
      const r = slamVsOtherRate(player.id, results);
      if (!r) return null;
      if (r.diff < -0.14 && r.slamTotal >= 5) return { status: 'CONFIRMED', confidence: clamp(Math.round(Math.abs(r.diff) * 300 + 45), 50, 88), evidence: { slamRate: r.slamRate, otherRate: r.otherRate } };
      if (r.diff < -0.07 && r.slamTotal >= 4) return { status: 'UNCONFIRMED', confidence: 30, evidence: { diff: r.diff } };
      return null;
    },
  },

  // ── Top-10 ────────────────────────────────────────────────────
  giant_killer: {
    claim: 'Caçador de gigantes',
    icon: '🎯',
    color: '#22c55e',
    evaluate: (player, results, allPlayers, year) => {
      const r = topTenWinRate(player.id, results, allPlayers);
      if (!r) return null;
      const rank = player.rankPosition ?? 999;
      const expectedRate = rank <= 10 ? 0.40 : rank <= 30 ? 0.25 : 0.15;
      if (r.rate > expectedRate + 0.18 && r.total >= 4) return { status: 'CONFIRMED', confidence: clamp(Math.round((r.rate - expectedRate) * 300 + 45), 48, 90), evidence: { winRate: r.rate, total: r.total } };
      if (r.rate > expectedRate + 0.10 && r.total >= 3) return { status: 'UNCONFIRMED', confidence: 28, evidence: { winRate: r.rate } };
      return null;
    },
  },

  top10_wall: {
    claim: 'Barreira no top-10',
    icon: '🧱',
    color: '#94a3b8',
    evaluate: (player, results, allPlayers, year) => {
      const r = topTenWinRate(player.id, results, allPlayers);
      if (!r || r.total < 4) return null;
      const rank = player.rankPosition ?? 999;
      const expectedRate = rank <= 10 ? 0.40 : rank <= 30 ? 0.25 : 0.15;
      if (r.rate < expectedRate - 0.15 && r.total >= 5) return { status: 'CONFIRMED', confidence: 58, evidence: { winRate: r.rate, total: r.total } };
      return null;
    },
  },

  // ── Saque ─────────────────────────────────────────────────────
  serve_weapon: {
    claim: 'Saque como arma principal',
    icon: '💥',
    color: '#AA44FF',
    evaluate: (player, results, allPlayers, year) => {
      const srv = player.attrs?.saqueForca ?? 0;
      const prec = player.attrs?.saquePrecisao ?? 0;
      const score = srv * 0.6 + prec * 0.4;
      if (score >= 85) return { status: 'CONFIRMED', confidence: clamp(Math.round((score - 85) * 3 + 70), 70, 95), evidence: { saqueForca: srv, saquePrecisao: prec } };
      if (score >= 75) return { status: 'UNCONFIRMED', confidence: 38, evidence: { score } };
      return null;
    },
  },

  // ── Trajetória ────────────────────────────────────────────────
  rising_fast: {
    claim: 'Em ascensão acelerada',
    icon: '📈',
    color: '#22c55e',
    evaluate: (player, results, allPlayers, year) => {
      const history = player._seasonHistory ?? [];
      if (history.length < 2) return null;
      const last = history[history.length - 1];
      const prev = history[history.length - 2];
      const delta = (last?.ovr ?? 0) - (prev?.ovr ?? 0);
      const rankDelta = (prev?.rank ?? 999) - (last?.rank ?? 999); // positivo = subiu
      if (delta >= 4 && rankDelta >= 20) return { status: 'CONFIRMED', confidence: clamp(Math.round(delta * 8 + rankDelta * 0.3), 55, 90), evidence: { ovrDelta: delta, rankImproved: rankDelta } };
      if (delta >= 3 || rankDelta >= 30) return { status: 'UNCONFIRMED', confidence: 32, evidence: { ovrDelta: delta } };
      return null;
    },
  },

  in_decline: {
    claim: 'Sinal de declínio',
    icon: '📉',
    color: '#ef4444',
    evaluate: (player, results, allPlayers, year) => {
      const history = player._seasonHistory ?? [];
      if (history.length < 2) return null;
      const last = history[history.length - 1];
      const prev = history[history.length - 2];
      const delta = (last?.ovr ?? 0) - (prev?.ovr ?? 0);
      if (last?.inDecline || delta <= -4) return { status: 'CONFIRMED', confidence: clamp(Math.round(Math.abs(delta) * 7 + 45), 48, 88), evidence: { ovrDelta: delta, inDecline: last?.inDecline } };
      if (delta <= -2) return { status: 'UNCONFIRMED', confidence: 28, evidence: { ovrDelta: delta } };
      return null;
    },
  },

  late_bloomer_signal: {
    claim: 'Melhor está por vir',
    icon: '🌱',
    color: '#74ACDF',
    evaluate: (player, results, allPlayers, year) => {
      const age = player.age ?? 25;
      const history = player._seasonHistory ?? [];
      if (history.length < 1 || age < 24) return null;
      const last = history[history.length - 1];
      const delta = last?.ovrDelta ?? 0;
      if (age >= 26 && delta >= 3) return { status: 'CONFIRMED', confidence: clamp(Math.round(delta * 9 + age * 0.5), 45, 85), evidence: { age, ovrDelta: delta } };
      if (age >= 25 && delta >= 2) return { status: 'UNCONFIRMED', confidence: 28, evidence: { age, ovrDelta: delta } };
      return null;
    },
  },

  comeback_king: {
    claim: 'Rei das viradas',
    icon: '🔄',
    color: '#FF8C42',
    evaluate: (player, results, allPlayers, year) => {
      const rec = player.attrs?.recuperacao ?? 60;
      const mental = player.attrs?.mentalidade ?? 60;
      if (rec >= 88 && mental >= 80) return { status: 'CONFIRMED', confidence: clamp(Math.round((rec + mental - 168) * 2 + 60), 60, 92), evidence: { recuperacao: rec, mentalidade: mental } };
      if (rec >= 78 && mental >= 72) return { status: 'UNCONFIRMED', confidence: 32, evidence: { recuperacao: rec } };
      return null;
    },
  },

  // ── Off-court ─────────────────────────────────────────────────
  off_court_questions: {
    claim: 'Questões fora de quadra',
    icon: '📰',
    color: '#f97316',
    evaluate: (player, results, allPlayers, year) => {
      const recentEvents = (player.lifeEventLog ?? []).filter(e =>
        e.year >= year - 1 &&
        ['CONTROVERSY', 'DOPING_ALLEGATION', 'MENTAL_HEALTH_BREAK', 'PUBLIC_DISPUTE', 'AFFAIR_RUMOR'].includes(e.category ?? e.type)
      );
      if (recentEvents.length >= 2) return { status: 'CONFIRMED', confidence: clamp(recentEvents.length * 20 + 35, 40, 80), evidence: { events: recentEvents.length } };
      if (recentEvents.length === 1) return { status: 'UNCONFIRMED', confidence: 22, evidence: { events: 1 } };
      return null;
    },
  },

  iron_constitution: {
    claim: 'Ferro em campo — nunca se machuca',
    icon: '🏋',
    color: '#00FF88',
    evaluate: (player, results, allPlayers, year) => {
      const hist = player.injuryHistory ?? [];
      const seasonsActive = (player._seasonHistory ?? []).length;
      if (seasonsActive < 3) return null;
      const recentInjuries = hist.filter(h => (h.season ?? 0) >= year - 2).length;
      if (recentInjuries === 0 && seasonsActive >= 4) return { status: 'CONFIRMED', confidence: clamp(seasonsActive * 8 + 35, 50, 88), evidence: { injuriesLast2Years: 0 } };
      return null;
    },
  },

  injury_prone: {
    claim: 'Histórico de lesões preocupante',
    icon: '🩺',
    color: '#ef4444',
    evaluate: (player, results, allPlayers, year) => {
      const hist = player.injuryHistory ?? [];
      const recentInjuries = hist.filter(h => (h.season ?? 0) >= year - 2 && (h.grade ?? 1) >= 2).length;
      if (recentInjuries >= 3) return { status: 'CONFIRMED', confidence: clamp(recentInjuries * 15 + 35, 45, 85), evidence: { seriousInjuries: recentInjuries } };
      if (recentInjuries >= 2) return { status: 'UNCONFIRMED', confidence: 30, evidence: { seriousInjuries: recentInjuries } };
      return null;
    },
  },
};

// ─────────────────────────────────────────────────────────────────
// PERCEPÇÕES MUTUAMENTE EXCLUSIVAS
// (se uma for confirmada, a oposta é refutada/removida)
// ─────────────────────────────────────────────────────────────────
const OPPOSITES = {
  clutch_player:     'collapses_tiebreak',
  collapses_tiebreak:'clutch_player',
  slam_hunter:       'slam_choker',
  slam_choker:       'slam_hunter',
  giant_killer:      'top10_wall',
  top10_wall:        'giant_killer',
  rising_fast:       'in_decline',
  in_decline:        'rising_fast',
  iron_constitution: 'injury_prone',
  injury_prone:      'iron_constitution',
};

// ─────────────────────────────────────────────────────────────────
// FUNÇÃO PRINCIPAL
// ─────────────────────────────────────────────────────────────────

/**
 * Atualiza as percepções do circuito sobre um jogador.
 * @param {object} player — objeto completo do jogador
 * @param {object} tournamentResults — state.tournamentResults
 * @param {number} year — temporada atual
 * @param {object[]} allPlayers — todos os jogadores do tour
 * @returns {object} player com .perceptions[] atualizado
 */
export function updatePerceptions(player, tournamentResults, year, allPlayers = [], narrativeFeed = []) {
  const existing = Object.fromEntries(
    (player.perceptions ?? []).map(p => [p.id, { ...p }])
  );

  const updated = { ...existing };
  const narrativeMemory = collectNarrativeMemory(player, narrativeFeed, year);

  for (const [id, def] of Object.entries(PERCEPTION_DEFS)) {
    try {
      const result = def.evaluate(player, tournamentResults, allPlayers, year);
      const cue = narrativeMemory.cues[id] ?? null;
      if (!result) {
        // Sem evidência nova — percepção mantida mas confidence decai levemente
        if (updated[id] && updated[id].status !== 'REFUTED') {
          const decayBase = updated[id].status === 'UNCONFIRMED' ? 8 : 3;
          const decay = cue?.positive ? Math.max(1, decayBase - Math.min(4, cue.positive)) : decayBase;
          const newConf = updated[id].confidence - decay;
          if (newConf <= 0) {
            delete updated[id]; // sumiu das evidências — remove
          } else {
            updated[id] = annotatePerceptionWithNarrative({ ...updated[id], confidence: newConf, updatedAt: year }, cue, year);
          }
        } else if (cue && cue.positive >= 2) {
          updated[id] = mergeNarrativeCueIntoPerception(updated[id], { ...def, id }, cue, year);
        }
        continue;
      }

      const { status, confidence, evidence } = result;
      const existing_ = updated[id];

      if (!existing_) {
        // Nova percepção
        updated[id] = { id, claim: def.claim, icon: def.icon, color: def.color, status, confidence, since: year, updatedAt: year, evidence };
      } else {
        // Atualiza percepção existente — confidence converge para o novo valor
        const newConf = clamp(Math.round(existing_.confidence * 0.65 + confidence * 0.35), 5, 99);
        // Status pode mudar: UNCONFIRMED → CONFIRMED se confidence sobe bastante
        const newStatus = newConf >= 60 ? 'CONFIRMED' : newConf >= 35 ? 'UNCONFIRMED' : existing_.status;
        updated[id] = { ...existing_, status: newStatus, confidence: newConf, updatedAt: year, evidence };
      }

      if (cue) {
        updated[id] = mergeNarrativeCueIntoPerception(updated[id], { ...def, id }, cue, year);
      } else {
        updated[id] = annotatePerceptionWithNarrative(updated[id], null, year);
      }

      // Se confirmada, refutar o oposto
      if (updated[id]?.status === 'CONFIRMED') {
        const oppositeId = OPPOSITES[id];
        if (oppositeId && updated[oppositeId]) {
          updated[oppositeId] = { ...updated[oppositeId], status: 'REFUTED', confidence: 0, updatedAt: year };
        }
      }
    } catch (_) {
      // silencioso — percepção inválida não quebra o fluxo
    }
  }

  // Remove percepções refutadas com mais de 3 temporadas de idade
  for (const [id, p] of Object.entries(updated)) {
    if (p.status === 'REFUTED' && year - (p.updatedAt ?? p.since ?? year) > 3) {
      delete updated[id];
    }
  }

  for (const [id, cue] of Object.entries(narrativeMemory.cues)) {
    if (updated[id] || cue.positive < 2) continue;
    const def = PERCEPTION_DEFS[id];
    if (!def) continue;
    updated[id] = mergeNarrativeCueIntoPerception(null, { ...def, id }, cue, year);
  }

  return {
    ...player,
    publicNarrativeMemory: {
      year,
      directHits: narrativeMemory.directHits,
      positiveHits: narrativeMemory.positiveHits,
      negativeHits: narrativeMemory.negativeHits,
      dominantCueId: narrativeMemory.dominantCueId,
      publicNarrative: narrativeMemory.publicNarrative,
    },
    perceptions: Object.values(updated)
      .map((entry) => annotatePerceptionWithNarrative(entry, narrativeMemory.cues[entry.id] ?? null, year))
      .sort((a, b) => b.confidence - a.confidence),
  };
}

// ─────────────────────────────────────────────────────────────────
// NARRATIVA DE PERCEPÇÕES
// ─────────────────────────────────────────────────────────────────

/**
 * Gera parágrafo em prosa a partir das percepções ativas.
 */
export function buildPerceptionNarrative(perceptions, player) {
  if (!perceptions?.length) {
    return 'O circuito ainda está coletando dados sobre este jogador.';
  }

  const confirmed  = perceptions.filter(p => p.status === 'CONFIRMED').sort((a, b) => b.confidence - a.confidence);
  const disputed   = perceptions.filter(p => p.status === 'DISPUTED' || p.trend === 'CONTESTED');
  const unconfirmed = perceptions.filter(p => p.status === 'UNCONFIRMED').sort((a, b) => b.confidence - a.confidence);
  const building = perceptions.filter(p => p.trend === 'BUILDING').sort((a, b) => (b.memory?.positive ?? 0) - (a.memory?.positive ?? 0));
  const sticky = perceptions.filter(p => p.trend === 'STICKY').sort((a, b) => b.confidence - a.confidence);
  const publicNarrative = player?.publicNarrativeMemory?.publicNarrative ?? null;

  const parts = [];

  if (confirmed.length > 0) {
    const top = confirmed.slice(0, 2).map(p => p.claim.toLowerCase());
    if (top.length === 1) parts.push(`${top[0].charAt(0).toUpperCase() + top[0].slice(1)} é consenso no circuito.`);
    else parts.push(`${top[0].charAt(0).toUpperCase() + top[0].slice(1)} e ${top[1]} são percepções consolidadas.`);
  }

  if (disputed.length > 0) {
    parts.push(`O circuito ainda debate: ${disputed[0].claim.toLowerCase()}.`);
  }

  if (building.length > 0 && !confirmed.length) {
    parts.push(`${building[0].claim} está deixando de ser hipótese e começando a virar consenso.`);
  }

  if (sticky.length > 0) {
    parts.push(`Há também um rótulo que insiste em sobreviver: ${sticky[0].claim.toLowerCase()}.`);
  }

  if (unconfirmed.length > 0 && parts.length < 2) {
    parts.push(`Analistas observam: ${unconfirmed[0].claim.toLowerCase()} — ainda sem consenso.`);
  }

  if (publicNarrative?.line && parts.length < 3) {
    parts.push(publicNarrative.line);
  }

  if (parts.length === 0) {
    return 'Histórico ainda insuficiente para percepções consolidadas.';
  }

  return parts.join(' ');
}

// ─────────────────────────────────────────────────────────────────
// AVALIAÇÃO DE MERCADO (substitui potencial hardcoded)
// ─────────────────────────────────────────────────────────────────

// Seed determinística — mesmo jogador, mesmo texto
function _hashSeed(id) {
  let h = 5381;
  for (let i = 0; i < (id?.length ?? 0); i++) {
    h = ((h << 5) + h) + id.charCodeAt(i);
    h = h & 0x7fffffff;
  }
  return (h % 1000) / 1000;
}

/**
 * Avaliação de mercado dinâmica — considera perceptions + histórico real.
 * Esta função complementa/substitui potentialNarrative do ScoutProfile:
 * em vez de só traduzir o campo potential, olha o que realmente aconteceu.
 */
export function getMarketAssessment(player, year) {
  const perceptions = player.perceptions ?? [];
  const history = player._seasonHistory ?? [];
  const age = player.age ?? 25;
  const confirmed = perceptions.filter(p => p.status === 'CONFIRMED');
  const hasRising = confirmed.some(p => p.id === 'rising_fast');
  const hasDecline = confirmed.some(p => p.id === 'in_decline');
  const hasSlamHunter = confirmed.some(p => p.id === 'slam_hunter');
  const hasSlamChoker = confirmed.some(p => p.id === 'slam_choker');
  const hasLateBloomer = confirmed.some(p => p.id === 'late_bloomer_signal');
  const hasOffCourt = confirmed.some(p => p.id === 'off_court_questions');
  const slams = history.filter(h => h.titleWon === 'SLAM' || h.titleWon === 'GRAND_SLAM').length;
  const seed = _hashSeed(player.id ?? player.name ?? '');
  const variation = Math.floor(seed * 3); // 0, 1, or 2

  // ── Casos especiais de alta precisão ────────────────────────
  if (slams >= 4) {
    const v = [
      `${slams} Grand Slams. O legado está escrito. O mercado já parou de debater.`,
      `Lenda viva com ${slams} Slams. Cada contrato é uma declaração de associação histórica.`,
      `Com ${slams} títulos de Grand Slam, o nome virou sinônimo de era.`,
    ];
    return v[variation];
  }

  if (slams >= 1 && hasSlamHunter) {
    const v = [
      `${slams} Grand Slam${slams > 1 ? 's' : ''} e padrão de crescimento nos maiores palcos. O circuito acredita que há mais por vir.`,
      `Ganhador de Slam que eleva o jogo nas grandes ocasiões. Mercado premium em alta.`,
    ];
    return v[variation % 2];
  }

  if (hasRising && age <= 22) {
    const v = [
      'Ascensão acelerada. Patrocinadores se movem — quem espera paga mais depois.',
      'A curva de crescimento é rara para a idade. O mercado está em movimento.',
      'Um dos nomes mais quentes do circuito jovem. Interesse crescente de marcas Tier 1.',
    ];
    return v[variation];
  }

  if (hasLateBloomer && age >= 26) {
    const v = [
      `${age} anos e ainda em crescimento. Analistas divergem — uns veem teto, outros veem apenas o começo.`,
      'O padrão tardio de desenvolvimento intriga o circuito. Ainda não há consenso.',
      'Cresce quando deveria estagnar. O mercado ainda não sabe o que fazer com esse perfil.',
    ];
    return v[variation];
  }

  if (hasDecline) {
    const v = [
      'Sinais de declínio visíveis. O foco do mercado começa a migrar para os que chegam.',
      'A trajetória descendente preocupa. Patrocinadores monitoram de perto.',
    ];
    return v[variation % 2];
  }

  if (hasSlamChoker && slams === 0) {
    const v = [
      'Consistente no circuito, mas os Slams ainda escapam. Análise cautelosa do mercado.',
      'O grande resultado nos Slams ainda não veio — e o circuito começa a questionar se vai vir.',
    ];
    return v[variation % 2];
  }

  if (hasOffCourt) {
    return 'Turbulências fora de quadra tornam a avaliação mais complexa. Aguarda-se estabilização.';
  }

  // ── Fallback por fase de carreira ────────────────────────────
  const seasonsPlayed = history.length;
  if (seasonsPlayed <= 1) {
    return 'Estreante no tour. Dados insuficientes — o circuito observa.';
  }
  if (seasonsPlayed <= 3) {
    const v = [
      'Ainda construindo o histórico. Cedo para percepções consolidadas.',
      'Poucas temporadas para análise. O mercado aguarda mais evidências.',
    ];
    return v[variation % 2];
  }
  if (age >= 32) {
    return 'Veterano de carreira. A discussão gira em torno do legado, não mais do teto.';
  }

  const rank = player.rankPosition ?? 999;
  if (rank <= 10) return 'Top-10 consolidado. Presença permanente no radar premium do mercado.';
  if (rank <= 30) return 'Profissional de alto nível. Base sólida de mercado — sem a narrativa dos grandes moments ainda.';
  return 'Profissional estabelecido. Mercado estável, sem movimentos expressivos.';
}

