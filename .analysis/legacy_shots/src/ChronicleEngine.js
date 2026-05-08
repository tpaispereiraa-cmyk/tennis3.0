// ════════════════════════════════════════════════════════════════════
// 📖 CHRONICLE ENGINE — Tennis Universe
// Motor narrativo do almanaque anual do circuito
//
// Integração:
//   1. Adicione `chronicleEngine: new ChronicleEngine()` ao buildUniverse()
//   2. No case 'ADVANCE_YEAR' do reducer, antes do return:
//      state.chronicleEngine?.generateYearEntry(state);
//   3. Serialize via toJSON()/fromJSON() junto com rivalrySystem
// ════════════════════════════════════════════════════════════════════

// ── Tons narrativos ─────────────────────────────────────────────────
export const TONES = {
  EPICO:       'EPICO',        // Grand Slam sweep, era declarada, dominância histórica
  DINASTICO:   'DINASTICO',    // Um nome acima de todos, multi-superfície, incontestável
  TRAGICO:     'TRAGICO',      // Lendas que partem, lesões que desviam destinos
  INCERTO:     'INCERTO',      // Caos, upsets, hierarquia invertida
  TRANSICAO:   'TRANSICAO',    // Ano silencioso que prepara o próximo capítulo
  PRODIGIO:    'PRODIGIO',     // Uma chegada que reescreve o que era esperado
};

// ── Paleta de superfícies ────────────────────────────────────────────
export const SURFACE_LABELS = {
  CLAY:   { label: 'Saibro',  color: '#C4572A', icon: '🏺' },
  GRASS:  { label: 'Grama',   color: '#2E7D32', icon: '🌿' },
  HARD:   { label: 'Dura',    color: '#1565C0', icon: '🏙️' },
  INDOOR: { label: 'Indoor',  color: '#6A1B9A', icon: '🏟️' },
};

// FASE 3: Labels legíveis para migrações de estilo de jogo
const STYLE_LABELS_NARRATIVE = {
  AGG_BASELINER: 'Aggressive Baseliner',
  PWR_BASE:      'Power Baseliner',
  CTR_PUNCHER:   'Counter-Puncher',
  ALL_COURT:     'All-Court',
  SRV_VOL:       'Serve-and-Volleyer',
  BIG_SERVER:    'Big Server',
  RETRIEVER:     'Retriever',
  TAKEALLRISK:   'All-Risk Gunner',
  GRINDER:       'Grinder',
  TACT_TEC:      'Tactical Technician',
  NET_SPEC:      'Net Specialist',
  ADPT_TAC:      'Adaptive Tactician',
  MOMENTUM_PLAYER: 'Momentum Player',
};

// ── Vozes por tom ────────────────────────────────────────────────────
const VOICE = {

  EPICO: {
    opening: [
      'Há temporadas que o circuito guarda não como referência, mas como reverência. {year} foi uma delas.',
      'Quando a poeira de dezembro de {year} baixou, o que ficou não era apenas um nome no topo do ranking — era uma declaração.',
      'O calendário de {year} não se abriu como os outros. Havia algo diferente no ar desde janeiro, e o circuito levou o ano inteiro para entender o que era.',
      'Não se discute {year}. Só se respeita.',
      'Décadas depois o circuito ainda vai citar {year} quando precisar explicar o que significa dominar um esporte.',
      'Poucos anos na história do tênis têm o peso específico de {year}. Não é hipérbole — é o que os números dizem quando você para de tentar relativizá-los.',
      'O circuito assistiu a {year} com a boca ligeiramente aberta. Alguns anos fazem isso com a gente.',
    ],
    bridge: [
      'Os números existem. O que eles não capturam é o silêncio nas arenas depois de cada ponto decisivo.',
      'Quem estava lá presente não precisou de análise para entender. Sentiu.',
      'O ranking registrou. A memória vai mais fundo.',
    ],
    closing: [
      'A história está escrita. O circuito ainda processa.',
      'Alguns anos mudam o que se espera do próximo. {year} vai viver nessa lista por muito tempo.',
      'Não há argumento contrário que sobreviva ao placar.',
      'O que {year} construiu vai ser citado enquanto houver raquetes e saibro neste esporte.',
      'Quem tentou explicar {year} enquanto acontecia estava sempre um passo atrás do que o jogo estava fazendo.',
    ],
  },

  DINASTICO: {
    opening: [
      'O circuito havia se acostumado à possibilidade. Em {year}, virou certeza — e a certeza pesa diferente da possibilidade.',
      '{year} foi o tipo de ano que os analistas descrevem como "esperado" antes de começar e "impressionante" depois de terminar. A repetição não diminui. Às vezes aumenta.',
      'A dominância que se repete deixa de ser surpresa e vira pressão. Para todo mundo exceto para quem a exerce.',
      'Havia uma pergunta no início de {year}. Em dezembro, ninguém mais fazia a pergunta.',
      'A segunda dominação tem um peso diferente da primeira. A terceira, diferente da segunda. {year} adicionou mais uma camada.',
      'Não é o mesmo que da primeira vez — é mais assustador. Porque agora o circuito sabe que não foi acidente.',
    ],
    bridge: [
      'Ganhar uma vez é talento. Ganhar de novo é estratégia. Ganhar de novo e de novo é outra coisa inteiramente.',
      'A consistência é a forma mais sofisticada de dominância — e a mais difícil de enfrentar, porque não tem um ponto fraco óbvio.',
      'O circuito aprendeu a antecipar. Antecipar não é o mesmo que aceitar.',
    ],
    closing: [
      'A pergunta para {nextyear} permanece a mesma de sempre. A resposta, mais difícil de encontrar do que nunca.',
      'Dynastias não duram para sempre. Mas enquanto duram, são absolutas — e essa ainda mostra todos os sinais vitais.',
      'Quando a dominância se torna padrão, ela para de surpreender e começa a intimidar. {year} cruzou essa linha.',
      'O circuito vai entrar em {nextyear} sabendo que é possível. Saber e conseguir são conversas diferentes.',
    ],
  },

  TRAGICO: {
    opening: [
      '{year} será lembrado menos pelo que aconteceu nas quadras e mais pelo que terminou fora delas.',
      'Há anos que marcam pela ausência. {year} foi um deles — e o circuito ainda está aprendendo a jogar no espaço que ficou.',
      'Nem sempre os anos mais importantes são os mais vistosos. {year} provou esse ponto com a força de um golpe direto.',
      'O pó do saibro de {year} assentou sobre um circuito mais silencioso do que quando a temporada começou.',
      'Algumas perdas não cabem em placares. {year} distribuiu o tipo que não cabe.',
      'O que {year} retirou do circuito não pode ser calculado em pontos de ranking. A ausência não tem número.',
      'A dor de {year} não apareceu nos placares. Apareceu nas cadeiras vazias e nos matchups que nunca vão acontecer.',
    ],
    bridge: [
      'E mesmo assim o calendário continuou, como sempre continua. O circuito aprendeu isso cedo.',
      'O espetáculo segue — mas com uma consciência diferente do peso daquilo que ficou para trás.',
      'O tênis não para para o luto. O luto que aprende a conviver com o jogo.',
    ],
    closing: [
      'Uma geração encerrou. O próximo capítulo terá que ser escrito por outras mãos.',
      'O circuito continua. Mas diferente — e vai demorar para preencher esse espaço.',
      'Quem os viu jogar no auge sabe o que foi perdido. Os números de {year} são apenas o registro oficial.',
      'O próximo capítulo pertence a outros nomes. Escrever ele vai exigir que o circuito encontre uma nova linguagem.',
      'Vai demorar. O tipo de presença que {year} levou não é substituído — é sucedido, o que é diferente.',
    ],
  },

  INCERTO: {
    opening: [
      'Ninguém saiu de {year} com certeza sobre o que tinha acabado de assistir.',
      '{year} foi o tipo de temporada que especialistas evitam usar como exemplo porque toda análise parece incompleta.',
      'Pergunte a qualquer veterano o que foi {year} e ele vai hesitar antes de responder. Não por falta de memória — por excesso de contradição.',
      'O circuito encerrou {year} sem consenso. Para a narrativa, foi tudo. Para a hierarquia, foi um desastre.',
      'Se o objetivo de {year} era clareza, falhou completamente. Se o objetivo era drama, entregou além do esperado.',
      'O manual não serviu de nada em {year}. Foi rasgado antes de secar a tinta do encadernador.',
    ],
    bridge: [
      'Os algoritmos erraram. Os especialistas erraram. Os favoritos erraram. Ninguém saiu ileso da previsão.',
      'A hierarquia do ranking virou papel amassado nos momentos que mais importavam.',
      'E ninguém no vestiário apostaria no resultado no dia seguinte. Esse foi {year}.',
    ],
    closing: [
      'O circuito não sabe se está assistindo o início de uma era ou o fim de outra. Essa ambiguidade é exatamente o que torna {nextyear} urgente.',
      'A dúvida é o estado natural do circuito agora. É precisamente por isso que vale a pena prestar atenção.',
      'Ninguém sabe o que esperar. Esse é o tipo de circuito que não deixa ninguém dormir bem — inclusive os favoritos.',
      'A resposta virá em {nextyear}. Ou talvez em {nextyear} as perguntas se multipliquem.',
    ],
  },

  TRANSICAO: {
    opening: [
      'Nem todo ano é para os livros. {year} foi para as fundações — e as fundações são o que sustentam os livros.',
      '{year} vai fazer sentido olhando para trás. Quem soube ler as entrelinhas já entende o que foi construído.',
      'A história direta é a mais honesta: {year} foi um ano de movimento sem ruptura, de construção sem proclamação.',
      'Há temporadas que preparam as próximas. {year} foi uma delas, e ficará claro isso mais tarde.',
      'O circuito respirou fundo em {year} antes de correr de novo. Essas pausas têm importância que só o tempo revela.',
      'Não havia um protagonista óbvio em {year}. Havia candidatos, alicerces, movimentos discretos de peças que vão importar.',
    ],
    bridge: [
      'Nos bastidores, alicerces foram construídos em silêncio.',
      'A próxima geração começou a revelar suas cartas — discretamente, mas revelou.',
      'Quem souber ler as entrelinhas de {year} vai entender o que está sendo construído para {nextyear}.',
    ],
    closing: [
      'Não foi um ano para os livros. Foi um ano para escrever os próximos.',
      'O terreno está preparado. O circuito aguarda a faísca.',
      'Esses anos silenciosos costumam preceder os mais barulhentos. O calendário de {nextyear} vai provar — de um jeito ou do outro.',
      'O palco está montado. Falta o protagonista dar o passo que transforme candidatura em certeza.',
    ],
  },

  PRODIGIO: {
    opening: [
      'O circuito conhece o roteiro do talento: anos de formação discreta, depois explosão. Em {year}, um nome quebrou o roteiro.',
      '{year} foi o ano em que o circuito teve que rever suas projeções — não porque estavam erradas, mas porque estavam atrasadas.',
      'Toda geração produz um nome que muda a velocidade das coisas. {year} pode ter apresentado o seu.',
      'Há estreias e há chegadas. {year} teve uma chegada — e o circuito ainda está processando a diferença.',
      'Os veteranos viram. Os analistas mediram. Ninguém chegou a um consenso, exceto que algo havia mudado.',
      'O circuito estava esperando por isso. Só não esperava que fosse tão rápido, tão limpo, tão cedo.',
    ],
    bridge: [
      'E o mais desconcertante: parecia natural. Sem esforço extra. Apenas o jogo acontecendo.',
      'A curva de aprendizado foi mais curta do que ninguém havia calculado.',
      'Os veteranos responderam como respondem ao talento real: com respeito calculado e atenção redobrada.',
    ],
    closing: [
      'O que {year} plantou, {nextyear} vai começar a colher — e o circuito já sente a diferença entre antecipar e esperar.',
      'A história começa aqui — ou aqui começa a parte mais difícil dela. A parte onde a expectativa supera a realidade que precisa superá-la.',
      '{nextyear} vai testar o que {year} sugeriu. O circuito aguarda com a impaciência de quem acredita que pode estar vendo o início de algo.',
      'O talento tem prazo? O circuito de {nextyear} vai tentar descobrir se o que viu em {year} foi prometido ou entregue.',
    ],
  },
};

