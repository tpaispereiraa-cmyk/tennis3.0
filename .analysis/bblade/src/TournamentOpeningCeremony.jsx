// ====================================================================
// TOURNAMENT OPENING CEREMONY - Apresentação épica dos participantes
// ====================================================================

import React, { useState, useEffect } from 'react';
import { 
  Trophy, Zap, Shield, Infinity, Scale, 
  Swords, TrendingUp, Star, AlertCircle,
  ChevronRight, Play, SkipForward, X
} from 'lucide-react';
import PlayerImage from './PlayerImage';
import { TEAMS } from './data.js';

const TournamentOpeningCeremony = ({ 
  tournament,
  universeManager,
  onClose
}) => {
  const tournamentName = tournament?.name || 'Tournament';
  const tournamentParticipants = tournament?.participants || 64;
  
  // ✅ FIX: participantsList e rankingData passados pelo BroadcastHub
  const participants = tournament?.participantsList || [];
  const rankingData = tournament?.rankingData || [];
  
  console.log('🎬 Cerimônia iniciada');
  console.log('   Torneio:', tournamentName);
  console.log('   Participantes recebidos:', participants.length);
  console.log('   Ranking entries:', rankingData.length);
  
  const onComplete = onClose;
  const onSkip = onClose;
  
  // Fases: intro → ranking → parade → predictions → ready
  const [phase, setPhase] = useState('intro');
  const [currentParticipantIndex, setCurrentParticipantIndex] = useState(0);
  const [autoPlay, setAutoPlay] = useState(true);
  const [showDetails, setShowDetails] = useState(false);
  const [bracketFormed, setBracketFormed] = useState(false);
  const [predictions, setPredictions] = useState(null);

  // Auto-advance no modo auto-play
  useEffect(() => {
    // Fallback: se não há participantes mesmo após o fix, ainda mostra intro (não pula)
    // A intro sempre aparece - o botão START TOURNAMENT leva para parade (ou ready se sem participantes)
    if (participants.length === 0 && phase === 'parade') {
      console.log('   🔧 Sem participantes na parade - indo para ready');
      setPhase('ready');
      return;
    }
    
    if (phase === 'parade' && autoPlay && participants.length > 0) {
      const timer = setTimeout(() => {
        if (currentParticipantIndex < participants.length - 1) {
          setCurrentParticipantIndex(currentParticipantIndex + 1);
        } else {
          setPhase('bracket');
        }
      }, 2000); // 2 segundos por participante
      
      return () => clearTimeout(timer);
    }
  }, [phase, currentParticipantIndex, autoPlay, participants.length]);

  // Gerar predictions quando chegar na fase
  useEffect(() => {
    if (phase === 'predictions' && !predictions && participants.length > 0) {
      const pred = generatePredictions(participants);
      setPredictions(pred);
    }
  }, [phase, participants, predictions]);

  // ====================================================================
  // INTRO PHASE - Animação de abertura
  // ====================================================================
  
  if (phase === 'intro') {
    return (
      <div className="tournament-ceremony-overlay">
        <div className="ceremony-intro">
          {/* Background animado */}
          <div className="ceremony-background">
            <div className="energy-particles"></div>
            <div className="radial-glow"></div>
          </div>

          {/* Conteúdo central */}
          <div className="intro-content">
            <div className="tournament-logo-reveal">
              <div className="logo-glow"></div>
              <Trophy className="logo-icon" size={120} />
            </div>
            
            <h1 className="tournament-title-reveal">
              {tournamentName}
            </h1>
            
            <div className="tournament-stats-reveal">
              <div className="stat-item">
                <Swords size={24} />
                <div>
                  <div className="stat-value">{tournamentParticipants}</div>
                  <div className="stat-label">WARRIORS</div>
                </div>
              </div>
              <div className="stat-divider"></div>
              <div className="stat-item">
                <Zap size={24} />
                <div>
                  <div className="stat-value">{tournamentParticipants * 5}</div>
                  <div className="stat-label">BEYBLADES</div>
                </div>
              </div>
              <div className="stat-divider"></div>
              <div className="stat-item">
                <Trophy size={24} />
                <div>
                  <div className="stat-value">1</div>
                  <div className="stat-label">CHAMPION</div>
                </div>
              </div>
            </div>

            <button 
              className="begin-ceremony-btn"
              onClick={() => setPhase(rankingData.length > 0 ? 'ranking' : participants.length > 0 ? 'parade' : 'ready')}
            >
              <Play size={20} />
              START TOURNAMENT
            </button>

            <button 
              className="skip-ceremony-btn"
              onClick={onSkip}
            >
              <SkipForward size={16} />
              Skip to Tournament
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ====================================================================
  // PARADE PHASE - Apresentação dos participantes
  // ====================================================================
  
  if (phase === 'parade') {
    const participant = participants[currentParticipantIndex];
    
    // Verificação de segurança
    if (!participant) {
      setPhase('bracket');
      return null;
    }
    
    const progress = ((currentParticipantIndex + 1) / participants.length) * 100;

    return (
      <div className="tournament-ceremony-overlay">
        {/* Progress bar */}
        <div className="ceremony-progress-bar">
          <div className="progress-fill" style={{ width: `${progress}%` }}></div>
          <div className="progress-text">
            Participant {currentParticipantIndex + 1} of {participants.length}
          </div>
        </div>

        {/* Skip button */}
        <button className="ceremony-skip-btn" onClick={onSkip}>
          <SkipForward size={20} />
        </button>

        {/* Auto-play toggle */}
        <button 
          className="ceremony-autoplay-btn"
          onClick={() => setAutoPlay(!autoPlay)}
        >
          {autoPlay ? '⏸️ Pause' : '▶️ Auto'}
        </button>

        {/* Main content */}
        <div className="parade-container">
          <ParticipantCard 
            participant={participant}
            index={currentParticipantIndex}
            onNext={() => {
              if (currentParticipantIndex < participants.length - 1) {
                setCurrentParticipantIndex(currentParticipantIndex + 1);
              } else {
                setPhase('bracket');
              }
            }}
            onShowDetails={() => setShowDetails(true)}
          />
        </div>

        {/* Navigation */}
        <div className="parade-navigation">
          <button 
            onClick={() => setCurrentParticipantIndex(Math.max(0, currentParticipantIndex - 1))}
            disabled={currentParticipantIndex === 0}
            className="nav-btn"
          >
            ← Previous
          </button>
          <button 
            onClick={() => {
              if (currentParticipantIndex < participants.length - 1) {
                setCurrentParticipantIndex(currentParticipantIndex + 1);
              } else {
                setPhase('bracket');
              }
            }}
            className="nav-btn primary"
          >
            {currentParticipantIndex < participants.length - 1 ? 'Next →' : 'Form Bracket →'}
          </button>
        </div>

        {/* Details modal */}
        {showDetails && (
          <ParticipantDetailsModal 
            participant={participant}
            onClose={() => setShowDetails(false)}
          />
        )}
      </div>
    );
  }

  // ====================================================================
  // RANKING PHASE - Power Ranking dos participantes
  // ====================================================================

  if (phase === 'ranking') {
    const tierColors = { 1: '#fbbf24', 2: '#e2e8f0', 3: '#f97316' };
    const tierBg    = { 1: 'rgba(251,191,36,0.15)', 2: 'rgba(226,232,240,0.08)', 3: 'rgba(249,115,22,0.12)' };

    return (
      <div className="tournament-ceremony-overlay">
        <button className="ceremony-skip-btn" onClick={onSkip} style={{ position:'absolute', top:16, right:16, zIndex:10 }}>
          <SkipForward size={20} />
        </button>

        <div style={{ maxWidth: 720, margin: '0 auto', padding: '2rem 1rem', width: '100%' }}>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
              <TrendingUp size={28} color="#fbbf24" />
              <h2 style={{ fontSize: '1.75rem', fontWeight: 900, color: '#fbbf24', margin: 0, letterSpacing: 2 }}>
                BBP POWER RANKING
              </h2>
            </div>
            <p style={{ color: '#94a3b8', margin: 0, fontSize: '0.875rem' }}>
              {tournamentName} — Classificação de entrada
            </p>
          </div>

          {/* Lista de ranking */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: '60vh', overflowY: 'auto', paddingRight: '0.25rem' }}>
            {rankingData.map((entry, idx) => {
              const team = TEAMS[entry.playerId];
              if (!team) return null;
              const pos = idx + 1;
              const isTop3 = pos <= 3;
              const medal = ['🥇', '🥈', '🥉'][idx] || null;
              const isParticipant = participants.some(p => p.id === entry.playerId || p.teamIndex === entry.playerId);

              return (
                <div
                  key={entry.playerId}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: isTop3 ? '0.75rem 1rem' : '0.5rem 1rem',
                    borderRadius: 10,
                    background: isTop3 ? tierBg[pos] : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${isTop3 ? tierColors[pos] : isParticipant ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.06)'}`,
                    opacity: isParticipant ? 1 : 0.45,
                    transition: 'all 0.2s',
                  }}
                >
                  {/* Posição */}
                  <div style={{ width: 32, textAlign: 'center', flexShrink: 0 }}>
                    {medal
                      ? <span style={{ fontSize: isTop3 ? '1.4rem' : '1rem' }}>{medal}</span>
                      : <span style={{ color: '#64748b', fontWeight: 700, fontSize: '0.85rem' }}>#{pos}</span>
                    }
                  </div>

                  {/* Ícone do jogador */}
                  <div style={{ flexShrink: 0 }}>
                    <PlayerImage player={team} type="icon" size={isTop3 ? 'md' : 'sm'} showBorder borderColor={isTop3 ? tierColors[pos] : undefined} />
                  </div>

                  {/* Nome + país */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, color: isTop3 ? tierColors[pos] : '#e2e8f0', fontSize: isTop3 ? '1rem' : '0.875rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {team.name}
                    </div>
                    <div style={{ color: '#64748b', fontSize: '0.75rem' }}>{team.country || ''}</div>
                  </div>

                  {/* BBP Points */}
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontWeight: 900, color: isTop3 ? tierColors[pos] : '#94a3b8', fontSize: isTop3 ? '1.1rem' : '0.9rem' }}>
                      {entry.points.toLocaleString()}
                    </div>
                    <div style={{ color: '#475569', fontSize: '0.7rem' }}>BBP PTS</div>
                  </div>

                  {/* Badge de participante */}
                  {isParticipant && (
                    <div style={{ background: 'rgba(99,102,241,0.2)', border: '1px solid rgba(99,102,241,0.5)', borderRadius: 6, padding: '0.15rem 0.5rem', fontSize: '0.65rem', fontWeight: 700, color: '#818cf8', flexShrink: 0 }}>
                      INSCRITO
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Botão continuar */}
          <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
            <button
              className="begin-ceremony-btn"
              onClick={() => setPhase(participants.length > 0 ? 'parade' : 'ready')}
            >
              <Swords size={18} />
              VER PARTICIPANTES
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ====================================================================
  // BRACKET PHASE - Formação do bracket
  // ====================================================================
  
  if (phase === 'bracket') {
    return (
      <div className="tournament-ceremony-overlay">
        <div className="bracket-formation">
          <h2 className="bracket-title">
            <Swords size={32} />
            BRACKET FORMATION
          </h2>

          {!bracketFormed ? (
            <div className="bracket-animation">
              <div className="shuffling-cards">
                {participants.map((p, i) => (
                  <div 
                    key={i}
                    className="shuffle-card"
                    style={{ animationDelay: `${i * 0.1}s` }}
                  >
                    {p.name}
                  </div>
                ))}
              </div>
              
              <button 
                className="draw-bracket-btn"
                onClick={() => {
                  setBracketFormed(true);
                  setTimeout(() => setPhase('predictions'), 2000);
                }}
              >
                <Zap size={20} />
                DRAW MATCHUPS
              </button>
            </div>
          ) : (
            <div className="bracket-grid">
              <BracketDisplay participants={participants} />
            </div>
          )}
        </div>
      </div>
    );
  }

  // ====================================================================
  // PREDICTIONS PHASE - Análise da IA
  // ====================================================================
  
  if (phase === 'predictions') {
    return (
      <div className="tournament-ceremony-overlay">
        <div className="predictions-panel">
          <h2 className="predictions-title">
            <TrendingUp size={32} />
            AI TOURNAMENT ANALYSIS
          </h2>

          {predictions && (
            <div className="predictions-content">
              {/* Favorites */}
              <div className="prediction-section">
                <h3>🏆 FAVORITES TO WIN</h3>
                <div className="favorites-list">
                  {predictions.favorites.map((fav, i) => (
                    <div key={i} className="favorite-item" style={{ animationDelay: `${i * 0.2}s` }}>
                      <div className="rank-medal">{['🥇', '🥈', '🥉'][i]}</div>
                      <div style={{ marginLeft: '0.5rem', marginRight: '0.75rem' }}>
                        <PlayerImage 
                          player={fav.player}
                          type="icon"
                          size="md"
                          showBorder={true}
                          borderColor={fav.player.colors?.[0]}
                        />
                      </div>
                      <div className="favorite-info">
                        <div className="favorite-name">{fav.name}</div>
                        <div className="favorite-chance">{fav.chance}% win chance</div>
                      </div>
                      <div className="favorite-power">{fav.power} PWR</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Dark Horses */}
              <div className="prediction-section">
                <h3>🌟 DARK HORSES</h3>
                <div className="dark-horses-list">
                  {predictions.darkHorses.map((dh, i) => (
                    <div key={i} className="dark-horse-item">
                      <Star size={20} className="star-icon" />
                      <div className="dark-horse-info">
                        <div className="dark-horse-name">{dh.name}</div>
                        <div className="dark-horse-reason">{dh.reason}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Spicy Matchup */}
              {predictions.spicyMatchup && (
                <div className="prediction-section spicy">
                  <h3>🔥 MATCHUP TO WATCH</h3>
                  <div className="spicy-matchup">
                    <div className="matchup-fighters">
                      <span className="fighter">{predictions.spicyMatchup.player1}</span>
                      <span className="vs">VS</span>
                      <span className="fighter">{predictions.spicyMatchup.player2}</span>
                    </div>
                    <div className="matchup-description">
                      {predictions.spicyMatchup.description}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <button 
            className="start-tournament-btn"
            onClick={() => setPhase('ready')}
          >
            <Trophy size={24} />
            START TOURNAMENT
          </button>
        </div>
      </div>
    );
  }

  // ====================================================================
  // READY PHASE - Transição final
  // ====================================================================
  
  if (phase === 'ready') {
    setTimeout(() => onComplete(), 2000);
    
    return (
      <div className="tournament-ceremony-overlay">
        <div className="ready-screen">
          <div className="ready-pulse">
            <Zap size={100} />
          </div>
          <h1 className="ready-text">LET THE BATTLES BEGIN!</h1>
        </div>
      </div>
    );
  }

  return null;
};

// ====================================================================
// PARTICIPANT CARD - Card individual do participante
// ====================================================================

const ParticipantCard = ({ participant, index, onNext, onShowDetails }) => {
  const deck = participant.deck || generateDummyDeck();
  const stats = calculateParticipantStats(participant);

  return (
    <div className="participant-card">
      {/* Header com nome e número */}
      <div className="card-header">
        <div className="participant-number">#{index + 1}</div>
        <div className="participant-name-section">
          <h2 className="participant-name">{participant.name}</h2>
          <div className="participant-subtitle">
            {participant.region || 'Unknown Region'} • {participant.rank ? `Rank #${participant.rank}` : 'Unranked'}
          </div>
        </div>
        <div className="participant-tier-badge">
          {getTierBadge(participant.tier)}
        </div>
      </div>

      {/* ⭐ NOVO - Imagem grande do jogador (corpo inteiro) */}
      <div className="participant-image-section" style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '2rem',
        background: `linear-gradient(180deg, ${participant.colors?.[0] || '#3B82F6'}20 0%, transparent 100%)`,
        position: 'relative',
        minHeight: '400px'
      }}>
        {/* Glow effect circular */}
        <div style={{
          position: 'absolute',
          width: '300px',
          height: '300px',
          borderRadius: '50%',
          background: `radial-gradient(circle, ${participant.colors?.[0] || '#3B82F6'}40 0%, transparent 70%)`,
          animation: 'pulse 3s ease-in-out infinite'
        }} />
        
        {/* Imagem do jogador */}
        <div style={{ position: 'relative', zIndex: 2 }}>
          <PlayerImage 
            player={participant}
            type="full"
            size="xl"
            showBorder={true}
            borderColor={participant.colors?.[0] || '#3B82F6'}
          />
        </div>
      </div>

      {/* Deck Grid - 5 Beyblades */}
      <div className="deck-section">
        <h3 className="section-title">
          <Zap size={18} />
          DECK LINEUP
        </h3>
        <div className="deck-grid">
          {deck.slice(0, 5).map((bey, i) => (
            <BeybladeCard key={i} beyblade={bey} position={i + 1} />
          ))}
        </div>
      </div>

      {/* Stats Radar */}
      <div className="stats-section">
        <h3 className="section-title">
          <TrendingUp size={18} />
          POWER ANALYSIS
        </h3>
        <div className="stats-display">
          <div className="stat-bars">
            <StatBar label="Attack" value={stats.attack} color="#ef4444" icon="⚔️" />
            <StatBar label="Defense" value={stats.defense} color="#3b82f6" icon="🛡️" />
            <StatBar label="Stamina" value={stats.stamina} color="#10b981" icon="♾️" />
            <StatBar label="Balance" value={stats.balance} color="#f59e0b" icon="⚖️" />
          </div>
          <div className="power-level">
            <div className="power-label">TOTAL POWER</div>
            <div className="power-value">{stats.totalPower}</div>
            <div className="power-rank">{getPowerRank(stats.totalPower)}</div>
          </div>
        </div>
      </div>

      {/* Specialty */}
      <div className="specialty-section">
        <h3 className="section-title">
          <Star size={18} />
          SPECIALTY
        </h3>
        <div className="specialty-tag">
          {stats.specialty}
        </div>
      </div>

      {/* Action buttons */}
      <div className="card-actions">
        <button className="details-btn" onClick={onShowDetails}>
          View Full Stats
        </button>
        <button className="next-btn" onClick={onNext}>
          Next Warrior
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
};

// ====================================================================
// BEYBLADE CARD - Mini card de beyblade
// ====================================================================

const BeybladeCard = ({ beyblade, position }) => {
  const typeColors = {
    'Attack': '#ef4444',
    'Defense': '#3b82f6',
    'Stamina': '#10b981',
    'Balance': '#f59e0b'
  };

  const typeIcons = {
    'Attack': '⚔️',
    'Defense': '🛡️',
    'Stamina': '♾️',
    'Balance': '⚖️'
  };

  return (
    <div 
      className="beyblade-mini-card"
      style={{ 
        borderColor: typeColors[beyblade.type] || '#94a3b8',
        animationDelay: `${position * 0.1}s`
      }}
    >
      <div className="bey-position">#{position}</div>
      <div className="bey-icon" style={{ color: typeColors[beyblade.type] }}>
        {typeIcons[beyblade.type] || '⚖️'}
      </div>
      <div className="bey-name">{beyblade.name}</div>
      <div className="bey-type" style={{ color: typeColors[beyblade.type] }}>
        {beyblade.type}
      </div>
      {beyblade.stats && (
        <div className="bey-power-mini">
          PWR: {Math.round((beyblade.stats.atk + beyblade.stats.def + beyblade.stats.spin) / 3)}
        </div>
      )}
    </div>
  );
};

// ====================================================================
// STAT BAR - Barra de estatística
// ====================================================================

const StatBar = ({ label, value, color, icon }) => {
  return (
    <div className="stat-bar-container">
      <div className="stat-bar-label">
        <span className="stat-icon">{icon}</span>
        {label}
      </div>
      <div className="stat-bar-track">
        <div 
          className="stat-bar-fill"
          style={{ 
            width: `${value}%`,
            backgroundColor: color,
            boxShadow: `0 0 10px ${color}60`
          }}
        ></div>
      </div>
      <div className="stat-bar-value">{value}</div>
    </div>
  );
};

// ====================================================================
// BRACKET DISPLAY - Exibição do bracket
// ====================================================================

const BracketDisplay = ({ participants }) => {
  // Simples grid de matchups
  const matchups = [];
  for (let i = 0; i < participants.length; i += 2) {
    matchups.push([participants[i], participants[i + 1]]);
  }

  return (
    <div className="bracket-matchups">
      <h3>FIRST ROUND MATCHUPS</h3>
      <div className="matchups-grid">
        {matchups.map((matchup, i) => (
          <div key={i} className="matchup-card" style={{ animationDelay: `${i * 0.1}s` }}>
            <div className="matchup-number">R1 Match {i + 1}</div>
            <div className="matchup-fighters">
              <div className="fighter-slot" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem' }}>
                {matchup[0] && (
                  <>
                    <PlayerImage 
                      player={matchup[0]}
                      type="icon"
                      size="sm"
                      showBorder={true}
                      borderColor={matchup[0].colors?.[0]}
                    />
                    <span>{matchup[0].name}</span>
                  </>
                )}
                {!matchup[0] && <span>BYE</span>}
              </div>
              <div className="matchup-vs">VS</div>
              <div className="fighter-slot" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem', justifyContent: 'flex-end' }}>
                {matchup[1] && (
                  <>
                    <span>{matchup[1].name}</span>
                    <PlayerImage 
                      player={matchup[1]}
                      type="icon"
                      size="sm"
                      showBorder={true}
                      borderColor={matchup[1].colors?.[0]}
                    />
                  </>
                )}
                {!matchup[1] && <span>BYE</span>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ====================================================================
// PARTICIPANT DETAILS MODAL
// ====================================================================

const ParticipantDetailsModal = ({ participant, onClose }) => {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content participant-details-modal" onClick={e => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={onClose}>
          <X size={24} />
        </button>
        
        <h2>{participant.name}</h2>
        <div className="details-grid">
          <div className="detail-item">
            <strong>Region:</strong> {participant.region || 'Unknown'}
          </div>
          <div className="detail-item">
            <strong>Rank:</strong> #{participant.rank || 'Unranked'}
          </div>
          <div className="detail-item">
            <strong>Tier:</strong> {participant.tier || 'Amateur'}
          </div>
          {participant.wins !== undefined && (
            <div className="detail-item">
              <strong>Record:</strong> {participant.wins}W - {participant.losses || 0}L
            </div>
          )}
        </div>
        
        <div className="deck-full-view">
          <h3>Full Deck</h3>
          {(participant.deck || generateDummyDeck()).map((bey, i) => (
            <div key={i} className="deck-item-detail">
              <span>#{i + 1}</span>
              <span>{bey.name}</span>
              <span>{bey.type}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ====================================================================
// HELPER FUNCTIONS
// ====================================================================

function getTierBadge(tier) {
  const badges = {
    'S': '💎 S-TIER',
    'A': '⭐ A-TIER',
    'B': '🌟 B-TIER',
    'C': '✨ C-TIER',
    'Amateur': '🔰 AMATEUR'
  };
  return badges[tier] || '🔰 ROOKIE';
}

function generateDummyDeck() {
  const types = ['Attack', 'Defense', 'Stamina', 'Balance'];
  const names = ['Dragoon', 'Dranzer', 'Driger', 'Draciel', 'Wolborg'];
  
  return names.map((name, i) => ({
    name: `${name} ${['Storm', 'Blaze', 'Fang', 'Fortress', 'Ice'][i]}`,
    type: types[i % types.length],
    stats: {
      atk: Math.floor(Math.random() * 40) + 60,
      def: Math.floor(Math.random() * 40) + 60,
      spin: Math.floor(Math.random() * 40) + 60
    }
  }));
}

function calculateParticipantStats(participant) {
  const deck = participant.deck || generateDummyDeck();
  
  let totalAtk = 0, totalDef = 0, totalSpin = 0;
  deck.forEach(bey => {
    if (bey.stats) {
      totalAtk += bey.stats.atk || 70;
      totalDef += bey.stats.def || 70;
      totalSpin += bey.stats.spin || 70;
    }
  });

  const attack = Math.round(totalAtk / deck.length);
  const defense = Math.round(totalDef / deck.length);
  const stamina = Math.round(totalSpin / deck.length);
  const balance = Math.round((attack + defense + stamina) / 3);
  const totalPower = Math.round((attack + defense + stamina) * 3.5);

  let specialty = 'Balanced Fighter';
  if (attack > defense && attack > stamina) specialty = 'Aggressive Attacker';
  else if (defense > attack && defense > stamina) specialty = 'Iron Wall Defender';
  else if (stamina > attack && stamina > defense) specialty = 'Endurance Specialist';

  return { attack, defense, stamina, balance, totalPower, specialty };
}

function getPowerRank(power) {
  if (power >= 800) return 'S-RANK';
  if (power >= 700) return 'A-RANK';
  if (power >= 600) return 'B-RANK';
  if (power >= 500) return 'C-RANK';
  return 'D-RANK';
}

function generatePredictions(participants) {
  // Verificação de segurança
  if (!participants || participants.length === 0) {
    return {
      favorites: [],
      darkHorses: [],
      spicyMatchup: { player1: '', player2: '', description: '' }
    };
  }
  
  // Calcular poder de cada participante
  const withPower = participants.map(p => ({
    ...p,
    power: calculateParticipantStats(p).totalPower
  }));

  // Ordenar por poder
  const sorted = [...withPower].sort((a, b) => b.power - a.power);

  // Top 3 favoritos
  const favorites = sorted.slice(0, 3).map((p, i) => ({
    name: p.name,
    player: p, // ⭐ ADICIONADO - objeto completo do player para usar na imagem
    power: p.power,
    chance: [35, 25, 18][i]
  }));

  // Dark horses (4º ao 6º lugar)
  const darkHorses = sorted.slice(3, 6).map(p => ({
    name: p.name,
    reason: 'Unpredictable playstyle could surprise top seeds'
  }));

  // Spicy matchup (potencial rivalidade)
  const spicyMatchup = {
    player1: sorted[0]?.name,
    player2: sorted[1]?.name,
    description: 'Battle of the titans! These two powerhouses are destined to clash.'
  };

  return { favorites, darkHorses, spicyMatchup };
}

export default TournamentOpeningCeremony;
