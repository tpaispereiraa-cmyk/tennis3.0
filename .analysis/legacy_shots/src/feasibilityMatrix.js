// feasibilityMatrix.js — Camada 2 do ATP Shot Engine
// ═══════════════════════════════════════════════════════════════════════
// Define quais shots são FISICAMENTE EXECUTÁVEIS dado o Contact Space.
//
// PRINCÍPIO: a Feasibility Matrix não é tática.
//   Ela não sabe se DTL seria uma boa ideia.
//   Ela responde apenas: "Com este contato, este swing, pode executar este shot?"
//   Se não — o shot simplesmente não é candidato. Sem penalidade, sem override.
//
// Substitui os flags allowSlice / allowFlat / allowDrop / allowHeavy
// do sistema de shot legacy — substituído pelo shotPhysics.js (v4).
//
// Para cada shot viável: retorna maxQuality (teto de q neste contexto).
// maxQuality = min(heightQ, offsetQ, globalMaxQ)
//
// Consumido por:
//   shotDecision.js (Phase 3) usará estes dados
//   game.js (tryHit) — armazenado em player._feasibilityMatrix
// ═══════════════════════════════════════════════════════════════════════

import { OFFSET_Q_MULT } from './contactSpace.js';
import { clamp } from './math.js';

// ── Nível numérico de cada swing (para comparação de requisito mínimo) ────────
const SWING_LEVEL = { REFLEX: 0, BLOCKED: 1, COMPACT: 2, FULL: 3 };

// ── Nível numérico de cada offset zone (para comparação de limite máximo) ─────
const OFFSET_LEVEL = { IDEAL: 0, REACHABLE: 1, STRETCH: 2, EXTREME: 3 };

// ── Regras de viabilidade por shot ────────────────────────────────────────────
// heightsAllowed : zonas de altura onde o shot é executável
// swingMinLevel  : swing mínimo necessário (REFLEX=0, BLOCKED=1, COMPACT=2, FULL=3)
// offsetMaxLevel : offset máximo permitido (IDEAL=0, REACHABLE=1, STRETCH=2, EXTREME=3)
// globalMaxQ     : teto absoluto de qualidade para este shot (independente de zona)
// heightQMap     : teto de qualidade por zona de altura (refinamento físico)
//
// Referência ATP (dados de biomecânica e estatística):
//   FLAT winner: 130–185km/h, requer zona SWEET/HIP+, sem offset extremo
//   TOPSPIN: 90–155km/h, funciona de quase qualquer zona, offset até STRETCH
//   HEAVY_TOP: exige FULL swing (backswing completo + rotação de ombros)
//   SLICE: funciona baixo, não precisa de muito swing
//   DROP: exige FULL + zona SWEET/HIP (toque preciso, não dá com offset extremo)
//   BANANA: exige FULL + zona ideal (sem offset — ângulo extremo precisa de tudo certo)
//   HALF_VOLLEY: apenas DIRT/ANKLE — bloqueio imediato após quique
//   VOLLEY: sem quique, altura variada, swing mínimo BLOCKED
//   LOB_ATK: zona SWEET/SHOULDER — lob de ataque com lift alto
//   LOB_DEF: emergência — zona baixa a média, reflex aceitável
//   SMASH: bola alta, compact swing suficiente (ritmo do body turn)
//   PASSING: similar a TOPSPIN/FLAT mas com ângulo lateral
//   SHORT_ANGLE: exige FULL + zona ideal (ângulo extremo = máximo controle)
//   SLICE_SHORT: slice curto, exige COMPACT, zona HIP+

