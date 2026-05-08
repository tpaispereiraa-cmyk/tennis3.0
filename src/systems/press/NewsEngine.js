/**
 * NewsEngine.js
 * ─────────────────────────────────────────────────────────────────
 * Motor de jornalismo do Tennis Universe.
 *
 * Gera artigos automáticos após cada torneio com base nos dados
 * reais do universo: resultados, rivalidades, lesões, recordes,
 * personalidades dos jornalistas e contexto narrativo acumulado.
 *
 * CONCEITOS CENTRAIS
 * ─────────────────────────────────────────────────────────────────
 *  Journalist  — entidade com estilo, especialidade e voz própria.
 *                Influencia o ângulo e o tom de cada matéria.
 *
 *  Article     — matéria gerada. Tem tipo, tamanho, headline,
 *                corpo, jornalista e metadados de contexto.
 *
 *  NewsFeed    — lista ordenada de artigos. Cresce a cada torneio.
 *                Artigos mais antigos são comprimidos mas mantidos.
 *
 * TIPOS DE MATÉRIA
 * ─────────────────────────────────────────────────────────────────
 *  CHAMPION       — campeão do torneio
 *  UPSET          — azarão elimina top-seed
 *  EPIC_MATCH     — duelo de 3+ sets com drama
 *  INJURY         — lesão confirmada ou suspeita
 *  RIVALRY        — encontro de rivais históricos
 *  RECORD         — recorde quebrado
 *  RUMOR          — boato (baseado em dados reais, mas sem certeza)
 *  COMEBACK       — retorno de forma após sequência ruim
 *  RETIREMENT     — aposentadoria
 *  PROSPECT       — jovem fazendo barulho
 *  ANALYSIS       — análise tática / tendência
 *  COLUMN         — coluna de opinião (mais longa, mais pessoal)
 *
 * INTEGRAÇÃO
 * ─────────────────────────────────────────────────────────────────
 *  Chamar generateTournamentNews(tournament, bracket, state) após
 *  cada APPLY_TOURNAMENT_RESULT no reducer do UniverseManager.
 *
 *  O retorno é um array de Article que deve ser salvo em
 *  state.newsFeed = [...state.newsFeed, ...articles].
 *
 * EXPORTS PRINCIPAIS
 * ─────────────────────────────────────────────────────────────────
 *  generateTournamentNews(tournament, bracket, state) → Article[]
 *  generateYearEndNews(state) → Article[]
 *  JOURNALISTS         — catálogo de jornalistas
 *  NEWS_TYPES          — tipos de matéria com metadados
 */

// ═══════════════════════════════════════════════════════════════════
// JORNALISTAS
// ═══════════════════════════════════════════════════════════════════

import { narrateMatch, narrateMatchWithRivalry } from './MatchNarrator.js';
import { INJURY_TYPES, INJURY_GRADES, getRecidiveInfo, getInjuryDisplayName } from '../health/InjurySystem.js';
import { CALENDAR } from '../tournaments/TournamentSystem.js';
import { buildPlayerIdentity } from '../../domain/players/PlayerIdentity.js';
import { buildSeasonAct } from '../narrative/SeasonActEngine.js';
import { buildTournamentAftermath } from '../narrative/TournamentAftermathEngine.js';
import {
  buildChampionImpact,
  buildUpsetImpact,
  buildEpicMatchImpact,
  buildRivalryImpact,
  buildTournamentTrendImpact,
} from '../narrative/NarrativeImpactEngine.js';

export const JOURNALISTS = {

  CARVALHO: {
    id:          'CARVALHO',
    name:        'Paulo Carvalho',
    outlet:      'Circuit Report',
    specialty:   'Grand Slams e histórico',
    style:       'LITERARY',      // prosa rica, citações, contexto histórico profundo
    icon:        '🖊️',
    color:       '#D4A017',
    bias:        'CLAY',          // faz mais matérias sobre saibro
    verbosity:   'LONG',          // matérias longas
    voice: {
      opening:   ['O circuito tem memória longa.', 'Há momentos que o tênis guarda como troféu.', 'Alguns jogos não acabam quando o último ponto é marcado.'],
      transition:['O contexto importa.', 'Para entender o que aconteceu hoje, é preciso recuar.', 'A história não começa aqui.'],
      closing:   ['O circuito continua. A memória, também.', 'O placar registra. A narrativa vai mais fundo.', 'Isso é tênis — e tênis raramente é só tênis.'],
    },
  },

  PETROV: {
    id:          'PETROV',
    name:        'Alexei Petrov',
    outlet:      'TennisStats Weekly',
    specialty:   'Estatísticas e análise tática',
    style:       'ANALYTICAL',    // dados, porcentagens, comparações
    icon:        '📊',
    color:       '#4A90D9',
    bias:        'HARD',
    verbosity:   'MEDIUM',
    voice: {
      opening:   ['Os números dizem o seguinte.', 'A análise desta semana aponta para algo claro.', 'Vamos ao que os dados revelam.'],
      transition:['Traduzindo para números.', 'O que as estatísticas mostram é.', 'Em termos táticos.'],
      closing:   ['A tendência é essa. Os próximos torneios vão confirmar ou refutar.', 'Esses números são difíceis de ignorar.', 'O padrão está estabelecido.'],
    },
  },

  FONTAINE: {
    id:          'FONTAINE',
    name:        'Isabelle Fontaine',
    outlet:      'Le Circuit Mondial',
    specialty:   'Bastidores e personagens',
    style:       'GOSSIP',        // boatos, personalidades, drama fora da quadra
    icon:        '🎙️',
    color:       '#E040FB',
    bias:        null,
    verbosity:   'SHORT',         // matérias curtas e diretas
    voice: {
      opening:   ['O que não aparece no placar.', 'Fontes próximas ao circuito confirmam.', 'Fora das câmeras, a história é diferente.'],
      transition:['Nos bastidores.', 'Segundo fontes que pedem anonimato.', 'O que se comenta nos corredores.'],
      closing:   ['O circuito vai falar sobre isso por um tempo.', 'Aguardem os próximos capítulos.', 'Nem tudo que acontece nas quadras fica nas quadras.'],
    },
  },

  NAKANO: {
    id:          'NAKANO',
    name:        'Yuki Nakano',
    outlet:      'Ace Magazine',
    specialty:   'Jovens talentos e futuro do tênis',
    style:       'HYPE',          // entusiasmo, superlativos, foco em prospects
    icon:        '🌟',
    color:       '#2ECC71',
    bias:        'PROSPECT',
    verbosity:   'MEDIUM',
    voice: {
      opening:   ['O futuro chegou cedo desta vez.', 'Há talentos que não pedem licença para aparecer.', 'Uma geração não anuncia quando vai chegar — ela simplesmente aparece.'],
      transition:['O que torna esse jogador diferente.', 'A trajetória fala por si.', 'Para entender o impacto.'],
      closing:   ['O circuito não vai esquecer esse nome tão cedo.', 'Isso é só o começo.', 'O futuro do tênis está sendo escrito agora.'],
    },
  },

  REED: {
    id:          'REED',
    name:        'James Reed',
    outlet:      'The Hard Court',
    specialty:   'Opiniões polêmicas e crítica',
    style:       'OPINION',       // colunista opinativo, não tem medo de criticar
    icon:        '🔥',
    color:       '#D4561E',
    bias:        null,
    verbosity:   'MEDIUM',
    voice: {
      opening:   ['Vou ser direto.', 'Alguém tem que dizer.', 'O circuito prefere não falar sobre isso. Eu prefiro.'],
      transition:['O problema real é.', 'O que ninguém está dizendo.', 'Para além da narrativa oficial.'],
      closing:   ['Não é opinião popular. É o que os dados e a lógica mostram.', 'Discorde. Mas olhe para os fatos antes.', 'O circuito vai discutir isso. Deveria.'],
    },
  },

  SANTOS: {
    id:          'SANTOS',
    name:        'Marina Santos',
    outlet:      'Tênis Brasil',
    specialty:   'Cobertura emocional e humana',
    style:       'NARRATIVE',     // foco no jogador como pessoa, não atleta
    icon:        '❤️',
    color:       '#F48FB1',
    bias:        null,
    verbosity:   'LONG',
    voice: {
      opening:   ['Por trás do ranking, há uma pessoa.', 'O tênis tem essa crueldade gentil.', 'Antes do atleta, existe o ser humano.'],
      transition:['O que essa história revela sobre o personagem.', 'Além do resultado, o que fica.', 'Para entender o peso disso.'],
      closing:   ['O tênis é cruel. E às vezes, exatamente por isso, é belo.', 'O placar some. O que a pessoa viveu, fica.', 'Isso é o que o esporte faz quando funciona.'],
    },
  },

  // ── NOVOS JORNALISTAS ─────────────────────────────────────────

  SILVA: {
    id:          'SILVA',
    name:        'Rodrigo Silva',
    outlet:      'The Grind — Challenger Circuit',
    specialty:   'Challenger e ATP 100 — o circuito de base',
    style:       'GRITTY',        // cru, direto, fala de ranking em pontos não em posições
    icon:        '🥈',
    color:       '#78909C',
    bias:        'CHALLENGER',
    verbosity:   'SHORT',
    voice: {
      opening:   ['No circuito de base, cada ponto tem peso diferente.', 'Trezentos pontos mudam uma carreira aqui embaixo.', 'Ninguém chega ao topo sem passar por aqui primeiro.'],
      transition:['O que isso representa no ranking.', 'A realidade do circuito de base.', 'Fora do holofote, mas não fora do jogo.'],
      closing:   ['O circuito principal está a alguns resultados de distância.', 'É assim que carreiras são construídas — jogo a jogo, ponto a ponto.', 'O ranking não mente. E esse resultado vai aparecer nele.'],
    },
  },

  KOWALSKI: {
    id:          'KOWALSKI',
    name:        'Helena Kowalski',
    outlet:      'Season Review',
    specialty:   'Finals e narrativa de temporada completa',
    style:       'SEASON',        // amarra o ano inteiro, lembra promessas de janeiro
    icon:        '🏅',
    color:       '#9C27B0',
    bias:        'FINALS',
    verbosity:   'LONG',
    voice: {
      opening:   ['Oito jogadores. Uma temporada inteira para chegar aqui.', 'Janeiro parece muito longe daqui.', 'O circuito escolheu seus oito. Agora vamos ver se escolheu bem.'],
      transition:['O que a temporada mostrou sobre esse jogador.', 'O que foi prometido em janeiro.', 'O que mudou desde o primeiro torneio do ano.'],
      closing:   ['A temporada vai ser julgada por isso.', 'Oito nomes. Uma temporada inteira. O circuito vai lembrar.', 'O que fica aqui é o resumo de um ano inteiro de tênis.'],
    },
  },

};

// ═══════════════════════════════════════════════════════════════════
// TIPOS DE MATÉRIA
// ═══════════════════════════════════════════════════════════════════

export const NEWS_TYPES = {
  BREAKING:        { id: 'BREAKING',        label: 'Urgente',             icon: '🚨', color: '#FF5252', priority: 10 },
  PREVIEW:         { id: 'PREVIEW',         label: 'Pré-Torneio',         icon: '🗞️', color: '#5CB8E4', priority: 6  },
  PREDICTION:      { id: 'PREDICTION',      label: 'Palpites',            icon: '🎯', color: '#26C6DA', priority: 7  },
  CHAMPION:    { id: 'CHAMPION',   label: 'Campeão',        icon: '🏆', color: '#E8C84A', priority: 10 },
  UPSET:       { id: 'UPSET',      label: 'Zebra',          icon: '⚡', color: '#FF6B35', priority: 9  },
  EPIC_MATCH:  { id: 'EPIC_MATCH', label: 'Duelo Épico',   icon: '🔥', color: '#EF5350', priority: 8  },
  RIVALRY:     { id: 'RIVALRY',    label: 'Rivalidade',     icon: '⚔️', color: '#E040FB', priority: 8  },
  RECORD:      { id: 'RECORD',     label: 'Recorde',        icon: '📈', color: '#2ECC71', priority: 7  },
  INJURY:          { id: 'INJURY',          label: 'Lesão',              icon: '🩹', color: '#F44336', priority: 7  },
  INJURY_FOLLOWUP: { id: 'INJURY_FOLLOWUP', label: 'Atualização: Lesão', icon: '🏥', color: '#FF7043', priority: 6  },
  INJURY_SURGERY:  { id: 'INJURY_SURGERY',  label: 'Cirurgia',           icon: '🔪', color: '#B71C1C', priority: 8  },
  COMEBACK:    { id: 'COMEBACK',   label: 'Retorno',        icon: '🔄', color: '#00BCD4', priority: 6  },
  PROSPECT:    { id: 'PROSPECT',   label: 'Revelação',      icon: '🌱', color: '#66BB6A', priority: 6  },
  RETIREMENT:  { id: 'RETIREMENT', label: 'Aposentadoria',  icon: '🌅', color: '#90A4AE', priority: 7  },
  OLYMPIC_GOLD:  { id: 'OLYMPIC_GOLD',   label: 'Ouro Olímpico',   icon: '🥇', color: '#FFD700', priority: 10 },
  OLYMPIC_MEDAL: { id: 'OLYMPIC_MEDAL',  label: 'Medalha Olímpica', icon: '🏅', color: '#90A4AE', priority: 8  },
  ANALYSIS:        { id: 'ANALYSIS',        label: 'Análise',            icon: '📋', color: '#4A90D9', priority: 4  },
  COLUMN:          { id: 'COLUMN',          label: 'Coluna',             icon: '✍️', color: '#D4A017', priority: 3  },
  RUMOR:           { id: 'RUMOR',           label: 'Rumor',              icon: '🔮', color: '#AB47BC', priority: 5  },
  TOURNAMENT_WRAP: { id: 'TOURNAMENT_WRAP', label: 'Balanço do Torneio', icon: '📰', color: '#5CB8E4', priority: 6  },
  SPONSOR:         { id: 'SPONSOR',         label: 'Patrocínio',          icon: '🤝', color: '#60C8FF', priority: 5  },
  SPONSOR_ELITE:   { id: 'SPONSOR_ELITE',   label: 'Patrocínio Elite',    icon: '👑', color: '#FFD700', priority: 9  },
  LIFE_EVENT:      { id: 'LIFE_EVENT',      label: 'Vida',                icon: '🌍', color: '#A5D6A7', priority: 5  },
  LIFE_RUMOR:      { id: 'LIFE_RUMOR',      label: 'Bastidores',          icon: '👀', color: '#CE93D8', priority: 6  },
  SEASON_PULSE:    { id: 'SEASON_PULSE',    label: 'Pulso da temporada',  icon: '📡', color: '#8BC34A', priority: 5  },
};

// ═══════════════════════════════════════════════════════════════════
// CONFIGURAÇÃO POR TIER DE TORNEIO
// ─────────────────────────────────────────────────────────────────
// Cada categoria de torneio tem identidade editorial própria:
//  maxArticles          — teto de artigos gerados
//  preferredJournalists — IDs preferidos (têm 65% de prioridade)
//  disabledTypes        — tipos de artigo bloqueados para este tier
//  analysisChance       — 0 a 1 (1 = sempre)
//  rumorChance          — 0 a 1
//  epicMinRound         — índice mínimo fromEnd para épicos (1=SF+, 2=QF+)
//  upsetMinRankDiff     — diferença mínima de ranking para upset virar notícia
//  upsetMaxLoserRank    — ranking máximo do perdedor para ser "interesse público"
//  specialArticles      — artigos exclusivos do tier
//  coverDeepRounds      — se R16/R32 podem gerar artigos de upset
// ═══════════════════════════════════════════════════════════════════

export const TOURNAMENT_TIER_CONFIG = {

  ATP_PROSPECTS: {
    maxArticles:          3,
    preferredJournalists: ['NAKANO'],
    disabledTypes:        new Set(['RIVALRY', 'RECORD', 'RUMOR', 'COLUMN']),
    analysisChance:       0,
    rumorChance:          0,
    epicMinRound:         1,      // SF+ apenas
    upsetMinRankDiff:     15,
    upsetMaxLoserRank:    30,
    specialArticles:      ['SCOUT_REPORT'],
    vocabulary:           'PROSPECT',
    coverDeepRounds:      false,
  },

  ATP_100: {
    maxArticles:          4,
    preferredJournalists: ['SILVA', 'PETROV', 'REED'],
    disabledTypes:        new Set(['RECORD', 'COLUMN']),
    analysisChance:       0.2,
    rumorChance:          0.1,
    epicMinRound:         1,      // SF+
    upsetMinRankDiff:     15,
    upsetMaxLoserRank:    60,
    specialArticles:      ['RANKING_IMPACT'],
    vocabulary:           'CHALLENGER',
    coverDeepRounds:      false,
  },

  ATP_250: {
    maxArticles:          4,
    preferredJournalists: [],
    disabledTypes:        new Set(),
    analysisChance:       0.3,
    rumorChance:          0.2,
    epicMinRound:         1,
    upsetMinRankDiff:     12,
    upsetMaxLoserRank:    15,
    specialArticles:      [],
    vocabulary:           'STANDARD',
    coverDeepRounds:      false,
  },

  ATP_500: {
    maxArticles:          6,
    preferredJournalists: [],   // todos
    disabledTypes:        new Set(),
    analysisChance:       1.0,  // sempre
    rumorChance:          0.35,
    epicMinRound:         1,
    upsetMinRankDiff:     10,
    upsetMaxLoserRank:    15,
    specialArticles:      ['POINTS_RACE'],
    vocabulary:           'PRESTIGE',
    coverDeepRounds:      false,
  },

  SLAM_CLASH: {
    maxArticles:          8,
    preferredJournalists: ['CARVALHO', 'SANTOS', 'PETROV'],
    disabledTypes:        new Set(),
    analysisChance:       1.0,
    rumorChance:          0.4,
    epicMinRound:         1,
    upsetMinRankDiff:     8,
    upsetMaxLoserRank:    12,
    specialArticles:      [],
    vocabulary:           'LEGACY',
    coverDeepRounds:      true,
  },

  MASTERS_1000: {
    maxArticles:          8,
    preferredJournalists: ['CARVALHO'],
    disabledTypes:        new Set(),
    analysisChance:       1.0,
    rumorChance:          0.45,
    epicMinRound:         2,    // QF+ também recebe cobertura épica
    upsetMinRankDiff:     8,
    upsetMaxLoserRank:    10,
    specialArticles:      ['MANDATORY_FIELD'],
    vocabulary:           'PRESTIGE',
    coverDeepRounds:      true,  // R16 pode gerar artigos de upset
  },

  GRAND_SLAM: {
    maxArticles:          10,
    preferredJournalists: ['CARVALHO', 'SANTOS'],
    disabledTypes:        new Set(),
    analysisChance:       1.0,
    rumorChance:          0.55,
    epicMinRound:         2,
    upsetMinRankDiff:     6,
    upsetMaxLoserRank:    10,
    specialArticles:      ['BO5_BATTLE', 'SLAM_HISTORY'],
    vocabulary:           'LEGACY',
    coverDeepRounds:      true,
  },

  FINALS: {
    maxArticles:          6,
    preferredJournalists: ['KOWALSKI', 'CARVALHO'],
    disabledTypes:        new Set(['UPSET']),  // sem zebras — campo é os 8 melhores
    analysisChance:       1.0,
    rumorChance:          0.2,
    epicMinRound:         1,
    upsetMinRankDiff:     999,  // efetivamente desabilitado
    upsetMaxLoserRank:    999,
    specialArticles:      ['SEASON_NARRATIVE', 'EARNED_SPOT'],
    vocabulary:           'FINALS',
    coverDeepRounds:      false,
  },

  OLYMPICS: {
    maxArticles:          8,
    preferredJournalists: ['CARVALHO', 'SANTOS'],
    disabledTypes:        new Set(['RUMOR', 'SPONSOR', 'SPONSOR_ELITE']),
    analysisChance:       1.0,
    rumorChance:          0.0,
    epicMinRound:         2,
    upsetMinRankDiff:     8,
    upsetMaxLoserRank:    10,
    specialArticles:      ['OLYMPIC_GOLD_ARTICLE'],
    vocabulary:           'LEGACY',
    coverDeepRounds:      true,
  },

};

// ═══════════════════════════════════════════════════════════════════
// HELPERS INTERNOS
// ═══════════════════════════════════════════════════════════════════

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function rng(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function chance(p) { return Math.random() < p; }

function formatScore(setsDetail) {
  if (!setsDetail?.length) return '';
  return setsDetail.map(([a, b]) => `${a}-${b}`).join(', ');
}

function isEpic(match) {
  if (!match?.result?.setsDetail) return false;
  const sets = match.result.setsDetail;
  // 3+ sets e pelo menos um set foi para 7-5 ou tiebreak (6-7 ou 7-6)
  if (sets.length < 3) return false;
  const hasTiebreak = sets.some(([a, b]) => (a === 7 && b === 6) || (a === 6 && b === 7));
  const hasDecider  = sets.some(([a, b]) => Math.abs(a - b) <= 1 && Math.max(a, b) >= 6);
  return hasTiebreak || hasDecider;
}

function setsToString(match) {
  const winner = match.winner;
  const loser  = match.playerA?.id === winner?.id ? match.playerB : match.playerA;
  if (!loser) return '';
  const score = formatScore(match.result?.setsDetail);
  return `${winner.name} def. ${loser.name} ${score}`;
}

function rankLabel(rank) {
  if (!rank) return 'fora do ranking';
  if (rank === 1) return 'número 1 do mundo';
  if (rank <= 3)  return `top 3 (${rank}º)`;
  if (rank <= 8)  return `top 8 (${rank}º)`;
  if (rank <= 16) return `${rank}º do mundo`;
  return `${rank}º do ranking`;
}

function catLabel(category) {
  const map = {
    GRAND_SLAM:   'Grand Slam',
    SLAM_CLASH:   'Clash Slam',
    MASTERS_1000: 'Masters 1000',
    ATP_500:      'ATP 500',
    ATP_250:      'ATP 250',
    FINALS:       'ATP Finals',
    ATP_PROSPECTS:'Juniors',
  };
  return map[category] ?? category;
}

function pickJournalist(preferredStyle, excludeIds = []) {
  const all = Object.values(JOURNALISTS).filter(j => !excludeIds.includes(j.id));
  if (preferredStyle) {
    const match = all.filter(j => j.style === preferredStyle);
    if (match.length) return pick(match);
  }
  return pick(all);
}

function tournamentSurfaceLabel(surface) {
  const map = {
    HARD: 'quadra dura',
    CLAY: 'saibro',
    GRASS: 'grama',
    INDOOR: 'indoor',
  };
  return map[surface] ?? 'piso principal';
}

function lastName(player) {
  return player?.name?.split(' ')?.slice(-1)?.[0] ?? player?.name ?? 'Jogador';
}

function findPreviousTournamentChampion(tournament, state) {
  const pools = [
    Object.values(state?.tournamentResults ?? {}),
    Object.values(state?.historicalTournamentResults ?? {}),
  ];
  let best = null;
  for (const pool of pools) {
    for (const entry of pool) {
      if (!entry?.tournament?.id || entry.tournament.id !== tournament.id) continue;
      const season = entry._season ?? entry.tournament?.season ?? entry.year ?? 0;
      if (!best || season > best.season) {
        best = { season, champion: entry.bracket?.champion ?? entry.champion ?? null };
      }
    }
  }
  return best?.champion ?? null;
}

function buildPreviewContext(tournament, preparedPackage, state) {
  const seasonAct = buildSeasonAct({
    tournament,
    calendarIndex: state?.calendarIndex ?? 0,
    year: state?.year ?? null,
  });
  const field = [...(preparedPackage?.mainDrawPlayers ?? [])]
    .sort((a, b) => (a.rankPosition ?? 999) - (b.rankPosition ?? 999));
  const topSeeds = field.slice(0, 8);
  const rankingNames = field.slice(0, 4).map(p => `${p.name} (${rankLabel(p.rankPosition)})`);
  const injuryWithdrawals = [...(preparedPackage?.injuryWithdrawals ?? new Set())]
    .map(id => preparedPackage?.updatedByInjury?.[id] ?? [...(state?.tourPlayers ?? []), ...(state?.prospects ?? [])].find(p => p.id === id))
    .filter(Boolean)
    .sort((a, b) => (a.rankPosition ?? 999) - (b.rankPosition ?? 999));
  const youngTalents = field
    .filter(p => (p.age ?? 99) <= 22 || (p.rankPosition ?? 999) <= 25 && (p._careerTitles ?? 0) === 0)
    .slice(0, 5);
  const veterans = field
    .filter(p => (p.age ?? 0) >= 31)
    .slice(0, 5);
  const defendingChampion = findPreviousTournamentChampion(tournament, state);
  const drawMatches = preparedPackage?.bracket?.rounds?.[0] ?? [];
  const rivalrySpotlights = drawMatches
    .map((match) => {
      const pA = match?.playerA;
      const pB = match?.playerB;
      if (!pA?.id || !pB?.id) return null;
      const rivalry = state?.rivalrySystem?.getRivalry?.(pA.id, pB.id) ?? null;
      if (!rivalry) return null;
      if (!['ACTIVE', 'INTENSE', 'LEGENDARY'].includes(rivalry.status)) return null;
      return {
        playerA: pA,
        playerB: pB,
        rivalry,
      };
    })
    .filter(Boolean)
    .sort((a, b) => (b.rivalry?.intensity ?? 0) - (a.rivalry?.intensity ?? 0));

  const favoriteProfiles = topSeeds.map((player) => {
    const continuity = getContinuityContext(player, state, state?.year);
    const publicLine = continuity.publicNarrative?.line ?? '';
    const primaryKinds = new Set(continuity.primaryImpacts.map((entry) => entry.impact?.kind));
    const secondaryKinds = new Set(continuity.secondaryImpacts.map((entry) => entry.impact?.kind));
    return {
      player,
      continuity,
      favoredButPressured:
        continuity.secondaryImpacts.length >= 1
        || /pressão|ferida aberta|rótulo|rotulo|duvida|debate/i.test(publicLine),
      championWithTarget:
        primaryKinds.has('CHAMPION')
        || /mudan|consenso|patamar|alvo|cobrança|cobranca/i.test(publicLine),
      respectedUpsetThreat:
        primaryKinds.has('UPSET')
        || /ameaça|ameaca|tendência|tendencia|gigantes/i.test(publicLine),
      coldFavorite:
        secondaryKinds.has('UPSET')
        || /pressão acumulada|pressao acumulada|ferida aberta/i.test(publicLine),
    };
  });

  const pressuredFavorites = favoriteProfiles.filter((entry) => entry.favoredButPressured).map((entry) => entry.player);
  const championTargets = favoriteProfiles.filter((entry) => entry.championWithTarget).map((entry) => entry.player);
  const respectedFloaters = field
    .filter((player) => !topSeeds.some((seed) => seed.id === player.id))
    .filter((player) => {
      const publicLine = player?.publicNarrativeMemory?.publicNarrative?.line ?? '';
      return /ameaça|ameaca|tendência|tendencia|validação|validacao|mudou seu enquadramento/i.test(publicLine);
    })
    .slice(0, 4);

  const storylineLines = [
    pressuredFavorites[0]
      ? `${pressuredFavorites[0].name} chega como favorito, mas com pressão acumulada suficiente para transformar qualquer estreia em teste político.`
      : null,
    championTargets[0]
      ? `${championTargets[0].name} entra com alvo nas costas depois do peso narrativo que carrega da semana anterior.`
      : null,
    respectedFloaters[0]
      ? `${respectedFloaters[0].name} não entra mais como surpresa confortável: o circuito já o trata como ameaça real à chave.`
      : null,
    rivalrySpotlights[0]
      ? `${rivalrySpotlights[0].playerA.name} x ${rivalrySpotlights[0].playerB.name} reaparece no draw com histórico suficiente para puxar manchete antes mesmo da bola subir.`
      : null,
  ].filter(Boolean);
  const narrativeRaces = preparedPackage?.calendarContext?.narrativeRaces ?? null;
  const featuredRace = narrativeRaces?.featured?.[0] ?? null;
  const secondaryRace = narrativeRaces?.featured?.[1] ?? null;
  const tournamentChapter = preparedPackage?.calendarContext?.tournamentChapter ?? null;

  return {
    seasonAct,
    narrativeRaces,
    featuredRace,
    secondaryRace,
    tournamentChapter,
    field,
    topSeeds,
    rankingNames,
    injuryWithdrawals,
    youngTalents,
    veterans,
    defendingChampion,
    drawMatches,
    rivalrySpotlights,
    pressuredFavorites,
    championTargets,
    respectedFloaters,
    storylineLines,
  };
}

function getPreviewIdentity(player, surface) {
  return buildPlayerIdentity(player, { surfaceKey: surface?.toUpperCase?.() ?? surface ?? null });
}

function getContinuityContext(player, state, year) {
  const feed = state?.newsEngine?.feed ?? [];
  const playerId = player?.id ?? null;
  const relevant = feed
    .filter((article) => {
      const articleYear = article?.year ?? article?.narrativeImpact?.context?.year ?? null;
      if (articleYear !== year) return false;
      return article?.player?.id === playerId || article?.playerB?.id === playerId;
    })
    .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));

  const impacts = relevant
    .map((article) => ({
      article,
      impact: article?.narrativeImpact ?? null,
      role: article?.player?.id === playerId ? 'PRIMARY' : 'SECONDARY',
    }))
    .filter((entry) => entry.impact);

  return {
    relevant,
    impacts,
    primaryImpacts: impacts.filter((entry) => entry.role === 'PRIMARY'),
    secondaryImpacts: impacts.filter((entry) => entry.role === 'SECONDARY'),
    publicNarrative: player?.publicNarrativeMemory?.publicNarrative ?? null,
  };
}

function buildContinuityHooks(player, state, year) {
  const context = getContinuityContext(player, state, year);
  const hooks = [];
  const primaryKinds = new Set(context.primaryImpacts.map((entry) => entry.impact?.kind));
  const publicLine = context.publicNarrative?.line ?? '';

  if (context.primaryImpacts.length >= 2) {
    hooks.push('chega embalado por uma sequência recente que o circuito já trata como tendência');
  } else if (context.primaryImpacts.length === 1) {
    hooks.push('traz um resultado recente que mudou seu enquadramento público');
  }

  if (context.secondaryImpacts.length >= 2) {
    hooks.push('entra sob pressão acumulada, com tropeços recentes ainda pairando sobre o nome');
  } else if (context.secondaryImpacts.length === 1) {
    hooks.push('ainda carrega uma ferida aberta do torneio anterior');
  }

  if (primaryKinds.has('CHAMPION') || primaryKinds.has('UPSET')) {
    hooks.push('vive uma semana de validação da narrativa que o cerca');
  }

  if (primaryKinds.has('CHAMPION')) {
    hooks.push('dá sinais claros de mudança de patamar dentro do circuito');
  }

  if (publicLine && /consenso|consolid|ganhar corpo|ganhar forma|virando/i.test(publicLine)) {
    hooks.push('entra com a sensação de que a leitura pública está se consolidando ao seu redor');
  }

  if (publicLine && /rótulo|rotulo|debate|duvida|duvida|sobreviver/i.test(publicLine)) {
    hooks.push('segue convivendo com um rótulo que esta semana pode reforçar ou quebrar');
  }

  return [...new Set(hooks)].slice(0, 3);
}

function continuityLead(player, state, year) {
  const hook = buildContinuityHooks(player, state, year)[0] ?? null;
  return hook ? `${hook.charAt(0).toUpperCase() + hook.slice(1)}.` : null;
}

function continuityValidationLine(player, state, year) {
  const hook = buildContinuityHooks(player, state, year)
    .find((entry) => /validação|patamar|consolidando|consolidar|tendência/.test(entry));
  return hook ? `${hook.charAt(0).toUpperCase() + hook.slice(1)}.` : null;
}

function continuityPressureLine(player, state, year) {
  const hook = buildContinuityHooks(player, state, year)
    .find((entry) => /pressão|ferida aberta|rótulo|rotulo/.test(entry));
  return hook ? `${hook.charAt(0).toUpperCase() + hook.slice(1)}.` : null;
}

function favoriteRationale(player, surface) {
  const identity = getPreviewIdentity(player, surface);
  const lines = [
    identity?.seasonArc?.summary,
    identity?.signature?.subline,
    identity?.contradictions?.[0]?.summary,
    identity?.reputation?.consensus ? `o circuito o enxerga como ${identity.reputation.consensus.toLowerCase()}` : null,
    identity?.traits?.primary?.label ? `carrega o traço ${identity.traits.primary.label}` : null,
  ].filter(Boolean);
  return lines[0] ?? 'tem argumentos suficientes para abrir a semana no centro da conversa';
}

function spotlightLine(player, surface) {
  const identity = getPreviewIdentity(player, surface);
  const arcLine = identity?.seasonArc?.chapterLabel ? `${identity.seasonArc.chapterLabel}` : null;
  return identity?.signature?.subline
    ?? arcLine
    ?? identity?.contradictions?.[0]?.summary
    ?? identity?.reputation?.consensus
    ?? `chega com contexto suficiente para entrar no radar do circuito`;
}

function favoriteContinuityRationale(player, surface, state, year) {
  return continuityLead(player, state, year)
    ?? favoriteRationale(player, surface);
}

function attachNarrativeImpact(article, impact) {
  if (!article || !impact) return article;
  const nextTags = new Set([...(article.tags ?? []), ...(impact.tags ?? [])]);
  return {
    ...article,
    tags: [...nextTags],
    narrativeImpact: impact,
  };
}

function buildFallbackTournamentPreview({ tournament, preparedPackage, state, year }) {
  const playerPool = preparedPackage?.mainDrawPlayers?.length
    ? preparedPackage.mainDrawPlayers
    : [...(state?.tourPlayers ?? []), ...(state?.prospects ?? [])]
        .sort((a, b) => (a.rankPosition ?? 999) - (b.rankPosition ?? 999))
        .slice(0, Math.max(8, tournament?.draw ?? 16));
  const topNames = playerPool.slice(0, 4).map((p) => p?.name).filter(Boolean);
  const leadIdentity = playerPool[0] ? getPreviewIdentity(playerPool[0], tournament?.surface) : null;
  const label = tournament?.name ?? 'próximo torneio';
  return {
    id: `preview-fallback-${tournament?.id ?? 'unknown'}-${year}`,
    type: 'PREVIEW',
    journalist: JOURNALISTS.PETROV,
    tournament: { id: tournament?.id ?? null, name: label, category: tournament?.category ?? null, surface: tournament?.surface ?? null },
    year,
    headline: `${label}: panorama inicial do torneio`,
    deck: `O circuito ainda está calibrando favoritos, mas a próxima chave já tem contexto suficiente para entrar no radar.`,
    body: [
      pick(JOURNALISTS.PETROV.voice.opening),
      topNames.length
        ? `${topNames.join(', ')} puxam a conversa inicial enquanto a chave começa a ganhar forma.`
        : `Ainda não há leitura completa do field, mas o torneio já entra no calendário como ponto importante da temporada.`,
      preparedPackage?.calendarContext?.seasonAct?.summary ?? null,
      preparedPackage?.calendarContext?.tournamentChapter?.summary ?? null,
      preparedPackage?.calendarContext?.narrativeRaces?.featured?.[0]
        ? `A semana também toca diretamente em ${preparedPackage.calendarContext.narrativeRaces.featured[0].headline}.`
        : null,
      leadIdentity?.signature?.subline ? `${playerPool[0].name} abre a semana como referência inicial: ${leadIdentity.signature.subline}.` : null,
      preparedPackage?.calendarContext?.storylineLines?.[0] ?? null,
      `Mesmo sem um recorte editorial mais específico, ${label} chega com peso suficiente para mexer no ranking, na narrativa e na temperatura do circuito.`,
      `A primeira rodada tende a funcionar menos como aquecimento e mais como triagem real de ambição e forma.`,
    ].filter(Boolean).join(' '),
    length: 'MEDIUM',
    tags: ['pré-torneio', 'fallback', tournament?.surface?.toLowerCase?.()].filter(Boolean),
    createdAt: Date.now(),
  };
}

function selectPredictionPanel(tournament) {
  if (tournament.category === 'GRAND_SLAM') return [JOURNALISTS.CARVALHO, JOURNALISTS.PETROV, JOURNALISTS.SANTOS];
  if (tournament.category === 'SLAM_CLASH') return [JOURNALISTS.CARVALHO, JOURNALISTS.PETROV, JOURNALISTS.REED];
  if (tournament.category === 'FINALS') return [JOURNALISTS.KOWALSKI, JOURNALISTS.PETROV, JOURNALISTS.REED];
  if (tournament.category === 'MASTERS_1000') return [JOURNALISTS.CARVALHO, JOURNALISTS.PETROV, JOURNALISTS.REED];
  return [JOURNALISTS.PETROV, JOURNALISTS.NAKANO, JOURNALISTS.REED];
}

function pickPredictionCandidates(context) {
  const top = context.topSeeds.slice(0, 4);
  const darkHorse = context.youngTalents.find(p => !top.some(t => t.id === p.id))
    ?? context.field.find(p => (p.rankPosition ?? 999) >= 12 && (p.rankPosition ?? 999) <= 28)
    ?? context.field[4]
    ?? context.field[0];
  return [
    top[0] ?? darkHorse,
    top[1] ?? darkHorse,
    darkHorse,
  ].filter(Boolean);
}

