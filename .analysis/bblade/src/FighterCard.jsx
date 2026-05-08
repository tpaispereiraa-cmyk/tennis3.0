import React from 'react';
import { Trophy, TrendingUp, TrendingDown, Minus, Award, Flame } from 'lucide-react';

// ====================================================================
// FIGHTER CARD - Card visual detalhado de um jogador
// ====================================================================

export const FighterCard = ({ 
  player, 
  universeManager,
  side = 'left',
  size = 'large' // large, medium, small
}) => {
  if (!player) return null;

  const stats = universeManager?.getPlayerStats?.(player.id) || {};
  const record = stats.record || { wins: 0, losses: 0 };
  const recentForm = stats.recentForm || []; // últimos 5 jogos: ['W', 'W', 'L', 'W', 'W']
  const ranking = stats.ranking || player.ranking || '-';
  
  const team = player.team || player;
  const colors = team.colors || ['#3B82F6', '#1E40AF'];
  const customIcon = team.customIcon;
  const playerName = team.name || player.name;
  const country = player.country || team.country || 'Unknown';
  const nickname = player.nickname || team.nickname;
  
  // Calculate win rate
  const totalMatches = record.wins + record.losses;
  const winRate = totalMatches > 0 ? ((record.wins / totalMatches) * 100).toFixed(0) : 0;

  return (
    <div 
      className={`
        fighter-card fighter-card-${side} fighter-card-${size}
        relative overflow-hidden rounded-2xl
        ${size === 'large' ? 'p-8' : size === 'medium' ? 'p-6' : 'p-4'}
      `}
      style={{
        background: `linear-gradient(135deg, ${colors[0]}20 0%, ${colors[1]}40 100%)`,
        border: `2px solid ${colors[0]}`,
        boxShadow: `0 0 30px ${colors[0]}40`
      }}
    >
      {/* Background Gradient Accent */}
      <div 
        className="absolute inset-0 opacity-10"
        style={{
          background: `radial-gradient(circle at ${side === 'left' ? '0%' : '100%'} 50%, ${colors[0]} 0%, transparent 70%)`
        }}
      />

      {/* Content */}
      <div className="relative z-10">
        {/* Header: Flag + Ranking */}
        <div className={`flex items-center justify-between mb-4 ${side === 'right' ? 'flex-row-reverse' : ''}`}>
          <CountryFlag code={country} />
          <RankingBadge rank={ranking} />
        </div>

        {/* Avatar GRANDE */}
        <div className="flex justify-center mb-6">
          <FighterAvatar 
            customIcon={customIcon}
            playerName={playerName}
            color={colors[0]}
            size={size === 'large' ? 'xl' : size === 'medium' ? 'lg' : 'md'}
          />
        </div>

        {/* Nome */}
        <div className="text-center mb-4">
          <h2 className={`font-black text-white ${
            size === 'large' ? 'text-3xl' : size === 'medium' ? 'text-2xl' : 'text-xl'
          }`}>
            {playerName}
          </h2>
        </div>

        {/* Record */}
        <RecordDisplay record={record} winRate={winRate} size={size} />

        {/* Recent Form */}
        {recentForm.length > 0 && (
          <FormStreak form={recentForm} size={size} />
        )}

        {/* Key Stats */}
        {size === 'large' && (
          <KeyStats stats={stats} />
        )}
      </div>
    </div>
  );
};

// ====================================================================
// SUB-COMPONENTS
// ====================================================================

const CountryFlag = ({ code }) => {
  // Simplified flag representation
  return (
    <div className="bg-white/10 backdrop-blur-sm px-3 py-1 rounded-full">
      <span className="text-xs font-bold text-white/80">{code}</span>
    </div>
  );
};

const RankingBadge = ({ rank }) => {
  const getRankColor = (r) => {
    if (r <= 5) return 'from-yellow-500 to-yellow-600';
    if (r <= 10) return 'from-gray-300 to-gray-400';
    if (r <= 20) return 'from-orange-600 to-orange-700';
    return 'from-blue-500 to-blue-600';
  };

  return (
    <div className={`
      bg-gradient-to-r ${getRankColor(rank)}
      px-4 py-2 rounded-full
      flex items-center gap-2
    `}>
      <Trophy className="w-4 h-4 text-white" />
      <span className="font-black text-white text-sm">#{rank}</span>
    </div>
  );
};

const FighterAvatar = ({ customIcon, playerName, color, size }) => {
  const sizeClasses = {
    xl: 'w-32 h-32 text-5xl',
    lg: 'w-24 h-24 text-4xl',
    md: 'w-16 h-16 text-2xl',
    sm: 'w-12 h-12 text-xl'
  };

  return (
    <div 
      className={`
        ${sizeClasses[size]}
        rounded-full flex items-center justify-center
        border-4 overflow-hidden
        transform transition-transform hover:scale-110
      `}
      style={{
        backgroundColor: color,
        borderColor: color,
        boxShadow: `0 0 30px ${color}80`
      }}
    >
      {customIcon ? (
        <img 
          src={customIcon}
          alt={playerName}
          className="w-full h-full object-cover"
        />
      ) : (
        <span className="text-white font-black">
          {playerName?.charAt(0) || '?'}
        </span>
      )}
    </div>
  );
};

const RecordDisplay = ({ record, winRate, size }) => {
  return (
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
  );
};

const FormStreak = ({ form, size }) => {
  const getFormColor = (result) => {
    return result === 'W' ? 'bg-green-500' : 'bg-red-500';
  };

  return (
    <div className="mb-4">
      <div className="text-white/50 text-xs text-center mb-2">Recent Form</div>
      <div className="flex justify-center gap-2">
        {form.map((result, idx) => (
          <div
            key={idx}
            className={`
              w-8 h-8 rounded-full flex items-center justify-center
              ${getFormColor(result)} font-black text-white text-sm
              border-2 border-white/30
            `}
          >
            {result}
          </div>
        ))}
      </div>
    </div>
  );
};

const KeyStats = ({ stats }) => {
  return (
    <div className="bg-black/30 backdrop-blur-sm rounded-lg p-3">
      <div className="grid grid-cols-2 gap-3 text-xs">
        <StatItem label="Avg Points" value={stats.avgPoints?.toFixed(1) || '0.0'} />
        <StatItem label="Bursts" value={stats.totalBursts || 0} />
        <StatItem label="Ring Outs" value={stats.totalRingOuts || 0} />
        <StatItem label="Streak" value={`${stats.currentStreak || 0}W`} />
      </div>
    </div>
  );
};

const StatItem = ({ label, value }) => {
  return (
    <div className="text-center">
      <div className="text-white font-bold">{value}</div>
      <div className="text-white/50">{label}</div>
    </div>
  );
};
