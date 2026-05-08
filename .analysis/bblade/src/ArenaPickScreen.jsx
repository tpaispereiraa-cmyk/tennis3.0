// ============================================
// ARENAPICKSCREEN.JSX — Tela Visual de Pick de Arena
// ============================================
// Mostra quem escolheu o quê em cada round antes da batalha começar
// ============================================

import React, { useState, useEffect } from 'react';

// ─── Metadata de arenas ───
const ARENA_DISPLAY = {
  BB10_COMPETITIVE:  { name:'BB-10 Competitive',     emoji:'⚔️',  color:'#60a5fa', desc:'Arena padrão — equilibrada e justa' },
  VOLCANIC_RAGE:     { name:'Volcanic Rage',          emoji:'🌋',  color:'#ef4444', desc:'Erupções vulcânicas e lava caótica' },
  KILLER_SIDES:      { name:'Killer Sides',           emoji:'🔄',  color:'#10b981', desc:'Track de aderência lateral — stamina e controle' },
  NEXUS:             { name:'Prismatic Nexus',        emoji:'🌀',  color:'#06b6d4', desc:'Portais que teletransportam beys' },
  COLOSSEUM_CARNAGE: { name:'Colosseum Carnage',      emoji:'🏛️', color:'#f97316', desc:'Itens aleatórios, bumpers e portas mortais' },
  PANGEA_PLATFORM:   { name:'Pangea Platform',        emoji:'🌍',  color:'#22c55e', desc:'Plataformas tectônicas estratégicas' },
  PINBALL_INFERNO:   { name:'Pinball Inferno',        emoji:'🎰',  color:'#ec4899', desc:'Caos total — flippers e gravity tilt' },
  VORTEX_COLISEUM:   { name:'Vortex Coliseum',        emoji:'💜',  color:'#a855f7', desc:'Vórtex girante com slingshots orbitais' },
  DOMINATION_ZONES:  { name:'Domination Zones',       emoji:'🎯',  color:'#fbbf24', desc:'Zonas táticas periféricas de dominação' },
  TIDAL_SURGE:       { name:'Tidal Surge',            emoji:'🌊',  color:'#0ea5e9', desc:'Ondas periódicas de força violenta' },
  STORM_TRACK:       { name:'Storm Track',            emoji:'⛈️', color:'#94a3b8', desc:'Rajadas de vento e velocidade extrema' },
};

function getArena(code) {
  return ARENA_DISPLAY[code] || { name: code, emoji: '🏟️', color: '#888', desc: '' };
}

// ─── Mapa de preferências (para mostrar no tooltip) ───
const MENTALITY_PREFS = {
  ALL_ROUNDER:        { fav: ['BB10_COMPETITIVE','PANGEA_PLATFORM','DOMINATION_ZONES'],   hate: ['PINBALL_INFERNO','VOLCANIC_RAGE','COLOSSEUM_CARNAGE'] },
  GLASS_CANNON:       { fav: ['COLOSSEUM_CARNAGE','PINBALL_INFERNO','STORM_TRACK'],       hate: ['KILLER_SIDES','VORTEX_COLISEUM','DOMINATION_ZONES'] },
  IRON_FORTRESS:      { fav: ['NEXUS','DOMINATION_ZONES','PANGEA_PLATFORM'],              hate: ['PINBALL_INFERNO','STORM_TRACK','COLOSSEUM_CARNAGE'] },
  ETERNAL_SPINNER:    { fav: ['VORTEX_COLISEUM','KILLER_SIDES','TIDAL_SURGE'],            hate: ['COLOSSEUM_CARNAGE','PINBALL_INFERNO','VOLCANIC_RAGE'] },
  CALCULATED_CHAOS:   { fav: ['NEXUS','COLOSSEUM_CARNAGE','DOMINATION_ZONES'],            hate: ['BB10_COMPETITIVE','KILLER_SIDES','PANGEA_PLATFORM'] },
  HIGH_RISK_GAMBLER:  { fav: ['PINBALL_INFERNO','COLOSSEUM_CARNAGE','STORM_TRACK'],       hate: ['BB10_COMPETITIVE','PANGEA_PLATFORM','DOMINATION_ZONES'] },
  MOMENTUM_MASTER:    { fav: ['STORM_TRACK','TIDAL_SURGE','VORTEX_COLISEUM'],             hate: ['PINBALL_INFERNO','VOLCANIC_RAGE','NEXUS'] },
  SYNERGY_SEEKER:     { fav: ['DOMINATION_ZONES','NEXUS','PANGEA_PLATFORM'],              hate: ['PINBALL_INFERNO','VOLCANIC_RAGE','COLOSSEUM_CARNAGE'] },
  ADAPTIVE_TACTICIAN: { fav: ['NEXUS','DOMINATION_ZONES','BB10_COMPETITIVE'],             hate: ['VOLCANIC_RAGE','KILLER_SIDES','VORTEX_COLISEUM'] },
  PERFECTIONIST:      { fav: ['BB10_COMPETITIVE','PANGEA_PLATFORM','KILLER_SIDES'],       hate: ['PINBALL_INFERNO','COLOSSEUM_CARNAGE','TIDAL_SURGE'] },
  CHAOS_AGENT:        { fav: ['PINBALL_INFERNO','VOLCANIC_RAGE','COLOSSEUM_CARNAGE'],     hate: ['BB10_COMPETITIVE','PANGEA_PLATFORM','NEXUS'] },
  MOMENTUM_THIEF:     { fav: ['KILLER_SIDES','DOMINATION_ZONES','STORM_TRACK'],           hate: ['TIDAL_SURGE','VORTEX_COLISEUM','PANGEA_PLATFORM'] },
};

