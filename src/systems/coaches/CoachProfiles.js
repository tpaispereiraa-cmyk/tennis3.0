/**
 * CoachProfiles.js
 * ─────────────────────────────────────────────────────────────────
 * Define os atributos numéricos (0–100) dos técnicos, suas funções
 * de geração e os multiplicadores que cada atributo aplica nos
 * sistemas de desenvolvimento e instruções em partida.
 *
 * Exports principais:
 *   COACH_ATTR_CATEGORIES       → categorias de atributos para UI
 *   generateCoachAttrs(opts?)   → objeto { attrKey: 0–100 }
 *   getTrainingMult(coachAttrs, attrKey)       → 1.0–1.25 (escala boost de filosofia, nunca penaliza)
 *   getPotentialMult(coachAttrs, playerAge)    → 1.0–3.0  (boom under-23 apenas)
 *   getStabilizeMult(coachAttrs)               → 0.65–1.0 (reduz declínio)
 *   getReadingMult(coachAttrs, readKey)        → 0.60–1.40 (escala EV das instruções)
 *   getSurfaceBonus(coach, surface)            → 0 | 3 (bônus flat de performance no piso)
 */

// ═══════════════════════════════════════════════════════════════════
// CATEGORIAS DE ATRIBUTOS
// ═══════════════════════════════════════════════════════════════════

/**
 * Mapeamento de attrKey de jogador → categoria de treino do técnico.
 * Usado por getTrainingMult para saber qual atributo de treino escala cada attr.
 */
export const PLAYER_ATTR_TO_TRAINING = {
  // CORPO → treinoFisico
  velocidade:        'treinoFisico',
  explosividade:     'treinoFisico',
  agilidadeLateral:  'treinoFisico',
  resistencia:       'treinoFisico',
  alcance:           'treinoFisico',
  // GOLPES → treinoGolpes
  fhPotencia:        'treinoGolpes',
  bhPotencia:        'treinoGolpes',
  consistencia:      'treinoGolpes',
  topspin:           'treinoGolpes',
  slice:             'treinoGolpes',
  // SAQUE → treinoSaque
  srv1Vel:           'treinoSaque',
  srv1Prec:          'treinoSaque',
  srv2Efeito:        'treinoSaque',
  devolucaoSaque:    'treinoSaque',
  // ESPECIAIS → treinoEspeciais
  dropShot:          'treinoEspeciais',
  lobDef:            'treinoEspeciais',
  lobAtk:            'treinoEspeciais',
  smash:             'treinoEspeciais',
  passing:           'treinoEspeciais',
  // REDE → treinoRede
  volley:            'treinoRede',
  instintoRede:      'treinoRede',
  reflexo:           'treinoRede',
  coberturaLob:      'treinoRede',
  // MENTAL → treinoMental
  mentalidade:       'treinoMental',
  recuperacao:       'treinoMental',
  paciencia:         'treinoMental',
  agresDecisoria:    'treinoMental',
  leituraDeJogo:     'treinoMental',
};

/**
 * Definição das categorias de atributos do técnico para UI.
 * Espelha o formato de ATTR_CATEGORIES em players.js.
 */
