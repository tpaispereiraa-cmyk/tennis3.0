/**
 * TournamentSystem.js
 * ─────────────────────────────────────────────────────────────────
 * Sistema completo de torneios para o Modo Universo.
 *
 * Contém:
 *   • Definições de todos os 48 torneios do calendário anual
 *   • Sistema de seeding por ranking
 *   • Sistema de BYE para chaves com número não-potência-de-2
 *   • Lógica de seleção de jogadores por torneio (com seasonSlots ativos)
 *   • Geração de bracket para qualifying e chave principal
 *   • Regras: 3 sets todos, 5 sets Grand Slams
 *
 * ESTRUTURA DE CHAVES
 *   Grand Slam:   64 draw | 48 diretos | 48→12 qualify | 4 WC | 5 sets
 *   Masters 1000: 64 draw | 52 diretos | 32→8 qualify  | 4 WC | 3 sets
 *   ATP 500:      32 draw | 26 diretos | 20→4 qualify  | 2 WC | 3 sets
 *   ATP 250:      32 draw | 26 diretos | 16→4 qualify  | 2 WC | 3 sets
 *   ATP 100:      32 draw | 32 diretos | sem qualify   | 0 WC | 3 sets (rank > 50 apenas)
 *   Prospects:    32 draw | 24 diretos | 16→8 qualify  | 0 WC | 3 sets
 *   Finals:        8 draw | top 8      | sem qualify   | 0 WC | 3 sets (RR+SF+F)
 *
 * OBRIGATORIEDADES
 *   Grand Slams   → TODOS (sem lesão)
 *   Masters 1000  → Top 20 obrigatório
 *   ATP 500       → Top10:4 | 11-30:3 | 31-60:2 | 61-100:1
 *   ATP 250       → Top10:2 | 11-30:2 | 31-60:3 | 61-100:5
 *   ATP 100       → Exclusivo rank > 50 | proibido para top 50
 *
 * PONTOS DE QUALIFYING (NOVIDADE)
 *   Qualifying passa a contar pontos de ranking (valores reduzidos).
 *   Isso cria mobilidade gradual para jogadores em ascensão.
 *   GS:Q=16 | M1000:Q=8 | ATP500:Q=4 | ATP250:Q=2
 *
 * SEASON SLOTS (CORRIGIDO)
 *   selectTournamentPlayers agora aplica shouldPlayerEnter para NPCs,
 *   respeitando os limites de obrigatoriedades e opcionais por temporada.
 */

import {
  applyPreTournamentInjuries,
  applyInjuryToPlayer,
} from './InjurySystem.js';
import { isPlayerUnavailableForTournament } from './BreakingNewsSystem.js';

// ═══════════════════════════════════════════════════════════════════
// CALENDÁRIO — 48 TORNEIOS
// ═══════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────────────────
// PROBABILIDADE DE ENTRADA — 250 / 500
// Substitui o sistema de slots obrigatórios/opcionais.
// Base por ranking × multiplicador de preferência pessoal, com cap anual.
// ─────────────────────────────────────────────────────────────────────────────

function _base250(rank) {
  return rank <= 8  ? 0.18 :
         rank <= 20 ? 0.35 :
         rank <= 40 ? 0.60 :
         rank <= 70 ? 0.82 : 0.95;
}

function _base500(rank) {
  return rank <= 8  ? 0.40 :
         rank <= 20 ? 0.60 :
         rank <= 40 ? 0.78 :
         rank <= 70 ? 0.90 : 0.95;
}

function _prefMultiplier(player, tournament) {
  const prefs = player.tournamentPreferences;
  if (!prefs?.length) return 1.0;
  const catIds   = CALENDAR.filter(t => t.category === tournament.category).map(t => t.id);
  const catPrefs = prefs.filter(id => catIds.includes(id));
  const pos      = catPrefs.indexOf(tournament.id);
  const total    = catPrefs.length;
  if (pos === -1 || total <= 1) return 1.0;
  const rel = pos / (total - 1); // 0 = favorito, 1 = pior
  if (pos <= 2)    return 2.8;
  if (pos <= 5)    return 1.8;
  if (rel <= 0.50) return 1.0;
  if (rel <= 0.70) return 0.35;
  return 0.08;
}

function _entryProb(player, tournament) {
  const rank = player.rankPosition ?? 999;
  const base = tournament.category === 'ATP_250' ? _base250(rank) : _base500(rank);
  return Math.min(base * _prefMultiplier(player, tournament), 0.96);
}

function _seasonCap(rank, category) {
  if (category === 'ATP_250') return rank <= 10 ? 3 : rank <= 25 ? 4 : rank <= 50 ? 5 : 99;
  if (category === 'ATP_500') return rank <= 10 ? 4 : rank <= 25 ? 5 : rank <= 50 ? 7 : 99;
  return 99;
}

// ─────────────────────────────────────────────────────────────────────────────
// CAMPOS DE TORNEIO — glossário dos campos usados em cada entrada do calendário
//
//  draw          → tamanho do bracket principal (main draw)
//  directSlots   → vagas diretas (entram sem qualify)
//  qualDirectIn  → jogadores que entram diretamente na fase Qualify (sem pré-qual)
//  preQualIn     → jogadores que entram no Pré-Qualify
//  qualifyOut    → vagas que o qualifying gera para o main draw
//
// ESTRUTURA POR CATEGORIA
//  GRAND_SLAM    draw:128 — 128 diretos, lesionados → prospects
//  MASTERS_1000  draw:64  — 32 diretos + 32 do qualify (2 fases: pré-qual + qual)
//  ATP_500       draw:32  — 24 diretos + 8 do qualify (32 no qual, 8 passam)
//  ATP_250       draw:32  — 24 diretos + 8 do qualify (32 no qual, 8 passam)
//  ATP_100       draw:128 — ranks 65-192 diretos, sem qualify
//  FINALS        — top N diretos, sem qualify
//
// QUALIFY (500/250): 32 jogadores disputam → 8 se classificam para o main draw
// QUALIFY (M1000):   2 fases — pré-qual (64→32) + qual (32 diretos+32 do pré = 64→32)
// ─────────────────────────────────────────────────────────────────────────────

// Shorthands para as definições comuns
const _250_500 = { draw:32, directSlots:24, qualDirectIn:32, preQualIn:0, qualifyOut:8,  bestOf:3, isMandatory:false, isSlam:false, isMasters:false };
const _M1000   = { draw:64, directSlots:32, qualDirectIn:32, preQualIn:64, qualifyOut:32, bestOf:3, isMandatory:true,  isSlam:false, isMasters:true  };
const _GS      = { draw:128,directSlots:128,qualDirectIn:0,  preQualIn:0,  qualifyOut:0,  bestOf:5, isMandatory:true,  isSlam:true,  isMasters:false };
const _100     = { draw:128, directSlots:128, qualDirectIn:0,  preQualIn:0,  qualifyOut:0,  bestOf:3, isMandatory:false, isSlam:false, isMasters:false, isATP100:true };
// Olimpíadas: 64 draw, entrada por nacionalidade, sem pontos ATP, MD3
const _OLYMPIC = { draw:64, directSlots:64, qualDirectIn:0, preQualIn:0, qualifyOut:0, bestOf:3, isMandatory:false, isSlam:false, isMasters:false, isOlympic:true };

