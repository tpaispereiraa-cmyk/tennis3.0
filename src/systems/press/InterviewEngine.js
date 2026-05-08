/**
 * InterviewEngine.js — v2.0
 * ─────────────────────────────────────────────────────────────────
 * Motor de entrevistas do Tennis Universe.
 *
 * v2.0: contexto real por jogador — títulos, h2h, forma, ranking,
 * superfície dominante, técnico. Jornalistas com personalidade.
 * Auto-geração de oportunidades a partir dos resultados do universo.
 */

import { getOffCourtState } from '../life/LifeEventSystem.js';

function pick(arr) {
  if (!arr || arr.length === 0) return '';
  return arr[Math.floor(Math.random() * arr.length)];
}

const SURFACE_LABELS = {
  CLAY: 'saibro', GRASS: 'grama', HARD: 'quadra dura', INDOOR: 'indoor',
};

const ATTR_LABELS = {
  serve: 'saque', forehand: 'forehand', backhand: 'backhand',
  speed: 'velocidade', stamina: 'resistência', mental: 'mental',
};

// ═══════════════════════════════════════════════════════════════════
// JORNALISTAS
// ═══════════════════════════════════════════════════════════════════

export const JOURNALISTS = {
  marina:  { id:'marina',  name:'Marina Souza',   outlet:'TennisWorld Brasil',  style:'emotional',   icon:'🎙️', color:'#E8C84A' },
  david:   { id:'david',   name:'David Chen',      outlet:'ATP Circuit Report',  style:'analytical',  icon:'📊', color:'#4A90D9' },
  sofia:   { id:'sofia',   name:'Sofia Reyes',     outlet:'Sports Inside',       style:'lifestyle',   icon:'✨', color:'#AB47BC' },
  aleksei: { id:'aleksei', name:'Aleksei Volkov',  outlet:'Circuit Weekly',      style:'aggressive',  icon:'🔥', color:'#EF5350' },
  camila:  { id:'camila',  name:'Camila Voss',     outlet:'TennisPulse',         style:'friendly',    icon:'💛', color:'#2ECC71' },
};

function pickJournalist(situation) {
  const pool = {
    champion_slam: ['marina','david','sofia'],
    champion:      ['marina','camila','david'],
    finalist:      ['david','aleksei','marina'],
    upset_victim:  ['aleksei','david','camila'],
  };
  const ids = pool[situation] ?? Object.keys(JOURNALISTS);
  return JOURNALISTS[pick(ids)];
}

// ═══════════════════════════════════════════════════════════════════
// CONTEXTOS
// ═══════════════════════════════════════════════════════════════════

export const INTERVIEW_CONTEXTS = {
  POST_WIN:         { id:'POST_WIN',         label:'Pós-vitória',     icon:'🏆', description:'Zona mista logo após uma vitória.',         topicWeights:{ MATCH_WIN:36, RIVAL:15, PRESSURE:14, SURFACE:10, CAREER:9, MEMORY:8, PHILOSOPHY:4, TRAINING:4 } },
  POST_SLAM_WIN:    { id:'POST_SLAM_WIN',    label:'Pós-Grand Slam',  icon:'⭐', description:'Coletiva após conquistar um Grand Slam.',   topicWeights:{ MATCH_WIN:18, CAREER:20, MEMORY:17, PRESSURE:15, PHILOSOPHY:11, RIVAL:8, BUSINESS:5, PERSONAL:3, FUTURE:3 } },
  POST_LOSS:        { id:'POST_LOSS',        label:'Pós-derrota',     icon:'😶', description:'Zona mista após uma derrota.',              topicWeights:{ MATCH_LOSS:34, RIVAL:15, MEMORY:12, TRAINING:13, PRESSURE:10, FUTURE:8, PHILOSOPHY:4, INJURY:4 } },
  POST_UPSET_LOSS:  { id:'POST_UPSET_LOSS',  label:'Derrota surpresa',icon:'⚡', description:'Eliminação inesperada por um azarão.',      topicWeights:{ MATCH_LOSS:32, MEMORY:18, PRESSURE:18, TRAINING:12, FUTURE:10, PHILOSOPHY:6, RIVAL:4 } },
  PRE_TOURNAMENT:   { id:'PRE_TOURNAMENT',   label:'Pré-torneio',     icon:'📋', description:'Coletiva antes do início de um torneio.',   topicWeights:{ SURFACE:18, RIVAL:18, MEMORY:14, FUTURE:16, TRAINING:13, PRESSURE:9, CAREER:8, PHILOSOPHY:4 } },
  OFF_SEASON:       { id:'OFF_SEASON',       label:'Entressafra',     icon:'🌙', description:'Entrevista de perfil durante a entressafra.',topicWeights:{ PERSONAL:20, MEMORY:20, CAREER:16, PHILOSOPHY:14, BUSINESS:10, TRAINING:8, FUTURE:7, YOUNG_PLAYERS:3, INJURY:2 } },
  CAREER_MILESTONE: { id:'CAREER_MILESTONE', label:'Marco de carreira',icon:'📌',description:'Entrevista por um feito histórico.',         topicWeights:{ CAREER:28, MEMORY:23, PHILOSOPHY:16, PERSONAL:10, BUSINESS:8, PRESSURE:6, YOUNG_PLAYERS:5, FUTURE:4 } },
  INJURY_RETURN:    { id:'INJURY_RETURN',    label:'Retorno de lesão', icon:'🏥',description:'Primeira coletiva após retorno de uma lesão.',topicWeights:{ INJURY:31, MEMORY:18, PHILOSOPHY:17, PERSONAL:12, FUTURE:12, TRAINING:7, CAREER:3 } },
};

// ═══════════════════════════════════════════════════════════════════
// PERGUNTAS POR ESTILO DE JORNALISTA
// ═══════════════════════════════════════════════════════════════════

INTERVIEW_CONTEXTS.RETIREMENT_ANNOUNCEMENT = { id:'RETIREMENT_ANNOUNCEMENT', label:'Anuncio de despedida', icon:'🌅', description:'Entrevista após anunciar a temporada final.', topicWeights:{ CAREER:24, MEMORY:22, PERSONAL:16, FUTURE:11, PHILOSOPHY:11, BUSINESS:7, PRESSURE:5, YOUNG_PLAYERS:4 } };
INTERVIEW_CONTEXTS.FAREWELL_TOUR = { id:'FAREWELL_TOUR', label:'Turne final', icon:'🕯️', description:'Coletiva durante a turne de despedida.', topicWeights:{ CAREER:21, MEMORY:22, PERSONAL:16, PHILOSOPHY:15, BUSINESS:7, PRESSURE:8, FUTURE:7, YOUNG_PLAYERS:4 } };
INTERVIEW_CONTEXTS.SCANDAL_RESPONSE = { id:'SCANDAL_RESPONSE', label:'Resposta publica', icon:'⚖️', description:'Primeira entrevista depois de um escandalo ou suspensao.', topicWeights:{ PERSONAL:20, PHILOSOPHY:15, PRESSURE:25, FUTURE:20, CAREER:10, TRAINING:10 } };
INTERVIEW_CONTEXTS.BREAKING_RETURN = { id:'BREAKING_RETURN', label:'Volta ao mundo', icon:'🫀', description:'Retorno apos uma crise humana maior do que o jogo.', topicWeights:{ PERSONAL:25, FUTURE:20, PHILOSOPHY:20, INJURY:15, CAREER:10, PRESSURE:10 } };
INTERVIEW_CONTEXTS.MONTHLY_PROFILE = { id:'MONTHLY_PROFILE', label:'Entrevista do mes', icon:'📡', description:'Perfil mensal com um top-40 sobre carreira, vida, patrocinio e momento da temporada.', topicWeights:{ MEMORY:20, CAREER:18, PERSONAL:16, BUSINESS:15, PRESSURE:12, PHILOSOPHY:9, FUTURE:6, TRAINING:4 } };

const QUESTIONS_BY_STYLE = {
  emotional: {
    MATCH_WIN:    ['O que você sentiu no momento exato em que o jogo acabou?','Como foi manter a calma nos momentos mais tensos?','Você consegue descrever o que passa pela cabeça num momento desses?'],
    MATCH_LOSS:   ['O que essa derrota vai deixar em você?','O que te passa pela cabeça quando você sai da quadra sabendo que acabou?'],
    RIVAL:        ['Como você descreveria o que sente quando vai jogar contra {rival}?','Qual é o momento que mais define a sua relação com {rival}?'],
    CAREER:       ['Se você pudesse voltar e dar um conselho para o jogador que você era com 17 anos, o que diria?','Existe uma derrota que te moldou mais do que qualquer vitória?'],
    MEMORY:       ['Existe um torneio que ainda mora em você de um jeito especial?','Quando olha para trás, qual lugar da carreira ainda te emociona?','Tem alguma derrota antiga que ainda conversa com você?'],
    SURFACE:      ['O que o {surface} representa pra você como jogador?'],
    PRESSURE:     ['Como você aprende a conviver com a pressão dos grandes momentos?'],
    PERSONAL:     ['O que a família representa no meio de tudo isso?','Como é a sua vida fora das quadras — o que te equilibra?'],
    BUSINESS:     ['Quando uma marca aposta em você, isso pesa emocionalmente?','Existe uma parceria comercial que mudou sua forma de enxergar a carreira?'],
    TRAINING:     ['Como foi o processo de chegar até aqui — o que mais custou?'],
    INJURY:       ['O que você sentiu nos primeiros dias sabendo que estava fora?'],
    FUTURE:       ['O que ainda te falta conquistar para se sentir completo como jogador?'],
    PHILOSOPHY:   ['O que o tênis te ensinou sobre a vida que nada mais poderia ter te ensinado?'],
    YOUNG_PLAYERS:['O que você sente quando vê os jovens chegando com tanta força?'],
  },
  analytical: {
    MATCH_WIN:    ['O que foi taticamente decisivo nessa vitória?','Que ajuste você fez entre o primeiro e o segundo set?'],
    MATCH_LOSS:   ['Na sua análise, qual foi o ponto de inflexão do jogo?','O adversário explorou alguma fragilidade específica do seu jogo hoje?'],
    RIVAL:        ['Como você lê taticamente o jogo de {rival}?','O que mudou nas últimas partidas entre vocês em termos de padrão?'],
    CAREER:       ['Olhando para a evolução técnica, o que mais mudou na última temporada?'],
    MEMORY:       ['Que memória competitiva explica melhor a sua evolução?','Existe um adversário que obrigou você a redesenhar seu jogo?','Qual torneio mudou a forma como você entende a própria carreira?'],
    SURFACE:      ['Como o {surface} afeta taticamente a forma como você constrói os pontos?'],
    PRESSURE:     ['Existe um padrão de jogo que você utiliza nos tiebreaks decisivos?'],
    TRAINING:     ['Que métricas você acompanha para saber que está no nível certo?'],
    FUTURE:       ['Que áreas do jogo você identificou como prioridade para os próximos meses?'],
    INJURY:       ['Como o processo de recuperação afetou a sua mecânica de movimento?'],
    PHILOSOPHY:   ['Como você equilibra intuição e análise dentro da quadra?'],
    PERSONAL:     ['Como você mantém a disciplina de rotina numa agenda tão imprevisível?'],
    BUSINESS:     ['Como você analisa hoje seu portfólio de patrocinadores?','Você acompanha risco de concentração e retorno comercial como acompanha estatísticas de jogo?'],
    YOUNG_PLAYERS:['O que os dados do circuito mostram sobre a nova geração?'],
  },
  lifestyle: {
    MATCH_WIN:    ['Como é a rotina depois de uma vitória grande — vai celebrar?','O que você faz para descansar a cabeça depois de um resultado assim?'],
    MATCH_LOSS:   ['Como você cuida do lado mental depois de um dia difícil?'],
    RIVAL:        ['Como é a relação de vocês fora da quadra? Existe um lado humano da rivalidade?'],
    CAREER:       ['O que essa vida no circuito te deu que nenhum outro caminho poderia ter dado?'],
    MEMORY:       ['Qual cidade ou torneio virou quase um lugar afetivo para você?','Existe uma lembrança da carreira que as pessoas não entendem por completo?'],
    SURFACE:      ['Existe alguma cidade associada a essa superfície que você ama visitar?'],
    PERSONAL:     ['Qual é o hobby que as pessoas jamais imaginariam que você tem?','O que você mais sente falta quando está na estrada por semanas?'],
    BUSINESS:     ['Como é lidar com campanhas, marcas e imagem pública sem perder sua vida normal?','Tem alguma campanha ou patrocinador que virou parte da sua identidade fora da quadra?'],
    TRAINING:     ['Como você mantém equilíbrio entre treino intenso e recuperação mental?'],
    FUTURE:       ['O que você imagina que vai fazer quando parar de jogar?'],
    INJURY:       ['O que esse período te ensinou sobre cuidar de si mesmo?'],
    PHILOSOPHY:   ['O que o tênis te ensinou sobre encontrar equilíbrio na vida?'],
    YOUNG_PLAYERS:['O que você diria para um jovem talento sobre o que esperar dessa vida?'],
  },
  aggressive: {
    MATCH_WIN:    ['Você sabia que ia ganhar antes de entrar em quadra?','Esse resultado prova alguma coisa para alguém que duvidou de você?'],
    MATCH_LOSS:   ['Você jogou mal ou o adversário foi melhor? Seja honesto.','O que você vai fazer diferente? Porque hoje não funcionou.'],
    RIVAL:        ['O {rival} te incomoda? Ou é uma rivalidade equilibrada?','Qual foi o jogo que mais te irritou perder — e por quê?'],
    CAREER:       ['Se você olhar para a carreira com frieza, tem decisões das quais se arrepende?'],
    MEMORY:       ['Qual derrota você ainda não engoliu?','Tem algum adversário que você simplesmente odeia enfrentar?','Qual torneio te fez calar gente que duvidava de você?'],
    SURFACE:      ['Você tem superfície fraca ou é algo que não quer admitir?'],
    PRESSURE:     ['Existe alguma situação em que você simplesmente trava? Seja honesto.'],
    TRAINING:     ['O que está errado no seu jogo agora — o que precisa mudar?'],
    FUTURE:       ['Qual é o prazo? Por quanto tempo você ainda vai competir no mais alto nível?'],
    INJURY:       ['Você voltou cedo demais? Qual é a sua resposta honesta?'],
    PHILOSOPHY:   ['Você acha que o circuito te deu o reconhecimento que merecia?'],
    PERSONAL:     ['A pressão afeta sua vida pessoal? Como você lida honestamente com isso?'],
    BUSINESS:     ['Você acha que as marcas te valorizam o suficiente?','Dinheiro e patrocínio mudam a forma como o circuito olha para você?'],
    YOUNG_PLAYERS:['Os jovens vêm chegando — você sente que seu lugar está ameaçado?'],
  },
  friendly: {
    MATCH_WIN:    ['Conta como foi — do aquecimento até o match point!','Você vai dormir bem essa noite?'],
    MATCH_LOSS:   ['Essas derrotas doem diferente dependendo de como acontecem — como foi essa?'],
    RIVAL:        ['Como você e {rival} são fora da quadra — existe uma boa relação?'],
    CAREER:       ['Qual é a memória mais bonita que você tem da carreira até agora?'],
    MEMORY:       ['Se tivesse que escolher uma lembrança para guardar da carreira, qual seria?','Tem algum torneio que parece casa para você?','Qual adversário mais te ensinou sobre você mesmo?'],
    SURFACE:      ['Qual é a superfície em que você mais curte jogar — e por quê?'],
    PERSONAL:     ['O que te dá energia fora do tênis?'],
    BUSINESS:     ['Tem alguma marca que você sente que caminhou junto com você de verdade?','Como você escolhe os projetos comerciais que aceita?'],
    TRAINING:     ['Como é o clima nos treinos — tem alguma coisa que você gosta de fazer diferente?'],
    FUTURE:       ['Quais são os seus sonhos ainda pendentes no tênis?'],
    INJURY:       ['Como a torcida te apoiou durante o período que você ficou fora?'],
    PHILOSOPHY:   ['O que o tênis te deu de mais especial na vida?'],
    YOUNG_PLAYERS:['Tem algum jovem do circuito que você acha que vai ser uma estrela?'],
  },
};

