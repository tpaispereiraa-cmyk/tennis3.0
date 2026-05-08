/**
 * CoachPartnershipSystem.js
 * ─────────────────────────────────────────────────────────────────
 * Sistema de Parceria Técnico-Jogador
 *
 * Substitui o modelo de "satisfação anual" por uma relação com
 * memória, marcos históricos, metas negociadas e estados emocionais.
 *
 * EXPORTS PRINCIPAIS:
 *   generateSeasonGoal(player, coach, season, seasonMetrics?)
 *     → Propõe 3 metas (conservadora / realista / ambiciosa)
 *     → Retorna a meta escolhida com base no perfil da dupla
 *
 *   evaluateSeasonGoal(player, coach, goal, season, seasonMetrics, titleWon)
 *     → Avalia cumprimento da meta (EXCEEDED / MET / PARTIAL / FAILED)
 *     → Retorna { outcome, bondDelta, narrative }
 *
 *   updatePartnershipBond(player, coach, evaluation, season, coachPool)
 *     → Atualiza bondScore, milestones, relationshipState
 *     → Retorna { updatedPlayer, updatedCoach, event }
 *
 *   initPartnership(player, coach, season)
 *     → Garante que player.coach tenha todos os campos de parceria
 *
 *   getPartnershipState(player)
 *     → { state, bondScore, label, icon, color }
 *
 *   getBondInfluenceMultiplier(player)
 *     → Multiplicador de instrução em partida (0.5–1.3)
 *
 *   getInstructionFrequencyFactor(player)
 *     → Fator de frequência de instruções nos changeovers (0.3–1.0)
 *
 *   processAllPartnerships(players, coachPool, season, seasonMetrics, titleWinners, prevRankMap)
 *     → Processa toda a lógica de parceria para todos os jogadores no fim de ano
 *     → Retorna { players, coachPool, events }
 *
 * FILOSOFIA DE DESIGN:
 *   - Bond é a integral da relação — memória de longo prazo
 *   - Metas são o critério primário de avaliação, não delta de ranking
 *   - Marcos são permanentes e criam piso de bond
 *   - Estados (STABLE/TENSION/CRISIS/RUPTURE) filtram o que acontece em quadra
 *   - Rompimento é proporcional ao que foi construído — parceria longa rompe diferente
 */

// ═══════════════════════════════════════════════════════════════════
// CONSTANTES
// ═══════════════════════════════════════════════════════════════════

/** Estado da relação — determinado pelo bondScore e histórico */
// ── BLOCO C: Imports para coachingXP, LONGA_PARCERIA e alcunha ──
// Importados aqui para manter o arquivo auto-contido.
// chemistryLabel é usada nas notícias de alcunha.
// ──────────────────────────────────────────────────────────────────
import { chemistryScore, chemistryLabel } from './CoachContractSystem.js';

// ── ALCUNHAS DE PARCERIA (chemistry ≥ 80, 3+ temporadas) ──────────
// Geradas proceduralmente por estilo do jogador + coachingStyle do coach.
const PARTNERSHIP_NICKNAME_TEMPLATES = {
  // [coachingStyle] × [styleId] → alcunha
  ATTACK_SCULPTOR: {
    AGG_BASELINER: ['A Fábrica de Poder',  'Escola de Fogo',        'O Laboratório Ofensivo'],
    PWR_BASE:      ['Força Bruta Refinada', 'A Máquina Agressiva',   'O Arsenal'],
    TAKEALLRISK:   ['O Caos Organizado',    'Risco Calculado',       'A Aposta Dupla'],
    default:       ['O Método Ofensivo',    'Ataque sem Limites',    'A Escola do Ataque'],
  },
  SERVE_FANATICO: {
    BIG_SERVER:    ['O Canhão e o Mestre',  'Dois Saques, Uma Mente','Serviço Premium'],
    SRV_VOL:       ['A Rede e o Saque',     'Dois Movimentos, Zero Falhas', 'O Sistema de Servir'],
    default:       ['A Escola do Saque',    'O Primeiro Golpe',      'Vantagem Imediata'],
  },
  DEFENSE_ARCHITECT: {
    RETRIEVER:     ['O Bunker',             'Paciência Infinita',    'A Muralha Dupla'],
    GRINDER:       ['A Pedreira',           'Dois Guerreiros',       'O Labirinto'],
    CTR_PUNCHER:   ['Controle Total',       'A Estrutura',           'Lenta e Letal'],
    default:       ['A Escola da Defesa',   'Solidez Acima de Tudo', 'O Sistema Blindado'],
  },
  TATICO_PURO: {
    TACT_TEC:      ['O Tabuleiro',          'Xadrez em Quadra',      'Dois Analistas'],
    ADPT_TAC:      ['Adaptação Extrema',    'Sem Padrão Fixo',       'O Protocolo Mutante'],
    CTR_PUNCHER:   ['A Armadilha Tática',   'Precisão Cirúrgica',    'O Sistema Anti-Jogo'],
    default:       ['Plano A e B',          'A Preparação',          'O Livro de Jogo'],
  },
  MENTAL_MAESTRO: {
    MOMENTUM_PLAYER:['A Mente em Chamas',   'Clique Mental',         'Dois Instintos'],
    ADPT_TAC:       ['Controle da Pressão', 'A Cabeça Fria',         'Zero Pânico'],
    default:        ['A Fortaleza Mental',  'Dentro da Cabeça',      'O Ponto Decisivo'],
  },
  ALL_ROUND_FORMER: {
    ALL_COURT:     ['O Jogo Completo',      'Sem Ponto Fraco',       'A Formação Total'],
    TACT_TEC:      ['Técnica e Tática',     'O Método Completo',     'A Escola Integral'],
    default:       ['Equilíbrio Perfeito',  'A Formação',            'Sem Buracos'],
  },
  FORMADOR_JOVENS: {
    default:       ['O Investimento',       'A Promessa Cumprida',   'Do Potencial ao Real'],
  },
};

function generatePartnershipNickname(coachingStyle, playerStyleId) {
  const styleMap = PARTNERSHIP_NICKNAME_TEMPLATES[coachingStyle] ?? {};
  const pool     = styleMap[playerStyleId] ?? styleMap.default ?? ['A Parceria'];
  return pool[Math.floor(Math.random() * pool.length)];
}

export const PARTNERSHIP_STATES = {
  STABLE:  { id: 'STABLE',  label: 'Sólida',     icon: '🤝', color: '#4CAF50', minBond: 50 },
  TENSION: { id: 'TENSION', label: 'Sob tensão',  icon: '⚡', color: '#FF9800', minBond: 30 },
  CRISIS:  { id: 'CRISIS',  label: 'Em crise',    icon: '🔥', color: '#F44336', minBond: 15 },
  RUPTURE: { id: 'RUPTURE', label: 'Ruptura',     icon: '💔', color: '#9C27B0', minBond: 0  },
};

