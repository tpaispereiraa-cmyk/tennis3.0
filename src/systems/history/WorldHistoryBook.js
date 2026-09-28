// ════════════════════════════════════════════════════════════════════
// 📚 WORLD HISTORY BOOK — base persistente do Livro das Eras
//
// Patches 1-8/8: este módulo define o contrato de dados histórico, registra
// retratos anuais, produz sinais comparativos, mantém a máquina de estados,
// escreve capítulos e calibra o arquivo para simulações de muitas décadas.
// ════════════════════════════════════════════════════════════════════

export const WORLD_HISTORY_VERSION = 1;
export const MAX_HISTORY_ERAS = 96;
export const MAX_HISTORY_SNAPSHOTS = 320;
export const MAX_HISTORY_TURNING_POINTS = 640;
export const MAX_HISTORY_REVISIONS = 240;
export const MAX_HISTORY_TREND_ANALYSES = 320;
export const MAX_HISTORY_ERA_EVENTS = 640;

const ERA_STATUSES = new Set([
  'FORMING',
  'ACTIVE',
  'CONSOLIDATING',
  'DECLINING',
  'CLOSED',
]);

const ERA_KINDS = new Set([
  'DYNASTY',
  'DUOPOLY',
  'GENERATION_SHIFT',
  'INTERREGNUM',
  'STYLE_REVOLUTION',
  'NATIONAL_WAVE',
  'COMEBACK',
  'UNCLASSIFIED',
]);

const TREND_KINDS = new Set([
  'DYNASTY',
  'DUOPOLY',
  'GENERATION_SHIFT',
  'INTERREGNUM',
  'STYLE_REVOLUTION',
  'NATIONAL_WAVE',
]);

function finiteYear(value, fallback = null) {
  if (value == null || value === '') return fallback;
  const year = Number(value);
  return Number.isFinite(year) ? Math.trunc(year) : fallback;
}

function asString(value, fallback = null) {
  return typeof value === 'string' && value.trim() ? value : fallback;
}

function boundedArray(value, limit, mapper = item => item) {
  if (!Array.isArray(value)) return [];
  return value.slice(-limit).map(mapper).filter(Boolean);
}

export function createEmptyEra({ id = null, startYear = null, kind = 'UNCLASSIFIED' } = {}) {
  return {
    id: asString(id),
    signalKey: null,
    scope: 'THEMATIC',
    status: 'FORMING',
    kind: ERA_KINDS.has(kind) ? kind : 'UNCLASSIFIED',
    title: null,
    subtitle: null,
    startYear: finiteYear(startYear),
    endYear: null,
    declaredYear: null,
    confidence: 0,
    lastSeenYear: finiteYear(startYear),
    persistenceYears: 0,
    absenceYears: 0,
    signalYears: [],
    evidenceIds: [],
    chapterYears: [],
    chapters: [],
    turningPointIds: [],
    protagonistIds: [],
    protagonistNames: [],
    rivalIds: [],
    rivalNames: [],
    subArcIds: [],
    transitionLog: [],
    keyMetrics: {},
    legacy: null,
  };
}

function normalizeEra(raw, index) {
  if (!raw || typeof raw !== 'object') return null;
  const fallbackId = `era-${finiteYear(raw.startYear, 0)}-${index + 1}`;
  const era = createEmptyEra({
    id: raw.id ?? fallbackId,
    startYear: raw.startYear,
    kind: raw.kind,
  });

  return {
    ...era,
    signalKey: asString(raw.signalKey),
    scope: raw.scope === 'GLOBAL' ? 'GLOBAL' : 'THEMATIC',
    status: ERA_STATUSES.has(raw.status) ? raw.status : era.status,
    title: asString(raw.title),
    subtitle: asString(raw.subtitle),
    startYear: finiteYear(raw.startYear),
    endYear: finiteYear(raw.endYear),
    declaredYear: finiteYear(raw.declaredYear),
    confidence: Math.max(0, Math.min(1, Number(raw.confidence) || 0)),
    lastSeenYear: finiteYear(raw.lastSeenYear, finiteYear(raw.startYear)),
    persistenceYears: Math.max(0, Number(raw.persistenceYears) || 0),
    absenceYears: Math.max(0, Number(raw.absenceYears) || 0),
    signalYears: boundedArray(raw.signalYears, 32, value => finiteYear(value)).filter(Boolean),
    evidenceIds: boundedArray(raw.evidenceIds, 160, value => asString(value)).filter(Boolean),
    chapterYears: boundedArray(raw.chapterYears, 80, value => finiteYear(value)).filter(Boolean),
    chapters: boundedArray(raw.chapters, 80, value => ({
      id: asString(value?.id),
      year: finiteYear(value?.year),
      type: asString(value?.type, 'SEASON'),
      title: asString(value?.title),
      text: asString(value?.text),
      turningPointIds: boundedArray(value?.turningPointIds, 16, item => asString(item)).filter(Boolean),
      facts: value?.facts && typeof value.facts === 'object' ? { ...value.facts } : {},
    })).filter(value => value.year != null && value.text),
    turningPointIds: boundedArray(raw.turningPointIds, 160, value => asString(value)).filter(Boolean),
    protagonistIds: boundedArray(raw.protagonistIds, 32, value => asString(value)).filter(Boolean),
    protagonistNames: boundedArray(raw.protagonistNames, 32, value => asString(value)).filter(Boolean),
    rivalIds: boundedArray(raw.rivalIds, 32, value => asString(value)).filter(Boolean),
    rivalNames: boundedArray(raw.rivalNames, 32, value => asString(value)).filter(Boolean),
    subArcIds: boundedArray(raw.subArcIds, 64, value => asString(value)).filter(Boolean),
    transitionLog: boundedArray(raw.transitionLog, 32, value => ({
      year: finiteYear(value?.year),
      from: asString(value?.from),
      to: asString(value?.to),
      reason: asString(value?.reason),
    })).filter(value => value.year != null),
    keyMetrics: raw.keyMetrics && typeof raw.keyMetrics === 'object' ? { ...raw.keyMetrics } : {},
    legacy: raw.legacy && typeof raw.legacy === 'object' ? { ...raw.legacy } : null,
  };
}

function normalizeSnapshot(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const year = finiteYear(raw.year);
  if (year == null) return null;
  return {
    ...raw,
    year,
    id: asString(raw.id, `season-${year}`),
    source: asString(raw.source, 'SEASON_CLOSE'),
    chronicleId: asString(raw.chronicleId, `chronicle-${year}`),
  };
}

function normalizeTurningPoint(raw, index) {
  if (!raw || typeof raw !== 'object') return null;
  const year = finiteYear(raw.year);
  if (year == null) return null;
  return {
    ...raw,
    id: asString(raw.id, `turning-point-${year}-${index + 1}`),
    year,
    type: asString(raw.type, 'UNCLASSIFIED'),
    importance: Math.max(0, Math.min(1, Number(raw.importance) || 0)),
  };
}

function normalizeRevision(raw, index) {
  if (!raw || typeof raw !== 'object') return null;
  return {
    ...raw,
    id: asString(raw.id, `history-revision-${index + 1}`),
    year: finiteYear(raw.year),
    reason: asString(raw.reason, 'HISTORICAL_REASSESSMENT'),
  };
}

