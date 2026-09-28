import { getInjuryDisplayName } from '../health/InjurySystem.js';

export function buildPlayerBiography(player, {
  tournamentResults = null,
  rankingStore = null,
  rivalrySystem = null,
  currentYear = null,
} = {}) {
  if (!player) {
    return createEmptyBio();
  }

  const titles = player.careerTitles ?? {};
  const totalTitles =
    (titles.gs ?? 0) +
    (titles.slamClash ?? 0) +
    (titles.masters ?? 0) +
    (titles.finals ?? 0) +
    (titles.atp500 ?? 0) +
    (titles.atp250 ?? 0) +
    (titles.atp100 ?? 0);

  const seasonHistory = Array.isArray(player._seasonHistory) ? player._seasonHistory : [];
  const careerHistory = Array.isArray(player.careerHistory) ? player.careerHistory : [];
  const history = seasonHistory.length > 0 ? seasonHistory : careerHistory;
  const seasons = history.map(h => h.year).filter(Boolean).sort((a, b) => a - b);
  const debutYear = seasons[0] ?? currentYear ?? null;
  const latestSeason = seasons[seasons.length - 1] ?? currentYear ?? null;
  const peakRankFromHistory = history
    .map(h => h.rank)
    .filter(r => Number.isFinite(r) && r > 0)
    .reduce((best, r) => Math.min(best, r), Number.POSITIVE_INFINITY);
  const peakRankFromStore = rankingStore?.ranked?.find?.(r => r.playerId === player.id)?.bestPosition
    ?? rankingStore?.ranked?.find?.(r => r.playerId === player.id)?.peakPosition
    ?? null;
  const peakRank = Number.isFinite(peakRankFromHistory)
    ? peakRankFromHistory
    : (player.careerBest ?? player.peakRank ?? peakRankFromStore ?? player.rankPosition ?? null);

  const titleEvents = collectTitleEvents(player, tournamentResults);
  const firstTitle = titleEvents[0] ?? null;
  const latestTitle = titleEvents[titleEvents.length - 1] ?? null;
  const firstBigTitle = titleEvents.find(t => BIG_CATEGORIES.has(t.category)) ?? null;
  const latestBigTitle = [...titleEvents].reverse().find(t => BIG_CATEGORIES.has(t.category)) ?? null;

  const bestSurface = resolveBestSurface(player);
  const topRival = resolveTopRival(player, rivalrySystem);
  const currentRank = rankingStore?.ranked?.find?.(r => r.playerId === player.id)?.position ?? player.rankPosition ?? null;
  const recentForm = resolveRecentForm(player, history, currentRank, peakRank);
  const latestInjury = resolveLatestInjury(player);
  const personality = player.personality?.currentState ?? {};
  const primeWindow = resolvePrimeWindow(history, peakRank);
  const retired = resolveRetiredStatus(player);
  const careerMemory = resolveCareerMemory(player);

  const ctx = {
    player,
    titles,
    totalTitles,
    history,
    debutYear,
    latestSeason,
    peakRank,
    currentRank,
    titleEvents,
    firstTitle,
    latestTitle,
    firstBigTitle,
    latestBigTitle,
    bestSurface,
    topRival,
    recentForm,
    latestInjury,
    personality,
    primeWindow,
    retired,
    careerMemory,
  };

  const tone = resolveBiographyTone(ctx);
  const careerPhase = resolveCareerPhase(ctx);
  const legacy = resolveLegacy(ctx);
  const headline = buildHeadline(ctx, tone, careerPhase, legacy);
  const summary = buildSummary(ctx, tone, careerPhase, legacy);
  const paragraphs = buildParagraphs(ctx, tone, careerPhase);
  const chapters = buildChapters(ctx, tone, careerPhase);
  const longBiography = buildLongBiography(ctx, tone, careerPhase, legacy);
  const milestones = buildMilestones(ctx);
  const narrativeFacts = buildNarrativeFacts(ctx);
  const narrativeSignals = buildNarrativeSignals(ctx, narrativeFacts);
  const fullNarrative = buildFullNarrative(ctx, tone, careerPhase, legacy, narrativeFacts, narrativeSignals);

  const tags = [
    peakRank && peakRank <= 10 ? 'elite' : null,
    (titles.gs ?? 0) > 0 ? 'slam' : null,
    (titles.slamClash ?? 0) > 0 ? 'clash' : null,
    bestSurface?.label?.toLowerCase?.() ?? null,
    recentForm,
    tone?.shortTag ?? null,
    careerPhase?.shortTag ?? null,
    legacy?.shortTag ?? null,
    retired ? 'aposentado' : null,
    careerMemory?.favoriteTournament ? 'memoria afetiva' : null,
    careerMemory?.hauntingTournament ? 'fantasma competitivo' : null,
    careerMemory?.keyOpponent ? 'adversario marcante' : null,
  ].filter(Boolean);

  return {
    headline,
    summary,
    paragraphs,
    fullNarrative,
    narrativeFacts,
    narrativeSignals,
    milestones,
    tags,
    chapters,
    longBiography,
    tone,
    careerPhase,
    legacy,
    facts: {
      debutYear,
      totalTitles,
      peakRank,
      currentRank,
      bestSurface,
      topRival,
      latestInjury,
      firstTitle,
      firstBigTitle,
      latestTitle,
      latestBigTitle,
      latestSeason,
      titles,
      primeWindow,
      retired,
      careerMemory,
    },
  };
}

function createEmptyBio() {
  return {
    headline: '',
    summary: '',
    paragraphs: [],
    fullNarrative: '',
    narrativeFacts: {},
    narrativeSignals: [],
    milestones: [],
    tags: [],
    chapters: [],
    longBiography: [],
    tone: null,
    careerPhase: null,
    legacy: null,
    facts: {},
  };
}

const SURFACE_LABELS = {
  HARD: { label: 'Dura', color: '#1565C0' },
  CLAY: { label: 'Saibro', color: '#C4572A' },
  GRASS: { label: 'Grama', color: '#2E7D32' },
  INDOOR: { label: 'Indoor', color: '#6A1B9A' },
  STREET: { label: 'Asfalto', color: '#5BB8E4' },
  CARPET: { label: 'Veludo', color: '#8B5CF6' },
};

const CATEGORY_LABELS = {
  GRAND_SLAM: 'Grand Slam',
  SLAM_CLASH: 'Clash Slam',
  MASTERS_1000: 'Masters 1000',
  FINALS: 'ATP Finals',
  ATP_FINALS: 'ATP Finals',
  ATP_500: 'ATP 500',
  ATP_250: 'ATP 250',
  ATP_100: 'ATP 100',
  OLYMPICS: 'Olimpiada',
};

const BIG_CATEGORIES = new Set(['GRAND_SLAM', 'SLAM_CLASH', 'MASTERS_1000', 'FINALS']);

function collectTitleEvents(player, tournamentResults) {
  const out = [];
  if (!tournamentResults) return out;
  for (const [, res] of Object.entries(tournamentResults)) {
    const tournament = res?.tournament;
    if (!tournament) continue;
    const champion = res?._slim ? res?.champion : res?.bracket?.champion;
    if (!champion || champion.id !== player.id) continue;
    out.push({
      year: tournament.season ?? res?._season ?? null,
      name: tournament.name ?? 'Torneio',
      category: tournament.category ?? '',
      categoryLabel: CATEGORY_LABELS[tournament.category] ?? tournament.category ?? '',
      surface: tournament.surface ?? 'HARD',
      surfaceLabel: SURFACE_LABELS[tournament.surface]?.label ?? tournament.surface ?? 'Dura',
      weekIndex: tournament.weekIndex ?? 999,
    });
  }
  out.sort((a, b) => (a.year - b.year) || (a.weekIndex - b.weekIndex));
  return out.map((event, index) => ({ ...event, order: index + 1 }));
}

