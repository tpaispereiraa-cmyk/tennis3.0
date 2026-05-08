/**
 * AnalystSystem.js
 * â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
 * TIME DE ANALISTAS DO TENNIS UNIVERSE
 *
 * Cinco vozes. Cinco obsessÃµes. Uma mesa redonda.
 *
 * Diferente da imprensa (que narra) e das entrevistas (que humanizam),
 * os analistas DISSECAM. Eles pegam os dados, os padrÃµes, os nÃºmeros
 * ocultos, e transformam em linguagem que educa, provoca e surpreende.
 *
 * ANALISTAS:
 *   VOLKOV    â€” O EstatÃ­stico Frio. EficiÃªncias, porcentagens, benchmarks.
 *   OKAFOR    â€” O TÃ¡tico. PadrÃµes de jogo, exploraÃ§Ã£o de fraquezas, game plans.
 *   LENZ      â€” O Historiador. Contexto, raridades, marcos, curiosidades insÃ³litas.
 *   FERREIRA  â€” O Provocador. Teses controversas, o que os outros ignoram.
 *   PARK      â€” A SistÃªmica. TendÃªncias de circuito, ondas, eras, o macro.
 *
 * OUTPUTS:
 *   generatePreTournamentAnalysis(tournament, state) â†’ AnalystReport[]
 *   generatePostTournamentAnalysis(tournament, bracket, state) â†’ AnalystReport[]
 *   generateRoundtableDebate(topic, analysts, state) â†’ RoundtableReport
 *
 * ESTRUTURA DE REPORT:
 *   { analyst, type, headline, lede, body[], data, tags, tone }
 *
 * â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
 */

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// UTILITÃRIOS
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

const pick  = arr => arr[Math.floor(Math.random() * arr.length)];
const pct   = (n, d) => (!d ? 0 : Math.round((n / d) * 100));
const fmt   = n => (n * 100).toFixed(1) + '%';
const round = (n, d = 1) => parseFloat(n.toFixed(d));

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

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// CATÃLOGO DE ANALISTAS
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