function normalizeEraEvent(raw, index) {
  if (!raw || typeof raw !== 'object') return null;
  const year = finiteYear(raw.year);
  if (year == null) return null;
  return {
    ...raw,
    id: asString(raw.id, `era-event-${year}-${index + 1}`),
    year,
    eraId: asString(raw.eraId),
    type: asString(raw.type, 'UPDATED'),
    kind: TREND_KINDS.has(raw.kind) ? raw.kind : 'UNCLASSIFIED',
    reason: asString(raw.reason),
    confidence: Math.max(0, Math.min(1, Number(raw.confidence) || 0)),
  };
}

function normalizeTrendSignal(raw, index) {
  if (!raw || typeof raw !== 'object') return null;
  const year = finiteYear(raw.lastSeenYear ?? raw.year);
  if (year == null) return null;
  const kind = TREND_KINDS.has(raw.kind) ? raw.kind : null;
  if (!kind) return null;
  return {
    ...raw,
    id: asString(raw.id, `trend-${kind.toLowerCase()}-${year}-${index + 1}`),
    kind,
    status: asString(raw.status, 'EMERGING'),
    confidence: Math.max(0, Math.min(1, Number(raw.confidence) || 0)),
    score: Math.max(0, Math.min(1, Number(raw.score) || 0)),
    startYear: finiteYear(raw.startYear, year),
    lastSeenYear: year,
    evidenceYears: boundedArray(raw.evidenceYears, 12, value => finiteYear(value)).filter(Boolean),
    subjectIds: boundedArray(raw.subjectIds, 12, value => asString(value)).filter(Boolean),
    subjectNames: boundedArray(raw.subjectNames, 12, value => asString(value)).filter(Boolean),
    reasonCodes: boundedArray(raw.reasonCodes, 12, value => asString(value)).filter(Boolean),
    metrics: raw.metrics && typeof raw.metrics === 'object' ? { ...raw.metrics } : {},
  };
}

function normalizeTrendAnalysis(raw, index) {
  if (!raw || typeof raw !== 'object') return null;
  const year = finiteYear(raw.year);
  if (year == null) return null;
  return {
    ...raw,
    id: asString(raw.id, `trend-analysis-${year}-${index + 1}`),
    year,
    windowStart: finiteYear(raw.windowStart, year),
    windowEnd: finiteYear(raw.windowEnd, year),
    windowYears: boundedArray(raw.windowYears, 12, value => finiteYear(value)).filter(Boolean),
    signals: boundedArray(raw.signals, 12, normalizeTrendSignal).filter(Boolean),
  };
}

/**
 * Cria o estado inicial sem inventar uma era. O universo começa com memória
 * vazia e o historiador só poderá declarar algo quando os próximos patches
 * encontrarem evidência suficiente.
 */
export function createHistoryBook(startYear = 2025) {
  const year = finiteYear(startYear, 2025);
  return {
    _version: WORLD_HISTORY_VERSION,
    createdYear: year,
    lastProcessedYear: null,
    activeEraId: null,
    eras: [],
    annualSnapshots: [],
    turningPoints: [],
    revisions: [],
    eraEvents: [],
    trendAnalyses: [],
    activeSignals: [],
    metadata: {
      schema: 'WORLD_HISTORY_BOOK',
      createdBy: 'PATCH_1',
      lastUpdatedAt: null,
    },
  };
}

/**
 * Normaliza dados vindos de um save. É deliberadamente tolerante: saves
 * antigos não têm historyBook e saves futuros podem conter campos extras que
 * devem sobreviver à migração.
 */
export function normalizeHistoryBook(raw, fallbackYear = 2025) {
  const source = raw && typeof raw === 'object' ? raw : {};
  const base = createHistoryBook(source.createdYear ?? fallbackYear);
  const eras = boundedArray(source.eras, MAX_HISTORY_ERAS, normalizeEra).filter(Boolean);
  const snapshots = boundedArray(source.annualSnapshots, MAX_HISTORY_SNAPSHOTS, normalizeSnapshot).filter(Boolean);
  const turningPoints = boundedArray(source.turningPoints, MAX_HISTORY_TURNING_POINTS, normalizeTurningPoint).filter(Boolean);
  const revisions = boundedArray(source.revisions, MAX_HISTORY_REVISIONS, normalizeRevision).filter(Boolean);
  const eraEvents = boundedArray(source.eraEvents, MAX_HISTORY_ERA_EVENTS, normalizeEraEvent).filter(Boolean);
  const trendAnalyses = boundedArray(source.trendAnalyses, MAX_HISTORY_TREND_ANALYSES, normalizeTrendAnalysis).filter(Boolean);
  const activeSignals = boundedArray(source.activeSignals, 16, normalizeTrendSignal).filter(Boolean);

  return {
    ...base,
    ...source,
    _version: WORLD_HISTORY_VERSION,
    createdYear: finiteYear(source.createdYear, base.createdYear),
    lastProcessedYear: finiteYear(source.lastProcessedYear),
    activeEraId: asString(source.activeEraId),
    eras,
    annualSnapshots: snapshots.sort((a, b) => a.year - b.year),
    turningPoints: turningPoints.sort((a, b) => a.year - b.year),
    revisions,
    eraEvents: eraEvents.sort((a, b) => a.year - b.year),
    trendAnalyses: trendAnalyses.sort((a, b) => a.year - b.year),
    activeSignals,
    metadata: {
      ...base.metadata,
      ...(source.metadata && typeof source.metadata === 'object' ? source.metadata : {}),
      schema: 'WORLD_HISTORY_BOOK',
    },
  };
}

/**
 * Migração não destrutiva para saves criados antes do Livro das Eras. As
 * crônicas já existentes entram como referências anuais; nenhuma era é
 * declarada retroativamente neste patch.
 */
export function migrateHistoryBook(raw, chronicleData, fallbackYear = 2025) {
  const source = raw && typeof raw === 'object' ? raw : null;
  if (source) return normalizeHistoryBook(source, fallbackYear);

  const chronicles = Array.isArray(chronicleData?.chronicles) ? chronicleData.chronicles : [];
  const migrated = createHistoryBook(fallbackYear);
  migrated.annualSnapshots = chronicles
    .map(entry => normalizeSnapshot({
      year: entry?.year,
      id: `season-${entry?.year}`,
      chronicleId: `chronicle-${entry?.year}`,
      source: 'CHRONICLE_MIGRATION',
      tone: entry?.tone ?? null,
      tags: Array.isArray(entry?.tags) ? entry.tags.slice(0, 24) : [],
    }))
    .filter(Boolean)
    .sort((a, b) => a.year - b.year)
    .slice(-MAX_HISTORY_SNAPSHOTS);
  migrated.lastProcessedYear = migrated.annualSnapshots.at(-1)?.year ?? null;
  migrated.metadata.migratedFromChronicles = migrated.annualSnapshots.length > 0;
  return migrated;
}

export function serializeHistoryBook(raw, fallbackYear = 2025) {
  return normalizeHistoryBook(raw, fallbackYear);
}

function playerStyleKey(player) {
  const value = player?.styleId
    ?? player?.playStyle
    ?? player?.style?.id
    ?? player?.style?.key
    ?? player?.archetype;
  return typeof value === 'string' && value.trim() ? value : null;
}

function compactPlayer(player, rankFallback = null) {
  if (!player || typeof player !== 'object') return null;
  const rank = Number(player.rankPosition ?? rankFallback);
  return {
    id: asString(player.id),
    name: asString(player.name, 'Unknown'),
    rank: Number.isFinite(rank) ? Math.trunc(rank) : null,
    age: Number.isFinite(Number(player.age)) ? Number(player.age) : null,
    nationality: asString(player.nationality),
    style: playerStyleKey(player),
  };
}