// ── Frases de eventos específicos ────────────────────────────────────
const PHRASES = {

  // ── GRAND SLAMS ──────────────────────────────────────────────────
  grandSlamTitle: [
    'levantou o troféu no {t} e o circuito não precisou de análise para entender o que acabou de ver',
    'conquistou o {t} da forma mais inequívoca possível — cada partida foi uma afirmação diferente do mesmo argumento',
    'venceu o {t} e adicionou mais uma pedra a uma construção que já não admite dúvida razoável',
    'fechou o {t} com o título e com ele a confirmação de que não há contingência nessa carreira — há decisão',
    'ergueu o troféu no {t} após uma quinzena que o circuito vai guardar como exemplo pelo que foi e pelo como foi',
  ],
  calendarSlam: [
    '{name} ganhou os quatro Grand Slams do calendário em {year}. Há pouquíssimas formas de escrever essa frase sem que pareça ficção — mas os placares estão todos lá.',
    'O Calendar Slam existe como conceito há décadas. Em {year}, {name} transformou o conceito em placar.',
    'Quatro Slams. Um ano. Um nome: {name}. O circuito vai parar de tentar explicar e começar a simplesmente guardar na memória.',
    '{name} completou o Calendar Slam em {year}. O circuito levou um tempo antes de perceber que estava assistindo a isso enquanto acontecia.',
  ],
  grandSlamSweep: [
    '{name} ganhou {n} dos {total} Grand Slams do calendário — um nível de dominância nos torneios mais exigentes que o circuito raramente vê.',
    'Com {n} títulos em Grand Slams, {name} tornou {year} seu de uma forma que vai para os registros históricos.',
    '{n} troféus de Grand Slam em {year}. O nome de {name} ficou inscrito na temporada de uma forma que não admite revisão.',
  ],
  grandSlamFinal: [
    '{name} chegou à final do {t} como favorito e confirmou o favoritismo com a frieza de quem sabe exatamente o que está fazendo',
    'A final do {t} colocou {name} e {runner} frente a frente — e o circuito ficou sem resposta fácil antes de começar',
    'Quando {name} e {runner} chegaram à final do {t}, o circuito parou para calcular as probabilidades. Os cálculos erraram',
  ],
  fiveSetEpic: [
    'A final do {t} foi ao quinto set e o que aconteceu lá dentro não coube no placar',
    'Cinco sets no {t}. Há partidas que precisam de todo esse espaço para ser ditas',
    'O placar do quinto set do {t} ficou na memória do circuito por razões que nenhum número explica completamente',
  ],

  // ── MASTERS / MENORES ────────────────────────────────────────────
  mastersTitle: [
    'dominou o {t} com uma clareza que deixou poucos argumentos para quem ainda duvidava',
    'levantou o troféu no {t} — o tipo de título que não acrescenta só pontos, mas peso narrativo',
    'venceu o {t} e adicionou mais uma evidência ao processo que o circuito está tentando catalogar',
    'ganhou o {t} de um jeito que levou os adversários a revisarem seus planos para o próximo encontro',
  ],
  mastersDominance: [
    'transformou os Masters 1000 em residência própria com {n} títulos — e o circuito começou a calcular o que seria preciso para expulsar o inquilino',
    'ganhou {n} Masters 1000 e construiu o tipo de argumento que não precisa de suplemento: os troféus falam',
    'com {n} troféus Masters em {year}, deixou a mensagem mais clara que um ranking pode transmitir',
  ],

  // ── SUPERFÍCIE ───────────────────────────────────────────────────
  surfaceDominance: {
    CLAY: [
      'O saibro de {year} foi território de {name} — cada torneio na terra batida foi mais uma afirmação da mesma tese',
      '{name} tratou as quadras de saibro de {year} como propriedade particular. O circuito tentou entrar e foi educadamente convidado a sair',
      'No saibro, {name} não jogou — governou. {year} foi mais um capítulo de um reinado que o circuito aprendeu a respeitar',
    ],
    GRASS: [
      'A grama de {year} foi de {name} — saque, voley, movimento. Uma linguagem que poucos falam com tanta fluência',
      '{name} transformou as quadras de grama em argumento pessoal. {year} será lembrado como o ano em que a grama teve dono',
      'Na grama, {name} operou com a eficiência de quem conhece cada centímetro do terreno. {year} confirmou o que a memória já guardava',
    ],
    HARD: [
      'As quadras duras de {year} foram de {name} — consistência, velocidade, leitura de jogo. O adversário ideal que nunca apareceu',
      '{name} dominou a dura em {year} com a frieza de quem transformou eficiência em arte',
      'Na quadra dura, {name} encontrou em {year} o palco perfeito para uma temporada que não admitiu hesitação',
    ],
  },

  // ── RIVALIDADES ──────────────────────────────────────────────────
  rivalryClassic: [
    '{p1} e {p2} se encontraram {n} vezes em {year} e o placar final captura o resultado mas não o jogo',
    'A rivalidade entre {p1} e {p2} atingiu {n} confrontos — e cada um carregou a densidade de uma conversa que os dois estão tendo há anos',
    'Quando {p1} e {p2} cruzaram o caminho, o circuito parou. Em {year}, isso aconteceu {n} vezes, e cada vez a tensão foi diferente da anterior',
    '{p1} contra {p2}: {n} confrontos em {year}, nenhum deles decidido com a facilidade que os rankings sugeriam',
  ],
  rivalryDomination: [
    '{p1} respondeu a {p2} com a frieza de quem vê uma questão já resolvida sendo refeita por teimosia',
    'A vantagem de {p1} sobre {p2} cresceu em {year} até o ponto em que a rivalidade mudou de natureza — deixou de ser duelo e virou leção',
    '{p1} construiu sobre {p2} em {year} com a paciência de um argumento que não precisa ser gritado para ser ouvido',
    'O confronto entre {p1} e {p2} foi resolvido em {year} com a clareza brutal que apenas os números conseguem transmitir sem constrangimento',
  ],
  rivalryGrudge: [
    '{p1} e {p2} transformaram cada encontro em {year} em algo que o circuito não tinha vocabulário totalmente adequado para descrever',
    'Não há outra palavra para o que {p1} e {p2} construíram em {year}: cada ponto, cada olhar, cada troca de bola carregava camadas que as regras não preveem',
    'A tensão entre {p1} e {p2} transcendeu os resultados em {year}. O circuito assistiu desconfortável e fascinado — ao mesmo tempo',
  ],
  rivalryFinalsCurse: [
    'O destino parece ter um roteiro específico para {p1} e {p2}: colocá-los frente a frente quando tudo importa. {year} confirmou o padrão',
    '{p1} e {p2} se encontraram na final mais uma vez — e o circuito não estava mais surpreso. Estava expectante, com a antecipação de quem já conhece o gênero mas não sabe o desfecho',
    'Se existe uma maldição das finais no circuito, ela tem dois nomes que {year} voltou a colocar na mesma frase',
  ],
  rivalryEraClash: [
    '{p1} e {p2} representam coisas que o circuito ainda está tentando reconciliar — eras diferentes, linguagens diferentes, filosofias de jogo que não se traduzem uma na outra',
    'Quando {p1} e {p2} se cruzam, o circuito não vê só um duelo — vê o passado testando o futuro, ou o futuro tentando provar que já chegou sem pedir licença',
    'A tensão entre {p1} e {p2} vai além dos resultados: é a conversa entre o que o circuito foi e o que está se tornando, com ambos os lados recusando-se a ceder',
  ],
  rivalryGiantKiller: [
    'O improvável virou padrão. O placar entre {p1} e {p2} desafia qualquer lógica de ranking — e o circuito aprendeu a parar de tentar aplicar a lógica',
    '{p1} e {p2}: o ranking dizia uma coisa, o resultado disse outra. Em {year}, a distância entre as duas histórias cresceu até o ponto de exigir uma explicação própria',
  ],

  // ── RECORDES E MARCOS ────────────────────────────────────────────
  alcunhaGained: [
    '{name} conquistou a alcunha "{alcunha}" em {year} — um reconhecimento que o circuito reserva para quem transformou consistência em identidade',
    'O circuito passou a chamar {name} de "{alcunha}" em {year}. Não foi uma decisão formal — foi uma constatação gradual que não precisou de aprovação',
    '"{alcunha}" — o título que {name} ganhou em {year} sem precisar pedir. Esse tipo se conquista, não se negocia',
  ],
  winStreak: [
    '{name} construiu uma sequência de {streak} vitórias consecutivas que redefiniu o que o circuito achava que sabia sobre consistência nessa fase da temporada',
    '{streak} vitórias seguidas. {name} passou por esse trecho do calendário sem encontrar o adversário capaz de formular a pergunta certa',
    'A sequência de {streak} partidas sem derrota de {name} entrou nos registros — e no repertório dos adversários que tentaram interrompê-la',
  ],
  titleMilestone: [
    '{name} chegou ao {milestone}º título da carreira em {year} — um número que a maioria dos profissionais nunca chega perto de visualizar',
    'O {milestone}º troféu de {name} chegou em {year} com o peso de uma carreira inteira construída para essa conversa',
    'Quando {name} ergueu o {milestone}º título, o circuito parou para contar. O número diz muito — e esconde mais ainda sobre o que custou',
  ],
  seasonTitles: [
    '{name} terminou {year} com {n} título{s} — uma colheita que define dominância independente de qual palavra você queira usar',
    'Com {n} troféu{s} na temporada, {name} construiu o currículo de {year} que nenhum outro nome pode contestar com honestidade',
    '{n} títulos em {year}. {name} não se contentou com uma afirmação — precisou de {n}',
  ],

  // ── ASCENSÃO / QUEDA ─────────────────────────────────────────────
  rankingRise: [
    '{name} subiu {gain} posições no ranking durante {year} — de #{from} para #{to}. Essa velocidade não acontece por acidente',
    'A escalada de {name} no ranking em {year}: de #{from} para #{to}. O circuito viu acontecer e precisou de um momento para catalogar',
    'De #{from} para #{to} em uma temporada: {name} fez o tipo de movimento que os analistas marcam em azul',
  ],
  rankingFall: [
    '{name} começou {year} em #{from} e encerrou em #{to}. A distância entre os dois números carrega uma história que os pontos não narram completamente',
    'De #{from} para #{to} — a temporada de {name} em {year} foi um estudo em como o circuito não espera por ninguém',
    'O que aconteceu com {name} em {year} serve de lembrete: #{gone} posições em doze meses, e o jogo continua como se nada tivesse sido prometido',
  ],

  // ── LESÃO / COMEBACK ─────────────────────────────────────────────
  injuryMajor: [
    'A lesão de {name} em {year} retirou do calendário o que o circuito não sabia que ia sentir falta até que o espaço ficou visível',
    '{name} saiu do circuito por semanas após a lesão — e o que ficou foi uma lacuna que o calendário preencheu com substitutos mas não com equivalentes',
    'Quando {name} se retirou do torneio por lesão, o circuito entendeu que estava perdendo mais do que uma entrada no chaveamento',
  ],
  injuryComeback: [
    '{name} voltou ao circuito em {year} depois de uma ausência que parecia maior do que foi. O jogo recomeçou onde havia parado',
    'O retorno de {name} foi o tipo de entrada silenciosa que só os jogadores que sabem o que fizeram conseguem executar. Sem fanfarra. Com resultado',
    '{name} regressou ao tour em {year} e o circuito percebeu que havia guardado espaço — inconscientemente, talvez',
  ],

  // ── PRODIGIOS / PROMOÇÕES ────────────────────────────────────────
  debutTitle: [
    '{name} estreou no circuito principal e ganhou um título antes de completar um mês. O circuito ficou em silêncio por um instante — não de surpresa, de assimilação',
    'A chegada de {name} ao tour veio acompanhada de um troféu. Isso não está no roteiro padrão. O roteiro padrão foi reescrito',
    '{name} chegou ao circuito principal com um título embaixo do braço. Há nomes que chegam pedindo espaço. Esse chegou ocupando',
  ],
  debutFinal: [
    '{name} alcançou a final na temporada de estreia no tour principal — e o circuito notou com a atenção específica que reserva para anomalias que podem ser o normal do futuro',
    'A primeira temporada de {name} no circuito principal incluiu uma final. O circuito calcula: isso foi o começo ou já foi o aviso?',
    '{name} chegou ao tour principal e imediatamente estava na conversa das finais. Essa velocidade tem um nome — talvez ainda seja cedo para usá-lo, mas ele existe',
  ],
  debutImpression: [
    '{name} chegou ao circuito principal e fez o suficiente para garantir que nenhum nome de {year} vai aparecer nas análises sem que o seu apareça também',
    'A estreia de {name} no tour foi discreta em trofeus mas barulhenta nos vestiários — os números mentem, a impressão não',
    '{name} entrou no circuito principal em {year} e o circuito ficou com aquela sensação de que vai ouvir esse nome por muito tempo',
  ],

  // ── APOSENTADORIAS ────────────────────────────────────────────────
  retirement: [
    '{name} pendurou a raquete após {years} temporada{sy} e {titles} título{st}. Uma carreira que cada adversário que cruzou seu caminho vai carregar de forma diferente',
    '{name} se despediu com {titles} título{st} e {years} ano{sy} de circuito. Os números existem. O que eles protegem, não cabe neles',
    'O adeus de {name}: {years} temporada{sy}, {titles} título{st}, pico de #{peak}. O circuito não consegue não fazer as contas do que ficou faltando',
  ],
  retirementLegend: [
    '{name} se aposentou em {year} e o circuito ficou com a sensação de que uma linguagem inteira foi junto. {titles} título{st}. {years} ano{sy}. Um legado que vai levar décadas para ser totalmente calibrado',
    'O adeus de {name} foi o evento de {year} que ninguém queria ver confirmado. {titles} troféu{st}. {years} temporada{sy}. Pico de #{peak}. O número de vezes que esteve num patamar que nenhuma análise ainda conseguiu replicar',
    'Quando {name} anunciou a aposentadoria, o circuito entendeu que uma era foi embora junto. {titles} título{st} em {years} ano{sy}, pico #{peak}. Uma presença que vai continuar sendo citada enquanto houver comparações a fazer',
    '{name} encerrou a carreira e deixou um silêncio específico — o tipo que ocupa espaço próprio. {titles} título{st}. {years} temporada{sy}. O que {name} representou não cabe em nenhuma dessas métricas, mas é o que os torna concretos',
  ],
  retirementSurprise: [
    '{name} anunciou a aposentadoria antes de o circuito estar preparado para receber a notícia. {titles} título{st}, {years} temporada{sy} — e a sensação persistente de que havia mais capítulos ainda por escrever',
    'A despedida de {name} chegou cedo demais. {titles} troféu{st} em {years} ano{sy}. O circuito ficou com a aritmética incompleta de uma carreira que não terminou onde parecia que ia terminar',
  ],

  // ── STATS FINAIS ─────────────────────────────────────────────────
  numericSummary: [
    'A temporada registrou {matches} confrontos ao longo de {tournaments} torneios. O calendário não poupou ninguém.',
    '{tournaments} torneios. {matches} partidas. Um ano que compressa todos esses números sem que eles consigam comprimir ele.',
    'No balanço: {matches} partidas distribuídas por {tournaments} torneios em quatro superfícies. O circuito não descansou.',
  ],

  // ── EVOLUÇÃO DE ESTILO ────────────────────────────────────────────
  // FASE 3: narrativa para migrações de estilo por declínio físico
  styleMigration: [
    '{name} mudou. Não a postura, não o nome — o jogo. Com {age} anos, o circuito passou a ver um {toStyle} onde antes havia um {fromStyle}. É a carreira escolhendo o caminho que o físico deixou aberto.',
    'A evolução de {name} passou de {fromStyle} para {toStyle} com {age} anos — uma transição que o circuito percebeu ponto a ponto antes de conseguir nomear.',
    '{name} encontrou no {toStyle} a segunda linguagem que o {fromStyle} de juventude não precisava. Com {age} anos, é uma tradução que os adversários ainda estão aprendendo a ler.',
    'A carreira de {name} tem dois capítulos físicos e um único fio narrativo. O {fromStyle} foi o primeiro capítulo. O {toStyle} começa aqui, aos {age} anos — com mais leitura e menos impulsividade.',
    'Com {age} anos, {name} não perdeu o jogo — reformulou. De {fromStyle} para {toStyle}: uma mudança que o circuito demoraria a reconhecer se não houvesse os resultados para confirmar.',
  ],
};