export const CALENDAR = [
  // ── HARD — Janeiro · Fevereiro · Março ────────────────────────────────────
  { id:'JAN_250_AURELIA',      name:'Open de Aurelia',           category:'ATP_250',      surface:'HARD',   courtKey:'US_OPEN',       month:'Janeiro',  monthNum:1,  weekIndex:1,  icon:'🌅', location:'Aurelia',      ..._250_500 },
  { id:'JAN_250_INDICO',       name:'Copa do Índico',             category:'ATP_250',      surface:'HARD',   courtKey:'US_OPEN',       month:'Janeiro',  monthNum:1,  weekIndex:2,  icon:'🌊', location:'Índico',       ..._250_500 },
  { id:'JAN_100_CHALLENGER',   name:'Challenger de Janeiro',     category:'ATP_100',      surface:'HARD',   courtKey:'US_OPEN',       month:'Janeiro',  monthNum:1,  weekIndex:2,  icon:'🥈', location:'Nova Côrtes',  ..._100 },
  { id:'JAN_M1000_GOLD_COAST', name:'Gold Coast Masters',        category:'MASTERS_1000', surface:'HARD',   courtKey:'US_OPEN',       month:'Janeiro',  monthNum:1,  weekIndex:3,  icon:'🏆', location:'Gold Coast',   ..._M1000 },
  { id:'FEV_500_CASABLANCA',   name:'Torneio de Casablanca',     category:'ATP_500',      surface:'HARD',   courtKey:'US_OPEN',       month:'Fevereiro',monthNum:2,  weekIndex:4,  icon:'🌴', location:'Casablanca',   ..._250_500 },
  { id:'FEV_250_PACIFICO',     name:'Open do Pacífico Sul',      category:'ATP_250',      surface:'HARD',   courtKey:'US_OPEN',       month:'Fevereiro',monthNum:2,  weekIndex:5,  icon:'🐚', location:'Pacífico Sul', ..._250_500 },
  { id:'FEV_100_CHALLENGER',   name:'Challenger de Inverno',     category:'ATP_100',      surface:'HARD',   courtKey:'US_OPEN',       month:'Fevereiro',monthNum:2,  weekIndex:5,  icon:'🥈', location:'Nova Côrtes',  ..._100 },
  { id:'MAR_M1000_DESERT',     name:'Desert Masters',            category:'MASTERS_1000', surface:'HARD',   courtKey:'US_OPEN',       month:'Fevereiro',monthNum:2,  weekIndex:7,  icon:'🏜️', location:'Desert',       ..._M1000 },
  { id:'MAR_M1000_BAY',        name:'Bay Masters',               category:'MASTERS_1000', surface:'HARD',   courtKey:'US_OPEN',       month:'Março',    monthNum:3,  weekIndex:8,  icon:'🌁', location:'Bay City',     ..._M1000 },
  { id:'MAR_250_VALENCIA',     name:'Open de Valência',          category:'ATP_250',      surface:'HARD',   courtKey:'US_OPEN',       month:'Março',    monthNum:3,  weekIndex:9,  icon:'🍊', location:'Valência',     ..._250_500 },
  { id:'MAR_100_PRIMAVERA',    name:'Challenger de Primavera',   category:'ATP_100',      surface:'HARD',   courtKey:'US_OPEN',       month:'Março',    monthNum:3,  weekIndex:10, icon:'🥈', location:'Nova Côrtes',  ..._100 },
  { id:'JAN_GS_MERIDIAN',      name:'Open de Meridian',          category:'GRAND_SLAM',   surface:'HARD',   courtKey:'US_OPEN',       month:'Março',    monthNum:3,  weekIndex:11, icon:'⭐', location:'Meridian',     ..._GS },

  // ── CLAY — Abril · Maio · Junho ───────────────────────────────────────────
  { id:'ABR_500_PROVENCA',     name:'Open de Provença',          category:'ATP_500',      surface:'CLAY',   courtKey:'ROLAND_GARROS', month:'Abril',    monthNum:4,  weekIndex:12, icon:'🌺', location:'Provença',     ..._250_500 },
  { id:'ABR_100_TERRA',        name:'Copa de Terra Vermelha',    category:'ATP_100',      surface:'CLAY',   courtKey:'ROLAND_GARROS', month:'Abril',    monthNum:4,  weekIndex:13, icon:'🥈', location:'Florença',     ..._100 },
  { id:'ABR_250_ADRIATICA',    name:'Copa Adriática',            category:'ATP_250',      surface:'CLAY',   courtKey:'ROLAND_GARROS', month:'Abril',    monthNum:4,  weekIndex:13, icon:'⚓', location:'Adriática',    ..._250_500 },
  { id:'MAI_M1000_MONTE',      name:'Monte Rosso Masters',       category:'MASTERS_1000', surface:'CLAY',   courtKey:'ROLAND_GARROS', month:'Maio',     monthNum:5,  weekIndex:15, icon:'🔴', location:'Monte Rosso',  ..._M1000 },
  { id:'MAI_100_SAIBRO',       name:'Copa do Saibro',            category:'ATP_100',      surface:'CLAY',   courtKey:'ROLAND_GARROS', month:'Maio',     monthNum:5,  weekIndex:16, icon:'🥈', location:'Valência',     ..._100 },
  { id:'MAI_500_CATALUNHA',    name:'ATP 500 da Catalunha',      category:'ATP_500',      surface:'CLAY',   courtKey:'ROLAND_GARROS', month:'Maio',     monthNum:5,  weekIndex:16, icon:'🏴', location:'Catalunha',    ..._250_500 },
  { id:'MAI_M1000_ETERNAL',    name:'Eternal City Masters',      category:'MASTERS_1000', surface:'CLAY',   courtKey:'ROLAND_GARROS', month:'Maio',     monthNum:5,  weekIndex:17, icon:'🏟️', location:'Eternal City', ..._M1000 },
  { id:'JUN_500_QUEENS',       name:"Queen's Cup",               category:'ATP_500',      surface:'CLAY',   courtKey:'ROLAND_GARROS', month:'Junho',    monthNum:6,  weekIndex:18, icon:'👑', location:"Queen's",      ..._250_500 },
  { id:'JUN_100_CHALLENGER',   name:'Challenger de Junho',       category:'ATP_100',      surface:'CLAY',   courtKey:'ROLAND_GARROS', month:'Junho',    monthNum:6,  weekIndex:19, icon:'🥈', location:'Brighton',     ..._100 },
  { id:'JUN_250_HALLE',        name:'Open de Halle',             category:'ATP_250',      surface:'CLAY',   courtKey:'ROLAND_GARROS', month:'Junho',    monthNum:6,  weekIndex:19, icon:'🌿', location:'Halle',        ..._250_500 },
  { id:'MAI_GS_ROLAND',        name:"Roland d'Occitane",         category:'GRAND_SLAM',   surface:'CLAY',   courtKey:'ROLAND_GARROS', month:'Junho',    monthNum:6,  weekIndex:20, icon:'⭐', location:'Occitane',     ..._GS },

  // ── GRASS — Julho · Agosto · Setembro ─────────────────────────────────────
  { id:'JUL_500_HAMBURGO',     name:'Open de Hamburgo',          category:'ATP_500',      surface:'GRASS',  courtKey:'WIMBLEDON',     month:'Julho',    monthNum:7,  weekIndex:21, icon:'⚓', location:'Hamburgo',     ..._250_500 },
  { id:'JUL_100_NORDICO',      name:'Challenger Nórdico',        category:'ATP_100',      surface:'GRASS',  courtKey:'WIMBLEDON',     month:'Julho',    monthNum:7,  weekIndex:22, icon:'🥈', location:'Estocolmo',    ..._100 },
  { id:'JUL_250_MEDITERRANEO', name:'Copa do Mediterrâneo',      category:'ATP_250',      surface:'GRASS',  courtKey:'WIMBLEDON',     month:'Julho',    monthNum:7,  weekIndex:22, icon:'🚢', location:'Mediterrâneo', ..._250_500 },
  { id:'JUL_250_LAGOS',        name:'Open de Lagos',             category:'ATP_250',      surface:'GRASS',  courtKey:'WIMBLEDON',     month:'Julho',    monthNum:7,  weekIndex:23, icon:'🌍', location:'Lagos',        ..._250_500 },
  // ── OLIMPÍADAS (apenas em anos olímpicos: year % 4 === 0) ──────────────────
  { id:'JUL_OLYMPICS',         name:'Jogos Olímpicos — Tênis',   category:'OLYMPICS',     surface:'HARD',   courtKey:'US_OPEN',       month:'Julho',    monthNum:7,  weekIndex:24, icon:'🥇', location:'Sede Olímpica', ..._OLYMPIC },

  { id:'AGO_M1000_LAKESHORE',  name:'Lakeshore Masters',         category:'MASTERS_1000', surface:'GRASS',  courtKey:'WIMBLEDON',     month:'Agosto',   monthNum:8,  weekIndex:25, icon:'🏙️', location:'Lakeshore',    ..._M1000 },
  { id:'AGO_100_VERAO',        name:'Challenger de Verão',       category:'ATP_100',      surface:'GRASS',  courtKey:'WIMBLEDON',     month:'Agosto',   monthNum:8,  weekIndex:26, icon:'🥈', location:'Atlantic',     ..._100 },
  { id:'AGO_M1000_ATLANTIC',   name:'Atlantic Masters',          category:'MASTERS_1000', surface:'GRASS',  courtKey:'WIMBLEDON',     month:'Agosto',   monthNum:8,  weekIndex:26, icon:'🌊', location:'Atlantic',     ..._M1000 },
  { id:'AGO_500_COSTA_LESTE',  name:'Open da Costa Leste',       category:'ATP_500',      surface:'GRASS',  courtKey:'WIMBLEDON',     month:'Agosto',   monthNum:8,  weekIndex:27, icon:'🗽', location:'Costa Leste',  ..._250_500 },
  { id:'SET_500_TOQUIO',       name:'Open de Tóquio',            category:'ATP_500',      surface:'GRASS',  courtKey:'WIMBLEDON',     month:'Setembro', monthNum:9,  weekIndex:28, icon:'🗼', location:'Tóquio',       ..._250_500 },
  { id:'SET_100_OUTONO',       name:'Open de Outono',            category:'ATP_100',      surface:'GRASS',  courtKey:'WIMBLEDON',     month:'Setembro', monthNum:9,  weekIndex:29, icon:'🥈', location:'Porto Âmbar',  ..._100 },
  { id:'SET_250_AMERICAS',     name:'Copa das Américas',         category:'ATP_250',      surface:'GRASS',  courtKey:'WIMBLEDON',     month:'Setembro', monthNum:9,  weekIndex:29, icon:'🌎', location:'Américas',     ..._250_500 },
  { id:'JUN_GS_ALBION',        name:'Championships of Albion',   category:'GRAND_SLAM',   surface:'GRASS',  courtKey:'WIMBLEDON',     month:'Setembro', monthNum:9,  weekIndex:30, icon:'⭐', location:'Albion',       ..._GS },

  // ── INDOOR — Outubro · Novembro · Dezembro ────────────────────────────────
  { id:'OUT_M1000_DRAGON',     name:'Dragon Cup Masters',        category:'MASTERS_1000', surface:'INDOOR', courtKey:'O2_ARENA',      month:'Outubro',  monthNum:10, weekIndex:31, icon:'🐉', location:'Dragon City',  ..._M1000 },
  { id:'OUT_500_SEUL',         name:'Open de Seul',              category:'ATP_500',      surface:'INDOOR', courtKey:'O2_ARENA',      month:'Outubro',  monthNum:10, weekIndex:32, icon:'🌸', location:'Seul',         ..._250_500 },
  { id:'OUT_100_INDOOR',       name:'Challenger Indoor',         category:'ATP_100',      surface:'INDOOR', courtKey:'O2_ARENA',      month:'Outubro',  monthNum:10, weekIndex:33, icon:'🥈', location:'Dragon City',  ..._100 },
  { id:'OUT_250_XANGAI',       name:'Open de Xangai',            category:'ATP_250',      surface:'INDOOR', courtKey:'O2_ARENA',      month:'Outubro',  monthNum:10, weekIndex:33, icon:'🏮', location:'Xangai',       ..._250_500 },
  { id:'NOV_250_VIENA',        name:'Open de Viena',             category:'ATP_250',      surface:'INDOOR', courtKey:'O2_ARENA',      month:'Novembro', monthNum:11, weekIndex:35, icon:'🎼', location:'Viena',        ..._250_500 },
  { id:'NOV_100_ENCERRAMENTO', name:'Challenger de Encerramento',category:'ATP_100',      surface:'INDOOR', courtKey:'O2_ARENA',      month:'Novembro', monthNum:11, weekIndex:36, icon:'🥈', location:'Berlim',       ..._100 },
  { id:'NOV_500_PARIS',        name:'Open de Paris',             category:'ATP_500',      surface:'INDOOR', courtKey:'O2_ARENA',      month:'Novembro', monthNum:11, weekIndex:36, icon:'🗼', location:'Paris',        ..._250_500 },
  { id:'NOV_M1000_CAPITAL',    name:'Capital Indoor Masters',    category:'MASTERS_1000', surface:'INDOOR', courtKey:'O2_ARENA',      month:'Novembro', monthNum:11, weekIndex:37, icon:'🏟️', location:'Capital',      ..._M1000 },
  { id:'AGO_GS_EMPIRE',        name:'Empire Open',               category:'GRAND_SLAM',   surface:'INDOOR', courtKey:'O2_ARENA',      month:'Novembro', monthNum:11, weekIndex:38, icon:'⭐', location:'Empire City',  ..._GS },
  { id:'DEZ_100_DEZEMBRO',     name:'Challenger de Dezembro',    category:'ATP_100',      surface:'INDOOR', courtKey:'O2_ARENA',      month:'Dezembro', monthNum:12, weekIndex:39, icon:'🥈', location:'Grand Arena',  ..._100 },
  { id:'DEZ_ATP_FINALS',       name:'ATP Finals',                category:'FINALS',       surface:'INDOOR', courtKey:'O2_ARENA',      month:'Dezembro', monthNum:12, weekIndex:40, icon:'🏆', location:'Grand Arena',  draw:8, directSlots:8, qualDirectIn:0, preQualIn:0, qualifyOut:0, bestOf:3, isMandatory:false, isSlam:false, isMasters:false, isFinals:true },
];

