/**
 * AnalystSystem.js
 * ─────────────────────────────────────────────────────────────────
 * TIME DE ANALISTAS DO TENNIS UNIVERSE
 *
 * Cinco vozes. Cinco obsessões. Uma mesa redonda.
 *
 * Diferente da imprensa (que narra) e das entrevistas (que humanizam),
 * os analistas DISSECAM. Eles pegam os dados, os padrões, os números
 * ocultos, e transformam em linguagem que educa, provoca e surpreende.
 *
 * ANALISTAS:
 *   VOLKOV    — O Estatístico Frio. Eficiências, porcentagens, benchmarks.
 *   OKAFOR    — O Tático. Padrões de jogo, exploração de fraquezas, game plans.
 *   LENZ      — O Historiador. Contexto, raridades, marcos, curiosidades insólitas.
 *   FERREIRA  — O Provocador. Teses controversas, o que os outros ignoram.
 *   PARK      — A Sistêmica. Tendências de circuito, ondas, eras, o macro.
 *
 * OUTPUTS:
 *   generatePreTournamentAnalysis(tournament, state) → AnalystReport[]
 *   generatePostTournamentAnalysis(tournament, bracket, state) → AnalystReport[]
 *   generateRoundtableDebate(topic, analysts, state) → RoundtableReport
 *
 * ESTRUTURA DE REPORT:
 *   { analyst, type, headline, lede, body[], data, tags, tone }
 *
 * ─────────────────────────────────────────────────────────────────
 */

// ══════════════════════════════════════════════════════════════════
// UTILITÁRIOS
// ══════════════════════════════════════════════════════════════════

const pick  = arr => arr[Math.floor(Math.random() * arr.length)];
const pct   = (n, d) => (!d ? 0 : Math.round((n / d) * 100));
const fmt   = n => (n * 100).toFixed(1) + '%';
const round = (n, d = 1) => parseFloat(n.toFixed(d));
const ANALYST_ELIGIBLE_CATEGORIES = new Set([
  'ATP_250',
  'ATP_500',
  'MASTERS_1000',
  'SLAM_CLASH',
  'GRAND_SLAM',
  'OLYMPICS',
  'FINALS',
]);

function top(arr, n, key) {
  return [...arr].sort((a, b) => (b[key] ?? 0) - (a[key] ?? 0)).slice(0, n);
}

function pickWeighted(options) {
  // options: [{ value, weight }]
  const total = options.reduce((s, o) => s + o.weight, 0);
  let r = Math.random() * total;
  for (const o of options) {
    r -= o.weight;
    if (r <= 0) return o.value;
  }
  return options[options.length - 1].value;
}

// ══════════════════════════════════════════════════════════════════
// CATÁLOGO DE ANALISTAS
// ══════════════════════════════════════════════════════════════════