// ── Utilitários ──────────────────────────────────────────────────────
function pick(arr) {
  if (!arr || arr.length === 0) return '';
  return arr[Math.floor(Math.random() * arr.length)];
}
function s(n) { return n !== 1 ? 's' : ''; }
function fill(tpl, vars) {
  if (!tpl) return '';
  return tpl.replace(/\{(\w+)\}/g, (_, k) => vars[k] !== undefined ? vars[k] : `{${k}}`);
}
function playerName(state, id) {
  if (!id) return 'Desconhecido';
  const all = [...(state.tourPlayers ?? []), ...(state.retiredPlayers ?? []), ...(state.prospects ?? [])];
  const p = all.find(p => p.id === id);
  return p?.name ?? `Jogador ${id}`;
}

// ── Coleta de dados da temporada ─────────────────────────────────────
function collectSeasonData(state) {
  const year = state.year;
  const data = {
    year,

    // Campeões por categoria
    grandSlamWinners: [],      // [{id, name, tournament, surface, runnerUpName}]
    masters1000Winners: [],
    atp500Winners: [],
    finalsChampName: null,
    finalsRunnerUpName: null,
    finalsUpset: false,

    // Dominância
    calendarSlam: false,
    grandSlamSweep: false,
    grandSlamDominatorName: null,
    grandSlamDominatorCount: 0,
    mastersDominator: null,    // {name, count}
    mostTitlesPlayer: null,    // {name, count}
    seasonTitleAccum: null,    // quem ganhou 3+ títulos no total

    // Superfície dominante
    surfaceDominator: null,    // {name, surface, count}
    dominantSurface: null,     // qual superfície teve mais drama

    // Rankings
    rankingLeaderName: null,
    rankingLeaderId: null,

    // Rivalidade
    topRivalry: null,
    topRivalryType: null,

    // Alcunhas ganhas no ano
    alcunhasGained: [],        // [{name, alcunha}]

    // Upsets
    biggestUpset: null,        // {winnerName, winnerRank, victimRank, tournamentName, surface}

    // Recordes
    winStreakRecord: null,     // {name, streak}
    titleMilestones: [],       // [{name, milestone}]

    // Ranking movement
    biggestRiser: null,
    biggestFaller: null,

    // Lesões e comebacks
    majorInjury: null,         // {name, grade, type}
    inMatchRetirements: 0,     // contagem de abandonos em campo no ano

    // Promoções / estreias
    promotedThisYear: [],
    debutSensation: null,      // {name, achievement: 'TITLE'|'FINAL'|'SEMIFINAL'}

    // Aposentadorias
    retirements: [],

    // Stats
    totalMatches: 0,
    totalTournaments: 0,
    numChampions: 0,
    surfaceBreakdown: { CLAY: 0, GRASS: 0, HARD: 0, INDOOR: 0 },
  };

  try {
    const results = state.tournamentResults ?? {};
    const allPlayers = [...(state.tourPlayers ?? []), ...(state.retiredPlayers ?? []), ...(state.prospects ?? [])];
    const rankMap = {};
    (state.tourPlayers ?? []).forEach(p => { rankMap[p.id] = p.rankPosition ?? 99; });

    const titleCountByPlayer = {};
    const surfaceWinsByPlayer = {};
    const champSet = new Set();

    // ── Varrer resultados dos torneios ──
    for (const [, res] of Object.entries(results)) {
      const { bracket, tournament } = res ?? {};
      if (!bracket || !tournament) continue;

      const cat = tournament.category ?? '';
      const surf = tournament.surface ?? 'HARD';
      const champ = bracket.champion;
      if (!champ) continue;

      const champId = champ.id;
      const champName = champ.name ?? playerName(state, champId);
      champSet.add(champId);

      // Encontrar finalista
      const rounds = bracket.rounds ?? [];
      const lastRound = rounds[rounds.length - 1] ?? [];
      const finalMatch = lastRound.find(m => !m.isBye && m.winner);
      const runnerUpId = finalMatch
        ? (finalMatch.playerA?.id === champId ? finalMatch.playerB?.id : finalMatch.playerA?.id)
        : null;
      const runnerUpName = runnerUpId ? playerName(state, runnerUpId) : null;

      // Contagem de títulos
      titleCountByPlayer[champId] = (titleCountByPlayer[champId] ?? 0) + 1;

      // Contagem por superfície
      surfaceWinsByPlayer[champId] = surfaceWinsByPlayer[champId] ?? {};
      surfaceWinsByPlayer[champId][surf] = (surfaceWinsByPlayer[champId][surf] ?? 0) + 1;
      data.surfaceBreakdown[surf] = (data.surfaceBreakdown[surf] ?? 0) + 1;

      const entry = { id: champId, name: champName, tournament: tournament.name, surface: surf, runnerUpName, runnerUpId };

      if (cat === 'GRAND_SLAM') {
        data.grandSlamWinners.push(entry);
        // Verificar 5º set na final
        if (finalMatch?.result?.sets) {
          const sets = finalMatch.result.sets;
          if (sets.length === 5 || (tournament.bestOf === 5 && finalMatch.result?.setsDetail?.length === 5)) {
            entry.fiveSetFinal = true;
          }
        }
      } else if (cat === 'MASTERS_1000') {
        data.masters1000Winners.push(entry);
      } else if (cat === 'ATP_500') {
        data.atp500Winners.push(entry);
      } else if (cat === 'FINALS' || cat === 'ATP_FINALS') {
        data.finalsChampName = champName;
        data.finalsRunnerUpName = runnerUpName;
        const champRank = rankMap[champId] ?? 99;
        const runnerRank = runnerUpId ? (rankMap[runnerUpId] ?? 99) : 1;
        if (champRank > runnerRank + 3) data.finalsUpset = true;
      }

      // Contar partidas
      for (const round of rounds) {
        for (const match of round) {
          if (!match.isBye && match.winner) data.totalMatches++;
        }
      }
      data.totalTournaments++;

      // Upset detection (final com gap de ranking >= 10)
      if (finalMatch && runnerUpId) {
        const wRank = rankMap[champId] ?? 99;
        const lRank = rankMap[runnerUpId] ?? 99;
        const margin = wRank - lRank;
        if (margin >= 10 && (!data.biggestUpset || margin > data.biggestUpset.margin)) {
          data.biggestUpset = {
            winnerName: champName, winnerRank: wRank, victimRank: lRank,
            tournamentName: tournament.name, surface: surf, margin, isGrandSlam: cat === 'GRAND_SLAM',
          };
        }
      }
    }

    // ── Grand Slam sweep / domination ──
    const gsCounts = {};
    data.grandSlamWinners.forEach(w => { gsCounts[w.id] = (gsCounts[w.id] ?? 0) + 1; });
    const topGSId = Object.keys(gsCounts).sort((a, b) => gsCounts[b] - gsCounts[a])[0];
    if (topGSId) {
      data.grandSlamDominatorCount = gsCounts[topGSId];
      data.grandSlamDominatorName = playerName(state, topGSId);
      if (data.grandSlamDominatorCount >= 4) data.calendarSlam = true;
      else if (data.grandSlamDominatorCount >= 3) data.grandSlamSweep = true;
    }

    // ── Masters dominação ──
    const mCounts = {};
    data.masters1000Winners.forEach(w => { mCounts[w.id] = (mCounts[w.id] ?? 0) + 1; });
    const topMId = Object.keys(mCounts).sort((a, b) => mCounts[b] - mCounts[a])[0];
    if (topMId && mCounts[topMId] >= 3) {
      data.mastersDominator = { name: playerName(state, topMId), count: mCounts[topMId] };
    }

    // ── Most titles overall ──
    const sortedTitles = Object.entries(titleCountByPlayer).sort((a, b) => b[1] - a[1]);
    if (sortedTitles.length > 0) {
      const [topId, topCount] = sortedTitles[0];
      if (topCount >= 2) data.mostTitlesPlayer = { id: topId, name: playerName(state, topId), count: topCount };
      if (topCount >= 3) data.seasonTitleAccum = data.mostTitlesPlayer;
    }

    // ── Líder de ranking ──
    const sorted = (state.tourPlayers ?? []).slice().sort((a, b) => (a.rankPosition ?? 999) - (b.rankPosition ?? 999));
    if (sorted.length > 0) {
      data.rankingLeaderId = sorted[0].id;
      data.rankingLeaderName = sorted[0].name ?? playerName(state, sorted[0].id);
    }

    // ── Surface dominator ──
    for (const [pId, surfs] of Object.entries(surfaceWinsByPlayer)) {
      for (const [surf, cnt] of Object.entries(surfs)) {
        if (cnt >= 2 && (!data.surfaceDominator || cnt > data.surfaceDominator.count)) {
          data.surfaceDominator = { name: playerName(state, pId), surface: surf, count: cnt };
        }
      }
    }

    // ── Rivalidades ──
    if (state.rivalrySystem?.rivalries) {
      const arr = [];
      for (const [, r] of state.rivalrySystem.rivalries.entries()) {
        if (r.totalMatches >= 2 && (r.lastSeason === year || r.seasons?.includes?.(year))) {
          arr.push(r);
        }
      }
      arr.sort((a, b) => {
        const aS = (a.intensity ?? 0) + a.totalMatches * 0.1;
        const bS = (b.intensity ?? 0) + b.totalMatches * 0.1;
        return bS - aS;
      });
      if (arr.length > 0) {
        const top = arr[0];
        const dominated = Math.abs(top.p1Wins - top.p2Wins) > top.totalMatches * 0.35;
        data.topRivalry = {
          p1Id: top.p1Id, p1Name: playerName(state, top.p1Id), p1Wins: top.p1Wins,
          p2Id: top.p2Id, p2Name: playerName(state, top.p2Id), p2Wins: top.p2Wins,
          total: top.totalMatches, dominated,
          dominatorName: top.p1Wins > top.p2Wins ? playerName(state, top.p1Id) : playerName(state, top.p2Id),
          submissiveName: top.p1Wins > top.p2Wins ? playerName(state, top.p2Id) : playerName(state, top.p1Id),
          type: top.type ?? 'CLASSIC',
          status: top.status ?? 'ACTIVE',
          frostStatus: top.status === 'FROZEN',
        };
        data.topRivalryType = top.type ?? 'CLASSIC';
      }
    }

    // ── Alcunhas ganhas (via events) ──
    for (const e of state.events ?? []) {
      if (e.type === 'ALCUNHA_GAINED' && e.year === year) {
        const pName = e.player?.name ?? playerName(state, e.playerId);
        if (pName && e.alcunha) {
          data.alcunhasGained.push({ name: pName, alcunha: e.alcunha });
        }
      }
      // ── Migrações de estilo por declínio físico ──
      if (e.type === 'STYLE_MIGRATION' && e.year === year) {
        if (!data.styleMigrations) data.styleMigrations = [];
        data.styleMigrations.push({
          name:        e.player ?? playerName(state, e.playerId),
          fromStyleId: e.fromStyleId,
          toStyleId:   e.toStyleId,
          age:         e.age,
          note:        e.note,
        });
      }
    }

    // ── Lesões graves ──
    for (const e of state.events ?? []) {
      if ((e.type === 'injury' || e.type === 'injury_wd' || e.type === 'in_match_retirement' || e.type === 'in_match_injury') && e.year === year) {
        const grade = e.injury?.grade ?? 1;
        if (grade >= 3 && (!data.majorInjury || grade > data.majorInjury.grade)) {
          data.majorInjury = { name: e.playerName ?? playerName(state, e.playerId), grade, type: e.injury?.type };
        }
        // Abandono em campo: conta como lesão major mesmo se grade não está marcado
        if (e.type === 'in_match_retirement' && !data.majorInjury) {
          data.majorInjury = { name: e.playerName ?? playerName(state, e.playerId), grade: 2, type: e.injury?.type ?? 'IN_MATCH' };
        }
        if (e.type === 'in_match_retirement') {
          data.inMatchRetirements++;
        }
      }
    }

    // ── Promoções ──
    for (const p of state.tourPlayers ?? []) {
      if (p.promotedYear === year) {
        data.promotedThisYear.push(p);
        // Verificar se chegou à final
        const inFinal = Object.values(results).some(res => {
          const lastRound = (res?.bracket?.rounds ?? []).slice(-1)[0] ?? [];
          return lastRound.some(m => !m.isBye && (m.playerA?.id === p.id || m.playerB?.id === p.id));
        });
        const wonTitle = champSet.has(p.id);
        if (wonTitle && (!data.debutSensation || data.debutSensation.achievement !== 'TITLE')) {
          data.debutSensation = { name: p.name, achievement: 'TITLE' };
        } else if (inFinal && !data.debutSensation) {
          data.debutSensation = { name: p.name, achievement: 'FINAL' };
        }
      }
    }

    // ── Aposentadorias (do retiredPlayers acumulado) ──
    for (const p of state.retiredPlayers ?? []) {
      if (p.retirementInfo?.year === year) {
        const hist = p._seasonHistory ?? [];
        const years = hist.length;
        const titles = hist.filter(h => h.titleWon).length;
        const peakRank = Math.min(...(state.tourPlayers ?? []).filter(tp => tp.id === p.id).map(tp => tp.careerBest ?? 99), 99);
        const isLegend = titles >= 5 || peakRank <= 3;
        const isSurprise = p.retirementInfo.type === 'EARLY';
        data.retirements.push({ name: p.name, titles, years, peakRanking: peakRank, isLegend, isSurprise });
      }
    }

    // ── Rankings movement via _seasonHistory ──
    const risers = [], fallers = [];
    for (const p of state.tourPlayers ?? []) {
      const hist = p._seasonHistory ?? [];
      const thisYear = hist.find(h => h.year === year);
      const prevYear = hist.find(h => h.year === year - 1);
      if (thisYear && prevYear && p.rankPosition) {
        const startRank = prevYear.rankAtEnd ?? 50;
        const endRank = p.rankPosition;
        const gain = startRank - endRank;
        if (gain >= 5) risers.push({ name: p.name, fromRank: startRank, toRank: endRank, gain });
        if (gain <= -5) fallers.push({ name: p.name, fromRank: startRank, toRank: endRank, loss: Math.abs(gain) });
      }
    }
    risers.sort((a, b) => b.gain - a.gain);
    fallers.sort((a, b) => b.loss - a.loss);
    if (risers.length > 0) data.biggestRiser = risers[0];
    if (fallers.length > 0) data.biggestFaller = fallers[0];

    // ── Número de campeões distintos ──
    data.numChampions = champSet.size;

    // ── FASE 6: careerMoments notáveis do ano ──────────────────────────
    const notableMomentTypes = new Set([
      'FIRST_SLAM','FAREWELL','COMEBACK','PERSONA_SHIFT','DROUGHT_END','TITLE_WHILE_INJURED',
    ]);
    const yearCareerMoments = [];
    for (const p of (state.tourPlayers ?? [])) {
      for (const m of (p.personality?.careerMoments ?? [])) {
        if (m.year === year && notableMomentTypes.has(m.type)) {
          yearCareerMoments.push({ ...m, playerName: p.name, playerId: p.id, rank: p.rankPosition ?? 99 });
        }
      }
    }
    yearCareerMoments.sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99));
    if (yearCareerMoments.length > 0) data.yearCareerMoments = yearCareerMoments;

    // ── FASE 6: Eventos de coaching ──────────────────────────────
    const coachingEvents = [];
    const coachPool      = state.coachPool ?? [];
    const allPlayersCoach = [...(state.tourPlayers ?? []), ...(state.prospects ?? [])];

    for (const p of allPlayersCoach) {
      // PUPIL_SURPASSED_MASTER: pupilo tem mais Slams que o ex-jogador que o treina
      const activeCoach = p.coach ? coachPool.find(c => c.id === p.coach.coachId) : null;
      if (activeCoach?.origin === 'RETIRED_PLAYER') {
        const pupilSlams  = p._careerGrandSlams ?? 0;
        const coachSlams  = activeCoach.careerSlams ?? 0;
        if (pupilSlams > coachSlams && pupilSlams >= 1 && coachSlams >= 1) {
          coachingEvents.push({
            type: 'PUPIL_SURPASSED_MASTER',
            pupilName: p.name, coachName: activeCoach.name,
            coachCareerSlams: coachSlams, pupilSlams, year,
          });
        }

        // RIVAL_BECOMES_COACH: coach foi rival do pupilo e acabou de ser contratado este ano
        const hist = p.coachHistory ?? [];
        const latestHire = hist.length > 0 ? hist[hist.length - 1] : null;
        const isNewThisYear = p.coach?.startSeason === year;
        if (isNewThisYear && activeCoach.playerId && state.rivalrySystem?.rivalries) {
          for (const [, r] of state.rivalrySystem.rivalries.entries()) {
            const involves = (r.p1Id === p.id && r.p2Id === activeCoach.playerId) ||
                             (r.p2Id === p.id && r.p1Id === activeCoach.playerId);
            if (involves && r.totalMatches >= 3) {
              coachingEvents.push({
                type: 'RIVAL_BECOMES_COACH',
                coachName: activeCoach.name, pupilName: p.name,
                rivalryRecord: `${r.p1Wins}-${r.p2Wins}`, year,
              });
            }
          }
        }
      }

      // SHADOW_CURED_BY_COACH: Sombra curada este ano com coach MENTAL
      if (activeCoach?.philosophy === 'MENTAL') {
        const shadows = p._shadowMetrics ?? {};
        for (const [shadowId, sm] of Object.entries(shadows)) {
          if (sm.curedYear === year) {
            coachingEvents.push({
              type: 'SHADOW_CURED_BY_COACH',
              playerName: p.name, shadowId, coachName: activeCoach.name, year,
            });
          }
        }
      }
    }

    if (coachingEvents.length > 0) data.coachingEvents = coachingEvents;

  } catch (e) {
    console.warn('[ChronicleEngine Tennis] Erro na coleta:', e);
  }

  return data;
}

