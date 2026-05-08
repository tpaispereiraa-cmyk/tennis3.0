// ════════════════════════════════════════════════════════════════════
// 📖 CHRONICLE VIEW — Tennis Universe  (redesign editorial v2)
// ════════════════════════════════════════════════════════════════════
import React, { useState, useMemo, useCallback } from 'react';

// ── Design tokens ────────────────────────────────────────────────────
const T = {
  bg:      '#06090B',
  paper:   '#0C1217',
  card:    '#101820',
  cream:   '#EDE6D8',
  dim:     'rgba(237,230,216,.55)',
  ghost:   'rgba(237,230,216,.22)',
  line:    'rgba(237,230,216,.08)',
  serif:   "'Cormorant Garamond', 'Cormorant', Georgia, serif",
  sans:    "'Barlow Condensed', 'Barlow', sans-serif",
  mono:    "'Space Mono', monospace",
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

  .cv-root { font-family: 'Barlow', sans-serif; background: #06090B; color: #EDE6D8; min-height:100vh; }
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

function buildHeroFigures(entry) {
  const raw = entry?.raw ?? {};
  const figures = [];
  const rivalryLabel =
    typeof raw.topRivalry === 'string'
      ? raw.topRivalry
      : raw.topRivalry && typeof raw.topRivalry === 'object'
        ? `${raw.topRivalry.p1Name ?? 'Jogador 1'} × ${raw.topRivalry.p2Name ?? 'Jogador 2'}`
        : null;
  if (raw.rankingLeaderName) figures.push({ label:'líder do mundo', value:raw.rankingLeaderName });
  if (raw.grandSlamDominatorName) figures.push({ label:'peso nos majors', value:raw.grandSlamDominatorName });
  if (raw.mostTitlesPlayer?.name) figures.push({ label:'colecionador de títulos', value:raw.mostTitlesPlayer.name });
  if (raw.debutSensation?.name) figures.push({ label:'estrela em ascensão', value:raw.debutSensation.name });
  if (rivalryLabel) figures.push({ label:'saga do ano', value:rivalryLabel });
  if (raw.retirements?.length) figures.push({ label:'despedida maior', value:raw.retirements[0].name });
  return figures.slice(0, 5);
}

function ChronicleHero({ featured, flashbacks, totalCount, toneCounts, onOpenArchive }) {
  if (!featured) {
    return (
      <div className="cv-empty cv-panel" style={{ padding:72 }}>
        <div style={{ fontSize:34, marginBottom:18, opacity:.14 }}>📖</div>
        <div style={{ fontFamily:T.serif, fontSize:24, marginBottom:10 }}>As Crônicas ainda aguardam a primeira temporada completa.</div>
        <div style={{ fontFamily:T.mono, fontSize:9, letterSpacing:'.18em', color:'rgba(237,230,216,.22)' }}>
          Quando o circuito terminar seu primeiro ciclo, esta capa passará a contar sua história.
        </div>
      </div>
    );
  }

  const tone = TONES[featured.tone] ?? TONES.TRANSICAO;
  const raw = featured.raw ?? {};
  const figures = buildHeroFigures(featured);
  const excerpt = extractChronicleExcerpt(featured);
  const stats = [
    { value: totalCount, label:'temporadas registradas', color:'rgba(237,230,216,.88)' },
    { value: (toneCounts.EPICO ?? 0) + (toneCounts.DINASTICO ?? 0), label:'anos lendários', color:'#D4621A' },
    { value: toneCounts.PRODIGIO ?? 0, label:'anos de prodígio', color:'#4EAC6E' },
    { value: toneCounts.TRAGICO ?? 0, label:'anos de queda', color:'#6B7F8E' },
  ];

  return (
    <section className="cv-hero-grid" style={{ marginBottom:24 }}>
      <div className="cv-panel" style={{ padding:28, position:'relative', overflow:'hidden' }}>
        <div style={{
          position:'absolute', inset:0, pointerEvents:'none',
          background:`radial-gradient(circle at 16% 22%, ${tone.glow}, transparent 34%), radial-gradient(circle at 84% 10%, rgba(237,230,216,.06), transparent 24%)`,
        }} />

        <div style={{ position:'relative', zIndex:1 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, marginBottom:18, flexWrap:'wrap' }}>
            <span className="cv-pill" style={{ borderColor:`${tone.color}44`, background:tone.bg, color:tone.color }}>
              edição principal · {featured.year}
            </span>
            <span className="cv-pill" style={{ borderColor:'rgba(237,230,216,.10)' }}>{tone.label}</span>
          </div>

          <div style={{ fontFamily:T.mono, fontSize:8, letterSpacing:'.42em', textTransform:'uppercase', color:'rgba(237,230,216,.28)', marginBottom:16 }}>
            edição de colecionador
          </div>

          <h1 style={{ fontFamily:T.serif, fontSize:'clamp(38px,5vw,66px)', lineHeight:.96, margin:'0 0 14px', color:'rgba(237,230,216,.95)' }}>
            {featured.headline || `O ano de ${featured.year}`}
          </h1>

          <p style={{ fontFamily:T.serif, fontSize:18, lineHeight:1.78, color:'rgba(237,230,216,.56)', margin:'0 0 18px', maxWidth:780 }}>
            <RT text={excerpt} />
          </p>

          <GSStrip winners={raw.grandSlamWinners} />

          <div className="cv-figure-row" style={{ margin:'6px 0 20px', flexWrap:'wrap' }}>
            {figures.map((figure, index) => (
              <div key={`${figure.label}-${index}`} className="cv-pill" style={{ borderColor:'rgba(237,230,216,.12)', background:'rgba(237,230,216,.03)' }}>
                <span style={{ color:'rgba(237,230,216,.34)' }}>{figure.label}</span>
                <strong style={{ color:'rgba(237,230,216,.88)', fontWeight:600 }}>{figure.value}</strong>
              </div>
            ))}
          </div>

          <div style={{ display:'flex', gap:12, flexWrap:'wrap', marginTop:10 }}>
            {stats.map(tile => (
              <div key={tile.label} className="cv-stat-tile" style={{ minWidth:140 }}>
                <div style={{ fontFamily:T.serif, fontSize:30, color:tile.color, lineHeight:1 }}>{tile.value}</div>
                <div style={{ fontFamily:T.mono, fontSize:7.5, letterSpacing:'.16em', textTransform:'uppercase', color:'rgba(237,230,216,.28)', marginTop:6 }}>
                  {tile.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display:'grid', gap:16 }}>
        <div className="cv-panel" style={{ padding:22 }}>
          <div style={{ fontFamily:T.mono, fontSize:8, letterSpacing:'.3em', textTransform:'uppercase', color:'rgba(237,230,216,.28)', marginBottom:14 }}>
            protagonistas da edição
          </div>
          <div style={{ display:'grid', gap:10 }}>
            {figures.length ? figures.map((figure, index) => (
              <div key={`${figure.value}-${index}`} style={{ padding:'12px 14px', border:'1px solid rgba(237,230,216,.08)', background:'rgba(237,230,216,.02)' }}>
                <div style={{ fontFamily:T.mono, fontSize:7.5, letterSpacing:'.18em', textTransform:'uppercase', color:'rgba(237,230,216,.28)', marginBottom:5 }}>
                  {figure.label}
                </div>
                <div style={{ fontFamily:T.serif, fontSize:19, color:'rgba(237,230,216,.88)' }}>{figure.value}</div>
              </div>
            )) : (
              <div className="cv-empty" style={{ padding:'16px 0' }}>A temporada ainda procura seus protagonistas.</div>
            )}
          </div>
        </div>

        <div className="cv-panel" style={{ padding:22 }}>
          <div style={{ fontFamily:T.mono, fontSize:8, letterSpacing:'.3em', textTransform:'uppercase', color:'rgba(237,230,216,.28)', marginBottom:14 }}>
            ecos do tempo
          </div>
          <div style={{ display:'grid', gap:10 }}>
            {flashbacks.length ? flashbacks.map(fb => (
              <div key={fb.year} className="cv-echo-card">
                <div style={{ fontFamily:T.mono, fontSize:7.5, letterSpacing:'.18em', textTransform:'uppercase', color:'#4A8EC2', marginBottom:6 }}>
                  há {fb.yearsAgo} ano{fb.yearsAgo !== 1 ? 's' : ''}
                </div>
                <div style={{ fontFamily:T.serif, fontSize:14.5, lineHeight:1.7, color:'rgba(237,230,216,.62)' }}>
                  <RT text={fb.flashText ?? ''} />
                </div>
              </div>
            )) : (
              <div className="cv-empty" style={{ padding:'18px 0' }}>Ainda não há ecos suficientes para o espelho da história.</div>
            )}
          </div>
          <button className="cv-filter" onClick={onOpenArchive} style={{ marginTop:14, width:'100%', color:'rgba(237,230,216,.68)' }}>
            abrir arquivo narrativo
          </button>
        </div>
      </div>
    </section>
  );
}

function SeasonMosaic({ chronicles, onOpen }) {
  if (!chronicles?.length) return null;
  return (
    <section className="cv-panel" style={{ padding:22, marginBottom:24 }}>
      <div style={{ marginBottom:16 }}>
        <div style={{ fontFamily:T.mono, fontSize:8, letterSpacing:'.3em', textTransform:'uppercase', color:'rgba(237,230,216,.28)', marginBottom:8 }}>
          capítulos da era
        </div>
        <div style={{ fontFamily:T.serif, fontSize:26, color:'rgba(237,230,216,.92)' }}>As últimas temporadas em perspectiva</div>
      </div>
      <div className="cv-mosaic">
        {chronicles.map((entry, index) => {
          const tone = TONES[entry.tone] ?? TONES.TRANSICAO;
          return (
            <button
              key={entry.year}
              onClick={() => onOpen(entry.year)}
              className="cv-year-card"
              style={{
                textAlign:'left',
                padding:18,
                border:`1px solid ${tone.color}1E`,
                background:`linear-gradient(180deg, ${tone.bg}, rgba(12,18,23,.92))`,
                cursor:'pointer',
                animation:'cv-in .45s ease both',
                animationDelay:`${index * 0.05}s`,
              }}
            >
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
                <span className="cv-pill" style={{ borderColor:`${tone.color}44`, background:`${tone.color}10`, color:tone.color }}>{entry.year}</span>
                <span style={{ fontFamily:T.mono, fontSize:7.5, letterSpacing:'.16em', textTransform:'uppercase', color:'rgba(237,230,216,.28)' }}>
                  {tone.label}
                </span>
              </div>
              <div style={{ fontFamily:T.serif, fontSize:24, lineHeight:1.02, color:'rgba(237,230,216,.9)', marginBottom:12 }}>
                {entry.headline}
              </div>
              <div style={{ fontFamily:T.serif, fontSize:14.5, lineHeight:1.65, color:'rgba(237,230,216,.48)' }}>
                <RT text={extractChronicleExcerpt(entry).slice(0, 180)} />
              </div>
            </button>
          );
        })}
      </div>
    </section>
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

function ChronicleEdition(props) {
  const { featured, flashbacks, all, displayed, query, toneFilter, toneCounts, expandedYears, setQuery, setToneFilter, onToggle, onOpenArchive } = props;
  return (
    <>
      <ChronicleHero featured={featured} flashbacks={flashbacks} totalCount={all.length} toneCounts={toneCounts} onOpenArchive={onOpenArchive} />
      <SeasonMosaic chronicles={all.slice(0, 4)} onOpen={onOpenArchive} />
      <ChronicleArchive
        all={all}
        displayed={displayed.slice(0, 4)}
        query={query}
        toneFilter={toneFilter}
        toneCounts={toneCounts}
        expandedYears={expandedYears}
        setQuery={setQuery}
        setToneFilter={setToneFilter}
        onToggle={onToggle}
      />
    </>
  );
}

export default function ChronicleView({ state, onBack }) {
  const [activeTab, setActiveTab] = useState('edition');
  const [query, setQuery] = useState('');
  const [expandedYears, setExpandedYears] = useState(new Set());
  const [toneFilter, setToneFilter] = useState(null);

  const engine = state?.chronicleEngine;
  const all = engine?.chronicles ?? [];
  const featured = all[0] ?? null;

  const displayed = useMemo(() => {
    let list = all;
    if (toneFilter) list = list.filter(c=>c.tone===toneFilter);
    if (!query.trim()) return list;
    return (engine?.search(query)??[]).filter(c=>!toneFilter||c.tone===toneFilter);
  }, [all, query, engine, toneFilter]);

  const flashbacks = useMemo(()=>{
    if (!engine||!state?.year) return [];
    return engine.getFlashback(state.year,[5,10])??[];
  }, [engine, state?.year]);

  const toneCounts = useMemo(()=>{
    const c={};
    all.forEach(e=>{c[e.tone]=(c[e.tone]??0)+1;});
    return c;
  }, [all]);

  const toggle = useCallback(year=>{
    setExpandedYears(prev=>{const n=new Set(prev);n.has(year)?n.delete(year):n.add(year);return n;});
  },[]);

  const openArchiveYear = useCallback((year) => {
    setActiveTab('timeline');
    setExpandedYears(prev => new Set([...prev, year]));
  }, []);

  const TABS = [
    { id:'chronicles', label:'📜 Crônicas'   },
    { id:'rankings',   label:'🏆 Rankings'   },
    { id:'rivalries',  label:'⚔️ Rivalidades' },
    { id:'epitaphs',   label:'🕊️ Epitáfios'  },
  ];

  const heroStat = (val, label, color='rgba(237,230,216,.85)') => (
    <div style={{textAlign:'center'}}>
      <div style={{fontFamily:T.serif,fontSize:28,color,fontWeight:600,lineHeight:1}}>{val}</div>
      <div style={{fontFamily:T.mono,fontSize:7,letterSpacing:'.22em',textTransform:'uppercase',color:'rgba(237,230,216,.28)',marginTop:6}}>{label}</div>
    </div>
  );

  const viewTabs = [
    { id:'edition', label:'✨ Edição' },
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
        <div style={{ textAlign:'center', marginBottom:42 }}>
          <div style={{ fontFamily:T.mono, fontSize:8, letterSpacing:'.7em', textTransform:'uppercase', color:'rgba(237,230,216,.22)', marginBottom:18 }}>
            Tennis Universe · memorial editorial do circuito
          </div>

          <h1 style={{
            fontFamily:T.serif,
            fontSize:'clamp(42px,6vw,78px)',
            color:'rgba(237,230,216,.94)',
            lineHeight:1,
            letterSpacing:'.02em',
            margin:'0 0 10px',
            fontWeight:600,
          }}>
            Livro de Crônicas
          </h1>

          <p style={{ fontFamily:T.serif, fontStyle:'italic', color:'rgba(237,230,216,.34)', fontSize:18, margin:0 }}>
            O lugar onde resultados viram memória, rivalidades viram saga e as eras ganham rosto.
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
          <ChronicleEdition
            featured={featured}
            flashbacks={flashbacks}
            all={all}
            displayed={displayed}
            query={query}
            toneFilter={toneFilter}
            toneCounts={toneCounts}
            expandedYears={expandedYears}
            setQuery={setQuery}
            setToneFilter={setToneFilter}
            onToggle={toggle}
            onOpenArchive={openArchiveYear}
          />
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

  return (
    <div className="cv-root" style={{paddingBottom:80}}>
      <style>{CSS}</style>

      {/* Top bar */}
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
          <div style={{width:1,height:20,background:'rgba(255,255,255,.08)'}} />
          <div style={{fontFamily:T.mono,fontSize:8,letterSpacing:'.3em',textTransform:'uppercase',color:'rgba(237,230,216,.28)'}}>
            Almanaque do Circuito
          </div>
        </div>
      )}

      <div style={{maxWidth:960, margin:'0 auto', padding:'44px 24px 0'}}>

        {/* ── HEADER ── */}
        <div style={{textAlign:'center', marginBottom:52}}>
          <div style={{fontFamily:T.mono,fontSize:8,letterSpacing:'.7em',textTransform:'uppercase',color:'rgba(237,230,216,.22)',marginBottom:18}}>
            Tennis Universe · Almanaque Permanente
          </div>

          <h1 style={{
            fontFamily:T.serif,
            fontSize:'clamp(38px,6vw,70px)', color:'rgba(237,230,216,.92)',
            lineHeight:1.0, letterSpacing:'.02em', margin:'0 0 10px',
            fontWeight:600,
          }}>
            Livro de Crônicas
          </h1>

          <p style={{fontFamily:T.serif,fontStyle:'italic',color:'rgba(237,230,216,.30)',fontSize:16,margin:0}}>
            A memória que o circuito merecia ter escrita
          </p>

          <div style={{display:'flex',alignItems:'center',gap:12,width:200,margin:'22px auto'}}>
            <div style={{flex:1,height:1,background:'linear-gradient(90deg,transparent,rgba(237,230,216,.18))'}} />
            <span style={{color:'rgba(237,230,216,.25)',fontSize:12}}>✦</span>
            <div style={{flex:1,height:1,background:'linear-gradient(270deg,transparent,rgba(237,230,216,.18))'}} />
          </div>

          {all.length>0 && (
            <div style={{display:'flex',justifyContent:'center',gap:44,flexWrap:'wrap',marginTop:8}}>
              {heroStat(all.length,'Temporadas')}
              {heroStat((toneCounts.EPICO??0)+(toneCounts.DINASTICO??0),'Épicas','#D4621A')}
              {heroStat(toneCounts.TRAGICO??0,'Trágicas','#6B7F8E')}
              {heroStat(toneCounts.PRODIGIO??0,'Prodígios','#4EAC6E')}
              {heroStat(all.filter(c=>c.raw?.calendarSlam).length,'Calendar Slams','#C9A84C')}
            </div>
          )}
        </div>

        {/* ── FLASHBACKS ── */}
        {flashbacks.length>0 && (
          <div style={{marginBottom:36}}>
            {flashbacks.map(fb=>(
              <div key={fb.year} style={{
                background:'rgba(74,142,194,.05)', border:'1px solid rgba(74,142,194,.16)',
                borderLeft:'3px solid rgba(74,142,194,.40)',
                padding:'13px 20px', marginBottom:8, display:'flex', alignItems:'flex-start', gap:14,
              }}>
                <span style={{color:'#4A8EC2',fontSize:11,opacity:.55,marginTop:1,flexShrink:0}}>🕐</span>
                <div>
                  <div style={{fontFamily:T.mono,fontSize:8,letterSpacing:'.24em',color:'#4A8EC2',textTransform:'uppercase',marginBottom:5}}>
                    Há {fb.yearsAgo} ano{fb.yearsAgo!==1?'s':''}
                  </div>
                  <p style={{fontFamily:T.serif,fontStyle:'italic',fontSize:13.5,color:'rgba(74,142,194,.72)',lineHeight:1.72,margin:0}}>
                    <RT text={fb.flashText??''} />
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── TABS ── */}
        <div style={{display:'flex',gap:0,borderBottom:'1px solid rgba(237,230,216,.08)',marginBottom:28,paddingBottom:1}}>
          {TABS.map(t=>(
            <button key={t.id} className={`cv-tab ${activeTab===t.id?'active':''}`}
              style={{color:activeTab===t.id?'#EDE6D8':'rgba(237,230,216,.28)'}}
              onClick={()=>setActiveTab(t.id)}
            >{t.label}</button>
          ))}
        </div>

        {/* ── CRÔNICAS ── */}
        {activeTab==='chronicles' && (
          <div>
            {/* Search */}
            <div style={{position:'relative',marginBottom:18}}>
              <span style={{position:'absolute',left:14,top:'50%',transform:'translateY(-50%)',color:'rgba(237,230,216,.28)',fontSize:12,pointerEvents:'none'}}>⌕</span>
              <input
                className="cv-search"
                placeholder="Buscar por nome, evento, ano ou tom…"
                value={query}
                onChange={e=>setQuery(e.target.value)}
              />
            </div>

            {/* Tone filters */}
            {all.length>0 && (
              <div style={{display:'flex',gap:5,flexWrap:'wrap',marginBottom:24}}>
                <button className="cv-filter" onClick={()=>setToneFilter(null)} style={{
                  border:`1px solid ${!toneFilter?'rgba(237,230,216,.38)':'rgba(237,230,216,.10)'}`,
                  color:!toneFilter?'#EDE6D8':'rgba(237,230,216,.28)',
                  background:!toneFilter?'rgba(237,230,216,.06)':'transparent',
                }}>
                  Todos ({all.length})
                </button>
                {Object.entries(TONES).map(([tone,cfg])=>{
                  const count=toneCounts[tone]??0;
                  if(!count) return null;
                  const active=toneFilter===tone;
                  return (
                    <button key={tone} className="cv-filter"
                      onClick={()=>setToneFilter(active?null:tone)}
                      style={{
                        border:`1px solid ${active?cfg.color+'60':'rgba(237,230,216,.08)'}`,
                        background:active?cfg.bg:'transparent',
                        color:active?cfg.color:'rgba(237,230,216,.28)',
                      }}>
                      {cfg.label} ({count})
                    </button>
                  );
                })}
              </div>
            )}

            {/* List */}
            {all.length===0 ? (
              <div className="cv-empty">
                <div style={{fontSize:32,marginBottom:16,opacity:.14}}>📖</div>
                <div style={{fontFamily:T.serif,fontSize:20,marginBottom:10}}>O Livro ainda está em branco.</div>
                <div style={{fontFamily:T.mono,fontSize:9,letterSpacing:'.16em',color:'rgba(237,230,216,.2)'}}>
                  A primeira crônica será registrada ao fim da temporada atual.
                </div>
              </div>
            ) : displayed.length===0 ? (
              <div className="cv-empty">
                <div style={{fontFamily:T.serif,fontSize:16}}>
                  Nenhuma crônica encontrada{query?` para "${query}"`:''}.
                </div>
              </div>
            ) : (
              displayed.map((entry,i)=>(
                <ChronicleEntry
                  key={entry.year}
                  entry={entry}
                  index={i}
                  expanded={expandedYears.has(entry.year)}
                  onToggle={()=>toggle(entry.year)}
                />
              ))
            )}
          </div>
        )}

        {activeTab==='rankings'  && <RankingsPanel chronicles={all} />}
        {activeTab==='rivalries' && <RivalriesPanel state={state} />}
        {activeTab==='epitaphs'  && <EpitaphsPanel engine={engine} />}

        {/* Footer */}
        <div style={{marginTop:72,textAlign:'center'}}>
          <div style={{width:80,height:1,background:'linear-gradient(90deg,transparent,rgba(237,230,216,.10),transparent)',margin:'0 auto 14px'}} />
          <div style={{fontFamily:T.mono,fontSize:7,letterSpacing:'.4em',textTransform:'uppercase',color:'rgba(237,230,216,.14)'}}>
            — Anais do Circuito —
          </div>
        </div>
      </div>
    </div>
  );
}