function compactWinner(entry) {
  if (!entry || typeof entry !== 'object') return null;
  return {
    id: asString(entry.id),
    name: asString(entry.name, 'Unknown'),
    tournament: asString(entry.tournament),
    surface: asString(entry.surface),
    runnerUpId: asString(entry.runnerUpId),
    runnerUpName: asString(entry.runnerUpName),
    fiveSetFinal: entry.fiveSetFinal === true,
  };
}

function compactRivalry(rivalry) {
  if (!rivalry || typeof rivalry !== 'object') return null;
  return {
    p1Id: asString(rivalry.p1Id),
    p1Name: asString(rivalry.p1Name),
    p2Id: asString(rivalry.p2Id),
    p2Name: asString(rivalry.p2Name),
    p1Wins: Number(rivalry.p1Wins) || 0,
    p2Wins: Number(rivalry.p2Wins) || 0,
    total: Number(rivalry.total) || 0,
    type: asString(rivalry.type, 'CLASSIC'),
    status: asString(rivalry.status, 'ACTIVE'),
    dominated: rivalry.dominated === true,
  };
}

function compactRetirement(retirement) {
  if (!retirement || typeof retirement !== 'object') return null;
  return {
    name: asString(retirement.name, 'Unknown'),
    titles: Number(retirement.titles) || 0,
    years: Number(retirement.years) || 0,
    peakRanking: Number.isFinite(Number(retirement.peakRanking)) ? Number(retirement.peakRanking) : null,
    isLegend: retirement.isLegend === true,
    isSurprise: retirement.isSurprise === true,
  };
}

function compactMilestone(value) {
  if (!value || typeof value !== 'object') return null;
  return {
    name: asString(value.name),
    milestone: asString(value.milestone),
  };
}

function buildRankingPortrait(state) {
  const ranked = [...(state?.tourPlayers ?? [])]
    .sort((a, b) => (a.rankPosition ?? 9999) - (b.rankPosition ?? 9999));
  const top25 = ranked.slice(0, 25);
  const ages = top25.map(p => Number(p.age)).filter(Number.isFinite);
  const styleCounts = {};
  const nationalityCounts = {};
  top25.forEach(player => {
    const style = playerStyleKey(player);
    if (style) styleCounts[style] = (styleCounts[style] ?? 0) + 1;
    const nationality = asString(player.nationality);
    if (nationality) nationalityCounts[nationality] = (nationalityCounts[nationality] ?? 0) + 1;
  });
  return {
    leader: compactPlayer(top25[0], 1),
    top10: top25.slice(0, 10).map((p, i) => compactPlayer(p, i + 1)).filter(Boolean),
    top25Ids: top25.map(p => asString(p.id)).filter(Boolean),
    averageAge: ages.length ? +(ages.reduce((sum, age) => sum + age, 0) / ages.length).toFixed(1) : null,
    youngest: compactPlayer([...top25].sort((a, b) => (a.age ?? 99) - (b.age ?? 99))[0]),
    oldest: compactPlayer([...top25].sort((a, b) => (b.age ?? 0) - (a.age ?? 0))[0]),
    under21: top25.filter(p => Number(p.age) <= 21).length,
    under23: top25.filter(p => Number(p.age) <= 23).length,
    over30: top25.filter(p => Number(p.age) >= 30).length,
    styles: Object.entries(styleCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([style, count]) => ({ style, count })),
    nationalities: Object.entries(nationalityCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([code, count]) => ({ code, count })),
  };
}

function compactTitleRows(raw, key) {
  return boundedArray(raw?.[key], 12, compactWinner).filter(row => row?.id || row?.name);
}

/**
 * Monta o retrato factual de uma temporada. O snapshot é propositalmente
 * menor que a crônica completa: ele guarda sinais que o detector de eras
 * precisará comparar entre anos, não o banco de partidas inteiro.
 */
export function buildAnnualHistorySnapshot(state, chronicleEntry = null) {
  const year = finiteYear(state?.year, finiteYear(chronicleEntry?.year, 2025));
  const raw = chronicleEntry?.raw ?? {};
  const ranking = buildRankingPortrait(state);
  const titleRows = [
    ...compactTitleRows(raw, 'grandSlamWinners'),
    ...compactTitleRows(raw, 'slamClashWinners'),
    ...compactTitleRows(raw, 'masters1000Winners'),
    ...compactTitleRows(raw, 'atp500Winners'),
  ];
  const titleCounts = {};
  titleRows.forEach(row => {
    if (!row?.id) return;
    titleCounts[row.id] = titleCounts[row.id] ?? { id: row.id, name: row.name, titles: 0 };
    titleCounts[row.id].titles += 1;
  });
  const totalTitles = titleRows.length;
  const titleLeaders = Object.values(titleCounts)
    .sort((a, b) => b.titles - a.titles)
    .slice(0, 8)
    .map(row => ({ ...row, share: totalTitles ? +(row.titles / totalTitles).toFixed(3) : 0 }));

  return {
    id: `season-${year}`,
    year,
    source: 'SEASON_CLOSE',
    chronicleId: `chronicle-${year}`,
    tone: asString(chronicleEntry?.tone ?? raw.tone),
    headline: asString(chronicleEntry?.headline),
    tags: boundedArray(chronicleEntry?.tags, 24, value => asString(value)).filter(Boolean),
    ranking,
    titles: {
      grandSlams: compactTitleRows(raw, 'grandSlamWinners'),
      slamClashes: compactTitleRows(raw, 'slamClashWinners'),
      masters: compactTitleRows(raw, 'masters1000Winners'),
      atp500: compactTitleRows(raw, 'atp500Winners'),
      finalsChampion: asString(raw.finalsChampName),
      finalsRunnerUp: asString(raw.finalsRunnerUpName),
      leaders: titleLeaders,
      total: totalTitles,
      championCount: Number(raw.numChampions) || new Set(titleRows.map(row => row.id).filter(Boolean)).size,
    },
    surfaces: {
      breakdown: { ...(raw.surfaceBreakdown ?? {}) },
      dominant: raw.surfaceDominator
        ? { name: asString(raw.surfaceDominator.name), surface: asString(raw.surfaceDominator.surface), count: Number(raw.surfaceDominator.count) || 0 }
        : null,
    },
    rivalries: raw.topRivalry ? [compactRivalry(raw.topRivalry)].filter(Boolean) : [],
    events: {
      calendarSlam: raw.calendarSlam === true,
      grandSlamSweep: raw.grandSlamSweep === true,
      grandSlamDominator: raw.grandSlamDominatorName
        ? { name: raw.grandSlamDominatorName, count: Number(raw.grandSlamDominatorCount) || 0 }
        : null,
      biggestUpset: raw.biggestUpset ? { ...raw.biggestUpset } : null,
      majorInjury: raw.majorInjury ? { ...raw.majorInjury } : null,
      retirements: boundedArray(raw.retirements, 16, compactRetirement).filter(Boolean),
      promotions: boundedArray(raw.promotedThisYear, 16, player => compactPlayer(player)).filter(Boolean),
      debutSensation: raw.debutSensation ? { ...raw.debutSensation } : null,
      styleMigrations: boundedArray(raw.styleMigrations, 16, value => ({
        name: asString(value?.name),
        fromStyleId: asString(value?.fromStyleId),
        toStyleId: asString(value?.toStyleId),
        age: Number.isFinite(Number(value?.age)) ? Number(value.age) : null,
      })).filter(value => value.name || value.fromStyleId || value.toStyleId),
      milestones: boundedArray(raw.titleMilestones, 16, compactMilestone).filter(Boolean),
    },
    metrics: {
      totalMatches: Number(raw.totalMatches) || 0,
      totalTournaments: Number(raw.totalTournaments) || 0,
      championCount: Number(raw.numChampions) || titleLeaders.length,
      averageTop25Age: ranking.averageAge,
      under23Top25: ranking.under23,
      over30Top25: ranking.over30,
      topChampionShare: titleLeaders[0]?.share ?? 0,
    },
  };
}

