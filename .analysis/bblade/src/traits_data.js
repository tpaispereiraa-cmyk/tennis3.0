// ============================================================
// TRAITS_DATA.JS — Traits v2.0
// ============================================================
// Arquivo STANDALONE — não importa nada do jogo.
// Importado por: FormSystem.js, UniverseManager.js, HeadlessBattle.js,
//                UnifiedPlayerProfile.jsx, NewgenEngine.js
//
// NOVO SISTEMA: 56 conceitos de trait, cada um com 4 tiers:
//   NEG  → variante negativa (fraqueza/penalidade)
//   COM  → variante positiva comum
//   RAR  → variante positiva rara (efeito amplificado)
//   LEN  → variante lendária (efeito máximo, exclusivo de elites)
//
// PLAYER_TRAITS usa: { id: 'TRAIT_ID', tier: 'COM' | 'RAR' | 'LEN' | 'NEG' }
//
// ── traitDNA SYSTEM v1.0 ──────────────────────────────────────
// Cada jogador tem:
//   traitDNA:       número 0–100 (alma competitiva oculta)
//   negTypes:       { TRAIT_ID: 'CICATRIZ' | 'SOMBRA' } por trait NEG
//   shadowProgress: { eventKey: count } para NEGs do tipo SOMBRA
//   traitMilestones:{ firstTitle, comeback02, rivalryFormed, reachedPeak }
//
// Para jogadores EXISTENTES: traitDNA inferido pela Opção A
//   (lê traits que já têm → calcula DNA coerente)
// ============================================================

// ── HELPERS ─────────────────────────────────────────────────

/** Retorna o tier de uma trait específica para um jogador (null se não tem) */
export function getTier(playerTraits, traitId) {
  if (!Array.isArray(playerTraits)) return null;
  const t = playerTraits.find(t => t && t.id === traitId);
  return t ? t.tier : null;
}

/** Verifica se o jogador tem um trait (qualquer tier) */
export function hasTrait(playerTraits, traitId) {
  return getTier(playerTraits, traitId) !== null;
}

/** Verifica se o trait é positivo (COM / RAR / LEN) */
export function isPositiveTier(tier) {
  return tier === 'COM' || tier === 'RAR' || tier === 'LEN';
}

/** Verifica se o trait é negativo */
export function isNegativeTier(tier) {
  return tier === 'NEG';
}

// ── DEFINIÇÕES DE TRAITS ─────────────────────────────────────

