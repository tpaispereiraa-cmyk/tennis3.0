// ====================================================================
// VERSUS SHOWCASE ENHANCED - Com imagens full body
// ====================================================================
// Arquivo: VersusShowcase.jsx (VERSÃO MELHORADA)

import React from 'react';
import { Swords, AlertCircle, Zap, Target, Crown, TrendingUp } from 'lucide-react';
import { FighterCard } from './FighterCard.jsx';
import PlayerImage from './PlayerImage'; // ← IMPORTAR!

// ====================================================================
// VERSUS SHOWCASE - Apresentação cinematográfica da próxima luta
// ====================================================================

export const VersusShowcase = ({ 
  match, 
  universeManager, 
  onPlayMatch 
}) => {
  if (!match) return null;

  const player1 = match.player1;
  const player2 = match.player2;

  // Get context data
  const rivalry = universeManager?.getRivalry?.(player1.id, player2.id);
  const headToHead = universeManager?.getHeadToHead?.(player1.id, player2.id) || [];
  const player1Stats = universeManager?.getPlayerStats?.(player1.id) || {};
  const player2Stats = universeManager?.getPlayerStats?.(player2.id) || {};

  // Generate context alerts
  const contextAlerts = generateContextAlerts({
    rivalry,
    headToHead,
    player1,
    player2,
    player1Stats,
    player2Stats
  });

  return (
    <div className="relative mb-8">
      {/* ⭐ NOVO: Background com imagens full body (blur) */}
      <div className="absolute inset-0 flex rounded-2xl overflow-hidden">
        <div className="w-1/2 relative overflow-hidden">
          <PlayerImage 
            player={player1}
            type="full"
            size="xl"
            className="absolute inset-0 w-full h-full object-cover opacity-10 blur-2xl scale-150"
          />
          <div 
            className="absolute inset-0"
            style={{ 
              background: `linear-gradient(to right, ${player1.colors[0]}40, transparent)` 
            }} 
          />
        </div>
        <div className="w-1/2 relative overflow-hidden">
          <PlayerImage 
            player={player2}
            type="full"
            size="xl"
            className="absolute inset-0 w-full h-full object-cover opacity-10 blur-2xl scale-150"
          />
          <div 
            className="absolute inset-0"
            style={{ 
              background: `linear-gradient(to left, ${player2.colors[0]}40, transparent)` 
            }} 
          />
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 bg-gray-900/80 backdrop-blur-xl rounded-2xl border-2 border-purple-500/50 p-8">
        
        {/* Title */}
        <div className="text-center mb-8">
          <div className="inline-block bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-2 rounded-full mb-3">
            <Swords className="w-5 h-5 inline mr-2" />
            <span className="font-black text-white text-lg">PRÓXIMA BATALHA</span>
          </div>
          
          {/* Context Alerts */}
          {contextAlerts.length > 0 && (
            <div className="flex flex-wrap justify-center gap-2 mt-4">
              {contextAlerts.map((alert, idx) => (
                <ContextAlert key={idx} {...alert} />
              ))}
            </div>
          )}
        </div>

        {/* ⭐ NOVA VERSÃO: Fighter Showcase com imagens grandes */}
        <div className="flex items-stretch justify-between gap-8 max-w-6xl mx-auto mb-8">
          {/* Player 1 Showcase */}
          <FighterShowcaseEnhanced
            player={player1}
            stats={player1Stats}
            universeManager={universeManager}
            side="left"
          />

          {/* VS Badge */}
          <div className="flex-shrink-0 flex items-center">
            <VSBadgeEnhanced />
          </div>

          {/* Player 2 Showcase */}
          <FighterShowcaseEnhanced
            player={player2}
            stats={player2Stats}
            universeManager={universeManager}
            side="right"
          />
        </div>

        {/* Head to Head */}
        {headToHead.length > 0 && (
          <HeadToHeadDisplay 
            player1={player1}
            player2={player2}
            headToHead={headToHead}
          />
        )}

        {/* Play Button */}
        <div className="flex justify-center mt-8">
          <button
            onClick={() => onPlayMatch(match)}
            className="group relative overflow-hidden bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 hover:from-purple-500 hover:via-pink-500 hover:to-purple-500 text-white px-16 py-6 rounded-2xl font-black text-2xl transition-all transform hover:scale-105 shadow-lg shadow-purple-600/50"
          >
            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform"></div>
            <span className="relative flex items-center gap-3">
              <Swords className="w-8 h-8" />
              INICIAR BATALHA
              <Swords className="w-8 h-8" />
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

// ====================================================================
// ⭐ NOVO COMPONENTE - Fighter Showcase com imagem grande
// ====================================================================

const FighterShowcaseEnhanced = ({ player, stats, universeManager, side }) => {
  const record = stats.record || { wins: 0, losses: 0 };
  const recentForm = stats.recentForm || [];
  const ranking = stats.ranking || player.ranking || '-';
  
  const totalMatches = record.wins + record.losses;
  const winRate = totalMatches > 0 ? ((record.wins / totalMatches) * 100).toFixed(0) : 0;
  
  const colors = player.colors || ['#3B82F6', '#1E40AF'];

  return (
    <div 
      className={`
        flex-1 relative overflow-hidden rounded-2xl p-6
        ${side === 'left' ? 'items-start' : 'items-end'}
      `}
      style={{
        background: `linear-gradient(135deg, ${colors[0]}20 0%, ${colors[1]}40 100%)`,
        border: `2px solid ${colors[0]}`,
        boxShadow: `0 0 30px ${colors[0]}40`
      }}
    >
      {/* Background Gradient */}
      <div 
        className="absolute inset-0 opacity-10"
        style={{
          background: `radial-gradient(circle at ${side === 'left' ? '0%' : '100%'} 50%, ${colors[0]} 0%, transparent 70%)`
        }}
      />

      {/* Content */}
      <div className={`relative z-10 ${side === 'right' ? 'text-right' : 'text-left'}`}>
        {/* Header: Flag + Ranking */}
        <div className={`flex items-center justify-between mb-4 ${side === 'right' ? 'flex-row-reverse' : ''}`}>
          <div className="bg-white/10 backdrop-blur-sm px-3 py-1 rounded-full">
            <span className="text-xs font-bold text-white/80">{player.country}</span>
          </div>
          <div 
            className="bg-gradient-to-r from-yellow-500 to-yellow-600 px-4 py-2 rounded-full flex items-center gap-2"
          >
            <Crown className="w-4 h-4 text-white" />
            <span className="font-black text-white text-sm">#{ranking}</span>
          </div>
        </div>

        {/* ⭐ IMAGEM GRANDE DO JOGADOR */}
        <div className={`flex justify-center mb-4 ${side === 'right' ? 'flex-row-reverse' : ''}`}>
          <div className="relative">
            {/* Glow effect */}
            <div 
              className="absolute inset-0 blur-2xl opacity-30 animate-pulse"
              style={{ backgroundColor: colors[0] }}
            />
            
            {/* Imagem do jogador */}
            <PlayerImage 
              player={player}
              type="full"
              size="lg"
              showBorder={true}
              borderColor={colors[0]}
              className="relative z-10 drop-shadow-2xl"
            />
          </div>
        </div>

        {/* Nome */}
        <div className="mb-4">
          <h2 className="font-black text-white text-3xl mb-1">
            {player.name}
          </h2>
        </div>

        {/* Record */}
        <div className="bg-black/30 backdrop-blur-sm rounded-lg p-3 mb-4">
          <div className="flex items-center justify-center gap-4">
            <div className="text-center">
              <div className="text-green-400 font-black text-2xl">{record.wins}</div>
              <div className="text-white/50 text-xs">WINS</div>
            </div>
            <div className="text-white/30 text-2xl">-</div>
            <div className="text-center">
              <div className="text-red-400 font-black text-2xl">{record.losses}</div>
              <div className="text-white/50 text-xs">LOSSES</div>
            </div>
          </div>
          <div className="mt-2 text-center">
            <span className="text-white/70 text-xs">Win Rate: </span>
            <span className="text-white font-bold text-sm">{winRate}%</span>
          </div>
        </div>

        {/* Recent Form */}
        {recentForm.length > 0 && (
          <div className="mb-4">
            <div className="text-white/50 text-xs text-center mb-2">Recent Form</div>
            <div className="flex justify-center gap-2">
              {recentForm.map((result, idx) => (
                <div
                  key={idx}
                  className={`
                    w-8 h-8 rounded-full flex items-center justify-center
                    ${result === 'W' ? 'bg-green-500' : 'bg-red-500'} 
                    font-black text-white text-sm
                    border-2 border-white/30
                  `}
                >
                  {result}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Key Stats */}
        <div className="bg-black/30 backdrop-blur-sm rounded-lg p-3">
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="text-center">
              <div className="text-white font-bold">{stats.avgPoints?.toFixed(1) || '0.0'}</div>
              <div className="text-white/50">Avg Points</div>
            </div>
            <div className="text-center">
              <div className="text-white font-bold">{stats.totalBursts || 0}</div>
              <div className="text-white/50">Bursts</div>
            </div>
            <div className="text-center">
              <div className="text-white font-bold">{stats.totalRingOuts || 0}</div>
              <div className="text-white/50">Ring Outs</div>
            </div>
            <div className="text-center">
              <div className="text-white font-bold">{stats.currentStreak || 0}W</div>
              <div className="text-white/50">Streak</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ====================================================================
// ⭐ NOVO COMPONENTE - VS Badge melhorado
// ====================================================================

const VSBadgeEnhanced = () => {
  return (
    <div className="relative">
      {/* Glow effect animado */}
      <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full blur-2xl opacity-50 animate-pulse"></div>
      
      {/* Badge principal */}
      <div className="relative w-32 h-32 bg-gradient-to-br from-purple-600 via-pink-600 to-purple-600 rounded-full flex items-center justify-center border-4 border-white shadow-2xl">
        <div className="absolute inset-0 rounded-full bg-white/10 animate-ping"></div>
        <span className="relative text-5xl font-black text-white">VS</span>
      </div>
      
      {/* Efeito de raios */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(8)].map((_, i) => {
          const angle = (i / 8) * 360;
          return (
            <div
              key={i}
              className="absolute w-1 h-8 bg-gradient-to-t from-yellow-400 to-transparent"
              style={{
                left: '50%',
                top: '50%',
                transform: `rotate(${angle}deg) translateY(-60px)`,
                transformOrigin: 'center',
                opacity: 0.6,
                animation: 'pulse 2s ease-in-out infinite',
                animationDelay: `${i * 0.1}s`
              }}
            />
          );
        })}
      </div>
    </div>
  );
};

// ====================================================================
// SUB-COMPONENTS (mantidos do original)
// ====================================================================

const HeadToHeadDisplay = ({ player1, player2, headToHead }) => {
  const player1Wins = headToHead.filter(m => m.winner === 'player1').length;
  const player2Wins = headToHead.filter(m => m.winner === 'player2').length;

  return (
    <div className="bg-black/30 backdrop-blur-sm rounded-xl p-6 border border-white/10">
      <div className="text-center mb-4">
        <h3 className="text-white font-bold text-lg mb-1">Head to Head</h3>
        <p className="text-white/50 text-sm">{headToHead.length} confrontos anteriores</p>
      </div>
      
      <div className="flex items-center justify-center gap-8">
        <div className="text-center">
          <div className="text-4xl font-black mb-2" style={{ color: player1.colors[0] }}>
            {player1Wins}
          </div>
          <div className="text-white/70 text-sm">{player1.name}</div>
        </div>
        
        <div className="text-white/30 text-2xl">-</div>
        
        <div className="text-center">
          <div className="text-4xl font-black mb-2" style={{ color: player2.colors[0] }}>
            {player2Wins}
          </div>
          <div className="text-white/70 text-sm">{player2.name}</div>
        </div>
      </div>

      {/* Recent Matches */}
      <div className="mt-4 flex justify-center gap-2">
        {headToHead.slice(-5).map((match, idx) => (
          <div
            key={idx}
            className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
              match.winner === 'player1' 
                ? 'text-white border-2' 
                : 'text-white border-2'
            }`}
            style={{
              backgroundColor: match.winner === 'player1' ? player1.colors[0] : player2.colors[0],
              borderColor: 'white'
            }}
          >
            {match.winner === 'player1' ? '1' : '2'}
          </div>
        ))}
      </div>
    </div>
  );
};

const generateContextAlerts = ({ rivalry, headToHead, player1, player2, player1Stats, player2Stats }) => {
  const alerts = [];

  if (rivalry && rivalry.level === 'INTENSE') {
    alerts.push({
      icon: <AlertCircle className="w-4 h-4" />,
      message: '🔥 RIVALIDADE INTENSA',
      color: 'red'
    });
  }

  if (headToHead.length > 0) {
    const lastMatch = headToHead[headToHead.length - 1];
    const lastWinner = lastMatch.winner === 'player1' ? player1.name : player2.name;
    alerts.push({
      icon: <Target className="w-4 h-4" />,
      message: `Revanche! Última vitória: ${lastWinner}`,
      color: 'blue'
    });
  }

  if (player1Stats.currentStreak >= 5) {
    alerts.push({
      icon: <Zap className="w-4 h-4" />,
      message: `${player1.name} em sequência de ${player1Stats.currentStreak} vitórias!`,
      color: 'yellow'
    });
  }
  if (player2Stats.currentStreak >= 5) {
    alerts.push({
      icon: <Zap className="w-4 h-4" />,
      message: `${player2.name} em sequência de ${player2Stats.currentStreak} vitórias!`,
      color: 'yellow'
    });
  }

  if (player1Stats.ranking === 1 || player2Stats.ranking === 1) {
    const champion = player1Stats.ranking === 1 ? player1.name : player2.name;
    alerts.push({
      icon: <Crown className="w-4 h-4" />,
      message: `${champion} é o atual #1 do ranking!`,
      color: 'gold'
    });
  }

  const rankDiff = Math.abs((player1Stats.ranking || 99) - (player2Stats.ranking || 99));
  if (rankDiff >= 20) {
    alerts.push({
      icon: <TrendingUp className="w-4 h-4" />,
      message: 'David vs Golias - Grande diferença de ranking!',
      color: 'purple'
    });
  }

  return alerts.slice(0, 3);
};

const ContextAlert = ({ icon, message, color }) => {
  const colorClasses = {
    red: 'bg-red-500/20 text-red-400 border-red-500/50',
    blue: 'bg-blue-500/20 text-blue-400 border-blue-500/50',
    yellow: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50',
    gold: 'bg-yellow-600/20 text-yellow-300 border-yellow-600/50',
    purple: 'bg-purple-500/20 text-purple-400 border-purple-500/50'
  };

  return (
    <div className={`
      ${colorClasses[color]}
      backdrop-blur-sm rounded-lg px-4 py-3
      border-l-4 border
      flex items-center gap-3
    `}>
      {icon}
      <span className="text-sm font-medium">{message}</span>
    </div>
  );
};
