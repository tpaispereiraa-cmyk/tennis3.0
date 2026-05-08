/**
 * CoachingSystem.js
 * ─────────────────────────────────────────────────────────────────
 * Bloco A — Entidade Rica: Coach como personagem completo.
 *
 * Exports principais:
 *   generateCoach(season, opts?)         → objeto coach completo
 *   generateCoachPool(season, count?)    → array de coaches
 *   getCoachById(pool, id)               → coach | null
 *   getCoachLabel(coach)                 → string legível para UI
 *   PHILOSOPHY_ATTRS                     → mapeamento filosofia → attrs
 *   SURFACE_SPECIALTY_ATTRS             → mapeamento surface → attrs
 *   COACH_PHILOSOPHIES                   → array de ids válidos
 *   COACH_PERSONAS                       → 8 personas de coaching
 *   COACHING_STYLES                      → 7 estilos de desenvolvimento
 *   COACH_TRAIT_DEFS                     → definições de traits de coach
 *   COACH_DNA_TIERS                      → tiers de DNA por score
 *   getCoachDnaTier(score)               → tier do coach
 *
 * Bloco B — Envelhecimento & Aposentadoria:
 *   ageCoachPool(pool, season, allPlayers, titleWinners) → { pool, retiredCoaches, freedPupilIds }
 *   calcCoachRetirementChance(coach, pupil, titleWinners) → number 0.0–1.0
 *   getCoachRetirementType(coach)        → string de tipo narrativo
 *
 * Pool sizing:
 *   Tour tem 128 jogadores + 32 prospects = 160 ativos.
 *   Pool de coaches = ~30% maior = 208.
 *   generateCoachPool(season, 208) no buildUniverse().
 */

import { generateCoachAttrs } from './CoachProfiles.js';
import { offlineNoop as rollCoachSignature } from '../shotlab/ShotEngineOffline.js';
import { assignArchetype } from './CoachArchetypes.js';

// ═══════════════════════════════════════════════════════════════════
// HELPERS INTERNOS
// ═══════════════════════════════════════════════════════════════════

let _coachCounter = 0;

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function weightedRandom(items) {
  const total = items.reduce((s, i) => s + i.weight, 0);
  let r = Math.random() * total;
  for (const item of items) {
    r -= item.weight;
    if (r <= 0) return item.id;
  }
  return items[items.length - 1].id;
}

function slugify(str) {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')   // remove acentos
    .replace(/[^a-zA-Z0-9]/g, '_')
    .toUpperCase()
    .slice(0, 16);
}


// ═══════════════════════════════════════════════════════════════════
// FILOSOFIAS
// ═══════════════════════════════════════════════════════════════════

export const COACH_PHILOSOPHIES = [
  'OFFENSIVE',
  'DEFENSIVE',
  'COMPLETE',
  'SPECIALIST',
  'MENTAL',
];

/**
 * Para cada filosofia: quais attrKeys são boosted (crescimento acelerado)
 * e quais são penalizados (crescimento levemente freado).
 * Usado pela Fase 3 no growthMultiplierForAttr().
 */
export const PHILOSOPHY_ATTRS = {
  OFFENSIVE: {
    label:     'Ofensivo',
    icon:      '⚡',
    boosted:   ['potencia', 'saque', 'agressividade', 'topspin'],
    penalized: ['resistencia', 'controle'],
    description: 'Pressão constante, encurtamento do rally, winners e saque agressivo.',
  },
  DEFENSIVE: {
    label:     'Defensivo',
    icon:      '🛡️',
    boosted:   ['resistencia', 'controle', 'slice', 'regularidade', 'devolucao'],
    penalized: ['potencia', 'saque', 'agressividade'],
    description: 'Consistência, recuperação e exploração de erros do adversário.',
  },
  COMPLETE: {
    label:     'Completo',
    icon:      '⚖️',
    boosted:   [],   // sem boost específico — cresce tudo equilibrado
    penalized: [],
    description: 'Desenvolvimento equilibrado. Sem buracos, sem pico específico.',
  },
  SPECIALIST: {
    label:     'Especialista',
    icon:      '🏺',
    boosted:   [],   // calculado via specialtySurface
    penalized: [],
    description: 'Foco em uma superfície. Dominante nela, mais frágil nas outras.',
  },
  MENTAL: {
    label:     'Mental',
    icon:      '🧠',
    boosted:   ['mentalidade', 'regularidade', 'leitura'],
    penalized: [],
    description: 'Trabalha a cabeça. Acelera cura de Sombras e traits de pressão.',
  },
};

/**
 * Attrs boosted por superfície para coaches SPECIALIST.
 * penalized = attrs que crescem menos fora da surface de foco.
 */
export const SURFACE_SPECIALTY_ATTRS = {
  CLAY: {
    boosted:   ['topspin', 'resistencia', 'controle', 'slice', 'regularidade'],
    penalized: ['saque', 'jogoDeRede'],
  },
  GRASS: {
    boosted:   ['saque', 'jogoDeRede', 'explosividade', 'leitura'],
    penalized: ['topspin', 'resistencia'],
  },
  HARD: {
    boosted:   ['potencia', 'controle', 'saque', 'devolucao'],
    penalized: ['slice'],
  },
  INDOOR: {
    boosted:   ['saque', 'potencia', 'jogoDeRede', 'agressividade'],
    penalized: ['resistencia', 'topspin'],
  },
};

/**
 * Retorna os attrs boosted/penalized efetivos de um coach,
 * resolvendo o caso SPECIALIST via specialtySurface.
 */
export function getEffectivePhilosophyAttrs(coach) {
  if (coach.philosophy === 'SPECIALIST' && coach.specialtySurface) {
    const s = SURFACE_SPECIALTY_ATTRS[coach.specialtySurface] ?? { boosted: [], penalized: [] };
    return { boosted: s.boosted, penalized: s.penalized };
  }
  const p = PHILOSOPHY_ATTRS[coach.philosophy] ?? { boosted: [], penalized: [] };
  return { boosted: p.boosted, penalized: p.penalized };
}


// ═══════════════════════════════════════════════════════════════════
// ESPECIALIDADE (specialty attrs — max 2 por coach)
// ═══════════════════════════════════════════════════════════════════

/**
 * Todos os attrKeys do jogo — v3 (14 atributos).
 * Espelha ATTR_KEYS_V3 de attributes.js.
 */
const ALL_ATTR_KEYS = [
  // corpo
  'velocidade', 'explosividade', 'resistencia',
  // golpes
  'potencia', 'controle', 'topspin', 'slice',
  // saque & retorno
  'saque', 'devolucao',
  // rede
  'jogoDeRede',
  // leitura & decisão
  'leitura', 'agressividade',
  // cabeça
  'mentalidade', 'regularidade',
];

/**
 * Pool de specialty candidatos por filosofia.
 * O coach terá 1-2 desses como attrs de especialidade individual
 * (boost ainda maior do que o boost de filosofia geral).
 */
const SPECIALTY_POOL = {
  OFFENSIVE:  ['potencia', 'saque', 'agressividade', 'topspin', 'explosividade'],
  DEFENSIVE:  ['resistencia', 'controle', 'slice', 'regularidade', 'devolucao'],
  COMPLETE:   ALL_ATTR_KEYS,  // pode especializar em qualquer coisa
  SPECIALIST: [],              // preenchido via surface (não usa pool genérico)
  MENTAL:     ['mentalidade', 'regularidade', 'leitura', 'agressividade'],
};

function pickSpecialtyAttrs(philosophy, specialtySurface) {
  if (philosophy === 'SPECIALIST' && specialtySurface) {
    // Pega os 2 primeiros boosted da surface como specialty de destaque
    const surfAttrs = SURFACE_SPECIALTY_ATTRS[specialtySurface]?.boosted ?? [];
    return surfAttrs.slice(0, 2);
  }

  const pool = SPECIALTY_POOL[philosophy] ?? SPECIALTY_POOL.COMPLETE;
  if (pool.length === 0) return [];

  // Maioria dos coaches tem 2 specialties; alguns têm 1 (mais raros, mas mais profundos)
  const count = Math.random() < 0.75 ? 2 : 1;
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}


// ═══════════════════════════════════════════════════════════════════
// PERSONAS DE COACHING
// ═══════════════════════════════════════════════════════════════════

/**
 * 8 personas — como o coach age, não o que ele ensina.
 * Ortogonal à filosofia: qualquer combinação é válida.
 */
