// SHOTS_CONFIG.js
// ============================================================================
// Blueprint completo dos golpes.
//
// Cada shot tem duas camadas:
// 1. envelope físico  -> velocidade, altura de contato, margem de rede, profundidade
// 2. dispersão/erro   -> o que acontece quando a qualidade de execução cai
//
// Objetivo: deixar cada golpe "legível" num lugar só.
// ============================================================================

function criarBlueprintShot({
  id,
  nome,
  ligado = true,
  isolar = false,
  familia,
  descricao,
  velocidade,
  altura_contato,
  margem_rede,
  profundidade,
  spin_x,
  spin_z,
  spin_tipo,
  dispersao,
}) {
  return {
    id,
    nome,
    ligado,
    isolar,
    familia,
    descricao,
    fisica: {
      velocidade,
      // Helper: subir este range deixa o golpe mais veloz; descer faz a bola
      // chegar mais "leve" e menos agressiva.
      altura_contato,
      // Helper: regula em que faixa de altura o golpe nasce melhor.
      margem_rede,
      // Helper: subir este range compra segurança na rede; descer deixa o
      // golpe mais rente e agressivo.
      profundidade,
      // Helper: subir o range empurra o alvo para mais perto da baseline.
      spin_x,
      spin_z,
      spin_tipo,
    },
    dispersao: {
      ...dispersao,
      // Helper geral:
      // - `sigma_base`  = erro inerente que existe mesmo com boa execução
      // - `sigma_lateral_max` = spray lateral quando a qualidade cai
      // - `sigma_angulo_max`  = ruído vertical que vira rede/bola longa
      // - `qualidade_erro`    = a partir daqui o erro começa a aparecer forte
    },
  };
}