/**
 * Insere um ano de forma idempotente. ADVANCE_YEAR pode ser disparado por
 * fluxos diferentes (manual, simulação rápida ou headless); o mesmo ano
 * nunca deve aparecer duas vezes no Livro das Eras.
 */
export function recordAnnualHistorySnapshot(book, snapshot) {
  const year = finiteYear(snapshot?.year);
  if (year == null) return normalizeHistoryBook(book);
  const current = normalizeHistoryBook(book, year);
  const existing = current.annualSnapshots.filter(item => item.year !== year);
  return normalizeHistoryBook({
    ...current,
    annualSnapshots: [...existing, snapshot],
    lastProcessedYear: Math.max(current.lastProcessedYear ?? year, year),
    metadata: {
      ...current.metadata,
      // Data do universo, não do relógio do computador: simulações iguais
      // devem produzir o mesmo livro histórico.
      lastUpdatedAt: `${year}-12-31`,
      lastUpdateSource: 'SEASON_CLOSE',
    },
  }, year);
}

const clamp01 = value => Math.max(0, Math.min(1, Number(value) || 0));

function snapshotMajorRows(snapshot) {
  return Array.isArray(snapshot?.titles?.grandSlams) ? snapshot.titles.grandSlams : [];
}

function aggregateMajorChampions(window) {
  const players = {};
  let total = 0;
  window.forEach(snapshot => {
    const seenThisYear = new Set();
    snapshotMajorRows(snapshot).forEach(row => {
      const id = asString(row?.id);
      if (!id) return;
      total += 1;
      players[id] = players[id] ?? { id, name: asString(row.name, id), titles: 0, years: 0 };
      players[id].titles += 1;
      seenThisYear.add(id);
    });
    seenThisYear.forEach(id => { players[id].years += 1; });
  });
  return {
    total,
    players: Object.values(players).sort((a, b) => b.titles - a.titles),
  };
}

function leadingDimension(snapshot, field) {
  const rows = Array.isArray(snapshot?.ranking?.[field]) ? snapshot.ranking[field] : [];
  return rows[0] ?? null;
}

function average(values) {
  const valid = values.map(Number).filter(Number.isFinite);
  return valid.length ? valid.reduce((sum, value) => sum + value, 0) / valid.length : null;
}

function trendSignal({ kind, year, window, subjectIds = [], subjectNames = [], score, confidence, metrics, reasonCodes }) {
  const evidenceYears = window.map(snapshot => snapshot.year).filter(Number.isFinite);
  const firstYear = evidenceYears[0] ?? year;
  const prior = window.length >= 2 ? window[window.length - 2] : null;
  const status = prior && evidenceYears.length >= 3 ? 'PERSISTING' : 'EMERGING';
  return {
    id: `trend-${kind.toLowerCase()}-${year}-${subjectIds.join('-') || 'circuit'}`,
    kind,
    status,
    startYear: firstYear,
    lastSeenYear: year,
    confidence: clamp01(confidence),
    score: clamp01(score),
    evidenceYears,
    subjectIds: subjectIds.slice(0, 12),
    subjectNames: subjectNames.slice(0, 12),
    reasonCodes: reasonCodes.slice(0, 12),
    metrics: { ...metrics },
  };
}

function detectDynasty(window, year) {
  const aggregate = aggregateMajorChampions(window);
  const leader = aggregate.players[0];
  if (!leader || aggregate.total < 6 || leader.titles < 4 || leader.years < 2) return null;
  const share = leader.titles / aggregate.total;
  if (share < 0.40) return null;
  const persistence = leader.years / window.length;
  return trendSignal({
    kind: 'DYNASTY', year, window,
    subjectIds: [leader.id], subjectNames: [leader.name],
    score: share,
    confidence: share * 0.65 + persistence * 0.35,
    metrics: { majorTitles: leader.titles, majorShare: +share.toFixed(3), seasonsPresent: leader.years },
    reasonCodes: ['MAJOR_TITLE_CONCENTRATION', 'REPEATED_SEASONS'],
  });
}

function detectDuopoly(window, year) {
  const aggregate = aggregateMajorChampions(window);
  const [first, second] = aggregate.players;
  if (!first || !second || aggregate.total < 6 || first.titles < 2 || second.titles < 2) return null;
  const pair = first.titles + second.titles;
  const share = pair / aggregate.total;
  if (share < 0.65 || first.years < 2 || second.years < 2) return null;
  return trendSignal({
    kind: 'DUOPOLY', year, window,
    subjectIds: [first.id, second.id], subjectNames: [first.name, second.name],
    score: share,
    confidence: share * 0.75 + ((first.years + second.years) / (window.length * 2)) * 0.25,
    metrics: { majorTitles: pair, majorShare: +share.toFixed(3), firstTitles: first.titles, secondTitles: second.titles },
    reasonCodes: ['TWO_PLAYER_MAJOR_CONCENTRATION', 'REPEATED_RIVAL_PRESENCE'],
  });
}

function detectInterregnum(window, year) {
  const aggregate = aggregateMajorChampions(window);
  const leader = aggregate.players[0];
  const uniqueChampions = aggregate.players.length;
  if (!leader || aggregate.total < 6 || uniqueChampions < 5) return null;
  const topShare = leader.titles / aggregate.total;
  if (topShare > 0.38) return null;
  const diversity = uniqueChampions / aggregate.total;
  return trendSignal({
    kind: 'INTERREGNUM', year, window,
    subjectIds: aggregate.players.slice(0, 4).map(player => player.id),
    subjectNames: aggregate.players.slice(0, 4).map(player => player.name),
    score: diversity,
    confidence: clamp01(diversity * 0.65 + (1 - topShare) * 0.35),
    metrics: { uniqueMajorChampions: uniqueChampions, majorTitles: aggregate.total, topShare: +topShare.toFixed(3) },
    reasonCodes: ['MANY_MAJOR_CHAMPIONS', 'NO_CLEAR_MAJOR_DOMINATOR'],
  });
}

function detectGenerationShift(window, year) {
  const first = window[0];
  const latest = window[window.length - 1];
  if (!first?.ranking || !latest?.ranking) return null;
  const youngDelta = (Number(latest.ranking.under23 ?? 0) - Number(first.ranking.under23 ?? 0)) / 25;
  const ageDelta = Number(first.ranking.averageAge) - Number(latest.ranking.averageAge);
  const oldDelta = Number(first.ranking.over30 ?? 0) - Number(latest.ranking.over30 ?? 0);
  const firstIds = new Set(first.ranking.top25Ids ?? []);
  const newTop25 = (latest.ranking.top25Ids ?? []).filter(id => id && !firstIds.has(id)).length;
  const evidence = (youngDelta >= 0.12 ? 1 : 0) + (ageDelta >= 1 ? 1 : 0) + (oldDelta >= 3 ? 1 : 0) + (newTop25 >= 4 ? 1 : 0);
  if (evidence < 2 || (youngDelta < 0.08 && ageDelta < 0.7 && newTop25 < 4)) return null;
  const youngPlayers = (latest.ranking.top10 ?? []).filter(player => Number(player.age) <= 23);
  return trendSignal({
    kind: 'GENERATION_SHIFT', year, window,
    subjectIds: youngPlayers.map(player => player.id).filter(Boolean),
    subjectNames: youngPlayers.map(player => player.name).filter(Boolean),
    score: clamp01(Math.max(youngDelta / 0.25, ageDelta / 2, newTop25 / 10)),
    confidence: clamp01(evidence / 4),
    metrics: { youngDelta: +youngDelta.toFixed(3), ageDelta: +ageDelta.toFixed(2), over30Delta: oldDelta, newTop25 },
    reasonCodes: [
      youngDelta >= 0.12 && 'YOUTH_SHARE_RISING',
      ageDelta >= 1 && 'TOP25_AGE_FALLING',
      oldDelta >= 3 && 'VETERAN_SHARE_FALLING',
      newTop25 >= 4 && 'NEW_TOP25_MEMBERS',
    ].filter(Boolean),
  });
}

