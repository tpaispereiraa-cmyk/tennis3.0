/**
 * YouthFoundationSystem.js
 * ───────────────────────────────────────────────────────────────────────────
 * Contrato persistente da história pré-profissional. Esta primeira camada não
 * altera atributos, calendário ou elegibilidade: ela só dá a cada jogador uma
 * origem consistente para os próximos patches poderem expandir sem quebrar
 * saves existentes.
 */

export const YOUTH_PROFILE_VERSION = 1;

import { createYouthChildhood } from './YouthOriginsSystem.js';
import { createYouthAcademyAffiliation } from './YouthAcademySystem.js';

const ORIGINS = [
  { id: 'LOCAL_CLUB', label: 'clube local' },
  { id: 'FAMILY_TENNIS', label: 'família ligada ao tênis' },
  { id: 'PUBLIC_PROJECT', label: 'projeto público' },
  { id: 'ACADEMY_SCHOLARSHIP', label: 'bolsa em academia' },
  { id: 'SELF_TAUGHT', label: 'formação improvisada' },
  { id: 'LATE_DISCOVERY', label: 'descoberta tardia' },
];

const ACCESS_LEVELS = ['LIMITED', 'MODEST', 'STABLE', 'PRIVILEGED'];
const SUPPORT_LEVELS = ['FRAGILE', 'PRESENT', 'STRONG'];

function hashSeed(value) {
  let hash = 2166136261;
  const source = String(value ?? 'unknown');
  for (let i = 0; i < source.length; i += 1) {
    hash ^= source.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function pick(values, seed, offset) {
  return values[(seed >>> offset) % values.length];
}

function inferBirthYear(player = {}, seasonYear) {
  const explicit = Number(player.birthYear);
  if (Number.isFinite(explicit)) return Math.trunc(explicit);
  const age = Number(player.age);
  return Number.isFinite(age) ? Math.trunc(seasonYear - age) : null;
}

function isLegacyPlayer(player, source) {
  return source === 'SAVE_MIGRATION'
    || source === 'UNIVERSE_CREATION'
    || Boolean(player.namedPlayerKey);
}

/** Creates a deterministic, compact youth profile for a newly created player. */
export function createYouthProfile(player = {}, seasonYear = 2025, source = 'NEWGEN') {
  const birthYear = inferBirthYear(player, seasonYear);
  const seed = hashSeed(`${player.id ?? player.name ?? player.fullName ?? 'player'}:${birthYear ?? seasonYear}`);
  const origin = pick(ORIGINS, seed, 0);
  const reconstructed = isLegacyPlayer(player, source);
  const discoveryAge = origin.id === 'LATE_DISCOVERY'
    ? 11 + (seed % 4)
    : 5 + ((seed >>> 5) % 5);

  const profile = {
    version: YOUTH_PROFILE_VERSION,
    source,
    reconstructed,
    birthYear,
    generationYear: birthYear ?? seasonYear,
    origin: {
      id: origin.id,
      label: origin.label,
      access: pick(ACCESS_LEVELS, seed, 9),
      familySupport: pick(SUPPORT_LEVELS, seed, 13),
      discoveryAge,
    },
    academy: null,
    junior: {
      status: 'UNSTARTED',
      circuitEntryYear: null,
      peakTier: null,
      titles: 0,
    },
    transition: {
      status: 'UNSTARTED',
      proDebutYear: null,
    },
    milestones: reconstructed ? [{
      type: 'YOUTH_HISTORY_RECONSTRUCTED',
      year: seasonYear,
    }] : [],
  };
  const withChildhood = { ...profile, childhood: createYouthChildhood(player, profile) };
  return { ...withChildhood, academy: createYouthAcademyAffiliation(player, withChildhood) };
}

/**
 * Save-safe migration. Never overwrites information already earned by later
 * youth patches; it only fills the foundation fields missing from old saves.
 */
export function ensureYouthProfile(player = {}, seasonYear = 2025, source = 'SAVE_MIGRATION') {
  const base = createYouthProfile(player, seasonYear, source);
  const current = player.youthProfile;
  if (!current || typeof current !== 'object') {
    return { ...player, youthProfile: base };
  }

  const currentOrigin = current.origin && typeof current.origin === 'object' ? current.origin : {};
  const currentJunior = current.junior && typeof current.junior === 'object' ? current.junior : {};
  const currentTransition = current.transition && typeof current.transition === 'object' ? current.transition : {};

  return {
    ...player,
    youthProfile: {
      ...base,
      ...current,
      version: YOUTH_PROFILE_VERSION,
      birthYear: current.birthYear ?? base.birthYear,
      origin: { ...base.origin, ...currentOrigin },
      academy: current.academy ?? base.academy,
      childhood: current.childhood && typeof current.childhood === 'object'
        ? { ...base.childhood, ...current.childhood }
        : base.childhood,
      junior: { ...base.junior, ...currentJunior },
      transition: { ...base.transition, ...currentTransition },
      milestones: Array.isArray(current.milestones) ? current.milestones.slice(-40) : base.milestones,
    },
  };
}