export const TOURNAMENT_MAP = Object.fromEntries(CALENDAR.map(t => [t.id, t]));

// ═══════════════════════════════════════════════════════════════════
// LABELS DE RODADAS
// ═══════════════════════════════════════════════════════════════════

/** Retorna o label da rodada baseado no tamanho da chave e índice da rodada (0-based) */
export function getRoundLabel(drawSize, roundIndex, totalRounds) {
  const fromEnd = totalRounds - 1 - roundIndex;
  const labels = ['F', 'SF', 'QF', 'R16', 'R32', 'R64', 'R128'];
  return labels[fromEnd] ?? `R${Math.pow(2, fromEnd + 1)}`;
}

/** Retorna o label de uma rodada para exibição */
export function getRoundName(round) {
  const NAMES = {
    W: 'Campeão', F: 'Final', SF: 'Semifinal', QF: 'Quartas',
    R16: 'Oitavas', R32: '3ª Rodada', R64: '1ª Rodada', R128: 'R128',
    Q: 'Qualificatório', PQ: 'Pré-Qualify', BYE: 'Bye',
  };
  return NAMES[round] ?? round;
}

// ═══════════════════════════════════════════════════════════════════
// SISTEMA DE BYE
// ═══════════════════════════════════════════════════════════════════

/**
 * Determina quantos BYEs são necessários e quem os recebe.
 * Os jogadores melhor rankeados recebem BYE.
 * BYEs = próxima potência de 2 - tamanho atual da chave.
 *
 * Ex: 28 jogadores → próxima potência de 2 é 32 → 4 BYEs para seeds 1-4.
 * Ex: 24 jogadores → próxima potência de 2 é 32 → 8 BYEs para seeds 1-8.
 *
 * @param {object[]} players  Array de jogadores já ordenados por seed (melhor primeiro)
 * @returns {{ byes: Set<string>, firstRoundPlayers: object[] }}
 */