export const QUESTION_BANKS = Object.fromEntries(
  ['MATCH_WIN','MATCH_LOSS','RIVAL','SURFACE','CAREER','MEMORY','PRESSURE','PERSONAL','BUSINESS','PHILOSOPHY','FUTURE','TRAINING','YOUNG_PLAYERS','INJURY'].map(topic => [
    topic,
    [...new Set(Object.values(QUESTIONS_BY_STYLE).flatMap(s => s[topic] ?? []))],
  ])
);

// ═══════════════════════════════════════════════════════════════════
// RESPOSTAS — cientes do contexto real
// ═══════════════════════════════════════════════════════════════════

export const ANSWER_TEMPLATES = {

  warm_open: {
    MATCH_WIN: [
      ctx => `Cara, que dia. ${ctx.recentForm === 'cold' ? 'Vinha de uma sequência difícil e precisava muito dessa vitória — dá um alívio enorme.' : 'Estava sentindo que o jogo estava bom no treino, e hoje confirmou.'} Fico grato quando as coisas se encaixam assim.`,
      ctx => `Adoro esse tipo de partida. ${ctx.rivalName !== 'o adversário' ? `Jogar contra ${ctx.rivalName} exige o meu melhor` : 'Quando o adversário é forte e você tem que elevar o nível'}  — é aí que você descobre o que realmente construiu no treino.`,
      ctx => `${ctx.slamTitles > 0 ? `Já venci Grand Slams, então sei o peso de um título importante.` : `Cada vitória aqui tem um peso especial.`} ${ctx.dominantAttr ? `O ${ctx.dominantAttr} estava funcionando muito bem hoje.` : 'Estou muito satisfeito com o que apresentei.'}`,
      ctx => `A torcida estava incrível. Quando eles começaram a gritar no momento mais tenso, senti aquela energia. ${ctx.titles > 0 ? `Já passei por situações parecidas e aprendi a usar isso a favor.` : `É uma sensação que ainda estou aprendendo a canalizar.`}`,
    ],
    MATCH_LOSS: [
      ctx => `Vai doer. ${ctx.recentForm === 'cold' ? `Vinha de um período difícil e esperava que hoje fosse diferente.` : `Mas olho para o que fiz e sei que estou no caminho certo.`} Às vezes o adversário é melhor no dia — e hoje foi esse dia.`,
      ctx => `${ctx.titles > 0 ? `Já perdi antes e voltei mais forte — vou fazer o mesmo.` : `Ainda estou construindo a minha história aqui, e derrotas fazem parte disso.`} Aprendo, ajusto e volto.`,
      ctx => `Nesses momentos, ligo pro meu técnico${ctx.coachName ? ` — o ${ctx.coachName}` : ''} na noite do jogo. A gente analisa frio. Esse é o processo — sem mistério.`,
    ],
    RIVAL: [
      ctx => ctx.h2h && ctx.h2h.total >= 3
        ? `${ctx.rivalName} é especial. Nosso histórico é ${ctx.h2h.wins}–${ctx.h2h.losses} em ${ctx.h2h.total} jogos. ${ctx.h2h.wins > ctx.h2h.losses ? 'Eu levo a dianteira, mas cada jogo parece diferente.' : 'Ele está na frente, e isso me motiva a trabalhar mais.'}`
        : `${ctx.rivalName} é um dos melhores que já enfrentei. Quando estamos em quadra juntos, os dois elevam o jogo de um jeito que não consigo explicar.`,
      ctx => `Tenho muito respeito por ${ctx.rivalName}. ${ctx.h2h && ctx.h2h.total >= 5 ? `São ${ctx.h2h.total} confrontos ao longo da carreira — cada um ensina algo novo.` : `Fora da quadra é outro papo, mas dentro a gente se enfrenta pra valer.`}`,
    ],
    SURFACE: [
      ctx => `${ctx.bestSurface ? `O ${SURFACE_LABELS[ctx.bestSurface] ?? ctx.bestSurface} é onde me sinto mais em casa — os números da minha carreira mostram isso.` : `Cada superfície tem uma personalidade.`} ${ctx.surfaceLabel !== 'essa superfície' ? `O ${ctx.surfaceLabel} exige paciência, pede que você construa. Eu gosto disso.` : ''}`,
      ctx => `Quando era mais jovem tive que aprender a gostar ${ctx.surfaceLabel !== 'essa superfície' ? `do ${ctx.surfaceLabel}` : 'de cada superfície'}. Aí aprendi a ler o que ela pede e a conversa mudou completamente.`,
    ],
    CAREER: [
      ctx => `Quando olho para trás${ctx.titles > 0 ? `, com ${ctx.titles} título${ctx.titles > 1 ? 's' : ''}${ctx.slamTitles > 0 ? ` e ${ctx.slamTitles} Grand Slam${ctx.slamTitles > 1 ? 's' : ''}` : ''}` : ''}, fico surpreso com o caminho. Não era o favorito — mas sabia que tinha algo que não ia desaparecer.`,
      ctx => `${ctx.lastTitle ? `O ${ctx.lastTitle.name}${ctx.lastTitle.year ? ` em ${ctx.lastTitle.year}` : ''} ainda é uma memória muito viva` : `Tem um momento específico que mudou tudo pra mim`} — você percebe que construiu algo real, não apenas sorte.`,
      ctx => `${ctx.isVeteran ? `Com a experiência que tenho, vejo coisas que o jogador jovem que eu era jamais conseguiria enxergar.` : ctx.isRookie ? `Ainda estou no começo e aprendendo o que significa ser profissional de verdade.` : `Estou num momento em que consigo equilibrar experiência e energia.`}`,
    ],
    MEMORY: [
      ctx => `${ctx.favoriteTournamentMemory || ctx.memoryAnchor} Guardo isso com muito carinho porque carreira nao e so ranking; e onde voce descobre quem estava se tornando.`,
      ctx => `${ctx.hauntingTournamentMemory || ctx.memoryAnchor} Nao falo disso com tristeza o tempo todo, mas seria mentira dizer que nao me moldou.`,
      ctx => `${ctx.opponentMemory || ctx.memoryAnchor} Essas memorias ajudam a dar sentido ao caminho, principalmente quando a temporada vira uma sequencia de aeroportos e placares.`,
    ],
    PRESSURE: [
      ctx => `Aprendi a gostar da pressão. ${ctx.slamTitles > 0 ? `Venci Grand Slams — e cada um passou por momentos assim.` : `Ainda estou construindo essa relação com ela.`} Quando sinto a adrenalina subir num ponto decisivo, reconheço aquilo como sinal de que estou num lugar que importa.`,
      ctx => `Meu técnico${ctx.coachName ? ` — o ${ctx.coachName} —` : ''} tem uma frase: "a pressão é um privilégio." Demorei pra entender, mas é verdade. Só quem está num nível alto sente isso.`,
    ],
    PERSONAL:    [ctx => `Fora da quadra, sou bem tranquilo. Gosto de cozinhar quando estou em casa — é minha forma de desconectar. Tem algo relaxante em preparar uma comida boa para as pessoas que você ama.`, ctx => `A estrada é difícil, mas tem uma coisa que adoro: você conhece pessoas de todo o mundo. Meus melhores amigos hoje são de países completamente diferentes. O tênis me deu isso.`],
    BUSINESS:    [ctx => `${ctx.businessAnchor} Eu tento tratar marca como relação, não como placa atrás de coletiva. ${ctx.sponsorMemory || 'Quando alguém coloca o nome ao lado do seu, existe uma responsabilidade que vai além do cheque.'}`, ctx => `${ctx.businessProfileLine} Isso mexe com a carreira porque dá liberdade, mas também aumenta o tamanho da cobrança.`],
    PHILOSOPHY:  [ctx => `O tênis me ensinou que você não controla os resultados — controla o processo. ${ctx.titles > 3 ? `Levei anos para entender isso. Hoje é a base de tudo que faço.` : `Ainda estou aprendendo a viver assim.`}`, ctx => `${ctx.isVeteran ? `Depois de tantos anos no circuito, ` : ''}Acredito que o maior jogador não é o que tem mais títulos, mas o que extraiu o máximo de si mesmo.`],
    TRAINING:    [ctx => `Eu mudo constantemente o treino. ${ctx.coachName ? `O ${ctx.coachName} é muito bom nisso — a gente adapta de acordo com o momento.` : 'Odeio rotina por rotina — faço o que faz sentido.'} ${ctx.dominantAttr ? `Se preciso trabalhar o ${ctx.dominantAttr}, é o ${ctx.dominantAttr}.` : ''}`],
    FUTURE:      [ctx => `Ainda tenho muita coisa pra fazer. ${ctx.slamTitles === 0 && ctx.titles > 0 ? `Ainda não tenho um Grand Slam e isso me motiva mais do que qualquer outra coisa.` : ctx.slamTitles > 0 ? `Já conquistei muito, mas ainda consigo sentir que tem um nível que não atingi completamente.` : `Estou construindo e o melhor ainda está por vir.`}`],
    YOUNG_PLAYERS:[ctx => `Os jovens jogam sem medo. ${ctx.isVeteran ? `Como veterano, tenho que continuar evoluindo ou vou ficar pra trás. E não tenho a menor intenção de deixar isso acontecer.` : `Também sou relativamente novo no circuito — então entendo essa energia.`}`],
    INJURY:      [ctx => `A lesão me fez amar o tênis de outra forma. Você fica longe, vê outros jogando, e percebe o quanto precisa daquilo. Voltei com uma fome diferente.`, ctx => `Vou ser honesto: tive momentos de dúvida. Noites em que não sabia se o corpo ia responder. Mas a cabeça nunca deixou eu desistir.`],
  },

  brief_professional: {
    MATCH_WIN:    [ctx => `Executei o plano. ${ctx.dominantAttr ? `O ${ctx.dominantAttr} funcionou bem.` : 'O resultado apareceu.'} Próximo jogo.`, ctx => `${ctx.recentForm === 'cold' ? 'Precisava disso. O resultado é positivo — agora é manter o nível.' : 'Bom jogo. Tem coisas para ajustar, mas o balanço é positivo.'}`, ctx => `Contente com a vitória. ${ctx.titles > 0 ? 'Já passei por situações piores — a experiência ajuda.' : 'Ainda estou crescendo aqui.'}`],
    MATCH_LOSS:   [ctx => `Ele jogou melhor hoje. ${ctx.h2h && ctx.h2h.losses > ctx.h2h.wins ? `O histórico com ${ctx.rivalName} mostra que preciso resolver algo estrutural no jogo.` : 'Volto ao treino e resolvo.'} Sem desculpas.`, ctx => `${ctx.recentForm === 'cold' ? 'Sequência difícil. Tenho que trabalhar.' : 'Não foi meu melhor tênis.'} Aceito e sigo em frente.`],
    RIVAL:        [ctx => ctx.h2h ? `Histórico ${ctx.h2h.wins}–${ctx.h2h.losses} com ${ctx.rivalName}. ${ctx.h2h.losses > ctx.h2h.wins ? 'Preciso mudar essa equação.' : 'Estou na frente. Mantenho o foco.'}`  : `${ctx.rivalName} é bom. Respeito o nível. Foco no jogo.`],
    SURFACE:      [ctx => `${ctx.bestSurface && ctx.bestSurfaceLabel === ctx.surfaceLabel ? `Boa superfície para mim. Os resultados confirmam isso.` : `Superfície exigente. Tenho que me adaptar.`}`],
    CAREER:       [ctx => `${ctx.titles > 0 ? `${ctx.titles} título${ctx.titles > 1 ? 's' : ''} — ${ctx.slamTitles > 0 ? `${ctx.slamTitles} Grand Slam${ctx.slamTitles > 1 ? 's' : ''} — ` : ''}os números respondem.` : `Estou construindo. Falta ainda, mas o caminho está claro.`}`],
    MEMORY:       [ctx => `${ctx.favoriteTournamentMemory || ctx.memoryAnchor} Esse dado emocional importa porque mostra quando a curva da carreira mudou.`, ctx => `${ctx.opponentMemory || ctx.hauntingTournamentMemory || ctx.memoryAnchor} Eu trato isso como informacao competitiva, nao nostalgia.`],
    PRESSURE:     [ctx => `${ctx.slamTitles > 0 ? `Já joguei finais de Grand Slam. A pressão faz parte.` : `Aprendo a lidar com isso no dia a dia.`} Foco no que posso controlar.`],
    PERSONAL:     [ctx => `Prefiro manter a vida pessoal fora das câmeras. Funciona pra mim.`],
    BUSINESS:     [ctx => `${ctx.businessProfileLine} Eu olho para isso com objetividade: contrato bom é o que protege foco, calendário e independência.`, ctx => `${ctx.businessAnchor} O lado comercial importa, mas não pode comandar a rotina.`],
    TRAINING:     [ctx => `Treino com propósito. ${ctx.coachName ? `O ${ctx.coachName} define os objetivos e trabalhamos para atingi-los.` : 'Cada sessão tem um objetivo. Sem improviso.'}`],
    FUTURE:       [ctx => `${ctx.slamTitles === 0 && ctx.titles > 0 ? `Ainda falta o Grand Slam. Esse é o objetivo.` : ctx.slamTitles > 0 ? `Continuar competindo no mais alto nível.` : `Crescer. Simples assim.`}`],
    PHILOSOPHY:   [ctx => `Tênis é resultado de trabalho. ${ctx.titles > 5 ? 'Os títulos que tenho provam isso — não existe atalho.' : 'Acredito nisso e trabalho assim.'}`],
    INJURY:       [ctx => `Recuperação completa. ${ctx.coachName ? `Trabalhei com o ${ctx.coachName} para garantir que estava pronto.` : 'Fiz o trabalho necessário.'} Estou aqui.`],
    YOUNG_PLAYERS:[ctx => `Chegam bem preparados. ${ctx.isVeteran ? 'A experiência ainda conta — mas tenho que provar isso em quadra.' : 'Faz parte do circuito.'}`],
  },

  direct_provocative: {
    MATCH_WIN:    [ctx => `${ctx.recentForm === 'cold' ? 'Falaram que eu estava acabado. O placar de hoje é a minha resposta.' : 'Sabia que ia ganhar. Fui dominante.'}  Assim que é.`, ctx => `Não gosto de meias palavras. ${ctx.dominantAttr ? `Meu ${ctx.dominantAttr} foi dominante hoje.` : 'Eu fui dominante hoje.'} Ponto final.`],
    MATCH_LOSS:   [ctx => ctx.h2h && ctx.h2h.losses > ctx.h2h.wins ? `Já perdi pra ${ctx.rivalName} ${ctx.h2h.losses} vezes. Isso termina. Fica registrado.` : `Perdi. Hoje ele foi melhor. Mas não vai ser assim da próxima vez.`, ctx => `${ctx.recentForm === 'cold' ? 'Sequência ruim. Já sei o que fazer.' : 'Saio irritado, mas sei o que corrigir. E vou corrigir.'}`],
    RIVAL:        [ctx => ctx.h2h && ctx.h2h.total >= 3 ? `${ctx.rivalName} e eu — ${ctx.h2h.wins}–${ctx.h2h.losses}. ${ctx.h2h.losses > ctx.h2h.wins ? `Não estou satisfeito com essa série e vou inverter.` : `Estou na frente e pretendo manter.`}` : `Respeito o ${ctx.rivalName}. Mas dentro da quadra não tem amizade.`],
    SURFACE:      [ctx => `${ctx.bestSurfaceLabel === ctx.surfaceLabel ? `Essa é a minha superfície. Qualquer pessoa que sabe meu histórico sabe disso.` : `Não é onde me sinto mais confortável, mas não vou usar isso como desculpa.`}`],
    CAREER:       [ctx => `${ctx.titles > 0 ? `${ctx.titles} título${ctx.titles > 1 ? 's' : ''}. ${ctx.slamTitles > 0 ? `${ctx.slamTitles} Grand Slam${ctx.slamTitles > 1 ? 's' : ''}. Os números falam.` : 'Ainda quero o Grand Slam e vou buscar.'}` : `Ainda estou construindo. Mas quando chegar, não vai ser por acaso.`}`],
    MEMORY:       [ctx => `${ctx.hauntingTournamentMemory || ctx.opponentMemory || ctx.favoriteTournamentMemory || ctx.memoryAnchor} Nao esqueco. Algumas pessoas acham que passa; para mim vira combustivel.`, ctx => `${ctx.favoriteTournamentMemory || ctx.memoryAnchor} Ali eu provei algo. Para mim, isso vale mais do que muita opiniao solta.`],
    PRESSURE:     [ctx => `Pressão? ${ctx.slamTitles > 0 ? `Já joguei finais de Grand Slam. Isso aqui não é pressão.` : `Crescer dentro dela. Não existe outro caminho.`}`],
    PERSONAL:     [ctx => `Minha vida pessoal não é assunto de entrevista. Sou profissional do tênis.`],
    BUSINESS:     [ctx => `${ctx.businessProfileLine} Se o mercado acha pouco, que pague mais. Se acha muito, que prove em contrato. Eu jogo; eles calculam.`, ctx => `${ctx.businessAnchor} Gosto de parceria que entende vitória e crise. O resto é só logo bonito.`],
    TRAINING:     [ctx => `Treino mais do que a maioria. ${ctx.coachName ? `Tenho o ${ctx.coachName} do meu lado e esse processo não tem atalho.` : 'Não existe atalho.'}`],
    FUTURE:       [ctx => `${ctx.slamTitles === 0 ? `Vou ganhar um Grand Slam. Não é esperança, é intenção.` : `Quero mais. Enquanto o corpo responder e a cabeça quiser, estou aqui.`}`],
    PHILOSOPHY:   [ctx => `O tênis não mente. ${ctx.titles > 5 ? 'Os títulos que tenho são reflexo de trabalho — nada caiu do céu.' : 'Quem trabalha mais levado. Essa é minha filosofia.'}`],
    INJURY:       [ctx => `Voltei. ${ctx.isVeteran ? 'Falaram que talvez não voltasse. Aqui estou.' : 'Ninguém esperava tão rápido — mas eu sabia que estava pronto.'}`],
    YOUNG_PLAYERS:[ctx => `Que venham. ${ctx.isVeteran ? `Sou veterano — mas não sou museu. Que me derrubem em quadra.` : `A diferença é que eu quero mais do que qualquer um deles.`}`],
  },

  theatrical_warm: {
    MATCH_WIN:    [ctx => `Meu Deus, que dia! ${ctx.titles > 0 ? `Já venci antes, mas isso nunca cansa.` : `Primeira vez que sinto isso e preciso guardar bem essa sensação.`} A torcida, a quadra — tudo perfeito!`, ctx => `Isso é cinema! ${ctx.rivalName !== 'o adversário' ? `Jogar contra ${ctx.rivalName} é sempre espetacular — a gente transforma a quadra num palco.` : 'A partida foi daquelas que fazem o tênis ser tão especial.'}`],
    MATCH_LOSS:   [ctx => `Dói muito. Não vou fingir. Mas o tênis é assim — você chora hoje e volta amanhã mais forte. É o roteiro.`, ctx => `O adversário foi brilhante — reconheço. Mas o meu capítulo nessa história ainda não acabou.`],
    RIVAL:        [ctx => `${ctx.rivalName} e eu somos o que o circuito tem de melhor! ${ctx.h2h && ctx.h2h.total >= 3 ? `${ctx.h2h.total} confrontos e cada um foi uma obra de arte diferente.` : 'Cada confronto é um evento em si.'}`],
    SURFACE:      [ctx => `O ${ctx.surfaceLabel}! Não existe sensação igual. ${ctx.bestSurfaceLabel === ctx.surfaceLabel ? 'É a minha casa e sinto isso em cada passo.' : 'Cada superfície tem uma magia própria.'}`],
    CAREER:       [ctx => `É um conto de fadas! ${ctx.slamTitles > 0 ? `${ctx.slamTitles} Grand Slam${ctx.slamTitles > 1 ? 's' : ''} — e o garoto que eu era nem ousaria imaginar isso.` : `Ainda estou escrevendo os melhores capítulos.`}`],
    MEMORY:       [ctx => `${ctx.favoriteTournamentMemory || ctx.memoryAnchor} Isso e cinema para mim, daqueles capitulos que voce nao consegue reescrever nem se tentar.`, ctx => `${ctx.hauntingTournamentMemory || ctx.opponentMemory || ctx.memoryAnchor} Toda grande historia tem uma cicatriz. Eu tento transformar a minha em cena de virada.`],
    PRESSURE:     [ctx => `A pressão é o tempero da vida! Sem ela, o que é uma final? Nada. Com ela, é tudo.`],
    PERSONAL:     [ctx => `Sou igual dentro e fora da quadra — intenso, apaixonado, presente em cada momento.`],
    BUSINESS:     [ctx => `${ctx.businessAnchor} Existe um lado lindo nisso: uma marca pode pegar uma fase da sua vida e transformar em imagem, quase como pôster de um capítulo.`, ctx => `${ctx.businessProfileLine} Eu sei que tem negócio, dinheiro e contrato, mas para mim também tem história.`],
    TRAINING:     [ctx => `${ctx.coachName ? `O ${ctx.coachName} é parte da história também —` : 'O treino é onde o espetáculo começa —'} nos bastidores, na preparação, em cada detalhe.`],
    FUTURE:       [ctx => `Ainda tem muitos atos nessa peça! ${ctx.slamTitles === 0 ? 'O Grand Slam está no roteiro — pode ter certeza.' : 'O público merece mais — e eu vou dar.'}`],
    PHILOSOPHY:   [ctx => `O tênis é arte. Cada ponto é uma pincelada, cada set é um quadro. Amo esse esporte com tudo que tenho.`],
    INJURY:       [ctx => `Esse foi o capítulo mais difícil. Mas toda grande história tem o momento de virada — e essa é a minha.`],
    YOUNG_PLAYERS:[ctx => `Os jovens trazem energia nova para o show! O circuito só ganha com isso.`],
  },

  measured_safe: {
    MATCH_WIN:    [ctx => `Foi uma vitória que vai trazer confiança. ${ctx.recentForm === 'hot' ? 'Estou num bom momento e espero continuar assim.' : 'Precisava desse resultado para o ritmo da temporada.'}`, ctx => `Estou satisfeito com o nível apresentado. Tem aspectos para melhorar, mas o balanço é positivo.`],
    MATCH_LOSS:   [ctx => `Aceito o resultado. ${ctx.h2h && ctx.h2h.losses > ctx.h2h.wins ? `${ctx.rivalName} tem um padrão que me exige soluções específicas — vou trabalhar nisso.` : 'Houve momentos em que perdi o controle. É o que precisa mudar.'}`, ctx => `Derrota difícil. Mas faz parte. Vou analisar, entender o que aconteceu e voltar melhor.`],
    RIVAL:        [ctx => `${ctx.rivalName} é um dos melhores do circuito. ${ctx.h2h && ctx.h2h.total > 0 ? `Nosso histórico de ${ctx.h2h.total} confrontos fala por si só.` : 'Cada confronto é difícil e bem disputado.'} Respeito muito.`],
    SURFACE:      [ctx => `${ctx.surfaceLabel !== 'essa superfície' ? `O ${ctx.surfaceLabel} tem características específicas que precisamos gerenciar bem.` : 'Cada superfície tem suas demandas.'} ${ctx.bestSurfaceLabel === ctx.surfaceLabel ? 'Tenho um histórico positivo aqui.' : 'Estou trabalhando para me sentir mais confortável.'}`],
    CAREER:       [ctx => `${ctx.titles > 0 ? `Os títulos que conquistei representam o trabalho coletivo — eu, minha equipe, minha família.` : `A carreira está em construção. Cada temporada é um aprendizado.`} Estou grato pelo caminho.`],
    MEMORY:       [ctx => `${ctx.favoriteTournamentMemory || ctx.memoryAnchor} Tento olhar para isso com equilibrio: foi importante, mas tambem faz parte de um processo maior.`, ctx => `${ctx.hauntingTournamentMemory || ctx.opponentMemory || ctx.memoryAnchor} Sao referencias que usamos para aprender, nao para ficar preso nelas.`],
    PRESSURE:     [ctx => `A pressão faz parte do nível em que competimos. ${ctx.slamTitles > 0 ? 'Já estive em momentos decisivos — a experiência ajuda.' : 'Estou desenvolvendo ferramentas para lidar com ela da forma certa.'}`],
    PERSONAL:     [ctx => `Tenho uma vida equilibrada fora da quadra — família, descanso, hobbies simples. Isso mantém a cabeça no lugar.`],
    BUSINESS:     [ctx => `${ctx.businessProfileLine} Tento separar bem: patrocinador ajuda a carreira, mas a carreira precisa continuar sendo guiada pelo tênis.`, ctx => `${ctx.businessAnchor} É uma relação profissional, mas as melhores parcerias também respeitam a pessoa por trás do atleta.`],
    TRAINING:     [ctx => `${ctx.coachName ? `Trabalho com o ${ctx.coachName} num processo bem estruturado.` : 'Tenho uma equipe comprometida com um processo claro.'} Cada ciclo tem objetivos definidos.`],
    FUTURE:       [ctx => `O foco é continuar competindo em alto nível. ${ctx.slamTitles === 0 ? 'Um Grand Slam é um objetivo que trabalho para alcançar.' : 'Quero manter a consistência no topo.'}`],
    PHILOSOPHY:   [ctx => `Acredito no processo. ${ctx.titles > 0 ? 'Os resultados que conquistei são consequência de trabalho consistente.' : 'Estou confiante de que o trabalho vai se refletir nos resultados.'}`],
    INJURY:       [ctx => `O processo de recuperação foi cuidadoso. ${ctx.coachName ? `Contei com o apoio do ${ctx.coachName} e de toda a equipe.` : 'Tive o suporte necessário.'} Volto pronto para competir.`],
    YOUNG_PLAYERS:[ctx => `A nova geração chega com muita qualidade. ${ctx.isVeteran ? 'A competição fica mais forte e isso eleva o nível geral.' : 'Estamos todos aprendendo juntos.'}`],
  },

  sparse_deep: {
    MATCH_WIN:    [ctx => `${ctx.recentForm === 'cold' ? 'Às vezes você tem que ir ao fundo antes de subir.' : 'O que estava lá dentro saiu hoje.'} Simples assim.`, ctx => `Vitória. Mas o que mais importa não aparece no placar.`],
    MATCH_LOSS:   [ctx => `Perder também faz parte. ${ctx.titles > 0 ? 'Quem nunca perdeu não sabe o que ganhou de verdade.' : 'Estou aprendendo o que isso significa.'}`, ctx => `Não tenho respostas prontas agora. Vou precisar de silêncio para entender o que aconteceu.`],
    RIVAL:        [ctx => `${ctx.rivalName} e eu — é uma história que se escreve em quadra, não em palavras.`, ctx => `${ctx.h2h ? `${ctx.h2h.total} confrontos. Cada um mudou algo em mim.` : 'Essas rivalidades moldam quem você se torna.'}`],
    SURFACE:      [ctx => `O ${ctx.surfaceLabel} tem memórias. Boas e difíceis. Volto sempre para entender o que ele quer de mim.`],
    CAREER:       [ctx => `${ctx.slamTitles > 0 ? `Tenho o que tenho. O que importa é o que ainda não sei que vou encontrar.` : `Não há destino claro — só o caminho e o que ele ensina.`}`],
    MEMORY:       [ctx => `${ctx.favoriteTournamentMemory || ctx.memoryAnchor} Algumas lembrancas nao fazem barulho, mas ficam no corpo.`, ctx => `${ctx.hauntingTournamentMemory || ctx.opponentMemory || ctx.memoryAnchor} Talvez eu nao tenha entendido tudo na hora. Hoje entendo um pouco mais.`],
    PRESSURE:     [ctx => `Pressão existe quando você se esquece do motivo pelo qual está aqui. Quando lembro, ela desaparece.`],
    PERSONAL:     [ctx => `Vivo com intensidade. Dentro e fora da quadra.`],
    BUSINESS:     [ctx => `${ctx.businessAnchor} Dinheiro passa pela conta. Confiança fica no corpo. Eu lembro de quem chegou quando ainda havia dúvida.`, ctx => `${ctx.businessProfileLine} O risco é você virar produto antes de continuar sendo pessoa. Tento não cruzar essa linha.`],
    TRAINING:     [ctx => `O treino é onde o pensamento vira corpo. ${ctx.coachName ? `Com o ${ctx.coachName}, aprendi que isso tem uma linguagem própria.` : 'Leva tempo aprender essa linguagem.'}`],
    FUTURE:       [ctx => `Não penso muito no futuro. ${ctx.slamTitles === 0 ? 'O que não aconteceu ainda não me pertence.' : 'O que já aconteceu é suficiente para motivar o próximo passo.'}`],
    PHILOSOPHY:   [ctx => `O tênis ensina sobre si mesmo. Cada ponto é uma pergunta. As respostas vêm com o tempo.`],
    INJURY:       [ctx => `Lesão é o corpo falando o que a cabeça não quis ouvir. Ouvi. E mudei.`],
    YOUNG_PLAYERS:[ctx => `Os jovens vêm com respostas para perguntas que ainda não fizemos.`],
  },

  analytical_profound: {
    MATCH_WIN:    [ctx => `A vitória foi resultado de ajustes táticos específicos. ${ctx.dominantAttr ? `Meu ${ctx.dominantAttr} foi o vetor principal hoje.` : 'O padrão de jogo estabelecido funcionou.'} A análise pós-jogo vai confirmar o que sinto agora.`],
    MATCH_LOSS:   [ctx => `Existem padrões nessa derrota que preciso analisar. ${ctx.h2h && ctx.h2h.losses > ctx.h2h.wins ? `${ctx.rivalName} explora consistentemente vulnerabilidades no meu jogo — é um problema estrutural que preciso resolver.` : 'Houve momentos em que a tomada de decisão não foi ótima.'}`],
    RIVAL:        [ctx => `${ctx.rivalName} é fascinante do ponto de vista tático. ${ctx.h2h && ctx.h2h.total >= 3 ? `Em ${ctx.h2h.total} confrontos, cada um foi um estudo diferente.` : 'Cada confronto adiciona camadas à compreensão mútua.'} Esse tipo de rivalidade é raro.`],
    SURFACE:      [ctx => `O ${ctx.surfaceLabel} muda fundamentalmente a física do jogo. ${ctx.bestSurfaceLabel === ctx.surfaceLabel ? `Meu jogo está calibrado para essa superfície de forma mais natural.` : `Tenho que adaptar o modelo tático.`}`],
    CAREER:       [ctx => `${ctx.titles > 0 ? `${ctx.titles} título${ctx.titles > 1 ? 's' : ''}${ctx.slamTitles > 0 ? ` — incluindo ${ctx.slamTitles} Grand Slam${ctx.slamTitles > 1 ? 's' : ''} —` : ':'} são dados de resultado.` : `A carreira está em construção:`} o que me interessa é o processo que os gerou. Ou vai gerar.`],
    MEMORY:       [ctx => `${ctx.favoriteTournamentMemory || ctx.hauntingTournamentMemory || ctx.opponentMemory || ctx.memoryAnchor} Para mim, memoria competitiva e base de dados emocional: mostra padroes que estatistica pura nao captura.`, ctx => `${ctx.opponentMemory || ctx.memoryAnchor} Esse tipo de confronto informa treino, calendario e tomada de decisao futura.`],
    PRESSURE:     [ctx => `Pressão é uma variável de desempenho como qualquer outra. ${ctx.slamTitles > 0 ? 'Desenvolvi mecanismos testados para gerenciá-la em condições de máxima exigência.' : 'Estou desenvolvendo protocolos para gerenciá-la sistematicamente.'}`],
    PERSONAL:     [ctx => `Estruturo o tempo fora da quadra como parte do protocolo de performance — recuperação ativa, qualidade de sono, equilíbrio cognitivo. São variáveis controláveis.`],
    BUSINESS:     [ctx => `${ctx.businessProfileLine} Eu acompanho isso como acompanho dados de quadra: concentração de receita, categorias, exposição e custo de imagem.`, ctx => `${ctx.businessAnchor} Uma boa parceria comercial é uma variável de estabilidade; uma parceria errada vira ruído sistêmico.`],
    TRAINING:     [ctx => `${ctx.coachName ? `Trabalho com o ${ctx.coachName} numa metodologia baseada em dados e periodização rigorosa.` : 'Há uma distinção entre praticar e treinar com propósito.'} Volume importa menos do que qualidade de atenção em cada sessão.`],
    FUTURE:       [ctx => `Minha análise do circuito aponta para janelas de competitividade específicas. ${ctx.slamTitles === 0 ? 'O Grand Slam está nessa janela de planejamento.' : 'O objetivo é manter presença nessa janela pelo máximo de tempo possível.'}`],
    PHILOSOPHY:   [ctx => `O tênis é um sistema complexo e adaptativo. ${ctx.titles > 5 ? 'Aprendi isso empiricamente ao longo de anos de competição.' : 'Estou mapeando esse sistema e como me comporto dentro dele.'}`],
    INJURY:       [ctx => `A lesão me forçou a analisar padrões de movimento que existiam há anos mas nunca atingiram o limiar de manifestação. ${ctx.coachName ? `O ${ctx.coachName} e eu incorporamos isso ao protocolo de prevenção.` : 'Incorporei isso ao protocolo de prevenção.'}`],
    YOUNG_PLAYERS:[ctx => `Os jovens chegando ao circuito usam dados de uma forma que gerações anteriores não tinham disponível. Isso compensa experiência de quadra mais rapidamente do que esperávamos.`],
  },
};