export const TRAITS = {

  // ████ I. CLUTCH ████
  SANGUE_FRIO: {
    id: 'SANGUE_FRIO', section: 'CLUTCH', icon: '🧊',
    name: 'Sangue Frio',
    hook: 'FORM_MULTIPLIER',
    gatilho: 'opponentWins === winsNeeded - 1',
    tiers: {
      NEG: { variantName: 'Paralisia',    descricao: '-15% em todos quando adversário está a 1 vitória de fechar.' },
      COM: { variantName: 'Sangue Frio',  descricao: '+10% em todos quando adversário está a 1 vitória de fechar.' },
      RAR: { variantName: 'Sangue Frio',  descricao: '+20% em todos + lançamento sobe 1 nível no round de sobrevivência.' },
      LEN: { variantName: 'Sangue Frio',  descricao: '+30% em todos + -20% burst recebido. Imune a CRITICAL_FAIL neste round.' },
    },
  },
  FECHADOR: {
    id: 'FECHADOR', section: 'CLUTCH', icon: '🏁',
    name: 'Fechador',
    hook: 'STATS_PARCIAL',
    gatilho: 'selfWins === winsNeeded - 1',
    tiers: {
      NEG: { variantName: 'Choke Artist', descricao: '-20% em todos quando você está a 1 vitória de fechar.' },
      COM: { variantName: 'Fechador',     descricao: '+15% em ataque e technique no round decisivo para fechar.' },
      RAR: { variantName: 'Fechador',     descricao: '+25% em ataque, technique e clutch. Burst damage +15% no fechamento.' },
      LEN: { variantName: 'Fechador',     descricao: '+30% em todos + burst damage +25%. Spin decay do adversário acelera +20%.' },
    },
  },
  MENTALIDADE_DE_SET: {
    id: 'MENTALIDADE_DE_SET', section: 'CLUTCH', icon: '🎯',
    name: 'Mentalidade de Set',
    hook: 'STATS_PARCIAL',
    gatilho: 'currentRound === maxRounds',
    tiers: {
      NEG: { variantName: 'Exaustão',          descricao: '-20% stamina e intelligence no round final.' },
      COM: { variantName: 'Mentalidade de Set', descricao: '+20% em clutch e intelligence no último round possível.' },
      RAR: { variantName: 'Mentalidade de Set', descricao: '+30% em clutch e intelligence + forma tratada como IN_FORM mínimo no round final.' },
      LEN: { variantName: 'Mentalidade de Set', descricao: '+40% em todos no round final. Lançamento STRONG mínimo. Burst recebido -20%.' },
    },
  },
  PRESSAO_ABSOLUTA: {
    id: 'PRESSAO_ABSOLUTA', section: 'CLUTCH', icon: '⚡',
    name: 'Pressão Absoluta',
    hook: 'FORM_MULTIPLIER',
    gatilho: 'placar empatado no round decisivo',
    tiers: {
      NEG: { variantName: 'Colapso Emocional', descricao: '-25% ataque e clutch em situação de placar empatado no round decisivo.' },
      COM: { variantName: 'Pressão Absoluta',  descricao: '+15% em todos quando placar está empatado no round decisivo.' },
      RAR: { variantName: 'Pressão Absoluta',  descricao: '+25% em todos + lançamento sobe 1 tier na situação de pressão máxima.' },
      LEN: { variantName: 'Pressão Absoluta',  descricao: '+35% em todos + burst recebido -25% em decisivo empatado.' },
    },
  },
  INSTINTO_DO_CAMPEONATO: {
    id: 'INSTINTO_DO_CAMPEONATO', section: 'CLUTCH', icon: '🏆',
    name: 'Instinto do Campeonato',
    hook: 'STATS_PARCIAL',
    gatilho: "tournamentStage === 'F'",
    tiers: {
      NEG: { variantName: 'Assombrado pela Final',   descricao: '-20% clutch e technique em partidas de Final.' },
      COM: { variantName: 'Instinto do Campeonato',  descricao: '+15% clutch e technique em qualquer partida de Final.' },
      RAR: { variantName: 'Instinto do Campeonato',  descricao: '+25% em todos em Finals + forma HOT_STREAK mínimo.' },
      LEN: { variantName: 'Instinto do Campeonato',  descricao: '+35% em todos. Efeitos negativos de forma ignorados. Burst recebido -20%.' },
    },
  },

  // ████ II. ADVERSIDADE ████
  VIRADISTA: {
    id: 'VIRADISTA', section: 'ADVERSIDADE', icon: '🔄',
    name: 'Viradista',
    hook: 'FORM_MULTIPLIER',
    gatilho: 'selfWins === 0 && opponentWins === 2',
    tiers: {
      NEG: { variantName: 'Mentalidade de Vitima', descricao: 'Form multiplier maximo 0.85 quando placar esta 0-2 contra voce.' },
      COM: { variantName: 'Viradista',             descricao: '+15% em todos quando placar está 0-2 contra você.' },
      RAR: { variantName: 'Viradista',             descricao: '+25% em todos quando 0-2 + burst recebido -20%.' },
      LEN: { variantName: 'Viradista',             descricao: '+35% em todos + burst recebido -25% quando 0-2. Vitória reinicia o ímpeto.' },
    },
  },
  FENIX: {
    id: 'FENIX', section: 'ADVERSIDADE', icon: '🦅',
    name: 'Fênix',
    hook: 'FORM_MULTIPLIER',
    gatilho: 'lossStreak >= 2',
    tiers: {
      NEG: { variantName: 'Espiral Negativa', descricao: 'Cada derrota causa -18 forma adicional quando abaixo de -30.' },
      COM: { variantName: 'Fenix',            descricao: '+10% em todos após 1 derrota no torneio atual.' },
      RAR: { variantName: 'Fenix',            descricao: '+20% em todos após 2+ derrotas + ganhos de forma x1.5 pelas próximas 3 partidas.' },
      LEN: { variantName: 'Fenix',            descricao: '+30% em todos após 2+ derrotas. Forma mínima garantida em IN_FORM.' },
    },
  },
  LEAO_ENCURRALADO: {
    id: 'LEAO_ENCURRALADO', section: 'ADVERSIDADE', icon: '🦁',
    name: 'Leão Encurralado',
    hook: 'FORM_CAP',
    gatilho: 'formaState === SLUMP || formaState === ROCK_BOTTOM',
    tiers: {
      NEG: { variantName: 'Paralisia Total',    descricao: 'Em SLUMP, form multiplier cai para 0.75 maximo.' },
      COM: { variantName: 'Leao Encurralado',   descricao: 'Form multiplier nunca cai abaixo de 0.85 em ROCK_BOTTOM.' },
      RAR: { variantName: 'Leao Encurralado',   descricao: 'Em SLUMP/ROCK_BOTTOM: +15% em todos + ganhos de forma x2 por vitória.' },
      LEN: { variantName: 'Leao Encurralado',   descricao: 'Em ROCK_BOTTOM: +35% ataque e clutch por 1 round. Burst damage +20%.' },
    },
  },
  GUERRA_DE_ATRITO: {
    id: 'GUERRA_DE_ATRITO', section: 'ADVERSIDADE', icon: '⚔️',
    name: 'Guerra de Atrito',
    hook: 'BATTLE_INIT',
    gatilho: 'spinSpeed inferior ao adversário',
    tiers: {
      NEG: { variantName: 'Fadiga Estrutural', descricao: 'Stamina decai +20% mais rápido quando perdendo na velocidade de spin.' },
      COM: { variantName: 'Guerra de Atrito',  descricao: '+10% stamina e defense quando spin inferior ao adversário.' },
      RAR: { variantName: 'Guerra de Atrito',  descricao: '+20% stamina + +15% attack quando em desvantagem de spin.' },
      LEN: { variantName: 'Guerra de Atrito',  descricao: 'Inversão de Atrito: 30% do dano recebido converte em resistência própria.' },
    },
  },
  GLADIADOR: {
    id: 'GLADIADOR', section: 'ADVERSIDADE', icon: '🛡️',
    name: 'Gladiador',
    hook: 'STATS_PARCIAL',
    gatilho: 'adversário usou mesma técnica 2+ rounds seguidos',
    tiers: {
      NEG: { variantName: 'Cego pela Rotina', descricao: '-10% adaptability quando adversário repete a mesma técnica.' },
      COM: { variantName: 'Gladiador',         descricao: '+15% adaptability quando adversário usa a mesma técnica por 2+ rounds.' },
      RAR: { variantName: 'Gladiador',         descricao: '+25% adaptability + counter bonus: +15% attack vs técnica repetida.' },
      LEN: { variantName: 'Gladiador',         descricao: '+35% attack e adaptability vs técnica repetida + burst damage +20%.' },
    },
  },

  // ████ III. DOMINÂNCIA ████
  AVALANCHE: {
    id: 'AVALANCHE', section: 'DOMINÂNCIA', icon: '🏔️',
    name: 'Avalanche',
    hook: 'STATS_PARCIAL',
    gatilho: 'winStreak >= 3',
    tiers: {
      NEG: { variantName: 'Sindrome do Favoritismo', descricao: 'Com winStreak >= 3, form multiplier limitado a 1.10 maximo.' },
      COM: { variantName: 'Avalanche',               descricao: '+15% attack e speed com winStreak >= 3.' },
      RAR: { variantName: 'Avalanche',               descricao: '+20% em todos com winStreak >= 3 + +5% adicional por vitória extra acima de 3.' },
      LEN: { variantName: 'Avalanche',               descricao: '+25% em todos com winStreak >= 3 + momentum nunca decai entre rounds.' },
    },
  },
  IMPLACAVEL: {
    id: 'IMPLACAVEL', section: 'DOMINÂNCIA', icon: '💥',
    name: 'Implacável',
    hook: 'BATTLE_INIT',
    gatilho: 'ganhou round anterior por burst',
    tiers: {
      NEG: { variantName: 'Arrogancia Tecnica', descricao: '-15% defense após vencer um round por burst.' },
      COM: { variantName: 'Implacavel',          descricao: '+10% em todos no round seguinte após vitória por burst.' },
      RAR: { variantName: 'Implacavel',          descricao: '+20% em todos após burst + burst damage do próximo round +10%.' },
      LEN: { variantName: 'Implacavel',          descricao: 'Cascata: cada burst nesta partida acumula +8% em todos (sem teto).' },
    },
  },
  REI_DA_ARENA_DOMINANCIA: {
    id: 'REI_DA_ARENA_DOMINANCIA', section: 'DOMINÂNCIA', icon: '👑',
    name: 'Rei da Arena',
    hook: 'BATTLE_INIT',
    gatilho: 'spinSpeed > 130% do adversário',
    tiers: {
      NEG: { variantName: 'Complacencia',  descricao: 'Quando dominando o spin, attack decai -10%.' },
      COM: { variantName: 'Rei da Arena',  descricao: '+15% stamina e technique quando spin superior ao adversário.' },
      RAR: { variantName: 'Rei da Arena',  descricao: '+25% em stamina/technique + adversário não recupera spin perdido neste round.' },
      LEN: { variantName: 'Rei da Arena',  descricao: 'Lockdown: spin decay do adversário acelera +25% quando dominando.' },
    },
  },
  SANGUE_QUENTE: {
    id: 'SANGUE_QUENTE', section: 'DOMINÂNCIA', icon: '🔥',
    name: 'Sangue Quente',
    hook: 'BATTLE_INIT',
    gatilho: 'formaState HOT_STREAK ou ON_FIRE',
    tiers: {
      NEG: { variantName: 'Superexposicao', descricao: 'Em HOT_STREAK+, burst recebido +20%.' },
      COM: { variantName: 'Sangue Quente',  descricao: 'Burst damage +10% em HOT_STREAK. +15% em ON_FIRE.' },
      RAR: { variantName: 'Sangue Quente',  descricao: 'Burst damage +20% em HOT_STREAK, +30% em ON_FIRE + critical hit chance +10%.' },
      LEN: { variantName: 'Sangue Quente',  descricao: 'Em ON_FIRE: burst damage +45%, critical chance +15%.' },
    },
  },
  DESTRUIDOR_DE_MORAL: {
    id: 'DESTRUIDOR_DE_MORAL', section: 'DOMINÂNCIA', icon: '🗡️',
    name: 'Destruidor de Moral',
    hook: 'STATS_PARCIAL',
    gatilho: 'adversário em STRUGGLING ou pior',
    tiers: {
      NEG: { variantName: 'Pena do Vencedor',    descricao: '-15% attack quando adversário está em SLUMP ou pior.' },
      COM: { variantName: 'Destruidor de Moral', descricao: '+10% em todos contra adversário em STRUGGLING ou pior.' },
      RAR: { variantName: 'Destruidor de Moral', descricao: '+20% em todos vs SLUMP/ROCK_BOTTOM + burst damage +15%.' },
      LEN: { variantName: 'Destruidor de Moral', descricao: '+30% em todos + qualquer burst win força adversário -10 pontos de forma.' },
    },
  },

  // ████ IV. LANÇAMENTO ████
  MAO_FIRME: {
    id: 'MAO_FIRME', section: 'LANÇAMENTO', icon: '🤜',
    name: 'Mão Firme',
    hook: 'LAUNCH_QUALITY',
    gatilho: 'pre-battle',
    tiers: {
      NEG: { variantName: 'Lancador Inconsistente', descricao: 'PERFECT zerado. Máximo alcançável é STRONG.' },
      COM: { variantName: 'Mao Firme',              descricao: 'Zera CRITICAL_FAIL + reduz WEAK para 5%.' },
      RAR: { variantName: 'Mao Firme',              descricao: 'Zero CRITICAL_FAIL, zero WEAK. Mínimo garantido em STANDARD.' },
      LEN: { variantName: 'Mao Firme',              descricao: 'Lançamento garantido STRONG mínimo. Chance de PERFECT x2.' },
    },
  },
  PERFECCIONISTA: {
    id: 'PERFECCIONISTA', section: 'LANÇAMENTO', icon: '💎',
    name: 'Perfeccionista',
    hook: 'LAUNCH_QUALITY',
    gatilho: 'pre-battle',
    tiers: {
      NEG: { variantName: 'Ansiedade Tecnica', descricao: 'CRITICAL_FAIL x2 e PERFECT x0.5 sob pressão (SF/Final).' },
      COM: { variantName: 'Perfeccionista',    descricao: 'Chance de PERFECT x2.' },
      RAR: { variantName: 'Perfeccionista',    descricao: 'PERFECT x3 + quando PERFECT: +15% em todos no primeiro round.' },
      LEN: { variantName: 'Perfeccionista',    descricao: 'PERFECT ativa +30% em todos por todo o round. PERFECT x3.5.' },
    },
  },
  PISTOLEIRO: {
    id: 'PISTOLEIRO', section: 'LANÇAMENTO', icon: '🔫',
    name: 'Pistoleiro',
    hook: 'BATTLE_INIT',
    gatilho: 'launchTechnique ∈ [RUSH, POWER, SLIDING]',
    tiers: {
      NEG: { variantName: 'Unico Golpe',  descricao: 'Técnicas agressivas aumentam burst recebido +40%.' },
      COM: { variantName: 'Pistola Fria', descricao: 'Técnicas agressivas reduzem burst recebido -20%.' },
      RAR: { variantName: 'Pistoleiro',   descricao: 'Burst recebido -30% + burst damage +15% com técnicas agressivas.' },
      LEN: { variantName: 'Pistoleiro',   descricao: 'Técnicas agressivas: burst recebido -40% + burst damage +25% + speed +20%.' },
    },
  },
  CALCULISTA: {
    id: 'CALCULISTA', section: 'LANÇAMENTO', icon: '🧮',
    name: 'Calculista',
    hook: 'BATTLE_INIT',
    gatilho: 'launchTechnique ∈ [ENDURANCE, PRECISION]',
    tiers: {
      NEG: { variantName: 'Passividade Tatica', descricao: '-15% attack ao usar técnicas defensivas/de precisão.' },
      COM: { variantName: 'Calculista',          descricao: '+15% stamina e defense com técnicas ENDURANCE/PRECISION.' },
      RAR: { variantName: 'Calculista',          descricao: '+25% stamina, defense e intelligence. Spin decay proprio 0% nos primeiros 2 rounds.' },
      LEN: { variantName: 'Calculista',          descricao: '+20% em todos + spin decay próprio quase zerado por 3 rounds.' },
    },
  },
  CRONOMETRO: {
    id: 'CRONOMETRO', section: 'LANÇAMENTO', icon: '⏱️',
    name: 'Cronômetro',
    hook: 'LAUNCH_QUALITY',
    gatilho: 'tournamentStage ∈ [SF, F]',
    tiers: {
      NEG: { variantName: 'Maos Tremulas', descricao: 'CRITICAL_FAIL e WEAK x2 em SF/Final.' },
      COM: { variantName: 'Cronometro',    descricao: '+10% ao efeito do launchPower no R1 e no round decisivo.' },
      RAR: { variantName: 'Cronometro',    descricao: 'Em QF/SF/Final: lançamento sobe automaticamente 1 nível de qualidade.' },
      LEN: { variantName: 'Cronometro',    descricao: 'Lançamento sempre STRONG mínimo, PERFECT x2. CRITICAL_FAIL impossível.' },
    },
  },

  // ████ V. BATALHA ████
  DESTRUIDOR_DE_BURST: {
    id: 'DESTRUIDOR_DE_BURST', section: 'BATALHA', icon: '💣',
    name: 'Destruidor de Burst',
    hook: 'BATTLE_INIT',
    gatilho: 'sempre',
    tiers: {
      NEG: { variantName: 'Ataque de Papel',      descricao: 'Burst damage -25% permanente.' },
      COM: { variantName: 'Especialista em Burst', descricao: 'Burst damage +20% permanente.' },
      RAR: { variantName: 'Destruidor de Burst',   descricao: 'Burst damage +30% + critical hit chance +10%.' },
      LEN: { variantName: 'Destruidor de Burst',   descricao: 'Burst damage +45% + critical hit chance +15%. Critical garante burst automático.' },
    },
  },
  ARMADURA_VIVA: {
    id: 'ARMADURA_VIVA', section: 'BATALHA', icon: '🛡️',
    name: 'Armadura Viva',
    hook: 'BATTLE_INIT',
    gatilho: 'sempre',
    tiers: {
      NEG: { variantName: 'Vidro Fino',         descricao: 'Burst recebido +30% permanente.' },
      COM: { variantName: 'Armadura Anti-Burst', descricao: 'Burst recebido -30% permanente.' },
      RAR: { variantName: 'Armadura Viva',       descricao: 'Burst recebido -40% + tentativa de burst falhada penaliza o atacante em -5% spin.' },
      LEN: { variantName: 'Armadura Viva',       descricao: 'Burst recebido -50% + tentativa falhada penaliza o atacante em -10% spin.' },
    },
  },
  ETERNO_GIRO: {
    id: 'ETERNO_GIRO', section: 'BATALHA', icon: '🌀',
    name: 'Eterno Giro',
    hook: 'BATTLE_INIT',
    gatilho: 'sempre',
    tiers: {
      NEG: { variantName: 'Roda Presa',    descricao: 'Spin decay próprio +15% por round.' },
      COM: { variantName: 'Mestre do Spin', descricao: 'Spin decay do adversário +10% por round.' },
      RAR: { variantName: 'Eterno Giro',   descricao: 'Spin decay próprio -20% + adversário +15%.' },
      LEN: { variantName: 'Eterno Giro',   descricao: 'No R1: spin próprio não decai. A partir do R2: adversário +25% decay acumulativo.' },
    },
  },
  CONTRA_GOLPE: {
    id: 'CONTRA_GOLPE', section: 'BATALHA', icon: '⚡',
    name: 'Contra-Golpe',
    hook: 'BATTLE_INIT',
    gatilho: 'sofreu critical hit no round anterior',
    tiers: {
      NEG: { variantName: 'Efeito Ricochete', descricao: 'Ao sofrer critical hit, -10% spinSpeed adicional permanente.' },
      COM: { variantName: 'Contra-Golpe',     descricao: '+15% attack no round seguinte após receber um hit forte.' },
      RAR: { variantName: 'Contra-Golpe',     descricao: 'Após critical hit recebido: +25% attack próxima colisão + burst damage +15%.' },
      LEN: { variantName: 'Absorcao Cinetica',descricao: '30% do dano de cada hit recebido converte em velocidade própria.' },
    },
  },
  VENENO_LENTO: {
    id: 'VENENO_LENTO', section: 'BATALHA', icon: '☠️',
    name: 'Veneno Lento',
    hook: 'BATTLE_INIT',
    gatilho: 'acumula por currentRound',
    tiers: {
      NEG: { variantName: 'Finalizador Cego', descricao: 'Tentativas de burst em spin advantage insuficiente custam 5% de spin próprio.' },
      COM: { variantName: 'Veneno Lento',     descricao: 'Burst damage acumula +10% por round. R2: +10%, R3: +20%.' },
      RAR: { variantName: 'Veneno Lento',     descricao: 'Burst damage +15% cumulativo por round + spin decay adversário +5% adicional.' },
      LEN: { variantName: 'Veneno Lento',     descricao: 'A partir do R2, adversário perde +5% spin extra por round cumulativo.' },
    },
  },

  // ████ VI. FORMATO ████
  RELAMPAGO: {
    id: 'RELAMPAGO', section: 'FORMATO', icon: '⚡',
    name: 'Relâmpago',
    hook: 'STATS_PARCIAL',
    gatilho: "format === 'MD3'",
    tiers: {
      NEG: { variantName: 'Melhor de 3', descricao: 'Decay de momentum entre rounds x2 em MD5/MD7.' },
      COM: { variantName: 'Relampago',   descricao: '+15% attack e speed em formatos MD3.' },
      RAR: { variantName: 'Relampago',   descricao: '+25% em todos em MD3 + lançamento sobe 1 nível.' },
      LEN: { variantName: 'Relampago',   descricao: 'Em MD3: +30% em todos, burst damage +20%, lançamento sempre STRONG mínimo.' },
    },
  },
  ULTRAMARATONISTA: {
    id: 'ULTRAMARATONISTA', section: 'FORMATO', icon: '🏃',
    name: 'Ultramaratonista',
    hook: 'FORM_MULTIPLIER',
    gatilho: 'currentRound >= threshold (R3/MD3, R4/MD5)',
    tiers: {
      NEG: { variantName: 'Gas Curto',          descricao: '-8% stamina e speed cumulativo por round. R3: -16%, R5: -32%.' },
      COM: { variantName: 'Maratonista',         descricao: '+15% stamina e defense a partir do R3 (MD3) / R4 (MD5).' },
      RAR: { variantName: 'Maratonista Lendario',descricao: '+20% em todos a partir do threshold. Spin decay -15%.' },
      LEN: { variantName: 'Ultramaratonista',    descricao: 'A partir do R3: +25% em todos + spin decay próprio -25% + burst resist +20%.' },
    },
  },
  RELOGIO_BIOLOGICO: {
    id: 'RELOGIO_BIOLOGICO', section: 'FORMATO', icon: '⏰',
    name: 'Relógio Biológico',
    hook: 'FORM_MULTIPLIER',
    gatilho: 'cumulativo por currentRound',
    tiers: {
      NEG: { variantName: 'Aquecimento Lento Ruim', descricao: 'Começa em -20% no R1. Demora demais para entrar no ritmo.' },
      COM: { variantName: 'Aquecimento Lento',      descricao: '+8% cumulativo por round. R1=0%, R2=+8%, R3=+16%.' },
      RAR: { variantName: 'Relogio Biologico',      descricao: 'Neutro no R1. A partir do R2: +15% cumulativo. R5 = +60%.' },
      LEN: { variantName: 'Relogio Biologico',      descricao: 'Exponencial: R1 normal, R2 +15%, R3 +30%, R4 +45%, R5 +60%.' },
    },
  },
  ESPECIALISTA_TIEBREAK: {
    id: 'ESPECIALISTA_TIEBREAK', section: 'FORMATO', icon: '🎲',
    name: 'Especialista em Tiebreak',
    hook: 'STATS_PARCIAL',
    gatilho: 'currentRound === maxRounds && selfWins === opponentWins',
    tiers: {
      NEG: { variantName: 'Terror do Decisivo',       descricao: '-20% em todos no round de desempate.' },
      COM: { variantName: 'Especialista em Tiebreak', descricao: '+20% clutch e intelligence no round decisivo.' },
      RAR: { variantName: 'Especialista em Tiebreak', descricao: '+30% clutch + forma sobe para IN_FORM mínimo no decisivo.' },
      LEN: { variantName: 'Especialista em Tiebreak', descricao: '+40% em todos + burst recebido -25% + forma tratada como ON_FIRE no tiebreak.' },
    },
  },

  // ████ VII. ARENA ████
  CAMALEAO: {
    id: 'CAMALEAO', section: 'ARENA', icon: '🦎',
    name: 'Camaleão',
    hook: 'ARENA_MOD',
    gatilho: 'arena !== favoriteArena',
    tiers: {
      NEG: { variantName: 'Peixe Fora da Agua', descricao: 'Modificadores negativos da arena amplificados x1.5.' },
      COM: { variantName: 'Coringa de Arena',   descricao: 'Anula completamente modificadores negativos da arena.' },
      RAR: { variantName: 'Camaleao',           descricao: 'Anula negativos + ganha +10% dos bônus positivos de qualquer arena.' },
      LEN: { variantName: 'Camaleao',           descricao: 'Toda arena é casa: recebe bônus completo de arena favorita em qualquer lugar.' },
    },
  },
  REI_DA_SELVA: {
    id: 'REI_DA_SELVA', section: 'ARENA', icon: '🦁',
    name: 'Rei da Selva',
    hook: 'STATS_PARCIAL',
    gatilho: 'arena === favoriteArena',
    tiers: {
      NEG: { variantName: 'Arena Unica',   descricao: '-10% technique e intelligence fora da arena favorita.' },
      COM: { variantName: 'Dono da Arena', descricao: '+15% technique e stamina na arena favorita.' },
      RAR: { variantName: 'Rei da Selva',  descricao: '+25% em todos na arena favorita + lançamento sobe 1 nível.' },
      LEN: { variantName: 'Rei da Selva',  descricao: '+35% em todos + adversário recebe penalidades como se fosse ele o visitante.' },
    },
  },
  EXPLORADOR: {
    id: 'EXPLORADOR', section: 'ARENA', icon: '🧭',
    name: 'Explorador',
    hook: 'STATS_PARCIAL',
    gatilho: 'arena !== favoriteArena',
    tiers: {
      NEG: { variantName: 'Visitante Perdido', descricao: '-15% adaptability em qualquer arena fora da favorita.' },
      COM: { variantName: 'Explorador',         descricao: '+10% adaptability e intelligence quando fora da arena favorita.' },
      RAR: { variantName: 'Explorador',         descricao: '+15% em todos fora de casa. Cresce a cada round em território hostil.' },
      LEN: { variantName: 'Explorador',         descricao: '+20% em todos fora de casa + +5% adicional por round no mesmo stadium.' },
    },
  },
  ARQUITETO: {
    id: 'ARQUITETO', section: 'ARENA', icon: '📐',
    name: 'Arquiteto',
    hook: 'ARENA_MOD',
    gatilho: 'sinergia entre tipo de bey e arena',
    tiers: {
      NEG: { variantName: 'Antipatico ao Ambiente', descricao: '-15% quando tipo de bey não tem sinergia com a arena.' },
      COM: { variantName: 'Arquiteto',              descricao: '+15% quando tipo do bey favorece a geometria da arena.' },
      RAR: { variantName: 'Arquiteto',              descricao: '+25% em sinergia de tipo/arena + +5% clutch por conhecer os ângulos.' },
      LEN: { variantName: 'Arquiteto',              descricao: 'Mestre do Espaco: +30% em sinergia + variância de colisão reduzida -40%.' },
    },
  },

  // ████ VIII. PALCO ████
  SANGUE_DE_CAMPEON: {
    id: 'SANGUE_DE_CAMPEON', section: 'PALCO', icon: '🌟',
    name: 'Sangue de Campeão',
    hook: 'STATS_PARCIAL',
    gatilho: 'tournamentTier ∈ [GRAND_SLAM, PREMIER]',
    tiers: {
      NEG: { variantName: 'Assombrado pelos Grandes Palcos', descricao: '-15% clutch e technique em Grand Slams e Premiers.' },
      COM: { variantName: 'Filho dos Grand Slams',           descricao: '+10% clutch e technique em GS/Premier.' },
      RAR: { variantName: 'Sangue de Campeon',              descricao: '+20% em todos em GS/Premier + forma HOT_STREAK mínimo no torneio.' },
      LEN: { variantName: 'Sangue de Campeon',              descricao: '+30% em todos em GS + lançamento melhora + forma nunca desce abaixo de IN_FORM.' },
    },
  },
  ESPECIALISTA_MATA_MATA: {
    id: 'ESPECIALISTA_MATA_MATA', section: 'PALCO', icon: '⚔️',
    name: 'Especialista em Mata-Mata',
    hook: 'STATS_PARCIAL',
    gatilho: 'tournamentStage ∈ [QF, SF, F]',
    tiers: {
      NEG: { variantName: 'Parado nos Quartos',        descricao: '-10% adaptability e intelligence a partir das quartas.' },
      COM: { variantName: 'Especialista QF+',          descricao: '+15% clutch e intelligence a partir das quartas.' },
      RAR: { variantName: 'Especialista em Mata-Mata', descricao: '+25% em todos a partir de QF + forma nunca cai abaixo de IN_FORM.' },
      LEN: { variantName: 'Especialista em Mata-Mata', descricao: 'A partir de SF: +35% em todos, burst resist +20%.' },
    },
  },
  REI_DOS_GRUPOS: {
    id: 'REI_DOS_GRUPOS', section: 'PALCO', icon: '🎯',
    name: 'Rei das Fases Iniciais',
    hook: 'STATS_PARCIAL',
    gatilho: 'tournamentStage ∈ [R64, R32, R16]',
    tiers: {
      NEG: { variantName: 'Morno nas Aberturas',    descricao: '-15% technique e intelligence em R64/R32.' },
      COM: { variantName: 'Primeiro Sangue',         descricao: '+15% attack e speed em R64/R32.' },
      RAR: { variantName: 'Rei das Fases Iniciais', descricao: '+25% em todos nas fases iniciais + vitórias geram momentum extra.' },
      LEN: { variantName: 'Rei das Fases Iniciais', descricao: '+30% em todos em R64/R32 + cada vitória dá +5 pontos de forma extra.' },
    },
  },
  CACADOR_DE_GIGANTES: {
    id: 'CACADOR_DE_GIGANTES', section: 'PALCO', icon: '🏹',
    name: 'Caçador de Gigantes',
    hook: 'STATS_PARCIAL',
    gatilho: 'opponentTier > playerTier',
    tiers: {
      NEG: { variantName: 'Cacado pelos Favoritos', descricao: '-10% attack e speed contra adversário de tier inferior.' },
      COM: { variantName: 'Cacador de Gigantes',    descricao: '+10% em todos contra adversário de tier superior.' },
      RAR: { variantName: 'Cacador de Gigantes',    descricao: '+20% vs tier superior + burst damage +15%.' },
      LEN: { variantName: 'Cacador de Gigantes',    descricao: '+30% vs tier superior + forma tratada como ON_FIRE no primeiro round.' },
    },
  },
  MONSTRO_DO_REDEMPTION: {
    id: 'MONSTRO_DO_REDEMPTION', section: 'PALCO', icon: '👹',
    name: 'Monstro do Redemption',
    hook: 'STATS_PARCIAL',
    gatilho: "tournamentTier === 'REDEMPTION'",
    tiers: {
      NEG: { variantName: 'Orgulho Ferido',        descricao: '-15% em todos em torneios Redemption.' },
      COM: { variantName: 'Monstro do Redemption', descricao: '+20% em todos em torneios Redemption.' },
      RAR: { variantName: 'Monstro do Redemption', descricao: '+30% em todos + forma mínima HOT_STREAK em torneios de Redemption.' },
      LEN: { variantName: 'Monstro do Redemption', descricao: '+40% em todos em Redemption + burst damage +20%.' },
    },
  },

  // ████ IX. RIVALIDADE ████
  MEMORIA_FOTOGRAFICA: {
    id: 'MEMORIA_FOTOGRAFICA', section: 'RIVALIDADE', icon: '📸',
    name: 'Memória Fotográfica',
    hook: 'FORM_MULTIPLIER',
    gatilho: 'rivalryMemory >= 3',
    tiers: {
      NEG: { variantName: 'Sempre o Mesmo',     descricao: 'Ignora histórico de rivalidade na seleção de bey.' },
      COM: { variantName: 'Memoria de Elefante', descricao: '+20% counter-pick accuracy com 3+ confrontos no histórico.' },
      RAR: { variantName: 'Memoria Fotografica', descricao: '+25% counter-pick + +15% adaptability a partir do segundo encontro.' },
      LEN: { variantName: 'Memoria Fotografica', descricao: '+30% em todos vs rivais frequentes + counter-pick automático ótimo.' },
    },
  },
  PSICOLOGICO: {
    id: 'PSICOLOGICO', section: 'RIVALIDADE', icon: '🧠',
    name: 'Psicológico',
    hook: 'STATS_PARCIAL',
    gatilho: 'h2h vantagem >= 3 vitórias',
    tiers: {
      NEG: { variantName: 'Complexo do Adversario', descricao: '-15% intelligence quando já perdeu 3+ vezes para o mesmo jogador.' },
      COM: { variantName: 'Psicologico',             descricao: '+10% clutch quando lidera o h2h por 2+ vitórias.' },
      RAR: { variantName: 'Psicologico',             descricao: '+20% em todos com h2h >= 3-1 e forma positiva.' },
      LEN: { variantName: 'Psicologico',             descricao: 'Com vantagem histórica de 5+: +30% em todos no R1.' },
    },
  },
  ESPECIALISTA_EM_REVANCHE: {
    id: 'ESPECIALISTA_EM_REVANCHE', section: 'RIVALIDADE', icon: '🔁',
    name: 'Especialista em Revanche',
    hook: 'STATS_PARCIAL',
    gatilho: 'último resultado vs esse adversário = derrota',
    tiers: {
      NEG: { variantName: 'Complexo de Revanche',     descricao: '-15% em todos ao rematchar adversário que venceu na última.' },
      COM: { variantName: 'Especialista em Revanche', descricao: '+15% intelligence e adaptability em revanche após uma derrota.' },
      RAR: { variantName: 'Especialista em Revanche', descricao: '+25% em todos na revanche + lançamento melhora 1 tier.' },
      LEN: { variantName: 'Especialista em Revanche', descricao: '+35% em todos na revanche + forma HOT_STREAK mínimo.' },
    },
  },
  RIVAL_ETERNO: {
    id: 'RIVAL_ETERNO', section: 'RIVALIDADE', icon: '⚔️',
    name: 'Rival Eterno',
    hook: 'FORM_MULTIPLIER',
    gatilho: 'total de confrontos >= 5',
    tiers: {
      NEG: { variantName: 'Saturacao de Rival', descricao: 'Após 5+ confrontos com o mesmo adversário, -10% adaptability.' },
      COM: { variantName: 'Rival Eterno',        descricao: '+10% em todos ao enfrentar um rival com 5+ confrontos no histórico.' },
      RAR: { variantName: 'Rival Eterno',        descricao: '+20% em todos com rival de 5+ confrontos + forma não decai durante o torneio.' },
      LEN: { variantName: 'Rival Eterno',        descricao: '+30% em todos + HOT_STREAK garantido ao enfrentar rival eterno.' },
    },
  },

  // ████ X. DESENVOLVIMENTO ████
  SUPERPRODIGIO: {
    id: 'SUPERPRODIGIO', section: 'DESENVOLVIMENTO', icon: '🌱',
    name: 'Superprodígio',
    hook: 'AGE_FACTOR',
    gatilho: 'calculateGrowth()',
    tiers: {
      NEG: { variantName: 'Pico Precoce',   descricao: 'Crescimento 30% mais lento após os 22 anos na fase de ascensão.' },
      COM: { variantName: 'Prodigio',       descricao: 'Taxa de crescimento +15% no geral.' },
      RAR: { variantName: 'Superprodigio',  descricao: 'Taxa de crescimento +30% + chance de breakthrough x1.5.' },
      LEN: { variantName: 'Superprodigio',  descricao: 'Taxa de crescimento +50% + breakthrough garantido a cada 2 zonas.' },
    },
  },
  DIAMANTE_BRUTO: {
    id: 'DIAMANTE_BRUTO', section: 'DESENVOLVIMENTO', icon: '💎',
    name: 'Diamante Bruto',
    hook: 'AGE_FACTOR',
    gatilho: 'breakthrough em DevelopmentSystem',
    tiers: {
      NEG: { variantName: 'Teto de Vidro',  descricao: 'Crescimento para 15% antes do teto real de potencial.' },
      COM: { variantName: 'Diamante Bruto', descricao: 'Breakthrough dá +5 ao pool de atributos (em vez de +3).' },
      RAR: { variantName: 'Diamante Bruto', descricao: 'Breakthrough dá +7 ao pool + 8 meses de crescimento acelerado.' },
      LEN: { variantName: 'Diamante Bruto', descricao: 'Breakthrough dá +10 ao pool + 12 meses acelerados + chance de avançar 2 zonas.' },
    },
  },
  VETERANO_ETERNO: {
    id: 'VETERANO_ETERNO', section: 'DESENVOLVIMENTO', icon: '🏛️',
    name: 'Veterano Eterno',
    hook: 'AGE_FACTOR',
    gatilho: 'processDecline()',
    tiers: {
      NEG: { variantName: 'Declinio Agressivo', descricao: 'Taxa de declínio x2. Envelhece mais rápido que o normal.' },
      COM: { variantName: 'Veterano Imortal',   descricao: 'Declínio reduzido de 3% para 1.5% por ano.' },
      RAR: { variantName: 'Veterano Eterno',    descricao: 'Declínio 0.8% por ano + pode ter breakthroughs mesmo após os 35.' },
      LEN: { variantName: 'Veterano Eterno',    descricao: 'Declínio 0.3% por ano. Breakthroughs possíveis a qualquer idade.' },
    },
  },
  RENASCIMENTO_TARDIO: {
    id: 'RENASCIMENTO_TARDIO', section: 'DESENVOLVIMENTO', icon: '🌅',
    name: 'Renascimento Tardio',
    hook: 'AGE_FACTOR',
    gatilho: 'age >= 28',
    tiers: {
      NEG: { variantName: 'Limite de Idade',    descricao: 'Atributos não mais melhoram após os 30.' },
      COM: { variantName: 'Renascimento Tardio',descricao: 'Crescimento normal até 28, depois +50% taxa de 28 aos 34.' },
      RAR: { variantName: 'Renascimento Tardio',descricao: 'Crescimento normal até 30, depois +70% taxa de 30 aos 36.' },
      LEN: { variantName: 'Renascimento Tardio',descricao: 'A partir dos 30, cresce à taxa de PRODIGY por 8 anos.' },
    },
  },
  BLINDAGEM_DE_CARREIRA: {
    id: 'BLINDAGEM_DE_CARREIRA', section: 'DESENVOLVIMENTO', icon: '🔒',
    name: 'Blindagem de Carreira',
    hook: 'AGE_FACTOR',
    gatilho: 'processDecline()',
    tiers: {
      NEG: { variantName: 'Erosao Silenciosa',     descricao: 'Atributos podem perder -0.5 por torneio aleatoriamente mesmo no peak.' },
      COM: { variantName: 'Blindagem de Carreira', descricao: 'Atributos nunca caem abaixo de 90% do peak.' },
      RAR: { variantName: 'Blindagem de Carreira', descricao: 'Atributos nunca abaixo de 95% do peak + forma nunca atinge ROCK_BOTTOM.' },
      LEN: { variantName: 'Blindagem de Carreira', descricao: 'Atributos permanentemente travados no peak. Declínio impossível.' },
    },
  },

  // ████ XI. FORMA ████
  INERCIAL: {
    id: 'INERCIAL', section: 'FORMA', icon: '🌊',
    name: 'Inercial',
    hook: 'MOMENTUM',
    gatilho: 'advanceTournament() decay',
    tiers: {
      NEG: { variantName: 'Memoria Curta', descricao: 'Decay de forma entre torneios 15% ao invés de 5%.' },
      COM: { variantName: 'Inercial',      descricao: 'Decay de forma entre torneios 2.5% (metade do normal).' },
      RAR: { variantName: 'Inercial',      descricao: 'Decay entre torneios zerado + ganhos de forma em HOT_STREAK x1.3.' },
      LEN: { variantName: 'Inercial',      descricao: 'Forma não decai naturalmente. Só muda por resultado de partidas.' },
    },
  },
  RECUPERACAO_RAPIDA: {
    id: 'RECUPERACAO_RAPIDA', section: 'FORMA', icon: '💊',
    name: 'Recuperação Rápida',
    hook: 'MOMENTUM',
    gatilho: 'ganhos de forma pos-vitória',
    tiers: {
      NEG: { variantName: 'Espiral Descendente',descricao: 'Abaixo de -30 de forma, cada derrota causa -18 extra.' },
      COM: { variantName: 'Recuperacao Rapida', descricao: 'Recuperação de SLUMP 50% mais rápida. Vitória em SLUMP vale x1.5 de forma.' },
      RAR: { variantName: 'Recuperacao Rapida', descricao: 'Pode ir de ROCK_BOTTOM para NEUTRAL em 2 vitórias.' },
      LEN: { variantName: 'Recuperacao Rapida', descricao: 'Reset Imediato: após 3 derrotas consecutivas, forma salta para NEUTRAL.' },
    },
  },
  PICO_DE_ADRENALINA: {
    id: 'PICO_DE_ADRENALINA', section: 'FORMA', icon: '📈',
    name: 'Pico de Adrenalina',
    hook: 'FORM_MULTIPLIER',
    gatilho: 'forma >= 90 (ON_FIRE)',
    tiers: {
      NEG: { variantName: 'Efeito Gangorra',    descricao: 'Quando forma acima de 60, qualquer derrota causa -24 ao invés de -12.' },
      COM: { variantName: 'Em Chamas',          descricao: 'Forma pode alcançar 105 com bônus extra de 3% em ON_FIRE.' },
      RAR: { variantName: 'Pico de Adrenalina', descricao: 'Forma pode chegar a 110 + bônus de forma x1.5 no estado máximo.' },
      LEN: { variantName: 'Pico de Adrenalina', descricao: 'Transcendência: em forma 95+, atributos ganham +20% extra por cima do ON_FIRE.' },
    },
  },
  BASE_SOLIDA: {
    id: 'BASE_SOLIDA', section: 'FORMA', icon: '⚓',
    name: 'Base Sólida',
    hook: 'FORM_CAP',
    gatilho: 'piso mínimo do multiplier',
    tiers: {
      NEG: { variantName: 'Colapso Psicologico', descricao: 'Forma pode cair para -10 abaixo de ROCK_BOTTOM criando estado de quase-paralisia.' },
      COM: { variantName: 'Resiliencia Bruta',   descricao: 'Form multiplier nunca abaixo de 0.85.' },
      RAR: { variantName: 'Base Solida',         descricao: 'Form multiplier nunca abaixo de 0.90 + sai de estados ruins mais rápido.' },
      LEN: { variantName: 'Base Solida',         descricao: 'Form multiplier nunca abaixo de 0.95. Mesmo em ROCK_BOTTOM, performa perto do neutro.' },
    },
  },
  BOLA_DE_NEVE: {
    id: 'BOLA_DE_NEVE', section: 'FORMA', icon: '🌨️',
    name: 'Bola de Neve',
    hook: 'MOMENTUM',
    gatilho: 'ganho de forma por vitória',
    tiers: {
      NEG: { variantName: 'Frieza',      descricao: 'Ganho de forma por vitória x0.6. Nunca entra em estado elevado.' },
      COM: { variantName: 'Bola de Neve',descricao: 'Ganho de forma por vitória +20 ao invés de +15.' },
      RAR: { variantName: 'Bola de Neve',descricao: 'Ganho por vitória +25 + em HOT_STREAK: cada nova vitória dá +3 extra.' },
      LEN: { variantName: 'Bola de Neve',descricao: 'Ganho por vitória +30 + winStreak >= 3 dobra o ganho de forma.' },
    },
  },

  // ████ XII. CONSISTÊNCIA ████
  MAQUINA: {
    id: 'MAQUINA', section: 'CONSISTÊNCIA', icon: '🤖',
    name: 'Máquina',
    hook: 'FORM_CAP',
    gatilho: 'reduz variância geral',
    tiers: {
      NEG: { variantName: 'Previsivel', descricao: 'Adversário com 3+ confrontos ganha +10% adaptability automaticamente.' },
      COM: { variantName: 'Maquina',    descricao: 'Variância de resultado -15% + lançamento nunca abaixo de STANDARD.' },
      RAR: { variantName: 'Maquina',    descricao: 'Variância -25% + CRITICAL_FAIL impossível + lançamento STANDARD mínimo.' },
      LEN: { variantName: 'Maquina',   descricao: 'Variância -50% + CRITICAL_FAIL impossível + sem swings extremos.' },
    },
  },
  INQUEBRAVEL: {
    id: 'INQUEBRAVEL', section: 'CONSISTÊNCIA', icon: '🧲',
    name: 'Inquebrável',
    hook: 'FORM_CAP',
    gatilho: 'garante forma mínima no início de partidas',
    tiers: {
      NEG: { variantName: 'Desmotivado',  descricao: 'Derrota em torneio cancela todos os bônus de forma para a próxima partida.' },
      COM: { variantName: 'Inquebravel',  descricao: 'Após derrota, forma nunca cai abaixo de NEUTRAL para a próxima partida.' },
      RAR: { variantName: 'Inquebravel',  descricao: 'Primeira partida de qualquer torneio sempre começa em IN_FORM mínimo.' },
      LEN: { variantName: 'Inquebravel',  descricao: 'Bônus de momentum adversário reduzidos -50%. Forma nunca abaixo de IN_FORM.' },
    },
  },
  ESPECIALISTA_EM_SERIE: {
    id: 'ESPECIALISTA_EM_SERIE', section: 'CONSISTÊNCIA', icon: '🎯',
    name: 'Especialista em Série',
    hook: 'STATS_PARCIAL',
    gatilho: 'stacking por vitórias dentro do torneio',
    tiers: {
      NEG: { variantName: 'Pressao da Sequencia',  descricao: 'Cada vitória no torneio adiciona -2% em todos.' },
      COM: { variantName: 'Especialista em Serie', descricao: 'Cada vitória no torneio: +3% em todos para a próxima partida (acumula até +15%).' },
      RAR: { variantName: 'Especialista em Serie', descricao: '+5% por vitória (até +25%) + forma não decai entre partidas do mesmo torneio.' },
      LEN: { variantName: 'Especialista em Serie', descricao: '+7% por vitória (até +35%) + cada nova fase reinicia a progressão com bônus base.' },
    },
  },
  VOLATILIDADE_CALCULADA: {
    id: 'VOLATILIDADE_CALCULADA', section: 'CONSISTÊNCIA', icon: '📊',
    name: 'Volatilidade Calculada',
    hook: 'FORM_MULTIPLIER',
    gatilho: 'forma extrema (ON_FIRE ou ROCK_BOTTOM)',
    tiers: {
      NEG: { variantName: 'Montanha Russa',         descricao: 'Swings de forma x2 em ambas as direções.' },
      COM: { variantName: 'Volatilidade Calculada', descricao: 'Em ON_FIRE: +10% bônus adicional. Em ROCK_BOTTOM: -5% menos penalidade.' },
      RAR: { variantName: 'Volatilidade Calculada', descricao: 'Efeitos de forma amplificados 50% no topo + floor mínimo (SLUMP max).' },
      LEN: { variantName: 'Volatilidade Calculada', descricao: 'Em ON_FIRE: +40% em todos (Transcendente). Mínimo garantido em NEUTRAL.' },
    },
  },
};

