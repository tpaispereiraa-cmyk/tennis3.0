import React from 'react';
import { Zap, Target, Flame, Shield, TrendingUp } from 'lucide-react';

// ====================================================================
// BATTLE HIGHLIGHTS - Replay dos momentos-chave
// ====================================================================

export const BattleHighlights = ({ replayData, onContinue }) => {
  if (!replayData || !replayData.events) return null;

  const highlights = extractHighlights(replayData.events);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-black text-white mb-3">
            BATTLE HIGHLIGHTS
          </h1>
          <p className="text-white/60">
            Key moments from the battle
          </p>
        </div>

        {/* Highlights Timeline */}
        <HighlightsTimeline highlights={highlights} />

        {/* Visual Stats */}
        <div className="mt-12 grid grid-cols-2 gap-8">
          <ImpactChart replayData={replayData} />
          <BattleFlow replayData={replayData} />
        </div>

        {/* Continue Button */}
        <div className="text-center mt-12">
          <button
            onClick={onContinue}
            className="
              bg-gradient-to-r from-blue-600 to-purple-600
              hover:from-blue-500 hover:to-purple-500
              text-white px-12 py-4 rounded-xl
              font-bold text-xl
              transform transition-all hover:scale-105
            "
          >
            VIEW DETAILED STATS
          </button>
        </div>
      </div>
    </div>
  );
};

// ====================================================================
// HIGHLIGHTS TIMELINE
// ====================================================================

const HighlightsTimeline = ({ highlights }) => {
  return (
    <div className="space-y-4">
      {highlights.map((highlight, idx) => (
        <HighlightMoment key={idx} moment={highlight} index={idx} />
      ))}
    </div>
  );
};

const HighlightMoment = ({ moment, index }) => {
  const style = getMomentStyle(moment.type);

  return (
    <div 
      className={`
        ${style.bg} ${style.border}
        backdrop-blur-sm rounded-xl p-6
        border-l-4
        transform transition-all hover:scale-102
      `}
      style={{
        animationDelay: `${index * 0.1}s`,
        boxShadow: `0 0 20px ${style.shadowColor}20`
      }}
    >
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className={`${style.iconBg} p-3 rounded-xl`}>
          {style.icon}
        </div>

        {/* Content */}
        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <h3 className={`${style.text} font-bold text-lg`}>
              {moment.title}
            </h3>
            <span className="text-white/50 text-sm font-mono">
              {moment.time.toFixed(1)}s
            </span>
          </div>
          
          <p className="text-white/70 text-sm mb-3">
            {moment.description}
          </p>

          {/* Impact Meter */}
          {moment.impact && (
            <ImpactMeter value={moment.impact} />
          )}
        </div>
      </div>
    </div>
  );
};

const ImpactMeter = ({ value }) => {
  const percentage = Math.min(100, value);
  const color = value >= 80 ? '#EF4444' : value >= 50 ? '#F59E0B' : '#10B981';

  return (
    <div>
      <div className="flex justify-between text-xs text-white/60 mb-1">
        <span>IMPACT</span>
        <span>{percentage}%</span>
      </div>
      <div className="h-2 bg-black/50 rounded-full overflow-hidden">
        <div 
          className="h-full rounded-full transition-all duration-500"
          style={{ 
            width: `${percentage}%`,
            backgroundColor: color,
            boxShadow: `0 0 10px ${color}80`
          }}
        />
      </div>
    </div>
  );
};

// ====================================================================
// IMPACT CHART (Simplified visualization)
// ====================================================================

const ImpactChart = ({ replayData }) => {
  return (
    <div className="bg-gray-900/50 backdrop-blur-sm rounded-xl p-6 border border-blue-500/30">
      <h3 className="text-white font-bold text-lg mb-4">DAMAGE OVER TIME</h3>
      <div className="h-48 flex items-end justify-between gap-2">
        {/* Simplified bar chart */}
        {[65, 45, 80, 30, 90, 55, 70, 40].map((value, idx) => (
          <div key={idx} className="flex-1 flex flex-col justify-end">
            <div 
              className="bg-gradient-to-t from-blue-500 to-blue-600 rounded-t transition-all hover:from-blue-400 hover:to-blue-500"
              style={{ height: `${value}%` }}
            />
          </div>
        ))}
      </div>
      <div className="text-white/50 text-xs mt-2 text-center">
        Time progression →
      </div>
    </div>
  );
};

// ====================================================================
// BATTLE FLOW
// ====================================================================

const BattleFlow = ({ replayData }) => {
  return (
    <div className="bg-gray-900/50 backdrop-blur-sm rounded-xl p-6 border border-purple-500/30">
      <h3 className="text-white font-bold text-lg mb-4">MOMENTUM SHIFTS</h3>
      <div className="h-48 flex items-center">
        {/* Simplified momentum line */}
        <div className="w-full h-32 relative">
          <svg className="w-full h-full" viewBox="0 0 200 100">
            <path
              d="M 0 50 Q 25 30, 50 40 T 100 50 T 150 60 T 200 45"
              stroke="#A855F7"
              strokeWidth="3"
              fill="none"
              className="transition-all"
            />
          </svg>
        </div>
      </div>
      <div className="flex justify-between text-white/50 text-xs mt-2">
        <span>Player 1</span>
        <span>Player 2</span>
      </div>
    </div>
  );
};

