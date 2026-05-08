// ============================================
// RETIREMENTANNOUNCEMENT.JSX - UI de Anúncio de Aposentadoria
// ============================================

import React from 'react';

export function RetirementAnnouncement({ retirements, onClose }) {
  if (!retirements || retirements.length === 0) {
    return null;
  }

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.92)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: 20
    }}>
      <div style={{
        background: 'linear-gradient(135deg, #1a1a1a 0%, #0a0a0a 100%)',
        border: '2px solid rgba(255,215,0,0.3)',
        borderRadius: 12,
        maxWidth: 800,
        width: '100%',
        maxHeight: '90vh',
        overflow: 'auto',
        padding: 32
      }}>
        {/* Header */}
        <div style={{
          textAlign: 'center',
          marginBottom: 32
        }}>
          <h1 style={{
            fontFamily: '"Black Ops One", cursive',
            fontSize: 36,
            color: '#ffd700',
            margin: 0,
            marginBottom: 8,
            textShadow: '0 0 20px rgba(255,215,0,0.5)'
          }}>
            🏁 APOSENTADORIAS
          </h1>
          <p style={{
            fontFamily: '"Rajdhani", sans-serif',
            fontSize: 14,
            color: 'rgba(255,255,255,0.6)',
            margin: 0
          }}>
            Final da Temporada {retirements[0]?.retirementYear || 2024}
          </p>
        </div>

        {/* Lista de Aposentadorias */}
        {retirements.map((retirement, index) => (
          <RetirementCard key={index} retirement={retirement} />
        ))}

        {/* Botão */}
        <button
          onClick={onClose}
          style={{
            width: '100%',
            padding: '16px 32px',
            background: 'linear-gradient(135deg, #ffd700 0%, #ffed4e 100%)',
            border: 'none',
            borderRadius: 8,
            fontFamily: '"Orbitron", monospace',
            fontSize: 14,
            fontWeight: 700,
            letterSpacing: '0.1em',
            color: '#000',
            cursor: 'pointer',
            marginTop: 24,
            transition: 'all 0.2s ease'
          }}
          onMouseOver={(e) => {
            e.target.style.transform = 'translateY(-2px)';
            e.target.style.boxShadow = '0 8px 20px rgba(255,215,0,0.4)';
          }}
          onMouseOut={(e) => {
            e.target.style.transform = 'translateY(0)';
            e.target.style.boxShadow = 'none';
          }}
        >
          PROSSEGUIR
        </button>
      </div>
    </div>
  );
}

// ============================================
// COMPONENTE DE CARD INDIVIDUAL
// ============================================

