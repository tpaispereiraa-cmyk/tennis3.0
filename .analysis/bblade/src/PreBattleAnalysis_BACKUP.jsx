import React from 'react';
import { Shield, Zap, Swords, TrendingUp } from 'lucide-react';

// ====================================================================
// PRE-BATTLE ANALYSIS - Análise completa dos BEYBLADES
// ====================================================================

export const TacticalAnalysis = ({ bey1, bey2, md3State }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <AnalysisHeader md3State={md3State} />

        {/* Main Beyblade Comparison - GRID para garantir alinhamento perfeito */}
        <div className="grid grid-cols-2 gap-8 mb-8" style={{ gridTemplateRows: 'auto' }}>
          {/* Beyblade 1 */}
          <BeybladeColumn bey={bey1} side="left" />
          
          {/* VS Divider */}
          <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10">
            <VSBadge />
          </div>
          
          {/* Beyblade 2 */}
          <BeybladeColumn bey={bey2} side="right" />
        </div>

        {/* Matchup Analysis Section */}
        <MatchupAnalysisSection bey1={bey1} bey2={bey2} md3State={md3State} />
      </div>
    </div>
  );
};

// ====================================================================
// ANALYSIS HEADER
// ====================================================================

const AnalysisHeader = ({ md3State }) => {
  return (
    <div className="text-center mb-12">
      <div className="inline-block px-6 py-3 bg-blue-600/20 border-2 border-blue-500 rounded-xl mb-4">
        <div className="text-blue-300 font-bold text-sm">TACTICAL ANALYSIS</div>
      </div>
      <h1 className="text-5xl font-black text-white mb-2">
        PRE-BATTLE BREAKDOWN
      </h1>
      <p className="text-white/60">
        Round {md3State?.currentRound || 1} • {md3State?.format || 'MD3'}
      </p>
    </div>
  );
};

// ====================================================================
// VS BADGE
// ====================================================================

const VSBadge = () => {
  return (
    <div className="relative">
      {/* Glow effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full blur-xl opacity-50 animate-pulse"></div>
      
      {/* Badge */}
      <div className="relative w-24 h-24 bg-gradient-to-br from-purple-600 to-pink-600 rounded-full flex items-center justify-center border-4 border-white shadow-2xl">
        <span className="text-4xl font-black text-white">⚔️</span>
      </div>
    </div>
  );
};

// ====================================================================
// BEYBLADE ICON - Ícone do blade com aura especial para Signatures
// ====================================================================