// ═══════════════════════════════════════════════════════════════════
// buildRealCtx
// ═══════════════════════════════════════════════════════════════════

function buildRealCtx(player, state = {}, params = {}) {
  const { tournamentResults = {}, rankingStore = null, rivalrySystem = null } = state;
  const opponent = params.opponent ?? null;
  const surface  = params.surface ?? null;

  const titlesList = [];
  let slamTitles = 0, mastersTitles = 0;
  const surfaceWins = { CLAY:0, GRASS:0, HARD:0, INDOOR:0 };
  const recentResults = [];

  const sortedRes = Object.values(tournamentResults)
    .filter(r => r?.tournament)
    .sort((a,b) => ((b._season ?? b.tournament?.season ?? 0) - (a._season ?? a.tournament?.season ?? 0)));

  for (const res of sortedRes) {
    const { bracket, tournament, _season } = res;
    const year = _season ?? tournament?.season ?? null;
    if (!tournament) continue;

    if (res._slim) {
      if (res.champion?.id === player.id) {
        titlesList.push({ name:tournament.name, surface:tournament.surface, year, category:tournament.category });
        if (tournament.category === 'GRAND_SLAM') slamTitles++;
        if (tournament.category === 'MASTERS_1000') mastersTitles++;
      }
      continue;
    }
    if (!bracket) continue;

    if (bracket.champion?.id === player.id) {
      titlesList.push({ name:tournament.name, surface:tournament.surface, year, category:tournament.category });
      if (tournament.category === 'GRAND_SLAM') slamTitles++;
      if (tournament.category === 'MASTERS_1000') mastersTitles++;
    }

    let foundResult = false;
    for (let ri = (bracket.rounds?.length ?? 0) - 1; ri >= 0; ri--) {
      for (const match of bracket.rounds[ri]) {
        const pA = match.playerA ?? match.player1;
        const pB = match.playerB ?? match.player2;
        if (!pA || !pB) continue;
        if (pA.id === player.id || pB.id === player.id) {
          if (!foundResult && recentResults.length < 5) {
            recentResults.push(match.winner?.id === player.id ? 'W' : 'L');
            foundResult = true;
          }
          if (match.winner?.id === player.id && tournament.surface) {
            surfaceWins[tournament.surface] = (surfaceWins[tournament.surface] ?? 0) + 1;
          }
        }
      }
    }
  }

  const rankEntry = rankingStore?.ranked?.find(e => e.playerId === player.id);
  const currentRank = rankEntry?.position ?? player.rankPosition ?? player.initialRank ?? null;

  let h2h = null;
  if (opponent && rivalrySystem?.getRivalry) {
    try {
      const r = rivalrySystem.getRivalry(player.id, opponent.id);
      if (r && r.totalMatches > 0) {
        const isP1 = player.id < opponent.id;
        h2h = { wins: isP1 ? (r.p1Wins ?? 0) : (r.p2Wins ?? 0), losses: isP1 ? (r.p2Wins ?? 0) : (r.p1Wins ?? 0), total: r.totalMatches ?? 0 };
      }
    } catch(_) {}
  }

  const attrs = player.attrs ?? {};
  const dominantAttrKey = Object.entries(attrs).sort((a,b) => b[1]-a[1])[0]?.[0];
  const dominantAttr = ATTR_LABELS[dominantAttrKey] ?? null;
  const bestSurface = Object.entries(surfaceWins).sort((a,b) => b[1]-a[1]).find(e => e[1] > 0)?.[0] ?? null;
  const bestSurfaceLabel = bestSurface ? SURFACE_LABELS[bestSurface] : null;
  const recentWins = recentResults.filter(r => r === 'W').length;
  const recentForm = recentResults.length === 0 ? 'normal' : recentWins >= recentResults.length * 0.75 ? 'hot' : recentWins <= recentResults.length * 0.25 ? 'cold' : 'normal';
  const offCourt = getOffCourtState(player, params.season ?? state.currentSeason ?? null);
  const lastLifeEvent = (player.lifeEventLog ?? []).at(-1) ?? null;
  const memoryCtx = buildInterviewMemoryContext(player);
  const lifeWorld = buildInterviewLifeWorld(player);
  const sponsorWorld = buildInterviewSponsorWorld(player);
  const businessWorld = buildInterviewBusinessWorld(player, sponsorWorld);

  return {
    name: player.name ?? 'ele', nickname: player.nickname ?? player.name ?? 'ele',
    rivalName: opponent?.name ?? 'o adversário',
    tournament: params.tournament ?? 'o torneio',
    surfaceLabel: surface ? (SURFACE_LABELS[surface] ?? surface) : 'essa superfície',
    score: params.score ?? null, rank: currentRank, season: params.season ?? null,
    player, rival: opponent,
    titles: titlesList.length, slamTitles, mastersTitles, titlesList,
    lastTitle: titlesList[0] ?? null, h2h, dominantAttr, bestSurface, bestSurfaceLabel, recentForm,
    isVeteran: (player.age ?? 0) >= 30, isRookie: (player.age ?? 0) <= 21,
    coachName: player.coach?.name ?? null,
    offCourt,
    lifeHeadline: offCourt.headline,
    lifeSummary: offCourt.summary,
    lifeArcLabel: offCourt.arcLabel,
    lifeStabilityLabel: offCourt.stabilityLabel,
    lifePressureLabel: offCourt.pressureLabel,
    lifeDisciplineLabel: offCourt.disciplineLabel,
    lifeBurnoutLabel: offCourt.burnoutLabel,
    lifeSupportLabel: offCourt.supportLabel,
    lastLifeEvent,
    memory: memoryCtx,
    lifeWorld,
    sponsorWorld,
    businessWorld,
    favoriteTournamentMemory: memoryCtx.favoriteTournamentLine,
    hauntingTournamentMemory: memoryCtx.hauntingTournamentLine,
    opponentMemory: memoryCtx.opponentLine,
    memoryAnchor: memoryCtx.anchorLine,
    sponsorMemory: sponsorWorld.anchorLine,
    sponsorBreakthroughMemory: sponsorWorld.breakthroughLine,
    sponsorCampaignMemory: sponsorWorld.campaignLine,
    sponsorLoyaltyMemory: sponsorWorld.loyaltyLine,
    sponsorScarMemory: sponsorWorld.scarLine,
    businessAnchor: businessWorld.anchorLine,
    businessProfileLine: businessWorld.profileLine,
    businessHasSponsors: businessWorld.hasBusinessWorld,
    lifePlaceMemory: lifeWorld.placeLine,
    lifeFamilyMemory: lifeWorld.familyLine,
    lifeWealthMemory: lifeWorld.wealthLine,
    lifeValuesMemory: lifeWorld.valuesLine,
    lifePublicMemory: lifeWorld.publicLine,
    lifeWorldAnchor: lifeWorld.anchorLine,
  };
}

