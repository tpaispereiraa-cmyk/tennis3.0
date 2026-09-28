import { CASE_PHASES, CIRCUIT_SHOCK_VERSION, caseId } from './ShockTypes.js';

function legacyCase(player, legacy, type, year) {
  if (!legacy) return null;
  const openedYear = legacy.openedYear ?? legacy.diagnosedYear ?? legacy.announcedYear ?? year;
  const active = !!legacy.active;
  return {
    id: caseId(type, openedYear, player.id, { slot: 'LEGACY' }),
    version: CIRCUIT_SHOCK_VERSION,
    type,
    family: type.includes('INTEGRITY') ? 'INTEGRITY' : type.includes('HEALTH') ? 'LIFE_HEALTH' : 'CAREER',
    scale: 'SIGNIFICANT',
    actorIds: [player.id],
    primaryActorId: player.id,
    openedYear,
    phase: active ? CASE_PHASES.AFTERMATH : CASE_PHASES.CLOSED,
    public: true,
    legacy: true,
    truth: { variant: 'LEGACY_UNSPECIFIED', sealed: false },
    evidence: [],
    decisions: [],
    timeline: [{ year: openedYear, phase: active ? CASE_PHASES.AFTERMATH : CASE_PHASES.CLOSED, type: 'LEGACY_IMPORT' }],
    effects: {},
    slotsRemaining: Math.max(0, legacy.slotsRemaining ?? 0),
    resolution: active ? null : 'LEGACY_CLOSED',
  };
}

export function migratePlayerShockState(player, year = 2025) {
  if (!player) return player;
  const existing = player.circuitShock ?? {};
  const imported = [];
  if (!existing.legacyImported) {
    const b = player.breakingNews ?? {};
    const entries = [
      legacyCase(player, b.scandal, `INTEGRITY_${b.scandal?.kind ?? 'CASE'}`, year),
      legacyCase(player, b.healthCrisis, 'HEALTH_INTERRUPTION', year),
      legacyCase(player, b.personalCrisis, 'PERSONAL_RUPTURE', year),
      legacyCase(player, b.farewellTour, 'FAREWELL_ANNOUNCEMENT', year),
    ].filter(Boolean);
    imported.push(...entries);
  }
  return {
    ...player,
    circuitShock: {
      version: CIRCUIT_SHOCK_VERSION,
      moral: existing.moral ?? null,
      activeCases: [...(existing.activeCases ?? []), ...imported]
        .filter((item, index, all) => all.findIndex(other => other.id === item.id) === index)
        .slice(-12),
      caseHistory: [...(existing.caseHistory ?? [])].slice(-48),
      currentEffects: existing.currentEffects ?? {},
      moralHistory: [...(existing.moralHistory ?? [])].slice(-32),
      legacyImported: true,
    },
  };
}

export function projectLegacyBreakingNews(player) {
  const next = { ...player, breakingNews: { ...(player.breakingNews ?? {}), history: [...(player.breakingNews?.history ?? [])] } };
  const active = next.circuitShock?.activeCases ?? [];
  const isPublic = c => ![CASE_PHASES.PRIVATE_SIGNAL, CASE_PHASES.CLOSED].includes(c.phase);
  const integrity = active.find(c => c.family === 'INTEGRITY' && isPublic(c));
  const health = active.find(c => c.type === 'HEALTH_INTERRUPTION' && c.phase !== CASE_PHASES.CLOSED);
  const personal = active.find(c => c.type === 'PERSONAL_RUPTURE' && isPublic(c));
  const farewell = active.find(c => c.type === 'FAREWELL_ANNOUNCEMENT' && c.phase !== CASE_PHASES.CLOSED);
  if (integrity && !integrity.legacy) next.breakingNews.scandal = {
    active: integrity.phase !== CASE_PHASES.RETURN && integrity.phase !== CASE_PHASES.AFTERMATH,
    kind: integrity.type.includes('BETTING') ? 'BETTING' : 'DOPING',
    status: integrity.phase,
    openedYear: integrity.openedYear,
    slotsRemaining: integrity.slotsRemaining ?? 0,
    caseId: integrity.id,
    returnWatch: integrity.returnWatch ?? 0,
  };
  if (health && !health.legacy) next.breakingNews.healthCrisis = { active: true, status: health.phase, diagnosedYear: health.openedYear, slotsRemaining: health.slotsRemaining ?? 0, caseId: health.id, diagnosisName: health.publicLabel ?? null };
  if (personal && !personal.legacy) next.breakingNews.personalCrisis = { active: true, kind: personal.truth?.variant, openedYear: personal.openedYear, slotsRemaining: personal.slotsRemaining ?? 0, caseId: personal.id };
  if (farewell && !farewell.legacy) next.breakingNews.farewellTour = { active: true, announcedYear: farewell.openedYear, finalSeasonYear: farewell.openedYear, caseId: farewell.id };
  if (!integrity && String(next.breakingNews.scandal?.caseId ?? '').startsWith('shock:')) next.breakingNews.scandal = null;
  if (!health && String(next.breakingNews.healthCrisis?.caseId ?? '').startsWith('shock:')) next.breakingNews.healthCrisis = null;
  if (!personal && String(next.breakingNews.personalCrisis?.caseId ?? '').startsWith('shock:')) next.breakingNews.personalCrisis = null;
  if (!farewell && String(next.breakingNews.farewellTour?.caseId ?? '').startsWith('shock:')) next.breakingNews.farewellTour = null;
  return next;
}
