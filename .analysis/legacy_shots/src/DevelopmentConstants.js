/**
 * DevelopmentConstants.js
 * ─────────────────────────────────────────────────────────────────
 * Arquivo de dados puro — sem side effects, sem imports.
 * Exporta todas as constantes do sistema de progressão de carreira.
 *
 * Consumido por:
 *   DevelopmentSystem.js  — lógica de crescimento/declínio
 *   UnifiedPlayerProfile  — exibição de potencial e alcunha
 *   NewgenSystem.js       — geração procedural de jogadores
 */

// ═══════════════════════════════════════════════════════════════════
// 1. CATEGORIAS DE POTENCIAL
// ═══════════════════════════════════════════════════════════════════

export const POTENTIAL_CATEGORIES = {

  GERACIONAL: {
    id:          'GERACIONAL',
    label:       'Geracional',
    shortLabel:  'GER',
    description: 'Destinado a ser o GOAT da era. Um por geração. Risco de não cumprir.',
    ovrCeiling:  99,
    slamPotential: '20+',
    color:       '#FFD700',     // ouro
    rarity:      0.01,          // 1% dos newgens
    sortOrder:   0,
  },

  LENDA: {
    id:          'LENDA',
    label:       'Lenda',
    shortLabel:  'LND',
    description: 'Múltiplos Slams. Hall of Fame certo. Dominância por anos.',
    ovrCeiling:  94,
    slamPotential: '5–15',
    color:       '#E8E8E8',     // prata
    rarity:      0.04,
    sortOrder:   1,
  },

  ELITE: {
    id:          'ELITE',
    label:       'Elite',
    shortLabel:  'ELT',
    description: 'Ganhador de Slam. Top 5 consistente. Carreira sólida.',
    ovrCeiling:  88,
    slamPotential: '1–4',
    color:       '#E8A838',     // bronze dourado
    rarity:      0.10,
    sortOrder:   2,
  },

  CAMPEAO: {
    id:          'CAMPEAO',
    label:       'Campeão',
    shortLabel:  'CAM',
    description: 'Masters e menores títulos. Chegou em finais de Slam.',
    ovrCeiling:  78,
    slamPotential: '0–1',
    color:       '#6CB4E4',     // azul claro
    rarity:      0.20,
    sortOrder:   3,
  },

  COMUM: {
    id:          'COMUM',
    label:       'Comum',
    shortLabel:  'COM',
    description: 'Profissional sólido. Top 50 constante. Sem grandeza.',
    ovrCeiling:  65,
    slamPotential: '0',
    color:       '#A0A0A0',
    rarity:      0.40,
    sortOrder:   4,
  },

  ABAIXO_DA_MEDIA: {
    id:          'ABAIXO_DA_MEDIA',
    label:       'Abaixo da Média',
    shortLabel:  'ABX',
    description: 'Qualificatório. Cannon fodder do circuito.',
    ovrCeiling:  52,
    slamPotential: '0',
    color:       '#707070',
    rarity:      0.25,
    sortOrder:   5,
  },
};

// Ordem de exibição: GERACIONAL → ABAIXO_DA_MEDIA
export const POTENTIAL_ORDER = [
  'GERACIONAL', 'LENDA', 'ELITE', 'CAMPEAO', 'COMUM', 'ABAIXO_DA_MEDIA',
];


// ═══════════════════════════════════════════════════════════════════
// 2. CAREER ARC ARCHETYPES
// ═══════════════════════════════════════════════════════════════════

