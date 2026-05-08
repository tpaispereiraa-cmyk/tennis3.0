// ============================================
// EXHIBITION & RECAP COMPONENTS
// Componentes de setup de exibição e recaps
// ============================================

import React, { useState, useEffect } from 'react';
import { Play, Tv, ChevronRight } from 'lucide-react';
import { TEAMS } from '../data.js';
import { CALENDAR_STRUCTURE as CALENDAR_CONFIG } from '../CalendarConfig.js';
import { MENTALITIES, LAUNCH_TECHNIQUES } from '../UniverseManager.js';
import { PlayerCard } from './PlayerComponents.jsx';

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
                const pct  = (val / 20) * 100;
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
    { id:'VOLCANIC_RAGE',    name:'Volcanic Rage',   icon:'🌋' },
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



export { ExhibitionSetup, TournamentRecapScreen, SeasonRecapScreen };
