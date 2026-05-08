/**
 * SignaturePatterns.js
 * ─────────────────────────────────────────────────────────────────
 * FASE 6 — Signature Patterns
 *
 * Padrões táticos de 2-3 pancadas com identidade nomeada.
 * Cada jogador carrega um `signaturePattern` (key deste objeto)
 * que ativa boosts de EV quando as condições do rally batem com o trigger.
 *
 * Integração:
 *   - shotDecision.js (Phase 3) → computeStyleAffinity() aplica evBoost quando trigger ativo
 *   - NewgenSystem.js → rollSignaturePattern(styleId) atribui na geração
 *   - MatchPlanSystem.js → scoutOpponent() expõe o padrão do adversário
 *   - UnifiedPlayerProfile.jsx → exibe label + description na aba de identidade
 */

// ════════════════════════════════════════════════════════════════════
// CATÁLOGO DE PADRÕES
// ════════════════════════════════════════════════════════════════════
//
// Campos:
//   label       — nome exibido no perfil
//   trigger(sc) — função que recebe shotContext e retorna bool
//   affinity    — styleIds com afinidade primária (usados em rollSignaturePattern)
//   evBoost     — { shotType: delta } aplicado quando trigger === true
//   description — texto narrativo para profile / scouting
//   icon        — emoji para UI
//
// Notas de calibragem:
//   0.08 = sutil / 0.12 = médio / 0.18 = forte / 0.22 = muito forte
//   Triggers conservadores garantem que o boost não dispara em todo rally.
// ════════════════════════════════════════════════════════════════════

export const SIGNATURE_PATTERNS = {

  // ── SERVE + FOREHAND KILL ──────────────────────────────────────────
  // Saque aberto → forehand cruzado ou ângulo assassino no primeiro toque.
  // Ativa no 1º ou 2º golpe, com o jogador dentro da zona de ataque.
  SERVE_FH_KILL: {
    label:       'Serve + Forehand Kill',
    icon:        '🎯',
    trigger:     (sc) => sc.rallyCount <= 2 && sc.isInsideAttackZone && !sc.toughBall,
    affinity:    ['SRV_VOL', 'AGG_BASELINER', 'PWR_BASE', 'BIG_SERVER'],
    evBoost:     { FLAT: 0.12, SHORT_ANGLE: 0.10, BANANA: 0.08 },
    description: 'Saque aberto, forehand cruzado ou ângulo assassino. Dois golpes. Fim.',
  },

  // ── BACKHAND WALL ─────────────────────────────────────────────────
  // Backhand profundo cruzado construído durante o rally longo.
  // Adversário em posição (oppOut baixo) → paciência profunda vira arma.
  BH_WALL: {
    label:       'Backhand Wall',
    icon:        '🧱',
    trigger:     (sc) => sc.rallyCount > 4 && sc.oppOut < 0.25,
    affinity:    ['GRINDER', 'CTR_PUNCHER', 'RETRIEVER'],
    evBoost:     { TOPSPIN: 0.10, HEAVY_TOP: 0.14, SLICE: 0.08 },
    description: 'Backhand profundo cruzado até o adversário abrir um erro ou desistir.',
  },

  // ── SHORT-ANGLE ASSASSIN ─────────────────────────────────────────
  // Espera a bola fácil dentro da quadra e abre o ângulo impossível.
  SHORT_ANGLE_ASSASSIN: {
    label:       'Short-Angle Assassin',
    icon:        '⚡',
    trigger:     (sc) => sc.easyBall && sc.isInsideAttackZone,
    affinity:    ['TAKEALLRISK', 'TACT_TEC', 'ALL_COURT'],
    evBoost:     { SHORT_ANGLE: 0.20, BANANA: 0.14, FLAT: 0.06 },
    description: 'Espera a bola fácil e abre o ângulo impossível — sem aviso.',
  },

  // ── NET CLOSER ────────────────────────────────────────────────────
  // Toda sequência converge para a rede. TRANSITION ou NET ativam.
  NET_CLOSER: {
    label:       'Net Closer',
    icon:        '🕸️',
    trigger:     (sc) => sc.courtMode === 'TRANSITION' || sc.courtMode === 'NET',
    affinity:    ['NET_SPEC', 'SRV_VOL'],
    evBoost:     { VOLLEY: 0.12, DROP: 0.10, SLICE: 0.08 },
    description: 'Cada golpe é um passo em direção à rede. O ponto só acaba lá.',
  },

  // ── SLICE DISRUPTOR ───────────────────────────────────────────────
  // Usa o slice para quebrar ritmo quando o adversário quer jogar pesado.
  // Ativa em bola não-fácil com qualidade moderada — exatamente quando
  // o adversário espera uma resposta agressiva.
  SLICE_DISRUPTOR: {
    label:       'Slice Disruptor',
    icon:        '🌀',
    trigger:     (sc) => !sc.easyBall && sc.quality > 0.42 && sc.rallyCount > 2,
    affinity:    ['CTR_PUNCHER', 'TACT_TEC', 'ALL_COURT', 'ADPT_TAC'],
    evBoost:     { SLICE: 0.18, DROP: 0.10 },
    description: 'Slice quando o adversário quer ritmo. Interrompe, frustra, domina.',
  },

  // ── LATE-MATCH HUNTER ─────────────────────────────────────────────
  // Explode nos momentos decisivos quando está com momentum.
  // Rally médio (> 3 bolas) + momentum alto = hora de executar.
  LATE_MATCH_HUNTER: {
    label:       'Late-Match Hunter',
    icon:        '🔥',
    trigger:     (sc) => sc.momentum > 0.65 && sc.rallyCount > 3,
    affinity:    ['ADPT_TAC', 'AGG_BASELINER', 'TAKEALLRISK'],
    evBoost:     { FLAT: 0.10, BANANA: 0.10, SHORT_ANGLE: 0.12, HEAVY_TOP: 0.08 },
    description: 'Quanto maior a pressão, melhor ele joga. Momentum é combustível.',
  },

  // ── DEEP COURT GRINDER ────────────────────────────────────────────
  // Manda a bola profunda repetidamente até o adversário errar por fadiga.
  // Rally longo (> 6) + bola neutra = profundidade letal.
  DEEP_COURT_GRINDER: {
    label:       'Deep Court Grinder',
    icon:        '🏔️',
    trigger:     (sc) => sc.rallyCount > 6 && !sc.easyBall,
    affinity:    ['GRINDER', 'RETRIEVER', 'CTR_PUNCHER'],
    evBoost:     { TOPSPIN: 0.12, HEAVY_TOP: 0.10, SLICE: 0.06 },
    description: 'Profundidade absurda. Vence por exaustão — e nunca parece esforçado.',
  },

  // ── SERVE COMMANDER ───────────────────────────────────────────────
  // Dita o ritmo desde o saque. Primeiro ou segundo golpe: ataque imediato.
  // Para big servers que não precisam esperar — eles já venceram no saque.
  SERVE_COMMANDER: {
    label:       'Serve Commander',
    icon:        '🚀',
    trigger:     (sc) => sc.rallyCount <= 2 && !sc.isReturn && !sc.toughBall,
    affinity:    ['BIG_SERVER', 'SRV_VOL', 'AGG_BASELINER'],
    evBoost:     { FLAT: 0.10, TOPSPIN: 0.08, HEAVY_TOP: 0.08 },
    description: 'Cada saque é uma declaração de guerra. O ponto começa e termina no saque.',
  },
};