/** Tipos de meta com critérios de avaliação */
export const GOAL_TYPES = {
  // Ranking
  ENTER_TOP_10:      { id: 'ENTER_TOP_10',      label: 'Entrar no Top 10',          category: 'ranking',  ambitious: true  },
  ENTER_TOP_20:      { id: 'ENTER_TOP_20',      label: 'Entrar no Top 20',          category: 'ranking',  ambitious: false },
  ENTER_TOP_50:      { id: 'ENTER_TOP_50',      label: 'Entrar no Top 50',          category: 'ranking',  ambitious: false },
  DEFEND_RANKING:    { id: 'DEFEND_RANKING',    label: 'Defender o ranking',        category: 'ranking',  ambitious: false },
  IMPROVE_RANKING:   { id: 'IMPROVE_RANKING',   label: 'Melhorar o ranking',        category: 'ranking',  ambitious: false },
  RETURN_TOP_50:     { id: 'RETURN_TOP_50',     label: 'Retornar ao Top 50',        category: 'ranking',  ambitious: false },
  // Títulos
  WIN_SLAM:          { id: 'WIN_SLAM',          label: 'Vencer um Grand Slam',      category: 'title',    ambitious: true  },
  WIN_MASTERS:       { id: 'WIN_MASTERS',       label: 'Vencer um Masters 1000',    category: 'title',    ambitious: true  },
  WIN_ATP500:        { id: 'WIN_ATP500',        label: 'Vencer um ATP 500',         category: 'title',    ambitious: false },
  WIN_FIRST_TITLE:   { id: 'WIN_FIRST_TITLE',   label: 'Conquistar o primeiro título', category: 'title', ambitious: false },
  // Rodadas
  REACH_SLAM_FINAL:  { id: 'REACH_SLAM_FINAL',  label: 'Chegar a uma final de Slam', category: 'round',  ambitious: true  },
  REACH_SLAM_SF:     { id: 'REACH_SLAM_SF',     label: 'Chegar a uma semifinal de Slam', category: 'round', ambitious: false },
  REACH_MASTERS_FINAL:{ id: 'REACH_MASTERS_FINAL', label: 'Chegar a uma final de Masters', category: 'round', ambitious: false },
  // Consistência
  FINISH_TOP_10:     { id: 'FINISH_TOP_10',     label: 'Terminar o ano no Top 10',  category: 'season',   ambitious: false },
  FINISH_TOP_20:     { id: 'FINISH_TOP_20',     label: 'Terminar o ano no Top 20',  category: 'season',   ambitious: false },
  WIN_3_TITLES:      { id: 'WIN_3_TITLES',      label: 'Vencer 3 títulos no ano',   category: 'season',   ambitious: true  },
  REACH_5_FINALS:    { id: 'REACH_5_FINALS',    label: 'Chegar a 5 finais',         category: 'season',   ambitious: false },
  // Recuperação
  RECOVER_FROM_INJURY: { id: 'RECOVER_FROM_INJURY', label: 'Recuperação completa de lesão', category: 'health', ambitious: false },
  PLAY_FULL_SEASON:    { id: 'PLAY_FULL_SEASON',    label: 'Disputar a temporada completa', category: 'health', ambitious: false },
  FINISH_TOP_X:        { id: 'FINISH_TOP_X',        label: 'Terminar o ano em uma faixa de ranking', category: 'season', ambitious: false },
  SURFACE_WINS:        { id: 'SURFACE_WINS',        label: 'Acumular vitórias em um piso', category: 'surface', ambitious: false },
  SURFACE_QF:          { id: 'SURFACE_QF',          label: 'Chegar a quartas em um piso', category: 'surface', ambitious: false },
  SURFACE_SF:          { id: 'SURFACE_SF',          label: 'Chegar a semi em um piso', category: 'surface', ambitious: false },
  SURFACE_FINAL:       { id: 'SURFACE_FINAL',       label: 'Chegar a final em um piso', category: 'surface', ambitious: true  },
  SURFACE_TITLE:       { id: 'SURFACE_TITLE',       label: 'Vencer título em um piso', category: 'surface', ambitious: true  },
};

/** Marcos que criam memória permanente na relação */
export const MILESTONE_TYPES = {
  FIRST_TITLE_TOGETHER:     { id: 'FIRST_TITLE_TOGETHER',     label: 'Primeiro título juntos',       icon: '🏆', bondFloor: 35 },
  FIRST_SLAM_TOGETHER:      { id: 'FIRST_SLAM_TOGETHER',      label: 'Primeiro Grand Slam juntos',   icon: '🎾', bondFloor: 50 },
  FIRST_MASTERS_TOGETHER:   { id: 'FIRST_MASTERS_TOGETHER',   label: 'Primeiro Masters 1000 juntos', icon: '🥇', bondFloor: 40 },
  FIRST_TOP10_TOGETHER:     { id: 'FIRST_TOP10_TOGETHER',     label: 'Primeiro Top 10 juntos',       icon: '📈', bondFloor: 30 },
  SURVIVED_INJURY:          { id: 'SURVIVED_INJURY',          label: 'Superaram uma lesão juntos',   icon: '🩹', bondFloor: 25 },
  STYLE_EVOLUTION:          { id: 'STYLE_EVOLUTION',          label: 'Evolução de estilo juntos',    icon: '🔄', bondFloor: 20 },
  LONG_PARTNERSHIP_3Y:      { id: 'LONG_PARTNERSHIP_3Y',      label: '3 temporadas juntos',          icon: '📅', bondFloor: 25 },
  LONG_PARTNERSHIP_5Y:      { id: 'LONG_PARTNERSHIP_5Y',      label: '5 temporadas juntos',          icon: '⭐', bondFloor: 35 },
  LONG_PARTNERSHIP_8Y:      { id: 'LONG_PARTNERSHIP_8Y',      label: '8 temporadas juntos',          icon: '🌟', bondFloor: 45 },
  COMEBACK_TOGETHER:        { id: 'COMEBACK_TOGETHER',        label: 'Retorno triunfante juntos',    icon: '💪', bondFloor: 30 },
};

// ═══════════════════════════════════════════════════════════════════
// GERAÇÃO DE META
// ═══════════════════════════════════════════════════════════════════

/**
 * Gera 3 metas candidatas (conservadora, realista, ambiciosa) e
 * seleciona a mais adequada baseado no perfil técnico-jogador.
 *
 * @param {object} player     — jogador com attrs, rankPosition, coach
 * @param {object} coach      — objeto coach completo do pool
 * @param {number} season     — temporada atual
 * @param {object} [metrics]  — seasonMetrics do ano anterior (opcional na primeira temporada)
 * @returns {object}          — goalEntry: { type, label, target, season, ambition, rationale }
 */
const SURFACE_LABELS = {
  HARD: 'Hard',
  CLAY: 'Saibro',
  GRASS: 'Grass',
  INDOOR: 'Indoor',
};

const SURFACE_ORDER = ['HARD', 'CLAY', 'GRASS', 'INDOOR'];

/**
 * Gera uma frase curta de justificativa para a meta da temporada,
 * na voz do coach. Exibida em itálico no perfil do jogador.
 *
 * @param {object} goal      — { label } da meta escolhida
 * @param {string} phil      — philosophy do coach
 * @param {number} bond      — bondScore atual (0–100)
 * @param {number} age       — idade do jogador
 * @param {number} rank      — ranking atual
 * @param {boolean} isInjury — true quando é meta de recuperação de lesão
 * @returns {string}
 */