export const SHOTS_CONFIG = {
  SAFE: criarBlueprintShot({
    id: 'SAFE',
    nome: 'Safe',
    familia: 'rally',
    descricao: 'Bola de segurança. Menos pace, mais margem, ideal para sobreviver e recolocar no ponto.',
    velocidade: [19.4, 26.4],
    altura_contato: [0.70, 1.00],
    margem_rede: [0.70, 1.20],
    profundidade: [0.55, 0.72],
    spin_x: (sm, svy) => -sm * 0.8 * Math.sign(svy),
    spin_z: (sm) => sm * 0.12,
    spin_tipo: 1,
    dispersao: {
      sigma_base: 0.08,
      sigma_lateral_max: 0.52,
      sigma_angulo_max: 3.2,
      qualidade_erro: 0.42,
      risco_direcional: { CC: 1.0, DTL: 1.3, WIDE: 1.6 },
    },
  }),

  TOPSPIN: criarBlueprintShot({
    id: 'TOPSPIN',
    nome: 'Topspin',
    familia: 'rally',
    descricao: 'Golpe pesado de pressão e finalização com margem. Menos seco que accel, mas com muito spin, quique e segurança vertical.',
    velocidade: [28.8, 38.4],
    altura_contato: [0.70, 1.00],
    margem_rede: [0.58, 1.04],
    profundidade: [0.62, 0.90],
    spin_x: (sm, svy) => -sm * 1.42 * Math.sign(svy),
    spin_z: (sm) => sm * 0.26,
    spin_tipo: 1,
    dispersao: {
      sigma_base: 0.15,
      sigma_lateral_max: 0.72,
      sigma_angulo_max: 4.5,
      qualidade_erro: 0.55,
      risco_direcional: { CC: 1.0, DTL: 1.6, WIDE: 2.2 },
    },
  }),

  SLICE: criarBlueprintShot({
    id: 'SLICE',
    nome: 'Slice',
    familia: 'rally',
    descricao: 'Variação de ritmo e defesa. Sai baixo, viaja com backspin e tenta morrer no quique.',
    velocidade: [26.8, 36.2],
    altura_contato: [0.38, 0.66],
    margem_rede: [0.04, 0.20],
    profundidade: [0.55, 0.86],
    spin_x: (sm, svy) => sm * 0.88 * Math.sign(svy),
    spin_z: (sm) => sm * 0.08,
    spin_tipo: -1,
    dispersao: {
      sigma_base: 0.09,
      sigma_lateral_max: 0.65,
      sigma_angulo_max: 3.5,
      qualidade_erro: 0.48,
      risco_direcional: { CC: 1.0, DTL: 1.4, WIDE: 1.8 },
    },
  }),

  DROP: criarBlueprintShot({
    id: 'DROP',
    nome: 'Drop',
    familia: 'toque',
    descricao: 'Bola curta de finesse. Precisa limpar a rede por pouco e morrer cedo no quique.',
    velocidade: [13.8, 21.6],
    altura_contato: [0.32, 0.52],
    margem_rede: [0.16, 0.34],
    profundidade: [0.24, 0.42],
    spin_x: (sm, svy) => sm * 3.4 * Math.sign(svy),
    spin_z: (sm) => sm * 0.04,
    spin_tipo: -1,
    dispersao: {
      sigma_base: 0.12,
      sigma_lateral_max: 0.45,
      sigma_angulo_max: 9.0,
      qualidade_erro: 0.62,
      risco_direcional: { CC: 1.0, DTL: 1.2, WIDE: 1.6 },
    },
  }),

  LOB: criarBlueprintShot({
    id: 'LOB',
    nome: 'Lob',
    familia: 'altura',
    descricao: 'Arco alto para escapar da rede ou castigar quem entrou demais.',
    velocidade: [13.9, 27.8],
    altura_contato: [0.80, 1.20],
    margem_rede: [5.20, 6.50],
    profundidade: [0.85, 0.95],
    spin_x: (sm, svy) => -sm * 1.0 * Math.sign(svy),
    spin_z: (sm) => sm * 0.15,
    spin_tipo: 1,
    dispersao: {
      sigma_base: 0.11,
      sigma_lateral_max: 0.70,
      sigma_angulo_max: 2.25,
      qualidade_erro: 0.40,
      risco_direcional: { CC: 1.0, DTL: 1.2, WIDE: 1.5 },
    },
  }),

  ACCEL: criarBlueprintShot({
    id: 'ACCEL',
    nome: 'Accel',
    familia: 'agressao',
    descricao: 'Aceleração real para pressionar ou fechar ponto. Mais reta, mais pesada e mais rápida que topspin, com pouco spin e pouca margem.',
    velocidade: [37.2, 50.8],
    altura_contato: [0.78, 0.96],
    margem_rede: [0.08, 0.24],
    profundidade: [0.70, 0.96],
    spin_x: (sm, svy) => -sm * 0.18 * Math.sign(svy),
    spin_z: () => 0,
    spin_tipo: 0,
    dispersao: {
      sigma_base: 0.24,
      sigma_lateral_max: 1.05,
      sigma_angulo_max: 6.8,
      qualidade_erro: 0.72,
      risco_direcional: { CC: 1.0, DTL: 1.8, WIDE: 2.45 },
    },
  }),

  DRIVE: criarBlueprintShot({
    id: 'DRIVE',
    nome: 'Drive',
    familia: 'rally',
    descricao: 'Golpe de ritmo médio-alto, quase plano. Faz a ponte entre topspin e winner.',
    velocidade: [31.0, 41.8],
    altura_contato: [0.70, 1.00],
    margem_rede: [0.20, 0.46],
    profundidade: [0.62, 0.86],
    spin_x: (sm, svy) => -sm * 0.42 * Math.sign(svy),
    spin_z: (sm) => sm * 0.08,
    spin_tipo: 0,
    dispersao: {
      sigma_base: 0.18,
      sigma_lateral_max: 0.78,
      sigma_angulo_max: 4.8,
      qualidade_erro: 0.58,
      risco_direcional: { CC: 1.0, DTL: 1.55, WIDE: 2.0 },
    },
  }),

  HALF_VOLLEY: criarBlueprintShot({
    id: 'HALF_VOLLEY',
    nome: 'Half Volley',
    familia: 'transicao',
    descricao: 'Bloqueio imediato após o quique. Golpe de pés, reação e controle curto.',
    velocidade: [16.7, 30.6],
    altura_contato: [0.08, 0.28],
    margem_rede: [0.08, 0.26],
    profundidade: [0.42, 0.76],
    spin_x: (sm, svy) => sm * 1.0 * Math.sign(svy),
    spin_z: (sm) => sm * 0.04,
    spin_tipo: -1,
    dispersao: {
      sigma_base: 0.20,
      sigma_lateral_max: 0.90,
      sigma_angulo_max: 6.5,
      qualidade_erro: 0.72,
      risco_direcional: { CC: 1.0, DTL: 1.6, WIDE: 2.0 },
    },
  }),

  SHORT_ACCEL: criarBlueprintShot({
    id: 'SHORT_ACCEL',
    nome: 'Short Accel',
    familia: 'angulo',
    descricao: 'Aceleração curta com ângulo forte. Troca profundidade por abertura de quadra.',
    velocidade: [34.8, 45.8],
    altura_contato: [0.72, 0.98],
    margem_rede: [0.14, 0.34],
    profundidade: [0.36, 0.64],
    spin_x: (sm, svy) => -sm * 0.58 * Math.sign(svy),
    spin_z: (sm) => sm * 0.42,
    spin_tipo: 0,
    dispersao: {
      sigma_base: 0.17,
      sigma_lateral_max: 0.78,
      sigma_angulo_max: 5.2,
      qualidade_erro: 0.62,
      risco_direcional: { CC: 1.0, DTL: 1.5, WIDE: 2.4 },
    },
  }),

  BANANA: criarBlueprintShot({
    id: 'BANANA',
    nome: 'Banana',
    familia: 'spin',
    descricao: 'Trivela forte para frente: bola agressiva com alta curva lateral, não um lob de spin.',
    velocidade: [35.4, 46.8],
    altura_contato: [0.68, 0.92],
    margem_rede: [0.13, 0.32],
    profundidade: [0.58, 0.84],
    spin_x: (sm, svy) => -sm * 0.22 * Math.sign(svy),
    spin_z: (sm) => sm * 2.25,
    spin_tipo: 0,
    dispersao: {
      sigma_base: 0.16,
      sigma_lateral_max: 0.70,
      sigma_angulo_max: 4.5,
      qualidade_erro: 0.62,
      risco_direcional: { CC: 1.2, DTL: 1.4, WIDE: 2.4 },
    },
  }),

  SLICE_SHORT: criarBlueprintShot({
    id: 'SLICE_SHORT',
    nome: 'Slice Short',
    familia: 'variacao',
    descricao: 'Slice curto de meia-quadra. Não é drop: ainda anda um pouco, mas força avanço.',
    velocidade: [18.1, 27.8],
    altura_contato: [0.38, 0.64],
    margem_rede: [0.10, 0.24],
    profundidade: [0.30, 0.50],
    spin_x: (sm, svy) => sm * 1.45 * Math.sign(svy),
    spin_z: (sm) => sm * 0.06,
    spin_tipo: -1,
    dispersao: {
      sigma_base: 0.09,
      sigma_lateral_max: 0.58,
      sigma_angulo_max: 4.0,
      qualidade_erro: 0.52,
      risco_direcional: { CC: 1.0, DTL: 1.4, WIDE: 1.8 },
    },
  }),

  VOLLEY: criarBlueprintShot({
    id: 'VOLLEY',
    nome: 'Volley',
    familia: 'rede',
    descricao: 'Interceptação na rede. Técnica quando plantado, caótica quando em reflexo.',
    velocidade: [16.7, 36.1],
    altura_contato: [1.00, 1.50],
    margem_rede: [0.20, 0.50],
    profundidade: [0.62, 0.82],
    spin_x: (sm, svy) => sm * 0.5 * Math.sign(svy),
    spin_z: (sm) => sm * 0.30,
    spin_tipo: 0,
    dispersao: {
      sigma_base: 0.10,
      sigma_lateral_max: 0.60,
      sigma_angulo_max: 4.0,
      qualidade_erro: 0.58,
      risco_direcional: { CC: 1.0, DTL: 1.5, WIDE: 2.0 },
      reflex_sigma_lateral_mult: 2.2,
      reflex_sigma_angulo_mult: 2.3,
    },
  }),

  SMASH: criarBlueprintShot({
    id: 'SMASH',
    nome: 'Smash',
    familia: 'overhead',
    descricao: 'Overhead para matar o ponto. Muito pace, mas exige alinhamento corporal e timing.',
    velocidade: [38.9, 48.6],
    altura_contato: [2.40, 2.90],
    margem_rede: [0.30, 0.60],
    profundidade: [0.80, 0.92],
    spin_x: (sm, svy) => -sm * 0.3 * Math.sign(svy),
    spin_z: (sm) => sm * 0.10,
    spin_tipo: 0,
    dispersao: {
      sigma_base: 0.12,
      sigma_lateral_max: 0.72,
      sigma_angulo_max: 5.5,
      qualidade_erro: 0.68,
      risco_direcional: { CC: 1.0, DTL: 1.3, WIDE: 1.8 },
    },
  }),

  _DEFAULT: criarBlueprintShot({
    id: '_DEFAULT',
    nome: 'Default',
    familia: 'fallback',
    descricao: 'Fallback explícito para qualquer shot não mapeado.',
    velocidade: [22.0, 32.0],
    altura_contato: [0.70, 1.00],
    margem_rede: [0.40, 0.80],
    profundidade: [0.55, 0.80],
    spin_x: (sm, svy) => -sm * 0.8 * Math.sign(svy),
    spin_z: (sm) => sm * 0.12,
    spin_tipo: 1,
    dispersao: {
      sigma_base: 0.10,
      sigma_lateral_max: 0.65,
      sigma_angulo_max: 4.5,
      qualidade_erro: 0.65,
      risco_direcional: { CC: 1.0, DTL: 1.6, WIDE: 2.0 },
    },
  }),
};

