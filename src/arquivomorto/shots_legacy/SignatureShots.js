/**
 * SignatureShots.js — Sistema de Golpes Assinatura v2
 * ─────────────────────────────────────────────────────────────────
 * 32 signatures organizados por arma real do jogador.
 * Cada um é uma versão melhorada de um golpe base — não magia,
 * mas aquele golpe específico executado no nível mais alto do jogador.
 *
 * Campos:
 *   label         — nome exibido na pill do ME
 *   emoji         — ícone da pill
 *   baseType      — shot type compatível (TOPSPIN, SLICE, DROP, ACCEL, etc.)
 *   wing          — 'FH' | 'BH' | 'BOTH' | 'SERVE' | 'NET' | 'ANY'
 *   description   — texto para perfil/scouting
 *   attrThreshold — atributos mínimos do jogador
 *   activationBase— chance base de ativar (0.25–0.40: ativa com frequência real)
 *   physics       — overrides físicos aplicados ao shot
 */

export const SIGNATURE_SHOTS = {

  // ══════════════════════════════════════════════════════════════════
  // FOREHAND
  // ══════════════════════════════════════════════════════════════════

  FH_TOPSPIN_CROSS: {
    label: 'FH TOPSPIN CRUZADO',
    emoji: '🌀',
    baseType: 'TOPSPIN',
    wing: 'FH',
    description: 'Topspin cruzado com quique mais alto e desvio lateral — sai do alcance após o quique.',
    attrThreshold: { fhPotencia: 72, topspin: 70 },
    activationBase: 0.32,
    physics: {
      pow: 1.05,
      spinFnMult: 1.70,
      spinZ: 0.40,
      depthRange: [0.68, 0.84],
      bounce: 1.50,
      bounceSpin: 1.80,
      curve: 0.50,
      targetXBias: 'CROSS',
      riskMult: 1.10,
    },
  },

  FH_TOPSPIN_DTL: {
    label: 'FH PARALELO',
    emoji: '🔦',
    baseType: 'TOPSPIN',
    wing: 'FH',
    description: 'DTL pesado com penetração máxima — pouca curva, muito peso após o quique.',
    attrThreshold: { fhPotencia: 75, topspin: 65 },
    activationBase: 0.30,
    physics: {
      pow: 1.12,
      spinFnMult: 1.30,
      spinZ: 0.08,
      depthRange: [0.74, 0.90],
      bounce: 1.25,
      bounceSpin: 1.20,
      targetXBias: 'DTL',
      riskMult: 1.15,
    },
  },

  FH_INSIDE_OUT: {
    label: 'FH INSIDE-OUT',
    emoji: '🔄',
    baseType: 'TOPSPIN',
    wing: 'FH',
    description: 'Inside-out clássico: FH batido do lado BH com direção cross extremo.',
    attrThreshold: { fhPotencia: 78, visaoTatica: 70 },
    activationBase: 0.28,
    physics: {
      pow: 1.08,
      spinFnMult: 1.40,
      spinZ: 0.55,
      depthRange: [0.62, 0.80],
      bounce: 1.30,
      bounceSpin: 1.60,
      curve: 0.60,
      targetXBias: 'CROSS',
      riskMult: 1.18,
    },
  },

  FH_FLAT_BOMB: {
    label: 'FH PLANO',
    emoji: '💥',
    baseType: 'ACCEL',
    wing: 'FH',
    description: 'Flat de máxima velocidade, arco rasante — o canhão do FH.',
    attrThreshold: { fhPotencia: 82 },
    activationBase: 0.28,
    physics: {
      pow: 1.30,
      spinFnMult: 0.30,
      spinZ: 0.05,
      depthRange: [0.78, 0.92],
      bounce: 1.20,
      bounceSpin: 0.50,
      riskMult: 1.20,
    },
  },

  FH_SHORT_ANGLE: {
    label: 'FH NGULO CURTO',
    emoji: '📐',
    baseType: 'SHORT_ACCEL',
    wing: 'FH',
    description: 'Short-angle ofensivo: cai na meia-quadra, sai perpendicular à rede.',
    attrThreshold: { fhControle: 76, leitura: 70 },
    activationBase: 0.26,
    physics: {
      pow: 0.88,
      spinFnMult: 1.50,
      spinZ: 0.50,
      depthRange: [0.32, 0.50],
      bounce: 0.85,
      bounceSpin: 1.30,
      targetXBias: 'WIDE',
      riskMult: 1.22,
    },
  },

  FH_BANANA_CROSS: {
    label: 'FH BANANA CRUZADO',
    emoji: '🍌',
    baseType: 'BANANA',
    wing: 'FH',
    description: 'Forehand inside-out com sidespin extremo — a bola curva para dentro da quadra após a rede e foge no quique.',
    attrThreshold: { fhPotencia: 70, topspin: 75 },
    activationBase: 0.26,
    physics: {
      pow: 1.10,
      spinFnMult: 2.20,
      spinZ: 0.55,
      depthRange: [0.62, 0.82],
      bounce: 1.40,
      bounceSpin: 2.00,
      curve: 0.80,
      targetXBias: 'CROSS',
      riskMult: 1.20,
    },
  },

  FH_KICK: {
    label: 'FH KICK',
    emoji: '🦵',
    baseType: 'TOPSPIN',
    wing: 'FH',
    description: 'Topspin com arco alto — a bola sobe para o ombro/cabeça forçando erro.',
    attrThreshold: { topspin: 78, fhPotencia: 68 },
    activationBase: 0.30,
    physics: {
      pow: 0.88,
      spinFnMult: 2.10,
      spinZ: 0.12,
      depthRange: [0.70, 0.86],
      bounce: 1.90,
      bounceSpin: 2.20,
      arcBoost: 1.6,
      riskMult: 1.12,
    },
  },

  FH_REVERSE: {
    label: 'FH INVERTIDO',
    emoji: '🌪️',
    baseType: 'TOPSPIN',
    wing: 'FH',
    description: 'Pulso invertido — spin contrário ao esperado, desvio imprevisível no quique.',
    attrThreshold: { fhPotencia: 84, topspin: 82, leitura: 76 },
    activationBase: 0.22,
    physics: {
      pow: 0.92,
      spinFnMult: 1.80,
      spinZ: -0.65,
      depthRange: [0.60, 0.76],
      bounce: 1.10,
      bounceSpin: 1.70,
      targetXBias: 'DTL',
      riskMult: 1.28,
    },
  },

  // ══════════════════════════════════════════════════════════════════
  // BACKHAND
  // ══════════════════════════════════════════════════════════════════

  BH_TOPSPIN_CROSS: {
    label: 'BH TOPSPIN CRUZADO',
    emoji: '🌀',
    baseType: 'TOPSPIN',
    wing: 'BH',
    description: 'BH cross com spin pesado — especialidade de Djokovic/Agassi.',
    attrThreshold: { bhPotencia: 70, topspin: 68 },
    activationBase: 0.32,
    physics: {
      pow: 1.05,
      spinFnMult: 1.65,
      spinZ: 0.38,
      depthRange: [0.66, 0.82],
      bounce: 1.45,
      bounceSpin: 1.70,
      curve: 0.45,
      targetXBias: 'CROSS',
      riskMult: 1.10,
    },
  },

  BH_BULLET_DTL: {
    label: 'BH PARALELO',
    emoji: '🔫',
    baseType: 'ACCEL',
    wing: 'BH',
    description: 'A bala de BH — DTL plano com penetração máxima. A arma de Wawrinka.',
    attrThreshold: { bhPotencia: 78, bhControle: 68 },
    activationBase: 0.28,
    physics: {
      pow: 1.20,
      spinFnMult: 0.60,
      spinZ: 0.08,
      depthRange: [0.76, 0.92],
      bounce: 1.30,
      bounceSpin: 0.80,
      targetXBias: 'DTL',
      riskMult: 1.22,
    },
  },

  BH_SLICE_DEEP: {
    label: 'BH SLICE PROFUNDO',
    emoji: '🔪',
    baseType: 'SLICE',
    wing: 'BH',
    description: 'Backspin com quique rasteiro e profundo — mantém o adversário longe.',
    attrThreshold: { bhControle: 72, slice: 70 },
    activationBase: 0.32,
    physics: {
      pow: 0.82,
      spinFnMult: 1.80,
      spinZ: 0.15,
      depthRange: [0.72, 0.88],
      bounce: 0.28,
      bounceSpin: 0.25,
      riskMult: 1.08,
    },
  },

  BH_SLICE_SHORT: {
    label: 'BH SLICE CURTO',
    emoji: '🗡️',
    baseType: 'DROP',
    wing: 'BH',
    description: 'Slice que cai na meia-quadra com quique mínimo — obriga o adversário a avançar.',
    attrThreshold: { bhControle: 74, slice: 68 },
    activationBase: 0.28,
    physics: {
      pow: 0.72,
      spinFnMult: 2.00,
      spinZ: 0.22,
      depthRange: [0.12, 0.26],  // 1.4–3.1m da rede — slice curto real
      netClearance: 0.08,         // passa baixo, rasante
      bounce: 0.20,
      bounceSpin: 0.18,
      riskMult: 1.14,
    },
  },

  BH_LIFT: {
    label: 'BH LIFT',
    emoji: '🌕',
    baseType: 'TOPSPIN',
    wing: 'BH',
    description: 'BH com arco alto e spin pesado — moonball de BH que força erro no ombro.',
    attrThreshold: { topspin: 72, bhControle: 68 },
    activationBase: 0.30,
    physics: {
      pow: 0.82,
      spinFnMult: 1.80,
      spinZ: 0.10,
      depthRange: [0.76, 0.90],
      bounce: 1.70,
      bounceSpin: 1.90,
      arcBoost: 1.8,
      riskMult: 1.10,
    },
  },

  BH_FLAT: {
    label: 'BH PLANO',
    emoji: '⚡',
    baseType: 'TOPSPIN',
    wing: 'BH',
    description: 'BH flat rápido, pouco spin — surpreende por ser diferente do padrão topspin.',
    attrThreshold: { bhPotencia: 74, bhControle: 65 },
    activationBase: 0.26,
    physics: {
      pow: 1.18,
      spinFnMult: 0.35,
      spinZ: 0.05,
      depthRange: [0.72, 0.88],
      bounce: 1.15,
      bounceSpin: 0.45,
      riskMult: 1.16,
    },
  },

  BH_CHIP_CHARGE: {
    label: 'CHIP & CHARGE',
    emoji: '⚔️',
    baseType: 'SLICE',
    wing: 'BH',
    description: 'Slice de BH curto + subida imediata à rede — padrão grama clássico.',
    attrThreshold: { slice: 72, volley: 68 },
    activationBase: 0.26,
    physics: {
      pow: 0.72,
      spinFnMult: 1.60,
      spinZ: 0.20,
      depthRange: [0.28, 0.44],
      bounce: 0.30,
      bounceSpin: 0.22,
      riskMult: 1.12,
    },
  },

  // ══════════════════════════════════════════════════════════════════
  // SAQUE
  // ══════════════════════════════════════════════════════════════════

  SERVE_FLAT_BOMB: {
    label: 'SAQUE EXPLOSIVO',
    emoji: '💣',
    baseType: 'SERVE',
    wing: 'SERVE',
    description: 'Velocidade acima do normal, pouco spin — ace power puro.',
    attrThreshold: { saqueForca: 78 },
    activationBase: 0.30,
    physics: {
      pow: 1.32,
      spinFnMult: 0.35,
      spinZ: 0.05,
      depthRange: [0.82, 0.96],
      bounce: 1.12,
      bounceSpin: 0.50,
      riskMult: 1.18,
    },
  },

  SERVE_KICK_HIGH: {
    label: 'KICK ALTO',
    emoji: '🚀',
    baseType: 'SERVE',
    wing: 'SERVE',
    description: 'Kick com quique altíssimo, sai para o ombro — destrói backhand fraco.',
    attrThreshold: { saqueForca: 70, topspin: 55 },
    activationBase: 0.32,
    physics: {
      pow: 0.85,
      spinFnMult: 2.50,
      spinZ: 0.28,
      depthRange: [0.72, 0.86],
      bounce: 2.40,
      bounceSpin: 2.80,
      riskMult: 1.10,
    },
  },

  SERVE_SLICE_WIDE: {
    label: 'SLICE WIDE',
    emoji: '🐍',
    baseType: 'SERVE',
    wing: 'SERVE',
    description: 'Slice com curvatura extrema que expulsa o adversário para fora da quadra.',
    attrThreshold: { saquePrecisao: 72, slice: 60 },
    activationBase: 0.30,
    physics: {
      pow: 0.90,
      spinFnMult: 1.80,
      spinZ: 0.92,
      depthRange: [0.65, 0.80],
      bounce: 0.75,
      bounceSpin: 0.80,
      curve: 1.00,
      targetXBias: 'WIDE',
      riskMult: 1.14,
    },
  },

  SERVE_JAM_BODY: {
    label: 'SAQUE NO CORPO',
    emoji: '🎯',
    baseType: 'SERVE',
    wing: 'SERVE',
    description: 'Flat direto no corpo, sem espaço — o "jam" que bloqueia o retorno.',
    attrThreshold: { saquePrecisao: 74, visaoTatica: 68 },
    activationBase: 0.30,
    physics: {
      pow: 1.10,
      spinFnMult: 0.55,
      spinZ: 0.05,
      depthRange: [0.80, 0.94],
      bounce: 1.08,
      bounceSpin: 0.60,
      targetXBias: 'BODY',
      riskMult: 1.08,
    },
  },

  SERVE_T_LASER: {
    label: 'SAQUE NO T',
    emoji: '🔦',
    baseType: 'SERVE',
    wing: 'SERVE',
    description: 'Flat no T com colocação cirúrgica — sem ângulo de retorno.',
    attrThreshold: { saquePrecisao: 76, leitura: 68 },
    activationBase: 0.30,
    physics: {
      pow: 1.15,
      spinFnMult: 0.50,
      spinZ: 0.05,
      depthRange: [0.82, 0.95],
      bounce: 1.05,
      bounceSpin: 0.60,
      targetXBias: 'BODY',
      riskMult: 1.10,
    },
  },

  // ══════════════════════════════════════════════════════════════════
  // VOLEIO
  // ══════════════════════════════════════════════════════════════════

  VOLLEY_TOUCH: {
    label: 'VOLEIO DE TOQUE',
    emoji: '🫀',
    baseType: 'VOLLEY',
    wing: 'NET',
    description: 'Absorção máxima — drop volley com quique quase nulo.',
    attrThreshold: { volley: 76, bhControle: 68 },
    activationBase: 0.30,
    physics: {
      pow: 0.28,
      spinFnMult: 2.20,
      spinZ: 0.10,
      depthRange: [0.08, 0.18],
      bounce: 0.18,
      bounceSpin: 0.12,
      riskMult: 1.18,
    },
  },

  VOLLEY_PUNCH: {
    label: 'VOLEIO SOCO',
    emoji: '👊',
    baseType: 'VOLLEY',
    wing: 'NET',
    description: 'Punch flat com velocidade máxima — passa antes do adversário reagir.',
    attrThreshold: { volley: 72, fhPotencia: 70 },
    activationBase: 0.32,
    physics: {
      pow: 1.42,
      spinFnMult: 0.55,
      spinZ: 0.10,
      depthRange: [0.74, 0.90],
      bounce: 1.22,
      bounceSpin: 0.65,
      riskMult: 1.14,
    },
  },

  VOLLEY_ANGLE: {
    label: 'VOLEIO NGULO',
    emoji: '📐',
    baseType: 'VOLLEY',
    wing: 'NET',
    description: 'Voleio cross com abertura extrema — sai da quadra lateralmente.',
    attrThreshold: { volley: 74, visaoTatica: 68 },
    activationBase: 0.28,
    physics: {
      pow: 0.90,
      spinFnMult: 1.20,
      spinZ: 0.45,
      depthRange: [0.28, 0.48],
      bounce: 0.75,
      bounceSpin: 0.90,
      targetXBias: 'WIDE',
      riskMult: 1.20,
    },
  },

  VOLLEY_CHIP: {
    label: 'VOLEIO CHIP',
    emoji: '🍂',
    baseType: 'VOLLEY',
    wing: 'NET',
    description: 'Backspin no voleio — cai curto e rasteiro, difícil de levantar.',
    attrThreshold: { volley: 70, slice: 65 },
    activationBase: 0.30,
    physics: {
      pow: 0.55,
      spinFnMult: 1.80,
      spinZ: 0.18,
      depthRange: [0.12, 0.28],
      bounce: 0.22,
      bounceSpin: 0.20,
      riskMult: 1.14,
    },
  },

  // ══════════════════════════════════════════════════════════════════
  // DROP SHOT
  // ══════════════════════════════════════════════════════════════════

  DROP_DEAD: {
    label: 'DROP MORTO',
    emoji: '💀',
    baseType: 'DROP',
    wing: 'ANY',
    description: 'Backspin extremo — segundo quique quase não sai do lugar.',
    attrThreshold: { fhControle: 74, slice: 62 },
    activationBase: 0.26,
    physics: {
      pow: 0.48,
      spinFnMult: 2.90,
      spinZ: 0.05,
      depthRange: [0.12, 0.24],
      netClearance: 0.07,
      bounce: 0.14,
      bounceSpin: 0.05,
      riskMult: 1.20,
    },
  },

  DROP_LATERAL: {
    label: 'DROP LATERAL',
    emoji: '💨',
    baseType: 'DROP',
    wing: 'ANY',
    description: 'Cai na meia-quadra com desvio lateral após o quique — adversário cobre o errado.',
    attrThreshold: { fhControle: 72, slice: 60 },
    activationBase: 0.28,
    physics: {
      pow: 0.60,
      spinFnMult: 1.80,
      spinZ: 0.80,
      depthRange: [0.16, 0.30],
      netClearance: 0.08,
      bounce: 0.34,
      bounceSpin: 0.60,
      curve: 0.75,
      riskMult: 1.18,
    },
  },

  DROP_FAKE: {
    label: 'DROP ACELERADO',
    emoji: '🃏',
    baseType: 'DROP',
    wing: 'ANY',
    description: 'Trajetória de drop mas com quique que acelera — quebra totalmente a leitura.',
    attrThreshold: { fhControle: 74, leitura: 68 },
    activationBase: 0.26,
    physics: {
      pow: 0.88,
      spinFnMult: 1.20,
      spinZ: 0.18,
      depthRange: [0.20, 0.36],
      netClearance: 0.09,
      bounce: 1.45,
      bounceSpin: 1.80,
      riskMult: 1.16,
    },
  },

  DROP_HIDDEN: {
    label: 'DROP ESCONDIDO',
    emoji: '🎭',
    baseType: 'DROP',
    wing: 'ANY',
    description: 'Mesmo gesto do topspin profundo — a bola cai na frente quando adversário recuou.',
    attrThreshold: { fhControle: 76, leitura: 72 },
    activationBase: 0.25,
    physics: {
      pow: 0.72,          // mantém o disfarce sem morrer antes da rede
      spinFnMult: 1.95,   // bastante backspin para travar no quique
      spinZ: 0.08,
      depthRange: [0.12, 0.24],  // continua curto, mas numa faixa viável
      netClearance: 0.08,        // segue baixo sem virar erro automático
      bounce: 0.26,
      bounceSpin: 0.22,
      riskMult: 1.12,
    },
  },

  // ══════════════════════════════════════════════════════════════════
  // ESPECIAIS
  // ══════════════════════════════════════════════════════════════════

  LOB_OFFENSIVE: {
    label: 'LOB OFENSIVO',
    emoji: '🚀',
    baseType: 'LOB',
    wing: 'ANY',
    description: 'Topspin pesado em arco — cai rápido, quica alto, foge do smash.',
    attrThreshold: { topspin: 70, leitura: 64 },
    activationBase: 0.28,
    physics: {
      pow: 1.08,
      spinFnMult: 2.10,
      spinZ: 0.12,
      depthRange: [0.74, 0.90],
      bounce: 1.90,
      bounceSpin: 2.30,
      riskMult: 1.14,
    },
  },

  LOB_DEFENSIVE_PRECISE: {
    label: 'LOB PRECISO',
    emoji: '🏛️',
    baseType: 'LOB',
    wing: 'ANY',
    description: 'Lob de corrida com backspin — cai fundo, timing do adversário ruim.',
    attrThreshold: { defesa: 72, leitura: 66 },
    activationBase: 0.28,
    physics: {
      pow: 0.72,
      spinFnMult: 0.70,
      spinZ: 0.18,
      depthRange: [0.72, 0.88],
      bounce: 1.30,
      bounceSpin: 1.40,
      arcBoost: 2.5,
      riskMult: 1.06,
    },
  },

  SMASH_BODY: {
    label: 'SMASH NO CORPO',
    emoji: '💥',
    baseType: 'SMASH',
    wing: 'NET',
    description: 'Overhead direto no corpo — sem espaço, sem ângulo de defesa.',
    attrThreshold: { smash: 72 },
    activationBase: 0.30,
    physics: {
      pow: 1.20,
      spinFnMult: 0.60,
      spinZ: 0.08,
      depthRange: [0.72, 0.88],
      bounce: 1.18,
      bounceSpin: 0.65,
      targetXBias: 'BODY',
      riskMult: 1.10,
    },
  },

  TWEENER: {
    label: 'TWEENER',
    emoji: '🪄',
    baseType: 'ACCEL',
    wing: 'ANY',
    description: 'Entre as pernas de costas para a rede — raridade absoluta.',
    attrThreshold: { fhPotencia: 80, visaoTatica: 82, leitura: 78 },
    activationBase: 0.16,
    physics: {
      pow: 1.05,
      spinFnMult: 1.20,
      spinZ: 0.25,
      depthRange: [0.62, 0.84],
      bounce: 1.10,
      bounceSpin: 1.00,
      riskMult: 1.30,
    },
  },
};