export const COACH_PERSONAS = {
  GENERAL: {
    id: 'GENERAL', label: 'O General', icon: '⚔️',
    description: 'Disciplina absoluta, hierarquia rígida. O pupilo obedece ou sai.',
    taglines: [
      'Minha quadra, minhas regras.',
      'Disciplina ganha títulos. Não talento.',
      'Você treina como joga. E eu decido como você treina.',
    ],
    bioTemplates: [
      'Formado pela escola dura do circuito, {firstName} construiu uma carreira inteira na base da disciplina e ordem. Não aceita menos que 100% em nenhum treino.',
      '{firstName} é conhecido no circuito pela mão de ferro. Quem passou por ele aprendeu que o caminho para o topo é pavimentado de repetição e obediência tática.',
    ],
  },
  MENTOR_PATERNAL: {
    id: 'MENTOR_PATERNAL', label: 'O Mentor', icon: '🤲',
    description: 'Relação de pai e filho. Protege, guia — às vezes, protege demais.',
    taglines: [
      'Vejo em você o que você ainda não vê.',
      'Meu pupilo não cai sozinho enquanto eu estiver aqui.',
      'Confie no processo — e em mim.',
    ],
    bioTemplates: [
      'Para {firstName}, o tênis é transmissão. Cada jogador que treina é como um filho técnico — ele enxerga o potencial antes do atleta mesmo perceber.',
      '{firstName} constrói relações longas. Não é o tipo que abandona o pupilo na derrota. Isso tem um custo: a dependência, às vezes, é demais.',
    ],
  },
  ANALITICO_FRIO: {
    id: 'ANALITICO_FRIO', label: 'O Analista', icon: '🔬',
    description: 'Dados, vídeo, adversário estudado. Sem emoção — só resultado.',
    taglines: [
      'Cada ponto tem uma probabilidade. Jogue as melhores.',
      'Emoção é ruído. Dados são verdade.',
      'Já vi esse padrão 47 vezes. Você vai ganhar.',
    ],
    bioTemplates: [
      '{firstName} não faz discurso motivacional. Ele chega com três páginas de análise do adversário e uma sequência de treino matematicamente calculada.',
      'O vestiário de {firstName} cheira a café e planilha. Não é o técnico mais carismático do circuito — é o mais preparado.',
    ],
  },
  MOTIVADOR_PURO: {
    id: 'MOTIVADOR_PURO', label: 'O Motivador', icon: '🔥',
    description: 'Energia contagiante. Acredita mais no pupilo do que ele mesmo.',
    taglines: [
      'Você pode. Eu sei que pode. Agora vá.',
      'A energia que você traz para a quadra é a energia que vence.',
      'Nunca vi ninguém treinar assim e não chegar lá.',
    ],
    bioTemplates: [
      '{firstName} tem uma capacidade rara: fazer um jogador acreditar no impossível. Nos sets decisivos, sua presença no banco muda o ponto de equilíbrio.',
      'Poucos técnicos energizam a quadra como {firstName}. O risco: em derrotas longas, energia sem análise não é suficiente.',
    ],
  },
  MISTICO: {
    id: 'MISTICO', label: 'O Místico', icon: '🌙',
    description: 'Filosofia, espiritualidade, metáforas. O circuito não entende — mas funciona.',
    taglines: [
      'O ponto não começa no saque. Começa na respiração antes.',
      'Você e a bola são a mesma coisa por 0,4 segundos.',
      'O adversário é o espelho. Estude-se.',
    ],
    bioTemplates: [
      '{firstName} mistura técnica com filosofia de vida. Seus pupilos saem da sessão com dicas táticas e perguntas existenciais. Curiosamente, funciona.',
      'Ninguém entende exatamente o que {firstName} faz — inclusive ele. Mas os números não mentem: seus pupilos performam melhor nos momentos críticos.',
    ],
  },
  AMIGO_CUMPLICE: {
    id: 'AMIGO_CUMPLICE', label: 'O Cúmplice', icon: '🤝',
    description: 'Parceiro, não chefe. Joga xadrez com o atleta.',
    taglines: [
      'Você decide na quadra. Eu só organizo o tabuleiro.',
      'Não sou seu chefe. Sou o cara que acredita em você.',
      'Vencemos juntos. Perdemos juntos.',
    ],
    bioTemplates: [
      '{firstName} rejeita a hierarquia clássica técnico-atleta. Para ele, o jogador é o dono do jogo — o técnico organiza os bastidores.',
      'A relação de {firstName} com seus pupilos é incomum: parece cumplicidade, não autoridade. Em torneios grandes, isso pode ser bênção ou armadilha.',
    ],
  },
  INOVADOR_TECNICO: {
    id: 'INOVADOR_TECNICO', label: 'O Inovador', icon: '⚙️',
    description: 'Inventa jogadas, ajusta biomecânica, obcecado por detalhe técnico.',
    taglines: [
      'O swing que você tem não é o swing que você precisa.',
      'Cada milímetro importa. Vamos ajustar.',
      'O circuito não está pronto para o que estamos construindo.',
    ],
    bioTemplates: [
      '{firstName} é o tipo de técnico que reescreve o swing de um top 50 sem hesitar. Arriscado — mas quando funciona, cria um jogador novo.',
      'Biomecânica, slow-motion, ajuste de grip — {firstName} nunca para de otimizar. Seus pupilos passam meses em reconstrução antes de verem os resultados.',
    ],
  },
  VETERANO_SECO: {
    id: 'VETERANO_SECO', label: 'O Veterano', icon: '🏆',
    description: 'Viu tudo, diz pouco. Cada palavra que fala pesa toneladas.',
    taglines: [
      'Já vi esse jogo antes. Faça o que eu digo.',
      'Palavras a menos, resultados a mais.',
      'Trinta anos de circuito. Já vi pior.',
    ],
    bioTemplates: [
      '{firstName} passou décadas no circuito como jogador e técnico. Não precisa gritar — quando fala, o vestiário para.',
      'O silêncio de {firstName} nos changeovers é proposital. Uma frase no momento certo vale mais que dez motivações vazias.',
    ],
  },
};

/** Pesos de persona por filosofia — personas compatíveis têm peso maior */
const PERSONA_WEIGHTS_BY_PHILOSOPHY = {
  OFFENSIVE:  [
    { id: 'GENERAL',         weight: 20 },
    { id: 'MOTIVADOR_PURO',  weight: 20 },
    { id: 'INOVADOR_TECNICO',weight: 18 },
    { id: 'VETERANO_SECO',   weight: 15 },
    { id: 'ANALITICO_FRIO',  weight: 12 },
    { id: 'AMIGO_CUMPLICE',  weight:  8 },
    { id: 'MENTOR_PATERNAL', weight:  5 },
    { id: 'MISTICO',         weight:  2 },
  ],
  DEFENSIVE:  [
    { id: 'ANALITICO_FRIO',  weight: 28 },
    { id: 'GENERAL',         weight: 20 },
    { id: 'MENTOR_PATERNAL', weight: 16 },
    { id: 'VETERANO_SECO',   weight: 15 },
    { id: 'MOTIVADOR_PURO',  weight:  8 },
    { id: 'MISTICO',         weight:  7 },
    { id: 'AMIGO_CUMPLICE',  weight:  4 },
    { id: 'INOVADOR_TECNICO',weight:  2 },
  ],
  COMPLETE:   [
    { id: 'MENTOR_PATERNAL', weight: 28 },
    { id: 'AMIGO_CUMPLICE',  weight: 20 },
    { id: 'ANALITICO_FRIO',  weight: 15 },
    { id: 'MOTIVADOR_PURO',  weight: 14 },
    { id: 'VETERANO_SECO',   weight: 12 },
    { id: 'GENERAL',         weight:  8 },
    { id: 'MISTICO',         weight:  3 },
  ],
  SPECIALIST: [
    { id: 'ANALITICO_FRIO',  weight: 32 },
    { id: 'VETERANO_SECO',   weight: 26 },
    { id: 'INOVADOR_TECNICO',weight: 20 },
    { id: 'GENERAL',         weight: 14 },
    { id: 'MENTOR_PATERNAL', weight:  5 },
    { id: 'MISTICO',         weight:  2 },
    { id: 'AMIGO_CUMPLICE',  weight:  1 },
  ],
  MENTAL:     [
    { id: 'MISTICO',         weight: 32 },
    { id: 'MENTOR_PATERNAL', weight: 26 },
    { id: 'MOTIVADOR_PURO',  weight: 20 },
    { id: 'AMIGO_CUMPLICE',  weight: 14 },
    { id: 'VETERANO_SECO',   weight:  5 },
    { id: 'ANALITICO_FRIO',  weight:  3 },
  ],
};

function pickCoachPersona(philosophy) {
  const weights = PERSONA_WEIGHTS_BY_PHILOSOPHY[philosophy]
    ?? Object.keys(COACH_PERSONAS).map(id => ({ id, weight: 1 }));
  return weightedRandom(weights);
}


// ═══════════════════════════════════════════════════════════════════
// ESTILOS DE COACHING
// ═══════════════════════════════════════════════════════════════════

/**
 * 7 estilos de desenvolvimento — o QUE o coach ensina (mais granular que philosophy).
 * Cada estilo é derivado da philosophy + variação.
 */
export const COACHING_STYLES = {
  ATTACK_SCULPTOR: {
    id: 'ATTACK_SCULPTOR', label: 'Escultor do Ataque', icon: '⚡',
    description: 'Molda jogadores agressivos. Libera potência, encurta rally.',
    primaryPhilosophy: 'OFFENSIVE',
  },
  SERVE_FANATICO: {
    id: 'SERVE_FANATICO', label: 'Fanático do Saque', icon: '🚀',
    description: 'Obsessão com saque. Primeiro, segundo, variação e tática de serviço.',
    primaryPhilosophy: 'OFFENSIVE',
  },
  DEFENSE_ARCHITECT: {
    id: 'DEFENSE_ARCHITECT', label: 'Arquiteto da Defesa', icon: '🛡️',
    description: 'Constrói muralhas. Paciência, rally longo, exploração de erros.',
    primaryPhilosophy: 'DEFENSIVE',
  },
  TATICO_PURO: {
    id: 'TATICO_PURO', label: 'Tático Puro', icon: '♟️',
    description: 'Análise de adversário. Adapta plano por torneio e superfície.',
    primaryPhilosophy: 'SPECIALIST',
  },
  MENTAL_MAESTRO: {
    id: 'MENTAL_MAESTRO', label: 'Maestro Mental', icon: '🧠',
    description: 'Psicologia aplicada. Domina momentos decisivos e gestão de pressão.',
    primaryPhilosophy: 'MENTAL',
  },
  ALL_ROUND_FORMER: {
    id: 'ALL_ROUND_FORMER', label: 'Formador Completo', icon: '⚖️',
    description: 'Jogo completo, sem especialização. Preenche lacunas, equilibra o jogador.',
    primaryPhilosophy: 'COMPLETE',
  },
  FORMADOR_JOVENS: {
    id: 'FORMADOR_JOVENS', label: 'Formador de Jovens', icon: '🌱',
    description: 'Especialista em desenvolvimento inicial. Maximiza o potencial em early career.',
    primaryPhilosophy: 'COMPLETE',
  },
};

