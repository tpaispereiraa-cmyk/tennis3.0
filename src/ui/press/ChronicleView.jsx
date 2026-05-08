// ════════════════════════════════════════════════════════════════════
// 📖 CHRONICLE VIEW — Tennis Universe  (redesign editorial v2)
// ════════════════════════════════════════════════════════════════════
import React, { useState, useMemo, useCallback } from 'react';
import { ARCHIVE_THEME as BASE } from '../theme/uiTheme.js';

// ── Design tokens ────────────────────────────────────────────────────
const T = {
  ...BASE,
  bg: BASE.bg,
  dim: 'rgba(237,230,216,.55)',
  ghost: 'rgba(237,230,216,.22)',
  line: 'rgba(237,230,216,.08)',
};

const TONES = {
  EPICO:     { label:'ÉPICO',      color:'#D4621A', glow:'rgba(212,98,26,.18)',  bg:'rgba(212,98,26,.05)',  stripe:'rgba(212,98,26,.7)'  },
  DINASTICO: { label:'DINÁSTICO',  color:'#C9A84C', glow:'rgba(201,168,76,.18)', bg:'rgba(201,168,76,.05)', stripe:'rgba(201,168,76,.7)' },
  TRAGICO:   { label:'TRÁGICO',    color:'#6B7F8E', glow:'rgba(107,127,142,.12)',bg:'rgba(30,40,50,.35)',   stripe:'rgba(107,127,142,.5)'},
  INCERTO:   { label:'INCERTO',    color:'#4A8EC2', glow:'rgba(74,142,194,.14)', bg:'rgba(20,50,80,.12)',   stripe:'rgba(74,142,194,.6)' },
  TRANSICAO: { label:'TRANSIÇÃO',  color:'#5A8060', glow:'rgba(90,128,96,.12)',  bg:'rgba(40,60,44,.12)',   stripe:'rgba(90,128,96,.5)'  },
  PRODIGIO:  { label:'PRODÍGIO',   color:'#4EAC6E', glow:'rgba(78,172,110,.16)', bg:'rgba(30,78,50,.10)',   stripe:'rgba(78,172,110,.7)' },
};

const SURF = {
  CLAY:   { color:'#C4571E', label:'Saibro',  abbr:'SB' },
  GRASS:  { color:'#2B6E2B', label:'Grama',   abbr:'GR' },
  HARD:   { color:'#1B5EA8', label:'Dura',    abbr:'DU' },
  INDOOR: { color:'#7A2BAA', label:'Indoor',  abbr:'IN' },
};

const RIVA = {
  CLASSIC:       { label:'Clássica',           icon:'⚔️',  color:'#C9A84C' },
  DOMINATION:    { label:'Dominância',          icon:'👑',  color:'#D45050' },
  GIANT_KILLER:  { label:'Caçador de Gigantes', icon:'🎯',  color:'#4EAC6E' },
  GRUDGE:        { label:'Rancor',              icon:'🔥',  color:'#D47840' },
  FINALS_CURSE:  { label:'Maldição das Finais', icon:'🏆',  color:'#8B6FCC' },
  THRONE_RIVALS: { label:'Rivais do Trono',     icon:'💎',  color:'#4A8EC2' },
  ERA_CLASH:     { label:'Choque de Eras',      icon:'🌀',  color:'#CC78A0' },
};
const RIVA_STATUS = {
  BREWING:   { label:'Emergindo', color:'#6A8090' },
  ACTIVE:    { label:'Ativa',     color:'#4EAC6E' },
  INTENSE:   { label:'Intensa',   color:'#D47840' },
  LEGENDARY: { label:'Lendária',  color:'#C9A84C' },
  FROZEN:    { label:'Encerrada', color:'#4A8EC2' },
};