// Kill switch temporário para desligar o efeito em jogo sem remover
// signatures de jogadores, UI, scouting ou geração de dados.
export const SIGNATURE_SHOTS_ENABLED = false;

// ══════════════════════════════════════════════════════════════════
// MAPEAMENTO: shotType + wing → signatures compatíveis
// ══════════════════════════════════════════════════════════════════
// Chave: `${shotType}:${wing}` onde wing = 'FH' | 'BH' | 'NET' | 'SERVE' | 'ANY'
// ══════════════════════════════════════════════════════════════════

function buildCompatibilityMap() {
  const map = {};
  for (const [key, sig] of Object.entries(SIGNATURE_SHOTS)) {
    // Um signature é compatível com o shotType base
    // E com a wing declarada (ou ANY = qualquer)
    const entryKey = sig.baseType;
    if (!map[entryKey]) map[entryKey] = {};
    for (const w of ['FH', 'BH', 'NET', 'SERVE', 'ANY', 'BOTH']) {
      if (sig.wing === w || sig.wing === 'ANY' || sig.wing === 'BOTH') {
        if (!map[entryKey][w]) map[entryKey][w] = [];
        map[entryKey][w].push(key);
      }
    }
  }
  return map;
}

const COMPAT_MAP = buildCompatibilityMap();
export const SHOT_TYPE_SIGNATURES = COMPAT_MAP;

