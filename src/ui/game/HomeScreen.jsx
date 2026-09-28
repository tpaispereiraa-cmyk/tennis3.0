import React, { useState, useEffect, useRef } from 'react';
import { ovrTier } from '../../systems/scouting/ScoutProfile.js';
import {
  NAMED_PLAYERS, NAMED_PLAYER_KEYS,
  ATTR_CATEGORIES, catAvg, overallRating, overallGrade,
  getPlayerPhoto,
} from '../../domain/players/players.js';
import { PLAY_STYLES } from '../../domain/players/styles.js';
import { COURTS, COURT_KEYS, isStyleFavored, isStylePenalized } from '../../domain/courts/courtConfigs.js';
import DefinitivePlayerProfile from '../players/DefinitivePlayerProfile.jsx';
import UniverseManager from '../universe/UniverseManager.jsx';
import SimulatorScreen from './SimulatorScreen.jsx';
import { HOME_THEME as C } from '../theme/uiTheme.js';

// -—-—-—- Design Tokens -— História Viva Identity -—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-

// -—-—-—- Global CSS -—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-
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
@keyframes hv-orbit {0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}
@keyframes hv-scan {0%{transform:translateX(-140%) skewX(-18deg)}100%{transform:translateX(160%) skewX(-18deg)}}
@keyframes hv-glow {0%,100%{filter:drop-shadow(0 0 24px rgba(212,86,30,.16))}50%{filter:drop-shadow(0 0 54px rgba(232,200,74,.26))}}

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

/* -—-—- NAV ITEMS -—-—- */
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

/* -—-—- PLAYER CARDS (tenistas grid) -—-—- */
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