function resolveBestSurface(player) {
  const stats = player.surfaceStats ?? {};
  let best = null;
  for (const [surface, raw] of Object.entries(stats)) {
    const wins = raw?.wins ?? raw?.w ?? 0;
    const losses = raw?.losses ?? raw?.l ?? 0;
    const titles = raw?.titlesWon ?? 0;
    const total = wins + losses;
    if (total <= 0 && titles <= 0) continue;
    const winRate = total > 0 ? wins / total : 0;
    const score = (titles * 0.5) + winRate + (total * 0.005);
    if (!best || score > best.score) {
      best = {
        surface,
        score,
        titles,
        wins,
        losses,
        winRate,
        ...(SURFACE_LABELS[surface] ?? { label: surface, color: '#94A3B8' }),
      };
    }
  }
  if (!best && player.surfaceIdentity?.surface) {
    const sid = player.surfaceIdentity;
    return {
      surface: sid.surface,
      label: sid.label ?? sid.surface,
      color: SURFACE_LABELS[sid.surface]?.color ?? '#94A3B8',
      titles: 0,
      wins: 0,
      losses: 0,
      winRate: sid.winRate ?? 0,
    };
  }
  return best;
}

function resolveTopRival(player, rivalrySystem) {
  if (!player?.id || !rivalrySystem?.rivalries) return null;
  const rivals = [];
  for (const [, rivalry] of rivalrySystem.rivalries.entries()) {
    if (rivalry.p1Id !== player.id && rivalry.p2Id !== player.id) continue;
    const wins = rivalry.p1Id === player.id ? rivalry.p1Wins : rivalry.p2Wins;
    const losses = rivalry.p1Id === player.id ? rivalry.p2Wins : rivalry.p1Wins;
    rivals.push({
      opponentId: rivalry.p1Id === player.id ? rivalry.p2Id : rivalry.p1Id,
      opponentName: rivalry.p1Id === player.id ? rivalry.p2Name : rivalry.p1Name,
      totalMatches: rivalry.totalMatches ?? (wins + losses),
      wins,
      losses,
      intensity: rivalry.intensity ?? 0,
      type: rivalry.type ?? 'CLASSIC',
    });
  }
  rivals.sort((a, b) => ((b.intensity + b.totalMatches * 0.1) - (a.intensity + a.totalMatches * 0.1)));
  return rivals[0] ?? null;
}

function resolveRecentForm(player, history, currentRank, peakRank) {
  const strongMoods = new Set(['DOMINANT', 'AT_PEAK', 'GALVANIZED', 'CONFIDENT']);
  const mood = player.personality?.currentState?.mood ?? null;
  if (strongMoods.has(mood)) return 'alta';
  if (currentRank && peakRank && currentRank <= peakRank + 2) return 'alta';
  const last = history[history.length - 1];
  const prev = history[history.length - 2];
  if (last && prev) {
    const rankDelta = (prev.rank ?? 999) - (last.rank ?? 999);
    if (rankDelta >= 8) return 'alta';
    if (rankDelta <= -8) return 'baixa';
  }
  if ((player.personality?.currentState?.mood ?? '') === 'SEARCHING') return 'baixa';
  return 'estavel';
}

function resolveLatestInjury(player) {
  const history = Array.isArray(player.injuryHistory) ? player.injuryHistory : [];
  if (!history.length) return null;
  const latest = history[history.length - 1];
  return {
    type: getInjuryDisplayName(latest),
    rawType: latest?.type ?? null,
    grade: latest?.grade ?? null,
    season: latest?.season ?? latest?.year ?? null,
  };
}

function resolvePrimeWindow(history, peakRank) {
  if (!Array.isArray(history) || !history.length || !peakRank) return null;
  const primeSeasons = history
    .filter(season => Number.isFinite(season.rank) && season.rank <= Math.max(8, peakRank + 5))
    .map(season => season.year)
    .filter(Boolean)
    .sort((a, b) => a - b);
  if (!primeSeasons.length) return null;
  return {
    start: primeSeasons[0],
    end: primeSeasons[primeSeasons.length - 1],
  };
}

function resolveRetiredStatus(player) {
  return Boolean(
    player?.retired ||
    player?.isRetired ||
    player?.retirementYear ||
    player?.careerStatus === 'RETIRED' ||
    player?.status === 'RETIRED'
  );
}

function resolveCareerMemory(player) {
  const memory = player?.careerMemory ?? null;
  if (!memory) return {
    favoriteTournament: null,
    sacredTournament: null,
    breakthroughTournament: null,
    hauntingTournament: null,
    painfulTournament: null,
    keyOpponent: null,
    avoidedOpponent: null,
    respectedOpponent: null,
    profileCount: 0,
    memoryCount: 0,
  };

  const favorites = memory.favorites?.tournaments ?? [];
  const profiles = memory.opponents?.profiles ?? [];
  const favoriteTournament = favorites[0]
    ?? memory.tournaments?.beloved?.[0]
    ?? memory.tournaments?.sacred?.[0]
    ?? memory.tournaments?.provingGrounds?.[0]
    ?? null;
  const sacredTournament = memory.tournaments?.sacred?.[0] ?? null;
  const breakthroughTournament = memory.tournaments?.provingGrounds?.[0] ?? null;
  const hauntingTournament = memory.tournaments?.haunting?.[0] ?? null;
  const painfulTournament = memory.tournaments?.painful?.[0] ?? null;
  const sortedProfiles = [...profiles].sort((a, b) =>
    (b.importance ?? 0) - (a.importance ?? 0) ||
    Math.abs(b.relationshipScore ?? 0) - Math.abs(a.relationshipScore ?? 0)
  );
  const keyOpponent = sortedProfiles[0] ?? null;
  const avoidedOpponent = memory.favorites?.opponentsToAvoid?.[0]
    ?? sortedProfiles.find(p => (p.relationshipScore ?? 0) < -2)
    ?? null;
  const respectedOpponent = memory.opponents?.respected?.[0]
    ?? sortedProfiles.find(p => p.dominantRelationship === 'respected')
    ?? null;

  return {
    favoriteTournament,
    sacredTournament,
    breakthroughTournament,
    hauntingTournament,
    painfulTournament,
    keyOpponent,
    avoidedOpponent,
    respectedOpponent,
    profileCount: profiles.length,
    memoryCount: (memory.tournaments?.all?.length ?? 0) + (memory.opponents?.all?.length ?? 0),
  };
}

function memoryTournamentLine(memory, mode = 'favorite') {
  if (!memory?.tournament?.name) return null;
  const age = memory.playerAge ? `aos ${memory.playerAge} anos` : null;
  const surface = memory.tournament.surfaceLabel ? `no ${memory.tournament.surfaceLabel}` : null;
  const year = memory.year ?? null;
  const base = `${memory.tournament.name}${year ? ` de ${year}` : ''}`;
  const reason = new Set(memory.reasons ?? []);

  if (mode === 'haunting') {
    if (reason.has('painful_upset_loss')) {
      return `${base} virou uma lembranca dificil: ${age ? `${age}, ` : ''}uma derrota para zebra que seguiu maior que o placar.`;
    }
    if (reason.has('close_late_loss')) {
      return `${base} ficou como capitulo inacabado, uma queda grande e apertada que ainda serve de referencia emocional.`;
    }
    return `${base} entrou como memoria dolorosa da carreira.`;
  }

  if (reason.has('young_breakthrough')) {
    return `${base} tem valor afetivo porque foi ali que ${age ? `${age}, ` : ''}o jogador comecou a se apresentar ao mundo.`;
  }
  if (reason.has('won_through_physical_doubt')) {
    return `${base}${surface ? `, ${surface},` : ''} ganhou peso especial por ter vindo em meio a duvidas fisicas e necessidade de provar retorno.`;
  }
  if (reason.has('major_title')) {
    return `${base} ocupa lugar sagrado: titulo grande, pressao grande e uma camada permanente de legado.`;
  }
  if (reason.has('ranking_leap')) {
    return `${base} marcou salto de ranking e mudou a forma como o circuito passou a olhar para ele.`;
  }
  return `${base} aparece como uma das memorias competitivas mais fortes da carreira.`;
}

