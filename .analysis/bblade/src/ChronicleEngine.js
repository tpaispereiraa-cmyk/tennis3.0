// ============================================================
// 📖 CHRONICLE ENGINE v2.0 — BBlade Universe
// Motor de memória narrativa épica do circuito
// "O universo que tem história, peso e alma"
// ============================================================

// ── Tons narrativos ──────────────────────────────────────────
export const TONES = {
  EPIC:         'EPIC',
  TRAGIC:       'TRAGIC',
  UNCERTAIN:    'UNCERTAIN',
  TRANSITIONAL: 'TRANSITIONAL',
  PRODIGY:      'PRODIGY',
  DYNASTIC:     'DYNASTIC',   // domínio absoluto por múltiplos anos
};

// ── Voz narrativa por tom ────────────────────────────────────
const VOICE = {
  EPIC: {
    opening: [
      'O calendário de {year} não pediu licença para ninguém.',
      'Há anos que ficam na memória do circuito não pelo que prometeram, mas pelo que entregaram. {year} foi um deles.',
      'Ninguém saiu de {year} como entrou.',
      'O circuito assistiu a {year} com aquela mistura de incredulidade e reverência que só os anos verdadeiramente históricos provocam.',
      'Quando o pó baixou em dezembro de {year}, o que restou foi silêncio — o tipo de silêncio que vem depois de algo enorme.',
      'Décadas depois ainda se falará de {year}. Não há outra forma de explicar o que aconteceu.',
      'Poucos anos na história do circuito carregam o peso de {year}.',
    ],
    bridge: [
      'A narrativa do ano não precisou de explicação.',
      'O circuito não ofereceu resistência.',
      'Os números contam parte da história. O resto ficou no ar de cada arena.',
      'Quem estava presente sabe que assistiu a algo que não se repete com facilidade.',
    ],
    closing: [
      'A história registra. O circuito respeita.',
      'A era está declarada — e o circuito ainda processa o que acabou de testemunhar.',
      'Não há discussão. Apenas reverência.',
      'Quem tentou explicar o que aconteceu em {year} ainda está tentando.',
      'O circuito não volta ao que era antes de {year}.',
      'Alguns anos mudam o que se espera do próximo. {year} foi definitivamente um deles.',
    ],
  },

  DYNASTIC: {
    opening: [
      'O circuito havia se acostumado com a ideia. Mas ver acontecer, de novo, é diferente de esperar que aconteça.',
      '{year} não surpreendeu quem conhecia os padrões. Surpreendeu por quanto foi mais do que o esperado.',
      'Havia uma pergunta no início de {year}: alguém vai interromper isso? A resposta chegou em dezembro.',
      'A repetição não diminuiu o que aconteceu em {year}. Se algo, tornou mais impressionante.',
      'Não é o mesmo que da primeira vez. A segunda dominação tem um peso diferente. Mais pesado.',
      'O circuito começou {year} tentando encontrar a resposta. Terminou sabendo que ainda não tem uma.',
    ],
    bridge: [
      'A consistência é a forma mais difícil de dominância — e a mais assustadora.',
      'Ganhar uma vez é talento. Ganhar de novo é estratégia. Ganhar de novo é outra coisa completamente.',
      'O circuito aprendeu a esperar. Mas esperar não é o mesmo que aceitar.',
    ],
    closing: [
      'A pergunta para {nextyear} é a mesma de sempre: alguém vai interromper isso?',
      'O circuito vai entrar em {nextyear} com a mesma dúvida de sempre. E uma suspeita crescente de que a resposta pode ser não.',
      'Quando a dominância se repete, ela deixa de ser surpresa e vira pressão. Para todo mundo.',
      'Dynastias não duram para sempre. Mas enquanto duram, são absolutas.',
    ],
  },

  TRAGIC: {
    opening: [
      '{year} será lembrado menos pelo que aconteceu e mais pelo que terminou.',
      'O circuito encerrou {year} mais silencioso do que começou.',
      'Há anos que deixam ausências. {year} foi um deles.',
      'Nem sempre os anos mais importantes são os mais vistosos. {year} provou isso à força.',
      'O que {year} tirou do circuito não pode ser calculado em rankings.',
      'Alguns anos marcam pelo que acrescentam. {year} marcou pelo que retirou.',
      'A dor de {year} não apareceu nos placares. Apareceu nas cadeiras vazias.',
    ],
    bridge: [
      'E mesmo assim o circuito continuou, como sempre continua.',
      'O espetáculo segue — mas com uma consciência diferente do que foi deixado para trás.',
      'O calendário não pausa para o luto. O circuito aprendeu isso cedo.',
    ],
    closing: [
      'Uma geração terminou.',
      'O circuito continuará. Mas diferente.',
      'Vai demorar para preencher esse espaço.',
      'Quem os viu no auge sabe o que foi perdido.',
      'O próximo capítulo terá que ser escrito por outras mãos.',
      'O circuito segue. Mas algo que era seu foi embora junto.',
    ],
  },

  UNCERTAIN: {
    opening: [
      'Ninguém saiu de {year} com certeza.',
      '{year} foi o tipo de ano que especialistas evitam usar como exemplo.',
      'Pergunte a qualquer veterano o que foi {year} e ele vai hesitar antes de responder.',
      'O circuito encerrou {year} sem consenso sobre o que acabou de acontecer.',
      'Se o objetivo de {year} era clareza, foi um fracasso retumbante. Para a narrativa, foi tudo.',
      'O manual não serviu de nada em {year}. Foi reescrito antes mesmo de secar a tinta.',
    ],
    bridge: [
      'E ninguém no vestiário apostaria no resultado.',
      'Os algoritmos erraram, os especialistas erraram, todos erraram.',
      'A hierarquia do ranking virou papel amassado no momento que mais importava.',
    ],
    closing: [
      'O circuito não sabe se está assistindo o começo de uma nova era ou o fim de uma velha.',
      'A resposta virá em {nextyear}.',
      'A dúvida é o estado natural do circuito agora. E é exatamente por isso que vale a pena assistir.',
      'Ninguém sabe o que esperar. Esse é exatamente o tipo de circuito que não deixa ninguém dormir bem.',
      'O próximo capítulo promete mais respostas do que perguntas. Talvez.',
    ],
  },

  TRANSITIONAL: {
    opening: [
      'Nem todo ano é para os livros.',
      '{year} foi o tipo de temporada que só faz sentido olhando para trás.',
      'O circuito respirou fundo em {year} antes de correr de novo.',
      'Há anos que preparam os próximos. {year} foi um deles — e ficará claro isso mais tarde.',
      'A história direta é a mais honesta: {year} foi um ano de consolidação.',
      'Não havia um protagonista óbvio em {year}. Havia candidatos. Havia potencial. Havia movimento.',
    ],
    bridge: [
      'Nos bastidores, os alicerces foram construídos em silêncio.',
      'A próxima geração começou a revelar suas cartas — discretamente, mas revelou.',
      'Quem souber ler as entrelinhas de {year} verá o que está sendo construído.',
    ],
    closing: [
      'Não foi um ano para os livros. Foi um ano para preparar os próximos.',
      'A narrativa começa agora.',
      'O terreno está preparado. O circuito só precisa de alguém para acender a faísca.',
      'Esses anos silenciosos costumam preceder os mais barulhentos.',
      'O palco está montado. Falta o protagonista aparecer.',
    ],
  },

  PRODIGY: {
    opening: [
      'O circuito conhece o roteiro do talento: anos de ascensão silenciosa, depois explosão. Em {year}, um nome quebrou o roteiro.',
      '{year} foi o ano em que o circuito teve que rever suas projeções.',
      'Toda geração produz um nome que muda a velocidade das coisas. {year} pode ter apresentado o seu.',
      'Os veteranos viram. Os analistas mediram. Ninguém chegou a um consenso — exceto que algo havia mudado em {year}.',
      'Há estreias e há chegadas. {year} teve uma chegada.',
      'O circuito estava esperando por isso. Só não esperava que fosse tão cedo.',
    ],
    bridge: [
      'E o mais assustador: parecia fácil.',
      'O que ninguém esperava era que a curva de aprendizado seria tão curta.',
      'Os veteranos responderam como sempre respondem ao talento bruto: com respeito calculado e atenção redobrada.',
    ],
    closing: [
      'O que {year} plantou, {nextyear} vai começar a colher.',
      'O circuito segue. Mas com um nome novo perto das primeiras páginas.',
      'A história começa aqui — ou aqui começa a parte mais interessante dela.',
      'O talent tem prazo? O circuito de {nextyear} vai tentar descobrir.',
      'Pressa é inimiga do talento. Mas às vezes o talento não tem paciência para esperar.',
    ],
  },
};

