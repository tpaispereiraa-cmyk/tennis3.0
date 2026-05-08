/**
 * CoachArchetypes.js
 * ─────────────────────────────────────────────────────────────────
 * Sistema de arquétipos de técnicos: cada técnico carrega um conjunto
 * fixo de bônus nos atributos do jogador — ativos enquanto a parceria
 * durar. Se o técnico sair, os pontos saem junto.
 *
 * Total de pontos por arquétipo: exatamente 30.
 * Atributos boosteáveis: todos os 21 attrs v4 do jogador.
 *
 * Exports:
 *   COACH_ARCHETYPES             → array com todos os arquétipos
 *   getArchetypeDef(id)          → objeto de definição do arquétipo
 *   assignArchetype(coach)       → archetypeId string (baseado em filosofia/surface)
 *   getEffectiveAttrs(attrs, coach) → attrs com bônus do arquétipo aplicado (cap 99)
 *   migrateCoachArchetype(coach) → garante que coach antigo tenha archetypeId
 */

// ═══════════════════════════════════════════════════════════════════
// DEFINIÇÃO DOS 30 ARQUÉTIPOS
// Cada bonus soma exatamente 30 pontos distribuídos nos attrs do jogador.
// ═══════════════════════════════════════════════════════════════════

export const COACH_ARCHETYPES = [

  // ── BACKHAND / SLICE ─────────────────────────────────────────────
  {
    id: 'BACKHAND_MAGICIAN',
    name: 'Mago do Backhand',
    icon: '🔮',
    tagline: 'Transforma o BH numa arma devastadora dos dois lados',
    bonuses: { bhPotencia: 12, bhControle: 12, topspin: 6 },          // 30
  },
  {
    id: 'SLICE_WIZARD',
    name: 'Mago do Slice',
    icon: '🗡️',
    tagline: 'Bola baixa, ritmo quebrado — o slice como linguagem',
    bonuses: { slice: 18, bhControle: 8, defesa: 4 },                  // 30
  },
  {
    id: 'BH_WALL_COACH',
    name: 'Técnico do Muro',
    icon: '🧱',
    tagline: 'BH de controle inabalável, consistência que desgasta',
    bonuses: { bhControle: 14, regularidade: 10, slice: 6 },           // 30
  },

  // ── FOREHAND / TOPSPIN ───────────────────────────────────────────
  {
    id: 'FOREHAND_DESTROYER',
    name: 'Destruidor de FH',
    icon: '💥',
    tagline: 'FH pesado com efeito — ângulos que desafiam a física',
    bonuses: { fhPotencia: 14, fhControle: 8, topspin: 8 },            // 30
  },
  {
    id: 'SPIN_DEMON',
    name: 'Demônio do Spin',
    icon: '🌀',
    tagline: 'Efeito devastador em cada bola — quique alto, ângulos pesados',
    bonuses: { topspin: 20, slice: 10 },                                // 30
  },

  // ── SAQUE ────────────────────────────────────────────────────────
  {
    id: 'SERVE_CANNON',
    name: 'Canhão do Saque',
    icon: '💣',
    tagline: 'Aces e indevolvíveis como rotina semanal',
    bonuses: { saqueForca: 18, saquePrecisao: 12 },                     // 30
  },
  {
    id: 'PRECISION_SERVER',
    name: 'Cirurgião do Saque',
    icon: '🎯',
    tagline: 'Colocação perfeita. Dupla falta não existe no vocabulário',
    bonuses: { saquePrecisao: 16, devolucao: 10, mentalidade: 4 },      // 30
  },
  {
    id: 'SECOND_SERVE_MAESTRO',
    name: 'Maestro do Segundo Saque',
    icon: '🎼',
    tagline: 'Transforma pressão em segundo saque mortal',
    bonuses: { saquePrecisao: 14, mentalidade: 10, regularidade: 6 },   // 30
  },

  // ── RETORNO ──────────────────────────────────────────────────────
  {
    id: 'RETURN_KING',
    name: 'Rei do Retorno',
    icon: '👑',
    tagline: 'Neutraliza qualquer saque com leitura e timing',
    bonuses: { devolucao: 18, leitura: 8, adaptacao: 4 },               // 30
  },

  // ── REDE ─────────────────────────────────────────────────────────
  {
    id: 'NET_COMMANDER',
    name: 'Comandante da Rede',
    icon: '🛡️',
    tagline: 'Domínio absoluto quando sobe à rede',
    bonuses: { volley: 16, smash: 14 },                                 // 30
  },
  {
    id: 'SERVE_AND_VOLLEY_GURU',
    name: 'Guru do Saque e Voleio',
    icon: '⚡',
    tagline: 'Saque + explosão + voleio como sistema integrado',
    bonuses: { saqueForca: 10, volley: 14, explosividade: 6 },          // 30
  },

  // ── FÍSICO ───────────────────────────────────────────────────────
  {
    id: 'IRON_LEGS',
    name: 'Pernas de Ferro',
    icon: '🏃',
    tagline: 'Resistência inabalável — o 5° set é onde brilha',
    bonuses: { resistencia: 18, velocidade: 8, recuperacao: 4 },        // 30
  },
  {
    id: 'SPEED_COACH',
    name: 'Treinador de Velocidade',
    icon: '💨',
    tagline: 'Chega em tudo. Bola "impossível" é especialidade',
    bonuses: { velocidade: 16, explosividade: 10, defesa: 4 },          // 30
  },
  {
    id: 'EXPLOSIVENESS_COACH',
    name: 'Treinador de Explosividade',
    icon: '🚀',
    tagline: 'Primeira passada letal + smash de autoridade',
    bonuses: { explosividade: 16, velocidade: 8, smash: 6 },            // 30
  },
  {
    id: 'DEFENSE_FORTRESS',
    name: 'Fortaleza Defensiva',
    icon: '🏰',
    tagline: 'Golpes fora de posição de alto nível — nada passa',
    bonuses: { defesa: 16, resistencia: 10, recuperacao: 4 },           // 30
  },

  // ── MENTAL ───────────────────────────────────────────────────────
  {
    id: 'CLUTCH_MASTER',
    name: 'Mestre do Clutch',
    icon: '🧠',
    tagline: 'Break points e tiebreaks são o habitat natural',
    bonuses: { mentalidade: 20, recuperacao: 10 },                      // 30
  },
  {
    id: 'MIND_SCULPTOR',
    name: 'Escultor Mental',
    icon: '🎭',
    tagline: 'Mentalidade, consistência e adaptação como trilogia',
    bonuses: { mentalidade: 10, regularidade: 10, adaptacao: 10 },      // 30
  },
  {
    id: 'IRON_WILL',
    name: 'Vontade de Ferro',
    icon: '💪',
    tagline: 'Quebra? Reage. Perde set? Não liga. Ressurge sempre',
    bonuses: { recuperacao: 16, mentalidade: 8, regularidade: 6 },      // 30
  },
  {
    id: 'CONSISTENCY_GURU',
    name: 'Guru da Consistência',
    icon: '📐',
    tagline: 'Nível alto o tempo todo — zero zebras, zero variação',
    bonuses: { regularidade: 16, resistencia: 8, bhControle: 6 },       // 30
  },
  {
    id: 'SECOND_WIND',
    name: 'Segundo Fôlego',
    icon: '🌬️',
    tagline: 'Quanto mais longa a partida, mais perigoso fica',
    bonuses: { recuperacao: 14, resistencia: 10, mentalidade: 6 },      // 30
  },
  {
    id: 'ADAPTABILITY_COACH',
    name: 'Mestre da Adaptação',
    icon: '🦎',
    tagline: 'Lê a partida e muda o game plan em tempo real',
    bonuses: { adaptacao: 18, leitura: 8, visaoTatica: 4 },             // 30
  },

  // ── TÁTICO / LEITURA ─────────────────────────────────────────────
  {
    id: 'GRAND_TACTICIAN',
    name: 'O Grande Estrategista',
    icon: '♟️',
    tagline: 'Cada ponto é uma partida de xadrez — e ele sempre vence',
    bonuses: { visaoTatica: 16, leitura: 14 },                          // 30
  },
  {
    id: 'READING_GENIUS',
    name: 'Gênio da Leitura',
    icon: '👁️',
    tagline: 'Antecipa a bola antes dela sair da raquete adversária',
    bonuses: { leitura: 18, visaoTatica: 8, adaptacao: 4 },             // 30
  },

  // ── CONTROLE / EQUILÍBRIO ────────────────────────────────────────
  {
    id: 'CONTROL_ARTIST',
    name: 'Artista do Controle',
    icon: '🎨',
    tagline: 'Precisão cirúrgica dos dois lados, consistência como arte',
    bonuses: { fhControle: 10, bhControle: 10, regularidade: 10 },      // 30
  },
  {
    id: 'COMPLETE_DEVELOPER',
    name: 'Desenvolvedor Completo',
    icon: '🔭',
    tagline: 'Sem buracos. Cada atributo recebe atenção igual',
    bonuses: { fhControle: 6, bhControle: 6, leitura: 6, regularidade: 6, adaptacao: 6 }, // 30
  },

  // ── PODER ────────────────────────────────────────────────────────
  {
    id: 'POWER_ENHANCER',
    name: 'Amplificador de Poder',
    icon: '🔋',
    tagline: 'Potência adicional em golpes e saque — agressividade constante',
    bonuses: { fhPotencia: 12, bhPotencia: 10, saqueForca: 8 },         // 30
  },
  {
    id: 'BIG_SHOT_COACH',
    name: 'Técnico do Grande Golpe',
    icon: '🎸',
    tagline: 'FH pesado, BH pesado, saque explosivo — poder em tudo',
    bonuses: { fhPotencia: 10, bhPotencia: 10, saqueForca: 10 },        // 30
  },
  {
    id: 'AGGRESSIVE_BASELINER_COACH',
    name: 'Técnico do Baselineiro',
    icon: '⚔️',
    tagline: 'Pressão do fundo, topspin devastador, visão de killer',
    bonuses: { fhPotencia: 10, topspin: 10, visaoTatica: 10 },          // 30
  },

  // ── DESGASTE / ESPECIALIZAÇÃO ────────────────────────────────────
  {
    id: 'GRINDER_COACH',
    name: 'Técnico do Desgaste',
    icon: '⚙️',
    tagline: 'Cansa o adversário até ele desmoronar — guerra de nervos',
    bonuses: { resistencia: 14, regularidade: 10, slice: 6 },           // 30
  },
  {
    id: 'CLAY_MAESTRO',
    name: 'Maestro da Argila',
    icon: '🏺',
    tagline: 'Topspin pesado, resistência de ferro — argila é casa',
    bonuses: { topspin: 12, resistencia: 10, bhControle: 8 },           // 30
  },
  {
    id: 'GRASS_SPECIALIST_COACH',
    name: 'Especialista em Grama',
    icon: '🌿',
    tagline: 'Saque + voleio + explosão — grama não é sorte, é sistema',
    bonuses: { saqueForca: 10, volley: 12, explosividade: 8 },          // 30
  },
];