export const COACH_ATTR_CATEGORIES = [
  {
    id: 'leituraGolpe',
    label: 'LEITURA DE GOLPE',
    color: '#F06428',
    glow: 'rgba(240,100,40,.15)',
    description: 'Capacidade de ler golpes do pupilo e do adversário — quanto maior, mais precisas as instruções táticas em partida.',
    attrs: [
      {
        key: 'leituraGolpePupilo',
        label: 'Leitura do Pupilo',
        note: 'Identifica o que está funcionando nos golpes do pupilo e reforça o padrão correto',
      },
      {
        key: 'leituraGolpeAdv',
        label: 'Leitura do Adversário',
        note: 'Detecta padrões, lado fraco e golpes recorrentes do oponente',
      },
    ],
  },
  {
    id: 'leituraPosicao',
    label: 'LEITURA DE POSICIONAMENTO',
    color: '#2860A8',
    glow: 'rgba(40,96,168,.15)',
    description: 'Capacidade de ler e ajustar o posicionamento em quadra — do pupilo e do adversário.',
    attrs: [
      {
        key: 'leituraPosicaoPupilo',
        label: 'Posicionamento Pupilo',
        note: 'Corrige erros de posição: pupilo avançando demais, recuando cedo, linha de fundo incorreta',
      },
      {
        key: 'leituraPosicaoAdv',
        label: 'Posicionamento Adversário',
        note: 'Explora buracos no campo adversário, força movimentação desfavorável',
      },
    ],
  },
  {
    id: 'desenvolvimento',
    label: 'DESENVOLVIMENTO',
    color: '#22c55e',
    glow: 'rgba(34,197,94,.14)',
    description: 'Influência direta na evolução e preservação da carreira do pupilo.',
    attrs: [
      {
        key: 'desbloqueaPotencial',
        label: 'Desbloqueia Potencial',
        note: 'Acelera o crescimento de jovens — quanto maior, mais rápido o pupilo atinge seu teto',
      },
      {
        key: 'estabilizaIdade',
        label: 'Estabiliza a Idade',
        note: 'Segura o declínio físico — não para o tempo, mas preserva os atributos por mais temporadas',
      },
    ],
  },
  {
    id: 'treinamento',
    label: 'TREINAMENTO',
    color: '#E8C84A',
    glow: 'rgba(232,200,74,.13)',
    description: 'Qualidade do treino por área — escala o boost de filosofia em cada categoria de atributo do jogador.',
    attrs: [
      { key: 'treinoFisico',    label: 'Físico',    note: 'Velocidade, resistência, agilidade e explosividade' },
      { key: 'treinoMental',    label: 'Mental',    note: 'Mentalidade, paciência, leitura de jogo e agressividade decisória' },
      { key: 'treinoGolpes',    label: 'Golpes',    note: 'Forehand, backhand, consistência, topspin e slice' },
      { key: 'treinoRede',      label: 'Rede',      note: 'Volley, instinto de rede, reflexo e cobertura de lob' },
      { key: 'treinoEspeciais', label: 'Especiais', note: 'Drop shot, lob, smash e passing shot' },
      { key: 'treinoSaque',     label: 'Saque',     note: '1º saque, 2º saque, precisão e devolução' },
    ],
  },
];

// ═══════════════════════════════════════════════════════════════════
// TODOS OS ATTR KEYS DO TÉCNICO
// ═══════════════════════════════════════════════════════════════════

export const ALL_COACH_ATTR_KEYS = COACH_ATTR_CATEGORIES.flatMap(cat =>
  cat.attrs.map(a => a.key)
);

// ═══════════════════════════════════════════════════════════════════
// GERAÇÃO DE ATRIBUTOS
// ═══════════════════════════════════════════════════════════════════

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Perfis de geração por faixa de reputação.
 * Rep alta → técnico costuma ter attrs também altos, mas com variância.
 */
const REP_PROFILES = [
  { minRep: 75, base: [45, 75], variance: 25 }, // elite: attrs razoavelmente altos
  { minRep: 45, base: [25, 55], variance: 30 }, // médio: bem variado
  { minRep:  0, base: [10, 40], variance: 20 }, // baixo: geralmente fraco
];

/**
 * Bônus por filosofia: técnicos tendem a ser melhores nos atributos
 * alinhados com sua filosofia natural.
 */
const PHILOSOPHY_ATTR_BONUS = {
  OFFENSIVE: {
    treinoGolpes: 15, treinoSaque: 12, leituraGolpeAdv: 10,
  },
  DEFENSIVE: {
    treinoFisico: 12, treinoMental: 10, leituraPosicaoPupilo: 12,
  },
  COMPLETE: {
    desbloqueaPotencial: 8, estabilizaIdade: 8,
  },
  SPECIALIST: {
    leituraPosicaoAdv: 15, leituraGolpeAdv: 12,
  },
  MENTAL: {
    treinoMental: 18, desbloqueaPotencial: 12, estabilizaIdade: 10,
  },
};

/**
 * Bônus por persona: cada persona tende a ser melhor nos attrs
 * alinhados com sua forma de trabalhar.
 */
const PERSONA_ATTR_BONUS = {
  GENERAL:          { treinoFisico: 10, treinoMental: 8 },
  MENTOR_PATERNAL:  { desbloqueaPotencial: 14, treinoMental: 8 },
  ANALITICO_FRIO:   { leituraGolpeAdv: 16, leituraPosicaoAdv: 12 },
  MOTIVADOR_PURO:   { treinoMental: 16, desbloqueaPotencial: 8 },
  MISTICO:          { treinoMental: 20, leituraPosicaoPupilo: 10 },
  AMIGO_CUMPLICE:   { leituraGolpePupilo: 12, leituraPosicaoPupilo: 10 },
  INOVADOR_TECNICO: { treinoGolpes: 16, treinoSaque: 12 },
  VETERANO_SECO:    { leituraGolpeAdv: 12, estabilizaIdade: 16 },
};

