// ============================================
// UNIVERSEMANAGER.JS - Gerenciamento do Universo/Temporadas
// ============================================

import React, { useState } from 'react';
import { TEAMS, POINTS_CONFIG, ARENA_PREFERENCES, ARENA_CONFIG } from './data.js';
import { 
  CALENDAR_STRUCTURE as CALENDAR_CONFIG, 
  TOURNAMENT_TIERS, 
  POINTS_STRUCTURES, 
  ALL_ARENAS,
  getMonthConfig,
  getTournament
} from './CalendarConfig.js';
import { AIManager } from './AIEngine.js';
import { FormManager } from './FormSystem.js';
import { ComboSystem } from './ComboTracker.js';
import NarrativeEngine from './NarrativeEngine.js';
import CommentaryEngine from './CommentaryEngine.js';
import EventsManager from './EventsManager.js';
import SocialMediaEngine from './SocialMedia.js';
import { UniverseAnalytics } from './AnalyticsEngine.js';
import { CareerTracker } from './CareerSystem.js';
import { MetaBalancer } from './BalanceEngine.js';
import { AchievementEngine } from './AchievementEngine.js';
import NewsEngine from './NewsEngine.js';
import { getPlayerTraitData, TRAITS, PLAYER_TRAITS } from './traits_data.js';
import {
  registerShadowEvent,
  checkTraumaEvent,
  canReceivePositiveTrait,
  getTraitDNAProfile,
  CAREER_MILESTONES,
  MILESTONE_POOLS,
  SHADOW_MILESTONES,
} from './TraitDNASystem.js';
import { AnalyticsManager } from './AnalyticsManager.js';
import {
  applyMonthlyDevelopment,
  applyMonthlyDecline,
  checkMonthlyBreakthrough,
  migrateLegacyPlayer
} from './DevelopmentSystem.js';
import {
  POTENTIAL_CATEGORIES,
  ALCUNHAS,
  determineAlcunha
} from './DevelopmentConstants.js';
import { NewgenEngine } from './NewgenEngine.js';
import { RetirementSystem } from './RetirementSystem.js';
import { RivalrySystem } from './RivalrySystem.js';
import { EraSystem } from './EraSystem.js';
import { ChronicleEngine } from './ChronicleEngine.js';

// ============================================
// 🔧 UTILITY: Comparação de IDs sem posição
// ============================================
// Os IDs dos beyblades incluem _pos0, _pos1, etc que mudam entre rounds
// Esta função compara apenas a parte base do ID (o nome do jogador)
const getBaseId = (id) => {
  if (!id) return '';
  // Converte para string se for número
  const idStr = typeof id === 'number' ? String(id) : id;
  // Remove _pos0, _pos1, _pos2, etc do final do ID
  return idStr.replace(/_pos\d+$/, '');
};

const idsMatch = (id1, id2) => {
  return getBaseId(id1) === getBaseId(id2);
};

// ===== 🌍 GLOBAL UNIVERSE MANAGER INSTANCE =====
// Variável global para acessar a instância do UniverseManager de funções auxiliares
let universeManagerInstance = null;

class UniverseManager {
  constructor() {
    // Setar referência global para acesso de funções auxiliares
    universeManagerInstance = this;
    
    this.currentYear = 2024;
    this.currentMonth = 1;
    this.currentTournamentIndex = 0; // Índice do torneio atual no mês (0, 1 ou 2)
    this.monthRankingSnapshot = null; // Snapshot do ranking no início do mês
    this.saveVersion = 3; // Versão do save para compatibilidade (incrementada para incluir IA)
    this.pendingYearEnd = false; // Flag: temporada acabou, aguardando FINALIZAR TEMPORADA manual

    // ===== ⚡ CACHES DE PERFORMANCE =====
    this._bbpRankingCache = null;    // getBBPRanking() cache — invalida quando addPoints() é chamado
    this._bbpRankingDirty = true;
    this._h2hLastResult = new Map(); // Map<"idA|idB", lastWinnerId> para H2H O(1) em vez de O(n) filter
    this._tourneyWinsCache = new Map(); // Map<playerId, wins> limpo em startTournament
    this._turboMode = false;         // true durante simulação em lote — desativa logs/analytics pesados

    // ===== 🔒 SISTEMA DE FLUXO LINEAR DE TORNEIOS =====
    console.log('🔒 Inicializando sistema de fluxo linear...');
    this.tournamentHistory = new Map(); // Chave: "ANO-MÊS-ÍNDICE", Valor: { completed, champion, date }
    this.nextTournamentKey = '2024-1-0'; // Próximo torneio disponível (único que pode ser jogado)
    console.log('✅ Sistema de fluxo linear inicializado!');
    
    this.seasonRankings = new Map(); // Pontos da temporada atual (reseta a cada ano)
    this.historicalRankings = new Map(); // Pontos históricos totais (nunca expira)
    this.bbpRankings = new Map(); // BBP - Pontos dos últimos 18 meses (rolling)
    this.pointsHistory = new Map(); // Histórico de pontos com data de ganho
    this.playerHistories = new Map();
    this.tournamentArchive = new Map(); // Armazena histórico completo de cada torneio
    this.currentBracket = null;
    this.currentRound = 'R16';
    this.seasonRecapYear = null; // Guarda qual ano mostrar no season recap
    this.currentTournamentPoints = new Map(); // Rastreia pontos acumulados de cada jogador no torneio atual
    
    // ===== 🎯 SISTEMA DE BRACKET LIFECYCLE =====
    console.log('🎯 Inicializando sistema de Bracket Lifecycle...');
    this.bracketInitialized = false; // Flag para saber se o primeiro bracket foi criado
    this.bracketInProgress = false; // Flag para saber se há um torneio em andamento
    console.log('✅ Sistema de Bracket Lifecycle inicializado!');
    
    // ===== SISTEMA DE LOGS PARA RECAPS =====
    this.matchLog = []; // Todos os matches de todos os torneios
    this.currentTournamentLog = []; // Matches apenas do torneio atual
    this.seasonStats = new Map(); // Estatísticas agregadas por temporada
    
    // ===== 🧠 CORE INTELLIGENCE SYSTEMS =====
    console.log('🧠 Inicializando sistemas de IA...');
    this.aiManager = new AIManager(TEAMS);
    this.formManager = new FormManager(TEAMS);
    this.comboSystem = new ComboSystem();
    this.aiEnabled = true; // Flag para habilitar/desabilitar IA
    console.log('✅ Sistemas de IA inicializados com sucesso!');
    
    // ===== 📖 NARRATIVE & STORYTELLING SYSTEMS (FASE 2) =====
    console.log('📖 Inicializando sistemas de narrativa...');
    this.narrativeEngine = new NarrativeEngine();
    this.commentaryEngine = new CommentaryEngine();
    this.eventsManager = new EventsManager();
    this.socialEngine = new SocialMediaEngine();
    this.seasons = []; // Histórico de todas as seasons para análise de eras
    this.currentSeasonData = null; // Dados da season atual
    console.log('✅ Sistemas de narrativa inicializados!');
    
    // ===== 📊 ANALYTICS & PROGRESSION SYSTEMS (FASE 3) =====
    console.log('📊 Inicializando sistemas de analytics e progressão...');
    this.players = TEAMS; // Reference para analytics
    this.matchHistory = []; // Histórico de todos os matches
    this.season = 0; // Contador de temporadas
    this.pendingSeasonCeremony = null; // Dados para a Cerimônia de Encerramento
    this.pendingSeasonRecap = false;   // Flag: Season Recap pendente (para evitar duplicatas em Janeiro)
    this.seasonWinners = []; // Lista de vencedores de cada temporada
    this.analytics = new UniverseAnalytics(this);
    this.careerSystem = new CareerTracker(this);
    this.balanceEngine = new MetaBalancer(this);
    
    // ===== 📊 NOVO: ANALYTICS MANAGER (SISTEMA AVANÇADO) =====
    this.analyticsManager = new AnalyticsManager();
    console.log('✅ AnalyticsManager inicializado!');
    
    console.log('✅ Sistemas de analytics e progressão inicializados!');
    
    // ===== 🏆 DIVISIONAL SYSTEM (FASE 1) =====
    console.log('🏆 Inicializando sistema de divisões...');
    this.divisions = {
      elite: [],       // Top 16 por BBP
      challenger: [],  // 17-40  
      prospects: [],   // 41-64
      relegation: []   // 65+
    };
    this.divisionHistory = new Map(); // playerId -> { currentDivision, previousDivision, promotions, relegations }
    this.divisionChangeLog = []; // Array de todas as mudanças históricas
    
    // Wild Card System
    this.wildCards = []; // Lista de jogadores com wild card ativo
    this.wildCardHistory = []; // Histórico de todos os wild cards concedidos
    this.qualifiedPlayers = []; // Jogadores qualificados via qualifying tournament
    console.log('✅ Sistema de divisões inicializado!');
    
    // ===== 🏆 GRAND FINALS SYSTEM (FASE 2) =====
    console.log('🏆 Inicializando sistema Grand Finals...');
    this.grandFinalsHistory = []; // Histórico de todos os Grand Finals
    this.currentGrandFinalsBracket = null;
    this.hallOfFame = []; // Hall of Fame entries
    console.log('✅ Sistema Grand Finals inicializado!');
    
    // ===== 🏅 ACHIEVEMENT ENGINE (FASE 4) =====
    console.log('🏅 Inicializando Achievement Engine...');
    this.achievementEngine = new AchievementEngine();
    console.log('✅ Achievement Engine inicializado!');
    
    // ===== 📰 NEWS SYSTEM (FASE 5) =====
    console.log('📰 Inicializando sistema de notícias...');
    this.newsEngine = new NewsEngine(this);
    this.rankingHistory = []; // Para tracking de mudanças de ranking
    console.log('✅ Sistema de notícias inicializado!');
    
    // ===== ⚔️ SIGNATURE BLADE SYSTEM =====
    console.log('⚔️ Inicializando sistema de Signature Blades...');
    this.signatureBlades = new Map(); // playerId -> { blade, stats: { wins, losses, rounds, ... } }
    this.seasonBlades = new Map(); // playerId -> [blade1, blade2]
    this.currentSeasonYear = this.currentYear; // Para resetar Season Blades em Janeiro
    console.log('✅ Sistema de Signature Blades inicializado!');
    
    
    TEAMS.forEach((team, index) => {
      this.playerHistories.set(index, {
        playerId: index,
        playerName: team.name,
        totalMatches: 0,
        wins: 0,
        losses: 0,
        roundWins: 0,
        roundLosses: 0,
        winsBySpin: 0,
        winsByBurst: 0,
        winsByRingOut: 0,
        lossesBySpin: 0,
        lossesByBurst: 0,
        lossesByRingOut: 0,
        titles: { 
          kingsCourtTitles: 0, premierTitles: 0, mastersTitles: 0,
          challengerTitles: 0, redemptionTitles: 0,
          risingStarTitles: 0, risingFinalsTitles: 0,
          total: 0, detailedList: []
        },
        winStreak: 0, bestWinStreak: 0, lossStreak: 0, bestLossStreak: 0,
        monthsAtTop: 0,
        currentTopStreak: 0,
        longestTopStreak: 0,
        statsByArena: new Map(),
        tournamentHistory: [],
        eventHistory: [],
        attrHistory: []   // [{year, avg, tier}] — snapshot de janeiro de cada ano
      });
      
      // Inicializar histórico de pontos para cada jogador
      this.pointsHistory.set(index, []);
    });
    
    // ===== 🎲 INICIALIZAR RANKING COM PONTOS ALEATÓRIOS =====
    console.log('🎲 Inicializando ranking com pontos aleatórios...');
    this.initializeRandomRanking();
    console.log('✅ Ranking inicial criado!');
    
    // ===== ⚔️ INICIALIZAR SIGNATURE BLADES E SEASON BLADES =====
    console.log('⚔️ Criando Signature Blades para todos os jogadores...');
    TEAMS.forEach((team, index) => {
      // Inicializar Signature Blade (fixo pra sempre)
      const signatureData = initializeSignatureBladeForPlayer(index, team);
      this.signatureBlades.set(index, signatureData);
      
      // Criar Season Blades para temporada atual
      const seasonBlades = createSeasonBlades(team, index);
      this.seasonBlades.set(index, seasonBlades);
      
      console.log(`   ✅ ${team.name}: "${signatureData.blade.signatureName}"`);
    });
    console.log('✅ Signature Blades criados com sucesso!');
    
    // ===== 📈 MIGRAR JOGADORES PARA NOVO SISTEMA DE DESENVOLVIMENTO =====
    console.log('📈 Migrando jogadores para sistema de desenvolvimento V2.0...');
    TEAMS.forEach((player, index) => {
      migrateLegacyPlayer(player);
    });
    console.log('✅ Migração completa!');
    
    // ===== 🌟 RISING STAR SYSTEM (NEWGEN) =====
    console.log('🌟 Inicializando Rising Star System...');
    this.newgenEngine = new NewgenEngine();
    this.retirementSystem = new RetirementSystem(this);
    this.rivalrySystem = new RivalrySystem();
    
    // ===== 🏛️ ERA SYSTEM =====
    this.eraSystem = new EraSystem();
    this.pendingEraTransition = null;   // Aguardando confirmação do jogador

    // ===== 📖 CHRONICLE ENGINE =====
    this.chronicleEngine = new ChronicleEngine();

    this.seasonTournamentTypeStats = {}; // { year: { Attack:N, Defense:N, Stamina:N, Balance:N } }
    // risingStars removido — Rising Stars agora vivem em TEAMS com status 'RISING_STAR'
    this.amateurRankings = new Map(); // Ranking amador (pontos últimos 18 meses, keyed by TEAMS index)
    this.amateurPointsHistory = new Map(); // playerId -> [{date, points, tournament}]
    
    // Gerar pool inicial de Rising Stars
    this.initializeRisingStars();
    console.log('✅ Rising Star System inicializado!');
    
    // Inicializar divisões
    this.initializeDivisions();
  }



  // Adiciona pontos com data de expiração (18 meses)
  addPoints(playerId, points, reason = '') {
    // ===== 🔍 VALIDAÇÃO =====
    if (!points || points === 0 || isNaN(points)) {
      if (!this._turboMode) {
        console.warn(`⚠️  [PONTOS] Inválido: ${TEAMS[playerId]?.name} +${points} (${reason})`);
      }
      return;
    }
    if (!this._turboMode && points > 0) {
      console.log(`💰 [PONTOS] ${TEAMS[playerId]?.name}: +${points} pts (${reason})`);
    }
    // ===== FIM VALIDAÇÃO =====

    // ⚡ Invalidar cache do ranking
    this._bbpRankingDirty = true;
    
    const year = this.currentYear;
    const month = this.currentMonth;
    
    // Adicionar ao histórico de pontos com timestamp
    const pointsArray = this.pointsHistory.get(playerId) || [];
    pointsArray.push({
      points: points,
      year: year,
      month: month,
      reason: reason,
      expiryYear: year + Math.floor((month + 18 - 1) / 12),
      expiryMonth: ((month + 18 - 1) % 12) + 1
    });
    this.pointsHistory.set(playerId, pointsArray);
    
    // Acumular pontos do torneio atual
    const currentTournamentTotal = this.currentTournamentPoints.get(playerId) || 0;
    this.currentTournamentPoints.set(playerId, currentTournamentTotal + points);
    
    // Atualizar ranking histórico (nunca expira)
    const currentHistorical = this.historicalRankings.get(playerId) || 0;
    this.historicalRankings.set(playerId, currentHistorical + points);
    
    // Atualizar ranking de temporada
    const currentSeason = this.seasonRankings.get(playerId) || 0;
    this.seasonRankings.set(playerId, currentSeason + points);
    
    // Recalcular BBP (últimos 18 meses)
    this.recalculateBBP(playerId);
  }

  // Recalcula BBP baseado nos pontos válidos dos últimos 18 meses
  recalculateBBP(playerId) {
    const pointsArray = this.pointsHistory.get(playerId) || [];
    const currentYear = this.currentYear;
    const currentMonth = this.currentMonth;
    
    let bbpTotal = 0;
    
    pointsArray.forEach(entry => {
      // Checar se os pontos ainda são válidos (dentro de 18 meses)
      const isValid = (entry.expiryYear > currentYear) || 
                      (entry.expiryYear === currentYear && entry.expiryMonth >= currentMonth);
      
      if (isValid) {
        bbpTotal += entry.points;
      }
    });
    
    this.bbpRankings.set(playerId, bbpTotal);
  }

  // Recalcula BBP de todos os jogadores (chamado ao avançar mês)
  recalculateAllBBP() {
    TEAMS.forEach((team, index) => {
      this.recalculateBBP(index);
    });
  }

  // Retorna ranking BBP (últimos 18 meses)
  getBBPRanking() {
    // ⚡ Cache: só recalcula quando addPoints() foi chamado (_bbpRankingDirty = true)
    if (!this._bbpRankingDirty && this._bbpRankingCache) {
      return this._bbpRankingCache;
    }

    const ranking = [];
    
    // Incluir apenas jogadores PROFESSIONAL (filtra RISING_STAR e RETIRED)
    TEAMS.forEach((team, playerId) => {
      if (team.status !== 'PROFESSIONAL') return;
      const points = this.bbpRankings.get(playerId) || 0;
      ranking.push({ playerId, points, rank: 0 });
    });
    
    ranking.sort((a, b) => b.points - a.points);
    ranking.forEach((entry, index) => { entry.rank = index + 1; });

    this._bbpRankingCache = ranking;
    this._bbpRankingDirty = false;
    return ranking;
  }

  // Retorna ranking histórico (carreira completa)
  getHistoricalRanking() {
    const ranking = [];
    this.historicalRankings.forEach((points, playerId) => {
      ranking.push({ playerId, points });
    });
    return ranking.sort((a, b) => b.points - a.points);
  }

  // Mantém compatibilidade com código antigo
  getSeasonRanking() {
    const ranking = [];
    this.seasonRankings.forEach((points, playerId) => {
      ranking.push({ playerId, points });
    });
    return ranking.sort((a, b) => b.points - a.points);
  }

  // Alias para compatibilidade — usado no widget do calendário (top 8 BBP)
  getRankings() {
    return this.getBBPRanking().map(entry => ({
      playerId: entry.playerId,
      playerName: TEAMS[entry.playerId]?.name || `Jogador ${entry.playerId}`,
      totalPoints: entry.points,
      rank: entry.rank,
    }));
  }

  getCurrentMonthConfig() {
    return CALENDAR_CONFIG.months.find(m => m.id === this.currentMonth);
  }
  
  getCurrentTournament() {
    const monthConfig = this.getCurrentMonthConfig();
    if (!monthConfig || !monthConfig.tournaments) return null;
    return monthConfig.tournaments[this.currentTournamentIndex] || null;
  }

  /**
   * Resolve a arena principal de um torneio.
   * CalendarConfig usa 'arenas' (array ou 'ALL') — 'arena' singular não existe.
   * @returns {string} primeiro nome da arena, ou 'ALL'
   */
  getTournamentArena(tournament) {
    if (!tournament) return 'BB-10 Competitive';
    const arenas = tournament.arenas;
    if (!arenas || arenas === 'ALL') return 'ALL';
    if (Array.isArray(arenas)) return arenas[0];
    return arenas;
  }

  /**
   * Resolve arena para código interno do engine.
   * @returns {string} código interno (ex: 'NEXUS', 'BB10_COMPETITIVE')
   */
  getTournamentArenaCode(tournament) {
    const nameMap = {
      // BB-10
      'BB-10': 'BB10_COMPETITIVE', 'BB-10 Competitive': 'BB10_COMPETITIVE', 'BB10_COMPETITIVE': 'BB10_COMPETITIVE',
      // Nexus / Portal
      'Prismatic Nexus': 'NEXUS', 'Prismatic Portal': 'NEXUS', 'NEXUS': 'NEXUS',
      // Volcanic Rage
      'Volcanic Rage': 'VOLCANIC_RAGE', 'VOLCANIC_RAGE': 'VOLCANIC_RAGE',
      // Colosseum Carnage
      'Colosseum Carnage': 'COLOSSEUM_CARNAGE', 'Carnage Colosseum': 'COLOSSEUM_CARNAGE', 'COLOSSEUM_CARNAGE': 'COLOSSEUM_CARNAGE',
      // Vortex (calendário usa 'Vortex Colosseum', engine usa VORTEX_COLISEUM)
      'Vortex Coliseum': 'VORTEX_COLISEUM', 'Vortex Colosseum': 'VORTEX_COLISEUM', 'VORTEX_COLISEUM': 'VORTEX_COLISEUM',
      // Pinball Inferno
      'Pinball Inferno': 'PINBALL_INFERNO', 'PINBALL_INFERNO': 'PINBALL_INFERNO',
      // Pangea Platform
      'Pangea Platform': 'PANGEA_PLATFORM', 'PANGEA_PLATFORM': 'PANGEA_PLATFORM',
      // Killer Sides (calendário usa 'Killer Side' sem S)
      'Killer Sides': 'KILLER_SIDES', 'Killer Side': 'KILLER_SIDES', 'KILLER_SIDES': 'KILLER_SIDES',
      // Storm Track
      'Storm Track': 'STORM_TRACK', 'STORM_TRACK': 'STORM_TRACK',
      // Tidal (calendário usa 'Tidal Clash', engine usa TIDAL_SURGE)
      'Tidal Surge': 'TIDAL_SURGE', 'Tidal Clash': 'TIDAL_SURGE', 'TIDAL_SURGE': 'TIDAL_SURGE',
      // Domination (calendário usa 'Domination Zone' singular)
      'Domination Zones': 'DOMINATION_ZONES', 'Domination Zone': 'DOMINATION_ZONES', 'DOMINATION_ZONES': 'DOMINATION_ZONES',
    };
    const raw = this.getTournamentArena(tournament);
    if (raw === 'ALL') return 'BB10_COMPETITIVE';
    return nameMap[raw] || raw || 'BB10_COMPETITIVE';
  }

  
  /**
   * Retorna a chave do próximo torneio disponível
   */
  getNextTournamentKey() {
    return this.nextTournamentKey;
  }
  
  /**
   * Verifica se um torneio está completo
   */
  isTournamentCompleted(year, month, index) {
    const key = `${year}-${month}-${index}`;
    return this.tournamentHistory.has(key) && this.tournamentHistory.get(key).completed;
  }
  
  /**
   * Retorna o status de um torneio: 'completed', 'next', ou 'locked'
   */
  getTournamentStatus(year, month, index) {
    const key = `${year}-${month}-${index}`;
    
    if (this.isTournamentCompleted(year, month, index)) {
      return 'completed';
    }
    
    if (key === this.nextTournamentKey) {
      return 'next';
    }
    
    return 'locked';
  }
  
  /**
   * Retorna dados do próximo torneio disponível
   */
  getNextAvailableTournament() {
    const [year, month, index] = this.nextTournamentKey.split('-').map(Number);
    
    const monthConfig = CALENDAR_CONFIG.months.find(m => m.id === month);
    if (!monthConfig) return null;
    
    const tournament = monthConfig.tournaments[index];
    if (!tournament) return null;
    
    return {
      year,
      month,
      index,
      monthName: monthConfig.name,
      tournament
    };
  }
  
  /**
   * Avança para o próximo torneio na sequência
   * Esta função é chamada APÓS completar um torneio
   */
  advanceToNextTournamentInSequence() {
    const [currentYear, currentMonth, currentIndex] = this.nextTournamentKey.split('-').map(Number);
    
    if (!this._turboMode) { console.log('🔄 AVANÇANDO PARA PRÓXIMO TORNEIO'); console.log(`   Atual: ${this.nextTournamentKey}`); }
    
    const currentMonthConfig = CALENDAR_CONFIG.months.find(m => m.id === currentMonth);
    
    // Verificar se há mais torneios no mês atual
    if (currentMonthConfig && currentIndex + 1 < currentMonthConfig.tournaments.length) {
      // Próximo torneio no mesmo mês
      const nextIndex = currentIndex + 1;
      this.nextTournamentKey = `${currentYear}-${currentMonth}-${nextIndex}`;
      this.currentTournamentIndex = nextIndex;
      
      if (!this._turboMode) console.log(`✅ Próximo torneio: ${this.nextTournamentKey}`);
      console.log(`   ${currentMonthConfig.tournaments[nextIndex].name}`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      return 'NEXT_TOURNAMENT';
    }
    
    // Avançar para o próximo mês
    let nextMonth = currentMonth + 1;
    let nextYear = currentYear;
    
    if (nextMonth > 12) {
      // Fim de temporada — NÃO avança ainda; aguarda FINALIZAR TEMPORADA manual
      console.log('🏁 Fim de dezembro — aguardando FINALIZAR TEMPORADA');
      this.pendingYearEnd = true;
      return 'YEAR_END';
    }
    
    this.nextTournamentKey = `${nextYear}-${nextMonth}-0`;
    this.currentMonth = nextMonth;
    this.currentYear = nextYear;
    this.currentTournamentIndex = 0;
    
    const nextMonthConfig = CALENDAR_CONFIG.months.find(m => m.id === nextMonth);
    if (!this._turboMode) console.log(`✅ Avançando para novo mês: ${this.nextTournamentKey}`);
    console.log(`   Mês: ${nextMonthConfig?.name} ${nextYear}`);
    console.log(`   Próximo torneio: ${nextMonthConfig?.tournaments[0]?.name || 'N/A'}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    return 'ADVANCE_MONTH';
  }
  
  isGrandSlamMonth() {
    const monthConfig = this.getCurrentMonthConfig();
    return monthConfig?.tournaments?.[0]?.type === 'GRAND_SLAM';
  }
  
  // ===== 🧠 CORE INTELLIGENCE METHODS =====
  
  /**
   * Atualiza sistemas de IA após uma partida
   */
  updateAIAfterMatch(matchData) {
    const { playerAId, playerBId, winnerId, arena, burstCount = 0, method = 'points', score } = matchData;
    
    // ===== OBTER RANKINGS PARA CÁLCULO DE UPSET =====
    const bbpRanking = this.getBBPRanking();
    const playerARank = bbpRanking.findIndex(r => r.playerId === playerAId) + 1 || 50;
    const playerBRank = bbpRanking.findIndex(r => r.playerId === playerBId) + 1 || 50;
    
    // ===== DETECTAR VITÓRIA/DERROTA 3-0 =====
    let is3v0 = false;
    if (score) {
      const winnerScore = winnerId === playerAId ? score.playerA : score.playerB;
      const loserScore = winnerId === playerAId ? score.playerB : score.playerA;
      is3v0 = (winnerScore === 3 && loserScore === 0);
    }
    
    // Dados do vencedor e perdedor
    const winnerData = {
      won: true,
      opponentType: matchData.playerBType || null,
      typeUsed: matchData.playerAType || null,
      arena: arena,
      burstCount: burstCount,
      method: method,
      playerRanking: winnerId === playerAId ? playerARank : playerBRank,
      opponentRanking: winnerId === playerAId ? playerBRank : playerARank,
      is3v0: is3v0
    };
    
    const loserData = {
      won: false,
      opponentType: matchData.playerAType || null,
      typeUsed: matchData.playerBType || null,
      arena: arena,
      burstCount: 0,
      method: method,
      playerRanking: winnerId === playerAId ? playerBRank : playerARank,
      opponentRanking: winnerId === playerAId ? playerARank : playerBRank,
      is3v0: is3v0
    };
    
    // Atualizar IA do vencedor
    if (winnerId === playerAId) {
      this.aiManager.updateAfterMatch(playerAId, playerBId, winnerData);
      this.formManager.updateAfterMatch(playerAId, winnerData);
      
      this.aiManager.updateAfterMatch(playerBId, playerAId, loserData);
      this.formManager.updateAfterMatch(playerBId, loserData);
    } else {
      this.aiManager.updateAfterMatch(playerBId, playerAId, winnerData);
      this.formManager.updateAfterMatch(playerBId, winnerData);
      
      this.aiManager.updateAfterMatch(playerAId, playerBId, loserData);
      this.formManager.updateAfterMatch(playerAId, loserData);
    }
    
    // Atualizar combo system se beyblades estiverem disponíveis
    if (matchData.playerABey && winnerId === playerAId) {
      this.comboSystem.analyzeBuild(
        matchData.playerABey,
        { ...winnerData },
        { playerId: playerAId, playerName: TEAMS[playerAId].name }
      );
    }
    
    if (matchData.playerBBey && winnerId === playerBId) {
      this.comboSystem.analyzeBuild(
        matchData.playerBBey,
        { ...winnerData },
        { playerId: playerBId, playerName: TEAMS[playerBId].name }
      );
    }
  }
  
  /**
   * Aplica multiplicador de forma aos stats do jogador
   */
  applyFormToStats(playerId, baseStats, context = {}) {
    if (!this.aiEnabled) return baseStats;

    const formMultiplier = this.formManager.getStatsMultiplier(playerId);
    const modifiedStats = { ...baseStats };

    if (modifiedStats.attack)    modifiedStats.attack    *= formMultiplier;
    if (modifiedStats.defense)   modifiedStats.defense   *= formMultiplier;
    if (modifiedStats.stamina)   modifiedStats.stamina   *= formMultiplier;
    if (modifiedStats.speed)     modifiedStats.speed     *= formMultiplier;
    if (modifiedStats.technique) modifiedStats.technique *= formMultiplier;

    // ── PARTIAL STAT TRAIT MODIFIERS ─────────────────────────
    try {
      // getPlayerTraitData imported at top
      const player = TEAMS[playerId];
      const data = getPlayerTraitData(player?.name);
      const traits = data?.traits || [];
      const favArena = data?.favoriteArena;

      const {
        selfWins = 0, opponentWins = 0, winsNeeded = 2,
        currentRound = 1, maxRounds = 3, format = 'MD3',
        arena = null, tournamentStage = 'R64', tournamentTier = '',
        opponentTier = null, lostRound1 = false, lossStreak = 0,
        winStreak = 0
      } = context;

      const tier = player?.tier || 'PRO';
      const tierOrder = { ELITE: 3, TOP: 2, PRO: 1 };
      const myT = tierOrder[tier] || 1;
      const oppT = tierOrder[opponentTier] || 1;
      const isKO = ['QF','SF','F'].includes(tournamentStage);
      const isBig = ['GRAND_SLAM','PREMIER_CHAMPIONSHIP','CHAMPIONSHIP'].some(t => (tournamentTier||'').includes(t));
      const isLong = format === 'MD5' || format === 'MD7';
      const roundThresh = format === 'MD3' ? 3 : 4;
      const atMatchPtFor = selfWins === winsNeeded - 1;
      const lastRound = currentRound === maxRounds;

      const S = modifiedStats;
      const mul = (stat, factor) => { if (S[stat] !== undefined) S[stat] *= factor; };
      const mulAll = (factor) => { ['attack','defense','stamina','speed','technique','intelligence','adaptability','clutch'].forEach(k => { if(S[k]!==undefined) S[k]*=factor; }); };

      // ── POSITIVAS PARCIAIS ──
      if (traits.includes('FECHADOR') && atMatchPtFor)                        { mul('attack',1.15); mul('technique',1.15); }
      if (traits.includes('MENTALIDADE_DE_SET') && lastRound)                 { mul('clutch',1.20); mul('intelligence',1.20); }
      if (traits.includes('PRIMEIRO_SANGUE') && currentRound===1)             { mul('attack',1.20); mul('speed',1.20); }
      if (traits.includes('MARATONISTA') && currentRound>=roundThresh)        { mul('stamina',1.15); mul('defense',1.15); }
      if (traits.includes('ESPECIALISTA_MD5') && isLong)                      { mul('stamina',1.10); mul('technique',1.10); }
      if (traits.includes('SEQUENCIA_IMPARAVEL') && winStreak>=3)             { mul('attack',1.15); mul('speed',1.15); }
      if (traits.includes('ESPECIALISTA_EM_REVANCHE') && lostRound1)          { mul('intelligence',1.15); mul('adaptability',1.15); }
      if (traits.includes('DONO_DA_ARENA') && arena && arena===favArena)      { mul('technique',1.15); mul('stamina',1.15); }
      if (traits.includes('FILHO_DOS_GRAND_SLAMS') && isBig)                  { mul('clutch',1.10); mul('technique',1.10); }
      if (traits.includes('ESPECIALISTA_QF_MAIS') && isKO)                    { mul('clutch',1.15); mul('intelligence',1.15); }
      if (traits.includes('CACADOR_DE_GIGANTES') && oppT > myT)               mulAll(1.10);

      // ── NEGATIVAS PARCIAIS ──
      if (traits.includes('DEPENDENTE_DO_PRIMEIRO_ROUND') && lostRound1 && currentRound>1) { mul('intelligence',0.85); mul('adaptability',0.85); }
      if (traits.includes('GAS_CURTO')) { const p=Math.max(0.70, 1-(currentRound-1)*0.08); mul('stamina',p); mul('speed',p); }
      if (traits.includes('DESMORONA_EM_SERIE') && lossStreak>=2)             { mul('clutch',0.85); mul('technique',0.85); }
      if (traits.includes('ARENA_UNICA') && arena && arena!==favArena)        { mul('technique',0.90); mul('intelligence',0.90); }
      if (traits.includes('ASSOMBRADO_PELOS_GRANDES_PALCOS') && isBig)        { mul('clutch',0.85); mul('technique',0.85); }
      if (traits.includes('PARADO_NOS_QUARTOS') && isKO)                      { mul('adaptability',0.90); mul('intelligence',0.90); }
      if (traits.includes('CACADO_PELOS_FAVORITOS') && oppT < myT)            { mul('attack',0.90); mul('speed',0.90); }
    } catch(e) {}
    // ─────────────────────────────────────────────────────────

    Object.keys(modifiedStats).forEach(key => {
      if (typeof modifiedStats[key] === 'number') modifiedStats[key] = Math.round(modifiedStats[key]);
    });

    return modifiedStats;
  }
  
  /**
   * Seleciona beyblade usando IA
   */
  selectBeybladeWithAI(playerId, deck, context = {}) {
    if (!this.aiEnabled) {
      // Fallback para lógica antiga
      return deck[Math.floor(Math.random() * deck.length)];
    }
    
    const ai = this.aiManager.getAI(playerId);
    if (!ai) {
      return deck[Math.floor(Math.random() * deck.length)];
    }
    
    return ai.selectBeybladeIA(deck, context);
  }
  
  /**
   * Avança para próximo torneio (para sistema de forma)
   */
  advanceTournamentForm() {
    if (this.aiEnabled) {
      this.formManager.advanceTournament();
    }
  }
  
  /**
   * Avança para próximo ano (para aging)
   */
  advanceYearForm() {
    if (this.aiEnabled) {
      this.formManager.advanceYear();
    }
  }
  
  // ===== FIM DOS MÉTODOS DE IA =====
  
  // Captura snapshot do ranking no início do mês
  captureMonthRankingSnapshot() {
    const bbpRanking = this.getBBPRanking();
    
    // CORREÇÃO: Se o ranking está vazio (primeiro torneio), inicializar com todos os jogadores
    if (bbpRanking.length === 0) {
      console.log('🎯 Inicializando ranking pela primeira vez...');
      this.monthRankingSnapshot = TEAMS.map((team, index) => ({
        playerId: index,
        points: 0,
        rank: index + 1
      }));
    } else {
      this.monthRankingSnapshot = bbpRanking.map((entry, index) => ({
        ...entry,
        rank: index + 1
      }));
      
      // Fix 3: Atualizar careerPeak.ranking para o melhor ranking histórico
      const allPlayers = this.TEAMS || this.players || [];
      this.monthRankingSnapshot.forEach(entry => {
        const player = allPlayers[entry.playerId];
        if (player && player.careerPeak) {
          const currentBestRanking = player.careerPeak.ranking ?? 999;
          if (entry.rank < currentBestRanking) {
            player.careerPeak.ranking = entry.rank;
          }
        }
      });

      // ─── Tracking de meses no topo do ranking ───
      // Quem está em #1 agora?
      const top1Entry = this.monthRankingSnapshot[0];
      if (top1Entry) {
        TEAMS.forEach((_, playerId) => {
          const hist = this.playerHistories?.get(playerId);
          if (!hist) return;
          if (playerId === top1Entry.playerId) {
            // Estava e continua no topo
            hist.currentTopStreak = (hist.currentTopStreak || 0) + 1;
            hist.monthsAtTop = (hist.monthsAtTop || 0) + 1;
            if (hist.currentTopStreak > (hist.longestTopStreak || 0)) {
              hist.longestTopStreak = hist.currentTopStreak;
            }
          } else {
            // Saiu do topo — resetar sequência atual
            hist.currentTopStreak = 0;
          }
        });
      }
    }
  }
  
  // Retorna participantes baseados no tier e snapshot do ranking
  getParticipantsForTournament(tournament) {
    if (!this.monthRankingSnapshot) {
      this.captureMonthRankingSnapshot();
    }
    
    const tournamentArena = this.getTournamentArena(tournament) === 'ALL' ? 'BB-10 Competitive' : this.getTournamentArena(tournament);
    
    // ===== 🏆 GRAND FINALS =====
    if (tournament.type === 'GRAND_FINALS') {
      console.log('👑 GRAND FINALS - Selecionando Top 8 do BBP Ranking');
      const bbpRanking = this.getBBPRanking();
      const top8 = bbpRanking.slice(0, 8);
      
      return top8.map(entry => {
        const team = TEAMS[entry.playerId];
        const adaptedDeck = adaptDeckForArena(team, tournamentArena);
        
        return {
          ...team,
          id: entry.playerId,
          teamIndex: entry.playerId,
          seedRank: entry.playerId + 1,
          deck: adaptedDeck,
          deckArena: tournamentArena,
          intelligence: team.attributes?.intelligence || 7
        };
      });
    }
    
    // ===== 🎫 QUALIFYING TOURNAMENT =====
    if (tournament.type === 'QUALIFYING') {
      console.log('🎫 QUALIFYING - Selecionando jogadores que precisam qualificar');
      const needToQualify = [];
      
      TEAMS.forEach((team, id) => {
        const division = this.getPlayerDivision(id);
        
        // Elite: já qualificado, não participa
        if (division === 'elite') return;
        
        // Wild card: já qualificado, não participa
        if (this.hasValidWildCard(id)) return;
        
        // Resto: precisa qualificar
        needToQualify.push(id);
      });
      
      // Ordenar por BBP
      needToQualify.sort((a, b) => {
        const bbpA = this.bbpRankings.get(a) || 0;
        const bbpB = this.bbpRankings.get(b) || 0;
        return bbpB - bbpA;
      });
      
      // Top 64
      const qualifyingPlayers = needToQualify.slice(0, 64);
      
      return qualifyingPlayers.map(playerId => {
        const team = TEAMS[playerId];
        const adaptedDeck = adaptDeckForArena(team, tournamentArena);
        
        return {
          ...team,
          id: playerId,
          teamIndex: playerId,
          seedRank: playerId + 1,
          deck: adaptedDeck,
          deckArena: tournamentArena,
          intelligence: team.attributes?.intelligence || 7
        };
      });
    }
    
    // ===== 🎯 WILD CARD & SPECIAL TOURNAMENTS =====
    if (tournament.type === 'WILD_CARD' || tournament.tier === 'SPECIAL') {
      console.log(`🎯 ${tournament.type} - Selecionando jogadores por ranking BBP`);
      const bbpRanking = this.getBBPRanking();
      const numParticipants = tournament.participants || 16;
      
      // Selecionar top N do ranking BBP
      const topPlayers = bbpRanking.slice(0, numParticipants);
      
      console.log(`   ✅ Selecionados ${topPlayers.length} jogadores do ranking BBP`);
      
      return topPlayers.map(entry => {
        const team = TEAMS[entry.playerId];
        const adaptedDeck = adaptDeckForArena(team, tournamentArena);
        
        return {
          ...team,
          id: entry.playerId,
          teamIndex: entry.playerId,
          seedRank: entry.rank || (entry.playerId + 1),
          deck: adaptedDeck,
          deckArena: tournamentArena,
          intelligence: team.attributes?.intelligence || 7
        };
      });
    }
    
    // ===== 🏆 SISTEMA DE DIVISÕES ATIVO =====
    
    let selectedPlayers = [];
    
    if (tournament.tier === 'GRAND_SLAM') {
        console.log('🏆 GRAND SLAM - Usando sistema de qualificação');
        
        const qualifiedPlayerIds = [];
        
        // 1. Elite Division (auto-qualified) - 16 players
        const elitePlayers = this.divisions.elite || [];
        qualifiedPlayerIds.push(...elitePlayers);
        console.log(`   👑 Elite: ${elitePlayers.length} players auto-qualified`);
        
        // 2. Wild Card holders - até 4 players
        const wildCardPlayers = this.wildCards || [];
        wildCardPlayers.forEach(id => {
          if (!qualifiedPlayerIds.includes(id)) {
            qualifiedPlayerIds.push(id);
          }
        });
        console.log(`   🎟️ Wild Cards: ${wildCardPlayers.length} players`);
        
        // 3. Qualified via Qualifying Tournament - 16 players
        const qualifiedViaQualifying = this.qualifiedPlayers || [];
        qualifiedViaQualifying.forEach(id => {
          if (!qualifiedPlayerIds.includes(id)) {
            qualifiedPlayerIds.push(id);
          }
        });
        console.log(`   🎫 Qualified: ${qualifiedViaQualifying.length} players`);
        
        // 4. Preencher com os melhores do ranking BBP até 64
        const bbpRanking = this.getBBPRanking();
        for (const entry of bbpRanking) {
          if (qualifiedPlayerIds.length >= 64) break;
          if (!qualifiedPlayerIds.includes(entry.playerId)) {
            qualifiedPlayerIds.push(entry.playerId);
          }
        }
        
        // 🔧 CORREÇÃO: Verificar se temos 64 jogadores
        if (qualifiedPlayerIds.length < 64) {
          console.error(`❌ ERRO: GRAND SLAM tem apenas ${qualifiedPlayerIds.length}/64 jogadores!`);
          console.error(`   Isso não deveria acontecer - todos os jogadores deveriam estar no ranking BBP`);
        }
        
        console.log(`   ✅ Total qualified: ${qualifiedPlayerIds.length} players`);
        
        // Converter para formato esperado com ranking
        selectedPlayers = qualifiedPlayerIds.map((playerId, index) => {
          const bbpRank = bbpRanking.findIndex(r => r.playerId === playerId);
          return {
            playerId,
            rank: bbpRank >= 0 ? bbpRank + 1 : 999,
            points: this.bbpRankings.get(playerId) || 0
          };
        });
        
        // Ordenar por BBP para seeding correto
        selectedPlayers.sort((a, b) => b.points - a.points);
        
      } else if (tournament.tier === 'MASTERS') {
        console.log('⚔️ MASTERS - Elite + Top Challengers');
        
        const requiredParticipants = tournament.participants;
        
        // ===== CHOICE_SPLIT: dois Masters no mesmo mês, dividir jogadores =====
        // Índice 0 = primeiro Masters do mês, índice 1 = segundo Masters
        const monthTournaments = this.getCurrentMonthConfig()?.tournaments || [];
        const mastersThisMonth = monthTournaments.filter(t => t.tier === 'MASTERS');
        const isChoiceSplit = tournament.eligibility === 'CHOICE_SPLIT' && mastersThisMonth.length >= 2;
        
        const bbpRanking = this.getBBPRanking();
        const elitePlayers = this.divisions.elite || [];
        
        // Pool base: elite players + top challengers para completar 32 por torneio
        let fullPool = this.monthRankingSnapshot
          .filter(entry => elitePlayers.includes(entry.playerId));
        
        // Se divisões vazias, usar ranking BBP inteiro como pool
        if (fullPool.length < requiredParticipants) {
          console.warn(`⚠️ Elite insuficiente (${fullPool.length}), complementando com ranking BBP`);
          const alreadyIn = new Set(fullPool.map(p => p.playerId));
          for (const entry of bbpRanking) {
            if (fullPool.length >= requiredParticipants * (isChoiceSplit ? 2 : 1)) break;
            if (!alreadyIn.has(entry.playerId)) {
              fullPool.push(entry);
              alreadyIn.add(entry.playerId);
            }
          }
        }
        
        if (isChoiceSplit) {
          // Dividir o pool em dois blocos de forma determinística pelo índice do torneio
          // Torneio índice 0 (primeiro do mês): jogadores pares do ranking
          // Torneio índice 1 (segundo do mês): jogadores ímpares do ranking
          // Isso garante que cada jogador só aparece num dos dois torneios
          // Calcular qual Masters este é dentro do mês (0 = primeiro, 1 = segundo...)
          // NÃO usar currentTournamentIndex diretamente, pois pode haver outros tipos
          // de torneio antes dos Masters (ex: Invitational no índice 0)
          const masterIndex = monthTournaments
            .slice(0, this.currentTournamentIndex + 1)
            .filter(t => t.tier === 'MASTERS').length - 1;
          selectedPlayers = fullPool.filter((_, i) => i % 2 === masterIndex)
            .slice(0, requiredParticipants);
          
          // Completar se necessário
          if (selectedPlayers.length < requiredParticipants) {
            const alreadyIn = new Set(selectedPlayers.map(p => p.playerId));
            for (const entry of bbpRanking) {
              if (selectedPlayers.length >= requiredParticipants) break;
              if (!alreadyIn.has(entry.playerId)) {
                selectedPlayers.push(entry);
                alreadyIn.add(entry.playerId);
              }
            }
          }
          console.log(`   ✅ CHOICE_SPLIT Masters [${masterIndex}]: ${selectedPlayers.length} jogadores`);
        } else {
          selectedPlayers = fullPool.slice(0, requiredParticipants);
          
          // Completar com BBP se necessário
          if (selectedPlayers.length < requiredParticipants) {
            const alreadyIn = new Set(selectedPlayers.map(p => p.playerId));
            for (const entry of bbpRanking) {
              if (selectedPlayers.length >= requiredParticipants) break;
              if (!alreadyIn.has(entry.playerId)) {
                selectedPlayers.push(entry);
                alreadyIn.add(entry.playerId);
              }
            }
          }
          console.log(`   ✅ ${selectedPlayers.length} jogadores para Masters único`);
        }
        
      } else if (tournament.tier === 'CHALLENGERS') {
        console.log('🥈 CHALLENGERS - Challenger Division');
        
        const requiredParticipants = tournament.participants;
        
        // Challengers: Challenger division + melhores prospects se necessário
        const challengerPlayers = this.divisions.challenger || [];
        
        selectedPlayers = this.monthRankingSnapshot
          .filter(entry => challengerPlayers.includes(entry.playerId))
          .slice(0, requiredParticipants);
        
        // Se não houver suficientes, pegar dos prospects
        if (selectedPlayers.length < requiredParticipants) {
          const prospectsPlayers = this.divisions.prospects || [];
          const additionalPlayers = this.monthRankingSnapshot
            .filter(entry => prospectsPlayers.includes(entry.playerId))
            .slice(0, requiredParticipants - selectedPlayers.length);
          
          selectedPlayers.push(...additionalPlayers);
        }
        
        // 🔧 CORREÇÃO: Se AINDA não tiver jogadores suficientes, usar ranking BBP
        if (selectedPlayers.length < requiredParticipants) {
          console.warn(`⚠️ Divisões insuficientes! Usando fallback para BBP ranking`);
          console.warn(`   Jogadores atuais: ${selectedPlayers.length}/${requiredParticipants}`);
          
          const bbpRanking = this.getBBPRanking();
          const alreadySelected = new Set(selectedPlayers.map(p => p.playerId));
          
          // Pegar jogadores do ranking que ainda não foram selecionados
          for (const entry of bbpRanking) {
            if (selectedPlayers.length >= requiredParticipants) break;
            if (!alreadySelected.has(entry.playerId)) {
              selectedPlayers.push({
                playerId: entry.playerId,
                rank: entry.rank,
                points: entry.points
              });
            }
          }
          
          console.warn(`   ✅ Após fallback: ${selectedPlayers.length}/${requiredParticipants} jogadores`);
        }
        
        console.log(`   ✅ ${selectedPlayers.length} Challenger/Prospects players`);
        
      } else if (tournament.tier === 'PROSPECTS') {
        console.log('🌟 PROSPECTS - Prospects Division');
        
        const requiredParticipants = tournament.participants;
        
        // Prospects: Prospects division
        const prospectsPlayers = this.divisions.prospects || [];
        const relegationPlayers = this.divisions.relegation || [];
        
        selectedPlayers = this.monthRankingSnapshot
          .filter(entry => prospectsPlayers.includes(entry.playerId) || 
                          relegationPlayers.includes(entry.playerId))
          .slice(0, requiredParticipants);
        
        // 🔧 CORREÇÃO: Se divisões vazias, usar ranking BBP
        if (selectedPlayers.length < requiredParticipants) {
          console.warn(`⚠️ Prospects/Relegation divisions insuficientes! Usando fallback para BBP ranking`);
          console.warn(`   Jogadores atuais: ${selectedPlayers.length}/${requiredParticipants}`);
          
          const bbpRanking = this.getBBPRanking();
          const alreadySelected = new Set(selectedPlayers.map(p => p.playerId));
          
          for (const entry of bbpRanking) {
            if (selectedPlayers.length >= requiredParticipants) break;
            if (!alreadySelected.has(entry.playerId)) {
              selectedPlayers.push({
                playerId: entry.playerId,
                rank: entry.rank,
                points: entry.points
              });
            }
          }
          
          console.warn(`   ✅ Após fallback: ${selectedPlayers.length}/${requiredParticipants} jogadores`);
        }
        
        console.log(`   ✅ ${selectedPlayers.length} Prospects/Relegation players`);
      } else if (tournament.tier === 'ELITE_MASTERS') {
        // ===== ⚔️ ELITE MASTERS: Sistema de escolha de arena =====
        console.log('⚔️ ELITE MASTERS - Sistema de escolha de arena');
        
        const requiredParticipants = tournament.participants || 32;
        const bbpRanking = this.getBBPRanking();
        
        // Verificar se há um masters concorrente no mesmo mês
        const monthConfig = this.getCurrentMonthConfig();
        const concurrentMasters = monthConfig?.tournaments?.filter(t => 
          t.tier === 'ELITE_MASTERS' && t.id !== tournament.id
        ) || [];
        
        if (concurrentMasters.length > 0 && tournament.mustChoose) {
          console.log(`   🔄 Detectado ${concurrentMasters.length + 1} Elite Masters simultâneos no mês`);
          console.log(`   📍 Atual: ${tournament.name} (${this.getTournamentArena(tournament)})`);
          concurrentMasters.forEach(t => console.log(`   📍 Concorrente: ${t.name} (${t.arena})`));

          const currentKey = `${this.currentYear}-${this.currentMonth}`;

          if (!this.monthlyMastersAllocation) {
            this.monthlyMastersAllocation = new Map();
          }

          // ===== DRAFT SIMULTÂNEO: feito UMA VEZ no início do mês =====
          const existingDraft = this.monthlyMastersAllocation.get(currentKey);

          if (!existingDraft) {
            // Primeiro Masters do mês: executar o draft completo para TODOS os masters
            console.log(`   🎯 Executando draft simultâneo para todos os Elite Masters do mês...`);

            const allMasters = [tournament, ...concurrentMasters];
            const arenaSlots = {};
            allMasters.forEach(t => {
              arenaSlots[t.arena] = { tournamentId: t.id, tournamentName: t.name, players: [] };
            });
            const slotsPerArena = requiredParticipants;

            // Usar snapshot do ranking do início do mês
            const rankingSnapshot = this.monthRankingSnapshot || bbpRanking.map((e, i) => ({ ...e, rank: i + 1 }));
            const topPlayers = rankingSnapshot.slice(0, allMasters.length * slotsPerArena);

            const arenaStyleBonus = {
              'Prismatic Nexus':   { ATTACK: 0.8, DEFENSE: 0.5, STAMINA: 0.6, BALANCE: 0.7 },
              'Vortex Coliseum':   { ATTACK: 0.5, DEFENSE: 0.6, STAMINA: 0.9, BALANCE: 0.7 },
              'Killer Sides':      { ATTACK: 0.9, DEFENSE: 0.4, STAMINA: 0.5, BALANCE: 0.6 },
              'Colosseum Carnage': { ATTACK: 0.7, DEFENSE: 0.8, STAMINA: 0.4, BALANCE: 0.7 }
            };
            const arenaPreferences = (typeof ARENA_PREFERENCES !== 'undefined' && ARENA_PREFERENCES) ? ARENA_PREFERENCES : {};

            // Draft em ordem de ranking: #1 escolhe primeiro, #2 depois, etc.
            for (const entry of topPlayers) {
              const playerId = entry.playerId;
              const team = TEAMS[playerId];
              const beyType = team?.beyblade?.type || 'BALANCE';
              const recentHistory = team?.recentArenas || [];
              const playerPrefs = arenaPreferences[playerId] || {};

              // Calcular score de preferência para cada arena com vaga disponível
              const arenaScores = Object.entries(arenaSlots)
                .filter(([, slot]) => slot.players.length < slotsPerArena)
                .map(([arenaName]) => {
                  let score = 0;
                  score += (playerPrefs[arenaName] || 0.5) * 0.40;  // Preferência explícita (40%)
                  score += (arenaStyleBonus[arenaName]?.[beyType] || 0.5) * 0.35; // Estilo (35%)
                  score += recentHistory.includes(arenaName) ? 0 : 0.25; // Evitar repetição (25%)
                  return { arenaName, score };
                });

              if (arenaScores.length === 0) break;

              arenaScores.sort((a, b) => b.score - a.score);
              const chosenArena = arenaScores[0].arenaName;
              arenaSlots[chosenArena].players.push(entry);
              console.log(`   🎯 Rank #${entry.rank} ${TEAMS[playerId]?.name || playerId} → ${chosenArena}`);
            }

            // Salvar draft completo
            const newDraft = new Map();
            Object.entries(arenaSlots).forEach(([arenaName, slot]) => {
              newDraft.set(slot.tournamentId, { arena: arenaName, tournamentName: slot.tournamentName, players: slot.players });
            });
            this.monthlyMastersAllocation.set(currentKey, newDraft);

            console.log(`   ✅ Draft completo!`);
            Object.entries(arenaSlots).forEach(([arenaName, slot]) => {
              console.log(`      ${arenaName}: ${slot.players.length} jogadores`);
            });
          }

          // Recuperar jogadores alocados para ESTE torneio
          const draft = this.monthlyMastersAllocation.get(currentKey);
          const mySlot = draft?.get(tournament.id);

          if (mySlot && mySlot.players.length > 0) {
            selectedPlayers = mySlot.players.map(p => ({
              playerId: p.playerId,
              rank: p.rank,
              points: p.points
            }));
            console.log(`   ✅ ${selectedPlayers.length} jogadores via draft para ${this.getTournamentArena(tournament)}`);
          } else {
            console.warn(`   ⚠️ Draft não encontrado para ${tournament.id}, usando fallback BBP`);
            selectedPlayers = bbpRanking.slice(0, requiredParticipants).map(e => ({
              playerId: e.playerId, rank: e.rank, points: e.points
            }));
          }

          console.log(`   📊 ${selectedPlayers.length} jogadores confirmados para ${tournament.name}`);
        } else {
          // Masters único no mês - pegar top 32 do BBP
          console.log('   📍 Elite Masters único no mês - usando Top 32 BBP');
          selectedPlayers = bbpRanking.slice(0, requiredParticipants).map(entry => ({
            playerId: entry.playerId,
            rank: entry.rank,
            points: entry.points
          }));
        }
        
        console.log(`   ✅ ${selectedPlayers.length} Elite Masters players`);
        
      } else {
        // ===== 🎲 FALLBACK: Torneio com tier desconhecido =====
        console.warn(`⚠️ Tier desconhecido: ${tournament.tier} - Usando ranking BBP`);
        const bbpRanking = this.getBBPRanking();
        const numParticipants = tournament.participants || 16;
        
        selectedPlayers = bbpRanking.slice(0, numParticipants).map(entry => ({
          playerId: entry.playerId,
          rank: entry.rank || (entry.playerId + 1),
          points: this.bbpRankings.get(entry.playerId) || 0
        }));
        
        console.log(`   ✅ ${selectedPlayers.length} jogadores do ranking BBP (fallback)`);
      }
    
    console.log(`📋 Selecionados ${selectedPlayers.length} jogadores para ${tournament.name}`);
    
    // 🔒 VALIDAÇÃO: Garantir que temos jogadores
    if (selectedPlayers.length === 0) {
      console.error(`❌ ERRO: Nenhum jogador selecionado para ${tournament.name}`);
      console.error(`   Tournament type: ${tournament.type}`);
      console.error(`   Tournament tier: ${tournament.tier}`);
      console.error(`   Expected participants: ${tournament.participants}`);
      
      // Fallback de emergência: pegar top N do ranking BBP
      const bbpRanking = this.getBBPRanking();
      const numParticipants = tournament.participants || 16;
      
      console.warn(`⚠️ Usando fallback de emergência: Top ${numParticipants} do BBP`);
      
      selectedPlayers = bbpRanking.slice(0, numParticipants).map(entry => ({
        playerId: entry.playerId,
        rank: entry.rank || (entry.playerId + 1),
        points: this.bbpRankings.get(entry.playerId) || 0
      }));
      
      console.log(`   ✅ Fallback: ${selectedPlayers.length} jogadores selecionados`);
    }
    
    // Adaptar decks para a arena do torneio
    const result = selectedPlayers.map((entry, idx) => {
      const team = TEAMS[entry.playerId];
      const adaptedDeck = adaptDeckForArena(team, tournamentArena);
      
      const player = {
        ...team,
        id: entry.playerId,
        teamIndex: entry.playerId,
        seedRank: entry.rank, // Guardar o rank do snapshot
        deck: adaptedDeck,
        deckArena: tournamentArena,
        intelligence: team.attributes?.intelligence || 7
      };
      
      // 🔍 DEBUG: Verificar se player tem propriedades essenciais
      if (!player.id && player.id !== 0 || !player.deck || !player.name) {
        console.error(`❌ PLAYER INVÁLIDO CRIADO [${idx}]:`, player);
        console.error(`   entry.playerId: ${entry.playerId} (tipo: ${typeof entry.playerId})`);
        console.error(`   team existe?`, !!team);
        console.error(`   team.name:`, team?.name);
        console.error(`   adaptedDeck existe?`, !!adaptedDeck);
        console.error(`   adaptedDeck length:`, adaptedDeck?.length);
        console.error(`   player.id:`, player.id);
        console.error(`   player.name:`, player.name);
        console.error(`   player.deck:`, player.deck);
      }
      
      return player;
    });
    
    // 🔍 DEBUG: Log dos primeiros 3 players
    console.log(`📋 GETPARTICIPANTS RETORNOU ${result.length} players - Primeiros 3:`);
    result.slice(0, 3).forEach((p, i) => {
      console.log(`   ${i+1}. ${p?.name || 'UNDEFINED'} | ID: ${p?.id} | Deck: ${p?.deck ? `${p.deck.length} beys` : 'UNDEFINED'}`);
    });
    
    return result;
  }

  // ===== LOG DE MATCHES =====
  logMatch(matchData) {
    const tournament = this.getCurrentTournament();
    const tournamentId = `${this.currentYear}-${this.currentMonth}-${this.currentTournamentIndex}`;
    
    // Pegar rankings atuais para detectar upsets
    const bbpRanking = this.getBBPRanking();
    const player1Rank = bbpRanking.findIndex(r => r.playerId === matchData.playerAId) + 1;
    const player2Rank = bbpRanking.findIndex(r => r.playerId === matchData.playerBId) + 1;
    
    // ⭐ NOVO: Rastrear tipos de peões usados (inferindo do combo usado)
    const playerABeyType = matchData.p1Combo ? this._inferBeyTypeFromCombo(matchData.p1Combo) : null;
    const playerBBeyType = matchData.p2Combo ? this._inferBeyTypeFromCombo(matchData.p2Combo) : null;
    
    const logEntry = {
      tournamentId,
      tournamentName: tournament.name,
      tournamentType: tournament.type,
      tournamentTier: tournament.tier,
      seasonNumber: this.currentYear,
      month: this.currentMonth,
      arenaId: matchData.arena || this.getTournamentArena(tournament),
      round: matchData.round || this.currentRound,
      matchId: matchData.matchId,
      playerAId: matchData.playerAId,
      playerBId: matchData.playerBId,
      winnerId: matchData.winnerId,
      loserId: matchData.winnerId === matchData.playerAId ? matchData.playerBId : matchData.playerAId,
      score: matchData.score || null, // { playerA: X, playerB: Y }
      rounds: matchData.rounds || null, // Array de rounds se disponível
      duration: matchData.duration || null, // Duração aproximada
      finishType: matchData.finishType || 'points', // 'points', 'KO', 'RO', 'burst'
      // ★ FIX: derivar allFinishes dos rounds reais quando disponível (evita MD3/MD5 ser tratado como MD1)
      allFinishes: matchData.allFinishes
        || (matchData.rounds && Array.isArray(matchData.rounds) && matchData.rounds.length > 0
            ? matchData.rounds.filter(r => r.winner !== 'DRAW').map(r => r.method || r.finishType || 'SPIN_FINISH')
            : [matchData.finishType || 'SPIN_FINISH']),
      burstCount: matchData.burstCount || 0,
      koCount: matchData.koCount || 0,
      ringOutCount: matchData.ringOutCount || 0,
      spinFinishCount: matchData.spinFinishCount || 0, // ★ CORRIGIDO: Adicionado contador de spin finish
      playerABeyType, // ⭐ NOVO: Tipo de peão do jogador A
      playerBBeyType, // ⭐ NOVO: Tipo de peão do jogador B
      upset: false,
      player1Rank,
      player2Rank,
      timestamp: Date.now()
    };
    
    // Detectar upset (winner tinha rank pior que loser)
    const winnerRank = matchData.winnerId === matchData.playerAId ? player1Rank : player2Rank;
    const loserRank = matchData.winnerId === matchData.playerAId ? player2Rank : player1Rank;
    if (winnerRank > loserRank && winnerRank > 0 && loserRank > 0) {
      logEntry.upset = true;
      logEntry.upsetMargin = winnerRank - loserRank;
      // ★ PERMANENTE: incrementar upsetsCaused no playerHistory para preservar recorde mesmo sem matchHistory antigo
      if (logEntry.upsetMargin >= 15) {
        const _upsHist = this.playerHistories.get(matchData.winnerId);
        if (_upsHist) {
          _upsHist.upsetsCaused = (_upsHist.upsetsCaused || 0) + 1;
          if (logEntry.upsetMargin > (_upsHist.biggestUpsetMargin || 0)) {
            _upsHist.biggestUpsetMargin = logEntry.upsetMargin;
            _upsHist.biggestUpsetYear   = this.currentYear;
          }
        }
      }
    }
    
    // 🔧 CORREÇÃO BUG: Validar se log já existe (prevenir duplicação)
    const existingLog = this.matchLog.find(l => 
      l.matchId === logEntry.matchId && 
      l.tournamentId === logEntry.tournamentId
    );
    
    if (existingLog) {
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.error('❌ DUPLICAÇÃO DE LOG DETECTADA!');
      console.error('   Match ID:', logEntry.matchId);
      console.error('   Torneio:', logEntry.tournamentName);
      console.error('   Round:', logEntry.round);
      console.error('   Log NÃO foi adicionado (prevenção de duplicação)');
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      return; // Não adiciona log duplicado
    }
    
    this.matchLog.push(logEntry);
    this.currentTournamentLog.push(logEntry);
    
    // ✅ OTIMIZAÇÃO: Limitar matchLog a 1000 entradas para prevenir crescimento O(n²)
    if (this.matchLog.length > 500) {
      this.matchLog = this.matchLog.slice(-500);
      console.log(`🧹 matchLog trimmed to 500 entries (performance optimization)`);
    }
    
    // ★ CORRIGIDO: LOG DE DEBUG PARA VERIFICAÇÃO
    console.log(`📝 Match logado #${this.currentTournamentLog.length}:`, {
      matchId: logEntry.matchId,
      round: logEntry.round,
      finishType: logEntry.finishType,
      allFinishes: logEntry.allFinishes,
      allFinishesLength: logEntry.allFinishes?.length || 0,
      burstCount: logEntry.burstCount,
      koCount: logEntry.koCount,
      ringOutCount: logEntry.ringOutCount,
      spinFinishCount: logEntry.spinFinishCount,
      roundsCount: logEntry.rounds?.length || 0
    });
    
    // ===== 🧠 ATUALIZAR SISTEMAS DE IA =====
    if (this.aiEnabled) {
      this.updateAIAfterMatch(matchData);
    }
    
    // ===== 📖 GERAR NARRATIVA (FASE 2) =====
    // Gerar tweets para o match
    if (this.socialEngine) {
      // 🔧 FIX: Usar objetos passados ao invés de buscar em TEAMS (para newgens)
      const winner = matchData.winnerObj || TEAMS[matchData.winnerId];
      const loser = matchData.loserObj || (matchData.winnerId === matchData.playerAId 
        ? (matchData.playerBObj || TEAMS[matchData.playerBId])
        : (matchData.playerAObj || TEAMS[matchData.playerAId]));
      
      const tweets = this.socialEngine.generateTweets({
        type: logEntry.upset ? 'UPSET' : 'MATCH_END',
        winner: winner,
        loser: loser,
        score: matchData.score,
        wasUpset: logEntry.upset,
        hadBurst: matchData.finishType === 'burst',
        wasClutch: matchData.score && (matchData.score.playerA === 2 || matchData.score.playerB === 2)
      }, {
        isFinal: matchData.round === 'F',
        round: matchData.round
      });
      
      // Armazenar tweets recentes
      if (!this.socialEngine.recentTweets) {
        this.socialEngine.recentTweets = [];
      }
      this.socialEngine.recentTweets.unshift(...tweets);
      // Manter apenas últimos 50 tweets
      if (this.socialEngine.recentTweets.length > 50) {
        this.socialEngine.recentTweets = this.socialEngine.recentTweets.slice(0, 50);
      }
    }
    
    console.log(`📝 Match logado: ${matchData.round} - Player ${matchData.playerAId} vs Player ${matchData.playerBId}`);
    console.log(`  - Total de logs no torneio atual: ${this.currentTournamentLog.length}`);
  }

  startTournament(tournamentIndex = 0) {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎮 START TOURNAMENT CHAMADO');
    console.log(`   tournamentIndex: ${tournamentIndex}`);
    console.log(`   currentMonth: ${this.currentMonth}`);
    console.log(`   currentYear: ${this.currentYear}`);
    console.log(`   nextTournamentKey: ${this.nextTournamentKey}`);
    console.log(`   bracketInProgress: ${this.bracketInProgress}`);
    console.log(`   currentBracket exists: ${this.currentBracket !== null}`);
    
    // 🎯 VERIFICAÇÃO: Se já existe bracket em progresso, apenas retornar ele
    if (this.bracketInProgress && this.currentBracket !== null) {
      return this.currentBracket;
    }
    
    // 🔒 VALIDAÇÃO: Garantir que estamos iniciando o torneio correto
    const [expectedYear, expectedMonth, expectedIndex] = this.nextTournamentKey.split('-').map(Number);
    
    if (tournamentIndex !== expectedIndex || 
        this.currentMonth !== expectedMonth || 
        this.currentYear !== expectedYear) {
      console.error('❌ ERRO: Tentativa de iniciar torneio fora de sequência!');
      console.error(`   Esperado: ${this.nextTournamentKey}`);
      console.error(`   Recebido: ${this.currentYear}-${this.currentMonth}-${tournamentIndex}`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      return null;
    }
    
    if (!this._turboMode) console.log(`✅ Validação passou! Iniciando torneio: ${this.nextTournamentKey}`);
    // ⚡ Limpar cache de vitórias no torneio (novo torneio começa zerado)
    this._tourneyWinsCache.clear();
    this.currentTournamentIndex = tournamentIndex;
    const tournament = this.getCurrentTournament();
    
    if (!this._turboMode) { console.log(`📋 Torneio: ${tournament?.name} | ${tournament?.type} | ${tournament?.participants}p`); }
    
    if (!tournament) {
      console.error('❌ Torneio não encontrado!');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      return null;
    }
    
    // ===== 🎫 QUALIFYING TOURNAMENT PARA GRAND SLAMS =====
    // REMOVIDO: A lógica automática de qualifying foi desativada.
    // Os qualifying tournaments agora são definidos explicitamente no calendário:
    // - Setembro: "Last Chance Qualifier" (type: 'QUALIFIER')
    // - Novembro: "Finals Qualification Tournament" (type: 'GRAND_FINALS_QUALIFIER')
    // Grand Slams como NEW YEAR GRAND SLAM usam Top 64 do ranking BBP diretamente.
    
    // Reset qualifying flag quando avançar para próximo mês
    if (tournamentIndex === 0) {
      this.qualifyingGenerated = false;
      this.pendingQualifying = null;
    }
    
    // 🔧 CORREÇÃO BUG: Resetar log do torneio atual
    // Previne vazamento de logs de torneios anteriores
    const previousLogCount = this.currentTournamentLog.length;
    this.currentTournamentLog = [];
    console.log(`🧹 currentTournamentLog limpo (tinha ${previousLogCount} logs)`);

    
    // 📰 Salvar snapshot do ranking para detectar mudanças depois
    const rankingSnapshot = new Map();
    const currentRankings = Array.from(this.bbpRankings.entries())
      .sort((a, b) => b[1] - a[1]);
    
    currentRankings.forEach(([playerId, points], index) => {
      rankingSnapshot.set(playerId, index + 1);
    });
    
    this.rankingHistory.push(rankingSnapshot);
    // Manter no máximo 60 snapshots em memória (≈3 anos de torneios)
    if (this.rankingHistory.length > 60) {
      this.rankingHistory = this.rankingHistory.slice(-60);
    }
    console.log('📸 Snapshot do ranking salvo:', this.rankingHistory.length, 'snapshots totais');
    
    // ✨ NOVO: Tentar criar bracket específico por tier primeiro
    console.log(`🏗️ Criando bracket para tier: ${tournament.tier}...`);
    
    let bracket = this.selectBracketByTier(tournament);
    
    // Se não criou bracket por tier, usar lógica antiga baseada em número de participantes
    if (!bracket) {
      const participants = this.getParticipantsForTournament(tournament);
      console.log(`📋 Usando lógica padrão com ${tournament.participants} participantes...`);
      
      if (tournament.participants === 64) {
        bracket = this.create64PlayerBracket(participants, tournament);
      } else if (tournament.participants === 48) {
        bracket = this.create48PlayerBracket(participants, tournament);
      } else if (tournament.participants === 32) {
        bracket = this.create32PlayerBracket(participants, tournament);
      } else if (tournament.participants === 24) {
        bracket = this.create24PlayerBracket(participants, tournament);
      } else if (tournament.participants === 16) {
        bracket = this.create16PlayerBracket(participants, tournament);
      } else if (tournament.participants === 12) {
        bracket = this.create12PlayerBracket(participants, tournament);
      } else if (tournament.participants === 8) {
        bracket = this.create8PlayerBracket(participants, tournament);
      } else {
        console.error(`❌ ERRO: Número de participantes não suportado: ${tournament.participants}`);
        console.error(`   Números suportados: 8, 12, 16, 24, 32, 48, 64`);
      }
    }
    
    if (bracket) {
      console.log(`✅ Bracket criado com sucesso!`);
      console.log(`   currentBracket está definido: ${this.currentBracket !== null}`);
      console.log(`   currentRound: ${this.currentRound}`);
      
      // 🎯 Marcar bracket como inicializado e em progresso
      this.bracketInitialized = true;
      this.bracketInProgress = true;
      console.log('🎯 Bracket marcado como inicializado e em progresso');
    } else {
      console.error(`❌ Falha ao criar bracket!`);
    }
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    return bracket;
  }
  
  // ============================================
  // 🎯 BRACKET LIFECYCLE MANAGEMENT
  // ============================================
  
  /**
   * Inicializa o primeiro bracket do Universe Mode
   * Chamado apenas na primeira vez que o usuário entra no Universe Mode
   */
  initializeFirstBracket() {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎯 INITIALIZE FIRST BRACKET');
    console.log(`   bracketInitialized: ${this.bracketInitialized}`);
    console.log(`   currentBracket exists: ${this.currentBracket !== null}`);
    
    // Se já foi inicializado, não fazer nada
    if (this.bracketInitialized && this.currentBracket !== null) {
      console.log('✅ Bracket já inicializado - mantendo atual');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      return this.currentBracket;
    }
    
    console.log('🎮 Criando primeiro bracket (Grand Slam de Janeiro)...');
    
    // Criar o bracket do primeiro torneio (índice 0)
    const bracket = this.startTournament(0);
    
    console.log('✅ Primeiro bracket criado com sucesso!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    return bracket;
  }
  
  /**
   * Prepara o bracket do próximo torneio
   * Chamado automaticamente quando um torneio é concluído
   */
  prepareNextTournamentBracket() {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎯 PREPARE NEXT TOURNAMENT BRACKET');
    
    // Marcar que o bracket atual não está mais em progresso
    this.bracketInProgress = false;
    console.log('   ✅ bracketInProgress = false');

    // 🔑 FIX: Se estamos no fim de temporada, NÃO criar bracket automaticamente.
    // O nextTournamentKey ainda aponta para o último torneio de dezembro (stale),
    // e criar um bracket agora causaria o ano 2 começar com bracket errado.
    if (this.pendingYearEnd) {
      console.log('   ⏳ pendingYearEnd = true — sem bracket automático. Aguardando FINALIZAR TEMPORADA.');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      return null;
    }
    
    // Obter o próximo torneio disponível
    const nextTournament = this.getNextAvailableTournament();
    
    if (!nextTournament) {
      console.log('   ⚠️ Nenhum próximo torneio disponível');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      return null;
    }
    
    console.log(`   📋 Próximo torneio: ${nextTournament.tournament.name}`);
    console.log(`   📅 Mês: ${nextTournament.month}/${nextTournament.year}`);
    console.log(`   🔢 Índice: ${nextTournament.index}`);
    
    // Criar o bracket do próximo torneio
    const bracket = this.startTournament(nextTournament.index);
    
    if (bracket) {
      console.log('✅ Próximo bracket criado com sucesso!');
    } else {
      console.error('❌ Falha ao criar próximo bracket!');
    }
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    return bracket;
  }
  
  // ============================================
  // 🎾 SEEDING SYSTEM (ATP/Tennis Style)
  // ============================================
  // Gera posições corretas de seeding para brackets de tennis
  generateSeedingPositions64() {
    // Posições de seeding para bracket de 64 (32 matches R64)
    // Baseado no sistema ATP de Grand Slams
    return {
      1: 0,    // Match 1: Seed #1
      16: 1,   // Match 2: Seed #16
      8: 2,    // Match 3: Seed #8
      9: 3,    // Match 4: Seed #9
      4: 4,    // Match 5: Seed #4
      13: 5,   // Match 6: Seed #13
      5: 6,    // Match 7: Seed #5
      12: 7,   // Match 8: Seed #12
      3: 8,    // Match 9: Seed #3
      14: 9,   // Match 10: Seed #14
      6: 10,   // Match 11: Seed #6
      11: 11,  // Match 12: Seed #11
      2: 12,   // Match 13: Seed #2
      15: 13,  // Match 14: Seed #15
      7: 14,   // Match 15: Seed #7
      10: 15   // Match 16: Seed #10
    };
  }

  generateSeedingPositions32() {
    // Posições de seeding para bracket de 32 (16 matches R32)
    // Top 8 são seeds
    return {
      1: 0,    // Match 1: Seed #1
      8: 1,    // Match 2: Seed #8
      4: 2,    // Match 3: Seed #4
      5: 3,    // Match 4: Seed #5
      3: 4,    // Match 5: Seed #3
      6: 5,    // Match 6: Seed #6
      2: 6,    // Match 7: Seed #2
      7: 7     // Match 8: Seed #7
    };
  }

  generateSeedingPositions16() {
    // Posições de seeding para bracket de 16 (8 matches R16)
    // Top 4 são seeds
    return {
      1: 0,    // Match 1: Seed #1
      4: 1,    // Match 2: Seed #4
      3: 2,    // Match 3: Seed #3
      2: 3     // Match 4: Seed #2
    };
  }

  // Gera posições de seeding para jogadores com BYE ao entrar na próxima rodada
  // Garante que seeds ficam em partes opostas do bracket
  generateByeSeedPositions(numSeeds) {
    // Retorna: { seedIndex(0-based) → matchIdx na próxima rodada }
    if (numSeeds === 16) {
      // 16 BYEs em 16 matches — estilo ATP Grand Slam
      // Seed 1 e 2 ficam em metades opostas (só se encontram na final)
      return {
        0:  0,  // Seed 1  → match 0  (topo)
        1:  15, // Seed 2  → match 15 (fundo)
        2:  8,  // Seed 3  → match 8  (Q3 topo)
        3:  7,  // Seed 4  → match 7  (Q2 fundo)
        4:  4,  // Seed 5  → match 4
        5:  11, // Seed 6  → match 11
        6:  12, // Seed 7  → match 12
        7:  3,  // Seed 8  → match 3
        8:  2,  // Seed 9  → match 2
        9:  13, // Seed 10 → match 13
        10: 10, // Seed 11 → match 10
        11: 5,  // Seed 12 → match 5
        12: 6,  // Seed 13 → match 6
        13: 9,  // Seed 14 → match 9
        14: 14, // Seed 15 → match 14
        15: 1,  // Seed 16 → match 1
      };
    } else if (numSeeds === 8) {
      // 8 BYEs em 8 matches — estilo ATP Masters
      return {
        0: 0,  // Seed 1 → match 0
        1: 7,  // Seed 2 → match 7
        2: 4,  // Seed 3 → match 4
        3: 3,  // Seed 4 → match 3
        4: 2,  // Seed 5 → match 2
        5: 5,  // Seed 6 → match 5
        6: 6,  // Seed 7 → match 6
        7: 1,  // Seed 8 → match 1
      };
    } else if (numSeeds === 4) {
      // 4 BYEs em 4 matches
      return {
        0: 0,  // Seed 1 → match 0
        1: 3,  // Seed 2 → match 3
        2: 2,  // Seed 3 → match 2
        3: 1,  // Seed 4 → match 1
      };
    }
    // Fallback genérico
    const result = {};
    for (let i = 0; i < numSeeds; i++) result[i] = i;
    return result;
  }

  // Criar bracket de 64 com seeding (Grand Slams)
  create64PlayerBracket(participants, tournament) {
    console.log(`🏆 Criando bracket 64 para ${tournament.name}`);
    console.log(`👥 Número de participantes recebidos: ${participants.length}`);
    
    // ===== 🎾 SEEDING PROFISSIONAL (ATP/TENNIS STYLE) =====
    console.log('🎾 Aplicando seeding profissional (ATP)...');
    
    // Top 16 são seeds, resto é unseeded
    const numSeeds = 16;
    const seeds = participants.slice(0, numSeeds);
    const unseeded = participants.slice(numSeeds);
    
    console.log(`   Seeds (1-${numSeeds}):`, seeds.map((p, i) => `#${i+1} ${TEAMS[p]?.name || 'Unknown'}`).join(', '));
    
    // Embaralhar unseeded (Fisher-Yates)
    const shuffled = [...unseeded];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    
    // Pegar posições de seeding ATP
    const seedPositions = this.generateSeedingPositions64();
    
    // Criar array de 32 matches (R64)
    const matches = new Array(32);
    
    // Colocar seeds nas posições corretas
    Object.entries(seedPositions).forEach(([seedNum, matchIdx]) => {
      const seedRank = parseInt(seedNum) - 1; // Converter para índice (0-based)
      matches[matchIdx] = {
        player1: seeds[seedRank], // O seed
        player2: null,             // Será preenchido com unseeded
        seedPosition: parseInt(seedNum)
      };
      console.log(`   Seed #${seedNum} (${TEAMS[seeds[seedRank]]?.name || 'Unknown'}) → Match ${matchIdx + 1}`);
    });
    
    // Preencher matches restantes com unseeded
    let unseededIdx = 0;
    for (let i = 0; i < 32; i++) {
      if (!matches[i]) {
        // Match sem seed - dois unseeded
        matches[i] = {
          player1: shuffled[unseededIdx++],
          player2: shuffled[unseededIdx++],
          seedPosition: null
        };
      } else {
        // Match com seed - adicionar unseeded como oponente
        matches[i].player2 = shuffled[unseededIdx++];
      }
    }
    
    // Resetar pontos do torneio atual
    this.currentTournamentPoints.clear();
    
    // Arenas para Grand Slam
    const ALL_ARENAS = ['BB10_COMPETITIVE', 'KILLER_SIDES', 'NEXUS', 'VOLCANIC_RAGE', 'PANGEA_PLATFORM', 'COLOSSEUM_CARNAGE', 'PINBALL_INFERNO', 'VORTEX_COLISEUM'];
    const getMatchArena = (idx) => {
      const tArena = this.getTournamentArena(tournament);
      if (tArena !== 'ALL') {
        return this.getTournamentArenaCode(tournament);
      }
      return ALL_ARENAS[idx % ALL_ARENAS.length];
    };
    
    // Criar bracket structure
    this.currentBracket = { R64: [], R32: [], R16: [], QF: [], SF: [], F: [] };
    
    matches.forEach((match, idx) => {
      // match.player1 e match.player2 JÁ SÃO OBJETOS COMPLETOS vindos de participants!
      this.currentBracket.R64.push({
        player1: match.player1,
        player2: match.player2,
        winner: null,
        matchId: `R64-${idx}`,
        arena: getMatchArena(idx),
        seedInfo: match.seedPosition ? `Seed #${match.seedPosition}` : 'Unseeded'
      });
    });
    
    // Debug: Log dos primeiros 5 matches para verificar ordem e arena
    console.log(`📋 Primeiros 5 matches do bracket R64:`);
    this.currentBracket.R64.slice(0, 5).forEach((match, idx) => {
      console.log(`   Match ${idx + 1}: ${match.player1?.name || 'Unknown'} vs ${match.player2?.name || 'Unknown'} (${match.seedInfo}) - Arena: ${match.arena}`);
    });
    
    console.log(`✅ Bracket R64 criado com ${this.currentBracket.R64.length} partidas`);
    console.log(`   Seeding: Top ${numSeeds} players são cabeças de chave`);
    console.log(`   Projeção Final: #1 vs #2`);
    console.log(`   Projeção Semis: #1 vs #3/4 | #2 vs #3/4`);
    
    this.currentRound = 'R64';
    return { tournament, bracket: this.currentBracket };
  }
  
  // Criar bracket de 32 (Masters)
  create32PlayerBracket(participants, tournament) {
    console.log(`🏆 Criando bracket 32 para ${tournament.name}`);
    console.log(`👥 Número de participantes recebidos: ${participants.length}`);
    
    // ===== 🎾 SEEDING PROFISSIONAL (ATP/TENNIS STYLE) =====
    console.log('🎾 Aplicando seeding profissional (ATP)...');
    
    // Top 8 são seeds, resto é unseeded
    const numSeeds = 8;
    const seeds = participants.slice(0, numSeeds);
    const unseeded = participants.slice(numSeeds);
    
    console.log(`   Seeds (1-${numSeeds}):`, seeds.map((p, i) => `#${i+1} ${TEAMS[p]?.name || 'Unknown'}`).join(', '));
    
    // Embaralhar unseeded (Fisher-Yates)
    const shuffled = [...unseeded];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    
    // Pegar posições de seeding ATP
    const seedPositions = this.generateSeedingPositions32();
    
    // Criar array de 16 matches (R32)
    const matches = new Array(16);
    
    // Colocar seeds nas posições corretas
    Object.entries(seedPositions).forEach(([seedNum, matchIdx]) => {
      const seedRank = parseInt(seedNum) - 1;
      matches[matchIdx] = {
        player1: seeds[seedRank],
        player2: null,
        seedPosition: parseInt(seedNum)
      };
      console.log(`   Seed #${seedNum} (${TEAMS[seeds[seedRank]]?.name || 'Unknown'}) → Match ${matchIdx + 1}`);
    });
    
    // Preencher com unseeded
    let unseededIdx = 0;
    for (let i = 0; i < 16; i++) {
      if (!matches[i]) {
        // Match sem seed - dois unseeded
        matches[i] = {
          player1: shuffled[unseededIdx++],
          player2: shuffled[unseededIdx++],
          seedPosition: null
        };
      } else {
        // Match com seed - adicionar unseeded como oponente
        matches[i].player2 = shuffled[unseededIdx++];
      }
    }
    
    // Resetar pontos do torneio atual
    this.currentTournamentPoints.clear();
    
    // ===== 🏟️ ARENA MAPPING =====
    const nameMap = {
      'BB-10': 'BB10_COMPETITIVE',
      'BB-10 Competitive': 'BB10_COMPETITIVE',
      'BB10_COMPETITIVE': 'BB10_COMPETITIVE',
      'Prismatic Nexus': 'NEXUS', 'Prismatic Portal': 'NEXUS',
      'Volcanic Rage': 'VOLCANIC_RAGE',
      'Colosseum Carnage': 'COLOSSEUM_CARNAGE', 'Carnage Colosseum': 'COLOSSEUM_CARNAGE',
      'Vortex Coliseum': 'VORTEX_COLISEUM', 'Vortex Colosseum': 'VORTEX_COLISEUM',
      'Pinball Inferno': 'PINBALL_INFERNO',
      'Pangea Platform': 'PANGEA_PLATFORM',
      'Killer Sides': 'KILLER_SIDES', 'Killer Side': 'KILLER_SIDES',
      'Storm Track': 'STORM_TRACK',
      'Tidal Surge': 'TIDAL_SURGE', 'Tidal Clash': 'TIDAL_SURGE',
      'Domination Zones': 'DOMINATION_ZONES', 'Domination Zone': 'DOMINATION_ZONES'
    };
    
    // Determinar arena para os matches (tournament.arenas é array ou 'ALL' no CalendarConfig)
    const matchArena = this.getTournamentArenaCode(tournament);
    console.log(`🏟️  Arena do torneio: ${this.getTournamentArena(tournament)} → ${matchArena}`);
    
    // Criar bracket structure
    this.currentBracket = { R32: [], R16: [], QF: [], SF: [], F: [] };
    
    console.log(`📋 CREATE32BRACKET recebeu ${matches.length} matches - Verificando primeiros 3:`);
    matches.slice(0, 3).forEach((match, i) => {
      console.log(`   Match ${i}: player1=${match.player1?.name || 'UNDEFINED'} (id: ${match.player1?.id}), player2=${match.player2?.name || 'UNDEFINED'} (id: ${match.player2?.id})`);
    });
    
    matches.forEach((match, idx) => {
      // match.player1 e match.player2 JÁ SÃO OBJETOS COMPLETOS vindos de participants!
      const p1 = match.player1;
      const p2 = match.player2;
      
      // 🔍 DEBUG: Validar se players têm propriedades essenciais
      if (!p1 || (!p1.id && p1.id !== 0) || !p1.deck) {
        console.error(`❌ Player 1 INVÁLIDO no match ${idx}:`, p1);
        console.error(`   Tem id?`, p1?.id, `| Tem deck?`, !!p1?.deck, `| Tem name?`, p1?.name);
      }
      if (!p2 || (!p2.id && p2.id !== 0) || !p2.deck) {
        console.error(`❌ Player 2 INVÁLIDO no match ${idx}:`, p2);
        console.error(`   Tem id?`, p2?.id, `| Tem deck?`, !!p2?.deck, `| Tem name?`, p2?.name);
      }
      
      this.currentBracket.R32.push({
        player1: p1,
        player2: p2,
        winner: null,
        matchId: `R32-${idx}`,
        arena: matchArena,
        seedInfo: match.seedPosition ? `Seed #${match.seedPosition}` : 'Unseeded'
      });
    });
    
    // Debug: Log dos primeiros 3 matches
    console.log(`📋 Primeiros 3 matches do bracket R32:`);
    this.currentBracket.R32.slice(0, 3).forEach((match, idx) => {
      const p1 = TEAMS[match.player1];
      const p2 = TEAMS[match.player2];
      console.log(`   Match ${idx + 1}: ${p1?.name || 'Unknown'} vs ${p2?.name || 'Unknown'} (${match.seedInfo}) - Arena: ${match.arena}`);
    });
    
    console.log(`✅ Bracket R32 criado com ${this.currentBracket.R32.length} partidas`);
    console.log(`   Seeding: Top ${numSeeds} players são cabeças de chave`);
    console.log(`   Projeção Final: #1 vs #2`);
    
    this.currentRound = 'R32';
    return { tournament, bracket: this.currentBracket };
  }
  
  // Criar bracket de 16 (Challengers e Masters)
  create16PlayerBracket(participants, tournament) {
    console.log(`🏆 Criando bracket 16 para ${tournament.name}`);
    console.log(`👥 Número de participantes recebidos: ${participants.length}`);
    
    // ===== 🎾 SEEDING PROFISSIONAL (ATP/TENNIS STYLE) =====
    console.log('🎾 Aplicando seeding profissional (ATP)...');
    
    // Top 4 são seeds, resto é unseeded
    const numSeeds = 4;
    const seeds = participants.slice(0, numSeeds);
    const unseeded = participants.slice(numSeeds);
    
    console.log(`   Seeds (1-${numSeeds}):`, seeds.map((p, i) => `#${i+1} ${TEAMS[p]?.name || 'Unknown'}`).join(', '));
    
    // Embaralhar unseeded (Fisher-Yates)
    const shuffled = [...unseeded];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    
    // Pegar posições de seeding ATP
    const seedPositions = this.generateSeedingPositions16();
    
    // Criar array de 8 matches (R16)
    const matches = new Array(8);
    
    // Colocar seeds nas posições corretas
    Object.entries(seedPositions).forEach(([seedNum, matchIdx]) => {
      const seedRank = parseInt(seedNum) - 1;
      matches[matchIdx] = {
        player1: seeds[seedRank],
        player2: null,
        seedPosition: parseInt(seedNum)
      };
      console.log(`   Seed #${seedNum} (${TEAMS[seeds[seedRank]]?.name || 'Unknown'}) → Match ${matchIdx + 1}`);
    });
    
    // Preencher com unseeded
    let unseededIdx = 0;
    for (let i = 0; i < 8; i++) {
      if (!matches[i]) {
        // Match sem seed - dois unseeded
        matches[i] = {
          player1: shuffled[unseededIdx++],
          player2: shuffled[unseededIdx++],
          seedPosition: null
        };
      } else {
        // Match com seed - adicionar unseeded como oponente
        matches[i].player2 = shuffled[unseededIdx++];
      }
    }
    
    // Resetar pontos do torneio atual
    this.currentTournamentPoints.clear();
    
    // ===== 🏟️ ARENA MAPPING =====
    const nameMap = {
      'BB-10': 'BB10_COMPETITIVE',
      'BB-10 Competitive': 'BB10_COMPETITIVE',
      'BB10_COMPETITIVE': 'BB10_COMPETITIVE',
      'Prismatic Nexus': 'NEXUS', 'Prismatic Portal': 'NEXUS',
      'Volcanic Rage': 'VOLCANIC_RAGE',
      'Colosseum Carnage': 'COLOSSEUM_CARNAGE', 'Carnage Colosseum': 'COLOSSEUM_CARNAGE',
      'Vortex Coliseum': 'VORTEX_COLISEUM', 'Vortex Colosseum': 'VORTEX_COLISEUM',
      'Pinball Inferno': 'PINBALL_INFERNO',
      'Pangea Platform': 'PANGEA_PLATFORM',
      'Killer Sides': 'KILLER_SIDES', 'Killer Side': 'KILLER_SIDES',
      'Storm Track': 'STORM_TRACK',
      'Tidal Surge': 'TIDAL_SURGE', 'Tidal Clash': 'TIDAL_SURGE',
      'Domination Zones': 'DOMINATION_ZONES', 'Domination Zone': 'DOMINATION_ZONES'
    };
    
    const matchArena = this.getTournamentArenaCode(tournament);
    console.log(`🏟️  Arena do torneio: ${this.getTournamentArena(tournament)} → ${matchArena}`);
    
    // Criar bracket structure
    this.currentBracket = { R16: [], QF: [], SF: [], F: [] };
    
    matches.forEach((match, idx) => {
      // match.player1 e match.player2 JÁ SÃO OBJETOS COMPLETOS vindos de participants!
      this.currentBracket.R16.push({
        player1: match.player1,
        player2: match.player2,
        winner: null,
        matchId: `R16-${idx}`,
        arena: matchArena,
        seedInfo: match.seedPosition ? `Seed #${match.seedPosition}` : 'Unseeded'
      });
    });
    
    // Debug: Log dos primeiros 3 matches
    console.log(`📋 Primeiros 3 matches do bracket R16:`);
    this.currentBracket.R16.slice(0, 3).forEach((match, idx) => {
      console.log(`   Match ${idx + 1}: ${match.player1?.name || 'Unknown'} vs ${match.player2?.name || 'Unknown'} (${match.seedInfo}) - Arena: ${match.arena}`);
    });
    
    console.log(`✅ Bracket R16 criado com ${this.currentBracket.R16.length} partidas`);
    console.log(`   Seeding: Top ${numSeeds} players são cabeças de chave`);
    console.log(`   Projeção Final: #1 vs #2`);
    
    this.currentRound = 'R16';
    return { tournament, bracket: this.currentBracket };
  }

  create8PlayerBracket(participants, tournament) {
    console.log(`👑 Criando bracket Grand Finals 8 para ${tournament.name}`);
    console.log(`👥 Número de participantes recebidos: ${participants.length}`);
    
    // Grand Finals usa seeding baseado em BBP ranking (já vem ordenado)
    const seeds = participants.slice(0, 8);
    
    // Resetar pontos do torneio atual
    this.currentTournamentPoints.clear();
    
    // Bracket de 8: QF -> SF -> F
    this.currentBracket = { QF: [], SF: [], F: [] };
    
    // Quarterfinais com seeding clássico:
    // 1vs8, 4vs5, 2vs7, 3vs6
    const quarterfinalsSeeding = [
      [0, 7], // Seed 1 vs Seed 8
      [3, 4], // Seed 4 vs Seed 5
      [1, 6], // Seed 2 vs Seed 7
      [2, 5]  // Seed 3 vs Seed 6
    ];
    
    quarterfinalsSeeding.forEach((matchup, idx) => {
      const [seed1Idx, seed2Idx] = matchup;
      if (seeds[seed1Idx] && seeds[seed2Idx]) {
        // seeds JÁ SÃO OBJETOS COMPLETOS vindos de participants!
        this.currentBracket.QF.push({
          player1: seeds[seed1Idx],
          player2: seeds[seed2Idx],
          winner: null,
          matchId: `QF-${idx}`
        });
      }
    });
    
    console.log(`✅ Grand Finals Bracket QF criado com ${this.currentBracket.QF.length} partidas`);
    console.log(`   Matchups:`);
    this.currentBracket.QF.forEach((match, idx) => {
      console.log(`   ${idx + 1}. ${match.player1.name} vs ${match.player2.name}`);
    });
    
    this.currentRound = 'QF';
    return { tournament, bracket: this.currentBracket };
  }

  // ============================================================
  // 🆕 BRACKETS COM SISTEMA DE BYES
  // ============================================================
  
  create48PlayerBracket(participants, tournament) {
    console.log(`🏆 Criando bracket 48 (com 16 BYEs) para ${tournament.name}`);
    console.log(`👥 Número de participantes recebidos: ${participants.length}`);
    
    // Validar número de participantes
    if (participants.length !== 48) {
      console.error(`❌ ERRO: Esperado 48 participantes, recebido ${participants.length}`);
      return null;
    }
    
    // Resetar pontos do torneio atual
    this.currentTournamentPoints.clear();
    
    // Top 16 rankeados (índices 0-15) recebem BYE direto para R32
    const byePlayers = participants.slice(0, 16);
    
    // Restantes 32 (índices 16-47) jogam R64
    const r64Players = participants.slice(16, 48);
    
    // Embaralhar apenas os jogadores da R64 entre si
    // ✅ CORREÇÃO: Fisher-Yates shuffle (uniformemente aleatório)
    const shuffledR64 = [...r64Players];
    for (let i = shuffledR64.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledR64[i], shuffledR64[j]] = [shuffledR64[j], shuffledR64[i]];
    }
    
    console.log(`🎯 Sistema de BYEs ativado:`);
    console.log(`   ✅ ${byePlayers.length} jogadores com BYE → Avanço direto para R32`);
    console.log(`   ⚔️ ${shuffledR64.length} jogadores → Disputam R64 (${shuffledR64.length / 2} partidas)`);
    
    // Criar estrutura do bracket (BYES ficam como objetos também)
    this.currentBracket = { R64: [], R32: [], R16: [], QF: [], SF: [], F: [], BYES: byePlayers };
    
    // Criar R64 com os 32 jogadores restantes
    for (let i = 0; i < shuffledR64.length; i += 2) {
      if (shuffledR64[i] && shuffledR64[i + 1]) {
        // shuffledR64[i] JÁ É UM OBJETO COMPLETO vindo de participants!
        this.currentBracket.R64.push({
          player1: shuffledR64[i],
          player2: shuffledR64[i + 1],
          winner: null,
          matchId: `R64-${i / 2}`
        });
      }
    }
    
    console.log(`✅ Bracket R64 criado com ${this.currentBracket.R64.length} partidas`);
    console.log(`   Os ${byePlayers.length} jogadores com BYE aguardam na R32`);
    
    this.currentRound = 'R64';
    return { tournament, bracket: this.currentBracket };
  }
  
  create24PlayerBracket(participants, tournament) {
    console.log(`🏆 Criando bracket 24 (com 8 BYEs) para ${tournament.name}`);
    console.log(`👥 Número de participantes recebidos: ${participants.length}`);
    
    // Validar número de participantes
    if (participants.length !== 24) {
      console.error(`❌ ERRO: Esperado 24 participantes, recebido ${participants.length}`);
      return null;
    }
    
    // Resetar pontos do torneio atual
    this.currentTournamentPoints.clear();
    
    // Top 8 rankeados (índices 0-7) recebem BYE direto para R16
    const byePlayers = participants.slice(0, 8);
    
    // Restantes 16 (índices 8-23) jogam R32
    const r32Players = participants.slice(8, 24);
    
    // Embaralhar apenas os jogadores da R32 entre si
    // ✅ CORREÇÃO: Fisher-Yates shuffle
    const shuffledR32 = [...r32Players];
    for (let i = shuffledR32.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledR32[i], shuffledR32[j]] = [shuffledR32[j], shuffledR32[i]];
    }
    
    console.log(`🎯 Sistema de BYEs ativado:`);
    console.log(`   ✅ ${byePlayers.length} jogadores com BYE → Avanço direto para R16`);
    console.log(`   ⚔️ ${shuffledR32.length} jogadores → Disputam R32 (${shuffledR32.length / 2} partidas)`);
    
    // Criar estrutura do bracket (com BYEs como IDs, serão convertidos na R16)
    this.currentBracket = { R32: [], R16: [], QF: [], SF: [], F: [], BYES: byePlayers };
    
    // Criar R32 com os 16 jogadores restantes
    for (let i = 0; i < shuffledR32.length; i += 2) {
      if (shuffledR32[i] && shuffledR32[i + 1]) {
        // shuffledR32[i] JÁ É UM OBJETO COMPLETO vindo de participants!
        this.currentBracket.R32.push({
          player1: shuffledR32[i],
          player2: shuffledR32[i + 1],
          winner: null,
          matchId: `R32-${i / 2}`
        });
      }
    }
    
    console.log(`✅ Bracket R32 criado com ${this.currentBracket.R32.length} partidas`);
    console.log(`   Os ${byePlayers.length} jogadores com BYE aguardam na R16`);
    
    this.currentRound = 'R32';
    return { tournament, bracket: this.currentBracket };
  }
  
  create12PlayerBracket(participants, tournament) {
    console.log(`🏆 Criando bracket 12 (com 4 BYEs) para ${tournament.name}`);
    console.log(`👥 Número de participantes recebidos: ${participants.length}`);
    
    // Validar número de participantes
    if (participants.length !== 12) {
      console.error(`❌ ERRO: Esperado 12 participantes, recebido ${participants.length}`);
      return null;
    }
    
    // Resetar pontos do torneio atual
    this.currentTournamentPoints.clear();
    
    // Top 4 rankeados (índices 0-3) recebem BYE direto para QF
    const byePlayers = participants.slice(0, 4);
    
    // Restantes 8 (índices 4-11) jogam R16
    const r16Players = participants.slice(4, 12);
    
    // Embaralhar apenas os jogadores da R16 entre si
    // ✅ CORREÇÃO: Fisher-Yates shuffle
    const shuffledR16 = [...r16Players];
    for (let i = shuffledR16.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledR16[i], shuffledR16[j]] = [shuffledR16[j], shuffledR16[i]];
    }
    
    console.log(`🎯 Sistema de BYEs ativado:`);
    console.log(`   ✅ ${byePlayers.length} jogadores com BYE → Avanço direto para QF`);
    console.log(`   ⚔️ ${shuffledR16.length} jogadores → Disputam R16 (${shuffledR16.length / 2} partidas)`);
    
    // Criar estrutura do bracket (com BYEs como IDs, serão convertidos na QF)
    this.currentBracket = { R16: [], QF: [], SF: [], F: [], BYES: byePlayers };
    
    // Criar R16 com os 8 jogadores restantes
    for (let i = 0; i < shuffledR16.length; i += 2) {
      if (shuffledR16[i] && shuffledR16[i + 1]) {
        // shuffledR16[i] JÁ É UM OBJETO COMPLETO vindo de participants!
        this.currentBracket.R16.push({
          player1: shuffledR16[i],
          player2: shuffledR16[i + 1],
          winner: null,
          matchId: `R16-${i / 2}`
        });
      }
    }
    
    console.log(`✅ Bracket R16 criado com ${this.currentBracket.R16.length} partidas`);
    console.log(`   Os ${byePlayers.length} jogadores com BYE aguardam na QF`);
    
    this.currentRound = 'R16';
    return { tournament, bracket: this.currentBracket };
  }

  getCurrentMatch() {
    if (!this.currentBracket) return null;
    const matches = this.currentBracket[this.currentRound];
    return matches.find(m => !m.winner) || null;
  }

  /**
   * 🆕 Garante que um player tem histórico (para newgens/Rising Stars)
   * @param {string|number} playerId - ID do jogador
   * @param {string} playerName - Nome do jogador
   * @returns {Object} Histórico do jogador (existente ou recém-criado)
   */
  ensurePlayerHistory(playerId, playerName) {
    // Verificar se já existe
    if (this.playerHistories.has(playerId)) {
      return this.playerHistories.get(playerId);
    }
    
    // Criar novo histórico (para newgens)
    console.log(`🆕 Criando histórico para ${playerName} (ID: ${playerId})`);
    const newHistory = {
      playerId: playerId,
      playerName: playerName,
      totalMatches: 0,
      wins: 0,
      losses: 0,
      roundWins: 0,
      roundLosses: 0,
      winsBySpin: 0,
      winsByBurst: 0,
      winsByRingOut: 0,
      lossesBySpin: 0,
      lossesByBurst: 0,
      lossesByRingOut: 0,
      titles: { 
        kingsCourtTitles: 0, premierTitles: 0, mastersTitles: 0,
        challengerTitles: 0, redemptionTitles: 0,
        risingStarTitles: 0, risingFinalsTitles: 0,
        total: 0, detailedList: []
      },
      winStreak: 0, bestWinStreak: 0, lossStreak: 0, bestLossStreak: 0,
      monthsAtTop: 0,
      currentTopStreak: 0,
      longestTopStreak: 0,
      statsByArena: new Map(),
      tournamentHistory: [],
      eventHistory: [],
      attrHistory: []   // [{year, avg, tier}]
    };
    
    this.playerHistories.set(playerId, newHistory);
    return newHistory;
  }

  recordMatchWinner(matchId, winnerId, matchDetails = {}) {
    const match = this.currentBracket[this.currentRound].find(m => m.matchId === matchId);
    if (!match) return false;
    
    // 🔧 CORREÇÃO: Usar comparação sem _pos
    const winner = idsMatch(match.player1.id, winnerId) ? match.player1 : match.player2;
    const loser = idsMatch(match.player1.id, winnerId) ? match.player2 : match.player1;
    
    // 🔍 DEBUG LOGGING
    console.log('📝 RECORD MATCH WINNER:');
    console.log('  Match ID:', matchId);
    console.log('  Winner ID:', winnerId);
    console.log('  Player1:', match.player1.name, 'ID:', match.player1.id);
    console.log('  Player2:', match.player2.name, 'ID:', match.player2.id);
    console.log('  Determined Winner:', winner.name);
    console.log('  Determined Loser:', loser.name);
    
    match.winner = winner;
    
    // 🔧 FIX: Salvar o score no match para exibição no bracket
    if (matchDetails.score) {
      match.score = matchDetails.score; // { playerA: X, playerB: Y }
    }
    
    const tournament = this.getCurrentTournament();
    const arena = this.getTournamentArena(tournament) === 'ALL' ? 'BB-10 Competitive' : this.getTournamentArena(tournament);
    
    // 🆕 CRITICAL FIX: Garantir que playerHistory existe (para newgens/Rising Stars)
    const winnerHistory = this.ensurePlayerHistory(winner.id, winner.name);
    const loserHistory = this.ensurePlayerHistory(loser.id, loser.name);
    
    // ===== CONTABILIZAÇÃO DE PARTIDAS (MD3/MD5 completas) =====
    winnerHistory.totalMatches++;
    winnerHistory.wins++;
    loserHistory.totalMatches++;
    loserHistory.losses++;

    // ===== STREAKS DE VITÓRIA/DERROTA =====
    winnerHistory.winStreak  = (winnerHistory.winStreak  || 0) + 1;
    winnerHistory.lossStreak = 0;
    if (winnerHistory.winStreak > (winnerHistory.bestWinStreak || 0))
      winnerHistory.bestWinStreak = winnerHistory.winStreak;
    loserHistory.lossStreak  = (loserHistory.lossStreak  || 0) + 1;
    loserHistory.winStreak   = 0;
    if (loserHistory.lossStreak > (loserHistory.bestLossStreak || 0))
      loserHistory.bestLossStreak = loserHistory.lossStreak;
    
    // ===== CONTABILIZAÇÃO DE ROUNDS INDIVIDUAIS =====
    if (matchDetails.score) {
      // matchDetails.score contém { playerA: X, playerB: Y }
      // Precisamos identificar quem é playerA e playerB
      const winnerIsPlayerA = idsMatch(match.player1.id, winner.id);
      
      const winnerRounds = winnerIsPlayerA ? matchDetails.score.playerA : matchDetails.score.playerB;
      const loserRounds = winnerIsPlayerA ? matchDetails.score.playerB : matchDetails.score.playerA;
      
      // Adicionar as vitórias/derrotas de rounds
      winnerHistory.roundWins = (winnerHistory.roundWins || 0) + winnerRounds;
      winnerHistory.roundLosses = (winnerHistory.roundLosses || 0) + loserRounds;
      loserHistory.roundWins = (loserHistory.roundWins || 0) + loserRounds;
      loserHistory.roundLosses = (loserHistory.roundLosses || 0) + winnerRounds;
      
      // Contabilizar vitórias/derrotas por tipo de finish
      if (matchDetails.rounds && Array.isArray(matchDetails.rounds)) {
        matchDetails.rounds.forEach(round => {
          const roundWinnerId = round.winner;
          const roundMethod = round.method;
          
          // 🔧 CORREÇÃO: Usar comparação sem _pos
          const roundWinnerHistory = idsMatch(roundWinnerId, winner.id) ? winnerHistory : loserHistory;
          const roundLoserHistory = idsMatch(roundWinnerId, winner.id) ? loserHistory : winnerHistory;
          
          // Contabilizar por tipo de finish
          if (roundMethod === 'SPIN_FINISH') {
            roundWinnerHistory.winsBySpin = (roundWinnerHistory.winsBySpin || 0) + 1;
            roundLoserHistory.lossesBySpin = (roundLoserHistory.lossesBySpin || 0) + 1;
          } else if (roundMethod === 'BURST_FINISH') {
            roundWinnerHistory.winsByBurst = (roundWinnerHistory.winsByBurst || 0) + 1;
            roundLoserHistory.lossesByBurst = (roundLoserHistory.lossesByBurst || 0) + 1;
          } else if (roundMethod === 'RING_OUT_FINISH' || roundMethod === 'KO_FINISH') {
            roundWinnerHistory.winsByRingOut = (roundWinnerHistory.winsByRingOut || 0) + 1;
            roundLoserHistory.lossesByRingOut = (roundLoserHistory.lossesByRingOut || 0) + 1;
          }
        });
      }
    }
    
    // ===== ⚔️ SIGNATURE BLADE STATS (round-by-round) =====
    if (matchDetails.rounds && Array.isArray(matchDetails.rounds)) {
      const winnerSigData = this.signatureBlades.get(winner.id);
      const loserSigData  = this.signatureBlades.get(loser.id);
      const bothHaveSig   = !!(winnerSigData && loserSigData);
      const tournamentName = tournament?.name || '';

      // Determinar qual jogador é player1 (bey1) vs player2 (bey2) no round
      // Necessário para saber qual bey pertence a quem
      const winnerIsPlayer1 = idsMatch(match.player1.id, winner.id);

      // ── Backward compatibility: ensure new fields exist on old saves ──
      [winnerSigData, loserSigData].forEach(sd => {
        if (!sd) return;
        const s = sd.stats;
        if (s.lossStreak              === undefined) s.lossStreak              = 0;
        if (s.bestLossStreak          === undefined) s.bestLossStreak          = 0;
        if (s.winsAgainstSignatures   === undefined) s.winsAgainstSignatures   = 0;
        if (s.lossesAgainstSignatures === undefined) s.lossesAgainstSignatures = 0;
        if (s.vsCommonsWinStreak      === undefined) s.vsCommonsWinStreak      = 0;
        if (s.vsCommonsBestWinStreak  === undefined) s.vsCommonsBestWinStreak  = 0;
        if (s.vsCommonsLossStreak     === undefined) s.vsCommonsLossStreak     = 0;
        if (s.vsCommonsBestLossStreak === undefined) s.vsCommonsBestLossStreak = 0;
        if (s.vsSignaturesWinStreak      === undefined) s.vsSignaturesWinStreak      = 0;
        if (s.vsSignaturesBestWinStreak  === undefined) s.vsSignaturesBestWinStreak  = 0;
        if (s.vsSignaturesLossStreak     === undefined) s.vsSignaturesLossStreak     = 0;
        if (s.vsSignaturesBestLossStreak === undefined) s.vsSignaturesBestLossStreak = 0;
      });

      matchDetails.rounds.forEach(round => {
        if (!round || round.winner === 'DRAW') return;
        const roundWonByWinner = idsMatch(round.winner, winner.id);
        const roundResult = { method: round.method || 'SPIN_FINISH' };

        // bey1 = beyblade de player1 (team1), bey2 = de player2 (team2)
        // Identificar qual beyblade cada jogador usou NESTE round específico
        const winnerBeyUsed = winnerIsPlayer1 ? round.bey1 : round.bey2;
        const loserBeyUsed  = winnerIsPlayer1 ? round.bey2 : round.bey1;

        // ✅ Só contabilizar se o jogador realmente usou o Signature neste round
        if (winnerSigData && winnerBeyUsed?.isSignature) {
          updateSignatureBladeStats(winnerSigData, roundResult, roundWonByWinner, tournamentName);
          const oppUsedSig = !!loserBeyUsed?.isSignature;
          // winsAgainstSignatures: só conta se o oponente também usou o dele
          if (bothHaveSig && oppUsedSig) {
            if (roundWonByWinner) winnerSigData.stats.winsAgainstSignatures  = (winnerSigData.stats.winsAgainstSignatures  || 0) + 1;
            else                  winnerSigData.stats.lossesAgainstSignatures = (winnerSigData.stats.lossesAgainstSignatures || 0) + 1;
          }
          // Streaks por contexto
          updateContextStreaks(winnerSigData.stats, roundWonByWinner, oppUsedSig);
        }

        if (loserSigData && loserBeyUsed?.isSignature) {
          updateSignatureBladeStats(loserSigData, roundResult, !roundWonByWinner, tournamentName);
          const oppUsedSig = !!winnerBeyUsed?.isSignature;
          // winsAgainstSignatures: só conta se o oponente também usou o dele
          if (bothHaveSig && oppUsedSig) {
            if (!roundWonByWinner) loserSigData.stats.winsAgainstSignatures  = (loserSigData.stats.winsAgainstSignatures  || 0) + 1;
            else                   loserSigData.stats.lossesAgainstSignatures = (loserSigData.stats.lossesAgainstSignatures || 0) + 1;
          }
          // Streaks por contexto
          updateContextStreaks(loserSigData.stats, !roundWonByWinner, oppUsedSig);
        }
      });
    }
    // ===== FIM SIGNATURE BLADE STATS =====
    if (!(winnerHistory.statsByArena instanceof Map)) {
      console.warn(`⚠️ [FIX] Convertendo statsByArena para Map (jogador: ${winner.name})`);
      winnerHistory.statsByArena = new Map(
        Array.isArray(winnerHistory.statsByArena) 
          ? winnerHistory.statsByArena 
          : Object.entries(winnerHistory.statsByArena || {})
      );
    }
    
    if (!(loserHistory.statsByArena instanceof Map)) {
      console.warn(`⚠️ [FIX] Convertendo statsByArena para Map (jogador: ${loser.name})`);
      loserHistory.statsByArena = new Map(
        Array.isArray(loserHistory.statsByArena)
          ? loserHistory.statsByArena
          : Object.entries(loserHistory.statsByArena || {})
      );
    }
    // ===== 🔧 FIM DA CORREÇÃO =====
    
    // ===== CONTABILIZAÇÃO POR ARENA =====
    if (!winnerHistory.statsByArena.has(arena)) {
      winnerHistory.statsByArena.set(arena, { 
        wins: 0, 
        losses: 0,
        roundWins: 0,
        roundLosses: 0
      });
    }
    if (!loserHistory.statsByArena.has(arena)) {
      loserHistory.statsByArena.set(arena, { 
        wins: 0, 
        losses: 0,
        roundWins: 0,
        roundLosses: 0
      });
    }
    
    const winnerArenaStats = winnerHistory.statsByArena.get(arena);
    const loserArenaStats = loserHistory.statsByArena.get(arena);
    
    winnerArenaStats.wins++;
    loserArenaStats.losses++;
    
    // Adicionar rounds por arena também
    if (matchDetails.score) {
      const winnerIsPlayerA = match.player1.id === winner.id;
      const winnerRounds = winnerIsPlayerA ? matchDetails.score.playerA : matchDetails.score.playerB;
      const loserRounds = winnerIsPlayerA ? matchDetails.score.playerB : matchDetails.score.playerA;
      
      winnerArenaStats.roundWins = (winnerArenaStats.roundWins || 0) + winnerRounds;
      winnerArenaStats.roundLosses = (winnerArenaStats.roundLosses || 0) + loserRounds;
      loserArenaStats.roundWins = (loserArenaStats.roundWins || 0) + loserRounds;
      loserArenaStats.roundLosses = (loserArenaStats.roundLosses || 0) + winnerRounds;
    }
    
    // Logar match
    this.logMatch({
      matchId,
      playerAId: match.player1.id,
      playerBId: match.player2.id,
      winnerId: winner.id,
      // 🔧 FIX: Passar objetos completos para evitar busca em TEAMS (newgens)
      playerAObj: match.player1,
      playerBObj: match.player2,
      winnerObj: winner,
      loserObj: loser,
      arena,
      round: this.currentRound,
      ...matchDetails
    });
    
    // ===== FASE 3: INTEGRAÇÃO COM ANALYTICS E CAREER =====
    // Adicionar match ao histórico para analytics
    const matchRecord = {
      // 🔧 FIX: Usar objetos do match ao invés de TEAMS (para newgens)
      player1: match.player1.name,
      player2: match.player2.name,
      winner: winner.name,
      // IDs explícitos para H2H lookup — NÃO remover
      player1Id: match.player1.id,
      player2Id: match.player2.id,
      winnerId: winner.id,
      arena: arena,
      round: this.currentRound,
      tier: tournament.type,
      tournament: tournament.name,
      season: this.season,
      p1Combo: matchDetails.p1Combo,
      p2Combo: matchDetails.p2Combo,
      rounds: matchDetails.rounds,
      score: matchDetails.score,
      duration: matchDetails.duration || 0,
      timestamp: Date.now()
    };
    this.matchHistory.push(matchRecord);

    // ⚡ Atualizar H2H index para O(1) lookup em buildMatchContext
    const _h2hKey = `${matchRecord.player1Id}|${matchRecord.player2Id}`;
    const _h2hKeyRev = `${matchRecord.player2Id}|${matchRecord.player1Id}`;
    this._h2hLastResult.set(_h2hKey, matchRecord.winnerId);
    this._h2hLastResult.set(_h2hKeyRev, matchRecord.winnerId);
    
    // ⚡ Atualizar tourneyWins cache
    const _tWinner = matchRecord.winnerId;
    this._tourneyWinsCache.set(_tWinner, (this._tourneyWinsCache.get(_tWinner) || 0) + 1);
    
    // ⚔️ Alimentar sistema de rivalidades (skip em turbo — atualiza depois)
    if (!this._turboMode && this.rivalrySystem) {
      this.rivalrySystem.updateFromMatch(matchRecord, this);
    }
    
    // Processar match no sistema de carreira (skip em turbo)
    if (!this._turboMode) this.careerSystem.processMatch(matchRecord);
    
    // ===== 📊 REGISTRAR MATCH NO ANALYTICS MANAGER =====
    // ⚡ Turbo mode: pula analytics pesado (recordRound por round + getBBPRanking para upset)
    if (!this._turboMode && this.analyticsManager && matchDetails.rounds) {
      // Obter rankings para detectar upsets
      const rankings = this.getBBPRanking();
      const playerARank = rankings.findIndex(r => r.playerId === match.player1.id) + 1;
      const playerBRank = rankings.findIndex(r => r.playerId === match.player2.id) + 1;
      
      // Calcular score
      const playerAScore = matchDetails.score?.playerA || 0;
      const playerBScore = matchDetails.score?.playerB || 0;
      
      // Detectar upset (diferença de 15+ posições no ranking)
      const rankDiff = Math.abs(playerARank - playerBRank);
      const isUpset = rankDiff >= 15 && (
        (winnerId === match.player1.id && playerARank > playerBRank) ||
        (winnerId === match.player2.id && playerBRank > playerARank)
      );
      
      // 🔧 FIX: Usar objetos do match ao invés de TEAMS (para newgens/Rising Stars)
      // match.player1 e match.player2 já são objetos completos com name, mentality, etc.
      const playerA = match.player1;
      const playerB = match.player2;
      
      // Registrar match
      this.analyticsManager.recordMatch({
        playerA: {
          id: match.player1.id,
          name: playerA.name,
          mentality: playerA.mentality
        },
        playerB: {
          id: match.player2.id,
          name: playerB.name,
          mentality: playerB.mentality
        },
        winnerId: winner.id,
        score: {
          playerA: playerAScore,
          playerB: playerBScore
        },
        rounds: matchDetails.rounds,
        arena,
        isUpset,
        upsetMargin: isUpset ? rankDiff : 0,
        playerARank,
        playerBRank,
        duration: matchDetails.rounds.length
      });
      
      // Registrar cada round individual
      matchDetails.rounds.forEach((round, idx) => {
        if (round && round.winner !== 'DRAW') {
          // ===== 📊 USAR BEYBLADES ESPECÍFICOS DO ROUND =====
          // Cada round pode ter beyblades diferentes (MD3/MD5 permite troca)
          const playerABey = round.bey1 || {};  // Beyblade real usado pelo jogador 1 neste round
          const playerBBey = round.bey2 || {};  // Beyblade real usado pelo jogador 2 neste round
          
          this.analyticsManager.recordRound({
            playerAId: match.player1.id,
            playerBId: match.player2.id,
            winnerId: round.winner,
            playerAType: playerABey.type || 'Balance',
            playerBType: playerBBey.type || 'Balance',
            arena,
            finishMethod: round.method === 'BURST_FINISH' ? 'burst' :
                         round.method === 'RING_OUT_FINISH' || round.method === 'KO_FINISH' ? 'ko' :
                         round.method === 'OVER_FINISH' ? 'over' : 'spin',
            
            // Componentes
            playerALayer: playerABey.layer?.name || 'Unknown',
            playerADisc: playerABey.disc?.name || 'Unknown', 
            playerADriver: playerABey.driver?.name || 'Unknown',
            playerBLayer: playerBBey.layer?.name || 'Unknown',
            playerBDisc: playerBBey.disc?.name || 'Unknown',
            playerBDriver: playerBBey.driver?.name || 'Unknown',
            
            // Launch Techniques
            playerALaunchTechnique: round.launch1 || 'STANDARD',
            playerBLaunchTechnique: round.launch2 || 'STANDARD',
            
            // Traits (se disponíveis)
            traits: round.traits || []
          });
        }
      });
    }
    
    // Limpar cache do analytics (skip em turbo mode)
    if (!this._turboMode) this.analytics.clearCache();

    // ── 🧬 TRAIT DNA: processar eventos de sombra e milestones (skip em turbo) ──
    if (!this._turboMode) {
      try {
        this._processMatchTraitEvents(match, matchDetails, winner, loser);
      } catch(e) {
        console.warn('⚠️ Trait events error:', e.message);
      }
    }
    
    return true;
  }

  // =====================================================
  // 🧬 TRAIT DNA SYSTEM — HELPERS DE INTEGRAÇÃO
  // =====================================================

  /**
   * Retorna o objeto mutável de trait data do jogador.
   * Newgens: referência real em TEAMS (não a cópia do bracket).
   * Jogadores estáticos: o objeto em PLAYER_TRAITS[name].
   */
  _getTraitObj(player) {
    if (!player) return null;
    if (player.traitDNA !== undefined) {
      // Resolver para o objeto real em TEAMS — o player pode ser cópia do bracket
      const realPlayer = TEAMS.find(p => p.id === player.id && p.traitDNA !== undefined);
      return realPlayer || player;
    }
    const staticData = PLAYER_TRAITS[player.name];
    return staticData || null;
  }

  /**
   * Registra um evento de sombra para um jogador.
   * Converte automaticamente NEG → COM se milestone atingido.
   */
  _registerShadowEvent(player, eventKey, amount = 1) {
    const traitObj = this._getTraitObj(player);
    if (!traitObj) return;
    const shadowProg = traitObj.shadowProgress || {};
    if (!(eventKey in shadowProg)) return; // Jogador não tem SOMBRA deste tipo

    const negTypes  = traitObj.negTypes || traitObj.traitNegTypes || {};
    const playerTraitData = {
      traits:         traitObj.traits || [],
      negTypes,
      shadowProgress: shadowProg,
      traitDNA:       traitObj.traitDNA ?? 50,
    };

    const result = registerShadowEvent(playerTraitData, eventKey, amount);
    if (!result.updated) return;

    traitObj.shadowProgress = result.playerTraitData.shadowProgress;
    if (result.converted) {
      traitObj.traits = result.playerTraitData.traits;
      // Sincronizar negTypes em ambos os campos possíveis
      traitObj.negTypes       = result.playerTraitData.negTypes;
      traitObj.traitNegTypes  = result.playerTraitData.negTypes;
      console.log(`✨ SOMBRA SUPERADA: ${player.name} — ${result.converted} virou COM`);
    }
  }

  /**
   * Tenta adicionar uma 2ª negativa por trauma (sempre CICATRIZ).
   */
  _checkTrauma(player, traumaType) {
    const traitObj = this._getTraitObj(player);
    if (!traitObj) return;
    const negTypes = traitObj.negTypes || traitObj.traitNegTypes || {};
    const playerTraitData = {
      traits:   traitObj.traits || [],
      negTypes,
      shadowProgress: traitObj.shadowProgress || {},
      traitDNA: traitObj.traitDNA ?? 50,
    };
    const { newTrait } = checkTraumaEvent(playerTraitData, traumaType);
    if (newTrait) {
      if (!traitObj.traits) traitObj.traits = [];
      traitObj.traits.push(newTrait);
      traitObj.negTypes      = { ...negTypes, [newTrait.id]: 'CICATRIZ' };
      traitObj.traitNegTypes = traitObj.negTypes;
      console.log(`💔 TRAUMA ${traumaType}: ${player.name} recebeu ${newTrait.id}`);
    }
  }

  /**
   * Concede um novo slot de trait positiva por marco de carreira.
   * milestoneKey deve ser camelCase: 'firstTitle' | 'comeback02' | 'rivalryFormed' | 'reachedPeak'
   * NÃO faz nada se o traitDNA do jogador não permite mais slots.
   */
  _grantTraitMilestone(player, milestoneKey) {
    const traitObj = this._getTraitObj(player);
    if (!traitObj) return;

    // Garantir estrutura de milestones
    if (!traitObj.traitMilestones) traitObj.traitMilestones = {};
    if (traitObj.traitMilestones[milestoneKey]) return; // já concedido

    traitObj.traitMilestones[milestoneKey] = true;

    const traits   = traitObj.traits || [];
    const traitDNA = traitObj.traitDNA ?? 50;

    if (!canReceivePositiveTrait(traits, traitDNA)) {
      console.log(`🧬 MILESTONE [${milestoneKey}]: ${player.name} — DNA não permite mais slots`);
      return;
    }

    // Mapear camelCase → pool de CAREER_MILESTONES
    const poolMap = {
      firstTitle:    'ALL',
      comeback02:    'ADVERSIDADE',
      rivalryFormed: 'RIVALIDADE',
      reachedPeak:   'ALL',
    };
    const poolKey  = poolMap[milestoneKey] || 'ALL';
    const poolArr  = MILESTONE_POOLS[poolKey] || MILESTONE_POOLS.ALL;
    const existing = new Set(traits.map(t => t.id));
    const available = poolArr.filter(id => !existing.has(id) && TRAITS[id]?.tiers?.COM);

    if (available.length === 0) {
      console.log(`🧬 MILESTONE [${milestoneKey}]: ${player.name} — sem traits disponíveis no pool`);
      return;
    }

    const newId = available[Math.floor(Math.random() * available.length)];
    const profile = getTraitDNAProfile(traitDNA);

    // Tier baseado no DNA
    let tier = 'COM';
    if (profile.maxTier === 'LEN' && Math.random() < 0.12) tier = 'LEN';
    else if (profile.maxTier !== 'COM' && Math.random() < 0.22) tier = 'RAR';

    traitObj.traits = [...traits, { id: newId, tier }];
    console.log(`🌟 TRAIT MILESTONE [${milestoneKey}]: ${player.name} desbloqueou ${newId} (${tier})`);
  }

  /**
   * Processa eventos de trait após cada partida.
   * Chamado no final de recordMatchWinner().
   */
  _processMatchTraitEvents(match, matchDetails, winner, loser) {
    if (!matchDetails.rounds || matchDetails.rounds.length === 0) return;

    const rounds    = matchDetails.rounds;
    const winnerIsP1 = match.player1.id === winner.id;
    const winnerKey  = winnerIsP1 ? 'team1' : 'team2';
    const loserKey   = winnerIsP1 ? 'team2' : 'team1';

    const winnerScore = winnerIsP1
      ? (matchDetails.score?.playerA ?? 0)
      : (matchDetails.score?.playerB ?? 0);
    const loserScore  = winnerIsP1
      ? (matchDetails.score?.playerB ?? 0)
      : (matchDetails.score?.playerA ?? 0);

    // Detectar winsNeeded pelo formato
    const winsNeeded = winnerScore >= 3 ? 3 : 2; // MD5 se campeão fez ≥3

    // ── 1. Fechador: vencedor fechou o match ──────────────────
    this._registerShadowEvent(winner, 'closedMatchPoints');

    // ── 2. Sangue Frio: sobreviveu a match point adversário ───
    //   = adversário teve winsNeeded-1 vitórias em algum momento
    let wWins = 0, lWins = 0;
    let loserWasAtMatchPt = false;
    let wasWinnerDown02   = false;

    for (const r of rounds) {
      if (r.winner === winnerKey) wWins++;
      else if (r.winner === loserKey) {
        lWins++;
        if (lWins === winsNeeded - 1 && wWins < winsNeeded - 1) loserWasAtMatchPt = true;
        if (lWins === 2 && wWins === 0) wasWinnerDown02 = true;
      }
    }

    if (loserWasAtMatchPt) {
      this._registerShadowEvent(winner, 'survivedMatchPoints');
    }

    // ── 3. Viradista: virou de 0-2 ───────────────────────────
    if (wasWinnerDown02) {
      this._registerShadowEvent(winner, 'comeback02Wins');
      // Marco de carreira
      this._grantTraitMilestone(winner, 'comeback02');
    }

    // ── 4. Instinto: venceu final ─────────────────────────────
    const isFinal = this.currentRound === 'F';
    const isSF    = this.currentRound === 'SF';
    const isBig   = isFinal || isSF;

    if (isFinal) {
      this._registerShadowEvent(winner, 'wonFinals');
    }
    if (isBig) {
      this._registerShadowEvent(winner, 'wonBigMatches');
      this._registerShadowEvent(winner, 'wonKOMatches');
      this._registerShadowEvent(winner, 'wonSameOpponent'); // pode ser revanche
    }

    // ── 5. Mentalidade de Set: venceu o round final da série ──
    const lastRound = rounds[rounds.length - 1];
    if (lastRound && lastRound.winner === winnerKey) {
      this._registerShadowEvent(winner, 'wonFinalRounds');
    }

    // ── 6. Implacável / Destruidor: vitórias por burst ────────
    const burstWins = rounds.filter(r => r.winner === winnerKey && r.method === 'Burst Finish').length;
    if (burstWins > 0) {
      this._registerShadowEvent(winner, 'burstWins', burstWins);
      this._registerShadowEvent(winner, 'consecutiveBurstWins', burstWins);
    }

    // Rounds ganhos por Spin Finish (eterno giro)
    const spinWins = rounds.filter(r => r.winner === winnerKey && r.method === 'Spin Finish').length;
    if (spinWins > 0) {
      this._registerShadowEvent(winner, 'wonBySpinout', spinWins);
    }

    // ── 7. Inquebrável: venceu imediatamente após derrota ─────
    //   (verificamos historial se perdeu última partida)
    const loserHist = this.playerHistories?.get(loser.id);
    if (loserHist?.lastMatchResult === 'loss') {
      this._registerShadowEvent(winner, 'wonAfterLoss');
    }
    // Registrar resultado para próxima partida
    const winnerHist = this.playerHistories?.get(winner.id);
    if (winnerHist) winnerHist.lastMatchResult = 'win';
    if (loserHist)  loserHist.lastMatchResult  = 'loss';

    // ── 8. Trauma: 3ª derrota de final consecutiva ───────────
    if (isFinal) {
      const lHist = this.playerHistories?.get(loser.id);
      if (lHist) {
        lHist.consecutiveFinalLosses = (lHist.consecutiveFinalLosses || 0) + 1;
        if (lHist.consecutiveFinalLosses >= 3) {
          this._checkTrauma(loser, 'FINALS_LOST_3X');
        }
      }
      // Vencedor zera sequência
      const wHist = this.playerHistories?.get(winner.id);
      if (wHist) wHist.consecutiveFinalLosses = 0;
    }
  }

  /**
   * Processa o marco de Primeiro Título para o campeão.
   * Chamado após history.titles.total ser incrementado.
   */
  _processTitleMilestone(champion) {
    const hist = this.playerHistories?.get(champion.id);
    const totalTitles = hist?.titles?.total || 0;
    if (totalTitles === 1) {
      this._grantTraitMilestone(champion, 'firstTitle');
    }
  }

  /**
   * Processa o marco de Rivalidade para ambos os jogadores.
   * Chamado quando RivalrySystem forma uma rivalidade.
   */
  _processRivalryMilestone(player1Id, player2Id) {
    const p1 = (this.TEAMS || []).find((_, i) => i === player1Id) ||
               (this.TEAMS || []).find(p => p.id === player1Id);
    const p2 = (this.TEAMS || []).find((_, i) => i === player2Id) ||
               (this.TEAMS || []).find(p => p.id === player2Id);
    if (p1) this._grantTraitMilestone(p1, 'rivalryFormed');
    if (p2) this._grantTraitMilestone(p2, 'rivalryFormed');
  }

  /**
   * Processa o marco de Pico de Potencial (REACHED_PEAK).
   * Chamado quando jogador não tem mais pointsRemaining.
   */
  _processPeakMilestone(player) {
    const traitObj = this._getTraitObj(player);
    if (!traitObj) return;
    if (traitObj.traitMilestones?.reachedPeak) return;
    if ((player.potential?.pointsRemaining || 1) <= 0) {
      this._grantTraitMilestone(player, 'reachedPeak');
    }
  }

  /**
   * 🏛️ Confirma a transição de era — chamado quando o jogador nomeia a nova era.
   * @param {string} newEraName - Nome escolhido para a nova era
   */
  confirmEraTransition(newEraName) {
    if (!this.pendingEraTransition || !this.eraSystem) return;
    const newStartYear = this.currentYear;
    // ── Gerar epitáfio da era que encerrou ──
    try {
      if (this.chronicleEngine && this.pendingEraTransition.closingEra) {
        const closing = this.pendingEraTransition.closingEra;
        this.chronicleEngine.addEraEpitaph(closing.id || closing.name, {
          ...closing,
          endYear: newStartYear - 1,
        });
      }
    } catch(e) {}
    this.eraSystem.confirmTransition(this.pendingEraTransition, newEraName, newStartYear);
    console.log(`🏛️ Nova Era iniciada: "${newEraName}" (${newStartYear})`);
    // Notícia de transição
    try {
      if (this.newsEngine) {
        const transition = this.pendingEraTransition;
        this.newsEngine.addNewsToHistory([{
          id: `era_transition_${Date.now()}`,
          type: 'ERA_TRANSITION',
          category: 'era',
          priority: 10,
          timestamp: Date.now(),
          title: `FIM DE ERA: ${transition.closingEra.name}`,
          description: `${transition.closingEra.name} encerrou após ${transition.closingEra.seasons} temporadas. A nova era começa: "${newEraName}".`,
          icon: '🏛️',
          color: '#c9a84c',
        }]);
      }
    } catch(e) {}
    this.pendingEraTransition = null;
  }

  /**
   * 🏛️ Transição manual de era — jogador pode iniciar quando quiser.
   */
  manualEraTransition(newEraName) {
    if (!this.eraSystem) return;
    this.eraSystem.manualTransition(newEraName, this.currentYear);
    console.log(`🏛️ Era manual iniciada: "${newEraName}"`);
    this.pendingEraTransition = null;
  }

  /**
   * Seleciona arena para um match. GRAND_SLAM rotaciona entre todas as arenas.
   * Rounds mais avançados usam arenas progressivamente mais dramáticas.
   */
  _pickArena(round, matchIndex = 0) {
    const tournament = this.getCurrentTournament();
    if (!tournament) return 'BB10_COMPETITIVE';
    
    const nameMap = {
      'BB-10': 'BB10_COMPETITIVE',
      'BB-10 Competitive': 'BB10_COMPETITIVE',
      'BB10_COMPETITIVE': 'BB10_COMPETITIVE',
      'Prismatic Nexus': 'NEXUS', 'Prismatic Portal': 'NEXUS',
      'NEXUS': 'NEXUS',
      'Volcanic Rage': 'VOLCANIC_RAGE',
      'VOLCANIC_RAGE': 'VOLCANIC_RAGE',
      'Colosseum Carnage': 'COLOSSEUM_CARNAGE', 'Carnage Colosseum': 'COLOSSEUM_CARNAGE',
      'COLOSSEUM_CARNAGE': 'COLOSSEUM_CARNAGE',
      'Vortex Coliseum': 'VORTEX_COLISEUM', 'Vortex Colosseum': 'VORTEX_COLISEUM',
      'VORTEX_COLISEUM': 'VORTEX_COLISEUM',
      'Pinball Inferno': 'PINBALL_INFERNO',
      'PINBALL_INFERNO': 'PINBALL_INFERNO',
      'Pangea Platform': 'PANGEA_PLATFORM',
      'PANGEA_PLATFORM': 'PANGEA_PLATFORM',
      'Killer Sides': 'KILLER_SIDES', 'Killer Side': 'KILLER_SIDES',
      'KILLER_SIDES': 'KILLER_SIDES',
      'Storm Track': 'STORM_TRACK',
      'STORM_TRACK': 'STORM_TRACK',
      'Tidal Surge': 'TIDAL_SURGE', 'Tidal Clash': 'TIDAL_SURGE',
      'TIDAL_SURGE': 'TIDAL_SURGE',
      'Domination Zones': 'DOMINATION_ZONES', 'Domination Zone': 'DOMINATION_ZONES',
      'DOMINATION_ZONES': 'DOMINATION_ZONES',
    };
    
    const tArena = this.getTournamentArena(tournament);
    if (tArena !== 'ALL') {
      const code = this.getTournamentArenaCode(tournament);
      console.log(`🏟️ _pickArena: ${tournament.name} → ${tArena} → ${code}`);
      return code;
    }
    
    // Grand Slam: arenas por round (progressivamente mais intensas)
    const arenasByRound = {
      R64:  ['BB10_COMPETITIVE', 'NEXUS', 'PANGEA_PLATFORM', 'VORTEX_COLISEUM', 'KILLER_SIDES', 'VOLCANIC_RAGE', 'PINBALL_INFERNO', 'COLOSSEUM_CARNAGE'],
      R32:  ['NEXUS', 'PANGEA_PLATFORM', 'VORTEX_COLISEUM', 'KILLER_SIDES', 'VOLCANIC_RAGE', 'PINBALL_INFERNO', 'BB10_COMPETITIVE', 'COLOSSEUM_CARNAGE'],
      R16:  ['KILLER_SIDES', 'VOLCANIC_RAGE', 'PINBALL_INFERNO', 'VORTEX_COLISEUM', 'COLOSSEUM_CARNAGE', 'PANGEA_PLATFORM'],
      QF:   ['VOLCANIC_RAGE', 'PINBALL_INFERNO', 'VORTEX_COLISEUM', 'COLOSSEUM_CARNAGE'],
      SF:   ['COLOSSEUM_CARNAGE', 'VORTEX_COLISEUM'],
      F:    ['COLOSSEUM_CARNAGE']
    };
    
    const pool = arenasByRound[round] || arenasByRound.R64;
    return pool[matchIndex % pool.length];
  }

  advanceRound() {
    // ===== ROUND ROBIN (Kings Court / Rising Finals) =====
    if (this.currentRound === 'ROUND_ROBIN') {
      return this.completeRoundRobin();
    }

    const roundMap = { 
      'R64': 'R32',
      'R32': 'R16', 
      'R16': 'QF', 
      'QF': 'SF', 
      'SF': 'F', 
      'F': 'COMPLETE' 
    };
    const nextRound = roundMap[this.currentRound];
    
    if (nextRound === 'COMPLETE') return this.completeTournament();
    
    const winners = this.currentBracket[this.currentRound].filter(m => m.winner).map(m => m.winner);
    const losers = this.currentBracket[this.currentRound].filter(m => m.winner).map(m => {
      // 🔧 CORREÇÃO: Comparar IDs sem _pos
      return idsMatch(m.winner.id, m.player1.id) ? m.player2 : m.player1;
    });
    
    if (winners.length !== this.currentBracket[this.currentRound].length) return false;
    
    const tournament = this.getCurrentTournament();
    const pointsConfig = this.getPointsConfigForTournament(tournament);
    const roundName = this.currentRound;
    
    // ===== 🔧 CORREÇÃO: Validação de configuração de pontos =====
    if (!pointsConfig) {
      console.error(`❌ [PONTOS] ERRO CRÍTICO: pointsConfig é null/undefined!`);
      console.error(`   Torneio: ${tournament.name}`);
      console.error(`   Tipo: ${tournament.type}`);
      console.error(`   Fase: ${roundName}`);
      return false;
    }
    
    // ===== 🏆 DISTRIBUIÇÃO DE PONTOS: APENAS PERDEDORES =====
    // ⚠️  IMPORTANTE: Winners NÃO recebem pontos ao avançar de fase!
    // Apenas o campeão recebe pontos (2000) na final através de completeTournament()
    // Perdedores recebem pontos baseados na fase em que foram eliminados
    // Isso corrige o bug onde o campeão recebia soma de todas as fases (3000+)
    
    /* CÓDIGO ANTIGO COMENTADO - CAUSAVA BUG DE PONTOS DUPLICADOS
    // Distribuir pontos para quem avançou de fase
    winners.forEach(winner => {
      let points = pointsConfig[roundName];
      
      // ===== 🔧 CORREÇÃO: Validação robusta de pontos =====
      if (points === undefined || points === null) {
        console.error(`❌ [PONTOS] Fase "${roundName}" não tem pontos configurados!`);
        console.error(`   Torneio: ${tournament.name} (${tournament.type})`);
        console.error(`   Fases disponíveis:`, Object.keys(pointsConfig));
        console.error(`   Jogador afetado: ${winner.name}`);
        
        // Tentar fallback baseado em aliases comuns
        const aliases = {
          'QUARTER_FINAL': 'QF',
          'SEMI_FINAL': 'SF',
          'FINAL': 'F',
          'ROUND_64': 'R64',
          'ROUND_32': 'R32',
          'ROUND_16': 'R16'
        };
        
        const aliasKey = aliases[roundName];
        if (aliasKey && pointsConfig[aliasKey]) {
          points = pointsConfig[aliasKey];
          console.warn(`   ⚠️  Usando alias: ${roundName} → ${aliasKey} (${points} pts)`);
        } else {
          // Último recurso: pontos baseados em estimativa de fase
          const emergencyPoints = {
            'R64': 10, 'R32': 20, 'R16': 40,
            'QF': 80, 'QUARTER_FINAL': 80,
            'SF': 160, 'SEMI_FINAL': 160,
            'F': 320, 'FINAL': 320
          };
          points = emergencyPoints[roundName] || 0;
          console.warn(`   ⚠️  Usando pontos de emergência: ${points}`);
        }
      }
      
      if (points && points > 0) {
        // Aplicar multiplicador se existir
        const originalPoints = points;
        points = this.applyPointsMultiplier(points, tournament);
        
        if (originalPoints !== points) {
          console.log(`🔢 [MULT] ${winner.name}: ${originalPoints} → ${points} pts (multiplicador aplicado)`);
        }
        
        this.addPoints(winner.id, points, `${tournament.name} - Avançou para ${roundMap[roundName]}`);
      } else {
        console.warn(`⚠️  [PONTOS] Nenhum ponto será dado a ${winner.name} (points = ${points})`);
      }
    });
    */
    
    console.log(`✅ Winners avançam para ${roundMap[roundName]} sem pontos (receberão apenas na final)`);
    
    // ===== 💰 DISTRIBUIÇÃO DE PONTOS: APENAS PERDEDORES =====
    
    // Dar pontos APENAS para os perdedores desta fase (eles chegaram até aqui)
    // E REGISTRAR NO HISTÓRICO DE TORNEIOS
    losers.forEach(loser => {
      let points = pointsConfig[roundName];
      
      // ===== 🔧 CORREÇÃO: Mesma validação para perdedores =====
      if (points === undefined || points === null) {
        // Tentar aliases
        const aliases = {
          'QUARTER_FINAL': 'QF',
          'SEMI_FINAL': 'SF',
          'FINAL': 'F',
          'ROUND_64': 'R64',
          'ROUND_32': 'R32',
          'ROUND_16': 'R16'
        };
        
        const aliasKey = aliases[roundName];
        if (aliasKey && pointsConfig[aliasKey]) {
          points = pointsConfig[aliasKey];
        } else {
          const emergencyPoints = {
            'R64': 10, 'R32': 20, 'R16': 40,
            'QF': 80, 'QUARTER_FINAL': 80,
            'SF': 160, 'SEMI_FINAL': 160,
            'F': 320, 'FINAL': 320
          };
          points = emergencyPoints[roundName] || 0;
        }
      }
      
      if (points && points > 0) {
        // Aplicar multiplicador se existir
        points = this.applyPointsMultiplier(points, tournament);
        this.addPoints(loser.id, points, `${tournament.name} - ${roundName}`);
      }
      
      // Registrar participação no torneio com a posição final
      const loserHistory = this.playerHistories.get(loser.id);
      if (loserHistory) {
        // Determinar posição baseado na fase de eliminação
        let position;
        if (roundName === 'FINAL') position = 2; // Vice-campeão
        else if (roundName === 'SEMI_FINAL') position = 4; // 3º-4º lugar
        else if (roundName === 'QUARTER_FINAL') position = 8; // 5º-8º lugar
        else if (roundName === 'R16') position = 16; // 9º-16º lugar
        else if (roundName === 'R32') position = 32; // 17º-32º lugar
        else if (roundName === 'R64') position = 64; // 33º-64º lugar
        else position = 128; // Primeira fase
        
        // Pegar pontos acumulados do torneio atual
        const totalPoints = this.currentTournamentPoints.get(loser.id) || 0;
        
        loserHistory.tournamentHistory.push({
          name: tournament.name,
          type: tournament.type,
          tier: tournament.tier,
          position: position,
          eliminatedRound: roundName, // ⭐ NOVO: Rodada de eliminação (ex: 'SF', 'QF', 'R16')
          points: totalPoints,
          year: this.currentYear,
          month: this.currentMonth
        });
      }
    });
    
    // ============================================================
    // 🎯 BRACKET PREVISÍVEL: AVANÇO POR POSIÇÃO (SEM SORTEIO)
    // ============================================================
    // O vencedor do match[i] e do match[i+1] se enfrentam na próxima rodada.
    // Isso garante que o bracket seja determinístico desde o início:
    // se Julio vence Leandro nas Oitavas e Robson vence Italo nas Oitavas
    // (e eles estavam no mesmo par de matches), eles se enfrentam nas Quartas.
    
    const currentMatches = this.currentBracket[this.currentRound];
    let nextBracket = [];
    
    // Verificar se há jogadores com BYE aguardando para entrar nesta próxima rodada
    const hasByes = this.currentBracket.BYES && this.currentBracket.BYES.length > 0;
    let shouldAddByes = false;
    
    if (hasByes) {
      if      (this.currentRound === 'R64' && nextRound === 'R32') shouldAddByes = true;
      else if (this.currentRound === 'R32' && nextRound === 'R16') shouldAddByes = true;
      else if (this.currentRound === 'R16' && nextRound === 'QF')  shouldAddByes = true;
    }
    
    if (shouldAddByes) {
      // ── Caso BYE: interleave seeds com vencedores por posição seeded ──
      // Cada seed (BYE) é colocado num slot pré-definido do próximo round.
      // O vencedor do R64/R32 no mesmo slot enfrenta esse seed.
      // Isso preserva o bracket: seed 1 e seed 2 só se encontram na final.
      const byeSeeds = this.currentBracket.BYES; // ordenados por rank (índice 0 = seed 1)
      const numMatches = byeSeeds.length;         // 16, 8 ou 4
      const seedPositions = this.generateByeSeedPositions(numMatches);
      // seedPositions: { seedIndex(0-based) → matchIdx no próximo round }
      
      const nextBracketByPos = new Array(numMatches).fill(null);
      
      byeSeeds.forEach((byePlayer, seedIdx) => {
        const matchIdx = seedPositions[seedIdx];
        const r64Winner = winners[matchIdx]; // vencedor do match nessa posição do bracket
        if (!byePlayer || !r64Winner) {
          console.error(`❌ BYE ou winner undefined: seedIdx=${seedIdx}, matchIdx=${matchIdx}`);
          return;
        }
        nextBracketByPos[matchIdx] = {
          player1: byePlayer,
          player2: r64Winner,
          winner: null,
          matchId: `${nextRound}-${matchIdx}`,
          arena: this._pickArena(nextRound, matchIdx)
        };
      });
      
      nextBracket = nextBracketByPos.filter(m => m !== null);
      delete this.currentBracket.BYES;
      console.log(`🎯 BYEs integrados ao ${nextRound} com seeding: ${nextBracket.length} partidas`);
      
    } else {
      // ── Caso padrão: pareamento por posição no bracket ──
      // Match[0].winner vs Match[1].winner → nextRound Match[0]
      // Match[2].winner vs Match[3].winner → nextRound Match[1]
      // etc.
      for (let i = 0; i < currentMatches.length; i += 2) {
        const w1 = currentMatches[i]?.winner;
        const w2 = currentMatches[i + 1]?.winner;
        
        if (!w1 || !w2) {
          console.error(`❌ ERRO: Winner undefined ao criar match ${i / 2} do ${nextRound}`);
          console.error(`   w1:`, w1, `  w2:`, w2);
          continue;
        }
        
        nextBracket.push({
          player1: w1,
          player2: w2,
          winner: null,
          matchId: `${nextRound}-${i / 2}`,
          arena: this._pickArena(nextRound, i / 2)
        });
      }
    }
    
    if (nextBracket.length === 0) {
      console.error(`❌ ERRO CRÍTICO: Nenhuma partida criada para ${nextRound}!`);
      return false;
    }
    
    this.currentBracket[nextRound] = nextBracket;
    this.currentRound = nextRound;
    return true;
  }

  /**
   * Alias para advanceRound() — chamado pelo ModernBracket após simular uma fase
   */
  advanceToNextPhase() {
    return this.advanceRound();
  }

  /**
   * Finaliza um torneio Round Robin (Kings Court / Rising Finals)
   * Calcula standings, distribui pontos BBP e registra campeão
   */
  completeRoundRobin() {
    const matches = this.currentBracket.ROUND_ROBIN;
    if (!matches || matches.some(m => !m.winner)) return null;

    const tournament = this.getCurrentTournament();
    const pointsConfig = this.getPointsConfigForTournament(tournament);

    // Calcular standings: wins, losses, pontos de round (para desempate)
    const standings = new Map();
    matches.forEach(m => {
      [m.player1, m.player2].forEach(p => {
        if (!standings.has(p.id)) standings.set(p.id, { player: p, wins: 0, losses: 0, roundsWon: 0 });
      });
      const winnerId = m.winner.id;
      const loserId = idsMatch(winnerId, m.player1.id) ? m.player2.id : m.player1.id;
      standings.get(winnerId).wins++;
      standings.get(loserId).losses++;
    });

    // Ordenar: mais vitórias primeiro, desempate por roundsWon
    const sorted = Array.from(standings.values()).sort((a, b) =>
      b.wins !== a.wins ? b.wins - a.wins : b.roundsWon - a.roundsWon
    );

    console.log('🏆 [ROUND ROBIN] Standings finais:');
    sorted.forEach((s, i) => console.log(`  ${i+1}. ${s.player.name}: ${s.wins}W-${s.losses}L`));

    // Distribuir pontos BBP por posição
    const positionKeys = ['first','second','third','fourth','fifth','sixth','seventh','eighth'];
    sorted.forEach((s, i) => {
      const key = positionKeys[i];
      const pts = pointsConfig[key] || 0;
      if (pts > 0) {
        this.addPoints(s.player.id, pts, `${tournament.name} - ${i+1}º lugar`);
        console.log(`💰 ${s.player.name}: +${pts} pts (${i+1}º)`);
      }

      // Registrar histórico
      const hist = this.playerHistories.get(s.player.id);
      if (hist) {
        hist.tournamentHistory.push({
          name: tournament.name,
          type: tournament.type || tournament.tier,
          tier: tournament.tier,
          position: i + 1,
          eliminatedRound: i === 0 ? 'CHAMPION' : `POS_${i+1}`,
          points: pts,
          year: this.currentYear,
          month: this.currentMonth
        });
      }
    });

    // Registrar Rising Star amateur points se aplicável
    if (tournament.tier === 'RISING_FINALS') {
      const rsStandings = sorted.map((s, i) => ({ playerId: s.player.id, position: i + 1 }));
      this.distributeAmateurPoints(tournament, rsStandings);
    }

    const champion = sorted[0].player;
    const runnerUp = sorted[1]?.player || sorted[0].player;

    // Atualizar títulos do campeão
    const hist = this.playerHistories.get(champion.id);
    if (hist) {
      hist.titles.total = (hist.titles.total || 0) + 1;
      hist.titles.special = (hist.titles.special || 0) + 1;
    }

    // Salvar no arquivo de torneios
    const tournamentKey = `${this.currentYear}-${this.currentMonth}-${this.currentTournamentIndex}`;
    this.tournamentArchive.set(tournamentKey, {
      year: this.currentYear,
      month: this.currentMonth,
      tournamentIndex: this.currentTournamentIndex,
      tournamentName: tournament.name,
      tournamentType: tournament.type || tournament.tier,
      tournamentTier: tournament.tier,
      tier: tournament.tier,
      completed: true,
      championName: champion.name,
      champion,
      runnerUp,
      standings: sorted.map((s, i) => ({ playerId: s.player.id, position: i+1, wins: s.wins })),
      format: 'ROUND_ROBIN',
      tournament
    });

    this.tournamentHistory.set(tournamentKey, { completed: true, champion: champion.id, championName: champion.name, date: Date.now() });

    // Limpar bracket e avançar
    this.currentBracket = null;
    this.currentRound = null;

    const advanceResult = this.advanceToNextTournamentInSequence();
    if (advanceResult === 'ADVANCE_MONTH') this.executeMonthAdvance();

    console.log(`✅ Round Robin finalizado! Campeão: ${champion.name}`);
    return { champion, runnerUp, standings: sorted, tournamentName: tournament.name };
  }

  completeTournament() {
    const finalMatch = this.currentBracket.F[0];
    if (!finalMatch || !finalMatch.winner) return null;
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🏆 FINALIZANDO TORNEIO');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  Match ID:', finalMatch.matchId);
    console.log('  Player 1:', finalMatch.player1.name, '(ID:', finalMatch.player1.id + ')');
    console.log('  Player 2:', finalMatch.player2.name, '(ID:', finalMatch.player2.id + ')');
    console.log('  Winner Object:', finalMatch.winner);
    console.log('  Winner ID:', finalMatch.winner.id);
    console.log('  Winner Nome:', finalMatch.winner.name);
    
    const champion = finalMatch.winner;
    // 🔧 CORREÇÃO: Comparar IDs sem _pos
    const runnerUp = idsMatch(finalMatch.winner.id, finalMatch.player1.id) ? finalMatch.player2 : finalMatch.player1;
    
    console.log('  ');
    console.log('  ⭐ RESULTADO FINAL:');
    console.log('  🥇 Campeão:', champion.name, '(ID:', champion.id + ')');
    console.log('  🥈 Vice:', runnerUp.name, '(ID:', runnerUp.id + ')');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const tournament = this.getCurrentTournament();
    const pointsConfig = this.getPointsConfigForTournament(tournament);
    
    console.log('🏆 Completando torneio:', tournament.name);
    console.log('  - Campeão:', champion.name);
    console.log('  - Vice:', runnerUp.name);
    console.log('  - Total de logs registrados:', this.currentTournamentLog.length);
    
    // ===== 🔧 CORREÇÃO: Validação de pontos do campeão =====
    let championPoints = pointsConfig.F_WINNER;
    
    if (!championPoints || championPoints === 0) {
      console.error(`❌ [PONTOS] F_WINNER não configurado para ${tournament.name}!`);
      console.error(`   Configuração:`, pointsConfig);
      
      // Fallback baseado no tier
      const tierFallback = {
        'GRAND_SLAM': 800,
        'MASTERS': 500,
        'CHALLENGERS': 250,
        'PROSPECTS': 100
      };
      championPoints = tierFallback[tournament.tier] || 100;
      console.warn(`   ⚠️  Usando fallback: ${championPoints} pts`);
    }
    
    championPoints = this.applyPointsMultiplier(championPoints, tournament);
    console.log(`🏆 [CAMPEÃO] ${champion.name}: ${championPoints} pts`);
    this.addPoints(champion.id, championPoints, `${tournament.name} - Campeão 🏆`);
    
    // ===== 🔧 CORREÇÃO: Validação de pontos do vice =====
    let runnerUpPoints = pointsConfig.F_LOSER;
    
    if (!runnerUpPoints || runnerUpPoints === 0) {
      console.error(`❌ [PONTOS] F_LOSER não configurado para ${tournament.name}!`);
      
      // Fallback baseado no tier
      const tierFallback = {
        'GRAND_SLAM': 500,
        'MASTERS': 300,
        'CHALLENGERS': 150,
        'PROSPECTS': 75
      };
      runnerUpPoints = tierFallback[tournament.tier] || 50;
      console.warn(`   ⚠️  Usando fallback: ${runnerUpPoints} pts`);
    }
    
    runnerUpPoints = this.applyPointsMultiplier(runnerUpPoints, tournament);
    console.log(`🥈 [VICE] ${runnerUp.name}: ${runnerUpPoints} pts`);
    this.addPoints(runnerUp.id, runnerUpPoints, `${tournament.name} - Vice-campeão`);
    
    // Registrar vice-campeão no histórico
    const runnerUpHistory = this.playerHistories.get(runnerUp.id);
    if (runnerUpHistory) {
      // Pegar pontos acumulados do torneio atual
      const totalPoints = this.currentTournamentPoints.get(runnerUp.id) || 0;
      
      runnerUpHistory.tournamentHistory.push({
        name: tournament.name,
        type: tournament.type,
        tier: tournament.tier,
        position: 2,
        eliminatedRound: 'F', // ⭐ NOVO: Final
        points: totalPoints,
        year: this.currentYear,
        month: this.currentMonth
      });
    }
    
    const history = this.playerHistories.get(champion.id);
    
    // ===== 🏆 SISTEMA COMPLETO DE TÍTULOS =====
    // Contar títulos pelo tier atual do torneio
    const _tier = tournament.tier || tournament.type || '';
    if (_tier === 'KINGS_COURT')        history.titles.kingsCourtTitles   = (history.titles.kingsCourtTitles   || 0) + 1;
    else if (_tier === 'PREMIER')       history.titles.premierTitles      = (history.titles.premierTitles      || 0) + 1;
    else if (_tier === 'SIGNATURE_CLASH') history.titles.signatureClashTitles = (history.titles.signatureClashTitles || 0) + 1;
    else if (_tier === 'INVITATIONAL')  history.titles.invitationalTitles = (history.titles.invitationalTitles || 0) + 1; // legado
    else if (_tier === 'MASTERS')       history.titles.mastersTitles      = (history.titles.mastersTitles      || 0) + 1;
    else if (_tier === 'CHALLENGER')    history.titles.challengerTitles   = (history.titles.challengerTitles   || 0) + 1;
    else if (_tier === 'OPEN')          history.titles.openTitles         = (history.titles.openTitles         || 0) + 1;
    else if (_tier === 'REDEMPTION')    history.titles.redemptionTitles   = (history.titles.redemptionTitles   || 0) + 1;
    else if (_tier === 'RISING_STAR')   history.titles.risingStarTitles   = (history.titles.risingStarTitles   || 0) + 1;
    else if (_tier === 'RISING_FINALS') history.titles.risingFinalsTitles = (history.titles.risingFinalsTitles || 0) + 1;
    history.titles.total++;

    // 🧬 TRAIT DNA: marco de primeiro título
    try { this._processTitleMilestone(champion); } catch(e) { /* noop */ }
    
    if (!history.titles.detailedList) {
      history.titles.detailedList = [];
    }
    
    history.titles.detailedList.push({
      tournamentName: tournament.name,
      tournamentType: tournament.type,
      tournamentTier: tournament.tier,
      year: this.currentYear,
      month: this.currentMonth,
      points: this.currentTournamentPoints.get(champion.id) || 0
    });
    
    // ===== FASE 3: ATUALIZAR CAREER SYSTEM =====
    this.careerSystem.updateTitleCount(champion.name);
    
    // Pegar pontos acumulados do torneio atual
    const totalPoints = this.currentTournamentPoints.get(champion.id) || 0;
    
    history.tournamentHistory.push({
      name: tournament.name,
      type: tournament.type,
      tier: tournament.tier,
      position: 1,
      eliminatedRound: 'CHAMPION', // ⭐ NOVO: Marca como campeão
      points: totalPoints,
      year: this.currentYear,
      month: this.currentMonth
    });
    
    // Salvar histórico completo do torneio
    const tournamentKey = `${this.currentYear}-${this.currentMonth}-${this.currentTournamentIndex}`;
    // Calcular winnerType para histórico da era
    const _sigBlade1 = this.signatureBlades.get(champion.id)?.blade;
    const _winnerTypeForArchive = _sigBlade1
      ? (_sigBlade1.type || this._inferBeyTypeFromCombo({ blade: _sigBlade1 }))
      : 'Balance';

    this.tournamentArchive.set(tournamentKey, {
      year: this.currentYear,
      month: this.currentMonth,
      tournamentIndex: this.currentTournamentIndex,
      tournamentName: tournament.name,
      tournamentType: tournament.type,
      tournamentTier: tournament.tier,
      tier: tournament.tier,                  // campo direto para EraSystem
      completed: true,                        // flag para repairEraStats
      winnerType: _winnerTypeForArchive,      // tipo para distribuição de meta
      championName: champion.name,            // nome para campeões de era
      champion: champion,
      runnerUp: runnerUp,
      bracket: JSON.parse(JSON.stringify(this.currentBracket)), // Deep copy
      tournament: tournament
    });
    
    console.log(`💾 Torneio salvo com chave: ${tournamentKey}`);
    console.log(`📦 Total de torneios no arquivo: ${this.tournamentArchive.size}`);
    
    // ===== 🎫 PROCESSAR QUALIFYING TOURNAMENT =====
    if (tournament.type === 'QUALIFYING') {
      console.log('🎫 Processando resultados do Qualifying Tournament...');
      
      // Pegar top 16 do bracket (semifinalistas onwards)
      const qualifiers = [];
      
      // Semifinalistas (4)
      if (this.currentBracket.SF) {
        this.currentBracket.SF.forEach(match => {
          if (match.player1 && !qualifiers.find(q => q === match.player1.id)) {
            qualifiers.push(match.player1.id);
          }
          if (match.player2 && !qualifiers.find(q => q === match.player2.id)) {
            qualifiers.push(match.player2.id);
          }
        });
      }
      
      // Quarterfinalists (8 mais)
      if (this.currentBracket.QF) {
        this.currentBracket.QF.forEach(match => {
          if (match.player1 && !qualifiers.find(q => q === match.player1.id)) {
            qualifiers.push(match.player1.id);
          }
          if (match.player2 && !qualifiers.find(q => q === match.player2.id)) {
            qualifiers.push(match.player2.id);
          }
        });
      }
      
      // R16 para completar 16 qualificados
      if (qualifiers.length < 16 && this.currentBracket.R16) {
        this.currentBracket.R16.forEach(match => {
          if (qualifiers.length >= 16) return;
          if (match.player1 && !qualifiers.find(q => q === match.player1.id)) {
            qualifiers.push(match.player1.id);
          }
          if (qualifiers.length >= 16) return;
          if (match.player2 && !qualifiers.find(q => q === match.player2.id)) {
            qualifiers.push(match.player2.id);
          }
        });
      }
      
      // Processar qualificados
      this.processQualifyingResults(qualifiers.slice(0, 16));
    }
    
    // ===== 👑 PROCESSAR GRAND FINALS =====
    if (tournament.type === 'GRAND_FINALS') {
      console.log('👑 Processando Grand Finals - Maior evento do ano!');
      
      // Determinar colocações
      // 1º: Champion
      // 2º: Runner-up
      // 3º-4º: Semifinalistas perdedores
      
      const placements = [
        { playerId: champion.id, placement: 1 },
        { playerId: runnerUp.id, placement: 2 }
      ];
      
      // Semifinalistas
      if (this.currentBracket.SF) {
        this.currentBracket.SF.forEach(match => {
          // 🔧 CORREÇÃO: Comparar IDs sem _pos
          const loser = idsMatch(match.winner.id, match.player1.id) ? match.player2 : match.player1;
          if (!placements.find(p => p.playerId === loser.id)) {
            placements.push({ playerId: loser.id, placement: 3 }); // 3º-4º lugar
          }
        });
      }
      
      // Quarterfinalists
      if (this.currentBracket.QF) {
        this.currentBracket.QF.forEach(match => {
          // 🔧 CORREÇÃO: Comparar IDs sem _pos
          const loser = idsMatch(match.winner.id, match.player1.id) ? match.player2 : match.player1;
          if (!placements.find(p => p.playerId === loser.id)) {
            placements.push({ playerId: loser.id, placement: 5 }); // 5º-8º lugar
          }
        });
      }
      
      // Award rewards
      placements.forEach(({ playerId, placement }) => {
        this.awardGrandFinalsRewards(placement, playerId);
      });
    }
    
    // ===== 🏅 VERIFICAR ACHIEVEMENTS =====
    // Verificar achievements do campeão e finalista
    this.checkPlayerAchievements(champion.id);
    this.checkPlayerAchievements(runnerUp.id);
    
    // ===== 🔒 MARCAR TORNEIO COMO COMPLETO E AVANÇAR =====
    const currentKey = `${this.currentYear}-${this.currentMonth}-${this.currentTournamentIndex}`;
    this.tournamentHistory.set(currentKey, {
      completed: true,
      champion: champion.id,
      championName: champion.name,
      date: Date.now()
    });
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ TORNEIO FINALIZADO');
    console.log(`   Torneio completo: ${currentKey}`);
    console.log(`   Campeão: ${champion.name}`);
    console.log(`   nextTournamentKey antes: ${this.nextTournamentKey}`);
    
    // 🔒 CRÍTICO: Salvar dados do torneio completado ANTES de avançar
    const completedTournamentData = {
      champion,
      tournamentName: tournament.name,
      tournamentType: tournament.type,
      tournamentTier: tournament.tier,
      tournamentKey: currentKey, // ⭐ NOVO: Chave do torneio completado
      year: this.currentYear,
      month: this.currentMonth,
      index: this.currentTournamentIndex
    };
    
    // ===== 🌟 DISTRIBUIR PONTOS RISING STAR =====
    if (tournament.tier === 'RISING_STAR' || tournament.tier === 'RISING_FINALS') {
      console.log('🌟 Distribuindo pontos do ranking Rising Star...');
      const rsStandings = [];
      rsStandings.push({ playerId: champion.id, position: 1 });
      rsStandings.push({ playerId: runnerUp.id, position: 2 });
      if (this.currentBracket.SF) {
        this.currentBracket.SF.forEach(match => {
          const loser = idsMatch(match.winner?.id, match.player1?.id) ? match.player2 : match.player1;
          if (loser && !rsStandings.find(s => s.playerId === loser.id))
            rsStandings.push({ playerId: loser.id, position: rsStandings.length + 1 });
        });
      }
      if (this.currentBracket.QF) {
        this.currentBracket.QF.forEach(match => {
          const loser = idsMatch(match.winner?.id, match.player1?.id) ? match.player2 : match.player1;
          if (loser && !rsStandings.find(s => s.playerId === loser.id))
            rsStandings.push({ playerId: loser.id, position: rsStandings.length + 1 });
        });
      }
      if (this.currentBracket.R16) {
        this.currentBracket.R16.forEach(match => {
          const loser = idsMatch(match.winner?.id, match.player1?.id) ? match.player2 : match.player1;
          if (loser && !rsStandings.find(s => s.playerId === loser.id))
            rsStandings.push({ playerId: loser.id, position: rsStandings.length + 1 });
        });
      }
      this.distributeAmateurPoints(tournament, rsStandings);
      console.log(`✅ Pontos Rising Star distribuídos para ${rsStandings.length} jogadores`);
    }

    // ===== 🌐 OPEN: distribuir pontos amadores para Rising Stars participantes =====
    if (tournament.tier === 'OPEN' && tournament.includesRisingStars) {
      console.log('🌐 Open: distribuindo bônus amador para Rising Stars...');
      const openRSStandings = [];
      // Coletar todas as posições e filtrar somente Rising Stars
      const collectOpenLoser = (match) => {
        [match.player1, match.player2, match.winner].forEach(p => {
          if (p && p._isRisingStarInOpen && !openRSStandings.find(s => s.playerId === p.id)) {
            openRSStandings.push({ playerId: p.id, position: openRSStandings.length + 1 });
          }
        });
      };
      if (champion?._isRisingStarInOpen) openRSStandings.push({ playerId: champion.id, position: 1 });
      if (runnerUp?._isRisingStarInOpen) openRSStandings.push({ playerId: runnerUp.id, position: 2 });
      ['SF','QF','R16','R32'].forEach(round => {
        if (this.currentBracket?.[round]) this.currentBracket[round].forEach(collectOpenLoser);
      });

      if (openRSStandings.length > 0) {
        const amateurStructure = this.getPointsStructure(tournament.risingStarPointsStructure || 'OPEN_AMATEUR_BONUS');
        openRSStandings.forEach((s, idx) => {
          const pts = this.calculatePointsForPosition(idx, amateurStructure);
          if (pts > 0) this.addAmateurPoints(s.playerId, pts, tournament.name + ' [Open Bonus]');
        });
        console.log(`✅ Bônus amador distribuído para ${openRSStandings.length} Rising Stars no Open`);
      }

      // Rising Star que chega à final do Open recebe qualificação automática para Rising Finals
      if (runnerUp?._isRisingStarInOpen || champion?._isRisingStarInOpen) {
        console.log('🌟 Rising Star chegou à final do Open! Qualificação automática para Rising Finals.');
      }
    }

    // 🔧 LIMPAR BRACKET ATUAL - CRÍTICO para o próximo torneio
    this.currentBracket = null;
    this.currentRound = null;
    console.log(`   🧹 Bracket limpo - pronto para próximo torneio`);
    
    // 🏛️ ERA SYSTEM: Registrar torneio na era corrente
    try {
      if (this.eraSystem && tournament.tier !== 'RISING_STAR' && tournament.tier !== 'RISING_FINALS') {
        const _sigBlade2 = this.signatureBlades.get(champion.id)?.blade;
        const winnerType = _sigBlade2
          ? (_sigBlade2.type || this._inferBeyTypeFromCombo({ blade: _sigBlade2 }))
          : 'Balance';
        const year = this.currentYear;
        // Rastrear por temporada
        if (!this.seasonTournamentTypeStats[year]) {
          this.seasonTournamentTypeStats[year] = { Attack: 0, Defense: 0, Stamina: 0, Balance: 0 };
        }
        if (this.seasonTournamentTypeStats[year][winnerType] !== undefined) {
          this.seasonTournamentTypeStats[year][winnerType]++;
        }
        // Registrar na era
        this.eraSystem.recordTournamentForEra({
          tier: tournament.tier,
          winnerType,
          winnerName: champion.name,
          year,
        });
      }
    } catch(e) { console.warn('Era tracking error:', e); }
    
    // Avançar para o próximo torneio na sequência
    const advanceResult = this.advanceToNextTournamentInSequence();
    
    console.log(`   nextTournamentKey depois: ${this.nextTournamentKey}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    // Se avançou para próximo mês, executar lógica de avanço de mês
    if (advanceResult === 'ADVANCE_MONTH') {
      this.executeMonthAdvance();
    }
    
    // 📰 GERAR NOTÍCIAS DO TORNEIO
    if (this.newsEngine) {
      console.log('📰 Gerando notícias do torneio...');
      try {
        const tournamentNews = this.newsEngine.generateTournamentNews(
          tournament,
          champion,
          finalMatch
        );
        console.log(`   ✅ ${tournamentNews.length} notícias geradas!`);
        
        // Log das manchetes geradas (para debug)
        tournamentNews.slice(0, 3).forEach(news => {
          console.log(`   📰 ${news.title}`);
        });
      } catch (error) {
        console.error('❌ Erro ao gerar notícias:', error);
      }
    }
    
    // 📖 ATUALIZAR NARRATIVAS
    console.log('📖 Atualizando narrativas...');
    
    // ✅ OTIMIZAÇÃO: Adicionar torneio incrementalmente à temporada
    this.addTournamentToSeason(completedTournamentData);
    
    try {
      this.updateNarratives();
    } catch (error) {
      console.error('❌ Erro ao atualizar narrativas:', error);
    }
    
    // 🎯 PREPARAR PRÓXIMO BRACKET AUTOMATICAMENTE
    console.log('🎯 Preparando bracket do próximo torneio...');
    this.prepareNextTournamentBracket();
    
    return completedTournamentData;
  }

  /**
   * Infere o tipo de peão baseado no combo usado
   * @param {Object} combo - Objeto combo com blade, disc, driver
   * @returns {string} - 'Attack', 'Defense', 'Stamina', ou 'Balance'
   */
  _inferBeyTypeFromCombo(combo) {
    if (!combo || !combo.blade) return 'Balance';

    const blade = combo.blade;

    // ── Caso 1: blade é um OBJETO (createBeyFromStats) — usa .type diretamente ──
    if (typeof blade === 'object') {
      const t = blade.type;
      if (t === 'Attack' || t === 'Defense' || t === 'Stamina' || t === 'Balance') return t;

      // Fallback: inferir pelo nome/signatureName do objeto
      const nameRaw = (blade.signatureName || blade.name || '').toLowerCase();
      const driverRaw = (typeof blade.driver === 'string'
        ? blade.driver
        : blade.driver?.name || ''
      ).toLowerCase();

      if (nameRaw.includes('dragon') || nameRaw.includes('xcalibur') || nameRaw.includes('valkyrie') ||
          nameRaw.includes('achilles') || nameRaw.includes('ragnaruk') ||
          driverRaw.includes('xtreme') || driverRaw.includes('jolt') || driverRaw.includes('quick')) {
        return 'Attack';
      }
      if (nameRaw.includes('kerbeus') || nameRaw.includes('wyvern') || nameRaw.includes('yegdrion') ||
          nameRaw.includes('roktavor') || driverRaw.includes('orbit') || driverRaw.includes('defense')) {
        return 'Defense';
      }
      if (nameRaw.includes('spriggan') || nameRaw.includes('fafnir') || nameRaw.includes('phoenix') ||
          driverRaw.includes('atomic') || driverRaw.includes('bearing') || driverRaw.includes('eternal')) {
        return 'Stamina';
      }
      return 'Balance';
    }

    // ── Caso 2: blade é uma STRING (formato legado) ──
    if (typeof blade === 'string') {
      const bladeName = blade.toLowerCase();
      const driverName = (typeof combo.driver === 'string' ? combo.driver : '').toLowerCase();

      if (bladeName.includes('dragon') || bladeName.includes('xcalibur') || bladeName.includes('valkyrie') ||
          bladeName.includes('achilles') || bladeName.includes('ragnaruk') ||
          driverName.includes('xtreme') || driverName.includes('jolt') || driverName.includes('quick')) {
        return 'Attack';
      }
      if (bladeName.includes('kerbeus') || bladeName.includes('wyvern') || bladeName.includes('yegdrion') ||
          bladeName.includes('roktavor') || driverName.includes('orbit') || driverName.includes('defense')) {
        return 'Defense';
      }
      if (bladeName.includes('spriggan') || bladeName.includes('fafnir') || bladeName.includes('phoenix') ||
          driverName.includes('atomic') || driverName.includes('bearing') || driverName.includes('eternal')) {
        return 'Stamina';
      }
    }

    return 'Balance';
  }

  advanceToNextTournament() {
    const monthConfig = this.getCurrentMonthConfig();
    
    console.log(`🔄 advanceToNextTournament chamado`);
    console.log(`  - Mês atual: ${this.currentMonth}`);
    console.log(`  - Índice atual: ${this.currentTournamentIndex}`);
    console.log(`  - Total de torneios no mês: ${monthConfig.tournaments.length}`);
    
    // Verificar se há mais torneios no mês
    if (this.currentTournamentIndex < monthConfig.tournaments.length - 1) {
      this.currentTournamentIndex++;
      this.currentBracket = null;
      this.currentRound = monthConfig.tournaments[this.currentTournamentIndex].participants === 64 ? 'R64' :
                          monthConfig.tournaments[this.currentTournamentIndex].participants === 32 ? 'R32' : 'R16';
      
      console.log(`✅ Avançando para próximo torneio`);
      console.log(`  - Novo índice: ${this.currentTournamentIndex}`);
      console.log(`  - Próximo torneio: ${monthConfig.tournaments[this.currentTournamentIndex].name}`);
      
      return 'NEXT_TOURNAMENT';
    }
    
    // Não há mais torneios, avançar mês
    console.log(`📅 Todos os torneios do mês completados, avançando para próximo mês`);
    return 'ADVANCE_MONTH';
  }
  
  /**
   * Executa a lógica de avanço de mês quando todos os torneios foram completados
   * Esta função é chamada automaticamente pelo completeTournament quando necessário
   */
  executeMonthAdvance() {
    console.log('🔄 Executando lógica de avanço de mês...');
    
    // Recalcular BBP de todos os jogadores (pontos podem ter expirado)
    this.recalculateAllBBP();
    
    // ===== 📈 DESENVOLVIMENTO MENSAL DE TODOS OS JOGADORES =====
    // Inclui PROFESSIONAL e RISING_STAR (em TEAMS), exclui RETIRED
    console.log('📈 Aplicando desenvolvimento mensal...');
    TEAMS.forEach((player, playerId) => {
      if (player.status === 'RETIRED' || player.status === 'RETIRED_AMATEUR') return;
      // Desenvolvimento mensal (crescimento ou declínio)
      const devReport = applyMonthlyDevelopment(player, playerId, this.formManager);
      
      if (devReport && devReport.pointsGained > 0) {
        devReport.allocations.forEach(alloc => {
          console.log(`   📈 ${player.name}: ${alloc.stat} ${alloc.from} → ${alloc.to}`);
        });
        // 🧬 TRAIT DNA: marco de pico de potencial
        try { this._processPeakMilestone(player); } catch(e) { /* noop */ }
      }
      
      // Check breakthrough mensal
      const breakthrough = checkMonthlyBreakthrough(player, this.formManager);
      if (breakthrough) {
        console.log(`   🚀 ${player.name}: BREAKTHROUGH!`);
      }
      
      // Declínio mensal (se aplicável)
      const declineReport = applyMonthlyDecline(player);
      if (declineReport && declineReport.regression) {
        console.log(`   📉 ${player.name}: REGRESSÃO!`);
      }
      
      // Fix 3: Atualizar careerPeak se stats atuais são maiores que o pico histórico
      if (player.attributes) {
        const currentAvg = Object.values(player.attributes).reduce((a, b) => a + b, 0) / 9;
        if (!player.careerPeak || currentAvg > (player.careerPeak.avgStats || 0)) {
          player.careerPeak = {
            year: this.currentYear,
            avgStats: currentAvg,
            ranking: player.careerPeak?.ranking ?? 999,
            elo: player.elo || 1000
          };
        }
      }
    });
    
    // Nota: lógica de virada de ano movida para finalizeSeasonTransition()
    
    // Resetar snapshot para o próximo mês
    this.monthRankingSnapshot = null;
    
    // ===== 🏆 ATUALIZAR DIVISÕES APENAS NO FIM DE CADA ERA =====
    const eraEnded = this.updateDivisionsEndOfEra();
    if (eraEnded) {
      console.log('✅ Divisões atualizadas ao final da Era');
    }
    
    // ===== 📸 SALVAR SNAPSHOT MID-SEASON (Agosto) =====
    this.saveMidSeasonSnapshot();
    
    // ===== 🎟️ CONCEDER WILD CARDS (se aplicável) =====
    console.log('🎟️ Verificando Wild Cards...');
    this.awardWildCards();
    console.log('✅ Wild Cards processados');
    
    // ===== 🏅 FASE 4: CHECK ACHIEVEMENTS =====
    this.checkAllAchievements();
    
    // ===== 📖 ATUALIZAR NARRATIVAS (FIM DO MÊS) =====
    console.log('📖 Atualizando narrativas ao final do mês...');
    try {
      const narrativeUpdate = this.updateNarratives();
      if (narrativeUpdate && narrativeUpdate.dynamicEvents && narrativeUpdate.dynamicEvents.length > 0) {
        console.log(`   🎊 ${narrativeUpdate.dynamicEvents.length} eventos especiais disponíveis`);
      }
    } catch (error) {
      console.error('❌ Erro ao atualizar narrativas:', error);
    }
    
    // ===== 🌅 LOG DA ERA ATUAL =====
    const currentEra = this.getCurrentEra();
    if (currentEra) {
      console.log(`📅 ${currentEra.name} - ${currentEra.theme}`);
    }
    
    // Capturar snapshot do ranking para o novo mês
    this.captureMonthRankingSnapshot();
    
    console.log('✅ Avanço de mês completo!');
  }
  /**
   * Finaliza a temporada manualmente (chamado pelo botão FINALIZAR TEMPORADA).
   * Captura snapshot, avança o ano, executa rotinas de virada, inicia Janeiro.
   */
  finalizeSeasonTransition() {
    if (!this.pendingYearEnd) {
      console.warn('finalizeSeasonTransition chamado sem pendingYearEnd=true');
      return;
    }

    const completedYear = this.currentYear;
    console.log(`🏁 FINALIZANDO TEMPORADA ${completedYear} -> ${completedYear + 1}`);

    // ===== SNAPSHOT PARA CERIMONIA =====
    const bbpSnapshot = this.getBBPRanking();

    const playerHistoriesSnapshot = new Map();
    this.playerHistories.forEach((hist, id) => {
      playerHistoriesSnapshot.set(id, {
        ...hist,
        titles: hist.titles ? { ...hist.titles, detailedList: [...(hist.titles.detailedList || [])] } : { total: 0, detailedList: [] },
        tournamentHistory: [...(hist.tournamentHistory || [])],
      });
    });

    const signaturesSnapshot = new Map();
    this.signatureBlades.forEach((data, id) => {
      if (data?.stats) signaturesSnapshot.set(id, { blade: data.blade, stats: { ...data.stats } });
    });

    this.pendingSeasonCeremony = {
      completedYear,
      bbpSnapshot,
      playerHistoriesSnapshot,
      signaturesSnapshot,
    };

    // ===== AVANÇAR ANO =====
    const nextYear = completedYear + 1;
    this.currentYear  = nextYear;
    this.currentMonth = 1;
    this.currentTournamentIndex = 0;
    this.nextTournamentKey = `${nextYear}-1-0`;
    this.pendingYearEnd = false;
    this.pendingSeasonRecap = true; // 🔑 Sinaliza que o Season Recap ainda precisa ser exibido UMA vez

    // 🔑 FIX: Limpar bracket stale que pode ter sido criado pelo prepareNextTournamentBracket
    // ao fim de dezembro (quando nextTournamentKey ainda apontava para o último torneio do ano).
    this.currentBracket = null;
    this.bracketInProgress = false;

    console.log(`✅ Ano avançado para ${nextYear}`);

    // ===== ROTINAS DE VIRADA =====
    this.season++;

    TEAMS.forEach((player) => {
      if (player.age != null && player.status !== 'RETIRED' && player.status !== 'RETIRED_AMATEUR') {
        player.age += 1;
      }
    });

    // ── Snapshot anual de atributos (gráfico de evolução) ──
    TEAMS.forEach((player, idx) => {
      if (player.status !== 'PROFESSIONAL') return;
      const attrs = player.attributes;
      if (!attrs) return;
      const vals = Object.values(attrs).filter(v => typeof v === 'number');
      if (!vals.length) return;
      const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
      const tier = avg >= 13.5 ? 5 : avg >= 11.5 ? 4 : avg >= 9.5 ? 3 : avg >= 7.5 ? 2 : avg >= 5.5 ? 1 : 0;
      const history = this.playerHistories.get(idx);
      if (history) {
        if (!history.attrHistory) history.attrHistory = [];
        // Evitar duplicatas do mesmo ano
        if (!history.attrHistory.find(s => s.year === completedYear)) {
          history.attrHistory.push({ year: completedYear, avg: +avg.toFixed(2), tier });
        }
      }
    });

    // ══ RECORDES ETERNOS: snapshot de melhor temporada por pontos e títulos ══
    // pointsHistory expira em 18 meses — salvar o melhor de cada temporada PERMANENTEMENTE
    TEAMS.forEach((player, idx) => {
      const history = this.playerHistories.get(idx);
      if (!history) return;
      // Calcular pontos desta temporada antes de expirarem
      const pointsArr = this.pointsHistory.get(idx) || [];
      const seasonPts = pointsArr
        .filter(e => e.year === completedYear)
        .reduce((s, e) => s + e.points, 0);
      // Calcular títulos desta temporada
      const seasonTitles = (history.titles?.detailedList || [])
        .filter(t => t.year === completedYear).length;

      // Inicializar registros se necessário
      if (!history.allTimeSeasons) history.allTimeSeasons = [];

      // Salvar esta temporada compactamente (permanente)
      if (!history.allTimeSeasons.find(s => s.y === completedYear)) {
        history.allTimeSeasons.push({ y: completedYear, pts: seasonPts, t: seasonTitles });
      }

      // Atualizar melhor temporada por pontos (campo permanente)
      if (seasonPts > (history.bestSeasonPointsEver || 0)) {
        history.bestSeasonPointsEver = seasonPts;
        history.bestSeasonPointsYear = completedYear;
      }
      // Atualizar melhor temporada por títulos (campo permanente)
      if (seasonTitles > (history.bestSeasonTitlesEver || 0)) {
        history.bestSeasonTitlesEver = seasonTitles;
        history.bestSeasonTitlesYear = completedYear;
      }
    });
    // ═══════════════════════════════════════════════════════════════════════════

    const sortedPlayers = [...this.players].sort((a, b) => b.elo - a.elo);
    if (sortedPlayers.length > 0) this.seasonWinners.push(sortedPlayers[0].name);

    const balanceReport = this.balanceEngine.seasonReview();
    if (balanceReport.patchApplied) {
      console.log(`Patch ${balanceReport.patch.version} aplicado`);
    }

    // Poda de rivalidades fracas/inativas
    if (this.rivalrySystem) this.rivalrySystem.pruneStale(completedYear);

    if (this.retirementSystem) {
      const retirements = this.retirementSystem.checkAnnualRetirements();
      if (retirements.length > 0) {
        this.pendingRetirementAnnouncements = retirements;
        const slotsToFill = retirements.length;
        if (slotsToFill > 0 && TEAMS.some(p => p.status === 'RISING_STAR')) {
          this.promoteRisingStars(slotsToFill);
        }
      }
    }

    const amateurRetired = this.checkAmateurRetirements();
    if (amateurRetired.length > 0) {
      console.log(`${amateurRetired.length} Rising Star(s) aposentado(s) por idade`);
    }

    // 🏛️ ERA SYSTEM: Registrar retirements
    try {
      if (this.eraSystem && this.pendingRetirementAnnouncements?.length > 0) {
        this.pendingRetirementAnnouncements.forEach(() => this.eraSystem.recordRetirementForEra());
      }
    } catch(e) {}

    // 🏛️ ERA SYSTEM: Registrar rivalidades no arquivo da era corrente
    try {
      if (this.eraSystem && this.rivalrySystem) {
        const allRivalries = Array.from(this.rivalrySystem.rivalries?.values?.() || []);
        allRivalries.filter(r => r.totalMatches >= 10).forEach(r => {
          // FIX v2.1: rivalry usa p1Id/p2Id, não player1Id/player2Id
          const p1 = this.players[r.p1Id];
          const p2 = this.players[r.p2Id];
          if (p1 && p2) {
            this.eraSystem.recordRivalryForEra({
              p1Name: p1.name, p2Name: p2.name,
              p1Wins: r.p1Wins || 0, p2Wins: r.p2Wins || 0,
              total: r.totalMatches,
            });
          }
        });
      }
    } catch(e) {}

    // 🏛️ ERA SYSTEM: Registrar temporada e checar transição
    try {
      if (this.eraSystem) {
        this.eraSystem.recordSeasonForEra(completedYear);
        // Adicionar campeão da temporada à era
        const seasonChampName = this.seasonWinners[this.seasonWinners.length - 1];
        if (seasonChampName) {
          const currentEra = this.eraSystem.getCurrentEra();
          if (currentEra) {
            const champEntry = currentEra.champions.find(c => c.year === completedYear);
            if (!champEntry) currentEra.champions.push({ year: completedYear, name: seasonChampName });
          }
        }
        // Checar se uma nova era deve iniciar
        if (!this.pendingEraTransition) {
          const eraTransition = this.eraSystem.checkEraTransition(this);
          if (eraTransition) {
            this.pendingEraTransition = eraTransition;
            console.log(`🏛️ ERA TRANSITION DETECTED: ${eraTransition.trigger.type}`);
          }
        }
      }
    } catch(e) { console.warn('Era transition check error:', e); }

    // ===== 📖 CHRONICLE ENGINE: Gerar entrada do ano =====
    try {
      if (this.chronicleEngine) {
        this.chronicleEngine.generateYearEntry(this, completedYear);
        // Adicionar epitáfios de aposentadorias do ano
        if (this.pendingRetirementAnnouncements?.length > 0) {
          this.pendingRetirementAnnouncements.forEach(ret => {
            if (ret?.player && ret?.playerId !== undefined) {
              this.chronicleEngine.addPlayerEpitaph(
                ret.playerId,
                ret.player.name,
                ret.careerSummary || {}
              );
            }
          });
        }
      }
    } catch(e) { console.warn('Chronicle generation error:', e); }

    this.seasonRankings.clear();

    // Executar rotinas mensais de Janeiro
    this.executeMonthAdvance();

    console.log(`Temporada ${completedYear} finalizada — cerimônia pendente`);
  }

  // =====================================================
  // 📈 ANNUAL DEVELOPMENT ENGINE
  // =====================================================

  // =====================================================
  // ⚠️ FUNÇÃO OBSOLETA - SUBSTITUÍDA PELO SISTEMA MENSAL V2.0
  // =====================================================
  // Esta função foi substituída por:
  // - applyMonthlyDevelopment() em DevelopmentSystem.js
  // - applyMonthlyDecline() em DevelopmentSystem.js
  // - checkMonthlyBreakthrough() em DevelopmentSystem.js
  // 
  // O novo sistema:
  // 1. Aplica desenvolvimento MENSALMENTE (não anual)
  // 2. Usa potencial TOTAL ao invés de ceiling individual
  // 3. Distribui pontos por MENTALIDADE
  // 4. Hard cap universal de 15 para todos os stats
  // =====================================================
  /*
  applyAnnualDevelopment(player, playerId) {
    // ... código comentado ...
  }
  */

  /**
   * ✅ NOVO: Registra participação de jogador em evento especial
   * @param {number} playerId - ID do jogador
   * @param {object} eventData - Dados do evento
   */
  recordEventParticipation(playerId, eventData) {
    const history = this.playerHistories.get(playerId);
    if (!history) {
      console.warn(`❌ Player history não encontrado para ID ${playerId}`);
      return;
    }
    
    // Garantir que eventHistory existe
    if (!history.eventHistory) {
      history.eventHistory = [];
    }
    
    // Criar entrada do evento
    const eventEntry = {
      eventType: eventData.eventType || 'UNKNOWN',
      eventName: eventData.eventName || 'Special Event',
      description: eventData.description || '',
      date: {
        year: this.currentYear,
        month: this.currentMonth
      },
      result: eventData.result || 'Participated',
      prize: eventData.prize || 0,
      participants: eventData.participants || 0,
      format: eventData.format || '',
      specialAchievement: eventData.specialAchievement || null,
      stats: eventData.stats || null
    };
    
    // Adicionar ao histórico
    history.eventHistory.push(eventEntry);
    
    console.log(`🎪 Evento registrado para ${history.playerName}: ${eventEntry.eventName} (${eventEntry.result})`);
  }
  
  /**
   * Função legada mantida para compatibilidade
   * NÃO é mais chamada automaticamente - apenas manualmente se necessário
   */
  advanceMonth() {
    this.currentMonth++;
    if (this.currentMonth > 12) {
      this.seasonRankings.clear();
      this.currentMonth = 1;
      this.currentYear++;
      
      // ===== ⚔️ RESETAR SEASON BLADES PARA NOVA TEMPORADA =====
      console.log('⚔️ Nova temporada! Criando novos Season Blades para todos os jogadores...');
      TEAMS.forEach((team, index) => {
        const newSeasonBlades = createSeasonBlades(team, index);
        this.seasonBlades.set(index, newSeasonBlades);
        console.log(`   ✅ ${team.name}: Season Blades renovados`);
      });
      this.currentSeasonYear = this.currentYear;
      console.log('✅ Season Blades resetados com sucesso!');
      
      // ===== FASE 3: SEASON REVIEW E BALANCE CHECK =====
      this.season++;

      // ===== 🎂 +1 IDADE PARA TODOS OS JOGADORES =====
      console.log('🎂 Nova temporada! Incrementando idade de todos os jogadores...');
      // TEAMS inclui todos: profissionais, Rising Stars e aposentados
      TEAMS.forEach((player) => {
        if (player.age != null && player.status !== 'RETIRED' && player.status !== 'RETIRED_AMATEUR') {
          player.age += 1;
        }
      });
      // Rising Stars agora estão em TEAMS — idade incrementada junto com profissionais

      // Nota: Desenvolvimento é aplicado MENSALMENTE via executeMonthAdvance()
      // Não aplicar aqui para evitar duplicação
      
      // Encontrar o campeão da temporada
      const sortedPlayers = [...this.players].sort((a, b) => b.elo - a.elo);
      if (sortedPlayers.length > 0) {
        this.seasonWinners.push(sortedPlayers[0].name);
      }
      
      // Realizar balance check
      console.log('⚖️ Realizando balance review da temporada...');
      const balanceReport = this.balanceEngine.seasonReview();
      
      if (balanceReport.patchApplied) {
        console.log(`✅ Patch ${balanceReport.patch.version} aplicado automaticamente`);
        console.log(`   Mudanças: ${balanceReport.patch.changes.length}`);
      } else {
        console.log('✅ Meta saudável - nenhum patch necessário');
      }
    }
    
    this.currentTournamentIndex = 0;
    this.currentBracket = null;
    this.monthRankingSnapshot = null; // Resetar snapshot para o próximo mês
    
    const monthConfig = this.getCurrentMonthConfig();
    const firstTournament = monthConfig.tournaments[0];
    
    // Verificar se é break week
    if (this.isBreakWeek(firstTournament)) {
      console.log(`🌴 ${firstTournament.name} - ${firstTournament.description}`);
      this.currentRound = null; // Sem rounds em break week
    } else {
      this.currentRound = firstTournament.participants === 64 ? 'R64' :
                          firstTournament.participants === 32 ? 'R32' : 'R16';
    }
    
    // Recalcular BBP de todos os jogadores (pontos podem ter expirado)
    this.recalculateAllBBP();
    
    // ===== 🏆 ATUALIZAR DIVISÕES APENAS NO FIM DE CADA ERA =====
    const eraEnded = this.updateDivisionsEndOfEra();
    if (eraEnded) {
      console.log('✅ Divisões atualizadas ao final da Era');
    }
    
    // ===== 📸 SALVAR SNAPSHOT MID-SEASON (Agosto) =====
    this.saveMidSeasonSnapshot();
    
    // ===== 🎟️ CONCEDER WILD CARDS (se aplicável) =====
    console.log('🎟️ Verificando Wild Cards...');
    this.awardWildCards();
    console.log('✅ Wild Cards processados');
    
    // ===== 🏅 FASE 4: CHECK ACHIEVEMENTS =====
    this.checkAllAchievements();
    
    // ===== 🌅 LOG DA ERA ATUAL =====
    const currentEra = this.getCurrentEra();
    if (currentEra) {
      console.log(`📅 ${currentEra.name} - ${currentEra.theme}`);
    }
    
    // Capturar snapshot do ranking para o novo mês
    this.captureMonthRankingSnapshot();
  }

  getTournamentHistory(year, month, tournamentIndex = 0) {
    const key = `${year}-${month}-${tournamentIndex}`;
    console.log(`🔍 Procurando torneio com chave: ${key}`);
    const tournament = this.tournamentArchive.get(key);
    console.log(`📦 Torneio encontrado:`, tournament ? 'SIM' : 'NÃO');
    return tournament;
  }
  
  // ===== FUNÇÕES DE AGREGAÇÃO PARA RECAPS =====
  
  computeTournamentRecap(tournamentKey = null) {
    // 🔒 NOVO: Se uma chave específica for passada, usar essa chave
    // Isso permite buscar dados de torneios já completados
    let tournament, tournamentId, year, month, index;
    
    if (tournamentKey) {
      // Usar torneio específico do archive
      [year, month, index] = tournamentKey.split('-').map(Number);
      tournamentId = tournamentKey;
      
      console.log('📊 computeTournamentRecap chamado com chave específica:');
      console.log('  - TournamentKey:', tournamentKey);
      
      // Buscar torneio do archive
      const tournamentData = this.tournamentArchive.get(tournamentKey);
      if (tournamentData) {
        tournament = tournamentData.tournament;
        console.log('  - Tournament (archive):', tournament?.name);
      } else {
        console.warn('⚠️ Torneio não encontrado no archive!');
        // Fallback: tentar buscar do calendário
        const monthConfig = CALENDAR_CONFIG.months.find(m => m.id === month);
        tournament = monthConfig?.tournaments?.[index];
        console.log('  - Tournament (calendar fallback):', tournament?.name);
      }
    } else {
      // Usar torneio atual
      tournament = this.getCurrentTournament();
      tournamentId = `${this.currentYear}-${this.currentMonth}-${this.currentTournamentIndex}`;
      year = this.currentYear;
      month = this.currentMonth;
      index = this.currentTournamentIndex;
      
      console.log('📊 computeTournamentRecap chamado (torneio atual):');
      console.log('  - Tournament:', tournament?.name);
      console.log('  - TournamentId:', tournamentId);
    }
    
    // 🔧 CORREÇÃO CRÍTICA: Se tournamentKey foi passado, buscar logs do histórico global
    // Se não, usar logs do torneio atual
    let logs;
    if (tournamentKey) {
      // Buscar logs do histórico global filtrados por tournamentId
      logs = this.matchLog.filter(log => log.tournamentId === tournamentId);
      console.log(`  - Logs do histórico (filtrados por ${tournamentId}):`, logs.length);
    } else {
      // Usar logs do torneio atual (em andamento)
      logs = this.currentTournamentLog;
      console.log('  - Logs do torneio atual:', logs.length);
    }
    
    if (logs.length === 0) {
      console.warn('⚠️ Nenhum log de partida encontrado!');
      return {
        tournamentId,
        tournamentName: tournament?.name || 'Unknown',
        tournamentType: tournament?.type || 'Unknown',
        tournamentTier: tournament?.tier || 'Unknown',
        dataAvailable: false
      };
    }
    
    // Estatísticas básicas
    const totalMatches = logs.length;
    const finishTypes = {};
    let totalDuration = 0;
    let totalRounds = 0;
    let roundsCount = 0;
    let totalGamesPlayed = 0;
    
    // ⭐ NOVO: Rastrear tipos de peões usados
    const beyTypeUsage = {
      Attack: 0,
      Defense: 0,
      Stamina: 0,
      Balance: 0
    };
    
    // ⭐ NOVO: Rastrear vitórias por tipo de finish POR ROUND
    const roundFinishStats = {
      BURST_FINISH: 0,
      RING_OUT_FINISH: 0,
      KO_FINISH: 0,
      SPIN_FINISH: 0
    };

    // ★ CORRIGIDO: LOG DE DEBUG INICIAL
    console.log(`\n📊 ═══════════════════════════════════════════════════════`);
    console.log(`📊 computeTournamentRecap - Processando ${logs.length} matches`);
    console.log(`📊 ═══════════════════════════════════════════════════════\n`);

    // ⭐ LOG COMPLETO DO PRIMEIRO MATCH PARA DEBUG
    if (logs.length > 0) {
      console.log('\n🔍 ═══════════════════════════════════════════════════════');
      console.log('🔍 DEBUG: ESTRUTURA DO PRIMEIRO MATCH');
      console.log('🔍 ═══════════════════════════════════════════════════════');
      const firstLog = logs[0];
      console.log('Match completo:', JSON.stringify(firstLog, null, 2));
      console.log('\n🔍 Verificações:');
      console.log('  • allFinishes existe?', !!firstLog.allFinishes);
      console.log('  • allFinishes é array?', Array.isArray(firstLog.allFinishes));
      console.log('  • allFinishes.length:', firstLog.allFinishes?.length);
      console.log('  • allFinishes conteúdo:', firstLog.allFinishes);
      console.log('  • rounds existe?', !!firstLog.rounds);
      console.log('  • rounds é array?', Array.isArray(firstLog.rounds));
      console.log('  • rounds.length:', firstLog.rounds?.length);
      if (firstLog.rounds && firstLog.rounds.length > 0) {
        console.log('  • rounds[0].method:', firstLog.rounds[0].method);
        console.log('  • rounds[0].finishType:', firstLog.rounds[0].finishType);
        console.log('  • rounds[0] completo:', firstLog.rounds[0]);
      }
      console.log('  • finishType:', firstLog.finishType);
      console.log('🔍 ═══════════════════════════════════════════════════════\n');
    }

    logs.forEach((log, index) => {
      // ⭐ NOVO: Contar tipos de peões usados
      if (log.playerABeyType) {
        beyTypeUsage[log.playerABeyType] = (beyTypeUsage[log.playerABeyType] || 0) + 1;
      }
      if (log.playerBBeyType) {
        beyTypeUsage[log.playerBBeyType] = (beyTypeUsage[log.playerBBeyType] || 0) + 1;
      }
      
      // ★ CORRIGIDO: LOG DETALHADO DO PRIMEIRO E ÚLTIMO MATCH
      if (index === 0 || index === logs.length - 1) {
        console.log(`📝 Match ${index + 1}/${logs.length}:`, {
          matchId: log.matchId,
          round: log.round,
          finishType: log.finishType,
          allFinishes: log.allFinishes,
          allFinishesLength: log.allFinishes?.length || 0,
          roundsLength: log.rounds?.length || 0,
          hasAllFinishes: !!(log.allFinishes && Array.isArray(log.allFinishes) && log.allFinishes.length > 0)
        });
      }

      // ★ CORRIGIDO: CONTABILIZAR ROUNDS INDIVIDUAIS (PRIORIDADE: allFinishes > rounds > finishType)
      let matchRoundsProcessed = 0;
      
      if (log.allFinishes && Array.isArray(log.allFinishes) && log.allFinishes.length > 0) {
        // PRIORIDADE 1: Usar allFinishes (CORRETO)
        log.allFinishes.forEach(finish => {
          const normalizedFinish = finish || 'SPIN_FINISH';
          finishTypes[normalizedFinish] = (finishTypes[normalizedFinish] || 0) + 1;
          // ⭐ NOVO: Contar finishes por round
          roundFinishStats[normalizedFinish] = (roundFinishStats[normalizedFinish] || 0) + 1;
          totalGamesPlayed++;
          matchRoundsProcessed++;
        });
        
        if (index === 0 || index === logs.length - 1) {
          console.log(`   ✅ Usando allFinishes: ${log.allFinishes.join(', ')}`);
        }
      } else if (log.rounds && Array.isArray(log.rounds) && log.rounds.length > 0) {
        // PRIORIDADE 2: Extrair de rounds array
        log.rounds.forEach(round => {
          // ⭐ FALLBACK TRIPLO: method → finishType → SPIN_FINISH
          const method = round.method || round.finishType || 'SPIN_FINISH';
          
          // ⭐ LOG DE DEBUG (para identificar problemas)
          if (!round.method && round.finishType) {
            console.warn(`⚠️ Round sem 'method', usando 'finishType': ${round.finishType}`);
          } else if (!round.method && !round.finishType) {
            console.error(`❌ Round sem 'method' nem 'finishType'! Usando SPIN_FINISH como fallback`);
            console.log('   Round completo:', round);
          }
          
          finishTypes[method] = (finishTypes[method] || 0) + 1;
          // ⭐ NOVO: Contar finishes por round
          roundFinishStats[method] = (roundFinishStats[method] || 0) + 1;
          totalGamesPlayed++;
          matchRoundsProcessed++;
        });
        
        if (index === 0 || index === logs.length - 1) {
          console.log(`   ⚠️ Usando rounds array: ${log.rounds.map(r => r.method).join(', ')}`);
        }
      } else {
        // PRIORIDADE 3: Fallback para finishType (PODE ESTAR ERRADO!)
        const method = log.finishType || 'SPIN_FINISH';
        finishTypes[method] = (finishTypes[method] || 0) + 1;
        // ⭐ NOVO: Contar finishes por round
        roundFinishStats[method] = (roundFinishStats[method] || 0) + 1;
        totalGamesPlayed++;
        matchRoundsProcessed = 1;
        
        if (index === 0 || index === logs.length - 1) {
          console.warn(`   ❌ FALLBACK: Usando finishType único (${method})`);
        }
      }

      if (log.duration) totalDuration += log.duration;
      if (log.rounds && Array.isArray(log.rounds)) {
        totalRounds += log.rounds.length;
        roundsCount++;
      }
    });

    // ★ CORRIGIDO: LOG FINAL DE ESTATÍSTICAS
    console.log(`\n📊 ═══════════════════════════════════════════════════════`);
    console.log(`📊 ESTATÍSTICAS PROCESSADAS:`);
    console.log(`   • Total de matches: ${totalMatches}`);
    console.log(`   • Total de rounds/games: ${totalGamesPlayed}`);
    console.log(`   • Média de rounds por match: ${(totalGamesPlayed / totalMatches).toFixed(2)}`);
    console.log(`   • Distribuição de finishes:`);
    Object.entries(finishTypes).forEach(([type, count]) => {
      const percentage = ((count / totalGamesPlayed) * 100).toFixed(1);
      console.log(`      - ${type}: ${count} (${percentage}%)`);
    });
    console.log(`   • Duração total: ${totalDuration}s`);
    console.log(`   • Duração média: ${(totalDuration / totalMatches).toFixed(1)}s`);
    if (roundsCount > 0) {
      console.log(`   • Rounds médio: ${(totalRounds / roundsCount).toFixed(2)}`);
    }
    console.log(`📊 ═══════════════════════════════════════════════════════\n`);
    
    // Momentos notáveis
    const upsets = logs.filter(l => l.upset).sort((a, b) => (b.upsetMargin || 0) - (a.upsetMargin || 0));
    const longestMatch = logs.reduce((max, l) => (!max || (l.duration || 0) > (max.duration || 0)) ? l : max, null);
    const shortestMatch = logs.reduce((min, l) => (!min || (l.duration || 0) < (min.duration || 0)) ? l : min, null);
    
    // Jogador com mais vitórias no torneio
    const playerWins = {};
    logs.forEach(log => {
      playerWins[log.winnerId] = (playerWins[log.winnerId] || 0) + 1;
    });
    const topPlayerId = Object.keys(playerWins).reduce((a, b) => playerWins[a] > playerWins[b] ? a : b, null);
    
    // Arena mais usada (se houver múltiplas arenas)
    const arenaCount = {};
    logs.forEach(log => {
      arenaCount[log.arenaId] = (arenaCount[log.arenaId] || 0) + 1;
    });
    const topArena = Object.keys(arenaCount).reduce((a, b) => arenaCount[a] > arenaCount[b] ? a : b, null);
    
    // Finish type mais comum
    const mostCommonFinish = Object.keys(finishTypes).reduce((a, b) => finishTypes[a] > finishTypes[b] ? a : b, 'points');
    
    return {
      tournamentId,
      tournamentName: tournament.name,
      tournamentType: tournament.type,
      tournamentTier: tournament.tier,
      arena: this.getTournamentArena(tournament),
      dataAvailable: true,
      totalMatches,
      totalRounds: totalGamesPlayed, // ⭐ NOVO: Total de rounds jogados (não matches)
      avgDuration: totalDuration > 0 ? totalDuration / totalMatches : null,
      avgRounds: roundsCount > 0 ? totalRounds / roundsCount : null,
      finishTypes,
      roundFinishStats, // ⭐ NOVO: Estatísticas de finish por round
      beyTypeUsage, // ⭐ NOVO: Tipos de peões usados
      mostCommonFinish,
      notableMoments: {
        biggestUpset: upsets[0] || null,
        longestMatch,
        shortestMatch,
        topPlayer: topPlayerId ? parseInt(topPlayerId) : null,
        topPlayerWins: topPlayerId ? playerWins[topPlayerId] : 0,
        topArena,
        topArenaMatches: topArena ? arenaCount[topArena] : 0
      }
    };
  }
  
  computeSeasonRecap(seasonYear) {
    const year = seasonYear || this.currentYear;
    
    // Filtrar matches da temporada
    const seasonLogs = this.matchLog.filter(log => log.seasonNumber === year);
    
    // 🔧 CORREÇÃO BUG: Debug aprimorado - mostrar informações sobre os logs
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`📊 [Season Recap] Computando recap do ano ${year}`);
    console.log(`   Total de logs no sistema: ${this.matchLog.length}`);
    console.log(`   Logs encontrados para o ano ${year}: ${seasonLogs.length}`);
    
    // Mostrar distribuição de logs por ano
    const logsByYear = {};
    this.matchLog.forEach(log => {
      const y = log.seasonNumber || 'undefined';
      logsByYear[y] = (logsByYear[y] || 0) + 1;
    });
    console.log(`   Distribuição de logs por ano:`, logsByYear);
    
    // Mostrar últimos 5 logs para debug
    if (this.matchLog.length > 0) {
      const recentLogs = this.matchLog.slice(-5);
      console.log(`   Últimos 5 logs registrados:`);
      recentLogs.forEach((l, i) => {
        console.log(`     ${i+1}. Ano: ${l.seasonNumber}, Mês: ${l.month}, Torneio: ${l.tournamentName}`);
      });
    }
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    
    if (seasonLogs.length === 0) {
      console.warn(`[Season Recap] AVISO: Nenhum log encontrado para a temporada ${year}`);
      console.log(`[Season Recap] Anos disponíveis:`, [...new Set(this.matchLog.map(l => l.seasonNumber))]);
      return {
        seasonYear: year,
        dataAvailable: false,
        debugInfo: {
          totalLogs: this.matchLog.length,
          requestedYear: year,
          availableYears: [...new Set(this.matchLog.map(l => l.seasonNumber))]
        }
      };
    }
    
    // Campeões por torneio
    const champions = [];
    for (let month = 1; month <= 12; month++) {
      const tournament = this.getTournamentHistory(year, month);
      if (tournament && tournament.champion) {
        champions.push({
          month,
          tournamentName: tournament.tournamentName,
          championId: tournament.champion.id,
          championName: tournament.champion.name
        });
      }
    }
    
    // Player of the year (maior pontuação na temporada)
    const seasonRanking = this.getSeasonRanking();
    const playerOfYear = seasonRanking[0] ? seasonRanking[0].playerId : null;
    
    // Mais consistente (média de fase alcançada)
    const playerPhases = {};
    const phaseValues = { 'R16': 1, 'QF': 2, 'SF': 3, 'F': 4 };
    
    seasonLogs.forEach(log => {
      [log.playerAId, log.playerBId].forEach(playerId => {
        if (!playerPhases[playerId]) playerPhases[playerId] = { totalPhase: 0, count: 0 };
        const phaseValue = phaseValues[log.round] || 0;
        playerPhases[playerId].totalPhase += phaseValue;
        playerPhases[playerId].count++;
      });
    });
    
    let mostConsistentId = null;
    let maxAvgPhase = 0;
    Object.keys(playerPhases).forEach(playerId => {
      const avg = playerPhases[playerId].totalPhase / playerPhases[playerId].count;
      if (avg > maxAvgPhase) {
        maxAvgPhase = avg;
        mostConsistentId = parseInt(playerId);
      }
    });
    
    // Rei dos upsets
    const upsetKings = {};
    seasonLogs.filter(l => l.upset).forEach(log => {
      upsetKings[log.winnerId] = (upsetKings[log.winnerId] || 0) + 1;
    });
    const upsetKingId = Object.keys(upsetKings).length > 0 
      ? parseInt(Object.keys(upsetKings).reduce((a, b) => upsetKings[a] > upsetKings[b] ? a : b))
      : null;
    
    // Match do ano (maior upset ou mais longo)
    const allUpsets = seasonLogs.filter(l => l.upset).sort((a, b) => (b.upsetMargin || 0) - (a.upsetMargin || 0));
    const matchOfYear = allUpsets[0] || seasonLogs.reduce((max, l) => 
      (!max || (l.duration || 0) > (max.duration || 0)) ? l : max, null
    );
    
    // Arena do ano
    const arenaCount = {};
    seasonLogs.forEach(log => {
      arenaCount[log.arenaId] = (arenaCount[log.arenaId] || 0) + 1;
    });
    const arenaOfYear = Object.keys(arenaCount).length > 0
      ? Object.keys(arenaCount).reduce((a, b) => arenaCount[a] > arenaCount[b] ? a : b)
      : null;
    
    // Resumo numérico
    const finishTypes = {};
    let totalDuration = 0;
    let totalGamesPlayed = 0; // ⭐ NOVO
    
    seasonLogs.forEach(log => {
      // ⭐ NOVO: Conta CADA JOGO individualmente
      if (log.allFinishes && Array.isArray(log.allFinishes)) {
        log.allFinishes.forEach(finish => {
          finishTypes[finish] = (finishTypes[finish] || 0) + 1;
          totalGamesPlayed++;
        });
      } else {
        // Fallback para compatibilidade com logs antigos
        finishTypes[log.finishType] = (finishTypes[log.finishType] || 0) + 1;
        totalGamesPlayed++;
      }
      
      if (log.duration) totalDuration += log.duration;
    });
    
    return {
      seasonYear: year,
      dataAvailable: true,
      totalMatches: seasonLogs.length,
      champions,
      playerOfYearId: playerOfYear,
      mostConsistentId,
      mostConsistentAvgPhase: maxAvgPhase,
      upsetKingId,
      upsetKingCount: upsetKingId ? upsetKings[upsetKingId] : 0,
      matchOfYear,
      arenaOfYear,
      arenaOfYearMatches: arenaOfYear ? arenaCount[arenaOfYear] : 0,
      finishTypes,
      avgDuration: totalDuration > 0 ? totalDuration / seasonLogs.length : null
    };
  }

  // ===== 📖 MÉTODOS DE NARRATIVA (FASE 2) =====
  
  getCurrentSeason() {
    // Retorna dados da season atual para análise de narrativas
    // ✅ OTIMIZAÇÃO: Não reconstrói mais - usa construção incremental
    if (!this.currentSeasonData || this.currentSeasonData.year !== this.currentYear) {
      // Reset no início de novo ano
      this.currentSeasonData = {
        year: this.currentYear,
        tournaments: []
      };
    }
    
    return this.currentSeasonData;
  }
  
  /**
   * ✅ NOVO: Adiciona torneio incrementalmente à temporada
   * Chamado em completeTournament() para evitar reconstrução O(n²)
   */
  addTournamentToSeason(tournamentData) {
    if (!this.currentSeasonData || this.currentSeasonData.year !== this.currentYear) {
      this.currentSeasonData = {
        year: this.currentYear,
        tournaments: []
      };
    }
    
    // Usar currentTournamentLog que já está em memória
    this.currentSeasonData.tournaments.push({
      name: tournamentData.tournamentName,
      winner: tournamentData.champion?.id,
      winnerAge: tournamentData.champion ? TEAMS[tournamentData.champion.id]?.age : null,
      matches: this.currentTournamentLog.map(log => ({
        player1: { id: log.playerAId, seed: log.player1Rank },
        player2: { id: log.playerBId, seed: log.player2Rank },
        winner: log.winnerId,
        score: log.score,
        round: log.round,
        hasComeback: log.score && Math.abs(log.score.playerA - log.score.playerB) >= 2,
        hasBurst: log.finishType === 'burst'
      }))
    });
    
    console.log(`📊 Torneio adicionado à temporada (${this.currentSeasonData.tournaments.length} torneios)`);
  }

  getActivePlayers() {
    return TEAMS.map((team, idx) => ({
      id: idx,
      name: team.name,
      age: team.age || 25,
      titles: this.playerHistories.get(idx)?.titles?.total || 0
    }));
  }

  getPlayerById(playerId) {
    // Primeiro tenta encontrar em TEAMS (jogadores normais)
    const team = TEAMS[playerId];
    if (team) {
      // ✅ FIX: Retorna o objeto COMPLETO do personagem, não apenas algumas propriedades
      return {
        ...team, // ← ISSO É CRÍTICO! Mantém todas as propriedades (attributes, iconUrl, photoUrl, etc.)
        id: playerId,
        titles: this.playerHistories.get(playerId)?.titles?.total || 0
      };
    }
    
    // TEAMS agora inclui Rising Stars e Newgens — TEAMS[id] é suficiente
    return null;
  }

  getLastTournamentWinner() {
    if (this.currentMonth === 1 && this.currentYear === 2024) return null;
    
    let checkMonth = this.currentMonth - 1;
    let checkYear = this.currentYear;
    
    if (checkMonth < 1) {
      checkMonth = 12;
      checkYear--;
    }
    
    const tournament = this.getTournamentHistory(checkYear, checkMonth);
    return tournament?.champion ? this.getPlayerById(tournament.champion.id) : null;
  }

  updateNarratives() {
    // Chamado ao final de cada mês para atualizar narrativas
    if (!this.narrativeEngine) return;

    const currentSeason = this.getCurrentSeason();
    
    // Checar eventos dinâmicos
    const dynamicEvents = this.eventsManager.system.checkDynamicEvents(this);
    if (dynamicEvents.length > 0) {
      console.log(`🎊 ${dynamicEvents.length} eventos especiais detectados!`);
    }
    
    // Checar eventos programados
    const scheduledEvents = this.eventsManager.system.checkScheduledEvents(
      this.currentMonth,
      this.currentYear,
      this
    );
    if (scheduledEvents.length > 0) {
      console.log(`📅 ${scheduledEvents.length} eventos programados disponíveis!`);
    }
    
    return {
      dynamicEvents,
      scheduledEvents
    };
  }

  finishTournament(winnerId, bracket) {
    // Chamado ao final de cada torneio
    const tournament = this.getCurrentTournament();
    
    // Gerar tweets de campeão
    if (this.socialEngine && winnerId !== undefined) {
      const champion = TEAMS[winnerId];
      const tweets = this.socialEngine.generateTweets({
        type: 'TOURNAMENT_END',
        champion: champion,
        tournament: tournament.name
      }, {
        isFinal: true
      });
      
      if (!this.socialEngine.recentTweets) {
        this.socialEngine.recentTweets = [];
      }
      this.socialEngine.recentTweets.unshift(...tweets);
      if (this.socialEngine.recentTweets.length > 50) {
        this.socialEngine.recentTweets = this.socialEngine.recentTweets.slice(0, 50);
      }
    }

    // Gerar highlights do torneio
    if (this.narrativeEngine && this.currentTournamentLog.length > 0) {
      const tempSeason = {
        year: this.currentYear,
        tournaments: [{
          name: tournament.name,
          winner: winnerId,
          matches: this.currentTournamentLog.map(log => ({
            player1: { id: log.playerAId, seed: log.player1Rank },
            player2: { id: log.playerBId, seed: log.player2Rank },
            winner: log.winnerId,
            score: log.score,
            round: log.round,
            hasBurst: log.finishType === 'burst'
          }))
        }]
      };
      
      const highlights = this.narrativeEngine.highlightGenerator.generateSeasonHighlights(tempSeason);
      console.log(`✨ ${highlights.length} highlights gerados para ${tournament.name}`);
    }
    
    // ===== ATUALIZAR FORMA BASEADO NOS RESULTADOS =====
    if (this.formManager && bracket && bracket.matches) {
      console.log('📊 Atualizando forma dos jogadores baseado nos resultados...');
      
      // Determinar tipo de torneio
      const currentKey = this.nextTournamentKey || `${this.currentYear}-${this.currentMonth}-${this.currentTournamentIndex}`;
      const tournamentName = tournament?.name || 'Tournament';
      
      // Detectar se é major baseado no nome
      const isMajor = tournamentName && (
        tournamentName.includes('WORLD') || 
        tournamentName.includes('MAJOR') ||
        tournamentName.includes('CHAMPIONSHIP') ||
        tournamentName.includes('CONTINENTAL')
      );
      
      const tournamentType = isMajor ? 'major' : 'regional';
      const totalPlayers = bracket.seeds?.length || 32;
      
      console.log(`🏆 Torneio: ${tournamentName} (${tournamentType}, ${totalPlayers} players)`);
      
      // Mapa para rastrear melhor resultado de cada jogador
      const playerBestResults = new Map();
      
      // Primeiro pass: determinar melhor colocação de cada jogador
      bracket.matches.forEach(match => {
        if (!match.player1 || !match.player2 || !match.winner) return;
        
        const roundName = match.roundName || match.round || '';
        
        // Função helper para determinar placement baseado na rodada e resultado
        const getPlacementFromRound = (round, wonMatch) => {
          const roundUpper = round.toUpperCase();
          
          if (roundUpper.includes('FINAL')) {
            if (roundUpper.includes('SEMI') || roundUpper === 'SF') {
              return wonMatch ? 'SF' : 'SF'; // 3rd-4th ambos SF
            }
            return wonMatch ? '1st' : '2nd'; // Final
          }
          
          if (roundUpper.includes('QUARTER') || roundUpper === 'QF') {
            return wonMatch ? 'QF' : 'QF'; // 5th-8th ambos QF
          }
          
          if (roundUpper.includes('16') || roundUpper === 'R16') {
            return wonMatch ? 'R16' : 'R16'; // 9th-16th
          }
          
          if (roundUpper.includes('32') || roundUpper === 'R32' || roundUpper === 'R1') {
            return wonMatch ? 'R32' : 'R32'; // 17th-32nd
          }
          
          // Default para rounds desconhecidas
          return wonMatch ? 'R32' : 'DNQ';
        };
        
        // Processar ambos jogadores
        [match.player1, match.player2].forEach(player => {
          if (!player || typeof player.id !== 'number') return;
          
          const wonMatch = match.winner === player.id;
          const placement = getPlacementFromRound(roundName, wonMatch);
          
          // Atualizar melhor resultado (mais alto = melhor)
          const placementValue = {
            '1st': 7,
            '2nd': 6,
            'SF': 5,
            'QF': 4,
            'R16': 3,
            'R32': 2,
            'DNQ': 1
          };
          
          const currentValue = placementValue[placement] || 1;
          const existingValue = placementValue[playerBestResults.get(player.id)] || 0;
          
          if (currentValue > existingValue) {
            playerBestResults.set(player.id, placement);
          }
        });
      });
      
      // Second pass: atualizar forma com melhor resultado
      playerBestResults.forEach((placement, playerId) => {
        const ranking = this.getBBPRanking().findIndex(r => r.playerId === playerId) + 1;
        
        const result = this.formManager.updateAfterTournament(playerId, {
          placement: placement,
          tournamentType: tournamentType,
          playerRanking: ranking || 50,
          totalPlayers: totalPlayers
        });
        
        if (result) {
          const player = TEAMS[playerId];
          console.log(
            `  ${player.name}: ${placement} → ${result.oldForma.toFixed(0)} → ${result.newForma.toFixed(0)} (${result.change > 0 ? '+' : ''}${result.change.toFixed(1)}) ${result.state.icon}`
          );
        }
      });
      
      console.log('✅ Forma atualizada para todos os jogadores!');
    }
  }

  // ====================================================================
  // FASE 2: FUNÇÕES PARA FIGHTER CARDS E VERSUS SHOWCASE
  // ====================================================================

  getPlayerStats(playerId) {
    // Retorna estatísticas completas de um jogador
    const playerHistory = this.matchHistory.filter(
      m => m.player1?.id === playerId || m.player2?.id === playerId
    );
    
    const wins = playerHistory.filter(m => m.winner?.id === playerId).length;
    const losses = playerHistory.length - wins;
    
    // Recent form (últimos 5 jogos)
    const recentMatches = playerHistory.slice(-5);
    const recentForm = recentMatches.map(m => 
      m.winner?.id === playerId ? 'W' : 'L'
    );
    
    // Streak atual
    let currentStreak = 0;
    for (let i = playerHistory.length - 1; i >= 0; i--) {
      if (playerHistory[i].winner?.id === playerId) {
        currentStreak++;
      } else {
        break;
      }
    }

    // Burst e Ring Out stats
    const totalBursts = playerHistory.filter(m => 
      m.method === 'Burst Finish' && m.winner?.id === playerId
    ).length;
    
    const totalRingOuts = playerHistory.filter(m => 
      m.method === 'Ring Out Finish' && m.winner?.id === playerId
    ).length;
    
    // Average points (simplificado)
    const avgPoints = wins > 0 ? (wins * 2.5) : 0;

    // Get ranking position
    const bbpRanking = this.getBBPRanking();
    const rankingPosition = bbpRanking.findIndex(r => r.playerId === playerId);
    const ranking = rankingPosition >= 0 ? rankingPosition + 1 : 999;
    
    return {
      record: { wins, losses },
      recentForm,
      ranking,
      avgPoints,
      totalBursts,
      totalRingOuts,
      currentStreak
    };
  }

  getHeadToHead(player1Id, player2Id) {
    // Retorna histórico de confrontos diretos
    if (!this.matchHistory) return [];
    
    return this.matchHistory.filter(m =>
      (m.player1?.id === player1Id && m.player2?.id === player2Id) ||
      (m.player1?.id === player2Id && m.player2?.id === player1Id)
    ).map(m => ({
      date: m.date,
      winner: m.winner?.id === player1Id ? 'player1' : 'player2',
      method: m.method,
      tournament: m.tournament
    }));
  }
  
  // ====================================================
  // FASE 1: DIVISIONAL SYSTEM & CORE MECHANICS
  // ====================================================
  
  
  // ===== 🎲 INICIALIZAR RANKING ALEATÓRIO =====
  // Distribui pontos aleatórios (1-100) para todos os jogadores sem repetição
  initializeRandomRanking() {
    const numPlayers = TEAMS.length;
    
    // Criar array com pontos únicos de 1 a 100
    // Se houver mais de 100 jogadores, usar 1-numPlayers
    const maxPoints = Math.max(100, numPlayers);
    const availablePoints = Array.from({ length: maxPoints }, (_, i) => i + 1);
    
    // Embaralhar os pontos
    for (let i = availablePoints.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [availablePoints[i], availablePoints[j]] = [availablePoints[j], availablePoints[i]];
    }
    
    // Atribuir pontos aleatórios a cada jogador
    TEAMS.forEach((team, playerId) => {
      const points = availablePoints[playerId] || 1;
      
      // Adicionar pontos com expiração de 18 meses
      const pointsArray = this.pointsHistory.get(playerId) || [];
      pointsArray.push({
        points: points,
        year: this.currentYear,
        month: this.currentMonth,
        reason: 'Initial Ranking',
        expiryYear: this.currentYear + Math.floor((this.currentMonth + 18 - 1) / 12),
        expiryMonth: ((this.currentMonth + 18 - 1) % 12) + 1
      });
      this.pointsHistory.set(playerId, pointsArray);
      
      // Atualizar todos os rankings
      this.historicalRankings.set(playerId, points);
      this.seasonRankings.set(playerId, points);
      this.bbpRankings.set(playerId, points);
      
      console.log(`   ${team.name}: ${points} pts`);
    });
    
    console.log(`✅ ${numPlayers} jogadores inicializados com pontos aleatórios (1-${maxPoints})`);
  }

  initializeDivisions() {
    console.log('🏁 Inicializando sistema de divisões...');
    
    // Primeira vez: todos começam em prospects
    TEAMS.forEach((team, id) => {
      this.divisionHistory.set(id, {
        playerId: id,
        playerName: team.name,
        currentDivision: 'prospects',
        previousDivision: null,
        promotions: 0,
        relegations: 0,
        divisionsSinceStart: ['prospects']
      });
    });
    
    // Calcular divisões iniciais baseado em ranking
    this.updateDivisions();
    
    console.log('✅ Divisões inicializadas');
    console.log(`   Elite: ${this.divisions.elite.length} players`);
    console.log(`   Challenger: ${this.divisions.challenger.length} players`);
    console.log(`   Prospects: ${this.divisions.prospects.length} players`);
    console.log(`   Relegation: ${this.divisions.relegation.length} players`);
  }
  
  updateDivisions() {
    const bbpRanking = this.getBBPRanking();
    
    // Criar novas divisões baseadas em ranking atual
    const newDivisions = {
      elite: bbpRanking.slice(0, 16).map(r => r.playerId),
      challenger: bbpRanking.slice(16, 40).map(r => r.playerId),
      prospects: bbpRanking.slice(40, 64).map(r => r.playerId),
      relegation: bbpRanking.slice(64).map(r => r.playerId)
    };
    
    // Detectar e processar mudanças
    this.detectAndProcessDivisionChanges(newDivisions);
    
    // Atualizar divisões
    this.divisions = newDivisions;
  }
  
  detectAndProcessDivisionChanges(newDivisions) {
    const allPlayerIds = new Set([
      ...newDivisions.elite,
      ...newDivisions.challenger,
      ...newDivisions.prospects,
      ...newDivisions.relegation
    ]);
    
    allPlayerIds.forEach(playerId => {
      if (!TEAMS[playerId]) return; // ignora IDs sem referência em TEAMS
      const history = this.divisionHistory.get(playerId);
      const oldDivision = history?.currentDivision || 'prospects';
      const newDivision = this.findPlayerInDivisions(playerId, newDivisions);
      
      if (oldDivision !== newDivision) {
        this.processDivisionChange(playerId, oldDivision, newDivision);
      }
    });
  }
  
  findPlayerInDivisions(playerId, divisions) {
    if (divisions.elite.includes(playerId)) return 'elite';
    if (divisions.challenger.includes(playerId)) return 'challenger';
    if (divisions.prospects.includes(playerId)) return 'prospects';
    return 'relegation';
  }
  
  processDivisionChange(playerId, oldDiv, newDiv) {
    const player = TEAMS[playerId];
    if (!player) {
      console.warn(`⚠️ processDivisionChange: jogador ${playerId} não encontrado em TEAMS, ignorando.`);
      return;
    }
    let history = this.divisionHistory.get(playerId);
    if (!history) {
      // Criar histórico on-demand para jogadores que surgiram após a inicialização
      history = {
        playerId,
        playerName: player.name,
        currentDivision: oldDiv,
        previousDivision: null,
        promotions: 0,
        relegations: 0,
        divisionsSinceStart: [oldDiv]
      };
      this.divisionHistory.set(playerId, history);
    }
    const isPromotion = this.isPromoted(oldDiv, newDiv);
    
    console.log(`${isPromotion ? '📈 PROMOTED' : '📉 RELEGATED'}: ${player.name}`);
    console.log(`   ${oldDiv.toUpperCase()} → ${newDiv.toUpperCase()}`);
    
    // Atualizar histórico do player
    history.previousDivision = oldDiv;
    history.currentDivision = newDiv;
    history.divisionsSinceStart.push(newDiv);
    
    if (isPromotion) {
      history.promotions++;
    } else {
      history.relegations++;
    }
    
    // Log global de mudança
    const changeEntry = {
      playerId,
      playerName: player.name,
      from: oldDiv,
      to: newDiv,
      isPromotion,
      year: this.currentYear,
      month: this.currentMonth,
      bbpRanking: this.getBBPRanking().findIndex(r => r.playerId === playerId) + 1,
      timestamp: Date.now()
    };
    
    this.divisionChangeLog.push(changeEntry);
    
    // Trigger narrativa (se engine disponível)
    if (this.narrativeEngine && this.narrativeEngine.registerDivisionChange) {
      this.narrativeEngine.registerDivisionChange(changeEntry);
    }
    
    // Social media (se engine disponível)
    if (this.socialEngine && this.socialEngine.createDivisionPost) {
      this.socialEngine.createDivisionPost(playerId, oldDiv, newDiv, isPromotion);
    }
  }
  
  isPromoted(oldDiv, newDiv) {
    const hierarchy = {
      elite: 4,
      challenger: 3,
      prospects: 2,
      relegation: 1
    };
    return hierarchy[newDiv] > hierarchy[oldDiv];
  }
  
  getPlayerDivision(playerId) {
    const history = this.divisionHistory.get(playerId);
    return history?.currentDivision || 'prospects';
  }
  
  // ============================================
  // 🌅 SISTEMA DE ERAS E CALENDÁRIO REFORMULADO
  // ============================================
  
  getCurrentEra() {
    const month = this.currentMonth;
    
    // ===== 🔧 CORREÇÃO: Eras definidas internamente (CALENDAR_CONFIG não tem eras) =====
    const ERAS = {
      ASCENSION: { name: 'Era da Ascensão', theme: 'Novos campeões emergem', months: [1, 2, 3, 4] },
      BATTLE:    { name: 'Era da Batalha',  theme: 'Rivalidades se intensificam', months: [5, 6, 7, 8] },
      GLORY:     { name: 'Era da Glória',   theme: 'Lendas são forjadas', months: [9, 10, 11, 12] }
    };
    
    if (ERAS.ASCENSION.months.includes(month)) return ERAS.ASCENSION;
    if (ERAS.BATTLE.months.includes(month)) return ERAS.BATTLE;
    if (ERAS.GLORY.months.includes(month)) return ERAS.GLORY;
    
    return null;
  }
  
  isBreakWeek(tournament) {
    return tournament?.isBreak === true || tournament?.type === 'BREAK_WEEK';
  }
  
  // Determina quais jogadores são elegíveis para um torneio baseado em sua elegibilidade
  getEligiblePlayers(tournament) {
    const eligibility = tournament.eligibility;
    const bbpRanking = this.getBBPRanking();
    
    if (!eligibility) {
      // Se não há requisito específico, todos podem participar
      return bbpRanking.slice(0, tournament.participants).map(r => r.playerId);
    }
    
    let eligibleIds = [];
    
    switch (eligibility) {
      case 'TOP_8_BBP':
        eligibleIds = bbpRanking.slice(0, 8).map(r => r.playerId);
        break;
        
      case 'TOP_16_BBP':
        eligibleIds = bbpRanking.slice(0, 16).map(r => r.playerId);
        break;
        
      case 'TOP_32_BBP':
        eligibleIds = bbpRanking.slice(0, 32).map(r => r.playerId);
        break;
        
      case 'TOP_56_BBP_PLUS_8_WILDCARDS':
        eligibleIds = bbpRanking.slice(0, 56).map(r => r.playerId);
        // Adicionar 8 wild cards
        const wildCards = this.selectWildCards(8, eligibleIds);
        eligibleIds = [...eligibleIds, ...wildCards];
        break;
        
      case 'TOP_56_BBP_PLUS_8_LAST_CHANCE':
        eligibleIds = bbpRanking.slice(0, 56).map(r => r.playerId);
        // Últimas 8 vagas determinadas por qualifying
        const lastChance = this.getLastChanceQualifiers(8, eligibleIds);
        eligibleIds = [...eligibleIds, ...lastChance];
        break;
        
      case 'TOP_7_BBP_PLUS_QUALIFIER':
        eligibleIds = bbpRanking.slice(0, 7).map(r => r.playerId);
        // 8ª vaga do qualifying tournament
        if (this.grandFinalsQualifier) {
          eligibleIds.push(this.grandFinalsQualifier);
        } else {
          // Se ainda não teve qualifying, pegar 8º do ranking
          eligibleIds.push(bbpRanking[7].playerId);
        }
        break;
        
      case 'OUTSIDE_TOP_30':
        eligibleIds = bbpRanking.slice(30, 30 + tournament.participants).map(r => r.playerId);
        break;
        
      case 'OUTSIDE_TOP_56':
        eligibleIds = bbpRanking.slice(56, 56 + tournament.participants).map(r => r.playerId);
        break;
        
      case 'RANK_9_TO_24_BBP':
        eligibleIds = bbpRanking.slice(8, Math.min(24, tournament.participants + 8)).map(r => r.playerId);
        break;
        
      case 'TOP_4_EACH_DIVISION_OUTSIDE_64':
        // Wild Card Showcase
        const divisions = ['elite', 'challenger', 'prospects', 'relegation'];
        divisions.forEach(div => {
          const divPlayers = this.divisions[div] || [];
          const outsideTop64 = divPlayers.filter(pid => {
            const rank = bbpRanking.findIndex(r => r.playerId === pid);
            return rank >= 64;
          });
          eligibleIds.push(...outsideTop64.slice(0, 4));
        });
        break;
        
      case 'TOP_8_BBP_FIRST_HALF':
        // Mid-Season Finals - usar snapshot do meio do ano
        if (this.midSeasonSnapshot) {
          eligibleIds = this.midSeasonSnapshot.slice(0, 8).map(r => r.playerId);
        } else {
          eligibleIds = bbpRanking.slice(0, 8).map(r => r.playerId);
        }
        break;
        
      case 'PAST_CHAMPIONS_AND_TOP_8':
        // Legacy Invitational
        const champions = this.getPastChampions(8);
        const currentTop8 = bbpRanking.slice(0, 8).map(r => r.playerId);
        eligibleIds = [...new Set([...champions, ...currentTop8])].slice(0, tournament.participants);
        break;
        
      default:
        // Default: top N do ranking
        eligibleIds = bbpRanking.slice(0, tournament.participants).map(r => r.playerId);
    }
    
    return eligibleIds.slice(0, tournament.participants);
  }
  
  // Seleciona Wild Cards baseado em performance recente
  selectWildCards(count, excludeIds = []) {
    const bbpRanking = this.getBBPRanking();
    const eligible = bbpRanking.filter(r => !excludeIds.includes(r.playerId));
    
    // Priorizar jogadores com boa forma recente
    const scored = eligible.map(r => {
      const form = this.formManager?.getPlayerForm(r.playerId) || 5;
      const recentPoints = this.getRecentPoints(r.playerId, 3); // últimos 3 meses
      return {
        playerId: r.playerId,
        score: form * 10 + recentPoints
      };
    });
    
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, count).map(s => s.playerId);
  }
  
  // Obtém qualificadores do Last Chance
  getLastChanceQualifiers(count, excludeIds = []) {
    // Se tiver guardado os qualificadores, usar
    if (this.lastChanceQualifiers && this.lastChanceQualifiers.length >= count) {
      return this.lastChanceQualifiers.slice(0, count);
    }
    
    // Senão, pegar próximos do ranking
    const bbpRanking = this.getBBPRanking();
    const eligible = bbpRanking.filter(r => !excludeIds.includes(r.playerId));
    return eligible.slice(0, count).map(r => r.playerId);
  }
  
  // Obtém campeões passados
  getPastChampions(count) {
    const champions = [];
    
    // Pegar dos Grand Finals anteriores
    if (this.grandFinalsHistory && this.grandFinalsHistory.length > 0) {
      this.grandFinalsHistory.forEach(finals => {
        if (finals.winner !== undefined && !champions.includes(finals.winner)) {
          champions.push(finals.winner);
        }
      });
    }
    
    // Pegar dos vencedores de temporada
    if (this.seasonWinners && this.seasonWinners.length > 0) {
      this.seasonWinners.forEach(winner => {
        if (!champions.includes(winner)) {
          champions.push(winner);
        }
      });
    }
    
    // Se não tiver campeões suficientes, pegar top histórico
    if (champions.length < count) {
      const historical = this.getHistoricalRanking();
      historical.forEach(r => {
        if (!champions.includes(r.playerId) && champions.length < count) {
          champions.push(r.playerId);
        }
      });
    }
    
    return champions.slice(0, count);
  }
  
  // Obtém pontos recentes de um jogador
  getRecentPoints(playerId, months = 3) {
    const pointsArray = this.pointsHistory.get(playerId) || [];
    const cutoffMonth = this.currentMonth - months;
    const cutoffYear = this.currentYear + Math.floor(cutoffMonth / 12);
    const normalizedMonth = ((cutoffMonth - 1) % 12) + 1;
    
    return pointsArray.filter(entry => {
      return (entry.year > cutoffYear) || 
             (entry.year === cutoffYear && entry.month >= normalizedMonth);
    }).reduce((sum, entry) => sum + entry.points, 0);
  }
  
  // Gera participantes para eventos especiais
  generateSpecialEventParticipants(tournament) {
    const type = tournament.type;
    const bbpRanking = this.getBBPRanking();
    
    switch (type) {
      case 'TEAM_EVENT':
        return this.generateTeamEventParticipants(tournament);
        
      case 'ALL_STAR':
        return this.generateAllStarParticipants(tournament);
        
      case 'GRUDGE_MATCH':
        return this.generateGrudgeMatchParticipants(tournament);
        
      case 'REGIONAL':
        return this.generateRegionalParticipants(tournament);
        
      default:
        return this.getEligiblePlayers(tournament);
    }
  }
  
  // Gera times para eventos de equipe
  generateTeamEventParticipants(tournament) {
    const regions = {
      'North America': ['🇺🇸 EUA', '🇨🇦 Canadá', '🇲🇽 México'],
      'South America': ['🇧🇷 Brasil', '🇦🇷 Argentina'],
      'Europe': ['🇫🇷 França', '🇩🇪 Alemanha', '🇬🇧 Inglaterra', '🇮🇹 Itália'],
      'East Asia': ['🇯🇵 Japão', '🇨🇳 China', '🇰🇷 Coreia do Sul'],
      'South Asia': ['🇮🇳 Índia'],
      'Africa': ['🇪🇬 Egito', '🇿🇦 África do Sul'],
      'Oceania': ['🇦🇺 Austrália', '🇳🇿 Nova Zelândia']
    };
    
    const teams = [];
    const teamSize = tournament.teamSize || 3;
    
    Object.entries(regions).forEach(([regionName, countries]) => {
      const regionPlayers = TEAMS
        .map((t, idx) => ({ id: idx, ...t }))
        .filter(p => countries.includes(p.country))
        .sort((a, b) => {
          const aBBP = this.bbpRankings.get(a.id) || 0;
          const bBBP = this.bbpRankings.get(b.id) || 0;
          return bBBP - aBBP;
        })
        .slice(0, teamSize)
        .map(p => p.id);
      
      if (regionPlayers.length >= teamSize) {
        teams.push({
          region: regionName,
          players: regionPlayers
        });
      }
    });
    
    return teams;
  }
  
  // Gera participantes para All-Star
  generateAllStarParticipants(tournament) {
    // Mix de top players e fan favorites
    const bbpRanking = this.getBBPRanking();
    const topPlayers = bbpRanking.slice(0, 16).map(r => r.playerId);
    
    // Adicionar alguns players com boa forma mas ranking mais baixo
    const risingStars = bbpRanking.slice(16, 40)
      .filter(r => {
        const form = this.formManager?.getPlayerForm(r.playerId) || 5;
        return form >= 7;
      })
      .slice(0, 8)
      .map(r => r.playerId);
    
    return [...topPlayers, ...risingStars].slice(0, tournament.participants);
  }
  
  // Gera matches para Grudge Matches
  generateGrudgeMatchParticipants(tournament) {
    // Identificar confrontos históricos
    const matchups = [];
    const used = new Set();
    
    // Procurar por jogadores que se enfrentaram múltiplas vezes recentemente
    TEAMS.forEach((t1, id1) => {
      if (used.has(id1)) return;
      
      TEAMS.forEach((t2, id2) => {
        if (id1 >= id2 || used.has(id2)) return;
        
        const recentMatches = this.getRecentMatchupCount(id1, id2, 6); // últimos 6 meses
        
        if (recentMatches >= 3) {
          matchups.push({ player1: id1, player2: id2, matches: recentMatches });
          used.add(id1);
          used.add(id2);
        }
      });
    });
    
    // Ordenar por número de confrontos
    matchups.sort((a, b) => b.matches - a.matches);
    
    // Se não tiver confrontos suficientes, adicionar top players
    if (matchups.length < tournament.participants / 2) {
      const bbpRanking = this.getBBPRanking();
      for (let i = 0; i < bbpRanking.length - 1 && matchups.length < tournament.participants / 2; i += 2) {
        const p1 = bbpRanking[i].playerId;
        const p2 = bbpRanking[i + 1].playerId;
        
        if (!used.has(p1) && !used.has(p2)) {
          matchups.push({ player1: p1, player2: p2, matches: 0 });
          used.add(p1);
          used.add(p2);
        }
      }
    }
    
    return matchups.slice(0, tournament.participants / 2);
  }
  
  // Conta confrontos recentes entre dois jogadores
  getRecentMatchupCount(player1, player2, months = 6) {
    if (!this.matchLog) return 0;
    
    const cutoffMonth = this.currentMonth - months;
    const cutoffYear = this.currentYear + Math.floor(cutoffMonth / 12);
    const normalizedMonth = ((cutoffMonth - 1) % 12) + 1;
    
    return this.matchLog.filter(match => {
      const isRecent = (match.year > cutoffYear) || 
                      (match.year === cutoffYear && match.month >= normalizedMonth);
      const isMatchup = (match.player1 === player1 && match.player2 === player2) ||
                       (match.player1 === player2 && match.player2 === player1);
      return isRecent && isMatchup;
    }).length;
  }
  
  // Gera participantes regionais
  generateRegionalParticipants(tournament) {
    const regions = tournament.regions || 6;
    const regionMapping = {
      'North America': ['🇺🇸 EUA', '🇨🇦 Canadá', '🇲🇽 México'],
      'South America': ['🇧🇷 Brasil', '🇦🇷 Argentina'],
      'Europe': ['🇫🇷 França', '🇩🇪 Alemanha', '🇬🇧 Inglaterra', '🇮🇹 Itália'],
      'East Asia': ['🇯🇵 Japão', '🇨🇳 China', '🇰🇷 Coreia do Sul'],
      'South Asia & Africa': ['🇮🇳 Índia', '🇪🇬 Egito', '🇿🇦 África do Sul'],
      'Oceania': ['🇦🇺 Austrália', '🇳🇿 Nova Zelândia']
    };
    
    const champions = [];
    
    Object.entries(regionMapping).forEach(([region, countries]) => {
      const regionPlayers = TEAMS
        .map((t, idx) => ({ id: idx, ...t }))
        .filter(p => countries.includes(p.country))
        .sort((a, b) => {
          const aBBP = this.bbpRankings.get(a.id) || 0;
          const bBBP = this.bbpRankings.get(b.id) || 0;
          return bBBP - aBBP;
        });
      
      if (regionPlayers.length > 0) {
        champions.push({
          region: region,
          player: regionPlayers[0].id
        });
      }
    });
    
    return champions.slice(0, regions).map(c => c.player);
  }
  
  // Aplica multiplicador de pontos se aplicável
  applyPointsMultiplier(points, tournament) {
    let multiplier = 1.0;
    
    if (tournament.pointsMultiplier) {
      multiplier = tournament.pointsMultiplier;
    }
    
    if (tournament.specialRules?.pointsMultiplier) {
      multiplier = tournament.specialRules.pointsMultiplier;
    }
    
    // ===== 🔧 CORREÇÃO: Validação de multiplicador =====
    if (multiplier === 0) {
      console.warn(`⚠️  [MULT] Multiplicador ZERO detectado!`);
      console.warn(`   Torneio: ${tournament.name}`);
      console.warn(`   Pontos base: ${points}`);
      console.warn(`   Multiplicador será ignorado (usando 1.0)`);
      multiplier = 1.0;
    }
    
    if (multiplier < 0) {
      console.error(`❌ [MULT] Multiplicador NEGATIVO detectado: ${multiplier}`);
      console.error(`   Torneio: ${tournament.name}`);
      console.error(`   Usando multiplicador 1.0`);
      multiplier = 1.0;
    }
    
    const result = Math.round(points * multiplier);
    
    // Log apenas se multiplicador for diferente de 1
    if (multiplier !== 1.0) {
      console.log(`🔢 [MULT] ${points} × ${multiplier} = ${result}`);
    }
    
    return result;
  }
  
  // Salva snapshot do ranking para Mid-Season Finals
  saveMidSeasonSnapshot() {
    if (this.currentMonth === 8) { // Agosto
      this.midSeasonSnapshot = this.getBBPRanking();
      console.log('📸 Mid-Season snapshot saved!');
    }
  }
  
  // Determina se é final de Era (para atualização de divisões)
  isEndOfEra() {
    return [4, 8, 12].includes(this.currentMonth);
  }
  
  // Atualiza divisões apenas no fim de cada Era
  updateDivisionsEndOfEra() {
    if (this.isEndOfEra()) {
      const era = this.getCurrentEra();
      console.log(`🔄 Atualizando divisões ao final da ${era?.name || 'Era'}...`);
      this.updateDivisions();
      return true;
    }
    return false;
  }
  
  // Obtém a configuração de pontos correta para um torneio
  getPointsConfigForTournament(tournament) {
    // ===== BREAK_WEEK não dá pontos =====
    if (tournament.type === 'BREAK_WEEK' || tournament.isBreak) {
      return { R64: 0, R32: 0, R16: 0, QF: 0, SF: 0, F: 0, F_LOSER: 0, F_WINNER: 0 };
    }

    // ===== PRIORIDADE 1: usar pointsStructure definido no CalendarConfig =====
    const structureName = tournament.pointsStructure;
    if (structureName) {
      const s = this.getPointsStructure(structureName);
      if (s) {
        if (!this._turboMode) console.log(`💎 [PONTOS] ${tournament.name} → ${structureName}`);
        // Se for formato de liga (first/second/third...) retornar como está
        if (s.first !== undefined) return s;
        // Se for formato de torneio knockout, converter para chaves que advanceRound usa
        return {
          R64: s.r64 || 0,
          R32: s.r32 || 0,
          R16: s.r16 || s.r8 || 0,  // r8 é o alias para R16 em torneios de 16 jogadores (Invitational)
          QF:  s.quarterfinalist || 0,
          SF:  s.semifinalist || 0,
          F:   0,
          F_LOSER:  s.finalist || 0,
          F_WINNER: s.champion || 0
        };
      }
    }

    // ===== PRIORIDADE 2: mapear tier → pointsStructure como fallback =====
    const tierMap = {
      'KINGS_COURT':   'KINGS_COURT_LEAGUE',
      'PREMIER':       'PREMIER_2000',
      'MASTERS':       'MASTERS_1000',
      'CHALLENGER':    'CHALLENGER_500',
      'REDEMPTION':    'REDEMPTION_250',
      'RISING_STAR':   'RISING_STAR_200',
      'RISING_FINALS': 'RISING_FINALS_LEAGUE',
      'SIGNATURE_CLASH': 'SIGNATURE_CLASH_1500'
    };
    const mappedName = tierMap[tournament.tier];
    if (mappedName) {
      const s = this.getPointsStructure(mappedName);
      if (s) {
        console.log(`⚠️  [PONTOS] ${tournament.name} sem pointsStructure → fallback tier '${tournament.tier}' → ${mappedName}`);
        if (s.first !== undefined) return s;
        return {
          R64: s.r64 || 0,
          R32: s.r32 || 0,
          R16: s.r16 || s.r8 || 0,
          QF:  s.quarterfinalist || 0,
          SF:  s.semifinalist || 0,
          F:   0,
          F_LOSER:  s.finalist || 0,
          F_WINNER: s.champion || 0
        };
      }
    }

    // ===== PRIORIDADE 3: POINTS_CONFIG legado (tipos especiais antigos) =====
    if (POINTS_CONFIG[tournament.type]) {
      console.log(`⚠️  [PONTOS] ${tournament.name} → POINTS_CONFIG legado tipo '${tournament.type}'`);
      return POINTS_CONFIG[tournament.type];
    }

    // ===== FALLBACK FINAL: Masters como padrão razoável =====
    console.error(`❌ [PONTOS] Sem config para "${tournament.name}" (tier: ${tournament.tier}, type: ${tournament.type}) → usando MASTERS_1000`);
    const def = this.getPointsStructure('MASTERS_1000');
    return { R64: 0, R32: 0, R16: def.r16, QF: def.quarterfinalist, SF: def.semifinalist, F: 0, F_LOSER: def.finalist, F_WINNER: def.champion };
  }
  
  getDivisionBenefits(division) {
    const benefits = {
      elite: {
        autoQualifiedGrandSlams: true,
        autoQualifiedMasters: true,
        prizeMoneyBonus: 0.10,
        wildcardChance: 0,
        badge: '👑',
        color: '#FFD700',
        label: 'ELITE DIVISION'
      },
      challenger: {
        autoQualifiedGrandSlams: false,
        autoQualifiedMasters: true,
        prizeMoneyBonus: 0.05,
        wildcardChance: 0.15,
        badge: '⚔️',
        color: '#C0C0C0',
        label: 'CHALLENGER DIVISION'
      },
      prospects: {
        autoQualifiedGrandSlams: false,
        autoQualifiedMasters: false,
        prizeMoneyBonus: 0,
        wildcardChance: 0.25,
        badge: '🌟',
        color: '#CD7F32',
        label: 'PROSPECTS DIVISION'
      },
      relegation: {
        autoQualifiedGrandSlams: false,
        autoQualifiedMasters: false,
        prizeMoneyBonus: -0.10,
        wildcardChance: 0.05,
        badge: '⚠️',
        color: '#666666',
        label: 'RELEGATION ZONE'
      }
    };
    
    return benefits[division] || benefits.prospects;
  }
  
  // ===== WILD CARD SYSTEM =====
  
  awardWildCards() {
    console.log('🎟️ Calculando Wild Cards...');
    
    const wildCardCount = 4;
    const candidates = [];
    
    TEAMS.forEach((team, id) => {
      const division = this.getPlayerDivision(id);
      
      // Elite já está qualificado, não precisa de wild card
      if (division === 'elite') return;
      
      const formSummary = this.formManager?.getFormaSummary(id);
      const history = this.playerHistories.get(id);
      const career = this.careerSystem?.getCareer(team.name);
      
      // Calcular score de wild card
      const score = this.calculateWildCardScore({
        division,
        formMultiplier: formSummary?.statsMultiplier || 1.0,
        grandSlamTitles: history?.titles?.grandSlams || 0,
        careerLevel: career?.level || 1,
        recentPerformance: this.getRecentWinRate(id, 5)
      });
      
      candidates.push({ playerId: id, score, division });
    });
    
    // Ordenar por score
    candidates.sort((a, b) => b.score - a.score);
    
    // Pegar top 4
    this.wildCards = candidates.slice(0, wildCardCount).map(c => c.playerId);
    
    console.log('🎟️ WILD CARDS CONCEDIDOS:');
    this.wildCards.forEach((id, idx) => {
      const player = TEAMS[id];
      const division = this.getPlayerDivision(id);
      const score = candidates.find(c => c.playerId === id)?.score || 0;
      
      console.log(`   ${idx + 1}. ${player.name} (${division.toUpperCase()}) - Score: ${score.toFixed(1)}`);
      
      // Adicionar ao histórico
      this.wildCardHistory.push({
        playerId: id,
        playerName: player.name,
        reason: 'Monthly Selection',
        division,
        score,
        grantedAt: { year: this.currentYear, month: this.currentMonth },
        expiresAt: { 
          year: this.currentMonth + 3 > 12 ? this.currentYear + 1 : this.currentYear, 
          month: this.currentMonth + 3 > 12 ? this.currentMonth - 9 : this.currentMonth + 3
        }
      });
    });
    
    return this.wildCards;
  }
  
  calculateWildCardScore({ division, formMultiplier, grandSlamTitles, careerLevel, recentPerformance }) {
    let score = 0;
    
    // 1. Forma atual (0-50 pontos)
    score += (formMultiplier - 0.5) * 100;
    
    // 2. Ex-campeões de Grand Slam (0-25 pontos)
    score += Math.min(grandSlamTitles * 8, 25);
    
    // 3. Level de carreira (0-20 pontos)
    score += Math.min(careerLevel, 20);
    
    // 4. Performance recente (0-25 pontos)
    score += recentPerformance * 25;
    
    // 6. Division handicap
    const divisionBonus = {
      relegation: 15,
      prospects: 10,
      challenger: 5,
      elite: 0
    };
    score += divisionBonus[division] || 0;
    
    // 7. Fator sorte (0-10 pontos)
    score += Math.random() * 10;
    
    return score;
  }
  
  getRecentWinRate(playerId, matchCount) {
    const history = this.playerHistories.get(playerId);
    const recentTournaments = history?.tournamentHistory?.slice(-matchCount) || [];
    
    if (recentTournaments.length === 0) return 0;
    
    const wins = recentTournaments.filter(t => 
      t.result === 'CHAMPION' || t.result === 'FINALIST'
    ).length;
    
    return wins / recentTournaments.length;
  }
  
  hasValidWildCard(playerId) {
    const now = { year: this.currentYear, month: this.currentMonth };
    
    return this.wildCardHistory.some(wc => {
      if (wc.playerId !== playerId) return false;
      
      // Check se ainda não expirou
      const expired = (wc.expiresAt.year < now.year) || 
                     (wc.expiresAt.year === now.year && wc.expiresAt.month < now.month);
      
      return !expired;
    });
  }
  
  // ===== QUALIFYING TOURNAMENTS =====
  
  generateQualifyingTournament() {
    const monthConfig = this.getCurrentMonthConfig();
    const isGrandSlamMonth = monthConfig?.tournaments?.[0]?.type === 'GRAND_SLAM';
    
    if (!isGrandSlamMonth) return null;
    
    console.log('🎫 Gerando Qualifying Tournament para Grand Slam...');
    
    // Jogadores que precisam qualificar
    const needToQualify = [];
    
    TEAMS.forEach((team, id) => {
      const division = this.getPlayerDivision(id);
      
      // Elite: auto-qualified
      if (division === 'elite') return;
      
      // Com wild card: não precisa qualificar
      if (this.hasValidWildCard(id)) {
        console.log(`   🎟️ ${team.name} has Wild Card - auto-qualified`);
        return;
      }
      
      // Resto: precisa qualificar
      needToQualify.push(id);
    });
    
    // Ordenar por BBP
    needToQualify.sort((a, b) => {
      const bbpA = this.bbpRankings.get(a) || 0;
      const bbpB = this.bbpRankings.get(b) || 0;
      return bbpB - bbpA;
    });
    
    // Top 64 participam do qualifying
    const qualifyingPlayers = needToQualify.slice(0, 64);
    
    console.log(`   📊 ${qualifyingPlayers.length} players precisam qualificar`);
    console.log(`   🎯 Top 16 avançam para Main Draw`);
    
    return {
      name: `${monthConfig.tournaments[0].name} - QUALIFYING`,
      type: 'QUALIFYING',
      tier: 'QUALIFYING',
      arena: 'BB-10 Competitive',
      matchFormat: 'MD3',
      arenaRotation: null,
      participants: 64,
      players: qualifyingPlayers,
      advancingSlots: 16,
      
      rewards: {
        qualified: 'GRAND_SLAM_MAIN_DRAW',
        quarterFinalists: 15,
        runnerUp: 25,
        winner: 50
      }
    };
  }
  
  processQualifyingResults(qualifiers) {
    console.log('✅ QUALIFIED FOR GRAND SLAM MAIN DRAW:');
    
    this.qualifiedPlayers = qualifiers.slice(0, 16);
    
    this.qualifiedPlayers.forEach((playerId, idx) => {
      const player = TEAMS[playerId];
      console.log(`   ${idx + 1}. ${player.name}`);
    });
    
    return this.qualifiedPlayers;
  }
  
  canParticipateInGrandSlam(playerId) {
    const division = this.getPlayerDivision(playerId);
    
    // Elite: sempre qualificado
    if (division === 'elite') return true;
    
    // Wild card holders
    if (this.hasValidWildCard(playerId)) return true;
    
    // Qualificados via qualifying
    if (this.qualifiedPlayers.includes(playerId)) return true;
    
    return false;
  }
  
  // ====================================================
  // FASE 2: GRAND FINALS & STAKES
  // ====================================================
  
  shouldGenerateGrandFinals() {
    // Grand Finals acontecem em Dezembro, APÓS o Grand Slam normal
    return this.currentMonth === 12 && this.currentTournamentIndex === 1;
  }
  
  generateGrandFinals() {
    console.log('');
    console.log('🏆🏆🏆 GENERATING GRAND FINALS 🏆🏆🏆');
    console.log('');
    console.log('The TOP 8 players of the year will compete for ultimate glory!');
    console.log('');
    
    // Get top 8 do BBP Ranking
    const bbpRanking = this.getBBPRanking();
    const top8 = bbpRanking.slice(0, 8);
    
    console.log('📊 GRAND FINALS QUALIFIERS:');
    top8.forEach((entry, idx) => {
      const player = TEAMS[entry.playerId];
      const division = this.getPlayerDivision(entry.playerId);
      console.log(`   ${idx + 1}. ${player.name} (${division.toUpperCase()}) - ${entry.points} BBP`);
    });
    console.log('');
    
    const grandFinals = {
      name: '🏆 BEYBLADE GRAND FINALS ' + this.currentYear,
      type: 'GRAND_FINALS',
      tier: 'CHAMPIONSHIP',
      arena: 'ALL',
      matchFormat: 'MD7',
      arenaRotation: 'choice',
      participants: 8,
      seeds: top8.map(e => e.playerId),
      year: this.currentYear,
      
      specialRules: {
        doubleElimination: true,
        arenaChoice: 'alternate',
        prizePool: 2000000,
        legacyPoints: true,
        hallOfFameEntry: true,
        bestOf7: true
      },
      
      prizes: {
        champion: 800000,
        finalist: 400000,
        thirdPlace: 200000,
        fourthPlace: 100000,
        quarterFinalists: 50000
      },
      
      legacyBonuses: {
        champion: 1000,
        finalist: 600,
        thirdPlace: 400,
        fourthPlace: 250,
        quarterFinalists: 150
      },
      
      description: 'The ultimate championship. The best of the best compete for glory, fortune, and immortality.'
    };
    
    // Criar bracket
    const bracket = this.createDoubleEliminationBracket(top8.map(e => e.playerId));
    this.currentGrandFinalsBracket = bracket;
    
    // Trigger narrativa
    if (this.narrativeEngine && this.narrativeEngine.startGrandFinalsNarrative) {
      this.narrativeEngine.startGrandFinalsNarrative(top8.map(e => e.playerId));
    }
    
    // Social media hype
    if (this.socialEngine && this.socialEngine.createGrandFinalsHype) {
      this.socialEngine.createGrandFinalsHype(top8.map(e => e.playerId));
    }
    
    return { tournament: grandFinals, bracket };
  }
  
  createDoubleEliminationBracket(seeds) {
    console.log('🎯 Criando Double Elimination Bracket...');
    
    return {
      type: 'DOUBLE_ELIMINATION',
      
      // Winners Bracket (upper bracket)
      winnersBracket: {
        quarterFinals: [
          { 
            id: 'WB-QF1',
            seed1: seeds[0], 
            seed2: seeds[7], 
            winner: null,
            loser: null,
            match: '1 vs 8'
          },
          { 
            id: 'WB-QF2',
            seed1: seeds[3], 
            seed2: seeds[4], 
            winner: null,
            loser: null,
            match: '4 vs 5'
          },
          { 
            id: 'WB-QF3',
            seed1: seeds[1], 
            seed2: seeds[6], 
            winner: null,
            loser: null,
            match: '2 vs 7'
          },
          { 
            id: 'WB-QF4',
            seed1: seeds[2], 
            seed2: seeds[5], 
            winner: null,
            loser: null,
            match: '3 vs 6'
          }
        ],
        semiFinals: [],
        final: null
      },
      
      // Losers Bracket (lower bracket)
      losersBracket: {
        round1: [],
        round2: [],
        round3: [],
        semiFinal: null,
        final: null
      },
      
      // Grand Final
      grandFinal: {
        winnersChampion: null,
        losersChampion: null,
        winner: null,
        resetBracket: true
      }
    };
  }
  
  awardGrandFinalsRewards(placement, playerId) {
    const player = TEAMS[playerId];
    
    // Prize money
    const prizes = {
      1: 800000,
      2: 400000,
      3: 200000,
      4: 100000
    };
    
    const prize = prizes[placement] || 50000;
    
    // Legacy BBP
    const legacyBonuses = {
      1: 1000,
      2: 600,
      3: 400,
      4: 250
    };
    
    const legacyBonus = legacyBonuses[placement] || 150;
    
    console.log('');
    console.log(`💰 ${player.name} - GRAND FINALS REWARDS:`);
    console.log(`   Prize Money: $${prize.toLocaleString()}`);
    console.log(`   Legacy BBP Bonus: ${legacyBonus} points`);
    
    // Adicionar BBP
    this.addPoints(playerId, legacyBonus, `Grand Finals ${this.currentYear} - ${placement}º Lugar`);
    
    // Achievement especial
    if (placement === 1) {
      console.log('');
      console.log('👑👑👑 GRAND FINALS CHAMPION! 👑👑👑');
      console.log(`   ${player.name} É O CAMPEÃO DO ANO ${this.currentYear}!`);
      console.log('');
      
      // Title permanente
      const career = this.careerSystem?.getCareer(player.name);
      if (career) {
        career.titles = career.titles || [];
        career.titles.push(`Grand Finals Champion ${this.currentYear}`);
        career.grandFinalsWins = (career.grandFinalsWins || 0) + 1;
        career.grandFinalsAppearances = (career.grandFinalsAppearances || 0) + 1;
      }
      
      // Hall of Fame
      this.addToHallOfFame(playerId, `Grand Finals Champion ${this.currentYear}`);
      
    } else {
      // Outros: apenas appearance
      const career = this.careerSystem?.getCareer(player.name);
      if (career) {
        career.grandFinalsAppearances = (career.grandFinalsAppearances || 0) + 1;
      }
    }
    
    // Salvar no histórico de Grand Finals
    this.grandFinalsHistory.push({
      year: this.currentYear,
      champion: placement === 1 ? playerId : null,
      finalist: placement === 2 ? playerId : null,
      top8: placement <= 8 ? playerId : null,
      placement,
      playerId,
      playerName: player.name,
      prize,
      legacyBonus
    });
    
    return { prize, legacyBonus };
  }
  
  addToHallOfFame(playerId, reason) {
    const player = TEAMS[playerId];
    
    this.hallOfFame.push({
      playerId,
      playerName: player.name,
      reason,
      year: this.currentYear,
      inductedAt: Date.now(),
      category: 'GRAND_FINALS_CHAMPION'
    });
    
    console.log(`🏛️ HALL OF FAME ENTRY: ${player.name}`);
    console.log(`   Reason: ${reason}`);
  }
  
  // ====================================================
  // FASE 4: ACHIEVEMENTS
  // ====================================================
  
  checkPlayerAchievements(playerId) {
    if (!this.achievementEngine) return [];
    
    const unlocked = this.achievementEngine.checkAchievements(playerId, this);
    
    if (unlocked.length > 0) {
      console.log(`🎉 ${TEAMS[playerId].name} unlocked ${unlocked.length} achievement(s)!`);
    }
    
    return unlocked;
  }
  
  checkAllAchievements() {
    TEAMS.forEach((team, id) => {
      this.checkPlayerAchievements(id);
    });
  }

  getTournamentStorylines(tournamentId) {
    const storylines = [];
    const tournament = this.tournamentArchive.get(tournamentId);
    
    if (!tournament) return storylines;
    
    const participants = tournament.participants || [];
    
    // Player defendendo #1
    const topRanked = participants.find(p => this.getBBPRanking(p.id) === 1);
    if (topRanked) {
      storylines.push({
        icon: '👑',
        text: `${topRanked.name} defends #1 ranking`
      });
    }
    
    // Division debuts
    participants.forEach(player => {
      const rank = this.getBBPRanking(player.id);
      const divisionHistory = this.divisionHistory.get(player.id);
      
      if (divisionHistory && divisionHistory.currentDivision === 'elite' && 
          divisionHistory.previousDivision !== 'elite') {
        storylines.push({
          icon: '🌟',
          text: `${player.name}'s Elite Division debut`
        });
      }
    });
    
    // Players on streaks
    participants.forEach(player => {
      const history = this.playerHistories.get(player.id);
      if (history && history.recentResults) {
        const recent = history.recentResults;
        let streak = 0;
        const lastResult = recent[recent.length - 1];
        
        for (let i = recent.length - 1; i >= 0; i--) {
          if (recent[i] === lastResult) streak++;
          else break;
        }
        
        if (streak >= 5 && lastResult === 'W') {
          storylines.push({
            icon: '🔥',
            text: `${player.name} on ${streak}-game win streak`
          });
        }
      }
    });
    
    return storylines;
  }

  getTournamentPredictions(tournamentId, participants) {
    if (!participants || participants.length === 0) {
      return { favorites: [], darkHorse: null };
    }
    
    // Calcula chances baseado em form + BBP + arena preference
    const predictions = participants.map(player => {
      const rank = this.getBBPRanking(player.id);
      const form = this.formManager?.getPlayerForm(player.id);
      const formValue = form?.current || 50;
      
      // Formula simples: ranking + form + random factor
      const rankScore = (65 - rank) * 2; // Max 128 para rank 1
      const formScore = formValue; // Max 100
      const randomFactor = Math.random() * 20; // Max 20
      
      const totalScore = rankScore + formScore + randomFactor;
      const chance = Math.min(95, Math.max(5, (totalScore / 250) * 100));
      
      return {
        id: player.id,
        name: player.name,
        chance: Math.round(chance),
        rank,
        form: formValue
      };
    });
    
    // Ordena por chance
    predictions.sort((a, b) => b.chance - a.chance);
    
    // Favorites = top 5
    const favorites = predictions.slice(0, 5);
    
    // Dark horse = jogador com rank mais baixo nos top 15
    const darkHorseCandidates = predictions.slice(0, 15).filter(p => p.rank > 20);
    const darkHorse = darkHorseCandidates.length > 0 ? {
      ...darkHorseCandidates[0],
      reason: `Rank #${darkHorseCandidates[0].rank} with hot form (${darkHorseCandidates[0].form}/100)`
    } : null;
    
    return { favorites, darkHorse };
  }

  getMatchImportance(match) {
    if (!match || !match.player1 || !match.player2) return null;
    
    let score = 0;
    const reasons = [];
    
    const p1 = match.player1;
    const p2 = match.player2;
    const rank1 = this.getBBPRanking(p1.id);
    const rank2 = this.getBBPRanking(p2.id);
    
    // Ranking gap (upset potential)
    const gap = Math.abs(rank1 - rank2);
    if (gap > 10) {
      score += gap * 2;
      reasons.push(`🎯 Upset potential (${gap} rank difference)`);
    }
    
    // Top seed defense
    if (rank1 === 1 || rank2 === 1) {
      score += 25;
      reasons.push('👑 Top seed defense');
    }
    
    // Division stakes
    if (this.playerInRelegationDanger(p1.id) || this.playerInRelegationDanger(p2.id)) {
      score += 30;
      reasons.push('⚠️ Relegation implications');
    }
    
    // Hot streak
    const form1 = this.formManager?.getPlayerForm(p1.id);
    const form2 = this.formManager?.getPlayerForm(p2.id);
    if (form1?.status === 'hot' || form2?.status === 'hot') {
      score += 20;
      reasons.push('🔥 Player on fire');
    }
    
    // Achievement potential
    if (this.achievementEngine?.isOneWinAway(p1.id) || this.achievementEngine?.isOneWinAway(p2.id)) {
      score += 25;
      reasons.push('💎 Achievement unlock possible');
    }
    
    // Elite debut
    const p1History = this.divisionHistory.get(p1.id);
    const p2History = this.divisionHistory.get(p2.id);
    if ((p1History && p1History.currentDivision === 'elite' && p1History.previousDivision !== 'elite') ||
        (p2History && p2History.currentDivision === 'elite' && p2History.previousDivision !== 'elite')) {
      score += 20;
      reasons.push('🌟 Elite Division debut');
    }
    
    const priority = score > 50 ? 'HIGH' : score > 30 ? 'MEDIUM' : 'LOW';
    
    return { score, reasons, priority };
  }

  playerInRelegationDanger(playerId) {
    const rank = this.getBBPRanking(playerId);
    const playerBBP = this.bbpRankings.get(playerId) || 0;
    
    if (rank <= 16) {
      // Elite player - check margin
      const cutoffPlayer = this.players.find(p => this.getBBPRanking(p.id) === 17);
      const cutoffBBP = cutoffPlayer ? this.bbpRankings.get(cutoffPlayer.id) || 0 : 0;
      const margin = playerBBP - cutoffBBP;
      return margin < 200;
    }
    
    if (rank > 40 && rank <= 64) {
      // Prospects close to relegation
      return rank > 60;
    }
    
    return false;
  }

  getClosestToUnlock(achievementId) {
    // Retorna players mais perto de desbloquear um achievement
    const achievement = this.achievementEngine?.getAchievement(achievementId);
    if (!achievement) return [];
    
    const playerProgress = this.players.map(player => {
      const progress = this.achievementEngine?.getPlayerProgress(player.id, achievementId) || 0;
      const progressText = `${progress.current || 0}/${progress.required || 1}`;
      const progressPercent = progress.required > 0 ? 
        Math.round((progress.current / progress.required) * 100) : 0;
      
      return {
        id: player.id,
        name: player.name,
        progress: progressPercent,
        progressText
      };
    });
    
    return playerProgress
      .filter(p => p.progress > 0 && p.progress < 100)
      .sort((a, b) => b.progress - a.progress)
      .slice(0, 3);
  }

  getAchievementProgress(playerId, achievementId) {
    return this.achievementEngine?.getPlayerProgress(playerId, achievementId) || {
      current: 0,
      required: 1,
      percentage: 0
    };
  }

  getDivisionChangeInfo(playerId) {
    const history = this.divisionHistory.get(playerId);
    if (!history) return null;
    
    return {
      currentDivision: history.currentDivision,
      previousDivision: history.previousDivision,
      promotions: history.promotions || 0,
      relegations: history.relegations || 0,
      monthsInCurrent: history.monthsInCurrent || 0
    };
  }

  getPromotionRelegationChances(playerId) {
    const rank = this.getBBPRanking(playerId);
    const bbp = this.bbpRankings.get(playerId) || 0;
    
    const result = {
      canBePromoted: false,
      canBeRelegated: false,
      promotionTarget: null,
      relegationRisk: 'safe',
      pointsToPromotion: 0,
      pointsAboveRelegation: 0
    };
    
    if (rank <= 16) {
      // Elite - can't be promoted, check relegation
      const cutoffPlayer = this.players.find(p => this.getBBPRanking(p.id) === 17);
      const cutoffBBP = cutoffPlayer ? this.bbpRankings.get(cutoffPlayer.id) || 0 : 0;
      const margin = bbp - cutoffBBP;
      
      result.canBeRelegated = true;
      result.pointsAboveRelegation = margin;
      result.relegationRisk = margin > 500 ? 'safe' : margin > 200 ? 'watch' : 'danger';
    } else if (rank <= 40) {
      // Challenger - can be promoted or relegated
      const eliteCutoff = this.bbpRankings.get(
        this.players.find(p => this.getBBPRanking(p.id) === 16)?.id
      ) || 0;
      const prospectsCutoff = this.bbpRankings.get(
        this.players.find(p => this.getBBPRanking(p.id) === 41)?.id
      ) || 0;
      
      result.canBePromoted = true;
      result.canBeRelegated = true;
      result.promotionTarget = 'elite';
      result.pointsToPromotion = eliteCutoff - bbp;
      result.pointsAboveRelegation = bbp - prospectsCutoff;
      result.relegationRisk = result.pointsAboveRelegation > 200 ? 'safe' : 'watch';
    } else if (rank <= 64) {
      // Prospects - can be promoted
      const challengerCutoff = this.bbpRankings.get(
        this.players.find(p => this.getBBPRanking(p.id) === 40)?.id
      ) || 0;
      
      result.canBePromoted = true;
      result.promotionTarget = 'challenger';
      result.pointsToPromotion = challengerCutoff - bbp;
    }
    
    return result;
  }

  // ═══════════════════════════════════════════════════════════════
  // 📥📤 EXPORT/IMPORT DE DADOS EM JSON
  // ═══════════════════════════════════════════════════════════════

  /**
   * Exporta todos os dados do universo para um objeto JSON
   * Retorna um objeto com toda a informação da temporada atual
   */
  exportToJSON() {
    // =========================================================
    // 🗜️ SAVE SIZE MANAGER v2.0 — ESTRATÉGIA 250 ANOS
    //
    // OPERACIONAL — rolling window (só importa o recente):
    //   matchLog            cap 1000  ~log de partidas recentes
    //
    // HISTÓRICO PERMANENTE — NUNCA cortado:
    //   hallOfFame          ~1/ano × 100B   → 25KB em 250 anos   ✓
    //   grandFinalsHistory  ~8/ano × 120B   → 240KB em 250 anos  ✓
    //   seasonWinners       ~1/ano × 30B    → 7KB em 250 anos    ✓
    //   historicalRankings  counters fixos por player             ✓
    //   divisionChangeLog   ~20/ano × 200B  → 1MB em 250 anos    ✓
    //   tournamentArchive   TODOS (sem cap) → 250×8 = 2000 torneios ✓
    //   rankingHistory      TODOS os snapshots mensais            ✓
    //   matchHistory        TODOS para recordes de upsets         ✓
    //   wildCardHistory     TODOS                                 ✓
    //
    // COMPRIMIDO — mantém TODAS as entradas, reduz bytes por entry:
    //   tournamentHistory   150B → 45B (chaves curtas)            ✓
    //   eventHistory        200B → 60B (chaves curtas)            ✓
    //   attrHistory         já pequeno, só comprime chaves        ✓
    //
    // RECORDES ETERNOS (campos permanentes em playerHistories):
    //   bestSeasonPointsEver / bestSeasonPointsYear  → não depende de pointsHistory
    //   bestSeasonTitlesEver / bestSeasonTitlesYear  → salvo ao fim de cada temporada
    //   allTimeSeasons → log compacto de pts+títulos por temporada
    //
    // NATURALMENTE LIMITADO:
    //   pointsHistory  expira em 18 meses (apenas para ranking corrente BBP)
    // =========================================================

    // ── tournamentArchive: strip campos pesados, manter TODOS (memória de 250+ anos)
    const slimArchive = Array.from(this.tournamentArchive.entries())
      .map(([key, val]) => {
        // eslint-disable-next-line no-unused-vars
        const { bracket, tournament, ...slim } = val;
        return [key, slim];
      });

    // ── playerHistories: COMPRIMIR + FILTRO HISTÓRICO INTELIGENTE ──────────────────────────
    // MANTÉM PARA SEMPRE:
    //   - tournamentHistory: posição 1 (títulos) → nunca apagado
    //   - tournamentHistory: posição <= 4 dos últimos 3 anos (ainda relevante)
    //   - eventHistory: entries com specialAchievement → nunca apagadas
    //   - eventHistory: últimos 2 anos (contexto recente)
    // DESCARTA:
    //   - tournamentHistory: participações antigas sem pódio (posição > 4 com mais de 3 anos)
    //   - eventHistory: eventos comuns com mais de 2 anos
    // ──────────────────────────────────────────────────────────────────────────────────────
    const cy = this.currentYear;
    const slimHistories = Array.from(this.playerHistories.entries()).map(([id, hist]) => {
      const slim = { ...hist };

      // Filtrar + Comprimir tournamentHistory
      if (Array.isArray(slim.tournamentHistory)) {
        slim.tournamentHistory = slim.tournamentHistory
          .filter(e => {
            if (!e) return false;
            const pos = e.position || e.p || 99;
            const year = e.year || e.y || 0;
            if (pos === 1 || pos === 'CHAMPION') return true;   // Título: SEMPRE
            if ((cy - year) <= 3) return true;                  // Últimos 3 anos: manter
            if (pos <= 4) return true;                          // Pódio histórico: manter
            return false;                                       // Outros antigos: descartar
          })
          .map(e => ({
            n:  e.name  || e.n,
            ti: e.tier  || e.ti,
            p:  e.position || e.p,
            er: e.eliminatedRound || e.er,
            pt: e.points || e.pt,
            y:  e.year  || e.y,
            m:  e.month || e.m
          }));
      }

      // Filtrar + Comprimir eventHistory
      if (Array.isArray(slim.eventHistory)) {
        slim.eventHistory = slim.eventHistory
          .filter(e => {
            if (!e) return false;
            if (e.specialAchievement || e.sa) return true;     // Achievement especial: SEMPRE
            const year = e.date?.year || e.y || 0;
            return (cy - year) <= 2;                           // Últimos 2 anos: manter
          })
          .map(e => ({
            et: e.eventType || e.et,
            en: e.eventName || e.en,
            r:  e.result    || e.r,
            pr: e.prize     || e.pr,
            y:  e.date?.year || e.y,
            m:  e.date?.month || e.m,
            sa: e.specialAchievement || e.sa || null
          }));
      }

      // Comprimir attrHistory: ~60B → ~20B por entrada (1/ano, preserva tudo — pequeno)
      if (Array.isArray(slim.attrHistory)) {
        slim.attrHistory = slim.attrHistory.map(e => ({ y: e.year || e.y, a: e.avg || e.a, t: e.tier || e.t }));
      }

      // statsByArena: Map → array serializável
      if (slim.statsByArena instanceof Map)
        slim.statsByArena = Array.from(slim.statsByArena.entries());
      else if (!Array.isArray(slim.statsByArena))
        slim.statsByArena = [];

      return [id, slim];
    });

    // ── pointsHistory: descarta entradas já expiradas + cap de segurança 36
    const cm = this.currentMonth;
    const slimPointsHistory = Array.from(this.pointsHistory.entries()).map(([id, pts]) => {
      const arr = Array.isArray(pts) ? pts : [];
      const valid = arr.filter(e =>
        e.expiryYear > cy || (e.expiryYear === cy && e.expiryMonth >= cm)
      );
      return [id, valid.slice(-36)];
    });

    // ── rankingHistory: últimos 24 snapshots (2 anos de dados — mais que suficiente para análise de movimento)
    const slimRankingHistory = (this.rankingHistory || [])
      .slice(-24)
      .map(snap => snap instanceof Map ? Array.from(snap.entries()) : snap);

    // ── matchHistory: ESTRATÉGIA HISTÓRICA INTELIGENTE ──────────────────────────────────────
    // MANTÉM PARA SEMPRE (recorde histórico):
    //   - Finais de qualquer torneio (round === 'F' / 'SF' / 'CHAMPION')
    //   - Partidas de Grand Slam e Kings Court
    //   - Grandes upsets (margin >= 15 posições) — recorde já em playerHistory.upsetsCaused
    // MANTÉM RECENTE (forma/H2H):
    //   - Últimas 100 partidas independente do tipo
    // DESCARTA:
    //   - Partidas de fase classificatória antigas sem importância histórica
    // ──────────────────────────────────────────────────────────────────────────────────────────
    const HISTORIC_ROUNDS = new Set(['F', 'FINAL', 'CHAMPION', 'SF', 'SEMIFINAL', 'GF', 'GRAND_FINAL']);
    const HISTORIC_TIERS  = new Set(['GRAND_SLAM', 'KINGS_COURT', 'PREMIER_CHAMPIONSHIP']);
    
    const allMatchHistory = this.matchHistory || [];
    const significantMatches = allMatchHistory.filter(m => {
      if (!m) return false;
      const round = (m.round || '').toUpperCase();
      const tier  = (m.tier  || '').toUpperCase();
      // Final ou semi-final de qualquer torneio → sempre histórico
      if (HISTORIC_ROUNDS.has(round)) return true;
      // Grand Slam / Kings Court → sempre histórico
      if (HISTORIC_TIERS.has(tier))  return true;
      // Upset grande (margin >= 15) → recorde histórico
      // Nota: margin só está disponível em matchLog, não matchHistory
      // Usamos player1Rank/player2Rank quando disponíveis
      if (m.player1Rank && m.player2Rank && m.winnerId) {
        const winnerRank = m.winnerId === m.player1Id ? m.player1Rank : m.player2Rank;
        const loserRank  = m.winnerId === m.player1Id ? m.player2Rank : m.player1Rank;
        if (winnerRank > loserRank && (winnerRank - loserRank) >= 15) return true;
      }
      return false;
    });
    
    // Últimas 100 partidas para forma/H2H recente (independente de significância)
    const recentMatches = allMatchHistory.slice(-100);
    
    // União sem duplicatas (Set de timestamps como chave aproximada)
    const seenKeys = new Set();
    const unifiedMatchHistory = [...significantMatches, ...recentMatches].filter(m => {
      if (!m) return false;
      const key = m.timestamp || (m.player1Id + '_' + m.player2Id + '_' + m.season + '_' + m.round);
      if (seenKeys.has(key)) return false;
      seenKeys.add(key);
      return true;
    }).sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
    
    // Slim: remove objetos bey completos dos rounds (principal causa de RangeError)
    const slimMatchHistory = unifiedMatchHistory.map(m => {
      if (!m) return m;
      const slim = {
        player1: m.player1, player2: m.player2, winner: m.winner,
        player1Id: m.player1Id, player2Id: m.player2Id, winnerId: m.winnerId,
        arena: m.arena, round: m.round, tier: m.tier,
        tournament: m.tournament, season: m.season,
        score: m.score, duration: m.duration, timestamp: m.timestamp,
        player1Rank: m.player1Rank, player2Rank: m.player2Rank,
      };
      if (Array.isArray(m.rounds)) {
        slim.rounds = m.rounds.map(r => ({
          winner: r.winner,
          method: r.method,
          launch1: r.launch1,
          launch2: r.launch2,
          bey1Name: r.bey1?.name ?? (typeof r.bey1 === 'string' ? r.bey1 : null),
          bey1Type: r.bey1?.type,
          bey2Name: r.bey2?.name ?? (typeof r.bey2 === 'string' ? r.bey2 : null),
          bey2Type: r.bey2?.type,
        }));
      }
      return slim;
    });
    console.log(`💾 matchHistory export: ${allMatchHistory.length} total → ${significantMatches.length} histórico + ${recentMatches.length} recentes = ${slimMatchHistory.length} únicos salvos`);

    // ── TEAMS STATE: serializa TODOS os jogadores (originais + newgens/Rising Stars)
    // CRÍTICO: sem isso, newgens gerados dinamicamente somem ao importar
    const teamsState = TEAMS.map(p => {
      const ps = { ...p };
      // Garantir que traits é salvo como array de {id, tier}
      if (ps.traits instanceof Map) {
        ps.traits = Array.from(ps.traits.values()).filter(t => t && t.id);
      } else if (!Array.isArray(ps.traits)) {
        ps.traits = [];
      }
      return ps;
    });

    // ── amateurRankings + amateurPointsHistory: dados dos Rising Stars
    const amateurRankingsArr = Array.from((this.amateurRankings || new Map()).entries());
    const amateurPointsHistoryArr = Array.from((this.amateurPointsHistory || new Map()).entries());

    const exportData = {
      exportVersion: '2.0',
      exportDate: new Date().toISOString(),

      // Estado do jogo
      version: this.saveVersion,
      currentYear: this.currentYear,
      currentMonth: this.currentMonth,
      currentTournamentIndex: this.currentTournamentIndex,
      nextTournamentKey: this.nextTournamentKey,

      // Dados comprimidos
      matchLog: (this.matchLog || []).slice(-1000),
      playerHistories: slimHistories,
      tournamentArchive: slimArchive,
      bbpRankings: Array.from(this.bbpRankings.entries()),
      seasonRankings: Array.from(this.seasonRankings.entries()),
      historicalRankings: Array.from(this.historicalRankings.entries()),
      pointsHistory: slimPointsHistory,

      // Bracket atual
      currentBracket: this.currentBracket,
      currentRound: this.currentRound,
      bracketInitialized: this.bracketInitialized,
      bracketInProgress: this.bracketInProgress,

      // ══ HISTÓRICO PERMANENTE — nunca cortado ══
      hallOfFame:          this.hallOfFame          || [],  // ~8KB/80 anos
      grandFinalsHistory:  this.grandFinalsHistory  || [],  // ~77KB/80 anos
      seasonWinners:       this.seasonWinners       || [],  // ~2KB/80 anos
      divisionChangeLog:   this.divisionChangeLog   || [],  // ~32KB/80 anos
      // ═════════════════════════════════════════

      // Operacional
      wildCards:            this.wildCards,
      wildCardHistory:      (this.wildCardHistory || []), // TODOS — wildcard history é permanente
      qualifiedPlayers:     this.qualifiedPlayers,
      seasons:              this.seasons,
      monthRankingSnapshot: this.monthRankingSnapshot,
      seasonRecapYear:      this.seasonRecapYear,

      // Sistemas externos
      newsHistory:     this.newsEngine ? this.newsEngine.newsHistory : [],
      rankingHistory:  slimRankingHistory,
      analyticsManager:  this.analyticsManager  ? this.analyticsManager.toJSON()  : null,
      achievementEngine: this.achievementEngine ? this.achievementEngine.toJSON() : null,
      rivalrySystem:     this.rivalrySystem     ? this.rivalrySystem.toJSON()     : null,
      eraSystem:         this.eraSystem         ? this.eraSystem.toJSON()         : null,
      chronicleEngine:   this.chronicleEngine   ? this.chronicleEngine.toJSON()   : null,
      pendingEraTransition:       this.pendingEraTransition       || null,
      pendingSeasonRecap:         this.pendingSeasonRecap         || false,
      seasonTournamentTypeStats:  this.seasonTournamentTypeStats  || {},

      // ══ ARSENAL: Signature Blades por jogador ══
      signatureBlades: Array.from(this.signatureBlades.entries()),

      // ══ FORMA: FormManager ══
      formManager: this.formManager ? this.formManager.toJSON() : null,

      // ══ SOCIAL: Tweets e trending topics ══
      socialRecentTweets:    this.socialEngine?.recentTweets    || [],
      socialTrendingTopics:  this.socialEngine?.trendingTopics  || [],

      // ══ LAUNCHES: Histórico de matches com rounds/launch techs — cap 5000, rounds slimmed ══
      matchHistory: slimMatchHistory,

      // ═══ TEAMS STATE — CRÍTICO: preserva newgens/Rising Stars e mutações nos jogadores originais ═══
      teamsState:           teamsState,
      amateurRankings:      amateurRankingsArr,
      amateurPointsHistory: amateurPointsHistoryArr,
      // ════════════════════════════════════════════════════════════════════════════════════════════════

      summary: {
        totalMatches:     this.matchLog.length,
        totalTournaments: this.tournamentArchive.size,
        totalPlayers:     TEAMS.length,
        newgens:          TEAMS.filter(p => p.isNewgen || p.status === 'RISING_STAR').length,
        currentChampion:  this.seasonWinners?.[this.currentYear - 1]?.name || 'N/A'
      }
    };

    return exportData;
  }

  /**
   * Gera um arquivo JSON para download
   */
  downloadJSON() {
    const data = this.exportToJSON();
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const fileName = `beyblade_universe_${this.currentYear}_month${this.currentMonth}_${Date.now()}.json`;
    
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    console.log(`📥 Exportado: ${fileName}`);
    console.log(`   📊 ${data.summary.totalMatches} partidas`);
    console.log(`   🏆 ${data.summary.totalTournaments} torneios`);
    
    return fileName;
  }

  /**
   * Importa dados de um objeto JSON
   */
  importFromJSON(jsonData) {
    try {
      console.log('📤 Importando dados...');
      
      // Validar formato
      if (!jsonData.exportVersion) {
        throw new Error('Formato de arquivo inválido - não é um export do Beyblade Universe');
      }
      
      // Restaurar dados principais
      this.currentYear = jsonData.currentYear;
      this.currentMonth = jsonData.currentMonth;
      this.currentTournamentIndex = jsonData.currentTournamentIndex || 0;
      this.nextTournamentKey = jsonData.nextTournamentKey;
      
      // Restaurar Maps e Arrays
      this.matchLog = jsonData.matchLog || [];

      // Restaurar playerHistories — v1.3+ usa chaves curtas comprimidas; expande de volta
      {
        const isV13 = (jsonData.exportVersion || '1.0') >= '1.3';

        const expandTournamentHistory = (arr) => {
          if (!Array.isArray(arr)) return arr;
          // Detecta se já está expandido (tem chave 'name') ou comprimido (tem 'n')
          if (arr.length === 0 || arr[0].name !== undefined) return arr;
          return arr.map(e => ({
            name:           e.n,
            tier:           e.ti,
            position:       e.p,
            eliminatedRound:e.er,
            points:         e.pt,
            year:           e.y,
            month:          e.m
          }));
        };

        const expandEventHistory = (arr) => {
          if (!Array.isArray(arr)) return arr;
          if (arr.length === 0 || arr[0].eventType !== undefined) return arr;
          return arr.map(e => ({
            eventType:          e.et,
            eventName:          e.en,
            result:             e.r,
            prize:              e.pr,
            date:               { year: e.y, month: e.m },
            specialAchievement: e.sa || null
          }));
        };

        const expandAttrHistory = (arr) => {
          if (!Array.isArray(arr)) return arr;
          if (arr.length === 0 || arr[0].year !== undefined) return arr;
          return arr.map(e => ({ year: e.y, avg: e.a, tier: e.t }));
        };

        const rawHistories = jsonData.playerHistories || [];
        this.playerHistories = new Map(rawHistories.map(([id, hist]) => {
          const h = { ...hist };
          if (isV13) {
            h.tournamentHistory = expandTournamentHistory(h.tournamentHistory);
            h.eventHistory      = expandEventHistory(h.eventHistory);
            h.attrHistory       = expandAttrHistory(h.attrHistory);
          }
          // statsByArena: array → Map
          if (Array.isArray(h.statsByArena)) {
            h.statsByArena = new Map(h.statsByArena);
          } else if (!(h.statsByArena instanceof Map)) {
            h.statsByArena = new Map();
          }
          return [id, h];
        }));
      }

      this.tournamentArchive = new Map(jsonData.tournamentArchive || []);
      this.bbpRankings = new Map(jsonData.bbpRankings || []);
      this.seasonRankings = new Map(jsonData.seasonRankings || []);
      this.historicalRankings = new Map(jsonData.historicalRankings || []);
      this.pointsHistory = new Map(jsonData.pointsHistory || []);
      
      // Restaurar bracket
      this.currentBracket = jsonData.currentBracket;
      this.currentRound = jsonData.currentRound;
      
      // 🎯 Restaurar Bracket Lifecycle flags
      this.bracketInitialized = jsonData.bracketInitialized !== undefined ? jsonData.bracketInitialized : false;
      this.bracketInProgress = jsonData.bracketInProgress !== undefined ? jsonData.bracketInProgress : false;
      
      // Restaurar outros dados
      this.wildCards = jsonData.wildCards || [];
      this.wildCardHistory = jsonData.wildCardHistory || [];
      this.qualifiedPlayers = jsonData.qualifiedPlayers || [];
      this.divisionChangeLog = jsonData.divisionChangeLog || [];
      this.seasonWinners = jsonData.seasonWinners || [];
      this.grandFinalsHistory = jsonData.grandFinalsHistory || [];
      this.hallOfFame = jsonData.hallOfFame || [];
      this.seasons = jsonData.seasons || {};
      this.monthRankingSnapshot = jsonData.monthRankingSnapshot || [];
      this.seasonRecapYear = jsonData.seasonRecapYear;
      // rankingHistory: v1.2+ salva como array-of-arrays; versões antigas como array-of-Maps
      this.rankingHistory = (jsonData.rankingHistory || []).map(snap =>
        Array.isArray(snap) ? new Map(snap) : snap instanceof Map ? snap : new Map()
      );
      
      // Restaurar sistema de notícias
      if (this.newsEngine && jsonData.newsHistory) {
        this.newsEngine.newsHistory = jsonData.newsHistory;
      }
      
      // ===== 📊 NOVO: RESTAURAR ANALYTICS MANAGER =====
      if (jsonData.analyticsManager) {
        this.analyticsManager = AnalyticsManager.fromJSON(jsonData.analyticsManager);
        console.log('✅ AnalyticsManager restaurado!');
      }
      
      // ===== 🏅 RESTAURAR ACHIEVEMENT ENGINE =====
      if (!this.achievementEngine) this.achievementEngine = new AchievementEngine();
      if (jsonData.achievementEngine) {
        this.achievementEngine.fromJSON(jsonData.achievementEngine);
        console.log('✅ AchievementEngine restaurado!');
      }

      // ===== ⚔️ RESTAURAR RIVALRY SYSTEM =====
      if (!this.rivalrySystem) this.rivalrySystem = new RivalrySystem();
      if (jsonData.rivalrySystem) {
        this.rivalrySystem.fromJSON(jsonData.rivalrySystem);
      } else if (this.matchHistory && this.matchHistory.length > 0) {
        // Save antigo — reconstruir das partidas
        this.rivalrySystem.rebuildFromMatchHistory(this.matchHistory, this);
      }
      
      // ===== 🏛️ RESTAURAR ERA SYSTEM =====
      if (!this.eraSystem) this.eraSystem = new EraSystem();
      if (jsonData.eraSystem) {
        this.eraSystem.fromJSON(jsonData.eraSystem);
        console.log(`✅ EraSystem restaurado: ${this.eraSystem.eras.length} eras`);
        // Reconstruir stats das eras a partir do histórico (conserta saves antigos com contadores zerados)
        this.eraSystem.repairEraStats(this);
      }
      // ===== 📖 RESTAURAR CHRONICLE ENGINE =====
      if (!this.chronicleEngine) this.chronicleEngine = new ChronicleEngine();
      if (jsonData.chronicleEngine) {
        this.chronicleEngine.fromJSON(jsonData.chronicleEngine);
        console.log(`✅ ChronicleEngine restaurado: ${this.chronicleEngine.chronicles.length} crônicas`);
      }
      if (jsonData.pendingEraTransition) {
        this.pendingEraTransition = jsonData.pendingEraTransition;
      }
      this.pendingSeasonRecap = jsonData.pendingSeasonRecap || false;
      if (jsonData.seasonTournamentTypeStats) {
        this.seasonTournamentTypeStats = jsonData.seasonTournamentTypeStats;
      }

      // ===== ⚔️ RESTAURAR SIGNATURE BLADES (Arsenal) =====
      if (jsonData.signatureBlades && Array.isArray(jsonData.signatureBlades)) {
        this.signatureBlades = new Map(jsonData.signatureBlades);
        console.log(`✅ SignatureBlades restaurado: ${this.signatureBlades.size} blades`);
      }

      // ===== 💪 RESTAURAR FORM MANAGER (Forma) =====
      if (jsonData.formManager) {
        this.formManager = FormManager.fromJSON(jsonData.formManager, TEAMS);
        console.log(`✅ FormManager restaurado!`);
      }

      // ===== 📱 RESTAURAR SOCIAL ENGINE (Social) =====
      if (this.socialEngine) {
        if (jsonData.socialRecentTweets)   this.socialEngine.recentTweets   = jsonData.socialRecentTweets;
        if (jsonData.socialTrendingTopics) this.socialEngine.trendingTopics = jsonData.socialTrendingTopics;
        console.log(`✅ SocialEngine restaurado: ${(jsonData.socialRecentTweets||[]).length} tweets`);
      }

      // ===== 🚀 RESTAURAR MATCH HISTORY (Launches) =====
      if (jsonData.matchHistory && Array.isArray(jsonData.matchHistory)) {
        this.matchHistory = jsonData.matchHistory;
        console.log(`✅ MatchHistory restaurado: ${this.matchHistory.length} matches`);
      }

      // ═══ RESTAURAR TEAMS STATE — CRÍTICO: reconstrói newgens/Rising Stars e mutações ═══
      if (jsonData.teamsState && Array.isArray(jsonData.teamsState) && jsonData.teamsState.length > 0) {
        console.log(`🔄 Restaurando TEAMS: ${jsonData.teamsState.length} jogadores...`);
        // Limpar array mantendo a referência (outros módulos já importaram TEAMS)
        TEAMS.splice(0, TEAMS.length);
        jsonData.teamsState.forEach(p => {
          const player = { ...p };
          // Normalizar traits → sempre array de {id, tier}
          if (player.traits instanceof Map) {
            // Era Map: extrair valores
            player.traits = Array.from(player.traits.values()).filter(t => t && t.id);
          } else if (Array.isArray(player.traits)) {
            if (player.traits.length > 0 && Array.isArray(player.traits[0])) {
              // Formato legado de entries [[key, val], ...] — extrair valores
              player.traits = player.traits.map(([, v]) => v).filter(t => t && t.id);
            }
            // else: já é [{id, tier}] — mantém como está
          } else {
            player.traits = [];
          }
          TEAMS.push(player);
        });
        const newgens = TEAMS.filter(p => p.isNewgen || p.status === 'RISING_STAR').length;
        const retired = TEAMS.filter(p => p.status === 'RETIRED' || p.status === 'RETIRED_AMATEUR').length;
        console.log(`✅ TEAMS restaurado! ${TEAMS.length} jogadores (${newgens} newgens/RS, ${retired} aposentados)`);
      } else {
        console.warn('⚠️ teamsState não encontrado no save — usando TEAMS do data.js (save antigo)');
      }

      // Restaurar ranking amador (Rising Stars)
      if (jsonData.amateurRankings) {
        this.amateurRankings = new Map(jsonData.amateurRankings);
      }
      if (jsonData.amateurPointsHistory) {
        this.amateurPointsHistory = new Map(jsonData.amateurPointsHistory);
      }
      // ════════════════════════════════════════════════════════════════════════════════════

      // ===== 📈 MIGRAR JOGADORES PARA NOVO SISTEMA DE DESENVOLVIMENTO V2.0 =====
      console.log('📈 Verificando necessidade de migração para sistema V2.0...');
      let migratedCount = 0;
      TEAMS.forEach((player, index) => {
        // Verificar se precisa migrar (não tem category no potential)
        if (!player.potential || !player.potential.category) {
          migrateLegacyPlayer(player);
          migratedCount++;
        }
      });
      if (migratedCount > 0) {
        console.log(`✅ ${migratedCount} jogadores migrados para sistema V2.0!`);
      } else {
        console.log('✅ Todos os jogadores já estão no sistema V2.0!');
      }
      
      // ===== ⚡ INVALIDAR CACHES APÓS IMPORT =====
      // CRÍTICO: sem isso, getBBPRanking() retorna dados stale do estado anterior ao load
      this._bbpRankingCache = null;
      this._bbpRankingDirty = true;
      this._tourneyWinsCache = new Map();
      this._h2hLastResult = new Map();
      console.log('🗑️ Caches invalidados após import!');

      console.log('✅ Importação concluída!');
      console.log(`   📅 Temporada: ${this.currentYear}, Mês: ${this.currentMonth}`);
      console.log(`   📊 ${this.matchLog.length} partidas carregadas`);
      console.log(`   🏆 ${this.tournamentArchive.size} torneios carregados`);
      console.log(`   👥 ${TEAMS.length} jogadores restaurados (${TEAMS.filter(p=>p.isNewgen||p.status==='RISING_STAR').length} newgens/RS, ${TEAMS.filter(p=>p.status==='RETIRED'||p.status==='RETIRED_AMATEUR').length} aposentados)`)
      
      return true;
    } catch (error) {
      console.error('❌ Erro ao importar:', error);
      alert(`Erro ao importar arquivo:\n${error.message}`);
      return false;
    }
  }

  /**
   * Lê um arquivo JSON e importa os dados
   */
  importFromFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const jsonData = JSON.parse(e.target.result);
          const success = this.importFromJSON(jsonData);
          resolve(success);
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = () => reject(new Error('Erro ao ler arquivo'));
      reader.readAsText(file);
    });
  }

  // ============================================
  // 🌟 RISING STAR SYSTEM - MÉTODOS
  // ============================================

  /**
   * Inicializa o pool de Rising Stars (16 newgens)
   */
  initializeRisingStars() {
    const TARGET = 16;
    const existing = TEAMS.filter(p => p.status === 'RISING_STAR').length;
    const needed = TARGET - existing;

    if (needed <= 0) {
      console.log(`⭐ Rising Stars já inicializados (${existing} existentes). Nenhum novo gerado.`);
      return;
    }

    console.log(`⭐ Gerando ${needed} Rising Stars iniciais (${existing} já existem)...`);
    const generated = this.newgenEngine.initializeRisingStarPool(needed);

    generated.forEach(player => {
      player.id = TEAMS.length;
      player.status = 'RISING_STAR';
      TEAMS.push(player);

      this.amateurRankings.set(player.id, 0);
      this.amateurPointsHistory.set(player.id, []);

      console.log(`   ✅ ${player.name} (${player.age} anos) - ${player.potential.category}`);
    });

    console.log(`✅ ${needed} Rising Stars adicionados ao TEAMS! (total: ${TARGET})`);
  }

  /**
   * Verifica e reabastece o pool de Rising Stars se necessário
   */
  checkAndReplenishRisingStars() {
    const currentRS = TEAMS.filter(p => p.status === 'RISING_STAR');
    const needed = 16 - currentRS.length;
    
    if (needed > 0) {
      console.log(`⭐ Repondo ${needed} Rising Stars...`);
      const newPlayers = this.newgenEngine.checkAndReplenish(currentRS, 16);
      
      newPlayers.forEach(player => {
        player.id = TEAMS.length;
        player.status = 'RISING_STAR';
        TEAMS.push(player);
        
        this.amateurRankings.set(player.id, 0);
        this.amateurPointsHistory.set(player.id, []);
        
        console.log(`   ✅ ${player.name} gerado (${player.age} anos)`);
      });
      
      console.log(`✅ ${needed} Rising Stars repostos!`);
    }
  }

  /**
   * Remove jogadores que completaram 22 anos sem promoção
   */
  checkAmateurRetirements() {
    const retired = [];
    
    TEAMS.forEach(player => {
      if (player.status === 'RISING_STAR' && player.age >= 22) {
        console.log(`🚫 ${player.name} completou 22 anos sem promoção - RETIRED`);
        player.status = 'RETIRED_AMATEUR';
        retired.push(player);
      }
    });
    
    if (retired.length > 0) {
      console.log(`📊 ${retired.length} Rising Stars aposentados por idade`);
      this.checkAndReplenishRisingStars();
    }
    
    return retired;
  }

  /**
   * Adiciona pontos ao ranking amador (últimos 18 meses)
   */
  addAmateurPoints(playerId, points, tournamentName = '') {
    if (!this.amateurRankings.has(playerId)) {
      // Inicializar automaticamente se ainda não estava no ranking
      console.warn(`⚠️ Jogador ${playerId} não estava no ranking amador - inicializando agora`);
      this.amateurRankings.set(playerId, 0);
      if (!this.amateurPointsHistory) this.amateurPointsHistory = new Map();
      this.amateurPointsHistory.set(playerId, []);
    }
    
    const currentDate = { 
      year: this.currentYear, 
      month: this.currentMonth 
    };
    
    // Adicionar ao histórico com data de expiração (18 meses)
    const history = this.amateurPointsHistory.get(playerId) || [];
    history.push({
      date: currentDate,
      points: points,
      tournament: tournamentName,
      expiryYear: this.currentYear + Math.floor((this.currentMonth + 18 - 1) / 12),
      expiryMonth: ((this.currentMonth + 18 - 1) % 12) + 1
    });
    this.amateurPointsHistory.set(playerId, history);
    
    // Recalcular pontos amadores
    this.recalculateAmateurRanking(playerId);
    
    console.log(`🌟 ${playerId}: +${points} pontos amadores (${tournamentName})`);
  }

  /**
   * Recalcula ranking amador (últimos 18 meses)
   */
  recalculateAmateurRanking(playerId) {
    const history = this.amateurPointsHistory.get(playerId) || [];
    const currentYear = this.currentYear;
    const currentMonth = this.currentMonth;
    
    let total = 0;
    
    history.forEach(entry => {
      // Checar se os pontos ainda são válidos (dentro de 18 meses)
      const isValid = (entry.expiryYear > currentYear) || 
                      (entry.expiryYear === currentYear && entry.expiryMonth >= currentMonth);
      
      if (isValid) {
        total += entry.points;
      }
    });
    
    this.amateurRankings.set(playerId, total);
  }

  /**
   * Recalcula ranking amador de todos os Rising Stars
   */
  recalculateAllAmateurRankings() {
    TEAMS.forEach((player, id) => {
      if (player.status === 'RISING_STAR') {
        this.recalculateAmateurRanking(id);
      }
    });
  }

  /**
   * Promove Rising Stars para profissionais
   */
  promoteRisingStars(count) {
    console.log(`⬆️ Promovendo ${count} Rising Stars aos profissionais...`);
    
    // Rising Stars já estão em TEAMS — só mudar status e inicializar sistemas
    const risingStars = TEAMS
      .map((p, id) => ({ player: p, id }))
      .filter(({ player }) => player.status === 'RISING_STAR')
      .sort((a, b) => (this.amateurRankings.get(b.id) || 0) - (this.amateurRankings.get(a.id) || 0));
    
    const toPromote = risingStars.slice(0, count);
    
    toPromote.forEach(({ player, id }) => {
      console.log(`🌟 ${player.name} PROMOVIDO aos profissionais! (ID: ${id})`);
      console.log(`   Idade: ${player.age} | Potencial: ${player.potential.category}`);
      
      // Mudar status — o jogador já está em TEAMS[id]
      player.status = 'PROFESSIONAL';
      player.tier = 'ROOKIE';
      player.debutYear = this.currentYear;
      player.promotedYear = this.currentYear; // 🔑 Distingue de jogadores originais (que têm debutYear fixo em data.js)
      
      // 🏛️ ERA: registrar em qual era o jogador foi promovido
      if (this.eraSystem) {
        const currentEra = this.eraSystem.getCurrentEra();
        player.eraBorn = currentEra?.id || null;
        this.eraSystem.registerPlayerBorn(id);
      }
      
      // Inicializar ranking profissional (0 pontos BBP)
      this.bbpRankings.set(id, 0);
      this.seasonRankings.set(id, 0);
      this.historicalRankings.set(id, 0);
      this.pointsHistory.set(id, []);
      
      // Preservar histórico amador (títulos Rising Star conquistados antes da promoção)
      const prevHistory = this.playerHistories.get(id) || {};
      const prevTitles  = prevHistory.titles || {};

      this.playerHistories.set(id, {
        playerId: id,
        playerName: player.name,
        totalMatches: 0,
        wins: 0,
        losses: 0,
        roundWins: 0,
        roundLosses: 0,
        winsBySpin: 0,
        winsByBurst: 0,
        winsByRingOut: 0,
        lossesBySpin: 0,
        lossesByBurst: 0,
        lossesByRingOut: 0,
        titles: {
          kingsCourtTitles:   0,
          premierTitles:      0,
          signatureClashTitles: 0,
          mastersTitles:      0,
          challengerTitles:   0,
          openTitles:         0,
          redemptionTitles:   0,
          // ✅ Preserva títulos amadores conquistados antes da promoção
          risingStarTitles:   prevTitles.risingStarTitles   || 0,
          risingFinalsTitles: prevTitles.risingFinalsTitles || 0,
          total:              (prevTitles.risingStarTitles || 0) + (prevTitles.risingFinalsTitles || 0),
          detailedList:       (prevTitles.detailedList || []).filter(t =>
            t.tier === 'RISING_STAR' || t.tier === 'RISING_FINALS'
          ),
        },
        winStreak: 0, bestWinStreak: 0, lossStreak: 0, bestLossStreak: 0,
        monthsAtTop: 0,
        currentTopStreak: 0,
        longestTopStreak: 0,
        statsByArena: new Map(),
        tournamentHistory: (prevHistory.tournamentHistory || []).filter(t =>
          t.tier === 'RISING_STAR' || t.tier === 'RISING_FINALS'
        ),
        eventHistory: [],
        attrHistory: []   // [{year, avg, tier}] — começa do zero ao entrar no profissional
      });
      
      // Inicializar no FormManager
      if (this.formManager) {
        this.formManager.initializePlayer(id, player);
      }
      
      // Inicializar careerPeak
      const currentAvg = Object.values(player.attributes || {}).reduce((a, b) => a + b, 0) / 9;
      player.careerPeak = {
        year: this.currentYear,
        avgStats: currentAvg,
        ranking: 999,
        elo: player.elo || 1000
      };
    });
    
    console.log(`✅ ${toPromote.length} jogadores promovidos!`);
    
    // Repor Rising Stars no pool
    this.checkAndReplenishRisingStars();
    
    return toPromote.map(({ player }) => player);
  }

  /**
   * Obtém Rising Stars ordenados por ranking amador
   */
  getRisingStarsByRanking() {
    return TEAMS
      .map((p, id) => ({ ...p, _teamsId: id }))
      .filter(p => p.status === 'RISING_STAR')
      .sort((a, b) => (this.amateurRankings.get(b._teamsId) || 0) - (this.amateurRankings.get(a._teamsId) || 0));
  }

  /**
   * Obtém top N Rising Stars
   */
  getTopRisingStars(count = 4) {
    return this.getRisingStarsByRanking().slice(0, count);
  }

// ============================================
// 📋 FUNÇÕES DE BRACKETS POR TIER (NEWGEN + CALENDAR)
// ============================================

/**
 * 🔧 HELPER: Converte array de IDs em array de objetos completos com deck adaptado
 */
convertPlayerIdsToObjects(playerIds, tournamentArena = 'BB-10 Competitive') {
  return playerIds.map(playerId => {
    const team = TEAMS[playerId];
    if (!team) {
      console.error(`❌ TEAMS[${playerId}] não existe!`);
      return null;
    }
    
    const adaptedDeck = adaptDeckForArena(team, tournamentArena);
    
    return {
      ...team,
      id: playerId,
      teamIndex: playerId,
      deck: adaptedDeck,
      deckArena: tournamentArena,
      intelligence: team.attributes?.intelligence || 7
    };
  }).filter(p => p !== null);
}

/**
 * 🆕 Prepara Rising Stars (newgens) adicionando decks
 * Rising Stars são newgens, não estão em TEAMS!
 * @param {Array} risingStars - Array de objetos newgen
 * @param {string} tournamentArena - Arena do torneio
 * @returns {Array} Rising Stars com decks completos
 */
/**
 * Prepara Rising Stars para torneio usando o MESMO pipeline dos pros:
 * Signature Blade + Season Blades + Tournament Blades + Arena Pref + Forma + Atributos
 */
prepareRisingStarsForTournament(risingStars, tournamentArena = 'BB-10 Competitive') {
  // Normalizar arena para código interno
  const arenaNameMap = {
    'BB-10': 'BB10_COMPETITIVE', 'BB-10 Competitive': 'BB10_COMPETITIVE', 'BB10_COMPETITIVE': 'BB10_COMPETITIVE',
    'Prismatic Nexus': 'NEXUS', 'NEXUS': 'NEXUS',
    'Volcanic Rage': 'VOLCANIC_RAGE', 'VOLCANIC_RAGE': 'VOLCANIC_RAGE',
    'Colosseum Carnage': 'COLOSSEUM_CARNAGE', 'COLOSSEUM_CARNAGE': 'COLOSSEUM_CARNAGE',
    'Vortex Coliseum': 'VORTEX_COLISEUM', 'Vortex Colosseum': 'VORTEX_COLISEUM', 'VORTEX_COLISEUM': 'VORTEX_COLISEUM',
    'Pinball Inferno': 'PINBALL_INFERNO', 'PINBALL_INFERNO': 'PINBALL_INFERNO',
    'Pangea Platform': 'PANGEA_PLATFORM', 'PANGEA_PLATFORM': 'PANGEA_PLATFORM',
    'Killer Sides': 'KILLER_SIDES', 'KILLER_SIDES': 'KILLER_SIDES',
    'Storm Track': 'STORM_TRACK', 'STORM_TRACK': 'STORM_TRACK',
    'Tidal Surge': 'TIDAL_SURGE', 'TIDAL_SURGE': 'TIDAL_SURGE',
    'Domination Zones': 'DOMINATION_ZONES', 'DOMINATION_ZONES': 'DOMINATION_ZONES',
  };
  const arenaCode = arenaNameMap[tournamentArena] || tournamentArena;

  return risingStars.map(newgen => {
    const ngId = newgen.id;

    // ── 1. GARANTIR SIGNATURE BLADE ────────────────────────────
    if (!this.signatureBlades.has(ngId)) {
      // Criar signature blade idêntico ao dos pros, usando o newgen como "team"
      const sigData = initializeSignatureBladeForPlayer(ngId, newgen);
      this.signatureBlades.set(ngId, sigData);
      console.log(`🌟 Signature Blade criado para ${newgen.name}: "${sigData.blade.signatureName}"`);
    }

    // ── 2. GARANTIR SEASON BLADES ──────────────────────────────
    if (!this.seasonBlades.has(ngId) || (this.seasonBlades.get(ngId) || []).length < 2) {
      const seasons = createSeasonBlades(newgen, ngId);
      this.seasonBlades.set(ngId, seasons);
    }

    const signature = this.signatureBlades.get(ngId)?.blade;
    const seasons   = this.seasonBlades.get(ngId) || [];

    // ── 3. MONTAR DECK COMPLETO: Signature + Season + Tournament ─
    const rawDeck = buildFullDeck(newgen, ngId, arenaCode, signature, seasons);

    // ── 4. ARENA PREFERENCE MODIFIER (igual aos pros) ──────────
    const ARENA_PREF_LOCAL = {
      ALL_ROUNDER:       { fav: ['BB10_COMPETITIVE','PANGEA_PLATFORM','DOMINATION_ZONES'], hate: ['PINBALL_INFERNO','VOLCANIC_RAGE','COLOSSEUM_CARNAGE'] },
      GLASS_CANNON:      { fav: ['COLOSSEUM_CARNAGE','PINBALL_INFERNO','STORM_TRACK'],     hate: ['KILLER_SIDES','VORTEX_COLISEUM','DOMINATION_ZONES'] },
      IRON_FORTRESS:     { fav: ['NEXUS','DOMINATION_ZONES','PANGEA_PLATFORM'],            hate: ['PINBALL_INFERNO','STORM_TRACK','COLOSSEUM_CARNAGE'] },
      ETERNAL_SPINNER:   { fav: ['VORTEX_COLISEUM','KILLER_SIDES','TIDAL_SURGE'],          hate: ['COLOSSEUM_CARNAGE','PINBALL_INFERNO','VOLCANIC_RAGE'] },
      CALCULATED_CHAOS:  { fav: ['NEXUS','COLOSSEUM_CARNAGE','DOMINATION_ZONES'],          hate: ['BB10_COMPETITIVE','KILLER_SIDES','PANGEA_PLATFORM'] },
      HIGH_RISK_GAMBLER: { fav: ['PINBALL_INFERNO','COLOSSEUM_CARNAGE','STORM_TRACK'],     hate: ['BB10_COMPETITIVE','PANGEA_PLATFORM','DOMINATION_ZONES'] },
      MOMENTUM_MASTER:   { fav: ['STORM_TRACK','TIDAL_SURGE','VORTEX_COLISEUM'],           hate: ['PINBALL_INFERNO','VOLCANIC_RAGE','NEXUS'] },
      SYNERGY_SEEKER:    { fav: ['DOMINATION_ZONES','NEXUS','PANGEA_PLATFORM'],            hate: ['PINBALL_INFERNO','VOLCANIC_RAGE','COLOSSEUM_CARNAGE'] },
      ADAPTIVE_TACTICIAN:{ fav: ['NEXUS','DOMINATION_ZONES','BB10_COMPETITIVE'],           hate: ['VOLCANIC_RAGE','KILLER_SIDES','VORTEX_COLISEUM'] },
      PERFECTIONIST:     { fav: ['BB10_COMPETITIVE','PANGEA_PLATFORM','KILLER_SIDES'],     hate: ['PINBALL_INFERNO','COLOSSEUM_CARNAGE','TIDAL_SURGE'] },
      CHAOS_AGENT:       { fav: ['PINBALL_INFERNO','VOLCANIC_RAGE','COLOSSEUM_CARNAGE'],   hate: ['BB10_COMPETITIVE','PANGEA_PLATFORM','NEXUS'] },
      MOMENTUM_THIEF:    { fav: ['KILLER_SIDES','DOMINATION_ZONES','STORM_TRACK'],         hate: ['TIDAL_SURGE','VORTEX_COLISEUM','PANGEA_PLATFORM'] },
    };
    const prefs = ARENA_PREF_LOCAL[newgen.mentality] || ARENA_PREF_LOCAL.ALL_ROUNDER;
    let arenaMod = 0;
    if (prefs.fav[0] === arenaCode) arenaMod = +6;
    else if (prefs.fav[1] === arenaCode) arenaMod = +4;
    else if (prefs.fav[2] === arenaCode) arenaMod = +2;
    else if (prefs.hate[0] === arenaCode) arenaMod = -6;
    else if (prefs.hate[1] === arenaCode) arenaMod = -4;
    else if (prefs.hate[2] === arenaCode) arenaMod = -2;

    // ── 5. PIPELINE COMPLETO (igual ao finalizeBey dos pros) ───
    const finalDeck = rawDeck.map(bey => {
      if (!bey) return bey;
      let b = JSON.parse(JSON.stringify(bey));

      // 5a. Arena preference → flat add ao BASE
      if (arenaMod !== 0) {
        ['atk','def','sta','bal','weight','spin'].forEach(s => {
          if (b.stats?.[s] !== undefined)        b.stats[s]        = Math.max(1, b.stats[s] + arenaMod);
          if (b.effectiveStats?.[s] !== undefined) b.effectiveStats[s] = Math.max(1, b.effectiveStats[s] + arenaMod);
        });
        b._arenaPreferenceMod = arenaMod;
      }

      // 5b. Forma → % sobre BASE (usando ID do newgen para formManager)
      if (universeManagerInstance?.formManager) {
        const ngTraitsRaw = newgen.traits instanceof Map
          ? Array.from(newgen.traits.values())
          : (Array.isArray(newgen.traits) ? newgen.traits : []);
        const ngTraits = ngTraitsRaw.filter(t => t && t.id); // v2.0: {id, tier}
        b = applyFormaMultiplier(b, 1.0, universeManagerInstance, ngTraits, {});
      }

      // 5c. Atributos do player → % aplicado POR ÚLTIMO (mesmo applyBladerBonuses dos pros)
      b = applyBladerBonuses(b, newgen);

      return b;
    });

    return {
      ...newgen,
      teamIndex: ngId,
      deck: finalDeck,
      deckArena: arenaCode,
      intelligence: newgen.attributes?.intelligence || 7
    };
  }).filter(p => p !== null);
}

/**
 * @deprecated Use prepareRisingStarsForTournament que agora usa pipeline completo
 */
createNewgenDeck(newgen, arena = 'BB-10 Competitive') {
  // Mantido para compatibilidade, mas não é mais usado no caminho principal
  const { mentality } = newgen;
  if (!MENTALITIES || !MENTALITIES[mentality]) {
    const fallback = MENTALITIES?.ALL_ROUNDER || MENTALITIES[Object.keys(MENTALITIES)[0]];
    return fallback.buildDeck(newgen);
  }
  return MENTALITIES[mentality].buildDeck(newgen);
}

/**
 * @deprecated Substituído pelo pipeline de applyBladerBonuses
 */
applyNewgenBonusesToBeyblade(beyblade, attributes) {
  // Mantido para compatibilidade
  return applyBladerBonuses(beyblade, { attributes });
}

/**
 * Cria bracket para Kings Court Finals (Knockout - Top 8 profissionais)
 */
createKingsCourtBracket(tournament) {
  console.log('🏆 Criando bracket Kings Court Finals (Knockout - Top 8 BBP)');
  
  const top8Ids = this.getBBPRanking().slice(0, 8).map(entry => entry.playerId);
  const top8 = this.convertPlayerIdsToObjects(top8Ids, this.getTournamentArena(tournament));
  
  if (top8.length < 2) {
    console.warn('⚠️ Jogadores insuficientes para Kings Court Finals');
    return null;
  }
  
  // Usar create8PlayerBracket: QF → SF → F, seeding 1v8, 4v5, 2v7, 3v6
  return this.create8PlayerBracket(top8, tournament);
}

/**
 * Cria bracket para Rising Star Finals (Knockout - Top 8 amadores)
 */
createRisingFinalsBracket(tournament) {
  console.log('🌟 Criando bracket Rising Star Finals (Knockout - Top 8 Rising Stars)');
  
  let top8 = this.getRisingStarsByRanking().slice(0, 8);
  
  if (top8.length < 2) {
    console.warn(`⚠️ Apenas ${top8.length} Rising Stars disponíveis para Rising Star Finals`);
    return null;
  }
  
  // Preparar com decks
  top8 = this.prepareRisingStarsForTournament(top8, this.getTournamentArena(tournament));
  
  // Usar create8PlayerBracket: QF → SF → F, seeding 1v8, 4v5, 2v7, 3v6
  return this.create8PlayerBracket(top8, tournament);
}

/**
 * Cria bracket para Rising Star Field (Knockout - 16 amadores)
 */
createRisingStarBracket(tournament) {
  console.log('🌟 Criando bracket Rising Star Field (16 amadores)');
  
  // 🔧 FIX: Não extrair IDs, usar objetos diretos! Rising Stars são newgens
  let allRisingStars = this.getRisingStarsByRanking().slice(0, 16);
  
  if (allRisingStars.length < 16) {
    console.warn(`⚠️ Apenas ${allRisingStars.length} Rising Stars disponíveis`);
  }
  
  // 🔧 FIX: Preparar com decks ao invés de converter IDs
  const participants = this.prepareRisingStarsForTournament(allRisingStars, this.getTournamentArena(tournament));
  
  console.log(`   🎮 ${participants.length} Rising Stars preparados com decks`);
  
  // Usar a função create16PlayerBracket que já está funcionando!
  // Ela cria R16, QF, SF, F e seta currentBracket e currentRound corretamente
  return this.create16PlayerBracket(participants, tournament);
}

/**
 * Cria bracket para Challenger (Top 32)
 */
createChallengerBracket(tournament) {
  console.log('🏅 Criando bracket Challenger (Top 32)');
  
  const top32Ids = this.getBBPRanking().slice(0, 32).map(entry => entry.playerId);
  const top32 = this.convertPlayerIdsToObjects(top32Ids, this.getTournamentArena(tournament));
  
  if (top32.length < 32) {
    console.warn(`⚠️ Apenas ${top32.length} jogadores profissionais disponíveis`);
  }
  
  return this.create32PlayerBracket(top32, tournament);
}

/**
 * Cria bracket para Redemption (Bottom 32)
 */
createRedemptionBracket(tournament) {
  console.log('⚔️ Criando bracket Redemption (Bottom 32)');
  
  const allProfessionals = this.getBBPRanking();
  const bottom32Ids = allProfessionals.slice(32, 64).map(entry => entry.playerId);
  const bottom32 = this.convertPlayerIdsToObjects(bottom32Ids, this.getTournamentArena(tournament));
  
  if (bottom32.length < 32) {
    console.warn(`⚠️ Apenas ${bottom32.length} jogadores disponíveis para Redemption`);
  }
  
  return this.create32PlayerBracket(bottom32, tournament);
}

/**
 * Cria bracket para Masters (Choice Split - 32+32)
 */
createMastersBracket(tournament) {
  if (!this._turboMode) console.log('⚡ Criando bracket Masters (Choice Split)');
  
  const allProfessionalsIds = this.getBBPRanking().map(entry => entry.playerId);

  // Calcular qual Masters este é dentro do mês (0 = primeiro, 1 = segundo...)
  // NÃO usar currentTournamentIndex diretamente: pode haver Invitational ou outros antes
  const monthTournaments = this.getCurrentMonthConfig()?.tournaments || [];
  const masterIndex = monthTournaments
    .slice(0, this.currentTournamentIndex + 1)
    .filter(t => t.tier === 'MASTERS').length - 1;

  const selectedIds = allProfessionalsIds
    .filter((_, i) => i % 2 === masterIndex)
    .slice(0, tournament.participants || 32);

  // Completar se necessário
  if (selectedIds.length < (tournament.participants || 32)) {
    const remaining = allProfessionalsIds.filter(id => !selectedIds.includes(id));
    selectedIds.push(...remaining.slice(0, (tournament.participants || 32) - selectedIds.length));
  }

  if (!this._turboMode) console.log(`   ✅ Masters [${masterIndex}]: ${selectedIds.length} jogadores selecionados`);
  
  const players = this.convertPlayerIdsToObjects(selectedIds, this.getTournamentArena(tournament));
  return this.create32PlayerBracket(players, tournament);
}

/**
 * Cria bracket para o New Year's Signature Clash.
 * Regras:
 *  - 64 jogadores: top BBP ranking
 *  - MD1: uma única batalha decide o vencedor
 *  - Signature Blade obrigatória: deck reduzido a [signatureBlade]
 *  - Arena: BB-10 Competitive
 */
createSignatureClashBracket(tournament) {
  console.log("⚔️ Criando New Year's Signature Clash (64 BBP, MD1, Signature Only)");

  // Top 64 do ranking BBP
  const allIds = this.getBBPRanking().slice(0, 64).map(e => e.playerId);

  // Converter para objetos mas forçar deck = [signatureBlade]
  const arena = 'BB10_COMPETITIVE';
  const players = allIds.map(playerId => {
    const team = TEAMS[playerId];
    if (!team) return null;

    // Obter a Signature Blade do jogador
    const sigData = this.signatureBlades.get(playerId);
    let sigBlade = sigData?.blade;

    // Se não tem signature blade ainda, criar agora
    if (!sigBlade) {
      const newSigData = initializeSignatureBladeForPlayer(playerId, team);
      this.signatureBlades.set(playerId, newSigData);
      sigBlade = newSigData.blade;
    }

    // Aplicar modificadores de arena e forma à Signature Blade
    let finalBlade = { ...sigBlade };
    if (universeManagerInstance?.formManager) {
      const traitData = getPlayerTraitData(team.name);
      const playerTraits = (traitData?.traits || []).filter(t => t && t.id);
      finalBlade = applyFormaMultiplier(finalBlade, 1.0, universeManagerInstance, playerTraits, {});
    }
    finalBlade = applyBladerBonuses(finalBlade, team, { arenaModApplied: 0 });

    return {
      ...team,
      id: playerId,
      teamIndex: playerId,
      deck: [finalBlade],          // ← só a Signature Blade
      deckArena: arena,
      intelligence: team.attributes?.intelligence || 7,
      _signatureOnly: true,        // flag para UI e motor de batalha
    };
  }).filter(Boolean);

  console.log(`   ✅ ${players.length} jogadores com Signature Blade no deck`);
  return this.create64PlayerBracket(players, tournament);
}

/**
 * Seleciona os 16 participantes do Season Kickoff Invitational.
 * Regras:
 *  - N = jogadores promovidos no ano anterior (debutYear === currentYear - 1)
 *  - Slots promovidos  = min(N, 16)
 *  - Slots profissionais = 16 - slots promovidos  (top do ranking BBP)
 *  - 0 promovidos → 16 top BBP ranking
 *  - 8 promovidos → 8 top BBP + 8 promovidos
 *  - 16+ promovidos → 16 promovidos (top 16 por pontuação amador)
 */
_selectInvitationalPlayers() {
  const lastYear = this.currentYear - 1;

  // Jogadores promovidos do Rising Star no ano anterior
  // CRÍTICO: usar promotedYear (setado em promoteRisingStars) e NÃO debutYear,
  // pois jogadores originais de data.js têm debutYear: 2024 hardcoded
  // e seriam erroneamente incluídos na primeira transição de temporada.
  const promotedThisYear = TEAMS
    .map((p, id) => ({ player: p, id }))
    .filter(({ player }) =>
      player.status === 'PROFESSIONAL' &&
      player.promotedYear === lastYear  // ← só jogadores vindos do sistema Rising Star
    )
    .map(({ player, id }) => {
      const amateurHistory = this.amateurPointsHistory?.get(id) || [];
      const amateurTotal = amateurHistory.reduce((sum, h) => sum + (h.points || 0), 0);
      return { id, amateurTotal };
    })
    .sort((a, b) => b.amateurTotal - a.amateurTotal);

  const promotedCap = Math.min(promotedThisYear.length, 16);
  const proSlots    = 16 - promotedCap;

  const promotedIds = promotedThisYear.slice(0, promotedCap).map(p => p.id);

  // Top profissionais do ranking BBP (excluindo os promovidos)
  const bbp    = this.getBBPRanking();
  const proIds = bbp
    .filter(r => !promotedIds.includes(r.playerId))
    .slice(0, proSlots)
    .map(r => r.playerId);

  console.log(`🎟️ Invitational: ${proIds.length} top-BBP + ${promotedIds.length} promovidos = 16 participantes`);

  return { proIds, promotedIds };
}

/**
 * Cria bracket para o Season Kickoff Invitational (Janeiro — 16 jogadores, MD7).
 * Composição: top-BBP + jogadores recém-promovidos do Rising Star (sem BYE).
 */
createInvitationalBracket(tournament) {
  console.log('🌟 Criando bracket Season Kickoff Invitational (16 jogadores, MD7)');
  const arena = this.getTournamentArena(tournament);

  const { proIds, promotedIds } = this._selectInvitationalPlayers();

  // Converter profissionais para objetos
  const proPlayers = this.convertPlayerIdsToObjects(proIds, arena);

  // Preparar jogadores promovidos (podem ter sido RS antes da promoção)
  const promotedPlayers = promotedIds.map(id => {
    const player = TEAMS[id];
    if (!player) return null;
    // Já são PROFESSIONAL depois da promoção — tratar como profissional normal
    return this.convertPlayerIdsToObjects([id], arena)[0] || null;
  }).filter(Boolean);

  const allPlayers = [...proPlayers, ...promotedPlayers].slice(0, 16);

  // Completar com BBP se houver menos de 16 (caso extremo)
  if (allPlayers.length < 16) {
    const usedIds = allPlayers.map(p => p.id ?? p.teamIndex);
    const bbp = this.getBBPRanking();
    for (const entry of bbp) {
      if (allPlayers.length >= 16) break;
      if (!usedIds.includes(entry.playerId)) {
        const extra = this.convertPlayerIdsToObjects([entry.playerId], arena)[0];
        if (extra) allPlayers.push(extra);
      }
    }
  }

  if (allPlayers.length < 4) {
    console.warn('⚠️ Jogadores insuficientes para Invitational');
    return null;
  }

  // Bracket limpo de 16 — sem BYE
  return this.create16PlayerBracket(allPlayers.slice(0, 16), tournament);
}

/**
 * Cria bracket para The Crossover Open (Agosto — 16 pros + 16 Rising Stars = 32 jogadores).
 * Profissionais ganham pontos BBP. Rising Stars ganham bônus no ranking amador.
 * Bracket limpo de 32 — sem BYE.
 */
createOpenBracket(tournament) {
  console.log('🌐 Criando bracket The Crossover Open (32 jogadores: 16 pros + 16 RS)');
  const arena = this.getTournamentArena(tournament);

  // 16 melhores profissionais do ranking BBP
  const proIds = this.getBBPRanking().slice(0, 16).map(r => r.playerId);
  const proPlayers = this.convertPlayerIdsToObjects(proIds, arena);

  // 16 melhores Rising Stars ativos
  const rsRaw = this.getRisingStarsByRanking().slice(0, 16);
  const rsPlayers = this.prepareRisingStarsForTournament(rsRaw, arena).map(p => ({
    ...p,
    _isRisingStarInOpen: true, // flag para distribuir pontos corretos
  }));

  const allPlayers = [...proPlayers, ...rsPlayers].slice(0, 32);

  // Completar com profissionais extras se Rising Stars insuficientes
  if (allPlayers.length < 32) {
    const usedIds = allPlayers.map(p => p.id ?? p.teamIndex);
    const bbp = this.getBBPRanking();
    for (const entry of bbp) {
      if (allPlayers.length >= 32) break;
      if (!usedIds.includes(entry.playerId)) {
        const extra = this.convertPlayerIdsToObjects([entry.playerId], arena)[0];
        if (extra) allPlayers.push(extra);
      }
    }
  }

  if (allPlayers.length < 4) {
    console.warn('⚠️ Jogadores insuficientes para Crossover Open');
    return null;
  }

  // Bracket limpo de 32 — sem BYE, sem padding
  return this.create32PlayerBracket(allPlayers.slice(0, 32), tournament);
}

/**
 * Seleciona tipo de bracket baseado no tier do torneio
 */
selectBracketByTier(tournament) {
  console.log(`📋 Selecionando bracket para tier: ${tournament.tier}`);
  
  switch(tournament.tier) {
    case 'KINGS_COURT':
      return this.createKingsCourtBracket(tournament);
      
    case 'RISING_FINALS':
      return this.createRisingFinalsBracket(tournament);
      
    case 'RISING_STAR':
      return this.createRisingStarBracket(tournament);

    case 'SIGNATURE_CLASH':
      return this.createSignatureClashBracket(tournament);
      
    case 'INVITATIONAL':
      return this.createInvitationalBracket(tournament); // legado

    case 'OPEN':
      return this.createOpenBracket(tournament);
      
    case 'PREMIER': {
      const allProfessionalsIds = this.getBBPRanking().slice(0, 64).map(entry => entry.playerId);
      const allProfessionals = this.convertPlayerIdsToObjects(allProfessionalsIds, this.getTournamentArena(tournament));
      return this.create64PlayerBracket(allProfessionals, tournament);
    }
      
    case 'MASTERS':
      return this.createMastersBracket(tournament);

    case 'ELITE_MASTERS': {
      // ELITE_MASTERS: usar getParticipantsForTournament (draft por arena) + create32PlayerBracket
      const emParticipants = this.getParticipantsForTournament(tournament);
      return this.create32PlayerBracket(emParticipants, tournament);
    }
      
    case 'CHALLENGER':
      return this.createChallengerBracket(tournament);
      
    case 'REDEMPTION':
      return this.createRedemptionBracket(tournament);
      
    default:
      return null;
  }
}

/**
 * Retorna configuração de match baseado no formato do torneio
 */
getMatchConfig(tournament) {
  const fmt = tournament.matchFormat || 'MD3';
  const bestOf   = fmt === 'MD5' ? 5 : fmt === 'MD7' ? 7 : 3;
  const firstTo  = fmt === 'MD5' ? 3 : fmt === 'MD7' ? 4 : 2;
  return { bestOf, firstTo, format: fmt };
}

/**
 * Verifica se um match terminou baseado no formato
 */
isMatchComplete(roundsWon, tournament) {
  const config = this.getMatchConfig(tournament);
  return roundsWon >= config.firstTo;
}

/**
 * Retorna a arena para um match específico
 */
getMatchArena(matchIndex, tournament) {
  const arenas = tournament.arenas;
  
  if (Array.isArray(arenas)) {
    return arenas[matchIndex % arenas.length];
  }
  
  if (arenas === 'ALL') {
    const ALL_ARENAS = [
      'Prismatic Nexus', 'Vortex Colosseum', 'Storm Track', 'Killer Side',
      'Tidal Clash', 'Carnage Colosseum', 'BB-10', 'Domination Zone',
      'Pinball Inferno', 'Pangea Platform', 'Volcanic Rage', 'Prismatic Portal'
    ];
    return ALL_ARENAS[matchIndex % ALL_ARENAS.length];
  }
  
  return Array.isArray(arenas) ? arenas[0] : arenas;
}

/**
 * Distribui pontos amadores após torneio Rising Star
 */
distributeAmateurPoints(tournament, finalStandings) {
  // Usar estrutura correta para Rising Stars
  const structureName = tournament.pointsStructure ||
    (tournament.tier === 'RISING_STAR' ? 'RISING_STAR_200' :
     tournament.tier === 'RISING_FINALS' ? 'RISING_FINALS_LEAGUE' : 'RISING_STAR_200');
  const pointsStructure = this.getPointsStructure(structureName);

  finalStandings.forEach((standing, index) => {
    const player = TEAMS[standing.playerId];
    if (!player) {
      console.warn(`⚠️ Jogador ${standing.playerId} não encontrado para pontos Rising Star`);
      return;
    }
    if (player.status !== 'RISING_STAR') return;

    const points = this.calculatePointsForPosition(index, pointsStructure);
    if (points > 0) {
      this.addAmateurPoints(player.id, points, tournament.name);
    }
  });
}

/**
 * Retorna estrutura de pontos
 */
getPointsStructure(structureName) {
  const structures = {
    'PREMIER_2000':           { champion: 2000, finalist: 1200, semifinalist: 720, quarterfinalist: 360, r16: 180, r32: 90, r64: 10 },
    'SIGNATURE_CLASH_1500':   { champion: 1500, finalist: 750,  semifinalist: 400, quarterfinalist: 200, r16: 80, r32: 30 },
    'INVITATIONAL_1500':      { champion: 1500, finalist: 900,  semifinalist: 540, quarterfinalist: 270, r8: 135 },
    'MASTERS_1000':           { champion: 1000, finalist: 600,  semifinalist: 360, quarterfinalist: 180, r16: 90, r32: 0 },
    'CHALLENGER_500':         { champion: 500,  finalist: 300,  semifinalist: 180, quarterfinalist: 90,  r16: 45, r32: 10 },
    'OPEN_750':               { champion: 750,  finalist: 450,  semifinalist: 270, quarterfinalist: 135, r16: 60, r32: 20 },
    'REDEMPTION_250':         { champion: 250,  finalist: 150,  semifinalist: 90,  quarterfinalist: 45,  r16: 20, r32: 0 },
    'RISING_STAR_200':        { champion: 200,  finalist: 120,  semifinalist: 70,  quarterfinalist: 35,  r16: 10 },
    'OPEN_AMATEUR_BONUS':     { champion: 600,  finalist: 400,  semifinalist: 250, quarterfinalist: 100 },
    'RISING_FINALS_LEAGUE':   { quarterfinalist: 100, semifinalist: 150, finalist: 250, champion: 400 },
    'KINGS_COURT_LEAGUE':     { quarterfinalist: 1000, semifinalist: 1500, finalist: 1800, champion: 2500 },
  };
  
  return structures[structureName] || structures['MASTERS_1000'];
}

/**
 * Calcula pontos baseado na posição
 */
calculatePointsForPosition(position, structure) {
  if (structure.first !== undefined) {
    const keys = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth'];
    return structure[keys[position]] || 0;
  }
  
  const positionMap = {
    0: 'champion', 1: 'finalist',
    2: 'semifinalist', 3: 'semifinalist',
    4: 'quarterfinalist', 5: 'quarterfinalist',
    6: 'quarterfinalist', 7: 'quarterfinalist'
  };
  
  if (position > 7) {
    if (position < 16) return structure.r16 || 0;
    if (position < 32) return structure.r32 || 0;
    if (position < 64) return structure.r64 || 0;
    return 0;
  }
  
  return structure[positionMap[position]] || 0;
}

/**
 * Verifica se o torneio atual é obrigatório
 */
isCurrentTournamentMandatory() {
  const tournament = this.getCurrentTournament();
  return tournament?.mandatory === true;
}

/**
 * Retorna todos os torneios de um mês
 */
getMonthTournaments(month) {
  const monthConfig = this.getCurrentMonthConfig();
  if (!monthConfig) return [];
  return monthConfig.tournaments || [];
}

/**
 * Retorna estatísticas do calendário
 */
getCalendarStats() {
  const tournaments = this.getMonthTournaments(this.currentMonth);
  
  return {
    totalTournaments: tournaments.length,
    mandatoryTournaments: tournaments.filter(t => t.mandatory).length,
    premierTournaments: tournaments.filter(t => t.tier === 'PREMIER').length,
    mastersTournaments: tournaments.filter(t => t.tier === 'MASTERS').length,
    risingStarTournaments: tournaments.filter(t => t.tier === 'RISING_STAR').length
  };
}

  // ============================================
  // RETIREMENT SYSTEM HELPERS
  // ============================================

  // Retorna a posição do jogador no ranking BBP (1 = primeiro)
  getCurrentRanking(playerId) {
    const sorted = Array.from(this.bbpRankings.entries())
      .sort((a, b) => b[1] - a[1]);
    const position = sorted.findIndex(([id]) => id === playerId);
    return position >= 0 ? position + 1 : 999;
  }

  // Retorna número de títulos conquistados nos últimos N meses
  getTitlesInLastMonths(playerId, months) {
    const history = this.playerHistories?.get(playerId);
    if (!history?.titles?.detailedList) return 0;

    let targetMonth = this.currentMonth - months;
    let targetYear = this.currentYear;
    while (targetMonth <= 0) {
      targetMonth += 12;
      targetYear -= 1;
    }

    return history.titles.detailedList.filter(title => {
      if (title.year > targetYear) return true;
      if (title.year === targetYear && title.month >= targetMonth) return true;
      return false;
    }).length;
  }

  // Retorna quantas posições o jogador caiu no ranking nos últimos N meses
  getRankingDrop(playerId, months) {
    if (!this.rankingHistory || this.rankingHistory.length < 2) return 0;

    const latestSnapshot = this.rankingHistory[this.rankingHistory.length - 1];
    const currentPos = latestSnapshot?.get(playerId) ?? 999;

    const snapshotsPerMonth = 2;
    const lookbackIndex = Math.max(0, this.rankingHistory.length - 1 - months * snapshotsPerMonth);
    const pastSnapshot = this.rankingHistory[lookbackIndex];
    const pastPos = pastSnapshot?.get(playerId) ?? currentPos;

    return Math.max(0, currentPos - pastPos);
  }

  // Retorna anos desde o último título (0 se ganhou no ano atual)
  getYearsWithoutTitle(playerId) {
    const history = this.playerHistories?.get(playerId);
    if (!history?.titles?.detailedList?.length) {
      const player = (this.TEAMS || this.players || []).find(p => p?.id === playerId);
      return player ? (this.currentYear - (player.debutYear || this.currentYear)) : 0;
    }

    const lastTitle = history.titles.detailedList.reduce((latest, t) => {
      if (!latest) return t;
      if (t.year > latest.year) return t;
      if (t.year === latest.year && t.month > latest.month) return t;
      return latest;
    }, null);

    return lastTitle ? Math.max(0, this.currentYear - lastTitle.year) : 0;
  }

  // Retorna o playerId do atual campeão do Kings Court (proteção de aposentadoria)
  getKingsCourtChampion() {
    let champion = null;
    let latestYear = -1;
    let latestMonth = -1;

    this.playerHistories?.forEach((history, playerId) => {
      const kingsTitle = history.titles?.detailedList?.find(t =>
        t.tournamentType === 'KINGS_COURT' &&
        (t.year > latestYear || (t.year === latestYear && t.month > latestMonth))
      );
      if (kingsTitle) {
        latestYear = kingsTitle.year;
        latestMonth = kingsTitle.month;
        champion = playerId;
      }
    });

    return champion;
  }

}


// MENTALITY SYSTEM - Defines how teams build their decks
const MENTALITIES = {
  ALL_ROUNDER: {
    name: 'All-Rounder',
    icon: '⚖️',
    description: 'Preparado para qualquer situação - stats equilibrados',
    color: '#64748b',
    preferredType: 'Balance',
    buildDeck: (team) => buildIntelligentDeck(team, 'Balance')
  },
  GLASS_CANNON: {
    name: 'Glass Cannon',
    icon: '💥',
    description: 'Destruir ou morrer tentando - ataque extremo',
    color: '#ef4444',
    preferredType: 'Attack',
    buildDeck: (team) => buildIntelligentDeck(team, 'Attack')
  },
  IRON_FORTRESS: {
    name: 'Iron Fortress',
    icon: '🛡️',
    description: 'Muralha impenetrável - defesa máxima',
    color: '#3b82f6',
    preferredType: 'Defense',
    buildDeck: (team) => buildIntelligentDeck(team, 'Defense')
  },
  ETERNAL_SPINNER: {
    name: 'Eternal Spinner',
    icon: '♾️',
    description: 'Maratona infinita - stamina suprema',
    color: '#8b5cf6',
    preferredType: 'Stamina',
    buildDeck: (team) => buildIntelligentDeck(team, 'Stamina')
  },
  CALCULATED_CHAOS: {
    name: 'Calculated Chaos',
    icon: '🎯',
    description: 'Controle tático - mix estratégico',
    color: '#f59e0b',
    preferredType: 'Mixed',
    buildDeck: (team) => buildIntelligentDeck(team, 'Mixed')
  },
  HIGH_RISK_GAMBLER: {
    name: 'High Risk Gambler',
    icon: '🎲',
    description: 'Apostador extremo - peões ultra especializados',
    color: '#ec4899',
    preferredType: 'Extreme',
    buildDeck: (team) => buildIntelligentDeck(team, 'Extreme')
  },
  MOMENTUM_MASTER: {
    name: 'Momentum Master',
    icon: '📈',
    description: 'Snowball progressivo - cresce ao longo da partida',
    color: '#10b981',
    preferredType: 'Progressive',
    buildDeck: (team) => buildIntelligentDeck(team, 'Progressive')
  },
  SYNERGY_SEEKER: {
    name: 'Synergy Seeker',
    icon: '🔗',
    description: 'Combo specialist - sinergia entre peões',
    color: '#06b6d4',
    preferredType: 'Synergy',
    buildDeck: (team) => buildIntelligentDeck(team, 'Synergy')
  },

  // ========================================
  // 🆕 NOVAS MENTALIDADES
  // ========================================

  ADAPTIVE_TACTICIAN: {
    name: 'Adaptive Tactician',
    icon: '🧩',
    description: 'Aprende durante a batalha - evolui a cada round',
    color: '#14b8a6',
    preferredType: 'Adaptive',
    buildDeck: (team) => buildIntelligentDeck(team, 'Adaptive')
  },

  PERFECTIONIST: {
    name: 'Perfectionist',
    icon: '✨',
    description: 'Obcecado por lançamentos perfeitos - alto risco/recompensa',
    color: '#facc15',
    preferredType: 'Precision',
    buildDeck: (team) => buildIntelligentDeck(team, 'Precision')
  },

  CHAOS_AGENT: {
    name: 'Chaos Agent',
    icon: '🌪️',
    description: 'Prospera no caos - melhor em arenas com hazards',
    color: '#a855f7',
    preferredType: 'Chaos',
    buildDeck: (team) => buildIntelligentDeck(team, 'Chaos')
  },

  MOMENTUM_THIEF: {
    name: 'Momentum Thief',
    icon: '🦹',
    description: 'Rouba momentum do adversário - counter de streaks',
    color: '#6366f1',
    preferredType: 'Disruptive',
    buildDeck: (team) => buildIntelligentDeck(team, 'Disruptive')
  }
};

// INTELLIGENT DECK BUILDING - Creates 5 beys based on mentality and intelligence
function buildIntelligentDeck(team, preferredType) {
  const deck = [];
  const intel = team.attributes?.intelligence || 7;
  
  // Determine deck composition based on intelligence (escala 0-15, neutro=7)
  let coreCount, strategicCount, versatileCount;
  
  if (intel <= 5) {
    // Low INT: 4-5 of same type, 0-1 random
    coreCount = 4 + Math.floor(Math.random() * 2);
    strategicCount = 0;
    versatileCount = 5 - coreCount;
  } else if (intel <= 9) {
    // Medium INT: 3 core, 1 strategic, 1 versatile
    coreCount = 3;
    strategicCount = 1;
    versatileCount = 1;
  } else if (intel <= 12) {
    // High INT: 2-3 core, 1-2 counters, 1 versatile
    coreCount = 2 + Math.floor(Math.random() * 2);
    strategicCount = 2;
    versatileCount = 5 - coreCount - strategicCount;
  } else {
    // Genius INT: 2 core, 2 counters, 1 wildcard
    coreCount = 2;
    strategicCount = 2;
    versatileCount = 1;
  }
  
  // Build core beys (player's main style)
  for (let i = 0; i < coreCount; i++) {
    deck.push(buildBeyByType(team, i, preferredType, true));
  }
  
  // Build strategic counters (high INT adds these)
  if (strategicCount > 0) {
    const counterTypes = getCounterTypes(preferredType);
    for (let i = 0; i < strategicCount; i++) {
      const counterType = counterTypes[i % counterTypes.length];
      deck.push(buildBeyByType(team, coreCount + i, counterType, false));
    }
  }
  
  // Build versatile/backup beys
  for (let i = 0; i < versatileCount; i++) {
    const randomType = ['Attack', 'Defense', 'Stamina', 'Balance'][Math.floor(Math.random() * 4)];
    deck.push(buildBeyByType(team, coreCount + strategicCount + i, randomType, false));
  }
  
  return deck;
}

// Get counter types based on preferred type
function getCounterTypes(preferredType) {
  const counters = {
    'Attack': ['Defense', 'Stamina'],
    'Defense': ['Attack', 'Balance'],
    'Stamina': ['Attack', 'Defense'],
    'Balance': ['Attack', 'Stamina'],
    'Mixed': ['Attack', 'Defense'],
    'Extreme': ['Defense', 'Stamina'],
    'Progressive': ['Balance', 'Stamina'],
    'Synergy': ['Balance', 'Attack'],
    // 🆕 Novos counters
    'Adaptive':    ['Balance', 'Defense'],
    'Precision':   ['Stamina', 'Balance'],
    'Chaos':       ['Attack', 'Balance'],
    'Disruptive':  ['Defense', 'Stamina']
  };
  return counters[preferredType] || ['Balance', 'Attack'];
}

// ============================================
// BLADER BONUSES SYSTEM - Applies player attributes to beyblades
// ============================================

/**
 * Aplica os bônus dos atributos do blader aos stats do beyblade
 * @param {Object} beyblade - O beyblade criado
 * @param {Object} blader - O jogador/blader
 * @param {Object} situation - Situação atual da partida (para clutch)
 * @returns {Object} Beyblade com stats modificados
 */
function applyBladerBonuses(beyblade, blader, situation = {}) {
  const attrs = blader.attributes || { 
    attack: 5, defense: 5, stamina: 5, speed: 5, 
    technique: 7, intelligence: 7, adaptability: 7, clutch: 7, launchPower: 7
  };
  
  // Clonar o beyblade para não modificar o original
  const modifiedBey = { ...beyblade };
  modifiedBey.stats = { ...beyblade.stats };
  modifiedBey.effectiveStats = { ...beyblade.effectiveStats };
  
  // Calcular bônus das peças para cada stat
  const partsBonus = {
    atk: (beyblade.layer?.atk || 0),
    def: (beyblade.layer?.def || 0),
    sta: (beyblade.driver?.sta || 0),
    bal: (beyblade.disc?.bal || 0),
    weight: (beyblade.disc?.weight || 0),
    spin: (beyblade.driver?.spin || 0)
  };
  
  // Adicionar bônus do armor
  if (beyblade.armor?.statMods) {
    Object.keys(partsBonus).forEach(stat => {
      partsBonus[stat] += (beyblade.armor.statMods[stat] || 0);
    });
  }
  
  // Objeto para armazenar APENAS o bônus adicional do blader
  const bladerBonusValues = {
    atk: 0, def: 0, sta: 0, bal: 0, weight: 0, spin: 0
  };
  
  // Calcular situação clutch
  const isClutchSituation = (
    situation.matchPoint ||
    situation.scoresTied ||
    situation.finalRound ||
    situation.behindInScore
  );
  
  // ==========================================
  // 1. ATTACK BONUS - Afeta TODOS os beyblades (sem restrição de tipo)
  // ==========================================
  // Escala 0-20, neutro=7 → abaixo: (val-7)×(20/7)%, acima: (val-7)×(25/13)%
  // Denominador 13 = range positivo 7→20; preserva +25% máximo em val=20
  const attackBonus = attrs.attack < 7
    ? (attrs.attack - 7) * (20 / 7) / 100
    : (attrs.attack - 7) * (25 / 13) / 100;
  const baseAndPartsAtk = beyblade.stats.atk + partsBonus.atk;
  const atkBonusAmount = Math.round(baseAndPartsAtk * attackBonus);
  
  modifiedBey.stats.atk = baseAndPartsAtk + atkBonusAmount; // BASE + PARTS + BÔNUS
  modifiedBey.effectiveStats.atk = Math.round(beyblade.effectiveStats.atk * (1 + attackBonus));
  bladerBonusValues.atk = atkBonusAmount;
  
  // ==========================================
  // 2. DEFENSE BONUS - Afeta TODOS os beyblades (sem restrição de tipo)
  // ==========================================
  const defenseBonus = attrs.defense < 7
    ? (attrs.defense - 7) * (20 / 7) / 100
    : (attrs.defense - 7) * (25 / 13) / 100;
  const baseAndPartsDef = beyblade.stats.def + partsBonus.def;
  const defBonusAmount = Math.round(baseAndPartsDef * defenseBonus);
  
  modifiedBey.stats.def = baseAndPartsDef + defBonusAmount; // BASE + PARTS + BÔNUS
  modifiedBey.effectiveStats.def = Math.round(beyblade.effectiveStats.def * (1 + defenseBonus));
  bladerBonusValues.def = defBonusAmount;
  
  // ==========================================
  // 3. STAMINA BONUS - Afeta TODOS os beyblades
  // ==========================================
  const staminaBonus = attrs.stamina < 7
    ? (attrs.stamina - 7) * (16 / 7) / 100
    : (attrs.stamina - 7) * (20 / 13) / 100;
  const baseAndPartsSpin = beyblade.stats.spin + partsBonus.spin;
  const spinBonusAmount = Math.round(baseAndPartsSpin * staminaBonus);
  
  modifiedBey.stats.spin = baseAndPartsSpin + spinBonusAmount; // BASE + PARTS + BÔNUS
  modifiedBey.effectiveStats.spin = Math.round(beyblade.effectiveStats.spin * (1 + staminaBonus));
  bladerBonusValues.spin = spinBonusAmount;
  
  // ==========================================
  // 4. SPEED BONUS - Afeta TODOS os beyblades
  // ==========================================
  const speedBonus = attrs.speed < 7
    ? (attrs.speed - 7) * (16 / 7) / 100
    : (attrs.speed - 7) * (20 / 13) / 100;
  const baseAndPartsSta = beyblade.stats.sta + partsBonus.sta;
  const staBonusAmount = Math.round(baseAndPartsSta * speedBonus);
  
  modifiedBey.stats.sta = baseAndPartsSta + staBonusAmount; // BASE + PARTS + BÔNUS
  modifiedBey.effectiveStats.sta = Math.round(beyblade.effectiveStats.sta * (1 + speedBonus));
  bladerBonusValues.sta = staBonusAmount;
  
  // ==========================================
  // 5. TECHNIQUE BONUS - Precisão (atk + bal) + hit accuracy para HeadlessBattle
  // ==========================================
  // techMultiplier: 0.85 (TEC=0) → 1.15 (TEC=20). Neutro TEC=7 ≈ 0.955x
  const techMultiplier = 0.85 + (attrs.technique / 20) * 0.30;
  modifiedBey.effectiveStats.atk = Math.round(modifiedBey.effectiveStats.atk * techMultiplier);
  modifiedBey.effectiveStats.bal = Math.round(modifiedBey.effectiveStats.bal * techMultiplier);
  // Também stats para motor visual (BattlePhysicsEngine lê stats.atk etc.)
  if (modifiedBey.stats.atk !== undefined) modifiedBey.stats.atk = Math.round(modifiedBey.stats.atk * techMultiplier);
  if (modifiedBey.stats.bal !== undefined) modifiedBey.stats.bal = Math.round(modifiedBey.stats.bal * techMultiplier);
  // hitAccuracy lida pelo HeadlessBattle para glancing blows (40%–100%)
  modifiedBey.hitAccuracy = 0.40 + (attrs.technique / 20) * 0.60;
  modifiedBey.staminaDrainMultiplier = 1 - (attrs.technique / 200);
  modifiedBey.burstBonusMultiplier   = 1 + (attrs.technique / 200);

  // ==========================================
  // 6. INTELLIGENCE BONUS - Def efetiva (posicionamento inteligente)
  // ==========================================
  // intMultiplier: 0.88 (INT=0) → 1.12 (INT=20). Neutro INT=7 ≈ 0.964x
  const intMultiplier = 0.88 + (attrs.intelligence / 20) * 0.24;
  modifiedBey.effectiveStats.def = Math.round(modifiedBey.effectiveStats.def * intMultiplier);
  if (modifiedBey.stats.def !== undefined) modifiedBey.stats.def = Math.round(modifiedBey.stats.def * intMultiplier);
  const counterBonus = 1 + (attrs.intelligence * 0.05 / 2.0);
  modifiedBey.counterEffectiveness = counterBonus;

  // ==========================================
  // 7. ADAPTABILITY - sta + spin efetivos + redução real de penalidade de arena
  // ==========================================
  const adaptBonus     = attrs.adaptability;
  const currentRound   = situation.currentRound || 1;
  // adaptMultiplier: 0.88 (ADA=0) → 1.12 (ADA=20). Neutro ADA=7 ≈ 0.964x
  const adaptMultiplier = 0.88 + (adaptBonus / 20) * 0.24;
  modifiedBey.effectiveStats.sta  = Math.round(modifiedBey.effectiveStats.sta  * adaptMultiplier);
  modifiedBey.effectiveStats.spin = Math.round(modifiedBey.effectiveStats.spin * adaptMultiplier);
  if (modifiedBey.stats.sta  !== undefined) modifiedBey.stats.sta  = Math.round(modifiedBey.stats.sta  * adaptMultiplier);
  if (modifiedBey.stats.spin !== undefined) modifiedBey.stats.spin = Math.round(modifiedBey.stats.spin * adaptMultiplier);
  // Propriedades informacionais (lidas por HeadlessBattle para round bonus)
  modifiedBey.arenaPenaltyReduction  = adaptBonus * (40 / 20); // 0%–40%
  modifiedBey.adaptabilityPerRound   = adaptBonus * (5  / 20); // 0%–5% por round
  modifiedBey.adaptabilityBonus      = (currentRound - 1) * modifiedBey.adaptabilityPerRound;

  // Redução real da penalidade de arena negativa (quando arena é hostil)
  if (situation.arenaModApplied && situation.arenaModApplied < 0) {
    const penaltyFraction = modifiedBey.arenaPenaltyReduction / 100; // 0.0–0.40
    const reductionFlat   = Math.abs(situation.arenaModApplied) * penaltyFraction;
    ['atk','def','sta','bal','weight','spin'].forEach(s => {
      if (modifiedBey.effectiveStats[s] !== undefined)
        modifiedBey.effectiveStats[s] = Math.round(modifiedBey.effectiveStats[s] + reductionFlat);
    });
  }

  // ==========================================
  // 8. CLUTCH - Bônus base em effectiveStats + bônus ADICIONAL em situações decisivas
  // ==========================================
  const clutchBaseBonus = attrs.clutch < 7
    ? (attrs.clutch - 7) * (4  / 7) / 100
    : (attrs.clutch - 7) * (5  / 13) / 100;

  ['atk', 'def', 'spin', 'sta', 'bal', 'weight'].forEach(stat => {
    const currentValue = modifiedBey.stats[stat];
    const baseAmount   = Math.round(currentValue * clutchBaseBonus);
    modifiedBey.stats[stat]         = currentValue + baseAmount;
    bladerBonusValues[stat]        += baseAmount;
    // Aplicar também em effectiveStats (era o bug original)
    if (modifiedBey.effectiveStats[stat] !== undefined)
      modifiedBey.effectiveStats[stat] = Math.round(modifiedBey.effectiveStats[stat] * (1 + clutchBaseBonus));
  });

  // Bônus adicional em situações clutch (-24% a +30%) — agora em effectiveStats
  if (isClutchSituation) {
    const clutchBonusExtra = attrs.clutch < 7
      ? (attrs.clutch - 7) * (24 / 7) / 100
      : (attrs.clutch - 7) * (30 / 13) / 100;

    ['atk', 'def', 'spin', 'sta', 'bal', 'weight'].forEach(stat => {
      const currentValue = modifiedBey.stats[stat];
      const clutchAmount = Math.round(currentValue * clutchBonusExtra);
      modifiedBey.stats[stat]         = currentValue + clutchAmount;
      bladerBonusValues[stat]        += clutchAmount;
      if (modifiedBey.effectiveStats[stat] !== undefined)
        modifiedBey.effectiveStats[stat] = Math.round(modifiedBey.effectiveStats[stat] * (1 + clutchBonusExtra));
    });

    modifiedBey.isClutch = true;
  }

  // ==========================================
  // CAP DE STATS — Evita valores absurdos por cascata de multiplicadores
  // ==========================================
  const EFFECTIVE_STAT_CAPS = { atk: 48, def: 48, sta: 48, bal: 48, weight: 48, spin: 95 };
  ['atk','def','sta','bal','weight','spin'].forEach(s => {
    if (modifiedBey.effectiveStats[s] !== undefined)
      modifiedBey.effectiveStats[s] = Math.min(modifiedBey.effectiveStats[s], EFFECTIVE_STAT_CAPS[s]);
  });

  // Armazenar informação sobre os bônus aplicados
  modifiedBey.bladerBonusValues = bladerBonusValues;
  modifiedBey.bladerBonuses = {
    attack: attrs.attack < 7 ? (attrs.attack - 7) * (20 / 7) : (attrs.attack - 7) * (25 / 13),
    defense: attrs.defense < 7 ? (attrs.defense - 7) * (20 / 7) : (attrs.defense - 7) * (25 / 13),
    stamina: attrs.stamina < 7 ? (attrs.stamina - 7) * (16 / 7) : (attrs.stamina - 7) * (20 / 13),
    speed: attrs.speed < 7 ? (attrs.speed - 7) * (16 / 7) : (attrs.speed - 7) * (20 / 13),
    technique: attrs.technique,
    intelligence: attrs.intelligence,
    adaptability: attrs.adaptability,
    clutch: attrs.clutch < 7 ? (attrs.clutch - 7) * (4 / 7) : (attrs.clutch - 7) * (5 / 13),
    clutchExtra: isClutchSituation
      ? (attrs.clutch < 7 ? (attrs.clutch - 7) * (24 / 7) : (attrs.clutch - 7) * (30 / 13))
      : 0,
    launchPower: attrs.launchPower || 7,
    isClutchActive: isClutchSituation
  };
  // ==========================================
  // 🆕 LÓGICA ESPECIAL DAS NOVAS MENTALIDADES
  // ==========================================
  const mentality = blader.mentality;

  // ── 🧩 ADAPTIVE_TACTICIAN ──────────────────────────────────────────
  // +10% stats por round após o 1º, +10% adicional por round perdido
  if (mentality === 'ADAPTIVE_TACTICIAN') {
    const round = situation.currentRound || 1;
    const roundsLost = situation.roundsLost || 0;
    const roundBonus = (round - 1) * 0.10;
    const lossBonus  = roundsLost * 0.10;
    const totalAdaptBonus = roundBonus + lossBonus;

    if (totalAdaptBonus > 0) {
      ['atk', 'def', 'sta'].forEach(stat => {
        modifiedBey.stats[stat] = Math.round(modifiedBey.stats[stat] * (1 + totalAdaptBonus));
        modifiedBey.effectiveStats[stat] = Math.round((modifiedBey.effectiveStats[stat] || modifiedBey.stats[stat]) * (1 + totalAdaptBonus));
      });
      modifiedBey._adaptiveTacticianBonus = totalAdaptBonus;
    }
  }

  // ── ✨ PERFECTIONIST ───────────────────────────────────────────────
  // +25% stats quando launch quality é PERFECT; -20% quando WEAK/CRITICAL_FAIL
  if (mentality === 'PERFECTIONIST') {
    const launchKey = situation.launchQuality;
    if (launchKey === 'PERFECT') {
      ['atk', 'def', 'sta', 'spin'].forEach(stat => {
        modifiedBey.stats[stat] = Math.round((modifiedBey.stats[stat] || 0) * 1.25);
        modifiedBey.effectiveStats[stat] = Math.round((modifiedBey.effectiveStats[stat] || modifiedBey.stats[stat]) * 1.25);
      });
      modifiedBey._perfectionistBonus = 'PERFECT';
    } else if (launchKey === 'WEAK' || launchKey === 'CRITICAL_FAIL') {
      ['atk', 'def', 'spin'].forEach(stat => {
        modifiedBey.stats[stat] = Math.round((modifiedBey.stats[stat] || 0) * 0.80);
        modifiedBey.effectiveStats[stat] = Math.round((modifiedBey.effectiveStats[stat] || modifiedBey.stats[stat]) * 0.80);
      });
      modifiedBey._perfectionistBonus = 'PENALTY';
    }
  }

  // ── 🌪️ CHAOS_AGENT ────────────────────────────────────────────────
  // +30% em arenas caóticas (hazards), -15% em arenas tranquilas
  if (mentality === 'CHAOS_AGENT') {
    const hazardArenas = [
      'VOLCANIC_RAGE', 'COLOSSEUM_CARNAGE', 'STORM_TRACK',
      'PANGEA_PLATFORM', 'VORTEX_MAELSTROM', 'TIDAL_SURGE',
      'TORNADO_RIDGE', 'GRAVITON_COLOSSEUM', 'KILLER_SIDES'
    ];
    const currentArena = situation.arena || '';
    const isHazardArena = hazardArenas.includes(currentArena);

    if (isHazardArena) {
      ['atk', 'def', 'spin'].forEach(stat => {
        modifiedBey.stats[stat] = Math.round((modifiedBey.stats[stat] || 0) * 1.30);
        modifiedBey.effectiveStats[stat] = Math.round((modifiedBey.effectiveStats[stat] || modifiedBey.stats[stat]) * 1.30);
      });
      modifiedBey._chaosAgentBonus = 'HAZARD_ARENA';
    } else if (currentArena) {
      ['atk', 'def', 'spin'].forEach(stat => {
        modifiedBey.stats[stat] = Math.round((modifiedBey.stats[stat] || 0) * 0.85);
        modifiedBey.effectiveStats[stat] = Math.round((modifiedBey.effectiveStats[stat] || modifiedBey.stats[stat]) * 0.85);
      });
      modifiedBey._chaosAgentBonus = 'CALM_ARENA';
    }
  }

  // ── 🦹 MOMENTUM_THIEF ─────────────────────────────────────────────
  // +5% ATK/DEF por vitória na streak do adversário (min 2 vitórias)
  if (mentality === 'MOMENTUM_THIEF') {
    const opponentStreak = situation.opponentWinStreak || 0;
    if (opponentStreak >= 2) {
      const streakBonus = opponentStreak * 0.05; // +5% por vitória na streak
      ['atk', 'def'].forEach(stat => {
        modifiedBey.stats[stat] = Math.round((modifiedBey.stats[stat] || 0) * (1 + streakBonus));
        modifiedBey.effectiveStats[stat] = Math.round((modifiedBey.effectiveStats[stat] || modifiedBey.stats[stat]) * (1 + streakBonus));
      });
    }
  }

  return modifiedBey;
}

// Build bey by type with proper stats
function buildBeyByType(team, position, type, isCore) {
  const intensity = isCore ? 1.2 : 1.0; // Core beys are slightly better
  
  if (type === 'Attack' || type === 'Extreme') {
    return buildGlassCannonBey(team, position);
  } else if (type === 'Defense') {
    return buildFortressBey(team, position);
  } else if (type === 'Stamina') {
    return buildEternalBey(team, position);
  } else if (type === 'Mixed') {
    return buildSpecializedBey(team, position, ['Attack', 'Defense', 'Stamina'][position % 3]);
  } else if (type === 'Progressive') {
    return buildMomentumBey(team, position, 75 + (position * 15));
  } else if (type === 'Synergy') {
    const rotation = Math.random() > 0.5 ? 'Left' : 'Right';
    return buildSynergyBey(team, position, rotation);
  // 🆕 Novos tipos
  } else if (type === 'Adaptive') {
    return buildAdaptiveBey(team, position);
  } else if (type === 'Precision') {
    return buildPrecisionBey(team, position);
  } else if (type === 'Chaos') {
    return buildChaosBey(team, position);
  } else if (type === 'Disruptive') {
    return buildDisruptiveBey(team, position);
  } else {
    return buildBalancedBey(team, position);
  }
}

// ============================================
// INTELLIGENT DECK ADAPTATION SYSTEM
// ============================================

/**
 * Adapta o deck de um jogador baseado na arena do torneio
 * NOVO SISTEMA: 1 Signature + 2 Season + 2 Tournament
 */
function adaptDeckForArena(team, arena) {
  // Resolve playerId: pros → index em TEAMS, newgens → team.id (string ex: "NG_001")
  // Isso garante que PROS E NEWGENS usam o mesmo pipeline completo
  let playerId = TEAMS.findIndex(t => t.name === team.name);
  if (playerId === -1 && team.id !== undefined) {
    // Jogador não está em TEAMS → é newgen. Usar team.id como chave do Map
    playerId = team.id;
  }
  
  // ===== HELPER: Arena Preference Modifier =====
  // Mapeamento mentality → {fav: [arena1,2,3], hate: [arena1,2,3]}
  const ARENA_PREF_LOCAL = {
    ALL_ROUNDER:       { fav: ['BB10_COMPETITIVE','PANGEA_PLATFORM','DOMINATION_ZONES'], hate: ['PINBALL_INFERNO','VOLCANIC_RAGE','COLOSSEUM_CARNAGE'] },
    GLASS_CANNON:      { fav: ['COLOSSEUM_CARNAGE','PINBALL_INFERNO','STORM_TRACK'],     hate: ['KILLER_SIDES','VORTEX_COLISEUM','DOMINATION_ZONES'] },
    IRON_FORTRESS:     { fav: ['NEXUS','DOMINATION_ZONES','PANGEA_PLATFORM'],            hate: ['PINBALL_INFERNO','STORM_TRACK','COLOSSEUM_CARNAGE'] },
    ETERNAL_SPINNER:   { fav: ['VORTEX_COLISEUM','KILLER_SIDES','TIDAL_SURGE'],          hate: ['COLOSSEUM_CARNAGE','PINBALL_INFERNO','VOLCANIC_RAGE'] },
    CALCULATED_CHAOS:  { fav: ['NEXUS','COLOSSEUM_CARNAGE','DOMINATION_ZONES'],          hate: ['BB10_COMPETITIVE','KILLER_SIDES','PANGEA_PLATFORM'] },
    HIGH_RISK_GAMBLER: { fav: ['PINBALL_INFERNO','COLOSSEUM_CARNAGE','STORM_TRACK'],     hate: ['BB10_COMPETITIVE','PANGEA_PLATFORM','DOMINATION_ZONES'] },
    MOMENTUM_MASTER:   { fav: ['STORM_TRACK','TIDAL_SURGE','VORTEX_COLISEUM'],           hate: ['PINBALL_INFERNO','VOLCANIC_RAGE','NEXUS'] },
    SYNERGY_SEEKER:    { fav: ['DOMINATION_ZONES','NEXUS','PANGEA_PLATFORM'],            hate: ['PINBALL_INFERNO','VOLCANIC_RAGE','COLOSSEUM_CARNAGE'] },
    ADAPTIVE_TACTICIAN:{ fav: ['NEXUS','DOMINATION_ZONES','BB10_COMPETITIVE'],           hate: ['VOLCANIC_RAGE','KILLER_SIDES','VORTEX_COLISEUM'] },
    PERFECTIONIST:     { fav: ['BB10_COMPETITIVE','PANGEA_PLATFORM','KILLER_SIDES'],     hate: ['PINBALL_INFERNO','COLOSSEUM_CARNAGE','TIDAL_SURGE'] },
    CHAOS_AGENT:       { fav: ['PINBALL_INFERNO','VOLCANIC_RAGE','COLOSSEUM_CARNAGE'],   hate: ['BB10_COMPETITIVE','PANGEA_PLATFORM','NEXUS'] },
    MOMENTUM_THIEF:    { fav: ['KILLER_SIDES','DOMINATION_ZONES','STORM_TRACK'],         hate: ['TIDAL_SURGE','VORTEX_COLISEUM','PANGEA_PLATFORM'] },
  };
  
  const getArenaPrefMod = (mentality, arenaCode) => {
    if (!mentality || !arenaCode) return 0;
    // Resolve code from name if needed
    const code = (() => {
      const found = Object.values(ARENA_CONFIG || {}).find(c => c.code === arenaCode || c.name === arenaCode);
      return found?.code || arenaCode;
    })();
    const prefs = ARENA_PREF_LOCAL[mentality] || ARENA_PREF_LOCAL.ALL_ROUNDER;
    if (prefs.fav[0] === code) return +6;
    if (prefs.fav[1] === code) return +4;
    if (prefs.fav[2] === code) return +2;
    if (prefs.hate[0] === code) return -6;
    if (prefs.hate[1] === code) return -4;
    if (prefs.hate[2] === code) return -2;
    return 0;
  };

  // ===== HELPER: Aplicar pipeline completo a um bey =====
  // Ordem: arena pref (BASE) → forma → player attrs (ÚLTIMO)
  const finalizeBey = (bey, arenaMod) => {
    // 1. Arena preference → flat adicionado ao BASE (antes de qualquer %)
    if (arenaMod !== 0 && bey) {
      const BSTATS = ['atk','def','sta','bal','weight','spin'];
      BSTATS.forEach(s => {
        if (bey.stats && bey.stats[s] !== undefined) {
          bey.stats[s] = Math.max(1, bey.stats[s] + arenaMod);
        }
        if (bey.effectiveStats && bey.effectiveStats[s] !== undefined) {
          bey.effectiveStats[s] = Math.max(1, bey.effectiveStats[s] + arenaMod);
        }
      });
      bey._arenaPreferenceMod = arenaMod;
    }
    
    // 2. Forma + FORM_MULTIPLIER traits → % sobre BASE (arena pref incluído)
    if (universeManagerInstance?.formManager) {
      const traitData = getPlayerTraitData(team.name);
      const playerTraits = (traitData.traits || []).filter(t => t && t.id); // v2.0: {id, tier}
      bey = applyFormaMultiplier(bey, 1.0, universeManagerInstance, playerTraits, {});
    }
    
    // 3. Atributos do player → % aplicado POR ÚLTIMO, em cima de tudo
    // Passa arenaMod para que ADA possa reduzir penalidades negativas
    bey = applyBladerBonuses(bey, team, { arenaModApplied: arenaMod });
    
    return bey;
  };

  // Arena modifier value para este jogador/arena
  const arenaMod = getArenaPrefMod(team.mentality, arena);

  // Se não encontrou o jogador por nenhum ID, último recurso
  if (playerId === -1) {
    const fallbackDeck = MENTALITIES[team.mentality]?.buildDeck(team) || buildIntelligentDeck(team, 'Balance');
    // Aplicar forma + atributos — mesmo pipeline dos pros
    return fallbackDeck.map(bey => {
      if (universeManagerInstance?.formManager) {
        const traitData = getPlayerTraitData(team.name);
        const playerTraits = (traitData?.traits || []).filter(t => t && t.id); // v2.0: {id, tier}
        bey = applyFormaMultiplier(bey, 1.0, universeManagerInstance, playerTraits, {});
      }
      return applyBladerBonuses(bey, team);
    });
  }
  
  // Obter Signature Blade do jogador
  const signatureData = universeManagerInstance?.signatureBlades?.get(playerId);
  const signatureBlade = signatureData?.blade;
  
  // Obter Season Blades da temporada atual
  const seasonBlades = universeManagerInstance?.seasonBlades?.get(playerId);
  
  // Se não tem Signature ou Season (save antigo?), criar agora
  if (!signatureBlade) {
    console.warn(`⚠️ Signature Blade não encontrado para ${team.name}, criando agora...`);
    const newSignatureData = initializeSignatureBladeForPlayer(playerId, team);
    if (universeManagerInstance) {
      universeManagerInstance.signatureBlades.set(playerId, newSignatureData);
    }
  }
  
  if (!seasonBlades || seasonBlades.length === 0) {
    console.warn(`⚠️ Season Blades não encontrados para ${team.name}, criando agora...`);
    const newSeasonBlades = createSeasonBlades(team, playerId);
    if (universeManagerInstance) {
      universeManagerInstance.seasonBlades.set(playerId, newSeasonBlades);
    }
  }
  
  // Buscar novamente após possível criação
  const finalSignature = universeManagerInstance?.signatureBlades?.get(playerId)?.blade;
  const finalSeasons = universeManagerInstance?.seasonBlades?.get(playerId);
  
  // Se ainda não tem (modo exibição sem universe?), fallback com pipeline completo
  if (!finalSignature || !finalSeasons || finalSeasons.length < 2) {
    const fallbackDeck = MENTALITIES[team.mentality]?.buildDeck(team) || buildIntelligentDeck(team, 'Balance');
    return fallbackDeck.map(bey => {
      if (universeManagerInstance?.formManager) {
        const traitData = getPlayerTraitData(team.name);
        const playerTraits = (traitData?.traits || []).filter(t => t && t.id); // v2.0: {id, tier}
        bey = applyFormaMultiplier(bey, 1.0, universeManagerInstance, playerTraits, {});
      }
      return applyBladerBonuses(bey, team);
    });
  }
  
  // Montar deck RAW: 1 Signature + 2 Season + 2 Tournament
  const rawDeck = buildFullDeck(team, playerId, arena, finalSignature, finalSeasons);
  
  // Aplicar pipeline completo: arena pref (base) → forma → player attrs
  return rawDeck.map(bey => finalizeBey(bey, arenaMod));
}

/**
 * Seleciona o melhor tipo para o jogador baseado em seus atributos
 */
function selectBestTypeForPlayer(team, favoredTypes) {
  const attrs = team.attributes;
  
  // Mapear tipos para atributos necessários
  const typeRequirements = {
    'Attack': attrs.attack + attrs.speed,
    'Defense': attrs.defense + attrs.stamina,
    'Stamina': attrs.stamina + attrs.technique,
    'Balance': attrs.attack + attrs.defense + attrs.stamina
  };
  
  // Escolher tipo favorecido que melhor se alinha com atributos do jogador
  let bestType = favoredTypes[0];
  let bestScore = -1;
  
  favoredTypes.forEach(type => {
    const score = typeRequirements[type] || 0;
    if (score > bestScore) {
      bestScore = score;
      bestType = type;
    }
  });
  
  return bestType;
}

/**
 * Constrói deck adaptado com composição específica
 */
function buildAdaptedDeck(team, coreType, composition, arenaPrefs) {
  const deck = [];
  
  // 1. Construir CORE beys (tipo principal)
  for (let i = 0; i < composition.core; i++) {
    const bey = buildBeyByType(team, i, coreType, true);
    
    // Otimizar stats baseado nas preferências da arena
    if (arenaPrefs.preferredStats) {
      bey.arenaOptimized = true;
      bey.optimizedFor = arenaPrefs.name;
    }
    
    deck.push(bey);
  }
  
  // 2. Construir COUNTER beys (para meta)
  if (composition.counter > 0) {
    const counterTypes = getCounterTypes(coreType);
    
    // Priorizar counters que também são favorecidos pela arena
    const smartCounters = counterTypes.filter(ct => 
      arenaPrefs.favoredTypes.includes(ct)
    );
    
    const countersToUse = smartCounters.length > 0 ? smartCounters : counterTypes;
    
    for (let i = 0; i < composition.counter; i++) {
      const counterType = countersToUse[i % countersToUse.length];
      deck.push(buildBeyByType(team, composition.core + i, counterType, false));
    }
  }
  
  // 3. Construir VERSATILE/BACKUP beys
  for (let i = 0; i < composition.versatile; i++) {
    const randomType = ['Attack', 'Defense', 'Stamina', 'Balance'][Math.floor(Math.random() * 4)];
    deck.push(buildBeyByType(team, composition.core + composition.counter + i, randomType, false));
  }
  
  // ===== APLICAR MULTIPLICADOR DE FORMA COM TRAITS =====
  if (universeManagerInstance?.formManager) {
    // Pegar traits do jogador
    const traitData = getPlayerTraitData(team.name);
    const playerTraits = (traitData.traits || []).filter(t => t && t.id); // v2.0: {id, tier}
    
    // Contexto de batalha (vazio aqui, será preenchido durante a batalha)
    const battleContext = {};
    
    deck = deck.map(bey => applyFormaMultiplier(
      bey, 
      1.0, // formaMultiplier será calculado dentro da função
      universeManagerInstance, 
      playerTraits, 
      battleContext
    ));
  }
  
  // ===== ATRIBUTOS DO PLAYER — ÚLTIMO PASSO (% sobre base + forma) =====
  deck = deck.map(bey => applyBladerBonuses(bey, team));
  
  return deck;
}

// ===== APLICAR MULTIPLICADOR DE FORMA AOS STATS COM TRAITS =====
function applyFormaMultiplier(beyblade, formaMultiplier = 1.0, universeManager = null, playerTraits = [], battleContext = {}) {
  if (!beyblade || !beyblade.effectiveStats) {
    return beyblade;
  }
  
  // Se tem universeManager e traits, calcular multiplicador COM traits
  let finalMultiplier = formaMultiplier;
  
  if (universeManager?.formManager && beyblade.team?.id !== undefined && playerTraits.length > 0) {
    finalMultiplier = universeManager.formManager.getStatsMultiplierWithTraits(
      beyblade.team.id, 
      playerTraits, 
      battleContext
    );
  }
  
  // Se multiplicador = 1.0, não fazer nada
  if (finalMultiplier === 1.0) {
    return beyblade;
  }
  
  // Criar cópia do beyblade para não mutar o original
  const modifiedBey = { ...beyblade };
  
  // Aplicar multiplicador aos stats efetivos
  modifiedBey.effectiveStats = {
    atk: Math.round(beyblade.effectiveStats.atk * finalMultiplier),
    def: Math.round(beyblade.effectiveStats.def * finalMultiplier),
    sta: Math.round(beyblade.effectiveStats.sta * finalMultiplier),
    bal: Math.round(beyblade.effectiveStats.bal * finalMultiplier),
    weight: Math.round(beyblade.effectiveStats.weight * finalMultiplier),
    spin: Math.round(beyblade.effectiveStats.spin * finalMultiplier)
  };
  
  // Adicionar flag indicando que forma foi aplicada
  modifiedBey.formaApplied = true;
  modifiedBey.formaMultiplier = finalMultiplier;
  
  // Log para debug (se universeManager fornecido)
  if (universeManager?.formManager && beyblade.team?.id !== undefined) {
    const state = universeManager.formManager.getFormaSummary(beyblade.team.id);
    if (state) {
      console.log(`📊 ${beyblade.name}: ${state.state} (${(finalMultiplier * 100).toFixed(0)}%) ${state.icon}`);
    }
  }
  
  return modifiedBey;
}

// DECK BUILDING FUNCTIONS

function buildBalancedBey(team, position) {
  // All stats between 10-18, no extremes
  const atk = 10 + Math.floor(Math.random() * 9);
  const def = 10 + Math.floor(Math.random() * 9);
  const sta = 10 + Math.floor(Math.random() * 9);
  const bal = 10 + Math.floor(Math.random() * 9);
  const weight = 10 + Math.floor(Math.random() * 9);
  const spin = 35 + Math.floor(Math.random() * 16);
  
  return createBeyFromStats(team, position, { atk, def, sta, bal, weight, spin }, 'Balance');
}

function buildGlassCannonBey(team, position) {
  // Max ATK and SPIN, minimal DEF and BAL
  const atk = 20 + Math.floor(Math.random() * 6);
  const def = 5 + Math.floor(Math.random() * 4);
  const sta = 8 + Math.floor(Math.random() * 5);
  const bal = 6 + Math.floor(Math.random() * 4);
  const weight = 12 + Math.floor(Math.random() * 6);
  const spin = 45 + Math.floor(Math.random() * 11);
  
  return createBeyFromStats(team, position, { atk, def, sta, bal, weight, spin }, 'Attack', 'Right', 60);
}

function buildFortressBey(team, position) {
  // Max DEF and WEIGHT, moderate everything else
  const atk = 6 + Math.floor(Math.random() * 5);
  const def = 22 + Math.floor(Math.random() * 7);
  const sta = 10 + Math.floor(Math.random() * 6);
  const bal = 12 + Math.floor(Math.random() * 6);
  const weight = 18 + Math.floor(Math.random() * 8);
  const spin = 35 + Math.floor(Math.random() * 11);
  
  return createBeyFromStats(team, position, { atk, def, sta, bal, weight, spin }, 'Defense', null, 80);
}

function buildEternalBey(team, position) {
  // Max STA and SPIN, low ATK/DEF
  const atk = 5 + Math.floor(Math.random() * 4);
  const def = 6 + Math.floor(Math.random() * 5);
  const sta = 25 + Math.floor(Math.random() * 6);
  const bal = 15 + Math.floor(Math.random() * 6);
  const weight = 8 + Math.floor(Math.random() * 5);
  const spin = 50 + Math.floor(Math.random() * 11);
  
  return createBeyFromStats(team, position, { atk, def, sta, bal, weight, spin }, 'Stamina', 'Left', 70);
}

function buildSpecializedBey(team, position, type) {
  // Build bey specialized in its type
  let stats;
  let rotation = null;
  let height = 70;
  
  if (type === 'Attack') {
    stats = {
      atk: 18 + Math.floor(Math.random() * 7),
      def: 8 + Math.floor(Math.random() * 5),
      sta: 10 + Math.floor(Math.random() * 5),
      bal: 10 + Math.floor(Math.random() * 5),
      weight: 12 + Math.floor(Math.random() * 6),
      spin: 40 + Math.floor(Math.random() * 11)
    };
    rotation = 'Right';
    height = 60;
  } else if (type === 'Defense') {
    stats = {
      atk: 8 + Math.floor(Math.random() * 5),
      def: 20 + Math.floor(Math.random() * 7),
      sta: 10 + Math.floor(Math.random() * 6),
      bal: 14 + Math.floor(Math.random() * 5),
      weight: 16 + Math.floor(Math.random() * 7),
      spin: 35 + Math.floor(Math.random() * 11)
    };
    height = 80;
  } else { // Stamina
    stats = {
      atk: 6 + Math.floor(Math.random() * 5),
      def: 8 + Math.floor(Math.random() * 5),
      sta: 22 + Math.floor(Math.random() * 6),
      bal: 14 + Math.floor(Math.random() * 5),
      weight: 10 + Math.floor(Math.random() * 5),
      spin: 48 + Math.floor(Math.random() * 9)
    };
    rotation = 'Left';
    height = 70;
  }
  
  return createBeyFromStats(team, position, stats, type, rotation, height);
}

function buildGamblerBey(team, position, focusStat) {
  // One stat 25-30, rest 5-10
  const stats = {
    atk: 5 + Math.floor(Math.random() * 6),
    def: 5 + Math.floor(Math.random() * 6),
    sta: 5 + Math.floor(Math.random() * 6),
    bal: 5 + Math.floor(Math.random() * 6),
    weight: 5 + Math.floor(Math.random() * 6),
    spin: 30 + Math.floor(Math.random() * 11)
  };
  
  let type = 'Balance';
  let rotation = null;
  let height = 70;
  
  if (focusStat === 'atk') {
    stats.atk = 25 + Math.floor(Math.random() * 6);
    stats.spin = 50 + Math.floor(Math.random() * 11);
    type = 'Attack';
    rotation = 'Right';
    height = 60;
  } else if (focusStat === 'def') {
    stats.def = 28 + Math.floor(Math.random() * 3);
    stats.weight = 25 + Math.floor(Math.random() * 6);
    type = 'Defense';
    height = 80;
  } else { // sta
    stats.sta = 28 + Math.floor(Math.random() * 3);
    stats.spin = 55 + Math.floor(Math.random() * 6);
    type = 'Stamina';
    rotation = 'Left';
    height = 70;
  }
  
  return createBeyFromStats(team, position, stats, type, rotation, height);
}

function buildMomentumBey(team, position, totalPoints) {
  // Distribute totalPoints across stats
  const stats = { atk: 1, def: 1, sta: 1, bal: 1, weight: 1, spin: 20 };
  let remaining = totalPoints - 25;
  
  while (remaining > 0) {
    const statIndex = Math.floor(Math.random() * 6);
    if (statIndex === 0 && stats.atk < 30) { stats.atk++; remaining--; }
    else if (statIndex === 1 && stats.def < 30) { stats.def++; remaining--; }
    else if (statIndex === 2 && stats.sta < 30) { stats.sta++; remaining--; }
    else if (statIndex === 3 && stats.bal < 30) { stats.bal++; remaining--; }
    else if (statIndex === 4 && stats.weight < 30) { stats.weight++; remaining--; }
    else if (statIndex === 5 && stats.spin < 60) { stats.spin++; remaining--; }
  }
  
  const maxStat = Math.max(stats.atk, stats.def, stats.sta);
  let type = 'Balance';
  if (maxStat === stats.atk && stats.atk >= 12) type = 'Attack';
  else if (maxStat === stats.def && stats.def >= 12) type = 'Defense';
  else if (maxStat === stats.sta && stats.sta >= 12) type = 'Stamina';
  
  return createBeyFromStats(team, position, stats, type);
}

function buildSynergyBey(team, position, rotation) {
  // All same rotation, focused on synergies
  const stats = {
    atk: 12 + Math.floor(Math.random() * 8),
    def: 12 + Math.floor(Math.random() * 8),
    sta: 12 + Math.floor(Math.random() * 8),
    bal: 12 + Math.floor(Math.random() * 8),
    weight: 12 + Math.floor(Math.random() * 8),
    spin: 40 + Math.floor(Math.random() * 11)
  };
  
  const type = rotation === 'Left' ? 'Stamina' : 'Balance';
  
  return createBeyFromStats(team, position, stats, type, rotation);
}

// ============================================
// 🆕 ADAPTIVE TACTICIAN BEY BUILDER
// ============================================
function buildAdaptiveBey(team, position) {
  // Builds equilibrados que escalam com rounds - começa conservador, cresce
  const atk    = 12 + Math.floor(Math.random() * 5); // 12-16
  const def    = 12 + Math.floor(Math.random() * 5); // 12-16
  const sta    = 12 + Math.floor(Math.random() * 5); // 12-16
  const bal    = 14 + Math.floor(Math.random() * 5); // 14-18 (mais estável)
  const weight = 12 + Math.floor(Math.random() * 5); // 12-16
  const spin   = 40 + Math.floor(Math.random() * 12); // 40-51
  return createBeyFromStats(
    team, position,
    { atk, def, sta, bal, weight, spin },
    'Balance',
    Math.random() > 0.5 ? 'Right' : 'Left',
    70
  );
}

// ============================================
// 🆕 PERFECTIONIST BEY BUILDER
// ============================================
function buildPrecisionBey(team, position) {
  // Alto stamina e spin - focado em precisão e consistência
  const atk    = 8  + Math.floor(Math.random() * 5);  // 8-12
  const def    = 10 + Math.floor(Math.random() * 5);  // 10-14
  const sta    = 18 + Math.floor(Math.random() * 6);  // 18-23 (alto)
  const bal    = 16 + Math.floor(Math.random() * 6);  // 16-21 (muito estável)
  const weight = 10 + Math.floor(Math.random() * 5);  // 10-14
  const spin   = 48 + Math.floor(Math.random() * 12); // 48-59 (muito alto)
  return createBeyFromStats(
    team, position,
    { atk, def, sta, bal, weight, spin },
    'Stamina',
    Math.random() > 0.7 ? 'Left' : 'Right',
    70
  );
}

// ============================================
// 🆕 CHAOS AGENT BEY BUILDER
// ============================================
function buildChaosBey(team, position) {
  // Stats completamente aleatórios e imprevisíveis
  const variance = 8;
  const atk    = 8 + Math.floor(Math.random() * variance * 2); // 8-23
  const def    = 8 + Math.floor(Math.random() * variance * 2);
  const sta    = 8 + Math.floor(Math.random() * variance * 2);
  const bal    = 8 + Math.floor(Math.random() * variance * 2);
  const weight = 8 + Math.floor(Math.random() * variance * 2);
  const spin   = 30 + Math.floor(Math.random() * 30);          // 30-59
  const randomTypes = ['Attack', 'Defense', 'Stamina', 'Balance'];
  return createBeyFromStats(
    team, position,
    { atk, def, sta, bal, weight, spin },
    randomTypes[Math.floor(Math.random() * 4)],
    Math.random() > 0.5 ? 'Right' : 'Left',
    60 + Math.floor(Math.random() * 25) // 60-84 (altura aleatória)
  );
}

// ============================================
// 🆕 MOMENTUM THIEF BEY BUILDER
// ============================================
function buildDisruptiveBey(team, position) {
  // Defensivo com bom stamina - focado em counter e disrupção
  const atk    = 10 + Math.floor(Math.random() * 5);  // 10-14
  const def    = 16 + Math.floor(Math.random() * 6);  // 16-21 (alto)
  const sta    = 14 + Math.floor(Math.random() * 6);  // 14-19
  const bal    = 14 + Math.floor(Math.random() * 5);  // 14-18
  const weight = 14 + Math.floor(Math.random() * 6);  // 14-19
  const spin   = 44 + Math.floor(Math.random() * 12); // 44-55
  return createBeyFromStats(
    team, position,
    { atk, def, sta, bal, weight, spin },
    'Defense',
    Math.random() > 0.6 ? 'Left' : 'Right',
    75 // Altura defensiva
  );
}

function createBeyFromStats(team, position, stats, type, rotation = null, height = null) {
  const { atk, def, sta, bal, weight, spin } = stats;
  
  function applyDiminishingReturns(value) {
    // ⚔️ DIMINISHING RETURNS REMOVIDO - Poder total para narrativas épicas
    return value;
  }
  
  const effectiveStats = {
    atk: applyDiminishingReturns(atk),
    def: applyDiminishingReturns(def),
    sta: applyDiminishingReturns(sta),
    bal: applyDiminishingReturns(bal),
    weight: applyDiminishingReturns(weight),
    spin: spin  // ⚔️ Spin também sem diminishing returns
  };
  
  if (!rotation) {
    rotation = type === 'Stamina' ? (Math.random() > 0.5 ? 'Right' : 'Left') : 
                type === 'Attack' ? 'Right' : 
                (Math.random() > 0.3 ? 'Right' : 'Left');
  }
  
  if (!height) {
    height = type === 'Attack' ? 60 : type === 'Defense' ? 80 : 70;
  }
  
  const synergies = [];
  
  if (atk >= 15 && weight >= 15) {
    synergies.push({ name: '💪 Heavy Hitter', bonus: 'Knockback +25%' });
  }
  if (def >= 15 && bal >= 15) {
    synergies.push({ name: '🏰 Fortress', bonus: 'Redução de dano +20%' });
  }
  if (sta >= 15 && spin >= 40) {
    synergies.push({ name: '♻️ Perpetual', bonus: 'Regen +0.3/s' });
  }
  if (weight >= 12 && spin >= 35) {
    synergies.push({ name: '⚡ Momentum', bonus: 'Dano escala com velocidade' });
  }
  if (atk >= 12 && bal >= 12) {
    synergies.push({ name: '🎯 Precision', bonus: 'Critical +15%' });
  }
  if (type === 'Stamina' && rotation === 'Left' && sta >= 12) {
    synergies.push({ name: '🔄 Spin Stealer', bonus: 'Equalização +30%' });
  }
  
  const breakpoints = [];
  
  if (atk >= 17) breakpoints.push({ stat: 'ATK', name: '🔪 Corte Preciso', desc: 'Hits em alta vel aplicam Corte: -2 estabilidade/s no oponente (máx 2 stacks)' });
  if (def >= 17) breakpoints.push({ stat: 'DEF', name: '🛡️ Iron Wall', desc: 'Bloqueia primeiro hit' });
  if (bal >= 17) breakpoints.push({ stat: 'BAL', name: '⚖️ Perfect Balance', desc: 'Reduz perda de estabilidade em colisões' });
  if (weight >= 17) breakpoints.push({ stat: 'WEIGHT', name: '⚓ Ancoragem', desc: 'Threshold de ring-out +30%' });
  if (spin >= 17) breakpoints.push({ stat: 'SPIN', name: '🌊 Turbilhão', desc: 'Recupera 15% do spin perdido em cada colisão' });
  if (sta >= 17) breakpoints.push({ stat: 'STA', name: '🌀 Inércia', desc: 'Spin decay reduzido em 35%' });
  if (bal >= 17) breakpoints.push({ stat: 'BAL', name: '🎯 Centro de Gravidade', desc: '-20% burst recebido enquanto spin > 50%' });
  
  if (atk >= 27) breakpoints.push({ stat: 'ATK', name: '⚔️ Rajada de Aço', desc: 'A cada 3 hits consecutivos, o próximo é crit garantido' });
  if (def >= 27) breakpoints.push({ stat: 'DEF', name: '🛡️ Absolute Barrier', desc: 'Reduz TODO dano em 60%' });
  if (def >= 27) breakpoints.push({ stat: 'DEF', name: '🧱 Muro Vivo', desc: 'Uma vez/round: burst > 60 reseta para 30 + 8s escudo -50% burst' });
  if (sta >= 27) breakpoints.push({ stat: 'STA', name: '♾️ Espiral Eterna', desc: 'Quando spin < 35%: decay para por 8s (colisões custam +12 stamina)' });
  if (bal >= 27) breakpoints.push({ stat: 'BAL', name: '🎯 Gyro Lock', desc: 'Knockback recebido 40% + 60% convertido em spin' });
  if (weight >= 27) breakpoints.push({ stat: 'WEIGHT', name: '🌑 Campo Gravitacional', desc: 'Oponente próximo perde velocidade continuamente' });
  if (spin >= 27) breakpoints.push({ stat: 'SPIN', name: '⭐ Núcleo Perpétuo', desc: 'Uma vez/round: quando spin < 40%, decay reduzido à metade para sempre no round' });
  if (spin >= 50) breakpoints.push({ stat: 'SPIN', name: '✨ Celestial Rotation', desc: 'Ganha spin ao se mover' });
  
  const maxStatVal = Math.max(stats.atk, stats.def, stats.sta, stats.bal);
  let focus = 'Equilíbrio';
  if (maxStatVal === stats.atk) focus = 'Ataque';
  else if (maxStatVal === stats.def) focus = 'Defesa';
  else if (maxStatVal === stats.sta) focus = 'Estamina';
  
  const trait = TRAIT_OPTIONS[Math.floor(Math.random() * TRAIT_OPTIONS.length)];
  const layer = LAYERS[Math.floor(Math.random() * LAYERS.length)];
  const disc = DISCS[Math.floor(Math.random() * DISCS.length)];
  const driver = DRIVERS[Math.floor(Math.random() * DRIVERS.length)];
  const armor = ARMOR_PARTS[Math.floor(Math.random() * ARMOR_PARTS.length)];
  
  const baseBey = {
    id: `${team.name.replace(/\s+/g, '_')}_pos${position}`,
    name: team.name,
    team: team, // ⭐ ADICIONADO - Referência completa ao team para acessar iconUrl, fullBodyUrl, etc
    stats: { atk, def, sta, bal, weight, spin },
    effectiveStats,
    synergies,
    breakpoints,
    focus,
    color: team.colors?.[0] || '#3b82f6',
    colors: team.colors || ['#3b82f6', '#ffffff', '#cccccc'],
    trait: trait.name,
    traitDesc: trait.desc,
    traitEffect: trait.effect,
    layer,
    disc,
    driver,
    armor,
    type,
    rotation,
    height,
    deckPosition: position + 1
  };
  
  // Retorna bey RAW (sem atributos do player)
  // Pipeline completo: arena_pref (base) → forma → player attrs (aplicados em adaptDeckForArena)
  return baseBey;
}

const LAYERS = [
  { id: 'dragon_claw', name: '🐉 Dragon Claw', atk: 12, def: 3, desc: 'Aggressive contact points', visual: 'spiky' },
  { id: 'fortress_wall', name: '🏰 Fortress Wall', atk: 5, def: 10, desc: 'Thick defensive barrier', visual: 'round' },
  { id: 'viper_fang', name: '🐍 Viper Fang', atk: 8, def: 6, desc: 'Balanced striker', visual: 'curved' },
  { id: 'titan_blade', name: '⚔️ Titan Blade', atk: 15, def: 1, desc: 'Maximum offense, no defense', visual: 'blade' },
  { id: 'guardian_shield', name: '🛡️ Guardian Shield', atk: 3, def: 12, desc: 'Ultimate protection', visual: 'shield' },
  { id: 'chaos_wheel', name: '🌀 Chaos Wheel', atk: 7, def: 7, desc: 'Perfect symmetry', visual: 'circular' },
  { id: 'lightning_edge', name: '⚡ Lightning Edge', atk: 10, def: 4, desc: 'Sharp angular attacks', visual: 'angular' },
  { id: 'iron_hammer', name: '🔨 Iron Hammer', atk: 13, def: 2, desc: 'Heavy crushing blows', visual: 'heavy' },
  { id: 'shadow_wing', name: '🦇 Shadow Wing', atk: 9, def: 5, desc: 'Evasive strikes', visual: 'wing' },
  { id: 'crystal_crown', name: '👑 Crystal Crown', atk: 6, def: 8, desc: 'Regal defense', visual: 'crown' },

  // ========================================
  // 🆕 NOVOS LAYERS
  // ========================================
  {
    id: 'crescent_moon',
    name: '🌙 Crescent Moon',
    atk: 11,
    def: 8,
    desc: 'Curved blades capture and redirect',
    visual: 'curved_blades',
    special: 'spin_steal_boost',
    specialValue: 0.20
  },
  {
    id: 'eagle_talon',
    name: '🦅 Eagle Talon',
    atk: 14,
    def: 2,
    desc: 'Sharp talons with upper attack',
    visual: 'talons',
    special: 'upward_force',
    specialValue: 0.30
  },
  {
    id: 'turtle_shell',
    name: '🐢 Turtle Shell',
    atk: 2,
    def: 14,
    desc: 'Impenetrable carapace',
    visual: 'shell',
    special: 'hit_absorption',
    specialValue: 3
  },
  {
    id: 'atom_split',
    name: '⚛️ Atom Split',
    atk: 9,
    def: 9,
    desc: 'Unstable quantum geometry',
    visual: 'fractal',
    special: 'double_hit',
    specialValue: 0.10
  },
  {
    id: 'tidal_wave',
    name: '🌊 Tidal Wave',
    atk: 10,
    def: 7,
    desc: 'Escalating impact waves',
    visual: 'waves',
    special: 'scaling_damage',
    specialValue: 0.15
  }
];

const DISCS = [
  { id: 'heavy', name: '⚫ Heavy', weight: 12, bal: 4, desc: 'Maximum weight, low mobility' },
  { id: 'wide', name: '⭕ Wide', weight: 6, bal: 10, desc: 'Wide weight distribution' },
  { id: 'core', name: '🎯 Core', weight: 9, bal: 7, desc: 'Centered weight' },
  { id: 'seven', name: '7️⃣ Seven', weight: 8, bal: 8, desc: 'Balanced seven-blade' },
  { id: 'magnum', name: '💪 Magnum', weight: 11, bal: 5, desc: 'Heavy offense' },
  { id: 'spread', name: '📐 Spread', weight: 7, bal: 9, desc: 'Spread weight' },
  { id: 'gravity', name: '🌑 Gravity', weight: 10, bal: 6, desc: 'Dense core' },
  { id: 'infinity', name: '♾️ Infinity', weight: 8, bal: 9, desc: 'Endless stability' },
  { id: 'blitz', name: '⚡ Blitz', weight: 6, bal: 7, desc: 'Light and quick' },
  { id: 'forge', name: '🔥 Forge', weight: 11, bal: 4, desc: 'Forged steel' },

  // ========================================
  // 🆕 NOVOS DISCS
  // ========================================
  {
    id: 'precision',
    name: '🎯 Precision',
    weight: 8,
    bal: 10,
    desc: 'Perfectly distributed weight',
    special: 'critical_boost',
    specialValue: 0.15
  },
  {
    id: 'cyclone',
    name: '🌪️ Cyclone',
    weight: 7,
    bal: 6,
    desc: 'Generates micro-vortices',
    special: 'pull_effect',
    specialValue: 25
  },
  {
    id: 'voltage',
    name: '⚡ Voltage',
    weight: 6,
    bal: 8,
    desc: 'Accumulates electrical energy',
    special: 'reactive_speed',
    specialValue: 0.20
  },
  {
    id: 'monolith',
    name: '🗿 Monolith',
    weight: 13,
    bal: 3,
    desc: 'Absurd mass, hard to move',
    special: 'knockback_immunity',
    specialValue: 3
  },
  {
    id: 'mystic',
    name: '🔮 Mystic',
    weight: 9,
    bal: 8,
    desc: 'Variable mystical weight',
    special: 'weight_shift',
    specialValue: 3
  }
];

const DRIVERS = [
  { id: 'xtreme', name: '🔴 Xtreme', sta: 6, spin: 25, type: 'Attack', desc: 'Rubber flat tip - maximum speed', height: 60 },
  { id: 'bearing', name: '⚙️ Bearing', sta: 13, spin: 40, type: 'Stamina', desc: 'Free-spinning bearing - superior LAD', height: 70 },
  { id: 'defense', name: '🔵 Defense', sta: 10, spin: 30, type: 'Defense', desc: 'Sharp defense tip - high friction', height: 80 },
  { id: 'atomic', name: '⚛️ Atomic', sta: 11, spin: 35, type: 'Balance', desc: 'Free-spinning ball - versatile', height: 70 },
  { id: 'destroy', name: '💥 Destroy', sta: 7, spin: 28, type: 'Attack', desc: 'Attack with some LAD', height: 65 },
  { id: 'revolve', name: '🔄 Revolve', sta: 12, spin: 38, type: 'Stamina', desc: 'Wide revolving tip', height: 70 },
  { id: 'orbit', name: '🪐 Orbit', sta: 10, spin: 33, type: 'Defense', desc: 'Ball tip with ring', height: 75 },
  { id: 'accel', name: '🏃 Accel', sta: 8, spin: 27, type: 'Attack', desc: 'Flat tip with early aggression', height: 62 },
  { id: 'eternal', name: '♾️ Eternal', sta: 14, spin: 42, type: 'Stamina', desc: 'Best stamina driver', height: 70 },
  { id: 'unite', name: '🎯 Unite', sta: 9, spin: 31, type: 'Balance', desc: 'Sharp + flat hybrid', height: 68 },
  { id: 'friction', name: '🔥 Friction', sta: 5, spin: 22, type: 'Attack', desc: 'Ultra-aggressive rubber', height: 58 },
  { id: 'yielding', name: '💫 Yielding', sta: 11, spin: 36, type: 'Defense', desc: 'Soft rubber defense', height: 78 },

  // ========================================
  // 🆕 NOVOS DRIVERS
  // ========================================
  {
    id: 'spiral',
    name: '🌀 Spiral',
    sta: 11,
    spin: 37,
    type: 'Stamina',
    desc: 'Spiral tip maintains rotation',
    height: 72,
    special: 'regen_boost',
    specialValue: 0.5
  },
  {
    id: 'diamond',
    name: '💎 Diamond',
    sta: 9,
    spin: 32,
    type: 'Defense',
    desc: 'Ultra-hard crystal tip',
    height: 76,
    special: 'damage_reflect',
    specialValue: 0.15
  },
  {
    id: 'sprint',
    name: '🏃 Sprint',
    sta: 7,
    spin: 26,
    type: 'Attack',
    desc: 'Explosive acceleration',
    height: 58,
    special: 'burst_speed',
    specialValue: 0.50,
    specialDuration: 3
  },
  {
    id: 'equilibrium',
    name: '⚖️ Equilibrium',
    sta: 10,
    spin: 34,
    type: 'Balance',
    desc: 'Auto-stabilization',
    height: 70,
    special: 'wobble_immunity',
    specialValue: true
  },
  {
    id: 'nova',
    name: '🌟 Nova',
    sta: 8,
    spin: 29,
    type: 'Attack',
    desc: 'Energy burst at end',
    height: 64,
    special: 'last_stand',
    specialValue: 1.0,
    specialThreshold: 0.20
  }
];

const TRAIT_OPTIONS = [
  { name: 'sword', desc: 'Espada Expansiva', effect: 'Alcance +30%' },
  { name: 'shield', desc: 'Escudo Deflector', effect: 'Reduz dano em 40%' },
  { name: 'vampire', desc: 'Roubo de Spin', effect: 'Absorve 15% do spin' },
  { name: 'berserker', desc: 'Fúria Crescente', effect: '+20% ATK por hit' },
  { name: 'phantom', desc: 'Evasão Fantasma', effect: '25% chance de evadir' },
  { name: 'counter', desc: 'Contra-Ataque', effect: 'Reflete 50% do dano' },
  { name: 'unstoppable', desc: 'Momentum Infinito', effect: 'Mantém velocidade' },
  { name: 'critical', desc: 'Golpe Crítico', effect: '30% chance de dano x2' },
  { name: 'regenerator', desc: 'Regeneração', effect: '+0.3 stamina/s' },
  { name: 'tornado', desc: 'Vórtice Mortal', effect: 'Puxa inimigos' },
  { name: 'fortress', desc: 'Fortaleza', effect: 'Imune a knockback' },
  { name: 'assassin', desc: 'Lâmina Assassina', effect: 'Dano x2 pelas costas' },
  { name: 'bearing', desc: 'Bearing Drive', effect: 'LAD Superior +50%' },
  { name: 'drift', desc: 'Drift Motion', effect: 'Evasão circular' },
  { name: 'xtreme', desc: 'Xtreme Rush', effect: 'Velocidade máxima' },
  { name: 'zone', desc: 'Zone Defense', effect: 'Estabilidade central' }
];

const ARMOR_PARTS = [
  {
    id: 'chains',
    name: '⛓️ Heavy Chains',
    statMods: { atk: +3, def: +4, sta: -2, bal: -3, weight: +5, spin: -2 },
    effect: 'chain_drag',
    effectDesc: 'Arrasta oponente ao colidir (Pull Effect)',
    visual: 'chains',
    color: '#708090'
  },
  {
    id: 'spikes',
    name: '🔱 Razor Spikes',
    statMods: { atk: +6, def: -2, sta: -1, bal: -1, weight: +2, spin: 0 },
    effect: 'spike_damage',
    effectDesc: 'Dano de contato aumentado +35%',
    visual: 'spikes',
    color: '#ff4500'
  },
  {
    id: 'shield_ring',
    name: '🛡️ Guardian Ring',
    statMods: { atk: -3, def: +7, sta: +1, bal: +2, weight: +3, spin: -1 },
    effect: 'damage_reduction',
    effectDesc: 'Reduz dano recebido em 25%',
    visual: 'ring',
    color: '#4169e1'
  },
  {
    id: 'feather',
    name: '🪶 Feather Frame',
    statMods: { atk: 0, def: -2, sta: +4, bal: +3, weight: -4, spin: +5 },
    effect: 'air_glide',
    effectDesc: 'Desliza pela arena (menos fricção)',
    visual: 'feather',
    color: '#f0e68c'
  },
  {
    id: 'flame_core',
    name: '🔥 Flame Core',
    statMods: { atk: +5, def: 0, sta: -3, bal: 0, weight: +1, spin: +3 },
    effect: 'burn_damage',
    effectDesc: 'Hits causam burn DoT (2 dmg/s por 3s)',
    visual: 'flames',
    color: '#ff6347'
  },
  {
    id: 'ice_crystal',
    name: '❄️ Frost Crystal',
    statMods: { atk: +1, def: +2, sta: +2, bal: +1, weight: +1, spin: -1 },
    effect: 'freeze_slow',
    effectDesc: 'Hits reduzem velocidade inimiga em 15%',
    visual: 'ice',
    color: '#00ffff'
  },
  {
    id: 'thunder_coil',
    name: '⚡ Thunder Coil',
    statMods: { atk: +4, def: -1, sta: 0, bal: -2, weight: 0, spin: +4 },
    effect: 'chain_lightning',
    effectDesc: '20% chance de atordoar (stun 0.5s)',
    visual: 'lightning',
    color: '#ffd700'
  },
  {
    id: 'shadow_cloak',
    name: '🌑 Shadow Cloak',
    statMods: { atk: +2, def: +1, sta: +1, bal: +4, weight: -2, spin: +2 },
    effect: 'evasion',
    effectDesc: '15% chance de evadir hits',
    visual: 'shadow',
    color: '#4b0082'
  },
  {
    id: 'gravity_disk',
    name: '🌌 Gravity Disk',
    statMods: { atk: +1, def: +3, sta: +2, bal: +1, weight: +6, spin: -3 },
    effect: 'center_pull',
    effectDesc: 'Puxado constantemente ao centro',
    visual: 'gravity',
    color: '#9370db'
  },
  {
    id: 'wind_vortex',
    name: '🌪️ Wind Vortex',
    statMods: { atk: +2, def: -1, sta: +3, bal: +2, weight: -3, spin: +6 },
    effect: 'spin_steal',
    effectDesc: 'Rouba 5% de spin ao colidir',
    visual: 'vortex',
    color: '#87ceeb'
  },
  {
    id: 'magnet_ring',
    name: '🧲 Magnet Ring',
    statMods: { atk: +3, def: +2, sta: 0, bal: -1, weight: +3, spin: 0 },
    effect: 'attract_repel',
    effectDesc: 'Atrai/Repele based em spin direction',
    visual: 'magnet',
    color: '#dc143c'
  },
  {
    id: 'blade_edge',
    name: '⚔️ Blade Edge',
    statMods: { atk: +7, def: -3, sta: -2, bal: -2, weight: +1, spin: +1 },
    effect: 'critical_strike',
    effectDesc: '+25% Critical Hit chance',
    visual: 'blades',
    color: '#c0c0c0'
  },
  {
    id: 'rubber_coat',
    name: '🔴 Rubber Coating',
    statMods: { atk: +1, def: +1, sta: +5, bal: +3, weight: +1, spin: -2 },
    effect: 'stamina_absorb',
    effectDesc: 'Absorve 10% stamina ao colidir',
    visual: 'rubber',
    color: '#8b0000'
  },
  {
    id: 'crystal_armor',
    name: '💎 Crystal Armor',
    statMods: { atk: 0, def: +5, sta: +1, bal: +2, weight: +2, spin: +1 },
    effect: 'reflect_damage',
    effectDesc: 'Reflete 20% do dano recebido',
    visual: 'crystal',
    color: '#ff1493'
  },
  {
    id: 'void_shell',
    name: '🕳️ Void Shell',
    statMods: { atk: +2, def: +2, sta: +2, bal: +2, weight: +2, spin: +2 },
    effect: 'void_pulse',
    effectDesc: 'A cada 5s, emite pulse que remove buffs',
    visual: 'void',
    color: '#000000'
  },
  {
    id: 'solar_disc',
    name: '☀️ Solar Disc',
    statMods: { atk: +3, def: +1, sta: +4, bal: +1, weight: +1, spin: +3 },
    effect: 'regen_aura',
    effectDesc: 'Regenera 0.5 stamina/s',
    visual: 'solar',
    color: '#ffa500'
  },
  {
    id: 'orbital_ring',
    name: '🪐 Orbital Ring',
    statMods: { atk: +1, def: +1, sta: +1, bal: +5, weight: +1, spin: +4 },
    effect: 'orbital_deflect',
    effectDesc: 'Deflecte hits de ângulos ruins',
    visual: 'orbital',
    color: '#4682b4'
  },
  {
    id: 'beast_fang',
    name: '🦷 Beast Fang',
    statMods: { atk: +8, def: -4, sta: -1, bal: -1, weight: +2, spin: 0 },
    effect: 'life_steal',
    effectDesc: 'Recupera stamina = 30% do dano causado',
    visual: 'fangs',
    color: '#8b4513'
  },
  {
    id: 'quantum_frame',
    name: '⚛️ Quantum Frame',
    statMods: { atk: +2, def: +2, sta: +2, bal: +3, weight: 0, spin: +3 },
    effect: 'phase_shift',
    effectDesc: '10% chance de não receber hit (phasing)',
    visual: 'quantum',
    color: '#00ced1'
  },
  {
    id: 'dragon_scale',
    name: '🐉 Dragon Scale',
    statMods: { atk: +4, def: +4, sta: +1, bal: +1, weight: +3, spin: +1 },
    effect: 'adaptive_armor',
    effectDesc: 'Defesa aumenta +1 a cada hit recebido',
    visual: 'scales',
    color: '#228b22'
  },

  // ========================================
  // 🆕 NOVOS ARMOR PARTS
  // ========================================
  {
    id: 'scorpion_tail',
    name: '🦂 Scorpion Tail',
    statMods: { atk: +5, def: -1, sta: 0, bal: -1, weight: +2, spin: +1 },
    effect: 'poison_sting',
    effectDesc: 'Hits causam DoT que aumenta (1/2/3/4 dmg por stack)',
    visual: 'tail',
    color: '#dc2626',
    stackable: true,
    maxStacks: 4,
    tickRate: 1.0
  },
  {
    id: 'permafrost',
    name: '🧊 Permafrost',
    statMods: { atk: -1, def: +4, sta: +3, bal: +2, weight: +2, spin: -1 },
    effect: 'ice_wall',
    effectDesc: 'Cria barrier de gelo que absorve 1 hit a cada 8s',
    visual: 'ice_armor',
    color: '#3b82f6',
    cooldown: 8.0,
    hitBlock: 1
  },
  {
    id: 'trident_guard',
    name: '🔱 Trident Guard',
    statMods: { atk: +4, def: +3, sta: 0, bal: 0, weight: +3, spin: 0 },
    effect: 'triple_strike',
    effectDesc: '15% chance de atingir 3x no mesmo hit',
    visual: 'trident',
    color: '#0ea5e9',
    procChance: 0.15,
    extraHits: 2
  },
  {
    id: 'prism_shell',
    name: '🌈 Prism Shell',
    statMods: { atk: +1, def: +1, sta: +1, bal: +1, weight: +1, spin: +1 },
    effect: 'spectrum_shift',
    effectDesc: 'Muda elemento a cada 5s (fire/ice/lightning/wind)',
    visual: 'rainbow',
    color: '#a855f7',
    shiftInterval: 5.0,
    elements: ['fire', 'ice', 'lightning', 'wind']
  },
  {
    id: 'spider_web',
    name: '🕸️ Spider Web',
    statMods: { atk: -2, def: +3, sta: +4, bal: +1, weight: -1, spin: +2 },
    effect: 'web_trap',
    effectDesc: 'Hits reduzem speed adversário em 20% (stack até 60%)',
    visual: 'web',
    color: '#f5f5f5',
    slowPercent: 0.20,
    maxSlow: 0.60,
    stackDuration: 5.0
  },
  {
    id: 'skull_crusher',
    name: '💀 Skull Crusher',
    statMods: { atk: +9, def: -5, sta: -2, bal: -3, weight: +4, spin: -1 },
    effect: 'execute',
    effectDesc: 'Causa 3x damage quando adversário < 25% stamina',
    visual: 'skull',
    color: '#000000',
    executeThreshold: 0.25,
    executeMultiplier: 3.0
  },
  {
    id: 'luna_cycle',
    name: '🌙 Luna Cycle',
    statMods: { atk: +2, def: +2, sta: +2, bal: +2, weight: 0, spin: +4 },
    effect: 'moon_phases',
    effectDesc: 'Stats variam baseado em "moon phase" (ciclo de 20s)',
    visual: 'moon',
    color: '#e0e7ff',
    cycleDuration: 20.0,
    phases: [
      { name: 'New Moon', atkMod: 1.3, defMod: 0.7 },
      { name: 'Waxing', atkMod: 1.1, defMod: 0.9 },
      { name: 'Full Moon', atkMod: 0.7, defMod: 1.3 },
      { name: 'Waning', atkMod: 0.9, defMod: 1.1 }
    ]
  },
  {
    id: 'clockwork',
    name: '⚙️ Clockwork',
    statMods: { atk: +3, def: +3, sta: +1, bal: +4, weight: +2, spin: +2 },
    effect: 'precision_timing',
    effectDesc: 'A cada 10º hit, causa dano crítico automaticamente',
    visual: 'gears',
    color: '#b45309',
    hitCounter: 0,
    criticalEvery: 10
  }
];

const LAUNCH_TECHNIQUES = {
  // ===== BASIC LAUNCHES =====
  STANDARD: {
    name: 'Standard Launch',
    icon: '⚪',
    desc: 'Lançamento balanceado e neutro',
    speedMod: 1.0,
    spinMod: 1.0,
    burstRisk: 1.0,
    pattern: 'standard',
    color: '#94a3b8'
  },
  POWER: {
    name: 'Power Launch',
    icon: '🔥',
    desc: 'Força máxima - Alta velocidade e risco',
    speedMod: 1.4,
    spinMod: 1.2,
    burstRisk: 1.5,
    pattern: 'aggressive',
    color: '#ef4444',
    typePreference: ['Attack']
  },
  BANKING: {
    name: 'Banking Launch',
    icon: '🌸',
    desc: 'Flower Pattern - Movimento em flor',
    speedMod: 1.2,
    spinMod: 1.0,
    burstRisk: 1.1,
    pattern: 'flower',
    color: '#f59e0b',
    arenaPreference: ['BB10_COMPETITIVE'],
    typePreference: ['Attack']
  },
  WEAK: {
    name: 'Weak Launch',
    icon: '💫',
    desc: 'Estratégico - Baixa rotação proposital',
    speedMod: 0.5,
    spinMod: 0.6,
    burstRisk: 0.7,
    pattern: 'wobble',
    color: '#8b5cf6',
    typePreference: ['Stamina']
  },
  FLAT: {
    name: 'Flat Launch',
    icon: '🎯',
    desc: 'Centralizado - Direto ao centro',
    speedMod: 0.8,
    spinMod: 1.1,
    burstRisk: 0.8,
    pattern: 'center',
    color: '#06b6d4',
    typePreference: ['Stamina', 'Defense']
  },
  
  // ===== CLASSIC TECHNIQUES =====
  SLIDING: {
    name: 'Sliding Shoot',
    icon: '🏃',
    desc: 'Desliza pela borda em velocidade máxima',
    speedMod: 1.5,
    spinMod: 1.0,
    burstRisk: 1.3,
    pattern: 'sliding',
    color: '#22c55e',
    arenaPreference: ['BB10_COMPETITIVE'],
    typePreference: ['Attack']
  },
  GATTYAKI: {
    name: 'Gattyaki',
    icon: '⏱️',
    desc: 'Lançamento atrasado - Espera oponente gastar stamina',
    speedMod: 0.7,
    spinMod: 1.3,
    burstRisk: 0.6,
    pattern: 'gattyaki',
    color: '#a855f7',
    typePreference: ['Stamina', 'Defense']
  },
  TORNADO_STALL: {
    name: 'Tornado Stalling',
    icon: '🌀',
    desc: 'Fica na Tornado Ridge continuamente',
    speedMod: 1.1,
    spinMod: 1.0,
    burstRisk: 0.9,
    pattern: 'tornado_stall',
    color: '#14b8a6',
    arenaPreference: ['BB10_COMPETITIVE', 'BURST'],
    typePreference: ['Stamina', 'Balance']
  },
  RUSH: {
    name: 'Rush Launch',
    icon: '💨',
    desc: 'Explosão inicial mas queima rápido',
    speedMod: 1.6,
    spinMod: 0.8,
    burstRisk: 1.7,
    pattern: 'rush',
    color: '#f97316',
    typePreference: ['Attack']
  },
  CATAPULT: {
    name: 'Catapult Launch',
    icon: '🚀',
    desc: 'Lançamento com ângulo - Upper attack',
    speedMod: 1.3,
    spinMod: 1.1,
    burstRisk: 1.4,
    pattern: 'catapult',
    color: '#eab308',
    typePreference: ['Attack', 'Balance']
  },
  
  // ===== ADVANCED TECHNIQUES =====
  SNIPE: {
    name: 'Snipe Launch',
    icon: '🎯',
    desc: 'Mira direto no oponente',
    speedMod: 1.2,
    spinMod: 0.9,
    burstRisk: 1.2,
    pattern: 'snipe',
    color: '#dc2626',
    typePreference: ['Attack']
  },
  DRIFT: {
    name: 'Drift Launch',
    icon: '🌊',
    desc: 'Movimento imprevisível e errático',
    speedMod: 1.1,
    spinMod: 1.0,
    burstRisk: 1.0,
    pattern: 'drift',
    color: '#3b82f6',
    typePreference: ['Balance']
  },
  BARRAGE: {
    name: 'Barrage Launch',
    icon: '⚡',
    desc: 'Mini-hits rápidos e consecutivos',
    speedMod: 1.3,
    spinMod: 0.9,
    burstRisk: 1.1,
    pattern: 'barrage',
    color: '#a3e635',
    typePreference: ['Attack']
  },
  DEFENSIVE: {
    name: 'Defensive Launch',
    icon: '🛡️',
    desc: 'Preserva stamina ao máximo',
    speedMod: 0.6,
    spinMod: 1.4,
    burstRisk: 0.5,
    pattern: 'defensive',
    color: '#60a5fa',
    typePreference: ['Defense', 'Stamina']
  },
  CHAOS: {
    name: 'Chaos Launch',
    icon: '🎲',
    desc: 'Movimento caótico dificulta acertos',
    speedMod: 1.0,
    spinMod: 1.0,
    burstRisk: 0.9,
    pattern: 'chaos',
    color: '#c026d3',
    typePreference: ['Balance']
  },
  
  // ===== ARENA-SPECIFIC TECHNIQUES =====
  POCKET_AVOID: {
    name: 'Pocket Avoidance',
    icon: '🔵',
    desc: 'Evita pockets - Específico para Burst Stadium',
    speedMod: 0.9,
    spinMod: 1.2,
    burstRisk: 0.7,
    pattern: 'pocket_avoid',
    color: '#0ea5e9',
    arenaPreference: ['BURST'],
    typePreference: ['Defense', 'Stamina']
  },
  EXIT_RUSH: {
    name: 'Exit Rush',
    icon: '🏁',
    desc: 'Força ring-outs - Específico para BB-10',
    speedMod: 1.4,
    spinMod: 0.9,
    burstRisk: 1.2,
    pattern: 'exit_rush',
    color: '#fb923c',
    arenaPreference: ['BB10_COMPETITIVE'],
    typePreference: ['Attack']
  },
  PORTAL_JUMP: {
    name: 'Portal Jump',
    icon: '🌌',
    desc: 'Mira nos portais - Específico para Nexus',
    speedMod: 1.1,
    spinMod: 1.1,
    burstRisk: 1.0,
    pattern: 'portal_jump',
    color: '#8b5cf6',
    arenaPreference: ['NEXUS'],
    typePreference: ['Attack', 'Balance']
  },
  
  // ========================================
  // 🆕 NOVOS LAUNCH TECHNIQUES
  // ========================================
  
  PHANTOM_LAUNCH: {
    name: 'Phantom Launch',
    icon: '👻',
    desc: 'Lançamento ultra-baixo que "desaparece" por 2 segundos',
    speedMod: 0.4,
    spinMod: 0.8,
    burstRisk: 0.9,
    pattern: 'phantom',
    color: '#a78bfa',
    typePreference: ['Defense', 'Stamina'],
    special: {
      invisibleDuration: 2.0,      // Invisível por 2s
      emergeBurst: 1.4,             // +40% speed ao emergir
      invulnerable: true            // Não pode ser atingido durante invisibilidade
    }
  },
  
  MIRROR_LAUNCH: {
    name: 'Mirror Launch',
    icon: '🪞',
    desc: 'Copia o launch do adversário com pequeno delay',
    speedMod: 1.0,  // Base, será modificado para copiar adversário
    spinMod: 1.0,   // Base, será modificado para copiar adversário
    burstRisk: 1.0,
    pattern: 'mirror',
    color: '#e0e7ff',
    typePreference: ['Balance'],
    special: {
      copyOpponent: true,           // Copia launch do adversário
      delay: 0.3,                   // 0.3s delay
      bonusMultiplier: 1.10         // +10% nos mods copiados
    },
    requiresHighIntelligence: true  // Melhor com INT alta
  },
  
  SATELLITE_LAUNCH: {
    name: 'Satellite Launch',
    icon: '🛰️',
    desc: 'Orbita a parede em alta velocidade antes de atacar',
    speedMod: 1.3,
    spinMod: 1.1,
    burstRisk: 1.2,
    pattern: 'satellite',
    color: '#06b6d4',
    typePreference: ['Attack', 'Balance'],
    arenaPreference: ['VORTEX_MAELSTROM', 'DOMINATION_ZONES'],
    special: {
      orbitDuration: 3.0,           // Orbita por 3s
      orbitRadius: 200,             // Raio da órbita (próximo à parede)
      diveBurst: 1.5                // +50% speed ao mergulhar
    }
  },
  
  PENDULUM_LAUNCH: {
    name: 'Pendulum Launch',
    icon: '⏰',
    desc: 'Movimento pendular entre centro e borda',
    speedMod: 0.9,
    spinMod: 1.2,
    burstRisk: 0.7,
    pattern: 'pendulum',
    color: '#fbbf24',
    typePreference: ['Stamina', 'Defense'],
    special: {
      oscillationSpeed: 2.5,        // Velocidade da oscilação
      centerRadius: 40,             // Raio mínimo (centro)
      outerRadius: 180,             // Raio máximo (borda)
      evasionBonus: 0.15,           // +15% evasão de hits
      energyConservation: 0.90      // 90% eficiência energética (menos perda)
    }
  },
  
  VORTEX_LAUNCH: {
    name: 'Vortex Launch',
    icon: '🌀',
    desc: 'Cria mini-vórtice que puxa o adversário',
    speedMod: 1.1,
    spinMod: 1.3,
    burstRisk: 1.0,
    pattern: 'vortex',
    color: '#8b5cf6',
    typePreference: ['Balance', 'Stamina'],
    special: {
      vortexRadius: 40,             // Raio do efeito de pull
      pullStrength: 2.0,            // Força do pull
      vortexDuration: 8.0,          // Duração do vórtice
      collisionBoost: 1.20          // +20% chance de colisão
    }
  },
  
  HAMMER_DROP: {
    name: 'Hammer Drop',
    icon: '🔨',
    desc: 'Launch de cima para baixo com impacto massivo',
    speedMod: 1.0,
    spinMod: 0.9,
    burstRisk: 1.6,
    pattern: 'hammer',
    color: '#f59e0b',
    typePreference: ['Attack'],
    special: {
      firstHitMultiplier: 2.0,      // Primeiro hit causa 2x damage
      impactRadius: 35,             // Raio do impacto
      slowdownAfter: 0.70,          // Perde 30% velocidade após hit
      shockwave: true               // Cria shockwave ao impactar
    }
  }
};

const LAUNCH_QUALITY = {
  CRITICAL_FAIL: {
    name: 'Lançamento Falhado',
    icon: '💀',
    chance: 0.05, // 5%
    speedMod: 0.3,
    spinMod: 0.4,
    burstRisk: 0.5,
    color: '#991b1b',
    desc: 'A corda prendeu! Lançamento muito fraco'
  },
  WEAK: {
    name: 'Lançamento Fraco',
    icon: '😰',
    chance: 0.15, // 15%
    speedMod: 0.7,
    spinMod: 0.75,
    burstRisk: 0.8,
    color: '#ea580c',
    desc: 'Abaixo do esperado'
  },
  STANDARD: {
    name: 'Lançamento Normal',
    icon: '✓',
    chance: 0.50, // 50%
    speedMod: 1.0,
    spinMod: 1.0,
    burstRisk: 1.0,
    color: '#64748b',
    desc: 'Lançamento padrão'
  },
  STRONG: {
    name: 'Lançamento Forte',
    icon: '💪',
    chance: 0.20, // 20%
    speedMod: 1.2,
    spinMod: 1.15,
    burstRisk: 1.1,
    color: '#2563eb',
    desc: 'Acima do esperado!'
  },
  PERFECT: {
    name: 'Lançamento Perfeito',
    icon: '⭐',
    chance: 0.10, // 10%
    speedMod: 1.4,
    spinMod: 1.3,
    burstRisk: 1.2,
    color: '#facc15',
    desc: 'MÁXIMO POTENCIAL!'
  }
};

function determineLaunchQuality(launchPower = 7, playerName = null, tournamentStage = 'R64', playerMentality = null) {
  // Escala 0-20, neutro=7 → desvio de -7 a +13
  // Denominadores recalibrados para que launchPower=20 atinja os mesmos máximos de antes
  const deviation = launchPower - 7;

  const adjustedChances = {
    CRITICAL_FAIL: Math.max(0, 0.05 - (deviation * 0.003846)),  // 0.05/13 ≈ 0.003846
    WEAK:          Math.max(0, 0.15 - (deviation * 0.011538)),  // 0.15/13 ≈ 0.011538
    STANDARD:      0.50,
    STRONG:        Math.min(0.50, 0.20 + (deviation * 0.023077)),  // 0.30/13 ≈ 0.023077
    PERFECT:       Math.min(0.50, 0.10 + (deviation * 0.030769)),  // 0.40/13 ≈ 0.030769
  };

  // 🆕 PERFECTIONIST mentality - dobra chance de PERFECT, mas penaliza CRITICAL_FAIL ainda mais
  if (playerMentality === 'PERFECTIONIST') {
    adjustedChances.PERFECT = Math.min(0.50, adjustedChances.PERFECT * 2);
    adjustedChances.CRITICAL_FAIL = Math.min(0.20, adjustedChances.CRITICAL_FAIL * 1.5); // ansiedade
  }

  // ── Aplicar traits de lançamento v2.0 ──
  if (playerName) {
    try {
      const traitData = getPlayerTraitData(playerName);
      const playerTraits = traitData?.traits || [];

      const getTier = (id) => {
        const t = playerTraits.find(t => t && t.id === id);
        return t ? t.tier : null;
      };
      const isQFPlus = ['QF','SF','F'].includes(tournamentStage);
      const isSFPlus = ['SF','F'].includes(tournamentStage);

      // ── MAO_FIRME ──
      const maoFirmeTier = getTier('MAO_FIRME');
      if (maoFirmeTier === 'NEG') { adjustedChances.PERFECT = 0; }
      else if (maoFirmeTier === 'COM') { adjustedChances.CRITICAL_FAIL = 0; adjustedChances.WEAK = Math.min(adjustedChances.WEAK, 0.05); }
      else if (maoFirmeTier === 'RAR') { adjustedChances.CRITICAL_FAIL = 0; adjustedChances.WEAK = 0; }
      else if (maoFirmeTier === 'LEN') { adjustedChances.CRITICAL_FAIL = 0; adjustedChances.WEAK = 0; adjustedChances.STANDARD = Math.min(adjustedChances.STANDARD, 0.10); adjustedChances.PERFECT = Math.min(0.50, adjustedChances.PERFECT * 2); }

      // ── PERFECCIONISTA ──
      const perfTier = getTier('PERFECCIONISTA');
      if (perfTier === 'NEG' && isSFPlus) {
        adjustedChances.CRITICAL_FAIL = Math.min(0.30, adjustedChances.CRITICAL_FAIL * 2);
        adjustedChances.PERFECT = Math.max(0, adjustedChances.PERFECT * 0.5);
      } else if (perfTier === 'COM') { adjustedChances.PERFECT = Math.min(0.50, adjustedChances.PERFECT * 2); }
      else if (perfTier === 'RAR') { adjustedChances.PERFECT = Math.min(0.50, adjustedChances.PERFECT * 3); }
      else if (perfTier === 'LEN') { adjustedChances.PERFECT = Math.min(0.50, adjustedChances.PERFECT * 3.5); }

      // ── CRONOMETRO ──
      const cronTier = getTier('CRONOMETRO');
      if (cronTier === 'NEG' && isSFPlus) {
        adjustedChances.CRITICAL_FAIL = Math.min(0.40, adjustedChances.CRITICAL_FAIL * 2);
        adjustedChances.WEAK = Math.min(0.40, adjustedChances.WEAK * 2);
      } else if (cronTier === 'RAR' && isQFPlus) {
        // Sobe 1 nível: redistribui para cima
        adjustedChances.PERFECT = Math.min(0.50, adjustedChances.PERFECT + 0.10);
        adjustedChances.STRONG  = Math.min(0.50, adjustedChances.STRONG  + 0.05);
      } else if (cronTier === 'LEN') {
        adjustedChances.CRITICAL_FAIL = 0;
        adjustedChances.WEAK = 0;
        adjustedChances.STANDARD = Math.min(adjustedChances.STANDARD, 0.15);
        adjustedChances.PERFECT = Math.min(0.50, adjustedChances.PERFECT * 2);
      }

      // ── MAQUINA (CRITICAL_FAIL impossível em RAR/LEN) ──
      const maqTier = getTier('MAQUINA');
      if (maqTier === 'RAR' || maqTier === 'LEN') { adjustedChances.CRITICAL_FAIL = 0; }

    } catch(e) {}
  }

  // Normalizar
  const total = Object.values(adjustedChances).reduce((a, b) => a + b, 0);
  if (total > 0) Object.keys(adjustedChances).forEach(k => { adjustedChances[k] /= total; });

  const roll = Math.random();
  let cumulative = 0;
  for (const key of Object.keys(LAUNCH_QUALITY)) {
    cumulative += adjustedChances[key];
    if (roll < cumulative) return { key, ...LAUNCH_QUALITY[key] };
  }
  return { key: 'STANDARD', ...LAUNCH_QUALITY.STANDARD };
}

function selectLaunchTechnique(beyType, opponentType, opponentRotation, myRotation, arena) {
  // AI chooses launch based on type, matchup, and arena
  const isOppositeSpin = myRotation !== opponentRotation;
  
  const weights = {};
  
  // Initialize all techniques with base weight
  Object.keys(LAUNCH_TECHNIQUES).forEach(key => {
    weights[key] = 1.0;
  });
  
  // Type preferences
  Object.keys(LAUNCH_TECHNIQUES).forEach(key => {
    const tech = LAUNCH_TECHNIQUES[key];
    if (tech.typePreference && tech.typePreference.includes(beyType)) {
      weights[key] += 2.5;
    }
  });
  
  // Arena preferences
  if (arena) {
    Object.keys(LAUNCH_TECHNIQUES).forEach(key => {
      const tech = LAUNCH_TECHNIQUES[key];
      if (tech.arenaPreference && tech.arenaPreference.includes(arena)) {
        weights[key] += 3.0;
      }
    });
  }
  
  // Matchup adjustments
  if (opponentType === 'Attack' && isOppositeSpin) {
    weights.WEAK += 3.0;
    weights.DEFENSIVE += 2.5;
    weights.GATTYAKI += 2.0;
  }
  
  if (opponentType === 'Stamina') {
    weights.POWER += 2.0;
    weights.RUSH += 2.5;
    weights.SNIPE += 2.0;
    weights.EXIT_RUSH += 1.5;
  }
  
  if (opponentType === 'Defense') {
    weights.BARRAGE += 2.0;
    weights.CATAPULT += 1.5;
    weights.CHAOS += 1.5;
  }
  
  // Strategic adjustments
  if (beyType === 'Attack') {
    weights.SLIDING += 1.5;
    weights.RUSH += 1.0;
    weights.CATAPULT += 1.5;
  } else if (beyType === 'Defense') {
    weights.FLAT += 2.0;
    weights.DEFENSIVE += 2.5;
    weights.POCKET_AVOID += 1.5;
  } else if (beyType === 'Stamina') {
    weights.GATTYAKI += 2.0;
    weights.TORNADO_STALL += 2.0;
    weights.DEFENSIVE += 1.5;
  } else if (beyType === 'Balance') {
    weights.DRIFT += 2.0;
    weights.CHAOS += 1.5;
    weights.PORTAL_JUMP += 1.5;
  }
  
  // Random selection based on weights
  const total = Object.values(weights).reduce((a, b) => a + b, 0);
  let random = Math.random() * total;
  
  for (const [key, weight] of Object.entries(weights)) {
    random -= weight;
    if (random <= 0) {
      return key;
    }
  }
  
  return 'STANDARD';
}

function generateBeyblade(team) {
  const totalPoints = 100;
  const maxPerStat = 30;
  const maxSpin = 60;
  
  let atk = 1, def = 1, sta = 1, bal = 1, weight = 1, spin = 1;
  let remaining = totalPoints - 6;
  
  while (remaining > 0) {
    const statIndex = Math.floor(Math.random() * 6);
    if (statIndex === 0 && atk < maxPerStat) { atk++; remaining--; }
    else if (statIndex === 1 && def < maxPerStat) { def++; remaining--; }
    else if (statIndex === 2 && sta < maxPerStat) { sta++; remaining--; }
    else if (statIndex === 3 && bal < maxPerStat) { bal++; remaining--; }
    else if (statIndex === 4 && weight < maxPerStat) { weight++; remaining--; }
    else if (statIndex === 5 && spin < maxSpin) { spin++; remaining--; }
  }
  
  const stats = { atk, def, sta, bal, weight, spin };
  
  function applyDiminishingReturns(value) {
    // ⚔️ DIMINISHING RETURNS REMOVIDO - Poder total para narrativas épicas
    return value;
  }
  
  const effectiveStats = {
    atk: applyDiminishingReturns(atk),
    def: applyDiminishingReturns(def),
    sta: applyDiminishingReturns(sta),
    bal: applyDiminishingReturns(bal),
    weight: applyDiminishingReturns(weight),
    spin: spin  // ⚔️ Spin também sem diminishing returns
  };
  
  const maxStat = Math.max(stats.atk, stats.def, stats.sta, stats.bal);
  let beyType = 'Balance';
  if (maxStat === stats.atk && atk >= 12) beyType = 'Attack';
  else if (maxStat === stats.def && def >= 12) beyType = 'Defense';
  else if (maxStat === stats.sta && sta >= 12) beyType = 'Stamina';
  
  const rotation = beyType === 'Stamina' ? (Math.random() > 0.5 ? 'Right' : 'Left') : 
                   beyType === 'Attack' ? 'Right' : 
                   (Math.random() > 0.3 ? 'Right' : 'Left');
  
  let height = 70;
  if (beyType === 'Attack') height = 60;
  else if (beyType === 'Defense') height = 80;
  else if (beyType === 'Stamina') height = 70;
  
  const synergies = [];
  
  if (atk >= 15 && weight >= 15) {
    synergies.push({ name: '💪 Heavy Hitter', bonus: 'Knockback +25%' });
  }
  
  if (def >= 15 && bal >= 15) {
    synergies.push({ name: '🏰 Fortress', bonus: 'Redução de dano +20%' });
  }
  
  if (sta >= 15 && spin >= 40) {
    synergies.push({ name: '♻️ Perpetual', bonus: 'Regen +0.3/s' });
  }
  
  if (weight >= 12 && spin >= 35) {
    synergies.push({ name: '⚡ Momentum', bonus: 'Dano escala com velocidade' });
  }
  
  if (atk >= 12 && bal >= 12) {
    synergies.push({ name: '🎯 Precision', bonus: 'Critical +15%' });
  }
  
  if (beyType === 'Stamina' && rotation === 'Left' && sta >= 12) {
    synergies.push({ name: '🔄 Spin Stealer', bonus: 'Equalização +30%' });
  }
  
  const breakpoints = [];
  
  if (atk >= 17) breakpoints.push({ stat: 'ATK', name: '🔪 Corte Preciso', desc: 'Hits em alta vel aplicam Corte: -2 estabilidade/s no oponente (máx 2 stacks)' });
  if (def >= 17) breakpoints.push({ stat: 'DEF', name: '🛡️ Iron Wall', desc: 'Bloqueia primeiro hit' });
  if (bal >= 17) breakpoints.push({ stat: 'BAL', name: '⚖️ Perfect Balance', desc: 'Reduz perda de estabilidade em colisões' });
  if (weight >= 17) breakpoints.push({ stat: 'WEIGHT', name: '⚓ Ancoragem', desc: 'Threshold de ring-out +30%' });
  if (spin >= 17) breakpoints.push({ stat: 'SPIN', name: '🌊 Turbilhão', desc: 'Recupera 15% do spin perdido em cada colisão' });
  if (sta >= 17) breakpoints.push({ stat: 'STA', name: '🌀 Inércia', desc: 'Spin decay reduzido em 35%' });
  if (bal >= 17) breakpoints.push({ stat: 'BAL', name: '🎯 Centro de Gravidade', desc: '-20% burst recebido enquanto spin > 50%' });
  
  // ULTIMATE BREAKPOINTS (27+)
  if (atk >= 27) breakpoints.push({ stat: 'ATK', name: '⚔️ Rajada de Aço', desc: 'A cada 3 hits consecutivos, o próximo é crit garantido' });
  if (def >= 27) breakpoints.push({ stat: 'DEF', name: '🛡️ Absolute Barrier', desc: 'Reduz TODO dano em 60%' });
  if (def >= 27) breakpoints.push({ stat: 'DEF', name: '🧱 Muro Vivo', desc: 'Uma vez/round: burst > 60 reseta para 30 + 8s escudo -50% burst' });
  if (sta >= 27) breakpoints.push({ stat: 'STA', name: '♾️ Espiral Eterna', desc: 'Quando spin < 35%: decay para por 8s (colisões custam +12 stamina)' });
  if (bal >= 27) breakpoints.push({ stat: 'BAL', name: '🎯 Gyro Lock', desc: 'Knockback recebido 40% + 60% convertido em spin' });
  if (weight >= 27) breakpoints.push({ stat: 'WEIGHT', name: '🌑 Campo Gravitacional', desc: 'Oponente próximo perde velocidade continuamente' });
  if (spin >= 27) breakpoints.push({ stat: 'SPIN', name: '⭐ Núcleo Perpétuo', desc: 'Uma vez/round: quando spin < 40%, decay reduzido à metade para sempre no round' });
  if (spin >= 50) breakpoints.push({ stat: 'SPIN', name: '✨ Celestial Rotation', desc: 'Ganha spin ao se mover' });
  
  const maxStatVal = Math.max(stats.atk, stats.def, stats.sta, stats.bal);
  let focus = 'Equilíbrio';
  if (maxStatVal === stats.atk) focus = 'Ataque';
  else if (maxStatVal === stats.def) focus = 'Defesa';
  else if (maxStatVal === stats.sta) focus = 'Estamina';
  
  const trait = TRAIT_OPTIONS[Math.floor(Math.random() * TRAIT_OPTIONS.length)];
  
  // Select random components
  const layer = LAYERS[Math.floor(Math.random() * LAYERS.length)];
  const disc = DISCS[Math.floor(Math.random() * DISCS.length)];
  const driver = DRIVERS[Math.floor(Math.random() * DRIVERS.length)];

  // Select random ARMOR PART
  const armor = ARMOR_PARTS[Math.floor(Math.random() * ARMOR_PARTS.length)];
  
  // Apply armor stat modifiers
  atk = Math.max(1, Math.min(30, atk + armor.statMods.atk));
  def = Math.max(1, Math.min(30, def + armor.statMods.def));
  sta = Math.max(1, Math.min(30, sta + armor.statMods.sta));
  bal = Math.max(1, Math.min(30, bal + armor.statMods.bal));
  weight = Math.max(1, Math.min(30, weight + armor.statMods.weight));
  spin = Math.max(1, Math.min(60, spin + armor.statMods.spin));
  
  return {
    id: Math.random().toString(36).substr(2, 9),
    name: team.name,
    stats,
    effectiveStats,
    synergies,
    breakpoints,
    focus,
    color: team.colors?.[0] || '#3b82f6',
    colors: team.colors || ['#3b82f6', '#ffffff', '#cccccc'],
    trait: trait.name,
    traitDesc: trait.desc,
    traitEffect: trait.effect,
    layer: layer,
    disc: disc,
    driver: driver,
    armor: armor,
    type: beyType,
    rotation: rotation,
    height: height
  };
}

const BeybladeLaboratory = ({ onBack, onSave, existingBeyblades = [] }) => {
  const [selectedLayer, setSelectedLayer] = useState(LAYERS[0]);
  const [selectedDisc, setSelectedDisc] = useState(DISCS[0]);
  const [selectedDriver, setSelectedDriver] = useState(DRIVERS[0]);
  const [selectedArmor, setSelectedArmor] = useState(ARMOR_PARTS[0]);
  const [customColors, setCustomColors] = useState(['#ef4444', '#000000', '#fbbf24']);
  const [customName, setCustomName] = useState('');
  const [rotation, setRotation] = useState('Right');
  const [activeSection, setActiveSection] = useState('layer'); // layer, disc, driver, armor, colors
  
  // Calculate final stats
  const calculateStats = () => {
    let atk = selectedLayer.atk;
    let def = selectedLayer.def;
    let sta = selectedDriver.sta;
    let bal = selectedDisc.bal;
    let weight = selectedDisc.weight;
    let spin = selectedDriver.spin;
    
    // Apply armor modifiers
    atk += selectedArmor.statMods.atk;
    def += selectedArmor.statMods.def;
    sta += selectedArmor.statMods.sta;
    bal += selectedArmor.statMods.bal;
    weight += selectedArmor.statMods.weight;
    spin += selectedArmor.statMods.spin;
    
    // Clamp values
    atk = Math.max(1, Math.min(30, atk));
    def = Math.max(1, Math.min(30, def));
    sta = Math.max(1, Math.min(30, sta));
    bal = Math.max(1, Math.min(30, bal));
    weight = Math.max(1, Math.min(30, weight));
    spin = Math.max(1, Math.min(60, spin));
    
    return { atk, def, sta, bal, weight, spin };
  };
  
  const finalStats = calculateStats();
  const beyType = selectedDriver.type;
  const beyHeight = selectedDriver.height;
  
  const handleSave = () => {
    if (!customName.trim()) {
      alert('Please enter a name for your Beyblade!');
      return;
    }
    
    const customBey = {
      id: Math.random().toString(36).substr(2, 9),
      name: customName,
      stats: finalStats,
      effectiveStats: finalStats,
      type: beyType,
      rotation: rotation,
      height: beyHeight,
      color: customColors[0],
      colors: customColors,
      layer: selectedLayer,
      disc: selectedDisc,
      driver: selectedDriver,
      armor: selectedArmor,
      isCustom: true,
      synergies: [],
      breakpoints: []
    };
    
    onSave(customBey);
  };
  
  return (
    <div className="min-h-screen bg-black p-6 overflow-y-auto">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6 border-b-4 border-purple-500 pb-4">
          <div>
            <h1 className="text-6xl font-black text-purple-500 mb-2">🔬 BEYBLADE LABORATORY</h1>
            <p className="text-gray-600 font-mono">Custom Build System v2.0</p>
          </div>
          <button 
            onClick={onBack}
            className="bg-gray-800 hover:bg-gray-700 text-white px-6 py-3 font-black border-2 border-gray-700"
          >
            ← BACK TO MENU
          </button>
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* LEFT - Component Selection */}
          <div className="col-span-2 space-y-4">
            {/* Tab Navigation */}
            <div className="flex gap-2 bg-gray-900 p-2 border-2 border-gray-800">
              <button 
                onClick={() => setActiveSection('layer')}
                className={`flex-1 px-4 py-2 font-black transition ${activeSection === 'layer' ? 'bg-purple-600 text-white' : 'bg-black text-gray-600'}`}
              >
                ⚔️ LAYER
              </button>
              <button 
                onClick={() => setActiveSection('disc')}
                className={`flex-1 px-4 py-2 font-black transition ${activeSection === 'disc' ? 'bg-purple-600 text-white' : 'bg-black text-gray-600'}`}
              >
                💿 DISC
              </button>
              <button 
                onClick={() => setActiveSection('driver')}
                className={`flex-1 px-4 py-2 font-black transition ${activeSection === 'driver' ? 'bg-purple-600 text-white' : 'bg-black text-gray-600'}`}
              >
                🎯 DRIVER
              </button>
              <button 
                onClick={() => setActiveSection('armor')}
                className={`flex-1 px-4 py-2 font-black transition ${activeSection === 'armor' ? 'bg-purple-600 text-white' : 'bg-black text-gray-600'}`}
              >
                🛡️ ARMOR
              </button>
              <button 
                onClick={() => setActiveSection('colors')}
                className={`flex-1 px-4 py-2 font-black transition ${activeSection === 'colors' ? 'bg-purple-600 text-white' : 'bg-black text-gray-600'}`}
              >
                🎨 COLORS
              </button>
            </div>

            {/* LAYER Selection */}
            {activeSection === 'layer' && (
              <div className="bg-gray-900 border-2 border-gray-800 p-6">
                <h2 className="text-2xl font-black text-purple-500 mb-4">SELECT LAYER (Attack Ring)</h2>
                <div className="grid grid-cols-2 gap-3 max-h-96 overflow-y-auto">
                  {LAYERS.map(layer => (
                    <div 
                      key={layer.id}
                      onClick={() => setSelectedLayer(layer)}
                      className={`p-4 cursor-pointer border-2 transition ${selectedLayer.id === layer.id ? 'bg-purple-900/50 border-purple-500' : 'bg-black border-gray-800 hover:border-gray-600'}`}
                    >
                      <div className="text-2xl mb-2">{layer.name}</div>
                      <div className="text-xs text-gray-600 mb-2">{layer.desc}</div>
                      <div className="flex gap-2 text-xs">
                        <span className="bg-red-900/50 px-2 py-1 border border-red-700">ATK +{layer.atk}</span>
                        <span className="bg-blue-900/50 px-2 py-1 border border-blue-700">DEF +{layer.def}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* DISC Selection */}
            {activeSection === 'disc' && (
              <div className="bg-gray-900 border-2 border-gray-800 p-6">
                <h2 className="text-2xl font-black text-purple-500 mb-4">SELECT DISC (Weight Disc)</h2>
                <div className="grid grid-cols-2 gap-3 max-h-96 overflow-y-auto">
                  {DISCS.map(disc => (
                    <div 
                      key={disc.id}
                      onClick={() => setSelectedDisc(disc)}
                      className={`p-4 cursor-pointer border-2 transition ${selectedDisc.id === disc.id ? 'bg-purple-900/50 border-purple-500' : 'bg-black border-gray-800 hover:border-gray-600'}`}
                    >
                      <div className="text-2xl mb-2">{disc.name}</div>
                      <div className="text-xs text-gray-600 mb-2">{disc.desc}</div>
                      <div className="flex gap-2 text-xs">
                        <span className="bg-gray-700/50 px-2 py-1 border border-gray-600">WEIGHT +{disc.weight}</span>
                        <span className="bg-purple-900/50 px-2 py-1 border border-purple-700">BAL +{disc.bal}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* DRIVER Selection */}
            {activeSection === 'driver' && (
              <div className="bg-gray-900 border-2 border-gray-800 p-6">
                <h2 className="text-2xl font-black text-purple-500 mb-4">SELECT DRIVER (Performance Tip)</h2>
                <div className="grid grid-cols-2 gap-3 max-h-96 overflow-y-auto">
                  {DRIVERS.map(driver => (
                    <div 
                      key={driver.id}
                      onClick={() => setSelectedDriver(driver)}
                      className={`p-4 cursor-pointer border-2 transition ${selectedDriver.id === driver.id ? 'bg-purple-900/50 border-purple-500' : 'bg-black border-gray-800 hover:border-gray-600'}`}
                    >
                      <div className="text-2xl mb-2">{driver.name}</div>
                      <div className="text-xs text-gray-600 mb-2">{driver.desc}</div>
                      <div className="flex gap-2 text-xs mb-2">
                        <span className="bg-green-900/50 px-2 py-1 border border-green-700">STA +{driver.sta}</span>
                        <span className="bg-cyan-900/50 px-2 py-1 border border-cyan-700">SPIN +{driver.spin}</span>
                      </div>
                      <div className="text-xs font-black text-orange-500">TYPE: {driver.type}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ARMOR Selection */}
            {activeSection === 'armor' && (
              <div className="bg-gray-900 border-2 border-gray-800 p-6">
                <h2 className="text-2xl font-black text-purple-500 mb-4">SELECT ARMOR PART</h2>
                <div className="grid grid-cols-2 gap-3 max-h-96 overflow-y-auto">
                  {ARMOR_PARTS.map(armor => (
                    <div 
                      key={armor.id}
                      onClick={() => setSelectedArmor(armor)}
                      className={`p-4 cursor-pointer border-2 transition ${selectedArmor.id === armor.id ? 'bg-purple-900/50 border-purple-500' : 'bg-black border-gray-800 hover:border-gray-600'}`}
                    >
                      <div className="text-xl mb-2">{armor.name}</div>
                      <div className="text-xs text-gray-600 mb-2">{armor.effectDesc}</div>
                      <div className="flex flex-wrap gap-1 text-xs">
                        {Object.entries(armor.statMods).map(([stat, mod]) => (
                          mod !== 0 && (
                            <span 
                              key={stat}
                              className={`px-2 py-1 border ${mod > 0 ? 'bg-green-900/50 border-green-700 text-green-400' : 'bg-red-900/50 border-red-700 text-red-400'}`}
                            >
                              {stat.toUpperCase()} {mod > 0 ? '+' : ''}{mod}
                            </span>
                          )
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* COLORS & NAME */}
            {activeSection === 'colors' && (
              <div className="bg-gray-900 border-2 border-gray-800 p-6">
                <h2 className="text-2xl font-black text-purple-500 mb-4">CUSTOMIZE APPEARANCE</h2>
                
                <div className="space-y-6">
                  {/* Name Input */}
                  <div>
                    <label className="text-sm text-gray-600 mb-2 block font-mono">BEYBLADE NAME</label>
                    <input 
                      type="text"
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                      placeholder="Enter name..."
                      maxLength={20}
                      className="w-full bg-black border-2 border-gray-800 text-white px-4 py-3 font-bold text-xl focus:border-purple-500 outline-none"
                    />
                  </div>
                  
                  {/* Rotation */}
                  <div>
                    <label className="text-sm text-gray-600 mb-2 block font-mono">SPIN DIRECTION</label>
                    <div className="flex gap-4">
                      <button
                        onClick={() => setRotation('Right')}
                        className={`flex-1 py-3 font-black border-2 ${rotation === 'Right' ? 'bg-orange-600 border-orange-500 text-white' : 'bg-black border-gray-800 text-gray-600'}`}
                      >
                        → RIGHT SPIN
                      </button>
                      <button
                        onClick={() => setRotation('Left')}
                        className={`flex-1 py-3 font-black border-2 ${rotation === 'Left' ? 'bg-cyan-600 border-cyan-500 text-white' : 'bg-black border-gray-800 text-gray-600'}`}
                      >
                        ← LEFT SPIN
                      </button>
                    </div>
                  </div>
                  
                  {/* Colors */}
                  <div>
                    <label className="text-sm text-gray-600 mb-2 block font-mono">COLOR SCHEME</label>
                    <div className="grid grid-cols-3 gap-4">
                      {customColors.map((color, idx) => (
                        <div key={idx}>
                          <div className="text-xs text-gray-700 mb-1 font-mono">COLOR {idx + 1}</div>
                          <input 
                            type="color"
                            value={color}
                            onChange={(e) => {
                              const newColors = [...customColors];
                              newColors[idx] = e.target.value;
                              setCustomColors(newColors);
                            }}
                            className="w-full h-16 cursor-pointer border-2 border-gray-800"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Presets */}
                  <div>
                    <label className="text-sm text-gray-600 mb-2 block font-mono">COLOR PRESETS</label>
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        ['#ef4444', '#000000', '#fbbf24'],
                        ['#3b82f6', '#ffffff', '#1e3a8a'],
                        ['#10b981', '#000000', '#ffffff'],
                        ['#8b5cf6', '#000000', '#ec4899'],
                        ['#f59e0b', '#000000', '#dc2626'],
                        ['#06b6d4', '#1e293b', '#ffffff'],
                        ['#6366f1', '#fbbf24', '#000000'],
                        ['#14b8a6', '#0f172a', '#fcd34d']
                      ].map((preset, idx) => (
                        <button
                          key={idx}
                          onClick={() => setCustomColors(preset)}
                          className="h-12 border-2 border-gray-800 hover:border-purple-500 transition flex"
                        >
                          {preset.map((c, i) => (
                            <div key={i} className="flex-1" style={{backgroundColor: c}}></div>
                          ))}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT - Preview & Stats */}
          <div className="space-y-4">
            {/* Preview */}
            <div className="bg-gradient-to-b from-gray-900 to-black border-4 border-purple-600 p-6">
              <h3 className="text-xl font-black text-purple-500 mb-4 text-center">PREVIEW</h3>
              
              {/* Beyblade Visual */}
              <div className="flex items-center justify-center mb-6">
                <div 
                  className="w-40 h-40 rounded-full flex items-center justify-center border-8 relative"
                  style={{
                    backgroundColor: customColors[0],
                    borderColor: customColors[1],
                    boxShadow: `0 0 30px ${customColors[0]}80`
                  }}
                >
                  <div 
                    className="absolute inset-4 rounded-full border-4"
                    style={{borderColor: customColors[2]}}
                  ></div>
                  <div className="text-6xl font-black text-white z-10" style={{textShadow: '2px 2px 0px #000'}}>
                    {customName ? customName[0].toUpperCase() : '?'}
                  </div>
                </div>
              </div>
              
              {/* Name & Type */}
              <div className="text-center mb-4">
                <div className="text-2xl font-black text-white mb-1">
                  {customName || 'Unnamed Beyblade'}
                </div>
                <div className="text-sm text-gray-600 font-mono">{beyType} Type • {rotation} Spin</div>
              </div>
              
              {/* Components */}
              <div className="space-y-2 text-xs">
                <div className="bg-black border border-gray-800 p-2 flex justify-between">
                  <span className="text-gray-600 font-mono">LAYER:</span>
                  <span className="text-white font-bold">{selectedLayer.name}</span>
                </div>
                <div className="bg-black border border-gray-800 p-2 flex justify-between">
                  <span className="text-gray-600 font-mono">DISC:</span>
                  <span className="text-white font-bold">{selectedDisc.name}</span>
                </div>
                <div className="bg-black border border-gray-800 p-2 flex justify-between">
                  <span className="text-gray-600 font-mono">DRIVER:</span>
                  <span className="text-white font-bold">{selectedDriver.name}</span>
                </div>
                <div className="bg-black border border-gray-800 p-2 flex justify-between">
                  <span className="text-gray-600 font-mono">ARMOR:</span>
                  <span className="text-white font-bold">{selectedArmor.name}</span>
                </div>
              </div>
            </div>

            {/* Final Stats */}
            <div className="bg-gray-900 border-2 border-gray-800 p-6">
              <h3 className="text-xl font-black text-purple-500 mb-4">FINAL STATS</h3>
              <div className="space-y-3">
                {Object.entries(finalStats).map(([stat, value]) => {
                  const max = stat === 'spin' ? 60 : 30;
                  const percent = (value / max) * 100;
                  return (
                    <div key={stat}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600 font-mono uppercase">{stat}</span>
                        <span className="text-white font-bold">{value}</span>
                      </div>
                      <div className="w-full bg-black h-3 border border-gray-800">
                        <div 
                          className="h-full bg-gradient-to-r from-purple-600 to-pink-600"
                          style={{width: `${percent}%`}}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Save Button */}
            <button
              onClick={handleSave}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white py-6 font-black text-2xl border-4 border-purple-700 transition"
            >
              💾 SAVE TO COLLECTION
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================
// ⚔️ SIGNATURE BLADE SYSTEM
// ============================================
// Sistema de Blades Legendários únicos por jogador

/**
 * Gera nome para Signature Blade baseado no jogador
 */
function generateSignatureBladeName(team) {
  // Extrair alcunha do nome (texto entre aspas)
  const nicknameMatch = team.name.match(/"([^"]+)"/);
  const nickname = nicknameMatch ? nicknameMatch[1] : null;
  
  // Extrair país (remover emoji)
  const country = team.country.replace(/[^\w\s]/gi, '').trim();
  
  // Palavras baseadas em mentalidade
  const mentalityWords = {
    ALL_ROUNDER:         ['Equilibrium', 'Harmony', 'Balance', 'Unity'],
    GLASS_CANNON:        ['Devastator', 'Destroyer', 'Annihilator', 'Apocalypse'],
    IRON_FORTRESS:       ['Aegis', 'Bastion', 'Citadel', 'Sentinel'],
    ETERNAL_SPINNER:     ['Infinity', 'Eternity', 'Perpetual', 'Endless'],
    CALCULATED_CHAOS:    ['Paradox', 'Enigma', 'Cipher', 'Phantom'],
    HIGH_RISK_GAMBLER:   ['Roulette', 'Wildcard', 'Hazard', 'Gambit'],
    MOMENTUM_MASTER:     ['Avalanche', 'Cascade', 'Crescendo', 'Surge'],
    SYNERGY_SEEKER:      ['Nexus', 'Fusion', 'Convergence', 'Synthesis'],
    // 🆕 Novas mentalidades
    ADAPTIVE_TACTICIAN:  ['Metamorph', 'Evolution', 'Shift', 'Adaptation'],
    PERFECTIONIST:       ['Apex', 'Pinnacle', 'Flawless', 'Absolute'],
    CHAOS_AGENT:         ['Maelstrom', 'Havoc', 'Tempest', 'Anarchy'],
    MOMENTUM_THIEF:      ['Phantom', 'Specter', 'Shadow', 'Nemesis']
  };
  
  // Sufixos temáticos por região
  const regionSuffixes = {
    'EUA': ['Freedom', 'Liberty', 'Justice', 'Glory'],
    'Canada': ['North', 'Frost', 'Aurora', 'Storm'],
    'Brasil': ['Thunder', 'Tempest', 'Blaze', 'Fury'],
    'Argentina': ['Tango', 'Passion', 'Pride', 'Spirit'],
    'Franca': ['Royale', 'Majesty', 'Eclipse', 'Dynasty'],
    'Alemanha': ['Kaiser', 'Titan', 'Vanguard', 'Colossus'],
    'Inglaterra': ['Crown', 'Empire', 'Sovereign', 'Monarch'],
    'Espanha': ['Conquistador', 'Matador', 'Conquistar', 'Armada'],
    'Italia': ['Gladiator', 'Caesar', 'Colosseum', 'Legacy'],
    'Russia': ['Tsar', 'Czar', 'Winter', 'Mammoth'],
    'Japao': ['Samurai', 'Shogun', 'Dragon', 'Phoenix'],
    'China': ['Emperor', 'Dynasty', 'Celestial', 'Imperial'],
    'Coreia do Sul': ['Tiger', 'Sovereign', 'Rising', 'Dynasty'],
    'India': ['Maharaja', 'Rajah', 'Mystic', 'Sacred'],
    'Mexico': ['Aztec', 'Jaguar', 'Sol', 'Quetzal'],
    'Australia': ['Outback', 'Thunder', 'Crocodile', 'Tempest'],
    'Egito': ['Pharaoh', 'Sphinx', 'Pyramid', 'Anubis'],
    'Nigeria': ['Lion', 'Savannah', 'Warrior', 'Pride']
  };
  
  // Escolher palavra baseada em mentalidade
  const mentalityWord = mentalityWords[team.mentality] 
    ? mentalityWords[team.mentality][Math.floor(Math.random() * mentalityWords[team.mentality].length)]
    : 'Legend';
  
  // Escolher sufixo baseado no país
  const suffix = regionSuffixes[country]
    ? regionSuffixes[country][Math.floor(Math.random() * regionSuffixes[country].length)]
    : 'Blade';
  
  // Construir nome
  // Formato: [Nickname's] [Mentalidade] [Regional]
  // Ex: "Frostbite's Avalanche Storm" ou "The Wall's Aegis Freedom"
  
  if (nickname) {
    return `${nickname}'s ${mentalityWord} ${suffix}`;
  } else {
    // Se não tem nickname, usar primeira palavra do nome + mentalidade
    const firstName = team.name.split(' ')[0];
    return `${firstName}'s ${mentalityWord} ${suffix}`;
  }
}

/**
 * Cria Signature Blade com 200 pontos base
 */
function createSignatureBlade(team, playerId) {
  const signatureName = generateSignatureBladeName(team);
  const mentality = team.mentality;
  const mentalityConfig = MENTALITIES[mentality] || MENTALITIES['ALL_ROUNDER'];
  const preferredType = mentalityConfig.preferredType;
  
  // 200 pontos para distribuir (ao invés de 100)
  // Vamos criar stats mais poderosos baseados no tipo preferido
  let stats;
  
  if (preferredType === 'Attack' || preferredType === 'Extreme') {
    stats = {
      atk: 28 + Math.floor(Math.random() * 8), // 28-35
      def: 10 + Math.floor(Math.random() * 6), // 10-15
      sta: 12 + Math.floor(Math.random() * 6), // 12-17
      bal: 12 + Math.floor(Math.random() * 6), // 12-17
      weight: 15 + Math.floor(Math.random() * 8), // 15-22
      spin: 52 + Math.floor(Math.random() * 12) // 52-63
    };
  } else if (preferredType === 'Defense') {
    stats = {
      atk: 10 + Math.floor(Math.random() * 6),
      def: 30 + Math.floor(Math.random() * 8),
      sta: 14 + Math.floor(Math.random() * 6),
      bal: 18 + Math.floor(Math.random() * 6),
      weight: 22 + Math.floor(Math.random() * 10),
      spin: 42 + Math.floor(Math.random() * 12)
    };
  } else if (preferredType === 'Stamina') {
    stats = {
      atk: 8 + Math.floor(Math.random() * 5),
      def: 10 + Math.floor(Math.random() * 6),
      sta: 32 + Math.floor(Math.random() * 8),
      bal: 20 + Math.floor(Math.random() * 6),
      weight: 10 + Math.floor(Math.random() * 6),
      spin: 60 + Math.floor(Math.random() * 12)
    };
  } else { // Balance e outros
    stats = {
      atk: 18 + Math.floor(Math.random() * 8),
      def: 18 + Math.floor(Math.random() * 8),
      sta: 18 + Math.floor(Math.random() * 8),
      bal: 18 + Math.floor(Math.random() * 8),
      weight: 18 + Math.floor(Math.random() * 8),
      spin: 48 + Math.floor(Math.random() * 12)
    };
  }

  // 🆕 Signature blades para novos preferredTypes
  if (preferredType === 'Adaptive') {
    stats = {
      atk: 20 + Math.floor(Math.random() * 8),  // 20-27 (escala com rounds)
      def: 20 + Math.floor(Math.random() * 8),
      sta: 20 + Math.floor(Math.random() * 8),
      bal: 22 + Math.floor(Math.random() * 8),  // Mais estável
      weight: 18 + Math.floor(Math.random() * 8),
      spin: 50 + Math.floor(Math.random() * 12)
    };
  } else if (preferredType === 'Precision') {
    stats = {
      atk: 10 + Math.floor(Math.random() * 6),
      def: 14 + Math.floor(Math.random() * 6),
      sta: 28 + Math.floor(Math.random() * 8),  // 28-35 (alto stamina)
      bal: 24 + Math.floor(Math.random() * 8),  // 24-31 (muito estável)
      weight: 12 + Math.floor(Math.random() * 6),
      spin: 62 + Math.floor(Math.random() * 12) // 62-73 (spin máximo)
    };
  } else if (preferredType === 'Chaos') {
    // Stats propositalmente extremos e variáveis
    const roll = Math.random();
    if (roll < 0.33) {
      stats = { atk: 32 + Math.floor(Math.random() * 8), def: 8, sta: 10, bal: 8, weight: 14, spin: 48 };
    } else if (roll < 0.66) {
      stats = { atk: 10, def: 32 + Math.floor(Math.random() * 8), sta: 8, bal: 18, weight: 22, spin: 44 };
    } else {
      stats = { atk: 15, def: 10, sta: 30 + Math.floor(Math.random() * 8), bal: 14, weight: 12, spin: 60 };
    }
  } else if (preferredType === 'Disruptive') {
    stats = {
      atk: 14 + Math.floor(Math.random() * 6),
      def: 26 + Math.floor(Math.random() * 8),  // 26-33 (alto)
      sta: 20 + Math.floor(Math.random() * 6),  // 20-25 (bom)
      bal: 20 + Math.floor(Math.random() * 6),
      weight: 22 + Math.floor(Math.random() * 8), // 22-29
      spin: 48 + Math.floor(Math.random() * 12)
    };
  }
  
  // Criar beyblade usando função existente mas com stats especiais
  const blade = createBeyFromStats(team, 0, stats, preferredType, null, null);
  
  // Marcar como Signature
  blade.isSignature = true;
  blade.signatureName = signatureName;
  blade.deckPosition = 1; // Sempre primeiro slot
  
  return blade;
}

/**
 * Cria 2 Season Blades para a temporada
 */
function createSeasonBlades(team, playerId) {
  const intel = team.attributes?.intelligence || 7;
  const mentality = team.mentality;
  const preferredType = (MENTALITIES[mentality] || MENTALITIES['ALL_ROUNDER']).preferredType;
  
  const blades = [];
  
  // Season Blade 1: Baseado no tipo preferido
  const blade1 = buildBeyByType(team, 1, preferredType, true);
  blade1.isSeasonBlade = true;
  blade1.deckPosition = 2;
  blades.push(blade1);
  
  // Season Blade 2: Counter ou versatile baseado em intelligence (escala 0-15)
  let secondType;
  if (intel >= 10) {
    // Alta inteligência: escolhe counter estratégico
    const counterTypes = getCounterTypes(preferredType);
    secondType = counterTypes[0];
  } else if (intel >= 5) {
    // Média inteligência: escolhe tipo equilibrado
    secondType = 'Balance';
  } else {
    // Baixa inteligência: repete tipo preferido
    secondType = preferredType;
  }
  
  const blade2 = buildBeyByType(team, 2, secondType, false);
  blade2.isSeasonBlade = true;
  blade2.deckPosition = 3;
  blades.push(blade2);
  
  return blades;
}

/**
 * Cria 2 Tournament Blades adaptados para arena e oponentes
 */
function createTournamentBlades(team, playerId, arena) {
  const intel = team.attributes?.intelligence || 7;
  const arenaPrefs = ARENA_PREFERENCES[arena];
  
  const blades = [];
  
  // Se não tem preferências de arena ou intelligence baixa, cria aleatório (escala 0-15)
  if (!arenaPrefs || arena === 'ALL' || intel <= 5) {
    const randomTypes = ['Attack', 'Defense', 'Stamina', 'Balance'];
    
    const blade1 = buildBeyByType(team, 3, randomTypes[Math.floor(Math.random() * 4)], false);
    blade1.isTournamentBlade = true;
    blade1.deckPosition = 4;
    blades.push(blade1);
    
    const blade2 = buildBeyByType(team, 4, randomTypes[Math.floor(Math.random() * 4)], false);
    blade2.isTournamentBlade = true;
    blade2.deckPosition = 5;
    blades.push(blade2);
    
    return blades;
  }
  
  // Intelligence média/alta: adapta para arena
  const favoredTypes = arenaPrefs.favoredTypes;
  
  // Tournament Blade 1: Tipo favorecido pela arena
  const type1 = favoredTypes[Math.floor(Math.random() * favoredTypes.length)];
  const blade1 = buildBeyByType(team, 3, type1, false);
  blade1.isTournamentBlade = true;
  blade1.deckPosition = 4;
  blade1.arenaOptimized = true;
  blade1.optimizedFor = arenaPrefs.name;
  blades.push(blade1);
  
  // Tournament Blade 2: Outro tipo favorecido ou counter
  let type2;
  if (intel >= 7 && favoredTypes.length > 1) {
    // Alta int: diversifica tipos favorecidos
    type2 = favoredTypes.filter(t => t !== type1)[0] || favoredTypes[0];
  } else {
    // Média int: pode repetir ou escolher aleatório
    type2 = Math.random() > 0.5 ? type1 : favoredTypes[Math.floor(Math.random() * favoredTypes.length)];
  }
  
  const blade2 = buildBeyByType(team, 4, type2, false);
  blade2.isTournamentBlade = true;
  blade2.deckPosition = 5;
  blade2.arenaOptimized = true;
  blade2.optimizedFor = arenaPrefs.name;
  blades.push(blade2);
  
  return blades;
}

/**
 * Monta deck completo: 1 Signature + 2 Season + 2 Tournament
 */
function buildFullDeck(team, playerId, arena, signatureBlade, seasonBlades) {
  const deck = [];
  
  // 1. Signature Blade (sempre primeiro)
  deck.push(signatureBlade);
  
  // 2. Season Blades (fixos pela temporada)
  deck.push(...seasonBlades);
  
  // 3. Tournament Blades (adaptados por torneio)
  const tournamentBlades = createTournamentBlades(team, playerId, arena);
  deck.push(...tournamentBlades);
  
  return deck;
}

/**
 * Inicializa Signature Blade para um jogador (chamado uma vez na carreira)
 */
function initializeSignatureBladeForPlayer(playerId, team) {
  const signatureBlade = createSignatureBlade(team, playerId);
  
  return {
    blade: signatureBlade,
    stats: {
      totalWins: 0,
      totalLosses: 0,
      totalRounds: 0,
      winsByBurst: 0,
      winsBySpin: 0,
      winsByRingOut: 0,
      lossesByBurst: 0,
      lossesBySpin: 0,
      lossesByRingOut: 0,
      winStreak: 0,
      bestWinStreak: 0,
      lossStreak: 0,
      bestLossStreak: 0,
      winsAgainstSignatures: 0,
      lossesAgainstSignatures: 0,
      // ── Streaks por contexto (vs Comuns / vs Signatures) ──
      vsCommonsWinStreak: 0,
      vsCommonsBestWinStreak: 0,
      vsCommonsLossStreak: 0,
      vsCommonsBestLossStreak: 0,
      vsSignaturesWinStreak: 0,
      vsSignaturesBestWinStreak: 0,
      vsSignaturesLossStreak: 0,
      vsSignaturesBestLossStreak: 0,
      titlesWon: [],
      iconicMoments: [] // Momentos especiais registrados
    }
  };
}

/**
 * Atualiza streaks de contexto (vs Comuns / vs Signatures) separadamente
 */
function updateContextStreaks(stats, won, vsSignature) {
  if (vsSignature) {
    if (won) {
      stats.vsSignaturesWinStreak  = (stats.vsSignaturesWinStreak  || 0) + 1;
      stats.vsSignaturesLossStreak = 0;
      if (stats.vsSignaturesWinStreak > (stats.vsSignaturesBestWinStreak || 0))
        stats.vsSignaturesBestWinStreak = stats.vsSignaturesWinStreak;
    } else {
      stats.vsSignaturesLossStreak  = (stats.vsSignaturesLossStreak  || 0) + 1;
      stats.vsSignaturesWinStreak   = 0;
      if (stats.vsSignaturesLossStreak > (stats.vsSignaturesBestLossStreak || 0))
        stats.vsSignaturesBestLossStreak = stats.vsSignaturesLossStreak;
    }
  } else {
    if (won) {
      stats.vsCommonsWinStreak  = (stats.vsCommonsWinStreak  || 0) + 1;
      stats.vsCommonsLossStreak = 0;
      if (stats.vsCommonsWinStreak > (stats.vsCommonsBestWinStreak || 0))
        stats.vsCommonsBestWinStreak = stats.vsCommonsWinStreak;
    } else {
      stats.vsCommonsLossStreak  = (stats.vsCommonsLossStreak  || 0) + 1;
      stats.vsCommonsWinStreak   = 0;
      if (stats.vsCommonsLossStreak > (stats.vsCommonsBestLossStreak || 0))
        stats.vsCommonsBestLossStreak = stats.vsCommonsLossStreak;
    }
  }
}

/**
 * Atualiza estatísticas do Signature Blade após uma batalha
 */
function updateSignatureBladeStats(signatureData, roundResult, wonRound, tournamentName) {
  const stats = signatureData.stats;
  
  stats.totalRounds++;
  
  // Normalizar método (suporta tanto BURST_FINISH quanto Burst, etc.)
  const method = (roundResult.method || '').toUpperCase();
  const isBurst   = method.includes('BURST');
  const isSpin    = method.includes('SPIN');
  const isRingOut = method.includes('RING') || method.includes('KO');
  
  if (wonRound) {
    stats.totalWins++;
    stats.winStreak++;
    stats.lossStreak = 0;
    
    if (stats.winStreak > stats.bestWinStreak) {
      stats.bestWinStreak = stats.winStreak;
    }
    
    // Registrar tipo de vitória
    if (isBurst)        stats.winsByBurst++;
    else if (isRingOut) stats.winsByRingOut++;
    else                stats.winsBySpin++;
    
  } else {
    stats.totalLosses++;
    stats.lossStreak++;
    stats.winStreak = 0;
    
    if (stats.lossStreak > stats.bestLossStreak) {
      stats.bestLossStreak = stats.lossStreak;
    }
    
    // Registrar tipo de derrota
    if (isBurst)        stats.lossesByBurst++;
    else if (isRingOut) stats.lossesByRingOut++;
    else                stats.lossesBySpin++;
  }
  
  // Registrar momentos icônicos
  if (wonRound && tournamentName && tournamentName.includes('Grand Slam')) {
    stats.iconicMoments.push({
      type: 'GRAND_SLAM_WIN',
      tournament: tournamentName,
      date: new Date().toISOString()
    });
  }
}

// ============================================
// UNIVERSE MODE - UI COMPONENTS
// ============================================

// ============================================
// buildDeckWithBonuses — Deck completo para Exhibition e SimTest
// Aplica atributos do blader (TEC/INT/ADA/CLT/ATK/DEF/STA/SPD)
// Para universo use adaptDeckForArena() que inclui forma + assinatura
// ============================================
function buildDeckWithBonuses(team, arena) {
  const mentality = MENTALITIES[team.mentality];
  if (!mentality) return [];

  // Montar beys brutos
  const rawDeck = mentality.buildDeck(team);

  // Calcular arena preference modifier (flat ±6/4/2)
  const ARENA_PREF_SIMPLE = {
    ALL_ROUNDER:       { fav: ['BB10_COMPETITIVE','PANGEA_PLATFORM','DOMINATION_ZONES'], hate: ['PINBALL_INFERNO','VOLCANIC_RAGE','COLOSSEUM_CARNAGE'] },
    GLASS_CANNON:      { fav: ['COLOSSEUM_CARNAGE','PINBALL_INFERNO','STORM_TRACK'],     hate: ['KILLER_SIDES','VORTEX_COLISEUM','DOMINATION_ZONES'] },
    IRON_FORTRESS:     { fav: ['NEXUS','DOMINATION_ZONES','PANGEA_PLATFORM'],            hate: ['PINBALL_INFERNO','STORM_TRACK','COLOSSEUM_CARNAGE'] },
    ETERNAL_SPINNER:   { fav: ['VORTEX_COLISEUM','KILLER_SIDES','TIDAL_SURGE'],          hate: ['COLOSSEUM_CARNAGE','PINBALL_INFERNO','VOLCANIC_RAGE'] },
    CALCULATED_CHAOS:  { fav: ['NEXUS','COLOSSEUM_CARNAGE','DOMINATION_ZONES'],          hate: ['BB10_COMPETITIVE','KILLER_SIDES','PANGEA_PLATFORM'] },
    HIGH_RISK_GAMBLER: { fav: ['PINBALL_INFERNO','COLOSSEUM_CARNAGE','STORM_TRACK'],     hate: ['BB10_COMPETITIVE','PANGEA_PLATFORM','DOMINATION_ZONES'] },
    MOMENTUM_MASTER:   { fav: ['STORM_TRACK','TIDAL_SURGE','VORTEX_COLISEUM'],           hate: ['PINBALL_INFERNO','VOLCANIC_RAGE','NEXUS'] },
    SYNERGY_SEEKER:    { fav: ['DOMINATION_ZONES','NEXUS','PANGEA_PLATFORM'],            hate: ['PINBALL_INFERNO','VOLCANIC_RAGE','COLOSSEUM_CARNAGE'] },
    ADAPTIVE_TACTICIAN:{ fav: ['NEXUS','DOMINATION_ZONES','BB10_COMPETITIVE'],           hate: ['VOLCANIC_RAGE','KILLER_SIDES','VORTEX_COLISEUM'] },
    PERFECTIONIST:     { fav: ['BB10_COMPETITIVE','PANGEA_PLATFORM','KILLER_SIDES'],     hate: ['PINBALL_INFERNO','COLOSSEUM_CARNAGE','TIDAL_SURGE'] },
    CHAOS_AGENT:       { fav: ['PINBALL_INFERNO','VOLCANIC_RAGE','COLOSSEUM_CARNAGE'],   hate: ['BB10_COMPETITIVE','PANGEA_PLATFORM','NEXUS'] },
    MOMENTUM_THIEF:    { fav: ['KILLER_SIDES','DOMINATION_ZONES','STORM_TRACK'],         hate: ['TIDAL_SURGE','VORTEX_COLISEUM','PANGEA_PLATFORM'] },
  };

  let arenaMod = 0;
  if (arena) {
    const prefs = ARENA_PREF_SIMPLE[team.mentality] || ARENA_PREF_SIMPLE.ALL_ROUNDER;
    if (prefs.fav[0] === arena) arenaMod = +6;
    else if (prefs.fav[1] === arena) arenaMod = +4;
    else if (prefs.fav[2] === arena) arenaMod = +2;
    else if (prefs.hate[0] === arena) arenaMod = -6;
    else if (prefs.hate[1] === arena) arenaMod = -4;
    else if (prefs.hate[2] === arena) arenaMod = -2;
  }

  return rawDeck.map(bey => {
    // 1. Arena preference flat modifier (base)
    if (arenaMod !== 0 && bey) {
      ['atk','def','sta','bal','weight','spin'].forEach(s => {
        if (bey.stats?.[s] !== undefined)        bey.stats[s]        = Math.max(1, bey.stats[s] + arenaMod);
        if (bey.effectiveStats?.[s] !== undefined) bey.effectiveStats[s] = Math.max(1, bey.effectiveStats[s] + arenaMod);
      });
      bey._arenaPreferenceMod = arenaMod;
    }
    // 2. Atributos do blader — inclui TEC/INT/ADA/CLT/ATK/DEF/STA/SPD + arena reduction
    return applyBladerBonuses(bey, team, { arenaModApplied: arenaMod });
  });
}

export { 
  MENTALITIES, 
  selectLaunchTechnique, 
  LAUNCH_TECHNIQUES,
  LAUNCH_QUALITY,
  determineLaunchQuality,
  buildDeckWithBonuses
};
export default UniverseManager;