// ── Determinar tom ───────────────────────────────────────────────────
function determineTone(data) {
  const { retirements, calendarSlam, grandSlamSweep, grandSlamDominatorCount,
    numChampions, biggestUpset, debutSensation, mastersDominator, mostTitlesPlayer,
    seasonTitleAccum, alcunhasGained, majorInjury } = data;

  const legendsRetired = retirements.filter(r => r.isLegend).length;

  // ÉPICO: Calendar Slam, sweep, ou dominância histórica absoluta
  if (calendarSlam || grandSlamDominatorCount >= 3 ||
      (seasonTitleAccum && seasonTitleAccum.count >= 5)) {
    return TONES.EPICO;
  }

  // DINÁSTICO: domínio multi-superfície consistente
  if (grandSlamDominatorCount >= 2 && mastersDominator &&
      mastersDominator.name === data.grandSlamDominatorName) {
    return TONES.DINASTICO;
  }

  // TRÁGICO: lendas partindo, ou lesão grave combinada com pouco caos
  const inMatchRetirements = data.inMatchRetirements ?? 0;
  const year = data.year;
  if (legendsRetired >= 1 || retirements.length >= 3 ||
      (majorInjury && majorInjury.grade >= 4 && legendsRetired >= 0) ||
      (inMatchRetirements >= 2)) {
    return TONES.TRAGICO;
  }

  // PRODÍGIO: estreia que virou título
  if (debutSensation?.achievement === 'TITLE') {
    return TONES.PRODIGIO;
  }

  // INCERTO: caos, upsets, muitos campeões
  if (numChampions >= 7 || (biggestUpset && biggestUpset.margin >= 20)) {
    return TONES.INCERTO;
  }

  // PRODÍGIO: estreia forte (final)
  if (debutSensation?.achievement === 'FINAL') {
    return TONES.PRODIGIO;
  }

  // TRANSIÇÃO: padrão
  return TONES.TRANSICAO;
}