function _goalRationale(goal, phil, bond, age, rank, isInjury) {
  if (isInjury) {
    const injuryLines = [
      'O mais importante agora é a saúde. O ranking vem depois.',
      'Não vamos forçar nada. Recuperação completa é a única meta que importa.',
      'Um passo de cada vez. Quando o corpo estiver pronto, o jogo voltará.',
    ];
    return injuryLines[Math.floor(Math.random() * injuryLines.length)];
  }

  const label = goal?.label ?? 'a meta da temporada';
  const isVeteran = age >= 32;
  const isYoung   = age <= 22;
  const isElite   = rank <= 15;
  const isStruggling = rank > 80;
  const isTrusted = bond >= 68;
  const isTense   = bond <= 30;

  // Frases por filosofia do coach, temperadas por contexto
  const byPhil = {
    ATTACK_SCULPTOR: [
      `Nosso jogo é construído para atacar — ${label} é a consequência natural disso.`,
      `Quando você joga no limite da agressividade, esse resultado é só questão de tempo.`,
      `Você tem o arsenal. Agora é colocar isso em prática durante toda a temporada.`,
    ],
    SERVE_FANATICO: [
      `O saque é a arma. Quando ele funciona, ${label} está ao alcance.`,
      `Com primeiro saque acima de 65%, essa meta é realista. Vamos trabalhar nisso.`,
      `Começar bem cada ponto muda tudo. ${label} é o reflexo disso.`,
    ],
    DEFENSE_ARCHITECT: [
      `Solidez cria oportunidades. ${label} é o resultado de jogar sem erros gratuitos.`,
      `Quem não erra, vence. Vamos construir em cima dessa base.`,
      `A consistência vai levar você até ${label}. É um trabalho de longo prazo.`,
    ],
    TATICO_PURO: [
      `Cada adversário tem um ponto fraco. Encontrando esses pontos, ${label} vem.`,
      `A preparação tática é o diferencial. Com o plano certo, ${label} é alcançável.`,
      `Você tem leitura de jogo. O objetivo é transformar isso em resultado.`,
    ],
    MENTAL_MAESTRO: [
      `Nos momentos decisivos, a cabeça decide. ${label} passa por isso.`,
      `Quando a pressão chegar, você precisa estar pronto. Essa é a base do nosso trabalho.`,
      `Mentalidade forte transforma potencial em resultado. ${label} é o reflexo disso.`,
    ],
    ALL_ROUND_FORMER: [
      `Não há ponto fraco que o adversário possa explorar — e ${label} vem dessa solidez.`,
      `Jogo completo gera consistência. Consistência gera o resultado que estamos buscando.`,
      `Vamos trabalhar todas as facetas do jogo. ${label} é o alvo.`,
    ],
    FORMADOR_JOVENS: [
      `Você ainda está aprendendo, mas ${label} é uma meta real para onde você está.`,
      `Cada temporada é um degrau. ${label} é o próximo.`,
      `O processo importa tanto quanto o resultado. Mas ${label} nos diz que estamos no caminho certo.`,
    ],
  };

  // Modificadores contextuais que substituem a frase padrão em casos extremos
  if (isTense && !isTrusted) {
    const tenselines = [
      `Vamos focar em ${label}. Precisamos de resultados para reconstruir a confiança.`,
      `A relação está difícil, mas a meta é clara: ${label}. Vamos trabalhar por isso.`,
    ];
    return tenselines[Math.floor(Math.random() * tenselines.length)];
  }
  if (isVeteran && isElite) {
    return `Com sua experiência e o nível que você ainda mantém, ${label} é totalmente alcançável.`;
  }
  if (isYoung && isStruggling) {
    return `Você está no começo. ${label} é desafiador, mas é exatamente onde você precisa estar mirando agora.`;
  }
  if (isTrusted && isElite) {
    return `Sabemos o que você é capaz. ${label} é a meta que combina com o nível que você demonstrou.`;
  }

  const pool = byPhil[phil] ?? byPhil.ALL_ROUND_FORMER;
  return pool[Math.floor(Math.random() * pool.length)];
}

function _getSurfaceMetrics(metrics = {}, surface) {
  return metrics?.surfaceBlocks?.[surface] ?? {
    wins: 0,
    qfs: 0,
    semis: 0,
    finals: 0,
    titles: 0,
    byCategory: {},
  };
}

function _estimateNegotiationBand(player, coach, season, metrics = {}) {
  const rank = player.rankPosition ?? 128;
  const age = _estimateAge(player, season);
  const bond = player.coach?.bondScore ?? 50;
  const rep = coach?.reputation ?? 50;
  const chem = (() => {
    try { return chemistryScore(coach, player, season); } catch (_) { return 60; }
  })();
  const recentTitles = metrics?.titles ?? 0;
  const recentFinals = metrics?.finals ?? 0;

  let band =
    rank <= 8 ? 6 :
    rank <= 18 ? 5 :
    rank <= 35 ? 4 :
    rank <= 60 ? 3 :
    rank <= 95 ? 2 : 1;

  if (rep >= 82 && bond >= 68) band += 1;
  if (chem >= 78 && age <= 24 && rank <= 50) band += 1;
  if (recentTitles >= 2 || recentFinals >= 4) band += 1;
  if (bond <= 28) band -= 1;
  if (age >= 32 && rank > 20) band -= 1;
  if ((metrics?.wins ?? 0) <= 6 && rank > 40) band -= 1;

  return Math.max(1, Math.min(6, band));
}

function _buildAnnualGoalForBand(player, band) {
  const rank = player.rankPosition ?? 128;
  const makeTopGoal = (target) => ({
    type: 'FINISH_TOP_X',
    target,
    label: `Terminar a temporada no Top ${target}`,
  });

  if (band <= 1) return makeTopGoal(Math.min(90, Math.max(70, rank - 18)));
  if (band === 2) return makeTopGoal(Math.min(60, Math.max(45, rank - 16)));
  if (band === 3) return makeTopGoal(Math.min(40, Math.max(30, rank - 12)));
  if (band === 4) return makeTopGoal(25);
  if (band === 5) return makeTopGoal(rank <= 14 ? 10 : 15);
  return makeTopGoal(rank <= 5 ? 5 : 8);
}

function _pickSurfaceCategoryGoal(surface, band, block = {}) {
  const wins = block?.wins ?? 0;
  const qfs = block?.qfs ?? 0;
  const semis = block?.semis ?? 0;
  const finals = block?.finals ?? 0;
  const titles = block?.titles ?? 0;

  if (band <= 1) {
    if (wins <= 1) {
      return { type: 'SURFACE_WINS', target: 2, label: `${SURFACE_LABELS[surface]} - ao menos 2 vitórias no bloco` };
    }
    return { type: 'SURFACE_QF', minCategory: 'ATP_100', label: `${SURFACE_LABELS[surface]} - ao menos uma QF de ATP 100` };
  }
  if (band === 2) {
    if (qfs === 0) {
      return { type: 'SURFACE_QF', minCategory: surface === 'GRASS' ? 'ATP_100' : 'ATP_250', label: `${SURFACE_LABELS[surface]} - ao menos uma QF de ${surface === 'GRASS' ? 'ATP 100' : 'ATP 250'}` };
    }
    return { type: 'SURFACE_SF', minCategory: 'ATP_100', label: `${SURFACE_LABELS[surface]} - transformar presença em semifinal` };
  }
  if (band === 3) {
    if (semis === 0) {
      return { type: 'SURFACE_QF', minCategory: 'ATP_250', label: `${SURFACE_LABELS[surface]} - ao menos uma QF de ATP 250` };
    }
    return { type: 'SURFACE_SF', minCategory: 'ATP_250', label: `${SURFACE_LABELS[surface]} - ao menos uma semifinal relevante` };
  }
  if (band === 4) {
    if (finals === 0) {
      return { type: 'SURFACE_QF', minCategory: 'ATP_500', label: `${SURFACE_LABELS[surface]} - ao menos uma QF de ATP 500` };
    }
    return { type: 'SURFACE_FINAL', minCategory: 'ATP_250', label: `${SURFACE_LABELS[surface]} - chegar a uma final no bloco` };
  }
  if (band === 5) {
    if (titles === 0) {
      return { type: 'SURFACE_FINAL', minCategory: surface === 'GRASS' ? 'ATP_500' : 'MASTERS_1000', label: `${SURFACE_LABELS[surface]} - brigar por final grande` };
    }
    return { type: 'SURFACE_TITLE', minCategory: 'ATP_500', label: `${SURFACE_LABELS[surface]} - conquistar um título de peso` };
  }
  return {
    type: 'SURFACE_TITLE',
    minCategory: surface === 'GRASS' ? 'ATP_500' : 'MASTERS_1000',
    label: `${SURFACE_LABELS[surface]} - vencer um título grande no bloco`,
  };
}