function genTournamentPredictionPanel({ tournament, preparedPackage, state, year }) {
  const context = buildPreviewContext(tournament, preparedPackage, state);
  if (!context.field.length) return null;
  const panel = selectPredictionPanel(tournament);
  const candidates = pickPredictionCandidates(context);
  const picked = panel.map((journalist, idx) => ({
    journalist,
    player: candidates[idx] ?? candidates[0],
    rationale:
      journalist.id === 'PETROV'
        ? favoriteContinuityRationale(candidates[idx] ?? candidates[0], tournament.surface, state, year)
        : journalist.id === 'REED'
          ? favoriteContinuityRationale(candidates[idx] ?? candidates[0], tournament.surface, state, year)
          : journalist.id === 'NAKANO'
            ? favoriteContinuityRationale(candidates[idx] ?? candidates[0], tournament.surface, state, year)
            : journalist.id === 'SANTOS'
              ? favoriteContinuityRationale(candidates[idx] ?? candidates[0], tournament.surface, state, year)
              : journalist.id === 'KOWALSKI'
                ? favoriteContinuityRationale(candidates[idx] ?? candidates[0], tournament.surface, state, year)
                : favoriteContinuityRationale(candidates[idx] ?? candidates[0], tournament.surface, state, year),
  }));

  const topSeedLine = context.rankingNames.length
    ? `A chave foi montada com ${context.rankingNames.join(', ')} puxando a conversa inicial.`
    : `O torneio abre o calendário sem um favorito esmagador, o que torna o primeiro fim de semana ainda mais valioso.`;

  return {
    id: `preview-panel-${tournament.id}-${year}`,
    type: 'PREDICTION',
    journalist: JOURNALISTS.PETROV,
    tournament: { id: tournament.id, name: tournament.name, category: tournament.category, surface: tournament.surface },
    year,
    headline: `Mesa do circuito: quem leva o ${tournament.name}?`,
    deck: `Três vozes, três leituras e um quadro inicial já definido para o próximo torneio.`,
    body: [
      `${pick(JOURNALISTS.PETROV.voice.opening)} ${topSeedLine}`,
      ...picked.map(({ journalist, player, rationale }) =>
        `${journalist.name}, da ${journalist.outlet}, aponta ${player.name}: ${rationale}.`
      ),
      context.defendingChampion
        ? `${context.defendingChampion.name} aparece como defensor do título e entra inevitavelmente no centro da discussão, mesmo quando não é o favorito absoluto do painel.`
        : `Sem campeão defensor para monopolizar a conversa, a sensação é de torneio mais aberto e território pronto para afirmação nova.`,
      `No ${tournamentSurfaceLabel(tournament.surface)}, a primeira rodada já chega com peso de medição de força, não de aquecimento.`,
    ].join(' '),
    length: 'MEDIUM',
    tags: ['pré-torneio', 'palpites', tournament.surface?.toLowerCase(), tournament.category?.toLowerCase()].filter(Boolean),
    createdAt: Date.now(),
  };
}

function genSeasonOpeningPreview({ tournament, preparedPackage, state, year }) {
  const context = buildPreviewContext(tournament, preparedPackage, state);
  if (!context.field.length) return null;
  const topNames = context.topSeeds.slice(0, 3).map(p => p.name).join(', ');
  const youngNames = context.youngTalents.slice(0, 2).map(p => p.name).join(' e ');
  const j = JOURNALISTS.KOWALSKI;
  return {
    id: `season-opening-${tournament.id}-${year}`,
    type: 'PREVIEW',
    journalist: j,
    tournament: { id: tournament.id, name: tournament.name, category: tournament.category, surface: tournament.surface },
    year,
    headline: `${year} começa em ${tournament.name}: os nomes que chegam para tomar conta do circuito`,
    deck: `O calendário ainda está limpo, mas as promessas e cobranças do ano já entraram em quadra.`,
    body: [
      pick(j.voice.opening),
      `${tournament.name}, em ${tournamentSurfaceLabel(tournament.surface)}, abre a temporada com ${context.field.length} jogadores na chave principal e a sensação clássica de janeiro: ninguém ganhou nada ainda, mas quase todo mundo já está sendo julgado.`,
      context.seasonAct?.summary ?? null,
      context.tournamentChapter?.summary ?? null,
      context.featuredRace ? `Desde já, o torneio encosta em ${context.featuredRace.headline}.` : null,
      topNames ? `${topNames} entram como referências imediatas para o começo do ano.` : null,
      context.topSeeds[0] ? `${context.topSeeds[0].name} aparece com a leitura mais pronta do field: ${spotlightLine(context.topSeeds[0], tournament.surface)}.` : null,
      context.topSeeds[0] ? continuityValidationLine(context.topSeeds[0], state, year) : null,
      context.storylineLines[0] ?? null,
      youngNames ? `${youngNames} puxam a conversa da nova geração e chegam tratados menos como curiosidade e mais como ameaça real.` : null,
      context.veterans[0] ? `${context.veterans[0].name} aparece como veterano que precisa responder cedo para não começar a temporada correndo atrás da própria narrativa.` : null,
      `Se a temporada vai ter dono, os primeiros capítulos sempre deixam pistas. E este é o tipo de torneio em que o circuito começa a procurá-las.`,
    ].filter(Boolean).join(' '),
    length: 'LONG',
    tags: ['temporada', 'abertura', 'pré-torneio', String(year)],
    createdAt: Date.now(),
  };
}

function genTournamentSpotlight({ tournament, preparedPackage, state, year, seasonStart = false }) {
  const context = buildPreviewContext(tournament, preparedPackage, state);
  const j = seasonStart ? JOURNALISTS.SANTOS : pick([JOURNALISTS.CARVALHO, JOURNALISTS.SANTOS, JOURNALISTS.NAKANO, JOURNALISTS.REED]);

  const injured = context.injuryWithdrawals[0];
  if (injured) {
    const injury = preparedPackage?.updatedByInjury?.[injured.id]?.injury ?? injured.injury ?? null;
    return {
      id: `preview-injury-${tournament.id}-${injured.id}-${year}`,
      type: 'PREVIEW',
      journalist: JOURNALISTS.SANTOS,
      tournament: { id: tournament.id, name: tournament.name, category: tournament.category, surface: tournament.surface },
      year,
      player: injured,
      headline: `${injured.name} está fora do ${tournament.name} e muda o eixo do torneio antes da estreia`,
      deck: injury?.type ? `${injured.name} não viaja por causa de ${getInjuryDisplayName(injury).toLowerCase()}. A chave muda antes da primeira bola.` : `Uma ausência importante já alterou a leitura do torneio.`,
      body: [
        pick(JOURNALISTS.SANTOS.voice.opening),
        `${injured.name}, ${rankLabel(injured.rankPosition)}, não estará na largada do ${tournament.name}.`,
        context.seasonAct?.stakes ?? null,
        injury ? `A equipe médica trabalha com ${getInjuryDisplayName(injury).toLowerCase()} em grau ${injury.grade}, o suficiente para tirar do roteiro um dos nomes que naturalmente organizariam a semana.` : `A ausência já é suficiente para desmontar a leitura original do draw.`,
        spotlightLine(injured, tournament.surface) ? `A saída pesa ainda mais porque ${injured.name} chegava com uma leitura clara: ${spotlightLine(injured, tournament.surface)}.` : null,
        continuityPressureLine(injured, state, year),
        `Em torneios assim, a notícia não é só quem sai. É quem passa a respirar melhor na parte da chave que ficou sem esse peso.`,
        pick(JOURNALISTS.SANTOS.voice.closing),
      ].filter(Boolean).join(' '),
      length: 'MEDIUM',
      tags: ['pré-torneio', 'lesão', 'ausência', tournament.name.toLowerCase()],
      createdAt: Date.now(),
    };
  }

  const defending = context.defendingChampion;
  if (defending && context.field.some(p => p.id === defending.id)) {
    return {
      id: `preview-defending-${tournament.id}-${defending.id}-${year}`,
      type: 'PREVIEW',
      journalist: JOURNALISTS.CARVALHO,
      tournament: { id: tournament.id, name: tournament.name, category: tournament.category, surface: tournament.surface },
      year,
      player: defending,
      headline: `${defending.name} tenta renovar o título no ${tournament.name} com o circuito olhando cada passo`,
      deck: `Defender título é jogar contra a chave e contra a própria memória do torneio.`,
      body: [
        pick(JOURNALISTS.CARVALHO.voice.opening),
        `${defending.name} volta ao torneio como campeão vigente, o que muda o peso de cada rodada antes mesmo do primeiro saque.`,
        context.seasonAct?.summary ?? null,
        context.tournamentChapter?.hook ?? null,
        context.featuredRace ? `E não é só o título que está em jogo: a semana conversa diretamente com ${context.featuredRace.headline}.` : null,
        `${defending.name} reaparece com a mesma identidade que sustentou a campanha anterior: ${spotlightLine(defending, tournament.surface)}.`,
        continuityValidationLine(defending, state, year),
        `Defender é um verbo diferente de conquistar. O circuito não pergunta apenas se o campeão ainda é bom o bastante; pergunta se ele ainda consegue repetir a mesma autoridade quando todo mundo já estudou o caminho.`,
        `No ${tournamentSurfaceLabel(tournament.surface)}, repetir costuma exigir menos inspiração e mais presença contínua. É exatamente isso que será medido agora.`,
        pick(JOURNALISTS.CARVALHO.voice.closing),
      ].join(' '),
      length: 'LONG',
      tags: ['pré-torneio', 'defesa-de-título', defending.name.toLowerCase()],
      createdAt: Date.now(),
    };
  }

  const youngster = context.youngTalents[0];
  if (youngster) {
    return {
      id: `preview-young-${tournament.id}-${youngster.id}-${year}`,
      type: 'PREVIEW',
      journalist: JOURNALISTS.NAKANO,
      tournament: { id: tournament.id, name: tournament.name, category: tournament.category, surface: tournament.surface },
      year,
      player: youngster,
      headline: `${youngster.name} chega ao ${tournament.name} como o jovem que pode transformar expectativa em título`,
      deck: `Em algum momento a promessa para de pedir tempo e começa a pedir troféu.`,
      body: [
        pick(JOURNALISTS.NAKANO.voice.opening),
        `${youngster.name} entra nesta semana como um dos nomes que o circuito monitora não por curiosidade, mas por medo de estar vendo a hora exata da virada.`,
        context.seasonAct?.stakes ?? null,
        context.tournamentChapter?.hook ?? null,
        context.featuredRace?.id === 'BEST_YOUNG' ? `Nao por acaso, a corrida por melhor jovem do ano tambem passa por esta chave.` : null,
        `${youngster.name} chega assim ao torneio: ${spotlightLine(youngster, tournament.surface)}.`,
        continuityValidationLine(youngster, state, year),
        `A combinação de ranking, fase e encaixe de superfície coloca o jogador num ponto delicado: ainda é cedo demais para tratar como obrigação, mas já é tarde demais para fingir surpresa se ele for até o fim.`,
        `Torneios como este são onde carreiras saem do argumento e entram no fato.`,
        pick(JOURNALISTS.NAKANO.voice.closing),
      ].join(' '),
      length: 'MEDIUM',
      tags: ['pré-torneio', 'jovem', 'ascensão', youngster.name.toLowerCase()],
      createdAt: Date.now(),
    };
  }

  const veteran = context.veterans[0] ?? context.topSeeds[0] ?? context.field[0];
  if (!veteran) return null;
  const rivalrySpotlight = context.rivalrySpotlights[0] ?? null;
  if (rivalrySpotlight) {
    return {
      id: `preview-rivalry-${tournament.id}-${rivalrySpotlight.playerA.id}-${rivalrySpotlight.playerB.id}-${year}`,
      type: 'PREVIEW',
      journalist: JOURNALISTS.CARVALHO,
      tournament: { id: tournament.id, name: tournament.name, category: tournament.category, surface: tournament.surface },
      year,
      player: rivalrySpotlight.playerA,
      playerB: rivalrySpotlight.playerB,
      headline: `${rivalrySpotlight.playerA.name} x ${rivalrySpotlight.playerB.name}: a chave devolve uma rivalidade que já chega com memória`,
      deck: `O draw trouxe de volta um confronto que o circuito não lê como simples rodada inicial.`,
      body: [
        pick(JOURNALISTS.CARVALHO.voice.opening),
        `${rivalrySpotlight.playerA.name} e ${rivalrySpotlight.playerB.name} reaparecem na mesma rota do bracket com uma rivalidade em status ${String(rivalrySpotlight.rivalry?.status ?? 'ACTIVE').toLowerCase()}.`,
        context.seasonAct?.summary ?? null,
        context.tournamentChapter?.summary ?? null,
        rivalrySpotlight.rivalry?.narrative ?? `Não é só o histórico bruto que pesa aqui. É a memória competitiva que um já carrega do outro.`,
        `Esse é o tipo de confronto que faz um torneio herdar contexto antes mesmo de a semana começar de fato.`,
        pick(JOURNALISTS.CARVALHO.voice.closing),
      ].filter(Boolean).join(' '),
      length: 'MEDIUM',
      tags: ['pré-torneio', 'rivalidade', tournament.name.toLowerCase()],
      createdAt: Date.now(),
    };
  }
  return {
    id: `preview-veteran-${tournament.id}-${veteran.id}-${year}`,
    type: 'PREVIEW',
    journalist: JOURNALISTS.REED,
    tournament: { id: tournament.id, name: tournament.name, category: tournament.category, surface: tournament.surface },
    year,
    player: veteran,
    headline: `${veteran.name} chega ao ${tournament.name} tentando provar que ainda dita a conversa`,
    deck: `Alguns jogadores entram para vencer. Outros entram para impedir que o circuito os aposente cedo demais no discurso.`,
    body: [
      pick(JOURNALISTS.REED.voice.opening),
      `${veteran.name} aparece nesta chave com um objetivo duplo: ganhar partidas e recalibrar a narrativa que o cerca.`,
      context.seasonAct?.summary ?? null,
      context.tournamentChapter?.hook ?? null,
      context.featuredRace?.id === 'COMEBACK' ? `O torneio tambem funciona como checkpoint da corrida por retorno do ano.` : null,
      `${veteran.name} ainda carrega uma assinatura reconhecível: ${spotlightLine(veteran, tournament.surface)}.`,
      continuityPressureLine(veteran, state, year) ?? continuityValidationLine(veteran, state, year),
      context.storylineLines[0] ?? null,
      `Em semanas assim, cada rodada vira argumento. Uma boa campanha não entrega apenas pontos; devolve tamanho político dentro do circuito.`,
      `É o tipo de torneio em que um veterano pode reencontrar autoridade ou sair devendo explicações.`,
      pick(JOURNALISTS.REED.voice.closing),
    ].join(' '),
    length: 'MEDIUM',
    tags: ['pré-torneio', 'veterano', 'narrativa'],
    createdAt: Date.now(),
  };
}

export function generateUpcomingTournamentNews(tournament, preparedPackage, state, { seasonStart = false } = {}) {
  if (!tournament || !preparedPackage || !state) return [];
  const year = state.year;
  const articles = [];
  const previewContext = buildPreviewContext(tournament, preparedPackage, state);

  if (seasonStart) {
    const opening = genSeasonOpeningPreview({ tournament, preparedPackage, state, year });
    if (opening) articles.push(opening);
  }

  const prediction = genTournamentPredictionPanel({ tournament, preparedPackage, state, year });
  if (prediction) articles.push(prediction);

  const spotlight = genTournamentSpotlight({ tournament, preparedPackage, state, year, seasonStart });
  if (spotlight) articles.push(spotlight);

  if (previewContext.storylineLines.length > 1) {
    articles.push({
      id: `preview-calendar-${tournament.id}-${year}`,
      type: 'PREVIEW',
      journalist: JOURNALISTS.REED,
      tournament: { id: tournament.id, name: tournament.name, category: tournament.category, surface: tournament.surface },
      year,
      headline: `${tournament.name}: a próxima semana já chega herdando contexto`,
      deck: `O draw muda, mas o circuito não esquece tão rápido o que acabou de acontecer.`,
      body: [
        pick(JOURNALISTS.REED.voice.opening),
        previewContext.seasonAct?.summary ?? null,
        ...previewContext.storylineLines.slice(0, 3),
        previewContext.seasonAct?.stakes ?? null,
        `É assim que um calendário deixa de parecer uma fila de eventos e começa a funcionar como temporada.`,
        pick(JOURNALISTS.REED.voice.closing),
      ].filter(Boolean).join(' '),
      length: 'MEDIUM',
      tags: ['pré-torneio', 'calendário', 'continuidade', tournament.name.toLowerCase()],
      createdAt: Date.now(),
    });
  }

  if (previewContext.seasonAct) {
    articles.push({
      id: `preview-act-${tournament.id}-${year}`,
      type: 'PREVIEW',
      journalist: JOURNALISTS.KOWALSKI,
      tournament: { id: tournament.id, name: tournament.name, category: tournament.category, surface: tournament.surface },
      year,
      headline: `${tournament.name}: o circuito entra em ${previewContext.seasonAct.label.toLowerCase()}`,
      deck: previewContext.seasonAct.stakes,
      body: [
        pick(JOURNALISTS.KOWALSKI.voice.opening),
        previewContext.seasonAct.summary,
        previewContext.seasonAct.stakes,
        `Quando a temporada muda de ato, até os mesmos jogadores passam a ser julgados por um critério diferente.`,
        pick(JOURNALISTS.KOWALSKI.voice.closing),
      ].filter(Boolean).join(' '),
      length: 'MEDIUM',
      tags: ['pré-torneio', 'ato-da-temporada', tournament.name.toLowerCase()],
      createdAt: Date.now(),
    });
  }

  if (previewContext.featuredRace) {
    const race = previewContext.featuredRace;
    const names = (race.entries ?? []).slice(0, 3).map((entry) => entry.player?.name).filter(Boolean);
    articles.push({
      id: `preview-race-${tournament.id}-${race.id}-${year}`,
      type: 'PREVIEW',
      journalist: JOURNALISTS.SANTOS,
      tournament: { id: tournament.id, name: tournament.name, category: tournament.category, surface: tournament.surface },
      year,
      headline: `${tournament.name}: o torneio entra em ${race.headline}`,
      deck: names.length ? `${names.join(', ')} puxam a corrida que esta semana pode reorganizar.` : `A semana encosta numa das corridas mais vivas da temporada.`,
      body: [
        pick(JOURNALISTS.SANTOS.voice.opening),
        `Entre os vários pesos de ${tournament.name}, um deles está claro: o torneio conversa diretamente com ${race.headline}.`,
        ...(race.entries ?? []).slice(0, 3).map((entry) => `${entry.player?.name} aparece aqui porque ${entry.reason}.`),
        previewContext.secondaryRace ? `E por trás dela ainda corre outra trilha importante: ${previewContext.secondaryRace.headline}.` : null,
        pick(JOURNALISTS.SANTOS.voice.closing),
      ].filter(Boolean).join(' '),
      length: 'MEDIUM',
      tags: ['pré-torneio', 'corrida-narrativa', race.id.toLowerCase(), tournament.name.toLowerCase()],
      createdAt: Date.now(),
    });
  }

  if (previewContext.tournamentChapter) {
    const chapter = previewContext.tournamentChapter;
    articles.push({
      id: `preview-chapter-${tournament.id}-${year}`,
      type: 'PREVIEW',
      journalist: JOURNALISTS.CARVALHO,
      tournament: { id: tournament.id, name: tournament.name, category: tournament.category, surface: tournament.surface },
      year,
      headline: `${tournament.name}: ${chapter.label.toLowerCase()}`,
      deck: chapter.stakes,
      body: [
        pick(JOURNALISTS.CARVALHO.voice.opening),
        chapter.summary,
        chapter.hook,
        `O valor narrativo de ${tournament.name} nesta altura do ano nao vem so da categoria. Vem da funcao que ele herda dentro da temporada.`,
        pick(JOURNALISTS.CARVALHO.voice.closing),
      ].filter(Boolean).join(' '),
      length: 'MEDIUM',
      tags: ['pré-torneio', 'capítulo', tournament.name.toLowerCase()],
      createdAt: Date.now(),
    });
  }

  if (!articles.length) {
    articles.push(buildFallbackTournamentPreview({ tournament, preparedPackage, state, year }));
  }

  return articles.sort((a, b) => (NEWS_TYPES[b.type]?.priority ?? 0) - (NEWS_TYPES[a.type]?.priority ?? 0));
}

// ─────────────────────────────────────────────────────────────────
// HELPERS DE PERSONALIDADE — lêem player.personality para modular
// cobertura jornalística (Bloco 2 do sistema de personalidade dinâmica)
// ─────────────────────────────────────────────────────────────────

/**
 * Retorna o jornalista preferido para cobrir um jogador com base
 * no estado de personalidade atual (mood + reputation + careerMoments).
 * Retorna null se não houver sinal forte suficiente (usa lógica padrão).
 *
 * @param {object} player — com player.personality.currentState
 * @returns {object|null} journalist ou null
 */
function _journalistForPlayer(player) {
  const pers = player?.personality;
  if (!pers) return null;

  const mood   = pers.currentState?.mood;
  const repId  = (typeof pers.reputation === 'object') ? pers.reputation?.id : pers.reputation;
  const persona= (typeof pers.pressPersona === 'object') ? pers.pressPersona?.id : pers.pressPersona;
  const age    = player.age ?? 25;
  const moments= pers.careerMoments ?? [];

  // PETROV/CARVALHO (analítico/literário) → dominância, legado, ícone
  if (['DOMINANT','LEGACY_AWARE','AT_PEAK'].includes(mood) && repId === 'ICON') {
    return chance(0.6) ? JOURNALISTS.PETROV : JOURNALISTS.CARVALHO;
  }

  // SANTOS (narrativa humana) → retorno, vulnerabilidade, despedida, lesão
  if (['COMEBACK','VULNERABLE','FAREWELL_TOUR'].includes(mood)) {
    return JOURNALISTS.SANTOS;
  }
  if (moments.some(m => m.type === 'INJURY_TRANSFORMS')) {
    return JOURNALISTS.SANTOS;
  }

  // FONTAINE (gossip/bastidores) → crise, isolamento, persona shift, esgotamento
  if (['ISOLATED','CRISIS','DESTABILIZED','BURNED_OUT'].includes(mood)) {
    return JOURNALISTS.FONTAINE;
  }
  if (moments.some(m => m.type === 'PERSONA_SHIFT' && m.year === player._currentYear)) {
    return JOURNALISTS.FONTAINE;
  }
  const bondScore = player.coach?.bondScore ?? null;
  if (bondScore != null && bondScore < 20) {
    return JOURNALISTS.FONTAINE;
  }

  // REED (opinião/crítica) → vilão, amargura, drought longo
  if (repId === 'VILLAIN' || mood === 'BITTER') {
    return JOURNALISTS.REED;
  }
  const hist = player._seasonHistory ?? [];
  const droughtYears = (() => {
    let d = 0;
    for (let i = hist.length - 1; i >= 0; i--) {
      if (!hist[i].titleWon) d++; else break;
    }
    return d;
  })();
  if (droughtYears >= 3) return JOURNALISTS.REED;

  // NAKANO (hype) → jovens prodigiosos
  if (age < 22 && ['PRODIGY','RISING_STAR'].includes(repId)) {
    return JOURNALISTS.NAKANO;
  }
  if (mood === 'OVERWHELMED' && age < 22) {
    return JOURNALISTS.NAKANO;
  }

  return null; // sem sinal forte — usa lógica padrão
}

/**
 * Extrai storyAngles do estado de personalidade do jogador.
 * Retorna array de strings para usar em headlines/decks.
 *
 * @param {object} player
 * @returns {string[]}
 */
function _storyAnglesForPlayer(player) {
  const pers = player?.personality;
  if (!pers) return [];

  const mood    = pers.currentState?.mood;
  const persona = (typeof pers.pressPersona === 'object') ? pers.pressPersona?.id : pers.pressPersona;
  const repId   = (typeof pers.reputation   === 'object') ? pers.reputation?.id   : pers.reputation;
  const angles  = [];

  // Angles da pressPersona (definidos em PlayerPersonality.js)
  const personaDefs = {
    CHARISMATIC:    ['celebração espontânea', 'frases que ficam', 'favorito da torcida'],
    CONFRONTATIONAL:['a declaração bomba', 'conflito com rival', 'o que ele disse dessa vez'],
    SHOWMAN:        ['o espetáculo além do placar', 'quando o show começa'],
    DIPLOMATIC:     ['o profissional modelo', 'construtor de legado controlado'],
    RESERVED:       ['o enigma', 'o que acontece fora das câmeras?'],
    ENIGMATIC:      ['quem é esse jogador realmente?', 'o silêncio que diz tudo'],
    INTELLECTUAL:   ['a mente por trás do campeão', 'tênis como metáfora'],
  };
  if (persona && personaDefs[persona]) angles.push(...personaDefs[persona]);

  // Angles por mood
  const moodAngles = {
    DROUGHT_START:   ['o que está acontecendo nos bastidores', 'o que aconteceu com X'],
    OBSESSED:        ['o duelo que passou a ser sobre mais que tênis', 'o que ele precisa mudar'],
    FAREWELL_TOUR:   ['cada partida agora', 'o fim que o circuito não quer que chegue'],
    COMEBACK:        ['o retorno que parecia impossível', 'o que ele provou ao voltar'],
    CRISIS:          ['instabilidade fora das quadras', 'o peso que ninguém vê'],
    VULNERABLE:      ['antes do atleta, existe o ser humano', 'o sofrimento que humaniza'],
    BURNED_OUT:      ['esgotamento — fontes falam em pausa longa'],
    DOMINANT:        ['ninguém tem resposta', 'a dominância sem paralelo'],
    LEGACY_AWARE:    ['o peso histórico de cada palavra', 'o legado que se consolida'],
    RESISTANT:       ['nega o declínio — por quanto tempo?'],
    BITTER:          ['a amargura que o circuito não ignora'],
    VILLAIN:         ['o antagonista que o circuito precisa'],
  };
  if (mood && moodAngles[mood]) angles.push(...moodAngles[mood]);

  // Angles por reputação
  const repAngles = {
    VILLAIN:       ['alguém precisa dizer: o circuito tem seu vilão'],
    PRODIGY:       ['uma geração que não pede licença para aparecer'],
    UNDERDOG:      ['a história que ninguém apostaria no começo'],
    MYSTERIOUS:    ['por que X sumiu da mídia?'],
    CONTROVERSIAL: ['o que X disse desta vez'],
  };
  if (repId && repAngles[repId]) angles.push(...repAngles[repId]);

  return [...new Set(angles)]; // sem duplicatas
}

/**
 * Gera artigos de personalidade para fim de temporada.
 * Cobre jogadores em estados narrativamente fortes.
 * Máximo de 4 artigos por temporada para não inundar o feed.
 *
 * @param {object[]} allPlayers
 * @param {number}   year
 * @returns {object[]} artigos
 */
function genPersonalityColumns(allPlayers, year) {
  const articles = [];

  // Estados que geram artigo garantido (se houver jogador elegível)
  const PRIORITY_MOODS = new Set([
    'FAREWELL_TOUR','CRISIS','COMEBACK','VULNERABLE','DOMINANT','LEGACY_AWARE',
  ]);
  const SECONDARY_MOODS = new Set([
    'BITTER','OBSESSED','RESISTANT','ISOLATED','SEARCHING','REBUILDING',
  ]);

  // Filtra top-50 com personalidade
  const candidates = allPlayers
    .filter(p => p.personality?.currentState?.mood && (p.rankPosition ?? 999) <= 50)
    .sort((a, b) => (a.rankPosition ?? 999) - (b.rankPosition ?? 999));

  const used = new Set();

  for (const p of candidates) {
    if (articles.length >= 4) break;
    if (used.has(p.id)) continue;

    const mood   = p.personality.currentState.mood;
    const repId  = (typeof p.personality.reputation === 'object')
                 ? p.personality.reputation?.id : p.personality.reputation;
    const narrative = p.personality.currentState?.publicNarrative ?? '';
    const name   = p.name;
    const angles = _storyAnglesForPlayer(p);
    const journalist = _journalistForPlayer(p) ?? JOURNALISTS.SANTOS;
    const j = journalist;

    let headline, deck, body, type, tags;

    // ── FAREWELL_TOUR ──
    if (mood === 'FAREWELL_TOUR' && !used.has('farewell')) {
      used.add('farewell');
      headline = `${name} e o fim que o circuito não quer que chegue`;
      deck     = narrative || `Cada partida agora carrega um peso diferente.`;
      body     = [
        pick(j.voice.opening),
        `${name} está numa fase da carreira que poucos atingem: a consciência clara do fim, sem que o fim tenha chegado ainda. Cada torneio tem aquele sabor diferente — mais pesado, mais bonito, mais definitivo.`,
        angles.length ? `O que o circuito lembra: ${angles[0]}.` : '',
        `Quando o último ponto chegar, vai ser daqueles momentos que ninguém quer ter perdido.`,
        pick(j.voice.closing),
      ].filter(Boolean).join(' ');
      type = 'COLUMN'; tags = ['despedida', 'carreira', 'farewell'];
    }

    // ── COMEBACK após lesão ──
    else if (mood === 'COMEBACK' && !used.has('comeback')) {
      used.add('comeback');
      headline = `O retorno de ${name} — e o que foi provado ao voltar`;
      deck     = narrative || `Voltou. E o circuito lembrou por que sente falta.`;
      body     = [
        pick(j.voice.opening),
        `Há retornos que são só físicos. E há retornos que mudam quem o atleta é. O de ${name} parece ser do segundo tipo.`,
        `O circuito acompanhou de perto. Houve um momento — dentro ou fora da quadra — em que ficou claro que ${name} não voltou apenas para competir. Voltou para provar algo que só ele sabia que precisava provar.`,
        pick(j.voice.closing),
      ].filter(Boolean).join(' ');
      type = 'COMEBACK'; tags = ['retorno', 'comeback', 'superação'];
    }

    // ── CRISIS ──
    else if (mood === 'CRISIS' && !used.has('crisis')) {
      used.add('crisis');
      headline = `O que está acontecendo com ${name}?`;
      deck     = narrative || `Fora e dentro de quadra, as perguntas se acumulam.`;
      body     = [
        pick(j.voice.opening),
        `${name} está atravessando o momento mais difícil de que se tem memória na carreira dele. Não é só o ranking — é algo mais fundo, que o placar não captura e que as entrevistas revelam mais do que deveriam.`,
        angles.length ? `O que fontes próximas descrevem: "${angles[0]}".` : '',
        `O circuito prefere não falar sobre isso. Mas há uma história aqui, e ela vai ser contada de uma forma ou de outra.`,
        pick(j.voice.closing),
      ].filter(Boolean).join(' ');
      type = 'COLUMN'; tags = ['crise', 'bastidores', 'análise'];
    }

    // ── DOMINANT + ICON ──
    else if (mood === 'DOMINANT' && repId === 'ICON' && !used.has('dominant')) {
      used.add('dominant');
      headline = `${name}: ninguém tem resposta. Ele sabe disso`;
      deck     = narrative || `Uma dominância que o circuito tenta processar.`;
      body     = [
        pick(j.voice.opening),
        `Há um ponto na carreira de poucos jogadores em que a pergunta deixa de ser "ele vai vencer?" e passa a ser "quem vai conseguir parar isso?". ${name} chegou nesse ponto.`,
        `A temporada confirmou o que os últimos anos vinham construindo. O circuito não está perdendo para ${name} por falta de talento. Está perdendo porque ${name} encontrou uma versão de si mesmo que ainda não tem resposta conhecida.`,
        pick(j.voice.closing),
      ].filter(Boolean).join(' ');
      type = 'COLUMN'; tags = ['dominância', 'ícone', 'análise'];
    }

    // ── LEGACY_AWARE ──
    else if (mood === 'LEGACY_AWARE' && !used.has('legacy')) {
      used.add('legacy');
      headline = `${name} fala com quem já chegou lá — o peso de ser histórico`;
      deck     = narrative || `Cada frase carrega contexto que só quem viveu entende.`;
      body     = [
        pick(j.voice.opening),
        `Tem um tipo de entrevista que só acontece numa fase específica de carreira: quando o jogador já não precisa provar nada, mas ainda está no processo de entender o que construiu. ${name} está nessa fase.`,
        `As respostas são mais longas. As pausas são diferentes. Há algo em ${name} que transcende o resultado — e o circuito começa a perceber isso de um jeito que vai demorar para ser processado completamente.`,
        pick(j.voice.closing),
      ].filter(Boolean).join(' ');
      type = 'COLUMN'; tags = ['legado', 'carreira', 'ícone'];
    }

    // ── BITTER/RESISTANT (estados secundários) ──
    else if (SECONDARY_MOODS.has(mood) && !used.has(mood)) {
      used.add(mood);
      const moodTemplates = {
        BITTER: {
          headline: `${name} não esconde mais: a amargura que o circuito não pode ignorar`,
          deck:     narrative || `Algo corroeu a paciência. E ele parou de fingir que não.`,
          body:     [
            pick(j.voice.opening),
            `${name} chegou num ponto em que as palavras saem diferentes. Mais afiadas. Mais carregadas de algo que não estava lá antes.`,
            angles.length ? `Nos bastidores: ${angles[0]}.` : '',
            pick(j.voice.closing),
          ].filter(Boolean).join(' '),
        },
        OBSESSED: {
          headline: `Há um adversário que mora na cabeça de ${name}`,
          deck:     narrative || `A rivalidade passou a ser sobre mais que tênis.`,
          body:     [
            pick(j.voice.opening),
            `Quando um jogador começa a organizar sua temporada — consciente ou não — em torno de um adversário específico, algo mudou. É mais do que competição. É pessoal.`,
            `${name} está nesse lugar. O circuito percebe nas entrevistas, no calendário, na forma como o nome do rival aparece em conversas que deveriam ser sobre outra coisa.`,
            pick(j.voice.closing),
          ].filter(Boolean).join(' '),
        },
        RESISTANT: {
          headline: `${name} ainda está aqui — e o circuito não sabe o que fazer com isso`,
          deck:     narrative || `Recusa a narrativa. Por quanto tempo?`,
          body:     [
            pick(j.voice.opening),
            `${name} tem uma relação particular com a realidade quando o assunto é declínio: nega, combate, ignora. Funciona mais vezes do que deveria.`,
            `Mas há algo diferente nesta temporada. O discurso combativo está lá — sempre esteve. O que mudou é o que está por baixo dele.`,
            pick(j.voice.closing),
          ].filter(Boolean).join(' '),
        },
        ISOLATED: {
          headline: `Fontes: ${name} se distanciou da mídia — e do circuito`,
          deck:     narrative || `O silêncio não é acidente.`,
          body:     [
            pick(j.voice.opening),
            `${name} sumiu. Não dos torneios — ainda está lá, ainda compete. Mas a presença diminuiu. As entrevistas ficaram monossilábicas. As coletivas, evitadas.`,
            `Quem está próximo descreve um jogador que precisa de espaço que o circuito raramente oferece. O que vem depois disso? O circuito aguarda.`,
            pick(j.voice.closing),
          ].filter(Boolean).join(' '),
        },
        SEARCHING: {
          headline: `${name} em busca de resposta — a temporada que mais levantou dúvidas`,
          deck:     narrative || `As perguntas chegaram mais rápido do que as respostas.`,
          body:     [
            pick(j.voice.opening),
            `Há temporadas que produzem troféus. Há temporadas que produzem perguntas. A de ${name} foi do segundo tipo — e isso não é necessariamente ruim.`,
            `Quem está em busca ainda tem algo a encontrar. O problema é quando a busca dura mais do que a paciência — do atleta ou do circuito.`,
            pick(j.voice.closing),
          ].filter(Boolean).join(' '),
        },
        REBUILDING: {
          headline: `${name} está construindo algo. Ninguém sabe ainda o quê`,
          deck:     narrative || `Processo em andamento. Resultado incerto.`,
          body:     [
            pick(j.voice.opening),
            `${name} passou a temporada com a cabeça em outro lugar — não no presente, mas no futuro que está tentando construir. Mudanças de equipe, mudanças de jogo, mudanças de mentalidade.`,
            `Reconstruções levam tempo. E o circuito não é paciente. Mas quem acompanha de perto percebe que há um plano — mesmo que imperfeito.`,
            pick(j.voice.closing),
          ].filter(Boolean).join(' '),
        },
      };

      const tmpl = moodTemplates[mood];
      if (!tmpl) continue;
      headline = tmpl.headline; deck = tmpl.deck; body = tmpl.body;
      type = 'COLUMN'; tags = [mood.toLowerCase(), 'análise', 'personalidade'];
    }

    else continue; // mood sem template — pula

    used.add(p.id);
    articles.push({
      id:         `personality-${p.id}-${mood}-${year}`,
      type,
      journalist: j,
      tournament: null,
      year,
      player:     p,
      headline,
      deck,
      body,
      storyAngles: angles,
      length:     j.verbosity ?? 'MEDIUM',
      tags:       [...(tags ?? []), 'personalidade'],
      isPersonalityDriven: true,
      createdAt:  Date.now(),
    });
  }

  return articles;
}

// ═══════════════════════════════════════════════════════════════════
// GERADORES DE ARTIGO POR TIPO
// ═══════════════════════════════════════════════════════════════════

// ── EDITORIAL BRAIN ──────────────────────────────────────────────
// Fase 2: a redação escolhe uma tese antes de publicar.
// Isso não substitui os textos ainda; injeta angulo, stakes e memoria
// para a Fase 3 transformar voz/formato sem depender de templates cegos.