export const ANALYSTS = {

  // ── VOLKOV ───────────────────────────────────────────────────────
  VOLKOV: {
    id:       'VOLKOV',
    name:     'Dmitri Volkov',
    title:    'Analista Quantitativo',
    outlet:   'Circuit Analytics Lab',
    origin:   'RUS',
    age:      44,
    icon:     '📐',
    color:    '#4A90D9',
    accent:   '#7BB8F5',
    photo:    null,

    // Personalidade
    obsession:   'eficiência — o que os números revelam que o olho não vê',
    blindspot:   'tende a subestimar o peso psicológico e emocional',
    signature:   'sempre ancora análise em benchmark histórico do circuito',
    toneProfile: 'COLD_ANALYTICAL', // preciso, clínico, sem exageros

    // Especialidades por tipo de análise
    specialties: ['serve_efficiency', 'hold_rate', 'break_rate', 'error_blend', 'rally_length', 'surface_pct'],

    // Voz textual
    voice: {
      opening: [
        'Os números desta semana merecem atenção.',
        'Vou começar pelos dados, porque é lá que a verdade está.',
        'Antes de qualquer narrativa, os fatos.',
        'O circuito tem memória curta. As estatísticas, não.',
        'Três números explicam o que aconteceu aqui.',
      ],
      transition: [
        'O que isso traduz em eficiência real:',
        'Convertendo para métrica comparável:',
        'O benchmark do circuito para esse indicador é:',
        'Isolando a variável:',
        'Para contextualizar essa cifra:',
      ],
      insight_prefix: [
        'O dado mais revelador:',
        'O que poucos notaram:',
        'A métrica que define o torneio:',
        'Traduzindo em números concretos:',
        'O número que explica tudo:',
      ],
      closing: [
        'Os dados não mentem. A interpretação, às vezes, sim.',
        'Esse padrão é estatisticamente significativo.',
        'As próximas semanas vão confirmar ou refutar essa tendência.',
        'O modelo não prevê — descreve. A descrição aqui é clara.',
        'Eficiência não é glamourosa. Mas é o que separa os semifinalistas dos campeões.',
      ],
    },

    // Capacidade de detectar anomalias
    anomalyThresholds: {
      serve1_elite:   0.72,   // acima disso = elite
      serve1_poor:    0.55,   // abaixo disso = problema
      hold_elite:     0.85,
      hold_poor:      0.60,
      break_elite:    0.45,
      error_blend_high: 0.70, // 70%+ de erros forçados = dominância tática
    },
  },

  // ── OKAFOR ───────────────────────────────────────────────────────
  OKAFOR: {
    id:       'OKAFOR',
    name:     'Chidi Okafor',
    title:    'Analista Tático',
    outlet:   'TennisIQ Magazine',
    origin:   'NGA',
    age:      38,
    icon:     '♟️',
    color:    '#2ECC71',
    accent:   '#58D68D',
    photo:    null,

    obsession:   'como um jogador constrói pontos — sequência, intenção, padrão',
    blindspot:   'pode ser muito técnico para o leitor casual',
    signature:   'sempre identifica o ponto fraco que o adversário explorou (ou deveria ter explorado)',
    toneProfile: 'PRECISE_TACTICAL',

    specialties: ['shot_patterns', 'style_matchups', 'surface_exploitation', 'game_plan_read', 'weakness_exposure'],

    voice: {
      opening: [
        'Táticas. É disso que estamos falando.',
        'O placar esconde o jogo. Vou mostrar o jogo.',
        'Existe uma lógica em cada set. Vou desconstruí-la.',
        'Quando um jogo parece fácil, geralmente tem uma razão tática específica.',
        'Vamos falar de como os pontos foram construídos — não apenas ganhos.',
      ],
      transition: [
        'O padrão que emerge é:',
        'Taticamente, o que aconteceu foi:',
        'A sequência de construção de pontos mostra:',
        'O game plan que funcionou:',
        'A fraqueza que foi exposta:',
      ],
      insight_prefix: [
        'O detalhe tático que decidiu o torneio:',
        'O padrão que ninguém estava discutindo:',
        'A decisão tática mais importante da semana:',
        'O que o placar não conta:',
        'A exploração de fraqueza mais cirúrgica:',
      ],
      closing: [
        'Tênis é xadrez com raquetes. E nessa partida, um jogador teve o plano certo.',
        'O padrão tático aqui é reproduzível. Outros vão tentar copiar.',
        'O jogo evoluiu esta semana. A análise tem que acompanhar.',
        'Saber o que fazer não é suficiente — é preciso saber quando.',
        'O adversário do próximo torneio já está estudando esse vídeo.',
      ],
    },

    anomalyThresholds: {
      style_advantage_threshold: 2,  // diff de "pontos de vantagem de estilo"
      rally_dominance: 0.65,          // ganhar 65%+ dos rallies longos = dominância
    },
  },

  // ── LENZ ─────────────────────────────────────────────────────────
  LENZ: {
    id:       'LENZ',
    name:     'Hans Lenz',
    title:    'Historiador do Circuito',
    outlet:   'The Grand Record',
    origin:   'AUT',
    age:      57,
    icon:     '📜',
    color:    '#D4A017',
    accent:   '#F0C040',
    photo:    null,

    obsession:   'raridades, recordes, contexto histórico — o que nunca aconteceu antes',
    blindspot:   'às vezes superestima o peso do passado vs. a realidade atual',
    signature:   'sempre encontra o dado histórico insólito que ninguém lembrava',
    toneProfile: 'SCHOLARLY_WONDER',

    specialties: ['records', 'historical_comparisons', 'curiosities', 'milestones', 'surface_history'],

    voice: {
      opening: [
        'O circuito tem décadas de memória. E às vezes, o presente ecoa o passado de formas que surpreendem.',
        'Para entender o que aconteceu aqui, precisamos recuar.',
        'Existe um contexto histórico para isso que muda completamente a leitura.',
        'Vou começar pelo registro. O que os livros dizem sobre esse tipo de resultado.',
        'Há momentos em que um torneio não é apenas um torneio. Esta semana foi um desses.',
      ],
      transition: [
        'O que o arquivo histórico mostra:',
        'Comparando com o registro do circuito:',
        'A última vez que isso aconteceu foi:',
        'Em termos históricos:',
        'O precedente mais próximo:',
      ],
      insight_prefix: [
        'A curiosidade histórica desta edição:',
        'O recorde que poucos sabem que foi quebrado:',
        'O dado que só o arquivo revela:',
        'A raridade desta semana:',
        'O que o circuito não via desde:',
      ],
      closing: [
        'O circuito tem memória longa. E o que aconteceu esta semana vai ficar nela.',
        'Alguns resultados existem em um único torneio. Outros, em toda uma era. Este é dos segundos.',
        'Os recordes são os ossos do esporte. O que aconteceu aqui adicionou um novo.',
        'A história do circuito está sendo escrita em tempo real. Esta semana, mais um capítulo.',
        'Décadas de agora, quando alguém quiser entender este período, vai citar este torneio.',
      ],
    },

    anomalyThresholds: {
      upset_significance: 5,   // diff de ranking para considerar upset notável
      streak_notable: 3,       // 3+ vitórias consecutivas contra o mesmo padrão
      title_drought: 8,        // 8+ torneios sem título = seca notable
    },
  },

  // ── FERREIRA ─────────────────────────────────────────────────────
  FERREIRA: {
    id:       'FERREIRA',
    name:     'Gustavo Ferreira',
    title:    'Analista Crítico',
    outlet:   'O Contraditório',
    origin:   'BRA',
    age:      41,
    icon:     '🔥',
    color:    '#E74C3C',
    accent:   '#F1948A',
    photo:    null,

    obsession:   'o que a narrativa oficial está errando — o que todos ignoram',
    blindspot:   'pode ser excessivamente provocador por provocação',
    signature:   'apresenta a tese que vai contra o consenso, com dados para sustentar',
    toneProfile: 'CONTRARIAN_SHARP',

    specialties: ['narratives_debunked', 'overrated_performances', 'underrated_performances', 'pressure_analysis', 'critical_turning_points'],

    voice: {
      opening: [
        'Vou dizer o que ninguém quer ouvir.',
        'A narrativa oficial está errada. Deixa eu mostrar por quê.',
        'Todo mundo está celebrando. Eu tenho dúvidas.',
        'Esse resultado foi lido errado pelo circuito inteiro.',
        'Existe uma história mais honesta para contar sobre esse torneio.',
      ],
      transition: [
        'O que a narrativa oficial ignora:',
        'O inconveniente dos dados:',
        'O que os elogios esconderam:',
        'Sendo honesto sobre isso:',
        'A versão que não foi contada:',
      ],
      insight_prefix: [
        'A performance superestimada da semana:',
        'O campeão que teve sorte no draw:',
        'O dado que contradiz o consenso:',
        'O que o placar escondeu:',
        'A tese incômoda:',
      ],
      closing: [
        'Discorde. Mas olhe para os dados primeiro.',
        'A narrativa confortável raramente é a mais útil.',
        'O circuito vai continuar evitando essa conversa. Eu não vou.',
        'Não é cinismo — é precisão.',
        'O consenso erra. É para isso que existem analistas.',
      ],
    },

    anomalyThresholds: {
      lucky_draw_threshold: 0.3,   // probabilidade baixa = sorte no draw
      overperformance_ceiling: 1.3, // 30% acima da média = suspeito
    },
  },

  // ── PARK ─────────────────────────────────────────────────────────
  PARK: {
    id:       'PARK',
    name:     'Ji-Young Park',
    title:    'Analista de Tendências',
    outlet:   'Circuit Macro Report',
    origin:   'KOR',
    age:      35,
    icon:     '🌊',
    color:    '#9B59B6',
    accent:   '#C39BD3',
    photo:    null,

    obsession:   'tendências de circuito, ondas, o que está nascendo e morrendo',
    blindspot:   'pode perder o detalhe ao focar demais no macro',
    signature:   'identifica o que este torneio significa para o circuito como um todo',
    toneProfile: 'SYSTEMIC_ELEGANT',

    specialties: ['circuit_trends', 'era_analysis', 'surface_era', 'generation_analysis', 'momentum_waves'],

    voice: {
      opening: [
        'Nenhum torneio existe em isolamento.',
        'Este resultado faz mais sentido quando você olha os últimos doze meses.',
        'O circuito tem ciclos. E estamos em um ponto de inflexão.',
        'Existe um padrão maior acontecendo. Este torneio é mais uma peça.',
        'O micro conta o resultado. Eu prefiro o macro.',
      ],
      transition: [
        'No contexto do circuito atual:',
        'A tendência que esse resultado confirma:',
        'O que isso significa sistemicamente:',
        'A onda que está sendo construída:',
        'O ciclo que está se fechando (ou abrindo):',
      ],
      insight_prefix: [
        'A tendência de circuito que este torneio ilustra:',
        'O padrão sistêmico que emergiu esta semana:',
        'O que esse resultado sinaliza para os próximos meses:',
        'A era que está sendo declarada (ou encerrada):',
        'O movimento de circuito mais significativo:',
      ],
      closing: [
        'O circuito não para. Esta semana foi mais um movimento.',
        'A onda que está se formando vai chegar nos Grand Slams.',
        'Tendências não anunciam quando chegam. Mas chegam.',
        'O que o circuito está dizendo, se você souber ouvir.',
        'Este resultado vai parecer óbvio em retrospecto. Raramente é óbvio no momento.',
      ],
    },

    anomalyThresholds: {
      trend_confirmation: 3,  // 3+ torneios = tendência confirmada
      era_threshold: 0.6,     // dominar 60%+ dos torneios = era
    },
  },
};

// ══════════════════════════════════════════════════════════════════
// TIPOS DE ANÁLISE
// ══════════════════════════════════════════════════════════════════

