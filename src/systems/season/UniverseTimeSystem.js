/**
 * UniverseTimeSystem
 * ------------------------------------------------------------------
 * Fonte única do tempo civil do Modo Universo. O circuito continua sendo
 * dirigido por semanas/torneios, mas jogadores agora vivem em meses reais.
 * Não há dias jogáveis: aniversário, vencimento e pulso usam ano + mês.
 */

export const MONTHS_IN_YEAR = 12;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, Math.round(Number(value) || min)));
}

function hash(value = '') {
  let result = 2166136261;
  for (const char of String(value)) {
    result ^= char.charCodeAt(0);
    result = Math.imul(result, 16777619);
  }
  return result >>> 0;
}

export function normalizeUniverseDate(input = null, fallbackYear = 2025) {
  if (typeof input === 'number' && Number.isFinite(input)) {
    const year = Math.floor(input);
    const fraction = input - year;
    return { year, month: clamp(Math.floor(fraction * MONTHS_IN_YEAR) + 1, 1, MONTHS_IN_YEAR) };
  }
  const year = Number(input?.year ?? fallbackYear);
  const month = Number(input?.month ?? input?.monthIndex ?? 1);
  return { year: Number.isFinite(year) ? Math.round(year) : fallbackYear, month: clamp(month, 1, MONTHS_IN_YEAR) };
}

export function dateToSeasonFraction(date, fallbackYear = 2025) {
  const normalized = normalizeUniverseDate(date, fallbackYear);
  return normalized.year + ((normalized.month - 1) / MONTHS_IN_YEAR);
}

export function dateKey(date, fallbackYear = 2025) {
  const normalized = normalizeUniverseDate(date, fallbackYear);
  return `${normalized.year}-${String(normalized.month).padStart(2, '0')}`;
}

export function addMonths(date, amount = 1, fallbackYear = 2025) {
  const normalized = normalizeUniverseDate(date, fallbackYear);
  const serial = normalized.year * MONTHS_IN_YEAR + (normalized.month - 1) + Math.round(amount || 0);
  return {
    year: Math.floor(serial / MONTHS_IN_YEAR),
    month: ((serial % MONTHS_IN_YEAR) + MONTHS_IN_YEAR) % MONTHS_IN_YEAR + 1,
  };
}

export function getPlayerBirthDate(player, referenceDate = null) {
  const fallback = normalizeUniverseDate(referenceDate, 2025);
  const raw = player?.birthDate;
  if (raw && Number.isFinite(Number(raw.year))) {
    return { year: Math.round(Number(raw.year)), month: clamp(raw.month ?? raw.monthIndex ?? 1, 1, MONTHS_IN_YEAR) };
  }
  const age = Number(player?.age);
  const legacyYear = Number(player?.birthYear);
  const baseYear = Number.isFinite(legacyYear)
    ? legacyYear
    : fallback.year - (Number.isFinite(age) ? age : 25);
  // Saves antigos só conhecem a idade anual. Ajustamos o ano quando necessário
  // para que a idade vista no mês atual permaneça idêntica após a migração.
  const month = (hash(player?.id ?? player?.name ?? baseYear) % MONTHS_IN_YEAR) + 1;
  const desiredAge = Number.isFinite(age) ? Math.max(0, Math.round(age)) : fallback.year - baseYear;
  const year = fallback.year - desiredAge - (month > fallback.month ? 1 : 0);
  return { year, month };
}

export function getAgeAtDate(player, date = null, fallbackYear = 2025) {
  const now = normalizeUniverseDate(date, fallbackYear);
  const birth = getPlayerBirthDate(player, now);
  return Math.max(0, now.year - birth.year - (now.month < birth.month ? 1 : 0));
}

export function isBirthdayMonth(player, date = null, fallbackYear = 2025) {
  const now = normalizeUniverseDate(date, fallbackYear);
  return getPlayerBirthDate(player, now).month === now.month;
}

/** Migração idempotente de saves e de jogadores estáticos. */
export function ensurePlayerBirthDate(player, referenceDate = null, fallbackYear = 2025) {
  if (!player) return player;
  const now = normalizeUniverseDate(referenceDate, fallbackYear);
  const birthDate = getPlayerBirthDate(player, now);
  const age = getAgeAtDate({ ...player, birthDate }, now, fallbackYear);
  return {
    ...player,
    birthDate,
    birthYear: birthDate.year,
    age,
  };
}

export function createWorldDate(year = 2025, month = 1) {
  return normalizeUniverseDate({ year, month }, year);
}