export function getCompatibleSignatures(shotType, wing) {
  const byType = COMPAT_MAP[shotType] ?? {};
  const direct = byType[wing]  ?? [];
  const any    = byType['ANY'] ?? [];
  // Para golpes de fundo (não VOLLEY, não SERVE), aceita signatures do lado oposto também
  // Ex: BH_TOPSPIN_CROSS pode disparar mesmo que o jogador bata com FH — é a tática, não a asa
  const groundTypes = new Set(['TOPSPIN','ACCEL','SLICE','DROP','SHORT_ACCEL','BANANA']);
  const opposite = wing === 'BH' ? byType['FH'] ?? []
                 : wing === 'FH' ? byType['BH'] ?? []
                 : [];
  const extra = groundTypes.has(shotType) ? opposite : [];
  return [...new Set([...direct, ...any, ...extra])];
}

// ══════════════════════════════════════════════════════════════════
// POOLS POR ESTILO — para rollPlayerSignature
// ══════════════════════════════════════════════════════════════════

const STYLE_POOLS = {
  AGG_BASELINER: ['FH_TOPSPIN_CROSS', 'FH_FLAT_BOMB', 'FH_KICK', 'BH_TOPSPIN_CROSS', 'FH_INSIDE_OUT', 'FH_BANANA_CROSS'],
  CTR_PUNCHER:   ['BH_SLICE_DEEP', 'BH_TOPSPIN_CROSS', 'DROP_DEAD', 'DROP_HIDDEN', 'BH_LIFT'],
  ALL_COURT:     ['FH_TOPSPIN_CROSS', 'BH_SLICE_DEEP', 'DROP_HIDDEN', 'VOLLEY_ANGLE', 'FH_SHORT_ANGLE'],
  SRV_VOL:       ['SERVE_FLAT_BOMB', 'SERVE_T_LASER', 'VOLLEY_TOUCH', 'VOLLEY_PUNCH', 'SERVE_KICK_HIGH'],
  BIG_SERVER:    ['SERVE_FLAT_BOMB', 'SERVE_KICK_HIGH', 'SERVE_SLICE_WIDE', 'SERVE_JAM_BODY', 'SERVE_T_LASER'],
  RETRIEVER:     ['BH_SLICE_DEEP', 'LOB_DEFENSIVE_PRECISE', 'BH_LIFT', 'DROP_DEAD', 'BH_SLICE_SHORT'],
  TAKEALLRISK:   ['FH_FLAT_BOMB', 'FH_REVERSE', 'TWEENER', 'FH_INSIDE_OUT', 'BH_BULLET_DTL', 'FH_BANANA_CROSS'],
  GRINDER:       ['BH_LIFT', 'FH_KICK', 'FH_TOPSPIN_CROSS', 'DROP_DEAD', 'BH_TOPSPIN_CROSS'],
  PWR_BASE:      ['FH_FLAT_BOMB', 'BH_BULLET_DTL', 'FH_TOPSPIN_DTL', 'SERVE_FLAT_BOMB', 'FH_KICK'],
  TACT_TEC:      ['DROP_HIDDEN', 'DROP_FAKE', 'BH_SLICE_SHORT', 'FH_SHORT_ANGLE', 'VOLLEY_ANGLE'],
  NET_SPEC:      ['VOLLEY_TOUCH', 'VOLLEY_PUNCH', 'VOLLEY_CHIP', 'SMASH_BODY', 'SERVE_T_LASER'],
  ADPT_TAC:      ['FH_TOPSPIN_CROSS', 'BH_SLICE_DEEP', 'DROP_FAKE', 'SERVE_KICK_HIGH', 'VOLLEY_ANGLE'],
};