// ── CSS ──────────────────────────────────────────────────────────────
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500;1,600&family=Cormorant:ital,wght@0,600;0,700;1,600&family=Barlow+Condensed:wght@300;400;500;600;700;900&family=Barlow:wght@300;400;600&family=Space+Mono:wght@400;700&display=swap');

  @keyframes cv-in { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
  @keyframes cv-fade { from{opacity:0} to{opacity:1} }
  @keyframes cv-stripe { from{transform:scaleX(0)} to{transform:scaleX(1)} }
  @keyframes cv-float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
  @keyframes cv-glow-sweep { from{transform:translateX(-120%) rotate(18deg)} to{transform:translateX(140%) rotate(18deg)} }
  @keyframes cv-page-rise { from{opacity:0;transform:translateY(22px) scale(.985)} to{opacity:1;transform:translateY(0) scale(1)} }

  .cv-root {
    font-family: 'Barlow', sans-serif;
    background:
      radial-gradient(circle at 18% 0%, rgba(212,98,26,.16), transparent 28%),
      radial-gradient(circle at 82% 10%, rgba(201,168,76,.10), transparent 28%),
      linear-gradient(115deg, rgba(237,230,216,.035) 0 1px, transparent 1px 24px),
      #06090B;
    color: #EDE6D8;
    min-height:100vh;
  }
  .cv-shell { max-width:1260px; margin:0 auto; padding:44px 24px 0; }
  .cv-panel {
    border:1px solid rgba(237,230,216,.07);
    background:linear-gradient(180deg, rgba(16,24,32,.92), rgba(12,18,23,.96));
    box-shadow:0 20px 60px rgba(0,0,0,.22);
  }
  .cv-hero-grid {
    display:grid;
    grid-template-columns:minmax(0,1.45fr) minmax(320px,.75fr);
    gap:16px;
    align-items:stretch;
  }
  .cv-mosaic {
    display:grid;
    grid-template-columns:repeat(4, minmax(0,1fr));
    gap:12px;
  }
  .cv-archive-grid { display:grid; grid-template-columns:minmax(0,1fr); gap:2px; }
  .cv-pill {
    display:inline-flex; align-items:center; gap:6px; white-space:nowrap;
    padding:4px 9px; border:1px solid rgba(237,230,216,.10);
    background:rgba(237,230,216,.03); font-family:'Space Mono',monospace;
    font-size:7px; letter-spacing:.18em; text-transform:uppercase; color:rgba(237,230,216,.48);
  }
  .cv-stat-tile {
    padding:14px 16px;
    border:1px solid rgba(237,230,216,.08);
    background:rgba(237,230,216,.025);
  }
  .cv-year-card {
    min-height:190px;
    border:1px solid rgba(237,230,216,.08);
    background:linear-gradient(180deg, rgba(255,255,255,.025), rgba(255,255,255,.01));
    padding:16px 16px 18px;
    display:flex; flex-direction:column; justify-content:space-between;
    transition:transform .18s ease, border-color .18s ease, background .18s ease;
    cursor:pointer;
  }
  .cv-year-card:hover {
    transform:translateY(-4px);
    border-color:rgba(237,230,216,.16);
    background:linear-gradient(180deg, rgba(255,255,255,.05), rgba(255,255,255,.018));
  }
  .cv-figure-row {
    display:flex; align-items:center; justify-content:space-between; gap:12px;
    padding:12px 0; border-bottom:1px solid rgba(237,230,216,.05);
  }
  .cv-figure-row:last-child { border-bottom:none; }
  .cv-echo-card {
    padding:12px 14px;
    border-left:2px solid rgba(74,142,194,.42);
    background:rgba(74,142,194,.06);
    border-top:1px solid rgba(74,142,194,.12);
    border-right:1px solid rgba(74,142,194,.12);
    border-bottom:1px solid rgba(74,142,194,.12);
  }
  .cv-main-title {
    position:relative;
    display:inline-block;
    text-shadow:0 18px 60px rgba(0,0,0,.6);
  }
  .cv-main-title::after {
    content:'';
    position:absolute;
    left:50%;
    bottom:-16px;
    width:min(520px, 70vw);
    height:1px;
    transform:translateX(-50%);
    background:linear-gradient(90deg, transparent, rgba(212,98,26,.72), rgba(201,168,76,.55), transparent);
  }
  .cv-year-card {
    position:relative;
    overflow:hidden;
    text-align:left;
    isolation:isolate;
    box-shadow:0 18px 50px rgba(0,0,0,.28), inset 0 1px 0 rgba(255,255,255,.035);
  }
  .cv-year-card::before {
    content:'';
    position:absolute;
    inset:0;
    z-index:-1;
    background:
      radial-gradient(circle at 18% 18%, var(--cv-tone-glow, rgba(212,98,26,.16)), transparent 34%),
      linear-gradient(135deg, rgba(237,230,216,.08) 0 1px, transparent 1px 18px);
    opacity:.72;
  }
  .cv-year-card::after {
    content:'';
    position:absolute;
    inset:10px;
    border:1px solid rgba(237,230,216,.055);
    pointer-events:none;
  }
  .cv-year-card:hover::before { opacity:1; }
  .cv-year-number {
    font-family:'Cormorant', 'Cormorant Garamond', serif;
    font-size:56px;
    line-height:.82;
    letter-spacing:-.055em;
    color:rgba(237,230,216,.96);
  }
  .cv-year-mini-line {
    width:46px;
    height:2px;
    background:linear-gradient(90deg, var(--cv-tone-color, #D4621A), transparent);
    margin:16px 0 12px;
  }
  .cv-almanac-page {
    animation:cv-page-rise .48s ease both;
  }
  .cv-season-cover {
    position:relative;
    overflow:hidden;
    min-height:430px;
    border:1px solid rgba(237,230,216,.13);
    background:
      linear-gradient(100deg, rgba(6,9,11,.96) 0%, rgba(11,18,23,.90) 52%, rgba(6,9,11,.96) 100%),
      radial-gradient(circle at 72% 24%, var(--cv-tone-glow, rgba(212,98,26,.22)), transparent 35%);
    box-shadow:0 32px 95px rgba(0,0,0,.44), inset 0 1px 0 rgba(255,255,255,.04);
  }
  .cv-season-cover::before {
    content:'';
    position:absolute;
    inset:0;
    background:
      linear-gradient(90deg, rgba(237,230,216,.055) 1px, transparent 1px),
      linear-gradient(0deg, rgba(237,230,216,.035) 1px, transparent 1px);
    background-size:46px 46px;
    mask-image:linear-gradient(90deg, transparent, black 18%, black 82%, transparent);
    opacity:.32;
  }
  .cv-season-cover::after {
    content:'';
    position:absolute;
    top:-45%;
    left:-28%;
    width:42%;
    height:190%;
    background:linear-gradient(90deg, transparent, rgba(237,230,216,.075), transparent);
    animation:cv-glow-sweep 8s ease-in-out infinite;
  }
  .cv-cover-year {
    position:absolute;
    right:clamp(18px, 4vw, 58px);
    bottom:-18px;
    font-family:'Cormorant', 'Cormorant Garamond', serif;
    font-size:clamp(112px, 18vw, 240px);
    line-height:.7;
    letter-spacing:-.095em;
    color:rgba(237,230,216,.045);
    pointer-events:none;
  }
  .cv-cover-title {
    max-width:980px;
    font-family:'Cormorant Garamond', serif;
    font-size:clamp(40px, 6.3vw, 86px);
    line-height:.92;
    letter-spacing:-.035em;
    color:rgba(237,230,216,.96);
    text-wrap:balance;
  }
  .cv-cover-deck {
    max-width:880px;
    font-family:'Cormorant Garamond', serif;
    font-size:20px;
    line-height:1.65;
    color:rgba(237,230,216,.58);
  }
  .cv-section-title {
    display:flex;
    align-items:flex-end;
    justify-content:space-between;
    gap:16px;
    border-bottom:1px solid rgba(237,230,216,.075);
    padding-bottom:14px;
    margin-bottom:18px;
  }
  .cv-section-title h2 {
    margin:0;
    font-family:'Cormorant Garamond', serif;
    font-size:clamp(28px, 3vw, 42px);
    line-height:.95;
    color:rgba(237,230,216,.94);
  }
  .cv-editorial-card {
    position:relative;
    overflow:hidden;
    border:1px solid rgba(237,230,216,.10);
    box-shadow:0 18px 50px rgba(0,0,0,.22);
  }
  .cv-editorial-card::before {
    content:'';
    position:absolute;
    inset:0;
    background:radial-gradient(circle at 10% 15%, var(--cv-tone-glow, rgba(212,98,26,.13)), transparent 42%);
    pointer-events:none;
  }
  .cv-slam-card {
    position:relative;
    overflow:hidden;
    box-shadow:inset 0 1px 0 rgba(255,255,255,.035), 0 14px 34px rgba(0,0,0,.20);
  }
  .cv-slam-card::after {
    content:'';
    position:absolute;
    left:16px;
    right:16px;
    bottom:0;
    height:2px;
    background:linear-gradient(90deg, var(--slam-color), transparent);
  }
  .cv-table-box {
    border:1px solid rgba(237,230,216,.08);
    background:
      linear-gradient(180deg, rgba(237,230,216,.032), rgba(237,230,216,.012)),
      rgba(8,12,15,.5);
    box-shadow:inset 0 1px 0 rgba(255,255,255,.025);
  }
  .cv-top-row {
    transition:background .15s ease, transform .15s ease;
  }
  .cv-top-row:hover {
    background:rgba(237,230,216,.035);
    transform:translateX(3px);
  }

  .cv-entry { animation: cv-in .4s ease-out both; }
  .cv-entry:nth-child(1){animation-delay:.04s}
  .cv-entry:nth-child(2){animation-delay:.10s}
  .cv-entry:nth-child(3){animation-delay:.16s}
  .cv-entry:nth-child(4){animation-delay:.22s}
  .cv-entry:nth-child(5){animation-delay:.28s}

  .cv-entry-inner {
    border: 1px solid rgba(237,230,216,.06);
    border-top: none;
    background: #0C1217;
    transition: border-color .2s;
  }
  .cv-entry-inner:hover { border-color: rgba(237,230,216,.12); }

  .cv-tab {
    font-family: 'Space Mono', monospace;
    font-size: 8.5px; letter-spacing:.22em; text-transform:uppercase;
    padding: 10px 18px; border:none; background:transparent;
    cursor:pointer; transition:all .15s; border-bottom:2px solid transparent;
    color: rgba(237,230,216,.28);
  }
  .cv-tab:hover { color: rgba(237,230,216,.65); }
  .cv-tab.active { color: #EDE6D8; border-bottom-color: #EDE6D8; }

  .cv-tag {
    font-family: 'Space Mono', monospace; font-size:8px; letter-spacing:.1em;
    text-transform:uppercase; padding:2px 8px; border-radius:1px;
    border:1px solid rgba(237,230,216,.12); color:rgba(237,230,216,.38);
    background:rgba(237,230,216,.03); white-space:nowrap;
  }

  .cv-search {
    width:100%; padding:10px 14px 10px 38px; border-radius:1px; font-size:13px;
    background:rgba(237,230,216,.04) !important;
    border:1px solid rgba(237,230,216,.10) !important;
    color:#EDE6D8 !important; outline:none !important;
    font-family:'Space Mono',monospace !important; box-sizing:border-box;
    transition:border-color .18s;
  }
  .cv-search:focus { border-color:rgba(237,230,216,.28) !important; }
  .cv-search::placeholder { color:rgba(237,230,216,.2) !important; }

  .cv-filter {
    font-family:'Space Mono',monospace; font-size:8px; letter-spacing:.18em;
    text-transform:uppercase; padding:4px 12px; border-radius:1px; cursor:pointer;
    background:transparent; transition:all .14s;
  }

  .cv-expand {
    font-family:'Space Mono',monospace; font-size:8px; letter-spacing:.22em;
    text-transform:uppercase; background:transparent; cursor:pointer;
    border:1px solid rgba(237,230,216,.12); color:rgba(237,230,216,.32);
    padding:4px 14px; border-radius:1px; transition:all .14s;
  }
  .cv-expand:hover { border-color:rgba(237,230,216,.35); color:rgba(237,230,216,.7); }

  .cv-riva-chip {
    display:inline-flex; align-items:center; gap:4px; padding:2px 9px;
    border-radius:2px; font-family:'Space Mono',monospace; font-size:8px;
    letter-spacing:.12em; text-transform:uppercase;
  }

  .cv-empty {
    font-family:'Cormorant Garamond',serif; font-style:italic;
    text-align:center; padding:56px 0; color:rgba(237,230,216,.22);
  }

  @media (max-width: 1100px) {
    .cv-shell { padding-left:18px; padding-right:18px; }
    .cv-hero-grid { grid-template-columns:1fr; }
    .cv-mosaic { grid-template-columns:repeat(2, minmax(0,1fr)); }
  }

  @media (max-width: 720px) {
    .cv-mosaic { grid-template-columns:1fr; }
    .cv-season-cover { min-height:360px; }
    .cv-section-title { align-items:flex-start; flex-direction:column; }
  }
`;

// ── Bold text renderer ───────────────────────────────────────────────
function RT({ text, style }) {
  const parts = (text ?? '').split(/(\*\*[^*]+\*\*)/g);
  return (
    <span style={style}>
      {parts.map((p, i) =>
        p.startsWith('**') && p.endsWith('**')
          ? <strong key={i} style={{ fontWeight:600, color:'inherit' }}>{p.slice(2,-2)}</strong>
          : p
      )}
    </span>
  );
}

// ── Grand Slam strip ─────────────────────────────────────────────────
function GSStrip({ winners }) {
  if (!winners?.length) return null;
  return (
    <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:20 }}>
      {winners.map((w, i) => {
        const s = SURF[w.surface] ?? SURF.HARD;
        return (
          <div key={i} style={{
            display:'inline-flex', alignItems:'center', gap:6,
            padding:'4px 10px 4px 7px', border:`1px solid ${s.color}40`,
            background:`${s.color}12`, borderRadius:2,
          }}>
            <span style={{ width:6, height:6, borderRadius:'50%', background:s.color, flexShrink:0 }} />
            <span style={{ fontFamily:T.mono, fontSize:7.5, letterSpacing:'.1em', textTransform:'uppercase', color:s.color, opacity:.7 }}>
              {s.abbr}
            </span>
            <span style={{ fontFamily:T.serif, fontSize:13, color:'rgba(237,230,216,.80)', fontWeight:500 }}>
              {w.name}
            </span>
            {w.fiveSetFinal && (
              <span style={{ fontFamily:T.mono, fontSize:6.5, color:s.color, opacity:.55, letterSpacing:'.1em' }}>5S</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Single chronicle entry ───────────────────────────────────────────
function ChronicleEntry({ entry, index, expanded, onToggle }) {
  const tone = TONES[entry.tone] ?? TONES.TRANSICAO;
  const raw  = entry.raw ?? {};
  const sections = entry.sections ?? [];

  // Split: always show opening+main; rest on expand
  const alwaysShow = sections.filter(s => s.type === 'opening' || s.type === 'main');
  const moreShow   = sections.filter(s => s.type !== 'opening' && s.type !== 'main' && s.type !== 'closing' && s.type !== 'stats');
  const closing    = sections.find(s => s.type === 'closing');
  const stats      = sections.find(s => s.type === 'stats');
  const hasMore    = moreShow.length > 0;

  return (
    <div className="cv-entry" style={{ animationDelay:`${index * 0.06}s`, marginBottom:2 }}>
      {/* Tone stripe */}
      <div style={{
        height: 3, background:`linear-gradient(90deg, ${tone.stripe}, ${tone.color}22)`,
        transformOrigin:'left', animation:'cv-stripe .5s ease-out both',
        animationDelay:`${index * 0.06 + 0.1}s`,
      }} />

      <div className="cv-entry-inner" style={{ background: tone.bg || T.paper }}>
        {/* ── HEADER ROW ── */}
        <div style={{
          display:'grid', gridTemplateColumns:'76px 1fr',
          gap:0, borderBottom:`1px solid ${tone.color}18`,
          cursor:'pointer',
        }} onClick={onToggle}>
          {/* Left: Year + tone */}
          <div style={{
            padding:'22px 16px 22px 24px',
            borderRight:`1px solid ${tone.color}18`,
            display:'flex', flexDirection:'column', alignItems:'flex-end', justifyContent:'flex-start',
            background:`${tone.color}06`,
          }}>
            <div style={{
              fontFamily:T.mono, fontSize:22, fontWeight:700, color:tone.color,
              letterSpacing:'-.02em', lineHeight:1,
            }}>
              {entry.year}
            </div>
            <div style={{
              fontFamily:T.mono, fontSize:6.5, letterSpacing:'.32em', textTransform:'uppercase',
              color:tone.color, opacity:.45, marginTop:8, writingMode:'vertical-rl',
              transform:'rotate(180deg)', height:48, overflow:'hidden',
            }}>
              {tone.label}
            </div>
          </div>

          {/* Right: Headline + GS */}
          <div style={{ padding:'22px 28px 20px' }}>
            {/* Tone badge + tags row */}
            <div style={{ display:'flex', alignItems:'center', gap:6, flexWrap:'wrap', marginBottom:12 }}>
              <span style={{
                fontFamily:T.mono, fontSize:7, letterSpacing:'.34em', textTransform:'uppercase',
                padding:'2px 9px', border:`1px solid ${tone.color}50`,
                background:`${tone.color}12`, color:tone.color,
              }}>
                {tone.label}
              </span>
              {entry.tags?.slice(0,4).map((tag,i) => (
                <span key={i} className="cv-tag">{tag}</span>
              ))}
              {raw.calendarSlam && (
                <span style={{
                  fontFamily:T.mono, fontSize:7, letterSpacing:'.24em', textTransform:'uppercase',
                  padding:'2px 9px', border:'1px solid rgba(201,168,76,.6)',
                  background:'rgba(201,168,76,.12)', color:'#C9A84C', fontWeight:700,
                }}>
                  CALENDAR SLAM
                </span>
              )}
            </div>

            {/* Headline */}
            {entry.headline && (
              <h2 style={{
                fontFamily:T.serif, fontSize:'clamp(18px,2.4vw,26px)', fontWeight:600,
                color:'rgba(237,230,216,.92)', lineHeight:1.2, margin:'0 0 14px',
                letterSpacing:'.01em',
              }}>
                {entry.headline}
              </h2>
            )}

            {/* GS strip — always visible */}
            <GSStrip winners={raw.grandSlamWinners} />
          </div>
        </div>

        {/* ── BODY ── */}
        <div style={{ padding:'0 28px 0 calc(76px + 28px + 1px)' }}>
          <div style={{ paddingTop:20 }}>

            {/* Opening */}
            {alwaysShow.filter(s=>s.type==='opening').map((sec,i) => (
              <p key={i} style={{
                fontFamily:T.serif, fontStyle:'italic', fontSize:16,
                color:'rgba(237,230,216,.65)', lineHeight:1.85, margin:'0 0 14px',
                fontWeight:400,
              }}>
                <RT text={sec.text} />
              </p>
            ))}

            {/* Separator */}
            {alwaysShow.some(s=>s.type==='opening') && alwaysShow.some(s=>s.type==='main') && (
              <div style={{ width:28, height:1, background:`${tone.color}40`, margin:'0 0 14px' }} />
            )}

            {/* Main */}
            {alwaysShow.filter(s=>s.type==='main').map((sec,i) => (
              <p key={i} style={{
                fontFamily:T.serif, fontSize:15, color:'rgba(237,230,216,.85)',
                lineHeight:1.90, margin:'0 0 14px', textIndent:'1.4em', fontWeight:400,
              }}>
                <RT text={sec.text} />
              </p>
            ))}

            {/* Expanded sections */}
            {expanded && moreShow.map((sec, i) => (
              <div key={i}>
                <div style={{ width:28, height:1, background:`${tone.color}30`, margin:'14px 0' }} />
                <p style={{
                  fontFamily:T.serif,
                  fontSize: sec.type==='sub2' ? 13.5 : 14.5,
                  color:`rgba(237,230,216,${sec.type==='sub2' ? .65 : .78})`,
                  lineHeight:1.88, margin:'0 0 10px', textIndent:'1.4em', fontWeight:400,
                }}>
                  <RT text={sec.text} />
                </p>
              </div>
            ))}

            {/* Stats when expanded */}
            {expanded && stats && (
              <p style={{
                fontFamily:T.mono, fontSize:10.5, color:'rgba(237,230,216,.30)',
                lineHeight:1.65, margin:'16px 0 0', fontStyle:'italic',
                borderTop:`1px solid rgba(237,230,216,.06)`, paddingTop:12,
              }}>
                {stats.text}
              </p>
            )}

            {/* Closing — always as pull quote */}
            {closing && (
              <blockquote style={{
                borderLeft:`3px solid ${tone.color}60`,
                paddingLeft:18, margin:'20px 0',
                fontFamily:T.serif, fontStyle:'italic',
                fontSize:14.5, color:`${tone.color}bb`,
                lineHeight:1.80,
              }}>
                <RT text={closing.text} />
              </blockquote>
            )}

            {/* Expand / collapse row */}
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 0 20px', flexWrap:'wrap', gap:8 }}>
              <div style={{ display:'flex', gap:6 }}>
                {hasMore && (
                  <button className="cv-expand" onClick={e=>{e.stopPropagation();onToggle();}}>
                    {expanded ? '— Recolher' : `+ ${moreShow.length} seção${moreShow.length!==1?'ões':''} restante${moreShow.length!==1?'s':''}`}
                  </button>
                )}
              </div>
              {/* All tags when expanded */}
              {expanded && entry.tags?.length > 0 && (
                <div style={{ display:'flex', flexWrap:'wrap', gap:4 }}>
                  {entry.tags.map((tag,i) => <span key={i} className="cv-tag">{tag}</span>)}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Rankings panel ───────────────────────────────────────────────────
function RankingsPanel({ chronicles }) {
  const Card = ({title, icon, children}) => (
    <div style={{
      border:'1px solid rgba(237,230,216,.07)', background:'rgba(237,230,216,.02)',
      padding:'20px 22px',
    }}>
      <div style={{
        fontFamily:T.mono, fontSize:8, letterSpacing:'.32em', textTransform:'uppercase',
        color:'rgba(237,230,216,.32)', marginBottom:16,
      }}>{icon} {title}</div>
      {children}
    </div>
  );

  const Row = ({rank,year,main,sub,subColor='#D4621A'}) => (
    <div style={{
      display:'flex', alignItems:'center', gap:10, padding:'7px 0',
      borderBottom:'1px solid rgba(237,230,216,.05)',
    }}>
      <span style={{ fontFamily:T.mono, fontSize:9, color:'rgba(237,230,216,.22)', width:18 }}>#{rank}</span>
      <span style={{ fontFamily:T.mono, fontSize:10, color:'rgba(237,230,216,.35)', width:38, flexShrink:0 }}>{year}</span>
      <span style={{ fontFamily:T.serif, fontSize:13.5, color:'rgba(237,230,216,.78)', flex:1 }}>{main}</span>
      {sub && <span style={{ fontFamily:T.mono, fontSize:8.5, color:subColor, background:`${subColor}15`, padding:'1px 7px', borderRadius:1 }}>{sub}</span>}
    </div>
  );

  const topUpsets   = useMemo(()=>chronicles.filter(c=>c.raw?.biggestUpset?.margin).sort((a,b)=>b.raw.biggestUpset.margin-a.raw.biggestUpset.margin).slice(0,6),[chronicles]);
  const dominators  = useMemo(()=>chronicles.filter(c=>c.raw?.mostTitlesPlayer?.count>=2).sort((a,b)=>b.raw.mostTitlesPlayer.count-a.raw.mostTitlesPlayer.count).slice(0,6),[chronicles]);
  const calSlams    = useMemo(()=>chronicles.filter(c=>c.raw?.calendarSlam),[chronicles]);
  const epicYears   = useMemo(()=>chronicles.filter(c=>c.tone==='EPICO'||c.tone==='DINASTICO'),[chronicles]);

  return (
    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
      <Card title="Maiores Upsets Históricos" icon="💥">
        {topUpsets.length===0
          ? <div className="cv-empty" style={{padding:'12px 0',fontSize:13}}>Sem upsets registrados</div>
          : topUpsets.map((c,i)=>(
            <Row key={c.year} rank={i+1} year={c.year}
              main={<><strong>{c.raw.biggestUpset.winnerName}</strong> (#{c.raw.biggestUpset.winnerRank}) × #{c.raw.biggestUpset.victimRank}</>}
              sub={`Δ${c.raw.biggestUpset.margin}`}
            />
          ))}
      </Card>

      <Card title="Temporadas de Dominância" icon="🏆">
        {dominators.length===0
          ? <div className="cv-empty" style={{padding:'12px 0',fontSize:13}}>Sem dominadores ainda</div>
          : dominators.map((c,i)=>(
            <Row key={c.year} rank={i+1} year={c.year}
              main={<strong>{c.raw.mostTitlesPlayer.name}</strong>}
              sub={`${c.raw.mostTitlesPlayer.count}× títulos`}
            />
          ))}
      </Card>

      <Card title="Calendar Slams" icon="⭐">
        {calSlams.length===0
          ? <div className="cv-empty" style={{padding:'12px 0',fontSize:13}}>Façanha ainda não realizada</div>
          : calSlams.map((c,i)=>(
            <Row key={c.year} rank={i+1} year={c.year}
              main={<><strong>{c.raw.grandSlamDominatorName}</strong> — os 4 Grand Slams</>}
              sub="SLAM" subColor="#C9A84C"
            />
          ))}
      </Card>

      <Card title="Anos Épicos e Dinásticos" icon="✦">
        {epicYears.length===0
          ? <div className="cv-empty" style={{padding:'12px 0',fontSize:13}}>Aguardando o primeiro</div>
          : <div style={{display:'flex',flexWrap:'wrap',gap:8,paddingTop:4}}>
              {epicYears.map(c=>{
                const cfg=TONES[c.tone]??TONES.EPICO;
                return (
                  <div key={c.year} style={{
                    border:`1px solid ${cfg.color}40`, background:`${cfg.color}10`,
                    padding:'5px 12px', display:'flex', alignItems:'center', gap:8,
                  }}>
                    <span style={{fontFamily:T.mono,fontSize:13,color:cfg.color,fontWeight:700}}>{c.year}</span>
                    <span style={{fontFamily:T.serif,fontSize:12,color:'rgba(237,230,216,.5)'}}>
                      {c.headline || c.raw?.rankingLeaderName || ''}
                    </span>
                  </div>
                );
              })}
            </div>
        }
      </Card>
    </div>
  );
}

// ── Rivalidades ───────────────────────────────────────────────────────
function RivalriesPanel({ state }) {
  const rivalries = useMemo(() => {
    if (!state?.rivalrySystem?.rivalries) return [];
    const arr = [];
    for (const [,r] of state.rivalrySystem.rivalries.entries()) {
      if (r.totalMatches >= 2) arr.push(r);
    }
    return arr.sort((a,b) => {
      const aS=(a.status==='LEGENDARY'?1000:0)+(a.intensity??0)*100+a.totalMatches;
      const bS=(b.status==='LEGENDARY'?1000:0)+(b.intensity??0)*100+b.totalMatches;
      return bS-aS;
    });
  }, [state]);

  const getName = useCallback(id=>{
    if(!state) return `#${id}`;
    const all=[...(state.tourPlayers??[]),...(state.retiredPlayers??[])];
    return all.find(p=>p.id===id)?.name??`Jogador ${id}`;
  }, [state]);

  if (rivalries.length===0) return (
    <div className="cv-empty">
      <div style={{marginBottom:12,fontSize:24,opacity:.18}}>⚔️</div>
      <div style={{fontFamily:T.serif,fontSize:18,marginBottom:8}}>
        O circuito ainda não forjou suas grandes rivalidades.
      </div>
      <div style={{fontFamily:T.mono,fontSize:9,letterSpacing:'.16em',color:'rgba(237,230,216,.2)'}}>
        Rivalidades surgem após encontros repetidos nos torneios de maior prestígio.
      </div>
    </div>
  );

  return (
    <div style={{display:'flex',flexDirection:'column',gap:14}}>
      {rivalries.map((r,i)=>{
        const p1=getName(r.p1Id), p2=getName(r.p2Id);
        const typeCfg=RIVA[r.type]??RIVA.CLASSIC;
        const statusCfg=RIVA_STATUS[r.status]??RIVA_STATUS.ACTIVE;
        const total=r.p1Wins+r.p2Wins;
        const p1Pct=total>0?Math.round((r.p1Wins/total)*100):50;
        const isBalanced=Math.abs(r.p1Wins-r.p2Wins)<=total*0.20;
        return (
          <div key={i} style={{
            border:'1px solid rgba(237,230,216,.07)', background:T.paper, padding:'20px 24px',
          }}>
            <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:12,marginBottom:14}}>
              <div style={{fontFamily:T.serif,fontSize:18,color:'rgba(237,230,216,.90)',fontWeight:600}}>
                <strong>{p1}</strong>
                <span style={{color:'rgba(237,230,216,.22)',margin:'0 10px',fontWeight:400}}>×</span>
                <strong>{p2}</strong>
              </div>
              <div style={{display:'flex',gap:6,flexShrink:0}}>
                <span className="cv-riva-chip" style={{background:`${typeCfg.color}18`,border:`1px solid ${typeCfg.color}38`,color:typeCfg.color}}>
                  {typeCfg.icon} {typeCfg.label}
                </span>
                <span className="cv-riva-chip" style={{background:`${statusCfg.color}14`,border:`1px solid ${statusCfg.color}32`,color:statusCfg.color}}>
                  {statusCfg.label}
                </span>
              </div>
            </div>

            {/* H2H bar */}
            <div style={{marginBottom:12}}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:5}}>
                <span style={{fontFamily:T.mono,fontSize:9.5,color:'rgba(237,230,216,.50)'}}>{r.p1Wins}V</span>
                <span style={{fontFamily:T.mono,fontSize:8.5,color:'rgba(237,230,216,.26)',letterSpacing:'.1em'}}>
                  {total} confronto{total!==1?'s':''}
                </span>
                <span style={{fontFamily:T.mono,fontSize:9.5,color:'rgba(237,230,216,.50)'}}>{r.p2Wins}V</span>
              </div>
              <div style={{height:3,background:'rgba(237,230,216,.08)',borderRadius:2,overflow:'hidden'}}>
                <div style={{
                  width:`${p1Pct}%`,height:'100%',borderRadius:2,
                  background:isBalanced
                    ? 'rgba(237,230,216,.38)'
                    : 'linear-gradient(90deg,rgba(237,230,216,.52),rgba(237,230,216,.18))',
                }} />
              </div>
            </div>

            {/* Stats */}
            <div style={{display:'flex',gap:14,flexWrap:'wrap'}}>
              {r.finalsMatches>0 && <span style={{fontFamily:T.mono,fontSize:8,color:'rgba(237,230,216,.35)',letterSpacing:'.1em'}}>🏆 {r.finalsMatches} final{r.finalsMatches!==1?'is':''}</span>}
              {r.tiebreakSets>0  && <span style={{fontFamily:T.mono,fontSize:8,color:'rgba(237,230,216,.35)',letterSpacing:'.1em'}}>⚖️ {r.tiebreakSets} tiebreak{r.tiebreakSets!==1?'s':''}</span>}
              {r.seasons?.length>0 && <span style={{fontFamily:T.mono,fontSize:8,color:'rgba(237,230,216,.25)',letterSpacing:'.1em'}}>
                {r.seasons.length>1?`${r.seasons[0]} — ${r.seasons[r.seasons.length-1]}`:r.seasons[0]}
              </span>}
              {r.intensity>0 && <span style={{fontFamily:T.mono,fontSize:8,color:'rgba(237,230,216,.22)',letterSpacing:'.1em'}}>✦ intensidade {Math.round(r.intensity*100)}%</span>}
            </div>

            {r.narrative && (
              <p style={{fontFamily:T.serif,fontStyle:'italic',fontSize:13,color:'rgba(237,230,216,.48)',lineHeight:1.75,margin:'12px 0 0'}}>
                {r.narrative}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Epitáfios ─────────────────────────────────────────────────────────
function EpitaphsPanel({ engine }) {
  const list = Object.entries(engine?.epitaphs ?? {});
  if (!list.length) return (
    <div className="cv-empty">
      <div style={{marginBottom:12,fontSize:24,opacity:.18}}>🕊️</div>
      <div style={{fontFamily:T.serif,fontSize:18}}>Os epitáfios surgem quando carreiras encerram.</div>
      <div style={{fontFamily:T.mono,fontSize:9,letterSpacing:'.16em',marginTop:10,color:'rgba(237,230,216,.2)'}}>
        Cada despedida merece uma linha permanente neste almanaque.
      </div>
    </div>
  );

  return (
    <div style={{display:'flex',flexDirection:'column',gap:12}}>
      <div style={{fontFamily:T.mono,fontSize:8.5,letterSpacing:'.32em',textTransform:'uppercase',color:'rgba(237,230,216,.28)',marginBottom:4}}>
        🕊️ Carreiras Encerradas
      </div>
      {list.map(([id,text])=>(
        <div key={id} style={{
          borderLeft:'3px solid rgba(107,127,142,.30)',
          background:'rgba(30,40,50,.20)',
          border:'1px solid rgba(107,127,142,.12)',
          padding:'18px 22px',
        }}>
          <p style={{fontFamily:T.serif,fontStyle:'italic',fontSize:14,color:'rgba(237,230,216,.62)',lineHeight:1.88,margin:0}}>
            <RT text={text} />
          </p>
        </div>
      ))}
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────
function extractChronicleExcerpt(entry) {
  const sections = entry?.sections ?? [];
  const sectionText = sections
    .filter(s => s?.text && (s.type === 'opening' || s.type === 'main'))
    .map(s => s.text)
    .join(' ');
  return sectionText || entry?.text || 'O circuito ainda escreve seus capítulos mais profundos.';
}

function getAlmanac(entry) {
  if (entry?.almanac) return entry.almanac;
  const raw = entry?.raw ?? {};
  return {
    year: entry?.year,
    title: entry?.headline ?? `Almanaque da Temporada ${entry?.year ?? ''}`,
    subtitle: extractChronicleExcerpt(entry).slice(0, 220),
    protagonist: raw.grandSlamDominatorName ?? raw.mostTitlesPlayer?.name ?? raw.rankingLeaderName,
    grandSlams: (raw.grandSlamWinners ?? []).map(w => ({
      tournament: w.tournament,
      surface: w.surface,
      champion: w.name,
      runnerUp: w.runnerUpName,
      fiveSetFinal: w.fiveSetFinal,
    })),
    champions: {
      distinct: raw.numChampions,
      mostTitles: raw.mostTitlesPlayer,
      mastersDominator: raw.mastersDominator,
      surfaceDominator: raw.surfaceDominator,
    },
    ranking: {
      leader: raw.rankingLeaderName,
      top25: { players: [], yearEndTop10: [], avgAge: null, nations: [] },
      yearEndTop10: [],
      biggestRiser: raw.biggestRiser,
      biggestFaller: raw.biggestFaller,
      top25Debuts: [],
    },
    arcs: {
      breakthrough: raw.debutSensation,
      majorInjury: raw.majorInjury,
      retirements: raw.retirements ?? [],
      careerMoments: raw.yearCareerMoments ?? [],
      careerSlamCompletions: [],
    },
    rivalries: { main: raw.topRivalry, type: raw.topRivalryType },
    performance: {
      biggestUpset: raw.biggestUpset,
      definingMoments: [
        raw.calendarSlam && `${raw.grandSlamDominatorName} completou o Calendar Slam.`,
        raw.grandSlamSweep && `${raw.grandSlamDominatorName} venceu ${raw.grandSlamDominatorCount} Grand Slams.`,
        raw.biggestUpset && `${raw.biggestUpset.winnerName} assinou a maior zebra da temporada.`,
      ].filter(Boolean),
    },
    legacy: entry?.sections?.find(s => s.type === 'closing')?.text ?? 'Esta temporada ainda carrega dados no formato antigo, mas segue preservada no almanaque.',
    eraMemory: [],
  };
}

function deriveEraMemoryForView(entry, chronicles) {
  if (entry?.almanac?.eraMemory?.length) return entry.almanac.eraMemory;
  const almanac = getAlmanac(entry);
  const prev = (chronicles ?? []).filter(c => c.year < entry.year);
  const notes = [];
  const avg = Number(almanac.ranking?.top25?.avgAge);
  const prevYoungest = prev
    .filter(c => Number.isFinite(Number(getAlmanac(c).ranking?.top25?.avgAge)))
    .sort((a, b) => Number(getAlmanac(a).ranking.top25.avgAge) - Number(getAlmanac(b).ranking.top25.avgAge))[0];
  if (Number.isFinite(avg) && prevYoungest) {
    const prevAvg = Number(getAlmanac(prevYoungest).ranking.top25.avgAge);
    if (avg <= prevAvg + 0.6) {
      notes.push({ type:'YOUNG_TOP25_VIEW', title:'Top 25 historicamente jovem', text:`A media de ${avg} anos ficou perto da referencia jovem de ${prevYoungest.year} (${prevAvg}).` });
    }
  }
  const rivalry = almanac.rivalries?.main;
  if (rivalry?.p1Name && rivalry?.p2Name) {
    const names = [rivalry.p1Name, rivalry.p2Name].sort();
    const appearances = prev.filter(c => {
      const r = getAlmanac(c).rivalries?.main;
      if (!r?.p1Name || !r?.p2Name) return false;
      const rn = [r.p1Name, r.p2Name].sort();
      return rn[0] === names[0] && rn[1] === names[1];
    });
    if (appearances.length) {
      const last = appearances.sort((a, b) => b.year - a.year)[0];
      notes.push({ type:'RIVALRY_VIEW', title:'Rivalidade recorrente', text:`${names[0]} e ${names[1]} ja tinham aparecido no arquivo; a ultima vez foi em ${last.year}.` });
    }
  }
  return notes;
}

function AlmanacStat({ value, label, color = 'rgba(237,230,216,.86)' }) {
  return (
    <div className="cv-stat-tile" style={{ position:'relative', overflow:'hidden' }}>
      <div style={{ position:'absolute', inset:'auto 10px 8px auto', width:34, height:34, borderRadius:'50%', background:`${color}10`, filter:'blur(1px)' }} />
      <div style={{ fontFamily:T.serif, fontSize:32, lineHeight:1, color, position:'relative' }}>{value ?? '—'}</div>
      <div style={{ fontFamily:T.mono, fontSize:7.5, letterSpacing:'.16em', textTransform:'uppercase', color:'rgba(237,230,216,.28)', marginTop:7 }}>
        {label}
      </div>
    </div>
  );
}

function AlmanacSection({ title, kicker, children }) {
  return (
    <section className="cv-panel" style={{ padding:26, position:'relative', overflow:'hidden' }}>
      <div style={{ position:'absolute', inset:'0 0 auto', height:1, background:'linear-gradient(90deg, transparent, rgba(237,230,216,.18), transparent)' }} />
      <div className="cv-section-title">
        <div>
          {kicker && (
            <div style={{ fontFamily:T.mono, fontSize:8, letterSpacing:'.3em', textTransform:'uppercase', color:'rgba(237,230,216,.28)', marginBottom:9 }}>
              {kicker}
            </div>
          )}
          <h2>{title}</h2>
        </div>
        <div style={{ width:48, height:1, background:'linear-gradient(90deg, rgba(237,230,216,.22), transparent)' }} />
      </div>
      {children}
    </section>
  );
}

function EditorialCallout({ tone, label, title, text }) {
  return (
    <div className="cv-editorial-card" style={{
      '--cv-tone-glow': tone.glow,
      border:`1px solid ${tone.color}28`,
      background:`linear-gradient(145deg, ${tone.bg}, rgba(237,230,216,.024))`,
      padding:18,
      minHeight:126,
    }}>
      <div style={{ position:'relative', fontFamily:T.mono, fontSize:7.5, letterSpacing:'.22em', textTransform:'uppercase', color:tone.color, marginBottom:9 }}>
        {label}
      </div>
      <div style={{ position:'relative', fontFamily:T.serif, fontSize:27, lineHeight:1.02, color:'rgba(237,230,216,.92)', marginBottom:10 }}>
        {title ?? '—'}
      </div>
      {text && (
        <div style={{ position:'relative', fontFamily:T.serif, fontSize:14.5, lineHeight:1.62, color:'rgba(237,230,216,.54)' }}>
          {text}
        </div>
      )}
    </div>
  );
}

function getEditorialAwards(almanac, top25) {
  const protagonist = almanac.protagonist ?? almanac.ranking?.leader ?? almanac.champions?.bigTitleLeader?.name;
  const winnerText = almanac.champions?.bigTitleLeader
    ? `${almanac.champions.bigTitleLeader.big ?? 0} titulos grandes no peso historico da temporada.`
    : almanac.champions?.mostTitles
      ? `${almanac.champions.mostTitles.count} titulos no ano.`
      : 'Foi o nome que a temporada mais repetiu.';
  const loser = almanac.performance?.almostSeason?.name ?? almanac.ranking?.biggestFaller?.name ?? almanac.arcs?.majorInjury?.name;
  const loserText = almanac.performance?.almostSeason
    ? `${almanac.performance.almostSeason.count} finais grandes perdidas deixaram uma cicatriz estatistica.`
    : almanac.ranking?.biggestFaller
      ? `Caiu de #${almanac.ranking.biggestFaller.fromRank} para #${almanac.ranking.biggestFaller.toRank}.`
      : almanac.arcs?.majorInjury
        ? `A lesao mudou o teto da temporada.`
        : 'Nenhuma queda unica dominou a narrativa.';
  const future = top25.youngest?.name ?? almanac.ranking?.top25Debuts?.[0]?.name ?? almanac.arcs?.breakthrough?.name;
  const futureText = top25.youngest
    ? `${top25.youngest.age} anos e ja dentro da elite de fechamento.`
    : almanac.ranking?.top25Debuts?.[0]
      ? `Entrou no top 25 e virou ponto de atencao para a proxima era.`
      : 'O ano guardou pistas discretas, nao uma explosao unica.';
  return { protagonist, winnerText, loser, loserText, future, futureText };
}

function YearShelf({ chronicles, onOpen }) {
  if (!chronicles?.length) {
    return (
      <div className="cv-empty cv-panel" style={{ padding:72 }}>
        <div style={{ fontFamily:T.serif, fontSize:24, marginBottom:10 }}>O Almanaque ainda aguarda a primeira temporada completa.</div>
        <div style={{ fontFamily:T.mono, fontSize:9, letterSpacing:'.18em', color:'rgba(237,230,216,.22)' }}>
          Ao fechar um ano, a edição entra aqui como memória permanente.
        </div>
      </div>
    );
  }

  return (
    <div className="cv-mosaic">
      {chronicles.map((entry, index) => {
        const almanac = getAlmanac(entry);
        const tone = TONES[entry.tone] ?? TONES.TRANSICAO;
        return (
          <button
            key={entry.year}
            className="cv-year-card"
            onClick={() => onOpen(entry.year)}
            style={{
              '--cv-tone-color': tone.color,
              '--cv-tone-glow': tone.glow,
              minHeight:220,
              borderColor:`${tone.color}28`,
              background:`linear-gradient(160deg, ${tone.bg}, rgba(12,18,23,.94) 62%, rgba(237,230,216,.025))`,
              animation:'cv-in .45s ease both',
              animationDelay:`${index * 0.04}s`,
            }}
          >
            <div>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:18 }}>
                <span className="cv-year-number">{entry.year}</span>
                <span className="cv-pill" style={{ borderColor:`${tone.color}44`, color:tone.color, background:`${tone.color}10` }}>{tone.label}</span>
              </div>
              <div className="cv-year-mini-line" />
              <div style={{ fontFamily:T.serif, fontSize:24, lineHeight:1.04, color:'rgba(237,230,216,.9)', marginBottom:12, textWrap:'balance' }}>
                {almanac.title ?? entry.headline}
              </div>
              <div style={{ fontFamily:T.serif, fontSize:14.5, lineHeight:1.55, color:'rgba(237,230,216,.46)' }}>
                {almanac.subtitle || extractChronicleExcerpt(entry).slice(0, 150)}
              </div>
            </div>
            <div style={{ display:'flex', gap:5, flexWrap:'wrap', marginTop:16 }}>
              {(entry.tags ?? []).slice(0, 3).map(tag => <span key={tag} className="cv-tag">{tag}</span>)}
            </div>
          </button>
        );
      })}
    </div>
  );
}

function AlmanacDetail({ entry, onBack, chronicles = [] }) {
  const almanac = { ...getAlmanac(entry), eraMemory: deriveEraMemoryForView(entry, chronicles) };
  const raw = entry?.raw ?? {};
  const tone = TONES[entry?.tone] ?? TONES.TRANSICAO;
  const top25 = almanac.ranking?.top25 ?? {};
  const topPlayers = top25.players ?? [];
  const yearEndTop10 = almanac.ranking?.yearEndTop10 ?? top25.yearEndTop10 ?? [];
  const no1Race = almanac.ranking?.numberOneRace ?? null;
  const moments = almanac.performance?.definingMoments ?? [];
  const awards = getEditorialAwards(almanac, top25);

  return (
    <div className="cv-almanac-page" style={{ display:'grid', gap:18 }}>
      <button className="cv-filter" onClick={onBack} style={{ justifySelf:'start', border:'1px solid rgba(237,230,216,.12)', color:'rgba(237,230,216,.58)' }}>
        voltar aos anos
      </button>

      <section className="cv-season-cover" style={{ '--cv-tone-glow': tone.glow, padding:'clamp(28px, 4vw, 52px)' }}>
        <div className="cv-cover-year">{entry.year}</div>
        <div style={{ position:'relative', zIndex:1 }}>
          <div style={{ display:'flex', justifyContent:'space-between', gap:16, alignItems:'flex-start', flexWrap:'wrap', marginBottom:18 }}>
            <div>
              <div style={{ fontFamily:T.mono, fontSize:8, letterSpacing:'.34em', textTransform:'uppercase', color:tone.color, marginBottom:10 }}>
                almanaque da temporada · edição {entry.year}
              </div>
            </div>
            <span className="cv-pill" style={{ borderColor:`${tone.color}55`, color:tone.color, background:`${tone.color}12` }}>{tone.label}</span>
          </div>
          <div className="cv-cover-title">
            {almanac.title ?? entry.headline}
          </div>
          {almanac.subtitle && (
            <p className="cv-cover-deck">
              {almanac.subtitle}
            </p>
          )}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(170px, 1fr))', gap:10, marginTop:24 }}>
            <AlmanacStat value={almanac.ranking?.leader ?? raw.rankingLeaderName} label="fechou como #1" color={tone.color} />
            <AlmanacStat value={almanac.champions?.mostTitles?.count ?? raw.mostTitlesPlayer?.count ?? 0} label="maior colheita de títulos" />
            <AlmanacStat value={top25.avgAge ?? '—'} label="idade média do top 25" />
            <AlmanacStat value={raw.numChampions ?? 0} label="campeões diferentes" />
          </div>
        </div>
      </section>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(230px, 1fr))', gap:12 }}>
        <EditorialCallout tone={tone} label="ganhou o ano" title={awards.protagonist} text={awards.winnerText} />
        <EditorialCallout tone={tone} label="perdeu terreno" title={awards.loser ?? 'sem queda central'} text={awards.loserText} />
        <EditorialCallout tone={tone} label="sinal do futuro" title={awards.future ?? 'em aberto'} text={awards.futureText} />
      </div>

      <AlmanacSection title="Os Grand Slams" kicker="onde a temporada ganhou peso">
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(190px, 1fr))', gap:10 }}>
          {(almanac.grandSlams ?? []).map((slam, i) => {
            const s = SURF[slam.surface] ?? SURF.HARD;
            return (
              <div className="cv-slam-card" key={`${slam.tournament}-${i}`} style={{ '--slam-color': s.color, border:`1px solid ${s.color}35`, background:`linear-gradient(155deg, ${s.color}14, rgba(237,230,216,.018))`, padding:16, position:'relative', overflow:'hidden', minHeight:152 }}>
                <div style={{ position:'absolute', right:12, top:8, fontFamily:T.serif, fontSize:46, color:`${s.color}20`, lineHeight:1 }}>{i + 1}</div>
                <div style={{ fontFamily:T.mono, fontSize:7.5, letterSpacing:'.18em', textTransform:'uppercase', color:s.color, marginBottom:10 }}>{slam.tournament}</div>
                <div style={{ fontFamily:T.serif, fontSize:24, color:'rgba(237,230,216,.93)', lineHeight:1.06 }}>{slam.champion}</div>
                <div style={{ fontFamily:T.serif, fontSize:14, color:'rgba(237,230,216,.48)', marginTop:9 }}>contra {slam.runnerUp ?? 'finalista desconhecido'}</div>
                <div style={{ display:'flex', gap:5, flexWrap:'wrap', marginTop:12 }}>
                  <span className="cv-tag">{s.label}</span>
                  {slam.fiveSetFinal && <span className="cv-tag">5 sets</span>}
                </div>
              </div>
            );
          })}
        </div>
      </AlmanacSection>

      {(almanac.bigFinals ?? []).length > (almanac.grandSlams ?? []).length && (
        <AlmanacSection title="Finais Que Moldaram o Ano" kicker="masters, finals e clash">
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(330px, 1fr))', gap:8 }}>
            {(almanac.bigFinals ?? [])
              .filter(f => f.category !== 'GRAND_SLAM')
              .slice(0, 8)
              .map((final, i) => {
                const s = SURF[final.surface] ?? SURF.HARD;
                return (
                  <div key={`${final.tournament}-${i}`} style={{ display:'grid', gridTemplateColumns:'90px 1fr', gap:12, alignItems:'center', border:'1px solid rgba(237,230,216,.07)', background:'rgba(237,230,216,.018)', padding:'11px 13px' }}>
                    <div style={{ fontFamily:T.mono, fontSize:7.5, letterSpacing:'.16em', textTransform:'uppercase', color:s.color }}>{final.category}</div>
                    <div>
                      <div style={{ fontFamily:T.serif, fontSize:16.5, color:'rgba(237,230,216,.82)', lineHeight:1.2 }}>{final.champion} venceu {final.runnerUp ?? 'finalista desconhecido'}</div>
                      <div style={{ fontFamily:T.mono, fontSize:7.5, letterSpacing:'.12em', textTransform:'uppercase', color:'rgba(237,230,216,.28)', marginTop:4 }}>{final.tournament}</div>
                    </div>
                  </div>
                );
              })}
          </div>
        </AlmanacSection>
      )}

      <AlmanacSection title="Freeze do Ranking" kicker="como o ano terminou">
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(320px, 1fr))', gap:18 }}>
          <div className="cv-table-box" style={{ display:'grid', gap:0, padding:'4px 14px' }}>
            {yearEndTop10.length ? yearEndTop10.map(p => <Top10FreezeRow key={`${p.rank}-${p.name}`} p={p} />) : (
              <div className="cv-empty" style={{ padding:'18px 0' }}>Este save antigo ainda nao tem freeze de top 10 registrado.</div>
            )}
          </div>
          <div className="cv-table-box" style={{ padding:20, position:'relative', overflow:'hidden' }}>
            <div style={{ position:'absolute', right:-30, top:-30, width:120, height:120, borderRadius:'50%', background:`${tone.color}10`, filter:'blur(4px)' }} />
            <div style={{ fontFamily:T.mono, fontSize:8, letterSpacing:'.24em', textTransform:'uppercase', color:'rgba(237,230,216,.28)', marginBottom:12 }}>
              corrida pelo #1
            </div>
            {no1Race?.leader ? (
              <>
                <div style={{ fontFamily:T.serif, fontSize:28, color:'rgba(237,230,216,.9)', lineHeight:1.05 }}>{no1Race.leader.name}</div>
                <div style={{ fontFamily:T.serif, fontSize:15, color:'rgba(237,230,216,.48)', lineHeight:1.6, marginTop:10 }}>
                  fechou o ano no topo{no1Race.leader.points ? ` com ${no1Race.leader.points} pontos` : ''}.
                  {no1Race.challenger && no1Race.gap !== null ? ` ${no1Race.challenger.name} terminou a ${no1Race.gap} pontos.` : ''}
                </div>
                <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginTop:14 }}>
                  {no1Race.wasTight && <span className="cv-tag">disputa apertada</span>}
                  {no1Race.wasBlowout && <span className="cv-tag">dominio amplo</span>}
                </div>
              </>
            ) : (
              <div className="cv-empty" style={{ padding:'18px 0' }}>Sem dados suficientes para reconstruir a corrida.</div>
            )}
          </div>
        </div>
      </AlmanacSection>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(320px, 1fr))', gap:18 }}>
        <AlmanacSection title="O Que Importou" kicker="acontecimentos grandes">
          <div style={{ display:'grid', gap:10 }}>
            {moments.length ? moments.map((m, i) => (
              <div key={i} style={{ padding:'12px 14px', border:'1px solid rgba(237,230,216,.08)', background:'rgba(237,230,216,.025)', fontFamily:T.serif, fontSize:16, lineHeight:1.65, color:'rgba(237,230,216,.76)' }}>
                {m}
              </div>
            )) : <div className="cv-empty" style={{ padding:'16px 0' }}>Ano sem terremoto unico, mas cheio de sinais acumulados.</div>}
          </div>
        </AlmanacSection>

        <AlmanacSection title="Dominio e Forma" kicker="desempenho">
          <div style={{ display:'grid', gap:10 }}>
            {almanac.champions?.mostTitles && <div className="cv-figure-row"><span>Mais títulos</span><strong>{almanac.champions.mostTitles.name} · {almanac.champions.mostTitles.count}</strong></div>}
            {almanac.champions?.bigTitleLeader && <div className="cv-figure-row"><span>Peso em torneios grandes</span><strong>{almanac.champions.bigTitleLeader.name}</strong></div>}
            {almanac.champions?.titleStreak?.count >= 2 && <div className="cv-figure-row"><span>Títulos seguidos</span><strong>{almanac.champions.titleStreak.name} · {almanac.champions.titleStreak.count}</strong></div>}
            {almanac.performance?.formLeaders?.slice(0,3).map(p => <div key={p.id} className="cv-figure-row"><span>Vitórias registradas</span><strong>{p.name} · {p.wins}</strong></div>)}
            {almanac.performance?.almostSeason && <div className="cv-figure-row"><span>Temporada do quase</span><strong>{almanac.performance.almostSeason.name} · {almanac.performance.almostSeason.count} finais</strong></div>}
            {almanac.performance?.bestWithoutSlam && <div className="cv-figure-row"><span>Elite sem Slam no ano</span><strong>{almanac.performance.bestWithoutSlam.name}</strong></div>}
          </div>
        </AlmanacSection>
      </div>

      <AlmanacSection title="Top 25 de Fechamento" kicker="o retrato da elite">
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(145px, 1fr))', gap:10, marginBottom:18 }}>
          <AlmanacStat value={top25.avgAge ?? '—'} label="idade média" />
          <AlmanacStat value={top25.under23 ?? 0} label="até 23 anos" color="#4EAC6E" />
          <AlmanacStat value={top25.over30 ?? 0} label="30+ anos" color="#C9A84C" />
          <AlmanacStat value={top25.youngest?.name ?? '—'} label="mais jovem" />
          <AlmanacStat value={top25.highestOverall?.name ?? '—'} label="maior overall" />
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(330px, 1fr))', gap:18 }}>
          <div className="cv-table-box" style={{ padding:'6px 14px 10px' }}>
            {topPlayers.slice(0, 13).map(p => <Top25Row key={p.id} p={p} />)}
          </div>
          <div className="cv-table-box" style={{ padding:'6px 14px 10px' }}>
            {topPlayers.slice(13, 25).map(p => <Top25Row key={p.id} p={p} />)}
          </div>
        </div>
        <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginTop:16 }}>
          {(top25.nations ?? []).map(n => <span key={n.code} className="cv-tag">{n.code} · {n.count}</span>)}
        </div>
      </AlmanacSection>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(240px, 1fr))', gap:18 }}>
        <AlmanacSection title="Ascensões" kicker="quem chegou">
          {(almanac.ranking?.top25Debuts ?? []).length ? almanac.ranking.top25Debuts.map(p => (
            <div key={p.name} className="cv-figure-row"><span>{p.age} anos · {p.nationality}</span><strong>#{p.rank} {p.name}</strong></div>
          )) : <div className="cv-empty" style={{ padding:'12px 0' }}>Sem estreia forte no top 25.</div>}
        </AlmanacSection>
        <AlmanacSection title="Quedas" kicker="quem perdeu terreno">
          {almanac.ranking?.biggestFaller ? <div className="cv-figure-row"><span>{almanac.ranking.biggestFaller.fromRank} → {almanac.ranking.biggestFaller.toRank}</span><strong>{almanac.ranking.biggestFaller.name}</strong></div> : <div className="cv-empty" style={{ padding:'12px 0' }}>Nenhuma queda dominante registrada.</div>}
          {almanac.arcs?.majorInjury && <div className="cv-figure-row"><span>lesão grau {almanac.arcs.majorInjury.grade}</span><strong>{almanac.arcs.majorInjury.name}</strong></div>}
        </AlmanacSection>
        <AlmanacSection title="Legado" kicker="o que fica">
          <p style={{ fontFamily:T.serif, fontSize:17, lineHeight:1.75, color:'rgba(237,230,216,.72)', margin:0 }}>
            {almanac.legacy}
          </p>
        </AlmanacSection>
      </div>

      {(almanac.eraMemory ?? []).length > 0 && (
        <AlmanacSection title="Ecos da Era" kicker="comparacoes com o arquivo">
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(260px, 1fr))', gap:10 }}>
            {almanac.eraMemory.map((note, index) => (
              <div key={`${note.type}-${index}`} style={{
                border:'1px solid rgba(74,142,194,.16)',
                borderLeft:'3px solid rgba(74,142,194,.55)',
                background:'rgba(74,142,194,.055)',
                padding:'14px 16px',
              }}>
                <div style={{ fontFamily:T.mono, fontSize:7.5, letterSpacing:'.2em', textTransform:'uppercase', color:'#4A8EC2', marginBottom:8 }}>
                  {note.title}
                </div>
                <div style={{ fontFamily:T.serif, fontSize:15.5, lineHeight:1.7, color:'rgba(237,230,216,.70)' }}>
                  {note.text}
                </div>
              </div>
            ))}
          </div>
        </AlmanacSection>
      )}

      {(almanac.arcs?.careerSlamCompletions?.length > 0 || almanac.arcs?.retirements?.length > 0 || almanac.rivalries?.main) && (
        <AlmanacSection title="Arquivo Histórico" kicker="marcos que sobrevivem ao ano">
          <div style={{ display:'grid', gap:10 }}>
            {(almanac.arcs?.careerSlamCompletions ?? []).map(c => <div key={c.id} className="cv-figure-row"><span>Career Slam</span><strong>{c.name}</strong></div>)}
            {(almanac.arcs?.retirements ?? []).map(r => <div key={r.name} className="cv-figure-row"><span>{r.isLegend ? 'despedida de lenda' : 'aposentadoria'}</span><strong>{r.name}</strong></div>)}
            {almanac.rivalries?.main && <div className="cv-figure-row"><span>rivalidade do ano</span><strong>{almanac.rivalries.main.p1Name} × {almanac.rivalries.main.p2Name}</strong></div>}
          </div>
        </AlmanacSection>
      )}
    </div>
  );
}