const PHILOSOPHY_TO_COACHING_STYLES = {
  OFFENSIVE:  [{ id: 'ATTACK_SCULPTOR', weight: 65 }, { id: 'SERVE_FANATICO',  weight: 35 }],
  DEFENSIVE:  [{ id: 'DEFENSE_ARCHITECT', weight: 100 }],
  COMPLETE:   [{ id: 'ALL_ROUND_FORMER', weight: 70 }, { id: 'FORMADOR_JOVENS', weight: 30 }],
  SPECIALIST: [{ id: 'TATICO_PURO', weight: 100 }],
  MENTAL:     [{ id: 'MENTAL_MAESTRO', weight: 100 }],
};

function pickCoachingStyle(philosophy) {
  const opts = PHILOSOPHY_TO_COACHING_STYLES[philosophy]
    ?? [{ id: 'ALL_ROUND_FORMER', weight: 100 }];
  return weightedRandom(opts);
}


// ═══════════════════════════════════════════════════════════════════
// TRAITS DE COACH
// ═══════════════════════════════════════════════════════════════════

/**
 * Definições de traits de coach. Efeitos mecânicos serão aplicados
 * no Bloco C (chemistry & development). Aqui vivem os metadados.
 */
export const COACH_TRAIT_DEFS = {
  // ── POSITIVOS ──────────────────────────────────────────────────
  EX_LENDA: {
    id: 'EX_LENDA', type: 'positive', rarity: 'legendary',
    label: 'Ex-Lenda', icon: '👑',
    description: 'Foi top 10 como jogador. Prestígio eleva a reputação do pupilo e atrai atenção do circuito.',
  },
  FORMADOR_PRODIGIO: {
    id: 'FORMADOR_PRODIGIO', type: 'positive', rarity: 'rare',
    label: 'Formador de Prodígios', icon: '⭐',
    description: 'Já transformou um jovem em top 5. Bônus de desenvolvimento em talentos sub-22.',
  },
  MAGO_DO_MENTAL: {
    id: 'MAGO_DO_MENTAL', type: 'positive', rarity: 'rare',
    label: 'Mago Mental', icon: '🧠',
    description: '+15% de efetividade nos momentos decisivos. Tiebreaks e match points são território seu.',
  },
  ESPECIALISTA_SAIBRO: {
    id: 'ESPECIALISTA_SAIBRO', type: 'positive', rarity: 'common',
    label: 'Especialista em Saibro', icon: '🟤',
    description: 'Bônus de desenvolvimento em topspin, resistência e controle.',
  },
  ESPECIALISTA_GRAMA: {
    id: 'ESPECIALISTA_GRAMA', type: 'positive', rarity: 'common',
    label: 'Especialista em Grama', icon: '🟢',
    description: 'Bônus de desenvolvimento em saque, rede e explosividade.',
  },
  ESPECIALISTA_HARD: {
    id: 'ESPECIALISTA_HARD', type: 'positive', rarity: 'common',
    label: 'Especialista em Duro', icon: '🔵',
    description: 'Bônus de desenvolvimento em potência, controle e devolução.',
  },
  GURU_SAQUE: {
    id: 'GURU_SAQUE', type: 'positive', rarity: 'rare',
    label: 'Guru do Saque', icon: '🎯',
    description: 'Especialidade absoluta em serviço. Acelera o desenvolvimento de saque do pupilo.',
  },
  RENOVADOR_CARREIRA: {
    id: 'RENOVADOR_CARREIRA', type: 'positive', rarity: 'rare',
    label: 'Renovador de Carreiras', icon: '🔄',
    description: 'Já recuperou jogador em queda. Aumenta probabilidade de Late Bloomer.',
  },
  DESCOBRIDOR_TALENTOS: {
    id: 'DESCOBRIDOR_TALENTOS', type: 'positive', rarity: 'common',
    label: 'Descobridor de Talentos', icon: '🔭',
    description: 'Especialidade em identificar e desenvolver potencial jovem não óbvio.',
  },
  LONGA_PARCERIA: {
    id: 'LONGA_PARCERIA', type: 'positive', rarity: 'uncommon',
    label: 'Parceria Longeva', icon: '🤝',
    description: 'Bônus cumulativo quando trabalha com o mesmo pupilo por 3+ temporadas.',
  },

  // ── NEGATIVOS ──────────────────────────────────────────────────
  BURNOUT_RISK: {
    id: 'BURNOUT_RISK', type: 'negative', rarity: 'common',
    label: 'Risco de Burnout', icon: '💔',
    description: 'Chance aumentada de pedir demissão após série de resultados ruins.',
  },
  INCOMPATIVEL_VOLATIL: {
    id: 'INCOMPATIVEL_VOLATIL', type: 'negative', rarity: 'common',
    label: 'Incompatível com Voláteis', icon: '⚡',
    description: 'Conflito frequente com jogadores de estilo VOLATILE ou EXPLOSIVE.',
  },
  RIGIDO_DEMAIS: {
    id: 'RIGIDO_DEMAIS', type: 'negative', rarity: 'common',
    label: 'Rígido Demais', icon: '🗿',
    description: 'Reduz criatividade em jogadores de estilo livre. Não se adapta ao TAKEALLRISK.',
  },
  PREFERE_VETERANOS: {
    id: 'PREFERE_VETERANOS', type: 'negative', rarity: 'common',
    label: 'Prefere Veteranos', icon: '👴',
    description: 'Penalidade de desenvolvimento com jogadores abaixo de 21 anos.',
  },
  PREFERE_JOVENS: {
    id: 'PREFERE_JOVENS', type: 'negative', rarity: 'common',
    label: 'Prefere Jovens', icon: '👶',
    description: 'Penalidade de desenvolvimento com jogadores acima de 28 anos.',
  },
};

/**
 * Tiers de DNA de coach. Determinam o número de slots de traits.
 */
export const COACH_DNA_TIERS = [
  { id: 'EXCEPCIONAL', minScore: 85, label: 'Excepcional', color: '#FFD700', slots: { positive: 3, negative: 1 } },
  { id: 'ALTO',        minScore: 70, label: 'Alto',        color: '#C0C0C0', slots: { positive: 2, negative: 1 } },
  { id: 'BOM',         minScore: 50, label: 'Bom',         color: '#CD7F32', slots: { positive: 1, negative: 1 } },
  { id: 'NORMAL',      minScore: 30, label: 'Normal',      color: '#888888', slots: { positive: 1, negative: 0 } },
  { id: 'FRACO',       minScore:  0, label: 'Fraco',       color: '#555555', slots: { positive: 0, negative: 1 } },
];

/** Retorna o tier de DNA de um coach pelo score. */
export function getCoachDnaTier(dnaScore) {
  return COACH_DNA_TIERS.find(t => dnaScore >= t.minScore)
    ?? COACH_DNA_TIERS[COACH_DNA_TIERS.length - 1];
}

const _POSITIVE_TRAIT_POOL_BASE = [
  'FORMADOR_PRODIGIO', 'MAGO_DO_MENTAL', 'ESPECIALISTA_SAIBRO',
  'ESPECIALISTA_GRAMA', 'ESPECIALISTA_HARD', 'GURU_SAQUE',
  'RENOVADOR_CARREIRA', 'DESCOBRIDOR_TALENTOS',
];
const _NEGATIVE_TRAIT_POOL = [
  'BURNOUT_RISK', 'INCOMPATIVEL_VOLATIL', 'RIGIDO_DEMAIS',
  'PREFERE_VETERANOS', 'PREFERE_JOVENS',
];

/** Gera o DNA score de um coach (0–100). */
function generateDnaScore({ reputation = 50, origin = 'GENERATED', careerPeakRank = 999, careerSlams = 0 } = {}) {
  let base = randInt(15, 65);
  if (reputation >= 75) base += randInt(10, 20);
  else if (reputation >= 50) base += randInt(4, 12);
  if (origin === 'RETIRED_PLAYER') {
    if (careerSlams >= 3)             base += 22;
    else if (careerSlams >= 1)        base += 12;
    if ((careerPeakRank ?? 999) <= 5)  base += 16;
    else if ((careerPeakRank ?? 999) <= 20) base += 8;
    else if ((careerPeakRank ?? 999) <= 50) base += 4;
  }
  return Math.min(100, base);
}

