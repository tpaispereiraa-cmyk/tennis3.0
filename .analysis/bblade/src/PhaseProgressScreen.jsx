// ============================================
// PHASE PROGRESS SCREEN - Tela de progresso ao avançar fase
// Mostra informações enquanto o motor REAL processa em segundo plano
// ============================================

import React from 'react';

const PhaseProgressScreen = ({ 
  phaseName,
  currentMatch,
  totalMatches,
  completedMatches,
  lastResult,
  onCancel 
}) => {
  const progress = totalMatches > 0 ? (completedMatches / totalMatches) * 100 : 0;
  
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999
    }}>
      <div style={{
        maxWidth: '700px',
        width: '90%',
        background: 'rgba(0, 0, 0, 0.4)',
        borderRadius: '20px',
        padding: '3rem',
        border: '2px solid rgba(138, 43, 226, 0.4)',
        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5)'
      }}>
        {/* Header */}
        <div style={{
          textAlign: 'center',
          marginBottom: '2.5rem'
        }}>
          <div style={{
            fontSize: '3rem',
            marginBottom: '1rem'
          }}>⚡</div>
          <h2 style={{
            fontSize: '2rem',
            fontWeight: '800',
            color: '#c084fc',
            marginBottom: '0.5rem',
            textTransform: 'uppercase',
            letterSpacing: '2px'
          }}>
            Avançando Fase
          </h2>
          <p style={{
            fontSize: '1.3rem',
            color: '#a78bfa',
            fontWeight: '600'
          }}>
            {phaseName}
          </p>
        </div>

        {/* Progress Bar */}
        <div style={{
          marginBottom: '2.5rem'
        }}>
          <div style={{
            background: 'rgba(100, 100, 100, 0.3)',
            borderRadius: '12px',
            height: '35px',
            overflow: 'hidden',
            border: '2px solid rgba(138, 43, 226, 0.4)'
          }}>
            <div style={{
              background: 'linear-gradient(90deg, #8b5cf6 0%, #c084fc 100%)',
              height: '100%',
              width: `${progress}%`,
              transition: 'width 0.3s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontWeight: '700',
              fontSize: '1rem'
            }}>
              {Math.round(progress)}%
            </div>
          </div>
          
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginTop: '0.75rem',
            fontSize: '1rem',
            color: 'rgba(255, 255, 255, 0.7)',
            fontWeight: '600'
          }}>
            <span>✅ {completedMatches} / {totalMatches}</span>
            <span>⏳ {totalMatches - completedMatches} restantes</span>
          </div>
        </div>

        {/* Current Match Info */}
        {currentMatch && (
          <div style={{
            background: 'rgba(138, 43, 226, 0.15)',
            borderRadius: '15px',
            padding: '2rem',
            marginBottom: '2rem',
            border: '1px solid rgba(138, 43, 226, 0.4)'
          }}>
            <div style={{
              fontSize: '0.9rem',
              color: 'rgba(255, 255, 255, 0.6)',
              marginBottom: '1rem',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              fontWeight: '600'
            }}>
              Processando Agora
            </div>
            
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '2rem'
            }}>
              <div style={{
                textAlign: 'center',
                flex: '1'
              }}>
                <div style={{
                  fontSize: '1.4rem',
                  fontWeight: '700',
                  color: '#fff',
                  marginBottom: '0.5rem'
                }}>
                  {currentMatch.player1}
                </div>
                <div style={{
                  fontSize: '0.8rem',
                  color: 'rgba(255, 255, 255, 0.5)'
                }}>
                  {currentMatch.bey1}
                </div>
              </div>
              
              <div style={{
                fontSize: '2rem',
                color: '#f59e0b',
                fontWeight: '900'
              }}>
                VS
              </div>
              
              <div style={{
                textAlign: 'center',
                flex: '1'
              }}>
                <div style={{
                  fontSize: '1.4rem',
                  fontWeight: '700',
                  color: '#fff',
                  marginBottom: '0.5rem'
                }}>
                  {currentMatch.player2}
                </div>
                <div style={{
                  fontSize: '0.8rem',
                  color: 'rgba(255, 255, 255, 0.5)'
                }}>
                  {currentMatch.bey2}
                </div>
              </div>
            </div>

            {currentMatch.arena && (
              <div style={{
                marginTop: '1rem',
                textAlign: 'center',
                fontSize: '0.9rem',
                color: 'rgba(255, 255, 255, 0.6)'
              }}>
                🎮 Arena: {currentMatch.arena}
              </div>
            )}
          </div>
        )}

        {/* Last Result */}
        {lastResult && (
          <div style={{
            background: 'rgba(34, 197, 94, 0.15)',
            borderRadius: '15px',
            padding: '1.5rem',
            marginBottom: '2rem',
            border: '1px solid rgba(34, 197, 94, 0.4)'
          }}>
            <div style={{
              fontSize: '0.8rem',
              color: 'rgba(255, 255, 255, 0.5)',
              marginBottom: '0.75rem',
              textTransform: 'uppercase',
              letterSpacing: '1px'
            }}>
              Última Partida Concluída
            </div>
            
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{
                fontSize: '1.1rem',
                fontWeight: '600',
                color: '#4ade80'
              }}>
                🏆 {lastResult.winner}
              </div>
              <div style={{
                fontSize: '0.9rem',
                color: 'rgba(255, 255, 255, 0.6)',
                background: 'rgba(0, 0, 0, 0.3)',
                padding: '0.4rem 1rem',
                borderRadius: '8px'
              }}>
                {lastResult.finishType}
              </div>
            </div>
          </div>
        )}

        {/* Info */}
        <div style={{
          background: 'rgba(59, 130, 246, 0.1)',
          borderRadius: '12px',
          padding: '1.5rem',
          border: '1px solid rgba(59, 130, 246, 0.3)',
          marginBottom: '1.5rem'
        }}>
          <div style={{
            fontSize: '0.95rem',
            color: 'rgba(255, 255, 255, 0.7)',
            lineHeight: '1.6'
          }}>
            <div style={{ marginBottom: '0.5rem' }}>
              ⚙️ Usando motor de física 100% real
            </div>
            <div style={{ marginBottom: '0.5rem' }}>
              🎯 Processando em segundo plano
            </div>
            <div>
              ⏱️ Aguarde o processamento completo
            </div>
          </div>
        </div>

        {/* Cancel Button */}
        <button
          onClick={onCancel}
          style={{
            width: '100%',
            padding: '1rem',
            background: 'rgba(239, 68, 68, 0.2)',
            border: '2px solid rgba(239, 68, 68, 0.5)',
            borderRadius: '12px',
            color: '#fca5a5',
            fontSize: '1rem',
            fontWeight: '700',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            textTransform: 'uppercase',
            letterSpacing: '1px'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.3)';
            e.currentTarget.style.borderColor = '#ef4444';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)';
            e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.5)';
          }}
        >
          ❌ Cancelar
        </button>
      </div>
    </div>
  );
};

export default PhaseProgressScreen;
