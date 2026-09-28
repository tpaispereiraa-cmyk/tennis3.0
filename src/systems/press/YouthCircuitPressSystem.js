import { buildYouthOriginSummary } from '../youth/YouthOriginsSystem.js';
import { describeYouthAcademy } from '../youth/YouthAcademySystem.js';
import { YOUTH_CIRCUIT_JOURNALISTS } from './YouthJournalists.js';

const TIER_LABEL = {
  JUNIOR_50: 'Junior 50',
  JUNIOR_100: 'Junior 100',
  JUNIOR_SLAM: 'Grand Slam juvenil',
  PROSPECTS_FINALS: 'Junior Finals',
  ATP_PROSPECTS: 'etapa juvenil',
};

const hash = (value) => {
  let result = 2166136261;
  for (const char of String(value ?? 'youth-press')) {
    result ^= char.charCodeAt(0);
    result = Math.imul(result, 16777619);
  }
  return result >>> 0;
};

function isYouthTournament(tournament = {}) {
  return Boolean(
    tournament.isJuniors || tournament.isProspects || tournament.isProspectsFinals ||
    ['JUNIOR_50', 'JUNIOR_100', 'JUNIOR_SLAM', 'ATP_PROSPECTS', 'PROSPECTS_FINALS'].includes(tournament.category)
  );
}

function findPlayer(id, players = [], fallback = null) {
  return players.find((player) => player?.id === id) ?? fallback;
}

function profileFor(player = {}) {
  return player.youthProfile ?? player.youth ?? {};
}

function rankFor(player = {}) {
  const rank = Number(player.juniorRanking ?? player.juniorRank ?? player.rankPosition ?? player.rank ?? player.ranking);
  return Number.isFinite(rank) && rank > 0 ? `#${rank}` : 'sem ranking registrado';
}

function ageFor(player = {}, year) {
  const age = Number(player.age ?? (Number.isFinite(player.birthYear) ? year - player.birthYear : null));
  return Number.isFinite(age) ? `${age} anos` : 'idade juvenil';
}

function titleCount(player = {}) {
  const titles = player.careerTitles ?? profileFor(player).careerTitles ?? {};
  return Number(titles.junior ?? titles.prospects ?? 0) + Number(titles.juniorSlams ?? 0);
}

function article({ id, journalist, tournament, year, player, headline, deck, body, tags, angle }) {
  return {
    id,
    type: angle === 'FORMATION' ? 'COLUMN' : 'PROSPECT',
    journalist,
    tournament: tournament?.name,
    tournamentId: tournament?.id,
    year,
    player,
    headline,
    deck,
    body,
    length: 'MEDIUM',
    tags: ['juvenil', ...(tags ?? [])],
    isYouthCircuitCoverage: true,
    youthAngle: angle,
    createdAt: `${year}-${tournament?.week ?? 0}`,
  };
}

function championCoverage({ tournament, champion, year }) {
  const tier = TIER_LABEL[tournament.category] ?? 'etapa juvenil';
  const major = tournament.isJuniorSlam || tournament.category === 'JUNIOR_SLAM';
  const titleLabel = major ? 'muda de patamar' : 'ganha um sinal importante';
  const titles = titleCount(champion);
  return article({
    id: `youth-results-${year}-${tournament.id}-${champion.id}`,
    journalist: YOUTH_CIRCUIT_JOURNALISTS.FERREIRA,
    tournament,
    year,
    player: champion,
    headline: `${champion.name} vence ${tournament.name} e ${titleLabel} na geração`,
    deck: `${tier}, ${ageFor(champion, year)} e ${rankFor(champion)}: o resultado vale mais como direção do que como promessa fechada.`,
    body: `Maya Ferreira, da Base 16, lê o título com a cautela que a base exige. ${champion.name} sai de ${tournament.name} com ${titles} conquista${titles === 1 ? '' : 's'} juvenil${titles === 1 ? '' : 'is'} no registro e uma semana que melhora sua posição na fila da geração. Não é um atalho para o Tour: é evidência de que o nível aparece quando a chave aperta. O próximo bloco do circuito dirá se foi impulso ou padrão.`,
    tags: [tier, 'resultado', 'projeção'],
    angle: 'RESULTS',
  });
}

