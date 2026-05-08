// ====================================================================
// VICTORY SCREEN ENHANCED - Com imagens full body
// ====================================================================
// Arquivo: VictoryScreen.jsx (VERSÃO MELHORADA)

import React, { useEffect, useState } from 'react';
import { Trophy, Flame, Target, Clock, Award } from 'lucide-react';
import PlayerImage from './PlayerImage'; // ← IMPORTAR!

export const VictoryScreen = ({ result, replayData, onContinue }) => {
  const [animate, setAnimate] = useState(false);
  
  useEffect(() => {
    setTimeout(() => setAnimate(true), 100);
  }, []);

  if (!result || !result.winner) return null;

  const winner = result.winner;
  const winnerName = winner.team?.name || winner.name || 'Unknown Winner';
  const loserName = result.loser?.team?.name || result.loser?.name || 'Unknown Player';
  const method = result.method || 'Victory';
  const points = result.points || 1;
  const duration = replayData?.duration || 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-900 via-orange-900 to-red-900 flex items-center justify-center p-8 relative overflow-hidden">
      {/* ⭐ NOVO: Background com blur da imagem do vencedor */}
      <div className="absolute inset-0 opacity-10 overflow-hidden">
        <PlayerImage 
          player={winner}
          type="full"
          size="xl"
          className="w-full h-full object-cover blur-3xl scale-150"
        />
      </div>
      
      {/* Animated Background */}
      <VictoryBackground />
      
      {/* Confetti for important victories */}
      {points >= 2 && <Confetti />}

      <div className={`
        relative z-10 text-center max-w-4xl
        transform transition-all duration-1000
        ${animate ? 'scale-100 opacity-100' : 'scale-90 opacity-0'}
      `}>
        {/* Victory Banner */}
        <div className="mb-8">
          <div className="text-yellow-400 text-8xl font-black mb-4 animate-pulse">
            VICTORY!
          </div>
          <div className="text-white/80 text-xl">
            {method}
          </div>
        </div>

        {/* ⭐ NOVO: Winner Card com imagem grande */}
        <WinnerCardEnhanced 
          winner={winner}
          method={method}
          points={points}
          duration={duration}
        />

        {/* Quick Stats */}
        <QuickStatsComparison 
          winner={result.winner}
          loser={result.loser}
          replayData={replayData}
        />

        {/* Awards */}
        {replayData?.awards && replayData.awards.length > 0 && (
          <AwardsDisplay awards={replayData.awards} />
        )}

        {/* Continue Button */}
        <button
          onClick={onContinue}
          className="
            mt-12 bg-gradient-to-r from-yellow-500 to-orange-500
            hover:from-yellow-400 hover:to-orange-400
            text-white px-16 py-5 rounded-2xl
            font-black text-2xl
            transform transition-all hover:scale-105
            shadow-2xl
          "
        >
          VIEW HIGHLIGHTS
        </button>
      </div>
    </div>
  );
};

// ====================================================================
// ⭐ NOVO COMPONENTE - Winner Card com imagem full body
// ====================================================================

const WinnerCardEnhanced = ({ winner, method, points, duration }) => {
  const winnerName = winner.team?.name || winner.name || 'Unknown Player';
  const color = winner.team?.colors?.[0] || winner.colors?.[0] || '#FCD34D';

  return (
    <div className="bg-black/50 backdrop-blur-lg rounded-2xl p-8 border-4 border-yellow-500 mb-8 relative overflow-hidden">
      {/* ⭐ Background gradient baseado na cor do jogador */}
      <div 
        className="absolute inset-0 opacity-10"
        style={{
          background: `radial-gradient(circle at center, ${color} 0%, transparent 70%)`
        }}
      />
      
      <div className="relative z-10">
        {/* ⭐ NOVA SEÇÃO: Imagem grande do vencedor */}
        <div className="flex justify-center mb-6">
          <div className="relative">
            {/* Glow effect */}
            <div 
              className="absolute inset-0 blur-2xl opacity-50 animate-pulse"
              style={{ backgroundColor: color }}
            />
            
            {/* ⭐ IMAGEM FULL BODY DO VENCEDOR */}
            <PlayerImage 
              player={winner}
              type="full"
              size="xl"
              showBorder={true}
              borderColor={color}
              className="relative z-10 drop-shadow-2xl"
            />
            
            {/* Troféu flutuante */}
            <div className="absolute -top-10 -right-10 animate-bounce">
              <Trophy size={80} className="text-yellow-400 drop-shadow-lg" />
            </div>
            
            {/* Partículas de vitória */}
            <VictoryParticles />
          </div>
        </div>

        {/* Winner Info */}
        <div className="text-center mb-6">
          <h2 className="text-5xl font-black text-white mb-2">{winnerName}</h2>
          <div className="text-yellow-300 text-2xl font-bold">+{points} POINTS</div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <StatBadge label="METHOD" value={method} icon={<Flame />} />
          <StatBadge label="DURATION" value={`${duration.toFixed(1)}s`} icon={<Clock />} />
          <StatBadge label="POINTS" value={`+${points}`} icon={<Award />} />
        </div>
      </div>
    </div>
  );
};

// ====================================================================
// ⭐ NOVO COMPONENTE - Partículas de vitória
// ====================================================================

