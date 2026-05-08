// ============================================
// BATTLECOMPONENTS.JSX - Componentes de Batalha
// ============================================
//
// COMPONENTES UNIFICADOS - USADOS POR TODOS OS MODOS
// ============================================
// 
// IMPORTANTE: Estes componentes são compartilhados entre:
// - Modo Exibição
// - Modo Universo
// - Qualquer outro modo futuro
//
// Não há componentes separados por modo. São os MESMOS componentes.
// Qualquer mudança aqui afeta TODOS os modos igualmente.
//
// Componentes principais:
// - PreBattleScreen    → Tela pré-jogo (análise + lançamento)
// - BattleArena        → Arena de combate (física do jogo)
// - ReplayScreen       → Tela de replay
// - PostMatchScreen    → Resultados pós-jogo
//
// ============================================

import React, { useState, useEffect, useRef } from 'react';
import { Play, Tv, ChevronRight } from 'lucide-react';
import { TEAMS, CALENDAR_STRUCTURE as CALENDAR_CONFIG } from './data.js';
import { 
  MENTALITIES, 
  LAUNCH_TECHNIQUES, 
  LAUNCH_QUALITY, 
  determineLaunchQuality 
} from './UniverseManager.js';
import { calculateStatBreakdown, calculateTotalStat } from './utils/stats.js';
import { useTurbo } from './TurboContext.jsx';
import { BattleHUD } from './BattleHUD.jsx';
import { EventFeed } from './EventFeed.jsx';
import { CountdownOverlay, LaunchSequenceOverlay, FinishOverlay } from './PhaseOverlays.jsx';
import { TacticalAnalysis } from './PreBattleAnalysis.jsx';
import { VictoryScreen } from './VictoryScreen.jsx';
import { BattleHighlights } from './BattleHighlights.jsx';
import { DetailedStats } from './DetailedStats.jsx';
import { 
  EnhancedParticleSystem, 
  EnhancedImpactEffects,
  renderPremiumArena,
  renderCompetitiveArena
} from './EnhancedRenderer.js';

const PreBattleScreen = ({ team1, team2, bey1, bey2, md3State, onComplete }) => {
  const turbo = useTurbo(); // ✅ NOVO
  const [launchQuality1, setLaunchQuality1] = useState(null);
  const [launchQuality2, setLaunchQuality2] = useState(null);
  
  useEffect(() => {
    const quality1 = determineLaunchQuality();
    const quality2 = determineLaunchQuality();
    setLaunchQuality1(quality1);
    setLaunchQuality2(quality2);
    
    if (md3State) {
      md3State.launchQuality1 = quality1;
      md3State.launchQuality2 = quality2;
    }
    
    // ✅ NOVO - Auto-skip em turbo
    if (turbo.turboEnabled) {
      const timer = setTimeout(() => {
        onComplete();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [turbo, onComplete]);

  return (
    <div className="relative">
      <TacticalAnalysis 
        bey1={bey1}
        bey2={bey2}
        md3State={md3State}
      />
      
      {/* Continue Button - Vai direto para a batalha */}
      <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50">
        <button
          onClick={onComplete}
          className="
            bg-gradient-to-r from-blue-600 to-purple-600
            hover:from-blue-500 hover:to-purple-500
            text-white px-12 py-4 rounded-xl
            font-black text-xl
            transform transition-all hover:scale-105
            shadow-2xl
          "
        >
          START BATTLE
        </button>
      </div>
    </div>
  );
};

// ====================================================================
// READY SEQUENCE COMPONENT - REMOVIDO (Fluxo Simplificado)
// ====================================================================
// Este componente foi removido para simplificar o fluxo de batalha.
// Agora o jogo vai direto da análise tática para a arena.
// Mantido comentado para referência futura se necessário.
/*
const ReadySequence = ({ bey1, bey2, md3State, onReady }) => {
  const [countdown, setCountdown] = useState(3);
  
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setTimeout(onReady, 500);
    }
  }, [countdown, onReady]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black flex items-center justify-center">
      <div className="text-center">
        <div className="mb-8">
          <h2 className="text-white/60 text-2xl mb-4">PREPARE FOR BATTLE</h2>
          <h1 className="text-6xl font-black text-white mb-8">
            {bey1?.name} <span className="text-purple-500">VS</span> {bey2?.name}
          </h1>
        </div>
        
        {countdown > 0 && (
          <div 
            className="text-9xl font-black text-white animate-bounce"
            style={{
              textShadow: '0 0 40px rgba(255,255,255,0.8)'
            }}
          >
            {countdown}
          </div>
        )}
        
        {countdown === 0 && (
          <div 
            className="text-9xl font-black text-yellow-400 animate-pulse"
            style={{
              textShadow: '0 0 60px rgba(250,204,21,0.8)'
            }}
          >
            FIGHT!
          </div>
        )}
      </div>
    </div>
  );
};
*/

// ====================================================================
// LAUNCHING SEQUENCE COMPONENT - REMOVIDO (Fluxo Simplificado)
// ====================================================================
// Este componente foi removido para simplificar o fluxo de batalha.
// As launch qualities agora são mostradas brevemente no início da arena.
// Mantido comentado para referência futura se necessário.
/*
const LaunchingSequence = ({ quality1, quality2, bey1Name, bey2Name }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-pink-900 flex items-center justify-center">
      <div className="text-center">
        <h2 className="text-white text-3xl font-black mb-8">LAUNCHING!</h2>
        
        <div className="grid grid-cols-2 gap-12 max-w-2xl">
          <LaunchQualityCard 
            playerName={bey1Name}
            quality={quality1}
          />
          <LaunchQualityCard 
            playerName={bey2Name}
            quality={quality2}
          />
        </div>
      </div>
    </div>
  );
};

const LaunchQualityCard = ({ playerName, quality }) => {
  const getQualityColor = (key) => {
    switch(key) {
      case 'PERFECT': return 'text-yellow-400';
      case 'EXCELLENT': return 'text-green-400';
      case 'GOOD': return 'text-blue-400';
      case 'WEAK': return 'text-orange-400';
      case 'FAILED': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };
  
  return (
    <div className="bg-black/50 backdrop-blur-sm rounded-xl p-6 border-2 border-white/20">
      <div className="text-white/70 text-sm mb-2">{playerName}</div>
      <div className={`font-black text-4xl ${getQualityColor(quality?.key)} mb-2`}>
        {quality?.label || 'STANDARD'}
      </div>
      <div className="text-white/50 text-xs">
        +{quality?.spinBonus || 0}% spin power
      </div>
    </div>
  );
};
*/


const PlayerCard = ({ player, onClose, onUpdateIcon, universeManager, variant = 'full' }) => {
  const [activeTab, setActiveTab] = useState('perfil');
  const [uploadingIcon, setUploadingIcon] = useState(false);
  const fileInputRef = useRef(null);
  
  if (!player) return null;
  
  const team = player.team;
  const playerId = player.id;
  const deck = player.deck || [];
  const mentality = MENTALITIES[team?.mentality];
  
  // ===== DADOS REAIS DO HISTÓRICO =====
  const playerHistory = universeManager?.playerHistories?.get(playerId) || {
    totalMatches: 0,
    wins: 0,
    losses: 0,
    titles: { atp250: 0, grandSlams: 0, total: 0 },
    tournamentHistory: []
  };
  
  const winRate = playerHistory.totalMatches > 0 
    ? ((playerHistory.wins / playerHistory.totalMatches) * 100).toFixed(1)
    : '0.0';
  
  // Títulos conquistados (últimos 5)
  const championshipTitles = playerHistory.tournamentHistory
    .filter(t => t.position === 1)
    .sort((a, b) => {
      if (b.year !== a.year) return b.year - a.year;
      return b.month - a.month;
    })
    .slice(0, 5);
  
  const handleIconUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
      alert('Por favor, selecione uma imagem válida');
      return;
    }
    
    setUploadingIcon(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const imageDataUrl = event.target.result;
      if (onUpdateIcon) {
        onUpdateIcon(player.id, imageDataUrl);
      }
      setUploadingIcon(false);
    };
    reader.onerror = () => {
      alert('Erro ao carregar imagem');
      setUploadingIcon(false);
    };
    reader.readAsDataURL(file);
  };
  
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div 
        className="bg-gradient-to-b from-gray-900 to-black border-4 border-orange-500 w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
        style={{
          boxShadow: '0 0 50px rgba(249, 115, 22, 0.5), inset 0 0 30px rgba(0, 0, 0, 0.5)'
        }}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-600 to-orange-700 p-3 border-b-4 border-orange-500">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div 
                className="w-12 h-12 flex items-center justify-center border-2 border-white relative group cursor-pointer overflow-hidden rounded"
                style={{ backgroundColor: team?.colors?.[0] || '#3b82f6' }}
                onClick={() => fileInputRef.current?.click()}
              >
                {team?.photoUrl ? (
                  <img 
                    src={team.photoUrl} 
                    alt={team.name} 
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.parentElement.innerHTML = `<span class="text-2xl font-black text-white">${team?.name?.[0] || 'T'}</span>`;
                    }}
                  />
                ) : team?.customIcon ? (
                  <img 
                    src={team.customIcon} 
                    alt={team.name} 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-2xl font-black text-white">{team?.name?.[0] || 'T'}</span>
                )}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                  <span className="text-xs text-white font-bold">📷</span>
                </div>
              </div>
              <input 
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleIconUpload}
              />
              <div>
                <h2 className="text-lg font-black text-white">{team?.name || 'Player'}</h2>
                {team?.country && (
                  <div className="text-xs text-orange-200 font-bold">{team.country}</div>
                )}
                {mentality && (
                  <div className="flex items-center gap-1">
                    <span className="text-sm">{mentality.icon}</span>
                    <span className="text-xs font-bold" style={{ color: mentality.color }}>
                      {mentality.name}
                    </span>
                  </div>
                )}
              </div>
            </div>
            <button 
              onClick={onClose}
              className="text-white hover:text-orange-200 transition text-3xl font-black leading-none"
            >
              ×
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-black p-1 border-b-2 border-gray-800">
          {['perfil', 'build', 'cartel', 'arenas', 'historico', 'titulos'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 px-2 py-1.5 font-black text-xs transition ${
                activeTab === tab 
                  ? 'bg-orange-500 text-black' 
                  : 'bg-gray-900 text-gray-600 hover:bg-gray-800'
              }`}
            >
              {tab === 'perfil' && '📊 PERFIL'}
              {tab === 'build' && '⚙️ BUILD'}
              {tab === 'cartel' && '🥊 CARTEL'}
              {tab === 'arenas' && '🏟️ ARENAS'}
              {tab === 'historico' && '📜 HISTÓRICO'}
              {tab === 'titulos' && '🏆 TÍTULOS'}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 bg-gradient-to-b from-gray-900 to-black" style={{ maxHeight: 'calc(85vh - 130px)' }}>
          {/* ABA 1: PERFIL */}
          {activeTab === 'perfil' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {/* FOTO MAIOR */}
                <div className="bg-gray-800 border-2 border-orange-500 overflow-hidden">
                  {team?.photoUrl ? (
                    <img
                      src={team.photoUrl}
                      alt={team.name}
                      className="w-full aspect-[9/16] object-cover"
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="w-full aspect-[9/16] bg-gray-700 flex items-center justify-center">
                      <span className="text-6xl text-gray-600">👤</span>
                    </div>
                  )}
                </div>
                
                {/* INFORMAÇÕES E ESTILO */}
                <div className="space-y-3">
                  <div className="bg-gray-800 border border-gray-700 p-3">
                    <h3 className="text-sm font-black text-orange-400 mb-2">INFORMAÇÕES</h3>
                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Nacionalidade:</span>
                        <span className="text-white font-bold">{team?.country || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Descrição:</span>
                        <span className="text-white font-bold text-right text-[10px]">{team?.physicalDesc || 'N/A'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-800 border border-gray-700 p-3">
                    <h3 className="text-sm font-black text-orange-400 mb-2">ESTILO</h3>
                    <div className="text-xs text-gray-300">{team?.playStyle || 'N/A'}</div>
                  </div>
                </div>
              </div>

              {/* ATRIBUTOS - IGUAL À TELA INICIAL */}
              {team?.attributes && (
                <div className="bg-gray-800 border border-gray-700 p-3">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-black text-orange-400">ATRIBUTOS</h3>
                    <span className="text-xs text-gray-400">
                      Total: <span className="text-white font-bold">
                        {Object.values(team.attributes).reduce((a, b) => a + b, 0)}/80
                      </span>
                    </span>
                  </div>
                  
                  <div className="space-y-2">
                    {/* Attack */}
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-xs font-bold text-gray-300">⚔️ ATTACK</span>
                        <span className="text-xs font-bold text-white">{team.attributes.attack}/10</span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
                        <div 
                          className="bg-gradient-to-r from-red-600 to-red-400 h-full rounded-full transition-all duration-500"
                          style={{ width: `${(team.attributes.attack / 10) * 100}%` }}
                        />
                      </div>
                    </div>
                    
                    {/* Defense */}
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-xs font-bold text-gray-300">🛡️ DEFENSE</span>
                        <span className="text-xs font-bold text-white">{team.attributes.defense}/10</span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
                        <div 
                          className="bg-gradient-to-r from-blue-600 to-blue-400 h-full rounded-full transition-all duration-500"
                          style={{ width: `${(team.attributes.defense / 10) * 100}%` }}
                        />
                      </div>
                    </div>
                    
                    {/* Stamina */}
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-xs font-bold text-gray-300">⚡ STAMINA</span>
                        <span className="text-xs font-bold text-white">{team.attributes.stamina}/10</span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
                        <div 
                          className="bg-gradient-to-r from-green-600 to-green-400 h-full rounded-full transition-all duration-500"
                          style={{ width: `${(team.attributes.stamina / 10) * 100}%` }}
                        />
                      </div>
                    </div>
                    
                    {/* Speed */}
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-xs font-bold text-gray-300">💨 SPEED</span>
                        <span className="text-xs font-bold text-white">{team.attributes.speed}/10</span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
                        <div 
                          className="bg-gradient-to-r from-yellow-600 to-yellow-400 h-full rounded-full transition-all duration-500"
                          style={{ width: `${(team.attributes.speed / 10) * 100}%` }}
                        />
                      </div>
                    </div>
                    
                    {/* Technique */}
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-xs font-bold text-gray-300">🎯 TECHNIQUE</span>
                        <span className="text-xs font-bold text-white">{team.attributes.technique}/10</span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
                        <div 
                          className="bg-gradient-to-r from-purple-600 to-purple-400 h-full rounded-full transition-all duration-500"
                          style={{ width: `${(team.attributes.technique / 10) * 100}%` }}
                        />
                      </div>
                    </div>
                    
                    {/* Intelligence */}
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-xs font-bold text-gray-300">🧠 INTELLIGENCE</span>
                        <span className="text-xs font-bold text-white">{team.attributes.intelligence}/10</span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
                        <div 
                          className="bg-gradient-to-r from-cyan-600 to-cyan-400 h-full rounded-full transition-all duration-500"
                          style={{ width: `${(team.attributes.intelligence / 10) * 100}%` }}
                        />
                      </div>
                    </div>
                    
                    {/* Adaptability */}
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-xs font-bold text-gray-300">🌍 ADAPTABILITY</span>
                        <span className="text-xs font-bold text-white">{team.attributes.adaptability}/10</span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
                        <div 
                          className="bg-gradient-to-r from-green-600 to-green-400 h-full rounded-full transition-all duration-500"
                          style={{ width: `${(team.attributes.adaptability / 10) * 100}%` }}
                        />
                      </div>
                    </div>
                    
                    {/* Clutch */}
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-xs font-bold text-gray-300">🔥 CLUTCH</span>
                        <span className="text-xs font-bold text-white">{team.attributes.clutch}/10</span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
                        <div 
                          className="bg-gradient-to-r from-orange-600 to-orange-400 h-full rounded-full transition-all duration-500"
                          style={{ width: `${(team.attributes.clutch / 10) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ABA 2: BUILD */}
          {activeTab === 'build' && (
            <div className="space-y-3">
              <div className="bg-gray-800 border border-gray-700 p-3">
                <h3 className="text-sm font-black text-orange-400 mb-2">DECK DO TORNEIO ATUAL</h3>
                <div className="text-xs text-gray-400 mb-3">
                  Mentalidade: <span className="text-orange-400 font-bold">{mentality?.name || 'N/A'}</span>
                </div>
                
                <div className="space-y-2">
                  {deck.length > 0 ? deck.map((bey, idx) => (
                    <div key={idx} className="bg-black border border-gray-700 p-2">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-6 h-6 flex items-center justify-center border border-gray-600"
                            style={{ backgroundColor: bey.color }}
                          >
                            <span className="text-xs font-black text-white">{idx + 1}</span>
                          </div>
                          <div className="text-xs font-black text-white">{bey.name || `Beyblade ${idx + 1}`}</div>
                        </div>
                        <div className="text-xs text-gray-400">{bey.type || 'N/A'}</div>
                      </div>
                      
                      <div className="grid grid-cols-6 gap-1 text-[10px]">
                        <div className="bg-gray-900 p-1 text-center">
                          <div className="text-gray-600">ATK</div>
                          <div className="text-red-400 font-bold">{bey.stats?.attack || 0}</div>
                        </div>
                        <div className="bg-gray-900 p-1 text-center">
                          <div className="text-gray-600">DEF</div>
                          <div className="text-blue-400 font-bold">{bey.stats?.defense || 0}</div>
                        </div>
                        <div className="bg-gray-900 p-1 text-center">
                          <div className="text-gray-600">STA</div>
                          <div className="text-green-400 font-bold">{bey.stats?.stamina || 0}</div>
                        </div>
                        <div className="bg-gray-900 p-1 text-center">
                          <div className="text-gray-600">BAL</div>
                          <div className="text-purple-400 font-bold">{bey.stats?.balance || 0}</div>
                        </div>
                        <div className="bg-gray-900 p-1 text-center">
                          <div className="text-gray-600">WGT</div>
                          <div className="text-yellow-400 font-bold">{bey.stats?.weight || 0}</div>
                        </div>
                        <div className="bg-gray-900 p-1 text-center">
                          <div className="text-gray-600">SPN</div>
                          <div className="text-cyan-400 font-bold">{bey.stats?.spin || 0}</div>
                        </div>
                      </div>
                      
                      {bey.parts && (
                        <div className="mt-2 grid grid-cols-3 gap-1 text-[9px]">
                          <div className="bg-gray-900 p-1">
                            <div className="text-gray-500">Bit:</div>
                            <div className="text-white font-bold truncate">{bey.parts.bit?.name || 'N/A'}</div>
                          </div>
                          <div className="bg-gray-900 p-1">
                            <div className="text-gray-500">Blade:</div>
                            <div className="text-white font-bold truncate">{bey.parts.blade?.name || 'N/A'}</div>
                          </div>
                          <div className="bg-gray-900 p-1">
                            <div className="text-gray-500">Ratchet:</div>
                            <div className="text-white font-bold truncate">{bey.parts.ratchet?.name || 'N/A'}</div>
                          </div>
                        </div>
                      )}
                    </div>
                  )) : (
                    <div className="text-center py-8 text-gray-500">
                      <div className="text-4xl mb-2">⚙️</div>
                      <div className="text-sm">Deck ainda não montado para este torneio</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ABA 3: CARTEL */}
          {activeTab === 'cartel' && (
            <div className="space-y-3">
              {/* PARTIDAS (MD3/MD5 completas) */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-800 border border-gray-700 p-3">
                  <h3 className="text-xs font-black text-orange-400 mb-2">PARTIDAS</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-400">Total:</span>
                      <span className="text-lg font-black text-white">{playerHistory.totalMatches}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-400">Vitórias:</span>
                      <span className="text-lg font-black text-green-400">{playerHistory.wins}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-400">Derrotas:</span>
                      <span className="text-lg font-black text-red-400">{playerHistory.losses}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-800 border border-gray-700 p-3">
                  <h3 className="text-xs font-black text-orange-400 mb-2">TAXA VITÓRIA</h3>
                  <div className="text-center">
                    <div className="text-3xl font-black text-purple-400">{winRate}%</div>
                    <div className="text-xs text-gray-400 mt-1">em partidas</div>
                  </div>
                </div>
              </div>

              {/* ROUNDS (Jogos individuais) */}
              <div className="bg-gray-800 border border-gray-700 p-3">
                <h3 className="text-xs font-black text-orange-400 mb-2">DESEMPENHO EM ROUNDS</h3>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="bg-black p-2 text-center">
                    <div className="text-gray-400">Total</div>
                    <div className="text-lg font-black text-white">
                      {(playerHistory.roundWins || 0) + (playerHistory.roundLosses || 0)}
                    </div>
                  </div>
                  <div className="bg-black p-2 text-center">
                    <div className="text-gray-400">Vitórias</div>
                    <div className="text-lg font-black text-green-400">{playerHistory.roundWins || 0}</div>
                  </div>
                  <div className="bg-black p-2 text-center">
                    <div className="text-gray-400">Derrotas</div>
                    <div className="text-lg font-black text-red-400">{playerHistory.roundLosses || 0}</div>
                  </div>
                </div>
                <div className="mt-2 bg-black p-2 text-center">
                  <div className="text-gray-400 text-xs">Win Rate em Rounds</div>
                  <div className="text-xl font-black text-purple-400">
                    {((playerHistory.roundWins || 0) + (playerHistory.roundLosses || 0)) > 0 
                      ? (((playerHistory.roundWins || 0) / ((playerHistory.roundWins || 0) + (playerHistory.roundLosses || 0))) * 100).toFixed(1)
                      : '0.0'}%
                  </div>
                </div>
              </div>

              {/* TIPOS DE VITÓRIA EM ROUNDS */}
              <div className="bg-gray-800 border border-gray-700 p-3">
                <h3 className="text-xs font-black text-orange-400 mb-3">VITÓRIAS POR TIPO</h3>
                <div className="space-y-2">
                  <div className="flex justify-between items-center bg-black p-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">💫</span>
                      <span className="text-xs text-gray-300">Spin Finish</span>
                    </div>
                    <span className="text-sm font-black text-green-400">
                      {playerHistory.winsBySpin || 0}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center bg-black p-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">💥</span>
                      <span className="text-xs text-gray-300">Burst Finish</span>
                    </div>
                    <span className="text-sm font-black text-yellow-400">
                      {playerHistory.winsByBurst || 0}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center bg-black p-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">🚀</span>
                      <span className="text-xs text-gray-300">Ring Out</span>
                    </div>
                    <span className="text-sm font-black text-red-400">
                      {playerHistory.winsByRingOut || 0}
                    </span>
                  </div>
                </div>
              </div>

              {/* DERROTAS POR TIPO */}
              <div className="bg-gray-800 border border-gray-700 p-3">
                <h3 className="text-xs font-black text-orange-400 mb-3">DERROTAS POR TIPO</h3>
                <div className="space-y-2">
                  <div className="flex justify-between items-center bg-black p-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">💫</span>
                      <span className="text-xs text-gray-300">Spin Finish</span>
                    </div>
                    <span className="text-sm font-black text-gray-400">
                      {playerHistory.lossesBySpin || 0}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center bg-black p-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">💥</span>
                      <span className="text-xs text-gray-300">Burst Finish</span>
                    </div>
                    <span className="text-sm font-black text-gray-400">
                      {playerHistory.lossesByBurst || 0}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center bg-black p-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">🚀</span>
                      <span className="text-xs text-gray-300">Ring Out</span>
                    </div>
                    <span className="text-sm font-black text-gray-400">
                      {playerHistory.lossesByRingOut || 0}
                    </span>
                  </div>
                </div>
              </div>

              {/* HISTÓRICO RECENTE */}
              <div className="bg-gray-800 border border-gray-700 p-3">
                <h3 className="text-xs font-black text-orange-400 mb-2">ÚLTIMOS RESULTADOS</h3>
                {playerHistory.tournamentHistory && playerHistory.tournamentHistory.length > 0 ? (
                  <div className="space-y-1 text-xs">
                    {playerHistory.tournamentHistory.slice(-5).reverse().map((t, idx) => (
                      <div key={idx} className="flex justify-between items-center bg-black p-2">
                        <span className="text-gray-300">{t.name}</span>
                        <span className={`font-bold ${t.position === 1 ? 'text-yellow-400' : 'text-gray-500'}`}>
                          {t.position === 1 ? '🏆 Campeão' : `#${t.position}`}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-gray-500 text-center py-4">
                    Nenhuma participação em torneios ainda
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ABA 4: ARENAS */}
          {activeTab === 'arenas' && (
            <div className="space-y-3">
              <div className="bg-gray-800 border border-gray-700 p-3">
                <h3 className="text-sm font-black text-orange-400 mb-2">DESEMPENHO POR ARENA</h3>
                {playerHistory.statsByArena && playerHistory.statsByArena.size > 0 ? (
                  <div className="space-y-3">
                    {Array.from(playerHistory.statsByArena.entries()).map(([arenaName, stats]) => {
                      const totalRounds = (stats.roundWins || 0) + (stats.roundLosses || 0);
                      const roundWinRate = totalRounds > 0 
                        ? (((stats.roundWins || 0) / totalRounds) * 100).toFixed(0)
                        : '0';
                      const matchWinRate = (stats.wins + stats.losses) > 0
                        ? ((stats.wins / (stats.wins + stats.losses)) * 100).toFixed(0)
                        : '0';
                      
                      return (
                        <div key={arenaName} className="bg-black border border-gray-700 p-3">
                          <div className="text-xs font-bold text-white mb-2 flex items-center justify-between">
                            <span>{arenaName}</span>
                            <span className="text-purple-400">{matchWinRate}% WR</span>
                          </div>
                          
                          {/* Partidas */}
                          <div className="grid grid-cols-3 gap-2 text-xs mb-2">
                            <div className="bg-gray-900 p-1.5 text-center">
                              <div className="text-gray-500 text-[10px]">Partidas</div>
                              <div className="text-white font-bold">{stats.wins + stats.losses}</div>
                            </div>
                            <div className="bg-gray-900 p-1.5 text-center">
                              <div className="text-gray-500 text-[10px]">V</div>
                              <div className="text-green-400 font-bold">{stats.wins}</div>
                            </div>
                            <div className="bg-gray-900 p-1.5 text-center">
                              <div className="text-gray-500 text-[10px]">D</div>
                              <div className="text-red-400 font-bold">{stats.losses}</div>
                            </div>
                          </div>

                          {/* Rounds */}
                          <div className="grid grid-cols-4 gap-1 text-xs mb-2">
                            <div className="bg-gray-900 p-1 text-center">
                              <div className="text-gray-500 text-[9px]">Rounds</div>
                              <div className="text-white font-bold text-[11px]">{totalRounds}</div>
                            </div>
                            <div className="bg-gray-900 p-1 text-center">
                              <div className="text-gray-500 text-[9px]">V</div>
                              <div className="text-green-400 font-bold text-[11px]">{stats.roundWins || 0}</div>
                            </div>
                            <div className="bg-gray-900 p-1 text-center">
                              <div className="text-gray-500 text-[9px]">D</div>
                              <div className="text-red-400 font-bold text-[11px]">{stats.roundLosses || 0}</div>
                            </div>
                            <div className="bg-gray-900 p-1 text-center">
                              <div className="text-gray-500 text-[9px]">WR</div>
                              <div className="text-purple-400 font-bold text-[11px]">{roundWinRate}%</div>
                            </div>
                          </div>

                          {/* Vitórias por tipo */}
                          <div className="text-[10px] text-gray-400 mb-1">Vitórias:</div>
                          <div className="grid grid-cols-3 gap-1 text-xs mb-2">
                            <div className="bg-gray-900 p-1 text-center">
                              <div className="text-gray-500 text-[9px]">💫 Spin</div>
                              <div className="text-green-400 font-bold text-[11px]">{stats.winsBySpin || 0}</div>
                            </div>
                            <div className="bg-gray-900 p-1 text-center">
                              <div className="text-gray-500 text-[9px]">💥 Burst</div>
                              <div className="text-yellow-400 font-bold text-[11px]">{stats.winsByBurst || 0}</div>
                            </div>
                            <div className="bg-gray-900 p-1 text-center">
                              <div className="text-gray-500 text-[9px]">🚀 K.O.</div>
                              <div className="text-red-400 font-bold text-[11px]">{stats.winsByRingOut || 0}</div>
                            </div>
                          </div>

                          {/* Derrotas por tipo */}
                          <div className="text-[10px] text-gray-400 mb-1">Derrotas:</div>
                          <div className="grid grid-cols-3 gap-1 text-xs">
                            <div className="bg-gray-900 p-1 text-center">
                              <div className="text-gray-500 text-[9px]">💫 Spin</div>
                              <div className="text-gray-400 font-bold text-[11px]">{stats.lossesBySpin || 0}</div>
                            </div>
                            <div className="bg-gray-900 p-1 text-center">
                              <div className="text-gray-500 text-[9px]">💥 Burst</div>
                              <div className="text-gray-400 font-bold text-[11px]">{stats.lossesByBurst || 0}</div>
                            </div>
                            <div className="bg-gray-900 p-1 text-center">
                              <div className="text-gray-500 text-[9px]">🚀 K.O.</div>
                              <div className="text-gray-400 font-bold text-[11px]">{stats.lossesByRingOut || 0}</div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-xs text-gray-500 text-center py-4">
                    Dados serão preenchidos conforme jogos acontecem nas diferentes arenas
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ABA 5: HISTÓRICO */}
          {activeTab === 'historico' && (
            <div className="space-y-3">
              <div className="bg-gray-800 border border-gray-700 p-3">
                <h3 className="text-sm font-black text-orange-400 mb-3">ÚLTIMOS 36 TORNEIOS</h3>
                {playerHistory.tournamentHistory && playerHistory.tournamentHistory.length > 0 ? (
                  <div className="space-y-1 text-xs max-h-96 overflow-y-auto">
                    {playerHistory.tournamentHistory.slice(-36).reverse().map((t, idx) => {
                      // Determinar o rótulo da fase
                      let phaseLabel = '';
                      let phaseColor = 'text-gray-500';
                      
                      if (t.position === 1) {
                        phaseLabel = '🏆 Campeão';
                        phaseColor = 'text-yellow-400';
                      } else if (t.position === 2) {
                        phaseLabel = 'Final';
                        phaseColor = 'text-gray-300';
                      } else if (t.position <= 4) {
                        phaseLabel = 'Semi-Final';
                        phaseColor = 'text-gray-400';
                      } else if (t.position <= 8) {
                        phaseLabel = 'Quartas';
                        phaseColor = 'text-gray-500';
                      } else if (t.position <= 16) {
                        phaseLabel = 'R16';
                        phaseColor = 'text-gray-500';
                      } else if (t.position <= 32) {
                        phaseLabel = 'R32';
                        phaseColor = 'text-gray-600';
                      } else {
                        phaseLabel = 'R64';
                        phaseColor = 'text-gray-600';
                      }
                      
                      const isGrandSlam = t.type === 'GRAND_SLAM';
                      
                      return (
                        <div 
                          key={idx} 
                          className={`flex items-center justify-between p-2 border-l-2 ${
                            isGrandSlam 
                              ? 'bg-gradient-to-r from-yellow-900/20 to-black border-yellow-500' 
                              : 'bg-gradient-to-r from-blue-900/20 to-black border-blue-500'
                          }`}
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px]">{isGrandSlam ? '🏆' : '🏅'}</span>
                              <span className="text-white font-bold text-[11px] truncate max-w-[160px]">
                                {t.name}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-gray-500 text-[10px] min-w-[35px] text-right">
                              {t.year}
                            </span>
                            <span className={`font-bold text-[11px] min-w-[70px] text-right ${phaseColor}`}>
                              {phaseLabel}
                            </span>
                            <span className="text-blue-400 font-bold text-[10px] min-w-[45px] text-right">
                              +{t.points || 0} pts
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="text-4xl mb-2">📜</div>
                    <div className="text-sm text-gray-400">Nenhum torneio disputado ainda</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ABA 6: TÍTULOS */}
          {activeTab === 'titulos' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gradient-to-br from-yellow-900 to-yellow-800 border border-yellow-600 p-3 text-center">
                  <div className="text-2xl mb-1">🏆</div>
                  <div className="text-2xl font-black text-white">{playerHistory.titles?.grandSlams || 0}</div>
                  <div className="text-xs text-yellow-200">Grand Slams</div>
                </div>
                
                <div className="bg-gradient-to-br from-blue-900 to-blue-800 border border-blue-600 p-3 text-center">
                  <div className="text-2xl mb-1">🏅</div>
                  <div className="text-2xl font-black text-white">{playerHistory.titles?.atp250 || 0}</div>
                  <div className="text-xs text-blue-200">ATP 250</div>
                </div>
              </div>

              <div className="bg-gray-800 border border-gray-700 p-3">
                <h3 className="text-xs font-black text-orange-400 mb-2">TROFÉUS CONQUISTADOS</h3>
                {championshipTitles.length > 0 ? (
                  <div className="space-y-2">
                    {championshipTitles.map((title, idx) => {
                      const monthName = CALENDAR_CONFIG.months.find(m => m.id === title.month)?.shortName || title.month;
                      const isGrandSlam = title.type === 'GRAND_SLAM';
                      
                      return (
                        <div 
                          key={idx} 
                          className={`p-2 border-l-4 ${
                            isGrandSlam 
                              ? 'bg-gradient-to-r from-yellow-900/30 to-black border-yellow-500' 
                              : 'bg-gradient-to-r from-blue-900/30 to-black border-blue-500'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-sm font-bold text-white flex items-center gap-2">
                                <span>{isGrandSlam ? '🏆' : '🏅'}</span>
                                <span>{title.name}</span>
                              </div>
                              <div className="text-xs text-gray-400">
                                {monthName} {title.year}
                              </div>
                            </div>
                            <div className="text-yellow-400 font-black text-lg">
                              1º
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="text-4xl mb-2">🏆</div>
                    <div className="text-sm text-gray-400">Ainda sem títulos</div>
                    <div className="text-xs text-gray-600 mt-1">Conquiste seu primeiro torneio!</div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const BattleArena = ({ bey1, bey2, onEnd, md3State }) => {
  const turbo = useTurbo(); // ✅ NOVO
  const canvasRef = useRef(null);
  const [stats, setStats] = useState({ stamina1: 100, stamina2: 100, spin1: 100, spin2: 100, stability1: 100, stability2: 100 });
  const [introPhase, setIntroPhase] = useState('rip'); // Inicia direto em 'rip' (que mostra launch quality)
  const [showQualityText, setShowQualityText] = useState(true); // Mostra launch quality imediatamente
  const replayEventsRef = useRef([]);
  const battleStartTimeRef = useRef(0);
  const statsHistoryRef = useRef([]);
  
  // Battle HUD State
  const [battleState, setBattleState] = useState({
    stamina1: 100,
    stamina2: 100,
    spin1: 100,
    spin2: 100,
    stability1: 100,
    stability2: 100,
    time: 0,
    bey1Combos: 0,
    bey2Combos: 0
  });
  const [events, setEvents] = useState([]);
  
  // ✨ ENHANCED RENDERER SYSTEMS
  const particleSystemRef = useRef(null);
  const impactEffectsRef = useRef(null);
  
  if (!particleSystemRef.current) {
    particleSystemRef.current = new EnhancedParticleSystem();
    impactEffectsRef.current = new EnhancedImpactEffects(particleSystemRef.current);
  }
  
  // Function to add battle events
  const addEvent = (type, title, description = '') => {
    const newEvent = {
      id: Date.now() + Math.random(),
      type,
      title,
      description,
      timestamp: Date.now()
    };
    
    setEvents(prev => [...prev, newEvent]);
    
    // Auto-remover evento após 5 segundos
    setTimeout(() => {
      setEvents(prev => prev.filter(e => e.id !== newEvent.id));
    }, 5000);
  };
  
  // Load custom icons as images
  const customIcon1Ref = useRef(null);
  const customIcon2Ref = useRef(null);
  const [iconsLoaded, setIconsLoaded] = useState(false);
  
  useEffect(() => {
    const loadIcons = async () => {
      // ⭐ PRIORIDADE: iconUrl > customIcon
      const icon1Src = md3State?.team1?.team?.iconUrl || md3State?.team1?.team?.customIcon || md3State?.team1?.customIcon || md3State?.team1?.iconUrl;
      const icon2Src = md3State?.team2?.team?.iconUrl || md3State?.team2?.team?.customIcon || md3State?.team2?.customIcon || md3State?.team2?.iconUrl;
      
      if (icon1Src) {
        const img1 = new Image();
        img1.src = icon1Src;
        await new Promise((resolve) => {
          img1.onload = resolve;
          img1.onerror = resolve; // Continue even if load fails
        });
        customIcon1Ref.current = img1;
      }
      
      if (icon2Src) {
        const img2 = new Image();
        img2.src = icon2Src;
        await new Promise((resolve) => {
          img2.onload = resolve;
          img2.onerror = resolve;
        });
        customIcon2Ref.current = img2;
      }
      
      setIconsLoaded(true);
    };
    
    loadIcons();
  }, [md3State]);

  // Intro phase effect - Apenas transição rápida de 'rip' para 'battle'
  useEffect(() => {
    if (introPhase === 'rip') {
      // Mostra launch quality por 2 segundos, depois começa a batalha
      const timer = setTimeout(() => {
        setIntroPhase('battle');
        setShowQualityText(false);
      }, turbo.turboEnabled ? 0 : 2000); // ✅ MODIFICADO
      return () => clearTimeout(timer);
    }
  }, [introPhase, turbo]); // ✅ ADICIONAR turbo

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !bey1 || !bey2 || !md3State || !md3State.arenaOrder || !md3State.currentRound) return;
    if (introPhase !== 'battle') return;
    
    const arenaType = md3State.arenaOrder[md3State.currentRound - 1];
    const ctx = canvas.getContext('2d');
    canvas.width = 1000;
    canvas.height = 700;

    // ✅ TURBO: quantas vezes roda física por frame de render
    const TURBO_STEPS = turbo.turboEnabled ? Math.max(1, Math.floor(turbo.getTurboMultiplier())) : 1;

    const centerX = 500, centerY = 350;
    
    // Get launch techniques
    const launch1 = LAUNCH_TECHNIQUES[md3State.launch1 || 'STANDARD'];
    const launch2 = LAUNCH_TECHNIQUES[md3State.launch2 || 'STANDARD'];
    
    // Get launch quality
    const quality1 = md3State.launchQuality1 || { key: 'STANDARD', ...LAUNCH_QUALITY.STANDARD };
    const quality2 = md3State.launchQuality2 || { key: 'STANDARD', ...LAUNCH_QUALITY.STANDARD };
    
    // Initialize replay recording
    replayEventsRef.current = [];
    statsHistoryRef.current = [];
    battleStartTimeRef.current = Date.now();
    
    // Record launch techniques AND quality
    function recordEvent(type, data) {
      const timestamp = (Date.now() - battleStartTimeRef.current) / 1000;
      replayEventsRef.current.push({ timestamp, type, data });
    }
    
    recordEvent('LAUNCH', {
      bey1: bey1.name,
      bey2: bey2.name,
      launch1: md3State.launch1,
      launch2: md3State.launch2,
      quality1: quality1.key,
      quality2: quality2.key
    });
    
    // Arena configurations
    const ARENA_CONFIGS = {
      BB10_COMPETITIVE: {
        name: 'BB-10 Competitive',
        type: 'circular',
        competitive: true,
        zones: {
          centerBowl: 40,
          innerSlope: 110,
          tornadoRidge: 160,
          outerSlope: 195,
          wall: 221,
        },
        exits: [
          { angle: 0,     width: 14 },
          { angle: 2.094, width: 14 },
          { angle: 4.189, width: 14 }
        ],
        exitsOpen: true,
        exitsOpenTime: 0,
        exitRing: null,
        gracePeriod: {
          enabled: true,
          duration: 1.5,
          exitMultiplier: 0,
          wallRingOutDisabled: true
        },
        sweetSpots: [],
        pockets: [],
        colors: {
          center: '#d0d8e0',
          inner: '#b0bcc8',
          ridge: '#8898aa',
          outer: '#6a7888',
          wall: '#505a68'
        }
      },
      VOLCANIC_RAGE: {
        name: 'Volcanic Rage',
        type: 'bowl',
        zones: {
          centerBowl: 60,
          midZone: 140,
          outerZone: 200,
          wall: 228
        },
        frictionGradient: {
          center: { radius: 60, friction: 0.95 },
          mid: { radius: 140, friction: 0.70 },
          outer: { radius: 200, friction: 0.35 },
          wall: { radius: 228, friction: 0.30 }
        },
        depthGradient: 0.8,
        gravityModifier: 1.25,
        // NOVO: Sistema de Volcanic Eruptions
        volcanicSystem: {
          eruptionInterval: 8.0,        // A cada 8 segundos
          eruptionDuration: 1.2,        // Duração do efeito
          eruptionRadius: 60,           // Raio de impacto
          eruptionForce: 4.5,           // Força de empurrão (MODERADA)
          centerBias: true,             // Sempre no centro
          warningTime: 1.0,             // Aviso visual 1s antes
          lastEruptionTime: 0,
          warningActive: false,
          eruptionActive: false,
          eruptionStartTime: 0
        },
        // NOVO: Sistema de Lava Flows
        lavaFlowSystem: {
          flowInterval: 5.0,            // Muda a cada 5 segundos
          activeFlows: [],              // Até 3 flows simultâneos
          flowLifetime: 5.0,            // Cada flow dura 5s
          frictionReduction: 0.15,      // Reduz fricção para 0.15
          rareChance: 0.05,             // 5% chance de flow global
          lastFlowChange: 0,
          flowPatterns: []              // Array de padrões ativos
        },
        exits: [],
        pockets: [],
        colors: {
          center: '#9b2020',
          mid: '#4a3844',
          outer: '#252040',
          wall: '#8b7888',
          grip: '#ff4444',
          lava: '#ff4500',
          eruption: '#ff6600'
        }
      },
      KILLER_SIDES: {
        name: 'Killer Sides Arena',
        type: 'circular',
        zones: {
          centerBowl: 39,      // Same as BB10_COMPETITIVE
          innerSlope: 104,      // Same as BB10_COMPETITIVE
          tornadoRidge: 163,   // Same as BB10_COMPETITIVE
          outerSlope: 195,     // Same as BB10_COMPETITIVE
          gripRadius: 202,     // Circular grip track radius
          wall: 221            // Same as BB10_COMPETITIVE
        },
        exits: [],
        pockets: [],
        // Grip mechanics
        gripVelocityThreshold: 6.9,  // Velocity to escape grip
        gripRampAngle: 0,             // Ramp position (radians, 0 = right)
        gripRampWidth: 0.4,           // Ramp gap width (radians, ~23°)
        colors: {
          center: '#6a7b8f',
          inner: '#5a6b7f',
          ridge: '#6b7a94',
          outer: '#4a5568',
          wall: '#3a4556',
          grip: '#10b981',    // Green grip
          ramp: '#ef4444'     // Red ramp
        }
      },
      NEXUS: {
        name: 'Prismatic Nexus Arena',
        type: 'octagonal',
        zones: {
          centerSafe: 52,
          mainArea: 182,
          wall: 215
        },
        portals: [
          { id: 0, angle: 0, radius: 195, color: '#00d4ff', active: true, cooldown: 0 },           // Norte (Azul)
          { id: 1, angle: Math.PI / 2, radius: 195, color: '#ff00ff', active: true, cooldown: 0 }, // Leste (Rosa)
          { id: 2, angle: Math.PI, radius: 195, color: '#00ff88', active: true, cooldown: 0 },     // Sul (Verde)
          { id: 3, angle: -Math.PI / 2, radius: 195, color: '#ffd700', active: true, cooldown: 0 } // Oeste (Dourado)
        ],
        portalSuction: {
          enabled: true,
          interval: 7.0,              // Suck every 7 seconds
          lastSuctionTime: 0,
          duration: 1.5,              // Suction lasts 1.5 seconds
          currentlyActive: false,
          activePortal: null,
          suctionStartTime: 0
        },
        colors: {
          floor: '#1a1a2e',
          center: '#2d2d44',
          main: '#252538',
          wall: '#3a3a5a',
          grid: '#4a4a6a'
        }
      },
      COLOSSEUM_CARNAGE: {
        name: 'Colosseum Carnage Arena',
        type: 'circular',
        zones: {
          centerSafe: 50,
          mainArea: 160,
          dangerZone: 190,
          wall: 200
        },
        gates: [
          { id: 0, x: -200, y: 0, angle: Math.PI, openTime: null, open: false },
          { id: 1, x: 0, y: -200, angle: Math.PI / 2, openTime: null, open: false },
          { id: 2, x: 200, y: 0, angle: 0, openTime: null, open: false }
        ],
        // NOVO: Sistema aleatório de gates
        gateSystem: {
          minInterval: 8.0,      // Mínimo 8 segundos
          maxInterval: 18.0,     // Máximo 18 segundos
          lastGateTime: 0,
          simultaneousGates: {
            single: 0.65,        // 65% chance de 1 porta
            double: 0.30,        // 30% chance de 2 portas
            triple: 0.05         // 5% chance de 3 portas
          }
        },
        // NOVO: Sistema de itens
        itemSystem: {
          activeItems: [],       // Itens ativos na arena
          itemTypes: [
            { type: 'BUMPER', chance: 0.25, speed: 18, radius: 25, bounceMultiplier: 1.8, lifespan: 12.0 },
            { type: 'STABILITY_ORB', chance: 0.20, speed: 15, radius: 22, duration: 3.0, lifespan: 15.0 },
            { type: 'OIL_BALL', chance: 0.20, speed: 20, radius: 20, duration: 3.0, lifespan: 12.0 },
            { type: 'HEALTH_ORB', chance: 0.15, speed: 12, radius: 23, healAmount: 15, lifespan: 18.0 },
            { type: 'SHIELD_ORB', chance: 0.10, speed: 10, radius: 24, duration: 4.0, lifespan: 20.0 },
            { type: 'SPEED_DEMON', chance: 0.07, speed: 28, radius: 18, multiplier: 2.5, duration: 2.5, lifespan: 10.0 },
            { type: 'DEATH_BALL', chance: 0.02, speed: 35, radius: 15, damage: 40, lifespan: 8.0 },
            { type: 'CHAOS_ORB', chance: 0.01, speed: 15, radius: 28, lifespan: 10.0 }
          ],
          movementPatterns: ['straight', 'zigzag', 'spiral', 'orbital', 'erratic', 'slow_drift', 'figure_eight', 'lightning', 'chase', 'teleport']
        },
        obstacles: [],  // Removido - substituído por itemSystem
        exits: [],
        pockets: [],
        colors: {
          center: '#2a1810',
          inner: '#3a2820',
          outer: '#4a3830',
          wall: '#5a4840',
          gate: '#8b0000',
          obstacle: '#ff4500',
          danger: '#cc2200',
          // Cores dos itens
          bumper: '#ffaa00',
          stabilityOrb: '#4444ff',
          oilBall: '#222222',
          healthOrb: '#00ff88',
          shieldOrb: '#00ccff',
          speedDemon: '#ff00ff',
          deathBall: '#ff0000',
          chaosOrb: 'rainbow'
        }
      },
      PANGEA_PLATFORM: {
        name: 'Pangea Platform Stadium',
        type: 'circular',
        zones: {
          centerStable: 40,
          plateZone: 180,
          wall: 221
        },
        plates: [
          { id: 0, angle: 0, velocity: 0.28, direction: 1, currentAngle: 0 },             // AUMENTADO ~2x
          { id: 1, angle: Math.PI/3, velocity: 0.32, direction: -1, currentAngle: Math.PI/3 },
          { id: 2, angle: 2*Math.PI/3, velocity: 0.25, direction: 1, currentAngle: 2*Math.PI/3 },
          { id: 3, angle: Math.PI, velocity: 0.30, direction: -1, currentAngle: Math.PI },
          { id: 4, angle: 4*Math.PI/3, velocity: 0.27, direction: 1, currentAngle: 4*Math.PI/3 },
          { id: 5, angle: 5*Math.PI/3, velocity: 0.31, direction: -1, currentAngle: 5*Math.PI/3 }
        ],
        seismic: {
          interval: 8.0,              // REDUZIDO de 12s → 8s
          duration: 2.0,              // AUMENTADO de 1.5s → 2.0s
          intensity: 7.0,             // DOBRADO de 3.5 → 7.0
          warningTime: 1.5,           // NOVO - aviso antes
          lastQuakeTime: 0,
          active: false,
          activeTimer: 0,
          warningActive: false,
          warningStartTime: 0,
          // NOVO: Aftershocks
          aftershocks: {
            enabled: true,
            count: 3,                 // 3 aftershocks
            delay: 0.8,               // 0.8s entre cada
            intensity: 3.0,           // Mais fracos
            currentAftershock: 0,
            lastAftershockTime: 0
          },
          // NOVO: Fissures
          fissures: {
            enabled: true,
            chance: 0.20,             // 20% chance de abrir fenda
            activeFissures: [],
            fissureWidth: 20,         // 20px width
            duration: 2.0             // Dura durante o earthquake
          }
        },
        exits: [],
        pockets: [],
        colors: {
          center: '#2d5016',
          plates: ['#4a6b2a', '#3a5b1a', '#5a7b3a', '#3a5b2a', '#4a6b1a', '#5a7b2a'],
          faultLine: '#8b4513',
          wall: '#6b8b3a',
          quake: '#ff6b6b',
          fissure: '#ff0000'
        }
      },
      PINBALL_INFERNO: {
        name: 'Pinball Inferno Arena',
        type: 'pinball_gravity',
        zones: {
          combatZone: 130,      // Arena circular superior (flat)
          transitionZone: 170,  // Zona de queda (inclined)
          dangerZone: 200,      // Zona dos flippers
          ringOutZone: 240      // Buraco inferior
        },
        // NOVO: Sistema de gravity tilt
        gravityTilt: {
          enabled: true,
          direction: { x: 0, y: 1 },      // Puxa para baixo (Y+)
          baseStrength: 0.08,             // Força base
          yThreshold: 0,                  // Acima/abaixo do centro
          strengthMultiplierAbove: 0.5,   // Mais fraco acima
          strengthMultiplierBelow: 2.0    // 2x mais forte abaixo
        },
        // Bumpers apenas na combat zone
        bumpers: [
          { id: 0, x: 0, y: -100, radius: 20, bounceMultiplier: 1.8, type: 'neon', cooldown: 0 },    // Norte
          { id: 1, x: 100, y: 0, radius: 20, bounceMultiplier: 1.8, type: 'neon', cooldown: 0 },     // Leste
          { id: 2, x: 0, y: 100, radius: 20, bounceMultiplier: 1.8, type: 'neon', cooldown: 0 },     // Sul
          { id: 3, x: -100, y: 0, radius: 20, bounceMultiplier: 1.8, type: 'neon', cooldown: 0 }     // Oeste
        ],
        // NOVO: Flippers na danger zone
        flippers: [
          {
            id: 'left',
            x: -120,
            y: 180,
            angle: Math.PI / 4,       // 45° diagonal
            width: 40,
            launchPower: 12,          // Muito forte
            autoTrigger: true,
            triggerRadius: 25,        // Ativa quando blade chega perto
            cooldown: 0,
            maxCooldown: 1.5,         // 1.5s entre ativações
            active: false
          },
          {
            id: 'right',
            x: 120,
            y: 180,
            angle: -Math.PI / 4,      // 315° diagonal oposta
            width: 40,
            launchPower: 12,
            autoTrigger: true,
            triggerRadius: 25,
            cooldown: 0,
            maxCooldown: 1.5,
            active: false
          }
        ],
        // NOVO: Ring-out gap
        ringOutGap: {
          x: 0,
          y: 210,              // Centro inferior
          width: 60,
          height: 40,
          shape: 'rounded_rectangle'
        },
        colors: {
          combatFloor: '#0a0a1a',        // Azul escuro profundo
          neonGrid: '#00ffff',           // Grid cyan brilhante
          bumpers: '#ff00ff',            // Magenta neon
          transitionTop: '#0066cc',      // Azul (topo)
          transitionBottom: '#cc0066',   // Vermelho (fundo)
          flippers: '#00ffff',           // Cyan brilhante
          ringOutGap: '#ff0000',         // Vermelho perigo
          walls: '#1a0a2a'               // Roxo escuro
        }
      },
      VORTEX_COLISEUM: {
        name: 'Vortex Coliseum',
        type: 'circular',
        zones: {
          vortexCore: 46,      // Center vortex
          innerOrbit: 104,      // Fast orbit - high risk/reward
          middleOrbit: 169,    // Balanced orbit
          outerOrbit: 208,     // Safe orbit - stamina recovery
          wall: 228
        },
        vortex: {
          strength: 0.8,       // Pull strength
          rotationSpeed: 2.0,  // Vortex rotation speed (rad/s)
          currentAngle: 0,
          inversed: false,
          surgeTimer: 0,
          surgeDuration: 2.0,  // Storm surge lasts 2 seconds
          surgeCooldown: 5.0   // Surge every 5 seconds
        },
        slingshotPoints: [
          { id: 0, angle: 0, radius: 170, cooldown: 0 },              // North
          { id: 1, angle: Math.PI / 2, radius: 170, cooldown: 0 },    // East
          { id: 2, angle: Math.PI, radius: 170, cooldown: 0 },        // South
          { id: 3, angle: -Math.PI / 2, radius: 170, cooldown: 0 }    // West
        ],
        bumpers: [], // Bumpers removidos
        momentum: {
          bey1Stacks: 0,
          bey2Stacks: 0,
          bey1LastAngle: 0,
          bey2LastAngle: 0,
          stackDecayRate: 0.3  // Stacks decay over time
        },
        colors: {
          core: '#1a0033',      // Deep purple vortex
          inner: '#4c1d95',     // Purple inner orbit
          middle: '#6366f1',    // Blue middle orbit
          outer: '#8b5cf6',     // Light purple outer orbit
          wall: '#a78bfa',      // Bright purple wall
          vortex: '#c084fc',    // Vortex glow
          slingshot: '#fbbf24'  // Gold slingshot points
        }
      },
      DOMINATION_ZONES: {
        name: 'Domination Zones',
        type: 'circular',
        zones: {
          center: 50,          // Centro
          zoneRadius: 180,     // Raio das zonas
          wall: 225            // Parede
        },
        // NOVO: 8 zonas periféricas + 1 central
        peripheralZones: [
          { 
            id: 1,
            angle: 0,                    // Norte
            arcWidth: Math.PI / 4,       // 45° cada
            radius: 170,
            captureRadius: 40,           // Raio de detecção
            points: 1,
            owner: null,                 // null, 'player1', 'player2'
            captureProgress: {
              player1: 0,                // Progresso de captura (0-1.0)
              player2: 0
            }
          },
          { id: 2, angle: Math.PI / 4, arcWidth: Math.PI / 4, radius: 170, captureRadius: 40, points: 1, owner: null, captureProgress: { player1: 0, player2: 0 } },
          { id: 3, angle: Math.PI / 2, arcWidth: Math.PI / 4, radius: 170, captureRadius: 40, points: 1, owner: null, captureProgress: { player1: 0, player2: 0 } },
          { id: 4, angle: 3 * Math.PI / 4, arcWidth: Math.PI / 4, radius: 170, captureRadius: 40, points: 1, owner: null, captureProgress: { player1: 0, player2: 0 } },
          { id: 5, angle: Math.PI, arcWidth: Math.PI / 4, radius: 170, captureRadius: 40, points: 1, owner: null, captureProgress: { player1: 0, player2: 0 } },
          { id: 6, angle: 5 * Math.PI / 4, arcWidth: Math.PI / 4, radius: 170, captureRadius: 40, points: 1, owner: null, captureProgress: { player1: 0, player2: 0 } },
          { id: 7, angle: 3 * Math.PI / 2, arcWidth: Math.PI / 4, radius: 170, captureRadius: 40, points: 1, owner: null, captureProgress: { player1: 0, player2: 0 } },
          { id: 8, angle: 7 * Math.PI / 4, arcWidth: Math.PI / 4, radius: 170, captureRadius: 40, points: 1, owner: null, captureProgress: { player1: 0, player2: 0 } }
        ],
        centralZone: {
          id: 'center',
          x: 0,
          y: 0,
          radius: 50,              // Círculo central
          points: 2,               // VALE 2 PONTOS
          owner: null,
          captureProgress: {
            player1: 0,
            player2: 0
          },
          contested: false         // Se ambos estão na zona
        },
        // Sistema de pontos
        pointsSystem: {
          captureTime: 1.0,          // 1 segundo acumulado para capturar
          targetPoints: 5,           // Precisa de 5 pontos para vencer
          player1: {
            totalPoints: 0,          // Pontos totais coletados
            zonesOwned: [],          // IDs das zonas capturadas
            lastCapture: null        // Timestamp da última captura
          },
          player2: {
            totalPoints: 0,
            zonesOwned: [],
            lastCapture: null
          }
        },
        colors: {
          floor: '#1a1a2a',
          wall: '#2a2a3a',
          uncaptured: '#666666',     // Zona não capturada
          player1: '#ff4444',        // Vermelho
          player2: '#4444ff',        // Azul
          capturing: '#ffff44',      // Amarelo (sendo capturada)
          centralZone: '#8844ff'     // Roxo para zona central
        }
      },
      TIDAL_SURGE: {
        name: 'Tidal Surge',
        type: 'circular',
        zones: {
          center: 40,
          floodZone: 80,       // Zona que inunda na maré alta
          normalZone: 160,
          wall: 220
        },
        tideSystem: {
          phase: 'low',        // low, rising, high
          timer: 0,
          cycleDuration: 12.0,
          floodRadius: 0,      // Raio atual da inundação
          maxFloodRadius: 80
        },
        colors: {
          floor: '#2a2a1a',
          wall: '#4a4a3a',
          waterLow: 'rgba(100, 150, 200, 0.3)',
          waterHigh: 'rgba(50, 100, 180, 0.7)',
          wave: '#88bbff'
        }
      },
      STORM_TRACK: {
        name: 'Storm Track',
        type: 'circular',
        zones: {
          center: 50,
          inner: 140,
          outer: 190,
          wall: 218
        },
        // NOVO: Sistema de múltiplos storms
        stormSystem: {
          currentStorm: null,        // Storm ativo atual
          stormHistory: [],          // Storms já usados
          stormQueue: [],            // Próximos storms
          
          timing: {
            peaceDuration: 5.0,      // 5s de paz entre storms
            warningDuration: 2.0,    // 2s de aviso
            stormDuration: 4.0,      // 4s de storm ativo
            currentPhase: 'peace',   // peace, warning, active
            phaseStartTime: 0
          },
          
          intensity: {
            level: 1,                // 1, 2, 3
            levelUpTime: 20.0,       // Aumenta nível a cada 20s
            lastLevelUpTime: 0
          },
          
          // Tipos de storm com probabilidades
          stormTypes: {
            RAIN_WAVE: {
              chance: 0.30,
              waveDirection: 0,
              waveForce: 5.0,
              waveWidth: Math.PI / 2,  // 90° arc
              chainWaves: { count: 2, delay: 1.0 },
              currentWave: 0
            },
            WIND_VORTEX: {
              chance: 0.25,
              vortices: [],
              vortexCount: 1,
              vortexRadius: 40,
              pullForce: 4.0,
              rotationSpeed: 3.0
            },
            LIGHTNING_STORM: {
              chance: 0.20,
              strikes: [],
              strikeCount: 5,
              strikeInterval: 0.6,
              strikeRadius: 35,
              stunDuration: 0.8,
              lastStrikeTime: 0,
              currentStrikes: 0
            },
            THUNDER_DOME: {
              chance: 0.15,
              domeRadius: 180,
              repulsionForce: 8.0,
              repulsionRange: 40,
              damagePerTick: 3,
              tickRate: 0.2,
              lastTickTime: 0
            },
            HAIL_BARRAGE: {
              chance: 0.07,
              hailstones: [],
              totalCount: 40,
              spawnRate: 0.1,
              lastSpawnTime: 0,
              damagePerHit: 2,
              slowEffect: 0.85
            },
            TORNADO_FURY: {
              chance: 0.03,
              tornadoX: 0,
              tornadoY: 0,
              tornadoRadius: 180,
              pullForce: 10.0,
              rotationSpeed: 5.0,
              liftChance: 0.3,
              liftedBlades: []
            }
          },
          
          // Apocalypse mode
          apocalypse: {
            triggerTime: 90.0,       // Aos 90s
            active: false,
            storms: []               // 2 storms simultâneos
          }
        },
        colors: {
          floor: '#1a1a1a',
          wall: '#3a3a3a',
          warning: '#ffff00',
          rainWave: '#00aaff',
          windVortex: '#ccccff',
          lightning: '#ffff00',
          thunderDome: '#00ffff',
          hail: '#aaccff',
          tornado: '#ff6666',
          grid: '#444444'
        }
      }
    };
    
    const ARENA = ARENA_CONFIGS[arenaType] || ARENA_CONFIGS.BB10_COMPETITIVE; // Fallback to BB10 if arena not found
    
    const gameParticles = [];
    const gameBrokenPieces = [];
    const permanentDebris = [];

    // ════════════════════════════════════════════════════════════════
    // SISTEMA DE PARTÍCULAS MELHORADO v2.0 (FASE 1)
    // ════════════════════════════════════════════════════════════════

    // Definições de tipos de partículas
    const PARTICLE_TYPES = {
      SPARK: {
        shapes: ['star', 'cross', 'diamond'],
        colors: ['#ffff00', '#ff9900', '#ffffff', '#ffaa00'],
        sizes: [2, 3, 4, 3],
        lifetime: 0.6,
        glow: true,
        glowIntensity: 15,
        speed: { min: 3, max: 6 },
        gravity: 0,
        fade: 'quadratic'
      },
      
      DEBRIS: {
        shapes: ['square', 'triangle', 'circle'],
        colors: null,
        sizes: [2, 3, 4, 5],
        lifetime: 1.2,
        rotation: true,
        rotationSpeed: { min: -0.3, max: 0.3 },
        gravity: 0.15,
        bounce: true,
        bounceRestitution: 0.4,
        speed: { min: 2, max: 5 }
      },
      
      SMOKE: {
        shapes: ['circle'],
        colors: ['rgba(100, 100, 100, 0.6)', 'rgba(80, 80, 80, 0.5)', 'rgba(120, 120, 120, 0.4)'],
        sizes: [4, 5, 6, 7],
        lifetime: 1.0,
        expansion: 1.8,
        fade: 'exponential',
        speed: { min: 0.5, max: 2 },
        gravity: -0.05,
        blur: true
      },
      
      ENERGY: {
        shapes: ['ring', 'wave', 'plus'],
        colors: null,
        sizes: [3, 4, 5],
        lifetime: 0.8,
        pulse: true,
        pulseSpeed: 0.1,
        glow: true,
        glowIntensity: 20,
        speed: { min: 2, max: 4 },
        expansion: 1.3
      },
      
      IMPACT: {
        shapes: ['star', 'diamond', 'cross'],
        colors: ['#ffffff', '#ffff00', '#ff9900'],
        sizes: [3, 4, 5, 6],
        lifetime: 0.4,
        glow: true,
        glowIntensity: 25,
        speed: { min: 4, max: 8 },
        gravity: 0.1,
        fade: 'linear'
      }
    };

    // Nova função addParticle com tipos
    function addParticle(x, y, colorOrType, count = 20, typeOverride = null) {
      let type = typeOverride;
      let color = colorOrType;
      
      if (typeof colorOrType === 'string' && PARTICLE_TYPES[colorOrType.toUpperCase()]) {
        type = colorOrType.toUpperCase();
        color = null;
      }
      
      if (!type) type = 'DEBRIS';
      
      const config = PARTICLE_TYPES[type];
      const actualCount = Math.floor(count);
      
      for (let i = 0; i < actualCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speedRange = config.speed || { min: 2, max: 4 };
        const speed = Math.random() * (speedRange.max - speedRange.min) + speedRange.min;
        
        const particleColor = config.colors 
          ? config.colors[Math.floor(Math.random() * config.colors.length)]
          : (color || '#ffffff');
        
        const particle = {
          x, y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 1,
          maxLife: config.lifetime || 1,
          age: 0,
          type: type,
          shape: config.shapes[Math.floor(Math.random() * config.shapes.length)],
          color: particleColor,
          size: config.sizes[Math.floor(Math.random() * config.sizes.length)],
          baseSize: config.sizes[Math.floor(Math.random() * config.sizes.length)],
          rotation: config.rotation ? Math.random() * Math.PI * 2 : 0,
          rotationSpeed: config.rotation 
            ? (Math.random() * (config.rotationSpeed.max - config.rotationSpeed.min) + config.rotationSpeed.min)
            : 0,
          gravity: config.gravity || 0,
          bounced: false,
          glow: config.glow || false,
          glowIntensity: config.glowIntensity || 10,
          blur: config.blur || false,
          expansion: config.expansion || 1,
          pulse: config.pulse || false,
          pulseSpeed: config.pulseSpeed || 0.1,
          fade: config.fade || 'linear',
          scale: 1
        };
        
        gameParticles.push(particle);
      }
    }

    // Funções helper para criar tipos específicos
    function addSparkParticles(x, y, count = 15) {
      addParticle(x, y, 'SPARK', count);
    }

    function addDebrisParticles(x, y, color, count = 12) {
      addParticle(x, y, color, count, 'DEBRIS');
    }

    function addSmokeParticles(x, y, count = 8) {
      addParticle(x, y, 'SMOKE', count);
    }

    function addEnergyParticles(x, y, color, count = 10) {
      addParticle(x, y, color, count, 'ENERGY');
    }

    function addImpactParticles(x, y, count = 20) {
      addParticle(x, y, 'IMPACT', count);
    }

    // Funções de desenho de formas
    function drawStar(ctx, x, y, spikes, outerRadius, innerRadius) {
      ctx.beginPath();
      let rot = Math.PI / 2 * 3;
      let step = Math.PI / spikes;
      
      ctx.moveTo(x, y - outerRadius);
      for (let i = 0; i < spikes; i++) {
        ctx.lineTo(x + Math.cos(rot) * outerRadius, y + Math.sin(rot) * outerRadius);
        rot += step;
        ctx.lineTo(x + Math.cos(rot) * innerRadius, y + Math.sin(rot) * innerRadius);
        rot += step;
      }
      ctx.lineTo(x, y - outerRadius);
      ctx.closePath();
      ctx.fill();
    }

    function drawCross(ctx, x, y, size) {
      const w = size * 0.3;
      ctx.fillRect(x - size, y - w, size * 2, w * 2);
      ctx.fillRect(x - w, y - size, w * 2, size * 2);
    }

    function drawDiamond(ctx, x, y, size) {
      ctx.beginPath();
      ctx.moveTo(x, y - size);
      ctx.lineTo(x + size, y);
      ctx.lineTo(x, y + size);
      ctx.lineTo(x - size, y);
      ctx.closePath();
      ctx.fill();
    }

    function drawPlus(ctx, x, y, size) {
      const w = size * 0.25;
      ctx.fillRect(x - size * 0.8, y - w, size * 1.6, w * 2);
      ctx.fillRect(x - w, y - size * 0.8, w * 2, size * 1.6);
    }

    function drawWave(ctx, x, y, size) {
      ctx.beginPath();
      for (let i = 0; i <= 20; i++) {
        const angle = (i / 20) * Math.PI * 2;
        const r = size + Math.sin(angle * 4) * size * 0.3;
        const px = x + Math.cos(angle) * r;
        const py = y + Math.sin(angle) * r;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
    }
    
    
    function createBurstEffect(b) {
      const pieces = [
        { type: 'layer', size: 15, color: b.color },
        { type: 'disc', size: 12, color: b.bey.colors[1] || b.color },
        { type: 'driver', size: 10, color: b.bey.colors[2] || b.color }
      ];
      
      pieces.forEach((piece, i) => {
        const angle = (Math.PI * 2 / 3) * i + Math.random() * 0.5;
        const speed = 4 + Math.random() * 3;
        const newPiece = {
          x: b.x,
          y: b.y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          rotation: Math.random() * Math.PI * 2,
          rotationSpeed: (Math.random() - 0.5) * 0.2,
          size: piece.size,
          color: piece.color,
          type: piece.type,
          life: 1,
          gravity: 0.15,
          bounced: false,
          settled: false
        };
        
        gameBrokenPieces.push(newPiece);
      });
      
      // FASE 1: Burst particles — reduced for clarity
      addImpactParticles(b.x, b.y, 14);
      addDebrisParticles(b.x, b.y, b.color, 8);
      addSmokeParticles(b.x, b.y, 5);
      addEnergyParticles(b.x, b.y, b.color, 10);
      addScreenShake(2.5);
      addFlashEffect(b.color, 0.4, 180);
      addParticle(b.x, b.y, '#ffffff', 10);
      addParticle(b.x, b.y, '#fbbf24', 8);
      addShockwave(b.x, b.y, b.color, '#ffffff', 2.2);
    }

    const b1 = {
      x: centerX - 80, y: centerY,
      vx: (((bey1?.effectiveStats?.atk || 10) * 0.8) + 3) * launch1.speedMod * quality1.speedMod,
      vy: (((bey1?.effectiveStats?.atk || 10) * 0.5) + 2) * launch1.speedMod * quality1.speedMod,
      rotation: 0,
      spinSpeed: (8 + (((bey1?.effectiveStats?.spin || 40) * 2.0))) * launch1.spinMod * quality1.spinMod,
      spinDirection: (bey1?.rotation === 'Left') ? -1 : 1,
      stamina: 250,
      hits: 0,
      burstDamage: 0,
      stability: 150,
      radius: 26,
      color: bey1?.color || '#3b82f6',
      bey: bey1 || { 
        name: 'Bey1', 
        type: 'Balance', 
        rotation: 'Right',
        colors: ['#3b82f6', '#ffffff', '#cccccc'],
        effectiveStats: { atk: 10, def: 10, sta: 10, bal: 10, weight: 10, spin: 40 },
        synergies: [],
        breakpoints: []
      },
      alive: true,
      ironWallActive: bey1?.breakpoints?.some(bp => bp?.stat === 'DEF') || false,
      ironWallUsed: false,
      flowerPatternPhase: 0,
      lastRailBoost: 0,
      warpChain: 0,
      lastPortalTime: 0,
      portalCooldown: 0,
      inPortal: false,
      portalBoostFrames: 0,
      portalBoostAngle: 0,
      launchTechnique: md3State.launch1,
      launchPattern: launch1.pattern,
      launchQuality: quality1.key,
      burstRiskMod: launch1.burstRisk * quality1.burstRisk,
      lastStopTime: 0,
      eternalSpinActive: bey1?.breakpoints?.some(bp => bp?.name?.includes('Eternal Spin')) || false,
      eternalSpinTimer: 0,
      hasBladeStorm: (bey1?.stats?.atk || 0) >= 27,
      hasAbsoluteBarrier: (bey1?.stats?.def || 0) >= 27,
      hasGyroLock: (bey1?.stats?.bal || 0) >= 27,
      hasGravityWell: (bey1?.stats?.weight || 0) >= 27,
      hasCelestialRotation: (bey1?.stats?.spin || 0) >= 50,
      armorEffect: bey1?.armor?.effect || null,
      armorBurnStacks: [],
      armorAdaptiveDefense: 0,
      armorVoidPulseTimer: 0,
      stats: {
        maxSpin: (8 + (((bey1?.effectiveStats?.spin || 40) * 2.0))) * launch1.spinMod * quality1.spinMod,
        damageCaused: 0,
        hitsLanded: 0
      },
      tippingAngle: 0,
      isTipping: false,
      tippingSide: Math.random() > 0.5 ? 1 : -1,
      fellOver: false
    };
    
    const b2 = {
      x: centerX + 80, y: centerY,
      vx: -(((bey2?.effectiveStats?.atk || 10) * 0.8) + 3) * launch2.speedMod * quality2.speedMod,
      vy: -(((bey2?.effectiveStats?.atk || 10) * 0.5) + 2) * launch2.speedMod * quality2.speedMod,
      rotation: 0,
      spinSpeed: (8 + (((bey2?.effectiveStats?.spin || 40) * 2.0))) * launch2.spinMod * quality2.spinMod,
      spinDirection: (bey2?.rotation === 'Left') ? -1 : 1,
      stamina: 250,
      hits: 0,
      burstDamage: 0,
      stability: 150,
      radius: 26,
      color: bey2?.color || '#ef4444',
      bey: bey2 || { 
        name: 'Bey2', 
        type: 'Balance', 
        rotation: 'Right',
        colors: ['#ef4444', '#ffffff', '#cccccc'],
        effectiveStats: { atk: 10, def: 10, sta: 10, bal: 10, weight: 10, spin: 40 },
        synergies: [],
        breakpoints: []
      },
      alive: true,
      ironWallActive: bey2?.breakpoints?.some(bp => bp?.stat === 'DEF') || false,
      ironWallUsed: false,
      flowerPatternPhase: 0,
      lastRailBoost: 0,
      warpChain: 0,
      lastPortalTime: 0,
      portalCooldown: 0,
      inPortal: false,
      portalBoostFrames: 0,
      portalBoostAngle: 0,
      launchTechnique: md3State.launch2,
      launchPattern: launch2.pattern,
      launchQuality: quality2.key,
      burstRiskMod: launch2.burstRisk * quality2.burstRisk,
      lastStopTime: 0,
      eternalSpinActive: bey2?.breakpoints?.some(bp => bp?.name?.includes('Eternal Spin')) || false,
      eternalSpinTimer: 0,
      hasBladeStorm: (bey2?.stats?.atk || 0) >= 27,
      hasAbsoluteBarrier: (bey2?.stats?.def || 0) >= 27,
      hasGyroLock: (bey2?.stats?.bal || 0) >= 27,
      hasGravityWell: (bey2?.stats?.weight || 0) >= 27,
      hasCelestialRotation: (bey2?.stats?.spin || 0) >= 50,
      armorEffect: bey2?.armor?.effect || null,
      armorBurnStacks: [],
      armorAdaptiveDefense: 0,
      armorVoidPulseTimer: 0,
      stats: {
        maxSpin: (8 + (((bey2?.effectiveStats?.spin || 40) * 2.0))) * launch2.spinMod * quality2.spinMod,
        damageCaused: 0,
        hitsLanded: 0
      },
      tippingAngle: 0,
      isTipping: false,
      tippingSide: Math.random() > 0.5 ? 1 : -1,
      fellOver: false
    };

    const isOppositeSpin = (b1.spinDirection !== b2.spinDirection);

    let winner = null;
    let winMethod = '';
    let endingTimer = 0;
    let burstDelay = 0;
    let burstTriggered = false;

          function checkCollision() {
      // ═══════════════════════════════════════════════════════════════
      // KNOCKBACK-CENTRIC COMBAT SYSTEM v3.0
      // ═══════════════════════════════════════════════════════════════
      // Design Philosophy: Knockback as the core combat pillar
      // 
      // Key Changes:
      // - Knockback based on impact power vs effective mass
      // - Arena controls energy loss, not collision
      // - Attack creates displacement, Weight anchors, Defense absorbs
      // - Over Finish through positioning, not RNG
      // - No instant amortization after knockback
      // 
      // New Systems:
      // - Impact Power = (ATK * 0.45) * velocity^1.2 * typeMultiplier
      // - Effective Mass = (weight * 1.8) + (spin * 0.12) + (stability * 0.6)
      // - Knockback = (impact / mass) * modifiers, clamped [0.15, 3.5]
      // - Direct velocity application, arena handles deceleration
      // 
      // Expected Results:
      // - Clear type identity in knockback behavior
      // - Positioning becomes tactical
      // - Over Finish through repeated displacement
      // - No one-shots, no immunity
      // ═══════════════════════════════════════════════════════════════
      
      if (!b1 || !b2 || !b1.alive || !b2.alive) return;
      const dx = b2.x - b1.x;
      const dy = b2.y - b1.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance < b1.radius + b2.radius) {
        const angle = Math.atan2(dy, dx);
        
        const impactForce = Math.sqrt(b1.vx * b1.vx + b1.vy * b1.vy) + Math.sqrt(b2.vx * b2.vx + b2.vy * b2.vy);
        const collisionX = (b1.x + b2.x) / 2;
        const collisionY = (b1.y + b2.y) / 2;
        addImpactParticles(collisionX, collisionY, Math.min(10, impactForce * 0.8));
        addSparkParticles(collisionX, collisionY, 6);
        addShockwave(collisionX, collisionY, b1.bey?.colors?.[0] || b1.color, b2.bey?.colors?.[0] || b2.color, Math.min(impactForce / 10, 2.0));
        
          // Screen shake for strong impacts (FASE 1)
          const impactStrength = Math.min(impactForce / 8, 2);
          addScreenShake(impactStrength);
          if (impactStrength > 1.5) {
            addFlashEffect('#ffffff', 0.2, 60);
          }
        if (impactForce > 12) {
          addParticle((b1.x + b2.x) / 2, (b1.y + b2.y) / 2, '#ff0000', 10);
          addParticle((b1.x + b2.x) / 2, (b1.y + b2.y) / 2, '#ffff00', 8);
        }
        
        const collisionForce = impactForce;
        recordEvent('COLLISION', {
          force: collisionForce,
          location: { x: (b1.x + b2.x) / 2, y: (b1.y + b2.y) / 2 }
        });
        
        // Opposite Spin Mechanics
        if (isOppositeSpin) {
          // Spin Equalization - faster loses spin, slower gains
          const spinDiff = Math.abs(b1.spinSpeed - b2.spinSpeed);
          let equalizationRate = 0.15;
          
          recordEvent('SPIN_EQUALIZATION', {
            spinDiff,
            b1Speed: b1.spinSpeed,
            b2Speed: b2.spinSpeed
          });
          
          // Spin Stealer synergy bonus
          const hasSpinStealer1 = b1.bey?.synergies?.some(s => s?.name?.includes('Spin Stealer')) || false;
          const hasSpinStealer2 = b2.bey?.synergies?.some(s => s?.name?.includes('Spin Stealer')) || false;
          
          if (b1.spinSpeed > b2.spinSpeed) {
            const transfer = spinDiff * equalizationRate;
            const gainMultiplier = hasSpinStealer2 ? 1.1 : 0.8;
            b1.spinSpeed -= transfer;
            b2.spinSpeed += transfer * gainMultiplier;
            b2.spinSpeed = Math.min(b2.stats.maxSpin, b2.spinSpeed); // Cap no máximo
            addParticle(b1.x, b1.y, '#ff00ff', 15);
            if (hasSpinStealer2) addParticle(b2.x, b2.y, '#00ffff', 20);
          } else if (b2.spinSpeed > b1.spinSpeed) {
            const transfer = spinDiff * equalizationRate;
            const gainMultiplier = hasSpinStealer1 ? 1.1 : 0.8;
            b2.spinSpeed -= transfer;
            b1.spinSpeed += transfer * gainMultiplier;
            b1.spinSpeed = Math.min(b1.stats.maxSpin, b1.spinSpeed); // Cap no máximo
            addParticle(b2.x, b2.y, '#ff00ff', 15);
            if (hasSpinStealer1) addParticle(b1.x, b1.y, '#00ffff', 20);
          }
        }
        
        // ═══════════════════════════════════════════════════════════════
        // NEW KNOCKBACK SYSTEM - IMPACT POWER vs EFFECTIVE MASS
        // ═══════════════════════════════════════════════════════════════
        
        // Calculate collision velocities
        const velocity1 = Math.sqrt(b1.vx * b1.vx + b1.vy * b1.vy);
        const velocity2 = Math.sqrt(b2.vx * b2.vx + b2.vy * b2.vy);
        
        // Type multipliers for impact power
        const getTypeMultiplier = (type) => {
          if (type === 'Attack') return 1.15;
          if (type === 'Defense' || type === 'Stamina') return 0.9;
          return 1.0; // Balance
        };
        
        const type1Mult = getTypeMultiplier(b1.bey?.type);
        const type2Mult = getTypeMultiplier(b2.bey?.type);
        
        // IMPACT POWER - Attack stat + velocity scaling
        const impactPower1 = 
          ((b1.bey?.effectiveStats?.atk || 10) * 0.45) * 
          Math.pow(velocity1, 1.2) * 
          type1Mult;
        
        const impactPower2 = 
          ((b2.bey?.effectiveStats?.atk || 10) * 0.45) * 
          Math.pow(velocity2, 1.2) * 
          type2Mult;
        
        // EFFECTIVE MASS - Weight, spin, and stability
        const effectiveMass1 = 
          ((b1.bey?.effectiveStats?.weight || 10) * 1.8) + 
          (b1.spinSpeed * 0.12) + 
          (b1.stability * 0.6);
        
        const effectiveMass2 = 
          ((b2.bey?.effectiveStats?.weight || 10) * 1.8) + 
          (b2.spinSpeed * 0.12) + 
          (b2.stability * 0.6);
        
        // ═══════════════════════════════════════════════════════════════
        // SOLUÇÃO 2: WEIGHT DIFFERENTIAL AMPLIFIER
        // ═══════════════════════════════════════════════════════════════
        // Calcula proporção de peso para amplificar diferenças
        const weightRatio12 = effectiveMass2 / effectiveMass1; // quanto b2 é mais pesado que b1
        const weightRatio21 = effectiveMass1 / effectiveMass2; // quanto b1 é mais pesado que b2
        
        // Legacy force variables for damage calculations (unchanged)
        let force1 = (b1.bey?.effectiveStats?.atk || 10) * 0.5;
        let force2 = (b2.bey?.effectiveStats?.atk || 10) * 0.5;
        
        // Attack types hit harder
        if (b1.bey?.type === 'Attack') force1 *= 1.25;
        if (b2.bey?.type === 'Attack') force2 *= 1.25;
        
        // Height interactions
        const heightDiff = (b1.bey?.height || 70) - (b2.bey?.height || 70);
        if (Math.abs(heightDiff) >= 10) {
          if (heightDiff < 0) { // b1 is lower
            force1 *= 1.15; // Low hits from below bonus
            addParticle(b1.x, b1.y, '#ffa500', 10);
          } else { // b2 is lower
            force2 *= 1.15;
            addParticle(b2.x, b2.y, '#ffa500', 10);
          }
        }
        
        // Momentum synergy
        const hasMomentum1 = b1.bey?.synergies?.some(s => s?.name?.includes('Momentum')) || false;
        const hasMomentum2 = b2.bey?.synergies?.some(s => s?.name?.includes('Momentum')) || false;
        
        if (hasMomentum1) force1 *= (1 + velocity1 * 0.1);
        if (hasMomentum2) force2 *= (1 + velocity2 * 0.1);
        
        // Smash Attack (ATK breakpoint at 15+)
        const hasSmash1 = b1.bey?.breakpoints?.some(bp => bp?.stat === 'ATK') || false;
        const hasSmash2 = b2.bey?.breakpoints?.some(bp => bp?.stat === 'ATK') || false;
        if (hasSmash1 && velocity1 > 8) {
          force1 *= 2;
          addParticle(b1.x, b1.y, '#ff0000', 30);
          recordEvent('SMASH_ATTACK', { bey: 'b1', damage: force1 });
        }
        if (hasSmash2 && velocity2 > 8) {
          force2 *= 2;
          addParticle(b2.x, b2.y, '#ff0000', 30);
          recordEvent('SMASH_ATTACK', { bey: 'b2', damage: force2 });
        }
        
        // Precision (BAL synergy)
        const hasPrecision1 = b1.bey?.synergies?.some(s => s?.name?.includes('Precision')) || false;
        const hasPrecision2 = b2.bey?.synergies?.some(s => s?.name?.includes('Precision')) || false;
        if (hasPrecision1 && Math.random() < 0.15) {
          force1 *= 1.5;
          addParticle(b1.x, b1.y, '#fbbf24', 25);
        }
        if (hasPrecision2 && Math.random() < 0.15) {
          force2 *= 1.5;
          addParticle(b2.x, b2.y, '#fbbf24', 25);
        }
        
        // ═══════════════════════════════════════════════════════════════
        // KNOCKBACK CALCULATION - Core Combat System
        // ═══════════════════════════════════════════════════════════════
        
        // Base knockback from impact/mass ratio
        // v3.3: MULTIPLICADOR 5X para knockback dramático!
        let knockback1 = (impactPower2 / effectiveMass1) * 5.0;
        let knockback2 = (impactPower1 / effectiveMass2) * 5.0;
        
        // ═══════════════════════════════════════════════════════════════
        // SOLUÇÃO 2: TYPE-SPECIFIC KNOCKBACK MODIFIERS
        // ═══════════════════════════════════════════════════════════════
        
        // ATTACK TYPE - Hit harder but also get knocked back more (high risk, high reward)
        if (b1.bey?.type === 'Attack') {
          knockback2 *= 1.5; // Attack empurra 50% mais
          knockback1 *= 1.2; // Attack também sofre 20% mais recoil
        }
        if (b2.bey?.type === 'Attack') {
          knockback1 *= 1.5;
          knockback2 *= 1.2;
        }
        
        // STAMINA TYPE - Anchors to arena when moving slowly
        if (b1.bey?.type === 'Stamina') {
          const staminaGrip = 1 - (velocity1 / 15); // mais grip quando lento
          knockback1 *= Math.max(0.4, staminaGrip); // reduz até 60% do knockback
          if (velocity1 < 3) addParticle(b1.x, b1.y, '#00ff88', 15);
        }
        if (b2.bey?.type === 'Stamina') {
          const staminaGrip = 1 - (velocity2 / 15);
          knockback2 *= Math.max(0.4, staminaGrip);
          if (velocity2 < 3) addParticle(b2.x, b2.y, '#00ff88', 15);
        }
        
        // WEIGHT DIFFERENTIAL AMPLIFIER - Dramatiza diferença leve vs pesado
        if (weightRatio12 > 1.25) {
          // b2 é 25%+ mais pesado que b1 - b1 sofre MUITO mais knockback
          const amplifier = Math.pow(weightRatio12, 0.8);
          knockback1 *= amplifier;
          addParticle(b1.x, b1.y, '#ff6600', 25);
          recordEvent('WEIGHT_ADVANTAGE', {
            heavier: 'b2',
            lighter: 'b1',
            ratio: weightRatio12,
            amplifier: amplifier
          });
        } else if (weightRatio21 > 1.25) {
          // b1 é 25%+ mais pesado que b2
          const amplifier = Math.pow(weightRatio21, 0.8);
          knockback2 *= amplifier;
          addParticle(b2.x, b2.y, '#ff6600', 25);
          recordEvent('WEIGHT_ADVANTAGE', {
            heavier: 'b1',
            lighter: 'b2',
            ratio: weightRatio21,
            amplifier: amplifier
          });
        }
        
        // Arena modifiers (slight variations by arena type)
        const arenaModifier = arenaType === 'COLOSSEUM_CARNAGE' ? 1.15 : 
                              arenaType === 'NEXUS' ? 1.1 : 
                              1.0;
        
        knockback1 *= arenaModifier;
        knockback2 *= arenaModifier;
        
        // Type matchup modifiers
        if (b1.bey?.type === 'Defense') {
          const defReduction = Math.min((b1.bey?.effectiveStats?.def || 10) * 0.015, 0.4);
          knockback1 *= (1 - defReduction);
        }
        if (b2.bey?.type === 'Defense') {
          const defReduction = Math.min((b2.bey?.effectiveStats?.def || 10) * 0.015, 0.4);
          knockback2 *= (1 - defReduction);
        }
        
        // GYRO LOCK (BAL 27+) - Severe knockback reduction, not immunity
        if (b1.hasGyroLock) {
          knockback1 *= 0.35; // 65% reduction
          addParticle(b1.x, b1.y, '#8b5cf6', 15);
        }
        if (b2.hasGyroLock) {
          knockback2 *= 0.35;
          addParticle(b2.x, b2.y, '#8b5cf6', 15);
        }
        
        // VOLCANIC_RAGE WELL (WEIGHT 27+) - Fixed 30% reduction, not immunity
        if (b1.hasGravityWell) {
          knockback1 *= 0.70; // 30% reduction
          addParticle(b1.x, b1.y, '#8b008b', 12);
        }
        if (b2.hasGravityWell) {
          knockback2 *= 0.70;
          addParticle(b2.x, b2.y, '#8b008b', 12);
        }
        
        // Heavy Hitter synergy
        const hasHeavyHitter1 = b1.bey?.synergies?.some(s => s?.name?.includes('Heavy Hitter')) || false;
        const hasHeavyHitter2 = b2.bey?.synergies?.some(s => s?.name?.includes('Heavy Hitter')) || false;
        if (hasHeavyHitter1) knockback2 *= 1.25;
        if (hasHeavyHitter2) knockback1 *= 1.25;
        
        // Heavy Impact breakpoint (WEIGHT 15+)
        const hasHeavyImpact1 = b1.bey?.breakpoints?.some(bp => bp?.stat === 'WEIGHT') || false;
        const hasHeavyImpact2 = b2.bey?.breakpoints?.some(bp => bp?.stat === 'WEIGHT') || false;
        if (hasHeavyImpact1) {
          b2.burstDamage += 1.5;
          // Micro-stun effect - brief velocity reduction
          b2.vx *= 0.85;
          b2.vy *= 0.85;
        }
        if (hasHeavyImpact2) {
          b1.burstDamage += 1.5;
          b1.vx *= 0.85;
          b1.vy *= 0.85;
        }
        
        // Balance type converts knockback to rotational displacement
        // SOLUÇÃO 2: Anti-knockback quando girando rápido
        if (b1.bey?.type === 'Balance') {
          const spinPercent = b1.spinSpeed / b1.stats.maxSpin;
          const balanceFactor = (b1.bey?.effectiveStats?.bal || 10) * 0.02;
          
          // Alta rotação = converte knockback em spin e reduz knockback linear
          if (spinPercent > 0.5) {
            b1.rotation += knockback1 * balanceFactor * 3;
            knockback1 *= (0.5 + (1 - spinPercent) * 0.5); // reduz até 50% quando spin = 100%
            addParticle(b1.x, b1.y, '#fbbf24', 20);
          } else {
            b1.rotation += knockback1 * balanceFactor;
            knockback1 *= 0.85; // Slightly reduced linear knockback
          }
        }
        if (b2.bey?.type === 'Balance') {
          const spinPercent = b2.spinSpeed / b2.stats.maxSpin;
          const balanceFactor = (b2.bey?.effectiveStats?.bal || 10) * 0.02;
          
          if (spinPercent > 0.5) {
            b2.rotation += knockback2 * balanceFactor * 3;
            knockback2 *= (0.5 + (1 - spinPercent) * 0.5);
            addParticle(b2.x, b2.y, '#fbbf24', 20);
          } else {
            b2.rotation += knockback2 * balanceFactor;
            knockback2 *= 0.85;
          }
        }
        
        // MANDATORY CLAMP - v3.3: Aumentado para permitir knockbacks dramáticos!
        // ANTES: 0.25-6.0 | AGORA: 1.0-60.0 (10x maior!)
        knockback1 = Math.max(1.0, Math.min(60.0, knockback1));
        knockback2 = Math.max(1.0, Math.min(60.0, knockback2));
        
        // ═══════════════════════════════════════════════════════════════
        // APPLY KNOCKBACK - Direct velocity modification
        // ═══════════════════════════════════════════════════════════════
        // v3.3: DAMPING REMOVIDO! Aplicação direta de knockback com 1.2x boost!
        // ANTES: 0.85 damping | AGORA: 1.2 boost!
        
        b1.vx -= Math.cos(angle) * knockback1 * 1.2;
        b1.vy -= Math.sin(angle) * knockback1 * 1.2;
        b2.vx += Math.cos(angle) * knockback2 * 1.2;
        b2.vy += Math.sin(angle) * knockback2 * 0.85;
        
        // ═══════════════════════════════════════════════════════════════
        // v3.5-HÍBRIDO: COOLDOWN TEMPORAL
        // ═══════════════════════════════════════════════════════════════
        // Desabilita gravidade por 30 frames (0.5s) após colisão
        // Permite knockback se expressar COMPLETAMENTE antes da gravidade agir!
        const currentFrame = Math.floor(Date.now() / 16.67);  // ~60fps
        const COOLDOWN_FRAMES = 30;  // 0.5 segundos
        
        b1.gravityDisabledUntil = currentFrame + COOLDOWN_FRAMES;
        b2.gravityDisabledUntil = currentFrame + COOLDOWN_FRAMES;
        // ═══════════════════════════════════════════════════════════════
        
        // Warp Chain bonus (NEXUS arena)
        if (arenaType === 'NEXUS') {
          if (b1.warpChain >= 2) {
            force1 *= (1 + (b1.warpChain * 0.25));
            addParticle(b1.x, b1.y, '#ff00ff', 20);
            recordEvent('WARP_CHAIN_BONUS', {
              bey: 'b1',
              chain: b1.warpChain,
              damageMultiplier: (1 + (b1.warpChain * 0.25))
            });
            b1.warpChain = 0; // Reset after use
          }
          if (b2.warpChain >= 2) {
            force2 *= (1 + (b2.warpChain * 0.25));
            addParticle(b2.x, b2.y, '#ff00ff', 20);
            recordEvent('WARP_CHAIN_BONUS', {
              bey: 'b2',
              chain: b2.warpChain,
              damageMultiplier: (1 + (b2.warpChain * 0.25))
            });
            b2.warpChain = 0; // Reset after use
          }
        }
        
        // Ricochet Combo bonus (PINBALL_INFERNO arena)
        if (arenaType === 'PINBALL_INFERNO' && ARENA.ricochetCombo) {
          const combo1 = Math.floor(ARENA.ricochetCombo.bey1Combo);
          const combo2 = Math.floor(ARENA.ricochetCombo.bey2Combo);
          
          if (combo1 >= 2) {
            const comboMultiplier = 1 + (combo1 * 0.20); // +20% per combo hit
            force1 *= comboMultiplier;
            addParticle(b1.x, b1.y, '#ff0000', 25);
            recordEvent('RICOCHET_COMBO_BONUS', {
              bey: 'b1',
              combo: combo1,
              damageMultiplier: comboMultiplier
            });
            ARENA.ricochetCombo.bey1Combo *= 0.5; // Reduce combo after use
          }
          if (combo2 >= 2) {
            const comboMultiplier = 1 + (combo2 * 0.20); // +20% per combo hit
            force2 *= comboMultiplier;
            addParticle(b2.x, b2.y, '#ff0000', 25);
            recordEvent('RICOCHET_COMBO_BONUS', {
              bey: 'b2',
              combo: combo2,
              damageMultiplier: comboMultiplier
            });
            ARENA.ricochetCombo.bey2Combo *= 0.5; // Reduce combo after use
          }
        }
        
        // Vortex Burst bonus (VORTEX_COLISEUM arena)
        if (arenaType === 'VORTEX_COLISEUM' && ARENA.momentum) {
          const stacks1 = Math.floor(ARENA.momentum.bey1Stacks);
          const stacks2 = Math.floor(ARENA.momentum.bey2Stacks);
          
          if (stacks1 >= 3) {
            const burstMultiplier = 1 + (stacks1 * 0.3); // +30% per stack
            force1 *= burstMultiplier;
            addParticle(b1.x, b1.y, '#c084fc', 30);
            addParticle(b1.x, b1.y, '#fbbf24', 20);
            recordEvent('VORTEX_BURST', {
              bey: 'b1',
              stacks: stacks1,
              damageMultiplier: burstMultiplier
            });
            ARENA.momentum.bey1Stacks = 0; // Reset after burst
          }
          if (stacks2 >= 3) {
            const burstMultiplier = 1 + (stacks2 * 0.3); // +30% per stack
            force2 *= burstMultiplier;
            addParticle(b2.x, b2.y, '#c084fc', 30);
            addParticle(b2.x, b2.y, '#fbbf24', 20);
            recordEvent('VORTEX_BURST', {
              bey: 'b2',
              stacks: stacks2,
              damageMultiplier: burstMultiplier
            });
            ARENA.momentum.bey2Stacks = 0; // Reset after burst
          }
        }

        // Separation force - prevent beyblades from overlapping
        // SOLUÇÃO 2: aumentado de 1.2 para 2.5 (beyblades "bounceam")
        const separationForce = 2.5;
        b1.x -= Math.cos(angle) * separationForce;
        b1.y -= Math.sin(angle) * separationForce;
        b2.x += Math.cos(angle) * separationForce;
        b2.y += Math.sin(angle) * separationForce;
        
        // ═══════════════════════════════════════════════════════════════
        // STAMINA DAMAGE - Separate from knockback
        // ═══════════════════════════════════════════════════════════════
        // SOLUÇÃO 2: Reduzido multiplicador de 2.0 para 1.4 e defesa de 0.6 para 0.75
        let damage1 = Math.max(0.8, (force2 - (b1.bey?.effectiveStats?.def || 10) * 0.75) * 1.4);
        let damage2 = Math.max(0.8, (force1 - (b2.bey?.effectiveStats?.def || 10) * 0.75) * 1.4);
        
        if (force2 > 15) damage1 *= 1.5;
        if (force1 > 15) damage2 *= 1.5;
        
        // ═══════════════════════════════════════════════════════════════
        // SOLUÇÃO 2: WEIGHT EFFICIENCY - Heavy beyblades lose less stamina
        // ═══════════════════════════════════════════════════════════════
        const weight1 = (b1.bey?.effectiveStats?.weight || 10);
        const weight2 = (b2.bey?.effectiveStats?.weight || 10);
        
        const weightEfficiency1 = 1 - (weight1 / 40); // weight 20 = 50% efficiency
        const weightEfficiency2 = 1 - (weight2 / 40);
        
        damage1 *= (0.7 + weightEfficiency1 * 0.6); // peso reduz damage até 40%
        damage2 *= (0.7 + weightEfficiency2 * 0.6);
        
        // Recoil damage for Attack types - they hit hard but take damage too
        if (b1.bey?.type === 'Attack') {
          const recoilDamage = force1 * 0.25;
          damage1 += recoilDamage;
          b1.burstDamage += force1 * 0.03;
          addParticle(b1.x, b1.y, '#ff6600', 8);
        }
        if (b2.bey?.type === 'Attack') {
          const recoilDamage = force2 * 0.25;
          damage2 += recoilDamage;
          b2.burstDamage += force2 * 0.03;
          addParticle(b2.x, b2.y, '#ff6600', 8);
        }
        
        const hasFortress1 = b1.bey?.synergies?.some(s => s?.name?.includes('Fortress')) || false;
        const hasFortress2 = b2.bey?.synergies?.some(s => s?.name?.includes('Fortress')) || false;
        if (hasFortress1) damage1 *= 0.6;
        if (hasFortress2) damage2 *= 0.6;
        
        // ABSOLUTE BARRIER (DEF 27+) - Reduz TODO dano em 60%
        if (b1.hasAbsoluteBarrier) {
          damage1 *= 0.4;
          addParticle(b1.x, b1.y, '#00ffff', 20);
        }
        if (b2.hasAbsoluteBarrier) {
          damage2 *= 0.4;
          addParticle(b2.x, b2.y, '#00ffff', 20);
        }
        
        if (b1.ironWallActive && !b1.ironWallUsed) {
          damage1 = 0;
          b1.ironWallUsed = true;
          addParticle(b1.x, b1.y, '#3b82f6', 40);
        }
        if (b2.ironWallActive && !b2.ironWallUsed) {
          damage2 = 0;
          b2.ironWallUsed = true;
          addParticle(b2.x, b2.y, '#3b82f6', 40);
        }
        
        b1.stamina -= damage1;
        b2.stamina -= damage2;
        
        // ✨ PREMIUM IMPACT EFFECTS
        if (impactEffectsRef.current && particleSystemRef.current) {
          const impactX = (b1.x + b2.x) / 2;
          const impactY = (b1.y + b2.y) / 2;
          const velocity1 = Math.sqrt(b1.vx ** 2 + b1.vy ** 2);
          const velocity2 = Math.sqrt(b2.vx ** 2 + b2.vy ** 2);
          const impactForce = (velocity1 + velocity2) / 2;
          
          // Shockwave para impactos fortes
          if (impactForce > 3) {
            impactEffectsRef.current.createShockwave(impactX, impactY, Math.min(impactForce / 10, 2));
          }
          
          // Partículas coloridas
          particleSystemRef.current.emit({
            x: impactX,
            y: impactY,
            count: Math.floor(Math.min(impactForce * 3, 30)),
            speed: 6,
            size: 3,
            color: impactForce > 5 ? '#ff3300' : '#ffaa00',
            lifetime: 0.5,
            glow: true,
            glowIntensity: 12,
            spread: 10,
          });
        }
        
        // SPIN LOSS ON IMPACT
        const spinLoss1 = (force2 / 15) * (1 - (b1.bey?.effectiveStats?.spin || 40) / 60);
        const spinLoss2 = (force1 / 15) * (1 - (b2.bey?.effectiveStats?.spin || 40) / 60);
        
        b1.spinSpeed -= spinLoss1;
        b2.spinSpeed -= spinLoss2;
        
        // Strong impacts cause massive spin loss
        if (velocity1 > 10 || velocity2 > 10) {
          b1.spinSpeed *= 0.97;
          b2.spinSpeed *= 0.97;
          addParticle(b1.x, b1.y, '#ff0000', 15);
          addParticle(b2.x, b2.y, '#ff0000', 15);
        }
        
        // BASE BURST DAMAGE - increased significantly
        let burstDamage1 = force2 * 0.08 * b1.burstRiskMod;
        let burstDamage2 = force1 * 0.08 * b2.burstRiskMod;
        
        // CRITICAL HIT SYSTEM - chance based on conditions
        const collisionVelocity1 = Math.sqrt(b1.vx * b1.vx + b1.vy * b1.vy);
        const collisionVelocity2 = Math.sqrt(b2.vx * b2.vx + b2.vy * b2.vy);
        
        let criticalHit1 = false;
        let criticalHit2 = false;
        
        // Critical conditions for b1 hitting b2
        if (b1.bey?.type === 'Attack' && collisionVelocity1 > 7) {
          // Attack type at high speed = 30% critical chance
          if (Math.random() < 0.30) {
            criticalHit1 = true;
            burstDamage2 *= 2.0;
            addParticle(b2.x, b2.y, '#ff0000', 14);
            addParticle(b2.x, b2.y, '#ffff00', 10);
            addShockwave(b2.x, b2.y, '#ff0000', '#ffff00', 1.8);
            recordEvent('CRITICAL_BURST_HIT', { 
              attacker: 'b1', 
              victim: 'b2',
              damage: burstDamage2,
              reason: 'Attack High Speed'
            });
            addEvent('CRITICAL_HIT', `${bey1.name} - CRITICAL HIT!`, `${Math.round(burstDamage2)} damage`);
          }
        }
        
        // Critical conditions for b2 hitting b1
        if (b2.bey?.type === 'Attack' && collisionVelocity2 > 7) {
          if (Math.random() < 0.30) {
            criticalHit2 = true;
            burstDamage1 *= 2.0;
            addParticle(b1.x, b1.y, '#ff0000', 14);
            addParticle(b1.x, b1.y, '#ffff00', 10);
            addShockwave(b1.x, b1.y, '#ff0000', '#ffff00', 1.8);
            recordEvent('CRITICAL_BURST_HIT', { 
              attacker: 'b2', 
              victim: 'b1',
              damage: burstDamage1,
              reason: 'Attack High Speed'
            });
            addEvent('CRITICAL_HIT', `${bey2.name} - CRITICAL HIT!`, `${Math.round(burstDamage1)} damage`);
          }
        }
        
        // Heavy Impact Critical (High weight + high speed)
        if (!criticalHit1 && (b1.bey?.effectiveStats?.weight || 10) >= 14 && collisionVelocity1 > 6) {
          if (Math.random() < 0.25) {
            criticalHit1 = true;
            burstDamage2 *= 1.6;
            addParticle(b2.x, b2.y, '#8b4513', 12);
            recordEvent('CRITICAL_BURST_HIT', { 
              attacker: 'b1', 
              victim: 'b2',
              damage: burstDamage2,
              reason: 'Heavy Impact'
            });
          }
        }
        
        if (!criticalHit2 && (b2.bey?.effectiveStats?.weight || 10) >= 14 && collisionVelocity2 > 6) {
          if (Math.random() < 0.25) {
            criticalHit2 = true;
            burstDamage1 *= 1.6;
            addParticle(b1.x, b1.y, '#8b4513', 12);
            recordEvent('CRITICAL_BURST_HIT', { 
              attacker: 'b2', 
              victim: 'b1',
              damage: burstDamage1,
              reason: 'Heavy Impact'
            });
          }
        }
        
        // Vulnerability multipliers - low balance = easier to burst
        if ((b1.bey?.effectiveStats?.bal || 10) < 9) {
          burstDamage1 *= 1.5;
          if (Math.random() < 0.02) addParticle(b1.x, b1.y, '#ff6600', 8);
        }
        if ((b2.bey?.effectiveStats?.bal || 10) < 9) {
          burstDamage2 *= 1.5;
          if (Math.random() < 0.02) addParticle(b2.x, b2.y, '#ff6600', 8);
        }
        
        // Height difference critical - under/upper attack
        if (Math.abs(heightDiff) >= 12) {
          if (heightDiff < 0 && collisionVelocity1 > 5) {
            // b1 is lower - under attack critical
            if (Math.random() < 0.20) {
              burstDamage2 *= 1.8;
              addParticle(b2.x, b2.y, '#00ffff', 30);
              recordEvent('CRITICAL_BURST_HIT', { 
                attacker: 'b1', 
                victim: 'b2',
                damage: burstDamage2,
                reason: 'Under Attack'
              });
            }
          } else if (heightDiff > 0 && collisionVelocity2 > 5) {
            // b2 is lower
            if (Math.random() < 0.20) {
              burstDamage1 *= 1.8;
              addParticle(b1.x, b1.y, '#00ffff', 30);
              recordEvent('CRITICAL_BURST_HIT', { 
                attacker: 'b2', 
                victim: 'b1',
                damage: burstDamage1,
                reason: 'Under Attack'
              });
            }
          }
        }
        
        // Type matchup burst bonus
        if (b1.bey?.type === 'Attack' && b2.bey?.type === 'Stamina') {
          burstDamage2 *= 1.3; // Attack destroys Stamina
        }
        if (b2.bey?.type === 'Attack' && b1.bey?.type === 'Stamina') {
          burstDamage1 *= 1.3;
        }
        
        // Apply burst damage
        b1.burstDamage += burstDamage1;
        b2.burstDamage += burstDamage2;
        
        // Record significant burst damage
        if (burstDamage1 > 8) {
          recordEvent('CRITICAL_BURST_DAMAGE', { bey: 'b1', damage: burstDamage1, total: b1.burstDamage });
        }
        if (burstDamage2 > 8) {
          recordEvent('CRITICAL_BURST_DAMAGE', { bey: 'b2', damage: burstDamage2, total: b2.burstDamage });
        }
        
        // Clamp stability
        b1.stability = Math.max(0, b1.stability);
        b2.stability = Math.max(0, b2.stability);
        
        if (damage1 > 8) addParticle(b1.x, b1.y, '#ff9900', 7);
        if (damage2 > 8) addParticle(b2.x, b2.y, '#ff9900', 7);
        
        b1.hits++;
        b2.hits++;
        b1.stats.hitsLanded++;
        b2.stats.hitsLanded++;
        b1.stats.damageCaused += damage2;
        b2.stats.damageCaused += damage1;
        
        // BLADE STORM (ATK 27+) - 40% chance de hit duplo
        if (b1.hasBladeStorm && Math.random() < 0.40) {
          b2.stamina -= damage2 * 0.5;
          b2.burstDamage += burstDamage2 * 0.5;
          addParticle(b2.x, b2.y, '#ff0000', 10);
          addParticle(b2.x, b2.y, '#ffff00', 8);
          recordEvent('BLADE_STORM', { attacker: 'b1', bonusDamage: damage2 * 0.5 });
        }
        if (b2.hasBladeStorm && Math.random() < 0.40) {
          b1.stamina -= damage1 * 0.5;
          b1.burstDamage += burstDamage1 * 0.5;
          addParticle(b1.x, b1.y, '#ff0000', 10);
          addParticle(b1.x, b1.y, '#ffff00', 8);
          recordEvent('BLADE_STORM', { attacker: 'b2', bonusDamage: damage1 * 0.5 });
        }
        
        // STABILITY DAMAGE - Impacts destabilize significantly
        const balanceResistance1 = (b1.bey?.effectiveStats?.bal || 10) / 20;
        const balanceResistance2 = (b2.bey?.effectiveStats?.bal || 10) / 20;
        
        // Base stability loss from impact force
        let stabilityLoss1 = force2 * 0.04 * (1 - Math.min((b1.bey?.effectiveStats?.bal || 10) * 0.02, 0.4));
        let stabilityLoss2 = force1 * 0.04 * (1 - Math.min((b2.bey?.effectiveStats?.bal || 10) * 0.02, 0.4));
        
        // High velocity impacts cause extra destabilization
        if (velocity1 > 7) stabilityLoss2 *= 1.6;
        if (velocity2 > 7) stabilityLoss1 *= 1.6;
        
        // Perfect Balance breakpoint reduces stability loss
        const hasPerfectBalance1 = b1.bey?.breakpoints?.some(bp => bp?.stat === 'BAL') || false;
        const hasPerfectBalance2 = b2.bey?.breakpoints?.some(bp => bp?.stat === 'BAL') || false;
        
        if (hasPerfectBalance1) stabilityLoss1 *= 0.3;
        if (hasPerfectBalance2) stabilityLoss2 *= 0.3;
        
        // GYRO LOCK (BAL 27+) - Estabilidade FIXA (não perde)
        if (b1.hasGyroLock) stabilityLoss1 = 0;
        if (b2.hasGyroLock) stabilityLoss2 = 0;
        
        // Apply stability loss and mark hit time for recovery system
        b1.stability -= stabilityLoss1;
        b2.stability -= stabilityLoss2;
        b1.lastHitTime = Date.now();
        b2.lastHitTime = Date.now();
        
        // Clamp to valid range (will be re-clamped against dynamic cap later)
        b1.stability = Math.max(0, b1.stability);
        b2.stability = Math.max(0, b2.stability);
      }
    }

    // Helper function to ensure finite values for gradients
    function ensureFinite(value, defaultValue = 0) {
      return (typeof value === 'number' && isFinite(value)) ? value : defaultValue;
    }
    
    function drawArmorVisual(ctx, b) {
      const armor = b.bey.armor;
      if (!armor) return;
      
      // Validate coordinates
      if (!isFinite(b.x) || !isFinite(b.y) || !isFinite(b.radius)) {
        return;
      }
      
      ctx.save();
      ctx.translate(b.x, b.y);
      
      const armorRadius = b.radius + 5;
      const time = Date.now() * 0.001;
      
      switch(armor.visual) {
        case 'chains':
          // Rotating chains
          ctx.strokeStyle = armor.color;
          ctx.lineWidth = 2;
          for (let i = 0; i < 6; i++) {
            const angle = (Math.PI * 2 / 6) * i + time;
            ctx.beginPath();
            ctx.arc(0, 0, armorRadius, angle - 0.2, angle + 0.2);
            ctx.stroke();
          }
          break;
          
        case 'spikes':
          // Sharp spikes radiating outward
          ctx.strokeStyle = armor.color;
          ctx.lineWidth = 3;
          for (let i = 0; i < 8; i++) {
            const angle = (Math.PI * 2 / 8) * i;
            const x1 = Math.cos(angle) * b.radius;
            const y1 = Math.sin(angle) * b.radius;
            const x2 = Math.cos(angle) * (armorRadius + 6);
            const y2 = Math.sin(angle) * (armorRadius + 6);
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
          }
          break;
          
        case 'ring':
          // Protective ring
          ctx.strokeStyle = armor.color;
          ctx.lineWidth = 4;
          ctx.globalAlpha = 0.6;
          ctx.beginPath();
          ctx.arc(0, 0, armorRadius, 0, Math.PI * 2);
          ctx.stroke();
          ctx.globalAlpha = 1;
          break;
          
        case 'feather':
          // Light feather particles
          ctx.fillStyle = armor.color;
          ctx.globalAlpha = 0.4;
          for (let i = 0; i < 8; i++) {
            const angle = (Math.PI * 2 / 8) * i + time * 2;
            const x = Math.cos(angle) * armorRadius;
            const y = Math.sin(angle) * armorRadius;
            ctx.beginPath();
            ctx.arc(x, y, 2, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.globalAlpha = 1;
          break;
          
        case 'flames':
          // Fire aura
          ctx.fillStyle = armor.color;
          ctx.globalAlpha = 0.5;
          for (let i = 0; i < 6; i++) {
            const angle = (Math.PI * 2 / 6) * i + time * 3;
            const flameSize = 3 + Math.sin(time * 5 + i) * 2;
            const x = Math.cos(angle) * armorRadius;
            const y = Math.sin(angle) * armorRadius;
            ctx.beginPath();
            ctx.arc(x, y, flameSize, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.globalAlpha = 1;
          break;
          
        case 'ice':
          // Ice crystals
          ctx.strokeStyle = armor.color;
          ctx.lineWidth = 2;
          ctx.globalAlpha = 0.7;
          for (let i = 0; i < 6; i++) {
            const angle = (Math.PI * 2 / 6) * i;
            const x = Math.cos(angle) * armorRadius;
            const y = Math.sin(angle) * armorRadius;
            ctx.beginPath();
            ctx.moveTo(x - 3, y);
            ctx.lineTo(x + 3, y);
            ctx.moveTo(x, y - 3);
            ctx.lineTo(x, y + 3);
            ctx.stroke();
          }
          ctx.globalAlpha = 1;
          break;
          
        case 'lightning':
          // Electric arcs
          ctx.strokeStyle = armor.color;
          ctx.lineWidth = 1;
          ctx.globalAlpha = 0.8;
          for (let i = 0; i < 4; i++) {
            const angle = (Math.PI * 2 / 4) * i + time * 4;
            const x1 = Math.cos(angle) * b.radius;
            const y1 = Math.sin(angle) * b.radius;
            const x2 = Math.cos(angle + 0.5) * armorRadius;
            const y2 = Math.sin(angle + 0.5) * armorRadius;
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
          }
          ctx.globalAlpha = 1;
          break;
          
                  case 'shadow':
          // Dark aura
          const shadowGrad = ctx.createRadialGradient(0, 0, ensureFinite(b.radius), 0, 0, ensureFinite(armorRadius + 8));
          shadowGrad.addColorStop(0, 'transparent');
          shadowGrad.addColorStop(1, armor.color + '60');
          ctx.fillStyle = shadowGrad;
          ctx.beginPath();
          ctx.arc(0, 0, ensureFinite(armorRadius + 8), 0, Math.PI * 2);
          ctx.fill();
          break;
          
        case 'gravity':
          // Gravity waves
          ctx.strokeStyle = armor.color;
          ctx.lineWidth = 2;
          ctx.globalAlpha = 0.3;
          for (let r = 0; r < 3; r++) {
            const radius = armorRadius + r * 6 + Math.sin(time * 2 + r) * 2;
            ctx.beginPath();
            ctx.arc(0, 0, radius, 0, Math.PI * 2);
            ctx.stroke();
          }
          ctx.globalAlpha = 1;
          break;
          
        case 'vortex':
          // Swirling wind
          ctx.strokeStyle = armor.color;
          ctx.lineWidth = 2;
          ctx.globalAlpha = 0.5;
          for (let i = 0; i < 3; i++) {
            const startAngle = time * 3 + (Math.PI * 2 / 3) * i;
            ctx.beginPath();
            ctx.arc(0, 0, armorRadius, startAngle, startAngle + 1);
            ctx.stroke();
          }
          ctx.globalAlpha = 1;
          break;
          
        case 'magnet':
          // North/South poles
          ctx.fillStyle = '#ff0000';
          ctx.beginPath();
          ctx.arc(0, -armorRadius, 4, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#0000ff';
          ctx.beginPath();
          ctx.arc(0, armorRadius, 4, 0, Math.PI * 2);
          ctx.fill();
          break;
          
        case 'blades':
          // Spinning blades
          ctx.strokeStyle = armor.color;
          ctx.lineWidth = 3;
          for (let i = 0; i < 4; i++) {
            const angle = (Math.PI * 2 / 4) * i + time * 5;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(Math.cos(angle) * (armorRadius + 8), Math.sin(angle) * (armorRadius + 8));
            ctx.stroke();
          }
          break;
          
        case 'rubber':
          // Rubber dots
          ctx.fillStyle = armor.color;
          for (let i = 0; i < 12; i++) {
            const angle = (Math.PI * 2 / 12) * i;
            const x = Math.cos(angle) * armorRadius;
            const y = Math.sin(angle) * armorRadius;
            ctx.beginPath();
            ctx.arc(x, y, 2, 0, Math.PI * 2);
            ctx.fill();
          }
          break;
          
        case 'crystal':
          // Crystalline structure
          ctx.strokeStyle = armor.color;
          ctx.lineWidth = 2;
          ctx.globalAlpha = 0.6;
          for (let i = 0; i < 6; i++) {
            const angle = (Math.PI * 2 / 6) * i;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(Math.cos(angle) * armorRadius, Math.sin(angle) * armorRadius);
            ctx.stroke();
          }
          ctx.globalAlpha = 1;
          break;
          
        case 'void':
          // Void distortion
          ctx.strokeStyle = armor.color;
          ctx.lineWidth = 3;
          ctx.globalAlpha = 0.4;
          const voidRadius = armorRadius + Math.sin(time * 4) * 3;
          ctx.beginPath();
          ctx.arc(0, 0, voidRadius, 0, Math.PI * 2);
          ctx.stroke();
          ctx.globalAlpha = 1;
          break;
          
        case 'solar':
          // Sun rays
          ctx.strokeStyle = armor.color;
          ctx.lineWidth = 2;
          ctx.globalAlpha = 0.7;
          for (let i = 0; i < 12; i++) {
            const angle = (Math.PI * 2 / 12) * i + time;
            const length = 4 + Math.sin(time * 3 + i) * 2;
            const x1 = Math.cos(angle) * armorRadius;
            const y1 = Math.sin(angle) * armorRadius;
            const x2 = Math.cos(angle) * (armorRadius + length);
            const y2 = Math.sin(angle) * (armorRadius + length);
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
          }
          ctx.globalAlpha = 1;
          break;
          
        case 'orbital':
          // Orbiting particles
          ctx.fillStyle = armor.color;
          for (let i = 0; i < 3; i++) {
            const angle = time * 2 + (Math.PI * 2 / 3) * i;
            const x = Math.cos(angle) * armorRadius;
            const y = Math.sin(angle) * armorRadius;
            ctx.beginPath();
            ctx.arc(x, y, 3, 0, Math.PI * 2);
            ctx.fill();
          }
          break;
          
        case 'fangs':
          // Beast fangs
          ctx.strokeStyle = armor.color;
          ctx.lineWidth = 3;
          for (let i = 0; i < 8; i++) {
            const angle = (Math.PI * 2 / 8) * i;
            const x1 = Math.cos(angle) * armorRadius;
            const y1 = Math.sin(angle) * armorRadius;
            const x2 = Math.cos(angle) * (armorRadius + 5);
            const y2 = Math.sin(angle) * (armorRadius + 5);
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
          }
          break;
          
        case 'quantum':
          // Quantum flicker
          ctx.strokeStyle = armor.color;
          ctx.lineWidth = 2;
          ctx.globalAlpha = 0.3 + Math.sin(time * 10) * 0.3;
          ctx.beginPath();
          ctx.arc(0, 0, armorRadius, 0, Math.PI * 2);
          ctx.stroke();
          ctx.globalAlpha = 1;
          break;
          
        case 'scales':
          // Dragon scales
          ctx.fillStyle = armor.color;
          ctx.globalAlpha = 0.7;
          for (let layer = 0; layer < 2; layer++) {
            for (let i = 0; i < 8; i++) {
              const angle = (Math.PI * 2 / 8) * i + layer * 0.2;
              const x = Math.cos(angle) * (armorRadius - layer * 3);
              const y = Math.sin(angle) * (armorRadius - layer * 3);
              ctx.beginPath();
              ctx.arc(x, y, 3, 0, Math.PI * 2);
              ctx.fill();
            }
          }
          ctx.globalAlpha = 1;
          break;
      }
      
      ctx.restore();
    }


    // ════════════════════════════════════════════════════════════════
    // SISTEMA DE MOTION TRAILS (FASE 1)
    // ════════════════════════════════════════════════════════════════
    const b1Trail = [];
    const b2Trail = [];

    // Função para atualizar trail
    function updateTrail(beyblade, trail, maxLength = 8) {
      if (!beyblade || !beyblade.alive) {
        trail.length = 0;
        return;
      }
      
      const velocity = Math.sqrt(beyblade.vx ** 2 + beyblade.vy ** 2);
      const spinPercent = beyblade.spinSpeed / (beyblade.stats?.maxSpin || 100);
      
      // Apenas criar trail em alta velocidade ou alto spin
      if (velocity > 3 || spinPercent > 0.7) {
        trail.push({
          x: beyblade.x,
          y: beyblade.y,
          rotation: beyblade.rotation,
          radius: beyblade.radius,
          alpha: 1,
          time: Date.now()
        });
        
        // Limitar tamanho do trail
        if (trail.length > maxLength) {
          trail.shift();
        }
      } else {
        // Limpar trail quando parado
        if (velocity < 1) {
          trail.length = 0;
        }
      }
      
      // Fade out trails antigos
      const now = Date.now();
      for (let i = trail.length - 1; i >= 0; i--) {
        const age = (now - trail[i].time) / 1000;
        if (age >= 0.5) {
          trail.splice(i, 1);
        }
      }
    }

    // Função para desenhar trail — ribbon comet style
    function drawTrail(trail, color, teamColors) {
      if (!trail || trail.length < 3) return;

      const baseColor = teamColors?.[0] || color || '#3b82f6';

      // ── Comet ribbon via quadratic path ──────────────────────────
      ctx.save();
      ctx.lineCap  = 'round';
      ctx.lineJoin = 'round';

      for (let i = 1; i < trail.length; i++) {
        const prev = trail[i - 1];
        const curr = trail[i];
        const t    = i / trail.length; // 0 = oldest, 1 = newest

        const alpha = t * t * 0.55;          // quadratic fade, max ~0.55 at tip
        const lw    = curr.radius * 0.55 * t; // tapers from 0 to ~14px

        if (alpha < 0.02 || lw < 0.5) continue;

        ctx.globalAlpha = alpha;
        ctx.strokeStyle = baseColor;
        ctx.lineWidth   = lw;
        ctx.shadowBlur  = 10 * t;
        ctx.shadowColor = baseColor;

        ctx.beginPath();
        ctx.moveTo(prev.x, prev.y);
        ctx.lineTo(curr.x, curr.y);
        ctx.stroke();
      }

      // ── Glow dot at trail tip (second-to-last position for slight lag) ──
      if (trail.length >= 2) {
        const tip = trail[trail.length - 1];
        ctx.globalAlpha = 0.28;
        ctx.shadowBlur  = 20;
        ctx.shadowColor = baseColor;
        const tg = ctx.createRadialGradient(tip.x, tip.y, 0, tip.x, tip.y, tip.radius * 0.9);
        tg.addColorStop(0, baseColor);
        tg.addColorStop(1, 'transparent');
        ctx.fillStyle = tg;
        ctx.beginPath();
        ctx.arc(tip.x, tip.y, tip.radius * 0.9, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
      ctx.globalAlpha = 1;
      ctx.shadowBlur  = 0;
    }

    // ════════════════════════════════════════════════════════════════
    // SCREEN SHAKE & FLASH FUNCTIONS (FASE 1)
    // ════════════════════════════════════════════════════════════════
    let screenShake = { x: 0, y: 0, intensity: 0 };
    let flashEffect = { active: false, color: '#ffffff', alpha: 0 };

    function addScreenShake(intensity = 1) {
      const shakeX = (Math.random() - 0.5) * intensity * 8;
      const shakeY = (Math.random() - 0.5) * intensity * 8;
      
      screenShake = { x: shakeX, y: shakeY, intensity };
      
      // Decay do shake
      setTimeout(() => {
        screenShake = { x: 0, y: 0, intensity: 0 };
      }, 100);
    }

    function addFlashEffect(color = '#ffffff', intensity = 0.6, duration = 150) {
      flashEffect = { active: true, color, alpha: intensity };
      
      setTimeout(() => {
        flashEffect = { active: false, color: '#ffffff', alpha: 0 };
      }, duration);
    }

    // ════════════════════════════════════════════════════════════════
    // FUNÇÕES DE DESENHO DAS CAMADAS - SISTEMA 3 CAMADAS
    // ════════════════════════════════════════════════════════════════
    
    // ════════════════════════════════════════════════════════════════
    // ⚔️ SIGNATURE BLADE - SISTEMA DE RENDERIZAÇÃO LENDÁRIA
    // ════════════════════════════════════════════════════════════════

    function drawSignatureBey(ctx, b, colors, beyType, currentSpinPercent, customIcon) {
      const radius = b.radius;
      const t = Date.now();
      const pulse = Math.sin(t * 0.004) * 0.5 + 0.5;       // 0..1 lento
      const pulse2 = Math.sin(t * 0.007 + 1.2) * 0.5 + 0.5; // defasado
      const spinDir = b.spinDirection || 1;

      // ── AURA EXTERNA ÉPICA (antes de tudo, sem ctx.save/restore do bey) ──
      // Feita em coords do mundo (b.x, b.y) — chamamos de fora do ctx.rotate

      // ── CAMADA 1: DRIVER dourado Signature ──
      const drvGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, radius * 0.28);
      drvGrad.addColorStop(0,   '#fff8dc');
      drvGrad.addColorStop(0.4, '#ffd700');
      drvGrad.addColorStop(1,   colors[0]);
      ctx.fillStyle = drvGrad;
      ctx.beginPath();
      ctx.arc(0, 0, radius * 0.25, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth = 1.5;
      ctx.shadowBlur = 8;
      ctx.shadowColor = '#ffd700';
      ctx.stroke();
      ctx.shadowBlur = 0;

      // ── CAMADA 2: DISC dourado com gravura ──
      const discGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, radius * 0.58);
      discGrad.addColorStop(0,   '#fff3b0');
      discGrad.addColorStop(0.35, colors[0]);
      discGrad.addColorStop(0.75, colors[1] || '#ffffff');
      discGrad.addColorStop(1,   '#ffd700');
      ctx.fillStyle = discGrad;
      ctx.beginPath();
      ctx.arc(0, 0, radius * 0.56, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth = 2.5;
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#ffd700';
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Gravura interna do disco — 8 raios dourados
      ctx.save();
      ctx.globalAlpha = 0.55;
      for (let i = 0; i < 8; i++) {
        const a = (Math.PI * 2 / 8) * i;
        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(a) * radius * 0.5, Math.sin(a) * radius * 0.5);
        ctx.stroke();
      }
      ctx.restore();

      // ── CAMADA 3: LAYER Signature — ornamental e único ──
      drawSignatureLayer(ctx, radius, colors, beyType, pulse);

      // ── ROTATION INDICATOR — dourado duplo ──
      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth = 2.5;
      ctx.shadowBlur = 8;
      ctx.shadowColor = '#ffd700';
      ctx.globalAlpha = 0.9;
      ctx.beginPath();
      ctx.arc(0, 0, radius + 3, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 0.4 + pulse * 0.3;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(0, 0, radius + 7, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;

      // ── ANEL GIRATÓRIO EXTERNO — arcos de energia ──
      ctx.save();
      ctx.globalAlpha = 0.7;
      ctx.strokeStyle = colors[0];
      ctx.lineWidth = 2;
      ctx.shadowBlur = 12;
      ctx.shadowColor = colors[0];
      const arcOffset = (t * 0.002 * spinDir) % (Math.PI * 2);
      for (let i = 0; i < 3; i++) {
        const start = arcOffset + (Math.PI * 2 / 3) * i;
        ctx.beginPath();
        ctx.arc(0, 0, radius + 12, start, start + 0.9);
        ctx.stroke();
      }
      ctx.restore();

      // ── CENTRO — ícone ou símbolo ⚔️ ──
      if (customIcon && customIcon.complete) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(0, 0, 10, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(customIcon, -10, -10, 20, 20);
        ctx.restore();
      } else {
        ctx.save();
        ctx.fillStyle = '#ffd700';
        ctx.font = 'bold 13px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = '#000';
        ctx.shadowBlur = 4;
        ctx.fillText('⚔', 0, 0);
        ctx.shadowBlur = 0;
        ctx.restore();
      }
    }

    function drawSignatureLayer(ctx, radius, colors, beyType, pulse) {
      // Forma base hexagonal + estrela de 6 pontas com as cores do jogador
      const c0 = colors[0];
      const c1 = colors[1] || '#ffffff';
      const c2 = colors[2] || '#cccccc';

      // Base: gradiente radial rico
      const baseGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
      baseGrad.addColorStop(0,    c1);
      baseGrad.addColorStop(0.45, c0);
      baseGrad.addColorStop(0.85, c0);
      baseGrad.addColorStop(1,    '#ffd700');
      ctx.fillStyle = baseGrad;
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.fill();

      // Borda dourada espessa
      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth = 3;
      ctx.shadowBlur = 15;
      ctx.shadowColor = '#ffd700';
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Estrela de 6 pontas como layer ornamental
      const outer = radius * 0.95;
      const inner = radius * 0.52;
      ctx.fillStyle = c0;
      ctx.beginPath();
      for (let i = 0; i < 12; i++) {
        const a = (Math.PI / 6) * i - Math.PI / 2;
        const r = i % 2 === 0 ? outer : inner;
        if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
        else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Pontas adicionais de destaque por tipo
      ctx.save();
      ctx.globalAlpha = 0.8;
      if (beyType === 'Attack' || beyType === 'Extreme') {
        // 5 lâminas afiadas extra atrás das pontas da estrela
        ctx.fillStyle = c2;
        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 1;
        for (let i = 0; i < 5; i++) {
          const a = (Math.PI * 2 / 5) * i - Math.PI / 2;
          ctx.save();
          ctx.rotate(a);
          ctx.beginPath();
          ctx.moveTo(radius * 0.55, 0);
          ctx.lineTo(radius * 1.05, -radius * 0.12);
          ctx.lineTo(radius * 1.05, radius * 0.12);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          ctx.restore();
        }
      } else if (beyType === 'Defense') {
        // Anéis concêntricos reforçados
        for (let i = 1; i <= 3; i++) {
          ctx.strokeStyle = i % 2 === 0 ? '#ffd700' : c1;
          ctx.lineWidth = 2.5 - i * 0.5;
          ctx.globalAlpha = 0.7 - i * 0.1;
          ctx.beginPath();
          ctx.arc(0, 0, radius * (0.78 - i * 0.14), 0, Math.PI * 2);
          ctx.stroke();
        }
      } else if (beyType === 'Stamina') {
        // Espirais de energia duplas
        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 1.5;
        ctx.globalAlpha = 0.6;
        for (let s = 0; s < 2; s++) {
          ctx.beginPath();
          for (let t = 0; t <= 1; t += 0.02) {
            const a = s * Math.PI + t * Math.PI * 3;
            const r = radius * 0.2 + t * radius * 0.7;
            const x = Math.cos(a) * r;
            const y = Math.sin(a) * r;
            if (t === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
          }
          ctx.stroke();
        }
      } else {
        // Balance/outros — diamantes adicionais
        ctx.fillStyle = c2;
        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 1;
        for (let i = 0; i < 4; i++) {
          const a = (Math.PI / 2) * i + Math.PI / 4;
          const cx2 = Math.cos(a) * radius * 0.75;
          const cy2 = Math.sin(a) * radius * 0.75;
          const ds = 5;
          ctx.save();
          ctx.translate(cx2, cy2);
          ctx.rotate(a);
          ctx.beginPath();
          ctx.moveTo(0, -ds); ctx.lineTo(ds * 0.6, 0);
          ctx.lineTo(0, ds); ctx.lineTo(-ds * 0.6, 0);
          ctx.closePath();
          ctx.fill(); ctx.stroke();
          ctx.restore();
        }
      }
      ctx.restore();

      // Anel interior dourado pulsante (inner glow)
      ctx.save();
      ctx.globalAlpha = 0.35 + pulse * 0.25;
      ctx.strokeStyle = '#fff8dc';
      ctx.lineWidth = 2;
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#ffd700';
      ctx.beginPath();
      ctx.arc(0, 0, radius * 0.38, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // Aura externa — chamada ANTES do ctx.translate/rotate do bey (coords mundo)
    function drawSignatureWorldAura(ctx, b, colors, currentSpinPercent) {
      if (!b || !b.alive) return;
      const t = Date.now();
      const pulse = Math.sin(t * 0.004) * 0.5 + 0.5;
      const pulse2 = Math.sin(t * 0.007 + 2.1) * 0.5 + 0.5;
      const radius = b.radius;
      const spinDir = b.spinDirection || 1;

      ctx.save();

      // ── CORONA DOURADA EXTERNA ──
      const coronaRadius = radius * (1.9 + pulse * 0.3);
      const coronaGrad = ctx.createRadialGradient(b.x, b.y, radius * 0.8, b.x, b.y, coronaRadius);
      coronaGrad.addColorStop(0,   colors[0] + 'cc');
      coronaGrad.addColorStop(0.4, colors[0] + '55');
      coronaGrad.addColorStop(0.7, '#ffd70033');
      coronaGrad.addColorStop(1,   'transparent');
      ctx.globalAlpha = 0.5 + pulse * 0.2;
      ctx.fillStyle = coronaGrad;
      ctx.beginPath();
      ctx.arc(b.x, b.y, coronaRadius, 0, Math.PI * 2);
      ctx.fill();

      // ── ANÉIS PULSANTES ──
      const ringAngOff = (t * 0.0015 * spinDir) % (Math.PI * 2);
      for (let ri = 0; ri < 2; ri++) {
        const ringR = radius * (1.55 + ri * 0.35) + pulse2 * 4;
        ctx.globalAlpha = (0.55 - ri * 0.15) * (0.6 + pulse * 0.4);
        ctx.strokeStyle = ri === 0 ? '#ffd700' : colors[0];
        ctx.lineWidth = ri === 0 ? 2.5 : 1.5;
        ctx.shadowBlur = 12;
        ctx.shadowColor = ri === 0 ? '#ffd700' : colors[0];
        // Arcos separados girando
        const arcCount = 4 - ri;
        for (let ai = 0; ai < arcCount; ai++) {
          const start = ringAngOff * (ri + 1) + (Math.PI * 2 / arcCount) * ai;
          ctx.beginPath();
          ctx.arc(b.x, b.y, ringR, start, start + 0.75);
          ctx.stroke();
        }
      }
      ctx.shadowBlur = 0;

      // ── PARTÍCULAS DOURADAS ORBITANDO ──
      const particleCount = 6;
      ctx.globalAlpha = 0.8;
      for (let pi = 0; pi < particleCount; pi++) {
        const baseAngle = (Math.PI * 2 / particleCount) * pi;
        const orbitAngle = baseAngle + (t * 0.002 * spinDir);
        const orbitR = radius * (1.65 + Math.sin(t * 0.003 + pi) * 0.15);
        const px = b.x + Math.cos(orbitAngle) * orbitR;
        const py = b.y + Math.sin(orbitAngle) * orbitR;
        const pSize = 2.5 + Math.sin(t * 0.006 + pi * 1.3) * 1.5;

        ctx.fillStyle = pi % 2 === 0 ? '#ffd700' : colors[0];
        ctx.shadowBlur = 8;
        ctx.shadowColor = pi % 2 === 0 ? '#ffd700' : colors[0];
        ctx.beginPath();
        ctx.arc(px, py, pSize, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.shadowBlur = 0;

      // ── LIGHTNING ARCS quando em alta velocidade ──
      if (currentSpinPercent > 0.5) {
        const arcAlpha = (currentSpinPercent - 0.5) / 0.5;
        ctx.globalAlpha = arcAlpha * 0.7;
        ctx.strokeStyle = '#fff8dc';
        ctx.lineWidth = 1;
        ctx.shadowBlur = 6;
        ctx.shadowColor = '#ffd700';
        const arcAngBase = (t * 0.004 * spinDir) % (Math.PI * 2);
        for (let li = 0; li < 3; li++) {
          const la = arcAngBase + (Math.PI * 2 / 3) * li;
          const x0 = b.x + Math.cos(la) * radius * 1.1;
          const y0 = b.y + Math.sin(la) * radius * 1.1;
          const x1 = b.x + Math.cos(la + 0.4) * radius * 1.7;
          const y1 = b.y + Math.sin(la + 0.4) * radius * 1.7;
          const mx = (x0 + x1) / 2 + (Math.random() - 0.5) * 8;
          const my = (y0 + y1) / 2 + (Math.random() - 0.5) * 8;
          ctx.beginPath();
          ctx.moveTo(x0, y0);
          ctx.quadraticCurveTo(mx, my, x1, y1);
          ctx.stroke();
        }
        ctx.shadowBlur = 0;
      }

      ctx.globalAlpha = 1;
      ctx.restore();
    }

    // Badge "SIGNATURE" desenhado sobre as barras (coords mundo)
    function drawSignatureBadge(ctx, b) {
      if (!b || !b.alive) return;
      const t = Date.now();
      const pulse = Math.sin(t * 0.005) * 0.5 + 0.5;
      const sigName = b.bey?.signatureName || '⚔ SIGNATURE';
      const shortName = sigName.length > 18 ? sigName.substring(0, 17) + '…' : sigName;

      ctx.save();

      const bx = b.x;
      const by = b.y - 72; // acima das barras normais

      // Fundo do badge
      ctx.fillStyle = `rgba(0,0,0,${0.75 + pulse * 0.1})`;
      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(bx - 36, by - 7, 72, 13, 4)
                    : ctx.rect(bx - 36, by - 7, 72, 13);
      ctx.fill();

      // Borda dourada pulsante
      ctx.strokeStyle = `rgba(255,215,0,${0.7 + pulse * 0.3})`;
      ctx.lineWidth = 1.5;
      ctx.shadowBlur = 6 + pulse * 4;
      ctx.shadowColor = '#ffd700';
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Texto
      ctx.fillStyle = '#ffd700';
      ctx.font = `bold ${7 + pulse * 0.5}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = '#000';
      ctx.shadowBlur = 3;
      ctx.fillText('⚔ ' + shortName, bx, by);
      ctx.shadowBlur = 0;

      ctx.restore();
    }

    function drawLayer(ctx, b, colors, type) {
      const radius = b.radius;
      
      switch(type) {
        case 'Attack':
          drawAttackLayer(ctx, radius, colors);
          break;
          
        case 'Defense':
          drawDefenseLayer(ctx, radius, colors);
          break;
          
        case 'Stamina':
          drawStaminaLayer(ctx, radius, colors);
          break;
          
        case 'Balance':
          drawBalanceLayer(ctx, radius, colors);
          break;
          
        default:
          drawBalanceLayer(ctx, radius, colors);
      }
    }
    
    function drawAttackLayer(ctx, radius, colors) {
      // Design agressivo com lâminas pontiagudas
      const bladeCount = 5;
      
      // Base circular
      ctx.fillStyle = colors[0];
      ctx.beginPath();
      ctx.arc(0, 0, radius * 0.85, 0, Math.PI * 2);
      ctx.fill();
      
      // Lâminas agressivas
      ctx.fillStyle = colors[0];
      ctx.strokeStyle = colors[1] || '#ffffff';
      ctx.lineWidth = 1.5;
      
      for (let i = 0; i < bladeCount; i++) {
        const angle = (Math.PI * 2 / bladeCount) * i;
        
        ctx.save();
        ctx.rotate(angle);
        
        // Lâmina triangular afiada
        ctx.beginPath();
        ctx.moveTo(radius * 0.4, 0);
        ctx.lineTo(radius * 0.3, -radius * 0.2);
        ctx.lineTo(radius, -radius * 0.1);
        ctx.lineTo(radius * 1.05, 0);
        ctx.lineTo(radius, radius * 0.1);
        ctx.lineTo(radius * 0.3, radius * 0.2);
        ctx.closePath();
        
        ctx.fill();
        ctx.stroke();
        
        // Detalhe da lâmina
        ctx.strokeStyle = colors[2] || colors[1];
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(radius * 0.5, 0);
        ctx.lineTo(radius * 0.95, 0);
        ctx.stroke();
        
        ctx.restore();
      }
      
      // Anel central de reforço
      ctx.strokeStyle = colors[1];
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, radius * 0.4, 0, Math.PI * 2);
      ctx.stroke();
    }
    
    function drawDefenseLayer(ctx, radius, colors) {
      // Design circular sólido com escudo
      
      // Base sólida
      const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
      gradient.addColorStop(0, colors[0]);
      gradient.addColorStop(0.7, colors[0]);
      gradient.addColorStop(1, colors[1] || '#ffffff');
      
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.strokeStyle = colors[1] || '#ffffff';
      ctx.lineWidth = 3;
      ctx.stroke();
      
      // Anéis de reforço concêntricos
      const ringCount = 4;
      for (let i = 1; i <= ringCount; i++) {
        const ringRadius = radius * (i / (ringCount + 1));
        ctx.strokeStyle = i % 2 === 0 ? colors[2] || colors[1] : colors[1];
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.8;
        ctx.beginPath();
        ctx.arc(0, 0, ringRadius, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      
      // Padrão hexagonal de reforço
      const hexCount = 6;
      for (let i = 0; i < hexCount; i++) {
        const angle = (Math.PI * 2 / hexCount) * i;
        const x = Math.cos(angle) * radius * 0.65;
        const y = Math.sin(angle) * radius * 0.65;
        
        ctx.fillStyle = colors[2] || colors[0];
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.strokeStyle = colors[1];
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }
    
    function drawStaminaLayer(ctx, radius, colors) {
      // Design aerodinâmico suave
      
      // Base circular lisa
      ctx.fillStyle = colors[0];
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.fill();
      
      // Borda suave
      ctx.strokeStyle = colors[1] || '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();
      
      // Padrão de círculos aerodinâmicos
      const circleCount = 8;
      for (let i = 0; i < circleCount; i++) {
        const angle = (Math.PI * 2 / circleCount) * i;
        const distance = radius * 0.7;
        const x = Math.cos(angle) * distance;
        const y = Math.sin(angle) * distance;
        
        // Círculo pequeno
        ctx.fillStyle = colors[1] || '#ffffff';
        ctx.globalAlpha = 0.7;
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();
        
        // Anel ao redor
        ctx.strokeStyle = colors[2] || colors[1];
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.5;
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      
      // Espirais suaves
      ctx.strokeStyle = colors[2] || colors[1];
      ctx.lineWidth = 1.5;
      ctx.globalAlpha = 0.4;
      
      for (let i = 0; i < 3; i++) {
        const startAngle = (Math.PI * 2 / 3) * i;
        const spiralRadius = radius * 0.85;
        
        ctx.beginPath();
        for (let t = 0; t <= 1; t += 0.1) {
          const angle = startAngle + t * Math.PI * 0.5;
          const r = spiralRadius * (1 - t * 0.3);
          const x = Math.cos(angle) * r;
          const y = Math.sin(angle) * r;
          
          if (t === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
    
    function drawBalanceLayer(ctx, radius, colors) {
      // Design híbrido
      
      // Base com gradiente
      const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
      gradient.addColorStop(0, colors[0]);
      gradient.addColorStop(0.6, colors[0]);
      gradient.addColorStop(1, colors[1] || '#ffffff');
      
      ctx.fillStyle = gradient;
      
      // Forma hexagonal irregular
      ctx.beginPath();
      const points = 6;
      for (let i = 0; i < points; i++) {
        const angle = (Math.PI * 2 / points) * i;
        const r = i % 2 === 0 ? radius : radius * 0.85;
        const x = Math.cos(angle) * r;
        const y = Math.sin(angle) * r;
        
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
      
      ctx.strokeStyle = colors[1] || '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();
      
      // Detalhes mistos
      for (let i = 0; i < points; i++) {
        const angle = (Math.PI * 2 / points) * i;
        
        // Mini lâmina
        if (i % 2 === 0) {
          ctx.save();
          ctx.rotate(angle);
          
          ctx.fillStyle = colors[2] || colors[0];
          ctx.beginPath();
          ctx.moveTo(radius * 0.6, -5);
          ctx.lineTo(radius * 0.9, 0);
          ctx.lineTo(radius * 0.6, 5);
          ctx.closePath();
          ctx.fill();
          
          ctx.restore();
        }
        // Círculo de reforço
        else {
          const x = Math.cos(angle) * radius * 0.7;
          const y = Math.sin(angle) * radius * 0.7;
          
          ctx.fillStyle = colors[1] || '#ffffff';
          ctx.beginPath();
          ctx.arc(x, y, 3, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
    
    function drawDisc(ctx, b, colors) {
      const radius = b.radius;
      
      // Disco central com padrão
      const discGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, radius * 0.6);
      discGradient.addColorStop(0, colors[1] || '#ffffff');
      discGradient.addColorStop(0.5, colors[0]);
      discGradient.addColorStop(1, colors[1] || '#ffffff');
      
      ctx.fillStyle = discGradient;
      ctx.beginPath();
      ctx.arc(0, 0, radius * 0.55, 0, Math.PI * 2);
      ctx.fill();
      
      // Borda do disco
      ctx.strokeStyle = colors[2] || colors[1];
      ctx.lineWidth = 2;
      ctx.stroke();
      
      // Padrão interno (6 segmentos)
      ctx.strokeStyle = colors[2] || colors[1];
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.6;
      
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI * 2 / 6) * i;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(angle) * radius * 0.5, Math.sin(angle) * radius * 0.5);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
    
    function drawDriver(ctx, b, colors) {
      const radius = b.radius;
      
      // Ponta do driver
      const driverGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, radius * 0.3);
      driverGradient.addColorStop(0, colors[2] || '#cccccc');
      driverGradient.addColorStop(1, colors[0]);
      
      ctx.fillStyle = driverGradient;
      ctx.beginPath();
      ctx.arc(0, 0, radius * 0.25, 0, Math.PI * 2);
      ctx.fill();
      
      // Borda da ponta
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.5;
      ctx.stroke();
      ctx.globalAlpha = 1;
      
      // Mini anel ao redor
      ctx.strokeStyle = colors[2] || colors[1];
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, radius * 0.28, 0, Math.PI * 2);
      ctx.stroke();
    }
    
    function drawBey(b) {
      if (!b || !b.alive) {
        // Se caiu de lado, desenhar no chão
        if (b && b.fellOver) {
          ctx.save();
          ctx.translate(b.x, b.y);
          
          // Desenhar deitado de lado
          ctx.rotate(b.tippingSide * Math.PI / 2);
          ctx.globalAlpha = 0.7;
          
          const teamColors = b.bey?.colors || [b.color || '#3b82f6', '#ffffff', '#cccccc'];
          
          // Corpo do beyblade deitado
          ctx.fillStyle = teamColors[0];
          ctx.beginPath();
          ctx.ellipse(0, 0, b.radius, b.radius * 0.4, 0, 0, Math.PI * 2);
          ctx.fill();
          
          ctx.strokeStyle = teamColors[1] || '#ffffff';
          ctx.lineWidth = 2;
          ctx.stroke();
          
          ctx.restore();
          ctx.globalAlpha = 1;
        }
        return;
      }
      
      if (isNaN(b.x) || isNaN(b.y) || !isFinite(b.x) || !isFinite(b.y)) {
        b.x = centerX;
        b.y = centerY;
        b.vx = 0;
        b.vy = 0;
      }
      
      const currentSpinPercent = (b.spinSpeed / (b.stats?.maxSpin || 100));
      
      // SPIN FINISH ANIMATION - Progressive tipping
      if (currentSpinPercent < 0.15 && !b.isTipping && !b.fellOver) {
        b.isTipping = true;
      }
      
      if (b.isTipping && !b.fellOver) {
        // Gradualmente inclinar - VELOCIDADE AUMENTADA para queda mais rápida
        const tippingSpeed = 0.04; // Aumentado de 0.015 para 0.04 (quase 3x mais rápido)
        b.tippingAngle += tippingSpeed;
        
        // Reduzir movimento enquanto caindo
        b.vx *= 0.90;
        b.vy *= 0.90;
        b.spinSpeed *= 0.95; // Perder spin mais rápido enquanto caindo
        
        // Quando atingir ~90 graus, está completamente deitado
        if (b.tippingAngle >= Math.PI / 2) {
          b.tippingAngle = Math.PI / 2;
          b.fellOver = true;
          // Note: alive status will be determined by post-physics check
          
          // Visual feedback de queda
          addDebrisParticles(b.x, b.y, b.color, 12);
          addSmokeParticles(b.x, b.y, 8);
          
          recordEvent('FELL_OVER', {
            bey: b === b1 ? 'b1' : 'b2',
            time: Date.now()
          });
        }
      }
      
      if (currentSpinPercent > 0.6) {
        ctx.globalAlpha = 0.2;
        ctx.fillStyle = b.bey?.colors?.[0] || b.color || '#3b82f6';
        for (let i = 0; i < 3; i++) {
          ctx.save();
          ctx.translate(b.x, b.y);
          ctx.rotate(b.rotation - (i * 0.3 * b.spinDirection));
          ctx.beginPath();
          ctx.arc(0, 0, b.radius * 1.1, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
        ctx.globalAlpha = 1;
      }
      
      ctx.save();
      ctx.translate(b.x, b.y);
      
      // Apply tipping transformation
      if (b.tippingAngle > 0) {
        // Criar efeito 3D de inclinação
        const scaleY = Math.cos(b.tippingAngle);
        ctx.scale(1, scaleY);
        
        // Adicionar wobble quando está caindo
        const wobbleAmount = b.tippingAngle * 2;
        const wobbleX = Math.sin(Date.now() * 0.01) * wobbleAmount;
        const wobbleY = Math.cos(Date.now() * 0.01) * wobbleAmount;
        ctx.translate(wobbleX, wobbleY);
      }
      
      ctx.rotate(b.rotation);
      
      // ════════════════════════════════════════════════════════════════
      // DESENHO DO BEYBLADE - SISTEMA DE 3 CAMADAS
      // ════════════════════════════════════════════════════════════════
      
      // currentSpinPercent já foi declarado anteriormente (linha 3256)
      const teamColors = b.bey?.colors || [b.color || '#3b82f6', '#ffffff', '#cccccc'];
      const beyType = b.bey?.type || 'Balance';
      const isSignature = b.bey?.isSignature === true;

      // ──────────────────────────────────────────────────────
      // GLOW AURA em alta velocidade (CAMADA 0 - MAIS BAIXA)
      // ──────────────────────────────────────────────────────
      if (currentSpinPercent > 0.6) {
        const glowIntensity = (currentSpinPercent - 0.6) / 0.4;
        const glowRadius = b.radius * (isSignature ? 1.8 + glowIntensity * 0.5 : 1.3 + glowIntensity * 0.3);
        
        ctx.save();
        ctx.globalAlpha = glowIntensity * (isSignature ? 0.65 : 0.4);
        ctx.shadowBlur = isSignature ? 40 : 25;
        ctx.shadowColor = isSignature ? '#ffd700' : teamColors[0];
        
        const glowGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, glowRadius);
        if (isSignature) {
          glowGradient.addColorStop(0,   '#fff8dc');
          glowGradient.addColorStop(0.3, teamColors[0]);
          glowGradient.addColorStop(0.6, '#ffd70066');
          glowGradient.addColorStop(1,   'transparent');
        } else {
          glowGradient.addColorStop(0, teamColors[0]);
          glowGradient.addColorStop(0.5, teamColors[0] + '80');
          glowGradient.addColorStop(1, 'transparent');
        }
        
        ctx.fillStyle = glowGradient;
        ctx.beginPath();
        ctx.arc(0, 0, glowRadius, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
      }
      
      // ──────────────────────────────────────────────────────
      // TORNADO RIDGE INDICATOR (BB-10 only)
      // ──────────────────────────────────────────────────────
      if (b.inTornadoRidge && currentSpinPercent > 0.4) {
        ctx.save();
        ctx.globalAlpha = 0.6 + Math.sin(Date.now() * 0.008) * 0.2;
        ctx.strokeStyle = '#ffa500';
        ctx.lineWidth = 3;
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#ffa500';
        ctx.beginPath();
        ctx.arc(0, 0, b.radius * 1.4, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      if (isSignature) {
        // ⚔️ SIGNATURE BLADE — renderização épica completa
        const customIconRef = b === b1 ? customIcon1Ref.current : customIcon2Ref.current;
        drawSignatureBey(ctx, b, teamColors, beyType, currentSpinPercent, customIconRef);
      } else {
        // ──────────────────────────────────────────────────────
        // CAMADA 1: DRIVER (base/ponta)
        // ──────────────────────────────────────────────────────
        drawDriver(ctx, b, teamColors);
        
        // ──────────────────────────────────────────────────────
        // CAMADA 2: DISC (meio)
        // ──────────────────────────────────────────────────────
        drawDisc(ctx, b, teamColors);
        
        // ──────────────────────────────────────────────────────
        // CAMADA 3: LAYER (topo - design por tipo)
        // ──────────────────────────────────────────────────────
        drawLayer(ctx, b, teamColors, beyType);
        
        // ──────────────────────────────────────────────────────
        // ROTATION INDICATOR RING
        // ──────────────────────────────────────────────────────
        ctx.strokeStyle = (b.bey?.rotation === 'Left') ? '#00ffff' : '#ffaa00';
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.8;
        ctx.beginPath();
        ctx.arc(0, 0, b.radius + 2, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
        
        // ──────────────────────────────────────────────────────
        // CENTER ICON ou TEXT
        // ──────────────────────────────────────────────────────
        const customIcon = b === b1 ? customIcon1Ref.current : customIcon2Ref.current;
        if (customIcon && customIcon.complete) {
          ctx.save();
          ctx.beginPath();
          ctx.arc(0, 0, 10, 0, Math.PI * 2);
          ctx.clip();
          ctx.drawImage(customIcon, -10, -10, 20, 20);
          ctx.restore();
        } else {
          ctx.fillStyle = '#fff';
          ctx.font = 'bold 8px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.shadowColor = '#000';
          ctx.shadowBlur = 2;
          const beyName = b.bey?.name || 'BEY';
          ctx.fillText(beyName.substring(0, 3).toUpperCase(), 0, 0);
          ctx.shadowBlur = 0;
        }
      }
      
      ctx.restore();
      
      // Draw ARMOR visual effect OVER the beyblade
      if (b.bey?.armor) {
        drawArmorVisual(ctx, b);
      }

      // ── SLEEK STATUS BARS ─────────────────────────────────────────
      const barW = 60; const barH = 5; const barGap = 7;
      const bx   = b.x - barW / 2;
      const by0  = b.y - 56;

      // Helper: draw one bar
      function drawBar(x, y, w, h, fill, fillColor, borderColor) {
        // track
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, 2);
        ctx.fill();
        // fill
        if (fill > 0) {
          ctx.fillStyle = fillColor;
          ctx.shadowBlur = 4; ctx.shadowColor = fillColor;
          ctx.beginPath();
          ctx.roundRect(x, y, Math.max(2, fill * w), h, 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        }
        // border
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = 0.7;
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, 2);
        ctx.stroke();
      }

      // Stamina
      const stamC = b.stamina > 125 ? '#10B981' : b.stamina > 50 ? '#F59E0B' : '#EF4444';
      drawBar(bx, by0,                   barW, barH + 1, b.stamina / 250, stamC, 'rgba(255,255,255,0.18)');
      // Burst risk
      const burstThreshold = 100 - ((b.bey?.effectiveStats?.bal || 10) * 2);
      const burstPct       = Math.min(1, b.burstDamage / burstThreshold);
      const burstC         = burstPct > 0.7 ? '#ff2244' : burstPct > 0.4 ? '#ff9900' : '#ffdd44';
      drawBar(bx, by0 + barGap,          barW, barH,     burstPct,         burstC,  'rgba(255,255,255,0.14)');
      // Spin
      const spinC = currentSpinPercent > 0.6 ? '#06B6D4' : currentSpinPercent > 0.3 ? '#F59E0B' : '#EF4444';
      drawBar(bx, by0 + barGap * 2,      barW, barH,     currentSpinPercent, spinC, 'rgba(255,255,255,0.14)');
      // Stability
      const stabilityPercent = Math.max(0, b.stability / 150);
      const stabilityColor   = stabilityPercent > 0.6 ? '#8b5cf6' : stabilityPercent > 0.3 ? '#f59e0b' : '#ef4444';
      drawBar(bx, by0 + barGap * 3,      barW, barH,     stabilityPercent,   stabilityColor, 'rgba(255,255,255,0.14)');
      
      // Bey name — elegant minimal label
      const beyLabel = (b.bey?.signatureName || b.bey?.name || 'BEY').substring(0, 12).toUpperCase();
      const teamC0   = (b.bey?.colors?.[0] || b.color || '#3b82f6');
      ctx.save();
      ctx.shadowBlur  = 6;
      ctx.shadowColor = teamC0;
      ctx.fillStyle   = teamC0;
      ctx.font        = 'bold 8px "Orbitron", monospace';
      ctx.textAlign   = 'center';
      ctx.fillText(beyLabel, b.x, b.y - 60);
      ctx.shadowBlur = 0;
      ctx.restore();

      // Tipping warning — pulsing
      if (b.isTipping && !b.fellOver) {
        ctx.save();
        ctx.globalAlpha = 0.55 + Math.sin(Date.now() * 0.012) * 0.3;
        ctx.fillStyle   = '#ff2244';
        ctx.shadowBlur  = 10;
        ctx.shadowColor = '#ff2244';
        ctx.font        = 'bold 10px sans-serif';
        ctx.textAlign   = 'center';
        ctx.fillText('⚠', b.x, b.y - 70);
        ctx.restore();
      }
    }

    // ════════════════════════════════════════════════════════════════
    // SISTEMA DE ILUMINAÇÃO PSEUDO-3D
    // ════════════════════════════════════════════════════════════════
    
    function drawBeyShadow(b) {
      if (!b || !b.alive || b.fellOver) return;
      const teamColors = b.bey?.colors || [b.color || '#3b82f6'];
      const c = teamColors[0];
      const spinPct = b.spinSpeed / (b.stats?.maxSpin || 100);

      // ── Soft drop shadow (ellipse offset) ───────────────────────
      ctx.save();
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.beginPath();
      ctx.ellipse(b.x + 5, b.y + 6, b.radius * 0.9, b.radius * 0.55, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // ── Colored floor illumination — fades with spin ────────────
      if (spinPct > 0.2) {
        const intensity = spinPct * 0.45;
        ctx.save();
        ctx.globalAlpha = intensity;
        const floorGrad = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.radius * 2.6);
        floorGrad.addColorStop(0,   c + '55');
        floorGrad.addColorStop(0.5, c + '22');
        floorGrad.addColorStop(1,   'transparent');
        ctx.fillStyle = floorGrad;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.radius * 2.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }
    
    function drawArenaLighting() {
      // ── Top spotlight — off-center for depth ──────────────────────
      const lightGradient = ctx.createRadialGradient(
        centerX - 30, centerY - 70, 0,
        centerX, centerY, 290
      );
      lightGradient.addColorStop(0,   'rgba(255,255,255,0.13)');
      lightGradient.addColorStop(0.4, 'rgba(255,255,255,0.04)');
      lightGradient.addColorStop(1,   'rgba(0,0,0,0.22)');
      ctx.fillStyle = lightGradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // ── Vignette ──────────────────────────────────────────────────
      const vignetteGradient = ctx.createRadialGradient(
        centerX, centerY, 130,
        centerX, centerY, 380
      );
      vignetteGradient.addColorStop(0, 'transparent');
      vignetteGradient.addColorStop(1, 'rgba(0,0,0,0.5)');
      ctx.fillStyle = vignetteGradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // ── Dynamic bey illumination on arena surface ─────────────────
      const beys = [b1, b2];
      beys.forEach(b => {
        if (!b || !b.alive) return;
        const spinPct = b.spinSpeed / (b.stats?.maxSpin || 100);
        if (spinPct < 0.15) return;
        const c = b.bey?.colors?.[0] || b.color || '#3b82f6';
        const alpha = spinPct * 0.12;
        ctx.save();
        ctx.globalAlpha = alpha;
        const dynGrad = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, 110);
        dynGrad.addColorStop(0, c);
        dynGrad.addColorStop(0.6, c + '44');
        dynGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = dynGrad;
        ctx.beginPath();
        ctx.arc(b.x, b.y, 110, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });
    }
    
    function drawArena() {
      if (arenaType === 'COLOSSEUM_CARNAGE') {
        drawColosseumCarnage();
      } else if (arenaType === 'NEXUS') {
        drawOctagonalArena();
      } else if (arenaType === 'VOLCANIC_RAGE') {
        drawIronCrucible();
      } else if (arenaType === 'PANGEA_PLATFORM') {
        drawPangeaPlatform();
      } else if (arenaType === 'KILLER_SIDES') {
        drawKillerSidesArena();
      } else if (arenaType === 'PINBALL_INFERNO') {
        drawPinballInferno();
      } else if (arenaType === 'VORTEX_COLISEUM') {
        drawVortexColiseum();
      } else if (arenaType === 'SPEEDWAY_CIRCUIT') {
        drawSpeedwayCircuit();
      } else if (arenaType === 'DOMINATION_ZONES') {
        drawDominationZones();
      } else if (arenaType === 'TIDAL_SURGE') {
        drawTidalSurge();
      } else if (arenaType === 'STORM_TRACK') {
        drawStormTrack();
      } else {
        // ✨ PREMIUM ARENA (BB-10)
      if (arenaType === 'BB10_COMPETITIVE') {
        renderCompetitiveArena(ctx, centerX, centerY, ARENA.zones, Date.now());
      } else {
        drawCircularArena();
      }
      }
    }
    

    // ════════════════════════════════════════════════════════════════
    // IRON CRUCIBLE: LAVA FLOW HELPER FUNCTIONS
    // ════════════════════════════════════════════════════════════════
    
    // Gera padrão de lava flow aleatório
    function generateLavaFlowPattern(currentTime) {
      const patterns = [];
      const patternTypes = [
        'horizontal', 'vertical', 'diagonal45', 'diagonal135',
        'spiral_out_cw', 'spiral_out_ccw', 'spiral_in',
        'arc90', 'arc180', 'snake', 'semicircle',
        'wave_h', 'wave_v', 'spiral_double',
        'radial4', 'radial6', 'radial8',
        'ring', 'ring_double', 'ring_pulse',
        'grid', 'logarithmic', 'flower', 'chaos'
      ];
      
      // 1% chance de GLOBAL APOCALYPSE
      if (Math.random() < 0.01) {
        return [{
          type: 'global',
          createdAt: currentTime,
          lifetime: 5.0,
          points: []
        }];
      }
      
      const flowCount = Math.floor(Math.random() * 3) + 1;
      
      for (let i = 0; i < flowCount; i++) {
        const type = patternTypes[Math.floor(Math.random() * patternTypes.length)];
        const pattern = {
          type: type,
          createdAt: currentTime,
          lifetime: 5.0,
          points: generateFlowPoints(type),
          width: 15 + Math.random() * 25
        };
        patterns.push(pattern);
      }
      
      return patterns;
    }
    
    // Gera pontos do padrão de lava (todos os 20+ padrões)
    function generateFlowPoints(type) {
      const points = [];

      switch(type) {
        // ─── LINEARES ───────────────────────────────────────────
        case 'horizontal': {
          const y = (Math.random() - 0.5) * 280;
          for (let x = -200; x <= 200; x += 8) points.push({ x, y });
          break;
        }
        case 'vertical': {
          const x = (Math.random() - 0.5) * 280;
          for (let y = -200; y <= 200; y += 8) points.push({ x, y });
          break;
        }
        case 'diagonal45': {
          for (let t = -260; t <= 260; t += 8) points.push({ x: t, y: t });
          break;
        }
        case 'diagonal135': {
          for (let t = -260; t <= 260; t += 8) points.push({ x: t, y: -t });
          break;
        }
        // ─── CURVILÍNEAS ────────────────────────────────────────
        case 'spiral_out_cw': {
          for (let t = 0; t < 6 * Math.PI; t += 0.15) {
            const r = t * 10;
            if (r > 210) break;
            points.push({ x: Math.cos(t) * r, y: Math.sin(t) * r });
          }
          break;
        }
        case 'spiral_out_ccw': {
          for (let t = 0; t < 6 * Math.PI; t += 0.15) {
            const r = t * 10;
            if (r > 210) break;
            points.push({ x: Math.cos(-t) * r, y: Math.sin(-t) * r });
          }
          break;
        }
        case 'spiral_in': {
          for (let t = 0; t < 6 * Math.PI; t += 0.15) {
            const r = 200 - t * 10;
            if (r < 5) break;
            points.push({ x: Math.cos(t) * r, y: Math.sin(t) * r });
          }
          break;
        }
        case 'arc90': {
          const startA = Math.random() * Math.PI * 2;
          const r = 80 + Math.random() * 100;
          for (let a = startA; a < startA + Math.PI / 2; a += 0.08) {
            points.push({ x: Math.cos(a) * r, y: Math.sin(a) * r });
          }
          break;
        }
        case 'arc180': {
          const startA = Math.random() * Math.PI * 2;
          const r = 80 + Math.random() * 100;
          for (let a = startA; a < startA + Math.PI; a += 0.08) {
            points.push({ x: Math.cos(a) * r, y: Math.sin(a) * r });
          }
          break;
        }
        case 'snake': {
          for (let x = -200; x <= 200; x += 8) {
            points.push({ x, y: Math.sin(x * 0.05) * 80 });
          }
          break;
        }
        case 'semicircle': {
          const startA = Math.random() * Math.PI * 2;
          const r = 100 + Math.random() * 80;
          for (let a = startA; a < startA + Math.PI; a += 0.08) {
            points.push({ x: Math.cos(a) * r, y: Math.sin(a) * r });
          }
          break;
        }
        case 'wave_h': {
          for (let x = -200; x <= 200; x += 6) {
            points.push({ x, y: Math.sin(x * 0.08) * 60 });
          }
          break;
        }
        case 'wave_v': {
          for (let y = -200; y <= 200; y += 6) {
            points.push({ x: Math.sin(y * 0.08) * 60, y });
          }
          break;
        }
        case 'spiral_double': {
          for (let t = 0; t < 5 * Math.PI; t += 0.15) {
            const r = t * 10;
            if (r > 210) break;
            points.push({ x: Math.cos(t) * r,  y: Math.sin(t) * r });
            points.push({ x: Math.cos(t + Math.PI) * r, y: Math.sin(t + Math.PI) * r });
          }
          break;
        }
        // ─── RADIAIS ────────────────────────────────────────────
        case 'radial4': {
          [0, 1, 2, 3].forEach(i => {
            const a = (Math.PI / 2) * i;
            for (let r = 0; r <= 200; r += 8) {
              points.push({ x: Math.cos(a) * r, y: Math.sin(a) * r });
            }
          });
          break;
        }
        case 'radial6': {
          for (let i = 0; i < 6; i++) {
            const a = (Math.PI / 3) * i;
            for (let r = 0; r <= 200; r += 8) {
              points.push({ x: Math.cos(a) * r, y: Math.sin(a) * r });
            }
          }
          break;
        }
        case 'radial8': {
          for (let i = 0; i < 8; i++) {
            const a = (Math.PI / 4) * i;
            for (let r = 0; r <= 200; r += 8) {
              points.push({ x: Math.cos(a) * r, y: Math.sin(a) * r });
            }
          }
          break;
        }
        case 'ring': {
          const rRing = 80 + Math.random() * 80;
          for (let a = 0; a < Math.PI * 2; a += 0.1) {
            points.push({ x: Math.cos(a) * rRing, y: Math.sin(a) * rRing });
          }
          break;
        }
        case 'ring_double': {
          [90, 155].forEach(rR => {
            for (let a = 0; a < Math.PI * 2; a += 0.1) {
              points.push({ x: Math.cos(a) * rR, y: Math.sin(a) * rR });
            }
          });
          break;
        }
        case 'ring_pulse': {
          const rBase = 100 + Math.random() * 60;
          for (let a = 0; a < Math.PI * 2; a += 0.08) {
            const rPulse = rBase + Math.sin(a * 6) * 20;
            points.push({ x: Math.cos(a) * rPulse, y: Math.sin(a) * rPulse });
          }
          break;
        }
        // ─── COMPLEXOS ──────────────────────────────────────────
        case 'grid': {
          [-80, 0, 80].forEach(gx => {
            for (let gy = -180; gy <= 180; gy += 8) points.push({ x: gx, y: gy });
          });
          [-80, 0, 80].forEach(gy => {
            for (let gx = -180; gx <= 180; gx += 8) points.push({ x: gx, y: gy });
          });
          break;
        }
        case 'logarithmic': {
          for (let t = 0.1; t < 7; t += 0.1) {
            const r = Math.exp(t * 0.5) * 8;
            if (r > 210) break;
            points.push({ x: Math.cos(t * 2) * r, y: Math.sin(t * 2) * r });
          }
          break;
        }
        case 'flower': {
          for (let a = 0; a < Math.PI * 2; a += 0.05) {
            const r = 100 * Math.abs(Math.cos(3 * a));
            points.push({ x: Math.cos(a) * r, y: Math.sin(a) * r });
          }
          break;
        }
        case 'chaos': {
          for (let i = 0; i < 12; i++) {
            const cx2 = (Math.random() - 0.5) * 320;
            const cy2 = (Math.random() - 0.5) * 320;
            const cLen = 30 + Math.random() * 60;
            const cAngle = Math.random() * Math.PI * 2;
            for (let j = 0; j < cLen; j += 8) {
              points.push({ x: cx2 + Math.cos(cAngle) * j, y: cy2 + Math.sin(cAngle) * j });
            }
          }
          break;
        }
        default: {
          for (let a = 0; a < Math.PI * 2; a += 0.1) {
            points.push({ x: Math.cos(a) * 100, y: Math.sin(a) * 100 });
          }
        }
      }

      return points;
    }
    
    // Verifica se blade está sobre lava flow
    function isOnLavaFlow(bladeX, bladeY, flows, centerX, centerY) {
      for (const flow of flows) {
        if (flow.type === 'global') return true;
        
        for (const point of flow.points) {
          const flowX = centerX + point.x;
          const flowY = centerY + point.y;
          const dist = Math.sqrt((bladeX - flowX) ** 2 + (bladeY - flowY) ** 2);
          
          if (dist < flow.width / 2) return true;
        }
      }
      return false;
    }

        function handleIronCruciblePhysics(b, bSpinPercent, velocity) {
      // IRON CRUCIBLE: Bowl arena + VOLCANIC ERUPTIONS + LAVA FLOWS
      
      const distToCenter = Math.sqrt((b.x - centerX) ** 2 + (b.y - centerY) ** 2);
      const zones = ARENA.zones;
      const gravityMod = ARENA.gravityModifier || 1.25;
      const currentBattleTime = (Date.now() - battleStartTimeRef.current) / 1000;

      // ════════════════════════════════════════════════════════════════
      // VOLCANIC ERUPTION SYSTEM
      // ════════════════════════════════════════════════════════════════
      if (ARENA.volcanicSystem) {
        const vs = ARENA.volcanicSystem;
        
        if (currentBattleTime - vs.lastEruptionTime >= vs.eruptionInterval) {
          if (!vs.warningActive) {
            vs.warningActive = true;
            vs.warningStartTime = currentBattleTime;
          }
          
          if (vs.warningActive && currentBattleTime - vs.warningStartTime >= vs.warningTime) {
            if (!vs.eruptionActive) {
              vs.eruptionActive = true;
              vs.eruptionStartTime = currentBattleTime;
              addParticle(centerX, centerY, '#ff6600', 30);
              recordEvent('VOLCANIC_ERUPTION', { intensity: vs.eruptionForce });
            }
          }
        }
        
        if (vs.eruptionActive) {
          const eruptionElapsed = currentBattleTime - vs.eruptionStartTime;
          
          if (eruptionElapsed < vs.eruptionDuration) {
            if (distToCenter <= vs.eruptionRadius) {
              const angleFromCenter = Math.atan2(b.y - centerY, b.x - centerX);
              const forceFactor = 1.0 - (distToCenter / vs.eruptionRadius);
              const force = vs.eruptionForce * forceFactor;
              
              b.vx += Math.cos(angleFromCenter) * force;
              b.vy += Math.sin(angleFromCenter) * force;
              
              if (Math.random() < 0.1) addParticle(b.x, b.y, '#ff4400', 3);
            }
          } else {
            vs.eruptionActive = false;
            vs.warningActive = false;
            vs.lastEruptionTime = currentBattleTime;
          }
        }
      }

      // ════════════════════════════════════════════════════════════════
      // LAVA FLOW SYSTEM
      // ════════════════════════════════════════════════════════════════
      if (ARENA.lavaFlowSystem) {
        const lfs = ARENA.lavaFlowSystem;
        
        if (currentBattleTime - lfs.lastFlowChange >= lfs.flowInterval) {
          lfs.flowPatterns = generateLavaFlowPattern(currentBattleTime);
          lfs.lastFlowChange = currentBattleTime;
        }
        
        lfs.flowPatterns = lfs.flowPatterns.filter(flow => 
          currentBattleTime - flow.createdAt < flow.lifetime
        );
        
        const onLava = isOnLavaFlow(b.x, b.y, lfs.flowPatterns, centerX, centerY);
        
        if (onLava) {
          if (!b.originalFriction) b.originalFriction = true;
          b.onLavaFlow = true;
        } else {
          b.onLavaFlow = false;
          b.originalFriction = false;
        }
      }

      // ════════════════════════════════════════════════════════════════
      // FRICTION SYSTEM
      // ════════════════════════════════════════════════════════════════
      let frictionFactor;
      
      if (b.onLavaFlow && ARENA.lavaFlowSystem) {
        frictionFactor = 1.0 - ARENA.lavaFlowSystem.frictionReduction;
        if (Math.random() < 0.05) addParticle(b.x, b.y, '#ff4500', 2);
      } else {
        if (distToCenter <= zones.centerBowl) {
          frictionFactor = 0.968;
        } else if (distToCenter <= zones.midZone) {
          frictionFactor = 0.984;
        } else if (distToCenter <= zones.outerZone) {
          frictionFactor = 0.994;
        } else {
          frictionFactor = 0.996;
        }
      }
      
      b.vx *= frictionFactor;
      b.vy *= frictionFactor;

      // Bowl gravity
      const angleToCenter = Math.atan2(centerY - b.y, centerX - b.x);
      if (distToCenter > zones.centerBowl) {
        const gravScale = Math.min((distToCenter - zones.centerBowl) / (zones.outerZone - zones.centerBowl), 1.0);
        const gravForce = 0.16 * gravityMod * gravScale;
        b.vx += Math.cos(angleToCenter) * gravForce;
        b.vy += Math.sin(angleToCenter) * gravForce;
      }

      // Weight advantage
      const bWeight = b.bey?.effectiveStats?.weight || 10;
      if (distToCenter <= zones.centerBowl && bWeight > 15) {
        b.vx *= 0.97;
        b.vy *= 0.97;
        if (Math.random() < 0.02) addParticle(b.x, b.y, '#ff4444', 4);
      }
      if (distToCenter > zones.midZone && Math.random() < 0.03) {
        addParticle(b.x, b.y, '#4466cc', 4);
      }

      // Stamina loss
      let staminaLoss = 0.14 - ((b.bey?.effectiveStats?.sta || 10) * 0.005);
      staminaLoss += velocity * 0.008;
      if (distToCenter <= zones.centerBowl) staminaLoss *= 0.85;
      else if (distToCenter > zones.outerZone) staminaLoss *= 1.15;

      if (velocity < 2 && b.bey?.type === 'Stamina') {
        staminaLoss *= 0.6;
        if (isOppositeSpin) staminaLoss *= 0.7;
      }
      const hasPerpetual = b.bey?.synergies?.some(s => s?.name?.includes('Perpetual')) || false;
      if (hasPerpetual) staminaLoss -= 0.01;
      if (b.eternalSpinActive && b.eternalSpinTimer < 300) staminaLoss = 0;
      b.stamina -= staminaLoss;

      // Wall collision
      if (distToCenter > zones.wall - b.radius) {
        const angle = Math.atan2(b.y - centerY, b.x - centerX);
        b.x = centerX + Math.cos(angle) * (zones.wall - b.radius);
        b.y = centerY + Math.sin(angle) * (zones.wall - b.radius);
        const normalX = Math.cos(angle);
        const normalY = Math.sin(angle);
        const dotProduct = b.vx * normalX + b.vy * normalY;
        b.vx = b.vx - 2 * dotProduct * normalX;
        b.vy = b.vy - 2 * dotProduct * normalY;
        b.vx *= 0.75;
        b.vy *= 0.75;
        b.stamina -= 1.5;
        b.burstDamage += 0.4;
        addParticle(b.x, b.y, '#ffffff', 10);
      }
    }


    function handlePangeaPlatformPhysics(b, bSpinPercent, velocity) {
      // PANGEA PLATFORM: 6 tectonic plates as pie slices, each rotating independently
      const distToCenter = Math.sqrt((b.x - centerX) ** 2 + (b.y - centerY) ** 2);
      const zones = ARENA.zones;
      const currentTime = Date.now() / 1000;
      const seismic = ARENA.seismic;

      // Update plate angles
      ARENA.plates.forEach(plate => {
        plate.currentAngle += plate.velocity * plate.direction * (1 / 60);
        if (plate.currentAngle > Math.PI * 2) plate.currentAngle -= Math.PI * 2;
        if (plate.currentAngle < 0) plate.currentAngle += Math.PI * 2;
      });

      // Earthquake timer
      if (!seismic.active) {
        if (currentTime - seismic.lastQuakeTime >= seismic.interval) {
          seismic.active = true;
          seismic.activeTimer = 0;
          seismic.lastQuakeTime = currentTime;
          addScreenShake(seismic.intensity);
          recordEvent('PANGEA_EARTHQUAKE', { intensity: seismic.intensity });
        }
      } else {
        seismic.activeTimer += 1;
        if (seismic.activeTimer >= seismic.duration * 60) {
          seismic.active = false;
          seismic.activeTimer = 0;
        } else {
          const quakeForce = seismic.intensity * 0.12;
          b.vx += (Math.random() - 0.5) * quakeForce;
          b.vy += (Math.random() - 0.5) * quakeForce;
          if (Math.random() < 0.04) addParticle(b.x, b.y, '#ff6b6b', 8);
        }
      }

      // Find which plate (pie slice) the bey is on
      let currentPlate = null;
      if (distToCenter >= zones.centerStable && distToCenter < zones.plateZone) {
        const angleFromCenter = ((Math.atan2(b.y - centerY, b.x - centerX) + Math.PI * 2) % (Math.PI * 2));
        const plateArc = Math.PI * 2 / 6;
        for (const plate of ARENA.plates) {
          const plateCenter = (plate.currentAngle + Math.PI * 2) % (Math.PI * 2);
          let angleDiff = Math.abs(angleFromCenter - plateCenter);
          if (angleDiff > Math.PI) angleDiff = Math.PI * 2 - angleDiff;
          if (angleDiff < plateArc / 2) { currentPlate = plate; break; }
        }
      }

      if (currentPlate) {
        const angleFromCenter = Math.atan2(b.y - centerY, b.x - centerX);
        const tangentialAngle = angleFromCenter + (Math.PI / 2) * currentPlate.direction;
        b.vx += Math.cos(tangentialAngle) * currentPlate.velocity * 1.0;
        b.vy += Math.sin(tangentialAngle) * currentPlate.velocity * 1.0;
        if (Math.random() < 0.03) {
          addParticle(b.x, b.y, currentPlate.direction > 0 ? '#5a8a30' : '#8b4513', 4);
        }
      }

      b.vx *= 0.990;
      b.vy *= 0.990;

      const angleToCenter = Math.atan2(centerY - b.y, centerX - b.x);
      if (distToCenter > zones.centerStable) {
        b.vx += Math.cos(angleToCenter) * 0.06;
        b.vy += Math.sin(angleToCenter) * 0.06;
      }

      let staminaLoss = 0.14 - ((b.bey?.effectiveStats?.sta || 10) * 0.005);
      staminaLoss += velocity * 0.009;
      if (seismic.active) staminaLoss *= 1.2;

      if (velocity < 2 && b.bey?.type === 'Stamina') {
        staminaLoss *= 0.6;
        if (isOppositeSpin) staminaLoss *= 0.7;
      }
      const hasPerpetual2 = b.bey?.synergies?.some(s => s?.name?.includes('Perpetual')) || false;
      if (hasPerpetual2) staminaLoss -= 0.01;
      if (b.eternalSpinActive && b.eternalSpinTimer < 300) staminaLoss = 0;
      b.stamina -= staminaLoss;

      if (distToCenter > zones.wall - b.radius) {
        const angle = Math.atan2(b.y - centerY, b.x - centerX);
        b.x = centerX + Math.cos(angle) * (zones.wall - b.radius);
        b.y = centerY + Math.sin(angle) * (zones.wall - b.radius);
        const normalX = Math.cos(angle);
        const normalY = Math.sin(angle);
        const dotProduct = b.vx * normalX + b.vy * normalY;
        b.vx = b.vx - 2 * dotProduct * normalX;
        b.vy = b.vy - 2 * dotProduct * normalY;
        b.vx *= 0.75;
        b.vy *= 0.75;
        b.stamina -= 1.5;
        b.burstDamage += 0.4;
        addParticle(b.x, b.y, '#ffffff', 10);
      }
    }

    function handlePinballInfernoPhysics(b, bSpinPercent, velocity) {
      // PINBALL INFERNO: 12 bumpers (danger/combo/trap zones) + 3 flippers + combo system
      const distToCenter = Math.sqrt((b.x - centerX) ** 2 + (b.y - centerY) ** 2);
      const zones = ARENA.zones;
      const beyIndex = b === b1 ? 0 : 1;
      const combo = ARENA.comboSystem;

      // Bumper collisions
      ARENA.bumpers.forEach(bumper => {
        const bumperX = centerX + bumper.x;
        const bumperY = centerY + bumper.y;
        const dToBumper = Math.sqrt((b.x - bumperX) ** 2 + (b.y - bumperY) ** 2);

        if (dToBumper < bumper.radius + b.radius && bumper.cooldown <= 0) {
          const angle = Math.atan2(b.y - bumperY, b.x - bumperX);
          const boostForce = 6 * bumper.bounceMultiplier;
          b.vx += Math.cos(angle) * boostForce;
          b.vy += Math.sin(angle) * boostForce;

          if (beyIndex === 0) combo.bey1Combo += 1;
          else combo.bey2Combo += 1;

          const comboCount = beyIndex === 0 ? combo.bey1Combo : combo.bey2Combo;
          if (comboCount >= 2) {
            b.stamina -= 0.5;
            const opponent = b === b1 ? b2 : b1;
            if (opponent) opponent.stamina -= 0.5 * combo.comboMultiplier;
          }

          bumper.cooldown = 0.5;
          addParticle(b.x, b.y, bumper.color, 15);
          addScreenShake(0.8);

          recordEvent('PINBALL_BUMPER_HIT', {
            bey: beyIndex === 0 ? 'b1' : 'b2',
            type: bumper.type,
            combo: comboCount
          });
        }

        if (bumper.cooldown > 0) bumper.cooldown -= 1/60;
      });

      // Flipper collisions
      ARENA.flippers.forEach(flipper => {
        const flipperX = centerX + flipper.x;
        const flipperY = centerY + flipper.y;
        const dToFlipper = Math.sqrt((b.x - flipperX) ** 2 + (b.y - flipperY) ** 2);

        if (dToFlipper < 35 + b.radius && flipper.cooldown <= 0 && velocity > 1.5) {
          const launchAngle = Math.atan2(centerY - flipperY, centerX - flipperX);
          b.vx += Math.cos(launchAngle) * 10;
          b.vy += Math.sin(launchAngle) * 10;
          flipper.cooldown = flipper.timing;
          if (beyIndex === 0) combo.bey1Combo += 1;
          else combo.bey2Combo += 1;
          addParticle(b.x, b.y, '#ffd93d', 20);
          addScreenShake(1.0);
        }
        if (flipper.cooldown > 0) flipper.cooldown -= 1/60;
      });

      // Combo decay
      if (beyIndex === 0) combo.bey1Combo = Math.max(0, combo.bey1Combo - combo.comboDecayRate / 60);
      else combo.bey2Combo = Math.max(0, combo.bey2Combo - combo.comboDecayRate / 60);

      b.vx *= 0.988;
      b.vy *= 0.988;

      // Weak center pull
      const angleToCenter = Math.atan2(centerY - b.y, centerX - b.x);
      if (distToCenter > zones.centerZone) {
        b.vx += Math.cos(angleToCenter) * 0.05;
        b.vy += Math.sin(angleToCenter) * 0.05;
      }

      let staminaLoss = 0.16 - ((b.bey?.effectiveStats?.sta || 10) * 0.005);
      staminaLoss += velocity * 0.010;
      if (velocity < 2 && b.bey?.type === 'Stamina') {
        staminaLoss *= 0.6;
        if (isOppositeSpin) staminaLoss *= 0.7;
      }
      const hasPerpetual3 = b.bey?.synergies?.some(s => s?.name?.includes('Perpetual')) || false;
      if (hasPerpetual3) staminaLoss -= 0.01;
      if (b.eternalSpinActive && b.eternalSpinTimer < 300) staminaLoss = 0;
      b.stamina -= staminaLoss;

      if (distToCenter > zones.wall - b.radius) {
        const angle = Math.atan2(b.y - centerY, b.x - centerX);
        b.x = centerX + Math.cos(angle) * (zones.wall - b.radius);
        b.y = centerY + Math.sin(angle) * (zones.wall - b.radius);
        const normalX = Math.cos(angle);
        const normalY = Math.sin(angle);
        const dot = b.vx * normalX + b.vy * normalY;
        b.vx = b.vx - 2 * dot * normalX;
        b.vy = b.vy - 2 * dot * normalY;
        b.vx *= 0.78;
        b.vy *= 0.78;
        b.stamina -= 1.0;
        b.burstDamage += 0.3;
        if (beyIndex === 0) combo.bey1Combo += 0.3;
        else combo.bey2Combo += 0.3;
        addParticle(b.x, b.y, '#ff3333', 10);
      }
    }

    
    function handleVortexColiseumPhysics(b, bSpinPercent, velocity) {
      const distToCenter = Math.sqrt((b.x - centerX) ** 2 + (b.y - centerY) ** 2);
      const zones = ARENA.zones;
      const beyIndex = b === b1 ? 0 : 1;
      
      // Determine current orbit
      let currentOrbit = 'outer';
      let orbitMultiplier = 1.0;
      
      if (distToCenter <= zones.innerOrbit) {
        currentOrbit = 'inner';
        orbitMultiplier = 1.4; // +40% speed in inner orbit
      } else if (distToCenter <= zones.middleOrbit) {
        currentOrbit = 'middle';
        orbitMultiplier = 1.0; // Normal speed
      } else if (distToCenter <= zones.outerOrbit) {
        currentOrbit = 'outer';
        orbitMultiplier = 0.8; // -20% speed in outer orbit
      }
      
      // Vortex pull force - pulls toward center with rotation
      const vortexStrength = ARENA.vortex.strength;
      const pullForce = (zones.wall - distToCenter) / zones.wall * vortexStrength;
      
      // Calculate tangential (orbital) force based on vortex rotation
      const angleFromCenter = Math.atan2(b.y - centerY, b.x - centerX);
      const vortexDirection = ARENA.vortex.inversed ? -1 : 1;
      const tangentialAngle = angleFromCenter + (Math.PI / 2) * vortexDirection;
      
      // Apply vortex forces
      const radialPull = pullForce * 0.4;
      const tangentialForce = pullForce * 0.6 * orbitMultiplier;
      
      // Pull toward center
      const angleToCenter = Math.atan2(centerY - b.y, centerX - b.x);
      b.vx += Math.cos(angleToCenter) * radialPull;
      b.vy += Math.sin(angleToCenter) * radialPull;
      
      // Apply orbital force
      b.vx += Math.cos(tangentialAngle) * tangentialForce;
      b.vy += Math.sin(tangentialAngle) * tangentialForce;
      
      // VISUAL: Particles being sucked into vortex
      if (distToCenter > zones.vortexCore && Math.random() < 0.15) {
        const particleAngle = angleToCenter + (Math.random() - 0.5) * 0.3;
        const particleX = b.x + Math.cos(particleAngle) * 20;
        const particleY = b.y + Math.sin(particleAngle) * 20;
        const color = ARENA.vortex.inversed ? '#ff4444' : '#c084fc';
        addParticle(particleX, particleY, color, 6);
      }
      
      // Storm Surge - strong ejection when inversed
      if (ARENA.vortex.inversed && distToCenter < zones.middleOrbit) {
        const ejectForce = 7.0; // BRUTAL ejection - beys fly to wall!
        b.vx -= Math.cos(angleToCenter) * ejectForce;
        b.vy -= Math.sin(angleToCenter) * ejectForce;
        
        if (Math.random() < 0.05) {
          addParticle(b.x, b.y, '#ff0000', 8);
        }
      }
      
      // Track momentum stacks (complete revolutions in inner orbit)
      if (currentOrbit === 'inner') {
        const currentAngle = Math.atan2(b.y - centerY, b.x - centerX);
        const lastAngle = beyIndex === 0 ? ARENA.momentum.bey1LastAngle : ARENA.momentum.bey2LastAngle;
        
        // VISUAL: Colorful trail for beys in inner orbit
        const momentumStacks = beyIndex === 0 ? ARENA.momentum.bey1Stacks : ARENA.momentum.bey2Stacks;
        if (Math.random() < 0.2) {
          const trailColor = momentumStacks > 3 ? '#ffd700' : momentumStacks > 1 ? '#8b5cf6' : '#6366f1';
          addParticle(b.x, b.y, trailColor, 5 + momentumStacks);
        }
        
        // Check if completed a full revolution
        const angleDiff = currentAngle - lastAngle;
        if (Math.abs(angleDiff) > Math.PI) {
          // Crossed the -π/π boundary
          if (beyIndex === 0) {
            ARENA.momentum.bey1Stacks += 1;
            // Visual feedback for stack gain
            for (let i = 0; i < 15; i++) {
              const angle = (Math.PI * 2 / 15) * i;
              const x = b.x + Math.cos(angle) * 15;
              const y = b.y + Math.sin(angle) * 15;
              addParticle(x, y, '#ffd700', 8);
            }
            recordEvent('MOMENTUM_STACK', { bey: 'b1', stacks: ARENA.momentum.bey1Stacks });
          } else {
            ARENA.momentum.bey2Stacks += 1;
            // Visual feedback for stack gain
            for (let i = 0; i < 15; i++) {
              const angle = (Math.PI * 2 / 15) * i;
              const x = b.x + Math.cos(angle) * 15;
              const y = b.y + Math.sin(angle) * 15;
              addParticle(x, y, '#ffd700', 8);
            }
            recordEvent('MOMENTUM_STACK', { bey: 'b2', stacks: ARENA.momentum.bey2Stacks });
          }
        }
        
        if (beyIndex === 0) {
          ARENA.momentum.bey1LastAngle = currentAngle;
        } else {
          ARENA.momentum.bey2LastAngle = currentAngle;
        }
      }
      
      // Decay momentum stacks when not in inner orbit
      if (currentOrbit !== 'inner') {
        if (beyIndex === 0) {
          ARENA.momentum.bey1Stacks = Math.max(0, ARENA.momentum.bey1Stacks - ARENA.momentum.stackDecayRate / 60);
        } else {
          ARENA.momentum.bey2Stacks = Math.max(0, ARENA.momentum.bey2Stacks - ARENA.momentum.stackDecayRate / 60);
        }
      }
      
      // ═══════════════════════════════════════════════════════════
      // BUMPERS - Push beys away on contact
      // ═══════════════════════════════════════════════════════════
      if (ARENA.bumpers) {
        ARENA.bumpers.forEach(bumper => {
          const bumperX = centerX + Math.cos(bumper.angle) * bumper.radius;
          const bumperY = centerY + Math.sin(bumper.angle) * bumper.radius;
          const distToBumper = Math.sqrt((b.x - bumperX) ** 2 + (b.y - bumperY) ** 2);
          
          if (distToBumper < bumper.size + b.radius && bumper.cooldown <= 0) {
            // BUMPER HIT! Push away from bumper
            const pushAngle = Math.atan2(b.y - bumperY, b.x - bumperX);
            const pushForce = 7;
            
            b.vx += Math.cos(pushAngle) * pushForce;
            b.vy += Math.sin(pushAngle) * pushForce;
            
            bumper.cooldown = 0.5; // Half second cooldown
            
            // Visual feedback
            for (let i = 0; i < 15; i++) {
              const angle = (Math.PI * 2 / 15) * i;
              const px = bumperX + Math.cos(angle) * (bumper.size + 10);
              const py = bumperY + Math.sin(angle) * (bumper.size + 10);
              addParticle(px, py, bumper.color, 8);
            }
            
            recordEvent('BUMPER_HIT', {
              bey: beyIndex === 0 ? 'b1' : 'b2',
              bumper: bumper.id
            });
          }
          
          // Decay cooldown
          if (bumper.cooldown > 0) {
            bumper.cooldown -= 1/60;
          }
        });
      }
      // ═══════════════════════════════════════════════════════════
      
      // Check slingshot points - WITH ENHANCED VISUALS
      ARENA.slingshotPoints.forEach(slingshot => {
        const slingshotX = centerX + Math.cos(slingshot.angle) * slingshot.radius;
        const slingshotY = centerY + Math.sin(slingshot.angle) * slingshot.radius;
        const distToSlingshot = Math.sqrt((b.x - slingshotX) ** 2 + (b.y - slingshotY) ** 2);
        
        if (distToSlingshot < 35 && slingshot.cooldown <= 0 && velocity > 4) {
          // SLINGSHOT ACTIVATED - launch to opposite side
          const oppositeAngle = slingshot.angle + Math.PI;
          const launchForce = 18;
          
          b.vx = Math.cos(oppositeAngle) * launchForce;
          b.vy = Math.sin(oppositeAngle) * launchForce;
          
          slingshot.cooldown = 1.5;
          
          // ENHANCED VISUAL: Explosion effect at launch
          for (let i = 0; i < 30; i++) {
            const angle = (Math.PI * 2 / 30) * i;
            const px = slingshotX + Math.cos(angle) * 25;
            const py = slingshotY + Math.sin(angle) * 25;
            addParticle(px, py, '#fbbf24', 12);
            addParticle(px, py, '#ffffff', 8);
          }
          addScreenShake(2.0);
          
          recordEvent('SLINGSHOT_LAUNCH', {
            bey: beyIndex === 0 ? 'b1' : 'b2',
            angle: oppositeAngle
          });
        }
      });
      
      // Orbit-specific physics
      if (currentOrbit === 'inner') {
        // Inner orbit - high speed, high risk
        b.vx *= 0.990; // Low friction
        b.vy *= 0.990;
        
        if (Math.random() < 0.03) {
          addParticle(b.x, b.y, '#c084fc', 5);
        }
      } else if (currentOrbit === 'middle') {
        // Middle orbit - balanced
        b.vx *= 0.985;
        b.vy *= 0.985;
      } else {
        // Outer orbit - safe, stamina recovery
        b.vx *= 0.980; // More friction
        b.vy *= 0.980;
        
        // Stamina recovery in outer orbit
        if (bSpinPercent < 0.9) {
          b.stamina += 0.1;
          b.stamina = Math.min(250, b.stamina); // Cap no máximo
          if (Math.random() < 0.02) {
            addParticle(b.x, b.y, '#8b5cf6', 3);
          }
        }
      }
      
      // Stamina drain based on orbit
      let staminaLoss = 0.12 - ((b.bey?.effectiveStats?.sta || 10) * 0.005);
      
      if (currentOrbit === 'inner') {
        staminaLoss += velocity * 0.015; // High drain in inner orbit
      } else if (currentOrbit === 'middle') {
        staminaLoss += velocity * 0.008;
      } else {
        staminaLoss += velocity * 0.005; // Low drain in outer orbit
        staminaLoss *= 0.7; // 30% less stamina drain in safe zone
      }
      
      // LAD bonus
      if (velocity < 2 && b.bey?.type === 'Stamina') {
        staminaLoss *= 0.6;
        if (isOppositeSpin) staminaLoss *= 0.7;
      }
      
      const hasPerpetual = b.bey?.synergies?.some(s => s?.name?.includes('Perpetual')) || false;
      if (hasPerpetual) staminaLoss -= 0.01;
      
      // ETERNAL SPIN (STA 27+)
      if (b.eternalSpinActive && b.eternalSpinTimer < 300) {
        staminaLoss = 0;
      }
      
      b.stamina -= staminaLoss;
      
      // Wall collision
      if (distToCenter > zones.wall - b.radius) {
        const angle = Math.atan2(b.y - centerY, b.x - centerX);
        b.x = centerX + Math.cos(angle) * (zones.wall - b.radius);
        b.y = centerY + Math.sin(angle) * (zones.wall - b.radius);
        
        const normalX = Math.cos(angle);
        const normalY = Math.sin(angle);
        const dotProduct = b.vx * normalX + b.vy * normalY;
        
        b.vx = b.vx - 2 * dotProduct * normalX;
        b.vy = b.vy - 2 * dotProduct * normalY;
        
        b.vx *= 0.75;
        b.vy *= 0.75;
        b.stamina -= 1.5;
        b.burstDamage += 0.4;
        
        addParticle(b.x, b.y, '#a78bfa', 10);
      }
    }
    
    // ═══════════════════════════════════════════════════════════════
    // SPEEDWAY CIRCUIT - Physics Handler
    // ═══════════════════════════════════════════════════════════════
    function handleSpeedwayCircuitPhysics(b, bSpinPercent, velocity) {
      const zones = ARENA.zones;
      const ovalRatio = ARENA.ovalRatio || 1.6;
      const beyIndex = b === b1 ? 0 : 1;
      const playerNum = beyIndex + 1;
      
      // Calculate distance from center considering oval shape
      const dx = (b.x - centerX) / ovalRatio;
      const dy = b.y - centerY;
      const distToCenter = Math.sqrt(dx * dx + dy * dy);
      
      // ═══ OUTER WALL COLLISION (OVAL) ═══
      if (distToCenter > zones.wall - b.radius) {
        // Calculate angle in oval space
        const angle = Math.atan2(b.y - centerY, (b.x - centerX) / ovalRatio);
        
        // Reposition on boundary (convert back to screen space)
        b.x = centerX + Math.cos(angle) * (zones.wall - b.radius) * ovalRatio;
        b.y = centerY + Math.sin(angle) * (zones.wall - b.radius);
        
        // Calculate normal in oval space
        const normalX = Math.cos(angle);
        const normalY = Math.sin(angle);
        
        // Transform velocity to oval space for reflection
        const vxOval = b.vx / ovalRatio;
        const vyOval = b.vy;
        
        // Reflect velocity
        const dotProduct = vxOval * normalX + vyOval * normalY;
        const vxOvalNew = vxOval - 2 * dotProduct * normalX;
        const vyOvalNew = vyOval - 2 * dotProduct * normalY;
        
        // Transform back to screen space
        b.vx = vxOvalNew * ovalRatio * 0.75;
        b.vy = vyOvalNew * 0.75;
        
        // Apply damage
        b.stamina -= 1.5;
        b.burstDamage += 0.4;
        
        addParticle(b.x, b.y, '#ffffff', 10);
      }
      
      // Boost pads
      ARENA.boostPads.forEach(pad => {
        const distToPad = Math.sqrt((b.x - (centerX + pad.x)) ** 2 + (b.y - (centerY + pad.y)) ** 2);
        
        if (distToPad < pad.radius && pad.cooldown <= 0) {
          // Calculate boost direction tangent to the oval track
          const angleFromCenter = Math.atan2(b.y - centerY, (b.x - centerX) / ovalRatio);
          const tangentAngle = angleFromCenter + Math.PI / 2;
          
          // Apply boost force
          const boostForce = 18.0;
          b.vx += Math.cos(tangentAngle) * boostForce;
          b.vy += Math.sin(tangentAngle) * boostForce;
          
          // Visual feedback
          pad.cooldown = 2.0;
          pad.active = true;
          
          for (let i = 0; i < 20; i++) {
            const angle = (Math.PI * 2 / 20) * i;
            const px = b.x + Math.cos(angle) * 25;
            const py = b.y + Math.sin(angle) * 25;
            addParticle(px, py, '#ffaa00', 12);
          }
          
          recordEvent('BOOST_PAD', { bey: beyIndex === 0 ? 'b1' : 'b2', pad: pad.id });
        }
        
        // Cooldown decay
        if (pad.cooldown > 0) {
          pad.cooldown -= 1/60;
          if (pad.cooldown <= 0) {
            pad.active = false;
          }
        }
      });
      
      // Oil slicks
      ARENA.oilSlicks.forEach(oil => {
        const inOilX = Math.abs((b.x - centerX) - oil.x) < oil.width / 2;
        const inOilY = Math.abs((b.y - centerY) - oil.y) < oil.height / 2;
        
        if (inOilX && inOilY) {
          // Check if this bey is already affected
          const beyKey = `bey${beyIndex}`;
          const existing = oil.active.find(a => a.bey === beyKey);
          
          if (!existing) {
            // Enter oil - start timer
            oil.active.push({ bey: beyKey, timer: 2.0 });
            
            // Visual feedback
            for (let i = 0; i < 10; i++) {
              addParticle(b.x + (Math.random() - 0.5) * 30, b.y + (Math.random() - 0.5) * 30, '#0066aa', 8);
            }
          }
        }
      });
      
      // Apply oil friction reduction
      ARENA.oilSlicks.forEach(oil => {
        oil.active.forEach((affected, idx) => {
          if (affected.bey === `bey${beyIndex}` && affected.timer > 0) {
            // Reduce friction dramatically (almost zero control)
            b.vx *= 1.02; // Accelerate slightly (slippery)
            b.vy *= 1.02;
            
            affected.timer -= 1/60;
            
            // Visual trail
            if (Math.random() < 0.3) {
              addParticle(b.x, b.y, '#0088cc', 6);
            }
            
            if (affected.timer <= 0) {
              oil.active.splice(idx, 1);
            }
          }
        });
      });
      
      // Checkpoint system for lap counting
      const angleFromCenter = Math.atan2(b.y - centerY, (b.x - centerX) / ovalRatio);
      
      ARENA.checkpoints.forEach((cp, cpIdx) => {
        const cpAngle = cp.angle;
        const angleDiff = Math.abs(angleFromCenter - cpAngle);
        const isNearCheckpoint = angleDiff < 0.3 || angleDiff > (Math.PI * 2 - 0.3);
        
        if (isNearCheckpoint && distToCenter > zones.innerTrack && distToCenter < zones.outerTrack) {
          const passedKey = beyIndex === 0 ? 'passed1' : 'passed2';
          const lastCpKey = beyIndex === 0 ? 'player1LastCheckpoint' : 'player2LastCheckpoint';
          const lapsKey = beyIndex === 0 ? 'player1Laps' : 'player2Laps';
          
          if (!cp[passedKey]) {
            // Check if this is the next checkpoint in order
            const lastCp = ARENA.lapSystem[lastCpKey];
            const expectedCp = (lastCp + 1) % 4;
            
            if (cpIdx === expectedCp) {
              cp[passedKey] = true;
              ARENA.lapSystem[lastCpKey] = cpIdx;
              
              // If passing checkpoint 0 (finish line) after completing all others
              if (cpIdx === 0 && lastCp === 3) {
                ARENA.lapSystem[lapsKey]++;
                
                // Visual celebration
                for (let i = 0; i < 30; i++) {
                  const angle = (Math.PI * 2 / 30) * i;
                  const px = b.x + Math.cos(angle) * 30;
                  const py = b.y + Math.sin(angle) * 30;
                  addParticle(px, py, beyIndex === 0 ? '#ff6666' : '#6666ff', 15);
                }
                
                recordEvent('LAP_COMPLETE', { 
                  bey: beyIndex === 0 ? 'b1' : 'b2', 
                  lap: ARENA.lapSystem[lapsKey],
                  target: ARENA.lapSystem.targetLaps
                });
              }
            }
          }
        } else {
          // Reset passed flag when far from checkpoint
          const passedKey = beyIndex === 0 ? 'passed1' : 'passed2';
          cp[passedKey] = false;
        }
      });
      
      // Check lap victory condition
      const lapsKey = beyIndex === 0 ? 'player1Laps' : 'player2Laps';
      if (ARENA.lapSystem[lapsKey] >= ARENA.lapSystem.targetLaps) {
        // This bey won by laps!
        const otherBey = beyIndex === 0 ? b2 : b1;
        otherBey.spinPercent = 0;
        otherBey.stamina = 0;
      }
      
      // Center hole collision
      if (distToCenter < zones.centerHole) {
        // Push bey back out
        const pushAngle = Math.atan2(b.y - centerY, b.x - centerX);
        const pushForce = 5.0;
        b.vx += Math.cos(pushAngle) * pushForce;
        b.vy += Math.sin(pushAngle) * pushForce;
      }
    }
    
    // ═══════════════════════════════════════════════════════════════
    // DOMINATION ZONES - Physics Handler
    // ═══════════════════════════════════════════════════════════════
    function handleDominationZonesPhysics(b, bSpinPercent, velocity) {
      const zones = ARENA.zones;
      const beyIndex = b === b1 ? 0 : 1;
      const playerNum = beyIndex + 1;
      
      // Calculate angle from center
      const angleFromCenter = Math.atan2(b.y - centerY, b.x - centerX);
      const distToCenter = Math.sqrt((b.x - centerX) ** 2 + (b.y - centerY) ** 2);
      
      // ═══ WALL COLLISION ═══
      if (distToCenter > zones.wall - b.radius) {
        const angle = Math.atan2(b.y - centerY, b.x - centerX);
        b.x = centerX + Math.cos(angle) * (zones.wall - b.radius);
        b.y = centerY + Math.sin(angle) * (zones.wall - b.radius);
        
        const normalX = Math.cos(angle);
        const normalY = Math.sin(angle);
        const dotProduct = b.vx * normalX + b.vy * normalY;
        b.vx = b.vx - 2 * dotProduct * normalX;
        b.vy = b.vy - 2 * dotProduct * normalY;
        b.vx *= 0.75;
        b.vy *= 0.75;
        b.stamina -= 1.5;
        b.burstDamage += 0.4;
        
        addParticle(b.x, b.y, '#ffffff', 10);
      }
      
      // Normalize angle to 0-2π
      let normalizedAngle = angleFromCenter;
      if (normalizedAngle < 0) normalizedAngle += Math.PI * 2;
      
      // Determine which zone the bey is in
      if (distToCenter > zones.center && distToCenter < zones.zoneRadius) {
        ARENA.dominationZones.forEach(zone => {
          const zoneStartAngle = zone.angle - zone.arcWidth / 2;
          let zoneEndAngle = zone.angle + zone.arcWidth / 2;
          
          // Handle wrap-around
          let inZone = false;
          if (zoneEndAngle > Math.PI * 2) {
            zoneEndAngle -= Math.PI * 2;
            inZone = (normalizedAngle >= zoneStartAngle || normalizedAngle <= zoneEndAngle);
          } else {
            inZone = (normalizedAngle >= zoneStartAngle && normalizedAngle <= zoneEndAngle);
          }
          
          if (inZone) {
            // Apply zone bonuses
            const bonus = ARENA.colors;
            
            if (zone.type === 'ATK') {
              // Attack bonus: more damage on collisions (handled in collision code)
              b.atkBonus = 1.2;
            } else if (zone.type === 'DEF') {
              // Defense bonus: less damage taken (handled in collision code)
              b.defBonus = 0.85;
            } else if (zone.type === 'SPEED') {
              // Speed bonus: +25% velocity
              const speedMult = 1.015;
              b.vx *= speedMult;
              b.vy *= speedMult;
              
              if (Math.random() < 0.1) {
                addParticle(b.x, b.y, '#ffff44', 6);
              }
            } else if (zone.type === 'SPIN') {
              // Spin bonus: slower spin decay
              b.stamina += 0.05;
              b.spinPercent = Math.min(100, b.spinPercent + 0.02);
              
              if (Math.random() < 0.1) {
                addParticle(b.x, b.y, '#44ff44', 6);
              }
            }
            
            // Capture progress
            if (zone.owner !== playerNum) {
              zone.captureProgress += 1/60;
              
              if (zone.captureProgress >= ARENA.captureTime) {
                // Zone captured!
                zone.owner = playerNum;
                zone.captureProgress = 0;
                
                // Visual celebration
                for (let i = 0; i < 20; i++) {
                  const angle = (Math.PI * 2 / 20) * i;
                  const px = b.x + Math.cos(angle) * 30;
                  const py = b.y + Math.sin(angle) * 30;
                  const color = playerNum === 1 ? '#ff6666' : '#6666ff';
                  addParticle(px, py, color, 12);
                }
                
                recordEvent('ZONE_CAPTURED', { 
                  bey: beyIndex === 0 ? 'b1' : 'b2',
                  zone: zone.id,
                  type: zone.type
                });
                
                // Check victory condition
                const ownedZones = ARENA.dominationZones.filter(z => z.owner === playerNum).length;
                if (ownedZones >= ARENA.targetZones) {
                  // Victory by domination!
                  const otherBey = beyIndex === 0 ? b2 : b1;
                  otherBey.spinPercent = 0;
                  otherBey.stamina = 0;
                }
              }
            } else {
              // Reset capture progress if owner is in their own zone
              zone.captureProgress = 0;
            }
          }
        });
      }
      
      // Reset bonuses if not in a zone
      if (distToCenter <= zones.center || distToCenter >= zones.zoneRadius) {
        b.atkBonus = 1.0;
        b.defBonus = 1.0;
      }
    }
    
    // ═══════════════════════════════════════════════════════════════
    // TIDAL SURGE - Physics Handler
    // ═══════════════════════════════════════════════════════════════
    function handleTidalSurgePhysics(b, bSpinPercent, velocity) {
      const zones = ARENA.zones;
      const tide = ARENA.tideSystem;
      const distToCenter = Math.sqrt((b.x - centerX) ** 2 + (b.y - centerY) ** 2);
      
      // ═══ WALL COLLISION ═══
      if (distToCenter > zones.wall - b.radius) {
        const angle = Math.atan2(b.y - centerY, b.x - centerX);
        b.x = centerX + Math.cos(angle) * (zones.wall - b.radius);
        b.y = centerY + Math.sin(angle) * (zones.wall - b.radius);
        
        const normalX = Math.cos(angle);
        const normalY = Math.sin(angle);
        const dotProduct = b.vx * normalX + b.vy * normalY;
        b.vx = b.vx - 2 * dotProduct * normalX;
        b.vy = b.vy - 2 * dotProduct * normalY;
        b.vx *= 0.75;
        b.vy *= 0.75;
        b.stamina -= 1.5;
        b.burstDamage += 0.4;
        
        addParticle(b.x, b.y, '#ffffff', 10);
      }
      
      // Apply friction based on tide phase and position
      if (distToCenter < tide.floodRadius) {
        // In flooded area - high friction
        const frictionMult = tide.phase === 'high' ? 0.94 : 0.96;
        b.vx *= frictionMult;
        b.vy *= frictionMult;
        
        // Visual water splash
        if (Math.random() < 0.15) {
          addParticle(b.x + (Math.random() - 0.5) * 20, b.y + (Math.random() - 0.5) * 20, '#88bbff', 8);
        }
        
        // Stamina drain in water
        b.stamina -= 0.08;
      } else {
        // Outside water - normal friction
        b.vx *= 0.9985;
        b.vy *= 0.9985;
      }
      
      // Water current effect during rising/high tide
      if (tide.phase === 'rising' || tide.phase === 'high') {
        if (distToCenter < tide.floodRadius) {
          // Circular current pulls toward center
          const angleToCenter = Math.atan2(centerY - b.y, centerX - b.x);
          const currentForce = tide.phase === 'high' ? 0.5 : 0.25;
          
          b.vx += Math.cos(angleToCenter) * currentForce;
          b.vy += Math.sin(angleToCenter) * currentForce;
        }
      }
    }
    
    // ═══════════════════════════════════════════════════════════════
    // STORM TRACK - Physics Handler
    // ═══════════════════════════════════════════════════════════════
    function handleStormTrackPhysics(b, bSpinPercent, velocity) {
      const zones = ARENA.zones;
      const storm = ARENA.stormSystem;
      const distToCenter = Math.sqrt((b.x - centerX) ** 2 + (b.y - centerY) ** 2);
      
      // ═══ WALL COLLISION ═══
      if (distToCenter > zones.wall - b.radius) {
        const angle = Math.atan2(b.y - centerY, b.x - centerX);
        b.x = centerX + Math.cos(angle) * (zones.wall - b.radius);
        b.y = centerY + Math.sin(angle) * (zones.wall - b.radius);
        
        const normalX = Math.cos(angle);
        const normalY = Math.sin(angle);
        const dotProduct = b.vx * normalX + b.vy * normalY;
        b.vx = b.vx - 2 * dotProduct * normalX;
        b.vy = b.vy - 2 * dotProduct * normalY;
        b.vx *= 0.75;
        b.vy *= 0.75;
        b.stamina -= 1.5;
        b.burstDamage += 0.4;
        
        addParticle(b.x, b.y, '#ffffff', 10);
      }
      
      // ═══ BOWL EFFECT - Gravitational pull toward center ═══
      const angleToCenter = Math.atan2(centerY - b.y, centerX - b.x);
      
      // Stronger pull the farther from center (bowl gets steeper)
      if (distToCenter > zones.center) {
        const bowlStrength = 0.08; // Força da tigela
        const distanceRatio = (distToCenter - zones.center) / (zones.wall - zones.center);
        const pullForce = bowlStrength * distanceRatio;
        
        b.vx += Math.cos(angleToCenter) * pullForce;
        b.vy += Math.sin(angleToCenter) * pullForce;
        
        // Visual feedback - particles rolling down the bowl
        if (Math.random() < 0.05 && distanceRatio > 0.5) {
          addParticle(b.x, b.y, '#888888', 4);
        }
      }
      
      // Check if wave is active
      if (storm.waveActive) {
        // Calculate bey's movement direction
        const beyDirection = Math.atan2(b.vy, b.vx);
        const waveDirection = storm.waveDirection;
        
        // Calculate angle difference between bey direction and wave direction
        let angleDiff = beyDirection - waveDirection;
        
        // Normalize to -π to π
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        
        // If moving same direction as wave (within 60 degrees)
        if (Math.abs(angleDiff) < Math.PI / 3) {
          // Boost!
          const boostMult = 1.08;
          b.vx *= boostMult;
          b.vy *= boostMult;
          
          // Visual trail
          if (Math.random() < 0.3) {
            addParticle(b.x, b.y, '#00ffff', 10);
          }
        }
        // If moving opposite direction (within 60 degrees of opposite)
        else if (Math.abs(angleDiff) > 2 * Math.PI / 3) {
          // Slow down!
          const slowMult = 0.93;
          b.vx *= slowMult;
          b.vy *= slowMult;
          
          // Visual resistance
          if (Math.random() < 0.3) {
            addParticle(b.x, b.y, '#ff6666', 8);
          }
        }
      }
    }
    
    function drawColosseumCarnage() {
      // COLOSSEUM CARNAGE: Gladiatorial arena with 3 gates and moving obstacles
      const zones = ARENA.zones;
      const colors = ARENA.colors;
      const time = Date.now() * 0.001;
      if (!zones || !colors) return;

      const cx = ensureFinite(500, 500);
      const cy = ensureFinite(350, 350);

      // Outer wall (stone colosseum)
      ctx.fillStyle = '#3a2820';
      ctx.beginPath();
      ctx.arc(cx, cy, zones.wall, 0, Math.PI * 2);
      ctx.fill();

      // Outer danger zone ring
      const outerGrad = ctx.createRadialGradient(cx, cy, zones.dangerZone, cx, cy, zones.wall);
      outerGrad.addColorStop(0, colors.outer || '#4a3830');
      outerGrad.addColorStop(1, '#3a2820');
      ctx.fillStyle = outerGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, zones.wall, 0, Math.PI * 2);
      ctx.fill();

      // Main battle area
      const mainGrad = ctx.createRadialGradient(cx, cy, zones.centerSafe, cx, cy, zones.mainArea);
      mainGrad.addColorStop(0, colors.inner || '#3a2820');
      mainGrad.addColorStop(1, colors.outer || '#4a3830');
      ctx.fillStyle = mainGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, zones.mainArea, 0, Math.PI * 2);
      ctx.fill();

      // Sand floor center
      const centerGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, zones.centerSafe);
      centerGrad.addColorStop(0, '#8b6914');
      centerGrad.addColorStop(1, colors.center || '#2a1810');
      ctx.fillStyle = centerGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, zones.centerSafe, 0, Math.PI * 2);
      ctx.fill();

      // Stone tile texture
      ctx.strokeStyle = 'rgba(80, 60, 40, 0.3)';
      ctx.lineWidth = 0.8;
      const tileSize = 20;
      for (let tx = -zones.wall; tx <= zones.wall; tx += tileSize) {
        for (let ty = -zones.wall; ty <= zones.wall; ty += tileSize) {
          const d = Math.sqrt(tx*tx + ty*ty);
          if (d <= zones.mainArea) {
            ctx.beginPath();
            ctx.rect(cx + tx, cy + ty, tileSize, tileSize);
            ctx.stroke();
          }
        }
      }

      // Draw 3 gates
      ARENA.gates.forEach((gate, idx) => {
        const gx = cx + gate.x * (zones.wall / 200);
        const gy = cy + gate.y * (zones.wall / 200);

        ctx.save();
        ctx.translate(gx, gy);
        ctx.rotate(gate.angle);

        // Gate frame
        ctx.fillStyle = gate.open ? '#cc2200' : colors.gate || '#8b0000';
        ctx.fillRect(-20, -12, 40, 24);

        // Gate bars
        if (!gate.open) {
          ctx.strokeStyle = '#4a0000';
          ctx.lineWidth = 3;
          for (let bar = -15; bar <= 15; bar += 8) {
            ctx.beginPath();
            ctx.moveTo(bar, -12);
            ctx.lineTo(bar, 12);
            ctx.stroke();
          }
        } else {
          // Open gate - pulsing glow
          ctx.fillStyle = `rgba(255,50,0,${0.4 + Math.sin(time * 8) * 0.3})`;
          ctx.fillRect(-20, -12, 40, 24);
        }
        ctx.restore();

        // Gate label
        ctx.fillStyle = gate.open ? '#ff4500' : 'rgba(200,100,50,0.7)';
        ctx.font = 'bold 9px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`GATE ${idx + 1}`, gx, gy - 16);
      });

      // Draw active obstacles (rolling boulders/crushers)
      ARENA.obstacles.forEach(obs => {
        if (!obs.active) return;
        const ox = cx + obs.x;
        const oy = cy + obs.y;

        // Obstacle shadow
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.beginPath();
        ctx.ellipse(ox + 4, oy + 4, obs.radius, obs.radius * 0.6, 0, 0, Math.PI * 2);
        ctx.fill();

        // Obstacle body (spinning crusher)
        ctx.save();
        ctx.translate(ox, oy);
        ctx.rotate(time * 3);
        const obsGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, obs.radius);
        obsGrad.addColorStop(0, '#ff6633');
        obsGrad.addColorStop(0.6, colors.obstacle || '#ff4500');
        obsGrad.addColorStop(1, '#cc2200');
        ctx.fillStyle = obsGrad;
        ctx.beginPath();
        ctx.arc(0, 0, obs.radius, 0, Math.PI * 2);
        ctx.fill();

        // Spike pattern
        ctx.strokeStyle = '#ff9966';
        ctx.lineWidth = 2;
        for (let i = 0; i < 8; i++) {
          const a = (Math.PI * 2 / 8) * i;
          ctx.beginPath();
          ctx.moveTo(Math.cos(a) * 8, Math.sin(a) * 8);
          ctx.lineTo(Math.cos(a) * obs.radius, Math.sin(a) * obs.radius);
          ctx.stroke();
        }
        ctx.restore();

        // Danger warning pulse
        ctx.strokeStyle = `rgba(255,50,0,${0.3 + Math.sin(time * 10) * 0.3})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(ox, oy, obs.radius + 8, 0, Math.PI * 2);
        ctx.stroke();
      });

      // Zone rings
      ctx.strokeStyle = `rgba(200,50,0,${0.4 + Math.sin(time * 2) * 0.2})`;
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 6]);
      ctx.beginPath();
      ctx.arc(cx, cy, zones.dangerZone, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      // Outer wall ring
      ctx.strokeStyle = '#6b4030';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(cx, cy, zones.wall, 0, Math.PI * 2);
      ctx.stroke();

      // Gate timer
      const currentTime = Date.now() / 1000;
      const sinceGate = currentTime - (ARENA.lastGateTime || 0);
      const toNextGate = Math.max(0, ARENA.gateInterval - sinceGate);
      ctx.fillStyle = 'rgba(255,100,0,0.8)';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`⚔️ GATE OPENS IN: ${toNextGate.toFixed(1)}s`, cx, cy - zones.wall - 12);

      // Arena name
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.font = 'bold 18px sans-serif';
      ctx.fillText(ARENA.name, cx, cy - zones.wall - 30);
    }

    function drawKillerSidesArena() {
      const zones = ARENA.zones;
      const colors = ARENA.colors;
      const time = Date.now() * 0.001;
      
      // Validate zones
      if (!zones || !colors) return;
      
      const centerX = ensureFinite(500, 500);
      const centerY = ensureFinite(350, 350);
      
      // Outer wall
      ctx.fillStyle = colors.wall;
      ctx.beginPath();
      ctx.arc(centerX, centerY, zones.wall, 0, Math.PI * 2);
      ctx.fill();
      
      // Outer slope
      ctx.fillStyle = colors.outer;
      ctx.beginPath();
      ctx.arc(centerX, centerY, zones.outerSlope, 0, Math.PI * 2);
      ctx.fill();
      
      // Tornado ridge
      ctx.fillStyle = colors.ridge;
      ctx.beginPath();
      ctx.arc(centerX, centerY, zones.tornadoRidge, 0, Math.PI * 2);
      ctx.fill();
      
      // Inner slope
      ctx.fillStyle = colors.inner;
      ctx.beginPath();
      ctx.arc(centerX, centerY, zones.innerSlope, 0, Math.PI * 2);
      ctx.fill();
      
      // Center bowl
      ctx.fillStyle = colors.center;
      ctx.beginPath();
      ctx.arc(centerX, centerY, zones.centerBowl, 0, Math.PI * 2);
      ctx.fill();
      
      // GRIP CIRCULAR TRACK (green dashed line, almost complete circle)
      const gripPulse = 0.8 + Math.sin(time * 3) * 0.2;
      ctx.globalAlpha = gripPulse;
      
      // Calculate ramp angles
      const rampStart = ARENA.gripRampAngle - ARENA.gripRampWidth / 2;
      const rampEnd = ARENA.gripRampAngle + ARENA.gripRampWidth / 2;
      
      // Draw grip track (excluding ramp gap)
      ctx.strokeStyle = colors.grip;
      ctx.lineWidth = 8;
      ctx.setLineDash([15, 8]);
      ctx.beginPath();
      ctx.arc(centerX, centerY, zones.gripRadius, rampEnd, rampStart + Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      
      // Draw grip glow
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.4)';
      ctx.lineWidth = 16;
      ctx.setLineDash([15, 8]);
      ctx.beginPath();
      ctx.arc(centerX, centerY, zones.gripRadius, rampEnd, rampStart + Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      
      ctx.globalAlpha = 1;
      
      // RAMP/GAP (red arc pointing to center)
      const rampPulse = 0.9 + Math.sin(time * 4) * 0.1;
      ctx.globalAlpha = rampPulse;
      
      // Ramp arc
      ctx.strokeStyle = colors.ramp;
      ctx.lineWidth = 10;
      ctx.beginPath();
      ctx.arc(centerX, centerY, zones.gripRadius, rampStart, rampEnd);
      ctx.stroke();
      
      // Ramp glow
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.5)';
      ctx.lineWidth = 18;
      ctx.beginPath();
      ctx.arc(centerX, centerY, zones.gripRadius, rampStart, rampEnd);
      ctx.stroke();
      
      // Arrow pointing to center from ramp
      const arrowAngle = ARENA.gripRampAngle;
      const arrowStartX = centerX + Math.cos(arrowAngle) * zones.gripRadius;
      const arrowStartY = centerY + Math.sin(arrowAngle) * zones.gripRadius;
      const arrowEndX = centerX + Math.cos(arrowAngle) * (zones.gripRadius - 40);
      const arrowEndY = centerY + Math.sin(arrowAngle) * (zones.gripRadius - 40);
      
      // Arrow line
      ctx.strokeStyle = colors.ramp;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(arrowStartX, arrowStartY);
      ctx.lineTo(arrowEndX, arrowEndY);
      ctx.stroke();
      
      // Arrow head
      const arrowSize = 12;
      const arrowHeadAngle1 = arrowAngle + Math.PI + 0.3;
      const arrowHeadAngle2 = arrowAngle + Math.PI - 0.3;
      ctx.beginPath();
      ctx.moveTo(arrowEndX, arrowEndY);
      ctx.lineTo(
        arrowEndX + Math.cos(arrowHeadAngle1) * arrowSize,
        arrowEndY + Math.sin(arrowHeadAngle1) * arrowSize
      );
      ctx.moveTo(arrowEndX, arrowEndY);
      ctx.lineTo(
        arrowEndX + Math.cos(arrowHeadAngle2) * arrowSize,
        arrowEndY + Math.sin(arrowHeadAngle2) * arrowSize
      );
      ctx.stroke();
      
      ctx.globalAlpha = 1;
      
      // Center target marker (X)
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      const crossSize = 10;
      ctx.beginPath();
      ctx.moveTo(centerX - crossSize, centerY - crossSize);
      ctx.lineTo(centerX + crossSize, centerY + crossSize);
      ctx.moveTo(centerX + crossSize, centerY - crossSize);
      ctx.lineTo(centerX - crossSize, centerY + crossSize);
      ctx.stroke();
      
      // Arena wall outline
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(centerX, centerY, zones.wall, 0, Math.PI * 2);
      ctx.stroke();
      
      // Arena name
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.font = 'bold 18px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(ARENA.name, centerX, centerY - zones.wall - 30);
      
      // Info text
      ctx.fillStyle = 'rgba(16, 185, 129, 0.8)';
      ctx.font = 'bold 13px sans-serif';
      ctx.fillText('🌀 GRIP → CAPTURA LENTA → LANÇA AO CENTRO 🌀', centerX, centerY - zones.wall - 12);
    }
    
    function drawCircularArena() {
      const zones = ARENA.zones;
      const colors = ARENA.colors;
      if (!zones || !colors) return;

      const cx = ensureFinite(500, 500);
      const cy = ensureFinite(350, 350);
      const t  = Date.now();

      // ── LAYER 0: outer plate / wall ───────────────────────────────
      const wallGrad = ctx.createRadialGradient(cx, cy - 40, 60, cx, cy, zones.wall + 10);
      wallGrad.addColorStop(0,   '#2a3040');
      wallGrad.addColorStop(0.6, colors.wall || '#3a4556');
      wallGrad.addColorStop(1,   '#1a2030');
      ctx.fillStyle = wallGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, ensureFinite(zones.wall, 221), 0, Math.PI * 2);
      ctx.fill();

      // ── LAYER 1: outer slope ──────────────────────────────────────
      const outerGrad = ctx.createRadialGradient(cx, cy - 30, 40, cx, cy, zones.outerSlope);
      outerGrad.addColorStop(0,   '#3a4860');
      outerGrad.addColorStop(1,   colors.outer || '#4a5568');
      ctx.fillStyle = outerGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, ensureFinite(zones.outerSlope, 195), 0, Math.PI * 2);
      ctx.fill();

      // ── LAYER 2: tornado ridge — metallic band ────────────────────
      const ridgeGrad = ctx.createRadialGradient(cx, cy, zones.tornadoRidge - 18, cx, cy, zones.tornadoRidge + 8);
      ridgeGrad.addColorStop(0, '#505878');
      ridgeGrad.addColorStop(0.5, '#6a7a9a');
      ridgeGrad.addColorStop(1, colors.outer || '#4a5568');
      ctx.fillStyle = ridgeGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, ensureFinite(zones.tornadoRidge, 163), 0, Math.PI * 2);
      ctx.fill();

      // Ridge pulsing warning ring
      const pulseI = 0.45 + Math.sin(t * 0.005) * 0.28;
      ctx.save();
      ctx.globalAlpha = pulseI;
      ctx.strokeStyle = '#ffaa00';
      ctx.lineWidth = 6;
      ctx.shadowBlur = 14;
      ctx.shadowColor = '#ff7700';
      ctx.beginPath();
      ctx.arc(cx, cy, zones.tornadoRidge, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = pulseI * 0.5;
      ctx.strokeStyle = '#ff6600';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(cx, cy, zones.tornadoRidge - 6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // ── LAYER 3: inner slope ──────────────────────────────────────
      const innerGrad = ctx.createRadialGradient(cx, cy - 20, 20, cx, cy, zones.innerSlope);
      innerGrad.addColorStop(0, '#4a5870');
      innerGrad.addColorStop(1, colors.inner || '#5a6b7f');
      ctx.fillStyle = innerGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, ensureFinite(zones.innerSlope, 104), 0, Math.PI * 2);
      ctx.fill();

      // ── LAYER 4: center bowl — deep concave look ──────────────────
      const centerGrad = ctx.createRadialGradient(cx - 8, cy - 10, 0, cx, cy, zones.centerBowl);
      centerGrad.addColorStop(0,   '#8a9ab8');
      centerGrad.addColorStop(0.4, colors.center || '#6a7b8f');
      centerGrad.addColorStop(1,   colors.inner  || '#5a6b7f');
      ctx.fillStyle = centerGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, ensureFinite(zones.centerBowl, 39), 0, Math.PI * 2);
      ctx.fill();

      // ── HEX TILE GRID — confined within wall radius ───────────────
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, zones.wall - 2, 0, Math.PI * 2);
      ctx.clip();

      const hexSize = 18;
      const hexH    = hexSize * Math.sqrt(3);
      const hexCols = Math.ceil((zones.wall * 2) / (hexSize * 1.5)) + 2;
      const hexRows = Math.ceil((zones.wall * 2) / hexH) + 2;
      const startX  = cx - zones.wall - hexSize;
      const startY  = cy - zones.wall - hexH;

      for (let row = 0; row < hexRows; row++) {
        for (let col = 0; col < hexCols; col++) {
          const hx = startX + col * hexSize * 1.5;
          const hy = startY + row * hexH + (col % 2 === 0 ? 0 : hexH / 2);
          const dist = Math.sqrt((hx - cx) ** 2 + (hy - cy) ** 2);
          if (dist > zones.wall + hexSize) continue;

          // Brightness varies with distance from center — inner tiles brighter
          const brightness = 1 - dist / (zones.wall * 1.1);
          const hexAlpha = 0.055 + brightness * 0.04;

          ctx.globalAlpha = hexAlpha;
          ctx.strokeStyle = 'rgba(180,200,255,1)';
          ctx.lineWidth = 0.5;
          ctx.beginPath();
          for (let v = 0; v < 6; v++) {
            const va = (Math.PI / 3) * v - Math.PI / 6;
            const vx = hx + hexSize * 0.92 * Math.cos(va);
            const vy = hy + hexSize * 0.92 * Math.sin(va);
            if (v === 0) ctx.moveTo(vx, vy); else ctx.lineTo(vx, vy);
          }
          ctx.closePath();
          ctx.stroke();
        }
      }
      ctx.restore();
      ctx.globalAlpha = 1;

      // ── RADIAL LINES — subtle depth indicator ─────────────────────
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, zones.wall - 1, 0, Math.PI * 2);
      ctx.clip();
      ctx.strokeStyle = 'rgba(255,255,255,0.04)';
      ctx.lineWidth = 1;
      for (let i = 0; i < 24; i++) {
        const a = (Math.PI * 2 / 24) * i;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * 22, cy + Math.sin(a) * 22);
        ctx.lineTo(cx + Math.cos(a) * (zones.wall - 4), cy + Math.sin(a) * (zones.wall - 4));
        ctx.stroke();
      }
      ctx.restore();

      // ── SWEET SPOTS ───────────────────────────────────────────────
      if (ARENA.sweetSpots) {
        ARENA.sweetSpots.forEach((spot, idx) => {
          const sx = cx + Math.cos(spot.angle) * spot.radius;
          const sy = cy + Math.sin(spot.angle) * spot.radius;
          const sp = 0.5 + Math.sin(t * 0.004 + idx * 2.1) * 0.35;
          ctx.save();
          ctx.shadowBlur  = 12 * sp;
          ctx.shadowColor = '#00ff88';
          ctx.strokeStyle = `rgba(0,255,136,${sp * 0.7})`;
          ctx.lineWidth   = 1.5;
          ctx.beginPath(); ctx.arc(sx, sy, 10, 0, Math.PI * 2); ctx.stroke();
          ctx.beginPath(); ctx.arc(sx, sy, 16, 0, Math.PI * 2); ctx.stroke();
          ctx.restore();
        });
      }

      // ── EXITS — destination-out holes ─────────────────────────────
      if (ARENA.exits.length > 0) {
        const currentBattleTime = (Date.now() - battleStartTimeRef.current) / 1000;
        if (!ARENA.exitsOpen && currentBattleTime >= ARENA.exitsOpenTime) ARENA.exitsOpen = true;
        if (ARENA.exitRing && ARENA.exitsOpen) ARENA.exitRing.currentAngle += ARENA.exitRing.rotationSpeed * ARENA.exitRing.direction;
        const rotOffset = ARENA.exitRing ? ARENA.exitRing.currentAngle : 0;

        if (ARENA.exitsOpen) {
          ctx.globalCompositeOperation = 'destination-out';
          ARENA.exits.forEach(exit => {
            const currentBattleTimeExit = (Date.now() - battleStartTimeRef.current) / 1000;
            const isGraceArenaExit = arenaType === 'BB10_COMPETITIVE';
            const effectiveWidthExit = (isGraceArenaExit && ARENA.gracePeriod?.enabled && currentBattleTimeExit < ARENA.gracePeriod.duration)
              ? exit.width * ARENA.gracePeriod.exitMultiplier
              : exit.width;
            if (effectiveWidthExit <= 0) return; // visualmente fechado
            const halfA = (effectiveWidthExit / 25) * 0.3;
            const baseAngle = exit.angle + rotOffset;
            ctx.save();
            ctx.translate(screenShake.x, screenShake.y);
            ctx.fillStyle = '#000';
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.arc(cx, cy, zones.wall + 20, baseAngle - halfA, baseAngle + halfA);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
          });
          ctx.globalCompositeOperation = 'source-over';

          // Danger edge glow around exits
          ARENA.exits.forEach(exit => {
          const currentBattleTimeGlow = (Date.now() - battleStartTimeRef.current) / 1000;
          const isGraceArenaGlow = arenaType === 'BB10_COMPETITIVE';
          const effectiveWidthGlow = (isGraceArenaGlow && ARENA.gracePeriod?.enabled && currentBattleTimeGlow < ARENA.gracePeriod.duration)
            ? exit.width * ARENA.gracePeriod.exitMultiplier
            : exit.width;
          if (effectiveWidthGlow <= 0) return; // sem glow se fechado
          const halfA = (effectiveWidthGlow / 25) * 0.3;
          const baseAngle = exit.angle + rotOffset;
          const startAngle = baseAngle - halfA;
          const endAngle = baseAngle + halfA;

          // Dark void behind the exit
          ctx.fillStyle = '#000000';
          ctx.beginPath();
          ctx.moveTo(centerX, centerY);
          ctx.arc(centerX, centerY, zones.wall + 25, startAngle, endAngle);
          ctx.closePath();
          ctx.fill();

          // Exit edge glow (danger indicator)
          ctx.strokeStyle = '#ff0000';
          ctx.lineWidth = 4;
          ctx.globalAlpha = 0.6 + Math.sin(Date.now() * 0.008) * 0.3;
          ctx.beginPath();
          ctx.arc(centerX, centerY, zones.wall + 2, startAngle, endAngle);
          ctx.stroke();
          ctx.globalAlpha = 1;

          // Exit marker - pulsing warning at the opening
          const markerAngle = baseAngle;
          const markerX = centerX + Math.cos(markerAngle) * (zones.wall + 15);
          const markerY = centerY + Math.sin(markerAngle) * (zones.wall + 15);
          const markerSize = 8 + Math.sin(Date.now() * 0.008) * 2;
          ctx.fillStyle = '#ff0000';
          ctx.beginPath();
          ctx.arc(markerX, markerY, markerSize, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#ffaa00';
          ctx.lineWidth = 2;
          ctx.stroke();

          // Warning arrows pointing OUT
          for (let i = 0; i < 2; i++) {
            const arrowDist = zones.wall - 20 - (i * 20);
            const arrowX = centerX + Math.cos(markerAngle) * arrowDist;
            const arrowY = centerY + Math.sin(markerAngle) * arrowDist;

            ctx.fillStyle = `rgba(255, 170, 0, ${0.5 - i * 0.15})`;
            ctx.save();
            ctx.translate(arrowX, arrowY);
            ctx.rotate(markerAngle);
            ctx.beginPath();
            ctx.moveTo(8, 0);
            ctx.lineTo(-4, -6);
            ctx.lineTo(-4, 6);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
          }

          // Draw the outer ring arc BETWEEN exits (the solid wall portion)
          // to reinforce the "rotating ring" look
          const nextAngle = endAngle;
          ctx.strokeStyle = 'rgba(180,180,200,0.25)';
          ctx.lineWidth = 6;
          ctx.beginPath();
          ctx.arc(centerX, centerY, zones.wall - 3, startAngle - 0.03, startAngle + 0.03);
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(centerX, centerY, zones.wall - 3, endAngle - 0.03, endAngle + 0.03);
          ctx.stroke();
        });

        // Small rotation indicator text
        const rotDir = ARENA.exitRing?.direction > 0 ? '↻' : '↺';
        ctx.fillStyle = 'rgba(180,180,220,0.55)';
        ctx.font = '11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`${rotDir} EXIT RING ROTATES`, centerX, centerY - zones.wall - 12);
        } else {
          // Exits ainda fechados - mostrar indicador
          const currentBattleTime = (Date.now() - battleStartTimeRef.current) / 1000;
          ctx.fillStyle = 'rgba(255,100,100,0.7)';
          ctx.font = '14px sans-serif';
          ctx.textAlign = 'center';
          const timeLeft = (ARENA.exitsOpenTime - currentBattleTime).toFixed(1);
          ctx.fillText(`🔒 EXITS OPEN IN ${timeLeft}s`, centerX, centerY - zones.wall - 12);
        }
      }
      
      // Arena wall ring (what remains after exits are cut)
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 5;
      ctx.globalCompositeOperation = 'destination-over';
      ctx.beginPath();
      ctx.arc(centerX, centerY, zones.wall, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalCompositeOperation = 'source-over';
      
      // ── RED DANGER RING — pulsa mais rápido quando bey está perto ──
      const b1Dist = Math.sqrt((b1.x - centerX) ** 2 + (b1.y - centerY) ** 2);
      const b2Dist = Math.sqrt((b2.x - centerX) ** 2 + (b2.y - centerY) ** 2);
      const closestDist = Math.min(b1Dist, b2Dist);
      const dangerProximity = Math.max(0, (closestDist - zones.outerSlope) / (zones.wall - zones.outerSlope));
      const ringTime = Date.now() * 0.001;
      const pulseSpeed = 2 + (1 - dangerProximity) * 6;
      const ringAlpha = 0.4 + Math.sin(ringTime * pulseSpeed) * 0.35;
      const ringWidth = 4 + (1 - dangerProximity) * 6;
      
      ctx.save();
      ctx.shadowBlur = 15 + (1 - dangerProximity) * 20;
      ctx.shadowColor = '#ff0000';
      ctx.strokeStyle = `rgba(255, 0, 0, ${ringAlpha})`;
      ctx.lineWidth = ringWidth;
      ctx.beginPath();
      ctx.arc(centerX, centerY, zones.wall - 2, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      
      // ── RING-OUT SPEED INDICATOR ──
      [[b1, bey1], [b2, bey2]].forEach(([b, bey], idx) => {
        if (!b.alive) return;
        const bDist = Math.sqrt((b.x - centerX) ** 2 + (b.y - centerY) ** 2);
        if (bDist > zones.outerSlope) {
          const bVel = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
          const ringOutThreshold = 8.5;
          const dangerPct = Math.min(1, bVel / ringOutThreshold);
          
          const labelX = centerX + (idx === 0 ? -130 : 130);
          const labelY = centerY + 100;
          
          ctx.fillStyle = 'rgba(0,0,0,0.8)';
          ctx.fillRect(labelX - 55, labelY - 24, 110, 40);
          
          ctx.strokeStyle = dangerPct > 0.8 ? '#ff0000' : dangerPct > 0.5 ? '#ff6600' : '#ffaa00';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(labelX - 55, labelY - 24, 110, 40);
          
          ctx.font = 'bold 11px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillStyle = '#ffffff';
          ctx.fillText('⚠ PERIGO DE RING-OUT', labelX, labelY - 8);
          
          ctx.fillStyle = 'rgba(255,255,255,0.15)';
          ctx.fillRect(labelX - 45, labelY + 2, 90, 8);
          const barColor = dangerPct > 0.8 ? '#ff0000' : dangerPct > 0.5 ? '#ff6600' : '#ffd700';
          ctx.fillStyle = barColor;
          ctx.fillRect(labelX - 45, labelY + 2, 90 * dangerPct, 8);
          
          if (dangerPct > 0.85) {
            ctx.globalAlpha = 0.3 + Math.sin(ringTime * 12) * 0.25;
            ctx.fillStyle = '#ff0000';
            ctx.fillRect(labelX - 55, labelY - 24, 110, 40);
            ctx.globalAlpha = 1;
          }
        }
      });
      ctx.textAlign = 'center';
      
      // Arena name
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.font = 'bold 18px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(ARENA.name, centerX, centerY - zones.wall - 30);
      
      // Warning text
      ctx.fillStyle = 'rgba(255, 80, 80, 0.9)';
      ctx.font = 'bold 14px sans-serif';
      ctx.fillText('🔴 ANEL INTEIRO ELIMINA EM ALTA VELOCIDADE 🔴', centerX, centerY - zones.wall - 12);
    }
    
    function drawOctagonalArena() {
      const nexusZones = ARENA.zones;
      const nexusColors = ARENA.colors;
      const zones = ARENA.zones;
      const colors = ARENA.colors;
      
      // Validate zones
      if (!nexusZones || !nexusColors) return;
      
      const centerX = ensureFinite(500, 500);
      const centerY = ensureFinite(350, 350);
      
      // Draw octagonal floor
      ctx.fillStyle = nexusColors.floor;
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const angle = (Math.PI * 2 / 8) * i - Math.PI / 8;
        const x = centerX + Math.cos(angle) * nexusZones.wall;
        const y = centerY + Math.sin(angle) * nexusZones.wall;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
      
      // Draw main area
      ctx.fillStyle = nexusColors.main;
      ctx.beginPath();
      ctx.arc(centerX, centerY, nexusZones.mainArea, 0, Math.PI * 2);
      ctx.fill();
      
      // Draw center safe zone
      const centerGradient = ctx.createRadialGradient(
        centerX, centerY, 0, 
        centerX, centerY, ensureFinite(nexusZones.centerSafe, 40)
      );
      centerGradient.addColorStop(0, nexusColors.center);
      centerGradient.addColorStop(1, nexusColors.main);
      ctx.fillStyle = centerGradient;
      ctx.beginPath();
      ctx.arc(centerX, centerY, ensureFinite(nexusZones.centerSafe, 40), 0, Math.PI * 2);
      ctx.fill();
      
      // ════════════════════════════════════════════════════════════════
      // TEXTURA: PADRÃO HEXAGONAL (FASE 2)
      // ════════════════════════════════════════════════════════════════
      function drawHexagon(ctx, x, y, size) {
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const angle = (Math.PI / 3) * i;
          const hx = x + size * Math.cos(angle);
          const hy = y + size * Math.sin(angle);
          if (i === 0) ctx.moveTo(hx, hy);
          else ctx.lineTo(hx, hy);
        }
        ctx.closePath();
        ctx.stroke();
      }
      
      const hexSize = 12;
      const hexHeight = hexSize * Math.sqrt(3);
      
      ctx.strokeStyle = 'rgba(167, 139, 250, 0.2)';
      ctx.lineWidth = 0.8;
      
      for (let x = -250; x <= 250; x += hexSize * 1.5) {
        for (let y = -250; y <= 250; y += hexHeight) {
          const offsetX = (y / hexHeight) % 2 === 0 ? 0 : hexSize * 0.75;
          const hexX = centerX + x + offsetX;
          const hexY = centerY + y;
          
          const distFromCenter = Math.sqrt(
            (hexX - centerX) ** 2 + (hexY - centerY) ** 2
          );
          if (distFromCenter > nexusZones.wall) continue;
          
          drawHexagon(ctx, hexX, hexY, hexSize);
        }
      }
      
      // Draw slope indicators (concentric circles showing the incline)
      ctx.strokeStyle = nexusColors.grid;
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.2;
      
      // Inner slope circle
      ctx.beginPath();
      ctx.arc(centerX, centerY, nexusZones.mainArea * 0.5, 0, Math.PI * 2);
      ctx.stroke();
      
      // Mid slope circle  
      ctx.beginPath();
      ctx.arc(centerX, centerY, nexusZones.mainArea * 0.75, 0, Math.PI * 2);
      ctx.stroke();
      
      ctx.globalAlpha = 1;
      
      // Draw grid pattern
      ctx.strokeStyle = nexusColors.grid;
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.3;
      for (let i = 0; i < 8; i++) {
        const angle = (Math.PI * 2 / 8) * i;
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(centerX + Math.cos(angle) * nexusZones.wall, centerY + Math.sin(angle) * nexusZones.wall);
        ctx.stroke();
      }
      for (let r = 40; r <= nexusZones.wall; r += 40) {
        ctx.beginPath();
        ctx.arc(centerX, centerY, r, 0, Math.PI * 2);
        ctx.stroke();
      }
      
      // Draw slope arrows (showing the incline direction)
      ctx.strokeStyle = nexusColors.grid;
      ctx.fillStyle = nexusColors.grid;
      ctx.globalAlpha = 0.15;
      for (let i = 0; i < 8; i++) {
        const angle = (Math.PI * 2 / 8) * i;
        const startR = nexusZones.mainArea * 0.7;
        const endR = nexusZones.mainArea * 0.85;
        
        // Arrow line
        const startX = centerX + Math.cos(angle) * startR;
        const startY = centerY + Math.sin(angle) * startR;
        const endX = centerX + Math.cos(angle) * endR;
        const endY = centerY + Math.sin(angle) * endR;
        
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.stroke();
        
        // Arrow head pointing inward
        const headLength = 8;
        const headAngle = Math.PI / 6;
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(
          startX + headLength * Math.cos(angle + Math.PI - headAngle),
          startY + headLength * Math.sin(angle + Math.PI - headAngle)
        );
        ctx.moveTo(startX, startY);
        ctx.lineTo(
          startX + headLength * Math.cos(angle + Math.PI + headAngle),
          startY + headLength * Math.sin(angle + Math.PI + headAngle)
        );
        ctx.stroke();
      }
      
      ctx.globalAlpha = 1;
      
      // Draw portals - ENHANCED WITH OPENING/CLOSING EFFECTS
      ARENA.portals.forEach(portal => {
        const portalX = centerX + Math.cos(portal.angle) * portal.radius;
        const portalY = centerY + Math.sin(portal.angle) * portal.radius;
        const portalSize = 25;
        
        // Portal glow (pulsing) - ENHANCED
        const pulseIntensity = portal.active ? (0.6 + Math.sin(Date.now() * 0.006) * 0.4) : 0.15;
        const glowSize = portal.active ? portalSize * 3 : portalSize * 1.5;
        
        ctx.globalAlpha = pulseIntensity;
        const glowGradient = ctx.createRadialGradient(portalX, portalY, 0, portalX, portalY, glowSize);
        glowGradient.addColorStop(0, portal.color);
        glowGradient.addColorStop(0.5, `${portal.color}80`);
        glowGradient.addColorStop(1, 'transparent');
        ctx.fillStyle = glowGradient;
        ctx.beginPath();
        ctx.arc(portalX, portalY, glowSize, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        
        // Portal particles when active
        if (portal.active && Math.random() < 0.3) {
          const particleAngle = Math.random() * Math.PI * 2;
          const particleRadius = 15 + Math.random() * 10;
          const px = portalX + Math.cos(particleAngle) * particleRadius;
          const py = portalY + Math.sin(particleAngle) * particleRadius;
          
          ctx.save();
          ctx.globalAlpha = 0.6;
          ctx.fillStyle = portal.color;
          ctx.beginPath();
          ctx.arc(px, py, 2 + Math.random() * 2, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
        
        // Portal hexagon
        ctx.save();
        ctx.translate(portalX, portalY);
        const rotationSpeed = portal.active ? 0.002 : 0.0005;
        ctx.rotate(Date.now() * rotationSpeed);
        
        // Outer hexagon - THICKER when active
        ctx.strokeStyle = portal.color;
        ctx.lineWidth = portal.active ? 5 : 2;
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const angle = (Math.PI * 2 / 6) * i;
          const x = Math.cos(angle) * portalSize;
          const y = Math.sin(angle) * portalSize;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.stroke();
        
        // Inner hexagon - ANIMATED
        ctx.beginPath();
        const innerScale = portal.active ? 0.6 + Math.sin(Date.now() * 0.004) * 0.1 : 0.5;
        for (let i = 0; i < 6; i++) {
          const angle = (Math.PI * 2 / 6) * i + Math.PI / 6;
          const x = Math.cos(angle) * (portalSize * innerScale);
          const y = Math.sin(angle) * (portalSize * innerScale);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.stroke();
        
        // Portal center - SWIRLING EFFECT
        if (portal.active) {
          const innerGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, portalSize * 0.5);
          innerGradient.addColorStop(0, '#ffffff');
          innerGradient.addColorStop(0.3, portal.color);
          innerGradient.addColorStop(1, 'rgba(0,0,0,0.9)');
          ctx.fillStyle = innerGradient;
          ctx.beginPath();
          ctx.arc(0, 0, portalSize * 0.5, 0, Math.PI * 2);
          ctx.fill();
          
          // Swirl lines
          ctx.strokeStyle = portal.color;
          ctx.lineWidth = 2;
          for (let i = 0; i < 4; i++) {
            const swirlAngle = (Math.PI * 2 / 4) * i + Date.now() * 0.003;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(Math.cos(swirlAngle) * portalSize * 0.3, Math.sin(swirlAngle) * portalSize * 0.3);
            ctx.stroke();
          }
        } else {
          // Cooldown indicator - CLOSING EFFECT
          ctx.fillStyle = 'rgba(0,0,0,0.8)';
          ctx.beginPath();
          ctx.arc(0, 0, portalSize * 0.4, 0, Math.PI * 2);
          ctx.fill();
          
          // X mark when closed
          ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(-portalSize * 0.2, -portalSize * 0.2);
          ctx.lineTo(portalSize * 0.2, portalSize * 0.2);
          ctx.moveTo(portalSize * 0.2, -portalSize * 0.2);
          ctx.lineTo(-portalSize * 0.2, portalSize * 0.2);
          ctx.stroke();
        }
        
        ctx.restore();
        
        // Portal label - BRIGHTER when active
        ctx.fillStyle = portal.active ? portal.color : `${portal.color}80`;
        ctx.font = portal.active ? 'bold 11px sans-serif' : 'bold 9px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const labelY = portalY > centerY ? portalY + portalSize + 15 : portalY - portalSize - 15;
        const labels = ['NORTH', 'EAST', 'SOUTH', 'WEST'];
        ctx.fillText(labels[portal.id], portalX, labelY);
      });
      
      // Draw octagonal wall
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 6;
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const angle = (Math.PI * 2 / 8) * i - Math.PI / 8;
        const x = centerX + Math.cos(angle) * nexusZones.wall;
        const y = centerY + Math.sin(angle) * nexusZones.wall;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.stroke();
      
      // ═══════════════════════════════════════════════════════════
      // PORTAL SUCTION TIMER
      // ═══════════════════════════════════════════════════════════
      if (ARENA.portalSuction && ARENA.portalSuction.enabled) {
        const suction = ARENA.portalSuction;
        const currentTime = Date.now() / 1000;
        
        if (suction.currentlyActive && suction.activePortal) {
          // Show active suction with pulsing effect
          const portal = suction.activePortal;
          const elapsed = currentTime - suction.suctionStartTime;
          const remaining = suction.duration - elapsed;
          const progress = elapsed / suction.duration;
          
          // Warning at active portal
          const portalX = centerX + Math.cos(portal.angle) * portal.radius;
          const portalY = centerY + Math.sin(portal.angle) * portal.radius;
          
          ctx.save();
          ctx.shadowBlur = 20 + Math.sin(currentTime * 10) * 10;
          ctx.shadowColor = portal.color;
          ctx.fillStyle = portal.color;
          ctx.font = 'bold 14px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('⚡ SUCTION! ⚡', portalX, portalY - 45);
          ctx.restore();
          
          // Timer bar at top
          ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
          ctx.fillRect(centerX - 100, 30, 200, 30);
          
          ctx.fillStyle = portal.color;
          ctx.font = 'bold 12px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(`PORTAL SUCTION: ${remaining.toFixed(1)}s`, centerX, 48);
          
          // Progress bar
          ctx.fillStyle = `rgba(255, 255, 255, 0.3)`;
          ctx.fillRect(centerX - 90, 54, 180, 4);
          ctx.fillStyle = portal.color;
          ctx.fillRect(centerX - 90, 54, 180 * progress, 4);
        } else {
          // Show cooldown until next suction
          const timeSinceLastSuction = currentTime - suction.lastSuctionTime;
          const timeUntilNext = suction.interval - timeSinceLastSuction;
          
          if (timeUntilNext > 0 && timeUntilNext < 3) {
            // Warning in last 3 seconds
            ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
            ctx.fillRect(centerX - 80, 30, 160, 25);
            
            const alpha = 0.6 + Math.sin(currentTime * 3) * 0.4;
            ctx.fillStyle = `rgba(255, 170, 0, ${alpha})`;
            ctx.font = 'bold 11px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(`Next Suction: ${timeUntilNext.toFixed(1)}s`, centerX, 48);
          }
        }
      }
      // ═══════════════════════════════════════════════════════════
      
      // Arena name
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.font = 'bold 18px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(ARENA.name, centerX, centerY - nexusZones.wall - 30);
      
      // Additional info for NEXUS
      ctx.fillStyle = 'rgba(138, 43, 226, 0.7)';
      ctx.font = 'bold 13px sans-serif';
      ctx.fillText('⬇ PISO INCLINADO + PORTAIS ⬇', centerX, centerY - nexusZones.wall - 12);
    }
    

    function drawIronCrucible() {
      const zones  = ARENA.zones;
      const vs     = ARENA.volcanicSystem;
      const lfs    = ARENA.lavaFlowSystem;
      const time   = Date.now() * 0.001;
      if (!zones) return;

      const cx = ensureFinite(500, 500);
      const cy = ensureFinite(350, 350);

      // ── FUNDO: anel externo de pedra vulcânica ───────────────
      const wallGrad = ctx.createRadialGradient(cx, cy, zones.outerZone, cx, cy, zones.wall + 10);
      wallGrad.addColorStop(0, '#1a0a08');
      wallGrad.addColorStop(0.5, '#2a1208');
      wallGrad.addColorStop(1, '#0d0604');
      ctx.fillStyle = wallGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, zones.wall, 0, Math.PI * 2);
      ctx.fill();

      // ── ZONA OUTER: rocha porosa escura ─────────────────────
      const outerGrad = ctx.createRadialGradient(cx, cy, zones.midZone, cx, cy, zones.outerZone);
      outerGrad.addColorStop(0, '#2a1a18');
      outerGrad.addColorStop(1, '#1a0e0c');
      ctx.fillStyle = outerGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, zones.outerZone, 0, Math.PI * 2);
      ctx.fill();

      // ── ZONA MID: basalto com veias de lava ─────────────────
      const midGrad = ctx.createRadialGradient(cx - 20, cy - 20, 10, cx, cy, zones.midZone);
      midGrad.addColorStop(0, '#3a1a10');
      midGrad.addColorStop(0.5, '#2a1208');
      midGrad.addColorStop(1, '#1e0d08');
      ctx.fillStyle = midGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, zones.midZone, 0, Math.PI * 2);
      ctx.fill();

      // Veias de lava radiais no mid/outer (estáticas, decorativas)
      ctx.save();
      for (let i = 0; i < 12; i++) {
        const a = (Math.PI * 2 / 12) * i + 0.2;
        const veinPulse = 0.3 + Math.sin(time * 1.5 + i * 0.8) * 0.15;
        ctx.globalAlpha = veinPulse;
        const grad = ctx.createLinearGradient(
          cx + Math.cos(a) * 30, cy + Math.sin(a) * 30,
          cx + Math.cos(a) * zones.outerZone, cy + Math.sin(a) * zones.outerZone
        );
        grad.addColorStop(0, '#ff5500');
        grad.addColorStop(0.4, '#cc2200');
        grad.addColorStop(1, 'transparent');
        ctx.strokeStyle = grad;
        ctx.lineWidth = 1.5 + Math.sin(time * 2 + i) * 0.5;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * 30, cy + Math.sin(a) * 30);
        ctx.lineTo(cx + Math.cos(a) * zones.outerZone, cy + Math.sin(a) * zones.outerZone);
        ctx.stroke();
      }
      ctx.restore();

      // ── ZONA CENTRO: magma borbulhante ───────────────────────
      const centerGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, zones.centerBowl);
      centerGrad.addColorStop(0, '#ff8800');
      centerGrad.addColorStop(0.3, '#ee4400');
      centerGrad.addColorStop(0.7, '#aa1a00');
      centerGrad.addColorStop(1, '#660a00');
      ctx.fillStyle = centerGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, zones.centerBowl, 0, Math.PI * 2);
      ctx.fill();

      // Borbulhas animadas no centro
      ctx.save();
      for (let i = 0; i < 6; i++) {
        const bAngle = (time * 0.7 + i * 1.05) % (Math.PI * 2);
        const bR = 10 + Math.sin(time * 2.3 + i * 1.5) * 22;
        const bx = cx + Math.cos(bAngle) * bR;
        const by = cy + Math.sin(bAngle) * bR;
        const bSize = 3 + Math.sin(time * 3 + i) * 2;
        const bubbleAlpha = 0.5 + Math.sin(time * 2 + i * 0.9) * 0.3;
        ctx.globalAlpha = bubbleAlpha;
        ctx.fillStyle = '#ffaa00';
        ctx.shadowBlur = 8;
        ctx.shadowColor = '#ff6600';
        ctx.beginPath();
        ctx.arc(bx, by, bSize, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      // ── LAVA FLOWS ───────────────────────────────────────────
      if (lfs && lfs.flowPatterns && lfs.flowPatterns.length > 0) {
        ctx.save();
        for (const flow of lfs.flowPatterns) {
          const age = (Date.now() * 0.001) - flow.createdAt;
          if (typeof age !== 'number' || age < 0) continue;
          const lifeRatio = Math.min(age / flow.lifetime, 1);
          // Fade in 0.5s, fade out last 1s
          const fadeIn  = Math.min(age / 0.5, 1);
          const fadeOut = lifeRatio > 0.8 ? 1 - (lifeRatio - 0.8) / 0.2 : 1;
          const alpha   = fadeIn * fadeOut * 0.75;

          if (flow.type === 'global') {
            // GLOBAL APOCALYPSE: arena toda vira lava
            ctx.globalAlpha = alpha * 0.6;
            const gGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, zones.wall);
            gGrad.addColorStop(0, '#ff8800');
            gGrad.addColorStop(0.5, '#ff4400');
            gGrad.addColorStop(1, '#cc2200');
            ctx.fillStyle = gGrad;
            ctx.beginPath();
            ctx.arc(cx, cy, zones.wall, 0, Math.PI * 2);
            ctx.fill();
            // Texto de aviso
            ctx.globalAlpha = alpha;
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 16px sans-serif';
            ctx.textAlign = 'center';
            ctx.shadowBlur = 12;
            ctx.shadowColor = '#ff4400';
            ctx.fillText('🌋 LAVA APOCALYPSE', cx, cy - zones.wall - 14);
            continue;
          }

          if (!flow.points || flow.points.length < 2) continue;

          // Desenha o flow como path animado
          const flowWidth = flow.width || 20;
          ctx.globalAlpha = alpha;
          ctx.lineWidth = flowWidth;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';

          // Glow exterior
          ctx.shadowBlur = 20;
          ctx.shadowColor = '#ff4400';
          ctx.strokeStyle = '#cc2200';
          ctx.beginPath();
          ctx.moveTo(cx + flow.points[0].x, cy + flow.points[0].y);
          for (let p = 1; p < flow.points.length; p++) {
            ctx.lineTo(cx + flow.points[p].x, cy + flow.points[p].y);
          }
          ctx.stroke();

          // Core brilhante
          ctx.shadowBlur = 10;
          ctx.shadowColor = '#ffaa00';
          ctx.strokeStyle = '#ff6600';
          ctx.lineWidth = flowWidth * 0.5;
          ctx.beginPath();
          ctx.moveTo(cx + flow.points[0].x, cy + flow.points[0].y);
          for (let p = 1; p < flow.points.length; p++) {
            ctx.lineTo(cx + flow.points[p].x, cy + flow.points[p].y);
          }
          ctx.stroke();

          // Highlight central (branco quente)
          ctx.strokeStyle = '#ffcc44';
          ctx.lineWidth = flowWidth * 0.15;
          ctx.shadowBlur = 5;
          ctx.beginPath();
          ctx.moveTo(cx + flow.points[0].x, cy + flow.points[0].y);
          for (let p = 1; p < flow.points.length; p++) {
            ctx.lineTo(cx + flow.points[p].x, cy + flow.points[p].y);
          }
          ctx.stroke();
        }
        ctx.restore();
      }

      // ── ERUPTION WARNING ─────────────────────────────────────
      if (vs) {
        if (vs.warningActive && !vs.eruptionActive) {
          const warnAge = (Date.now() * 0.001) - (vs.warningStartTime || 0);
          const warnRatio = Math.min(warnAge / vs.warningTime, 1);
          const pulse = Math.sin(Date.now() * 0.015) * 0.5 + 0.5;

          ctx.save();
          ctx.globalAlpha = warnRatio * (0.4 + pulse * 0.4);
          const warnGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, vs.eruptionRadius * 1.5);
          warnGrad.addColorStop(0, '#ffcc00');
          warnGrad.addColorStop(0.5, '#ff4400');
          warnGrad.addColorStop(1, 'transparent');
          ctx.fillStyle = warnGrad;
          ctx.beginPath();
          ctx.arc(cx, cy, vs.eruptionRadius * 1.5, 0, Math.PI * 2);
          ctx.fill();

          // Círculo pulsante de aviso
          ctx.globalAlpha = pulse * 0.8;
          ctx.strokeStyle = '#ffaa00';
          ctx.lineWidth = 3;
          ctx.shadowBlur = 20;
          ctx.shadowColor = '#ff6600';
          ctx.setLineDash([8, 4]);
          ctx.beginPath();
          ctx.arc(cx, cy, vs.eruptionRadius, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);

          // Texto de aviso
          ctx.globalAlpha = warnRatio;
          ctx.fillStyle = '#ffcc00';
          ctx.font = 'bold 14px sans-serif';
          ctx.textAlign = 'center';
          ctx.shadowBlur = 10;
          ctx.shadowColor = '#ff4400';
          ctx.fillText('⚠ ERUPTION INCOMING', cx, cy - 80);
          ctx.restore();
        }

        // ── ERUPTION ATIVA ───────────────────────────────────────
        if (vs.eruptionActive) {
          const eAge = (Date.now() * 0.001) - (vs.eruptionStartTime || 0);
          const eRatio = Math.min(eAge / vs.eruptionDuration, 1);
          const intensity = 1 - eRatio;

          ctx.save();
          // Flash radial
          ctx.globalAlpha = intensity * 0.7;
          const eGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, vs.eruptionRadius * 1.8);
          eGrad.addColorStop(0, '#ffffff');
          eGrad.addColorStop(0.2, '#ffaa00');
          eGrad.addColorStop(0.6, '#ff4400');
          eGrad.addColorStop(1, 'transparent');
          ctx.fillStyle = eGrad;
          ctx.beginPath();
          ctx.arc(cx, cy, vs.eruptionRadius * 1.8, 0, Math.PI * 2);
          ctx.fill();

          // Raios de lava saindo do centro
          for (let i = 0; i < 8; i++) {
            const rayAngle = (Math.PI * 2 / 8) * i + eAge * 2;
            const rayLen = vs.eruptionRadius * intensity * (0.8 + Math.sin(eAge * 10 + i) * 0.2);
            ctx.globalAlpha = intensity * 0.6;
            ctx.strokeStyle = '#ffcc00';
            ctx.lineWidth = 3 + intensity * 4;
            ctx.shadowBlur = 15;
            ctx.shadowColor = '#ff6600';
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.lineTo(cx + Math.cos(rayAngle) * rayLen, cy + Math.sin(rayAngle) * rayLen);
            ctx.stroke();
          }
          ctx.restore();
        }
      }

      // ── BORDAS DAS ZONAS ─────────────────────────────────────
      ctx.save();
      ctx.globalAlpha = 0.6;
      // Borda centro
      ctx.strokeStyle = '#ff5500';
      ctx.lineWidth = 2;
      ctx.shadowBlur = 8;
      ctx.shadowColor = '#ff3300';
      ctx.beginPath();
      ctx.arc(cx, cy, zones.centerBowl, 0, Math.PI * 2);
      ctx.stroke();

      // Borda mid
      ctx.strokeStyle = '#882200';
      ctx.lineWidth = 1.5;
      ctx.shadowBlur = 0;
      ctx.beginPath();
      ctx.arc(cx, cy, zones.midZone, 0, Math.PI * 2);
      ctx.stroke();

      // Borda outer
      ctx.strokeStyle = '#551100';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(cx, cy, zones.outerZone, 0, Math.PI * 2);
      ctx.stroke();

      // Anel externo da parede
      ctx.strokeStyle = '#331100';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(cx, cy, zones.wall, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // ── NOME DA ARENA ────────────────────────────────────────
      ctx.fillStyle = 'rgba(255, 150, 80, 0.9)';
      ctx.font = 'bold 18px sans-serif';
      ctx.textAlign = 'center';
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#ff4400';
      ctx.fillText('🌋 IRON CRUCIBLE', cx, cy - zones.wall - 28);
      ctx.shadowBlur = 0;
    }
    function drawPangeaPlatform() {
      // PANGEA PLATFORM: 6 tectonic plates as pie slices
      const zones = ARENA.zones;
      const colors = ARENA.colors;
      const seismic = ARENA.seismic;
      const time = Date.now() * 0.001;
      if (!zones || !colors || !ARENA.plates) return;

      const cx = ensureFinite(500, 500);
      const cy = ensureFinite(350, 350);

      let shakeX = 0, shakeY = 0;
      if (seismic && seismic.active) {
        const si = (seismic.intensity || 3.5) * 1.5;
        shakeX = (Math.random() - 0.5) * si;
        shakeY = (Math.random() - 0.5) * si;
      }

      ctx.save();
      ctx.translate(shakeX, shakeY);

      ctx.fillStyle = '#1a2a0a';
      ctx.beginPath();
      ctx.arc(cx, cy, zones.wall, 0, Math.PI * 2);
      ctx.fill();

      const plateCount = ARENA.plates.length;
      const plateArc = (Math.PI * 2) / plateCount;

      ARENA.plates.forEach((plate, index) => {
        const startAngle = plate.currentAngle - plateArc / 2;
        const endAngle = plate.currentAngle + plateArc / 2;
        const plateColor = (colors.plates && colors.plates[index]) || '#4a6b2a';

        ctx.fillStyle = plateColor;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, zones.plateZone, startAngle, endAngle);
        ctx.closePath();
        ctx.fill();

        // Geological lines
        ctx.strokeStyle = 'rgba(255,255,255,0.1)';
        ctx.lineWidth = 1;
        for (let r = zones.centerStable + 20; r < zones.plateZone - 10; r += 22) {
          ctx.beginPath();
          ctx.arc(cx, cy, r, startAngle + 0.05, endAngle - 0.05);
          ctx.stroke();
        }

        // Fault line
        ctx.strokeStyle = colors.faultLine || '#8b4513';
        ctx.lineWidth = 3;
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(startAngle) * zones.centerStable, cy + Math.sin(startAngle) * zones.centerStable);
        ctx.lineTo(cx + Math.cos(startAngle) * zones.plateZone, cy + Math.sin(startAngle) * zones.plateZone);
        ctx.stroke();
        ctx.setLineDash([]);

        // Direction arrow
        const midAngle = plate.currentAngle;
        const arrowR = (zones.centerStable + zones.plateZone) / 2;
        const ax = cx + Math.cos(midAngle) * arrowR;
        const ay = cy + Math.sin(midAngle) * arrowR;
        const tangDir = midAngle + (Math.PI / 2) * plate.direction;
        ctx.save();
        ctx.translate(ax, ay);
        ctx.rotate(tangDir);
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.beginPath();
        ctx.moveTo(12, 0);
        ctx.lineTo(-6, -5);
        ctx.lineTo(-6, 5);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      });

      // Stable center
      const centerGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, zones.centerStable);
      centerGrad.addColorStop(0, '#7aaa40');
      centerGrad.addColorStop(1, colors.center || '#2d5016');
      ctx.fillStyle = centerGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, zones.centerStable, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = 'rgba(255,255,255,0.65)';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('ESTÁVEL', cx, cy + 4);

      // Earthquake effects
      if (seismic && seismic.active) {
        ctx.strokeStyle = colors.quake || '#ff6b6b';
        ctx.lineWidth = 4;
        ctx.globalAlpha = 0.4 + Math.sin(time * 25) * 0.4;
        ctx.beginPath();
        ctx.arc(cx, cy, zones.plateZone * 0.7, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.fillStyle = colors.quake || '#ff6b6b';
        ctx.font = 'bold 20px sans-serif';
        ctx.fillText('🌍 TERREMOTO!', cx, cy - zones.wall + 20);
      } else if (seismic) {
        const currentTime = Date.now() / 1000;
        const timeToNext = seismic.interval - (currentTime - seismic.lastQuakeTime);
        ctx.fillStyle = 'rgba(255,107,107,0.65)';
        ctx.font = '11px sans-serif';
        ctx.fillText(`💥 Terremoto em: ${Math.max(0, timeToNext).toFixed(1)}s`, cx, cy - zones.wall + 18);
      }

      ctx.strokeStyle = '#8b6b3a';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(cx, cy, zones.wall, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.font = 'bold 18px sans-serif';
      ctx.fillText(ARENA.name, cx, cy - zones.wall - 30);

      ctx.fillStyle = 'rgba(100, 220, 100, 0.75)';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText('🌍 6 PLACAS TECTÔNICAS | TERREMOTOS A CADA 12s', cx, cy - zones.wall - 12);

      ctx.restore();
    }

    function drawPinballInferno() {
      // PINBALL INFERNO: Circular arena with 3 bumper zones + 3 flippers
      const zones = ARENA.zones;
      const colors = ARENA.colors;
      const time = Date.now() * 0.001;
      if (!zones || !colors) return;

      const cx = ensureFinite(500, 500);
      const cy = ensureFinite(350, 350);

      // Outer wall
      ctx.fillStyle = colors.wall || '#3a1515';
      ctx.beginPath();
      ctx.arc(cx, cy, zones.wall, 0, Math.PI * 2);
      ctx.fill();

      // Lane zone (outer ring)
      const laneGrad = ctx.createRadialGradient(cx, cy, zones.innerPlay, cx, cy, zones.lanes);
      laneGrad.addColorStop(0, '#3a1515');
      laneGrad.addColorStop(1, '#2a1010');
      ctx.fillStyle = laneGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, zones.lanes, 0, Math.PI * 2);
      ctx.fill();

      // Inner play zone
      const innerGrad = ctx.createRadialGradient(cx, cy, zones.centerZone, cx, cy, zones.innerPlay);
      innerGrad.addColorStop(0, '#2a1010');
      innerGrad.addColorStop(1, '#3a1515');
      ctx.fillStyle = innerGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, zones.innerPlay, 0, Math.PI * 2);
      ctx.fill();

      // Center zone
      ctx.fillStyle = colors.floor || '#1a0a0a';
      ctx.beginPath();
      ctx.arc(cx, cy, zones.centerZone, 0, Math.PI * 2);
      ctx.fill();

      // Draw bumpers with zone colors
      ARENA.bumpers.forEach(bumper => {
        const bx = cx + bumper.x;
        const by = cy + bumper.y;
        const pulseSize = bumper.cooldown > 0 ? 1.4 : 1.0;

        ctx.save();
        ctx.scale(pulseSize, pulseSize);
        ctx.translate(bx * (1 - 1/pulseSize), by * (1 - 1/pulseSize));

        // Glow
        ctx.shadowColor = bumper.color;
        ctx.shadowBlur = bumper.cooldown > 0 ? 20 : 8;

        // Bumper body
        ctx.fillStyle = bumper.color;
        ctx.beginPath();
        ctx.arc(bx, by, bumper.radius, 0, Math.PI * 2);
        ctx.fill();

        // Inner ring
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.beginPath();
        ctx.arc(bx, by, bumper.radius * 0.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.shadowBlur = 0;
        ctx.restore();

        // Type label
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        ctx.font = 'bold 7px sans-serif';
        ctx.textAlign = 'center';
        const labels = { danger: '⚠', combo: '✦', trap: '⟁' };
        ctx.fillText(labels[bumper.type] || '●', bx, by + 3);
      });

      // Draw flippers
      ARENA.flippers.forEach(flipper => {
        const fx = cx + flipper.x;
        const fy = cy + flipper.y;

        ctx.save();
        ctx.translate(fx, fy);
        ctx.rotate(flipper.angle);
        ctx.fillStyle = flipper.cooldown > 0 ? '#ffff00' : '#888888';
        ctx.shadowColor = flipper.cooldown > 0 ? '#ffff00' : 'transparent';
        ctx.shadowBlur = flipper.cooldown > 0 ? 15 : 0;
        ctx.fillRect(-18, -5, 36, 10);
        ctx.shadowBlur = 0;
        ctx.restore();
      });

      // Lane zone boundary ring (dashed)
      ctx.strokeStyle = `rgba(255,80,80,${0.3 + Math.sin(time * 3) * 0.2})`;
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 6]);
      ctx.beginPath();
      ctx.arc(cx, cy, zones.lanes, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      // Inner play boundary
      ctx.strokeStyle = 'rgba(80,80,200,0.3)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(cx, cy, zones.innerPlay, 0, Math.PI * 2);
      ctx.stroke();

      // Combo display
      const combo = ARENA.comboSystem;
      if (combo) {
        const c1 = Math.floor(combo.bey1Combo);
        const c2 = Math.floor(combo.bey2Combo);
        ctx.font = 'bold 13px sans-serif';
        ctx.textAlign = 'center';
        if (c1 > 0) {
          ctx.fillStyle = '#ff8888';
          ctx.fillText(`P1 COMBO: ${c1}x`, cx - 80, cy - zones.wall - 12);
        }
        if (c2 > 0) {
          ctx.fillStyle = '#8888ff';
          ctx.fillText(`P2 COMBO: ${c2}x`, cx + 80, cy - zones.wall - 12);
        }
      }

      // Wall ring
      ctx.strokeStyle = '#5a2020';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(cx, cy, zones.wall, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.font = 'bold 18px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(ARENA.name, cx, cy - zones.wall - 30);

      ctx.fillStyle = 'rgba(255, 80, 80, 0.75)';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText('⚠ DANGER | ✦ COMBO | ⟁ TRAP BUMPERS', cx, cy - zones.wall - 12);
    }

    function drawVortexColiseum() {
      const zones = ARENA.zones;
      const colors = ARENA.colors;
      const time = Date.now() * 0.001;
      
      // Update vortex rotation
      const vortexSpeed = ARENA.vortex.inversed ? -ARENA.vortex.rotationSpeed : ARENA.vortex.rotationSpeed;
      ARENA.vortex.currentAngle += vortexSpeed * (1/60);
      
      // Update storm surge timer
      ARENA.vortex.surgeTimer += 1/60;
      if (ARENA.vortex.surgeTimer >= ARENA.vortex.surgeCooldown) {
        ARENA.vortex.inversed = true;
        if (ARENA.vortex.surgeTimer >= ARENA.vortex.surgeCooldown + ARENA.vortex.surgeDuration) {
          ARENA.vortex.inversed = false;
          ARENA.vortex.surgeTimer = 0;
        }
      }
      
      // Draw outer wall
      ctx.fillStyle = colors.wall;
      ctx.beginPath();
      ctx.arc(centerX, centerY, zones.wall, 0, Math.PI * 2);
      ctx.fill();
      
      // Draw outer orbit zone
      const outerGradient = ctx.createRadialGradient(centerX, centerY, zones.middleOrbit, centerX, centerY, zones.outerOrbit);
      outerGradient.addColorStop(0, colors.middle);
      outerGradient.addColorStop(1, colors.outer);
      ctx.fillStyle = outerGradient;
      ctx.beginPath();
      ctx.arc(centerX, centerY, zones.outerOrbit, 0, Math.PI * 2);
      ctx.fill();
      
      // Draw middle orbit zone
      const middleGradient = ctx.createRadialGradient(centerX, centerY, zones.innerOrbit, centerX, centerY, zones.middleOrbit);
      middleGradient.addColorStop(0, colors.inner);
      middleGradient.addColorStop(1, colors.middle);
      ctx.fillStyle = middleGradient;
      ctx.beginPath();
      ctx.arc(centerX, centerY, zones.middleOrbit, 0, Math.PI * 2);
      ctx.fill();
      
      // Draw inner orbit zone
      const innerGradient = ctx.createRadialGradient(centerX, centerY, zones.vortexCore, centerX, centerY, zones.innerOrbit);
      innerGradient.addColorStop(0, colors.core);
      innerGradient.addColorStop(1, colors.inner);
      ctx.fillStyle = innerGradient;
      ctx.beginPath();
      ctx.arc(centerX, centerY, zones.innerOrbit, 0, Math.PI * 2);
      ctx.fill();
      
      // Draw vortex core with spinning effect
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(ARENA.vortex.currentAngle);
      
      // Vortex spiral lines
      ctx.strokeStyle = colors.vortex;
      ctx.lineWidth = 3;
      for (let i = 0; i < 8; i++) {
        const startAngle = (Math.PI * 2 / 8) * i;
        ctx.beginPath();
        for (let r = zones.vortexCore; r < zones.innerOrbit; r += 2) {
          const spiralAngle = startAngle + (r / zones.innerOrbit) * Math.PI;
          const x = Math.cos(spiralAngle) * r;
          const y = Math.sin(spiralAngle) * r;
          if (r === zones.vortexCore) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();
      }
      
      ctx.restore();
      
      // Draw vortex core center
      const coreGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, zones.vortexCore);
      coreGradient.addColorStop(0, '#ffffff');
      coreGradient.addColorStop(0.3, colors.vortex);
      coreGradient.addColorStop(1, colors.core);
      ctx.fillStyle = coreGradient;
      ctx.beginPath();
      ctx.arc(centerX, centerY, zones.vortexCore, 0, Math.PI * 2);
      ctx.fill();
      
      // Draw orbit boundary lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      
      // Inner orbit boundary
      ctx.beginPath();
      ctx.arc(centerX, centerY, zones.innerOrbit, 0, Math.PI * 2);
      ctx.stroke();
      
      // Middle orbit boundary
      ctx.beginPath();
      ctx.arc(centerX, centerY, zones.middleOrbit, 0, Math.PI * 2);
      ctx.stroke();
      
      // Outer orbit boundary
      ctx.beginPath();
      ctx.arc(centerX, centerY, zones.outerOrbit, 0, Math.PI * 2);
      ctx.stroke();
      
      ctx.setLineDash([]);
      
      // Draw slingshot points
      ARENA.slingshotPoints.forEach((slingshot, idx) => {
        const slingshotX = centerX + Math.cos(slingshot.angle) * slingshot.radius;
        const slingshotY = centerY + Math.sin(slingshot.angle) * slingshot.radius;
        
        const pulseSize = slingshot.cooldown > 0 ? 1.3 : 1.0;
        const glowIntensity = slingshot.cooldown > 0 ? 0.8 : 0.4;
        
        // Glow effect
        ctx.save();
        ctx.shadowBlur = 20 * glowIntensity;
        ctx.shadowColor = colors.slingshot;
        ctx.fillStyle = colors.slingshot;
        ctx.beginPath();
        ctx.arc(slingshotX, slingshotY, 10 * pulseSize, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        
        // Border
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(slingshotX, slingshotY, 10 * pulseSize, 0, Math.PI * 2);
        ctx.stroke();
        
        // Arrow pointing inward
        ctx.save();
        ctx.translate(slingshotX, slingshotY);
        ctx.rotate(slingshot.angle + Math.PI);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 16px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('→', 0, 5);
        ctx.restore();
        
        // Cooldown
        if (slingshot.cooldown > 0) {
          slingshot.cooldown -= 1/60;
        }
      });
      
      // Draw bumpers
      if (ARENA.bumpers) {
        ARENA.bumpers.forEach(bumper => {
          const bumperX = centerX + Math.cos(bumper.angle) * bumper.radius;
          const bumperY = centerY + Math.sin(bumper.angle) * bumper.radius;
          
          const pulseSize = bumper.cooldown > 0 ? 1.2 : 1.0;
          const glowIntensity = bumper.cooldown > 0 ? 0.9 : 0.5;
          
          // Glow effect
          ctx.save();
          ctx.shadowBlur = 15 * glowIntensity;
          ctx.shadowColor = bumper.color;
          ctx.fillStyle = bumper.color;
          ctx.beginPath();
          ctx.arc(bumperX, bumperY, bumper.size * pulseSize, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
          
          // Border
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(bumperX, bumperY, bumper.size * pulseSize, 0, Math.PI * 2);
          ctx.stroke();
          
          // Inner circle
          ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
          ctx.beginPath();
          ctx.arc(bumperX, bumperY, bumper.size * pulseSize * 0.5, 0, Math.PI * 2);
          ctx.fill();
        });
      }
      
      // Arena wall
      ctx.strokeStyle = colors.vortex;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(centerX, centerY, zones.wall, 0, Math.PI * 2);
      ctx.stroke();
      
      // ── STORM SURGE STATUS + BUILDUP ─────────────────────────
      const surgeTimer = ARENA.vortex.surgeTimer;
      const surgeCooldown = ARENA.vortex.surgeCooldown;
      const surgeActive = ARENA.vortex.inversed;
      const timeToSurge = surgeCooldown - surgeTimer;
      const nowMs2 = Date.now();
      
      const vBarWidth = 240;
      const vBarX = centerX - vBarWidth / 2;
      const vBarY = centerY - zones.wall - 58;
      
      if (surgeActive) {
        const surgeGlow = 0.3 + Math.sin(nowMs2 * 0.008) * 0.25;
        ctx.globalAlpha = surgeGlow;
        ctx.fillStyle = '#ff2200';
        ctx.beginPath();
        ctx.arc(centerX, centerY, zones.innerOrbit, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        
        ctx.save();
        ctx.shadowBlur = 30 + Math.sin(nowMs2 * 0.005) * 10;
        ctx.shadowColor = '#ff0000';
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${18 + Math.sin(nowMs2 * 0.006) * 2}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText('⚡  STORM SURGE!  ⚡', centerX, vBarY + 16);
        ctx.restore();
      } else if (timeToSurge < 2.5) {
        const buildIntensity = (2.5 - timeToSurge) / 2.5;
        ctx.globalAlpha = buildIntensity * 0.5;
        const buildColor = `rgba(255, ${Math.floor(255 * (1 - buildIntensity))}, 0, 1)`;
        ctx.fillStyle = buildColor;
        ctx.beginPath();
        ctx.arc(centerX, centerY, zones.vortexCore * (1 + buildIntensity * 0.8), 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        
        ctx.fillStyle = 'rgba(0,0,0,0.75)';
        ctx.fillRect(vBarX - 5, vBarY - 5, vBarWidth + 10, 32);
        
        const surgeColor = buildIntensity > 0.7 ? '#ff0000' : buildIntensity > 0.4 ? '#ff6600' : '#c084fc';
        ctx.fillStyle = surgeColor;
        ctx.fillRect(vBarX, vBarY, vBarWidth * buildIntensity, 22);
        ctx.strokeStyle = 'rgba(255,255,255,0.4)';
        ctx.lineWidth = 1;
        ctx.strokeRect(vBarX, vBarY, vBarWidth, 22);
        
        const pulseAlpha = 0.8 + Math.sin(nowMs2 * 0.007) * 0.2;
        ctx.fillStyle = `rgba(255,255,255,${pulseAlpha})`;
        ctx.font = 'bold 13px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`⚠ STORM SURGE EM ${timeToSurge.toFixed(1)}s ⚠`, centerX, vBarY + 15);
      } else {
        const calmProgress = (surgeCooldown - timeToSurge) / surgeCooldown;
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(vBarX - 5, vBarY - 5, vBarWidth + 10, 32);
        ctx.fillStyle = '#4c1d95';
        ctx.fillRect(vBarX, vBarY, vBarWidth * calmProgress, 22);
        ctx.strokeStyle = 'rgba(192,132,252,0.4)';
        ctx.lineWidth = 1;
        ctx.strokeRect(vBarX, vBarY, vBarWidth, 22);
        ctx.fillStyle = 'rgba(192,132,252,0.7)';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('🌀  VÓRTEX COLISEUM  🌀', centerX, vBarY + 15);
      }
      
      // Arena name
      ctx.save();
      ctx.shadowBlur = 20 + Math.sin(time * 2) * 10;
      ctx.shadowColor = colors.vortex;
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 18px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(ARENA.name, centerX, centerY - zones.wall - 30);
      ctx.restore();
      
      // MOMENTUM STACKS HUD — bigger
      if (ARENA.momentum) {
        const stacks1 = Math.floor(ARENA.momentum.bey1Stacks);
        const stacks2 = Math.floor(ARENA.momentum.bey2Stacks);
        
        // Player 1 momentum (left side)
        if (stacks1 > 0) {
          ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
          ctx.fillRect(15, centerY - 35, 140, 50);
          
          ctx.fillStyle = '#a78bfa';
          ctx.font = 'bold 14px sans-serif';
          ctx.textAlign = 'left';
          ctx.fillText(`⭐ MOMENTUM`, 25, centerY - 14);
          
          let starText = '';
          for (let i = 0; i < Math.min(stacks1, 5); i++) starText += '★';
          if (stacks1 > 5) starText += `+${stacks1 - 5}`;
          ctx.fillStyle = stacks1 >= 3 ? '#ff6600' : '#fbbf24';
          ctx.font = `bold ${stacks1 >= 3 ? 20 : 16}px sans-serif`;
          ctx.fillText(starText, 25, centerY + 10);
          
          if (stacks1 >= 3) {
            ctx.fillStyle = `rgba(255,100,0,${0.5 + Math.sin(nowMs2 * 0.007) * 0.4})`;
            ctx.font = 'bold 12px sans-serif';
            ctx.fillText('⚡ BURST READY!', 25, centerY + 28);
          }
        }
        
        // Player 2 momentum (right side)
        if (stacks2 > 0) {
          ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
          ctx.fillRect(canvas.width - 155, centerY - 35, 140, 50);
          
          ctx.fillStyle = '#a78bfa';
          ctx.font = 'bold 14px sans-serif';
          ctx.textAlign = 'right';
          ctx.fillText(`MOMENTUM ⭐`, canvas.width - 25, centerY - 14);
          
          let starText = '';
          for (let i = 0; i < Math.min(stacks2, 5); i++) starText += '★';
          if (stacks2 > 5) starText = `${stacks2 - 5}+` + starText;
          ctx.fillStyle = stacks2 >= 3 ? '#ff6600' : '#fbbf24';
          ctx.font = `bold ${stacks2 >= 3 ? 20 : 16}px sans-serif`;
          ctx.fillText(starText, canvas.width - 25, centerY + 10);
          
          if (stacks2 >= 3) {
            ctx.fillStyle = `rgba(255,100,0,${0.5 + Math.sin(nowMs2 * 0.007) * 0.4})`;
            ctx.font = 'bold 12px sans-serif';
            ctx.fillText('⚡ BURST READY!', canvas.width - 25, centerY + 28);
          }
        }
        
        ctx.textAlign = 'center'; // Reset alignment
      }
      
      // Orbit labels
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      
      // Inner orbit label
      ctx.fillStyle = colors.inner;
      ctx.fillText('⚡ FAST', centerX, centerY - zones.innerOrbit - 8);
      
      // Middle orbit label
      ctx.fillStyle = colors.middle;
      ctx.fillText('⚖️ BALANCED', centerX, centerY - zones.middleOrbit - 8);
      
      // Outer orbit label
      ctx.fillStyle = colors.outer;
      ctx.fillText('🛡️ SAFE', centerX, centerY - zones.outerOrbit - 8);
    }
    
    // ═══════════════════════════════════════════════════════════════
    // SPEEDWAY CIRCUIT - Arena oval com boost pads e oil slicks
    // ═══════════════════════════════════════════════════════════════
    function drawSpeedwayCircuit() {
      const zones = ARENA.zones;
      const colors = ARENA.colors;
      const ovalRatio = ARENA.ovalRatio || 1.6;
      const time = Date.now() * 0.001;
      
      ctx.save();
      
      // Outer wall (oval)
      ctx.fillStyle = colors.wall;
      ctx.beginPath();
      ctx.ellipse(centerX, centerY, zones.wall * ovalRatio, zones.wall, 0, 0, Math.PI * 2);
      ctx.fill();
      
      // Track surface
      const trackGrad = ctx.createRadialGradient(centerX, centerY, zones.centerHole, centerX, centerY, zones.outerTrack);
      trackGrad.addColorStop(0, colors.centerHole);
      trackGrad.addColorStop(0.5, colors.track);
      trackGrad.addColorStop(1, colors.track);
      ctx.fillStyle = trackGrad;
      ctx.beginPath();
      ctx.ellipse(centerX, centerY, zones.outerTrack * ovalRatio, zones.outerTrack, 0, 0, Math.PI * 2);
      ctx.fill();
      
      // Center hole (inacessível)
      ctx.fillStyle = colors.centerHole;
      ctx.beginPath();
      ctx.ellipse(centerX, centerY, zones.centerHole * ovalRatio, zones.centerHole, 0, 0, Math.PI * 2);
      ctx.fill();
      
      // Track lanes (visual only)
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 1;
      ctx.setLineDash([10, 10]);
      ctx.beginPath();
      ctx.ellipse(centerX, centerY, zones.innerTrack * ovalRatio, zones.innerTrack, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      
      // Oil slicks
      ARENA.oilSlicks.forEach(oil => {
        ctx.save();
        const pulse = 0.9 + Math.sin(time * 2) * 0.1;
        ctx.globalAlpha = 0.7;
        
        // Oil gradient
        const oilGrad = ctx.createRadialGradient(
          centerX + oil.x, centerY + oil.y, 0,
          centerX + oil.x, centerY + oil.y, oil.width / 2
        );
        oilGrad.addColorStop(0, colors.oil);
        oilGrad.addColorStop(1, 'rgba(0, 100, 170, 0.3)');
        
        ctx.fillStyle = oilGrad;
        ctx.fillRect(
          centerX + oil.x - oil.width / 2,
          centerY + oil.y - oil.height / 2,
          oil.width,
          oil.height
        );
        
        // Oil shimmer effect
        ctx.strokeStyle = 'rgba(100, 200, 255, 0.5)';
        ctx.lineWidth = 2;
        ctx.strokeRect(
          centerX + oil.x - oil.width / 2,
          centerY + oil.y - oil.height / 2,
          oil.width,
          oil.height
        );
        
        ctx.restore();
      });
      
      // Boost pads
      ARENA.boostPads.forEach(pad => {
        const padActive = pad.cooldown > 0;
        const pulse = padActive ? 1.3 : (1.0 + Math.sin(time * 4) * 0.1);
        
        ctx.save();
        ctx.shadowBlur = padActive ? 25 : 10;
        ctx.shadowColor = padActive ? colors.boostActive : colors.boost;
        
        // Boost pad gradient
        const boostGrad = ctx.createRadialGradient(
          centerX + pad.x, centerY + pad.y, 0,
          centerX + pad.x, centerY + pad.y, pad.radius * pulse
        );
        boostGrad.addColorStop(0, '#ffffff');
        boostGrad.addColorStop(0.3, padActive ? colors.boostActive : colors.boost);
        boostGrad.addColorStop(1, padActive ? colors.boostActive : colors.boost);
        
        ctx.fillStyle = boostGrad;
        ctx.beginPath();
        ctx.arc(centerX + pad.x, centerY + pad.y, pad.radius * pulse, 0, Math.PI * 2);
        ctx.fill();
        
        // Direction arrows
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 20px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('⚡', centerX + pad.x, centerY + pad.y);
        
        ctx.restore();
        
        // Cooldown decay
        if (pad.cooldown > 0) {
          pad.cooldown -= 1/60;
        }
      });
      
      // Finish line
      const lineY = centerY;
      const lineX = centerX + zones.innerTrack * ovalRatio + 20;
      ctx.strokeStyle = colors.finishLine;
      ctx.lineWidth = 5;
      ctx.setLineDash([10, 10]);
      ctx.beginPath();
      ctx.moveTo(lineX, lineY - 60);
      ctx.lineTo(lineX, lineY + 60);
      ctx.stroke();
      ctx.setLineDash([]);
      
      // Lap counter
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.font = 'bold 16px sans-serif';
      ctx.textAlign = 'center';
      const lap1 = ARENA.lapSystem.player1Laps;
      const lap2 = ARENA.lapSystem.player2Laps;
      const target = ARENA.lapSystem.targetLaps;
      ctx.fillStyle = '#ff6666';
      ctx.fillText(`P1: ${lap1}/${target}`, centerX - 100, centerY - zones.wall - 15);
      ctx.fillStyle = '#6666ff';
      ctx.fillText(`P2: ${lap2}/${target}`, centerX + 100, centerY - zones.wall - 15);
      
      // Arena title
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.font = 'bold 18px sans-serif';
      ctx.fillText(ARENA.name, centerX, centerY - zones.wall - 35);
      
      ctx.restore();
    }
    
    // ═══════════════════════════════════════════════════════════════
    // DOMINATION ZONES - Arena com zonas para conquistar
    // ═══════════════════════════════════════════════════════════════
    function drawDominationZones() {
      const zones = ARENA.zones;
      const colors = ARENA.colors;
      const time = Date.now() * 0.001;
      
      // Outer wall
      ctx.fillStyle = colors.wall;
      ctx.beginPath();
      ctx.arc(centerX, centerY, zones.wall, 0, Math.PI * 2);
      ctx.fill();
      
      // Draw domination zones (pizza slices)
      ARENA.dominationZones.forEach(zone => {
        const startAngle = zone.angle - zone.arcWidth / 2;
        const endAngle = zone.angle + zone.arcWidth / 2;
        
        // Zone color based on owner
        let zoneColor;
        if (zone.owner === 1) {
          zoneColor = colors.player1;
        } else if (zone.owner === 2) {
          zoneColor = colors.player2;
        } else {
          zoneColor = colors[zone.type];
        }
        
        // Pulse effect if being captured
        const pulse = zone.captureProgress > 0 ? (1.0 + Math.sin(time * 8) * 0.1) : 1.0;
        
        // Draw zone slice
        ctx.save();
        ctx.globalAlpha = 0.6;
        ctx.fillStyle = zoneColor;
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, zones.zoneRadius * pulse, startAngle, endAngle);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
        
        // Zone border
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, zones.zoneRadius, startAngle, endAngle);
        ctx.closePath();
        ctx.stroke();
        
        // Zone label
        const labelAngle = zone.angle;
        const labelDist = zones.zoneRadius * 0.7;
        const labelX = centerX + Math.cos(labelAngle) * labelDist;
        const labelY = centerY + Math.sin(labelAngle) * labelDist;
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.font = 'bold 14px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        const zoneLabels = {
          ATK: '⚔️ ATK',
          DEF: '🛡️ DEF',
          SPEED: '⚡ SPD',
          SPIN: '🌀 SPN',
          NEUTRAL: '○'
        };
        
        ctx.fillText(zoneLabels[zone.type] || zone.type, labelX, labelY);
      });
      
      // Center circle
      ctx.fillStyle = colors.floor;
      ctx.beginPath();
      ctx.arc(centerX, centerY, zones.center, 0, Math.PI * 2);
      ctx.fill();
      
      // Wall ring
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(centerX, centerY, zones.wall, 0, Math.PI * 2);
      ctx.stroke();
      
      // Zone counter
      const p1Zones = ARENA.dominationZones.filter(z => z.owner === 1).length;
      const p2Zones = ARENA.dominationZones.filter(z => z.owner === 2).length;
      const target = ARENA.targetZones;
      
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.font = 'bold 18px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(ARENA.name, centerX, centerY - zones.wall - 35);
      
      ctx.font = 'bold 16px sans-serif';
      ctx.fillStyle = '#ff6666';
      ctx.fillText(`P1: ${p1Zones}/${target}`, centerX - 100, centerY - zones.wall - 15);
      ctx.fillStyle = '#6666ff';
      ctx.fillText(`P2: ${p2Zones}/${target}`, centerX + 100, centerY - zones.wall - 15);
    }
    
    // ═══════════════════════════════════════════════════════════════
    // TIDAL SURGE - Arena com maré que sobe e desce
    // ═══════════════════════════════════════════════════════════════
    function drawTidalSurge() {
      const zones = ARENA.zones;
      const colors = ARENA.colors;
      const tide = ARENA.tideSystem;
      const time = Date.now() * 0.001;
      
      // Update tide cycle
      tide.timer += 1/60;
      const cycleProgress = tide.timer / tide.cycleDuration;
      
      if (cycleProgress < 0.33) {
        tide.phase = 'low';
        tide.floodRadius = 0;
      } else if (cycleProgress < 0.66) {
        tide.phase = 'rising';
        const risingProgress = (cycleProgress - 0.33) / 0.33;
        tide.floodRadius = tide.maxFloodRadius * risingProgress;
      } else if (cycleProgress < 1.0) {
        tide.phase = 'high';
        tide.floodRadius = tide.maxFloodRadius;
      } else {
        tide.timer = 0;
      }
      
      // Outer wall
      ctx.fillStyle = colors.wall;
      ctx.beginPath();
      ctx.arc(centerX, centerY, zones.wall, 0, Math.PI * 2);
      ctx.fill();
      
      // Floor
      const floorGrad = ctx.createRadialGradient(centerX, centerY, zones.center, centerX, centerY, zones.normalZone);
      floorGrad.addColorStop(0, '#3a3a2a');
      floorGrad.addColorStop(1, colors.floor);
      ctx.fillStyle = floorGrad;
      ctx.beginPath();
      ctx.arc(centerX, centerY, zones.normalZone, 0, Math.PI * 2);
      ctx.fill();
      
      // Water/flood zone
      if (tide.floodRadius > 0) {
        const waterColor = tide.phase === 'high' ? colors.waterHigh : colors.waterLow;
        
        // Animated water
        ctx.save();
        ctx.globalAlpha = 0.8;
        
        // Multiple layers for wave effect
        for (let i = 0; i < 3; i++) {
          const layerRadius = tide.floodRadius * (1 - i * 0.1);
          const layerAlpha = 1 - i * 0.3;
          
          ctx.globalAlpha = 0.5 * layerAlpha;
          const waveGrad = ctx.createRadialGradient(
            centerX, centerY, 0,
            centerX, centerY, layerRadius
          );
          waveGrad.addColorStop(0, waterColor);
          waveGrad.addColorStop(1, colors.wave);
          
          ctx.fillStyle = waveGrad;
          ctx.beginPath();
          ctx.arc(centerX, centerY, layerRadius, 0, Math.PI * 2);
          ctx.fill();
        }
        
        // Ripple effect
        const rippleCount = 3;
        for (let i = 0; i < rippleCount; i++) {
          const ripplePhase = (time * 2 + i * 2) % 4;
          const rippleRadius = tide.floodRadius * (ripplePhase / 4);
          ctx.strokeStyle = `rgba(136, 187, 255, ${0.5 * (1 - ripplePhase / 4)})`;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(centerX, centerY, rippleRadius, 0, Math.PI * 2);
          ctx.stroke();
        }
        
        ctx.restore();
      }
      
      // Center island
      ctx.fillStyle = colors.floor;
      ctx.beginPath();
      ctx.arc(centerX, centerY, zones.center, 0, Math.PI * 2);
      ctx.fill();
      
      // Wall ring
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(centerX, centerY, zones.wall, 0, Math.PI * 2);
      ctx.stroke();
      
      // Tide indicator
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.font = 'bold 18px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(ARENA.name, centerX, centerY - zones.wall - 35);
      
      ctx.font = 'bold 14px sans-serif';
      const phaseLabels = { low: '🌑 LOW TIDE', rising: '🌓 RISING', high: '🌕 HIGH TIDE' };
      const phaseColors = { low: '#88ff88', rising: '#ffff88', high: '#ff8888' };
      ctx.fillStyle = phaseColors[tide.phase];
      ctx.fillText(phaseLabels[tide.phase], centerX, centerY - zones.wall - 15);
    }
    
    // ═══════════════════════════════════════════════════════════════
    // STORM TRACK - Arena com ondas de força direcionais
    // ═══════════════════════════════════════════════════════════════
    function drawStormTrack() {
      const zones = ARENA.zones;
      const colors = ARENA.colors;
      const storm = ARENA.stormSystem;
      const time = Date.now() * 0.001;
      
      // Update storm system
      storm.waveTimer += 1/60;
      
      // Warning phase
      if (storm.waveTimer >= storm.waveInterval - storm.warningTime && 
          storm.waveTimer < storm.waveInterval) {
        storm.showWarning = true;
        storm.waveDirection = storm.nextWaveDirection;
      }
      
      // Wave active phase
      if (storm.waveTimer >= storm.waveInterval && 
          storm.waveTimer < storm.waveInterval + storm.waveDuration) {
        storm.waveActive = true;
        storm.showWarning = false;
      }
      
      // Reset phase
      if (storm.waveTimer >= storm.waveInterval + storm.waveDuration) {
        storm.waveActive = false;
        storm.showWarning = false;
        storm.waveTimer = 0;
        storm.nextWaveDirection = Math.random() * Math.PI * 2;
      }
      
      // Outer wall
      ctx.fillStyle = colors.wall;
      ctx.beginPath();
      ctx.arc(centerX, centerY, zones.wall, 0, Math.PI * 2);
      ctx.fill();
      
      // ═══ BOWL VISUAL - Gradiente para parecer tigela ═══
      // Outer rim (lighter - higher)
      const bowlGrad1 = ctx.createRadialGradient(centerX, centerY, zones.outer, centerX, centerY, zones.wall);
      bowlGrad1.addColorStop(0, '#2a2a2a');
      bowlGrad1.addColorStop(1, '#3a3a3a');
      ctx.fillStyle = bowlGrad1;
      ctx.beginPath();
      ctx.arc(centerX, centerY, zones.wall, 0, Math.PI * 2);
      ctx.fill();
      
      // Mid section (darker - sloping down)
      const bowlGrad2 = ctx.createRadialGradient(centerX, centerY, zones.inner, centerX, centerY, zones.outer);
      bowlGrad2.addColorStop(0, '#1a1a1a');
      bowlGrad2.addColorStop(1, '#2a2a2a');
      ctx.fillStyle = bowlGrad2;
      ctx.beginPath();
      ctx.arc(centerX, centerY, zones.outer, 0, Math.PI * 2);
      ctx.fill();
      
      // Floor (darkest - deepest part)
      const floorGrad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, zones.inner);
      floorGrad.addColorStop(0, '#0a0a0a');
      floorGrad.addColorStop(0.5, '#151515');
      floorGrad.addColorStop(1, '#1a1a1a');
      ctx.fillStyle = floorGrad;
      ctx.beginPath();
      ctx.arc(centerX, centerY, zones.inner, 0, Math.PI * 2);
      ctx.fill();
      
      // Grid lines (bowl contours)
      ctx.strokeStyle = 'rgba(100, 100, 100, 0.4)';
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 5]);
      
      // Radial grid (depth rings)
      for (let r = zones.center; r <= zones.outer; r += 40) {
        ctx.beginPath();
        ctx.arc(centerX, centerY, r, 0, Math.PI * 2);
        ctx.stroke();
      }
      
      // Directional grid
      for (let i = 0; i < 8; i++) {
        const angle = (Math.PI * 2 / 8) * i;
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(
          centerX + Math.cos(angle) * zones.outer,
          centerY + Math.sin(angle) * zones.outer
        );
        ctx.stroke();
      }
      
      ctx.setLineDash([]);
      
      // Wave warning arrows
      if (storm.showWarning) {
        const warningAlpha = 0.5 + Math.sin(time * 10) * 0.3;
        ctx.globalAlpha = warningAlpha;
        ctx.fillStyle = colors.waveIndicator;
        
        // Draw multiple arrows showing wave direction
        for (let r = zones.center; r < zones.outer; r += 60) {
          const arrowX = centerX + Math.cos(storm.waveDirection) * r;
          const arrowY = centerY + Math.sin(storm.waveDirection) * r;
          
          ctx.save();
          ctx.translate(arrowX, arrowY);
          ctx.rotate(storm.waveDirection);
          ctx.font = 'bold 24px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('➤', 0, 0);
          ctx.restore();
        }
        
        ctx.globalAlpha = 1.0;
      }
      
      // Active wave effect
      if (storm.waveActive) {
        ctx.save();
        const waveProgress = (storm.waveTimer - storm.waveInterval) / storm.waveDuration;
        const waveDistance = zones.outer * waveProgress;
        
        // Wave gradient
        const waveGrad = ctx.createRadialGradient(
          centerX + Math.cos(storm.waveDirection) * waveDistance,
          centerY + Math.sin(storm.waveDirection) * waveDistance,
          0,
          centerX + Math.cos(storm.waveDirection) * waveDistance,
          centerY + Math.sin(storm.waveDirection) * waveDistance,
          100
        );
        waveGrad.addColorStop(0, colors.waveActive);
        waveGrad.addColorStop(1, 'rgba(0, 255, 255, 0)');
        
        ctx.fillStyle = waveGrad;
        ctx.globalAlpha = 0.7 * (1 - waveProgress);
        ctx.beginPath();
        ctx.arc(
          centerX + Math.cos(storm.waveDirection) * waveDistance,
          centerY + Math.sin(storm.waveDirection) * waveDistance,
          100,
          0,
          Math.PI * 2
        );
        ctx.fill();
        
        ctx.restore();
      }
      
      // Center zone (deepest point)
      const centerGrad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, zones.center);
      centerGrad.addColorStop(0, '#000000');
      centerGrad.addColorStop(1, '#0a0a0a');
      ctx.fillStyle = centerGrad;
      ctx.beginPath();
      ctx.arc(centerX, centerY, zones.center, 0, Math.PI * 2);
      ctx.fill();
      
      // Wall ring (rim of the bowl)
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(centerX, centerY, zones.wall, 0, Math.PI * 2);
      ctx.stroke();
      
      // Arena title and status
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.font = 'bold 18px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(ARENA.name + ' 🏔️', centerX, centerY - zones.wall - 35);
      
      ctx.font = 'bold 14px sans-serif';
      let statusText = 'CALM';
      let statusColor = '#88ff88';
      
      if (storm.showWarning) {
        statusText = '⚠️ WAVE INCOMING!';
        statusColor = '#ffff00';
      } else if (storm.waveActive) {
        statusText = '⚡ WAVE ACTIVE!';
        statusColor = '#00ffff';
      }
      
      ctx.fillStyle = statusColor;
      ctx.fillText(statusText, centerX, centerY - zones.wall - 15);
    }
    
    // ════════════════════════════════════════════════════════════════
    // ATMOSPHERIC BACKGROUND — arena environment
    // ════════════════════════════════════════════════════════════════
    function drawAtmosphere() {
      const t = Date.now();
      // Deep base — angled gradient
      const bgGrad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      bgGrad.addColorStop(0,   '#0a0c14');
      bgGrad.addColorStop(0.5, '#0d1020');
      bgGrad.addColorStop(1,   '#07090f');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Stadium outer haze ring
      const cr = ARENA.zones?.wall || 220;
      ctx.save();
      const hazeGrad = ctx.createRadialGradient(centerX, centerY, cr + 5, centerX, centerY, cr + 150);
      hazeGrad.addColorStop(0, 'rgba(100,110,160,0.07)');
      hazeGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = hazeGrad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.restore();

      // Ceiling spotlight dots around arena
      ctx.save();
      const lightSeeds = [0.3, 1.1, 1.9, 2.7, 3.5, 4.3, 5.2];
      lightSeeds.forEach((seed, i) => {
        const dist = cr + 85 + (i % 3) * 18;
        const lx = centerX + Math.cos(seed) * dist;
        const ly = centerY + Math.sin(seed) * dist;
        const flicker = 0.55 + Math.sin(t * 0.0007 + i * 1.7) * 0.1;
        const lg = ctx.createRadialGradient(lx, ly, 0, lx, ly, 20);
        lg.addColorStop(0, `rgba(255,255,240,${flicker * 0.20})`);
        lg.addColorStop(1, 'transparent');
        ctx.fillStyle = lg;
        ctx.beginPath();
        ctx.arc(lx, ly, 20, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.restore();

      // Very faint scanline overlay for CRT feel
      ctx.save();
      ctx.globalAlpha = 0.016;
      for (let y = 0; y < canvas.height; y += 4) {
        ctx.fillStyle = 'rgba(255,255,255,1)';
        ctx.fillRect(0, y, canvas.width, 1);
      }
      ctx.restore();
    }

    // ════════════════════════════════════════════════════════════════
    // SHOCKWAVE RING SYSTEM — radial impact rings on collision
    // ════════════════════════════════════════════════════════════════
    const shockwaves = [];
    function addShockwave(x, y, color1, color2, strength) {
      const s = strength || 1.0;
      shockwaves.push({ x, y, r: 4, maxR: 55 + s * 22, alpha: 0.82, color1: color1 || '#ffffff', color2: color2 || '#88aaff', thickness: 3 + s * 1.4 });
    }
    function drawShockwaves() {
      for (let i = shockwaves.length - 1; i >= 0; i--) {
        const sw = shockwaves[i];
        sw.r += 4.8 + (sw.r / sw.maxR) * 2.5;
        sw.alpha -= 0.042;
        if (sw.alpha <= 0 || sw.r >= sw.maxR) { shockwaves.splice(i, 1); continue; }
        const t = sw.r / sw.maxR;
        ctx.save();
        ctx.globalAlpha = sw.alpha * (1 - t * 0.55);
        ctx.shadowBlur = 16;
        ctx.shadowColor = sw.color1;
        ctx.strokeStyle = sw.color1;
        ctx.lineWidth = sw.thickness * (1 - t * 0.45);
        ctx.beginPath();
        ctx.arc(sw.x, sw.y, sw.r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = sw.color2;
        ctx.globalAlpha *= 0.4;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(sw.x, sw.y, sw.r * 0.68, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
    }

    function update() {
      // ✨ Update enhanced visual systems
      if (particleSystemRef.current) {
        particleSystemRef.current.update(1/60);
        impactEffectsRef.current.update(1/60);
      }
      drawAtmosphere();
      
      drawArena();
      
      // ✨ Render enhanced particle effects
      if (particleSystemRef.current) {
        particleSystemRef.current.render(ctx);
        impactEffectsRef.current.render(ctx);
      }
      
      // Iluminação da arena (FASE 2 - Pseudo-3D)
      drawArenaLighting();

      // Shockwave rings — drawn before beyblades, on arena surface
      drawShockwaves();
      
      // Opposite spin indicator
      if (isOppositeSpin) {
        ctx.save();
        ctx.globalAlpha = 0.3 + Math.sin(Date.now() * 0.005) * 0.2;
        ctx.fillStyle = '#ff00ff';
        ctx.font = 'bold 18px sans-serif';
        ctx.textAlign = 'center';
        const yPos = ARENA.type === 'circular' ? centerY - ARENA.zones.wall - 50 : centerY - ARENA.zones.height / 2.5 - 50;
        ctx.fillText('⚡ OPPOSITE SPIN', centerX, yPos);
        ctx.restore();
      }
      
      
      // ════════════════════════════════════════════════════════════════
      // RENDERIZAÇÃO DE PARTÍCULAS v2.0 (FASE 1)
      // ════════════════════════════════════════════════════════════════
      for (let i = gameParticles.length - 1; i >= 0; i--) {
        const p = gameParticles[i];
        
        // Atualizar física
        p.x += p.vx;
        p.y += p.vy;
        p.vy += p.gravity;
        
        // Atualizar rotação
        if (p.rotationSpeed) {
          p.rotation += p.rotationSpeed;
        }
        
        // Atualizar idade e vida
        p.age += 0.016; // ~60fps
        const lifePercent = p.age / p.maxLife;
        
        // Calcular fade baseado no tipo
        if (p.fade === 'linear') {
          p.life = 1 - lifePercent;
        } else if (p.fade === 'quadratic') {
          p.life = Math.pow(1 - lifePercent, 2);
        } else if (p.fade === 'exponential') {
          p.life = Math.exp(-lifePercent * 3);
        }
        
        // Remover se morreu
        if (p.life <= 0 || p.age >= p.maxLife) {
          gameParticles.splice(i, 1);
          continue;
        }
        
        // Aplicar expansion
        if (p.expansion > 1) {
          p.scale = 1 + (p.expansion - 1) * lifePercent;
        }
        
        // Aplicar pulse
        if (p.pulse) {
          p.scale *= 1 + Math.sin(p.age * p.pulseSpeed * Math.PI * 2) * 0.2;
        }
        
        const renderSize = p.size * p.scale;
        
        // Configurar alpha
        ctx.globalAlpha = p.life;
        
        // Configurar glow
        if (p.glow) {
          ctx.shadowBlur = p.glowIntensity * p.life;
          ctx.shadowColor = p.color;
        }
        
        // Configurar blur (fumaça)
        if (p.blur) {
          ctx.filter = `blur(${2 * p.scale}px)`;
        }
        
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        
        ctx.fillStyle = p.color;
        
        // Desenhar forma
        switch(p.shape) {
          case 'star':
            drawStar(ctx, 0, 0, 5, renderSize * 2, renderSize);
            break;
            
          case 'cross':
            drawCross(ctx, 0, 0, renderSize);
            break;
            
          case 'diamond':
            drawDiamond(ctx, 0, 0, renderSize);
            break;
            
          case 'plus':
            drawPlus(ctx, 0, 0, renderSize);
            break;
            
          case 'ring':
            ctx.strokeStyle = p.color;
            ctx.lineWidth = Math.max(1, renderSize * 0.3);
            ctx.beginPath();
            ctx.arc(0, 0, renderSize, 0, Math.PI * 2);
            ctx.stroke();
            break;
            
          case 'wave':
            drawWave(ctx, 0, 0, renderSize);
            break;
            
          case 'square':
            ctx.fillRect(-renderSize, -renderSize, renderSize * 2, renderSize * 2);
            break;
            
          case 'triangle':
            ctx.beginPath();
            ctx.moveTo(0, -renderSize);
            ctx.lineTo(renderSize, renderSize);
            ctx.lineTo(-renderSize, renderSize);
            ctx.closePath();
            ctx.fill();
            break;
            
          default: // circle
            ctx.beginPath();
            ctx.arc(0, 0, renderSize, 0, Math.PI * 2);
            ctx.fill();
        }
        
        ctx.restore();
        
        // Reset effects
        ctx.shadowBlur = 0;
        ctx.filter = 'none';
        ctx.globalAlpha = 1;
      }
      
      
      for (let i = gameBrokenPieces.length - 1; i >= 0; i--) {
        const piece = gameBrokenPieces[i];
        
        if (!piece.settled) {
          piece.x += piece.vx;
          piece.y += piece.vy;
          piece.vy += piece.gravity;
          piece.vx *= 0.98;
          piece.rotation += piece.rotationSpeed;
          
          // Check if piece hit the "ground" (bottom 20% of arena or near center)
          const distToCenter = Math.sqrt((piece.x - centerX) ** 2 + (piece.y - centerY) ** 2);
          const arenaRadius = ARENA.type === 'circular' ? ARENA.zones.wall : ARENA.zones.wall;
          
          // Bounce physics
          if (distToCenter > arenaRadius - 20 || piece.y > centerY + 100) {
            if (!piece.bounced) {
              piece.vy *= -0.4; // Bounce
              piece.vx *= 0.7;
              piece.bounced = true;
            } else {
              // Settle on ground
              piece.settled = true;
              piece.vx = 0;
              piece.vy = 0;
              piece.rotationSpeed *= 0.5;
              
              // Move to permanent debris
              permanentDebris.push({...piece, opacity: 1});
              gameBrokenPieces.splice(i, 1);
              continue;
            }
          }
          
          // Slow down rotation
          piece.rotationSpeed *= 0.99;
        }
        
        // Draw piece
        ctx.globalAlpha = 1;
        ctx.save();
        ctx.translate(piece.x, piece.y);
        ctx.rotate(piece.rotation);
        
        if (piece.type === 'layer') {
          ctx.fillStyle = piece.color;
          ctx.strokeStyle = '#000';
          ctx.lineWidth = 2;
          ctx.beginPath();
          for (let j = 0; j < 6; j++) {
            const angle = (Math.PI * 2 / 6) * j;
            const px = Math.cos(angle) * piece.size;
            const py = Math.sin(angle) * piece.size;
            if (j === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        } else if (piece.type === 'disc') {
          ctx.fillStyle = piece.color;
          ctx.strokeStyle = '#000';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(0, 0, piece.size, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          
          // Disc details
          ctx.fillStyle = '#333';
          ctx.beginPath();
          ctx.arc(0, 0, piece.size * 0.5, 0, Math.PI * 2);
          ctx.fill();
        } else if (piece.type === 'driver') {
          ctx.fillStyle = piece.color;
          ctx.strokeStyle = '#000';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(0, -piece.size);
          ctx.lineTo(piece.size * 0.7, piece.size);
          ctx.lineTo(-piece.size * 0.7, piece.size);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        }
        
        ctx.restore();
      }
      
      // Draw permanent debris (settled pieces)
      for (const debris of permanentDebris) {
        ctx.globalAlpha = debris.opacity * 0.8;
        ctx.save();
        ctx.translate(debris.x, debris.y);
        ctx.rotate(debris.rotation);
        
        if (debris.type === 'layer') {
          ctx.fillStyle = debris.color;
          ctx.strokeStyle = '#000';
          ctx.lineWidth = 2;
          ctx.beginPath();
          for (let j = 0; j < 6; j++) {
            const angle = (Math.PI * 2 / 6) * j;
            const px = Math.cos(angle) * debris.size;
            const py = Math.sin(angle) * debris.size;
            if (j === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        } else if (debris.type === 'disc') {
          ctx.fillStyle = debris.color;
          ctx.strokeStyle = '#000';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(0, 0, debris.size, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          
          ctx.fillStyle = '#333';
          ctx.beginPath();
          ctx.arc(0, 0, debris.size * 0.5, 0, Math.PI * 2);
          ctx.fill();
        } else if (debris.type === 'driver') {
          ctx.fillStyle = debris.color;
          ctx.strokeStyle = '#000';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(0, -debris.size);
          ctx.lineTo(debris.size * 0.7, debris.size);
          ctx.lineTo(-debris.size * 0.7, debris.size);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        }
        
        ctx.restore();
      }
      ctx.globalAlpha = 1;
      
      // ═══════════════════════════════════════════════════════════════
      // SPIN FINISH SYSTEM - Progressive Fall Animation
      // ═══════════════════════════════════════════════════════════════
      // Flow:
      // 1. Stamina/Spin hits 0 → Start tipping animation (isTipping = true)
      // 2. Tipping animation plays (~1-2 seconds)
      // 3. When tippingAngle reaches 90° → fellOver = true
      // 4. ONLY THEN declare winner
      // 
      // This prevents the "frozen game" bug where alive = false was set
      // before the animation completed, creating an inconsistent state
      // ═══════════════════════════════════════════════════════════════
      
      [b1, b2].forEach(b => {
        if (!b.alive) return; // Skip physics for dead beyblades
        
        // ETERNAL SPIN (STA 27+) - Stamina congelada por 5s iniciais
        if (b.eternalSpinActive && b.eternalSpinTimer < 300) { // 300 frames = ~5s a 60fps
          b.eternalSpinTimer++;
          if (b.eternalSpinTimer === 1) {
            addParticle(b.x, b.y, '#00ff88', 18);
            recordEvent('ETERNAL_SPIN_ACTIVATED', { bey: b === b1 ? 'b1' : 'b2' });
          }
        }
        
        const bSpinPercent = (b.spinSpeed / b.stats.maxSpin);
        const velocity = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
        
        // CELESTIAL ROTATION (SPIN 50+) - Ganha spin ao se mover
        if (b.hasCelestialRotation && velocity > 4) {
          b.spinSpeed += 0.15;
          b.spinSpeed = Math.min(b.stats.maxSpin, b.spinSpeed);
          if (Math.random() < 0.02) {
            addParticle(b.x, b.y, '#ffd700', 4);
          }
        }
        
        // VOLCANIC_RAGE WELL (WEIGHT 27+) - Puxa oponente continuamente
        if (b.hasGravityWell) {
          const opponent = b === b1 ? b2 : b1;
          if (opponent.alive) {
            const dx = b.x - opponent.x;
            const dy = b.y - opponent.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > 0 && dist < 150) {
              const pullForce = 0.3;
              opponent.vx += (dx / dist) * pullForce;
              opponent.vy += (dy / dist) * pullForce;
              
              if (Math.random() < 0.03) {
                addParticle(opponent.x, opponent.y, '#8b008b', 5);
              }
            }
          }
        }
        
        // ========== ARMOR CONTINUOUS EFFECTS ==========
        
        // Air Glide (Feather Frame) - Less friction
        if (b.armorEffect === 'air_glide') {
          b.vx *= 1.003; // Slight boost to counteract normal friction
          b.vy *= 1.003;
        }
        
        // Center Pull (Gravity Disk)
        if (b.armorEffect === 'center_pull') {
          const angleToCenter = Math.atan2(centerY - b.y, centerX - b.x);
          const distToCenter = Math.sqrt((b.x - centerX) ** 2 + (b.y - centerY) ** 2);
          if (distToCenter > 40) {
            b.vx += Math.cos(angleToCenter) * 0.25;
            b.vy += Math.sin(angleToCenter) * 0.25;
          }
        }
        
        // Regen Aura (Solar Disc)
        if (b.armorEffect === 'regen_aura') {
          b.stamina += 0.5;
          b.stamina = Math.min(250, b.stamina); // Cap no máximo
          if (Math.random() < 0.02) {
            addParticle(b.x, b.y, '#ffa500', 5);
          }
        }
        
        // Void Pulse (removes buffs every 5s)
        if (b.armorEffect === 'void_pulse') {
          b.armorVoidPulseTimer++;
          if (b.armorVoidPulseTimer >= 300) {
            b.armorVoidPulseTimer = 0;
            const opponent = b === b1 ? b2 : b1;
            opponent.armorBurnStacks = [];
            opponent.armorAdaptiveDefense = Math.max(0, opponent.armorAdaptiveDefense - 3);
            addParticle(b.x, b.y, '#000000', 10);
            addParticle(opponent.x, opponent.y, '#ffffff', 8);
            addShockwave(b.x, b.y, '#8800ff', '#ffffff', 1.2);
            recordEvent('VOID_PULSE', { caster: b === b1 ? 'b1' : 'b2' });
          }
        }
        
        // Apply Burn DoT
        for (let i = b.armorBurnStacks.length - 1; i >= 0; i--) {
          const burn = b.armorBurnStacks[i];
          b.stamina -= burn.damage / 60; // Damage per frame
          burn.duration--;
          if (burn.duration <= 0) {
            b.armorBurnStacks.splice(i, 1);
          }
        }
        
        // Apply launch pattern behaviors
        if (b.launchPattern === 'flower' && bSpinPercent > 0.3) {
          // Banking/Flower Pattern - already handled in Tornado Ridge section but enhance it
          b.flowerPatternPhase += 0.18;
        } else if (b.launchPattern === 'wobble' && bSpinPercent > 0.2) {
          // Weak Launch - unstable wobbling makes it harder to hit
          const wobbleX = Math.sin(Date.now() * 0.015) * 3;
          const wobbleY = Math.cos(Date.now() * 0.015) * 3;
          b.x += wobbleX;
          b.y += wobbleY;
          
          // Weak launch benefits from opposite spin
          if (isOppositeSpin && Math.random() < 0.05) {
            b.stamina += 0.3; // Slight stamina regen
            b.stamina = Math.min(250, b.stamina); // Cap no máximo
            addParticle(b.x, b.y, '#8b5cf6', 3);
          }
        } else if (b.launchPattern === 'center') {
          // Flat Launch - strong center pull
          const distToCenter = Math.sqrt((b.x - centerX) ** 2 + (b.y - centerY) ** 2);
          if (distToCenter > 50) {
            const angleToCenter = Math.atan2(centerY - b.y, centerX - b.x);
            b.vx += Math.cos(angleToCenter) * 0.5;
            b.vy += Math.sin(angleToCenter) * 0.5;
          }
        } else if (b.launchPattern === 'aggressive' && velocity > 6) {
          // Power Launch - maintain high speed
          const speedBoost = 1.02;
          b.vx *= speedBoost;
          b.vy *= speedBoost;
          
          if (Math.random() < 0.03) {
            addParticle(b.x, b.y, '#ef4444', 5);
          }
        } else if (b.launchPattern === 'sliding') {
          // SLIDING SHOOT - Stays on outer edge at high speed
          const distToCenter = Math.sqrt((b.x - centerX) ** 2 + (b.y - centerY) ** 2);
          const targetRadius = arenaType === 'NEXUS' ? 130 : 140;
          
          if (distToCenter < targetRadius - 20) {
            // Push back to edge
            const angle = Math.atan2(b.y - centerY, b.x - centerX);
            b.vx += Math.cos(angle) * 0.8;
            b.vy += Math.sin(angle) * 0.8;
          }
          
          // Tangential boost to maintain speed
          const angle = Math.atan2(b.y - centerY, b.x - centerX);
          const tangentX = -Math.sin(angle);
          const tangentY = Math.cos(angle);
          b.vx += tangentX * 0.3;
          b.vy += tangentY * 0.3;
          
          if (Math.random() < 0.05) {
            addParticle(b.x, b.y, '#22c55e', 5);
          }
        } else if (b.launchPattern === 'gattyaki') {
          // GATTYAKI - Delayed launch, conserves spin early
          if (bSpinPercent > 0.7) {
            // In early game, move slowly
            b.vx *= 0.95;
            b.vy *= 0.95;
          } else {
            // Late game, become aggressive
            b.vx *= 1.01;
            b.vy *= 1.01;
          }
        } else if (b.launchPattern === 'tornado_stall') {
          // TORNADO STALLING - Stay on tornado ridge
          const distToCenter = Math.sqrt((b.x - centerX) ** 2 + (b.y - centerY) ** 2);
          const tornadoRadius = arenaType === 'NEXUS' ? 120 : (arenaType === 'BB10_COMPETITIVE' ? 125 : 115);
          
          if (Math.abs(distToCenter - tornadoRadius) > 15) {
            const angle = Math.atan2(b.y - centerY, b.x - centerX);
            if (distToCenter < tornadoRadius) {
              b.vx += Math.cos(angle) * 0.4;
              b.vy += Math.sin(angle) * 0.4;
            } else {
              b.vx -= Math.cos(angle) * 0.4;
              b.vy -= Math.sin(angle) * 0.4;
            }
          }
          
          // Circular motion
          const ridgeAngle = Math.atan2(b.y - centerY, b.x - centerX);
          const tangentX = -Math.sin(ridgeAngle);
          const tangentY = Math.cos(ridgeAngle);
          b.vx += tangentX * 0.2;
          b.vy += tangentY * 0.2;
        } else if (b.launchPattern === 'rush') {
          // RUSH LAUNCH - Burns out fast
          if (bSpinPercent > 0.5) {
            b.vx *= 1.03; // Super fast early
            b.vy *= 1.03;
            b.spinSpeed *= 0.993; // But loses spin faster
            
            if (Math.random() < 0.05) {
              addParticle(b.x, b.y, '#f97316', 8);
            }
          }
        } else if (b.launchPattern === 'catapult') {
          // CATAPULT - Upper attack trajectory
          const opponent = b === b1 ? b2 : b1;
          if (opponent && opponent.alive) {
            const dx = opponent.x - b.x;
            const dy = opponent.y - b.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist < 100 && velocity > 5) {
              // Boost toward opponent
              b.vx += (dx / dist) * 0.4;
              b.vy += (dy / dist) * 0.4;
              
              if (Math.random() < 0.03) {
                addParticle(b.x, b.y, '#eab308', 6);
              }
            }
          }
        } else if (b.launchPattern === 'snipe') {
          // SNIPE - Aims directly at opponent
          const opponent = b === b1 ? b2 : b1;
          if (opponent && opponent.alive && velocity > 3) {
            const dx = opponent.x - b.x;
            const dy = opponent.y - b.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist > 40) {
              const targetAngle = Math.atan2(dy, dx);
              const currentAngle = Math.atan2(b.vy, b.vx);
              const angleDiff = targetAngle - currentAngle;
              
              // Steer toward target
              b.vx += Math.cos(targetAngle) * 0.3;
              b.vy += Math.sin(targetAngle) * 0.3;
            }
          }
        } else if (b.launchPattern === 'drift') {
          // DRIFT - Unpredictable movement
          const driftPhase = Date.now() * 0.003;
          b.vx += Math.sin(driftPhase) * 0.4;
          b.vy += Math.cos(driftPhase * 1.3) * 0.4;
          
          if (Math.random() < 0.05) {
            addParticle(b.x, b.y, '#3b82f6', 4);
          }
        } else if (b.launchPattern === 'barrage') {
          // BARRAGE - Rapid direction changes for multi-hits
          if (Math.random() < 0.1) {
            const randomAngle = Math.random() * Math.PI * 2;
            b.vx += Math.cos(randomAngle) * 1.5;
            b.vy += Math.sin(randomAngle) * 1.5;
            addParticle(b.x, b.y, '#a3e635', 10);
          }
        } else if (b.launchPattern === 'defensive') {
          // DEFENSIVE - Minimize movement and damage
          b.vx *= 0.97;
          b.vy *= 0.97;
          
          // Stay near center
          const distToCenter = Math.sqrt((b.x - centerX) ** 2 + (b.y - centerY) ** 2);
          if (distToCenter > 60) {
            const angleToCenter = Math.atan2(centerY - b.y, centerX - b.x);
            b.vx += Math.cos(angleToCenter) * 0.3;
            b.vy += Math.sin(angleToCenter) * 0.3;
          }
        } else if (b.launchPattern === 'chaos') {
          // CHAOS - Completely erratic
          if (Math.random() < 0.15) {
            b.vx += (Math.random() - 0.5) * 2;
            b.vy += (Math.random() - 0.5) * 2;
            addParticle(b.x, b.y, '#c026d3', 6);
          }
        } else if (b.launchPattern === 'pocket_avoid' && arenaType === 'BURST') {
          // POCKET AVOIDANCE - Stays away from pockets
          if (ARENA.pockets) {
            ARENA.pockets.forEach(pocket => {
              const pocketX = centerX + Math.cos(pocket.angle) * ARENA.zones.wall;
              const pocketY = centerY + Math.sin(pocket.angle) * ARENA.zones.wall;
              const distToPocket = Math.sqrt((b.x - pocketX) ** 2 + (b.y - pocketY) ** 2);
              
              if (distToPocket < 60) {
                const awayAngle = Math.atan2(b.y - pocketY, b.x - pocketX);
                b.vx += Math.cos(awayAngle) * 0.6;
                b.vy += Math.sin(awayAngle) * 0.6;
                addParticle(b.x, b.y, '#0ea5e9', 5);
              }
            });
          }
        } else if (b.launchPattern === 'exit_rush' && arenaType === 'BB10_COMPETITIVE') {
          // EXIT RUSH - Aims for exits
          if (ARENA.exits && velocity > 7) {
            // Find nearest exit
            let nearestExit = null;
            let nearestDist = Infinity;
            const rotOff = ARENA.exitRing ? ARENA.exitRing.currentAngle : 0;
            
            ARENA.exits.forEach(exit => {
              const exitAngleRot = exit.angle + rotOff;
              const exitX = centerX + Math.cos(exitAngleRot) * (ARENA.zones.wall + 10);
              const exitY = centerY + Math.sin(exitAngleRot) * (ARENA.zones.wall + 10);
              const dist = Math.sqrt((b.x - exitX) ** 2 + (b.y - exitY) ** 2);
              
              if (dist < nearestDist) {
                nearestDist = dist;
                nearestExit = { ...exit, rotatedAngle: exitAngleRot };
              }
            });
            
            if (nearestExit && nearestDist < 80) {
              const exitAngle = nearestExit.rotatedAngle;
              b.vx += Math.cos(exitAngle) * 0.5;
              b.vy += Math.sin(exitAngle) * 0.5;
              
              if (Math.random() < 0.05) {
                addParticle(b.x, b.y, '#fb923c', 8);
              }
            }
          }
        } else if (b.launchPattern === 'portal_jump' && arenaType === 'NEXUS') {
          // PORTAL JUMP - Actively seeks portals
          if (ARENA.portals && b.portalCooldown <= 0) {
            let nearestPortal = null;
            let nearestDist = Infinity;
            
            ARENA.portals.forEach(portal => {
              if (!portal.active) return;
              const portalX = centerX + Math.cos(portal.angle) * portal.radius;
              const portalY = centerY + Math.sin(portal.angle) * portal.radius;
              const dist = Math.sqrt((b.x - portalX) ** 2 + (b.y - portalY) ** 2);
              
              if (dist < nearestDist) {
                nearestDist = dist;
                nearestPortal = { x: portalX, y: portalY };
              }
            });
            
            if (nearestPortal && nearestDist < 100 && velocity > 3) {
              const portalAngle = Math.atan2(nearestPortal.y - b.y, nearestPortal.x - b.x);
              b.vx += Math.cos(portalAngle) * 0.4;
              b.vy += Math.sin(portalAngle) * 0.4;
              
              if (Math.random() < 0.05) {
                addParticle(b.x, b.y, '#8b5cf6', 6);
              }
            }
          }
        }
        
        if (arenaType === 'NEXUS') {
          handleOctagonalArenaPhysics(b, bSpinPercent, velocity);
        } else if (arenaType === 'VOLCANIC_RAGE') {
          handleIronCruciblePhysics(b, bSpinPercent, velocity);
        } else if (arenaType === 'PANGEA_PLATFORM') {
          handlePangeaPlatformPhysics(b, bSpinPercent, velocity);
        } else if (arenaType === 'COLOSSEUM_CARNAGE') {
          handleColosseumCarnagePhysics(b, bSpinPercent, velocity);
        } else if (arenaType === 'KILLER_SIDES') {
          handleKillerSidesPhysics(b, bSpinPercent, velocity);
        } else if (arenaType === 'PINBALL_INFERNO') {
          handlePinballInfernoPhysics(b, bSpinPercent, velocity);
        } else if (arenaType === 'VORTEX_COLISEUM') {
          handleVortexColiseumPhysics(b, bSpinPercent, velocity);
        } else if (arenaType === 'SPEEDWAY_CIRCUIT') {
          handleSpeedwayCircuitPhysics(b, bSpinPercent, velocity);
        } else if (arenaType === 'DOMINATION_ZONES') {
          handleDominationZonesPhysics(b, bSpinPercent, velocity);
        } else if (arenaType === 'TIDAL_SURGE') {
          handleTidalSurgePhysics(b, bSpinPercent, velocity);
        } else if (arenaType === 'STORM_TRACK') {
          handleStormTrackPhysics(b, bSpinPercent, velocity);
        } else {
          handleCircularArenaPhysics(b, bSpinPercent, velocity);
        }
        
        // Common physics
        if (bSpinPercent < 0.3) {
          const wobbleAmount = (0.3 - bSpinPercent) * 2;
          b.x += Math.sin(Date.now() * 0.02) * wobbleAmount;
          b.y += Math.cos(Date.now() * 0.02) * wobbleAmount;
          
          // Wobbling causes gradual stability loss
          const wobbleStabilityLoss = (0.3 - bSpinPercent) * 0.15;
          b.stability -= wobbleStabilityLoss;
          
          // Visual feedback when wobbling hard
          if (bSpinPercent < 0.15 && Math.random() < 0.05) {
            addParticle(b.x, b.y, '#ff9900', 3);
          }
        }
        
        b.x += b.vx;
        b.y += b.vy;
        b.rotation += b.spinSpeed * 0.1 * b.spinDirection;
        
        const hasInfiniteSpin = b.bey?.breakpoints?.some(bp => bp?.stat === 'SPIN') || false;
        const spinDecay = hasInfiniteSpin ? 0.9995 : 0.998;
        b.spinSpeed *= spinDecay;
        
        // Additional spin decay at low spin speeds
        if (bSpinPercent < 0.3) {
          b.spinSpeed *= 0.995;
        }
        
        // VISUAL: Slow rotation when dying
        if (bSpinPercent < 0.2) {
          // Super slow rotation - visível ao olho
          b.spinSpeed *= 0.993;
          
          // Partículas de "cansaço"
          if (Math.random() < 0.05) {
            addParticle(b.x, b.y, '#888', 2);
          }
        }
        
        if (bSpinPercent < 0.25 && Math.random() < 0.1) {
          addParticle(b.x, b.y, '#fbbf24', 3);
        }
        
        // Check if spin speed is too low to continue - START TIPPING
        const minSpinThreshold = 0.3;
        if (b.spinSpeed < minSpinThreshold && !b.isTipping && !b.fellOver && !winner && !burstTriggered) {
          // Start tipping animation
          b.isTipping = true;
          b.lastStopTime = Date.now();
          recordEvent('SPIN_TOO_LOW', {
            bey: b === b1 ? 'b1' : 'b2',
            finalSpin: b.spinSpeed
          });
        }
        
        // Progressive Burst System with Critical Hits
        const burstThreshold = 50 - ((b.bey?.effectiveStats?.bal || 10) * 1.0);
        
        // Check for instant burst conditions
        let instantBurst = false;
        
        // Critical Burst from accumulated damage
        if (b.burstDamage >= burstThreshold && !winner && !burstTriggered) {
          instantBurst = true;
        }
        
        // Emergency burst check - very fragile beyblades
        if (b.burstDamage >= 35 && (b.bey?.effectiveStats?.bal || 10) < 8 && !winner && !burstTriggered) {
          instantBurst = true;
        }
        
        if (instantBurst) {
          recordEvent('BURST', {
            bey: b === b1 ? 'b1' : 'b2',
            burstDamage: b.burstDamage,
            threshold: burstThreshold
          });
          burstTriggered = true;
          burstDelay = 30;
          createBurstEffect(b);
          b.alive = false;
          b.burstTime = Date.now();
          
          // Check for simultaneous burst (Draw)
          const opponent = b === b1 ? b2 : b1;
          if (opponent.burstTime && Math.abs(b.burstTime - opponent.burstTime) < 50) {
            winner = 'DRAW';
            winMethod = 'Draw (Double Burst)';
            recordEvent('DRAW', { reason: 'Both burst simultaneously' });
          }
        }
        
        // Stamina depletion - START TIPPING animation when stamina hits 0
        if (b.stamina <= 0 && !b.isTipping && !b.fellOver && !winner && !burstTriggered) {
          // Start tipping animation
          b.isTipping = true;
          b.staminaDepletionTime = Date.now();
          recordEvent('STAMINA_DEPLETED', {
            bey: b === b1 ? 'b1' : 'b2'
          });
        }
        
        // Slower stamina loss when stamina is very low - extend endgame
        if (b.stamina < 30 && b.stamina > 0) {
          const lowStaminaPenalty = (30 - b.stamina) * 0.02; // Reduced from 0.03
          b.stamina -= lowStaminaPenalty;
        }
      });
      
      function handleColosseumCarnagePhysics(b, bSpinPercent, velocity) {
        const distToCenter = Math.sqrt((b.x - centerX) ** 2 + (b.y - centerY) ** 2);
        const zones = ARENA.zones;
        const currentTime = Date.now() / 1000;

        // Update gate + obstacle cycle every 15 seconds
        if (currentTime - (ARENA.lastGateTime || 0) >= ARENA.gateInterval) {
          ARENA.lastGateTime = currentTime;
          // Activate a random inactive obstacle
          const inactive = ARENA.obstacles.filter(o => !o.active);
          if (inactive.length > 0) {
            const obs = inactive[Math.floor(Math.random() * inactive.length)];
            const gate = ARENA.gates[obs.gateId];
            // Fire obstacle from gate toward center
            const angleToCenter = Math.atan2(centerY - (centerY + gate.y), centerX - (centerX + gate.x));
            obs.x = gate.x;
            obs.y = gate.y;
            obs.vx = Math.cos(angleToCenter) * ARENA.obstacleSpeed;
            obs.vy = Math.sin(angleToCenter) * ARENA.obstacleSpeed;
            obs.active = true;
            gate.open = true;
            gate.openTime = currentTime;
            recordEvent('COLOSSEUM_GATE_OPENS', { gateId: obs.gateId });
          }
        }

        // Move and collide obstacles with bey
        ARENA.obstacles.forEach(obs => {
          if (!obs.active) return;
          obs.x += obs.vx * (1/60);
          obs.y += obs.vy * (1/60);

          // Deactivate if it exits the arena
          const obsDistFromCenter = Math.sqrt(obs.x ** 2 + obs.y ** 2);
          if (obsDistFromCenter > zones.wall + 30) {
            obs.active = false;
            const gate = ARENA.gates[obs.gateId];
            if (gate) gate.open = false;
          }

          // Collision with bey
          const bAbsX = b.x - centerX;
          const bAbsY = b.y - centerY;
          const dToBey = Math.sqrt((bAbsX - obs.x) ** 2 + (bAbsY - obs.y) ** 2);
          if (dToBey < obs.radius + b.radius) {
            const angle = Math.atan2(bAbsY - obs.y, bAbsX - obs.x);
            b.vx += Math.cos(angle) * ARENA.crushDamage * 4;
            b.vy += Math.sin(angle) * ARENA.crushDamage * 4;
            b.stamina -= ARENA.crushDamage * 3;
            b.burstDamage += ARENA.crushDamage;
            addParticle(b.x, b.y, '#ff4500', 20);
            recordEvent('COLOSSEUM_CRUSH', { bey: b === b1 ? 'b1' : 'b2', damage: ARENA.crushDamage });
          }
        });

        // Standard friction
        b.vx *= 0.990;
        b.vy *= 0.990;

        // Weak pull to center
        const angleToCenter = Math.atan2(centerY - b.y, centerX - b.x);
        if (distToCenter > zones.centerSafe) {
          b.vx += Math.cos(angleToCenter) * 0.06;
          b.vy += Math.sin(angleToCenter) * 0.06;
        }

        // Stamina drain
        let staminaLoss = 0.15 - ((b.bey?.effectiveStats?.sta || 10) * 0.005);
        staminaLoss += velocity * 0.010;
        if (distToCenter > zones.dangerZone) staminaLoss *= 1.15;

        if (velocity < 2 && b.bey?.type === 'Stamina') {
          staminaLoss *= 0.6;
          if (isOppositeSpin) staminaLoss *= 0.7;
        }

        const hasPerpetual = b.bey?.synergies?.some(s => s?.name?.includes('Perpetual')) || false;
        if (hasPerpetual) staminaLoss -= 0.01;
        if (b.eternalSpinActive && b.eternalSpinTimer < 300) staminaLoss = 0;
        b.stamina -= staminaLoss;

        // Wall collision
        if (distToCenter > zones.wall - b.radius) {
          const angle = Math.atan2(b.y - centerY, b.x - centerX);
          b.x = centerX + Math.cos(angle) * (zones.wall - b.radius);
          b.y = centerY + Math.sin(angle) * (zones.wall - b.radius);
          const normalX = Math.cos(angle);
          const normalY = Math.sin(angle);
          const dot = b.vx * normalX + b.vy * normalY;
          b.vx = b.vx - 2 * dot * normalX;
          b.vy = b.vy - 2 * dot * normalY;
          b.vx *= 0.72;
          b.vy *= 0.72;
          b.stamina -= 1.8;
          b.burstDamage += 0.5;
          addParticle(b.x, b.y, '#ffffff', 12);
        }
      }
      
      function handleKillerSidesPhysics(b, bSpinPercent, velocity) {
        const distToCenter = Math.sqrt((b.x - centerX) ** 2 + (b.y - centerY) ** 2);
        const zones = ARENA.zones;
        
        // Initialize grip state if doesn't exist
        if (!b.gripState) {
          b.gripState = {
            captured: false,
            angle: 0,  // Current angle on grip track
            spinAtCapture: 0,
            captureTime: 0  // Track time in grip
          };
        }
        
        const distToGripRadius = Math.abs(distToCenter - zones.gripRadius);
        const nearGrip = distToGripRadius < 10;  // Within 10px of grip radius
        
        // Calculate blade's current angle relative to center
        const bladeAngle = Math.atan2(b.y - centerY, b.x - centerX);
        
        // Normalize angle to 0-2π range
        const normalizeAngle = (angle) => {
          let normalized = angle % (Math.PI * 2);
          if (normalized < 0) normalized += Math.PI * 2;
          return normalized;
        };
        
        // Check if blade is in ramp gap
        const rampStart = ARENA.gripRampAngle - ARENA.gripRampWidth / 2;
        const rampEnd = ARENA.gripRampAngle + ARENA.gripRampWidth / 2;
        const normalizedBladeAngle = normalizeAngle(bladeAngle);
        const normalizedRampStart = normalizeAngle(rampStart);
        const normalizedRampEnd = normalizeAngle(rampEnd);
        
        let inRampGap = false;
        if (normalizedRampStart < normalizedRampEnd) {
          inRampGap = normalizedBladeAngle >= normalizedRampStart && normalizedBladeAngle <= normalizedRampEnd;
        } else {
          // Gap wraps around 0
          inRampGap = normalizedBladeAngle >= normalizedRampStart || normalizedBladeAngle <= normalizedRampEnd;
        }
        
        // GRIP CAPTURE LOGIC
        if (!b.gripState.captured) {
          // Capture if: near grip AND slow velocity AND NOT in ramp gap
          if (nearGrip && velocity < ARENA.gripVelocityThreshold && !inRampGap) {
            b.gripState.captured = true;
            b.gripState.angle = bladeAngle;
            b.gripState.spinAtCapture = b.stamina;
            b.gripState.captureTime = 0;  // Reset timer
            
            // Visual feedback
            addParticle(b.x, b.y, '#10b981', 20);
            addParticle(b.x, b.y, '#059669', 15);
            
            recordEvent('GRIP_CAPTURE', {
              bey: b === b1 ? 'b1' : 'b2',
              velocity: velocity.toFixed(2),
              spin: b.stamina.toFixed(1)
            });
          }
        }
        
        // GRIP MOVEMENT LOGIC
        if (b.gripState.captured) {
          // Increment time in grip (assuming ~60 FPS)
          b.gripState.captureTime += 1/60;
          
          // Calculate acceleration multiplier: +20% per 0.5 seconds
          const halfSecondsInGrip = Math.floor(b.gripState.captureTime / 0.5);
          const accelerationMultiplier = 1.0 + (halfSecondsInGrip * 0.20);
          
          // Calculate grip speed based on CURRENT SPIN (not velocity!)
          const spinPercent = b.stamina / 100;  // 0-1 range
          const baseGripSpeed = spinPercent * 0.06;  // Base speed (tripled)
          const gripSpeed = baseGripSpeed * accelerationMultiplier;  // Apply acceleration!
          
          // Direction based on rotation type
          const direction = b.bey?.rotation === 'Right' ? 1 : -1;
          
          // Update angle
          b.gripState.angle += gripSpeed * direction;
          
          // Keep blade on grip track
          b.x = centerX + Math.cos(b.gripState.angle) * zones.gripRadius;
          b.y = centerY + Math.sin(b.gripState.angle) * zones.gripRadius;
          
          // Reset velocity (blade is locked to grip)
          b.vx = 0;
          b.vy = 0;
          
          // Visual feedback during grip travel
          if (Math.random() < 0.1) {
            addParticle(b.x, b.y, '#10b981', 8);
          }
          
          // Check if reached ramp gap for launch
          const normalizedGripAngle = normalizeAngle(b.gripState.angle);
          let reachedRamp = false;
          if (normalizedRampStart < normalizedRampEnd) {
            reachedRamp = normalizedGripAngle >= normalizedRampStart && normalizedGripAngle <= normalizedRampEnd;
          } else {
            reachedRamp = normalizedGripAngle >= normalizedRampStart || normalizedGripAngle <= normalizedRampEnd;
          }
          
          // LAUNCH when hitting ramp
          if (reachedRamp) {
            // Calculate current tangential velocity from grip rotation
            // gripSpeed is angular velocity, convert to linear velocity
            const tangentialVelocity = gripSpeed * zones.gripRadius;
            
            // Calculate launch vector to center
            const angleToCenter = Math.atan2(centerY - b.y, centerX - b.x);
            
            // Use actual grip velocity as launch speed (no artificial limit!)
            const launchSpeed = tangentialVelocity;
            
            b.vx = Math.cos(angleToCenter) * launchSpeed;
            b.vy = Math.sin(angleToCenter) * launchSpeed;
            
            // Reset grip state
            b.gripState.captured = false;
            
            // Visual feedback
            addParticle(b.x, b.y, '#ef4444', 50);
            addParticle(b.x, b.y, '#dc2626', 40);
            addParticle(b.x, b.y, '#ffffff', 30);
            
            recordEvent('GRIP_LAUNCH', {
              bey: b === b1 ? 'b1' : 'b2',
              launchSpeed: launchSpeed.toFixed(2),
              spin: b.stamina.toFixed(1)
            });
          }
          
          return; // Skip normal physics while in grip
        }
        
        // NORMAL PHYSICS (when not in grip) - IDENTICAL TO BB-10
        
        // Initialize cooldown if doesn't exist
        if (!b.gravityDisabledUntil) b.gravityDisabledUntil = 0;
        
        const DEAD_ZONE_RADIUS = 40;  // Center free for knockback
        const angleToCenter = Math.atan2(centerY - b.y, centerX - b.x);
        
        // Check cooldown (after recent collision)
        const currentFrame = Math.floor(Date.now() / 16.67);  // ~60fps
        const inCooldown = currentFrame < b.gravityDisabledUntil;
        
        // Apply gravity ONLY if outside dead zone AND no active cooldown
        if (distToCenter > DEAD_ZONE_RADIUS && !inCooldown) {
          let gravity = 0.12;  // Same as BB-10
          
          // Zone-based gravity (mimicking BB-10)
          if (distToCenter < zones.centerBowl) gravity *= 0.5;
          else if (distToCenter < zones.innerSlope) gravity *= 0.8;
          else if (distToCenter < zones.tornadoRidge) gravity *= 1.2;
          else if (distToCenter < zones.outerSlope) gravity *= 1.5;
          else gravity *= 2.0;
          
          b.vx += Math.cos(angleToCenter) * gravity;
          b.vy += Math.sin(angleToCenter) * gravity;
        }
        
        // Friction - IDENTICAL TO BB-10
        b.vx *= 0.997;
        b.vy *= 0.997;
        
        // Stamina drain - IDENTICAL TO BB-10
        let staminaLoss = 0.15 - ((b.bey?.effectiveStats?.sta || 10) * 0.005);
        staminaLoss += velocity * 0.010;
        
        // Zone-based stamina adjustment
        if (distToCenter < zones.centerBowl) staminaLoss *= 0.8;
        else if (distToCenter > zones.outerSlope) staminaLoss *= 1.2;
        
        // LAD bonus
        if (velocity < 2 && b.bey?.type === 'Stamina') {
          staminaLoss *= 0.5;
          if (isOppositeSpin) staminaLoss *= 0.7;
          if (Math.random() < 0.05) addParticle(b.x, b.y, '#00ff88', 5);
        }
        
        const hasPerpetual = b.bey?.synergies?.some(s => s?.name?.includes('Perpetual')) || false;
        if (hasPerpetual) staminaLoss -= 0.01;
        
        // ETERNAL SPIN
        if (b.eternalSpinActive && b.eternalSpinTimer < 300) {
          staminaLoss = 0;
          if (Math.random() < 0.05) {
            addParticle(b.x, b.y, '#00ffaa', 5);
          }
        }
        
        b.stamina -= staminaLoss;
        
        // Wall collision
        if (distToCenter > zones.wall - b.radius) {
          const angle = Math.atan2(b.y - centerY, b.x - centerX);
          b.x = centerX + Math.cos(angle) * (zones.wall - b.radius);
          b.y = centerY + Math.sin(angle) * (zones.wall - b.radius);
          
          const normalX = Math.cos(angle);
          const normalY = Math.sin(angle);
          const dotProduct = b.vx * normalX + b.vy * normalY;
          
          b.vx = b.vx - 2 * dotProduct * normalX;
          b.vy = b.vy - 2 * dotProduct * normalY;
          
          b.vx *= 0.75;
          b.vy *= 0.75;
          b.stamina -= 1.5;
          b.burstDamage += 0.4;
          
          // Enable gravity cooldown after wall collision
          b.gravityDisabledUntil = currentFrame + 30;  // 30 frames (~0.5s)
          
          addParticle(b.x, b.y, '#ffffff', 10);
        }
      }
      
      function handleCircularArenaPhysics(b, bSpinPercent, velocity) {
        const distToCenter = Math.sqrt((b.x - centerX) ** 2 + (b.y - centerY) ** 2);
        const zones = ARENA.zones;
        
        let currentZone = 'wall';
        if (distToCenter <= zones.centerBowl) currentZone = 'center';
        else if (distToCenter <= zones.innerSlope) currentZone = 'innerSlope';
        else if (distToCenter <= zones.tornadoRidge) currentZone = 'tornadoRidge';
        else if (distToCenter <= zones.outerSlope) currentZone = 'outerSlope';
        
        // Check pockets/exits
        let inPocket = false;
        let inExit = false;
        
        if (ARENA.pockets.length > 0) {
          ARENA.pockets.forEach(pocket => {
            const pocketX = centerX + Math.cos(pocket.angle) * zones.wall;
            const pocketY = centerY + Math.sin(pocket.angle) * zones.wall;
            const distToPocket = Math.sqrt((b.x - pocketX) ** 2 + (b.y - pocketY) ** 2);
            
            if (distToPocket < pocket.radius) {
              inPocket = true;
              b.vx *= 0.88;
              b.vy *= 0.88;
              b.stamina -= 0.3;
              b.burstDamage += 0.2;
              
              if (Math.random() < 0.02) {
                addParticle(b.x, b.y, '#4488ff', 5);
              }
            }
          });
        }
        
        // Grace Period Helper Function (BB10 + BB10_COMPETITIVE)
        function getEffectiveExitWidth(exit, battleTime) {
          const isGraceArena = (arenaType === 'BB10_COMPETITIVE' || arenaType === 'BB10_COMPETITIVE');
          if (isGraceArena && ARENA.gracePeriod && ARENA.gracePeriod.enabled) {
            if (battleTime < ARENA.gracePeriod.duration) {
              return exit.width * ARENA.gracePeriod.exitMultiplier;
            }
          }
          return exit.width;
        }
        
        if (ARENA.exits.length > 0 && ARENA.exitsOpen) {
          const angleToCenter = Math.atan2(b.y - centerY, b.x - centerX);
          const rotOffset = ARENA.exitRing ? ARENA.exitRing.currentAngle : 0;
          const currentBattleTime = (Date.now() - battleStartTimeRef.current) / 1000;
          
          ARENA.exits.forEach(exit => {
            // BB-10 Grace Period: exits menores nos primeiros 3s
            const effectiveWidth = getEffectiveExitWidth(exit, currentBattleTime);
            const halfA = (effectiveWidth / 25) * 0.3;  // Escala baseado no width (25 = normal)
            
            const exitAngle = exit.angle + rotOffset;
            // Normalize angle difference
            let angleDiff = angleToCenter - exitAngle;
            angleDiff = ((angleDiff + Math.PI) % (Math.PI * 2)) - Math.PI;
            if (Math.abs(angleDiff) < halfA && distToCenter > zones.wall - 10) {
              inExit = true;
            }
          });
        }
        
        // Tornado Ridge mechanics with Sweet Spot Boost
        if (currentZone === 'tornadoRidge' && b.bey?.type === 'Attack' && bSpinPercent > 0.4) {
          b.inTornadoRidge = true; // Flag for visual effects
          if (velocity > 5) {
            b.flowerPatternPhase += 0.2;
            const ridgeAngle = Math.atan2(b.y - centerY, b.x - centerX);
            const tangentX = -Math.sin(ridgeAngle);
            const tangentY = Math.cos(ridgeAngle);
            
            // BB-10 SWEET SPOT CHECK (desativado em arenas competitive)
            let inSweetSpot = false;
            if (false) { // BB10_COMPETITIVE: sweetspot boost removido
              ARENA.sweetSpots.forEach(spot => {
                let angleDiff = ridgeAngle - spot.angle;
                angleDiff = ((angleDiff + Math.PI) % (Math.PI * 2)) - Math.PI;
                if (Math.abs(angleDiff) < spot.width && Math.abs(distToCenter - spot.radius) < 15) {
                  inSweetSpot = true;
                }
              });
            }
            
            if (inSweetSpot) {
              // SWEET SPOT BOOST: +15% velocity
              const boost = ARENA.sweetSpots[0].boost || 1.15;
              b.vx *= boost;
              b.vy *= boost;
              // Visual feedback
              if (Math.random() < 0.15) {
                addParticle(b.x, b.y, '#00ff00', 5);
              }
            }
            
            b.vx += tangentX * 0.3;
            b.vy += tangentY * 0.3;
            b.vx *= 0.995;
            b.vy *= 0.995;
            
            if (Math.random() < 0.05) {
              addParticle(b.x, b.y, '#ffa500', 3);
            }
          }
        } else {
          b.inTornadoRidge = false;
          // v3.5-HÍBRIDO: FRICÇÃO REDUZIDA (0.98 → 0.997)
          // Beyblades deslizam 2x mais longe após knockback!
          b.vx *= 0.997;
          b.vy *= 0.997;
        }
        
        // Center Bowl
        // v3.4: PULL REMOVIDO! Stamina agora se comporta como outros tipos!
        /*
        if (currentZone === 'center' && b.bey?.type === 'Stamina') {
          b.vx *= 0.99;
          b.vy *= 0.99;
          
          const angleToCenter = Math.atan2(centerY - b.y, centerX - b.x);
          if (distToCenter > 15) {
            b.vx += Math.cos(angleToCenter) * 0.1;
            b.vy += Math.sin(angleToCenter) * 0.1;
          }
        }
        */
        
        // Flower Pattern for Attack
        if (b.bey?.type === 'Attack' && bSpinPercent > 0.4 && !inPocket) {
          b.flowerPatternPhase += 0.15;
          const patternRadius = 40;
          const patternX = Math.cos(b.flowerPatternPhase) * patternRadius;
          const patternY = Math.sin(b.flowerPatternPhase * 2) * patternRadius * 0.5;
          b.vx += patternX * 0.015;
          b.vy += patternY * 0.015;
        }
        
        // Stamina center pull
        // v3.4: CENTER PULL REMOVIDO! Também anulava knockback!
        // ANTES: centerPull = 0.35 puxava Stamina para centro
        // AGORA: Stamina se move LIVREMENTE como os outros!
        /*
        if (b.bey?.type === 'Stamina' && currentZone !== 'center') {
          const angleToCenter = Math.atan2(centerY - b.y, centerX - b.x);
          const centerPull = 0.35;
          b.vx += Math.cos(angleToCenter) * centerPull;
          b.vy += Math.sin(angleToCenter) * centerPull;
        }
        */
        
        // ═══════════════════════════════════════════════════════════════
        // Arena slope gravity
        // v3.5-HÍBRIDO: Sistema Completo (Dead Zone + Gravidade Reduzida + Cooldown)
        // ═══════════════════════════════════════════════════════════════
        //
        // SISTEMA MULTI-CAMADAS:
        //   1. Dead Zone (40px): SEM gravidade no centro
        //   2. Cooldown (30 frames pós-colisão): SEM gravidade  
        //   3. Fora: Gravidade base 0.12
        //
        // RESULTADO: Knockback preservado 95% do tempo! 🚀
        
        // Inicializar cooldown se não existir
        if (!b.gravityDisabledUntil) b.gravityDisabledUntil = 0;
        
        const DEAD_ZONE_RADIUS = 40;  // Centro livre para knockback
        const angleToCenter = Math.atan2(centerY - b.y, centerX - b.x);
        
        // VERIFICAR COOLDOWN (após colisão recente)
        const currentFrame = Math.floor(Date.now() / 16.67);  // ~60fps
        const inCooldown = currentFrame < b.gravityDisabledUntil;
        
        // APLICAR GRAVIDADE apenas se:
        // - FORA do dead zone E
        // - SEM cooldown ativo
        if (distToCenter > DEAD_ZONE_RADIUS && !inCooldown) {
          let gravity = 0.12;  // Base REDUZIDA (12x menor que original 0.5!)
          
          // Progressão suave com distância (evita transição abrupta)
          const distBeyondDeadZone = distToCenter - DEAD_ZONE_RADIUS;
          const distanceMultiplier = 1.0 + (distBeyondDeadZone / 120);
          gravity *= Math.min(distanceMultiplier, 1.8);
          
          // Ajustar por zona
          if (currentZone === 'center') gravity *= 0.8;
          else if (currentZone === 'innerSlope') gravity *= 1.2;
          else if (currentZone === 'tornadoRidge') gravity *= 1.5;
          else if (currentZone === 'outerSlope') gravity *= 2.0;  // MAIS FORTE!
          
          b.vx += Math.cos(angleToCenter) * gravity;
          b.vy += Math.sin(angleToCenter) * gravity;
        }
        // CASO CONTRÁRIO: SEM gravidade! Knockback age livremente! ✅
        // ═══════════════════════════════════════════════════════════════
        
        // Stamina drain by zone
        let staminaLoss = 0.15 - ((b.bey?.effectiveStats?.sta || 10) * 0.005);
        staminaLoss += velocity * 0.010;
        
        if (currentZone === 'center') staminaLoss *= 0.8;
        else if (currentZone === 'tornadoRidge' && b.bey?.type === 'Attack') staminaLoss *= 0.9;
        else if (currentZone === 'outerSlope') staminaLoss *= 1.2;
        
        // LAD
        if (velocity < 2 && b.bey?.type === 'Stamina') {
          staminaLoss *= 0.5;
          if (isOppositeSpin) staminaLoss *= 0.7;
          if (Math.random() < 0.05) addParticle(b.x, b.y, '#00ff88', 5);
        }
        
        const hasPerpetual = b.bey?.synergies?.some(s => s?.name?.includes('Perpetual')) || false;
        if (hasPerpetual) staminaLoss -= 0.01;
        
        // ETERNAL SPIN (STA 27+) - Não perde stamina nos primeiros 5s
        if (b.eternalSpinActive && b.eternalSpinTimer < 300) {
          staminaLoss = 0;
          if (Math.random() < 0.05) {
            addParticle(b.x, b.y, '#00ffaa', 5);
          }
        }
        
        b.stamina -= staminaLoss;
        
        // ═══════════════════════════════════════════════════════════════
        // BB-10 WALL SYSTEM: O anel vermelho todo dá ring-out em alta velocidade
        // ─ Hits fracos: ricocheteiam com dano
        // ─ Hits fortes: ring-out em qualquer ponto do anel
        // ─ Exits (buracos): ring-out com velocidade ainda menor
        // ═══════════════════════════════════════════════════════════════
        
        if (distToCenter > zones.wall - b.radius) {
          
          // Verificar grace period global (bloqueia ring-out completamente)
          const graceCurrentTime = (Date.now() - battleStartTimeRef.current) / 1000;
          const inGracePeriod = ARENA.gracePeriod?.enabled &&
                                ARENA.gracePeriod?.wallRingOutDisabled &&
                                graceCurrentTime < ARENA.gracePeriod.duration;

          // Thresholds: competitive usa valores mais altos (mais difícil de sair)
          const isCompetitive = arenaType === 'BB10_COMPETITIVE';
          const wallRingOutVelocity = inExit
            ? (isCompetitive ? 7.0 : 6)
            : (isCompetitive ? 9.5 : 8.5);
          
          if (!inGracePeriod && velocity > wallRingOutVelocity && !winner && !burstTriggered) {
            // RING-OUT!
            b.ringOutTime = Date.now();
            
            const opponent = b === b1 ? b2 : b1;
            const timeDiff = opponent.ringOutTime ? Math.abs(b.ringOutTime - opponent.ringOutTime) : Infinity;
            
            addParticle(b.x, b.y, '#ff0000', 50);
            addParticle(b.x, b.y, '#ffaa00', 40);
            addParticle(b.x, b.y, '#ffffff', 30);
            addScreenShake(3.5);
            
            if (timeDiff < 100) {
              recordEvent('DRAW', { reason: 'Both ring out simultaneously' });
              winner = 'DRAW';
              winMethod = 'Draw (Double Ring-Out)';
              b.alive = false;
              opponent.alive = false;
              addParticle(opponent.x, opponent.y, '#ffaa00', 40);
            } else {
              recordEvent('RING_OUT', { 
                bey: b === b1 ? 'b1' : 'b2',
                velocity,
                inExit,
                location: { x: b.x, y: b.y }
              });
              winner = b === b1 ? b2 : b1;
              winMethod = 'Ring-Out Finish';
              b.alive = false;
              const loserName = b === b1 ? bey1.name : bey2.name;
              addEvent('RING_OUT', '💥 RING OUT! 💥', `${loserName} exits the arena!`);
            }
            
          } else {
            // Velocidade baixa/média: rebate com dano proporcional
            const angle = Math.atan2(b.y - centerY, b.x - centerX);
            b.x = centerX + Math.cos(angle) * (zones.wall - b.radius);
            b.y = centerY + Math.sin(angle) * (zones.wall - b.radius);
            
            const normalX = Math.cos(angle);
            const normalY = Math.sin(angle);
            const dotProduct = b.vx * normalX + b.vy * normalY;
            
            b.vx = b.vx - 2 * dotProduct * normalX;
            b.vy = b.vy - 2 * dotProduct * normalY;
            
            const energyLoss = Math.min(0.85, 0.55 + velocity * 0.04);
            b.vx *= (1 - energyLoss);
            b.vy *= (1 - energyLoss);
            
            const wallDamage = 1.5 + velocity * 0.3;
            b.stamina -= wallDamage;
            b.burstDamage += 0.4 + velocity * 0.08;
            
            const particleCount = Math.min(30, 8 + Math.floor(velocity * 1.5));
            addParticle(b.x, b.y, '#ffffff', particleCount);
            if (velocity > 5) addParticle(b.x, b.y, '#ff4444', Math.floor(velocity * 2));
          }
        }
      }
      
      function handleOctagonalArenaPhysics(b, bSpinPercent, velocity) {
        const nexusZones = ARENA.zones;
        const distToCenter = Math.sqrt((b.x - centerX) ** 2 + (b.y - centerY) ** 2);
        
        // ═══════════════════════════════════════════════════════════
        // PORTAL SUCTION SYSTEM - Every 5 seconds
        // ═══════════════════════════════════════════════════════════
        const currentTime = Date.now() / 1000;
        const suction = ARENA.portalSuction;
        
        if (suction && suction.enabled) {
          // Check if it's time to start new suction
          if (!suction.currentlyActive && currentTime - suction.lastSuctionTime >= suction.interval) {
            // Start new suction
            suction.currentlyActive = true;
            suction.suctionStartTime = currentTime;
            suction.lastSuctionTime = currentTime;
            
            // Pick random portal
            const randomPortal = ARENA.portals[Math.floor(Math.random() * ARENA.portals.length)];
            suction.activePortal = randomPortal;
            
            // Visual feedback - explosion at portal
            const portalX = centerX + Math.cos(randomPortal.angle) * randomPortal.radius;
            const portalY = centerY + Math.sin(randomPortal.angle) * randomPortal.radius;
            for (let i = 0; i < 40; i++) {
              const angle = (Math.PI * 2 / 40) * i;
              const px = portalX + Math.cos(angle) * 30;
              const py = portalY + Math.sin(angle) * 30;
              addParticle(px, py, randomPortal.color, 15);
            }
            
            recordEvent('PORTAL_SUCTION_START', {
              portal: randomPortal.id,
              time: currentTime
            });
          }
          
          // Check if suction should end
          if (suction.currentlyActive && currentTime - suction.suctionStartTime >= suction.duration) {
            suction.currentlyActive = false;
            suction.activePortal = null;
          }
          
          // Apply suction force if active
          if (suction.currentlyActive && suction.activePortal) {
            const portal = suction.activePortal;
            const portalX = centerX + Math.cos(portal.angle) * portal.radius;
            const portalY = centerY + Math.sin(portal.angle) * portal.radius;
            const distToPortal = Math.sqrt((b.x - portalX) ** 2 + (b.y - portalY) ** 2);
            
            // Suction strength decreases with distance
            const suctionStrength = Math.max(0, (300 - distToPortal) / 300) * 1.5;
            const angleToPortal = Math.atan2(portalY - b.y, portalX - b.x);
            
            // Pull toward portal
            b.vx += Math.cos(angleToPortal) * suctionStrength;
            b.vy += Math.sin(angleToPortal) * suctionStrength;
            
            // Visual particles being sucked
            if (Math.random() < 0.3) {
              addParticle(b.x, b.y, portal.color, 6);
            }
            
            // If bey reaches portal, teleport it out to random portal
            if (distToPortal < 35) {
              const otherPortals = ARENA.portals.filter(p => p.id !== portal.id);
              const exitPortal = otherPortals[Math.floor(Math.random() * otherPortals.length)];
              
              // Eject from exit portal
              const exitAngle = exitPortal.angle + Math.PI;
              const exitX = centerX + Math.cos(exitAngle) * 100;
              const exitY = centerY + Math.sin(exitAngle) * 100;
              
              // Teleport trail
              for (let i = 0; i < 25; i++) {
                const t = i / 25;
                const px = portalX + (exitX - portalX) * t;
                const py = portalY + (exitY - portalY) * t;
                addParticle(px, py, portal.color, 5);
                addParticle(px, py, exitPortal.color, 5);
              }
              
              b.x = exitX;
              b.y = exitY;
              
              // Eject velocity
              b.vx = Math.cos(exitAngle) * 10;
              b.vy = Math.sin(exitAngle) * 10;
              
              // Exit explosion
              for (let i = 0; i < 30; i++) {
                const angle = (Math.PI * 2 / 30) * i;
                const px = exitX + Math.cos(angle) * 25;
                const py = exitY + Math.sin(angle) * 25;
                addParticle(px, py, exitPortal.color, 12);
              }
              
              recordEvent('PORTAL_SUCTION_TELEPORT', {
                from: portal.id,
                to: exitPortal.id
              });
            }
          }
        }
        // ═══════════════════════════════════════════════════════════
        
        // Update portal cooldowns
        if (b.portalCooldown > 0) {
          b.portalCooldown -= 0.016; // ~60fps
        }
        
        // Apply portal boost after exiting (jetstream effect)
        if (b.portalBoostFrames && b.portalBoostFrames > 0) {
          const boostForce = 0.8; // Reduced from 1.2 for stability
          b.vx += Math.cos(b.portalBoostAngle) * boostForce;
          b.vy += Math.sin(b.portalBoostAngle) * boostForce;
          b.portalBoostFrames--;
          
          // Visual trail during boost
          if (Math.random() < 0.3) {
            addParticle(b.x, b.y, '#00ffff', 5);
          }
        }
        
        // Check portal interactions
        if (!b.inPortal && b.portalCooldown <= 0) {
          ARENA.portals.forEach(portal => {
            if (!portal.active) return;
            
            const portalX = centerX + Math.cos(portal.angle) * portal.radius;
            const portalY = centerY + Math.sin(portal.angle) * portal.radius;
            const distToPortal = Math.sqrt((b.x - portalX) ** 2 + (b.y - portalY) ** 2);
            
            if (distToPortal < 30 && velocity > 2) {
              // TELEPORT!
              b.inPortal = true;
              b.portalBoostFrames = 15;
              
              // Choose random exit portal (not the entry one)
              const otherPortals = ARENA.portals.filter(p => p.id !== portal.id && p.active);
              if (otherPortals.length > 0) {
                const exitPortal = otherPortals[Math.floor(Math.random() * otherPortals.length)];
                
                // Calculate safe exit position - INSIDE the arena, away from portal edge
                const safeDistance = 100; // Distance from center instead of portal edge
                const exitAngle = exitPortal.angle + Math.PI; // Opposite side - shoot INTO arena
                const exitX = centerX + Math.cos(exitAngle) * safeDistance;
                const exitY = centerY + Math.sin(exitAngle) * safeDistance;
                
                // Warp trail particles from entry to exit - ENHANCED
                for (let i = 0; i < 30; i++) {
                  const t = i / 30;
                  const px = portalX + (exitX - portalX) * t;
                  const py = portalY + (exitY - portalY) * t;
                  addParticle(px, py, portal.color, 5);
                  addParticle(px, py, exitPortal.color, 5);
                  if (i % 3 === 0) {
                    addParticle(px, py, '#ffffff', 8);
                  }
                }
                
                // Entry portal explosion effect
                for (let i = 0; i < 20; i++) {
                  const angle = (Math.PI * 2 / 20) * i;
                  const px = portalX + Math.cos(angle) * 20;
                  const py = portalY + Math.sin(angle) * 20;
                  addParticle(px, py, portal.color, 10);
                }
                
                // SAFELY teleport to new position
                b.x = exitX;
                b.y = exitY;
                
                // WARP CATAPULT - Launch TOWARDS CENTER with controlled force
                const launchAngle = Math.atan2(centerY - exitY, centerX - exitX);
                const launchSpeed = 12; // Reduced from 18 for stability
                
                // Set velocity towards center
                b.vx = Math.cos(launchAngle) * launchSpeed;
                b.vy = Math.sin(launchAngle) * launchSpeed;
                
                // Store boost angle for continuous boost
                b.portalBoostAngle = launchAngle;
                
                // Warp chain system
                b.warpChain++;
                b.lastPortalTime = currentTime;
                
                // Set cooldown (3 seconds - reduced)
                b.portalCooldown = 3.0;
                portal.active = false;
                setTimeout(() => { portal.active = true; }, 3000);
                
                // Visual effects - EXPLOSIVE EXIT with shockwave
                addParticle(exitX, exitY, exitPortal.color, 100);
                addParticle(exitX, exitY, '#ffffff', 80);
                addParticle(exitX, exitY, portal.color, 60);
                addParticle(exitX, exitY, '#ffff00', 40);
                
                // Shockwave ring
                for (let i = 0; i < 16; i++) {
                  const ringAngle = (Math.PI * 2 / 16) * i;
                  const ringX = exitX + Math.cos(ringAngle) * 30;
                  const ringY = exitY + Math.sin(ringAngle) * 30;
                  addParticle(ringX, ringY, exitPortal.color, 15);
                }
                
                // Launch trail particles - create a beam effect
                for (let i = 0; i < 30; i++) {
                  const trailDist = i * 4;
                  const trailX = exitX + Math.cos(launchAngle) * trailDist;
                  const trailY = exitY + Math.sin(launchAngle) * trailDist;
                  addParticle(trailX, trailY, exitPortal.color, 10);
                  addParticle(trailX, trailY, '#ffffff', 6);
                }
                
                // Record event
                recordEvent('PORTAL_WARP', {
                  bey: b === b1 ? 'b1' : 'b2',
                  from: portal.id,
                  to: exitPortal.id,
                  warpChain: b.warpChain,
                  velocity: launchSpeed
                });
                
                // FASE 1: Portal teleport effects
                addEnergyParticles(b.x, b.y, '#a78bfa', 20);
                addSparkParticles(b.x, b.y, 10);
                // Check for warp chain bonus
                if (currentTime - b.lastPortalTime < 3 && b.warpChain >= 2) {
                  // WARP CHAIN ACTIVATED!
                  recordEvent('WARP_CHAIN_ACTIVE', {
                    bey: b === b1 ? 'b1' : 'b2',
                    chain: b.warpChain
                  });
                  addParticle(b.x, b.y, '#ff00ff', 60);
                  addParticle(b.x, b.y, '#ffff00', 50);
                }
                
                // Reset portal flag immediately after teleport
                b.inPortal = false;
              } else {
                // No valid exit portal - cancel teleport
                b.inPortal = false;
              }
            }
          });
        }
        
        // Reset warp chain if too much time passed
        if (currentTime - b.lastPortalTime > 3) {
          b.warpChain = 0;
        }
        
        // Apply warp chain damage bonus on next hit
        // This is checked in collision detection
        
        // Friction - reduced to preserve portal momentum
        b.vx *= 0.990;
        b.vy *= 0.990;
        
        // ═══════════════════════════════════════════════════════════════
        // ARENA SLOPE VOLCANIC_RAGE
        // v3.5-HÍBRIDO: Dead Zone + Gravidade Reduzida + Cooldown
        // ═══════════════════════════════════════════════════════════════
        
        // Inicializar cooldown
        if (!b.gravityDisabledUntil) b.gravityDisabledUntil = 0;
        
        const DEAD_ZONE_RADIUS = 40;  // Centro livre
        const angleToCenter = Math.atan2(centerY - b.y, centerX - b.x);
        
        // Verificar cooldown
        const currentFrame = Math.floor(Date.now() / 16.67);
        const inCooldown = currentFrame < b.gravityDisabledUntil;
        
        // Aplicar gravidade (OCTAGONAL/NEXUS)
        if (distToCenter > DEAD_ZONE_RADIUS && !inCooldown) {
          let gravity = 0.12;  // Base reduzida (era 0.08-0.50, agora ~8x menor!)
          
          // Progressão com distância
          const distBeyondDeadZone = distToCenter - DEAD_ZONE_RADIUS;
          const distanceMultiplier = 1.0 + (distBeyondDeadZone / 120);
          gravity *= Math.min(distanceMultiplier, 1.8);
          
          // Ajustar por zona (similar mas muito mais fraco)
          if (distToCenter <= nexusZones.centerSafe) gravity *= 0.8;
          else if (distToCenter <= nexusZones.mainArea * 0.5) gravity *= 1.2;
          else if (distToCenter <= nexusZones.mainArea) gravity *= 1.5;
          else gravity *= 2.0;
          
          b.vx += Math.cos(angleToCenter) * gravity;
          b.vy += Math.sin(angleToCenter) * gravity;
          
          // Visual feedback para slope (particles quando deslizando)
          if (gravity > 0.08 && velocity > 3 && Math.random() < 0.08) {
            addParticle(b.x, b.y, ARENA.colors.grid, 3);
          }
        }
        
        // Extra center pull para Stamina (REDUZIDO também!)
        // v3.5-HÍBRIDO: 0.15 → 0.03 (5x menor)
        if (b.bey?.type === 'Stamina' && distToCenter > DEAD_ZONE_RADIUS && !inCooldown) {
          const extraPull = 0.03;  // Era 0.15, agora 5x menor!
          b.vx += Math.cos(angleToCenter) * extraPull;
          b.vy += Math.sin(angleToCenter) * extraPull;
        }
        // ═══════════════════════════════════════════════════════════════
        
        // Stamina drain - varies by zone like circular arenas
        let staminaLoss = 0.14 - ((b.bey?.effectiveStats?.sta || 10) * 0.005);
        staminaLoss += velocity * 0.008;
        
        // Zone-based stamina multipliers
        if (distToCenter < nexusZones.centerSafe) {
          staminaLoss *= 0.7; // Safe zone - efficient
        } else if (distToCenter < nexusZones.mainArea * 0.5) {
          staminaLoss *= 0.9; // Inner area - normal
        } else if (distToCenter < nexusZones.mainArea) {
          staminaLoss *= 1.1; // Main area - slightly more drain
        } else {
          staminaLoss *= 1.3; // Near walls - high drain
        }
        
        // LAD
        if (velocity < 2 && b.bey?.type === 'Stamina') {
          staminaLoss *= 0.6;
          if (isOppositeSpin) staminaLoss *= 0.7;
          if (Math.random() < 0.05) addParticle(b.x, b.y, '#00ff88', 5);
        }
        
        const hasPerpetual = b.bey?.synergies?.some(s => s?.name?.includes('Perpetual')) || false;
        if (hasPerpetual) staminaLoss -= 0.01;
        
        // ETERNAL SPIN (STA 27+) - Não perde stamina nos primeiros 5s
        if (b.eternalSpinActive && b.eternalSpinTimer < 300) {
          staminaLoss = 0;
        }
        
        b.stamina -= staminaLoss;
        
        // SAFETY CHECK: Ensure bey is always within arena bounds
        const maxDistFromCenter = nexusZones.wall - b.radius - 10;
        if (distToCenter > maxDistFromCenter) {
          // Emergency repositioning - place back in safe zone
          const angle = Math.atan2(b.y - centerY, b.x - centerX);
          b.x = centerX + Math.cos(angle) * maxDistFromCenter;
          b.y = centerY + Math.sin(angle) * maxDistFromCenter;
          
          // Reduce velocity
          b.vx *= 0.7;
          b.vy *= 0.7;
          
          addParticle(b.x, b.y, '#ff9900', 15);
        }
        
        // Octagonal wall collision
        const wallMargin = b.radius + 5;
        const octagonRadius = nexusZones.wall;
        
        if (distToCenter > octagonRadius - wallMargin) {
          // Push back inside
          const angle = Math.atan2(b.y - centerY, b.x - centerX);
          b.x = centerX + Math.cos(angle) * (octagonRadius - wallMargin);
          b.y = centerY + Math.sin(angle) * (octagonRadius - wallMargin);
          
          // Bounce
          const normalX = Math.cos(angle);
          const normalY = Math.sin(angle);
          const dotProduct = b.vx * normalX + b.vy * normalY;
          
          b.vx = b.vx - 2 * dotProduct * normalX;
          b.vy = b.vy - 2 * dotProduct * normalY;
          
          b.vx *= 0.75;
          b.vy *= 0.75;
          b.stamina -= 1.5;
          b.burstDamage += 0.4;
          
          addParticle(b.x, b.y, '#ffffff', 10);
        }
      }
      
      function distanceToSegment(px, py, x1, y1, x2, y2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const lengthSquared = dx * dx + dy * dy;
        
        if (lengthSquared === 0) return Math.sqrt((px - x1) ** 2 + (py - y1) ** 2);
        
        const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lengthSquared));
        const projX = x1 + t * dx;
        const projY = y1 + t * dy;
        
        return Math.sqrt((px - projX) ** 2 + (py - projY) ** 2);
      }
      
      checkCollision();
      
      // ═══════════════════════════════════════════════════════════════
      // STABILITY SYSTEM v2.0 - Dynamic Equilibrium & Control
      // ═══════════════════════════════════════════════════════════════
      // Process stability for both beyblades
      [b1, b2].forEach(b => {
        if (!b.alive) return;
        
        const bSpinPercent = (b.spinSpeed / b.stats.maxSpin);
        const velocity = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
        
        // DYNAMIC STABILITY CAP - Falls as beyblade weakens
        const maxStability = Math.min(150, 150 * (0.6 + bSpinPercent * 0.4)); // Cap absoluto em 150
        b.stability = Math.min(b.stability, maxStability);
        
        // RECOVERY SYSTEM - Only when calm and not recently hit
        const timeSinceLastHit = Date.now() - (b.lastHitTime || 0);
        const canRecover = velocity < 1.5 && timeSinceLastHit > 750; // 750ms = ~45 frames at 60fps
        
        if (canRecover) {
          if (b.bey?.type === 'Defense') {
            // Defense types recover better
            // SOLUÇÃO 2: aumentado de 0.18 para 0.35
            b.stability += 0.35;
          } else if (velocity < 1) {
            // Very low velocity allows some recovery
            // SOLUÇÃO 2: aumentado de 0.08 para 0.20
            b.stability += 0.20;
          }
          b.stability = Math.min(maxStability, b.stability);
        }
        
        // LATE GAME INSTABILITY - Wobble from low spin/stamina
        if (bSpinPercent < 0.3 || b.stamina < 50) {
          const instabilityFactor = Math.max(0, 0.3 - bSpinPercent) + Math.max(0, (50 - b.stamina) / 200);
          b.stability -= instabilityFactor * 0.25;
        }
        
        // CRITICAL STABILITY CHECK - Enhanced Over Finish mechanics
        const balanceResistance = (b.bey?.effectiveStats?.bal || 10);
        const criticalThreshold = 15 + (balanceResistance * 1.5);
        
        if (b.stability < criticalThreshold && bSpinPercent > 0.1 && !winner && !burstTriggered) {
          // Over Finish now based on actual stability collapse, not RNG
          const collapseRisk = (criticalThreshold - b.stability) / criticalThreshold;
          
          // High velocity makes collapse more likely
          const velocityFactor = Math.min(1, velocity / 8);
          
          // Combined collapse chance
          const shouldCollapse = collapseRisk > 0.7 || (collapseRisk > 0.5 && velocityFactor > 0.6);
          
          if (shouldCollapse) {
            recordEvent('OVER_FINISH', {
              bey: b === b1 ? 'b1' : 'b2',
              finalStability: b.stability,
              criticalThreshold: criticalThreshold,
              collapseRisk: collapseRisk,
              reason: 'Stability collapse from repeated impacts'
            });
            winner = b === b1 ? b2 : b1;
            winMethod = 'Over Finish';
            b.alive = false;
            
            // Over Finish visual - bey tips over
            addParticle(b.x, b.y, b.color, 30);
            addParticle(b.x, b.y, '#ff9900', 25);
            addParticle(b.x, b.y, '#ffffff', 20);
          }
        }
        
        // Clamp to valid range
        b.stability = Math.max(0, Math.min(maxStability, b.stability));
      });
      
      // ═══════════════════════════════════════════════════════════════
      // POST-PHYSICS WINNER CHECK - Simple and Reliable
      // ═══════════════════════════════════════════════════════════════
      // After all physics updates, check if one fell and the other didn't
      // This is the FINAL authority on Spin Finish victories
      // ═══════════════════════════════════════════════════════════════
      if (!winner && !burstTriggered) {
        // Case 1: B1 fell, B2 is standing
        if (b1.fellOver && !b2.fellOver && b2.alive) {
          recordEvent('SPIN_FINISH_FINAL', {
            winner: 'b2',
            loser: 'b1',
            reason: 'B1 fell over, B2 still spinning'
          });
          winner = b2;
          winMethod = 'Spin Finish';
          b1.alive = false;
          addParticle(b1.x, b1.y, b1.color, 20);
          addParticle(b2.x, b2.y, '#00ff00', 30); // Victory particles
        }
        // Case 2: B2 fell, B1 is standing
        else if (b2.fellOver && !b1.fellOver && b1.alive) {
          recordEvent('SPIN_FINISH_FINAL', {
            winner: 'b1',
            loser: 'b2',
            reason: 'B2 fell over, B1 still spinning'
          });
          winner = b1;
          winMethod = 'Spin Finish';
          b2.alive = false;
          addParticle(b2.x, b2.y, b2.color, 20);
          addParticle(b1.x, b1.y, '#00ff00', 30); // Victory particles
        }
        // Case 3: Both fell - check timing for draw
        else if (b1.fellOver && b2.fellOver && !winner) {
          const time1 = b1.staminaDepletionTime || b1.lastStopTime || 0;
          const time2 = b2.staminaDepletionTime || b2.lastStopTime || 0;
          const timeDiff = Math.abs(time1 - time2);
          
          if (timeDiff < 200) {
            // Both fell within 200ms - it's a draw
            recordEvent('DRAW', { 
              reason: 'Both fell simultaneously',
              timeDiff: timeDiff
            });
            winner = 'DRAW';
            winMethod = 'Draw';
            b1.alive = false;
            b2.alive = false;
            addParticle(b1.x, b1.y, '#ffff00', 30);
            addParticle(b2.x, b2.y, '#ffff00', 30);
          } else {
            // Someone fell first - they lose
            if (time1 < time2) {
              // B1 fell first
              winner = b2;
              winMethod = 'Spin Finish';
              b1.alive = false;
              recordEvent('SPIN_FINISH_FINAL', {
                winner: 'b2',
                loser: 'b1',
                reason: 'B1 fell first'
              });
            } else {
              // B2 fell first
              winner = b1;
              winMethod = 'Spin Finish';
              b2.alive = false;
              recordEvent('SPIN_FINISH_FINAL', {
                winner: 'b1',
                loser: 'b2',
                reason: 'B2 fell first'
              });
            }
          }
        }
      }
      
      if (burstTriggered && burstDelay > 0) {
        burstDelay--;
        if (burstDelay === 0 && winner !== 'DRAW') {
          if (!b1.alive && b2.alive) {
            winner = b2;
            winMethod = 'Burst Finish';
            addEvent('BURST', 'BURST FINISH!', `${bey2.name} destroys opponent!`);
          } else if (!b2.alive && b1.alive) {
            winner = b1;
            winMethod = 'Burst Finish';
            addEvent('BURST', 'BURST FINISH!', `${bey1.name} destroys opponent!`);
          }
        }
      }
      
      // Sombras dos beyblades (FASE 2 - Pseudo-3D)
      drawBeyShadow(b1);
      drawBeyShadow(b2);
      
      // Update and draw motion trails (FASE 1)
      updateTrail(b1, b1Trail, 8);
      updateTrail(b2, b2Trail, 8);
      drawTrail(b1Trail, b1.color, b1.bey?.colors);
      drawTrail(b2Trail, b2.color, b2.bey?.colors);

      // ⚔️ Aura épica do Signature em coords mundo (antes do drawBey que faz rotate)
      const b1SpinPct = b1.spinSpeed / (b1.stats?.maxSpin || 100);
      const b2SpinPct = b2.spinSpeed / (b2.stats?.maxSpin || 100);
      if (b1.bey?.isSignature && b1.alive) drawSignatureWorldAura(ctx, b1, b1.bey?.colors || [b1.color], b1SpinPct);
      if (b2.bey?.isSignature && b2.alive) drawSignatureWorldAura(ctx, b2, b2.bey?.colors || [b2.color], b2SpinPct);

      drawBey(b1);
      drawBey(b2);

      // ⚔️ Badge do Signature (nome do blade, acima das barras)
      if (b1.bey?.isSignature && b1.alive) drawSignatureBadge(ctx, b1);
      if (b2.bey?.isSignature && b2.alive) drawSignatureBadge(ctx, b2);
      
      // BURST FINISH ANNOUNCEMENT
      if (burstTriggered && endingTimer > 0 && endingTimer < 90) {
        ctx.save();
        const scale = Math.min(1, endingTimer / 20);
        const alpha = endingTimer < 60 ? 1 : (90 - endingTimer) / 30;
        
        ctx.globalAlpha = alpha;
        ctx.fillStyle = '#ff0000';
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 8;
        ctx.font = `bold ${60 * scale}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        const text = '💥 BURST FINISH! 💥';
        ctx.strokeText(text, centerX, centerY - 100);
        ctx.fillText(text, centerX, centerY - 100);
        
        ctx.restore();
      }
      
      // SPIN FINISH ANNOUNCEMENT
      if (winner && winMethod === 'Spin Finish' && endingTimer > 0 && endingTimer < 70) {
        ctx.save();
        const scale = Math.min(1, endingTimer / 20);
        const alpha = endingTimer < 50 ? 1 : (70 - endingTimer) / 20;
        
        ctx.globalAlpha = alpha;
        ctx.fillStyle = '#fbbf24';
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 6;
        ctx.font = `bold ${50 * scale}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        const text = '🌀 SPIN FINISH! 🌀';
        ctx.strokeText(text, centerX, centerY - 100);
        ctx.fillText(text, centerX, centerY - 100);
        
        ctx.restore();
      }
      
      setStats({
        stamina1: Math.max(0, (b1.stamina / 250) * 100),
        stamina2: Math.max(0, (b2.stamina / 250) * 100),
        spin1: Math.max(0, (b1.spinSpeed / b1.stats.maxSpin) * 100),
        spin2: Math.max(0, (b2.spinSpeed / b2.stats.maxSpin) * 100),
        stability1: Math.max(0, (b1.stability / 150) * 100),
        stability2: Math.max(0, (b2.stability / 150) * 100)
      });
      
      // Update Battle HUD State
      setBattleState({
        stamina1: Math.max(0, (b1.stamina / 250) * 100),
        stamina2: Math.max(0, (b2.stamina / 250) * 100),
        spin1: Math.max(0, (b1.spinSpeed / b1.stats.maxSpin) * 100),
        spin2: Math.max(0, (b2.spinSpeed / b2.stats.maxSpin) * 100),
        stability1: Math.max(0, (b1.stability / 150) * 100),
        stability2: Math.max(0, (b2.stability / 150) * 100),
        time: (Date.now() - battleStartTimeRef.current) / 1000,
        bey1Combos: 0, // TODO: Add combo tracking
        bey2Combos: 0
      });
      
      // Record stats history for replay
      const currentTime = (Date.now() - battleStartTimeRef.current) / 1000;
      statsHistoryRef.current.push({
        time: currentTime,
        stamina1: Math.max(0, (b1.stamina / 150) * 100),
        stamina2: Math.max(0, (b2.stamina / 150) * 100),
        spin1: Math.max(0, (b1.spinSpeed / b1.stats.maxSpin) * 100),
        spin2: Math.max(0, (b2.spinSpeed / b2.stats.maxSpin) * 100)
      });
      
      if (winner) {
        endingTimer++;
        
        // Longer delay for burst to show pieces settling
        const delayFrames = (winMethod === 'Burst Finish') ? 120 : 90; // 2s for burst, 1.5s others
        
        if (endingTimer >= delayFrames) {
          // CORREÇÃO: Verificar se é DRAW antes de acessar propriedades do objeto
          const isDraw = winner === 'DRAW';
          
          onEnd({
            winner: isDraw ? 'DRAW' : winner.bey,
            loser: isDraw ? 'DRAW' : (winner === b1 ? b2.bey : b1.bey),
            method: winMethod,
            winnerStats: isDraw ? null : winner.stats,
            loserStats: isDraw ? null : (winner === b1 ? b2.stats : b1.stats),
            replayData: {
              events: replayEventsRef.current,
              statsHistory: statsHistoryRef.current,
              duration: (Date.now() - battleStartTimeRef.current) / 1000,
              arena: arenaType,
              bey1: {
                name: bey1.name,
                type: bey1.type,
                rotation: bey1.rotation,
                launch: md3State.launch1,
                finalStats: {
                  hits: b1.stats.hitsLanded,
                  damage: b1.stats.damageCaused,
                  finalSpin: b1.spinSpeed,
                  finalStamina: b1.stamina
                }
              },
              bey2: {
                name: bey2.name,
                type: bey2.type,
                rotation: bey2.rotation,
                launch: md3State.launch2,
                finalStats: {
                  hits: b2.stats.hitsLanded,
                  damage: b2.stats.damageCaused,
                  finalSpin: b2.spinSpeed,
                  finalStamina: b2.stamina
                }
              }
            }
          });
          return;
        }
      }
      
      
      // Restore screen shake and draw flash effect (FASE 1)
      ctx.restore();
      
      // Draw flash effect (ALWAYS LAST)
      if (flashEffect.active) {
        ctx.globalAlpha = flashEffect.alpha;
        ctx.fillStyle = flashEffect.color;
        ctx.fillRect(0, 0, 1000, 700);
        ctx.globalAlpha = 1;
      }

    }
    
    // ✅ TURBO: runFrame roda update() TURBO_STEPS vezes por quadro de render
    let _rafId;
    function runFrame() {
      for (let _s = 0; _s < TURBO_STEPS; _s++) {
        if (winner) break;
        update();
      }
      if (winner) update(); // render final quando há vencedor
      _rafId = requestAnimationFrame(runFrame);
    }
    runFrame();
    return () => cancelAnimationFrame(_rafId);
  }, [bey1, bey2, onEnd, md3State, introPhase]);

  return (
    <div className="relative h-screen bg-gradient-to-br from-slate-900 via-slate-950 to-black flex items-center justify-center overflow-hidden">
      {/* LAYER 1: Canvas (Background) */}
      <canvas 
        ref={canvasRef} 
        width="1000" 
        height="700"
        className="border-4 border-gray-800 shadow-2xl" 
      />
      
      {/* LAYER 2: Battle HUD */}
      {introPhase === 'battle' && (
        <BattleHUD 
          bey1={bey1}
          bey2={bey2}
          battleState={battleState}
          md3State={md3State}
        />
      )}
      
      {/* LAYER 3: Event Feed */}
      {introPhase === 'battle' && (
        <EventFeed events={events} />
      )}
      
      {/* LAYER 4: Launch Quality Overlay - Mostra brevemente no início */}
      {introPhase === 'rip' && showQualityText && (
        <LaunchSequenceOverlay 
          quality1={md3State.launchQuality1}
          quality2={md3State.launchQuality2}
          bey1Name={bey1?.team?.name || bey1?.name}
          bey2Name={bey2?.team?.name || bey2?.name}
          launch1={LAUNCH_TECHNIQUES[md3State.launch1 || 'STANDARD']}
          launch2={LAUNCH_TECHNIQUES[md3State.launch2 || 'STANDARD']}
          bey1={bey1}
          bey2={bey2}
        />
      )}
    </div>
  );
};


// ====================================================================
// REPLAY SCREEN - REDESIGNED (FASE 4)
// ====================================================================
// Sistema de fases lineares (sem tabs):
// victory -> highlights -> stats -> done
// ====================================================================

const ReplayScreen = ({ result, onContinue }) => {
  const [phase, setPhase] = useState('victory'); // victory -> highlights -> stats -> done
  
  // Calcular awards
  const awards = result?.replayData ? calculateAwards(result, result.replayData) : [];
  const replayDataWithAwards = { ...result?.replayData, awards };

  const handleFinalContinue = () => {
    setPhase('done');
    onContinue();
  };

  return (
    <>
      {phase === 'victory' && (
        <VictoryScreen 
          result={result}
          replayData={replayDataWithAwards}
          onContinue={() => setPhase('highlights')}
        />
      )}

      {phase === 'highlights' && (
        <BattleHighlights 
          replayData={replayDataWithAwards}
          onContinue={() => setPhase('stats')}
        />
      )}

      {phase === 'stats' && (
        <DetailedStats 
          replayData={replayDataWithAwards}
          onContinue={handleFinalContinue}
        />
      )}
    </>
  );
};

// Helper function
function calculateAwards(result, replayData) {
  const awards = [];
  const bey1Stats = replayData.bey1?.finalStats || {};
  const bey2Stats = replayData.bey2?.finalStats || {};
  
  // Most Aggressive
  if (bey1Stats.hits > bey2Stats.hits * 1.5) {
    awards.push({ 
      name: '⚔️ RELENTLESS AGGRESSOR', 
      winner: replayData.bey1?.name, 
      desc: `Landed ${bey1Stats.hits} hits vs ${bey2Stats.hits}` 
    });
  } else if (bey2Stats.hits > bey1Stats.hits * 1.5) {
    awards.push({ 
      name: '⚔️ RELENTLESS AGGRESSOR', 
      winner: replayData.bey2?.name, 
      desc: `Landed ${bey2Stats.hits} hits vs ${bey1Stats.hits}` 
    });
  }
  
  // Perfect Launch
  const launch1Quality = replayData.events?.find(e => e.type === 'LAUNCH')?.data?.quality1;
  const launch2Quality = replayData.events?.find(e => e.type === 'LAUNCH')?.data?.quality2;
  
  if (launch1Quality === 'PERFECT') {
    awards.push({ 
      name: '⭐ PERFECT LAUNCH', 
      winner: replayData.bey1?.name, 
      desc: 'Flawless launch technique' 
    });
  }
  if (launch2Quality === 'PERFECT') {
    awards.push({ 
      name: '⭐ PERFECT LAUNCH', 
      winner: replayData.bey2?.name, 
      desc: 'Flawless launch technique' 
    });
  }
  
  return awards;
}


const PostMatchScreen = ({ result, onContinue }) => {
  const turbo = useTurbo(); // ✅ NOVO
  
  // ✅ NOVO - Auto-continuar em turbo
  useEffect(() => {
    if (turbo.turboEnabled && onContinue) {
      const timer = setTimeout(() => {
        onContinue();
      }, turbo.getResultDelay());
      return () => clearTimeout(timer);
    }
  }, [turbo, onContinue]);

  const isDraw = result?.method?.includes('Draw');
  const winnerName = isDraw ? 'DRAW' : (result?.winner?.name || 'Winner');
  const winnerType = result?.winner?.type || 'Balance';
  const winnerRotation = result?.winner?.rotation || 'Right';
  const winnerHits = result?.winnerStats?.hitsLanded || 0;
  const method = result?.method || 'Victory';
  const winnerIcon = result?.winnerIcon; // Custom icon if available

  return (
    <div className="h-screen bg-black flex items-center justify-center relative overflow-hidden">
      {/* Industrial grid */}
      <div className="absolute inset-0 opacity-5" style={{
        backgroundImage: 'linear-gradient(#333 2px, transparent 2px), linear-gradient(90deg, #333 2px, transparent 2px)',
        backgroundSize: '100px 100px'
      }}></div>
      
      <div className="text-center max-w-2xl relative z-10">
        {isDraw ? (
          <>
            <h1 className="text-7xl font-black text-orange-500 mb-4 border-8 border-orange-500 inline-block px-8 py-4">⚖️ DRAW</h1>
            <h2 className="text-4xl font-black text-gray-400 mb-4">STALEMATE</h2>
          </>
        ) : (
          <>
            <h1 className="text-7xl font-black text-orange-500 mb-4 border-8 border-orange-500 inline-block px-8 py-4">WINNER</h1>
            {winnerIcon ? (
              <div className="flex justify-center mb-4">
                <div 
                  className="w-32 h-32 rounded-full border-8 border-orange-500 overflow-hidden"
                  style={{ backgroundColor: result?.winner?.color || '#f97316' }}
                >
                  <img 
                    src={winnerIcon} 
                    alt={winnerName}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            ) : null}
            <h2 className="text-5xl font-black text-gray-300 mb-4">{winnerName}</h2>
          </>
        )}
        
        <div className="mb-8 bg-gray-900 border-2 border-gray-800 p-6">
          <p className="text-3xl text-gray-400 mb-2 font-black">
            {isDraw ? method : `Victory by ${method}`}
          </p>
          <div className="text-sm text-gray-600 mt-4 font-mono bg-black p-3 border border-gray-800">
            {method === 'Burst Finish' && '💥 Beyblade exploded after critical damage accumulation'}
            {method === 'Spin Finish' && '⚡ Opponent lost all rotation and stopped spinning'}
            {method === 'Ring-Out Finish' && '🚀 Opponent was launched out of the arena at high velocity'}
            {method === 'Over Finish' && '🌀 Opponent lost balance and tipped over inside arena'}
            {method.includes('Draw') && '⚖️ Both Beyblades stopped/exited/burst simultaneously'}
          </div>
        </div>
        
        {!isDraw && (
          <div className="grid grid-cols-3 gap-4 mb-8 text-white text-sm">
            <div className="bg-gray-900 p-3 border-2 border-gray-800">
              <div className="text-gray-600 text-xs font-mono">TYPE</div>
              <div className="font-bold text-gray-300">{winnerType}</div>
            </div>
            <div className="bg-gray-900 p-3 border-2 border-gray-800">
              <div className="text-gray-600 text-xs font-mono">ROTATION</div>
              <div className="font-bold text-gray-300">{winnerRotation}</div>
            </div>
            <div className="bg-gray-900 p-3 border-2 border-gray-800">
              <div className="text-gray-600 text-xs font-mono">HITS</div>
              <div className="font-bold text-gray-300">{winnerHits}</div>
            </div>
          </div>
        )}
        
        <button 
          onClick={onContinue}
          className="bg-orange-500 text-black px-12 py-4 font-black text-2xl hover:bg-orange-600 transition border-2 border-orange-600"
        >
          CONTINUE
        </button>
      </div>
    </div>
  );
};

// ─── EXHIBITION SETUP STYLES ────────────────────────────────────────────────
const EXHB_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Black+Ops+One&family=Rajdhani:wght@400;600;700&family=Orbitron:wght@400;700;900&display=swap');

  @keyframes exhb-spin      { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
  @keyframes exhb-spin-rev  { from{transform:rotate(360deg)} to{transform:rotate(0deg)} }
  @keyframes exhb-pulse     { 0%,100%{opacity:.4;transform:scale(1)} 50%{opacity:.85;transform:scale(1.04)} }
  @keyframes exhb-scanline  { 0%{transform:translateY(-100%)} 100%{transform:translateY(100vh)} }
  @keyframes exhb-holo      { 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }
  @keyframes fighter-in     { 0%{opacity:0;transform:scale(1.07) translateY(14px)} 100%{opacity:1;transform:scale(1) translateY(0)} }
  @keyframes fighter-out    { 0%{opacity:1;transform:scale(1)} 100%{opacity:0;transform:scale(.95) translateY(-10px)} }
  @keyframes stat-fill      { from{width:0%} to{width:var(--w)} }
  @keyframes card-appear    { 0%{opacity:0;transform:translateY(16px)} 100%{opacity:1;transform:translateY(0)} }
  @keyframes glow-breathe   {
    0%,100%{box-shadow:0 0 18px rgba(255,215,0,.3),0 0 36px rgba(255,215,0,.08)}
    50%    {box-shadow:0 0 36px rgba(255,215,0,.65),0 0 70px rgba(255,215,0,.22)}
  }
  @keyframes vs-flash { 0%,100%{opacity:1} 40%,60%{opacity:.6} }
  @keyframes row-hover { 0%{background:rgba(255,255,255,0)} 100%{background:rgba(255,255,255,.05)} }

  .exhb-menu-btn {
    font-family:'Rajdhani',sans-serif; font-weight:700; position:relative;
    overflow:hidden; letter-spacing:.12em;
    transition:all .18s cubic-bezier(.22,1,.36,1);
    clip-path:polygon(8px 0%,100% 0%,calc(100% - 8px) 100%,0% 100%);
  }
  .exhb-menu-btn::before {
    content:''; position:absolute; inset:0;
    background:linear-gradient(90deg,transparent 0%,rgba(255,255,255,.12) 50%,transparent 100%);
    transform:translateX(-100%); transition:transform .5s ease;
  }
  .exhb-menu-btn:hover::before{transform:translateX(100%)}
  .exhb-menu-btn:hover{transform:translateY(-2px) scale(1.02)}
  .exhb-menu-btn:active{transform:translateY(0) scale(.98)}

  .exhb-start-btn {
    background:linear-gradient(135deg,#ffd700 0%,#ff8c00 40%,#ff4500 100%);
    color:#0a0008; animation:glow-breathe 3s ease-in-out infinite;
  }
  .exhb-start-btn:disabled {
    background:rgba(255,255,255,.08); color:rgba(255,255,255,.25);
    animation:none; cursor:not-allowed;
    box-shadow:none; filter:none;
  }

  .exhb-player-row {
    transition:all .14s ease; cursor:pointer; padding:6px 10px; border-radius:4px;
    border:1px solid transparent;
  }
  .exhb-player-row:hover { background:rgba(255,255,255,.06); border-color:rgba(255,255,255,.1); }

  .stat-bar-bg { background:rgba(255,255,255,.08); border-radius:2px; overflow:hidden; height:5px; }
  .stat-bar-fill {
    height:100%; border-radius:2px;
    animation:stat-fill .6s cubic-bezier(.22,1,.36,1) forwards;
    animation-delay:var(--delay,0s);
  }
`;

// Mentality icons/descriptions for the card
const MENTALITY_INFO = {
  ALL_ROUNDER:     { icon:'⚖️', label:'All-Rounder',    desc:'Equilibrado em tudo' },
  GLASS_CANNON:    { icon:'💥', label:'Glass Cannon',   desc:'Destruir ou morrer' },
  IRON_FORTRESS:   { icon:'🛡️', label:'Iron Fortress',  desc:'Defesa impenetrável' },
  ETERNAL_SPINNER: { icon:'♾️', label:'Eternal Spinner',desc:'Stamina suprema' },
  CALCULATED_CHAOS:{ icon:'🎯', label:'Calculated Chaos',desc:'Caos tático' },
  HIGH_RISK_GAMBLER:{ icon:'🎲', label:'High Risk Gambler',desc:'Apostas extremas' },
  MOMENTUM_MASTER: { icon:'📈', label:'Momentum Master',desc:'Cresce com vitórias' },
  SYNERGY_SEEKER:  { icon:'🔗', label:'Synergy Seeker', desc:'Mestre do combo' },
};

const TIER_COLORS = { ELITE:'#ffd700', S:'#c084fc', A:'#60a5fa', B:'#4ade80', C:'#f87171' };

function FighterPanel({ player, side, accentColor, onSelect, allPlayers, otherPlayer }) {
  const [visible, setVisible] = React.useState(true);
  const [anim, setAnim] = React.useState('fighter-in .7s ease forwards');

  // transition when player changes
  const prevRef = React.useRef(player);
  React.useEffect(() => {
    if (prevRef.current !== player && prevRef.current !== null) {
      setAnim('fighter-out .4s ease forwards');
      setTimeout(() => {
        prevRef.current = player;
        setAnim('fighter-in .7s ease forwards');
      }, 420);
    } else {
      prevRef.current = player;
    }
  }, [player]);

  const isLeft = side === 'left';
  const mInfo  = player ? (MENTALITY_INFO[player.mentality] || { icon:'⚔️', label: player.mentality, desc:'' }) : null;

  const statKeys = ['attack','defense','stamina','speed','technique','intelligence','adaptability','clutch'];
  const statLabels = { attack:'ATK', defense:'DEF', stamina:'STA', speed:'SPD', technique:'TEC', intelligence:'INT', adaptability:'ADP', clutch:'CLT' };
  const statColors = { attack:'#ef4444', defense:'#3b82f6', stamina:'#8b5cf6', speed:'#f59e0b', technique:'#10b981', intelligence:'#06b6d4', adaptability:'#ec4899', clutch:'#ffd700' };

  return (
    <div style={{
      flex: 1, position: 'relative', display: 'flex', flexDirection: 'column',
      overflow: 'hidden',
      borderRight: isLeft ? '1px solid rgba(255,215,0,0.07)' : 'none',
      borderLeft: !isLeft ? '1px solid rgba(255,215,0,0.07)' : 'none',
    }}>

      {/* ── FIGHTER ART (full height behind everything) ── */}
      {player && (
        <div style={{
          position: 'absolute',
          bottom: 0,
          [isLeft ? 'left' : 'right']: 0,
          width: '62%',
          height: '100%',
          zIndex: 0,
          backgroundImage: `url(${player.fullBodyUrl})`,
          backgroundSize: 'contain',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: `bottom ${isLeft ? 'left' : 'right'}`,
          animation: anim,
          transform: isLeft ? 'none' : 'scaleX(-1)',
          filter: `drop-shadow(0 0 40px ${player.colors?.[0] || accentColor}99) drop-shadow(0 0 16px rgba(0,0,0,0.95))`,
          maskImage: isLeft
            ? 'linear-gradient(to right, black 30%, rgba(0,0,0,.8) 55%, transparent 85%), linear-gradient(to top, transparent 0%, rgba(0,0,0,.4) 8%, black 18%)'
            : 'linear-gradient(to left, black 30%, rgba(0,0,0,.8) 55%, transparent 85%), linear-gradient(to top, transparent 0%, rgba(0,0,0,.4) 8%, black 18%)',
          WebkitMaskImage: isLeft
            ? 'linear-gradient(to right, black 30%, rgba(0,0,0,.8) 55%, transparent 85%)'
            : 'linear-gradient(to left, black 30%, rgba(0,0,0,.8) 55%, transparent 85%)',
        }} />
      )}

      {/* ── GRADIENT OVERLAY to make content readable ── */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none',
        background: isLeft
          ? 'linear-gradient(to left, rgba(5,0,14,0.92) 0%, rgba(5,0,14,0.5) 40%, transparent 70%)'
          : 'linear-gradient(to right, rgba(5,0,14,0.92) 0%, rgba(5,0,14,0.5) 40%, transparent 70%)',
      }} />

      {/* ── CONTENT ── */}
      <div style={{
        position: 'relative', zIndex: 2,
        display: 'flex', flexDirection: 'column', height: '100%',
        padding: isLeft ? '28px 20px 24px 26px' : '28px 26px 24px 20px',
      }}>

        {/* PLAYER LABEL */}
        <div style={{
          fontFamily: 'Orbitron, monospace', fontSize: 10, fontWeight: 700,
          letterSpacing: '0.35em', color: accentColor, opacity: 0.8,
          marginBottom: 6, textTransform: 'uppercase',
        }}>
          {isLeft ? '← PLAYER 1' : 'PLAYER 2 →'}
        </div>

        {/* ── PLAYER SELECTION LIST ── */}
        <div style={{
          flex: '0 0 auto', maxHeight: 260, overflowY: 'auto',
          marginBottom: 12,
          scrollbarWidth: 'thin',
          scrollbarColor: `${accentColor}44 transparent`,
        }}>
          {allPlayers.map((t, i) => {
            const isSelected = player?.name === t.name;
            const isOther    = otherPlayer?.name === t.name;
            return (
              <div key={i}
                className="exhb-player-row"
                onClick={() => !isOther && onSelect(t)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 9,
                  background: isSelected ? `${t.colors?.[0] || accentColor}22` : undefined,
                  border: `1px solid ${isSelected ? (t.colors?.[0] || accentColor) : 'transparent'}`,
                  opacity: isOther ? 0.3 : 1,
                  cursor: isOther ? 'not-allowed' : 'pointer',
                  textAlign: isLeft ? 'left' : 'right',
                  flexDirection: isLeft ? 'row' : 'row-reverse',
                }}
              >
                {/* Color dot */}
                <div style={{
                  width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                  background: t.colors?.[0] || '#fff',
                  boxShadow: isSelected ? `0 0 8px ${t.colors?.[0]}` : 'none',
                }} />
                {/* Name */}
                <div style={{
                  fontFamily: 'Rajdhani, sans-serif', fontSize: 12.5, fontWeight: 700,
                  color: isSelected ? (t.colors?.[0] || accentColor) : 'rgba(255,255,255,0.7)',
                  letterSpacing: '0.06em', flex: 1,
                  textShadow: isSelected ? `0 0 8px ${t.colors?.[0]}` : 'none',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {t.name.replace(/"[^"]*"\s*/g, '').trim()}
                </div>
                {/* Country emoji */}
                <div style={{ fontSize: 11, flexShrink: 0 }}>
                  {t.country?.match(/\p{Emoji}/u)?.[0] || ''}
                </div>
              </div>
            );
          })}
        </div>

        {/* ── SELECTED FIGHTER INFO CARD ── */}
        {player ? (
          <div style={{
            flex: 1, display: 'flex', flexDirection: 'column', gap: 10,
            animation: 'card-appear .5s ease forwards',
          }}>
            {/* Name block */}
            <div style={{ textAlign: isLeft ? 'left' : 'right' }}>
              <div style={{
                fontFamily: 'Black Ops One, cursive',
                fontSize: 'clamp(16px,2.2vw,24px)',
                background: `linear-gradient(135deg, #fff 0%, ${player.colors?.[0] || accentColor} 60%)`,
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                filter: `drop-shadow(0 0 10px ${player.colors?.[0] || accentColor}88)`,
                lineHeight: 1.1, marginBottom: 2,
              }}>
                {(() => {
                  const nickname = player.name.match(/"([^"]+)"/)?.[1];
                  const realName = player.name.replace(/"[^"]*"\s*/g, '').trim();
                  return nickname ? `"${nickname}"` : realName.split(' ').slice(0,2).join(' ');
                })()}
              </div>
              <div style={{
                fontFamily: 'Orbitron, monospace', fontSize: 9, letterSpacing: '0.25em',
                color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase',
              }}>
                {player.country} &nbsp;·&nbsp;
                <span style={{ color: TIER_COLORS[player.tier] || '#ffd700' }}>
                  {player.tier || 'ELITE'}
                </span>
              </div>
            </div>

            {/* Mentality badge */}
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 7,
              background: `${player.colors?.[0] || accentColor}18`,
              border: `1px solid ${player.colors?.[0] || accentColor}44`,
              borderRadius: 3, padding: '5px 10px',
              alignSelf: isLeft ? 'flex-start' : 'flex-end',
              clip: 'none',
            }}>
              <span style={{ fontSize: 14 }}>{mInfo.icon}</span>
              <div>
                <div style={{ fontFamily: 'Rajdhani,sans-serif', fontSize: 12, fontWeight: 700, color: player.colors?.[0] || accentColor, letterSpacing: '0.1em' }}>
                  {mInfo.label}
                </div>
                <div style={{ fontFamily: 'Rajdhani,sans-serif', fontSize: 10, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.06em' }}>
                  {mInfo.desc}
                </div>
              </div>
            </div>

            {/* Stat bars */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {statKeys.map((key, si) => {
                const val  = player.attributes?.[key] || 0;
                const pct  = (val / 10) * 100;
                const col  = statColors[key];
                return (
                  <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 7,
                    flexDirection: isLeft ? 'row' : 'row-reverse' }}>
                    <div style={{
                      fontFamily: 'Orbitron,monospace', fontSize: 8, fontWeight: 700,
                      color: col, letterSpacing: '0.1em', width: 28,
                      textAlign: isLeft ? 'left' : 'right',
                    }}>{statLabels[key]}</div>
                    <div className="stat-bar-bg" style={{ flex: 1 }}>
                      <div className="stat-bar-fill" style={{
                        '--w': `${pct}%`, '--delay': `${si * 0.06}s`,
                        background: `linear-gradient(90deg, ${col}88, ${col})`,
                        width: 0,
                      }} />
                    </div>
                    <div style={{
                      fontFamily: 'Orbitron,monospace', fontSize: 8, color: 'rgba(255,255,255,0.35)',
                      width: 14, textAlign: isLeft ? 'right' : 'left',
                    }}>{val}</div>
                  </div>
                );
              })}
            </div>

            {/* Play style quote */}
            {player.playStyle && (
              <div style={{
                fontFamily: 'Rajdhani, sans-serif', fontSize: 10.5, fontStyle: 'italic',
                color: 'rgba(255,255,255,0.35)', lineHeight: 1.4,
                borderLeft: isLeft ? `2px solid ${player.colors?.[0] || accentColor}55` : 'none',
                borderRight: !isLeft ? `2px solid ${player.colors?.[0] || accentColor}55` : 'none',
                paddingLeft: isLeft ? 8 : 0,
                paddingRight: !isLeft ? 8 : 0,
                textAlign: isLeft ? 'left' : 'right',
              }}>
                {player.playStyle}
              </div>
            )}
          </div>
        ) : (
          <div style={{
            flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            gap: 10, opacity: 0.25,
          }}>
            <div style={{ fontSize: 38 }}>⚔</div>
            <div style={{ fontFamily: 'Orbitron,monospace', fontSize: 10, letterSpacing: '0.3em', color: '#fff', textTransform: 'uppercase' }}>
              SELECIONAR
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const ExhibitionSetup = ({ onStartBattle, onBack }) => {
  const [player1, setPlayer1] = React.useState(null);
  const [player2, setPlayer2] = React.useState(null);
  const [selectedArenas, setSelectedArenas] = React.useState([]);
  const [matchFormat, setMatchFormat] = React.useState('MD3');

  const allArenas = [
    { id:'BB10_COMPETITIVE',             name:'BB-10 Competitive',       icon:'🏆' },
    { id:'BB10_COMPETITIVE', name:'BB-10 Competitive',  icon:'🎯' },
    { id:'KILLER_SIDES',     name:'Killer Sides',    icon:'⚔️' },
    { id:'NEXUS',            name:'Prismatic Nexus', icon:'🌀' },
    { id:'VOLCANIC_RAGE',    name:'Volcanic Rage',   icon:'🌌' },
    { id:'PANGEA_PLATFORM',  name:'Pangea Platform', icon:'💿' },
    { id:'COLOSSEUM_CARNAGE',name:'Colosseum',       icon:'🔥' },
    { id:'PINBALL_INFERNO',  name:'Pinball Inferno', icon:'🎰' },
    { id:'VORTEX_COLISEUM',  name:'Vortex Coliseum', icon:'🌀' },
    { id:'DOMINATION_ZONES', name:'Domination',      icon:'🎯' },
    { id:'TIDAL_SURGE',      name:'Tidal Surge',     icon:'🌊' },
    { id:'STORM_TRACK',      name:'Storm Track',     icon:'⚡' },
  ];

  const toggleArena = id => setSelectedArenas(prev =>
    prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
  );

  const canStart = player1 && player2 && selectedArenas.length > 0;

  const handleStart = () => {
    if (!canStart) return;
    const maxRounds = matchFormat === 'MD5' ? 5 : matchFormat === 'MD3' ? 3 : 1;
    const shuffled  = [...selectedArenas].sort(() => Math.random() - 0.5);
    const arenaOrder = Array.from({ length: maxRounds }, (_, i) => shuffled[i % shuffled.length]);
    onStartBattle({ player1, player2, arenas: arenaOrder, format: matchFormat });
  };

  // Spinning particles
  const particles = React.useMemo(() =>
    Array.from({ length: 10 }, (_, i) => ({
      id: i, size: 18 + Math.random() * 40,
      x: Math.random() * 100, y: Math.random() * 100,
      dur: 7 + Math.random() * 10, delay: Math.random() * 5,
      rev: Math.random() > 0.5, op: 0.03 + Math.random() * 0.06,
    })), []);

  return (
    <div style={{
      width: '100vw', height: '100vh', overflow: 'hidden', position: 'relative',
      background: 'radial-gradient(ellipse 120% 90% at 50% 110%, #1a0030 0%, #0a000f 45%, #000008 100%)',
      fontFamily: 'Rajdhani, sans-serif', display: 'flex', flexDirection: 'column',
    }}>
      <style>{EXHB_STYLES}</style>

      {/* ── GRID FLOOR ── */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        backgroundImage: 'linear-gradient(rgba(0,212,255,0.035) 1px,transparent 1px),linear-gradient(90deg,rgba(0,212,255,0.035) 1px,transparent 1px)',
        backgroundSize: '60px 60px',
        maskImage: 'radial-gradient(ellipse 80% 60% at 50% 100%, black, transparent)',
        WebkitMaskImage: 'radial-gradient(ellipse 80% 60% at 50% 100%, black, transparent)',
      }} />

      {/* ── SCANLINE ── */}
      <div style={{ position:'absolute',inset:0,pointerEvents:'none',overflow:'hidden',zIndex:50,opacity:.25 }}>
        <div style={{ width:'100%',height:3,background:'linear-gradient(90deg,transparent,rgba(0,212,255,.6),transparent)',animation:'exhb-scanline 6s linear infinite' }} />
      </div>

      {/* ── PARTICLES ── */}
      {particles.map(p => (
        <div key={p.id} style={{
          position:'absolute', left:`${p.x}%`, top:`${p.y}%`,
          width:p.size, height:p.size,
          border:`${p.rev?2:1.5}px solid rgba(255,215,0,${p.op*1.5})`,
          borderRadius:'50%', pointerEvents:'none',
          animation:`${p.rev?'exhb-spin-rev':'exhb-spin'} ${p.dur}s linear infinite ${p.delay}s`,
        }}>
          <div style={{ position:'absolute',top:'10%',left:'10%',right:'10%',bottom:'10%',border:`1px solid rgba(0,212,255,${p.op})`,borderRadius:'50%' }} />
        </div>
      ))}

      {/* ── FLOOR GLOW ── */}
      <div style={{ position:'absolute',bottom:0,left:0,right:0,height:2,background:'linear-gradient(90deg,transparent 0%,rgba(255,180,0,.7) 30%,rgba(255,215,0,1) 50%,rgba(255,180,0,.7) 70%,transparent 100%)',boxShadow:'0 0 40px rgba(255,215,0,.4)' }} />

      {/* ── TOP BAR ── */}
      <div style={{
        height: 52, flexShrink: 0, background: 'rgba(0,0,0,0.75)',
        borderBottom: '1px solid rgba(255,215,0,0.1)', zIndex: 20,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 28px',
      }}>
        <button
          className="exhb-menu-btn"
          onClick={onBack}
          style={{
            padding: '6px 18px', fontSize: 12, background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.6)', cursor: 'pointer',
          }}
        >
          ← VOLTAR
        </button>

        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily:'Orbitron,monospace', fontSize:9, letterSpacing:'0.4em', color:'rgba(255,215,0,0.45)', textTransform:'uppercase' }}>
            BAYBLADE: UNIVERSE
          </div>
          <div style={{ fontFamily:'Black Ops One,cursive', fontSize:18,
            background:'linear-gradient(135deg,#fff 0%,#ffd700 50%,#ff8c00 100%)',
            WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text',
            filter:'drop-shadow(0 0 10px rgba(255,165,0,0.5))',
          }}>
            EXHIBITION MATCH
          </div>
        </div>

        <div style={{ fontFamily:'Orbitron,monospace', fontSize:9, letterSpacing:'0.25em', color:'rgba(255,215,0,0.35)', animation:'exhb-pulse 2s ease-in-out infinite' }}>
          ⚡ LET IT RIP
        </div>
      </div>

      {/* ── MAIN AREA: fighters + bottom config ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* ── FIGHTER PANELS ── */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>

          <FighterPanel
            player={player1} side="left"
            accentColor="#ffd700"
            onSelect={setPlayer1}
            allPlayers={TEAMS}
            otherPlayer={player2}
          />

          {/* ── VS DIVIDER ── */}
          <div style={{
            width: 52, flexShrink: 0, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', zIndex: 10,
            position: 'relative',
          }}>
            <div style={{ position:'absolute', top:0, bottom:0, width:1, background:'linear-gradient(to bottom,transparent,rgba(255,215,0,0.35) 30%,rgba(255,215,0,0.35) 70%,transparent)' }} />
            <div style={{
              fontFamily: 'Black Ops One, cursive', fontSize: 22, color: '#ffd700',
              textShadow: '0 0 20px rgba(255,215,0,0.8), 0 0 40px rgba(255,100,0,0.4)',
              animation: 'vs-flash 2.5s ease-in-out infinite',
              background: 'rgba(5,0,14,0.95)', padding: '10px 6px', position: 'relative', zIndex: 1,
              border: '1px solid rgba(255,215,0,0.25)', borderRadius: 2,
            }}>
              VS
            </div>
          </div>

          <FighterPanel
            player={player2} side="right"
            accentColor="#00d4ff"
            onSelect={setPlayer2}
            allPlayers={TEAMS}
            otherPlayer={player1}
          />
        </div>

        {/* ── BOTTOM CONFIG STRIP ── */}
        <div style={{
          flexShrink: 0, background: 'rgba(0,0,0,0.82)',
          borderTop: '1px solid rgba(255,215,0,0.1)',
          padding: '14px 28px', display: 'flex', gap: 20, alignItems: 'flex-start',
          zIndex: 15,
        }}>
          {/* ARENAS */}
          <div style={{ flex: 2 }}>
            <div style={{ fontFamily:'Orbitron,monospace', fontSize:9, letterSpacing:'0.3em', color:'rgba(255,215,0,0.5)', marginBottom:8, textTransform:'uppercase' }}>
              Arenas &nbsp;·&nbsp; <span style={{ color:'rgba(0,212,255,0.5)' }}>{selectedArenas.length} selecionada{selectedArenas.length !== 1 ? 's' : ''}</span>
            </div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
              {allArenas.map(a => {
                const sel = selectedArenas.includes(a.id);
                return (
                  <button key={a.id}
                    className="exhb-menu-btn"
                    onClick={() => toggleArena(a.id)}
                    style={{
                      padding: '5px 11px', fontSize: 11, cursor:'pointer',
                      background: sel ? `rgba(255,215,0,0.15)` : 'rgba(255,255,255,0.04)',
                      border: `1px solid ${sel ? 'rgba(255,215,0,0.7)' : 'rgba(255,255,255,0.1)'}`,
                      color: sel ? '#ffd700' : 'rgba(255,255,255,0.45)',
                      boxShadow: sel ? '0 0 10px rgba(255,215,0,0.2)' : 'none',
                      display:'flex', gap:5, alignItems:'center',
                    }}
                  >
                    <span>{a.icon}</span><span>{a.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* FORMAT */}
          <div style={{ flexShrink: 0 }}>
            <div style={{ fontFamily:'Orbitron,monospace', fontSize:9, letterSpacing:'0.3em', color:'rgba(255,215,0,0.5)', marginBottom:8, textTransform:'uppercase' }}>
              Formato
            </div>
            <div style={{ display:'flex', gap:8 }}>
              {[
                { f:'MD1', icon:'⚡', sub:'1 round' },
                { f:'MD3', icon:'🔥', sub:'First to 2' },
                { f:'MD5', icon:'👑', sub:'First to 3' },
              ].map(({ f, icon, sub }) => {
                const sel = matchFormat === f;
                return (
                  <button key={f}
                    className="exhb-menu-btn"
                    onClick={() => setMatchFormat(f)}
                    style={{
                      padding:'8px 14px', cursor:'pointer', textAlign:'center',
                      background: sel ? 'rgba(255,140,0,0.2)' : 'rgba(255,255,255,0.04)',
                      border: `1px solid ${sel ? 'rgba(255,140,0,0.8)' : 'rgba(255,255,255,0.1)'}`,
                      color: sel ? '#ffd700' : 'rgba(255,255,255,0.45)',
                      boxShadow: sel ? '0 0 14px rgba(255,140,0,0.3)' : 'none',
                    }}
                  >
                    <div style={{ fontSize:16, marginBottom:2 }}>{icon}</div>
                    <div style={{ fontFamily:'Orbitron,monospace', fontSize:12, fontWeight:700, letterSpacing:'0.1em' }}>{f}</div>
                    <div style={{ fontFamily:'Rajdhani,sans-serif', fontSize:9, opacity:.6, marginTop:1 }}>{sub}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* START */}
          <div style={{ flexShrink:0, display:'flex', flexDirection:'column', justifyContent:'flex-end', gap:6 }}>
            {!canStart && (
              <div style={{ fontFamily:'Orbitron,monospace', fontSize:9, color:'rgba(255,255,255,0.25)', letterSpacing:'0.15em', textAlign:'center' }}>
                {!player1 || !player2 ? 'SELECIONE 2 JOGADORES' : 'SELECIONE UMA ARENA'}
              </div>
            )}
            <button
              className={`exhb-menu-btn exhb-start-btn`}
              onClick={handleStart}
              disabled={!canStart}
              style={{
                padding:'14px 32px', fontSize:15, cursor: canStart ? 'pointer' : 'not-allowed',
                display:'flex', alignItems:'center', justifyContent:'center', gap:10, border:'none',
              }}
            >
              <span style={{ fontSize:20, animation: canStart ? 'exhb-spin 3s linear infinite' : 'none' }}>⚔️</span>
              <span>INICIAR BATALHA</span>
              <span style={{ marginLeft:4, opacity:.7, fontSize:13 }}>▶</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── BOTTOM BAR ── */}
      <div style={{ height:30, background:'rgba(0,0,0,0.7)', borderTop:'1px solid rgba(255,215,0,0.06)', zIndex:20, display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 20px', flexShrink:0 }}>
        <div style={{ fontFamily:'Orbitron,monospace', fontSize:8, letterSpacing:'0.2em', color:'rgba(255,255,255,0.15)' }}>CONFIGURE YOUR MATCH</div>
        <div style={{ fontFamily:'Orbitron,monospace', fontSize:8, letterSpacing:'0.2em', color:'rgba(255,215,0,0.25)' }}>{TEAMS.length} FIGHTERS AVAILABLE</div>
      </div>
    </div>
  );
};


// ============================================
// TOURNAMENT RECAP SCREEN
// ============================================

const TournamentRecapScreen = ({ universeManager, onContinue, onViewBracket }) => {
  const recap = universeManager.computeTournamentRecap();
  const archive = universeManager.getTournamentHistory(
    universeManager.currentYear, 
    universeManager.currentMonth,
    universeManager.currentTournamentIndex
  );
  
  console.log('📊 Recap:', recap);
  console.log('📦 Archive:', archive);
  
  if (!recap.dataAvailable || !archive) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 flex items-center justify-center p-8">
        <div className="bg-gray-800 border-2 border-gray-700 p-8 max-w-md text-center">
          <h2 className="text-2xl font-black text-white mb-4">Dados Insuficientes</h2>
          <p className="text-gray-400 mb-6">Não há dados disponíveis para este torneio.</p>
          <button
            onClick={onContinue}
            className="bg-blue-500 hover:bg-blue-400 text-white px-8 py-3 font-black"
          >
            CONTINUAR
          </button>
        </div>
      </div>
    );
  }
  
  const { champion, runnerUp, tournamentName, tournamentType } = archive;
  const finalMatch = archive.bracket.F[0];
  
  // Helper para pegar nome do jogador
  const getPlayerName = (playerId) => {
    const team = TEAMS[playerId];
    return team ? team.name : `Player ${playerId}`;
  };
  
  // Helper para pegar país
  const getPlayerCountry = (playerId) => {
    const team = TEAMS[playerId];
    return team ? team.country : '';
  };
  
  // Helper para pegar foto
  const getPlayerPhoto = (playerId) => {
    const team = TEAMS[playerId];
    return team ? team.photoUrl : null;
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 p-8 overflow-y-auto">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="text-yellow-400 text-6xl mb-4">🏆</div>
          <h1 className="text-5xl font-black text-white mb-2">TOURNAMENT RECAP</h1>
          <div className="text-2xl font-bold text-purple-400">{tournamentName}</div>
          <div className="text-sm text-gray-400 mt-2">
            {CALENDAR_CONFIG.months.find(m => m.id === universeManager.currentMonth)?.name} {universeManager.currentYear}
          </div>
        </div>

        {/* Campeão */}
        <div className="bg-gradient-to-br from-yellow-600 to-yellow-800 border-4 border-yellow-400 p-8 mb-8">
          <div className="text-center mb-4">
            <div className="text-3xl font-black text-black mb-2">CAMPEÃO</div>
          </div>
          <div className="flex items-center justify-center gap-8">
            {champion.photoUrl && (
              <div className="w-32 h-48 border-4 border-white overflow-hidden">
                <img src={champion.photoUrl} alt={champion.name} className="w-full h-full object-cover" />
              </div>
            )}
            <div>
              <div className="text-4xl font-black text-white mb-2">{champion.name}</div>
              <div className="text-xl text-yellow-200 mb-4">{champion.country}</div>
              <div className="text-lg text-black bg-white/20 px-4 py-2 inline-block">
                Arena: {recap.arena}
              </div>
            </div>
          </div>
          {finalMatch && (
            <div className="text-center mt-6 text-black bg-white/30 py-3">
              <div className="font-bold">FINAL</div>
              <div className="text-2xl font-black">
                {getPlayerName(champion.id)} derrotou {getPlayerName(runnerUp.id)}
              </div>
            </div>
          )}
        </div>

        {/* Momentos Notáveis */}
        <div className="mb-8">
          <h2 className="text-3xl font-black text-white mb-4">⭐ MOMENTOS NOTÁVEIS</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Maior Upset */}
            {recap.notableMoments.biggestUpset && (
              <div className="bg-gradient-to-br from-red-900 to-red-800 border border-red-600 p-4">
                <div className="text-sm font-bold text-red-300 mb-2">🎯 MAIOR UPSET</div>
                <div className="text-white font-bold">
                  #{recap.notableMoments.biggestUpset.player1Rank > recap.notableMoments.biggestUpset.player2Rank 
                    ? recap.notableMoments.biggestUpset.player1Rank 
                    : recap.notableMoments.biggestUpset.player2Rank} derrotou #
                  {recap.notableMoments.biggestUpset.player1Rank < recap.notableMoments.biggestUpset.player2Rank 
                    ? recap.notableMoments.biggestUpset.player1Rank 
                    : recap.notableMoments.biggestUpset.player2Rank}
                </div>
                <div className="text-xs text-red-200 mt-1">
                  {getPlayerName(recap.notableMoments.biggestUpset.winnerId)} vs {getPlayerName(recap.notableMoments.biggestUpset.loserId)}
                </div>
                <div className="text-xs text-red-300 mt-2">
                  Diferença: {recap.notableMoments.biggestUpset.upsetMargin} posições
                </div>
              </div>
            )}

            {/* Match Mais Longo */}
            {recap.notableMoments.longestMatch && recap.notableMoments.longestMatch.duration && (
              <div className="bg-gradient-to-br from-blue-900 to-blue-800 border border-blue-600 p-4">
                <div className="text-sm font-bold text-blue-300 mb-2">⏱️ MATCH MAIS LONGO</div>
                <div className="text-white font-bold">
                  {getPlayerName(recap.notableMoments.longestMatch.playerAId)} vs {getPlayerName(recap.notableMoments.longestMatch.playerBId)}
                </div>
                <div className="text-2xl font-black text-blue-300 mt-2">
                  {recap.notableMoments.longestMatch.duration}s
                </div>
              </div>
            )}

            {/* Match Mais Curto */}
            {recap.notableMoments.shortestMatch && recap.notableMoments.shortestMatch.duration && (
              <div className="bg-gradient-to-br from-green-900 to-green-800 border border-green-600 p-4">
                <div className="text-sm font-bold text-green-300 mb-2">⚡ MATCH MAIS CURTO</div>
                <div className="text-white font-bold">
                  {getPlayerName(recap.notableMoments.shortestMatch.playerAId)} vs {getPlayerName(recap.notableMoments.shortestMatch.playerBId)}
                </div>
                <div className="text-2xl font-black text-green-300 mt-2">
                  {recap.notableMoments.shortestMatch.duration}s
                </div>
              </div>
            )}

            {/* Jogador com Mais Vitórias */}
            {recap.notableMoments.topPlayer !== null && (
              <div className="bg-gradient-to-br from-purple-900 to-purple-800 border border-purple-600 p-4">
                <div className="text-sm font-bold text-purple-300 mb-2">🔥 MAIS VITÓRIAS</div>
                <div className="text-white font-bold">{getPlayerName(recap.notableMoments.topPlayer)}</div>
                <div className="text-2xl font-black text-purple-300 mt-2">
                  {recap.notableMoments.topPlayerWins} vitórias
                </div>
              </div>
            )}

            {/* Arena Mais Usada ou Finish Mais Comum */}
            {Object.keys(recap.finishTypes).length > 1 ? (
              <div className="bg-gradient-to-br from-orange-900 to-orange-800 border border-orange-600 p-4">
                <div className="text-sm font-bold text-orange-300 mb-2">🏟️ ARENA MAIS USADA</div>
                <div className="text-white font-bold">{recap.notableMoments.topArena}</div>
                <div className="text-2xl font-black text-orange-300 mt-2">
                  {recap.notableMoments.topArenaMatches} matches
                </div>
              </div>
            ) : (
              <div className="bg-gradient-to-br from-orange-900 to-orange-800 border border-orange-600 p-4">
                <div className="text-sm font-bold text-orange-300 mb-2">🎯 FINISH MAIS COMUM</div>
                <div className="text-white font-bold text-uppercase">{recap.mostCommonFinish}</div>
                <div className="text-2xl font-black text-orange-300 mt-2">
                  {recap.finishTypes[recap.mostCommonFinish]} vezes
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Estatísticas do Torneio */}
        <div className="bg-gray-800 border-2 border-gray-700 p-6 mb-8">
          <h2 className="text-2xl font-black text-white mb-4">📊 ESTATÍSTICAS DO TORNEIO</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-3xl font-black text-blue-400">{recap.totalMatches}</div>
              <div className="text-sm text-gray-400">Total de Matches</div>
            </div>
            {recap.avgDuration && (
              <div className="text-center">
                <div className="text-3xl font-black text-purple-400">{recap.avgDuration.toFixed(1)}s</div>
                <div className="text-sm text-gray-400">Duração Média</div>
              </div>
            )}
            {recap.avgRounds && (
              <div className="text-center">
                <div className="text-3xl font-black text-green-400">{recap.avgRounds.toFixed(1)}</div>
                <div className="text-sm text-gray-400">Média de Rounds</div>
              </div>
            )}
            <div className="text-center">
              <div className="text-3xl font-black text-yellow-400">{tournamentType === 'GRAND_SLAM' ? 'GS' : 'ATP'}</div>
              <div className="text-sm text-gray-400">Tipo de Torneio</div>
            </div>
          </div>

          {/* Distribuição de Finish Types */}
          {Object.keys(recap.finishTypes).length > 0 && (
            <div className="mt-6">
              <div className="text-sm font-bold text-gray-400 mb-2">DISTRIBUIÇÃO DE FINISHES</div>
              <div className="flex gap-2">
                {Object.entries(recap.finishTypes).map(([type, count]) => (
                  <div key={type} className="bg-gray-700 px-3 py-2 text-center">
                    <div className="text-xs text-gray-400 uppercase">{type}</div>
                    <div className="text-lg font-bold text-white">{count}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Botões */}
        <div className="flex gap-4 justify-center">
          <button
            onClick={onViewBracket}
            className="bg-gray-700 hover:bg-gray-600 text-white px-8 py-4 font-black border-2 border-gray-600"
          >
            VER CHAVE 🗂️
          </button>
          <button
            onClick={onContinue}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white px-12 py-4 font-black border-2 border-purple-400"
          >
            CONTINUAR ➡️
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================
// SEASON RECAP SCREEN
// ============================================

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
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-indigo-900 to-gray-900 p-8 overflow-y-auto">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="text-yellow-400 text-7xl mb-4">🏅</div>
          <h1 className="text-6xl font-black text-white mb-2">SEASON RECAP</h1>
          <div className="text-3xl font-bold text-indigo-400">Temporada {recap.seasonYear}</div>
        </div>

        {/* Campeões do Ano */}
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
                  <div className="text-xs text-gray-200">{c.championName}</div>
                  <div className="text-xl mt-1">{isGrandSlam ? '🏆' : '🏅'}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Prêmios Especiais */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {/* Jogador do Ano */}
          {recap.playerOfYearId !== null && (
            <div className="bg-gradient-to-br from-gold-600 to-yellow-700 border-4 border-yellow-400 p-6">
              <div className="text-sm font-bold text-yellow-200 mb-2">👑 JOGADOR DO ANO</div>
              <div className="text-2xl font-black text-white">{getPlayerName(recap.playerOfYearId)}</div>
              <div className="text-sm text-yellow-200">{getPlayerCountry(recap.playerOfYearId)}</div>
              <div className="text-xs text-yellow-300 mt-2">Maior pontuação da temporada</div>
            </div>
          )}

          {/* Mais Consistente */}
          {recap.mostConsistentId !== null && (
            <div className="bg-gradient-to-br from-green-700 to-green-800 border-4 border-green-500 p-6">
              <div className="text-sm font-bold text-green-200 mb-2">📈 MAIS CONSISTENTE</div>
              <div className="text-2xl font-black text-white">{getPlayerName(recap.mostConsistentId)}</div>
              <div className="text-sm text-green-200">{getPlayerCountry(recap.mostConsistentId)}</div>
              <div className="text-xs text-green-300 mt-2">
                Média de fase: {recap.mostConsistentAvgPhase.toFixed(1)}
              </div>
            </div>
          )}

          {/* Rei dos Upsets */}
          {recap.upsetKingId !== null && (
            <div className="bg-gradient-to-br from-red-700 to-red-800 border-4 border-red-500 p-6">
              <div className="text-sm font-bold text-red-200 mb-2">🎯 REI DOS UPSETS</div>
              <div className="text-2xl font-black text-white">{getPlayerName(recap.upsetKingId)}</div>
              <div className="text-sm text-red-200">{getPlayerCountry(recap.upsetKingId)}</div>
              <div className="text-xs text-red-300 mt-2">
                {recap.upsetKingCount} upsets
              </div>
            </div>
          )}
        </div>

        {/* Match do Ano */}
        {recap.matchOfYear && (
          <div className="bg-gradient-to-r from-purple-900 to-pink-900 border-2 border-purple-500 p-6 mb-8">
            <h2 className="text-2xl font-black text-white mb-4">⭐ MATCH DO ANO</h2>
            <div className="text-xl font-bold text-white">
              {getPlayerName(recap.matchOfYear.playerAId)} vs {getPlayerName(recap.matchOfYear.playerBId)}
            </div>
            <div className="text-sm text-purple-300 mt-2">
              {CALENDAR_CONFIG.months.find(m => m.id === recap.matchOfYear.month)?.name} - {recap.matchOfYear.tournamentName}
            </div>
            {recap.matchOfYear.upset && (
              <div className="text-sm text-pink-300 mt-1">
                🎯 Upset de {recap.matchOfYear.upsetMargin} posições
              </div>
            )}
            {recap.matchOfYear.duration && (
              <div className="text-sm text-purple-300 mt-1">
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

// ============================================
// DEPRECADO: SeriesPreview
// ============================================
// Este componente foi substituído por PreBattleScreen (no topo deste arquivo)
// Mantido apenas para compatibilidade temporária, mas não deve ser usado
// USAR: PreBattleScreen em vez deste
// ============================================

// TELA PRÉ-JOGO (aparece UMA VEZ por embate completo)


export {
  PreBattleScreen,
  BattleArena,
  ReplayScreen,
  PostMatchScreen,
  ExhibitionSetup,
  PlayerCard
};