/**
 * Gera os atributos numéricos de um técnico.
 *
 * @param {object} opts
 * @param {number} [opts.reputation=50]    — reputação do técnico (0–100)
 * @param {string} [opts.philosophy]       — filosofia para bônus de alinhamento
 * @param {string} [opts.origin]           — 'GENERATED' | 'RETIRED_PLAYER'
 * @param {string} [opts.persona]          — persona para bônus de personalidade
 * @param {number} [opts.careerPeakRank]   — para ex-jogadores: pico de ranking
 * @param {number} [opts.careerSlams]      — para ex-jogadores: slams conquistados
 * @returns {object} { attrKey: 0–100 }
 */
export function generateCoachAttrs(opts = {}) {
  const rep       = opts.reputation   ?? 50;
  const phil      = opts.philosophy   ?? 'COMPLETE';
  const origin    = opts.origin       ?? 'GENERATED';
  const persona   = opts.persona      ?? null;

  // Seleciona perfil de geração pela reputação
  const profile = REP_PROFILES.find(p => rep >= p.minRep) ?? REP_PROFILES[REP_PROFILES.length - 1];

  const attrs = {};

  for (const key of ALL_COACH_ATTR_KEYS) {
    const base   = randInt(profile.base[0], profile.base[1]);
    const jitter = randInt(-profile.variance / 2, profile.variance / 2);
    attrs[key]   = Math.min(99, Math.max(1, base + jitter));
  }

  // Aplica bônus por filosofia
  const philBonus = PHILOSOPHY_ATTR_BONUS[phil] ?? {};
  for (const [key, val] of Object.entries(philBonus)) {
    if (attrs[key] !== undefined) {
      attrs[key] = Math.min(99, attrs[key] + randInt(0, val));
    }
  }

  // Aplica bônus por persona
  if (persona) {
    const personaBonus = PERSONA_ATTR_BONUS[persona] ?? {};
    for (const [key, val] of Object.entries(personaBonus)) {
      if (attrs[key] !== undefined) {
        attrs[key] = Math.min(99, attrs[key] + randInt(0, val));
      }
    }
  }

  // Ex-jogadores ganham bônus nas leituras baseados na carreira
  if (origin === 'RETIRED_PLAYER') {
    const slamBonus  = Math.min(20, (opts.careerSlams ?? 0) * 5);
    const rankBonus  = (opts.careerPeakRank ?? 999) <= 5  ? 15
                     : (opts.careerPeakRank ?? 999) <= 20 ? 8
                     : (opts.careerPeakRank ?? 999) <= 50 ? 4 : 0;

    const playerBonus = slamBonus + rankBonus;
    attrs.leituraGolpePupilo   = Math.min(99, attrs.leituraGolpePupilo   + playerBonus);
    attrs.leituraGolpeAdv      = Math.min(99, attrs.leituraGolpeAdv      + playerBonus);
    attrs.desbloqueaPotencial  = Math.min(99, attrs.desbloqueaPotencial  + Math.round(playerBonus * 0.6));
  }

  return attrs;
}

// ═══════════════════════════════════════════════════════════════════
// MULTIPLICADORES
// ═══════════════════════════════════════════════════════════════════

/**
 * Retorna o multiplicador de treino para um attrKey de jogador.
 * Escala o boost de filosofia — substitui o 1.25 fixo do DevelopmentSystem.
 *
 * Range: 0.75× (attr=0) → 1.25× (attr=100)
 * Neutro em attr=50: ~1.0×
 *
 * @param {object} coachAttrs — coach.coachAttrs
 * @param {string} playerAttrKey — ex: 'fhPotencia'
 * @returns {number}
 */
/**
 * Retorna o multiplicador de treino para um attrKey de jogador.
 * Escala o boost de filosofia — parte de 1.0 (neutro) e sobe até 1.25.
 * Nunca penaliza: um coach ruim não é pior do que sem coach.
 *
 * Range: 1.0× (attr=0) → 1.25× (attr=100)
 *
 * @param {object} coachAttrs — coach.coachAttrs
 * @param {string} playerAttrKey — ex: 'fhPotencia'
 * @returns {number}
 */
export function getTrainingMult(coachAttrs, playerAttrKey) {
  if (!coachAttrs) return 1.0;
  const trainingKey = PLAYER_ATTR_TO_TRAINING[playerAttrKey];
  if (!trainingKey) return 1.0;
  const val = coachAttrs[trainingKey] ?? 50;
  return 1.0 + (val / 100) * 0.25; // 1.0 → 1.25
}

/**
 * Retorna o multiplicador de desbloqueio de potencial.
 * Só age em jogadores jovens (playerAge < 23).
 * Representa o "boom" de crescimento que um técnico dá a um jovem talento.
 *
 * Range: 1.0× (attr=0 ou sem coach) → 1.8× (attr=100) — APENAS under-23
 * Após 23 anos: sempre 1.0× (jogador se desenvolve pelo próprio potencial)
 *
 * @param {object} coachAttrs
 * @param {number} playerAge
 * @returns {number}
 */