const EDITORIAL_ANGLES = {
  LEGACY: {
    id: 'LEGACY',
    label: 'legado em movimento',
    tone: 'historico',
    stakes: 'O resultado muda a conversa de legado, não apenas a tabela da semana.',
  },
  ASCENSION: {
    id: 'ASCENSION',
    label: 'ascensao real',
    tone: 'descoberta',
    stakes: 'A materia pergunta se o circuito acabou de ganhar um novo protagonista.',
  },
  DYNASTY: {
    id: 'DYNASTY',
    label: 'dinastia sob controle',
    tone: 'dominancia',
    stakes: 'A pauta deixa de tratar a vitoria como evento isolado e passa a medir repeticao de poder.',
  },
  CRISIS: {
    id: 'CRISIS',
    label: 'crise publica',
    tone: 'pressao',
    stakes: 'A pergunta central nao e o placar, e o que ele revela sobre uma ferida aberta.',
  },
  REVENGE: {
    id: 'REVENGE',
    label: 'resposta e revanche',
    tone: 'confronto',
    stakes: 'O resultado conversa com uma derrota anterior e muda o peso emocional do confronto.',
  },
  CHAOS: {
    id: 'CHAOS',
    label: 'hierarquia quebrada',
    tone: 'instabilidade',
    stakes: 'A noticia importa porque embaralha a ordem do circuito.',
  },
  COMEBACK: {
    id: 'COMEBACK',
    label: 'retorno com prova',
    tone: 'reconstrucao',
    stakes: 'A pauta acompanha se a volta e apenas fisica ou se o jogador recuperou autoridade.',
  },
  NEXT_GEN: {
    id: 'NEXT_GEN',
    label: 'geracao chegando',
    tone: 'futuro',
    stakes: 'A materia trata o resultado como sinal de troca geracional possivel.',
  },
  TACTICAL_PROOF: {
    id: 'TACTICAL_PROOF',
    label: 'prova tatica',
    tone: 'analise',
    stakes: 'O texto deve explicar que padrao de jogo sustentou o resultado.',
  },
  HUMAN_COST: {
    id: 'HUMAN_COST',
    label: 'custo humano',
    tone: 'humano',
    stakes: 'A noticia pesa mais pelo corpo, rotina e consequencias pessoais do que pelo ranking.',
  },
  RANKING_SWING: {
    id: 'RANKING_SWING',
    label: 'terremoto no ranking',
    tone: 'consequencia',
    stakes: 'A materia trata pontos e posicoes como poder politico dentro do circuito.',
  },
  SURFACE_IDENTITY: {
    id: 'SURFACE_IDENTITY',
    label: 'identidade de piso',
    tone: 'especialista',
    stakes: 'A pauta pergunta se o resultado confirma uma relacao especial entre jogador, piso e padrao de jogo.',
  },
  CALENDAR_GRIND: {
    id: 'CALENDAR_GRIND',
    label: 'sobrevivencia de calendario',
    tone: 'desgaste',
    stakes: 'O texto mede a vitoria pelo custo acumulado da temporada, nao so pela execucao da semana.',
  },
  LOCKER_ROOM: {
    id: 'LOCKER_ROOM',
    label: 'bastidor em ebulicao',
    tone: 'bastidor',
    stakes: 'A noticia vale pelo que sugere sobre relacoes, pressao interna e temperatura social do circuito.',
  },
  CONSISTENCY_CASE: {
    id: 'CONSISTENCY_CASE',
    label: 'caso de consistencia',
    tone: 'metodo',
    stakes: 'A cobertura deixa de procurar explosao e passa a explicar repeticao, rotina e confiabilidade.',
  },
  ROUTINE: {
    id: 'ROUTINE',
    label: 'registro de circuito',
    tone: 'informativo',
    stakes: 'A materia registra o fato, mas ainda procura o detalhe que evita texto automatico.',
  },
};

function _safeRank(player) {
  return player?.rankPosition ?? player?.stats?.ranking ?? 999;
}

function _recentArticleCount(feed = [], playerId, opts = {}) {
  if (!playerId) return 0;
  const year = opts.year ?? null;
  const type = opts.type ?? null;
  return (feed ?? []).filter(article => {
    if (year && article.year !== year) return false;
    if (type && article.type !== type) return false;
    return article.player?.id === playerId || article.playerB?.id === playerId || article.winner?.id === playerId;
  }).length;
}

function buildEditorialContext({ tournament, bracket, state, result }) {
  const allPlayers = [...(state?.tourPlayers ?? []), ...(state?.prospects ?? [])];
  const feed = state?.newsEngine?.feed ?? [];
  const finalMatch = bracket?.rounds?.at?.(-1)?.[0] ?? null;
  const champion = bracket?.champion ?? finalMatch?.winner ?? null;
  const finalist = champion && finalMatch
    ? (finalMatch.playerA?.id === champion.id ? finalMatch.playerB : finalMatch.playerA)
    : null;
  const champFull = champion ? allPlayers.find(p => p.id === champion.id) ?? champion : null;
  const finalistFull = finalist ? allPlayers.find(p => p.id === finalist.id) ?? finalist : null;
  return {
    tournament,
    bracket,
    state,
    result,
    allPlayers,
    feed,
    champion: champFull,
    finalist: finalistFull,
    finalMatch,
    year: state?.year,
    isMajor: ['GRAND_SLAM', 'SLAM_CLASH', 'FINALS'].includes(tournament?.category),
    isBig: ['GRAND_SLAM', 'SLAM_CLASH', 'FINALS', 'MASTERS_1000'].includes(tournament?.category),
  };
}

function pickEditorialAngle(article, ctx) {
  const player = article?.player ? (ctx.allPlayers.find(p => p.id === article.player.id) ?? article.player) : null;
  const playerAge = player?.age ?? 99;
  const rank = _safeRank(player);
  const mood = player?.personality?.currentState?.mood ?? '';
  const titleCount = Object.values(player?.careerTitles ?? {}).reduce((sum, n) => sum + (Number(n) || 0), 0);
  const slams = player?.careerTitles?.gs ?? 0;
  const recentPlayerArticles = _recentArticleCount(ctx.feed, player?.id, { year: ctx.year });
  const recentChampionArticles = _recentArticleCount(ctx.feed, player?.id, { year: ctx.year, type: 'CHAMPION' });
  const tournamentSurface = String(article?.tournament?.surface ?? ctx.tournament?.surface ?? '').toUpperCase();
  const currentWeek = Number(ctx.state?.currentWeek ?? ctx.state?.week ?? 0);
  const isLateSeason = currentWeek >= 34 || ['FINALS', 'SLAM_CLASH'].includes(ctx.tournament?.category);
  const isRankingStory = /ranking|pontos|top\s*10|top\s*25|numero|número|seed/i.test(`${article?.headline ?? ''} ${article?.deck ?? ''} ${article?.body ?? ''}`);

  if (['INJURY', 'INJURY_FOLLOWUP', 'INJURY_SURGERY', 'RETIREMENT', 'BREAKING'].includes(article?.type)) {
    return EDITORIAL_ANGLES.HUMAN_COST;
  }
  if (['RUMOR', 'LIFE_RUMOR', 'SPONSOR', 'SPONSOR_ELITE', 'LIFE_EVENT'].includes(article?.type)) {
    return EDITORIAL_ANGLES.LOCKER_ROOM;
  }
  if (article?.type === 'UPSET') return EDITORIAL_ANGLES.CHAOS;
  if (article?.type === 'RIVALRY') return EDITORIAL_ANGLES.REVENGE;
  if (article?.type === 'EPIC_MATCH') return EDITORIAL_ANGLES.REVENGE;
  if (article?.type === 'PROSPECT' || playerAge <= 21) return EDITORIAL_ANGLES.NEXT_GEN;
  if (isRankingStory || article?.type === 'RECORD') return EDITORIAL_ANGLES.RANKING_SWING;
  if (['COMEBACK', 'REBUILDING', 'VULNERABLE'].includes(mood) || /retorno|volta|reabilita/i.test(article?.headline ?? '')) {
    return EDITORIAL_ANGLES.COMEBACK;
  }
  if (['CRISIS', 'ISOLATED', 'BITTER', 'BURNED_OUT', 'UNDER_INVESTIGATION'].includes(mood)) {
    return EDITORIAL_ANGLES.CRISIS;
  }
  if (article?.type === 'CHAMPION' && isLateSeason && recentPlayerArticles >= 4) {
    return EDITORIAL_ANGLES.CALENDAR_GRIND;
  }
  if (article?.type === 'CHAMPION' && ctx.isMajor && (slams >= 3 || titleCount >= 18 || rank <= 2)) {
    return EDITORIAL_ANGLES.LEGACY;
  }
  if (article?.type === 'CHAMPION' && (recentChampionArticles >= 2 || mood === 'DOMINANT' || mood === 'AT_PEAK')) {
    return EDITORIAL_ANGLES.DYNASTY;
  }
  if (article?.type === 'CHAMPION' && tournamentSurface && ['CLAY', 'HARD', 'GRASS', 'INDOOR', 'CARPET'].includes(tournamentSurface)) {
    return EDITORIAL_ANGLES.SURFACE_IDENTITY;
  }
  if (article?.type === 'CHAMPION' && (rank > 12 || recentPlayerArticles === 0)) {
    return EDITORIAL_ANGLES.ASCENSION;
  }
  if (article?.type === 'CHAMPION' && recentPlayerArticles >= 3) {
    return EDITORIAL_ANGLES.CONSISTENCY_CASE;
  }
  if (['ANALYSIS', 'COLUMN', 'TOURNAMENT_WRAP', 'RECORD'].includes(article?.type)) {
    return EDITORIAL_ANGLES.TACTICAL_PROOF;
  }
  return EDITORIAL_ANGLES.ROUTINE;
}

function buildEditorialThesis(article, angle, ctx) {
  const p = article?.player?.name ?? ctx.champion?.name ?? 'O circuito';
  const t = article?.tournament?.name ?? ctx.tournament?.name ?? 'a semana';
  const opponent = article?.playerB?.name ?? ctx.finalist?.name ?? null;
  switch (angle.id) {
    case 'LEGACY':
      return `${p} nao ganhou apenas ${t}; ganhou mais uma camada na discussao historica.`;
    case 'ASCENSION':
      return `${p} sai de ${t} com algo mais raro que pontos: permissao para ser tratado como protagonista.`;
    case 'DYNASTY':
      return `${p} esta transformando vitorias em habito, e habito em intimidacao coletiva.`;
    case 'CRISIS':
      return `${p} virou pauta porque o resultado parece sintoma, nao acidente.`;
    case 'REVENGE':
      return opponent
        ? `${p} contra ${opponent} agora carrega memoria, resposta e ajuste de contas.`
        : `${p} venceu uma partida que conversa com capitulos anteriores.`;
    case 'CHAOS':
      return `${t} baguncou a hierarquia e obrigou o circuito a recalcular certezas.`;
    case 'COMEBACK':
      return `${p} nao esta apenas jogando de novo; esta tentando provar que ainda pertence ao centro da conversa.`;
    case 'NEXT_GEN':
      return `${p} transforma expectativa em dado concreto, e isso muda a paciencia do circuito.`;
    case 'TACTICAL_PROOF':
      return `${t} deixou uma pergunta tecnica clara: qual padrao realmente sobreviveu sob pressao?`;
    case 'HUMAN_COST':
      return `${p} virou noticia porque o tenis, as vezes, cobra primeiro do corpo e so depois do ranking.`;
    case 'RANKING_SWING':
      return `${t} mudou a geografia do ranking: pontos viraram territorio, protecao e ameaca.`;
    case 'SURFACE_IDENTITY':
      return `${p} encontrou em ${t} uma prova de encaixe entre piso, instinto e repertorio.`;
    case 'CALENDAR_GRIND':
      return `${p} venceu tambem contra o calendario, esse adversario silencioso que chega no fim do ano sem pedir entrada.`;
    case 'LOCKER_ROOM':
      return `${t} deixou uma historia que nao cabe inteira no placar: ela tambem circula nos corredores.`;
    case 'CONSISTENCY_CASE':
      return `${p} esta construindo valor pelo metodo: menos explosao isolada, mais repeticao que desgasta o circuito.`;
    default:
      return `${t} entra no arquivo porque algum detalhe precisa sobreviver alem do placar.`;
  }
}

const EDITORIAL_FORMATS = {
  COVER_STORY: {
    id: 'COVER_STORY',
    label: 'Materia de capa',
    rhythm: 'longo',
    kicker: 'CAPA',
  },
  COLUMN: {
    id: 'COLUMN',
    label: 'Coluna',
    rhythm: 'opiniao',
    kicker: 'COLUNA',
  },
  TACTICAL_FILE: {
    id: 'TACTICAL_FILE',
    label: 'Arquivo tatico',
    rhythm: 'analise',
    kicker: 'DOSSIE TATICO',
  },
  NEWS_FLASH: {
    id: 'NEWS_FLASH',
    label: 'Nota urgente',
    rhythm: 'curto',
    kicker: 'FLASH',
  },
  HUMAN_PROFILE: {
    id: 'HUMAN_PROFILE',
    label: 'Perfil humano',
    rhythm: 'perfil',
    kicker: 'PERFIL',
  },
  FUTURE_WATCH: {
    id: 'FUTURE_WATCH',
    label: 'Radar do futuro',
    rhythm: 'radar',
    kicker: 'RADAR',
  },
  MATCH_FILE: {
    id: 'MATCH_FILE',
    label: 'Arquivo da partida',
    rhythm: 'drama',
    kicker: 'JOGO-CHAVE',
  },
  RANKING_REPORT: {
    id: 'RANKING_REPORT',
    label: 'Relatorio de ranking',
    rhythm: 'consequencia',
    kicker: 'RANKING',
  },
  SURFACE_NOTE: {
    id: 'SURFACE_NOTE',
    label: 'Caderno de piso',
    rhythm: 'especialista',
    kicker: 'PISO',
  },
  SEASON_THREAD: {
    id: 'SEASON_THREAD',
    label: 'Fio da temporada',
    rhythm: 'continuidade',
    kicker: 'TEMPORADA',
  },
  BACKSTAGE_NOTE: {
    id: 'BACKSTAGE_NOTE',
    label: 'Nota de bastidor',
    rhythm: 'bastidor',
    kicker: 'BASTIDOR',
  },
  FORM_GUIDE: {
    id: 'FORM_GUIDE',
    label: 'Mapa de forma',
    rhythm: 'tendencia',
    kicker: 'FORMA',
  },
};

function pickEditorialFormat(article, angle, ctx) {
  if (['BREAKING', 'INJURY_SURGERY'].includes(article?.type)) return EDITORIAL_FORMATS.NEWS_FLASH;
  if (['INJURY', 'INJURY_FOLLOWUP', 'RETIREMENT'].includes(article?.type) || angle.id === 'HUMAN_COST') return EDITORIAL_FORMATS.HUMAN_PROFILE;
  if (angle.id === 'LOCKER_ROOM') return EDITORIAL_FORMATS.BACKSTAGE_NOTE;
  if (angle.id === 'RANKING_SWING') return EDITORIAL_FORMATS.RANKING_REPORT;
  if (angle.id === 'SURFACE_IDENTITY') return EDITORIAL_FORMATS.SURFACE_NOTE;
  if (angle.id === 'CALENDAR_GRIND' || angle.id === 'CONSISTENCY_CASE') return EDITORIAL_FORMATS.SEASON_THREAD;
  if (['RIVALRY', 'EPIC_MATCH'].includes(article?.type) || angle.id === 'REVENGE') return EDITORIAL_FORMATS.MATCH_FILE;
  if (['ANALYSIS', 'TOURNAMENT_WRAP', 'RECORD'].includes(article?.type) || angle.id === 'TACTICAL_PROOF') return EDITORIAL_FORMATS.TACTICAL_FILE;
  if (article?.type === 'PROSPECT' || angle.id === 'NEXT_GEN') return EDITORIAL_FORMATS.FUTURE_WATCH;
  if (angle.id === 'CRISIS' || angle.id === 'CHAOS') return EDITORIAL_FORMATS.COLUMN;
  if (angle.id === 'COMEBACK' || angle.id === 'ASCENSION') return EDITORIAL_FORMATS.FORM_GUIDE;
  if (ctx.isBig || angle.id === 'LEGACY' || angle.id === 'DYNASTY') return EDITORIAL_FORMATS.COVER_STORY;
  return EDITORIAL_FORMATS.COLUMN;
}

function editorialKickerFor(article, angle, format) {
  const tournament = article?.tournament?.name ?? 'Circuito';
  const player = article?.player?.name ?? article?.winner?.name ?? null;
  if (player) return `${format.kicker} / ${angle.label} / ${player}`;
  return `${format.kicker} / ${angle.label} / ${tournament}`;
}

const EDITORIAL_DECK_BANK = {
  LEGACY: [
    'A semana entra no arquivo porque altera a forma como a carreira sera lembrada.',
    'Nao e so mais um trofeu: e uma peca nova na conversa historica.',
    'O placar passou. A discussao que ele abriu deve ficar.',
  ],
  ASCENSION: [
    'O resultado transforma potencial em permissao publica para acreditar.',
    'A subida deixa de parecer promessa e passa a parecer agenda do circuito.',
    'Ha semanas em que um jogador nao sobe degraus; ele muda de sala.',
  ],
  DYNASTY: [
    'A repeticao de vitorias comeca a virar ambiente, nao excecao.',
    'O circuito ja nao reage apenas ao titulo: reage ao habito de vencer.',
    'Dominio real e quando os rivais ajustam o calendario pensando em voce.',
  ],
  CRISIS: [
    'A derrota interessa porque parece explicar algo que vinha sendo escondido.',
    'O problema nao nasceu nesta semana, mas ganhou microfone.',
    'Quando o resultado confirma a duvida, a duvida vira noticia principal.',
  ],
  REVENGE: [
    'A partida reabriu memoria antiga e entregou uma resposta nova.',
    'Nem todo confronto cabe no historico direto; alguns carregam temperatura propria.',
    'O resultado muda o tom da rivalidade e reposiciona quem chega no proximo encontro.',
  ],
  CHAOS: [
    'A chave saiu do eixo e obrigou favoritos a recalcular o proprio conforto.',
    'A semana fez o ranking parecer menos previsivel do que deveria.',
    'Quando a ordem quebra cedo, o torneio inteiro passa a respirar diferente.',
  ],
  COMEBACK: [
    'O retorno ganha peso porque veio acompanhado de prova competitiva.',
    'Voltar ao calendario e uma coisa; voltar a incomodar e outra bem maior.',
    'A materia acompanha a diferenca entre estar presente e voltar a pertencer.',
  ],
  NEXT_GEN: [
    'A nova geracao ganhou mais um argumento contra a paciencia do circuito.',
    'O futuro apareceu em forma de resultado, e isso acelera todas as perguntas.',
    'Promessa so muda de patamar quando obriga veterano a reagir.',
  ],
  TACTICAL_PROOF: [
    'O torneio deixou uma pista tecnica clara para quem olha alem do trofeu.',
    'A resposta esta menos no resultado bruto e mais no padrao que resistiu.',
    'O que venceu aqui foi uma ideia de jogo colocada sob pressao.',
  ],
  HUMAN_COST: [
    'A historia pesa porque lembra que toda carreira tambem e um corpo tentando durar.',
    'O ranking registra o impacto; a pessoa paga a conta antes.',
    'A noticia fica no limite delicado entre esporte, rotina e consequencia humana.',
  ],
  RANKING_SWING: [
    'A movimentacao muda chaveamento, seguranca e medo para as proximas semanas.',
    'Pontos aqui nao sao detalhe: sao territorio competitivo.',
    'A tabela parece fria, mas esta semana mexeu na politica interna do ranking.',
  ],
  SURFACE_IDENTITY: [
    'O piso ajudou a revelar uma versao mais nitida do jogador.',
    'A quadra nao foi cenario; foi parte da explicacao.',
    'Alguns encaixes entre jogo e superficie viram assinatura publica.',
  ],
  CALENDAR_GRIND: [
    'Nesta altura do ano, vencer tambem significa sobreviver ao acumulo.',
    'O calendario ja virou adversario, e esta semana mostrou quem ainda tem pernas.',
    'O resultado importa pelo tenis, mas tambem pelo desgaste que ele atravessou.',
  ],
  LOCKER_ROOM: [
    'A noticia vive no que o circuito comenta quando os microfones parecem desligados.',
    'O bastidor nao decide jogo, mas explica a temperatura de quem joga.',
    'Nem toda historia nasce no placar; algumas vazam pelos corredores.',
  ],
  CONSISTENCY_CASE: [
    'O valor da semana esta na repeticao: menos clarim, mais construcao.',
    'Consistencia e o tipo de manchete que demora a fazer barulho, mas sustenta ranking.',
    'O circuito talvez esteja vendo menos explosao e mais metodo.',
  ],
  ROUTINE: [
    'Mesmo uma semana comum deixa uma pista quando a cobertura olha direito.',
    'O fato entra como registro, mas ainda carrega consequencia pequena e real.',
    'Nem tudo vira marco historico; algumas noticias servem para mostrar a textura do circuito.',
  ],
};

const EDITORIAL_FORMAT_TEXTURE = {
  COVER_STORY: [
    'A leitura de capa pede folego: contexto, memoria e consequencia no mesmo quadro.',
    'Esta e uma daquelas materias em que o torneio funciona como capitulo, nao rodape.',
  ],
  COLUMN: [
    'A coluna entra para tomar posicao, nao para repetir a ata.',
    'O ponto aqui e interpretar o barulho que ficou depois do ultimo game.',
  ],
  TACTICAL_FILE: [
    'O arquivo tatico separa sensacao de evidencia e procura o padrao vencedor.',
    'A lupa esta no desenho dos pontos, nao apenas no nome do campeao.',
  ],
  NEWS_FLASH: [
    'A nota e curta porque o fato ainda esta quente.',
    'Primeiro registro: o circuito ainda esta processando as consequencias.',
  ],
  HUMAN_PROFILE: [
    'O perfil reduz a velocidade para olhar o atleta antes do resultado.',
    'Aqui, a carreira aparece menos como estatistica e mais como desgaste vivido.',
  ],
  FUTURE_WATCH: [
    'O radar observa sinais antes que eles virem consenso.',
    'A pergunta nao e se ha talento, e quando o circuito vai ter que trata-lo como fato.',
  ],
  MATCH_FILE: [
    'O arquivo da partida reconstroi tensao, memoria e resposta competitiva.',
    'Alguns jogos precisam ser lidos como confronto de narrativas, nao so de estilos.',
  ],
  RANKING_REPORT: [
    'O relatorio mede o efeito pratico: pontos, posicoes e proximas portas abertas.',
    'Ranking e consequencia acumulada; esta semana empurrou a conta para outro lugar.',
  ],
  SURFACE_NOTE: [
    'O caderno de piso pergunta o que a quadra revelou que outra superficie talvez escondesse.',
    'Superficie nao explica tudo, mas as vezes entrega a frase que faltava.',
  ],
  SEASON_THREAD: [
    'O fio da temporada liga esta semana ao que ja vinha acontecendo antes dela.',
    'A cobertura trata o torneio como continuidade, nao como ilha.',
  ],
  BACKSTAGE_NOTE: [
    'A nota de bastidor acompanha sinais, cautela e temperatura social do circuito.',
    'O texto nao vende certeza artificial: registra o que o ambiente esta dizendo.',
  ],
  FORM_GUIDE: [
    'O mapa de forma procura tendencia, nao euforia.',
    'A questao e se o resultado confirma uma curva ou apenas uma semana feliz.',
  ],
};

function editorialDeckFor(article, angle, thesis, format) {
  const angleLine = pick(EDITORIAL_DECK_BANK[angle.id] ?? EDITORIAL_DECK_BANK.ROUTINE);
  const formatLine = pick(EDITORIAL_FORMAT_TEXTURE[format.id] ?? []);
  if (!article?.deck) return [angleLine, formatLine].filter(Boolean).join(' ');
  if (article.deck.includes(thesis) || article.deck.includes(angleLine)) return article.deck;
  if (article.deck.length < 95) return [article.deck, angleLine].filter(Boolean).join(' ');
  if (article.deck.length < 140 && formatLine) return [article.deck, formatLine].join(' ');
  return article.deck;
}

function editorialLeadFor(article, angle, format, thesis) {
  const journalist = article?.journalist?.name ?? 'A redacao';
  const outlet = article?.journalist?.outlet ?? 'Circuit Report';
  const base = {
    LEGACY: `Esta e uma materia de legado, e materia de legado nao comeca no placar. Comeca no que o placar autoriza o circuito a dizer depois.`,
    ASCENSION: `A redacao trata esta semana como ponto de virada: ainda nao e coroacao definitiva, mas ja deixou de ser ruido.`,
    DYNASTY: `Dominio repetido muda a cobertura. A primeira vitoria surpreende; a terceira obriga todo mundo a mudar o tom.`,
    CRISIS: `O texto nasce de uma desconfianca: quando o mesmo sintoma aparece mais de uma vez, talvez nao seja acaso.`,
    REVENGE: `Algumas partidas chegam com memoria propria. Esta chegou carregando respostas que nenhum ranking conseguiria organizar sozinho.`,
    CHAOS: `A hierarquia do circuito saiu da semana menos estavel do que entrou. Isso e jornalismo, nao tabela.`,
    COMEBACK: `Voltar e um verbo simples demais para o que acontece com um jogador quando o circuito ja aprendeu a duvidar dele.`,
    NEXT_GEN: `O futuro raramente pede licenca. Quando ele chega antes do calendario previsto, a cobertura precisa acelerar junto.`,
    TACTICAL_PROOF: `A pergunta aqui nao e apenas quem venceu. E qual padrao sobreviveu quando a partida exigiu resposta real.`,
    HUMAN_COST: `Antes de ser numero, ranking ou seed, existe um corpo tentando sustentar uma carreira inteira.`,
    RANKING_SWING: `Ranking nao e lista; e mapa de influencia. Cada salto muda chaveamento, pressao, convite, medo e planejamento.`,
    SURFACE_IDENTITY: `Alguns resultados parecem nascer do encontro entre jogador e piso. O tenis fica mais claro quando a quadra combina com a personalidade.`,
    CALENDAR_GRIND: `No fim, a temporada vira uma prova de resistencia moral. Quem ainda consegue competir inteiro ja venceu uma parte invisivel do torneio.`,
    LOCKER_ROOM: `Ha noticias que entram pela porta lateral. Nao explicam tudo, mas revelam a temperatura de um circuito que tambem vive fora da linha de fundo.`,
    CONSISTENCY_CASE: `Consistencia raramente viraliza, mas constrói carreira. O que se repete por semanas costuma dizer mais do que um pico isolado.`,
    ROUTINE: `Mesmo uma noticia de rotina precisa encontrar seu detalhe humano. Sem isso, vira placar com pontuacao.`,
  }[angle.id] ?? thesis;
  const texture = pick(EDITORIAL_FORMAT_TEXTURE[format.id] ?? []);
  const dateline = article?.tournament?.location
    ? `${article.tournament.location}.`
    : article?.tournament?.name
    ? `${article.tournament.name}.`
    : '';
  return [`${format.label}.`, dateline, `${journalist}, ${outlet}.`, texture, base, thesis]
    .filter(Boolean)
    .join(' ');
}

function buildEditorialMemoryTrail(article, angle, ctx) {
  const playerId = article?.player?.id ?? article?.winner?.id ?? null;
  const tournamentId = article?.tournament?.id ?? null;
  const samePlayer = [];
  const sameAngle = [];
  for (const old of ctx.feed ?? []) {
    if (!old || old.id === article?.id) continue;
    if (tournamentId && old.tournament?.id === tournamentId && old.type === article?.type) continue;
    const oldPlayerMatch = playerId && (
      old.player?.id === playerId || old.playerB?.id === playerId || old.winner?.id === playerId
    );
    if (oldPlayerMatch && samePlayer.length < 3) samePlayer.push(old);
    if (old.editorialAngle?.id === angle.id && sameAngle.length < 3) sameAngle.push(old);
    if (samePlayer.length >= 3 && sameAngle.length >= 3) break;
  }
  const echoes = [...samePlayer, ...sameAngle]
    .filter((item, idx, arr) => item && arr.findIndex(x => x?.id === item.id) === idx)
    .slice(0, 4)
    .map(item => ({
      id: item.id ?? null,
      year: item.year ?? null,
      type: item.type ?? null,
      headline: item.headline ?? '',
      angle: item.editorialAngle?.label ?? null,
      tournament: item.tournament?.name ?? null,
    }));
  const seasonCount = (ctx.feed ?? []).filter(old => old?.year === ctx.year && (
    old.editorialAngle?.id === angle.id
    || (playerId && (old.player?.id === playerId || old.playerB?.id === playerId || old.winner?.id === playerId))
  )).length;
  return {
    threadId: playerId ? `${ctx.year}-${playerId}-${angle.id}` : `${ctx.year}-${angle.id}`,
    seasonCount,
    echoes,
    summary: echoes.length
      ? `Esta materia continua ${echoes.length} eco${echoes.length > 1 ? 's' : ''} recente${echoes.length > 1 ? 's' : ''} da cobertura.`
      : 'Primeiro registro forte deste fio editorial na temporada.',
  };
}

function archiveWeightFor(article, angle, memory) {
  const typeWeight = {
    BREAKING: 50,
    CHAMPION: 42,
    RETIREMENT: 44,
    INJURY_SURGERY: 38,
    UPSET: 34,
    RIVALRY: 32,
    EPIC_MATCH: 30,
    PROSPECT: 28,
    TOURNAMENT_WRAP: 24,
  }[article?.type] ?? 16;
  const angleWeight = ['LEGACY', 'DYNASTY', 'CRISIS', 'HUMAN_COST', 'NEXT_GEN'].includes(angle.id) ? 16 : 8;
  const memoryWeight = Math.min(18, (memory?.seasonCount ?? 0) * 3);
  return typeWeight + angleWeight + memoryWeight;
}

function polishEditorialArticle(article, angle, thesis, ctx) {
  const format = pickEditorialFormat(article, angle, ctx);
  const memory = buildEditorialMemoryTrail(article, angle, ctx);
  const lead = editorialLeadFor(article, angle, format, thesis);
  const formatSignature = pick(EDITORIAL_FORMAT_TEXTURE[format.id] ?? []);
  const body = article.body?.startsWith(`${format.label}.`)
    ? article.body
    : [lead, article.body, formatSignature ? `Nota editorial: ${formatSignature}` : null].filter(Boolean).join('\n\n');
  const spotlight = article.spotlight
    ?? (format.id === 'COVER_STORY' || angle.id === 'LEGACY' || angle.id === 'DYNASTY' ? 'COVER' : 'STANDARD');
  return {
    ...article,
    editorialFormat: format,
    editorialKicker: editorialKickerFor(article, angle, format),
    editorialMemory: memory,
    archiveWeight: archiveWeightFor(article, angle, memory),
    deck: editorialDeckFor(article, angle, thesis, format),
    body,
    spotlight,
  };
}

function applyEditorialBrain(article, ctx) {
  if (!article) return article;
  const angle = pickEditorialAngle(article, ctx);
  const thesis = buildEditorialThesis(article, angle, ctx);
  const tags = [...new Set([...(article.tags ?? []), `angulo-${angle.id.toLowerCase()}`, angle.label])];
  const enriched = {
    ...article,
    editorialAngle: {
      id: angle.id,
      label: angle.label,
      tone: angle.tone,
      stakes: angle.stakes,
      thesis,
    },
    deck: article.deck || angle.stakes,
    tags,
  };
  return polishEditorialArticle(enriched, angle, thesis, ctx);
}

// ── CAMPEÃO ──────────────────────────────────────────────────────

function genChampion({ tournament, bracket, year, rivalrySystem, allPlayers }) {
  const champ = bracket.champion;
  if (!champ) return null;

  const finalMatch = bracket.rounds?.at(-1)?.[0];
  const finalist   = finalMatch
    ? (finalMatch.playerA?.id === champ.id ? finalMatch.playerB : finalMatch.playerA)
    : null;

  const isSlam    = tournament.category === 'GRAND_SLAM';
  const isClash   = tournament.category === 'SLAM_CLASH';
  const isMasters = tournament.category === 'MASTERS_1000';
  const isFinals  = tournament.category === 'FINALS';
  const cat       = catLabel(tournament.category);
  const score     = finalMatch ? formatScore(finalMatch.result?.setsDetail) : '';
  const rank      = champ.rankPosition ?? '?';

  // ── Personalidade do campeão ─────────────────────────────────
  const champFull     = allPlayers.find(p => p.id === champ.id) ?? champ;
  const cMood         = champFull.personality?.currentState?.mood;
  const cNarrative    = champFull.personality?.currentState?.publicNarrative ?? '';
  const cAngles       = _storyAnglesForPlayer(champFull);
  const cMoments      = champFull.personality?.careerMoments ?? [];
  const isFirstSlam   = cMoments.some(m => m.type === 'FIRST_SLAM');
  const isComebackWin = cMoments.some(m => m.type === 'COMEBACK' || m.type === 'DROUGHT_END');
  const isTitleInj    = cMoments.some(m => m.type === 'TITLE_WHILE_INJURED');

  // Escolhe jornalista — personalidade sobrescreve lógica padrão em Slams
  const journalist = (isSlam || isClash)
    ? (_journalistForPlayer(champFull) ?? pickJournalist('LITERARY'))
    : (_journalistForPlayer(champFull) ?? pickJournalist(chance(0.4) ? 'NARRATIVE' : null));
  const j = journalist;

  // Verifica contexto narrativo
  const rivalry = finalist && rivalrySystem
    ? rivalrySystem.getRivalry?.(champ.id, finalist.id)
    : null;

  const titles = champ.careerTitles ?? {};
  const slams  = titles.gs ?? 0;
  const gsStr  = slams > 0 ? `${slams}º Grand Slam de carreira` : 'primeiro Grand Slam de carreira';

  // Constrói headline baseada no jornalista, contexto e personalidade
  let headline, deck, body;

  if (j.style === 'LITERARY') {
    if (isSlam) {
      headline = slams === 1
        ? `${champ.name} conquista o ${tournament.name} e escreve o primeiro capítulo de uma história que ainda não tem tamanho definido`
        : `${champ.name} e o ${tournament.name}: ${slams === 2 ? 'segundo' : slams === 3 ? 'terceiro' : `${slams}º`} título, profundidade diferente`;
      deck = finalist
        ? `Depois de ${score ? score + ' sobre ' : ''}${finalist.name}, o circuito para para entender o que acabou de ver.`
        : `O circuito para para entender o que acabou de ver.`;
    } else if (isClash) {
      headline = `${champ.name} sobrevive ao ${tournament.name} e conquista o Clash Slam na margem mínima`;
      deck = finalist
        ? `No formato STB10, ${champ.name} derrotou ${finalist.name}${score ? ` por ${score}` : ''} e saiu com um dos títulos mais tensos do calendário.`
        : `No formato STB10, ${champ.name} atravessou a semana mais imprevisível do piso e saiu com o título.`;
    } else {
      headline = `${champ.name} domina o ${tournament.name} do início ao fim`;
      deck = `${cat} em ${tournament.location}. Um título que confirma o que a temporada já indicava.`;
    }

    // Linha extra guiada pela personalidade (mood/careerMoment)
    // FASE 2: usa careerMomentNarrativeLine para narrativa personalizada do campeão
    const persLine = isFirstSlam
      ? `É o primeiro Grand Slam. O circuito vai perguntar por quanto tempo esse momento é entendido pelo próprio ${champ.name}.`
      : isComebackWin
      ? `Este título chega com um peso diferente dos anteriores. ${champ.name} voltou de algo — e o circuito sabe o que isso significa.`
      : isTitleInj
      ? `Ganhou lesionado. É o tipo de coisa que o circuito não esquece.`
      : cMood === 'DOMINANT' || cMood === 'AT_PEAK'
      ? `Ninguém tinha resposta. ${champ.name} sabia disso desde a primeira rodada.`
      : cNarrative && cNarrative !== '' ? cNarrative
      : careerMomentNarrativeLine(champFull, { year });

    // FASE 2: finalista também tem sua narrativa — derrota tem contexto
    const finalistFull = finalist ? allPlayers.find(p => p.id === finalist.id) ?? finalist : null;
    const finalistMomentLine = finalistFull
      ? careerMomentNarrativeLine(finalistFull, {
          includeTypes: ['FAREWELL','DROUGHT_START','COMEBACK','INJURY_TRANSFORMS','PERSONA_SHIFT'],
        })
      : '';
    body = [
      pick(j.voice.opening),
      isSlam
        ? `${champ.name} levantou o troféu em ${tournament.location} depois de uma semana que revelou um jogador em plena expansão de seu jogo. ${score ? 'A final terminou ' + score + (finalist ? ' contra ' + finalist.name : '') + '.' : ''}`
        : `${champ.name} encerrou a semana em ${tournament.location} com o troféu. ${finalist ? 'A final foi decidida contra ' + finalist.name + (score ? ' por ' + score : '') + '.' : ''}`,
      rivalry && finalist
        ? `O encontro com ${finalist.name} na final tinha peso adicional. ${rivalry.narrative || 'Os dois têm histórico que o circuito conhece bem.'}`
        : '',
      persLine,
      // FASE 2: finalista com momento narrativo próprio (derrota com contexto)
      finalistMomentLine && finalist
        ? `Na outra ponta da rede, ${finalist.name}${finalistMomentLine ? ' — ' + finalistMomentLine.replace(finalist.name, '').trim() : ' saiu com a derrota e o peso que ela traz'}.`
        : '',
      pick(j.voice.closing),
    ].filter(Boolean).join(' ');

  } else if (j.style === 'ANALYTICAL') {
    headline = `${champ.name} vence ${tournament.name}: o que os números revelam sobre este título`;
    deck = `Uma análise do desempenho de ${champ.name} em ${tournament.location} e o que ele significa para o ranking.`;
    body = [
      pick(j.voice.opening),
      `${champ.name} terminou o torneio sem perder um set nos primeiros rounds — padrão que se tornou marca registrada do jogador em ${tournament.surface === 'CLAY' ? 'saibro' : tournament.surface === 'GRASS' ? 'grama' : 'quadra dura'}.`,
      finalist ? `A vitória sobre ${finalist.name} na final (${score || 'placar não disponível'}) foi a mais complicada da semana, mas ${champ.name} nunca perdeu o controle do jogo.` : '',
      `Com este título, ${champ.name} consolida sua posição no ${rankLabel(rank)}.`,
      pick(j.voice.closing),
    ].filter(Boolean).join(' ');

  } else if (j.style === 'NARRATIVE') {
    headline = `O momento em que ${champ.name} soube que tinha chegado`;
    deck = finalist
      ? `Quando o último ponto foi marcado contra ${finalist.name}, algo no vestiário de ${tournament.location} mudou para sempre.`
      : `Quando o último ponto foi marcado, algo mudou para sempre.`;
    body = [
      pick(j.voice.opening),
      `${champ.name} não é mais só um jogador de resultado. O ${tournament.name} confirmou uma identidade — e identidades demoram para se construir e são muito difíceis de negar depois.`,
      finalist ? `${finalist.name} foi adversário até o último game. Mas havia algo no jeito de ${champ.name} jogar esta semana que tornava o resultado quase inevitável — não pela facilidade, mas pela certeza.` : '',
      pick(j.voice.closing),
    ].filter(Boolean).join(' ');

  } else {
    // GOSSIP / HYPE / OPINION
    headline = `${champ.name} campeão em ${tournament.location}${finalist ? (' depois de final épica contra ' + finalist.name) : ''}`;
    deck = `${tournament.name} ${year} já tem nome na história.`;
    body = [
      pick(j.voice.opening),
      `${champ.name} saiu de ${tournament.location} com o troféu. ${finalist ? 'A final contra ' + finalist.name + ' foi o jogo que o torneio merecia.' : ''}`,
      pick(j.voice.closing),
    ].filter(Boolean).join(' ');
  }

  return attachNarrativeImpact({
    id:          `champ-${tournament.id}-${year}`,
    type:        'CHAMPION',
    journalist,
    tournament:  { id: tournament.id, name: tournament.name, category: tournament.category, surface: tournament.surface },
    year,
    player:      champ,
    headline,
    deck,
    body,
    length:      j.verbosity,
    tags:        ['campeão', tournament.surface?.toLowerCase(), isSlam ? 'grand-slam' : isClash ? 'clash-slam' : isMasters ? 'masters' : null].filter(Boolean),
    createdAt:   Date.now(),
  }, buildChampionImpact({
    tournament,
    bracket,
    rivalry,
    winner: champ,
    loser: finalist,
    round: 'F',
    isFirstBigTitle: isSlam && slams <= 1,
    isLegacyTitle: isSlam && slams >= 3,
  }));
}

