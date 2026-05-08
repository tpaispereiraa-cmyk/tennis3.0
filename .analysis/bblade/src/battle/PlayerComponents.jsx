// ============================================
// PLAYER COMPONENTS
// Componentes de perfil e informações de jogadores
// ============================================

import React, { useState, useRef } from 'react';
import { CALENDAR_STRUCTURE as CALENDAR_CONFIG } from '../CalendarConfig.js';
import { MENTALITIES } from '../UniverseManager.js';
import { calculateStatBreakdown, calculateTotalStat } from '../utils/stats.js';

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
                        {Object.values(team.attributes).reduce((a, b) => a + b, 0)}/180
                      </span>
                    </span>
                  </div>
                  
                  <div className="space-y-2">
                    {/* Attack */}
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-xs font-bold text-gray-300">⚔️ ATTACK</span>
                        <span className="text-xs font-bold text-white">{team.attributes.attack}/20</span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
                        <div 
                          className="bg-gradient-to-r from-red-600 to-red-400 h-full rounded-full transition-all duration-500"
                          style={{ width: `${(team.attributes.attack / 20) * 100}%` }}
                        />
                      </div>
                    </div>
                    
                    {/* Defense */}
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-xs font-bold text-gray-300">🛡️ DEFENSE</span>
                        <span className="text-xs font-bold text-white">{team.attributes.defense}/20</span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
                        <div 
                          className="bg-gradient-to-r from-blue-600 to-blue-400 h-full rounded-full transition-all duration-500"
                          style={{ width: `${(team.attributes.defense / 20) * 100}%` }}
                        />
                      </div>
                    </div>
                    
                    {/* Stamina */}
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-xs font-bold text-gray-300">⚡ STAMINA</span>
                        <span className="text-xs font-bold text-white">{team.attributes.stamina}/20</span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
                        <div 
                          className="bg-gradient-to-r from-green-600 to-green-400 h-full rounded-full transition-all duration-500"
                          style={{ width: `${(team.attributes.stamina / 20) * 100}%` }}
                        />
                      </div>
                    </div>
                    
                    {/* Speed */}
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-xs font-bold text-gray-300">💨 SPEED</span>
                        <span className="text-xs font-bold text-white">{team.attributes.speed}/20</span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
                        <div 
                          className="bg-gradient-to-r from-yellow-600 to-yellow-400 h-full rounded-full transition-all duration-500"
                          style={{ width: `${(team.attributes.speed / 20) * 100}%` }}
                        />
                      </div>
                    </div>
                    
                    {/* Technique */}
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-xs font-bold text-gray-300">🎯 TECHNIQUE</span>
                        <span className="text-xs font-bold text-white">{team.attributes.technique}/20</span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
                        <div 
                          className="bg-gradient-to-r from-purple-600 to-purple-400 h-full rounded-full transition-all duration-500"
                          style={{ width: `${(team.attributes.technique / 20) * 100}%` }}
                        />
                      </div>
                    </div>
                    
                    {/* Intelligence */}
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-xs font-bold text-gray-300">🧠 INTELLIGENCE</span>
                        <span className="text-xs font-bold text-white">{team.attributes.intelligence}/20</span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
                        <div 
                          className="bg-gradient-to-r from-cyan-600 to-cyan-400 h-full rounded-full transition-all duration-500"
                          style={{ width: `${(team.attributes.intelligence / 20) * 100}%` }}
                        />
                      </div>
                    </div>
                    
                    {/* Adaptability */}
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-xs font-bold text-gray-300">🌍 ADAPTABILITY</span>
                        <span className="text-xs font-bold text-white">{team.attributes.adaptability}/20</span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
                        <div 
                          className="bg-gradient-to-r from-green-600 to-green-400 h-full rounded-full transition-all duration-500"
                          style={{ width: `${(team.attributes.adaptability / 20) * 100}%` }}
                        />
                      </div>
                    </div>
                    
                    {/* Clutch */}
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-xs font-bold text-gray-300">🔥 CLUTCH</span>
                        <span className="text-xs font-bold text-white">{team.attributes.clutch}/20</span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
                        <div 
                          className="bg-gradient-to-r from-orange-600 to-orange-400 h-full rounded-full transition-all duration-500"
                          style={{ width: `${(team.attributes.clutch / 20) * 100}%` }}
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


export { PlayerCard };
