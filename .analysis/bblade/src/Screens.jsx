// ============================================
// SCREENS.JSX - Telas principais do jogo
// ============================================

import React, { useState, useRef } from 'react';
import { Trophy, Globe, Calendar, Award, TrendingUp, Save, Upload, Star, ChevronRight, Play, Settings } from 'lucide-react';
import { TEAMS } from './data.js';
import { CALENDAR_STRUCTURE as CALENDAR_CONFIG } from './CalendarConfig.js';
import { MENTALITIES, buildDeckWithBonuses } from './UniverseManager.js';
import { runHeadlessMD3 } from './HeadlessBattle.js';
import { PlayerCard } from './BattleComponents.jsx';
import { UnifiedPlayerProfile } from './UnifiedPlayerProfile.jsx';
import { VersusShowcase } from './VersusShowcase.jsx';
import { useSettings } from './SettingsContext';
import PlayerImage from './PlayerImage.jsx';
import TournamentRecapScreen from './TournamentRecapScreen.jsx';

const UniverseCalendarScreen = ({ 
  universeManager, 
  onSelectTournament,
  onRecallTournament,
  onViewRankings,
  onBack,
  onViewRivalries,
  onViewEvents,
  onViewSocial,
  onViewLegacy,
  onViewAnalytics,
  onViewMeta,
  onViewRecords,
  onViewBalance
}) => {
  const [hoveredMonth, setHoveredMonth] = useState(null);
  const currentMonth = universeManager.getCurrentMonthConfig();
  const monthsCompleted = universeManager.currentMonth - 1;
  const isGrandSlamMonth = currentMonth.tournaments.length === 1 && currentMonth.tournaments[0].type === 'GRAND_SLAM';
  const currentTournament = currentMonth.tournaments[universeManager.currentTournamentIndex];
  const rankings = universeManager.getRankings();

  // Get arena info
  const getArenaInfo = (arena) => {
    const arenaPrefs = {
      'BB-10': {
        favoredTypes: ['Attack', 'Balance'],
        disfavoredTypes: ['Defense'],
        description: 'Tornado Ridge favorece padrões agressivos'
      },
      'Prismatic Nexus': {
        favoredTypes: ['Attack', 'Balance'],
        disfavoredTypes: ['Stamina'],
        description: 'Portais favorecem mobilidade'
      },
      'Colosseum Carnage': {
        favoredTypes: ['Attack', 'Defense'],
        disfavoredTypes: ['Stamina'],
        description: 'arena gladiatorial favorece resistentes'
      },
      'Volcanic Rage': {
        favoredTypes: ['Stamina', 'Defense'],
        disfavoredTypes: ['Attack'],
        description: 'Erupções e lava flows caóticos'
      },
      'Vortex Coliseum': {
        favoredTypes: ['Stamina', 'Balance'],
        disfavoredTypes: ['Defense'],
        description: 'Vórtex central favorece momentum'
      },
      'Pinball Inferno': {
        favoredTypes: ['Attack', 'Balance'],
        disfavoredTypes: ['Defense'],
        description: 'Bumpers recompensam velocidade'
      },
      'Pangea Platform': {
        favoredTypes: ['Balance'],
        disfavoredTypes: ['Attack', 'Stamina'],
        description: 'Rotação cria dinâmicas complexas'
      },
      'Killer Sides': {
        favoredTypes: ['Attack', 'Balance'],
        disfavoredTypes: ['Defense', 'Stamina'],
        description: 'Velocidade é fuga, lentidão é morte'
      }
    };
    
    return arenaPrefs[arena] || { 
      favoredTypes: [], 
      disfavoredTypes: [],
      description: 'Arena conditions vary'
    };
  };

  const arenaInfo = getArenaInfo(currentTournament.arena);

  // Generate dynamic headline
  const getDynamicHeadline = () => {
    const headlines = [
      "High-stakes competition expected",
      "Meta strategies under pressure",
      "Aggressive gameplay anticipated", 
      "Favorites face ranking challengers",
      "Tournament intensity rising",
      "Strategic adaptation required"
    ];
    
    if (currentTournament.tier === 'GRAND_SLAM') {
      return "Arena rotation keeps bladers guessing";
    }
    
    if (arenaInfo.favoredTypes?.includes('Attack')) {
      return "Aggressive meta expected in this arena";
    }
    
    return headlines[Math.floor(Math.random() * headlines.length)];
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0F172A] via-[#1E293B] to-[#0F172A] text-white overflow-hidden">
      <style>{`
        @keyframes pulse-glow {
          0%, 100% { opacity: 0.6; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.05); }
        }
        
        @keyframes slide-in {
          from { opacity: 0; transform: translateX(-20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        
        .pulse-current-month {
          animation: pulse-glow 3s ease-in-out infinite;
        }
        
        .slide-in {
          animation: slide-in 0.5s ease-out forwards;
        }
        
        .rank-bar {
          transition: all 0.3s ease;
        }
        
        .rank-bar:hover {
          transform: translateX(5px);
        }
      `}</style>

      {/* Top Bar */}
      <div className="bg-black/40 backdrop-blur-sm border-b border-[#01A5E7]/30 px-6 py-3">
        <div className="max-w-[1600px] mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="w-2 h-2 bg-[#00C48C] rounded-full pulse-current-month"></div>
            <span className="text-sm text-gray-400 uppercase tracking-wider">
              TEMPORADA {universeManager.currentYear} • {currentMonth.name}
            </span>
          </div>
          <div className="flex gap-3">
            <button
              onClick={onViewRankings}
              className="text-sm text-gray-300 hover:text-white transition-colors px-4 py-1.5 border border-[#01A5E7]/50 hover:border-[#01A5E7] rounded bg-[#01A5E7]/10 hover:bg-[#01A5E7]/20"
            >
              📊 Rankings
            </button>
            <button
              onClick={onBack}
              className="text-sm text-gray-400 hover:text-white transition-colors px-4 py-1.5 border border-gray-600 hover:border-gray-400 rounded"
            >
              Menu
            </button>
          </div>
        </div>
      </div>

      {/* Quick Nav Bar */}
      <div className="bg-gray-900/50 border-b border-gray-800 px-6 py-3">
        <div className="max-w-[1600px] mx-auto">
          <div className="grid grid-cols-8 gap-2">
            <button
              onClick={onViewRivalries}
              className="text-xs text-gray-400 hover:text-white hover:bg-red-900/20 px-3 py-2 rounded border border-red-900/30 hover:border-red-700/50 transition-all"
            >
              ⚔️ Rivalries
            </button>
            <button
              onClick={onViewEvents}
              className="text-xs text-gray-400 hover:text-white hover:bg-purple-900/20 px-3 py-2 rounded border border-purple-900/30 hover:border-purple-700/50 transition-all"
            >
              📅 Events
            </button>
            <button
              onClick={onViewSocial}
              className="text-xs text-gray-400 hover:text-white hover:bg-blue-900/20 px-3 py-2 rounded border border-blue-900/30 hover:border-blue-700/50 transition-all"
            >
              🐦 Social
            </button>
            <button
              onClick={onViewLegacy}
              className="text-xs text-gray-400 hover:text-white hover:bg-yellow-900/20 px-3 py-2 rounded border border-yellow-900/30 hover:border-yellow-700/50 transition-all"
            >
              🏛️ Legacy
            </button>
            <button
              onClick={onViewAnalytics}
              className="text-xs text-gray-400 hover:text-white hover:bg-cyan-900/20 px-3 py-2 rounded border border-cyan-900/30 hover:border-cyan-700/50 transition-all"
            >
              📊 Analytics
            </button>
            <button
              onClick={onViewMeta}
              className="text-xs text-gray-400 hover:text-white hover:bg-teal-900/20 px-3 py-2 rounded border border-teal-900/30 hover:border-teal-700/50 transition-all"
            >
              🎯 Meta
            </button>
            <button
              onClick={onViewRecords}
              className="text-xs text-gray-400 hover:text-white hover:bg-orange-900/20 px-3 py-2 rounded border border-orange-900/30 hover:border-orange-700/50 transition-all"
            >
              📖 Records
            </button>
            <button
              onClick={onViewBalance}
              className="text-xs text-gray-400 hover:text-white hover:bg-green-900/20 px-3 py-2 rounded border border-green-900/30 hover:border-green-700/50 transition-all"
            >
              ⚖️ Balance
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="max-w-[1600px] mx-auto px-6 py-8">
        <div className="grid grid-cols-12 gap-6 mb-8">
          
          {/* LEFT SIDEBAR - LIVE RANKINGS */}
          <div className="col-span-3 space-y-3">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold text-[#01A5E7] uppercase tracking-wider">Live Rankings</h3>
              <button 
                onClick={onViewRankings}
                className="text-xs text-gray-400 hover:text-[#01A5E7] transition-colors"
              >
                View All →
              </button>
            </div>
            
            {rankings.slice(0, 8).map((player, index) => (
              <div 
                key={player.playerId}
                className="rank-bar bg-gradient-to-r from-gray-900/80 to-transparent border-l-2 border-[#01A5E7] pl-4 pr-3 py-3 slide-in"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className={`text-2xl font-black ${
                      index === 0 ? 'text-[#FFD700]' : 
                      index === 1 ? 'text-[#C0C0C0]' :
                      index === 2 ? 'text-[#CD7F32]' :
                      'text-gray-500'
                    }`}>
                      {index + 1}
                    </span>
                    <div>
                      <p className="text-sm font-bold text-white leading-tight">{player.playerName}</p>
                      <p className="text-xs text-gray-400">{player.totalPoints} BBP</p>
                    </div>
                  </div>
                  {index === 0 && (
                    <div className="w-8 h-8 flex items-center justify-center">
                      <span className="text-xl">👑</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* CENTER - HERO SECTION */}
          <div className="col-span-6">
            <div className="bg-gradient-to-br from-gray-900/95 to-gray-900/80 backdrop-blur-md rounded-lg p-8 border border-[#01A5E7]/30 shadow-[0_0_20px_rgba(1,165,231,0.3)]">
              {/* Month Name */}
              <div className="text-center mb-2">
                <span className="text-sm font-bold text-[#00C48C] uppercase tracking-widest">
                  {currentMonth.name.toUpperCase()}
                </span>
              </div>

              {/* Tournament Name - MASSIVE */}
              <h1 className="text-5xl font-black text-center text-transparent bg-clip-text bg-gradient-to-r from-[#01A5E7] via-[#00C48C] to-[#01A5E7] mb-6 leading-tight">
                {currentTournament.name.replace(/[🎆🌸⚡💀🎯🔰⚔️👑🎪🌟💎🏆🌀💫🔥🎭⭐🌊🏔️❄️]/g, '').trim()}
              </h1>

              {/* Tournament Details */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-black/30 rounded px-4 py-3 border border-gray-800">
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Tier</p>
                  <p className="text-lg font-bold text-white">{currentTournament.tier.replace(/_/g, ' ')}</p>
                </div>
                <div className="bg-black/30 rounded px-4 py-3 border border-gray-800">
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Arena</p>
                  <p className="text-lg font-bold text-white">
                    {currentTournament.arena === 'ALL' ? 'Multi-Arena' : currentTournament.arena}
                  </p>
                </div>
                <div className="bg-black/30 rounded px-4 py-3 border border-gray-800">
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Format</p>
                  <p className="text-lg font-bold text-white">{currentTournament.matchFormat || 'TBD'}</p>
                </div>
                <div className="bg-black/30 rounded px-4 py-3 border border-gray-800">
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Field</p>
                  <p className="text-lg font-bold text-white">{currentTournament.participants} Players</p>
                </div>
              </div>

              {/* Multi-tournament indicator */}
              {currentMonth.tournaments.length > 1 && (
                <div className="bg-blue-900/30 border border-blue-500/30 rounded px-4 py-2 mb-4 text-center">
                  <p className="text-xs text-blue-300">
                    Tournament {universeManager.currentTournamentIndex + 1} of {currentMonth.tournaments.length}
                  </p>
                </div>
              )}

              {/* Dynamic Headline */}
              <div className="bg-gradient-to-r from-[#FF9F1C]/10 to-transparent border-l-2 border-[#FF9F1C] px-4 py-3 rounded-r mb-6">
                <p className="text-sm text-gray-300 italic">
                  {getDynamicHeadline()}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={onSelectTournament}
                  className="flex-1 bg-gradient-to-r from-[#01A5E7] to-[#00C48C] hover:from-[#00C48C] hover:to-[#01A5E7] text-white font-black py-4 px-6 rounded-lg transition-all transform hover:scale-105 uppercase tracking-wider text-sm shadow-lg shadow-[#01A5E7]/30"
                >
                  ▶ JOGAR TORNEIO
                </button>
              </div>
            </div>
          </div>

          {/* RIGHT SIDEBAR - ARENA META */}
          <div className="col-span-3 space-y-4">
            <h3 className="text-xs font-bold text-[#01A5E7] uppercase tracking-wider mb-4">Arena Insight</h3>
            
            {currentTournament.arena !== 'ALL' ? (
              <>
                {/* Favored Types */}
                <div className="bg-gradient-to-br from-green-900/20 to-transparent border border-green-800/30 rounded-lg p-4">
                  <p className="text-xs text-green-400 uppercase tracking-wide mb-2">Favored</p>
                  <div className="flex flex-wrap gap-2">
                    {arenaInfo.favoredTypes?.map(type => (
                      <span key={type} className="bg-green-900/40 text-green-300 text-xs font-bold px-3 py-1 rounded-full">
                        {type}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Disfavored Types */}
                <div className="bg-gradient-to-br from-red-900/20 to-transparent border border-red-800/30 rounded-lg p-4">
                  <p className="text-xs text-red-400 uppercase tracking-wide mb-2">Disfavored</p>
                  <div className="flex flex-wrap gap-2">
                    {arenaInfo.disfavoredTypes?.map(type => (
                      <span key={type} className="bg-red-900/40 text-red-300 text-xs font-bold px-3 py-1 rounded-full">
                        {type}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Arena Description */}
                <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4">
                  <p className="text-xs text-gray-400 leading-relaxed">
                    {arenaInfo.description}
                  </p>
                </div>
              </>
            ) : (
              <div className="bg-[#FF9F1C]/10 border border-[#FF9F1C]/30 rounded-lg p-4">
                <p className="text-xs text-[#FF9F1C] font-bold uppercase tracking-wide mb-2">
                  🎲 Random Rotation
                </p>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Arena changes each round. All battle types can thrive depending on the draw.
                </p>
              </div>
            )}

            {/* System Status */}
            <div className="mt-6 pt-6 border-t border-gray-800">
              <p className="text-xs text-gray-600 uppercase tracking-wide mb-2">System Status</p>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 bg-[#00C48C] rounded-full pulse-current-month"></div>
                <span className="text-xs text-gray-400">AI Engine: Active</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-[#00C48C] rounded-full pulse-current-month"></div>
                <span className="text-xs text-gray-400">Meta Balance: Online</span>
              </div>
            </div>
          </div>
        </div>

        {/* SEASON TIMELINE - Bottom */}
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold text-[#01A5E7] uppercase tracking-wider">Season Timeline</h3>
            <span className="text-xs text-gray-500">{universeManager.currentYear} Season • {Math.round((monthsCompleted / 12) * 100)}% Complete</span>
          </div>
          
          <div className="relative bg-gray-900/50 rounded-lg border border-gray-800 p-6">
            {/* Progress Bar */}
            <div className="absolute top-0 left-0 h-1 bg-gradient-to-r from-[#01A5E7] via-[#00C48C] to-[#FF9F1C] rounded-tl-lg" 
                 style={{ width: `${(monthsCompleted / 12) * 100}%` }}></div>
            
            {/* Months */}
            <div className="grid grid-cols-12 gap-2">
              {CALENDAR_CONFIG.months.map((month) => {
                const isPast = month.id < universeManager.currentMonth;
                const isCurrent = month.id === universeManager.currentMonth;
                const isFuture = month.id > universeManager.currentMonth;
                const isGrandSlam = month.tournaments[0].type === 'GRAND_SLAM';
                
                return (
                  <div
                    key={month.id}
                    className={`relative text-center py-4 rounded transition-all ${
                      isCurrent 
                        ? 'bg-[#01A5E7]/20 border-2 border-[#01A5E7] pulse-current-month cursor-pointer' 
                        : isPast 
                        ? 'bg-gray-800/50 border border-gray-700 opacity-60 cursor-pointer hover:opacity-80' 
                        : 'bg-gray-900/30 border border-gray-800 opacity-40 cursor-not-allowed'
                    }`}
                    onMouseEnter={() => setHoveredMonth(month)}
                    onMouseLeave={() => setHoveredMonth(null)}
                    onClick={isPast ? () => onRecallTournament(month.id) : undefined}
                  >
                    <span className={`text-xs font-bold block mb-1 ${
                      isCurrent ? 'text-[#01A5E7]' : isPast ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      {month.shortName}
                    </span>
                    {isGrandSlam && (
                      <div className="text-xs">⭐</div>
                    )}
                    {isCurrent && (
                      <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2">
                        <div className="w-2 h-2 bg-[#01A5E7] rounded-full pulse-current-month"></div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Hovered Month Info */}
            {hoveredMonth && (
              <div className="mt-4 bg-black/50 rounded p-3 border border-[#01A5E7]/30 animate-fade-in">
                <p className="text-sm font-bold text-white mb-1">{hoveredMonth.name}</p>
                <p className="text-xs text-gray-400 mb-2">
                  {hoveredMonth.tournaments[0].name}
                </p>
                {hoveredMonth.id < universeManager.currentMonth && (
                  <p className="text-xs text-blue-400">Click to view recap</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const UniverseBracketScreen = ({ 
  universeManager, 
  viewingTournament = null,
  onPlayMatch,
  onBack 
}) => {
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  
  // 🔧 CORREÇÃO: Buscar bracket correto baseado no contexto
  let bracket = null;
  let tournament = null;
  let currentMatch = null;
  let currentRound = null;
  let isViewingArchived = false;
  
  if (viewingTournament) {
    // Visualizando torneio específico (pode ser completado ou em andamento)
    const tournamentKey = `${viewingTournament.year}-${viewingTournament.month}-${viewingTournament.index}`;
    const archivedData = universeManager.tournamentArchive.get(tournamentKey);
    
    if (archivedData) {
      // Torneio completado - buscar do archive
      bracket = archivedData.bracket;
      tournament = archivedData.tournament;
      isViewingArchived = true;
    } else {
      // Torneio em andamento - usar current
      bracket = universeManager.currentBracket;
      tournament = universeManager.getCurrentTournament();
      currentMatch = universeManager.getCurrentMatch();
      currentRound = universeManager.currentRound;
    }
  } else {
    // Modo normal - visualizar torneio atual
    bracket = universeManager.currentBracket;
    tournament = universeManager.getCurrentTournament();
    currentMatch = universeManager.getCurrentMatch();
    currentRound = universeManager.currentRound;
  }
  
  // Validar se bracket existe
  if (!bracket || !tournament) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-900/20 border border-red-500/50 rounded-xl p-8 text-center">
            <h2 className="text-2xl font-bold text-red-400 mb-4">⚠️ Bracket Não Disponível</h2>
            <p className="text-white/70 mb-6">
              {!bracket && "O chaveamento do torneio ainda não foi criado ou não está disponível."}
              {!tournament && "Informações do torneio não encontradas."}
            </p>
            <button
              onClick={onBack}
              className="bg-gray-700 hover:bg-gray-600 text-white px-8 py-3 rounded-lg font-bold transition-all"
            >
              Voltar ao Calendário
            </button>
          </div>
        </div>
      </div>
    );
  }

  const getRoundName = (round) => {
    const names = {
      'R64': 'Rodada de 64',
      'R32': 'Rodada de 32',
      'R16': 'Oitavas de Final',
      'QF': 'Quartas de Final',
      'SF': 'Semifinal',
      'F': 'Final'
    };
    return names[round] || round;
  };
  
  const getTierInfo = (tier) => {
    const tiers = {
      'GRAND_SLAM': { icon: '🏆', label: 'Grand Slam', color: 'text-yellow-400', bg: 'bg-yellow-600/20' },
      'MASTERS': { icon: '🥇', label: 'Masters', color: 'text-yellow-300', bg: 'bg-yellow-500/20' },
      'CHALLENGERS': { icon: '🥈', label: 'Challengers', color: 'text-purple-300', bg: 'bg-purple-600/20' },
      'PROSPECTS': { icon: '🥉', label: 'Prospects', color: 'text-blue-300', bg: 'bg-blue-600/20' }
    };
    return tiers[tier] || tiers['PROSPECTS'];
  };

  const handlePlayerClick = (player) => {
    setSelectedPlayer({
      id: player.id,
      team: TEAMS[player.teamIndex || player.id],
      deck: player.deck || []
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 p-8">
      {selectedPlayer && (
        <PlayerCard 
          player={selectedPlayer} 
          onClose={() => setSelectedPlayer(null)}
          universeManager={universeManager}
        />
      )}
      
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          {/* Tournament Badge */}
          <div className={`inline-block px-6 py-3 rounded-2xl mb-4 ${getTierInfo(tournament.tier).bg} border-2`}
               style={{ borderColor: getTierInfo(tournament.tier).color }}>
            <div className="flex items-center gap-3">
              <span className="text-3xl">{getTierInfo(tournament.tier).icon}</span>
              <div>
                <div className={`text-sm font-bold ${getTierInfo(tournament.tier).color}`}>
                  {getTierInfo(tournament.tier).label}
                </div>
                <div className="text-white/60 text-xs">
                  {tournament.participants} Players • {tournament.matchFormat}
                </div>
              </div>
            </div>
          </div>

          {/* Tournament Name */}
          <h1 className="text-6xl font-black text-white mb-3 tracking-tight">
            {tournament.name}
            {isViewingArchived && (
              <span className="ml-4 text-2xl text-green-400 font-normal">✓ Completo</span>
            )}
          </h1>

          {/* Round Info */}
          {!isViewingArchived && currentRound && (
            <div className="flex items-center gap-4">
              <div className="text-2xl text-purple-300 font-bold">
                {getRoundName(currentRound)}
              </div>
              
              {/* Progress Indicator */}
              <TournamentProgress 
                currentRound={currentRound}
                totalRounds={getTotalRounds(tournament.participants)}
              />
            </div>
          )}
          
          {isViewingArchived && (
            <div className="text-lg text-green-400 font-bold mb-2">
              🏆 Torneio Finalizado
            </div>
          )}

          <p className="text-white/50 text-sm mt-2">
            {tournament.arena}
          </p>
        </div>

        {!isViewingArchived && currentMatch && (
          <VersusShowcase 
            match={currentMatch}
            universeManager={universeManager}
            onPlayMatch={onPlayMatch}
          />
        )}

        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-8 border border-purple-500/30">
          <h2 className="text-2xl font-bold text-white mb-6">Chaveamento</h2>
          <div className="space-y-8">
            {Object.entries(bracket)
              .filter(([round]) => round !== 'BYES') // Filtrar campo especial BYES
              .map(([round, matches]) => (
              matches.length > 0 && (
                <div key={round}>
                  <h3 className="text-lg font-bold text-purple-400 mb-4">
                    {getRoundName(round)}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {matches.map((match, idx) => {
                      // Validar se match tem player1 e player2 (pode estar incompleto)
                      if (!match.player1 || !match.player2) {
                        return null;
                      }
                      
                      return (
                        <div key={idx} className="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
                          <div 
                            className={`text-sm mb-2 cursor-pointer hover:underline ${match.winner?.id === match.player1.id ? 'text-green-400 font-bold' : 'text-gray-400'}`}
                            onClick={() => handlePlayerClick(match.player1)}
                          >
                            {match.player1.name.split(' ')[0]}
                          </div>
                          <div 
                            className={`text-sm cursor-pointer hover:underline ${match.winner?.id === match.player2.id ? 'text-green-400 font-bold' : 'text-gray-400'}`}
                            onClick={() => handlePlayerClick(match.player2)}
                          >
                            {match.player2.name.split(' ')[0]}
                          </div>
                          {match.winner && (
                            <div className="mt-2 text-xs text-green-400">
                              ✓ {match.winner.name.split(' ')[0]}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )
            ))}
          </div>
        </div>

        <div className="mt-8 flex justify-center gap-4">
          {/* Botão Exportar */}
          <button
            onClick={() => {
              const fileName = universeManager.downloadJSON();
              alert(`✅ Dados exportados com sucesso!\n\nArquivo: ${fileName}\n\nVocê pode usar este arquivo para fazer backup ou transferir seu progresso para outro dispositivo.`);
            }}
            className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-lg font-bold transition-all flex items-center gap-2"
          >
            <span>📥</span>
            Exportar Temporada (JSON)
          </button>

          {/* Botão Importar */}
          <button
            onClick={() => {
              const input = document.createElement('input');
              input.type = 'file';
              input.accept = '.json';
              input.onchange = async (e) => {
                const file = e.target.files[0];
                if (file) {
                  try {
                    const success = await universeManager.importFromFile(file);
                    if (success) {
                      alert('✅ Dados importados com sucesso!\n\nSeu progresso foi restaurado.');
                      // ✅ CORREÇÃO: Voltar para BROADCAST_HUB em vez de recarregar a página
                      // Isso força o React a re-renderizar com os dados importados
                      onBack();
                    }
                  } catch (error) {
                    alert(`❌ Erro ao importar:\n${error.message}`);
                  }
                }
              };
              input.click();
            }}
            className="bg-green-600 hover:bg-green-500 text-white px-8 py-3 rounded-lg font-bold transition-all flex items-center gap-2"
          >
            <span>📤</span>
            Importar Temporada (JSON)
          </button>

          {/* Botão Voltar */}
          <button
            onClick={onBack}
            className="bg-gray-700 hover:bg-gray-600 text-white px-8 py-3 rounded-lg font-bold transition-all"
          >
            Voltar ao Calendário
          </button>
        </div>
      </div>
    </div>
  );
};

// ====================================================================
// TOURNAMENT PROGRESS COMPONENT
// ====================================================================

const TournamentProgress = ({ currentRound, totalRounds }) => {
  const rounds = ['R64', 'R32', 'R16', 'QF', 'SF', 'F'];
  const activeIndex = rounds.indexOf(currentRound);
  
  return (
    <div className="flex items-center gap-2">
      {rounds.slice(-totalRounds).map((round, idx) => {
        const isActive = rounds.indexOf(round) === activeIndex;
        const isComplete = rounds.indexOf(round) < activeIndex;
        
        return (
          <div
            key={round}
            className={`
              w-8 h-8 rounded-full flex items-center justify-center
              text-xs font-bold border-2 transition-all
              ${isActive 
                ? 'bg-purple-500 border-purple-400 text-white scale-110' 
                : isComplete
                ? 'bg-green-600 border-green-500 text-white'
                : 'bg-gray-700 border-gray-600 text-gray-400'
              }
            `}
          >
            {idx + 1}
          </div>
        );
      })}
    </div>
  );
};

const getTotalRounds = (participants) => {
  if (participants >= 64) return 6;
  if (participants >= 32) return 5;
  if (participants >= 16) return 4;
  if (participants >= 8) return 3;
  return 2;
};

// ====================================================================

const UniverseRankingsScreen = ({ universeManager, onBack }) => {
  const [view, setView] = useState('bbp'); // 'bbp', 'season', 'historical'
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  
  const bbpRanking = universeManager.getBBPRanking();
  const seasonRanking = universeManager.getSeasonRanking();
  const historicalRanking = universeManager.getHistoricalRanking();
  
  const currentRanking = view === 'bbp' ? bbpRanking : 
                        view === 'season' ? seasonRanking : 
                        historicalRanking;

  const allPlayersRanking = TEAMS.map((team, index) => {
    const rankEntry = currentRanking.find(r => r.playerId === index);
    const history = universeManager.playerHistories.get(index);
    const winRate = history && history.totalMatches > 0 ? (history.wins / history.totalMatches) * 100 : 0;
    return {
      playerId: index,
      points: rankEntry ? rankEntry.points : 0,
      team,
      history,
      winRate
    };
  }).filter(entry => {
    // BBP e Temporada: só jogadores ativos (PROFESSIONAL). Histórico: todos (incluindo aposentados)
    if (view === 'historical') return true;
    return entry.team.status === 'PROFESSIONAL';
  }).sort((a, b) => b.points - a.points);

  const handlePlayerClick = (entry) => {
    setSelectedPlayer(entry.playerId);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-yellow-900 to-gray-900 p-8">
      {selectedPlayer !== null && (
        <UnifiedPlayerProfile 
          playerId={selectedPlayer} 
          onClose={() => setSelectedPlayer(null)}
          universeManager={universeManager}
          variant="modal"
        />
      )}
      
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-5xl font-black text-white mb-6">RANKINGS</h1>

          {/* ─── ABAS ─── */}
          <div className="flex gap-0 rounded-xl overflow-hidden border border-gray-600">
            {/* Aba 1 – BBP 18 meses */}
            <button
              onClick={() => setView('bbp')}
              className={`flex-1 flex flex-col items-center gap-1 px-5 py-4 font-bold transition-all border-r border-gray-600 ${
                view === 'bbp'
                  ? 'bg-yellow-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
              }`}
            >
              <span className="text-xl">🏆</span>
              <span className="text-sm font-black tracking-wide">BBP</span>
              <span className="text-xs opacity-80">Últimos 18 meses</span>
            </button>

            {/* Aba 2 – Temporada */}
            <button
              onClick={() => setView('season')}
              className={`flex-1 flex flex-col items-center gap-1 px-5 py-4 font-bold transition-all border-r border-gray-600 ${
                view === 'season'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
              }`}
            >
              <span className="text-xl">📅</span>
              <span className="text-sm font-black tracking-wide">TEMPORADA</span>
              <span className="text-xs opacity-80">{universeManager.currentYear} · Zera em Jan</span>
            </button>

            {/* Aba 3 – Carreira */}
            <button
              onClick={() => setView('historical')}
              className={`flex-1 flex flex-col items-center gap-1 px-5 py-4 font-bold transition-all ${
                view === 'historical'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
              }`}
            >
              <span className="text-xl">🌟</span>
              <span className="text-sm font-black tracking-wide">CARREIRA</span>
              <span className="text-xs opacity-80">All-Time · Nunca expira</span>
            </button>
          </div>

          {/* Descrição ativa */}
          <div className={`mt-3 px-4 py-2 rounded-lg text-sm font-medium ${
            view === 'bbp' ? 'bg-yellow-600/10 text-yellow-300 border border-yellow-600/30' :
            view === 'season' ? 'bg-blue-600/10 text-blue-300 border border-blue-600/30' :
            'bg-purple-600/10 text-purple-300 border border-purple-600/30'
          }`}>
            {view === 'bbp' && '⏱️ Pontos dos últimos 18 meses. Pontos antigos expiram automaticamente, forçando atividade contínua.'}
            {view === 'season' && `📆 Apenas pontos conquistados em ${universeManager.currentYear}. Ranking zerado todo 1º de Janeiro.`}
            {view === 'historical' && '🌟 Soma total de todos os pontos da carreira do jogador — nunca expira, registro permanente.'}
          </div>
        </div>

        <div className={`bg-gray-800/50 backdrop-blur-sm rounded-xl overflow-hidden border ${
          view === 'bbp' ? 'border-yellow-500/30' :
          view === 'season' ? 'border-blue-500/30' :
          'border-purple-500/30'
        }`}>
          <div className={`p-4 border-b ${
            view === 'bbp' ? 'bg-yellow-600/20 border-yellow-500/30' :
            view === 'season' ? 'bg-blue-600/20 border-blue-500/30' :
            'bg-purple-600/20 border-purple-500/30'
          }`}>
            <div className={`grid grid-cols-12 gap-4 font-bold ${
              view === 'bbp' ? 'text-yellow-400' :
              view === 'season' ? 'text-blue-400' :
              'text-purple-400'
            }`}>
              <div className="col-span-1">Pos</div>
              <div className="col-span-7">Jogador</div>
              <div className="col-span-4 text-right">Pontos</div>
            </div>
          </div>
          
          <div className="divide-y divide-gray-700">
            {allPlayersRanking.map((entry, index) => (
              <div 
                key={entry.playerId} 
                className="p-4 hover:bg-gray-700/30 transition-all cursor-pointer"
                onClick={() => handlePlayerClick(entry)}
              >
                <div className="grid grid-cols-12 gap-4 items-center">
                  <div className="col-span-1">
                    <div className={`text-2xl font-black ${
                      index === 0 ? 'text-yellow-400' :
                      index === 1 ? 'text-gray-300' :
                      index === 2 ? 'text-orange-600' :
                      'text-gray-400'
                    }`}>
                      {index + 1}
                    </div>
                  </div>
                  
                  <div className="col-span-7">
                    <div className="flex items-center gap-3">
                      {/* ✅ IMAGEM DO JOGADOR */}
                      <PlayerImage 
                        player={entry.team} 
                        type="icon" 
                        size="md"
                        borderColor={
                          index === 0 ? 'border-yellow-400' :
                          index === 1 ? 'border-gray-300' :
                          index === 2 ? 'border-orange-600' :
                          undefined
                        }
                      />
                      <div>
                        <div className="text-white font-bold hover:underline">{entry.team.name}</div>
                        <div className="text-sm text-gray-400">
                          {entry.history?.titles.total || 0} títulos • {entry.winRate.toFixed(1)}% vitórias
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="col-span-4 text-right">
                    <div className="text-2xl font-black text-white">{entry.points}</div>
                    <div className="text-sm text-gray-400">
                      {view === 'bbp' ? 'BBP' : view === 'season' ? 'pts temporada' : 'pts carreira'}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8 text-center">
          <button
            onClick={onBack}
            className="bg-gray-700 hover:bg-gray-600 text-white px-8 py-3 rounded-lg font-bold transition-all"
          >
            Voltar
          </button>
        </div>
      </div>
    </div>
  );
};

const UniverseChampionScreen = ({ champion, tournamentName, onContinue }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-900 via-yellow-700 to-orange-900 flex items-center justify-center p-8">
      <div className="max-w-4xl w-full text-center">
        <div className="mb-8 animate-bounce">
          <Trophy className="w-32 h-32 text-yellow-300 mx-auto mb-6" />
        </div>

        <h1 className="text-7xl font-black text-white mb-4">
          CAMPEÃO!
        </h1>

        <div className="text-3xl text-yellow-200 mb-8">
          {tournamentName}
        </div>

        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-12 border-4 border-yellow-400 mb-8">
          {/* ✅ IMAGEM DO CAMPEÃO */}
          <PlayerImage 
            player={champion} 
            type="full" 
            size="xl"
            borderColor="border-yellow-400"
            className="mx-auto mb-6"
          />
          
          <h2 className="text-5xl font-black text-white mb-3">
            {champion.name}
          </h2>
          
          <p className="text-2xl text-yellow-200">
            {champion.country}
          </p>
        </div>

        <button
          onClick={onContinue}
          className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-white px-16 py-5 rounded-xl font-bold text-2xl transition-all transform hover:scale-105"
        >
          Continuar
        </button>
      </div>
    </div>
  );
};

const UniverseTournamentHistoryScreen = ({ tournament, universeManager, onBack }) => {
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  
  const getRoundName = (round) => {
    const names = {
      'R16': 'Oitavas de Final',
      'QF': 'Quartas de Final',
      'SF': 'Semifinal',
      'F': 'Final'
    };
    return names[round] || round;
  };

  const handlePlayerClick = (player) => {
    setSelectedPlayer({
      id: player.id,
      team: TEAMS[player.teamIndex || player.id],
      deck: player.deck || []
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-indigo-900 to-gray-900 p-8">
      {selectedPlayer && (
        <PlayerCard 
          player={selectedPlayer} 
          onClose={() => setSelectedPlayer(null)}
          universeManager={universeManager}
        />
      )}
      
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={onBack}
            className="mb-4 bg-gray-700 hover:bg-gray-600 text-white px-6 py-3 rounded-lg font-bold transition-all"
          >
            ← Voltar
          </button>
          
          <div className="bg-gradient-to-r from-indigo-600/20 to-purple-600/20 rounded-xl p-6 border-2 border-indigo-500">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-indigo-300 mb-1">
                  {tournament.month}/{tournament.year}
                </div>
                <h1 className="text-4xl font-black text-white mb-2">
                  {tournament.tournamentName}
                </h1>
                <div className="text-lg text-indigo-200">
                  {tournament.tournamentType === 'GRAND_SLAM' ? '🏆 Grand Slam' : '🎾 ATP 250'}
                </div>
              </div>
              
              <div 
                className="text-center cursor-pointer hover:scale-105 transition-transform"
                onClick={() => handlePlayerClick(tournament.champion)}
              >
                <div className="text-sm text-yellow-300 mb-2">CAMPEÃO</div>
                <div 
                  className="w-24 h-24 mx-auto mb-2 rounded-full flex items-center justify-center text-4xl hover:shadow-xl transition-shadow"
                  style={{ backgroundColor: tournament.champion.colors[0] }}
                >
                  <span className="text-white font-black">{tournament.champion.name.charAt(0)}</span>
                </div>
                <div className="text-white font-bold hover:underline">{tournament.champion.name.split(' ')[0]}</div>
                <div className="text-sm text-gray-400">{tournament.champion.country}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Bracket History */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-8 border border-indigo-500/30">
          <h2 className="text-2xl font-bold text-white mb-6">Chaveamento Completo</h2>
          <div className="space-y-8">
            {Object.entries(tournament.bracket).map(([round, matches]) => (
              matches.length > 0 && (
                <div key={round}>
                  <h3 className="text-lg font-bold text-indigo-400 mb-4">
                    {getRoundName(round)}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {matches.map((match, idx) => (
                      <div key={idx} className="bg-gray-700/50 rounded-lg p-4 border-2 border-gray-600">
                        <div className="space-y-2">
                          <div 
                            className={`flex items-center justify-between p-2 rounded cursor-pointer hover:opacity-80 transition-opacity ${
                              match.winner?.id === match.player1.id 
                                ? 'bg-green-600/30 border-2 border-green-500' 
                                : 'bg-gray-800/50'
                            }`}
                            onClick={() => handlePlayerClick(match.player1)}
                          >
                            <div className="flex items-center gap-2">
                              {/* ✅ IMAGEM JOGADOR 1 */}
                              <PlayerImage 
                                player={match.player1} 
                                type="icon" 
                                size="xs"
                                borderColor={match.winner?.id === match.player1.id ? 'border-green-500' : undefined}
                              />
                              <span className={`text-sm ${
                                match.winner?.id === match.player1.id 
                                  ? 'text-green-300 font-bold' 
                                  : 'text-gray-400'
                              }`}>
                                {match.player1.name.split(' ')[0]}
                              </span>
                            </div>
                            {match.winner?.id === match.player1.id && (
                              <span className="text-green-400 text-sm">✓</span>
                            )}
                          </div>
                          
                          <div 
                            className={`flex items-center justify-between p-2 rounded cursor-pointer hover:opacity-80 transition-opacity ${
                              match.winner?.id === match.player2.id 
                                ? 'bg-green-600/30 border-2 border-green-500' 
                                : 'bg-gray-800/50'
                            }`}
                            onClick={() => handlePlayerClick(match.player2)}
                          >
                            <div className="flex items-center gap-2">
                              {/* ✅ IMAGEM JOGADOR 2 */}
                              <PlayerImage 
                                player={match.player2} 
                                type="icon" 
                                size="xs"
                                borderColor={match.winner?.id === match.player2.id ? 'border-green-500' : undefined}
                              />
                              <span className={`text-sm ${
                                match.winner?.id === match.player2.id 
                                  ? 'text-green-300 font-bold' 
                                  : 'text-gray-400'
                              }`}>
                                {match.player2.name.split(' ')[0]}
                              </span>
                            </div>
                            {match.winner?.id === match.player2.id && (
                              <span className="text-green-400 text-sm">✓</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            ))}
          </div>
        </div>

        <div className="mt-8 text-center">
          <button
            onClick={onBack}
            className="bg-gray-700 hover:bg-gray-600 text-white px-8 py-3 rounded-lg font-bold transition-all"
          >
            Voltar ao Calendário
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================
// PLAYER PROFILES SCREEN
// ============================================
// PLAYER PROFILE SCREEN - NOVO SISTEMA UNIFICADO
// ============================================
const PROFILES_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Black+Ops+One&family=Rajdhani:wght@400;600;700&family=Orbitron:wght@400;700;900&display=swap');

  @keyframes prof-pulse  { 0%,100%{opacity:.5;transform:scale(1)} 50%{opacity:1;transform:scale(1.06)} }
  @keyframes prof-scan   { 0%{transform:translateY(-100%)} 100%{transform:translateY(100vh)} }
  @keyframes prof-entry  { 0%{opacity:0;transform:translateY(14px) scale(.96)} 100%{opacity:1;transform:translateY(0) scale(1)} }
  @keyframes prof-spin   { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
  @keyframes icon-glow   { 0%,100%{filter:brightness(1)} 50%{filter:brightness(1.18)} }

  .pcard {
    position: relative;
    cursor: pointer;
    transition: transform 0.18s cubic-bezier(.22,1,.36,1), box-shadow 0.18s ease;
    animation: prof-entry .4s ease both;
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.07);
    clip-path: polygon(10px 0%, 100% 0%, calc(100% - 10px) 100%, 0% 100%);
    padding: 14px 10px 12px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
  }
  .pcard:hover {
    transform: translateY(-4px) scale(1.04);
    z-index: 10;
  }
  .pcard::before {
    content: '';
    position: absolute;
    inset: 0;
    opacity: 0;
    transition: opacity .2s ease;
    background: linear-gradient(180deg, rgba(255,255,255,0.05) 0%, transparent 100%);
  }
  .pcard:hover::before { opacity: 1; }

  .pcard-icon {
    width: 64px;
    height: 64px;
    border-radius: 50%;
    object-fit: cover;
    border: 2px solid rgba(255,255,255,0.15);
    transition: border-color .18s ease, box-shadow .18s ease;
    display: block;
  }
  .pcard:hover .pcard-icon {
    animation: icon-glow 1.5s ease-in-out infinite;
  }

  .tier-elite { color: #ffd700; border-color: rgba(255,215,0,0.5); }
  .tier-top   { color: #c084fc; border-color: rgba(192,132,252,0.5); }
  .tier-pro   { color: #60a5fa; border-color: rgba(96,165,250,0.5); }

  .filter-btn {
    font-family: 'Orbitron', monospace;
    font-size: 10px;
    letter-spacing: .15em;
    padding: 5px 14px;
    border: 1px solid rgba(255,255,255,0.12);
    background: rgba(255,255,255,0.04);
    color: rgba(255,255,255,0.4);
    cursor: pointer;
    transition: all .15s ease;
    clip-path: polygon(5px 0%, 100% 0%, calc(100% - 5px) 100%, 0% 100%);
  }
  .filter-btn:hover, .filter-btn.active {
    border-color: rgba(255,215,0,0.5);
    color: #ffd700;
    background: rgba(255,215,0,0.08);
  }

  .back-btn-prof {
    font-family: 'Rajdhani', sans-serif;
    font-weight: 700;
    font-size: 13px;
    letter-spacing: .14em;
    padding: 8px 22px;
    border: 1px solid rgba(255,255,255,0.18);
    background: rgba(255,255,255,0.05);
    color: rgba(255,255,255,0.6);
    cursor: pointer;
    transition: all .15s ease;
    clip-path: polygon(7px 0%, 100% 0%, calc(100% - 7px) 100%, 0% 100%);
  }
  .back-btn-prof:hover {
    border-color: rgba(255,215,0,0.5);
    color: #ffd700;
    background: rgba(255,215,0,0.08);
  }
`;

const PlayerProfileScreen = ({ onBack }) => {
  const [selectedPlayer, setSelectedPlayer] = React.useState(null);
  const [filter, setFilter] = React.useState('ALL');
  const [search, setSearch] = React.useState('');

  const tierOrder = { ELITE: 0, TOP: 1, PRO: 2 };
  const filtered = TEAMS
    .map((p, i) => ({ ...p, _idx: i }))
    .filter(p => filter === 'ALL' || p.tier === filter)
    .filter(p => !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.country.toLowerCase().includes(search.toLowerCase()));

  const counts = { ALL: TEAMS.length, ELITE: 0, TOP: 0, PRO: 0 };
  TEAMS.forEach(p => { if (counts[p.tier] !== undefined) counts[p.tier]++; });

  if (selectedPlayer !== null) {
    return (
      <UnifiedPlayerProfile
        playerId={selectedPlayer}
        onClose={() => setSelectedPlayer(null)}
        universeManager={null}
        variant="fullscreen"
      />
    );
  }

  return (
    <div style={{
      width: '100vw', minHeight: '100vh',
      background: 'radial-gradient(ellipse 120% 90% at 50% 110%, #1a0030 0%, #0a000f 45%, #000008 100%)',
      position: 'relative', overflow: 'hidden', fontFamily: 'Rajdhani, sans-serif',
    }}>
      <style>{PROFILES_STYLES}</style>

      {/* Grid background */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none',
        backgroundImage: `linear-gradient(rgba(0,212,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,255,0.03) 1px, transparent 1px)`,
        backgroundSize: '60px 60px',
        maskImage: 'radial-gradient(ellipse 80% 60% at 50% 100%, black, transparent)',
        WebkitMaskImage: 'radial-gradient(ellipse 80% 60% at 50% 100%, black, transparent)',
      }} />

      {/* Ambient orbs */}
      <div style={{ position: 'fixed', top: '5%', left: '10%', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(180,0,255,0.08), transparent 70%)', filter: 'blur(60px)', pointerEvents: 'none' }} />
      <div style={{ position: 'fixed', bottom: '10%', right: '8%', width: 350, height: 350, borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,212,255,0.07), transparent 70%)', filter: 'blur(60px)', pointerEvents: 'none' }} />

      {/* Scanline */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 50, opacity: 0.15 }}>
        <div style={{ width: '100%', height: '2px', background: 'linear-gradient(90deg, transparent, rgba(0,212,255,0.8), transparent)', animation: 'prof-scan 8s linear infinite' }} />
      </div>

      {/* Top bar */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 40,
        background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(255,215,0,0.1)',
        padding: '0 32px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        height: 56,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#ffd700', boxShadow: '0 0 8px #ffd700', animation: 'prof-pulse 2s ease-in-out infinite' }} />
          <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 11, letterSpacing: '0.4em', color: 'rgba(255,215,0,0.7)', textTransform: 'uppercase' }}>
            BAYBLADE: UNIVERSE — PERFIS
          </span>
        </div>
        <button className="back-btn-prof" onClick={onBack}>← MENU</button>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '28px 28px 48px' }}>

        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontFamily: 'Black Ops One, cursive', fontSize: 'clamp(32px,4vw,52px)', lineHeight: 1,
            background: 'linear-gradient(180deg, #fff 0%, #ffd700 45%, #ff8c00 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            filter: 'drop-shadow(0 0 20px rgba(255,165,0,0.4))',
            marginBottom: 4,
          }}>
            FIGHTERS
          </div>
          <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 11, letterSpacing: '0.35em', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase' }}>
            {counts.ALL} BLADERS REGISTRADOS — WORLD CHAMPIONSHIP SERIES
          </div>
        </div>

        {/* Controls bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
          {/* Filter buttons */}
          {[
            { key: 'ALL',   label: `TODOS  ${counts.ALL}` },
            { key: 'ELITE', label: `ELITE  ${counts.ELITE}` },
            { key: 'TOP',   label: `TOP  ${counts.TOP}` },
            { key: 'PRO',   label: `PRO  ${counts.PRO}` },
          ].map(f => (
            <button key={f.key} className={`filter-btn ${filter === f.key ? 'active' : ''}`} onClick={() => setFilter(f.key)}>
              {f.label}
            </button>
          ))}

          {/* Search */}
          <div style={{ marginLeft: 'auto', position: 'relative' }}>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="BUSCAR FIGHTER..."
              style={{
                fontFamily: 'Orbitron, monospace', fontSize: 10, letterSpacing: '.12em',
                padding: '6px 14px 6px 32px',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.12)',
                color: 'rgba(255,255,255,0.6)',
                outline: 'none',
                clipPath: 'polygon(5px 0%, 100% 0%, calc(100% - 5px) 100%, 0% 100%)',
                width: 200,
              }}
            />
            <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.25)', fontSize: 13 }}>🔍</span>
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: 'linear-gradient(90deg, rgba(255,215,0,0.4), rgba(255,215,0,0.05) 60%, transparent)', marginBottom: 20 }} />

        {/* Player Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
          gap: 8,
        }}>
          {filtered.map((player, i) => {
            const primaryColor = player.colors?.[0] || '#ffd700';
            const tierClass = player.tier === 'ELITE' ? 'tier-elite' : player.tier === 'TOP' ? 'tier-top' : 'tier-pro';
            const tierLabel = player.tier === 'ELITE' ? '★ ELITE' : player.tier === 'TOP' ? '◆ TOP' : '● PRO';
            const shortName = player.name.replace(/"[^"]*"\s*/, '');

            return (
              <button
                key={player._idx}
                className="pcard"
                onClick={() => setSelectedPlayer(player._idx)}
                style={{ animationDelay: `${Math.min(i * 0.018, 0.6)}s` }}
                onMouseEnter={e => {
                  e.currentTarget.style.boxShadow = `0 0 24px ${primaryColor}44, 0 8px 32px rgba(0,0,0,0.6)`;
                  e.currentTarget.style.borderColor = `${primaryColor}66`;
                  e.currentTarget.querySelector('.pcard-icon').style.borderColor = primaryColor;
                  e.currentTarget.querySelector('.pcard-icon').style.boxShadow = `0 0 16px ${primaryColor}88`;
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.boxShadow = '';
                  e.currentTarget.style.borderColor = '';
                  e.currentTarget.querySelector('.pcard-icon').style.borderColor = 'rgba(255,255,255,0.15)';
                  e.currentTarget.querySelector('.pcard-icon').style.boxShadow = '';
                }}
              >
                {/* Icon */}
                <img
                  className="pcard-icon"
                  src={player.iconUrl || player.photoUrl}
                  alt={player.name}
                  onError={e => { e.target.src = player.photoUrl; }}
                />

                {/* Name */}
                <div style={{
                  fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, fontSize: 11,
                  color: 'rgba(255,255,255,0.9)', letterSpacing: '.04em', textAlign: 'center',
                  lineHeight: 1.2, maxWidth: '100%',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {shortName.split(' ').slice(0, 2).join(' ')}
                </div>

                {/* Country */}
                <div style={{ fontSize: 11, lineHeight: 1 }}>{player.country.split(' ')[0]}</div>

                {/* Tier badge */}
                <div className={tierClass} style={{
                  fontFamily: 'Orbitron, monospace', fontSize: 8, fontWeight: 700,
                  letterSpacing: '.14em', border: '1px solid',
                  padding: '2px 7px',
                  clipPath: 'polygon(4px 0%, 100% 0%, calc(100% - 4px) 100%, 0% 100%)',
                }}>
                  {tierLabel}
                </div>
              </button>
            );
          })}
        </div>

        {/* Empty state */}
        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'rgba(255,255,255,0.25)', fontFamily: 'Orbitron, monospace', fontSize: 12, letterSpacing: '.2em' }}>
            NENHUM FIGHTER ENCONTRADO
          </div>
        )}

        {/* Footer count */}
        <div style={{ marginTop: 24, textAlign: 'center', fontFamily: 'Orbitron, monospace', fontSize: 9, letterSpacing: '.25em', color: 'rgba(255,255,255,0.15)' }}>
          {filtered.length} / {counts.ALL} FIGHTERS EXIBIDOS
        </div>
      </div>

      {/* Floor glow */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, transparent, rgba(255,180,0,0.7) 30%, #ffd700 50%, rgba(255,180,0,0.7) 70%, transparent)', boxShadow: '0 0 40px rgba(255,215,0,0.4)', pointerEvents: 'none', zIndex: 30 }} />
    </div>
  );
};

// ABA 1: PERFIL
const ProfileTab = ({ player }) => {
  const attrs = player.attributes || { attack: 5, defense: 5, stamina: 5, speed: 5, technique: 5, intelligence: 5, adaptability: 5, clutch: 5, launchPower: 5 };
  const totalPoints = Object.values(attrs).reduce((a, b) => a + b, 0);
  const tierInfo = {
    'ELITE': { name: 'Elite Mundial', color: 'text-yellow-400', maxPoints: 40 },
    'TOP': { name: 'Top Tier', color: 'text-purple-400', maxPoints: 38 },
    'PRO': { name: 'Profissional', color: 'text-blue-400', maxPoints: 36 }
  };
  const tier = tierInfo[player.tier] || tierInfo['PRO'];
  
  return (
    <div className="grid grid-cols-3 gap-8">
      <div className="col-span-1">
        <div className="bg-gray-800 rounded-xl overflow-hidden border-4 border-purple-500">
          <img
            src={player.fullBodyUrl || player.photoUrl}
            alt={player.name}
            className="w-full aspect-[9/16] object-cover"
          />
        </div>
      </div>
      
      <div className="col-span-2 space-y-6">
        <div className="bg-gray-800 rounded-xl p-6 border-2 border-gray-700">
          <h2 className="text-2xl font-black text-purple-400 mb-4">INFORMAÇÕES BÁSICAS</h2>
          <div className="space-y-3 text-lg">
            <div className="flex justify-between">
              <span className="text-gray-400">Nome:</span>
              <span className="text-white font-bold">{player.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Nacionalidade:</span>
              <span className="text-white font-bold">{player.country}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Descrição Física:</span>
              <span className="text-white font-bold text-right">{player.physicalDesc}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Categoria:</span>
              <span className={`font-bold ${tier.color}`}>{tier.name}</span>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl p-6 border-2 border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-black text-purple-400">ATRIBUTOS</h2>
            <span className="text-sm text-gray-400">Total: <span className="text-white font-bold">{totalPoints}/{tier.maxPoints + 20}</span></span>
          </div>
          
          <div className="space-y-4">
            {/* Attack */}
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-bold text-gray-300">⚔️ ATTACK</span>
                <span className="text-sm font-bold text-white">{attrs.attack}/20</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-red-600 to-red-400 h-full rounded-full transition-all duration-500"
                  style={{ width: `${(attrs.attack / 20) * 100}%` }}
                />
              </div>
            </div>
            
            {/* Defense */}
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-bold text-gray-300">🛡️ DEFENSE</span>
                <span className="text-sm font-bold text-white">{attrs.defense}/20</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-blue-600 to-blue-400 h-full rounded-full transition-all duration-500"
                  style={{ width: `${(attrs.defense / 20) * 100}%` }}
                />
              </div>
            </div>
            
            {/* Stamina */}
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-bold text-gray-300">⚡ STAMINA</span>
                <span className="text-sm font-bold text-white">{attrs.stamina}/20</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-green-600 to-green-400 h-full rounded-full transition-all duration-500"
                  style={{ width: `${(attrs.stamina / 20) * 100}%` }}
                />
              </div>
            </div>
            
            {/* Speed */}
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-bold text-gray-300">💨 SPEED</span>
                <span className="text-sm font-bold text-white">{attrs.speed}/20</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-yellow-600 to-yellow-400 h-full rounded-full transition-all duration-500"
                  style={{ width: `${(attrs.speed / 20) * 100}%` }}
                />
              </div>
            </div>
            
            {/* Technique */}
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-bold text-gray-300">🎯 TECHNIQUE</span>
                <span className="text-sm font-bold text-white">{attrs.technique}/20</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-purple-600 to-purple-400 h-full rounded-full transition-all duration-500"
                  style={{ width: `${(attrs.technique / 20) * 100}%` }}
                />
              </div>
            </div>
            
            {/* Intelligence */}
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-bold text-gray-300">🧠 INTELLIGENCE</span>
                <span className="text-sm font-bold text-white">{attrs.intelligence}/20</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-cyan-600 to-cyan-400 h-full rounded-full transition-all duration-500"
                  style={{ width: `${(attrs.intelligence / 20) * 100}%` }}
                />
              </div>
            </div>
            
            {/* Adaptability */}
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-bold text-gray-300">🌍 ADAPTABILITY</span>
                <span className="text-sm font-bold text-white">{attrs.adaptability}/20</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-green-600 to-green-400 h-full rounded-full transition-all duration-500"
                  style={{ width: `${(attrs.adaptability / 20) * 100}%` }}
                />
              </div>
            </div>
            
            {/* Clutch */}
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-bold text-gray-300">🔥 CLUTCH</span>
                <span className="text-sm font-bold text-white">{attrs.clutch}/20</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-orange-600 to-orange-400 h-full rounded-full transition-all duration-500"
                  style={{ width: `${(attrs.clutch / 20) * 100}%` }}
                />
              </div>
            </div>
            
            {/* Launch Power */}
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-bold text-gray-300">🚀 LAUNCH POWER</span>
                <span className="text-sm font-bold text-white">{attrs.launchPower}/20</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-cyan-600 to-amber-400 h-full rounded-full transition-all duration-500"
                  style={{ width: `${(attrs.launchPower / 20) * 100}%` }}
                />
              </div>
            </div>
          </div>
          
          {/* Deck Composition Info */}
          <div className="mt-6 pt-6 border-t border-gray-700">
            <h3 className="text-sm font-bold text-gray-400 mb-3">📦 COMPOSIÇÃO DO DECK</h3>
            <div className="text-sm text-gray-300">
              {attrs.intelligence <= 5 && "• 4-5 peões do estilo principal"}
              {attrs.intelligence >= 6 && attrs.intelligence <= 10 && "• 3 peões principais + 1-2 versáteis"}
              {attrs.intelligence >= 11 && attrs.intelligence <= 13 && "• 2-3 peões principais + counters estratégicos"}
              {attrs.intelligence >= 14 && "• Deck mestrado: core + counters + wildcard"}
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl p-6 border-2 border-gray-700">
          <h2 className="text-2xl font-black text-purple-400 mb-4">ESTILO DE JOGO</h2>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="text-gray-400">Mentalidade:</span>
              <span className="px-4 py-2 bg-purple-600 text-white font-bold rounded-lg">
                {player.mentality.replace(/_/g, ' ')}
              </span>
            </div>
            <div className="text-gray-300 mt-4">
              {player.playStyle}
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl p-6 border-2 border-gray-700">
          <h2 className="text-2xl font-black text-purple-400 mb-4">CORES</h2>
          <div className="flex gap-4">
            {player.colors.map((color, idx) => (
              <div
                key={idx}
                className="w-20 h-20 rounded-lg border-4 border-gray-600"
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// ABA 2: BUILD
const BuildTab = ({ player }) => {
  const exampleBuild = MENTALITIES[player.mentality]?.buildDeck?.(player) || [];
  const intel = player.attributes?.intelligence || 5;
  
  return (
    <div className="space-y-6">
      <div className="bg-gray-800 rounded-xl p-6 border-2 border-gray-700">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-3xl font-black text-purple-400">BUILD DA TEMPORADA</h2>
            <p className="text-gray-400 mt-2">Mentalidade: <span className="text-purple-400 font-bold">{player.mentality.replace(/_/g, ' ')}</span></p>
            <p className="text-sm text-gray-500 mt-1">
              Intelligence {intel}/20 - {intel >= 14 ? 'Mestre Tático' : intel >= 11 ? 'Estrategista' : intel >= 6 ? 'Competente' : 'Instintivo'}
            </p>
          </div>
        </div>
        
        <div className="grid grid-cols-5 gap-4">
          {exampleBuild.map((bey, idx) => (
            <div key={idx} className={`bg-gray-900 rounded-lg p-4 border-2 ${
              idx < (intel <= 5 ? 4 : intel <= 10 ? 3 : 2) ? 'border-purple-500' : 'border-gray-700'
            }`}>
              <div className="text-center mb-3">
                <span className="text-3xl">{['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣'][idx]}</span>
                {idx < (intel <= 5 ? 4 : intel <= 10 ? 3 : 2) && (
                  <div className="text-xs text-purple-400 mt-1">Core</div>
                )}
                {idx >= (intel <= 5 ? 4 : intel <= 10 ? 3 : 2) && intel >= 6 && (
                  <div className="text-xs text-cyan-400 mt-1">Counter</div>
                )}
              </div>
              <h3 className="text-lg font-bold text-white mb-2 text-center truncate">{bey.name}</h3>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-400">Blade:</span>
                  <span className="text-white truncate ml-1">{bey.blade}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Ratchet:</span>
                  <span className="text-white truncate ml-1">{bey.ratchet}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Bit:</span>
                  <span className="text-white truncate ml-1">{bey.bit}</span>
                </div>
                <div className="mt-3 pt-3 border-t border-gray-700">
                  <div className="text-xs text-gray-400 mb-2">STATS</div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-1">
                      <span className="text-red-400 w-10 text-xs">ATK:</span>
                      <div className="flex-1 bg-gray-700 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-red-500 h-full" style={{ width: `${(bey.stats.attack / 100) * 100}%` }} />
                      </div>
                      <span className="text-white w-6 text-right text-xs">{bey.stats.attack}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-blue-400 w-10 text-xs">DEF:</span>
                      <div className="flex-1 bg-gray-700 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-blue-500 h-full" style={{ width: `${(bey.stats.defense / 100) * 100}%` }} />
                      </div>
                      <span className="text-white w-6 text-right text-xs">{bey.stats.defense}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-green-400 w-10 text-xs">STA:</span>
                      <div className="flex-1 bg-gray-700 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-green-500 h-full" style={{ width: `${(bey.stats.stamina / 100) * 100}%` }} />
                      </div>
                      <span className="text-white w-6 text-right text-xs">{bey.stats.stamina}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-6 p-4 bg-gray-900 rounded-lg border border-gray-700">
          <h3 className="text-sm font-bold text-gray-400 mb-2">💡 ESTRATÉGIA DO DECK</h3>
          <p className="text-sm text-gray-300">
            {intel <= 5 && "Deck focado totalmente no estilo principal. Previsível mas dominante quando funciona."}
            {intel >= 6 && intel <= 10 && "Deck balanceado com opções versáteis. Pode se adaptar a diferentes situações."}
            {intel >= 11 && intel <= 13 && "Deck estratégico com counters específicos. Preparado para neutralizar oponentes."}
            {intel >= 14 && "Deck de mestre: combinação perfeita de especialização e versatilidade tática."}
          </p>
        </div>
      </div>
    </div>
  );
};

// ABA 3: CARTEL GERAL
const CartelTab = ({ player, playerIndex }) => {
  // Dados zerados - serão preenchidos pelo modo universo
  const mockStats = {
    totalMatches: 0,
    wins: 0,
    losses: 0,
    winRate: 0,
    burstWins: 0,
    spinWins: 0,
    ringOutWins: 0,
    vsPlayers: []
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-gray-800 rounded-xl p-6 border-2 border-gray-700">
          <h2 className="text-2xl font-black text-purple-400 mb-4">ESTATÍSTICAS GERAIS</h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Total de Partidas:</span>
              <span className="text-3xl font-black text-white">{mockStats.totalMatches}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Vitórias:</span>
              <span className="text-3xl font-black text-green-400">{mockStats.wins}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Derrotas:</span>
              <span className="text-3xl font-black text-red-400">{mockStats.losses}</span>
            </div>
            <div className="flex justify-between items-center pt-4 border-t border-gray-700">
              <span className="text-gray-400">Taxa de Vitória:</span>
              <span className="text-3xl font-black text-purple-400">{mockStats.winRate}%</span>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl p-6 border-2 border-gray-700">
          <h2 className="text-2xl font-black text-purple-400 mb-4">VITÓRIAS POR TIPO</h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-400">💥 Burst Finish:</span>
              <span className="text-2xl font-black text-red-400">{mockStats.burstWins}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">⚡ Spin Finish:</span>
              <span className="text-2xl font-black text-blue-400">{mockStats.spinWins}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">🚀 Ring Out:</span>
              <span className="text-2xl font-black text-green-400">{mockStats.ringOutWins}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-gray-800 rounded-xl p-6 border-2 border-gray-700">
        <h2 className="text-2xl font-black text-purple-400 mb-4">HISTÓRICO VS OUTROS JOGADORES</h2>
        <div className="text-center py-8 text-gray-500">
          Dados serão preenchidos conforme partidas acontecem no modo universo
        </div>
      </div>
    </div>
  );
};

// ABA 4: HISTÓRICO NAS ARENAS
const ArenasTab = ({ player, playerIndex }) => {
  const arenas = [
    { name: 'BB-10', icon: '🏆', color: 'blue' },
    { name: 'Prismatic Nexus', icon: '🌀', color: 'purple' },
    { name: 'Colosseum Carnage', icon: '💀', color: 'red' },
    { name: 'Volcanic Rage', icon: '🌋', color: 'red' },
    { name: 'Vortex Coliseum', icon: '🌪️', color: 'indigo' },
    { name: 'Pinball Inferno', icon: '🎯', color: 'orange' },
    { name: 'Pangea Platform', icon: '💿', color: 'gray' },
    { name: 'Killer Sides', icon: '⚔️', color: 'red' }
  ];

  // Dados zerados - serão preenchidos pelo modo universo
  const arenaStats = arenas.map(arena => ({
    ...arena,
    matches: 0,
    wins: 0,
    losses: 0
  }));

  return (
    <div className="space-y-6">
      <div className="bg-gray-800 rounded-xl p-6 border-2 border-gray-700">
        <h2 className="text-3xl font-black text-purple-400 mb-6">DESEMPENHO POR ARENA</h2>
        
        <div className="text-center py-8 text-gray-500">
          Dados serão preenchidos conforme partidas acontecem nas diferentes arenas
        </div>
      </div>
    </div>
  );
};

// ABA 5: TÍTULOS E VICES
const TitlesTab = ({ player, playerIndex }) => {
  // Dados zerados - serão preenchidos pelo modo universo
  const titles = [];

  const grandSlamTitles = 0;
  const grandSlamRunnerups = 0;
  const atp250Titles = 0;
  const atp250Runnerups = 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-yellow-600 to-yellow-800 rounded-xl p-6 border-2 border-yellow-500">
          <div className="text-center">
            <div className="text-6xl mb-2">🏆</div>
            <div className="text-4xl font-black text-white">{grandSlamTitles}</div>
            <div className="text-sm text-yellow-100">Grand Slams</div>
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-gray-400 to-gray-600 rounded-xl p-6 border-2 border-gray-400">
          <div className="text-center">
            <div className="text-6xl mb-2">🥈</div>
            <div className="text-4xl font-black text-white">{grandSlamRunnerups}</div>
            <div className="text-sm text-gray-100">Vices GS</div>
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-xl p-6 border-2 border-blue-500">
          <div className="text-center">
            <div className="text-6xl mb-2">🏅</div>
            <div className="text-4xl font-black text-white">{atp250Titles}</div>
            <div className="text-sm text-blue-100">ATP 250</div>
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-gray-600 to-gray-800 rounded-xl p-6 border-2 border-gray-500">
          <div className="text-center">
            <div className="text-6xl mb-2">🥉</div>
            <div className="text-4xl font-black text-white">{atp250Runnerups}</div>
            <div className="text-sm text-gray-100">Vices ATP</div>
          </div>
        </div>
      </div>

      <div className="bg-gray-800 rounded-xl p-6 border-2 border-gray-700">
        <h2 className="text-2xl font-black text-purple-400 mb-6">HISTÓRICO DE TÍTULOS E VICES</h2>
        
        <div className="text-center py-8 text-gray-500">
          Dados serão preenchidos conforme títulos forem conquistados no modo universo
        </div>
      </div>
    </div>
  );
};

// ─── MENU SCREEN STYLES ─────────────────────────────────────────────────────
const MENU_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Black+Ops+One&family=Rajdhani:wght@400;600;700&family=Orbitron:wght@400;700;900&display=swap');

  @keyframes bey-spin {
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
  }
  @keyframes bey-spin-rev {
    from { transform: rotate(360deg); }
    to   { transform: rotate(0deg); }
  }
  @keyframes scanline {
    0%   { transform: translateY(-100%); }
    100% { transform: translateY(100vh); }
  }
  @keyframes energy-pulse {
    0%,100% { opacity: 0.4; transform: scale(1); }
    50%      { opacity: 0.9; transform: scale(1.05); }
  }
  @keyframes lightning {
    0%,90%,100% { opacity: 0; }
    5%,85%      { opacity: 1; }
  }
  @keyframes fighter-appear {
    0%   { opacity: 0; transform: scale(1.06) translateY(12px); }
    100% { opacity: 1; transform: scale(1) translateY(0); }
  }
  @keyframes fighter-disappear {
    0%   { opacity: 1; transform: scale(1); }
    100% { opacity: 0; transform: scale(0.96) translateY(-8px); }
  }
  @keyframes title-flicker {
    0%,96%,100% { opacity: 1; }
    97%,99%     { opacity: 0.85; }
  }
  @keyframes holo-shift {
    0%   { background-position: 0% 50%; }
    50%  { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
  }
  @keyframes dust-float {
    0%   { transform: translateY(0)   translateX(0)   scale(1);   opacity: 0; }
    20%  { opacity: 0.6; }
    80%  { opacity: 0.3; }
    100% { transform: translateY(-80px) translateX(20px) scale(0.5); opacity: 0; }
  }
  @keyframes menu-entry {
    0%   { opacity: 0; transform: translateX(-28px) skewX(-2deg); }
    100% { opacity: 1; transform: translateX(0) skewX(0); }
  }
  @keyframes counter-spin {
    0%   { transform: rotate(0deg) scale(1); }
    50%  { transform: rotate(180deg) scale(1.08); }
    100% { transform: rotate(360deg) scale(1); }
  }
  @keyframes glow-breathe {
    0%,100% { box-shadow: 0 0 20px rgba(255,215,0,0.3), 0 0 40px rgba(255,215,0,0.1); }
    50%     { box-shadow: 0 0 40px rgba(255,215,0,0.7), 0 0 80px rgba(255,215,0,0.3); }
  }

  .menu-btn {
    font-family: 'Rajdhani', sans-serif;
    font-weight: 700;
    position: relative;
    overflow: hidden;
    letter-spacing: 0.12em;
    transition: all 0.18s cubic-bezier(0.22,1,0.36,1);
    clip-path: polygon(8px 0%, 100% 0%, calc(100% - 8px) 100%, 0% 100%);
  }
  .menu-btn::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.12) 50%, transparent 100%);
    transform: translateX(-100%);
    transition: transform 0.5s ease;
  }
  .menu-btn:hover::before { transform: translateX(100%); }
  .menu-btn:hover { transform: translateY(-2px) scale(1.025); }
  .menu-btn:active { transform: translateY(0) scale(0.98); }

  .universe-btn {
    background: linear-gradient(135deg, #ffd700 0%, #ff8c00 40%, #ff4500 100%);
    color: #0a0008;
    text-shadow: 0 1px 0 rgba(255,255,255,0.3);
    animation: glow-breathe 3s ease-in-out infinite;
  }
  .universe-btn::after {
    content: '';
    position: absolute;
    top: -1px; left: -1px; right: -1px; bottom: -1px;
    background: linear-gradient(135deg, #ffd700, #ff4500);
    z-index: -1;
    filter: blur(8px);
    opacity: 0.5;
    clip-path: polygon(8px 0%, 100% 0%, calc(100% - 8px) 100%, 0% 100%);
  }

  .title-main {
    font-family: 'Black Ops One', cursive;
    background: linear-gradient(180deg, #ffffff 0%, #ffd700 40%, #ff8c00 80%, #c44800 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    filter: drop-shadow(0 0 30px rgba(255,165,0,0.6)) drop-shadow(0 4px 8px rgba(0,0,0,0.8));
    animation: title-flicker 8s infinite;
  }
  .title-sub {
    font-family: 'Orbitron', monospace;
    background: linear-gradient(90deg, #00d4ff, #7b2fff, #ff3a6e, #00d4ff);
    background-size: 300% 100%;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    animation: holo-shift 4s ease infinite;
    filter: drop-shadow(0 0 15px rgba(0,212,255,0.5));
  }
  .fighter-card {
    pointer-events: none;
    position: absolute;
    bottom: 0;
    width: 220px;
    height: 420px;
    background-size: cover;
    background-position: top center;
    mask-image: linear-gradient(to top, transparent 0%, rgba(0,0,0,0.3) 12%, black 30%, black 85%, transparent 100%);
    -webkit-mask-image: linear-gradient(to top, transparent 0%, rgba(0,0,0,0.3) 12%, black 30%, black 85%, transparent 100%);
  }
  .fighter-left  { left: 0; mask-image: linear-gradient(to right, transparent 0%, black 25%, black 85%, transparent 100%), linear-gradient(to top, transparent 0%, rgba(0,0,0,0.3) 12%, black 30%, black 90%, transparent 100%); -webkit-mask-image: linear-gradient(to right, transparent 0%, black 25%, black 85%, transparent 100%); }
  .fighter-right { right: 0; mask-image: linear-gradient(to left, transparent 0%, black 25%, black 85%, transparent 100%), linear-gradient(to top, transparent 0%, rgba(0,0,0,0.3) 12%, black 30%, black 90%, transparent 100%); -webkit-mask-image: linear-gradient(to left, transparent 0%, black 25%, black 85%, transparent 100%); transform: scaleX(-1); }
`;

const MenuScreen = ({ onStartExhibition, onStartUniverse, onShowProfiles, onShowSettings, onSimTest }) => {
  const [showArenasInfo, setShowArenasInfo] = React.useState(false);

  // ── Fighter showcase state ──
  // Apenas os 64 jogadores originais no showcase do menu (sem newgens)
  const allFighters = React.useMemo(() =>
    TEAMS.filter((t, idx) => idx < 64 && t.fullBodyUrl && !t.fullBodyUrl.includes('placeholder')), []);

  const pickRandom = (exclude = []) => {
    const pool = allFighters.filter(f => !exclude.includes(f));
    return pool[Math.floor(Math.random() * pool.length)];
  };

  const [leftFighter,  setLeftFighter]  = React.useState(() => pickRandom());
  const [rightFighter, setRightFighter] = React.useState(() => pickRandom([leftFighter]));
  const [leftVisible,  setLeftVisible]  = React.useState(true);
  const [rightVisible, setRightVisible] = React.useState(true);
  const [leftAnim,     setLeftAnim]     = React.useState('fighter-appear 0.8s ease forwards');
  const [rightAnim,    setRightAnim]    = React.useState('fighter-appear 0.8s ease forwards');

  // Randomise left fighter every 4–7s, right fighter with a 2s offset
  React.useEffect(() => {
    let leftTimer, rightTimer;
    const scheduleLeft = () => {
      const delay = 4000 + Math.random() * 3000;
      leftTimer = setTimeout(() => {
        setLeftAnim('fighter-disappear 0.6s ease forwards');
        setTimeout(() => {
          setLeftFighter(prev => pickRandom([prev, rightFighter]));
          setLeftAnim('fighter-appear 0.9s ease forwards');
        }, 650);
        scheduleLeft();
      }, delay);
    };
    const scheduleRight = () => {
      const delay = 5000 + Math.random() * 3500;
      rightTimer = setTimeout(() => {
        setRightAnim('fighter-disappear 0.6s ease forwards');
        setTimeout(() => {
          setRightFighter(prev => pickRandom([leftFighter, prev]));
          setRightAnim('fighter-appear 0.9s ease forwards');
        }, 650);
        scheduleRight();
      }, delay);
    };
    setTimeout(scheduleLeft, 500);
    setTimeout(scheduleRight, 2500);
    return () => { clearTimeout(leftTimer); clearTimeout(rightTimer); };
  }, []);

  // ── Spin particles ──
  const particles = React.useMemo(() => Array.from({length: 18}, (_, i) => ({
    id: i,
    size:  20 + Math.random() * 50,
    x:     Math.random() * 100,
    y:     Math.random() * 100,
    dur:   6 + Math.random() * 10,
    delay: Math.random() * 5,
    rev:   Math.random() > 0.5,
    op:    0.04 + Math.random() * 0.08,
  })), []);

  if (showArenasInfo) return <ArenasInfoScreen onBack={() => setShowArenasInfo(false)} />;

  return (
    <div style={{
      width: '100vw', height: '100vh',
      background: 'radial-gradient(ellipse 120% 90% at 50% 110%, #1a0030 0%, #0a000f 45%, #000008 100%)',
      position: 'relative', overflow: 'hidden', fontFamily: 'Rajdhani, sans-serif',
      display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      <style>{MENU_STYLES}</style>

      {/* ── DEEP GRID FLOOR ── */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `
          linear-gradient(rgba(0,212,255,0.04) 1px, transparent 1px),
          linear-gradient(90deg, rgba(0,212,255,0.04) 1px, transparent 1px)
        `,
        backgroundSize: '60px 60px',
        maskImage: 'radial-gradient(ellipse 80% 60% at 50% 100%, black, transparent)',
        WebkitMaskImage: 'radial-gradient(ellipse 80% 60% at 50% 100%, black, transparent)',
      }} />

      {/* ── SCANLINE ── */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 50, opacity: 0.3
      }}>
        <div style={{
          width: '100%', height: '3px',
          background: 'linear-gradient(90deg, transparent, rgba(0,212,255,0.6), transparent)',
          animation: 'scanline 6s linear infinite',
        }} />
      </div>

      {/* ── AMBIENT ORBS ── */}
      <div style={{ position: 'absolute', top: '10%', left: '15%', width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,100,0,0.12), transparent 70%)', filter: 'blur(40px)', animation: 'energy-pulse 5s ease-in-out infinite' }} />
      <div style={{ position: 'absolute', bottom: '20%', right: '12%', width: 250, height: 250, borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,212,255,0.10), transparent 70%)', filter: 'blur(40px)', animation: 'energy-pulse 6s ease-in-out infinite 1.5s' }} />
      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,180,0,0.05), transparent 65%)', filter: 'blur(30px)', animation: 'energy-pulse 8s ease-in-out infinite 0.5s' }} />

      {/* ── SPINNING BEY PARTICLES ── */}
      {particles.map(p => (
        <div key={p.id} style={{
          position: 'absolute',
          left: `${p.x}%`, top: `${p.y}%`,
          width: p.size, height: p.size,
          border: `${p.rev ? 2 : 1.5}px solid rgba(255,215,0,${p.op * 1.5})`,
          borderRadius: '50%',
          animation: `${p.rev ? 'bey-spin-rev' : 'bey-spin'} ${p.dur}s linear infinite ${p.delay}s`,
          pointerEvents: 'none',
        }}>
          <div style={{
            position: 'absolute', top: '10%', left: '10%', right: '10%', bottom: '10%',
            border: `1px solid rgba(0,212,255,${p.op})`,
            borderRadius: '50%',
          }} />
        </div>
      ))}

      {/* ── FLOOR GLOW LINE ── */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: 2,
        background: 'linear-gradient(90deg, transparent 0%, rgba(255,180,0,0.7) 30%, rgba(255,215,0,1) 50%, rgba(255,180,0,0.7) 70%, transparent 100%)',
        boxShadow: '0 0 40px rgba(255,215,0,0.5), 0 -2px 60px rgba(255,130,0,0.3)',
      }} />
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: 180,
        background: 'linear-gradient(to top, rgba(255,100,0,0.08), transparent)',
        pointerEvents: 'none',
      }} />

      {/* ── LEFT FIGHTER ── */}
      {/* ── LEFT FIGHTER ── */}
      <div style={{ position: 'absolute', left: 0, bottom: 0, height: '100%', width: '38vw', minWidth: 380, zIndex: 5 }}>
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: `url(${leftFighter?.fullBodyUrl})`,
          backgroundSize: 'contain',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'bottom left',
          animation: leftAnim,
          filter: `drop-shadow(0 0 50px ${leftFighter?.colors?.[0] || 'rgba(255,100,0,0.6)'}) drop-shadow(0 0 20px rgba(0,0,0,0.9))`,
          maskImage: 'linear-gradient(to right, black 30%, rgba(0,0,0,0.85) 55%, transparent 82%), linear-gradient(to top, transparent 0%, rgba(0,0,0,0.5) 6%, black 16%)',
          WebkitMaskImage: 'linear-gradient(to right, black 30%, rgba(0,0,0,0.85) 55%, transparent 82%), linear-gradient(to top, transparent 0%, rgba(0,0,0,0.5) 6%, black 16%)',
        }} />
        {/* Fighter color strip */}
        <div style={{
          position: 'absolute', left: 0, top: '8%', bottom: 0, width: 4,
          background: `linear-gradient(to bottom, transparent, ${leftFighter?.colors?.[0] || '#ffd700'} 30%, ${leftFighter?.colors?.[0] || '#ffd700'} 80%, transparent)`,
          boxShadow: `0 0 18px ${leftFighter?.colors?.[0] || '#ffd700'}, 0 0 40px ${leftFighter?.colors?.[0] || '#ffd700'}55`,
        }} />
        {/* Fighter name tag */}
        <div style={{
          position: 'absolute', bottom: '9%', left: 16,
          fontFamily: 'Orbitron, monospace', fontSize: 13, fontWeight: 700,
          color: leftFighter?.colors?.[0] || '#ffd700',
          letterSpacing: '0.18em', textTransform: 'uppercase',
          textShadow: `0 0 14px ${leftFighter?.colors?.[0] || '#ffd700'}, 0 2px 6px rgba(0,0,0,0.9)`,
          opacity: 0.95,
        }}>
          {leftFighter?.name?.replace(/"[^"]*"/, '').trim().split(' ').slice(0,2).join(' ')}
        </div>
        {/* Mentality badge */}
        <div style={{
          position: 'absolute', bottom: 'calc(9% + 22px)', left: 16,
          fontFamily: 'Orbitron, monospace', fontSize: 9, fontWeight: 400,
          color: 'rgba(255,255,255,0.45)', letterSpacing: '0.25em', textTransform: 'uppercase',
        }}>
          {leftFighter?.mentality?.replace(/_/g, ' ')}
        </div>
      </div>

      {/* ── RIGHT FIGHTER ── */}
      <div style={{ position: 'absolute', right: 0, bottom: 0, height: '100%', width: '38vw', minWidth: 380, zIndex: 5 }}>
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: `url(${rightFighter?.fullBodyUrl})`,
          backgroundSize: 'contain',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'bottom right',
          animation: rightAnim,
          transform: 'scaleX(-1)',
          filter: `drop-shadow(0 0 50px ${rightFighter?.colors?.[0] || 'rgba(0,180,255,0.6)'}) drop-shadow(0 0 20px rgba(0,0,0,0.9))`,
          maskImage: 'linear-gradient(to left, black 30%, rgba(0,0,0,0.85) 55%, transparent 82%), linear-gradient(to top, transparent 0%, rgba(0,0,0,0.5) 6%, black 16%)',
          WebkitMaskImage: 'linear-gradient(to left, black 30%, rgba(0,0,0,0.85) 55%, transparent 82%), linear-gradient(to top, transparent 0%, rgba(0,0,0,0.5) 6%, black 16%)',
        }} />
        <div style={{
          position: 'absolute', right: 0, top: '8%', bottom: 0, width: 4,
          background: `linear-gradient(to bottom, transparent, ${rightFighter?.colors?.[0] || '#00d4ff'} 30%, ${rightFighter?.colors?.[0] || '#00d4ff'} 80%, transparent)`,
          boxShadow: `0 0 18px ${rightFighter?.colors?.[0] || '#00d4ff'}, 0 0 40px ${rightFighter?.colors?.[0] || '#00d4ff'}55`,
        }} />
        <div style={{
          position: 'absolute', bottom: '9%', right: 16,
          fontFamily: 'Orbitron, monospace', fontSize: 13, fontWeight: 700,
          color: rightFighter?.colors?.[0] || '#00d4ff',
          letterSpacing: '0.18em', textTransform: 'uppercase',
          textShadow: `0 0 14px ${rightFighter?.colors?.[0] || '#00d4ff'}, 0 2px 6px rgba(0,0,0,0.9)`,
          opacity: 0.95, textAlign: 'right',
          transform: 'scaleX(-1)',
        }}>
          {rightFighter?.name?.replace(/"[^"]*"/, '').trim().split(' ').slice(0,2).join(' ')}
        </div>
        <div style={{
          position: 'absolute', bottom: 'calc(9% + 22px)', right: 16,
          fontFamily: 'Orbitron, monospace', fontSize: 9, fontWeight: 400,
          color: 'rgba(255,255,255,0.45)', letterSpacing: '0.25em', textTransform: 'uppercase',
          textAlign: 'right', transform: 'scaleX(-1)',
        }}>
          {rightFighter?.mentality?.replace(/_/g, ' ')}
        </div>
      </div>

      {/* ── CENTER VIGNETTE (keeps center readable) ── */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 6, pointerEvents: 'none',
        background: 'radial-gradient(ellipse 42% 100% at 50% 50%, transparent 20%, rgba(8,0,18,0.75) 70%, rgba(5,0,12,0.92) 100%)',
      }} />

      {/* ── MAIN CONTENT ── */}
      <div style={{
        position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column',
        alignItems: 'center', gap: 0,
      }}>

        {/* ── EYEBROW TAG ── */}
        <div style={{
          fontFamily: 'Orbitron, monospace', fontSize: 11, fontWeight: 700,
          letterSpacing: '0.4em', color: '#ffd700', opacity: 0.8,
          textTransform: 'uppercase', marginBottom: 8,
          borderTop: '1px solid rgba(255,215,0,0.3)',
          borderBottom: '1px solid rgba(255,215,0,0.3)',
          padding: '4px 16px',
        }}>
          WORLD CHAMPIONSHIP SERIES
        </div>

        {/* ── TITLE BLOCK ── */}
        <div style={{ textAlign: 'center', marginBottom: 6, lineHeight: 1 }}>
          <div className="title-main" style={{ fontSize: 'clamp(60px,9vw,110px)', lineHeight: 0.9, display: 'block' }}>
            BAYBLADE
          </div>
          <div className="title-sub" style={{ fontSize: 'clamp(28px,4.5vw,54px)', letterSpacing: '0.3em', display: 'block', marginTop: 4 }}>
            UNIVERSE
          </div>
        </div>

        {/* ── DECORATIVE DIVIDER ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '14px 0 20px', width: 360 }}>
          <div style={{ flex: 1, height: 1, background: 'linear-gradient(to right, transparent, rgba(255,215,0,0.6))' }} />
          <div style={{
            width: 28, height: 28, border: '2px solid #ffd700',
            borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14, animation: 'counter-spin 8s linear infinite',
            boxShadow: '0 0 12px rgba(255,215,0,0.5)',
          }}>⚔</div>
          <div style={{ flex: 1, height: 1, background: 'linear-gradient(to left, transparent, rgba(255,215,0,0.6))' }} />
        </div>

        {/* ── MENU BUTTONS ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: 340 }}>

          {/* UNIVERSE — hero button */}
          <button className="menu-btn universe-btn"
            onClick={onStartUniverse}
            style={{ padding: '16px 32px', fontSize: 17, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, border: 'none', cursor: 'pointer' }}
          >
            <span style={{ fontSize: 22, animation: 'bey-spin 3s linear infinite' }}>🌍</span>
            <span style={{ fontSize: 17 }}>MODO UNIVERSO</span>
            <span style={{ marginLeft: 'auto', opacity: 0.7, fontSize: 13 }}>▶</span>
          </button>

          {/* EXHIBITION */}
          <button className="menu-btn"
            onClick={onStartExhibition}
            style={{
              padding: '13px 28px', fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
              border: '1px solid rgba(0,212,255,0.35)', color: '#00d4ff', cursor: 'pointer',
            }}
          >
            <span style={{ fontSize: 18 }}>⚔️</span>
            <span>EXHIBITION MATCH</span>
            <span style={{ marginLeft: 'auto', opacity: 0.5, fontSize: 13 }}>▶</span>
          </button>

          {/* Secondary row — 2 cols */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <button className="menu-btn"
              onClick={onShowProfiles}
              style={{
                padding: '11px 16px', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                background: 'linear-gradient(135deg, #1a1a2e, #12012a)',
                border: '1px solid rgba(180,100,255,0.35)', color: '#c78aff', cursor: 'pointer',
              }}
            >
              <span>👤</span><span>PERFIS</span>
            </button>
            <button className="menu-btn"
              onClick={() => setShowArenasInfo(true)}
              style={{
                padding: '11px 16px', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                background: 'linear-gradient(135deg, #1a1a2e, #001a14)',
                border: '1px solid rgba(0,196,140,0.35)', color: '#00c48c', cursor: 'pointer',
              }}
            >
              <span>🏟️</span><span>ARENAS</span>
            </button>
          </div>

          {/* Tertiary row — 2 cols */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <button className="menu-btn"
              onClick={onSimTest}
              style={{
                padding: '9px 16px', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.1)', color: '#8899aa', cursor: 'pointer',
              }}
            >
              <span>🧪</span><span>SIM TEST</span>
            </button>
            <button className="menu-btn"
              onClick={onShowSettings}
              style={{
                padding: '9px 16px', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.1)', color: '#8899aa', cursor: 'pointer',
              }}
            >
              <Settings size={14} /><span>SETTINGS</span>
            </button>
          </div>
        </div>

        {/* ── BOTTOM TAG ── */}
        <div style={{
          marginTop: 18, display: 'flex', alignItems: 'center', gap: 14,
          fontFamily: 'Orbitron, monospace', fontSize: 9, letterSpacing: '0.25em', color: 'rgba(255,215,0,0.35)',
        }}>
          <span>v3.0</span>
          <span style={{ width: 3, height: 3, borderRadius: '50%', background: 'rgba(255,215,0,0.4)' }} />
          <span>UNIVERSE EDITION</span>
          <span style={{ width: 3, height: 3, borderRadius: '50%', background: 'rgba(255,215,0,0.4)' }} />
          <span>{TEAMS.length} FIGHTERS</span>
        </div>
      </div>

      {/* ── TOP & BOTTOM CINEMATIC BARS ── */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 48, background: 'rgba(0,0,0,0.7)', zIndex: 20, borderBottom: '1px solid rgba(255,215,0,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 10, letterSpacing: '0.35em', color: 'rgba(255,215,0,0.4)' }}>
          BAYBLADE: UNIVERSE — SELECT YOUR PATH
        </div>
      </div>
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 32, background: 'rgba(0,0,0,0.7)', zIndex: 20, borderTop: '1px solid rgba(255,215,0,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px' }}>
        <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 9, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.2)' }}>READY TO LAUNCH</div>
        <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 9, letterSpacing: '0.2em', color: 'rgba(255,215,0,0.3)', animation: 'energy-pulse 2s ease-in-out infinite' }}>⚡ LET IT RIP</div>
      </div>

    </div>
  );
};

// ─── ARENAS SCREEN STYLES ───────────────────────────────────────────────────
const ARENAS_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Black+Ops+One&family=Rajdhani:wght@400;600;700&family=Orbitron:wght@400;700;900&display=swap');

  @keyframes arenas-spin     { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
  @keyframes arenas-spin-rev { from{transform:rotate(360deg)} to{transform:rotate(0deg)} }
  @keyframes arenas-pulse    { 0%,100%{opacity:.4;transform:scale(1)} 50%{opacity:.85;transform:scale(1.04)} }
  @keyframes arenas-scanline { 0%{transform:translateY(-100%)} 100%{transform:translateY(100vh)} }
  @keyframes arenas-holo     { 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }
  @keyframes card-slide-in   { 0%{opacity:0;transform:translateY(18px)} 100%{opacity:1;transform:translateY(0)} }
  @keyframes tag-glow        { 0%,100%{box-shadow:0 0 8px rgba(255,215,0,.2)} 50%{box-shadow:0 0 18px rgba(255,215,0,.55)} }

  .arena-card {
    position:relative; overflow:hidden;
    border:1px solid rgba(255,255,255,0.07);
    transition:border-color .2s ease, transform .2s ease, box-shadow .2s ease;
    clip-path:polygon(12px 0%,100% 0%,calc(100% - 12px) 100%,0% 100%);
    cursor:default;
  }
  .arena-card:hover {
    transform:translateY(-3px);
    border-color:rgba(255,215,0,0.4) !important;
    box-shadow:0 8px 32px rgba(0,0,0,0.6), 0 0 20px rgba(255,215,0,0.08);
  }
  .arena-card::before {
    content:''; position:absolute; inset:0; opacity:0;
    background:linear-gradient(135deg, rgba(255,215,0,0.04) 0%, transparent 60%);
    transition:opacity .2s ease;
  }
  .arena-card:hover::before { opacity:1; }

  .arena-back-btn {
    font-family:'Rajdhani',sans-serif; font-weight:700;
    letter-spacing:.12em; position:relative; overflow:hidden;
    transition:all .18s cubic-bezier(.22,1,.36,1);
    clip-path:polygon(8px 0%,100% 0%,calc(100% - 8px) 100%,0% 100%);
  }
  .arena-back-btn:hover { transform:translateY(-2px) scale(1.02); }
  .arena-back-btn::before {
    content:''; position:absolute; inset:0;
    background:linear-gradient(90deg,transparent,rgba(255,255,255,.1),transparent);
    transform:translateX(-100%); transition:transform .4s ease;
  }
  .arena-back-btn:hover::before { transform:translateX(100%); }

  .feature-tag {
    display:inline-flex; align-items:center; gap:5px;
    padding:4px 10px; border-radius:2px; font-size:11px;
    font-family:'Rajdhani',sans-serif; font-weight:600;
    letter-spacing:.08em; border:1px solid; animation:tag-glow 3s ease-in-out infinite;
  }

  .type-tag {
    padding:2px 8px; font-family:'Orbitron',monospace;
    font-size:8px; font-weight:700; letter-spacing:.15em;
    border-radius:2px; text-transform:uppercase;
  }
`;

const ARENAS_DATA = [
  {
    id: 'BB10',
    name: 'BB-10 Attack Type Stadium',
    subtitle: 'A Arena Clássica',
    icon: '🏆',
    accent: '#01A5E7',
    accentDim: 'rgba(1,165,231,0.15)',
    description: 'A arena lendária do Metal Fight Beyblade. O Tornado Ridge cria um anel elevado que canaliza beys em padrões agressivos de banking, enquanto as duas saídas laterais (pockets) transformam ring-outs em finalizações épicas.',
    mechanics: [
      { icon: '🌪️', label: 'Tornado Ridge', desc: 'Anel elevado que força padrões de banking circular — ideal para Attack' },
      { icon: '🕳️', label: '2 Pockets', desc: 'Saídas laterais que premiam agressividade com Ring-Out Finish' },
      { icon: '🎯', label: 'Centro côncavo', desc: 'Âncora beys de Stamina no centro gravitacional da arena' },
    ],
    favored: ['Attack', 'Balance'],
    disfavored: ['Defense'],
    boosts: { ATK: '+0', SPD: '+0', DEF: '+0' },
    physicsNote: 'Raio 221px · Fricção 0.65 · Elasticidade 0.75',
    tier: 'CLASSIC',
    tierColor: '#ffd700',
  },
  {
    id: 'NEXUS',
    name: 'Prismatic Nexus Arena',
    subtitle: 'Portais & Energia',
    icon: '🌀',
    accent: '#00C48C',
    accentDim: 'rgba(0,196,140,0.15)',
    description: 'Arena futurística com 4 portais de teletransporte nos pontos cardeais. Beys que cruzam um portal são instaneamente reposicionados no portal oposto, criando cadeias de warp imprevisíveis. A inclinação central força mobilidade constante.',
    mechanics: [
      { icon: '🔮', label: '4 Portais Warp', desc: 'Norte/Sul/Leste/Oeste — teleporte instantâneo para o portal oposto' },
      { icon: '⚡', label: 'Energy Fields', desc: 'Campos de energia aceleram beys que atravessam as zonas ativas' },
      { icon: '📐', label: 'Inclinação central', desc: 'Arena levemente inclinada que empurra beys parados para o centro' },
    ],
    favored: ['Attack', 'Balance'],
    disfavored: ['Stamina'],
    boosts: { ATK: '+2', BAL: '+2', SPD: '+1' },
    physicsNote: 'Raio 215px · Fricção 0.55 · Elasticidade 0.88',
    tier: 'ADVANCED',
    tierColor: '#00C48C',
  },
  {
    id: 'COLOSSEUM_CARNAGE',
    name: 'Colosseum Carnage Arena',
    subtitle: 'Gladiadores de Aço',
    icon: '🔥',
    accent: '#ef4444',
    accentDim: 'rgba(239,68,68,0.15)',
    description: 'A arena mais brutal do circuito. Portões colosseais liberam obstáculos metálicos móveis a cada 15 segundos — blocos de aço que esmagam tudo no caminho. Stamina não sobrevive ao caos gladiatorial. Apenas os mais fortes e técnicos prevalecem.',
    mechanics: [
      { icon: '⚙️', label: 'Portões Gladiatoriais', desc: 'A cada 15s portões abrem liberando 3 obstáculos metálicos pesados' },
      { icon: '💥', label: 'Crush Zones', desc: 'Zonas de esmagamento onde obstáculos atingem com força máxima' },
      { icon: '🛡️', label: 'Gate System', desc: 'Os portões criam rotas alternativas e áreas de refúgio temporárias' },
    ],
    favored: ['Attack', 'Defense'],
    disfavored: ['Stamina'],
    boosts: { ATK: '+5', DEF: '+3', TEC: '+2', STA: '-3' },
    physicsNote: 'Raio 200px · Fricção 0.60 · Elasticidade 0.85',
    tier: 'BRUTAL',
    tierColor: '#ef4444',
  },
  {
    id: 'VOLCANIC_RAGE',
    name: 'Volcanic Rage Stadium',
    subtitle: 'A Fúria do Vulcão',
    icon: '🌋',
    accent: '#ff4400',
    accentDim: 'rgba(255,68,0,0.15)',
    description: 'Arena vulcânica com sistema de calor crescente. Cada colisão, segundo de batalha e contato com lava alimenta o Heat Meter. Quando atinge 100 — Erupção Total: explosão radial que lança tudo para fora, ignorando peso. Fendas vulcânicas na borda engolam beys por 2 segundos antes do KO térmico.',
    mechanics: [
      { icon: '🌡️', label: 'Heat Meter', desc: 'Calor acumula passivamente (+2/s) e em colisões (+5). Em 100: Erupção com força 6.5 outward, ignora weight advantage' },
      { icon: '🔴', label: 'Lava Flows', desc: 'Até 3 fluxos radiais no Lava Flow Ring (r50–140): drag ×0.95 e -3% stamina/s em contato. Mudam a cada 6s' },
      { icon: '🪨', label: 'Obsidian Belt', desc: 'Zona r140–190: micro-reflexões aleatórias tiram 15% de velocidade — zona de alto risco para Attack' },
      { icon: '💀', label: 'Fendas Vulcânicas', desc: 'Abrem após 3s. Beys submersas perdem 10% spin/s por 2 segundos — KO térmico se não escaparem. Beys pesadas +20% chance de fuga' },
    ],
    favored: ['Defense', 'Stamina'],
    disfavored: ['Attack'],
    boosts: { DEF: '+4', STA: '+3', BAL: '+2', SPD: '-3' },
    physicsNote: 'Raio 221px · Heat Meter · Erupção a 100 · Fendas 3s',
    tier: 'CHAOS',
    tierColor: '#ef4444',
  },
  {
    id: 'VORTEX_COLISEUM',
    name: 'Vortex Coliseum',
    subtitle: 'O Olho do Furacão',
    icon: '🌪️',
    accent: '#6366f1',
    accentDim: 'rgba(99,102,241,0.15)',
    description: 'Um vórtex central permanente cria um sistema de órbitas concêntricas ao redor da arena. Beys capturados pelo vórtex são acelerados em espiral. Stamina e Balance dominam ao aproveitar as órbitas — Defense é destruída pelas forças centrífugas.',
    mechanics: [
      { icon: '🌀', label: 'Vortex Core', desc: 'Vórtex central com força 0.8 que puxa e acelera beys em espiral contínua' },
      { icon: '🔄', label: 'Arena Giratória', desc: 'A própria arena gira em velocidade 0.5 amplificando o momentum dos beys' },
      { icon: '💫', label: 'Spin Amplifier', desc: 'Beys com alto spin ganham +3 em stamina e balance ao surfar o vórtex' },
    ],
    favored: ['Stamina', 'Balance'],
    disfavored: ['Defense'],
    boosts: { STA: '+3', BAL: '+2', SPN: '+3' },
    physicsNote: 'Raio 234px · Vórtex 0.8 · Rotação 0.5',
    tier: 'SPECIAL',
    tierColor: '#6366f1',
  },
  {
    id: 'STORM_TRACK',
    name: 'Storm Track Arena',
    subtitle: 'Clima de Guerra',
    icon: '⚡',
    accent: '#4a90e2',
    accentDim: 'rgba(74,144,226,0.15)',
    description: 'Arena meteorológica dinâmica com sistema climático em tempo real. Zonas de vento (tornados, rajadas, calmaria) se movem pela arena. Raios aleatórios causam shock. Correntes de ar de baixa fricção (0.45) tornam a velocidade de reação fundamental.',
    mechanics: [
      { icon: '🌪️', label: 'Wind Zones', desc: 'Tornados (×1.5), Rajadas (×1.2) e Calmaria (×0.8) se movem dinamicamente' },
      { icon: '⚡', label: 'Lightning Strikes', desc: 'Raios aleatórios nos timings 0.8s/1.5s/2.2s causam shock e empurrão' },
      { icon: '🌬️', label: 'Air Currents', desc: 'Correntes de ar com fricção 0.45 — velocidade e técnica são a chave da sobrevivência' },
    ],
    favored: ['Attack', 'Balance'],
    disfavored: ['Defense'],
    boosts: { ATK: '+4', SPD: '+4', TEC: '+3', DEF: '-3' },
    physicsNote: 'Raio 227px · Fricção 0.45 · Elasticidade 0.95',
    tier: 'DYNAMIC',
    tierColor: '#4a90e2',
  },
  {
    id: 'PANGEA_PLATFORM',
    name: 'Pangea Platform Stadium',
    subtitle: 'Placas Tectônicas',
    icon: '🌍',
    accent: '#f59e0b',
    accentDim: 'rgba(245,158,11,0.15)',
    description: 'A arena viva. 6 placas tectônicas independentes se movem lentamente, criando fissuras entre elas. A cada 12 segundos um terremoto sacode tudo. Beys que caem em fissuras sofrem dano massivo. Peso e técnica dominam o caos geológico.',
    mechanics: [
      { icon: '🪨', label: '6 Placas Móveis', desc: 'Placas tectônicas se movem a velocidade 0.3 criando e fechando fissuras' },
      { icon: '💥', label: 'Terremoto a cada 12s', desc: 'Quake interval de 12s — seismic burst que desloca todos os beys' },
      { icon: '🕳️', label: 'Fault Lines', desc: 'Beys capturados em fissuras entre placas sofrem dano massivo e perda de spin' },
    ],
    favored: ['Balance', 'Defense'],
    disfavored: ['Attack', 'Stamina'],
    boosts: { BAL: '+4', WGT: '+3', TEC: '+2', SPD: '-1' },
    physicsNote: 'Raio 221px · 6 placas · Quake a cada 12s',
    tier: 'DYNAMIC',
    tierColor: '#f59e0b',
  },
  {
    id: 'KILLER_SIDES',
    name: 'Killer Sides Arena',
    subtitle: 'Velocidade ou Morte',
    icon: '⚔️',
    accent: '#ff4500',
    accentDim: 'rgba(255,69,0,0.15)',
    description: 'As laterais são armadilhas mortais. Grip tracks capturam automaticamente qualquer bey que perca velocidade abaixo do threshold — e o disparam de volta ao centro como um projétil. Velocidade é fuga. Lentidão é um bilhete de ida para o centro inimigo.',
    mechanics: [
      { icon: '🪤', label: 'Grip Tracks', desc: 'Laterais capturam beys lentos (abaixo do threshold de velocidade)' },
      { icon: '🚀', label: 'Launch System', desc: 'Beys capturados são acelerados e disparados ao centro da arena' },
      { icon: '🔄', label: 'Spin Direction', desc: 'Right spin é lançado para direita, Left spin para esquerda na grip' },
    ],
    favored: ['Attack', 'Balance'],
    disfavored: ['Defense', 'Stamina'],
    boosts: { ATK: '+3', SPD: '+3', TEC: '+2' },
    physicsNote: 'Raio 221px · Safe Zone central 90px · Fricção 0.68',
    tier: 'BRUTAL',
    tierColor: '#ff4500',
  },
];

const TIER_BADGE_COLORS = {
  CLASSIC: { bg: 'rgba(255,215,0,0.12)', border: 'rgba(255,215,0,0.5)', text: '#ffd700' },
  ADVANCED: { bg: 'rgba(0,196,140,0.12)', border: 'rgba(0,196,140,0.5)', text: '#00C48C' },
  BRUTAL: { bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.5)', text: '#ef4444' },
  TACTICAL: { bg: 'rgba(139,92,246,0.12)', border: 'rgba(139,92,246,0.5)', text: '#8b5cf6' },
  SPECIAL: { bg: 'rgba(99,102,241,0.12)', border: 'rgba(99,102,241,0.5)', text: '#6366f1' },
  DYNAMIC: { bg: 'rgba(74,144,226,0.12)', border: 'rgba(74,144,226,0.5)', text: '#4a90e2' },
};

const TYPE_COLORS = {
  Attack: '#ef4444', Defense: '#3b82f6', Stamina: '#8b5cf6',
  Balance: '#10b981', Extreme: '#f59e0b',
};

const ArenasInfoScreen = ({ onBack }) => {
  const [selected, setSelected] = React.useState(null);

  // spinning particles
  const particles = React.useMemo(() =>
    Array.from({ length: 10 }, (_, i) => ({
      id: i, size: 15 + Math.random() * 38,
      x: Math.random() * 100, y: Math.random() * 100,
      dur: 7 + Math.random() * 10, delay: Math.random() * 5,
      rev: i % 2 === 0, op: 0.03 + Math.random() * 0.055,
    })), []);

  const active = selected !== null ? ARENAS_DATA[selected] : null;
  const tierBadge = active ? (TIER_BADGE_COLORS[active.tier] || TIER_BADGE_COLORS.CLASSIC) : null;

  return (
    <div style={{
      width: '100vw', height: '100vh', overflow: 'hidden', position: 'relative',
      background: 'radial-gradient(ellipse 120% 90% at 50% 110%, #1a0030 0%, #0a000f 45%, #000008 100%)',
      fontFamily: 'Rajdhani, sans-serif', display: 'flex', flexDirection: 'column',
    }}>
      <style>{ARENAS_STYLES}</style>

      {/* ── GRID FLOOR ── */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        backgroundImage: 'linear-gradient(rgba(0,212,255,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(0,212,255,0.03) 1px,transparent 1px)',
        backgroundSize: '60px 60px',
        maskImage: 'radial-gradient(ellipse 80% 60% at 50% 100%, black, transparent)',
        WebkitMaskImage: 'radial-gradient(ellipse 80% 60% at 50% 100%, black, transparent)',
      }} />

      {/* ── SCANLINE ── */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 50, opacity: 0.2 }}>
        <div style={{ width: '100%', height: 3, background: 'linear-gradient(90deg,transparent,rgba(0,212,255,.6),transparent)', animation: 'arenas-scanline 7s linear infinite' }} />
      </div>

      {/* ── BEY PARTICLES ── */}
      {particles.map(p => (
        <div key={p.id} style={{
          position: 'absolute', left: `${p.x}%`, top: `${p.y}%`,
          width: p.size, height: p.size,
          border: `${p.rev ? 2 : 1.5}px solid rgba(255,215,0,${p.op * 1.5})`,
          borderRadius: '50%', pointerEvents: 'none',
          animation: `${p.rev ? 'arenas-spin-rev' : 'arenas-spin'} ${p.dur}s linear infinite ${p.delay}s`,
        }}>
          <div style={{ position: 'absolute', top: '10%', left: '10%', right: '10%', bottom: '10%', border: `1px solid rgba(0,212,255,${p.op})`, borderRadius: '50%' }} />
        </div>
      ))}

      {/* ── AMBIENT ORBS ── */}
      <div style={{ position: 'absolute', top: '10%', left: '10%', width: 280, height: 280, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,100,0,0.08), transparent 70%)', filter: 'blur(40px)', animation: 'arenas-pulse 6s ease-in-out infinite', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '15%', right: '8%', width: 220, height: 220, borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,212,255,0.07), transparent 70%)', filter: 'blur(40px)', animation: 'arenas-pulse 7s ease-in-out infinite 2s', pointerEvents: 'none' }} />

      {/* ── FLOOR LINE ── */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg,transparent 0%,rgba(255,180,0,.7) 30%,rgba(255,215,0,1) 50%,rgba(255,180,0,.7) 70%,transparent 100%)', boxShadow: '0 0 40px rgba(255,215,0,.4)', pointerEvents: 'none' }} />

      {/* ── TOP BAR ── */}
      <div style={{
        height: 56, flexShrink: 0, background: 'rgba(0,0,0,0.78)',
        borderBottom: '1px solid rgba(255,215,0,0.1)', zIndex: 20,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 28px',
      }}>
        <button className="arena-back-btn" onClick={onBack} style={{
          padding: '7px 20px', fontSize: 12, background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.55)', cursor: 'pointer',
        }}>
          ← VOLTAR
        </button>

        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: 'Orbitron,monospace', fontSize: 9, letterSpacing: '0.4em', color: 'rgba(255,215,0,0.4)', textTransform: 'uppercase' }}>
            BAYBLADE: UNIVERSE
          </div>
          <div style={{
            fontFamily: 'Black Ops One,cursive', fontSize: 20,
            background: 'linear-gradient(135deg,#fff 0%,#ffd700 50%,#ff8c00 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
            filter: 'drop-shadow(0 0 10px rgba(255,165,0,0.5))',
          }}>
            ARENAS
          </div>
        </div>

        <div style={{ fontFamily: 'Orbitron,monospace', fontSize: 9, letterSpacing: '0.22em', color: 'rgba(255,215,0,0.3)' }}>
          {ARENAS_DATA.length} ARENAS
        </div>
      </div>

      {/* ── MAIN CONTENT ── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative', zIndex: 2 }}>

        {/* ── LEFT: ARENA GRID ── */}
        <div style={{
          width: active ? '42%' : '100%', flexShrink: 0,
          overflowY: 'auto', padding: '20px 22px',
          transition: 'width .3s cubic-bezier(.22,1,.36,1)',
          scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,215,0,0.2) transparent',
          borderRight: active ? '1px solid rgba(255,215,0,0.07)' : 'none',
        }}>
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontFamily: 'Orbitron,monospace', fontSize: 9, letterSpacing: '0.3em', color: 'rgba(255,215,0,0.4)', textTransform: 'uppercase', marginBottom: 2 }}>
              Selecione uma arena para ver detalhes
            </div>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: active ? '1fr' : 'repeat(auto-fill, minmax(260px, 1fr))',
            gap: 10,
          }}>
            {ARENAS_DATA.map((arena, idx) => {
              const isActive = selected === idx;
              const tb = TIER_BADGE_COLORS[arena.tier] || TIER_BADGE_COLORS.CLASSIC;
              return (
                <div key={arena.id}
                  className="arena-card"
                  onClick={() => setSelected(isActive ? null : idx)}
                  style={{
                    background: isActive ? arena.accentDim : 'rgba(255,255,255,0.03)',
                    borderColor: isActive ? `${arena.accent}55` : 'rgba(255,255,255,0.07)',
                    padding: '14px 16px',
                    animation: `card-slide-in .4s ease ${idx * 0.04}s both`,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {/* Icon */}
                    <div style={{
                      width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                      background: `${arena.accent}18`,
                      border: `1px solid ${arena.accent}44`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 18,
                      boxShadow: isActive ? `0 0 14px ${arena.accent}44` : 'none',
                    }}>
                      {arena.icon}
                    </div>

                    {/* Name block */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontFamily: 'Rajdhani,sans-serif', fontSize: 14, fontWeight: 700,
                        color: isActive ? arena.accent : 'rgba(255,255,255,0.85)',
                        letterSpacing: '0.06em', lineHeight: 1.1,
                        textShadow: isActive ? `0 0 10px ${arena.accent}66` : 'none',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {arena.name}
                      </div>
                      <div style={{ fontFamily: 'Orbitron,monospace', fontSize: 8, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.18em', marginTop: 2 }}>
                        {arena.subtitle}
                      </div>
                    </div>

                    {/* Tier badge */}
                    <div style={{
                      flexShrink: 0, padding: '2px 7px',
                      background: tb.bg, border: `1px solid ${tb.border}`,
                      borderRadius: 2, fontFamily: 'Orbitron,monospace',
                      fontSize: 7, fontWeight: 700, letterSpacing: '0.15em', color: tb.text,
                    }}>
                      {arena.tier}
                    </div>

                    {/* Arrow */}
                    <div style={{
                      flexShrink: 0, fontSize: 11,
                      color: isActive ? arena.accent : 'rgba(255,255,255,0.2)',
                      transform: isActive ? 'rotate(90deg)' : 'none',
                      transition: 'transform .2s ease',
                    }}>▶</div>
                  </div>

                  {/* Favored types strip */}
                  <div style={{ display: 'flex', gap: 5, marginTop: 9, flexWrap: 'wrap' }}>
                    {arena.favored.map(t => (
                      <span key={t} className="type-tag" style={{
                        background: `${TYPE_COLORS[t] || '#fff'}18`,
                        border: `1px solid ${TYPE_COLORS[t] || '#fff'}44`,
                        color: TYPE_COLORS[t] || '#fff',
                      }}>✓ {t}</span>
                    ))}
                    {arena.disfavored.map(t => (
                      <span key={t} className="type-tag" style={{
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        color: 'rgba(255,255,255,0.25)',
                      }}>✗ {t}</span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── RIGHT: DETAIL PANEL ── */}
        {active && (
          <div style={{
            flex: 1, overflowY: 'auto', padding: '24px 28px',
            scrollbarWidth: 'thin', scrollbarColor: `${active.accent}33 transparent`,
            animation: 'card-slide-in .35s ease forwards',
          }}>
            {/* ── HERO HEADER ── */}
            <div style={{
              background: active.accentDim,
              border: `1px solid ${active.accent}44`,
              padding: '22px 24px', marginBottom: 20,
              clipPath: 'polygon(16px 0%,100% 0%,calc(100% - 16px) 100%,0% 100%)',
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 14 }}>
                <div style={{
                  fontSize: 48, lineHeight: 1, flexShrink: 0,
                  filter: `drop-shadow(0 0 20px ${active.accent}88)`,
                }}>
                  {active.icon}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontFamily: 'Orbitron,monospace', fontSize: 8, letterSpacing: '0.3em',
                    color: active.accent, opacity: 0.7, marginBottom: 4, textTransform: 'uppercase',
                  }}>
                    {active.subtitle}
                  </div>
                  <div style={{
                    fontFamily: 'Black Ops One,cursive',
                    fontSize: 'clamp(18px,2.5vw,28px)', lineHeight: 1.05,
                    background: `linear-gradient(135deg,#fff 0%,${active.accent} 70%)`,
                    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
                    filter: `drop-shadow(0 0 12px ${active.accent}55)`,
                  }}>
                    {active.name}
                  </div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 8, alignItems: 'center' }}>
                    {tierBadge && (
                      <span style={{
                        padding: '2px 10px', background: tierBadge.bg,
                        border: `1px solid ${tierBadge.border}`, borderRadius: 2,
                        fontFamily: 'Orbitron,monospace', fontSize: 8, fontWeight: 700,
                        letterSpacing: '0.2em', color: tierBadge.text,
                      }}>{active.tier}</span>
                    )}
                    <span style={{ fontFamily: 'Orbitron,monospace', fontSize: 8, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.15em' }}>
                      {active.physicsNote}
                    </span>
                  </div>
                </div>
              </div>

              <p style={{
                fontFamily: 'Rajdhani,sans-serif', fontSize: 13.5, lineHeight: 1.6,
                color: 'rgba(255,255,255,0.75)', letterSpacing: '0.03em',
              }}>
                {active.description}
              </p>
            </div>

            {/* ── MECHANICS ── */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontFamily: 'Orbitron,monospace', fontSize: 9, letterSpacing: '0.3em', color: 'rgba(255,215,0,0.45)', marginBottom: 10, textTransform: 'uppercase' }}>
                ⚙ Mecânicas da Arena
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {active.mechanics.map((m, i) => (
                  <div key={i} style={{
                    display: 'flex', gap: 12, alignItems: 'flex-start',
                    padding: '12px 14px',
                    background: 'rgba(255,255,255,0.03)',
                    border: `1px solid ${active.accent}28`,
                    clipPath: 'polygon(6px 0%,100% 0%,calc(100% - 6px) 100%,0% 100%)',
                  }}>
                    <span style={{ fontSize: 20, flexShrink: 0, lineHeight: 1 }}>{m.icon}</span>
                    <div>
                      <div style={{
                        fontFamily: 'Rajdhani,sans-serif', fontSize: 13, fontWeight: 700,
                        color: active.accent, letterSpacing: '0.08em', marginBottom: 2,
                      }}>{m.label}</div>
                      <div style={{ fontFamily: 'Rajdhani,sans-serif', fontSize: 12, color: 'rgba(255,255,255,0.55)', lineHeight: 1.4 }}>
                        {m.desc}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── TYPE COMPATIBILITY ── */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontFamily: 'Orbitron,monospace', fontSize: 9, letterSpacing: '0.3em', color: 'rgba(255,215,0,0.45)', marginBottom: 10, textTransform: 'uppercase' }}>
                ⚔ Compatibilidade de Tipos
              </div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 130 }}>
                  <div style={{ fontFamily: 'Orbitron,monospace', fontSize: 8, color: '#10b981', letterSpacing: '0.15em', marginBottom: 6 }}>FAVORECE</div>
                  {active.favored.map(t => (
                    <div key={t} style={{
                      display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5,
                      padding: '5px 10px',
                      background: `${TYPE_COLORS[t] || '#fff'}12`,
                      border: `1px solid ${TYPE_COLORS[t] || '#fff'}33`,
                      borderRadius: 2,
                    }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: TYPE_COLORS[t] || '#fff', flexShrink: 0 }} />
                      <span style={{ fontFamily: 'Rajdhani,sans-serif', fontSize: 12, fontWeight: 700, color: TYPE_COLORS[t] || '#fff', letterSpacing: '0.08em' }}>{t}</span>
                    </div>
                  ))}
                </div>
                <div style={{ flex: 1, minWidth: 130 }}>
                  <div style={{ fontFamily: 'Orbitron,monospace', fontSize: 8, color: '#ef4444', letterSpacing: '0.15em', marginBottom: 6 }}>PENALIZA</div>
                  {active.disfavored.map(t => (
                    <div key={t} style={{
                      display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5,
                      padding: '5px 10px',
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: 2, opacity: 0.55,
                    }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'rgba(255,255,255,0.3)', flexShrink: 0 }} />
                      <span style={{ fontFamily: 'Rajdhani,sans-serif', fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.08em' }}>{t}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ── STAT BOOSTS ── */}
            <div>
              <div style={{ fontFamily: 'Orbitron,monospace', fontSize: 9, letterSpacing: '0.3em', color: 'rgba(255,215,0,0.45)', marginBottom: 10, textTransform: 'uppercase' }}>
                📊 Modificadores de Stats
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {Object.entries(active.boosts).map(([stat, val]) => {
                  const isPos = val.startsWith('+') && val !== '+0';
                  const isNeg = val.startsWith('-');
                  const isNeutral = val === '+0';
                  return (
                    <div key={stat} style={{
                      padding: '5px 12px',
                      background: isPos ? `${active.accent}15` : isNeg ? 'rgba(239,68,68,0.12)' : 'rgba(255,255,255,0.05)',
                      border: `1px solid ${isPos ? active.accent + '44' : isNeg ? 'rgba(239,68,68,0.4)' : 'rgba(255,255,255,0.1)'}`,
                      borderRadius: 2,
                      display: 'flex', gap: 5, alignItems: 'center',
                    }}>
                      <span style={{ fontFamily: 'Orbitron,monospace', fontSize: 8, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.12em' }}>{stat}</span>
                      <span style={{
                        fontFamily: 'Orbitron,monospace', fontSize: 11, fontWeight: 700,
                        color: isPos ? active.accent : isNeg ? '#ef4444' : 'rgba(255,255,255,0.25)',
                      }}>{val}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── EMPTY STATE (no selection, full-width) ── */}
        {!active && (
          <div style={{
            position: 'absolute', bottom: 24, left: '50%', transform: 'translateX(-50%)',
            fontFamily: 'Orbitron,monospace', fontSize: 9, letterSpacing: '0.3em',
            color: 'rgba(255,215,0,0.3)', textAlign: 'center', pointerEvents: 'none',
          }}>
            CLIQUE EM UMA ARENA PARA VER OS DETALHES
          </div>
        )}
      </div>

      {/* ── BOTTOM BAR ── */}
      <div style={{ height: 30, background: 'rgba(0,0,0,0.72)', borderTop: '1px solid rgba(255,215,0,0.06)', zIndex: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', flexShrink: 0 }}>
        <div style={{ fontFamily: 'Orbitron,monospace', fontSize: 8, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.12)' }}>ARENA CODEX</div>
        <div style={{ fontFamily: 'Orbitron,monospace', fontSize: 8, letterSpacing: '0.2em', color: 'rgba(255,215,0,0.2)', animation: 'arenas-pulse 3s ease-in-out infinite' }}>⚡ LET IT RIP</div>
      </div>
    </div>
  );
};

// TournamentRecapScreen is imported from ./TournamentRecapScreen.jsx


const SeasonRecapScreen = ({ universeManager, onContinue }) => {
  // Usar o ano salvo para recap (ano anterior) ou currentYear se não houver
  const yearToShow = universeManager.seasonRecapYear || universeManager.currentYear;
  const recap = universeManager.computeSeasonRecap(yearToShow);
  
  if (!recap.dataAvailable) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 flex items-center justify-center p-8">
        <div className="bg-gray-800 border-2 border-gray-700 p-8 max-w-2xl">
          <h2 className="text-2xl font-black text-white mb-4">❌ Dados Insuficientes</h2>
          <p className="text-gray-400 mb-4">
            Não foram encontrados dados para a temporada {recap.seasonYear}.
          </p>
          
          {/* Debug info */}
          {recap.debugInfo && (
            <div className="bg-gray-900 border border-gray-700 p-4 mb-6 text-sm font-mono">
              <div className="text-yellow-400 mb-2">📊 Informações de Debug:</div>
              <div className="text-gray-300 space-y-1">
                <div>• Total de logs no sistema: <span className="text-white">{recap.debugInfo.totalLogs}</span></div>
                <div>• Ano solicitado: <span className="text-white">{recap.debugInfo.requestedYear}</span></div>
                <div>• Anos disponíveis: <span className="text-white">
                  {recap.debugInfo.availableYears.length > 0 
                    ? recap.debugInfo.availableYears.join(', ') 
                    : 'Nenhum'}
                </span></div>
              </div>
            </div>
          )}
          
          <p className="text-gray-500 text-sm mb-6">
            Isto pode acontecer se você não completou nenhum torneio durante a temporada,
            ou se há um bug no sistema de logs.
          </p>
          
          <button
            onClick={onContinue}
            className="bg-blue-500 hover:bg-blue-400 text-white px-8 py-3 font-black w-full"
          >
            CONTINUAR MESMO ASSIM
          </button>
        </div>
      </div>
    );
  }
  
  const getPlayerName = (playerId) => {
    const team = TEAMS[playerId];
    return team ? team.name : `Player ${playerId}`;
  };
  
  const getPlayerCountry = (playerId) => {
    const team = TEAMS[playerId];
    return team ? team.country : '';
  };
  
  // ⭐ NOVO - Helper para pegar imagem full body
  const getPlayerFullBody = (playerId) => {
    const team = TEAMS[playerId];
    return team ? team.fullBodyUrl : null;
  };
  
  // ⭐ NOVO - Helper para pegar ícone
  const getPlayerIcon = (playerId) => {
    const team = TEAMS[playerId];
    return team ? team.iconUrl : null;
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-indigo-900 to-gray-900 p-8 overflow-y-auto">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="text-yellow-400 text-7xl mb-4">🏅</div>
          <h1 className="text-6xl font-black text-white mb-2">SEASON RECAP</h1>
          <div className="text-3xl font-bold text-indigo-400">Temporada {recap.seasonYear}</div>
        </div>

        {/* Campeões do Ano - COM ÍCONES */}
        <div className="mb-8">
          <h2 className="text-3xl font-black text-white mb-4">🏆 CAMPEÕES DO ANO</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {recap.champions.map(c => {
              const monthConfig = CALENDAR_CONFIG.months.find(m => m.id === c.month);
              const isGrandSlam = monthConfig?.tournaments?.[0]?.type === 'GRAND_SLAM';
              return (
                <div 
                  key={c.month}
                  className={`p-4 border-2 ${
                    isGrandSlam 
                      ? 'bg-gradient-to-br from-yellow-900 to-yellow-800 border-yellow-500'
                      : 'bg-gradient-to-br from-blue-900 to-blue-800 border-blue-500'
                  }`}
                >
                  <div className="text-xs text-gray-300 mb-1">
                    {monthConfig?.shortName}
                  </div>
                  <div className="text-sm font-bold text-white mb-1">{c.tournamentName}</div>
                  {/* ⭐ ÍCONE DO CAMPEÃO */}
                  <div className="flex items-center gap-2 mb-2">
                    {getPlayerIcon(c.championId) && (
                      <img 
                        src={getPlayerIcon(c.championId)}
                        alt=""
                        className="w-8 h-8 rounded-md border-2 border-white"
                      />
                    )}
                    <div className="text-xs text-gray-200 flex-1">{c.championName}</div>
                  </div>
                  <div className="text-xl mt-1">{isGrandSlam ? '🏆' : '🏅'}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Prêmios Especiais - COM IMAGENS GRANDES */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {/* Jogador do Ano */}
          {recap.playerOfYearId !== null && (
            <div className="bg-gradient-to-br from-gold-600 to-yellow-700 border-4 border-yellow-400 p-6 relative overflow-hidden">
              {/* ⭐ Background blur */}
              {getPlayerFullBody(recap.playerOfYearId) && (
                <div className="absolute inset-0 opacity-10">
                  <img 
                    src={getPlayerFullBody(recap.playerOfYearId)} 
                    alt="" 
                    className="w-full h-full object-cover blur-xl scale-150"
                  />
                </div>
              )}
              
              <div className="relative z-10">
                <div className="text-sm font-bold text-yellow-200 mb-3">👑 JOGADOR DO ANO</div>
                {/* ⭐ IMAGEM DO JOGADOR */}
                <div className="flex items-center gap-3 mb-3">
                  {getPlayerFullBody(recap.playerOfYearId) ? (
                    <div className="w-20 h-28 border-2 border-white rounded-lg overflow-hidden shadow-lg">
                      <img 
                        src={getPlayerFullBody(recap.playerOfYearId)}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : getPlayerIcon(recap.playerOfYearId) && (
                    <img 
                      src={getPlayerIcon(recap.playerOfYearId)}
                      alt=""
                      className="w-16 h-16 rounded-lg border-2 border-white"
                    />
                  )}
                  <div className="flex-1">
                    <div className="text-2xl font-black text-white">{getPlayerName(recap.playerOfYearId)}</div>
                    <div className="text-sm text-yellow-200">{getPlayerCountry(recap.playerOfYearId)}</div>
                  </div>
                </div>
                <div className="text-xs text-yellow-300">Maior pontuação da temporada</div>
              </div>
            </div>
          )}

          {/* Mais Consistente */}
          {recap.mostConsistentId !== null && (
            <div className="bg-gradient-to-br from-green-700 to-green-800 border-4 border-green-500 p-6 relative overflow-hidden">
              {/* ⭐ Background blur */}
              {getPlayerFullBody(recap.mostConsistentId) && (
                <div className="absolute inset-0 opacity-10">
                  <img 
                    src={getPlayerFullBody(recap.mostConsistentId)} 
                    alt="" 
                    className="w-full h-full object-cover blur-xl scale-150"
                  />
                </div>
              )}
              
              <div className="relative z-10">
                <div className="text-sm font-bold text-green-200 mb-3">📈 MAIS CONSISTENTE</div>
                {/* ⭐ IMAGEM DO JOGADOR */}
                <div className="flex items-center gap-3 mb-3">
                  {getPlayerFullBody(recap.mostConsistentId) ? (
                    <div className="w-20 h-28 border-2 border-white rounded-lg overflow-hidden shadow-lg">
                      <img 
                        src={getPlayerFullBody(recap.mostConsistentId)}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : getPlayerIcon(recap.mostConsistentId) && (
                    <img 
                      src={getPlayerIcon(recap.mostConsistentId)}
                      alt=""
                      className="w-16 h-16 rounded-lg border-2 border-white"
                    />
                  )}
                  <div className="flex-1">
                    <div className="text-2xl font-black text-white">{getPlayerName(recap.mostConsistentId)}</div>
                    <div className="text-sm text-green-200">{getPlayerCountry(recap.mostConsistentId)}</div>
                  </div>
                </div>
                <div className="text-xs text-green-300">
                  Média de fase: {recap.mostConsistentAvgPhase.toFixed(1)}
                </div>
              </div>
            </div>
          )}

          {/* Rei dos Upsets */}
          {recap.upsetKingId !== null && (
            <div className="bg-gradient-to-br from-red-700 to-red-800 border-4 border-red-500 p-6 relative overflow-hidden">
              {/* ⭐ Background blur */}
              {getPlayerFullBody(recap.upsetKingId) && (
                <div className="absolute inset-0 opacity-10">
                  <img 
                    src={getPlayerFullBody(recap.upsetKingId)} 
                    alt="" 
                    className="w-full h-full object-cover blur-xl scale-150"
                  />
                </div>
              )}
              
              <div className="relative z-10">
                <div className="text-sm font-bold text-red-200 mb-3">🎯 REI DOS UPSETS</div>
                {/* ⭐ IMAGEM DO JOGADOR */}
                <div className="flex items-center gap-3 mb-3">
                  {getPlayerFullBody(recap.upsetKingId) ? (
                    <div className="w-20 h-28 border-2 border-white rounded-lg overflow-hidden shadow-lg">
                      <img 
                        src={getPlayerFullBody(recap.upsetKingId)}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : getPlayerIcon(recap.upsetKingId) && (
                    <img 
                      src={getPlayerIcon(recap.upsetKingId)}
                      alt=""
                      className="w-16 h-16 rounded-lg border-2 border-white"
                    />
                  )}
                  <div className="flex-1">
                    <div className="text-2xl font-black text-white">{getPlayerName(recap.upsetKingId)}</div>
                    <div className="text-sm text-red-200">{getPlayerCountry(recap.upsetKingId)}</div>
                  </div>
                </div>
                <div className="text-xs text-red-300">
                  {recap.upsetKingCount} upsets
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Match do Ano - COM ÍCONES */}
        {recap.matchOfYear && (
          <div className="bg-gradient-to-r from-purple-900 to-pink-900 border-2 border-purple-500 p-6 mb-8">
            <h2 className="text-2xl font-black text-white mb-4">⭐ MATCH DO ANO</h2>
            {/* ⭐ ÍCONES DOS JOGADORES */}
            <div className="flex items-center justify-center gap-4 mb-3">
              {getPlayerIcon(recap.matchOfYear.playerAId) && (
                <img 
                  src={getPlayerIcon(recap.matchOfYear.playerAId)}
                  alt=""
                  className="w-12 h-12 rounded-lg border-2 border-purple-400"
                />
              )}
              <div className="text-xl font-bold text-white text-center">
                {getPlayerName(recap.matchOfYear.playerAId)} vs {getPlayerName(recap.matchOfYear.playerBId)}
              </div>
              {getPlayerIcon(recap.matchOfYear.playerBId) && (
                <img 
                  src={getPlayerIcon(recap.matchOfYear.playerBId)}
                  alt=""
                  className="w-12 h-12 rounded-lg border-2 border-purple-400"
                />
              )}
            </div>
            <div className="text-sm text-purple-300 mt-2 text-center">
              {CALENDAR_CONFIG.months.find(m => m.id === recap.matchOfYear.month)?.name} - {recap.matchOfYear.tournamentName}
            </div>
            {recap.matchOfYear.upset && (
              <div className="text-sm text-pink-300 mt-1 text-center">
                🎯 Upset de {recap.matchOfYear.upsetMargin} posições
              </div>
            )}
            {recap.matchOfYear.duration && (
              <div className="text-sm text-purple-300 mt-1 text-center">
                ⏱️ Duração: {recap.matchOfYear.duration}s
              </div>
            )}
          </div>
        )}

        {/* Resumo Numérico */}
        <div className="bg-gray-800 border-2 border-gray-700 p-6 mb-8">
          <h2 className="text-2xl font-black text-white mb-4">📊 RESUMO DA TEMPORADA</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="text-center">
              <div className="text-4xl font-black text-blue-400">{recap.totalMatches}</div>
              <div className="text-sm text-gray-400">Total de Matches</div>
            </div>
            {recap.avgDuration && (
              <div className="text-center">
                <div className="text-4xl font-black text-purple-400">{recap.avgDuration.toFixed(1)}s</div>
                <div className="text-sm text-gray-400">Duração Média</div>
              </div>
            )}
            {recap.arenaOfYear && (
              <div className="text-center">
                <div className="text-2xl font-black text-orange-400">{recap.arenaOfYear}</div>
                <div className="text-sm text-gray-400">Arena do Ano</div>
                <div className="text-xs text-gray-500">{recap.arenaOfYearMatches} matches</div>
              </div>
            )}
            <div className="text-center">
              <div className="text-4xl font-black text-green-400">{recap.champions.length}</div>
              <div className="text-sm text-gray-400">Torneios</div>
            </div>
          </div>

          {/* Distribuição de Finishes */}
          {Object.keys(recap.finishTypes).length > 0 && (
            <div className="mt-6">
              <div className="text-sm font-bold text-gray-400 mb-2">DISTRIBUIÇÃO DE FINISHES NA TEMPORADA</div>
              <div className="flex gap-3">
                {Object.entries(recap.finishTypes).map(([type, count]) => (
                  <div key={type} className="bg-gray-700 px-4 py-3 text-center flex-1">
                    <div className="text-xs text-gray-400 uppercase">{type}</div>
                    <div className="text-2xl font-bold text-white">{count}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Botão */}
        <div className="text-center">
          <button
            onClick={onContinue}
            className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white px-16 py-5 text-xl font-black border-2 border-purple-400"
          >
            AVANÇAR PARA PRÓXIMA TEMPORADA 🚀
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================
// NOVO SISTEMA MD3/MD5 - COMPONENTES REFORMULADOS
// ============================================

// TELA PRÉ-JOGO (aparece UMA VEZ por embate completo)
const SeriesPreview = ({ series, onStart }) => {
  const { blader1, blader2, arenas, format } = series;
  
  const getMatchupInsight = () => {
    const attrs1 = blader1.attributes || {};
    const attrs2 = blader2.attributes || {};
    const diff = Math.abs(
      Object.values(attrs1).reduce((a, b) => a + b, 0) - 
      Object.values(attrs2).reduce((a, b) => a + b, 0)
    );
    
    if (diff < 5) return "Confronto extremamente equilibrado";
    if (diff < 10) return "Leve vantagem técnica";
    return "Diferença significativa de poder";
  };

  const getBladerSummary = (blader) => {
    const attrs = blader.attributes || {};
    const attrEntries = Object.entries(attrs);
    if (attrEntries.length === 0) {
      return { mainStrength: 'N/A', avgPower: '0.0', consistency: 0 };
    }
    const strongest = attrEntries.sort((a, b) => b[1] - a[1])[0];
    return {
      mainStrength: strongest[0],
      avgPower: (Object.values(attrs).reduce((a, b) => a + b, 0) / Object.keys(attrs).length).toFixed(1),
      consistency: (attrs.adaptability || 0) + (attrs.clutch || 0)
    };
  };

  const summary1 = getBladerSummary(blader1);
  const summary2 = getBladerSummary(blader2);

  const arenaNames = {
    'BB10': 'BB-10 Stadium',
    'NEXUS': 'Prismatic Nexus',
    'COLOSSEUM_CARNAGE': 'Colosseum Carnage',
    'VOLCANIC_RAGE': 'Volcanic Rage',
    'VORTEX_COLISEUM': 'Vortex Coliseum',
    'PINBALL_INFERNO': 'Pinball Inferno',
    'PANGEA_PLATFORM': 'Pangea Platform',
    'KILLER_SIDES': 'Killer Sides'
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center p-6">
      <div className="max-w-6xl w-full">
        <div className="bg-black/80 backdrop-blur-xl rounded-3xl p-12 border-2 border-purple-500">
          
          {/* Header */}
          <div className="text-center mb-12">
            <div className="text-yellow-400 text-xl mb-2">{format === 'MD3' ? 'MELHOR DE 3' : 'MELHOR DE 5'}</div>
            <div className="text-6xl font-bold text-white mb-4">
              {format}
            </div>
            <div className="text-purple-300 text-lg">{getMatchupInsight()}</div>
          </div>

          {/* Bladers */}
          <div className="grid grid-cols-3 gap-8 mb-12">
            {/* Blader 1 */}
            <div className="text-center">
              <img 
                src={blader1.photoUrl || 'https://via.placeholder.com/270x480'} 
                alt={blader1.name}
                className="w-48 h-80 object-cover rounded-xl mb-4 mx-auto border-4 border-blue-500"
              />
              <div className="text-white font-bold text-xl mb-2">{blader1.name}</div>
              <div className="text-blue-400 text-sm">{blader1.country}</div>
              <div className="mt-4 space-y-1 text-sm">
                <div className="text-purple-300">Força: {summary1.mainStrength}</div>
                <div className="text-purple-300">Poder médio: {summary1.avgPower}</div>
                <div className="text-purple-300">Consistência: {summary1.consistency}/20</div>
              </div>
            </div>

            {/* VS + Arenas */}
            <div className="flex flex-col justify-center">
              <div className="text-6xl font-bold text-yellow-400 text-center mb-8">VS</div>
              <div className="bg-purple-900/30 rounded-xl p-4 border border-purple-500/30">
                <div className="text-purple-300 text-sm font-bold mb-3 text-center">ARENAS DO EMBATE</div>
                {arenas.map((arena, idx) => (
                  <div key={idx} className="text-white text-sm mb-2 flex items-center">
                    <span className="text-yellow-400 mr-2">R{idx + 1}</span>
                    <span>{arenaNames[arena] || arena}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Blader 2 */}
            <div className="text-center">
              <img 
                src={blader2.photoUrl || 'https://via.placeholder.com/270x480'} 
                alt={blader2.name}
                className="w-48 h-80 object-cover rounded-xl mb-4 mx-auto border-4 border-red-500"
              />
              <div className="text-white font-bold text-xl mb-2">{blader2.name}</div>
              <div className="text-red-400 text-sm">{blader2.country}</div>
              <div className="mt-4 space-y-1 text-sm">
                <div className="text-purple-300">Força: {summary2.mainStrength}</div>
                <div className="text-purple-300">Poder médio: {summary2.avgPower}</div>
                <div className="text-purple-300">Consistência: {summary2.consistency}/20</div>
              </div>
            </div>
          </div>

          {/* Botão start */}
          <div className="text-center">
            <button
              onClick={onStart}
              className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-white px-16 py-4 rounded-xl font-bold text-2xl shadow-lg transform hover:scale-105 transition"
            >
              COMEÇAR EMBATE
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

// TRANSIÇÃO ENTRE ROUNDS
const RoundTransition = ({ roundNumber, countdown, onComplete }) => {
  React.useEffect(() => {
    if (countdown === 0) {
      const timer = setTimeout(onComplete, 500);
      return () => clearTimeout(timer);
    }
  }, [countdown, onComplete]);

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50">
      <div className="text-center">
        <div className="text-yellow-400 text-2xl mb-4">PRÓXIMO ROUND</div>
        <div className="text-white text-8xl font-bold mb-8">
          ROUND {roundNumber}
        </div>
        {countdown > 0 && (
          <div className="text-purple-400 text-6xl font-bold animate-pulse">
            {countdown}
          </div>
        )}
        {countdown === 0 && (
          <div className="text-yellow-500 text-6xl font-bold animate-pulse">
            LET IT RIP!
          </div>
        )}
      </div>
    </div>
  );
};

// SETTINGS SCREEN
const SETTINGS_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Black+Ops+One&family=Rajdhani:wght@400;600;700&family=Orbitron:wght@400;700;900&display=swap');

  @keyframes sett-scan  { 0%{transform:translateY(-100%)} 100%{transform:translateY(100vh)} }
  @keyframes sett-pulse { 0%,100%{opacity:.5;transform:scale(1)} 50%{opacity:1;transform:scale(1.06)} }
  @keyframes sett-entry { 0%{opacity:0;transform:translateX(-16px)} 100%{opacity:1;transform:translateX(0)} }

  .sett-card {
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.08);
    clip-path: polygon(10px 0%, 100% 0%, calc(100% - 10px) 100%, 0% 100%);
    padding: 20px 24px;
    animation: sett-entry .35s ease both;
    transition: border-color .2s ease;
  }
  .sett-card:hover { border-color: rgba(255,215,0,0.2); }

  .sett-label {
    font-family: 'Orbitron', monospace;
    font-size: 9px;
    font-weight: 700;
    letter-spacing: .3em;
    color: rgba(255,215,0,0.5);
    text-transform: uppercase;
    margin-bottom: 14px;
  }

  .sett-toggle {
    width: 52px; height: 28px;
    border-radius: 99px;
    position: relative;
    cursor: pointer;
    border: none;
    transition: background .2s ease, box-shadow .2s ease;
    flex-shrink: 0;
  }
  .sett-toggle-knob {
    position: absolute;
    top: 4px;
    width: 20px; height: 20px;
    border-radius: 50%;
    background: white;
    transition: transform .2s cubic-bezier(.22,1,.36,1);
  }

  .speed-btn {
    font-family: 'Orbitron', monospace;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: .1em;
    padding: 9px 4px;
    border: 1px solid rgba(255,255,255,0.1);
    background: rgba(255,255,255,0.03);
    color: rgba(255,255,255,0.3);
    cursor: pointer;
    transition: all .15s ease;
    clip-path: polygon(5px 0%, 100% 0%, calc(100% - 5px) 100%, 0% 100%);
    flex: 1;
  }
  .speed-btn.active {
    border-color: rgba(0,212,255,0.6);
    color: #00d4ff;
    background: rgba(0,212,255,0.1);
    box-shadow: 0 0 14px rgba(0,212,255,0.2);
  }
  .speed-btn:hover:not(.active) {
    border-color: rgba(255,255,255,0.2);
    color: rgba(255,255,255,0.6);
  }

  .kbd-tag {
    font-family: 'Orbitron', monospace;
    font-size: 10px;
    font-weight: 700;
    padding: 4px 12px;
    border: 1px solid rgba(255,255,255,0.15);
    background: rgba(255,255,255,0.05);
    color: rgba(255,255,255,0.5);
    letter-spacing: .12em;
    clip-path: polygon(4px 0%, 100% 0%, calc(100% - 4px) 100%, 0% 100%);
  }

  .reset-btn {
    font-family: 'Orbitron', monospace;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: .2em;
    padding: 14px;
    width: 100%;
    border: 1px solid rgba(239,68,68,0.4);
    background: rgba(239,68,68,0.07);
    color: rgba(239,68,68,0.8);
    cursor: pointer;
    transition: all .18s ease;
    clip-path: polygon(10px 0%, 100% 0%, calc(100% - 10px) 100%, 0% 100%);
  }
  .reset-btn:hover {
    border-color: rgba(239,68,68,0.8);
    background: rgba(239,68,68,0.15);
    color: #ef4444;
    box-shadow: 0 0 20px rgba(239,68,68,0.2);
  }

  .sett-back-btn {
    font-family: 'Rajdhani', sans-serif;
    font-weight: 700;
    font-size: 13px;
    letter-spacing: .14em;
    padding: 8px 22px;
    border: 1px solid rgba(255,255,255,0.18);
    background: rgba(255,255,255,0.05);
    color: rgba(255,255,255,0.6);
    cursor: pointer;
    transition: all .15s ease;
    clip-path: polygon(7px 0%, 100% 0%, calc(100% - 7px) 100%, 0% 100%);
  }
  .sett-back-btn:hover {
    border-color: rgba(255,215,0,0.5);
    color: #ffd700;
    background: rgba(255,215,0,0.08);
  }
`;

const SettingsScreen = ({ onBack }) => {
  const { settings, updateSetting, resetSettings } = useSettings();

  const NeonToggle = ({ value, onChange }) => (
    <button
      className="sett-toggle"
      onClick={onChange}
      style={{
        background: value
          ? 'linear-gradient(135deg, #00d4ff, #7b2fff)'
          : 'rgba(255,255,255,0.08)',
        boxShadow: value ? '0 0 16px rgba(0,212,255,0.4)' : 'none',
      }}
    >
      <div
        className="sett-toggle-knob"
        style={{ transform: value ? 'translateX(24px)' : 'translateX(4px)' }}
      />
    </button>
  );

  const speedLabels = { slow: '3S', normal: '2S', fast: '1S', instant: '0S' };
  const speedDesc   = { slow: '3 seg entre transições', normal: '2 seg entre transições', fast: '1 seg entre transições', instant: 'Sem delays' };

  return (
    <div style={{
      width: '100vw', minHeight: '100vh',
      background: 'radial-gradient(ellipse 120% 90% at 50% 110%, #1a0030 0%, #0a000f 45%, #000008 100%)',
      position: 'relative', overflow: 'hidden', fontFamily: 'Rajdhani, sans-serif',
    }}>
      <style>{SETTINGS_STYLES}</style>

      {/* Grid background */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none',
        backgroundImage: `linear-gradient(rgba(0,212,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,255,0.03) 1px, transparent 1px)`,
        backgroundSize: '60px 60px',
        maskImage: 'radial-gradient(ellipse 80% 60% at 50% 100%, black, transparent)',
        WebkitMaskImage: 'radial-gradient(ellipse 80% 60% at 50% 100%, black, transparent)',
      }} />

      {/* Ambient orbs */}
      <div style={{ position: 'fixed', top: '5%', right: '10%', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,212,255,0.07), transparent 70%)', filter: 'blur(60px)', pointerEvents: 'none' }} />
      <div style={{ position: 'fixed', bottom: '10%', left: '8%', width: 350, height: 350, borderRadius: '50%', background: 'radial-gradient(circle, rgba(180,0,255,0.07), transparent 70%)', filter: 'blur(60px)', pointerEvents: 'none' }} />

      {/* Scanline */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 50, opacity: 0.15 }}>
        <div style={{ width: '100%', height: '2px', background: 'linear-gradient(90deg, transparent, rgba(0,212,255,0.8), transparent)', animation: 'sett-scan 8s linear infinite' }} />
      </div>

      {/* Top bar */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 40,
        background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(255,215,0,0.1)',
        padding: '0 32px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        height: 56,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#ffd700', boxShadow: '0 0 8px #ffd700', animation: 'sett-pulse 2s ease-in-out infinite' }} />
          <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 11, letterSpacing: '0.4em', color: 'rgba(255,215,0,0.7)', textTransform: 'uppercase' }}>
            BAYBLADE: UNIVERSE — SETTINGS
          </span>
        </div>
        <button className="sett-back-btn" onClick={onBack}>← MENU</button>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '32px 28px 64px' }}>

        {/* Title */}
        <div style={{ marginBottom: 28 }}>
          <div style={{
            fontFamily: 'Black Ops One, cursive', fontSize: 'clamp(32px,4vw,48px)', lineHeight: 1,
            background: 'linear-gradient(180deg, #fff 0%, #ffd700 45%, #ff8c00 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            filter: 'drop-shadow(0 0 20px rgba(255,165,0,0.4))',
            marginBottom: 4,
          }}>CONFIGURAÇÕES</div>
          <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 10, letterSpacing: '0.3em', color: 'rgba(255,255,255,0.25)' }}>
            SISTEMA · GAMEPLAY · CONTROLES
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: 'linear-gradient(90deg, rgba(255,215,0,0.4), transparent)', marginBottom: 20 }} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

          {/* Skip Pre-Battle */}
          <div className="sett-card" style={{ animationDelay: '0.05s' }}>
            <div className="sett-label">Batalha</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, fontSize: 16, color: 'rgba(255,255,255,0.9)', marginBottom: 3 }}>
                  Pular Análise Pré-Batalha
                </div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', fontFamily: 'Rajdhani, sans-serif' }}>
                  Vai direto para o combate
                </div>
              </div>
              <NeonToggle value={settings.skipPreBattle} onChange={() => updateSetting('skipPreBattle', !settings.skipPreBattle)} />
            </div>
          </div>

          {/* Skip Replay */}
          <div className="sett-card" style={{ animationDelay: '0.1s' }}>
            <div className="sett-label">Replay</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, fontSize: 16, color: 'rgba(255,255,255,0.9)', marginBottom: 3 }}>
                  Pular Replay
                </div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', fontFamily: 'Rajdhani, sans-serif' }}>
                  Vai direto para os resultados
                </div>
              </div>
              <NeonToggle value={settings.skipReplay} onChange={() => updateSetting('skipReplay', !settings.skipReplay)} />
            </div>
          </div>

          {/* Show Skip Button */}
          <div className="sett-card" style={{ animationDelay: '0.15s' }}>
            <div className="sett-label">Interface</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, fontSize: 16, color: 'rgba(255,255,255,0.9)', marginBottom: 3 }}>
                  Exibir Botões de Skip
                </div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', fontFamily: 'Rajdhani, sans-serif' }}>
                  Mostra atalhos nas telas
                </div>
              </div>
              <NeonToggle value={settings.showSkipButton} onChange={() => updateSetting('showSkipButton', !settings.showSkipButton)} />
            </div>
          </div>

          {/* Transition Speed */}
          <div className="sett-card" style={{ animationDelay: '0.2s' }}>
            <div className="sett-label">Velocidade de Transição</div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
              {['slow', 'normal', 'fast', 'instant'].map(speed => (
                <button
                  key={speed}
                  className={`speed-btn ${settings.transitionSpeed === speed ? 'active' : ''}`}
                  onClick={() => updateSetting('transitionSpeed', speed)}
                >
                  {speedLabels[speed]}
                </button>
              ))}
            </div>
            <div style={{ fontSize: 11, color: 'rgba(0,212,255,0.5)', fontFamily: 'Orbitron, monospace', letterSpacing: '.1em' }}>
              ⏱ {speedDesc[settings.transitionSpeed] || ''}
            </div>
          </div>

          {/* Keyboard Shortcuts */}
          <div className="sett-card" style={{ animationDelay: '0.25s' }}>
            <div className="sett-label">Atalhos de Teclado</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { action: 'Pular tela atual', key: 'SPACE' },
                { action: 'Pular tela atual', key: 'ESC' },
              ].map(({ action, key }) => (
                <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', fontFamily: 'Rajdhani, sans-serif', fontWeight: 600 }}>{action}</span>
                  <span className="kbd-tag">{key}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Reset */}
          <div style={{ marginTop: 8, animationDelay: '0.3s' }}>
            <button className="reset-btn" onClick={resetSettings}>
              ↺ RESTAURAR PADRÕES
            </button>
          </div>

          {/* Footer note */}
          <div style={{ textAlign: 'center', fontFamily: 'Orbitron, monospace', fontSize: 9, letterSpacing: '.2em', color: 'rgba(255,255,255,0.12)', marginTop: 4 }}>
            CONFIGURAÇÕES SALVAS AUTOMATICAMENTE
          </div>

        </div>
      </div>

      {/* Floor glow */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, transparent, rgba(255,180,0,0.7) 30%, #ffd700 50%, rgba(255,180,0,0.7) 70%, transparent)', boxShadow: '0 0 40px rgba(255,215,0,0.4)', pointerEvents: 'none', zIndex: 30 }} />
    </div>
  );
};

const SIM_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Black+Ops+One&family=Rajdhani:wght@400;600;700&family=Orbitron:wght@400;700;900&display=swap');

  @keyframes sim-scan   { 0%{transform:translateY(-100%)} 100%{transform:translateY(100vh)} }
  @keyframes sim-pulse  { 0%,100%{opacity:.5;transform:scale(1)} 50%{opacity:1;transform:scale(1.06)} }
  @keyframes sim-entry  { 0%{opacity:0;transform:translateY(12px)} 100%{opacity:1;transform:translateY(0)} }
  @keyframes sim-spin   { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
  @keyframes sim-blink  { 0%,100%{opacity:1} 50%{opacity:0.4} }
  @keyframes bar-fill   { from{width:0%} to{width:var(--w)} }

  .sim-card {
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.08);
    clip-path: polygon(10px 0%, 100% 0%, calc(100% - 10px) 100%, 0% 100%);
    padding: 18px 20px;
    animation: sim-entry .4s ease both;
  }
  .sim-card:hover { border-color: rgba(255,215,0,0.15); }

  .sim-label {
    font-family: 'Orbitron', monospace;
    font-size: 9px;
    font-weight: 700;
    letter-spacing: .3em;
    color: rgba(255,215,0,0.5);
    text-transform: uppercase;
    margin-bottom: 10px;
  }

  .sim-select {
    width: 100%;
    background: rgba(0,0,0,0.4);
    border: 1px solid rgba(255,255,255,0.1);
    color: rgba(255,255,255,0.85);
    padding: 9px 12px;
    font-family: 'Rajdhani', sans-serif;
    font-size: 13px;
    font-weight: 600;
    outline: none;
    cursor: pointer;
    clip-path: polygon(5px 0%, 100% 0%, calc(100% - 5px) 100%, 0% 100%);
    transition: border-color .15s;
  }
  .sim-select:focus { border-color: rgba(255,215,0,0.4); }
  .sim-select:disabled { opacity: 0.5; cursor: not-allowed; }
  .sim-select option { background: #0a000f; }

  .sim-choice-btn {
    font-family: 'Orbitron', monospace;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: .1em;
    padding: 9px 4px;
    border: 1px solid rgba(255,255,255,0.1);
    background: rgba(255,255,255,0.03);
    color: rgba(255,255,255,0.3);
    cursor: pointer;
    transition: all .15s ease;
    clip-path: polygon(4px 0%, 100% 0%, calc(100% - 4px) 100%, 0% 100%);
    flex: 1;
  }
  .sim-choice-btn:disabled { opacity: 0.4; cursor: not-allowed; }
  .sim-choice-btn.active-p1 {
    border-color: rgba(0,212,255,0.6);
    color: #00d4ff;
    background: rgba(0,212,255,0.1);
    box-shadow: 0 0 12px rgba(0,212,255,0.2);
  }
  .sim-choice-btn.active-p2 {
    border-color: rgba(239,68,68,0.6);
    color: #ef4444;
    background: rgba(239,68,68,0.1);
    box-shadow: 0 0 12px rgba(239,68,68,0.2);
  }
  .sim-choice-btn.active-gold {
    border-color: rgba(255,215,0,0.6);
    color: #ffd700;
    background: rgba(255,215,0,0.08);
    box-shadow: 0 0 12px rgba(255,215,0,0.2);
  }
  .sim-choice-btn:hover:not(:disabled):not(.active-p1):not(.active-p2):not(.active-gold) {
    border-color: rgba(255,255,255,0.2);
    color: rgba(255,255,255,0.55);
  }

  .run-btn {
    font-family: 'Orbitron', monospace;
    font-size: 11px;
    font-weight: 900;
    letter-spacing: .18em;
    padding: 15px;
    width: 100%;
    border: none;
    cursor: pointer;
    clip-path: polygon(10px 0%, 100% 0%, calc(100% - 10px) 100%, 0% 100%);
    transition: all .18s ease;
  }
  .run-btn:not(:disabled) {
    background: linear-gradient(135deg, #ffd700 0%, #ff8c00 50%, #ff4500 100%);
    color: #0a0008;
    box-shadow: 0 0 24px rgba(255,165,0,0.4);
  }
  .run-btn:not(:disabled):hover {
    box-shadow: 0 0 40px rgba(255,165,0,0.6);
    transform: translateY(-1px);
  }
  .run-btn:disabled {
    background: rgba(255,255,255,0.06);
    color: rgba(255,255,255,0.2);
    cursor: not-allowed;
  }

  .stop-btn {
    font-family: 'Orbitron', monospace;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: .15em;
    padding: 11px;
    width: 100%;
    border: 1px solid rgba(239,68,68,0.5);
    background: rgba(239,68,68,0.08);
    color: rgba(239,68,68,0.9);
    cursor: pointer;
    clip-path: polygon(8px 0%, 100% 0%, calc(100% - 8px) 100%, 0% 100%);
    transition: all .15s;
  }
  .stop-btn:hover {
    background: rgba(239,68,68,0.15);
    border-color: rgba(239,68,68,0.8);
  }

  .sim-back-btn {
    font-family: 'Rajdhani', sans-serif;
    font-weight: 700;
    font-size: 13px;
    letter-spacing: .14em;
    padding: 8px 22px;
    border: 1px solid rgba(255,255,255,0.18);
    background: rgba(255,255,255,0.05);
    color: rgba(255,255,255,0.6);
    cursor: pointer;
    transition: all .15s ease;
    clip-path: polygon(7px 0%, 100% 0%, calc(100% - 7px) 100%, 0% 100%);
  }
  .sim-back-btn:hover {
    border-color: rgba(255,215,0,0.5);
    color: #ffd700;
    background: rgba(255,215,0,0.08);
  }

  .log-row:nth-child(odd) { background: rgba(255,255,255,0.02); }
`;

const SimTestScreen = ({ onBack }) => {
  const [player1Idx, setPlayer1Idx] = useState(0);
  const [player2Idx, setPlayer2Idx] = useState(1);
  const [selectedArena, setSelectedArena] = useState('BB10');
  const [format, setFormat] = useState('MD3');
  const [simCount, setSimCount] = useState(100);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState(null);
  const abortRef = useRef(false);

  const ARENAS = [
    { id: 'BB10',               name: 'BB-10 Attack Type' },
    { id: 'VOLCANIC_RAGE',      name: 'Volcanic Rage' },
    { id: 'KILLER_SIDES',       name: 'Killer Sides' },
    { id: 'NEXUS',              name: 'Prismatic Nexus' },
    { id: 'COLOSSEUM_CARNAGE',  name: 'Colosseum Carnage' },
    { id: 'PANGEA_PLATFORM',    name: 'Pangea Platform' },
    { id: 'PINBALL_INFERNO',    name: 'Pinball Inferno' },
    { id: 'VORTEX_COLISEUM',    name: 'Vortex Coliseum' },
  ];
  const FORMATS    = ['MD3', 'MD5', 'MD7'];
  const SIM_COUNTS = [50, 100, 200, 500];

  const buildTeam = (teamIdx) => {
    const team = TEAMS[teamIdx];
    // buildDeckWithBonuses: aplica TEC/INT/ADA/CLT/ATK/DEF/STA/SPD + arena preference
    const deck = buildDeckWithBonuses({ ...team, id: teamIdx }, selectedArena || null);
    return { ...team, id: teamIdx, deck };
  };

  const getMethodColor = (method = '') => {
    if (method.includes('Burst'))  return '#ef4444';
    if (method.includes('Spin'))   return '#3b82f6';
    if (method.includes('Over'))   return '#f59e0b';
    if (method.includes('Pitt'))   return '#8b5cf6';
    if (method.includes('Draw'))   return '#6b7280';
    return '#6b7280';
  };

  const stopSims = () => { abortRef.current = true; };

  const runSims = async () => {
    abortRef.current = false;
    setRunning(true);
    setProgress(0);
    setResults(null);

    const p1Name = TEAMS[player1Idx].name;
    const p2Name = TEAMS[player2Idx].name;
    const stats  = { p1Wins: 0, p2Wins: 0, draws: 0, methods: {}, roundCounts: [], recentLog: [], sweeps: { p1: 0, p2: 0 } };

    for (let i = 0; i < simCount; i++) {
      if (abortRef.current) break;
      const t1 = buildTeam(player1Idx);
      const t2 = buildTeam(player2Idx);
      try {
        const result = await runHeadlessMD3(t1, t2, [selectedArena], format);
        const winnerName = result.winner?.name;
        if (winnerName === p1Name)      { stats.p1Wins++; if (!result.score.team2) stats.sweeps.p1++; }
        else if (winnerName === p2Name) { stats.p2Wins++; if (!result.score.team1) stats.sweeps.p2++; }
        else stats.draws++;
        result.rounds.forEach(r => { if (r.method) stats.methods[r.method] = (stats.methods[r.method] || 0) + 1; });
        stats.roundCounts.push(result.rounds.length);
        stats.recentLog.unshift({ n: i + 1, winner: winnerName || 'Draw', score: `${result.score.team1}-${result.score.team2}`, rounds: result.rounds.length, lastMethod: result.rounds[result.rounds.length - 1]?.method || '?' });
        if (stats.recentLog.length > 40) stats.recentLog.pop();
      } catch (e) { console.error('Sim error:', e); }
      setProgress(Math.round((i + 1) / simCount * 100));
      if (i % 8 === 7) await new Promise(r => setTimeout(r, 0));
    }

    setResults({ ...stats, ranCount: stats.roundCounts.length });
    setRunning(false);
  };

  const totalMatches = results ? results.p1Wins + results.p2Wins + results.draws : 0;
  const totalRounds  = results ? Object.values(results.methods).reduce((a, b) => a + b, 0) : 0;
  const avgRounds    = results && results.roundCounts.length > 0
    ? (results.roundCounts.reduce((a, b) => a + b, 0) / results.roundCounts.length).toFixed(2) : '—';

  const p1Name  = TEAMS[player1Idx].name;
  const p2Name  = TEAMS[player2Idx].name;
  const p1Short = p1Name.replace(/"[^"]*"\s*/, '').split(' ').slice(0, 2).join(' ');
  const p2Short = p2Name.replace(/"[^"]*"\s*/, '').split(' ').slice(0, 2).join(' ');
  const p1Pct   = totalMatches ? ((results.p1Wins / totalMatches) * 100).toFixed(1) : '0.0';
  const p2Pct   = totalMatches ? ((results.p2Wins / totalMatches) * 100).toFixed(1) : '0.0';
  const dPct    = totalMatches ? ((results.draws  / totalMatches) * 100).toFixed(1) : '0.0';

  const p1Color = TEAMS[player1Idx]?.colors?.[0] || '#00d4ff';
  const p2Color = TEAMS[player2Idx]?.colors?.[0] || '#ef4444';

  return (
    <div style={{
      width: '100vw', minHeight: '100vh',
      background: 'radial-gradient(ellipse 120% 90% at 50% 110%, #1a0030 0%, #0a000f 45%, #000008 100%)',
      position: 'relative', overflow: 'hidden', fontFamily: 'Rajdhani, sans-serif',
    }}>
      <style>{SIM_STYLES}</style>

      {/* Grid background */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', backgroundImage: `linear-gradient(rgba(0,212,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,255,0.025) 1px, transparent 1px)`, backgroundSize: '60px 60px', maskImage: 'radial-gradient(ellipse 80% 60% at 50% 100%, black, transparent)', WebkitMaskImage: 'radial-gradient(ellipse 80% 60% at 50% 100%, black, transparent)' }} />

      {/* Orbs */}
      <div style={{ position: 'fixed', top: '8%', left: '5%', width: 360, height: 360, borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,212,255,0.07), transparent 70%)', filter: 'blur(60px)', pointerEvents: 'none' }} />
      <div style={{ position: 'fixed', bottom: '8%', right: '5%', width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(239,68,68,0.07), transparent 70%)', filter: 'blur(60px)', pointerEvents: 'none' }} />

      {/* Scanline */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 50, opacity: 0.12 }}>
        <div style={{ width: '100%', height: '2px', background: 'linear-gradient(90deg, transparent, rgba(0,212,255,0.8), transparent)', animation: 'sim-scan 9s linear infinite' }} />
      </div>

      {/* Top bar */}
      <div style={{ position: 'sticky', top: 0, zIndex: 40, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,215,0,0.1)', padding: '0 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 56 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: running ? '#00ff88' : '#ffd700', boxShadow: `0 0 8px ${running ? '#00ff88' : '#ffd700'}`, animation: 'sim-pulse 2s ease-in-out infinite' }} />
          <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 11, letterSpacing: '0.4em', color: 'rgba(255,215,0,0.7)', textTransform: 'uppercase' }}>
            BAYBLADE: UNIVERSE — SIM TEST
          </span>
          {running && <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 9, letterSpacing: '.2em', color: '#00ff88', animation: 'sim-blink 1s ease-in-out infinite' }}>● EXECUTANDO</span>}
        </div>
        <button className="sim-back-btn" onClick={onBack}>← MENU</button>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 1380, margin: '0 auto', padding: '28px 28px 64px' }}>

        {/* Title */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontFamily: 'Black Ops One, cursive', fontSize: 'clamp(28px,3.5vw,44px)', lineHeight: 1, background: 'linear-gradient(180deg, #fff 0%, #ffd700 45%, #ff8c00 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', filter: 'drop-shadow(0 0 20px rgba(255,165,0,0.4))', marginBottom: 4 }}>SIM TEST</div>
          <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 10, letterSpacing: '0.3em', color: 'rgba(255,255,255,0.25)' }}>ANÁLISE ESTATÍSTICA · FÍSICA HEADLESS</div>
        </div>

        <div style={{ height: 1, background: 'linear-gradient(90deg, rgba(255,215,0,0.4), transparent)', marginBottom: 20 }} />

        <div style={{ display: 'grid', gridTemplateColumns: '290px 1fr', gap: 16, alignItems: 'start' }}>

          {/* ── LEFT PANEL ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>

            {/* Player 1 */}
            <div className="sim-card" style={{ borderColor: `${p1Color}33`, animationDelay: '0.05s' }}>
              <div className="sim-label" style={{ color: `${p1Color}99` }}>Fighter 1</div>
              <select className="sim-select" value={player1Idx} onChange={e => setPlayer1Idx(Number(e.target.value))} disabled={running}
                style={{ borderColor: `${p1Color}33`, marginBottom: 8 }}>
                {TEAMS.map((t, i) => <option key={i} value={i}>{t.name}</option>)}
              </select>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <img src={TEAMS[player1Idx]?.iconUrl || TEAMS[player1Idx]?.photoUrl} alt="" style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', border: `1px solid ${p1Color}55` }} onError={e => { e.target.src = TEAMS[player1Idx]?.photoUrl; }} />
                <div style={{ fontSize: 11, color: `${p1Color}cc`, fontFamily: 'Orbitron, monospace', letterSpacing: '.05em' }}>
                  {TEAMS[player1Idx]?.mentality?.replace(/_/g, ' ')} · {TEAMS[player1Idx]?.tier}
                </div>
              </div>
            </div>

            {/* VS */}
            <div style={{ textAlign: 'center', padding: '4px 0' }}>
              <span style={{ fontFamily: 'Black Ops One, cursive', fontSize: 18, background: 'linear-gradient(90deg, #00d4ff, #ff4444)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '.2em' }}>VS</span>
            </div>

            {/* Player 2 */}
            <div className="sim-card" style={{ borderColor: `${p2Color}33`, animationDelay: '0.1s' }}>
              <div className="sim-label" style={{ color: `${p2Color}99` }}>Fighter 2</div>
              <select className="sim-select" value={player2Idx} onChange={e => setPlayer2Idx(Number(e.target.value))} disabled={running}
                style={{ borderColor: `${p2Color}33`, marginBottom: 8 }}>
                {TEAMS.map((t, i) => <option key={i} value={i}>{t.name}</option>)}
              </select>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <img src={TEAMS[player2Idx]?.iconUrl || TEAMS[player2Idx]?.photoUrl} alt="" style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', border: `1px solid ${p2Color}55` }} onError={e => { e.target.src = TEAMS[player2Idx]?.photoUrl; }} />
                <div style={{ fontSize: 11, color: `${p2Color}cc`, fontFamily: 'Orbitron, monospace', letterSpacing: '.05em' }}>
                  {TEAMS[player2Idx]?.mentality?.replace(/_/g, ' ')} · {TEAMS[player2Idx]?.tier}
                </div>
              </div>
            </div>

            {/* Arena */}
            <div className="sim-card" style={{ animationDelay: '0.15s' }}>
              <div className="sim-label">Arena</div>
              <select className="sim-select" value={selectedArena} onChange={e => setSelectedArena(e.target.value)} disabled={running}>
                {ARENAS.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>

            {/* Format */}
            <div className="sim-card" style={{ animationDelay: '0.2s' }}>
              <div className="sim-label">Formato</div>
              <div style={{ display: 'flex', gap: 6 }}>
                {FORMATS.map(f => (
                  <button key={f} className={`sim-choice-btn ${format === f ? 'active-gold' : ''}`} onClick={() => setFormat(f)} disabled={running}>{f}</button>
                ))}
              </div>
            </div>

            {/* Sim count */}
            <div className="sim-card" style={{ animationDelay: '0.25s' }}>
              <div className="sim-label">Simulações</div>
              <div style={{ display: 'flex', gap: 6 }}>
                {SIM_COUNTS.map(n => (
                  <button key={n} className={`sim-choice-btn ${simCount === n ? 'active-gold' : ''}`} onClick={() => setSimCount(n)} disabled={running}>{n}</button>
                ))}
              </div>
            </div>

            {/* Run / Stop */}
            {!running ? (
              <button className="run-btn" onClick={runSims} disabled={player1Idx === player2Idx}>
                ▶ EXECUTAR {simCount}
              </button>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                  <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 9, letterSpacing: '.15em', color: 'rgba(255,255,255,0.4)' }}>PROCESSANDO</span>
                  <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 10, fontWeight: 700, color: '#00d4ff' }}>{progress}%</span>
                </div>
                <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 99, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${progress}%`, background: 'linear-gradient(to right, #00d4ff, #7b2fff)', transition: 'width .15s', borderRadius: 99 }} />
                </div>
                <button className="stop-btn" onClick={stopSims}>⏹ PARAR</button>
              </div>
            )}

            {player1Idx === player2Idx && (
              <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 9, letterSpacing: '.12em', color: '#ef4444', textAlign: 'center' }}>
                ⚠ SELECIONE FIGHTERS DIFERENTES
              </div>
            )}
          </div>

          {/* ── RIGHT PANEL ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

            {/* Empty state */}
            {!results && !running && (
              <div className="sim-card" style={{ padding: '64px 24px', textAlign: 'center', animationDelay: '0.05s' }}>
                <div style={{ fontSize: 48, marginBottom: 16, animation: 'sim-spin 8s linear infinite', display: 'inline-block' }}>⚙</div>
                <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 11, letterSpacing: '.2em', color: 'rgba(255,255,255,0.2)', lineHeight: 2 }}>
                  CONFIGURE O MATCHUP<br/>E EXECUTE AS SIMULAÇÕES
                </div>
              </div>
            )}

            {/* Running state */}
            {running && !results && (
              <div className="sim-card" style={{ padding: '56px 24px', textAlign: 'center', animationDelay: '0s' }}>
                <div style={{ fontFamily: 'Black Ops One, cursive', fontSize: 36, background: 'linear-gradient(90deg, #00d4ff, #7b2fff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: 8 }}>
                  {Math.round(progress * simCount / 100)} / {simCount}
                </div>
                <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 10, letterSpacing: '.2em', color: 'rgba(255,255,255,0.35)' }}>
                  {p1Short} vs {p2Short} · {ARENAS.find(a => a.id === selectedArena)?.name} · {format}
                </div>
              </div>
            )}

            {results && (<>

              {/* Win Rate bar */}
              <div className="sim-card" style={{ animationDelay: '0s' }}>
                <div className="sim-label">
                  Taxa de Vitória — {totalMatches} simulações · {ARENAS.find(a => a.id === selectedArena)?.name} · {format}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 12 }}>
                  <div>
                    <div style={{ fontFamily: 'Black Ops One, cursive', fontSize: 36, color: p1Color, lineHeight: 1 }}>{p1Pct}%</div>
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', fontFamily: 'Rajdhani, sans-serif', marginTop: 2 }}>{p1Short}</div>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', fontFamily: 'Orbitron, monospace', letterSpacing: '.05em' }}>{results.p1Wins}V · {results.sweeps.p1} SWEEP</div>
                  </div>
                  {results.draws > 0 && (
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 18, fontWeight: 700, color: 'rgba(255,255,255,0.25)' }}>{dPct}%</div>
                      <div style={{ fontSize: 9, letterSpacing: '.15em', color: 'rgba(255,255,255,0.2)', fontFamily: 'Orbitron, monospace' }}>EMPATES</div>
                    </div>
                  )}
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontFamily: 'Black Ops One, cursive', fontSize: 36, color: p2Color, lineHeight: 1 }}>{p2Pct}%</div>
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', fontFamily: 'Rajdhani, sans-serif', marginTop: 2 }}>{p2Short}</div>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', fontFamily: 'Orbitron, monospace', letterSpacing: '.05em' }}>{results.p2Wins}V · {results.sweeps.p2} SWEEP</div>
                  </div>
                </div>

                {/* Bar */}
                <div style={{ display: 'flex', height: 12, borderRadius: 99, overflow: 'hidden', background: 'rgba(255,255,255,0.05)', marginBottom: 10 }}>
                  <div style={{ width: `${p1Pct}%`, background: `linear-gradient(to right, ${p1Color}88, ${p1Color})`, transition: 'width .6s cubic-bezier(.22,1,.36,1)' }} />
                  <div style={{ width: `${dPct}%`, background: 'rgba(255,255,255,0.15)' }} />
                  <div style={{ width: `${p2Pct}%`, background: `linear-gradient(to left, ${p2Color}88, ${p2Color})`, transition: 'width .6s cubic-bezier(.22,1,.36,1)' }} />
                </div>

                <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 9, letterSpacing: '.12em', color: totalMatches >= 200 ? '#00c48c' : totalMatches >= 100 ? '#ffd700' : '#ef4444' }}>
                  {totalMatches >= 200 ? '✓ ALTA CONFIANÇA (≥200 AMOSTRAS)' : totalMatches >= 100 ? '⚡ CONFIANÇA MODERADA' : '⚠ CONFIANÇA BAIXA — USE 100+ AMOSTRAS'}
                </div>
              </div>

              {/* Methods + Stats */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>

                <div className="sim-card" style={{ animationDelay: '.05s' }}>
                  <div className="sim-label">Métodos de Vitória</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {Object.entries(results.methods).sort(([, a], [, b]) => b - a).map(([method, count]) => {
                      const pct = totalRounds > 0 ? (count / totalRounds * 100).toFixed(1) : 0;
                      const color = getMethodColor(method);
                      return (
                        <div key={method}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', fontFamily: 'Rajdhani, sans-serif', fontWeight: 600 }}>{method}</span>
                            <span style={{ fontSize: 11, fontFamily: 'Orbitron, monospace', color }}>{pct}%</span>
                          </div>
                          <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 99, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 99, transition: 'width .5s' }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="sim-card" style={{ animationDelay: '.08s' }}>
                  <div className="sim-label">Estatísticas Gerais</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {[
                      { l: 'Rounds médios/match',        v: avgRounds,                c: '#f1f5f9' },
                      { l: 'Win Rate P1',                v: `${p1Pct}%`,             c: p1Color },
                      { l: 'Win Rate P2',                v: `${p2Pct}%`,             c: p2Color },
                      { l: 'Sweeps P1',                  v: results.sweeps.p1,       c: `${p1Color}cc` },
                      { l: 'Sweeps P2',                  v: results.sweeps.p2,       c: `${p2Color}cc` },
                      { l: 'Taxa de empate',             v: `${dPct}%`,              c: 'rgba(255,255,255,0.3)' },
                      { l: 'Simulações executadas',      v: results.ranCount,        c: 'rgba(255,255,255,0.5)' },
                    ].map(({ l, v, c }) => (
                      <div key={l} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', fontFamily: 'Rajdhani, sans-serif' }}>{l}</span>
                        <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 13, fontWeight: 700, color: c }}>{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Match Log */}
              <div className="sim-card" style={{ animationDelay: '.12s' }}>
                <div className="sim-label">Log das Batalhas (últimas {results.recentLog.length})</div>
                <div style={{ maxHeight: 240, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {results.recentLog.map((entry, i) => {
                    const isP1 = entry.winner === TEAMS[player1Idx].name;
                    const isP2 = entry.winner === TEAMS[player2Idx].name;
                    const rowBg = isP1 ? `${p1Color}11` : isP2 ? `${p2Color}11` : 'rgba(255,255,255,0.02)';
                    const nameColor = isP1 ? p1Color : isP2 ? p2Color : 'rgba(255,255,255,0.25)';
                    return (
                      <div key={i} className="log-row" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '5px 8px', borderRadius: 4, background: rowBg }}>
                        <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 9, color: 'rgba(255,255,255,0.2)', minWidth: 28 }}>#{entry.n}</span>
                        <span style={{ fontWeight: 700, fontSize: 12, flex: 1, color: nameColor, fontFamily: 'Rajdhani, sans-serif' }}>
                          {isP1 ? p1Short : isP2 ? p2Short : 'DRAW'}
                        </span>
                        <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 11, color: 'rgba(255,255,255,0.35)', fontWeight: 700 }}>{entry.score}</span>
                        <span style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 11, color: getMethodColor(entry.lastMethod), fontWeight: 600, minWidth: 80, textAlign: 'right' }}>{entry.lastMethod}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

            </>)}
          </div>
        </div>
      </div>

      {/* Floor glow */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, transparent, rgba(255,180,0,0.7) 30%, #ffd700 50%, rgba(255,180,0,0.7) 70%, transparent)', boxShadow: '0 0 40px rgba(255,215,0,0.4)', pointerEvents: 'none', zIndex: 30 }} />
    </div>
  );
};

export {
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
};