export const ANALYSTS = {

  // â”€â”€ VOLKOV â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  VOLKOV: {
    id:       'VOLKOV',
    name:     'Dmitri Volkov',
    title:    'Analista Quantitativo',
    outlet:   'Circuit Analytics Lab',
    origin:   'RUS',
    age:      44,
    icon:     'ðŸ“',
    color:    '#4A90D9',
    accent:   '#7BB8F5',
    photo:    null,

    // Personalidade
    obsession:   'eficiÃªncia â€” o que os nÃºmeros revelam que o olho nÃ£o vÃª',
    blindspot:   'tende a subestimar o peso psicolÃ³gico e emocional',
    signature:   'sempre ancora anÃ¡lise em benchmark histÃ³rico do circuito',
    toneProfile: 'COLD_ANALYTICAL', // preciso, clÃ­nico, sem exageros

    // Especialidades por tipo de anÃ¡lise
    specialties: ['serve_efficiency', 'hold_rate', 'break_rate', 'error_blend', 'rally_length', 'surface_pct'],

    // Voz textual
    voice: {
      opening: [
        'Os nÃºmeros desta semana merecem atenÃ§Ã£o.',
        'Vou comeÃ§ar pelos dados, porque Ã© lÃ¡ que a verdade estÃ¡.',
        'Antes de qualquer narrativa, os fatos.',
        'O circuito tem memÃ³ria curta. As estatÃ­sticas, nÃ£o.',
        'TrÃªs nÃºmeros explicam o que aconteceu aqui.',
      ],
      transition: [
        'O que isso traduz em eficiÃªncia real:',
        'Convertendo para mÃ©trica comparÃ¡vel:',
        'O benchmark do circuito para esse indicador Ã©:',
        'Isolando a variÃ¡vel:',
        'Para contextualizar essa cifra:',
      ],
      insight_prefix: [
        'O dado mais revelador:',
        'O que poucos notaram:',
        'A mÃ©trica que define o torneio:',
        'Traduzindo em nÃºmeros concretos:',
        'O nÃºmero que explica tudo:',
      ],
      closing: [
        'Os dados nÃ£o mentem. A interpretaÃ§Ã£o, Ã s vezes, sim.',
        'Esse padrÃ£o Ã© estatisticamente significativo.',
        'As prÃ³ximas semanas vÃ£o confirmar ou refutar essa tendÃªncia.',
        'O modelo nÃ£o prevÃª â€” descreve. A descriÃ§Ã£o aqui Ã© clara.',
        'EficiÃªncia nÃ£o Ã© glamourosa. Mas Ã© o que separa os semifinalistas dos campeÃµes.',
      ],
    },

    // Capacidade de detectar anomalias
    anomalyThresholds: {
      serve1_elite:   0.72,   // acima disso = elite
      serve1_poor:    0.55,   // abaixo disso = problema
      hold_elite:     0.85,
      hold_poor:      0.60,
      break_elite:    0.45,
      error_blend_high: 0.70, // 70%+ de erros forÃ§ados = dominÃ¢ncia tÃ¡tica
    },
  },

  // â”€â”€ OKAFOR â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  OKAFOR: {
    id:       'OKAFOR',
    name:     'Chidi Okafor',
    title:    'Analista TÃ¡tico',
    outlet:   'TennisIQ Magazine',
    origin:   'NGA',
    age:      38,
    icon:     'â™Ÿï¸',
    color:    '#2ECC71',
    accent:   '#58D68D',
    photo:    null,

    obsession:   'como um jogador constrÃ³i pontos â€” sequÃªncia, intenÃ§Ã£o, padrÃ£o',
    blindspot:   'pode ser muito tÃ©cnico para o leitor casual',
    signature:   'sempre identifica o ponto fraco que o adversÃ¡rio explorou (ou deveria ter explorado)',
    toneProfile: 'PRECISE_TACTICAL',

    specialties: ['shot_patterns', 'style_matchups', 'surface_exploitation', 'game_plan_read', 'weakness_exposure'],

    voice: {
      opening: [
        'TÃ¡ticas. Ã‰ disso que estamos falando.',
        'O placar esconde o jogo. Vou mostrar o jogo.',
        'Existe uma lÃ³gica em cada set. Vou desconstruÃ­-la.',
        'Quando um jogo parece fÃ¡cil, geralmente tem uma razÃ£o tÃ¡tica especÃ­fica.',
        'Vamos falar de como os pontos foram construÃ­dos â€” nÃ£o apenas ganhos.',
      ],
      transition: [
        'O padrÃ£o que emerge Ã©:',
        'Taticamente, o que aconteceu foi:',
        'A sequÃªncia de construÃ§Ã£o de pontos mostra:',
        'O game plan que funcionou:',
        'A fraqueza que foi exposta:',
      ],
      insight_prefix: [
        'O detalhe tÃ¡tico que decidiu o torneio:',
        'O padrÃ£o que ninguÃ©m estava discutindo:',
        'A decisÃ£o tÃ¡tica mais importante da semana:',
        'O que o placar nÃ£o conta:',
        'A exploraÃ§Ã£o de fraqueza mais cirÃºrgica:',
      ],
      closing: [
        'TÃªnis Ã© xadrez com raquetes. E nessa partida, um jogador teve o plano certo.',
        'O padrÃ£o tÃ¡tico aqui Ã© reproduzÃ­vel. Outros vÃ£o tentar copiar.',
        'O jogo evoluiu esta semana. A anÃ¡lise tem que acompanhar.',
        'Saber o que fazer nÃ£o Ã© suficiente â€” Ã© preciso saber quando.',
        'O adversÃ¡rio do prÃ³ximo torneio jÃ¡ estÃ¡ estudando esse vÃ­deo.',
      ],
    },

    anomalyThresholds: {
      surface_fit_threshold: 2,       // diff de encaixe tecnico por superficie
      rally_dominance: 0.65,          // ganhar 65%+ dos rallies longos = dominÃ¢ncia
    },
  },

  // â”€â”€ LENZ â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  LENZ: {
    id:       'LENZ',
    name:     'Hans Lenz',
    title:    'Historiador do Circuito',
    outlet:   'The Grand Record',
    origin:   'AUT',
    age:      57,
    icon:     'ðŸ“œ',
    color:    '#D4A017',
    accent:   '#F0C040',
    photo:    null,

    obsession:   'raridades, recordes, contexto histÃ³rico â€” o que nunca aconteceu antes',
    blindspot:   'Ã s vezes superestima o peso do passado vs. a realidade atual',
    signature:   'sempre encontra o dado histÃ³rico insÃ³lito que ninguÃ©m lembrava',
    toneProfile: 'SCHOLARLY_WONDER',

    specialties: ['records', 'historical_comparisons', 'curiosities', 'milestones', 'surface_history'],

    voice: {
      opening: [
        'O circuito tem dÃ©cadas de memÃ³ria. E Ã s vezes, o presente ecoa o passado de formas que surpreendem.',
        'Para entender o que aconteceu aqui, precisamos recuar.',
        'Existe um contexto histÃ³rico para isso que muda completamente a leitura.',
        'Vou comeÃ§ar pelo registro. O que os livros dizem sobre esse tipo de resultado.',
        'HÃ¡ momentos em que um torneio nÃ£o Ã© apenas um torneio. Esta semana foi um desses.',
      ],
      transition: [
        'O que o arquivo histÃ³rico mostra:',
        'Comparando com o registro do circuito:',
        'A Ãºltima vez que isso aconteceu foi:',
        'Em termos histÃ³ricos:',
        'O precedente mais prÃ³ximo:',
      ],
      insight_prefix: [
        'A curiosidade histÃ³rica desta ediÃ§Ã£o:',
        'O recorde que poucos sabem que foi quebrado:',
        'O dado que sÃ³ o arquivo revela:',
        'A raridade desta semana:',
        'O que o circuito nÃ£o via desde:',
      ],
      closing: [
        'O circuito tem memÃ³ria longa. E o que aconteceu esta semana vai ficar nela.',
        'Alguns resultados existem em um Ãºnico torneio. Outros, em toda uma era. Este Ã© dos segundos.',
        'Os recordes sÃ£o os ossos do esporte. O que aconteceu aqui adicionou um novo.',
        'A histÃ³ria do circuito estÃ¡ sendo escrita em tempo real. Esta semana, mais um capÃ­tulo.',
        'DÃ©cadas de agora, quando alguÃ©m quiser entender este perÃ­odo, vai citar este torneio.',
      ],
    },

    anomalyThresholds: {
      upset_significance: 5,   // diff de ranking para considerar upset notÃ¡vel
      streak_notable: 3,       // 3+ vitÃ³rias consecutivas contra o mesmo padrÃ£o
      title_drought: 8,        // 8+ torneios sem tÃ­tulo = seca notable
    },
  },

  // â”€â”€ FERREIRA â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  FERREIRA: {
    id:       'FERREIRA',
    name:     'Gustavo Ferreira',
    title:    'Analista CrÃ­tico',
    outlet:   'O ContraditÃ³rio',
    origin:   'BRA',
    age:      41,
    icon:     'ðŸ”¥',
    color:    '#E74C3C',
    accent:   '#F1948A',
    photo:    null,

    obsession:   'o que a narrativa oficial estÃ¡ errando â€” o que todos ignoram',
    blindspot:   'pode ser excessivamente provocador por provocaÃ§Ã£o',
    signature:   'apresenta a tese que vai contra o consenso, com dados para sustentar',
    toneProfile: 'CONTRARIAN_SHARP',

    specialties: ['narratives_debunked', 'overrated_performances', 'underrated_performances', 'pressure_analysis', 'critical_turning_points'],

    voice: {
      opening: [
        'Vou dizer o que ninguÃ©m quer ouvir.',
        'A narrativa oficial estÃ¡ errada. Deixa eu mostrar por quÃª.',
        'Todo mundo estÃ¡ celebrando. Eu tenho dÃºvidas.',
        'Esse resultado foi lido errado pelo circuito inteiro.',
        'Existe uma histÃ³ria mais honesta para contar sobre esse torneio.',
      ],
      transition: [
        'O que a narrativa oficial ignora:',
        'O inconveniente dos dados:',
        'O que os elogios esconderam:',
        'Sendo honesto sobre isso:',
        'A versÃ£o que nÃ£o foi contada:',
      ],
      insight_prefix: [
        'A performance superestimada da semana:',
        'O campeÃ£o que teve sorte no draw:',
        'O dado que contradiz o consenso:',
        'O que o placar escondeu:',
        'A tese incÃ´moda:',
      ],
      closing: [
        'Discorde. Mas olhe para os dados primeiro.',
        'A narrativa confortÃ¡vel raramente Ã© a mais Ãºtil.',
        'O circuito vai continuar evitando essa conversa. Eu nÃ£o vou.',
        'NÃ£o Ã© cinismo â€” Ã© precisÃ£o.',
        'O consenso erra. Ã‰ para isso que existem analistas.',
      ],
    },

    anomalyThresholds: {
      lucky_draw_threshold: 0.3,   // probabilidade baixa = sorte no draw
      overperformance_ceiling: 1.3, // 30% acima da mÃ©dia = suspeito
    },
  },

  // â”€â”€ PARK â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  PARK: {
    id:       'PARK',
    name:     'Ji-Young Park',
    title:    'Analista de TendÃªncias',
    outlet:   'Circuit Macro Report',
    origin:   'KOR',
    age:      35,
    icon:     'ðŸŒŠ',
    color:    '#9B59B6',
    accent:   '#C39BD3',
    photo:    null,

    obsession:   'tendÃªncias de circuito, ondas, o que estÃ¡ nascendo e morrendo',
    blindspot:   'pode perder o detalhe ao focar demais no macro',
    signature:   'identifica o que este torneio significa para o circuito como um todo',
    toneProfile: 'SYSTEMIC_ELEGANT',

    specialties: ['circuit_trends', 'era_analysis', 'surface_era', 'generation_analysis', 'momentum_waves'],

    voice: {
      opening: [
        'Nenhum torneio existe em isolamento.',
        'Este resultado faz mais sentido quando vocÃª olha os Ãºltimos doze meses.',
        'O circuito tem ciclos. E estamos em um ponto de inflexÃ£o.',
        'Existe um padrÃ£o maior acontecendo. Este torneio Ã© mais uma peÃ§a.',
        'O micro conta o resultado. Eu prefiro o macro.',
      ],
      transition: [
        'No contexto do circuito atual:',
        'A tendÃªncia que esse resultado confirma:',
        'O que isso significa sistemicamente:',
        'A onda que estÃ¡ sendo construÃ­da:',
        'O ciclo que estÃ¡ se fechando (ou abrindo):',
      ],
      insight_prefix: [
        'A tendÃªncia de circuito que este torneio ilustra:',
        'O padrÃ£o sistÃªmico que emergiu esta semana:',
        'O que esse resultado sinaliza para os prÃ³ximos meses:',
        'A era que estÃ¡ sendo declarada (ou encerrada):',
        'O movimento de circuito mais significativo:',
      ],
      closing: [
        'O circuito nÃ£o para. Esta semana foi mais um movimento.',
        'A onda que estÃ¡ se formando vai chegar nos Grand Slams.',
        'TendÃªncias nÃ£o anunciam quando chegam. Mas chegam.',
        'O que o circuito estÃ¡ dizendo, se vocÃª souber ouvir.',
        'Este resultado vai parecer Ã³bvio em retrospecto. Raramente Ã© Ã³bvio no momento.',
      ],
    },

    anomalyThresholds: {
      trend_confirmation: 3,  // 3+ torneios = tendÃªncia confirmada
      era_threshold: 0.6,     // dominar 60%+ dos torneios = era
    },
  },
};

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// TIPOS DE ANÃLISE
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