const ALL_KEYS = Object.keys(SIGNATURE_SHOTS);

export function rollPlayerSignature(styleId, attrs = {}) {
  const pool = STYLE_POOLS[styleId] ?? ALL_KEYS;
  const eligible = pool.filter(key => {
    const sig = SIGNATURE_SHOTS[key];
    if (!sig) return false;
    return Object.entries(sig.attrThreshold ?? {}).every(([a, min]) => (attrs[a] ?? 0) >= min);
  });
  const final = eligible.length > 0 ? eligible : pool;
  return final[Math.floor(Math.random() * final.length)];
}

export function rollCoachSignature(styleId) {
  // Técnico passa uma signature do mesmo estilo que complementa o jogador
  const pool = STYLE_POOLS[styleId] ?? ALL_KEYS;
  return pool[Math.floor(Math.random() * pool.length)];
}

// ══════════════════════════════════════════════════════════════════
// APPLY SIGNATURE LAYER — ponto de entrada
// ══════════════════════════════════════════════════════════════════

function meetsThreshold(attrs, thresholds) {
  if (!thresholds) return true;
  return Object.entries(thresholds).every(([a, min]) => (attrs[a] ?? 0) >= min);
}

function computeChance(sig, player, prepQuality, isBigPoint) {
  let chance = sig.activationBase ?? 0.30;

  // Qualidade alta de execução sobe a chance
  if (prepQuality >= 0.75) chance *= 1.40;
  else if (prepQuality >= 0.60) chance *= 1.20;
  else if (prepQuality >= 0.45) chance *= 1.08;

  // Momentum
  const momentum = player.ctx?.momentum ?? 0.5;
  if (momentum > 0.65)      chance *= 1.22;
  else if (momentum < 0.35) chance *= 0.80;

  // Pressão extrema bloqueia
  const isDefensive = ['SLICE', 'DROP', 'LOB'].includes(sig.baseType);
  if (prepQuality < (isDefensive ? 0.25 : 0.32)) return 0;
  if (player.ctx?.underPressure) chance *= (isDefensive ? 0.80 : 0.78);

  // Big point
  if (isBigPoint) chance *= 1.55;

  return Math.min(chance, 0.72);
}