// ── Builder de seções ────────────────────────────────────────────────
function buildHeadline(data, tone, year) {
  const hero = data.grandSlamDominatorName ?? data.mostTitlesPlayer?.name ?? data.rankingLeaderName;
  switch (tone) {
    case 'EPICO': {
      if (data.calendarSlam)                   return `O Calendar Slam de ${hero}`;
      if (data.grandSlamDominatorCount >= 3)   return `${hero} e os ${data.grandSlamDominatorCount} Slams`;
      if (hero)                                return `O Ano de ${hero}`;
      return 'Uma Temporada para a História';
    }
    case 'DINASTICO': {
      if (hero)  return `${hero}: A Sequência Sem Fim`;
      return 'O Reinado Que Não Termina';
    }
    case 'TRAGICO': {
      if (data.retirements.length === 1) return `A Despedida de ${data.retirements[0].name}`;
      if (data.retirements.length > 1)   return 'O Fim de Uma Geração';
      if (data.majorInjury)              return `A Queda de ${data.majorInjury.name}`;
      return 'O Que o Circuito Perdeu';
    }
    case 'PRODIGIO': {
      const name = data.debutSensation?.name ?? hero;
      if (name) return `${name}: A Chegada`;
      return 'Uma Nova Voz no Circuito';
    }
    case 'INCERTO': {
      if (data.biggestUpset) return 'Nenhuma Certeza Sobreviveu';
      if (data.numChampions >= 6) return 'Caos, Seis Campeões, Zero Consenso';
      return 'O Ano Sem Dono';
    }
    case 'TRANSICAO': {
      if (data.promotedThisYear.length > 0) return `Em Construção — Com ${data.promotedThisYear[0].name} no Horizonte`;
      if (hero) return `${hero} Governa um Circuito em Formação`;
      return 'Entre Duas Eras';
    }
    default:
      return hero ? `${year}: O Ano de ${hero}` : `A Temporada de ${year}`;
  }
}

