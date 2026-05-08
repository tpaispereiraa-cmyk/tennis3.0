/**
 * TraitSystem.js
 * ─────────────────────────────────────────────────────────────────
 * Sistema completo de DNA Traits para o circuito de tênis.
 *
 * CONCEITOS CENTRAIS
 * ─────────────────────────────────────────────────────────────────
 *  DNA Score     — número 0–100 derivado do potential do jogador.
 *                  Define quantos slots e de que tiers o jogador possui.
 *
 *  Slots / Tiers — cada slot carrega um trait de tier NEG/COM/RAR/LEN.
 *                  Mais DNA = menos NEG obrigatórias + mais RAR/LEN disponíveis.
 *
 *  Sombra        — versão negativa de um trait pode ser "curada" via
 *                  desafio específico, transformando-se na versão COM.
 *
 *  Milestone     — marcos de carreira desbloqueiam novos slots de trait.
 *
 *  Mutex         — pares de traits que não podem coexistir no mesmo jogador.
 *
 * TABELA DNA (do documento de design)
 * ─────────────────────────────────────────────────────────────────
 *  0–39   FRACO        — 1-2 NEG obrigatórias, max 4 traits total
 *  40–59  NORMAL       — pool COM, 2 COM, max 3 traits
 *  60–74  BOM          — pool COM+RAR, 2 COM + 1 RAR, max 3 traits
 *  75–89  ALTO         — pool COM+RAR, 3 COM + 2 RAR, max 2 NEG
 *  90–99  EXCEPCIONAL  — pool COM+RAR+LEN, 3 COM + 2 RAR + 1 LEN, 1 NEG obrig.
 *  100    GERACIONAL   — pool ×1.15, 4 COM + 2 RAR + 2 LEN, 1 NEG obrig.
 *
 * EXPORTS PRINCIPAIS
 * ─────────────────────────────────────────────────────────────────
 *   initPlayerDNA(player)
 *   assignTraits(player, rng?)
 *   getTraitEffects(player, ctx) → TraitEffects
 *   checkMilestone(player, milestoneId, careerStats?)
 *   progressSombra(player, achievementId, delta)
 *   getPlayerTraits(player) → TraitSlot[]
 *   describePlayerTraits(player) → string
 */

// ═══════════════════════════════════════════════════════════════════
// MAPEAMENTO POTENTIAL → DNA SCORE
// ═══════════════════════════════════════════════════════════════════

const POTENTIAL_TO_DNA = {
  GERACIONAL:      [90, 100],
  LENDA:           [78, 89],
  ELITE:           [65, 77],
  CAMPEAO:         [50, 64],
  COMUM:           [30, 49],
  ABAIXO_DA_MEDIA: [0, 29],
};

/** Converte potential string em DNA score numérico */
export function dnaScoreFromPotential(potential, rng = Math.random) {
  const range = POTENTIAL_TO_DNA[potential] ?? [20, 45];
  return range[0] + Math.floor(rng() * (range[1] - range[0] + 1));
}

// ═══════════════════════════════════════════════════════════════════
// TABELA DE SLOTS POR DNA SCORE
// ═══════════════════════════════════════════════════════════════════

function getDnaConfig(score) {
  if (score >= 100) return { tier: 'GERACIONAL', negMin: 1, negMax: 1, slots: { COM: 4, RAR: 2, LEN: 2 }, maxTotal: 9, poolBonus: 1.15 };
  if (score >= 90)  return { tier: 'EXCEPCIONAL', negMin: 1, negMax: 2, slots: { COM: 3, RAR: 2, LEN: 1 }, maxTotal: 8, poolBonus: 1.0 };
  if (score >= 75)  return { tier: 'ALTO',        negMin: 0, negMax: 2, slots: { COM: 3, RAR: 2, LEN: 0 }, maxTotal: 7, poolBonus: 1.0 };
  if (score >= 60)  return { tier: 'BOM',         negMin: 0, negMax: 2, slots: { COM: 2, RAR: 1, LEN: 0 }, maxTotal: 5, poolBonus: 1.0 };
  if (score >= 40)  return { tier: 'NORMAL',      negMin: 0, negMax: 2, slots: { COM: 2, RAR: 0, LEN: 0 }, maxTotal: 4, poolBonus: 1.0 };
  return              { tier: 'FRACO',         negMin: 1, negMax: 2, slots: { COM: 1, RAR: 0, LEN: 0 }, maxTotal: 4, poolBonus: 1.0 };
}

// ═══════════════════════════════════════════════════════════════════
// MUTEX RULES
// ═══════════════════════════════════════════════════════════════════

/** Par de traits incompatíveis — não podem coexistir no mesmo jogador */
const MUTEX_PAIRS = [
  ['TIEBREAK_KILLER', 'CAMPEAO_TB'],
  ['CANHAO_SAQUE', 'DF_ZERO'],
  ['REI_SAIBRO', 'MAGO_GRAMA'],
  ['ESPECIALISTA_BO5', 'ESPECIALISTA_KO'],
  ['SANGUE_QUENTE', 'MAQUINA'],
  ['BOLA_DE_NEVE', 'INERCIAL'],
  ['SUPERPRODIGIO', 'LATE_BLOOMER'],
  ['VOLATILIDADE_CALC', 'BASE_SOLIDA'],
];

function buildMutexMap() {
  const map = {};
  for (const [a, b] of MUTEX_PAIRS) {
    map[a] = map[a] ?? [];
    map[b] = map[b] ?? [];
    map[a].push(b);
    map[b].push(a);
  }
  return map;
}
const MUTEX_MAP = buildMutexMap();

// ═══════════════════════════════════════════════════════════════════
// CATALOGO COMPLETO DE TRAITS — 61 traits × 4 tiers cada
// ═══════════════════════════════════════════════════════════════════
//
// Estrutura de cada trait:
//   id        — chave única (snake_upper)
//   name      — nome de exibição
//   section   — categoria temática
//   tiers: {
//     NEG: { name, desc, effects: {...} }
//     COM: { name, desc, effects: {...} }
//     RAR: { name, desc, effects: {...} }
//     LEN: { name, desc, effects: {...} }
//   }
//   sombra?   — { challenge, target } — condição para curar o NEG
//
// effects — modificadores aplicados no contexto relevante:
//   strengthBonus     — pontos brutos adicionados/subtraídos ao score de força
//   clutchMult        — multiplicador de clutch (1.0 = neutro)
//   errorMult         — multiplicador de erro (1.0 = neutro; >1 = mais erros)
//   staminaMult       — multiplicador de stamina (1.0 = neutro)
//   serveMult         — multiplicador no saque
//   formFloor         — forma mínima garantida ('BOA_FORMA', 'GRANDE_FORMA', etc.)
//   opponentDebuff    — debuff aplicado ao adversário (0 = nenhum; 0.1 = -10%)

