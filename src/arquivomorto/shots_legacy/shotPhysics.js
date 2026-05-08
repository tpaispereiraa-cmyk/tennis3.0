// shotPhysics.js — adaptador fino para o novo blueprint central de shots
// ============================================================================
// A lógica antiga ainda consome `SHOT_PHYSICS` e `SPIN_MAP`.
// Nesta fase, estes exports passam a ser derivados do `SHOTS_CONFIG.js`.
// Assim o projeto preserva compatibilidade enquanto a fonte de verdade fica
// centralizada num arquivo só.
// ============================================================================

import {
  SHOT_ALIASES,
  SHOTS_CONFIG,
  getShotBlueprint,
  getShotPhysicsEnvelope,
  getShotSpinTipo,
} from '../../config/SHOTS_CONFIG.js';

function criarMapaFisica() {
  const tipos = new Set([
    ...Object.keys(SHOTS_CONFIG).filter(k => k !== '_DEFAULT'),
    ...Object.keys(SHOT_ALIASES),
    'DROP2',
  ]);
  const mapa = {};
  for (const tipo of tipos) {
    mapa[tipo] = getShotPhysicsEnvelope(tipo);
  }
  return Object.freeze(mapa);
}

function criarMapaSpin() {
  const tipos = new Set([...Object.keys(SHOT_PHYSICS), 'NORMAL', 'SHORT']);
  const mapa = {};
  for (const tipo of tipos) {
    mapa[tipo] = getShotSpinTipo(tipo);
  }
  return Object.freeze(mapa);
}

export const SHOT_PHYSICS = criarMapaFisica();

// Helper: este mapa existe para o restante do runtime continuar funcionando
// sem saber que o spin type agora nasce do blueprint central.
export const SPIN_MAP = criarMapaSpin();

// Helper: aliases explícitos para trace, UI legado e compatibilidade de logs.
export const LEGACY_TO_NEW = Object.freeze({
  ...SHOT_ALIASES,
  HALF_VOLLEY: 'HALF_VOLLEY',
  DROP2: 'DROP',
});

export function getShotPhysics(shotType) {
  return getShotPhysicsEnvelope(shotType) ?? getShotPhysicsEnvelope('TOPSPIN');
}