export function assignByes(players) {
  const n = players.length;
  if (n <= 0) return { byes: new Set(), firstRoundPlayers: [] };

  // Encontra próxima potência de 2
  let nextPow = 1;
  while (nextPow < n) nextPow *= 2;

  const byeCount = nextPow - n;
  const byes = new Set(players.slice(0, byeCount).map(p => p.id));

  return { byes, totalSlots: nextPow };
}

function _hashSeed(input) {
  const str = String(input ?? '');
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function _seededRandomFactory(seedInput) {
  let state = (_hashSeed(seedInput) || 1) >>> 0;
  return () => {
    state = (state + 0x6D2B79F5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return (((t ^ (t >>> 14)) >>> 0) / 4294967296);
  };
}

function _withRandomSource(rng, fn) {
  if (!rng) return fn();
  const prevRandom = Math.random;
  Math.random = rng;
  try {
    return fn();
  } finally {
    Math.random = prevRandom;
  }
}

function _cloneSeasonSlotsMap(playerSeasonSlots = {}) {
  return Object.fromEntries(
    Object.entries(playerSeasonSlots).map(([key, value]) => [key, value ? { ...value } : value])
  );
}

function _applyQualifyingMatch(qBracket, roundIndex, matchIndex, winner, result = null) {
  const rounds = qBracket.rounds.map((round, ri) =>
    ri !== roundIndex ? round : round.map((match, mi) =>
      mi !== matchIndex ? match : { ...match, winner, result }
    )
  );
  const updated = { ...qBracket, rounds };
  const currentRound = updated.rounds[updated.currentRound] ?? [];
  const completed = currentRound.every(match => match.winner || match.isBye);
  return completed ? advanceQualifyingRound(updated) : updated;
}

function _runPreparedQualifyingStage({
  players,
  spotsToFill,
  rng,
  matchResolver,
  qualRoundsData,
  surface,
  phaseLabel,
  tournament,
  seasonYear,
}) {
  if (!players?.length || spotsToFill <= 0) {
    return { qualifiers: [], bracket: null };
  }

  let qBracket = generateQualifyingBracket(players, spotsToFill, rng);
  while (!qBracket.isComplete) {
    const roundIndex = qBracket.currentRound;
    const round = qBracket.rounds[roundIndex] ?? [];
    let advancedAny = false;

    for (let matchIndex = 0; matchIndex < round.length; matchIndex++) {
      const match = round[matchIndex];
      if (!match || match.winner || match.isBye || !match.playerA || !match.playerB) continue;

      const resolved = _withRandomSource(rng, () =>
        matchResolver(match.playerA, match.playerB, {
          phase: phaseLabel,
          roundIndex,
          matchIndex,
          tournament,
          seasonYear,
        })
      );
      const winner = resolved?.winner ?? resolved;
      const result = resolved?.result ?? null;
      if (!winner) continue;

      qualRoundsData.push({
        playerA: match.playerA,
        playerB: match.playerB,
        winner,
        surface,
        sets: result?.sets ?? [0, 0],
        phase: phaseLabel,
      });
      qBracket = _applyQualifyingMatch(qBracket, roundIndex, matchIndex, winner, result);
      advancedAny = true;
    }

    if (!advancedAny) break;
  }

  return { qualifiers: qBracket.qualifiers ?? [], bracket: qBracket };
}

/**
 * Monta o bracket inicial para uma chave com BYE.
 * Os jogadores com BYE ficam na posição de "cabeça de chave" e avançam direto.
 * Os demais jogam na R1.
 *
 * Retorna array de matches da R1: { playerA, playerB } onde playerB pode ser null (BYE).
 *
 * @param {object[]} seededPlayers  Jogadores ordenados por seed
 * @param {Set<string>} byes
 * @param {number} totalSlots       Potência de 2 (tamanho do bracket completo)
 */
export function buildBracketWithByes(seededPlayers, byes, totalSlots) {
  // Posições padrão ATP: seed 1 no topo, seed 2 embaixo, 3-4 alternados, etc.
  // Simplificado: pares (seed1 vs ultimo, seed2 vs penultimo, etc)
  const halfSlots = totalSlots / 2;
  const r1Matches = [];

  // Preenche bracket: cada "slot" pode ser jogador ou BYE
  const slots = new Array(totalSlots).fill(null);

  // Seeds nas posições fixas
  const sCount = seededPlayers.length;
  // Posições dos seeds no bracket padrão (para totalSlots)
  const seedPositions = getSeedPositions(totalSlots);

  for (let i = 0; i < sCount && i < seedPositions.length; i++) {
    slots[seedPositions[i]] = seededPlayers[i];
  }

  // Monta confrontos da R1 (pares consecutivos: 0-1, 2-3, etc.)
  for (let i = 0; i < totalSlots; i += 2) {
    const a = slots[i];
    const b = slots[i + 1];
    r1Matches.push({ playerA: a, playerB: b, isBye: b === null });
  }

  return r1Matches;
}

/**
 * Retorna as posições de seed no bracket (padrão ATP).
 * Seed 1: 0, Seed 2: último, Seeds 3-4: em meias alternadas, etc.
 */
function getSeedPositions(n) {
  if (n === 0) return [];
  const positions = [];
  // Constrói recursivamente
  function fill(pos, size, seedIdx) {
    if (size === 1) {
      positions[seedIdx] = pos;
      return seedIdx + 1;
    }
    const half = size / 2;
    // Top half → seed impar, bottom half → seed par
    let next = fill(pos, half, seedIdx);
    next = fill(pos + half, half, seedIdx + 1);
    return next;
  }
  // Posições simples para brackets pequenos
  const result = [];
  result.push(0);           // Seed 1 = posição 0
  result.push(n - 1);      // Seed 2 = posição final
  if (n >= 4) {
    result.push(n / 2);    // Seed 3 ou 4
    result.push(n / 2 - 1);
  }
  if (n >= 8) {
    result.push(n / 4);
    result.push(n - n / 4 - 1);
    result.push(n * 3 / 4);
    result.push(n * 3 / 4 - 1);
  }
  // Para n maiores, completa sequencialmente nas posições restantes
  const usedPos = new Set(result);
  let pos = 1;
  while (result.length < n) {
    if (!usedPos.has(pos)) { result.push(pos); usedPos.add(pos); }
    pos++;
  }
  return result;
}

// ═══════════════════════════════════════════════════════════════════
// SELEÇÃO DE JOGADORES
// ═══════════════════════════════════════════════════════════════════

/**
 * Seleciona os jogadores que entram em cada fase de um torneio.
 *
 * Retorna:
 *   mainDraw     — entram direto na fase principal
 *   qualifying   — entram no Qualify (ranks 33-64 ou prospects restantes)
 *   preQualifying — entram no Pré-Qualify (ranks 65-128, só para M1000/500/250)
 *
 * Regras por categoria:
 *   GRAND_SLAM    → todos os 128 diretos; lesionados → prospects substituem
 *   MASTERS_1000  → ranks 1-32 diretos; ranks 33-64 no Qualify; 65-128 no Pré-Qualify
 *   ATP_500       → idêntico Masters 1000
 *   ATP_250       → idêntico Masters 1000
 *   ATP_100       → ranks 65-128 diretos; lesionados → prospects substituem
 *   ATP_PROSPECTS → 8 melhores diretos; restantes no Qualify
 *   FINALS        → top N diretos
 */
// ─────────────────────────────────────────────────────────────────
// OLIMPÍADAS — Seleção por Nacionalidade
// Regras: máx 4 por país, top 56 + 8 wildcards de nações sem representação
// Jogadores lesionados são excluídos. Draw de 64.
// ─────────────────────────────────────────────────────────────────
function selectOlympicPlayers(allPlayers, injured = new Set(), draw = 64) {
  const available = allPlayers
    .filter(p => !injured.has(p.id) && !isPlayerUnavailableForTournament(p) && p.nationality)
    .sort((a, b) => (a.rankPosition ?? 999) - (b.rankPosition ?? 999));

  const MAX_PER_COUNTRY = 4;
  const countryCount = {};
  const selected = [];

  for (const p of available) {
    if (selected.length >= draw) break;
    const nat = p.nationality;
    if ((countryCount[nat] ?? 0) >= MAX_PER_COUNTRY) continue;
    countryCount[nat] = (countryCount[nat] ?? 0) + 1;
    selected.push(p);
  }

  // Se o draw não encheu (raro), preenche ignorando o limite de país
  if (selected.length < draw) {
    const selectedIds = new Set(selected.map(p => p.id));
    for (const p of available) {
      if (selected.length >= draw) break;
      if (!selectedIds.has(p.id)) {
        selected.push(p);
        selectedIds.add(p.id);
      }
    }
  }

  return { mainDraw: selected, qualifying: [], preQualifying: [] };
}

export function selectTournamentPlayers(tournament, allPlayers, prospects = [], injured = new Set(), playerSeasonSlots = {}, _legacySeasonPlans = {}) {
  const { category, draw, directSlots, qualDirectIn = 0, preQualIn = 0, isFinals, isATP100, isSlam, isMasters, isOlympic } = tournament;

  // ── OLIMPÍADAS: entrada por nacionalidade, máx 4 por país ──────────
  if (isOlympic) {
    return selectOlympicPlayers(allPlayers, injured, draw);
  }

  // ── FINALS: top N por ranking, sem qualify ─────────────────────────
  if (isFinals) {
    return {
      mainDraw: allPlayers.filter(p => !injured.has(p.id) && !isPlayerUnavailableForTournament(p)).slice(0, draw),
      qualifying: [], preQualifying: [],
    };
  }

  // ── ATP 100: ranks 65-192 diretos, sem qualify, sem filler de prospects ──
  if (isATP100) {
    const tour65to192 = allPlayers.filter(p =>
      !injured.has(p.id) && !isPlayerUnavailableForTournament(p) && (p.rankPosition ?? 999) > 64
    ).slice(0, draw);
    return { mainDraw: tour65to192, qualifying: [], preQualifying: [] };
  }

  // ── GRAND SLAM: todos os 128 diretos, sem qualify ──────────────────
  // Lesionados são substituídos pelos prospects mais bem classificados.
  if (isSlam) {
    const avail = allPlayers.filter(p => !injured.has(p.id) && !isPlayerUnavailableForTournament(p));
    let mainDraw = avail.slice(0, draw);
    const shortfall = draw - mainDraw.length;
    if (shortfall > 0) {
      const fills = prospects.filter(p => !injured.has(p.id) && !isPlayerUnavailableForTournament(p)).slice(0, shortfall);
      mainDraw = [...mainDraw, ...fills];
    }
    return { mainDraw, qualifying: [], preQualifying: [] };
  }

  // ── ATP 250 / 500 / MASTERS 1000 ──────────────────────────────────
  //
  //   Main Draw   : top ranked players que QUEREM jogar → até directSlots vagas
  //   Qualify     : jogadores de ranking mais baixo (abaixo do limiar de entrada direta)
  //                 que sempre querem acumular pontos
  //   Pré-Qualify : M1000 apenas — próximos por rank
  //
  // Para 250/500: jogadores com rank dentro do "pool de candidatos a vaga direta"
  // (top directSlots * 3) que recusam o torneio via probabilidade NÃO caem no
  // qualify — eles simplesmente não aparecem. Só os de ranking mais baixo formam
  // o pool de qualify, pois esses sempre querem jogar para acumular pontos.

  const notInjured = allPlayers.filter(p => !injured.has(p.id) && !isPlayerUnavailableForTournament(p));

  // Para M1000: todos entram sem filtro de probabilidade (isMasters já retorna true em shouldPlayerEnter)
  // Para 250/500: só filtra probabilidade
  const wantToPlay = notInjured.filter(p => {
    const slots = playerSeasonSlots[p.id] ?? createSeasonSlots();
    return shouldPlayerEnter(p, tournament, slots);
  });
  const mainDraw = wantToPlay.slice(0, directSlots);

  const inMainIds = new Set(mainDraw.map(p => p.id));

  // Pool de candidatos ao main draw = os top (directSlots * 3) por rank.
  // Qualquer um nesse pool que recusou (não está no mainDraw) também recusa
  // o qualify — eles simplesmente não jogam o torneio.
  // Para M1000 não há recusa, então o pool não exclui ninguém extra.
  const mainDrawPoolSize = isMasters ? 0 : directSlots * 3;
  const mainDrawPool     = new Set(notInjured.slice(0, mainDrawPoolSize).map(p => p.id));

  // Qualify: próximos qualDirectIn por rank, excluindo main draw e pool de candidatos
  const qualifying = notInjured
    .filter(p => !inMainIds.has(p.id) && !mainDrawPool.has(p.id))
    .slice(0, qualDirectIn);

  // Pré-Qualify (M1000 apenas): próximos preQualIn, excluindo main e qualifying
  const inQualIds = new Set(qualifying.map(p => p.id));
  const preQualifying = preQualIn > 0
    ? notInjured
        .filter(p => !inMainIds.has(p.id) && !mainDrawPool.has(p.id) && !inQualIds.has(p.id))
        .slice(0, preQualIn)
    : [];

  return { mainDraw, qualifying, preQualifying };
}

/**
 * Simula o qualifying de um torneio.
 * Retorna os qualificados (qualifyOut jogadores).
 *
 * Algoritmo simples: randomiza com peso por ranking,
 * jogadores melhor rankeados têm maior chance.
 *
 * @param {object[]} qualifyPlayers   Jogadores no qualifying
 * @param {number}   spotsToFill      Quantas vagas existem
 * @returns {object[]}                Jogadores que se classificaram
 */
/**
 * Simula qualifying com bracket de eliminação real (versão síncrona).
 * Cada rodada emparelha todos os jogadores; vencedores avançam.
 * Continua até restar ≤ spotsToFill jogadores.
 *
 * Usado pelo TournamentBracket para simular qualifying silenciosamente.
 * Para simulação assíncrona (UniverseManager), usa runQualifyingAsync.
 */
export function runQualifying(qualifyPlayers, spotsToFill) {
  if (!qualifyPlayers?.length || spotsToFill <= 0) return [];
  if (qualifyPlayers.length <= spotsToFill) return [...qualifyPlayers];

  // Embaralha para randomizar confrontos
  let current = [...qualifyPlayers];
  for (let i = current.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [current[i], current[j]] = [current[j], current[i]];
  }

  // Eliminação simples: todos jogam pares a cada rodada
  while (current.length > spotsToFill) {
    const next = [];
    for (let i = 0; i < current.length; i += 2) {
      if (i + 1 >= current.length) {
        next.push(current[i]); // número ímpar: recebe bye
        continue;
      }
      const a = current[i];
      const b = current[i + 1];
      const rankA = a.rankPosition ?? 999;
      const rankB = b.rankPosition ?? 999;
      // Probabilidade baseada em ranking (sem engine completo aqui)
      const total = rankB + rankA;
      const winner = Math.random() * total < rankB ? a : b;
      next.push(winner);
    }
    current = next;
  }

  return current.slice(0, spotsToFill);
}

// ═══════════════════════════════════════════════════════════════════
// GERAÇÃO DO BRACKET
// ═══════════════════════════════════════════════════════════════════

/**
 * Gera o bracket completo de um torneio.
 *
 * Para Prospects (draw=24): top 8 recebem BYE, R1 tem 16 jogos (8 com BYE).
 * Para demais: potência de 2 normal.
 *
 * @param {object}   tournament
 * @param {object[]} mainDrawPlayers   Jogadores na chave principal (já inclui qualificados + WC)
 * @returns {Bracket}
 */
export function generateBracket(tournament, mainDrawPlayers, rng = Math.random) {
  const { draw } = tournament;
  const players = [...mainDrawPlayers];

  // Garante que temos no máximo `draw` jogadores, ordenados por ranking
  const capped = [...players]
    .sort((a, b) => (a.rankPosition ?? 999) - (b.rankPosition ?? 999))
    .slice(0, draw);

  // Calcula BYEs necessários
  const { byes, totalSlots } = assignByes(capped);

  // Monta slots: jogadores com BYE nos primeiros N slots, resto preenche
  // Distribui os jogadores no bracket com seeding
  const seeded = [...capped]; // já ordenados por ranking
  const r1Matches = buildFirstRound(seeded, byes, totalSlots, rng);

  return {
    tournamentId: tournament.id,
    tournamentName: tournament.name,
    draw: capped.length,
    totalSlots,
    byeCount: byes.size,
    bestOf: tournament.bestOf,
    rounds: [r1Matches],   // será populado conforme o torneio avança
    currentRound: 0,
    isComplete: false,
    champion: null,
  };
}

/**
 * Distribui jogadores na R1 seguindo o sorteio ATP real:
 *
 *  Draw 32  → 4 seeds
 *  Draw 64+ → 8 seeds
 *
 *  Seed 1: topo do bracket (slot 0)
 *  Seed 2: base do bracket (último slot)
 *  Seeds 3-4: sorteados para as seções "internas" de cada metade
 *    • 4 seeds → seções 1 e 2
 *    • 8 seeds → seções 2 e 5
 *  Seeds 5-8: sorteados para as seções restantes
 *    • 8 seeds → seções 1, 3, 4, 6 (aleatório)
 *  Demais jogadores: sorteio aleatório nos slots vagos
 *  BYEs: adjacentes aos melhores seeds (mesma ordem de prioridade)
 *
 * @param {object[]} players    Array de jogadores já ordenados por ranking (melhor primeiro)
 * @param {Set<string>} byes    IDs dos jogadores que recebem BYE
 * @param {number} totalSlots   Potência de 2 (tamanho total do bracket)
 * @returns {object[]}          Array de matches da R1
 */
function buildFirstRound(players, byes, totalSlots, rng = Math.random) {
  const n            = players.length;
  const totalMatches = totalSlots / 2;

  // Número de seeds conforme draw size (padrão ATP)
  // Draws pequenos de qualifying usam no máximo 2 seeds
  const numSeeds = totalSlots <= 8  ? Math.min(2, n)
                 : totalSlots <= 32 ? Math.min(4, n)
                 :                    Math.min(8, n);

  const seeds    = players.slice(0, numSeeds);
  const unseeded = players.slice(numSeeds);

  // Embaralha os não-seeds (Fisher-Yates)
  const shuffledUnseeded = [...unseeded];
  for (let i = shuffledUnseeded.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffledUnseeded[i], shuffledUnseeded[j]] = [shuffledUnseeded[j], shuffledUnseeded[i]];
  }

  // ── Distribuição ATP de seeds em seções ──────────────────────────
  const playerSlots = new Array(totalSlots).fill(null);

  if (numSeeds >= 2) {
    const sectionSize = Math.floor(totalSlots / numSeeds);
    const sectionOf   = new Array(numSeeds).fill(null);

    sectionOf[0]            = seeds[0];         // Seed 1: topo
    sectionOf[numSeeds - 1] = seeds[1] ?? null; // Seed 2: base

    if (numSeeds >= 4 && seeds.length >= 4) {
      // Seeds 3-4: sorteio nos meios de cada metade
      const s34a = numSeeds / 4;
      const s34b = (3 * numSeeds / 4) - 1;
      if (rng() < 0.5) { sectionOf[s34a] = seeds[2]; sectionOf[s34b] = seeds[3] ?? null; }
      else                      { sectionOf[s34a] = seeds[3] ?? null; sectionOf[s34b] = seeds[2]; }
    }

    if (numSeeds >= 8 && seeds.length >= 8) {
      // Seeds 5-8: sorteio nas seções livres restantes
      const s34a = numSeeds / 4;
      const s34b = (3 * numSeeds / 4) - 1;
      const freeSections = [];
      for (let sec = 1; sec < numSeeds - 1; sec++) {
        if (sec !== s34a && sec !== s34b) freeSections.push(sec);
      }
      const s58 = [seeds[4], seeds[5], seeds[6], seeds[7]].filter(Boolean);
      for (let i = s58.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [s58[i], s58[j]] = [s58[j], s58[i]];
      }
      freeSections.forEach((sec, i) => { if (s58[i]) sectionOf[sec] = s58[i]; });
    }

    // Coloca seeds nos primeiros slots de cada seção
    // (seed 2 vai ao ÚLTIMO slot do bracket)
    for (let sec = 0; sec < numSeeds; sec++) {
      const player = sectionOf[sec];
      if (!player) continue;
      const slot = (sec === numSeeds - 1) ? totalSlots - 1 : sec * sectionSize;
      playerSlots[slot] = player;
    }
  } else if (numSeeds === 1) {
    playerSlots[0] = seeds[0];
  }

  // Preenche slots vagos com unseeded aleatórios
  // Slot adjacente a um seed com BYE fica null (= oponente do BYE)
  let ui = 0;
  for (let i = 0; i < totalSlots; i++) {
    if (playerSlots[i] !== null) continue;
    const partnerSlot = i % 2 === 0 ? i + 1 : i - 1;
    const partner     = playerSlots[partnerSlot];
    if (partner && byes.has(partner.id)) continue; // mantém null = BYE
    playerSlots[i] = shuffledUnseeded[ui++] ?? null;
  }

  // ── Gera matches ─────────────────────────────────────────────────
  const matches = [];
  for (let m = 0; m < totalMatches; m++) {
    const a     = playerSlots[m * 2]     ?? null;
    const b     = playerSlots[m * 2 + 1] ?? null;
    const isBye = !a || !b;
    matches.push({
      matchId: `R1_${m}`,
      playerA: a,
      playerB: b,
      isBye,
      winner: isBye ? (a ?? b ?? null) : null,
      result: null,
    });
  }
  return matches;
}

/**
 * Versão exportada do buildFirstRound para uso em UniverseManager.
 * Constrói R1 com distribuição ATP real de seeds.
 * @param {object[]} sortedPlayers - Ordenados por ranking (melhor primeiro)
 * @param {number}   totalSlots    - Potência de 2
 * @returns {object[]} Array de matches R1
 */
export function buildATPFirstRound(sortedPlayers, totalSlots, rng = Math.random) {
  const byeCount = totalSlots - sortedPlayers.length;
  const byes     = new Set(sortedPlayers.slice(0, byeCount).map(p => p.id));
  return buildFirstRound(sortedPlayers, byes, totalSlots, rng);
}

/**
 * Gera posições no bracket para N jogadores (N = totalSlots = potência de 2).
 * Segue a lógica ATP: seed 1 no topo, seed 2 na outra metade,
 * seeds 3-4 em quartos diferentes, etc.
 */
function generateBracketPositions(n) {
  if (n === 1) return [0];

  // Distribui recursivamente: divide bracket em halvings
  function positions(count, offset) {
    if (count === 1) return [offset];
    const half = count / 2;
    const top = positions(half, offset);
    const bot = positions(half, offset + half);
    // Intercala: top[0], bot[0], top[1], bot[1], ...
    const result = [];
    for (let i = 0; i < top.length; i++) {
      result.push(top[i]);
      result.push(bot[i]);
    }
    return result;
  }

  // Gera posições "seed-aware":
  // Slot 0: seed 1 | Slot n-1: seed 2 | Slot n/2: seed 3 | Slot n/2-1: seed 4 | etc.
  const pos = new Array(n);
  let seedIdx = 0;

  function fill(start, end, seedStart) {
    if (end - start === 1) {
      pos[seedStart] = start;
      return;
    }
    const mid = (start + end) / 2;
    const mid2 = mid - 1;
    // Top half seed
    pos[seedStart] = start;
    // Bottom half seed
    if (seedStart + 1 < n) pos[seedStart + 1] = end - 1;

    if (end - start > 2) {
      fill(start, mid, seedStart + 2);
      if (seedStart + 3 < n) fill(mid, end, seedStart + 3);
    }
  }

  // Método simples: posições em zigue-zague para seeds
  const result = [];
  result.push(0);
  if (n >= 2) result.push(n - 1);
  if (n >= 4) { result.push(Math.floor(n / 2)); result.push(Math.floor(n / 2) - 1); }
  if (n >= 8) {
    result.push(Math.floor(n / 4));          // seed 5: topo do 2º quarto
    result.push(n - Math.floor(n / 4) - 1); // seed 6: base do 3º quarto
    result.push(Math.floor(n * 3 / 4));     // seed 7: topo do 4º quarto
    result.push(Math.floor(n / 4) - 1);     // seed 8: base do 1º quarto (era n*3/4-1 = DUPLICATA!)
  }

  // Preenche posições restantes em ordem
  const used = new Set(result);
  for (let i = 1; result.length < n; i++) {
    if (!used.has(i)) { result.push(i); used.add(i); }
  }

  return result;
}

// ═══════════════════════════════════════════════════════════════════
// QUALIFYING BRACKET
// ═══════════════════════════════════════════════════════════════════

/**
 * Gera um bracket de qualifying.
 * Os jogadores jogam eliminação simples até restar qualifyOut vencedores.
 *
 * Para qualifyIn que não é potência de 2 × qualifyOut, usa BYEs para
 * completar até a próxima potência de 2.
 *
 * @param {object[]} qualifyPlayers   Jogadores no qualifying (ordenados por ranking)
 * @param {number}   qualifyOut       Quantas vagas existem
 * @returns {QualifyingBracket}
 */
export function generateQualifyingBracket(qualifyPlayers, qualifyOut, rng = Math.random) {
  if (!qualifyPlayers || qualifyPlayers.length === 0) {
    return { isQualifying: true, qualifyOut: 0, rounds: [], currentRound: 0, isComplete: true, qualifiers: [] };
  }

  const capped = qualifyPlayers.slice(0, qualifyPlayers.length);
  const { byes, totalSlots } = assignByes(capped);
  const r1Matches = buildFirstRound(capped, byes, totalSlots, rng);

  return {
    isQualifying: true,
    qualifyOut,
    drawSize: capped.length,
    totalSlots,
    rounds: [r1Matches],
    currentRound: 0,
    isComplete: false,
    qualifiers: null,
  };
}

/**
 * Avança o qualifying bracket para a próxima rodada.
 * Para quando o número de vencedores ≤ qualifyOut.
 *
 * @param {QualifyingBracket} qBracket
 * @returns {QualifyingBracket}
 */
export function advanceQualifyingRound(qBracket) {
  const currentMatches = qBracket.rounds[qBracket.currentRound];
  const winners = currentMatches.map(m => m.winner).filter(Boolean);

  if (winners.length <= qBracket.qualifyOut) {
    return {
      ...qBracket,
      isComplete: true,
      qualifiers: winners.slice(0, qBracket.qualifyOut),
    };
  }

  // Monta próxima rodada
  const nextMatches = [];
  for (let i = 0; i < winners.length; i += 2) {
    const a = winners[i];
    const b = winners[i + 1] ?? null;
    nextMatches.push({
      matchId: `QR${qBracket.currentRound + 2}_${i / 2}`,
      playerA: a,
      playerB: b,
      isBye: !b,
      winner: !b ? a : null,
      result: null,
    });
  }

  return {
    ...qBracket,
    rounds: [...qBracket.rounds, nextMatches],
    currentRound: qBracket.currentRound + 1,
  };
}

export function prepareTournamentPackageSync({
  tournament,
  tourPlayers = [],
  prospects = [],
  playerSeasonSlots = {},
  seasonYear = null,
  matchResolver,
  applySeasonSlotTracking = false,
}) {
  if (!tournament) return null;

  const slotsClone = _cloneSeasonSlotsMap(playerSeasonSlots);
  const sortedTourPlayers = [...tourPlayers].sort((a, b) => (a.rankPosition ?? 999) - (b.rankPosition ?? 999));
  const sortedProspects = [...prospects].sort((a, b) => (a.rankPosition ?? 999) - (b.rankPosition ?? 999));
  const surface = tournament.surface ?? 'HARD';
  const courtKey = tournament.courtKey ?? (
    surface === 'CLAY' ? 'ROLAND_GARROS' :
    surface === 'GRASS' ? 'WIMBLEDON' :
    surface === 'INDOOR' ? 'O2_ARENA' :
    'US_OPEN'
  );
  const bestOf = tournament.bestOf ?? 3;
  const qualifyOut = tournament.qualifyOut ?? 0;
  const preQualIn = tournament.preQualIn ?? 0;
  const preQualOut = tournament.preQualOut ?? Math.ceil(preQualIn / 2);
  const seedBase = `${seasonYear ?? 'NA'}|${tournament.id}`;
  const drawRng = _seededRandomFactory(`${seedBase}|draw`);

  const {
    mainDraw: rawMain,
    qualifying: rawQual,
    preQualifying: rawPreQual,
  } = selectTournamentPlayers(tournament, sortedTourPlayers, sortedProspects, new Set(), slotsClone);

  if (applySeasonSlotTracking && ['ATP_500', 'ATP_250', 'MASTERS_1000'].includes(tournament.category)) {
    for (const player of [...rawMain, ...rawQual]) {
      if (!slotsClone[player.id]) slotsClone[player.id] = createSeasonSlots();
      updateSeasonSlots(slotsClone[player.id], player, tournament);
    }
  }

  const allParticipants = [...rawMain, ...rawQual, ...rawPreQual];
  const {
    injuryWithdrawals,
    injuryEvents,
    updatedByInjury,
  } = applyPreTournamentInjuries(allParticipants, tournament, seasonYear);

  const getPreparedPlayer = (player) => {
    if (!player || injuryWithdrawals.has(player.id)) return null;
    return applyInjuryToPlayer(updatedByInjury[player.id] ?? player);
  };

  const resolveMatch = typeof matchResolver === 'function'
    ? matchResolver
    : ((playerA) => ({ winner: playerA, result: null }));

  const qualRoundsData = [];
  const activePreQualifying = rawPreQual.map(getPreparedPlayer).filter(Boolean);
  const preQualStage = _runPreparedQualifyingStage({
    players: activePreQualifying,
    spotsToFill: preQualOut,
    rng: _seededRandomFactory(`${seedBase}|prequal`),
    matchResolver: resolveMatch,
    qualRoundsData,
    surface,
    phaseLabel: 'pre_qualifying',
    tournament,
    seasonYear,
  });

  const activeQualifying = [
    ...rawQual.map(getPreparedPlayer).filter(Boolean),
    ...(preQualStage.qualifiers ?? []),
  ];
  const qualStage = _runPreparedQualifyingStage({
    players: activeQualifying,
    spotsToFill: qualifyOut,
    rng: _seededRandomFactory(`${seedBase}|qualifying`),
    matchResolver: resolveMatch,
    qualRoundsData,
    surface,
    phaseLabel: 'qualifying',
    tournament,
    seasonYear,
  });

  const directEntrants = rawMain.map(getPreparedPlayer).filter(Boolean);
  const qualifiers = qualStage.qualifiers ?? [];
  const mainDrawPlayers = [...directEntrants, ...qualifiers]
    .sort((a, b) => (a.rankPosition ?? 999) - (b.rankPosition ?? 999))
    .slice(0, tournament.draw);

  return {
    tournamentId: tournament.id,
    seasonYear,
    surface,
    courtKey,
    bestOf,
    directEntrants,
    rawMainDraw: rawMain,
    rawQualifying: rawQual,
    rawPreQualifying: rawPreQual,
    preQualWinners: preQualStage.qualifiers ?? [],
    qualifiers,
    preQualBracket: preQualStage.bracket,
    qualifyingBracket: qualStage.bracket,
    mainDrawPlayers,
    bracket: generateBracket(tournament, mainDrawPlayers, drawRng),
    injuryWithdrawals,
    injuryEvents,
    updatedByInjury,
    qualRoundsData,
    wildcards: [],
    playerSeasonSlotsAfterSelection: slotsClone,
  };
}

/**
 * Avança o bracket para a próxima rodada.
 * Os vencedores da rodada atual formam os confrontos da próxima.
 *
 * @param {Bracket} bracket
 * @returns {Bracket} bracket atualizado
 */
export function advanceRound(bracket) {
  const currentMatches = bracket.rounds[bracket.currentRound];
  const winners = currentMatches.map(m => m.winner).filter(Boolean);

  if (winners.length <= 1) {
    // Torneio encerrado
    return {
      ...bracket,
      isComplete: true,
      champion: winners[0] ?? null,
    };
  }

  // Monta próxima rodada
  const nextMatches = [];
  for (let i = 0; i < winners.length; i += 2) {
    const a = winners[i];
    const b = winners[i + 1] ?? null;
    nextMatches.push({
      matchId: `R${bracket.currentRound + 2}_${i / 2}`,
      playerA: a,
      playerB: b,
      isBye: !b,
      winner: !b ? a : null,
      result: null,
    });
  }

  return {
    ...bracket,
    rounds: [...bracket.rounds, nextMatches],
    currentRound: bracket.currentRound + 1,
  };
}

/**
 * Retorna os labels das rodadas para um dado tamanho de draw.
 */
export function getRoundLabels(drawSize) {
  const labels = [];
  let s = drawSize;
  while (s >= 2) {
    if (s === 2) labels.push('F');
    else if (s === 4) labels.push('SF');
    else if (s === 8) labels.push('QF');
    else if (s === 16) labels.push('R16');
    else if (s === 32) labels.push('R32');
    else if (s === 64) labels.push('R64');
    else if (s === 128) labels.push('R128');
    else labels.push(`R${s}`);
    s = Math.ceil(s / 2);
  }
  return labels.reverse();
}

/**
 * Mapeia número de rodadas para label ATP.
 * roundIndex=0 → primeira rodada do draw principal.
 */
export function roundIndexToLabel(roundIndex, totalRounds) {
  const fromEnd = totalRounds - 1 - roundIndex;
  const labels = ['F', 'SF', 'QF', 'R16', 'R32', 'R64', 'R128'];
  return labels[fromEnd] ?? `R${Math.pow(2, fromEnd + 1)}`;
}

// ═══════════════════════════════════════════════════════════════════
// FORMATO FINALS (Round Robin)
// ═══════════════════════════════════════════════════════════════════

/**
 * Gera o schedule do round robin para 8 jogadores (2 grupos de 4).
 * Cada jogador enfrenta todos os outros do grupo.
 * Top 2 de cada grupo avança para semis.
 */
export function generateFinalsSchedule(players) {
  if (players.length < 8) {
    // Preenche com BYE se necessário
    while (players.length < 8) players.push(null);
  }

  const groupA = players.slice(0, 4);
  const groupB = players.slice(4, 8);

  function groupMatches(group, groupName) {
    const matches = [];
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        matches.push({
          matchId: `RR_${groupName}_${i}_${j}`,
          playerA: group[i],
          playerB: group[j],
          group: groupName,
          winner: null,
          result: null,
        });
      }
    }
    return matches;
  }

  return {
    groups: { A: groupA, B: groupB },
    roundRobin: [
      ...groupMatches(groupA, 'A'),
      ...groupMatches(groupB, 'B'),
    ],
    semifinals: [],
    final: null,
    champion: null,
  };
}