function buildInterviewBusinessWorld(player, sponsorWorld = {}) {
  const contracts = player?.activeContracts ?? [];
  const annual = contracts.reduce((sum, c) => sum + (Number(c.annualFee) || 0), 0);
  const anchor = [...contracts].sort((a, b) => (b.annualFee ?? 0) - (a.annualFee ?? 0))[0] ?? null;
  const anchorShare = annual > 0 && anchor ? Math.round(((anchor.annualFee ?? 0) / annual) * 100) : 0;
  const categories = Array.from(new Set(contracts.map(c => c.category).filter(Boolean)));
  const eliteCount = contracts.filter(c => c.tier === 'ELITE' || c.sponsorTier === 'ELITE').length;
  const careerSponsorMoney = player?.finance?.sponsorshipEarnings ?? annual;
  const fmt = v => {
    const n = Math.abs(Number(v) || 0);
    if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `$${Math.round(n / 1000)}K`;
    return `$${n}`;
  };

  const archetype =
    eliteCount >= 2 || annual >= 12_000_000 ? 'império global'
    : eliteCount >= 1 || annual >= 5_000_000 ? 'franquia premium'
    : contracts.length >= 3 || categories.length >= 3 ? 'portfólio diversificado'
    : contracts.length > 0 ? 'carteira em construção'
    : sponsorWorld?.hasSponsorWorld ? 'história comercial em reconstrução'
    : 'mercado ainda em formação';

  const risk =
    anchorShare >= 70 ? 'alta dependência de uma marca'
    : anchorShare >= 50 ? 'dependência moderada de uma marca âncora'
    : contracts.length > 0 ? 'receita bem distribuída'
    : 'sem concentração ativa';

  const anchorLine = anchor
    ? `${anchor.sponsorName} é a marca âncora hoje, respondendo por cerca de ${anchorShare}% da minha receita anual de patrocínio.`
    : sponsorWorld?.anchorLine || 'Hoje meu lado comercial ainda está sendo reconstruído passo a passo.';

  const profileLine = contracts.length > 0
    ? `Meu lado comercial hoje parece um ${archetype}: ${contracts.length} contrato${contracts.length > 1 ? 's' : ''}, ${categories.length} categoria${categories.length !== 1 ? 's' : ''}, ${fmt(annual)} por ano e ${risk}.`
    : `Comercialmente, ainda estou num estágio de ${archetype}. O histórico existe, mas preciso transformar resultado em carteira ativa de novo.`;

  return {
    contracts,
    annual,
    careerSponsorMoney,
    anchor,
    anchorShare,
    categories,
    eliteCount,
    archetype,
    risk,
    anchorLine,
    profileLine,
    hasBusinessWorld: contracts.length > 0 || !!sponsorWorld?.hasSponsorWorld,
  };
}