function _buildSurfaceGoals(player, season, metrics = {}, band) {
  return SURFACE_ORDER.map(surface => {
    const block = _getSurfaceMetrics(metrics, surface);
    const base = _pickSurfaceCategoryGoal(surface, band, block);
    return {
      ...base,
      surface,
      key: `${season}_${surface}`,
    };
  });
}

function _surfaceGoalSummary(surfaceGoals = []) {
  return surfaceGoals.map(g => g.label).join(' • ');
}

export function generateSeasonGoal(player, coach, season, metrics = {}) {
  const rank = player.rankPosition ?? 128;
  const age = _estimateAge(player, season);
  const phil = coach?.philosophy ?? 'COMPLETE';
  const injured = !!(player.injury?.active);
  const bond = player.coach?.bondScore ?? 50;

  if (injured) {
    return {
      type: 'RECOVER_FROM_INJURY',
      label: GOAL_TYPES.RECOVER_FROM_INJURY.label,
      target: null,
      season,
      ambition: 'CONSERVATIVE',
      annualGoal: { type: 'RECOVER_FROM_INJURY', label: GOAL_TYPES.RECOVER_FROM_INJURY.label, target: null },
      surfaceGoals: [],
      rationale: _goalRationale({ label: GOAL_TYPES.RECOVER_FROM_INJURY.label }, phil, bond, age, rank, true),
    };
  }

  const band = _estimateNegotiationBand(player, coach, season, metrics);
  const annualGoal = _buildAnnualGoalForBand(player, band);
  const surfaceGoals = _buildSurfaceGoals(player, season, metrics, band);
  const ambition = band <= 2 ? 'CONSERVATIVE' : band <= 4 ? 'REALISTIC' : 'AMBITIOUS';

  return {
    ...annualGoal,
    season,
    ambition,
    band,
    annualGoal,
    surfaceGoals,
    label: annualGoal.label,
    subLabel: _surfaceGoalSummary(surfaceGoals),
    rationale: _goalRationale(annualGoal, phil, bond, age, rank, false),
  };
}
function _surfaceCategoryStats(block = {}, category = null) {
  if (!category) {
    return {
      qfs: block?.qfs ?? 0,
      semis: block?.semis ?? 0,
      finals: block?.finals ?? 0,
      titles: block?.titles ?? 0,
    };
  }
  return block?.byCategory?.[category] ?? { qfs: 0, semis: 0, finals: 0, titles: 0 };
}
function _evaluateAnnualGoal(goal, metrics = {}, currentRank, titleWon, prevRank) {
  if (!goal) return { achieved: false, partial: true };
  const target = goal.target;
  let achieved = false;
  let partial = false;

  switch (goal.type) {
    case 'FINISH_TOP_X':
      achieved = target !== null && currentRank <= target;
      partial = !achieved && target !== null && currentRank <= target + 8;
      break;
    case 'ENTER_TOP_10':
    case 'ENTER_TOP_20':
    case 'ENTER_TOP_50':
    case 'IMPROVE_RANKING':
    case 'RETURN_TOP_50':
      achieved = target !== null && currentRank <= target;
      partial = !achieved && target !== null && currentRank <= target + Math.ceil(target * 0.3);
      break;
    case 'DEFEND_RANKING': {
      const prev = prevRank ?? currentRank;
      achieved = currentRank <= prev + 5;
      partial = !achieved && currentRank <= prev + 15;
      break;
    }
    case 'WIN_SLAM':
      achieved = titleWon === 'SLAM';
      partial = !achieved && (metrics?.slamFinals ?? 0) >= 1;
      break;
    case 'WIN_MASTERS':
      achieved = titleWon === 'MASTERS' || titleWon === 'SLAM';
      partial = !achieved && (metrics?.mastersFinals ?? 0) >= 1;
      break;
    case 'WIN_ATP500':
      achieved = ['ATP500', 'MASTERS', 'SLAM'].includes(titleWon);
      partial = !achieved && (metrics?.finals ?? 0) >= 1;
      break;
    case 'WIN_FIRST_TITLE': {
      const hadTitle = (metrics?.startSeasonTitles ?? 0) > 0;
      achieved = !hadTitle && titleWon !== null;
      partial = !achieved && (metrics?.finals ?? 0) >= 2;
      break;
    }
    case 'REACH_SLAM_FINAL':
      achieved = (metrics?.slamFinals ?? 0) >= 1;
      partial = !achieved && (metrics?.slamSFs ?? 0) >= 1;
      break;
    case 'REACH_SLAM_SF':
      achieved = (metrics?.slamSFs ?? 0) >= 1 || (metrics?.slamFinals ?? 0) >= 1;
      partial = !achieved && currentRank <= 20;
      break;
    case 'REACH_MASTERS_FINAL':
      achieved = (metrics?.mastersFinals ?? 0) >= 1 || titleWon === 'MASTERS';
      partial = !achieved && (metrics?.finals ?? 0) >= 2;
      break;
    case 'FINISH_TOP_10':
      achieved = currentRank <= 10;
      partial = !achieved && currentRank <= 15;
      break;
    case 'FINISH_TOP_20':
      achieved = currentRank <= 20;
      partial = !achieved && currentRank <= 28;
      break;
    case 'WIN_3_TITLES':
      achieved = (metrics?.titles ?? 0) >= 3;
      partial = !achieved && (metrics?.titles ?? 0) >= 2;
      break;
    case 'REACH_5_FINALS':
      achieved = (metrics?.finals ?? 0) >= 5;
      partial = !achieved && (metrics?.finals ?? 0) >= 3;
      break;
    case 'RECOVER_FROM_INJURY':
    case 'PLAY_FULL_SEASON': {
      const gamesPlayed = (metrics?.wins ?? 0) + (metrics?.losses ?? 0);
      achieved = gamesPlayed >= 20;
      partial = !achieved && gamesPlayed >= 10;
      break;
    }
    default:
      partial = true;
  }

  return { achieved, partial };
}