/** Gera a lista de traits de um coach baseada no DNA e contexto. */
function generateCoachTraits({ dnaScore, philosophy, specialtySurface, origin, careerPeakRank }) {
  const tier   = getCoachDnaTier(dnaScore);
  const traits = [];

  // EX_LENDA: reservado para ex-top 10
  if (origin === 'RETIRED_PLAYER' && (careerPeakRank ?? 999) <= 10) {
    traits.push('EX_LENDA');
  }

  // Monta pool positivo com prioridades contextuais
  let posPool = [..._POSITIVE_TRAIT_POOL_BASE];
  if (specialtySurface === 'CLAY')
    posPool = ['ESPECIALISTA_SAIBRO', ...posPool.filter(t => t !== 'ESPECIALISTA_SAIBRO')];
  else if (specialtySurface === 'GRASS')
    posPool = ['ESPECIALISTA_GRAMA', ...posPool.filter(t => t !== 'ESPECIALISTA_GRAMA')];
  else if (specialtySurface === 'HARD' || specialtySurface === 'INDOOR')
    posPool = ['ESPECIALISTA_HARD', ...posPool.filter(t => t !== 'ESPECIALISTA_HARD')];

  if (philosophy === 'OFFENSIVE')
    posPool = ['GURU_SAQUE', ...posPool.filter(t => t !== 'GURU_SAQUE')];
  if (philosophy === 'MENTAL' || philosophy === 'COMPLETE')
    posPool = ['DESCOBRIDOR_TALENTOS', 'FORMADOR_PRODIGIO', ...posPool.filter(t => !['DESCOBRIDOR_TALENTOS','FORMADOR_PRODIGIO'].includes(t))];

  // Slots positivos restantes (descontando EX_LENDA se já foi adicionado)
  const posSlots = Math.max(0, tier.slots.positive - (traits.includes('EX_LENDA') ? 1 : 0));
  const posShuffled = [...posPool].sort(() => Math.random() - 0.5);
  for (let i = 0; i < posSlots && i < posShuffled.length; i++) {
    traits.push(posShuffled[i]);
  }

  // Slots negativos
  if (tier.slots.negative > 0) {
    const negShuffled = [..._NEGATIVE_TRAIT_POOL].sort(() => Math.random() - 0.5);
    traits.push(negShuffled[0]);
  }

  return traits;
}


// ═══════════════════════════════════════════════════════════════════
// ENVELHECIMENTO — HELPERS DE IDADE
// ═══════════════════════════════════════════════════════════════════

/**
 * Gera a idade inicial de um coach (42–68) com distribuição realista.
 * Retorna { age, birthYear }.
 */
function generateCoachAge(season) {
  const r = Math.random();
  let age;
  if      (r < 0.10) age = randInt(42, 44);  // jovens-coaches (raro)
  else if (r < 0.50) age = randInt(45, 54);  // meia carreira
  else if (r < 0.85) age = randInt(55, 63);  // veteranos ativos
  else               age = randInt(64, 68);  // senior (raro)
  return { age, birthYear: (season ?? 2024) - age };
}


// ═══════════════════════════════════════════════════════════════════
// BIO & TAGLINE
// ═══════════════════════════════════════════════════════════════════

function generateCoachTagline(persona) {
  const pool = COACH_PERSONAS[persona]?.taglines ?? [];
  return pool.length ? pickRandom(pool) : '';
}

function generateCoachBio(persona, firstName, careerAsPlayer) {
  const templates = COACH_PERSONAS[persona]?.bioTemplates
    ?? COACH_PERSONAS.VETERANO_SECO.bioTemplates;
  let bio = pickRandom(templates).replace(/{firstName}/g, firstName);

  if (careerAsPlayer?.peakRank) {
    const r = careerAsPlayer.peakRank;
    const prefix = r <= 5  ? `Ex-top ${r} do mundo. `
                 : r <= 20 ? `Chegou ao top ${r} no circuito. `
                 : r <= 50 ? `Fez carreira sólida no top 50. `
                 : '';
    if (prefix) bio = prefix + bio;
  }

  if (careerAsPlayer?.slams > 0) {
    const s = careerAsPlayer.slams;
    bio += ` ${s === 1 ? 'Um Grand Slam no currículo' : `${s} Grand Slams conquistados`}.`;
  }

  return bio;
}


// ═══════════════════════════════════════════════════════════════════
// POOLS DE NOMES — ESPELHADOS DE NewgenSystem.js
// ═══════════════════════════════════════════════════════════════════
// Coaches podem ter nomes de qualquer nacionalidade do circuito.
// Mantemos cópia local para não criar import circular.

const COACH_NAME_POOLS = {
  ITA: {
    first: ['Marco', 'Luca', 'Alessandro', 'Giovanni', 'Federico', 'Matteo', 'Andrea', 'Filippo', 'Lorenzo', 'Davide', 'Roberto', 'Stefano'],
    last:  ['Conti', 'Ferrara', 'Esposito', 'Ricci', 'Bianchi', 'Moretti', 'Romano', 'Colombo', 'Mancini', 'Vitale', 'De Luca', 'Barbieri'],
  },
  ESP: {
    first: ['Carlos', 'Pablo', 'Alejandro', 'Sergio', 'Javier', 'Miguel', 'Roberto', 'Diego', 'Álvaro', 'Iván', 'Fernando', 'Raúl'],
    last:  ['García', 'Martínez', 'López', 'Sánchez', 'Romero', 'Torres', 'Jiménez', 'Navarro', 'Moreno', 'Ruiz', 'Herrera', 'Vega'],
  },
  FRA: {
    first: ['Antoine', 'Baptiste', 'Clément', 'Damien', 'Étienne', 'François', 'Gauthier', 'Hugo', 'Julien', 'Kevin', 'Romain', 'Vincent'],
    last:  ['Dupont', 'Martin', 'Bernard', 'Lefebvre', 'Moreau', 'Simon', 'Laurent', 'Petit', 'Thomas', 'Girard', 'Renard', 'Blanc'],
  },
  GER: {
    first: ['Felix', 'Jonas', 'Lukas', 'Maximilian', 'Niklas', 'Patrick', 'Simon', 'Stefan', 'Tobias', 'Alexander', 'Florian', 'Jan'],
    last:  ['Müller', 'Schmidt', 'Schneider', 'Fischer', 'Weber', 'Meyer', 'Wagner', 'Becker', 'Hoffmann', 'Schulz', 'Koch', 'Richter'],
  },
  RUS: {
    first: ['Aleksei', 'Dmitri', 'Ivan', 'Kirill', 'Maxim', 'Nikita', 'Pavel', 'Roman', 'Sergei', 'Vladimir', 'Andrei', 'Boris'],
    last:  ['Volkov', 'Petrov', 'Smirnov', 'Kuznetsov', 'Popov', 'Sokolov', 'Lebedev', 'Kozlov', 'Novikov', 'Morozov', 'Orlov', 'Fedorov'],
  },
  SRB: {
    first: ['Nikola', 'Stefan', 'Marko', 'Aleksa', 'Filip', 'Lazar', 'Milan', 'Bojan', 'Dragan', 'Igor', 'Nemanja', 'Dejan'],
    last:  ['Troicki', 'Krajinović', 'Lajović', 'Kecmanović', 'Milojević', 'Vasić', 'Bjelica', 'Stanković', 'Perić', 'Djordjević', 'Simić', 'Ristić'],
  },
  SWE: {
    first: ['Erik', 'Johan', 'Karl', 'Lars', 'Magnus', 'Mikael', 'Nils', 'Oskar', 'Pontus', 'Viktor', 'Henrik', 'Peter'],
    last:  ['Björk', 'Eriksson', 'Gustafsson', 'Hansson', 'Johansson', 'Larsson', 'Lindqvist', 'Nilsson', 'Svensson', 'Pettersson', 'Lindström', 'Holm'],
  },
  NOR: {
    first: ['Anders', 'Christian', 'Erik', 'Håkon', 'Jonas', 'Lars', 'Morten', 'Ola', 'Stig', 'Tor', 'Bjørn', 'Rune'],
    last:  ['Berg', 'Dahl', 'Hansen', 'Johansen', 'Larsen', 'Olsen', 'Andersen', 'Kristiansen', 'Haugen', 'Strand', 'Bakke', 'Lie'],
  },
  BRA: {
    first: ['André', 'Bruno', 'Carlos', 'Daniel', 'Eduardo', 'Felipe', 'Gabriel', 'Henrique', 'Igor', 'João', 'Marcelo', 'Ricardo'],
    last:  ['Silva', 'Santos', 'Oliveira', 'Souza', 'Costa', 'Lima', 'Carvalho', 'Almeida', 'Ferreira', 'Rodrigues', 'Barbosa', 'Martins'],
  },
  ARG: {
    first: ['Agustín', 'Diego', 'Ezequiel', 'Facundo', 'Gastón', 'Horacio', 'Ignacio', 'Joaquín', 'Leonardo', 'Marcos', 'Nicolás', 'Sebastián'],
    last:  ['García', 'González', 'Rodríguez', 'Fernández', 'López', 'Martínez', 'Romero', 'Sosa', 'Torres', 'Álvarez', 'Pereyra', 'Cabrera'],
  },
  USA: {
    first: ['Austin', 'Brandon', 'Chase', 'Dylan', 'Ethan', 'Finn', 'Grant', 'Hunter', 'Jake', 'Kyle', 'Mason', 'Tyler'],
    last:  ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Davis', 'Wilson', 'Anderson', 'Taylor', 'Moore', 'Harris', 'Clark'],
  },
  JPN: {
    first: ['Daichi', 'Haruto', 'Kenji', 'Kohei', 'Makoto', 'Naoki', 'Ryu', 'Shota', 'Takeshi', 'Yuki', 'Hiroshi', 'Kazuki'],
    last:  ['Yamamoto', 'Nakamura', 'Suzuki', 'Tanaka', 'Watanabe', 'Inoue', 'Kimura', 'Kobayashi', 'Sato', 'Ito', 'Kato', 'Hayashi'],
  },
  KOR: {
    first: ['Junho', 'Minho', 'Sehun', 'Seungwoo', 'Taehyun', 'Wonseok', 'Yongjun', 'Jihoon', 'Dongwoo', 'Hyunwoo', 'Jinwoo', 'Sanghoon'],
    last:  ['Kim', 'Lee', 'Park', 'Choi', 'Jung', 'Kang', 'Cho', 'Yoon', 'Jang', 'Lim', 'Oh', 'Shin'],
  },
  CHN: {
    first: ['Chen', 'Fang', 'Hao', 'Jian', 'Lei', 'Ming', 'Peng', 'Qiang', 'Wei', 'Xin', 'Yang', 'Zheng'],
    last:  ['Wang', 'Li', 'Zhang', 'Liu', 'Chen', 'Yang', 'Zhao', 'Huang', 'Zhou', 'Wu', 'Xu', 'Sun'],
  },
  AUS: {
    first: ['Callum', 'Damian', 'Flynn', 'Hugh', 'Jack', 'Lachlan', 'Noah', 'Riley', 'Ryan', 'Zac', 'Hamish', 'Owen'],
    last:  ['Smith', 'Jones', 'Williams', 'Taylor', 'Brown', 'Wilson', 'Davis', 'Martin', 'Cooper', 'Anderson', 'Murphy', 'Walker'],
  },
  RSA: {
    first: ['Sipho', 'Thabo', 'Mandla', 'Bongani', 'Siyanda', 'Lwazi', 'Khaya', 'Sifiso', 'Mthokozisi', 'Sandile', 'Lungelo', 'Nkosana'],
    last:  ['Dlamini', 'Khumalo', 'Mthembu', 'Ndlovu', 'Nkosi', 'Sibiya', 'Zulu', 'Mkhize', 'Ntuli', 'Cele', 'Mthethwa', 'Ngcobo'],
  },
  EGY: {
    first: ['Ahmed', 'Ali', 'Hassan', 'Karim', 'Mohamed', 'Omar', 'Samir', 'Tarek', 'Walid', 'Youssef', 'Mahmoud', 'Khaled'],
    last:  ['Ibrahim', 'Hassan', 'Ali', 'Khalil', 'Farouk', 'Naguib', 'Rashid', 'Saleh', 'Mansour', 'Aziz', 'Fouad', 'Amin'],
  },
  // Nacionalidades adicionais para coaches (ex-jogadores de nações não cobertas)
  DEN: {
    first: ['Anders', 'Casper', 'Frederik', 'Jonas', 'Mikkel', 'Rasmus', 'Simon', 'Søren', 'Thomas', 'Viktor'],
    last:  ['Jensen', 'Nielsen', 'Hansen', 'Pedersen', 'Andersen', 'Christensen', 'Larsen', 'Sørensen', 'Rasmussen', 'Jørgensen'],
  },
  GRE: {
    first: ['Alexis', 'Christos', 'Dimitris', 'Giorgos', 'Kostas', 'Nikos', 'Panagiotis', 'Stavros', 'Takis', 'Yannis'],
    last:  ['Papadopoulos', 'Alexandrou', 'Nikolaou', 'Georgiou', 'Petrakis', 'Konstantinou', 'Dimitriou', 'Anagnostopoulos', 'Vasiliou', 'Makris'],
  },
  HUN: {
    first: ['Ádám', 'Balázs', 'Dávid', 'Gábor', 'István', 'Máté', 'Péter', 'Tamás', 'Zoltán', 'Zsolt'],
    last:  ['Nagy', 'Kovács', 'Tóth', 'Szabó', 'Horváth', 'Varga', 'Kiss', 'Molnár', 'Németh', 'Farkas'],
  },
  DEFAULT: {
    first: ['Adrian', 'Bruno', 'Carlos', 'David', 'Emil', 'Fabio', 'George', 'Hassan', 'Ivan', 'James', 'Karim', 'Luis'],
    last:  ['Costa', 'Diallo', 'Evans', 'Foster', 'Grant', 'Hassan', 'Ibrahim', 'Joao', 'Klein', 'Lopez', 'Mensah', 'Nava'],
  },
};

