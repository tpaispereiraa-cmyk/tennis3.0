// CONTATO_CONFIG.js
// ============================================================================
// Config central do modelo de contato e dos gates mínimos de execução.
// ============================================================================

export const CONTATO = {
  timing_cedo: 0.10,
  // Helper: quanto mais alto, mais fácil atingir "timing perfeito".
  timing_tarde: -0.22,
  // Ampliado de -0.12 → -0.22: abre a janela de variação sem comprimir o regime normal.
  // -0.12s (tardio) → timingFactor ≈ 0.711 | -0.20s (muito tardio) → ≈ 0.606
  // Com -0.12 antigo ambos caíam no mesmo piso — agora há 10pp de diferenciação.
  // Golpes no tempo (margin=0.00) sobem de 0.809 → 0.869: efeito colateral positivo.
  timing_piso: 0.58,
  // Piso mantido em 0.58: bolas completamente fora do tempo (< -0.22s) têm floor razoável.
  // Baixar o piso para 0.40 punia o regime normal em 8pp sem ganho real.

  prep_base: 0.74,
  prep_peso: 0.26,
  // Helper: `prep_base` define o mínimo de contato sem backswing completo.

  balance_vel_escala: 0.05,
  balance_dist_escala: 0.09,
  // Helper: subir estes valores pune mais golpes em corrida e contato torto.

  fadiga_expoente: 0.35,
  fadiga_piso: 0.52,
  // Helper: piso mais baixo = jogador muito cansado perde mais qualidade técnica.

  pressao_penalidade: 0.07,
  // Helper: subir deixa pressão tática afetar mais a execução final.

  spin_escala: 0.004,
  // Helper: subir dificulta devolver bolas com muito spin.

  voleio_emergencia_penalidade: 0.30,
  voleio_posicao_penalidade: 0.10,
  half_volley_penalidade: 0.20,

  signature_mult: 1.22,
  signature_teto: 0.92,
  // Helper: controla o bônus de qualidade do golpe assinatura.
};

export const GATE_QUALIDADE = {
  SLICE: 0.10,
  TOPSPIN: 0.08,
  DRIVE: 0.32,
  HALF_VOLLEY: 0.18,
  DROP: 0.24,
  LOB: 0.16,
  ACCEL: 0.45,
  SHORT_ACCEL: 0.50,
  BANANA: 0.44,
};

export const RISCO_BASE = {
  TOPSPIN: 0.18,
  DRIVE: 0.20,
  HALF_VOLLEY: 0.14,
  SLICE: 0.18,
  DROP: 0.26,
  LOB: 0.09,
  VOLLEY: 0.16,
  SMASH: 0.10,
  ACCEL: 0.26,
  SHORT_ACCEL: 0.24,
  BANANA: 0.30,
};

