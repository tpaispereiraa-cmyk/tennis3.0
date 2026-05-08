/**
 * LifeEventSystem.js — v3.0
 * ─────────────────────────────────────────────────────────────────
 * Sistema de eventos de vida fora da quadra.
 * Gera eventos que acontecem com jogadores ao longo das temporadas,
 * enriquecendo o mundo e alimentando o jornalismo e entrevistas.
 *
 * CATEGORIAS E TIPOS (~100 eventos):
 *
 *   PERSONAL   — relacionamento, família, saúde pessoal
 *   HOME       — residência, propriedades, patrimônio
 *   SOCIAL     — causas, filantropia, comunidade, política
 *   BUSINESS   — negócios, investimentos, empreendedorismo
 *   MEDIA      — mídia, visibilidade, entretenimento
 *   CONTROVERSY— polêmicas, escândalos, incidentes
 *   COMMUNITY  — país natal, heróis nacionais, educação
 *   SPIRITUAL  — religião, retiro, reorientação pessoal
 *   CAREER     — marcos e crises de carreira fora da quadra
 *   WELLNESS   — saúde, corpo, rotinas públicas de bem-estar
 *
 * Chamar rollLifeEvents() no ADVANCE_YEAR, após processPersonalityEvolution.
 */

// ═══════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function chance(p) { return Math.random() < p; }
function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function weighted(items) {
  const total = items.reduce((s, i) => s + i.weight, 0);
  let r = Math.random() * total;
  for (const item of items) { r -= item.weight; if (r <= 0) return item.id ?? item; }
  return items[items.length - 1].id ?? items[items.length - 1];
}

// ═══════════════════════════════════════════════════════════════════
// DEFINIÇÕES DE EVENTOS
// ═══════════════════════════════════════════════════════════════════