export const TRAIT_CATALOG = {

  // ────────────────────────────────────────────────────────────────
  // SEÇÃO 1: CLUTCH & MENTALIDADE
  // ────────────────────────────────────────────────────────────────

  TIEBREAK_KILLER: {
    id: 'TIEBREAK_KILLER',
    name: 'Tiebreak Killer',
    section: 'clutch',
    mutex: ['CAMPEAO_TB'],
    tiers: {
      NEG: {
        name: 'Terror do Tiebreak',
        desc: '-20% em pontos decisivos no tiebreak. Serve hesitante, erros desnecessários.',
        effects: { clutchMult: 0.80, errorMult: 1.20, context: ['tiebreak'] },
      },
      COM: {
        name: 'Tiebreak Killer',
        desc: '+15% clutch e precisão nos pontos de tiebreak.',
        effects: { clutchMult: 1.15, strengthBonus: 1.5, context: ['tiebreak'] },
      },
      RAR: {
        name: 'Tiebreak Killer',
        desc: '+25% clutch + forma mínima BOA_FORMA garantida em tiebreaks.',
        effects: { clutchMult: 1.25, strengthBonus: 2.5, formFloor: 'BOA_FORMA', context: ['tiebreak'] },
      },
      LEN: {
        name: 'Tiebreak Killer',
        desc: '+35% em todos durante tiebreak. Forma nunca abaixo de GRANDE_FORMA. Imune a doubles em tiebreak.',
        effects: { clutchMult: 1.35, strengthBonus: 3.5, formFloor: 'GRANDE_FORMA', context: ['tiebreak'] },
      },
    },
    sombra: { challenge: 'Ganhar 10 tiebreaks na carreira', target: 10, metric: 'tiebreaksWon' },
  },

  MP_SAVER: {
    id: 'MP_SAVER',
    name: 'Match Point Saver',
    section: 'clutch',
    tiers: {
      NEG: {
        name: 'Paralisia Total',
        desc: '-25% em todos ao enfrentar match point. Aumenta chance de double fault.',
        effects: { clutchMult: 0.75, errorMult: 1.30, serveMult: 0.85, context: ['matchPoint'] },
      },
      COM: {
        name: 'Match Point Saver',
        desc: '+15% em todos quando enfrenta match point. Erros forçados reduzidos.',
        effects: { clutchMult: 1.15, errorMult: 0.90, context: ['matchPoint'] },
      },
      RAR: {
        name: 'Match Point Saver',
        desc: '+25% em todos + primeiro saque mais preciso em situação de match point.',
        effects: { clutchMult: 1.25, errorMult: 0.85, serveMult: 1.15, context: ['matchPoint'] },
      },
      LEN: {
        name: 'Match Point Saver',
        desc: '+35% em todos. Double fault impossível em match point. Adversário sofre -10%.',
        effects: { clutchMult: 1.35, errorMult: 0.80, serveMult: 1.20, opponentDebuff: 0.10, context: ['matchPoint'] },
      },
    },
    sombra: { challenge: 'Salvar 5 match points ao longo da carreira', target: 5, metric: 'matchPointsSaved' },
  },

  QUINTO_SET: {
    id: 'QUINTO_SET',
    name: 'Sangue Frio no 5º Set',
    section: 'clutch',
    tiers: {
      NEG: {
        name: 'Colapso no Final',
        desc: '-20% stamina e clutch no 5º set (BO5) ou set decisivo.',
        effects: { clutchMult: 0.80, staminaMult: 0.80, context: ['fifthSet'] },
      },
      COM: {
        name: 'Sangue Frio',
        desc: '+20% em todos no 5º set. Erros não forçados reduzidos.',
        effects: { clutchMult: 1.20, strengthBonus: 2.0, context: ['fifthSet'] },
      },
      RAR: {
        name: 'Sangue Frio',
        desc: '+30% em todos no set decisivo + stamina tratada como 100% nesse set.',
        effects: { clutchMult: 1.30, strengthBonus: 3.0, staminaMult: 1.30, context: ['fifthSet'] },
      },
      LEN: {
        name: 'Imortal no Decisivo',
        desc: '+40% em todos + stamina virtualmente não cai + forma sempre IMPARÁVEL no 5º set.',
        effects: { clutchMult: 1.40, strengthBonus: 4.0, staminaMult: 3.50, formFloor: 'IMPARAVEL', context: ['fifthSet'] },
      },
    },
    sombra: { challenge: 'Ganhar 3 partidas que chegaram ao 5º set', target: 3, metric: 'fifthSetWins' },
  },

  DECISIVO: {
    id: 'DECISIVO',
    name: 'Decisivo',
    section: 'clutch',
    tiers: {
      NEG: {
        name: 'Choke Artist',
        desc: '-20% em pontos de game (30-40, deuce, game point) e sets decisivos.',
        effects: { clutchMult: 0.80, errorMult: 1.20, context: ['decisiveMoment'] },
      },
      COM: {
        name: 'Decisivo',
        desc: '+15% clutch em pontos de break e game points.',
        effects: { clutchMult: 1.15, context: ['decisiveMoment'] },
      },
      RAR: {
        name: 'Decisivo',
        desc: '+25% em todos em pontos decisivos + primeiro saque sobe 1 nível de qualidade.',
        effects: { clutchMult: 1.25, serveMult: 1.10, context: ['decisiveMoment'] },
      },
      LEN: {
        name: 'Decisivo',
        desc: '+35% em qualquer ponto decisivo. Hold rate em momentos cruciais quase perfeito.',
        effects: { clutchMult: 1.35, strengthBonus: 3.0, serveMult: 1.15, context: ['decisiveMoment'] },
      },
    },
    sombra: { challenge: 'Ganhar 15 break points decisivos', target: 15, metric: 'decisiveBreakPoints' },
  },

  INSTINTO_SLAM: {
    id: 'INSTINTO_SLAM',
    name: 'Instinto de Slam',
    section: 'clutch',
    tiers: {
      NEG: {
        name: 'Assombrado pelo Slam',
        desc: '-15% clutch e serve em qualquer partida de Grand Slam.',
        effects: { clutchMult: 0.85, serveMult: 0.90, context: ['grandSlam'] },
      },
      COM: {
        name: 'Instinto de Slam',
        desc: '+10% em todos em Grand Slams. Nervosismo inicial reduzido.',
        effects: { clutchMult: 1.10, strengthBonus: 1.0, context: ['grandSlam'] },
      },
      RAR: {
        name: 'Instinto de Slam',
        desc: '+20% em todos em GS + forma GRANDE_FORMA mínimo durante todo o torneio.',
        effects: { clutchMult: 1.20, strengthBonus: 2.0, formFloor: 'GRANDE_FORMA', context: ['grandSlam'] },
      },
      LEN: {
        name: 'Instinto de Slam',
        desc: '+30% em GS + forma IMPARÁVEL garantida a partir das quartas. Lendas são feitas aqui.',
        effects: { clutchMult: 1.30, strengthBonus: 3.5, formFloor: 'IMPARAVEL', context: ['grandSlam'] },
      },
    },
    sombra: { challenge: 'Vencer qualquer Grand Slam', target: 1, metric: 'grandSlamTitles' },
  },

  VIRADISTA: {
    id: 'VIRADISTA',
    name: 'Remontada 2 Sets',
    section: 'clutch',
    tiers: {
      NEG: {
        name: 'Fechado Mentalmente',
        desc: '-20% quando perdendo 2 sets a 0. Já se entregou.',
        effects: { clutchMult: 0.80, errorMult: 1.25, context: ['down2Sets'] },
      },
      COM: {
        name: 'Remontada',
        desc: '+15% quando perdendo 2 sets a 0. Recusa desistir.',
        effects: { clutchMult: 1.15, strengthBonus: 2.0, context: ['down2Sets'] },
      },
      RAR: {
        name: 'Remontada',
        desc: '+25% quando perdendo 2 a 0. Adversário começa a sentir a pressão.',
        effects: { clutchMult: 1.25, strengthBonus: 3.0, opponentDebuff: 0.05, context: ['down2Sets'] },
      },
      LEN: {
        name: 'Lenda da Remontada',
        desc: '+40% quando perdendo 2 a 0. Adversário sufoca. Forma mínima GRANDE_FORMA.',
        effects: { clutchMult: 1.40, strengthBonus: 4.5, opponentDebuff: 0.12, formFloor: 'GRANDE_FORMA', context: ['down2Sets'] },
      },
    },
    sombra: { challenge: 'Completar 3 remontadas de 2 sets a 0', target: 3, metric: 'comebacks2Sets' },
  },

  FENIX: {
    id: 'FENIX',
    name: 'Fênix',
    section: 'clutch',
    tiers: {
      NEG: {
        name: 'Espírito Partido',
        desc: 'Após set perdido por 6-0 ou 6-1, -20% no próximo set. Desmoralizado.',
        effects: { strengthBonus: -2.5, errorMult: 1.20, context: ['afterBagel'] },
      },
      COM: {
        name: 'Fênix',
        desc: 'Após set perdido por 6-0 ou 6-1, +15% no próximo set. Raiva que vira força.',
        effects: { strengthBonus: 2.0, clutchMult: 1.15, context: ['afterBagel'] },
      },
      RAR: {
        name: 'Fênix',
        desc: 'Após "bagel" ou "breadstick", +25% no set seguinte. Ressurge nas cinzas.',
        effects: { strengthBonus: 3.0, clutchMult: 1.25, context: ['afterBagel'] },
      },
      LEN: {
        name: 'Ave Fênix',
        desc: 'Após qualquer set perdido feio, +40%. O golpe duro acende algo sobrenatural.',
        effects: { strengthBonus: 4.5, clutchMult: 1.40, formFloor: 'GRANDE_FORMA', context: ['afterBagel'] },
      },
    },
  },

  LEAO_ENCURRALADO: {
    id: 'LEAO_ENCURRALADO',
    name: 'Leão Encurralado',
    section: 'clutch',
    tiers: {
      NEG: {
        name: 'Paralisia por Pressão',
        desc: 'Quando favorito absoluto, -15%. A expectativa paralisa.',
        effects: { strengthBonus: -1.5, errorMult: 1.15, context: ['heavyFavorite'] },
      },
      COM: {
        name: 'Leão Encurralado',
        desc: 'Como azarão, +10%. Liberdade de jogar sem pressão.',
        effects: { strengthBonus: 1.5, clutchMult: 1.10, context: ['underdog'] },
      },
      RAR: {
        name: 'Leão Encurralado',
        desc: 'Como azarão, +20%. Adversário relaxa, ele aproveita.',
        effects: { strengthBonus: 2.5, clutchMult: 1.20, opponentDebuff: 0.05, context: ['underdog'] },
      },
      LEN: {
        name: 'Leão Encurralado',
        desc: 'Como azarão, +35%. Imprevisível, perigoso, devastador.',
        effects: { strengthBonus: 4.0, clutchMult: 1.35, opponentDebuff: 0.10, context: ['underdog'] },
      },
    },
  },

  ATRITO_RALLY: {
    id: 'ATRITO_RALLY',
    name: 'Atrito de Rally',
    section: 'clutch',
    tiers: {
      NEG: {
        name: 'Cansativo Demais',
        desc: 'Rallies longos drenam mais: stamina -20% extra em rallies de +8 bolas.',
        effects: { staminaMult: 0.80, context: ['longRally'] },
      },
      COM: {
        name: 'Atrito de Rally',
        desc: 'Em rallies de +8 bolas, +10% em todos. Gosta do desgaste.',
        effects: { strengthBonus: 1.0, errorMult: 0.90, context: ['longRally'] },
      },
      RAR: {
        name: 'Atrito de Rally',
        desc: 'Em rallies longos, +20%. Stamina protegida. Adversário desgasta mais.',
        effects: { strengthBonus: 2.0, staminaMult: 1.10, opponentDebuff: 0.05, context: ['longRally'] },
      },
      LEN: {
        name: 'Máquina de Atrito',
        desc: 'Rallies longos viram sua arma. +30%, stamina intacta, adversário quebra mais rápido.',
        effects: { strengthBonus: 3.5, staminaMult: 1.20, opponentDebuff: 0.12, context: ['longRally'] },
      },
    },
  },

  GUERREIRO: {
    id: 'GUERREIRO',
    name: 'Guerreiro',
    section: 'clutch',
    tiers: {
      NEG: {
        name: 'Lutador Ingênuo',
        desc: 'Esforço excessivo drena mais stamina: -15% de eficiência por tentar demais.',
        effects: { staminaMult: 0.85, context: ['always'] },
      },
      COM: {
        name: 'Guerreiro',
        desc: '+8% em todos os momentos. Nunca desiste, nunca diminui o ritmo.',
        effects: { strengthBonus: 1.0, errorMult: 0.95, context: ['always'] },
      },
      RAR: {
        name: 'Guerreiro',
        desc: '+15% em todos + erros não forçados reduzidos. Intensidade sem desperdício.',
        effects: { strengthBonus: 2.0, errorMult: 0.88, context: ['always'] },
      },
      LEN: {
        name: 'Guerreiro Eterno',
        desc: '+22% em todos. Stamina protegida. Qualquer ponto pode ser o decisivo.',
        effects: { strengthBonus: 3.0, errorMult: 0.82, staminaMult: 1.15, context: ['always'] },
      },
    },
  },

  AVALANCHE: {
    id: 'AVALANCHE',
    name: 'Avalanche de Games',
    section: 'clutch',
    tiers: {
      NEG: {
        name: 'Fragil com Vantagem',
        desc: 'Quando lidera por 3+ games no set, -15%. Fica passivo, deixa adversário voltar.',
        effects: { strengthBonus: -1.5, errorMult: 1.20, context: ['bigLead'] },
      },
      COM: {
        name: 'Avalanche',
        desc: 'Quando lidera por 3+ games no set, +12%. Fecha sem dar respiro.',
        effects: { strengthBonus: 1.5, clutchMult: 1.12, context: ['bigLead'] },
      },
      RAR: {
        name: 'Avalanche',
        desc: 'Com vantagem de 3+ games, +22%. Adversário sufoca sem conseguir reagir.',
        effects: { strengthBonus: 2.5, clutchMult: 1.22, opponentDebuff: 0.05, context: ['bigLead'] },
      },
      LEN: {
        name: 'Avalanche Implacável',
        desc: 'Com 3+ games de vantagem, +35%. Fecha conjuntos sem parar.',
        effects: { strengthBonus: 4.0, clutchMult: 1.35, opponentDebuff: 0.10, context: ['bigLead'] },
      },
    },
  },

  // ────────────────────────────────────────────────────────────────
  // SEÇÃO 2: SAQUE
  // ────────────────────────────────────────────────────────────────

  IMPLACAVEL_SERV: {
    id: 'IMPLACAVEL_SERV',
    name: 'Implacável no Serviço',
    section: 'serve',
    tiers: {
      NEG: {
        name: 'Saque Frágil',
        desc: '-15% em saque quando sob pressão. Erros no segundo saque sobem.',
        effects: { serveMult: 0.85, errorMult: 1.15, context: ['pressure'] },
      },
      COM: {
        name: 'Implacável',
        desc: '+12% em precisão e velocidade de saque em pontos de break.',
        effects: { serveMult: 1.12, context: ['breakPoint'] },
      },
      RAR: {
        name: 'Implacável',
        desc: '+20% no saque em break points. Double fault praticamente impossível.',
        effects: { serveMult: 1.20, errorMult: 0.90, context: ['breakPoint'] },
      },
      LEN: {
        name: 'Saque Imparável',
        desc: '+30% no saque em qualquer momento decisivo. Hold rate excepcional.',
        effects: { serveMult: 1.30, strengthBonus: 2.5, errorMult: 0.85, context: ['decisiveMoment'] },
      },
    },
  },

  REI_QUADRA: {
    id: 'REI_QUADRA',
    name: 'Rei da Quadra',
    section: 'serve',
    tiers: {
      NEG: {
        name: 'Nervoso em Casa',
        desc: '-10% geral quando jogando como cabeça de chave #1 ou #2 em torneio.',
        effects: { strengthBonus: -1.0, clutchMult: 0.92, context: ['topSeed'] },
      },
      COM: {
        name: 'Rei da Quadra',
        desc: '+10% quando joga como favorito em seu forte. Domínio total.',
        effects: { strengthBonus: 1.5, context: ['topSeed'] },
      },
      RAR: {
        name: 'Rei da Quadra',
        desc: '+18% como cabeça de chave 1/2. Adversários já chegam intimidados.',
        effects: { strengthBonus: 2.5, opponentDebuff: 0.06, context: ['topSeed'] },
      },
      LEN: {
        name: 'Imperador',
        desc: '+28% como cabeça 1/2. A quadra é dele. Adversários capitulam.',
        effects: { strengthBonus: 4.0, opponentDebuff: 0.12, context: ['topSeed'] },
      },
    },
  },

  SANGUE_QUENTE: {
    id: 'SANGUE_QUENTE',
    name: 'Sangue Quente',
    section: 'serve',
    mutex: ['MAQUINA'],
    tiers: {
      NEG: {
        name: 'Explosivo Incontrolável',
        desc: 'Em pontos de raiva/contestação, -15% e erros sobem. Emocional demais.',
        effects: { strengthBonus: -1.5, errorMult: 1.25, context: ['hotMoment'] },
      },
      COM: {
        name: 'Sangue Quente',
        desc: 'Raiva canalizada: após perder um ponto polêmico, +12% no próximo game.',
        effects: { strengthBonus: 1.5, clutchMult: 1.12, context: ['afterControversy'] },
      },
      RAR: {
        name: 'Fogo no Sangue',
        desc: '+20% após qualquer ponto perdido de forma frustrante. A raiva é combustível.',
        effects: { strengthBonus: 2.5, clutchMult: 1.20, context: ['afterFrustration'] },
      },
      LEN: {
        name: 'Inferno Vivo',
        desc: '+32% quando raivoso. A quadra queima, o adversário sente.',
        effects: { strengthBonus: 4.0, clutchMult: 1.32, opponentDebuff: 0.08, context: ['afterFrustration'] },
      },
    },
  },

  DESTRUIDOR_MORAL: {
    id: 'DESTRUIDOR_MORAL',
    name: 'Destruidor de Moral',
    section: 'serve',
    tiers: {
      NEG: {
        name: 'Vulnerável',
        desc: '-10% geral. Adversário motivado pelo seu jeito de jogar.',
        effects: { strengthBonus: -1.0, opponentDebuff: -0.05, context: ['always'] },
      },
      COM: {
        name: 'Destruidor',
        desc: 'Após break ou vantagem clara, adversário perde 5% de force por 1 game.',
        effects: { opponentDebuff: 0.05, context: ['afterBreak'] },
      },
      RAR: {
        name: 'Destruidor',
        desc: 'Após qualquer vitória de game convincente, adversário fica -10%.',
        effects: { opponentDebuff: 0.10, context: ['afterDominantGame'] },
      },
      LEN: {
        name: 'Demolidor de Almas',
        desc: 'Presença constante debuffa adversário em -12% durante toda a partida.',
        effects: { opponentDebuff: 0.12, context: ['always'] },
      },
    },
  },

  CANHAO_SAQUE: {
    id: 'CANHAO_SAQUE',
    name: 'Canhão de Saque',
    section: 'serve',
    mutex: ['DF_ZERO'],
    tiers: {
      NEG: {
        name: 'Saque Indisciplinado',
        desc: 'Alta velocidade, alta double fault. Erros no 2º saque frequentes.',
        effects: { serveMult: 1.10, errorMult: 1.35, context: ['serve'] },
      },
      COM: {
        name: 'Canhão',
        desc: '+15% velocidade e penetração de saque. Aces frequentes.',
        effects: { serveMult: 1.15, strengthBonus: 1.5, context: ['serve'] },
      },
      RAR: {
        name: 'Canhão',
        desc: '+25% no saque. Retornadores do mundo têm dificuldade de estabelecer ritmo.',
        effects: { serveMult: 1.25, strengthBonus: 2.5, opponentDebuff: 0.05, context: ['serve'] },
      },
      LEN: {
        name: 'Míssil',
        desc: '+35% no saque. Aces em série. Adversário entra em set abalado.',
        effects: { serveMult: 1.35, strengthBonus: 3.5, opponentDebuff: 0.08, context: ['serve'] },
      },
    },
  },

  PRECISAO_CIRURGICA: {
    id: 'PRECISAO_CIRURGICA',
    name: 'Precisão Cirúrgica',
    section: 'serve',
    tiers: {
      NEG: {
        name: 'Falta de Potência',
        desc: 'Precisão sem força: serve entra mas não penetra. Retornadores adoram.',
        effects: { serveMult: 0.88, opponentDebuff: -0.05, context: ['serve'] },
      },
      COM: {
        name: 'Preciso',
        desc: '+12% precisão no saque. Menos duplas faltas, mais pressionamento de linhas.',
        effects: { serveMult: 1.12, errorMult: 0.85, context: ['serve'] },
      },
      RAR: {
        name: 'Cirúrgico',
        desc: '+20% precisão. Dupla falta quase impossível. Exploração perfeita dos ângulos.',
        effects: { serveMult: 1.20, errorMult: 0.78, context: ['serve'] },
      },
      LEN: {
        name: 'Laser',
        desc: '+30% precisão. Cada saque tem destino. Dupla falta literalmente impossível.',
        effects: { serveMult: 1.30, errorMult: 0.70, context: ['serve'] },
      },
    },
  },

  SEGUNDO_SAQUE_ARMA: {
    id: 'SEGUNDO_SAQUE_ARMA',
    name: 'Segundo Serviço Arma',
    section: 'serve',
    tiers: {
      NEG: {
        name: 'Segundo Saque Fraco',
        desc: '2º saque muito defensivo. Adversários atacam fácil e ganham pontos.',
        effects: { serveMult: 0.80, opponentDebuff: -0.08, context: ['secondServe'] },
      },
      COM: {
        name: '2º Saque Sólido',
        desc: '2º saque com +12% de penetração. Não facilita, não perde pontos de graça.',
        effects: { serveMult: 1.12, context: ['secondServe'] },
      },
      RAR: {
        name: '2º Saque Arma',
        desc: '2º saque tão bom quanto 1º de muitos. +20% + adversário não consegue atacar.',
        effects: { serveMult: 1.20, opponentDebuff: 0.08, context: ['secondServe'] },
      },
      LEN: {
        name: '2º Saque Letal',
        desc: '2º saque é armadilha. +30% penetração. Adversários perdem pontos no retorno.',
        effects: { serveMult: 1.30, opponentDebuff: 0.14, context: ['secondServe'] },
      },
    },
  },

  KICK_MASTER: {
    id: 'KICK_MASTER',
    name: 'Kick Master',
    section: 'serve',
    tiers: {
      NEG: {
        name: 'Kick Inconsistente',
        desc: '2º saque com kick imprevisível — sobe fora da zona e facilita o retorno. Adversário ataca fácil.',
        effects: { serveMult: 0.82, opponentDebuff: -0.06, context: ['secondServe'] },
      },
      COM: {
        name: 'Kick',
        desc: '+10% no 2º saque com kick. Sobe alto, adversário tem dificuldade.',
        effects: { serveMult: 1.10, context: ['secondServe'] },
      },
      RAR: {
        name: 'Kick Intenso',
        desc: '+20% kick. Rebote alto fora da zona de conforto. Retorno virado.',
        effects: { serveMult: 1.20, opponentDebuff: 0.06, context: ['secondServe'] },
      },
      LEN: {
        name: 'Kick Explosivo',
        desc: '+30% kick. O rebote impossível. Rival praticamente perde o ponto no retorno.',
        effects: { serveMult: 1.30, opponentDebuff: 0.12, context: ['secondServe'] },
      },
    },
  },

  DF_ZERO: {
    id: 'DF_ZERO',
    name: 'Dupla Falta Zero',
    section: 'serve',
    mutex: ['CANHAO_SAQUE'],
    tiers: {
      NEG: {
        name: 'DF Frequente',
        desc: 'Duplas faltas nos piores momentos. Erros de saque aumentam sob pressão.',
        effects: { errorMult: 1.30, serveMult: 0.90, context: ['pressure'] },
      },
      COM: {
        name: 'Sem Duplas',
        desc: 'Dupla falta reduzida em 40%. Segundo saque confiável.',
        effects: { errorMult: 0.70, context: ['serve'] },
      },
      RAR: {
        name: 'DF Zero',
        desc: 'Dupla falta raridade absoluta. Confiança no 2º saque impactante.',
        effects: { errorMult: 0.50, serveMult: 1.10, context: ['serve'] },
      },
      LEN: {
        name: 'Perfeição no Saque',
        desc: 'Double fault impossível. Cada saque, independente do placar, cai bem.',
        effects: { errorMult: 0.10, serveMult: 1.20, context: ['serve'] },
      },
    },
  },

  // ────────────────────────────────────────────────────────────────
  // SEÇÃO 3: GOLPES DE FUNDO
  // ────────────────────────────────────────────────────────────────

  FH_ASSASSINO: {
    id: 'FH_ASSASSINO',
    name: 'Forehand Assassino',
    section: 'strokes',
    tiers: {
      NEG: {
        name: 'FH Inconsistente',
        desc: 'FH pode decidir partidas de forma errada. Erros gratuitos aumentam 20%.',
        effects: { errorMult: 1.20, context: ['forehand'] },
      },
      COM: {
        name: 'FH Assassino',
        desc: '+15% potência e ângulo no forehand. Winner production sobe.',
        effects: { strengthBonus: 1.5, context: ['forehand'] },
      },
      RAR: {
        name: 'FH Assassino',
        desc: '+25% no forehand. A partir do 5º rally, a ameaça fica permanente.',
        effects: { strengthBonus: 2.5, opponentDebuff: 0.05, context: ['forehand'] },
      },
      LEN: {
        name: 'FH Devastador',
        desc: '+35% forehand. Arma mais temida do circuito. Adversários fogem dele.',
        effects: { strengthBonus: 4.0, opponentDebuff: 0.10, context: ['forehand'] },
      },
    },
  },

  BH_FERRO: {
    id: 'BH_FERRO',
    name: 'Backhand de Ferro',
    section: 'strokes',
    tiers: {
      NEG: {
        name: 'BH Buraco',
        desc: 'Backhand é ponto fraco explorado. Adversários constroem jogadas por ali.',
        effects: { strengthBonus: -1.5, opponentDebuff: -0.08, context: ['backhand'] },
      },
      COM: {
        name: 'BH Sólido',
        desc: '+12% no backhand. Ninguém explora mais esse lado.',
        effects: { strengthBonus: 1.2, errorMult: 0.90, context: ['backhand'] },
      },
      RAR: {
        name: 'BH de Ferro',
        desc: '+22% no BH. Defesa e ataque do mesmo lado. Adversários mudam plano de jogo.',
        effects: { strengthBonus: 2.5, errorMult: 0.82, opponentDebuff: 0.05, context: ['backhand'] },
      },
      LEN: {
        name: 'BH Lendário',
        desc: '+32% BH. Um dos melhores do circuito. Ponto de partida para winners.',
        effects: { strengthBonus: 3.8, errorMult: 0.75, opponentDebuff: 0.10, context: ['backhand'] },
      },
    },
  },

  RETRIEVER_ETERNO: {
    id: 'RETRIEVER_ETERNO',
    name: 'Retriever Eterno',
    section: 'strokes',
    tiers: {
      NEG: {
        name: 'Defensivo Demais',
        desc: 'Corre tudo mas nunca atacar. Adversários ficam confortáveis.',
        effects: { strengthBonus: -1.0, context: ['defense'] },
      },
      COM: {
        name: 'Retriever',
        desc: '+12% em defesa e cobertura. Devuelve bolas que outros errariam.',
        effects: { strengthBonus: 1.2, errorMult: 0.88, context: ['defense'] },
      },
      RAR: {
        name: 'Retriever Eterno',
        desc: '+22% em defesa. Stamina protegida. Adversários se desgastam tentando errar.',
        effects: { strengthBonus: 2.5, staminaMult: 1.10, opponentDebuff: 0.05, context: ['defense'] },
      },
      LEN: {
        name: 'Parede Viva',
        desc: '+32% em defesa. Stamina máxima. Adversários se entregam antes da quadra.',
        effects: { strengthBonus: 4.0, staminaMult: 1.25, opponentDebuff: 0.12, context: ['defense'] },
      },
    },
  },

  CONTRA_ATAQUE: {
    id: 'CONTRA_ATAQUE',
    name: 'Contra-ataque',
    section: 'strokes',
    tiers: {
      NEG: {
        name: 'Passivo Demais',
        desc: 'Tenta contra-atacar mas timing errado. Mais erros, menos winners.',
        effects: { errorMult: 1.20, strengthBonus: -0.5, context: ['counterAttack'] },
      },
      COM: {
        name: 'Contra-ataque',
        desc: '+15% quando responde a um winner do adversário. Timing perfeito.',
        effects: { strengthBonus: 1.5, clutchMult: 1.10, context: ['counterAttack'] },
      },
      RAR: {
        name: 'Contragolpe',
        desc: '+25% em contra-ataques. Adversários ficam relutantes em arriscar.',
        effects: { strengthBonus: 2.5, opponentDebuff: 0.06, context: ['counterAttack'] },
      },
      LEN: {
        name: 'Espelho da Morte',
        desc: '+35% em contra-ataque. Quanto mais o adversário arrisca, pior fica para ele.',
        effects: { strengthBonus: 4.0, opponentDebuff: 0.12, context: ['counterAttack'] },
      },
    },
  },

  BOLA_PESADA: {
    id: 'BOLA_PESADA',
    name: 'Bola Pesada',
    section: 'strokes',
    tiers: {
      NEG: {
        name: 'Bola Leve',
        desc: 'Golpes sem profundidade. Adversários recebem confortavelmente e atacam.',
        effects: { strengthBonus: -1.5, opponentDebuff: -0.06, context: ['rally'] },
      },
      COM: {
        name: 'Bola Pesada',
        desc: '+12% em impacto e profundidade. Adversários recuam nos rallies.',
        effects: { strengthBonus: 1.5, context: ['rally'] },
      },
      RAR: {
        name: 'Bola Esmagadora',
        desc: '+22% em peso de bola. Adversários erram mais devolvendo.',
        effects: { strengthBonus: 2.5, opponentDebuff: 0.06, context: ['rally'] },
      },
      LEN: {
        name: 'Peso Absurdo',
        desc: '+30% peso. Cada bola é uma parede. Adversários chegam em desequilíbrio.',
        effects: { strengthBonus: 3.8, opponentDebuff: 0.12, context: ['rally'] },
      },
    },
  },

  // ────────────────────────────────────────────────────────────────
  // SEÇÃO 4: FORMATOS
  // ────────────────────────────────────────────────────────────────

  ESPECIALISTA_BO5: {
    id: 'ESPECIALISTA_BO5',
    name: 'Especialista BO5',
    section: 'format',
    mutex: ['ESPECIALISTA_KO'],
    tiers: {
      NEG: {
        name: 'Melhor em BO3',
        desc: '-10% geral em partidas Best of 5. Melhor em formato curto.',
        effects: { strengthBonus: -1.0, context: ['bestOf5'] },
      },
      COM: {
        name: 'BO5 Sólido',
        desc: '+10% em partidas BO5. Ritmo diferente, mais confortável.',
        effects: { strengthBonus: 1.5, context: ['bestOf5'] },
      },
      RAR: {
        name: 'BO5 Especialista',
        desc: '+20% em BO5. Stamina gerida melhor. Adversários desmoronam no 4º-5º.',
        effects: { strengthBonus: 2.5, staminaMult: 1.15, context: ['bestOf5'] },
      },
      LEN: {
        name: 'Monstro de Grand Slam',
        desc: '+30% em BO5. Nenhum adversário aguenta durante 3-5 sets contra ele.',
        effects: { strengthBonus: 3.8, staminaMult: 1.25, opponentDebuff: 0.08, context: ['bestOf5'] },
      },
    },
  },

  CAMPEAO_TB: {
    id: 'CAMPEAO_TB',
    name: 'Campeão de Tiebreak',
    section: 'format',
    mutex: ['TIEBREAK_KILLER'],
    tiers: {
      NEG: {
        name: 'Terror no Tiebreak',
        desc: '-20% em tiebreak. Formato decisivo, momento de travamento.',
        effects: { clutchMult: 0.80, context: ['tiebreak'] },
      },
      COM: {
        name: 'Campeão de TB',
        desc: '+15% em tiebreaks. Confortável com o formato mini-set.',
        effects: { clutchMult: 1.15, strengthBonus: 1.5, context: ['tiebreak'] },
      },
      RAR: {
        name: 'Campeão de TB',
        desc: '+25% em tiebreaks. Saca melhor e retorna melhor nesses momentos.',
        effects: { clutchMult: 1.25, serveMult: 1.12, context: ['tiebreak'] },
      },
      LEN: {
        name: 'Dono dos TBs',
        desc: '+35% em tiebreaks. Adversários preferiram evitar. Formato é sua arma.',
        effects: { clutchMult: 1.35, strengthBonus: 3.5, serveMult: 1.15, context: ['tiebreak'] },
      },
    },
    sombra: { challenge: 'Ganhar 10 tiebreaks na carreira', target: 10, metric: 'tiebreaksWon' },
  },

  RELOGIO_BIOLOGICO: {
    id: 'RELOGIO_BIOLOGICO',
    name: 'Relógio Biológico',
    section: 'format',
    tiers: {
      NEG: {
        name: 'Contra-Relógio',
        desc: 'Partidas longas desgastam mais: stamina cai 25% mais rápido.',
        effects: { staminaMult: 0.75, context: ['longMatch'] },
      },
      COM: {
        name: 'Relógio Biológico',
        desc: 'Em partidas de 2h+, +10% geral. Corpo calibrado para longas batalhas.',
        effects: { strengthBonus: 1.0, staminaMult: 1.10, context: ['longMatch'] },
      },
      RAR: {
        name: 'Cronômetro Perfeito',
        desc: 'Em partidas longas, +20% + reaquecimento automático entre sets.',
        effects: { strengthBonus: 2.0, staminaMult: 1.20, context: ['longMatch'] },
      },
      LEN: {
        name: 'Máquina do Tempo',
        desc: '+30% em partidas de 2h+. Parece mais fresco no final que no início.',
        effects: { strengthBonus: 3.5, staminaMult: 1.35, context: ['longMatch'] },
      },
    },
  },

  TERCEIRO_SET: {
    id: 'TERCEIRO_SET',
    name: 'Especialista no 3º Set',
    section: 'format',
    tiers: {
      NEG: {
        name: 'Desmorona no 3º',
        desc: '-15% no 3º set em BO3. Fisicamente ou mentalmente já foi.',
        effects: { strengthBonus: -1.5, staminaMult: 0.82, context: ['thirdSet'] },
      },
      COM: {
        name: '3º Set Sólido',
        desc: '+15% no 3º set. Foco total no decisivo.',
        effects: { strengthBonus: 2.0, clutchMult: 1.15, context: ['thirdSet'] },
      },
      RAR: {
        name: 'Especialista no 3º',
        desc: '+25% no 3º set. Stamina gerida. Adversário cansou mais.',
        effects: { strengthBonus: 3.0, clutchMult: 1.25, staminaMult: 1.15, context: ['thirdSet'] },
      },
      LEN: {
        name: 'Senhor do 3º Set',
        desc: '+35% no 3º. Forma GRANDE_FORMA garantida. Adversários choram.',
        effects: { strengthBonus: 4.0, clutchMult: 1.35, formFloor: 'GRANDE_FORMA', context: ['thirdSet'] },
      },
    },
  },

  // ────────────────────────────────────────────────────────────────
  // SEÇÃO 5: SUPERFÍCIES
  // ────────────────────────────────────────────────────────────────

  REI_SAIBRO: {
    id: 'REI_SAIBRO',
    name: 'Rei do Saibro',
    section: 'surface',
    mutex: ['MAGO_GRAMA'],
    tiers: {
      NEG: {
        name: 'Dificuldade no Saibro',
        desc: '-15% em saibro. Rally lento sufoca. Movimento difícil.',
        effects: { strengthBonus: -2.0, context: ['surface:CLAY'] },
      },
      COM: {
        name: 'Confortável no Saibro',
        desc: '+12% em saibro. Construção de ponto natural.',
        effects: { strengthBonus: 2.0, context: ['surface:CLAY'] },
      },
      RAR: {
        name: 'Rei do Saibro',
        desc: '+22% em saibro. Posicionamento e paciência superiores.',
        effects: { strengthBonus: 3.5, opponentDebuff: 0.05, context: ['surface:CLAY'] },
      },
      LEN: {
        name: 'Soberano do Pó de Tijolo',
        desc: '+32% em saibro. Invencível na superfície. Adversários sabem que não têm chance.',
        effects: { strengthBonus: 5.0, opponentDebuff: 0.12, context: ['surface:CLAY'] },
      },
    },
    sombra: { challenge: 'Vencer 5 partidas em saibro', target: 5, metric: 'clayWins' },
  },

  MAGO_GRAMA: {
    id: 'MAGO_GRAMA',
    name: 'Mago da Grama',
    section: 'surface',
    mutex: ['REI_SAIBRO'],
    tiers: {
      NEG: {
        name: 'Péssimo na Grama',
        desc: '-15% na grama. Movimento difícil, bounce imprevisível.',
        effects: { strengthBonus: -2.0, context: ['surface:GRASS'] },
      },
      COM: {
        name: 'Confortável na Grama',
        desc: '+12% na grama. Serve-and-volley natural.',
        effects: { strengthBonus: 2.0, context: ['surface:GRASS'] },
      },
      RAR: {
        name: 'Mago da Grama',
        desc: '+22% na grama. Saque e rede dominantes.',
        effects: { strengthBonus: 3.5, serveMult: 1.10, context: ['surface:GRASS'] },
      },
      LEN: {
        name: 'Senhor de Wimbledon',
        desc: '+32% na grama. O melhor da história na superfície.',
        effects: { strengthBonus: 5.0, serveMult: 1.15, opponentDebuff: 0.10, context: ['surface:GRASS'] },
      },
    },
    sombra: { challenge: 'Vencer 5 partidas na grama', target: 5, metric: 'grassWins' },
  },

  HARDCOURT_NATIVO: {
    id: 'HARDCOURT_NATIVO',
    name: 'Hardcourt Nativo',
    section: 'surface',
    tiers: {
      NEG: {
        name: 'Lesionado pelo Hard',
        desc: '-10% em hard court + risco de lesão aumentado.',
        effects: { strengthBonus: -1.5, context: ['surface:HARD'] },
      },
      COM: {
        name: 'Nativo do Hard',
        desc: '+12% em hard court. Superficie favorita desde jovem.',
        effects: { strengthBonus: 2.0, context: ['surface:HARD'] },
      },
      RAR: {
        name: 'Especialista Hard',
        desc: '+22% em hard. Proteção de lesão. Movimento otimizado.',
        effects: { strengthBonus: 3.5, context: ['surface:HARD'] },
      },
      LEN: {
        name: 'Rei do Cemento',
        desc: '+30% em hard. Superfície que define sua grandeza.',
        effects: { strengthBonus: 4.5, opponentDebuff: 0.08, context: ['surface:HARD'] },
      },
    },
    sombra: { challenge: 'Vencer 5 partidas em hard sem lesão', target: 5, metric: 'hardWinsNoInjury' },
  },

  INDOOR_SPEC: {
    id: 'INDOOR_SPEC',
    name: 'Especialista Indoor',
    section: 'surface',
    tiers: {
      NEG: {
        name: 'Indoor Perturbador',
        desc: '-12% indoor. Luz artificial e eco tiram foco.',
        effects: { strengthBonus: -1.5, context: ['surface:INDOOR'] },
      },
      COM: {
        name: 'Indoor Sólido',
        desc: '+12% indoor. Adaptado à velocidade e condições internas.',
        effects: { strengthBonus: 2.0, context: ['surface:INDOOR'] },
      },
      RAR: {
        name: 'Especialista Indoor',
        desc: '+22% indoor. Condições onde ele brilha.',
        effects: { strengthBonus: 3.5, context: ['surface:INDOOR'] },
      },
      LEN: {
        name: 'Imperador do Indoor',
        desc: '+30% indoor. Palcos cobertos, resultados extraordinários.',
        effects: { strengthBonus: 4.5, opponentDebuff: 0.08, context: ['surface:INDOOR'] },
      },
    },
    sombra: { challenge: 'Vencer 3 torneios indoor', target: 3, metric: 'indoorTitles' },
  },

  ALL_SURFACE: {
    id: 'ALL_SURFACE',
    name: 'All Court',
    section: 'surface',
    tiers: {
      NEG: {
        name: 'Sem Especialidade',
        desc: '-5% em todas as superfícies. Competente em tudo, ótimo em nada.',
        effects: { strengthBonus: -0.8, context: ['always'] },
      },
      COM: {
        name: 'All Court',
        desc: '+8% em todas as superfícies. Adaptação rápida a qualquer quadra.',
        effects: { strengthBonus: 1.2, context: ['always'] },
      },
      RAR: {
        name: 'Mestre das Superfícies',
        desc: '+16% em todas. Cada superfície traz conforto diferente.',
        effects: { strengthBonus: 2.2, context: ['always'] },
      },
      LEN: {
        name: 'Rei de Todas',
        desc: '+25% em qualquer superfície. Sem fraqueza, apenas força.',
        effects: { strengthBonus: 3.5, context: ['always'] },
      },
    },
  },

  // ────────────────────────────────────────────────────────────────
  // SEÇÃO 6: TORNEIOS
  // ────────────────────────────────────────────────────────────────

  CACADOR_GS: {
    id: 'CACADOR_GS',
    name: 'Caçador de Grand Slam',
    section: 'tournament',
    tiers: {
      NEG: {
        name: 'Amaldiçoado pelo GS',
        desc: '-15% em qualquer Grand Slam. Maior palco, pior resultado.',
        effects: { strengthBonus: -2.0, clutchMult: 0.85, context: ['grandSlam'] },
      },
      COM: {
        name: 'Caçador',
        desc: '+10% em GS. Motivação extra nos maiores torneios.',
        effects: { strengthBonus: 1.5, clutchMult: 1.10, context: ['grandSlam'] },
      },
      RAR: {
        name: 'Caçador de GS',
        desc: '+18% em GS. A caçada ao título principal é o que move.',
        effects: { strengthBonus: 2.5, clutchMult: 1.20, context: ['grandSlam'] },
      },
      LEN: {
        name: 'Lenda dos Slams',
        desc: '+28% em GS. Feito para o palco mais importante.',
        effects: { strengthBonus: 4.0, clutchMult: 1.30, formFloor: 'GRANDE_FORMA', context: ['grandSlam'] },
      },
    },
    sombra: { challenge: 'Vencer qualquer Grand Slam', target: 1, metric: 'grandSlamTitles' },
  },

  ESPECIALISTA_KO: {
    id: 'ESPECIALISTA_KO',
    name: 'Especialista KO',
    section: 'tournament',
    mutex: ['ESPECIALISTA_BO5'],
    tiers: {
      NEG: {
        name: 'Para nas Quartas',
        desc: '-15% em fases avançadas. Algo bloqueante nas quartas em diante.',
        effects: { strengthBonus: -1.5, context: ['quarterFinal+'] },
      },
      COM: {
        name: 'KO Sólido',
        desc: '+10% em fases eliminatórias. Confortável com o peso de cada partida.',
        effects: { strengthBonus: 1.5, context: ['knockoutRound'] },
      },
      RAR: {
        name: 'Especialista KO',
        desc: '+20% em eliminatórias. Cada vitória alimenta a chama.',
        effects: { strengthBonus: 2.5, clutchMult: 1.15, context: ['knockoutRound'] },
      },
      LEN: {
        name: 'Destilado do KO',
        desc: '+30% em eliminatórias. Torneio de mata-mata é seu elemento.',
        effects: { strengthBonus: 4.0, clutchMult: 1.25, context: ['knockoutRound'] },
      },
    },
    sombra: { challenge: 'Atingir 3 semifinais em torneios diferentes', target: 3, metric: 'semifinalReached' },
  },

  REI_DRAW: {
    id: 'REI_DRAW',
    name: 'Rei do Chaveamento',
    section: 'tournament',
    tiers: {
      NEG: {
        name: 'Azarado no Chaveamento',
        desc: '-10% quando enfrenta adversários melhor ranqueados na primeira semana.',
        effects: { strengthBonus: -1.0, context: ['toughDraw'] },
      },
      COM: {
        name: 'Rei do Draw',
        desc: '+8% quando enfrenta adversários mais fracos no chaveamento.',
        effects: { strengthBonus: 1.2, context: ['easierDraw'] },
      },
      RAR: {
        name: 'Dono do Chaveamento',
        desc: '+16% independente do chaveamento. Adapta jogo ao adversário.',
        effects: { strengthBonus: 2.0, context: ['always'] },
      },
      LEN: {
        name: 'Beneficiário Total',
        desc: '+25% e cria vantagem em qualquer chaveamento. Favorece a si mesmo.',
        effects: { strengthBonus: 3.2, opponentDebuff: 0.06, context: ['always'] },
      },
    },
  },

  CACADOR_SEEDS: {
    id: 'CACADOR_SEEDS',
    name: 'Caçador de Seeds',
    section: 'tournament',
    tiers: {
      NEG: {
        name: 'Intimidado pelos Seeds',
        desc: '-15% quando enfrenta um top seed. O nome pesa.',
        effects: { strengthBonus: -1.5, clutchMult: 0.88, context: ['vsTopSeed'] },
      },
      COM: {
        name: 'Caçador',
        desc: '+10% contra top seeds. Nada a perder, tudo a ganhar.',
        effects: { strengthBonus: 1.5, clutchMult: 1.10, context: ['vsTopSeed'] },
      },
      RAR: {
        name: 'Matador de Seeds',
        desc: '+20% vs seeds. Upsets são especialidade.',
        effects: { strengthBonus: 2.5, clutchMult: 1.20, context: ['vsTopSeed'] },
      },
      LEN: {
        name: 'Terror dos Favoritos',
        desc: '+30% vs seeds. Cada chaveamento com seed é oportunidade.',
        effects: { strengthBonus: 4.0, clutchMult: 1.30, opponentDebuff: 0.08, context: ['vsTopSeed'] },
      },
    },
  },

  // ────────────────────────────────────────────────────────────────
  // SEÇÃO 7: LEGADO
  // ────────────────────────────────────────────────────────────────

  RESSURGIMENTO: {
    id: 'RESSURGIMENTO',
    name: 'Ressurgimento',
    section: 'legacy',
    tiers: {
      NEG: {
        name: 'Involução Constante',
        desc: 'Após declínio, atributos caem 10% mais rápido. Sem volta.',
        effects: { strengthBonus: -1.5, context: ['decline'] },
      },
      COM: {
        name: 'Ressurgimento',
        desc: 'Em declínio, chance de mini-pico: +10% por uma temporada.',
        effects: { strengthBonus: 1.5, context: ['decline'] },
      },
      RAR: {
        name: 'Renascimento',
        desc: '+20% em declínio + declínio atrasado em 1 temporada.',
        effects: { strengthBonus: 2.5, staminaMult: 1.10, context: ['decline'] },
      },
      LEN: {
        name: 'Volta Lendária',
        desc: '+30% em declínio. A história é reescrita na reta final.',
        effects: { strengthBonus: 4.0, context: ['decline'] },
      },
    },
  },

  MEMORIA_FOTOGRAFICA: {
    id: 'MEMORIA_FOTOGRAFICA',
    name: 'Memória Fotográfica',
    section: 'legacy',
    tiers: {
      NEG: {
        name: 'Memória Curta',
        desc: '-10% em rematches. Não aprende com derrotas anteriores.',
        effects: { strengthBonus: -1.0, context: ['rematch'] },
      },
      COM: {
        name: 'Memória',
        desc: '+12% em rematches. Lembra cada padrão do adversário.',
        effects: { strengthBonus: 1.5, context: ['rematch'] },
      },
      RAR: {
        name: 'Análise Profunda',
        desc: '+22% em rematches. Adversários não conseguem surpreender.',
        effects: { strengthBonus: 2.5, opponentDebuff: 0.06, context: ['rematch'] },
      },
      LEN: {
        name: 'Arquivo Mental',
        desc: '+32% em rematches. Decodifica qualquer adversário já enfrentado.',
        effects: { strengthBonus: 4.0, opponentDebuff: 0.12, context: ['rematch'] },
      },
    },
  },

  PSICOLOGICO: {
    id: 'PSICOLOGICO',
    name: 'Dominância Psicológica',
    section: 'legacy',
    tiers: {
      NEG: {
        name: 'Cabeça Frágil',
        desc: 'Adversários que o derrotaram antes: -15%. Não supera os fantasmas.',
        effects: { clutchMult: 0.85, strengthBonus: -1.5, context: ['vsConqueror'] },
      },
      COM: {
        name: 'Psicológico',
        desc: '+12% contra adversários que derrotou anteriormente.',
        effects: { strengthBonus: 1.5, context: ['vsDefeated'] },
      },
      RAR: {
        name: 'Dominância Mental',
        desc: '+22% contra adversários já derrotados. H2H viram arma.',
        effects: { strengthBonus: 2.5, opponentDebuff: 0.07, context: ['vsDefeated'] },
      },
      LEN: {
        name: 'Fantasma na Cabeça',
        desc: '+30% vs anteriores derrotados. Adversário sabe que vai perder.',
        effects: { strengthBonus: 4.0, opponentDebuff: 0.15, context: ['vsDefeated'] },
      },
    },
  },

  ESPECIALISTA_REVANCHE: {
    id: 'ESPECIALISTA_REVANCHE',
    name: 'Especialista em Revanche',
    section: 'legacy',
    tiers: {
      NEG: {
        name: 'Incapaz de Vingar',
        desc: '-12% contra adversários que derrotou. Não consegue ser consistente.',
        effects: { strengthBonus: -1.2, context: ['vsDefeated'] },
      },
      COM: {
        name: 'Revanche',
        desc: '+12% quando perde para um adversário pela segunda vez.',
        effects: { strengthBonus: 1.5, clutchMult: 1.12, context: ['rematchLoss'] },
      },
      RAR: {
        name: 'Especialista em Revanche',
        desc: '+22% em revanche após derrota. Motivação extra.',
        effects: { strengthBonus: 2.5, clutchMult: 1.22, context: ['rematchLoss'] },
      },
      LEN: {
        name: 'Vendetta',
        desc: '+32% na revanche. A derrota anterior é o combustível definitivo.',
        effects: { strengthBonus: 4.0, clutchMult: 1.32, context: ['rematchLoss'] },
      },
    },
  },

  RIVAL_ETERNO: {
    id: 'RIVAL_ETERNO',
    name: 'Rival Eterno',
    section: 'legacy',
    tiers: {
      NEG: {
        name: 'Sem Rival Definido',
        desc: 'Sem rival que o motive. -5% geral em partidas importantes.',
        effects: { strengthBonus: -0.5, context: ['importantMatch'] },
      },
      COM: {
        name: 'Rival',
        desc: '+12% quando enfrenta o rival principal (H2H mais disputado).',
        effects: { strengthBonus: 2.0, clutchMult: 1.15, context: ['vsRival'] },
      },
      RAR: {
        name: 'Rival Eterno',
        desc: '+22% vs rival. O duelo define sua carreira.',
        effects: { strengthBonus: 3.0, clutchMult: 1.25, context: ['vsRival'] },
      },
      LEN: {
        name: 'O Confronto do Século',
        desc: '+32% vs rival. Todos os outros adversários são secundários.',
        effects: { strengthBonus: 4.5, clutchMult: 1.35, context: ['vsRival'] },
      },
    },
  },

  // ────────────────────────────────────────────────────────────────
  // SEÇÃO 8: DESENVOLVIMENTO
  // ────────────────────────────────────────────────────────────────

  SUPERPRODIGIO: {
    id: 'SUPERPRODIGIO',
    name: 'Superprodígio',
    section: 'development',
    mutex: ['LATE_BLOOMER'],
    tiers: {
      NEG: {
        name: 'Pressão do Prodígio',
        desc: 'Expectativa muito alta antes dos 20. -10% até completar 21 anos.',
        effects: { strengthBonus: -1.0, context: ['under21'] },
      },
      COM: {
        name: 'Prodígio',
        desc: 'Antes dos 21: +12% ao crescimento de atributos. Aprende ultra rápido.',
        effects: { strengthBonus: 1.5, context: ['under21'] },
      },
      RAR: {
        name: 'Superprodígio',
        desc: '+22% antes dos 21. Pico de carreira pode chegar mais cedo.',
        effects: { strengthBonus: 2.5, context: ['under21'] },
      },
      LEN: {
        name: 'Fenômeno',
        desc: '+32% antes dos 21. Nenhum jovem chegou tão longe tão rápido.',
        effects: { strengthBonus: 4.0, context: ['under21'] },
      },
    },
  },

  DIAMANTE_BRUTO: {
    id: 'DIAMANTE_BRUTO',
    name: 'Diamante Bruto',
    section: 'development',
    tiers: {
      NEG: {
        name: 'Incompreendido',
        desc: 'Potencial não desenvolvido: pico de carreira 2 anos mais tarde, sem compensação.',
        effects: { strengthBonus: -1.0, context: ['earlyCareer'] },
      },
      COM: {
        name: 'Diamante Bruto',
        desc: 'Período de ajuste: -5% nos 2 primeiros anos mas +15% nos 2 seguintes.',
        effects: { strengthBonus: 1.5, context: ['midCareer'] },
      },
      RAR: {
        name: 'Pedra Preciosa',
        desc: 'Após 3 anos pro: +20% ao crescimento de todos os atributos.',
        effects: { strengthBonus: 2.5, context: ['midCareer'] },
      },
      LEN: {
        name: 'Ouro Puro',
        desc: 'Após 3 anos pro: +30% crescimento. O melhor tarde do que nunca.',
        effects: { strengthBonus: 3.8, context: ['midCareer'] },
      },
    },
  },

  VETERANO_ETERNO: {
    id: 'VETERANO_ETERNO',
    name: 'Veterano Eterno',
    section: 'development',
    tiers: {
      NEG: {
        name: 'Cansado Demais',
        desc: 'Após os 30: declínio 20% mais rápido. O corpo já não aguenta.',
        effects: { strengthBonus: -2.0, context: ['over30'] },
      },
      COM: {
        name: 'Veterano',
        desc: 'Após os 30: declínio 20% mais lento. Experiência compensa.',
        effects: { strengthBonus: 1.0, staminaMult: 1.10, context: ['over30'] },
      },
      RAR: {
        name: 'Veterano Eterno',
        desc: 'Após os 30: +15% e declínio mínimo. Jogo mais inteligente.',
        effects: { strengthBonus: 2.0, staminaMult: 1.20, context: ['over30'] },
      },
      LEN: {
        name: 'Imortal',
        desc: 'Após os 30: +25% e quase sem declínio. A lenda não envelhece.',
        effects: { strengthBonus: 3.5, staminaMult: 1.30, context: ['over30'] },
      },
    },
  },

  LATE_BLOOMER: {
    id: 'LATE_BLOOMER',
    name: 'Late Bloomer',
    section: 'development',
    mutex: ['SUPERPRODIGIO'],
    tiers: {
      NEG: {
        name: 'Muito Tarde',
        desc: 'Pico chega aos 28+ mas nunca é tão alto. Potencial desperdiçado.',
        effects: { strengthBonus: -1.0, context: ['earlyCareer'] },
      },
      COM: {
        name: 'Late Bloomer',
        desc: 'Pico de carreira chegando mais tarde (26-28) mas com valores mais altos.',
        effects: { strengthBonus: 1.5, context: ['lateCareer'] },
      },
      RAR: {
        name: 'Floresce Tarde',
        desc: 'Entre 26-30: +20% crescimento. Os melhores anos ainda estão por vir.',
        effects: { strengthBonus: 2.5, context: ['lateCareer'] },
      },
      LEN: {
        name: 'Destinado a Florir',
        desc: 'Entre 25-32: pico mais alto de todos. A espera valeu.',
        effects: { strengthBonus: 4.0, context: ['lateCareer'] },
      },
    },
  },

  BLINDAGEM_CARREIRA: {
    id: 'BLINDAGEM_CARREIRA',
    name: 'Blindagem de Carreira',
    section: 'development',
    tiers: {
      NEG: {
        name: 'Carreira Instável',
        desc: 'Eventos ruins afetam mais a trajetória. Oscilações frequentes.',
        effects: { strengthBonus: -1.0, context: ['adversity'] },
      },
      COM: {
        name: 'Blindagem',
        desc: 'Eventos negativos de carreira têm 30% menos impacto nos atributos.',
        effects: { strengthBonus: 0.5, context: ['always'] },
      },
      RAR: {
        name: 'Carreira Protegida',
        desc: 'Adversidades reduzidas em 50%. Carreira mais linear e sólida.',
        effects: { strengthBonus: 1.5, context: ['always'] },
      },
      LEN: {
        name: 'Carreira Inquebrável',
        desc: 'Adversidades quase não afetam. A carreira segue independente do que acontece.',
        effects: { strengthBonus: 2.5, staminaMult: 1.10, context: ['always'] },
      },
    },
  },

  // ────────────────────────────────────────────────────────────────
  // SEÇÃO 9: ESTABILIDADE
  // ────────────────────────────────────────────────────────────────

  INERCIAL: {
    id: 'INERCIAL',
    name: 'Inercial',
    section: 'stability',
    mutex: ['BOLA_DE_NEVE'],
    tiers: {
      NEG: {
        name: 'Inércia Negativa',
        desc: 'Após 2 derrotas seguidas, -15% por mais 1 partida. Difícil sair do buraco.',
        effects: { strengthBonus: -1.5, context: ['afterConsecutiveLosses'] },
      },
      COM: {
        name: 'Inercial Positivo',
        desc: 'Após 2 vitórias seguidas, +10% na próxima.',
        effects: { strengthBonus: 1.5, context: ['afterWinStreak'] },
      },
      RAR: {
        name: 'Momentum Positivo',
        desc: 'Após 3 vitórias seguidas, +20%.',
        effects: { strengthBonus: 2.5, context: ['afterWinStreak'] },
      },
      LEN: {
        name: 'Imparável em Sequência',
        desc: 'Após 4+ vitórias, +30%. Quase impossível de parar quando em série.',
        effects: { strengthBonus: 4.0, context: ['afterWinStreak'] },
      },
    },
  },

  RECUPERACAO_RAPIDA: {
    id: 'RECUPERACAO_RAPIDA',
    name: 'Recuperação Rápida',
    section: 'stability',
    tiers: {
      NEG: {
        name: 'Lento para Recuperar',
        desc: 'Após derrota, -10% na partida seguinte. Emocional difícil de gerir.',
        effects: { strengthBonus: -1.0, context: ['afterLoss'] },
      },
      COM: {
        name: 'Recupera Rápido',
        desc: 'Após derrota, efeito mínimo na partida seguinte.',
        effects: { strengthBonus: 0.5, context: ['afterLoss'] },
      },
      RAR: {
        name: 'Recuperação Rápida',
        desc: 'Após derrota, +10% de motivação na seguinte. Raiva positiva.',
        effects: { strengthBonus: 1.5, clutchMult: 1.10, context: ['afterLoss'] },
      },
      LEN: {
        name: 'Zero Memória de Derrota',
        desc: 'Derrotas não afetam. +15% na partida seguinte. Mindset perfeito.',
        effects: { strengthBonus: 2.0, clutchMult: 1.15, context: ['afterLoss'] },
      },
    },
  },

  PICO_ADRENALINA: {
    id: 'PICO_ADRENALINA',
    name: 'Pico de Adrenalina',
    section: 'stability',
    tiers: {
      NEG: {
        name: 'Ansiedade Pré-Match',
        desc: 'Primeiro set: -15%. Nervo antes da partida prejudica início.',
        effects: { strengthBonus: -1.5, context: ['firstSet'] },
      },
      COM: {
        name: 'Pico de Adrenalina',
        desc: 'Primeiro set: +12%. Começa quente e intenso.',
        effects: { strengthBonus: 1.5, context: ['firstSet'] },
      },
      RAR: {
        name: 'Explosão Inicial',
        desc: 'Primeiro set: +22%. Adversários não conseguem se ajustar no início.',
        effects: { strengthBonus: 2.5, opponentDebuff: 0.06, context: ['firstSet'] },
      },
      LEN: {
        name: 'Furacão de Largada',
        desc: 'Primeiro set: +35%. O jogo pode acabar antes de começar de verdade.',
        effects: { strengthBonus: 4.0, opponentDebuff: 0.12, context: ['firstSet'] },
      },
    },
  },

  BASE_SOLIDA: {
    id: 'BASE_SOLIDA',
    name: 'Base Sólida',
    section: 'stability',
    mutex: ['VOLATILIDADE_CALC'],
    tiers: {
      NEG: {
        name: 'Sem Base',
        desc: 'Atributos oscilam muito. Um dia 90%, outro 60%. Imprevisível.',
        effects: { strengthBonus: -1.0, context: ['always'] },
      },
      COM: {
        name: 'Sólido',
        desc: '+5% estável em todos. Nunca vai muito abaixo do seu nível.',
        effects: { strengthBonus: 1.0, errorMult: 0.92, context: ['always'] },
      },
      RAR: {
        name: 'Base Sólida',
        desc: '+10% estável. Oscilações mínimas. Sempre entrega o mesmo nível.',
        effects: { strengthBonus: 1.8, errorMult: 0.85, context: ['always'] },
      },
      LEN: {
        name: 'Granito',
        desc: '+16% consistente. Impossível ter um dia ruim.',
        effects: { strengthBonus: 2.8, errorMult: 0.78, context: ['always'] },
      },
    },
  },

  BOLA_DE_NEVE: {
    id: 'BOLA_DE_NEVE',
    name: 'Bola de Neve',
    section: 'stability',
    mutex: ['INERCIAL'],
    tiers: {
      NEG: {
        name: 'Desmoronamento',
        desc: 'Quando começa a errar, os erros se acumulam. -20% após 2 erros seguidos.',
        effects: { errorMult: 1.30, strengthBonus: -1.5, context: ['afterErrors'] },
      },
      COM: {
        name: 'Bola de Neve',
        desc: 'Após winner ou break, +10% no ponto seguinte.',
        effects: { strengthBonus: 1.2, context: ['afterWinner'] },
      },
      RAR: {
        name: 'Bola de Neve Crescente',
        desc: 'Após sequência de winners ou breaks, +20%. Efeito cumulativo.',
        effects: { strengthBonus: 2.5, context: ['afterWinStreak'] },
      },
      LEN: {
        name: 'Avalanche Mental',
        desc: 'Em sequência, +30%. O efeito bola de neve nunca para.',
        effects: { strengthBonus: 4.0, opponentDebuff: 0.08, context: ['afterWinStreak'] },
      },
    },
  },

  MAQUINA: {
    id: 'MAQUINA',
    name: 'Máquina',
    section: 'stability',
    mutex: ['SANGUE_QUENTE'],
    tiers: {
      NEG: {
        name: 'Robótico',
        desc: 'Falta de emoção: adversários não se intimida. Sem vantagem psicológica.',
        effects: { opponentDebuff: -0.03, context: ['always'] },
      },
      COM: {
        name: 'Máquina',
        desc: 'Emoções não afetam performance. Sempre no mesmo nível.',
        effects: { errorMult: 0.90, staminaMult: 1.05, context: ['always'] },
      },
      RAR: {
        name: 'Androide',
        desc: 'Zero variância emocional. +12% consistência total.',
        effects: { strengthBonus: 1.5, errorMult: 0.82, staminaMult: 1.12, context: ['always'] },
      },
      LEN: {
        name: 'Terminator',
        desc: '+20% consistência. Absolutamente inabalável. Cada ponto executado perfeitamente.',
        effects: { strengthBonus: 2.5, errorMult: 0.75, staminaMult: 1.20, context: ['always'] },
      },
    },
  },

  INQUEBRAVEL: {
    id: 'INQUEBRAVEL',
    name: 'Inquebrável',
    section: 'stability',
    tiers: {
      NEG: {
        name: 'Vulnerável',
        desc: '-10% em qualquer ponto crítico. Cede sob a menor pressão.',
        effects: { clutchMult: 0.90, context: ['pressure'] },
      },
      COM: {
        name: 'Resistente',
        desc: '+10% resistência a pressão. Pontos críticos não o abalam.',
        effects: { clutchMult: 1.10, errorMult: 0.90, context: ['pressure'] },
      },
      RAR: {
        name: 'Inquebrável',
        desc: '+20% sob pressão. Parece crescer quanto mais difícil fica.',
        effects: { clutchMult: 1.20, errorMult: 0.82, context: ['pressure'] },
      },
      LEN: {
        name: 'Muralha de Aço',
        desc: '+30% sob qualquer pressão. Literalmente não se abala.',
        effects: { clutchMult: 1.30, errorMult: 0.75, context: ['pressure'] },
      },
    },
  },

  ESPECIALISTA_SERIE: {
    id: 'ESPECIALISTA_SERIE',
    name: 'Especialista em Séries',
    section: 'stability',
    tiers: {
      NEG: {
        name: 'Inconsistente na Série',
        desc: '-10% em qualquer segundo jogo de série curta contra o mesmo adversário.',
        effects: { strengthBonus: -1.0, context: ['rematch'] },
      },
      COM: {
        name: 'Aprende Rápido',
        desc: '+10% no segundo encontro com o mesmo adversário na mesma temporada.',
        effects: { strengthBonus: 1.5, context: ['rematch'] },
      },
      RAR: {
        name: 'Especialista em Séries',
        desc: '+20% no segundo encontro. Nunca cai para o mesmo adversário duas vezes seguidas.',
        effects: { strengthBonus: 2.5, context: ['rematch'] },
      },
      LEN: {
        name: 'Maestro da Série',
        desc: '+30% no segundo encontro. Adversários odeiam enfrentá-lo pela segunda vez.',
        effects: { strengthBonus: 4.0, opponentDebuff: 0.08, context: ['rematch'] },
      },
    },
  },

  VOLATILIDADE_CALC: {
    id: 'VOLATILIDADE_CALC',
    name: 'Volatilidade Calculada',
    section: 'stability',
    mutex: ['BASE_SOLIDA'],
    tiers: {
      NEG: {
        name: 'Volátil Demais',
        desc: 'Oscilações imprevisíveis. Um dia destrói tops, outro perde para quem não devia.',
        effects: { strengthBonus: -1.0, context: ['always'] },
      },
      COM: {
        name: 'Calculado',
        desc: 'Oscilações controladas. Alta variance = mais upsets, mais grandes vitórias.',
        effects: { strengthBonus: 0.5, context: ['always'] },
      },
      RAR: {
        name: 'Volatilidade Calculada',
        desc: 'Alta variance usada estrategicamente. +15% chance de upset, +15% de grande vitória.',
        effects: { strengthBonus: 1.5, context: ['always'] },
      },
      LEN: {
        name: 'Imprevisível Total',
        desc: 'Ninguém sabe o que vai acontecer. Variance máxima, mas controlada.',
        effects: { strengthBonus: 2.5, context: ['always'] },
      },
    },
  },

  // ────────────────────────────────────────────────────────────────
  // SEÇÃO 10: FÍSICO
  // ────────────────────────────────────────────────────────────────

  IRON_LEGS: {
    id: 'IRON_LEGS',
    name: 'Iron Legs',
    section: 'physical',
    tiers: {
      NEG: {
        name: 'Pernas de Algodão',
        desc: 'Stamina cai 25% mais rápido em rallies longos. Pernas cansam primeiro.',
        effects: { staminaMult: 0.75, context: ['longRally'] },
      },
      COM: {
        name: 'Pernas Sólidas',
        desc: 'Stamina decai 15% mais lento. Cobertura de quadra mantida por mais tempo.',
        effects: { staminaMult: 1.15, context: ['always'] },
      },
      RAR: {
        name: 'Iron Legs',
        desc: 'Stamina decai 25% mais lento. Parece incansável em longas batalhas.',
        effects: { staminaMult: 1.25, strengthBonus: 1.0, context: ['always'] },
      },
      LEN: {
        name: 'Máquina Humana',
        desc: 'Stamina quase não cai. 3h de partida, mesmo nível do início.',
        effects: { staminaMult: 1.40, strengthBonus: 2.0, context: ['always'] },
      },
    },
  },

  RECUPERACAO_FISICA: {
    id: 'RECUPERACAO_FISICA',
    name: 'Recuperação Física',
    section: 'physical',
    tiers: {
      NEG: {
        name: 'Recuperação Lenta',
        desc: 'Entre sets e partidas, recupera 20% mais lento. Acúmulo de fadiga.',
        effects: { staminaMult: 0.80, context: ['betweenSets'] },
      },
      COM: {
        name: 'Recupera Bem',
        desc: 'Entre sets, recupera 20% mais rápido. Ritmo físico superior.',
        effects: { staminaMult: 1.20, context: ['betweenSets'] },
      },
      RAR: {
        name: 'Recuperação Física',
        desc: 'Entre sets, recupera 35% mais rápido. Cada intervalo é uma recarga.',
        effects: { staminaMult: 1.35, strengthBonus: 0.5, context: ['betweenSets'] },
      },
      LEN: {
        name: 'Regenerador',
        desc: 'Recupera quase totalmente entre sets. Parece sempre fresco.',
        effects: { staminaMult: 1.50, strengthBonus: 1.5, context: ['betweenSets'] },
      },
    },
  },

  BLINDAGEM_LESAO: {
    id: 'BLINDAGEM_LESAO',
    name: 'Blindagem de Lesão',
    section: 'physical',
    tiers: {
      NEG: {
        name: 'Frágil',
        desc: 'Risco de lesão 40% maior. Qualquer esforço excessivo tem consequência.',
        effects: { strengthBonus: -1.0, context: ['always'] },
      },
      COM: {
        name: 'Saudável',
        desc: 'Risco de lesão 30% menor. Corpo preparado para o circuito.',
        effects: { strengthBonus: 0.5, context: ['always'] },
      },
      RAR: {
        name: 'Blindagem',
        desc: 'Risco de lesão 50% menor. Temporada completa quase garantida.',
        effects: { strengthBonus: 1.2, staminaMult: 1.10, context: ['always'] },
      },
      LEN: {
        name: 'Corpo de Aço',
        desc: 'Lesões raríssimas. Carreira longa e saudável. Corpo que não falha.',
        effects: { strengthBonus: 2.0, staminaMult: 1.20, context: ['always'] },
      },
    },
  },

  EXPLOSAO_INICIAL: {
    id: 'EXPLOSAO_INICIAL',
    name: 'Explosão Inicial',
    section: 'physical',
    tiers: {
      NEG: {
        name: 'Começo Lento',
        desc: 'Primeiro game de cada set: -15%. Demora para entrar no ritmo.',
        effects: { strengthBonus: -1.5, context: ['firstGame'] },
      },
      COM: {
        name: 'Largada Forte',
        desc: 'Primeiro game de cada set: +12%. Entra explosivo.',
        effects: { strengthBonus: 1.5, context: ['firstGame'] },
      },
      RAR: {
        name: 'Explosão Inicial',
        desc: 'Primeiro game de cada set: +22%. Adversários não reagem a tempo.',
        effects: { strengthBonus: 2.5, opponentDebuff: 0.06, context: ['firstGame'] },
      },
      LEN: {
        name: 'Míssil na Largada',
        desc: 'Primeiro game: +35%. A cada set, mesma explosão devastadora.',
        effects: { strengthBonus: 4.0, opponentDebuff: 0.12, context: ['firstGame'] },
      },
    },
  },

  STARTER_NATO: {
    id: 'STARTER_NATO',
    name: 'Starter Nato',
    section: 'clutch',
    tiers: {
      NEG: {
        name: 'Entra Frio',
        desc: 'Primeiros games e início de set: demora a entrar no ritmo.',
        effects: { strengthBonus: -1.4, errorMult: 1.12, context: ['firstGame', 'firstSet'] },
      },
      COM: {
        name: 'Starter Nato',
        desc: 'Chega ligado desde os primeiros games e tenta morder cedo.',
        effects: { strengthBonus: 1.2, clutchMult: 1.08, context: ['firstGame', 'firstSet'] },
      },
      RAR: {
        name: 'Starter Nato',
        desc: 'Abre partidas ditando o ritmo. O adversário demora a respirar.',
        effects: { strengthBonus: 2.1, clutchMult: 1.14, opponentDebuff: 0.04, context: ['firstGame', 'firstSet'] },
      },
      LEN: {
        name: 'Primeiro Soco',
        desc: 'Entrada devastadora. O rival quase sempre começa atrás.',
        effects: { strengthBonus: 3.2, clutchMult: 1.20, opponentDebuff: 0.08, context: ['firstGame', 'firstSet'] },
      },
    },
  },

  GIGANTE_CACADOR: {
    id: 'GIGANTE_CACADOR',
    name: 'Gigante Cacador',
    section: 'clutch',
    tiers: {
      NEG: {
        name: 'Apequena Contra Gigantes',
        desc: 'Contra favoritos e top seeds, tende a jogar encolhido.',
        effects: { strengthBonus: -1.6, clutchMult: 0.88, context: ['vsTopSeed', 'underdog'] },
      },
      COM: {
        name: 'Gigante Cacador',
        desc: 'Gosta do papel de zebra e cresce contra jogadores maiores.',
        effects: { strengthBonus: 1.4, clutchMult: 1.10, context: ['vsTopSeed', 'underdog'] },
      },
      RAR: {
        name: 'Gigante Cacador',
        desc: 'Joga solto contra a elite e transforma medo em energia.',
        effects: { strengthBonus: 2.3, clutchMult: 1.18, opponentDebuff: 0.05, context: ['vsTopSeed', 'underdog'] },
      },
      LEN: {
        name: 'Matador de Favoritos',
        desc: 'Quanto maior o palco e o favorito, mais esse jogador acredita.',
        effects: { strengthBonus: 3.4, clutchMult: 1.24, opponentDebuff: 0.09, context: ['vsTopSeed', 'underdog'] },
      },
    },
  },

  FAVORITO_ANSIOSO: {
    id: 'FAVORITO_ANSIOSO',
    name: 'Favorito Ansioso',
    section: 'clutch',
    tiers: {
      NEG: {
        name: 'Favorito Ansioso',
        desc: 'Quando deveria controlar o jogo, aperta demais e erra o timing.',
        effects: { strengthBonus: -1.4, errorMult: 1.16, context: ['heavyFavorite', 'importantMatch'] },
      },
      COM: {
        name: 'Controla a Pressao',
        desc: 'Aceita o peso do favoritismo sem perder a clareza.',
        effects: { strengthBonus: 1.1, clutchMult: 1.08, context: ['heavyFavorite', 'importantMatch'] },
      },
      RAR: {
        name: 'Controla a Pressao',
        desc: 'Quando é favorito, joga com frieza quase administrativa.',
        effects: { strengthBonus: 2.0, clutchMult: 1.14, context: ['heavyFavorite', 'importantMatch'] },
      },
      LEN: {
        name: 'Ditador de Chave',
        desc: 'Favoritismo não pesa; intimida. O jogo passa a girar ao redor dele.',
        effects: { strengthBonus: 3.1, clutchMult: 1.18, opponentDebuff: 0.07, context: ['heavyFavorite', 'importantMatch'] },
      },
    },
  },

  PREDADOR_SEGUNDO_SAQUE: {
    id: 'PREDADOR_SEGUNDO_SAQUE',
    name: 'Predador do 2o Saque',
    section: 'strokes',
    tiers: {
      NEG: {
        name: 'Passivo no 2o Saque',
        desc: 'Mesmo quando o segundo saque pede agressão, hesita e deixa o ponto escapar.',
        effects: { strengthBonus: -1.2, context: ['secondServe'] },
      },
      COM: {
        name: 'Predador do 2o Saque',
        desc: 'Lê bem segundos saques atacáveis e assume a quadra cedo.',
        effects: { strengthBonus: 1.3, clutchMult: 1.06, context: ['secondServe'] },
      },
      RAR: {
        name: 'Predador do 2o Saque',
        desc: 'Faz o sacador temer o segundo serviço. Entra para machucar.',
        effects: { strengthBonus: 2.2, opponentDebuff: 0.05, context: ['secondServe'] },
      },
      LEN: {
        name: 'Cacador de Servico',
        desc: 'Segundo saque contra ele parece convite para sofrer.',
        effects: { strengthBonus: 3.2, clutchMult: 1.12, opponentDebuff: 0.08, context: ['secondServe'] },
      },
    },
  },

  FINAIS_FRAGEIS: {
    id: 'FINAIS_FRAGEIS',
    name: 'Finais Frageis',
    section: 'clutch',
    tiers: {
      NEG: {
        name: 'Finais Frageis',
        desc: 'Grandes rodadas trazem tensão ruim e punem sua execução.',
        effects: { strengthBonus: -1.5, clutchMult: 0.86, context: ['quarterFinal+', 'importantMatch'] },
      },
      COM: {
        name: 'Aguenta o Palco',
        desc: 'Não se esconde nas fases grandes. Sustenta o nível.',
        effects: { strengthBonus: 1.1, clutchMult: 1.08, context: ['quarterFinal+', 'importantMatch'] },
      },
      RAR: {
        name: 'Aguenta o Palco',
        desc: 'Joga quartas, semis e finais com maturidade incomum.',
        effects: { strengthBonus: 2.0, clutchMult: 1.14, context: ['quarterFinal+', 'importantMatch'] },
      },
      LEN: {
        name: 'Palco e Casa',
        desc: 'O brilho do torneio grande parece aumentar seu repertório.',
        effects: { strengthBonus: 3.0, clutchMult: 1.20, opponentDebuff: 0.06, context: ['quarterFinal+', 'importantMatch'] },
      },
    },
  },

  MARATONISTA: {
    id: 'MARATONISTA',
    name: 'Maratonista',
    section: 'physical',
    tiers: {
      NEG: {
        name: 'Perde Gasolina',
        desc: 'Rallies longos e jogos extensos drenam mais do que deveriam.',
        effects: { strengthBonus: -1.2, staminaMult: 0.88, context: ['longRally', 'longMatch'] },
      },
      COM: {
        name: 'Maratonista',
        desc: 'Quanto mais a partida alonga, mais confortável se sente.',
        effects: { strengthBonus: 1.2, staminaMult: 1.08, context: ['longRally', 'longMatch'] },
      },
      RAR: {
        name: 'Maratonista',
        desc: 'Adora partidas profundas. O desgaste tende a favorecer seu lado.',
        effects: { strengthBonus: 2.1, staminaMult: 1.14, context: ['longRally', 'longMatch'] },
      },
      LEN: {
        name: 'Pulmao de Aco',
        desc: 'Nos rallies longos, joga como se o relógio estivesse a seu favor.',
        effects: { strengthBonus: 3.0, staminaMult: 1.20, opponentDebuff: 0.05, context: ['longRally', 'longMatch'] },
      },
    },
  },

}; // fim TRAIT_CATALOG