// ── Templates de eventos específicos ────────────────────────
const PHRASES = {

  // ── PREMIER ──────────────────────────────────────────────
  premierTitle: [
    'ergueu o troféu no {t} e colocou o circuito em alerta',
    'conquistou o {t} e mostrou que estava pronto para a conversa de grande nome',
    'venceu o {t}, e quem acompanhou o torneio entendeu que não foi sorte',
    'fechou o {t} com o título — e com ele, uma afirmação de propósito',
    'ganhou o {t} de um jeito que torneios Premier raramente são ganhos: com autoridade',
  ],
  premierDominance: [
    'varreu os Premiers do ano e transformou esses torneios em campo de provas próprio',
    'conquistou {n} título{s} Premier e estabeleceu um padrão que o calendário vai demorar a superar',
    'fez dos torneios Premier a base de um ano que os rankings ainda estão tentando processar',
    'somou {n} Premier{s} e deixou a mensagem clara: o calendário médio não é suficiente para ele',
  ],

  // ── MASTERS ──────────────────────────────────────────────
  mastersTitle: [
    'levantou o troféu no {t} e o circuito tomou nota',
    'dominou o {t} e mostrou que o topo do ranking não é acidente',
    'venceu o {t} — o tipo de título que consolida mais do que acrescenta',
    'encerrou o {t} com o título, e os números de desempenho foram ainda mais impressionantes que o resultado',
    'ganhou o {t} de um jeito que deixou poucos argumentos para quem duvidava',
  ],
  mastersDominance: [
    'varreu os Masters do calendário com uma consistência que tirou o sono dos adversários',
    'ganhou {n} Masters e construiu um argumento sólido para qualquer debate sobre o melhor do ano',
    'transformou os Masters em residência própria — {n} títulos, zero decepções',
    'coletou {n} troféu{s} Masters como se fossem rotina. Para ele, talvez fossem',
  ],

  // ── KINGS COURT ──────────────────────────────────────────
  kingsCourtChamp: [
    'conquistou o Kings Court Finals e fechou o debate sobre o nome do ano',
    'venceu o Kings Court Finals — o título que o circuito reserva para quem foi melhor durante toda a temporada',
    'fechou a temporada com o Kings Court Finals. Não há final mais definitivo que este',
    'ergueu o troféu do Kings Court Finals e declarou o ano como seu',
    'o Kings Court Finals foi de {name} — e com ele, a autoridade simbólica sobre o calendário inteiro',
  ],
  kingsCourtRaceClose: [
    'A corrida pelo Kings Court Finals durou o ano inteiro — {p1} e {p2} nunca estiveram separados por mais do que uma vitória',
    '{p1} e {p2} protagonizaram a mais acirrada disputa pelo Kings Court dos últimos anos: cada torneio, cada ponto, cada rodada importava',
    'O Kings Court de {year} foi decidido na última semana — {p1} e {p2} chegaram ao Finals separados por uma margem que cabia numa palmada',
    'Ninguém que acompanhou a corrida pelo Kings Court em {year} vai esquecer como foi — {p1} e {p2} não deram trégua um ao outro em nenhum momento',
  ],
  kingsCourtFirst: [
    '{name} chegou ao Kings Court Finals pela primeira vez — e o circuito percebeu que esse nome vai aparecer de novo',
    'A primeira aparição de {name} no Kings Court Finals mandou um recado que não precisou de palavras',
    '{name} qualificou para o Kings Court Finals pela primeira vez, e o que aconteceu lá dentro levou meses para sair das conversas',
  ],

  // ── GRAND FINALS ─────────────────────────────────────────
  grandFinalsChamp: [
    '{name} venceu o Grand Finals e encerrou o ano com a declaração mais definitiva que o calendário oferece',
    'O Grand Finals foi de {name}. A decisão foi clara, a vitória foi merecida, o silêncio após foi absoluto',
    '{name} fechou o Grand Finals como favorito. O circuito pagou para ver — e recebeu exatamente o que esperava, em dose dupla',
    '{name} ergueu o troféu no Grand Finals e o circuito concordou, silenciosamente, que talvez não houvesse outro candidato',
  ],
  grandFinalsUpset: [
    'O Grand Finals de {year} guardou a maior surpresa para o final: {name} não era o favorito. O circuito ainda está processando',
    '{name} venceu o Grand Finals como azarão. Para quem acompanhou o ano inteiro, foi choque. Para quem acompanhou as últimas semanas, foi lógica',
    'A final do Grand Finals de {year} será citada por anos — {name} entrou como segundo melhor e saiu como o único nome que importa',
  ],

  // ── RIVALIDADES ──────────────────────────────────────────
  rivalryClassic: [
    '{p1} e {p2} protagonizaram {n} encontros que pararam o circuito — e nenhum deles foi decidido com facilidade',
    'A rivalidade entre {p1} e {p2} atingiu {n} confrontos no ano. O placar final não traduz o que aconteceu dentro das arenas',
    'Quando {p1} e {p2} se encontraram, o circuito parou. Isso aconteceu {n} vezes em {year}, e cada vez o resultado foi diferente',
    '{p1} contra {p2} se tornou o confronto que o calendário esperava e o circuito não se cansava de ver — {n} vezes no ano, e contando',
  ],
  rivalryDomination: [
    '{p1} respondeu a {p2} com a frieza de quem sabe o resultado antes de a batalha começar',
    '{p1} construiu uma vantagem sobre {p2} que o ranking ainda não reflete completamente',
    'A questão de {p1} versus {p2} foi resolvida em {year} com a clareza que apenas os números brutais podem dar',
    'O circuito esperava equilíbrio entre {p1} e {p2}. O que encontrou foi a afirmação de quem manda',
  ],
  rivalryEraClash: [
    '{p1} e {p2} representam coisas diferentes para o circuito — eras diferentes, filosofias diferentes. Cada confronto entre eles é um debate que o calendar não resolve',
    'Quando {p1} enfrenta {p2}, o circuito não vê só um duelo — vê o passado tentando manter o passo com o futuro, ou o futuro tentando provar que já chegou',
    'A tensão entre {p1} e {p2} vai além dos resultados: é a conversa entre o que o circuito foi e o que está se tornando',
  ],
  rivalryGrudge: [
    '{p1} e {p2} transformaram o circuito num campo de guerra pessoal — cada ponto, cada set, cada olhar carregava mais do que as regras preveem',
    'Não há palavra melhor que rancor para descrever o que {p1} e {p2} construíram ao longo de {year}. O circuito assistiu desconfortável e fascinado',
    'A batalha entre {p1} e {p2} transcendeu os resultados e entrou no território das questões não resolvidas',
  ],
  rivalryFinalsCurse: [
    'O destino parece ter um plano para {p1} e {p2}: colocá-los frente a frente quando tudo importa. {year} confirmou o padrão',
    '{p1} e {p2} se encontraram na final mais uma vez. O circuito não estava mais surpreso — estava expectante',
    'Se existe uma maldição das finais no circuito, ela tem dois nomes: {p1} e {p2}',
  ],

  // ── UPSETS ───────────────────────────────────────────────
  upset: [
    '#{rank} no mundo, {winner} eliminou o #${victimRank} do ranking no {tournament} e parou o circuito no meio da rodada',
    'O upset do ano foi protagonizado por {winner} (#{rank}), que derrubou o #${victimRank} do ranking e redefiniu o que era esperado daquele torneio',
    '{winner} não deveria estar naquele estágio do torneio — ou deveria? O #${victimRank} pagou caro por subestimá-lo',
    'Quando {winner} (#{rank}) eliminou o #${victimRank}, os scouts precisaram rever suas planilhas, os analistas precisaram rever suas previsões, e o circuito precisou rever o que achava que sabia',
    'O maior upset de {year}: {winner}, classificado #{rank}, retirou o #${victimRank} do torneio sem cerimônia e sem aviso',
  ],

  // ── RECORDES ─────────────────────────────────────────────
  winStreak: [
    '{name} construiu uma sequência de {streak} vitórias seguidas que o circuito ainda está processando — o tipo de dominância que redefine o que é possível',
    'A sequência de {streak} vitórias de {name} redefiniu o que o circuito achava que sabia sobre consistência',
    '{streak} vitórias seguidas. {name} passou pelo calendário de {year} sem perder o fio, e o circuito ficou sem resposta',
    'A maior sequência do ano foi de {name}: {streak} vitórias sem interrupção. Quem tentou parar saiu derrotado',
  ],
  titleMilestone: [
    '{name} alcançou o título de número {milestone} da carreira — um número que a maioria dos profissionais nunca chega perto de ver',
    'O {milestone}º título de {name} chegou em {year} e veio com o peso de uma carreira inteira construída para chegar lá',
    'Quando {name} ergueu o {milestone}º troféu, o circuito parou para contar. O número diz tudo — e não diz nada sobre o que custou',
    '{name} cruzou a marca de {milestone} títulos na carreira. Uma linha que pouquíssimos nomes no histórico do circuito alcançaram',
  ],
  titleAccumulation: [
    '{name} venceu {n} torneio{s} na temporada — uma colheita que faria qualquer período se chamar dominante',
    'Com {n} título{s} no ano, {name} construiu o melhor currículo de temporada individual dos últimos anos',
    '{name} não se contentou com um título. Pegou {n}. E cada um veio com mais autoridade que o anterior',
    'A temporada de {name} em números: {n} título{s}, zero negligências. O circuito reconheceu',
  ],

  // ── PRODÍGIOS ─────────────────────────────────────────────
  debutFinal: [
    '{name} chegou ao circuito principal há menos de um ano e já estava numa Final. O calendário não esperava por isso',
    'A chegada de {name} ao circuito principal veio com um bônus que ninguém havia previsto: uma Final na temporada de estreia',
    'Prodigios chegam cedo. {name} provou que cedo pode ser muito mais cedo do que o circuito estava preparado para ver',
    '{name} não apenas estreou no circuito principal — chegou à Final e mandou um recado que os adversários ainda estão digerindo',
  ],
  debutTitle: [
    '{name} estreou no circuito principal e ganhou um título antes que o circuito aprendesse a soletrar o nome',
    'A estreia de {name} no circuito principal incluiu um campeonato. O circuito ficou em silêncio por um momento antes de perceber o que havia visto',
    '{name} chegou à temporada de estreia com um título embaixo do braço. Isso não deveria ser possível. Foi',
    'Quando {name} levantou o troféu de estreia, o circuito teve a desconfortável sensação de que ia ver muito mais disso',
  ],
  debutImpression: [
    '{name} chegou ao circuito principal e fez o suficiente para garantir que o circuito não esquecerá o nome — nem essa temporada, nem as próximas',
    'A estreia de {name} no circuito principal foi discreta em resultados mas barulhenta nos vestiários. Os números mentem; a impressão não',
    'Entre os destaques de {year}, a chegada de {name} ao circuito principal pode ser a mais importante a longo prazo',
    '{name} estreou no circuito principal. O circuito notou, discretamente, como sempre nota os que vão importar mais tarde',
  ],

  // ── ASCENSÃO E QUEDA ─────────────────────────────────────
  rankingRise: [
    '{name} subiu {gain} posições no ranking em {year} — de #{from} para #{to}. O circuito não estava pronto para essa velocidade',
    'A ascensão de {name} no ranking em {year} foi o tipo que analistas marcam em azul nos gráficos: de #{from} para #{to}, sem pausa',
    '{name} encerrou {year} no #{to} do ranking. No início do ano, estava em #{from}. O intervalo representa um torneio inteiro de mudanças',
    'De #{from} para #{to} em um ano: a escalada de {name} no ranking de {year} não foi silenciosa — foi a mais barulhenta da temporada',
  ],
  rankingFall: [
    '{name} começou {year} no #{from} do ranking e terminou no #{to}. A queda foi rápida, foi dolorosa, e o circuito assistiu em silêncio',
    'O que aconteceu com {name} em {year} serve de lembrete: o circuito não espera. De #{from} para #{to} em doze meses',
    'A temporada de {name} em {year} foi um estudo em colapso de expectativas. O ranking registrou a queda de #{from} para #{to}. O vestiário registrou o resto',
    '{name} encerrou {year} no #{to} do ranking — #{gone} posições abaixo do que era no começo. Há histórias que o ranking não conta, mas esse número exige uma',
  ],

  // ── APOSENTADORIAS ────────────────────────────────────────
  retirement: [
    '{name} se aposentou. {titles} título{st}, {years} temporada{sy} no circuito principal — e uma lista de adversários que sabem o que é enfrentá-lo',
    '{name} pendurou as luvas após {years} ano{sy}. O número de títulos ({titles}) não conta tudo. Nunca conta',
    '{name} se despediu sem cerimônia excessiva. {titles} título{st}. {years} ano{sy}. Uma carreira inteira construída partida por partida',
    'O adeus de {name} ao circuito chegou após {years} temporada{sy} e {titles} título{st}. Quem jogou contra ele entende o que esses números escondem',
  ],
  retirementLegend: [
    'O adeus de {name} ao circuito foi o evento de {year} que ninguém queria ver chegar. {titles} título{st}, {years} ano{sy}, e uma passagem pelo topo que entrou no cânone do circuito',
    '{name} disse adeus. O silêncio que se seguiu foi o maior tributo que o circuito pôde oferecer. {titles} título{st}. {years} temporada{sy}. Um legado que vai levar décadas para ser ultrapassado',
    'Quando {name} anunciou a aposentadoria, o circuito entendeu que uma era terminou junto. {titles} título{st} em {years} temporada{sy} — e uma lista de adversários que nunca venceram da forma que precisavam',
    '{name} se aposentou e levou consigo uma parte do que o circuito era. {titles} título{st}. {years} ano{sy}. Pico de #{peak}. Os números existem. O que {name} representava não cabe em números',
  ],
  retirementSurprise: [
    '{name} anunciou a aposentadoria em {year} sem aviso suficiente. O circuito ficou sem resposta. {titles} título{st}, {years} temporada{sy}',
    'A aposentadoria de {name} chegou antes do que o circuito esperava. {titles} título{st} em {years} ano{sy} — e a sensação de que havia mais por vir',
    'Ninguém previa o adeus de {name} em {year}. O circuito havia calculado mais algumas temporadas. O cálculo estava errado',
  ],

  // ── ERAS ─────────────────────────────────────────────────
  eraDeclared: [
    'A Era {name} foi oficialmente declarada — e o circuito vai demorar a absorver o que isso significa',
    'O circuito passou a funcionar em torno de {name}. Analistas já têm um nome para isso. Os resultados confirmam',
    'O que restava de dúvida foi varrido: a Era {name} é real, é agora, e o calendário vai ter que se adaptar',
    'Quando analistas começaram a chamar de Era {name}, alguns hesitaram. Em {year}, ninguém mais hesitou',
  ],
  eraEnd: [
    'A Era {name} chega ao fim após {seasons} temporada{ss}. O circuito não vai esquecer facilmente o que foi construído nesse período',
    'Após {seasons} ano{ss} de domínio, a Era {name} se encerra. O que fica é um padrão que vai ser comparado por muito tempo',
    'O circuito oficialmente virou a página da Era {name} em {year} — e já sente o peso do que essa virada representa',
    '{seasons} temporada{ss} depois, a Era {name} é história. O tipo de história que define o que o circuito espera de um legado',
  ],

  // ── SUMÁRIO ESTATÍSTICO ───────────────────────────────────
  numericSummary: [
    'No balanço: {matches} partidas em {tournaments} torneios.',
    'A temporada registrou {matches} confrontos ao longo de {tournaments} torneios.',
    '{tournaments} torneios. {matches} batalhas. O calendário não poupou ninguém.',
    'O circuito contou: {matches} partidas, {tournaments} torneios, uma temporada que não deixou espaço para respirar.',
  ],
};