function opponentMemoryLine(profile, mode = 'key') {
  if (!profile?.opponentName) return null;
  const read = profile.matchupRead?.label ?? null;
  const score = profile.relationshipScore ?? 0;
  const meetings = profile.meetingsRemembered ?? 0;
  if (mode === 'avoid' || score < -2) {
    return `${profile.opponentName} virou um adversario que pesa diferente: ${read ?? 'o encaixe competitivo costuma sair desconfortavel'}, com ${meetings} memoria${meetings !== 1 ? 's' : ''} relevante${meetings !== 1 ? 's' : ''} registrada${meetings !== 1 ? 's' : ''}.`;
  }
  if (mode === 'respect' || profile.dominantRelationship === 'respected') {
    return `${profile.opponentName} aparece como rival de respeito, o tipo de confronto que exige ajuste real e deixa memoria mesmo quando o resultado e favoravel.`;
  }
  if (score > 2) {
    return `${profile.opponentName} e um confronto que tende a trazer confianca: ${read ?? 'o historico emocional sugere encaixe favoravel'}.`;
  }
  return `${profile.opponentName} e o adversario mais presente na memoria recente, um nome que ajuda a explicar a textura competitiva da carreira.`;
}

function buildNarrativeFacts(ctx) {
  const { player, history, titleEvents, latestInjury, topRival, careerMemory } = ctx;
  const titleByYear = {};
  for (const title of titleEvents ?? []) {
    const y = title.year ?? 'unknown';
    if (!titleByYear[y]) titleByYear[y] = [];
    titleByYear[y].push(title);
  }

  const rankedYears = (history ?? [])
    .filter(h => h?.year)
    .map((h, index, arr) => {
      const prev = arr[index - 1] ?? null;
      const titles = titleByYear[h.year] ?? [];
      const rank = Number.isFinite(h.rank) ? h.rank : null;
      const prevRank = Number.isFinite(prev?.rank) ? prev.rank : null;
      const rankGain = rank && prevRank ? prevRank - rank : 0;
      const rankDrop = rank && prevRank ? rank - prevRank : 0;
      const ovr = Number.isFinite(h.ovr) ? h.ovr : Number.isFinite(h.overall) ? h.overall : null;
      const prevOvr = Number.isFinite(prev?.ovr) ? prev.ovr : Number.isFinite(prev?.overall) ? prev.overall : null;
      const ovrDelta = ovr != null && prevOvr != null ? +(ovr - prevOvr).toFixed(1) : 0;
      const bigTitles = titles.filter(t => BIG_CATEGORIES.has(t.category));
      const score =
        titles.length * 8 +
        bigTitles.length * 10 +
        Math.max(0, rankGain) * 0.35 +
        Math.max(0, ovrDelta) * 3 -
        Math.max(0, rankDrop) * 0.18 -
        Math.max(0, -ovrDelta) * 1.5;
      return {
        year: h.year,
        age: h.age ?? null,
        rank,
        prevRank,
        rankGain,
        rankDrop,
        ovr,
        ovrDelta,
        titles,
        bigTitles,
        score,
        inDecline: !!h.inDecline,
        raw: h,
      };
    });

  const goldenYears = [...rankedYears]
    .filter(y => y.score > 0 || y.titles.length || y.bigTitles.length || y.rankGain >= 10)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  const hardYears = [...rankedYears]
    .filter(y => y.rankDrop >= 8 || y.ovrDelta <= -1.5 || y.inDecline)
    .sort((a, b) => (b.rankDrop + Math.max(0, -b.ovrDelta) * 5 + (b.inDecline ? 8 : 0)) - (a.rankDrop + Math.max(0, -a.ovrDelta) * 5 + (a.inDecline ? 8 : 0)))
    .slice(0, 3);

  const injuryEvents = collectInjuryEvents(player);
  const lifeEvents = collectLifeEvents(player);
  const sponsorEvents = collectSponsorEvents(player);
  const careerMoments = collectCareerMoments(player);
  const definingTitle = resolveDefiningTitle(titleEvents);
  const latestTitle = titleEvents?.[titleEvents.length - 1] ?? null;

  return {
    seasonsTracked: rankedYears.length,
    goldenYears,
    hardYears,
    definingTitle,
    latestTitle,
    injuryEvents,
    latestInjury,
    lifeEvents,
    sponsorEvents,
    careerMoments,
    topRival,
    memory: {
      favoriteTournament: careerMemory?.favoriteTournament ?? null,
      hauntingTournament: careerMemory?.hauntingTournament ?? careerMemory?.painfulTournament ?? null,
      keyOpponent: careerMemory?.keyOpponent ?? null,
      avoidedOpponent: careerMemory?.avoidedOpponent ?? null,
      respectedOpponent: careerMemory?.respectedOpponent ?? null,
    },
  };
}

function collectInjuryEvents(player) {
  const raw = [
    ...(Array.isArray(player?.injuryHistory) ? player.injuryHistory : []),
    ...(Array.isArray(player?.inMatchInjuryEvents) ? player.inMatchInjuryEvents : []),
  ];
  const seen = new Set();
  return raw
    .map((inj, index) => {
      const season = inj?.season ?? inj?.year ?? inj?.dateYear ?? null;
      const type = getInjuryDisplayName(inj);
      const grade = inj?.grade ?? inj?.severity ?? null;
      const key = `${season}-${type}-${grade}-${index}`;
      if (seen.has(key)) return null;
      seen.add(key);
      return { season, type, grade, raw: inj };
    })
    .filter(Boolean)
    .sort((a, b) => (a.season ?? 0) - (b.season ?? 0))
    .slice(-5);
}

function collectLifeEvents(player) {
  const pools = [
    player?.lifeEvents,
    player?.lifeEventLog,
    player?.lifeData?.events,
    player?.life?.events,
    player?.personalLife?.events,
  ].filter(Array.isArray);
  return pools
    .flat()
    .filter(Boolean)
    .map((event) => ({
      year: event.year ?? event.season ?? null,
      type: event.type ?? event.category ?? null,
      label: event.label ?? event.title ?? event.headline ?? event.summary ?? null,
      detail: event.detail ?? event.desc ?? event.text ?? event.narrative ?? null,
      raw: event,
    }))
    .filter(event => event.label || event.detail)
    .sort((a, b) => (a.year ?? 0) - (b.year ?? 0))
    .slice(-6);
}

function collectSponsorEvents(player) {
  const pools = [
    player?.sponsorEvents,
    player?.sponsorTimeline,
    player?.sponsorship?.events,
    player?.sponsorship?.history,
    player?.sponsors?.history,
    player?.marketability?.sponsorEvents,
  ].filter(Array.isArray);
  const current = player?.sponsorship?.currentSponsor ?? player?.sponsor ?? player?.sponsors?.current ?? null;
  const events = pools
    .flat()
    .filter(Boolean)
    .map(event => ({
      year: event.year ?? event.season ?? null,
      brand: event.brand ?? event.sponsor ?? event.name ?? event.company ?? null,
      label: event.label ?? event.title ?? event.headline ?? null,
      value: event.value ?? event.amount ?? event.contractValue ?? null,
      raw: event,
    }))
    .filter(event => event.brand || event.label);
  if (current && typeof current === 'object') {
    events.push({
      year: current.year ?? current.since ?? null,
      brand: current.brand ?? current.name ?? current.company ?? null,
      label: current.label ?? 'patrocinio atual',
      value: current.value ?? current.amount ?? null,
      raw: current,
    });
  }
  return events
    .sort((a, b) => (a.year ?? 0) - (b.year ?? 0))
    .slice(-5);
}

function collectCareerMoments(player) {
  return (player?.personality?.careerMoments ?? [])
    .filter(Boolean)
    .map(moment => ({
      year: moment.year ?? null,
      type: moment.type ?? null,
      title: moment.title ?? null,
      desc: moment.desc ?? moment.description ?? moment.narrative ?? null,
      raw: moment,
    }))
    .filter(moment => moment.title || moment.desc)
    .sort((a, b) => (a.year ?? 0) - (b.year ?? 0))
    .slice(-8);
}