export const ANALYSIS_TYPES = {
  // PrÃ©-torneio
  PRE_FAVORITES:    { id: 'PRE_FAVORITES',    label: 'Favoritos & Chances',     icon: 'ðŸŽ¯', phase: 'PRE'  },
  PRE_DRAW_STUDY:   { id: 'PRE_DRAW_STUDY',   label: 'Estudo do Draw',          icon: 'ðŸ—‚ï¸', phase: 'PRE'  },
  PRE_SURFACE_FIT:  { id: 'PRE_SURFACE_FIT',  label: 'AdequaÃ§Ã£o Ã  SuperfÃ­cie',  icon: 'ðŸŸï¸', phase: 'PRE'  },
  PRE_FORM_WATCH:   { id: 'PRE_FORM_WATCH',   label: 'Forma do Momento',        icon: 'ðŸ“ˆ', phase: 'PRE'  },
  PRE_DARK_HORSE:   { id: 'PRE_DARK_HORSE',   label: 'AzarÃ£o da Rodada',        icon: 'ðŸƒ', phase: 'PRE'  },
  PRE_PRESSURE:     { id: 'PRE_PRESSURE',     label: 'PressÃ£o & Stakes',        icon: 'âš¡', phase: 'PRE'  },

  // PÃ³s-torneio
  POST_CHAMPION:    { id: 'POST_CHAMPION',    label: 'AnÃ¡lise do CampeÃ£o',      icon: 'ðŸ†', phase: 'POST' },
  POST_EFFICIENCY:  { id: 'POST_EFFICIENCY',  label: 'RelatÃ³rio de EficiÃªncia', icon: 'ðŸ“Š', phase: 'POST' },
  POST_TACTICAL:    { id: 'POST_TACTICAL',    label: 'Leitura TÃ¡tica',          icon: 'â™Ÿï¸', phase: 'POST' },
  POST_RECORD:      { id: 'POST_RECORD',      label: 'Recordes & Marcos',       icon: 'ðŸ“œ', phase: 'POST' },
  POST_UPSET:       { id: 'POST_UPSET',       label: 'AnÃ¡lise de Upsets',       icon: 'ðŸ’¥', phase: 'POST' },
  POST_LOSER:       { id: 'POST_LOSER',       label: 'O Que Deu Errado',        icon: 'ðŸ”', phase: 'POST' },
  POST_TREND:       { id: 'POST_TREND',       label: 'Sinal de TendÃªncia',      icon: 'ðŸŒŠ', phase: 'POST' },
  POST_DEBATE:      { id: 'POST_DEBATE',      label: 'Mesa Redonda',            icon: 'ðŸŽ™ï¸', phase: 'POST' },
  POST_NUMBERS:     { id: 'POST_NUMBERS',     label: 'Os NÃºmeros do Torneio',   icon: 'ðŸ”¢', phase: 'POST' },
  POST_VERDICT:     { id: 'POST_VERDICT',     label: 'Veredicto Final',         icon: 'âš–ï¸', phase: 'POST' },
};

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// SURFACE DATA
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

const SURFACE_LABELS = {
  CLAY:   { label: 'saibro',  adj: 'no saibro',  icon: 'ðŸº' },
  GRASS:  { label: 'grama',   adj: 'na grama',   icon: 'ðŸŒ¿' },
  HARD:   { label: 'hard',    adj: 'no hard',    icon: 'ðŸ™ï¸' },
  INDOOR: { label: 'indoor',  adj: 'no indoor',  icon: 'ðŸŸï¸' },
};

const SURFACE_FIT_ATTRS = {
  CLAY:   ['resistencia', 'regularidade', 'defesa', 'topspin', 'recuperacao', 'mentalidade', 'devolucao'],
  GRASS:  ['saqueForca', 'saquePrecisao', 'volley', 'smash', 'explosividade', 'slice', 'fhPotencia'],
  HARD:   ['fhPotencia', 'fhControle', 'bhPotencia', 'bhControle', 'devolucao', 'velocidade', 'mentalidade'],
  INDOOR: ['saqueForca', 'saquePrecisao', 'devolucao', 'leitura', 'visaoTatica', 'bhControle', 'volley'],
};

const SURFACE_FIT_TRAITS = {
  CLAY:   ['SURFACE_CLAY', 'ENDURANCE_ENGINE', 'MARATHON_CLOSER', 'ABSORBER'],
  GRASS:  ['SURFACE_GRASS', 'NET_RUSHER', 'FIRST_STRIKE', 'SIG_VOLLEY_TOUCH'],
  HARD:   ['FIRST_STRIKE', 'FRONT_FOOT_DICTATOR', 'RETURN_HUNTER'],
  INDOOR: ['SURFACE_INDOOR', 'NET_RUSHER', 'FIRST_STRIKE', 'RHYTHM_BREAKER'],
};

const SURFACE_FIT_PATTERNS = {
  CLAY:   ['DEEP_GRINDER', 'DEFENSIVE_BASE', 'CROSS_HEAVY'],
  GRASS:  ['NET_APPROACH', 'SERVE_PLUS_ONE', 'AGGRESSIVE_EARLY', 'SHORT_ANGLE_BUILDER'],
  HARD:   ['DTL_HUNTER', 'CROSS_HEAVY', 'CENTRE_CONTROL', 'AGGRESSIVE_EARLY'],
  INDOOR: ['SERVE_PLUS_ONE', 'NET_APPROACH', 'RHYTHM_DISRUPTION', 'DTL_HUNTER'],
};

function attrAvg(attrs, names) {
  const vals = names
    .map(name => Number(attrs?.[name]))
    .filter(Number.isFinite);
  return vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : 50;
}

function traitIds(player) {
  if (Array.isArray(player?.traits_ids)) return player.traits_ids;
  if (Array.isArray(player?.traitsIds)) return player.traitsIds;
  if (Array.isArray(player?.traitsV2)) return player.traitsV2.map(t => t?.id ?? t).filter(Boolean);
  if (Array.isArray(player?.traits)) return player.traits.map(t => t?.id ?? t).filter(Boolean);
  return [];
}

