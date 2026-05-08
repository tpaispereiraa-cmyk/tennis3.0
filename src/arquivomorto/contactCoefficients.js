// contactCoefficients.js — Coeficientes do ContactModel
// Centralizado aqui para calibração fácil. Não editar no ContactModel diretamente.

export const CONTACT = {
  // Timing: janela de chegada (segundos)
  // Timing calibrado para pros: chegam na bola com margem razoável na maioria dos golpes.
  TIMING_EARLY:              0.10,   // >= este → timing perfeito (1.0)
  TIMING_LATE:              -0.12,   // <= este → timing no piso (TIMING_FLOOR)
  TIMING_FLOOR:              0.72,   // era 0.65 — pro chega na bola; sob pressão ainda acerta

  // Prep: preparação do swing
  PREP_BASE:                 0.84,   // era 0.82
  PREP_WEIGHT:               0.16,

  // Balance: equilíbrio no momento do golpe — penalidades mais suaves
  BALANCE_VEL_SCALE:         0.04,   // era 0.06 — correndo lateralmente ainda controla
  BALANCE_DIST_SCALE:        0.07,   // era 0.10

  // Fatigue: curvatura da queda de qualidade por stamina
  // Expoente moderado: técnica sofre com cansaço real — jogador cansado erra mais.
  // stam=1.0→1.00 | stam=0.7→0.91 | stam=0.5→0.84 | stam=0.3→0.74 | stam=0→piso
  // O piso foi reduzido: cansaço extremo SIM afeta a técnica, além do físico.
  FATIGUE_EXPONENT:          0.35,   // era 0.25 — queda um pouco mais acentuada
  FATIGUE_FLOOR:             0.52,   // era 0.70 — cansado extremo cai para 52% de fator

  // Pressure: penalidade tática (booleano) — suavizada, timing/balance já capturam pressão
  PRESSURE_PENALTY:          0.04,   // era 0.10 — dupla penalidade eliminada

  // Spin: penalidade por spin alto na bola recebida
  SPIN_SCALE:                0.004,

  // Volley: penalidade por tipo de voleio
  VOLLEY_EMERGENCY_PENALTY:  0.30,
  VOLLEY_POSITION_PENALTY:   0.10,

  // Half Volley: golpe de bloqueio imediatamente após o quique.
  // Contato em altura de tornozelo/canela — timing puro, sem backswing.
  // Mais difícil que voleio de posição, mais fácil que voleio de emergência.
  HALF_VOLLEY_PENALTY:       0.20,

  // Signature Shot: bônus de qualidade quando o jogador executa seu golpe característico.
  // Aplicado sobre finalQuality após aiDecideShot confirmar o golpe escolhido.
  // SIG_QUALITY_MULT: multiplica finalQuality (1.22 = até +22%)
  // SIG_QUALITY_CAP:  teto — mesmo com bônus não vai além de 92% (ainda pode errar)
  SIG_QUALITY_MULT:          1.22,
  SIG_QUALITY_CAP:           0.92,
};