export const CAREER_ARCS = {

  STEADY: {
    id:          'STEADY',
    label:       'Steady',
    description: 'Crescimento linear. Pico longo. Djokovic, Federer.',
    peakAgeRange:   [27, 31],
    peakDuration:   [60, 96],   // 5–8 anos
    growthRate:     1.0,
    declineRate:    0.6,
    volatility:     0.05,
  },

  VOLATILE: {
    id:          'VOLATILE',
    label:       'Volátil',
    description: 'Talento explosivo, instável. Kyrgios, Tomljanovic.',
    peakAgeRange:   [21, 25],
    peakDuration:   [18, 42],   // 1.5–3.5 anos
    growthRate:     1.4,        // cresce rápido
    declineRate:    1.3,        // declina rápido
    volatility:     0.25,       // alta variância — surpresas positivas e negativas
  },

  EARLY_BLOOMER: {
    id:          'EARLY_BLOOMER',
    label:       'Precoce',
    description: 'No topo cedo. Declina antes dos 30. Hewitt, Safin.',
    peakAgeRange:   [19, 23],
    peakDuration:   [24, 48],   // 2–4 anos
    growthRate:     1.6,        // burst de crescimento inicial
    declineRate:    1.0,
    volatility:     0.10,
  },

  LATE_BLOOMER: {
    id:          'LATE_BLOOMER',
    label:       'Tardio',
    description: 'Pico após os 28. Wawrinka, Stosur.',
    peakAgeRange:   [28, 33],
    peakDuration:   [24, 60],   // 2–5 anos
    growthRate:     0.7,        // cresce devagar no início
    declineRate:    0.8,        // declínio suave (começa mais velho)
    volatility:     0.08,
  },

  // Arco geracional: talento bruto que explode jovem com pico longo
  EXPLOSIVE: {
    id:          'EXPLOSIVE',
    label:       'Explosivo',
    description: 'Fenômeno. Explode jovem, cresce rápido, pico alto e duradouro. Rafael Mauricio.',
    peakAgeRange:   [22, 26],
    peakDuration:   [36, 72],   // 3–6 anos
    growthRate:     1.8,        // cresce mais rápido que EARLY_BLOOMER
    declineRate:    0.7,        // declínio suave — fenômenos duram
    volatility:     0.18,       // alguma variância — talento bruto tem dias ruins
  },
};


// ═══════════════════════════════════════════════════════════════════
// 3. ALCUNHAS
// ═══════════════════════════════════════════════════════════════════
//
// Cada alcunha tem uma `condition(player, ovr)` pura.
//   player = objeto completo do jogador (com attrs, styleId, potential, etc.)
//   ovr    = overallRating já calculado (para evitar dependência circular)
//
// A avaliação percorre a lista em ordem e retorna a PRIMEIRA que o jogador
// satisfaz. Alcunhas são imutáveis — uma vez atribuída, não muda.
//
// Ordem importa: mais específica/rara antes de mais genérica.
// ─────────────────────────────────────────────────────────────────