// ============================================================================
// DEGRADACAO_CONFIG — Sistema unificado de degradação em duas camadas
// ============================================================================
//
// Camada 1 — Dispersão unificada (começa em Q < qualidade_erro do shot)
//   A dispersão do golpe lerpa em direção ao DISPERSAO_ERRO_BASE.
//   Controle desloca o threshold e comprime o teto do lerp.
//
// Camada 2 — Colapso físico (começa em Q < 0.20)
//   O envelope físico (pace, margem, profundidade) lerpa para FISICA_COLAPSO.
//   Defesa atenua o colapso em shots defensivos.
//
export const DEGRADACAO_CONFIG = {
  // --- Camada 1: destino universal da dispersão em Q baixa ---
  // Abaixo do threshold do shot, todos os golpes convergem para este perfil.
  // O caos é universal — a identidade do golpe sobrevive na física, não no spread.
  DISPERSAO_ERRO_BASE: {
    sigma_base: 0.22,
    sigma_lateral_max: 0.92,
    sigma_angulo_max: 6.8,
    // risco_direcional preservado do shot original — a direção ainda importa no erro
  },

  // --- Controle: âncora de dispersão ---
  // ctrl=20 → bonus=−0.075 (threshold sobe — erro começa mais cedo)
  // ctrl=50 → bonus= 0.000 (threshold original)
  // ctrl=99 → bonus=+0.123 (threshold cai — mantém dispersão limpa por mais tempo)
  CTRL_BONUS_ESCALA: 0.25,   // (ctrl - 50) / 100 × CTRL_BONUS_ESCALA
  CTRL_THRESHOLD_MIN: 0.20,  // threshold nunca cai abaixo deste valor (Camada 2 floor)

  // Teto do lerp: ctrl alto nunca atinge o caos máximo do DISPERSAO_ERRO_BASE
  // ctrl=20 → teto=0.97 | ctrl=50 → teto=0.83 | ctrl=99 → teto=0.58
  CTRL_TETO_BASE: 1.0,
  CTRL_TETO_ESCALA: 0.42,    // teto = 1.0 - (ctrl / 100) × CTRL_TETO_ESCALA

  // --- Camada 2: colapso físico (Q < 0.20) ---
  CAMADA2_THRESHOLD: 0.20,

  // Destino físico do colapso — envolope de um SAFE fraco (seguro, mas sem autoridade)
  FISICA_COLAPSO: {
    velocidade: [19, 27],       // pace cede para nível de bola de sobrevivência
    margem_rede: [0.55, 0.95],  // bola atravessa a rede com segurança
    profundidade: [0.42, 0.66], // cai no meio da quadra
    // spin_x, spin_z, altura_contato: NÃO tocados — golpe mantém identidade de contato
  },

  // Shots defensivos: defesa atenua o colapso físico da Camada 2
  // Apenas LOB: é o único golpe onde faz sentido físico real o corpo
  // "saber" mandar a bola alta mesmo sem preparo adequado.
  // SAFE e SLICE em Q=0.05 devem colapsar normalmente — defesa já premiou
  // na origem (ContactModel) e uma segunda atenuação seria acumulação indevida.
  SHOTS_DEFENSIVOS: new Set(['LOB']),

  // Compressão máxima de t2 por defesa em shots defensivos
  // defesa=99 → t2_efetivo = t2 × (1 − 0.58) = t2 × 0.42 → física não colapsa totalmente
  DEFESA_COLAPSO_ATENUACAO: 0.58,
};

// Adaptador para o código legado enquanto a migração fica completa.
export const CONTACT = {
  TIMING_EARLY: CONTATO.timing_cedo,
  TIMING_LATE: CONTATO.timing_tarde,
  TIMING_FLOOR: CONTATO.timing_piso,
  PREP_BASE: CONTATO.prep_base,
  PREP_WEIGHT: CONTATO.prep_peso,
  BALANCE_VEL_SCALE: CONTATO.balance_vel_escala, // DEAD CODE — não usado após correção da dupla penalização de balance (v2). lateralVelocity foi removida do ContactModel.balanceFactor; a velocidade já está capturada no prepQuality ceiling do swingPrepEngine.
  BALANCE_DIST_SCALE: CONTATO.balance_dist_escala,
  FATIGUE_EXPONENT: CONTATO.fadiga_expoente,
  FATIGUE_FLOOR: CONTATO.fadiga_piso,
  PRESSURE_PENALTY: CONTATO.pressao_penalidade,
  SPIN_SCALE: CONTATO.spin_escala,
  VOLLEY_EMERGENCY_PENALTY: CONTATO.voleio_emergencia_penalidade,
  VOLLEY_POSITION_PENALTY: CONTATO.voleio_posicao_penalidade,
  HALF_VOLLEY_PENALTY: CONTATO.half_volley_penalidade,
  SIG_QUALITY_MULT: CONTATO.signature_mult,
  SIG_QUALITY_CAP: CONTATO.signature_teto,
};