export function getPotentialMult(coachAttrs, playerAge = 25) {
  // Após os 23 anos o coach não mais acelera o desenvolvimento — potencial próprio
  if (playerAge >= 23) return 1.0;
  if (!coachAttrs) return 1.0;
  const val = coachAttrs.desbloqueaPotencial ?? 0;
  // Escala suavemente com a idade: quanto mais jovem, mais impacto
  const ageFactor = Math.max(0, (23 - playerAge) / 7); // 1.0 aos 16, 0.0 aos 23
  return 1.0 + (val / 100) * 0.8 * ageFactor; // 1.0 → até 1.8× (aos 16 com attr=100)
}

/**
 * Retorna o multiplicador de estabilização de idade.
 * Aplicado no declínio: reduz o delta negativo de cada atributo.
 *
 * Range: 1.00× (attr=0) → 0.65× (attr=100) — menor = menos declínio
 *
 * @param {object} coachAttrs
 * @returns {number}
 */
export function getStabilizeMult(coachAttrs) {
  if (!coachAttrs) return 1.0;
  const val = coachAttrs.estabilizaIdade ?? 50;
  return 1.0 - (val / 100) * 0.35; // 1.00 → 0.65
}

/**
 * Retorna o multiplicador de leitura para uma chave específica.
 * Escala o EV boost/penalty das instruções táticas em partida.
 *
 * Range: 0.60× (attr=0) → 1.40× (attr=100)
 * Neutro em attr=50: ~1.0×
 *
 * readKey pode ser:
 *   'leituraGolpePupilo' | 'leituraGolpeAdv'
 *   'leituraPosicaoPupilo' | 'leituraPosicaoAdv'
 *
 * @param {object} coachAttrs
 * @param {string} readKey
 * @returns {number}
 */
export function getReadingMult(coachAttrs, readKey) {
  if (!coachAttrs) return 1.0;
  const val = coachAttrs[readKey] ?? 50;
  return 0.60 + (val / 100) * 0.80; // 0.60 → 1.40
}

/**
 * Retorna o bônus flat de performance no piso de especialidade.
 * Aplicado durante partidas no piso correspondente.
 *
 * @param {object} coach — objeto coach completo
 * @param {string} surface — 'CLAY'|'GRASS'|'HARD'|'INDOOR'
 * @returns {number} 3 se o piso bate, 0 caso contrário
 */
export function getSurfaceBonus(coach, surface) {
  if (!coach?.specialtySurface) return 0;
  return coach.specialtySurface === surface ? 3 : 0;
}

// ═══════════════════════════════════════════════════════════════════
// LABEL E DISPLAY
// ═══════════════════════════════════════════════════════════════════

/**
 * Retorna a nota geral do técnico (média ponderada dos attrs principais).
 * Usado como "OVR" do técnico na UI.
 *
 * @param {object} coachAttrs
 * @returns {number} 0–99
 */
export function coachOverallRating(coachAttrs) {
  if (!coachAttrs) return 0;

  // Pesos refletem importância relativa de cada categoria
  const weighted = [
    { key: 'leituraGolpePupilo',    w: 1.2 },
    { key: 'leituraGolpeAdv',       w: 1.2 },
    { key: 'leituraPosicaoPupilo',w: 1.0 },
    { key: 'leituraPosicaoAdv',     w: 1.0 },
    { key: 'desbloqueaPotencial',   w: 1.5 },
    { key: 'estabilizaIdade',       w: 1.0 },
    { key: 'treinoFisico',          w: 0.8 },
    { key: 'treinoMental',          w: 1.0 },
    { key: 'treinoGolpes',          w: 0.9 },
    { key: 'treinoRede',            w: 0.7 },
    { key: 'treinoEspeciais',       w: 0.6 },
    { key: 'treinoSaque',           w: 0.8 },
  ];

  const totalW = weighted.reduce((s, i) => s + i.w, 0);
  const sum    = weighted.reduce((s, i) => s + (coachAttrs[i.key] ?? 0) * i.w, 0);
  return Math.round(sum / totalW);
}

/**
 * Nota de letra para o OVR do técnico.
 */
export function coachGrade(ovr) {
  if (ovr >= 85) return 'S';
  if (ovr >= 75) return 'A';
  if (ovr >= 65) return 'B';
  if (ovr >= 50) return 'C';
  if (ovr >= 35) return 'D';
  return 'F';
}