// ═══════════════════════════════════════════════════════════════════
// MAPA DE AFINIDADE: filosofia/surface → ids com peso aumentado
// Todos os archetypes têm peso base 1; os listados aqui têm peso 4.
// ═══════════════════════════════════════════════════════════════════

const PHILOSOPHY_AFFINITY = {
  OFFENSIVE: [
    'FOREHAND_DESTROYER', 'SPIN_DEMON', 'SERVE_CANNON',
    'POWER_ENHANCER', 'BIG_SHOT_COACH', 'AGGRESSIVE_BASELINER_COACH',
    'BACKHAND_MAGICIAN',
  ],
  DEFENSIVE: [
    'SLICE_WIZARD', 'BH_WALL_COACH', 'DEFENSE_FORTRESS',
    'IRON_LEGS', 'CONSISTENCY_GURU', 'GRINDER_COACH',
    'RETURN_KING', 'SECOND_WIND',
  ],
  COMPLETE: [
    'COMPLETE_DEVELOPER', 'CONTROL_ARTIST', 'GRAND_TACTICIAN',
    'READING_GENIUS', 'ADAPTABILITY_COACH', 'MIND_SCULPTOR',
    'SPEED_COACH',
  ],
  SPECIALIST: [
    'SERVE_CANNON', 'NET_COMMANDER', 'SERVE_AND_VOLLEY_GURU',
    'CLAY_MAESTRO', 'GRASS_SPECIALIST_COACH', 'SPIN_DEMON',
    'EXPLOSIVENESS_COACH',
  ],
  MENTAL: [
    'CLUTCH_MASTER', 'MIND_SCULPTOR', 'IRON_WILL',
    'SECOND_WIND', 'ADAPTABILITY_COACH', 'SECOND_SERVE_MAESTRO',
    'READING_GENIUS', 'CONSISTENCY_GURU',
  ],
};