// Pesos de nacionalidade para coaches (levemente diferente dos jogadores —
// inclui nações com tradição de treino mesmo sem muitos jogadores ativos)
const COACH_NATIONALITY_WEIGHTS = {
  ESP: 10, ITA: 8, FRA: 8, GER: 7, AUS: 6, USA: 6,
  SRB: 5,  BRA: 5, ARG: 5, RUS: 4, JPN: 4,
  SWE: 3,  NOR: 3, KOR: 3, CHN: 3,
  RSA: 2,  EGY: 2, DEN: 2, GRE: 2, HUN: 2, AUS: 4,
};

const COACH_NATIONALITIES = Object.keys(COACH_NATIONALITY_WEIGHTS);

function pickCoachNationality() {
  const items = COACH_NATIONALITIES.map(id => ({
    id,
    weight: COACH_NATIONALITY_WEIGHTS[id] ?? 1,
  }));
  return weightedRandom(items);
}

function generateCoachName(nationality) {
  const pool = COACH_NAME_POOLS[nationality] ?? COACH_NAME_POOLS.DEFAULT;
  const first = pickRandom(pool.first);
  const last  = pickRandom(pool.last);
  return { firstName: first, lastName: last, fullName: `${first} ${last}` };
}


// ═══════════════════════════════════════════════════════════════════
// GERAÇÃO DE COACH SINTÉTICO
// ═══════════════════════════════════════════════════════════════════

/**
 * Distribuição de filosofias no pool gerado.
 * Pesos refletem o circuito real: mais técnicos ofensivos/defensivos,
 * menos especialistas puros e mentais.
 */
const PHILOSOPHY_WEIGHTS = [
  { id: 'OFFENSIVE',  weight: 28 },
  { id: 'DEFENSIVE',  weight: 25 },
  { id: 'COMPLETE',   weight: 22 },
  { id: 'SPECIALIST', weight: 14 },
  { id: 'MENTAL',     weight: 11 },
];

const SURFACES = ['CLAY', 'GRASS', 'HARD', 'INDOOR'];
// Clay e Hard são mais comuns que Grass e Indoor
const SURFACE_WEIGHTS = [
  { id: 'CLAY',   weight: 35 },
  { id: 'HARD',   weight: 30 },
  { id: 'GRASS',  weight: 20 },
  { id: 'INDOOR', weight: 15 },
];

function pickPhilosophy() {
  return weightedRandom(PHILOSOPHY_WEIGHTS);
}

function pickSurface() {
  return weightedRandom(SURFACE_WEIGHTS);
}

/**
 * Gera um técnico sintético (origin: 'GENERATED').
 *
 * @param {number} season    - Temporada de criação
 * @param {object} opts      - Overrides opcionais
 * @param {string} [opts.philosophy]
 * @param {string} [opts.nationality]
 * @param {string} [opts.specialtySurface]
 * @param {number} [opts.reputationBase]  - Reputação inicial (0-100)
 * @param {number} [opts.age]             - Idade override
 * @param {string} [opts.persona]         - Persona override
 * @param {string} [opts.coachingStyle]   - Estilo override
 */
export function generateCoach(season, opts = {}) {
  const nationality      = opts.nationality     ?? pickCoachNationality();
  const philosophy       = opts.philosophy      ?? pickPhilosophy();
  const specialtySurface = philosophy === 'SPECIALIST'
    ? (opts.specialtySurface ?? pickSurface())
    : null;

  const nameObj  = generateCoachName(nationality);
  const slug     = slugify(nameObj.lastName);
  const id       = `COACH_${slug}_${season}_${_coachCounter++}`;

  const specialty = pickSpecialtyAttrs(philosophy, specialtySurface);

  const repBase   = opts.reputationBase ?? opts.reputation ?? randInt(15, 62);
  const reputation = Math.min(100, repBase);

  // ── Identidade rica ────────────────────────────────────────────
  const { age, birthYear } = opts.age
    ? { age: opts.age, birthYear: (season ?? 2024) - opts.age }
    : generateCoachAge(season);

  const persona       = opts.persona       ?? pickCoachPersona(philosophy);
  const coachingStyle = opts.coachingStyle ?? pickCoachingStyle(philosophy);
  const tagline       = generateCoachTagline(persona);
  const bio           = generateCoachBio(persona, nameObj.firstName, null);

  // ── DNA & Traits ───────────────────────────────────────────────
  const dnaScore = generateDnaScore({ reputation, origin: 'GENERATED' });
  const dnaTier  = getCoachDnaTier(dnaScore).id;
  const traits   = generateCoachTraits({
    dnaScore, philosophy, specialtySurface, origin: 'GENERATED', careerPeakRank: 999,
  });

  return {
    // ── Identidade ──────────────────────────────────────────────
    id,
    origin:          'GENERATED',
    playerId:        null,

    name:            nameObj.lastName,
    firstName:       nameObj.firstName,
    fullName:        nameObj.fullName,
    nationality,

    age,
    birthYear,

    // ── Personalidade ───────────────────────────────────────────
    persona,
    coachingStyle,
    tagline,
    bio,

    // ── Filosofia e especialidade ────────────────────────────────
    philosophy,
    specialty,
    specialtySurface,

    // ── DNA & Traits ─────────────────────────────────────────────
    dnaScore,
    dnaTier,
    traits,

    // ── Reputação ────────────────────────────────────────────────
    reputation,
    reputationPeak:  reputation,

    // ── Status — máquina de estados de ciclo de vida ─────────────
    // FREE_AGENT | ACTIVE | HIATUS | RETIRED
    coachStatus:     'FREE_AGENT',
    availability:    'FREE',      // mantido para backward-compat
    currentPupilId:  null,

    // ── Histórico de pupilos ─────────────────────────────────────
    formerPupils: [],

    // ── Carreira como jogador ────────────────────────────────────
    careerAsPlayer:  null,
    careerPeakRank:  null,
    careerSlams:     0,
    careerTitles:    0,
    retirementType:  null,

    // ── Atributos numéricos (CoachProfiles) ─────────────────────
    coachAttrs: generateCoachAttrs({ reputation, philosophy, origin: 'GENERATED', persona }),

    // ── Arquétipo: pacote fixo de bônus nos attrs do jogador ─────
    // Ativo enquanto a parceria durar; some com a saída do técnico.
    archetypeId: assignArchetype({ philosophy, specialtySurface }),

    // ── Signature Shot ensinável (Fase 7) ───────────────────────
    signature: rollCoachSignature(philosophy ?? 'ALL_COURT'),

    // ── XP acumulado (Bloco C) ───────────────────────────────────
    coachingXP:      0,

    // ── Controle interno ─────────────────────────────────────────
    _createdSeason:  season,
    _tacticLog:      [],
  };
}