// ── HELPER: Retorna dados de exibição para uma trait de jogador ──
export function getTraitDisplayData(traitId, tier) {
  const trait = TRAITS[traitId];
  if (!trait) return null;
  const tierData = trait.tiers?.[tier];
  if (!tierData) return null;
  return {
    id: traitId,
    tier,
    section: trait.section,
    icon: trait.icon,
    conceptName: trait.name,
    name: tierData.variantName,
    descricao: tierData.descricao,
    hook: trait.hook,
    isPositive: isPositiveTier(tier),
  };
}

// ── HELPER: Split positivo/negativo para exibição ──
export function getPlayerTraitsSplitV2(playerTraits = []) {
  const positivos = [];
  const negativos = [];
  for (const t of playerTraits) {
    const data = getTraitDisplayData(t.id, t.tier);
    if (!data) continue;
    if (data.isPositive) positivos.push(data);
    else negativos.push(data);
  }
  return { positivos, negativos };
}

// ============================================================
// ATRIBUIÇÕES DE TRAITS E ARENA FAVORITA POR JOGADOR
// ============================================================

export const PLAYER_TRAITS = {

  // ── ELITE (3+ traits, pode ter LEN) ──────────────────────

  'Marcus "The Wall" Williams': {
    favoriteArena: 'BB10_COMPETITIVE',
    traits: [
      { id: 'SANGUE_FRIO',  tier: 'COM' },
      { id: 'FECHADOR',     tier: 'COM' },
      { id: 'MAO_FIRME',    tier: 'COM' },
      { id: 'AVALANCHE',    tier: 'NEG' },
    ],
    traitDNA: 63,
    negTypes: { AVALANCHE: 'SOMBRA' },
    shadowProgress: { wonAsFavorite: 0 },
    traitMilestones: { firstTitle: true, comeback02: true, rivalryFormed: true, reachedPeak: false },
  },
  'Sávio "Blast Boom" Luiz': {
    favoriteArena: 'COLOSSEUM_CARNAGE',
    traits: [
      { id: 'DESTRUIDOR_DE_BURST', tier: 'LEN' },
      { id: 'REI_DOS_GRUPOS',      tier: 'COM' },
      { id: 'PISTOLEIRO',          tier: 'COM' },
      { id: 'ARMADURA_VIVA',       tier: 'NEG' },
    ],
    traitDNA: 92,
    negTypes: { ARMADURA_VIVA: 'CICATRIZ' },
    shadowProgress: {},
    traitMilestones: { firstTitle: true, comeback02: true, rivalryFormed: true, reachedPeak: false },
  },
  'Klaus "Precision" Müller': {
    favoriteArena: 'PANGEA_PLATFORM',
    traits: [
      { id: 'PERFECCIONISTA',      tier: 'RAR' },
      { id: 'MENTALIDADE_DE_SET',  tier: 'COM' },
      { id: 'MAQUINA',             tier: 'COM' },
      { id: 'ESPECIALISTA_MATA_MATA', tier: 'NEG' },
    ],
    traitDNA: 71,
    negTypes: { ESPECIALISTA_MATA_MATA: 'SOMBRA' },
    shadowProgress: { wonKOMatches: 0 },
    traitMilestones: { firstTitle: true, comeback02: false, rivalryFormed: true, reachedPeak: false },
  },
  'Takeshi "Iron Tank" Yamamoto': {
    favoriteArena: 'VOLCANIC_RAGE',
    traits: [
      { id: 'ARMADURA_VIVA',    tier: 'RAR' },
      { id: 'ULTRAMARATONISTA', tier: 'RAR' },
      { id: 'MAQUINA',          tier: 'COM' },
      { id: 'VETERANO_ETERNO',  tier: 'NEG' },
    ],
    traitDNA: 88,
    negTypes: { VETERANO_ETERNO: 'CICATRIZ' },
    shadowProgress: {},
    traitMilestones: { firstTitle: true, comeback02: true, rivalryFormed: true, reachedPeak: true },
  },
  'William "Lionheart" Sterling': {
    favoriteArena: 'BB10_COMPETITIVE',
    traits: [
      { id: 'SANGUE_FRIO',         tier: 'LEN' },
      { id: 'SANGUE_DE_CAMPEON',   tier: 'COM' },
      { id: 'AVALANCHE',           tier: 'COM' },
      { id: 'CACADOR_DE_GIGANTES', tier: 'NEG' },
    ],
    traitDNA: 84,
    negTypes: { CACADOR_DE_GIGANTES: 'SOMBRA' },
    shadowProgress: { wonVsHigherTier: 0 },
    traitMilestones: { firstTitle: true, comeback02: true, rivalryFormed: true, reachedPeak: false },
  },
  'Erik "Viking" Andersson': {
    favoriteArena: 'VOLCANIC_RAGE',
    traits: [
      { id: 'ETERNO_GIRO',         tier: 'RAR' },
      { id: 'VETERANO_ETERNO',     tier: 'RAR' },
      { id: 'GUERRA_DE_ATRITO',    tier: 'COM' },
      { id: 'DESTRUIDOR_DE_BURST', tier: 'NEG' },
    ],
    traitDNA: 83,
    negTypes: { DESTRUIDOR_DE_BURST: 'CICATRIZ' },
    shadowProgress: {},
    traitMilestones: { firstTitle: true, comeback02: true, rivalryFormed: true, reachedPeak: true },
  },
  'Arjun "Maharaja" Singh': {
    favoriteArena: 'NEXUS',
    traits: [
      { id: 'ESPECIALISTA_MATA_MATA', tier: 'RAR' },
      { id: 'REI_DA_SELVA',           tier: 'COM' },
      { id: 'MEMORIA_FOTOGRAFICA',    tier: 'COM' },
      { id: 'SANGUE_DE_CAMPEON',      tier: 'NEG' },
    ],
    traitDNA: 68,
    negTypes: { SANGUE_DE_CAMPEON: 'SOMBRA' },
    shadowProgress: { wonBigMatches: 0 },
    traitMilestones: { firstTitle: true, comeback02: false, rivalryFormed: true, reachedPeak: false },
  },
  'Nikola "Balkan Beast" Jovanović': {
    favoriteArena: 'COLOSSEUM_CARNAGE',
    traits: [
      { id: 'VIRADISTA',          tier: 'LEN' },
      { id: 'BOLA_DE_NEVE',       tier: 'RAR' },
      { id: 'SANGUE_DE_CAMPEON',  tier: 'COM' },
      { id: 'RECUPERACAO_RAPIDA', tier: 'NEG' },
    ],
    traitDNA: 93,
    negTypes: { RECUPERACAO_RAPIDA: 'CICATRIZ' },
    shadowProgress: {},
    traitMilestones: { firstTitle: true, comeback02: true, rivalryFormed: true, reachedPeak: false },
  },

  // ── TOP (2-3 traits, pode ter RAR) ───────────────────────

  'Diego "Táctico" Navarro': {
    favoriteArena: 'NEXUS',
    traits: [
      { id: 'MENTALIDADE_DE_SET',  tier: 'COM' },
      { id: 'MEMORIA_FOTOGRAFICA', tier: 'COM' },
      { id: 'REI_DA_SELVA',        tier: 'NEG' },
    ],
    traitDNA: 40,
    negTypes: { REI_DA_SELVA: 'CICATRIZ' },
    shadowProgress: {},
    traitMilestones: { firstTitle: true, comeback02: false, rivalryFormed: true, reachedPeak: false },
  },
  'Jean "Infinite Spin" Dubois': {
    favoriteArena: 'VORTEX_COLISEUM',
    traits: [
      { id: 'ULTRAMARATONISTA',  tier: 'RAR' },
      { id: 'ETERNO_GIRO',       tier: 'COM' },
      { id: 'PICO_DE_ADRENALINA',tier: 'NEG' },
    ],
    traitDNA: 58,
    negTypes: { PICO_DE_ADRENALINA: 'SOMBRA' },
    shadowProgress: { wonHotStreak: 0 },
    traitMilestones: { firstTitle: true, comeback02: false, rivalryFormed: false, reachedPeak: false },
  },
  'Leonardo "Harmony" Rossi': {
    favoriteArena: 'VORTEX_COLISEUM',
    traits: [
      { id: 'REI_DA_SELVA',        tier: 'COM' },
      { id: 'CAMALEAO',            tier: 'COM' },
      { id: 'CACADOR_DE_GIGANTES', tier: 'NEG' },
    ],
    traitDNA: 38,
    negTypes: { CACADOR_DE_GIGANTES: 'CICATRIZ' },
    shadowProgress: {},
    traitMilestones: { firstTitle: false, comeback02: false, rivalryFormed: true, reachedPeak: false },
  },
  'Raj "Chakra" Patel': {
    favoriteArena: 'NEXUS',
    traits: [
      { id: 'ESPECIALISTA_MATA_MATA', tier: 'COM' },
      { id: 'MEMORIA_FOTOGRAFICA',    tier: 'COM' },
      { id: 'CAMALEAO',               tier: 'NEG' },
    ],
    traitDNA: 42,
    negTypes: { CAMALEAO: 'CICATRIZ' },
    shadowProgress: {},
    traitMilestones: { firstTitle: true, comeback02: false, rivalryFormed: false, reachedPeak: false },
  },
  'Liam "Storm" Fletcher': {
    favoriteArena: 'STORM_TRACK',
    traits: [
      { id: 'REI_DOS_GRUPOS',  tier: 'COM' },
      { id: 'REI_DA_SELVA',    tier: 'COM' },
      { id: 'ULTRAMARATONISTA',tier: 'NEG' },
    ],
    traitDNA: 37,
    negTypes: { ULTRAMARATONISTA: 'SOMBRA' },
    shadowProgress: { wonFinalRoundMatches: 0 },
    traitMilestones: { firstTitle: false, comeback02: false, rivalryFormed: true, reachedPeak: false },
  },
  'Isaiah "Velocity" Jackson': {
    favoriteArena: 'KILLER_SIDES',
    traits: [
      { id: 'AVALANCHE',     tier: 'COM' },
      { id: 'REI_DOS_GRUPOS',tier: 'COM' },
      { id: 'PISTOLEIRO',    tier: 'NEG' },
    ],
    traitDNA: 55,
    negTypes: { PISTOLEIRO: 'SOMBRA' },
    shadowProgress: { survivedAggressiveTech: 0 },
    traitMilestones: { firstTitle: true, comeback02: false, rivalryFormed: true, reachedPeak: false },
  },
  'Roberto "Caribe" Sánchez': {
    favoriteArena: 'NEXUS',
    traits: [
      { id: 'ESPECIALISTA_EM_SERIE', tier: 'COM' },
      { id: 'MEMORIA_FOTOGRAFICA',   tier: 'COM' },
      { id: 'REI_DOS_GRUPOS',        tier: 'NEG' },
    ],
    traitDNA: 41,
    negTypes: { REI_DOS_GRUPOS: 'CICATRIZ' },
    shadowProgress: {},
    traitMilestones: { firstTitle: true, comeback02: false, rivalryFormed: false, reachedPeak: false },
  },
  'Mateo "Condor" Flores': {
    favoriteArena: 'BB10_COMPETITIVE',
    traits: [
      { id: 'ULTRAMARATONISTA', tier: 'COM' },
      { id: 'RELOGIO_BIOLOGICO',tier: 'COM' },
      { id: 'AVALANCHE',        tier: 'NEG' },
    ],
    traitDNA: 35,
    negTypes: { AVALANCHE: 'CICATRIZ' },
    shadowProgress: {},
    traitMilestones: { firstTitle: false, comeback02: false, rivalryFormed: false, reachedPeak: false },
  },
  'Sebastián "Tango" Méndez': {
    favoriteArena: 'VORTEX_COLISEUM',
    traits: [
      { id: 'ESPECIALISTA_EM_SERIE', tier: 'COM' },
      { id: 'REI_DA_SELVA',          tier: 'COM' },
      { id: 'CAMALEAO',              tier: 'NEG' },
    ],
    traitDNA: 37,
    negTypes: { CAMALEAO: 'SOMBRA' },
    shadowProgress: { wonOutsideFavorite: 0 },
    traitMilestones: { firstTitle: false, comeback02: false, rivalryFormed: true, reachedPeak: false },
  },
  'Pierre "Le Phantom" Dubois': {
    favoriteArena: 'KILLER_SIDES',
    traits: [
      { id: 'PISTOLEIRO',    tier: 'COM' },
      { id: 'REI_DOS_GRUPOS',tier: 'COM' },
      { id: 'FECHADOR',      tier: 'NEG' },
    ],
    traitDNA: 43,
    negTypes: { FECHADOR: 'SOMBRA' },
    shadowProgress: { closedMatchPoints: 0 },
    traitMilestones: { firstTitle: true, comeback02: false, rivalryFormed: false, reachedPeak: false },
  },
  'João "Navegador" Carvalho': {
    favoriteArena: 'NEXUS',
    traits: [
      { id: 'CAMALEAO',           tier: 'COM' },
      { id: 'MEMORIA_FOTOGRAFICA',tier: 'COM' },
      { id: 'RELAMPAGO',          tier: 'NEG' },
    ],
    traitDNA: 36,
    negTypes: { RELAMPAGO: 'CICATRIZ' },
    shadowProgress: {},
    traitMilestones: { firstTitle: false, comeback02: false, rivalryFormed: true, reachedPeak: false },
  },
  'Mikkel "Aurora" Jørgensen': {
    favoriteArena: 'STORM_TRACK',
    traits: [
      { id: 'CAMALEAO',          tier: 'COM' },
      { id: 'MENTALIDADE_DE_SET',tier: 'COM' },
      { id: 'RECUPERACAO_RAPIDA',tier: 'NEG' },
    ],
    traitDNA: 40,
    negTypes: { RECUPERACAO_RAPIDA: 'CICATRIZ' },
    shadowProgress: {},
    traitMilestones: { firstTitle: true, comeback02: false, rivalryFormed: false, reachedPeak: false },
  },
  'Aleksi "Sauna" Virtanen': {
    favoriteArena: 'BB10_COMPETITIVE',
    traits: [
      { id: 'BASE_SOLIDA',     tier: 'COM' },
      { id: 'ULTRAMARATONISTA',tier: 'COM' },
      { id: 'INERCIAL',        tier: 'NEG' },
    ],
    traitDNA: 38,
    negTypes: { INERCIAL: 'SOMBRA' },
    shadowProgress: { wonTournamentOpener: 0 },
    traitMilestones: { firstTitle: true, comeback02: false, rivalryFormed: false, reachedPeak: false },
  },
  'Mehmet "Sultan" Yılmaz': {
    favoriteArena: 'NEXUS',
    traits: [
      { id: 'REI_DA_SELVA',       tier: 'COM' },
      { id: 'MEMORIA_FOTOGRAFICA',tier: 'COM' },
      { id: 'CAMALEAO',           tier: 'NEG' },
    ],
    traitDNA: 44,
    negTypes: { CAMALEAO: 'CICATRIZ' },
    shadowProgress: {},
    traitMilestones: { firstTitle: true, comeback02: false, rivalryFormed: true, reachedPeak: false },
  },
  'Hiroshi "Shadow Blade" Nakamura': {
    favoriteArena: 'KILLER_SIDES',
    traits: [
      { id: 'PERFECCIONISTA',   tier: 'COM' },
      { id: 'MENTALIDADE_DE_SET',tier: 'COM' },
      { id: 'SANGUE_DE_CAMPEON',tier: 'NEG' },
    ],
    traitDNA: 48,
    negTypes: { SANGUE_DE_CAMPEON: 'SOMBRA' },
    shadowProgress: { wonBigMatches: 0 },
    traitMilestones: { firstTitle: true, comeback02: false, rivalryFormed: true, reachedPeak: false },
  },
  'Somchai "Golden Temple" Suwan': {
    favoriteArena: 'VORTEX_COLISEUM',
    traits: [
      { id: 'REI_DA_SELVA',          tier: 'COM' },
      { id: 'ESPECIALISTA_MATA_MATA', tier: 'COM' },
      { id: 'FENIX',                 tier: 'NEG' },
    ],
    traitDNA: 36,
    negTypes: { FENIX: 'CICATRIZ' },
    shadowProgress: {},
    traitMilestones: { firstTitle: false, comeback02: false, rivalryFormed: false, reachedPeak: false },
  },
  'Amir "Silk Road" Kazemi': {
    favoriteArena: 'NEXUS',
    traits: [
      { id: 'CAMALEAO',             tier: 'COM' },
      { id: 'ESPECIALISTA_EM_SERIE',tier: 'COM' },
      { id: 'CRONOMETRO',           tier: 'NEG' },
    ],
    traitDNA: 41,
    negTypes: { CRONOMETRO: 'CICATRIZ' },
    shadowProgress: {},
    traitMilestones: { firstTitle: true, comeback02: false, rivalryFormed: false, reachedPeak: false },
  },
  'Hassan "Crescent" Malik': {
    favoriteArena: 'STORM_TRACK',
    traits: [
      { id: 'MENTALIDADE_DE_SET',  tier: 'COM' },
      { id: 'MEMORIA_FOTOGRAFICA', tier: 'COM' },
      { id: 'AVALANCHE',           tier: 'NEG' },
    ],
    traitDNA: 39,
    negTypes: { AVALANCHE: 'SOMBRA' },
    shadowProgress: { wonAsFavorite: 0 },
    traitMilestones: { firstTitle: false, comeback02: false, rivalryFormed: true, reachedPeak: false },
  },
  'Arif "Archipelago" Rahman': {
    favoriteArena: 'BB10_COMPETITIVE',
    traits: [
      { id: 'RELOGIO_BIOLOGICO', tier: 'COM' },
      { id: 'ULTRAMARATONISTA',  tier: 'COM' },
      { id: 'CACADOR_DE_GIGANTES', tier: 'NEG' },
    ],
    traitDNA: 37,
    negTypes: { CACADOR_DE_GIGANTES: 'CICATRIZ' },
    shadowProgress: {},
    traitMilestones: { firstTitle: false, comeback02: false, rivalryFormed: false, reachedPeak: false },
  },
  'Kofi "Sahara" Diallo': {
    favoriteArena: 'PANGEA_PLATFORM',
    traits: [
      { id: 'BASE_SOLIDA',       tier: 'COM' },
      { id: 'ULTRAMARATONISTA',  tier: 'COM' },
      { id: 'PICO_DE_ADRENALINA',tier: 'NEG' },
    ],
    traitDNA: 38,
    negTypes: { PICO_DE_ADRENALINA: 'CICATRIZ' },
    shadowProgress: {},
    traitMilestones: { firstTitle: false, comeback02: false, rivalryFormed: false, reachedPeak: false },
  },
  'Koa "Reef Guardian" Kealoha': {
    favoriteArena: 'VORTEX_COLISEUM',
    traits: [
      { id: 'REI_DA_SELVA', tier: 'COM' },
      { id: 'CAMALEAO',     tier: 'COM' },
      { id: 'FENIX',        tier: 'NEG' },
    ],
    traitDNA: 42,
    negTypes: { FENIX: 'SOMBRA' },
    shadowProgress: { recoveredFromRockBottom: 0 },
    traitMilestones: { firstTitle: false, comeback02: false, rivalryFormed: false, reachedPeak: false },
  },

  // ── PRO (1 COM + 1 NEG) ───────────────────────────────────

  'Alex "Frostbite" Tremblay': {
    favoriteArena: 'STORM_TRACK',
    traits: [{ id: 'BOLA_DE_NEVE', tier: 'COM' }, { id: 'INERCIAL', tier: 'NEG' }],
      traitDNA: 28,
    negTypes: { INERCIAL: 'CICATRIZ' },
    shadowProgress: {},
    traitMilestones: { firstTitle: false, comeback02: false, rivalryFormed: false, reachedPeak: false },
  },
  'Oliver "Wild Card" Ashford': {
    favoriteArena: 'KILLER_SIDES',
    traits: [{ id: 'DESTRUIDOR_DE_BURST', tier: 'COM' }, { id: 'ARMADURA_VIVA', tier: 'NEG' }],
      traitDNA: 22,
    negTypes: { ARMADURA_VIVA: 'CICATRIZ' },
    shadowProgress: {},
    traitMilestones: { firstTitle: false, comeback02: false, rivalryFormed: false, reachedPeak: false },
  },
  'Chen "Dragon Wall" Wei': {
    favoriteArena: 'VOLCANIC_RAGE',
    traits: [{ id: 'ARMADURA_VIVA', tier: 'COM' }, { id: 'CAMALEAO', tier: 'NEG' }],
      traitDNA: 31,
    negTypes: { CAMALEAO: 'CICATRIZ' },
    shadowProgress: {},
    traitMilestones: { firstTitle: false, comeback02: false, rivalryFormed: false, reachedPeak: false },
  },
  'Park "E-Striker" Min-Jun': {
    favoriteArena: 'KILLER_SIDES',
    traits: [{ id: 'REI_DOS_GRUPOS', tier: 'COM' }, { id: 'ULTRAMARATONISTA', tier: 'NEG' }],
      traitDNA: 25,
    negTypes: { ULTRAMARATONISTA: 'SOMBRA' },
    shadowProgress: { wonFinalRoundMatches: 0 },
    traitMilestones: { firstTitle: false, comeback02: false, rivalryFormed: false, reachedPeak: false },
  },
  'Hassan "Pharaoh" Al-Rahman': {
    favoriteArena: 'VORTEX_COLISEUM',
    traits: [{ id: 'ETERNO_GIRO', tier: 'COM' }, { id: 'CAMALEAO', tier: 'NEG' }],
      traitDNA: 20,
    negTypes: { CAMALEAO: 'CICATRIZ' },
    shadowProgress: {},
    traitMilestones: { firstTitle: false, comeback02: false, rivalryFormed: false, reachedPeak: false },
  },
  'Thabo "Thunder" Nkosi': {
    favoriteArena: 'COLOSSEUM_CARNAGE',
    traits: [{ id: 'DESTRUIDOR_DE_BURST', tier: 'COM' }, { id: 'ARMADURA_VIVA', tier: 'NEG' }],
      traitDNA: 19,
    negTypes: { ARMADURA_VIVA: 'CICATRIZ' },
    shadowProgress: {},
    traitMilestones: { firstTitle: false, comeback02: false, rivalryFormed: false, reachedPeak: false },
  },
  'Jake "Outback" Morrison': {
    favoriteArena: 'STORM_TRACK',
    traits: [{ id: 'BOLA_DE_NEVE', tier: 'COM' }, { id: 'REI_DOS_GRUPOS', tier: 'NEG' }],
      traitDNA: 33,
    negTypes: { REI_DOS_GRUPOS: 'SOMBRA' },
    shadowProgress: { topGroupFinishes: 0 },
    traitMilestones: { firstTitle: false, comeback02: false, rivalryFormed: false, reachedPeak: false },
  },
  'Carlos "El Matador" Hernández': {
    favoriteArena: 'COLOSSEUM_CARNAGE',
    traits: [{ id: 'REI_DOS_GRUPOS', tier: 'COM' }, { id: 'DESTRUIDOR_DE_BURST', tier: 'NEG' }],
      traitDNA: 27,
    negTypes: { DESTRUIDOR_DE_BURST: 'CICATRIZ' },
    shadowProgress: {},
    traitMilestones: { firstTitle: false, comeback02: false, rivalryFormed: false, reachedPeak: false },
  },
  'Dante "Ice Breaker" Moreau': {
    favoriteArena: 'VOLCANIC_RAGE',
    traits: [{ id: 'ARMADURA_VIVA', tier: 'COM' }, { id: 'CRONOMETRO', tier: 'NEG' }],
      traitDNA: 30,
    negTypes: { CRONOMETRO: 'CICATRIZ' },
    shadowProgress: {},
    traitMilestones: { firstTitle: false, comeback02: false, rivalryFormed: false, reachedPeak: false },
  },
  'Miguel "Tsunami" Vargas': {
    favoriteArena: 'STORM_TRACK',
    traits: [{ id: 'BOLA_DE_NEVE', tier: 'COM' }, { id: 'REI_DOS_GRUPOS', tier: 'NEG' }],
      traitDNA: 24,
    negTypes: { REI_DOS_GRUPOS: 'CICATRIZ' },
    shadowProgress: {},
    traitMilestones: { firstTitle: false, comeback02: false, rivalryFormed: false, reachedPeak: false },
  },
  'André "Reggae" Williams': {
    favoriteArena: 'VORTEX_COLISEUM',
    traits: [{ id: 'ETERNO_GIRO', tier: 'COM' }, { id: 'REI_DA_SELVA', tier: 'NEG' }],
      traitDNA: 21,
    negTypes: { REI_DA_SELVA: 'CICATRIZ' },
    shadowProgress: {},
    traitMilestones: { firstTitle: false, comeback02: false, rivalryFormed: false, reachedPeak: false },
  },
  'Gabriel "Pampas" Silva': {
    favoriteArena: 'STORM_TRACK',
    traits: [{ id: 'MENTALIDADE_DE_SET', tier: 'COM' }, { id: 'RECUPERACAO_RAPIDA', tier: 'NEG' }],
      traitDNA: 29,
    negTypes: { RECUPERACAO_RAPIDA: 'SOMBRA' },
    shadowProgress: { wonAfterLossStreak: 0 },
    traitMilestones: { firstTitle: false, comeback02: false, rivalryFormed: false, reachedPeak: false },
  },
  'Rafael "Samba" Costa': {
    favoriteArena: 'KILLER_SIDES',
    traits: [{ id: 'BOLA_DE_NEVE', tier: 'COM' }, { id: 'PICO_DE_ADRENALINA', tier: 'NEG' }],
      traitDNA: 26,
    negTypes: { PICO_DE_ADRENALINA: 'CICATRIZ' },
    shadowProgress: {},
    traitMilestones: { firstTitle: false, comeback02: false, rivalryFormed: false, reachedPeak: false },
  },
  'Antonio "Jaguar" Rojas': {
    favoriteArena: 'COLOSSEUM_CARNAGE',
    traits: [{ id: 'DESTRUIDOR_DE_BURST', tier: 'COM' }, { id: 'ARMADURA_VIVA', tier: 'NEG' }],
      traitDNA: 18,
    negTypes: { ARMADURA_VIVA: 'CICATRIZ' },
    shadowProgress: {},
    traitMilestones: { firstTitle: false, comeback02: false, rivalryFormed: false, reachedPeak: false },
  },
  'Eduardo "Puma" Gutiérrez': {
    favoriteArena: 'KILLER_SIDES',
    traits: [{ id: 'REI_DOS_GRUPOS', tier: 'COM' }, { id: 'PISTOLEIRO', tier: 'NEG' }],
      traitDNA: 23,
    negTypes: { PISTOLEIRO: 'CICATRIZ' },
    shadowProgress: {},
    traitMilestones: { firstTitle: false, comeback02: false, rivalryFormed: false, reachedPeak: false },
  },
  'Hans "Blitz" Schmidt': {
    favoriteArena: 'COLOSSEUM_CARNAGE',
    traits: [{ id: 'DESTRUIDOR_DE_BURST', tier: 'COM' }, { id: 'MAO_FIRME', tier: 'NEG' }],
      traitDNA: 32,
    negTypes: { MAO_FIRME: 'SOMBRA' },
    shadowProgress: { strongPlusLaunches: 0 },
    traitMilestones: { firstTitle: false, comeback02: false, rivalryFormed: false, reachedPeak: false },
  },
  'Marco "Gladiator" Bianchi': {
    favoriteArena: 'VOLCANIC_RAGE',
    traits: [{ id: 'ARMADURA_VIVA', tier: 'COM' }, { id: 'DESTRUIDOR_DE_BURST', tier: 'NEG' }],
      traitDNA: 20,
    negTypes: { DESTRUIDOR_DE_BURST: 'CICATRIZ' },
    shadowProgress: {},
    traitMilestones: { firstTitle: false, comeback02: false, rivalryFormed: false, reachedPeak: false },
  },
  'Fernando "Torero" García': {
    favoriteArena: 'STORM_TRACK',
    traits: [{ id: 'BOLA_DE_NEVE', tier: 'COM' }, { id: 'AVALANCHE', tier: 'NEG' }],
      traitDNA: 17,
    negTypes: { AVALANCHE: 'CICATRIZ' },
    shadowProgress: {},
    traitMilestones: { firstTitle: false, comeback02: false, rivalryFormed: false, reachedPeak: false },
  },
  'Lars "Fjord" Hansen': {
    favoriteArena: 'VORTEX_COLISEUM',
    traits: [{ id: 'ETERNO_GIRO', tier: 'COM' }, { id: 'REI_DA_SELVA', tier: 'NEG' }],
      traitDNA: 25,
    negTypes: { REI_DA_SELVA: 'SOMBRA' },
    shadowProgress: { wonInFavoriteArena: 0 },
    traitMilestones: { firstTitle: false, comeback02: false, rivalryFormed: false, reachedPeak: false },
  },
  'Dmitri "Red Storm" Volkov': {
    favoriteArena: 'COLOSSEUM_CARNAGE',
    traits: [{ id: 'DESTRUIDOR_DE_BURST', tier: 'COM' }, { id: 'RECUPERACAO_RAPIDA', tier: 'NEG' }],
      traitDNA: 22,
    negTypes: { RECUPERACAO_RAPIDA: 'CICATRIZ' },
    shadowProgress: {},
    traitMilestones: { firstTitle: false, comeback02: false, rivalryFormed: false, reachedPeak: false },
  },
  'Krzysztof "Eagle" Nowak': {
    favoriteArena: 'KILLER_SIDES',
    traits: [{ id: 'PISTOLEIRO', tier: 'COM' }, { id: 'DESTRUIDOR_DE_BURST', tier: 'NEG' }],
      traitDNA: 30,
    negTypes: { DESTRUIDOR_DE_BURST: 'CICATRIZ' },
    shadowProgress: {},
    traitMilestones: { firstTitle: false, comeback02: false, rivalryFormed: false, reachedPeak: false },
  },
  'Ján "Tatra" Kovács': {
    favoriteArena: 'VOLCANIC_RAGE',
    traits: [{ id: 'ARMADURA_VIVA', tier: 'COM' }, { id: 'FENIX', tier: 'NEG' }],
      traitDNA: 19,
    negTypes: { FENIX: 'CICATRIZ' },
    shadowProgress: {},
    traitMilestones: { firstTitle: false, comeback02: false, rivalryFormed: false, reachedPeak: false },
  },
  'Viktor "Cossack" Petrov': {
    favoriteArena: 'STORM_TRACK',
    traits: [{ id: 'BOLA_DE_NEVE', tier: 'COM' }, { id: 'PICO_DE_ADRENALINA', tier: 'NEG' }],
      traitDNA: 28,
    negTypes: { PICO_DE_ADRENALINA: 'SOMBRA' },
    shadowProgress: { wonHotStreak: 0 },
    traitMilestones: { firstTitle: false, comeback02: false, rivalryFormed: false, reachedPeak: false },
  },
  'Andreas "Spartan" Papadopoulos': {
    favoriteArena: 'VOLCANIC_RAGE',
    traits: [{ id: 'ARMADURA_VIVA', tier: 'COM' }, { id: 'CAMALEAO', tier: 'NEG' }],
      traitDNA: 21,
    negTypes: { CAMALEAO: 'CICATRIZ' },
    shadowProgress: {},
    traitMilestones: { firstTitle: false, comeback02: false, rivalryFormed: false, reachedPeak: false },
  },
  'Li "Phoenix" Chang': {
    favoriteArena: 'STORM_TRACK',
    traits: [{ id: 'RELOGIO_BIOLOGICO', tier: 'COM' }, { id: 'INERCIAL', tier: 'NEG' }],
      traitDNA: 34,
    negTypes: { INERCIAL: 'SOMBRA' },
    shadowProgress: { wonTournamentOpener: 0 },
    traitMilestones: { firstTitle: false, comeback02: false, rivalryFormed: false, reachedPeak: false },
  },
  'Kim "Tiger Claw" Dae-Jung': {
    favoriteArena: 'COLOSSEUM_CARNAGE',
    traits: [{ id: 'DESTRUIDOR_DE_BURST', tier: 'COM' }, { id: 'ARMADURA_VIVA', tier: 'NEG' }],
      traitDNA: 23,
    negTypes: { ARMADURA_VIVA: 'CICATRIZ' },
    shadowProgress: {},
    traitMilestones: { firstTitle: false, comeback02: false, rivalryFormed: false, reachedPeak: false },
  },
  'Wang "Terracotta" Jian': {
    favoriteArena: 'VORTEX_COLISEUM',
    traits: [{ id: 'ETERNO_GIRO', tier: 'COM' }, { id: 'CAMALEAO', tier: 'NEG' }],
      traitDNA: 18,
    negTypes: { CAMALEAO: 'CICATRIZ' },
    shadowProgress: {},
    traitMilestones: { firstTitle: false, comeback02: false, rivalryFormed: false, reachedPeak: false },
  },
  'Nguyen "Dragon Fist" Minh': {
    favoriteArena: 'KILLER_SIDES',
    traits: [{ id: 'REI_DOS_GRUPOS', tier: 'COM' }, { id: 'ULTRAMARATONISTA', tier: 'NEG' }],
      traitDNA: 26,
    negTypes: { ULTRAMARATONISTA: 'CICATRIZ' },
    shadowProgress: {},
    traitMilestones: { firstTitle: false, comeback02: false, rivalryFormed: false, reachedPeak: false },
  },
  'Rizal "Typhoon" Santos': {
    favoriteArena: 'STORM_TRACK',
    traits: [{ id: 'BOLA_DE_NEVE', tier: 'COM' }, { id: 'RECUPERACAO_RAPIDA', tier: 'NEG' }],
      traitDNA: 29,
    negTypes: { RECUPERACAO_RAPIDA: 'CICATRIZ' },
    shadowProgress: {},
    traitMilestones: { firstTitle: false, comeback02: false, rivalryFormed: false, reachedPeak: false },
  },
  'Kwame "Black Panther" Mensah': {
    favoriteArena: 'COLOSSEUM_CARNAGE',
    traits: [{ id: 'DESTRUIDOR_DE_BURST', tier: 'COM' }, { id: 'CAMALEAO', tier: 'NEG' }],
      traitDNA: 20,
    negTypes: { CAMALEAO: 'CICATRIZ' },
    shadowProgress: {},
    traitMilestones: { firstTitle: false, comeback02: false, rivalryFormed: false, reachedPeak: false },
  },
  'Amara "Nile Storm" Okafor': {
    favoriteArena: 'STORM_TRACK',
    traits: [{ id: 'BOLA_DE_NEVE', tier: 'COM' }, { id: 'REI_DOS_GRUPOS', tier: 'NEG' }],
      traitDNA: 24,
    negTypes: { REI_DOS_GRUPOS: 'CICATRIZ' },
    shadowProgress: {},
    traitMilestones: { firstTitle: false, comeback02: false, rivalryFormed: false, reachedPeak: false },
  },
  'Jabari "Serengeti" Kimathi': {
    favoriteArena: 'VORTEX_COLISEUM',
    traits: [{ id: 'ETERNO_GIRO', tier: 'COM' }, { id: 'CAMALEAO', tier: 'NEG' }],
      traitDNA: 22,
    negTypes: { CAMALEAO: 'CICATRIZ' },
    shadowProgress: {},
    traitMilestones: { firstTitle: false, comeback02: false, rivalryFormed: false, reachedPeak: false },
  },
  'Zuberi "Atlas Lion" Idrissi': {
    favoriteArena: 'PANGEA_PLATFORM',
    traits: [{ id: 'LEAO_ENCURRALADO', tier: 'COM' }, { id: 'RECUPERACAO_RAPIDA', tier: 'NEG' }],
      traitDNA: 35,
    negTypes: { RECUPERACAO_RAPIDA: 'SOMBRA' },
    shadowProgress: { wonAfterLossStreak: 0 },
    traitMilestones: { firstTitle: false, comeback02: false, rivalryFormed: false, reachedPeak: false },
  },
  'Tane "Haka Warrior" Parata': {
    favoriteArena: 'COLOSSEUM_CARNAGE',
    traits: [{ id: 'DESTRUIDOR_DE_BURST', tier: 'COM' }, { id: 'MAO_FIRME', tier: 'NEG' }],
      traitDNA: 27,
    negTypes: { MAO_FIRME: 'CICATRIZ' },
    shadowProgress: {},
    traitMilestones: { firstTitle: false, comeback02: false, rivalryFormed: false, reachedPeak: false },
  },
  'Mateo "Island Thunder" Rabuka': {
    favoriteArena: 'COLOSSEUM_CARNAGE',
    traits: [{ id: 'DESTRUIDOR_DE_BURST', tier: 'COM' }, { id: 'ARMADURA_VIVA', tier: 'NEG' }],
      traitDNA: 21,
    negTypes: { ARMADURA_VIVA: 'CICATRIZ' },
    shadowProgress: {},
    traitMilestones: { firstTitle: false, comeback02: false, rivalryFormed: false, reachedPeak: false },
  },
};