export const LIFE_EVENT_TYPES = {

  // ────────────────────────────────────────────────────────────────
  // PERSONAL — relacionamento e família
  // ────────────────────────────────────────────────────────────────

  ENGAGEMENT: {
    id: 'ENGAGEMENT', category: 'PERSONAL', label: 'Noivado', icon: '💍',
    newsworthy: true, marketImpact: +3,
    condition: p => p.lifeData?.personal?.relationshipStatus?.id === 'DATING'
                    && (p.age ?? 25) >= 21,
    apply: p => setRelStatus(p, 'ENGAGED'),
    describe: p => `${p.name} anuncia noivado`,
  },

  MARRIAGE: {
    id: 'MARRIAGE', category: 'PERSONAL', label: 'Casamento', icon: '👰',
    newsworthy: true, marketImpact: +5,
    condition: p => {
      const rs = p.lifeData?.personal?.relationshipStatus?.id;
      return rs === 'ENGAGED' || (rs === 'DATING' && (p.age ?? 25) >= 24 && chance(0.2));
    },
    apply: p => setRelStatus(p, 'MARRIED'),
    describe: p => {
      const partner = p.lifeData?.personal?.partner;
      return partner?.public ? `${p.name} se casa com ${partner.label.toLowerCase()}` : `${p.name} se casa`;
    },
  },

  SEPARATION: {
    id: 'SEPARATION', category: 'PERSONAL', label: 'Separação', icon: '💔',
    newsworthy: true, marketImpact: -2,
    condition: p => p.lifeData?.personal?.relationshipStatus?.id === 'MARRIED'
                    && (p.age ?? 30) >= 25,
    apply: p => setRelStatus(p, 'SEPARATED', true),
    describe: p => `${p.name} confirma separação`,
  },

  DIVORCE: {
    id: 'DIVORCE', category: 'PERSONAL', label: 'Divórcio', icon: '📋',
    newsworthy: true, marketImpact: -3,
    condition: p => p.lifeData?.personal?.relationshipStatus?.id === 'SEPARATED',
    apply: p => setRelStatus(p, 'DIVORCED', true),
    describe: p => `${p.name} conclui processo de divórcio`,
  },

  CHILD_BORN: {
    id: 'CHILD_BORN', category: 'PERSONAL', label: 'Nascimento de filho', icon: '👶',
    newsworthy: true, marketImpact: +4,
    condition: p => {
      const rs = p.lifeData?.personal?.relationshipStatus?.id;
      const age = p.age ?? 25;
      return (rs === 'MARRIED' || rs === 'ENGAGED') && age >= 22 && age <= 38;
    },
    apply: p => addChild(p),
    describe: p => {
      const n = p.lifeData?.personal?.children?.count ?? 1;
      return n === 1 ? `${p.name} anuncia nascimento do primeiro filho`
                     : `${p.name} se torna pai pela ${n}ª vez`;
    },
  },

  TWINS_BORN: {
    id: 'TWINS_BORN', category: 'PERSONAL', label: 'Nascimento de gêmeos', icon: '👶👶',
    newsworthy: true, marketImpact: +6,
    condition: p => {
      const rs = p.lifeData?.personal?.relationshipStatus?.id;
      return (rs === 'MARRIED') && (p.age ?? 25) >= 23 && (p.age ?? 25) <= 36
             && !hasEventOccurred(p, 'TWINS_BORN');
    },
    apply: p => addChild(addChild(p)),
    describe: p => `${p.name} anuncia nascimento de gêmeos`,
  },

  ADOPTION: {
    id: 'ADOPTION', category: 'PERSONAL', label: 'Adoção', icon: '🤲',
    newsworthy: true, marketImpact: +7,
    condition: p => {
      const rs = p.lifeData?.personal?.relationshipStatus?.id;
      return (rs === 'MARRIED' || rs === 'SINGLE') && (p.age ?? 25) >= 26
             && !hasEventOccurred(p, 'ADOPTION');
    },
    apply: p => addChild(p),
    describe: p => `${p.name} adota criança`,
  },

  NEW_PARTNER: {
    id: 'NEW_PARTNER', category: 'PERSONAL', label: 'Novo relacionamento', icon: '❤️',
    newsworthy: true, marketImpact: +2,
    condition: p => {
      const rs = p.lifeData?.personal?.relationshipStatus?.id;
      return ['SINGLE', 'DIVORCED', 'SEPARATED'].includes(rs) && (p.age ?? 25) >= 19;
    },
    apply: p => setRelStatus(p, 'DATING', false, true),
    describe: p => {
      const partner = p.lifeData?.personal?.partner;
      return partner?.public ? `${p.name} é visto com ${partner.label.toLowerCase()}`
                             : `${p.name} teria novo relacionamento, diz imprensa`;
    },
  },

  AFFAIR_RUMOR: {
    id: 'AFFAIR_RUMOR', category: 'PERSONAL', label: 'Rumor de caso extraconjugal', icon: '👀',
    newsworthy: true, marketImpact: -6,
    condition: p => p.lifeData?.personal?.relationshipStatus?.id === 'MARRIED'
                    && p.personality?.pressPersona?.id === 'CONFRONTATIONAL',
    apply: p => p,
    describe: p => `Imprensa especula sobre suposto caso extraconjugal de ${p.name}`,
  },

  FAMILY_LOSS: {
    id: 'FAMILY_LOSS', category: 'PERSONAL', label: 'Perda na família', icon: '🕊️',
    newsworthy: true, marketImpact: 0,
    condition: p => (p.age ?? 25) >= 24 && !hasEventOccurred(p, 'FAMILY_LOSS'),
    apply: p => p,
    describe: p => `${p.name} comunica perda de familiar próximo`,
  },

  MENTAL_HEALTH_BREAK: {
    id: 'MENTAL_HEALTH_BREAK', category: 'PERSONAL', label: 'Pausa para saúde mental', icon: '🧠',
    newsworthy: true, marketImpact: +2,
    condition: p => (p.personality?.currentState?.pressureLevel ?? 0) >= 75
                    && !hasEventOccurred(p, 'MENTAL_HEALTH_BREAK'),
    apply: p => p,
    describe: p => `${p.name} anuncia pausa para cuidar da saúde mental`,
  },

  // ────────────────────────────────────────────────────────────────
  // HOME
  // ────────────────────────────────────────────────────────────────

  MOVE_TO_TAX_HAVEN: {
    id: 'MOVE_TO_TAX_HAVEN', category: 'HOME', label: 'Mudança para paraíso fiscal', icon: '🏠',
    newsworthy: false, marketImpact: 0,
    condition: p => (p.personality?.marketability?.score ?? 0) > 55 && !p.lifeData?.home?.taxHaven,
    apply: p => {
      const cities = [
        { city: 'Monte Carlo', country: 'MON' },
        { city: 'Geneva', country: 'CHE' },
        { city: 'Dubai', country: 'UAE' },
        { city: 'Nassau', country: 'BAH' },
        { city: 'Mônaco', country: 'MON' },
      ];
      const chosen = pick(cities);
      const np = deepClone(p);
      np.lifeData.home = { ...chosen, taxHaven: true };
      return np;
    },
    describe: p => `${p.name} muda residência para ${p.lifeData?.home?.city ?? 'paraíso fiscal'}`,
  },

  NEW_PROPERTY: {
    id: 'NEW_PROPERTY', category: 'HOME', label: 'Nova propriedade', icon: '🏡',
    newsworthy: false, marketImpact: +1,
    condition: p => ['WEALTHY','VERY_WEALTHY','BILLIONAIRE_TIER'].includes(p.lifeData?.wealth?.tier?.id),
    apply: p => {
      const np = deepClone(p);
      const options = ['casa de praia','villa no sul da França','penthouse em Miami',
                       'rancho no interior','apartamento em Londres','casa em Ibiza',
                       'villa em Mallorca','cobertura em Dubai','chácara em Portugal'];
      const already = new Set(np.lifeData.wealth.possessions ?? []);
      const available = options.filter(o => !already.has(o));
      if (available.length > 0) (np.lifeData.wealth.possessions = np.lifeData.wealth.possessions ?? []).push(pick(available));
      return np;
    },
    describe: p => `${p.name} adquire nova propriedade`,
  },

  LUXURY_CAR: {
    id: 'LUXURY_CAR', category: 'HOME', label: 'Carro de luxo', icon: '🚗',
    newsworthy: false, marketImpact: +1,
    condition: p => ['WEALTHY','VERY_WEALTHY','BILLIONAIRE_TIER'].includes(p.lifeData?.wealth?.tier?.id)
                    && !hasEventOccurred(p, 'LUXURY_CAR'),
    apply: p => {
      const np = deepClone(p);
      const cars = ['Ferrari','Lamborghini','Porsche','Bentley','McLaren','Bugatti','Rolls-Royce'];
      (np.lifeData.wealth.possessions = np.lifeData.wealth.possessions ?? []).push(`${pick(cars)} na garagem`);
      return np;
    },
    describe: p => {
      const cars = ['Ferrari','Lamborghini','Porsche','Bentley','McLaren'];
      return `${p.name} é fotografado com novo ${pick(cars)}`;
    },
  },

  YACHT_PURCHASE: {
    id: 'YACHT_PURCHASE', category: 'HOME', label: 'Compra de iate', icon: '⛵',
    newsworthy: true, marketImpact: +2,
    condition: p => p.lifeData?.wealth?.tier?.id === 'BILLIONAIRE_TIER' && !hasEventOccurred(p, 'YACHT_PURCHASE'),
    apply: p => {
      const np = deepClone(p);
      (np.lifeData.wealth.possessions = np.lifeData.wealth.possessions ?? []).push('iate particular');
      return np;
    },
    describe: p => `${p.name} compra iate de luxo`,
  },

  // ────────────────────────────────────────────────────────────────
  // SOCIAL
  // ────────────────────────────────────────────────────────────────

  FOUNDATION_LAUNCH: {
    id: 'FOUNDATION_LAUNCH', category: 'SOCIAL', label: 'Lançamento de fundação', icon: '🤝',
    newsworthy: true, marketImpact: +6,
    condition: p => (p.personality?.marketability?.score ?? 0) > 50
                    && !hasEventOccurred(p, 'FOUNDATION_LAUNCH')
                    && p.lifeData?.values?.socialCause?.id !== 'NONE',
    apply: p => {
      const np = deepClone(p);
      np.lifeData.publicImage = { id:'ACTIVIST', label:'Ativista', desc:'Usa a plataforma para causas sociais ativamente.' };
      return np;
    },
    describe: p => `${p.name} lança fundação focada em ${(p.lifeData?.values?.socialCause?.label ?? 'causa social').toLowerCase()}`,
  },

  BIG_DONATION: {
    id: 'BIG_DONATION', category: 'SOCIAL', label: 'Doação expressiva', icon: '💸',
    newsworthy: true, marketImpact: +4,
    condition: p => {
      const wt = p.lifeData?.wealth?.tier?.id;
      return ['WEALTHY','VERY_WEALTHY','BILLIONAIRE_TIER'].includes(wt)
             && p.lifeData?.values?.socialCause?.id !== 'NONE';
    },
    apply: p => p,
    describe: p => {
      const amounts = ['$500 mil','$1 milhão','$2 milhões','€1 milhão'];
      return `${p.name} doa ${pick(amounts)} para ${(p.lifeData?.values?.socialCause?.label ?? 'causas sociais').toLowerCase()}`;
    },
  },

  CAUSE_CAMPAIGN: {
    id: 'CAUSE_CAMPAIGN', category: 'SOCIAL', label: 'Campanha social', icon: '📢',
    newsworthy: true, marketImpact: +3,
    condition: p => p.lifeData?.values?.socialCause?.id && p.lifeData?.values?.socialCause?.id !== 'NONE'
                    && (p.personality?.marketability?.score ?? 0) > 35,
    apply: p => p,
    describe: p => `${p.name} faz campanha por ${(p.lifeData?.values?.socialCause?.label ?? 'causa').toLowerCase()}`,
  },

  SCHOOL_OPENING: {
    id: 'SCHOOL_OPENING', category: 'SOCIAL', label: 'Abertura de escola/academia', icon: '🏫',
    newsworthy: true, marketImpact: +5,
    condition: p => (p.age ?? 25) >= 28 && !hasEventOccurred(p, 'SCHOOL_OPENING')
                    && (p.personality?.marketability?.score ?? 0) > 45,
    apply: p => p,
    describe: p => {
      const types = ['academia de tênis para jovens carentes','escola de esportes','centro comunitário'];
      return `${p.name} inaugura ${pick(types)} no país natal`;
    },
  },

  ENVIRONMENTAL_PLEDGE: {
    id: 'ENVIRONMENTAL_PLEDGE', category: 'SOCIAL', label: 'Compromisso ambiental', icon: '🌱',
    newsworthy: true, marketImpact: +3,
    condition: p => p.lifeData?.values?.socialCause?.id === 'ENVIRONMENT'
                    || (p.personality?.competitiveArchetype?.id === 'DIPLOMAT' && chance(0.3)),
    apply: p => p,
    describe: p => {
      const pledges = [
        'anuncia neutralidade de carbono em suas atividades',
        'firma parceria com organização ambiental',
        'planta 10 mil árvores como parte de campanha',
        'torna-se embaixador de causa climática',
      ];
      return `${p.name} ${pick(pledges)}`;
    },
  },

  CHARITY_TOURNAMENT: {
    id: 'CHARITY_TOURNAMENT', category: 'SOCIAL', label: 'Torneio beneficente', icon: '🎾',
    newsworthy: true, marketImpact: +4,
    condition: p => (p.age ?? 25) >= 26 && (p.personality?.marketability?.score ?? 0) > 45
                    && !hasEventOccurred(p, 'CHARITY_TOURNAMENT'),
    apply: p => p,
    describe: p => `${p.name} organiza torneio beneficente — arrecadação vai para ${(p.lifeData?.values?.socialCause?.label ?? 'causa social').toLowerCase()}`,
  },

  // ────────────────────────────────────────────────────────────────
  // BUSINESS
  // ────────────────────────────────────────────────────────────────

  BRAND_LAUNCH: {
    id: 'BRAND_LAUNCH', category: 'BUSINESS', label: 'Lançamento de marca própria', icon: '👔',
    newsworthy: true, marketImpact: +7,
    condition: p => (p.personality?.marketability?.score ?? 0) > 65
                    && !hasEventOccurred(p, 'BRAND_LAUNCH'),
    apply: p => {
      const np = deepClone(p);
      np.lifeData.publicImage = { id:'ENTREPRENEUR', label:'Empresário', desc:'Constrói negócios paralelos à carreira.' };
      return np;
    },
    describe: p => {
      const types = ['linha de roupas esportivas','marca de tênis e equipamentos',
                     'linha de suplementos','coleção de moda casual',
                     'marca de acessórios de luxo','linha de perfumes'];
      return `${p.name} lança ${pick(types)}`;
    },
  },

  RESTAURANT_OPENING: {
    id: 'RESTAURANT_OPENING', category: 'BUSINESS', label: 'Abertura de restaurante', icon: '🍽️',
    newsworthy: true, marketImpact: +3,
    condition: p => p.lifeData?.interests?.hobbies?.some(h => h.id === 'COOKING')
                    && ['WEALTHY','VERY_WEALTHY','BILLIONAIRE_TIER'].includes(p.lifeData?.wealth?.tier?.id)
                    && !hasEventOccurred(p, 'RESTAURANT_OPENING'),
    apply: p => p,
    describe: p => `${p.name} abre restaurante`,
  },

  TECH_STARTUP: {
    id: 'TECH_STARTUP', category: 'BUSINESS', label: 'Investimento em startup', icon: '💻',
    newsworthy: true, marketImpact: +4,
    condition: p => p.lifeData?.interests?.hobbies?.some(h => h.id === 'GAMING' || h.id === 'CHESS')
                    && ['WEALTHY','VERY_WEALTHY','BILLIONAIRE_TIER'].includes(p.lifeData?.wealth?.tier?.id)
                    && !hasEventOccurred(p, 'TECH_STARTUP'),
    apply: p => p,
    describe: p => {
      const sectors = ['startup de tecnologia esportiva','app de análise de tênis',
                       'plataforma de treinamento digital','empresa de fitness tech'];
      return `${p.name} investe em ${pick(sectors)}`;
    },
  },

  INVESTMENT: {
    id: 'INVESTMENT', category: 'BUSINESS', label: 'Investimento em clube ou empresa', icon: '💼',
    newsworthy: true, marketImpact: +4,
    condition: p => ['VERY_WEALTHY','BILLIONAIRE_TIER'].includes(p.lifeData?.wealth?.tier?.id)
                    && !hasEventOccurred(p, 'INVESTMENT'),
    apply: p => {
      const np = deepClone(p);
      (np.lifeData.wealth.possessions = np.lifeData.wealth.possessions ?? []).push('participação em clube de futebol');
      return np;
    },
    describe: p => {
      const options = [
        'investe em clube de futebol europeu',
        'torna-se sócio de startup de tecnologia',
        'adquire participação em academia de luxo',
        'investe em rede de hotéis',
        'compra franquia esportiva nos EUA',
      ];
      return `${p.name} ${pick(options)}`;
    },
  },

  COACHING_ACADEMY: {
    id: 'COACHING_ACADEMY', category: 'BUSINESS', label: 'Academia de tênis própria', icon: '🏋️',
    newsworthy: true, marketImpact: +5,
    condition: p => (p.age ?? 25) >= 30 && (p.careerTitles?.gs ?? 0) >= 1
                    && !hasEventOccurred(p, 'COACHING_ACADEMY'),
    apply: p => p,
    describe: p => `${p.name} anuncia criação de academia de tênis própria`,
  },

  APP_LAUNCH: {
    id: 'APP_LAUNCH', category: 'BUSINESS', label: 'Lançamento de aplicativo', icon: '📱',
    newsworthy: true, marketImpact: +3,
    condition: p => (p.personality?.marketability?.score ?? 0) > 55
                    && !hasEventOccurred(p, 'APP_LAUNCH'),
    apply: p => p,
    describe: p => {
      const types = ['app de treino personalizado','app de análise de jogo','plataforma de coaching online'];
      return `${p.name} lança ${pick(types)}`;
    },
  },

  // ────────────────────────────────────────────────────────────────
  // MEDIA
  // ────────────────────────────────────────────────────────────────

  DOCUMENTARY: {
    id: 'DOCUMENTARY', category: 'MEDIA', label: 'Documentário', icon: '🎬',
    newsworthy: true, marketImpact: +8,
    condition: p => (p.personality?.marketability?.score ?? 0) > 70
                    && !hasEventOccurred(p, 'DOCUMENTARY') && (p.age ?? 25) >= 25,
    apply: p => p,
    describe: p => {
      const platforms = ['Netflix','Amazon Prime','HBO','ESPN','Disney+','Apple TV+'];
      return `${pick(platforms)} lança documentário sobre a carreira de ${p.name}`;
    },
  },

  AUTOBIOGRAPHY: {
    id: 'AUTOBIOGRAPHY', category: 'MEDIA', label: 'Autobiografia', icon: '📖',
    newsworthy: true, marketImpact: +5,
    condition: p => !hasEventOccurred(p, 'AUTOBIOGRAPHY')
                    && (p.age ?? 25) >= 28 && (p.careerTitles?.gs ?? 0) >= 1,
    apply: p => p,
    describe: p => {
      const subtitles = ['a história sem filtros','dentro da quadra e fora dela','a longa jornada','sem arrependimentos'];
      return `${p.name} lança autobiografia: "${pick(subtitles)}"`;
    },
  },

  MAGAZINE_COVER: {
    id: 'MAGAZINE_COVER', category: 'MEDIA', label: 'Capa de revista', icon: '📰',
    newsworthy: true, marketImpact: +3,
    condition: p => (p.personality?.marketability?.score ?? 0) > 55,
    apply: p => p,
    describe: p => {
      const mags = ['Time','GQ','Vogue','Forbes','Sports Illustrated',
                    'L\'Équipe','Esquire','Rolling Stone','The Athletic Magazine'];
      return `${p.name} estampa capa da ${pick(mags)}`;
    },
  },

  TV_APPEARANCE: {
    id: 'TV_APPEARANCE', category: 'MEDIA', label: 'Aparição em programa de TV', icon: '📺',
    newsworthy: true, marketImpact: +2,
    condition: p => {
      const persona = p.personality?.pressPersona?.id;
      return ['CHARISMATIC','SHOWMAN','DIPLOMATIC'].includes(persona);
    },
    apply: p => p,
    describe: p => {
      const shows = ['talk show internacional','programa de entrevistas','reality de celebridades',
                     'late night show nos EUA','programa de culinária'];
      return `${p.name} participa de ${pick(shows)}`;
    },
  },

  PODCAST_LAUNCH: {
    id: 'PODCAST_LAUNCH', category: 'MEDIA', label: 'Lançamento de podcast próprio', icon: '🎙️',
    newsworthy: true, marketImpact: +4,
    condition: p => ['INTELLECTUAL','DIPLOMATIC','CHARISMATIC'].includes(p.personality?.pressPersona?.id)
                    && !hasEventOccurred(p, 'PODCAST_LAUNCH'),
    apply: p => p,
    describe: p => {
      const themes = ['esporte e mentalidade vencedora','vida de atleta profissional',
                      'tênis, viagens e bastidores do circuito','conversas com atletas de elite'];
      return `${p.name} lança podcast sobre ${pick(themes)}`;
    },
  },

  ACTING_ROLE: {
    id: 'ACTING_ROLE', category: 'MEDIA', label: 'Papel em filme ou série', icon: '🎭',
    newsworthy: true, marketImpact: +5,
    condition: p => (p.personality?.marketability?.score ?? 0) > 72
                    && !hasEventOccurred(p, 'ACTING_ROLE'),
    apply: p => p,
    describe: p => {
      const roles = ['participação especial em série de esportes',
                     'papel em comercial cinematográfico',
                     'papel coadjuvante em filme de ação',
                     'apresentador de especial de TV'];
      return `${p.name} estreia como ator: ${pick(roles)}`;
    },
  },

  SOCIAL_MEDIA_VIRAL: {
    id: 'SOCIAL_MEDIA_VIRAL', category: 'MEDIA', label: 'Viral nas redes sociais', icon: '🔥',
    newsworthy: true, marketImpact: +3,
    condition: p => ['CHARISMATIC','SHOWMAN','CONFRONTATIONAL'].includes(p.personality?.pressPersona?.id),
    apply: p => p,
    describe: p => {
      const events = [
        'vídeo de bastidores vira viral com milhões de visualizações',
        'momento em quadra repercute globalmente nas redes sociais',
        'entrevista inusitada gera memes e viraliza na internet',
        'desafio lançado nas redes é aceito por celebridades',
      ];
      return `${p.name}: ${pick(events)}`;
    },
  },

  AMBASSADOR_ROLE: {
    id: 'AMBASSADOR_ROLE', category: 'MEDIA', label: 'Embaixador de marca', icon: '🌟',
    newsworthy: true, marketImpact: +5,
    condition: p => (p.personality?.marketability?.score ?? 0) > 65,
    apply: p => p,
    describe: p => {
      const brands = ['marca de luxo europeia','marca de relógios suíços',
                      'fabricante de carros de luxo','rede hoteleira internacional',
                      'marca de bebidas premium'];
      return `${p.name} torna-se embaixador global de ${pick(brands)}`;
    },
  },

  // ────────────────────────────────────────────────────────────────
  // CONTROVERSY
  // ────────────────────────────────────────────────────────────────

  CONTROVERSIAL_STATEMENT: {
    id: 'CONTROVERSIAL_STATEMENT', category: 'CONTROVERSY', label: 'Declaração polêmica', icon: '💣',
    newsworthy: true, marketImpact: -5,
    condition: p => ['CONFRONTATIONAL','ENIGMATIC'].includes(p.personality?.pressPersona?.id),
    apply: p => p,
    describe: p => {
      const topics = [
        'sobre o formato dos torneios de Grand Slam',
        'sobre rivais e colegas de circuito',
        'sobre a arbitragem no tênis',
        'sobre o desequilíbrio salarial no circuito',
        'que causa debate nas redes sociais',
        'sobre a WTA/ATP e sua gestão',
      ];
      return `${p.name} faz declaração polêmica ${pick(topics)}`;
    },
  },

  PUBLIC_DISPUTE: {
    id: 'PUBLIC_DISPUTE', category: 'CONTROVERSY', label: 'Briga pública', icon: '⚡',
    newsworthy: true, marketImpact: -8,
    condition: p => p.personality?.pressPersona?.id === 'CONFRONTATIONAL'
                    && p.personality?.competitiveArchetype?.id === 'REBEL',
    apply: p => p,
    describe: p => {
      const subjects = [
        'com a ATP sobre regulamentos de calendário',
        'com organizadores de torneio sobre prêmios',
        'com árbitro em coletiva pós-jogo',
        'com jornalista em entrevista ao vivo',
        'com direção do Grand Slam em nota oficial',
      ];
      return `${p.name} em briga pública ${pick(subjects)}`;
    },
  },

  DOPING_ALLEGATION: {
    id: 'DOPING_ALLEGATION', category: 'CONTROVERSY', label: 'Acusação de doping', icon: '🚨',
    newsworthy: true, marketImpact: -15,
    condition: p => !hasEventOccurred(p, 'DOPING_ALLEGATION')
                    && p.personality?.competitiveArchetype?.id === 'PREDATOR' && chance(0.2),
    apply: p => p,
    describe: p => `${p.name} alvo de suspeita de doping — caso investigado pela agência antidoping`,
  },

  DOPING_CLEARED: {
    id: 'DOPING_CLEARED', category: 'CONTROVERSY', label: 'Inocentado de acusação', icon: '✅',
    newsworthy: true, marketImpact: +5,
    condition: p => hasEventOccurred(p, 'DOPING_ALLEGATION')
                    && !hasEventOccurred(p, 'DOPING_CLEARED'),
    apply: p => p,
    describe: p => `${p.name} inocentado — agência antidoping confirma resultado negativo em todos os exames`,
  },

  TAX_EVASION: {
    id: 'TAX_EVASION', category: 'CONTROVERSY', label: 'Acusação fiscal', icon: '💰',
    newsworthy: true, marketImpact: -10,
    condition: p => p.lifeData?.home?.taxHaven && !hasEventOccurred(p, 'TAX_EVASION')
                    && p.personality?.pressPersona?.id === 'CONFRONTATIONAL' && chance(0.15),
    apply: p => p,
    describe: p => `Autoridades fiscais investigam declarações tributárias de ${p.name}`,
  },

  ON_COURT_INCIDENT: {
    id: 'ON_COURT_INCIDENT', category: 'CONTROVERSY', label: 'Incidente em quadra', icon: '😤',
    newsworthy: true, marketImpact: -4,
    condition: p => ['CONFRONTATIONAL','REBEL'].includes(p.personality?.competitiveArchetype?.id),
    apply: p => p,
    describe: p => {
      const incidents = [
        'recebe multa da ATP por discussão com árbitro',
        'expulso de torneio após incidente com torcedor',
        'advertido por conduta antidesportiva',
        'suspensão de um jogo por comportamento em quadra',
      ];
      return `${p.name} ${pick(incidents)}`;
    },
  },

  GAMBLING_RUMOR: {
    id: 'GAMBLING_RUMOR', category: 'CONTROVERSY', label: 'Rumor de apostas', icon: '🎲',
    newsworthy: true, marketImpact: -7,
    condition: p => !hasEventOccurred(p, 'GAMBLING_RUMOR')
                    && p.personality?.pressPersona?.id === 'ENIGMATIC' && chance(0.12),
    apply: p => p,
    describe: p => `Imprensa especula sobre hábitos de apostas de ${p.name}`,
  },

  // ────────────────────────────────────────────────────────────────
  // COMMUNITY
  // ────────────────────────────────────────────────────────────────

  NATIONAL_HERO: {
    id: 'NATIONAL_HERO', category: 'COMMUNITY', label: 'Herói nacional', icon: '🏅',
    newsworthy: true, marketImpact: +6,
    condition: p => (p.careerTitles?.gs ?? 0) >= 2
                    && !hasEventOccurred(p, 'NATIONAL_HERO'),
    apply: p => p,
    describe: p => `${p.name} recebe honraria do governo de ${p.nationality} — considerado herói nacional`,
  },

  STREET_NAMED: {
    id: 'STREET_NAMED', category: 'COMMUNITY', label: 'Rua batizada em seu nome', icon: '🛣️',
    newsworthy: true, marketImpact: +4,
    condition: p => (p.careerTitles?.gs ?? 0) >= 3 && !hasEventOccurred(p, 'STREET_NAMED'),
    apply: p => p,
    describe: p => `Cidade natal de ${p.name} batiza rua em sua homenagem`,
  },

  NATIONAL_RETURN: {
    id: 'NATIONAL_RETURN', category: 'COMMUNITY', label: 'Retorno ao país natal', icon: '🏠',
    newsworthy: true, marketImpact: +2,
    condition: p => p.lifeData?.home?.country !== p.nationality
                    && ['WARRIOR','DREAMER'].includes(p.personality?.competitiveArchetype?.id),
    apply: p => {
      const np = deepClone(p);
      np.lifeData.home = { city: null, country: p.nationality, taxHaven: false };
      return np;
    },
    describe: p => `${p.name} anuncia retorno para morar no ${p.nationality}`,
  },

  YOUTH_EVENT: {
    id: 'YOUTH_EVENT', category: 'COMMUNITY', label: 'Evento com jovens', icon: '🎾',
    newsworthy: false, marketImpact: +3,
    condition: p => ['YOUTH_TENNIS','EDUCATION'].includes(p.lifeData?.values?.socialCause?.id),
    apply: p => p,
    describe: p => `${p.name} organiza clínica de tênis para jovens carentes`,
  },

  UNIVERSITY_DEGREE: {
    id: 'UNIVERSITY_DEGREE', category: 'COMMUNITY', label: 'Graduação universitária', icon: '🎓',
    newsworthy: true, marketImpact: +3,
    condition: p => (p.age ?? 25) >= 24 && !hasEventOccurred(p, 'UNIVERSITY_DEGREE')
                    && ['INTELLECTUAL','DIPLOMATIC'].includes(p.personality?.pressPersona?.id),
    apply: p => p,
    describe: p => {
      const degrees = ['Administração de Empresas','Ciências do Esporte','Psicologia',
                       'Economia','Comunicação e Mídia','Nutrição Esportiva'];
      return `${p.name} recebe diploma de ${pick(degrees)} enquanto mantém carreira no tênis`;
    },
  },

  MENTORING_PROSPECT: {
    id: 'MENTORING_PROSPECT', category: 'COMMUNITY', label: 'Mentoria de jovem tenista', icon: '🤜',
    newsworthy: true, marketImpact: +3,
    condition: p => (p.age ?? 25) >= 30 && (p.careerTitles?.gs ?? 0) >= 1
                    && !hasEventOccurred(p, 'MENTORING_PROSPECT'),
    apply: p => p,
    describe: p => `${p.name} assume papel de mentor de jovem promessa do tênis`,
  },

  // ────────────────────────────────────────────────────────────────
  // SPIRITUAL
  // ────────────────────────────────────────────────────────────────

  SPIRITUAL_RETREAT: {
    id: 'SPIRITUAL_RETREAT', category: 'SPIRITUAL', label: 'Retiro espiritual', icon: '🧘',
    newsworthy: false, marketImpact: +1,
    condition: p => !hasEventOccurred(p, 'SPIRITUAL_RETREAT')
                    && ['INTROSPECTIVE','ARTIST','DREAMER'].includes(p.personality?.competitiveArchetype?.id),
    apply: p => p,
    describe: p => `${p.name} faz retiro espiritual na entressafra`,
  },

  PILGRIMAGE: {
    id: 'PILGRIMAGE', category: 'SPIRITUAL', label: 'Peregrinação', icon: '⛪',
    newsworthy: true, marketImpact: +2,
    condition: p => (p.age ?? 25) >= 28 && !hasEventOccurred(p, 'PILGRIMAGE'),
    apply: p => p,
    describe: p => {
      const places = ['Caminho de Santiago de Compostela','peregrinação ao Japão',
                      'retiro no Himalaia','viagem espiritual ao Oriente Médio'];
      return `${p.name} realiza ${pick(places)}`;
    },
  },

  CAREER_DOUBT: {
    id: 'CAREER_DOUBT', category: 'SPIRITUAL', label: 'Questionamento público da carreira', icon: '🤔',
    newsworthy: true, marketImpact: -3,
    condition: p => (p.age ?? 25) >= 31 && (p.personality?.currentState?.mood === 'BURNED_OUT'
                    || p.personality?.currentState?.mood === 'SLUMPING'),
    apply: p => p,
    describe: p => `${p.name} admite em entrevista estar questionando se continua no circuito`,
  },

  MINDFULNESS_ADVOCACY: {
    id: 'MINDFULNESS_ADVOCACY', category: 'SPIRITUAL', label: 'Defesa do mindfulness', icon: '🌿',
    newsworthy: true, marketImpact: +2,
    condition: p => hasEventOccurred(p, 'MENTAL_HEALTH_BREAK')
                    && !hasEventOccurred(p, 'MINDFULNESS_ADVOCACY'),
    apply: p => p,
    describe: p => `${p.name} se torna defensor público da saúde mental e meditação no esporte`,
  },

  // ────────────────────────────────────────────────────────────────
  // PERSONAL — novos eventos
  // ────────────────────────────────────────────────────────────────

  THERAPY_PUBLIC: {
    id: 'THERAPY_PUBLIC', category: 'PERSONAL', label: 'Admite fazer terapia', icon: '🛋️',
    newsworthy: true, marketImpact: +3,
    condition: p => (p.age ?? 25) >= 22 && !hasEventOccurred(p, 'THERAPY_PUBLIC'),
    apply: p => p,
    describe: p => `${p.name} revela publicamente que faz terapia e defende o tema sem constrangimento`,
  },

  HEALTH_SCARE: {
    id: 'HEALTH_SCARE', category: 'PERSONAL', label: 'Susto de saúde', icon: '🏥',
    newsworthy: true, marketImpact: -2,
    condition: p => (p.age ?? 25) >= 28 && !hasEventOccurred(p, 'HEALTH_SCARE'),
    apply: p => p,
    describe: p => `${p.name} passa por exames depois de episódio que preocupou a comissão técnica`,
  },

  PUBLIC_COMING_OUT: {
    id: 'PUBLIC_COMING_OUT', category: 'PERSONAL', label: 'Coming out público', icon: '🏳️‍🌈',
    newsworthy: true, marketImpact: +5,
    condition: p => !hasEventOccurred(p, 'PUBLIC_COMING_OUT'),
    apply: p => p,
    describe: p => `${p.name} faz declaração pública sobre sua identidade, tornando-se referência no circuito`,
  },

  SOBRIETY_JOURNEY: {
    id: 'SOBRIETY_JOURNEY', category: 'PERSONAL', label: 'Jornada de sobriedade', icon: '🍃',
    newsworthy: true, marketImpact: +4,
    condition: p => (p.age ?? 25) >= 24 && !hasEventOccurred(p, 'SOBRIETY_JOURNEY'),
    apply: p => p,
    describe: p => `${p.name} revela batalha com dependência e anuncia que está há meses em recuperação`,
  },

  RECONNECT_ROOTS: {
    id: 'RECONNECT_ROOTS', category: 'PERSONAL', label: 'Reconexão com as origens', icon: '🌍',
    newsworthy: true, marketImpact: +3,
    condition: p => !hasEventOccurred(p, 'RECONNECT_ROOTS'),
    apply: p => p,
    describe: p => `${p.name} volta ao país de origem para projeto pessoal e fala sobre identidade cultural`,
  },

  ESTRANGEMENT: {
    id: 'ESTRANGEMENT', category: 'PERSONAL', label: 'Distanciamento familiar', icon: '🚪',
    newsworthy: false, marketImpact: -2,
    condition: p => (p.age ?? 25) >= 26 && !hasEventOccurred(p, 'ESTRANGEMENT'),
    apply: p => p,
    describe: p => `${p.name} assume distanciamento de familiar próximo, sem revelar os motivos`,
  },

  SIBLING_IN_SPORT: {
    id: 'SIBLING_IN_SPORT', category: 'PERSONAL', label: 'Irmão(ã) profissional', icon: '👫',
    newsworthy: true, marketImpact: +2,
    condition: p => !hasEventOccurred(p, 'SIBLING_IN_SPORT'),
    apply: p => p,
    describe: p => `Irmão(ã) de ${p.name} estreia em competições profissionais, gerando cobertura dupla`,
  },

  // ────────────────────────────────────────────────────────────────
  // HOME — novos eventos
  // ────────────────────────────────────────────────────────────────

  PRIVATE_JET: {
    id: 'PRIVATE_JET', category: 'HOME', label: 'Jato particular', icon: '✈️',
    newsworthy: true, marketImpact: +1,
    condition: p => (p.personality?.marketability?.score ?? 0) >= 70
                    && !hasEventOccurred(p, 'PRIVATE_JET'),
    apply: p => p,
    describe: p => `${p.name} adquire jato particular — viagens entre torneios mudam completamente`,
  },

  ART_COLLECTION: {
    id: 'ART_COLLECTION', category: 'HOME', label: 'Coleção de arte', icon: '🖼️',
    newsworthy: true, marketImpact: +2,
    condition: p => (p.age ?? 25) >= 28 && !hasEventOccurred(p, 'ART_COLLECTION'),
    apply: p => p,
    describe: p => `${p.name} revela coleção de arte que vem construindo em silêncio há anos`,
  },

  WINE_ESTATE: {
    id: 'WINE_ESTATE', category: 'HOME', label: 'Vinícola própria', icon: '🍷',
    newsworthy: true, marketImpact: +3,
    condition: p => (p.age ?? 25) >= 29 && !hasEventOccurred(p, 'WINE_ESTATE'),
    apply: p => p,
    describe: p => `${p.name} compra vinícola e lança rótulo com seu nome — produto esgota em dias`,
  },

  SOLD_PROPERTY: {
    id: 'SOLD_PROPERTY', category: 'HOME', label: 'Venda de propriedade', icon: '🏚️',
    newsworthy: false, marketImpact: 0,
    condition: p => hasEventOccurred(p, 'NEW_PROPERTY')
                    && !hasEventOccurred(p, 'SOLD_PROPERTY'),
    apply: p => p,
    describe: p => `${p.name} vende propriedade e muda de base, sinalizando novo capítulo`,
  },

  // ────────────────────────────────────────────────────────────────
  // SOCIAL — novos eventos
  // ────────────────────────────────────────────────────────────────

  POLITICAL_ENDORSEMENT: {
    id: 'POLITICAL_ENDORSEMENT', category: 'SOCIAL', label: 'Apoio político público', icon: '🗳️',
    newsworthy: true, marketImpact: -3,
    condition: p => (p.personality?.marketability?.score ?? 0) >= 55
                    && !hasEventOccurred(p, 'POLITICAL_ENDORSEMENT'),
    apply: p => p,
    describe: p => `${p.name} apoia publicamente candidato, dividindo fãs e gerando debate intenso`,
  },

  REFUGEE_SUPPORT: {
    id: 'REFUGEE_SUPPORT', category: 'SOCIAL', label: 'Apoio a refugiados', icon: '🤝',
    newsworthy: true, marketImpact: +5,
    condition: p => !hasEventOccurred(p, 'REFUGEE_SUPPORT'),
    apply: p => p,
    describe: p => `${p.name} lança campanha de apoio a refugiados e visita campo humanitário`,
  },

  LGBTQ_ALLY: {
    id: 'LGBTQ_ALLY', category: 'SOCIAL', label: 'Posicionamento como aliado', icon: '🌈',
    newsworthy: true, marketImpact: +4,
    condition: p => !hasEventOccurred(p, 'LGBTQ_ALLY')
                    && !hasEventOccurred(p, 'PUBLIC_COMING_OUT'),
    apply: p => p,
    describe: p => `${p.name} se posiciona publicamente como aliado da comunidade LGBTQ+`,
  },

  ANTI_DOPING_CAMPAIGN: {
    id: 'ANTI_DOPING_CAMPAIGN', category: 'SOCIAL', label: 'Campanha anti-doping', icon: '🚫',
    newsworthy: true, marketImpact: +3,
    condition: p => !hasEventOccurred(p, 'ANTI_DOPING_CAMPAIGN')
                    && !hasEventOccurred(p, 'DOPING_ALLEGATION'),
    apply: p => p,
    describe: p => `${p.name} lidera campanha pelo esporte limpo, tornando-se voz do movimento`,
  },

  DISASTER_RELIEF: {
    id: 'DISASTER_RELIEF', category: 'SOCIAL', label: 'Apoio a desastre natural', icon: '🆘',
    newsworthy: true, marketImpact: +6,
    condition: p => !hasEventOccurred(p, 'DISASTER_RELIEF'),
    apply: p => p,
    describe: p => `${p.name} doa e viaja pessoalmente para área atingida por desastre natural`,
  },

  // ────────────────────────────────────────────────────────────────
  // BUSINESS — novos eventos
  // ────────────────────────────────────────────────────────────────

  FASHION_LINE: {
    id: 'FASHION_LINE', category: 'BUSINESS', label: 'Linha de moda própria', icon: '👗',
    newsworthy: true, marketImpact: +5,
    condition: p => (p.personality?.marketability?.score ?? 0) >= 60
                    && !hasEventOccurred(p, 'FASHION_LINE'),
    apply: p => p,
    describe: p => `${p.name} lança linha de moda — coleção esgota em 48h e gera cobertura internacional`,
  },

  SPORTS_OWNERSHIP: {
    id: 'SPORTS_OWNERSHIP', category: 'BUSINESS', label: 'Dono de clube esportivo', icon: '🏟️',
    newsworthy: true, marketImpact: +6,
    condition: p => (p.age ?? 25) >= 28 && !hasEventOccurred(p, 'SPORTS_OWNERSHIP'),
    apply: p => p,
    describe: p => `${p.name} adquire participação em clube esportivo — incursão no mundo dos donos de time`,
  },

  CRYPTO_INVESTMENT: {
    id: 'CRYPTO_INVESTMENT', category: 'BUSINESS', label: 'Investimento em cripto', icon: '₿',
    newsworthy: true, marketImpact: 0,
    condition: p => (p.age ?? 25) >= 23 && !hasEventOccurred(p, 'CRYPTO_INVESTMENT')
                    && !hasEventOccurred(p, 'CRYPTO_LOSS'),
    apply: p => p,
    describe: p => `${p.name} entra no mercado de criptomoedas e fala sobre isso abertamente`,
  },

  CRYPTO_LOSS: {
    id: 'CRYPTO_LOSS', category: 'BUSINESS', label: 'Perda em cripto', icon: '📉',
    newsworthy: true, marketImpact: -4,
    condition: p => hasEventOccurred(p, 'CRYPTO_INVESTMENT')
                    && !hasEventOccurred(p, 'CRYPTO_LOSS'),
    apply: p => p,
    describe: p => `${p.name} sofre perda significativa em cripto — admite ter se empolgado demais`,
  },

  SPORTS_AGENCY: {
    id: 'SPORTS_AGENCY', category: 'BUSINESS', label: 'Agência de atletas', icon: '📋',
    newsworthy: true, marketImpact: +3,
    condition: p => (p.age ?? 25) >= 30 && !hasEventOccurred(p, 'SPORTS_AGENCY'),
    apply: p => p,
    describe: p => `${p.name} funda agência para representar atletas jovens — usa a própria trajetória como modelo`,
  },

  HOTEL_INVESTMENT: {
    id: 'HOTEL_INVESTMENT', category: 'BUSINESS', label: 'Hotel de boutique', icon: '🏨',
    newsworthy: true, marketImpact: +4,
    condition: p => !hasEventOccurred(p, 'HOTEL_INVESTMENT'),
    apply: p => p,
    describe: p => `${p.name} investe em hotel de boutique no país natal — projeto pessoal com identidade local`,
  },

  // ────────────────────────────────────────────────────────────────
  // MEDIA — novos eventos
  // ────────────────────────────────────────────────────────────────

  COLUMN_NEWSPAPER: {
    id: 'COLUMN_NEWSPAPER', category: 'MEDIA', label: 'Coluna em jornal esportivo', icon: '✍️',
    newsworthy: true, marketImpact: +3,
    condition: p => (p.age ?? 25) >= 26 && !hasEventOccurred(p, 'COLUMN_NEWSPAPER'),
    apply: p => p,
    describe: p => `${p.name} começa a escrever coluna semanal — visão de dentro do circuito sem filtro`,
  },

  CHILDREN_BOOK: {
    id: 'CHILDREN_BOOK', category: 'MEDIA', label: 'Livro infantil', icon: '📚',
    newsworthy: true, marketImpact: +5,
    condition: p => (p.lifeData?.personal?.children?.has ?? false)
                    && !hasEventOccurred(p, 'CHILDREN_BOOK'),
    apply: p => p,
    describe: p => `${p.name} lança livro infantil inspirado nos filhos — esgota na primeira semana`,
  },

  MUSIC_COLLAB: {
    id: 'MUSIC_COLLAB', category: 'MEDIA', label: 'Colaboração musical', icon: '🎵',
    newsworthy: true, marketImpact: +4,
    condition: p => (p.personality?.marketability?.score ?? 0) >= 65
                    && !hasEventOccurred(p, 'MUSIC_COLLAB'),
    apply: p => p,
    describe: p => `${p.name} aparece em clipe ou faz feat com artista famoso — viral instantâneo`,
  },

  FASHION_CAMPAIGN: {
    id: 'FASHION_CAMPAIGN', category: 'MEDIA', label: 'Campanha de moda de luxo', icon: '💎',
    newsworthy: true, marketImpact: +6,
    condition: p => (p.personality?.marketability?.score ?? 0) >= 72
                    && !hasEventOccurred(p, 'FASHION_CAMPAIGN'),
    apply: p => p,
    describe: p => `${p.name} estampa campanha de marca de luxo — presença na semana de moda internacional`,
  },

  AWARD_SHOW_HOST: {
    id: 'AWARD_SHOW_HOST', category: 'MEDIA', label: 'Apresentador de premiação', icon: '🎤',
    newsworthy: true, marketImpact: +5,
    condition: p => (p.personality?.marketability?.score ?? 0) >= 68
                    && !hasEventOccurred(p, 'AWARD_SHOW_HOST'),
    apply: p => p,
    describe: p => `${p.name} apresenta premiação esportiva — carisma fora da quadra surpreende a mídia`,
  },

  SPORTS_COMMENTARY: {
    id: 'SPORTS_COMMENTARY', category: 'MEDIA', label: 'Comentarista esportivo', icon: '📡',
    newsworthy: true, marketImpact: +2,
    condition: p => (p.age ?? 25) >= 32 && !hasEventOccurred(p, 'SPORTS_COMMENTARY'),
    apply: p => p,
    describe: p => `${p.name} estreia como comentarista — visão analítica impressiona produtores`,
  },

  // ────────────────────────────────────────────────────────────────
  // CONTROVERSY — novos eventos
  // ────────────────────────────────────────────────────────────────

  RACKET_SMASH_VIRAL: {
    id: 'RACKET_SMASH_VIRAL', category: 'CONTROVERSY', label: 'Quebra de raquete viraliza', icon: '🎾💥',
    newsworthy: true, marketImpact: -1,
    condition: p => !hasEventOccurred(p, 'RACKET_SMASH_VIRAL'),
    apply: p => p,
    describe: p => `${p.name} quebra raquete em momento de raiva e o vídeo vira meme internacional`,
  },

  ATP_FINE: {
    id: 'ATP_FINE', category: 'CONTROVERSY', label: 'Multa pela ATP', icon: '💸',
    newsworthy: true, marketImpact: -3,
    condition: p => !hasEventOccurred(p, 'ATP_FINE'),
    apply: p => p,
    describe: p => `${p.name} é multado pela ATP por conduta — declaração posterior gera mais polêmica`,
  },

  SUSPENSION: {
    id: 'SUSPENSION', category: 'CONTROVERSY', label: 'Suspensão por conduta', icon: '🚫',
    newsworthy: true, marketImpact: -8,
    condition: p => hasEventOccurred(p, 'ATP_FINE')
                    && !hasEventOccurred(p, 'SUSPENSION'),
    apply: p => p,
    describe: p => `${p.name} é suspenso temporariamente — circuito debate limites do comportamento`,
  },

  RIVAL_PUBLIC_FEUD: {
    id: 'RIVAL_PUBLIC_FEUD', category: 'CONTROVERSY', label: 'Briga pública com rival', icon: '🥊',
    newsworthy: true, marketImpact: +2,
    condition: p => p.personality?.pressPersona?.id === 'CONFRONTATIONAL'
                    && !hasEventOccurred(p, 'RIVAL_PUBLIC_FEUD'),
    apply: p => p,
    describe: p => `${p.name} troca farpas públicas com rival — declarações se tornam o tema da semana`,
  },

  COACH_DRAMA: {
    id: 'COACH_DRAMA', category: 'CONTROVERSY', label: 'Demissão dramática de técnico', icon: '👨‍🏫',
    newsworthy: true, marketImpact: -2,
    condition: p => !hasEventOccurred(p, 'COACH_DRAMA'),
    apply: p => p,
    describe: p => `${p.name} demite técnico de forma pública e abrupta — os motivos viram especulação`,
  },

  FEDERATION_CONFLICT: {
    id: 'FEDERATION_CONFLICT', category: 'CONTROVERSY', label: 'Conflito com federação', icon: '⚡',
    newsworthy: true, marketImpact: -3,
    condition: p => !hasEventOccurred(p, 'FEDERATION_CONFLICT'),
    apply: p => p,
    describe: p => `${p.name} entra em conflito aberto com a federação nacional — seleção em risco`,
  },

  SOCIAL_MEDIA_MELTDOWN: {
    id: 'SOCIAL_MEDIA_MELTDOWN', category: 'CONTROVERSY', label: 'Colapso nas redes sociais', icon: '📱🔥',
    newsworthy: true, marketImpact: -5,
    condition: p => !hasEventOccurred(p, 'SOCIAL_MEDIA_MELTDOWN'),
    apply: p => p,
    describe: p => `${p.name} posta série de mensagens erráticas nas redes — assessoria entra em colapso`,
  },

  CHEATING_ALLEGATION: {
    id: 'CHEATING_ALLEGATION', category: 'CONTROVERSY', label: 'Acusação de trapaça em quadra', icon: '🕵️',
    newsworthy: true, marketImpact: -6,
    condition: p => !hasEventOccurred(p, 'CHEATING_ALLEGATION')
                    && !hasEventOccurred(p, 'DOPING_ALLEGATION'),
    apply: p => p,
    describe: p => `Adversário acusa ${p.name} de sinalizar intencionalmente para desorientar — ATP investiga`,
  },

  // ────────────────────────────────────────────────────────────────
  // COMMUNITY — novos eventos
  // ────────────────────────────────────────────────────────────────

  OLYMPIC_AMBASSADOR: {
    id: 'OLYMPIC_AMBASSADOR', category: 'COMMUNITY', label: 'Embaixador olímpico', icon: '🏅',
    newsworthy: true, marketImpact: +7,
    condition: p => (p.personality?.marketability?.score ?? 0) >= 70
                    && !hasEventOccurred(p, 'OLYMPIC_AMBASSADOR'),
    apply: p => p,
    describe: p => `${p.name} é nomeado embaixador olímpico — presença nas campanhas globais dos Jogos`,
  },

  NATIONAL_AWARD: {
    id: 'NATIONAL_AWARD', category: 'COMMUNITY', label: 'Condecoração nacional', icon: '🎖️',
    newsworthy: true, marketImpact: +5,
    condition: p => !hasEventOccurred(p, 'NATIONAL_AWARD')
                    && (p.personality?.marketability?.score ?? 0) >= 60,
    apply: p => p,
    describe: p => `${p.name} recebe condecoração nacional — cerimônia transmitida ao vivo no país de origem`,
  },

  HONORARY_CITIZENSHIP: {
    id: 'HONORARY_CITIZENSHIP', category: 'COMMUNITY', label: 'Cidadania honorária', icon: '🌐',
    newsworthy: true, marketImpact: +4,
    condition: p => hasEventOccurred(p, 'NATIONAL_HERO')
                    && !hasEventOccurred(p, 'HONORARY_CITIZENSHIP'),
    apply: p => p,
    describe: p => `Cidade onde treina há anos concede cidadania honorária a ${p.name} em cerimônia emocionante`,
  },

  INDIGENOUS_HERITAGE: {
    id: 'INDIGENOUS_HERITAGE', category: 'COMMUNITY', label: 'Herança cultural celebrada', icon: '🪶',
    newsworthy: true, marketImpact: +4,
    condition: p => !hasEventOccurred(p, 'INDIGENOUS_HERITAGE'),
    apply: p => p,
    describe: p => `${p.name} compartilha abertamente herança indígena ou cultural — celebrada como símbolo`,
  },

  // ────────────────────────────────────────────────────────────────
  // SPIRITUAL — novos eventos
  // ────────────────────────────────────────────────────────────────

  RELIGION_CHANGE: {
    id: 'RELIGION_CHANGE', category: 'SPIRITUAL', label: 'Mudança de religião', icon: '✨',
    newsworthy: true, marketImpact: 0,
    condition: p => (p.age ?? 25) >= 25 && !hasEventOccurred(p, 'RELIGION_CHANGE'),
    apply: p => p,
    describe: p => `${p.name} revela conversão religiosa — fala sobre como mudou sua relação com pressão`,
  },

  PHILOSOPHY_BOOK: {
    id: 'PHILOSOPHY_BOOK', category: 'SPIRITUAL', label: 'Livro de filosofia pessoal', icon: '📕',
    newsworthy: true, marketImpact: +3,
    condition: p => (p.age ?? 25) >= 28 && !hasEventOccurred(p, 'PHILOSOPHY_BOOK')
                    && !hasEventOccurred(p, 'AUTOBIOGRAPHY'),
    apply: p => p,
    describe: p => `${p.name} lança ensaio filosófico — não sobre tênis, sobre como viver`,
  },

  VEGAN_CONVERSION: {
    id: 'VEGAN_CONVERSION', category: 'SPIRITUAL', label: 'Virou vegano', icon: '🌱',
    newsworthy: true, marketImpact: +2,
    condition: p => !hasEventOccurred(p, 'VEGAN_CONVERSION'),
    apply: p => p,
    describe: p => `${p.name} anuncia transição para veganismo — diz que performance melhorou e que não volta atrás`,
  },

  ANTI_MATERIALISM: {
    id: 'ANTI_MATERIALISM', category: 'SPIRITUAL', label: 'Declaração anti-materialismo', icon: '🧘',
    newsworthy: true, marketImpact: -1,
    condition: p => (p.age ?? 25) >= 30
                    && (hasEventOccurred(p, 'SPIRITUAL_RETREAT') || hasEventOccurred(p, 'PILGRIMAGE'))
                    && !hasEventOccurred(p, 'ANTI_MATERIALISM'),
    apply: p => p,
    describe: p => `${p.name} surpreende ao declarar que reduziu patrimônio e foca no essencial`,
  },

  // ────────────────────────────────────────────────────────────────
  // CAREER — nova categoria
  // Marcos e crises de carreira que não são resultados em quadra
  // ────────────────────────────────────────────────────────────────

  COMEBACK_STATEMENT: {
    id: 'COMEBACK_STATEMENT', category: 'CAREER', label: 'Declaração de retorno', icon: '🔄',
    newsworthy: true, marketImpact: +4,
    condition: p => (p.personality?.currentState?.mood === 'SLUMPING'
                    || p.personality?.currentState?.mood === 'BURNED_OUT')
                    && !hasEventOccurred(p, 'COMEBACK_STATEMENT'),
    apply: p => p,
    describe: p => `${p.name} dá entrevista categórica: "Não terminei. O melhor ainda vem"`,
  },

  RANKING_CRISIS: {
    id: 'RANKING_CRISIS', category: 'CAREER', label: 'Crise pública de ranking', icon: '📉',
    newsworthy: true, marketImpact: -3,
    condition: p => (p.stats?.ranking ?? 999) > 50
                    && (p.age ?? 25) < 34
                    && !hasEventOccurred(p, 'RANKING_CRISIS'),
    apply: p => p,
    describe: p => `${p.name} fala abertamente sobre a queda no ranking — nível de honestidade raro no circuito`,
  },

  WILDCARD_ACCEPTANCE: {
    id: 'WILDCARD_ACCEPTANCE', category: 'CAREER', label: 'Aceita wildcard', icon: '🃏',
    newsworthy: true, marketImpact: +2,
    condition: p => (p.stats?.ranking ?? 999) > 80
                    && !hasEventOccurred(p, 'WILDCARD_ACCEPTANCE'),
    apply: p => p,
    describe: p => `${p.name} aceita wildcard em torneio que antes ganhava de cabeça — pede uma chance`,
  },

  NATIONAL_CAPTAINCY: {
    id: 'NATIONAL_CAPTAINCY', category: 'CAREER', label: 'Capitão da seleção nacional', icon: '🏴',
    newsworthy: true, marketImpact: +5,
    condition: p => (p.age ?? 25) >= 30
                    && (p.personality?.marketability?.score ?? 0) >= 55
                    && !hasEventOccurred(p, 'NATIONAL_CAPTAINCY'),
    apply: p => p,
    describe: p => `${p.name} assume capitania da equipe nacional — reconhecimento da liderança dentro e fora da quadra`,
  },

  RETIREMENT_THREAT: {
    id: 'RETIREMENT_THREAT', category: 'CAREER', label: 'Ameaça pública de aposentadoria', icon: '🚪',
    newsworthy: true, marketImpact: -2,
    condition: p => (p.age ?? 25) >= 29
                    && !hasEventOccurred(p, 'RETIREMENT_THREAT'),
    apply: p => p,
    describe: p => `${p.name} não descarta aposentadoria — "Preciso sentir que ainda faz sentido para mim"`,
  },

  RECORD_CHASE: {
    id: 'RECORD_CHASE', category: 'CAREER', label: 'Perseguição pública a recorde', icon: '🎯',
    newsworthy: true, marketImpact: +4,
    condition: p => (p.personality?.marketability?.score ?? 0) >= 60
                    && !hasEventOccurred(p, 'RECORD_CHASE'),
    apply: p => p,
    describe: p => `${p.name} assume publicamente que está perseguindo um recorde histórico — sem desculpas`,
  },

  COACHING_REFUSAL: {
    id: 'COACHING_REFUSAL', category: 'CAREER', label: 'Recusa proposta de técnico famoso', icon: '🤝',
    newsworthy: true, marketImpact: +1,
    condition: p => !hasEventOccurred(p, 'COACHING_REFUSAL'),
    apply: p => p,
    describe: p => `${p.name} recusa oferta de técnico renomado — "Não é a direção certa para onde quero ir"`,
  },

  EARLY_PEAK_LAMENT: {
    id: 'EARLY_PEAK_LAMENT', category: 'CAREER', label: 'Arrependimento sobre pico precoce', icon: '⌛',
    newsworthy: true, marketImpact: -1,
    condition: p => (p.age ?? 25) >= 32 && !hasEventOccurred(p, 'EARLY_PEAK_LAMENT'),
    apply: p => p,
    describe: p => `${p.name} reflete que chegou ao topo cedo demais e pagou um preço que demorou a entender`,
  },

  // ────────────────────────────────────────────────────────────────
  // WELLNESS — nova categoria
  // Saúde, corpo, rotinas públicas de bem-estar
  // ────────────────────────────────────────────────────────────────

  DIET_REVOLUTION: {
    id: 'DIET_REVOLUTION', category: 'WELLNESS', label: 'Mudança radical na dieta', icon: '🥗',
    newsworthy: true, marketImpact: +3,
    condition: p => !hasEventOccurred(p, 'DIET_REVOLUTION')
                    && !hasEventOccurred(p, 'VEGAN_CONVERSION'),
    apply: p => p,
    describe: p => `${p.name} revela mudança alimentar drástica — atribui melhora de performance à dieta`,
  },

  SLEEP_PROTOCOL: {
    id: 'SLEEP_PROTOCOL', category: 'WELLNESS', label: 'Protocolo de sono torna-se viral', icon: '😴',
    newsworthy: true, marketImpact: +3,
    condition: p => !hasEventOccurred(p, 'SLEEP_PROTOCOL'),
    apply: p => p,
    describe: p => `${p.name} revela protocolo rigoroso de sono — post vira fenômeno entre atletas`,
  },

  RECOVERY_VIRAL: {
    id: 'RECOVERY_VIRAL', category: 'WELLNESS', label: 'Rotina de recuperação viral', icon: '🧊',
    newsworthy: true, marketImpact: +2,
    condition: p => !hasEventOccurred(p, 'RECOVERY_VIRAL'),
    apply: p => p,
    describe: p => `Vídeo da rotina de recuperação de ${p.name} vira viral — banho de gelo às 5h vira trend`,
  },

  ALTITUDE_CAMP: {
    id: 'ALTITUDE_CAMP', category: 'WELLNESS', label: 'Campo de treino em altitude', icon: '⛰️',
    newsworthy: true, marketImpact: +2,
    condition: p => !hasEventOccurred(p, 'ALTITUDE_CAMP'),
    apply: p => p,
    describe: p => `${p.name} passa mês em treino de altitude — revela que mudou condicionamento completamente`,
  },

  WELLNESS_BRAND: {
    id: 'WELLNESS_BRAND', category: 'WELLNESS', label: 'Marca de bem-estar', icon: '💪',
    newsworthy: true, marketImpact: +4,
    condition: p => (hasEventOccurred(p, 'SLEEP_PROTOCOL') || hasEventOccurred(p, 'DIET_REVOLUTION'))
                    && !hasEventOccurred(p, 'WELLNESS_BRAND'),
    apply: p => p,
    describe: p => `${p.name} lança marca de produtos de bem-estar — credibilidade do atleta valida a linha`,
  },

  NO_PHONE_WEEK: {
    id: 'NO_PHONE_WEEK', category: 'WELLNESS', label: 'Semana sem celular documentada', icon: '📵',
    newsworthy: true, marketImpact: +2,
    condition: p => !hasEventOccurred(p, 'NO_PHONE_WEEK'),
    apply: p => p,
    describe: p => `${p.name} documenta semana sem celular — diz que foi a semana mais produtiva dos últimos anos`,
  },

  COLD_WATER_CONVERT: {
    id: 'COLD_WATER_CONVERT', category: 'WELLNESS', label: 'Defesa da hidroterapia fria', icon: '🌊',
    newsworthy: false, marketImpact: +1,
    condition: p => !hasEventOccurred(p, 'COLD_WATER_CONVERT'),
    apply: p => p,
    describe: p => `${p.name} vira evangelizador da imersão em água fria — diz que transformou recuperação`,
  },

  COACH_RESET: {
    id: 'COACH_RESET', category: 'CAREER', label: 'Reorganiza relação com o técnico', icon: '🎯',
    newsworthy: true, marketImpact: +1,
    condition: p => !!p.coach && !hasEventOccurred(p, 'COACH_RESET'),
    apply: p => p,
    describe: p => `${p.name} descreve uma entressafra de reconstrução com a equipe técnica — menos ruído, mais clareza`,
  },

  COMMERCIAL_PRESSURE: {
    id: 'COMMERCIAL_PRESSURE', category: 'BUSINESS', label: 'Agenda comercial pesada', icon: '📸',
    newsworthy: true, marketImpact: +2,
    condition: p => (p.personality?.marketability?.score ?? 0) >= 58 && !hasEventOccurred(p, 'COMMERCIAL_PRESSURE'),
    apply: p => p,
    describe: p => `${p.name} admite que a agenda fora da quadra cresceu demais — patrocinadores, campanhas e compromissos ocupam espaço real da temporada`,
  },

  BURNOUT_WARNING: {
    id: 'BURNOUT_WARNING', category: 'PERSONAL', label: 'Sinais de esgotamento', icon: '🫥',
    newsworthy: false, marketImpact: -1,
    condition: p => (p.personality?.currentState?.pressureLevel ?? 0) >= 68 && !hasEventOccurred(p, 'BURNOUT_WARNING'),
    apply: p => p,
    describe: p => `${p.name} reduz aparições públicas e reorganiza rotina depois de reconhecer sinais claros de esgotamento`,
  },

  DISCIPLINE_STREAK: {
    id: 'DISCIPLINE_STREAK', category: 'WELLNESS', label: 'Fase de disciplina exemplar', icon: '⏱️',
    newsworthy: false, marketImpact: +1,
    condition: p => !hasEventOccurred(p, 'DISCIPLINE_STREAK'),
    apply: p => p,
    describe: p => `${p.name} entra numa fase de disciplina incomum — rotina seca, treino limpo e pouco ruído entre torneios`,
  },

  PERSONAL_MATURITY: {
    id: 'PERSONAL_MATURITY', category: 'PERSONAL', label: 'Amadurecimento fora da quadra', icon: '🪞',
    newsworthy: true, marketImpact: +2,
    condition: p => (p.age ?? 25) >= 24 && !hasEventOccurred(p, 'PERSONAL_MATURITY'),
    apply: p => p,
    describe: p => `${p.name} fala como alguém que envelheceu bem nos intervalos do circuito — menos impulso, mais lucidez`,
  },

}; // fim LIFE_EVENT_TYPES