function buildInterviewSponsorWorld(player) {
  const sm = player?.sponsorMemory ?? {};
  const breakthrough = sm.favorites?.breakthrough ?? sm.breakthroughs?.[0] ?? null;
  const campaign = sm.favorites?.campaign ?? sm.campaigns?.[0] ?? null;
  const loyalty = sm.favorites?.loyalty ?? sm.loyalties?.[0] ?? null;
  const scar = sm.favorites?.scar ?? sm.scars?.[0] ?? null;
  const brand = sm.favorites?.brand ?? sm.relationships?.[0] ?? null;

  const breakthroughLine = sponsorMemoryPhrase(breakthrough);
  const campaignLine = sponsorMemoryPhrase(campaign);
  const loyaltyLine = sponsorMemoryPhrase(loyalty);
  const scarLine = sponsorMemoryPhrase(scar);
  const brandLine = sponsorMemoryPhrase(brand);

  return {
    breakthrough,
    campaign,
    loyalty,
    scar,
    brand,
    breakthroughLine,
    campaignLine,
    loyaltyLine,
    scarLine,
    brandLine,
    anchorLine: breakthroughLine || campaignLine || loyaltyLine || scarLine || brandLine || '',
    hasSponsorWorld: !!(breakthroughLine || campaignLine || loyaltyLine || scarLine || brandLine),
  };
}

