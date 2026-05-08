// ============================================
// APP.JSX - Componente Principal
// ============================================
//
// ARQUITETURA UNIFICADA DO JOGO
// ============================================
// 
// PRINCÍPIO FUNDAMENTAL:
// Existe UM ÚNICO JOGO DE BEYBLADE, não dois jogos separados.
// O "Modo Universo" é o jogo completo (guia mestre).
// O "Modo Exibição" é apenas para testes rápidos de arenas.
//
// SISTEMA DE BATALHA (100% COMPARTILHADO):
// ├── PreBattleScreen    → Análise tática + lançamento
// ├── BattleArena        → Física e combate
// ├── ReplayScreen       → Repetição da batalha
// └── PostMatchScreen    → Resultados
//
// REGRA DE OURO:
// Qualquer mudança em UI, física, regras ou mecânicas de batalha
// afeta AUTOMATICAMENTE ambos os modos.
//
// O que DIFERENCIA os modos:
// - Exibição: Setup rápido → Batalha → Fim
// - Universo: Torneios → Batalha → Rankings/Carreira/Social
//
// A BATALHA É A MESMA. O universo apenas adiciona camadas.
// ============================================

import React, { useState, useEffect } from 'react';
import { Trophy, Play, Tv, Users, ChevronRight, Globe, Calendar, Award, TrendingUp, Save, Upload, Star } from 'lucide-react';

// Imports dos arquivos refatorados
import { TEAMS, POINTS_CONFIG, ARENA_PREFERENCES } from './data.js';
import { CALENDAR_STRUCTURE } from './CalendarConfig.js';
import UniverseManager, { MENTALITIES, selectLaunchTechnique, buildDeckWithBonuses } from './UniverseManager.js';
import { applyArenaModifiers } from './BattleEngine.js';
import ModernBracket from './ModernBracket';
import TournamentCeremony from './TournamentCeremony.jsx';
import TournamentOpening from './TournamentOpening.jsx';
import {
  UniverseCalendarScreen,
  UniverseBracketScreen,
  UniverseRankingsScreen,
  UniverseChampionScreen,
  UniverseTournamentHistoryScreen,
  PlayerProfileScreen,
  MenuScreen,
  ArenasInfoScreen,
  TournamentRecapScreen,
  SeasonRecapScreen,
  SettingsScreen,
  SimTestScreen
} from './Screens.jsx';
import SeasonAwardsCeremony from './SeasonAwardsCeremony.jsx';
import {
  PreBattleScreen,
  BattleArena,
  ReplayScreen,
  PostMatchScreen,
  ExhibitionSetup
} from './BattleComponents.jsx';
import SeriesManager from './SeriesManager.jsx';
import { TurboProvider } from './TurboContext.jsx';
import {
  RivalryTrackerScreen,
  EventsCalendarScreen,
  SocialFeedScreen,
  LegacyScreen
} from './NarrativeScreens.jsx';
import {
  AnalyticsDashboard,
  PlayerAnalyticsScreen,
  MetaDashboard,
  RecordBookScreen,
  BalanceReportScreen
} from './AnalyticsScreens.jsx';
import { useSettings } from './SettingsContext.jsx';

// ===== FASE 1: BROADCAST HUB & SCHEDULE =====
import BroadcastHub from './BroadcastHub.jsx';
import BreakingNews from './BreakingNews.jsx';
import ExpandedSchedule from './ExpandedSchedule.jsx';
import { UnifiedPlayerProfile } from './UnifiedPlayerProfile.jsx';
import RetirementAnnouncement from './RetirementAnnouncement.jsx';
import EraTransitionOverlay from './EraTransitionOverlay.jsx';
import { resolveArenaPicks, isTournamentEligibleForPick } from './ArenaPick.js';

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