// ── Utilitários ───────────────────────────────────────────────
function pick(arr) {
  if (!arr || arr.length === 0) return '';
  return arr[Math.floor(Math.random() * arr.length)];
}
function s(n) { return n !== 1 ? 's' : ''; }
function fill(template, vars) {
  if (!template) return '';
  return template.replace(/\{(\w+)\}/g, (_, k) => vars[k] !== undefined ? vars[k] : `{${k}}`);
}
function playerName(um, playerId) {
  if (playerId === null || playerId === undefined) return 'Desconhecido';
  if (um?.players?.[playerId]) return um.players[playerId].name;
  // Also check TEAMS-based lookup
  if (um?.playerHistories) {
    // Try via TEAMS array
    const teams = um?.getTeamById?.(playerId);
    if (teams?.name) return teams.name;
  }
  return `Jogador ${playerId}`;
}

// ── Coleta de dados da temporada ──────────────────────────────
function collectSeasonData(um, year) {
  const data = {
    year,

    // Kings Court
    kingsCourtChampName: null,
    kingsCourtRaceP1: null,
    kingsCourtRaceP2: null,
    kingsCourtRaceClose: false,
    kingsCourtFirstTimer: null,

    // Season leader
    seasonPointsLeaderName: null,
    seasonPointsLeaderId: null,

    // Grand Finals
    grandFinalsChampName: null,
    grandFinalsRunnerUpName: null,
    grandFinalsUpset: false,

    // Titles by tier
    premierWinners: [],   // [{id, name, tournament}]
    mastersWinners: [],   // [{id, name, tournament}]
    grandSlamWinners: [], // [{id, name, tournament}]

    // Domination
    mostTitlesPlayer: null,  // {name, id, count}
    premierDominator: null,  // {name, count}
    mastersDominator: null,  // {name, count}
    grandSlamDominatorName: null,
    grandSlamDominatorCount: 0,
    grandSlamSweep: false,

    // Upset
    biggestUpset: null,

    // Rivalries
    topRivalry: null,
    topRivalryType: null,
    topRivalryTypeName: null,

    // Retirements
    retirements: [],

    // Promotions / Debuts
    promotedThisYear: [],
    debutSensation: null, // {name, achievement: 'TITLE'|'FINAL'|'SEMIFINAL'}

    // Records
    winStreakRecord: null,  // {name, streak}
    titleMilestones: [],    // [{name, milestone}]
    titleAccumulator: null, // {name, count} - won most titles this year across all tiers

    // Ranking movement
    biggestRiser: null,  // {name, fromRank, toRank, gain}
    biggestFaller: null, // {name, fromRank, toRank, loss}

    // Eras
    eraName: null,
    eraStarted: false,
    eraEnded: false,
    eraEndedName: null,
    eraEndedSeasons: 0,

    // Stats
    totalMatches: 0,
    totalTournaments: 0,
    numChampions: 0,

    // Context
    topRankingName: null,
    consecutiveDominator: false, // same person dominated year before too
  };

  try {
    // ── Season points leader ──
    const seasonRanking = um.getSeasonRanking?.() || [];
    if (seasonRanking.length > 0) {
      const leader = seasonRanking[0];
      data.seasonPointsLeaderId = leader.playerId;
      data.seasonPointsLeaderName = playerName(um, leader.playerId);
    }

    // ── BBP top ranking ──
    const bbp = um.getBBPRanking?.() || [];
    if (bbp.length > 0) data.topRankingName = playerName(um, bbp[0].playerId);

    // ── All matches this year (use 'season' field, not date.year) ──
    const allMatches = (um.matchHistory || []).filter(m => m?.season === year);
    data.totalMatches = allMatches.length;

    // ── Unique tournaments ──
    const tournamentsThisYear = new Set();
    allMatches.forEach(m => { if (m.tournament) tournamentsThisYear.add(m.tournament); });
    data.totalTournaments = tournamentsThisYear.size;

    // ── Finals this year (round === 'F') ──
    const finalsThisYear = allMatches.filter(m =>
      m.round === 'F' || m.round === 'FINAL' || m.round === 'CHAMPION'
    );

    // ── Title tracking by tier ──
    const titleCountByPlayer = {};
    finalsThisYear.forEach(m => {
      const wId = m.winnerId;
      const lId = m.player1Id === wId ? m.player2Id : m.player1Id;
      const wName = playerName(um, wId);
      const lName = playerName(um, lId);
      const tier = (m.tier || '').toUpperCase();
      const tournName = m.tournament || '';

      titleCountByPlayer[wId] = (titleCountByPlayer[wId] || 0) + 1;

      const entry = { id: wId, name: wName, tournament: tournName, loserId: lId, loserName: lName };

      if (tier === 'GRAND_SLAM') {
        data.grandSlamWinners.push(entry);
      } else if (tier === 'PREMIER') {
        data.premierWinners.push(entry);
      } else if (tier === 'MASTERS') {
        data.mastersWinners.push(entry);
      } else if (tier === 'GRAND_FINALS') {
        data.grandFinalsChampName = wName;
        data.grandFinalsRunnerUpName = lName;
      }
    });

    // ── Kings Court champion ──
    const kc = um.getKingsCourtChampion?.();
    if (kc !== null && kc !== undefined) {
      // Verify it's this year
      const kcHistory = um.playerHistories?.get(kc);
      const kcTitle = kcHistory?.titles?.detailedList?.find(t =>
        (t.tournamentType === 'KINGS_COURT' || t.tournamentTier === 'KINGS_COURT') && t.year === year
      );
      if (kcTitle) {
        data.kingsCourtChampName = playerName(um, kc);
        // Check if first-time KC qualifier
        const prevKCTitles = (kcHistory?.titles?.detailedList || []).filter(t =>
          (t.tournamentType === 'KINGS_COURT' || t.tournamentTier === 'KINGS_COURT') && t.year < year
        );
        if (prevKCTitles.length === 0) data.kingsCourtFirstTimer = data.kingsCourtChampName;
      }
    }

    // ── Kings Court race (was it close?) ──
    if (seasonRanking.length >= 2) {
      const top1 = seasonRanking[0];
      const top2 = seasonRanking[1];
      const gap = (top1.points || 0) - (top2.points || 0);
      const threshold = (top1.points || 1) * 0.08; // within 8%
      if (gap <= threshold && top1.points > 0) {
        data.kingsCourtRaceClose = true;
        data.kingsCourtRaceP1 = playerName(um, top1.playerId);
        data.kingsCourtRaceP2 = playerName(um, top2.playerId);
      }
    }

    // ── Grand Slam domination ──
    const gsCounts = {};
    data.grandSlamWinners.forEach(w => {
      gsCounts[w.id] = (gsCounts[w.id] || 0) + 1;
    });
    const topGSId = Object.keys(gsCounts).sort((a, b) => gsCounts[b] - gsCounts[a])[0];
    if (topGSId) {
      data.grandSlamDominatorCount = gsCounts[topGSId];
      data.grandSlamDominatorName = playerName(um, parseInt(topGSId));
      if (data.grandSlamDominatorCount >= data.grandSlamWinners.length && data.grandSlamWinners.length >= 3) {
        data.grandSlamSweep = true;
      }
    }

    // ── Premier domination ──
    const premierCounts = {};
    data.premierWinners.forEach(w => { premierCounts[w.id] = (premierCounts[w.id] || 0) + 1; });
    const topPremierId = Object.keys(premierCounts).sort((a, b) => premierCounts[b] - premierCounts[a])[0];
    if (topPremierId && premierCounts[topPremierId] >= 2) {
      data.premierDominator = { name: playerName(um, parseInt(topPremierId)), count: premierCounts[topPremierId] };
    }

    // ── Masters domination ──
    const mastersCounts = {};
    data.mastersWinners.forEach(w => { mastersCounts[w.id] = (mastersCounts[w.id] || 0) + 1; });
    const topMastersId = Object.keys(mastersCounts).sort((a, b) => mastersCounts[b] - mastersCounts[a])[0];
    if (topMastersId && mastersCounts[topMastersId] >= 2) {
      data.mastersDominator = { name: playerName(um, parseInt(topMastersId)), count: mastersCounts[topMastersId] };
    }

    // ── Most titles this year (across all tiers) ──
    const sortedByTitles = Object.entries(titleCountByPlayer).sort((a, b) => b[1] - a[1]);
    if (sortedByTitles.length > 0) {
      const [topId, topCount] = sortedByTitles[0];
      if (topCount >= 2) {
        data.mostTitlesPlayer = { id: parseInt(topId), name: playerName(um, parseInt(topId)), count: topCount };
      }
      if (topCount >= 3) {
        data.titleAccumulator = data.mostTitlesPlayer;
      }
    }

    // ── Biggest upset (from finals: winner ranked lower than loser) ──
    if (bbp.length > 0) {
      const rankMap = {};
      bbp.forEach((entry, i) => { rankMap[entry.playerId] = i + 1; });
      let biggestUpsetMargin = 0;
      finalsThisYear.forEach(m => {
        const wId = m.winnerId;
        const lId = m.player1Id === wId ? m.player2Id : m.player1Id;
        const wRank = rankMap[wId] || 99;
        const lRank = rankMap[lId] || 99;
        const margin = wRank - lRank;
        if (margin >= 10 && margin > biggestUpsetMargin) {
          biggestUpsetMargin = margin;
          data.biggestUpset = {
            winnerName: playerName(um, wId),
            winnerRank: wRank,
            victimRank: lRank,
            tournamentName: m.tournament || '',
            tournamentTier: m.tier || '',
            margin,
          };
          // Check if Grand Finals upset
          if ((m.tier || '').toUpperCase() === 'GRAND_FINALS') {
            data.grandFinalsUpset = true;
          }
        }
      });
    }

    // ── Top rivalry ──
    if (um.rivalrySystem?.rivalries) {
      // Find most active rivalry this year
      const rivalriesArr = [];
      for (const [, r] of um.rivalrySystem.rivalries.entries()) {
        if (r.totalMatches >= 2) rivalriesArr.push(r);
      }
      // Sort by recency + intensity
      const thisYearActive = rivalriesArr.filter(r => r.lastYear === year || r.lastSeason === year);
      const toSort = thisYearActive.length > 0 ? thisYearActive : rivalriesArr;
      const top = toSort.sort((a, b) => {
        const aScore = (a.intensity || 0) + a.totalMatches * 0.1;
        const bScore = (b.intensity || 0) + b.totalMatches * 0.1;
        return bScore - aScore;
      })[0];

      if (top) {
        const p1Name = playerName(um, top.p1Id);
        const p2Name = playerName(um, top.p2Id);
        if (p1Name && p2Name) {
          const dominated = Math.abs(top.p1Wins - top.p2Wins) > top.totalMatches * 0.35;
          data.topRivalry = {
            p1Id: top.p1Id, p1Name, p1Wins: top.p1Wins,
            p2Id: top.p2Id, p2Name, p2Wins: top.p2Wins,
            total: top.totalMatches, dominated,
            dominatorName: top.p1Wins > top.p2Wins ? p1Name : p2Name,
            submissiveName: top.p1Wins > top.p2Wins ? p2Name : p1Name,
            type: top.type || 'CLASSIC',
            status: top.status || 'ACTIVE',
          };
          data.topRivalryType = top.type || 'CLASSIC';
          data.topRivalryTypeName = top.type || 'CLASSIC';
        }
      }
    }

    // ── Retirements this year ──
    if (um.retirementSystem?.retirementHistory) {
      um.retirementSystem.retirementHistory
        .filter(r => r.year === year)
        .forEach(r => {
          data.retirements.push({
            name: r.playerName,
            titles: r.careerSummary?.totalTitles || 0,
            years: r.careerSummary?.yearsActive || 0,
            peakRanking: r.careerSummary?.peakRanking || 99,
            isLegend: r.type === 'LEGENDARY' || (r.careerSummary?.totalTitles || 0) >= 5,
            isSurprise: r.type === 'EARLY',
          });
        });
    }

    // ── Title milestones ──
    if (um.playerHistories) {
      um.playerHistories.forEach((history, pId) => {
        const total = history.titles?.total || 0;
        const milestoneThisYear = [5, 10, 15, 20].find(m => {
          const titlesBeforeYear = (history.titles?.detailedList || [])
            .filter(t => t.year < year).length;
          return total >= m && titlesBeforeYear < m;
        });
        if (milestoneThisYear) {
          data.titleMilestones.push({
            name: playerName(um, pId),
            milestone: milestoneThisYear,
            total,
          });
        }
      });
    }

    // ── Win streak record ──
    if (um.playerHistories) {
      let bestStreak = 0;
      let bestStreakName = null;
      um.playerHistories.forEach((history, pId) => {
        const streak = history.bestWinStreak || 0;
        if (streak > bestStreak && streak >= 5) {
          bestStreak = streak;
          bestStreakName = playerName(um, pId);
        }
      });
      if (bestStreakName && bestStreak >= 5) {
        data.winStreakRecord = { name: bestStreakName, streak: bestStreak };
      }
    }

    // ── Promotions / debuts this year ──
    try {
      const TEAMS = um._TEAMS || um.getAllPlayers?.() || [];
      const promoted = TEAMS.filter(p => p.promotedYear === year && p.status !== 'RETIRED');
      data.promotedThisYear = promoted.map(p => p.name);

      // Check if any promoted player reached a Final
      if (promoted.length > 0 && finalsThisYear.length > 0) {
        promoted.forEach(p => {
          const inFinal = finalsThisYear.find(m => m.player1Id === p.id || m.player2Id === p.id);
          if (inFinal) {
            const won = inFinal.winnerId === p.id;
            if (!data.debutSensation || (won && data.debutSensation.achievement !== 'TITLE')) {
              data.debutSensation = { name: p.name, achievement: won ? 'TITLE' : 'FINAL' };
            }
          }
        });
      }
    } catch (e) { /* noop */ }

    // ── Ranking movement (from rankingHistory) ──
    try {
      if (um.rankingHistory && um.rankingHistory.length >= 2) {
        // Find snapshot at start and end of year
        const yearSnapshots = um.rankingHistory.filter(snap => {
          const snapYear = snap?.year || snap?.[0]?.[1];
          return snapYear === year;
        });
        if (yearSnapshots.length >= 2) {
          const startSnap = yearSnapshots[0];
          const endSnap = yearSnapshots[yearSnapshots.length - 1];
          // Build maps
          const toMap = (snap) => {
            const m = {};
            if (Array.isArray(snap)) {
              snap.forEach(([id, rank]) => { m[id] = rank; });
            } else if (snap && typeof snap === 'object') {
              Object.entries(snap).forEach(([id, rank]) => { m[id] = rank; });
            }
            return m;
          };
          const startMap = toMap(startSnap);
          const endMap = toMap(endSnap);
          let bestGain = 0, bestGainId = null;
          let worstLoss = 0, worstLossId = null;
          Object.keys(endMap).forEach(id => {
            const startRank = startMap[id] || 30;
            const endRank = endMap[id];
            const gain = startRank - endRank; // positive = improved
            if (gain >= 3 && gain > bestGain) { bestGain = gain; bestGainId = id; }
            if (gain <= -3 && gain < worstLoss) { worstLoss = gain; worstLossId = id; }
          });
          if (bestGainId) {
            data.biggestRiser = {
              name: playerName(um, parseInt(bestGainId)),
              fromRank: startMap[bestGainId] || '?',
              toRank: endMap[bestGainId],
              gain: bestGain,
            };
          }
          if (worstLossId) {
            data.biggestFaller = {
              name: playerName(um, parseInt(worstLossId)),
              fromRank: startMap[worstLossId] || '?',
              toRank: endMap[worstLossId],
              loss: Math.abs(worstLoss),
            };
          }
        }
      }
    } catch (e) { /* noop */ }

    // ── Era info ──
    if (um.eraSystem) {
      const currentEra = um.eraSystem.getCurrentEra?.();
      if (currentEra) {
        data.eraName = currentEra.name;
        data.eraStarted = currentEra.startYear === year;
      }
    }

    // ── Number of different champions ──
    const champSet = new Set();
    finalsThisYear.forEach(m => { if (m.winnerId !== undefined) champSet.add(m.winnerId); });
    data.numChampions = champSet.size;

  } catch (e) {
    console.warn('[ChronicleEngine v2] Error collecting season data:', e);
  }

  return data;
}