function buildSections(data, tone) {
  const { year } = data;
  const nextyear = year + 1;
  const voice = VOICE[tone] || VOICE.TRANSICAO;
  const sections = [];

  // ── ABERTURA ──
  sections.push({ type: 'opening', text: fill(pick(voice.opening), { year, nextyear }) });

  // ── HISTÓRIA PRINCIPAL ──
  const main = buildMainStory(data, tone, nextyear);
  if (main) sections.push({ type: 'main', text: main });

  // ── HISTÓRIA SECUNDÁRIA ──
  const sub1 = buildSubStory1(data, tone);
  if (sub1) sections.push({ type: 'sub1', text: sub1 });

  // ── HISTÓRIA TERCIÁRIA ──
  const sub2 = buildSubStory2(data, tone);
  if (sub2) sections.push({ type: 'sub2', text: sub2 });

  // ── STATS ──
  const stats = buildStats(data);
  if (stats) sections.push({ type: 'stats', text: stats });

  // ── FECHAMENTO ──
  sections.push({ type: 'closing', text: fill(pick(voice.closing), { year, nextyear }) });

  return sections.filter(s => s.text);
}

function buildMainStory(data, tone, nextyear) {
  const { year } = data;
  const parts = [];

  switch (tone) {
    case TONES.EPICO: {
      const hero = data.grandSlamDominatorName ?? data.mostTitlesPlayer?.name ?? data.rankingLeaderName;
      if (!hero) break;

      if (data.calendarSlam) {
        parts.push(fill(pick(PHRASES.calendarSlam), { name: `**${hero}**`, year }));
      } else if (data.grandSlamDominatorCount >= 3) {
        parts.push(fill(pick(PHRASES.grandSlamSweep), { name: `**${hero}**`, n: data.grandSlamDominatorCount, total: 4 }));
      }

      if (data.seasonTitleAccum && data.seasonTitleAccum.count >= 4) {
        parts.push(fill(pick(PHRASES.seasonTitles), {
          name: `**${data.seasonTitleAccum.name}**`, n: data.seasonTitleAccum.count, s: s(data.seasonTitleAccum.count),
        }));
      }

      if (data.surfaceDominator && data.surfaceDominator.name !== hero) {
        const sp = PHRASES.surfaceDominance[data.surfaceDominator.surface];
        if (sp) parts.push(fill(pick(sp), { name: `**${data.surfaceDominator.name}**` }));
      }
      break;
    }

    case TONES.DINASTICO: {
      const hero = data.grandSlamDominatorName ?? data.mastersDominator?.name ?? data.rankingLeaderName;
      if (!hero) break;

      if (data.grandSlamDominatorCount >= 2) {
        parts.push(fill(pick(PHRASES.grandSlamSweep), { name: `**${hero}**`, n: data.grandSlamDominatorCount, total: 4 }));
      }
      if (data.mastersDominator) {
        parts.push(fill(pick(PHRASES.mastersDominance), {
          name: `**${data.mastersDominator.name}**`, n: data.mastersDominator.count, s: s(data.mastersDominator.count),
        }));
      }
      if (data.surfaceDominator) {
        const sp = PHRASES.surfaceDominance[data.surfaceDominator.surface];
        if (sp) parts.push(fill(pick(sp), { name: `**${data.surfaceDominator.name}**` }));
      }
      break;
    }

    case TONES.TRAGICO: {
      data.retirements.forEach(r => {
        const tpl = r.isLegend ? pick(PHRASES.retirementLegend)
                  : r.isSurprise ? pick(PHRASES.retirementSurprise)
                  : pick(PHRASES.retirement);
        parts.push(fill(tpl, {
          name: `**${r.name}**`, titles: r.titles, st: s(r.titles),
          years: r.years, sy: s(r.years), peak: r.peakRanking,
        }));
      });
      if (data.majorInjury) {
        parts.push(fill(pick(PHRASES.injuryMajor), { name: `**${data.majorInjury.name}**` }));
      }
      // Adicionar quem preencheu o espaço
      if (data.mostTitlesPlayer && !data.retirements.some(r => r.name === data.mostTitlesPlayer.name)) {
        parts.push(fill(pick(PHRASES.seasonTitles), {
          name: `**${data.mostTitlesPlayer.name}**`, n: data.mostTitlesPlayer.count, s: s(data.mostTitlesPlayer.count),
        }));
      }
      break;
    }

    case TONES.PRODIGIO: {
      const prodigy = data.debutSensation?.name;
      if (!prodigy) break;
      if (data.debutSensation.achievement === 'TITLE') {
        parts.push(fill(pick(PHRASES.debutTitle), { name: `**${prodigy}**` }));
      } else {
        parts.push(fill(pick(PHRASES.debutFinal), { name: `**${prodigy}**` }));
      }
      if (data.rankingLeaderName && data.rankingLeaderName !== prodigy) {
        parts.push(`No restante do circuito, **${data.rankingLeaderName}** manteve a autoridade de quem não precisa de confirmação adicional.`);
      }
      break;
    }

    case TONES.INCERTO: {
      if (data.biggestUpset) {
        const u = data.biggestUpset;
        parts.push(fill(
          `**{winner}** (#{wRank}) derrubou o #{vRank} do ranking no {t}{gs} — o tipo de resultado que faz o circuito reler o placar duas vezes antes de acreditar.`,
          {
            winner: u.winnerName, wRank: u.winnerRank, vRank: u.victimRank,
            t: u.tournamentName, gs: u.isGrandSlam ? ', num Grand Slam,' : '',
          }
        ));
      }
      if (data.numChampions >= 6) {
        parts.push(`${data.numChampions} campeões diferentes distribuíram os troféus de ${year}. A hierarquia do ranking foi tratada como sugestão, não como lei.`);
      }
      break;
    }

    case TONES.TRANSICAO: {
      if (data.rankingLeaderName) {
        parts.push(`**${data.rankingLeaderName}** liderou o ranking durante {year} com a consistência de quem constrói algo — sem a afirmação incontestável que define uma era, mas com os alicerces que uma pode precisar.`.replace('{year}', year));
      }
      if (data.promotedThisYear.length > 0) {
        const name = data.promotedThisYear[0].name;
        parts.push(fill(pick(PHRASES.debutImpression), { name: `**${name}**`, year }));
      }
      break;
    }

    default: break;
  }

  return parts.join(' ') || null;
}