// ═══════════════════════════════════════════════════════════════════
// HELPERS INTERNOS
// ═══════════════════════════════════════════════════════════════════

function deepClone(p) {
  return {
    ...p,
    lifeData: p.lifeData ? {
      ...p.lifeData,
      personal: { ...p.lifeData.personal, children: { ...(p.lifeData.personal?.children ?? {}) } },
      home: { ...p.lifeData.home },
      interests: { ...p.lifeData.interests, hobbies: [...(p.lifeData.interests?.hobbies ?? [])] },
      values: { ...p.lifeData.values },
      wealth: { ...p.lifeData.wealth, possessions: [...(p.lifeData.wealth?.possessions ?? [])] },
      offCourt: p.lifeData.offCourt ? { ...p.lifeData.offCourt, effects: { ...(p.lifeData.offCourt.effects ?? {}) } } : p.lifeData.offCourt,
    } : p.lifeData,
  };
}

function setRelStatus(p, statusId, clearPartner = false, addPartner = false) {
  const STATUS_MAP = {
    SINGLE:    { id:'SINGLE',    label:'Solteiro',   hasPartner: false },
    DATING:    { id:'DATING',    label:'Namorando',  hasPartner: true  },
    ENGAGED:   { id:'ENGAGED',   label:'Noivo',      hasPartner: true  },
    MARRIED:   { id:'MARRIED',   label:'Casado',     hasPartner: true  },
    SEPARATED: { id:'SEPARATED', label:'Separado',   hasPartner: false },
    DIVORCED:  { id:'DIVORCED',  label:'Divorciado', hasPartner: false },
  };
  const np = deepClone(p);
  np.lifeData.personal.relationshipStatus = STATUS_MAP[statusId];
  if (clearPartner) np.lifeData.personal.partner = null;
  if (addPartner) {
    const partnerTypes = [
      { id:'MODEL', label:'Modelo', public:true },
      { id:'ATHLETE_OTHER', label:'Atleta de outro esporte', public:true },
      { id:'MUSICIAN', label:'Músico(a)', public:true },
      { id:'PRIVATE', label:'Vida privada', public:false },
      { id:'TENNIS_PLAYER', label:'Tenista', public:true },
      { id:'ACTOR', label:'Ator/Atriz', public:true },
    ];
    np.lifeData.personal.partner = pick(partnerTypes);
  }
  return np;
}