// ═══════════════════════════════════════════════════════════════════
// POOLS POR SEÇÃO (para sorteio temático)
// ═══════════════════════════════════════════════════════════════════

const TRAIT_POOLS = {
  clutch:      ['TIEBREAK_KILLER','MP_SAVER','QUINTO_SET','DECISIVO','INSTINTO_SLAM','VIRADISTA','FENIX','LEAO_ENCURRALADO','ATRITO_RALLY','GUERREIRO','AVALANCHE','STARTER_NATO','GIGANTE_CACADOR','FAVORITO_ANSIOSO','FINAIS_FRAGEIS'],
  serve:       ['IMPLACAVEL_SERV','REI_QUADRA','SANGUE_QUENTE','DESTRUIDOR_MORAL','CANHAO_SAQUE','PRECISAO_CIRURGICA','SEGUNDO_SAQUE_ARMA','KICK_MASTER','DF_ZERO'],
  strokes:     ['FH_ASSASSINO','BH_FERRO','RETRIEVER_ETERNO','CONTRA_ATAQUE','BOLA_PESADA','PREDADOR_SEGUNDO_SAQUE'],
  format:      ['ESPECIALISTA_BO5','CAMPEAO_TB','RELOGIO_BIOLOGICO','TERCEIRO_SET'],
  surface:     ['REI_SAIBRO','MAGO_GRAMA','HARDCOURT_NATIVO','INDOOR_SPEC','ALL_SURFACE'],
  tournament:  ['CACADOR_GS','ESPECIALISTA_KO','REI_DRAW','CACADOR_SEEDS'],
  legacy:      ['RESSURGIMENTO','MEMORIA_FOTOGRAFICA','PSICOLOGICO','ESPECIALISTA_REVANCHE','RIVAL_ETERNO'],
  development: ['SUPERPRODIGIO','DIAMANTE_BRUTO','VETERANO_ETERNO','LATE_BLOOMER','BLINDAGEM_CARREIRA'],
  stability:   ['INERCIAL','RECUPERACAO_RAPIDA','PICO_ADRENALINA','BASE_SOLIDA','BOLA_DE_NEVE','MAQUINA','INQUEBRAVEL','ESPECIALISTA_SERIE','VOLATILIDADE_CALC'],
  physical:    ['IRON_LEGS','RECUPERACAO_FISICA','BLINDAGEM_LESAO','EXPLOSAO_INICIAL','MARATONISTA'],
};