function getSurfaceProfile(player, surface) {
  const attrs = player?.attrs ?? player ?? {};
  const base = attrAvg(attrs, SURFACE_FIT_ATTRS[surface] ?? SURFACE_FIT_ATTRS.HARD);
  const traits = traitIds(player);
  const wantedTraits = SURFACE_FIT_TRAITS[surface] ?? [];
  const traitBonus = traits.filter(t => wantedTraits.includes(t)).length * 4;
  const pattern = player?.rallyPattern ?? player?.signaturePattern ?? null;
  const patternBonus = (SURFACE_FIT_PATTERNS[surface] ?? []).includes(pattern) ? 5 : 0;
  const prefs = player?.prefs ?? {};
  const prefBonus =
    surface === 'GRASS' && (prefs.netGame === 'OPPORTUNIST' || prefs.rallyCadence === 'EARLY_ATTACK') ? 3 :
    surface === 'CLAY' && (prefs.riskProfile === 'SAFE' || prefs.rallyCadence === 'PATIENT') ? 3 :
    surface === 'INDOOR' && (prefs.pressureServe === 'SAFE_RESET' || prefs.rallyCadence === 'EARLY_ATTACK') ? 2 :
    0;

  const score = Math.max(0, Math.min(100, base + traitBonus + patternBonus + prefBonus));
  const affinity =
    score >= 78 ? 2 :
    score >= 66 ? 1 :
    score >= 52 ? 0 :
    score >= 42 ? -1 :
    -2;

  return { score: round(score, 1), affinity, pattern, traits: traits.slice(0, 8) };
}

function getSurfaceAffinity(player, surface) {
  return getSurfaceProfile(player, surface).affinity;
}

function affinityLabel(val) {
  if (val >= 2) return 'ESPECIALISTA';
  if (val === 1) return 'FAVORECIDO';
  if (val === 0) return 'NEUTRO';
  if (val === -1) return 'DESFAVORECIDO';
  return 'ADVERSIDADE SEVERA';
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// EXTRATORES DE CONTEXTO
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

/**
 * Extrai dados relevantes de um jogador para anÃ¡lise.
 */
function extractPlayerContext(player, state) {
  const ranking = state?.rankingSystem?.getRanking?.() ?? [];
  const rank = ranking.find(r => r.id === player.id)?.rank ?? 99;
  const titles = player.careerTitles ?? { gs: 0, masters: 0, finals: 0, atp500: 0, atp250: 0 };
  const form = player.formHistory ?? [];       // Ãºltimos resultados
  const recentForm = form.slice(-8);
  const wins = recentForm.filter(r => r === 'W').length;
  const losses = recentForm.filter(r => r === 'L').length;

  return {
    id: player.id,
    name: player.name,
    nationality: player.nationality ?? '???',
    rank,
    surfaceProfiles: {
      CLAY: getSurfaceProfile(player, 'CLAY'),
      GRASS: getSurfaceProfile(player, 'GRASS'),
      HARD: getSurfaceProfile(player, 'HARD'),
      INDOOR: getSurfaceProfile(player, 'INDOOR'),
    },
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
 * Extrai resultados do bracket (pÃ³s-torneio).
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
 * Agrega estatÃ­sticas de todos os jogadores do torneio.
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

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// GERADORES DE CORPO DE ANÃLISE
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

// â”€â”€ VOLKOV: RelatÃ³rio de EficiÃªncia â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
                  : 'DENTRO DA MÃ‰DIA';

  const serve1Tier = agg.serve1Pct > benchmarks.serve1Pct.high  ? 'ALTO'
                   : agg.serve1Pct < benchmarks.serve1Pct.low   ? 'BAIXO'
                   : 'MÃ‰DIO';

  const body = [];

  body.push(`${pick(ANALYSTS.VOLKOV.voice.opening)}`);

  body.push(
    `Rally mÃ©dio de ${agg.avgRally} golpes â€” ${rallyTier} para ${surface.label}. ` +
    `O pico foi de ${agg.maxRally} golpes, registrado em ${tournament.name}.`
  );

  body.push(
    `Aproveitamento de primeiro saque no torneio: ${agg.serve1Pct}% â€” ` +
    `benchmark do circuito: 65%. NÃ­vel classificado como ${serve1Tier}.`
  );

  body.push(
    `${agg.totalAces} aces e ${agg.totalWinners} winners em ${agg.totalPoints} pontos disputados. ` +
    `RazÃ£o winner/erro: ${agg.totalErrors > 0 ? round(agg.totalWinners / agg.totalErrors, 2) : 'N/A'}.`
  );

  if (agg.errorBlend > 60) {
    body.push(
      `Ãndice de erros forÃ§ados: ${agg.errorBlend}%. ` +
      `Isso indica que a pressÃ£o tÃ¡tica â€” nÃ£o os erros gratuitos â€” foi o fator dominante.`
    );
  } else if (agg.errorBlend < 45) {
    body.push(
      `Ãndice de erros forÃ§ados baixo: ${agg.errorBlend}%. ` +
      `O torneio foi marcado por erros voluntÃ¡rios â€” o nÃ­vel de construÃ§Ã£o de pontos ficou abaixo do esperado.`
    );
  }

  if (champion) {
    const champCtx = extractPlayerContext(champion, state);
    body.push(
      `O campeÃ£o ${champion.name} encerrou o torneio como ${surface.adj} com ` +
      `a eficiÃªncia que os dados esperavam de um top-${champCtx.rank}.`
    );
  }

  body.push(pick(ANALYSTS.VOLKOV.voice.closing));

  return {
    analyst:  ANALYSTS.VOLKOV,
    type:     ANALYSIS_TYPES.POST_EFFICIENCY,
    headline: `Os NÃºmeros de ${tournament.name}: EficiÃªncia e Anomalias`,
    lede:     `Rally mÃ©dio de ${agg.avgRally} golpes, ${agg.serve1Pct}% de 1Â° saque. O que os dados revelam.`,
    body,
    data: {
      avgRally:    agg.avgRally,
      maxRally:    agg.maxRally,
      serve1Pct:   agg.serve1Pct,
      errorBlend:  agg.errorBlend,
      totalAces:   agg.totalAces,
      totalWinners:agg.totalWinners,
    },
    tags: ['eficiÃªncia', 'estatÃ­sticas', 'saque', 'rally'],
    tone: 'COLD_ANALYTICAL',
  };
}

// â”€â”€ OKAFOR: Leitura TÃ¡tica â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function okaforPostTactical(tournament, bracket, state) {
  const { champion, finalist, upsets } = extractBracketResults(bracket);
  const surface = SURFACE_LABELS[tournament.surface] ?? SURFACE_LABELS.HARD;

  const body = [];
  body.push(pick(ANALYSTS.OKAFOR.voice.opening));

  if (champion) {
    const champProfile = getSurfaceProfile(champion, tournament.surface);
    const champAffinity = champProfile.affinity;
    const affinLabel    = affinityLabel(champAffinity);

    body.push(
      `${champion.name} entrou como ${affinLabel} para o ${surface.label} pelo pacote tecnico atual ` +
      `(encaixe ${champProfile.score}/100). ` +
      `A campanha confirma ou contraria essa expectativa.`
    );

    if (champAffinity < 0) {
      body.push(
        `O dado mais interessante: o campeao superou uma desvantagem estrutural de encaixe. ` +
        `Isso geralmente indica adaptaÃ§Ã£o tÃ¡tica intencional, nÃ£o sorte no draw.`
      );
    }
  }

  if (finalist && champion) {
    const cAff = getSurfaceAffinity(champion, tournament.surface);
    const fAff = getSurfaceAffinity(finalist, tournament.surface);
    const diff = cAff - fAff;

    if (diff > 0) {
      body.push(
        `Na final, o encaixe de superficie favorecia ${champion.name}. ` +
        `Afinidade com o ${surface.label}: campeÃ£o ${cAff > 0 ? '+' : ''}${cAff} vs finalista ${fAff > 0 ? '+' : ''}${fAff}. ` +
        `O resultado seguiu a lÃ³gica tÃ¡tica.`
      );
    } else if (diff < 0) {
      body.push(
        `Na final, a lÃ³gica de superfÃ­cie favorecia ${finalist.name}. ` +
        `O fato de ${champion.name} ter vencido mesmo assim Ã© o resultado taticamente mais significativo do torneio.`
      );
    }
  }

  if (upsets.length > 0) {
    const biggestUpset = upsets[0];
    body.push(
      `O maior upset da semana â€” ${biggestUpset.winner.name} sobre ${biggestUpset.loser.name} ` +
      `(${biggestUpset.round}) â€” merece leitura tÃ¡tica. ` +
      `Uma diferenÃ§a de ranking de ${biggestUpset.rankDiff} posiÃ§Ãµes raramente Ã© explicada por acaso.`
    );
  }

  body.push(pick(ANALYSTS.OKAFOR.voice.closing));

  return {
    analyst:  ANALYSTS.OKAFOR,
    type:     ANALYSIS_TYPES.POST_TACTICAL,
    headline: `Leitura TÃ¡tica: ${tournament.name}`,
    lede:     `Como os perfis reais interagiram. O que o placar nao conta.`,
    body,
    data: {
      surface: tournament.surface,
      champion: champion?.name,
      finalist: finalist?.name,
      champAffinity: champion ? getSurfaceAffinity(champion, tournament.surface) : null,
      biggestUpset: upsets[0] ?? null,
    },
    tags: ['tÃ¡tica', 'perfil', 'superfÃ­cie', 'game plan'],
    tone: 'PRECISE_TACTICAL',
  };
}

// â”€â”€ LENZ: Recordes & Marcos â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
        `${champion.name} conquista o ${totalTitles}Âº tÃ­tulo da carreira, ` +
        `${champCtx.titles.gs + 1}Âº em Grand Slams. ` +
        `${champCtx.titles.gs + 1 >= 3 ? 'Entra no grupo seleto de mÃºltiplos campeÃµes de Slam.' : ''}`
      );
    } else if (tournament.category === 'MASTERS_1000') {
      body.push(
        `${champion.name} adiciona mais um Masters Ã  prateleira. ` +
        `Total de Masters: ${(champCtx.titles.masters ?? 0) + 1}. ` +
        `O campeÃ£o segue construindo um palmarÃ¨s que o circuito ainda estÃ¡ dimensionando.`
      );
    } else {
      body.push(
        `${champion.name} encerra ${tournament.name} com o tÃ­tulo. ` +
        `${totalTitles}Â° tÃ­tulo da carreira em torneios oficiais.`
      );
    }
  }

  if (agg.maxRally > 40) {
    body.push(
      `O rally mais longo do torneio atingiu ${agg.maxRally} golpes â€” ` +
      `um nÃºmero que entra no registro de partidas mais disputadas desta ediÃ§Ã£o.`
    );
  }

  if (upsets.length >= 3) {
    body.push(
      `${upsets.length} upsets significativos em um Ãºnico torneio Ã© um nÃºmero fora da curva histÃ³rica. ` +
      `O circuito nÃ£o costuma ver volatilidade assim em torneios de nÃ­vel ${tournament.category ?? 'indefinido'}.`
    );
  } else if (upsets.length === 0 && tournament.category !== 'ATP_250') {
    body.push(
      `Curiosidade: nenhum upset expressivo nesta ediÃ§Ã£o. ` +
      `O draw se resolveu de forma previsÃ­vel, o que em si jÃ¡ Ã© um dado histÃ³rico em torneios desta envergadura.`
    );
  }

  if (champion?.age) {
    if (champion.age <= 21) {
      body.push(
        `${champion.name} tem ${champion.age} anos. ` +
        `CampeÃµes tÃ£o jovens nesta categoria sÃ£o uma raridade no circuito â€” e quando aparecem, geralmente anunciam uma era.`
      );
    } else if (champion.age >= 33) {
      body.push(
        `Com ${champion.age} anos, ${champion.name} desafia a curva natural de declÃ­nio. ` +
        `CampeÃµes acima dos 32 nesta categoria tÃªm nomes contados na histÃ³ria do circuito.`
      );
    }
  }

  body.push(pick(ANALYSTS.LENZ.voice.closing));

  return {
    analyst:  ANALYSTS.LENZ,
    type:     ANALYSIS_TYPES.POST_RECORD,
    headline: `Recordes e Marcos: ${tournament.name} no Arquivo do Circuito`,
    lede:     `O que esta ediÃ§Ã£o adiciona Ã  histÃ³ria. O que o registro vai guardar.`,
    body,
    data: {
      champion: champion?.name,
      champAge: champion?.age,
      upsetCount: upsets.length,
      maxRally: agg.maxRally,
      category: tournament.category,
    },
    tags: ['recordes', 'histÃ³ria', 'marcos', 'arquivo'],
    tone: 'SCHOLARLY_WONDER',
  };
}

