// FISICA_CONFIG.js
// ============================================================================
// Fonte central de verdade para os números da física da bola.
//
// Regra desta refatoração:
// 1. A lógica continua em physics.js.
// 2. Os números que definem "como a bola se comporta" ficam aqui.
// 3. Cada helper abaixo explica o efeito prático de mover aquele número.
//
// Os nomes estão em PT-BR de propósito: a ideia é bater o olho e saber
// exatamente onde mexer quando um quique, uma curva ou uma bola curta
// estiver descalibrada.
// ============================================================================

// ── Bola ────────────────────────────────────────────────────────────────────
export const BOLA = {
  massa: 0.057,
  // Helper: subir a massa reduz a resposta da bola ao vento/arrasto; descer a
  // massa deixa a trajetória "mais leve" e mais vulnerável à física do ar.
  raio: 0.033,
  // Helper: subir o raio aumenta a área frontal e muda drag/Magnus; só mexa
  // aqui se quiser mudar a identidade física da bola, não a calibração fina.
  coef_arrasto: 0.55,
  // Helper: subir este valor faz a bola frear mais no ar; descer deixa a bola
  // atravessar a quadra com mais velocidade residual.
};

// ── Ambiente / ar ───────────────────────────────────────────────────────────
export const AMBIENTE = {
  gravidade: -9.81,
  // Helper: mais negativo = bola cai mais rápido; menos negativo = bola
  // "flutua" mais. Quase nunca vale mexer para calibrar shot específico.
  densidade_ar_nivel_mar: 1.2,
  // Helper: subir a densidade reforça drag e Magnus; descer deixa o jogo mais
  // "rápido pelo ar", parecido com altitude alta.
  coef_magnus_base: 0.25,
  // Helper: subir este valor faz topspin/slice curvarem mais no ar; descer
  // deixa trajetórias mais retas e menos dependentes de spin.
};

// ── Superfícies ─────────────────────────────────────────────────────────────
export const SUPERFICIE = {
  DURA: {
    restituicao: 0.75,
    // Helper: subir faz o quique ganhar altura; descer achata o bounce.
    friccao_chao: 0.79,
    // Helper: subir desacelera mais a bola no quique; descer deixa o pós-quique
    // mais vivo e profundo.
    humidade_friccao: 0,
    // Helper: bônus de atrito injetado pelo ambiente; útil para saibro úmido
    // ou quadra pesada sem mexer no baseline da superfície.
  },
  GRAMA: {
    restituicao: 0.68,
    friccao_chao: 0.74,
    humidade_friccao: 0,
  },
  SAIBRO: {
    restituicao: 0.78,
    friccao_chao: 0.82,
    humidade_friccao: 0,
  },
  INDOOR: {
    restituicao: 0.72,
    friccao_chao: 0.77,
    humidade_friccao: 0,
  },
};

// ── Quique / spin no solo ──────────────────────────────────────────────────
export const QUIQUE = {
  coef_quique_spin: 0.075,
  // Helper: subir faz topspin levantar mais e kick ganhar ombro; descer achata
  // a influência do spin no quique.

  skid_damp_min: 0.42,
  skid_damp_max: 0.82,
  // Helper: estes dois valores controlam o quanto um backspin forte "mata" o
  // quique vertical. Subir deixa slice menos rasteiro; descer faz ele morrer.

  friccao_slice_serve: 0.78,
  // Helper: subir deixa o 1º quique do slice serve menos escorregadio; descer
  // gera mais skid lateral e mais carry horizontal.
  friccao_topspin: 0.92,
  // Helper: subir dá mais retenção de velocidade ao topspin pós-quique; descer
  // faz a bola travar mais.
  friccao_backspin: 0.54,
  // Helper: descer este valor faz slice/drop agarrar mais no chão; subir deixa
  // o backspin menos "morto".

  pacebrake_inicio: 26,
  pacebrake_coef: 0.006,
  pacebrake_min: 0.88,
  // Helper: este bloco controla o freio extra em bolas muito rápidas. Subir
  // `pacebrake_inicio` adia o freio; subir `pacebrake_coef` intensifica a perda.

  backspin_forte_min: -0.75,
  backspin_forte_vel_mult: 0.86,
  backspin_forte_vz_mult: 0.74,
  // Helper: quando o slice entra na zona de backspin forte, esses multiplicadores
  // definem o quanto ele perde de pace e de altura de quique.

  sidespin_coef_lento: 0.028,
  sidespin_coef_rapido: 0.053,
  // Helper: aumenta a curva lateral no quique. O coeficiente rápido afeta mais
  // saques/porretadas; o lento afeta rallies normais.

  decay_spinx_quique: -0.28,
  decay_spinz_quique: 0.45,
  // Helper: estes dois valores controlam quanto spin sobra depois do quique.
  // `decay_spinx_quique` mais próximo de zero preserva mais o spin principal.

  variancia_lateral_quique: 1.4,
  // Helper: sobe a irregularidade lateral do quique em bolas com "bounce variance".
};