// ── ZEBRA / UPSET ────────────────────────────────────────────────

function genUpset({ tournament, match, year, round }) {
  const winner = match.winner;
  const loser  = match.playerA?.id === winner.id ? match.playerB : match.playerA;
  if (!winner || !loser) return null;

  const wRank = winner.rankPosition ?? 999;
  const lRank = loser.rankPosition ?? 999;
  if (lRank >= wRank || lRank > 15) return null; // não é upset interessante

  const rankDiff  = wRank - lRank;
  if (rankDiff < 10) return null; // diferença mínima para ser notícia

  const journalist = pickJournalist(chance(0.5) ? 'OPINION' : 'ANALYTICAL');
  const j          = journalist;
  const score      = formatScore(match.result?.setsDetail);
  const cat        = catLabel(tournament.category);
  const roundLabel = { F:'Final', SF:'Semifinal', QF:'Quartas', R16:'Oitavas', R32:'3ª Rodada' }[round] ?? round;

  const isEpicMatch = isEpic(match);

  const headline = rankDiff > 50
    ? `A zebra mais improvável da temporada: ${winner.name} (${wRank}º) elimina ${loser.name} (${lRank}º) na ${roundLabel}`
    : `Surpresa em ${tournament.location}: ${winner.name} derruba ${loser.name}${isEpicMatch ? ' num jogo que vai ser lembrado' : ''}`;

  const deck = `${cat} · ${tournament.name}. ${score ? score + '. ' : ''}O ${lRank}º do mundo foi eliminado na ${roundLabel}.`;

  const body = [
    pick(j.voice.opening),
    `${winner.name} derrotou ${loser.name}${score ? ' por ' + score : ''} e provocou o resultado mais surpreendente da semana em ${tournament.location}.`,
    isEpicMatch
      ? `Não foi um acidente. ${winner.name} produziu tênis de altíssimo nível durante toda a partida — o tipo de jogo que obriga o adversário a reconhecer que perdeu, não apenas que o outro ganhou.`
      : `${loser.name} nunca encontrou o ritmo. O placar conta uma história mais simples do que o jogo foi, mas o resultado é inegável.`,
    `Para ${winner.name}, a vitória sobre o ${rankLabel(lRank)} é o maior resultado da carreira.`,
    pick(j.voice.closing),
  ].filter(Boolean).join(' ');

  return attachNarrativeImpact({
    id:          `upset-${tournament.id}-${winner.id}-${year}`,
    type:        'UPSET',
    journalist,
    tournament:  { id: tournament.id, name: tournament.name, category: tournament.category, surface: tournament.surface },
    year,
    player:      winner,
    playerB:     loser,
    headline,
    deck,
    body,
    length:      j.verbosity,
    tags:        ['zebra', 'upset', round?.toLowerCase()].filter(Boolean),
    createdAt:   Date.now(),
  }, buildUpsetImpact({ tournament, match, round }));
}

// ── DUELO ÉPICO ──────────────────────────────────────────────────

function genEpicMatch({ tournament, match, year, round }) {
  if (!isEpic(match)) return null;

  const winner = match.winner;
  const loser  = match.playerA?.id === winner.id ? match.playerB : match.playerA;
  if (!winner || !loser) return null;

  const score     = formatScore(match.result?.setsDetail);
  const sets      = match.result?.setsDetail ?? [];
  const numSets   = sets.length;
  const journalist = pickJournalist(chance(0.6) ? 'LITERARY' : 'NARRATIVE');
  const j          = journalist;
  const roundLabel = { F:'Final', SF:'Semifinal', QF:'Quartas', R16:'Oitavas' }[round] ?? round;

  const lastSet    = sets.at(-1);
  const wasDecider = lastSet && Math.abs(lastSet[0] - lastSet[1]) <= 1;

  const headline = round === 'F'
    ? `A final que ${tournament.location} vai guardar: ${winner.name} bate ${loser.name} em ${numSets} sets após batalha épica`
    : `${winner.name} e ${loser.name} entregam o jogo da semana na ${roundLabel} de ${tournament.name}`;

  const deck = `${score}. ${numSets} sets. Um dos melhores jogos do ano.`;

  const body = [
    pick(j.voice.opening),
    `${winner.name} e ${loser.name} não decepcionaram. O que aconteceu na ${roundLabel} de ${tournament.name} foi exatamente o tipo de jogo que o circuito precisa: cada ponto custou, cada break foi contestado, cada set teve a sensação de que podia ir para qualquer lado.`,
    wasDecider
      ? `O set decisivo foi o mais tenso. ${winner.name} encontrou recursos quando os recursos pareciam esgotados — que é a definição de por que alguns jogadores chegam onde chegam.`
      : `${winner.name} manteve a cabeça nos momentos que mais importavam. Nisso, a diferença foi feita.`,
    `Resultado final: ${score}.`,
    pick(j.voice.closing),
  ].filter(Boolean).join(' ');

  return attachNarrativeImpact({
    id:          `epic-${tournament.id}-${winner.id}-${loser.id}-${year}`,
    type:        'EPIC_MATCH',
    journalist,
    tournament:  { id: tournament.id, name: tournament.name, category: tournament.category, surface: tournament.surface },
    year,
    player:      winner,
    playerB:     loser,
    headline,
    deck,
    body,
    length:      'LONG',
    tags:        ['épico', 'batalha', round?.toLowerCase(), `${numSets}-sets`].filter(Boolean),
    createdAt:   Date.now(),
  }, buildEpicMatchImpact({ tournament, match, round }));
}

// ── RIVALIDADE ───────────────────────────────────────────────────

function genRivalry({ tournament, match, year, round, rivalrySystem }) {
  if (!rivalrySystem || !match.playerA || !match.playerB) return null;

  const pA     = match.playerA;
  const pB     = match.playerB;
  const rivalry = rivalrySystem.getRivalry?.(pA.id, pB.id);
  if (!rivalry) return null;

  // Só gera se há rivalidade significativa (5+ encontros ou tipo específico)
  const totalMatches = (rivalry.p1Wins ?? 0) + (rivalry.p2Wins ?? 0);
  if (totalMatches < 4 && !['HEATED', 'GRUDGE', 'GENERATIONAL'].includes(rivalry.type)) return null;

  const winner     = match.winner;
  const loser      = pA.id === winner?.id ? pB : pA;
  const journalist = pickJournalist('LITERARY');
  const j          = journalist;
  const score      = formatScore(match.result?.setsDetail);
  const roundLabel = { F:'Final', SF:'Semifinal', QF:'Quartas' }[round] ?? round;

  const wWins = rivalry.p1Id === winner.id ? rivalry.p1Wins : rivalry.p2Wins;
  const lWins = rivalry.p1Id === winner.id ? rivalry.p2Wins : rivalry.p1Wins;

  const headline = totalMatches >= 10
    ? `Capítulo ${totalMatches + 1} da rivalidade: ${winner.name} vence ${loser.name} na ${roundLabel} de ${tournament.name}`
    : `${winner.name} × ${loser.name}: mais um encontro, mais uma história no ${tournament.name}`;

  const deck = rivalry.narrative
    ? rivalry.narrative
    : `${totalMatches + 1}º encontro entre os dois. ${wWins} a ${lWins} no head-to-head após este resultado.`;

  const body = [
    pick(j.voice.opening),
    rivalry.narrative
      ? rivalry.narrative
      : `${pA.name} e ${pB.name} se conhecem bem demais para que um confronto entre eles seja simples.`,
    `A ${roundLabel} de ${tournament.name} adicionou mais um capítulo. ${winner.name} venceu${score ? ' por ' + score : ''} e o head-to-head vai a ${wWins + 1} × ${lWins}.`,
    `Cada confronto entre esses dois pesa diferente. Não é só o ranking em jogo — é uma narrativa que os dois carregam.`,
    pick(j.voice.closing),
  ].filter(Boolean).join(' ');

  return attachNarrativeImpact({
    id:          `rivalry-${tournament.id}-${pA.id}-${pB.id}-${year}`,
    type:        'RIVALRY',
    journalist,
    tournament:  { id: tournament.id, name: tournament.name, category: tournament.category, surface: tournament.surface },
    year,
    player:      winner,
    playerB:     loser,
    rivalry:     { type: rivalry.type, totalMatches: totalMatches + 1, h2h: `${wWins + 1}-${lWins}` },
    headline,
    deck,
    body,
    length:      'LONG',
    tags:        ['rivalidade', rivalry.type?.toLowerCase(), round?.toLowerCase()].filter(Boolean),
    createdAt:   Date.now(),
  }, buildRivalryImpact({ tournament, match, rivalry, round }));
}

// ── LESÃO ────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────
// HELPER INTERNO — Grand Slams que o jogador vai perder
// ─────────────────────────────────────────────────────────────────

/**
 * Retorna os nomes dos Grand Slams que ocorrem enquanto o jogador está fora.
 * @param {number} currentWeekIndex  — weekIndex do torneio onde a lesão ocorreu
 * @param {number} slotsOut          — quantos slots o jogador ficará afastado
 * @returns {string[]}               — nomes dos Slams perdidos (máx 4)
 */
function getMissedSlams(currentWeekIndex, slotsOut) {
  if (!slotsOut || slotsOut < 2) return [];
  const slams = CALENDAR.filter(t => t.isSlam);
  const missed = [];
  for (const slam of slams) {
    const wi = slam.weekIndex;
    // Cobre a janela do próximo ciclo (até 41 slots à frente — 1 temporada)
    const normalizedWi = wi >= currentWeekIndex ? wi : wi + 41;
    if (normalizedWi > currentWeekIndex && normalizedWi <= currentWeekIndex + slotsOut) {
      missed.push(slam.name);
    }
  }
  return missed.slice(0, 4);
}

// ─────────────────────────────────────────────────────────────────
// GERAÇÃO DE ARTIGO — LESÃO INICIAL
// ─────────────────────────────────────────────────────────────────

function genInjury({ player, injury, tournament, year }) {
  if (!player || !injury) return null;

  const isSurgery  = injury.grade === 4 || injury.requiresSurgery === true;
  const isGrade3   = injury.grade === 3 && !isSurgery;
  const isSerious  = injury.grade >= 2;

  // Jornalista: cirurgia/grave → narrativo ou literário; leve → gossip ou opinião
  const journalistStyle = isSurgery || isGrade3
    ? (chance(0.5) ? 'NARRATIVE' : 'LITERARY')
    : (chance(0.5) ? 'NARRATIVE' : 'GOSSIP');
  const journalist = pickJournalist(journalistStyle);
  const j          = journalist;

  const TYPE_NAMES = {
    KNEE:'joelho', ANKLE:'tornozelo', BACK:'lombar', SHOULDER:'ombro',
    WRIST:'pulso', ELBOW:'cotovelo', HIP:'quadril', HAMSTRING:'posterior da coxa',
    ABDOMINAL:'abdominal',
  };
  const typeName = injury.type
    ? (injury.grade >= 6
      ? getInjuryDisplayName(injury).toLowerCase()
      : (TYPE_NAMES[injury.type] ?? injury.type.toLowerCase()))
    : 'região não divulgada';

  // ── Slams perdidos ───────────────────────────────────────────
  const currentWeekIndex = tournament?.weekIndex ?? 0;
  const slotsOut         = injury.slotsRemaining ?? 0;
  const missedSlams      = getMissedSlams(currentWeekIndex, slotsOut);
  const missedSlamStr    = missedSlams.length
    ? `${missedSlams.join(', ')}`
    : null;

  // ── Recidiva / crônico ───────────────────────────────────────
  const { isChronic, repeatCount, chronicLabel } = getRecidiveInfo(player, injury.type);

  // ── Artigo de CIRURGIA (grau 4) ──────────────────────────────
  if (isSurgery) {
    const monthsOut = Math.round(slotsOut / 3.5 * 10) / 10; // ~3.5 slots/mês
    const returnEstimate = slotsOut >= 24
      ? 'retorno estimado para a próxima temporada'
      : slotsOut >= 14
      ? `retorno estimado em ${Math.round(monthsOut)} meses`
      : `retorno previsto para as últimas semanas da temporada`;

    const headline = chronicLabel
      ? `${player.name} vai à cirurgia — ${chronicLabel}. ${returnEstimate}`
      : `${player.name} confirmado para cirurgia no ${typeName}. ${returnEstimate}`;

    const deck = missedSlamStr
      ? `${slotsOut} torneios fora. ${missedSlamStr} já estão riscados do calendário.`
      : `${slotsOut} torneios de afastamento. O corpo forçou a mão.`;

    const bodyParts = [
      pick(j.voice.opening),
      `A notícia que o circuito temia chegou: ${player.name} vai à cirurgia. A lesão no ${typeName} — confirmada após exames — não deixou alternativa.`,
      chronicLabel
        ? `Não é a primeira vez. O histórico de ${player.name} com o ${typeName} já era conhecido. Desta vez, o corpo enviou um ultimato.`
        : `A pressão acumulada de torneios consecutivos cobrou o seu preço. O circuito vai sentir a ausência.`,
      missedSlamStr
        ? `No calendário, os números doem: ${missedSlamStr} estão fora de alcance. ${returnEstimate.charAt(0).toUpperCase() + returnEstimate.slice(1)}.`
        : `A temporada foi interrompida de forma definitiva. ${returnEstimate.charAt(0).toUpperCase() + returnEstimate.slice(1)}.`,
      pick(j.voice.closing),
    ].filter(Boolean).join(' ');

    return {
      id:             `injury-surgery-${player.id}-${tournament?.id ?? 'year'}-${year}`,
      type:           'INJURY_SURGERY',
      journalist,
      tournament:     tournament ? { id: tournament.id, name: tournament.name, category: tournament.category } : null,
      year,
      player,
      injury:         { type: injury.type, grade: injury.grade, typeName, requiresSurgery: true, slotsOut, missedSlams },
      headline,
      deck,
      body:           bodyParts,
      length:         'LONG',
      tags:           ['cirurgia', 'lesão', typeName, `grau-4`].filter(Boolean),
      createdAt:      Date.now(),
    };
  }

  // ── Artigo grau 3 (grave, sem cirurgia) ─────────────────────
  if (isGrade3) {
    const headline = chronicLabel
      ? `${player.name} fora por até ${slotsOut} torneios — ${chronicLabel}`
      : missedSlamStr
      ? `${player.name} se retira e vai perder ${missedSlamStr}. Lesão no ${typeName} confirmada`
      : `${player.name} se retira de ${tournament?.name ?? 'torneio'} e pode ficar meses fora. Lesão confirmada no ${typeName}`;

    const deck = missedSlamStr
      ? `${missedSlamStr} já estão fora do horizonte. O calendário não espera.`
      : `Lesão grau 3. O corpo enviou um recado que não pode ser ignorado.`;

    const bodyParts = [
      pick(j.voice.opening),
      `${player.name} confirmou o que alguns já suspeitavam. A lesão no ${typeName} — classificada como grau ${injury.grade} — passou a ser parte do ambiente desta semana.`,
      chronicLabel
        ? `O histórico é um fator. Esse ${typeName} de ${player.name} já foi motivo de preocupação antes. ${repeatCount >= 3 ? 'Terceira ocorrência. O circuito não consegue mais fingir surpresa.' : 'Segunda vez. O risco de sequelas a longo prazo começa a entrar na conversa.'}`
        : `A decisão de abandonar era inevitável. O circuito entende. O corpo tem o seu próprio cronograma, e ele não respeita calendários de torneios.`,
      missedSlamStr
        ? `O que dói além do físico: ${missedSlamStr}. Torneios que não voltam, oportunidades que o ranking não vai registrar.`
        : `O calendário dos próximos meses vai ter que ser refeito. Quando ${player.name} volta, é uma questão que o circuito ainda não sabe responder.`,
      pick(j.voice.closing),
    ].filter(Boolean).join(' ');

    return {
      id:          `injury-${player.id}-${tournament?.id ?? 'year'}-${year}`,
      type:        'INJURY',
      journalist,
      tournament:  tournament ? { id: tournament.id, name: tournament.name, category: tournament.category } : null,
      year,
      player,
      injury:      { type: injury.type, grade: injury.grade, typeName, slotsOut, missedSlams },
      headline,
      deck,
      body:        bodyParts,
      length:      'LONG',
      tags:        ['lesão', typeName, `grau-${injury.grade}`, ...(chronicLabel ? ['recidiva'] : [])].filter(Boolean),
      createdAt:   Date.now(),
    };
  }

  // ── Artigo grau 2 (moderado) ─────────────────────────────────
  if (isSerious) {
    const headline = chronicLabel
      ? `${player.name} para — ${chronicLabel}. Afastamento de ${slotsOut} torneio(s)`
      : `${player.name} completa o torneio mas confirma lesão no ${typeName}. Calendário da sequência em dúvida`;

    const deck = `Grau ${injury.grade}. O atleta segue, mas o sinal de alerta está ligado.`;

    const bodyParts = [
      pick(j.voice.opening),
      `${player.name} confirmou o que alguns já suspeitavam. A lesão no ${typeName} — classificada como grau ${injury.grade} — passou a ser parte do ambiente desta semana.`,
      chronicLabel
        ? `Não é novidade para quem acompanha: ${chronicLabel}. O risco de se tornar um problema estrutural é real.`
        : `Jogar com dor diz algo sobre a mentalidade do atleta. Mas o circuito vai acompanhar de perto os próximos passos.`,
      pick(j.voice.closing),
    ].filter(Boolean).join(' ');

    return {
      id:          `injury-${player.id}-${tournament?.id ?? 'year'}-${year}`,
      type:        'INJURY',
      journalist,
      tournament:  tournament ? { id: tournament.id, name: tournament.name, category: tournament.category } : null,
      year,
      player,
      injury:      { type: injury.type, grade: injury.grade, typeName, slotsOut, missedSlams },
      headline,
      deck,
      body:        bodyParts,
      length:      'SHORT',
      tags:        ['lesão', typeName, `grau-${injury.grade}`, ...(chronicLabel ? ['recidiva'] : [])].filter(Boolean),
      createdAt:   Date.now(),
    };
  }

  // ── Artigo grau 1 (leve) ─────────────────────────────────────
  const headline = chronicLabel
    ? `${player.name} joga machucado: ${chronicLabel} ressurge no ${tournament?.name ?? 'circuito'}`
    : `${player.name} joga machucado: dores no ${typeName} acompanham o circuito nesta semana`;

  const deck = `Grau 1. O atleta segue, mas o sinal de alerta está ligado.`;

  const bodyParts = [
    pick(j.voice.opening),
    `${player.name} confirmou o que alguns já suspeitavam. A lesão no ${typeName} — classificada como grau ${injury.grade} — passou a ser parte do ambiente desta semana.`,
    chronicLabel
      ? `${chronicLabel.charAt(0).toUpperCase() + chronicLabel.slice(1)}. O circuito vai observar com atenção o quanto essa limitação vai pesar.`
      : `Por ora, ${player.name} mantém o compromisso com a temporada. Quanto tempo isso vai durar com as dores presentes é a questão.`,
    pick(j.voice.closing),
  ].filter(Boolean).join(' ');

  return {
    id:          `injury-${player.id}-${tournament?.id ?? 'year'}-${year}`,
    type:        'INJURY',
    journalist,
    tournament:  tournament ? { id: tournament.id, name: tournament.name, category: tournament.category } : null,
    year,
    player,
    injury:      { type: injury.type, grade: injury.grade, typeName },
    headline,
    deck,
    body:        bodyParts,
    length:      'SHORT',
    tags:        ['lesão', typeName, `grau-${injury.grade}`, ...(chronicLabel ? ['recidiva'] : [])].filter(Boolean),
    createdAt:   Date.now(),
  };
}

// ─────────────────────────────────────────────────────────────────
// GERAÇÃO DE ARTIGO — ACOMPANHAMENTO DE LESÃO
// ─────────────────────────────────────────────────────────────────

/**
 * Gera artigo de follow-up para jogadores com lesão ativa (slotsRemaining > 0).
 * Distingue três fases narrativas:
 *   EARLY  — primeiros 3 slots: confirmação da extensão, o que vai perder
 *   MID    — slots intermediários: o circuito sem ele, o jogador no silêncio
 *   LATE   — último slot antes do retorno: "voltou ao treino", expectativa
 */
function genInjuryFollowUp({ player, injury, tournament, year }) {
  if (!player || !injury) return null;
  if (!injury.slotsRemaining || injury.slotsRemaining <= 0) return null;

  const isSurgery = injury.grade === 4 || injury.requiresSurgery === true;
  const journalist = isSurgery
    ? (chance(0.6) ? JOURNALISTS.SANTOS : JOURNALISTS.CARVALHO)
    : pickJournalist(chance(0.5) ? 'NARRATIVE' : 'GOSSIP');
  const j = journalist;

  const TYPE_NAMES = {
    KNEE:'joelho', ANKLE:'tornozelo', BACK:'lombar', SHOULDER:'ombro',
    WRIST:'pulso', ELBOW:'cotovelo', HIP:'quadril', HAMSTRING:'posterior da coxa',
    ABDOMINAL:'abdominal',
  };
  const typeName = injury.type
    ? (injury.grade >= 6
      ? getInjuryDisplayName(injury).toLowerCase()
      : (TYPE_NAMES[injury.type] ?? injury.type.toLowerCase()))
    : 'região não divulgada';

  const slots         = injury.slotsRemaining;
  const totalSlots    = injury.grade === 4 ? 22 : INJURY_GRADES[injury.grade]?.slotsMax ?? slots; // estimativa
  const elapsed       = Math.max(0, totalSlots - slots);
  const missedSlams   = getMissedSlams(tournament?.weekIndex ?? 0, slots);
  const missedSlamStr = missedSlams.length ? missedSlams.join(', ') : null;
  const { chronicLabel } = getRecidiveInfo(player, injury.type);

  // Determina fase narrativa
  let phase;
  if      (slots === 1)              phase = 'LATE';
  else if (elapsed <= 2)             phase = 'EARLY';
  else                               phase = 'MID';

  // ── Fase LATE — véspera do retorno ───────────────────────────
  if (phase === 'LATE') {
    const headline = isSurgery
      ? `${player.name} volta ao treino. Retorno ao circuito na próxima semana após cirurgia`
      : `${player.name} confirmado para o próximo torneio. O retorno está perto`;

    const deck = `O circuito esperou. ${player.name} está de volta.`;

    const body = [
      pick(j.voice.opening),
      `Depois de semanas afastado, ${player.name} confirmou retorno aos treinos. A lesão no ${typeName} ficou para trás — ao menos é o que se espera.`,
      isSurgery
        ? `A cirurgia correu bem, segundo a equipe. O trabalho de reabilitação foi longo. O que ninguém sabe ainda é o jogador que vai aparecer na quadra.`
        : `O calendário perdeu um protagonista por tempo demais. A próxima semana vai mostrar em que condições ${player.name} chega de volta.`,
      chronicLabel
        ? `O ${typeName} voltou a ser tema. Não vai deixar de ser tão cedo.`
        : '',
      pick(j.voice.closing),
    ].filter(Boolean).join(' ');

    return {
      id:        `injury-followup-return-${player.id}-${tournament?.id ?? year}`,
      type:      'INJURY_FOLLOWUP',
      subtype:   'RETURN_IMMINENT',
      journalist,
      tournament: tournament ? { id: tournament.id, name: tournament.name, category: tournament.category } : null,
      year,
      player,
      injury:    { type: injury.type, grade: injury.grade, typeName, slotsRemaining: slots, phase: 'LATE' },
      headline,
      deck,
      body,
      length:    'SHORT',
      tags:      ['retorno', 'lesão', typeName].filter(Boolean),
      createdAt: Date.now(),
    };
  }

  // ── Fase EARLY — confirmação da extensão ─────────────────────
  if (phase === 'EARLY') {
    const headline = isSurgery
      ? `Cirurgia de ${player.name} confirmada: ${slots} torneio(s) fora${missedSlamStr ? ` — e sem ${missedSlamStr}` : ''}`
      : missedSlamStr
      ? `${player.name} não vai estar em ${missedSlamStr}. O corpo decidiu por ele`
      : `${player.name} confirma afastamento de ${slots} torneio(s) por lesão no ${typeName}`;

    const deck = isSurgery
      ? `O procedimento está marcado. O calendário, refeito.`
      : `O circuito vai seguir. ${player.name}, não.`;

    const body = [
      pick(j.voice.opening),
      `A extensão do afastamento de ${player.name} ficou definida: ${slots} torneio(s) fora. A lesão no ${typeName} foi mais séria do que o otimismo inicial sugeria.`,
      missedSlamStr
        ? `No calendário, o que chama atenção: ${missedSlamStr}. Torneios que o circuito vai disputar sem um dos seus personagens principais.`
        : '',
      isSurgery
        ? `A cirurgia representa um reset. Quando ${player.name} voltar, vai ser diferente — a questão é como diferente.`
        : `O plano de reabilitação começa agora. O que o circuito perde durante esse tempo é mais fácil de quantificar do que o que ${player.name} vai enfrentar sozinho.`,
      pick(j.voice.closing),
    ].filter(Boolean).join(' ');

    return {
      id:        `injury-followup-early-${player.id}-${tournament?.id ?? year}`,
      type:      'INJURY_FOLLOWUP',
      subtype:   isSurgery ? 'SURGERY_CONFIRMED' : 'ABSENCE_CONFIRMED',
      journalist,
      tournament: tournament ? { id: tournament.id, name: tournament.name, category: tournament.category } : null,
      year,
      player,
      injury:    { type: injury.type, grade: injury.grade, typeName, slotsRemaining: slots, missedSlams, phase: 'EARLY' },
      headline,
      deck,
      body,
      length:    isSurgery ? 'LONG' : 'MEDIUM',
      tags:      [isSurgery ? 'cirurgia' : 'lesão', typeName, 'ausência', ...(missedSlamStr ? ['grand-slam'] : [])].filter(Boolean),
      createdAt: Date.now(),
    };
  }

  // ── Fase MID — o circuito sem ele ────────────────────────────
  const headline = chronicLabel
    ? `Onde está ${player.name}? ${chronicLabel} — semanas de silêncio`
    : `${player.name} ainda fora. Reabilitação avança, retorno sem data confirmada`;

  const deck = `${slots} torneio(s) ainda pela frente. O circuito continua. Ele, não.`;

  const body = [
    pick(j.voice.opening),
    `${player.name} acompanhou os últimos torneios de fora. A reabilitação do ${typeName} avança no ritmo do corpo — que insiste em ter o seu próprio cronograma.`,
    isSurgery
      ? `Pós-cirurgia, o processo é lento por definição. Cada semana é uma semana necessária.`
      : `Não há atalho para esse tipo de recuperação. O círculo próximo ao jogador descreve paciência forçada e foco no processo.`,
    `O circuito não parou de girar. A questão, quando ${player.name} voltar, é se ele chega no mesmo nível ou com um interrogante a mais.`,
    pick(j.voice.closing),
  ].filter(Boolean).join(' ');

  return {
    id:        `injury-followup-mid-${player.id}-${tournament?.id ?? year}-${slots}`,
    type:      'INJURY_FOLLOWUP',
    subtype:   'REHAB_UPDATE',
    journalist,
    tournament: tournament ? { id: tournament.id, name: tournament.name, category: tournament.category } : null,
    year,
    player,
    injury:    { type: injury.type, grade: injury.grade, typeName, slotsRemaining: slots, phase: 'MID' },
    headline,
    deck,
    body,
    length:    'SHORT',
    tags:      ['reabilitação', 'lesão', typeName].filter(Boolean),
    createdAt: Date.now(),
  };
}

// ── PROSPECT ─────────────────────────────────────────────────────

function genProspect({ player, tournament, year, milestone }) {
  const journalist = pickJournalist('HYPE');
  const j          = journalist;
  const age        = player.age ?? (year - (player.birthYear ?? year - 20));
  const rank       = player.rankPosition ?? '?';

  const headline = milestone === 'first_title'
    ? `${player.name}, ${age} anos, vence seu primeiro título no circuito profissional em ${tournament.name}`
    : milestone === 'top20'
    ? `${player.name} entra no top 20 pela primeira vez. Com ${age} anos, o circuito presta atenção`
    : `${player.name} faz a semana que o circuito precisava para acreditar nele`;

  const deck = `${age} anos. ${rankLabel(rank)}. O futuro não costuma anunciar a data em que chega — mas às vezes dá sinais.`;

  const body = [
    pick(j.voice.opening),
    `${player.name} não pediu licença para aparecer. Com ${age} anos e um tênis que já tem identidade própria, a semana em ${tournament.location} foi o tipo de afirmação que convence quem ainda tinha dúvida.`,
    `O jogo tem uma serenidade que jogadores jovens raramente apresentam. ${player.name} parece não jogar com ansiedade de provar algo — apenas com a certeza de que sabe jogar tênis.`,
    `O circuito foi avisado.`,
    pick(j.voice.closing),
  ].filter(Boolean).join(' ');

  return {
    id:          `prospect-${player.id}-${tournament.id}-${year}`,
    type:        'PROSPECT',
    journalist,
    tournament:  { id: tournament.id, name: tournament.name, category: tournament.category, surface: tournament.surface },
    year,
    player,
    headline,
    deck,
    body,
    length:      'MEDIUM',
    tags:        ['prospect', 'revelação', `${age}-anos`],
    createdAt:   Date.now(),
  };
}

// ── APOSENTADORIA ────────────────────────────────────────────────

function genRetirement({ player, retirementType, year }) {
  const journalist = pickJournalist('LITERARY');
  const j          = journalist;
  const titles     = player.careerTitles ?? {};
  const slams      = titles.gs ?? 0;
  const masters    = titles.masters ?? 0;
  const peakRank   = player.peakRank ?? player.rankPosition ?? '?';

  const typeMsg = {
    FORCADA_LESAO:    'O corpo não permitiu mais.',
    VOLUNTARIA_PICO:  'Escolheu sair enquanto ainda era grande.',
    BURNOUT:          'O desgaste cobrou sua conta.',
    DESGASTE_NATURAL: 'O tempo sempre vence no final.',
    FORCADA_RANKING:  'O ranking virou obstáculo intransponível.',
  }[retirementType] ?? '';

  const headline = slams > 0
    ? `${player.name} anuncia aposentadoria. ${slams} Grand Slam${slams > 1 ? 's' : ''}, pico de #${peakRank} — uma carreira que o circuito vai processar por anos`
    : `${player.name} encerra a carreira. O circuito perde um personagem que nunca foi fácil de substituir`;

  const deck = typeMsg;

  const body = [
    pick(j.voice.opening),
    `${player.name} anunciou o fim. ${typeMsg} O circuito já sabia que o momento chegaria — sempre chega — mas saber não torna mais simples.`,
    slams > 0
      ? `${slams} Grand Slam${slams > 1 ? 's' : ''}. ${masters} Masters. Pico de #${peakRank}. Os números existem. O que eles não capturam é o que foi assistir a ${player.name} jogar.`
      : `${masters} título${masters !== 1 ? 's' : ''} de Masters. Pico de #${peakRank}. Não foi a carreira que alguns esperavam — mas foi a carreira que ${player.name} construiu, e isso tem valor próprio.`,
    pick(j.voice.closing),
  ].filter(Boolean).join(' ');

  return {
    id:          `retirement-${player.id}-${year}`,
    type:        'RETIREMENT',
    journalist,
    tournament:  null,
    year,
    player,
    headline,
    deck,
    body,
    length:      'LONG',
    tags:        ['aposentadoria', retirementType?.toLowerCase()].filter(Boolean),
    createdAt:   Date.now(),
  };
}

// ── RUMOR ────────────────────────────────────────────────────────

// ── APOSENTADORIA DE TÉCNICO ────────────────────────────────────
/**
 * Gera notícia de aposentadoria de um coach.
 * @param {object} coach          - coach que se aposentou
 * @param {object|null} lastPupil - último pupilo (pode ser null)
 * @param {string} retirementType - tipo: 'LENDA_QUE_SAI'|'VETERANO_CANSADO'|'BURNOUT'|'NATURAL'|'JOVEM_PRECOCE'
 * @param {number} year
 * @returns {object} newsItem
 */
export function genCoachRetirement({ coach, lastPupil, retirementType, year }) {
  const journalist = pickJournalist('LITERARY');
  const j          = journalist;

  const name     = coach.name ?? 'O técnico';
  const age      = coach.age ?? '?';
  const persona  = coach.persona ?? 'VETERANO_SECO';
  const rep      = coach.reputation ?? 50;
  const slams    = coach.careerSlams ?? 0;    // como ex-jogador
  const pupilRef = lastPupil ? lastPupil.name : null;

  // Tagline de despedida baseada na persona
  const personaFarewell = {
    GENERAL:          'Disciplina até o fim.',
    MENTOR_PATERNAL:  'Sempre acreditou mais do que o próprio pupilo.',
    ANALITICO_FRIO:   'Os dados foram analisados. A equação encerrada.',
    MOTIVADOR_PURO:   'A energia que trouxe ao circuito não desaparece — apenas muda de endereço.',
    MISTICO:          'O caminho chegou ao seu ponto natural. Outro começa.',
    AMIGO_CUMPLICE:   'Parceiro até o final.',
    INOVADOR_TECNICO: 'Deixa um legado técnico que o circuito ainda vai absorver.',
    VETERANO_SECO:    'Disse tudo que tinha a dizer. Dentro de quadra.',
  }[persona] ?? 'O circuito não esquece facilmente.';

  // Headline por tipo de aposentadoria
  const headlines = {
    LENDA_QUE_SAI:    `${name} anuncia retirada do banco técnico. ${age} anos, uma carreira que moldou gerações`,
    VETERANO_CANSADO: `${name} se despede do circuito após décadas dedicadas ao tênis`,
    BURNOUT:          `${name} abandona a função por desgaste. O circuito perde um técnico que deu tudo que tinha`,
    NATURAL:          `${name} encerra carreira como técnico. ${age} anos — chegou a hora`,
    JOVEM_PRECOCE:    `Surpresa: ${name} se aposenta precocemente. O que aconteceu com um dos técnicos mais promissores?`,
  };

  const headline = headlines[retirementType] ?? `${name} deixa o banco técnico`;

  const deck = personaFarewell;

  const pupilLine = pupilRef
    ? `Seu último trabalho foi ao lado de ${pupilRef}. Uma parceria que o circuito vai lembrar.`
    : `Encerrou sem pupilo — solitário como sempre preferiu.`;

  const legacyLine = rep >= 80
    ? `${name} foi referência. Técnicos que passaram por sua escola carregam a marca.`
    : slams > 0
    ? `Campeão de ${slams} Grand Slam${slams > 1 ? 's' : ''} como jogador, foi ainda mais valioso no banco técnico.`
    : `Não veio de uma carreira lendária. Construiu uma mesmo assim.`;

  const body = [
    pick(j.voice.opening),
    `${name} não vai mais estar no banco. Com ${age} anos, encerrou uma carreira como técnico que poucas pessoas constroem com essa consistência.`,
    pupilLine,
    legacyLine,
    personaFarewell,
    pick(j.voice.closing),
  ].filter(Boolean).join(' ');

  return {
    id:          `coach-retirement-${coach.id}-${year}`,
    type:        'RETIREMENT',
    journalist,
    tournament:  null,
    year,
    coach:       { id: coach.id, name: coach.name, age, persona, reputation: rep },
    player:      lastPupil ?? null,
    headline,
    deck,
    body,
    length:      'MEDIUM',
    tags:        ['aposentadoria', 'tecnico', retirementType?.toLowerCase()].filter(Boolean),
    isCoachRetirement: true,
    createdAt:   Date.now(),
  };
}

