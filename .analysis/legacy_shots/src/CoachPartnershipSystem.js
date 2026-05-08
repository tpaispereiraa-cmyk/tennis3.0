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
export function generateSeasonGoal(player, coach, season, metrics = {}) {
  const rank    = player.rankPosition ?? 128;
  const age     = _estimateAge(player, season);
  const phil    = coach?.philosophy ?? 'COMPLETE';
  const injured = !!(player.injury?.active);
  const bond    = player.coach?.bondScore ?? 50;

  // ── Candidatos por contexto ────────────────────────────────────
  const candidates = {
    conservative: _pickConservativeGoal(player, rank, age, metrics, injured),
    realistic:    _pickRealisticGoal(player, rank, age, metrics, injured, phil),
    ambitious:    _pickAmbitiousGoal(player, rank, age, metrics, injured, phil),
  };

  // ── Seleção: qual meta adotar? ─────────────────────────────────
  // Bond alto + filosofia MENTAL/OFFENSIVE + jovem = tende ao ambicioso
  // Bond baixo + lesão recente = conservador
  // Resto = realista
  let chosen;
  let ambitionLevel;

  if (injured || bond < 25) {
    chosen = candidates.conservative;
    ambitionLevel = 'CONSERVATIVE';
  } else if (age <= 23 && (phil === 'OFFENSIVE' || phil === 'MENTAL') && bond >= 60) {
    chosen = candidates.ambitious;
    ambitionLevel = 'AMBITIOUS';
  } else if (bond >= 70 && rank <= 20) {
    // Parceria sólida + jogador de elite = mira alto
    chosen = candidates.ambitious;
    ambitionLevel = 'AMBITIOUS';
  } else {
    chosen = candidates.realistic;
    ambitionLevel = 'REALISTIC';
  }

  return {
    ...chosen,
    season,
    ambition: ambitionLevel,
    allCandidates: candidates,   // mantém para UI
    rationale: _goalRationale(chosen, phil, bond, age, rank, injured),
  };
}

/** Meta conservadora: baseada na segurança e no que já foi alcançado */
function _pickConservativeGoal(player, rank, age, metrics, injured) {
  if (injured) {
    return { type: 'RECOVER_FROM_INJURY', label: GOAL_TYPES.RECOVER_FROM_INJURY.label, target: null };
  }
  if (rank > 100) {
    return { type: 'RETURN_TOP_50', label: GOAL_TYPES.RETURN_TOP_50.label, target: 50 };
  }
  if (rank > 50) {
    return { type: 'ENTER_TOP_50', label: GOAL_TYPES.ENTER_TOP_50.label, target: 50 };
  }
  if (rank > 20) {
    return { type: 'ENTER_TOP_20', label: GOAL_TYPES.ENTER_TOP_20.label, target: 20 };
  }
  if (rank > 10) {
    return { type: 'IMPROVE_RANKING', label: `Melhorar para Top ${Math.max(10, rank - 5)}`, target: Math.max(10, rank - 5) };
  }
  return { type: 'DEFEND_RANKING', label: `Defender o Top ${rank <= 5 ? '5' : '10'}`, target: rank <= 5 ? 5 : 10 };
}

/** Meta realista: estica um pouco além do atual */
function _pickRealisticGoal(player, rank, age, metrics, injured, phil) {
  if (injured) {
    return { type: 'PLAY_FULL_SEASON', label: GOAL_TYPES.PLAY_FULL_SEASON.label, target: null };
  }

  const prevTitles = metrics?.titles ?? 0;
  const prevFinals = (metrics?.finals ?? 0);
  const prevSlams  = metrics?.slamResults ?? 0;

  if (rank > 80) {
    return { type: 'ENTER_TOP_50', label: GOAL_TYPES.ENTER_TOP_50.label, target: 50 };
  }
  if (rank > 30) {
    return { type: 'ENTER_TOP_20', label: GOAL_TYPES.ENTER_TOP_20.label, target: 20 };
  }
  if (rank > 10) {
    // Está chegando ao top — meta de Slam SF se já mostrou ritmo
    if (prevFinals >= 1) {
      return { type: 'REACH_SLAM_SF', label: GOAL_TYPES.REACH_SLAM_SF.label, target: null };
    }
    return { type: 'ENTER_TOP_10', label: GOAL_TYPES.ENTER_TOP_10.label, target: 10 };
  }
  // Top 10 — foco em títulos
  if (prevTitles === 0) {
    return { type: 'WIN_FIRST_TITLE', label: GOAL_TYPES.WIN_FIRST_TITLE.label, target: null };
  }
  if (rank > 5) {
    return { type: 'WIN_MASTERS', label: GOAL_TYPES.WIN_MASTERS.label, target: null };
  }
  return { type: 'WIN_SLAM', label: GOAL_TYPES.WIN_SLAM.label, target: null };
}