export const SHOT_ALIASES = {
  NORMAL: 'TOPSPIN',
  SHORT: 'TOPSPIN',
  FLAT: 'ACCEL',
  HEAVY_TOP: 'TOPSPIN',
  PASSING: 'ACCEL',
  DEF_LOB: 'LOB',
  AGG_LOB: 'LOB',
  LOB_DEF: 'LOB',
  LOB_ATK: 'LOB',
  SHORT_ANGLE: 'SHORT_ACCEL',
};

// DISPERSAO_ALIAS_OVERRIDES foi removido.
// Dispersão individual de Q baixa por shot era débito técnico: 7 entradas manuais
// (FLAT, HEAVY_TOP, PASSING, SHORT_ANGLE, DROP2, LOB_DEF, LOB_ATK) que precisavam
// ser retuned toda vez que a física de um golpe mudava.
//
// O comportamento em Q baixa agora é gerido pelo sistema de degradação em duas camadas
// no ballOutputEngine (Camada 1 — dispersão lerped) e no shotDecision (Camada 2 — colapso físico).
// Todos os shots convergem para DEGRADACAO_CONFIG.DISPERSAO_ERRO_BASE conforme Q cai,
// com Controle e Defesa atuando nos momentos certos do pipeline.
//
// Os parâmetros individuais (sigma_base, sigma_lateral_max, etc.) nos shots acima
// continuam definindo a dispersão da versão BOA de cada golpe — intactos.