function Top25Row({ p }) {
  const move = p.move === null ? '—' : p.move > 0 ? `+${p.move}` : String(p.move);
  return (
    <div className="cv-top-row" style={{ display:'grid', gridTemplateColumns:'42px 1fr 46px 54px 44px', gap:8, alignItems:'center', padding:'8px 0', borderBottom:'1px solid rgba(237,230,216,.055)' }}>
      <span style={{ fontFamily:T.mono, color:'rgba(237,230,216,.38)', fontSize:10 }}>#{p.rank}</span>
      <span style={{ fontFamily:T.serif, color:'rgba(237,230,216,.82)', fontSize:15 }}>{p.name}</span>
      <span style={{ fontFamily:T.mono, color:'rgba(237,230,216,.34)', fontSize:9 }}>{p.age}a</span>
      <span style={{ fontFamily:T.mono, color:'rgba(237,230,216,.30)', fontSize:9 }}>{p.nationality ?? '---'}</span>
      <span style={{ fontFamily:T.mono, color:p.move > 0 ? '#4EAC6E' : p.move < 0 ? '#D47840' : 'rgba(237,230,216,.24)', fontSize:9, textAlign:'right' }}>{move}</span>
    </div>
  );
}

function Top10FreezeRow({ p }) {
  const move = p.move === null || p.move === undefined ? '—' : p.move > 0 ? `+${p.move}` : String(p.move);
  return (
    <div className="cv-top-row" style={{ display:'grid', gridTemplateColumns:'44px 1fr 90px 54px', gap:10, alignItems:'center', padding:'9px 0', borderBottom:'1px solid rgba(237,230,216,.06)' }}>
      <span style={{ fontFamily:T.mono, fontSize:11, color:'rgba(237,230,216,.44)' }}>#{p.rank}</span>
      <span style={{ fontFamily:T.serif, fontSize:17, color:'rgba(237,230,216,.86)' }}>{p.name}</span>
      <span style={{ fontFamily:T.mono, fontSize:10, color:'rgba(237,230,216,.44)', textAlign:'right' }}>{p.points ?? '—'} pts</span>
      <span style={{ fontFamily:T.mono, fontSize:9, color:p.move > 0 ? '#4EAC6E' : p.move < 0 ? '#D47840' : 'rgba(237,230,216,.24)', textAlign:'right' }}>{move}</span>
    </div>
  );
}