// Todos os IDs de traits agrupados
export const ALL_TRAIT_IDS = Object.values(TRAIT_POOLS).flat();

const TIER_PRIORITY = { NEG: 0, COM: 1, RAR: 2, LEN: 3 };
const DNA_SLOT_TARGETS = {
  FRACO:       { positive: 1, negative: 1, maxTotal: 2 },
  NORMAL:      { positive: 2, negative: 1, maxTotal: 3 },
  BOM:         { positive: 2, negative: 1, maxTotal: 3 },
  ALTO:        { positive: 3, negative: 1, maxTotal: 4 },
  EXCEPCIONAL: { positive: 3, negative: 1, maxTotal: 4 },
  GERACIONAL:  { positive: 4, negative: 1, maxTotal: 5 },
};

const TRAIT_IDENTITY_POOLS = {
  BIG_SRV:   ['CANHAO_SAQUE', 'PRECISAO_CIRURGICA', 'IMPLACAVEL_SERV', 'SEGUNDO_SAQUE_ARMA'],
  ALL_CRT:   ['ALL_SURFACE', 'BASE_SOLIDA', 'DECISIVO', 'GUERREIRO'],
  DEFENSIVE: ['RETRIEVER_ETERNO', 'CONTRA_ATAQUE', 'IRON_LEGS', 'BASE_SOLIDA', 'MARATONISTA'],
  AGGRESSIVE:['FH_ASSASSINO', 'BOLA_PESADA', 'PICO_ADRENALINA', 'AVALANCHE'],
  VOLATILE:  ['SANGUE_QUENTE', 'PICO_ADRENALINA', 'FH_ASSASSINO'],
  TACTICAL:  ['MEMORIA_FOTOGRAFICA', 'ESPECIALISTA_REVANCHE', 'BASE_SOLIDA', 'PSICOLOGICO'],
};