function detectStyleRevolution(window, year) {
  const first = leadingDimension(window[0], 'styles');
  const latest = leadingDimension(window[window.length - 1], 'styles');
  if (!first?.style || !latest?.style || !latest.count || latest.count < 6) return null;
  const baseline = first.style === latest.style ? first.count : 0;
  const delta = (latest.count - baseline) / 25;
  if (delta < 0.16) return null;
  return trendSignal({
    kind: 'STYLE_REVOLUTION', year, window,
    subjectIds: [latest.style], subjectNames: [latest.style],
    score: clamp01(latest.count / 25),
    confidence: clamp01(delta / 0.35),
    metrics: { style: latest.style, top25Count: latest.count, shareDelta: +delta.toFixed(3), baselineCount: baseline },
    reasonCodes: ['STYLE_SHARE_RISING', first.style !== latest.style ? 'STYLE_LEADERSHIP_CHANGED' : 'STYLE_CONSOLIDATION'],
  });
}

function detectNationalWave(window, year) {
  const first = leadingDimension(window[0], 'nationalities');
  const latest = leadingDimension(window[window.length - 1], 'nationalities');
  if (!latest?.code || !latest.count || latest.count < 8) return null;
  const baseline = first?.code === latest.code ? first.count : 0;
  const delta = (latest.count - baseline) / 25;
  if (delta < 0.16) return null;
  return trendSignal({
    kind: 'NATIONAL_WAVE', year, window,
    subjectIds: [latest.code], subjectNames: [latest.code],
    score: clamp01(latest.count / 25),
    confidence: clamp01(delta / 0.35),
    metrics: { nationality: latest.code, top25Count: latest.count, shareDelta: +delta.toFixed(3), baselineCount: baseline },
    reasonCodes: ['NATIONAL_TOP25_SHARE_RISING', first?.code !== latest.code ? 'NATIONAL_LEADERSHIP_CHANGED' : 'NATIONAL_CONSOLIDATION'],
  });
}

/**
 * Compara as últimas temporadas e devolve sinais, não eras. Um sinal é uma
 * hipótese factual que o Patch 4 poderá confirmar, prolongar ou encerrar.
 */
export function analyzeHistoryTrends(book, currentYear = null) {
  const normalized = normalizeHistoryBook(book, currentYear ?? 2025);
  const snapshots = [...normalized.annualSnapshots]
    .filter(snapshot => currentYear == null || snapshot.year <= currentYear)
    .sort((a, b) => a.year - b.year);
  const latest = snapshots.at(-1);
  if (!latest) {
    return { id: null, year: null, windowStart: null, windowEnd: null, windowYears: [], signals: [] };
  }
  const window = snapshots.slice(-3);
  const year = latest.year;
  const signals = window.length >= 3
    ? [
        detectDynasty(window, year),
        detectDuopoly(window, year),
        detectInterregnum(window, year),
        detectGenerationShift(window, year),
        detectStyleRevolution(window, year),
        detectNationalWave(window, year),
      ].filter(Boolean)
    : [];
  return {
    id: `trend-analysis-${year}`,
    year,
    windowStart: window[0]?.year ?? year,
    windowEnd: year,
    windowYears: window.map(snapshot => snapshot.year),
    signals,
    metrics: {
      snapshotsAvailable: snapshots.length,
      majorChampions: aggregateMajorChampions(window).players.length,
      top25AverageAge: average(window.map(snapshot => snapshot.ranking?.averageAge)),
    },
  };
}

export function recordHistoryTrendAnalysis(book, analysis) {
  const year = finiteYear(analysis?.year);
  if (year == null) return normalizeHistoryBook(book);
  const current = normalizeHistoryBook(book, year);
  const analyses = current.trendAnalyses.filter(item => item.year !== year);
  return normalizeHistoryBook({
    ...current,
    trendAnalyses: [...analyses, analysis],
    activeSignals: analysis.signals ?? [],
    metadata: {
      ...current.metadata,
      lastTrendYear: year,
    },
  }, year);
}

const GLOBAL_ERA_KINDS = new Set(['DYNASTY', 'DUOPOLY', 'GENERATION_SHIFT', 'INTERREGNUM']);

function signalStableKey(signal) {
  if (!signal?.kind) return null;
  const ids = Array.isArray(signal.subjectIds) ? signal.subjectIds.filter(Boolean) : [];
  const scopedIds = signal.kind === 'GENERATION_SHIFT' || signal.kind === 'INTERREGNUM'
    ? []
    : [...ids].sort();
  return `${signal.kind}:${scopedIds.join('|') || 'CIRCUIT'}`;
}

function eraIdForSignal(signal, year) {
  const key = signalStableKey(signal) ?? `UNCLASSIFIED:CIRCUIT`;
  const slug = key.toLowerCase().replace(/[^a-z0-9|]+/g, '-').replace(/\|/g, '-');
  return `era-${slug}-${signal.startYear ?? year}`;
}

function eraScopeForSignal(signal) {
  return GLOBAL_ERA_KINDS.has(signal?.kind) ? 'GLOBAL' : 'THEMATIC';
}

function pushEraEvent(events, era, type, year, reason) {
  events.push({
    id: `era-event-${era.id}-${type}-${year}`,
    year,
    eraId: era.id,
    kind: era.kind,
    type,
    reason,
    confidence: era.confidence,
  });
}

function transitionEra(era, nextStatus, year, reason, events) {
  if (era.status === nextStatus) return era;
  const previous = era.status;
  const transitionLog = [
    ...(era.transitionLog ?? []),
    { year, from: previous, to: nextStatus, reason },
  ].slice(-32);
  const updated = { ...era, status: nextStatus, transitionLog };
  const typeByStatus = {
    ACTIVE: 'DECLARED',
    CONSOLIDATING: 'CONSOLIDATED',
    DECLINING: 'DECLINING',
    CLOSED: 'CLOSED',
  };
  const type = typeByStatus[nextStatus];
  if (type) pushEraEvent(events, updated, type, year, reason);
  return updated;
}

function statusForObservedEra(era, signal) {
  const persistence = era.persistenceYears ?? 0;
  if (persistence >= 3 && signal.confidence >= 0.62) return 'CONSOLIDATING';
  if (persistence >= 2 && signal.confidence >= 0.50) return 'ACTIVE';
  return 'FORMING';
}