function buildInterviewLifeWorld(player) {
  const lm = player?.lifeMemory ?? {};
  const ld = player?.lifeData ?? {};
  const place = lm.favorites?.places?.[0] ?? lm.places?.roots?.[0] ?? null;
  const family = lm.family?.anchors?.[0] ?? lm.family?.milestones?.[0] ?? lm.family?.joys?.[0] ?? lm.family?.strains?.[0] ?? null;
  const possession = lm.favorites?.possessions?.[0] ?? lm.lifestyle?.identity?.find(m => m.kind === 'money_philosophy') ?? null;
  const project = lm.favorites?.projects?.[0] ?? lm.values?.beliefs?.[0] ?? lm.values?.controversies?.[0] ?? null;
  const publicChapter = lm.favorites?.publicChapters?.find(m => m.kind?.includes('sponsor') || m.kind?.includes('business')) ?? lm.publicLife?.business?.[0] ?? null;
  const publicValues = ld.values?.publicValues ?? null;
  const wealth = ld.wealth?.lifestyle ?? null;

  const placeLine = lifePlacePhrase(place);
  const familyLine = lifeFamilyPhrase(family, ld);
  const wealthLine = lifeWealthPhrase(possession, wealth);
  const valuesLine = lifeValuesPhrase(project, publicValues);
  const publicLine = lifePublicChapterPhrase(publicChapter);
  return {
    place,
    family,
    possession,
    project,
    publicChapter,
    publicValues,
    wealth,
    placeLine,
    familyLine,
    wealthLine,
    valuesLine,
    publicLine,
    anchorLine: [familyLine, placeLine, publicLine, valuesLine, wealthLine].filter(Boolean)[0] ?? '',
    hasLifeWorld: !!(placeLine || familyLine || wealthLine || valuesLine || publicLine),
  };
}

function buildInterviewMemoryContext(player) {
  const memory = player?.careerMemory ?? {};
  const favorite = memory.favorites?.tournaments?.[0]
    ?? memory.tournaments?.beloved?.[0]
    ?? memory.tournaments?.sacred?.[0]
    ?? memory.tournaments?.provingGrounds?.[0]
    ?? null;
  const haunting = memory.tournaments?.haunting?.[0] ?? memory.tournaments?.painful?.[0] ?? null;
  const respected = memory.opponents?.respected?.[0] ?? null;
  const avoided = memory.favorites?.opponentsToAvoid?.[0] ?? memory.opponents?.stylisticProblems?.[0] ?? memory.opponents?.feared?.[0] ?? null;
  const profile = memory.opponents?.profiles?.[0] ?? null;
  const opponent = avoided ?? respected ?? profile ?? null;

  const favoriteTournamentLine = tournamentMemoryPhrase(favorite, 'favorite');
  const hauntingTournamentLine = tournamentMemoryPhrase(haunting, 'haunting');
  const opponentLine = opponentMemoryPhrase(opponent);
  return {
    favorite,
    haunting,
    opponent,
    favoriteTournamentLine,
    hauntingTournamentLine,
    opponentLine,
    anchorLine: favoriteTournamentLine || hauntingTournamentLine || opponentLine || 'Ainda estou construindo essas memorias. Algumas coisas so ficam claras anos depois.',
    hasMemory: !!(favoriteTournamentLine || hauntingTournamentLine || opponentLine),
  };
}

function tournamentMemoryPhrase(memory, mode) {
  if (!memory?.tournament?.name) return '';
  const name = memory.tournament.name;
  const year = memory.year ? ` de ${memory.year}` : '';
  const age = memory.playerAge ? `Eu tinha ${memory.playerAge} anos` : '';
  const reasons = new Set(memory.reasons ?? []);
  if (mode === 'haunting') {
    if (reasons.has('painful_upset_loss')) return `${name}${year} ainda me incomoda. ${age ? `${age}, ` : ''}e aquela derrota para um jogador que eu deveria controlar ficou comigo mais do que eu gostaria.`;
    if (reasons.has('close_late_loss')) return `${name}${year} ficou como uma porta entreaberta. Foi uma derrota grande, apertada, daquelas que voce revisita sem querer.`;
    return `${name}${year} e uma memoria dificil. Nao gosto de romantizar derrota, mas algumas derrotas ficam.`;
  }
  if (reasons.has('young_breakthrough')) return `${name}${year} tem um lugar especial. ${age ? `${age}, ` : ''}foi ali que eu senti que o circuito comecou a olhar para mim de outro jeito.`;
  if (reasons.has('won_through_physical_doubt')) return `${name}${year} e diferente para mim. Eu vinha com duvidas sobre o corpo, e sair dali com aquela resposta mudou muita coisa por dentro.`;
  if (reasons.has('major_title')) return `${name}${year} e sagrado. Tem torneio que voce vence, e tem torneio que passa a fazer parte de quem voce e.`;
  if (reasons.has('ranking_leap')) return `${name}${year} mudou minha carreira porque mudou meu lugar no circuito. De repente as pessoas estavam falando comigo de outro jeito.`;
  return `${name}${year} e uma lembranca forte. Nao foi so resultado; foi um daqueles momentos em que a carreira ganha forma.`;
}

function opponentMemoryPhrase(memory) {
  if (!memory?.opponentName) return '';
  const read = memory.matchupRead?.label ?? memory.matchupRead?.tacticalProblem ?? null;
  const score = memory.relationshipScore ?? (memory.matchContext?.won ? 2 : -2);
  if (score <= -3 || ['haunting', 'feared', 'stylistic_problem', 'problem'].includes(memory.relationship ?? memory.dominantRelationship)) {
    return `${memory.opponentName} e um nome que me obriga a aceitar desconforto. ${read ? `${read}.` : 'O encaixe nunca e simples.'} Tem adversario que te faz jogar bonito; ele me faz procurar solucao.`;
  }
  if (score >= 3 || ['comfortable'].includes(memory.relationship ?? memory.dominantRelationship)) {
    return `${memory.opponentName} e um confronto que eu gosto de jogar. ${read ? `${read}.` : 'Sinto que consigo ler bem o que vem do outro lado.'}`;
  }
  return `${memory.opponentName} me ensinou bastante. Nao e so rivalidade; e um tipo de espelho competitivo que mostra o que ainda precisa melhorar.`;
}

function sponsorMemoryPhrase(memory) {
  if (!memory?.sponsorName && !memory?.label) return '';
  const sponsor = memory.sponsorName ?? memory.label;
  const year = memory.year ? ` em ${memory.year}` : '';
  const age = memory.age ? `Eu tinha ${memory.age} anos` : '';
  if (memory.kind === 'commercial_breakthrough') {
    return `${sponsor}${year} marcou uma virada fora da quadra. ${age ? `${age}, ` : ''}foi quando percebi que minha carreira tambem tinha virado uma historia para o mundo comercial.`;
  }
  if (memory.kind === 'campaign_memory') {
    const campaign = memory.campaign ? `, naquela campanha de "${memory.campaign}"` : '';
    return `${sponsor}${campaign}${year} ficou na minha memoria porque nao era so propaganda; era uma fase da carreira sendo contada publicamente.`;
  }
  if (memory.kind === 'brand_loyalty') {
    return `Renovar com ${sponsor}${year} teve peso. No circuito, lealdade comercial nao e comum, entao quando uma marca atravessa fases boas e ruins com voce, isso fica.`;
  }
  if (memory.kind === 'brand_scar') {
    return `A saida de ${sponsor}${year} foi uma cicatriz. Ninguem gosta de admitir, mas perder uma marca importante tambem mexe com a forma como voce se enxerga.`;
  }
  return `${sponsor}${year} entrou na minha carreira num momento que eu nao esqueço. Algumas marcas viram so contrato; outras viram capitulo.`;
}

function lifePlacePhrase(memory) {
  if (!memory?.label) return '';
  const city = memory.city && memory.city !== memory.label ? ` em ${memory.city}` : '';
  if (memory.emotion === 'roots') return `${memory.label}${city} me lembra de onde tudo começou. Quando a temporada fica barulhenta, voltar mentalmente para esse lugar me organiza.`;
  if (memory.emotion === 'peace') return `${memory.label}${city} virou meu lugar de silêncio. Todo atleta precisa de um ponto no mapa onde não precisa provar nada.`;
  return `${memory.label}${city} tem um valor afetivo real para mim. Não é turismo; é um lugar que ficou misturado com a minha história.`;
}

function lifeFamilyPhrase(memory, lifeData) {
  if (!memory?.label) return '';
  if (memory.kind === 'child') return `${memory.label} mudou minha noção de tempo. Depois que você tem filho, uma vitória continua linda, mas ela volta para casa em outro tamanho.`;
  if (memory.kind === 'partner') {
    const dynamic = memory.dynamic?.label ?? lifeData?.personal?.partner?.dynamic?.label ?? null;
    return `${memory.label} conhece o pedaço da carreira que não aparece na câmera${dynamic ? `; a nossa dinâmica é muito de ${dynamic}` : ''}. Isso me dá chão.`;
  }
  if (memory.emotion === 'scar') return `Minha vida pessoal também teve cicatrizes. Eu tento não transformar isso em manchete, mas seria falso dizer que não me mudou.`;
  return `${memory.label} é uma parte importante do meu equilíbrio fora da quadra. Sem esse lado, o tênis fica grande demais.`;
}

function lifeWealthPhrase(memory, wealth) {
  const philosophy = wealth?.philosophy?.label;
  const quote = wealth?.moneyQuoteSeed;
  if (memory?.label && memory.kind?.includes('possession')) {
    return `${memory.label} pode parecer só luxo visto de fora, mas para mim fala de fase, liberdade e também de cuidado para não virar personagem da própria fama.`;
  }
  if (philosophy) return `Minha relação com dinheiro é mais próxima de ${philosophy}. ${quote ? quote[0].toUpperCase() + quote.slice(1) + '.' : 'Eu tento usar isso para comprar liberdade, não ansiedade.'}`;
  return '';
}

function lifeValuesPhrase(memory, publicValues) {
  if (memory?.label) {
    const risk = publicValues?.controversyRisk ?? memory.controversyRisk ?? 0;
    if (risk >= 65 || memory.emotion === 'friction') return `${memory.label} já me trouxe ruído, mas eu prefiro lidar com ruído a fingir que não tenho posição nenhuma.`;
    return `${memory.label} é uma causa que me acompanha de verdade. Eu não quero que seja só foto bonita depois de vitória.`;
  }
  if (publicValues?.stance?.label) return `Publicamente, tento agir como alguém de ${publicValues.stance.label}. ${publicValues.quoteSeed ?? 'Ter voz pública não pode ser só marketing.'}`;
  return '';
}

function lifePublicChapterPhrase(memory) {
  if (!memory?.label) return '';
  if (memory.kind?.includes('sponsor_scar')) return `${memory.label} virou um capítulo difícil da minha vida pública. Não foi só contrato; foi identidade, confiança e reconstrução.`;
  if (memory.kind?.includes('sponsor_loyalty')) return `${memory.label} é uma lembrança importante porque lealdade no esporte profissional não aparece todo dia. Quando uma marca fica, isso também vira história pessoal.`;
  if (memory.kind?.includes('sponsor_campaign')) return `${memory.label} marcou uma fase em que minha imagem saiu da quadra e ganhou outro tamanho.`;
  if (memory.kind?.includes('sponsor_breakthrough')) return `${memory.label} foi um daqueles sinais de que minha vida pública tinha mudado de escala.`;
  return `${memory.label} faz parte da minha história pública fora da quadra.`;
}

function augmentPersonalAnswer(answer, ctx) {
  if (!ctx?.offCourt) return answer;
  const fragments = [];
  if (ctx.lifeFamilyMemory) fragments.push(ctx.lifeFamilyMemory);
  if (ctx.lifePlaceMemory) fragments.push(ctx.lifePlaceMemory);
  if (ctx.offCourt.arcLabel) fragments.push(`Hoje eu me vejo num momento de ${ctx.offCourt.arcLabel.toLowerCase()}.`);
  if (ctx.offCourt.supportNetwork >= 66) fragments.push('Tenho uma rede muito forte fora da quadra, e isso muda a forma como atravesso o circuito.');
  else if (ctx.offCourt.supportNetwork <= 34) fragments.push('Tem sido uma fase mais solitária do que muita gente imagina, e isso pesa.');
  if (ctx.offCourt.burnoutRisk >= 70) fragments.push('Também precisei aprender a reconhecer cansaço real antes que ele contaminasse tudo.');
  else if (ctx.offCourt.discipline >= 70) fragments.push('Minha rotina ficou mais limpa e organizada, e esse tipo de ordem ajuda muito.');
  if (!fragments.length && ctx.lastLifeEvent?.description) fragments.push(`${ctx.lastLifeEvent.description}. Isso não passou em branco por dentro.`);
  return `${answer} ${pick(fragments)}`.trim();
}