function _evaluateSurfaceGoal(goal, metrics = {}) {
  const surfaceBlock = _getSurfaceMetrics(metrics, goal?.surface);
  const scoped = _surfaceCategoryStats(surfaceBlock, goal?.minCategory ?? null);

  let achieved = false;
  let partial = false;

  switch (goal?.type) {
    case 'SURFACE_WINS':
      achieved = (surfaceBlock?.wins ?? 0) >= (goal?.target ?? 0);
      partial = !achieved && (surfaceBlock?.wins ?? 0) >= Math.max(1, (goal?.target ?? 0) - 1);
      break;
    case 'SURFACE_QF':
      achieved = (scoped?.qfs ?? 0) >= 1;
      partial = !achieved && (surfaceBlock?.wins ?? 0) >= 2;
      break;
    case 'SURFACE_SF':
      achieved = (scoped?.semis ?? 0) >= 1;
      partial = !achieved && (scoped?.qfs ?? 0) >= 1;
      break;
    case 'SURFACE_FINAL':
      achieved = (scoped?.finals ?? 0) >= 1;
      partial = !achieved && (scoped?.semis ?? 0) >= 1;
      break;
    case 'SURFACE_TITLE':
      achieved = (scoped?.titles ?? 0) >= 1;
      partial = !achieved && (scoped?.finals ?? 0) >= 1;
      break;
    default:
      partial = true;
  }

  return {
    achieved,
    partial,
    wins: surfaceBlock?.wins ?? 0,
    stats: scoped,
  };
}

export function evaluateSeasonGoal(player, coach, goal, season, metrics = {}, titleWon = null, prevRank = null) {
  if (!goal) return { outcome: 'PARTIAL', bondDelta: 0, narrative: 'Sem meta definida.', achieved: false };

  const currentRank = player.rankPosition ?? 999;
  const ambition = goal.ambition ?? 'REALISTIC';
  const annualGoal = goal.annualGoal ?? goal;
  const surfaceGoals = goal.surfaceGoals ?? [];

  const annualEval = _evaluateAnnualGoal(annualGoal, metrics, currentRank, titleWon, prevRank);
  const surfaceEvals = surfaceGoals.map(surfaceGoal => ({
    ...surfaceGoal,
    evaluation: _evaluateSurfaceGoal(surfaceGoal, metrics),
  }));

  const annualScore = annualEval.achieved ? 1 : annualEval.partial ? 0.5 : 0;
  const surfaceScore = surfaceEvals.reduce((sum, item) => {
    if (item.evaluation.achieved) return sum + 1;
    if (item.evaluation.partial) return sum + 0.5;
    return sum;
  }, 0);
  const totalScore = annualScore * 2 + surfaceScore;

  let outcome = 'FAILED';
  if (annualEval.achieved && surfaceEvals.length > 0 && surfaceEvals.every(item => item.evaluation.achieved)) {
    outcome = ambition === 'AMBITIOUS' ? 'EXCEEDED' : 'MET';
  } else if (totalScore >= (surfaceGoals.length + 1.5)) {
    outcome = 'MET';
  } else if (totalScore >= Math.max(1.5, surfaceGoals.length * 0.75)) {
    outcome = 'PARTIAL';
  }

  let bondDelta = _bondDeltaForOutcome(outcome, ambition, coach);
  const failedSurfaceCount = surfaceEvals.filter(item => !item.evaluation.achieved && !item.evaluation.partial).length;
  const crushedSurfaceCount = surfaceEvals.filter(item => item.evaluation.achieved).length;
  bondDelta -= failedSurfaceCount * (ambition === 'AMBITIOUS' ? 1 : 2);
  if (crushedSurfaceCount >= 3 && annualEval.achieved) bondDelta += 4;

  if (titleWon === 'SLAM' && annualGoal.type !== 'WIN_SLAM') {
    bondDelta += 12;
  } else if (titleWon === 'MASTERS' && !['WIN_SLAM', 'WIN_MASTERS'].includes(annualGoal.type)) {
    bondDelta += 8;
  }
  if (outcome === 'FAILED' && ambition === 'CONSERVATIVE') {
    bondDelta -= 5;
  }

  const narrative = _buildGoalNarrative(goal, outcome, player, titleWon, metrics, currentRank, annualEval, surfaceEvals);

  return {
    outcome,
    bondDelta,
    narrative,
    achieved: outcome === 'MET' || outcome === 'EXCEEDED',
    exceeded: outcome === 'EXCEEDED',
    annualEval,
    surfaceEvals,
  };
}

/** Delta de bond por resultado */
function _bondDeltaForOutcome(outcome, ambition, coach) {
  const BASE = {
    EXCEEDED: +20,
    MET:      +12,
    PARTIAL:  -2,
    FAILED:   -14,
  };
  let delta = BASE[outcome] ?? 0;

  // Meta ambiciosa cumprida = bônus maior; falhada = penalidade menor (é arriscada)
  if (ambition === 'AMBITIOUS') {
    if (outcome === 'EXCEEDED' || outcome === 'MET') delta += 5;
    if (outcome === 'FAILED') delta += 4; // arriscar e falhar não destrói tanto
  }

  // Meta conservadora cumprida = bônus menor (era fácil); falhada = penalidade maior
  if (ambition === 'CONSERVATIVE') {
    if (outcome === 'MET') delta -= 3;
    if (outcome === 'FAILED') delta -= 5;
  }

  return Math.round(delta);
}

/** Narrativa textual do resultado */
function _buildGoalNarrative(goal, outcome, player, titleWon, metrics, currentRank, annualEval = null, surfaceEvals = []) {
  const name = player.name ?? 'O jogador';
  const goalLabel = goal?.annualGoal?.label ?? goal?.label ?? 'a meta';
  const hits = surfaceEvals.filter(item => item.evaluation?.achieved).map(item => SURFACE_LABELS[item.surface]).join(', ');
  const misses = surfaceEvals.filter(item => !item.evaluation?.achieved && !item.evaluation?.partial).map(item => SURFACE_LABELS[item.surface]).join(', ');

  switch (outcome) {
    case 'EXCEEDED':
      if (titleWon === 'SLAM') return `${name} não só cumpriu o plano anual como dominou os blocos da temporada. O auge veio com um Grand Slam.`;
      return `${name} bateu a meta macro e varreu a maior parte dos objetivos por piso. ${hits ? `Os melhores blocos vieram em ${hits}.` : 'Foi um ano quase sem falhas.'}`;
    case 'MET':
      return `${name} entregou o que a parceria negociou: ${goalLabel}. ${hits ? `Os pisos mais fortes foram ${hits}.` : 'A execução foi consistente ao longo do ano.'}`;
    case 'PARTIAL':
      return `${name} andou perto do combinado, mas o plano ficou incompleto. ${misses ? `Os blocos que derrubaram a temporada foram ${misses}.` : 'Houve progresso, mas faltou fechar a conta.'}`;
    case 'FAILED':
      if ((metrics?.titles ?? 0) > 0) {
        return `${name} até produziu momentos bons, mas falhou no plano principal e acumulou tropeços por piso. ${misses ? `Os maiores rombos vieram em ${misses}.` : 'A irregularidade pesou demais.'}`;
      }
      return `${name} não conseguiu sustentar ${goalLabel}. ${misses ? `Os blocos de ${misses} corroeram a confiança da parceria.` : 'A temporada ficou abaixo do mínimo negociado.'}`;
    default:
      return '';
  }
}