// Surface extra-weight (SPECIALIST apenas)
const SURFACE_AFFINITY = {
  CLAY:   ['CLAY_MAESTRO', 'SPIN_DEMON', 'GRINDER_COACH'],
  GRASS:  ['GRASS_SPECIALIST_COACH', 'SERVE_AND_VOLLEY_GURU', 'NET_COMMANDER'],
  HARD:   ['SERVE_CANNON', 'POWER_ENHANCER', 'RETURN_KING'],
  INDOOR: ['BIG_SHOT_COACH', 'SERVE_CANNON', 'SERVE_AND_VOLLEY_GURU'],
};

// ═══════════════════════════════════════════════════════════════════
// LOOKUP MAP
// ═══════════════════════════════════════════════════════════════════

const _archetypeMap = Object.fromEntries(COACH_ARCHETYPES.map(a => [a.id, a]));

/**
 * Retorna a definição completa de um arquétipo pelo id.
 * @param {string} id
 * @returns {object|null}
 */
export function getArchetypeDef(id) {
  return _archetypeMap[id] ?? null;
}

// ═══════════════════════════════════════════════════════════════════
// ATRIBUIÇÃO DE ARQUÉTIPO
// ═══════════════════════════════════════════════════════════════════

function _randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Sorteia e retorna o id de um arquétipo compatível com a filosofia
 * e surface do técnico, com pesos de afinidade.
 *
 * @param {object} coach — objeto coach (precisa de .philosophy e .specialtySurface)
 * @returns {string} archetypeId
 */