export const ANALYSIS_TYPES = {
  // Pré-torneio
  PRE_FAVORITES:    { id: 'PRE_FAVORITES',    label: 'Favoritos & Chances',     icon: '🎯', phase: 'PRE'  },
  PRE_DRAW_STUDY:   { id: 'PRE_DRAW_STUDY',   label: 'Estudo do Draw',          icon: '🗂️', phase: 'PRE'  },
  PRE_SURFACE_FIT:  { id: 'PRE_SURFACE_FIT',  label: 'Adequação à Superfície',  icon: '🏟️', phase: 'PRE'  },
  PRE_FORM_WATCH:   { id: 'PRE_FORM_WATCH',   label: 'Forma do Momento',        icon: '📈', phase: 'PRE'  },
  PRE_DARK_HORSE:   { id: 'PRE_DARK_HORSE',   label: 'Azarão da Rodada',        icon: '🃏', phase: 'PRE'  },
  PRE_PRESSURE:     { id: 'PRE_PRESSURE',     label: 'Pressão & Stakes',        icon: '⚡', phase: 'PRE'  },

  // Pós-torneio
  POST_CHAMPION:    { id: 'POST_CHAMPION',    label: 'Análise do Campeão',      icon: '🏆', phase: 'POST' },
  POST_EFFICIENCY:  { id: 'POST_EFFICIENCY',  label: 'Relatório de Eficiência', icon: '📊', phase: 'POST' },
  POST_TACTICAL:    { id: 'POST_TACTICAL',    label: 'Leitura Tática',          icon: '♟️', phase: 'POST' },
  POST_RECORD:      { id: 'POST_RECORD',      label: 'Recordes & Marcos',       icon: '📜', phase: 'POST' },
  POST_UPSET:       { id: 'POST_UPSET',       label: 'Análise de Upsets',       icon: '💥', phase: 'POST' },
  POST_LOSER:       { id: 'POST_LOSER',       label: 'O Que Deu Errado',        icon: '🔍', phase: 'POST' },
  POST_TREND:       { id: 'POST_TREND',       label: 'Sinal de Tendência',      icon: '🌊', phase: 'POST' },
  POST_DEBATE:      { id: 'POST_DEBATE',      label: 'Mesa Redonda',            icon: '🎙️', phase: 'POST' },
  POST_NUMBERS:     { id: 'POST_NUMBERS',     label: 'Os Números do Torneio',   icon: '🔢', phase: 'POST' },
  POST_VERDICT:     { id: 'POST_VERDICT',     label: 'Veredicto Final',         icon: '⚖️', phase: 'POST' },
};

// ══════════════════════════════════════════════════════════════════
// SURFACE DATA
// ══════════════════════════════════════════════════════════════════

const SURFACE_LABELS = {
  CLAY:   { label: 'saibro',  adj: 'no saibro',  icon: '🏺' },
  GRASS:  { label: 'grama',   adj: 'na grama',   icon: '🌿' },
  HARD:   { label: 'hard',    adj: 'no hard',    icon: '🏙️' },
  INDOOR: { label: 'indoor',  adj: 'no indoor',  icon: '🏟️' },
};

const STYLE_SURFACE_AFFINITY = {
  // [style]: { surface: advantage (positive = good, negative = bad) }
  AGG_BASELINER:    { CLAY: +1, GRASS: 0,  HARD: +1, INDOOR: +1 },
  CTR_PUNCHER:      { CLAY: +2, GRASS: -1, HARD:  0, INDOOR: 0  },
  SRV_VOL:          { CLAY: -1, GRASS: +2, HARD:  0, INDOOR: +1 },
  BIG_SERVER:       { CLAY: -1, GRASS: +1, HARD: +1, INDOOR: +2 },
  RETRIEVER:        { CLAY: +1, GRASS: -1, HARD:  0, INDOOR: 0  },
  ALL_COURT:        { CLAY:  0, GRASS: +1, HARD: +1, INDOOR: +1 },
  GRINDER:          { CLAY: +2, GRASS: -2, HARD: -1, INDOOR: -1 },
  POWER_BASELINER:  { CLAY: -1, GRASS: 0,  HARD: +1, INDOOR: +2 },
  PWR_BASE:         { CLAY: -1, GRASS: 0,  HARD: +1, INDOOR: +2 },
  TAKEALLRISK:      { CLAY: -1, GRASS: +1, HARD: +1, INDOOR: +1 },
  MOMENTUM_PLAYER:  { CLAY:  0, GRASS:  0, HARD:  0, INDOOR: 0  },
  TACT_TEC:         { CLAY: +1, GRASS:  0, HARD: +1, INDOOR: +1 },
  NET_SPEC:         { CLAY: -1, GRASS: +2, HARD:  0, INDOOR: +1 },
};

function getSurfaceAffinity(styleId, surface) {
  const map = STYLE_SURFACE_AFFINITY[styleId] ?? {};
  return map[surface] ?? 0;
}

function affinityLabel(val) {
  if (val >= 2) return 'ESPECIALISTA';
  if (val === 1) return 'FAVORECIDO';
  if (val === 0) return 'NEUTRO';
  if (val === -1) return 'DESFAVORECIDO';
  return 'ADVERSIDADE SEVERA';
}

// ══════════════════════════════════════════════════════════════════
// EXTRATORES DE CONTEXTO
// ══════════════════════════════════════════════════════════════════

/**
 * Extrai dados relevantes de um jogador para análise.
 */
function extractPlayerContext(player, state) {
  const ranking = state?.rankingSystem?.getRanking?.() ?? [];
  const rank = ranking.find(r => r.id === player.id)?.rank ?? 99;
  const titles = player.careerTitles ?? { gs: 0, masters: 0, finals: 0, atp500: 0, atp250: 0 };
  const form = player.formHistory ?? [];       // últimos resultados
  const recentForm = form.slice(-8);
  const wins = recentForm.filter(r => r === 'W').length;
  const losses = recentForm.filter(r => r === 'L').length;

  return {
    id: player.id,
    name: player.name,
    nationality: player.nationality ?? '???',
    rank,
    styleId: player.styleId,
    age: player.age ?? 0,
    titles,
    totalTitles: (titles.gs ?? 0) + (titles.masters ?? 0) + (titles.finals ?? 0) + (titles.atp500 ?? 0) + (titles.atp250 ?? 0),
    recentWins: wins,
    recentLosses: losses,
    recentFormStr: `${wins}-${losses}`,
    attrs: player.attrs ?? {},
  };
}

/**
 * Extrai resultados do bracket (pós-torneio).
 */
function extractBracketResults(bracket) {
  if (!bracket) return { rounds: [], champion: null, finalist: null, upsets: [], totalMatches: 0 };

  const rounds   = bracket.rounds ?? [];
  const champion = bracket.champion ?? null;
  const finalist = bracket.finalist ?? null;
  const upsets   = [];
  let totalMatches = 0;

  for (const round of rounds) {
    for (const match of (round.matches ?? [])) {
      totalMatches++;
      const winner = match.winner;
      const loser  = match.loser;
      if (winner && loser) {
        const wRank = winner.rank ?? 99;
        const lRank = loser.rank  ?? 99;
        if (lRank < wRank - 5) {
          upsets.push({ winner, loser, round: round.name ?? round.id, rankDiff: wRank - lRank });
        }
      }
    }
  }

  upsets.sort((a, b) => b.rankDiff - a.rankDiff);

  return { rounds, champion, finalist, upsets, totalMatches };
}