// ═══════════════════════════════════════════════════════════════════
// POOL DE COACHES
// ═══════════════════════════════════════════════════════════════════

/**
 * Gera o pool inicial de técnicos para o universo.
 *
 * Tour: 128 jogadores + 32 prospects = 160 ativos.
 * Pool de coaches = 30% maior = ceil(160 * 1.3) = 208.
 *
 * A distribuição garante que cada filosofia esteja representada
 * de forma proporcional ao seu peso, com pelo menos 10 de cada.
 *
 * @param {number} season  - Temporada atual
 * @param {number} count   - Tamanho do pool (default 208)
 */
export function generateCoachPool(season, count = 208) {
  const pool = [];

  // ── 1. Garante mínimo de representação por filosofia ──────────
  // Pelo menos 10 coaches de cada filosofia no pool inicial
  const MIN_PER_PHILOSOPHY = 10;
  for (const phil of COACH_PHILOSOPHIES) {
    for (let i = 0; i < MIN_PER_PHILOSOPHY; i++) {
      pool.push(generateCoach(season, { philosophy: phil }));
    }
  }
  // Mínimo de 5 SPECIALIST por surface (20 total)
  const MIN_PER_SURFACE = 5;
  for (const surface of SURFACES) {
    for (let i = 0; i < MIN_PER_SURFACE; i++) {
      pool.push(generateCoach(season, {
        philosophy:      'SPECIALIST',
        specialtySurface: surface,
      }));
    }
  }

  // ── 2. Preenche restante com distribuição ponderada ───────────
  const guaranteed = pool.length; // MIN_PER_PHILOSOPHY*5 + MIN_PER_SURFACE*4 = 70
  const remaining  = Math.max(0, count - guaranteed);
  for (let i = 0; i < remaining; i++) {
    pool.push(generateCoach(season));
  }

  // ── 3. Distribui reputações de forma realista ─────────────────
  // A maioria (70%) tem rep baixa/média (15-55)
  // Minoria significativa (25%) tem rep média-alta (55-75)
  // Poucos (5%) têm rep alta (75-90) — "grandes nomes" gerados
  pool.forEach((coach, idx) => {
    const r = Math.random();
    let rep;
    if (r < 0.70)       rep = randInt(15, 55);
    else if (r < 0.95)  rep = randInt(55, 75);
    else                rep = randInt(75, 90);
    coach.reputation     = rep;
    coach.reputationPeak = rep;
    // Regenerar attrs com a reputação final — o generateCoach usava rep provisória
    coach.coachAttrs = generateCoachAttrs({
      reputation: rep,
      philosophy: coach.philosophy,
      origin:     coach.origin,
      persona:    coach.persona,
    });
    // Garante archetypeId (pool pode ter sido gerado antes dessa feature)
    if (!coach.archetypeId) {
      coach.archetypeId = assignArchetype(coach);
    }
  });

  return pool;
}


// ═══════════════════════════════════════════════════════════════════
// UTILITÁRIOS
// ═══════════════════════════════════════════════════════════════════

/**
 * Busca um coach pelo id no pool.
 * @param {Array}  pool
 * @param {string} id
 * @returns {object|null}
 */
export function getCoachById(pool, id) {
  return pool?.find(c => c.id === id) ?? null;
}

/**
 * Coaches disponíveis para contratação (availability: 'FREE').
 * @param {Array} pool
 * @returns {Array}
 */
export function getAvailableCoaches(pool) {
  return (pool ?? []).filter(c => c.availability === 'FREE');
}

/**
 * Label legível para UI — ex: "⚡ Ofensivo · Clay"
 */
export function getCoachLabel(coach) {
  const phil = PHILOSOPHY_ATTRS[coach.philosophy];
  const icon  = phil?.icon  ?? '🎾';
  const label = phil?.label ?? coach.philosophy;
  const surf  = coach.specialtySurface ? ` · ${coach.specialtySurface}` : '';
  return `${icon} ${label}${surf}`;
}

/**
 * Retorna o fator de escala de reputação (0-1) para aplicar
 * nos multiplicadores de crescimento (fase 3).
 *
 * Rep 80+  → 1.00 (bônus pleno)
 * Rep 40-79 → 0.70
 * Rep <40  → 0.40 (coach em crise ou iniciante)
 */
export function getReputationFactor(coach) {
  if (!coach) return 1.0;
  // Reputação escala o BOOST — nunca penaliza abaixo de 1.0
  // Rep 0–39:  +0%   (coach iniciante: só a filosofia ajuda)
  // Rep 40–79: +15%  (coach decente: amplifica levemente)
  // Rep 80+:   +30%  (coach de elite: amplificador real)
  if (coach.reputation >= 80) return 1.30;
  if (coach.reputation >= 40) return 1.15;
  return 1.00;
}

/**
 * Serialização para save/load (garante que pool é plain JSON).
 */
export function serializeCoachPool(pool) {
  return JSON.parse(JSON.stringify(pool ?? []));
}

export function deserializeCoachPool(data) {
  return Array.isArray(data) ? data : [];
}


// ═══════════════════════════════════════════════════════════════════
// FASE 2 — CONTRATOS
// ═══════════════════════════════════════════════════════════════════

/**
 * Razões de demissão. Usadas em coachHistory e Chronicle (fase 6).
 */
export const DISMISSAL_REASONS = {
  VOLUNTARY:          { id: 'VOLUNTARY',         label: 'Decisão própria',     icon: '🚪' },
  RESULTS:            { id: 'RESULTS',            label: 'Resultados fracos',   icon: '📉' },
  CONFLICT:           { id: 'CONFLICT',           label: 'Conflito técnico',    icon: '⚡' },
  RETIREMENT_PLAYER:  { id: 'RETIREMENT_PLAYER',  label: 'Aposentadoria',       icon: '🏁' },
  MUTUAL:             { id: 'MUTUAL',             label: 'Mútuo acordo',        icon: '🤝' },
};

/**
 * Conta quantos títulos o jogador conquistou durante o período com este técnico.
 * Usa _seasonHistory do jogador (preenchido pelo DevelopmentSystem).
 *
 * @param {object} player
 * @param {number} startSeason
 * @param {number} endSeason  (inclusive)
 */
export function countTitlesUnder(player, startSeason, endSeason) {
  const hist = player._seasonHistory ?? [];
  return hist
    .filter(h => h.year >= startSeason && h.year <= endSeason && h.titleWon)
    .length;
}

/**
 * Retorna o melhor ranking que o jogador atingiu durante o período.
 * Usa _rankHistory se existir, senão usa rankPosition atual como fallback.
 *
 * @param {object} player
 * @param {number} startSeason
 * @param {number} endSeason
 */
export function getPeakRankUnder(player, startSeason, endSeason) {
  // _rankHistory é { year: number, rank: number }[] — populado no ADVANCE_YEAR (fase futura)
  const hist = player._rankHistory ?? [];
  const inPeriod = hist.filter(h => h.year >= startSeason && h.year <= endSeason);
  if (inPeriod.length > 0) {
    return Math.min(...inPeriod.map(h => h.rank));
  }
  // Fallback: ranking atual
  return player.rankPosition ?? 999;
}

/**
 * Contrata um técnico para um jogador.
 * Retorna { player, coach } atualizados (imutável — retorna cópias).
 *
 * @param {object} player
 * @param {object} coach
 * @param {number} season   - Temporada atual
 * @throws {Error}          - Se jogador já tem técnico ou técnico não está livre
 */
export function hireCoach(player, coach, season) {
  if (player.coach) {
    throw new Error(`${player.name} já tem técnico (${player.coach.coachId}). Demita primeiro.`);
  }
  if (coach.availability !== 'FREE') {
    throw new Error(`${coach.fullName} não está disponível (${coach.availability}).`);
  }

  const updatedPlayer = {
    ...player,
    coach: {
      coachId:          coach.id,
      name:             coach.name,
      fullName:         coach.fullName,
      philosophy:       coach.philosophy,
      specialty:        coach.specialty,
      specialtySurface: coach.specialtySurface ?? null,
      startSeason:      season,
      // campos novos — Bloco A
      persona:          coach.persona          ?? null,
      coachingStyle:    coach.coachingStyle    ?? null,
      traits:           coach.traits           ?? [],
      dnaScore:         coach.dnaScore         ?? null,
      // snapshot dos atributos para uso no DevelopmentSystem sem precisar do pool
      coachAttrs:           coach.coachAttrs ?? null,
      reputationSnapshot:   coach.reputation ?? 50,
      signature:            coach.signature  ?? null,  // Fase 7 — signature ensinável
      archetypeId:          coach.archetypeId ?? null, // bônus ativos nos attrs do jogador
    },
    coachHistory: player.coachHistory ?? [],
  };

  const updatedCoach = {
    ...coach,
    coachStatus:    'ACTIVE',
    availability:   'CONTRACTED',
    currentPupilId: player.id,
  };

  return { player: updatedPlayer, coach: updatedCoach };
}

