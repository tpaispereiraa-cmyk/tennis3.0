import React, { useEffect, useState } from 'react';

// ── COUNTDOWN OVERLAY ────────────────────────────────────────────────
export const CountdownOverlay = ({ count }) => {
  if (count === null || count === undefined) return null;
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm pointer-events-none z-50">
      <div className="text-white font-black text-9xl animate-countdown-bounce"
        style={{ textShadow: '0 0 40px rgba(255,255,255,0.8), 0 0 80px rgba(255,255,255,0.4)' }}>
        {count > 0 ? count : 'GO!'}
      </div>
    </div>
  );
};

// ── FINISH OVERLAY ────────────────────────────────────────────────────
export const FinishOverlay = ({ winner, method }) => {
  if (!winner) return null;
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm pointer-events-none animate-fade-in z-50">
      <div className="text-center">
        <div className="text-yellow-400 font-black text-6xl mb-4 animate-victory-pulse">FINISH!</div>
        <div className="text-white font-bold text-3xl mb-2">{winner.name || winner.team?.name || 'Winner'}</div>
        <div className="text-white/70 text-xl">{method || 'Victory'}</div>
      </div>
    </div>
  );
};

// ====================================================================
// CINEMATIC LAUNCH SEQUENCE OVERLAY
// Design: technique is the STAR, quality is the co-star
// ====================================================================

const S = `
  @import url('https://fonts.googleapis.com/css2?family=Black+Ops+One&family=Rajdhani:wght@400;600;700&family=Orbitron:wght@400;700;900&display=swap');

  @keyframes l-slam    { 0%{opacity:0;transform:scale(2.2) translateY(-20px)} 60%{opacity:1;transform:scale(.95) translateY(4px)} 100%{opacity:1;transform:scale(1) translateY(0)} }
  @keyframes l-rise    { 0%{opacity:0;transform:translateY(32px)} 100%{opacity:1;transform:translateY(0)} }
  @keyframes l-pop     { 0%{opacity:0;transform:scale(.5)} 55%{transform:scale(1.15)} 100%{opacity:1;transform:scale(1)} }
  @keyframes l-glow    { 0%,100%{opacity:.7} 50%{opacity:1} }
  @keyframes l-scan    { 0%{transform:translateY(-100vh)} 100%{transform:translateY(100vh)} }
  @keyframes l-out     { to{opacity:0} }
  @keyframes l-shimmer { 0%{transform:translateX(-200%)} 100%{transform:translateX(200%)} }
  @keyframes l-icon    { 0%{opacity:0;transform:scale(0) rotate(-30deg)} 55%{transform:scale(1.18) rotate(6deg)} 100%{opacity:1;transform:scale(1) rotate(0deg)} }
  @keyframes l-qual    { 0%{opacity:0;transform:scale(.6) skewX(-8deg)} 60%{transform:scale(1.08) skewX(2deg)} 100%{opacity:1;transform:scale(1) skewX(0)} }
  @keyframes l-bar     { 0%{width:0} 100%{width:var(--w)} }
`;

const QUALITY_CFG = {
  CRITICAL_FAIL: { color:'#dc2626', glow:'rgba(220,38,38,.9)',   label:'LANÇAMENTO FALHADO!', sub:'A corda prendeu — começou mal',   stars:1 },
  WEAK:          { color:'#f97316', glow:'rgba(249,115,22,.8)',  label:'LANÇAMENTO FRACO',     sub:'Abaixo do esperado',              stars:2 },
  STANDARD:      { color:'#94a3b8', glow:'rgba(148,163,184,.6)', label:'LANÇAMENTO NORMAL',    sub:'Execução padrão',                 stars:3 },
  STRONG:        { color:'#3b82f6', glow:'rgba(59,130,246,.8)',  label:'LANÇAMENTO FORTE!',    sub:'Acima do esperado',               stars:4 },
  PERFECT:       { color:'#ffd700', glow:'rgba(255,215,0,.95)',  label:'LANÇAMENTO PERFEITO!!!',sub:'Máximo potencial atingido',       stars:5 },
};

const MOD_COLOR = v =>
  v > 1.15 ? '#4ade80' : v > 1.0 ? '#86efac' : v < 0.85 ? '#f87171' : v < 1.0 ? '#fca5a5' : '#94a3b8';

const MOD_SIGN = v => {
  const p = Math.round((v - 1) * 100);
  return (p >= 0 ? '+' : '') + p + '%';
};

const Stars = ({ count, color }) => (
  <div style={{ display:'flex', gap:4 }}>
    {[1,2,3,4,5].map(i => (
      <span key={i} style={{ fontSize:18, opacity: i <= count ? 1 : 0.18, filter: i <= count ? `drop-shadow(0 0 6px ${color})` : 'none' }}>★</span>
    ))}
  </div>
);