const UNIVERSAL_NEGATIVE_POOL = ['DECISIVO', 'MP_SAVER', 'TIEBREAK_KILLER', 'FINAIS_FRAGEIS', 'FAVORITO_ANSIOSO', 'EXPLOSAO_INICIAL', 'MARATONISTA'];
const MILESTONE_TRAIT_POOLS = {
  PRIMEIRA_VITORIA: ['GUERREIRO', 'BASE_SOLIDA', 'STARTER_NATO', 'DIAMANTE_BRUTO'],
  PRIMEIRA_FINAL: ['DECISIVO', 'PSICOLOGICO', 'INQUEBRAVEL', 'GIGANTE_CACADOR'],
  PRIMEIRO_TITULO: ['ALL_SURFACE', 'AVALANCHE', 'REI_DRAW', 'ESPECIALISTA_KO'],
  PRIMEIRO_GRAND_SLAM: ['INSTINTO_SLAM', 'ESPECIALISTA_BO5', 'REI_QUADRA', 'INQUEBRAVEL'],
  PICO_ATINGIDO: ['LATE_BLOOMER', 'SUPERPRODIGIO', 'MEMORIA_FOTOGRAFICA', 'ALL_SURFACE'],
};
const TRAIT_FAMILY_BY_SECTION = {
  clutch: 'DNA',
  serve: 'DNA',
  strokes: 'TENDENCIA',
  format: 'LEGADO',
  surface: 'LEGADO',
  tournament: 'LEGADO',
  legacy: 'LEGADO',
  development: 'DNA',
  stability: 'TENDENCIA',
  physical: 'CICATRIZ',
};