/**
 * Agrega estatísticas de todos os jogadores do torneio.
 */
function aggregateTournamentStats(bracket) {
  const allStats = [];
  const allRallies = [];
  let totalAces = 0, totalWinners = 0, totalErrors = 0, totalForced = 0;
  let totalServe1In = 0, totalServe1Total = 0;
  let totalPoints = 0;

  const rounds = bracket?.rounds ?? [];
  for (const round of rounds) {
    for (const match of (round.matches ?? [])) {
      const stats = match.stats;
      if (!stats) continue;
      const sA = stats.a ?? {};
      const sB = stats.b ?? {};
      const ralliesA = sA.rallyLengths ?? [];
      const ralliesB = sB.rallyLengths ?? [];
      allRallies.push(...ralliesA, ...ralliesB);
      totalAces     += (sA.aces ?? 0) + (sB.aces ?? 0);
      totalWinners  += (sA.winners ?? 0) + (sB.winners ?? 0);
      totalErrors   += (sA.unforcedErrors ?? 0) + (sB.unforcedErrors ?? 0);
      totalForced   += (sA.forcedErrors ?? 0) + (sB.forcedErrors ?? 0);
      totalServe1In    += (sA.serve1In ?? 0) + (sB.serve1In ?? 0);
      totalServe1Total += (sA.serve1Total ?? 0) + (sB.serve1Total ?? 0);
      totalPoints   += ralliesA.length + ralliesB.length;
      allStats.push({ match, sA, sB });
    }
  }

  const avgRally = allRallies.length
    ? round(allRallies.reduce((s,v)=>s+v,0) / allRallies.length, 1)
    : 0;
  const maxRally = allRallies.length ? Math.max(...allRallies) : 0;
  const serve1Pct = totalServe1Total ? pct(totalServe1In, totalServe1Total) : 0;
  const errorBlend = (totalErrors + totalForced) ? pct(totalForced, totalErrors + totalForced) : 0;

  return {
    allStats,
    avgRally,
    maxRally,
    totalAces,
    totalWinners,
    totalErrors,
    totalForced,
    serve1Pct,
    errorBlend,
    totalPoints,
  };
}

// ══════════════════════════════════════════════════════════════════
// GERADORES DE CORPO DE ANÁLISE
// ══════════════════════════════════════════════════════════════════

// ── VOLKOV: Relatório de Eficiência ──────────────────────────────

function volkovPostEfficiency(tournament, bracket, state) {
  const agg  = aggregateTournamentStats(bracket);
  const { champion, upsets } = extractBracketResults(bracket);
  const surface = SURFACE_LABELS[tournament.surface] ?? SURFACE_LABELS.HARD;

  const benchmarks = {
    avgRally:  { low: 4.2, mid: 5.8, high: 7.5 },
    serve1Pct: { low: 58,  mid: 65,  high: 72  },
    errorBlend:{ low: 40,  mid: 55,  high: 68  },
  };

  const rallyTier = agg.avgRally > benchmarks.avgRally.high   ? 'ACIMA DO NORMAL'
                  : agg.avgRally < benchmarks.avgRally.low    ? 'ABAIXO DO NORMAL'
                  : 'DENTRO DA MÉDIA';

  const serve1Tier = agg.serve1Pct > benchmarks.serve1Pct.high  ? 'ALTO'
                   : agg.serve1Pct < benchmarks.serve1Pct.low   ? 'BAIXO'
                   : 'MÉDIO';

  const body = [];

  body.push(`${pick(ANALYSTS.VOLKOV.voice.opening)}`);

  body.push(
    `Rally médio de ${agg.avgRally} golpes — ${rallyTier} para ${surface.label}. ` +
    `O pico foi de ${agg.maxRally} golpes, registrado em ${tournament.name}.`
  );

  body.push(
    `Aproveitamento de primeiro saque no torneio: ${agg.serve1Pct}% — ` +
    `benchmark do circuito: 65%. Nível classificado como ${serve1Tier}.`
  );

  body.push(
    `${agg.totalAces} aces e ${agg.totalWinners} winners em ${agg.totalPoints} pontos disputados. ` +
    `Razão winner/erro: ${agg.totalErrors > 0 ? round(agg.totalWinners / agg.totalErrors, 2) : 'N/A'}.`
  );

  if (agg.errorBlend > 60) {
    body.push(
      `Índice de erros forçados: ${agg.errorBlend}%. ` +
      `Isso indica que a pressão tática — não os erros gratuitos — foi o fator dominante.`
    );
  } else if (agg.errorBlend < 45) {
    body.push(
      `Índice de erros forçados baixo: ${agg.errorBlend}%. ` +
      `O torneio foi marcado por erros voluntários — o nível de construção de pontos ficou abaixo do esperado.`
    );
  }

  if (champion) {
    const champCtx = extractPlayerContext(champion, state);
    body.push(
      `O campeão ${champion.name} encerrou o torneio como ${surface.adj} com ` +
      `a eficiência que os dados esperavam de um top-${champCtx.rank}.`
    );
  }

  body.push(pick(ANALYSTS.VOLKOV.voice.closing));

  return {
    analyst:  ANALYSTS.VOLKOV,
    type:     ANALYSIS_TYPES.POST_EFFICIENCY,
    headline: `Os Números de ${tournament.name}: Eficiência e Anomalias`,
    lede:     `Rally médio de ${agg.avgRally} golpes, ${agg.serve1Pct}% de 1° saque. O que os dados revelam.`,
    body,
    data: {
      avgRally:    agg.avgRally,
      maxRally:    agg.maxRally,
      serve1Pct:   agg.serve1Pct,
      errorBlend:  agg.errorBlend,
      totalAces:   agg.totalAces,
      totalWinners:agg.totalWinners,
    },
    tags: ['eficiência', 'estatísticas', 'saque', 'rally'],
    tone: 'COLD_ANALYTICAL',
  };
}

// ── OKAFOR: Leitura Tática ────────────────────────────────────────