function clonarRiscoDirecional(risco) {
  return { CC: risco.CC, DTL: risco.DTL, WIDE: risco.WIDE };
}

export function getShotBlueprint(shotType) {
  const canonical = SHOT_ALIASES[shotType] ?? shotType;
  return SHOTS_CONFIG[canonical] ?? SHOTS_CONFIG._DEFAULT;
}

export function getShotPhysicsEnvelope(shotType) {
  const blueprint = getShotBlueprint(shotType);
  return {
    pow: blueprint.fisica.velocidade,
    hitH: blueprint.fisica.altura_contato,
    clr: blueprint.fisica.margem_rede,
    depth: blueprint.fisica.profundidade,
    spinFn: blueprint.fisica.spin_x,
    spinZ: blueprint.fisica.spin_z,
  };
}

export function getShotDispersaoConfig(shotType) {
  const dispersao = getShotBlueprint(shotType).dispersao;
  return {
    sigmaBase: dispersao.sigma_base,
    sigmaLateralMax: dispersao.sigma_lateral_max,
    sigmaAnguloMax: dispersao.sigma_angulo_max,
    qualidadeErro: dispersao.qualidade_erro,
    dirRisk: clonarRiscoDirecional(dispersao.risco_direcional),
    reflexSigmaXMult: dispersao.reflex_sigma_lateral_mult,
    reflexSigmaAMult: dispersao.reflex_sigma_angulo_mult,
  };
}

export function getShotSpinTipo(shotType) {
  return getShotBlueprint(shotType).fisica.spin_tipo;
}

export function isShotBlueprintLigado(shotType) {
  return getShotBlueprint(shotType).ligado !== false;
}

export function isShotBlueprintIsolado(shotType) {
  return getShotBlueprint(shotType).isolar === true;
}