function augmentMemoryAnswer(answer, ctx) {
  const fragments = [
    ctx.sponsorBreakthroughMemory,
    ctx.sponsorCampaignMemory,
    ctx.sponsorLoyaltyMemory,
    ctx.sponsorScarMemory,
    ctx.lifePlaceMemory,
    ctx.lifeFamilyMemory,
    ctx.lifeValuesMemory,
  ].filter(Boolean);
  if (!fragments.length) return answer;
  return `${answer} ${pick(fragments)}`.trim();
}

function augmentPhilosophyAnswer(answer, ctx) {
  const fragments = [
    ctx.lifeValuesMemory,
    ctx.lifeWealthMemory,
    ctx.lifeFamilyMemory,
    ctx.lifePublicMemory,
    ctx.sponsorMemory,
  ].filter(Boolean);
  if (!fragments.length) return answer;
  return `${answer} ${pick(fragments)}`.trim();
}

function augmentBusinessAnswer(answer, ctx) {
  const fragments = [
    ctx.sponsorCampaignMemory,
    ctx.sponsorLoyaltyMemory,
    ctx.sponsorScarMemory,
  ].filter(Boolean);
  if (!fragments.length) return answer;
  return `${answer} ${pick(fragments)}`.trim();
}

// ═══════════════════════════════════════════════════════════════════
// MANCHETE
// ═══════════════════════════════════════════════════════════════════

export function generateHeadline(contextId, player, ctx) {
  const name = player?.name ?? 'Jogador';
  const tournament = ctx?.tournament ?? '';
  const slamT = ctx?.slamTitles ?? 0;
  const titles = ctx?.titles ?? 0;
  const form = ctx?.recentForm ?? 'normal';
  const rivalName = ctx?.rivalName;

  const map = {
    POST_SLAM_WIN:    [ slamT > 1 ? `${name} reina de novo: ${slamT}º Grand Slam da carreira` : `O primeiro Grand Slam de ${name}`, `"${name.split(' ')[0]} eterno": campeão em ${tournament}`, `História escrita: ${name} conquista ${tournament}` ],
    POST_WIN:         [ form === 'hot' ? `Na melhor fase da temporada, ${name} não para` : `${name} supera dificuldades e avança em ${tournament}`, titles > 0 ? `Consistência absoluta: ${name} confirma favoritismo` : `${name} surpreende e avança no ${tournament}` ],
    POST_LOSS:        [ `${name} cai em ${tournament}${rivalName && rivalName !== 'o adversário' ? ` diante de ${rivalName}` : ''}`, form === 'cold' ? `Sequência difícil: ${name} segue sem vencer` : `Surpresa no ${tournament}: ${name} é eliminado` ],
    POST_UPSET_LOSS:  [ `Choque em ${tournament}: ${name} cai diante de azarão`, `Upset histórico: ${name} eliminado antes do esperado`, `${name} não explica — circuito em choque` ],
    OFF_SEASON:       [ `${name} abre o jogo: "Ainda tenho muito a dar"`, `Por dentro da vida de ${name} fora das quadras`, `O homem por trás do atleta: ${name} sem filtros` ],
    CAREER_MILESTONE: [ slamT > 2 ? `O legado de ${name}: números que reescrevem a história` : `Marco histórico na carreira de ${name}`, `"Não estava nos planos" — ${name} fala sobre a trajetória` ],
    INJURY_RETURN:    [ `${name} está de volta: "Voltei mais forte"`, `Fim da novela: ${name} retorna ao circuito` ],
    PRE_TOURNAMENT:   [ `${name}: "Estou pronto para ${tournament}"`, `A preparação de ${name} para o ${tournament}` ],
    RETIREMENT_ANNOUNCEMENT: [ `${name} anuncia a última temporada: "Quero sair do meu jeito"`, `${name} fala sobre o adeus: "Ainda não acabou, mas já mudou"`, `A última volta de ${name} começa com uma entrevista íntima` ],
    FAREWELL_TOUR:    [ `${name} encara mais um torneio sob a luz da despedida`, `Cada coletiva agora pesa diferente para ${name}`, `${name}: "Estou tentando viver isso sem deixar o jogo menor"` ],
    SCANDAL_RESPONSE: [ `${name} quebra o silêncio após a crise`, `Primeiras palavras de ${name} depois da suspensão`, `${name} fala publicamente pela primeira vez desde o escândalo` ],
    BREAKING_RETURN:  [ `${name} volta ao circuito depois de meses de silêncio e dor`, `${name}: "Houve um momento em que o tênis ficou muito longe"`, `A reaparição de ${name} reabre uma história maior do que o esporte` ],
    MONTHLY_PROFILE:  [ `${name} em entrevista do mês: carreira, vida e o peso da temporada`, `A conversa longa com ${name}: o que o ranking não mostra`, `${name} abre o mês falando de quadra, imagem e vida fora dela` ],
  };
  return pick(map[contextId] ?? [`Entrevista exclusiva: ${name}`]);
}

function hasRecentLife(player, year, monthIndex = null) {
  return (player?.lifeEventLog ?? []).some(e =>
    e.season === year && (monthIndex == null || e.monthIndex === monthIndex)
  );
}

function hasRecentSponsor(player, year) {
  return (player?.sponsorMemory?.all ?? []).some(m => m.year === year);
}

function hasRecentFinance(player, year, monthIndex = null) {
  return (player?.finance?.monthlyCostLog ?? []).some(e =>
    e.season === year && (monthIndex == null || e.monthIndex === monthIndex)
  );
}

function monthlyInterviewScore(player, state = {}, monthIndex = null) {
  const year = state?.year ?? null;
  const rank = player?.rankPosition ?? 999;
  let score = Math.max(0, 45 - rank);
  if (hasRecentLife(player, year, monthIndex)) score += 28;
  if (hasRecentSponsor(player, year)) score += 22;
  if (hasRecentFinance(player, year, monthIndex)) score += 10;
  if ((player?.careerMemory?.tournaments?.all?.length ?? 0) > 0) score += 12;
  if ((player?.careerMemory?.opponents?.all?.length ?? 0) > 0) score += 10;
  if ((player?.lifeMemory?.favorites?.projects?.length ?? 0) > 0) score += 8;
  if ((player?.activeContracts?.length ?? 0) > 0) score += 8;
  if (player?.breakingNews?.farewellTour?.active) score += 35;
  if (player?.injury?.active) score += 8;
  return score;
}

export function summarizeInterviewForPlayer(interview, fallbackQuote = '') {
  const leadAnswer = Array.isArray(interview?.pairs)
    ? interview.pairs.find(pair => typeof pair?.answer === 'string' && pair.answer.trim())
    : null;
  return {
    contextId: interview?.contextId ?? null,
    headline: interview?.headline ?? '',
    quote: leadAnswer?.answer ?? fallbackQuote ?? '',
    generatedAt: interview?.generatedAt ?? Date.now(),
    journalist: interview?.journalist
      ? {
          id: interview.journalist.id ?? null,
          name: interview.journalist.name ?? '',
          outlet: interview.journalist.outlet ?? '',
          icon: interview.journalist.icon ?? '',
        }
      : null,
  };
}

export function buildMonthlyInterviewOpportunity(state = {}, pulseResult = {}) {
  const monthly = (pulseResult.pulses ?? []).find(p => p.type === 'MONTHLY');
  if (!monthly) return null;

  const year = state.year ?? monthly.year ?? null;
  const monthIndex = monthly.monthIndex ?? pulseResult.timing?.monthIndex ?? null;
  const archive = state.monthlyInterviews ?? [];
  if (archive.some(item => item.year === year && item.monthIndex === monthIndex)) return null;

  const interviewedThisYear = new Set(
    archive.filter(item => item.year === year).map(item => item.playerId)
  );
  const candidates = (state.tourPlayers ?? [])
    .filter(p => (p.rankPosition ?? 999) <= 40 && !p.retired)
    .sort((a, b) => {
      const aRepeatPenalty = interviewedThisYear.has(a.id) ? 35 : 0;
      const bRepeatPenalty = interviewedThisYear.has(b.id) ? 35 : 0;
      return (monthlyInterviewScore(b, state, monthIndex) - bRepeatPenalty)
        - (monthlyInterviewScore(a, state, monthIndex) - aRepeatPenalty);
    });

  const player = candidates[0] ?? null;
  if (!player) return null;

  const hasLife = hasRecentLife(player, year, monthIndex);
  const hasSponsor = hasRecentSponsor(player, year);
  const hasFinance = hasRecentFinance(player, year, monthIndex);
  const journalist = hasLife ? JOURNALISTS.sofia
    : hasSponsor ? JOURNALISTS.david
    : (player.personality?.pressPersona?.id === 'CONFRONTATIONAL' ? JOURNALISTS.aleksei : JOURNALISTS.marina);

  return {
    id: `monthly_${year}_${monthIndex}_${player.id}`,
    contextId: 'MONTHLY_PROFILE',
    player,
    tournament: null,
    surface: null,
    category: 'MONTHLY_PROFILE',
    year,
    monthIndex,
    journalist,
    params: {
      season: year,
      year,
      monthIndex,
      monthlyInterview: true,
      hasLife,
      hasSponsor,
      hasFinance,
    },
  };
}

export function generateMonthlyInterviewFeature(state = {}, pulseResult = {}) {
  const opportunity = buildMonthlyInterviewOpportunity(state, pulseResult);
  if (!opportunity) return null;
  const interview = generateInterview(
    opportunity.player,
    opportunity.contextId,
    state,
    opportunity.params,
    7,
    opportunity.journalist,
  );
  return {
    id: opportunity.id,
    year: opportunity.year,
    monthIndex: opportunity.monthIndex,
    playerId: opportunity.player.id,
    playerName: opportunity.player.name,
    rankPosition: opportunity.player.rankPosition ?? null,
    interview,
    summary: summarizeInterviewForPlayer(interview),
    createdAt: Date.now(),
  };
}

export function generateGrandSlamChampionInterviewFeature(state = {}, tournament = null, champion = null, result = null) {
  if (!tournament || tournament.category !== 'GRAND_SLAM' || !champion) return null;
  const year = state.year ?? result?._season ?? tournament.season ?? null;
  const archive = state.grandSlamInterviews ?? [];
  const id = `slam_champion_${tournament.id}_${year}_${champion.id}`;
  if (archive.some(item => item.id === id)) return null;

  const interview = generateInterview(
    champion,
    'POST_SLAM_WIN',
    state,
    {
      tournament: tournament.name,
      surface: tournament.surface,
      season: year,
      year,
      grandSlamChampion: true,
    },
    8,
    pickJournalist('champion_slam'),
  );

  return {
    id,
    year,
    tournamentId: tournament.id,
    tournamentName: tournament.name,
    surface: tournament.surface,
    playerId: champion.id,
    playerName: champion.name,
    rankPosition: champion.rankPosition ?? null,
    interview,
    summary: summarizeInterviewForPlayer(interview),
    createdAt: Date.now(),
  };
}

// ═══════════════════════════════════════════════════════════════════
// DERIVAR OPORTUNIDADES
// ═══════════════════════════════════════════════════════════════════