export function assignArchetype(coach) {
  const phil    = coach.philosophy ?? 'COMPLETE';
  const surface = coach.specialtySurface ?? null;

  const philAffinity    = PHILOSOPHY_AFFINITY[phil]    ?? [];
  const surfaceAffinity = surface ? (SURFACE_AFFINITY[surface] ?? []) : [];

  // Monta pesos
  const weighted = COACH_ARCHETYPES.map(a => {
    let weight = 1;
    if (philAffinity.includes(a.id))    weight += 3;
    if (surfaceAffinity.includes(a.id)) weight += 4;
    return { id: a.id, weight };
  });

  const total = weighted.reduce((s, i) => s + i.weight, 0);
  let r = Math.random() * total;
  for (const item of weighted) {
    r -= item.weight;
    if (r <= 0) return item.id;
  }
  return weighted[weighted.length - 1].id;
}

// ═══════════════════════════════════════════════════════════════════
// ATTRS EFETIVOS
// ═══════════════════════════════════════════════════════════════════

/**
 * Retorna os atributos efetivos do jogador com o bônus do arquétipo
 * do técnico aplicado. Cap em 99 por atributo.
 *
 * Os bônus são ATIVOS: existem apenas enquanto o técnico estiver contratado.
 * Se não houver técnico ou arquétipo, retorna os attrs originais inalterados.
 *
 * @param {object} playerAttrs — player.attrs (objeto raw)
 * @param {object|null} coach  — player.coach (ou null se sem técnico)
 * @returns {object} attrs com bônus aplicado
 */
export function getEffectiveAttrs(playerAttrs, coach) {
  if (!playerAttrs) return playerAttrs;

  const archetypeId = coach?.archetypeId ?? null;
  if (!archetypeId) return playerAttrs;

  const def = getArchetypeDef(archetypeId);
  if (!def) return playerAttrs;

  // Aplica bônus com cap em 99
  const result = { ...playerAttrs };
  for (const [attr, bonus] of Object.entries(def.bonuses)) {
    if (result[attr] !== undefined) {
      result[attr] = Math.min(99, result[attr] + bonus);
    }
  }
  return result;
}

// ═══════════════════════════════════════════════════════════════════
// MIGRAÇÃO DE COACHES ANTIGOS
// ═══════════════════════════════════════════════════════════════════

/**
 * Garante que um coach gerado antes do sistema de arquétipos
 * receba um archetypeId atribuído retroativamente.
 * Mutação in-place — retorna o mesmo objeto.
 *
 * @param {object} coach
 * @returns {object} coach com archetypeId garantido
 */
export function migrateCoachArchetype(coach) {
  if (!coach) return coach;
  if (!coach.archetypeId) {
    coach.archetypeId = assignArchetype(coach);
  }
  return coach;
}