function RetirementCard({ retirement }) {
  const { player, type, careerSummary, badges = [] } = retirement;

  const TIER_COLORS = { BRONZE: '#cd7f32', SILVER: '#c0c0c0', GOLD: '#ffd700' };
  const TIER_LABELS = { BRONZE: 'Bronze',  SILVER: 'Prata',   GOLD: 'Ouro' };

  const narratives = {
    NATURAL: `Após ${careerSummary.yearsActive} anos de carreira gloriosa, ${player.name} anuncia sua aposentadoria. Com ${player.age} anos e ${careerSummary.totalTitles} títulos conquistados, o veterano deixa um legado inesquecível.`,
    
    DECLINE: `${player.name} decide se aposentar após reconhecer que não consegue mais competir no mais alto nível. Uma carreira respeitável chega ao fim.`,
    
    INJURY: `Após uma lesão devastadora, ${player.name} é forçado a pendurar o launcher. O esporte perde um de seus grandes guerreiros prematuramente.`,
    
    PREMATURE: `Surpreendentemente, ${player.name} anuncia aposentadoria precoce aos ${player.age} anos. Citando desgaste mental e falta de motivação, o jogador deixa o esporte enquanto ainda jovem.`,
    
    LEGENDARY: `Uma era chega ao fim. ${player.name}, ${careerSummary.totalTitles}x campeão e lenda viva, se despede do esporte em grande estilo. O Hall of Fame aguarda.`
  };

  const typeColors = {
    NATURAL: '#60a5fa',
    DECLINE: '#f97316',
    INJURY: '#ef4444',
    PREMATURE: '#a855f7',
    LEGENDARY: '#ffd700'
  };

  const typeIcons = {
    NATURAL: '🌟',
    DECLINE: '📉',
    INJURY: '🏥',
    PREMATURE: '🚪',
    LEGENDARY: '👑'
  };

  const typeLabels = {
    NATURAL: 'Aposentadoria Natural',
    DECLINE: 'Declínio Crítico',
    INJURY: 'Lesão',
    PREMATURE: 'Aposentadoria Prematura',
    LEGENDARY: 'Aposentadoria Lendária'
  };

  const color = typeColors[type] || '#60a5fa';
  const icon = typeIcons[type] || '🏁';
  const label = typeLabels[type] || 'Aposentadoria';

  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      border: `1px solid ${color}55`,
      borderRadius: 8,
      padding: 24,
      marginBottom: 20
    }}>
      {/* Player Header */}
      <div style={{
        display: 'flex',
        gap: 16,
        alignItems: 'center',
        marginBottom: 16,
        paddingBottom: 16,
        borderBottom: `1px solid ${color}33`
      }}>
        {/* Player Icon */}
        <div style={{
          width: 64,
          height: 64,
          borderRadius: '50%',
          background: `linear-gradient(135deg, ${color}, ${color}88)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 32,
          border: `2px solid ${color}`
        }}>
          {icon}
        </div>

        {/* Player Info */}
        <div style={{ flex: 1 }}>
          <h3 style={{
            fontFamily: '"Black Ops One", cursive',
            fontSize: 20,
            color: 'rgba(255,255,255,0.95)',
            margin: 0,
            marginBottom: 4
          }}>
            {player.name}
          </h3>
          <div style={{
            display: 'flex',
            gap: 12,
            alignItems: 'center'
          }}>
            <span style={{
              fontFamily: '"Orbitron", monospace',
              fontSize: 11,
              color: 'rgba(255,255,255,0.5)'
            }}>
              {player.country || '🌍 Global'}
            </span>
            <span style={{
              fontFamily: '"Orbitron", monospace',
              fontSize: 11,
              color: 'rgba(255,255,255,0.5)'
            }}>
              {player.age} anos
            </span>
            <span style={{
              fontFamily: '"Orbitron", monospace',
              fontSize: 9,
              padding: '2px 8px',
              background: `${color}22`,
              color: color,
              border: `1px solid ${color}55`,
              borderRadius: 4,
              fontWeight: 700,
              letterSpacing: '0.05em'
            }}>
              {label}
            </span>
          </div>
        </div>
      </div>

      {/* Narrative */}
      <p style={{
        fontFamily: '"Rajdhani", sans-serif',
        fontSize: 15,
        lineHeight: 1.6,
        color: 'rgba(255,255,255,0.8)',
        marginBottom: 20
      }}>
        {narratives[type]}
      </p>

      {/* Career Stats */}
      <div style={{
        background: 'rgba(0,0,0,0.3)',
        borderRadius: 6,
        padding: 16
      }}>
        <h4 style={{
          fontFamily: '"Orbitron", monospace',
          fontSize: 10,
          letterSpacing: '0.15em',
          color: `${color}cc`,
          margin: 0,
          marginBottom: 12,
          textTransform: 'uppercase'
        }}>
          📊 Estatísticas de Carreira
        </h4>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: 12
        }}>
          <StatBox label="Anos Ativos" value={careerSummary.yearsActive} color={color} />
          <StatBox label="Títulos" value={careerSummary.totalTitles} color={color} />
          <StatBox label="Pico do Ranking" value={`#${careerSummary.peakRanking}`} color={color} />
          <StatBox 
            label="Recorde" 
            value={`${careerSummary.totalWins}W-${careerSummary.totalLosses}L`} 
            color={color} 
          />
        </div>
      </div>

      {/* Badges conquistados */}
      {badges.length > 0 && (
        <div style={{ marginTop:16 }}>
          <div style={{ fontFamily:'"Orbitron",monospace', fontSize:9, color:'rgba(255,215,0,.5)', letterSpacing:'.3em', marginBottom:10 }}>
            🏅 BADGES CONQUISTADOS
          </div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
            {badges.map(ach => {
              const tier  = ach.unlockedTier;
              const color = TIER_COLORS[tier];
              const tierData = ach.tiers?.[tier];
              return (
                <div key={ach.id} title={`${ach.name} — ${tierData?.label || ''}: ${tierData?.description || ''}`} style={{
                  background: `${color}12`,
                  border: `1px solid ${color}55`,
                  borderRadius:3,
                  padding:'4px 8px',
                  display:'flex',
                  alignItems:'center',
                  gap:5,
                }}>
                  <span style={{ fontSize:14, filter:`drop-shadow(0 0 4px ${color}88)` }}>{ach.icon}</span>
                  <div>
                    <div style={{ fontFamily:'"Rajdhani",sans-serif', fontWeight:700, fontSize:10, color:'rgba(255,255,255,.85)', lineHeight:1 }}>{ach.name}</div>
                    <div style={{ fontFamily:'"Orbitron",monospace', fontSize:7, color, letterSpacing:'.1em' }}>{TIER_LABELS[tier]}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Special message for LEGENDARY */}
      {type === 'LEGENDARY' && (
        <div style={{
          marginTop: 16,
          padding: 12,
          background: 'rgba(255,215,0,0.1)',
          border: '1px solid rgba(255,215,0,0.3)',
          borderRadius: 6,
          textAlign: 'center'
        }}>
          <span style={{
            fontFamily: '"Orbitron", monospace',
            fontSize: 12,
            fontWeight: 700,
            color: '#ffd700',
            letterSpacing: '0.1em'
          }}>
            🏛️ INDUZIDO AO HALL OF FAME
          </span>
        </div>
      )}
    </div>
  );
}

// ============================================
// COMPONENTE DE STAT BOX
// ============================================

function StatBox({ label, value, color }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      border: `1px solid rgba(255,255,255,0.08)`,
      borderRadius: 4,
      padding: 8,
      textAlign: 'center'
    }}>
      <div style={{
        fontFamily: '"Orbitron", monospace',
        fontSize: 16,
        fontWeight: 700,
        color: color,
        marginBottom: 2
      }}>
        {value}
      </div>
      <div style={{
        fontFamily: '"Orbitron", monospace',
        fontSize: 8,
        letterSpacing: '0.1em',
        color: 'rgba(255,255,255,0.4)',
        textTransform: 'uppercase'
      }}>
        {label}
      </div>
    </div>
  );
}

export default RetirementAnnouncement;