/** Meta ambiciosa: aponta para o próximo nível */
function _pickAmbitiousGoal(player, rank, age, metrics, injured, phil) {
  if (injured) {
    return { type: 'RECOVER_FROM_INJURY', label: GOAL_TYPES.RECOVER_FROM_INJURY.label, target: null };
  }

  const prevSlams  = metrics?.slamSFs ?? 0;

  if (rank > 50) {
    return { type: 'ENTER_TOP_20', label: GOAL_TYPES.ENTER_TOP_20.label, target: 20 };
  }
  if (rank > 20) {
    return { type: 'ENTER_TOP_10', label: GOAL_TYPES.ENTER_TOP_10.label, target: 10 };
  }
  if (rank > 10) {
    return { type: 'REACH_SLAM_FINAL', label: GOAL_TYPES.REACH_SLAM_FINAL.label, target: null };
  }
  // Elite — mira Slam
  if (prevSlams >= 2) {
    return { type: 'WIN_SLAM', label: GOAL_TYPES.WIN_SLAM.label, target: null };
  }
  return { type: 'REACH_SLAM_FINAL', label: GOAL_TYPES.REACH_SLAM_FINAL.label, target: null };
}

/** Narrativa explicando por que essa meta foi escolhida */
function _goalRationale(goal, phil, bond, age, rank, injured) {
  if (injured) return 'Com a lesão em mente, a prioridade é a recuperação.';
  if (bond < 25) return 'Com a parceria sob pressão, focamos no essencial.';

  const PHIL_PHRASES = {
    OFFENSIVE: 'Trabalhamos para atacar e encurtar os rallys.',
    DEFENSIVE: 'A consistência é nossa arma. Vencemos pelo desgaste.',
    COMPLETE:  'Desenvolvimento equilibrado em todas as áreas.',
    SPECIALIST:'Domínio no nosso piso preferido é a chave.',
    MENTAL:    'A cabeça decide. Trabalhamos os momentos decisivos.',
  };

  const philPhrase = PHIL_PHRASES[phil] ?? '';

  if (age <= 22) return `Com ${age} anos, o crescimento é o horizonte. ${philPhrase}`;
  if (rank <= 5)  return `No topo do mundo, cada detalhe importa. ${philPhrase}`;
  if (rank <= 20) return `A elite está ao alcance. ${philPhrase}`;
  return philPhrase || 'Meta definida com base no desempenho recente.';
}

// ═══════════════════════════════════════════════════════════════════
// AVALIAÇÃO DE META
// ═══════════════════════════════════════════════════════════════════

/**
 * Avalia o cumprimento da meta sazonal.
 *
 * @param {object} player       — jogador no fim da temporada
 * @param {object} coach        — coach do pool
 * @param {object} goal         — goal definido no início do ano
 * @param {number} season       — temporada que terminou
 * @param {object} metrics      — seasonMetrics coletados
 * @param {string|null} titleWon — 'SLAM'|'MASTERS'|'ATP500'|'ATP250'|null
 * @param {number} prevRank     — ranking no início do ano
 * @returns {{ outcome, bondDelta, narrative, achieved }}
 */