// ═══════════════════════════════════════════════════════════════════
// ATUALIZAÇÃO DE BOND
// ═══════════════════════════════════════════════════════════════════

/**
 * Atualiza o bondScore, adiciona marcos, e determina o novo estado da relação.
 *
 * @param {object} player      — com player.coach já com bondScore
 * @param {object} coachInPool — objeto coach do pool
 * @param {object} evaluation  — output de evaluateSeasonGoal
 * @param {number} season
 * @param {object} metrics     — seasonMetrics da temporada
 * @param {string|null} titleWon
 * @param {number} prevRank
 * @returns {{ updatedPlayer, updatedCoach, event, rupture }}
 */
export function updatePartnershipBond(player, coachInPool, evaluation, season, metrics = {}, titleWon = null, prevRank = null) {
  const coachData    = player.coach;
  if (!coachData) return { updatedPlayer: player, updatedCoach: coachInPool, event: null, rupture: false };

  const currentBond  = coachData.bondScore ?? 50;
  const seasonsToget = season - (coachData.startSeason ?? season) + 1;
  const milestones   = coachData.milestones ?? [];
  const currentRank  = player.rankPosition ?? 999;

  // ── 1. Delta base da avaliação da meta ─────────────────────────
  let totalDelta = evaluation.bondDelta ?? 0;

  // ── 2. Bônus de longevidade — cada temporada juntos adiciona resistência ──
  const longevityBonus = Math.min(4, Math.floor(seasonsToget / 2)); // +1 por par de temporadas, máx +4
  totalDelta += longevityBonus;

  // ── 3. Eventos especiais ───────────────────────────────────────
  const newMilestones = [];

  // Primeiro título juntos
  if (titleWon && !milestones.some(m => m.type === 'FIRST_TITLE_TOGETHER')) {
    newMilestones.push(_createMilestone('FIRST_TITLE_TOGETHER', season));
    totalDelta += 10;
  }

  // Primeiro Grand Slam juntos
  if (titleWon === 'SLAM' && !milestones.some(m => m.type === 'FIRST_SLAM_TOGETHER')) {
    newMilestones.push(_createMilestone('FIRST_SLAM_TOGETHER', season));
    totalDelta += 15;
  }

  // Primeiro Masters 1000 juntos
  if (titleWon === 'MASTERS' && !milestones.some(m => m.type === 'FIRST_MASTERS_TOGETHER')) {
    newMilestones.push(_createMilestone('FIRST_MASTERS_TOGETHER', season));
    totalDelta += 8;
  }

  // Primeiro Top 10 juntos
  if (currentRank <= 10 && prevRank !== null && prevRank > 10 &&
      !milestones.some(m => m.type === 'FIRST_TOP10_TOGETHER')) {
    newMilestones.push(_createMilestone('FIRST_TOP10_TOGETHER', season));
    totalDelta += 6;
  }

  // Superação de lesão
  if (player.injury?.active && (metrics?.wins ?? 0) >= 15 &&
      !milestones.some(m => m.type === 'SURVIVED_INJURY' && m.season === season)) {
    newMilestones.push(_createMilestone('SURVIVED_INJURY', season));
    totalDelta += 5;
  }

  // Marcos de longevidade
  if (seasonsToget === 3 && !milestones.some(m => m.type === 'LONG_PARTNERSHIP_3Y')) {
    newMilestones.push(_createMilestone('LONG_PARTNERSHIP_3Y', season));
    totalDelta += 5;
  }
  if (seasonsToget === 5 && !milestones.some(m => m.type === 'LONG_PARTNERSHIP_5Y')) {
    newMilestones.push(_createMilestone('LONG_PARTNERSHIP_5Y', season));
    totalDelta += 8;
  }
  if (seasonsToget === 8 && !milestones.some(m => m.type === 'LONG_PARTNERSHIP_8Y')) {
    newMilestones.push(_createMilestone('LONG_PARTNERSHIP_8Y', season));
    totalDelta += 12;
  }

  // ── 4. Calcular piso de bond dos marcos ────────────────────────
  const allMilestones = [...milestones, ...newMilestones];
  const bondFloor     = allMilestones.reduce((floor, m) => {
    const mDef = MILESTONE_TYPES[m.type];
    return Math.max(floor, mDef?.bondFloor ?? 0);
  }, 0);

  // ── 5. Aplicar delta e clamp ───────────────────────────────────
  const rawBond    = currentBond + totalDelta;
  const newBond    = Math.max(bondFloor, Math.min(100, rawBond));

  // ── 6. Histórico de bond ───────────────────────────────────────
  const bondHistory = [...(coachData.bondHistory ?? []), { season, bond: newBond, delta: totalDelta, outcome: evaluation.outcome }].slice(-8);

  // ── 7. Estado da relação ───────────────────────────────────────
  const prevState   = coachData.relationshipState ?? 'STABLE';
  const newState    = _computeRelationshipState(newBond, bondHistory);
  const stateChanged = newState !== prevState;

  // ── 8. Verificar ruptura ───────────────────────────────────────
  // Ruptura se: bond < 15 por 2 temporadas consecutivas, ou bond < 5
  const recentBonds     = bondHistory.slice(-2).map(h => h.bond);
  const chronicallyLow  = recentBonds.length >= 2 && recentBonds.every(b => b < 18);
  const rupture         = newBond < 5 || chronicallyLow;

  // ── 9. Montar player.coach atualizado ─────────────────────────
  const updatedCoachData = {
    ...coachData,
    bondScore:         newBond,
    bondHistory,
    milestones:        allMilestones,
    relationshipState: newState,
    prevSeasonRank:    currentRank,
    startSeasonTitles: (player.coach?.startSeasonTitles ?? 0) + (titleWon ? 1 : 0),
    lastGoalOutcome:   evaluation.outcome,
    lastGoalNarrative: evaluation.narrative,
  };

  const updatedPlayer = { ...player, coach: updatedCoachData };

  // ── 10. Coach pode ganhar reputação com marcos ─────────────────
  let updatedCoach = { ...coachInPool };
  if (titleWon === 'SLAM')    updatedCoach.reputation = Math.min(100, updatedCoach.reputation + 12);
  else if (titleWon === 'MASTERS') updatedCoach.reputation = Math.min(100, updatedCoach.reputation + 6);
  if (newMilestones.length > 0)    updatedCoach.reputation = Math.min(100, updatedCoach.reputation + 2);

  // ── BLOCO C: coachingXP acumulado por temporada ────────────────
  // XP base: 10/temporada. Bônus por resultado do pupilo.
  let xpGain = 10;
  if      (titleWon === 'SLAM')    xpGain += 40;
  else if (titleWon === 'MASTERS') xpGain += 20;
  else if (titleWon)               xpGain += 10;
  if (evaluation.outcome === 'EXCEEDED') xpGain += 8;
  else if (evaluation.outcome === 'MET') xpGain += 4;
  updatedCoach.coachingXP = (updatedCoach.coachingXP ?? 0) + xpGain;

  // ── BLOCO C: desbloqueio de trait LONGA_PARCERIA (3+ temporadas) ──
  // Só desbloqueia se o coach ainda não tem o trait.
  const coachTraits = updatedCoach.traits ?? [];
  if (!coachTraits.includes('LONGA_PARCERIA') && seasonsToget >= 3) {
    updatedCoach = { ...updatedCoach, traits: [...coachTraits, 'LONGA_PARCERIA'] };
    // Também espelha no snapshot do jogador
    updatedCoachData.traits = [...(updatedCoachData.traits ?? []), 'LONGA_PARCERIA'];
  }

  // ── BLOCO C: FORMADOR_PRODIGIO — coach que transformou um top-5 ──
  if (!coachTraits.includes('FORMADOR_PRODIGIO') &&
      !updatedCoach.traits.includes('FORMADOR_PRODIGIO') &&
      (player.rankPosition ?? 999) <= 5) {
    updatedCoach = { ...updatedCoach, traits: [...(updatedCoach.traits ?? []), 'FORMADOR_PRODIGIO'] };
  }

  // ── BLOCO C: alcunha de parceria (chemistry ≥ 80, 3+ temporadas) ──
  // Gerada uma vez e salva permanentemente no player.coach.partnershipNickname.
  let finalPlayer = { ...updatedPlayer, coach: { ...updatedCoachData } };
  if (!finalPlayer.coach.partnershipNickname && newBond >= 80 && seasonsToget >= 3) {
    const cStyle   = coachInPool.coachingStyle ?? 'ALL_ROUND_FORMER';
    const styleId  = player.styleId ?? '';
    const nickname = generatePartnershipNickname(cStyle, styleId);
    finalPlayer = {
      ...finalPlayer,
      coach: { ...finalPlayer.coach, partnershipNickname: nickname },
    };
  }

  // ── 11. Gerar evento para a timeline ──────────────────────────
  const event = _buildPartnershipEvent(player, coachInPool, evaluation, newBond, newMilestones, stateChanged, newState, rupture, season);

  return { updatedPlayer: finalPlayer, updatedCoach, event, rupture };
}

