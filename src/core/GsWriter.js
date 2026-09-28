/**
 * GsWriter — escrita controlada no game state (gs)
 *
 * Problema: o gs é um objeto mutável compartilhado entre ~15 sistemas.
 * Qualquer sistema pode escrever qualquer campo sem aviso. Quando um campo
 * some ou tem tipo errado, o bug aparece longe da origem.
 *
 * Solução:
 *   - GS_SCHEMA declara TODOS os campos públicos do gs e quem os possui.
 *   - writeGs() avisa em dev se alguém escreve em campo não declarado.
 *   - writeGsBatch() agrupa múltiplos writes (reduz chamadas, documenta intenção).
 *   - Em produção: zero overhead (sem Proxy, sem typeof checks).
 *
 * Uso:
 *   import { writeGs, writeGsBatch } from '../../core/GsWriter.js';
 *   writeGs(gs, '_pendingServeData', data, 'ServeEngine');
 *   writeGsBatch(gs, { serveBounced: false, receiverTouched: false }, 'ServeEngine');
 */

// ---------------------------------------------------------------------------
// Schema — campo → sistema dono
// Adicione aqui antes de escrever em qualquer campo novo do gs.
// ---------------------------------------------------------------------------
export const GS_SCHEMA = Object.freeze({
  // ── Serve ─────────────────────────────────────────────────────────────────
  _pendingServeData:        'ServeEngine',
  _servePatternHistory:     'ServeEngine',
  _serveAdvantageContext:   'ReturnEngine',
  lastServeFirst:           'ServeEngine',
  serveBounced:             'ServeEngine',
  receiverTouched:          'ServeEngine',
  isFirstBounce:            'ServeEngine',

  // ── Bola / Física ─────────────────────────────────────────────────────────
  ball:                     'PhysicsEngine',

  // ── Jogadores ─────────────────────────────────────────────────────────────
  players:                  'MovementSystem',

  // ── Match / Ponto ─────────────────────────────────────────────────────────
  server:                   'MatchEngine',
  receiver:                 'MatchEngine',
  serveLeft:                'MatchEngine',
  score:                    'MatchEngine',
  phase:                    'MatchEngine',
  _currentPointId:          'MatchEngine',
  pointHistory:             'MatchEngine',

  // ── AI / Rally ────────────────────────────────────────────────────────────
  rallyPressure:            'AISystem',
  momentum:                 'AISystem',

  // ── Torneio / Carreira ────────────────────────────────────────────────────
  matchResult:              'TournamentSystem',
  statsSnapshot:            'TournamentSystem',
});

// ---------------------------------------------------------------------------
// Detecção de ambiente dev
// Compatível com Vite (import.meta.env.DEV) e Node (process.env.NODE_ENV).
// ---------------------------------------------------------------------------
const _isDev = (() => {
  try { if (import.meta.env?.DEV) return true; } catch (_) {}
  try { if (process.env?.NODE_ENV === 'development') return true; } catch (_) {}
  return false;
})();

// ---------------------------------------------------------------------------
// API pública
// ---------------------------------------------------------------------------

/**
 * Escreve um campo no gs com validação de schema em dev.
 *
 * @param {object}  gs      — game state
 * @param {string}  field   — nome do campo
 * @param {*}       value   — valor a escrever
 * @param {string}  [caller] — nome do sistema chamador (para o aviso)
 * @returns {object} gs (para encadeamento fluente, se necessário)
 */
export function writeGs(gs, field, value, caller) {
  if (_isDev && !Object.prototype.hasOwnProperty.call(GS_SCHEMA, field)) {
    const who = caller ? ` (chamado por: ${caller})` : '';
    console.warn(
      `[GsWriter] Campo desconhecido "${field}"${who}. ` +
      `Adicione-o em GS_SCHEMA antes de usar.`
    );
  }
  gs[field] = value;
  return gs;
}

/**
 * Escreve múltiplos campos de uma vez.
 * Preferível ao encadeamento de writeGs quando há 3+ campos.
 *
 * @param {object}         gs      — game state
 * @param {Record<string,*>} updates — mapa campo→valor
 * @param {string}         [caller] — nome do sistema chamador
 * @returns {object} gs
 */
export function writeGsBatch(gs, updates, caller) {
  for (const [field, value] of Object.entries(updates)) {
    writeGs(gs, field, value, caller);
  }
  return gs;
}