function resolveDefiningTitle(titleEvents = []) {
  if (!titleEvents.length) return null;
  return titleEvents.find(t => t.category === 'GRAND_SLAM')
    ?? titleEvents.find(t => t.category === 'SLAM_CLASH')
    ?? titleEvents.find(t => t.category === 'FINALS')
    ?? titleEvents.find(t => t.category === 'MASTERS_1000')
    ?? titleEvents[0];
}

function buildNarrativeSignals(ctx, facts) {
  const signals = new Set();
  if (ctx.firstTitle) signals.add('breakthrough');
  if (facts.goldenYears?.length) signals.add('golden_year');
  if (facts.hardYears?.length) signals.add('lost_year');
  if (facts.injuryEvents?.length || ctx.latestInjury) signals.add('injury_shadow');
  if (ctx.topRival?.opponentName) signals.add('rivalry_defined');
  if (facts.sponsorEvents?.length) signals.add('sponsor_era');
  if (facts.lifeEvents?.length) signals.add('personal_life');
  if (ctx.careerMemory?.hauntingTournament || ctx.careerMemory?.painfulTournament) signals.add('haunting_memory');
  if ((ctx.player?.age ?? 0) >= 30 && ctx.peakRank && ctx.currentRank && ctx.currentRank <= ctx.peakRank + 8) signals.add('late_peak');
  if (ctx.retired) signals.add('closed_career');
  return [...signals];
}

function buildFullNarrative(ctx, tone, careerPhase, legacy, facts, signals) {
  const { player, debutYear, latestSeason, peakRank, currentRank, totalTitles, titles, firstTitle, firstBigTitle, bestSurface, retired, primeWindow } = ctx;
  const density =
    (facts.seasonsTracked ?? 0) +
    (ctx.titleEvents?.length ?? 0) * 2 +
    (facts.injuryEvents?.length ?? 0) +
    (facts.lifeEvents?.length ?? 0) +
    (facts.sponsorEvents?.length ?? 0) +
    (facts.careerMoments?.length ?? 0) +
    (ctx.topRival ? 3 : 0);
  const target = retired || legacy?.key === 'pantheon' || density >= 22 ? 9
    : density >= 13 ? 7
      : density >= 6 ? 5
        : 3;

  const paragraphs = [];
  const rankClause = [
    peakRank ? `melhor ranking #${peakRank}` : null,
    currentRank && !retired ? `ranking atual #${currentRank}` : null,
    totalTitles > 0 ? `${totalTitles} titulo${totalTitles !== 1 ? 's' : ''}` : null,
  ].filter(Boolean).join(', ');
  paragraphs.push(
    debutYear
      ? `${player.name} entrou no circuito em ${debutYear}${latestSeason && latestSeason !== debutYear ? ` e chegou a ${latestSeason} com uma biografia que ja nao cabe apenas em numeros` : ''}. A linha principal combina ${rankClause || 'um projeto competitivo ainda em formacao'}; por baixo dela, aparece uma carreira marcada por ${tone?.shortTag ?? 'constancia'}, por fases de ${careerPhase?.label?.toLowerCase?.() ?? 'definicao'} e por uma pergunta recorrente: quanto dessa trajetoria ainda esta em construcao, e quanto ja virou identidade.`
      : `${player.name} ainda vive o primeiro bloco da propria historia profissional. A biografia, por enquanto, e menos uma lista de conquistas e mais um retrato de promessa, formacao tecnica e tentativa de transformar sinais de teto em memoria real de circuito.`
  );

  if (firstTitle || firstBigTitle || facts.definingTitle) {
    const title = firstBigTitle ?? facts.definingTitle ?? firstTitle;
    const firstLine = firstTitle
      ? `O primeiro trofeu apareceu em ${firstTitle.year ?? 'uma temporada inicial'}, no ${firstTitle.name}`
      : `A primeira grande marca competitiva veio com ${title.name}`;
    const context = title ? titleContext(title, facts) : null;
    paragraphs.push(`${firstLine}${context ? ` (${context})` : ''}. ${firstBigTitle ? `A mudanca de escala veio quando ${player.name} venceu ${firstBigTitle.name}, resultado que transformou expectativa em obrigacao de pertencer.` : 'Mesmo sem uma ruptura maxima imediata, esse ponto deu ao circuito uma referencia concreta para medir seu teto.'}`);
  } else {
    paragraphs.push(`Ainda sem um titulo que organize a narrativa, a carreira se apoia nos sinais: evolucao de ranking, leitura de superficie, maturacao fisica e a busca por uma semana que possa dividir o antes e o depois.`);
  }

  const golden = facts.goldenYears?.[0] ?? null;
  if (golden) {
    paragraphs.push(`${golden.year} aparece como um dos anos que melhor explicam a subida${golden.age ? `, aos ${golden.age} anos` : ''}${yearContext(golden) ? ` (${yearContext(golden)})` : ''}. Foi uma temporada em que resultado e percepcao caminharam juntos: o jogador deixou de parecer apenas competitivo e passou a carregar uma forma mais clara de autoridade.`);
  }

  const hard = facts.hardYears?.[0] ?? null;
  if (hard) {
    paragraphs.push(`A biografia tambem tem seu ano de atrito. ${hard.year} ficou como trecho menos limpo${yearPainContext(hard) ? ` (${yearPainContext(hard)})` : ''}, lembrando que a carreira nao se moveu em linha reta. Esse tipo de queda importa porque muda o modo como cada retorno e lido: nao basta voltar a vencer, e preciso provar que a versao anterior ainda existe ou que uma nova versao nasceu.`);
  }

  if (bestSurface?.label) {
    paragraphs.push(`Em termos de quadra, ${bestSurface.label.toLowerCase()} virou o idioma mais natural da carreira${bestSurface.wins || bestSurface.losses ? ` (${bestSurface.wins ?? 0}v/${bestSurface.losses ?? 0}d no recorte conhecido)` : ''}. Ali o jogo pareceu encontrar uma traducao mais simples entre tecnica e resultado, como se a superficie reduzisse o ruido e deixasse aparecer a assinatura competitiva.`);
  }

  const coaching = player.coaching ?? null;
  const coachMoment = coaching?.history?.slice?.(-1)?.[0] ?? null;
  if (coaching?.activeCoachId) {
    paragraphs.push(`No banco, a carreira tambem ganhou uma camada propria. A parceria iniciada${coaching.startYear ? ` em ${coaching.startYear}` : ''} carrega status de ${String(coaching.publicStatus ?? 'projeto').toLowerCase()}, com foco em ${coaching.tacticalFocus ?? 'ajuste tatico'} e uma relacao medida por confianca ${Math.round(coaching.confidence ?? 0)}, vinculo ${Math.round(coaching.trust ?? 0)} e atrito ${Math.round(coaching.friction ?? 0)}. ${coachMoment?.text ?? 'Esse tipo de detalhe importa porque explica por que algumas fases parecem metodo, e nao apenas forma.'}`);
  }

  if (ctx.topRival?.opponentName) {
    const r = ctx.topRival;
    paragraphs.push(`Nenhuma carreira ganha contorno completo sem os nomes que a contrariam, e o principal espelho de ${player.name} foi ${r.opponentName} (${r.wins ?? 0}-${r.losses ?? 0}, ${r.totalMatches ?? 0} encontro${r.totalMatches === 1 ? '' : 's'} lembrado${r.totalMatches === 1 ? '' : 's'}). Essa rivalidade funciona como uma segunda biografia: nela aparecem ajustes, feridas, orgulho, teimosia e a necessidade de responder ao mesmo problema mais de uma vez.`);
  }

  const injury = facts.injuryEvents?.[facts.injuryEvents.length - 1] ?? ctx.latestInjury ?? null;
  if (injury) {
    paragraphs.push(`O corpo tambem escreveu parte do texto. ${injury.type ?? injury.rawType ?? 'Uma lesao relevante'}${injury.season ? ` em ${injury.season}` : ''}${injury.grade ? ` (grau ${injury.grade})` : ''} entrou como marca de fragilidade e resistencia ao mesmo tempo. A lesao nao explica tudo, mas ajuda a entender pausas, quedas de ritmo e a maneira como cada sequencia forte depois dela ganha um peso emocional maior.`);
  }

  const sponsor = facts.sponsorEvents?.[facts.sponsorEvents.length - 1] ?? null;
  if (sponsor) {
    paragraphs.push(`Fora da quadra, a imagem publica tambem cresceu em camadas. ${sponsor.brand ?? sponsor.label} aparece como parte dessa fase comercial${sponsor.year ? ` desde ${sponsor.year}` : ''}${sponsor.value ? ` (contrato avaliado em ${sponsor.value})` : ''}, sinal de que a carreira passou a ser vendida nao so por resultado, mas por personagem, promessa de audiencia e identidade reconhecivel.`);
  }

  const life = facts.lifeEvents?.[facts.lifeEvents.length - 1] ?? null;
  if (life) {
    paragraphs.push(`A vida pessoal entrou no enquadramento sem substituir o tenis. ${life.label ?? life.detail}${life.year ? `, em ${life.year}` : ''}, adicionou uma camada de contexto ao jogador publico: o circuito passou a enxergar nao apenas o atleta que soma semanas, mas alguem cuja historia fora da quadra tambem interfere no tom das perguntas e no peso das respostas.`);
  }

  const memoryLines = [
    memoryTournamentLine(facts.memory?.favoriteTournament, 'favorite'),
    memoryTournamentLine(facts.memory?.hauntingTournament, 'haunting'),
    opponentMemoryLine(facts.memory?.respectedOpponent, 'respect'),
    opponentMemoryLine(facts.memory?.avoidedOpponent, 'avoid'),
  ].filter(Boolean);
  if (memoryLines.length) {
    paragraphs.push(`A memoria interna da carreira da textura ao retrato. ${memoryLines.join(' ')} Sao detalhes que nao aparecem apenas como curiosidade: eles explicam onde o jogador parece mais em casa, quais derrotas ainda cobram resposta e quais adversarios obrigam uma versao mais precisa de si mesmo.`);
  }

  const moment = facts.careerMoments?.[facts.careerMoments.length - 1] ?? null;
  if (moment) {
    paragraphs.push(`${moment.year ? `Em ${moment.year}, ` : ''}${moment.title ?? 'um momento de carreira'} entrou como nota de rodape que virou leitura de personagem. ${moment.desc ?? 'O episodio reforcou a percepcao de que a carreira tambem se define por reacoes, nao apenas por resultados.'}`);
  }

  const trophyDetail = totalTitles > 0
    ? `No balanco frio, sao ${totalTitles} titulo${totalTitles !== 1 ? 's' : ''}${(titles.gs ?? 0) ? `, incluindo ${titles.gs} Grand Slam${titles.gs !== 1 ? 's' : ''}` : ''}${(titles.masters ?? 0) ? ` e ${titles.masters} Masters 1000` : ''}.`
    : `No balanco frio, ainda falta a colecao que transforma promessa em arquivo historico.`;
  const primeDetail = primeWindow?.start
    ? ` O melhor recorte competitivo se concentra entre ${primeWindow.start}${primeWindow.end && primeWindow.end !== primeWindow.start ? ` e ${primeWindow.end}` : ''}.`
    : '';
  paragraphs.push(`${trophyDetail}${primeDetail} ${legacy?.summary ?? ''} ${retired ? 'Com a carreira encerrada, cada numero deixa de ser previsao e vira evidencia.' : 'Enquanto a carreira continua aberta, cada nova temporada ainda pode reorganizar o significado das anteriores.'}`);

  return paragraphs.slice(0, target).join('\n\n');
}

