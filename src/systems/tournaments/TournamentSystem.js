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
} from '../health/InjurySystem.js';
import { isPlayerUnavailableForTournament } from '../press/BreakingNewsSystem.js';
import { isJuniorEligible } from '../progression/OOutroMundo.js';

// ═══════════════════════════════════════════════════════════════════
// CALENDÁRIO — 48 TORNEIOS
// ═══════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────────────────
// PROBABILIDADE DE ENTRADA — 250 / 500
// Substitui o sistema de slots obrigatórios/opcionais.
// Base por ranking × multiplicador de preferência pessoal, com cap anual.
// ─────────────────────────────────────────────────────────────────────────────

function _base250(rank) {
  return rank <= 5  ? 0.10 :
         rank <= 8  ? 0.15 :
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

function _entryWeight(player, tournament) {
  const rank = player.rankPosition ?? 999;
  const base = tournament.category === 'ATP_250' ? _base250(rank) : _base500(rank);
  const pref = _prefMultiplier(player, tournament);
  const tiebreakNoise = ((_hashSeed(`${player?.id ?? 'P'}|${tournament?.id ?? 'T'}`) % 1000) / 1000) * 0.025;
  return base * pref + tiebreakNoise;
}

function _seasonCap(rank, category) {
  if (category === 'ATP_250') return rank <= 5 ? 5 : rank <= 10 ? 4 : rank <= 25 ? 5 : rank <= 50 ? 6 : 99;
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
const _100     = { draw:128, directSlots:128, qualDirectIn:0,  preQualIn:0,  qualifyOut:0,  bestOf:3, isMandatory:false, isSlam:false, isMasters:false, isATP100:true, isBaseCircuit:true };
const _75      = { draw:128, directSlots:128, qualDirectIn:0,  preQualIn:0,  qualifyOut:0,  bestOf:3, isMandatory:false, isSlam:false, isMasters:false, isATP75:true, isBaseCircuit:true };
const _50      = { draw:128, directSlots:128, qualDirectIn:0,  preQualIn:0,  qualifyOut:0,  bestOf:3, isMandatory:false, isSlam:false, isMasters:false, isATP50:true, isBaseCircuit:true };
const _25      = { draw:32,  directSlots:32,  qualDirectIn:0,  preQualIn:0,  qualifyOut:0,  bestOf:3, isMandatory:false, isSlam:false, isMasters:false, isATP25:true, isBaseCircuit:true };
const _PROS    = { draw:64, directSlots:64, qualDirectIn:0, preQualIn:0, qualifyOut:0, bestOf:3, isMandatory:false, isSlam:false, isMasters:false, isProspects:true, isJuniors:true };
const _PROS_FINALS = { draw:8, directSlots:8, qualDirectIn:0, preQualIn:0, qualifyOut:0, bestOf:3, isMandatory:false, isSlam:false, isMasters:false, isProspects:true, isProspectsFinals:true, isJuniors:true };
const _SLAM_CLASH = { draw:128, directSlots:128, qualDirectIn:0, preQualIn:0, qualifyOut:0, bestOf:1, isMandatory:false, isSlam:false, isMasters:false, isSlamClash:true, format:'SUPER_TB_10' };
// Olimpíadas: 64 draw, entrada por nacionalidade, sem pontos ATP, MD3
const _OLYMPIC = { draw:64, directSlots:64, qualDirectIn:0, preQualIn:0, qualifyOut:0, bestOf:3, isMandatory:false, isSlam:false, isMasters:false, isOlympic:true };

const RAW_BASE_CALENDAR = [
  // ── HARD — Janeiro · Fevereiro · Março ────────────────────────────────────
  { id:'JAN_SLAM_CLASH_HARD',  name:'Clash Slam Hard',           category:'SLAM_CLASH',   surface:'HARD',   courtKey:'US_OPEN',       month:'Janeiro',  monthNum:1,  weekIndex:0,  icon:'⚔️', location:'Aurelia Prime', ..._SLAM_CLASH },
  { id:'JAN_250_AURELIA',      name:'Open de Aurelia',           category:'ATP_250',      surface:'HARD',   courtKey:'US_OPEN',       month:'Janeiro',  monthNum:1,  weekIndex:1,  icon:'🌅', location:'Aurelia',      ..._250_500 },
  { id:'JAN_250_INDICO',       name:'Copa do Índico',             category:'ATP_250',      surface:'HARD',   courtKey:'US_OPEN',       month:'Janeiro',  monthNum:1,  weekIndex:2,  icon:'🌊', location:'Índico',       ..._250_500 },
  { id:'JAN_100_CHALLENGER',   name:'Challenger de Janeiro',     category:'ATP_100',      surface:'HARD',   courtKey:'US_OPEN',       month:'Janeiro',  monthNum:1,  weekIndex:2,  icon:'🥈', location:'Nova Côrtes',  ..._100 },
  { id:'JAN_PROSPECTS_OPEN',   name:'Junior Open de Meridian',   category:'ATP_PROSPECTS',surface:'HARD',   courtKey:'US_OPEN',       month:'Janeiro',  monthNum:1,  weekIndex:2,  icon:'🌱', location:'Meridian',     ..._PROS },
  { id:'JAN_M1000_GOLD_COAST', name:'Gold Coast Masters',        category:'MASTERS_1000', surface:'HARD',   courtKey:'US_OPEN',       month:'Janeiro',  monthNum:1,  weekIndex:3,  icon:'🏆', location:'Gold Coast',   ..._M1000 },
  { id:'FEV_500_CASABLANCA',   name:'Torneio de Casablanca',     category:'ATP_500',      surface:'HARD',   courtKey:'US_OPEN',       month:'Fevereiro',monthNum:2,  weekIndex:4,  icon:'🌴', location:'Casablanca',   ..._250_500 },
  { id:'FEV_250_PACIFICO',     name:'Open do Pacífico Sul',      category:'ATP_250',      surface:'HARD',   courtKey:'US_OPEN',       month:'Fevereiro',monthNum:2,  weekIndex:5,  icon:'🐚', location:'Pacífico Sul', ..._250_500 },
  { id:'FEV_100_CHALLENGER',   name:'Challenger de Inverno',     category:'ATP_100',      surface:'HARD',   courtKey:'US_OPEN',       month:'Fevereiro',monthNum:2,  weekIndex:5,  icon:'🥈', location:'Nova Côrtes',  ..._100 },
  { id:'MAR_M1000_DESERT',     name:'Desert Masters',            category:'MASTERS_1000', surface:'HARD',   courtKey:'US_OPEN',       month:'Fevereiro',monthNum:2,  weekIndex:7,  icon:'🏜️', location:'Desert',       ..._M1000 },
  { id:'MAR_M1000_BAY',        name:'Bay Masters',               category:'MASTERS_1000', surface:'HARD',   courtKey:'US_OPEN',       month:'Março',    monthNum:3,  weekIndex:8,  icon:'🌁', location:'Bay City',     ..._M1000 },
  { id:'MAR_250_VALENCIA',     name:'Open de Valência',          category:'ATP_250',      surface:'HARD',   courtKey:'US_OPEN',       month:'Março',    monthNum:3,  weekIndex:9,  icon:'🍊', location:'Valência',     ..._250_500 },
  { id:'MAR_100_PRIMAVERA',    name:'Challenger de Primavera',   category:'ATP_100',      surface:'HARD',   courtKey:'US_OPEN',       month:'Março',    monthNum:3,  weekIndex:10, icon:'🥈', location:'Nova Côrtes',  ..._100 },
  { id:'MAR_PROSPECTS_SUN',    name:'Junior Sunshine Cup',       category:'ATP_PROSPECTS',surface:'HARD',   courtKey:'US_OPEN',       month:'Março',    monthNum:3,  weekIndex:10, icon:'🌱', location:'Sun Bay',      ..._PROS },
  { id:'JAN_GS_MERIDIAN',      name:'Open de Meridian',          category:'GRAND_SLAM',   surface:'HARD',   courtKey:'US_OPEN',       month:'Março',    monthNum:3,  weekIndex:11, icon:'⭐', location:'Meridian',     ..._GS },

  // ── CLAY — Abril · Maio · Junho ───────────────────────────────────────────
  { id:'ABR_SLAM_CLASH_CLAY',  name:'Clash Slam Clay',           category:'SLAM_CLASH',   surface:'CLAY',   courtKey:'ROLAND_GARROS', month:'Abril',    monthNum:4,  weekIndex:12, icon:'⚔️', location:'Monte Ferro',  ..._SLAM_CLASH },
  { id:'ABR_500_PROVENCA',     name:'Open de Provença',          category:'ATP_500',      surface:'CLAY',   courtKey:'ROLAND_GARROS', month:'Abril',    monthNum:4,  weekIndex:12, icon:'🌺', location:'Provença',     ..._250_500 },
  { id:'ABR_100_TERRA',        name:'Copa de Terra Vermelha',    category:'ATP_100',      surface:'CLAY',   courtKey:'ROLAND_GARROS', month:'Abril',    monthNum:4,  weekIndex:13, icon:'🥈', location:'Florença',     ..._100 },
  { id:'ABR_PROSPECTS_CLAY',   name:'Junior Clay Crown',         category:'ATP_PROSPECTS',surface:'CLAY',   courtKey:'ROLAND_GARROS', month:'Abril',    monthNum:4,  weekIndex:13, icon:'🌱', location:'Monte Ferro',  ..._PROS },
  { id:'ABR_250_ADRIATICA',    name:'Copa Adriática',            category:'ATP_250',      surface:'CLAY',   courtKey:'ROLAND_GARROS', month:'Abril',    monthNum:4,  weekIndex:13, icon:'⚓', location:'Adriática',    ..._250_500 },
  { id:'MAI_M1000_MONTE',      name:'Monte Rosso Masters',       category:'MASTERS_1000', surface:'CLAY',   courtKey:'ROLAND_GARROS', month:'Maio',     monthNum:5,  weekIndex:15, icon:'🔴', location:'Monte Rosso',  ..._M1000 },
  { id:'MAI_100_SAIBRO',       name:'Copa do Saibro',            category:'ATP_100',      surface:'CLAY',   courtKey:'ROLAND_GARROS', month:'Maio',     monthNum:5,  weekIndex:16, icon:'🥈', location:'Valência',     ..._100 },
  { id:'MAI_500_CATALUNHA',    name:'ATP 500 da Catalunha',      category:'ATP_500',      surface:'CLAY',   courtKey:'ROLAND_GARROS', month:'Maio',     monthNum:5,  weekIndex:16, icon:'🏴', location:'Catalunha',    ..._250_500 },
  { id:'MAI_M1000_ETERNAL',    name:'Eternal City Masters',      category:'MASTERS_1000', surface:'CLAY',   courtKey:'ROLAND_GARROS', month:'Maio',     monthNum:5,  weekIndex:17, icon:'🏟️', location:'Eternal City', ..._M1000 },
  { id:'JUN_500_QUEENS',       name:"Queen's Cup",               category:'ATP_500',      surface:'CLAY',   courtKey:'ROLAND_GARROS', month:'Junho',    monthNum:6,  weekIndex:18, icon:'👑', location:"Queen's",      ..._250_500 },
  { id:'JUN_100_CHALLENGER',   name:'Challenger de Junho',       category:'ATP_100',      surface:'CLAY',   courtKey:'ROLAND_GARROS', month:'Junho',    monthNum:6,  weekIndex:19, icon:'🥈', location:'Brighton',     ..._100 },
  { id:'JUN_PROSPECTS_PARIS',  name:'Junior Roland Path',        category:'ATP_PROSPECTS',surface:'CLAY',   courtKey:'ROLAND_GARROS', month:'Junho',    monthNum:6,  weekIndex:19, icon:'🌱', location:'Occitane',     ..._PROS },
  { id:'JUN_250_HALLE',        name:'Open de Halle',             category:'ATP_250',      surface:'CLAY',   courtKey:'ROLAND_GARROS', month:'Junho',    monthNum:6,  weekIndex:19, icon:'🌿', location:'Halle',        ..._250_500 },
  { id:'MAI_GS_ROLAND',        name:"Roland d'Occitane",         category:'GRAND_SLAM',   surface:'CLAY',   courtKey:'ROLAND_GARROS', month:'Junho',    monthNum:6,  weekIndex:20, icon:'⭐', location:'Occitane',     ..._GS },

  // ── GRASS — Julho · Agosto · Setembro ─────────────────────────────────────
  { id:'JUL_SLAM_CLASH_GRASS', name:'Clash Slam Grass',          category:'SLAM_CLASH',   surface:'GRASS',  courtKey:'WIMBLEDON',     month:'Julho',    monthNum:7,  weekIndex:21, icon:'⚔️', location:'Albion Park',  ..._SLAM_CLASH },
  { id:'JUL_500_HAMBURGO',     name:'Open de Hamburgo',          category:'ATP_500',      surface:'GRASS',  courtKey:'WIMBLEDON',     month:'Julho',    monthNum:7,  weekIndex:21, icon:'⚓', location:'Hamburgo',     ..._250_500 },
  { id:'JUL_100_NORDICO',      name:'Challenger Nórdico',        category:'ATP_100',      surface:'GRASS',  courtKey:'WIMBLEDON',     month:'Julho',    monthNum:7,  weekIndex:22, icon:'🥈', location:'Estocolmo',    ..._100 },
  { id:'JUL_PROSPECTS_GRASS',  name:'Junior Albion Cup',         category:'ATP_PROSPECTS',surface:'GRASS',  courtKey:'WIMBLEDON',     month:'Julho',    monthNum:7,  weekIndex:22, icon:'🌱', location:'Albion Park',  ..._PROS },
  { id:'JUL_250_MEDITERRANEO', name:'Copa do Mediterrâneo',      category:'ATP_250',      surface:'GRASS',  courtKey:'WIMBLEDON',     month:'Julho',    monthNum:7,  weekIndex:22, icon:'🚢', location:'Mediterrâneo', ..._250_500 },
  { id:'JUL_250_LAGOS',        name:'Open de Lagos',             category:'ATP_250',      surface:'GRASS',  courtKey:'WIMBLEDON',     month:'Julho',    monthNum:7,  weekIndex:23, icon:'🌍', location:'Lagos',        ..._250_500 },
  // ── OLIMPÍADAS (apenas em anos olímpicos: year % 4 === 0) ──────────────────
  { id:'JUL_OLYMPICS',         name:'Jogos Olímpicos — Tênis',   category:'OLYMPICS',     surface:'HARD',   courtKey:'US_OPEN',       month:'Julho',    monthNum:7,  weekIndex:24, icon:'🥇', location:'Sede Olímpica', ..._OLYMPIC },

  { id:'AGO_M1000_LAKESHORE',  name:'Lakeshore Masters',         category:'MASTERS_1000', surface:'GRASS',  courtKey:'WIMBLEDON',     month:'Agosto',   monthNum:8,  weekIndex:25, icon:'🏙️', location:'Lakeshore',    ..._M1000 },
  { id:'AGO_100_VERAO',        name:'Challenger de Verão',       category:'ATP_100',      surface:'GRASS',  courtKey:'WIMBLEDON',     month:'Agosto',   monthNum:8,  weekIndex:26, icon:'🥈', location:'Atlantic',     ..._100 },
  { id:'AGO_M1000_ATLANTIC',   name:'Atlantic Masters',          category:'MASTERS_1000', surface:'GRASS',  courtKey:'WIMBLEDON',     month:'Agosto',   monthNum:8,  weekIndex:26, icon:'🌊', location:'Atlantic',     ..._M1000 },
  { id:'AGO_500_COSTA_LESTE',  name:'Open da Costa Leste',       category:'ATP_500',      surface:'GRASS',  courtKey:'WIMBLEDON',     month:'Agosto',   monthNum:8,  weekIndex:27, icon:'🗽', location:'Costa Leste',  ..._250_500 },
  { id:'SET_500_TOQUIO',       name:'Open de Tóquio',            category:'ATP_500',      surface:'GRASS',  courtKey:'WIMBLEDON',     month:'Setembro', monthNum:9,  weekIndex:28, icon:'🗼', location:'Tóquio',       ..._250_500 },
  { id:'SET_100_OUTONO',       name:'Open de Outono',            category:'ATP_100',      surface:'GRASS',  courtKey:'WIMBLEDON',     month:'Setembro', monthNum:9,  weekIndex:29, icon:'🥈', location:'Porto mbar',  ..._100 },
  { id:'SET_PROSPECTS_NA',     name:'Junior North America',      category:'ATP_PROSPECTS',surface:'GRASS',  courtKey:'WIMBLEDON',     month:'Setembro', monthNum:9,  weekIndex:29, icon:'🌱', location:'Lakeshore',    ..._PROS },
  { id:'SET_250_AMERICAS',     name:'Copa das Américas',         category:'ATP_250',      surface:'GRASS',  courtKey:'WIMBLEDON',     month:'Setembro', monthNum:9,  weekIndex:29, icon:'🌎', location:'Américas',     ..._250_500 },
  { id:'JUN_GS_ALBION',        name:'Championships of Albion',   category:'GRAND_SLAM',   surface:'GRASS',  courtKey:'WIMBLEDON',     month:'Setembro', monthNum:9,  weekIndex:30, icon:'⭐', location:'Albion',       ..._GS },

  // ── INDOOR — Outubro · Novembro · Dezembro ────────────────────────────────
  { id:'OUT_SLAM_CLASH_INDOOR',name:'Clash Slam Indoor',         category:'SLAM_CLASH',   surface:'INDOOR', courtKey:'O2_ARENA',      month:'Outubro',  monthNum:10, weekIndex:31, icon:'⚔️', location:'Empire Dome',  ..._SLAM_CLASH },
  { id:'OUT_M1000_DRAGON',     name:'Dragon Cup Masters',        category:'MASTERS_1000', surface:'INDOOR', courtKey:'O2_ARENA',      month:'Outubro',  monthNum:10, weekIndex:31, icon:'🐉', location:'Dragon City',  ..._M1000 },
  { id:'OUT_500_SEUL',         name:'Open de Seul',              category:'ATP_500',      surface:'INDOOR', courtKey:'O2_ARENA',      month:'Outubro',  monthNum:10, weekIndex:32, icon:'🌸', location:'Seul',         ..._250_500 },
  { id:'OUT_100_INDOOR',       name:'Challenger Indoor',         category:'ATP_100',      surface:'INDOOR', courtKey:'O2_ARENA',      month:'Outubro',  monthNum:10, weekIndex:33, icon:'🥈', location:'Dragon City',  ..._100 },
  { id:'OUT_PROSPECTS_INDOOR', name:'Junior Indoor Lab',         category:'ATP_PROSPECTS',surface:'INDOOR', courtKey:'O2_ARENA',      month:'Outubro',  monthNum:10, weekIndex:33, icon:'🌱', location:'Empire Dome',  ..._PROS },
  { id:'OUT_250_XANGAI',       name:'Open de Xangai',            category:'ATP_250',      surface:'INDOOR', courtKey:'O2_ARENA',      month:'Outubro',  monthNum:10, weekIndex:33, icon:'🏮', location:'Xangai',       ..._250_500 },
  { id:'NOV_250_VIENA',        name:'Open de Viena',             category:'ATP_250',      surface:'INDOOR', courtKey:'O2_ARENA',      month:'Novembro', monthNum:11, weekIndex:35, icon:'🎼', location:'Viena',        ..._250_500 },
  { id:'NOV_100_ENCERRAMENTO', name:'Challenger de Encerramento',category:'ATP_100',      surface:'INDOOR', courtKey:'O2_ARENA',      month:'Novembro', monthNum:11, weekIndex:36, icon:'🥈', location:'Berlim',       ..._100 },
  { id:'NOV_PROSPECTS_FINALE', name:'Junior Closing Cup',        category:'ATP_PROSPECTS',surface:'INDOOR', courtKey:'O2_ARENA',      month:'Novembro', monthNum:11, weekIndex:36, icon:'🌱', location:'Capital',      ..._PROS },
  { id:'NOV_500_PARIS',        name:'Open de Paris',             category:'ATP_500',      surface:'INDOOR', courtKey:'O2_ARENA',      month:'Novembro', monthNum:11, weekIndex:36, icon:'🗼', location:'Paris',        ..._250_500 },
  { id:'NOV_M1000_CAPITAL',    name:'Capital Indoor Masters',    category:'MASTERS_1000', surface:'INDOOR', courtKey:'O2_ARENA',      month:'Novembro', monthNum:11, weekIndex:37, icon:'🏟️', location:'Capital',      ..._M1000 },
  { id:'AGO_GS_EMPIRE',        name:'Empire Open',               category:'GRAND_SLAM',   surface:'INDOOR', courtKey:'O2_ARENA',      month:'Novembro', monthNum:11, weekIndex:38, icon:'⭐', location:'Empire City',  ..._GS },
  { id:'DEZ_100_DEZEMBRO',     name:'Challenger de Dezembro',    category:'ATP_100',      surface:'INDOOR', courtKey:'O2_ARENA',      month:'Dezembro', monthNum:12, weekIndex:39, icon:'🥈', location:'Grand Arena',  ..._100 },
  { id:'DEZ_PROSPECTS_FINALS', name:'Junior Finals',             category:'PROSPECTS_FINALS',surface:'INDOOR', courtKey:'O2_ARENA',    month:'Dezembro', monthNum:12, weekIndex:39, icon:'🌟', location:'Grand Arena',  ..._PROS_FINALS },
  { id:'DEZ_ATP_FINALS',       name:'ATP Finals',                category:'FINALS',       surface:'INDOOR', courtKey:'O2_ARENA',      month:'Dezembro', monthNum:12, weekIndex:40, icon:'🏆', location:'Grand Arena',  draw:8, directSlots:8, qualDirectIn:0, preQualIn:0, qualifyOut:0, bestOf:3, isMandatory:false, isSlam:false, isMasters:false, isFinals:true },
  { id:'FEV_75_SATELLITE',     name:'Circuit 75 Aurora',         category:'ATP_75',       surface:'HARD',   courtKey:'US_OPEN',       month:'Fevereiro',monthNum:2,  weekIndex:6,  icon:'🥉', location:'Aurora',       ..._75 },
  { id:'MAR_50_BREAKTHROUGH',  name:'Breakthrough 50',           category:'ATP_50',       surface:'HARD',   courtKey:'US_OPEN',       month:'Março',    monthNum:3,  weekIndex:10, icon:'🥉', location:'Sun Bay',      ..._50 },
  { id:'ABR_75_FORGE',         name:'Forge 75',                  category:'ATP_75',       surface:'CLAY',   courtKey:'ROLAND_GARROS', month:'Abril',    monthNum:4,  weekIndex:14, icon:'🥉', location:'Forja',        ..._75 },
  { id:'JUL_50_MEADOW',        name:'Meadow 50',                 category:'ATP_50',       surface:'GRASS',  courtKey:'WIMBLEDON',     month:'Julho',    monthNum:7,  weekIndex:23, icon:'🥉', location:'Meadow',       ..._50 },
  { id:'SET_25_FRONTIER',      name:'Frontier 25',               category:'ATP_25',       surface:'GRASS',  courtKey:'WIMBLEDON',     month:'Setembro', monthNum:9,  weekIndex:29, icon:'🥉', location:'Frontier',     ..._25 },
  { id:'OUT_75_FACTORY',       name:'Factory 75',                category:'ATP_75',       surface:'INDOOR', courtKey:'O2_ARENA',      month:'Outubro',  monthNum:10, weekIndex:34, icon:'🥉', location:'Factory',      ..._75 },
  { id:'DEZ_25_LAST_MILE',     name:'Last Mile 25',              category:'ATP_25',       surface:'INDOOR', courtKey:'O2_ARENA',      month:'Dezembro', monthNum:12, weekIndex:39, icon:'🥉', location:'Last Mile',    ..._25 },
];

const BASE_CALENDAR = RAW_BASE_CALENDAR.map((t) => (
  t.category === 'ATP_250' || t.category === 'ATP_500'
    ? {
        ...t,
        parallelGroup: `W${t.weekIndex}_${t.category}`,
        sourceTournamentId: t.id,
        isAlternateEvent: false,
      }
    : t
));

const ATP_PARALLEL_VARIANTS = {
  JAN_250_AURELIA:      { id: 'JAN_250_SOLARIA',       name: 'Open de Solaria',              location: 'Solaria',        icon: '☀️' },
  JAN_250_INDICO:       { id: 'JAN_250_CORAIS',        name: 'Troféu dos Corais',            location: 'Costa Coral',    icon: '🪸' },
  FEV_500_CASABLANCA:   { id: 'FEV_500_MARRAKECH',     name: 'Grande Prêmio de Marrakech',   location: 'Marrakech',      icon: '🌺' },
  FEV_250_PACIFICO:     { id: 'FEV_250_AZURA',         name: 'Open de Azura',                location: 'Azura',          icon: '🐬' },
  MAR_250_VALENCIA:     { id: 'MAR_250_SEVILHA',       name: 'Copa de Sevilha',              location: 'Sevilha',        icon: '🍋' },
  ABR_500_PROVENCA:     { id: 'ABR_500_MONACO',        name: 'Masters da Riviera',           location: 'Riviera',        icon: '🛥️' },
  ABR_250_ADRIATICA:    { id: 'ABR_250_DALMACIA',      name: 'Open da Dalmácia',             location: 'Dalmácia',       icon: '🌊' },
  MAI_500_CATALUNHA:    { id: 'MAI_500_ANDALUZIA',     name: 'ATP 500 da Andaluzia',         location: 'Andaluzia',      icon: '🟥' },
  JUN_500_QUEENS:       { id: 'JUN_500_OXFORD',        name: 'Oxford Championships',         location: 'Oxford',         icon: '🎩' },
  JUN_250_HALLE:        { id: 'JUN_250_STUTTGART',     name: 'Open de Stuttgart',            location: 'Stuttgart',      icon: '🌱' },
  JUL_500_HAMBURGO:     { id: 'JUL_500_BREMEN',        name: 'Troféu de Bremen',             location: 'Bremen',         icon: '⛵' },
  JUL_250_MEDITERRANEO: { id: 'JUL_250_SARDENHA',      name: 'Copa da Sardenha',             location: 'Sardenha',       icon: '🏝️' },
  JUL_250_LAGOS:        { id: 'JUL_250_ACCRA',         name: 'Open de Accra',                location: 'Accra',          icon: '🌍' },
  AGO_500_COSTA_LESTE:  { id: 'AGO_500_SUNSET',        name: 'Sunset Coast Open',            location: 'Sunset Coast',   icon: '🌇' },
  SET_500_TOQUIO:       { id: 'SET_500_OSAKA',         name: 'Open de Osaka',                location: 'Osaka',          icon: '🎌' },
  SET_250_AMERICAS:     { id: 'SET_250_CARIBE',        name: 'Taça do Caribe',               location: 'Caribe',         icon: '🌴' },
  OUT_500_SEUL:         { id: 'OUT_500_BUSAN',         name: 'Busan Indoor Open',            location: 'Busan',          icon: '🌃' },
  OUT_250_XANGAI:       { id: 'OUT_250_HONGKONG',      name: 'Hong Kong Indoor Cup',         location: 'Hong Kong',      icon: '🏙️' },
  NOV_250_VIENA:        { id: 'NOV_250_PRAGA',         name: 'Open de Praga',                location: 'Praga',          icon: '🏛️' },
  NOV_500_PARIS:        { id: 'NOV_500_LYON',          name: 'Lyon Indoor Championships',    location: 'Lyon',           icon: '🍷' },
};

function buildParallelATPEvents(calendar) {
  return calendar
    .filter(t => t.category === 'ATP_250' || t.category === 'ATP_500')
    .map((t) => {
      const variant = ATP_PARALLEL_VARIANTS[t.id];
      if (!variant) {
        throw new Error(`[TournamentSystem] ATP paralelo obrigatório ausente para ${t.id}. ATP 250/500 precisam existir em dupla na mesma semana.`);
      }
      return {
        ...t,
        id: variant.id,
        name: variant.name,
        location: variant.location,
        icon: variant.icon ?? t.icon,
        sourceTournamentId: t.id,
        parallelGroup: `W${t.weekIndex}_${t.category}`,
        isAlternateEvent: true,
      };
    });
}

function validateParallelATPCalendar(calendar) {
  const groups = new Map();
  for (const tournament of calendar) {
    if (tournament?.category !== 'ATP_250' && tournament?.category !== 'ATP_500') continue;
    if (!tournament?.parallelGroup) {
      throw new Error(`[TournamentSystem] ${tournament.id} sem parallelGroup. ATP 250/500 precisam rodar em dupla na mesma semana.`);
    }
    const list = groups.get(tournament.parallelGroup) ?? [];
    list.push(tournament);
    groups.set(tournament.parallelGroup, list);
  }

  for (const [groupId, tournaments] of groups.entries()) {
    if (tournaments.length !== 2) {
      const ids = tournaments.map(t => t.id).join(', ');
      throw new Error(`[TournamentSystem] Grupo paralelo ${groupId} inválido (${tournaments.length} torneios: ${ids}). ATP 250/500 precisam formar pares fixos por semana.`);
    }

    const [first, second] = tournaments;
    if (first.weekIndex !== second.weekIndex || first.category !== second.category) {
      throw new Error(`[TournamentSystem] Grupo paralelo ${groupId} desalinhado. Os pares ATP 250/500 precisam compartilhar semana e categoria.`);
    }
  }

  return calendar;
}

export const CALENDAR = validateParallelATPCalendar([...BASE_CALENDAR, ...buildParallelATPEvents(BASE_CALENDAR)])
  .sort((a, b) => (a.weekIndex ?? 999) - (b.weekIndex ?? 999) || String(a.id).localeCompare(String(b.id)));

export const TOURNAMENT_MAP = Object.fromEntries(CALENDAR.map(t => [t.id, t]));

function getParallelSiblingTournaments(tournament) {
  if (!tournament?.parallelGroup) return [tournament].filter(Boolean);
  return CALENDAR.filter(t => t.parallelGroup === tournament.parallelGroup);
}

function chooseParallelTournamentForPlayer(player, tournament) {
  const siblings = getParallelSiblingTournaments(tournament);
  if (siblings.length <= 1) return tournament?.id ?? null;

  let bestTournament = siblings[0];
  let bestWeight = -Infinity;
  for (const option of siblings) {
    const weight = _entryWeight(player, option);
    if (weight > bestWeight) {
      bestWeight = weight;
      bestTournament = option;
    }
  }
  return bestTournament?.id ?? tournament?.id ?? null;
}

/**
 * Verifica se o jogador está excluído de um torneio paralelo (sem randomização).
 * Usado para filtrar qualifying/preQualifying e refillMainDrawField.
 * Retorna true se o jogador deveria jogar em outro torneio do mesmo grupo.
 */
function isParallelExcluded(player, tournament) {
  if (!tournament?.parallelGroup) return false;
  const chosen = chooseParallelTournamentForPlayer(player, tournament);
  return chosen !== tournament.id;
}

function getBaseCircuitBand(tournament) {
  if (tournament?.category === 'ATP_100' || tournament?.isATP100) return { minRankExclusive: 32, maxRankInclusive: 250, sort: 'asc' };
  if (tournament?.category === 'ATP_75'  || tournament?.isATP75)  return { minRankExclusive: 79, maxRankInclusive: 250, sort: 'asc' };
  if (tournament?.category === 'ATP_50'  || tournament?.isATP50)  return { minRankExclusive: 99, maxRankInclusive: 250, sort: 'desc' };
  if (tournament?.category === 'ATP_25'  || tournament?.isATP25)  return { minRankExclusive: 179, maxRankInclusive: 250, sort: 'desc' };
  return null;
}

function sortTournamentCandidates(players = [], tournament) {
  const band = getBaseCircuitBand(tournament);
  const sortMode = band?.sort ?? 'asc';
  return [...players].sort((a, b) => {
    const rankA = getPlayerRankPosition(a);
    const rankB = getPlayerRankPosition(b);
    if (rankA !== rankB) return sortMode === 'desc' ? rankB - rankA : rankA - rankB;
    return String(a.id ?? '').localeCompare(String(b.id ?? ''));
  });
}

function getPlayerRankPosition(player) {
  const raw = player?.rankPosition ?? player?._rankPosition ?? null;
  const rank = Number(raw);
  return Number.isFinite(rank) && rank > 0 ? rank : 999;
}

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
    .sort((a, b) => getPlayerRankPosition(a) - getPlayerRankPosition(b));

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
  const { category, draw, directSlots, qualDirectIn = 0, preQualIn = 0, isFinals, isATP100, isATP75, isATP50, isATP25, isSlam, isMasters, isOlympic, isSlamClash, isProspects, isProspectsFinals } = tournament;
  const isFinalsCategory = isFinals || category === 'FINALS';
  const isBaseCircuitCategory = isATP100 || isATP75 || isATP50 || isATP25
    || category === 'ATP_100' || category === 'ATP_75' || category === 'ATP_50' || category === 'ATP_25';
  const isProspectsCategory = isProspects || category === 'ATP_PROSPECTS';
  const isProspectsFinalsCategory = isProspectsFinals || category === 'PROSPECTS_FINALS';

  // ── OLIMPÍADAS: entrada por nacionalidade, máx 4 por país ──────────
  if (isOlympic) {
    return selectOlympicPlayers(allPlayers, injured, draw);
  }

  // ── FINALS: top N por ranking, sem qualify ─────────────────────────
  if (isFinalsCategory) {
    return {
      mainDraw: allPlayers
        .filter(p => !injured.has(p.id) && !isPlayerUnavailableForTournament(p))
        .sort((a, b) => getPlayerRankPosition(a) - getPlayerRankPosition(b))
        .slice(0, draw),
      qualifying: [], preQualifying: [],
    };
  }

  if (isProspectsFinalsCategory) {
    return {
      mainDraw: prospects
        .filter(p => !injured.has(p.id) && !isPlayerUnavailableForTournament(p) && isJuniorEligible(p))
        .sort((a, b) => getPlayerRankPosition(a) - getPlayerRankPosition(b))
        .slice(0, draw),
      qualifying: [],
      preQualifying: [],
    };
  }

  if (isProspectsCategory) {
    const juniors = prospects
      .filter(p => !injured.has(p.id) && !isPlayerUnavailableForTournament(p) && isJuniorEligible(p))
      .sort((a, b) => getPlayerRankPosition(a) - getPlayerRankPosition(b))
      .slice(0, draw);
    return { mainDraw: juniors, qualifying: [], preQualifying: [] };
  }

  // ── ATP 100: ranks 65-192 diretos, sem qualify, sem filler de prospects ──
  if (isBaseCircuitCategory) {
    const band = getBaseCircuitBand(tournament);
    const baseField = sortTournamentCandidates(
      allPlayers.filter(p => {
        const rank = getPlayerRankPosition(p);
        return (
          !injured.has(p.id) &&
          !isPlayerUnavailableForTournament(p) &&
          rank > (band?.minRankExclusive ?? 0) &&
          rank <= (band?.maxRankInclusive ?? 9999)
        );
      }),
      tournament,
    )
      .slice(0, draw);
    return { mainDraw: baseField, qualifying: [], preQualifying: [] };
  }

  // ── GRAND SLAM: todos os 128 diretos, sem qualify ──────────────────
  // Lesionados são substituídos pelos prospects mais bem classificados.
  if (isSlam || isSlamClash) {
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

  const notInjured = allPlayers
    .filter(p => !injured.has(p.id) && !isPlayerUnavailableForTournament(p))
    .sort((a, b) => getPlayerRankPosition(a) - getPlayerRankPosition(b));

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

  // Qualify: próximos qualDirectIn por rank, excluindo main draw, pool de candidatos
  // e jogadores que escolheram o torneio paralelo (parallelGroup)
  const qualifying = notInjured
    .filter(p => !inMainIds.has(p.id) && !mainDrawPool.has(p.id) && !isParallelExcluded(p, tournament))
    .slice(0, qualDirectIn);

  // Pré-Qualify (M1000 apenas): próximos preQualIn, excluindo main, qualifying e paralelo
  const inQualIds = new Set(qualifying.map(p => p.id));
  const preQualifying = preQualIn > 0
    ? notInjured
        .filter(p => !inMainIds.has(p.id) && !mainDrawPool.has(p.id) && !inQualIds.has(p.id) && !isParallelExcluded(p, tournament))
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

function buildMainDrawFieldWithQualifiedSpots(tournament, directEntrants = [], qualifiers = []) {
  const drawSize = tournament?.draw ?? 0;
  const safeQualifiers = [...(qualifiers ?? [])].filter(Boolean);
  const safeDirectEntrants = [...(directEntrants ?? [])].filter(Boolean);

  if (drawSize <= 0) return [];

  const reservedQualifierSpots = Math.min(
    safeQualifiers.length,
    tournament?.qualifyOut ?? safeQualifiers.length,
    drawSize,
  );
  const reservedDirectSpots = Math.max(0, drawSize - reservedQualifierSpots);

  const selectedDirectEntrants = safeDirectEntrants
    .sort((a, b) => (a.rankPosition ?? 999) - (b.rankPosition ?? 999))
    .slice(0, reservedDirectSpots);

  const selectedQualifiers = safeQualifiers
    .sort((a, b) => (a.rankPosition ?? 999) - (b.rankPosition ?? 999))
    .slice(0, reservedQualifierSpots);

  return [...selectedDirectEntrants, ...selectedQualifiers]
    .sort((a, b) => (a.rankPosition ?? 999) - (b.rankPosition ?? 999))
    .slice(0, drawSize);
}

function refillMainDrawField({
  tournament,
  currentField = [],
  qualifiers = [],
  allPlayers = [],
  prospects = [],
  injuryWithdrawals = new Set(),
}) {
  const drawSize = tournament?.draw ?? 0;
  if (drawSize <= 0) return [];

  const usedIds = new Set(
    [...currentField, ...qualifiers]
      .filter(Boolean)
      .map(player => player.id)
  );
  const isBlocked = (player) => !player || injuryWithdrawals.has(player.id) || isPlayerUnavailableForTournament(player);

  const { category, isProspects, isProspectsFinals, isATP100, isATP75, isATP50, isATP25 } = tournament ?? {};
  const isBaseCircuitCategory = isATP100 || isATP75 || isATP50 || isATP25
    || category === 'ATP_100' || category === 'ATP_75' || category === 'ATP_50' || category === 'ATP_25';
  const isProspectsCategory = isProspects || category === 'ATP_PROSPECTS';
  const isProspectsFinalsCategory = isProspectsFinals || category === 'PROSPECTS_FINALS';
  let candidatePool = [];

  if (isProspectsCategory || isProspectsFinalsCategory) {
    candidatePool = prospects.filter(player =>
      !isBlocked(player) &&
      !usedIds.has(player.id) &&
      isJuniorEligible(player)
    );
  } else if (isBaseCircuitCategory) {
    const band = getBaseCircuitBand(tournament);
    candidatePool = sortTournamentCandidates(
      allPlayers.filter(player => {
        const rank = getPlayerRankPosition(player);
        return (
          !isBlocked(player) &&
          !usedIds.has(player.id) &&
          rank > (band?.minRankExclusive ?? 0) &&
          rank <= (band?.maxRankInclusive ?? 9999)
        );
      }),
      tournament,
    );
  } else {
    candidatePool = [
      ...allPlayers,
      ...prospects,
    ].filter(player => !isBlocked(player) && !usedIds.has(player.id) && !isParallelExcluded(player, tournament));
  }

  const filledField = [...currentField];
  for (const candidate of candidatePool) {
    if (filledField.length >= drawSize) break;
    filledField.push(candidate);
    usedIds.add(candidate.id);
  }

  return filledField
    .sort((a, b) => (a.rankPosition ?? 999) - (b.rankPosition ?? 999))
    .slice(0, drawSize);
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
    format: tournament.format ?? null,
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
  const byeRecipients = players.filter(p => p && byes.has(p.id));
  const byeRecipientIds = new Set(byeRecipients.map(p => p.id));
  const placedByeRecipientIds = new Set();
  const reservedByeSlots = new Set();

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
      if (byeRecipientIds.has(player.id)) {
        placedByeRecipientIds.add(player.id);
        const partnerSlot = slot % 2 === 0 ? slot + 1 : slot - 1;
        if (partnerSlot >= 0 && partnerSlot < totalSlots) reservedByeSlots.add(partnerSlot);
      }
    }
  } else if (numSeeds === 1) {
    playerSlots[0] = seeds[0];
    if (byeRecipientIds.has(seeds[0].id)) {
      placedByeRecipientIds.add(seeds[0].id);
      if (totalSlots > 1) reservedByeSlots.add(1);
    }
  }

  // Bye recipients que não são seeds também precisam ocupar um slot real da R1,
  // com o slot adjacente reservado para o bye. Isso evita "matches vazios".
  const floatingByeRecipients = players.filter(
    p => p && byeRecipientIds.has(p.id) && !placedByeRecipientIds.has(p.id)
  );
  for (const player of floatingByeRecipients) {
    let assigned = false;
    for (let i = 0; i < totalSlots; i++) {
      if (playerSlots[i] !== null || reservedByeSlots.has(i)) continue;
      const partnerSlot = i % 2 === 0 ? i + 1 : i - 1;
      if (partnerSlot < 0 || partnerSlot >= totalSlots) continue;
      if (playerSlots[partnerSlot] !== null || reservedByeSlots.has(partnerSlot)) continue;
      playerSlots[i] = player;
      reservedByeSlots.add(partnerSlot);
      placedByeRecipientIds.add(player.id);
      assigned = true;
      break;
    }
    if (!assigned) {
      for (let i = 0; i < totalSlots; i++) {
        if (playerSlots[i] !== null || reservedByeSlots.has(i)) continue;
        const partnerSlot = i % 2 === 0 ? i + 1 : i - 1;
        if (partnerSlot < 0 || partnerSlot >= totalSlots) continue;
        playerSlots[i] = player;
        reservedByeSlots.add(partnerSlot);
        placedByeRecipientIds.add(player.id);
        break;
      }
    }
  }

  // Preenche slots vagos com unseeded aleatórios
  // Slot adjacente a um seed com BYE fica null (= oponente do BYE)
  let ui = 0;
  for (let i = 0; i < totalSlots; i++) {
    if (playerSlots[i] !== null || reservedByeSlots.has(i)) continue;
    const partnerSlot = i % 2 === 0 ? i + 1 : i - 1;
    const partner     = playerSlots[partnerSlot];
    if (partner && byes.has(partner.id)) continue; // mantém null = BYE
    playerSlots[i] = shuffledUnseeded[ui++] ?? null;
  }

  // Segurança: não deixar nascer match vazio.
  for (let m = 0; m < totalMatches; m++) {
    const aIdx = m * 2;
    const bIdx = aIdx + 1;
    const a = playerSlots[aIdx];
    const b = playerSlots[bIdx];
    if (a || b) continue;

    let donorMatch = -1;
    let donorSlot = -1;
    for (let dm = m + 1; dm < totalMatches; dm++) {
      const daIdx = dm * 2;
      const dbIdx = daIdx + 1;
      const da = playerSlots[daIdx];
      const db = playerSlots[dbIdx];
      if (da && !db) { donorMatch = dm; donorSlot = daIdx; break; }
      if (db && !da) { donorMatch = dm; donorSlot = dbIdx; break; }
    }
    if (donorSlot >= 0) {
      playerSlots[aIdx] = playerSlots[donorSlot];
      playerSlots[donorSlot] = null;
      reservedByeSlots.add(bIdx);
      reservedByeSlots.delete(aIdx);
    }
  }

  // ── Gera matches ─────────────────────────────────────────────────
  const matches = [];
  for (let m = 0; m < totalMatches; m++) {
    const a     = playerSlots[m * 2]     ?? null;
    const b     = playerSlots[m * 2 + 1] ?? null;
    const isBye = (!!a || !!b) && (!a || !b);
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
  const seededMainDrawPlayers = buildMainDrawFieldWithQualifiedSpots(
    tournament,
    directEntrants,
    qualifiers,
  );
  const mainDrawPlayers = refillMainDrawField({
    tournament,
    currentField: seededMainDrawPlayers,
    qualifiers,
    allPlayers: sortedTourPlayers.map(getPreparedPlayer).filter(Boolean),
    prospects: sortedProspects.map(getPreparedPlayer).filter(Boolean),
    injuryWithdrawals,
  });

  return {
    tournamentId: tournament.id,
    seasonYear,
    surface,
    courtKey,
    bestOf,
    format: tournament.format ?? null,
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
  const rank = getPlayerRankPosition(player);
  const { isSlam, isMasters, isATP100, isATP75, isATP50, isATP25, isOlympic, isSlamClash, isProspects, isProspectsFinals, category } = tournament;
  const isBaseCircuitCategory = isATP100 || isATP75 || isATP50 || isATP25
    || category === 'ATP_100' || category === 'ATP_75' || category === 'ATP_50' || category === 'ATP_25';
  const isProspectsCategory = isProspects || category === 'ATP_PROSPECTS' || isProspectsFinals || category === 'PROSPECTS_FINALS';

  if (isOlympic) return true; // seleção feita em selectOlympicPlayers
  if (isSlam || isSlamClash) return true;
  if (isMasters) return rank <= 128;
  if (isBaseCircuitCategory) {
    const band = getBaseCircuitBand(tournament);
    return rank > (band?.minRankExclusive ?? 0) && rank <= (band?.maxRankInclusive ?? 9999);
  }
  if (isProspectsCategory) return isJuniorEligible(player);

  if (category !== 'ATP_250' && category !== 'ATP_500') return false;

  const countKey = category === 'ATP_250' ? 'count250' : 'count500';
  if ((seasonCounts?.[countKey] ?? 0) >= _seasonCap(rank, category)) return false;

  if (tournament?.parallelGroup) {
    const chosenTournamentId = chooseParallelTournamentForPlayer(player, tournament);
    if (chosenTournamentId !== tournament.id) return false;
  }

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