// â”€â”€ FERREIRA: O Que Deu Errado (ou a Tese ContrÃ¡ria) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function ferreiraPostVerdict(tournament, bracket, state) {
  const { champion, finalist, upsets } = extractBracketResults(bracket);
  const agg = aggregateTournamentStats(bracket);

  const body = [];
  body.push(pick(ANALYSTS.FERREIRA.voice.opening));

  // Sempre tem uma tese contrÃ¡ria
  const theses = [];

  if (finalist) {
    theses.push(
      `A narrativa vai celebrar ${champion?.name ?? 'o campeÃ£o'}. ` +
      `Mas ${finalist.name} perdeu a final â€” e a pergunta que ninguÃ©m estÃ¡ fazendo Ã©: ` +
      `o que foi diferente no momento decisivo? Perder uma final nÃ£o Ã© fracasso. ` +
      `Mas perder sem entender o porquÃª Ã©.`
    );
  }

  if (upsets.length === 0 && tournament.category === 'GRAND_SLAM') {
    theses.push(
      `Um Grand Slam sem upsets expressivos Ã© um Grand Slam que falhou em revelar qualquer coisa nova. ` +
      `O circuito precisa de volatilidade para se renovar. ` +
      `Quando o favorito vence do comeÃ§o ao fim, a narrativa ganha, o jogo perde.`
    );
  }

  if (agg.errorBlend < 50) {
    theses.push(
      `${agg.errorBlend}% de erros forÃ§ados. ` +
      `Mais da metade dos pontos decididos foram por gratuidade, nÃ£o por pressÃ£o tÃ¡tica. ` +
      `Isso nÃ£o Ã© um torneio de alto nÃ­vel â€” Ã© um torneio onde o melhor sobreviveu aos prÃ³prios erros.`
    );
  }

  if (champion) {
    const champAff = getSurfaceAffinity(champion, tournament.surface);
    if (champAff >= 1) {
      theses.push(
        `${champion.name} venceu num torneio onde o perfil tecnico dele era claramente favorecido. ` +
        `Ganhar com vantagem estrutural Ã© esperado, nÃ£o celebrado. ` +
        `O verdadeiro teste vem quando a superfÃ­cie nÃ£o coopera.`
      );
    }
  }

  // Sempre pega a tese mais provocadora
  body.push(pick(theses.length > 0 ? theses : [
    `Este torneio nÃ£o revelou nada que o circuito ainda nÃ£o soubesse. ` +
    `Ã€s vezes, a anÃ¡lise mais honesta Ã©: foi um torneio comum. E comum nÃ£o merece elogios automÃ¡ticos.`
  ]));

  body.push(pick(ANALYSTS.FERREIRA.voice.closing));

  return {
    analyst:  ANALYSTS.FERREIRA,
    type:     ANALYSIS_TYPES.POST_VERDICT,
    headline: `Veredicto de ${tournament.name}: O Que NinguÃ©m Disse`,
    lede:     `A narrativa oficial celebra. A anÃ¡lise honesta questiona.`,
    body,
    data: {
      champion: champion?.name,
      finalist: finalist?.name,
      errorBlend: agg.errorBlend,
      upsetCount: upsets.length,
    },
    tags: ['crÃ­tica', 'veredicto', 'contrarian', 'anÃ¡lise'],
    tone: 'CONTRARIAN_SHARP',
  };
}