function genRumor({ player, tournament, year, topic }) {
  const journalist = pickJournalist('GOSSIP');
  const j          = journalist;

  // ── Personalidade guia a escolha de tópico se não foi especificado ──
  if (!topic && player.personality?.currentState) {
    const mood      = player.personality.currentState.mood;
    const bondScore = player.coach?.bondScore ?? null;
    if (bondScore != null && bondScore < 25)           topic = 'TREINADOR_TROCA';
    else if (['VULNERABLE','CRISIS'].includes(mood))   topic = 'LESAO_ESCONDIDA';
    else if (['ISOLATED','BURNED_OUT'].includes(mood)) topic = 'CALENDARIO_MUDANCA';
    else if (mood === 'OBSESSED')                      topic = 'RIVAL_STATEMENT';
    else if (mood === 'REBUILDING')                    topic = 'TREINADOR_TROCA';
  }

  const rumors = {
    TREINADOR_TROCA: {
      headline: `Bastidores: ${player.name} estaria insatisfeito com a comissão técnica atual`,
      deck:     `Fontes próximas ao jogador falam em mudança de equipe para a próxima temporada.`,
      body:     `${pick(j.voice.opening)} Segundo fontes que pedem anonimato, ${player.name} avalia mudanças na equipe técnica antes da próxima temporada. O jogador não comentou publicamente. A assessoria não respondeu. ${pick(j.voice.closing)}`,
    },
    LESAO_ESCONDIDA: {
      headline: `${player.name} jogando com dor? Movimentos chamativos levantam questionamentos`,
      deck:     `Especialistas notaram padrão de movimento diferente do habitual durante o torneio.`,
      body:     `${pick(j.voice.opening)} Quem assistiu de perto notou. ${player.name} saiu de ${tournament?.name ?? 'quadra'} sem a fluidez habitual. Assessoria nega qualquer problema físico. Mas o corpo raramente mente. ${pick(j.voice.closing)}`,
    },
    CALENDARIO_MUDANCA: {
      headline: `${player.name} pode reduzir calendário na próxima temporada, segundo fontes`,
      deck:     `Atleta estaria priorizando seleção de torneios em detrimento de volume.`,
      body:     `${pick(j.voice.opening)} A informação circula nos bastidores: ${player.name} e sua equipe estariam revisando o calendário. Menos torneios, mais qualidade de preparação. Nada confirmado. Mas a tendência é real. ${pick(j.voice.closing)}`,
    },
    RIVAL_STATEMENT: {
      headline: `"Não é só tênis" — declaração de ${player.name} acende debate nos bastidores`,
      deck:     `Fontes dizem que a obsessão com um adversário específico já afeta decisões de calendário.`,
      body:     `${pick(j.voice.opening)} ${player.name} não precisa citar o nome. Quem acompanha sabe. Há um adversário que mora nas decisões de calendário, nos comentários em entrevista, na postura em quadra. ${pick(j.voice.closing)}`,
    },
  };

  const chosen = rumors[topic] ?? rumors.LESAO_ESCONDIDA;

  return {
    id:          `rumor-${player.id}-${topic}-${year}`,
    type:        'RUMOR',
    journalist,
    tournament:  tournament ? { id: tournament.id, name: tournament.name } : null,
    year,
    player,
    headline:    chosen.headline,
    deck:        chosen.deck,
    body:        chosen.body,
    length:      'SHORT',
    tags:        ['rumor', topic?.toLowerCase()].filter(Boolean),
    isRumor:     true,
    createdAt:   Date.now(),
  };
}

// ── COLUNA DE ANÁLISE ────────────────────────────────────────────

function genAnalysis({ tournament, bracket, year, allPlayers }) {
  const journalist = chance(0.6) ? JOURNALISTS.PETROV : JOURNALISTS.REED;
  const j          = journalist;
  const champ      = bracket.champion;
  const cat        = catLabel(tournament.category);

  const headline = journalist.style === 'ANALYTICAL'
    ? `${tournament.name} ${year}: o que as estatísticas do torneio revelam sobre o estado atual do circuito`
    : `${tournament.name} nos diz algo sobre o tênis que o circuito preferiria não ouvir`;

  const deck = `Uma análise do que aconteceu em ${tournament.location} — além dos resultados.`;

  const body = [
    pick(j.voice.opening),
    journalist.style === 'ANALYTICAL'
      ? `O ${cat} de ${tournament.location} produziu dados interessantes. O número de sets decididos por tiebreak ficou acima da média histórica — sinal de paridade competitiva ou de candidatos ao título sub-entregando?`
      : `O problema do ${tournament.name} este ano não foi o campeão${champ ? (' — ' + champ.name + ' merecia') : ''}. Foi o que não aconteceu: confrontos que deveriam ter sido finais terminaram antes da hora por razões que o ranking não captura.`,
    journalist.style === 'ANALYTICAL'
      ? `${champ ? champ.name + ' venceu com consistência que os números confirmam.' : 'O campeão produziu tênis de alto nível ao longo da semana.'} Em ${tournament.surface === 'CLAY' ? 'saibro' : tournament.surface === 'GRASS' ? 'grama' : 'quadra dura'}, isso não é trivial.`
      : `O circuito continua produzindo resultados que cabem na narrativa esperada. Mas o que não cabe é igualmente importante.`,
    pick(j.voice.closing),
  ].filter(Boolean).join(' ');

  return attachNarrativeImpact({
    id:          `analysis-${tournament.id}-${year}`,
    type:        'ANALYSIS',
    journalist,
    tournament:  { id: tournament.id, name: tournament.name, category: tournament.category, surface: tournament.surface },
    year,
    player:      champ,
    headline,
    deck,
    body,
    length:      'MEDIUM',
    tags:        ['análise', tournament.surface?.toLowerCase(), tournament.category?.toLowerCase()].filter(Boolean),
    createdAt:   Date.now(),
  }, buildTournamentTrendImpact({ tournament, champion: champ, strongestSignal: null }));
}

// ═══════════════════════════════════════════════════════════════════
// ORQUESTRADOR PRINCIPAL
// ═══════════════════════════════════════════════════════════════════

/**
 * Gera artigos após um torneio ser simulado.
 *
 * @param {object} tournament  — objeto de torneio do CALENDAR
 * @param {object} bracket     — resultado do torneio (rounds, champion, etc.)
 * @param {object} state       — state completo do UniverseManager
 * @returns {Article[]}        — array de artigos gerados
 */
// ── BALANÇO DO TORNEIO ────────────────────────────────────────────
/**
 * Gera o artigo de balanço final do torneio: média de heat de todos
 * os jogos e lista de jogadores que saíram lesionados com o tempo
 * de afastamento previsto.
 *
 * @param {object} opts
 * @param {object} opts.tournament
 * @param {object} opts.bracket         — bracket completo com rounds
 * @param {number} opts.year
 * @param {object} opts.updatedByInjury — mapa playerId → playerObj pós-torneio
 * @param {Set}    opts.injuryWithdrawals — ids que se retiraram
 * @param {Array}  opts.allPlayers       — todos os jogadores do estado
 */
export function genTournamentWrap({ tournament, bracket, year, updatedByInjury = {}, injuryWithdrawals = new Set(), allPlayers = [], nextTournament = null, tournamentChapter = null }) {
  const rounds = bracket.rounds ?? [];
  const cat    = catLabel(tournament.category);

  // ── 1. Média de Heat ────────────────────────────────────────────
  const heatScores = [];
  for (const round of rounds) {
    for (const match of round) {
      if (match.isBye || !match.result) continue;
      const h = match.result.heat;
      if (h && typeof h.score === 'number') heatScores.push(h.score);
      else if (h && typeof h.peak === 'number') heatScores.push(h.peak);
    }
  }
  const avgHeat   = heatScores.length > 0
    ? Math.round(heatScores.reduce((a, b) => a + b, 0) / heatScores.length)
    : null;
  const peakHeat  = heatScores.length > 0 ? Math.round(Math.max(...heatScores)) : null;
  const totalGames = heatScores.length;

  // Tier textual para a média
  function heatTierText(n) {
    if (n == null) return 'sem dados';
    if (n >= 94) return 'ÉPICO';
    if (n >= 85) return 'CLÁSSICO';
    if (n >= 75) return 'EM CHAMAS';
    if (n >= 62) return 'QUENTE';
    if (n >= 48) return 'AQUECIDO';
    if (n >= 35) return 'NEUTRO';
    return 'MORNO';
  }

  // Frase editorial baseada no heat médio
  function heatVerdict(n) {
    if (n == null) return 'A qualidade geral das partidas não pôde ser aferida.';
    if (n >= 85) return `Com média de ${n} pontos de calor, o torneio entra na memória do circuito. Poucas semanas geram números assim.`;
    if (n >= 75) return `Média de ${n} pontos de calor — um torneio acima da curva, com partidas que valeu a pena acompanhar.`;
    if (n >= 62) return `O nível médio ficou em ${n} pontos de calor. Bom torneio, com momentos de tensão real.`;
    if (n >= 48) return `Média de ${n} pontos. Um torneio equilibrado, mas sem grandes picos de emoção coletiva.`;
    if (n >= 35) return `Com média de ${n} pontos, foi uma semana técnica porém sem grandes dramas. O circuito viu tênis sólido, não espetacular.`;
    return `Média de ${n} pontos. A maioria das partidas transcorreu sem grandes emoções — semana de trabalho, não de teatro.`;
  }

  // ── 2. Lesionados: pós-torneio (updatedByInjury) + withdrawals ──
  const injuredList = [];

  // Jogadores que sofreram lesão durante o torneio (têm injury com slotsRemaining > 0)
  for (const [pid, playerData] of Object.entries(updatedByInjury)) {
    const inj = playerData?.injury;
    if (!inj) continue;
    if (inj.grade < 1) continue;
    const injDef  = INJURY_TYPES[inj.type] ?? { label: inj.type };
    const gradeDef = INJURY_GRADES[inj.grade] ?? { label: '?' };
    const slots    = inj.slotsRemaining ?? 0;
    const playerObj = allPlayers.find(p => p.id === pid) ?? playerData;
    injuredList.push({
      name:       playerObj.name ?? pid,
      rank:       playerObj.rankPosition ?? null,
      injLabel:   injDef.label,
      grade:      gradeDef.label,
      gradeNum:   inj.grade,
      slots,
      withdrew:   injuryWithdrawals.has(pid),
      playing:    slots === 0 && inj.grade === 1,
    });
  }

  // Retiradas por lesão que talvez não estejam em updatedByInjury
  for (const pid of injuryWithdrawals) {
    if (injuredList.find(x => x.name && allPlayers.find(p => p.id === pid)?.name === x.name)) continue;
    const p = allPlayers.find(pl => pl.id === pid);
    if (!p) continue;
    const inj = p.injury;
    if (!inj) continue;
    const injDef   = INJURY_TYPES[inj.type] ?? { label: inj.type ?? 'Lesão' };
    const gradeDef = INJURY_GRADES[inj.grade] ?? { label: '?' };
    injuredList.push({
      name:     p.name ?? pid,
      rank:     p.rankPosition ?? null,
      injLabel: injDef.label,
      grade:    gradeDef.label,
      gradeNum: inj.grade ?? 1,
      slots:    inj.slotsRemaining ?? 0,
      withdrew: true,
      playing:  false,
    });
  }

  // Ordena: mais graves primeiro, depois por ranking
  injuredList.sort((a, b) => {
    if (b.gradeNum !== a.gradeNum) return b.gradeNum - a.gradeNum;
    return (a.rank ?? 999) - (b.rank ?? 999);
  });

  // ── 3. Monta texto de afastamento ──────────────────────────────
  function afastamentoText(entry) {
    if (entry.playing)  return 'jogando com restrições';
    if (entry.slots === 0) return 'retornando — debuff leve';
    if (entry.slots === 1) return 'fora do próximo torneio';
    return `fora por ${entry.slots} torneio(s)`;
  }

  // ── 4. Monta corpo do artigo ────────────────────────────────────
  const journalist = pickJournalist('ANALYTICAL');
  const j          = journalist;
  const champName  = bracket.champion?.name ?? null;
  const champFull  = allPlayers.find((player) => player.id === bracket.champion?.id) ?? bracket.champion ?? null;
  const champNarrative = champFull?.publicNarrativeMemory?.publicNarrative?.line ?? null;
  const champIdentity = champFull ? buildPlayerIdentity(champFull, { surfaceKey: tournament?.surface ?? null }) : null;
  const aftermath = buildTournamentAftermath({
    tournament,
    champion: champFull,
    nextTournament,
    tournamentChapter,
  });

  const heatLine = avgHeat != null
    ? `Média de heat: ${avgHeat}/100 (${heatTierText(avgHeat)}) em ${totalGames} jogo(s). Pico: ${peakHeat}/100.`
    : 'Dados de calor não disponíveis para este torneio.';

  const injLine = injuredList.length === 0
    ? 'Nenhum jogador deixou o torneio com lesão registrada.'
    : `${injuredList.length} jogador(es) saíram com algum grau de lesão.`;

  const bodyParts = [
    pick(j.voice.opening),
    champName
      ? `${champName} levou o troféu, mas o ${tournament.name} deixou outras marcas na semana.`
      : `O ${tournament.name} chegou ao fim.`,
    champIdentity?.seasonArc?.summary ? `Para o campeao, este torneio funcionou como ${champIdentity.seasonArc.label.toLowerCase()}.` : null,
    champNarrative ? `Na prática, a campanha também mexe na narrativa pública do campeão: ${champNarrative.charAt(0).toLowerCase() + champNarrative.slice(1)}` : null,
    aftermath.meaning,
    heatVerdict(avgHeat),
    injLine,
    aftermath.nextHook,
    injuredList.length > 0 ? 'Mesmo quando a taça encontra um dono, a lembrança que fica no circuito costuma misturar afirmação, desgaste e a pressão levada para a próxima semana.' : `Ao fim do torneio, o circuito sai não só com um campeão, mas com uma nova hierarquia emocional para carregar até o próximo capítulo.`,
  ].filter(Boolean).join(' ');

  // Metadado estruturado para renderização especial no JornalView
  const wrapData = {
    heat: {
      avg:    avgHeat,
      peak:   peakHeat,
      tier:   heatTierText(avgHeat),
      games:  totalGames,
      label:  heatLine,
    },
    injured: injuredList.map(e => ({
      name:     e.name,
      rank:     e.rank,
      injLabel: e.injLabel,
      grade:    e.grade,
      gradeNum: e.gradeNum,
      status:   afastamentoText(e),
      withdrew: e.withdrew,
    })),
    aftermath: {
      meaning: aftermath.meaning,
      nextHook: aftermath.nextHook,
      championArcLabel: aftermath.championArcLabel,
      nextActLabel: aftermath.nextActLabel,
    },
  };

  return {
    id:         `tournament-wrap-${tournament.id}-${year}`,
    type:       'TOURNAMENT_WRAP',
    journalist,
    tournament,
    year,
    player:     bracket.champion ? { name: bracket.champion.name, id: bracket.champion.id } : null,
    headline:   `${tournament.name} ${year} — O balanço completo: qualidade, lesões e o que ficou`,
    deck:       `${cat} em ${tournament.location ?? ''}. ${heatLine} ${injLine}`,
    body:       bodyParts,
    wrapData,   // dados estruturados para renderização rica
    length:     'LONG',
    tags:       ['balanço', 'heat', 'lesões', String(year), tournament.name],
    createdAt:  Date.now(),
  };
}

// ─────────────────────────────────────────────────────────────────
// FASE 2: careerMoments → linha narrativa para qualquer artigo
// ─────────────────────────────────────────────────────────────────

/**
 * Gera uma linha de narrativa personalizada baseada nos careerMoments do jogador.
 * Retorna string vazia se não houver momento relevante.
 *
 * Usado em:
 *  - Artigos de campeão (corpo do artigo)
 *  - Artigos de finalista/perdedor (contexto)
 *  - Colunas de fim de ano
 *  - Artigos de patrocínio (contexto do jogador)
 */
export function careerMomentNarrativeLine(player, opts = {}) {
  const moments = player?.personality?.careerMoments ?? [];
  if (!moments.length) return '';

  const { year = null, maxAge = null, includeTypes = null } = opts;

  // Tipos prioritários — ordenados por peso narrativo
  const PRIORITY = [
    'FIRST_SLAM', 'FAREWELL', 'COMEBACK', 'TITLE_WHILE_INJURED',
    'DROUGHT_END', 'PERSONA_SHIFT', 'DROUGHT_START', 'INJURY_TRANSFORMS',
  ];

  // Filtra por ano se pedido; fallback: todos
  let pool = year != null
    ? moments.filter(m => m.year === year)
    : moments;

  if (includeTypes) {
    pool = pool.filter(m => includeTypes.includes(m.type));
  }

  if (!pool.length) pool = moments; // fallback: usa qualquer momento da carreira

  // Escolhe o momento de maior peso narrativo
  const best = pool.sort((a, b) => {
    const ia = PRIORITY.indexOf(a.type), ib = PRIORITY.indexOf(b.type);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  })[0];

  if (!best) return '';

  const name = player.name ?? 'o jogador';
  const y    = best.year ? `em ${best.year}` : '';

  const LINES = {
    FIRST_SLAM:          () => `Para ${name}, ${y} é o ano que nunca vai deixar de ser mencionado — o primeiro Grand Slam não se repete.`,
    FAREWELL:            () => `${name} joga sabendo que as despedidas têm um peso diferente. O circuito sente isso.`,
    COMEBACK:            () => `${name} volta de uma ausência que o circuito acreditou que seria permanente. Essa carga não some da noite para o dia.`,
    TITLE_WHILE_INJURED: () => `Houve um título com dor — ${name} carrega essa memória como prova de algo que não aparece em estatística.`,
    DROUGHT_END:         () => `Depois de tanto tempo sem vencer, ${name} sabe o valor de cada jogo com uma lucidez diferente.`,
    PERSONA_SHIFT:       () => `${name} mudou — o circuito percebeu. A narrativa sobre ele não é mais a mesma de dois anos atrás.`,
    DROUGHT_START:       () => `${name} tenta não deixar que a seca recente defina quem ele é. Isso tem custo mental real.`,
    INJURY_TRANSFORMS:   () => `Uma lesão mudou ${name} — não só o físico. O jogador que voltou não é exatamente o mesmo que saiu.`,
  };

  const builder = LINES[best.type];
  return builder ? builder() : (best.title ? `${name}: ${best.title}.` : '');
}

// ─────────────────────────────────────────────────────────────────
// FASE 2: SPONSOR events → artigos NewsEngine
// ─────────────────────────────────────────────────────────────────

/**
 * Converte chronicle events de patrocínio (do runSponsorshipWindow) em
 * artigos do NewsEngine para milestones que ainda não geraram artigos.
 *
 * Chamado no ADVANCE_YEAR depois de runSponsorshipWindow, apenas para
 * chronicleEvents (elite signings e elite terminations não duplicados).
 *
 * @param {Array}  chronicleEvents — array de events de runSponsorshipWindow
 * @param {Array}  allPlayers
 * @param {number} year
 * @returns {Array} artigos NewsEngine
 */
export function generateSponsorNewsFromChronicleEvents(chronicleEvents, allPlayers, year) {
  const articles = [];

  for (const ev of (chronicleEvents ?? [])) {
    const player = allPlayers.find(p => p.id === ev.playerId);
    if (!player) continue;

    const momentLine = careerMomentNarrativeLine(player);

    if (ev.subtype === 'ELITE_SIGNING') {
      // Elite signing já gera _buildSigningArticle em runTransferWindow,
      // mas o chronicle event captura apenas o PRIMEIRO ELITE — marco de carreira.
      // Aqui geramos um artigo de coluna narrativa adicional.
      const journalist = pick([JOURNALISTS.CARVALHO, JOURNALISTS.PETROV]);
      const feeText = ev.text ?? '';
      articles.push({
        id:             `sponsor-elite-milestone-${player.id}-${year}`,
        type:           'SPONSOR_ELITE',
        subtype:        'CAREER_MILESTONE',
        priority:       8,
        headline:       `${player.name} entra no seleto grupo de embaixadores de marca no tênis mundial`,
        deck:           `Um contrato ELITE não é apenas dinheiro — é posição de mercado, visibilidade e pressão.`,
        body:           [
          pick(journalist.voice.opening),
          `${player.name} assina seu primeiro contrato de nível ELITE. ${feeText}`,
          momentLine,
          `No tênis profissional, a transição para esse patamar comercial raramente acontece antes de um período de resultados consistentes. O circuito vai observar o que muda a partir de agora — dentro e fora da quadra.`,
          pick(journalist.voice.closing),
        ].filter(Boolean).join(' '),
        journalist:     journalist.id,
        journalistName: journalist.name,
        icon:           '👑',
        color:          '#FFD700',
        playerIds:      [player.id],
        year,
        tags:           ['patrocínio', 'elite', String(year), player.name],
        createdAt:      Date.now(),
      });
    }

    if (ev.subtype === 'ELITE_LOSS') {
      // Rescisão de contrato ELITE — narrativa de crise ou declínio
      const journalist = pick([JOURNALISTS.REED, JOURNALISTS.FONTAINE]);
      articles.push({
        id:             `sponsor-elite-loss-${player.id}-${year}`,
        type:           'SPONSOR_ELITE',
        subtype:        'ELITE_LOSS',
        priority:       7,
        headline:       `${player.name} perde contrato ELITE — uma separação que o mercado estava antecipando`,
        deck:           `Marcas globais raramente espernam antes de agir. Quando agem, a mensagem é clara.`,
        body:           [
          pick(journalist.voice.opening),
          `${ev.text ? ev.text.replace('Perde contrato ELITE com', `${player.name} não terá mais o suporte de`) : `O vínculo de ${player.name} com a marca foi encerrado.`}`,
          momentLine || `O circuito vai observar como ${player.name} responde a esse sinal do mercado.`,
          pick(journalist.voice.closing),
        ].filter(Boolean).join(' '),
        journalist:     journalist.id,
        journalistName: journalist.name,
        icon:           '💔',
        color:          '#FF6060',
        playerIds:      [player.id],
        year,
        tags:           ['patrocínio', 'rescisão', String(year), player.name],
        createdAt:      Date.now(),
      });
    }
  }

  return articles;
}

// ═══════════════════════════════════════════════════════════════════
// LIFE EVENT ARTICLES
// Transforma eventos do LifeEventSystem em artigos do feed de notícias.
// ═══════════════════════════════════════════════════════════════════

// Transforma eventos do LifeEventSystem em artigos do feed de notícias.
// ═══════════════════════════════════════════════════════════════════

const LIFE_EVENT_JOURNALIST_MAP = {
  // Categoria → estilo preferido de jornalista
  PERSONAL:    'GOSSIP',
  HOME:        'GOSSIP',
  SOCIAL:      'NARRATIVE',
  BUSINESS:    'ANALYTICAL',
  MEDIA:       'GOSSIP',
  CONTROVERSY: 'OPINION',
  COMMUNITY:   'NARRATIVE',
  SPIRITUAL:   'NARRATIVE',
  CAREER:      'OPINION',    // novo
  WELLNESS:    'NARRATIVE',  // novo
};

// ─────────────────────────────────────────────────────────────────
// SISTEMA DE PUBLICAÇÃO — decide se um evento merece ir ao feed
// ─────────────────────────────────────────────────────────────────

/**
 * Valor intrínseco de cada evento (0-10).
 * Eventos de alto valor sempre publicam se o jogador tiver qualquer visibilidade.
 * Eventos de baixo valor só publicam para jogadores muito famosos.
 */
const LIFE_EVENT_NEWS_VALUE = {
  // PERSONAL
  ENGAGEMENT:              4,
  MARRIAGE:                5,
  SEPARATION:              7,
  DIVORCE:                 7,
  CHILD_BORN:              5,
  TWINS_BORN:              6,
  ADOPTION:                6,
  NEW_PARTNER:             4,
  AFFAIR_RUMOR:            8,
  FAMILY_LOSS:             6,
  MENTAL_HEALTH_BREAK:     8,
  BURNOUT_WARNING:         5,
  THERAPY_PUBLIC:          5,
  HEALTH_SCARE:            7,
  PUBLIC_COMING_OUT:       9,
  SOBRIETY_JOURNEY:        8,
  RECONNECT_ROOTS:         4,
  ESTRANGEMENT:            5,
  SIBLING_IN_SPORT:        4,
  // HOME
  MOVE_TO_TAX_HAVEN:       4,
  NEW_PROPERTY:            2,
  LUXURY_CAR:              2,
  YACHT_PURCHASE:          3,
  PRIVATE_JET:             3,
  ART_COLLECTION:          3,
  WINE_ESTATE:             4,
  SOLD_PROPERTY:           2,
  // SOCIAL
  FOUNDATION_LAUNCH:       5,
  BIG_DONATION:            4,
  CAUSE_CAMPAIGN:          4,
  SCHOOL_OPENING:          5,
  ENVIRONMENTAL_PLEDGE:    3,
  CHARITY_TOURNAMENT:      3,
  POLITICAL_ENDORSEMENT:   7,
  REFUGEE_SUPPORT:         6,
  LGBTQ_ALLY:              6,
  ANTI_DOPING_CAMPAIGN:    5,
  DISASTER_RELIEF:         7,
  // BUSINESS
  BRAND_LAUNCH:            4,
  COMMERCIAL_PRESSURE:     6,
  RESTAURANT_OPENING:      3,
  TECH_STARTUP:            3,
  INVESTMENT:              2,
  COACHING_ACADEMY:        4,
  APP_LAUNCH:              3,
  FASHION_LINE:            5,
  SPORTS_OWNERSHIP:        6,
  CRYPTO_INVESTMENT:       3,
  CRYPTO_LOSS:             6,
  SPORTS_AGENCY:           4,
  HOTEL_INVESTMENT:        3,
  // MEDIA
  DOCUMENTARY:             6,
  AUTOBIOGRAPHY:           6,
  MAGAZINE_COVER:          4,
  TV_APPEARANCE:           3,
  PODCAST_LAUNCH:          4,
  ACTING_ROLE:             5,
  SOCIAL_MEDIA_VIRAL:      5,
  AMBASSADOR_ROLE:         4,
  COLUMN_NEWSPAPER:        3,
  CHILDREN_BOOK:           4,
  MUSIC_COLLAB:            5,
  FASHION_CAMPAIGN:        5,
  AWARD_SHOW_HOST:         5,
  SPORTS_COMMENTARY:       4,
  // CONTROVERSY
  CONTROVERSIAL_STATEMENT: 7,
  PUBLIC_DISPUTE:          7,
  DOPING_ALLEGATION:       10,
  DOPING_CLEARED:          8,
  TAX_EVASION:             8,
  ON_COURT_INCIDENT:       6,
  GAMBLING_RUMOR:          8,
  RACKET_SMASH_VIRAL:      5,
  ATP_FINE:                6,
  SUSPENSION:              9,
  RIVAL_PUBLIC_FEUD:       7,
  COACH_DRAMA:             6,
  FEDERATION_CONFLICT:     7,
  SOCIAL_MEDIA_MELTDOWN:   7,
  CHEATING_ALLEGATION:     8,
  // COMMUNITY
  NATIONAL_HERO:           5,
  STREET_NAMED:            4,
  NATIONAL_RETURN:         4,
  YOUTH_EVENT:             2,
  UNIVERSITY_DEGREE:       3,
  MENTORING_PROSPECT:      3,
  OLYMPIC_AMBASSADOR:      7,
  NATIONAL_AWARD:          5,
  HONORARY_CITIZENSHIP:    4,
  INDIGENOUS_HERITAGE:     5,
  // SPIRITUAL
  SPIRITUAL_RETREAT:       3,
  PILGRIMAGE:              3,
  CAREER_DOUBT:            7,
  MINDFULNESS_ADVOCACY:    4,
  RELIGION_CHANGE:         5,
  PHILOSOPHY_BOOK:         4,
  VEGAN_CONVERSION:        4,
  ANTI_MATERIALISM:        4,
  // CAREER
  COMEBACK_STATEMENT:      7,
  COACH_RESET:             5,
  RANKING_CRISIS:          6,
  WILDCARD_ACCEPTANCE:     5,
  NATIONAL_CAPTAINCY:      6,
  RETIREMENT_THREAT:       8,
  RECORD_CHASE:            6,
  COACHING_REFUSAL:        4,
  EARLY_PEAK_LAMENT:       5,
  // WELLNESS
  DIET_REVOLUTION:         3,
  DISCIPLINE_STREAK:       3,
  SLEEP_PROTOCOL:          3,
  RECOVERY_VIRAL:          4,
  ALTITUDE_CAMP:           3,
  WELLNESS_BRAND:          4,
  NO_PHONE_WEEK:           3,
  COLD_WATER_CONVERT:      2,
  PERSONAL_MATURITY:       5,
};

/**
 * Eventos que são apresentados como RUMOR/BOATO vs CONFIRMADOS.
 * RUMOR = imprensa especula, não há confirmação oficial.
 */
const LIFE_EVENT_IS_RUMOR = new Set([
  'AFFAIR_RUMOR', 'GAMBLING_RUMOR', 'CHEATING_ALLEGATION',
  'DOPING_ALLEGATION', 'TAX_EVASION', 'ESTRANGEMENT',
  'RIVAL_PUBLIC_FEUD', 'COACH_DRAMA', 'SOCIAL_MEDIA_MELTDOWN',
  'RANKING_CRISIS', 'RETIREMENT_THREAT',
]);

/**
 * Decide se um evento de vida deve ser publicado no feed.
 *
 * TIER DE PUBLICAÇÃO:
 *  S — Rank ≤10 ou marketability ≥80: tudo com newsValue ≥ 2
 *  A — Rank ≤30 ou marketability ≥60: eventos com newsValue ≥ 4
 *  B — Rank ≤60 ou marketability ≥40: eventos com newsValue ≥ 6
 *  C — Rank >60 ou marketability <40:  apenas eventos com newsValue ≥ 8 (crises graves)
 *
 * @param {object} player
 * @param {object} event — { type, category, newsworthy }
 * @param {object} state — { rankingStore }
 * @returns {{ publish: boolean, asRumor: boolean, priority: number }}
 */
export function shouldPublishLifeEvent(player, event, state = {}) {
  if (!event.newsworthy) return { publish: false };

  const rank   = player.stats?.ranking
    ?? player.rankPosition
    ?? (() => {
      const ranked = state.rankingStore?.ranked ?? [];
      const entry  = ranked.find(r => r.playerId === player.id);
      return entry?.position ?? 999;
    })();
  const market = player.personality?.marketability?.score ?? 30;
  const value  = LIFE_EVENT_NEWS_VALUE[event.type] ?? 3;

  // Tier
  const tier =
    rank <= 10 || market >= 80 ? 'S' :
    rank <= 30 || market >= 60 ? 'A' :
    rank <= 60 || market >= 40 ? 'B' : 'C';

  const minValue = { S: 2, A: 4, B: 6, C: 8 }[tier];

  if (value < minValue) return { publish: false };

  // Chance residual para tier B/C (não é garantido)
  if (tier === 'B' && value < 8) {
    if (Math.random() > 0.65) return { publish: false };
  }
  if (tier === 'C') {
    if (Math.random() > 0.50) return { publish: false };
  }

  const asRumor = LIFE_EVENT_IS_RUMOR.has(event.type);
  const priority = Math.min(10, value + (tier === 'S' ? 2 : tier === 'A' ? 1 : 0));

  return { publish: true, asRumor, tier, priority };
}

function pulseFinanceLine(player, monthIndex, year) {
  const log = player?.finance?.monthlyCostLog ?? [];
  const paid = log.find(item => item.season === year && item.monthIndex === monthIndex);
  if (!paid) return null;
  const budget = player.finance?.budget ?? 0;
  if (budget < -100_000) return `${player.name} fecha o mês no vermelho e vira caso real de pressão financeira no circuito.`;
  if (paid.amount >= 20_000) return `${player.name} já opera com estrutura de elite: equipe, recuperação e logística pesando no caixa mês a mês.`;
  return null;
}

function pulseLifeLine(player, monthIndex, year) {
  const events = (player?.lifeEventLog ?? []).filter(e => e.season === year && e.monthIndex === monthIndex);
  const event = events.find(e => e.newsworthy) ?? events[0];
  if (!event) return null;
  return `${player.name} também virou assunto fora da quadra: ${event.description?.replace(/\.$/, '') ?? event.label}.`;
}

function pulseSponsorLine(player, year) {
  const recent = (player?.sponsorMemory?.all ?? [])
    .filter(m => !year || m.year === year)
    .sort((a, b) => (b.importance ?? 0) - (a.importance ?? 0))[0];
  if (!recent) return null;
  return `${player.name} ganhou novo contorno comercial: ${recent.label ?? recent.sponsorName ?? 'um capítulo de patrocínio'} entrou na narrativa da temporada.`;
}

function pulseDevelopmentLine(event, playersById) {
  if (!event) return null;
  const player = playersById[event.playerId];
  const name = player?.name ?? event.player ?? 'Um jogador do circuito';
  if (event.type === 'BREAKTHROUGH') return `${name} saiu do mês com salto técnico depois de transformar título em confiança concreta.`;
  if (event.type === 'DECLINE_START') return `${name} entrou oficialmente na fase em que o corpo começa a negociar com a carreira.`;
  if (event.type === 'STYLE_MIGRATION') return `${name} já não joga exatamente como antes: a evolução de estilo virou fato de temporada.`;
  return null;
}

export function generateSeasonPulseNews(pulseResult = {}, state = {}, context = {}) {
  const monthly = (pulseResult.pulses ?? []).find(p => p.type === 'MONTHLY');
  if (!monthly) return [];

  const year = state.year ?? monthly.year;
  const monthIndex = monthly.monthIndex ?? pulseResult.timing?.monthIndex ?? null;
  const players = [...(state.tourPlayers ?? []), ...(state.prospects ?? [])];
  const playersById = Object.fromEntries(players.map(p => [p.id, p]));
  const journalist = JOURNALISTS.SANTOS;

  const lifeLines = players.map(p => pulseLifeLine(p, monthIndex, year)).filter(Boolean).slice(0, 2);
  const financeLines = players
    .sort((a, b) => (a.rankPosition ?? 999) - (b.rankPosition ?? 999))
    .map(p => pulseFinanceLine(p, monthIndex, year))
    .filter(Boolean)
    .slice(0, 2);
  const sponsorLines = players.map(p => pulseSponsorLine(p, year)).filter(Boolean).slice(0, 1);
  const devLines = (context.developmentEvents ?? [])
    .map(e => pulseDevelopmentLine(e, playersById))
    .filter(Boolean)
    .slice(0, 2);

  const lines = [...lifeLines, ...sponsorLines, ...financeLines, ...devLines].filter(Boolean);
  if (lines.length < 2) return [];

  const block = monthly.blockId ? monthly.blockId.replace(/_/g, ' ').toLowerCase() : 'temporada';
  return [{
    id: `season-pulse-${year}-${monthIndex ?? 'm'}-${monthly.weekNumber ?? 'w'}`,
    type: 'SEASON_PULSE',
    journalist,
    year,
    headline: `Pulso do circuito: o que mudou no mês ${monthIndex ?? ''}`.trim(),
    deck: `A temporada não se move apenas por troféus. Contratos, vida, caixa e evolução técnica também estão redesenhando o circuito.`,
    body: [
      pick(journalist.voice.opening),
      `O calendário entrou no bloco ${block}, mas a mudança real apareceu nos detalhes que não cabem no placar.`,
      ...lines,
      `Esse é o tipo de mês que parece pequeno no ranking e enorme quando a temporada for lembrada daqui a alguns anos.`,
      pick(journalist.voice.closing),
    ].filter(Boolean).join(' '),
    length: 'MEDIUM',
    tags: ['pulso', 'temporada', 'vida', 'finanças', 'patrocínio'],
    createdAt: Date.now(),
  }];
}