function addChild(p) {
  const np = deepClone(p);
  np.lifeData.personal.children = {
    has: true,
    count: (np.lifeData.personal.children?.count ?? 0) + 1,
  };
  return np;
}

function clampScore(v, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Math.round(v)));
}

const OFF_COURT_CATEGORY_EFFECTS = {
  PERSONAL:    { stability: 3, supportNetwork: 4, publicPressure: 2 },
  HOME:        { stability: 2, commercialLoad: 1 },
  SOCIAL:      { growth: 3, publicPressure: 4, supportNetwork: 1 },
  BUSINESS:    { commercialLoad: 10, publicPressure: 4, discipline: -1 },
  MEDIA:       { publicPressure: 10, commercialLoad: 6, socialDistraction: 3 },
  CONTROVERSY: { stability: -10, publicPressure: 16, burnoutRisk: 10, socialDistraction: 8, coachHarmony: -4 },
  COMMUNITY:   { supportNetwork: 3, growth: 3, publicPressure: 2 },
  SPIRITUAL:   { growth: 8, discipline: 4, burnoutRisk: -7, stability: 3 },
  CAREER:      { publicPressure: 9, stability: -4, burnoutRisk: 5, coachHarmony: -2 },
  WELLNESS:    { discipline: 8, burnoutRisk: -8, stability: 3, socialDistraction: -2 },
};

