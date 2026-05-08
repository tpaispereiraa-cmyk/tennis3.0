/**
 * SponsorIdentity.js
 *
 * Camada narrativa/estratégica das marcas. O catálogo diz "quem é a marca";
 * esta camada interpreta "como ela pensa" e "que tipo de atleta ela quer".
 */

const CATEGORY_DNA = {
  RACKET: {
    label: 'Equipamento de jogo',
    world: 'performance pura',
    values: ['precisão', 'controle', 'credibilidade técnica'],
    athleteTraits: ['identidade técnica clara', 'golpes reconhecíveis', 'respeito de vestiário'],
    campaignAngles: ['arma de assinatura', 'controle sob pressão', 'evolução do equipamento'],
    publicRisk: 'MEDIUM',
  },
  APPAREL: {
    label: 'Vestuário esportivo',
    world: 'imagem competitiva',
    values: ['estilo', 'atletismo', 'presença global'],
    athleteTraits: ['carisma visual', 'físico marcante', 'jogo televisionável'],
    campaignAngles: ['coleção de temporada', 'visual de campeão', 'treino como manifesto'],
    publicRisk: 'MEDIUM',
  },
  LUXURY: {
    label: 'Luxo e prestígio',
    world: 'legado e status',
    values: ['elegância', 'raridade', 'controle de imagem'],
    athleteTraits: ['reputação limpa', 'maturidade pública', 'títulos que parecem eternos'],
    campaignAngles: ['tempo e legado', 'viagem de campeão', 'objeto de assinatura'],
    publicRisk: 'LOW',
  },
  FINANCE: {
    label: 'Finanças',
    world: 'confiança e patrimônio',
    values: ['estabilidade', 'ambição', 'disciplina'],
    athleteTraits: ['imagem confiável', 'trajetória de crescimento', 'baixa volatilidade'],
    campaignAngles: ['investir cedo', 'construir legado', 'controle do futuro'],
    publicRisk: 'LOW',
  },
  TECH: {
    label: 'Tecnologia',
    world: 'futuro e escala',
    values: ['inovação', 'velocidade', 'conexão'],
    athleteTraits: ['mentalidade moderna', 'apelo digital', 'adaptação rápida'],
    campaignAngles: ['o futuro do jogo', 'dados e performance', 'conexão com fãs'],
    publicRisk: 'MEDIUM',
  },
  ENERGY: {
    label: 'Energia e nutrição',
    world: 'intensidade',
    values: ['explosão', 'resistência', 'atitude'],
    athleteTraits: ['forma quente', 'fisicalidade', 'personalidade elétrica'],
    campaignAngles: ['sem freio', 'ponto depois ponto', 'energia em quinta marcha'],
    publicRisk: 'HIGH',
  },
  AUTOMOTIVE: {
    label: 'Automotivo',
    world: 'performance e mobilidade',
    values: ['potência', 'engenharia', 'controle'],
    athleteTraits: ['velocidade simbólica', 'competitividade', 'imagem premium'],
    campaignAngles: ['aceleração mental', 'domínio da curva', 'máquina e atleta'],
    publicRisk: 'MEDIUM',
  },
  AIRLINE: {
    label: 'Aviação',
    world: 'alcance global',
    values: ['sofisticação', 'confiança', 'mundo aberto'],
    athleteTraits: ['calendário global', 'postura internacional', 'baixíssimo ruído'],
    campaignAngles: ['o mundo como quadra', 'jornada de campeão', 'chegar pronto'],
    publicRisk: 'LOW',
  },
  RETAIL: {
    label: 'Varejo',
    world: 'acesso e volume',
    values: ['popularidade', 'proximidade', 'conversão'],
    athleteTraits: ['identificação com torcedores', 'boa comunicação', 'história acessível'],
    campaignAngles: ['equipado para vencer', 'da base ao tour', 'produto que vira rotina'],
    publicRisk: 'MEDIUM',
  },
  MEDIA: {
    label: 'Mídia e entretenimento',
    world: 'atenção pública',
    values: ['história', 'audiência', 'conversa cultural'],
    athleteTraits: ['drama competitivo', 'rivalidades', 'frases fortes'],
    campaignAngles: ['a série da temporada', 'bastidores do circuito', 'personagem principal'],
    publicRisk: 'HIGH',
  },
  CONSUMER: {
    label: 'Consumo de massa',
    world: 'popularidade transversal',
    values: ['carisma', 'família', 'alcance cotidiano'],
    athleteTraits: ['simpatia pública', 'reconhecimento fora do tênis', 'baixo atrito com famílias'],
    campaignAngles: ['o ponto que todo mundo viu', 'celebração popular', 'campeão do cotidiano'],
    publicRisk: 'MEDIUM',
  },
};