const LIFE_EVENT_VOICES = {
  // Corpo do artigo por categoria — usa o jornalista certo
  PERSONAL: {
    ENGAGEMENT:   (p, j) => `${pick(j.voice.opening)} ${p.name} saiu do circuito de boatos e entrou para o registro oficial: está noivado. Quem acompanha o jogador sabe que essa estabilidade pessoal costuma refletir em quadra. ${pick(j.voice.closing)}`,
    MARRIAGE:     (p, j) => `${pick(j.voice.opening)} ${p.name} se casa. Fora das câmeras de torneio, há uma vida que acontece. O circuito deseja os melhores votos. ${pick(j.voice.closing)}`,
    SEPARATION:   (p, j) => `${pick(j.voice.opening)} ${p.name} confirma separação. O comunicado foi breve. O impacto, ninguém sabe ainda. O tênis exige presença total — e o lado pessoal cobra o preço em silêncio. ${pick(j.voice.closing)}`,
    DIVORCE:      (p, j) => `${pick(j.voice.opening)} O divórcio de ${p.name} foi confirmado. Mais um capítulo fechado fora da quadra. O que pesa mais no atleta — o que acontece dentro ou fora do jogo? Ninguém responde essa pergunta com facilidade. ${pick(j.voice.closing)}`,
    CHILD_BORN:   (p, j) => `${pick(j.voice.opening)} ${p.name} é pai. Primeiro filho, primeira vez que um Grand Slam deixa de ser a coisa mais importante do mundo. Isso muda um atleta. Sempre. ${pick(j.voice.closing)}`,
    TWINS_BORN:   (p, j) => `${pick(j.voice.opening)} Gêmeos. ${p.name} dobrou a família de uma vez. O circuito vai ter que se adaptar a um calendário que agora compartilha espaço com fraldas e noites sem dormir. ${pick(j.voice.closing)}`,
    ADOPTION:     (p, j) => `${pick(j.voice.opening)} ${p.name} adota. Por trás do ranking e dos títulos, há um ser humano que escolheu ampliar a família de uma forma que não costuma aparecer nos estatísticos. ${pick(j.voice.closing)}`,
    NEW_PARTNER:  (p, j) => `${pick(j.voice.opening)} Os holofotes fora da quadra: ${p.name} visto em companhia. Confirmado ou não, o circuito de boatos já está em movimento. ${pick(j.voice.closing)}`,
    AFFAIR_RUMOR: (p, j) => `${pick(j.voice.opening)} A imprensa especula. ${p.name} ainda não comentou. O que é fato, o que é rumor e o que é entretenimento — três categorias que o circuito de fofoca raramente distingue. ${pick(j.voice.closing)}`,
    FAMILY_LOSS:  (p, j) => `${pick(j.voice.opening)} ${p.name} comunica perda de familiar. O tênis vai continuar. O ranking vai continuar. Mas há momentos que lembram que o jogo é menor do que a vida. ${pick(j.voice.closing)}`,
    MENTAL_HEALTH_BREAK: (p, j) => `${pick(j.voice.opening)} ${p.name} anuncia pausa para cuidar da saúde mental. Em 2025, isso ainda tem peso de coragem. O circuito começa a entender que um atleta quebrado por dentro não serve a ninguém. ${pick(j.voice.closing)}`,
    THERAPY_PUBLIC: (p, j) => `${pick(j.voice.opening)} ${p.name} fala sobre terapia sem o menor constrangimento. "Faz parte do treino", disse. O circuito precisava ouvir isso de alguém com o ranking que ${p.name} tem. ${pick(j.voice.closing)}`,
    HEALTH_SCARE:  (p, j) => `${pick(j.voice.opening)} Fontes próximas à comissão técnica de ${p.name} confirmam que o atleta passou por bateria de exames esta semana. Os resultados não foram divulgados. O circuito espera. ${pick(j.voice.closing)}`,
    PUBLIC_COMING_OUT: (p, j) => `${pick(j.voice.opening)} ${p.name} fez uma declaração que o tênis vai guardar por anos. Simples, direta, sem pedido de aprovação. O circuito, que raramente sabe como reagir a esses momentos, vai ter que aprender. ${pick(j.voice.closing)}`,
    SOBRIETY_JOURNEY: (p, j) => `${pick(j.voice.opening)} ${p.name} revelou uma batalha que ninguém sabia que estava acontecendo. Meses de sobriedade. A coragem de tornar isso público em um ambiente tão competitivo quanto o circuito profissional é, por si só, uma vitória. ${pick(j.voice.closing)}`,
    RECONNECT_ROOTS: (p, j) => `${pick(j.voice.opening)} ${p.name} voltou. Não ao circuito — às origens. O país natal, o bairro, as pessoas que estavam lá antes dos títulos. Há quem diga que isso é saudade. Há quem diga que é estratégia. Provavelmente é as duas coisas. ${pick(j.voice.closing)}`,
    ESTRANGEMENT:  (p, j) => `${pick(j.voice.opening)} Fontes próximas falam em distanciamento entre ${p.name} e familiar próximo. Os motivos não foram revelados — e provavelmente não serão. O que se sabe: a viagem ao país natal foi cancelada. ${pick(j.voice.closing)}`,
    SIBLING_IN_SPORT: (p, j) => `${pick(j.voice.opening)} O sobrenome ${p.name.split(' ').pop()} vai aparecer em dois draw sheets. O irmão acaba de assinar contrato profissional. O tênis adora uma história de família. E essa tem todos os ingredientes. ${pick(j.voice.closing)}`,
  },
  SOCIAL: {
    FOUNDATION_LAUNCH: (p, j) => `${pick(j.voice.opening)} ${p.name} lança fundação. O dinheiro que o tênis gerou volta para o mundo de uma forma diferente. Há atletas que tratam as vitórias como fim. Há os que tratam como meio. ${pick(j.voice.closing)}`,
    BIG_DONATION:      (p, j) => `${pick(j.voice.opening)} ${p.name} doa. A cifra é expressiva. A causa, legítima. Há quem veja performance de imagem — há quem veja consequência natural de alguém que chegou lá e não esqueceu de onde veio. ${pick(j.voice.closing)}`,
    CAUSE_CAMPAIGN:    (p, j) => `${pick(j.voice.opening)} ${p.name} usa sua plataforma. Um atleta de alto nível tem visibilidade que poucas pessoas têm. O que se faz com isso diz tanto sobre o personagem quanto qualquer resultado em quadra. ${pick(j.voice.closing)}`,
    SCHOOL_OPENING:    (p, j) => `${pick(j.voice.opening)} ${p.name} abre escola. A construção mais duradoura de uma carreira raramente aparece no ranking. Às vezes ela tem endereço fixo, salas de aula e crianças que nunca vão saber o nome do que lhes foi dado. ${pick(j.voice.closing)}`,
    ENVIRONMENTAL_PLEDGE: (p, j) => `${pick(j.voice.opening)} ${p.name} firma compromisso ambiental. O tênis percorre o mundo em aviões e deixa rastros. Alguém decidiu começar a medir esse custo. ${pick(j.voice.closing)}`,
    CHARITY_TOURNAMENT:(p, j) => `${pick(j.voice.opening)} ${p.name} organiza torneio beneficente. Um dia fora do circuito oficial, com raquetes e quadra, para lembrar que o jogo pode ter outro propósito. ${pick(j.voice.closing)}`,
    POLITICAL_ENDORSEMENT: (p, j) => `${pick(j.voice.opening)} ${p.name} cruzou uma linha que poucos atletas cruzam voluntariamente: o apoio político público. A declaração dividiu. A ausência de arrependimento, também. ${pick(j.voice.closing)}`,
    REFUGEE_SUPPORT:   (p, j) => `${pick(j.voice.opening)} ${p.name} visitou campo de refugiados. Não como PR. A história do retorno — a viagem, as conversas, o silêncio do avião de volta — foi contada em primeira pessoa. ${pick(j.voice.closing)}`,
    LGBTQ_ALLY:        (p, j) => `${pick(j.voice.opening)} Palavras de ${p.name} que o circuito não estava esperando — e que provavelmente precisava ouvir. A posição não foi calculada para agradar. Foi dita. ${pick(j.voice.closing)}`,
    ANTI_DOPING_CAMPAIGN: (p, j) => `${pick(j.voice.opening)} ${p.name} como voz pelo esporte limpo. Há um peso específico em ouvir isso de um top-10. A campanha ganhou um rosto que o ranking valida. ${pick(j.voice.closing)}`,
    DISASTER_RELIEF:   (p, j) => `${pick(j.voice.opening)} ${p.name} foi pessoalmente. Não mandou cheque — foi. A doação veio depois. O gesto de presença, antes. O circuito vai lembrar isso muito depois dos títulos. ${pick(j.voice.closing)}`,
  },
  BUSINESS: {
    BRAND_LAUNCH:   (p, j) => `${pick(j.voice.opening)} ${p.name} lança marca própria. A segunda carreira começa enquanto a primeira ainda está no pico. É assim que os que planejam se aposentar constroem o que vem depois. ${pick(j.voice.closing)}`,
    RESTAURANT_OPENING: (p, j) => `${pick(j.voice.opening)} ${p.name} abre restaurante. A gastronomia como hobby virou negócio. O circuito vai observar se o mesmo nível de exigência aplicado ao tênis aparece na cozinha. ${pick(j.voice.closing)}`,
    TECH_STARTUP:   (p, j) => `${pick(j.voice.opening)} ${p.name} investe em tecnologia. Há atletas que encerram a carreira e somem. Há os que somem para dentro de startups. ${pick(j.voice.closing)}`,
    INVESTMENT:     (p, j) => `${pick(j.voice.opening)} ${p.name} diversifica o patrimônio. O prize money virou ativo. A segunda jogada financeira já está em andamento enquanto a primeira ainda acontece nas quadras. ${pick(j.voice.closing)}`,
    COACHING_ACADEMY: (p, j) => `${pick(j.voice.opening)} ${p.name} cria academia própria. O que foi aprendido em décadas de circuito vai ser transmitido. É o tipo de legado que não aparece no Hall of Fame — e talvez seja o mais duradouro. ${pick(j.voice.closing)}`,
    APP_LAUNCH:     (p, j) => `${pick(j.voice.opening)} ${p.name} lança aplicativo. A interface entre tênis e tecnologia tem um novo rosto. O circuito vai testar se o produto tem a mesma qualidade da marca que o assina. ${pick(j.voice.closing)}`,
    FASHION_LINE:   (p, j) => `${pick(j.voice.opening)} ${p.name} entra na moda. A coleção esgotou antes da campanha terminar. Há algo no cruzamento entre atleta de elite e design que o mercado invariavelmente recompensa. ${pick(j.voice.closing)}`,
    SPORTS_OWNERSHIP: (p, j) => `${pick(j.voice.opening)} ${p.name} do outro lado da mesa agora: dono. A participação num clube esportivo é a incursão mais significativa no mundo dos que decidem, não dos que jogam. ${pick(j.voice.closing)}`,
    CRYPTO_INVESTMENT: (p, j) => `${pick(j.voice.opening)} ${p.name} entrou no mercado de criptomoedas e não escondeu. "Acredito na tecnologia", disse em entrevista. O mercado vai mostrar se a convicção foi bem investida. ${pick(j.voice.closing)}`,
    CRYPTO_LOSS:    (p, j) => `${pick(j.voice.opening)} ${p.name} admitiu a perda. Sem rodeios, sem advogados falando no lugar. "Me empolguei. Erro meu." O circuito financeiro tem lições que o tênis não ensina. ${pick(j.voice.closing)}`,
    SPORTS_AGENCY:  (p, j) => `${pick(j.voice.opening)} ${p.name} funda agência para atletas jovens. A trajetória como manual — as dificuldades que ninguém explicou disponíveis para quem está começando. ${pick(j.voice.closing)}`,
    HOTEL_INVESTMENT: (p, j) => `${pick(j.voice.opening)} ${p.name} investe em hotelaria no país natal. Não é só negócio — é uma declaração de pertencimento. O nome no portão vai além da placa. ${pick(j.voice.closing)}`,
  },
  MEDIA: {
    DOCUMENTARY:    (p, j) => `${pick(j.voice.opening)} Um documentário sobre ${p.name}. A câmera vai para onde a imprensa raramente consegue chegar. O que vai aparecer no corte final é a questão que todo mundo quer responder. ${pick(j.voice.closing)}`,
    AUTOBIOGRAPHY:  (p, j) => `${pick(j.voice.opening)} ${p.name} assina a própria história. Todo autobiografia é uma edição — o que se escolhe contar é tão revelador quanto o que se omite. O circuito vai ler nas entrelinhas. ${pick(j.voice.closing)}`,
    MAGAZINE_COVER: (p, j) => `${pick(j.voice.opening)} ${p.name} na capa. A fotografia escolhida, a entrevista editada, a narrativa construída — a indústria da imagem e o esporte se encontram de forma inevitável. ${pick(j.voice.closing)}`,
    TV_APPEARANCE:  (p, j) => `${pick(j.voice.opening)} ${p.name} fora da quadra, dentro das câmeras. Um atleta que sabe se comunicar tem alcance que vai além do tênis. O episódio vai ao ar. O circuito assiste. ${pick(j.voice.closing)}`,
    PODCAST_LAUNCH: (p, j) => `${pick(j.voice.opening)} ${p.name} lança podcast. A voz que responde perguntas em coletivas agora tem um canal próprio. Sem filtro editorial, sem deadline, sem moderador. ${pick(j.voice.closing)}`,
    ACTING_ROLE:    (p, j) => `${pick(j.voice.opening)} ${p.name} no set. A transição do esporte para o entretenimento tem histórico variado. Alguns atletas encontram a segunda vocação. Outros descobrem que a quadra era o único palco certo. ${pick(j.voice.closing)}`,
    SOCIAL_MEDIA_VIRAL: (p, j) => `${pick(j.voice.opening)} ${p.name} viral. O algoritmo e o talento se encontraram no momento certo. Milhões de visualizações depois, o circuito ganhou um novo assunto para a semana. ${pick(j.voice.closing)}`,
    AMBASSADOR_ROLE: (p, j) => `${pick(j.voice.opening)} ${p.name} assina contrato de embaixador. A face do atleta agora representa mais do que um jogo — representa um produto, um estilo, uma promessa implícita de que a excelência tem marca. ${pick(j.voice.closing)}`,
    COLUMN_NEWSPAPER: (p, j) => `${pick(j.voice.opening)} ${p.name} vai escrever. Semanalmente. Sem intermediário. A voz que o circuito costuma filtrar agora tem espaço próprio — e os editores já sabem que as colunas mais lembradas raramente são as mais confortáveis. ${pick(j.voice.closing)}`,
    CHILDREN_BOOK:  (p, j) => `${pick(j.voice.opening)} ${p.name} escreveu um livro para os filhos. E publicou para o mundo. A menor das audiências inspirou a história mais universal que o atleta já contou. ${pick(j.voice.closing)}`,
    MUSIC_COLLAB:   (p, j) => `${pick(j.voice.opening)} ${p.name} no clipe. O cruzamento entre esporte e música tem uma nova entrada. O resultado já acumula visualizações que a maioria dos torneios não consegue no YouTube. ${pick(j.voice.closing)}`,
    FASHION_CAMPAIGN: (p, j) => `${pick(j.voice.opening)} ${p.name} na semana de moda. A marca escolheu bem — e o atleta também. Há uma linguagem estética no jogo de elite que o mundo da moda leva décadas tentando capturar. ${pick(j.voice.closing)}`,
    AWARD_SHOW_HOST: (p, j) => `${pick(j.voice.opening)} ${p.name} no microfone de apresentador. O espontâneo que aparece em coletivas foi testado em palco maior. O veredicto da noite: nasceu comunicador. ${pick(j.voice.closing)}`,
    SPORTS_COMMENTARY: (p, j) => `${pick(j.voice.opening)} ${p.name} como comentarista. A câmera agora está do outro lado. A visão de quem jogou em Grand Slam Final é o tipo de perspectiva que nenhum estudo jornalístico substitui. ${pick(j.voice.closing)}`,
  },
  CONTROVERSY: {
    CONTROVERSIAL_STATEMENT: (p, j) => `${pick(j.voice.opening)} ${p.name} disse algo. O que exatamente foi dito já circula nas redes sem contexto. A nota de esclarecimento, se vier, vai chegar tarde. ${pick(j.voice.closing)}`,
    PUBLIC_DISPUTE: (p, j) => `${pick(j.voice.opening)} ${p.name} em confronto público. A versão oficial ainda não saiu. A versão não oficial já tem dez variações. O que é fato: houve atrito, houve audiência, haverá consequências. ${pick(j.voice.closing)}`,
    DOPING_ALLEGATION: (p, j) => `${pick(j.voice.opening)} A palavra não é fácil de escrever. Suspeita de doping envolvendo ${p.name}. A agência investiga. O processo é longo. A reputação não espera o processo terminar. ${pick(j.voice.closing)}`,
    DOPING_CLEARED: (p, j) => `${pick(j.voice.opening)} ${p.name} inocentado. Os exames não encontraram nada. O processo terminou. A reputação — essa leva mais tempo para voltar ao que era. ${pick(j.voice.closing)}`,
    TAX_EVASION: (p, j) => `${pick(j.voice.opening)} Autoridades investigam ${p.name}. Residência fiscal, declarações, movimentações — o tênis entra no território das planilhas e advogados. O atleta não comentou. Os números vão falar. ${pick(j.voice.closing)}`,
    ON_COURT_INCIDENT: (p, j) => `${pick(j.voice.opening)} ${p.name} e o árbitro. A versão do atleta e a versão do regulamento raramente coincidem em momentos assim. A multa foi aplicada. O episódio vai ser lembrado quando o nome aparecer nas manchetes de novo. ${pick(j.voice.closing)}`,
    GAMBLING_RUMOR: (p, j) => `${pick(j.voice.opening)} Circulam rumores. ${p.name} e apostas — dois mundos que o tênis prefere manter separados. Nada confirmado. Nada descartado. O suficiente para a imprensa trabalhar por semanas. ${pick(j.voice.closing)}`,
    RACKET_SMASH_VIRAL: (p, j) => `${pick(j.voice.opening)} O vídeo já tem milhões de visualizações. ${p.name}, a raquete, o momento de raiva que nenhuma assessoria consegue apagar depois. É o tipo de fragmento que define narrativas. ${pick(j.voice.closing)}`,
    ATP_FINE:       (p, j) => `${pick(j.voice.opening)} ${p.name} multado. O valor não é o problema — o problema é o padrão. A ATP registrou. O circuito vai registrar também. ${pick(j.voice.closing)}`,
    SUSPENSION:     (p, j) => `${pick(j.voice.opening)} Suspenso. ${p.name} fora por período determinado — consequência de um acúmulo que a ATP decidiu que chegou no limite. O silêncio do atleta neste momento diz mais do que qualquer declaração poderia. ${pick(j.voice.closing)}`,
    RIVAL_PUBLIC_FEUD: (p, j) => `${pick(j.voice.opening)} ${p.name} não esperou o próximo confronto em quadra. Declarações trocadas, mídia alimentada, torcida dividida. Há rivalidades que vivem nas quadras. Essa decidiu viver em todo lugar. ${pick(j.voice.closing)}`,
    COACH_DRAMA:    (p, j) => `${pick(j.voice.opening)} Demissão. ${p.name} e o técnico separaram caminhos de forma que ninguém chamaria de silenciosa. Os motivos oficiais foram vagos. Os bastidores, não. ${pick(j.voice.closing)}`,
    FEDERATION_CONFLICT: (p, j) => `${pick(j.voice.opening)} ${p.name} e a federação nacional estão em rota de colisão. Representar um país é uma relação que raramente é só técnica — e quando quebra, raramente quebra sem barulho. ${pick(j.voice.closing)}`,
    SOCIAL_MEDIA_MELTDOWN: (p, j) => `${pick(j.voice.opening)} O feed de ${p.name} nas últimas 24 horas: mensagens que o assessor vai passar semanas tentando contextualizar. O que fica claro é que havia algo pressionando que encontrou a saída mais pública possível. ${pick(j.voice.closing)}`,
    CHEATING_ALLEGATION: (p, j) => `${pick(j.voice.opening)} Acusação pesada. Um adversário de ${p.name} levou para a imprensa o que devia ter ficado nos bastidores — ou talvez devesse ter chegado aqui mesmo. A ATP abriu investigação. ${pick(j.voice.closing)}`,
  },
  COMMUNITY: {
    NATIONAL_HERO: (p, j) => `${pick(j.voice.opening)} ${p.name} recebe honraria do governo. A carreira virou patrimônio nacional — ou pelo menos é o que o decreto diz. Há títulos que pesam mais do que os de Grand Slam. ${pick(j.voice.closing)}`,
    STREET_NAMED:  (p, j) => `${pick(j.voice.opening)} Uma rua com o nome de ${p.name}. A homenagem mais permanente que uma cidade pode dar. Daqui a cinquenta anos, alguém vai perguntar quem era. E vai ter uma história para contar. ${pick(j.voice.closing)}`,
    NATIONAL_RETURN: (p, j) => `${pick(j.voice.opening)} ${p.name} volta. Depois de anos em paraísos fiscais e residências táticas, o país natal chama de volta. Ou o atleta decidiu que o endereço no passaporte deveria coincidir com o endereço no coração. ${pick(j.voice.closing)}`,
    UNIVERSITY_DEGREE: (p, j) => `${pick(j.voice.opening)} ${p.name} se gradua. Enquanto treinava, competia e viajava, havia aulas também. A disciplina que forma um atleta de elite pode formar qualquer coisa. ${pick(j.voice.closing)}`,
    MENTORING_PROSPECT: (p, j) => `${pick(j.voice.opening)} ${p.name} assume papel de mentor. A sabedoria acumulada em anos de circuito vai ser transmitida. É o tipo de investimento que não aparece no extrato bancário — mas vale. ${pick(j.voice.closing)}`,
    OLYMPIC_AMBASSADOR: (p, j) => `${pick(j.voice.opening)} ${p.name} nomeado embaixador olímpico. O rosto do circuito de tênis agora também representa algo maior do que um esporte. A cerimônia dos Jogos vai ter um novo porta-voz. ${pick(j.voice.closing)}`,
    NATIONAL_AWARD: (p, j) => `${pick(j.voice.opening)} Condecoração nacional para ${p.name}. A cerimônia foi transmitida ao vivo. O discurso foi curto. O peso, não. ${pick(j.voice.closing)}`,
    HONORARY_CITIZENSHIP: (p, j) => `${pick(j.voice.opening)} Cidadania honorária para ${p.name}. A cidade que o viu treinar por anos decidiu que esse nome pertence ao lugar. Há formas de dizer obrigado que duram mais que qualquer prêmio. ${pick(j.voice.closing)}`,
    INDIGENOUS_HERITAGE: (p, j) => `${pick(j.voice.opening)} ${p.name} escolheu contar essa parte da história. A herança cultural que o circuito não costuma perguntar sobre — e que, quando aparece, muda como um atleta é lido. ${pick(j.voice.closing)}`,
    YOUTH_EVENT:   (p, j) => `${pick(j.voice.opening)} ${p.name} entre jovens tenistas. Sem câmeras de transmissão, sem pontos no ranking. Apenas raquetes e alguém que chegou lá mostrando que é possível. ${pick(j.voice.closing)}`,
  },
  SPIRITUAL: {
    SPIRITUAL_RETREAT: (p, j) => `${pick(j.voice.opening)} ${p.name} em retiro. O circuito continua girando; o atleta escolheu pausar. Há uma versão mais antiga de si mesmo que precisa ser reencontrada. O tênis pode esperar alguns dias. ${pick(j.voice.closing)}`,
    PILGRIMAGE: (p, j) => `${pick(j.voice.opening)} ${p.name} em peregrinação. O percurso não é pelas raquetes. A jornada que acontece fora das quadras raramente tem narrador — mas é parte da história. ${pick(j.voice.closing)}`,
    CAREER_DOUBT: (p, j) => `${pick(j.voice.opening)} ${p.name} questiona a continuidade. A frase saiu em entrevista: "Estou avaliando". O circuito já sabe o que isso significa quando vem de alguém com mais de 30 anos e menos de dez top-10 nas últimas semanas. ${pick(j.voice.closing)}`,
    MINDFULNESS_ADVOCACY: (p, j) => `${pick(j.voice.opening)} ${p.name} fala sobre saúde mental. A conversa que o esporte evitou por décadas ganhou um porta-voz com ranking e títulos para sustentar o argumento. ${pick(j.voice.closing)}`,
    RELIGION_CHANGE: (p, j) => `${pick(j.voice.opening)} ${p.name} revelou uma mudança profunda. "Encontrei algo que me ancora de um jeito diferente", disse em entrevista. O circuito não sabe bem como processar — mas vai tentar. ${pick(j.voice.closing)}`,
    PHILOSOPHY_BOOK: (p, j) => `${pick(j.voice.opening)} ${p.name} escreveu sobre como viver. Não sobre como jogar tênis. O título sai semana que vem. O circuito vai ler — e parte dele vai se sentir desconfortável com o que encontrar. ${pick(j.voice.closing)}`,
    VEGAN_CONVERSION: (p, j) => `${pick(j.voice.opening)} ${p.name} virou vegano. A notícia é essa, mas a conversa que vem junto é sobre performance, ética e escolha. Três tópicos que o tênis raramente discute ao mesmo tempo. ${pick(j.voice.closing)}`,
    ANTI_MATERIALISM: (p, j) => `${pick(j.voice.opening)} ${p.name} surpreendeu. Depois de anos no topo, a declaração foi: "Reduzi tudo. Foi a melhor decisão." Em um esporte onde o lifestyle é marketing, isso é uma posição radical. ${pick(j.voice.closing)}`,
  },
  HOME: {
    MOVE_TO_TAX_HAVEN: (p, j) => `${pick(j.voice.opening)} ${p.name} transfere residência. O destino é previsível para quem ganha o que os top-10 ganham. O circuito não julga — mas registra. ${pick(j.voice.closing)}`,
    NEW_PROPERTY:  (p, j) => `${pick(j.voice.opening)} ${p.name} adquire imóvel. O patrimônio fora da quadra continua crescendo junto com o ranking. ${pick(j.voice.closing)}`,
    LUXURY_CAR:    (p, j) => `${pick(j.voice.opening)} ${p.name} e o novo carro. Os holofotes do circuito às vezes capturam coisas que nada têm a ver com tênis — e mesmo assim revelam algo sobre o personagem. ${pick(j.voice.closing)}`,
    YACHT_PURCHASE:(p, j) => `${pick(j.voice.opening)} ${p.name} compra iate. A celebração mais cara da temporada não foi no pódio. Aconteceu num cais, com água salgada e um cheque que a maioria das pessoas não consegue imaginar assinar. ${pick(j.voice.closing)}`,
    PRIVATE_JET:   (p, j) => `${pick(j.voice.opening)} ${p.name} e o jato particular. O circuito se torna menor quando você não depende mais de voos comerciais. A logística de uma carreira de tênis de elite tem uma nova peça no tabuleiro. ${pick(j.voice.closing)}`,
    ART_COLLECTION:(p, j) => `${pick(j.voice.opening)} ${p.name} coleciona arte. Não como investimento — como gosto. A coleção que cresceu em silêncio por anos finalmente apareceu em entrevista. O circuito não sabia dessa dimensão do personagem. ${pick(j.voice.closing)}`,
    WINE_ESTATE:   (p, j) => `${pick(j.voice.opening)} ${p.name} tem vinícola agora. O rótulo com o próprio nome esgotou em 72 horas. Há carreiras que geram marcas que sobrevivem ao último ponto. ${pick(j.voice.closing)}`,
    SOLD_PROPERTY: (p, j) => `${pick(j.voice.opening)} ${p.name} vendeu a propriedade. Mudança de base, mudança de fase. Quando um atleta muda de endereço, o circuito especula sobre o que muda junto com a chave. ${pick(j.voice.closing)}`,
  },
  // ── CAREER — nova categoria ────────────────────────────────────
  CAREER: {
    COMEBACK_STATEMENT: (p, j) => `${pick(j.voice.opening)} ${p.name} foi direto ao ponto: "Não terminei." A frase saiu em entrevista e o circuito parou para ouvir. Há uma diferença entre declarações de retorno e essa. A diferença é o tom — sem desculpas, sem rodeios. ${pick(j.voice.closing)}`,
    RANKING_CRISIS:     (p, j) => `${pick(j.voice.opening)} ${p.name} falou sobre o número do ranking com uma honestidade rara no circuito. "Não é onde quero estar, e sei exatamente por quê." Há atletas que culpam o calendário. Esse não. ${pick(j.voice.closing)}`,
    WILDCARD_ACCEPTANCE:(p, j) => `${pick(j.voice.opening)} ${p.name} aceitou o wildcard. Em outro momento, esse torneio seria garantia no ranking. Hoje é uma oportunidade pedida. O circuito vai assistir com atenção diferente. ${pick(j.voice.closing)}`,
    NATIONAL_CAPTAINCY: (p, j) => `${pick(j.voice.opening)} ${p.name} assume a capitania. Dentro das quadras, representou o país por anos. Agora, a responsabilidade é diferente: conduzir outros. A liderança mudou de forma — não de compromisso. ${pick(j.voice.closing)}`,
    RETIREMENT_THREAT:  (p, j) => `${pick(j.voice.opening)} A palavra não foi dita — mas foi deixada na mesa. ${p.name} e a aposentadoria: o circuito está em modo de espera depois de uma entrevista que revelou mais do que a pergunta pedia. ${pick(j.voice.closing)}`,
    RECORD_CHASE:       (p, j) => `${pick(j.voice.opening)} ${p.name} confirmou o que muitos especulavam: está perseguindo um recorde de forma intencional. "Quero aquele número. Ponto final." Em um esporte cheio de respostas diplomáticas, essa é uma declaração rara. ${pick(j.voice.closing)}`,
    COACHING_REFUSAL:   (p, j) => `${pick(j.voice.opening)} ${p.name} recusou. O nome do técnico que foi recusado não foi revelado — mas foi descrito como "o mais respeitado do circuito". A recusa diz algo sobre a direção que o atleta quer tomar. ${pick(j.voice.closing)}`,
    EARLY_PEAK_LAMENT:  (p, j) => `${pick(j.voice.opening)} ${p.name} olhou para trás e disse o que poucos dizem: "Cheguei rápido demais e paguei um preço que demorei para entender." A reflexão é de alguém que aprendeu — tarde, mas aprendeu. ${pick(j.voice.closing)}`,
  },
  // ── WELLNESS — nova categoria ──────────────────────────────────
  WELLNESS: {
    DIET_REVOLUTION:  (p, j) => `${pick(j.voice.opening)} ${p.name} mudou tudo no prato. A dieta nova gerou melhora mensurável — pelo menos é o que o atleta afirma. O circuito vai acompanhar os resultados para saber se a correlação vira causalidade. ${pick(j.voice.closing)}`,
    SLEEP_PROTOCOL:   (p, j) => `${pick(j.voice.opening)} ${p.name} e o sono. O protocolo — temperatura, escuridão, horário rígido — virou post viral. A resposta do circuito foi entre risos e anotações. Alguns estão copiando. ${pick(j.voice.closing)}`,
    RECOVERY_VIRAL:   (p, j) => `${pick(j.voice.opening)} O vídeo de ${p.name} às 5h da manhã com gelo até a cintura tem milhões de visualizações. O que o circuito achou bizarro na terça virou trend na quinta. ${pick(j.voice.closing)}`,
    ALTITUDE_CAMP:    (p, j) => `${pick(j.voice.opening)} ${p.name} sumiu por um mês. Voltou de altitude. A preparação específica que não aparece nos treinos convencionais — e que raramente aparece nas entrevistas — virou tema de conversa. ${pick(j.voice.closing)}`,
    WELLNESS_BRAND:   (p, j) => `${pick(j.voice.opening)} ${p.name} lança linha de bem-estar. A credibilidade vem do corpo: o atleta não está vendendo algo que nunca usou. O mercado respondeu antes do produto chegar às prateleiras. ${pick(j.voice.closing)}`,
    NO_PHONE_WEEK:    (p, j) => `${pick(j.voice.opening)} ${p.name} desligou. Uma semana inteira, documentada depois. "A semana mais produtiva dos últimos dois anos." O circuito digital vai discutir isso por tempo suficiente para ignorar a ironia. ${pick(j.voice.closing)}`,
    COLD_WATER_CONVERT: (p, j) => `${pick(j.voice.opening)} ${p.name} entrou no clube do banho frio. "Transformou minha recuperação" — declaração que o circuito vai testar individualmente nas próximas semanas. ${pick(j.voice.closing)}`,
  },
};

// ─────────────────────────────────────────────────────────────────
// HEADLINES POR EVENTO — lookup completo
// ─────────────────────────────────────────────────────────────────

const LIFE_EVENT_HEADLINES = {
  // PERSONAL
  ENGAGEMENT:              p => `${p.name} anuncia noivado`,
  MARRIAGE:                p => `${p.name} se casa`,
  SEPARATION:              p => `${p.name} e separação confirmada: o que muda na carreira?`,
  DIVORCE:                 p => `${p.name} conclui processo de divórcio`,
  CHILD_BORN:              p => `${p.name} é pai — e o circuito vai sentir`,
  TWINS_BORN:              p => `${p.name} anuncia nascimento de gêmeos`,
  ADOPTION:                p => `${p.name} adota criança`,
  NEW_PARTNER:             p => `${p.name} visto com novo parceiro(a)`,
  AFFAIR_RUMOR:            p => `Imprensa especula sobre caso extraconjugal de ${p.name}`,
  FAMILY_LOSS:             p => `${p.name} comunica perda de familiar`,
  MENTAL_HEALTH_BREAK:     p => `${p.name} anuncia pausa para cuidar da saúde mental`,
  THERAPY_PUBLIC:          p => `${p.name}: "Faço terapia. Faz parte do treino."`,
  HEALTH_SCARE:            p => `${p.name} passa por bateria de exames — comissão técnica confirma`,
  PUBLIC_COMING_OUT:       p => `${p.name} faz declaração que o circuito vai guardar`,
  SOBRIETY_JOURNEY:        p => `${p.name} revela batalha com dependência e jornada de recuperação`,
  RECONNECT_ROOTS:         p => `${p.name} volta às origens em projeto pessoal`,
  ESTRANGEMENT:            p => `Distanciamento familiar de ${p.name} confirmado por fontes próximas`,
  SIBLING_IN_SPORT:        p => `Irmão(ã) de ${p.name} estreia no profissionalismo`,
  // HOME
  MOVE_TO_TAX_HAVEN:       p => `${p.name} transfere residência`,
  NEW_PROPERTY:            p => `${p.name} adquire nova propriedade`,
  LUXURY_CAR:              p => `${p.name} é fotografado com novo carro de luxo`,
  YACHT_PURCHASE:          p => `${p.name} compra iate`,
  PRIVATE_JET:             p => `${p.name} adquire jato particular`,
  ART_COLLECTION:          p => `${p.name} revela coleção de arte acumulada em silêncio`,
  WINE_ESTATE:             p => `${p.name} lança rótulo próprio: vinícola comprada e já esgotada`,
  SOLD_PROPERTY:           p => `${p.name} vende propriedade — mudança de fase?`,
  // SOCIAL
  FOUNDATION_LAUNCH:       p => `${p.name} lança fundação`,
  BIG_DONATION:            p => `${p.name} faz doação expressiva`,
  CAUSE_CAMPAIGN:          p => `${p.name} usa plataforma para campanha social`,
  SCHOOL_OPENING:          p => `${p.name} inaugura escola`,
  ENVIRONMENTAL_PLEDGE:    p => `${p.name} firma compromisso ambiental`,
  CHARITY_TOURNAMENT:      p => `${p.name} organiza torneio beneficente`,
  POLITICAL_ENDORSEMENT:   p => `${p.name} entra na política: apoio público divide opiniões`,
  REFUGEE_SUPPORT:         p => `${p.name} visita campo de refugiados pessoalmente`,
  LGBTQ_ALLY:              p => `${p.name} se posiciona como aliado — declaração sem precedente no circuito`,
  ANTI_DOPING_CAMPAIGN:    p => `${p.name} assume liderança da campanha pelo esporte limpo`,
  DISASTER_RELIEF:         p => `${p.name} vai pessoalmente a área de desastre e lidera doações`,
  // BUSINESS
  BRAND_LAUNCH:            p => `${p.name} lança marca própria`,
  RESTAURANT_OPENING:      p => `${p.name} abre restaurante`,
  TECH_STARTUP:            p => `${p.name} investe em startup de tecnologia`,
  INVESTMENT:              p => `${p.name} diversifica patrimônio`,
  COACHING_ACADEMY:        p => `${p.name} cria academia de tênis`,
  APP_LAUNCH:              p => `${p.name} lança aplicativo`,
  FASHION_LINE:            p => `${p.name} entra na moda — coleção esgota em 48h`,
  SPORTS_OWNERSHIP:        p => `${p.name} se torna dono de clube esportivo`,
  CRYPTO_INVESTMENT:       p => `${p.name} entra no mercado de criptomoedas`,
  CRYPTO_LOSS:             p => `${p.name} admite perda em cripto: "Me empolguei"`,
  SPORTS_AGENCY:           p => `${p.name} funda agência para atletas jovens`,
  HOTEL_INVESTMENT:        p => `${p.name} investe em hotel de boutique no país natal`,
  // MEDIA
  DOCUMENTARY:             p => `Documentário sobre ${p.name} chega às telas`,
  AUTOBIOGRAPHY:           p => `${p.name} lança autobiografia`,
  MAGAZINE_COVER:          p => `${p.name} na capa`,
  TV_APPEARANCE:           p => `${p.name} em programa de TV`,
  PODCAST_LAUNCH:          p => `${p.name} lança podcast`,
  ACTING_ROLE:             p => `${p.name} estreia como ator`,
  SOCIAL_MEDIA_VIRAL:      p => `${p.name} viral nas redes`,
  AMBASSADOR_ROLE:         p => `${p.name} torna-se embaixador de marca`,
  COLUMN_NEWSPAPER:        p => `${p.name} vai escrever coluna semanal — sem filtro`,
  CHILDREN_BOOK:           p => `${p.name} lança livro infantil inspirado nos filhos`,
  MUSIC_COLLAB:            p => `${p.name} aparece em clipe — viral antes de estrear`,
  FASHION_CAMPAIGN:        p => `${p.name} na semana de moda internacional`,
  AWARD_SHOW_HOST:         p => `${p.name} apresenta premiação — "nasceu comunicador"`,
  SPORTS_COMMENTARY:       p => `${p.name} estreia como comentarista esportivo`,
  // CONTROVERSY
  CONTROVERSIAL_STATEMENT: p => `${p.name} faz declaração polêmica`,
  PUBLIC_DISPUTE:          p => `${p.name} em briga pública`,
  DOPING_ALLEGATION:       p => `Suspeita de doping envolve ${p.name} — ATP investiga`,
  DOPING_CLEARED:          p => `${p.name} inocentado de suspeita de doping`,
  TAX_EVASION:             p => `Autoridades investigam declarações fiscais de ${p.name}`,
  ON_COURT_INCIDENT:       p => `${p.name} recebe punição por incidente em quadra`,
  GAMBLING_RUMOR:          p => `Rumores ligam ${p.name} a apostas esportivas`,
  RACKET_SMASH_VIRAL:      p => `${p.name} quebra raquete e o vídeo vira meme internacional`,
  ATP_FINE:                p => `${p.name} multado pela ATP`,
  SUSPENSION:              p => `${p.name} suspenso — ATP aplica punição após acúmulo`,
  RIVAL_PUBLIC_FEUD:       p => `${p.name} e rival trocam declarações: a briga saiu da quadra`,
  COACH_DRAMA:             p => `${p.name} demite técnico de forma abrupta`,
  FEDERATION_CONFLICT:     p => `${p.name} em rota de colisão com federação nacional`,
  SOCIAL_MEDIA_MELTDOWN:   p => `${p.name}: posts erráticos nas redes geram preocupação`,
  CHEATING_ALLEGATION:     p => `Adversário acusa ${p.name} — ATP abre investigação`,
  // COMMUNITY
  NATIONAL_HERO:           p => `${p.name} recebe honraria de herói nacional`,
  STREET_NAMED:            p => `Cidade natal batiza rua em homenagem a ${p.name}`,
  NATIONAL_RETURN:         p => `${p.name} retorna para morar em seu país`,
  UNIVERSITY_DEGREE:       p => `${p.name} conclui graduação universitária`,
  MENTORING_PROSPECT:      p => `${p.name} assume papel de mentor para jovem talento`,
  OLYMPIC_AMBASSADOR:      p => `${p.name} nomeado embaixador olímpico`,
  NATIONAL_AWARD:          p => `${p.name} recebe condecoração nacional`,
  HONORARY_CITIZENSHIP:    p => `${p.name} recebe cidadania honorária`,
  INDIGENOUS_HERITAGE:     p => `${p.name} celebra herança cultural — declaração histórica`,
  YOUTH_EVENT:             p => `${p.name} com jovens tenistas — sem câmeras, sem ranking`,
  // SPIRITUAL
  SPIRITUAL_RETREAT:       p => `${p.name} em retiro espiritual`,
  PILGRIMAGE:              p => `${p.name} realiza peregrinação`,
  CAREER_DOUBT:            p => `${p.name} questiona continuidade no circuito`,
  MINDFULNESS_ADVOCACY:    p => `${p.name} torna-se defensor da saúde mental no esporte`,
  RELIGION_CHANGE:         p => `${p.name} revela mudança religiosa: "Me ancora diferente"`,
  PHILOSOPHY_BOOK:         p => `${p.name} escreve sobre como viver — não sobre tênis`,
  VEGAN_CONVERSION:        p => `${p.name} virou vegano: "Não volto atrás"`,
  ANTI_MATERIALISM:        p => `${p.name} surpreende: "Reduzi tudo. Foi a melhor decisão."`,
  // CAREER
  COMEBACK_STATEMENT:      p => `${p.name}: "Não terminei. O melhor ainda vem."`,
  RANKING_CRISIS:          p => `${p.name} fala sem rodeios sobre queda no ranking`,
  WILDCARD_ACCEPTANCE:     p => `${p.name} aceita wildcard — pedindo uma chance`,
  NATIONAL_CAPTAINCY:      p => `${p.name} assume capitania da equipe nacional`,
  RETIREMENT_THREAT:       p => `${p.name} não descarta aposentadoria: "Preciso pensar"`,
  RECORD_CHASE:            p => `${p.name} assume: está perseguindo recorde histórico`,
  COACHING_REFUSAL:        p => `${p.name} recusa técnico renomado: "Não é a direção certa"`,
  EARLY_PEAK_LAMENT:       p => `${p.name}: "Cheguei rápido demais. Paguei um preço."`,
  // WELLNESS
  DIET_REVOLUTION:         p => `${p.name} muda dieta e atribui melhora de performance`,
  SLEEP_PROTOCOL:          p => `Protocolo de sono de ${p.name} vira viral`,
  RECOVERY_VIRAL:          p => `Rotina de recuperação de ${p.name} chega a milhões`,
  ALTITUDE_CAMP:           p => `${p.name} some por um mês — voltou de altitude`,
  WELLNESS_BRAND:          p => `${p.name} lança marca de bem-estar`,
  NO_PHONE_WEEK:           p => `${p.name} documenta semana sem celular: "A mais produtiva"`,
  COLD_WATER_CONVERT:      p => `${p.name} defende banho frio: "Transformou a recuperação"`,
};