function okaforPostTactical(tournament, bracket, state) {
  const { champion, finalist, upsets } = extractBracketResults(bracket);
  const surface = SURFACE_LABELS[tournament.surface] ?? SURFACE_LABELS.HARD;

  const body = [];
  body.push(pick(ANALYSTS.OKAFOR.voice.opening));

  if (champion) {
    const champAffinity = getSurfaceAffinity(champion.styleId, tournament.surface);
    const affinLabel    = affinityLabel(champAffinity);

    body.push(
      `${champion.name} (${champion.styleId ?? 'estilo não definido'}) ` +
      `é classificado como ${affinLabel} para o ${surface.label}. ` +
      `A campanha confirma ou contraria essa expectativa.`
    );

    if (champAffinity < 0) {
      body.push(
        `O dado mais interessante: o campeão superou a desvantagem estrutural de estilo. ` +
        `Isso geralmente indica adaptação tática intencional, não sorte no draw.`
      );
    }
  }

  if (finalist && champion) {
    const cAff = getSurfaceAffinity(champion.styleId, tournament.surface);
    const fAff = getSurfaceAffinity(finalist.styleId, tournament.surface);
    const diff = cAff - fAff;

    if (diff > 0) {
      body.push(
        `Na final, o confronto de estilos favorecia ${champion.name}. ` +
        `Afinidade com o ${surface.label}: campeão ${cAff > 0 ? '+' : ''}${cAff} vs finalista ${fAff > 0 ? '+' : ''}${fAff}. ` +
        `O resultado seguiu a lógica tática.`
      );
    } else if (diff < 0) {
      body.push(
        `Na final, a lógica de superfície favorecia ${finalist.name}. ` +
        `O fato de ${champion.name} ter vencido mesmo assim é o resultado taticamente mais significativo do torneio.`
      );
    }
  }

  if (upsets.length > 0) {
    const biggestUpset = upsets[0];
    body.push(
      `O maior upset da semana — ${biggestUpset.winner.name} sobre ${biggestUpset.loser.name} ` +
      `(${biggestUpset.round}) — merece leitura tática. ` +
      `Uma diferença de ranking de ${biggestUpset.rankDiff} posições raramente é explicada por acaso.`
    );
  }

  body.push(pick(ANALYSTS.OKAFOR.voice.closing));

  return {
    analyst:  ANALYSTS.OKAFOR,
    type:     ANALYSIS_TYPES.POST_TACTICAL,
    headline: `Leitura Tática: ${tournament.name}`,
    lede:     `Como os estilos interagiram. O que o placar não conta.`,
    body,
    data: {
      surface: tournament.surface,
      champion: champion?.name,
      finalist: finalist?.name,
      champAffinity: champion ? getSurfaceAffinity(champion.styleId, tournament.surface) : null,
      biggestUpset: upsets[0] ?? null,
    },
    tags: ['tática', 'estilos', 'superfície', 'game plan'],
    tone: 'PRECISE_TACTICAL',
  };
}

// ── LENZ: Recordes & Marcos ───────────────────────────────────────

function lenzPostRecord(tournament, bracket, state) {
  const { champion, upsets, totalMatches } = extractBracketResults(bracket);
  const agg = aggregateTournamentStats(bracket);
  const allPlayers = state?.players ?? [];

  const body = [];
  body.push(pick(ANALYSTS.LENZ.voice.opening));

  if (champion) {
    const champCtx = extractPlayerContext(champion, state);
    const totalTitles = champCtx.totalTitles + 1; // incluindo este

    if (tournament.category === 'GRAND_SLAM') {
      body.push(
        `${champion.name} conquista o ${totalTitles}º título da carreira, ` +
        `${champCtx.titles.gs + 1}º em Grand Slams. ` +
        `${champCtx.titles.gs + 1 >= 3 ? 'Entra no grupo seleto de múltiplos campeões de Slam.' : ''}`
      );
    } else if (tournament.category === 'MASTERS_1000') {
      body.push(
        `${champion.name} adiciona mais um Masters à prateleira. ` +
        `Total de Masters: ${(champCtx.titles.masters ?? 0) + 1}. ` +
        `O campeão segue construindo um palmarès que o circuito ainda está dimensionando.`
      );
    } else {
      body.push(
        `${champion.name} encerra ${tournament.name} com o título. ` +
        `${totalTitles}° título da carreira em torneios oficiais.`
      );
    }
  }

  if (agg.maxRally > 40) {
    body.push(
      `O rally mais longo do torneio atingiu ${agg.maxRally} golpes — ` +
      `um número que entra no registro de partidas mais disputadas desta edição.`
    );
  }

  if (upsets.length >= 3) {
    body.push(
      `${upsets.length} upsets significativos em um único torneio é um número fora da curva histórica. ` +
      `O circuito não costuma ver volatilidade assim em torneios de nível ${tournament.category ?? 'indefinido'}.`
    );
  } else if (upsets.length === 0 && tournament.category !== 'ATP_250') {
    body.push(
      `Curiosidade: nenhum upset expressivo nesta edição. ` +
      `O draw se resolveu de forma previsível, o que em si já é um dado histórico em torneios desta envergadura.`
    );
  }

  if (champion?.age) {
    if (champion.age <= 21) {
      body.push(
        `${champion.name} tem ${champion.age} anos. ` +
        `Campeões tão jovens nesta categoria são uma raridade no circuito — e quando aparecem, geralmente anunciam uma era.`
      );
    } else if (champion.age >= 33) {
      body.push(
        `Com ${champion.age} anos, ${champion.name} desafia a curva natural de declínio. ` +
        `Campeões acima dos 32 nesta categoria têm nomes contados na história do circuito.`
      );
    }
  }

  body.push(pick(ANALYSTS.LENZ.voice.closing));

  return {
    analyst:  ANALYSTS.LENZ,
    type:     ANALYSIS_TYPES.POST_RECORD,
    headline: `Recordes e Marcos: ${tournament.name} no Arquivo do Circuito`,
    lede:     `O que esta edição adiciona à história. O que o registro vai guardar.`,
    body,
    data: {
      champion: champion?.name,
      champAge: champion?.age,
      upsetCount: upsets.length,
      maxRally: agg.maxRally,
      category: tournament.category,
    },
    tags: ['recordes', 'história', 'marcos', 'arquivo'],
    tone: 'SCHOLARLY_WONDER',
  };
}

// ── FERREIRA: O Que Deu Errado (ou a Tese Contrária) ─────────────

function ferreiraPostVerdict(tournament, bracket, state) {
  const { champion, finalist, upsets } = extractBracketResults(bracket);
  const agg = aggregateTournamentStats(bracket);

  const body = [];
  body.push(pick(ANALYSTS.FERREIRA.voice.opening));

  // Sempre tem uma tese contrária
  const theses = [];

  if (finalist) {
    theses.push(
      `A narrativa vai celebrar ${champion?.name ?? 'o campeão'}. ` +
      `Mas ${finalist.name} perdeu a final — e a pergunta que ninguém está fazendo é: ` +
      `o que foi diferente no momento decisivo? Perder uma final não é fracasso. ` +
      `Mas perder sem entender o porquê é.`
    );
  }

  if (upsets.length === 0 && tournament.category === 'GRAND_SLAM') {
    theses.push(
      `Um Grand Slam sem upsets expressivos é um Grand Slam que falhou em revelar qualquer coisa nova. ` +
      `O circuito precisa de volatilidade para se renovar. ` +
      `Quando o favorito vence do começo ao fim, a narrativa ganha, o jogo perde.`
    );
  }

  if (agg.errorBlend < 50) {
    theses.push(
      `${agg.errorBlend}% de erros forçados. ` +
      `Mais da metade dos pontos decididos foram por gratuidade, não por pressão tática. ` +
      `Isso não é um torneio de alto nível — é um torneio onde o melhor sobreviveu aos próprios erros.`
    );
  }

  if (champion) {
    const champAff = getSurfaceAffinity(champion.styleId, tournament.surface);
    if (champAff >= 1) {
      theses.push(
        `${champion.name} venceu num torneio onde o estilo dele é claramente favorecido. ` +
        `Ganhar com vantagem estrutural é esperado, não celebrado. ` +
        `O verdadeiro teste vem quando a superfície não coopera.`
      );
    }
  }

  // Sempre pega a tese mais provocadora
  body.push(pick(theses.length > 0 ? theses : [
    `Este torneio não revelou nada que o circuito ainda não soubesse. ` +
    `Às vezes, a análise mais honesta é: foi um torneio comum. E comum não merece elogios automáticos.`
  ]));

  body.push(pick(ANALYSTS.FERREIRA.voice.closing));

  return {
    analyst:  ANALYSTS.FERREIRA,
    type:     ANALYSIS_TYPES.POST_VERDICT,
    headline: `Veredicto de ${tournament.name}: O Que Ninguém Disse`,
    lede:     `A narrativa oficial celebra. A análise honesta questiona.`,
    body,
    data: {
      champion: champion?.name,
      finalist: finalist?.name,
      errorBlend: agg.errorBlend,
      upsetCount: upsets.length,
    },
    tags: ['crítica', 'veredicto', 'contrarian', 'análise'],
    tone: 'CONTRARIAN_SHARP',
  };
}