function titleContext(title, facts) {
  if (!title) return null;
  const sameYear = facts.goldenYears?.find(y => y.year === title.year);
  const bits = [
    title.categoryLabel || CATEGORY_LABELS[title.category],
    title.surfaceLabel,
    title.order ? `${title.order}o titulo da carreira` : null,
    sameYear?.rankGain >= 8 ? `ano em que subiu ${sameYear.rankGain} posicoes` : null,
  ].filter(Boolean);
  return bits.join(', ');
}

function yearContext(year) {
  if (!year) return null;
  const bits = [];
  if (year.rankGain > 0) bits.push(`subiu ${year.rankGain} posicoes`);
  if (year.ovrDelta > 0) bits.push(`ganhou ${year.ovrDelta} de nivel`);
  if (year.titles?.length) bits.push(`venceu ${year.titles.length} torneio${year.titles.length !== 1 ? 's' : ''}`);
  if (year.bigTitles?.length) bits.push(`${year.bigTitles.length} grande${year.bigTitles.length !== 1 ? 's' : ''}`);
  return bits.join(', ');
}

function yearPainContext(year) {
  if (!year) return null;
  const bits = [];
  if (year.rankDrop > 0) bits.push(`caiu ${year.rankDrop} posicoes`);
  if (year.ovrDelta < 0) bits.push(`perdeu ${Math.abs(year.ovrDelta)} de nivel`);
  if (year.inDecline) bits.push('entrou em declinio');
  return bits.join(', ');
}

function resolveBiographyTone(ctx) {
  const { player, titles, peakRank, topRival, recentForm, bestSurface, latestInjury } = ctx;
  const buildStyle = player.prefs?.buildStyle ?? null;
  const mood = player.personality?.currentState?.mood ?? null;
  const pressTone = player.personality?.pressPersona?.interviewTone ?? null;

  if ((titles.gs ?? 0) >= 3 || (peakRank ?? 999) <= 2) {
    return { key: 'imperial', label: 'Narrativa imperial', shortTag: 'hegemonia', color: 'gold', blurb: 'A biografia ja se organiza em torno de peso historico, dominio e legado de elite.' };
  }
  if (latestInjury && recentForm === 'baixa') {
    return { key: 'resiliente', label: 'Arco de resiliencia', shortTag: 'resiliencia', color: 'warn', blurb: 'A carreira pede leitura de resistencia, absorcao de golpes e capacidade de voltar.' };
  }
  if (topRival?.totalMatches >= 6 || topRival?.intensity >= 7) {
    return { key: 'combativo', label: 'Roteiro de rivalidade', shortTag: 'duelos', color: 'rival', blurb: 'A identidade competitiva se fortaleceu em grandes duelos e espelhos recorrentes.' };
  }
  if (recentForm === 'alta' && (peakRank ?? 999) <= 25) {
    return { key: 'ascendente', label: 'Ascensao controlada', shortTag: 'ascensao', color: 'accent', blurb: 'O momento recente empurra a narrativa para crescimento, consolidacao e novo teto.' };
  }
  if (buildStyle === 'DROP_VARIATION' || buildStyle === 'SLICE_CONTROL' || pressTone === 'showman') {
    return { key: 'autor', label: 'Assinatura autoral', shortTag: 'autor', color: 'purple', blurb: 'O texto gira em torno de um idioma proprio de quadra, cheio de variacao e identidade.' };
  }
  if (bestSurface?.surface === 'CLAY' || mood === 'LOCKED_IN') {
    return { key: 'metodico', label: 'Construcao metodica', shortTag: 'metodo', color: 'surface', blurb: 'A carreira passa a impressao de lapidacao longa, paciencia tatica e peso de rotina.' };
  }
  return { key: 'consistente', label: 'Consistencia competitiva', shortTag: 'constancia', color: 'neutral', blurb: 'O fio condutor e a permanencia competitiva, com capitulos de evolucao e manutencao de nivel.' };
}