function buildSubStory1(data, tone) {
  const parts = [];

  // Rivalidade em destaque
  if (data.topRivalry) {
    const r = data.topRivalry;
    const rType = data.topRivalryType;
    if (rType === 'ERA_CLASH') {
      parts.push(fill(pick(PHRASES.rivalryEraClash), { p1: `**${r.p1Name}**`, p2: `**${r.p2Name}**` }));
    } else if (rType === 'GRUDGE') {
      parts.push(fill(pick(PHRASES.rivalryGrudge), { p1: `**${r.p1Name}**`, p2: `**${r.p2Name}**`, year: data.year }));
    } else if (rType === 'FINALS_CURSE') {
      parts.push(fill(pick(PHRASES.rivalryFinalsCurse), { p1: `**${r.p1Name}**`, p2: `**${r.p2Name}**` }));
    } else if (rType === 'GIANT_KILLER') {
      parts.push(fill(pick(PHRASES.rivalryGiantKiller), { p1: `**${r.dominatorName}**`, p2: `**${r.submissiveName}**` }));
    } else if (r.dominated) {
      parts.push(fill(pick(PHRASES.rivalryDomination), { p1: `**${r.dominatorName}**`, p2: `**${r.submissiveName}**` }));
    } else {
      parts.push(fill(pick(PHRASES.rivalryClassic), { p1: `**${r.p1Name}**`, p2: `**${r.p2Name}**`, n: r.total, year: data.year }));
    }
  }

  // Finals como sub-story se não foi a main
  if (!parts.length && data.finalsChampName) {
    if (data.finalsUpset) {
      parts.push(`O Finals de ${data.year} guardou uma surpresa de proporção: **${data.finalsChampName}** não era o favorito. O circuito ainda está processando.`);
    } else {
      parts.push(`**${data.finalsChampName}** fechou a temporada com o Finals — o título que encerra o debate sobre o nome do ano.`);
    }
  }

  // Grand Slam com 5º set (narrativa de drama)
  if (!parts.length) {
    const fiveSetGS = data.grandSlamWinners.find(w => w.fiveSetFinal);
    if (fiveSetGS) {
      parts.push(fill(pick(PHRASES.fiveSetEpic), { t: fiveSetGS.tournament }));
    }
  }

  return parts.join(' ') || null;
}

function buildSubStory2(data, tone) {
  const parts = [];

  // ── careerMoments notáveis — têm prioridade máxima como substory ──
  if (data.yearCareerMoments?.length > 0) {
    const MOMENT_PHRASES = {
      FIRST_SLAM:          (m) => `**${m.playerName}** venceu seu primeiro Grand Slam em ${data.year}. Há momentos que o circuito guarda para sempre — e este é um deles.`,
      FAREWELL:            (m) => `**${m.playerName}** encerrou a carreira em ${data.year}. O tênis raramente prepara o torcedor para esse tipo de despedida.`,
      COMEBACK:            (m) => `A volta de **${m.playerName}** foi uma das histórias do ano. Poucos apostavam — o ranking não mente sobre ausências longas.`,
      PERSONA_SHIFT:       (m) => `**${m.playerName}** mudou em ${data.year}. Não só o jogo — a postura, a narrativa pública, a forma como o circuito o lê.`,
      DROUGHT_END:         (m) => `**${m.playerName}** voltou a vencer em ${data.year}. Uma seca tem um peso que os números não capturam completamente.`,
      TITLE_WHILE_INJURED: (m) => `**${m.playerName}** conquistou um título em ${data.year} jogando com dor. O circuito notou.`,
    };
    // Pega o momento mais impactante (rank mais alto entre jogadores top)
    const topMoment = data.yearCareerMoments[0];
    const phraseBuilder = MOMENT_PHRASES[topMoment.type];
    if (phraseBuilder) {
      parts.push(phraseBuilder(topMoment));
      return parts.join(' ');
    }
  }

  // FASE 3: Migrações de estilo por declínio físico — narrativa de arco de carreira
  if (data.styleMigrations?.length > 0) {
    const mig = data.styleMigrations[0];
    const fromLabel = STYLE_LABELS_NARRATIVE[mig.fromStyleId] ?? mig.fromStyleId;
    const toLabel   = STYLE_LABELS_NARRATIVE[mig.toStyleId]   ?? mig.toStyleId;
    parts.push(fill(pick(PHRASES.styleMigration), {
      name:      `**${mig.name}**`,
      age:       mig.age,
      fromStyle: fromLabel,
      toStyle:   toLabel,
    }));
    return parts.join(' ');
  }

  // Alcunha ganha
  if (data.alcunhasGained.length > 0) {
    const a = data.alcunhasGained[0];
    parts.push(fill(pick(PHRASES.alcunhaGained), { name: `**${a.name}**`, alcunha: a.alcunha }));
    return parts.join(' ');
  }

  // Milestone de títulos
  if (data.titleMilestones.length > 0) {
    const m = data.titleMilestones[0];
    parts.push(fill(pick(PHRASES.titleMilestone), { name: `**${m.name}**`, milestone: m.milestone }));
    return parts.join(' ');
  }

  // Win streak
  if (data.winStreakRecord?.streak >= 7) {
    parts.push(fill(pick(PHRASES.winStreak), { name: `**${data.winStreakRecord.name}**`, streak: data.winStreakRecord.streak }));
    return parts.join(' ');
  }

  // Maior subida
  if (data.biggestRiser?.gain >= 7) {
    const r = data.biggestRiser;
    parts.push(fill(pick(PHRASES.rankingRise), { name: `**${r.name}**`, from: r.fromRank, to: r.toRank, gain: r.gain, year: data.year }));
    return parts.join(' ');
  }

  // Maior queda (exceto em tom trágico onde já foi coberta)
  if (data.biggestFaller?.loss >= 7 && tone !== TONES.TRAGICO) {
    const f = data.biggestFaller;
    parts.push(fill(pick(PHRASES.rankingFall), { name: `**${f.name}**`, from: f.fromRank, to: f.toRank, gone: f.loss, year: data.year }));
    return parts.join(' ');
  }

  // Domínio de superfície como nota final
  if (data.surfaceDominator && tone === TONES.TRANSICAO) {
    const sp = PHRASES.surfaceDominance[data.surfaceDominator.surface];
    if (sp) parts.push(fill(pick(sp), { name: `**${data.surfaceDominator.name}**` }));
  }

  // FASE 6: coaching events como substory
  if (data.coachingEvents?.length > 0) {
    const surpassed = data.coachingEvents.find(e => e.type === 'PUPIL_SURPASSED_MASTER');
    if (surpassed) {
      parts.push(`**${surpassed.pupilName}** ultrapassou o mestre: com ${surpassed.pupilSlams} Grand Slam(s), já superou o legado de ${surpassed.coachName} (${surpassed.coachCareerSlams} GS).`);
      return parts.join(' ');
    }
    const rival = data.coachingEvents.find(e => e.type === 'RIVAL_BECOMES_COACH');
    if (rival) {
      parts.push(`Um dos capítulos mais inusitados do ano: **${rival.coachName}** assumiu como técnico de **${rival.pupilName}**. Os dois foram rivais diretos — um paradoxo que só o tênis produz.`);
      return parts.join(' ');
    }
    const shadow = data.coachingEvents.find(e => e.type === 'SHADOW_CURED_BY_COACH');
    if (shadow) {
      parts.push(`Com o trabalho mental de **${shadow.coachName}**, **${shadow.playerName}** finalmente superou a sombra que o assombrava. Uma cura rara.`);
      return parts.join(' ');
    }
  }

  return parts.join(' ') || null;
}

function buildStats(data) {
  if (data.totalMatches > 0 && data.totalTournaments > 0 && Math.random() > 0.35) {
    return fill(pick(PHRASES.numericSummary), { matches: data.totalMatches, tournaments: data.totalTournaments });
  }
  return null;
}

function sectionsToText(sections) {
  return sections.map(s => s.text).join(' ');
}