// ── Determinar tom da temporada ───────────────────────────────
function determineTone(data) {
  const {
    retirements, grandSlamSweep, grandSlamDominatorCount, numChampions,
    biggestUpset, eraStarted, eraEnded, promotedThisYear, debutSensation,
    mastersDominator, premierDominator, mostTitlesPlayer, kingsCourtRaceClose,
    titleAccumulator, winStreakRecord,
  } = data;

  const legendsRetired = retirements.filter(r => r.isLegend).length;
  const totalRetired = retirements.length;

  // EPIC: sweep, era, ou dominância extrema
  if (eraStarted || grandSlamSweep || (grandSlamDominatorCount >= 3) ||
      (titleAccumulator && titleAccumulator.count >= 4)) {
    return TONES.EPIC;
  }

  // DYNASTIC: domínio consolidado (premier + masters + KC)
  if (premierDominator && mastersDominator &&
      premierDominator.name === mastersDominator.name) {
    return TONES.DYNASTIC;
  }

  // TRAGIC: lendas se aposentando
  if (legendsRetired >= 1 || totalRetired >= 3) {
    return TONES.TRAGIC;
  }

  // PRODIGY: estreia sensacional
  if (debutSensation?.achievement === 'TITLE') {
    return TONES.PRODIGY;
  }

  // UNCERTAIN: caos, upsets históricos, ou muitos campeões
  if (numChampions >= 6 ||
      (biggestUpset && biggestUpset.margin >= 20) ||
      (kingsCourtRaceClose && numChampions >= 4)) {
    return TONES.UNCERTAIN;
  }

  // PRODIGY: estreia forte
  if (debutSensation?.achievement === 'FINAL') {
    return TONES.PRODIGY;
  }

  // TRANSITIONAL: default
  return TONES.TRANSITIONAL;
}