export const ALCUNHAS = [

  // ── Lendas / raridades ──────────────────────────────────────────
  {
    id: 'GOLDEN_RACKET',
    label: 'Golden Racket',
    description: 'Talento geracional emergindo cedo',
    condition: (p, ovr) => p.potential === 'GERACIONAL' && (2025 - (p.birthYear ?? 2025 - p.age)) <= 22,
  },
  {
    id: 'THE_PRODIGY',
    label: 'The Prodigy',
    description: 'OVR elite antes dos 20 anos',
    condition: (p, ovr) => ovr >= 80 && (2025 - (p.birthYear ?? 2025 - p.age)) <= 20,
  },

  // ── Técnicos especializados ─────────────────────────────────────
  {
    id: 'SERVE_GOD',
    label: 'Serve God',
    description: 'Saque devastador e dominante',
    condition: (p) => (p.attrs.saqueForca ?? 0) >= 92,
  },
  {
    id: 'SORCERER',
    label: 'Sorcerer',
    description: 'Mago das variações — slice e dropshot letais',
    condition: (p) => (p.attrs.slice ?? 0) >= 88 && (p.attrs.leitura ?? 0) >= 85,
  },
  {
    id: 'FOREHAND_FREAK',
    label: 'Forehand Freak',
    description: 'Potência e topspin acima do humano',
    condition: (p) => (p.attrs.fhPotencia ?? 0) >= 92 && (p.attrs.topspin ?? 0) >= 90,
  },
  {
    id: 'GRASS_WIZARD',
    label: 'Grass Wizard',
    description: 'Domina na grama — saque e rede letais',
    condition: (p) => (p.attrs.saqueForca ?? 0) >= 86 && (p.attrs.volley ?? 0) >= 80,
  },
  {
    id: 'CLAY_KING',
    label: 'Clay King',
    description: 'Imperador do saibro — topspin pesado e resistência',
    condition: (p) => (p.attrs.topspin ?? 0) >= 92 && (p.attrs.resistencia ?? 0) >= 80,
  },

  // ── Físicos / atléticos ─────────────────────────────────────────
  {
    id: 'THE_ROCKET',
    label: 'The Rocket',
    description: 'Velocidade e explosividade incomparáveis',
    condition: (p) => (p.attrs.velocidade ?? 0) >= 90 && (p.attrs.explosividade ?? 0) >= 92,
  },
  {
    id: 'TANK',
    label: 'Tank',
    description: 'Corpo e potência de martelada',
    condition: (p) => (p.attrs.fhPotencia ?? 0) >= 94 && (p.attrs.resistencia ?? 0) >= 90,
  },
  {
    id: 'IRON_LEGS',
    label: 'Iron Legs',
    description: 'Resistência de maratonista com velocidade de sprinter',
    condition: (p) => (p.attrs.resistencia ?? 0) >= 92 && (p.attrs.velocidade ?? 0) >= 76,
  },

  // ── Defensivos / mentais ────────────────────────────────────────
  {
    id: 'THE_WALL',
    label: 'The Wall',
    description: 'Retriever de elite — nada passa',
    condition: (p, ovr) => p.styleId === 'RETRIEVER' && ovr >= 72,
  },
  {
    id: 'SILENT_ASSASSIN',
    label: 'Silent Assassin',
    description: 'Clutch e pressão mental de nível olímpico',
    condition: (p) => (p.attrs.mentalidade ?? 0) >= 90 && (p.attrs.regularidade ?? 0) >= 85,
  },

  // ── Narrativos de carreira ──────────────────────────────────────
  {
    id: 'THE_VETERAN',
    label: 'The Veteran',
    description: 'Sobrevivendo ao circuito após os 34',
    condition: (p, ovr) => (2025 - (p.birthYear ?? 2025 - p.age)) >= 34 && ovr >= 72,
  },
  {
    id: 'COMEBACK_KID',
    label: 'Comeback Kid',
    description: 'Ressurgiu após queda no declínio',
    condition: (p) => p._devState?.hadBreakdownRecovery === true,
  },

  // ── Conquistas de carreira ──────────────────────────────────────
  {
    id: 'GOAT_CANDIDATE',
    label: 'GOAT Candidate',
    description: 'Trajetória lendária — entre os maiores da história',
    // careerStats injetado por quem chama assignAlcunha (HOF ou DevelopmentSystem)
    condition: (p, ovr, cs) => (cs?.goatScore?.total ?? 0) >= 600,
  },
  {
    id: 'GRAND_SLAM_CHAMPION',
    label: 'Grand Slam Champion',
    description: 'Completou o Grand Slam — venceu os 4 majors na carreira',
    condition: (p, ovr, cs) => cs?.careerSlam === true,
  },
  {
    id: 'SLAM_COLLECTOR',
    label: 'Slam Collector',
    description: 'Venceu 5 ou mais Grand Slams',
    condition: (p, ovr, cs) => (cs?.gs ?? 0) >= 5,
  },
  {
    id: 'SLAM_KING',
    label: 'Slam King',
    description: 'Venceu 10 ou mais Grand Slams',
    condition: (p, ovr, cs) => (cs?.gs ?? 0) >= 10,
  },
  {
    id: 'DYNASTY_BUILDER',
    label: 'Dynasty Builder',
    description: 'Venceu o mesmo Slam 3 ou mais vezes',
    // cs.gsYears: { [slamId]: [anos] }
    condition: (p, ovr, cs) => {
      if (!cs?.gsYears) return false;
      return Object.values(cs.gsYears).some(years => (years?.length ?? 0) >= 3);
    },
  },
  {
    id: 'NO1_DYNASTY',
    label: 'No.1 Dynasty',
    description: 'Liderou o ranking por 3 ou mais temporadas',
    condition: (p, ovr, cs) => (cs?.yearsAsNo1?.length ?? 0) >= 3,
  },
  {
    id: 'IRON_CHAMPION',
    label: 'Iron Champion',
    description: 'Domínio físico e mental: Masters + consistência no top 10',
    condition: (p, ovr, cs) => (cs?.masters ?? 0) >= 5 && (cs?.top10Months ?? 0) >= 60,
  },
];

// Lookup rápido por id
export const ALCUNHA_BY_ID = Object.fromEntries(ALCUNHAS.map(a => [a.id, a]));


// ═══════════════════════════════════════════════════════════════════
// 4. CONFIGURAÇÃO GERAL DE DESENVOLVIMENTO
// ═══════════════════════════════════════════════════════════════════