function choosePrimaryEra(eras) {
  return eras
    .filter(era => era.status !== 'CLOSED')
    .sort((a, b) => {
      const aGlobal = a.scope === 'GLOBAL' ? 1 : 0;
      const bGlobal = b.scope === 'GLOBAL' ? 1 : 0;
      return bGlobal - aGlobal
        || (b.confidence ?? 0) - (a.confidence ?? 0)
        || (b.persistenceYears ?? 0) - (a.persistenceYears ?? 0)
        || (a.startYear ?? 9999) - (b.startYear ?? 9999);
    })[0]?.id ?? null;
}

/**
 * Executa a máquina de estados do Patch 4. Sinais são observações anuais;
 * eras têm memória própria, toleram um ano ruim e só fecham após duas
 * temporadas sem confirmação. Isso impede oscilações artificiais no livro.
 */
export function processEraSignals(book, analysis) {
  const year = finiteYear(analysis?.year);
  if (year == null) return normalizeHistoryBook(book);
  const current = normalizeHistoryBook(book, year);
  const signals = Array.isArray(analysis?.signals) ? analysis.signals : [];
  const eras = current.eras.map(era => ({ ...era }));
  const events = [...current.eraEvents];
  const matchedKeys = new Set();

  signals.forEach(signal => {
    const key = signalStableKey(signal);
    if (!key || Number(signal.confidence) < 0.45) return;
    matchedKeys.add(key);
    let index = eras.findIndex(era => era.signalKey === key && era.status !== 'CLOSED');

    if (index < 0) {
      const era = {
        ...createEmptyEra({ id: eraIdForSignal(signal, year), startYear: signal.startYear, kind: signal.kind }),
        signalKey: key,
        scope: eraScopeForSignal(signal),
        lastSeenYear: year,
        persistenceYears: 1,
        signalYears: [year],
        confidence: clamp01(signal.confidence),
        evidenceIds: [signal.id],
        chapterYears: [year],
        protagonistIds: [...(signal.subjectIds ?? [])].slice(0, 32),
        protagonistNames: [...(signal.subjectNames ?? [])].slice(0, 32),
        rivalIds: signal.kind === 'DUOPOLY' ? [...(signal.subjectIds ?? [])].slice(1, 8) : [],
        rivalNames: signal.kind === 'DUOPOLY' ? [...(signal.subjectNames ?? [])].slice(1, 8) : [],
        keyMetrics: { ...(signal.metrics ?? {}) },
      };
      eras.push(era);
      pushEraEvent(events, era, 'OPENED', year, 'FIRST_PERSISTENT_TREND_SIGNAL');
      return;
    }

    const previous = eras[index];
    const signalYears = [...new Set([...(previous.signalYears ?? []), year])].sort((a, b) => a - b).slice(-32);
    const persistenceYears = signalYears.length;
    const nextConfidence = clamp01((previous.confidence ?? 0) * 0.35 + (Number(signal.confidence) || 0) * 0.65);
    const nextEra = {
      ...previous,
      startYear: Math.min(previous.startYear ?? year, signal.startYear ?? year),
      endYear: null,
      lastSeenYear: year,
      persistenceYears,
      absenceYears: 0,
      signalYears,
      confidence: nextConfidence,
      evidenceIds: [...new Set([...(previous.evidenceIds ?? []), signal.id])].slice(-160),
      chapterYears: [...new Set([...(previous.chapterYears ?? []), year])].sort((a, b) => a - b).slice(-80),
      protagonistIds: [...new Set([...(previous.protagonistIds ?? []), ...(signal.subjectIds ?? [])])].slice(0, 32),
      protagonistNames: [...new Set([...(previous.protagonistNames ?? []), ...(signal.subjectNames ?? [])])].slice(0, 32),
      rivalIds: previous.kind === 'DUOPOLY'
        ? [...new Set([...(previous.rivalIds ?? []), ...(signal.subjectIds ?? []).slice(1)])].slice(0, 32)
        : previous.rivalIds,
      rivalNames: previous.kind === 'DUOPOLY'
        ? [...new Set([...(previous.rivalNames ?? []), ...(signal.subjectNames ?? []).slice(1)])].slice(0, 32)
        : previous.rivalNames,
      keyMetrics: { ...(previous.keyMetrics ?? {}), ...(signal.metrics ?? {}) },
    };
    const nextStatus = statusForObservedEra({ ...nextEra, persistenceYears }, signal);
    eras[index] = transitionEra(nextEra, nextStatus, year, 'TREND_SIGNAL_CONFIRMED', events);
    if (eras[index].status === 'ACTIVE' && !eras[index].declaredYear) {
      eras[index] = { ...eras[index], declaredYear: year };
    }
  });

  // Um ano sem confirmação inicia o declínio; dois anos fecham a era. Uma
  // oscilação de curto prazo, portanto, não apaga uma era consolidada.
  eras.forEach((era, index) => {
    if (era.status === 'CLOSED' || matchedKeys.has(era.signalKey)) return;
    const absenceYears = Math.max(0, year - (era.lastSeenYear ?? year));
    if (absenceYears >= 2) {
      const closingEra = { ...era, absenceYears, endYear: era.lastSeenYear ?? year };
      eras[index] = transitionEra(closingEra, 'CLOSED', year, 'TWO_SEASONS_WITHOUT_CONFIRMATION', events);
    } else if (absenceYears >= 1 && era.status !== 'DECLINING') {
      eras[index] = transitionEra({ ...era, absenceYears }, 'DECLINING', year, 'ONE_SEASON_WITHOUT_CONFIRMATION', events);
    }
  });

  return normalizeHistoryBook({
    ...current,
    eras,
    eraEvents: events,
    activeEraId: choosePrimaryEra(eras),
    metadata: {
      ...current.metadata,
      lastEraYear: year,
    },
  }, year);
}

const ERA_STYLE_LABELS = {
  BIG_SERVER: 'do saque dominante',
  SRV_VOL: 'do saque e voleio',
  AGG_BASELINER: 'do ataque de fundo',
  PWR_BASE: 'da potência de fundo',
  CTR_PUNCHER: 'do contra-ataque',
  RETRIEVER: 'da defesa sem fim',
  GRINDER: 'da resistência',
  ALL_COURT: 'do jogo total',
  TACT_TEC: 'da técnica tática',
};

function eraSubjectNames(era) {
  return [...new Set([...(era.protagonistNames ?? []), ...(era.rivalNames ?? [])])]
    .filter(Boolean)
    .slice(0, 8);
}

function buildEraTitle(era) {
  const names = eraSubjectNames(era);
  const first = names[0] ?? 'o circuito';
  const second = names[1];
  switch (era.kind) {
    case 'DYNASTY': return `A Era de ${first}`;
    case 'DUOPOLY': return second ? `O Duopólio de ${first} e ${second}` : 'O Duopólio do Circuito';
    case 'GENERATION_SHIFT': return 'A Geração da Virada';
    case 'INTERREGNUM': {
      const count = Number(era.keyMetrics?.uniqueMajorChampions) || 5;
      return `O Interregno das ${count} Coroas`;
    }
    case 'STYLE_REVOLUTION': {
      const style = era.keyMetrics?.style;
      return `A Revolução ${ERA_STYLE_LABELS[style] ?? `do estilo ${style ?? 'em ascensão'}`}`;
    }
    case 'NATIONAL_WAVE': return `A Onda ${era.keyMetrics?.nationality ?? names[0] ?? 'Nacional'}`;
    default: return 'Uma Nova Ordem';
  }
}