function resolveCareerPhase(ctx) {
  const { player, totalTitles, peakRank, currentRank, recentForm, latestInjury, latestTitle, latestBigTitle, retired } = ctx;
  const age = player.age ?? null;
  const gapToPeak = (currentRank && peakRank) ? currentRank - peakRank : null;
  const latestTitleYear = latestTitle?.year ?? null;
  const latestBigTitleYear = latestBigTitle?.year ?? null;
  const currentYear = ctx.latestSeason ?? ctx.debutYear ?? null;

  if (retired) {
    return { key: 'closed', label: 'Carreira encerrada', shortTag: 'fim', tone: 'neutral', summary: 'O ciclo competitivo ja foi fechado, e agora a leitura principal e de obra concluida e legado.' };
  }
  if (latestInjury && recentForm === 'baixa') {
    return { key: 'rebuilding', label: 'Reconstrucao', shortTag: 'rebuild', tone: 'warn', summary: 'A carreira atravessa um trecho de ajuste, resposta fisica e busca por tracao competitiva.' };
  }
  if ((peakRank ?? 999) <= 3 && (gapToPeak == null || gapToPeak <= 4) && recentForm === 'alta') {
    return { key: 'peak', label: 'Auge competitivo', shortTag: 'peak', tone: 'gold', summary: 'A narrativa atual e de teto alto, peso de elite e proximidade real do melhor tenis da carreira.' };
  }
  if ((peakRank ?? 999) <= 12 && totalTitles >= 8 && (gapToPeak == null || gapToPeak <= 10)) {
    return { key: 'established', label: 'Estabilidade de elite', shortTag: 'elite', tone: 'accent', summary: 'Ja nao se trata de promessa: o jogador vive a fase de manutencao de patamar e consolidacao de legado.' };
  }
  if (recentForm === 'alta' && ((peakRank ?? 999) <= 30 || totalTitles >= 3)) {
    return { key: 'ascending', label: 'Ascensao', shortTag: 'rise', tone: 'accent', summary: 'A curva do momento aponta para ganho de patamar, leitura publica crescente e teto ainda em expansao.' };
  }
  if ((age ?? 0) >= 31 && gapToPeak != null && gapToPeak >= 15 && !latestBigTitleYear) {
    return { key: 'late', label: 'Veterano em transicao', shortTag: 'veterano', tone: 'neutral', summary: 'O texto da carreira mistura experiencia, memoria competitiva e tentativa de prolongar relevancia.' };
  }
  if (!latestTitleYear && totalTitles === 0) {
    return { key: 'emerging', label: 'Primeiros capitulos', shortTag: 'inicio', tone: 'accent', summary: 'Ainda e um nome em definicao, com mais promessa de historia do que trofeus acumulados.' };
  }
  if (currentYear && latestBigTitleYear && (currentYear - latestBigTitleYear) <= 1) {
    return { key: 'established', label: 'Pos-vitoria grande', shortTag: 'grande fase', tone: 'gold', summary: 'Os capitulos mais recentes ainda orbitam um grande titulo, o que sustenta uma fase de alto peso.' };
  }
  return { key: 'steady', label: 'Estabilidade competitiva', shortTag: 'estavel', tone: 'neutral', summary: 'A carreira vive um trecho de manutencao, sem ruptura extrema mas com identidade bem definida.' };
}

function resolveLegacy(ctx) {
  const { titles, totalTitles, peakRank, topRival, retired } = ctx;
  let score = 0;
  score += (titles.gs ?? 0) * 10;
  score += (titles.slamClash ?? 0) * 6;
  score += (titles.masters ?? 0) * 5;
  score += (titles.finals ?? 0) * 8;
  score += (titles.atp500 ?? 0) * 2;
  score += (titles.atp250 ?? 0) * 1;
  score += totalTitles * 0.4;
  if ((peakRank ?? 999) <= 1) score += 14;
  else if ((peakRank ?? 999) <= 3) score += 10;
  else if ((peakRank ?? 999) <= 10) score += 6;
  if (topRival?.totalMatches >= 8) score += 2;
  if (retired) score += 1;

  if (score >= 45) return { key: 'pantheon', label: 'Lugar de pantheon', shortTag: 'pantheon', tone: 'gold', summary: 'A carreira ja pode ser lida como uma das referencias historicas mais pesadas do universo salvo.' };
  if (score >= 28) return { key: 'historic', label: 'Peso historico', shortTag: 'historico', tone: 'gold', summary: 'O legado ja ultrapassa a faixa do grande campeao comum e entra em memoria historica de circuito.' };
  if (score >= 16) return { key: 'major', label: 'Legado robusto', shortTag: 'legado forte', tone: 'accent', summary: 'Existe substancia suficiente para tratar a carreira como obra grande e nao apenas boa fase.' };
  if (score >= 8) return { key: 'solid', label: 'Legado respeitavel', shortTag: 'respeito', tone: 'neutral', summary: 'O nome deixou marcas claras no circuito, ainda que sem peso de mito absoluto.' };
  return { key: 'forming', label: 'Legado em formacao', shortTag: 'em formacao', tone: 'neutral', summary: 'O texto historico ainda esta sendo escrito, com mais possibilidades abertas do que conclusoes definitivas.' };
}

function buildHeadline(ctx, tone, careerPhase, legacy) {
  const { player, titles, peakRank, recentForm, currentRank, retired } = ctx;
  if (retired && legacy?.key === 'pantheon') return `${player.name} encerrou a carreira como um dos nomes maiores da historia do circuito.`;
  if (retired) return `${player.name} fechou a carreira deixando um legado claro no tecido do circuito.`;
  if ((titles.gs ?? 0) >= 3) return `${player.name} ja se move em territorio historico do circuito.`;
  if ((titles.gs ?? 0) >= 1) return `${player.name} virou nome de peso nos grandes palcos do circuito.`;
  if ((titles.slamClash ?? 0) >= 2) return `${player.name} transformou os Clash Slams em assinatura propria.`;
  if (careerPhase?.key === 'rebuilding') return `${player.name} vive uma carreira que agora pede leitura de reconstrucao e resposta.`;
  if (careerPhase?.key === 'peak') return `${player.name} atravessa o trecho mais poderoso da propria biografia competitiva.`;
  if (peakRank && peakRank <= 5) return `${player.name} pertenceu ao topo do jogo e ainda carrega esse peso.`;
  if (recentForm === 'alta' && currentRank && currentRank <= 20) return `${player.name} vive uma das fases mais fortes da carreira.`;
  return `${player.name} construiu uma trajetoria singular dentro do circuito profissional.`;
}

function buildSummary(ctx, tone, careerPhase, legacy) {
  const { player, totalTitles, peakRank, bestSurface, topRival, recentForm, retired } = ctx;
  const parts = [];
  if (peakRank) parts.push(`melhor ranking #${peakRank}`);
  if (totalTitles > 0) parts.push(`${totalTitles} titulo${totalTitles > 1 ? 's' : ''} de circuito`);
  if (bestSurface?.label) parts.push(`melhor leitura em ${bestSurface.label.toLowerCase()}`);
  if (topRival?.opponentName) parts.push(`rivalidade central contra ${topRival.opponentName}`);
  if (recentForm === 'alta' && !retired) parts.push('momento recente em alta');
  if (recentForm === 'baixa' && !retired) parts.push('fase recente de reconstrucao');
  const spine = parts.length
    ? `A carreira de ${player.name} hoje pode ser lida por ${parts.join(', ')}.`
    : `${player.name} ainda esta escrevendo os primeiros grandes capitulos da propria carreira.`;
  return `${spine} ${careerPhase?.summary ?? ''} ${tone?.blurb ?? ''} ${legacy?.summary ?? ''}`.trim();
}