/**
 * Demite o técnico de um jogador.
 * Registra no coachHistory do jogador e libera o técnico.
 * Retorna { player, coach, historyEntry } atualizados.
 *
 * @param {object} player
 * @param {object} coach
 * @param {number} season        - Temporada atual
 * @param {string} reason        - id de DISMISSAL_REASONS (default 'VOLUNTARY')
 */
export function fireCoach(player, coach, season, reason = 'VOLUNTARY') {
  if (!player.coach || player.coach.coachId !== coach.id) {
    throw new Error(`${player.name} não tem ${coach.fullName} como técnico.`);
  }

  const startSeason = player.coach.startSeason ?? season;

  const historyEntry = {
    coachId:          coach.id,
    name:             coach.name,
    fullName:         coach.fullName ?? coach.name,
    philosophy:       coach.philosophy,
    specialty:        coach.specialty ?? [],
    specialtySurface: coach.specialtySurface ?? null,
    startSeason,
    endSeason:        season,
    seasons:          season - startSeason,
    titlesUnder:      countTitlesUnder(player, startSeason, season),
    peakRankUnder:    getPeakRankUnder(player, startSeason, season),
    dismissalReason:  reason,
    // Dados extras do coach para exibir na ficha mesmo depois que ele sair do pool
    coachOrigin:      coach.origin ?? 'GENERATED',
    coachRepAtFiring: coach.reputation,
  };

  const updatedPlayer = {
    ...player,
    coach: null,
    coachHistory: [...(player.coachHistory ?? []), historyEntry],
  };

  // Penalidade de reputação por demissão por resultados ou conflito
  let newRep = coach.reputation;
  if (reason === 'RESULTS')   newRep = Math.max(0, newRep - 8);
  if (reason === 'CONFLICT')  newRep = Math.max(0, newRep - 5);

  // Adicionar pupilo ao histórico do coach
  const formerEntry = {
    playerId:      player.id,
    playerName:    player.name ?? player.id,
    startSeason,
    endSeason:     season,
    titlesUnder:   historyEntry.titlesUnder,
    peakRankUnder: historyEntry.peakRankUnder,
    dismissalReason: reason,
  };

  const updatedCoach = {
    ...coach,
    reputation:     newRep,
    coachStatus:    'FREE_AGENT',
    availability:   'FREE',
    currentPupilId: null,
    formerPupils:   [...(coach.formerPupils ?? []), formerEntry],
  };

  return { player: updatedPlayer, coach: updatedCoach, historyEntry };
}

/**
 * Atualiza a reputação de todos os técnicos contratados com base
 * nos resultados da temporada. Chamado no ADVANCE_YEAR.
 *
 * @param {object} coach
 * @param {object} player         - pupilo atual
 * @param {string|null} titleWon  - 'SLAM'|'MASTERS'|'ATP500'|'ATP250'|null
 * @param {number} seasonRank     - ranking final do pupilo na temporada
 * @param {number} prevRank       - ranking inicial/anterior
 */
export function updateCoachReputation(coach, player, titleWon, seasonRank, prevRank) {
  let delta = 0;

  // Bônus por título
  if (titleWon === 'SLAM')    delta += 15;
  else if (titleWon === 'MASTERS') delta += 8;
  else if (titleWon === 'ATP500')  delta += 4;
  else if (titleWon === 'ATP250')  delta += 2;

  // Bônus por ranking alto
  if (seasonRank <= 3)       delta += 6;
  else if (seasonRank <= 10) delta += 4;
  else if (seasonRank <= 20) delta += 2;
  else if (seasonRank <= 50) delta += 1;

  // Penalidade por queda de ranking significativa
  const prev = prevRank ?? (player.rankPosition ?? 999);
  if (seasonRank > prev + 30)      delta -= 5;
  else if (seasonRank > prev + 15) delta -= 2;

  const newRep = Math.min(100, Math.max(0, coach.reputation + delta));

  return {
    ...coach,
    reputation:     newRep,
    reputationPeak: Math.max(coach.reputationPeak ?? 0, newRep),
  };
}

/**
 * Aplica updateCoachReputation a todos os coaches contratados do pool.
 * Retorna novo array de coaches.
 *
 * @param {Array}  coachPool
 * @param {Array}  allPlayers       - tour + prospects
 * @param {object} titleWinners     - { playerId: titleType }
 * @param {object} prevRankMap      - { playerId: rankAnterior }
 */
export function updateAllCoachReputations(coachPool, allPlayers, titleWinners, prevRankMap = {}) {
  return coachPool.map(coach => {
    if (coach.availability !== 'CONTRACTED' || !coach.currentPupilId) return coach;
    const pupil = allPlayers.find(p => p.id === coach.currentPupilId);
    // Pupilo não encontrado = provavelmente aposentou; liberar coach
    if (!pupil) {
      return { ...coach, availability: 'FREE', currentPupilId: null };
    }
    const titleWon  = titleWinners[pupil.id] ?? null;
    const seasonRank = pupil.rankPosition ?? 999;
    const prevRank   = prevRankMap[pupil.id] ?? seasonRank;
    return updateCoachReputation(coach, pupil, titleWon, seasonRank, prevRank);
  });
}

// ═══════════════════════════════════════════════════════════════════
// FASE 4: MAPEAMENTO ESTILO → FILOSOFIA DE COACH
// ═══════════════════════════════════════════════════════════════════

/**
 * Mapeia o styleId de um jogador para filosofia e specialty de coach.
 * Usado por tryBecomeCoach() em RetirementSystem.js para herança técnica real.
 *
 * specialty: null → será calculado via top-2 attrs do jogador (COMPLETE/MENTAL)
 * surface:   string → apenas para SPECIALIST (NET_SPEC, SRV_VOL)
 */
export const STYLE_TO_COACH_PHILOSOPHY = {
  AGG_BASELINER: { philosophy: 'OFFENSIVE',  specialty: ['potencia', 'agressividade'],    surface: null },
  PWR_BASE:      { philosophy: 'OFFENSIVE',  specialty: ['potencia', 'agressividade'],    surface: null },
  BIG_SERVER:    { philosophy: 'OFFENSIVE',  specialty: ['saque', 'potencia'],            surface: null },
  RETRIEVER:     { philosophy: 'DEFENSIVE',  specialty: ['resistencia', 'regularidade'],  surface: null },
  GRINDER:       { philosophy: 'DEFENSIVE',  specialty: ['resistencia', 'regularidade'],  surface: null },
  CTR_PUNCHER:   { philosophy: 'DEFENSIVE',  specialty: ['controle', 'regularidade'],     surface: null },
  NET_SPEC:      { philosophy: 'SPECIALIST', specialty: ['jogoDeRede', 'saque'],          surface: 'GRASS' },
  SRV_VOL:       { philosophy: 'SPECIALIST', specialty: ['saque', 'jogoDeRede'],          surface: 'HARD'  },
  ALL_COURT:     { philosophy: 'COMPLETE',   specialty: null,                              surface: null },
  TACT_TEC:      { philosophy: 'COMPLETE',   specialty: null,                              surface: null },
  ADPT_TAC:      { philosophy: 'MENTAL',     specialty: ['leitura', 'mentalidade'],        surface: null },
};

// Atributos numéricos que representam skills reais (excluídos na busca de top attrs)
const _SKIP_ATTR_KEYS = new Set([
  'id', 'name', 'age', 'nationality', 'styleId', 'rankPosition',
  'physicalCondition', 'formPoints', '_ovrSnapshot',
]);

/**
 * Detecta a superfície dominante de um jogador aposentado via styleId.
 * Fallback: HARD (mais comum no circuito).
 * @param {object} retiredPlayer
 * @returns {string} 'CLAY'|'GRASS'|'HARD'|'INDOOR'
 */
export function detectDominantSurface(retiredPlayer) {
  const styleId = retiredPlayer.styleId ?? '';
  const mapping = STYLE_TO_COACH_PHILOSOPHY[styleId];
  if (mapping?.surface) return mapping.surface;
  // Estilo clay nativo
  if (['GRINDER', 'CTR_PUNCHER', 'RETRIEVER'].includes(styleId)) return 'CLAY';
  return 'HARD';
}

/**
 * Cria o objeto coach completo a partir de um jogador aposentado.
 * Usado internamente por tryBecomeCoach() em RetirementSystem.js.
 *
 * @param {object} retiredPlayer  - jogador com retirementInfo preenchido
 * @param {number} season         - temporada de criação
 * @param {string} philosophy     - filosofia derivada
 * @param {string[]} specialty    - attrs de especialidade derivados
 * @returns {object} coach
 */
