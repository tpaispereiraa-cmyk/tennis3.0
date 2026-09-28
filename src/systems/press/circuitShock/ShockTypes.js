export const CIRCUIT_SHOCK_VERSION = 2;

export const SHOCK_MODES = Object.freeze({
  OFF: 'OFF',
  REALISTIC: 'REALISTIC',
  DRAMATIC: 'DRAMATIC',
  LEGACY: 'LEGACY',
});

export const CASE_PHASES = Object.freeze({
  PRIVATE_SIGNAL: 'PRIVATE_SIGNAL',
  PUBLIC_BREAK: 'PUBLIC_BREAK',
  RESPONSE: 'RESPONSE',
  INVESTIGATION: 'INVESTIGATION',
  VERDICT: 'VERDICT',
  APPEAL: 'APPEAL',
  RETURN: 'RETURN',
  AFTERMATH: 'AFTERMATH',
  CLOSED: 'CLOSED',
});

export const SHOCK_SCALE = Object.freeze({
  FLASH: 'FLASH',
  SIGNIFICANT: 'SIGNIFICANT',
  SEISMIC: 'SEISMIC',
  ERA_DEFINING: 'ERA_DEFINING',
});

export const SCALE_COST = Object.freeze({ FLASH: 1, SIGNIFICANT: 2, SEISMIC: 5, ERA_DEFINING: 8 });

export function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Number(value) || 0));
}

export function hashSeed(value = '') {
  let h = 2166136261;
  for (const c of String(value)) {
    h ^= c.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function seededUnit(...parts) {
  let x = hashSeed(parts.join(':')) || 1;
  x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
  return (x >>> 0) / 4294967295;
}

export function seededInt(min, max, ...parts) {
  return min + Math.floor(seededUnit(...parts) * (max - min + 1));
}

export function weightedSeededPick(items = [], seed = '') {
  const viable = items.filter(item => (item.weight ?? 0) > 0);
  const total = viable.reduce((sum, item) => sum + item.weight, 0);
  if (!viable.length || total <= 0) return null;
  let roll = seededUnit(seed, 'weighted') * total;
  for (const item of viable) {
    roll -= item.weight;
    if (roll <= 0) return item;
  }
  return viable.at(-1) ?? null;
}

export function createCircuitShockState(year = 2025, options = {}) {
  const mode = Object.values(SHOCK_MODES).includes(options.mode) ? options.mode : SHOCK_MODES.REALISTIC;
  const seed = options.seed ?? `circuit-shock:${year}`;
  return {
    version: CIRCUIT_SHOCK_VERSION,
    mode,
    seed,
    year,
    tension: 12,
    annualBudget: mode === SHOCK_MODES.DRAMATIC ? 13 : 8,
    spentBudget: 0,
    lastSeismicYear: null,
    familyCooldowns: {},
    processedPulses: [],
    activeWorldCases: [],
    history: [],
    metrics: { pulses: 0, casesOpened: 0, publicBreaks: 0, integrityCases: 0, seismicCases: 0 },
  };
}

export function migrateCircuitShockState(raw, year = 2025) {
  const base = createCircuitShockState(year, raw ?? {});
  if (!raw || typeof raw !== 'object') return base;
  const nextYear = raw.year ?? year;
  const yearChanged = nextYear !== year;
  return {
    ...base,
    ...raw,
    version: CIRCUIT_SHOCK_VERSION,
    year,
    annualBudget: yearChanged ? (raw.mode === SHOCK_MODES.DRAMATIC ? 13 : 8) : (raw.annualBudget ?? base.annualBudget),
    spentBudget: yearChanged ? 0 : (raw.spentBudget ?? 0),
    processedPulses: yearChanged ? [] : [...(raw.processedPulses ?? [])].slice(-80),
    activeWorldCases: [...(raw.activeWorldCases ?? [])].slice(-12),
    history: [...(raw.history ?? [])].slice(-160),
    familyCooldowns: { ...(raw.familyCooldowns ?? {}) },
    metrics: { ...base.metrics, ...(raw.metrics ?? {}) },
  };
}

export function pulseKey(year, context = {}) {
  return `${year}:${context.phase ?? 'TOURNAMENT'}:${context.tournament?.id ?? context.slot ?? 'WORLD'}`;
}

export function caseId(type, year, actorId, context = {}) {
  return `shock:${year}:${type}:${actorId ?? 'WORLD'}:${context.tournament?.id ?? context.slot ?? 'OPEN'}`;
}