/* -—-—- PLAYER ROWS (match setup) -—-—- */
.prow{
  display:flex;align-items:center;gap:10px;cursor:pointer;
  border:1px solid rgba(242,237,228,.06);margin-bottom:2px;
  padding:8px 12px;transition:background .12s,border-color .12s;
}
.prow:hover{background:rgba(242,237,228,.04);border-color:rgba(242,237,228,.14)}
.prow.sel{border-color:#D4561E;background:rgba(212,86,30,.08)}

/* -—-—- COURT OPTIONS -—-—- */
.copt{
  display:flex;align-items:center;gap:10px;cursor:pointer;
  border:1px solid rgba(242,237,228,.06);margin-bottom:2px;
  padding:9px 12px;transition:background .12s,border-color .12s;
}
.copt:hover{background:rgba(242,237,228,.04);border-color:rgba(242,237,228,.14)}
.copt.sel{border-color:#D4561E;background:rgba(212,86,30,.07)}

/* -—-—- SURFACE ROWS -—-—- */
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

/* -—-—- BACK BUTTON -—-—- */
.back-btn{
  font-family:'Space Mono',monospace;font-size:9px;
  letter-spacing:.22em;text-transform:uppercase;
  background:none;border:1px solid rgba(242,237,228,.07);
  color:rgba(242,237,228,.55);padding:5px 14px;
  cursor:pointer;transition:all .13s;
  clip-path:polygon(4px 0,100% 0,calc(100% - 4px) 100%,0 100%);
}
.back-btn:hover{background:rgba(242,237,228,.05);color:#F2EDE4;border-color:rgba(242,237,228,.14)}

.home-shell{
  width:100%;min-height:100vh;display:flex;flex-direction:column;position:relative;overflow:hidden;
  background:
    radial-gradient(circle at 18% 20%, rgba(212,86,30,.12), transparent 20%),
    radial-gradient(circle at 82% 78%, rgba(232,200,74,.06), transparent 24%),
    radial-gradient(ellipse 75% 80% at 60% 40%, #0E1A24 0%, #06080A 70%);
}
.home-body{
  flex:1;display:flex;align-items:stretch;position:relative;z-index:10;min-height:0;
}
.home-left{
  width:clamp(420px,42vw,640px);display:flex;flex-direction:column;justify-content:center;
  padding:clamp(52px,8vh,92px) clamp(44px,5vw,86px);
  border-right:1px solid rgba(242,237,228,.08);
  background:linear-gradient(90deg,rgba(6,8,10,.92) 0%,rgba(6,8,10,.78) 72%,transparent 100%);
  flex-shrink:0;
}
.home-right{
  flex:1;display:flex;flex-direction:column;justify-content:center;
  padding:clamp(38px,5.5vh,68px) clamp(34px,4.2vw,64px);gap:26px;
}
.home-panel{
  background:linear-gradient(180deg, rgba(20,28,34,.78), rgba(10,14,18,.92));
  border:1px solid rgba(242,237,228,.10);
  box-shadow:0 20px 60px rgba(0,0,0,.34);
}
.home-surface-panel,.home-players-panel{
  padding:18px 18px 16px;
  clip-path:polygon(0 0,100% 0,calc(100% - 12px) 100%,0 100%);
}
.home-highlight-grid{
  display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;
}
.home-highlight-card{
  padding:12px 14px;background:rgba(242,237,228,.025);border:1px solid rgba(242,237,228,.08);
}
.home-highlight-kicker{
  font-family:'Space Mono',monospace;font-size:7px;letter-spacing:.28em;text-transform:uppercase;color:rgba(242,237,228,.38);
}
.home-highlight-value{
  margin-top:5px;font-family:'Bebas Neue',sans-serif;font-size:28px;line-height:.9;letter-spacing:.04em;color:#F2EDE4;
}
.home-highlight-copy{
  margin-top:6px;font-family:'Barlow',sans-serif;font-size:12px;line-height:1.5;color:rgba(242,237,228,.46);
}
.home-aaa-shell{
  width:100%;min-height:100vh;display:flex;flex-direction:column;position:relative;overflow:hidden;
  background:
    radial-gradient(circle at 16% 8%, rgba(212,86,30,.22), transparent 28%),
    radial-gradient(circle at 88% 16%, rgba(104,182,255,.16), transparent 24%),
    radial-gradient(circle at 54% 100%, rgba(232,200,74,.12), transparent 36%),
    linear-gradient(120deg, #030507 0%, #071018 45%, #030507 100%);
}
.home-aaa-shell::before{
  content:'';position:absolute;inset:0;pointer-events:none;
  background:
    linear-gradient(90deg, rgba(242,237,228,.035) 1px, transparent 1px),
    linear-gradient(0deg, rgba(242,237,228,.025) 1px, transparent 1px);
  background-size:52px 52px;opacity:.28;
  mask-image:radial-gradient(ellipse at center, black 0%, transparent 72%);
}
.home-aaa-shell::after{
  content:'';position:absolute;inset:-28% -10%;pointer-events:none;
  background:conic-gradient(from 90deg, transparent, rgba(212,86,30,.10), transparent, rgba(232,200,74,.08), transparent);
  animation:hv-orbit 46s linear infinite;opacity:.5;
}
.home-aaa-stage{position:relative;z-index:2;flex:1;display:grid;grid-template-columns:minmax(520px,.95fr) minmax(520px,1.05fr);gap:22px;padding:clamp(28px,4vw,58px);min-height:0}
.home-aaa-card{
  position:relative;overflow:hidden;
  background:linear-gradient(145deg, rgba(14,21,27,.82), rgba(5,8,12,.94));
  border:1px solid rgba(242,237,228,.10);
  box-shadow:0 34px 110px rgba(0,0,0,.46), inset 0 1px 0 rgba(255,255,255,.035);
}
.home-aaa-card::before{
  content:'';position:absolute;top:-20%;bottom:-20%;left:-35%;width:28%;
  background:linear-gradient(90deg, transparent, rgba(242,237,228,.065), transparent);
  animation:hv-scan 9s ease-in-out infinite;
}
.home-aaa-hero{padding:clamp(34px,5vw,72px);display:flex;flex-direction:column;justify-content:center}
.home-aaa-kicker{font-family:'Space Mono',monospace;font-size:8px;letter-spacing:.5em;text-transform:uppercase;color:#D4561E}
.home-aaa-title{
  margin-top:18px;font-family:'Bebas Neue',sans-serif;font-size:clamp(78px,10vw,150px);
  line-height:.78;letter-spacing:.015em;text-transform:uppercase;color:#F2EDE4;
  animation:hv-glow 5s ease-in-out infinite;
}
.home-aaa-title span{color:#D4561E}
.home-aaa-sub{max-width:760px;margin-top:22px;font-family:'Barlow Condensed',sans-serif;font-size:clamp(19px,2vw,28px);line-height:1.22;color:rgba(242,237,228,.70)}
.home-aaa-actions{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:34px}
.home-aaa-action{
  position:relative;text-align:left;cursor:pointer;color:#F2EDE4;
  background:rgba(242,237,228,.035);border:1px solid rgba(242,237,228,.10);
  padding:16px 18px;min-height:92px;transition:transform .16s,border-color .16s,background .16s;
}
.home-aaa-action.primary{grid-column:1/-1;background:linear-gradient(135deg, rgba(212,86,30,.26), rgba(232,200,74,.06));border-color:rgba(212,86,30,.45)}
.home-aaa-action:hover{transform:translateY(-3px);border-color:rgba(232,200,74,.34);background:rgba(242,237,228,.06)}
.home-aaa-action-num{font-family:'Space Mono',monospace;font-size:8px;letter-spacing:.22em;color:rgba(242,237,228,.36)}
.home-aaa-action-title{margin-top:8px;font-family:'Bebas Neue',sans-serif;font-size:34px;line-height:.9;letter-spacing:.04em;text-transform:uppercase}
.home-aaa-action-sub{margin-top:8px;font-family:'Barlow',sans-serif;font-size:12px;line-height:1.45;color:rgba(242,237,228,.52)}
.home-aaa-side{display:grid;grid-template-rows:auto 1fr auto;gap:14px;min-height:0}
.home-aaa-metric-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
.home-aaa-metric{padding:16px;background:rgba(242,237,228,.032);border:1px solid rgba(242,237,228,.09)}
.home-aaa-metric-value{font-family:'Bebas Neue',sans-serif;font-size:42px;line-height:.85;color:#F2EDE4}
.home-aaa-metric-label{margin-top:7px;font-family:'Space Mono',monospace;font-size:7px;letter-spacing:.22em;text-transform:uppercase;color:rgba(242,237,228,.36)}
.home-aaa-star-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;min-height:0}
.home-aaa-star{position:relative;overflow:hidden;min-height:230px;background:#0B1116;border:1px solid rgba(242,237,228,.09)}
.home-aaa-star img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:top center;filter:brightness(.78) saturate(.92);transform:scale(1.02)}
.home-aaa-star::after{content:'';position:absolute;inset:0;background:linear-gradient(180deg, transparent 28%, rgba(3,5,7,.96) 100%)}
.home-aaa-star-info{position:absolute;left:12px;right:12px;bottom:12px;z-index:2}
.home-aaa-star-name{font-family:'Barlow Condensed',sans-serif;font-size:22px;font-weight:800;line-height:.92;text-transform:uppercase;color:#F2EDE4}
.home-aaa-star-meta{margin-top:6px;font-family:'Space Mono',monospace;font-size:8px;letter-spacing:.16em;color:rgba(242,237,228,.48)}
.home-aaa-world{padding:18px 20px}
.home-aaa-world-title{font-family:'Space Mono',monospace;font-size:8px;letter-spacing:.36em;text-transform:uppercase;color:rgba(232,200,74,.72);margin-bottom:12px}
.home-aaa-world-row{display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid rgba(242,237,228,.065)}
.home-aaa-world-row:last-child{border-bottom:none}
.home-aaa-world-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0}
.home-aaa-world-copy{font-family:'Barlow',sans-serif;font-size:13px;line-height:1.45;color:rgba(242,237,228,.62)}
@media(max-width:1100px){
  .home-aaa-stage{grid-template-columns:1fr;overflow:auto}
  .home-aaa-star{min-height:180px}
}
`;
  const el = document.createElement('style');
  el.id = 'hv3-css'; el.textContent = css;
  document.head.appendChild(el);
}

// -—-—-—- Top Chrome -—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-
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
      }}>História viva: O Outro mundo</span>

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

// -—-—-—- Back Chrome -—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-
function BackChrome({ label, sub, onBack }) {
  return (
    <div style={{
      height:46,
      background:'rgba(10,14,15,.9)',
      borderBottom:`2px solid rgba(212,86,30,.35)`,
      display:'flex', alignItems:'center',
      padding:'0 24px', gap:14, flexShrink:0, zIndex:30,
    }}>
      <button className="back-btn" onClick={onBack}>Voltar</button>
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

// -—-—-—- Ticker -—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—€-—-
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

// -—-—-—- HOME -—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-”€-—-—-
function Home({ onPlay, onTenistas, onUniverse, onLoadGame, onSimular }) {
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

  const stars = NAMED_PLAYER_KEYS.slice(0, 6).map((key) => {
    const p = NAMED_PLAYERS[key];
    const ov = overallRating(p.attrs);
    return { key, p, ov, tier: ovrTier(ov), photo: getPlayerPhoto(key || p) };
  });

  const actionCards = [
    { n:'01', title:'Universo Expandido', sub:'Abrir a temporada viva: ranking, calendário, rivalidades, imprensa e legado.', fn:onUniverse, primary:true },
    { n:'02', title:'Jogar Agora', sub:'Escolher dois jogadores, uma quadra e entrar na partida.', fn:onPlay },
    { n:'03', title:'Tenistas', sub:'Explorar elenco, fichas, atributos, estilos e identidade dos jogadores.', fn:onTenistas },
    { n:'04', title:'Simular Carreiras', sub:'Testar eras, trajetórias e destinos fora do modo universo.', fn:onSimular },
  ];

  return (
    <div className="home-aaa-shell">
      <canvas ref={canRef} style={{ position:'absolute', inset:0, width:'100%', height:'100%', pointerEvents:'none', zIndex:1 }} />
      <div style={{
        position:'absolute', inset:0, zIndex:1, pointerEvents:'none',
        backgroundImage:`url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.72' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.045'/%3E%3C/svg%3E")`,
        backgroundSize:'256px 256px',
      }} />

      <TopChrome />

      <main className="home-aaa-stage">
        <section className="home-aaa-card home-aaa-hero a1">
          <div style={{ position:'relative', zIndex:1 }}>
            <div className="home-aaa-kicker">Tennis Universe · História Viva</div>
            <h1 className="home-aaa-title">
              O Outro<br /><span>Mundo</span>
            </h1>
            <p className="home-aaa-sub">
              Um circuito inteiro respirando: temporadas, ranking, imprensa, recordes, jovens surgindo, veteranos caindo e rivalidades que deixam cicatriz.
            </p>

            <div className="home-aaa-actions">
              <button className="home-aaa-action" onClick={onLoadGame} style={{ minHeight: 70 }}>
                <div className="home-aaa-action-num">SAVE</div>
                <div className="home-aaa-action-title" style={{ fontSize: 26 }}>Carregar Jogo</div>
                <div className="home-aaa-action-sub">Abrir um .tennis-save comprimido ou um JSON antigo e entrar direto no BroadcastHub.</div>
              </button>
              {actionCards.map(card => (
                <button key={card.n} className={`home-aaa-action${card.primary ? ' primary' : ''}`} onClick={card.fn}>
                  <div className="home-aaa-action-num">{card.n}</div>
                  <div className="home-aaa-action-title">{card.title}</div>
                  <div className="home-aaa-action-sub">{card.sub}</div>
                </button>
              ))}
            </div>
          </div>
        </section>

        <aside className="home-aaa-side">
          <div className="home-aaa-metric-grid a2">
            {[
              { value:'2025', label:'ano zero do arquivo' },
              { value:String(NAMED_PLAYER_KEYS.length), label:'jogadores nomeados' },
              { value:String(COURT_KEYS.length), label:'arenas jogáveis' },
            ].map(item => (
              <div key={item.label} className="home-aaa-card home-aaa-metric">
                <div className="home-aaa-metric-value">{item.value}</div>
                <div className="home-aaa-metric-label">{item.label}</div>
              </div>
            ))}
          </div>

          <div className="home-aaa-star-grid a3">
            {stars.slice(0, 3).map(({ key, p, tier, photo }) => (
              <div key={key} className="home-aaa-star">
                {photo && <img src={photo} alt={p.name} onError={e => { e.currentTarget.style.display = 'none'; }} />}
                <div style={{ position:'absolute', top:10, left:10, zIndex:2, fontFamily:C.M, fontSize:8, letterSpacing:'.18em', color:tier.color }}>
                  {tier.grade} · {p.nationality}
                </div>
                <div className="home-aaa-star-info">
                  <div className="home-aaa-star-name">{p.name}</div>
                  <div className="home-aaa-star-meta">{PLAY_STYLES[p.styleId]?.label ?? p.styleId ?? 'Perfil aberto'}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="home-aaa-card home-aaa-world a4">
            <div className="home-aaa-world-title">Sinais do circuito</div>
            {[
              { color:C.clay, text:'O modo universo agora é a entrada principal: calendário, rankings, notícias e memória de temporada.' },
              { color:'#E8C84A', text:'O Almanaque guarda os anos como capítulos históricos, com top 25, Slams, recordes e ecos de era.' },
              { color:'#68B6FF', text:'A partida rápida continua viva para quem quer entrar em quadra sem atravessar a temporada inteira.' },
            ].map(item => (
              <div key={item.text} className="home-aaa-world-row">
                <span className="home-aaa-world-dot" style={{ background:item.color, boxShadow:`0 0 18px ${item.color}88` }} />
                <span className="home-aaa-world-copy">{item.text}</span>
              </div>
            ))}
          </div>
        </aside>
      </main>

      <Ticker />
    </div>
  );
}

function UniverseModeSelect({ onBack, onSelectMode }) {
  const options = [
    {
      id: 'normal',
      title: 'Normal',
      kicker: 'Originais + Newgens',
      desc: 'Mantém o cast original e completa o circuito com newgens até fechar o tour.',
      detail: '127 originais no tour, mais newgens profissionais e juniors separados.',
    },
    {
      id: 'all_new',
      title: 'All New',
      kicker: 'Mundo 100% Procedural',
      desc: 'Remove o cast original do tour inicial e preenche o universo inteiro com jogadores gerados.',
      detail: 'Tour profissional e juniors nascem todos como newgens aleatórios.',
    },
  ];

  return (
    <div className="home-shell">
      <TopChrome />
      <BackChrome label="Modo Universo" sub="Escolha a fundação do circuito" onBack={onBack} />
      <div className="home-body" style={{ alignItems: 'center', justifyContent: 'center', padding: '48px 32px' }}>
        <div className="home-panel" style={{
          width: 'min(980px, 100%)',
          padding: '28px',
          clipPath: 'polygon(0 0,100% 0,calc(100% - 14px) 100%,0 100%)',
        }}>
          <div style={{ marginBottom: 22 }}>
            <div style={{ fontFamily: C.M, fontSize: 8, letterSpacing: '.42em', color: C.clay, textTransform: 'uppercase', marginBottom: 10 }}>
              Universo Expandido
            </div>
            <div style={{ fontFamily: C.D, fontSize: 'clamp(34px,4vw,56px)', letterSpacing: '.04em', color: C.chalk, textTransform: 'uppercase', lineHeight: .92 }}>
              Como você quer abrir o circuito?
            </div>
            <div style={{ fontFamily: C.B, fontSize: 14, color: C.dim, marginTop: 10, maxWidth: 720, lineHeight: 1.6 }}>
              O modo normal preserva a base histórica do universo. O modo all new gera um mundo inteiro novo desde o primeiro dia.
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 18 }}>
            {options.map(option => (
              <button
                key={option.id}
                onClick={() => onSelectMode(option.id)}
                style={{
                  textAlign: 'left',
                  background: 'linear-gradient(180deg, rgba(20,28,34,.82), rgba(10,14,18,.96))',
                  border: `1px solid ${C.line}`,
                  padding: '22px 22px 20px',
                  cursor: 'pointer',
                  color: C.chalk,
                  clipPath: 'polygon(0 0,100% 0,calc(100% - 10px) 100%,0 100%)',
                  transition: 'border-color .14s, transform .14s, box-shadow .14s',
                  boxShadow: '0 20px 44px rgba(0,0,0,.22)',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = 'rgba(212,86,30,.45)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 24px 54px rgba(0,0,0,.3)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = C.line;
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 20px 44px rgba(0,0,0,.22)';
                }}
              >
                <div style={{ fontFamily: C.M, fontSize: 8, letterSpacing: '.34em', color: C.clay, textTransform: 'uppercase', marginBottom: 12 }}>
                  {option.kicker}
                </div>
                <div style={{ fontFamily: C.D, fontSize: 'clamp(28px,3vw,42px)', letterSpacing: '.04em', textTransform: 'uppercase', lineHeight: .95, marginBottom: 10 }}>
                  {option.title}
                </div>
                <div style={{ fontFamily: C.B, fontSize: 14, color: 'rgba(242,237,228,.82)', lineHeight: 1.55, marginBottom: 14 }}>
                  {option.desc}
                </div>
                <div style={{ fontFamily: C.M, fontSize: 9, letterSpacing: '.18em', color: C.dim, textTransform: 'uppercase' }}>
                  {option.detail}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// -—-—-—- TENISTAS -—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-
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
          placeholder="Buscar por nome, país ou estilo⬦"
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
                  }}>VER FICHA</div>
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

// -—-—-—- MATCH SETUP -—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-
function MatchSetup({ onStart, onBack }) {
  const quickParams = new URLSearchParams(window.location.search);
  const quickA = quickParams.get('a');
  const quickB = quickParams.get('b');
  const quickCourt = quickParams.get('court');
  const [selA, setSelA] = useState(NAMED_PLAYERS[quickA] ? quickA : NAMED_PLAYER_KEYS[0]);
  const [selB, setSelB] = useState(NAMED_PLAYERS[quickB] ? quickB : NAMED_PLAYER_KEYS[1]);
  const [court, setCourt] = useState(COURTS[quickCourt] ? quickCourt : COURT_KEYS[0]);
  const [queryA, setQueryA] = useState('');
  const [queryB, setQueryB] = useState('');
  const [filterA, setFilterA] = useState('all');
  const [filterB, setFilterB] = useState('all');

  const npA  = NAMED_PLAYERS[selA], npB = NAMED_PLAYERS[selB];
  const scA  = PLAY_STYLES[npA?.styleId]?.barColor ?? C.clay;
  const scB  = PLAY_STYLES[npB?.styleId]?.barColor ?? C.clay;
  const ovrA = npA ? overallRating(npA.attrs) : 0;
  const ovrB = npB ? overallRating(npB.attrs) : 0;
  const phA  = getPlayerPhoto(selA);
  const phB  = getPlayerPhoto(selB);
  const sc   = COURTS[court];
  const playerRows = NAMED_PLAYER_KEYS.map(key => {
    const p = NAMED_PLAYERS[key];
    return { key, player: p, rating: p ? overallRating(p.attrs) : 0 };
  });
  const top20 = new Set([...playerRows].sort((a,b)=>b.rating-a.rating).slice(0,20).map(r=>r.key));
  const top50 = new Set([...playerRows].sort((a,b)=>b.rating-a.rating).slice(0,50).map(r=>r.key));
  const filterDefs = [
    { id:'all', label:'Todos' },
    { id:'top20', label:'Top 20' },
    { id:'top50', label:'Top 50' },
    { id:'big', label:'Big Servers' },
    { id:'picked', label:'Selecionados' },
  ];
  const normalizeSearch = value => String(value ?? '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  const filterPlayers = (slot, query, filter) => {
    const q = normalizeSearch(query);
    const selected = new Set([selA, selB].filter(Boolean));
    return playerRows.filter(({ key, player:p, rating }) => {
      if (!p) return false;
      if (filter === 'top20' && !top20.has(key)) return false;
      if (filter === 'top50' && !top50.has(key)) return false;
      if (filter === 'big') {
        const styleText = `${p.styleId ?? ''} ${PLAY_STYLES[p.styleId]?.label ?? ''} ${PLAY_STYLES[p.styleId]?.abbr ?? ''}`.toUpperCase();
        const servePower = Math.max(
          Number(p.attrs?.srv1Vel ?? 0),
          Number(p.attrs?.saqueForca ?? 0),
          Number(p.attrs?.saque ?? 0)
        );
        if (!styleText.includes('BIG') && !styleText.includes('SRV') && servePower < 82) return false;
      }
      if (filter === 'picked' && !selected.has(key)) return false;
      if (!q) return true;
      const haystack = normalizeSearch([
        p.name, p.nationality, p.country, p.styleId,
        PLAY_STYLES[p.styleId]?.label, PLAY_STYLES[p.styleId]?.abbr,
        rating,
      ].filter(Boolean).join(' '));
      return haystack.includes(q);
    });
  };

  const PlayerCol = ({ slot }) => {
    const isB   = slot==='B';
    const sel   = isB ? selB : selA;
    const setSel = isB ? setSelB : setSelA;
    const query = isB ? queryB : queryA;
    const setQuery = isB ? setQueryB : setQueryA;
    const filter = isB ? filterB : filterA;
    const setFilter = isB ? setFilterB : setFilterA;
    const np    = NAMED_PLAYERS[sel];
    const psc   = PLAY_STYLES[np?.styleId]?.barColor ?? C.clay;
    const visiblePlayers = filterPlayers(slot, query, filter);

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

        <div style={{display:'flex',flexDirection:'column',gap:8,marginBottom:10}}>
          <input
            value={query}
            onChange={e=>setQuery(e.target.value)}
            placeholder="Buscar nome, pais, estilo ou rating"
            style={{
              width:'100%',background:C.ink2,border:`1px solid ${C.line}`,
              color:C.chalk,padding:'9px 10px',outline:'none',
              fontFamily:C.M,fontSize:9,letterSpacing:'.12em',
              textTransform:'uppercase',
              textAlign:isB?'right':'left',
            }}
          />
          <div style={{display:'flex',gap:5,flexWrap:'wrap',justifyContent:isB?'flex-end':'flex-start'}}>
            {filterDefs.map(def => {
              const active = filter === def.id;
              return (
                <button key={def.id} onClick={()=>setFilter(def.id)}
                  style={{
                    border:`1px solid ${active ? psc+'88' : C.line}`,
                    background:active ? `${psc}18` : 'transparent',
                    color:active ? C.chalk : C.faint,
                    fontFamily:C.M,fontSize:7,letterSpacing:'.14em',
                    textTransform:'uppercase',padding:'5px 7px',cursor:'pointer',
                  }}>
                  {def.label}
                </button>
              );
            })}
          </div>
          <div style={{fontFamily:C.M,fontSize:7,color:C.faint,letterSpacing:'.18em',textTransform:'uppercase',textAlign:isB?'right':'left'}}>
            {visiblePlayers.length} jogadores
          </div>
        </div>

        <div style={{display:'flex',flexDirection:'column',marginBottom:14}}>
          {visiblePlayers.map(({ key })=>{
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
          {visiblePlayers.length === 0 && (
            <div style={{
              border:`1px solid ${C.line}`,background:C.ink2,padding:'18px 12px',
              fontFamily:C.B,fontSize:12,color:C.dim,lineHeight:1.45,
              textAlign:isB?'right':'left',
            }}>
              Nenhum jogador encontrado nesse filtro.
            </div>
          )}
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

  const duelRead = `${npA?.name ?? 'Jogador A'} chega como ${PLAY_STYLES[npA?.styleId]?.label ?? 'perfil versátil'}; ${npB?.name ?? 'Jogador B'} responde com ${PLAY_STYLES[npB?.styleId]?.label ?? 'um jogo próprio'}. A ${COURTS[court]?.meta?.name ?? 'quadra'} pode decidir onde a troca de estilos pesa mais.`;

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

          <div style={{ marginBottom:16, padding:'11px 10px', borderLeft:`2px solid ${C.gold}`, background:'rgba(232,200,74,.045)' }}>
            <div style={{ fontFamily:C.M, fontSize:7, color:C.gold, letterSpacing:'.2em', marginBottom:6 }}>LEITURA DO DUELO</div>
            <div style={{ fontFamily:C.B, fontSize:11, color:C.dim, lineHeight:1.45 }}>{duelRead}</div>
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
                      {favA && <span title="Favorece Jogador A" style={{fontSize:8,color:'#3DEB6A',fontFamily:C.M}}>+A</span>}
                      {penA && <span title="Penaliza Jogador A" style={{fontSize:8,color:'#FF5555',fontFamily:C.M}}>-A</span>}
                      {favB && <span title="Favorece Jogador B" style={{fontSize:8,color:'#3DEB6A',fontFamily:C.M}}>+B</span>}
                      {penB && <span title="Penaliza Jogador B" style={{fontSize:8,color:'#FF5555',fontFamily:C.M}}>-B</span>}
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
            {npA?.name??'Jogador A'}
          </span>
          <span style={{fontFamily:C.D,fontSize:'clamp(13px,1.5vw,20px)',color:C.clay,letterSpacing:'.32em',flexShrink:0}}>VS</span>
          <span style={{fontFamily:C.D,fontSize:'clamp(16px,2vw,28px)',color:C.chalk,textTransform:'uppercase',letterSpacing:'.04em',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',maxWidth:'22vw'}}>
            {npB?.name??'Jogador B'}
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
          {selA===selB?'Adversários iguais':'Jogar Agora'}
        </button>
      </div>
    </div>
  );
}

// -—-—-—- ROOT -—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-”€-—-—-
export default function HomeScreen({ onStartGame }) {
  const [page, setPage]     = useState('home');
  const [fichaKey, setFicha] = useState(null);
  const [universeMode, setUniverseMode] = useState('normal');
  const [loadGameKey, setLoadGameKey] = useState(0);
  useEffect(()=>{ injectCSS(); },[]);

  const goFicha = k => { setFicha(k); setPage('ficha'); };
  const handleLoadGameFromHome = () => {
    setLoadGameKey(k => k + 1);
    setPage('universe');
  };

  if (page==='play')      return <MatchSetup onStart={(a,b,c)=>onStartGame(a,b,c)} onBack={()=>setPage('home')}/>;
  if (page==='tenistas')  return <Tenistas onBack={()=>setPage('home')} onSelect={goFicha}/>;
  if (page==='ficha'&&fichaKey) return <DefinitivePlayerProfile playerKey={fichaKey} onBack={()=>setPage('tenistas')} onNavigate={goFicha}/>;
  if (page==='universe_mode')  return <UniverseModeSelect onBack={()=>setPage('home')} onSelectMode={(mode)=>{ setUniverseMode(mode); setPage('universe'); }}/>;
  if (page==='universe')  return <UniverseManager universeMode={universeMode} autoLoadKey={loadGameKey} onBack={()=>setPage('home')}/>;
  if (page==='simular')   return <SimulatorScreen onBack={()=>setPage('home')}/>;
  return <Home
    onPlay={()=>setPage('play')}
    onTenistas={()=>setPage('tenistas')}
    onUniverse={()=>setPage('universe_mode')}
    onLoadGame={handleLoadGameFromHome}
    onSimular={()=>setPage('simular')}
  />;
}