// ════════════════════════════════════════════════════════════════════
// MAPA DE AFINIDADE POR ESTILO
// ════════════════════════════════════════════════════════════════════
// Garante que cada styleId tenha ao menos 1-2 padrões disponíveis.
// rollSignaturePattern() sorteia do pool do estilo.

export const STYLE_PATTERN_AFFINITY = {
  AGG_BASELINER: ['SERVE_FH_KILL', 'LATE_MATCH_HUNTER', 'SERVE_COMMANDER'],
  CTR_PUNCHER:   ['BH_WALL', 'SLICE_DISRUPTOR', 'DEEP_COURT_GRINDER'],
  ALL_COURT:     ['SHORT_ANGLE_ASSASSIN', 'SLICE_DISRUPTOR'],
  SRV_VOL:       ['NET_CLOSER', 'SERVE_FH_KILL', 'SERVE_COMMANDER'],
  BIG_SERVER:    ['SERVE_FH_KILL', 'SERVE_COMMANDER'],
  RETRIEVER:     ['BH_WALL', 'DEEP_COURT_GRINDER'],
  TAKEALLRISK:   ['SHORT_ANGLE_ASSASSIN', 'LATE_MATCH_HUNTER'],
  GRINDER:       ['BH_WALL', 'DEEP_COURT_GRINDER'],
  PWR_BASE:      ['SERVE_FH_KILL', 'SERVE_COMMANDER'],
  TACT_TEC:      ['SHORT_ANGLE_ASSASSIN', 'SLICE_DISRUPTOR'],
  NET_SPEC:      ['NET_CLOSER', 'SHORT_ANGLE_ASSASSIN'],
  ADPT_TAC:      ['LATE_MATCH_HUNTER', 'SLICE_DISRUPTOR'],
};

// Fallback para styleIds sem mapeamento explícito
const _DEFAULT_POOL = Object.keys(SIGNATURE_PATTERNS);

/**
 * Sorteia um signaturePattern para um jogador baseado no seu styleId.
 * A seleção é ponderada: o primeiro da lista tem peso 2 (padrão primário),
 * os demais têm peso 1.
 *
 * @param {string} styleId
 * @returns {string} key de SIGNATURE_PATTERNS
 */
export function rollSignaturePattern(styleId) {
  const pool = STYLE_PATTERN_AFFINITY[styleId] ?? _DEFAULT_POOL;

  // Peso duplo para o padrão primário (index 0)
  const weighted = pool.length > 1
    ? [pool[0], ...pool]   // pool[0] aparece duas vezes → 2× chance
    : pool;

  return weighted[Math.floor(Math.random() * weighted.length)];
}

