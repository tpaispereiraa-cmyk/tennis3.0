export const INTENTS = ['RESET', 'BUILD', 'PRESSURE', 'APPROACH', 'FINISH'];

export const SHOT_POOLS = {
  // LOB removido das pools RESET — LOB defensivo só existe via adjustPoolBySituation quando oppAtNet=true.
  // Peso redistribuído para TOPSPIN e SLICE (shots naturais de reset).
  RESET: {
    SAFETY_FIRST: { TOPSPIN: 0.74, SLICE: 0.18, DRIVE: 0.08 },
    SAFE:         { TOPSPIN: 0.70, SLICE: 0.17, DRIVE: 0.13 },
    CALCULATED:   { TOPSPIN: 0.62, SLICE: 0.16, DRIVE: 0.16, DROP: 0.06 },
    GAMBLER:      { TOPSPIN: 0.50, SLICE: 0.12, DROP: 0.20, DRIVE: 0.18 },
    ALLOUT:       { TOPSPIN: 0.42, SLICE: 0.10, DROP: 0.24, DRIVE: 0.24 },
  },
  // BUILD SAFE e CALCULATED agora têm ACCEL/BANANA/SHORT_ACCEL com peso suficiente
  // para sobreviver às penalidades de execução (que são multiplicativas — ver executionState.js).
  // [FIX-BUILD-POOL] ACCEL: 0.14→0.20, SHORT_ACCEL: 0.08→0.13 em CALCULATED.
  // Motivo: mesmo no BUILD, um jogador com perfil médio deve usar estes shots
  // com razoável frequência. O TOPSPIN continua âncora mas não monopoliza.
  BUILD: {
    SAFETY_FIRST: { TOPSPIN: 0.78, SLICE: 0.10, DRIVE: 0.08, DROP: 0.04 },
    SAFE:         { TOPSPIN: 0.54, SLICE: 0.08, DRIVE: 0.13, DROP: 0.07, ACCEL: 0.12, SHORT_ACCEL: 0.08, BANANA: 0.05 },
    CALCULATED:   { TOPSPIN: 0.43, DRIVE: 0.18, SLICE: 0.06, DROP: 0.07, ACCEL: 0.22, SHORT_ACCEL: 0.14, BANANA: 0.08 },
    GAMBLER:      { TOPSPIN: 0.31, DRIVE: 0.17, DROP: 0.18, ACCEL: 0.22, SHORT_ACCEL: 0.11, BANANA: 0.11, SLICE: 0.04 },
    ALLOUT:       { TOPSPIN: 0.22, DRIVE: 0.21, ACCEL: 0.28, SHORT_ACCEL: 0.15, BANANA: 0.11, DROP: 0.12, SLICE: 0.03 },
  },
  PRESSURE: {
    SAFETY_FIRST: { TOPSPIN: 0.52, DRIVE: 0.24, SLICE: 0.12, ACCEL: 0.08, SHORT_ACCEL: 0.04 },
    SAFE:         { TOPSPIN: 0.42, DRIVE: 0.28, ACCEL: 0.16, SLICE: 0.08, SHORT_ACCEL: 0.06, BANANA: 0.04, DROP: 0.04 },
    CALCULATED:   { DRIVE: 0.30, TOPSPIN: 0.24, ACCEL: 0.22, SHORT_ACCEL: 0.14, SLICE: 0.10, BANANA: 0.06, DROP: 0.06 },
    GAMBLER:      { ACCEL: 0.30, DRIVE: 0.14, TOPSPIN: 0.12, SHORT_ACCEL: 0.18, BANANA: 0.16, DROP: 0.10 },
    ALLOUT:       { ACCEL: 0.38, SHORT_ACCEL: 0.24, BANANA: 0.18, DRIVE: 0.10, TOPSPIN: 0.06, DROP: 0.04 },
  },
  FINISH: {
    SAFETY_FIRST: { TOPSPIN: 0.48, DRIVE: 0.24, ACCEL: 0.18, DROP: 0.06, SMASH: 0.04 },
    SAFE:         { ACCEL: 0.34, TOPSPIN: 0.22, DRIVE: 0.14, SHORT_ACCEL: 0.18, DROP: 0.06, BANANA: 0.06 },
    CALCULATED:   { ACCEL: 0.46, TOPSPIN: 0.14, SHORT_ACCEL: 0.22, DRIVE: 0.08, DROP: 0.04, SMASH: 0.02, BANANA: 0.10 },
    GAMBLER:      { ACCEL: 0.34, BANANA: 0.28, DROP: 0.12, SHORT_ACCEL: 0.20, DRIVE: 0.02, LOB: 0.04 },
    ALLOUT:       { ACCEL: 0.40, BANANA: 0.28, SHORT_ACCEL: 0.24, DROP: 0.04, SMASH: 0.04, DRIVE: 0.00 },
  },
};