// ═══════════════════════════════════════════════════════════════════
// SEASON COUNTS — controle de cap de torneios por temporada
// ═══════════════════════════════════════════════════════════════════

/**
 * Cria contagem zerada para a temporada de um jogador.
 */
export function createSeasonSlots() {
  return { count250: 0, count500: 0 };
}

/**
 * Incrementa o contador após confirmação de entrada.
 */
export function updateSeasonSlots(slots, _player, tournament) {
  if (tournament.category === 'ATP_500') slots.count500 = (slots.count500 ?? 0) + 1;
  if (tournament.category === 'ATP_250') slots.count250 = (slots.count250 ?? 0) + 1;
  return slots;
}

/**
 * Decide se um jogador entra num torneio.
 *
 * Masters / GS : obrigatório (top 128)
 * ATP 100      : exclusivo para rank > 50
 * ATP 250/500  : probabilidade (ranking × preferência pessoal) com cap anual
 *
 * @param {object} player        Jogador
 * @param {object} tournament    Definição do torneio
 * @param {object} seasonCounts  { count250, count500 } — contadores da temporada
 * @returns {boolean}
 */
export function shouldPlayerEnter(player, tournament, seasonCounts) {
  const rank = player.rankPosition ?? 999;
  const { isSlam, isMasters, isATP100, isOlympic, category } = tournament;

  if (isOlympic) return true; // seleção feita em selectOlympicPlayers
  if (isSlam)    return true;
  if (isMasters) return rank <= 128;
  if (isATP100)  return rank > 64;

  if (category !== 'ATP_250' && category !== 'ATP_500') return false;

  const countKey = category === 'ATP_250' ? 'count250' : 'count500';
  if ((seasonCounts?.[countKey] ?? 0) >= _seasonCap(rank, category)) return false;

  return Math.random() < _entryProb(player, tournament);
}