function buildParagraphs(ctx, tone, careerPhase) {
  const {
    player,
    debutYear,
    totalTitles,
    titles,
    firstTitle,
    firstBigTitle,
    latestTitle,
    peakRank,
    currentRank,
    bestSurface,
    topRival,
    recentForm,
    latestInjury,
    retired,
    careerMemory,
  } = ctx;

  const out = [];
  out.push(
    debutYear
      ? `${player.name} entrou no circuito principal em ${debutYear} e, desde entao, foi empilhando capitulos de desenvolvimento tecnico, leitura de superficie e adaptacao competitiva.`
      : `${player.name} ainda esta construindo a primeira metade da propria historia profissional.`
  );

  if (firstTitle) {
    out.push(`O primeiro trofeu veio em ${firstTitle.year ?? 'um momento inicial da carreira'}, no ${firstTitle.name}, o primeiro sinal concreto de que havia teto real para subir no circuito.`);
  } else if (totalTitles === 0) {
    out.push(`Ainda sem trofeus no nivel principal, a trajetoria segue marcada mais por indicios de teto do que por conversoes em prata.`);
  }

  if (firstBigTitle) {
    out.push(`A virada de patamar apareceu quando ${player.name} levou ${firstBigTitle.name}, evento que empurrou a carreira para uma zona mais pesada de prestigio e expectativa.`);
  } else if ((titles.masters ?? 0) > 0 || (titles.slamClash ?? 0) > 0) {
    out.push(`Mesmo sem um Slam tradicional, a carreira ja ganhou espessura por campanhas que mudaram a forma como o circuito olha para esse nome.`);
  }

  if (peakRank) {
    out.push(`O melhor ranking da carreira foi #${peakRank}${currentRank && !retired ? `, enquanto a posicao atual em #${currentRank} ajuda a medir a distancia entre pico e momento presente.` : '.'}`);
  }

  if (bestSurface?.label) {
    out.push(`A assinatura tecnica mais clara apareceu em ${bestSurface.label.toLowerCase()}, superficie na qual seu jogo encontrou combinacao mais natural entre estilo, conforto e resultado.`);
  }

  if (topRival?.opponentName) {
    out.push(`Entre os duelos que ajudam a definir sua narrativa, nenhum pesa tanto quanto a rivalidade contra ${topRival.opponentName}, confronto que virou espelho competitivo da carreira.`);
  }

  const favMemoryLine = memoryTournamentLine(careerMemory?.favoriteTournament, 'favorite');
  if (favMemoryLine) {
    out.push(favMemoryLine);
  }

  const hauntingLine = memoryTournamentLine(careerMemory?.hauntingTournament ?? careerMemory?.painfulTournament, 'haunting');
  if (hauntingLine) {
    out.push(hauntingLine);
  }

  const opponentLine = opponentMemoryLine(careerMemory?.keyOpponent);
  if (opponentLine) {
    out.push(opponentLine);
  }

  if (latestTitle && !retired) {
    out.push(`O trofeu mais recente, no ${latestTitle.name}, funciona hoje como retrato direto do momento atual dentro do circuito.`);
  } else if (recentForm === 'alta' && !retired) {
    out.push(`Mesmo sem trofeu recente, a curva competitiva voltou a apontar para cima e recolocou o nome em discussao.`);
  }

  if (latestInjury) {
    out.push(`A carreira tambem precisou absorver ${latestInjury.type.toLowerCase()}, episodio que entrou de vez na leitura de resistencia, pausa e retorno do atleta.`);
  }

  if (retired) {
    out.push(`Com a carreira encerrada, o foco sai do proximo resultado e passa a ser a obra completa: o que foi conquistado, como foi conquistado e qual marca permaneceu.`);
  } else if (careerPhase?.key === 'rebuilding') {
    out.push(`Hoje a biografia entra num trecho de reconstrucao: menos sobre acumular brilho imediato e mais sobre recuperar lastro competitivo.`);
  } else if (careerPhase?.key === 'peak') {
    out.push(`O capitulo atual e de auge competitivo, com nivel, repertorio e confianca alinhados numa fase que pode definir legado.`);
  } else if (tone?.key === 'autor') {
    out.push(`Mais do que resultados crus, a memoria dessa carreira tambem passa pela linguagem de jogo: um tenis com tracos proprios e assinatura reconhecivel.`);
  }

  return out;
}

function buildChapters(ctx, tone, careerPhase) {
  const { player, debutYear, latestSeason, firstTitle, firstBigTitle, latestBigTitle, peakRank, currentRank, bestSurface, topRival, latestInjury, totalTitles, primeWindow, titles, retired, careerMemory } = ctx;
  const chapters = [
    {
      key: 'origin',
      kicker: debutYear ? `${debutYear}${latestSeason ? `-${Math.max(debutYear, debutYear + 1)}` : ''}` : 'inicio',
      title: 'Origem no circuito',
      tone: 'accent',
      text: debutYear
        ? `${player.name} entrou no circuito principal em ${debutYear} e passou os primeiros anos desenhando identidade competitiva, aprendendo onde o jogo rendia mais e onde ainda faltava densidade.`
        : `${player.name} ainda vive os capitulos inaugurais da carreira, em fase de consolidar presenca, ranking e repertorio de elite.`,
    },
    {
      key: 'turn',
      kicker: firstBigTitle?.year ?? firstTitle?.year ?? 'patamar',
      title: firstBigTitle ? 'Virada de patamar' : 'Primeira validacao',
      tone: firstBigTitle ? 'gold' : 'accent',
      text: firstBigTitle
        ? `${firstBigTitle.name} foi o torneio que empurrou a carreira para outro nivel. A partir dali, o nome de ${player.name} deixou de ser apenas promissor e passou a carregar gravidade real.`
        : firstTitle
          ? `${firstTitle.name} representou a primeira prova forte de que a carreira podia ser convertida em trofeus e nao apenas em sinais dispersos de talento.`
          : `Sem um grande trofeu para marcar ruptura, a ascensao foi mais gradual, feita de acumulacao de semanas fortes, presenca constante e ganho de respeito no circuito.`,
    },
    {
      key: 'identity',
      kicker: tone?.label ?? 'identidade',
      title: 'Assinatura competitiva',
      tone: tone?.color ?? 'neutral',
      text: [
        bestSurface?.label ? `Seu jogo encontrou a leitura mais natural em ${bestSurface.label.toLowerCase()}` : null,
        topRival?.opponentName ? ` e ganhou contorno extra na rivalidade contra ${topRival.opponentName}` : null,
        totalTitles > 0 ? `, trecho em que acumulou ${totalTitles} titulo${totalTitles > 1 ? 's' : ''}` : '',
        (titles.slamClash ?? 0) > 0 ? ` e ainda deixou marca nos Clash Slams.` : '.',
      ].filter(Boolean).join(''),
    },
    {
      key: 'present',
      kicker: retired ? 'legado' : (careerPhase?.label ?? 'momento'),
      title: retired ? 'Encerramento e memoria' : 'Momento atual',
      tone: careerPhase?.tone ?? 'neutral',
      text: (() => {
        const parts = [];
        if (currentRank && !retired) parts.push(`Hoje aparece em #${currentRank}`);
        if (peakRank) parts.push(`com pico de #${peakRank}`);
        if (primeWindow?.start) {
          const end = primeWindow.end && primeWindow.end !== primeWindow.start ? `-${primeWindow.end}` : '';
          parts.push(`e seu melhor recorte competitivo se espalhou por ${primeWindow.start}${end}`);
        }
        if (latestBigTitle?.name) parts.push(`${retired ? 'O ultimo grande trofeu veio com' : 'O ultimo capitulo grande veio com'} ${latestBigTitle.name}`);
        if (latestInjury?.type && careerPhase?.key === 'rebuilding') parts.push(`, ainda sob a sombra de ${latestInjury.type.toLowerCase()}`);
        return `${parts.join('. ')}. ${careerPhase?.summary ?? ''}`.replace(/\.\./g, '.');
      })(),
    },
  ];

  const favoriteLine = memoryTournamentLine(careerMemory?.favoriteTournament, 'favorite');
  const hauntingLine = memoryTournamentLine(careerMemory?.hauntingTournament ?? careerMemory?.painfulTournament, 'haunting');
  const opponentLine = opponentMemoryLine(careerMemory?.avoidedOpponent ?? careerMemory?.keyOpponent, careerMemory?.avoidedOpponent ? 'avoid' : 'key');
  if (favoriteLine || hauntingLine || opponentLine) {
    chapters.splice(3, 0, {
      key: 'memory_bank',
      kicker: `${careerMemory?.memoryCount ?? 0} memorias`,
      title: 'Memoria competitiva',
      tone: hauntingLine ? 'warn' : 'accent',
      text: [favoriteLine, hauntingLine, opponentLine].filter(Boolean).join(' '),
    });
  }

  return chapters;
}

function buildLongBiography(ctx, tone, careerPhase, legacy) {
  const { player, debutYear, latestSeason, firstTitle, firstBigTitle, latestTitle, latestBigTitle, bestSurface, topRival, primeWindow, totalTitles, titles, peakRank, currentRank, latestInjury, retired, careerMemory } = ctx;
  const primeText = primeWindow?.start
    ? `Seu melhor recorte competitivo se concentrou entre ${primeWindow.start}${primeWindow.end && primeWindow.end !== primeWindow.start ? ` e ${primeWindow.end}` : ''}.`
    : null;
  const titleText = totalTitles > 0
    ? `${player.name} reuniu ${totalTitles} titulos no circuito, incluindo ${titles.gs ?? 0} Grand Slams, ${titles.slamClash ?? 0} Clash Slams e ${titles.masters ?? 0} Masters 1000.`
    : `${player.name} ainda nao converteu a carreira em uma colecao extensa de trofeus, mas o roteiro competitivo segue em aberto.`;

  const blocks = [];

  blocks.push(
    debutYear
      ? `${player.name} iniciou a propria caminhada profissional em ${debutYear}, entrando no circuito como um projeto competitivo em formacao. Nos primeiros anos, a historia foi menos sobre explosao imediata e mais sobre acumular linguagem de jogo, casca de calendario e identidade tatico-mental. ${firstTitle ? `O primeiro ponto de virada concreto veio com o titulo no ${firstTitle.name}, que serviu como validacao inicial do teto competitivo.` : 'Sem um trofeu inaugural para acelerar o processo, a consolidacao precisou nascer de sinais menos espetaculares e mais graduais.'}`
      : `${player.name} ainda esta escrevendo o bloco inaugural da carreira, num momento em que promessa, ajuste e descoberta de teto convivem dentro da mesma narrativa.`
  );

  blocks.push(
    `${titleText} ${firstBigTitle ? `A grande ruptura de status apareceu em ${firstBigTitle.name}, torneio que mudou a escala de ambicao e o modo como o circuito passou a tratar esse nome.` : 'Mesmo sem um trofeu maximo como marco absoluto, a carreira ganhou espessura por acumulacao de campanhas relevantes e permanencia competitiva.'} ${bestSurface?.label ? `A superficie que melhor traduziu esse tenis foi ${bestSurface.label.toLowerCase()}, onde o jogo encontrou a combinacao mais limpa entre conforto tecnico, leitura e resultado.` : ''}`.trim()
  );

  blocks.push(
    `${topRival?.opponentName ? `Nenhum espelho competitivo pesa tanto quanto a rivalidade contra ${topRival.opponentName}, confronto que ajuda a contar a carreira em termos de tensao, ajuste e repeticao de grandes cenarios.` : 'A carreira nao se apoia em uma unica rivalidade dominante, e sim numa sucessao de desafios que ajudaram a dar forma ao jogador.'} ${peakRank ? `O melhor ranking ja alcancado foi #${peakRank}${currentRank && !retired ? `, enquanto o numero atual em #${currentRank} mede a temperatura do presente.` : '.'}` : ''} ${primeText ?? ''}`.trim()
  );

  if (latestInjury || retired || latestBigTitle || latestTitle) {
    blocks.push(
      `${latestInjury ? `O corpo tambem entrou na narrativa, especialmente com ${latestInjury.type.toLowerCase()}, episodio que obrigou a carreira a absorver pausa, desgaste ou reconfiguracao de rota.` : ''} ${latestBigTitle ? `Nos capitulos mais recentes, ${latestBigTitle.name} permanece como a ultima grande referencia competitiva.` : latestTitle ? `${latestTitle.name} aparece como o ultimo trofeu relevante da linha do tempo recente.` : ''} ${retired ? `Com a carreira encerrada, o texto agora se fixa menos no que faltou e mais no tamanho real da obra entregue: ${legacy.summary.toLowerCase()}` : `O momento atual pode ser lido como ${careerPhase.label.toLowerCase()}, fase em que o legado segue em construcao ativa.`}`.trim()
    );
  }

  const memoryLines = [
    memoryTournamentLine(careerMemory?.favoriteTournament, 'favorite'),
    memoryTournamentLine(careerMemory?.hauntingTournament ?? careerMemory?.painfulTournament, 'haunting'),
    opponentMemoryLine(careerMemory?.respectedOpponent, 'respect'),
    opponentMemoryLine(careerMemory?.avoidedOpponent, 'avoid'),
  ].filter(Boolean);
  if (memoryLines.length) {
    blocks.push(`A memoria interna da carreira ja tem contornos proprios. ${memoryLines.join(' ')} Essas marcas sao importantes porque transformam resultados em linguagem pessoal: lugares que acolhem, derrotas que ainda cobram resposta e adversarios que exigem uma versao especifica do jogador.`);
  }

  return blocks.filter(Boolean);
}

function buildMilestones(ctx) {
  const { totalTitles, titles, debutYear, peakRank, currentRank, firstTitle, firstBigTitle, latestTitle, bestSurface, topRival, latestInjury, retired, careerMemory } = ctx;
  const out = [];
  if (debutYear) out.push({ label: 'Estreia no circuito', value: String(debutYear), tone: 'accent' });
  if (peakRank) out.push({ label: 'Melhor ranking', value: `#${peakRank}`, tone: 'gold' });
  if (currentRank && !retired) out.push({ label: 'Ranking atual', value: `#${currentRank}`, tone: 'accent' });
  out.push({ label: 'Titulos de carreira', value: String(totalTitles), tone: totalTitles >= 10 ? 'gold' : 'neutral' });
  if ((titles.gs ?? 0) > 0) out.push({ label: 'Grand Slams', value: String(titles.gs), tone: 'gold' });
  if ((titles.slamClash ?? 0) > 0) out.push({ label: 'Clash Slams', value: String(titles.slamClash), tone: 'purple' });
  if ((titles.masters ?? 0) > 0) out.push({ label: 'Masters 1000', value: String(titles.masters), tone: 'orange' });
  if (bestSurface?.label) out.push({ label: 'Melhor superficie', value: bestSurface.label, tone: 'surface' });
  if (firstTitle) out.push({ label: 'Primeiro titulo', value: firstTitle.name, tone: 'accent' });
  if (firstBigTitle) out.push({ label: 'Primeiro grande titulo', value: firstBigTitle.name, tone: 'gold' });
  if (latestTitle) out.push({ label: retired ? 'Ultimo titulo da carreira' : 'Ultimo trofeu', value: latestTitle.name, tone: 'accent' });
  if (topRival?.opponentName) out.push({ label: 'Rival central', value: topRival.opponentName, tone: 'rival' });
  if (careerMemory?.favoriteTournament?.tournament?.name) out.push({ label: 'Memoria favorita', value: careerMemory.favoriteTournament.tournament.name, tone: 'gold' });
  if (careerMemory?.hauntingTournament?.tournament?.name) out.push({ label: 'Fantasma competitivo', value: careerMemory.hauntingTournament.tournament.name, tone: 'warn' });
  if (careerMemory?.avoidedOpponent?.opponentName) out.push({ label: 'Adversario incomodo', value: careerMemory.avoidedOpponent.opponentName, tone: 'rival' });
  if (latestInjury?.type) out.push({ label: 'Ultima lesao relevante', value: latestInjury.type, tone: 'warn' });
  if (retired) out.push({ label: 'Status', value: 'Aposentado', tone: 'neutral' });
  return out.slice(0, 11);
}