// ── PARK: Sinal de Tendência ──────────────────────────────────────

function parkPostTrend(tournament, bracket, state) {
  const { champion, upsets } = extractBracketResults(bracket);
  const allResults = state?.tournamentHistory ?? [];
  const recentTitles = allResults.slice(-6); // últimos 6 torneios

  const body = [];
  body.push(pick(ANALYSTS.PARK.voice.opening));

  if (champion) {
    // Quantos dos últimos 6 esse cara venceu?
    const recentWins = recentTitles.filter(t => t.champion?.id === champion.id).length;
    if (recentWins >= 2) {
      body.push(
        `${champion.name} venceu ${recentWins} dos últimos ${recentTitles.length} torneios registrados. ` +
        `Isso não é forma. É dominância. E dominância que se sustenta por múltiplos torneios ` +
        `geralmente precede uma declaração de era.`
      );
    } else {
      body.push(
        `${champion.name} somou mais um título, mas a questão sistêmica é outra: ` +
        `o topo do circuito está concentrado em poucos nomes, ou há uma abertura real para novos protagonistas?`
      );
    }
  }

  // Análise de superfície no circuito atual
  const surfaceLabel = SURFACE_LABELS[tournament.surface] ?? SURFACE_LABELS.HARD;
  body.push(
    `O ${surfaceLabel.label} continua sendo a superfície com o perfil de resultado mais previsível? ` +
    `Ou este torneio mostrou que a hierarquia está sendo reescrita?`
  );

  if (upsets.length >= 2) {
    body.push(
      `${upsets.length} upsets em uma semana sinalizam abertura. ` +
      `Quando jovens ou outsiders eliminam o establishment com regularidade, ` +
      `o circuito está em fase de transição. Essa leitura macro vai importar nos próximos Grand Slams.`
    );
  }

  body.push(
    `O padrão que este torneio confirma, cancela ou inaugura vai ficar claro apenas nos próximos meses. ` +
    `Mas os sinais já estão aqui — é só saber lê-los.`
  );

  body.push(pick(ANALYSTS.PARK.voice.closing));

  return {
    analyst:  ANALYSTS.PARK,
    type:     ANALYSIS_TYPES.POST_TREND,
    headline: `${tournament.name} Como Sinal: O Que o Circuito Está Dizendo`,
    lede:     `Além do resultado. O que essa semana significa para os próximos meses.`,
    body,
    data: {
      champion: champion?.name,
      surface: tournament.surface,
      upsetCount: upsets.length,
      tournamentCategory: tournament.category,
    },
    tags: ['tendências', 'circuito', 'macro', 'era'],
    tone: 'SYSTEMIC_ELEGANT',
  };
}

// ══════════════════════════════════════════════════════════════════
// PRÉ-TORNEIO: GERADORES
// ══════════════════════════════════════════════════════════════════

function volkovPreFavorites(tournament, players, state) {
  const surface = SURFACE_LABELS[tournament.surface] ?? SURFACE_LABELS.HARD;
  const ranking = state?.rankingSystem?.getRanking?.() ?? [];

  // Top 8 do ranking no draw
  const drawPlayers = players ?? [];
  const sorted = [...drawPlayers]
    .map(p => ({
      ...p,
      rank: ranking.find(r => r.id === p.id)?.rank ?? 99,
      surfaceAff: getSurfaceAffinity(p.styleId, tournament.surface),
    }))
    .sort((a, b) => a.rank - b.rank)
    .slice(0, 8);

  const body = [];
  body.push(pick(ANALYSTS.VOLKOV.voice.opening));

  body.push(
    `${tournament.name} — ${tournament.category ?? ''} — começa com ${players?.length ?? '?'} jogadores no draw. ` +
    `${surface.icon} Superfície: ${surface.label}. Isso não é detalhe — é o filtro mais poderoso do torneio.`
  );

  const favorites = sorted.filter(p => p.rank <= 8).slice(0, 3);
  if (favorites.length > 0) {
    body.push(
      `Favoritos por ranking + afinidade de superfície: ` +
      favorites.map(p => `${p.name} (Nº${p.rank}, afinidade: ${affinityLabel(p.surfaceAff)})`).join(' | ')
    );
  }

  const darkHorses = sorted
    .filter(p => p.rank > 8 && p.surfaceAff >= 1)
    .slice(0, 2);
  if (darkHorses.length > 0) {
    body.push(
      `Atenção para: ` +
      darkHorses.map(p => `${p.name} (Nº${p.rank}) — ${affinityLabel(p.surfaceAff)} ${surface.adj}`).join(' e ') +
      `. Ranking não conta toda a história quando a superfície é um fator.`
    );
  }

  body.push(pick(ANALYSTS.VOLKOV.voice.closing));

  return {
    analyst:  ANALYSTS.VOLKOV,
    type:     ANALYSIS_TYPES.PRE_FAVORITES,
    headline: `Análise Pré-${tournament.name}: Favoritos e Eficiência Esperada`,
    lede:     `Quem tem os números para vencer. Quem pode surpreender.`,
    body,
    data: { surface: tournament.surface, topPlayers: sorted.slice(0, 5).map(p => p.name) },
    tags: ['pré-torneio', 'favoritos', 'estatísticas', 'superfície'],
    tone: 'COLD_ANALYTICAL',
  };
}

function okaforPreSurfaceFit(tournament, players, state) {
  const surface = SURFACE_LABELS[tournament.surface] ?? SURFACE_LABELS.HARD;
  const ranking = state?.rankingSystem?.getRanking?.() ?? [];

  const drawPlayers = (players ?? [])
    .map(p => ({
      ...p,
      rank: ranking.find(r => r.id === p.id)?.rank ?? 99,
      surfaceAff: getSurfaceAffinity(p.styleId, tournament.surface),
    }))
    .sort((a, b) => a.rank - b.rank);

  const specialists   = drawPlayers.filter(p => p.surfaceAff >= 2).slice(0, 3);
  const disadvantaged = drawPlayers.filter(p => p.rank <= 10 && p.surfaceAff < 0).slice(0, 2);

  const body = [];
  body.push(pick(ANALYSTS.OKAFOR.voice.opening));

  body.push(
    `A pergunta que define ${tournament.name}: quem sabe jogar ${surface.adj}? ` +
    `Não quem é top seed — quem tem o estilo certo para esta superfície.`
  );

  if (specialists.length > 0) {
    body.push(
      `Especialistas presentes no draw: ` +
      specialists.map(p => `${p.name} (${p.styleId})`).join(', ') +
      `. Esses jogadores chegam com vantagem estrutural antes mesmo da primeira bola.`
    );
  }

  if (disadvantaged.length > 0) {
    body.push(
      `Atenção para os top seeds com desvantagem de estilo: ` +
      disadvantaged.map(p => `${p.name} (Nº${p.rank}, ${affinityLabel(p.surfaceAff)} ${surface.adj})`).join(' e ') +
      `. Ranking alto não cancela inadequação de superfície. Isso vai aparecer nas semifinais.`
    );
  }

  body.push(pick(ANALYSTS.OKAFOR.voice.closing));

  return {
    analyst:  ANALYSTS.OKAFOR,
    type:     ANALYSIS_TYPES.PRE_SURFACE_FIT,
    headline: `Quem Sabe Jogar ${surface.label}? Análise de Draw — ${tournament.name}`,
    lede:     `Superfície como filtro tático. Quem vai sofrer, quem vai florescer.`,
    body,
    data: {
      surface: tournament.surface,
      specialists: specialists.map(p => p.name),
      disadvantaged: disadvantaged.map(p => p.name),
    },
    tags: ['pré-torneio', 'superfície', 'estilos', 'tática'],
    tone: 'PRECISE_TACTICAL',
  };
}