function formationCoverage({ tournament, champion, year }) {
  const profile = profileFor(champion);
  const origin = buildYouthOriginSummary(profile);
  const academy = describeYouthAcademy(profile.academy);
  const context = [origin, academy].filter(Boolean).join(' ');
  const fallback = 'A leitura de Nia Okoro começa antes do placar: desenvolvimento não é uma linha reta, e uma boa semana ainda precisa sobreviver a mudanças de piso, corpo e expectativa.';
  return article({
    id: `youth-formation-${year}-${tournament.id}-${champion.id}`,
    journalist: YOUTH_CIRCUIT_JOURNALISTS.OKORO,
    tournament,
    year,
    player: champion,
    headline: `O que ${tournament.name} revelou sobre a formação de ${champion.name}`,
    deck: 'Mais que um troféu: a rota, a escola de jogo e as escolhas que explicam esta semana.',
    body: `Nia Okoro, do Entre Linhas, evita transformar uma conquista juvenil em destino. ${context || fallback} O torneio mostra uma versão mais madura de ${champion.name}, mas a história interessante é como essa versão chegou aqui. A base produz avanços, pausas e recomeços; acompanhar esses sinais é mais honesto do que decretar o próximo campeão adulto.`,
    tags: ['formação', 'academia', 'trajetória'],
    angle: 'FORMATION',
  });
}

export function generateYouthCircuitCoverage({ tournament, bracket, prospects = [], year }) {
  if (!isYouthTournament(tournament) || !bracket?.champion) return [];
  const champion = findPlayer(bracket.champion.id, prospects, bracket.champion);
  const articles = [championCoverage({ tournament, champion, year })];
  const deservesProfile = tournament.isJuniorSlam || tournament.isProspectsFinals || tournament.category === 'JUNIOR_100';
  if (deservesProfile) articles.push(formationCoverage({ tournament, champion, year }));
  return articles;
}

export function generateYouthCircuitPreview({ tournament, preparedPackage, prospects = [], year }) {
  if (!isYouthTournament(tournament)) return [];
  const draw = preparedPackage?.mainDraw ?? preparedPackage?.draw ?? [];
  const entrantIds = Array.isArray(draw)
    ? draw.flat(Infinity).map((entry) => entry?.id).filter(Boolean)
    : [];
  const pool = (entrantIds.length ? prospects.filter((player) => entrantIds.includes(player.id)) : prospects)
    .slice()
    .sort((a, b) => (a.juniorRanking ?? a.juniorRank ?? a.rankPosition ?? a.rank ?? 9999) - (b.juniorRanking ?? b.juniorRank ?? b.rankPosition ?? b.rank ?? 9999));
  const lead = pool[hash(`${tournament.id}-${year}`) % Math.max(1, Math.min(pool.length, 4))];
  if (!lead) return [];
  return [article({
    id: `youth-preview-${year}-${tournament.id}`,
    journalist: YOUTH_CIRCUIT_JOURNALISTS.FERREIRA,
    tournament,
    year,
    player: lead,
    headline: `${tournament.name}: quem chega com sinal verde na base`,
    deck: `${lead.name}, ${ageFor(lead, year)}, aparece entre os nomes para observar — sem confundir expectativa com garantia.`,
    body: `A Base 16 abre a semana olhando para o recorte certo: não apenas quem ocupa a melhor posição, mas quem está transformando repertório e consistência em resultado. ${lead.name} começa ${tournament.name} como um dos termômetros do evento. A chave pode mudar tudo, e é justamente por isso que o juvenil vale ser acompanhado torneio a torneio.`,
    tags: ['agenda', 'observação', TIER_LABEL[tournament.category] ?? 'juvenil'],
    angle: 'PREVIEW',
  })];
}
