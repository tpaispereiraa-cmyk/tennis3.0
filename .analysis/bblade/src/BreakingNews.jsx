// ============================================
// BREAKING NEWS - Sistema de Notícias Importantes
// ============================================

import React, { useState, useEffect } from 'react';
import { X, TrendingUp, TrendingDown, Trophy, Zap, Swords, Award } from 'lucide-react';

const BreakingNews = ({ event, onDismiss, onAction }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (event) {
      setIsVisible(true);
    }
  }, [event]);

  if (!event || !isVisible) return null;

  const handleDismiss = () => {
    setIsVisible(false);
    setTimeout(() => {
      onDismiss();
    }, 300);
  };

  const getEventIcon = () => {
    switch (event.type) {
      case 'PROMOTION':
        return <TrendingUp size={32} style={{ color: '#22c55e' }} />;
      case 'RELEGATION':
        return <TrendingDown size={32} style={{ color: '#ef4444' }} />;
      case 'ACHIEVEMENT':
        return <Award size={32} style={{ color: '#facc15' }} />;
      case 'WILD_CARD':
        return <Trophy size={32} style={{ color: '#8b5cf6' }} />;
      case 'UPSET':
        return <Zap size={32} style={{ color: '#f97316' }} />;
      case 'WIN_STREAK':
        return <Zap size={32} style={{ color: '#dc2626' }} />;
      case 'RIVALRY':
        return <Swords size={32} style={{ color: '#dc2626' }} />;
      default:
        return <Trophy size={32} style={{ color: '#60a5fa' }} />;
    }
  };

  const getEventColor = () => {
    switch (event.type) {
      case 'PROMOTION':
        return {
          bg: 'rgba(34, 197, 94, 0.1)',
          border: '#22c55e',
          text: '#86efac'
        };
      case 'RELEGATION':
        return {
          bg: 'rgba(239, 68, 68, 0.1)',
          border: '#ef4444',
          text: '#fca5a5'
        };
      case 'ACHIEVEMENT':
        return {
          bg: 'rgba(250, 204, 21, 0.1)',
          border: '#facc15',
          text: '#fde047'
        };
      case 'WILD_CARD':
        return {
          bg: 'rgba(139, 92, 246, 0.1)',
          border: '#8b5cf6',
          text: '#c4b5fd'
        };
      case 'UPSET':
      case 'WIN_STREAK':
        return {
          bg: 'rgba(249, 115, 22, 0.1)',
          border: '#f97316',
          text: '#fdba74'
        };
      case 'RIVALRY':
        return {
          bg: 'rgba(220, 38, 38, 0.1)',
          border: '#dc2626',
          text: '#fca5a5'
        };
      default:
        return {
          bg: 'rgba(59, 130, 246, 0.1)',
          border: '#3b82f6',
          text: '#93c5fd'
        };
    }
  };

  const colors = getEventColor();

  return (
    <div style={{
      position: 'fixed',
      top: '20px',
      left: '50%',
      transform: isVisible ? 'translate(-50%, 0)' : 'translate(-50%, -200px)',
      zIndex: 9999,
      opacity: isVisible ? 1 : 0,
      transition: 'all 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
      maxWidth: '600px',
      width: '90%'
    }}>
      <div style={{
        background: colors.bg,
        backdropFilter: 'blur(20px)',
        borderRadius: '16px',
        padding: '24px',
        border: `2px solid ${colors.border}`,
        boxShadow: `0 20px 60px rgba(0, 0, 0, 0.5), 0 0 40px ${colors.border}40`,
        position: 'relative',
        animation: 'slideInBounce 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55)'
      }}>
        {/* Close Button */}
        <button 
          onClick={handleDismiss}
          style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            background: 'rgba(0, 0, 0, 0.5)',
            border: 'none',
            borderRadius: '50%',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'background 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0, 0, 0, 0.7)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(0, 0, 0, 0.5)'}
        >
          <X size={20} style={{ color: 'white' }} />
        </button>

        {/* Content */}
        <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
          {/* Icon */}
          <div style={{
            minWidth: '64px',
            height: '64px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0, 0, 0, 0.3)',
            borderRadius: '16px',
            animation: 'iconPulse 2s infinite'
          }}>
            {getEventIcon()}
          </div>

          {/* Text Content */}
          <div style={{ flex: 1 }}>
            <div style={{
              fontSize: '12px',
              fontWeight: '700',
              color: colors.text,
              letterSpacing: '1px',
              marginBottom: '8px'
            }}>
              🔴 BREAKING NEWS
            </div>

            <h2 style={{
              fontSize: '20px',
              fontWeight: '800',
              color: 'white',
              marginBottom: '8px',
              margin: 0
            }}>
              {event.title}
            </h2>

            <p style={{
              fontSize: '15px',
              color: '#cbd5e1',
              marginBottom: '16px',
              margin: 0,
              lineHeight: '1.5'
            }}>
              {event.description}
            </p>

            {/* Action Buttons */}
            {event.actions && event.actions.length > 0 && (
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                {event.actions.map((action, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      handleDismiss();
                      if (action.callback) {
                        action.callback();
                      }
                      onAction(action);
                    }}
                    style={{
                      padding: '10px 20px',
                      background: colors.border,
                      border: 'none',
                      borderRadius: '8px',
                      color: 'white',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'transform 0.2s, opacity 0.2s',
                      opacity: 0.9
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.opacity = '1';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.opacity = '0.9';
                    }}
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Progress Bar (auto-dismiss) */}
        {event.autoDismiss && (
          <div style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '4px',
            background: 'rgba(255, 255, 255, 0.1)',
            borderBottomLeftRadius: '16px',
            borderBottomRightRadius: '16px',
            overflow: 'hidden'
          }}>
            <div style={{
              height: '100%',
              background: colors.border,
              animation: `shrink ${event.autoDismissTime || 5}s linear forwards`
            }} />
          </div>
        )}
      </div>

      <style>{`
        @keyframes slideInBounce {
          0% {
            transform: translateY(-200px);
            opacity: 0;
          }
          60% {
            transform: translateY(10px);
            opacity: 1;
          }
          80% {
            transform: translateY(-5px);
          }
          100% {
            transform: translateY(0);
          }
        }

        @keyframes iconPulse {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.1);
          }
        }

        @keyframes shrink {
          from {
            width: 100%;
          }
          to {
            width: 0%;
          }
        }
      `}</style>
    </div>
  );
};

export default BreakingNews;
