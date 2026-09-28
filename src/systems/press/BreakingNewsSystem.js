/**
 * Fachada de compatibilidade. O antigo gerador aleatório foi substituído pelo
 * Circuit Shock, mas estes nomes continuam estáveis para saves, torneios e UI.
 */
import {
  closeCircuitShockSeason,
  isCircuitShockUnavailable,
  migrateShockPlayer,
  runCircuitShockPulse,
  tickPlayerShock,
} from './circuitShock/CircuitShockSystem.js';

export function migrateBreakingNewsState(player, year = 2025) {
  return migrateShockPlayer(player, year);
}

export function maybeTriggerBreakingNews(players, year, state = {}, context = {}) {
  return runCircuitShockPulse(players, year, state, context);
}

export function tickBreakingNews(player, context = {}) {
  return tickPlayerShock(player, context);
}

export function processBreakingNewsSeasonClose(players, seasonYear) {
  return closeCircuitShockSeason(players, seasonYear);
}

export function isPlayerUnavailableForTournament(player) {
  return isCircuitShockUnavailable(player);
}