const PERSONALITY_DNA = {
  CHAMPION_HUNTER: { label: 'Caçadora de campeões', appetite: 'quer vencer agora', fitBoosts: ['ranking alto', 'títulos grandes', 'dominância recente'], angle: 'a marca quer comprar certeza, não promessa' },
  REBEL_SEEKER: { label: 'Caçadora de rebeldes', appetite: 'aceita barulho se houver magnetismo', fitBoosts: ['carisma', 'provocação', 'jogo explosivo'], angle: 'a marca procura alguém que faça o circuito falar' },
  HERITAGE: { label: 'Tradicionalista', appetite: 'prefere legado e imagem limpa', fitBoosts: ['elegância', 'histórico de Slam', 'reputação estável'], angle: 'a marca quer parecer eterna junto com o atleta' },
  INNOVATION: { label: 'Visionária', appetite: 'paga pelo futuro antes de ele ficar óbvio', fitBoosts: ['juventude', 'crescimento rápido', 'perfil moderno'], angle: 'a marca quer descobrir a próxima era antes das rivais' },
  MASS_APPEAL: { label: 'Popular', appetite: 'quer alcance e conversão', fitBoosts: ['visibilidade', 'simpatia', 'mercado grande'], angle: 'a marca quer um rosto que atravesse bolhas' },
  UNDERDOG_PATRON: { label: 'Apostadora de azarões', appetite: 'prefere entrar cedo e barato', fitBoosts: ['história de superação', 'prospect', 'ranking em ascensão'], angle: 'a marca quer poder dizer que viu antes de todo mundo' },
  SURFACE_EXPERT: { label: 'Especialista de superfície', appetite: 'quer autoridade técnica em um território', fitBoosts: ['domínio em piso específico', 'identidade tática', 'nicho forte'], angle: 'a marca quer ser dona de uma linguagem de jogo' },
  GLOBAL_REACH: { label: 'Globalista', appetite: 'compra alcance internacional', fitBoosts: ['mercados grandes', 'agenda mundial', 'imagem exportável'], angle: 'a marca quer uma campanha que funcione em vários continentes' },
};

const TIER_DNA = {
  ENTRY: { prestige: 'local', pressure: 'baixa', campaignScale: 'regional' },
  MID: { prestige: 'nacional', pressure: 'moderada', campaignScale: 'mercado prioritário' },
  PREMIUM: { prestige: 'continental', pressure: 'alta', campaignScale: 'campanha internacional' },
  ELITE: { prestige: 'global', pressure: 'máxima', campaignScale: 'campanha global de legado' },
};

function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }

function pickStable(arr, key = '') {
  if (!arr?.length) return null;
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  return arr[hash % arr.length];
}

function countSlams(player) {
  const hist = Array.isArray(player?._seasonHistory) ? player._seasonHistory : [];
  return hist.filter(s => s.titleWon === 'SLAM').length;
}