// Cooldown: 1 por ponto (era 1 por game — muito restritivo)
function canUse(player)  { return !player.ctx?._sigUsedThisPoint; }
function markUsed(player) { if (player.ctx) player.ctx._sigUsedThisPoint = true; }

/**
 * @param {object} player       — jogador (naturalSignature, coach?.signature, attrs, ctx)
 * @param {string} shotType     — tipo do golpe escolhido
 * @param {string} wing         — 'FH' | 'BH' | 'NET' | 'SERVE' | 'ANY'
 * @param {number} prepQuality  — 0–1
 * @param {object} gameContext  — { isBigPoint }
 * @returns {{ triggered, signatureKey, label, emoji, description, physics, source }}
 */
export function applySignatureLayer(player, shotType, wing, prepQuality, gameContext = {}) {
  const noop = { triggered: false };

  if (!SIGNATURE_SHOTS_ENABLED) return noop;
  if (!canUse(player)) return noop;

  const compatible = getCompatibleSignatures(shotType, wing);
  if (compatible.length === 0) return noop;

  const attrs = player.attrs ?? {};
  const natural = player.naturalSignature ?? null;
  const coach   = player.coach?.signature ?? null;

  // Candidatos: natural + coach se compatíveis
  const candidates = [];
  for (const key of [natural, coach]) {
    if (key && compatible.includes(key)) {
      const sig = SIGNATURE_SHOTS[key];
      if (sig && meetsThreshold(attrs, sig.attrThreshold)) {
        candidates.push({ key, source: key === natural ? 'NATURAL' : 'COACH' });
      }
    }
  }

  if (candidates.length === 0) return noop;

  // Prefere natural ligeiramente
  const picked = candidates.length === 1
    ? candidates[0]
    : Math.random() < 0.65
      ? (candidates.find(c => c.source === 'NATURAL') ?? candidates[0])
      : (candidates.find(c => c.source === 'COACH')   ?? candidates[0]);

  const sig = SIGNATURE_SHOTS[picked.key];
  const isBigPoint = gameContext.isBigPoint ?? false;

  if (Math.random() > computeChance(sig, player, prepQuality, isBigPoint)) return noop;

  markUsed(player);
  return {
    triggered:   true,
    signatureKey: picked.key,
    source:       picked.source,
    label:        sig.label,
    emoji:        sig.emoji,
    description:  sig.description,
    physics:      sig.physics,
  };
}