// ── Builder de seções narrativas ──────────────────────────────
function buildSections(data, tone) {
  const { year } = data;
  const nextyear = year + 1;
  const sections = [];

  const voice = VOICE[tone] || VOICE.TRANSITIONAL;

  // ─ SEÇÃO 1: ABERTURA ─────────────────────────────────────
  sections.push({
    type: 'opening',
    text: fill(pick(voice.opening), { year, nextyear }),
  });

  // ─ SEÇÃO 2: HISTÓRIA PRINCIPAL ────────────────────────────
  const mainStory = buildMainStory(data, tone, nextyear);
  if (mainStory) sections.push({ type: 'main', text: mainStory });

  // ─ SEÇÃO 3: HISTÓRIA SECUNDÁRIA (RIVALIDADE / RIVAL / RECORDE) ─
  const subStory1 = buildSubStory1(data, tone);
  if (subStory1) sections.push({ type: 'sub1', text: subStory1 });

  // ─ SEÇÃO 4: HISTÓRIA TERCIÁRIA (QUEDA / PRODÍGIO / MILESTONE) ─
  const subStory2 = buildSubStory2(data, tone);
  if (subStory2) sections.push({ type: 'sub2', text: subStory2 });

  // ─ SEÇÃO 5: FECHAMENTO ────────────────────────────────────
  const stats = buildStats(data);
  if (stats) sections.push({ type: 'stats', text: stats });

  sections.push({
    type: 'closing',
    text: fill(pick(voice.closing), { year, nextyear }),
  });

  return sections.filter(s => s.text);
}