function lenzPrePressure(tournament, players, state) {
  const surface = SURFACE_LABELS[tournament.surface] ?? SURFACE_LABELS.HARD;
  const ranking = state?.rankingSystem?.getRanking?.() ?? [];

  // Procura por narrativas históricas: sequência sem título, defesa de pontos, etc.
  const drawPlayers = (players ?? [])
    .map(p => ({
      ...p,
      rank: ranking.find(r => r.id === p.id)?.rank ?? 99,
      titles: p.careerTitles ?? {},
    }))
    .sort((a, b) => a.rank - b.rank)
    .slice(0, 16);

  const body = [];
  body.push(pick(ANALYSTS.LENZ.voice.opening));

  // Categoria e peso histórico
  const categoryLabel = {
    GRAND_SLAM:   'Grand Slam — o maior peso do calendário',
    MASTERS_1000: 'Masters 1000 — o patamar mais alto abaixo dos Slams',
    SLAM_CLASH:   'Slam Clash — torneio histórico de confronto direto',
    ATP_500:      'ATP 500 — torneio com pontuação expressiva',
    ATP_250:      'ATP 250',
    ATP_100:      'Challenger — onde carreiras são construídas',
  }[tournament.category ?? ''] ?? tournament.category;

  body.push(
    `${tournament.name} é um ${categoryLabel}. ` +
    `A história deste torneio vai além desta edição — cada vencedor ` +
    `inscreve o nome numa lista que o circuito leva a sério.`
  );

  // Jogadores buscando primeiro título em Grand Slam ou Masters
  if (tournament.category === 'GRAND_SLAM' || tournament.category === 'MASTERS_1000') {
    const noTitle = drawPlayers.filter(p => {
      const gs = p.titles?.gs ?? 0;
      const m  = p.titles?.masters ?? 0;
      const target = tournament.category === 'GRAND_SLAM' ? gs : m;
      return p.rank <= 15 && target === 0;
    });
    if (noTitle.length > 0) {
      body.push(
        `${noTitle.slice(0,2).map(p=>p.name).join(' e ')} chegam sem título na categoria. ` +
        `No registro histórico, os primeiros títulos de Grand Slam e Masters definem eras. ` +
        `Esta pode ser a semana — ou mais uma página de espera.`
      );
    }
  }

  body.push(pick(ANALYSTS.LENZ.voice.closing));

  return {
    analyst:  ANALYSTS.LENZ,
    type:     ANALYSIS_TYPES.PRE_PRESSURE,
    headline: `O Peso Histórico de ${tournament.name}`,
    lede:     `O que está em jogo além da taça. O arquivo vai registrar o quê desta edição?`,
    body,
    data: {
      category: tournament.category,
      surface: tournament.surface,
    },
    tags: ['pré-torneio', 'história', 'pressão', 'marcos'],
    tone: 'SCHOLARLY_WONDER',
  };
}

function ferreiraPreDarkHorse(tournament, players, state) {
  const surface = SURFACE_LABELS[tournament.surface] ?? SURFACE_LABELS.HARD;
  const ranking = state?.rankingSystem?.getRanking?.() ?? [];

  const drawPlayers = (players ?? [])
    .map(p => ({
      ...p,
      rank: ranking.find(r => r.id === p.id)?.rank ?? 99,
      surfaceAff: getSurfaceAffinity(p.styleId, tournament.surface),
    }))
    .sort((a, b) => a.rank - b.rank);

  // Candidatos a azarão: rank 12-30, alta afinidade com superfície
  const candidates = drawPlayers.filter(p => p.rank >= 12 && p.rank <= 35 && p.surfaceAff >= 1);

  const body = [];
  body.push(pick(ANALYSTS.FERREIRA.voice.opening));

  body.push(
    `Todo mundo vai falar dos favoritos. Eu prefiro a pergunta mais honesta: ` +
    `quem vai fazer o circuito passar vergonha essa semana?`
  );

  if (candidates.length > 0) {
    const pick1 = candidates[Math.floor(Math.random() * Math.min(candidates.length, 3))];
    body.push(
      `Meu candidato ao upset da semana: ${pick1.name}, Nº${pick1.rank}. ` +
      `${affinityLabel(pick1.surfaceAff)} ${surface.adj}. ` +
      `O circuito tende a subestimar jogadores nessa faixa de ranking quando a superfície os favorece. ` +
      `Isso é um padrão — não é previsão. É análise.`
    );
  } else {
    body.push(
      `Draw com poucos candidatos claros a upset. Quando isso acontece, ` +
      `o torneio fica perigoso de formas inesperadas — geralmente aparece alguém que ninguém estava olhando.`
    );
  }

  body.push(pick(ANALYSTS.FERREIRA.voice.closing));

  return {
    analyst:  ANALYSTS.FERREIRA,
    type:     ANALYSIS_TYPES.PRE_DARK_HORSE,
    headline: `Quem Vai Causar Problemas em ${tournament.name}?`,
    lede:     `O circuito não assiste azarões — até que eles aparecem. Minha lista desta semana.`,
    body,
    data: {
      candidates: candidates.slice(0, 3).map(p => p.name),
      surface: tournament.surface,
    },
    tags: ['pré-torneio', 'azarão', 'upset', 'crítica'],
    tone: 'CONTRARIAN_SHARP',
  };
}

function parkPreFormWatch(tournament, players, state) {
  const ranking = state?.rankingSystem?.getRanking?.() ?? [];
  const surface = SURFACE_LABELS[tournament.surface] ?? SURFACE_LABELS.HARD;

  const drawPlayers = (players ?? [])
    .map(p => ({
      ...p,
      rank: ranking.find(r => r.id === p.id)?.rank ?? 99,
    }))
    .sort((a, b) => a.rank - b.rank)
    .slice(0, 12);

  const body = [];
  body.push(pick(ANALYSTS.PARK.voice.opening));

  body.push(
    `${tournament.name} chega num momento específico do calendário. ` +
    `Forma, calendário, acúmulo — tudo isso vai aparecer na quadra esta semana.`
  );

  // Players com alta forma recente (formHistory wins)
  const hotPlayers = drawPlayers
    .filter(p => {
      const form = p.formHistory ?? [];
      const last5 = form.slice(-5);
      const wins = last5.filter(r => r === 'W').length;
      return wins >= 4;
    })
    .slice(0, 2);

  if (hotPlayers.length > 0) {
    body.push(
      `Quem chega mais quente: ` +
      hotPlayers.map(p => {
        const form = p.formHistory ?? [];
        const last5 = form.slice(-5);
        const wins = last5.filter(r => r === 'W').length;
        return `${p.name} (${wins}/5 nos últimos torneios)`;
      }).join(' e ') +
      `. Forma é o indicador mais subestimado no tênis.`
    );
  }

  body.push(
    `O circuito está ${surface.adj} esta semana. Quem tem momentum aqui ` +
    `vai carregar isso para as próximas rodadas. Quem não tem — vai sentir o peso.`
  );

  body.push(pick(ANALYSTS.PARK.voice.closing));

  return {
    analyst:  ANALYSTS.PARK,
    type:     ANALYSIS_TYPES.PRE_FORM_WATCH,
    headline: `Forma do Momento: Quem Chega Quente a ${tournament.name}`,
    lede:     `Momentum, calendário e acúmulo. O macro que decide antes da primeira bola.`,
    body,
    data: {
      hotPlayers: hotPlayers.map(p => p.name),
      surface: tournament.surface,
    },
    tags: ['pré-torneio', 'forma', 'momentum', 'calendário'],
    tone: 'SYSTEMIC_ELEGANT',
  };
}