const App = () => {
  const [screen, setScreen] = useState('HOME');
  const [universeManager] = useState(() => new UniverseManager());
  const [appRefreshKey, setAppRefreshKey] = useState(0); // força re-render global após load de save
  const [universeCurrentMatch, setUniverseCurrentMatch] = useState(null);
  
  // ✅ NOVO: Estado persistente para auto-play turbo
  const [autoPlayQueue, setAutoPlayQueue] = useState(null);
  const [universeChampion, setUniverseChampion] = useState(null);
  const [universeViewingTournament, setUniverseViewingTournament] = useState(null);
  const [showTournamentRecap, setShowTournamentRecap] = useState(false);
  const [showSeasonRecap, setShowSeasonRecap] = useState(false);
  const [exhibitionConfig, setExhibitionConfig] = useState(null);
  const [currentMatchBeys, setCurrentMatchBeys] = useState(null);
  const [battleResult, setBattleResult] = useState(null);

  // ===== MODO TURBO =====
  const [turboMode, setTurboMode] = useState(false);
  
  // ===== FASE 4: HYBRID MODE STATES =====
  
  // ===== FASE 3: ANALYTICS & UX STATES =====
  const [selectedPlayerAnalytics, setSelectedPlayerAnalytics] = useState(null);
  const [selectedPlayerId, setSelectedPlayerId] = useState(null);
  const [notifications, setNotifications] = useState([]);
  
  // ===== FASE 1: BREAKING NEWS SYSTEM =====
  const [breakingNewsQueue, setBreakingNewsQueue] = useState([]);
  const [currentBreakingNews, setCurrentBreakingNews] = useState(null);
  const [showRetirementAnnouncement, setShowRetirementAnnouncement] = useState(false);
  const [pendingRetirements, setPendingRetirements] = useState([]);
  const [showEraTransition, setShowEraTransition] = useState(false);
  
  
  // ===== SETTINGS HOOK =====
  const { settings } = useSettings();
  
  // Speed mode constants
  const SPEED_MODES = {
    ANALYZE: 0.5,
    NORMAL: 1.0,
    FAST: 2.0,
    TURBO: 5.0,
    SIM_ONLY: 999
  };
  
  // Add notification helper
  const addNotification = (message, type = 'info') => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  };
  
  // ===== FASE 1: BREAKING NEWS HELPERS =====
  const addBreakingNews = (event) => {
    setBreakingNewsQueue(prev => [...prev, event]);
  };

  const processBreakingNewsQueue = () => {
    if (breakingNewsQueue.length > 0 && !currentBreakingNews) {
      const [nextNews, ...rest] = breakingNewsQueue;
      setCurrentBreakingNews(nextNews);
      setBreakingNewsQueue(rest);
    }
  };

  const dismissBreakingNews = () => {
    setCurrentBreakingNews(null);
  };

  const handleBreakingNewsAction = (action) => {
    console.log('Breaking News Action:', action);
    if (action.navigate) {
      setScreen(action.navigate);
    }
  };

  // Process breaking news queue
  useEffect(() => {
    processBreakingNewsQueue();
  }, [breakingNewsQueue, currentBreakingNews]);
  
  // Tournament Phase
  
  // League Mode
  
  // Custom Icons
  const [teamCustomIcons, setTeamCustomIcons] = useState({});
  
  const handleUpdateTeamIcon = (teamId, imageDataUrl) => {
    // Helper function to update team icon
    const updateTeamIcon = (team) => {
      if (team.id === teamId) {
        return {
          ...team,
          team: {
            ...team.team,
            customIcon: imageDataUrl
          }
        };
      }
      return team;
    };
    
    // Update current MD3 state if there's an active match
    if (md3State && (md3State.team1 || md3State.team2)) {
      const updatedMd3State = {
        ...md3State,
        team1: md3State.team1 ? updateTeamIcon(md3State.team1) : md3State.team1,
        team2: md3State.team2 ? updateTeamIcon(md3State.team2) : md3State.team2
      };
      setMd3State(updatedMd3State);
    }
    
    // Update current match beyblades if there's an active battle
    if (currentMatchBeys && currentMatchBeys.length === 2) {
      const updatedMatchBeys = currentMatchBeys.map(updateTeamIcon);
      setCurrentMatchBeys(updatedMatchBeys);
    }
  };
  
  // MD3 System
  // NOVO SISTEMA DE SÉRIES
  const [md3State, setMd3State] = useState({
    team1Wins: 0,
    team2Wins: 0,
    team1UsedBlades: [],
    team2UsedBlades: [],
    currentRound: 1,
    matchHistory: [],
    launch1: 'STANDARD',
    launch2: 'STANDARD'
  });

  function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  function drawThreeArenasForMatch() {
    // Sorteia 3 arenas das 6 disponíveis para este duelo MD3
    const allArenas = ['BB10_COMPETITIVE', 'KILLER_SIDES', 'NEXUS', 'VOLCANIC_RAGE', 'PANGEA_PLATFORM', 'COLOSSEUM_CARNAGE', 'PINBALL_INFERNO', 'VORTEX_COLISEUM'];
    const shuffled = shuffleArray([...allArenas]);
    const selectedThree = shuffled.slice(0, 3); // Pega as 3 primeiras
    
    console.log('🎲 Novo Duelo MD3 - Arenas Sorteadas:', {
      pool: allArenas,
      shuffled: shuffled,
      selected: selectedThree,
      round1: selectedThree[0],
      round2: selectedThree[1],
      round3: selectedThree[2]
    });
    
    return selectedThree;
  }

  function generateDeck(team, arena) {
    // buildDeckWithBonuses: raw beys + arena pref + todos os atributos do blader
    // (TEC/INT/ADA/CLT/ATK/DEF/STA/SPD aplicados em effectiveStats)
    return buildDeckWithBonuses(team, arena || null);
  }

  // ============================================
  // ⚔️ SIGNATURE BLADE PERSONALITY SYSTEM
  // ============================================
  /**
   * Cada mentalidade tem uma filosofia única sobre QUANDO usar o Signature Blade.
   * seriesContext = { currentRound, myWins, opponentWins, winsNeeded, mentality }
   */
  function shouldUseSignatureNow(seriesContext) {
    if (!seriesContext) return false;
    const { currentRound, myWins, opponentWins, winsNeeded, mentality } = seriesContext;

    const maxRounds = winsNeeded * 2 - 1;           // MD3→3, MD5→5
    const roundsLeft  = maxRounds - currentRound + 1; // rounds restantes incluindo este
    const winsStillNeeded = winsNeeded - myWins;

    const isLastChance  = winsStillNeeded >= roundsLeft; // precisa vencer TODOS os restantes
    const isMatchPoint  = winsStillNeeded === 1;         // mais 1 vitória fecha a série
    const isLeading     = myWins > opponentWins;
    const isBehind      = opponentWins > myWins;
    const isTied        = myWins === opponentWins;

    switch (mentality) {
      case 'GLASS_CANNON':
        // 💥 Abertura explosiva: o canhão abre com o Signature SEMPRE.
        // Se perdeu o round 1 (raro), joga quando está em desvantagem.
        return currentRound === 1 || isBehind || isLastChance;

      case 'IRON_FORTRESS':
        // 🛡️ Âncora defensiva: guarda o Signature como última linha de defesa.
        // Só usa quando está perdendo ou quando é agora ou nunca.
        return isBehind || isLastChance;

      case 'ETERNAL_SPINNER':
        // ♾️ Finalizador metódico: usa o Signature para FECHAR a série,
        // não para abrir. Fecha quando está na frente com match-point.
        return (isMatchPoint && isLeading) || isLastChance;

      case 'CALCULATED_CHAOS':
        // 🎯 Tático do round 2: plano pré-definido — o Signature vai no round 2.
        // É uma aposta calculada: confirmar vitória ou recuperar empate.
        // Se passou do round 2 sem usar, usa quando em desvantagem.
        return currentRound === 2 || (currentRound > 2 && (isBehind || isLastChance));

      case 'HIGH_RISK_GAMBLER': {
        // 🎲 Wildcard caótico: probabilidade cresce a cada round.
        // Round 1: 40%, Round 2: 55%, Round 3+: 90%.
        const probs = [0.40, 0.55, 0.85, 0.90, 0.95];
        const prob  = probs[Math.min(currentRound - 1, probs.length - 1)];
        return Math.random() < prob;
      }

      case 'MOMENTUM_MASTER':
        // 📈 Surfista do momentum: só usa o Signature DEPOIS de ganhar
        // pelo menos um round. Precisa da onda para empurrar.
        return myWins >= 1 || isLastChance;

      case 'SYNERGY_SEEKER':
        // 🔗 Combo finisher: prepara o combo com os outros blades primeiro.
        // O Signature é a peça final, usada no match-point ou última chance.
        return isMatchPoint || isLastChance;

      case 'ALL_ROUNDER':
        // ⚖️ Leitor de situações: adapta conforme o momento.
        // Usa quando o jogo está em equilíbrio (tied, round ≥ 2) ou atrás.
        return (currentRound >= 2 && isTied) || isBehind || isLastChance;

      default:
        return currentRound === 1; // fallback: abre com Signature
    }
  }

  /**
   * Descrição narrativa da estratégia de Signature para o round atual.
   * Usado para logs e futuro display na UI.
   */
  function getSignatureStrategyLabel(mentality) {
    const labels = {
      GLASS_CANNON:    '💥 Abertura Explosiva',
      IRON_FORTRESS:   '🛡️ Reserva de Emergência',
      ETERNAL_SPINNER: '♾️ Finalizador Metódico',
      CALCULATED_CHAOS:'🎯 Tático do Round 2',
      HIGH_RISK_GAMBLER:'🎲 Wildcard Aleatório',
      MOMENTUM_MASTER: '📈 Surfista do Momentum',
      SYNERGY_SEEKER:  '🔗 Combo Finisher',
      ALL_ROUNDER:     '⚖️ Leitor de Situações',
    };
    return labels[mentality] || '⚔️ Estratégico';
  }

  function selectBeybladeStrategically(availableDeck, opponentBey, arena, lastResult, seriesContext = null) {
    // IA Strategy: choose best matchup
    if (!availableDeck || availableDeck.length === 0) {
      console.error('No beyblades available in deck');
      return null;
    }

    // ─── ⚔️ SIGNATURE BLADE PERSONALITY DECISION ───
    const signatureBlade = availableDeck.find(bey => bey?.isSignature);

    if (signatureBlade && seriesContext) {
      const useNow = shouldUseSignatureNow(seriesContext);
      const strategy = getSignatureStrategyLabel(seriesContext.mentality);

      if (useNow) {
        console.log(
          `⚔️ [${seriesContext.mentality}] ${strategy}: USANDO Signature ` +
          `"${signatureBlade.signatureName || signatureBlade.name}" ` +
          `| Round ${seriesContext.currentRound} | Score ${seriesContext.myWins}-${seriesContext.opponentWins}`
        );
        return signatureBlade;
      } else {
        console.log(
          `🛡️ [${seriesContext.mentality}] ${strategy}: GUARDANDO Signature para o momento certo ` +
          `| Round ${seriesContext.currentRound} | Score ${seriesContext.myWins}-${seriesContext.opponentWins}`
        );
        // Remove o Signature do pool — não é hora
        const nonSignatureDeck = availableDeck.filter(bey => !bey?.isSignature);
        if (nonSignatureDeck.length > 0) {
          availableDeck = nonSignatureDeck;
        }
      }
    }
    // ────────────────────────────────────────────────

    const typeCounters = {
      'Attack': 'Defense',
      'Defense': 'Stamina', 
      'Stamina': 'Attack',
      'Balance': 'Attack'
    };
    
    // Arena preferences
    const arenaPreferences = {
      'NEXUS': 'Attack',
      'BB10_COMPETITIVE': 'Attack',
      'BURST': 'Defense'
    };
    
    let scores = availableDeck.map(bey => {
      let score = 0;
      
      // Type matchup (+30 points for counter)
      if (opponentBey?.type && bey?.type === typeCounters[opponentBey.type]) {
        score += 30;
      }
      
      // Arena synergy (+15 points)
      if (bey?.type === arenaPreferences[arena]) {
        score += 15;
      }
      
      // If lost last round, prioritize counter (+20 points)
      if (lastResult === 'loss' && opponentBey?.type && bey?.type === typeCounters[opponentBey.type]) {
        score += 20;
      }
      
      // Raw power (stats total)
      const statTotal = (bey?.stats?.atk || 0) + (bey?.stats?.def || 0) + (bey?.stats?.sta || 0) + (bey?.stats?.bal || 0);
      score += statTotal * 0.3;
      
      // Opposite spin bonus if opponent known (+10 points)
      if (opponentBey?.rotation && bey?.rotation && bey.rotation !== opponentBey.rotation) {
        score += 10;
      }
      
      return { bey, score };
    });
    
    // Sort by score and pick best
    scores.sort((a, b) => b.score - a.score);
    return scores[0]?.bey || availableDeck[0];
  }

  // Import Save Handler


  // ============================================
  // MODO EXIBIÇÃO - Setup Inicial
  // ============================================
  // IMPORTANTE: Este é apenas o SETUP para modo exibição (testes rápidos)
  // A BATALHA EM SI usa o mesmo sistema que o modo universo
  // Após o setup, ambos os modos seguem para: SELECTION -> BATTLE -> REPLAY
  // ============================================
  function initExhibition(config) {
    
    // Create team objects with decks
    const team1 = {
      team: config.player1,
      deck: generateDeck(config.player1, config.arenas?.[0]),
      id: 1,
      points: 0
    };
    
    const team2 = {
      team: config.player2,
      deck: generateDeck(config.player2, config.arenas?.[0]),
      id: 2,
      points: 0
    };
    
    // Arenas already shuffled in config.arenas
    const arenaOrder = config.arenas;
    
    // ===== NOVO: Detectar se é série ou partida única =====
    const isSeries = config.format === 'MD3' || config.format === 'MD5';
    
    if (isSeries) {
      // Usar SeriesManager
      setExhibitionConfig({
        format: config.format,
        team1: team1,
        team2: team2,
        arenas: arenaOrder
      });
      setScreen('SERIES_MANAGER');
      return;
    }
    
    // MD1 - fluxo original
    // Setup MD3 or MD1
    const newMd3State = {
      team1Wins: 0,
      team2Wins: 0,
      team1UsedBlades: [],
      team2UsedBlades: [],
      currentRound: 1,
      matchHistory: [],
      team1: team1,
      team2: team2,
      arenaOrder: arenaOrder,
      isExhibition: true,
      format: config.format
    };
    
    setMd3State(newMd3State);
    
    // Select first beyblades — com contexto de série para personalidade do Signature
    const round1Arena = arenaOrder[0];
    const exhFormatNum = parseInt((config.format || 'MD3').replace('MD', '')) || 3;
    const exhWinsNeeded = Math.ceil(exhFormatNum / 2);

    const exhTeam1Ctx = {
      currentRound: 1, myWins: 0, opponentWins: 0,
      winsNeeded: exhWinsNeeded,
      mentality: config.player1?.mentality || 'ALL_ROUNDER'
    };
    const exhTeam2Ctx = {
      currentRound: 1, myWins: 0, opponentWins: 0,
      winsNeeded: exhWinsNeeded,
      mentality: config.player2?.mentality || 'ALL_ROUNDER'
    };

    const team1Bey = selectBeybladeStrategically(team1.deck || [], null, round1Arena, null, exhTeam1Ctx);
    const team2Bey = selectBeybladeStrategically(team2.deck || [], null, round1Arena, null, exhTeam2Ctx);
    
    if (!team1Bey || !team2Bey) {
      setScreen('HOME');
      return;
    }
    
    newMd3State.team1UsedBlades.push(team1Bey);
    newMd3State.team2UsedBlades.push(team2Bey);
    
    // AI selects launch techniques
    const launch1 = selectLaunchTechnique(
      team1Bey.type,
      team2Bey.type,
      team2Bey.rotation,
      team1Bey.rotation,
      round1Arena
    );
    const launch2 = selectLaunchTechnique(
      team2Bey.type,
      team1Bey.type,
      team1Bey.rotation,
      team2Bey.rotation,
      round1Arena
    );
    
    newMd3State.launch1 = launch1;
    newMd3State.launch2 = launch2;
    
    setCurrentMatchBeys([
      { ...team1, bey: team1Bey },
      { ...team2, bey: team2Bey }
    ]);
    
    // ✅ CORREÇÃO: Respeitar configuração skipPreBattle
    if (settings.skipPreBattle) {
      console.log('⏭️ Pulando PreBattle - indo direto para BATTLE');
      setScreen('BATTLE');
    } else {
      console.log('📋 Mostrando PreBattle Analysis');
      setScreen('SELECTION');
    }
  }

  function generateRoundRobinSchedule(teams) {
    const n = teams.length;
    const rounds = [];
    
    // Round Robin algorithm (Circle method)
    const teamsCopy = [...teams];
    
    // If odd number of teams, add a "BYE"
    if (n % 2 === 1) {
      teamsCopy.push(null); // BYE team
    }
    
    const totalTeams = teamsCopy.length;
    const numRounds = totalTeams - 1;
    const matchesPerRound = totalTeams / 2;
    
    for (let round = 0; round < numRounds; round++) {
      const roundMatches = [];
      
      for (let match = 0; match < matchesPerRound; match++) {
        const home = (round + match) % (totalTeams - 1);
        const away = (totalTeams - 1 - match + round) % (totalTeams - 1);
        
        // Last team stays fixed
        const teamHome = match === 0 ? teamsCopy[totalTeams - 1] : teamsCopy[home];
        const teamAway = teamsCopy[away];
        
        // Skip BYE matches
        if (teamHome && teamAway) {
          roundMatches.push({
            team1: teamHome,
            team2: teamAway,
            played: false,
            roundNumber: round + 1
          });
        }
      }
      
      rounds.push({
        roundNumber: round + 1,
        matches: roundMatches
      });
    }
    
    return rounds;
  }

  function generateGroupRounds(teams) {
    // For 4 teams, we have 3 rounds
    // Round 1: 1v2, 3v4
    // Round 2: 1v3, 2v4
    // Round 3: 1v4, 2v3
    
    if (teams.length !== 4) return [];
    
    const rounds = [
      {
        roundNumber: 1,
        matches: [
          { team1: teams[0], team2: teams[1], played: false },
          { team1: teams[2], team2: teams[3], played: false }
        ]
      },
      {
        roundNumber: 2,
        matches: [
          { team1: teams[0], team2: teams[2], played: false },
          { team1: teams[1], team2: teams[3], played: false }
        ]
      },
      {
        roundNumber: 3,
        matches: [
          { team1: teams[0], team2: teams[3], played: false },
          { team1: teams[1], team2: teams[2], played: false }
        ]
      }
    ];
    
    return rounds;
  }

  

  

  

  

  // ============================================
  // HANDLERS DE BATALHA - SISTEMA UNIFICADO
  // ============================================
  // IMPORTANTE: Estas funções servem TANTO para modo exibição quanto universo
  // São o MESMO sistema de batalha - não há separação
  // ============================================
  
  // Chamado quando uma batalha termina (ambos os modos)
  function handleBattleEnd(result) {
    if (!result || !result.winner || !currentMatchBeys || !currentMatchBeys[0] || !currentMatchBeys[1]) {
      setScreen('HUB');
      return;
    }
    
    if (!md3State) {
      setScreen('HUB');
      return;
    }
    
    // Add winner icon to result
    // ★★★ CORREÇÃO DEFINITIVA: Comparar por NOME (igual a tela de WINNER) ★★★
    const winnerName = result.winner.name;
    const team1Name = md3State.team1.name;
    const winnerIsTeam1 = winnerName === team1Name;
    const winnerTeam = winnerIsTeam1 ? currentMatchBeys[0] : currentMatchBeys[1];
    result.winnerIcon = winnerTeam?.team?.customIcon || winnerTeam?.customIcon;
    
    // Add both team icons for replay screen
    result.team1Icon = currentMatchBeys[0]?.team?.customIcon || currentMatchBeys[0]?.customIcon;
    result.team2Icon = currentMatchBeys[1]?.team?.customIcon || currentMatchBeys[1]?.customIcon;
    
    // Add round number to result
    result.roundNumber = md3State.currentRound;
    
    setBattleResult(result);
    
    // ★ CORREÇÃO: Respeitar configuração de skip replay
    // Se skipReplay estiver ativo, pula direto para POST (mesma lógica do Exhibition)
    if (settings.skipReplay) {
      // 🔧 FIX RACE CONDITION: Passar result diretamente ao invés de depender do estado
      // battleResult pode não ter sido atualizado ainda (setState é assíncrono!)
      handleReplayEnd(result);
    } else {
      // Modo normal: mostrar replay
      setScreen('REPLAY');
    }
  }

  function handleReplayEnd(resultOverride = null) {
    // 🔧 FIX RACE CONDITION: Usar resultOverride se fornecido (skipReplay)
    // Caso contrário usar battleResult (replay normal)
    const currentResult = resultOverride || battleResult;
    
    if (!currentResult || !md3State || !currentMatchBeys || !currentMatchBeys[0] || !currentMatchBeys[1]) {
      setScreen('HOME');
      return;
    }
    
    // Update MD3 state
    const newMd3State = { ...md3State };
    
    // Check if it was a Draw
    const isDraw = currentResult.method && currentResult.method.includes('Draw');
    
    if (!isDraw) {
      // ★★★ CORREÇÃO DEFINITIVA: Comparar por NOME (igual a tela de WINNER) ★★★
      // Nomes são únicos por player e NÃO mudam (diferente de IDs que têm _pos0, _pos1...)
      const winnerName = currentResult.winner.name;
      const team1Name = md3State.team1.name;
      const team2Name = md3State.team2.name;
      
      const winnerIsTeam1 = winnerName === team1Name;
      
      // 🔍 DEBUG LOGGING
      console.log('🔍 ROUND WINNER DETERMINATION:');
      console.log('  Winner Name:', winnerName);
      console.log('  Team1 Name:', team1Name);
      console.log('  Team2 Name:', team2Name);
      console.log('  Winner Is Team1?', winnerIsTeam1);
      console.log('  Current Score Before:', `${md3State.team1Wins}-${md3State.team2Wins}`);
      
      // Mark both blades as used
      if (currentMatchBeys[0]?.bey) {
        newMd3State.team1UsedBlades = [...(newMd3State.team1UsedBlades || []), currentMatchBeys[0].bey];
      }
      if (currentMatchBeys[1]?.bey) {
        newMd3State.team2UsedBlades = [...(newMd3State.team2UsedBlades || []), currentMatchBeys[1].bey];
      }
      
      if (winnerIsTeam1) {
        newMd3State.team1Wins++;
        console.log(`  ✅ ${team1Name} wins! Score: ${newMd3State.team1Wins}-${newMd3State.team2Wins}`);
      } else {
        newMd3State.team2Wins++;
        console.log(`  ✅ ${team2Name} wins! Score: ${newMd3State.team1Wins}-${newMd3State.team2Wins}`);
      }
    } else {
      // Draw - mark blades as used but no one gets a point
      // Round will be replayed
      if (currentMatchBeys[0]?.bey) {
        newMd3State.team1UsedBlades = [...(newMd3State.team1UsedBlades || []), currentMatchBeys[0].bey];
      }
      if (currentMatchBeys[1]?.bey) {
        newMd3State.team2UsedBlades = [...(newMd3State.team2UsedBlades || []), currentMatchBeys[1].bey];
      }
    }
    
    // Add to history
    // CORREÇÃO: Verificar se currentResult.winner existe
    newMd3State.matchHistory = [...(newMd3State.matchHistory || []), {
      round: newMd3State.currentRound,
      team1Bey: currentMatchBeys[0]?.bey,
      team2Bey: currentMatchBeys[1]?.bey,
      winner: (isDraw || !currentResult.winner) ? 'DRAW' : currentResult.winner,
      method: currentResult.method,
      launch1: newMd3State.launch1 || 'STANDARD',
      launch2: newMd3State.launch2 || 'STANDARD'
    }];
    
    setMd3State(newMd3State);
    setScreen('POST');
  }

  function handleContinue() {
    // 🔍 DEBUG: Verificar estados antes de determinar mode
    console.log('🎯 HANDLE CONTINUE:');
    console.log('   universeCurrentMatch:', universeCurrentMatch ? universeCurrentMatch.matchId : 'NULL');
    console.log('   exhibitionConfig:', exhibitionConfig ? 'DEFINIDO' : 'NULL');
    console.log('   md3State:', md3State ? `Round ${md3State.currentRound}, Score ${md3State.team1Wins}-${md3State.team2Wins}` : 'NULL');
    
    // Determinar o modo baseado nos estados
    const mode = universeCurrentMatch ? 'universe' : exhibitionConfig ? 'exhibition' : null;
    console.log('   MODE DETERMINADO:', mode);
    
    if (!md3State) {
      console.error('❌ md3State está NULL! Isso não deveria acontecer em meio a uma série.');
      if (mode === 'exhibition') {
        setScreen('HOME');
      } else if (mode === 'universe') {
        console.log('   🔧 CORREÇÃO: Voltando para bracket ao invés de HOME');
        setScreen('UNIVERSE_BRACKET');
      } else {
        console.error('   ⚠️ Mode é NULL - universeCurrentMatch foi perdido!');
        console.error('   🔧 CORREÇÃO: Forçando volta para BROADCAST_HUB ao invés de HOME');
        setScreen('BROADCAST_HUB');
      }
      return;
    }
    
    // Check if last result was a Draw
    const isDraw = battleResult?.method && battleResult.method.includes('Draw');
    
    if (isDraw) {
      // Replay the round - don't increment round number
      continueUniverseMD3(true); // Pass true to indicate it's a replay
      return;
    }
    
    // For MD1, end after first battle
    if (md3State.format === 'MD1') {
      if (mode === 'universe') {
        console.log('   → MD1 Universe: Chamando handleUniverseMatchEnd');
        handleUniverseMatchEnd();
      } else {
        setScreen('HOME');
      }
      return;
    }
    
    // Check if match is over based on format
    // ★ CORRIGIDO: Suporta qualquer formato (MD3, MD5, MD7, etc.)
    const matchFormatNumber = parseInt(md3State.format.replace('MD', '')) || 3;
    const winsNeeded = Math.ceil(matchFormatNumber / 2);
    
    console.log(`   🔍 Verificando se série terminou:`);
    console.log(`      Format: ${md3State.format}, Wins Needed: ${winsNeeded}`);
    console.log(`      Current Score: ${md3State.team1Wins}-${md3State.team2Wins}`);
    
    if (md3State.team1Wins === winsNeeded || md3State.team2Wins === winsNeeded) {
      console.log('   ✅ SÉRIE COMPLETA! Partida terminou.');
      if (mode === 'exhibition') {
        console.log('   → Modo Exhibition: Voltando para HOME');
        setScreen('HOME');
      } else if (mode === 'universe') {
        console.log('   → Modo Universe: Chamando handleUniverseMatchEnd');
        handleUniverseMatchEnd();
      } else {
        console.error('   ❌ Mode é NULL quando série terminou!');
        console.error('   🔧 CORREÇÃO: Forçando volta para BROADCAST_HUB');
        setScreen('BROADCAST_HUB');
      }
      return;
    }
    
    console.log('   ⏭️ Série continua - indo para próximo round');
    // MD3 continues - select next Beyblades
    continueUniverseMD3(false);
  }

  function continueUniverseMD3(isReplay = false) {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('⏭️ CONTINUE UNIVERSE MD3');
    console.log('   isReplay:', isReplay);
    console.log('   universeCurrentMatch:', universeCurrentMatch ? universeCurrentMatch.matchId : 'NULL');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    if (!md3State.team1 || !md3State.team2) {
      console.error('❌ ERRO: md3State.team1 ou team2 é NULL!');
      console.error('   🔧 CORREÇÃO: Voltando para BROADCAST_HUB ao invés de HOME');
      setScreen('BROADCAST_HUB');
      return;
    }
    
    const newMd3State = { ...md3State };
    
    if (!isReplay) {
      newMd3State.currentRound++;
    }
    
    const team1Available = (md3State.team1.deck || []).filter(
      bey => !(md3State.team1UsedBlades || []).some(used => used?.deckPosition === bey?.deckPosition)
    );
    const team2Available = (md3State.team2.deck || []).filter(
      bey => !(md3State.team2UsedBlades || []).some(used => used?.deckPosition === bey?.deckPosition)
    );
    
    // 🔍 DEBUG: Verificar decks disponíveis
    console.log('🔍 PREPARE NEXT ROUND:');
    console.log('  Team1:', md3State.team1.name);
    console.log('  Team1 Full Deck:', md3State.team1.deck?.map(b => b.name));
    console.log('  Team1 Used:', md3State.team1UsedBlades?.map(b => b.name));
    console.log('  Team1 Available:', team1Available.map(b => b.name));
    console.log('  Team2:', md3State.team2.name);
    console.log('  Team2 Full Deck:', md3State.team2.deck?.map(b => b.name));
    console.log('  Team2 Used:', md3State.team2UsedBlades?.map(b => b.name));
    console.log('  Team2 Available:', team2Available.map(b => b.name));
    
    if (team1Available.length === 0 || team2Available.length === 0) {
      console.error('❌ ERRO: Nenhum beyblade disponível!');
      console.error('   Team1 Available:', team1Available.length);
      console.error('   Team2 Available:', team2Available.length);
      console.error('   🔧 CORREÇÃO: Voltando para BROADCAST_HUB ao invés de HOME');
      setScreen('BROADCAST_HUB');
      return;
    }
    
    const lastRound = (md3State.matchHistory || [])[md3State.matchHistory.length - 1];
    if (!lastRound) {
      console.error('❌ ERRO: lastRound é NULL!');
      console.error('   🔧 CORREÇÃO: Voltando para BROADCAST_HUB ao invés de HOME');
      setScreen('BROADCAST_HUB');
      return;
    }
    
    // 🔧 CORREÇÃO: Verificar se winner existe antes de acessar .id (sem _pos)
    const isDraw = lastRound.winner === 'DRAW' || !lastRound.winner;
    const team1LastResult = isDraw ? 'draw' : 
                            (idsMatch(lastRound.winner?.id, lastRound.team1Bey?.id) ? 'win' : 'loss');
    const team2LastResult = isDraw ? 'draw' :
                            (idsMatch(lastRound.winner?.id, lastRound.team2Bey?.id) ? 'win' : 'loss');
    
    const currentArena = md3State.arenaOrder ? md3State.arenaOrder[newMd3State.currentRound - 1] : 'BB-10 Competitive';

    // ⚔️ Contexto de série para o sistema de personalidade do Signature Blade
    const formatNum = parseInt((md3State.format || 'MD3').replace('MD', '')) || 3;
    const winsNeededCtx = Math.ceil(formatNum / 2);
    const nextRound = newMd3State.currentRound;

    const team1SeriesCtx = {
      currentRound: nextRound,
      myWins:       newMd3State.team1Wins,
      opponentWins: newMd3State.team2Wins,
      winsNeeded:   winsNeededCtx,
      mentality:    md3State.team1?.mentality || 'ALL_ROUNDER'
    };
    const team2SeriesCtx = {
      currentRound: nextRound,
      myWins:       newMd3State.team2Wins,
      opponentWins: newMd3State.team1Wins,
      winsNeeded:   winsNeededCtx,
      mentality:    md3State.team2?.mentality || 'ALL_ROUNDER'
    };

    const team1Bey = selectBeybladeStrategically(
      team1Available,
      lastRound.team2Bey,
      currentArena,
      team1LastResult,
      team1SeriesCtx
    );
    const team2Bey = selectBeybladeStrategically(
      team2Available,
      lastRound.team1Bey,
      currentArena,
      team2LastResult,
      team2SeriesCtx
    );
    
    if (!team1Bey || !team2Bey) {
      setScreen('HOME');
      return;
    }
    
    const launch1 = selectLaunchTechnique(team1Bey.type, team2Bey.type, team2Bey.rotation, team1Bey.rotation, currentArena);
    const launch2 = selectLaunchTechnique(team2Bey.type, team1Bey.type, team1Bey.rotation, team2Bey.rotation, currentArena);
    
    newMd3State.launch1 = launch1;
    newMd3State.launch2 = launch2;
    
    setMd3State(newMd3State);
    setCurrentMatchBeys([
      { ...md3State.team1, bey: team1Bey },
      { ...md3State.team2, bey: team2Bey }
    ]);
    
    // ✅ CORREÇÃO: Respeitar configuração skipPreBattle
    if (settings.skipPreBattle) {
      console.log('⏭️ Pulando PreBattle - indo direto para BATTLE');
      setScreen('BATTLE');
    } else {
      console.log('📋 Mostrando PreBattle Analysis');
      setScreen('SELECTION');
    }
  }

  // Universe Mode handlers
  const handleStartUniverse = () => {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🌍 HANDLE START UNIVERSE');
    console.log(`   bracketInitialized: ${universeManager.bracketInitialized}`);
    console.log(`   currentBracket exists: ${universeManager.currentBracket !== null}`);
    
    // 🎯 Se é a primeira vez, inicializar o primeiro bracket automaticamente
    if (!universeManager.bracketInitialized) {
      console.log('🎯 Primeira vez no Universe Mode - inicializando primeiro bracket...');
      universeManager.initializeFirstBracket();
      console.log('✅ Primeiro bracket criado!');
    } else {
      console.log('✅ Bracket já inicializado - mantendo progresso');
    }
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    setScreen('BROADCAST_HUB');
  };

  const handleUniverseSelectTournament = (tournamentIndex) => {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎮 HANDLE UNIVERSE SELECT TOURNAMENT');
    console.log(`   tournamentIndex: ${tournamentIndex}`);
    console.log(`   bracketInProgress: ${universeManager.bracketInProgress}`);
    console.log(`   currentBracket exists: ${universeManager.currentBracket !== null}`);
    
    // 🎯 Se já existe bracket em progresso, apenas ir para a tela do bracket
    if (universeManager.bracketInProgress && universeManager.currentBracket !== null) {
      console.log('✅ Bracket já existe - retomando torneio em progresso');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      setScreen('UNIVERSE_BRACKET');
      return;
    }
    
    // 🔒 VALIDAÇÃO: Verificar se este torneio é o próximo disponível
    const nextTournamentData = universeManager.getNextAvailableTournament();
    
    if (!nextTournamentData) {
      console.error('❌ Nenhum torneio disponível!');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      return;
    }
    
    // Validar se o índice passado corresponde ao próximo torneio
    const expectedIndex = nextTournamentData.index;
    const expectedMonth = nextTournamentData.month;
    const expectedYear = nextTournamentData.year;
    
    if (tournamentIndex !== expectedIndex || 
        universeManager.currentMonth !== expectedMonth ||
        universeManager.currentYear !== expectedYear) {
      console.error('❌ Tentativa de iniciar torneio fora de ordem bloqueada!');
      console.error(`   Esperado: ${expectedYear}-${expectedMonth}-${expectedIndex}`);
      console.error(`   Recebido: ${universeManager.currentYear}-${universeManager.currentMonth}-${tournamentIndex}`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      return;
    }
    
    // Se passou na validação, iniciar o torneio
    // REMOVIDO: universeManager.currentTournamentIndex = tournamentIndex;
    // O índice será gerenciado internamente pelo startTournament()
    
    // Capturar snapshot do ranking se for primeiro torneio do mês
    if (tournamentIndex === 0 && !universeManager.monthRankingSnapshot) {
      universeManager.captureMonthRankingSnapshot();
    }
    
    console.log(`🎮 Iniciando torneio: ${nextTournamentData.tournament.name}`);
    universeManager.startTournament(tournamentIndex);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    setScreen('UNIVERSE_BRACKET');
  };

  const handleUniversePlayMatch = (match) => {
    const tournament = universeManager.getCurrentTournament();
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎮 HANDLE UNIVERSE PLAY MATCH');
    console.log('   Match ID:', match.matchId);
    console.log('   Player 1:', match.player1.name);
    console.log('   Player 2:', match.player2.name);
    console.log('   🏟️  Arena do Match:', match.arena);
    console.log('   🏟️  Arena do Tournament:', tournament.arena);
    console.log('   🏟️  Tipo do Tournament:', tournament.type);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    setUniverseCurrentMatch(match);
    console.log('   ✅ universeCurrentMatch definido!');
    
    // Mapear nomes de arenas para IDs do sistema
    const arenaNameToId = {
      'BB-10': 'BB10_COMPETITIVE',
      'BB-10 Competitive': 'BB10_COMPETITIVE',
      'BB10_COMPETITIVE': 'BB10_COMPETITIVE',
      'Prismatic Nexus': 'NEXUS', 'Prismatic Portal': 'NEXUS',
      'NEXUS': 'NEXUS',
      'Colosseum Carnage': 'COLOSSEUM_CARNAGE', 'Carnage Colosseum': 'COLOSSEUM_CARNAGE',
      'COLOSSEUM_CARNAGE': 'COLOSSEUM_CARNAGE',
      'Volcanic Rage': 'VOLCANIC_RAGE',
      'VOLCANIC_RAGE': 'VOLCANIC_RAGE',
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
      'DOMINATION_ZONES': 'DOMINATION_ZONES'
    };
    
    let arenaRotation;
    const format = tournament.matchFormat; // 'MD3' ou 'MD5'
    const roundsNeeded = parseInt(format.replace('MD', '')) || 3;
    
    // CalendarConfig usa 'arenas' (array ou 'ALL'), nunca 'arena' (singular)
    const tArenas = tournament.arenas; // array de nomes ou 'ALL'
    const isAllArenas = !tArenas || tArenas === 'ALL' || tournament.type === 'GRAND_SLAM';

    if (isAllArenas) {
      // 🎲 TORNEIOS HÍBRIDOS (ALL / Grand Slam): cada round numa arena diferente
      console.log('🏟️  Torneio HÍBRIDO detectado - sorteando arenas únicas por round');
      const allArenas = ['BB10_COMPETITIVE', 'NEXUS', 'COLOSSEUM_CARNAGE', 'VOLCANIC_RAGE', 'VORTEX_COLISEUM', 'PINBALL_INFERNO', 'PANGEA_PLATFORM', 'KILLER_SIDES', 'STORM_TRACK', 'TIDAL_SURGE'];
      const shuffled = [...allArenas].sort(() => Math.random() - 0.5);
      arenaRotation = shuffled.slice(0, roundsNeeded);
      console.log(`🏟️  Arenas sorteadas (${roundsNeeded} rounds, SEM REPETIÇÃO):`, arenaRotation);
    } else if (match.arena) {
      // 🏟️ ARENA ESPECÍFICA DO MATCH (do bracket)
      console.log(`🏟️  Usando arena do match: ${match.arena}`);
      const matchArenaId = arenaNameToId[match.arena] || match.arena;
      arenaRotation = Array(roundsNeeded).fill(matchArenaId);
      console.log(`🏟️  Arena fixa para ${roundsNeeded} rounds:`, arenaRotation);
    } else {
      // 🏟️ ARENAS FIXAS DO TORNEIO (Masters etc.)
      const fixedArenas = Array.isArray(tArenas) ? tArenas : [tArenas];
      console.log(`🏟️  Usando arenas fixas do torneio:`, fixedArenas);
      arenaRotation = Array.from({ length: roundsNeeded }, (_, i) => {
        const raw = fixedArenas[i % fixedArenas.length];
        return arenaNameToId[raw] || raw || 'BB10_COMPETITIVE';
      });
      console.log(`🏟️  Arena rotation final:`, arenaRotation);
    }
    
    console.log('🏟️  Arena Rotation final:', arenaRotation);
    
    /* SISTEMA ANTIGO - REMOVIDO
    // NOVO SISTEMA: Configurar série completa
    setSeriesState({
      format: format,
      blader1: match.player1,
      blader2: match.player2,
      arenas: arenaRotation,
      matchId: match.matchId
    });
    
    // Resetar estados da série
    setSeriesPhase('PREVIEW');
    setSeriesCurrentRound(1);
    setSeriesScore({ blader1: 0, blader2: 0 });
    setSeriesUsedBeys({ blader1: [], blader2: [] });
    setSeriesRoundResults([]);
    setSeriesTransitionCountdown(3);
    setSeriesBattleInProgress(false);
    */
    
    // ─── Arena Pick (Premier & Kings Court) ───
    let arenaPickInfo = null;
    if (isTournamentEligibleForPick(tournament)) {
      const rankings = universeManager.getBBPRanking();
      const p1 = match.player1;
      const p2 = match.player2;
      const p1Rank = rankings.findIndex(r => r.playerId === p1.id) + 1 || 999;
      const p2Rank = rankings.findIndex(r => r.playerId === p2.id) + 1 || 999;
      const higher = p1Rank <= p2Rank ? p1 : p2;
      const lower  = p1Rank <= p2Rank ? p2 : p1;
      const pickResult = resolveArenaPicks(higher, lower, format);
      arenaRotation  = pickResult.arenas;
      arenaPickInfo  = pickResult.picks; // [{round, picker, arena, reason}]
    }

    // Manter md3State para compatibilidade com sistema existente
    setMd3State({
      team1: match.player1,
      team2: match.player2,
      matchFormat: tournament.matchFormat,
      format: tournament.matchFormat,
      currentRound: 1,
      totalRounds: parseInt(tournament.matchFormat.replace('MD', '')) || 3,
      team1Wins: 0,
      team2Wins: 0,
      team1UsedBlades: [],
      team2UsedBlades: [],
      matchHistory: [],
      roundWinners: [],
      arenaOrder: arenaRotation,
      arenaPickInfo,          // null se não for Premier/KC, array de picks caso contrário
      signatureOnly: match.player1._signatureOnly || tournament.tier === 'SIGNATURE_CLASH',
      launch1: 'STANDARD', // será substituído abaixo após selecionar os beys do round 1
      launch2: 'STANDARD'
    });
    
    // ⚔️ Round 1: Selecionar blade pelo sistema de personalidade do Signature
    const round1Arena = arenaRotation[0];
    const winsNeeded = Math.ceil(parseInt(format.replace('MD', '')) / 2) || 2;

    const team1R1Ctx = {
      currentRound: 1, myWins: 0, opponentWins: 0,
      winsNeeded,
      mentality: match.player1.mentality || 'ALL_ROUNDER'
    };
    const team2R1Ctx = {
      currentRound: 1, myWins: 0, opponentWins: 0,
      winsNeeded,
      mentality: match.player2.mentality || 'ALL_ROUNDER'
    };

    // Signature Clash: deck já tem só a Signature Blade (forçado em createSignatureClashBracket)
    // selectBeybladeStrategically naturalmente escolhe o único bey disponível
    const team1R1Bey = selectBeybladeStrategically(
      match.player1.deck || [], null, round1Arena, null, team1R1Ctx
    );
    const team2R1Bey = selectBeybladeStrategically(
      match.player2.deck || [], null, round1Arena, null, team2R1Ctx
    );

    // ✅ FIX: calcular launch real do round 1 usando os beys selecionados
    // Antes era hardcoded 'STANDARD', agora usa selectLaunchTechnique igual aos rounds seguintes
    const r1Launch1 = selectLaunchTechnique(
      team1R1Bey?.type, team2R1Bey?.type, team2R1Bey?.rotation, team1R1Bey?.rotation, round1Arena
    );
    const r1Launch2 = selectLaunchTechnique(
      team2R1Bey?.type, team1R1Bey?.type, team1R1Bey?.rotation, team2R1Bey?.rotation, round1Arena
    );
    setMd3State(prev => ({ ...prev, launch1: r1Launch1, launch2: r1Launch2 }));

    setCurrentMatchBeys([
      { ...match.player1, bey: team1R1Bey || match.player1.deck[0] },
      { ...match.player2, bey: team2R1Bey || match.player2.deck[0] }
    ]);
    
    // ===== SISTEMA UNIFICADO =====
    // Modo universo e modo exibição agora usam a MESMA tela pré-jogo
    // Ambos passam por: PreBattleScreen -> BattleArena
    // ✅ CORREÇÃO: Respeitar configuração skipPreBattle
    if (settings.skipPreBattle) {
      console.log('⏭️ Pulando PreBattle - indo direto para BATTLE');
      setScreen('BATTLE');
    } else {
      console.log('📋 Mostrando PreBattle Analysis');
      setScreen('SELECTION'); // SELECTION = Tela pré-jogo (PreBattleScreen)
    }
  };

  const handleUniverseMatchEnd = () => {
    if (!universeCurrentMatch) return;
    
    const md3Result = md3State.team1Wins > md3State.team2Wins ? universeCurrentMatch.player1.id : universeCurrentMatch.player2.id;
    
    // 🔍 DEBUG LOGGING
    console.log('🏆 MATCH END - DETERMINING WINNER:');
    console.log('  Player1:', universeCurrentMatch.player1.name, 'ID:', universeCurrentMatch.player1.id);
    console.log('  Player2:', universeCurrentMatch.player2.name, 'ID:', universeCurrentMatch.player2.id);
    console.log('  Final Score:', `${md3State.team1Wins}-${md3State.team2Wins}`);
    console.log('  Winner ID:', md3Result);
    console.log('  Winner Name:', md3Result === universeCurrentMatch.player1.id ? universeCurrentMatch.player1.name : universeCurrentMatch.player2.name);

    // ✅ FIX: Construir matchDetails a partir do histórico de rounds do md3State
    // Sem isso, logMatch() usa allFinishes: ['SPIN_FINISH'] para TODO o match (MD1 behavior)
    const roundsData = (md3State.matchHistory || []).map(r => {
      if (r.winner === 'DRAW' || !r.winner) {
        return { 
          winner: 'DRAW', 
          method: r.method || 'SPIN_FINISH',
          // 🎯 Mapear team1Bey/team2Bey para bey1/bey2 (convenção usada no UniverseManager)
          bey1: r.team1Bey,
          bey2: r.team2Bey,
          launch1: r.launch1 || 'STANDARD',
          launch2: r.launch2 || 'STANDARD'
        };
      }
      // 🔧 FIX: Armazenar ID do jogador (não nome do bey/jogador) para que o modal
      // consiga identificar corretamente o vencedor de cada round via idsMatch().
      // r.winner pode ser: objeto bey (com .name = nome do bey), objeto jogador
      // (com .name = nome do jogador), ou string com nome.
      // Estratégia: comparar nome do vencedor com team1.name para determinar o ID.
      const winnerName = typeof r.winner === 'string' ? r.winner : (r.winner?.name || '');
      const team1Name = md3State.team1?.name || '';
      const winnerIsTeam1 = winnerName === team1Name || 
                            idsMatch(r.winner?.id, universeCurrentMatch.player1?.id);
      return {
        winner: winnerIsTeam1 ? universeCurrentMatch.player1.id : universeCurrentMatch.player2.id,
        method: r.method || 'SPIN_FINISH',
        // 🎯 NOVO: Preservar beyblades para análise de Signature Blade
        bey1: r.team1Bey,
        bey2: r.team2Bey,
        launch1: r.launch1 || 'STANDARD',
        launch2: r.launch2 || 'STANDARD'
      };
    });

    // Derivar allFinishes dos rounds reais (exclui DRAWs que não contam ponto)
    const allFinishes = roundsData
      .filter(r => r.winner !== 'DRAW')
      .map(r => r.method);

    const matchDetails = {
      score: {
        playerA: md3State.team1Wins,
        playerB: md3State.team2Wins
      },
      rounds: roundsData,
      format: md3State.format || 'MD3',
      allFinishes: allFinishes.length > 0 ? allFinishes : undefined,
      finishType: allFinishes[allFinishes.length - 1] || 'SPIN_FINISH',
      duration: 0
    };

    console.log('  MatchDetails rounds:', roundsData.length, '| allFinishes:', allFinishes);
    
    universeManager.recordMatchWinner(universeCurrentMatch.matchId, md3Result, matchDetails);
    
    const advanceResult = universeManager.advanceRound();
    
    // ✅ NOVO: Verificar auto-play queue
    if (autoPlayQueue && autoPlayQueue.matches.length > 0) {
      const currentIndex = autoPlayQueue.currentIndex || 0;
      const nextIndex = currentIndex + 1;
      
      console.log(`🚀 AUTO-PLAY: Partida ${currentIndex + 1}/${autoPlayQueue.matches.length} concluída`);
      
      // Se ainda há partidas na fila
      if (nextIndex < autoPlayQueue.matches.length) {
        const nextMatch = autoPlayQueue.matches[nextIndex];
        console.log(`   ⏭️ Iniciando próxima partida: ${nextMatch.player1?.name} vs ${nextMatch.player2?.name}`);
        
        // Atualizar índice da fila
        setAutoPlayQueue({
          ...autoPlayQueue,
          currentIndex: nextIndex
        });
        
        // Pequeno delay para UI atualizar, depois inicia próxima partida
        setTimeout(() => {
          handleUniversePlayMatch(nextMatch);
        }, 300);
        
        return; // Não vai para UNIVERSE_BRACKET, vai direto para próxima partida
      } else {
        // Fila completada!
        console.log('✅ AUTO-PLAY COMPLETO! Todas as partidas da fase foram processadas.');
        
        // Limpar fila e desativar turbo
        setAutoPlayQueue(null);
        setTurboMode(false);
        
        // Avançar para próxima fase se necessário
        if (universeManager.advanceToNextPhase) {
          universeManager.advanceToNextPhase();
        }
      }
    }
    
    if (typeof advanceResult === 'object' && advanceResult !== null) {
      setUniverseChampion(advanceResult);
      setShowTournamentRecap(true);
      setScreen('TOURNAMENT_RECAP');
    } else {
      setUniverseCurrentMatch(null);
      setScreen('UNIVERSE_BRACKET');
    }
  };

  // ============================================
  // HANDLERS DO NOVO SISTEMA DE SÉRIES MD3/MD5
  // ============================================
  

  const handleUniverseChampionContinue = () => {
    // 🔧 NÃO limpar universeChampion aqui - a tela de recap precisa dele!
    // setUniverseChampion(null);
    
    // Mostra o Tournament Recap
    setShowTournamentRecap(true);
    setScreen('TOURNAMENT_RECAP');
  };
  
  const handleTournamentRecapContinue = () => {
    setShowTournamentRecap(false);
    
    // 🔧 LIMPAR universeChampion AQUI, depois do recap
    setUniverseChampion(null);
    
    // 🔑 CORRIGIDO: usar pendingSeasonRecap (setado UMA VEZ em finalizeSeasonTransition)
    // A lógica antiga usava tournamentHistory.keys() que sempre tem chaves do ano anterior,
    // fazendo o Season Recap aparecer TODA VEZ que um torneio de Janeiro terminava.
    if (universeManager.pendingSeasonRecap) {
      // Consumir a flag imediatamente — garante que só aparece UMA vez
      universeManager.pendingSeasonRecap = false;

      // Capturar aposentadorias pendentes antes da cerimônia
      const pendingRets = universeManager.pendingRetirementAnnouncements || [];
      if (pendingRets.length > 0) {
        setPendingRetirements([...pendingRets]);
      }

      // Mostrar Season Recap do ano recém-encerrado
      universeManager.seasonRecapYear = universeManager.currentYear - 1;
      setShowSeasonRecap(true);
      setScreen('SEASON_RECAP');
      return;
    }
    
    // Voltar ao Hub
    setUniverseChampion(null);
    setUniverseCurrentMatch(null);
    setScreen('BROADCAST_HUB');
  };
  
  const handleSeasonRecapContinue = () => {
    setShowSeasonRecap(false);
    universeManager.seasonRecapYear = null; // Limpar o ano de recap salvo
    setUniverseChampion(null);
    setUniverseCurrentMatch(null);
    setScreen('BROADCAST_HUB');
  };
  
  const handleTournamentRecapViewBracket = () => {
    setShowTournamentRecap(false);
    setScreen('UNIVERSE_BRACKET'); // Vai direto para o bracket
  };


  const handleRecallTournament = (monthId) => {
    const tournament = universeManager.getTournamentHistory(universeManager.currentYear, monthId);
    if (tournament) {
      setUniverseViewingTournament(tournament);
      setScreen('UNIVERSE_HISTORY');
    }
  };

  if (screen === 'HOME' || screen === 'MENU') {
    return (
      <>
        <MenuScreen 
          onStartUniverse={handleStartUniverse}
          onStartExhibition={() => setScreen('EXHIBITION_SETUP')}
          onShowProfiles={() => setScreen('PLAYER_PROFILES')}
          onShowSettings={() => setScreen('SETTINGS')}
          onSimTest={() => setScreen('SIM_TEST')}
        />
        {/* ⚡ BOTÃO TURBO */}
        <button
          onClick={() => setTurboMode(prev => !prev)}
          className={[
            'fixed bottom-6 right-6 z-50',
            'px-5 py-3 rounded-xl',
            'font-black text-lg',
            'shadow-2xl border-2',
            'transition-all duration-200 hover:scale-105',
            turboMode
              ? 'bg-yellow-400 text-black border-yellow-300'
              : 'bg-gray-800 text-gray-400 border-gray-600 hover:border-yellow-500 hover:text-yellow-400'
          ].join(' ')}
          title={turboMode ? 'Turbo ON — clique para desligar' : 'Turbo OFF — clique para ligar'}
        >
          {turboMode ? '⚡ TURBO ON' : '⚡ TURBO OFF'}
        </button>
        {currentBreakingNews && (
          <BreakingNews 
            event={currentBreakingNews}
            onDismiss={dismissBreakingNews}
            onAction={handleBreakingNewsAction}
          />
        )}
      </>
    );
  }
  
  if (screen === 'PLAYER_PROFILES') {
    return <PlayerProfileScreen onBack={() => setScreen('HOME')} />;
  }
  
  if (screen === 'SETTINGS') {
    return <SettingsScreen onBack={() => setScreen('HOME')} />;
  }

  if (screen === 'SIM_TEST') {
    return <SimTestScreen onBack={() => setScreen('HOME')} />;
  }
  
  if (screen === 'EXHIBITION_SETUP') {
    return <ExhibitionSetup
      onStartBattle={(config) => {
        setExhibitionConfig(config);
        initExhibition(config);
      }}
      onBack={() => setScreen('HOME')}
    />;
  }
  
  // ============================================
  // RENDERIZAÇÕES DO NOVO SISTEMA DE SÉRIES
  // ============================================
  
  // ===== SISTEMA UNIFICADO =====
  // SERIES PREVIEW foi substituído por PreBattleScreen (SELECTION)
  // Ambos os modos (universo e exibição) agora usam a MESMA tela pré-jogo
  
  // ============================================
  // SISTEMA DE BATALHA UNIFICADO
  // ============================================
  // IMPORTANTE: Modo Exibição e Modo Universo usam as MESMAS telas
  // Não há separação - é o MESMO JOGO com funcionalidades adicionais no universo
  // Qualquer mudança aqui afeta AMBOS os modos igualmente
  // 
  // Fluxo: SELECTION (PreBattleScreen) -> BATTLE (BattleArena) -> REPLAY (opcional)
  // ============================================
  
  // TELA PRÉ-JOGO - Análise Tática + Lançamento
  // Usada por: Modo Exibição E Modo Universo
  if (screen === 'SELECTION' && currentMatchBeys && currentMatchBeys[0] && currentMatchBeys[1]) {
    return (
      <TurboProvider turboEnabled={turboMode}>
        <PreBattleScreen 
          team1={currentMatchBeys[0]} 
          team2={currentMatchBeys[1]} 
          bey1={currentMatchBeys[0]?.bey} 
          bey2={currentMatchBeys[1]?.bey}
          md3State={md3State}
          onComplete={() => setScreen('BATTLE')} 
        />
      </TurboProvider>
    );
  }
  
  // TELA DE BATALHA - Arena de Combate
  // Usada por: Modo Exibição E Modo Universo
  if (screen === 'BATTLE' && currentMatchBeys && currentMatchBeys[0] && currentMatchBeys[1]) {
    return (
      <TurboProvider turboEnabled={turboMode}>
        <BattleArena 
          bey1={currentMatchBeys[0]?.bey} 
          bey2={currentMatchBeys[1]?.bey} 
          onEnd={handleBattleEnd}
          md3State={md3State}
        />
      </TurboProvider>
    );
  }
  
  // TELA DE REPLAY - Repetição da Batalha
  // Usada por: Modo Exibição E Modo Universo
  if (screen === 'REPLAY' && battleResult) {
    return (
      <TurboProvider turboEnabled={turboMode}>
        <ReplayScreen 
          result={battleResult} 
          onContinue={handleReplayEnd}
        />
      </TurboProvider>
    );
  }
  
  // ===== TOURNAMENT OPENING CEREMONY =====
  if (screen === 'TOURNAMENT_OPENING') {
    const currentTournament = universeManager.getCurrentTournament();
    if (!currentTournament) {
      setScreen('BROADCAST_HUB');
      return null;
    }
    
    // Get participants for the tournament
    const participants = universeManager.getParticipantsForTournament(currentTournament);
    
    return <TournamentOpening 
      universeManager={universeManager}
      tournament={currentTournament}
      participants={participants}
      onComplete={() => {
        setScreen('UNIVERSE_BRACKET');
      }}
    />;
  }
  
  // ===== FASE 1: BROADCAST HUB (substitui UNIVERSE_CALENDAR) =====
  if (screen === 'BROADCAST_HUB' || screen === 'UNIVERSE_CALENDAR') {
    return <BroadcastHub 
      universeManager={universeManager}
      onLoadComplete={() => setAppRefreshKey(k => k + 1)}
      onNavigate={(newScreen, playerId) => {
        // Se clicar em um jogador, abre o perfil dele
        if (newScreen === 'PLAYER_PROFILE' && playerId !== undefined) {
          setSelectedPlayerId(playerId);
          setScreen('UNIVERSE_PLAYER_PROFILE');
        } else {
          setScreen(newScreen);
        }
      }}
      onStartTournament={(tournamentIndex, showOpening = false) => {
        handleUniverseSelectTournament(tournamentIndex);
        // Se showOpening=true, vai para Opening Ceremony, senão vai direto para Bracket
        if (showOpening) {
          setScreen('TOURNAMENT_OPENING');
        }
        // Se false, handleUniverseSelectTournament já vai para UNIVERSE_BRACKET
      }}
      onTournamentComplete={(result) => {
        // Torneio simulado pelo BroadcastHub — vai direto para o recap glorioso
        console.log('📣 [BroadcastHub] Torneio simulado! Campeão:', result.champion?.name);
        setUniverseChampion(result);
        setShowTournamentRecap(true);
        setScreen('TOURNAMENT_RECAP');
      }}
    />;
  }
  
  // ===== PERFIL INDIVIDUAL DO JOGADOR =====
  if (screen === 'UNIVERSE_PLAYER_PROFILE' && selectedPlayerId !== null) {
    return <UnifiedPlayerProfile
      playerId={selectedPlayerId}
      onClose={() => {
        setSelectedPlayerId(null);
        setScreen('BROADCAST_HUB');
      }}
      universeManager={universeManager}
      variant="fullscreen"
    />;
  }

  // ===== FASE 1: EXPANDED SCHEDULE =====
  if (screen === 'EXPANDED_SCHEDULE') {
    return <ExpandedSchedule 
      universeManager={universeManager}
      currentMonth={universeManager.currentMonth}
      onSelectTournament={(tournament, action, index) => {
        if (action === 'START') {
          handleUniverseSelectTournament(index);
        } else if (action === 'VIEW') {
          setUniverseViewingTournament(tournament);
          setScreen('UNIVERSE_BRACKET');
        }
      }}
      onBack={() => setScreen('BROADCAST_HUB')}
    />;
  }

  if (screen === 'UNIVERSE_BRACKET') {
    return <ModernBracket 
      universeManager={universeManager}
      viewingTournament={universeViewingTournament}
      onPlayMatch={handleUniversePlayMatch}
      turboMode={turboMode}
      setTurboMode={setTurboMode}
      autoPlayQueue={autoPlayQueue}
      setAutoPlayQueue={setAutoPlayQueue}
      onTournamentComplete={(result) => {
        // Torneio completado — vai direto para o recap glorioso
        console.log('📣 Torneio completado! Abrindo recap...');
        setUniverseChampion(result);
        setShowTournamentRecap(true);
        setScreen('TOURNAMENT_RECAP');
      }}
      onBack={() => {
        setUniverseViewingTournament(null); // Limpar ao voltar
        setScreen('BROADCAST_HUB');
      }}
    />;
  }

  if (screen === 'UNIVERSE_RANKINGS') {
    return <UniverseRankingsScreen 
      universeManager={universeManager}
      onBack={() => setScreen('BROADCAST_HUB')}
    />;
  }

  if (screen === 'TOURNAMENT_RECAP' && universeChampion) {
    return <TournamentRecapScreen 
      universeManager={universeManager}
      universeChampion={universeChampion}
      onContinue={handleTournamentRecapContinue}
      onViewBracket={handleTournamentRecapViewBracket}
    />;
  }

  // UNIVERSE_CHAMPION mantido como fallback (não é mais a rota primária)
  if (screen === 'UNIVERSE_CHAMPION' && universeChampion) {
    setShowTournamentRecap(true);
    setScreen('TOURNAMENT_RECAP');
    return null;
  }

  if (screen === 'SEASON_RECAP' && showSeasonRecap) {
    return <SeasonAwardsCeremony 
      universeManager={universeManager}
      onClose={() => {
        setShowSeasonRecap(false);
        universeManager.seasonRecapYear = null;
        setUniverseChampion(null);
        setUniverseCurrentMatch(null);
        // Sempre navegar para o hub — os overlays são globais e aparecem em cima
        setScreen('BROADCAST_HUB');
        if (pendingRetirements.length > 0) {
          setShowRetirementAnnouncement(true);
        } else if (universeManager.pendingEraTransition) {
          setShowEraTransition(true);
        }
      }}
    />;
  }

  if (screen === 'UNIVERSE_HISTORY' && universeViewingTournament) {
    return <UniverseTournamentHistoryScreen 
      tournament={universeViewingTournament}
      universeManager={universeManager}
      onBack={() => {
        setUniverseViewingTournament(null);
        setScreen('BROADCAST_HUB');
      }}
    />;
  }

  if (screen === 'POST' && battleResult) {
    return (
      <TurboProvider turboEnabled={turboMode}>
        <PostMatchScreen 
          result={battleResult} 
          onContinue={handleContinue}
        />
      </TurboProvider>
    );
  }

  // ===== 📖 NARRATIVE SCREENS (FASE 2) =====
  
  if (screen === 'RIVALRIES') {
    const currentSeason = universeManager.getCurrentSeason();
    const rivalries = universeManager.narrativeEngine?.rivalryDetector.detectRivalries(currentSeason) || [];
    
    return <RivalryTrackerScreen 
      rivalries={rivalries}
      universe={universeManager}
      onBack={() => setScreen('BROADCAST_HUB')}
    />;
  }

  if (screen === 'EVENTS') {
    return <EventsCalendarScreen 
      eventsManager={universeManager.eventsManager}
      universe={universeManager}
      onBack={() => setScreen('BROADCAST_HUB')}
      onExecuteEvent={(event) => {
        console.log('Executando evento:', event.name);
        // Aqui seria executado o evento especial
        const result = universeManager.eventsManager.executeNextEvent(universeManager);
        console.log('Resultado:', result);
      }}
    />;
  }

  if (screen === 'SOCIAL') {
    return <SocialFeedScreen 
      socialEngine={universeManager.socialEngine}
      onBack={() => setScreen('BROADCAST_HUB')}
    />;
  }

  if (screen === 'LEGACY') {
    const allSeasons = universeManager.seasons || [];
    
    return <LegacyScreen 
      narrativeEngine={universeManager.narrativeEngine}
      universe={universeManager}
      onBack={() => setScreen('BROADCAST_HUB')}
    />;
  }
  
  // ===== 📊 ANALYTICS SCREENS (FASE 3) =====
  
  if (screen === 'ANALYTICS_DASHBOARD') {
    return <AnalyticsDashboard 
      universe={universeManager}
      onPlayerSelect={(playerName) => {
        setSelectedPlayerAnalytics(playerName);
        setScreen('PLAYER_ANALYTICS');
      }}
    />;
  }
  
  if (screen === 'PLAYER_ANALYTICS' && selectedPlayerAnalytics) {
    return <PlayerAnalyticsScreen 
      universe={universeManager}
      playerName={selectedPlayerAnalytics}
      onBack={() => {
        setSelectedPlayerAnalytics(null);
        setScreen('ANALYTICS_DASHBOARD');
      }}
    />;
  }
  
  if (screen === 'META_DASHBOARD') {
    return <MetaDashboard 
      universe={universeManager}
    />;
  }
  
  if (screen === 'RECORD_BOOK') {
    return <RecordBookScreen 
      universe={universeManager}
      onPlayerSelect={(playerName) => {
        setSelectedPlayerAnalytics(playerName);
        setScreen('PLAYER_ANALYTICS');
      }}
    />;
  }
  
  if (screen === 'BALANCE_REPORT') {
    return <BalanceReportScreen 
      universe={universeManager}
    />;
  }

  // ===== SERIES MANAGER =====
  if (screen === 'SERIES_MANAGER' && exhibitionConfig) {
    return (
      <TurboProvider turboEnabled={turboMode}>
        <SeriesManager
          format={exhibitionConfig.format}
          team1={exhibitionConfig.team1}
          team2={exhibitionConfig.team2}
          arenas={exhibitionConfig.arenas}
          onSeriesComplete={(result) => {
            console.log('Série completa!', result);
            setExhibitionConfig(null);
            setScreen('HOME');
          }}
          onRoundComplete={(roundResult) => {
            console.log('Round completo:', roundResult);
          }}
        />
      </TurboProvider>
    );
  }

  // Fallback: show loading or return to menu
  return (
    <>
      <div className="h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="text-white text-xl mb-4">Algo deu errado...</div>
          <button 
            onClick={() => setScreen('HOME')}
            className="bg-blue-500 hover:bg-blue-400 text-white px-8 py-3 rounded font-bold"
          >
            Voltar ao Menu
          </button>
        </div>
      </div>
      {currentBreakingNews && (
        <BreakingNews 
          event={currentBreakingNews}
          onDismiss={dismissBreakingNews}
          onAction={handleBreakingNewsAction}
        />
      )}

      {/* 🏁 Modal de Aposentadorias — global: aparece em cima de qualquer tela */}
      {showRetirementAnnouncement && pendingRetirements.length > 0 && (
        <RetirementAnnouncement
          retirements={pendingRetirements}
          onClose={() => {
            setShowRetirementAnnouncement(false);
            setPendingRetirements([]);
            if (universeManager.pendingEraTransition) {
              setShowEraTransition(true);
            } else {
              setScreen('BROADCAST_HUB');
            }
          }}
        />
      )}

      {/* 🏛️ Overlay de Transição de Era — global: aparece em cima de qualquer tela */}
      {showEraTransition && universeManager.pendingEraTransition && (
        <EraTransitionOverlay
          transitionData={universeManager.pendingEraTransition}
          onConfirm={(newEraName) => {
            universeManager.confirmEraTransition(newEraName);
            setShowEraTransition(false);
            setScreen('BROADCAST_HUB');
          }}
        />
      )}
    </>
  );
};

export default App;