function buildHighlightTags(data) {
  const tags = [];
  if (data.calendarSlam) tags.push('🏆 Calendar Slam');
  else if (data.grandSlamDominatorCount >= 2) tags.push(`⭐ ${data.grandSlamDominatorCount}× Grand Slam`);
  if (data.mastersDominator) tags.push(`💎 ${data.mastersDominator.count}× Masters`);
  if (data.rankingLeaderName) tags.push(`👑 ${data.rankingLeaderName}`);
  if (data.biggestUpset) tags.push(`💥 Upset #${data.biggestUpset.winnerRank} × #${data.biggestUpset.victimRank}`);
  if (data.topRivalry) tags.push(`⚔️ ${data.topRivalry.p1Name} × ${data.topRivalry.p2Name}`);
  if (data.alcunhasGained.length > 0) tags.push(`🎖️ "${data.alcunhasGained[0].alcunha}"`);
  data.retirements.forEach(r => { if (r.isLegend) tags.push(`🕊️ ${r.name}`); });
  if (data.debutSensation) tags.push(`🌱 ${data.debutSensation.name}`);
  if (data.surfaceDominator) {
    const s = SURFACE_LABELS[data.surfaceDominator.surface];
    if (s) tags.push(`${s.icon} ${data.surfaceDominator.name}`);
  }
  if (data.majorInjury) tags.push(`🩹 Grau ${data.majorInjury.grade}`);
  // Fase 6: coaching milestones
  if (data.coachingEvents?.some(e => e.type === 'PUPIL_SURPASSED_MASTER')) {
    const ev = data.coachingEvents.find(e => e.type === 'PUPIL_SURPASSED_MASTER');
    tags.push(`🎓 ${ev.pupilName} > mestre`);
  }
  if (data.coachingEvents?.some(e => e.type === 'RIVAL_BECOMES_COACH')) {
    tags.push('⚔️🎓 Rival vira técnico');
  }
  return tags.slice(0, 7);
}

// ── Epitáfios de carreira ────────────────────────────────────────────
const EPITAPH_TEMPLATES = [
  '{name} jogou {years} temporada{sy} no circuito principal e não saiu com a mochila vazia. {titles} título{st}, pico de #{peak}. Cada vitória foi construída — nenhuma simplesmente aconteceu.',
  '{name}: {years} ano{sy}, {titles} título{st}, pico #{peak}. As partidas que definiriam uma carreira inteira, ele jogou mais de uma vez — e venceu mais do que as probabilidades sugeriam.',
  'A carreira de {name} existe em números: {years} temporada{sy}, {titles} título{st}, pico #{peak}. Os números são precisos. A carreira vai além deles.',
  '{name} durou {years} ano{sy} neste circuito — tempo suficiente para construir o tipo de legado que o ranking registra mas não explica. {titles} título{st}. Pico #{peak}.',
];
const EPITAPH_LEGEND_TEMPLATES = [
  'Há poucas formas de resumir o que {name} representou para este circuito. {years} temporada{sy}. {titles} título{st}. Pico #{peak}. Uma geração inteira de adversários que cresceram tentando ser o que ele era — e entenderam no processo que esse não é o objetivo certo.',
  '{name} entrou no circuito e nunca ficou longe do topo tempo suficiente para se tornar ausência. {titles} título{st} em {years} ano{sy}, pico #{peak}. O espaço que {name} deixa não vai ser preenchido — vai ser sucedido. Que é diferente.',
  'Quando {name} encerrou a carreira, o circuito fez o único tributo que importa: silêncio. {titles} título{st}. {years} temporada{sy}. Pico #{peak}. Uma presença que vai continuar sendo citada enquanto houver comparações a fazer neste esporte.',
  '{name} — {years} ano{sy}, {titles} título{st}, pico #{peak}. O tipo de carreira que o circuito vai usar como referência por décadas, e que os adversários vão lembrar com a mistura específica de respeito e alívio que só o fim de uma era produz.',
];

export function generatePlayerEpitaph(name, careerSummary) {
  const { yearsActive = 0, totalTitles = 0, peakRanking = 99 } = careerSummary || {};
  const isLegend = totalTitles >= 5 || peakRanking <= 3;
  const tpls = isLegend ? EPITAPH_LEGEND_TEMPLATES : EPITAPH_TEMPLATES;
  return fill(pick(tpls), {
    name, years: yearsActive, sy: s(yearsActive),
    titles: totalTitles, st: s(totalTitles), peak: peakRanking,
  });
}

export function generateFlashback(entry, currentYear) {
  const ago = currentYear - entry.year;
  if (ago <= 0) return null;
  const intros = [
    `Há ${ago} ano${s(ago)}, o circuito viveu:`,
    `${ago} ano${s(ago)} atrás nesta temporada:`,
    `Memória do circuito — ${ago} ano${s(ago)} atrás:`,
    `O calendário lembra: ${ago} ano${s(ago)} atrás,`,
  ];
  const snippet = entry.sections?.[1]?.text ?? entry.text?.substring(0, 180) ?? '';
  return `${pick(intros)} ${snippet}`;
}

// ── Classe principal ─────────────────────────────────────────────────
export class ChronicleEngine {
  constructor() {
    this.chronicles  = [];   // [{year, tone, sections, text, tags, raw}]
    this.epitaphs    = {};   // playerId -> string
  }

  generateYearEntry(state) {
    const year = state.year;
    if (this.chronicles.find(c => c.year === year)) {
      return this.chronicles.find(c => c.year === year);
    }

    const raw      = collectSeasonData(state);
    const tone     = determineTone(raw);
    const sections = buildSections(raw, tone);
    const text     = sectionsToText(sections);
    const tags     = buildHighlightTags(raw);
    const headline = buildHeadline(raw, tone, year);

    const entry = { year, tone, sections, text, tags, raw, headline };
    this.chronicles.push(entry);
    this.chronicles.sort((a, b) => b.year - a.year);

    console.log(`📖 Crônica de ${year} [${tone}] — ${sections.length} seções`);
    return entry;
  }

  addPlayerEpitaph(playerId, name, careerSummary) {
    this.epitaphs[playerId] = generatePlayerEpitaph(name, careerSummary);
  }

  search(query) {
    if (!query?.trim()) return this.chronicles;
    const q = query.toLowerCase();
    return this.chronicles.filter(c =>
      c.text.toLowerCase().includes(q) ||
      c.tags.some(t => t.toLowerCase().includes(q)) ||
      String(c.year).includes(q)
    );
  }

  getFlashback(currentYear, yearsBack = [5, 10]) {
    return yearsBack.map(n => {
      const entry = this.chronicles.find(c => c.year === currentYear - n);
      return entry ? { ...entry, yearsAgo: n, flashText: generateFlashback(entry, currentYear) } : null;
    }).filter(Boolean);
  }

  getTopUpsets(limit = 5) {
    return this.chronicles
      .filter(c => c.raw?.biggestUpset?.margin)
      .sort((a, b) => (b.raw.biggestUpset?.margin ?? 0) - (a.raw.biggestUpset?.margin ?? 0))
      .slice(0, limit)
      .map(c => ({ year: c.year, ...c.raw.biggestUpset }));
  }

  getTopDominators(limit = 5) {
    return this.chronicles
      .filter(c => c.raw?.mostTitlesPlayer?.count >= 2)
      .sort((a, b) => (b.raw.mostTitlesPlayer?.count ?? 0) - (a.raw.mostTitlesPlayer?.count ?? 0))
      .slice(0, limit)
      .map(c => ({ year: c.year, playerName: c.raw.mostTitlesPlayer.name, count: c.raw.mostTitlesPlayer.count }));
  }

  getTopRivalries() {
    const map = {};
    this.chronicles.forEach(c => {
      if (!c.raw?.topRivalry) return;
      const r = c.raw.topRivalry;
      const key = [r.p1Name, r.p2Name].sort().join(' × ');
      if (!map[key]) map[key] = { key, p1: r.p1Name, p2: r.p2Name, appearances: 0, type: r.type };
      map[key].appearances++;
    });
    return Object.values(map).sort((a, b) => b.appearances - a.appearances).slice(0, 8);
  }

  getCalendarSlams() {
    return this.chronicles.filter(c => c.raw?.calendarSlam)
      .map(c => ({ year: c.year, name: c.raw.grandSlamDominatorName }));
  }

  toJSON() {
    return { chronicles: this.chronicles, epitaphs: this.epitaphs, sponsorEvents: this._sponsorEvents ?? [] };
  }

  fromJSON(data) {
    if (!data) return;
    this.chronicles = data.chronicles ?? [];
    this.epitaphs   = data.epitaphs   ?? {};
    this._sponsorEvents = data.sponsorEvents ?? [];
    this.chronicles.forEach(c => {
      if (!c.sections && c.text) c.sections = [{ type: 'main', text: c.text }];
    });
  }

  // Retorna os marcos de patrocínio de um jogador específico
  getSponsorTimeline(playerId) {
    return (this._sponsorEvents ?? []).filter(e => e.playerId === playerId);
  }

  // Adiciona eventos de patrocínio (chamado pelo runSponsorshipWindow)
  addSponsorEvents(events) {
    this._sponsorEvents = [...(this._sponsorEvents ?? []), ...(events ?? [])];
  }
}

export default ChronicleEngine;