// ── HELPERS PRINCIPAIS ────────────────────────────────────────

/** Retorna dados de traits de um jogador (com array de objetos {id, tier}) */
export function getPlayerTraitData(playerName) {
  return PLAYER_TRAITS[playerName] || { favoriteArena: 'BB10_COMPETITIVE', traits: [] };
}

/**
 * Garante que um objeto de dados de player tem todos os campos
 * do sistema traitDNA. Usado como migração para jogadores sem os campos.
 * Chama `inferTraitDNA` do TraitDNASystem para calcular o DNA se ausente.
 */
export function ensureTraitDNAFields(playerData, potentialCategory = 'COMUM') {
  if (playerData.traitDNA !== undefined) return playerData;

  // Import lazy para evitar dependência circular
  try {
    const { inferTraitDNA, initializeShadowProgress, classifyNegativeDeterministic }
      = require('./TraitDNASystem.js');

    const traits = playerData.traits || [];
    const dna    = inferTraitDNA(traits, potentialCategory);
    
    const negTypes = {};
    const negTraits = traits.filter(t => t.tier === 'NEG');
    for (const t of negTraits) {
      negTypes[t.id] = classifyNegativeDeterministic(playerData.name || '?', t.id, potentialCategory);
    }

    playerData.traitDNA       = dna;
    playerData.negTypes       = negTypes;
    playerData.shadowProgress = initializeShadowProgress(traits, negTypes);
    playerData.traitMilestones = playerData.traitMilestones || {
      firstTitle: false, comeback02: false, rivalryFormed: false, reachedPeak: false,
    };
  } catch(e) {
    // Fallback silencioso — campo fica ausente até próxima chamada
  }
  return playerData;
}