// â”€â”€ PARK: Sinal de TendÃªncia â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function parkPostTrend(tournament, bracket, state) {
  const { champion, upsets } = extractBracketResults(bracket);
  const allResults = state?.tournamentHistory ?? [];
  const recentTitles = allResults.slice(-6); // Ãºltimos 6 torneios

  const body = [];
  body.push(pick(ANALYSTS.PARK.voice.opening));

  if (champion) {
    // Quantos dos Ãºltimos 6 esse cara venceu?
    const recentWins = recentTitles.filter(t => t.champion?.id === champion.id).length;
    if (recentWins >= 2) {
      body.push(
        `${champion.name} venceu ${recentWins} dos Ãºltimos ${recentTitles.length} torneios registrados. ` +
        `Isso nÃ£o Ã© forma. Ã‰ dominÃ¢ncia. E dominÃ¢ncia que se sustenta por mÃºltiplos torneios ` +
        `geralmente precede uma declaraÃ§Ã£o de era.`
      );
    } else {
      body.push(
        `${champion.name} somou mais um tÃ­tulo, mas a questÃ£o sistÃªmica Ã© outra: ` +
        `o topo do circuito estÃ¡ concentrado em poucos nomes, ou hÃ¡ uma abertura real para novos protagonistas?`
      );
    }
  }

  // AnÃ¡lise de superfÃ­cie no circuito atual
  const surfaceLabel = SURFACE_LABELS[tournament.surface] ?? SURFACE_LABELS.HARD;
  body.push(
    `O ${surfaceLabel.label} continua sendo a superfÃ­cie com o perfil de resultado mais previsÃ­vel? ` +
    `Ou este torneio mostrou que a hierarquia estÃ¡ sendo reescrita?`
  );

  if (upsets.length >= 2) {
    body.push(
      `${upsets.length} upsets em uma semana sinalizam abertura. ` +
      `Quando jovens ou outsiders eliminam o establishment com regularidade, ` +
      `o circuito estÃ¡ em fase de transiÃ§Ã£o. Essa leitura macro vai importar nos prÃ³ximos Grand Slams.`
    );
  }

  body.push(
    `O padrÃ£o que este torneio confirma, cancela ou inaugura vai ficar claro apenas nos prÃ³ximos meses. ` +
    `Mas os sinais jÃ¡ estÃ£o aqui â€” Ã© sÃ³ saber lÃª-los.`
  );

  body.push(pick(ANALYSTS.PARK.voice.closing));

  return {
    analyst:  ANALYSTS.PARK,
    type:     ANALYSIS_TYPES.POST_TREND,
    headline: `${tournament.name} Como Sinal: O Que o Circuito EstÃ¡ Dizendo`,
    lede:     `AlÃ©m do resultado. O que essa semana significa para os prÃ³ximos meses.`,
    body,
    data: {
      champion: champion?.name,
      surface: tournament.surface,
      upsetCount: upsets.length,
      tournamentCategory: tournament.category,
    },
    tags: ['tendÃªncias', 'circuito', 'macro', 'era'],
    tone: 'SYSTEMIC_ELEGANT',
  };
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// PRÃ‰-TORNEIO: GERADORES
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

function volkovPreFavorites(tournament, players, state) {
  const surface = SURFACE_LABELS[tournament.surface] ?? SURFACE_LABELS.HARD;
  const ranking = state?.rankingSystem?.getRanking?.() ?? [];

  // Top 8 do ranking no draw
  const drawPlayers = players ?? [];
  const sorted = [...drawPlayers]
    .map(p => ({
      ...p,
      rank: ranking.find(r => r.id === p.id)?.rank ?? 99,
      surfaceAff: getSurfaceAffinity(p, tournament.surface),
      surfaceFitScore: getSurfaceProfile(p, tournament.surface).score,
    }))
    .sort((a, b) => a.rank - b.rank)
    .slice(0, 8);

  const body = [];
  body.push(pick(ANALYSTS.VOLKOV.voice.opening));

  body.push(
    `${tournament.name} â€” ${tournament.category ?? ''} â€” comeÃ§a com ${players?.length ?? '?'} jogadores no draw. ` +
    `${surface.icon} SuperfÃ­cie: ${surface.label}. Isso nÃ£o Ã© detalhe â€” Ã© o filtro mais poderoso do torneio.`
  );

  const favorites = sorted.filter(p => p.rank <= 8).slice(0, 3);
  if (favorites.length > 0) {
    body.push(
      `Favoritos por ranking + afinidade de superfÃ­cie: ` +
      favorites.map(p => `${p.name} (NÂº${p.rank}, afinidade: ${affinityLabel(p.surfaceAff)})`).join(' | ')
    );
  }

  const darkHorses = sorted
    .filter(p => p.rank > 8 && p.surfaceAff >= 1)
    .slice(0, 2);
  if (darkHorses.length > 0) {
    body.push(
      `AtenÃ§Ã£o para: ` +
      darkHorses.map(p => `${p.name} (NÂº${p.rank}) â€” ${affinityLabel(p.surfaceAff)} ${surface.adj}`).join(' e ') +
      `. Ranking nÃ£o conta toda a histÃ³ria quando a superfÃ­cie Ã© um fator.`
    );
  }

  body.push(pick(ANALYSTS.VOLKOV.voice.closing));

  return {
    analyst:  ANALYSTS.VOLKOV,
    type:     ANALYSIS_TYPES.PRE_FAVORITES,
    headline: `AnÃ¡lise PrÃ©-${tournament.name}: Favoritos e EficiÃªncia Esperada`,
    lede:     `Quem tem os nÃºmeros para vencer. Quem pode surpreender.`,
    body,
    data: { surface: tournament.surface, topPlayers: sorted.slice(0, 5).map(p => p.name) },
    tags: ['prÃ©-torneio', 'favoritos', 'estatÃ­sticas', 'superfÃ­cie'],
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
      surfaceAff: getSurfaceAffinity(p, tournament.surface),
    }))
    .sort((a, b) => a.rank - b.rank);

  const specialists   = drawPlayers.filter(p => p.surfaceAff >= 2).slice(0, 3);
  const disadvantaged = drawPlayers.filter(p => p.rank <= 10 && p.surfaceAff < 0).slice(0, 2);

  const body = [];
  body.push(pick(ANALYSTS.OKAFOR.voice.opening));

  body.push(
    `A pergunta que define ${tournament.name}: quem sabe jogar ${surface.adj}? ` +
    `Nao quem e top seed — quem tem o pacote certo para esta superficie.`
  );

  if (specialists.length > 0) {
    body.push(
      `Especialistas presentes no draw: ` +
      specialists.map(p => `${p.name} (${p.surfaceFitScore}/100)`).join(', ') +
      `. Esses jogadores chegam com vantagem estrutural antes mesmo da primeira bola.`
    );
  }

  if (disadvantaged.length > 0) {
    body.push(
      `Atencao para os top seeds com desvantagem de encaixe: ` +
      disadvantaged.map(p => `${p.name} (NÂº${p.rank}, ${affinityLabel(p.surfaceAff)} ${surface.adj})`).join(' e ') +
      `. Ranking alto nÃ£o cancela inadequaÃ§Ã£o de superfÃ­cie. Isso vai aparecer nas semifinais.`
    );
  }

  body.push(pick(ANALYSTS.OKAFOR.voice.closing));

  return {
    analyst:  ANALYSTS.OKAFOR,
    type:     ANALYSIS_TYPES.PRE_SURFACE_FIT,
    headline: `Quem Sabe Jogar ${surface.label}? AnÃ¡lise de Draw â€” ${tournament.name}`,
    lede:     `SuperfÃ­cie como filtro tÃ¡tico. Quem vai sofrer, quem vai florescer.`,
    body,
    data: {
      surface: tournament.surface,
      specialists: specialists.map(p => p.name),
      disadvantaged: disadvantaged.map(p => p.name),
    },
    tags: ['prÃ©-torneio', 'superfÃ­cie', 'perfil', 'tÃ¡tica'],
    tone: 'PRECISE_TACTICAL',
  };
}