function ChronicleArchive({ all, displayed, query, toneFilter, toneCounts, expandedYears, setQuery, setToneFilter, onToggle }) {
  return (
    <section className="cv-panel" style={{ padding:22 }}>
      <div style={{ marginBottom:18 }}>
        <div style={{ fontFamily:T.mono, fontSize:8, letterSpacing:'.3em', textTransform:'uppercase', color:'rgba(237,230,216,.28)', marginBottom:8 }}>
          arquivo narrativo
        </div>
        <div style={{ fontFamily:T.serif, fontSize:30, color:'rgba(237,230,216,.92)' }}>A memória longa do circuito</div>
      </div>

      <div style={{ position:'relative', marginBottom:18 }}>
        <span style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', color:'rgba(237,230,216,.28)', fontSize:12, pointerEvents:'none' }}>⌕</span>
        <input className="cv-search" placeholder="Buscar por nome, evento, tom, ano ou saga..." value={query} onChange={e => setQuery(e.target.value)} />
      </div>

      {all.length > 0 && (
        <div style={{ display:'flex', gap:5, flexWrap:'wrap', marginBottom:24 }}>
          <button className="cv-filter" onClick={() => setToneFilter(null)} style={{
            border:`1px solid ${!toneFilter ? 'rgba(237,230,216,.38)' : 'rgba(237,230,216,.10)'}`,
            color:!toneFilter ? '#EDE6D8' : 'rgba(237,230,216,.28)',
            background:!toneFilter ? 'rgba(237,230,216,.06)' : 'transparent',
          }}>
            todos ({all.length})
          </button>
          {Object.entries(TONES).map(([tone, cfg]) => {
            const count = toneCounts[tone] ?? 0;
            if (!count) return null;
            const active = toneFilter === tone;
            return (
              <button
                key={tone}
                className="cv-filter"
                onClick={() => setToneFilter(active ? null : tone)}
                style={{
                  border:`1px solid ${active ? `${cfg.color}60` : 'rgba(237,230,216,.08)'}`,
                  background:active ? cfg.bg : 'transparent',
                  color:active ? cfg.color : 'rgba(237,230,216,.28)',
                }}
              >
                {cfg.label} ({count})
              </button>
            );
          })}
        </div>
      )}

      {all.length === 0 ? (
        <div className="cv-empty">
          <div style={{ fontSize:32, marginBottom:16, opacity:.14 }}>📘</div>
          <div style={{ fontFamily:T.serif, fontSize:20, marginBottom:10 }}>O arquivo ainda aguarda seu primeiro capítulo.</div>
        </div>
      ) : displayed.length === 0 ? (
        <div className="cv-empty">
          <div style={{ fontFamily:T.serif, fontSize:16 }}>Nenhuma crônica encontrada{query ? ` para "${query}"` : ''}.</div>
        </div>
      ) : (
        <div className="cv-archive-grid">
          {displayed.map((entry, i) => (
            <ChronicleEntry
              key={entry.year}
              entry={entry}
              index={i}
              expanded={expandedYears.has(entry.year)}
              onToggle={() => onToggle(entry.year)}
            />
          ))}
        </div>
      )}
    </section>
  );
}