function getRelation(mentality, arenaCode) {
  const prefs = MENTALITY_PREFS[mentality] || MENTALITY_PREFS.ALL_ROUNDER;
  if (prefs.fav.includes(arenaCode))  return 'fav';
  if (prefs.hate.includes(arenaCode)) return 'hate';
  return 'neutral';
}

function getRelationIcon(mentality, arenaCode) {
  const r = getRelation(mentality, arenaCode);
  if (r === 'fav')  return { icon: '✅', label: 'Favorita', color: '#34d399' };
  if (r === 'hate') return { icon: '❌', label: 'Desvantagem', color: '#ef4444' };
  return { icon: '➖', label: 'Neutro', color: '#888' };
}

// ─── Componente de uma linha de pick ───
function PickRow({ pick, p1, p2, format, animDelay = 0 }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), animDelay);
    return () => clearTimeout(t);
  }, [animDelay]);

  const arena   = getArena(pick.arena);
  const isRandom = pick.reason === 'RANDOM';
  const picker   = pick.picker;
  const isP1     = picker?.id === p1?.id;
  const isLastRound = format === 'MD3' ? pick.round === 3 : pick.round === 5;

  // Relação dos dois jogadores com a arena
  const r1 = getRelationIcon(p1?.mentality, pick.arena);
  const r2 = getRelationIcon(p2?.mentality, pick.arena);

  const pickerColor = isP1
    ? (p1?.colors?.[0] || '#ffd700')
    : (p2?.colors?.[0] || '#00d4ff');

  return (
    <div style={{
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateX(0)' : 'translateX(-16px)',
      transition: 'all 0.4s cubic-bezier(.22,1,.36,1)',
      display: 'flex',
      alignItems: 'stretch',
      gap: 0,
      borderRadius: 4,
      overflow: 'hidden',
      border: `1px solid ${isRandom ? 'rgba(255,255,255,.1)' : arena.color + '44'}`,
      background: `linear-gradient(90deg, ${arena.color}08, rgba(0,0,0,0))`,
    }}>
      {/* Round number */}
      <div style={{
        minWidth: 40,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: isRandom ? 'rgba(255,255,255,.05)' : `${arena.color}18`,
        borderRight: `1px solid ${arena.color}33`,
      }}>
        <span style={{
          fontFamily: 'Orbitron,monospace',
          fontSize: 9,
          fontWeight: 700,
          color: isRandom ? 'rgba(255,255,255,.3)' : arena.color,
          letterSpacing: '.05em',
        }}>R{pick.round}</span>
      </div>

      {/* Arena info */}
      <div style={{ flex: 1, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* Emoji + name */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <span style={{
            fontSize: 24,
            filter: isRandom ? 'grayscale(0.5)' : `drop-shadow(0 0 8px ${arena.color}88)`,
          }}>{arena.emoji}</span>
          <div>
            <div style={{
              fontFamily: 'Black Ops One,cursive',
              fontSize: 14,
              color: isRandom ? 'rgba(255,255,255,.5)' : arena.color,
              lineHeight: 1,
              filter: `drop-shadow(0 0 6px ${arena.color}66)`,
            }}>{arena.name}</div>
            <div style={{
              fontFamily: 'Rajdhani,sans-serif',
              fontSize: 10,
              color: 'rgba(255,255,255,.35)',
              marginTop: 2,
            }}>{arena.desc}</div>
          </div>
        </div>

        {/* Preference badges — both players */}
        <div style={{ marginLeft: 'auto', display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
          {[{player: p1, rel: r1, label: p1?.name?.split(' ')[0]}, {player: p2, rel: r2, label: p2?.name?.split(' ')[0]}].map(({player, rel, label}, idx) => (
            <div key={idx} style={{
              display: 'flex', alignItems: 'center', gap: 4,
              fontSize: 10, fontFamily: 'Rajdhani,sans-serif',
              color: rel.color,
            }}>
              <span style={{ fontSize: 10 }}>{rel.icon}</span>
              <span style={{ color: 'rgba(255,255,255,.5)', fontSize: 9 }}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Picker tag */}
      <div style={{
        minWidth: 110,
        borderLeft: `1px solid ${isRandom ? 'rgba(255,255,255,.07)' : arena.color + '22'}`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '8px 12px',
        background: isRandom
          ? 'rgba(255,255,255,.02)'
          : `${pickerColor}10`,
        gap: 3,
      }}>
        {isRandom ? (
          <>
            <span style={{ fontSize: 16 }}>🎲</span>
            <span style={{ fontFamily: 'Orbitron,monospace', fontSize: 7, color: 'rgba(255,255,255,.3)', letterSpacing: '.15em', textAlign: 'center' }}>SORTEIO</span>
            {isLastRound && <span style={{ fontFamily: 'Rajdhani,sans-serif', fontSize: 9, color: 'rgba(255,255,255,.2)' }}>desempate</span>}
          </>
        ) : (
          <>
            <span style={{
              fontFamily: 'Orbitron,monospace',
              fontSize: 7,
              color: pickerColor,
              letterSpacing: '.12em',
              textAlign: 'center',
              textTransform: 'uppercase',
            }}>PICK</span>
            <span style={{
              fontFamily: 'Rajdhani,sans-serif',
              fontWeight: 700,
              fontSize: 11,
              color: pickerColor,
              textAlign: 'center',
              lineHeight: 1.2,
            }}>{picker?.name?.split(' ')[0] || '?'}</span>
            <span style={{
              fontFamily: 'Orbitron,monospace',
              fontSize: 7,
              color: 'rgba(255,255,255,.25)',
              textAlign: 'center',
            }}>IQ {picker?.attributes?.intelligence || '?'}</span>
          </>
        )}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
//  COMPONENTE PRINCIPAL
// ──────────────────────────────────────────────
// Props:
//   p1, p2 — objetos de jogador
//   picks   — array de {round, picker, arena, reason} (de ArenaPick.resolveArenaPicks)
//   format  — 'MD3' | 'MD5'
//   tournament — objeto do torneio (para nome e tier)
//   onContinue — callback para fechar/continuar
// ──────────────────────────────────────────────
export default function ArenaPickScreen({ p1, p2, picks, format, tournament, onContinue }) {
  const [headerVisible, setHeaderVisible] = useState(false);
  useEffect(() => { setTimeout(() => setHeaderVisible(true), 80); }, []);

  const tierColor = tournament?.tier === 'PREMIER' ? '#ffd700' : '#c084fc';
  const tierLabel = tournament?.tier === 'PREMIER' ? 'PREMIER CHAMPIONSHIP' : 'KINGS COURT';

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,.93)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9000,
      padding: 16,
    }}>
      {/* Background glow */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: `radial-gradient(ellipse at 50% 30%, ${tierColor}0a, transparent 60%)`,
        pointerEvents: 'none',
      }} />

      <div style={{
        width: '100%',
        maxWidth: 600,
        maxHeight: '90vh',
        overflow: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 0,
        position: 'relative',
      }}>

        {/* ── Header ── */}
        <div style={{
          opacity: headerVisible ? 1 : 0,
          transform: headerVisible ? 'translateY(0)' : 'translateY(-12px)',
          transition: 'all .5s cubic-bezier(.22,1,.36,1)',
          textAlign: 'center',
          padding: '24px 0 20px',
        }}>
          <div style={{
            fontFamily: 'Orbitron,monospace',
            fontSize: 8,
            letterSpacing: '.55em',
            color: `${tierColor}88`,
            marginBottom: 8,
          }}>{tierLabel} · {format}</div>
          <div style={{
            fontFamily: 'Black Ops One,cursive',
            fontSize: 'clamp(20px,3vw,32px)',
            background: `linear-gradient(135deg,#fff,${tierColor})`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            letterSpacing: '.04em',
            marginBottom: 6,
          }}>ESCOLHA DE ARENAS</div>
          <div style={{
            fontFamily: 'Rajdhani,sans-serif',
            fontSize: 12,
            color: 'rgba(255,255,255,.35)',
          }}>
            Cada jogador escolhe as arenas dos seus rounds
          </div>
        </div>

        {/* ── VS Header ── */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 16,
          marginBottom: 20,
          padding: '12px 16px',
          background: 'rgba(255,255,255,.02)',
          border: '1px solid rgba(255,255,255,.06)',
          borderRadius: 4,
        }}>
          {[p1, p2].map((player, idx) => {
            const clr = player?.colors?.[0] || (idx === 0 ? '#ffd700' : '#00d4ff');
            const intel = player?.attributes?.intelligence || 8;
            return (
              <React.Fragment key={idx}>
                {idx === 1 && <span style={{ fontFamily:'Black Ops One,cursive', fontSize:14, color:'rgba(255,255,255,.25)' }}>VS</span>}
                <div style={{ display:'flex', flexDirection:'column', alignItems: idx === 0 ? 'flex-end' : 'flex-start', gap:2 }}>
                  <div style={{ fontFamily:'Rajdhani,sans-serif', fontWeight:700, fontSize:13, color:clr }}>{player?.name || '?'}</div>
                  <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                    <span style={{ fontFamily:'Orbitron,monospace', fontSize:7, color:'rgba(255,255,255,.3)', letterSpacing:'.1em' }}>
                      IQ {intel}
                    </span>
                    {/* Intelligence bar */}
                    <div style={{ width:40, height:3, background:'rgba(255,255,255,.1)', borderRadius:99 }}>
                      <div style={{ width:`${(intel/20)*100}%`, height:'100%', background:clr, borderRadius:99 }} />
                    </div>
                  </div>
                </div>
              </React.Fragment>
            );
          })}
        </div>

        {/* ── Picks ── */}
        <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
          {picks.map((pick, i) => (
            <PickRow
              key={pick.round}
              pick={pick}
              p1={p1}
              p2={p2}
              format={format}
              animDelay={200 + i * 180}
            />
          ))}
        </div>

        {/* ── Legend ── */}
        <div style={{
          display:'flex',
          gap:16,
          justifyContent:'center',
          margin:'16px 0 8px',
          flexWrap:'wrap',
        }}>
          {[['✅','Favorita','#34d399'],['➖','Neutro','#888'],['❌','Desvantagem','#ef4444']].map(([icon,label,color]) => (
            <div key={label} style={{ display:'flex', alignItems:'center', gap:5 }}>
              <span style={{ fontSize:11 }}>{icon}</span>
              <span style={{ fontFamily:'Rajdhani,sans-serif', fontSize:10, color }}>{label}</span>
            </div>
          ))}
        </div>

        {/* ── Continue button ── */}
        <button
          onClick={onContinue}
          style={{
            marginTop: 12,
            width: '100%',
            padding: '14px 0',
            background: `linear-gradient(135deg,${tierColor}cc,${tierColor}88)`,
            border: 'none',
            borderRadius: 4,
            fontFamily: 'Orbitron,monospace',
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '.25em',
            color: '#000',
            cursor: 'pointer',
            clipPath: 'polygon(10px 0%,100% 0%,calc(100% - 10px) 100%,0% 100%)',
            transition: 'filter .15s ease',
          }}
          onMouseEnter={e => e.target.style.filter = 'brightness(1.15)'}
          onMouseLeave={e => e.target.style.filter = 'brightness(1)'}
        >
          ⚔️ INICIAR BATALHA
        </button>
      </div>
    </div>
  );
}