// ── Drop shot / dead ball ──────────────────────────────────────────────────
export const DROP_SHOT = {
  vel_horizontal_mult: 0.26,
  // Helper: descer mata mais a bola depois do quique; subir deixa o drop "vivo".
  vel_vertical_mult: 0.44,
  // Helper: descer faz o drop quase não levantar; subir dá um quique mais jogável.
  vel_vertical_max: 0.20,
  // Helper: teto do quique do drop. Subir permite drop saltar um pouco mais.

  dead_ball_vel_x_mult: 0.12,
  dead_ball_vel_y_mult: 0.12,
  dead_ball_vz_min: 0.03,
  dead_ball_vz_max: 0.08,
  // Helper: controla o "morrer de vez" no 2º contato curto. Descer os mults
  // faz a bola parar quase na hora.

  dead_ball_hspd_drop: 9.0,
  dead_ball_hspd_default: 3.4,
  dead_ball_spin_drop: -0.02,
  dead_ball_spin_default: -0.38,
  dead_ball_incoming_vz_guard: 4.5,
  // Helper: esse bloco define quando a engine liga o modo "bola morreu".
  // Subir `dead_ball_hspd_default` faz slices lentos morrerem mais cedo.

  dead_ball_extra_kill_mult: 0.22,
  dead_ball_extra_vz_min: 0.10,
  dead_ball_extra_vz_max: 0.18,
  // Helper: pós-detecção de bola morta. Descer o mult reduz o quanto ela anda
  // depois do 1º quique curto.

  arrasto_bola_morta_por_segundo: 8.5,
  // Helper: usado quando a bola já foi marcada como morta. Subir faz ela parar
  // mais rápido mesmo sem novo quique.
};

// ── Rede ───────────────────────────────────────────────────────────────────
export const REDE = {
  altura: 0.86,
  tolerancia: 0.05,
  lip_zone: 0.04,
  // Helper: subir `lip_zone` aumenta a faixa em que a bola pode raspar a fita.
  lip_hit_base: 0.12,
  lip_hit_escala: 0.56,
  // Helper: esses dois números controlam a chance de bater na fita dentro da
  // zona ambígua. Subir = mais drama/loteria de rede.

  deflexao_y_mult: -0.30,
  deflexao_vz_abs_mult: 0.5,
  deflexao_vz_bonus: 1.2,
  deflexao_x_aleatoria: 1.8,
  solver_margem_minima: 0.02,
  // Helper: `solver_margem_minima` é a folga fixa acima da fita usada pelo
  // launchBall. Subir reduz rede acidental, mas pode achatar a fidelidade do shot.
};

// ── Perfis de interceptação para previsão da IA ────────────────────────────
export const INTERCEPTACAO_PADRAO = Object.freeze({
  altura_contato_ideal: 0.75,
  altura_contato_min: 0.45,
  altura_contato_max: 1.20,
  faixa_contato: 0.32,
  tolerancia_y: 1.35,
  janela_atraso: 0.78,
  bonus_subida: 0.16,
  penalidade_descida: 0.18,
  bonus_bola_baixa: 0.04,
});

export const INTERCEPTACAO_SUPERFICIE = Object.freeze({
  GRAMA: Object.freeze({
    altura_contato_ideal: 0.58,
    altura_contato_min: 0.32,
    altura_contato_max: 0.95,
    faixa_contato: 0.24,
    tolerancia_y: 1.05,
    janela_atraso: 0.42,
    bonus_subida: 0.26,
    penalidade_descida: 0.32,
    bonus_bola_baixa: 0.18,
  }),
  INDOOR: Object.freeze({
    altura_contato_ideal: 0.63,
    altura_contato_min: 0.36,
    altura_contato_max: 1.02,
    faixa_contato: 0.26,
    tolerancia_y: 1.10,
    janela_atraso: 0.46,
    bonus_subida: 0.23,
    penalidade_descida: 0.28,
    bonus_bola_baixa: 0.13,
  }),
  DURA: Object.freeze({
    altura_contato_ideal: 0.74,
    altura_contato_min: 0.42,
    altura_contato_max: 1.16,
    faixa_contato: 0.30,
    tolerancia_y: 1.25,
    janela_atraso: 0.60,
    bonus_subida: 0.18,
    penalidade_descida: 0.20,
    bonus_bola_baixa: 0.06,
  }),
  SAIBRO: Object.freeze({
    altura_contato_ideal: 0.92,
    altura_contato_min: 0.50,
    altura_contato_max: 1.34,
    faixa_contato: 0.36,
    tolerancia_y: 1.50,
    janela_atraso: 0.92,
    bonus_subida: 0.10,
    penalidade_descida: 0.10,
    bonus_bola_baixa: -0.04,
  }),
});

export function normalizarSuperficie(nome) {
  switch ((nome ?? 'DURA').toUpperCase()) {
    case 'HARD':
    case 'DURA':
      return 'DURA';
    case 'GRASS':
    case 'GRAMA':
      return 'GRAMA';
    case 'CLAY':
    case 'SAIBRO':
      return 'SAIBRO';
    case 'INDOOR':
      return 'INDOOR';
    default:
      return 'DURA';
  }
}

export function getConfigSuperficie(nome) {
  return SUPERFICIE[normalizarSuperficie(nome)] ?? SUPERFICIE.DURA;
}

export function getPerfilInterceptacao(nome) {
  return INTERCEPTACAO_SUPERFICIE[normalizarSuperficie(nome)] ?? INTERCEPTACAO_SUPERFICIE.DURA;
}

