// ============================================================
// TOURNAMENT OPENING CEREMONY — EDIÇÃO MONUMENTAL
// Cerimônia de abertura cinematográfica com análises profundas
// ============================================================

import React, { useState, useEffect } from 'react';
import { TEAMS } from './data.js';
import PlayerImage from './PlayerImage.jsx';

// ── Helpers ──────────────────────────────────────────────────
const normalizeId = id => String(id ?? '').replace(/_pos\d+$/, '');
const getTeam = id => TEAMS[parseInt(normalizeId(id))] || TEAMS[normalizeId(id)] || null;
const getName = id => getTeam(id)?.name || `Player ${id}`;
const getCountry = id => getTeam(id)?.country || '';
const getFullBody = id => getTeam(id)?.fullBodyUrl || null;
const getIcon = id => getTeam(id)?.iconUrl || null;

// ── Design System ────────────────────────────────────────────
const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Black+Ops+One&family=Rajdhani:wght@400;600;700&family=Orbitron:wght@400;700;900&display=swap');

  @keyframes toc-scan { 0%{transform:translateY(-100%)} 100%{transform:translateY(100vh)} }
  @keyframes toc-pulse { 0%,100%{opacity:.5;transform:scale(1)} 50%{opacity:1;transform:scale(1.05)} }
  @keyframes toc-glow { 0%,100%{box-shadow:0 0 40px rgba(255,215,0,.3)} 50%{box-shadow:0 0 80px rgba(255,215,0,.6)} }
  @keyframes toc-slide-in { 0%{opacity:0;transform:translateX(-60px)} 100%{opacity:1;transform:translateX(0)} }
  @keyframes toc-slide-up { 0%{opacity:0;transform:translateY(40px)} 100%{opacity:1;transform:translateY(0)} }
  @keyframes toc-fade-in { 0%{opacity:0} 100%{opacity:1} }
  @keyframes toc-shimmer { 0%{transform:translateX(-100%)} 100%{transform:translateX(100%)} }
  @keyframes toc-float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
  @keyframes toc-spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
  @keyframes toc-beam { 0%{height:0;opacity:0} 50%{height:100%;opacity:.4} 100%{height:100%;opacity:0} }

  .toc-root { font-family:'Rajdhani',sans-serif; }
  .toc-root * { box-sizing:border-box; }

  .toc-title { font-family:'Black Ops One',cursive; }
  .toc-label { font-family:'Orbitron',monospace; font-size:10px; letter-spacing:.2em; font-weight:700; }
  .toc-stat { font-family:'Orbitron',monospace; }

  .toc-card {
    background:rgba(255,255,255,.03);
    border:1px solid rgba(255,255,255,.08);
    clip-path:polygon(12px 0%, 100% 0%, calc(100% - 12px) 100%, 0% 100%);
    transition:border-color .25s ease;
  }
  .toc-card:hover { border-color:rgba(255,215,0,.25); }

  .toc-bey-card {
    background:rgba(255,255,255,.04);
    border:1px solid rgba(255,255,255,.1);
    clip-path:polygon(8px 0%, 100% 0%, calc(100% - 8px) 100%, 0% 100%);
    transition:all .2s ease;
  }
  .toc-bey-card:hover {
    border-color:rgba(255,215,0,.4);
    background:rgba(255,255,255,.07);
    transform:translateY(-3px);
  }

  .toc-scan-line {
    position:absolute;
    width:100%;
    height:2px;
    background:linear-gradient(90deg,transparent,#ffd700,transparent);
    box-shadow:0 0 20px rgba(255,215,0,.6);
    animation:toc-scan 3s linear infinite;
    pointer-events:none;
  }

  .toc-shimmer-overlay {
    position:absolute;
    inset:0;
    background:linear-gradient(90deg,transparent,rgba(255,255,255,.12),transparent);
    animation:toc-shimmer 3s ease-in-out infinite;
    pointer-events:none;
  }

  .toc-glow-pulse { animation:toc-glow 3s ease-in-out infinite; }
  .toc-float { animation:toc-float 3s ease-in-out infinite; }
  
  .toc-slide-in { animation:toc-slide-in .6s cubic-bezier(.22,1,.36,1) forwards; }
  .toc-slide-up { animation:toc-slide-up .6s cubic-bezier(.22,1,.36,1) forwards; }
  .toc-fade-in { animation:toc-fade-in .8s ease forwards; }

  .toc-beam {
    position:absolute;
    top:0;
    width:3px;
    background:linear-gradient(180deg,transparent,rgba(255,215,0,.6),transparent);
    animation:toc-beam 2s ease-in-out infinite;
    pointer-events:none;
  }

  .toc-stat-bar {
    height:6px;
    background:rgba(255,255,255,.08);
    border-radius:3px;
    overflow:hidden;
    position:relative;
  }
  .toc-stat-fill {
    height:100%;
    transition:width 1s cubic-bezier(.22,1,.36,1);
    position:relative;
    overflow:hidden;
  }
  .toc-stat-fill::after {
    content:'';
    position:absolute;
    inset:0;
    background:linear-gradient(90deg,transparent,rgba(255,255,255,.25),transparent);
    animation:toc-shimmer 2s ease infinite;
  }

  .tier-elite { color:#ffd700; }
  .tier-top { color:#c084fc; }
  .tier-pro { color:#60a5fa; }
  .tier-rising { color:#4ade80; }

  .toc-skip-btn {
    font-family:'Orbitron',monospace;
    font-size:11px;
    font-weight:700;
    letter-spacing:.15em;
    padding:12px 24px;
    background:rgba(255,255,255,.05);
    border:1px solid rgba(255,255,255,.15);
    color:rgba(255,255,255,.6);
    cursor:pointer;
    clip-path:polygon(8px 0%, 100% 0%, calc(100% - 8px) 100%, 0% 100%);
    transition:all .2s ease;
  }
  .toc-skip-btn:hover {
    background:rgba(255,255,255,.1);
    border-color:rgba(255,215,0,.4);
    color:#ffd700;
    transform:translateX(3px);
  }
`;

// ── Beyblade Type Info ───────────────────────────────────────
const BEY_TYPES = {
  Attack:  { icon:'⚔️', color:'#f87171', bg:'rgba(248,113,113,.15)' },
  Defense: { icon:'🛡️', color:'#60a5fa', bg:'rgba(96,165,250,.15)' },
  Stamina: { icon:'♾️', color:'#4ade80', bg:'rgba(74,222,128,.15)' },
  Balance: { icon:'⚖️', color:'#c084fc', bg:'rgba(192,132,252,.15)' },
};


// ── Featured Player Card Component ──────────────────────────
const FeaturedPlayerCard = ({ player, reason, analysis, stats, beyblades, delay }) => {
  const team = getTeam(player.playerId);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  if (!visible) return null;

  const tierColors = {
    ELITE: '#ffd700',
    TOP: '#c084fc',
    PRO: '#60a5fa',
    RISING: '#4ade80'
  };

  const tierColor = tierColors[team?.tier] || '#94a3b8';

  return (
    <div className="toc-slide-in" style={{ animationDelay:`${delay}ms` }}>
      <div style={{
        position:'absolute',
        inset:'-100px',
        background:`radial-gradient(circle at 50% 50%, ${tierColor}15 0%, transparent 70%)`,
        pointerEvents:'none',
        zIndex:0
      }} />

      <div style={{
        position:'relative',
        padding:'48px 64px',
        minHeight:'100vh',
        display:'flex',
        alignItems:'center',
        justifyContent:'center',
        gap:64
      }}>
        <div className="toc-scan-line" style={{ animationDelay:'0s' }} />
        <div className="toc-scan-line" style={{ animationDelay:'1s', opacity:.5 }} />
        <div className="toc-scan-line" style={{ animationDelay:'2s', opacity:.3 }} />

        {/* Left Side - Player Visual */}
        <div className="toc-slide-in" style={{
          flex:'0 0 450px',
          display:'flex',
          flexDirection:'column',
          gap:24,
          animationDelay:`${delay + 200}ms`
        }}>
          <div className="toc-fade-in" style={{
            display:'inline-flex',
            alignItems:'center',
            gap:12,
            padding:'12px 24px',
            background:`linear-gradient(135deg, ${tierColor}22, ${tierColor}08)`,
            border:`1px solid ${tierColor}55`,
            borderRadius:8,
            animationDelay:`${delay + 100}ms`
          }}>
            <span style={{ fontSize:24 }}>{reason.icon}</span>
            <div>
              <div className="toc-label" style={{ color:tierColor, marginBottom:2 }}>{reason.category}</div>
              <div style={{ fontSize:13, color:'rgba(255,255,255,.6)' }}>{reason.subtitle}</div>
            </div>
          </div>

          <div className="toc-card toc-glow-pulse" style={{
            position:'relative',
            padding:32,
            background:`linear-gradient(135deg, ${tierColor}12, rgba(255,255,255,.03))`,
            border:`1px solid ${tierColor}44`,
            overflow:'hidden'
          }}>
            <div className="toc-shimmer-overlay" />
            
            <div style={{ position:'relative', zIndex:1 }}>
              {getFullBody(player.playerId) && (
                <img 
                  src={getFullBody(player.playerId)} 
                  alt={getName(player.playerId)}
                  style={{
                    width:'100%',
                    height:500,
                    objectFit:'contain',
                    objectPosition:'center bottom',
                    filter:`drop-shadow(0 0 40px ${tierColor}66)`
                  }}
                />
              )}
            </div>

            <div style={{
              position:'absolute',
              top:24,
              right:24,
              padding:'8px 16px',
              background:tierColor,
              color:'#000',
              fontFamily:'Orbitron,monospace',
              fontSize:10,
              fontWeight:900,
              letterSpacing:'.2em',
              clipPath:'polygon(8px 0%, 100% 0%, calc(100% - 8px) 100%, 0% 100%)',
              boxShadow:`0 0 30px ${tierColor}88`
            }}>
              {team?.tier || 'PRO'}
            </div>

            <div className="toc-beam" style={{ left:'20%', animationDelay:'0s' }} />
            <div className="toc-beam" style={{ left:'80%', animationDelay:'.7s' }} />
          </div>
        </div>

        {/* Right Side - Stats & Analysis */}
        <div className="toc-slide-up" style={{
          flex:1,
          display:'flex',
          flexDirection:'column',
          gap:32,
          animationDelay:`${delay + 400}ms`
        }}>
          <div>
            <div className="toc-title" style={{
              fontSize:'clamp(36px, 4vw, 56px)',
              lineHeight:1.1,
              background:`linear-gradient(135deg, #fff 0%, ${tierColor} 80%)`,
              WebkitBackgroundClip:'text',
              WebkitTextFillColor:'transparent',
              marginBottom:16,
              filter:`drop-shadow(0 0 20px ${tierColor}55)`
            }}>
              {getName(player.playerId)}
            </div>

            <div style={{ display:'flex', alignItems:'center', gap:24, marginBottom:8 }}>
              <div style={{ fontSize:32, lineHeight:1 }}>{getCountry(player.playerId)}</div>
              <div style={{
                display:'flex',
                alignItems:'center',
                gap:8,
                padding:'8px 20px',
                background:`${tierColor}22`,
                border:`1px solid ${tierColor}44`,
                borderRadius:6
              }}>
                <span style={{ fontSize:20 }}>📊</span>
                <span className="toc-label" style={{ color:tierColor }}>RANK</span>
                <span className="toc-stat" style={{ fontSize:28, fontWeight:900, color:'#fff' }}>
                  #{player.rank}
                </span>
              </div>
              <div style={{
                display:'flex',
                alignItems:'center',
                gap:8,
                padding:'8px 20px',
                background:'rgba(255,215,0,.12)',
                border:'1px solid rgba(255,215,0,.3)',
                borderRadius:6
              }}>
                <span style={{ fontSize:20 }}>🏆</span>
                <span className="toc-stat" style={{ fontSize:28, fontWeight:900, color:'#ffd700' }}>
                  {stats.titles || 0}
                </span>
                <span className="toc-label" style={{ color:'rgba(255,215,0,.8)' }}>TÍTULOS</span>
              </div>
            </div>

            <div style={{ 
              fontSize:13, 
              color:'rgba(255,255,255,.5)',
              fontFamily:'Orbitron,monospace',
              letterSpacing:'.1em'
            }}>
              {player.points?.toLocaleString() || 0} BBP POINTS
            </div>
          </div>

          <div className="toc-card" style={{
            padding:28,
            background:'rgba(255,255,255,.04)',
            border:'1px solid rgba(255,255,255,.12)',
            position:'relative',
            overflow:'hidden'
          }}>
            <div className="toc-label" style={{ color:tierColor, marginBottom:16 }}>
              📋 ANÁLISE PRÉ-TORNEIO
            </div>
            <div style={{
              fontSize:16,
              lineHeight:1.8,
              color:'rgba(255,255,255,.85)',
              fontWeight:600
            }}>
              {analysis}
            </div>

            <div style={{
              position:'absolute',
              bottom:0,
              left:0,
              right:0,
              height:40,
              background:'linear-gradient(180deg, transparent, rgba(0,0,0,.3))',
              pointerEvents:'none'
            }} />
          </div>

          <div style={{
            display:'grid',
            gridTemplateColumns:'repeat(4, 1fr)',
            gap:12
          }}>
            {[
              { label:'W/L', value:`${stats.wins || 0}-${stats.losses || 0}`, icon:'⚔️' },
              { label:'WIN %', value:`${stats.winRate || 0}%`, icon:'📈' },
              { label:'FORMA', value:stats.form || 'N/A', icon:'🔥' },
              { label:'STREAK', value:stats.streak || 'N/A', icon:'⚡' }
            ].map((stat, i) => (
              <div key={i} className="toc-card" style={{
                padding:'16px 12px',
                textAlign:'center',
                background:'rgba(255,255,255,.03)',
                border:`1px solid rgba(255,255,255,.08)`,
                animationDelay:`${delay + 600 + i * 50}ms`
              }}>
                <div style={{ fontSize:20, marginBottom:6 }}>{stat.icon}</div>
                <div className="toc-stat" style={{
                  fontSize:20,
                  fontWeight:900,
                  color:'#fff',
                  marginBottom:4
                }}>{stat.value}</div>
                <div className="toc-label" style={{ color:'rgba(255,255,255,.4)' }}>
                  {stat.label}
                </div>
              </div>
            ))}
          </div>

          {/* Beyblades Arsenal */}
          <div>
            <div style={{
              display:'flex',
              alignItems:'center',
              gap:12,
              marginBottom:20
            }}>
              <div className="toc-label" style={{ color:tierColor }}>
                🎯 ARSENAL DE BEYBLADES
              </div>
              <div style={{
                flex:1,
                height:1,
                background:`linear-gradient(90deg, ${tierColor}44, transparent)`
              }} />
            </div>

            <div style={{
              display:'grid',
              gridTemplateColumns:'repeat(5, 1fr)',
              gap:12
            }}>
              {beyblades.slice(0, 5).map((bey, i) => {
                const beyType = bey.type || 'Balance';
                const typeInfo = BEY_TYPES[beyType] || BEY_TYPES.Balance;
                
                return (
                  <div key={i} className="toc-bey-card toc-fade-in" style={{
                    padding:16,
                    background:typeInfo.bg,
                    border:`1px solid ${typeInfo.color}44`,
                    animationDelay:`${delay + 800 + i * 100}ms`
                  }}>
                    <div style={{
                      fontSize:32,
                      marginBottom:12,
                      textAlign:'center',
                      filter:`drop-shadow(0 0 12px ${typeInfo.color}88)`
                    }}>
                      {typeInfo.icon}
                    </div>

                    <div style={{
                      fontSize:9,
                      fontFamily:'Orbitron,monospace',
                      fontWeight:700,
                      letterSpacing:'.1em',
                      color:typeInfo.color,
                      textAlign:'center',
                      marginBottom:8
                    }}>
                      {bey.label || `BEY ${i + 1}`}
                    </div>

                    <div style={{
                      fontSize:11,
                      fontWeight:700,
                      color:'rgba(255,255,255,.9)',
                      textAlign:'center',
                      marginBottom:12,
                      lineHeight:1.2,
                      height:32,
                      display:'flex',
                      alignItems:'center',
                      justifyContent:'center'
                    }}>
                      {bey.name || 'Mystery Blade'}
                    </div>

                    <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                      {[
                        { key:'ATK', val:bey.atk || 0, max:40 },
                        { key:'DEF', val:bey.def || 0, max:40 },
                        { key:'STA', val:bey.sta || 0, max:40 }
                      ].map(s => (
                        <div key={s.key}>
                          <div style={{
                            display:'flex',
                            justifyContent:'space-between',
                            fontSize:8,
                            fontFamily:'Orbitron,monospace',
                            marginBottom:2,
                            color:'rgba(255,255,255,.5)'
                          }}>
                            <span>{s.key}</span>
                            <span>{s.val}</span>
                          </div>
                          <div className="toc-stat-bar">
                            <div className="toc-stat-fill" style={{
                              width:`${(s.val / s.max) * 100}%`,
                              background:typeInfo.color
                            }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};


// ── Main Component ──────────────────────────────────────────
const TournamentOpeningCeremony = ({ universeManager, tournament, participants, onComplete }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [featured, setFeatured] = useState([]);
  const [autoAdvance, setAutoAdvance] = useState(true);

  useEffect(() => {
    const selectFeaturedPlayers = () => {
      const bbpRanking = universeManager.getBBPRanking();
      const allPlayers = bbpRanking.map(entry => {
        const team = getTeam(entry.playerId);
        const history = universeManager.playerHistories.get(entry.playerId);
        
        return {
          playerId: entry.playerId,
          rank: entry.rank,
          points: entry.points,
          team,
          history
        };
      });

      const featured = [];

      // 1. TOP 4 DO RANKING
      const top4 = allPlayers.slice(0, 4);
      top4.forEach((player, i) => {
        const recentForm = calculateRecentForm(player, universeManager);
        const analysis = generateAnalysis(player, 'TOP_SEED', recentForm, tournament, universeManager);
        const stats = calculateStats(player, universeManager);
        const beyblades = getPlayerBeyblades(player, tournament, universeManager);

        featured.push({
          player,
          reason: {
            category: `SEED #${i + 1}`,
            subtitle: 'Top do Ranking BBP',
            icon: ['👑', '🥈', '🥉', '⭐'][i]
          },
          analysis,
          stats,
          beyblades
        });
      });

      // 2. MAIOR SUBIDA NO RANKING
      const riser = findBiggestRiser(allPlayers, universeManager);
      if (riser && !featured.find(f => f.player.playerId === riser.playerId)) {
        const recentForm = calculateRecentForm(riser, universeManager);
        const analysis = generateAnalysis(riser, 'RISING_STAR', recentForm, tournament, universeManager);
        const stats = calculateStats(riser, universeManager);
        const beyblades = getPlayerBeyblades(riser, tournament, universeManager);

        featured.push({
          player: riser,
          reason: {
            category: 'RISING STAR',
            subtitle: 'Maior Escalada no Ranking',
            icon: '🚀'
          },
          analysis,
          stats,
          beyblades
        });
      }

      // 3. ESPECIALISTA NA ARENA
      const arenaSpecialist = findArenaSpecialist(allPlayers, tournament, universeManager);
      if (arenaSpecialist && !featured.find(f => f.player.playerId === arenaSpecialist.playerId)) {
        const recentForm = calculateRecentForm(arenaSpecialist, universeManager);
        const analysis = generateAnalysis(arenaSpecialist, 'ARENA_SPECIALIST', recentForm, tournament, universeManager);
        const stats = calculateStats(arenaSpecialist, universeManager);
        const beyblades = getPlayerBeyblades(arenaSpecialist, tournament, universeManager);

        featured.push({
          player: arenaSpecialist,
          reason: {
            category: 'ARENA SPECIALIST',
            subtitle: `Domínio em ${tournament.arena}`,
            icon: '🏟️'
          },
          analysis,
          stats,
          beyblades
        });
      }

      // 4. DARK HORSE
      const darkHorse = findDarkHorse(allPlayers, featured, universeManager);
      if (darkHorse) {
        const recentForm = calculateRecentForm(darkHorse, universeManager);
        const analysis = generateAnalysis(darkHorse, 'DARK_HORSE', recentForm, tournament, universeManager);
        const stats = calculateStats(darkHorse, universeManager);
        const beyblades = getPlayerBeyblades(darkHorse, tournament, universeManager);

        featured.push({
          player: darkHorse,
          reason: {
            category: 'DARK HORSE',
            subtitle: 'Candidato Improvável',
            icon: '🎭'
          },
          analysis,
          stats,
          beyblades
        });
      }

      setFeatured(featured);
    };

    selectFeaturedPlayers();
  }, [universeManager, tournament, participants]);

  useEffect(() => {
    if (!autoAdvance) return;
    
    const timer = setTimeout(() => {
      if (currentIndex < featured.length - 1) {
        setCurrentIndex(prev => prev + 1);
      } else {
        onComplete();
      }
    }, 6000);

    return () => clearTimeout(timer);
  }, [currentIndex, featured.length, autoAdvance, onComplete]);

  if (featured.length === 0) {
    return (
      <div style={{
        minHeight:'100vh',
        display:'flex',
        alignItems:'center',
        justifyContent:'center',
        background:'#0a0a0a',
        color:'#fff'
      }}>
        <div className="toc-stat" style={{ fontSize:24, color:'rgba(255,255,255,.5)' }}>
          Preparando cerimônia...
        </div>
      </div>
    );
  }

  const current = featured[currentIndex];

  return (
    <div className="toc-root" style={{
      minHeight:'100vh',
      background:'#0a0a0a',
      color:'#fff',
      position:'relative',
      overflow:'hidden'
    }}>
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />

      <div style={{
        position:'fixed',
        inset:0,
        backgroundImage:'linear-gradient(rgba(255,255,255,.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.02) 1px, transparent 1px)',
        backgroundSize:'40px 40px',
        opacity:.3,
        pointerEvents:'none'
      }} />

      <div style={{
        position:'fixed',
        top:0,
        left:0,
        right:0,
        padding:'24px 48px',
        background:'linear-gradient(180deg, rgba(10,10,10,.95) 0%, transparent 100%)',
        zIndex:100,
        backdropFilter:'blur(10px)'
      }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div>
            <div className="toc-label" style={{ color:'rgba(255,215,0,.7)', marginBottom:8 }}>
              🏆 CERIMÔNIA DE ABERTURA
            </div>
            <div className="toc-title" style={{
              fontSize:28,
              background:'linear-gradient(135deg, #fff, #ffd700)',
              WebkitBackgroundClip:'text',
              WebkitTextFillColor:'transparent'
            }}>
              {tournament.name}
            </div>
          </div>
          <button 
            className="toc-skip-btn"
            onClick={onComplete}
          >
            PULAR CERIMÔNIA →
          </button>
        </div>
      </div>

      <div style={{
        position:'fixed',
        bottom:48,
        left:'50%',
        transform:'translateX(-50%)',
        display:'flex',
        gap:12,
        zIndex:100
      }}>
        {featured.map((_, i) => (
          <div key={i} style={{
            width:60,
            height:6,
            background:i <= currentIndex ? 'rgba(255,215,0,.8)' : 'rgba(255,255,255,.15)',
            borderRadius:3,
            transition:'all .4s ease',
            cursor:'pointer',
            boxShadow:i <= currentIndex ? '0 0 12px rgba(255,215,0,.6)' : 'none'
          }}
          onClick={() => setCurrentIndex(i)}
          />
        ))}
      </div>

      <FeaturedPlayerCard
        key={currentIndex}
        {...current}
        delay={200}
      />

      <div style={{
        position:'fixed',
        bottom:80,
        left:'50%',
        transform:'translateX(-50%)',
        fontSize:12,
        color:'rgba(255,255,255,.3)',
        fontFamily:'Orbitron,monospace',
        letterSpacing:'.1em',
        zIndex:100,
        display:'flex',
        alignItems:'center',
        gap:12
      }}>
        <span>PLAYER {currentIndex + 1} OF {featured.length}</span>
        <span>•</span>
        <button
          onClick={() => setAutoAdvance(!autoAdvance)}
          style={{
            background:'none',
            border:'none',
            color:autoAdvance ? '#ffd700' : 'rgba(255,255,255,.3)',
            cursor:'pointer',
            fontSize:12,
            fontFamily:'Orbitron,monospace',
            letterSpacing:'.1em'
          }}
        >
          {autoAdvance ? '⏸️ PAUSAR' : '▶️ AUTO'}
        </button>
      </div>
    </div>
  );
};


// ── Helper Functions ─────────────────────────────────────────

function calculateRecentForm(player, universeManager) {
  const history = player.history;
  if (!history || !history.tournamentHistory) return { wins: 0, losses: 0, form: 'N/A' };

  const recent = history.tournamentHistory.slice(-5);
  let wins = 0;
  let losses = 0;

  recent.forEach(t => {
    if (t.position === 1) wins += 2;
    else if (t.position <= 4) wins += 1;
    else losses += 1;
  });

  const form = wins > losses * 1.5 ? 'HOT' : wins < losses ? 'COLD' : 'STABLE';
  
  return { wins, losses, form, recent };
}

function calculateStats(player, universeManager) {
  const history = player.history;
  if (!history) return {
    wins: 0,
    losses: 0,
    winRate: 0,
    titles: 0,
    form: 'N/A',
    streak: 'N/A'
  };

  const titles = history.titles?.total || 0;
  const recent = history.tournamentHistory?.slice(-10) || [];
  
  let wins = 0;
  let losses = 0;
  recent.forEach(t => {
    if (t.position === 1 || t.position <= 2) wins++;
    else losses++;
  });

  const winRate = wins + losses > 0 ? Math.round((wins / (wins + losses)) * 100) : 0;

  return {
    wins,
    losses,
    winRate,
    titles,
    form: wins > losses ? 'HOT' : wins < losses ? 'COLD' : 'STABLE',
    streak: wins > 3 ? `W${wins}` : losses > 3 ? `L${losses}` : 'MIX'
  };
}

function getPlayerBeyblades(player, tournament, universeManager) {
  const beyblades = [];
  
  const signature = universeManager.signatureBlades?.get(player.playerId);
  if (signature?.blade) {
    beyblades.push({
      name: signature.blade.signatureName || 'Signature Blade',
      type: signature.blade.type || 'Balance',
      atk: signature.blade.atk || 20,
      def: signature.blade.def || 20,
      sta: signature.blade.sta || 20,
      label: '⭐ SIGNATURE'
    });
  }

  const team = player.team;
  const preferredTypes = ['Attack', 'Defense', 'Stamina', 'Balance'];
  
  for (let i = 0; i < 4; i++) {
    const type = preferredTypes[i];
    beyblades.push({
      name: `${type} Blade ${i + 1}`,
      type,
      atk: type === 'Attack' ? 30 : type === 'Balance' ? 20 : 15,
      def: type === 'Defense' ? 30 : type === 'Balance' ? 20 : 15,
      sta: type === 'Stamina' ? 30 : type === 'Balance' ? 20 : 15,
      label: i === 0 ? '🏆 SEASONAL' : '⚡ TOURNAMENT'
    });
  }

  return beyblades.slice(0, 5);
}

function findBiggestRiser(players, universeManager) {
  return players.slice(8, 16).find(p => p.rank <= 15);
}

function findArenaSpecialist(players, tournament, universeManager) {
  return players.find(p => p.team?.favoriteArena === tournament.arena);
}

function findDarkHorse(players, alreadyFeatured, universeManager) {
  const candidates = players.slice(14, 30).filter(p => 
    !alreadyFeatured.find(f => f.player.playerId === p.playerId)
  );
  
  return candidates[0];
}

function generateAnalysis(player, category, form, tournament, universeManager) {
  const team = player.team;
  const name = team?.name?.split(' ')[0] || 'Este jogador';
  
  const analyses = {
    TOP_SEED: [
      `${name} chega como líder absoluto do ranking BBP com ${player.points} pontos. ${form.form === 'HOT' ? 'Em forma fenomenal, venceu seus últimos torneios' : form.form === 'COLD' ? 'Apesar da liderança, vem em má fase recente' : 'Mantém consistência, mas ainda não decolou'}.`,
      `O favorito ${name} carrega o peso da expectativa. ${player.history?.titles?.grandSlams > 0 ? `Com ${player.history.titles.grandSlams} Grand Slams no currículo, conhece bem a pressão` : 'Busca seu primeiro título major para consolidar a liderança'}.`,
      `${name} domina o circuito com autoridade. ${form.form === 'HOT' ? 'Vem de uma sequência impressionante' : 'Precisa recuperar o ritmo para justificar a posição'}. A arena ${tournament.arena} ${team?.favoriteArena === tournament.arena ? 'favorece seu estilo' : 'apresenta desafios únicos'}.`
    ],
    RISING_STAR: [
      `${name} é a sensação do momento! Subiu ${Math.floor(Math.random() * 15) + 10} posições nos últimos 3 meses e chega com confiança nas alturas. O momentum está a seu favor.`,
      `A escalada de ${name} no ranking tem impressionado. ${form.form === 'HOT' ? 'Com vitórias consecutivas, pode surpreender os favoritos' : 'Apesar da subida, precisa manter a consistência'}. Um nome a se observar.`,
      `${name} representa a nova geração. Sua ascensão meteórica no ranking BBP ${form.wins > 3 ? 'se apoia em resultados concretos' : 'ainda precisa ser validada em palcos maiores'}.`
    ],
    ARENA_SPECIALIST: [
      `${name} conhece ${tournament.arena} como ninguém. ${form.form === 'HOT' ? 'Em forma e na arena favorita, é candidato sério ao título' : 'Mesmo em fase irregular, a experiência na arena pode fazer diferença'}.`,
      `A estatística não mente: ${name} tem ${Math.floor(Math.random() * 30) + 60}% de aproveitamento em ${tournament.arena}. ${team?.favoriteArena === tournament.arena ? 'Domina cada centímetro desta arena' : 'Desenvolveu um jogo específico para este palco'}.`,
      `${name} encontra em ${tournament.arena} seu território de caça. ${form.form === 'HOT' ? 'Combinando forma e especialização, pode ir longe' : 'Precisa traduzir conhecimento da arena em resultados'}.`
    ],
    DARK_HORSE: [
      `${name} vem silenciosamente construindo resultados. Ranqueado apenas em #${player.rank}, ${form.form === 'HOT' ? 'mas sua forma recente assusta os favoritos' : 'ainda busca a consistência que o levará ao topo'}.`,
      `Não subestime ${name}. ${form.form === 'HOT' ? 'Em grande fase, pode causar surpresas' : 'Apesar da irregularidade, possui talento para vencer qualquer um'}. Os favoritos precisam estar atentos.`,
      `${name} é o típico candidato improvável. ${player.history?.titles?.total > 0 ? `Já provou que pode vencer (${player.history.titles.total} títulos)` : 'Busca seu primeiro título importante'}, e torneios como este são feitos para zebras.`
    ]
  };

  const options = analyses[category] || analyses.TOP_SEED;
  return options[Math.floor(Math.random() * options.length)];
}

export default TournamentOpeningCeremony;
