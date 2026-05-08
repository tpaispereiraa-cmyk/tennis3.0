import React, { useState, useEffect, useRef } from 'react';
import { ovrTier } from '../ScoutProfile.js';
import {
  NAMED_PLAYERS, NAMED_PLAYER_KEYS,
  ATTR_CATEGORIES, catAvg, overallRating, overallGrade,
  getPlayerPhoto,
} from '../players.js';
import { PLAY_STYLES } from '../styles.js';
import { COURTS, COURT_KEYS, isStyleFavored, isStylePenalized } from '../courtConfigs.js';
import UnifiedPlayerProfile from './UnifiedPlayerProfile2.jsx';
import UniverseManager from './UniverseManager.jsx';
import SimulatorScreen from './SimulatorScreen.jsx';

// ─── Design Tokens — História Viva Identity ────────────────────────
const C = {
  ink:     '#06080A',
  ink1:    '#0A0E0F',
  ink2:    '#0F1518',
  ink3:    '#141C20',
  ink4:    '#1B2830',
  clay:    '#D4561E',
  clayHi:  '#F06428',
  clayLo:  '#8B3410',
  gold:    '#E8C84A',
  chalk:   '#F2EDE4',
  dim:     'rgba(242,237,228,.55)',
  faint:   'rgba(242,237,228,.17)',
  ghost:   'rgba(242,237,228,.08)',
  line:    'rgba(242,237,228,.07)',
  lineMid: 'rgba(242,237,228,.14)',
  // Font stacks
  D:  "'Bebas Neue', sans-serif",
  Bc: "'Barlow Condensed', sans-serif",
  B:  "'Barlow', sans-serif",
  M:  "'Space Mono', monospace",
};

// ─── Global CSS ────────────────────────────────────────────────────
function injectCSS() {
  if (document.getElementById('hv3-css')) return;
  const css = `
@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Space+Mono:ital,wght@0,400;0,700;1,400&family=Barlow+Condensed:ital,wght@0,300;0,400;0,600;0,700;0,900;1,700&family=Barlow:wght@300;400;600&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html,body,#root{height:100%}

@keyframes hv-rise   {from{opacity:0;transform:translateY(22px)}to{opacity:1;transform:translateY(0)}}
@keyframes hv-fadein {from{opacity:0}to{opacity:1}}
@keyframes hv-slide  {from{opacity:0;transform:translateX(-18px)}to{opacity:1;transform:translateX(0)}}
@keyframes hv-ticker {from{transform:translateX(0)}to{transform:translateX(-50%)}}
@keyframes hv-breath {0%,100%{opacity:.4}50%{opacity:1}}
@keyframes hv-bar    {from{transform:scaleX(0)}to{transform:scaleX(1)}}
@keyframes hv-clay-pulse {0%,100%{opacity:.03}50%{opacity:.07}}

.a1{animation:hv-rise .5s .05s both}
.a2{animation:hv-rise .55s .10s both}
.a3{animation:hv-rise .55s .20s both}
.a4{animation:hv-rise .55s .28s both}
.a5{animation:hv-fadein .6s .35s both}
.a6{animation:hv-rise .5s .48s both}
.af{animation:hv-fadein .35s both}

/* scrollbar */
.sc{overflow-y:auto;scrollbar-width:thin;scrollbar-color:#141C20 transparent}
.sc::-webkit-scrollbar{width:3px}
.sc::-webkit-scrollbar-thumb{background:#8B3410}

/* ── NAV ITEMS ── */
.nav-item{
  position:relative;display:flex;align-items:center;
  width:100%;background:none;border:none;cursor:pointer;
  padding:0;text-align:left;overflow:hidden;
  border-bottom:1px solid rgba(242,237,228,.06);
  transition:all .15s;
}
.nav-item::before{
  content:'';position:absolute;left:0;top:0;bottom:0;width:100%;
  background:linear-gradient(90deg,rgba(212,86,30,.12),transparent 70%);
  transform:translateX(-100%);transition:transform .3s ease;
}
.nav-item:hover::before{transform:translateX(0)}
.nav-num{
  font-family:'Space Mono',monospace;font-size:9px;letter-spacing:.2em;
  color:rgba(242,237,228,.18);width:46px;flex-shrink:0;padding-left:2px;
  transition:color .2s;
}
.nav-lbl{
  font-family:'Bebas Neue',sans-serif;
  font-size:clamp(30px,3.5vw,52px);
  text-transform:uppercase;letter-spacing:.04em;
  color:rgba(242,237,228,.42);
  padding:18px 0;flex:1;
  transition:color .2s,padding-left .22s;
  position:relative;z-index:1;
}
.nav-arr{
  font-family:'Space Mono',monospace;font-size:14px;color:#D4561E;
  margin-right:4px;opacity:0;transform:translateX(-10px);
  transition:opacity .2s,transform .2s;position:relative;z-index:1;
}
.nav-item:hover .nav-lbl{color:#F2EDE4;padding-left:12px}
.nav-item:hover .nav-num{color:rgba(242,237,228,.45)}
.nav-item:hover .nav-arr{opacity:1;transform:translateX(0)}
.nav-item.off{pointer-events:none;opacity:.2}

/* ── PLAYER CARDS (tenistas grid) ── */
.pcard{
  position:relative;overflow:hidden;cursor:pointer;
  background:#0F1518;border:1px solid rgba(242,237,228,.07);
  display:flex;flex-direction:column;
  transition:border-color .18s,box-shadow .18s;
}
.pcard:hover{border-color:rgba(212,86,30,.4);box-shadow:0 14px 40px rgba(0,0,0,.65)}
.pcard-img{
  width:100%;aspect-ratio:2/3;object-fit:cover;object-position:top center;
  filter:brightness(.82) saturate(.85);
  transition:filter .3s,transform .35s;display:block;
}
.pcard:hover .pcard-img{filter:brightness(.95) saturate(1.05);transform:scale(1.03)}

/* ── PLAYER ROWS (match setup) ── */
.prow{
  display:flex;align-items:center;gap:10px;cursor:pointer;
  border:1px solid rgba(242,237,228,.06);margin-bottom:2px;
  padding:8px 12px;transition:background .12s,border-color .12s;
}
.prow:hover{background:rgba(242,237,228,.04);border-color:rgba(242,237,228,.14)}
.prow.sel{border-color:#D4561E;background:rgba(212,86,30,.08)}

/* ── COURT OPTIONS ── */
.copt{
  display:flex;align-items:center;gap:10px;cursor:pointer;
  border:1px solid rgba(242,237,228,.06);margin-bottom:2px;
  padding:9px 12px;transition:background .12s,border-color .12s;
}
.copt:hover{background:rgba(242,237,228,.04);border-color:rgba(242,237,228,.14)}
.copt.sel{border-color:#D4561E;background:rgba(212,86,30,.07)}

/* ── SURFACE ROWS ── */
.surf-row{
  display:flex;align-items:center;gap:14px;
  padding:13px 18px;
  background:rgba(242,237,228,.02);
  border:1px solid rgba(242,237,228,.07);
  position:relative;overflow:hidden;
  transition:background .15s,border-color .15s;
  clip-path:polygon(0 0,100% 0,calc(100% - 10px) 100%,0 100%);
}
.surf-row::before{
  content:'';position:absolute;left:0;top:0;bottom:0;width:3px;
}
.surf-clay::before  {background:#D4561E}
.surf-grass::before {background:#2ECC71}
.surf-hard::before  {background:#2860A8}
.surf-indoor::before{background:#8B2FAA}
.surf-row:hover{background:rgba(242,237,228,.04);border-color:rgba(242,237,228,.14)}

/* ── BACK BUTTON ── */
.back-btn{
  font-family:'Space Mono',monospace;font-size:9px;
  letter-spacing:.22em;text-transform:uppercase;
  background:none;border:1px solid rgba(242,237,228,.07);
  color:rgba(242,237,228,.55);padding:5px 14px;
  cursor:pointer;transition:all .13s;
  clip-path:polygon(4px 0,100% 0,calc(100% - 4px) 100%,0 100%);
}
.back-btn:hover{background:rgba(242,237,228,.05);color:#F2EDE4;border-color:rgba(242,237,228,.14)}
`;
  const el = document.createElement('style');
  el.id = 'hv3-css'; el.textContent = css;
  document.head.appendChild(el);
}

