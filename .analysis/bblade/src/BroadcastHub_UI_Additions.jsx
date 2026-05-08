// ============================================
// BROADCASTHUB_UI_ADDITIONS.jsx
// Novos componentes para Rising Stars e Calendário
// ============================================
//
// INSTRUÇÕES:
// 1. Adicionar imports no início do BroadcastHub.jsx
// 2. Adicionar novas views no switch de currentView
// 3. Adicionar botões de navegação no menu

import React from 'react';
import { Star, TrendingUp, Trophy, Calendar, Users, Award, Flame, Target } from 'lucide-react';

// ============================================
// 🌟 RISING STARS VIEW
// ============================================

const RisingStarsView = ({ universeManager, onNavigate }) => {
  const risingStars = universeManager.getRisingStarsByRanking();
  
  // Estatísticas gerais
  const totalRisingStars = risingStars.length;
  const avgAge = risingStars.reduce((sum, p) => sum + p.age, 0) / totalRisingStars;
  const potentialBreakdown = risingStars.reduce((acc, p) => {
    const cat = p.potential.category;
    acc[cat] = (acc[cat] || 0) + 1;
    return acc;
  }, {});
  
  return (
    <div style={{ animation: 'hub-entry .4s ease both' }}>
      {/* Header */}
      <div style={{ 
        marginBottom: 24,
        padding: '20px 24px',
        background: 'linear-gradient(135deg, rgba(255,215,0,.1) 0%, rgba(255,165,0,.05) 100%)',
        border: '1px solid rgba(255,215,0,.2)',
        borderRadius: 8
      }}>
        <div style={{ 
          fontFamily: 'Orbitron, monospace',
          fontSize: 24,
          fontWeight: 700,
          color: '#ffd700',
          marginBottom: 8,
          display: 'flex',
          alignItems: 'center',
          gap: 12
        }}>
          <Star size={28} />
          RISING STAR RANKINGS
        </div>
        <div style={{
          fontFamily: 'Rajdhani, sans-serif',
          fontSize: 13,
          color: 'rgba(255,255,255,0.6)',
          marginBottom: 16
        }}>
          Ranking Amador • Últimos 18 meses • Próxima geração de campeões
        </div>
        
        {/* Stats Cards */}
        <div style={{ 
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 12
        }}>
          <StatCard 
            icon={<Users size={20} />}
            label="Total de Rising Stars"
            value={totalRisingStars}
            color="#ffd700"
          />
          <StatCard 
            icon={<TrendingUp size={20} />}
            label="Idade Média"
            value={`${avgAge.toFixed(1)} anos`}
            color="#60a5fa"
          />
          <StatCard 
            icon={<Trophy size={20} />}
            label="Potencial Elite+"
            value={Object.entries(potentialBreakdown)
              .filter(([cat]) => ['GERACIONAL', 'LENDA', 'ELITE'].includes(cat))
              .reduce((sum, [, count]) => sum + count, 0)}
            color="#f59e0b"
          />
          <StatCard 
            icon={<Target size={20} />}
            label="Próxima Promoção"
            value="Top 4"
            color="#10b981"
          />
        </div>
      </div>
      
      {/* Rising Stars Table */}
      <div style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 8,
        overflow: 'hidden'
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{
              background: 'rgba(255,215,0,0.08)',
              borderBottom: '2px solid rgba(255,215,0,0.2)'
            }}>
              <th style={tableHeaderStyle}>Pos</th>
              <th style={{ ...tableHeaderStyle, textAlign: 'left' }}>Jogador</th>
              <th style={tableHeaderStyle}>Idade</th>
              <th style={tableHeaderStyle}>País</th>
              <th style={tableHeaderStyle}>Pontos</th>
              <th style={tableHeaderStyle}>Potencial</th>
              <th style={tableHeaderStyle}>Status</th>
            </tr>
          </thead>
          <tbody>
            {risingStars.map((player, index) => {
              const points = universeManager.amateurRankings.get(player.id) || 0;
              const potentialColor = getPotentialColor(player.potential.category);
              const isTop4 = index < 4;
              
              return (
                <tr 
                  key={player.id}
                  onClick={() => onNavigate && onNavigate('PLAYER_PROFILE', player.id)}
                  style={{
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                    background: isTop4 ? 'rgba(255,215,0,0.03)' : 'transparent',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255,215,0,0.08)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = isTop4 ? 'rgba(255,215,0,0.03)' : 'transparent';
                  }}
                >
                  <td style={tableCellStyle}>
                    <div style={{
                      fontFamily: 'Orbitron, monospace',
                      fontSize: 16,
                      fontWeight: 700,
                      color: isTop4 ? '#ffd700' : 'rgba(255,255,255,0.6)'
                    }}>
                      #{index + 1}
                    </div>
                  </td>
                  <td style={{ ...tableCellStyle, textAlign: 'left' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <img 
                        src={player.iconUrl || player.photoUrl}
                        alt=""
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: '50%',
                          border: `2px solid ${potentialColor}`,
                          objectFit: 'cover'
                        }}
                      />
                      <div>
                        <div style={{
                          fontFamily: 'Rajdhani, sans-serif',
                          fontSize: 14,
                          fontWeight: 700,
                          color: 'rgba(255,255,255,0.9)'
                        }}>
                          {player.name}
                        </div>
                        <div style={{
                          fontFamily: 'Rajdhani, sans-serif',
                          fontSize: 11,
                          color: 'rgba(255,255,255,0.5)'
                        }}>
                          {player.potential.alcunha}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td style={tableCellStyle}>
                    <div style={{ color: 'rgba(255,255,255,0.7)' }}>
                      {player.age}
                    </div>
                  </td>
                  <td style={tableCellStyle}>
                    <div style={{ fontSize: 20 }}>
                      {player.country.split(' ')[0]}
                    </div>
                  </td>
                  <td style={tableCellStyle}>
                    <div style={{
                      fontFamily: 'Orbitron, monospace',
                      fontSize: 14,
                      fontWeight: 700,
                      color: isTop4 ? '#ffd700' : 'rgba(255,255,255,0.8)'
                    }}>
                      {points}
                    </div>
                  </td>
                  <td style={tableCellStyle}>
                    <div style={{
                      display: 'inline-block',
                      padding: '4px 12px',
                      background: `${potentialColor}22`,
                      border: `1px solid ${potentialColor}44`,
                      borderRadius: 4,
                      fontFamily: 'Rajdhani, sans-serif',
                      fontSize: 11,
                      fontWeight: 700,
                      color: potentialColor
                    }}>
                      {player.potential.category}
                    </div>
                  </td>
                  <td style={tableCellStyle}>
                    {isTop4 ? (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        color: '#ffd700'
                      }}>
                        <Flame size={16} />
                        <span style={{ fontSize: 11, fontWeight: 700 }}>ELITE</span>
                      </div>
                    ) : (
                      <div style={{
                        fontSize: 11,
                        color: 'rgba(255,255,255,0.4)'
                      }}>
                        DEVELOPING
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      
      {/* Próximos Torneios Rising Star */}
      <div style={{ marginTop: 24 }}>
        <div style={{
          fontFamily: 'Orbitron, monospace',
          fontSize: 14,
          fontWeight: 700,
          color: '#ffd700',
          marginBottom: 12
        }}>
          📅 PRÓXIMOS TORNEIOS RISING STAR
        </div>
        <UpcomingRisingStarTournaments universeManager={universeManager} />
      </div>
    </div>
  );
};

// Helper: Próximos torneios Rising Star
const UpcomingRisingStarTournaments = ({ universeManager }) => {
  // Buscar próximos torneios Rising Star no calendário
  const upcomingTournaments = [];
  const currentMonth = universeManager.currentMonth;
  
  // Procurar nos próximos 3 meses
  for (let i = 0; i < 3; i++) {
    const month = ((currentMonth + i - 1) % 12) + 1;
    const monthConfig = universeManager.getCurrentMonthConfig?.();
    if (monthConfig) {
      const risingTournaments = monthConfig.tournaments?.filter(t => 
        t.tier === 'RISING_STAR' || t.tier === 'RISING_FINALS'
      ) || [];
      upcomingTournaments.push(...risingTournaments.map(t => ({ ...t, month })));
    }
  }
  
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
      {upcomingTournaments.slice(0, 3).map((tournament, idx) => (
        <div 
          key={idx}
          style={{
            padding: 16,
            background: 'rgba(255,215,0,0.05)',
            border: '1px solid rgba(255,215,0,0.15)',
            borderRadius: 6
          }}
        >
          <div style={{
            fontFamily: 'Rajdhani, sans-serif',
            fontSize: 13,
            fontWeight: 700,
            color: '#ffd700',
            marginBottom: 8
          }}>
            {tournament.name}
          </div>
          <div style={{
            display: 'flex',
            gap: 16,
            fontSize: 11,
            color: 'rgba(255,255,255,0.6)'
          }}>
            <div>
              <Users size={14} style={{ display: 'inline', marginRight: 4 }} />
              {tournament.participants} jogadores
            </div>
            <div>
              {tournament.matchFormat}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

// ============================================
// 📅 CALENDÁRIO MELHORADO VIEW
// ============================================

const EnhancedCalendarView = ({ universeManager, currentMonth, currentYear, onNavigate }) => {
  const monthConfig = universeManager.getCurrentMonthConfig();
  
  if (!monthConfig) {
    return <div>Carregando calendário...</div>;
  }
  
  return (
    <div style={{ animation: 'hub-entry .4s ease both' }}>
      {/* Header */}
      <div style={{
        marginBottom: 24,
        padding: '20px 24px',
        background: 'linear-gradient(135deg, rgba(100,100,255,.1) 0%, rgba(50,50,200,.05) 100%)',
        border: '1px solid rgba(100,100,255,.2)',
        borderRadius: 8
      }}>
        <div style={{
          fontFamily: 'Orbitron, monospace',
          fontSize: 24,
          fontWeight: 700,
          color: '#60a5fa',
          marginBottom: 8,
          display: 'flex',
          alignItems: 'center',
          gap: 12
        }}>
          <Calendar size={28} />
          CALENDÁRIO {currentYear}
        </div>
        <div style={{
          fontFamily: 'Rajdhani, sans-serif',
          fontSize: 13,
          color: 'rgba(255,255,255,0.6)'
        }}>
          {monthConfig.name} • {monthConfig.tournaments?.length || 0} torneios programados
        </div>
      </div>
      
      {/* Timeline dos Meses */}
      <MonthTimeline 
        currentMonth={currentMonth}
        currentYear={currentYear}
        universeManager={universeManager}
      />
      
      {/* Torneios do Mês */}
      <div style={{ marginTop: 24 }}>
        <div style={{
          fontFamily: 'Orbitron, monospace',
          fontSize: 16,
          fontWeight: 700,
          color: '#60a5fa',
          marginBottom: 16
        }}>
          🏆 TORNEIOS DE {monthConfig.name.toUpperCase()}
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {monthConfig.tournaments?.map((tournament, idx) => (
            <TournamentCard 
              key={idx}
              tournament={tournament}
              index={idx}
              universeManager={universeManager}
            />
          ))}
        </div>
      </div>
      
      {/* Resumo do Ano */}
      <YearSummary universeManager={universeManager} currentYear={currentYear} />
    </div>
  );
};

// Helper: Timeline de Meses
const MonthTimeline = ({ currentMonth, universeManager }) => {
  const months = [
    'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
    'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
  ];
  
  return (
    <div style={{
      display: 'flex',
      gap: 8,
      padding: '12px 0',
      borderBottom: '1px solid rgba(255,255,255,0.1)',
      marginBottom: 24
    }}>
      {months.map((month, idx) => {
        const monthNum = idx + 1;
        const isCurrent = monthNum === currentMonth;
        
        return (
          <div
            key={idx}
            style={{
              flex: 1,
              padding: '8px 12px',
              background: isCurrent ? 'rgba(100,100,255,0.2)' : 'rgba(255,255,255,0.03)',
              border: `1px solid ${isCurrent ? 'rgba(100,100,255,0.4)' : 'rgba(255,255,255,0.08)'}`,
              borderRadius: 4,
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              if (!isCurrent) {
                e.currentTarget.style.background = 'rgba(100,100,255,0.1)';
                e.currentTarget.style.borderColor = 'rgba(100,100,255,0.2)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isCurrent) {
                e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
              }
            }}
          >
            <div style={{
              fontFamily: 'Rajdhani, sans-serif',
              fontSize: 11,
              fontWeight: 700,
              color: isCurrent ? '#60a5fa' : 'rgba(255,255,255,0.6)'
            }}>
              {month}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// Helper: Card de Torneio
const TournamentCard = ({ tournament, index, universeManager }) => {
  const tierConfig = getTierConfig(tournament.tier);
  const isPremium = tierConfig.premium;
  const isMandatory = tournament.mandatory;
  
  return (
    <div 
      style={{
        padding: 20,
        background: isPremium 
          ? 'linear-gradient(135deg, rgba(255,215,0,.08) 0%, rgba(255,165,0,.05) 100%)'
          : 'rgba(255,255,255,0.03)',
        border: `2px solid ${isPremium ? 'rgba(255,215,0,.3)' : 'rgba(255,255,255,.08)'}`,
        borderRadius: 8,
        position: 'relative',
        overflow: 'hidden',
        animation: isPremium ? 'premium-glow 4s ease-in-out infinite' : 'none'
      }}
    >
      {/* Mandatory Badge */}
      {isMandatory && (
        <div style={{
          position: 'absolute',
          top: 12,
          right: 12,
          padding: '4px 8px',
          background: 'rgba(239,68,68,0.2)',
          border: '1px solid rgba(239,68,68,0.4)',
          borderRadius: 4,
          fontSize: 10,
          fontWeight: 700,
          color: '#ef4444'
        }}>
          OBRIGATÓRIO
        </div>
      )}
      
      {/* Tier Badge */}
      <div style={{
        display: 'inline-block',
        padding: '6px 12px',
        background: `${tierConfig.color}22`,
        border: `1px solid ${tierConfig.color}44`,
        borderRadius: 6,
        marginBottom: 12
      }}>
        <div style={{
          fontFamily: 'Orbitron, monospace',
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.1em',
          color: tierConfig.color
        }}>
          {tierConfig.label}
        </div>
      </div>
      
      {/* Nome do Torneio */}
      <div style={{
        fontFamily: 'Rajdhani, sans-serif',
        fontSize: 18,
        fontWeight: 700,
        color: 'rgba(255,255,255,0.9)',
        marginBottom: 16
      }}>
        {tournament.name}
      </div>
      
      {/* Informações */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: 12
      }}>
        <InfoItem 
          icon={<Users size={16} />}
          label="Participantes"
          value={`${tournament.participants} jogadores`}
        />
        <InfoItem 
          icon={<Trophy size={16} />}
          label="Formato"
          value={tournament.matchFormat}
        />
        <InfoItem 
          icon={<Award size={16} />}
          label="Pontos"
          value={`${tierConfig.points} pts`}
        />
        <InfoItem 
          icon={<Target size={16} />}
          label="Arenas"
          value={Array.isArray(tournament.arenas) 
            ? `${tournament.arenas.length} arenas`
            : tournament.arenas === 'ALL' ? 'Todas' : '1 arena'}
        />
      </div>
      
      {/* Arenas Específicas */}
      {Array.isArray(tournament.arenas) && (
        <div style={{
          marginTop: 12,
          padding: 12,
          background: 'rgba(0,0,0,0.2)',
          borderRadius: 4
        }}>
          <div style={{
            fontSize: 10,
            color: 'rgba(255,255,255,0.5)',
            marginBottom: 6
          }}>
            ARENAS
          </div>
          <div style={{
            fontSize: 11,
            color: 'rgba(255,255,255,0.7)'
          }}>
            {tournament.arenas.join(' • ')}
          </div>
        </div>
      )}
    </div>
  );
};

// Helper: Resumo do Ano
const YearSummary = ({ universeManager, currentYear }) => {
  // Calcular estatísticas
  const totalTournaments = 33; // Do CalendarConfig
  const premierCount = 4;
  const mastersCount = 10;
  const risingStarCount = 6;
  
  return (
    <div style={{
      marginTop: 32,
      padding: 20,
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 8
    }}>
      <div style={{
        fontFamily: 'Orbitron, monospace',
        fontSize: 14,
        fontWeight: 700,
        color: '#60a5fa',
        marginBottom: 16
      }}>
        📊 RESUMO DO ANO {currentYear}
      </div>
      
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: 12
      }}>
        <StatCard 
          icon={<Trophy size={20} />}
          label="Total de Torneios"
          value={totalTournaments}
          color="#60a5fa"
        />
        <StatCard 
          icon={<Star size={20} />}
          label="Premier Championships"
          value={`${premierCount} × MD5`}
          color="#ffd700"
        />
        <StatCard 
          icon={<Target size={20} />}
          label="Masters Clash"
          value={`${mastersCount} × MD3`}
          color="#f59e0b"
        />
        <StatCard 
          icon={<Flame size={20} />}
          label="Rising Star Events"
          value={risingStarCount + 1}
          color="#10b981"
        />
      </div>
    </div>
  );
};

// ============================================
// 🎨 HELPER COMPONENTS
// ============================================

const StatCard = ({ icon, label, value, color }) => (
  <div style={{
    padding: 16,
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 6
  }}>
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      marginBottom: 8,
      color
    }}>
      {icon}
      <div style={{
        fontFamily: 'Rajdhani, sans-serif',
        fontSize: 11,
        fontWeight: 600,
        color: 'rgba(255,255,255,0.6)',
        textTransform: 'uppercase'
      }}>
        {label}
      </div>
    </div>
    <div style={{
      fontFamily: 'Orbitron, monospace',
      fontSize: 20,
      fontWeight: 700,
      color: color
    }}>
      {value}
    </div>
  </div>
);

const InfoItem = ({ icon, label, value }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
    <div style={{ color: 'rgba(255,255,255,0.4)' }}>
      {icon}
    </div>
    <div>
      <div style={{
        fontSize: 10,
        color: 'rgba(255,255,255,0.4)',
        marginBottom: 2
      }}>
        {label}
      </div>
      <div style={{
        fontFamily: 'Rajdhani, sans-serif',
        fontSize: 12,
        fontWeight: 700,
        color: 'rgba(255,255,255,0.8)'
      }}>
        {value}
      </div>
    </div>
  </div>
);

// ============================================
// 🎯 HELPERS
// ============================================

const getPotentialColor = (category) => {
  const colors = {
    'GERACIONAL': '#ff00ff',
    'LENDA': '#ffd700',
    'ELITE': '#f59e0b',
    'CAMPEAO': '#60a5fa',
    'COMUM': '#94a3b8',
    'ABAIXO_DA_MEDIA': '#64748b'
  };
  return colors[category] || '#94a3b8';
};

const getTierConfig = (tier) => {
  const configs = {
    'KINGS_COURT':   { label: 'KINGS COURT',   color: '#ff00ff', premium: true,  points: 2500 },
    'PREMIER':       { label: 'PREMIER',        color: '#ffd700', premium: true,  points: 2000 },
    'SIGNATURE_CLASH': { label: "SIGNATURE CLASH", color: '#fde68a', premium: true, points: 1500 },
    'INVITATIONAL':  { label: 'INVITATIONAL',   color: '#fde68a', premium: true,  points: 1500 }, // legado
    'MASTERS':       { label: 'MASTERS CLASH',  color: '#f59e0b', premium: false, points: 1000 },
    'CHALLENGER':    { label: 'CHALLENGER',     color: '#60a5fa', premium: false, points: 500  },
    'OPEN':          { label: 'CROSSOVER OPEN', color: '#86efac', premium: false, points: 750  },
    'REDEMPTION':    { label: 'REDEMPTION',     color: '#94a3b8', premium: false, points: 250  },
    'RISING_STAR':   { label: 'RISING STAR',    color: '#10b981', premium: false, points: 200  },
    'RISING_FINALS': { label: 'RISING FINALS',  color: '#10b981', premium: true,  points: 400  },
  };
  return configs[tier] || { label: tier, color: '#94a3b8', premium: false, points: 0 };
};

const tableHeaderStyle = {
  padding: '12px 16px',
  fontFamily: 'Orbitron, monospace',
  fontSize: 11,
  fontWeight: 700,
  color: 'rgba(255,255,255,0.6)',
  textAlign: 'center',
  textTransform: 'uppercase',
  letterSpacing: '0.05em'
};

const tableCellStyle = {
  padding: '16px',
  fontFamily: 'Rajdhani, sans-serif',
  fontSize: 13,
  textAlign: 'center'
};

// ============================================
// 📤 EXPORTS
// ============================================

export { 
  RisingStarsView,
  EnhancedCalendarView
};

// ============================================
// 📋 INSTRUÇÕES DE INTEGRAÇÃO NO BROADCASTHUB
// ============================================
/*

1. ADICIONAR IMPORTS NO INÍCIO DO ARQUIVO:
   import { RisingStarsView, EnhancedCalendarView } from './BroadcastHub_UI_Additions.jsx';

2. ADICIONAR BOTÕES DE NAVEGAÇÃO NO MENU (procure por setCurrentView):
   <button onClick={() => setCurrentView('rising-stars')} ...>
     <Star size={16} />
     <span>Rising Stars</span>
   </button>

3. ADICIONAR VIEWS NO SWITCH (após as views existentes):
   {currentView === 'rising-stars' && <RisingStarsView universeManager={universeManager} onNavigate={onNavigate} />}
   {currentView === 'calendario' && <EnhancedCalendarView universeManager={universeManager} currentMonth={currentMonth} currentYear={currentYear} onNavigate={onNavigate} />}

*/