export default function ChronicleView({ state, onBack }) {
  const [activeTab, setActiveTab] = useState('edition');
  const [query, setQuery] = useState('');
  const [expandedYears, setExpandedYears] = useState(new Set());
  const [toneFilter, setToneFilter] = useState(null);
  const [selectedYear, setSelectedYear] = useState(null);

  const engine = state?.chronicleEngine;
  const all = engine?.chronicles ?? [];
  const selectedEntry = selectedYear ? all.find(e => e.year === selectedYear) : null;

  const displayed = useMemo(() => {
    let list = all;
    if (toneFilter) list = list.filter(c=>c.tone===toneFilter);
    if (!query.trim()) return list;
    return (engine?.search(query)??[]).filter(c=>!toneFilter||c.tone===toneFilter);
  }, [all, query, engine, toneFilter]);

  const toneCounts = useMemo(()=>{
    const c={};
    all.forEach(e=>{c[e.tone]=(c[e.tone]??0)+1;});
    return c;
  }, [all]);

  const toggle = useCallback(year=>{
    setExpandedYears(prev=>{const n=new Set(prev);n.has(year)?n.delete(year):n.add(year);return n;});
  },[]);

  const heroStat = (val, label, color='rgba(237,230,216,.85)') => (
    <div style={{textAlign:'center'}}>
      <div style={{fontFamily:T.serif,fontSize:28,color,fontWeight:600,lineHeight:1}}>{val}</div>
      <div style={{fontFamily:T.mono,fontSize:7,letterSpacing:'.22em',textTransform:'uppercase',color:'rgba(237,230,216,.28)',marginTop:6}}>{label}</div>
    </div>
  );

  const viewTabs = [
    { id:'edition', label:'Almanaque' },
    { id:'timeline', label:'📜 Timeline' },
    { id:'rivalries', label:'⚔️ Rivalidades' },
    { id:'archives', label:'🏛️ Arquivos' },
  ];

  return (
    <div className="cv-root" style={{ paddingBottom:80 }}>
      <style>{CSS}</style>

      {onBack && (
        <div style={{
          height:48, background:'#080F14', borderBottom:'1px solid rgba(237,230,216,.08)',
          display:'flex', alignItems:'center', padding:'0 28px', gap:16,
        }}>
          <button onClick={onBack} style={{
            background:'none', border:'1px solid rgba(255,255,255,.10)',
            color:'rgba(255,255,255,.45)', fontFamily:T.mono,
            fontSize:9, letterSpacing:'2px', padding:'4px 14px',
            cursor:'pointer', textTransform:'uppercase',
          }}>← Voltar</button>
          <div style={{ width:1, height:20, background:'rgba(255,255,255,.08)' }} />
          <div style={{ fontFamily:T.mono, fontSize:8, letterSpacing:'.3em', textTransform:'uppercase', color:'rgba(237,230,216,.28)' }}>
            salão das crônicas
          </div>
        </div>
      )}

      <div className="cv-shell">
        <div style={{ textAlign:'center', marginBottom:46, position:'relative' }}>
          <div style={{ fontFamily:T.mono, fontSize:8, letterSpacing:'.7em', textTransform:'uppercase', color:'rgba(237,230,216,.22)', marginBottom:18 }}>
            Tennis Universe · memorial editorial do circuito
          </div>

          <h1 className="cv-main-title" style={{
            fontFamily:T.serif,
            fontSize:'clamp(48px,7vw,96px)',
            color:'rgba(237,230,216,.94)',
            lineHeight:.9,
            letterSpacing:'-.035em',
            margin:'0 0 10px',
            fontWeight:600,
          }}>
            Almanaque da Temporada
          </h1>

          <p style={{ fontFamily:T.serif, fontStyle:'italic', color:'rgba(237,230,216,.38)', fontSize:19, margin:'26px auto 0', maxWidth:760, lineHeight:1.55 }}>
            A coleção ano a ano onde resultados viram memória, rankings viram eras e detalhes viram história.
          </p>

          {all.length > 0 && (
            <div style={{ display:'flex', justifyContent:'center', gap:40, flexWrap:'wrap', marginTop:26 }}>
              {heroStat(all.length, 'temporadas')}
              {heroStat((toneCounts.EPICO ?? 0) + (toneCounts.DINASTICO ?? 0), 'anos míticos', '#D4621A')}
              {heroStat(toneCounts.PRODIGIO ?? 0, 'nascimentos de era', '#4EAC6E')}
              {heroStat(all.filter(c => c.raw?.calendarSlam).length, 'calendar slams', '#C9A84C')}
            </div>
          )}
        </div>

        <div style={{ display:'flex', gap:0, borderBottom:'1px solid rgba(237,230,216,.08)', marginBottom:26, paddingBottom:1, flexWrap:'wrap' }}>
          {viewTabs.map(tab => (
            <button
              key={tab.id}
              className={`cv-tab ${activeTab===tab.id?'active':''}`}
              style={{ color:activeTab===tab.id ? '#EDE6D8' : 'rgba(237,230,216,.28)' }}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'edition' && (
          selectedEntry
            ? <AlmanacDetail entry={selectedEntry} chronicles={all} onBack={() => setSelectedYear(null)} />
            : <YearShelf chronicles={all} onOpen={setSelectedYear} />
        )}

        {activeTab === 'timeline' && (
          <ChronicleArchive
            all={all}
            displayed={displayed}
            query={query}
            toneFilter={toneFilter}
            toneCounts={toneCounts}
            expandedYears={expandedYears}
            setQuery={setQuery}
            setToneFilter={setToneFilter}
            onToggle={toggle}
          />
        )}

        {activeTab === 'rivalries' && <RivalriesPanel state={state} />}

        {activeTab === 'archives' && (
          <div style={{ display:'grid', gap:18 }}>
            <RankingsPanel chronicles={all} />
            <EpitaphsPanel engine={engine} />
          </div>
        )}

        <div style={{ marginTop:72, textAlign:'center' }}>
          <div style={{ width:80, height:1, background:'linear-gradient(90deg,transparent,rgba(237,230,216,.10),transparent)', margin:'0 auto 14px' }} />
          <div style={{ fontFamily:T.mono, fontSize:7, letterSpacing:'.4em', textTransform:'uppercase', color:'rgba(237,230,216,.14)' }}>
            — anais do circuito —
          </div>
        </div>
      </div>
    </div>
  );

}