const OFF_COURT_EVENT_OVERRIDES = {
  ENGAGEMENT:            { stability: 8, supportNetwork: 6, growth: 2 },
  MARRIAGE:              { stability: 10, supportNetwork: 8, growth: 2 },
  SEPARATION:            { stability: -12, burnoutRisk: 8, socialDistraction: 6 },
  DIVORCE:               { stability: -14, burnoutRisk: 10, publicPressure: 7 },
  CHILD_BORN:            { supportNetwork: 7, stability: 4, commercialLoad: 1 },
  TWINS_BORN:            { supportNetwork: 8, stability: 2, burnoutRisk: 4, commercialLoad: 3 },
  NEW_PARTNER:           { supportNetwork: 4, stability: 2, publicPressure: 3 },
  FAMILY_LOSS:           { stability: -15, burnoutRisk: 10, supportNetwork: -4 },
  MENTAL_HEALTH_BREAK:   { burnoutRisk: 16, stability: -8, growth: 3 },
  BURNOUT_WARNING:       { burnoutRisk: 12, stability: -6, discipline: 2 },
  THERAPY_PUBLIC:        { growth: 10, stability: 5, burnoutRisk: -6 },
  HEALTH_SCARE:          { burnoutRisk: 10, stability: -6, discipline: 2 },
  SOBRIETY_JOURNEY:      { growth: 12, discipline: 10, stability: 3, socialDistraction: -8 },
  RECONNECT_ROOTS:       { growth: 8, supportNetwork: 7, stability: 5 },
  ESTRANGEMENT:          { supportNetwork: -9, stability: -8, burnoutRisk: 5 },
  FOUNDATION_LAUNCH:     { growth: 5, publicPressure: 4, supportNetwork: 3 },
  BIG_DONATION:          { growth: 3, publicPressure: 3 },
  BRAND_LAUNCH:          { commercialLoad: 12, publicPressure: 6, discipline: -2 },
  COMMERCIAL_PRESSURE:   { commercialLoad: 14, publicPressure: 7, socialDistraction: 4, discipline: -2 },
  RESTAURANT_OPENING:    { commercialLoad: 8, publicPressure: 2 },
  TECH_STARTUP:          { commercialLoad: 8, growth: 2 },
  INVESTMENT:            { commercialLoad: 5 },
  APP_LAUNCH:            { commercialLoad: 7, publicPressure: 3 },
  DOCUMENTARY:           { publicPressure: 9, socialDistraction: 2 },
  MAGAZINE_COVER:        { publicPressure: 7, commercialLoad: 3 },
  TV_APPEARANCE:         { publicPressure: 8, socialDistraction: 3 },
  SOCIAL_MEDIA_VIRAL:    { publicPressure: 10, socialDistraction: 5 },
  FASHION_CAMPAIGN:      { commercialLoad: 9, publicPressure: 5, socialDistraction: 2 },
  AWARD_SHOW_HOST:       { publicPressure: 8, commercialLoad: 3 },
  SPORTS_COMMENTARY:     { growth: 2, publicPressure: 4 },
  RACKET_SMASH_VIRAL:    { stability: -6, publicPressure: 8, socialDistraction: 5 },
  ATP_FINE:              { stability: -4, publicPressure: 5 },
  SUSPENSION:            { stability: -16, publicPressure: 18, burnoutRisk: 10, coachHarmony: -6 },
  RIVAL_PUBLIC_FEUD:     { publicPressure: 9, stability: -4, socialDistraction: 4 },
  COACH_DRAMA:           { coachHarmony: -22, stability: -8, burnoutRisk: 5, publicPressure: 7 },
  FEDERATION_CONFLICT:   { publicPressure: 10, stability: -5 },
  SOCIAL_MEDIA_MELTDOWN: { stability: -12, burnoutRisk: 10, publicPressure: 14, socialDistraction: 8 },
  CHEATING_ALLEGATION:   { publicPressure: 14, stability: -10, burnoutRisk: 9 },
  SPIRITUAL_RETREAT:     { growth: 10, discipline: 4, burnoutRisk: -7 },
  PILGRIMAGE:            { growth: 9, stability: 4, burnoutRisk: -4 },
  CAREER_DOUBT:          { stability: -10, burnoutRisk: 9, publicPressure: 6 },
  COMEBACK_STATEMENT:    { growth: 6, discipline: 4, stability: 3 },
  COACH_RESET:           { coachHarmony: 16, discipline: 4, stability: 4, growth: 3 },
  RANKING_CRISIS:        { stability: -8, burnoutRisk: 7, publicPressure: 6 },
  RETIREMENT_THREAT:     { stability: -10, burnoutRisk: 8, growth: 2 },
  DIET_REVOLUTION:       { discipline: 8, burnoutRisk: -3, stability: 2 },
  DISCIPLINE_STREAK:     { discipline: 12, socialDistraction: -6, burnoutRisk: -5, stability: 3 },
  SLEEP_PROTOCOL:        { discipline: 10, burnoutRisk: -5, stability: 3 },
  RECOVERY_VIRAL:        { discipline: 6, burnoutRisk: -4 },
  ALTITUDE_CAMP:         { discipline: 7, growth: 3 },
  WELLNESS_BRAND:        { commercialLoad: 8, publicPressure: 4 },
  NO_PHONE_WEEK:         { discipline: 9, socialDistraction: -8, burnoutRisk: -5, stability: 3 },
  COLD_WATER_CONVERT:    { discipline: 5, burnoutRisk: -3 },
  PERSONAL_MATURITY:     { growth: 10, stability: 5, supportNetwork: 3, publicPressure: -1 },
};

