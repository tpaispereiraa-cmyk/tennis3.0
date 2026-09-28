import { CASE_PHASES, clamp } from './ShockTypes.js';

const EMPTY = Object.freeze({ matchFocus: 0, pressure: 0, recovery: 0, injuryRisk: 0, support: 0, finance: 0, commercial: 0, coachTrust: 0, coachFriction: 0, unavailable: false });

function effectsFor(c) {
  const publicCase = c.phase !== CASE_PHASES.PRIVATE_SIGNAL && c.phase !== CASE_PHASES.CLOSED;
  if (!publicCase) return c.phase === CASE_PHASES.PRIVATE_SIGNAL ? { ...EMPTY, pressure: 2, matchFocus: -1 } : { ...EMPTY };
  const severity = Number(c.truth?.severity ?? 40) / 20;
  const base = { ...EMPTY, pressure: Math.round(4 + severity), matchFocus: -2, commercial: -2 };
  if (c.family === 'HEALTH') return { ...base, recovery: -3, injuryRisk: 7, unavailable: c.phase !== CASE_PHASES.RETURN && c.phase !== CASE_PHASES.AFTERMATH };
  if (c.family === 'LIFE') return { ...base, support: -1, recovery: -1 };
  if (c.family === 'CAREER') return { ...base, coachTrust: -5, coachFriction: 8 };
  if (c.family === 'POSITIVE') return { ...EMPTY, matchFocus: 1, support: 6, commercial: 5, pressure: 2, coachTrust: 2 };
  if (c.family === 'COMPETITIVE') return { ...EMPTY, matchFocus: 2, support: 2, commercial: 3, pressure: 3 };
  if (c.family === 'INTEGRITY') {
    const convicted = ['GUILTY', 'NEGLIGENCE'].includes(c.verdict);
    const cleared = c.verdict === 'CLEARED';
    return {
      ...base, pressure: cleared ? 7 : 14, matchFocus: cleared ? -1 : -4, support: cleared ? 2 : -5,
      commercial: cleared ? -1 : convicted ? -10 : -6, finance: convicted ? -7 : -3,
      coachTrust: cleared ? 2 : convicted ? -12 : -5, coachFriction: cleared ? -2 : convicted ? 15 : 7,
      unavailable: convicted && ![CASE_PHASES.RETURN, CASE_PHASES.AFTERMATH, CASE_PHASES.CLOSED].includes(c.phase),
    };
  }
  return base;
}

function aggregate(cases = []) {
  const total = { ...EMPTY };
  for (const c of cases) {
    const effects = effectsFor(c);
    for (const key of Object.keys(EMPTY)) total[key] = key === 'unavailable' ? total[key] || effects[key] : Number(total[key] ?? 0) + Number(effects[key] ?? 0);
  }
  for (const key of Object.keys(total)) if (key !== 'unavailable') total[key] = clamp(total[key], -18, 18);
  return total;
}

export function refreshShockConsequences(player) {
  const shock = player?.circuitShock ?? {};
  const currentEffects = aggregate(shock.activeCases ?? []);
  const coaching = player.coaching ? {
    ...player.coaching,
    shockTrustModifier: currentEffects.coachTrust,
    shockFrictionModifier: currentEffects.coachFriction,
  } : player.coaching;
  return { ...player, coaching, circuitShock: { ...shock, currentEffects } };
}

export function applyShockCaseUpdate(player, caseState, events = []) {
  const shock = player.circuitShock ?? {};
  const activeCases = [...(shock.activeCases ?? []).filter(item => item.id !== caseState.id), caseState].filter(item => item.phase !== CASE_PHASES.CLOSED).slice(-8);
  const closed = caseState.phase === CASE_PHASES.CLOSED
    ? [...(shock.caseHistory ?? []), { ...caseState, truth: undefined, closedAt: caseState.history?.at(-1) }].slice(-40)
    : [...(shock.caseHistory ?? [])];
  const publicHistory = [...(shock.publicHistory ?? []), ...events].slice(-80);
  return refreshShockConsequences({ ...player, circuitShock: { ...shock, activeCases, caseHistory: closed, publicHistory } });
}

export function isShockUnavailable(player) { return Boolean(player?.circuitShock?.currentEffects?.unavailable); }

export function sponsorSeverityForEvent(event) {
  if (event?.phase !== CASE_PHASES.VERDICT) return 0;
  return event.outcome === 'GUILTY' ? 3 : event.outcome === 'NEGLIGENCE' ? 2 : event.outcome === 'PROCEDURAL_BREACH' ? 1 : 0;
}