/**
 * Gera um artigo de notícia a partir de um evento de vida.
 * Exportado para uso no ADVANCE_YEAR do UniverseManager.
 *
 * @param {object} player  — jogador completo (com lifeData e personality)
 * @param {object} event   — LifeEvent do lifeEventLog
 * @param {number} year    — temporada atual
 * @param {object} opts    — { asRumor?, priority? }
 * @returns {Article | null}
 */
export function genLifeEventArticle(player, event, year, opts = {}) {
  const category = event.category;
  const typeId   = event.type;
  const asRumor  = opts.asRumor ?? LIFE_EVENT_IS_RUMOR.has(typeId);

  // Jornalista: para controvérsia/rumor, prefere FONTAINE ou REED
  let journalistStyle = LIFE_EVENT_JOURNALIST_MAP[category] ?? 'GOSSIP';
  if (asRumor) journalistStyle = Math.random() < 0.6 ? 'GOSSIP' : 'OPINION';

  // Jornalista específico baseado na personalidade do jogador
  const personalityJ = _journalistForPlayer(player);
  const journalist   = personalityJ ?? pickJournalist(journalistStyle);
  const j            = journalist;

  // Corpo do artigo
  const voiceFn = LIFE_EVENT_VOICES[category]?.[typeId];
  let body = voiceFn
    ? voiceFn(player, j)
    : `${pick(j.voice.opening)} ${event.description}. ${pick(j.voice.closing)}`;
  body = enrichLifeEventBody(body, player, event);

  // Para rumores, injeta linguagem de incerteza se ainda não está no corpo
  if (asRumor && !body.includes('fontes') && !body.includes('especul') && !body.includes('rumor')) {
    body = body.replace(pick(j.voice.opening), `${pick(j.voice.opening)} Fontes próximas ao circuito indicam:`);
  }

  // Headline
  const headlineFn = LIFE_EVENT_HEADLINES[typeId];
  const headline   = headlineFn ? headlineFn(player) : event.description;

  // Tipo de artigo no feed
  const articleType = asRumor ? 'LIFE_RUMOR'
    : category === 'CONTROVERSY' ? 'LIFE_RUMOR'
    : 'LIFE_EVENT';

  // Tags
  const tags = ['vida', category.toLowerCase(), typeId.toLowerCase(), String(year)];
  if (asRumor) tags.push('rumor', 'bastidores');
  if (category === 'CONTROVERSY') tags.push('polêmica');
  if (category === 'CAREER') tags.push('carreira');

  return {
    id:        `life-${player.id}-${typeId}-${year}-${Date.now()}`,
    type:      articleType,
    journalist,
    tournament: null,
    year,
    player,
    headline,
    deck:      event.description,
    body,
    length:    ['PERSONAL','CONTROVERSY','CAREER'].includes(category) ? 'SHORT' : 'MEDIUM',
    tags,
    isLifeEvent:       true,
    lifeEventType:     typeId,
    lifeEventCategory: category,
    isRumor:           asRumor,
    priority:          opts.priority ?? (LIFE_EVENT_NEWS_VALUE[typeId] ?? 3),
    createdAt:         Date.now(),
  };
}

function enrichLifeEventBody(body, player, event) {
  const fragments = [];
  const lm = player?.lifeMemory ?? {};
  const ld = player?.lifeData ?? {};
  const publicValues = ld.values?.publicValues ?? null;
  const wealth = ld.wealth?.lifestyle ?? null;
  const family = lm.family?.anchors?.[0] ?? lm.family?.milestones?.[0] ?? null;
  const project = lm.values?.projects?.[0] ?? null;
  const possession = lm.favorites?.possessions?.[0] ?? null;
  const place = lm.favorites?.places?.[0] ?? null;

  if (event.category === 'PERSONAL' && family?.label) {
    fragments.push(`No entorno do jogador, ${family.label} aparece como um dos eixos afetivos que ajudam a explicar como ele atravessa a vida do circuito.`);
  }
  if (event.category === 'SOCIAL' || event.category === 'COMMUNITY') {
    if (publicValues?.flagshipProject?.label) fragments.push(`A iniciativa conversa com um projeto maior: ${publicValues.flagshipProject.label}, hoje ${publicValues.flagshipProject.maturity ?? 'em desenvolvimento'}.`);
    else if (project?.label) fragments.push(`Não é um gesto isolado: ${project.label} já vinha aparecendo como uma das marcas públicas de sua trajetória.`);
  }
  if (event.category === 'HOME' || event.category === 'BUSINESS') {
    if (wealth?.philosophy?.label) fragments.push(`A decisão combina com sua relação declarada com dinheiro, mais próxima de ${wealth.philosophy.label}, entre liberdade pessoal, patrimônio e imagem.`);
    else if (possession?.label) fragments.push(`${possession.label} já era uma pista de como fama e patrimônio passaram a ocupar espaço na narrativa fora da quadra.`);
  }
  if (event.category === 'CONTROVERSY' && publicValues?.controversyRisk >= 60) {
    fragments.push(`O episódio também encontra um personagem público menos neutro: sua postura fora da quadra já carregava temperatura alta antes desta nova crise.`);
  }
  if (event.category === 'SPIRITUAL' && place?.label) {
    fragments.push(`Pessoas próximas descrevem ${place.label} como um ponto de referência emocional para o jogador, um lugar que volta quando a temporada exige silêncio.`);
  }
  if (!fragments.length) return body;
  return `${body} ${pick(fragments)}`;
}

/**
 * Processa um batch de eventos de vida gerados pelo rollLifeEvents()
 * e retorna apenas os artigos que merecem ir ao feed.
 *
 * Chamar no ADVANCE_YEAR após processar todos os jogadores.
 *
 * @param {Array<{player, events}>} playerEventPairs
 *   — array de { player, events: LifeEvent[] } retornados por rollLifeEvents()
 * @param {number} year
 * @param {object} state — estado completo (para calcular rank)
 * @param {object} opts
 *   — maxArticles: teto total de artigos (default 12)
 *   — maxPerPlayer: máximo por jogador (default 2)
 * @returns {Article[]}
 */
export function generateLifeEventNews(playerEventPairs, year, state = {}, opts = {}) {
  const maxArticles  = opts.maxArticles  ?? 12;
  const maxPerPlayer = opts.maxPerPlayer ?? 2;

  const candidates = []; // { article, priority, player }

  for (const { player, events } of playerEventPairs) {
    if (!events?.length) continue;

    let playerArticleCount = 0;

    // Ordena eventos do jogador por valor decrescente para pegar os melhores
    const sorted = [...events].sort(
      (a, b) => (LIFE_EVENT_NEWS_VALUE[b.type] ?? 0) - (LIFE_EVENT_NEWS_VALUE[a.type] ?? 0)
    );

    for (const event of sorted) {
      if (playerArticleCount >= maxPerPlayer) break;

      const { publish, asRumor, priority } = shouldPublishLifeEvent(player, event, state);
      if (!publish) continue;

      const article = genLifeEventArticle(player, event, year, { asRumor, priority });
      if (!article) continue;

      candidates.push({ article, priority: priority ?? 0, player });
      playerArticleCount++;
    }
  }

  if (!candidates.length) return [];

  // Ordena por prioridade decrescente, misturando eventualidades aleatórias
  // para que jogadores menores com eventos graves possam aparecer
  candidates.sort((a, b) => {
    // Controvérsias e crises sobem ao topo independente do jogador
    const aHighAlert = ['DOPING_ALLEGATION','SUSPENSION','PUBLIC_COMING_OUT','SOBRIETY_JOURNEY','RETIREMENT_THREAT'].includes(a.article.lifeEventType);
    const bHighAlert = ['DOPING_ALLEGATION','SUSPENSION','PUBLIC_COMING_OUT','SOBRIETY_JOURNEY','RETIREMENT_THREAT'].includes(b.article.lifeEventType);
    if (aHighAlert && !bHighAlert) return -1;
    if (!aHighAlert && bHighAlert)  return  1;
    return b.priority - a.priority;
  });

  return candidates.slice(0, maxArticles).map(c => c.article);
}


// ── OURO OLÍMPICO ─────────────────────────────────────────────────

function genOlympicGold({ tournament, bracket, year, allPlayers }) {
  const champ = bracket.champion;
  if (!champ) return null;

  const champFull  = allPlayers.find(p => p.id === champ.id) ?? champ;
  const finalMatch = bracket.rounds?.at(-1)?.[0];
  const finalist   = finalMatch
    ? (finalMatch.playerA?.id === champ.id ? finalMatch.playerB : finalMatch.playerA)
    : null;
  const score     = finalMatch ? formatScore(finalMatch.result?.setsDetail) : '';
  const medals    = champFull.careerTitles?.olympic ?? {};
  const goldCount = medals.gold ?? 1;
  const journalist = chance(0.6) ? JOURNALISTS.CARVALHO : JOURNALISTS.SANTOS;
  const j = journalist;

  const isFirstGold = goldCount === 1;
  const countryName = champFull.nationality ?? 'seu país';

  const headline = isFirstGold
    ? `${champ.name} é campeão olímpico. Ouro que vai além do tênis`
    : `${champ.name} conquista o segundo ouro olímpico — um legado que transcende o circuito`;

  const deck = finalist
    ? `Final olímpica. ${score ? score + ' contra ' + finalist.name + '. ' : ''}O pódio mais alto do esporte.`
    : `O tênis tem campeão olímpico. E esse título pesa diferente de todos os outros.`;

  const momentLine = careerMomentNarrativeLine(champFull, { year });

  const body = [
    pick(j.voice.opening),
    isFirstGold
      ? `Há títulos que cabem no ranking. Há títulos que não cabem em lugar nenhum — só na memória. ${champ.name} conquistou o ouro olímpico e o tênis vai guardar esse momento por tempo suficiente para entender o que aconteceu.`
      : `${champ.name} volta ao pódio mais alto. O segundo ouro olímpico é mais raro que qualquer Grand Slam — e carrega um peso diferente, porque representa algo que nenhum troféu de circuito pode traduzir: o país, a bandeira, o que vem antes do ranking.`,
    finalist ? `A final foi contra ${finalist.name}${score ? ', por ' + score : ''}. O tênis não parou para assistir — parou o mundo inteiro.` : '',
    `${countryName} tem seu campeão. ${champ.name} tem seu ouro. E o circuito vai recomeçar na próxima semana como se nada tivesse acontecido — mas algo aconteceu.`,
    momentLine || '',
    pick(j.voice.closing),
  ].filter(Boolean).join(' ');

  return {
    id:          `olympic-gold-${champ.id}-${year}`,
    type:        'OLYMPIC_GOLD',
    journalist,
    tournament:  { id: tournament.id, name: tournament.name, category: 'OLYMPICS', surface: tournament.surface },
    year,
    player:      champ,
    playerB:     finalist ?? null,
    headline,
    deck,
    body,
    length:      'LONG',
    tags:        ['olimpíadas', 'ouro', 'medalha', countryName.toLowerCase(), String(year)],
    isOlympic:   true,
    createdAt:   Date.now(),
  };
}

// ── MEDALHA OLÍMPICA (prata / bronze) ─────────────────────────────

function genOlympicMedal({ tournament, player, medal, year, opponent }) {
  const journalist = JOURNALISTS.SANTOS;
  const j = journalist;
  const icon = medal === 'SILVER' ? '🥈' : '🥉';
  const medalName = medal === 'SILVER' ? 'prata' : 'bronze';

  const headline = `${icon} ${player.name} leva a ${medalName} olímpica — e ninguém vai esquecer essa performance`;
  const deck = `Uma medalha olímpica é uma medalha olímpica. O tênis tem esse mérito.`;

  const body = [
    pick(j.voice.opening),
    medal === 'SILVER'
      ? `${player.name} chegou à final olímpica. A prata dói de um jeito que os outros torneios não conseguem reproduzir — porque a final era para ouro, e o ouro foi${opponent ? ' para ' + opponent.name : ' para outro lado'}.`
      : `O bronze olímpico de ${player.name} vai aparecer em bios e verbetes por décadas. Não importa o que o circuito regular diz sobre a semana — essa medalha fica.`,
    pick(j.voice.closing),
  ].filter(Boolean).join(' ');

  return {
    id:          `olympic-medal-${player.id}-${medal}-${year}`,
    type:        'OLYMPIC_MEDAL',
    journalist,
    tournament:  { id: tournament.id, name: tournament.name, category: 'OLYMPICS', surface: tournament.surface },
    year,
    player,
    playerB:     opponent ?? null,
    headline,
    deck,
    body,
    length:      'SHORT',
    tags:        ['olimpíadas', medalName, String(year)],
    isOlympic:   true,
    createdAt:   Date.now(),
  };
}

// ── TIRADA DO TORNEIO OLÍMPICO ────────────────────────────────────

/**
 * Gera todos os artigos do torneio olímpico.
 * Chamado por generateTournamentNews quando tournament.isOlympic === true.
 */
export function generateOlympicNews(tournament, bracket, state) {
  const articles = [];
  const year     = state.year;
  const allPlayers = [...(state.tourPlayers ?? []), ...(state.prospects ?? [])];

  const rounds   = bracket.rounds ?? [];
  const champ    = bracket.champion;
  const finalMatch = rounds.at(-1)?.[0];
  const finalist   = finalMatch
    ? (finalMatch.playerA?.id === champ?.id ? finalMatch.playerB : finalMatch.playerA)
    : null;

  // Semifinalistas (bronze)
  const sfRound = rounds.at(-2) ?? [];
  const sfLosers = [];
  for (const match of sfRound) {
    if (match.isBye || !match.winner || !match.playerA || !match.playerB) continue;
    const loser = match.playerA.id === match.winner.id ? match.playerB : match.playerA;
    if (loser) sfLosers.push(loser);
  }

  // 1. Ouro
  if (champ) {
    const goldArt = genOlympicGold({ tournament, bracket, year, allPlayers });
    if (goldArt) articles.push(goldArt);
  }

  // 2. Prata
  if (finalist) {
    articles.push(genOlympicMedal({ tournament, player: finalist, medal: 'SILVER', year, opponent: champ }));
  }

  // 3. Bronze (até 2 ganhadores — semifinalistas perdedores)
  for (const loser of sfLosers.slice(0, 2)) {
    articles.push(genOlympicMedal({ tournament, player: loser, medal: 'BRONZE', year, opponent: null }));
  }

  // 4. Duelo épico (se houver)
  for (let ri = rounds.length - 1; ri >= Math.max(0, rounds.length - 3); ri--) {
    for (const match of rounds[ri]) {
      if (match.isBye || !match.winner) continue;
      const epicArt = genEpicMatch({ tournament: { ...tournament, category: 'OLYMPICS' }, match, year, round: ri === rounds.length - 1 ? 'F' : ri === rounds.length - 2 ? 'SF' : 'QF' });
      if (epicArt) { articles.push(epicArt); break; }
    }
  }

  return articles;
}

// ═══════════════════════════════════════════════════════════════════
// GERADORES EXCLUSIVOS POR TIER
// ═══════════════════════════════════════════════════════════════════

// ── SCOUT REPORT (ATP_PROSPECTS) ─────────────────────────────────
function genScoutReport({ tournament, player, year }) {
  const j   = JOURNALISTS.NAKANO;
  const age = player.age ?? 18;
  const attrs = player.attributes ?? {};
  const serve  = attrs.serve    ?? attrs.SERVE    ?? 50;
  const fh     = attrs.forehand ?? attrs.FOREHAND ?? 50;
  const mental = attrs.mental   ?? attrs.MENTAL   ?? 50;
  const topAttr = serve > fh && serve > mental ? 'saque'
    : fh > mental ? 'direita' : 'cabeça fria nos momentos decisivos';

  return {
    id:            `scout-${player.id}-${tournament.id}-${year}`,
    type:          'PROSPECT',
    subtype:       'SCOUT_REPORT',
    journalist:    j,
    tournament:    { id: tournament.id, name: tournament.name, category: tournament.category, surface: tournament.surface },
    year, player,
    headline: `Scout report: ${player.name} vence o ${tournament.name} — o que os especialistas estão observando`,
    deck:     `${age} anos. O ${topAttr} já tem maturidade acima da faixa etária. O circuito foi avisado.`,
    body:     [
      pick(j.voice.opening),
      `${player.name} não venceu o ${tournament.name} por acidente. Com ${age} anos, o ${topAttr} já carrega a consistência que o circuito profissional cobra muito mais tarde na maioria das carreiras.`,
      `O que os olheiros registraram nesta semana: pressão nos momentos decisivos, capacidade de adaptar o jogo entre sets, leitura de jogo que não é treinada — é intuição. São as marcas que separam prospects que aparecem dos que ficam.`,
      `O teto técnico ainda não foi testado de verdade. Essa é a parte que torna esse nome interessante.`,
      pick(j.voice.closing),
    ].filter(Boolean).join(' '),
    length: 'MEDIUM',
    tags:   ['scout', 'prospect', 'revelação', `${age}-anos`],
    isScoutReport: true,
    createdAt: Date.now(),
  };
}

// ── RANKING IMPACT (ATP_100) ──────────────────────────────────────
function genRankingImpact({ tournament, player, year, pointsGained }) {
  const j          = JOURNALISTS.SILVA;
  const rank       = player.rankPosition ?? '?';
  const pointsText = pointsGained ? `${pointsGained} pontos` : 'pontos expressivos';

  return {
    id:      `ranking-impact-${player.id}-${tournament.id}-${year}`,
    type:    'CHAMPION',
    subtype: 'RANKING_IMPACT',
    journalist: j,
    tournament: { id: tournament.id, name: tournament.name, category: tournament.category, surface: tournament.surface },
    year, player,
    headline: `${player.name} leva o ${tournament.name} — e o que ${pointsText} mudam na corrida pelo ranking`,
    deck:     `No circuito de base, títulos não são só troféus. São coordenadas no ranking que abrem ou fecham portas.`,
    body:     [
      pick(j.voice.opening),
      `${player.name} saiu de ${tournament.location ?? tournament.name} com o troféu e ${pointsText} na conta. Para quem está no ${rankLabel(rank)}, esse bloco não é rotina — é salto de categoria.`,
      `No Challenger, a diferença entre vencer e perder na semana errada é a diferença entre garantir acesso ao circuito principal ou passar pelo qualifying de novo. ${player.name} escolheu a semana certa.`,
      pick(j.voice.closing),
    ].filter(Boolean).join(' '),
    length: 'SHORT',
    tags:   ['ranking', 'challenger', 'pontos'],
    isRankingImpact: true,
    createdAt: Date.now(),
  };
}

// ── POINTS RACE (ATP_500) ─────────────────────────────────────────
function genPointsRace({ tournament, bracket, year }) {
  const champ = bracket.champion;
  if (!champ) return null;
  const j    = chance(0.6) ? JOURNALISTS.PETROV : JOURNALISTS.REED;
  const rank = champ.rankPosition ?? '?';

  return {
    id:      `points-race-${champ.id}-${tournament.id}-${year}`,
    type:    'ANALYSIS',
    subtype: 'POINTS_RACE',
    journalist: j,
    tournament: { id: tournament.id, name: tournament.name, category: tournament.category, surface: tournament.surface },
    year,
    player: champ,
    headline: `${tournament.name}: o título que muda a corrida de pontos da temporada`,
    deck:     `Um 500 não é só um troféu — é posicionamento. E o circuito está começando a tomar sua forma.`,
    body:     [
      pick(j.voice.opening),
      `${champ.name} acumula os pontos do ${tournament.name} num momento em que cada bloco pesa duplo. A corrida para o Finals não começa em novembro — começa aqui.`,
      j.style === 'ANALYTICAL'
        ? `No ${rankLabel(rank)}, ${champ.name} consolida presença nas zonas de classificação para a fase final do circuito.`
        : `${champ.name} garantiu que seu nome vai aparecer nas conversas certas nas próximas semanas. Esse é o tipo de resultado que o circuito não esquece.`,
      pick(j.voice.closing),
    ].filter(Boolean).join(' '),
    length: 'MEDIUM',
    tags:   ['pontos', 'temporada', 'corrida', tournament.surface?.toLowerCase()].filter(Boolean),
    isPointsRace: true,
    createdAt: Date.now(),
  };
}

// ── MANDATORY FIELD (MASTERS_1000) ───────────────────────────────
function genMandatoryField({ tournament, bracket, year, allPlayers }) {
  const champ = bracket.champion;
  const j     = chance(0.6) ? JOURNALISTS.CARVALHO : JOURNALISTS.PETROV;

  const top8 = allPlayers
    .filter(p => (p.rankPosition ?? 999) <= 8)
    .sort((a, b) => (a.rankPosition ?? 999) - (b.rankPosition ?? 999));

  const sfPlayers = new Set();
  const rounds    = bracket.rounds ?? [];
  for (const match of (rounds.at(-2) ?? [])) {
    if (match.playerA?.id) sfPlayers.add(match.playerA.id);
    if (match.playerB?.id) sfPlayers.add(match.playerB.id);
    if (match.winner?.id)  sfPlayers.add(match.winner.id);
  }
  const topWhoFailed = top8.filter(p => !sfPlayers.has(p.id) && p.id !== champ?.id);

  return {
    id:      `mandatory-field-${tournament.id}-${year}`,
    type:    'ANALYSIS',
    subtype: 'MANDATORY_FIELD',
    journalist: j,
    tournament: { id: tournament.id, name: tournament.name, category: tournament.category, surface: tournament.surface },
    year,
    player: champ ?? null,
    headline: `${tournament.name}: campo obrigatório, resultados que o ranking não perdoa`,
    deck:     `Os melhores do mundo estiveram aqui por obrigação. Nem todos corresponderam.`,
    body:     [
      pick(j.voice.opening),
      `Um Masters reúne os melhores sem opção de recusa. O campo não tem desculpa, o campeão não tem asterisco.`,
      topWhoFailed.length > 0
        ? `${topWhoFailed.slice(0, 2).map(p => p.name).join(' e ')} saíram antes do esperado. Em campo obrigatório, isso pesa no ranking e na narrativa da temporada de formas que outros torneios não permitem.`
        : `Os favoritos corresponderam. O torneio entregou o que prometia.`,
      champ ? `${champ.name} aproveitou melhor do que todos os outros. Num campo obrigatório, isso é tudo.` : '',
      pick(j.voice.closing),
    ].filter(Boolean).join(' '),
    length: 'MEDIUM',
    tags:   ['masters', 'campo', 'análise', tournament.surface?.toLowerCase()].filter(Boolean),
    isMandatoryField: true,
    createdAt: Date.now(),
  };
}

// ── BO5 BATTLE (GRAND_SLAM) ───────────────────────────────────────
function genBO5Battle({ tournament, bracket, year }) {
  const rounds = bracket.rounds ?? [];
  let bestMatch = null, bestRound = null, bestSets = 0;
  for (let ri = rounds.length - 1; ri >= Math.max(0, rounds.length - 3); ri--) {
    const fromEnd = rounds.length - 1 - ri;
    const rl = fromEnd === 0 ? 'F' : fromEnd === 1 ? 'SF' : 'QF';
    for (const match of rounds[ri]) {
      if (match.isBye || !match.winner) continue;
      const sets = match.result?.setsDetail?.length ?? 0;
      if (sets > bestSets) { bestMatch = match; bestRound = rl; bestSets = sets; }
    }
  }
  if (!bestMatch || bestSets < 4) return null;
  const winner = bestMatch.winner;
  const loser  = bestMatch.playerA?.id === winner?.id ? bestMatch.playerB : bestMatch.playerA;
  if (!winner || !loser) return null;
  const j          = chance(0.6) ? JOURNALISTS.CARVALHO : JOURNALISTS.SANTOS;
  const score      = formatScore(bestMatch.result?.setsDetail);
  const roundLabel = { F: 'Final', SF: 'Semifinal', QF: 'Quartas' }[bestRound] ?? bestRound;

  return {
    id:      `bo5-${winner.id}-${loser.id}-${tournament.id}-${year}`,
    type:    'EPIC_MATCH',
    subtype: 'BO5_BATTLE',
    journalist: j,
    tournament: { id: tournament.id, name: tournament.name, category: tournament.category, surface: tournament.surface },
    year,
    player:  winner,
    playerB: loser,
    headline: `A batalha de ${bestSets} sets que ${tournament.location} vai guardar: ${winner.name} × ${loser.name}`,
    deck:     `${score}. ${roundLabel} de ${tournament.name}. Isso é o que o melhor de cinco sets permite que aconteça.`,
    body:     [
      pick(j.voice.opening),
      `O melhor de cinco sets existe por uma razão: permite que partidas como essa aconteçam. ${winner.name} e ${loser.name} precisaram de ${bestSets} sets na ${roundLabel} de ${tournament.name}.`,
      `O placar ${score} não captura o que aconteceu dentro desses sets. Em Slams, os jogadores têm tempo para se reinventar. Tempo para sofrer e voltar. Isso muda o tênis.`,
      `${winner.name} encontrou o que precisava no momento certo. ${loser.name} deixou tudo em quadra. Os dois saíram diferentes de como entraram.`,
      pick(j.voice.closing),
    ].filter(Boolean).join(' '),
    length: 'LONG',
    tags:   ['grand-slam', 'batalha', `${bestSets}-sets`, bestRound?.toLowerCase()].filter(Boolean),
    isBO5Battle: true,
    createdAt: Date.now(),
  };
}

// ── SLAM HISTORY (GRAND_SLAM) ─────────────────────────────────────
function genSlamHistory({ tournament, bracket, year, allPlayers }) {
  const champ = bracket.champion;
  if (!champ) return null;
  const champFull = allPlayers.find(p => p.id === champ.id) ?? champ;
  const slams     = champFull.careerTitles?.gs ?? 0;
  if (slams < 2) return null;
  const j        = JOURNALISTS.CARVALHO;
  const ordinals = ['', 'primeiro', 'segundo', 'terceiro', 'quarto', 'quinto', 'sexto', 'sétimo', 'oitavo', 'nono', 'décimo'];
  const ordinal  = ordinals[slams] ?? `${slams}º`;

  return {
    id:      `slam-history-${champ.id}-${tournament.id}-${year}`,
    type:    'RECORD',
    subtype: 'SLAM_HISTORY',
    journalist: j,
    tournament: { id: tournament.id, name: tournament.name, category: tournament.category, surface: tournament.surface },
    year,
    player: champ,
    headline: slams >= 5
      ? `${champ.name} e o ${ordinal} Grand Slam — o circuito começa a usar a palavra legado com mais frequência`
      : `${champ.name}: ${ordinal} Grand Slam. A coleção que o circuito acompanha crescer`,
    deck:     `Cada Grand Slam adicional muda o contexto histórico. O ${ordinal} de ${champ.name} não é o mesmo que o primeiro — e nunca vai ser.`,
    body:     [
      pick(j.voice.opening),
      slams >= 5
        ? `Há um número de Grand Slams a partir do qual o circuito para de contar e começa a comparar. ${champ.name} está nesse território agora.`
        : `O ${ordinal} Grand Slam tem sabor diferente do primeiro. O primeiro é alívio, surpresa, prova. O ${ordinal} é confirmação — e a confirmação tem seu próprio peso.`,
      `${tournament.name} em ${tournament.location} entra na lista. O que essa lista vai significar no final da carreira de ${champ.name} é a pergunta que o circuito ainda não tem resposta.`,
      pick(j.voice.closing),
    ].filter(Boolean).join(' '),
    length: 'LONG',
    tags:   ['grand-slam', 'história', 'legado', `${slams}-slams`],
    isSlamHistory: true,
    createdAt: Date.now(),
  };
}

// ── SEASON NARRATIVE (FINALS) ─────────────────────────────────────
function genSeasonNarrative({ tournament, bracket, year }) {
  const j     = JOURNALISTS.KOWALSKI;
  const champ = bracket.champion;

  return {
    id:      `season-narrative-${tournament.id}-${year}`,
    type:    'ANALYSIS',
    subtype: 'SEASON_NARRATIVE',
    journalist: j,
    tournament: { id: tournament.id, name: tournament.name, category: tournament.category, surface: tournament.surface },
    year,
    player: champ ?? null,
    headline: `${tournament.name} ${year}: oito jogadores, uma temporada inteira de contexto`,
    deck:     `Só os melhores do ano chegam aqui. O torneio é o resumo de tudo que aconteceu antes.`,
    body:     [
      pick(j.voice.opening),
      `Cada nome neste draw chegou aqui por alguma razão que a temporada escreveu. Não é só ranking — é narrativa. Houve torneios decisivos, semanas que definiram o ano, resultados que ninguém esperava mas que, olhando agora, fazem sentido.`,
      champ
        ? `${champ.name} saiu daqui como campeão. É o encerramento de uma temporada que, analisando o ano inteiro, faz sentido — ou não, e o circuito vai debater isso até janeiro.`
        : `O campeão do ${tournament.name} encerra o ano como a última voz da temporada.`,
      `Os Finals existem para dar ao circuito um encerramento com os melhores, na melhor forma, quando o ano já foi vivido. O resultado aqui ressignifica tudo que veio antes.`,
      pick(j.voice.closing),
    ].filter(Boolean).join(' '),
    length: 'LONG',
    tags:   ['finals', 'temporada', 'análise', String(year)],
    isSeasonNarrative: true,
    createdAt: Date.now(),
  };
}

// ── EARNED SPOT (FINALS) ──────────────────────────────────────────
function genEarnedSpot({ tournament, bracket, year, allPlayers }) {
  const champ = bracket.champion;
  if (!champ) return null;
  const j          = JOURNALISTS.KOWALSKI;
  const champFull  = allPlayers.find(p => p.id === champ.id) ?? champ;
  const momentLine = careerMomentNarrativeLine(champFull, { year });
  const narrative  = champFull.personality?.currentState?.publicNarrative ?? '';

  return {
    id:      `earned-spot-${champ.id}-${tournament.id}-${year}`,
    type:    'CHAMPION',
    subtype: 'EARNED_SPOT',
    journalist: j,
    tournament: { id: tournament.id, name: tournament.name, category: tournament.category, surface: tournament.surface },
    year,
    player: champ,
    headline: `${champ.name} merecia estar aqui — e esta semana provou que merecia sair com o título`,
    deck:     `A vaga foi conquistada ao longo de uma temporada. O título, esta semana. São duas vitórias com pesos diferentes.`,
    body:     [
      pick(j.voice.opening),
      `Chegar ao Finals já é um statement de temporada. Cada um dos oito nomes passou por momentos que classificaram — torneios ganhos, semanas que pareciam impossíveis, rankings que se moveram quando mais importava.`,
      `${champ.name} fez isso melhor do que qualquer outro este ano. A temporada completa — não só esta semana, não só o último game.`,
      momentLine || narrative || `O circuito vai lembrar deste ano quando o nome de ${champ.name} aparecer nas conversas sobre o que a temporada produziu.`,
      pick(j.voice.closing),
    ].filter(Boolean).join(' '),
    length: 'LONG',
    tags:   ['finals', 'campeão', 'temporada', String(year)],
    isEarnedSpot: true,
    createdAt: Date.now(),
  };
}

// ═══════════════════════════════════════════════════════════════════
// ORQUESTRADOR PRINCIPAL — TIER-AWARE
// ═══════════════════════════════════════════════════════════════════