export function evaluateSeasonGoal(player, coach, goal, season, metrics = {}, titleWon = null, prevRank = null) {
  if (!goal) return { outcome: 'PARTIAL', bondDelta: 0, narrative: 'Sem meta definida.', achieved: false };

  const currentRank = player.rankPosition ?? 999;
  const target      = goal.target;
  const ambition    = goal.ambition ?? 'REALISTIC';

  // ── Verificação de cumprimento por tipo de meta ────────────────
  let achieved    = false;
  let partial     = false;

  switch (goal.type) {
    case 'ENTER_TOP_10':
    case 'ENTER_TOP_20':
    case 'ENTER_TOP_50':
    case 'IMPROVE_RANKING':
    case 'RETURN_TOP_50':
      achieved = target !== null && currentRank <= target;
      partial  = !achieved && target !== null && currentRank <= target + Math.ceil(target * 0.3);
      break;

    case 'DEFEND_RANKING': {
      const prev = prevRank ?? (player.coach?.prevSeasonRank ?? currentRank);
      achieved = currentRank <= prev + 5;   // margem de 5 posições
      partial  = !achieved && currentRank <= prev + 15;
      break;
    }

    case 'WIN_SLAM':
      achieved = titleWon === 'SLAM';
      partial  = !achieved && (metrics?.slamFinals ?? 0) >= 1;
      break;

    case 'WIN_MASTERS':
      achieved = titleWon === 'MASTERS' || titleWon === 'SLAM';
      partial  = !achieved && (metrics?.finals ?? 0) >= 1 && currentRank <= 20;
      break;

    case 'WIN_ATP500':
      achieved = ['ATP500', 'MASTERS', 'SLAM'].includes(titleWon);
      partial  = !achieved && (metrics?.finals ?? 0) >= 1;
      break;

    case 'WIN_FIRST_TITLE': {
      const hadTitle = (player.coach?.startSeasonTitles ?? 0) > 0;
      achieved = !hadTitle && titleWon !== null;
      partial  = !achieved && (metrics?.finals ?? 0) >= 2;
      break;
    }

    case 'REACH_SLAM_FINAL':
      achieved = (metrics?.slamFinals ?? 0) >= 1;
      partial  = !achieved && (metrics?.slamSFs ?? 0) >= 1;
      break;

    case 'REACH_SLAM_SF':
      achieved = (metrics?.slamSFs ?? 0) >= 1 || (metrics?.slamFinals ?? 0) >= 1;
      partial  = !achieved && currentRank <= 20;
      break;

    case 'REACH_MASTERS_FINAL':
      achieved = (metrics?.mastersFinals ?? 0) >= 1 || titleWon === 'MASTERS';
      partial  = !achieved && (metrics?.finals ?? 0) >= 2;
      break;

    case 'FINISH_TOP_10':
      achieved = currentRank <= 10;
      partial  = !achieved && currentRank <= 15;
      break;

    case 'FINISH_TOP_20':
      achieved = currentRank <= 20;
      partial  = !achieved && currentRank <= 28;
      break;

    case 'WIN_3_TITLES':
      achieved = (metrics?.titles ?? 0) >= 3;
      partial  = !achieved && (metrics?.titles ?? 0) >= 2;
      break;

    case 'REACH_5_FINALS':
      achieved = (metrics?.finals ?? 0) >= 5;
      partial  = !achieved && (metrics?.finals ?? 0) >= 3;
      break;

    case 'RECOVER_FROM_INJURY':
    case 'PLAY_FULL_SEASON': {
      const gamesPlayed = metrics?.wins ?? 0 + (metrics?.losses ?? 0);
      achieved = gamesPlayed >= 20;
      partial  = !achieved && gamesPlayed >= 10;
      break;
    }

    default:
      partial = true;
  }

  // ── Outcome ────────────────────────────────────────────────────
  let outcome;
  let bondDelta;

  // Avaliar contexto de superação (exceeded = alcançou E foi ambicioso)
  const exceeded = achieved && ambition === 'AMBITIOUS';

  if (exceeded) {
    outcome   = 'EXCEEDED';
    bondDelta = _bondDeltaForOutcome('EXCEEDED', ambition, coach);
  } else if (achieved) {
    outcome   = 'MET';
    bondDelta = _bondDeltaForOutcome('MET', ambition, coach);
  } else if (partial) {
    outcome   = 'PARTIAL';
    bondDelta = _bondDeltaForOutcome('PARTIAL', ambition, coach);
  } else {
    outcome   = 'FAILED';
    bondDelta = _bondDeltaForOutcome('FAILED', ambition, coach);
  }

  // Bônus por títulos acima da meta
  if (titleWon === 'SLAM' && goal.type !== 'WIN_SLAM') {
    bondDelta += 12;   // Grand Slam inesperado eleva a relação
  } else if (titleWon === 'MASTERS' && !['WIN_SLAM','WIN_MASTERS'].includes(goal.type)) {
    bondDelta += 8;
  }

  // Penalidade adicional se a meta era conservadora e ainda falhou
  if (!achieved && !partial && ambition === 'CONSERVATIVE') {
    bondDelta -= 5;
  }

  const narrative = _buildGoalNarrative(goal, outcome, player, titleWon, metrics, currentRank);

  return { outcome, bondDelta, narrative, achieved, exceeded };
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
function _buildGoalNarrative(goal, outcome, player, titleWon, metrics, currentRank) {
  const name = player.name ?? 'O jogador';
  const goalLabel = goal.label ?? 'a meta';

  switch (outcome) {
    case 'EXCEEDED':
      if (titleWon === 'SLAM') return `${name} não só cumpriu a meta — venceu um Grand Slam. Uma temporada histórica.`;
      return `${name} superou "${goalLabel}". Temporada acima de tudo o que foi planejado.`;
    case 'MET':
      return `${name} cumpriu a meta: "${goalLabel}". Temporada dentro do planejado.`;
    case 'PARTIAL':
      return `${name} chegou perto de "${goalLabel}", mas não completou. Progresso real, mas insuficiente.`;
    case 'FAILED':
      if ((metrics?.titles ?? 0) > 0 && goal.type.startsWith('ENTER_TOP')) {
        return `${name} venceu títulos mas não alcançou o ranking alvo. Inconsistência ao longo do ano.`;
      }
      return `${name} não conseguiu "${goalLabel}". Temporada abaixo do esperado.`;
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