function _createMilestone(type, season) {
  const def = MILESTONE_TYPES[type];
  return { type, season, label: def?.label ?? type, icon: def?.icon ?? '⭐' };
}

function _computeRelationshipState(bond, bondHistory) {
  if (bond >= 50)  return 'STABLE';
  if (bond >= 30)  return 'TENSION';
  if (bond >= 15)  return 'CRISIS';
  return 'RUPTURE';
}

function _buildPartnershipEvent(player, coach, evaluation, newBond, newMilestones, stateChanged, newState, rupture, season) {
  if (rupture) {
    return {
      type:     'PARTNERSHIP_RUPTURE',
      playerId: player.id,
      player:   player.name,
      coachId:  coach.id,
      coach:    coach.fullName ?? coach.name,
      bond:     newBond,
      season,
      icon:     '💔',
      text:     `${player.name} e ${coach.fullName ?? coach.name} chegaram ao limite — parceria encerrada.`,
      year:     season,
    };
  }

  if (newMilestones.length > 0) {
    const m = newMilestones[newMilestones.length - 1];
    return {
      type:      'PARTNERSHIP_MILESTONE',
      playerId:  player.id,
      player:    player.name,
      coachId:   coach.id,
      coach:     coach.fullName ?? coach.name,
      milestone: m,
      bond:      newBond,
      season,
      icon:      m.icon,
      text:      `${player.name} & ${coach.fullName ?? coach.name}: ${m.label}.`,
      year:      season,
    };
  }

  if (stateChanged) {
    const stateDef = PARTNERSHIP_STATES[newState];
    return {
      type:      'PARTNERSHIP_STATE_CHANGE',
      playerId:  player.id,
      player:    player.name,
      coachId:   coach.id,
      newState,
      bond:      newBond,
      season,
      icon:      stateDef?.icon ?? '🔄',
      text:      `Relação ${player.name}/${coach.name} agora: ${stateDef?.label ?? newState}.`,
      year:      season,
    };
  }

  return null;
}

// ═══════════════════════════════════════════════════════════════════
// INICIALIZAÇÃO
// ═══════════════════════════════════════════════════════════════════

/**
 * Garante que player.coach tenha todos os campos de parceria.
 * Chamado no buildUniverse e ao contratar um novo técnico.
 *
 * @param {object} player
 * @param {object} coach   — do pool
 * @param {number} season
 * @returns {object}       — player com coach completo
 */
export function initPartnership(player, coach, season) {
  if (!player.coach) return player;

  const existing = player.coach;

  // Só inicializa se os campos de parceria ainda não existem
  if (existing.bondScore !== undefined) return player;

  // Bond inicial baseado na química completa (Bloco C)
  let initialChem = 65; // fallback
  try {
    initialChem = chemistryScore(coach, player);
  } catch (_) { /* coach incompleto — usa fallback */ }
  const initialBond = Math.round(35 + (initialChem / 100) * 30 + Math.random() * 10);

  // Gerar meta inicial
  const goal = generateSeasonGoal(player, coach, season);

  return {
    ...player,
    coach: {
      ...existing,
      bondScore:         Math.min(100, initialBond),
      bondHistory:       [],
      milestones:        [],
      goalHistory:       [],
      relationshipState: 'STABLE',
      seasonGoal:        goal,
      prevSeasonRank:    player.rankPosition ?? 999,
      startSeasonTitles: 0,
      lastGoalOutcome:   null,
      lastGoalNarrative: null,
    },
  };
}

// ═══════════════════════════════════════════════════════════════════
// CONSULTAS — usadas por outros sistemas
// ═══════════════════════════════════════════════════════════════════

/**
 * Retorna o estado atual da parceria de forma legível.
 */
export function getPartnershipState(player) {
  const bond  = player.coach?.bondScore ?? 50;
  const state = player.coach?.relationshipState ?? _computeRelationshipState(bond, []);
  const def   = PARTNERSHIP_STATES[state] ?? PARTNERSHIP_STATES.STABLE;
  return { state, bondScore: bond, label: def.label, icon: def.icon, color: def.color };
}

/**
 * Multiplicador de efetividade das instruções em partida.
 * Bond alto → instruções mais precisas e mais impactantes.
 *
 * Escala: CRISIS (0.55) → TENSION (0.80) → STABLE (1.00) → bond=100 (1.25)
 */
export function getBondInfluenceMultiplier(player) {
  const bond  = player.coach?.bondScore ?? 50;
  const state = player.coach?.relationshipState ?? 'STABLE';

  if (state === 'RUPTURE' || state === 'CRISIS') return 0.55 + (bond / 100) * 0.20;
  if (state === 'TENSION')                        return 0.75 + (bond / 100) * 0.15;
  // STABLE
  return 0.95 + (bond / 100) * 0.30;  // 0.95 → 1.25 (bond 0→100)
}

/**
 * Fator de frequência de instruções no changeover.
 * CRISIS → coach fala menos; STABLE com bond alto → coach fala mais e com mais clareza.
 *
 * Retorna multiplicador para probabilidade de gerar instrução no changeover.
 * 0.30 (ruptura) … 1.00 (bond alto, estável)
 */
export function getInstructionFrequencyFactor(player) {
  const state = player.coach?.relationshipState ?? 'STABLE';
  const bond  = player.coach?.bondScore ?? 50;

  if (state === 'RUPTURE') return 0.30;
  if (state === 'CRISIS')  return 0.50;
  if (state === 'TENSION') return 0.72;
  // STABLE: escala com bond
  return 0.80 + (bond / 100) * 0.20;  // 0.80 → 1.00
}

// ═══════════════════════════════════════════════════════════════════
// PROCESSAMENTO FIM DE ANO — ponto de entrada principal
// ═══════════════════════════════════════════════════════════════════