export function deriveInterviewOpportunities(state) {
  const { tournamentResults = {}, tourPlayers = [], prospects = [] } = state ?? {};
  const allMap = Object.fromEntries([...tourPlayers, ...prospects].map(p => [p.id, p]));
  const opps = [];
  const seen = new Set();

  for (const slamInterview of [...(state?.grandSlamInterviews ?? [])].slice(-16).reverse()) {
    const player = allMap[slamInterview.playerId] ?? slamInterview.interview?.player ?? null;
    if (!player) continue;
    const id = slamInterview.id ?? `slam_champion_${slamInterview.tournamentId}_${slamInterview.year}_${slamInterview.playerId}`;
    if (seen.has(id)) continue;
    seen.add(id);
    opps.push({
      id,
      contextId: 'POST_SLAM_WIN',
      player,
      tournament: slamInterview.tournamentName ?? null,
      surface: slamInterview.surface ?? null,
      category: 'GRAND_SLAM',
      year: slamInterview.year,
      journalist: slamInterview.interview?.journalist ?? JOURNALISTS.marina,
      params: {
        tournament: slamInterview.tournamentName,
        surface: slamInterview.surface,
        season: slamInterview.year,
        grandSlamChampion: true,
      },
      publishedInterview: slamInterview.interview ?? null,
    });
  }

  for (const monthly of [...(state?.monthlyInterviews ?? [])].slice(-12).reverse()) {
    const player = allMap[monthly.playerId] ?? monthly.interview?.player ?? null;
    if (!player) continue;
    const id = monthly.id ?? `monthly_${monthly.year}_${monthly.monthIndex}_${monthly.playerId}`;
    if (seen.has(id)) continue;
    seen.add(id);
    opps.push({
      id,
      contextId: 'MONTHLY_PROFILE',
      player,
      year: monthly.year,
      monthIndex: monthly.monthIndex,
      category: 'MONTHLY_PROFILE',
      journalist: monthly.interview?.journalist ?? JOURNALISTS.marina,
      params: { season: monthly.year, year: monthly.year, monthIndex: monthly.monthIndex, monthlyInterview: true },
      publishedInterview: monthly.interview ?? null,
    });
  }

  const sortedRes = Object.values(tournamentResults)
    .filter(r => r?.tournament)
    .sort((a,b) => ((b._season ?? b.tournament?.season ?? 0) - (a._season ?? a.tournament?.season ?? 0)))
    .slice(0, 30);

  for (const res of sortedRes) {
    const { bracket, tournament, _season } = res;
    if (!tournament) continue;
    const year   = _season ?? tournament.season ?? null;
    const isSlam = tournament.category === 'GRAND_SLAM';

    // Campeão
    let champObj = null;
    if (res._slim) champObj = res.champion ? allMap[res.champion.id] : null;
    else if (bracket?.champion) champObj = allMap[bracket.champion.id];

    if (champObj) {
      const id = `win_${tournament.id}_${year}`;
      if (!seen.has(id)) {
        seen.add(id);
        opps.push({ id, contextId: isSlam ? 'POST_SLAM_WIN' : 'POST_WIN', player: champObj, tournament: tournament.name, surface: tournament.surface, category: tournament.category, year, journalist: pickJournalist(isSlam ? 'champion_slam' : 'champion'), params: { tournament: tournament.name, surface: tournament.surface, season: year } });
      }
    }

    if (res._slim || !bracket?.rounds?.length) continue;

    // Finalista (perdedor da final)
    const finalRound = bracket.rounds[bracket.rounds.length - 1];
    if (finalRound?.[0] && champObj) {
      const fm = finalRound[0];
      const loserRaw = fm.winner?.id === fm.playerA?.id ? fm.playerB : fm.playerA;
      const loserObj = loserRaw ? allMap[loserRaw.id] : null;
      if (loserObj && loserObj.id !== champObj.id) {
        const id = `loss_${tournament.id}_${year}`;
        if (!seen.has(id)) {
          seen.add(id);
          opps.push({ id, contextId: 'POST_LOSS', player: loserObj, tournament: tournament.name, surface: tournament.surface, category: tournament.category, year, journalist: pickJournalist('finalist'), params: { tournament: tournament.name, surface: tournament.surface, season: year, opponent: champObj } });
        }
      }
    }

    // Upset top-10 eliminado por top-50+
    for (const round of bracket.rounds.slice(0, bracket.rounds.length - 1)) {
      let foundUpset = false;
      for (const match of round) {
        const w = allMap[match.winner?.id];
        const lRaw = match.winner?.id === match.playerA?.id ? match.playerB : match.playerA;
        const l = lRaw ? allMap[lRaw.id] : null;
        if (!w || !l) continue;
        if ((l.rankPosition ?? 999) <= 10 && (w.rankPosition ?? 999) >= 40) {
          const id = `upset_${tournament.id}_${l.id}_${year}`;
          if (!seen.has(id)) {
            seen.add(id);
            opps.push({ id, contextId: 'POST_UPSET_LOSS', player: l, tournament: tournament.name, surface: tournament.surface, category: tournament.category, year, journalist: pickJournalist('upset_victim'), params: { tournament: tournament.name, surface: tournament.surface, season: year, opponent: w } });
            foundUpset = true;
          }
          break;
        }
      }
      if (foundUpset) break;
    }
  }

  for (const player of tourPlayers) {
    const breaking = player.breakingNews ?? {};
    if (breaking.farewellTour?.active) {
      const id = `farewell_${player.id}_${state?.year ?? 'season'}`;
      if (!seen.has(id)) {
        seen.add(id);
        opps.push({
          id,
          contextId: breaking.farewellTour.announcedYear === (state?.year ?? null) ? 'RETIREMENT_ANNOUNCEMENT' : 'FAREWELL_TOUR',
          player,
          tournament: null,
          surface: null,
          category: 'BREAKING',
          year: state?.year ?? null,
          journalist: pickJournalist('champion'),
          params: { season: state?.year ?? null },
        });
      }
    }
    if (breaking.scandal?.status === 'RETURNING' || breaking.scandal?.active) {
      const id = `scandal_${player.id}_${state?.year ?? 'season'}`;
      if (!seen.has(id)) {
        seen.add(id);
        opps.push({
          id,
          contextId: 'SCANDAL_RESPONSE',
          player,
          tournament: null,
          surface: null,
          category: 'BREAKING',
          year: state?.year ?? null,
          journalist: pickJournalist('upset_victim'),
          params: { season: state?.year ?? null },
        });
      }
    }
    if (breaking.healthCrisis?.status === 'RETURNING' || breaking.personalCrisis?.active) {
      const id = `breaking_return_${player.id}_${state?.year ?? 'season'}`;
      if (!seen.has(id)) {
        seen.add(id);
        opps.push({
          id,
          contextId: 'BREAKING_RETURN',
          player,
          tournament: null,
          surface: null,
          category: 'BREAKING',
          year: state?.year ?? null,
          journalist: pickJournalist('champion'),
          params: { season: state?.year ?? null },
        });
      }
    }
  }

  return opps;
}

// ═══════════════════════════════════════════════════════════════════
// FUNÇÕES PÚBLICAS
// ═══════════════════════════════════════════════════════════════════

function selectTopics(contextId, player, params, count = 6) {
  const ctx = INTERVIEW_CONTEXTS[contextId];
  if (!ctx) return [];
  const weights = { ...ctx.topicWeights };
  if (!params.opponent) delete weights.RIVAL;
  if (!player?.careerMemory?.tournaments?.all?.length && !player?.careerMemory?.opponents?.all?.length && !player?.lifeMemory && !player?.sponsorMemory?.all?.length) delete weights.MEMORY;
  if (!player?.activeContracts?.length && !player?.sponsorMemory?.all?.length) delete weights.BUSINESS;
  const currentYear = params.season ?? params.year ?? null;
  const recentLife = (player?.lifeEventLog ?? []).some(e => !currentYear || e.season === currentYear);
  const recentFinancePressure = (player?.finance?.monthlyCostLog ?? []).some(e => !currentYear || e.season === currentYear);
  const recentSponsor = (player?.sponsorMemory?.all ?? []).some(m => !currentYear || m.year === currentYear);
  if (recentLife && weights.PERSONAL) weights.PERSONAL += 12;
  if (recentFinancePressure && weights.PRESSURE) weights.PRESSURE += 6;
  if (recentSponsor && weights.BUSINESS) weights.BUSINESS += 10;
  if ((recentLife || recentSponsor) && weights.MEMORY) weights.MEMORY += 8;
  if (!player.injury?.active && weights.INJURY) weights.INJURY = Math.floor((weights.INJURY ?? 0) * 0.3);
  const pool = Object.entries(weights).map(([id, weight]) => ({ id, weight }));
  const selected = [];
  const remaining = [...pool];
  for (let i = 0; i < Math.min(count, pool.length); i++) {
    const total = remaining.reduce((s, x) => s + x.weight, 0);
    let r = Math.random() * total;
    for (let j = 0; j < remaining.length; j++) {
      r -= remaining[j].weight;
      if (r <= 0) { selected.push(remaining[j].id); remaining.splice(j, 1); break; }
    }
  }
  return selected;
}

function getTone(player) {
  return player?.personality?.pressPersona?.interviewTone ?? player?.pressPersona?.interviewTone ?? 'measured_safe';
}

export function generateSingleQA(player, topicId, params = {}) {
  const tone    = getTone(player);
  const ctx     = buildRealCtx(player, params._state ?? {}, params);
  const jStyle  = params._journalistStyle ?? null;
  const styledQ = jStyle ? (QUESTIONS_BY_STYLE[jStyle]?.[topicId] ?? []) : [];
  const allQ    = [...styledQ, ...(QUESTION_BANKS[topicId] ?? [])];
  const templates = ANSWER_TEMPLATES[tone]?.[topicId] ?? ANSWER_TEMPLATES['measured_safe']?.[topicId] ?? [];
  if (allQ.length === 0 || templates.length === 0) return null;
  const rawQ = pick(allQ);
  const question = rawQ.replace(/\{rival\}/g, ctx.rivalName).replace(/\{tournament\}/g, ctx.tournament).replace(/\{surface\}/g, ctx.surfaceLabel);
  const answerFn = pick(templates);
  let answer = answerFn ? answerFn(ctx) : '';
  if (topicId === 'PERSONAL') answer = augmentPersonalAnswer(answer, ctx);
  if (topicId === 'MEMORY') answer = augmentMemoryAnswer(answer, ctx);
  if (topicId === 'BUSINESS') answer = augmentBusinessAnswer(answer, ctx);
  if (topicId === 'PHILOSOPHY') answer = augmentPhilosophyAnswer(answer, ctx);
  return { topic: topicId, question, answer };
}

export function generateInterview(player, contextId = 'POST_WIN', state = {}, params = {}, questionCount = 6, journalist = null) {
  const context = INTERVIEW_CONTEXTS[contextId] ?? INTERVIEW_CONTEXTS.POST_WIN;
  let resolvedParams = { ...params };

  if (!resolvedParams.opponent && state.rivalrySystem) {
    try {
      const rivals = state.rivalrySystem.getPlayerRivalries?.(player.id) ?? [];
      if (rivals.length > 0) {
        const r = rivals[0];
        const rivalId = r.player1Id === player.id ? r.player2Id : r.player1Id;
        const allMap  = Object.fromEntries([...(state.tourPlayers ?? []), ...(state.prospects ?? [])].map(p => [p.id, p]));
        const rivalObj = allMap[rivalId];
        if (rivalObj) resolvedParams = { ...resolvedParams, opponent: rivalObj };
      }
    } catch(_) {}
  }

  const journalistObj = journalist ?? JOURNALISTS.marina;
  const topics = selectTopics(contextId, player, resolvedParams, questionCount);
  const pairs  = topics.map(t => generateSingleQA(player, t, { ...resolvedParams, _state: state, _journalistStyle: journalistObj.style })).filter(Boolean);
  const ctx      = buildRealCtx(player, state, resolvedParams);
  const headline = generateHeadline(contextId, player, ctx);

  return { contextId, context, tone: getTone(player), player, params: resolvedParams, pairs, journalist: journalistObj, headline, generatedAt: Date.now() };
}

export function generateSingleAnswer(player, topicId, params = {}) {
  return generateSingleQA(player, topicId, params)?.answer ?? '';
}

export const TOPIC_IDS = Object.keys(QUESTION_BANKS);
export const TOPIC_META = {
  MATCH_WIN:{ label:'Pós-vitória', icon:'🏆' }, MATCH_LOSS:{ label:'Pós-derrota', icon:'😶' },
  RIVAL:{ label:'Rivalidade', icon:'⚔️' }, SURFACE:{ label:'Superfície', icon:'🎾' },
  CAREER:{ label:'Carreira', icon:'📌' }, MEMORY:{ label:'Memórias', icon:'🧠' }, PRESSURE:{ label:'Pressão', icon:'🔥' },
  PERSONAL:{ label:'Vida pessoal', icon:'🏠' }, BUSINESS:{ label:'Negócios', icon:'🤝' }, PHILOSOPHY:{ label:'Filosofia', icon:'💭' },
  FUTURE:{ label:'Futuro', icon:'🔭' }, TRAINING:{ label:'Treino', icon:'💪' },
  YOUNG_PLAYERS:{ label:'Jovens jogadores', icon:'🌱' }, INJURY:{ label:'Lesão / retorno', icon:'🏥' },
};

