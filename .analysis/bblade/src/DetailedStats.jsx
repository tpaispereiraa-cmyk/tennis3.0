import React from 'react';
import { BarChart, Activity, Crosshair } from 'lucide-react';

// ====================================================================
// DETAILED STATS - Estatísticas detalhadas (simplificado, SEM TABS)
// ====================================================================

export const DetailedStats = ({ replayData, onContinue }) => {
  if (!replayData) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-black text-white mb-3">
            BATTLE ANALYSIS
          </h1>
          <p className="text-white/60">
            Detailed breakdown of the match
          </p>
        </div>

        {/* Stats Grid - TUDO NUMA PÁGINA, SEM TABS */}
        <div className="space-y-8">
          {/* Combat Stats */}
          <StatsSection
            title="COMBAT STATISTICS"
            icon={<Crosshair className="w-6 h-6" />}
            color="#EF4444"
          >
            <CombatStats replayData={replayData} />
          </StatsSection>

          {/* Performance Stats */}
          <StatsSection
            title="PERFORMANCE METRICS"
            icon={<Activity className="w-6 h-6" />}
            color="#3B82F6"
          >
            <PerformanceStats replayData={replayData} />
          </StatsSection>

          {/* Battle Summary */}
          <StatsSection
            title="BATTLE SUMMARY"
            icon={<BarChart className="w-6 h-6" />}
            color="#10B981"
          >
            <BattleSummary replayData={replayData} />
          </StatsSection>
        </div>

        {/* Continue Button */}
        <div className="text-center mt-12">
          <button
            onClick={onContinue}
            className="
              bg-gradient-to-r from-purple-600 to-pink-600
              hover:from-purple-500 hover:to-pink-500
              text-white px-16 py-5 rounded-2xl
              font-black text-2xl
              transform transition-all hover:scale-105
              shadow-2xl
            "
          >
            CONTINUE
          </button>
        </div>
      </div>
    </div>
  );
};

// ====================================================================
// STATS SECTION
// ====================================================================

const StatsSection = ({ title, icon, color, children }) => {
  return (
    <div 
      className="bg-gray-900/50 backdrop-blur-sm rounded-2xl p-8 border-2"
      style={{ borderColor: `${color}40` }}
    >
      <div className="flex items-center gap-3 mb-6">
        <div 
          className="p-3 rounded-xl"
          style={{ backgroundColor: `${color}20` }}
        >
          <div style={{ color }}>{icon}</div>
        </div>
        <h2 className="text-2xl font-black text-white">{title}</h2>
      </div>
      {children}
    </div>
  );
};

// ====================================================================
// COMBAT STATS
// ====================================================================

const CombatStats = ({ replayData }) => {
  const bey1Stats = replayData.bey1?.finalStats || {};
  const bey2Stats = replayData.bey2?.finalStats || {};

  const stats = [
    { label: 'Total Hits', bey1: bey1Stats.hits || 0, bey2: bey2Stats.hits || 0 },
    { label: 'Total Damage', bey1: Math.round(bey1Stats.damage || 0), bey2: Math.round(bey2Stats.damage || 0) },
    { label: 'Critical Hits', bey1: 3, bey2: 1 }, // placeholder
    { label: 'Blocked Attacks', bey1: 2, bey2: 4 } // placeholder
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {stats.map((stat, idx) => (
        <StatComparison key={idx} {...stat} />
      ))}
    </div>
  );
};

const StatComparison = ({ label, bey1, bey2 }) => {
  const total = bey1 + bey2 || 1;
  const percent1 = (bey1 / total) * 100;

  return (
    <div className="bg-black/30 rounded-lg p-4">
      <div className="text-white/70 text-sm mb-3">{label}</div>
      <div className="flex justify-between mb-2">
        <span className="text-cyan-400 font-bold">{bey1}</span>
        <span className="text-orange-400 font-bold">{bey2}</span>
      </div>
      <div className="h-2 bg-black/50 rounded-full overflow-hidden flex">
        <div 
          className="bg-cyan-500"
          style={{ width: `${percent1}%` }}
        />
        <div 
          className="bg-orange-500"
          style={{ width: `${100 - percent1}%` }}
        />
      </div>
    </div>
  );
};

// ====================================================================
// PERFORMANCE STATS
// ====================================================================

const PerformanceStats = ({ replayData }) => {
  const bey1Stats = replayData.bey1?.finalStats || {};
  const bey2Stats = replayData.bey2?.finalStats || {};

  return (
    <div className="grid grid-cols-2 gap-6">
      <PerformanceCard
        player="Player 1"
        finalSpin={bey1Stats.finalSpin || 0}
        finalStamina={bey1Stats.finalStamina || 0}
        color="#06B6D4"
      />
      <PerformanceCard
        player="Player 2"
        finalSpin={bey2Stats.finalSpin || 0}
        finalStamina={bey2Stats.finalStamina || 0}
        color="#F97316"
      />
    </div>
  );
};

const PerformanceCard = ({ player, finalSpin, finalStamina, color }) => {
  return (
    <div className="bg-black/30 rounded-xl p-6">
      <h3 className="text-white font-bold mb-4">{player}</h3>
      <div className="space-y-4">
        <div>
          <div className="text-white/60 text-sm mb-2">Final Spin Speed</div>
          <div className="text-3xl font-black" style={{ color }}>
            {Math.round(finalSpin)}%
          </div>
        </div>
        <div>
          <div className="text-white/60 text-sm mb-2">Final Stamina</div>
          <div className="text-3xl font-black" style={{ color }}>
            {Math.round(finalStamina)}%
          </div>
        </div>
      </div>
    </div>
  );
};

// ====================================================================
// BATTLE SUMMARY
// ====================================================================

const BattleSummary = ({ replayData }) => {
  const duration = replayData.duration || 0;
  const totalHits = (replayData.bey1?.finalStats?.hits || 0) + (replayData.bey2?.finalStats?.hits || 0);
  
  return (
    <div className="grid grid-cols-3 gap-6">
      <SummaryCard label="Battle Duration" value={`${duration.toFixed(1)}s`} />
      <SummaryCard label="Total Collisions" value={totalHits} />
      <SummaryCard label="Intensity" value="HIGH" />
    </div>
  );
};

const SummaryCard = ({ label, value }) => {
  return (
    <div className="bg-black/30 rounded-lg p-6 text-center">
      <div className="text-white/60 text-sm mb-2">{label}</div>
      <div className="text-3xl font-black text-white">{value}</div>
    </div>
  );
};