// ═══════════════════════════════════════════════════════════════════
// DISTRIBUIÇÃO DE PONTOS PÓS-TORNEIO
// ═══════════════════════════════════════════════════════════════════

/**
 * Dado o resultado de um bracket, retorna os pontos ganhos por cada jogador.
 *
 * @param {object}   tournament
 * @param {Bracket}  bracket
 * @returns {Map<string, { round: string, points: number }>}
 */
export function computeTournamentPoints(tournament, bracket, rankingPoints) {
  const { category } = tournament;
  const pointTable = rankingPoints[category] ?? {};

  const playerPoints = new Map();
  const totalRounds = bracket.rounds.length;

  for (let ri = 0; ri < bracket.rounds.length; ri++) {
    const roundLabel = roundIndexToLabel(ri, totalRounds);
    for (const match of bracket.rounds[ri]) {
      // Perdedor sai nesta rodada
      const loser = match.playerA?.id === match.winner?.id
        ? match.playerB
        : match.playerA;

      if (loser && !match.isBye) {
        const pts = pointTable[roundLabel] ?? 0;
        if (!playerPoints.has(loser.id) || playerPoints.get(loser.id).roundIndex < ri) {
          playerPoints.set(loser.id, { round: roundLabel, points: pts, roundIndex: ri });
        }
      }
    }
  }

  // Campeão
  if (bracket.champion) {
    const pts = pointTable['W'] ?? 0;
    playerPoints.set(bracket.champion.id, { round: 'W', points: pts, roundIndex: totalRounds });
  }

  return playerPoints;
}