const VictoryParticles = () => {
  const particles = Array.from({ length: 20 });
  
  return (
    <div className="absolute inset-0 pointer-events-none">
      {particles.map((_, i) => {
        const angle = (i / particles.length) * 360;
        const distance = 100 + Math.random() * 50;
        
        return (
          <div
            key={i}
            className="absolute w-2 h-2 bg-yellow-400 rounded-full animate-ping"
            style={{
              left: '50%',
              top: '50%',
              transform: `rotate(${angle}deg) translateY(-${distance}px)`,
              animationDelay: `${i * 0.1}s`,
              animationDuration: '2s'
            }}
          />
        );
      })}
    </div>
  );
};

// ====================================================================
// Componentes auxiliares (mantidos do original)
// ====================================================================

const VictoryBackground = () => {
  return (
    <>
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-10 left-10 w-32 h-32 bg-yellow-400 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-10 right-10 w-40 h-40 bg-orange-500 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '0.5s' }} />
        <div className="absolute top-1/2 left-1/2 w-48 h-48 bg-red-500 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>
    </>
  );
};

const Confetti = () => {
  const pieces = Array.from({ length: 50 });
  
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {pieces.map((_, i) => (
        <div
          key={i}
          className="absolute w-3 h-3 rounded-full animate-confetti"
          style={{
            left: `${Math.random() * 100}%`,
            top: `-10%`,
            backgroundColor: ['#FCD34D', '#F59E0B', '#EF4444', '#3B82F6'][Math.floor(Math.random() * 4)],
            animationDelay: `${Math.random() * 2}s`,
            animationDuration: `${2 + Math.random() * 2}s`
          }}
        />
      ))}
    </div>
  );
};

const StatBadge = ({ label, value, icon }) => {
  return (
    <div className="bg-yellow-900/30 border border-yellow-600/50 rounded-lg p-3 text-center">
      <div className="text-yellow-400 mb-2 flex justify-center">{icon}</div>
      <div className="text-white/60 text-xs mb-1">{label}</div>
      <div className="text-white font-bold">{value}</div>
    </div>
  );
};

const QuickStatsComparison = ({ winner, loser, replayData }) => {
  if (!replayData) return null;

  const winnerStats = replayData.bey1?.finalStats || {};
  const loserStats = replayData.bey2?.finalStats || {};
  
  const winnerName = winner?.team?.name || winner?.name || 'Winner';
  const bey1IsWinner = replayData.bey1?.name === winnerName;
  
  const wStats = bey1IsWinner ? winnerStats : loserStats;
  const lStats = bey1IsWinner ? loserStats : winnerStats;

  return (
    <div className="bg-black/30 backdrop-blur-sm rounded-xl p-6 mb-8">
      <h3 className="text-white font-bold text-xl mb-4 text-center">BATTLE STATS</h3>
      
      <div className="space-y-3">
        <ComparisonBar 
          label="Hits Landed"
          value1={wStats.hits || 0}
          value2={lStats.hits || 0}
          color1="#10B981"
          color2="#EF4444"
        />
        <ComparisonBar 
          label="Damage Dealt"
          value1={Math.round(wStats.damage || 0)}
          value2={Math.round(lStats.damage || 0)}
          color1="#10B981"
          color2="#EF4444"
        />
        <ComparisonBar 
          label="Final Spin"
          value1={Math.round(wStats.finalSpin || 0)}
          value2={Math.round(lStats.finalSpin || 0)}
          color1="#10B981"
          color2="#EF4444"
        />
      </div>
    </div>
  );
};

const ComparisonBar = ({ label, value1, value2, color1, color2 }) => {
  const total = value1 + value2 || 1;
  const percent1 = (value1 / total) * 100;
  const percent2 = (value2 / total) * 100;

  return (
    <div>
      <div className="flex justify-between text-sm text-white/70 mb-2">
        <span>{label}</span>
        <div className="flex gap-8">
          <span style={{ color: color1 }}>{value1}</span>
          <span style={{ color: color2 }}>{value2}</span>
        </div>
      </div>
      <div className="h-3 bg-black/50 rounded-full overflow-hidden flex">
        <div 
          className="transition-all duration-1000"
          style={{ 
            width: `${percent1}%`,
            backgroundColor: color1
          }}
        />
        <div 
          className="transition-all duration-1000"
          style={{ 
            width: `${percent2}%`,
            backgroundColor: color2
          }}
        />
      </div>
    </div>
  );
};

const AwardsDisplay = ({ awards }) => {
  if (!awards || awards.length === 0) return null;

  return (
    <div className="bg-purple-900/20 border-2 border-purple-500/50 rounded-xl p-6">
      <h3 className="text-white font-bold text-xl mb-4 text-center flex items-center justify-center gap-2">
        <Award className="w-6 h-6 text-purple-400" />
        ACHIEVEMENTS
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {awards.map((award, idx) => (
          <AwardCard key={idx} award={award} />
        ))}
      </div>
    </div>
  );
};

const AwardCard = ({ award }) => {
  return (
    <div className="bg-purple-600/20 border border-purple-500/50 rounded-lg p-4">
      <div className="text-purple-300 font-bold text-sm mb-1">{award.name}</div>
      <div className="text-white font-bold mb-1">{award.winner}</div>
      <div className="text-white/60 text-xs">{award.desc}</div>
    </div>
  );
};

// ====================================================================
// CSS ADICIONAL NECESSÁRIO (adicionar em styles.css)
// ====================================================================

/*
@keyframes confetti {
  0% {
    transform: translateY(-10vh) rotate(0deg);
    opacity: 1;
  }
  100% {
    transform: translateY(110vh) rotate(720deg);
    opacity: 0;
  }
}

.animate-confetti {
  animation: confetti 3s ease-in-out infinite;
}
*/