function mergeOffCourtDelta(target, delta) {
  if (!delta) return;
  for (const [key, value] of Object.entries(delta)) {
    target[key] = (target[key] ?? 0) + value;
  }
}

function getLifeEventsInWindow(player, season = null, maxSeasons = 3) {
  const log = player.lifeEventLog ?? [];
  if (!log.length) return [];
  if (season == null) return log.slice(-8);
  return log.filter(e => (season - (e.season ?? season)) <= maxSeasons);
}

function _publicImageBias(pubId) {
  switch (pubId) {
    case 'MEDIA_DARLING': return { publicPressure: 10, commercialLoad: 5 };
    case 'TRENDSETTER':   return { publicPressure: 8, commercialLoad: 7, socialDistraction: 2 };
    case 'SOCIALITE':     return { publicPressure: 6, socialDistraction: 7, discipline: -3 };
    case 'ACTIVIST':      return { publicPressure: 4, growth: 4, supportNetwork: 2 };
    case 'ENTREPRENEUR':  return { commercialLoad: 8, growth: 2 };
    case 'FAMILY_FIRST':  return { stability: 4, supportNetwork: 6, publicPressure: -2 };
    case 'LOW_PROFILE':   return { publicPressure: -8, socialDistraction: -4, stability: 3 };
    case 'PHILOSOPHER':   return { growth: 6, discipline: 3, burnoutRisk: -2 };
    default: return null;
  }
}