export function getSponsorIdentity(sponsor) {
  if (!sponsor) return null;
  const category = CATEGORY_DNA[sponsor.category] ?? CATEGORY_DNA.CONSUMER;
  const personality = PERSONALITY_DNA[sponsor.personality] ?? PERSONALITY_DNA.MASS_APPEAL;
  const tier = TIER_DNA[sponsor.tier] ?? TIER_DNA.ENTRY;
  const riskProfile = sponsor.conservativeImage
    ? 'protege imagem com força'
    : sponsor.riskTolerance >= 0.65
    ? 'aceita risco por upside cultural'
    : 'tolera risco controlado';

  return {
    category,
    personality,
    tier,
    riskProfile,
    signatureAngle: pickStable(category.campaignAngles, sponsor.id),
    values: [...new Set([...category.values, ...(personality.fitBoosts ?? [])])],
    desiredAthlete: category.athleteTraits,
    campaignScale: tier.campaignScale,
    summary: `${sponsor.name} atua em ${category.world}: ${personality.angle}.`,
  };
}

export function evaluateSponsorIdentityFit(sponsor, player, opts = {}) {
  const identity = getSponsorIdentity(sponsor);
  if (!identity || !player) return { scoreDelta: 0, reasons: [], identity: null, campaignConcept: null };

  const reasons = [];
  let delta = 0;
  const rank = player.rankPosition ?? 999;
  const age = player.age ?? 25;
  const ifr = player.phaseTwo?.ifr ?? 50;
  const visibility = player.phaseTwo?.visibility ?? 50;
  const market = player.personality?.marketability?.score ?? 30;
  const pressPersona = player.personality?.pressPersona;
  const slams = countSlams(player);

  if (identity.personality.label === 'Caçadora de campeões' && rank <= 10) {
    delta += rank <= 3 ? 9 : 5;
    reasons.push('DNA da marca pede campeão consolidado');
  }
  if (identity.personality.label === 'Visionária' && age <= 23) {
    delta += 7;
    reasons.push('Marca enxerga valor de futuro no atleta jovem');
  }
  if (identity.personality.label === 'Tradicionalista' && (slams > 0 || rank <= 8)) {
    delta += 6;
    reasons.push('Histórico competitivo sustenta narrativa de legado');
  }
  if (identity.personality.label === 'Popular' && (visibility >= 65 || market >= 70)) {
    delta += 7;
    reasons.push('Atleta tem alcance compatível com campanha de massa');
  }
  if (identity.personality.label === 'Caçadora de rebeldes' && ['CONFRONTATIONAL', 'CHARISMATIC', 'SHOWMAN'].includes(pressPersona)) {
    delta += 8;
    reasons.push('Personalidade pública gera a tensão cultural que a marca procura');
  }
  if (identity.personality.label === 'Apostadora de azarões' && (rank > 50 || age <= 21)) {
    delta += 6;
    reasons.push('Marca pode construir a narrativa de ter apostado cedo');
  }

  if (identity.category.publicRisk === 'LOW' && pressPersona === 'CONFRONTATIONAL') {
    delta -= 8;
    reasons.push('Tom público do atleta aumenta risco para uma marca institucional');
  }
  if (identity.category.publicRisk === 'HIGH' && ifr >= 70) {
    delta += 5;
    reasons.push('Marca vive de atenção e o atleta está quente no circuito');
  }
  if (sponsor.conservativeImage && market < 55) {
    delta -= 4;
    reasons.push('Marca conservadora sente falta de segurança de imagem');
  }

  const campaignConcept = buildCampaignConcept(sponsor, player, identity);
  return {
    scoreDelta: clamp(Math.round(delta), -15, 18),
    reasons,
    identity,
    campaignConcept,
  };
}

export function buildCampaignConcept(sponsor, player, identity = getSponsorIdentity(sponsor)) {
  if (!sponsor || !player || !identity) return null;
  const hook = identity.signatureAngle;
  const scope = identity.campaignScale;
  const playerName = player.name ?? 'atleta';
  const country = player.nationality ?? player.country ?? null;
  const marketLine = country ? `com foco inicial em ${country}` : 'com alcance internacional';

  return {
    hook,
    scope,
    marketLine,
    pitch: `${sponsor.name} vê ${playerName} como rosto de ${hook}, ${marketLine}.`,
    internalBrief: `${identity.personality.label}: ${identity.personality.appetite}; ${identity.riskProfile}; escala ${scope}.`,
  };
}