const SHOT_RULES = {
  // ── Groundstrokes básicos ────────────────────────────────────────────────
  NORMAL: {
    // Golpe de rally neutro — o mais comum do jogo. Permissivo por design.
    heightsAllowed: ['DIRT', 'ANKLE', 'HIP', 'SWEET', 'SHOULDER', 'HIGH'],
    swingMinLevel:  0,         // REFLEX — até em emergência se bate NORMAL
    offsetMaxLevel: 3,         // EXTREME
    globalMaxQ:     1.00,
    heightQMap: { DIRT: 0.55, ANKLE: 0.72, HIP: 0.88, SWEET: 1.00, SHOULDER: 0.85, HIGH: 0.65 },
  },

  NORMAL: {
    // Golpe base — absorve papel do antigo SAFE (sempre executável) e NORMAL
    heightsAllowed: ['DIRT', 'ANKLE', 'HIP', 'SWEET', 'SHOULDER', 'HIGH', 'OVERHEAD'],
    swingMinLevel:  0,         // REFLEX
    offsetMaxLevel: 3,         // EXTREME
    globalMaxQ:     0.92,
    heightQMap: { DIRT: 0.58, ANKLE: 0.72, HIP: 0.86, SWEET: 0.92, SHOULDER: 0.82, HIGH: 0.68, OVERHEAD: 0.52 },
  },

  SHORT: {
    // Reset curto — exige algum controle mas é golpe defensivo
    heightsAllowed: ['ANKLE', 'HIP', 'SWEET', 'SHOULDER'],
    swingMinLevel:  0,         // REFLEX
    offsetMaxLevel: 2,         // STRETCH
    globalMaxQ:     0.88,
    heightQMap: { ANKLE: 0.68, HIP: 0.82, SWEET: 0.88, SHOULDER: 0.75 },
  },

  FLAT: {
    heightsAllowed: ['HIP', 'SWEET', 'SHOULDER', 'HIGH'],
    swingMinLevel:  2,         // COMPACT
    offsetMaxLevel: 1,         // REACHABLE
    globalMaxQ:     0.96,
    heightQMap: { HIP: 0.78, SWEET: 0.96, SHOULDER: 0.88, HIGH: 0.70 },
  },

  TOPSPIN: {
    heightsAllowed: ['DIRT', 'ANKLE', 'HIP', 'SWEET', 'SHOULDER'],
    swingMinLevel:  0,         // REFLEX — topspin defensivo de emergência é padrão ATP (Murray, Djokovic, Alcaraz)
    offsetMaxLevel: 2,         // STRETCH
    globalMaxQ:     1.00,
    heightQMap: { DIRT: 0.45, ANKLE: 0.72, HIP: 0.88, SWEET: 1.00, SHOULDER: 0.85 },
  },

  HEAVY_TOP: {
    heightsAllowed: ['HIP', 'SWEET', 'SHOULDER'],
    swingMinLevel:  3,         // FULL — backswing + rotação completa obrigatórios
    offsetMaxLevel: 1,         // REACHABLE
    globalMaxQ:     1.00,
    heightQMap: { HIP: 0.75, SWEET: 1.00, SHOULDER: 0.82 },
  },

  SLICE: {
    heightsAllowed: ['DIRT', 'ANKLE', 'HIP', 'SWEET'],
    swingMinLevel:  0,         // REFLEX — chip defensivo funciona mesmo em emergência
    offsetMaxLevel: 2,         // STRETCH
    globalMaxQ:     0.92,
    heightQMap: { DIRT: 0.68, ANKLE: 0.88, HIP: 0.90, SWEET: 0.92 },
  },

  DROP: {
    // Drop shot — zona ideal HIP/SWEET mas ANKLE possível com penalidade
    heightsAllowed: ['ANKLE', 'HIP', 'SWEET'],
    swingMinLevel:  2,         // COMPACT — Nadal faz drop de qualquer zona
    offsetMaxLevel: 1,         // REACHABLE
    globalMaxQ:     0.85,
    heightQMap: { ANKLE: 0.55, HIP: 0.72, SWEET: 0.85 },
  },

  BANANA: {
    heightsAllowed: ['HIP', 'SWEET', 'SHOULDER'],
    swingMinLevel:  3,         // FULL — geração de spin lateral exige rotação completa
    offsetMaxLevel: 1,         // REACHABLE
    globalMaxQ:     0.88,
    heightQMap: { HIP: 0.72, SWEET: 0.88, SHOULDER: 0.80 },
  },

  ACCEL: {
    // Drive agressivo. ANKLE permite ataque com bolas mais baixas (ATP moderno).
    heightsAllowed: ['ANKLE', 'HIP', 'SWEET', 'SHOULDER'],
    swingMinLevel:  1,         // BLOCKED — Federer, Djokovic atacam de bolas baixas rotineiramente
    offsetMaxLevel: 1,         // REACHABLE — offset extremo não gera potência
    globalMaxQ:     1.00,
    heightQMap: { ANKLE: 0.60, HIP: 0.80, SWEET: 1.00, SHOULDER: 0.88 },
  },

  SHORT_ACCEL: {
    // Ângulo curto — requer controle. ANKLE permitido com penalidade.
    heightsAllowed: ['ANKLE', 'HIP', 'SWEET', 'SHOULDER'],
    swingMinLevel:  1,         // BLOCKED
    offsetMaxLevel: 1,         // REACHABLE
    globalMaxQ:     0.95,
    heightQMap: { ANKLE: 0.55, HIP: 0.78, SWEET: 0.95, SHOULDER: 0.84 },
  },

  HALF_VOLLEY: {
    heightsAllowed: ['DIRT', 'ANKLE'],
    swingMinLevel:  0,         // REFLEX — é uma reação pura pós-quique
    offsetMaxLevel: 2,         // STRETCH
    globalMaxQ:     0.70,
    heightQMap: { DIRT: 0.52, ANKLE: 0.70 },
  },

  VOLLEY: {
    heightsAllowed: ['ANKLE', 'HIP', 'SWEET', 'SHOULDER', 'HIGH'],
    swingMinLevel:  1,         // BLOCKED — punch/block sem backswing
    offsetMaxLevel: 1,         // REACHABLE
    globalMaxQ:     0.95,
    heightQMap: { ANKLE: 0.72, HIP: 0.85, SWEET: 0.95, SHOULDER: 0.90, HIGH: 0.78 },
  },

  SMASH: {
    heightsAllowed: ['HIGH', 'OVERHEAD'],
    swingMinLevel:  2,         // COMPACT — rotação de ombros + ritmo
    offsetMaxLevel: 1,         // REACHABLE
    globalMaxQ:     1.00,
    heightQMap: { HIGH: 0.90, OVERHEAD: 1.00 },
  },

  PASSING: {
    heightsAllowed: ['HIP', 'SWEET', 'SHOULDER'],
    swingMinLevel:  2,         // COMPACT
    offsetMaxLevel: 2,         // STRETCH — passing às vezes vem de bola lateral
    globalMaxQ:     0.92,
    heightQMap: { HIP: 0.80, SWEET: 0.92, SHOULDER: 0.82 },
  },

  SHORT_ANGLE: {
    heightsAllowed: ['SWEET', 'SHOULDER'],
    swingMinLevel:  3,         // FULL — ângulo extremo exige swing completo
    offsetMaxLevel: 1,         // REACHABLE
    globalMaxQ:     0.88,
    heightQMap: { SWEET: 0.88, SHOULDER: 0.78 },
  },

  // ── Lobs — nomes reais do sistema ────────────────────────────────────────
  AGG_LOB: {
    heightsAllowed: ['SWEET', 'SHOULDER'],
    swingMinLevel:  2,         // COMPACT
    offsetMaxLevel: 1,         // REACHABLE
    globalMaxQ:     0.82,
    heightQMap: { SWEET: 0.82, SHOULDER: 0.72 },
  },

  DEF_LOB: {
    heightsAllowed: ['ANKLE', 'HIP', 'SWEET'],
    swingMinLevel:  0,         // REFLEX — defensivo de emergência
    offsetMaxLevel: 2,         // STRETCH
    globalMaxQ:     0.75,
    heightQMap: { ANKLE: 0.62, HIP: 0.72, SWEET: 0.75 },
  },

  // LOB — nome real usado pelo pool de golpes (AGG_LOB/DEF_LOB são legados)
  LOB: {
    heightsAllowed: ['DIRT', 'ANKLE', 'HIP', 'SWEET', 'SHOULDER'],
    swingMinLevel:  0,         // REFLEX — lob defensivo funciona de emergência
    offsetMaxLevel: 3,         // EXTREME
    globalMaxQ:     0.82,
    heightQMap: { DIRT: 0.55, ANKLE: 0.65, HIP: 0.75, SWEET: 0.82, SHOULDER: 0.72 },
  },

  // Legacy aliases — nunca gerados pelo sistema atual mas mantidos por segurança
  LOB_ATK: {
    heightsAllowed: ['SWEET', 'SHOULDER'],
    swingMinLevel:  2,
    offsetMaxLevel: 1,
    globalMaxQ:     0.82,
    heightQMap: { SWEET: 0.82, SHOULDER: 0.72 },
  },

  LOB_DEF: {
    heightsAllowed: ['ANKLE', 'HIP', 'SWEET'],
    swingMinLevel:  0,
    offsetMaxLevel: 2,
    globalMaxQ:     0.75,
    heightQMap: { ANKLE: 0.62, HIP: 0.72, SWEET: 0.75 },
  },
};