function _describeLifeArc(state) {
  if (state.burnoutRisk >= 74 && state.stability <= 45) {
    return {
      id: 'SURVIVAL_MODE',
      label: 'Modo de Sobrevivencia',
      headline: 'A temporada fora da quadra virou uma prova de resistencia.',
      summary: 'Entre ruído, cobrança e desgaste, o foco agora é atravessar o calendário inteiro sem se perder.',
    };
  }
  if (state.commercialLoad >= 72 && state.publicPressure >= 68) {
    return {
      id: 'UNDER_SPOTLIGHT',
      label: 'Sob os Holofotes',
      headline: 'A vida do jogador cresceu para alem das quatro linhas.',
      summary: 'Patrocínio, exposição e demanda pública empurram a carreira para um território em que gerir energia importa tanto quanto ganhar partidas.',
    };
  }
  if (state.discipline >= 70 && state.burnoutRisk <= 42 && state.stability >= 60) {
    return {
      id: 'QUIET_CONTROL',
      label: 'Controle Silencioso',
      headline: 'Tudo ao redor parece mais arrumado do que barulhento.',
      summary: 'Rotina, descanso e vida pessoal caminham na mesma direção, criando uma sensação rara de ordem durante a temporada.',
    };
  }
  if (state.growth >= 68 && state.supportNetwork >= 58) {
    return {
      id: 'PERSONAL_GROWTH',
      label: 'Amadurecimento Real',
      headline: 'O jogador parece estar ficando maior fora da quadra e mais inteiro dentro dela.',
      summary: 'Há sinais de mudança interna: escolhas melhores, menos ruído e uma relação mais lúcida com carreira, família e pressão.',
    };
  }
  if (state.supportNetwork >= 68 && state.stability >= 58) {
    return {
      id: 'SUPPORTED_RUN',
      label: 'Base Emocional Forte',
      headline: 'Existe uma rede firme sustentando a temporada por trás dos resultados.',
      summary: 'Família, equipe e vida privada funcionam como apoio real, não como decoração biográfica.',
    };
  }
  if (state.socialDistraction >= 70) {
    return {
      id: 'NOISY_SEASON',
      label: 'Temporada de Ruido',
      headline: 'A vida em volta está pedindo atenção demais.',
      summary: 'Entre compromissos, exposição e dispersão, sobra menos silêncio do que o jogo normalmente pede.',
    };
  }
  return {
    id: 'BALANCING_ACT',
    label: 'Equilibrio Instavel',
    headline: 'A vida fora da quadra pesa, mas ainda cabe dentro da temporada.',
    summary: 'Nada parece colapsado, mas também nada está completamente sereno. É um ano de gestão fina de energia.',
  };
}

function _bandLabel(score, bands) {
  for (const band of bands) {
    if (score >= band.min) return band.label;
  }
  return bands[bands.length - 1]?.label ?? '';
}

export function getOffCourtState(player, season = null) {
  const ld = player.lifeData ?? {};
  const events = getLifeEventsInWindow(player, season);
  const relationshipId = ld.personal?.relationshipStatus?.id;
  const pubId = ld.publicImage?.id;

  const state = {
    stability: 52,
    publicPressure: 46,
    commercialLoad: 38,
    discipline: 50,
    burnoutRisk: 40,
    supportNetwork: 46,
    growth: 44,
    socialDistraction: 42,
    coachHarmony: player.coach ? 56 : 46,
    recentEvents: events.length,
  };

  if (relationshipId === 'MARRIED') mergeOffCourtDelta(state, { stability: 8, supportNetwork: 8 });
  else if (relationshipId === 'ENGAGED') mergeOffCourtDelta(state, { stability: 6, supportNetwork: 6 });
  else if (relationshipId === 'DATING') mergeOffCourtDelta(state, { supportNetwork: 3, publicPressure: 2 });
  else if (relationshipId === 'SEPARATED' || relationshipId === 'DIVORCED') mergeOffCourtDelta(state, { stability: -6, burnoutRisk: 4 });

  if (ld.personal?.children?.has) mergeOffCourtDelta(state, { supportNetwork: 6, stability: 3, commercialLoad: 1 });
  if (ld.personal?.pets?.has) mergeOffCourtDelta(state, { supportNetwork: 2, stability: 1 });
  if (ld.values?.faith?.id && ld.values.faith.id !== 'NONE') mergeOffCourtDelta(state, { growth: 3, stability: 2 });
  if ((ld.interests?.languages?.length ?? 0) >= 3) mergeOffCourtDelta(state, { growth: 2 });
  mergeOffCourtDelta(state, _publicImageBias(pubId));

  const nightlife = String(ld.social?.nightlife?.id ?? ld.social?.nightlife?.label ?? '').toUpperCase();
  if (nightlife.includes('HIGH') || nightlife.includes('INTENSE')) mergeOffCourtDelta(state, { socialDistraction: 7, discipline: -4 });
  if (nightlife.includes('LOW') || nightlife.includes('QUIET')) mergeOffCourtDelta(state, { discipline: 2, stability: 1 });

  const recovery = String(ld.training?.recovery?.id ?? ld.training?.recovery?.label ?? '').toUpperCase();
  const sleep = String(ld.sleep?.id ?? ld.sleep?.label ?? '').toUpperCase();
  if (recovery) mergeOffCourtDelta(state, { discipline: 2 });
  if (sleep.includes('STRICT') || sleep.includes('DISCIPLINED')) mergeOffCourtDelta(state, { discipline: 4, burnoutRisk: -2 });

  events.forEach((event, idx) => {
    const recencyWeight = season == null ? (idx >= Math.max(0, events.length - 3) ? 1.15 : 0.9) : Math.max(0.5, 1 - ((season - (event.season ?? season)) * 0.2));
    const delta = {};
    mergeOffCourtDelta(delta, OFF_COURT_CATEGORY_EFFECTS[event.category]);
    mergeOffCourtDelta(delta, OFF_COURT_EVENT_OVERRIDES[event.type]);
    for (const [key, value] of Object.entries(delta)) {
      state[key] = (state[key] ?? 0) + (value * recencyWeight);
    }
  });

  Object.keys(state).forEach(key => {
    if (key !== 'recentEvents') state[key] = clampScore(state[key]);
  });

  const arc = _describeLifeArc(state);
  const effects = {
    mentalidade: Math.max(-3, Math.min(3, Math.round(((state.supportNetwork - 50) / 18) + ((state.growth - 50) / 24) - ((state.publicPressure - 50) / 26)))),
    regularidade: Math.max(-3, Math.min(3, Math.round(((state.stability - 50) / 14) + ((state.discipline - 50) / 16) - ((state.socialDistraction - 50) / 18)))),
    adaptacao: Math.max(-3, Math.min(3, Math.round(((state.growth - 50) / 15) + ((state.coachHarmony - 50) / 20)))),
    resistencia: Math.max(-2, Math.min(2, Math.round(((state.discipline - 50) / 18) - ((state.burnoutRisk - 50) / 16)))),
  };

  return {
    ...state,
    arcId: arc.id,
    arcLabel: arc.label,
    headline: arc.headline,
    summary: arc.summary,
    stabilityLabel: _bandLabel(state.stability, [{ min: 76, label: 'muito estável' }, { min: 61, label: 'estável' }, { min: 46, label: 'oscilando' }, { min: 31, label: 'frágil' }, { min: 0, label: 'à deriva' }]),
    pressureLabel: _bandLabel(state.publicPressure, [{ min: 76, label: 'pressão total' }, { min: 61, label: 'muito exposto' }, { min: 46, label: 'sob atenção' }, { min: 31, label: 'controlado' }, { min: 0, label: 'fora do radar' }]),
    disciplineLabel: _bandLabel(state.discipline, [{ min: 76, label: 'obsessivamente disciplinado' }, { min: 61, label: 'muito disciplinado' }, { min: 46, label: 'consistente' }, { min: 31, label: 'irregular' }, { min: 0, label: 'desordenado' }]),
    burnoutLabel: _bandLabel(state.burnoutRisk, [{ min: 76, label: 'zona crítica' }, { min: 61, label: 'alerta forte' }, { min: 46, label: 'cansaço acumulado' }, { min: 31, label: 'administrável' }, { min: 0, label: 'leve' }]),
    supportLabel: _bandLabel(state.supportNetwork, [{ min: 76, label: 'rede fortíssima' }, { min: 61, label: 'bem amparado' }, { min: 46, label: 'apoio funcional' }, { min: 31, label: 'apoio instável' }, { min: 0, label: 'isolado' }]),
    effects,
  };
}

function applyOffCourtState(player, season = null) {
  if (!player.lifeData) return player;
  const state = getOffCourtState(player, season);
  const np = deepClone(player);
  np.lifeData.offCourt = {
    ...(np.lifeData.offCourt ?? {}),
    ...state,
    lastComputedSeason: season,
  };

  if (np.personality?.currentState) {
    np.personality = {
      ...np.personality,
      currentState: {
        ...np.personality.currentState,
        lifePressure: state.publicPressure,
        lifeBalance: state.stability,
        burnoutRisk: state.burnoutRisk,
        offCourtNarrative: state.summary,
      },
    };
  }

  if (season != null && np.lifeData.offCourt?.lastAppliedSeason !== season && np.attrs) {
    const applyAttr = (key, delta) => {
      if (typeof np.attrs[key] !== 'number' || !delta) return;
      np.attrs[key] = Math.max(1, Math.min(99, np.attrs[key] + delta));
    };
    applyAttr('mentalidade', state.effects.mentalidade);
    applyAttr('regularidade', state.effects.regularidade);
    applyAttr('adaptacao', state.effects.adaptacao);
    applyAttr('resistencia', state.effects.resistencia);
    np.lifeData.offCourt.lastAppliedSeason = season;
    np.lifeData.offCourt.lastAppliedEffects = state.effects;
  }

  return np;
}

// ═══════════════════════════════════════════════════════════════════
// PROBABILIDADES POR EVENTO
// ═══════════════════════════════════════════════════════════════════

const BASE_CHANCES = {
  ENGAGEMENT:              0.06,
  MARRIAGE:                0.07,
  SEPARATION:              0.04,
  DIVORCE:                 0.08,
  CHILD_BORN:              0.08,
  TWINS_BORN:              0.02,
  ADOPTION:                0.03,
  NEW_PARTNER:             0.08,
  AFFAIR_RUMOR:            0.04,
  FAMILY_LOSS:             0.04,
  MENTAL_HEALTH_BREAK:     0.10,
  BURNOUT_WARNING:         0.07,

  MOVE_TO_TAX_HAVEN:       0.08,
  NEW_PROPERTY:            0.10,
  LUXURY_CAR:              0.08,
  YACHT_PURCHASE:          0.06,

  FOUNDATION_LAUNCH:       0.06,
  BIG_DONATION:            0.10,
  CAUSE_CAMPAIGN:          0.12,
  SCHOOL_OPENING:          0.04,
  ENVIRONMENTAL_PLEDGE:    0.08,
  CHARITY_TOURNAMENT:      0.06,

  BRAND_LAUNCH:            0.04,
  RESTAURANT_OPENING:      0.05,
  TECH_STARTUP:            0.05,
  INVESTMENT:              0.05,
  COACHING_ACADEMY:        0.03,
  APP_LAUNCH:              0.05,
  COMMERCIAL_PRESSURE:     0.07,

  DOCUMENTARY:             0.05,
  AUTOBIOGRAPHY:           0.03,
  MAGAZINE_COVER:          0.15,
  TV_APPEARANCE:           0.12,
  PODCAST_LAUNCH:          0.07,
  ACTING_ROLE:             0.04,
  SOCIAL_MEDIA_VIRAL:      0.10,
  AMBASSADOR_ROLE:         0.08,

  CONTROVERSIAL_STATEMENT: 0.06,
  PUBLIC_DISPUTE:          0.03,
  DOPING_ALLEGATION:       0.02,
  DOPING_CLEARED:          0.70,
  TAX_EVASION:             0.04,
  ON_COURT_INCIDENT:       0.08,
  GAMBLING_RUMOR:          0.03,

  NATIONAL_HERO:           0.08,
  STREET_NAMED:            0.05,
  NATIONAL_RETURN:         0.04,
  YOUTH_EVENT:             0.12,
  UNIVERSITY_DEGREE:       0.04,
  MENTORING_PROSPECT:      0.06,

  SPIRITUAL_RETREAT:       0.07,
  PILGRIMAGE:              0.04,
  CAREER_DOUBT:            0.12,
  MINDFULNESS_ADVOCACY:    0.15,

  // PERSONAL — novos
  THERAPY_PUBLIC:          0.09,
  HEALTH_SCARE:            0.06,
  PUBLIC_COMING_OUT:       0.02,
  SOBRIETY_JOURNEY:        0.03,
  RECONNECT_ROOTS:         0.07,
  ESTRANGEMENT:            0.04,
  SIBLING_IN_SPORT:        0.05,

  // HOME — novos
  PRIVATE_JET:             0.05,
  ART_COLLECTION:          0.06,
  WINE_ESTATE:             0.05,
  SOLD_PROPERTY:           0.08,

  // SOCIAL — novos
  POLITICAL_ENDORSEMENT:   0.04,
  REFUGEE_SUPPORT:         0.06,
  LGBTQ_ALLY:              0.05,
  ANTI_DOPING_CAMPAIGN:    0.07,
  DISASTER_RELIEF:         0.05,

  // BUSINESS — novos
  FASHION_LINE:            0.05,
  SPORTS_OWNERSHIP:        0.04,
  CRYPTO_INVESTMENT:       0.07,
  CRYPTO_LOSS:             0.50,
  SPORTS_AGENCY:           0.04,
  HOTEL_INVESTMENT:        0.04,

  // MEDIA — novos
  COLUMN_NEWSPAPER:        0.07,
  CHILDREN_BOOK:           0.08,
  MUSIC_COLLAB:            0.06,
  FASHION_CAMPAIGN:        0.05,
  AWARD_SHOW_HOST:         0.05,
  SPORTS_COMMENTARY:       0.06,

  // CONTROVERSY — novos
  RACKET_SMASH_VIRAL:      0.07,
  ATP_FINE:                0.05,
  SUSPENSION:              0.30,
  RIVAL_PUBLIC_FEUD:       0.08,
  COACH_DRAMA:             0.05,
  FEDERATION_CONFLICT:     0.04,
  SOCIAL_MEDIA_MELTDOWN:   0.04,
  CHEATING_ALLEGATION:     0.03,

  // COMMUNITY — novos
  OLYMPIC_AMBASSADOR:      0.05,
  NATIONAL_AWARD:          0.07,
  HONORARY_CITIZENSHIP:    0.04,
  INDIGENOUS_HERITAGE:     0.06,

  // SPIRITUAL — novos
  RELIGION_CHANGE:         0.04,
  PHILOSOPHY_BOOK:         0.05,
  VEGAN_CONVERSION:        0.06,
  ANTI_MATERIALISM:        0.05,

  // CAREER — nova categoria
  COMEBACK_STATEMENT:      0.14,
  RANKING_CRISIS:          0.10,
  WILDCARD_ACCEPTANCE:     0.08,
  NATIONAL_CAPTAINCY:      0.06,
  RETIREMENT_THREAT:       0.09,
  RECORD_CHASE:            0.07,
  COACHING_REFUSAL:        0.06,
  COACH_RESET:             0.08,
  EARLY_PEAK_LAMENT:       0.08,

  // WELLNESS — nova categoria
  DIET_REVOLUTION:         0.08,
  DISCIPLINE_STREAK:       0.08,
  SLEEP_PROTOCOL:          0.07,
  RECOVERY_VIRAL:          0.08,
  ALTITUDE_CAMP:           0.07,
  WELLNESS_BRAND:          0.06,
  NO_PHONE_WEEK:           0.06,
  COLD_WATER_CONVERT:      0.07,
  PERSONAL_MATURITY:       0.06,
};

