// ============================================
// EXPANDED SCHEDULE - Schedule com QUALIFYING Support
// ============================================

import React, { useState, useEffect } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Trophy, Target, Play, Eye, Lock } from 'lucide-react';
import { CALENDAR_STRUCTURE } from './CalendarConfig.js';

const ExpandedSchedule = ({ universeManager, currentMonth, onSelectTournament, onBack }) => {
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [monthData, setMonthData] = useState(null);
  const [qualifyingInfo, setQualifyingInfo] = useState(null);

  useEffect(() => {
    loadMonthData();
  }, [selectedMonth, universeManager.currentMonth]);

  const loadMonthData = () => {
    const month = CALENDAR_STRUCTURE.months.find(m => m.id === selectedMonth);
    setMonthData(month);

    // CORREÇÃO: Só mostrar qualifying se há um torneio QUALIFIER explícito no mês
    // Qualifying tournaments só existem em:
    // - Setembro: Last Chance Qualifier (type: 'QUALIFIER')
    // - Novembro: Finals Qualification Tournament (type: 'GRAND_FINALS_QUALIFIER')
    if (month && month.tournaments.length > 0) {
      const hasQualifier = month.tournaments.some(t => 
        t.type === 'QUALIFIER' || t.type === 'GRAND_FINALS_QUALIFIER'
      );
      const grandSlam = month.tournaments.find(t => t.type === 'GRAND_SLAM');
      
      // Só gerar qualifyingInfo se há Grand Slam E há um qualifier explícito
      if (grandSlam && hasQualifier) {
        generateQualifyingInfo(grandSlam);
      } else {
        setQualifyingInfo(null);
      }
    }
  };

  const generateQualifyingInfo = (grandSlam) => {
    // Pegar rankings BBP atuais
    const bbpRankings = Array.from(universeManager.bbpRankings.entries())
      .sort((a, b) => b[1] - a[1]);

    const elitePlayers = bbpRankings.slice(0, 16).map(([id]) => id);
    const challengersProspects = bbpRankings.slice(16, 64).map(([id]) => id);
    const wildCards = universeManager.wildCards || [];

    const qualifyingPlayers = challengersProspects.filter(id => !wildCards.includes(id));

    setQualifyingInfo({
      total: 64,
      qualifyingSpotsAvailable: 16,
      autoQualified: {
        elite: elitePlayers.length,
        wildCards: wildCards.length,
        total: elitePlayers.length + wildCards.length
      },
      mustQualify: {
        challengers: qualifyingPlayers.filter(id => {
          const rank = bbpRankings.findIndex(([pid]) => pid === id) + 1;
          return rank >= 17 && rank <= 40;
        }).length,
        prospects: qualifyingPlayers.filter(id => {
          const rank = bbpRankings.findIndex(([pid]) => pid === id) + 1;
          return rank >= 41 && rank <= 64;
        }).length
      },
      qualifyingPlayersCount: qualifyingPlayers.length
    });
  };

  const getTournamentIcon = (type) => {
    switch (type) {
      case 'GRAND_SLAM':
        return '🏆';
      case 'ATP_500':
        return '🥇';
      case 'ATP_250':
        return '🥈';
      case 'ATP_100':
        return '🥉';
      case 'QUALIFYING':
        return '🎯';
      case 'GRAND_FINALS':
        return '👑';
      default:
        return '🎮';
    }
  };

  const getTournamentColor = (tier) => {
    switch (tier) {
      case 'GRAND_SLAM':
        return {
          bg: 'linear-gradient(135deg, rgba(220, 38, 38, 0.1), rgba(185, 28, 28, 0.1))',
          border: '#dc2626',
          text: '#fca5a5'
        };
      case 'MASTERS':
        return {
          bg: 'linear-gradient(135deg, rgba(234, 179, 8, 0.1), rgba(202, 138, 4, 0.1))',
          border: '#eab308',
          text: '#fde047'
        };
      case 'CHALLENGERS':
        return {
          bg: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(37, 99, 235, 0.1))',
          border: '#3b82f6',
          text: '#93c5fd'
        };
      case 'PROSPECTS':
        return {
          bg: 'linear-gradient(135deg, rgba(34, 197, 94, 0.1), rgba(22, 163, 74, 0.1))',
          border: '#22c55e',
          text: '#86efac'
        };
      default:
        return {
          bg: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(124, 58, 237, 0.1))',
          border: '#8b5cf6',
          text: '#c4b5fd'
        };
    }
  };

  const renderTournamentWeek = (tournaments, weekLabel, weekRange) => {
    return (
      <div style={{ marginBottom: '24px' }}>
        <div style={{
          fontSize: '14px',
          fontWeight: '700',
          color: '#94a3b8',
          marginBottom: '12px',
          textTransform: 'uppercase',
          letterSpacing: '1px'
        }}>
          {weekLabel} ({weekRange})
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {tournaments.map((tournament, index) => {
            const colors = getTournamentColor(tournament.tier);
            
            // 🔒 NOVO SISTEMA: Calcular status do torneio
            const status = universeManager.getTournamentStatus(
              universeManager.currentYear,
              selectedMonth,
              index
            );
            
            const isCompleted = status === 'completed';
            const isNext = status === 'next';
            const isLocked = status === 'locked';
            
            // Se está completo, pegar dados do histórico
            let championData = null;
            if (isCompleted) {
              const key = `${universeManager.currentYear}-${selectedMonth}-${index}`;
              const historyData = universeManager.tournamentHistory.get(key);
              if (historyData) {
                championData = {
                  name: historyData.championName,
                  id: historyData.champion
                };
              }
            }

            return (
              <div
                key={index}
                style={{
                  background: isLocked 
                    ? 'rgba(30, 41, 59, 0.5)' 
                    : isCompleted 
                      ? 'rgba(20, 30, 40, 0.7)' 
                      : colors.bg,
                  backdropFilter: 'blur(10px)',
                  borderRadius: '16px',
                  padding: '24px',
                  border: `2px solid ${isNext ? colors.border : isCompleted ? 'rgba(100, 116, 139, 0.3)' : 'rgba(255, 255, 255, 0.1)'}`,
                  transition: 'all 0.3s',
                  cursor: isNext ? 'pointer' : 'default',
                  position: 'relative',
                  overflow: 'hidden',
                  opacity: isLocked ? 0.5 : 1
                }}
                onMouseEnter={(e) => {
                  if (isNext) {
                    e.currentTarget.style.transform = 'translateY(-4px)';
                    e.currentTarget.style.boxShadow = `0 12px 40px rgba(0, 0, 0, 0.4)`;
                  }
                }}
                onMouseLeave={(e) => {
                  if (isNext) {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }
                }}
              >
                {/* Status Indicator */}
                {isNext && (
                  <div style={{
                    position: 'absolute',
                    top: '12px',
                    right: '12px',
                    padding: '6px 16px',
                    background: 'linear-gradient(135deg, #10b981, #059669)',
                    borderRadius: '20px',
                    fontSize: '12px',
                    fontWeight: '700',
                    color: 'white',
                    animation: 'pulse 2s infinite',
                    boxShadow: '0 0 20px rgba(16, 185, 129, 0.5)'
                  }}>
                    🎮 NEXT UP
                  </div>
                )}
                
                {isCompleted && (
                  <div style={{
                    position: 'absolute',
                    top: '12px',
                    right: '12px',
                    padding: '6px 16px',
                    background: 'rgba(100, 116, 139, 0.3)',
                    borderRadius: '20px',
                    fontSize: '12px',
                    fontWeight: '700',
                    color: '#94a3b8'
                  }}>
                    ✅ COMPLETED
                  </div>
                )}
                
                {isLocked && (
                  <div style={{
                    position: 'absolute',
                    top: '12px',
                    right: '12px',
                    padding: '6px 16px',
                    background: 'rgba(51, 65, 85, 0.5)',
                    borderRadius: '20px',
                    fontSize: '12px',
                    fontWeight: '700',
                    color: '#64748b'
                  }}>
                    🔒 LOCKED
                  </div>
                )}

                {/* Tournament Header */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', marginBottom: '16px' }}>
                  <div style={{
                    fontSize: '48px',
                    lineHeight: 1
                  }}>
                    {getTournamentIcon(tournament.type)}
                  </div>
                  
                  <div style={{ flex: 1 }}>
                    <h3 style={{
                      fontSize: '22px',
                      fontWeight: '800',
                      color: 'white',
                      marginBottom: '8px',
                      margin: 0
                    }}>
                      {tournament.name}
                    </h3>
                    
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      flexWrap: 'wrap',
                      fontSize: '14px',
                      color: '#94a3b8'
                    }}>
                      <span>📍 {tournament.arena}</span>
                      <span>•</span>
                      <span>{tournament.matchFormat}</span>
                      <span>•</span>
                      <span>{tournament.participants} players</span>
                    </div>

                    <div style={{
                      display: 'inline-block',
                      marginTop: '8px',
                      padding: '4px 12px',
                      background: `${colors.border}30`,
                      border: `1px solid ${colors.border}`,
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: '600',
                      color: colors.text
                    }}>
                      {tournament.type}
                    </div>
                  </div>
                </div>

                {/* Status Info - APENAS VISUAL, SEM AÇÕES */}
                <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                  {/* Champion info para torneios completados */}
                  {isCompleted && championData && (
                    <div style={{
                      flex: 1,
                      padding: '12px 24px',
                      background: 'rgba(234, 179, 8, 0.1)',
                      border: '1px solid #eab308',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px'
                    }}>
                      <Trophy size={16} style={{ color: '#facc15' }} />
                      <span style={{ fontSize: '14px', fontWeight: '600', color: '#facc15' }}>
                        Champion: {championData.name}
                      </span>
                    </div>
                  )}

                  {/* NEXT UP indicator */}
                  {isNext && (
                    <div style={{
                      flex: 1,
                      padding: '16px 24px',
                      background: 'linear-gradient(135deg, #10b981, #059669)',
                      borderRadius: '8px',
                      color: 'white',
                      fontSize: '16px',
                      fontWeight: '700',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      boxShadow: '0 4px 20px rgba(16, 185, 129, 0.3)'
                    }}>
                      <Play size={20} />
                      NEXT - Play at Broadcast Hub
                    </div>
                  )}
                  
                  {/* LOCKED message */}
                  {isLocked && (
                    <div style={{
                      flex: 1,
                      padding: '12px 24px',
                      background: 'rgba(51, 65, 85, 0.3)',
                      border: '1px solid rgba(100, 116, 139, 0.3)',
                      borderRadius: '8px',
                      color: '#64748b',
                      fontSize: '14px',
                      fontWeight: '600',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px'
                    }}>
                      <Lock size={16} />
                      LOCKED
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderQualifyingCard = () => {
    if (!qualifyingInfo) return null;

    const colors = {
      bg: 'linear-gradient(135deg, rgba(249, 115, 22, 0.1), rgba(234, 88, 12, 0.1))',
      border: '#f97316',
      text: '#fdba74'
    };

    return (
      <div style={{
        background: colors.bg,
        backdropFilter: 'blur(10px)',
        borderRadius: '16px',
        padding: '24px',
        border: `2px solid ${colors.border}`,
        marginBottom: '24px'
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', marginBottom: '20px' }}>
          <div style={{ fontSize: '48px', lineHeight: 1 }}>🎯</div>
          
          <div style={{ flex: 1 }}>
            <h3 style={{
              fontSize: '22px',
              fontWeight: '800',
              color: 'white',
              marginBottom: '8px',
              margin: 0
            }}>
              {monthData.name} GRAND SLAM QUALIFYING
            </h3>
            
            <div style={{ fontSize: '14px', color: '#94a3b8', marginBottom: '8px' }}>
              📍 BB-10 Stadium • MD3
            </div>

            <div style={{
              display: 'inline-block',
              padding: '4px 12px',
              background: `${colors.border}30`,
              border: `1px solid ${colors.border}`,
              borderRadius: '12px',
              fontSize: '12px',
              fontWeight: '600',
              color: colors.text
            }}>
              QUALIFYING ROUND
            </div>
          </div>
        </div>

        {/* Qualifying Info */}
        <div style={{
          background: 'rgba(0, 0, 0, 0.3)',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '16px'
        }}>
          <div style={{ fontSize: '16px', fontWeight: '700', color: 'white', marginBottom: '16px' }}>
            {qualifyingInfo.qualifyingPlayersCount} players compete → Top {qualifyingInfo.qualifyingSpotsAvailable} qualify
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ fontSize: '14px', color: '#94a3b8' }}>
              <span style={{ fontSize: '16px', marginRight: '8px' }}>✅</span>
              <span style={{ fontWeight: '600', color: '#86efac' }}>
                👑 Elite (1-16):
              </span>
              {' '}AUTO-QUALIFIED ({qualifyingInfo.autoQualified.elite} players)
            </div>

            {qualifyingInfo.autoQualified.wildCards > 0 && (
              <div style={{ fontSize: '14px', color: '#94a3b8' }}>
                <span style={{ fontSize: '16px', marginRight: '8px' }}>✅</span>
                <span style={{ fontWeight: '600', color: '#c4b5fd' }}>
                  🎟️ Wild Card holders:
                </span>
                {' '}AUTO-QUALIFIED ({qualifyingInfo.autoQualified.wildCards} players)
              </div>
            )}

            <div style={{ fontSize: '14px', color: '#94a3b8' }}>
              <span style={{ fontSize: '16px', marginRight: '8px' }}>⚠️</span>
              <span style={{ fontWeight: '600', color: '#93c5fd' }}>
                ⚔️ Challengers (17-40):
              </span>
              {' '}MUST QUALIFY ({qualifyingInfo.mustQualify.challengers} players)
            </div>

            <div style={{ fontSize: '14px', color: '#94a3b8' }}>
              <span style={{ fontSize: '16px', marginRight: '8px' }}>⚠️</span>
              <span style={{ fontWeight: '600', color: '#86efac' }}>
                🌟 Prospects (41-64):
              </span>
              {' '}MUST QUALIFY ({qualifyingInfo.mustQualify.prospects} players)
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={() => onSelectTournament({ 
              name: `${monthData.name} Grand Slam Qualifying`,
              type: 'QUALIFYING',
              tier: 'QUALIFYING',
              arena: 'BB-10 Competitive',
              matchFormat: 'MD3',
              participants: 64
            }, 'VIEW')}
            style={{
              flex: 1,
              padding: '12px 24px',
              background: 'rgba(59, 130, 246, 0.2)',
              border: '1px solid #3b82f6',
              borderRadius: '8px',
              color: '#93c5fd',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(59, 130, 246, 0.3)';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(59, 130, 246, 0.2)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <Eye size={16} />
            VIEW BRACKET
          </button>

          <button
            onClick={() => onSelectTournament({ 
              name: `${monthData.name} Grand Slam Qualifying`,
              type: 'QUALIFYING',
              tier: 'QUALIFYING',
              arena: 'BB-10 Competitive',
              matchFormat: 'MD3',
              participants: 64
            }, 'START')}
            style={{
              flex: 1,
              padding: '12px 24px',
              background: colors.border,
              border: 'none',
              borderRadius: '8px',
              color: 'white',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.opacity = '0.9';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.opacity = '1';
            }}
          >
            <Target size={16} />
            START QUALIFYING
          </button>
        </div>
      </div>
    );
  };

  if (!monthData) return null;

  const hasGrandSlam = monthData.tournaments.some(t => t.type === 'GRAND_SLAM');
  const grandSlam = monthData.tournaments.find(t => t.type === 'GRAND_SLAM');
  const otherTournaments = monthData.tournaments.filter(t => t.type !== 'GRAND_SLAM');

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
      color: 'white',
      padding: '20px',
      fontFamily: "'Inter', sans-serif"
    }}>
      {/* Header */}
      <div style={{
        background: 'rgba(15, 23, 42, 0.8)',
        backdropFilter: 'blur(10px)',
        borderRadius: '16px',
        padding: '24px',
        marginBottom: '24px',
        border: '1px solid rgba(255, 255, 255, 0.1)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <Calendar size={32} style={{ color: '#60a5fa' }} />
            <div>
              <h1 style={{ 
                fontSize: '32px', 
                fontWeight: '800', 
                margin: 0,
                marginBottom: '4px'
              }}>
                {monthData.name.toUpperCase()} {universeManager.currentYear}
              </h1>
              <div style={{ fontSize: '14px', color: '#94a3b8' }}>
                Tournament Schedule
              </div>
            </div>
          </div>

          {/* Month Navigation */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              onClick={() => setSelectedMonth(selectedMonth === 1 ? 12 : selectedMonth - 1)}
              style={{
                padding: '10px',
                background: 'rgba(59, 130, 246, 0.2)',
                border: '1px solid #3b82f6',
                borderRadius: '8px',
                color: '#93c5fd',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(59, 130, 246, 0.3)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(59, 130, 246, 0.2)'}
            >
              <ChevronLeft size={20} />
            </button>

            <button
              onClick={() => setSelectedMonth(selectedMonth === 12 ? 1 : selectedMonth + 1)}
              style={{
                padding: '10px',
                background: 'rgba(59, 130, 246, 0.2)',
                border: '1px solid #3b82f6',
                borderRadius: '8px',
                color: '#93c5fd',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(59, 130, 246, 0.3)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(59, 130, 246, 0.2)'}
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Schedule Content */}
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {hasGrandSlam ? (
          <>
            {/* Week 1: Qualifying */}
            {renderQualifyingCard()}

            {/* Week 2-3: Grand Slam Main Draw */}
            {renderTournamentWeek(
              [grandSlam],
              'WEEK 2-3',
              `${monthData.name} 8-21`
            )}

            {/* Week 4: Other Tournaments */}
            {otherTournaments.length > 0 && renderTournamentWeek(
              otherTournaments,
              'WEEK 4',
              `${monthData.name} 22-28`
            )}
          </>
        ) : (
          renderTournamentWeek(
            monthData.tournaments,
            'THIS MONTH',
            monthData.name
          )
        )}
      </div>

      {/* Back Button */}
      <button onClick={onBack} style={{
        marginTop: '24px',
        width: '100%',
        maxWidth: '1200px',
        margin: '24px auto 0',
        display: 'block',
        padding: '16px',
        background: 'rgba(255, 255, 255, 0.1)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        borderRadius: '12px',
        color: 'white',
        fontSize: '16px',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'background 0.2s'
      }}
      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)'}
      onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}>
        ← Back to Hub
      </button>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
      `}</style>
    </div>
  );
};

export default ExpandedSchedule;