export const DEVELOPMENT_CONFIG = {

  // ── Crescimento ──────────────────────────────────────────────────
  // Pontos de atributo acumulados por mês (via attrGrowthAccum)
  // Reduzido de 2.0 → 1.2: o delta bruto era alto demais, fazendo todos chegarem ao teto.
  BASE_GROWTH_PER_MONTH: 1.2,

  // Nº de atributos que recebem crescimento por mês (sorteados)
  // v3: reduzido de 3-7 → 2-4 para manter proporção com 14 attrs (era calibrado para 28).
  // 2-4 de 14 = ~21-29% dos attrs por mês — mesma proporção que 3-7 de 28.
  ATTRS_GROWING_PER_MONTH_MIN: 2,
  ATTRS_GROWING_PER_MONTH_MAX: 4,

  // Acima do ovrCeiling do potencial: crescimento quase zero
  ABOVE_CEILING_GROWTH_MULTIPLIER: 0.02,

  // ── Teto pessoal (ovrTarget) ──────────────────────────────────────
  // Cada jogador tem um teto INDIVIDUAL, sorteado dentro da faixa abaixo.
  // O crescimento para quando bate no ovrTarget — não no ovrCeiling da categoria.
  // Isso faz jogadores da mesma categoria terem realizações diferentes:
  //   ELITE pode pekar em 82, 85 ou 88 — depende do jogador, não só do potencial.
  //
  // [min%, max%] do ovrCeiling do potencial.
  // O max nunca ultrapassa o teto — apenas uma minoria do tier chega lá.
  OVR_TARGET_RANGE: {
    GERACIONAL:      [0.88, 1.00],  // 87–99: os geracionais quase sempre chegam perto
    LENDA:           [0.85, 1.00],  // 80–94: a maioria chega, alguns ficam curtos
    ELITE:           [0.82, 1.00],  // 72–88: grande variância — alguns decepcionam
    CAMPEAO:         [0.80, 1.00],  // 62–78: muitos não chegam ao teto
    COMUM:           [0.78, 1.00],  // 51–65: profissional sólido mas incompleto é o normal
    ABAIXO_DA_MEDIA: [0.75, 1.00],  // 39–52
  },

  // ── Custo progressivo de atributos de elite ───────────────────────
  // Atributos individuais acima de 87 custam muito mais para subir.
  // Representa o "último 1%" — refinamento técnico é exponencialmente difícil.
  //
  // O multiplicador abaixo reduz o delta acumulado para atributos nessa faixa:
  //   ≤ 87:  custo normal (mult = 1.0)
  //   88–94: custo elevado (mult = 0.40) — leva ~2.5× mais tempo
  //   95–99: custo extremo (mult = 0.18) — leva ~5.5× mais tempo
  //
  // Exemplos reais:
  //   Federer levou ~3 anos de pico para levar o forehand de bom para lendário.
  //   Djokovic demorou a carreira inteira para afinar o retorno a nível perfeito.
  ELITE_ATTR_THRESHOLD:  87,    // acima disso: custo começa a subir
  ELITE_ATTR_MULT:       0.40,  // multiplicador na faixa 88–94
  LEGEND_ATTR_THRESHOLD: 95,    // acima disso: custo extremo
  LEGEND_ATTR_MULT:      0.18,  // multiplicador na faixa 95–99

  // ── Declínio ─────────────────────────────────────────────────────
  // Meses de graça após peakAge antes de iniciar declínio
  DECLINE_GRACE_MONTHS: 12,

  // Taxa base de declínio mensal — duas faixas:
  // até 33 anos: suave (~0.5 pts físicos/temporada nos primeiros anos)
  // após 33: mais agressivo (~1.5 pts físicos/temporada)
  // Nota: o código em applyMonthlyDecline multiplica por ageFactor
  BASE_DECLINE_PER_MONTH: 0.35,

  // Mínimo absoluto de qualquer atributo
  ATTR_MINIMUM: 28,

  DECLINE_MULTIPLIERS: {
    // CORPO — físico decai mais rápido
    velocidade:       1.4,
    explosividade:    1.5,
    resistencia:      1.2,
    defesa:           0.8,   // defesa se mantém com experiência

    // GOLPES — potência decai, controle e técnica melhoram
    fhPotencia:       0.9,
    fhControle:      -0.3,   // melhora com experiência
    bhPotencia:       0.8,   // BH decai menos que FH (mais técnico, menos muscular)
    bhControle:      -0.4,   // BH controle melhora muito com experiência
    topspin:          0.5,
    slice:            0.2,   // slice melhora com a sabedoria

    // SAQUE — força decai, precisão se mantém ou melhora
    saqueForca:       1.0,   // perda de potência com a idade
    saquePrecisao:   -0.2,   // precisão melhora (mais experiência de colocação)

    // RETORNO — mantém-se ou melhora com leitura acumulada
    devolucao:       -0.2,

    // REDE — reflexo decai, volley técnico se mantém
    volley:           0.3,   // técnica se mantém, reflexo decai levemente
    smash:            0.7,   // overhead: timing decai com a idade

    // LEITURA & DECISÃO
    leitura:         -0.3,   // leitura melhora com experiência
    visaoTatica:     -0.2,   // visão tática melhora (sabe mais do jogo)

    // CABEÇA — mentalidade e regularidade crescem com a experiência
    mentalidade:     -0.2,
    regularidade:    -0.1,
    recuperacao:     -0.1,   // recuperação melhora levemente (já viu de tudo)
    adaptacao:       -0.2,   // adaptação melhora muito com experiência
  },

  // ── Breakthrough ─────────────────────────────────────────────────
  // Nº de atributos impulsionados por um breakthrough
  BREAKTHROUGH_ATTRS_COUNT: 3,

  // Range de boost por atributo (pontos inteiros diretos)
  BREAKTHROUGH_BOOST_MIN: 2,
  BREAKTHROUGH_BOOST_MAX: 5,

  // Cooldown entre breakthroughs (em meses de temporada)
  BREAKTHROUGH_COOLDOWN_MONTHS: 8,

  // Multiplicador de intensidade por tipo de título
  BREAKTHROUGH_TITLE_MULT: {
    SLAM:    1.0,
    MASTERS: 0.70,
    ATP500:  0.45,
    ATP250:  0.25,
  },

  // Atributos prioritários para breakthrough por styleId
  BREAKTHROUGH_PRIORITY_ATTRS: {
    AGG_BASELINER:  ['fhPotencia', 'topspin', 'fhControle', 'mentalidade'],
    CTR_PUNCHER:    ['bhControle', 'slice', 'leitura', 'mentalidade', 'devolucao'],
    ALL_COURT:      ['fhControle', 'bhControle', 'saquePrecisao', 'leitura', 'devolucao'],
    SRV_VOL:        ['saqueForca', 'saquePrecisao', 'volley', 'smash', 'explosividade'],
    BIG_SERVER:     ['saqueForca', 'saquePrecisao', 'fhPotencia', 'mentalidade'],
    RETRIEVER:      ['resistencia', 'defesa', 'bhControle', 'velocidade', 'regularidade'],
    TAKEALLRISK:    ['fhPotencia', 'bhPotencia', 'visaoTatica', 'slice'],
    GRINDER:        ['resistencia', 'defesa', 'bhControle', 'leitura', 'regularidade'],
    PWR_BASE:       ['fhPotencia', 'topspin', 'bhPotencia', 'mentalidade'],
    TACT_TEC:       ['visaoTatica', 'bhControle', 'adaptacao', 'leitura'],
    NET_SPEC:       ['volley', 'smash', 'saqueForca', 'explosividade'],
    ADPT_TAC:       ['adaptacao', 'visaoTatica', 'leitura', 'recuperacao'],
  },

  // ── Foco de treino por styleId ────────────────────────────────────
  STYLE_FOCUS_ATTRS: {
    AGG_BASELINER: ['fhPotencia', 'topspin', 'explosividade', 'fhControle', 'visaoTatica'],
    CTR_PUNCHER:   ['bhControle', 'resistencia', 'slice', 'leitura', 'regularidade', 'devolucao'],
    ALL_COURT:     ['fhControle', 'bhControle', 'leitura', 'saquePrecisao', 'mentalidade', 'devolucao'],
    SRV_VOL:       ['saqueForca', 'saquePrecisao', 'volley', 'smash', 'explosividade'],
    BIG_SERVER:    ['saqueForca', 'saquePrecisao', 'fhPotencia', 'explosividade', 'mentalidade'],
    RETRIEVER:     ['resistencia', 'defesa', 'velocidade', 'leitura', 'bhControle', 'regularidade', 'devolucao'],
    TAKEALLRISK:   ['fhPotencia', 'bhPotencia', 'visaoTatica', 'slice', 'explosividade'],
    GRINDER:       ['resistencia', 'defesa', 'bhControle', 'slice', 'leitura', 'regularidade'],
    PWR_BASE:      ['fhPotencia', 'bhPotencia', 'topspin', 'explosividade', 'mentalidade'],
    TACT_TEC:      ['visaoTatica', 'bhControle', 'adaptacao', 'leitura', 'slice'],
    NET_SPEC:      ['volley', 'smash', 'saqueForca', 'saquePrecisao', 'explosividade'],
    ADPT_TAC:      ['adaptacao', 'visaoTatica', 'leitura', 'recuperacao', 'fhControle'],
  },

  // Peso multiplicador dos atributos de foco no sorteio mensal.
  // 6 = atributos de foco têm ~6x mais chance de serem selecionados para treino.
  // Aumentado de 4→6 para identidade de estilo mais marcante.
  STYLE_FOCUS_WEIGHT: 6,

  // ── Atributos "opostos" ao estilo ─────────────────────────────────
  // Atributos que raramente são treinados por jogadores deste estilo.
  // No sorteio mensal aparecem com peso STYLE_OPPOSE_WEIGHT (muito baixo).
  // Ainda crescem — mas muito mais devagar. Isso é realista: um Big Server
  // pode ter 60 de topspin, mas nunca vai gastar horas refinando esse golpe.
  //
  // IMPORTANTE: não bloqueia crescimento — apenas reduz a frequência de treino.
  STYLE_OPPOSE_WEIGHT: 0.3,  // ~17× menos chance que os atributos de foco

  STYLE_OPPOSE_ATTRS: {
    AGG_BASELINER: ['volley', 'smash', 'slice', 'bhControle', 'regularidade'],
    CTR_PUNCHER:   ['saqueForca', 'fhPotencia', 'visaoTatica', 'volley'],
    ALL_COURT:     [],   // ALL_COURT é equilibrado por definição
    SRV_VOL:       ['topspin', 'resistencia', 'regularidade', 'defesa'],
    BIG_SERVER:    ['topspin', 'volley', 'bhControle', 'regularidade'],
    RETRIEVER:     ['saqueForca', 'fhPotencia', 'visaoTatica', 'smash'],
    TAKEALLRISK:   ['resistencia', 'bhControle', 'regularidade', 'recuperacao'],
    GRINDER:       ['saqueForca', 'fhPotencia', 'visaoTatica', 'smash'],
    PWR_BASE:      ['volley', 'smash', 'slice', 'regularidade'],
    TACT_TEC:      ['saqueForca', 'fhPotencia', 'visaoTatica'],
    NET_SPEC:      ['topspin', 'resistencia', 'regularidade', 'defesa'],
    ADPT_TAC:      [],
  },
};