// ══════════════════════════════════════════════════════════════════
// MESA REDONDA (DEBATE)
// ══════════════════════════════════════════════════════════════════

export function generateRoundtableDebate(tournament, bracket, state) {
  const { champion, finalist, upsets } = extractBracketResults(bracket);
  const surface = SURFACE_LABELS[tournament.surface] ?? SURFACE_LABELS.HARD;
  const agg = aggregateTournamentStats(bracket);

  // Gera a pergunta central do debate
  const questions = [];
  if (champion) questions.push(`${champion.name} é o favorito ao próximo Grand Slam?`);
  if (upsets.length >= 2) questions.push(`Os upsets desta semana sinalizam mudança de geração?`);
  if (agg.errorBlend > 60) questions.push(`Foi um torneio de nível de jogo ou de nível de oponente?`);
  questions.push(`O que ${tournament.name} nos diz sobre o circuito atual?`);

  const question = pick(questions);

  // Cada analista responde com 2-3 frases
  const responses = [
    {
      analyst: ANALYSTS.VOLKOV,
      position: champion
        ? `Os números de ${champion.name} esta semana são estatisticamente acima da média do circuito para a categoria. Eficiência de ${agg.serve1Pct}% de 1° saque, rally médio de ${agg.avgRally}. O que os dados mostram é um desempenho consistente, não um acidente.`
        : `Os dados do torneio estão dentro da normalidade estatística para o nível ${tournament.category}. Nada fora da curva.`,
    },
    {
      analyst: ANALYSTS.OKAFOR,
      position: champion
        ? `Taticamente, ${champion.name} foi o jogador com plano mais claro ${surface.adj}. O estilo ${champion.styleId ?? ''} encontrou as respostas certas nas rodadas decisivas. Não é sorte — é leitura de jogo.`
        : `O padrão tático mais interessante desta semana foi a resposta dos especialistas de superfície.`,
    },
    {
      analyst: ANALYSTS.LENZ,
      position: `O arquivo do circuito vai registrar esta edição como ${upsets.length >= 2 ? 'um torneio de alta volatilidade' : 'uma edição dentro da normalidade histórica'}. ${champion ? `${champion.name} adiciona mais um capítulo a uma carreira que já tem peso.` : ''}`,
    },
    {
      analyst: ANALYSTS.FERREIRA,
      position: champion
        ? `Eu discordo da celebração automática. ${champion.name} venceu, mas venceu com quem? O nível do campo ${upsets.length >= 3 ? 'foi prejudicado pelos upsets' : 'não era dos mais densos'}. O próximo Grand Slam vai ser mais revelador.`
        : `Essa semana provou que o consenso do circuito sobre os favoritos está errado.`,
    },
    {
      analyst: ANALYSTS.PARK,
      position: `Sistemicamente, ${tournament.name} é mais um dado num padrão maior. ${champion ? `${champion.name} está construindo algo — e o circuito ainda está decidindo se é forma ou tendência de longo prazo.` : 'A abertura no topo do ranking está criando um padrão novo.'}`,
    },
  ];

  return {
    type:      ANALYSIS_TYPES.POST_DEBATE,
    headline:  `Mesa Redonda — ${tournament.name}: "${question}"`,
    lede:      `Cinco analistas. Uma pergunta. Cinco respostas que não concordam entre si.`,
    question,
    responses,
    tags:      ['mesa redonda', 'debate', 'análise', 'cinco vozes'],
  };
}

// ══════════════════════════════════════════════════════════════════
// ENTRY POINTS PRINCIPAIS
// ══════════════════════════════════════════════════════════════════

/**
 * Gera análises PRÉ-torneio.
 * @param {Object} tournament  — objeto do CALENDAR
 * @param {Array}  players     — jogadores no draw (opcional)
 * @param {Object} state       — estado do universo (opcional)
 * @returns {AnalystReport[]}
 */
export function generatePreTournamentAnalysis(tournament, players = [], state = {}) {
  if (!tournament || !ANALYST_ELIGIBLE_CATEGORIES.has(tournament.category)) return [];
  const reports = [];

  try { reports.push(volkovPreFavorites(tournament, players, state));  } catch(e) { console.warn('VOLKOV PRE:', e); }
  try { reports.push(okaforPreSurfaceFit(tournament, players, state)); } catch(e) { console.warn('OKAFOR PRE:', e); }
  try { reports.push(lenzPrePressure(tournament, players, state));     } catch(e) { console.warn('LENZ PRE:',  e); }
  try { reports.push(ferreiraPreDarkHorse(tournament, players, state));} catch(e) { console.warn('FERR PRE:',  e); }
  try { reports.push(parkPreFormWatch(tournament, players, state));    } catch(e) { console.warn('PARK PRE:',  e); }

  return reports.filter(Boolean);
}

/**
 * Gera análises PÓS-torneio.
 * @param {Object} tournament  — objeto do CALENDAR
 * @param {Object} bracket     — resultado do torneio
 * @param {Object} state       — estado do universo
 * @returns {AnalystReport[]}
 */
export function generatePostTournamentAnalysis(tournament, bracket, state = {}) {
  if (!tournament || !ANALYST_ELIGIBLE_CATEGORIES.has(tournament.category)) return [];
  const reports = [];

  try { reports.push(volkovPostEfficiency(tournament, bracket, state)); } catch(e) { console.warn('VOLKOV POST:', e); }
  try { reports.push(okaforPostTactical(tournament, bracket, state));   } catch(e) { console.warn('OKAFOR POST:', e); }
  try { reports.push(lenzPostRecord(tournament, bracket, state));       } catch(e) { console.warn('LENZ POST:',  e); }
  try { reports.push(ferreiraPostVerdict(tournament, bracket, state));  } catch(e) { console.warn('FERR POST:',  e); }
  try { reports.push(parkPostTrend(tournament, bracket, state));        } catch(e) { console.warn('PARK POST:',  e); }

  // Mesa redonda sempre termina o conjunto pós-torneio
  try { reports.push(generateRoundtableDebate(tournament, bracket, state)); } catch(e) { console.warn('ROUNDTABLE:', e); }

  return reports.filter(Boolean);
}

/**
 * Retorna apenas o catálogo de analistas (útil para UI).
 */
export function getAnalystRoster() {
  return Object.values(ANALYSTS);
}