function buildEraSubtitle(era) {
  const metrics = era.keyMetrics ?? {};
  switch (era.kind) {
    case 'DYNASTY':
      return `${metrics.majorTitles ?? 'Vários'} Grand Slams concentrados em um mesmo nome.`;
    case 'DUOPOLY':
      return `${metrics.majorTitles ?? 'Vários'} Grand Slams divididos por dois protagonistas.`;
    case 'GENERATION_SHIFT':
      return 'A hierarquia envelheceu enquanto a próxima geração ocupava o palco.';
    case 'INTERREGNUM':
      return `${metrics.uniqueMajorChampions ?? 'Vários'} campeões de Major e nenhuma coroa permanente.`;
    case 'STYLE_REVOLUTION':
      return `O estilo ${metrics.style ?? 'em ascensão'} ganhou espaço no topo do ranking.`;
    case 'NATIONAL_WAVE':
      return `${metrics.top25Count ?? 'Vários'} jogadores da mesma nacionalidade no Top 25.`;
    default:
      return 'Um movimento histórico ainda procurando seu nome.';
  }
}

function eventChapterType(events, era) {
  const latest = events.at(-1)?.type;
  if (latest === 'CLOSED') return 'CLOSURE';
  if (latest === 'DECLINING') return 'DECLINE';
  if (latest === 'CONSOLIDATED') return 'CONSOLIDATION';
  if (latest === 'DECLARED') return 'DECLARATION';
  if (latest === 'OPENED') return 'FORMATION';
  return era.status === 'FORMING' ? 'FORMATION' : 'SEASON';
}

function buildEraChapterText(era, snapshot, events, year) {
  const rankingLeader = snapshot?.ranking?.leader?.name;
  const dominantSurface = snapshot?.surfaces?.dominant;
  const metrics = era.keyMetrics ?? {};
  const parts = [];
  const names = eraSubjectNames(era);
  const first = names[0] ?? 'os protagonistas do circuito';
  const second = names[1];

  if (era.kind === 'DYNASTY') {
    parts.push(`${first} transformou uma sequência de resultados em uma presença que o circuito passou a medir em anos, não em torneios.`);
  } else if (era.kind === 'DUOPOLY') {
    parts.push(`${first}${second ? ` e ${second}` : ''} dividiram os grandes palcos até que cada encontro entre os dois parecesse também uma disputa pelo significado da temporada.`);
  } else if (era.kind === 'GENERATION_SHIFT') {
    parts.push(`Em ${year}, a mudança de geração deixou de ser uma promessa estatística e começou a aparecer no centro das chaves.`);
  } else if (era.kind === 'INTERREGNUM') {
    parts.push(`Em ${year}, o circuito não encontrou um dono. Encontrou vários campeões, várias respostas e nenhuma autoridade definitiva.`);
  } else if (era.kind === 'STYLE_REVOLUTION') {
    parts.push(`O estilo ${metrics.style ?? 'em ascensão'} deixou de ser uma exceção tática e passou a influenciar a forma como o topo do circuito se preparava.`);
  } else if (era.kind === 'NATIONAL_WAVE') {
    parts.push(`A presença de ${metrics.nationality ?? 'uma mesma escola nacional'} no topo deixou de parecer coincidência e começou a parecer movimento.`);
  } else {
    parts.push(`O circuito mudou de direção em ${year}, ainda sem saber exatamente que capítulo estava começando.`);
  }

  if (rankingLeader) parts.push(`${rankingLeader} terminou o ano como número 1, dando ao capítulo um rosto visível.`);
  if (metrics.majorShare >= 0.65) parts.push(`A concentração de títulos chegou a ${Math.round(metrics.majorShare * 100)}%, um número alto demais para ser tratado como acaso.`);
  if (snapshot?.events?.calendarSlam) parts.push(`${snapshot.events.grandSlamDominator?.name ?? first} completou o Calendar Slam, o tipo de acontecimento que transforma uma temporada em referência.`);
  else if (snapshot?.events?.grandSlamSweep) parts.push(`${snapshot.events.grandSlamDominator?.name ?? first} venceu ${snapshot.events.grandSlamDominator?.count ?? 'vários'} Grand Slams no mesmo ano.`);
  if (snapshot?.events?.biggestUpset) {
    const upset = snapshot.events.biggestUpset;
    parts.push(`${upset.winnerName ?? 'Um desafiante'} derrubou o favorito no ${upset.tournamentName ?? 'grande palco'}, lembrando que nenhuma era é feita apenas de confirmações.`);
  }
  if (snapshot?.events?.majorInjury) parts.push(`${snapshot.events.majorInjury.name ?? 'Uma figura central'} sofreu uma lesão importante, abrindo uma fissura no roteiro do circuito.`);
  if (snapshot?.events?.retirements?.length) {
    const retirement = snapshot.events.retirements.find(item => item.isLegend) ?? snapshot.events.retirements[0];
    if (retirement) parts.push(`${retirement.name} deixou as quadras, e a era perdeu uma das presenças que ajudavam a defini-la.`);
  }
  if (snapshot?.events?.debutSensation?.name) parts.push(`${snapshot.events.debutSensation.name} apareceu como a nova possibilidade que os veteranos ainda não sabiam como medir.`);
  if (dominantSurface?.surface) parts.push(`Na superfície ${dominantSurface.surface}, ${dominantSurface.name ?? first} encontrou o terreno onde essa história ganhou sua forma mais clara.`);

  const latestEvent = events.at(-1)?.type;
  if (latestEvent === 'DECLARED') parts.push('Foi neste momento que o circuito parou de chamar aquilo de tendência e passou a chamar de era.');
  if (latestEvent === 'CONSOLIDATED') parts.push('A repetição retirou da narrativa a última desculpa para tratá-la como acidente.');
  if (latestEvent === 'DECLINING') parts.push('Pela primeira vez, o padrão não se repetiu. A era ainda existia, mas já não parecia invulnerável.');
  if (latestEvent === 'CLOSED') parts.push(`A era terminou em ${era.endYear ?? year}; o que veio depois não precisou negar o período anterior, apenas encontrou outra linguagem.`);

  return parts.join(' ');
}

function buildEraTurningPoints(era, snapshot, events, year) {
  const points = [];
  events.forEach(event => {
    points.push({
      id: `turning-point-${era.id}-${event.type}-${year}`,
      year,
      eraId: era.id,
      type: `ERA_${event.type}`,
      importance: event.type === 'CLOSED' || event.type === 'DECLARED' ? 1 : 0.75,
      title: event.type === 'CLOSED' ? 'A era chegou ao fim' : event.type === 'DECLARED' ? 'A tendência ganhou um nome' : `Transição: ${event.type.toLowerCase()}`,
      reason: event.reason,
    });
  });
  const snapshotEvents = snapshot?.events ?? {};
  if (snapshotEvents.calendarSlam || snapshotEvents.grandSlamSweep) {
    points.push({
      id: `turning-point-${era.id}-slam-${year}`,
      year,
      eraId: era.id,
      type: snapshotEvents.calendarSlam ? 'CALENDAR_SLAM' : 'GRAND_SLAM_SWEEP',
      importance: 1,
      title: snapshotEvents.calendarSlam ? 'Calendar Slam' : 'Domínio nos Grand Slams',
      reason: snapshotEvents.grandSlamDominator?.name ?? null,
    });
  }
  if (snapshotEvents.biggestUpset) {
    points.push({
      id: `turning-point-${era.id}-upset-${year}`,
      year,
      eraId: era.id,
      type: 'MAJOR_UPSET',
      importance: 0.7,
      title: snapshotEvents.biggestUpset.tournamentName ?? 'A queda do favorito',
      reason: snapshotEvents.biggestUpset.winnerName ?? null,
    });
  }
  if (snapshotEvents.majorInjury) {
    points.push({
      id: `turning-point-${era.id}-injury-${year}`,
      year,
      eraId: era.id,
      type: 'MAJOR_INJURY',
      importance: 0.8,
      title: 'Uma ausência muda o roteiro',
      reason: snapshotEvents.majorInjury.name ?? null,
    });
  }
  return points;
}