function buildMainStory(data, tone, nextyear) {
  const { year } = data;

  switch (tone) {
    case TONES.EPIC: {
      const hero = data.grandSlamDominatorName || data.kingsCourtChampName || data.seasonPointsLeaderName || data.topRankingName;
      if (!hero) return null;
      const parts = [];

      if (data.grandSlamSweep) {
        parts.push(`**${hero}** venceu todos os Grand Slams do calendário — o tipo de façanha que o circuito inclui nas primeiras páginas da enciclopédia.`);
      } else if (data.grandSlamDominatorCount >= 2) {
        parts.push(`**${hero}** ${fill(pick(PHRASES.premierDominance), { n: data.grandSlamDominatorCount, s: s(data.grandSlamDominatorCount) })}.`);
      }

      if (data.titleAccumulator && data.titleAccumulator.count >= 4) {
        const hero2 = data.titleAccumulator.name;
        parts.push(`**${hero2}** ${fill(pick(PHRASES.titleAccumulation), { n: data.titleAccumulator.count, s: s(data.titleAccumulator.count) })}.`);
      }

      if (data.eraStarted && data.eraName) {
        parts.push(fill(pick(PHRASES.eraDeclared), { name: data.eraName }) + '.');
      }

      if (data.kingsCourtChampName && data.kingsCourtChampName !== hero) {
        parts.push(fill(pick(PHRASES.kingsCourtChamp), { name: `**${data.kingsCourtChampName}**`, year }));
      }

      return parts.join(' ') || null;
    }

    case TONES.DYNASTIC: {
      const hero = data.premierDominator?.name || data.mastersDominator?.name || data.kingsCourtChampName;
      if (!hero) return null;
      const parts = [];

      if (data.premierDominator) {
        parts.push(`**${data.premierDominator.name}** ${fill(pick(PHRASES.premierDominance), { n: data.premierDominator.count, s: s(data.premierDominator.count) })}.`);
      }
      if (data.mastersDominator && data.mastersDominator.name !== data.premierDominator?.name) {
        parts.push(`**${data.mastersDominator.name}** ${fill(pick(PHRASES.mastersDominance), { n: data.mastersDominator.count, s: s(data.mastersDominator.count) })}.`);
      } else if (data.mastersDominator) {
        // Same person dominated both
        parts.push(`A combinação de Premiers e Masters formou a base de uma temporada que o circuito vai usar como referência por anos.`);
      }

      if (data.kingsCourtChampName) {
        parts.push(fill(pick(PHRASES.kingsCourtChamp), { name: `**${data.kingsCourtChampName}**`, year }));
      }

      return parts.join(' ') || null;
    }

    case TONES.TRAGIC: {
      const parts = [];
      data.retirements.forEach(r => {
        const tpl = r.isLegend ? pick(PHRASES.retirementLegend) :
                    r.isSurprise ? pick(PHRASES.retirementSurprise) :
                    pick(PHRASES.retirement);
        parts.push(fill(tpl, {
          name: `**${r.name}**`,
          titles: r.titles,
          st: s(r.titles),
          years: r.years,
          sy: s(r.years),
          peak: r.peakRanking,
        }));
      });
      if (data.kingsCourtChampName) {
        parts.push(`Enquanto o circuito processava as perdas, **${data.kingsCourtChampName}** tomou o espaço que elas deixaram — e ${fill(pick(PHRASES.kingsCourtChamp), { name: '', year }).trim()}.`);
      }
      return parts.join(' ') || null;
    }

    case TONES.PRODIGY: {
      const prodigy = data.debutSensation?.name;
      if (!prodigy) return null;
      const parts = [];

      if (data.debutSensation.achievement === 'TITLE') {
        parts.push(fill(pick(PHRASES.debutTitle), { name: `**${prodigy}**` }));
      } else {
        parts.push(fill(pick(PHRASES.debutFinal), { name: `**${prodigy}**` }));
      }

      // Add context
      if (data.kingsCourtChampName && data.kingsCourtChampName !== prodigy) {
        parts.push(`No restante do calendário, **${data.kingsCourtChampName}** manteve a autoridade de quem já não precisa provar nada — ${fill(pick(PHRASES.kingsCourtChamp), { name: '', year }).trim()}.`);
      }

      return parts.join(' ') || null;
    }

    case TONES.UNCERTAIN: {
      const parts = [];
      if (data.biggestUpset) {
        const u = data.biggestUpset;
        parts.push(fill(pick(PHRASES.upset), {
          winner: `**${u.winnerName}**`,
          rank: u.winnerRank,
          victimRank: u.victimRank,
          tournament: u.tournamentName,
          year,
        }));
      }
      if (data.numChampions >= 5) {
        parts.push(`O ano distribuiu títulos por ${data.numChampions} campeões diferentes. O circuito assistiu de boca aberta enquanto a hierarquia do ranking virava papel amassado.`);
      }
      return parts.join(' ') || null;
    }

    case TONES.TRANSITIONAL: {
      const parts = [];
      if (data.debutSensation) {
        parts.push(fill(pick(PHRASES.debutImpression), { name: `**${data.debutSensation.name}**`, year }));
      } else if (data.promotedThisYear.length > 0) {
        const name = data.promotedThisYear[0];
        parts.push(fill(pick(PHRASES.debutImpression), { name: `**${name}**`, year }));
      } else if (data.seasonPointsLeaderName) {
        parts.push(`**${data.seasonPointsLeaderName}** liderou a temporada nos pontos — sem a autoridade incontestável de outros anos, mas com consistência suficiente para que ninguém esquecesse o nome em dezembro.`);
      }
      if (data.kingsCourtChampName) {
        parts.push(fill(pick(PHRASES.kingsCourtChamp), { name: `**${data.kingsCourtChampName}**`, year }));
      }
      return parts.join(' ') || null;
    }

    default: return null;
  }
}