// ═══════════════════════════════════════════════════════════════════
// SISTEMA DE MILESTONES (Marcos de carreira)
// ═══════════════════════════════════════════════════════════════════

export const MILESTONES = {
  PRIMEIRA_VITORIA: {
    id: 'PRIMEIRA_VITORIA',
    name: 'Primeira Vitória no Circuito',
    desc: 'Primeiro resultado positivo — pool COM desbloqueado',
    slot: 1,
    check: (stats) => (stats.totalWins ?? 0) >= 1,
  },
  PRIMEIRA_FINAL: {
    id: 'PRIMEIRA_FINAL',
    name: 'Primeira Final',
    desc: 'Chegou à decisão de qualquer torneio',
    slot: 2,
    check: (stats) => (stats.finals ?? 0) >= 1,
  },
  PRIMEIRO_TITULO: {
    id: 'PRIMEIRO_TITULO',
    name: 'Primeiro Título',
    desc: 'Conquista o primeiro torneio — pool RAR liberado (se DNA ≥ 60)',
    slot: 3,
    check: (stats) => (stats.titles ?? 0) >= 1,
  },
  PRIMEIRO_GRAND_SLAM: {
    id: 'PRIMEIRO_GRAND_SLAM',
    name: 'Primeiro Grand Slam',
    desc: 'Conquista um GS — pool LEN liberado (se DNA ≥ 90)',
    slot: 4,
    check: (stats) => (stats.grandSlamTitles ?? 0) >= 1,
  },
  PICO_ATINGIDO: {
    id: 'PICO_ATINGIDO',
    name: 'Pico Atingido',
    desc: 'Atingir o pico de potencial — pool ALL se DNA permitir',
    slot: 5,
    check: (stats, player) => stats.reachedPeak === true,
  },
};

// ═══════════════════════════════════════════════════════════════════
// HELPERS INTERNOS
// ═══════════════════════════════════════════════════════════════════

function rng01(seed) {
  // Se seed fornecido, usa; senão, Math.random()
  return seed !== undefined ? seed : Math.random();
}

function pickFrom(arr, randomFn = Math.random) {
  return arr[Math.floor(randomFn() * arr.length)];
}

function pickFromWeighted(items, randomFn = Math.random) {
  const total = items.reduce((s, i) => s + (i.weight ?? 1), 0);
  let r = randomFn() * total;
  for (const item of items) {
    r -= item.weight ?? 1;
    if (r <= 0) return item;
  }
  return items[items.length - 1];
}

/** Verifica se dois traits são mutex */
function areMutex(idA, idB) {
  return (MUTEX_MAP[idA] ?? []).includes(idB);
}

/** Verifica se o conjunto de traits tem conflito com um candidato */
function hasConflict(existing, candidate) {
  return existing.some(e => areMutex(e, candidate));
}

function getAttr(player, ...keys) {
  const attrs = player?.attrs ?? {};
  for (const key of keys) {
    const value = attrs?.[key];
    if (typeof value === 'number' && Number.isFinite(value)) return value;
  }
  return null;
}

function getPlayerAgeEstimate(player) {
  return player?.age ?? player?._age ?? null;
}

function inferIdentityBuckets(player) {
  const styleId = String(player?.styleId ?? '').toUpperCase();
  const buckets = [];
  if (styleId.includes('BIG') || styleId.includes('SRV')) buckets.push('BIG_SRV');
  if (styleId.includes('ALL')) buckets.push('ALL_CRT');
  if (styleId.includes('DEF')) buckets.push('DEFENSIVE');
  if (styleId.includes('AGG')) buckets.push('AGGRESSIVE');
  if (styleId.includes('VOL')) buckets.push('VOLATILE');
  if (styleId.includes('TACT')) buckets.push('TACTICAL');
  if (!buckets.length) buckets.push('ALL_CRT');
  return buckets;
}

function inferTraitFamily(slot, def) {
  if (slot?.family) return slot.family;
  if (slot?.origin === 'legacy' || slot?.unlockedVia === 'milestone' || def?.section === 'legacy' || def?.section === 'surface' || def?.section === 'tournament' || def?.section === 'format') {
    return 'LEGADO';
  }
  if (slot?.origin === 'scar' || slot?.tier === 'NEG' || slot?.resolvedViaSombra || def?.section === 'physical') {
    return 'CICATRIZ';
  }
  if (slot?.origin === 'tendency' || def?.section === 'strokes' || def?.section === 'stability') {
    return 'TENDENCIA';
  }
  return TRAIT_FAMILY_BY_SECTION[def?.section] ?? 'DNA';
}

function normalizeSlot(slot, def = TRAIT_CATALOG?.[slot?.traitId]) {
  return {
    ...slot,
    origin: slot?.origin ?? (slot?.unlockedVia === 'milestone' ? 'legacy' : (slot?.tier === 'NEG' ? 'scar' : 'dna')),
    family: inferTraitFamily(slot, def),
  };
}

function normalizeSlots(slots = []) {
  return slots
    .filter(slot => slot?.traitId && TRAIT_CATALOG[slot.traitId])
    .map(slot => normalizeSlot(slot))
    .sort((a, b) => {
      const famA = ['DNA', 'TENDENCIA', 'CICATRIZ', 'LEGADO'].indexOf(a.family);
      const famB = ['DNA', 'TENDENCIA', 'CICATRIZ', 'LEGADO'].indexOf(b.family);
      if (famA !== famB) return famA - famB;
      return (TIER_PRIORITY[b.tier] ?? 0) - (TIER_PRIORITY[a.tier] ?? 0);
    });
}

function buildWeightedCandidates(ids, existingIds, tier, origin, weightFn) {
  return ids
    .filter(id => !existingIds.includes(id) && !hasConflict(existingIds, id) && TRAIT_CATALOG[id]?.tiers?.[tier])
    .map(id => ({
      id,
      weight: Math.max(0.1, weightFn?.(id) ?? 1),
      tier,
      origin,
      family: inferTraitFamily({ tier, origin }, TRAIT_CATALOG[id]),
    }));
}

function inferPositiveTraitCandidates(player, tier, existingIds) {
  const serve = getAttr(player, 'saque', 'srv1Vel', 'srv1Spin');
  const mental = getAttr(player, 'mentalidade', 'regularidade', 'leitura');
  const explosao = getAttr(player, 'explosividade', 'velocidade');
  const resistencia = getAttr(player, 'resistencia');
  const fh = getAttr(player, 'fhPotencia', 'forehand', 'potencia');
  const bh = getAttr(player, 'bhControle', 'backhand', 'controle');
  const buckets = inferIdentityBuckets(player);

  const weighted = [];
  const pushPool = (ids, bonus = 1, origin = 'dna') => {
    weighted.push(...buildWeightedCandidates(ids, existingIds, tier, origin, (id) => {
      let weight = 1 + bonus;
      if (serve !== null && ['CANHAO_SAQUE', 'PRECISAO_CIRURGICA', 'IMPLACAVEL_SERV', 'SEGUNDO_SAQUE_ARMA', 'KICK_MASTER', 'DF_ZERO'].includes(id)) weight += Math.max(0, (serve - 72) / 10);
      if (mental !== null && ['DECISIVO', 'GUERREIRO', 'INQUEBRAVEL', 'PSICOLOGICO', 'TIEBREAK_KILLER', 'MP_SAVER'].includes(id)) weight += Math.max(0, (mental - 72) / 12);
      if (explosao !== null && ['PICO_ADRENALINA', 'EXPLOSAO_INICIAL', 'STARTER_NATO', 'AVALANCHE'].includes(id)) weight += Math.max(0, (explosao - 72) / 14);
      if (resistencia !== null && ['IRON_LEGS', 'RECUPERACAO_FISICA', 'MARATONISTA', 'RETRIEVER_ETERNO'].includes(id)) weight += Math.max(0, (resistencia - 72) / 12);
      if (fh !== null && ['FH_ASSASSINO', 'BOLA_PESADA'].includes(id)) weight += Math.max(0, (fh - 74) / 12);
      if (bh !== null && ['BH_FERRO', 'BASE_SOLIDA', 'MEMORIA_FOTOGRAFICA'].includes(id)) weight += Math.max(0, (bh - 74) / 12);
      return weight;
    }));
  };

  for (const bucket of buckets) pushPool(TRAIT_IDENTITY_POOLS[bucket] ?? [], 1.4, 'dna');
  pushPool(TRAIT_POOLS.clutch, 0.7, 'dna');
  pushPool(TRAIT_POOLS.stability, 0.6, 'tendency');
  pushPool(TRAIT_POOLS.strokes, 0.5, 'tendency');
  pushPool(TRAIT_POOLS.surface, 0.25, 'legacy');
  return weighted;
}

function inferNegativeTraitCandidates(player, existingIds) {
  const serve = getAttr(player, 'saque', 'srv1Vel');
  const mental = getAttr(player, 'mentalidade', 'regularidade', 'leitura');
  const resistencia = getAttr(player, 'resistencia', 'explosividade');
  const age = getPlayerAgeEstimate(player);
  const styleId = String(player?.styleId ?? '').toUpperCase();

  return buildWeightedCandidates([...UNIVERSAL_NEGATIVE_POOL, ...TRAIT_POOLS.physical, ...TRAIT_POOLS.clutch], existingIds, 'NEG', 'scar', (id) => {
    let weight = 1;
    if (mental !== null && mental < 68 && ['DECISIVO', 'MP_SAVER', 'TIEBREAK_KILLER', 'FINAIS_FRAGEIS', 'FAVORITO_ANSIOSO'].includes(id)) weight += (70 - mental) / 8;
    if (resistencia !== null && resistencia < 68 && ['MARATONISTA', 'IRON_LEGS', 'RECUPERACAO_FISICA'].includes(id)) weight += (70 - resistencia) / 10;
    if (serve !== null && serve < 66 && ['DF_ZERO', 'PRECISAO_CIRURGICA', 'SEGUNDO_SAQUE_ARMA'].includes(id)) weight += 1.2;
    if (styleId.includes('BIG') && ['DECISIVO', 'FAVORITO_ANSIOSO'].includes(id)) weight += 0.6;
    if (age !== null && age >= 30 && ['RELOGIO_BIOLOGICO', 'MARATONISTA'].includes(id)) weight += 0.9;
    return weight;
  });
}