function lenzPrePressure(tournament, players, state) {
  const surface = SURFACE_LABELS[tournament.surface] ?? SURFACE_LABELS.HARD;
  const ranking = state?.rankingSystem?.getRanking?.() ?? [];

  // Procura por narrativas histÃ³ricas: sequÃªncia sem tÃ­tulo, defesa de pontos, etc.
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

  // Categoria e peso histÃ³rico
  const categoryLabel = {
    GRAND_SLAM:   'Grand Slam â€” o maior peso do calendÃ¡rio',
    MASTERS_1000: 'Masters 1000 â€” o patamar mais alto abaixo dos Slams',
    SLAM_CLASH:   'Slam Clash â€” torneio histÃ³rico de confronto direto',
    ATP_500:      'ATP 500 â€” torneio com pontuaÃ§Ã£o expressiva',
    ATP_250:      'ATP 250',
    ATP_100:      'Challenger â€” onde carreiras sÃ£o construÃ­das',
  }[tournament.category ?? ''] ?? tournament.category;

  body.push(
    `${tournament.name} Ã© um ${categoryLabel}. ` +
    `A histÃ³ria deste torneio vai alÃ©m desta ediÃ§Ã£o â€” cada vencedor ` +
    `inscreve o nome numa lista que o circuito leva a sÃ©rio.`
  );

  // Jogadores buscando primeiro tÃ­tulo em Grand Slam ou Masters
  if (tournament.category === 'GRAND_SLAM' || tournament.category === 'MASTERS_1000') {
    const noTitle = drawPlayers.filter(p => {
      const gs = p.titles?.gs ?? 0;
      const m  = p.titles?.masters ?? 0;
      const target = tournament.category === 'GRAND_SLAM' ? gs : m;
      return p.rank <= 15 && target === 0;
    });
    if (noTitle.length > 0) {
      body.push(
        `${noTitle.slice(0,2).map(p=>p.name).join(' e ')} chegam sem tÃ­tulo na categoria. ` +
        `No registro histÃ³rico, os primeiros tÃ­tulos de Grand Slam e Masters definem eras. ` +
        `Esta pode ser a semana â€” ou mais uma pÃ¡gina de espera.`
      );
    }
  }

  body.push(pick(ANALYSTS.LENZ.voice.closing));

  return {
    analyst:  ANALYSTS.LENZ,
    type:     ANALYSIS_TYPES.PRE_PRESSURE,
    headline: `O Peso HistÃ³rico de ${tournament.name}`,
    lede:     `O que estÃ¡ em jogo alÃ©m da taÃ§a. O arquivo vai registrar o quÃª desta ediÃ§Ã£o?`,
    body,
    data: {
      category: tournament.category,
      surface: tournament.surface,
    },
    tags: ['prÃ©-torneio', 'histÃ³ria', 'pressÃ£o', 'marcos'],
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
      surfaceAff: getSurfaceAffinity(p, tournament.surface),
    }))
    .sort((a, b) => a.rank - b.rank);

  // Candidatos a azarÃ£o: rank 12-30, alta afinidade com superfÃ­cie
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
      `Meu candidato ao upset da semana: ${pick1.name}, NÂº${pick1.rank}. ` +
      `${affinityLabel(pick1.surfaceAff)} ${surface.adj}. ` +
      `O circuito tende a subestimar jogadores nessa faixa de ranking quando a superfÃ­cie os favorece. ` +
      `Isso Ã© um padrÃ£o â€” nÃ£o Ã© previsÃ£o. Ã‰ anÃ¡lise.`
    );
  } else {
    body.push(
      `Draw com poucos candidatos claros a upset. Quando isso acontece, ` +
      `o torneio fica perigoso de formas inesperadas â€” geralmente aparece alguÃ©m que ninguÃ©m estava olhando.`
    );
  }

  body.push(pick(ANALYSTS.FERREIRA.voice.closing));

  return {
    analyst:  ANALYSTS.FERREIRA,
    type:     ANALYSIS_TYPES.PRE_DARK_HORSE,
    headline: `Quem Vai Causar Problemas em ${tournament.name}?`,
    lede:     `O circuito nÃ£o assiste azarÃµes â€” atÃ© que eles aparecem. Minha lista desta semana.`,
    body,
    data: {
      candidates: candidates.slice(0, 3).map(p => p.name),
      surface: tournament.surface,
    },
    tags: ['prÃ©-torneio', 'azarÃ£o', 'upset', 'crÃ­tica'],
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
    `${tournament.name} chega num momento especÃ­fico do calendÃ¡rio. ` +
    `Forma, calendÃ¡rio, acÃºmulo â€” tudo isso vai aparecer na quadra esta semana.`
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
        return `${p.name} (${wins}/5 nos Ãºltimos torneios)`;
      }).join(' e ') +
      `. Forma Ã© o indicador mais subestimado no tÃªnis.`
    );
  }

  body.push(
    `O circuito estÃ¡ ${surface.adj} esta semana. Quem tem momentum aqui ` +
    `vai carregar isso para as prÃ³ximas rodadas. Quem nÃ£o tem â€” vai sentir o peso.`
  );

  body.push(pick(ANALYSTS.PARK.voice.closing));

  return {
    analyst:  ANALYSTS.PARK,
    type:     ANALYSIS_TYPES.PRE_FORM_WATCH,
    headline: `Forma do Momento: Quem Chega Quente a ${tournament.name}`,
    lede:     `Momentum, calendÃ¡rio e acÃºmulo. O macro que decide antes da primeira bola.`,
    body,
    data: {
      hotPlayers: hotPlayers.map(p => p.name),
      surface: tournament.surface,
    },
    tags: ['prÃ©-torneio', 'forma', 'momentum', 'calendÃ¡rio'],
    tone: 'SYSTEMIC_ELEGANT',
  };
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// MESA REDONDA (DEBATE)
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