/**
 * Constrói a Feasibility Matrix para o Contact Space atual.
 *
 * @param {string} heightZone  — de computeContactSpace() (ex: 'SWEET')
 * @param {string} offsetZone  — de computeContactSpace() (ex: 'REACHABLE')
 * @param {string} swingType   — de computeSwingPrep() (ex: 'FULL')
 * @returns {FeasibilityMatrix}
 */
export function buildFeasibilityMatrix(heightZone, offsetZone, swingType) {
  const currentSwingLevel  = SWING_LEVEL[swingType]  ?? 0;
  const currentOffsetLevel = OFFSET_LEVEL[offsetZone] ?? 3;
  const offsetQMult        = OFFSET_Q_MULT[offsetZone] ?? 0.50;

  const data = {};

  for (const [shotType, rule] of Object.entries(SHOT_RULES)) {
    // Critério 1: zona de altura permitida?
    const heightOk = rule.heightsAllowed.includes(heightZone);

    // Critério 2: swing disponível suficiente?
    const swingOk = currentSwingLevel >= rule.swingMinLevel;

    // Critério 3: offset dentro do limite do shot?
    const offsetOk = currentOffsetLevel <= rule.offsetMaxLevel;

    const feasible = heightOk && swingOk && offsetOk;

    if (!feasible) {
      data[shotType] = { feasible: false, maxQuality: 0 };
      continue;
    }

    // maxQuality: produto de teto de altura × multiplicador de offset, cap em globalMaxQ
    const heightQ  = rule.heightQMap[heightZone] ?? 0;
    const maxQ     = Math.min(rule.globalMaxQ, heightQ * offsetQMult);

    data[shotType] = { feasible: true, maxQuality: clamp(maxQ, 0, 1) };
  }

  return {
    /**
     * Retorna true se o shot é fisicamente viável no contexto atual.
     * @param {string} shotType
     */
    isViable: (shotType) => data[shotType]?.feasible ?? true,  // desconhecido = permitido

    /**
     * Retorna o teto máximo de qualidade para o shot neste contexto.
     * Retorna 0 se o shot não for viável.
     * @param {string} shotType
     */
    getMaxQuality: (shotType) => data[shotType]?.maxQuality ?? 0,

    /**
     * Retorna array com todos os shot types viáveis.
     */
    getViableShots: () => Object.keys(data).filter(k => data[k].feasible),

    /** Dados completos para debug/trace. */
    _data:      data,
    heightZone,
    offsetZone,
    swingType,
  };
}