/**
 * Dá nome e forma narrativa às eras sem inventar acontecimentos. Cada
 * capítulo aponta para o snapshot anual e cada virada aponta para um fato
 * verificável ou para uma transição da máquina de estados.
 */
export function writeHistoryNarrative(book, analysis) {
  const year = finiteYear(analysis?.year);
  if (year == null) return normalizeHistoryBook(book);
  const current = normalizeHistoryBook(book, year);
  const snapshot = current.annualSnapshots.find(item => item.year === year) ?? current.annualSnapshots.at(-1);
  if (!snapshot) return current;
  const signals = Array.isArray(analysis?.signals) ? analysis.signals : [];
  let turningPoints = [...current.turningPoints];
  const eras = current.eras.map(era => {
    const eraEvents = current.eraEvents.filter(event => event.eraId === era.id && event.year === year);
    const signal = signals.find(item => signalStableKey(item) === era.signalKey);
    if (!signal && eraEvents.length === 0 && era.lastSeenYear !== year) return era;

    const named = {
      ...era,
      title: era.title ?? buildEraTitle(era),
      subtitle: era.subtitle ?? buildEraSubtitle(era),
    };
    const points = buildEraTurningPoints(named, snapshot, eraEvents, year);
    turningPoints = [...turningPoints.filter(point => !points.some(next => next.id === point.id)), ...points];
    const pointIds = points.map(point => point.id);
    const chapterType = eventChapterType(eraEvents, named);
    const chapter = {
      id: `chapter-${named.id}-${year}`,
      year,
      type: chapterType,
      title: chapterType === 'CLOSURE' ? 'O último capítulo' : chapterType === 'DECLARATION' ? 'O momento em que ganhou nome' : chapterType === 'CONSOLIDATION' ? 'A confirmação' : chapterType === 'DECLINE' ? 'A primeira rachadura' : `Capítulo de ${year}`,
      text: buildEraChapterText(named, snapshot, eraEvents, year),
      turningPointIds: pointIds,
      facts: {
        status: named.status,
        confidence: named.confidence,
        signalKey: named.signalKey,
      },
    };
    const chapters = [...(named.chapters ?? []).filter(item => item.year !== year), chapter]
      .sort((a, b) => a.year - b.year)
      .slice(-80);
    return {
      ...named,
      chapters,
      chapterYears: [...new Set([...(named.chapterYears ?? []), year])].sort((a, b) => a - b).slice(-80),
      turningPointIds: [...new Set([...(named.turningPointIds ?? []), ...pointIds])].slice(-160),
      legacy: named.status === 'CLOSED' && !named.legacy
        ? { closedYear: named.endYear ?? year, duration: Math.max(1, (named.endYear ?? year) - (named.startYear ?? year) + 1) }
        : named.legacy,
    };
  });

  return normalizeHistoryBook({
    ...current,
    eras,
    turningPoints,
    metadata: {
      ...current.metadata,
      lastNarrativeYear: year,
      narrativeVersion: 1,
    },
  }, year);
}

function uniqueBy(rows, keyOf) {
  const map = new Map();
  (rows ?? []).forEach(row => {
    const key = keyOf(row);
    if (key != null) map.set(key, row);
  });
  return [...map.values()];
}

/**
 * Auditoria/calibração final do livro. É executada no fechamento de cada ano
 * e foi desenhada para permanecer barata mesmo depois de centenas de anos:
 * tudo trabalha sobre listas já limitadas pelo schema, sem reabrir partidas.
 */
export function calibrateHistoryBook(book) {
  const current = normalizeHistoryBook(book);
  const repairs = [];
  const duplicateYears = current.annualSnapshots.length - uniqueBy(current.annualSnapshots, item => item.year).length;
  const duplicateAnalyses = current.trendAnalyses.length - uniqueBy(current.trendAnalyses, item => item.year).length;
  if (duplicateYears > 0) repairs.push(`DEDUP_SNAPSHOTS:${duplicateYears}`);
  if (duplicateAnalyses > 0) repairs.push(`DEDUP_TRENDS:${duplicateAnalyses}`);

  const snapshots = uniqueBy(current.annualSnapshots, item => item.year).sort((a, b) => a.year - b.year);
  const trendAnalyses = uniqueBy(current.trendAnalyses, item => item.year).sort((a, b) => a.year - b.year);
  const latestYear = snapshots.at(-1)?.year ?? current.lastProcessedYear ?? null;
  const eras = uniqueBy(current.eras, era => era.id).map(era => {
    let next = { ...era };
    if (latestYear != null && next.lastSeenYear != null && next.lastSeenYear > latestYear) {
      next = { ...next, lastSeenYear: latestYear };
      repairs.push(`ERA_FUTURE_DATE:${era.id}`);
    }
    if (next.status !== 'CLOSED' && next.endYear != null) {
      next = { ...next, endYear: null };
      repairs.push(`ERA_OPEN_WITH_END:${era.id}`);
    } else if (next.status === 'CLOSED' && (next.endYear == null || (next.startYear != null && next.endYear < next.startYear))) {
      next = { ...next, endYear: Math.max(next.startYear ?? 0, next.lastSeenYear ?? latestYear ?? 0) || null };
      repairs.push(`ERA_CLOSED_RANGE:${era.id}`);
    }
    if (!next.title) {
      next = { ...next, title: buildEraTitle(next), subtitle: next.subtitle ?? buildEraSubtitle(next) };
      repairs.push(`ERA_NAMED:${era.id}`);
    }
    return next;
  });

  const validEraIds = new Set(eras.map(era => era.id));
  const eraEvents = uniqueBy(current.eraEvents, event => event.id)
    .filter(event => validEraIds.has(event.eraId));
  const orphanEvents = current.eraEvents.length - eraEvents.length;
  if (orphanEvents > 0) repairs.push(`DROP_ORPHAN_EVENTS:${orphanEvents}`);

  const turningPoints = uniqueBy(current.turningPoints, point => point.id)
    .filter(point => !point.eraId || validEraIds.has(point.eraId));
  const orphanPoints = current.turningPoints.length - turningPoints.length;
  if (orphanPoints > 0) repairs.push(`DROP_ORPHAN_TURNING_POINTS:${orphanPoints}`);

  const activeEra = eras.find(era => era.id === current.activeEraId && era.status !== 'CLOSED');
  const activeEraId = activeEra?.id ?? choosePrimaryEra(eras);
  if (activeEraId !== current.activeEraId) repairs.push('REPAIR_ACTIVE_ERA_POINTER');

  return normalizeHistoryBook({
    ...current,
    annualSnapshots: snapshots,
    trendAnalyses,
    eras,
    eraEvents,
    turningPoints,
    activeEraId,
    lastProcessedYear: latestYear ?? current.lastProcessedYear,
    metadata: {
      ...current.metadata,
      calibration: {
        version: 1,
        checkedYear: latestYear,
        ok: true,
        repaired: repairs.length > 0,
        repairCount: repairs.length,
        repairs: repairs.slice(-16),
      },
    },
  }, latestYear ?? 2025);
}