// ─── Top Chrome ────────────────────────────────────────────────────
function TopChrome() {
  return (
    <div style={{
      height:46,
      background:'rgba(10,14,15,.85)',
      borderBottom:`1px solid ${C.line}`,
      display:'flex', alignItems:'center',
      padding:'0 28px', flexShrink:0, zIndex:30,
      backdropFilter:'blur(8px)',
    }}>
      <div style={{
        background:C.clay, color:C.chalk,
        fontFamily:C.D, fontSize:13, letterSpacing:'.22em',
        padding:'5px 14px 4px', flexShrink:0,
        clipPath:'polygon(0 0,100% 0,calc(100% - 6px) 100%,0 100%)',
      }}>HV</div>

      <div style={{width:1,height:18,background:C.line,margin:'0 16px'}}/>

      <span style={{
        fontFamily:C.M, fontSize:9, letterSpacing:'.32em',
        color:C.dim, textTransform:'uppercase', flex:1,
      }}>História Viva Tennis</span>

      <div style={{display:'flex',alignItems:'center',gap:7}}>
        <div style={{
          width:6,height:6,borderRadius:'50%',background:'#3DEB6A',
          animation:'hv-breath 2.4s infinite',
        }}/>
        <span style={{fontFamily:C.M,fontSize:9,letterSpacing:'.3em',color:C.dim,textTransform:'uppercase'}}>
          Season 2025
        </span>
      </div>
    </div>
  );
}