// ====================================================================
// HELPER FUNCTIONS
// ====================================================================

function extractHighlights(events) {
  const importantEvents = events.filter(e => 
    ['CRITICAL_HIT', 'BURST', 'RING_OUT', 'PORTAL_WARP', 'RAJADA_DE_ACO', 'MURO_VIVO', 'ESPIRAL_ETERNA', 'CORTE_PRECISO', 'CRITICAL_BURST_HIT'].includes(e.type)
  );

  return importantEvents.map(event => ({
    type: event.type,
    time: event.timestamp,
    title: getEventTitle(event),
    description: getEventDescription(event),
    impact: calculateImpact(event)
  }));
}

function getEventTitle(event) {
  const titles = {
    'CRITICAL_HIT': 'Critical Hit!',
    'BURST': 'Burst Finish!',
    'RING_OUT': 'Ring Out!',
    'PORTAL_WARP': 'Portal Warp!',
    'RAJADA_DE_ACO': 'Rajada de Aço!',
    'MURO_VIVO': 'Muro Vivo!',
    'ESPIRAL_ETERNA': 'Espiral Eterna!',
    'CORTE_PRECISO': 'Corte Preciso!',
    'CAMPO_GRAVITACIONAL': 'Campo Gravitacional!',
    'CRITICAL_BURST_HIT': 'Critical Burst Hit!'
  };
  return titles[event.type] || 'Event';
}

function getEventDescription(event) {
  const data = event.data || {};
  return data.description || `${event.type} occurred at ${event.timestamp.toFixed(1)}s`;
}

function calculateImpact(event) {
  const impacts = {
    'BURST': 100,
    'RING_OUT': 100,
    'CRITICAL_BURST_HIT': 90,
    'CRITICAL_HIT': 70,
    'RAJADA_DE_ACO': 75,
    'MURO_VIVO': 80,
    'ESPIRAL_ETERNA': 70,
    'CORTE_PRECISO': 40,
    'PORTAL_WARP': 40
  };
  return impacts[event.type] || 50;
}

function getMomentStyle(type) {
  const styles = {
    CRITICAL_HIT: {
      bg: 'bg-red-900/20',
      border: 'border-red-500',
      text: 'text-red-400',
      iconBg: 'bg-red-500/20',
      icon: <Target className="w-6 h-6 text-red-400" />,
      shadowColor: '#EF4444'
    },
    BURST: {
      bg: 'bg-orange-900/20',
      border: 'border-orange-500',
      text: 'text-orange-400',
      iconBg: 'bg-orange-500/20',
      icon: <Flame className="w-6 h-6 text-orange-400" />,
      shadowColor: '#F97316'
    },
    RING_OUT: {
      bg: 'bg-red-900/20',
      border: 'border-red-500',
      text: 'text-red-400',
      iconBg: 'bg-red-500/20',
      icon: <Target className="w-6 h-6 text-red-400" />,
      shadowColor: '#EF4444'
    },
    PORTAL_WARP: {
      bg: 'bg-cyan-900/20',
      border: 'border-cyan-500',
      text: 'text-cyan-400',
      iconBg: 'bg-cyan-500/20',
      icon: <Zap className="w-6 h-6 text-cyan-400" />,
      shadowColor: '#06B6D4'
    },
    RAJADA_DE_ACO: {
      bg: 'bg-orange-900/20',
      border: 'border-orange-500',
      text: 'text-orange-400',
      iconBg: 'bg-orange-500/20',
      icon: <TrendingUp className="w-6 h-6 text-orange-400" />,
      shadowColor: '#F97316'
    },
    MURO_VIVO: {
      bg: 'bg-blue-900/20',
      border: 'border-blue-400',
      text: 'text-blue-400',
      iconBg: 'bg-blue-400/20',
      icon: <Shield className="w-6 h-6 text-blue-400" />,
      shadowColor: '#60A5FA'
    },
    ESPIRAL_ETERNA: {
      bg: 'bg-teal-900/20',
      border: 'border-teal-400',
      text: 'text-teal-400',
      iconBg: 'bg-teal-400/20',
      icon: <Zap className="w-6 h-6 text-teal-400" />,
      shadowColor: '#2DD4BF'
    },
    CRITICAL_BURST_HIT: {
      bg: 'bg-orange-900/20',
      border: 'border-orange-500',
      text: 'text-orange-400',
      iconBg: 'bg-orange-500/20',
      icon: <Flame className="w-6 h-6 text-orange-400" />,
      shadowColor: '#F97316'
    },
    DEFAULT: {
      bg: 'bg-blue-900/20',
      border: 'border-blue-500',
      text: 'text-blue-400',
      iconBg: 'bg-blue-500/20',
      icon: <Shield className="w-6 h-6 text-blue-400" />,
      shadowColor: '#3B82F6'
    }
  };
  
  return styles[type] || styles.DEFAULT;
}
