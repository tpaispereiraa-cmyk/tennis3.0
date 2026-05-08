/**
 * CoachAdvisor.js
 * ─────────────────────────────────────────────────────────────────
 * FASE 5 · Inteligência em Partida — Geração de Instruções
 *
 * Recebe o snapshot de análise (CoachAnalyzer) e a filosofia do técnico,
 * e gera no máximo 2 instruções táticas priorizadas.
 *
 * Cada instrução tem:
 *   type          — INSTRUCTION_TYPES key
 *   priority      — 'HIGH' | 'MEDIUM' | 'LOW'
 *   durationGames — por quantos games a instrução é válida
 *   payload       — parâmetros usados por CoachInfluencer.js
 *   label         — texto legível para UI (changeover card)
 */

// ─────────────────────────────────────────────────────────────────
// TIPOS DE INSTRUÇÃO
// ─────────────────────────────────────────────────────────────────

export const INSTRUCTION_TYPES = {
  TARGET_SIDE:       'TARGET_SIDE',        // atacar lado específico do oponente
  DEPTH_PUSH:        'DEPTH_PUSH',         // aumentar profundidade
  AVOID_NET:         'AVOID_NET',          // priorizar passing vs rede do oponente
  EXTEND_RALLY:      'EXTEND_RALLY',       // alongar — oponente está cansando
  INTENT_LOCK:       'INTENT_LOCK',        // forçar intent em break points
  SHOT_FILTER:       'SHOT_FILTER',        // remover shot type de candidatos
  POSITIONING_HINT:  'POSITIONING_HINT',   // ajuste de posicionamento base
};

// Labels e ícones para a UI do changeover
export const INSTRUCTION_LABELS = {
  TARGET_SIDE:      'Atacar o lado fraco',
  DEPTH_PUSH:       'Jogo mais profundo',
  AVOID_NET:        'Evitar a rede do oponente',
  EXTEND_RALLY:     'Alongar os rallys',
  INTENT_LOCK:      'Fechar pontos nos momentos decisivos',
  SHOT_FILTER:      'Evitar certos golpes',
  POSITIONING_HINT: 'Ajuste de posicionamento',
};

export const INSTRUCTION_ICONS = {
  TARGET_SIDE:      '🎯',
  DEPTH_PUSH:       '📏',
  AVOID_NET:        '🛡️',
  EXTEND_RALLY:     '⏳',
  INTENT_LOCK:      '🔒',
  SHOT_FILTER:      '🚫',
  POSITIONING_HINT: '📍',
};

// Labels de filosofia para a UI
export const PHILOSOPHY_LABELS = {
  OFFENSIVE:  'Ofensivo',
  DEFENSIVE:  'Defensivo',
  COMPLETE:   'Completo',
  SPECIALIST: 'Especialista',
  MENTAL:     'Mental',
};

// ─────────────────────────────────────────────────────────────────
// GERAÇÃO DE INSTRUÇÕES
// ─────────────────────────────────────────────────────────────────

/**
 * Gera no máximo 2 instruções táticas com base na análise e filosofia.
 *
 * @param {object} analysis        — output de analyzeMatch()
 * @param {string} coachPhilosophy — 'OFFENSIVE'|'DEFENSIVE'|'COMPLETE'|'SPECIALIST'|'MENTAL'
 * @param {object} gameState       — { isBreakPoint, currentGame, currentSet }
 * @returns {Array} instruções ordenadas por prioridade (máx 2)
 */