export function generateTournamentNews(tournament, bracket, state, result = null) {
  // Olimpíadas têm geração de notícias própria
  if (tournament.isOlympic) {
    return generateOlympicNews(tournament, bracket, state);
  }

  const articles      = [];
  const year          = state.year;
  const rivalrySystem = state.rivalrySystem;
  const allPlayers    = [...(state.tourPlayers ?? []), ...(state.prospects ?? [])];
  const nextTournament = state?.nextTournament ?? null;
  const tournamentChapter = state?.preparedTournamentPackage?.calendarContext?.tournamentChapter
    ?? state?.preparedTournamentPackageCache?.[tournament?.id]?.calendarContext?.tournamentChapter
    ?? null;

  // ── Tier config ───────────────────────────────────────────────
  const tier       = TOURNAMENT_TIER_CONFIG[tournament.category] ?? TOURNAMENT_TIER_CONFIG.ATP_250;
  const isProspect = tournament.category === 'ATP_PROSPECTS';

  // Journalist picker respeitando preferências do tier
  function pickJ(preferredStyle, excludeIds = []) {
    if (tier.preferredJournalists.length && chance(0.65)) {
      const pool = tier.preferredJournalists
        .map(id => JOURNALISTS[id])
        .filter(j => j && !excludeIds.includes(j.id));
      if (pool.length) return pick(pool);
    }
    return pickJournalist(preferredStyle, excludeIds);
  }

  // Verifica se tipo de artigo está habilitado para este tier
  function typeAllowed(type) { return !tier.disabledTypes.has(type); }

  // ── 1. CAMPEÃO (sempre) ───────────────────────────────────────
  const champArticle = genChampion({ tournament, bracket, year, rivalrySystem, allPlayers });
  if (champArticle) {
    // Injeta preferência de jornalista do tier
    if (tier.preferredJournalists.length && chance(0.6)) {
      const prefJ = JOURNALISTS[tier.preferredJournalists[0]];
      if (prefJ) champArticle.journalist = prefJ;
    }
    // Challenger: injeta vocabulário de ranking no deck
    if (tournament.category === 'ATP_100' && champArticle.deck) {
      const pts = tournament.points?.winner;
      if (pts) champArticle.deck += ` +${pts} pontos no ranking.`;
    }
    articles.push(champArticle);
  }

  // ── 2. ARTIGOS ESPECIAIS DO TIER ─────────────────────────────
  for (const special of tier.specialArticles) {
    if (articles.length >= tier.maxArticles) break;
    let art = null;
    if      (special === 'SCOUT_REPORT'     && bracket.champion)  art = genScoutReport({ tournament, player: bracket.champion, year });
    else if (special === 'RANKING_IMPACT'   && bracket.champion)  art = genRankingImpact({ tournament, player: bracket.champion, year, pointsGained: tournament.points?.winner });
    else if (special === 'POINTS_RACE')                           art = genPointsRace({ tournament, bracket, year });
    else if (special === 'MANDATORY_FIELD')                       art = genMandatoryField({ tournament, bracket, year, allPlayers });
    else if (special === 'BO5_BATTLE')                            art = genBO5Battle({ tournament, bracket, year });
    else if (special === 'SLAM_HISTORY')                          art = genSlamHistory({ tournament, bracket, year, allPlayers });
    else if (special === 'SEASON_NARRATIVE')                      art = genSeasonNarrative({ tournament, bracket, year });
    else if (special === 'EARNED_SPOT')                           art = genEarnedSpot({ tournament, bracket, year, allPlayers });
    else if (special === 'OLYMPIC_GOLD_ARTICLE')                  art = genOlympicGold({ tournament, bracket, year, allPlayers });
    if (art) articles.push(art);
  }

  // ── 3. RIVALIDADE NA FINAL ────────────────────────────────────
  if (typeAllowed('RIVALRY') && articles.length < tier.maxArticles) {
    const finalMatch = bracket.rounds?.at(-1)?.[0];
    if (finalMatch && !finalMatch.isBye && finalMatch.playerA && finalMatch.playerB) {
      const rivalryArticle = genRivalry({ tournament, match: finalMatch, year, round: 'F', rivalrySystem });
      if (rivalryArticle) articles.push(rivalryArticle);
    }
  }

  // ── 4. DUELOS ÉPICOS ─────────────────────────────────────────
  if (typeAllowed('EPIC_MATCH')) {
  const maxEpics = (tournament.category === 'GRAND_SLAM' || tournament.category === 'SLAM_CLASH' || tournament.category === 'MASTERS_1000') ? 2 : 1;
    let epicCount  = 0;
    const rounds   = bracket.rounds ?? [];
    for (let ri = rounds.length - 1; ri >= 0 && epicCount < maxEpics && articles.length < tier.maxArticles; ri--) {
      const fromEnd = rounds.length - 1 - ri;
      if (fromEnd < tier.epicMinRound) continue;
      const rl = fromEnd === 0 ? 'F' : fromEnd === 1 ? 'SF' : fromEnd === 2 ? 'QF' : fromEnd === 3 ? 'R16' : 'R32';
      for (const match of rounds[ri]) {
        if (match.isBye || !match.winner) continue;
        if (fromEnd === 0) continue; // final coberta como rivalidade
        const epicArticle = genEpicMatch({ tournament, match, year, round: rl });
        if (epicArticle) { articles.push(epicArticle); epicCount++; }
        if (epicCount >= maxEpics) break;
      }
    }
  }

  // ── 5. ZEBRAS ────────────────────────────────────────────────
  if (typeAllowed('UPSET')) {
  const maxUpsets = (tournament.category === 'GRAND_SLAM' || tournament.category === 'SLAM_CLASH' || tournament.category === 'MASTERS_1000') ? 2 : 1;
    let upsetCount  = 0;
    const rounds    = bracket.rounds ?? [];
    for (let ri = rounds.length - 1; ri >= 0 && upsetCount < maxUpsets && articles.length < tier.maxArticles; ri--) {
      const fromEnd = rounds.length - 1 - ri;
      const rl = fromEnd === 0 ? 'F' : fromEnd === 1 ? 'SF' : fromEnd === 2 ? 'QF' : fromEnd === 3 ? 'R16' : 'R32';
      if (!tier.coverDeepRounds && fromEnd > 3) continue;
      for (const match of rounds[ri]) {
        if (match.isBye || !match.winner) continue;
        const loser  = match.playerA?.id === match.winner.id ? match.playerB : match.playerA;
        const wRank  = match.winner.rankPosition ?? 999;
        const lRank  = loser?.rankPosition ?? 999;
        if (lRank > tier.upsetMaxLoserRank) continue;
        if ((wRank - lRank) < tier.upsetMinRankDiff) continue;
        const upsetArticle = genUpset({ tournament, match, year, round: rl });
        if (upsetArticle) { articles.push(upsetArticle); upsetCount++; }
        if (upsetCount >= maxUpsets) break;
      }
    }
  }

  // ── 6. LESÕES ─────────────────────────────────────────────────
  if (typeAllowed('INJURY') && articles.length < tier.maxArticles) {
  const injChance = tournament.category === 'GRAND_SLAM' ? 0.75
    : tournament.category === 'SLAM_CLASH' ? 0.68
    : tournament.category === 'MASTERS_1000' ? 0.65 : 0.5;
    for (const player of allPlayers) {
      if (articles.length >= tier.maxArticles) break;
      if (!player.injury) continue;
      // Nota: injuryHistory só recebe entradas após a cura (tickInjury),
      // portanto a guarda `!hist.at(-1)` silenciava artigos de primeira lesão.
      // A verificação `!player.injury` acima já é suficiente.
      if (chance(injChance)) {
        const injArticle = genInjury({ player, injury: player.injury, tournament, year });
        if (injArticle) articles.push(injArticle);
      }
    }
  }

  // ── 6b. ACOMPANHAMENTO DE LESÕES ATIVAS ───────────────────────
  // Jogadores em recuperação (slotsRemaining > 0) recebem cobertura contínua
  // independente de estarem ou não no chaveamento deste torneio.
  if (typeAllowed('INJURY_FOLLOWUP')) {
    const followupCap = tier.maxArticles + 2; // permite 2 extras para lesões
    for (const player of allPlayers) {
      if (articles.length >= followupCap) break;
      const inj = player.injury;
      if (!inj || inj.slotsRemaining <= 0) continue;
      if (inj.grade < 2) continue; // grau 1 (leve) não gera follow-up

      // Frequência por gravidade; fase LATE (último slot) sempre publica
      const isLate      = inj.slotsRemaining === 1;
      const followChance = inj.grade === 4 ? 0.75
        : inj.grade === 3                  ? 0.60
        :                                    0.35;

      if (!isLate && !chance(followChance)) continue;

      // Evita duplicata do mesmo jogador nesta rodada de artigos
      const alreadyCovered = articles.some(
        a => a.type === 'INJURY_FOLLOWUP' && a.player?.id === player.id
      );
      if (alreadyCovered) continue;

      const followArticle = genInjuryFollowUp({ player, injury: inj, tournament, year });
      if (followArticle) articles.push(followArticle);
    }
  }

  // ── 7. PROSPECT DESTAQUE ─────────────────────────────────────
  if (typeAllowed('PROSPECT') && articles.length < tier.maxArticles) {
    if (isProspect && bracket.champion) {
      // Scout report já gerado acima; artigo padrão como complemento
      const prospectArticle = genProspect({ player: bracket.champion, tournament, year, milestone: 'first_title' });
      if (prospectArticle) articles.push(prospectArticle);
    } else if (!isProspect) {
      const prospectIds = new Set((state.prospects ?? []).map(p => p.id));
      const rounds      = bracket.rounds ?? [];
      const sfRound     = rounds.at(-2) ?? [];
      for (const match of sfRound) {
        if (!match.winner) continue;
        if (prospectIds.has(match.winner.id) && chance(0.7)) {
          const p = allPlayers.find(x => x.id === match.winner.id);
          if (p) {
            const prospectArticle = genProspect({ player: p, tournament, year, milestone: 'deep_run' });
            if (prospectArticle) { articles.push(prospectArticle); break; }
          }
        }
      }
    }
  }

  // ── 8. ANÁLISE ────────────────────────────────────────────────
  if (typeAllowed('ANALYSIS') && articles.length < tier.maxArticles && chance(tier.analysisChance)) {
    const analysisArticle = genAnalysis({ tournament, bracket, year, allPlayers });
    if (analysisArticle) articles.push(analysisArticle);
  }

  // ── 9. RUMORES ────────────────────────────────────────────────
  if (typeAllowed('RUMOR') && articles.length < tier.maxArticles && chance(tier.rumorChance)) {
    const DRAMA_MOODS = new Set(['CRISIS','ISOLATED','OBSESSED','BITTER','BURNED_OUT','REBUILDING','VULNERABLE']);
    let subjectPool = allPlayers.filter(p => {
      if ((p.rankPosition ?? 999) > 30) return false;
      const mood = p.personality?.currentState?.mood;
      return mood && DRAMA_MOODS.has(mood);
    });
    if (!subjectPool.length) subjectPool = allPlayers.filter(p => (p.rankPosition ?? 999) <= 20);
    if (subjectPool.length > 0) {
      const subject      = pick(subjectPool);
      const rumorArticle = genRumor({ player: subject, tournament, year, topic: null });
      if (rumorArticle) articles.push(rumorArticle);
    }
  }

  // ── 10. BALANÇO DO TORNEIO (sempre) ──────────────────────────
  const wrapArticle = genTournamentWrap({
    tournament,
    bracket,
    year,
    updatedByInjury:   result?.updatedByInjury   ?? {},
    injuryWithdrawals: result?.injuryWithdrawals  ?? new Set(),
    allPlayers,
    nextTournament,
    tournamentChapter,
  });
  if (wrapArticle) articles.push(wrapArticle);

  const editorialContext = buildEditorialContext({ tournament, bracket, state, result });
  for (let i = 0; i < articles.length; i++) {
    articles[i] = applyEditorialBrain(articles[i], editorialContext);
  }

  // ── Ordena por prioridade ─────────────────────────────────────
  articles.sort((a, b) => {
    const pa = NEWS_TYPES[a.type]?.priority ?? 0;
    const pb = NEWS_TYPES[b.type]?.priority ?? 0;
    return pb - pa;
  });

  // ── Injetar narração MatchNarrator (F e SF) ───────────────────
  const SF_F_ROUNDS = new Set(['F', 'SF']);
  const allRounds2  = bracket.rounds ?? [];
  const matchByRound = new Map();
  for (let ri = 0; ri < allRounds2.length; ri++) {
    const fromEnd = allRounds2.length - 1 - ri;
    const rl = fromEnd === 0 ? 'F' : fromEnd === 1 ? 'SF' : null;
    if (!rl) continue;
    for (const match of allRounds2[ri]) {
      if (match.isBye || !match.winner) continue;
      matchByRound.set(`${rl}-${match.winner?.id}`, { match, rl });
    }
  }

  for (const art of articles) {
    if (art.narration) continue;
    const wId = art.player?.id ?? art.winner?.id;
    if (!wId) continue;
    for (const [, { match, rl }] of matchByRound) {
      if (!SF_F_ROUNDS.has(rl)) continue;
      if (match.winner?.id !== wId && art.playerB?.id !== match.winner?.id) continue;
      const matchResult = match.result;
      if (!matchResult?.stats) continue;
      try {
        const winnerPlayer = match.winner;
        const loserPlayer  = match.playerA?.id === winnerPlayer.id ? match.playerB : match.playerA;
        if (!winnerPlayer || !loserPlayer) continue;
        const surfKey = (tournament.surface ?? 'HARD').toUpperCase();
        const narResult = {
          winner: winnerPlayer,
          stats:  { a: match.playerA?.id === winnerPlayer.id ? matchResult.stats.a : matchResult.stats.b,
                    b: match.playerA?.id === winnerPlayer.id ? matchResult.stats.b : matchResult.stats.a },
          setsDetail:          matchResult.setsDetail          ?? [],
          gs:                  { players: [match.playerA, match.playerB] },
          log:                 [],
          retirement:          matchResult.retirement          ?? null,
          inMatchInjuryEvents: matchResult.inMatchInjuryEvents ?? [],
        };
        const narration = narrateMatchWithRivalry(winnerPlayer, loserPlayer, narResult, surfKey, state?.rivalrySystem ?? null);
        art.narration     = narration;
        art.narratorRound = rl;
      } catch(e) { /* silencioso */ }
      break;
    }
  }
  return articles;
}

/**
 * Gera artigos de fim de temporada (aposentadorias, análise anual).
 *
 * @param {object} state — state completo
 * @returns {Article[]}
 */
export function generateYearEndNews(state) {
  const articles = [];
  const year     = state.year;
  const allPlayers = [...(state.tourPlayers ?? []), ...(state.prospects ?? [])];

  // ── Aposentadorias ────────────────────────────────────────────
  for (const ev of state.events ?? []) {
    if (ev.type !== 'retirement') continue;
    const player = allPlayers.find(p => p.id === ev.playerId);
    if (!player) continue;
    const retArticle = genRetirement({ player, retirementType: ev.retirementType, year });
    if (retArticle) articles.push(retArticle);
  }

  // ── Eventos de vida do ano (batch) ────────────────────────────
  // Coleta eventos do ano atual de todos os jogadores
  const lifeEventPairs = allPlayers
    .map(player => ({
      player,
      events: (player.lifeEventLog ?? []).filter(e => e.season === year && e.newsworthy),
    }))
    .filter(({ events }) => events.length > 0);

  if (lifeEventPairs.length > 0) {
    const lifeArticles = generateLifeEventNews(lifeEventPairs, year, state, {
      maxArticles:  8,
      maxPerPlayer: 2,
    });
    articles.push(...lifeArticles);
  }

  // ── Colunas de personalidade (até 4, guiadas por mood/estado) ─
  const personalityArticles = genPersonalityColumns(allPlayers, year);
  articles.push(...personalityArticles);

  // ── Coluna de fim de ano enriquecida com personalidade ────────
  const journalist = JOURNALISTS.CARVALHO;
  const j          = journalist;
  const topPlayer  = state.rankingStore?.ranked?.[0];
  const topObj     = topPlayer ? allPlayers.find(p => p.id === topPlayer.playerId) : null;
  const topName    = topObj?.name ?? null;

  // Fragmentos narrativos de personalidade para enriquecer a coluna anual
  // Apenas narrativas não-genéricas para enriquecer a coluna
  const GENERIC_NARRATIVES = new Set(['segue sua temporada']);
  const narrativeFragments = allPlayers
    .filter(p => {
      const narr = p.personality?.currentState?.publicNarrative ?? '';
      if (!narr || (p.rankPosition ?? 999) > 15) return false;
      return !GENERIC_NARRATIVES.has(narr) && narr.length > 20;
    })
    .sort((a, b) => (a.rankPosition ?? 999) - (b.rankPosition ?? 999))
    .slice(0, 2)
    .map(p => p.personality.currentState.publicNarrative);

  // Conta careerMoments notáveis do ano
  const yearMoments = allPlayers
    .flatMap(p => (p.personality?.careerMoments ?? []).filter(m => m.year === year))
    .filter(m => ['FIRST_SLAM','FAREWELL','COMEBACK','PERSONA_SHIFT','DROUGHT_END','TITLE_WHILE_INJURED'].includes(m.type));

  const momentLine = yearMoments.length > 0
    ? `${yearMoments.length} momento${yearMoments.length > 1 ? 's' : ''} que o circuito vai guardar: ${yearMoments.slice(0,2).map(m => m.title).join(', ')}.`
    : '';

  articles.push({
    id:         `year-end-column-${year}`,
    type:       'COLUMN',
    journalist,
    tournament: null,
    year,
    player:     topObj ?? (topName ? { name: topName } : null),
    headline:   `O que a temporada ${year} nos deixou — além dos placares`,
    deck:       `Uma temporada termina. O balanço não cabe num ranking.`,
    body:       [
      pick(j.voice.opening),
      topName
        ? `${topName} encerra ${year} no topo. Mas o topo não é o único lugar onde a temporada foi interessante.`
        : `A temporada terminou. O circuito vai avaliar o que construiu.`,
      narrativeFragments[0] ? narrativeFragments[0] : '',
      momentLine,
      narrativeFragments[1] ? narrativeFragments[1] : '',
      `Houve jogos que merecem ser lembrados. Houve carreiras que ganharam forma. Houve histórias que o circuito preferiu não contar — e essas também fazem parte do registro.`,
      `A próxima temporada começa com as mesmas perguntas de sempre, e um elenco ligeiramente diferente para tentar respondê-las.`,
      pick(j.voice.closing),
    ].filter(Boolean).join(' '),
    length:     'LONG',
    tags:       ['coluna', 'fim-de-ano', String(year)],
    isYearEnd:  true,
    yearMomentsCount: yearMoments.length,
    createdAt:  Date.now(),
  });

  return articles;
}

/**
 * Classe principal — mantém o feed e serializa.
 */
function _findPlayerFromPool(players, playerId) {
  return (players ?? []).find(p => p.id === playerId) ?? null;
}

function _breakingJournalist(eventType) {
  if (eventType === 'SCANDAL') return chance(0.55) ? JOURNALISTS.REED : JOURNALISTS.FONTAINE;
  if (eventType === 'RETIREMENT_ANNOUNCED') return chance(0.6) ? JOURNALISTS.CARVALHO : JOURNALISTS.SANTOS;
  if (eventType === 'HEALTH_CRISIS' || eventType === 'HEALTH_RETURN' || eventType === 'HEALTH_CAREER_ENDING') {
    return chance(0.65) ? JOURNALISTS.SANTOS : JOURNALISTS.CARVALHO;
  }
  return chance(0.5) ? JOURNALISTS.SANTOS : JOURNALISTS.REED;
}

function _isHistoricFigure(player) {
  if (!player) return false;
  const slams = player.careerTitles?.gs ?? 0;
  const masters = player.careerTitles?.masters ?? 0;
  const market = player.personality?.marketability?.score ?? 0;
  return slams >= 5 || masters >= 12 || market >= 88 || (player.rankPosition ?? 999) <= 3;
}

function _breakingEventCopy(event, player, journalist, headline, deck, body, year) {
  const coverStory = _isHistoricFigure(player)
    && (event.type === 'HEALTH_CRISIS' || event.type === 'HEALTH_CAREER_ENDING' || event.type === 'RETIREMENT_ANNOUNCED');
  return {
    id: `breaking-${event.type}-${event.playerId}-${year}-${Date.now()}`,
    type: 'BREAKING',
    journalist,
    tournament: event.tournamentId ? { id: event.tournamentId, name: event.tournamentName ?? 'Circuito' } : null,
    year,
    player,
    headline,
    deck,
    body,
    length: 'LONG',
    spotlight: coverStory ? 'COVER' : 'STANDARD',
    tags: ['breaking', (event.type ?? 'breaking').toLowerCase(), String(year)],
    createdAt: Date.now(),
  };
}

function _roundLabelFromIndex(roundIndex, totalRounds) {
  const fromEnd = (totalRounds - 1) - roundIndex;
  if (fromEnd <= 0) return 'final';
  if (fromEnd === 1) return 'semifinal';
  if (fromEnd === 2) return 'quartas';
  if (fromEnd === 3) return 'oitavas';
  if (fromEnd === 4) return 'terceira rodada';
  if (fromEnd === 5) return 'segunda rodada';
  return 'estreia';
}

function _describeTournamentRun(result, player) {
  const rounds = result?.bracket?.rounds ?? [];
  const champion = result?.bracket?.champion ?? null;
  const finalMatch = rounds[rounds.length - 1]?.[0] ?? null;
  let lastMatch = null;
  let eliminationMatch = null;
  let wins = 0;

  for (let roundIndex = 0; roundIndex < rounds.length; roundIndex += 1) {
    for (const match of rounds[roundIndex] ?? []) {
      const a = match.playerA ?? match.player1 ?? null;
      const b = match.playerB ?? match.player2 ?? null;
      const involved = a?.id === player.id || b?.id === player.id;
      if (!involved) continue;
      lastMatch = { ...match, roundIndex };
      if (match.winner?.id === player.id) wins += 1;
      else if (match.winner?.id) eliminationMatch = { ...match, roundIndex };
    }
  }

  if (!lastMatch) {
    return {
      status: 'absent',
      wins: 0,
      summary: `${player.name} apareceu na órbita de ${result?.tournament?.name ?? 'este torneio'}, mas sem uma campanha clara para sustentar a memória esportiva da semana.`,
      deck: `A cobertura acompanha mais a presença simbólica do que um resultado concreto.`,
    };
  }

  if (champion?.id === player.id) {
    const finalist = finalMatch
      ? ((finalMatch.playerA?.id === player.id || finalMatch.player1?.id === player.id)
          ? (finalMatch.playerB ?? finalMatch.player2 ?? null)
          : (finalMatch.playerA ?? finalMatch.player1 ?? null))
      : null;
    const score = formatScore(finalMatch?.result?.setsDetail);
    return {
      status: 'champion',
      wins,
      summary: finalist
        ? `${player.name} foi campeão, derrotando ${finalist.name}${score ? ` por ${score}` : ' na final'}.`
        : `${player.name} saiu da semana com o título.`,
      deck: `A despedida ganhou troféu: ${player.name} transformou ${result?.tournament?.name ?? 'o torneio'} em capítulo dourado.`,
    };
  }

  const opponent = eliminationMatch
    ? ((eliminationMatch.playerA?.id === player.id || eliminationMatch.player1?.id === player.id)
        ? (eliminationMatch.playerB ?? eliminationMatch.player2 ?? null)
        : (eliminationMatch.playerA ?? eliminationMatch.player1 ?? null))
    : null;
  const score = formatScore(eliminationMatch?.result?.setsDetail);
  const roundLabel = eliminationMatch
    ? _roundLabelFromIndex(eliminationMatch.roundIndex, rounds.length)
    : 'campanha curta';

  return {
    status: 'eliminated',
    wins,
    roundLabel,
    opponent,
    summary: opponent
      ? `${player.name} caiu na ${roundLabel} para ${opponent.name}${score ? ` por ${score}` : ''}.`
      : `${player.name} encerrou a campanha na ${roundLabel}.`,
    deck: wins > 0
      ? `${player.name} venceu ${wins} partida${wins > 1 ? 's' : ''} antes de sair de ${result?.tournament?.name ?? 'o torneio'}.`
      : `${result?.tournament?.name ?? 'O torneio'} terminou cedo, e isso também passa a contar na memória da despedida.`,
  };
}

export function generateBreakingNewsArticles(events = [], players = [], year = null) {
  if (!events?.length) return [];
  const articles = [];

  for (const event of events) {
    const player = _findPlayerFromPool(players, event.playerId) ?? { id: event.playerId, name: event.playerName ?? 'Jogador' };
    const journalist = _breakingJournalist(event.type);
    const j = journalist;

    if (event.type === 'RETIREMENT_ANNOUNCED') {
      const age = player.age ?? 0;
      const slamCount = player.careerTitles?.gs ?? 0;
      const titleLine = slamCount > 0
        ? `${player.name} deixa para trás ${slamCount} Grand Slam${slamCount > 1 ? 's' : ''} e um currículo que já não depende de mais nada para existir.`
        : `${player.name} nunca dependeu só dos números. A despedida muda o clima do circuito independentemente da planilha.`;
      const body = [
        pick(j.voice.opening),
        `${player.name} confirmou que está vivendo sua última temporada completa no circuito. Não é só uma decisão de calendário. É uma mudança de era sendo anunciada em voz alta.`,
        titleLine,
        `A justificativa pública fala de corpo, tempo e escolha. O subtexto é outro: grandes nomes raramente saem quando o mundo acha confortável. Saem quando percebem que a história ainda pode ser escrita por eles.`,
        age ? `Aos ${age} anos, ${lastName(player)} entra em cada torneio sob uma nova luz. Já não se acompanha apenas o resultado. Acompanha-se o fim de uma presença.` : '',
        pick(j.voice.closing),
      ].filter(Boolean).join(' ');
      articles.push(_breakingEventCopy(
        event,
        player,
        journalist,
        `${player.name} anuncia despedida: o circuito começa a contar o último ano de uma referência`,
        `A carreira ainda não acabou. Mas cada torneio a partir daqui passa a carregar a sombra elegante do adeus.`,
        body,
        year ?? event.year,
      ));
      continue;
    }

    if (event.type === 'HEALTH_CRISIS') {
      const diagnosisName = event.diagnosisName ?? player.breakingNews?.healthCrisis?.diagnosisName ?? 'quadro de saúde grave';
      const coverStory = _isHistoricFigure(player);
      const subtypeLine = event.subtype === 'ONCOLOGY_TREATMENT'
        ? 'O diagnóstico exige tratamento longo e empurra o tênis para o fundo da sala.'
        : event.subtype === 'DEGENERATIVE_CONDITION'
          ? 'A expressão oficial é clínica. O efeito humano é devastador: a carreira deixa de obedecer a qualquer previsão simples.'
          : 'A interrupção ultrapassa o vocabulário comum das lesões do circuito.';
      const body = [
        pick(j.voice.opening),
        `${player.name} deixa o circuito por tempo indeterminado depois de uma crise de saúde que muda completamente o tom da temporada.`,
        `${diagnosisName} foi a forma usada pela equipe para nomear publicamente o quadro.`,
        subtypeLine,
        `Nos bastidores, a notícia desloca o debate do ranking para algo mais primitivo: presença, ausência, possibilidade de retorno. Quando um nome desses some, o circuito muda de peso.`,
        event.careerEnding ? `Há, inclusive, o medo real de que o retorno nunca aconteça. E esse é o tipo de frase que o tênis odeia escrever.` : `A equipe evita prazos absolutos. O foco, por ora, é sobreviver ao processo antes de pensar em qualquer comeback.`,
        event.publicStatement ? `"${event.publicStatement}"` : '',
        pick(j.voice.closing),
      ].filter(Boolean).join(' ');
      articles.push(_breakingEventCopy(
        event,
        player,
        journalist,
        coverStory
          ? `${player.name} anuncia parada médica e choca o circuito`
          : `Saúde interrompe ${player.name}: circuito reage a afastamento sem prazo claro`,
        coverStory
          ? `${diagnosisName} vira notícia central do ano e muda a conversa sobre o futuro de uma referência do esporte.`
          : `Não é uma lesão comum. É uma ausência que altera planos, calendário e o próprio humor do ano.`,
        body,
        year ?? event.year,
      ));
      continue;
    }

    if (event.type === 'SCANDAL') {
      const deck = event.kind === 'DOPING'
        ? 'A suspensão provisória transforma rumor em crise institucional.'
        : 'O circuito entra em modo de dano máximo diante de uma investigação por apostas.';
      const body = [
        pick(j.voice.opening),
        `${player.name} amanhece no centro da pior manchete esportiva possível para um atleta em atividade.`,
        event.kind === 'DOPING'
          ? `A investigação por doping abre um buraco moral e esportivo ao mesmo tempo. O problema não é só o que aconteceu. É o que passa a ser suspeito retroativamente.`
          : `Quando o assunto é apostas, a discussão deixa de ser apenas esportiva. Vira credibilidade, integridade de placar, confiança no próprio circuito.`,
        `A suspensão provisória é imediata, mas o julgamento público começou antes. Colegas, patrocinadores e jornalistas já operam em regime de dano reputacional.`,
        pick(j.voice.closing),
      ].filter(Boolean).join(' ');
      articles.push(_breakingEventCopy(
        event,
        player,
        journalist,
        event.kind === 'DOPING'
          ? `${player.name} entra em investigação por doping e abala o circuito`
          : `${player.name} é suspenso provisoriamente em investigação por apostas`,
        deck,
        body,
        year ?? event.year,
      ));
      continue;
    }

    if (event.type === 'PERSONAL_CRISIS') {
      const deck = event.kind === 'FAMILY_BEREAVEMENT'
        ? 'O tênis sai do centro. O mundo do jogador muda de eixo.'
        : event.kind === 'MENTAL_HEALTH_COLLAPSE'
          ? 'O afastamento nasce de uma sobrecarga que o placar nunca mostrou por completo.'
          : 'Um acontecimento fora da quadra impõe uma pausa dura e sem roteiro.';
      const body = [
        pick(j.voice.opening),
        `${player.name} se afasta do circuito depois de uma ruptura pessoal séria. Em momentos assim, o calendário perde qualquer relevância.`,
        event.kind === 'FAMILY_BEREAVEMENT'
          ? `A notícia é tratada com discrição, mas o impacto é total. A temporada deixa de ser uma sequência de torneios e passa a ser um espaço de luto.`
          : event.kind === 'MENTAL_HEALTH_COLLAPSE'
            ? `A equipe fala em preservação, e a palavra é correta. Há períodos em que continuar jogando seria uma forma de aprofundar a queda, não de demonstrar força.`
            : `Fontes próximas descrevem semanas de absoluta desordem emocional e logística. O tipo de episódio que reescreve prioridades num instante.`,
        `No circuito, a reação é menos analítica e mais humana. Não se discute chave. Discute-se ausência.`,
        pick(j.voice.closing),
      ].filter(Boolean).join(' ');
      articles.push(_breakingEventCopy(
        event,
        player,
        journalist,
        `${player.name} para o circuito após crise pessoal de grande impacto`,
        deck,
        body,
        year ?? event.year,
      ));
      continue;
    }

    if (event.type === 'SCANDAL_RESOLVED') {
      const body = [
        pick(j.voice.opening),
        `${player.name} volta a ficar elegível para competir. A suspensão saiu do papel. A desconfiança, não necessariamente.`,
        `Mesmo quando o relógio da punição termina, a narrativa demora mais. Cada entrevista de retorno vira teste moral, e cada resultado passa a ser lido à luz do escândalo.`,
        pick(j.voice.closing),
      ].filter(Boolean).join(' ');
      articles.push(_breakingEventCopy(
        event,
        player,
        journalist,
        `${player.name} volta ao circuito depois da suspensão. O placar reabre, o debate não`,
        `A punição formal termina, mas a reputação continua sob julgamento público.`,
        body,
        year ?? event.year,
      ));
      continue;
    }

    if (event.type === 'PERSONAL_CRISIS_RESOLVED') {
      const body = [
        pick(j.voice.opening),
        `${player.name} começa a reaparecer no circuito depois de meses vivendo uma crise fora da quadra.`,
        `Não é um retorno triunfal. É algo mais delicado: a tentativa de recolocar o tênis no mesmo mundo em que a vida real continuou acontecendo.`,
        pick(j.voice.closing),
      ].filter(Boolean).join(' ');
      articles.push(_breakingEventCopy(
        event,
        player,
        journalist,
        `${player.name} reaparece depois de um período longe do circuito`,
        `O retorno não apaga a crise. Só marca o começo de outra etapa.`,
        body,
        year ?? event.year,
      ));
      continue;
    }

    if (event.type === 'HEALTH_RETURN') {
      const diagnosisName = event.diagnosisName ?? player.breakingNews?.healthCrisis?.diagnosisName ?? 'a crise de saúde';
      const body = [
        pick(j.voice.opening),
        `${player.name} volta a treinar e planeja reaparição competitiva depois da crise de saúde que congelou a carreira.`,
        `O quadro nomeado publicamente como ${diagnosisName.toLowerCase()} deixa marcas, mas já não define sozinho toda a conversa.`,
        event.publicStatement ? `"${event.publicStatement}"` : '',
        `O retorno, aqui, não é promessa de alto nível imediato. É confirmação de presença, de continuidade, de que a história ainda respira.`,
        pick(j.voice.closing),
      ].filter(Boolean).join(' ');
      articles.push(_breakingEventCopy(
        event,
        player,
        journalist,
        `${player.name} prepara retorno após longa batalha de saúde`,
        `O circuito volta a falar do jogador em chave de esperança, não apenas de ausência.`,
        body,
        year ?? event.year,
      ));
      continue;
    }

    if (event.type === 'HEALTH_CAREER_ENDING') {
      const diagnosisName = event.diagnosisName ?? player.breakingNews?.healthCrisis?.diagnosisName ?? 'o quadro de saúde';
      const coverStory = _isHistoricFigure(player);
      const body = [
        pick(j.voice.opening),
        `${player.name} já não trabalha com a hipótese concreta de retorno ao circuito. A crise de saúde passa do campo do afastamento para o campo da despedida possível.`,
        `${diagnosisName} já não aparece só como diagnóstico. Passa a aparecer como a linha que separa uma carreira interrompida de uma carreira encerrada cedo demais.`,
        `É o tipo de notícia que reduz o tênis ao tamanho correto. Não se trata de ranking, nem de legado, nem de projeção. Trata-se do corpo impondo sua própria verdade.`,
        event.publicStatement ? `"${event.publicStatement}"` : '',
        pick(j.voice.closing),
      ].filter(Boolean).join(' ');
      articles.push(_breakingEventCopy(
        event,
        player,
        journalist,
        coverStory
          ? `${player.name} admite cenário de despedida forçada e coloca o circuito em estado de choque`
          : `Retorno de ${player.name} fica cada vez mais improvável após agravamento do quadro`,
        coverStory
          ? `${diagnosisName} transforma a ausência em possibilidade real de adeus e domina a cobertura do circuito.`
          : `O circuito começa a encarar a possibilidade de uma despedida forçada pela saúde.`,
        body,
        year ?? event.year,
      ));
    }
  }

  return articles;
}

export function generateBreakingTournamentFollowups(tournament, result, state = {}) {
  const allPlayers = [...(state.tourPlayers ?? []), ...(state.prospects ?? [])];
  const participantIds = new Set();
  for (const round of result?.bracket?.rounds ?? []) {
    for (const match of round) {
      if (match.playerA?.id) participantIds.add(match.playerA.id);
      if (match.playerB?.id) participantIds.add(match.playerB.id);
    }
  }
  for (const q of result?.qualifiers ?? []) participantIds.add(q.id);
  for (const pq of result?.preQualWinners ?? []) participantIds.add(pq.id);

  const trackedPlayers = allPlayers
    .filter(p => participantIds.has(p.id))
    .filter(p =>
      p.breakingNews?.farewellTour?.active ||
      p.breakingNews?.healthCrisis?.status === 'RETURNING' ||
      p.breakingNews?.scandal?.status === 'RETURNING'
    )
    .sort((a, b) => (a.rankPosition ?? 999) - (b.rankPosition ?? 999))
    .slice(0, 2);

  return trackedPlayers.map(player => {
    const journalist = player.breakingNews?.farewellTour?.active
      ? JOURNALISTS.CARVALHO
      : player.breakingNews?.scandal?.status === 'RETURNING'
        ? JOURNALISTS.REED
        : JOURNALISTS.SANTOS;
    const j = journalist;
    let headline = '';
    let deck = '';
    let body = '';

    if (player.breakingNews?.farewellTour?.active) {
      const run = _describeTournamentRun(result, player);
      headline = run.status === 'champion'
        ? `${player.name} transforma ${tournament.name} em capítulo dourado da despedida`
        : run.opponent
          ? `${player.name} se despede de ${tournament.name} com queda para ${run.opponent.name}`
          : `${player.name} fecha passagem por ${tournament.name} sob o peso elegante da despedida`;
      deck = run.deck;
      body = [
        pick(j.voice.opening),
        `${player.name} entrou em ${tournament.name} sob a lente reservada a quem já anunciou os últimos capítulos de uma carreira histórica.`,
        run.summary,
        run.status === 'champion'
          ? `Quando a turnê final entrega troféu, a nostalgia deixa de ser abstrata e ganha fotografia, placar e eco histórico.`
          : run.wins > 0
            ? `Mesmo sem o título, houve jogo suficiente para transformar a semana em algo maior do que simples cerimônia.`
            : `Há semanas em que o placar pesa menos do que a sensação de que um palco importante acabou de ficar para trás.`,
        `É por isso que cada torneio agora vale por dois: pelo resultado que deixa no ranking e pela lembrança que acrescenta à despedida.`,
        pick(j.voice.closing),
      ].join(' ');
    } else if (player.breakingNews?.healthCrisis?.status === 'RETURNING') {
      headline = `${player.name} reaparece em ${tournament.name} sob vigilância de todo o circuito`;
      deck = `O placar importa, mas não é o único assunto quando alguém volta depois de uma crise de saúde.`;
      body = [
        pick(j.voice.opening),
        `${player.name} esteve em quadra, e isso por si só já seria notícia suficiente depois do que aconteceu.`,
        `Em retornos assim, o circuito assiste procurando sinais: o corpo responde, o fôlego aguenta, a rotina volta a existir? O resultado é quase secundário diante do fato bruto da reaparição.`,
        pick(j.voice.closing),
      ].join(' ');
    } else {
      headline = `${player.name} volta a competir em ${tournament.name}, mas não volta ao vazio`;
      deck = `A suspensão acabou. O escrutínio, não.`;
      body = [
        pick(j.voice.opening),
        `${player.name} reapareceu no circuito sob o tipo de atenção que nenhum atleta deseja.`,
        `O retorno competitivo após um escândalo nunca é apenas esportivo. Cada passo em quadra convive com memória, suspeita e julgamento acumulado.`,
        pick(j.voice.closing),
      ].join(' ');
    }

    return {
      id: `breaking-followup-${player.id}-${tournament.id}-${Date.now()}`,
      type: player.breakingNews?.farewellTour?.active
        ? 'RETIREMENT'
        : player.breakingNews?.healthCrisis?.status === 'RETURNING'
          ? 'COMEBACK'
          : 'COLUMN',
      journalist,
      tournament: { id: tournament.id, name: tournament.name, category: tournament.category, surface: tournament.surface },
      year: state.year,
      player,
      headline,
      deck,
      body,
      length: 'MEDIUM',
      tags: player.breakingNews?.farewellTour?.active
        ? ['farewell-tour', 'retirement-followup', tournament.id.toLowerCase()]
        : player.breakingNews?.healthCrisis?.status === 'RETURNING'
          ? ['health-return', 'followup', tournament.id.toLowerCase()]
          : ['scandal-return', 'followup', tournament.id.toLowerCase()],
      createdAt: Date.now(),
    };
  });
}

export class NewsEngine {
  constructor() {
    this.feed = []; // Article[] — mais recente primeiro
  }

  /** Publica uma nova leva principal sem apagar a memoria editorial.
   *  O nome antigo ficou, mas agora o comportamento e de redação viva:
   *  novas materias entram no topo, duplicatas caem, arquivo permanece. */
  push(articles) {
    this.feed = mergeEditorialFeed(articles, this.feed);
  }

  /** Adiciona artigos ao início do feed sem substituir os existentes.
   *  Usado para eventos de patrocínio que devem persistir junto ao feed do torneio. */
  append(articles) {
    if (!articles?.length) return;
    this.feed = mergeEditorialFeed(articles, this.feed);
  }

  /** Filtra artigos por tipo, jornalista ou torneio */
  filter({ type, journalistId, year, tournamentId } = {}) {
    return this.feed.filter(a => {
      if (type         && a.type            !== type)         return false;
      if (journalistId && a.journalist?.id  !== journalistId) return false;
      if (year         && a.year            !== year)         return false;
      if (tournamentId && a.tournament?.id  !== tournamentId) return false;
      return true;
    });
  }

  toJSON() { return { feed: this.feed }; }

  static fromJSON(data) {
    const ne  = new NewsEngine();
    ne.feed   = mergeEditorialFeed(data?.feed ?? []);
    return ne;
  }
}

const NEWS_ARCHIVE_LIMIT = 260;

function articleFingerprint(article) {
  if (!article) return null;
  if (article.id) return `id:${article.id}`;
  const type = article.type ?? 'ARTICLE';
  const year = article.year ?? 'year';
  const tournament = article.tournament?.id ?? article.tournament?.name ?? 'circuit';
  const player = article.player?.id ?? article.player?.name ?? article.winner?.id ?? article.winner?.name ?? 'field';
  const headline = String(article.headline ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return `${type}|${year}|${tournament}|${player}|${headline}`;
}

function normalizeArticle(article) {
  if (!article) return null;
  return {
    ...article,
    createdAt: article.createdAt ?? Date.now(),
  };
}

function mergeEditorialFeed(incoming = [], existing = []) {
  const merged = [];
  const seen = new Set();
  for (const raw of [...(incoming ?? []), ...(existing ?? [])]) {
    const article = normalizeArticle(raw);
    const key = articleFingerprint(article);
    if (!article || !key || seen.has(key)) continue;
    seen.add(key);
    merged.push(article);
    if (merged.length >= NEWS_ARCHIVE_LIMIT) break;
  }
  return merged;
}