// ─── Back Chrome ───────────────────────────────────────────────────
function BackChrome({ label, sub, onBack }) {
  return (
    <div style={{
      height:46,
      background:'rgba(10,14,15,.9)',
      borderBottom:`2px solid rgba(212,86,30,.35)`,
      display:'flex', alignItems:'center',
      padding:'0 24px', gap:14, flexShrink:0, zIndex:30,
    }}>
      <button className="back-btn" onClick={onBack}>← Voltar</button>
      <div style={{width:1,height:16,background:C.line}}/>
      <div>
        <div style={{fontFamily:C.D,fontSize:16,letterSpacing:'.1em',color:C.chalk,textTransform:'uppercase',lineHeight:1}}>
          {label}
        </div>
        {sub && (
          <div style={{fontFamily:C.M,fontSize:8,color:C.dim,letterSpacing:'.3em',marginTop:1,textTransform:'uppercase'}}>
            {sub}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Ticker ────────────────────────────────────────────────────────
function Ticker() {
  const txt = NAMED_PLAYER_KEYS.map(k=>{
    const p = NAMED_PLAYERS[k];
    return `${p.name}  ${overallRating(p.attrs)}  ${p.nationality}`;
  }).join('  ·  ');
  const doubled = txt + '  ·  ' + txt;
  return (
    <div style={{
      height:30, background:C.clay, overflow:'hidden',
      display:'flex', alignItems:'center', flexShrink:0,
    }}>
      <div style={{
        fontFamily:C.M, fontSize:8, letterSpacing:'.38em',
        color:'rgba(242,237,228,.75)', padding:'0 16px',
        flexShrink:0, borderRight:'1px solid rgba(242,237,228,.25)',
        marginRight:14, textTransform:'uppercase',
      }}>Roster</div>
      <div style={{flex:1,overflow:'hidden',whiteSpace:'nowrap'}}>
        <span style={{
          display:'inline-block',
          animation:'hv-ticker 30s linear infinite',
          fontFamily:C.M, fontSize:8, letterSpacing:'.22em',
          color:'rgba(242,237,228,.9)',
        }}>{doubled}</span>
      </div>
    </div>
  );
}

// ─── HOME ──────────────────────────────────────────────────────────
function Home({ onPlay, onTenistas, onUniverse, onSimular }) {
  const canRef = useRef(null);

  useEffect(()=>{
    const cv = canRef.current; if (!cv) return;
    const ctx = cv.getContext('2d');
    let raf, t = 0;
    const tick = () => {
      const W = cv.width = cv.offsetWidth;
      const H = cv.height = cv.offsetHeight;
      ctx.clearRect(0,0,W,H);
      const ox = W*0.62, oy = H*0.5;
      const cw = Math.min(W*0.52,420), ch = cw*2.17;
      const alpha = 0.045 + Math.sin(t*0.35)*0.006;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = '#F2EDE4';
      ctx.lineWidth = 1;
      const x0=ox-cw/2, y0=oy-ch/2;
      ctx.strokeRect(x0,y0,cw,ch);
      ctx.beginPath(); ctx.moveTo(x0,oy); ctx.lineTo(x0+cw,oy); ctx.stroke();
      const sbh = ch*0.22;
      ctx.beginPath(); ctx.moveTo(ox-cw*0.25,oy); ctx.lineTo(ox-cw*0.25,oy+sbh); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(ox+cw*0.25,oy); ctx.lineTo(ox+cw*0.25,oy+sbh); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x0,oy+sbh); ctx.lineTo(x0+cw,oy+sbh); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x0,oy-sbh); ctx.lineTo(x0+cw,oy-sbh); ctx.stroke();
      const sw = cw*0.125;
      ctx.beginPath(); ctx.moveTo(x0+sw,y0); ctx.lineTo(x0+sw,y0+ch); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x0+cw-sw,y0); ctx.lineTo(x0+cw-sw,y0+ch); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(ox,y0); ctx.lineTo(ox,y0+16); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(ox,y0+ch); ctx.lineTo(ox,y0+ch-16); ctx.stroke();
      ctx.restore();
      const gr = ctx.createRadialGradient(ox,oy,0,ox,oy,cw*0.8);
      gr.addColorStop(0,'rgba(212,86,30,0.07)');
      gr.addColorStop(1,'transparent');
      ctx.fillStyle = gr;
      ctx.fillRect(0,0,W,H);
      t += 0.016;
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  },[]);

  return (
    <div style={{
      width:'100%', minHeight:'100vh',
      background:'radial-gradient(ellipse 75% 80% at 60% 40%, #0E1A24 0%, #06080A 70%)',
      display:'flex', flexDirection:'column',
      position:'relative', overflow:'hidden',
    }}>
      {/* Court canvas */}
      <canvas ref={canRef} style={{
        position:'absolute',inset:0,width:'100%',height:'100%',
        pointerEvents:'none',zIndex:0,
      }}/>

      {/* Grain */}
      <div style={{
        position:'absolute',inset:0,zIndex:0,pointerEvents:'none',
        backgroundImage:`url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.72' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.038'/%3E%3C/svg%3E")`,
        backgroundSize:'256px 256px',
      }}/>

      <TopChrome/>

      {/* Body */}
      <div style={{
        flex:1, display:'flex', alignItems:'stretch',
        position:'relative', zIndex:10, minHeight:0,
      }}>
        {/* ── LEFT PANEL ── */}
        <div style={{
          width:'clamp(360px,40vw,560px)',
          display:'flex', flexDirection:'column', justifyContent:'center',
          padding:'clamp(44px,7vh,80px) clamp(36px,4.5vw,72px)',
          borderRight:`1px solid ${C.line}`,
          flexShrink:0,
        }}>

          {/* Eyebrow */}
          <div className="a1" style={{
            display:'inline-flex', alignItems:'center', gap:12, marginBottom:28,
          }}>
            <div style={{width:28,height:2,background:C.clay,flexShrink:0}}/>
            <span style={{fontFamily:C.M,fontSize:9,letterSpacing:'.42em',color:C.clay,textTransform:'uppercase'}}>
              Grand Slam Circuit
            </span>
            <span style={{fontFamily:C.M,fontSize:9,letterSpacing:'.42em',color:C.dim}}>2025</span>
          </div>

          {/* Wordmark */}
          <div className="a2" style={{marginBottom:4,lineHeight:1}}>
            <span style={{
              display:'block',
              fontFamily:C.D,
              fontSize:'clamp(72px,9vw,130px)',
              letterSpacing:'.02em',
              color:C.chalk, textTransform:'uppercase', lineHeight:.88,
            }}>
              His<span style={{color:C.clay}}>tó</span>ria
            </span>
            <span style={{
              display:'block',
              fontFamily:C.D,
              fontSize:'clamp(72px,9vw,130px)',
              letterSpacing:'.02em',
              color:'rgba(242,237,228,.08)',
              textTransform:'uppercase', lineHeight:.88, marginBottom:6,
            }}>Viva</span>
          </div>

          {/* Sport subtitle */}
          <span className="a2" style={{
            display:'block',
            fontFamily:C.Bc, fontWeight:300,
            fontSize:'clamp(12px,1.4vw,18px)',
            letterSpacing:'.7em', color:C.dim,
            textTransform:'uppercase',
            paddingLeft:3,
            marginBottom:'clamp(28px,4.5vh,56px)',
          }}>Tennis</span>

          {/* Rule */}
          <div className="a3" style={{
            height:1,
            background:`linear-gradient(90deg,${C.clay} 0%,rgba(212,86,30,.3) 50%,transparent 100%)`,
            transformOrigin:'left',
            animation:'hv-bar .7s .25s both',
            marginBottom:'clamp(18px,3.5vh,32px)',
          }}/>

          {/* Nav */}
          <nav className="a4">
            {[
              {n:'01', l:'Jogar',    fn:onPlay},
              {n:'02', l:'Tenistas', fn:onTenistas},
              {n:'03', l:'Universo', fn:onUniverse},
              {n:'04', l:'Simular',  fn:onSimular},
              {n:'05', l:'Opções',   fn:null, soon:true},
            ].map(({n,l,fn,soon})=>(
              <button key={l} className={`nav-item${soon?' off':''}`} onClick={fn||undefined}>
                <span className="nav-num">{n}</span>
                <span className="nav-lbl">{l}</span>
                {soon
                  ? <span style={{fontFamily:C.M,fontSize:8,letterSpacing:'.28em',color:C.faint,marginRight:10}}>EM BREVE</span>
                  : <span className="nav-arr">→</span>
                }
              </button>
            ))}
          </nav>

          {/* Footer */}
          <div className="a5" style={{
            display:'flex', alignItems:'center', gap:14,
            marginTop:'clamp(20px,3.5vh,40px)',
            paddingTop:14, borderTop:`1px solid ${C.line}`,
          }}>
            <span style={{fontFamily:C.M,fontSize:9,letterSpacing:'.3em',color:C.dim,textTransform:'uppercase'}}>
              {NAMED_PLAYER_KEYS.length} Atletas
            </span>
            <div style={{width:3,height:3,borderRadius:'50%',background:C.dim}}/>
            <span style={{fontFamily:C.M,fontSize:9,letterSpacing:'.3em',color:C.dim,textTransform:'uppercase'}}>
              {COURT_KEYS.length} Quadras
            </span>
            <div style={{flex:1}}/>
            <span style={{fontFamily:C.M,fontSize:9,letterSpacing:'.3em',color:C.dim}}>v1.0</span>
          </div>
        </div>

        {/* ── RIGHT PANEL ── */}
        <div className="a5" style={{
          flex:1, display:'flex', flexDirection:'column', justifyContent:'center',
          padding:'clamp(36px,5.5vh,64px) clamp(32px,4vw,60px)',
        }}>

          {/* Surfaces */}
          <div style={{
            fontFamily:C.M, fontSize:8, letterSpacing:'.48em',
            color:C.dim, textTransform:'uppercase', marginBottom:10,
          }}>Superfícies · Circuito</div>

          <div style={{display:'flex',flexDirection:'column',gap:2,marginBottom:36}}>
            {[
              {cls:'surf-clay',   l:'Saibro', c:'rgba(212,86,30,.6)',   venues:'Roland Garros · Monte Carlo · Madrid'},
              {cls:'surf-grass',  l:'Grama',  c:'rgba(46,204,113,.5)',  venues:'Wimbledon · Queen\'s · Halle'},
              {cls:'surf-hard',   l:'Dura',   c:'rgba(40,96,168,.6)',   venues:'US Open · Australian Open · Miami'},
              {cls:'surf-indoor', l:'Indoor', c:'rgba(139,47,170,.55)', venues:'O2 Arena · Rotterdam · Basileia'},
            ].map(({cls,l,c,venues})=>(
              <div key={l} className={`surf-row ${cls}`}>
                <span style={{
                  fontFamily:C.Bc, fontWeight:700, fontSize:17,
                  textTransform:'uppercase', letterSpacing:'.08em',
                  color:C.chalk, flexShrink:0, width:90,
                }}>{l}</span>
                <span style={{
                  fontFamily:C.M, fontSize:8, letterSpacing:'.15em',
                  color:C.dim, whiteSpace:'nowrap', overflow:'hidden',
                  textOverflow:'ellipsis', flex:1,
                }}>{venues}</span>
                <span style={{fontFamily:C.D,fontSize:22,letterSpacing:'.06em',color:c,flexShrink:0}}>—</span>
              </div>
            ))}
          </div>

          {/* Players strip */}
          <div style={{
            fontFamily:C.M, fontSize:8, letterSpacing:'.48em',
            color:C.dim, textTransform:'uppercase', marginBottom:10,
          }}>Top Players</div>

          <div style={{display:'flex',gap:3}}>
            {NAMED_PLAYER_KEYS.slice(0,6).map((key,i)=>{
              const p  = NAMED_PLAYERS[key];
              const ov = overallRating(p.attrs);
              const sc = PLAY_STYLES[p.styleId]?.barColor ?? C.clay;
              const ph = getPlayerPhoto(key || p);
              return (
                <div key={key} style={{
                  flex:1, aspectRatio:'2/3', position:'relative',
                  overflow:'hidden', background:C.ink3,
                  border:`1px solid ${C.line}`,
                  minWidth:0, cursor:'pointer',
                  transition:'transform .25s ease',
                }}
                  onMouseEnter={e=>e.currentTarget.style.transform='scale(1.025)'}
                  onMouseLeave={e=>e.currentTarget.style.transform='scale(1)'}
                >
                  {/* Top accent */}
                  <div style={{position:'absolute',top:0,left:0,right:0,height:2,background:sc,zIndex:2}}/>

                  {/* Rank */}
                  <div style={{
                    position:'absolute',top:6,left:6,zIndex:2,
                    fontFamily:C.D,fontSize:10,letterSpacing:'.1em',
                    color:'rgba(242,237,228,.3)',lineHeight:1,
                  }}>#{String(i+1).padStart(2,'0')}</div>

                  {ph
                    ? <img src={ph} alt={p.name}
                        style={{
                          position:'absolute',inset:0,width:'100%',height:'100%',
                          objectFit:'cover',objectPosition:'top center',
                          opacity:.68,filter:'brightness(.88) saturate(.85)',
                          transition:'opacity .3s,filter .3s',
                        }}
                        onError={e=>e.currentTarget.style.display='none'}
                      />
                    : <div style={{
                        position:'absolute',inset:0,display:'flex',
                        alignItems:'center',justifyContent:'center',
                        background:`linear-gradient(160deg,${C.ink3},${C.ink2})`,
                      }}>
                        <span style={{fontFamily:C.D,fontSize:40,color:`${sc}22`}}>
                          {p.name.slice(0,2).toUpperCase()}
                        </span>
                      </div>
                  }

                  {/* Gradient */}
                  <div style={{
                    position:'absolute',bottom:0,left:0,right:0,height:'72%',
                    background:'linear-gradient(transparent,rgba(6,8,10,.95))',
                  }}/>

                  {/* Info */}
                  <div style={{position:'absolute',bottom:0,left:0,right:0,padding:'0 7px 8px',zIndex:2}}>
                    <div style={{
                      fontFamily:C.Bc,fontWeight:700,fontSize:12,
                      textTransform:'uppercase',letterSpacing:'.06em',
                      color:C.chalk,whiteSpace:'nowrap',overflow:'hidden',
                      textOverflow:'ellipsis',lineHeight:1.1,
                    }}>{p.name.split(' ').pop()}</div>
                    <div style={{fontFamily:C.D,fontSize:16,letterSpacing:'.04em',marginTop:1,lineHeight:1,color:ovrTier(ov).color}}>
                      {ovrTier(ov).grade}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <Ticker/>
    </div>
  );
}

// ─── TENISTAS ──────────────────────────────────────────────────────
function Tenistas({ onBack, onSelect }) {
  const [q, setQ] = useState('');
  const keys = NAMED_PLAYER_KEYS.filter(k=>{
    const p  = NAMED_PLAYERS[k];
    const lq = q.toLowerCase();
    return !lq
      || p.name.toLowerCase().includes(lq)
      || (p.nationality||'').toLowerCase().includes(lq)
      || (p.styleId||'').toLowerCase().includes(lq);
  });

  return (
    <div style={{width:'100%',height:'100vh',background:C.ink,display:'flex',flexDirection:'column'}}>
      <BackChrome
        label="Tenistas"
        sub={`${NAMED_PLAYER_KEYS.length} atletas · circuito 2025`}
        onBack={onBack}
      />

      {/* Search */}
      <div style={{
        background:C.ink1, borderBottom:`1px solid ${C.line}`,
        padding:'10px 24px', display:'flex', alignItems:'center', gap:10, flexShrink:0,
      }}>
        <span style={{color:C.dim,fontFamily:C.M,fontSize:12}}>⌕</span>
        <input
          value={q} onChange={e=>setQ(e.target.value)}
          placeholder="Buscar por nome, país ou estilo…"
          style={{
            flex:1,background:'none',border:'none',outline:'none',
            fontFamily:C.M,fontSize:11,color:C.chalk,letterSpacing:'.1em',
          }}
        />
        {q && (
          <button onClick={()=>setQ('')}
            style={{background:'none',border:'none',color:C.dim,cursor:'pointer',fontFamily:C.M,fontSize:13}}>
            ×
          </button>
        )}
        <div style={{width:1,height:15,background:C.line}}/>
        <span style={{fontFamily:C.M,fontSize:9,letterSpacing:'.28em',color:C.dim}}>{keys.length} atletas</span>
      </div>

      {/* Grid */}
      <div className="sc" style={{flex:1}}>
        <div style={{
          display:'grid',
          gridTemplateColumns:'repeat(auto-fill,minmax(clamp(140px,11vw,185px),1fr))',
          gap:2, padding:2,
        }}>
          {keys.map((key,idx)=>{
            const p     = NAMED_PLAYERS[key];
            const ov    = overallRating(p.attrs);
            const grade = overallGrade(ov);
            const st    = PLAY_STYLES[p.styleId];
            const sc    = st?.barColor ?? C.clay;
            const ph    = getPlayerPhoto(key || p);
            return (
              <button key={key} className="pcard af"
                style={{animationDelay:`${idx*.018}s`}}
                onClick={()=>onSelect(key)}
              >
                <div style={{height:2,background:`linear-gradient(90deg,${sc},transparent)`,flexShrink:0}}/>
                <div style={{position:'relative',width:'100%',aspectRatio:'2/3',background:C.ink2,overflow:'hidden',flexShrink:0}}>
                  {ph
                    ? <img src={ph} alt={p.name} className="pcard-img"
                        onError={e=>e.currentTarget.style.display='none'}/>
                    : <div style={{
                        width:'100%',height:'100%',display:'flex',
                        alignItems:'center',justifyContent:'center',
                        background:`linear-gradient(135deg,${sc}18,transparent)`,
                      }}>
                        <span style={{fontFamily:C.D,fontSize:48,color:`${sc}20`}}>
                          {String(idx+1).padStart(2,'0')}
                        </span>
                      </div>
                  }
                  <div style={{
                    position:'absolute',bottom:0,left:0,right:0,height:'60%',
                    background:`linear-gradient(transparent,${C.ink}F2)`,
                    pointerEvents:'none',
                  }}/>
                  <div style={{
                    position:'absolute',top:7,left:7,zIndex:2,
                    background:sc,color:C.chalk,
                    fontFamily:C.M,fontSize:8,letterSpacing:'.18em',
                    padding:'3px 7px',textTransform:'uppercase',
                  }}>{st?.abbr??st?.label}</div>
                  <div style={{position:'absolute',bottom:9,left:10,zIndex:3,display:'flex',alignItems:'baseline',gap:3}}>
                    <span style={{fontFamily:C.D,fontSize:30,color:ovrTier(ov).color,lineHeight:1,textShadow:`0 0 14px ${ovrTier(ov).color}55`}}>{ovrTier(ov).grade}</span>
                    <span style={{fontFamily:C.D,fontSize:11,color:`${ovrTier(ov).color}99`}}>{ovrTier(ov).label}</span>
                  </div>
                </div>

                <div style={{padding:'9px 11px 11px',display:'flex',flexDirection:'column',gap:3}}>
                  <div style={{
                    fontFamily:C.Bc,fontWeight:700,
                    fontSize:'clamp(13px,1.2vw,16px)',
                    letterSpacing:'.04em',textTransform:'uppercase',
                    color:C.chalk,lineHeight:1.15,
                  }}>{p.name}</div>
                  <div style={{fontFamily:C.M,fontSize:8,color:C.dim,letterSpacing:'.15em'}}>{p.nationality}</div>
                  <div style={{display:'flex',flexDirection:'column',gap:3,marginTop:4}}>
                    {ATTR_CATEGORIES.slice(0,3).map(cat=>{
                      const { widthPct, color: barC } = (() => { const { widthPct: w, color: clr } = require ? {widthPct:60,color:cat.color} : {widthPct:60,color:cat.color}; return {widthPct:w,color:clr}; })();
                      const { grade: cg } = (() => { const avg2 = catAvg(cat.id,p.attrs); return avg2>=90?{grade:'S'}:avg2>=78?{grade:'A'}:avg2>=65?{grade:'B'}:avg2>=52?{grade:'C'}:{grade:'D'}; })();
                      const avg2 = catAvg(cat.id,p.attrs);
                      const cgv = avg2>=90?{g:'S',c:cat.color}:avg2>=78?{g:'A',c:cat.color}:avg2>=65?{g:'B',c:'rgba(116,172,223,.7)'}:avg2>=52?{g:'C',c:'rgba(237,232,223,.25)'}:{g:'D',c:'rgba(239,68,68,.5)'};
                      return (
                        <div key={cat.id} style={{display:'flex',alignItems:'center',gap:5}}>
                          <span style={{fontFamily:C.M,fontSize:7,letterSpacing:'.18em',color:C.dim,width:26,flexShrink:0,textTransform:'uppercase'}}>
                            {cat.label.slice(0,4)}
                          </span>
                          <div style={{flex:1,height:2,background:C.ghost,overflow:'hidden',
                            clipPath:'polygon(2px 0,100% 0,calc(100% - 2px) 100%,0 100%)'}}>
                            <div style={{height:'100%',width:`${avg2>=90?92:avg2>=78?76:avg2>=65?60:avg2>=52?44:28}%`,background:cgv.c,opacity:.85}}/>
                          </div>
                          <span style={{fontFamily:C.M,fontSize:9,color:cgv.c,width:14,textAlign:'right',flexShrink:0}}>{cgv.g}</span>
                        </div>
                      );
                    })}
                  </div>
                  <div style={{
                    marginTop:6,paddingTop:6,borderTop:`1px solid ${C.line}`,
                    fontFamily:C.M,fontSize:7,letterSpacing:'.28em',color:C.dim,textAlign:'right',
                  }}>VER FICHA →</div>
                </div>
              </button>
            );
          })}
        </div>
        <div style={{height:28}}/>
      </div>
    </div>
  );
}

// ─── MATCH SETUP ───────────────────────────────────────────────────
function MatchSetup({ onStart, onBack }) {
  const [selA, setSelA] = useState(NAMED_PLAYER_KEYS[0]);
  const [selB, setSelB] = useState(NAMED_PLAYER_KEYS[1]);
  const [court, setCourt] = useState(COURT_KEYS[0]);

  const npA  = NAMED_PLAYERS[selA], npB = NAMED_PLAYERS[selB];
  const scA  = PLAY_STYLES[npA?.styleId]?.barColor ?? C.clay;
  const scB  = PLAY_STYLES[npB?.styleId]?.barColor ?? C.clay;
  const ovrA = npA ? overallRating(npA.attrs) : 0;
  const ovrB = npB ? overallRating(npB.attrs) : 0;
  const phA  = getPlayerPhoto(selA);
  const phB  = getPlayerPhoto(selB);
  const sc   = COURTS[court];

  const PlayerCol = ({ slot }) => {
    const isB   = slot==='B';
    const sel   = isB ? selB : selA;
    const setSel = isB ? setSelB : setSelA;
    const np    = NAMED_PLAYERS[sel];
    const psc   = PLAY_STYLES[np?.styleId]?.barColor ?? C.clay;

    return (
      <div className="sc" style={{
        flex:1, overflowY:'auto', padding:'16px 14px',
        borderRight: isB ? 'none' : `1px solid ${C.line}`,
        borderLeft:  isB ? `1px solid ${C.line}` : 'none',
        display:'flex', flexDirection:'column',
      }}>
        <div style={{
          fontFamily:C.M,fontSize:8,letterSpacing:'.38em',
          color:C.dim,marginBottom:10,
          textAlign:isB?'right':'left',textTransform:'uppercase',
        }}>Jogador {slot}</div>

        <div style={{display:'flex',flexDirection:'column',marginBottom:14}}>
          {NAMED_PLAYER_KEYS.map(key=>{
            const p    = NAMED_PLAYERS[key];
            const isSel = key===sel;
            const ksc  = PLAY_STYLES[p.styleId]?.barColor ?? C.clay;
            const kpv  = overallRating(p.attrs);
            const kph  = getPlayerPhoto(key||p);
            return (
              <div key={key}
                className={`prow${isSel?' sel':''}`}
                onClick={()=>setSel(key)}
                style={{
                  flexDirection:isB?'row-reverse':'row',
                  borderLeft:  !isB&&isSel?`3px solid ${ksc}`:undefined,
                  borderRight:  isB&&isSel?`3px solid ${ksc}`:undefined,
                }}
              >
                <div style={{width:30,height:30,flexShrink:0,overflow:'hidden',background:C.ink3,border:`1px solid ${C.line}`}}>
                  {kph
                    ? <img src={kph} alt={p.name}
                        style={{width:'100%',height:'100%',objectFit:'cover',objectPosition:'top'}}
                        onError={e=>e.currentTarget.style.display='none'}/>
                    : <div style={{width:'100%',height:'100%',background:`${ksc}20`,display:'flex',alignItems:'center',justifyContent:'center'}}>
                        <span style={{fontFamily:C.Bc,fontWeight:700,fontSize:9,color:ksc}}>
                          {p.name.slice(0,2).toUpperCase()}
                        </span>
                      </div>
                  }
                </div>
                <div style={{flex:1,minWidth:0,textAlign:isB?'right':'left'}}>
                  <div style={{
                    fontFamily:C.Bc,fontWeight:700,fontSize:15,
                    letterSpacing:'.04em',color:isSel?C.chalk:C.dim,
                    textTransform:'uppercase',lineHeight:1,
                    whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',
                  }}>{p.name}</div>
                  <div style={{fontFamily:C.M,fontSize:8,color:C.faint,letterSpacing:'.15em',marginTop:2}}>
                    {PLAY_STYLES[p.styleId]?.abbr} · {p.nationality}
                  </div>
                </div>
                <div style={{fontFamily:C.D,fontSize:22,color:isSel?ksc:'rgba(242,237,228,.18)',lineHeight:1,flexShrink:0}}>
                  {kpv}
                </div>
              </div>
            );
          })}
        </div>

        {np && (
          <div style={{
            padding:'12px',background:C.ink2,border:`1px solid ${C.line}`,
            borderLeft: !isB?`3px solid ${psc}`:undefined,
            borderRight:  isB?`3px solid ${psc}`:undefined,
          }}>
            <div style={{fontFamily:C.M,fontSize:8,letterSpacing:'.32em',color:C.dim,marginBottom:10,textAlign:isB?'right':'left',textTransform:'uppercase'}}>
              Atributos
            </div>
            {ATTR_CATEGORIES.map(cat=>{
              const avg = catAvg(cat.id,np.attrs);
              const cg = avg>=90?{g:'S',c:cat.color,w:92}:avg>=78?{g:'A',c:cat.color,w:76}:avg>=65?{g:'B',c:'rgba(116,172,223,.7)',w:60}:avg>=52?{g:'C',c:'rgba(237,232,223,.3)',w:44}:{g:'D',c:'rgba(239,68,68,.5)',w:28};
              return (
                <div key={cat.id} style={{display:'flex',alignItems:'center',gap:8,marginBottom:6,flexDirection:isB?'row-reverse':'row'}}>
                  <span style={{fontFamily:C.M,fontSize:8,letterSpacing:'.18em',color:C.dim,width:44,flexShrink:0,textAlign:isB?'left':'right',textTransform:'uppercase'}}>
                    {cat.label.slice(0,5)}
                  </span>
                  <div style={{flex:1,height:4,background:C.ghost,overflow:'hidden',clipPath:'polygon(2px 0,100% 0,calc(100% - 2px) 100%,0 100%)'}}>
                    <div style={{height:'100%',width:`${cg.w}%`,background:cg.c,transition:'width .35s ease'}}/>
                  </div>
                  <span style={{fontFamily:C.D,fontSize:14,color:cg.c,width:24,flexShrink:0,textAlign:isB?'right':'left',lineHeight:1}}>
                    {cg.g}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{width:'100%',height:'100vh',background:C.ink,display:'flex',flexDirection:'column',overflow:'hidden'}}>
      <BackChrome label="Nova Partida" onBack={onBack}/>

      <div style={{flex:1,display:'flex',overflow:'hidden',minHeight:0}}>
        <PlayerCol slot="A"/>

        {/* Centre */}
        <div className="sc" style={{
          width:'clamp(190px,16vw,230px)',flexShrink:0,overflowY:'auto',
          background:C.ink1,padding:'16px 12px',
          borderLeft:`1px solid ${C.line}`,borderRight:`1px solid ${C.line}`,
          display:'flex',flexDirection:'column',
        }}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'center',marginBottom:14}}>
            <div style={{flex:1,height:1,background:`linear-gradient(90deg,transparent,${scA}55)`}}/>
            <div style={{fontFamily:C.D,fontSize:20,color:C.clay,letterSpacing:'.28em',padding:'0 10px',flexShrink:0}}>VS</div>
            <div style={{flex:1,height:1,background:`linear-gradient(90deg,${scB}55,transparent)`}}/>
          </div>

          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16,padding:'9px 10px',background:C.ink2,border:`1px solid ${C.line}`}}>
            <div style={{textAlign:'center'}}>
              <div style={{fontFamily:C.D,fontSize:26,color:ovrTier(ovrA).color,lineHeight:1}}>{ovrTier(ovrA).grade}</div>
              <div style={{fontFamily:C.M,fontSize:7,color:C.dim,letterSpacing:'.2em',marginTop:2}}>NÍVEL A</div>
            </div>
            <div style={{width:1,height:26,background:C.line}}/>
            <div style={{textAlign:'center'}}>
              <div style={{fontFamily:C.D,fontSize:26,color:ovrTier(ovrB).color,lineHeight:1}}>{ovrTier(ovrB).grade}</div>
              <div style={{fontFamily:C.M,fontSize:7,color:C.dim,letterSpacing:'.2em',marginTop:2}}>NÍVEL B</div>
            </div>
          </div>

          <div style={{fontFamily:C.M,fontSize:8,letterSpacing:'.38em',color:C.dim,marginBottom:8,textTransform:'uppercase'}}>
            Quadra
          </div>

          {COURT_KEYS.map(k=>{
            const c    = COURTS[k];
            const isSel = k===court;
            const favA = isStyleFavored(k,npA?.styleId);
            const penA = isStylePenalized(k,npA?.styleId);
            const favB = isStyleFavored(k,npB?.styleId);
            const penB = isStylePenalized(k,npB?.styleId);
            return (
              <div key={k} className={`copt${isSel?' sel':''}`} onClick={()=>setCourt(k)}>
                <div style={{width:3,height:30,background:c.visual.courtColor,flexShrink:0}}/>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{
                    fontFamily:C.Bc,fontWeight:700,fontSize:13,
                    color:isSel?C.chalk:C.dim,
                    textTransform:'uppercase',letterSpacing:'.04em',
                    lineHeight:1,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',
                  }}>{c.meta.name}</div>
                  <div style={{fontFamily:C.M,fontSize:8,color:C.faint,letterSpacing:'.12em',marginTop:2}}>{c.meta.location}</div>
                  {(favA||penA||favB||penB) && (
                    <div style={{display:'flex',gap:4,marginTop:3}}>
                      {favA && <span style={{fontSize:8,color:'#3DEB6A',fontFamily:C.M}}>✓A</span>}
                      {penA && <span style={{fontSize:8,color:'#FF5555',fontFamily:C.M}}>✗A</span>}
                      {favB && <span style={{fontSize:8,color:'#3DEB6A',fontFamily:C.M}}>✓B</span>}
                      {penB && <span style={{fontSize:8,color:'#FF5555',fontFamily:C.M}}>✗B</span>}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {sc && (
            <div style={{marginTop:10,padding:'10px 11px',background:`${sc.visual.courtColor}0E`,borderLeft:`3px solid ${sc.visual.courtColor}`}}>
              <p style={{fontFamily:C.B,fontStyle:'italic',fontSize:11,lineHeight:1.7,color:C.dim,marginBottom:9}}>
                {sc.meta.desc}
              </p>
              <div style={{display:'flex',gap:6}}>
                {[['Bounce',sc.physics.restitution?.toFixed(2)],['Atrito',sc.physics.groundFriction?.toFixed(2)]].map(([l,v])=>(
                  <div key={l} style={{flex:1,textAlign:'center',padding:'7px 4px',background:C.ghost}}>
                    <div style={{fontFamily:C.M,fontSize:7,letterSpacing:'.2em',color:C.dim}}>{l}</div>
                    <div style={{fontFamily:C.D,fontSize:18,color:C.chalk,lineHeight:1,marginTop:2}}>{v}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <PlayerCol slot="B"/>
      </div>

      {/* Action bar */}
      <div style={{
        height:'clamp(62px,7vh,78px)',flexShrink:0,
        background:C.ink2,borderTop:`2px solid ${C.clay}`,
        display:'flex',alignItems:'center',
        justifyContent:'space-between',padding:'0 24px',
      }}>
        <div style={{display:'flex',alignItems:'center',gap:8,flex:1,minWidth:0}}>
          {phA && (
            <div style={{width:34,height:34,overflow:'hidden',flexShrink:0,border:`2px solid ${scA}`}}>
              <img src={phA} alt={npA?.name}
                style={{width:'100%',height:'100%',objectFit:'cover',objectPosition:'top'}}
                onError={e=>e.currentTarget.style.display='none'}/>
            </div>
          )}
          <span style={{fontFamily:C.D,fontSize:'clamp(16px,2vw,28px)',color:C.chalk,textTransform:'uppercase',letterSpacing:'.04em',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',maxWidth:'22vw'}}>
            {npA?.name??'—'}
          </span>
          <span style={{fontFamily:C.D,fontSize:'clamp(13px,1.5vw,20px)',color:C.clay,letterSpacing:'.32em',flexShrink:0}}>VS</span>
          <span style={{fontFamily:C.D,fontSize:'clamp(16px,2vw,28px)',color:C.chalk,textTransform:'uppercase',letterSpacing:'.04em',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',maxWidth:'22vw'}}>
            {npB?.name??'—'}
          </span>
          {phB && (
            <div style={{width:34,height:34,overflow:'hidden',flexShrink:0,border:`2px solid ${scB}`}}>
              <img src={phB} alt={npB?.name}
                style={{width:'100%',height:'100%',objectFit:'cover',objectPosition:'top'}}
                onError={e=>e.currentTarget.style.display='none'}/>
            </div>
          )}
        </div>

        {sc && (
          <div style={{display:'flex',alignItems:'center',gap:7,padding:'5px 12px',border:`1px solid ${C.line}`,flexShrink:0,marginLeft:12}}>
            <div style={{width:5,height:5,background:sc.visual.courtColor}}/>
            <span style={{fontFamily:C.Bc,fontWeight:700,fontSize:11,letterSpacing:'.18em',color:C.dim,textTransform:'uppercase'}}>
              {sc.meta.name}
            </span>
          </div>
        )}

        <button
          disabled={selA===selB}
          onClick={()=>onStart(selA,selB,court)}
          style={{
            marginLeft:12,flexShrink:0,
            background:selA===selB?C.ink3:C.clay,
            border:'none',color:C.chalk,
            fontFamily:C.D,
            fontSize:'clamp(13px,1.5vw,18px)',
            letterSpacing:'.2em',textTransform:'uppercase',
            padding:'clamp(11px,1.4vh,17px) clamp(24px,3vw,44px)',
            cursor:selA===selB?'not-allowed':'pointer',
            opacity:selA===selB?.3:1,
            transition:'background .14s',
            clipPath:'polygon(0 0,100% 0,calc(100% - 8px) 100%,0 100%)',
          }}
          onMouseEnter={e=>{ if(selA!==selB) e.currentTarget.style.background=C.clayHi; }}
          onMouseLeave={e=>{ if(selA!==selB) e.currentTarget.style.background=C.clay; }}
        >
          {selA===selB?'Adversários iguais':'▶  Jogar Agora'}
        </button>
      </div>
    </div>
  );
}

// ─── ROOT ──────────────────────────────────────────────────────────
export default function HomeScreen({ onStartGame }) {
  const [page, setPage]     = useState('home');
  const [fichaKey, setFicha] = useState(null);
  useEffect(()=>{ injectCSS(); },[]);

  const goFicha = k => { setFicha(k); setPage('ficha'); };

  if (page==='play')      return <MatchSetup onStart={(a,b,c)=>onStartGame(a,b,c)} onBack={()=>setPage('home')}/>;
  if (page==='tenistas')  return <Tenistas onBack={()=>setPage('home')} onSelect={goFicha}/>;
  if (page==='ficha'&&fichaKey) return <UnifiedPlayerProfile playerKey={fichaKey} onBack={()=>setPage('tenistas')} onNavigate={goFicha}/>;
  if (page==='universe')  return <UniverseManager onBack={()=>setPage('home')}/>;
  if (page==='simular')   return <SimulatorScreen onBack={()=>setPage('home')}/>;
  return <Home
    onPlay={()=>setPage('play')}
    onTenistas={()=>setPage('tenistas')}
    onUniverse={()=>setPage('universe')}
    onSimular={()=>setPage('simular')}
  />;
}