function pickWeightedSlot(candidates, randomFn = Math.random) {
  if (!candidates.length) return null;
  const picked = pickFromWeighted(candidates, randomFn);
  return picked ? { tier: picked.tier, traitId: picked.id, origin: picked.origin, family: picked.family } : null;
}

function inferMilestoneTier(player, milestoneId) {
  const score = player?.dna?.score ?? 50;
  if (milestoneId === 'PRIMEIRO_GRAND_SLAM') return score >= 90 ? 'LEN' : 'RAR';
  if (milestoneId === 'PICO_ATINGIDO') return score >= 75 ? 'RAR' : 'COM';
  if (milestoneId === 'PRIMEIRO_TITULO') return score >= 60 ? 'RAR' : 'COM';
  return 'COM';
}

function maybeAwardEventTrait(player, careerStats, randomFn = Math.random) {
  const existingIds = player.dna.slots.map(s => s.traitId);
  const metric = player.dna.metrics ?? {};
  const eventPools = [];

  if ((careerStats?.grandSlamTitles ?? 0) >= 1) {
    eventPools.push({ ids: ['INSTINTO_SLAM', 'ESPECIALISTA_BO5', 'INQUEBRAVEL'], tier: player.dna.score >= 90 ? 'LEN' : 'RAR' });
  }
  if ((metric.tiebreaksWon ?? 0) >= 10) {
    eventPools.push({ ids: ['TIEBREAK_KILLER', 'DECISIVO'], tier: 'RAR' });
  }
  if ((metric.matchPointsSaved ?? 0) >= 4) {
    eventPools.push({ ids: ['MP_SAVER', 'FENIX'], tier: 'RAR' });
  }
  if ((careerStats?.titles ?? 0) >= 3) {
    eventPools.push({ ids: ['AVALANCHE', 'ALL_SURFACE', 'REI_DRAW'], tier: 'COM' });
  }

  for (const pool of eventPools) {
    const candidates = buildWeightedCandidates(pool.ids, existingIds, pool.tier, 'legacy', () => 1.5);
    const slot = pickWeightedSlot(candidates, randomFn);
    if (slot) {
      player.dna.slots.push(slot);
      player.dna.history = [...(player.dna.history ?? []), { type: 'EVENT_TRAIT', traitId: slot.traitId, tier: slot.tier }];
      return slot;
    }
  }
  return null;
}

export function collectTraitContexts(player, env = {}) {
  const contexts = new Set(['always']);
  const surface = env.surface ?? env.courtSurface ?? env.courtMeta?.surface;
  if (surface) contexts.add(`surface:${String(surface).toUpperCase()}`);

  if (env.bestOf === 5) contexts.add('bestOf5');
  if (env.inTiebreak) contexts.add('tiebreak');
  if (env.totalSets === 4 && env.bestOf === 5) contexts.add('fifthSet');
  if (env.totalSets === 2 && env.bestOf === 3) contexts.add('thirdSet');
  if (env.totalSets === 0) contexts.add('firstSet');
  if (env.playerSets === 0 && env.oppSets === 2) contexts.add('down2Sets');
  if ((env.playerGames ?? 0) - (env.oppGames ?? 0) >= 3) contexts.add('bigLead');
  if (env.rally >= 8) contexts.add('longRally');
  if (env.longMatch || env.rally >= 15) contexts.add('longMatch');
  if (env.firstGame || ((env.playerGames ?? 0) === 0 && (env.oppGames ?? 0) === 0)) contexts.add('firstGame');
  if (env.isSlam) contexts.add('grandSlam');
  if (env.isServing) contexts.add('serve');
  if (env.isSecondServe) contexts.add('secondServe');
  if (env.isBreakPoint) contexts.add('breakPoint');
  if (env.isMatchPoint || env.isDefendingMatchPoint) contexts.add('matchPoint');
  if (env.isSetPoint || env.isMatchPoint || env.isBreakPoint || env.isGamePoint) contexts.add('decisiveMoment');
  if (env.pressure || env.isBreakPoint || env.isDefendingBreakPoint || env.isSetPoint || env.isMatchPoint || env.isDefendingMatchPoint) contexts.add('pressure');
  if (env.roundLabel) {
    const r = env.roundLabel;
    if (['F', 'SF', 'QF'].includes(r)) contexts.add('knockoutRound');
    if (['F', 'SF', 'QF'].includes(r)) contexts.add('quarterFinal+');
    if (r === 'F') contexts.add('importantMatch');
  }

  const age = env.age ?? getPlayerAgeEstimate(player);
  const peakAge = env.peakAge ?? player?.peakAge ?? player?._peakAge ?? null;
  if (age !== null) {
    if (age < 21) contexts.add('under21');
    if (age < 22) contexts.add('earlyCareer');
    if (age >= 21 && age < 27) contexts.add('midCareer');
    if (age >= 27 && age < 31) contexts.add('lateCareer');
    if (age >= 31) contexts.add('over30');
    if (age >= 33) contexts.add('decline');
  }
  if (peakAge !== null && age !== null && Math.abs(age - peakAge) <= 2) contexts.add('nearPeak');

  const rankPos = env.rankPos ?? player?.rankPosition ?? player?._rankPosition ?? null;
  const oppRank = env.oppRank ?? null;
  if (rankPos !== null) {
    if (rankPos <= 5) contexts.add('topSeed');
    if (rankPos >= 50) contexts.add('underdog');
  }
  if (rankPos !== null && oppRank !== null) {
    if (oppRank <= 5 && rankPos > 20) contexts.add('vsTopSeed');
    if (rankPos <= 5 && oppRank > 20) contexts.add('heavyFavorite');
  }

  if (Array.isArray(env.extraContexts)) {
    for (const ctx of env.extraContexts) contexts.add(ctx);
  }

  return [...contexts];
}

// ═══════════════════════════════════════════════════════════════════
// INIT — cria objeto dna no player
// ═══════════════════════════════════════════════════════════════════

/**
 * Inicializa o objeto `dna` em um jogador.
 * Deve ser chamado ao criar um jogador (newgen ou legacy migration).
 *
 * @param {object} player — deve ter .potential
 * @param {Function} [randomFn] — função RNG (padrão: Math.random)
 * @returns {object} — retorna o player mutado in-place
 */
export function initPlayerDNA(player, randomFn = Math.random) {
  if (player.dna) return player; // já inicializado

  const score = dnaScoreFromPotential(player.potential ?? 'COMUM', randomFn);
  const config = getDnaConfig(score);

  player.dna = {
    score,
    tier: config.tier,

    // Slots ativos: cada slot tem { tier: 'COM'|'RAR'|'LEN'|'NEG', traitId: string|null }
    slots: [],

    // Marcos de carreira desbloqueados
    milestones: [],

    // Sombras: traits NEG que podem ser curadas
    // [{ traitId, progress, target, metric, resolved }]
    sombras: [],

    // Histórico para métricas de sombra
    metrics: {},

    // Registro editorial do DNA
    history: [],
    tags: [],
  };

  return player;
}

// ═══════════════════════════════════════════════════════════════════
// ASSIGN TRAITS — distribui traits iniciais
// ═══════════════════════════════════════════════════════════════════

/**
 * Atribui traits iniciais ao jogador com base no DNA score.
 * Preenche player.dna.slots com { tier, traitId }.
 *
 * Deve ser chamado após initPlayerDNA.
 *
 * @param {object} player
 * @param {Function} [randomFn]
 */
export function assignTraits(player, randomFn = Math.random) {
  if (!player.dna) initPlayerDNA(player, randomFn);

  const target = DNA_SLOT_TARGETS[player.dna.tier] ?? DNA_SLOT_TARGETS.NORMAL;
  const assignedIds = [];
  const slots = [];
  const coachData = player.coach
    ? { philosophy: player.coach.philosophy, specialtySurface: player.coach.specialtySurface ?? null }
    : null;
  player.dna.sombras = [];

  const addSlot = (slot) => {
    if (!slot || assignedIds.includes(slot.traitId) || hasConflict(assignedIds, slot.traitId)) return false;
    const normalized = normalizeSlot(slot);
    slots.push(normalized);
    assignedIds.push(normalized.traitId);
    const traitDef = TRAIT_CATALOG[normalized.traitId];
    if (normalized.tier === 'NEG' && traitDef?.sombra) {
      player.dna.sombras.push({
        traitId: normalized.traitId,
        progress: 0,
        target: traitDef.sombra.target,
        metric: traitDef.sombra.metric,
        challenge: traitDef.sombra.challenge,
        resolved: false,
      });
    }
    return true;
  };

  const positiveTiers = [];
  if (target.positive >= 1) positiveTiers.push('COM');
  if (target.positive >= 2) positiveTiers.push('COM');
  if (target.positive >= 3) positiveTiers.push(player.dna.score >= 75 ? 'RAR' : 'COM');
  if (target.positive >= 4) positiveTiers.push(player.dna.score >= 90 ? 'LEN' : 'RAR');

  for (const tier of positiveTiers) {
    const baseCandidates = inferPositiveTraitCandidates(player, tier, assignedIds);
    const weightedPool = buildCoachWeightedPool(baseCandidates.map(c => c.id), coachData);
    const candidates = baseCandidates.map(c => ({
      ...c,
      weight: c.weight + weightedPool.filter(id => id === c.id).length * 0.25,
    }));
    addSlot(pickWeightedSlot(candidates, randomFn));
  }

  for (let i = 0; i < target.negative; i++) {
    addSlot(pickWeightedSlot(inferNegativeTraitCandidates(player, assignedIds), randomFn));
  }

  player.dna.slots = normalizeSlots(slots).slice(0, target.maxTotal);
  player.dna.history = [
    ...(player.dna.history ?? []),
    {
      type: 'DNA_INIT',
      total: player.dna.slots.length,
      positives: player.dna.slots.filter(s => s.tier !== 'NEG').length,
      negatives: player.dna.slots.filter(s => s.tier === 'NEG').length,
    },
  ];
  return player;
}

// ═══════════════════════════════════════════════════════════════════
// GET TRAIT EFFECTS — retorna modificadores para um contexto
// ═══════════════════════════════════════════════════════════════════

/**
 * Contextos possíveis (usar como string no parâmetro ctx.type):
 *   'always'            — sempre aplicado
 *   'tiebreak'          — dentro de tiebreak
 *   'matchPoint'        — enfrentando match point
 *   'fifthSet'          — no 5º set (BO5)
 *   'thirdSet'          — no 3º set (BO3)
 *   'firstSet'          — primeiro set da partida
 *   'decisiveMoment'    — break point ou game point
 *   'grandSlam'         — partida em Grand Slam
 *   'bestOf5'           — partida em formato BO5
 *   'down2Sets'         — perdendo 2-0 em sets
 *   'bigLead'           — liderando por 3+ games no set
 *   'longMatch'         — partida com 2h ou mais
 *   'longRally'         — rally de 8+ bolas
 *   'serve'             — contexto de saque
 *   'secondServe'       — contexto de segundo saque
 *   'breakPoint'        — ponto de break (no saque)
 *   'pressure'          — situação de pressão geral
 *   'topSeed'           — jogando como cabeça 1 ou 2
 *   'underdog'          — jogando como azarão claro
 *   'heavyFavorite'     — jogando como favorito absoluto
 *   'vsTopSeed'         — enfrentando top seed
 *   'vsRival'           — enfrentando rival principal
 *   'vsDefeated'        — enfrentando alguém já derrotado
 *   'vsConqueror'       — enfrentando alguém que já ganhou de você
 *   'rematch'           — revancha (já se enfrentaram)
 *   'rematchLoss'       — revancha após derrota
 *   'afterLoss'         — partida após derrota recente
 *   'afterBagel'        — set seguinte após bagel/breadstick
 *   'afterBreak'        — game seguinte após break
 *   'afterErrors'       — contexto de erros acumulados
 *   'afterWinner'       — após winner consecutivo
 *   'afterWinStreak'    — após sequência de vitórias
 *   'afterConsecutiveLosses' — após 2+ derrotas seguidas
 *   'afterFrustration'  — após ponto frustrante
 *   'afterControversy'  — após ponto polêmico
 *   'afterDominantGame' — após game convincente
 *   'hotMoment'         — momento emocional
 *   'firstGame'         — primeiro game de cada set
 *   'forehand'          — uso de forehand
 *   'backhand'          — uso de backhand
 *   'defense'           — modo defensivo
 *   'rally'             — contexto de rally
 *   'counterAttack'     — contra-ataque
 *   'knockoutRound'     — rodada de eliminatória
 *   'quarterFinal+'     — quartas de final ou mais
 *   'importantMatch'    — partida relevante para ranking
 *   'easierDraw'        — chaveamento favorável
 *   'toughDraw'         — chaveamento difícil
 *   'betweenSets'       — intervalo entre sets
 *   'adversity'         — adversidade de carreira
 *   'decline'           — fase de declínio
 *   'under21'           — menor de 21 anos
 *   'midCareer'         — meio de carreira
 *   'lateCareer'        — final de carreira
 *   'earlyCareer'       — início de carreira
 *   'over30'            — com 30+ anos
 *   'surface:CLAY'      — em saibro
 *   'surface:GRASS'     — em grama
 *   'surface:HARD'      — em hard court
 *   'surface:INDOOR'    — em indoor
 *
 * @param {object} player    — deve ter player.dna.slots
 * @param {object} ctx       — { type: string, ... extra context fields }
 * @returns {TraitEffects}   — { strengthBonus, clutchMult, errorMult, staminaMult, serveMult, opponentDebuff, formFloor }
 */
export function getTraitEffects(player, ctx) {
  const result = {
    strengthBonus: 0,
    clutchMult:    1.0,
    errorMult:     1.0,
    staminaMult:   1.0,
    serveMult:     1.0,
    opponentDebuff: 0,
    formFloor:     null,
  };

  if (!player.dna?.slots?.length) return result;
  const contextList = Array.isArray(ctx?.contexts)
    ? ctx.contexts
    : (ctx?.type ? [ctx.type] : collectTraitContexts(player, ctx ?? {}));
  const ctxSet = new Set(contextList.length ? contextList : ['always']);

  for (const slot of player.dna.slots) {
    const traitDef = TRAIT_CATALOG[slot.traitId];
    if (!traitDef) continue;

    const tierData = traitDef.tiers[slot.tier];
    if (!tierData?.effects) continue;

    const fx = tierData.effects;
    const fxCtx = fx.context ?? ['always'];

    // Verifica se o contexto é aplicável
    if (fxCtx.includes('never')) continue;
    const applies = fxCtx.some(c => c === 'always' || ctxSet.has(c));
    if (!applies) continue;

    // Aplica efeitos
    if (fx.strengthBonus)  result.strengthBonus  += fx.strengthBonus;
    if (fx.clutchMult)     result.clutchMult      *= fx.clutchMult;
    if (fx.errorMult)      result.errorMult       *= fx.errorMult;
    if (fx.staminaMult)    result.staminaMult     *= fx.staminaMult;
    if (fx.serveMult)      result.serveMult       *= fx.serveMult;
    if (fx.opponentDebuff) result.opponentDebuff  += fx.opponentDebuff;
    if (fx.formFloor) {
      // pior nível ganha
      const levels = ['BOA_FORMA', 'GRANDE_FORMA', 'IMPARAVEL'];
      const existing = result.formFloor ? levels.indexOf(result.formFloor) : -1;
      const candidate = levels.indexOf(fx.formFloor);
      if (candidate > existing) result.formFloor = fx.formFloor;
    }
  }

  return result;
}

/**
 * Versão simplificada para FastSimulation:
 * retorna apenas um bonus/malus de força (strengthBonus net)
 * e o opponentDebuff para aplicação direta ao score.
 *
 * @param {object}  player
 * @param {string}  surface  — 'CLAY'|'GRASS'|'HARD'|'INDOOR'
 * @param {string[]} contexts — contextos ativos adicionais
 * @returns {{ selfBonus: number, opponentDebuff: number }}
 */
export function getTraitStrengthMods(player, surface = 'HARD', contexts = []) {
  const allContexts = collectTraitContexts(player, { surface, extraContexts: contexts });
  let selfBonus = 0;
  let oppDebuff = 0;

  if (!player.dna?.slots?.length) return { selfBonus, opponentDebuff: oppDebuff };

  for (const slot of player.dna.slots) {
    const traitDef = TRAIT_CATALOG[slot.traitId];
    if (!traitDef) continue;

    const tierData = traitDef.tiers[slot.tier];
    if (!tierData?.effects) continue;

    const fx = tierData.effects;
    const fxCtx = fx.context ?? ['always'];
    if (fxCtx.includes('never')) continue;

    const applies = fxCtx.some(c => allContexts.includes(c));
    if (!applies) continue;

    selfBonus += fx.strengthBonus ?? 0;
    oppDebuff += fx.opponentDebuff ?? 0;
  }

  return { selfBonus, opponentDebuff: oppDebuff };
}

