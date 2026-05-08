// aiCoefficients.js — Coeficientes de AI (Fase C / Fase D)
// Centralizar aqui todos os literais de AI para calibração sem varrer múltiplos arquivos.

// Dificuldade base de execução por tipo de golpe.
// Usado em computeShotProbError() para calcular a probabilidade de erro do shot escolhido pelo EV.
// Valores representam probabilidade de erro base em condições de qualidade perfeita (Q=1.0).
export const SHOT_DIFFICULTY = {
  FLAT:        0.08,
  TOPSPIN:     0.04,
  SLICE:       0.035,
  BANANA:      0.12,
  SHORT_ANGLE: 0.14,
  DROP:        0.16,
  LOB_ATK:     0.10,
  LOB_DEF:     0.05,
  VOLLEY:      0.09,
  SMASH:       0.07,
  PASSING:     0.13,
  SLICE_SHORT: 0.11,
  HALF_VOLLEY: 0.13,  // contato de tornozelo, sem backswing — similar ao PASSING em dificuldade
  HEAVY_TOP:   0.07,  // topspin pesado: mais risco que TOPSPIN (0.04) mas menos que FLAT (0.08)
};

export const AI = {
  // Multiplicador global de erro via EV — reduzir se UE total subir demais após Fase C
  ERROR_SCALE: 1.0,

  // Escala de conversão de evProbError → delta no ueChance de game.js
  // (evProbError - EV_ERROR_BASELINE) * EV_ERROR_WEIGHT = delta aplicado no lugar de shotTypeRisk
  EV_ERROR_BASELINE: 0.06,   // probabilidade de erro "neutra" — abaixo reduz UE, acima aumenta
  EV_ERROR_WEIGHT:   0.30,   // sensibilidade: quanto o evProbError influencia o ueChance

  MOMENTUM: {
    EWMA_ALPHA:       0.10,
    HIGH_THRESHOLD:   0.75,
    LOW_THRESHOLD:    0.30,
    BREAK_THRESHOLD:  0.18,
  },

  INTENT: {
    // Bola difícil
    TOUGH_RESET_PROB:        0.72,   // toughBall → RESET

    // Janela de serviço: sacador com bola fraca do adversário
    SERVE_ADV_FINISH:        0.65,   // weakReturnBoost alto → FINISH
    SERVE_ADV_PRESSURE:      0.75,   // weakReturnBoost médio → PRESSURE

    // Bola fácil
    EASY_INCONTROL_BASE:     0.70,   // inControl + oppOut>0.55 → FINISH
    EASY_INCONTROL_CONSERV:  0.55,   // inControl + oppOut<=0.55 → FINISH
    EASY_NOCONTROL_PRESSURE: 0.45,   // sem controle → PRESSURE
    EASY_NOCONTROL_BUILD:    0.35,   // sem controle + pior → BUILD

    // Neutro
    NEUTRAL_EARLY_BUILD:     0.70,   // early rally → BUILD
    NEUTRAL_OPEN_PRESS:      0.60,   // oppOut + mom altos → PRESSURE
    NEUTRAL_PRESSURE_RESET:  0.65,   // oppPressure alto → RESET
    NEUTRAL_BASE_PRESSURE:   0.82,   // distribuição default: <0.50 BUILD, <0.82 PRESSURE, else FINISH

    // Modificadores de estilo
    AGG_EASY_FINISH:         0.40,   // AGG_BASELINER PRESSURE → chance de FINISH
    SRVVOL_NEUTRAL_PRESSURE: 0.60,   // SRV_VOL BUILD → PRESSURE
    BIG_EASY_FINISH:         0.55,   // BIG_SERVER easyBall → FINISH
    BIG_NEUTRAL_PRESSURE:    0.65,   // BIG_SERVER neutralBall BUILD → PRESSURE
  },

  SOFTMAX_TEMPERATURE: {
    BASE:              0.18,
    HIGH_MOOD:         0.22,
    LOW_MOOD:          0.12,
  },

  // FIX: EV_FLOOR_RATIO relaxado de 0.72/0.82 → 0.62/0.72.
  // Antes: BODY/CTR dominava o EV (risco direcional 0.70 = menor), candidatos de ângulo
  // caíam abaixo do floor e eram descartados ANTES do softmax.
  // Agora: candidatos de DTL/WIDE/SHORT_ANGLE chegam ao pool e competem via temperatura.
  EV_FLOOR_RATIO: {
    RALLY:             0.62,   // era NORMAL (renomeado — sem relação com shot type)
    FINISH:            0.72,
  },
  EV_FLOOR_ABS_GAP: {
    RALLY:             0.14,   // era NORMAL
    FINISH:            0.12,
  },

  // ── FASE 1.3 — Rigidez tática por estilo ──────────────────────────────
  // Controla com quantas repetições fracassadas o flag _matchRead.insisting vira true.
  // 1.0 = máximo rígido (nunca insiste), 0.0 = mínimo (muda de plano a qualquer falha).
  // Na prática: rigidity * 5 = número de shots repetidos sem sucesso antes de insisting=true.
  TACTICAL_RIGIDITY: {
    GRINDER:             0.80,  // joga o mesmo padrão até funcionar — identidade do estilo
    RETRIEVER:           0.75,  // defesa paciente, não muda por capricho
    NET_SPECIALIST:      0.70,  // rígido na estratégia de rede — não recua por uma falha
    SRV_VOL:             0.70,  // serve-and-volley é o plano, sempre
    CTR_PUNCHER:         0.60,  // adapta quando necessário
    AGG_BASELINER:       0.55,
    POWER_BASELINER:     0.50,
    ALL_COURT:           0.45,  // versátil por natureza
    BIG_SERVER:          0.55,
    MOMENTUM_PLAYER:     0.40,  // muda rápido conforme o humor do jogo
    TACTICAL_TECHNICIAN: 0.30,  // ajusta o plano frequentemente — DNA do estilo
    TAKEALLRISK:         0.20,  // caótico — muda a qualquer momento
  },
};

