// contactCoefficientsTuned.js - Coeficientes recalibrados do ContactModel

export const CONTACT = {
  // Timing: pros ainda chegam bem, mas atraso precisa degradar mais.
  TIMING_EARLY:              0.10,
  TIMING_LATE:              -0.12,
  TIMING_FLOOR:              0.58,

  // Prep: sem preparo o golpe nao pode continuar saindo quase neutro.
  PREP_BASE:                 0.74,
  PREP_WEIGHT:               0.26,

  // Balance: corrida lateral e contato fora do ideal agora cobram mais.
  BALANCE_VEL_SCALE:         0.05,
  BALANCE_DIST_SCALE:        0.09,

  // Fatigue: mantido.
  FATIGUE_EXPONENT:          0.35,
  FATIGUE_FLOOR:             0.52,

  // Pressao: volta a marcar mais a qualidade final.
  PRESSURE_PENALTY:          0.07,

  SPIN_SCALE:                0.004,

  VOLLEY_EMERGENCY_PENALTY:  0.30,
  VOLLEY_POSITION_PENALTY:   0.10,
  HALF_VOLLEY_PENALTY:       0.20,

  SIG_QUALITY_MULT:          1.22,
  SIG_QUALITY_CAP:           0.92,
};