// ═══════════════════════════════════════════════════════════════════
// 5. HELPERS ESTÁTICOS
// ═══════════════════════════════════════════════════════════════════

/**
 * Sorteia o teto pessoal (ovrTarget) de um jogador dentro da faixa do seu potencial.
 * Chamado uma única vez na criação/migração — imutável depois.
 * @param {string} potentialId
 * @returns {number} OVR alvo (inteiro)
 */
export function rollOvrTarget(potentialId) {
  const cat   = getPotentialCategory(potentialId);
  const range = DEVELOPMENT_CONFIG.OVR_TARGET_RANGE[potentialId] ?? [0.85, 1.00];
  const frac  = range[0] + Math.random() * (range[1] - range[0]);
  return Math.round(cat.ovrCeiling * frac);
}

/**
 * Retorna a categoria de potencial pelo id.
 * @param {string} potentialId
 * @returns {object} POTENTIAL_CATEGORIES entry
 */
export function getPotentialCategory(potentialId) {
  return POTENTIAL_CATEGORIES[potentialId] ?? POTENTIAL_CATEGORIES.COMUM;
}

/**
 * Retorna o arc de carreira pelo id.
 * @param {string} arcId
 * @returns {object} CAREER_ARCS entry
 */
export function getCareerArc(arcId) {
  return CAREER_ARCS[arcId] ?? CAREER_ARCS.STEADY;
}

/**
 * Dado um OVR atual e um potential, retorna quantos pontos faltam para o teto.
 * Útil para exibição de "espaço para crescer".
 * @param {number} currentOvr
 * @param {string} potentialId
 * @returns {number} pontos restantes (0 se já no teto ou acima)
 */
export function ovrHeadroom(currentOvr, potentialId) {
  const cat = getPotentialCategory(potentialId);
  return Math.max(0, cat.ovrCeiling - currentOvr);
}