function buildSubStory1(data, tone) {
  // Priority: Rivalry > Kings Court Race > Grand Finals > Upset (if not main story)
  const parts = [];

  // Rivalry
  if (data.topRivalry) {
    const r = data.topRivalry;
    const rType = data.topRivalryType;

    if (rType === 'ERA_CLASH') {
      parts.push(fill(pick(PHRASES.rivalryEraClash), { p1: `**${r.p1Name}**`, p2: `**${r.p2Name}**` }));
    } else if (rType === 'GRUDGE') {
      parts.push(fill(pick(PHRASES.rivalryGrudge), { p1: `**${r.p1Name}**`, p2: `**${r.p2Name}**`, year: data.year }));
    } else if (rType === 'FINALS_CURSE') {
      parts.push(fill(pick(PHRASES.rivalryFinalsCurse), { p1: `**${r.p1Name}**`, p2: `**${r.p2Name}**` }));
    } else if (r.dominated) {
      parts.push(fill(pick(PHRASES.rivalryDomination), { p1: `**${r.dominatorName}**`, p2: `**${r.submissiveName}**` }));
    } else {
      parts.push(fill(pick(PHRASES.rivalryClassic), { p1: `**${r.p1Name}**`, p2: `**${r.p2Name}**`, n: r.total, year: data.year }));
    }
  }

  // Kings Court race
  if (data.kingsCourtRaceClose && data.kingsCourtRaceP1 && data.kingsCourtRaceP2 && parts.length === 0) {
    parts.push(fill(pick(PHRASES.kingsCourtRaceClose), {
      p1: `**${data.kingsCourtRaceP1}**`,
      p2: `**${data.kingsCourtRaceP2}**`,
      year: data.year,
    }));
  }

  // Grand Finals (if significant)
  if (data.grandFinalsChampName && !data.kingsCourtChampName && parts.length === 0) {
    if (data.grandFinalsUpset) {
      parts.push(fill(pick(PHRASES.grandFinalsUpset), { name: `**${data.grandFinalsChampName}**`, year: data.year }));
    } else {
      parts.push(fill(pick(PHRASES.grandFinalsChamp), { name: `**${data.grandFinalsChampName}**` }));
    }
  }

  return parts.join(' ') || null;
}

function buildSubStory2(data, tone) {
  const parts = [];

  // Title milestone
  if (data.titleMilestones.length > 0) {
    const m = data.titleMilestones[0];
    parts.push(fill(pick(PHRASES.titleMilestone), { name: `**${m.name}**`, milestone: m.milestone }));
  }
  // Win streak record
  else if (data.winStreakRecord && data.winStreakRecord.streak >= 7) {
    parts.push(fill(pick(PHRASES.winStreak), { name: `**${data.winStreakRecord.name}**`, streak: data.winStreakRecord.streak }));
  }
  // Ranking rise (impressive story)
  else if (data.biggestRiser && data.biggestRiser.gain >= 5) {
    const r = data.biggestRiser;
    parts.push(fill(pick(PHRASES.rankingRise), { name: `**${r.name}**`, from: r.fromRank, to: r.toRank, gain: r.gain, year: data.year }));
  }
  // Ranking fall (downfall story)
  else if (data.biggestFaller && data.biggestFaller.loss >= 5 && tone !== TONES.TRAGIC) {
    const f = data.biggestFaller;
    parts.push(fill(pick(PHRASES.rankingFall), { name: `**${f.name}**`, from: f.fromRank, to: f.toRank, gone: f.loss, year: data.year }));
  }
  // KC first-timer
  else if (data.kingsCourtFirstTimer && data.kingsCourtFirstTimer !== data.kingsCourtChampName) {
    parts.push(fill(pick(PHRASES.kingsCourtFirst), { name: `**${data.kingsCourtFirstTimer}**` }));
  }
  // Debut impression (if not already main story)
  else if (data.promotedThisYear.length > 0 && tone !== TONES.PRODIGY && tone !== TONES.TRANSITIONAL) {
    const name = data.promotedThisYear[0];
    parts.push(fill(pick(PHRASES.debutImpression), { name: `**${name}**`, year: data.year }));
  }

  return parts.join(' ') || null;
}

function buildStats(data) {
  if (data.totalMatches > 0 && data.totalTournaments > 0 && Math.random() > 0.4) {
    return fill(pick(PHRASES.numericSummary), {
      matches: data.totalMatches,
      tournaments: data.totalTournaments,
    });
  }
  return null;
}

// ── Gerar texto plano (backward compat + search) ──────────────
function sectionsToText(sections) {
  return sections.map(sec => sec.text).join(' ');
}

// ── Gerar tags de destaque ────────────────────────────────────
function buildHighlightTags(data) {
  const tags = [];

  if (data.kingsCourtChampName) tags.push(`👑 ${data.kingsCourtChampName}`);
  if (data.grandSlamSweep) tags.push('🏆 Grand Slam Sweep');
  else if (data.grandSlamDominatorCount >= 2) tags.push(`🏆 ${data.grandSlamDominatorCount}× GS`);
  if (data.premierDominator) tags.push(`⭐ ${data.premierDominator.count}× Premier`);
  if (data.mastersDominator) tags.push(`⚡ ${data.mastersDominator.count}× Masters`);
  if (data.biggestUpset) tags.push(`💥 Upset #${data.biggestUpset.winnerRank} × #${data.biggestUpset.victimRank}`);
  if (data.topRivalry) tags.push(`⚔️ ${data.topRivalry.p1Name} × ${data.topRivalry.p2Name}`);
  data.retirements.forEach(r => {
    if (r.isLegend) tags.push(`🕊️ ${r.name}`);
  });
  if (data.eraStarted && data.eraName) tags.push(`🌟 Era ${data.eraName}`);
  if (data.debutSensation) tags.push(`🌱 ${data.debutSensation.name}`);
  if (data.titleMilestones.length > 0) tags.push(`🔖 ${data.titleMilestones[0].name}: ${data.titleMilestones[0].milestone}º título`);
  if (data.winStreakRecord?.streak >= 7) tags.push(`🔥 ${data.winStreakRecord.streak} vitórias seguidas`);
  if (data.kingsCourtRaceClose) tags.push(`⚖️ Corrida pelo KC`);
  if (data.grandFinalsChampName && !data.kingsCourtChampName) tags.push(`🏅 ${data.grandFinalsChampName}`);

  return tags.slice(0, 7);
}

// ── Epítafo de carreira ───────────────────────────────────────
const EPITAPH_TEMPLATES = [
  '{name} jogou {years} temporada{sy} no circuito principal e não saiu com a mochila vazia. {titles} título{st}, pico de #{peak}. Quem cruzou seu caminho sabe que cada vitória foi conquistada.',
  '{name}: {years} ano{sy}, {titles} título{st}, pico de #{peak}. As partidas que definiriam uma carreira inteira, ele jogou mais de uma vez.',
  'A carreira de {name} cabe em números: {years} temporada{sy}, {titles} título{st}, pico #{peak}. Os números não cabem na carreira.',
  '{name} durou {years} ano{sy} no circuito — tempo suficiente para construir um legado que o ranking nunca vai capturar completamente. {titles} título{st}. Pico #{peak}.',
  '{name} entrou no circuito e construiu o suficiente para ser lembrado. {titles} título{st} em {years} temporada{sy}. Pico #{peak}. O circuito reconheceu.',
];