export function generateInstructions(analysis, coachPhilosophy, gameState = {}) {
  if (!analysis) return [];

  const instructions = [];
  const phil = coachPhilosophy ?? 'COMPLETE';

  // ── 1. Atacar lado fraco ──────────────────────────────────────
  // Condição: lado identificado + taxa > 0.45 (era 0.55 — muito restritivo)
  if (analysis.oppWeakerSide && analysis.sideExploitRate > 0.45) {
    const side = analysis.oppWeakerSide;
    instructions.push({
      type:         INSTRUCTION_TYPES.TARGET_SIDE,
      priority:     'HIGH',
      durationGames: 4,
      payload:      { side },
      label:        `Continuar no ${side === 'BH' ? 'backhand' : 'forehand'} — está funcionando`,
    });
  }

  // ── 2. Evitar rede do oponente ────────────────────────────────
  // Condição: win rate >60% (era 70%) + mín 2 subidas (era 4)
  if (analysis.oppNetWinRate > 0.60 && analysis.oppNetApproaches >= 2) {
    instructions.push({
      type:         INSTRUCTION_TYPES.AVOID_NET,
      priority:     'HIGH',
      durationGames: 6,
      payload:      { boostPassing: 0.35, boostLob: 0.28 },
      label:        'Oponente domina a rede — passing e lob',
    });
  }

  // ── 3. Oponente cansando — todos os estilos agressivos pressionam ─
  // OFFENSIVE + COMPLETE + SPECIALIST reagem a stamina < 0.45 (era só OFFENSIVE < 0.50)
  if ((phil === 'OFFENSIVE' || phil === 'COMPLETE' || phil === 'SPECIALIST') && analysis.oppStaminaEst < 0.45) {
    instructions.push({
      type:         INSTRUCTION_TYPES.INTENT_LOCK,
      priority:     'MEDIUM',
      durationGames: 3,
      payload:      { forceIntent: 'FINISH', inBreakPt: false }, // aplica sempre, não só em BP
      label:        'Oponente cansando — encerrar pontos mais cedo',
    });
  }

  // ── 4. Filosofia DEFENSIVE: alongar se vence rallys longos ───
  if ((phil === 'DEFENSIVE' || phil === 'MENTAL') && analysis.preferLongRally) {
    instructions.push({
      type:         INSTRUCTION_TYPES.EXTEND_RALLY,
      priority:     'MEDIUM',
      durationGames: 4,
      payload:      { boostReset: 0.28, boostBuild: 0.20 },
      label:        'Você vence os rallys longos — seja paciente',
    });
  }

  // ── 5. Filosofia MENTAL: pressionar em break points ──────────
  if (phil === 'MENTAL' && analysis.breakPtBehavior === 'retreats') {
    instructions.push({
      type:         INSTRUCTION_TYPES.INTENT_LOCK,
      priority:     'MEDIUM',
      durationGames: 3,
      payload:      { forceIntent: 'PRESSURE', inBreakPt: true },
      label:        'Oponente recua nos momentos decisivos — aplique pressão',
    });
  }

  // ── 6. Todos os estilos: jogo mais profundo se oponente erra DTL ─
  // Abaixado para 0.35 (era só COMPLETE com 0.45)
  {
    const dtlError = analysis.oppErrorsByType?.['FLAT'] ?? 0;
    if (dtlError > 0.35) {
      instructions.push({
        type:         INSTRUCTION_TYPES.DEPTH_PUSH,
        priority:     'LOW',
        durationGames: 3,
        payload:      { boostDepth: 0.18 }, // era 0.15
        label:        'Jogue mais profundo — oponente erra no DTL',
      });
    }
  }

  // ── 7. Filosofia SPECIALIST: shot filter se oponente domina tipo específico ─
  if (phil === 'SPECIALIST') {
    const errorEntries = Object.entries(analysis.oppErrorsByType ?? {})
      .filter(([, rate]) => rate < 0.15); // shot types que o oponente quase não erra
    if (errorEntries.length > 0) {
      const [avoidType] = errorEntries[0];
      instructions.push({
        type:         INSTRUCTION_TYPES.SHOT_FILTER,
        priority:     'LOW',
        durationGames: 4,
        payload:      { avoidShotType: avoidType, evPenalty: 0.25 }, // era 0.20
        label:        `Evitar ${avoidType} — oponente não erra esse golpe`,
      });
    }
  }

  // ── Priorizar HIGH, depois MEDIUM, depois LOW — máx 2 ────────
  const priorityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
  return instructions
    .sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])
    .slice(0, 2);
}