// One full-side panel: background art + overlaid launch info
const Side = ({ bey, tech, quality, side, show }) => {
  const isLeft  = side === 'left';
  const team    = bey?.team || {};
  const name    = team.name  || bey?.name || (isLeft ? 'BLADER 1' : 'BLADER 2');
  const img     = team.fullBodyUrl || null;
  const qcfg    = QUALITY_CFG[quality?.key] || QUALITY_CFG.STANDARD;
  const techCol = tech?.color || '#94a3b8';

  // Mods to show
  const mods = [
    { label:'VELOCIDADE', v: (tech?.speedMod||1) * (quality?.speedMod||1) },
    { label:'SPIN',       v: (tech?.spinMod ||1) * (quality?.spinMod ||1) },
    { label:'BURST RISK', v: (tech?.burstRisk||1) * (quality?.burstRisk||1) },
  ];

  return (
    <div style={{
      flex:1, position:'relative', overflow:'hidden',
      display:'flex', flexDirection:'column', justifyContent:'flex-end',
      padding: isLeft ? '0 0 44px 44px' : '0 44px 44px 0',
    }}>

      {/* ── Full body image — faint background ── */}
      {img && (
        <div style={{
          position:'absolute', bottom:0,
          [isLeft ? 'right' : 'left']: 0,
          width:'52%', height:'92%', zIndex:1, pointerEvents:'none',
        }}>
          <img src={img} alt="" style={{
            width:'100%', height:'100%',
            objectFit:'contain', objectPosition:'bottom',
            opacity:.18,
            transform: isLeft ? 'scaleX(-1)' : 'none',
          }} />
        </div>
      )}

      {/* ── Content above the image ── */}
      <div style={{ position:'relative', zIndex:2, display:'flex', flexDirection:'column', alignItems: isLeft?'flex-start':'flex-end', gap:0 }}>

        {/* Player name — small, top support */}
        <div style={{ animation:show?'l-rise .4s .1s both':'none', opacity:0, marginBottom:20 }}>
          <div style={{
            fontFamily:'Orbitron,monospace', fontSize:9, letterSpacing:'.3em',
            color:'rgba(255,255,255,.3)', marginBottom:5, textAlign:isLeft?'left':'right',
          }}>{team.country?.toUpperCase() || ''}</div>
          <div style={{
            fontFamily:"'Rajdhani',sans-serif", fontWeight:700, fontSize:18,
            color:'rgba(255,255,255,.6)', letterSpacing:'.04em', textAlign:isLeft?'left':'right',
          }}>{name}</div>
        </div>

        {/* ══ TECHNIQUE ICON — very large ══ */}
        <div style={{ animation:show?'l-icon .55s .22s cubic-bezier(.34,1.56,.64,1) both':'none', opacity:0, marginBottom:12, textAlign:isLeft?'left':'right' }}>
          <span style={{ fontSize:96, filter:`drop-shadow(0 0 28px ${techCol}) drop-shadow(0 0 56px ${techCol}55)` }}>
            {tech?.icon || '⚪'}
          </span>
        </div>

        {/* ══ TECHNIQUE NAME — headline ══ */}
        <div style={{ animation:show?'l-slam .55s .35s both':'none', opacity:0, marginBottom:8, textAlign:isLeft?'left':'right' }}>
          <div style={{
            fontFamily:"'Black Ops One',cursive",
            fontSize:'clamp(26px, 4vw, 52px)',
            color: techCol,
            lineHeight:1.0,
            textShadow:`0 0 30px ${qcfg.glow}, 0 0 60px ${techCol}55, 0 2px 8px rgba(0,0,0,.9)`,
            letterSpacing:'.02em',
          }}>{tech?.name || 'STANDARD LAUNCH'}</div>
        </div>

        {/* Technique description */}
        <div style={{ animation:show?'l-rise .4s .5s both':'none', opacity:0, marginBottom:20, textAlign:isLeft?'left':'right' }}>
          <div style={{
            fontFamily:"'Rajdhani',sans-serif", fontWeight:600, fontSize:16,
            color:'rgba(255,255,255,.55)', maxWidth:320, lineHeight:1.4,
          }}>{tech?.desc || ''}</div>
        </div>

        {/* ══ QUALITY — second star ══ */}
        <div style={{ animation:show?'l-qual .6s .65s cubic-bezier(.34,1.56,.64,1) both':'none', opacity:0, marginBottom:20 }}>
          <div style={{
            display:'inline-flex', flexDirection:'column',
            alignItems: isLeft?'flex-start':'flex-end',
            gap:6,
            padding:'16px 24px',
            background:`linear-gradient(135deg,${qcfg.color}18,${qcfg.color}08)`,
            border:`2px solid ${qcfg.color}`,
            borderRadius:12,
            boxShadow:`0 0 32px ${qcfg.glow.replace(')',',0.4)')}, inset 0 0 20px ${qcfg.color}0a`,
            animation:show?'l-glow 2.5s ease-in-out infinite 1.4s':'none',
            minWidth:240,
          }}>
            <div style={{
              fontFamily:'Orbitron,monospace', fontSize:9, letterSpacing:'.25em',
              color:'rgba(255,255,255,.35)', marginBottom:2,
            }}>LAUNCH QUALITY</div>
            <div style={{
              fontFamily:"'Black Ops One',cursive",
              fontSize:'clamp(18px, 2.8vw, 32px)',
              color: qcfg.color,
              textShadow:`0 0 20px ${qcfg.glow}`,
              lineHeight:1.05,
            }}>{qcfg.label}</div>
            <div style={{
              fontFamily:"'Rajdhani',sans-serif", fontWeight:600, fontSize:13,
              color:'rgba(255,255,255,.45)',
            }}>{qcfg.sub}</div>
            <Stars count={qcfg.stars} color={qcfg.color} />
          </div>
        </div>

        {/* ══ EFFECT BARS — final mods ══ */}
        <div style={{ animation:show?'l-rise .4s .85s both':'none', opacity:0, minWidth:260 }}>
          <div style={{
            fontFamily:'Orbitron,monospace', fontSize:8, letterSpacing:'.22em',
            color:'rgba(255,255,255,.25)', marginBottom:10,
            textAlign:isLeft?'left':'right',
          }}>EFEITO COMBINADO</div>
          <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
            {mods.map(m => {
              const c   = MOD_COLOR(m.v);
              const pct = Math.min(100, Math.max(0, m.v * 50));
              return (
                <div key={m.label} style={{ display:'flex', alignItems:'center', gap:10,
                  flexDirection: isLeft ? 'row' : 'row-reverse' }}>
                  <div style={{
                    fontFamily:'Orbitron,monospace', fontSize:8, letterSpacing:'.12em',
                    color:'rgba(255,255,255,.3)', width:80, textAlign: isLeft?'left':'right', flexShrink:0,
                  }}>{m.label}</div>
                  <div style={{ flex:1, height:4, background:'rgba(255,255,255,.07)', borderRadius:2, overflow:'hidden' }}>
                    <div style={{
                      height:'100%', width:`${pct}%`, borderRadius:2,
                      background:`linear-gradient(90deg, ${c}99, ${c})`,
                      boxShadow:`0 0 8px ${c}`,
                    }} />
                  </div>
                  <div style={{
                    fontFamily:'Orbitron,monospace', fontSize:11, fontWeight:700,
                    color:c, width:42, textAlign: isLeft?'right':'left', flexShrink:0,
                  }}>{MOD_SIGN(m.v)}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Main overlay ──────────────────────────────────────────────────────
export const LaunchSequenceOverlay = ({
  quality1, quality2,
  bey1Name, bey2Name,
  launch1,  launch2,
  bey1,     bey2,
  md3State,
}) => {
  const [show, setShow] = useState(false);
  const [exit, setExit] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setShow(true), 40);
    const t2 = setTimeout(() => setExit(true), 3000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  const b1 = bey1 ? { ...bey1, team: bey1.team || md3State?.team1?.team || null } : null;
  const b2 = bey2 ? { ...bey2, team: bey2.team || md3State?.team2?.team || null } : null;
  const round = md3State?.currentRound || 1;
  const l1col = launch1?.color || '#94a3b8';
  const l2col = launch2?.color || '#94a3b8';

  return (
    <div style={{
      position:'fixed', inset:0, zIndex:9999, pointerEvents:'none',
      fontFamily:"'Rajdhani',sans-serif",
      animation: exit ? 'l-out .55s ease forwards' : 'none',
    }}>
      <style>{S}</style>

      {/* Background */}
      <div style={{
        position:'absolute', inset:0,
        background:'radial-gradient(ellipse 130% 95% at 50% 115%, #1a0030 0%, #0a000f 48%, #000008 100%)',
      }} />

      {/* Scanline */}
      <div style={{
        position:'absolute', top:0, left:0, right:0, height:2, zIndex:30,
        background:'linear-gradient(90deg,transparent,rgba(0,212,255,.6),transparent)',
        animation:'l-scan 5s linear infinite',
      }} />

      {/* Grid */}
      <div style={{
        position:'absolute', inset:0, zIndex:2,
        backgroundImage:'linear-gradient(rgba(0,212,255,.025) 1px,transparent 1px),linear-gradient(90deg,rgba(0,212,255,.025) 1px,transparent 1px)',
        backgroundSize:'60px 60px',
        maskImage:'radial-gradient(ellipse 90% 80% at 50% 100%,black,transparent)',
        WebkitMaskImage:'radial-gradient(ellipse 90% 80% at 50% 100%,black,transparent)',
      }} />

      {/* Gold border bars */}
      {[true, false].map(top => (
        <div key={top?'t':'b'} style={{
          position:'absolute', [top?'top':'bottom']:0, left:0, right:0, height:2, zIndex:30,
          background:'linear-gradient(90deg,transparent,rgba(255,215,0,.55) 30%,#ffd700 50%,rgba(255,215,0,.55) 70%,transparent)',
          boxShadow:'0 0 28px rgba(255,215,0,.4)',
        }} />
      ))}

      {/* Scanlines texture */}
      <div style={{
        position:'absolute', inset:0, zIndex:3,
        background:'repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,.04) 2px,rgba(0,0,0,.04) 4px)',
      }} />

      {/* ── MAIN LAYOUT ── */}
      <div style={{ position:'absolute', inset:0, zIndex:10, display:'flex' }}>

        {/* LEFT */}
        <Side bey={b1} tech={launch1} quality={quality1} side="left"  show={show} />

        {/* CENTER DIVIDER */}
        <div style={{
          width:2, alignSelf:'stretch', margin:'40px 0',
          background:'linear-gradient(180deg,transparent,rgba(255,255,255,.12) 30%,rgba(255,255,255,.18) 50%,rgba(255,255,255,.12) 70%,transparent)',
          flexShrink:0,
        }} />

        {/* RIGHT */}
        <Side bey={b2} tech={launch2} quality={quality2} side="right" show={show} />
      </div>

      {/* ── CENTER BADGE (VS + ROUND) — floating above the divider ── */}
      <div style={{
        position:'absolute', top:'50%', left:'50%',
        transform:'translate(-50%, -50%)',
        zIndex:20,
        display:'flex', flexDirection:'column', alignItems:'center', gap:10,
        animation:show?'l-pop .55s .18s cubic-bezier(.34,1.56,.64,1) both':'none', opacity:0,
      }}>
        <div style={{
          fontFamily:'Orbitron,monospace', fontSize:9, letterSpacing:'.3em',
          color:'rgba(255,215,0,.55)', background:'rgba(255,215,0,.07)',
          border:'1px solid rgba(255,215,0,.22)', borderRadius:20,
          padding:'4px 14px',
        }}>ROUND {round}</div>
        <div style={{
          fontFamily:"'Black Ops One',cursive",
          fontSize:'clamp(40px,7vw,88px)',
          color:'#fff', lineHeight:1,
          textShadow:'0 0 40px rgba(255,215,0,.5), 0 0 80px rgba(255,215,0,.2)',
        }}>VS</div>
        <div style={{
          fontFamily:"'Black Ops One',cursive", fontSize:11, letterSpacing:'.35em',
          color:'#00d4ff', textShadow:'0 0 16px rgba(0,212,255,.8)',
        }}>RIP IT</div>
      </div>

      {/* ── BOTTOM TICKER ── */}
      <div style={{
        position:'absolute', bottom:0, left:0, right:0,
        height:38, zIndex:20,
        display:'flex', alignItems:'center', justifyContent:'center',
        borderTop:'1px solid rgba(255,255,255,.05)',
        background:'rgba(0,0,0,.6)',
        animation:show?'l-rise .4s .3s both':'none', opacity:0,
      }}>
        <div style={{ fontFamily:'Orbitron,monospace', fontSize:10, letterSpacing:'.3em', color:'rgba(255,255,255,.2)' }}>
          {b1?.team?.name || bey1Name || 'BLADER 1'}
          <span style={{ color:'rgba(255,215,0,.35)', margin:'0 14px' }}>·</span>
          BEYBLADE BURST
          <span style={{ color:'rgba(255,215,0,.35)', margin:'0 14px' }}>·</span>
          {b2?.team?.name || bey2Name || 'BLADER 2'}
        </div>
      </div>
    </div>
  );
};

export function calculateFinalLaunchPower(technique, quality, bey) {
  const speedMod = (technique?.speedMod||1)*(quality?.speedMod||1);
  const spinMod  = (technique?.spinMod ||1)*(quality?.spinMod ||1);
  const beyPower = bey?.stats ? ((bey.stats.atk||0)+(bey.stats.spin||0)/2)/40 : 0.5;
  return Math.min(100, Math.round(beyPower*100*(speedMod+spinMod)/2));
}