export function coachFromRetiredPlayer(retiredPlayer, season, philosophy, specialty) {
  const name      = retiredPlayer.name ?? 'Unknown';
  const firstName = retiredPlayer.firstName ?? name;
  const slug      = slugify(name);
  const id        = `COACH_${slug}_${season}_${_coachCounter++}`;

  const specialtySurface = philosophy === 'SPECIALIST'
    ? detectDominantSurface(retiredPlayer)
    : null;

  const slams    = retiredPlayer._careerGrandSlams ?? 0;
  const titles   = retiredPlayer._careerTitles ?? 0;
  const rankPeak = retiredPlayer.rankPosition ?? 999;
  const baseRep  = Math.min(90,
    slams  * 20 +
    titles *  2 +
    (rankPeak <= 1  ? 20 : rankPeak <= 5  ? 15 : rankPeak <= 15 ? 8 : rankPeak <= 30 ? 4 : 0) +
    15,
  );
  const reputation = Math.max(20, Math.min(90, baseRep));

  // ── Identidade rica ──────────────────────────────────────────
  // Ex-jogadores entram no coaching com 38–52 anos tipicamente
  const retiredAge = retiredPlayer.age ?? 35;
  const age        = Math.max(38, Math.min(55, retiredAge + randInt(1, 4)));
  const birthYear  = (season ?? 2024) - age;

  const persona       = pickCoachPersona(philosophy);
  const coachingStyle = pickCoachingStyle(philosophy);

  const careerAsPlayer = {
    peakRank:  rankPeak < 999 ? rankPeak : null,
    slams,
    titles,
    styleId:   retiredPlayer.styleId ?? null,
    playerId:  retiredPlayer.id,
  };

  const tagline = generateCoachTagline(persona);
  const bio     = generateCoachBio(persona, firstName, careerAsPlayer);

  // ── DNA & Traits — ex-jogadores costumam ter DNA mais rico ──
  const dnaScore = generateDnaScore({
    reputation, origin: 'RETIRED_PLAYER', careerPeakRank: rankPeak, careerSlams: slams,
  });
  const dnaTier = getCoachDnaTier(dnaScore).id;
  const traits  = generateCoachTraits({
    dnaScore, philosophy, specialtySurface,
    origin: 'RETIRED_PLAYER', careerPeakRank: rankPeak,
  });

  return {
    id,
    origin:           'RETIRED_PLAYER',
    playerId:         retiredPlayer.id,

    name,
    firstName,
    fullName:         retiredPlayer.fullName ?? name,
    nationality:      retiredPlayer.nationality ?? 'Unknown',

    age,
    birthYear,

    persona,
    coachingStyle,
    tagline,
    bio,

    philosophy,
    specialty,
    specialtySurface,

    dnaScore,
    dnaTier,
    traits,

    reputation,
    reputationPeak:   reputation,

    coachStatus:      'FREE_AGENT',
    availability:     'FREE',
    currentPupilId:   null,
    formerPupils:     [],

    careerAsPlayer,
    careerPeakRank:   rankPeak < 999 ? rankPeak : null,
    careerSlams:      slams,
    careerTitles:     titles,
    retirementType:   retiredPlayer.retirementInfo?.type ?? null,

    coachAttrs: generateCoachAttrs({
      reputation,
      philosophy,
      origin: 'RETIRED_PLAYER',
      persona,
      careerPeakRank: rankPeak < 999 ? rankPeak : null,
      careerSlams: slams,
    }),

    // ── Arquétipo: bônus ativos enquanto parceria durar ──────────
    archetypeId: assignArchetype({ philosophy, specialtySurface }),

    coachingXP:       0,

    _createdSeason:   season,
    _tacticLog:       [],
  };
}


/**
 * Garante que o pool tenha ao menos `minFree` coaches livres.
 * Gera novos coaches sintéticos se necessário.
 *
 * @param {Array}  pool
 * @param {number} season
 * @param {number} minFree  (default 20)
 */
export function replenishCoachPool(pool, season, minFree = 20) {
  // Migra coaches antigos que não têm signature (saves anteriores à Fase 7)
  // e archetypeId (saves anteriores ao sistema de arquétipos)
  const migrated = pool.map(c => {
    let updated = c;
    if (!updated.signature) {
      updated = { ...updated, signature: rollCoachSignature(updated.philosophy ?? 'ALL_COURT') };
    }
    if (!updated.archetypeId) {
      updated = { ...updated, archetypeId: assignArchetype(updated) };
    }
    return updated;
  });

  const freeCount = migrated.filter(c => c.availability === 'FREE').length;
  if (freeCount >= minFree) return migrated;
  const needed = minFree - freeCount;
  const newCoaches = generateCoachPool(season, needed);
  return [...migrated, ...newCoaches];
}


// ═══════════════════════════════════════════════════════════════════
// BLOCO B — ENVELHECIMENTO & APOSENTADORIA DE COACHES
// ═══════════════════════════════════════════════════════════════════

/**
 * Calcula a chance base de aposentadoria de um coach (0.0 – 1.0).
 * Considera idade, traits, último resultado do pupilo e status.
 *
 * @param {object} coach        - objeto coach completo
 * @param {object|null} pupil   - jogador atual (pode ser null se FREE_AGENT)
 * @param {object} titleWinners - { playerId: titleObj } — vencedores da temporada
 * @returns {number} probabilidade entre 0.0 e 1.0
 */
export function calcCoachRetirementChance(coach, pupil, titleWinners = {}) {
  // Coaches RETIRED ou HIATUS não passam pelo ciclo normal
  if (coach.coachStatus === 'RETIRED') return 1.0;
  if (coach.coachStatus === 'HIATUS')  return 0.0; // tratado separado

  const age = coach.age ?? 50;
  let chance = 0.0;

  // Faixas de idade
  if      (age >= 70) chance = 0.30;
  else if (age >= 65) chance = 0.12;
  else if (age >= 60) chance = 0.05;
  else if (age >= 55) chance = 0.01;
  else                chance = 0.00;

  // Modificadores por trait
  const traits = coach.traits ?? [];
  if (traits.includes('BURNOUT_RISK')) chance += 0.08;

  // Reputação alta → coach ainda é valorizado, menos propenso a sair
  const rep = coach.reputation ?? 50;
  if (rep >= 85) chance = Math.max(0, chance - 0.05);

  // Pupilo ganhou Grand Slam nesta temporada → coach quer continuar
  if (pupil && titleWinners[pupil.id]?.category === 'grand_slam') {
    chance = Math.max(0, chance - 0.10);
  }

  // Pupilo ganhou qualquer título nesta temporada → pequeno bônus de permanência
  if (pupil && titleWinners[pupil.id]) {
    chance = Math.max(0, chance - 0.03);
  }

  return Math.min(1.0, chance);
}

/**
 * Processa o envelhecimento anual de todos os coaches e decide aposentadorias.
 *
 * Retorna:
 *   { pool, retiredCoaches, freedPupilIds }
 *
 *   pool            — array completo atualizado (aposentados têm coachStatus: 'RETIRED')
 *   retiredCoaches  — coaches que se aposentaram nesta passagem
 *   freedPupilIds   — ids de jogadores que ficaram sem técnico por aposentadoria
 *
 * @param {object[]} coachPool    - pool completo
 * @param {number}   season       - temporada atual
 * @param {object[]} allPlayers   - todos os jogadores (tour + prospects)
 * @param {object}   titleWinners - { playerId: titleObj }
 * @returns {{ pool: object[], retiredCoaches: object[], freedPupilIds: string[] }}
 */
export function ageCoachPool(coachPool, season, allPlayers = [], titleWinners = {}) {
  const retiredCoaches = [];
  const freedPupilIds  = [];

  const playerMap = Object.fromEntries(allPlayers.map(p => [p.id, p]));

  const pool = coachPool.map(coach => {
    // Coaches já aposentados: mantém, não envelhece
    if (coach.coachStatus === 'RETIRED') return coach;

    // 1. Envelhece
    const newAge = (coach.age ?? 50) + 1;
    let updated  = { ...coach, age: newAge };

    // 2. Verifica HIATUS: coaches em hiato podem sair ou voltar
    if (coach.coachStatus === 'HIATUS') {
      // 40% de chance de voltar como FREE_AGENT a cada ano
      if (Math.random() < 0.40) {
        return { ...updated, coachStatus: 'FREE_AGENT', availability: 'FREE' };
      }
      // Permanece em hiato, mas idosos em hiato se aposentam
      if (newAge >= 68 && Math.random() < 0.50) {
        retiredCoaches.push(updated);
        return {
          ...updated,
          coachStatus:  'RETIRED',
          availability: 'RETIRED',
          _retiredSeason: season,
        };
      }
      return updated;
    }

    // 3. Calcula chance de aposentadoria
    const pupil  = coach.currentPupilId ? playerMap[coach.currentPupilId] ?? null : null;
    const chance = calcCoachRetirementChance(updated, pupil, titleWinners);

    if (chance <= 0) return updated;

    // 4. Sorteia
    if (Math.random() < chance) {
      // Aposentadoria confirmada
      if (coach.currentPupilId) {
        freedPupilIds.push(coach.currentPupilId);
      }
      retiredCoaches.push({ ...updated, currentPupilId: null });
      return {
        ...updated,
        coachStatus:     'RETIRED',
        availability:    'RETIRED',
        currentPupilId:  null,
        _retiredSeason:  season,
      };
    }

    // 5. Verifica BURNOUT_RISK para hiato (não aposentadoria — apenas pausa)
    const traits = updated.traits ?? [];
    if (traits.includes('BURNOUT_RISK') && newAge >= 52 && Math.random() < 0.04) {
      if (coach.currentPupilId) freedPupilIds.push(coach.currentPupilId);
      return {
        ...updated,
        coachStatus:     'HIATUS',
        availability:    'HIATUS',
        currentPupilId:  null,
        _hiatusSeason:   season,
      };
    }

    return updated;
  });

  return { pool, retiredCoaches, freedPupilIds };
}

/**
 * Determina o tipo narrativo da aposentadoria de um coach com base em
 * persona, idade, reputação e histórico de pupilos.
 *
 * @param {object} coach
 * @returns {string} 'LENDA_QUE_SAI' | 'VETERANO_CANSADO' | 'BURNOUT' | 'NATURAL' | 'JOVEM_PRECOCE'
 */
export function getCoachRetirementType(coach) {
  const age    = coach.age ?? 60;
  const rep    = coach.reputation ?? 50;
  const traits = coach.traits ?? [];

  if (traits.includes('BURNOUT_RISK') && age < 62) return 'BURNOUT';
  if (rep >= 80 && age >= 60)                       return 'LENDA_QUE_SAI';
  if (age >= 68)                                    return 'NATURAL';
  if (age < 58)                                     return 'JOVEM_PRECOCE';
  return 'VETERANO_CANSADO';
}