/** Retorna o traitDNA de um jogador pelo nome (0 se não encontrado) */
export function getPlayerTraitDNA(playerName) {
  return PLAYER_TRAITS[playerName]?.traitDNA ?? 0;
}

/** Retorna o tipo (CICATRIZ | SOMBRA) de uma trait NEG de um jogador */
export function getNegType(playerName, traitId) {
  return PLAYER_TRAITS[playerName]?.negTypes?.[traitId] ?? 'CICATRIZ';
}

/** Retorna o progresso de sombra de um jogador */
export function getShadowProgress(playerName) {
  return PLAYER_TRAITS[playerName]?.shadowProgress ?? {};
}


/** Retorna traits separadas por tipo para exibição */
export function getPlayerTraitsSplit(playerName) {
  const data = getPlayerTraitData(playerName);
  return { ...getPlayerTraitsSplitV2(data.traits), favoriteArena: data.favoriteArena };
}

/** Traits disponíveis para newgens */
export const NEWGEN_TRAITS_POOL = {
  COM: [
    'SANGUE_FRIO', 'FECHADOR', 'BOLA_DE_NEVE', 'BASE_SOLIDA',
    'DESTRUIDOR_DE_BURST', 'ARMADURA_VIVA', 'ETERNO_GIRO',
    'REI_DOS_GRUPOS', 'ULTRAMARATONISTA', 'RELOGIO_BIOLOGICO',
    'MAO_FIRME', 'MAQUINA', 'VIRADISTA', 'FENIX', 'AVALANCHE',
  ],
  NEG: [
    'ARMADURA_VIVA', 'DESTRUIDOR_DE_BURST', 'ULTRAMARATONISTA',
    'PICO_DE_ADRENALINA', 'RECUPERACAO_RAPIDA', 'CRONOMETRO',
    'PISTOLEIRO', 'CAMALEAO', 'REI_DOS_GRUPOS', 'FENIX',
  ],
};