/**
 * Aplica os overrides físicos do signature no shot já construído.
 */
export function applySignaturePhysics(shot, physics, shotType, player = null) {
  if (!physics) return shot;

  if (physics.pow       != null) shot.power  = (shot.power  ?? 1.0) * physics.pow;
  if (physics.spinFnMult != null && shot.spinX != null) shot.spinX *= physics.spinFnMult;
  if (physics.spinZ     != null) shot.spinZ  = physics.spinZ;

  if (physics.depthRange) {
    const [dMin, dMax] = physics.depthRange;
    const HALF_L = 11.885;
    const ySign  = Math.sign(shot.targetY) || (player?.side != null ? -player.side : -1);
    shot.targetY = ySign * (dMin + Math.random() * (dMax - dMin)) * HALF_L;
  }

  if (physics.targetXBias) {
    const HALF_S  = 4.115;
    const playerX = player?.pos?.x ?? 0;
    let crossSide, dtlSide;
    if      (playerX >  0.25) { crossSide = -1; dtlSide =  1; }
    else if (playerX < -0.25) { crossSide =  1; dtlSide = -1; }
    else {
      const existing = Math.sign(shot.targetX) || (Math.random() < 0.5 ? 1 : -1);
      crossSide = existing; dtlSide = existing;
    }
    switch (physics.targetXBias) {
      case 'CROSS': shot.targetX = crossSide * (0.55 + Math.random() * 0.35) * HALF_S; break;
      case 'DTL':   shot.targetX = dtlSide   * (0.30 + Math.random() * 0.25) * HALF_S; break;
      case 'WIDE':  shot.targetX = crossSide * (0.70 + Math.random() * 0.26) * HALF_S;
                    shot.targetX = Math.sign(shot.targetX) * Math.min(Math.abs(shot.targetX), HALF_S - 0.12); break;
      case 'BODY':  shot.targetX = (Math.random() - 0.5) * 0.30 * HALF_S; break;
    }
  }

  if (physics.bounce     != null) shot._sigBounce     = physics.bounce;
  if (physics.bounceSpin != null) shot._sigBounceSpin = physics.bounceSpin;
  if (physics.curve      != null) shot._sigCurve      = physics.curve;
  if (physics.arcBoost   != null) shot._sigArcBoost   = physics.arcBoost;
  if (physics.riskMult   != null) shot._sigRiskMult   = physics.riskMult;
  if (physics.netClearance != null) shot.netClearance = physics.netClearance;
  shot._isSignature = true;
  return shot;
}

