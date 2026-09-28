// SeasonPulseSystem
// Centraliza o "relogio vivo" da temporada. Por enquanto ele registra os
// pulsos sem mudar gameplay; os proximos patches plugam vida, patrocinio,
// progressao e jornalismo aqui com seguranca.

export const SEASON_PULSE_PHASES = Object.freeze({
  POST_TOURNAMENT: 'POST_TOURNAMENT',
  MONTHLY: 'MONTHLY',
  BLOCK_CHANGE: 'BLOCK_CHANGE',
  SEASON_END: 'SEASON_END',
});

const MAX_RECENT_PULSES = 48;
const WEEKS_IN_YEAR = 52;

const SEASON_BLOCKS = [
  { id: 'OPENING_HARD', label: 'Abertura hard', from: 1, to: 9 },
  { id: 'CLAY_SWING', label: 'Temporada de saibro', from: 10, to: 22 },
  { id: 'GRASS_SWING', label: 'Temporada de grama', from: 23, to: 28 },
  { id: 'SUMMER_HARD', label: 'Verao hard', from: 29, to: 38 },
  { id: 'ASIA_INDOOR', label: 'Asia e indoor', from: 39, to: 46 },
  { id: 'SEASON_CLOSE', label: 'Reta final', from: 47, to: 52 },
];

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, Number.isFinite(n) ? n : min));
}

function normalizeWeekIndex(weekIndex) {
  const raw = Number.isFinite(weekIndex) ? weekIndex : 0;
  return clamp(Math.round(raw), 0, WEEKS_IN_YEAR - 1);
}

function monthFromWeek(weekIndex) {
  const week = normalizeWeekIndex(weekIndex) + 1;
  return clamp(Math.floor((week - 1) / 4.345) + 1, 1, 12);
}

function blockFromWeek(weekIndex) {
  const week = normalizeWeekIndex(weekIndex) + 1;
  return SEASON_BLOCKS.find(block => week >= block.from && week <= block.to) ?? SEASON_BLOCKS[0];
}

export function getSeasonPulseTiming({ year = 2025, weekIndex = 0, tournament = null } = {}) {
  const safeWeekIndex = normalizeWeekIndex(tournament?.weekIndex ?? weekIndex);
  const block = blockFromWeek(safeWeekIndex);
  return {
    year,
    weekIndex: safeWeekIndex,
    weekNumber: safeWeekIndex + 1,
    monthIndex: monthFromWeek(safeWeekIndex),
    date: { year, month: monthFromWeek(safeWeekIndex) },
    blockId: block.id,
    blockLabel: block.label,
    tournamentId: tournament?.id ?? null,
    tournamentName: tournament?.name ?? null,
    category: tournament?.category ?? null,
    surface: tournament?.surface ?? null,
  };
}

export function createSeasonPulseState(year = 2025, carry = {}) {
  return {
    _version: 1,
    year,
    lastWeekIndex: null,
    lastMonthIndex: null,
    lastBlockId: null,
    counters: {
      postTournament: 0,
      monthly: 0,
      blockChange: 0,
      seasonEnd: 0,
    },
    recentPulses: [],
    lastSeasonClose: carry.lastSeasonClose ?? null,
  };
}

export function ensureSeasonPulseState(raw = null, year = 2025) {
  if (!raw || typeof raw !== 'object') return createSeasonPulseState(year);
  if (raw.year !== year) {
    return createSeasonPulseState(year, { lastSeasonClose: raw.lastSeasonClose ?? null });
  }
  return {
    ...createSeasonPulseState(year),
    ...raw,
    counters: {
      ...createSeasonPulseState(year).counters,
      ...(raw.counters ?? {}),
    },
    recentPulses: Array.isArray(raw.recentPulses) ? raw.recentPulses.slice(-MAX_RECENT_PULSES) : [],
  };
}