// ═══════════════════════════════════════════════════════════════════
// ROLLER PRINCIPAL
// ═══════════════════════════════════════════════════════════════════

/**
 * Processa eventos de vida para um jogador na virada de temporada.
 * @param {object} player
 * @param {number} season
 * @param {object} context — { rank, titleWonThisSeason, injured }
 * @returns {{ player, events }}
 */
export function rollLifeEvents(player, season, context = {}) {
  if (!player.lifeData) return { player, events: [] };

  const events = [];
  let p = player;
  const { rank = 999, titleWonThisSeason = false, injured = false } = context;
  const market = p.personality?.marketability?.score ?? 30;
  const age = p.age ?? 25;

  for (const [typeId, def] of Object.entries(LIFE_EVENT_TYPES)) {
    if (!def.condition(p)) continue;

    let prob = BASE_CHANCES[typeId] ?? 0.05;

    if (titleWonThisSeason) {
      if (def.category === 'MEDIA')   prob *= 2.0;
      if (def.category === 'SOCIAL')  prob *= 1.5;
      if (typeId === 'FOUNDATION_LAUNCH') prob *= 2.5;
      if (typeId === 'AUTOBIOGRAPHY')     prob *= 2.0;
      if (typeId === 'RECORD_CHASE')      prob *= 2.0;
      if (typeId === 'FASHION_CAMPAIGN')  prob *= 1.8;
      if (typeId === 'COMEBACK_STATEMENT')prob *= 0.2; // vencedor não faz comeback statement
    }
    if (rank <= 10) {
      if (def.category === 'MEDIA')        prob *= 1.8;
      if (typeId === 'MAGAZINE_COVER')     prob *= 2.0;
      if (typeId === 'AMBASSADOR_ROLE')    prob *= 1.6;
      if (def.category === 'CONTROVERSY') prob *= 1.3;
      if (typeId === 'FASHION_CAMPAIGN')   prob *= 2.0;
      if (typeId === 'OLYMPIC_AMBASSADOR') prob *= 1.8;
      if (typeId === 'NATIONAL_AWARD')     prob *= 1.6;
      if (typeId === 'WELLNESS_BRAND')     prob *= 1.4;
    }
    if (injured) {
      if (def.category === 'PERSONAL')       prob *= 1.3;
      if (def.category === 'SPIRITUAL')      prob *= 1.5;
      if (def.category === 'WELLNESS')       prob *= 1.6;
      if (typeId === 'CAREER_DOUBT')         prob *= 2.0;
      if (typeId === 'BURNOUT_WARNING')      prob *= 1.6;
      if (typeId === 'RETIREMENT_THREAT')    prob *= 2.5;
      if (typeId === 'THERAPY_PUBLIC')       prob *= 1.8;
      if (typeId === 'COMEBACK_STATEMENT')   prob *= 0.3;
      if (def.category === 'MEDIA')          prob *= 0.6;
      if (def.category === 'BUSINESS')       prob *= 0.7;
    }
    if (age > 33) {
      if (typeId === 'AUTOBIOGRAPHY')       prob *= 2.5;
      if (typeId === 'NATIONAL_RETURN')     prob *= 2.0;
      if (typeId === 'CAREER_DOUBT')        prob *= 1.8;
      if (typeId === 'COACHING_ACADEMY')    prob *= 2.0;
      if (typeId === 'MENTORING_PROSPECT')  prob *= 2.0;
      if (typeId === 'RETIREMENT_THREAT')   prob *= 2.0;
      if (typeId === 'EARLY_PEAK_LAMENT')   prob *= 2.5;
      if (typeId === 'NATIONAL_CAPTAINCY')  prob *= 2.0;
      if (typeId === 'SPORTS_COMMENTARY')   prob *= 2.5;
      if (typeId === 'PHILOSOPHY_BOOK')     prob *= 1.8;
      if (def.category === 'CONTROVERSY')  prob *= 0.5;
      if (def.category === 'WELLNESS')     prob *= 1.4;
    }
    if (age < 25) {
      if (typeId === 'CRYPTO_INVESTMENT')   prob *= 2.0;
      if (typeId === 'SOCIAL_MEDIA_VIRAL')  prob *= 1.8;
      if (typeId === 'RACKET_SMASH_VIRAL')  prob *= 1.6;
      if (typeId === 'RECOVERY_VIRAL')      prob *= 1.5;
      if (typeId === 'SLEEP_PROTOCOL')      prob *= 1.4;
    }
    if (market > 75) {
      if (typeId === 'DOCUMENTARY')         prob *= 2.0;
      if (typeId === 'COMMERCIAL_PRESSURE') prob *= 2.0;
      if (typeId === 'SOCIAL_MEDIA_VIRAL')  prob *= 1.5;
      if (typeId === 'FASHION_CAMPAIGN')    prob *= 2.0;
      if (typeId === 'MUSIC_COLLAB')        prob *= 1.8;
      if (typeId === 'AWARD_SHOW_HOST')     prob *= 1.6;
      if (typeId === 'FASHION_LINE')        prob *= 1.7;
    }
    // Pressão de ranking: ranking ruim aumenta eventos de crise de carreira
    if (rank > 60 && age < 34) {
      if (typeId === 'RANKING_CRISIS')      prob *= 2.0;
      if (typeId === 'COACH_RESET')         prob *= 1.5;
      if (typeId === 'PERSONAL_MATURITY')   prob *= 1.3;
      if (typeId === 'WILDCARD_ACCEPTANCE') prob *= 2.5;
      if (typeId === 'RETIREMENT_THREAT')   prob *= 1.5;
      if (typeId === 'COMEBACK_STATEMENT')  prob *= 1.8;
    }
    if ((p.personality?.currentState?.pressureLevel ?? 0) >= 70) {
      if (typeId === 'BURNOUT_WARNING')      prob *= 2.0;
      if (typeId === 'DISCIPLINE_STREAK')    prob *= 0.8;
      if (typeId === 'COMMERCIAL_PRESSURE')  prob *= 1.4;
    }
    // Personalidade CONFRONTATIONAL aumenta controvérsias
    if (p.personality?.pressPersona?.id === 'CONFRONTATIONAL') {
      if (def.category === 'CONTROVERSY') prob *= 1.8;
      if (typeId === 'RIVAL_PUBLIC_FEUD') prob *= 2.5;
      if (typeId === 'FEDERATION_CONFLICT') prob *= 2.0;
    }
    // Personalidade INTELLECTUAL aumenta eventos de mídia intelectual
    if (p.personality?.pressPersona?.id === 'INTELLECTUAL') {
      if (typeId === 'COLUMN_NEWSPAPER')  prob *= 2.0;
      if (typeId === 'PHILOSOPHY_BOOK')   prob *= 2.5;
      if (typeId === 'AUTOBIOGRAPHY')     prob *= 1.8;
    }

    if (!chance(prob)) continue;

    const playerBefore = p;
    p = def.apply(p);

    const event = {
      type:         typeId,
      category:     def.category,
      label:        def.label,
      icon:         def.icon,
      season,
      description:  def.describe(playerBefore),
      newsworthy:   def.newsworthy,
      marketImpact: def.marketImpact ?? 0,
    };
    events.push(event);

    if (def.marketImpact !== 0 && p.personality?.marketability) {
      const newScore = Math.min(100, Math.max(0,
        (p.personality.marketability.score ?? 30) + def.marketImpact
      ));
      p = { ...p, personality: { ...p.personality, marketability: { ...p.personality.marketability, score: newScore } } };
    }
  }

  if (events.length > 0) {
    p = { ...p, lifeEventLog: [...(p.lifeEventLog ?? []), ...events] };
  }

  p = applyOffCourtState(p, season);
  return { player: p, events };
}

// ═══════════════════════════════════════════════════════════════════
// MIGRAÇÃO
// ═══════════════════════════════════════════════════════════════════

export function migrateLifeEventLog(player) {
  if (Array.isArray(player.lifeEventLog)) return player;
  return { ...player, lifeEventLog: [] };
}

// ═══════════════════════════════════════════════════════════════════
// QUERY HELPERS
// ═══════════════════════════════════════════════════════════════════

export function getRecentLifeEvents(player, n = 5) {
  return (player.lifeEventLog ?? []).slice(-n);
}

export function getNewsworthyEvents(player, sinceYear, currentYear) {
  return (player.lifeEventLog ?? []).filter(
    e => e.newsworthy && e.season >= sinceYear && e.season <= currentYear
  );
}

export function getEventsByCategory(player, category) {
  return (player.lifeEventLog ?? []).filter(e => e.category === category);
}

export function getLastEventOfType(player, typeId) {
  const log = player.lifeEventLog ?? [];
  for (let i = log.length - 1; i >= 0; i--) {
    if (log[i].type === typeId) return log[i];
  }
  return null;
}

export function hasEventOccurred(player, typeId) {
  return (player.lifeEventLog ?? []).some(e => e.type === typeId);
}

export function summarizeLifeSeason(events) {
  if (!events?.length) return null;
  const parts = [];
  const personal    = events.filter(e => e.category === 'PERSONAL');
  const social      = events.filter(e => e.category === 'SOCIAL');
  const media       = events.filter(e => e.category === 'MEDIA');
  const controversy = events.filter(e => e.category === 'CONTROVERSY');
  const career      = events.filter(e => e.category === 'CAREER');
  const wellness    = events.filter(e => e.category === 'WELLNESS');
  const business    = events.filter(e => e.category === 'BUSINESS');
  const community   = events.filter(e => e.category === 'COMMUNITY');
  if (career.length)      parts.push(career.map(e => e.description.toLowerCase()).join(' e '));
  if (personal.length)    parts.push(personal.map(e => e.description.toLowerCase()).join(' e '));
  if (controversy.length) parts.push(controversy.map(e => e.description.toLowerCase()).join(' e '));
  if (social.length)      parts.push(social.map(e => e.description.toLowerCase()).join(' e '));
  if (media.length)       parts.push(media.map(e => e.description.toLowerCase()).join(' e '));
  if (wellness.length)    parts.push(wellness.map(e => e.description.toLowerCase()).join(' e '));
  if (business.length)    parts.push(business.map(e => e.description.toLowerCase()).join(' e '));
  if (community.length)   parts.push(community.map(e => e.description.toLowerCase()).join(' e '));
  return parts.join('; ');
}