const BeybladeIcon = ({ bey }) => {
  if (!bey) return null;
  
  const isSignature = bey.isSignature;
  const colors = bey.team?.colors || ['#3B82F6', '#ffffff', '#cccccc'];
  
  // Ícone do tipo
  const typeIcon = {
    'Attack': '⚔️',
    'Defense': '🛡️',
    'Stamina': '♾️',
    'Balance': '⚖️',
    'Extreme': '💥',
    'Mixed': '🎯',
    'Progressive': '📈',
    'Synergy': '🔗'
  }[bey.type] || bey.type?.[0] || 'B';
  
  return (
    <div className="relative">
      {/* Signature Aura - Only for Signature Blades */}
      {isSignature && (
        <>
          {/* Outer glow - rotating */}
          <div 
            className="absolute inset-0 rounded-full blur-md animate-spin"
            style={{
              background: 'linear-gradient(45deg, #ffd700, #ffed4e, #ffd700, #ff6b6b, #ffd700)',
              opacity: 0.7,
              transform: 'scale(1.4)',
              animationDuration: '3s'
            }}
          />
          
          {/* Middle glow - pulsing */}
          <div 
            className="absolute inset-0 rounded-full blur-sm animate-pulse"
            style={{
              background: 'radial-gradient(circle, rgba(255,215,0,0.6), transparent)',
              transform: 'scale(1.3)'
            }}
          />
          
          {/* Inner particles */}
          <div 
            className="absolute inset-0 rounded-full"
            style={{
              background: 'linear-gradient(135deg, rgba(255,215,0,0.3), rgba(255,237,78,0.3))',
              transform: 'scale(1.2)',
              animation: 'signature-pulse 2s ease-in-out infinite'
            }}
          />
        </>
      )}
      
      {/* Main Icon Circle */}
      <div 
        className="relative w-16 h-16 rounded-full border-4 flex items-center justify-center font-black text-2xl shadow-lg transition-transform hover:scale-110"
        style={{
          background: `linear-gradient(135deg, ${colors[0]}, ${colors[1]}, ${colors[2] || colors[0]})`,
          borderColor: isSignature ? '#ffd700' : colors[0],
          boxShadow: isSignature 
            ? '0 0 30px rgba(255,215,0,0.8), inset 0 0 20px rgba(255,255,255,0.2)' 
            : `0 0 15px ${colors[0]}80, inset 0 0 10px rgba(255,255,255,0.1)`,
          color: '#ffffff',
          textShadow: '0 2px 4px rgba(0,0,0,0.8)'
        }}
      >
        {/* Rotation rings for visual effect */}
        <div 
          className="absolute inset-2 rounded-full border-2 border-white/20"
          style={{
            animation: 'spin 4s linear infinite'
          }}
        />
        <div 
          className="absolute inset-3 rounded-full border border-white/10"
          style={{
            animation: 'spin 3s linear infinite reverse'
          }}
        />
        
        {/* Type Icon/Letter */}
        <span className="relative z-10">{typeIcon}</span>
        
        {/* Signature Badge */}
        {isSignature && (
          <div 
            className="absolute -top-1 -right-1 w-5 h-5 bg-yellow-400 rounded-full border-2 border-yellow-600 flex items-center justify-center"
            style={{
              animation: 'signature-badge-pulse 1.5s ease-in-out infinite',
              boxShadow: '0 0 10px rgba(255,215,0,1)'
            }}
          >
            <span className="text-xs">⭐</span>
          </div>
        )}
      </div>
      
      {/* Signature Label */}
      {isSignature && (
        <div 
          className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 whitespace-nowrap"
          style={{
            animation: 'float 2s ease-in-out infinite'
          }}
        >
          <div className="px-2 py-0.5 bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-full border border-yellow-400 text-xs font-black text-gray-900">
            SIGNATURE
          </div>
        </div>
      )}
      
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        @keyframes signature-pulse {
          0%, 100% { opacity: 0.5; transform: scale(1.2); }
          50% { opacity: 0.8; transform: scale(1.25); }
        }
        
        @keyframes signature-badge-pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.2); }
        }
        
        @keyframes float {
          0%, 100% { transform: translate(-50%, 0); }
          50% { transform: translate(-50%, -3px); }
        }
      `}</style>
    </div>
  );
};

// ====================================================================
// BEYBLADE COLUMN - Coluna unificada para cada beyblade
// ====================================================================

const BeybladeColumn = ({ bey, side }) => {
  if (!bey) return null;

  // Calcular power level total
  const powerLevel = calculatePowerLevel(bey);
  
  // Pegar main trait
  const mainTrait = getMainTrait(bey);
  
  // Pegar breakpoints ativos
  const activeBreakpoints = bey.breakpoints?.slice(0, 3) || [];

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border-2 border-white/10 h-full flex flex-col">
      {/* Player Header com Foto */}
      <div className="text-center mb-4">
        {/* Foto do Jogador + Beyblade Icon */}
        {bey.team && (
          <div className="flex justify-center items-center gap-4 mb-3">
            {/* Player Avatar */}
            <div 
              className="w-20 h-20 rounded-full overflow-hidden border-4"
              style={{ 
                borderColor: bey.team.colors?.[0] || '#3B82F6',
                boxShadow: `0 0 20px ${bey.team.colors?.[0] || '#3B82F6'}80`
              }}
            >
              {bey.team.iconUrl ? (
                <img 
                  src={bey.team.iconUrl} 
                  alt={bey.team.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div 
                  className="w-full h-full flex items-center justify-center text-white font-black text-2xl"
                  style={{ backgroundColor: bey.team.colors?.[0] || '#3B82F6' }}
                >
                  {bey.team.name?.charAt(0) || '?'}
                </div>
              )}
            </div>
            
            {/* Beyblade Icon */}
            <BeybladeIcon bey={bey} />
          </div>
        )}
        
        {/* Player Name */}
        <div className="text-white font-black text-2xl mb-1">
          {bey.name}
        </div>
        
        {/* Signature Blade Name or Position */}
        {bey.isSignature ? (
          <div 
            className="text-lg font-black mb-2"
            style={{
              background: 'linear-gradient(90deg, #ffd700, #ffed4e, #ffd700)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              textShadow: '0 0 20px rgba(255,215,0,0.5)',
              filter: 'drop-shadow(0 0 10px rgba(255,215,0,0.3))'
            }}
          >
            "{bey.signatureName}"
          </div>
        ) : (
          <div className="text-white/50 text-sm mb-2">
            Beyblade #{bey.deckPosition || '?'}
          </div>
        )}
      </div>

      {/* Beyblade Type Badge */}
      <div className="flex justify-center mb-6">
        <TypeBadge type={bey.type} />
      </div>

      {/* Divider */}
      <div className="border-t border-white/10 mb-4"></div>

      {/* Stats Section */}
      <div className="mb-6 flex-grow">
        <div className="flex items-center gap-2 mb-3">
          <Zap className="w-5 h-5 text-yellow-400" />
          <h3 className="text-white font-bold text-lg">STATS</h3>
        </div>
        <div className="space-y-2">
          <StatBar label="ATK" value={bey.stats?.atk || 0} max={30} color="#ef4444" />
          <StatBar label="DEF" value={bey.stats?.def || 0} max={30} color="#3b82f6" />
          <StatBar label="STA" value={bey.stats?.sta || 0} max={30} color="#22c55e" />
          <StatBar label="BAL" value={bey.stats?.bal || 0} max={20} color="#a855f7" />
          <StatBar label="WGT" value={bey.stats?.weight || 0} max={25} color="#f59e0b" />
          <StatBar label="SPIN" value={bey.stats?.spin || 0} max={60} color="#06b6d4" />
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-white/10 mb-4"></div>

      {/* Main Trait */}
      {mainTrait && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-5 h-5 text-purple-400" />
            <h3 className="text-white font-bold text-lg">MAIN TRAIT</h3>
          </div>
          <div className="bg-purple-900/30 rounded-lg p-3 border border-purple-500/30">
            <div className="text-purple-300 font-bold mb-1">
              {mainTrait.icon} {mainTrait.name}
            </div>
            <div className="text-white/70 text-xs">
              {mainTrait.effect}
            </div>
          </div>
        </div>
      )}

      {/* Breakpoints */}
      {activeBreakpoints.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-5 h-5 text-green-400" />
            <h3 className="text-white font-bold text-lg">BREAKPOINTS</h3>
          </div>
          <div className="space-y-2">
            {activeBreakpoints.map((bp, idx) => (
              <div key={idx} className="bg-green-900/20 rounded-lg p-2 border border-green-500/30">
                <div className="text-green-400 text-xs font-bold">
                  {bp.name}
                </div>
                <div className="text-white/60 text-xs">
                  {bp.desc}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Divider */}
      <div className="border-t border-white/10 mb-4"></div>

      {/* Power Level */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Shield className="w-5 h-5 text-yellow-400" />
          <h3 className="text-white font-bold text-lg">POWER LEVEL</h3>
        </div>
        <PowerLevelBar value={powerLevel} />
      </div>
    </div>
  );
};

// ====================================================================
// TYPE BADGE
// ====================================================================

const TypeBadge = ({ type }) => {
  const typeConfig = {
    'Attack': { icon: '⚔️', color: 'from-red-600 to-red-700' },
    'Defense': { icon: '🛡️', color: 'from-blue-600 to-blue-700' },
    'Stamina': { icon: '♾️', color: 'from-green-600 to-green-700' },
    'Balance': { icon: '⚖️', color: 'from-purple-600 to-purple-700' }
  };

  const config = typeConfig[type] || typeConfig['Balance'];

  return (
    <div className={`
      bg-gradient-to-br ${config.color}
      px-6 py-3 rounded-xl
      text-2xl
      border-2 border-white/20
      shadow-lg
    `}>
      <div className="flex items-center gap-2">
        <span>{config.icon}</span>
        <span className="text-white font-black text-sm">{type}</span>
      </div>
    </div>
  );
};

// ====================================================================
// STAT BAR
// ====================================================================

const StatBar = ({ label, value, max, color }) => {
  const percentage = Math.min(100, (value / max) * 100);
  
  return (
    <div className="flex items-center gap-3">
      <div className="text-white/70 font-mono text-xs w-10 text-right">
        {label}
      </div>
      <div className="flex-grow bg-black/50 rounded-full h-4 overflow-hidden">
        <div
          className="h-full transition-all duration-500 rounded-full"
          style={{
            width: `${percentage}%`,
            backgroundColor: color,
            boxShadow: `0 0 10px ${color}80`
          }}
        />
      </div>
      <div className="text-white font-bold text-sm w-8">
        {Math.round(value)}
      </div>
    </div>
  );
};

// ====================================================================
// POWER LEVEL BAR
// ====================================================================

const PowerLevelBar = ({ value }) => {
  const getColor = (val) => {
    if (val >= 90) return '#facc15'; // Gold
    if (val >= 75) return '#22c55e'; // Green
    if (val >= 50) return '#3b82f6'; // Blue
    return '#94a3b8'; // Gray
  };

  const color = getColor(value);

  return (
    <div>
      <div className="flex justify-between text-xs text-white/60 mb-2">
        <span>Total Power</span>
        <span>{value}/100</span>
      </div>
      <div className="bg-black/50 rounded-full h-6 overflow-hidden">
        <div
          className="h-full transition-all duration-500 rounded-full flex items-center justify-center"
          style={{
            width: `${value}%`,
            backgroundColor: color,
            boxShadow: `0 0 15px ${color}80`
          }}
        >
          <span className="text-white font-black text-xs">
            {value}%
          </span>
        </div>
      </div>
    </div>
  );
};

// ====================================================================
// MATCHUP ANALYSIS SECTION
// ====================================================================

const MatchupAnalysisSection = ({ bey1, bey2, md3State }) => {
  const matchup = calculateMatchup(bey1.type, bey2.type);
  const bey1WinChance = matchup.percentage;
  const bey2WinChance = 100 - bey1WinChance;
  
  const arena = md3State?.arenaOrder?.[md3State?.currentRound - 1] || 'BB10_COMPETITIVE';
  const arenaData = getArenaData(arena);
  
  const isOppositeSpin = bey1.rotation !== bey2.rotation;

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-8 border-2 border-purple-500/30">
      <div className="text-center mb-6">
        <div className="flex items-center justify-center gap-2 mb-4">
          <Swords className="w-6 h-6 text-purple-400" />
          <h2 className="text-3xl font-black text-white">MATCHUP ANALYSIS</h2>
        </div>
      </div>

      <div className="space-y-6">
        {/* Type Advantage */}
        <div className="bg-black/30 rounded-lg p-4 border border-white/10">
          <div className="text-center">
            <div className="text-white/70 text-sm mb-2">TYPE ADVANTAGE</div>
            <div className="text-white font-bold text-lg mb-3">
              {matchup.explanation}
            </div>
            
            {/* Win Probability Bar */}
            <div className="mb-3">
              <div className="flex justify-between text-xs text-white/60 mb-2">
                <span>{bey1.name}: {bey1WinChance}%</span>
                <span>{bey2.name}: {bey2WinChance}%</span>
              </div>
              <div className="h-6 bg-black/50 rounded-full overflow-hidden flex">
                <div 
                  className="bg-gradient-to-r from-green-500 to-green-600 flex items-center justify-center transition-all duration-1000"
                  style={{ width: `${bey1WinChance}%` }}
                >
                  {bey1WinChance >= 30 && (
                    <span className="text-white font-bold text-xs">{bey1WinChance}%</span>
                  )}
                </div>
                <div 
                  className="bg-gradient-to-r from-red-600 to-red-500 flex items-center justify-center transition-all duration-1000"
                  style={{ width: `${bey2WinChance}%` }}
                >
                  {bey2WinChance >= 30 && (
                    <span className="text-white font-bold text-xs">{bey2WinChance}%</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Arena & Spin Info */}
        <div className="grid grid-cols-2 gap-4">
          {/* Arena */}
          <div className="bg-purple-900/20 rounded-lg p-4 border border-purple-500/30">
            <div className="text-purple-300 text-xs font-bold mb-2">ARENA</div>
            <div className="text-white font-bold text-sm mb-1">
              {arenaData.name}
            </div>
            <div className="text-white/60 text-xs">
              Favors: {arenaData.favoredTypes.join(', ')}
            </div>
          </div>

          {/* Opposite Spin */}
          <div className={`rounded-lg p-4 border ${
            isOppositeSpin 
              ? 'bg-yellow-900/20 border-yellow-500/30' 
              : 'bg-gray-900/20 border-gray-500/30'
          }`}>
            <div className={`text-xs font-bold mb-2 ${
              isOppositeSpin ? 'text-yellow-300' : 'text-gray-400'
            }`}>
              SPIN DIRECTION
            </div>
            <div className="text-white font-bold text-sm mb-1">
              {isOppositeSpin ? '⚡ Opposite Spin' : '🔄 Same Spin'}
            </div>
            <div className="text-white/60 text-xs">
              {isOppositeSpin 
                ? 'Equalização ativa!' 
                : 'Sem equalização'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ====================================================================
// HELPER FUNCTIONS
// ====================================================================

function calculatePowerLevel(bey) {
  if (!bey.stats) return 50;
  
  const stats = bey.stats;
  const total = (stats.atk || 0) + (stats.def || 0) + (stats.sta || 0) + 
                (stats.bal || 0) + (stats.weight || 0) + ((stats.spin || 0) / 2);
  
  // Normalizar para 0-100
  const normalized = Math.min(100, Math.round((total / 150) * 100));
  
  return normalized;
}

function getMainTrait(bey) {
  if (!bey.trait) return null;
  
  const traitMap = {
    'sword': { name: 'Espada Expansiva', effect: 'Alcance +30%', icon: '⚔️' },
    'shield': { name: 'Escudo Deflector', effect: 'Reduz dano 40%', icon: '🛡️' },
    'vampire': { name: 'Roubo de Spin', effect: 'Absorve 15% spin', icon: '🧛' },
    'berserker': { name: 'Fúria Crescente', effect: '+20% ATK por hit', icon: '😤' },
    'phantom': { name: 'Evasão Fantasma', effect: '25% evadir', icon: '👻' },
    'counter': { name: 'Contra-Ataque', effect: 'Reflete 50% dano', icon: '🔄' },
    'unstoppable': { name: 'Momentum Infinito', effect: 'Mantém velocidade', icon: '💨' },
    'critical': { name: 'Golpe Crítico', effect: '30% chance x2 dano', icon: '💥' },
    'regenerator': { name: 'Regeneração', effect: '+0.3 stamina/s', icon: '💚' },
    'tornado': { name: 'Vórtice Mortal', effect: 'Puxa inimigos', icon: '🌀' },
    'fortress': { name: 'Fortaleza', effect: 'Imune knockback', icon: '🏰' },
    'assassin': { name: 'Lâmina Assassina', effect: 'x2 dano costas', icon: '🗡️' },
    'bearing': { name: 'Bearing Drive', effect: 'LAD +50%', icon: '⚙️' },
    'drift': { name: 'Drift Motion', effect: 'Evasão circular', icon: '🌊' },
    'xtreme': { name: 'Xtreme Rush', effect: 'Velocidade máx', icon: '⚡' },
    'zone': { name: 'Zone Defense', effect: 'Estabilidade central', icon: '🎯' }
  };
  
  return traitMap[bey.trait] || { name: bey.trait, effect: 'Special ability', icon: '✨' };
}

function calculateMatchup(type1, type2) {
  const matchups = {
    'Attack-Defense': { 
      advantage: 'bey2', 
      explanation: 'Defense absorve e redireciona impactos de Attack.',
      percentage: 40
    },
    'Attack-Stamina': { 
      advantage: 'bey1', 
      explanation: 'Attack destrói padrão de rotação de Stamina.',
      percentage: 65
    },
    'Attack-Balance': { 
      advantage: 'bey1', 
      explanation: 'Agressão pura vence versatilidade.',
      percentage: 60
    },
    'Defense-Attack': { 
      advantage: 'bey1', 
      explanation: 'Estabilidade defensiva contra padrões agressivos.',
      percentage: 60
    },
    'Defense-Stamina': { 
      advantage: 'bey2', 
      explanation: 'Stamina vence Defense em batalhas longas.',
      percentage: 45
    },
    'Defense-Balance': { 
      advantage: 'neutral', 
      explanation: 'Matchup equilibrado - estratégia decide.',
      percentage: 50
    },
    'Stamina-Attack': { 
      advantage: 'bey2', 
      explanation: 'Attack destrói antes que Stamina importe.',
      percentage: 35
    },
    'Stamina-Defense': { 
      advantage: 'bey1', 
      explanation: 'Eficiência de rotação vence táticas defensivas.',
      percentage: 55
    },
    'Stamina-Balance': { 
      advantage: 'bey1', 
      explanation: 'Resistência especializada vence versatilidade.',
      percentage: 58
    },
    'Balance-Attack': { 
      advantage: 'bey2', 
      explanation: 'Agressão quebra defesas balanceadas.',
      percentage: 40
    },
    'Balance-Defense': { 
      advantage: 'neutral', 
      explanation: 'Batalha tática - ambos têm vantagens.',
      percentage: 50
    },
    'Balance-Stamina': { 
      advantage: 'bey2', 
      explanation: 'Especialização em stamina vence resistência geral.',
      percentage: 42
    }
  };

  const key = `${type1}-${type2}`;
  const matchup = matchups[key];
  
  if (!matchup) {
    return {
      advantage: 'neutral',
      explanation: 'Mirror match - tipos idênticos criam campo equilibrado.',
      percentage: 50
    };
  }

  return matchup;
}

function getArenaData(arena) {
  const arenas = {
    'BB10_COMPETITIVE': {
      name: 'BB-10 Attack Type',
      category: 'Standard',
      favoredTypes: ['Attack', 'Balance']
    },
    'BURST': {
      name: 'Burst Standard',
      category: 'Standard',
      favoredTypes: ['Defense', 'Stamina']
    },
    'NEXUS': {
      name: 'Prismatic Nexus',
      category: 'Special',
      favoredTypes: ['Attack', 'Balance']
    },
    'VOLCANIC_RAGE': {
      name: 'Volcanic Rage',
      category: 'Special',
      favoredTypes: ['Stamina', 'Defense']
    },
    'PANGEA_PLATFORM': {
      name: 'Pangea Platform',
      category: 'Extreme',
      favoredTypes: ['Balance']
    },
    'COLOSSEUM_CARNAGE': {
      name: 'Colosseum Carnage',
      category: 'Extreme',
      favoredTypes: ['Attack', 'Defense']
    },
    'PINBALL_INFERNO': {
      name: 'Pinball Inferno',
      category: 'Extreme',
      favoredTypes: ['Attack', 'Balance']
    },
    'VORTEX_COLISEUM': {
      name: 'Vortex Coliseum',
      category: 'Extreme',
      favoredTypes: ['Balance', 'Stamina']
    }
  };

  return arenas[arena] || arenas['BB10_COMPETITIVE'];
}

// ====================================================================
// LEGACY EXPORTS - Mantidos para compatibilidade
// ====================================================================

export const MatchupBreakdown = ({ bey1, bey2 }) => {
  return null; // Não usado mais, mas mantido para evitar erros
};

export const ArenaAnalysis = ({ arena, bey1, bey2 }) => {
  return null; // Não usado mais, mas mantido para evitar erros
};