export function generateRoundtableDebate(tournament, bracket, state) {
  const { champion, finalist, upsets } = extractBracketResults(bracket);
  const surface = SURFACE_LABELS[tournament.surface] ?? SURFACE_LABELS.HARD;
  const agg = aggregateTournamentStats(bracket);

  // Gera a pergunta central do debate
  const questions = [];
  if (champion) questions.push(`${champion.name} Ã© o favorito ao prÃ³ximo Grand Slam?`);
  if (upsets.length >= 2) questions.push(`Os upsets desta semana sinalizam mudanÃ§a de geraÃ§Ã£o?`);
  if (agg.errorBlend > 60) questions.push(`Foi um torneio de nÃ­vel de jogo ou de nÃ­vel de oponente?`);
  questions.push(`O que ${tournament.name} nos diz sobre o circuito atual?`);

  const question = pick(questions);

  // Cada analista responde com 2-3 frases
  const responses = [
    {
      analyst: ANALYSTS.VOLKOV,
      position: champion
        ? `Os nÃºmeros de ${champion.name} esta semana sÃ£o estatisticamente acima da mÃ©dia do circuito para a categoria. EficiÃªncia de ${agg.serve1Pct}% de 1Â° saque, rally mÃ©dio de ${agg.avgRally}. O que os dados mostram Ã© um desempenho consistente, nÃ£o um acidente.`
        : `Os dados do torneio estÃ£o dentro da normalidade estatÃ­stica para o nÃ­vel ${tournament.category}. Nada fora da curva.`,
    },
    {
      analyst: ANALYSTS.OKAFOR,
      position: champion
        ? `Taticamente, ${champion.name} foi o jogador com plano mais claro ${surface.adj}. O pacote de atributos, preferencias e padroes encontrou as respostas certas nas rodadas decisivas. Nao e sorte — e leitura de jogo.`
        : `O padrÃ£o tÃ¡tico mais interessante desta semana foi a resposta dos especialistas de superfÃ­cie.`,
    },
    {
      analyst: ANALYSTS.LENZ,
      position: `O arquivo do circuito vai registrar esta ediÃ§Ã£o como ${upsets.length >= 2 ? 'um torneio de alta volatilidade' : 'uma ediÃ§Ã£o dentro da normalidade histÃ³rica'}. ${champion ? `${champion.name} adiciona mais um capÃ­tulo a uma carreira que jÃ¡ tem peso.` : ''}`,
    },
    {
      analyst: ANALYSTS.FERREIRA,
      position: champion
        ? `Eu discordo da celebraÃ§Ã£o automÃ¡tica. ${champion.name} venceu, mas venceu com quem? O nÃ­vel do campo ${upsets.length >= 3 ? 'foi prejudicado pelos upsets' : 'nÃ£o era dos mais densos'}. O prÃ³ximo Grand Slam vai ser mais revelador.`
        : `Essa semana provou que o consenso do circuito sobre os favoritos estÃ¡ errado.`,
    },
    {
      analyst: ANALYSTS.PARK,
      position: `Sistemicamente, ${tournament.name} Ã© mais um dado num padrÃ£o maior. ${champion ? `${champion.name} estÃ¡ construindo algo â€” e o circuito ainda estÃ¡ decidindo se Ã© forma ou tendÃªncia de longo prazo.` : 'A abertura no topo do ranking estÃ¡ criando um padrÃ£o novo.'}`,
    },
  ];

  return {
    type:      ANALYSIS_TYPES.POST_DEBATE,
    headline:  `Mesa Redonda â€” ${tournament.name}: "${question}"`,
    lede:      `Cinco analistas. Uma pergunta. Cinco respostas que nÃ£o concordam entre si.`,
    question,
    responses,
    tags:      ['mesa redonda', 'debate', 'anÃ¡lise', 'cinco vozes'],
  };
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// ENTRY POINTS PRINCIPAIS
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

/**
 * Gera anÃ¡lises PRÃ‰-torneio.
 * @param {Object} tournament  â€” objeto do CALENDAR
 * @param {Array}  players     â€” jogadores no draw (opcional)
 * @param {Object} state       â€” estado do universo (opcional)
 * @returns {AnalystReport[]}
 */
export function generatePreTournamentAnalysis(tournament, players = [], state = {}) {
  const reports = [];

  try { reports.push(volkovPreFavorites(tournament, players, state));  } catch(e) { console.warn('VOLKOV PRE:', e); }
  try { reports.push(okaforPreSurfaceFit(tournament, players, state)); } catch(e) { console.warn('OKAFOR PRE:', e); }
  try { reports.push(lenzPrePressure(tournament, players, state));     } catch(e) { console.warn('LENZ PRE:',  e); }
  try { reports.push(ferreiraPreDarkHorse(tournament, players, state));} catch(e) { console.warn('FERR PRE:',  e); }
  try { reports.push(parkPreFormWatch(tournament, players, state));    } catch(e) { console.warn('PARK PRE:',  e); }

  return reports.filter(Boolean);
}

/**
 * Gera anÃ¡lises PÃ“S-torneio.
 * @param {Object} tournament  â€” objeto do CALENDAR
 * @param {Object} bracket     â€” resultado do torneio
 * @param {Object} state       â€” estado do universo
 * @returns {AnalystReport[]}
 */
export function generatePostTournamentAnalysis(tournament, bracket, state = {}) {
  const reports = [];

  try { reports.push(volkovPostEfficiency(tournament, bracket, state)); } catch(e) { console.warn('VOLKOV POST:', e); }
  try { reports.push(okaforPostTactical(tournament, bracket, state));   } catch(e) { console.warn('OKAFOR POST:', e); }
  try { reports.push(lenzPostRecord(tournament, bracket, state));       } catch(e) { console.warn('LENZ POST:',  e); }
  try { reports.push(ferreiraPostVerdict(tournament, bracket, state));  } catch(e) { console.warn('FERR POST:',  e); }
  try { reports.push(parkPostTrend(tournament, bracket, state));        } catch(e) { console.warn('PARK POST:',  e); }

  // Mesa redonda sempre termina o conjunto pÃ³s-torneio
  try { reports.push(generateRoundtableDebate(tournament, bracket, state)); } catch(e) { console.warn('ROUNDTABLE:', e); }

  return reports.filter(Boolean);
}

/**
 * Retorna apenas o catÃ¡logo de analistas (Ãºtil para UI).
 */
export function getAnalystRoster() {
  return Object.values(ANALYSTS);
}