export const APPROACH_POOLS = {
  RELUCTANT:   { ACCEL: 0.38, SLICE: 0.26, DRIVE: 0.18, SHORT_ACCEL: 0.08, VOLLEY: 0.10 },
  OPPORTUNIST: { ACCEL: 0.30, SHORT_ACCEL: 0.20, SLICE: 0.22, DRIVE: 0.16, VOLLEY: 0.12 },
  PROACTIVE:   { SLICE: 0.32, ACCEL: 0.24, DRIVE: 0.18, TOPSPIN: 0.08, VOLLEY: 0.18 },
  HUNTER_SETUP:   { DRIVE: 0.28, ACCEL: 0.22, TOPSPIN: 0.16, SHORT_ACCEL: 0.10, VOLLEY: 0.24 },
  HUNTER_CLOSING: { SLICE: 0.34, ACCEL: 0.20, DRIVE: 0.14, VOLLEY: 0.24, SMASH: 0.08 },
};

export const APPROACH_GATES = {
  AVOIDS: Infinity,
  RELUCTANT: 0.70,
  OPPORTUNIST: 0.45,
  PROACTIVE: 0.30,
  HUNTER: 0.20,
};

export const APPROACH_BALL_TIERS = {
  AVOIDS: [],
  RELUCTANT: ['OPPORTUNITY'],
  OPPORTUNIST: ['OPPORTUNITY', 'NEUTRAL'],
  PROACTIVE: ['OPPORTUNITY', 'NEUTRAL'],
  HUNTER: ['OPPORTUNITY', 'NEUTRAL'],
};

export const PRESSURE_GATES = {
  PATIENT: 7,
  MEASURED: 5,
  BALANCED: 3,
  EARLY_ATTACK: 2,
  EXPLOSIVE: 1,
};

export const FINISH_GATES = {
  PATIENT: 10,
  MEASURED: 7,
  BALANCED: 5,
  EARLY_ATTACK: 3,
  EXPLOSIVE: 2,
};

export const INTENT_TEMPERATURE = {
  RESET: 0.16,
  BUILD: 0.28,
  PRESSURE: 0.23,
  APPROACH: 0.18,
  FINISH: 0.26,
};

export const RISK_TEMPERATURE = {
  SAFETY_FIRST: 0.82,
  SAFE: 0.92,
  CALCULATED: 1.00,
  GAMBLER: 1.14,
  ALLOUT: 1.26,
};

export const NET_TEMPERATURE = {
  AVOIDS: 1.00,
  RELUCTANT: 0.94,
  OPPORTUNIST: 0.98,
  PROACTIVE: 0.92,
  HUNTER: 0.84,
};

// Multiplicador de temperatura por buildStyle.
// Baixo  → jogador mecânico e repetitivo (HEAVY_SPIN, CENTRE_CONTROL).
// Alto   → jogador imprevisível por natureza (VARIED, DROP_VARIATION).
// Neutro → CROSS_BUILDER é a baseline 1.0.
export const BUILD_STYLE_TEMPERATURE = {
  HEAVY_SPIN_PRESSURE: 0.72,
  CENTRE_CONTROL:      0.80,
  CROSS_DOMINANT:      0.85,
  SLICE_CONTROL:       1.04,
  CROSS_BUILDER:       1.00,
  DTL_HUNTER:          0.94,
  CROSS_SHORT_ANGLE:   0.95,
  COUNTER_REDIRECT:    0.96,
  DROP_VARIATION:      1.18,
  VARIED:              1.22,
};