const EPITAPH_LEGEND_TEMPLATES = [
  'Há poucas formas de resumir o que {name} foi para o circuito. {years} temporada{sy}. {titles} título{st}. Pico #{peak}. Uma geração inteira de adversários que cresceram tentando ser o que ele era.',
  '{name} entrou no circuito e nunca ficou longe do topo tempo suficiente para se tornar referência. {titles} título{st} em {years} ano{sy}, pico #{peak}. O espaço que {name} deixou vai demorar para ser preenchido.',
  'Quando {name} encerrou a carreira, o circuito fez o único tributo que importa: silêncio. {titles} título{st}. {years} temporada{sy}. Pico #{peak}.',
  '{name} — {years} ano{sy}, {titles} título{st}, pico #{peak}. A carreira de um jogador que o circuito vai citar por décadas, e que os adversários vão lembrar com aquela mistura de respeito e alivio que só o fim de uma era produz.',
];

export function generatePlayerEpitaph(name, careerSummary) {
  const { yearsActive = 0, totalTitles = 0, peakRanking = 99 } = careerSummary || {};
  const isLegend = totalTitles >= 5 || peakRanking === 1;
  const templates = isLegend ? EPITAPH_LEGEND_TEMPLATES : EPITAPH_TEMPLATES;
  return fill(pick(templates), {
    name,
    years: yearsActive,
    sy: s(yearsActive),
    titles: totalTitles,
    st: s(totalTitles),
    peak: peakRanking,
  });
}

// ── Epítafo de era ────────────────────────────────────────────
const ERA_EPITAPH_TEMPLATES = [
  'A Era {name} durou {seasons} temporada{ss} e deixou {champions} campeão{sc} diferente{sc} em seu rastro. {highlights}',
  '{seasons} temporada{ss}. Esse foi o tempo que a Era {name} levou para se tornar história. {highlights}',
  'A Era {name} começou como promessa e terminou como definição. {seasons} ano{ss}, {champions} campeão{sc}. {highlights}',
  'O circuito vai dividir sua história em antes e depois da Era {name}. {seasons} temporada{ss}. {champions} campeão{sc}. {highlights}',
];

export function generateEraEpitaph(era) {
  const { name, startYear, endYear, champions = [], stats = {} } = era;
  const seasons = (endYear || startYear) - startYear + 1;
  const uniqueChamps = [...new Set((champions || []).map(c => c.name))];
  const numChamps = uniqueChamps.length;

  let highlights = '';
  if (uniqueChamps.length > 0) {
    highlights = `Os nomes que definiram esse período: ${uniqueChamps.join(', ')}.`;
  }
  if (stats.retirements > 0) {
    highlights += ` ${stats.retirements} jogador${s(stats.retirements)} se aposentou${stats.retirements > 1 ? 'ram' : ''} nesse período.`;
  }

  return fill(pick(ERA_EPITAPH_TEMPLATES), {
    name,
    seasons,
    ss: s(seasons),
    champions: numChamps,
    sc: s(numChamps),
    highlights,
  });
}

// ── Flashback ─────────────────────────────────────────────────
export function generateFlashback(entry, currentYear) {
  const yearsAgo = currentYear - entry.year;
  if (yearsAgo <= 0) return null;
  const intros = [
    `Há ${yearsAgo} ano${s(yearsAgo)}, o circuito viveu:`,
    `${yearsAgo} ano${s(yearsAgo)} atrás nesta temporada:`,
    `Memória do circuito — ${yearsAgo} ano${s(yearsAgo)} atrás:`,
    `O calendário lembra: ${yearsAgo} ano${s(yearsAgo)} atrás,`,
  ];
  const snippet = entry.sections?.[1]?.text || entry.text?.substring(0, 160) || '';
  return `${pick(intros)} ${snippet}`;
}

// ── CLASSE PRINCIPAL ──────────────────────────────────────────
export class ChronicleEngine {
  constructor() {
    this.chronicles  = [];  // [{year, tone, sections, text, tags, raw}]
    this.epitaphs    = {};  // playerId -> string
    this.eraEpitaphs = {};  // eraId -> string
  }

  generateYearEntry(um, year) {
    if (this.chronicles.find(c => c.year === year)) {
      return this.chronicles.find(c => c.year === year);
    }

    const raw      = collectSeasonData(um, year);
    const tone     = determineTone(raw);
    const sections = buildSections(raw, tone);
    const text     = sectionsToText(sections);
    const tags     = buildHighlightTags(raw);

    const entry = { year, tone, sections, text, tags, raw };
    this.chronicles.push(entry);
    this.chronicles.sort((a, b) => b.year - a.year);

    console.log(`📖 Crônica de ${year} gerada [${tone}] — ${sections.length} seções`);
    return entry;
  }

  addPlayerEpitaph(playerId, name, careerSummary) {
    this.epitaphs[playerId] = generatePlayerEpitaph(name, careerSummary);
  }

  addEraEpitaph(eraId, era) {
    this.eraEpitaphs[eraId] = generateEraEpitaph(era);
  }

  search(query) {
    if (!query || query.trim() === '') return this.chronicles;
    const q = query.toLowerCase();
    return this.chronicles.filter(c =>
      c.text.toLowerCase().includes(q) ||
      c.tags.some(t => t.toLowerCase().includes(q)) ||
      String(c.year).includes(q)
    );
  }

  getFlashback(currentYear, yearsBack = [5, 10]) {
    return yearsBack
      .map(n => {
        const entry = this.chronicles.find(c => c.year === currentYear - n);
        return entry ? { ...entry, yearsAgo: n, flashText: generateFlashback(entry, currentYear) } : null;
      })
      .filter(Boolean);
  }

  getTopUpsets(limit = 5) {
    return this.chronicles
      .filter(c => c.raw?.biggestUpset?.margin)
      .sort((a, b) => (b.raw.biggestUpset?.margin || 0) - (a.raw.biggestUpset?.margin || 0))
      .slice(0, limit)
      .map(c => ({ year: c.year, ...c.raw.biggestUpset }));
  }

  getTopDominanceSeasons(limit = 5) {
    return this.chronicles
      .filter(c => c.raw?.mostTitlesPlayer?.count >= 2)
      .sort((a, b) => (b.raw.mostTitlesPlayer?.count || 0) - (a.raw.mostTitlesPlayer?.count || 0))
      .slice(0, limit)
      .map(c => ({
        year: c.year,
        playerName: c.raw.mostTitlesPlayer.name,
        titleCount: c.raw.mostTitlesPlayer.count,
        gsWins: c.raw.grandSlamDominatorCount || 0,
        sweep: c.raw.grandSlamSweep || false,
      }));
  }

  getTopRivalries() {
    // Aggregate rivalry appearances
    const rivalryMap = {};
    this.chronicles.forEach(c => {
      if (!c.raw?.topRivalry) return;
      const r = c.raw.topRivalry;
      const key = [r.p1Name, r.p2Name].sort().join(' × ');
      if (!rivalryMap[key]) rivalryMap[key] = { key, p1: r.p1Name, p2: r.p2Name, appearances: 0, type: r.type };
      rivalryMap[key].appearances++;
    });
    return Object.values(rivalryMap).sort((a, b) => b.appearances - a.appearances).slice(0, 5);
  }

  getProdigies() {
    return this.chronicles
      .filter(c => c.tone === TONES.PRODIGY || c.raw?.debutSensation)
      .map(c => ({ year: c.year, name: c.raw?.debutSensation?.name, achievement: c.raw?.debutSensation?.achievement }))
      .filter(p => p.name);
  }

  toJSON() {
    return { chronicles: this.chronicles, epitaphs: this.epitaphs, eraEpitaphs: this.eraEpitaphs };
  }

  fromJSON(data) {
    if (!data) return;
    this.chronicles  = data.chronicles  || [];
    this.epitaphs    = data.epitaphs    || {};
    this.eraEpitaphs = data.eraEpitaphs || {};
    // Backfill sections for old entries without them
    this.chronicles.forEach(c => {
      if (!c.sections && c.text) {
        c.sections = [{ type: 'main', text: c.text }];
      }
    });
  }
}

export default ChronicleEngine;
