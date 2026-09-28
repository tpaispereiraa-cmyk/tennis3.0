import { overallRating } from '../../domain/players/attributes.js';
import { getPotentialCategory } from '../progression/DevelopmentConstants.js';

export const COMPETITIVE_DENSITY_VERSION = 1;

function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
function projectedCeiling(player) {
  const personal = Number(player?._devState?.ovrTarget ?? getPotentialCategory(player?.potential).ovrCeiling ?? overallRating(player?.attrs ?? {}));
  const realization = Number(player?.careerTrajectory?.realization ?? 67);
  return clamp(personal - Math.round((100 - realization) * .075), 1, 99);
}
function peakYear(player, year) {
  const birthYear = Number(player?.birthYear ?? (year - Number(player?.age ?? 24)));
  return birthYear + Number(player?.peakAge ?? 27);
}

export function createCompetitiveDensityState(year = 2025) {
  return { version: COMPETITIVE_DENSITY_VERSION, year, pendingDirectives: [], protectedPlayers: [], history: [], lastAudit: null };
}

export function ensureCompetitiveDensityState(state, year = 2025) {
  const base = createCompetitiveDensityState(year);
  if (!state || typeof state !== 'object') return base;
  return {
    ...base, ...state, version: COMPETITIVE_DENSITY_VERSION, year,
    pendingDirectives: [...(state.pendingDirectives ?? [])].filter(item => (item.expiresYear ?? year) >= year).slice(-12),
    protectedPlayers: [...(state.protectedPlayers ?? [])].slice(-24),
    history: [...(state.history ?? [])].slice(-60),
  };
}

/**
 * Garante oferta de rivais, nunca vitórias. Um S+ pode dominar por anos, mas
 * não ficará sozinho por ausência estrutural de talento na geração adjacente.
 */
export function planCompetitiveDensity(players = [], year = 2025, rawState = null) {
  let state = ensureCompetitiveDensityState(rawState, year);
  const projections = players.filter(p => !p.retired && p.attrs).map(player => ({
    player, ceiling: projectedCeiling(player), peakYear: peakYear(player, year), current: overallRating(player.attrs),
  }));
  const dominants = projections.filter(item => item.ceiling >= 92 || item.current >= 92).sort((a, b) => b.ceiling - a.ceiling).slice(0, 3);
  const created = [];
  for (const dominant of dominants) {
    const existingProtection = state.pendingDirectives.filter(item => item.dominantId === dominant.player.id).length;
    const challengers = projections.filter(item =>
      item.player.id !== dominant.player.id
      && (
        item.player.competitiveDensityRole?.dominantId === dominant.player.id
        || (Math.abs(item.peakYear - dominant.peakYear) <= 4 && item.ceiling >= Math.max(86, dominant.ceiling - 8))
      )
    ).length;
    const missing = Math.max(0, Math.min(2, 2 - challengers - existingProtection));
    for (let index = 0; index < missing; index += 1) {
      const primary = challengers + existingProtection + index === 0;
      const directive = {
        id: `density:${year}:${dominant.player.id}:${existingProtection + index}`,
        dominantId: dominant.player.id,
        dominantName: dominant.player.name,
        dominantPeakYear: dominant.peakYear,
        role: primary ? 'ERA_RIVAL' : 'ERA_CHALLENGER',
        forcePotential: primary ? 'LENDA' : 'ELITE',
        targetCeiling: clamp(dominant.ceiling - (primary ? 4 : 7), primary ? 89 : 86, primary ? 92 : 89),
        createdYear: year,
        expiresYear: year + 3,
      };
      created.push(directive);
    }
  }
  state = {
    ...state,
    pendingDirectives: [...state.pendingDirectives, ...created].slice(-12),
    history: created.length ? [...state.history, { year, type: 'DENSITY_RESPONSE_PLANNED', directives: created.map(item => ({ ...item })) }].slice(-60) : state.history,
    lastAudit: { year, dominants: dominants.map(item => ({ playerId: item.player.id, name: item.player.name, ceiling: item.ceiling, peakYear: item.peakYear })), created: created.length },
  };
  return state;
}

export function consumeCompetitiveDirective(rawState, player, year = 2025) {
  const state = ensureCompetitiveDensityState(rawState, year);
  const directive = state.pendingDirectives[0] ?? null;
  if (!directive) return { state, player, directive: null };
  const target = Math.min(getPotentialCategory(player.potential).ovrCeiling, directive.targetCeiling);
  const nextPlayer = {
    ...player,
    _devState: { ...(player._devState ?? {}), ovrTarget: Math.max(Number(player._devState?.ovrTarget ?? 0), target) },
    careerTrajectory: player.careerTrajectory ? { ...player.careerTrajectory, realization: Math.max(70, Number(player.careerTrajectory.realization ?? 0)) } : player.careerTrajectory,
    competitiveDensityRole: {
      directiveId: directive.id, role: directive.role, dominantId: directive.dominantId,
      targetCeiling: target, supportExpiresYear: year + 4, guaranteesResults: false,
    },
  };
  return {
    player: nextPlayer,
    directive,
    state: {
      ...state,
      pendingDirectives: state.pendingDirectives.slice(1),
      protectedPlayers: [...state.protectedPlayers, { playerId: player.id, dominantId: directive.dominantId, directiveId: directive.id, role: directive.role, year }].slice(-24),
      history: [...state.history, { year, type: 'DENSITY_RESPONSE_MATERIALIZED', playerId: player.id, directiveId: directive.id, dominantId: directive.dominantId }].slice(-60),
    },
  };
}

export function getProjectedCompetitiveCeiling(player) { return projectedCeiling(player); }