function pushPulse(pulseState, pulse) {
  return {
    ...pulseState,
    recentPulses: [...(pulseState.recentPulses ?? []), pulse].slice(-MAX_RECENT_PULSES),
  };
}

function countPulse(pulseState, key) {
  return {
    ...pulseState,
    counters: {
      ...(pulseState.counters ?? {}),
      [key]: (pulseState.counters?.[key] ?? 0) + 1,
    },
  };
}

export function runSeasonPulse(state, opts = {}) {
  const phase = opts.phase ?? SEASON_PULSE_PHASES.POST_TOURNAMENT;
  const year = opts.year ?? state?.year ?? 2025;
  const timing = getSeasonPulseTiming({
    year,
    weekIndex: opts.weekIndex ?? state?.calendarIndex ?? 0,
    tournament: opts.tournament ?? null,
  });
  let pulseState = ensureSeasonPulseState(state?.seasonPulseState, year);
  const pulses = [];

  const addPulse = (type, extra = {}) => {
    const pulse = {
      id: `${year}_${timing.weekNumber}_${type}_${pulseState.recentPulses?.length ?? 0}`,
      type,
      year,
      weekIndex: timing.weekIndex,
      weekNumber: timing.weekNumber,
      monthIndex: timing.monthIndex,
      date: timing.date,
      dateKey: `${year}-${String(timing.monthIndex).padStart(2, '0')}`,
      blockId: timing.blockId,
      tournamentId: timing.tournamentId,
      tournamentName: timing.tournamentName,
      category: timing.category,
      surface: timing.surface,
      ...extra,
    };
    pulses.push(pulse);
    pulseState = pushPulse(pulseState, pulse);
  };

  if (phase === SEASON_PULSE_PHASES.SEASON_END) {
    addPulse(SEASON_PULSE_PHASES.SEASON_END, {
      completedTournaments: opts.completedTournaments ?? Object.keys(state?.tournamentResults ?? {}).length,
    });
    pulseState = countPulse(pulseState, 'seasonEnd');
    pulseState = {
      ...pulseState,
      lastSeasonClose: {
        year,
        weekIndex: timing.weekIndex,
        completedTournaments: opts.completedTournaments ?? Object.keys(state?.tournamentResults ?? {}).length,
        closedAtPulse: pulseState.recentPulses.at(-1)?.id ?? null,
      },
    };
  } else {
    if (phase === SEASON_PULSE_PHASES.POST_TOURNAMENT) {
      addPulse(SEASON_PULSE_PHASES.POST_TOURNAMENT, {
        resultId: opts.result?.id ?? opts.tournament?.id ?? null,
      });
      pulseState = countPulse(pulseState, 'postTournament');
      pulseState = { ...pulseState, lastWeekIndex: timing.weekIndex };
    }

    if (pulseState.lastMonthIndex !== timing.monthIndex) {
      addPulse(SEASON_PULSE_PHASES.MONTHLY);
      pulseState = countPulse(pulseState, 'monthly');
      pulseState = { ...pulseState, lastMonthIndex: timing.monthIndex };
    }

    if (pulseState.lastBlockId !== timing.blockId) {
      addPulse(SEASON_PULSE_PHASES.BLOCK_CHANGE, { blockLabel: timing.blockLabel });
      pulseState = countPulse(pulseState, 'blockChange');
      pulseState = { ...pulseState, lastBlockId: timing.blockId };
    }
  }

  return {
    state: {
      ...state,
      seasonPulseState: pulseState,
    },
    pulses,
    timing,
  };
}

export function summarizeSeasonPulseState(raw = null, year = 2025) {
  const pulseState = ensureSeasonPulseState(raw, year);
  return {
    year: pulseState.year,
    currentMonth: pulseState.lastMonthIndex,
    currentBlock: pulseState.lastBlockId,
    counters: pulseState.counters,
    lastSeasonClose: pulseState.lastSeasonClose,
    recentCount: pulseState.recentPulses.length,
  };
}