// ═══════════════════════════════════════════════════════════════════
// MILESTONES — desbloqueio de slots
// ═══════════════════════════════════════════════════════════════════

/**
 * Verifica e aplica marcos de carreira, desbloqueando novos slots de trait.
 *
 * @param {object} player
 * @param {object} careerStats — { totalWins, finals, titles, grandSlamTitles, reachedPeak, ... }
 * @param {Function} [randomFn]
 * @returns {string[]} — IDs de milestones recém-desbloqueados
 */
export function checkMilestones(player, careerStats, randomFn = Math.random) {
  if (!player.dna) return [];

  const newlyUnlocked = [];

  for (const [mid, milestone] of Object.entries(MILESTONES)) {
    if (player.dna.milestones.includes(mid)) continue;
    if (!milestone.check(careerStats, player)) continue;

    player.dna.milestones.push(mid);
    newlyUnlocked.push(mid);
    _unlockNewSlot(player, inferMilestoneTier(player, mid), randomFn, mid);
  }

  maybeAwardEventTrait(player, careerStats, randomFn);
  player.dna.slots = normalizeSlots(player.dna.slots);
  return newlyUnlocked;
}

function _unlockNewSlot(player, tier, randomFn, milestoneId = null) {
  const config = DNA_SLOT_TARGETS[player.dna.tier] ?? DNA_SLOT_TARGETS.NORMAL;
  if (player.dna.slots.length >= config.maxTotal) return;

  const existingIds = player.dna.slots.map(s => s.traitId);
  const pool = milestoneId ? (MILESTONE_TRAIT_POOLS[milestoneId] ?? []) : ALL_TRAIT_IDS;
  const candidates = buildWeightedCandidates(pool, existingIds, tier, milestoneId ? 'legacy' : 'dna', () => milestoneId ? 1.75 : 1);
  const slot = pickWeightedSlot(candidates, randomFn);
  if (!slot) return;
  player.dna.slots.push({ ...slot, unlockedVia: milestoneId ? 'milestone' : 'evolution' });
  player.dna.history = [...(player.dna.history ?? []), { type: 'MILESTONE_TRAIT', milestoneId, traitId: slot.traitId, tier: slot.tier }];
}

// ═══════════════════════════════════════════════════════════════════
// SOMBRA — progressão e resolução
// ═══════════════════════════════════════════════════════════════════

/**
 * Atualiza o progresso de sombras com base em uma métrica de carreira.
 * Quando o desafio é completado, converte o slot NEG para COM.
 *
 * @param {object} player
 * @param {string} metric   — ID da métrica (ex: 'tiebreaksWon')
 * @param {number} value    — valor atual da métrica
 * @returns {string[]}      — traitIds cujas sombras foram resolvidas
 */
// ═══════════════════════════════════════════════════════════════════
// COACHING SYSTEM — FASE 3: INFLUÊNCIA DO TÉCNICO NOS TRAITS
// ═══════════════════════════════════════════════════════════════════

/**
 * Traits cujo surgimento é favorecido pela filosofia do técnico.
 * Aplicado em assignTraits() quando o jogador tem técnico.
 *
 * Filosofia MENTAL: clutch, pressão, ressurgimento
 * Filosofia OFFENSIVE: saque, agressividade, golpes potentes
 * Filosofia DEFENSIVE: resistência, retriever, estabilidade
 * Filosofia SPECIALIST: traits de superfície
 * Filosofia COMPLETE: sem favorecimento — cresce tudo
 */
const COACH_FAVORED_TRAITS = {
  MENTAL: [
    'TIEBREAK_KILLER', 'MP_SAVER', 'QUINTO_SET', 'DECISIVO',
    'VIRADISTA', 'FENIX', 'PSICOLOGICO', 'GUERREIRO',
    'RESSURGIMENTO', 'INQUEBRAVEL', 'RECUPERACAO_RAPIDA',
  ],
  OFFENSIVE: [
    'CANHAO_SAQUE', 'IMPLACAVEL_SERV', 'DF_ZERO', 'PRECISAO_CIRURGICA',
    'FH_ASSASSINO', 'BOLA_PESADA', 'DESTRUIDOR_MORAL', 'AVALANCHE',
    'PICO_ADRENALINA', 'EXPLOSAO_INICIAL',
  ],
  DEFENSIVE: [
    'RETRIEVER_ETERNO', 'CONTRA_ATAQUE', 'IRON_LEGS', 'RECUPERACAO_FISICA',
    'MAQUINA', 'BASE_SOLIDA', 'GUERREIRO', 'ATRITO_RALLY', 'BLINDAGEM_LESAO',
    'INERCIAL',
  ],
  SPECIALIST: {
    CLAY:   ['REI_SAIBRO', 'ATRITO_RALLY', 'IRON_LEGS', 'BASE_SOLIDA'],
    GRASS:  ['MAGO_GRAMA', 'CANHAO_SAQUE', 'IMPLACAVEL_SERV', 'REI_QUADRA'],
    HARD:   ['HARDCOURT_NATIVO', 'FH_ASSASSINO', 'PRECISAO_CIRURGICA'],
    INDOOR: ['INDOOR_SPEC', 'CANHAO_SAQUE', 'PICO_ADRENALINA'],
  },
  COMPLETE: [], // sem favorecimento
};

/**
 * Sombras curada acelerada por coach MENTAL (2× mais rápida).
 * Inclui todas as sombras de natureza mental/clutch.
 */
const MENTAL_COACH_SOMBRA_METRICS = [
  'tiebreaksWon',       // TIEBREAK_KILLER
  'matchPointsSaved',   // MP_SAVER
  'fifthSetWins',       // QUINTO_SET
  'decisiveBreakPoints',// DECISIVO
  'grandSlamTitles',    // INSTINTO_SLAM
  'comebacks2Sets',     // VIRADISTA
  'semifinalReached',   // ESPECIALISTA_KO
];

/**
 * Ajusta o pool de traits candidatos baseado na filosofia do técnico.
 * Retorna novo array com weights modificados.
 * Chamado em assignTraits() se o jogador tiver técnico.
 *
 * @param {string[]} pool         — ids de traits candidatos
 * @param {object}   coachData    — { philosophy, specialtySurface }
 * @param {Function} randomFn
 * @returns {string[]}            — pool com duplicatas para simular pesos
 */
export function buildCoachWeightedPool(pool, coachData) {
  if (!coachData?.philosophy) return pool;

  let favored = [];
  if (coachData.philosophy === 'SPECIALIST' && coachData.specialtySurface) {
    favored = COACH_FAVORED_TRAITS.SPECIALIST[coachData.specialtySurface] ?? [];
  } else {
    favored = COACH_FAVORED_TRAITS[coachData.philosophy] ?? [];
  }

  if (favored.length === 0) return pool;

  // Duplicar os traits favorecidos no pool (2× mais chance de surgir)
  const weighted = [...pool];
  for (const id of pool) {
    if (favored.includes(id)) weighted.push(id); // +1 cópia = 2× peso
  }
  return weighted;
}

/**
 * Versão de progressSombra ciente do técnico.
 * Se o jogador tem coach MENTAL, as sombras de métrica mental progridem 2× mais rápido.
 *
 * @param {object}      player
 * @param {string}      metric
 * @param {number}      value
 * @param {object|null} coachData  — { philosophy } ou null
 * @returns {string[]}             — traitIds resolvidos
 */
export function progressSombraWithCoach(player, metric, value, coachData = null) {
  if (!player.dna?.sombras?.length) return [];

  const isMentalCoach = coachData?.philosophy === 'MENTAL';
  const resolved = [];

  for (const sombra of player.dna.sombras) {
    if (sombra.resolved) continue;
    if (sombra.metric !== metric) continue;

    // Coach MENTAL acelera sombras de métricas mentais: trata o progresso como 2×
    let effectiveValue = value;
    if (isMentalCoach && MENTAL_COACH_SOMBRA_METRICS.includes(metric)) {
      effectiveValue = value * 2;
    }

    sombra.progress = effectiveValue;

    if (effectiveValue >= sombra.target) {
      sombra.resolved = true;
      resolved.push(sombra.traitId);

      const slot = player.dna.slots.find(s => s.traitId === sombra.traitId && s.tier === 'NEG');
      if (slot) {
        slot.tier = 'COM';
        slot.resolvedViaSombra = true;
        slot.resolvedByMentalCoach = isMentalCoach || undefined;
        player.dna.history = [
          ...(player.dna.history ?? []),
          { type: 'SHADOW_RESOLVED', traitId: sombra.traitId, viaCoach: !!isMentalCoach },
        ];
      }
    }
  }

  return resolved;
}

export function progressSombra(player, metric, value) {
  if (!player.dna?.sombras?.length) return [];

  const resolved = [];

  for (const sombra of player.dna.sombras) {
    if (sombra.resolved) continue;
    if (sombra.metric !== metric) continue;

    sombra.progress = value;

    if (value >= sombra.target) {
      sombra.resolved = true;
      resolved.push(sombra.traitId);

      // Promove o slot NEG → COM
      const slot = player.dna.slots.find(s => s.traitId === sombra.traitId && s.tier === 'NEG');
      if (slot) {
        slot.tier = 'COM';
        slot.resolvedViaSombra = true;
        player.dna.history = [
          ...(player.dna.history ?? []),
          { type: 'SHADOW_RESOLVED', traitId: sombra.traitId, viaCoach: false },
        ];
      }
    }
  }

  return resolved;
}

/**
 * Registra uma métrica de carreira (incrementa contador).
 * @param {object} player
 * @param {string} metric
 * @param {number} [delta=1]
 */
export function recordMetric(player, metric, delta = 1) {
  if (!player.dna) return;
  player.dna.metrics[metric] = (player.dna.metrics[metric] ?? 0) + delta;
  player.dna.history = [...(player.dna.history ?? []), { type: 'METRIC', metric, value: player.dna.metrics[metric] }];

  // Verifica sombras automaticamente
  progressSombra(player, metric, player.dna.metrics[metric]);
}

// ═══════════════════════════════════════════════════════════════════
// UTILITÁRIOS
// ═══════════════════════════════════════════════════════════════════

/**
 * Retorna lista de slots com informações completas dos traits.
 * @param {object} player
 * @returns {Array<{ tier, traitId, name, desc, effects }>}
 */
export function getPlayerTraits(player) {
  if (!player.dna?.slots) return [];

  return normalizeSlots(player.dna.slots).map(slot => {
    const def = TRAIT_CATALOG[slot.traitId];
    if (!def) return { tier: slot.tier, traitId: slot.traitId, name: '?', desc: '?' };
    const tierData = def.tiers[slot.tier];
    return {
      tier: slot.tier,
      traitId: slot.traitId,
      name: tierData?.name ?? def.name,
      desc: tierData?.desc ?? '',
      effects: tierData?.effects ?? {},
      section: def.section,
      family: inferTraitFamily(slot, def),
      origin: slot.origin ?? null,
    };
  });
}

export function captureTraitSnapshot(player) {
  return getPlayerTraits(player).map(slot => ({
    traitId: slot.traitId,
    tier: slot.tier,
    name: slot.name,
    family: slot.family,
    origin: slot.origin ?? null,
  }));
}

export function diffTraitSnapshots(before = [], after = []) {
  const beforeMap = new Map(before.map(slot => [slot.traitId, slot]));
  const afterMap = new Map(after.map(slot => [slot.traitId, slot]));

  const gained = [];
  const lost = [];
  const evolved = [];
  const regressed = [];
  const healed = [];

  for (const [traitId, next] of afterMap.entries()) {
    const prev = beforeMap.get(traitId);
    if (!prev) {
      gained.push(next);
      continue;
    }
    if (prev.tier !== next.tier) {
      const prevPriority = TIER_PRIORITY[prev.tier] ?? 0;
      const nextPriority = TIER_PRIORITY[next.tier] ?? 0;
      const payload = { traitId, name: next.name, fromTier: prev.tier, toTier: next.tier, family: next.family, origin: next.origin };
      if (prev.tier === 'NEG' && next.tier !== 'NEG') healed.push(payload);
      else if (nextPriority > prevPriority) evolved.push(payload);
      else regressed.push(payload);
    }
  }

  for (const [traitId, prev] of beforeMap.entries()) {
    if (!afterMap.has(traitId)) lost.push(prev);
  }

  return { gained, lost, evolved, regressed, healed };
}

export function summarizeTraitDelta(delta, limit = 4) {
  const lines = [];
  for (const slot of delta.gained ?? []) lines.push(`ganhou ${slot.name}`);
  for (const slot of delta.healed ?? []) lines.push(`curou ${slot.name}`);
  for (const slot of delta.evolved ?? []) lines.push(`${slot.name} subiu ${slot.fromTier}→${slot.toTier}`);
  for (const slot of delta.regressed ?? []) lines.push(`${slot.name} caiu ${slot.fromTier}→${slot.toTier}`);
  for (const slot of delta.lost ?? []) lines.push(`perdeu ${slot.name}`);
  return lines.slice(0, limit);
}

/**
 * Retorna string legível com os traits do jogador (debug).
 */
export function describePlayerTraits(player) {
  if (!player.dna) return `${player.name || player.id}: sem DNA`;

  const lines = [
    `${player.name || player.id} | DNA ${player.dna.score} (${player.dna.tier})`,
  ];

  for (const slot of player.dna.slots) {
    const def = TRAIT_CATALOG[slot.traitId];
    const tierData = def?.tiers?.[slot.tier];
    const prefix = slot.tier === 'NEG' ? '⚠' : slot.tier === 'LEN' ? '✦' : slot.tier === 'RAR' ? '◆' : '◇';
    lines.push(`  ${prefix} [${slot.tier}] ${tierData?.name ?? slot.traitId}`);
    if (slot.resolvedViaSombra) lines.push(`       ↑ curado via sombra`);
  }

  if (player.dna.sombras.length) {
    lines.push('  Sombras:');
    for (const s of player.dna.sombras) {
      const status = s.resolved ? '✓' : `${s.progress}/${s.target}`;
      lines.push(`    [${status}] ${s.traitId}: ${s.challenge}`);
    }
  }

  return lines.join('\n');
}

/**
 * Migra um jogador legado (sem DNA) para o novo sistema.
 * @param {object} player
 * @param {Function} [randomFn]
 */
export function migratePlayerDNA(player, randomFn = Math.random) {
  if (player.dna) return player;
  initPlayerDNA(player, randomFn);
  assignTraits(player, randomFn);
  return player;
}

/**
 * Sanitiza slots de um jogador já existente que tenha ultrapassado o maxTotal.
 * Mantém todos os slots iniciais (sem 'unlockedVia') e trunca os de milestone que excedem o cap.
 */
export function sanitizeTraitSlots(player) {
  if (!player?.dna?.slots) return player;
  const config = DNA_SLOT_TARGETS[player.dna.tier] ?? DNA_SLOT_TARGETS.NORMAL;
  let slots = normalizeSlots(player.dna.slots);

  const negatives = slots.filter(s => s.tier === 'NEG');
  const positives = slots.filter(s => s.tier !== 'NEG');
  if (!negatives.length) {
    const neg = pickWeightedSlot(inferNegativeTraitCandidates(player, slots.map(s => s.traitId)));
    if (neg) {
      slots.push(normalizeSlot(neg));
      const traitDef = TRAIT_CATALOG[neg.traitId];
      if (traitDef?.sombra) {
        player.dna.sombras = [
          ...(player.dna.sombras ?? []),
          {
            traitId: neg.traitId,
            progress: 0,
            target: traitDef.sombra.target,
            metric: traitDef.sombra.metric,
            challenge: traitDef.sombra.challenge,
            resolved: false,
          },
        ];
      }
    }
  }

  slots = normalizeSlots(slots);
  const keepNeg = slots.filter(s => s.tier === 'NEG').slice(0, config.negative);
  const keepPos = slots.filter(s => s.tier !== 'NEG').slice(0, config.positive);
  player.dna.slots = normalizeSlots([...keepPos, ...keepNeg]).slice(0, config.maxTotal);
  return player;
}

/**
 * Versão tipada dos efeitos retornados por getTraitEffects.
 * @typedef {object} TraitEffects
 * @property {number}      strengthBonus   — pontos brutos de força (+/-)
 * @property {number}      clutchMult      — multiplicador de clutch
 * @property {number}      errorMult       — multiplicador de erros
 * @property {number}      staminaMult     — multiplicador de stamina
 * @property {number}      serveMult       — multiplicador de saque
 * @property {number}      opponentDebuff  — penalidade no adversário (0–0.3)
 * @property {string|null} formFloor       — forma mínima garantida
 */