/**
 * Gera os flags de contexto físico para shotDecision.js (Phase 3).
 * Substitui os flags inline (allowSlice, allowFlat, etc.) preservando
 * total backward-compatibility enquanto usa física real por baixo.
 *
 * @param {Object} fm         — resultado de buildFeasibilityMatrix()
 * @param {string} heightZone — para checar kill zone / ankle zone
 * @returns {{
 *   isKillZone:  boolean,  // OVERHEAD → só smash/lob especial
 *   isAnkleZone: boolean,  // ANKLE/DIRT → só slice/half-volley
 *   allowSlice:  boolean,
 *   allowDrop:   boolean,
 *   allowFlat:   boolean,
 *   allowHeavy:  boolean,
 * }}
 */
export function getLegacyCompatFlags(fm, heightZone) {
  return {
    // OVERHEAD = antiga 'KILL' zone (bz > 1.8 no sistema antigo)
    // Agora mais preciso: apenas bolas acima de 2.20m ativam smash obrigatório
    isKillZone:  heightZone === 'OVERHEAD',

    // ANKLE ou DIRT = antiga 'ANKLE' zone (bz < 0.40)
    // Agora mais preciso: cobre as zonas baixas reais
    isAnkleZone: heightZone === 'ANKLE' || heightZone === 'DIRT',

    // Flags de permissão por tipo de shot — agora baseados em física real
    allowSlice: fm.isViable('SLICE'),
    allowDrop:  fm.isViable('DROP'),
    allowFlat:  fm.isViable('FLAT'),
    allowHeavy: fm.isViable('HEAVY_TOP'),
  };
}