/**
 * Processa toda a lógica de parceria para todos os jogadores.
 * Chamado no ADVANCE_YEAR, DEPOIS de processCoachContracts.
 *
 * Para cada jogador:
 *   1. Avalia a meta do ano
 *   2. Atualiza o bond
 *   3. Registra marcos
 *   4. Se houve ruptura: delega dispensa ao CoachContractSystem
 *   5. Gera nova meta para a próxima temporada
 *
 * @param {Array}  players      — allAfterContracts (tour + prospects)
 * @param {Array}  coachPool
 * @param {number} season
 * @param {object} seasonMetrics — { playerId: { wins, finals, titles, slamFinals, ... } }
 * @param {object} titleWinners  — { playerId: 'SLAM'|'MASTERS'|... }
 * @param {object} prevRankMap   — { playerId: rankAnterior }
 * @returns {{ players: Array, coachPool: Array, events: Array }}
 */
export function processAllPartnerships(players, coachPool, season, seasonMetrics = {}, titleWinners = {}, prevRankMap = {}) {
  let pool   = coachPool.map(c => ({ ...c }));
  const events = [];
  const updatedPlayers = [];

  for (let player of players) {
    if (!player.coach) {
      updatedPlayers.push(player);
      continue;
    }

    const coachId     = player.coach.coachId;
    const coachInPool = pool.find(c => c.id === coachId);
    if (!coachInPool) {
      updatedPlayers.push(player);
      continue;
    }

    const metrics   = seasonMetrics[player.id] ?? {};
    const titleWon  = titleWinners[player.id] ?? null;
    const prevRank  = prevRankMap[player.id] ?? (player.coach?.prevSeasonRank ?? player.rankPosition ?? 999);
    const goal      = player.coach.seasonGoal ?? null;

    // ── 1. Avaliar meta ────────────────────────────────────────
    const evaluation = evaluateSeasonGoal(player, coachInPool, goal, season, metrics, titleWon, prevRank);

    // ── 1b. Registrar meta avaliada no histórico de objetivos ──
    // Feito ANTES de updatePartnershipBond para preservar o goal atual.
    const goalHistoryEntry = goal ? {
      season,
      goalType:  goal.type,
      goalLabel: goal.label,
      ambition:  goal.ambition ?? 'REALISTIC',
      outcome:   evaluation.outcome,
      bondDelta: evaluation.bondDelta,
      narrative: evaluation.narrative,
      achieved:  evaluation.achieved ?? false,
      annualGoal: goal.annualGoal ?? goal,
      surfaceGoals: goal.surfaceGoals ?? [],
      annualEval: evaluation.annualEval ?? null,
      surfaceEvals: evaluation.surfaceEvals ?? [],
    } : null;

    // ── 2. Atualizar bond e marcos ─────────────────────────────
    const { updatedPlayer, updatedCoach, event, rupture } = updatePartnershipBond(
      player, coachInPool, evaluation, season, metrics, titleWon, prevRank,
    );

    pool = pool.map(c => c.id === coachId ? updatedCoach : c);

    if (event) events.push(event);

    // ── 3. Ruptura de parceria ─────────────────────────────────
    if (rupture) {
      // Desvincula — o CoachContractSystem vai contratar novo técnico
      const separated = _separatePartnership(updatedPlayer, updatedCoach, season, evaluation);
      pool = pool.map(c => c.id === coachId ? { ...updatedCoach, availability: 'FREE', currentPupilId: null } : c);
      updatedPlayers.push(separated);
      continue;
    }

    // ── 4. Gerar nova meta para a próxima temporada ────────────
    const nextGoal = generateSeasonGoal(updatedPlayer, updatedCoach, season + 1, metrics);

    // ── 4b. Salvar goalHistory atualizado ──────────────────────
    const prevGoalHistory = updatedPlayer.coach?.goalHistory ?? [];
    const newGoalHistory  = goalHistoryEntry
      ? [...prevGoalHistory, goalHistoryEntry]
      : prevGoalHistory;

    player = {
      ...updatedPlayer,
      coach: {
        ...updatedPlayer.coach,
        seasonGoal:  nextGoal,
        goalHistory: newGoalHistory,
      },
    };

    updatedPlayers.push(player);
  }

  return { players: updatedPlayers, coachPool: pool, events };
}

// ═══════════════════════════════════════════════════════════════════
// HELPERS INTERNOS
// ═══════════════════════════════════════════════════════════════════

function _separatePartnership(player, coach, season, evaluation) {
  const startSeason = player.coach?.startSeason ?? season;
  const milestones  = player.coach?.milestones ?? [];
  const bond        = player.coach?.bondScore ?? 0;

  // Tipo de separação determinado pelo histórico
  let separationType;
  if (milestones.some(m => m.type === 'FIRST_SLAM_TOGETHER')) {
    separationType = bond > 20 ? 'AMICABLE_LEGENDS' : 'PAINFUL_END';
  } else if (milestones.length > 0) {
    separationType = 'MUTUAL_END';
  } else {
    separationType = evaluation.outcome === 'FAILED' ? 'DISMISSAL' : 'NATURAL_END';
  }

  const historyEntry = {
    coachId:          coach.id,
    name:             coach.name,
    fullName:         coach.fullName ?? coach.name,
    philosophy:       coach.philosophy,
    specialty:        coach.specialty ?? [],
    startSeason,
    endSeason:        season,
    seasons:          season - startSeason,
    milestones,
    finalBond:        bond,
    goalHistory:      player.coach?.goalHistory ?? [],
    bondHistory:      player.coach?.bondHistory ?? [],
    partnershipNickname: player.coach?.partnershipNickname ?? null,
    relationshipState:   player.coach?.relationshipState ?? null,
    separationType,
    lastOutcome:      evaluation.outcome,
  };

  return {
    ...player,
    coach: null,
    coachHistory: [...(player.coachHistory ?? []), historyEntry],
  };
}

/** Compatibilidade filosófica (0-100) entre coach e estilo do jogador */
function _philosophyCompatScore(philosophy, styleId) {
  const IDEAL_MAP = {
    AGG_BASELINER: 'OFFENSIVE', PWR_BASE: 'OFFENSIVE', BIG_SERVER: 'OFFENSIVE',
    TAKEALLRISK:   'OFFENSIVE',
    RETRIEVER: 'DEFENSIVE', GRINDER: 'DEFENSIVE', CTR_PUNCHER: 'DEFENSIVE',
    NET_SPEC:  'SPECIALIST', SRV_VOL: 'SPECIALIST',
    ALL_COURT: 'COMPLETE',  TACT_TEC: 'COMPLETE',
    ADPT_TAC:  'MENTAL',    MOMENTUM_PLAYER: 'MENTAL',
  };
  const ideal = IDEAL_MAP[styleId];
  if (!ideal) return 65;
  if (philosophy === ideal) return 100;
  if (philosophy === 'COMPLETE') return 65;
  const OPPOSITES = { OFFENSIVE: 'DEFENSIVE', DEFENSIVE: 'OFFENSIVE' };
  if (OPPOSITES[philosophy] === ideal) return 30;
  return 55;
}

function _estimateAge(player, season) {
  if (player.birthYear) return season - player.birthYear;
  if (player.age)       return player.age;
  return 24; // fallback neutro
}

