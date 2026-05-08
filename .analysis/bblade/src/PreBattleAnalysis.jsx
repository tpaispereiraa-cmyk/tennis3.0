// ============================================
// PRE-BATTLE ANALYSIS — COLISEUM BROADCAST
// Revamp completo: design cinematográfico com
// breakdown completo de stats (Base + Parts + Blader)
// ============================================

import React, { useMemo } from 'react';
import { calculateStatBreakdown } from './utils/stats.js';
import { playerShortName } from './utils/playerName.js';

// ─── Fonts ───────────────────────────────────────────────────────────────────
const FONTS_STYLE = `@import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;600;700;900&family=Rajdhani:wght@300;400;600;700&family=Black+Ops+One&family=Share+Tech+Mono&display=swap');`;

// ─── Styles ──────────────────────────────────────────────────────────────────
const SCREEN_STYLES = `
  .pbb-root {
    position:relative; min-height:100vh;
    background:#020408; color:#e8f0ff;
    font-family:'Rajdhani',sans-serif;
    overflow-x:hidden; overflow-y:auto;
  }
  .pbb-root::before {
    content:''; position:fixed; inset:0; pointer-events:none; z-index:0;
    background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='56' height='100' viewBox='0 0 56 100'%3E%3Cpath d='M28 2L54 16v28L28 58 2 44V16z' fill='none' stroke='rgba(255,215,0,0.03)' stroke-width='1'/%3E%3C/svg%3E");
    background-size:56px 100px;
  }
  .pbb-root::after {
    content:''; position:fixed; inset:0; pointer-events:none; z-index:0;
    background:radial-gradient(ellipse at 50% 0%, rgba(255,215,0,.04) 0%, transparent 60%);
  }
  .pbb-scan {
    position:fixed; left:0; right:0; height:1px; z-index:9998; pointer-events:none;
    background:linear-gradient(90deg,transparent 0%,rgba(255,215,0,.3) 50%,transparent 100%);
    animation:pbb-scan-a 8s linear infinite;
  }
  @keyframes pbb-scan-a { 0%{top:-2px;opacity:0} 5%{opacity:.7} 95%{opacity:.4} 100%{top:100vh;opacity:0} }

  /* Ticker */
  .pbb-ticker { background:rgba(255,215,0,.92); padding:5px 0; overflow:hidden; position:relative; z-index:10; }
  .pbb-ticker-track {
    display:flex; gap:56px; white-space:nowrap;
    animation:pbb-tick 30s linear infinite;
  }
  @keyframes pbb-tick { from{transform:translateX(0)} to{transform:translateX(-50%)} }
  .pbb-ti { font-family:'Orbitron',monospace; font-size:9px; font-weight:700; letter-spacing:.15em; color:#020408; }
  .pbb-tsep { color:rgba(0,0,0,.3); margin:0 6px; }

  /* Hero */
  .pbb-hero { position:relative; height:230px; overflow:hidden; background:#030610; z-index:1; }
  .pbb-hero-bg {
    position:absolute; inset:0;
    background:
      radial-gradient(ellipse at 22% 50%,rgba(255,45,61,.22) 0%,transparent 48%),
      radial-gradient(ellipse at 78% 50%,rgba(0,170,255,.22) 0%,transparent 48%),
      linear-gradient(180deg,transparent 40%,rgba(2,4,8,.85) 100%);
  }
  .pbb-hero-sl {
    position:absolute; inset:0;
    background:repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(0,0,0,.1) 3px,rgba(0,0,0,.1) 4px);
  }
  .pbb-hero-grid {
    position:absolute; inset:0; z-index:2;
    display:grid; grid-template-columns:1fr auto 1fr;
    align-items:center; padding:0 36px; gap:16px;
  }
  .pbb-fl { display:flex; flex-direction:column; gap:7px; }
  .pbb-fr { display:flex; flex-direction:column; gap:7px; align-items:flex-end; text-align:right; }
  .pbb-ftag {
    font-family:'Orbitron',monospace; font-size:8px; font-weight:700;
    letter-spacing:.25em; padding:3px 10px; display:inline-block;
    clip-path:polygon(6px 0%,100% 0%,calc(100% - 6px) 100%,0% 100%);
  }
  .pbb-ftag-r { color:#ff2d3d; background:rgba(255,45,61,.12); border-left:2px solid #ff2d3d; }
  .pbb-ftag-b { color:#00aaff; background:rgba(0,170,255,.12); border-right:2px solid #00aaff; }
  .pbb-bname {
    font-family:'Black Ops One',monospace;
    font-size:clamp(22px,2.8vw,34px); line-height:.95;
    text-transform:uppercase; letter-spacing:2px;
  }
  .pbb-bname-r { color:#fff; text-shadow:-2px 0 0 #ff2d3d,0 0 30px rgba(255,45,61,.5); }
  .pbb-bname-b { color:#fff; text-shadow: 2px 0 0 #00aaff,0 0 30px rgba(0,170,255,.5); }
  .pbb-signame { font-family:'Share Tech Mono',monospace; font-size:10px; letter-spacing:2px; color:#ffd700; text-shadow:0 0 10px rgba(255,215,0,.5); }
  .pbb-pname { font-family:'Orbitron',monospace; font-size:10px; font-weight:600; letter-spacing:1px; color:rgba(255,255,255,.4); }
  .pbb-pcountry { font-family:'Share Tech Mono',monospace; font-size:9px; color:rgba(255,255,255,.28); letter-spacing:1px; }

  /* VS Center */
  .pbb-vsc { display:flex; flex-direction:column; align-items:center; gap:8px; padding:0 22px; }
  .pbb-vsdiv { width:2px; height:48px; background:linear-gradient(180deg,transparent,#ffd700,transparent); box-shadow:0 0 8px #ffd700; }
  .pbb-vs {
    font-family:'Black Ops One',monospace; font-size:58px; line-height:1; color:#ffd700;
    text-shadow:0 0 20px rgba(255,215,0,.9),0 0 60px rgba(255,215,0,.4);
    animation:pbb-vsp 1.8s ease-in-out infinite;
  }
  @keyframes pbb-vsp { 0%,100%{text-shadow:0 0 20px rgba(255,215,0,.7),0 0 50px rgba(255,215,0,.3)} 50%{text-shadow:0 0 35px rgba(255,215,0,1),0 0 90px rgba(255,215,0,.6)} }
  .pbb-rbadge {
    font-family:'Orbitron',monospace; font-size:9px; font-weight:700; letter-spacing:.3em;
    color:#ffd700; background:rgba(255,215,0,.08); border:1px solid rgba(255,215,0,.3);
    padding:4px 14px; clip-path:polygon(8px 0%,100% 0%,calc(100% - 8px) 100%,0% 100%);
  }

  /* Score strip */
  .pbb-sstrip {
    background:rgba(4,6,14,.97);
    border-top:1px solid rgba(255,215,0,.18); border-bottom:1px solid rgba(255,215,0,.18);
    display:grid; grid-template-columns:1fr auto 1fr;
    position:relative; z-index:5;
  }
  .pbb-ss { padding:9px 18px; display:flex; align-items:center; gap:10px; }
  .pbb-ss-r { justify-content:flex-end; }
  .pbb-spname { font-family:'Orbitron',monospace; font-size:10px; font-weight:700; letter-spacing:1px; }
  .pbb-spname-r { color:#ff2d3d; } .pbb-spname-b { color:#00aaff; }
  .pbb-pills { display:flex; gap:4px; }
  .pbb-pill { padding:1px 7px; font-family:'Share Tech Mono',monospace; font-size:9px; border:1px solid; }
  .pbb-pw { border-color:rgba(0,230,118,.4); color:#00e676; background:rgba(0,230,118,.08); }
  .pbb-pl { border-color:rgba(255,45,61,.4); color:#ff2d3d; background:rgba(255,45,61,.08); }
  .pbb-ssc {
    padding:9px 22px; display:flex; align-items:center; gap:8px;
    background:rgba(255,215,0,.04);
    border-left:1px solid rgba(255,215,0,.1); border-right:1px solid rgba(255,215,0,.1);
  }
  .pbb-snum { font-family:'Orbitron',monospace; font-size:20px; font-weight:900; }
  .pbb-ssep { font-family:'Share Tech Mono',monospace; font-size:13px; color:rgba(255,255,255,.22); }
  .pbb-ssub { font-family:'Share Tech Mono',monospace; font-size:8px; color:rgba(255,255,255,.3); letter-spacing:1px; }

  /* Main content */
  .pbb-content { display:grid; grid-template-columns:1fr 290px 1fr; gap:12px; padding:12px; position:relative; z-index:2; }

  /* Stat panel */
  .pbb-spanel {
    background:#07090f; border:1px solid rgba(255,255,255,.06);
    clip-path:polygon(12px 0%,100% 0%,calc(100% - 12px) 100%,0% 100%);
    overflow:hidden; display:flex; flex-direction:column;
    animation:pbb-si .45s ease both;
  }
  .pbb-spanel-l { animation-delay:.05s; border-left:2px solid rgba(255,45,61,.4); }
  .pbb-spanel-r { animation-delay:.1s;  border-right:2px solid rgba(0,170,255,.4); }
  @keyframes pbb-si { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
  .pbb-ph {
    padding:11px 16px; background:rgba(255,255,255,.03);
    border-bottom:1px solid rgba(255,255,255,.06);
    display:flex; align-items:center; justify-content:space-between;
  }
  .pbb-pbn { font-family:'Orbitron',monospace; font-size:13px; font-weight:900; letter-spacing:1px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:180px; }
  .pbb-pbn-r { color:#ff2d3d; text-shadow:0 0 12px rgba(255,45,61,.4); }
  .pbb-pbn-b { color:#00aaff; text-shadow:0 0 12px rgba(0,170,255,.4); }
  .pbb-tbadge { padding:3px 10px; font-family:'Orbitron',monospace; font-size:8px; font-weight:700; letter-spacing:.1em; border:1px solid; flex-shrink:0; clip-path:polygon(5px 0%,100% 0%,calc(100% - 5px) 100%,0% 100%); }
  .pbb-tatk { border-color:rgba(255,45,61,.5);   color:#ff2d3d; background:rgba(255,45,61,.1); }
  .pbb-tdef { border-color:rgba(0,170,255,.5);   color:#00aaff; background:rgba(0,170,255,.1); }
  .pbb-tsta { border-color:rgba(0,230,118,.5);   color:#00e676; background:rgba(0,230,118,.1); }
  .pbb-tbal { border-color:rgba(160,120,255,.5); color:#c084fc; background:rgba(160,120,255,.1); }
  .pbb-pbody { padding:14px 16px; display:flex; flex-direction:column; gap:13px; flex:1; }
  .pbb-slbl {
    font-family:'Orbitron',monospace; font-size:8px; font-weight:700; letter-spacing:.3em;
    color:rgba(255,255,255,.32); padding-bottom:5px; border-bottom:1px solid rgba(255,255,255,.06);
    display:flex; align-items:center; gap:6px;
  }
  .pbb-slbl::before { content:''; display:block; width:10px; height:1px; background:#ffd700; box-shadow:0 0 4px #ffd700; }

  /* Signature Badge */
  .pbb-sig {
    background:linear-gradient(135deg, rgba(255,215,0,.15) 0%, rgba(255,165,0,.08) 100%);
    border:1px solid rgba(255,215,0,.4);
    border-left:3px solid #ffd700;
    clip-path:polygon(10px 0%, 100% 0%, calc(100% - 10px) 100%, 0% 100%);
    padding:10px 14px;
    display:flex;
    align-items:center;
    gap:12px;
    position:relative;
    overflow:hidden;
    animation:pbb-sig-pulse 2s ease-in-out infinite;
  }
  @keyframes pbb-sig-pulse {
    0%, 100% { box-shadow:0 0 15px rgba(255,215,0,.2); }
    50% { box-shadow:0 0 30px rgba(255,215,0,.4); }
  }
  .pbb-sig::before {
    content:'';
    position:absolute;
    top:-50%;
    left:-50%;
    width:200%;
    height:200%;
    background:linear-gradient(45deg, transparent 30%, rgba(255,255,255,.05) 50%, transparent 70%);
    animation:pbb-sig-shine 3s linear infinite;
  }
  @keyframes pbb-sig-shine {
    0% { transform:translateX(-100%) translateY(-100%) rotate(45deg); }
    100% { transform:translateX(100%) translateY(100%) rotate(45deg); }
  }
  .pbb-sig-icon {
    font-size:26px;
    flex-shrink:0;
    filter:drop-shadow(0 0 8px rgba(255,215,0,.6));
    animation:pbb-sig-rotate 4s linear infinite;
  }
  @keyframes pbb-sig-rotate {
    0%, 100% { transform:rotate(0deg) scale(1); }
    50% { transform:rotate(180deg) scale(1.1); }
  }
  .pbb-sig-content {
    flex:1;
    position:relative;
    z-index:1;
  }
  .pbb-sig-label {
    font-family:'Orbitron',monospace;
    font-size:9px;
    font-weight:700;
    letter-spacing:.25em;
    color:#ffd700;
    text-transform:uppercase;
    margin-bottom:3px;
    text-shadow:0 0 10px rgba(255,215,0,.5);
  }
  .pbb-sig-name {
    font-family:'Rajdhani',sans-serif;
    font-size:13px;
    font-weight:700;
    color:#fff;
    line-height:1.3;
  }
  .pbb-sig-name strong {
    color:#ffd700;
    font-weight:900;
  }

  /* Combo chips */
  .pbb-cgrid { display:flex; gap:5px; flex-wrap:wrap; margin-top:6px; }
  .pbb-cc {
    display:flex; flex-direction:column; align-items:center;
    padding:4px 10px; min-width:54px;
    border:1px solid rgba(255,255,255,.08); background:rgba(255,255,255,.03);
    clip-path:polygon(5px 0%,100% 0%,calc(100% - 5px) 100%,0% 100%);
  }
  .pbb-ccl { font-family:'Share Tech Mono',monospace; font-size:7px; color:rgba(255,255,255,.35); letter-spacing:.1em; }
  .pbb-ccv { font-family:'Rajdhani',sans-serif; font-size:11px; font-weight:700; color:#e8f0ff; margin-top:1px; }

  /* Power card */
  .pbb-pc {
    padding:10px 12px; display:grid; grid-template-columns:auto 1fr; gap:12px; align-items:center;
    border:1px solid rgba(255,215,0,.2); background:rgba(255,215,0,.04);
    clip-path:polygon(8px 0%,100% 0%,calc(100% - 8px) 100%,0% 100%);
  }
  .pbb-pv { font-family:'Orbitron',monospace; font-size:38px; font-weight:900; line-height:1; }
  .pbb-pv-r { color:#ff2d3d; text-shadow:0 0 20px rgba(255,45,61,.6); }
  .pbb-pv-b { color:#00aaff; text-shadow:0 0 20px rgba(0,170,255,.6); }
  .pbb-pdet { display:flex; flex-direction:column; gap:3px; }
  .pbb-ptit { font-family:'Share Tech Mono',monospace; font-size:7px; letter-spacing:.2em; color:rgba(255,255,255,.32); margin-bottom:3px; }
  .pbb-psrc { display:flex; align-items:center; gap:6px; }
  .pbb-pd  { width:8px; height:8px; border-radius:1px; flex-shrink:0; }
  .pbb-db  { background:rgba(255,255,255,.35); }
  .pbb-dp  { background:#ffd700; }
  .pbb-dt  { background:#c026d3; }
  .pbb-da  { background:#22c55e; }
  .pbb-dbl { background:#00d4ff; }
  .pbb-pl2 { font-family:'Share Tech Mono',monospace; font-size:8px; color:rgba(255,255,255,.38); width:48px; }
  .pbb-pv2 { font-family:'Orbitron',monospace; font-size:11px; font-weight:700; color:rgba(255,220,180,.8); }
  .pbb-pbs { height:4px; background:rgba(255,255,255,.05); border-radius:1px; overflow:hidden; display:flex; margin-top:5px; }
  .pbb-pbs-b  { background:rgba(255,255,255,.35); height:100%; }
  .pbb-pbs-p  { background:#ffd700; height:100%; }
  .pbb-pbs-t  { background:#c026d3; height:100%; opacity:.88; }
  .pbb-pbs-a  { background:#22c55e; height:100%; opacity:.88; }
  .pbb-pbs-bl { background:#00d4ff; height:100%; }

  /* Stat breakdown rows */
  .pbb-srow { display:grid; grid-template-columns:34px 1fr 108px; align-items:center; gap:8px; padding:4px 0; border-bottom:1px solid rgba(255,255,255,.04); }
  .pbb-srow:last-child { border-bottom:none; }
  .pbb-slb { font-family:'Share Tech Mono',monospace; font-size:9px; color:rgba(255,255,255,.4); text-align:right; }
  .pbb-bwrap { position:relative; height:18px; background:rgba(255,255,255,.04); border-radius:2px; overflow:hidden; }
  .pbb-bb, .pbb-bp2, .pbb-bt, .pbb-ba, .pbb-bbl { position:absolute; top:0; height:100%; transition:width .7s cubic-bezier(.22,1,.36,1); }
  .pbb-bb  { background:rgba(255,255,255,.22); }
  .pbb-bp2 { background:#ffd700; opacity:.85; }
  .pbb-bt  { background:#c026d3; opacity:.88; }
  .pbb-ba  { background:#22c55e; opacity:.88; }
  .pbb-bbl { background:#00d4ff; opacity:.9; }
  .pbb-bshine { position:absolute; top:0; right:0; bottom:0; width:16px; background:rgba(255,255,255,.3); filter:blur(3px); animation:pbb-sh 3s ease-in-out infinite; }
  @keyframes pbb-sh { 0%,100%{opacity:.4} 50%{opacity:.9} }
  .pbb-snums { display:flex; align-items:baseline; gap:2px; justify-content:flex-end; font-family:'Share Tech Mono',monospace; }
  .pbb-nb { font-size:9px; color:rgba(255,255,255,.32); }
  .pbb-no { font-size:8px; color:rgba(255,255,255,.18); }
  .pbb-np { font-size:9px; color:#ffd700; }
  .pbb-nt2 { font-size:9px; color:#c026d3; }
  .pbb-na { font-size:9px; color:#22c55e; }
  .pbb-nbl { font-size:9px; color:#00d4ff; }
  .pbb-nt { font-family:'Orbitron',monospace; font-size:13px; font-weight:700; }
  .pbb-nt-r { color:#ff2d3d; } .pbb-nt-b { color:#00aaff; }

  /* Trait */
  .pbb-trait { padding:9px 11px; background:rgba(176,109,255,.06); border:1px solid rgba(176,109,255,.2); clip-path:polygon(7px 0%,100% 0%,calc(100% - 7px) 100%,0% 100%); }
  .pbb-ttit { font-family:'Orbitron',monospace; font-size:10px; font-weight:700; color:#c084fc; letter-spacing:.08em; }
  .pbb-tdesc { font-size:11px; color:rgba(255,255,255,.42); margin-top:3px; line-height:1.35; }
  .pbb-bpt { padding:5px 9px; background:rgba(0,230,118,.04); border:1px solid rgba(0,230,118,.15); clip-path:polygon(5px 0%,100% 0%,calc(100% - 5px) 100%,0% 100%); margin-top:5px; display:flex; align-items:flex-start; gap:6px; }
  .pbb-bpti { font-family:'Share Tech Mono',monospace; font-size:9px; color:#00e676; letter-spacing:.06em; }
  .pbb-bpd  { font-size:10px; color:rgba(255,255,255,.35); margin-top:1px; }

  /* Center column */
  .pbb-center { display:flex; flex-direction:column; gap:10px; }
  .pbb-card { background:#07090f; border:1px solid rgba(255,255,255,.06); clip-path:polygon(12px 0%,100% 0%,calc(100% - 12px) 100%,0% 100%); overflow:hidden; animation:pbb-si .45s .15s ease both; }
  .pbb-chdr {
    padding:9px 14px; background:rgba(255,215,0,.05); border-bottom:1px solid rgba(255,215,0,.14);
    font-family:'Orbitron',monospace; font-size:8px; font-weight:700; letter-spacing:.3em; color:#ffd700;
    display:flex; align-items:center; gap:6px;
  }
  .pbb-cdot { width:6px; height:6px; border-radius:50%; background:#ffd700; box-shadow:0 0 6px #ffd700; animation:pbb-blink 1.4s infinite; }
  @keyframes pbb-blink { 0%,100%{opacity:1} 50%{opacity:.15} }
  .pbb-cbody { padding:11px 14px; display:flex; flex-direction:column; gap:7px; }
  .pbb-irow { display:flex; justify-content:space-between; align-items:center; padding:4px 0; border-bottom:1px solid rgba(255,255,255,.04); }
  .pbb-irow:last-child { border-bottom:none; }
  .pbb-ilbl { font-family:'Share Tech Mono',monospace; font-size:9px; color:rgba(255,255,255,.38); letter-spacing:.06em; }
  .pbb-ival { font-family:'Rajdhani',sans-serif; font-size:13px; font-weight:700; color:#e8f0ff; }
  .pbb-ival-g { color:#ffd700; } .pbb-ival-r { color:#ff2d3d; } .pbb-ival-b { color:#00aaff; }

  /* Probability */
  .pbb-pnames { display:flex; justify-content:space-between; font-family:'Orbitron',monospace; font-size:10px; font-weight:700; margin-bottom:6px; }
  .pbb-pr { color:#ff2d3d; } .pbb-pb { color:#00aaff; }
  .pbb-pbar { height:30px; display:flex; border-radius:2px; overflow:hidden; border:1px solid rgba(255,255,255,.07); }
  .pbb-pfr {
    display:flex; align-items:center; justify-content:center;
    font-family:'Black Ops One',monospace; font-size:13px; color:#fff;
    background:linear-gradient(90deg,rgba(255,45,61,.75),rgba(255,45,61,.55));
    position:relative; overflow:hidden; transition:width 1.2s cubic-bezier(.22,1,.36,1);
  }
  .pbb-pfr::after { content:''; position:absolute; top:0; left:-80%; width:50%; height:100%; background:linear-gradient(90deg,transparent,rgba(255,255,255,.12),transparent); animation:pbb-shimb 2.5s ease infinite; }
  @keyframes pbb-shimb { from{left:-80%} to{left:180%} }
  .pbb-pfb {
    display:flex; align-items:center; justify-content:center;
    font-family:'Black Ops One',monospace; font-size:13px; color:#fff;
    background:linear-gradient(90deg,rgba(0,170,255,.55),rgba(0,170,255,.75));
    transition:width 1.2s cubic-bezier(.22,1,.36,1);
  }
  .pbb-mnote { font-size:10px; color:rgba(255,255,255,.38); text-align:center; margin-top:7px; line-height:1.45; }
  .pbb-mnote strong { color:#ffd700; font-weight:700; }

  /* Launch button - MOVIDO PARA O TOPO */
  .pbb-lbtn {
    width:100%; padding:18px;
    background:linear-gradient(90deg,rgba(255,215,0,.14),rgba(255,120,0,.1),rgba(255,215,0,.14));
    border:1px solid rgba(255,215,0,.5);
    clip-path:polygon(12px 0%,100% 0%,calc(100% - 12px) 100%,0% 100%);
    font-family:'Black Ops One',monospace; font-size:15px; letter-spacing:.2em;
    color:#ffd700; cursor:pointer; text-align:center;
    transition:all .2s ease; position:relative; overflow:hidden;
    animation:pbb-si .4s .05s ease both;
  }
  .pbb-lbtn::before { content:''; position:absolute; inset:0; background:linear-gradient(90deg,transparent,rgba(255,255,255,.06),transparent); transform:translateX(-100%); transition:.4s; }
  .pbb-lbtn:hover { box-shadow:0 0 40px rgba(255,215,0,.3); border-color:#ffd700; transform:scale(1.02); }
  .pbb-lbtn:hover::before { transform:translateX(100%); }

  /* Comparison */
  .pbb-cmp { padding:0 12px 12px; position:relative; z-index:2; animation:pbb-si .45s .2s ease both; }
  .pbb-cmptit {
    font-family:'Orbitron',monospace; font-size:9px; font-weight:700; letter-spacing:.3em;
    color:rgba(255,255,255,.28); padding:8px 0; display:flex; align-items:center; gap:12px;
  }
  .pbb-cmptit::before, .pbb-cmptit::after { content:''; flex:1; height:1px; background:rgba(255,255,255,.06); }
  .pbb-cmpg { display:grid; grid-template-columns:repeat(6,1fr); gap:8px; }
  .pbb-cmpc { background:#07090f; border:1px solid rgba(255,255,255,.06); clip-path:polygon(8px 0%,100% 0%,calc(100% - 8px) 100%,0% 100%); padding:9px 11px; display:flex; flex-direction:column; gap:5px; }
  .pbb-cmpc-g { border-color:rgba(255,215,0,.25); background:rgba(255,215,0,.04); }
  .pbb-csn { font-family:'Share Tech Mono',monospace; font-size:9px; color:rgba(255,255,255,.38); text-align:center; letter-spacing:.08em; }
  .pbb-csn-g { color:#ffd700; }
  .pbb-cvs { display:flex; justify-content:space-between; align-items:baseline; gap:3px; }
  .pbb-cvl { font-family:'Orbitron',monospace; font-size:18px; font-weight:900; color:#ff2d3d; }
  .pbb-cvr { font-family:'Orbitron',monospace; font-size:18px; font-weight:900; color:#00aaff; }
  .pbb-cvl-lg { font-size:24px; }
  .pbb-cvr-lg { font-size:24px; }
  .pbb-cvs2 { font-family:'Share Tech Mono',monospace; font-size:8px; color:rgba(255,255,255,.28); }
  .pbb-mb { height:4px; background:rgba(255,255,255,.05); overflow:hidden; display:flex; border-radius:1px; }
  .pbb-mbr { background:#ff2d3d; opacity:.7; }
  .pbb-mbb { background:#00aaff; opacity:.7; }
  .pbb-cwin { text-align:center; font-family:'Share Tech Mono',monospace; font-size:8px; padding:2px 5px; border:1px solid; }
  .pbb-cwin-r { color:#ff2d3d; border-color:rgba(255,45,61,.3); background:rgba(255,45,61,.06); }
  .pbb-cwin-b { color:#00aaff; border-color:rgba(0,170,255,.3); background:rgba(0,170,255,.06); }
  .pbb-cwin-t { color:rgba(255,255,255,.28); border-color:rgba(255,255,255,.1); }
`;

// ─── Constants ────────────────────────────────────────────────────────────────
const TYPE_CFG = {
  Attack:      { icon: '⚔',  label: 'ATTACK',   cls: 'pbb-tatk' },
  Defense:     { icon: '🛡',  label: 'DEFENSE',  cls: 'pbb-tdef' },
  Stamina:     { icon: '∞',   label: 'STAMINA',  cls: 'pbb-tsta' },
  Balance:     { icon: '⚖',   label: 'BALANCE',  cls: 'pbb-tbal' },
  Extreme:     { icon: '💥',  label: 'EXTREME',  cls: 'pbb-tatk' },
  Mixed:       { icon: '🎯',  label: 'MIXED',    cls: 'pbb-tbal' },
  Progressive: { icon: '📈',  label: 'PROGRES.', cls: 'pbb-tsta' },
  Synergy:     { icon: '🔗',  label: 'SYNERGY',  cls: 'pbb-tdef' },
};

const ARENA_DB = {
  BB10_COMPETITIVE:  { name: 'BB-10 Attack Type',    cat: 'STANDARD', favors: ['ATTACK','BALANCE'] },
  BURST:             { name: 'Burst Standard',        cat: 'STANDARD', favors: ['DEFENSE','STAMINA'] },
  NEXUS:             { name: 'Prismatic Nexus',       cat: 'SPECIAL',  favors: ['ATTACK','BALANCE'] },
  VOLCANIC_RAGE:     { name: 'Volcanic Rage',         cat: 'SPECIAL',  favors: ['STAMINA','DEFENSE'] },
  PANGEA_PLATFORM:   { name: 'Pangea Platform',       cat: 'EXTREME',  favors: ['BALANCE'] },
  COLOSSEUM_CARNAGE: { name: 'Colosseum Carnage',     cat: 'EXTREME',  favors: ['ATTACK','DEFENSE'] },
  PINBALL_INFERNO:   { name: 'Pinball Inferno',       cat: 'EXTREME',  favors: ['ATTACK','BALANCE'] },
  VORTEX_COLISEUM:   { name: 'Vortex Coliseum',       cat: 'EXTREME',  favors: ['BALANCE','STAMINA'] },
};

const MATCHUPS = {
  'Attack-Defense':  { p: 60, note: 'Agressão estrutural — <strong>Defense</strong> precisa de 1 deflexão para virar' },
  'Attack-Stamina':  { p: 65, note: '<strong>Attack</strong> destrói rotação antes do Stamina importar' },
  'Attack-Balance':  { p: 62, note: 'Agressão pura favorece quem não carrega fraqueza de tipo' },
  'Attack-Attack':   { p: 50, note: 'Mirror — lançamento e timing decidem quem domina primeiro' },
  'Defense-Attack':  { p: 40, note: 'Defense absorve, mas Attack tem <strong>vantagem estrutural inicial</strong>' },
  'Defense-Stamina': { p: 45, note: 'Stamina vence batalhas longas — <strong>Defense precisa encerrar rápido</strong>' },
  'Defense-Balance': { p: 50, note: 'Batalha tática — estratégia e lançamento decidem' },
  'Defense-Defense': { p: 50, note: 'Mirror defensivo — quem aguentar mais ganha por pontos' },
  'Stamina-Attack':  { p: 35, note: 'Stamina vulnerável — <strong>Attack encerra antes da rotação cair</strong>' },
  'Stamina-Defense': { p: 55, note: 'Eficiência de rotação supera táticas defensivas no longo prazo' },
  'Stamina-Balance': { p: 58, note: 'Especialização em stamina vence versatilidade generalista' },
  'Stamina-Stamina': { p: 50, note: 'Mirror stamina — peso e eficiência do driver decidem' },
  'Balance-Attack':  { p: 38, note: 'Versatilidade não neutraliza <strong>agressão pura</strong>' },
  'Balance-Defense': { p: 50, note: 'Balance adapta, mas Defense tem vantagem estrutural passiva' },
  'Balance-Stamina': { p: 42, note: 'Stamina especializado supera resistência generalista' },
  'Balance-Balance': { p: 50, note: 'Batalha de leitura — quem adaptar melhor leva a série' },
};

function getMatchup(t1, t2) {
  const k = `${t1}-${t2}`;
  const r = `${t2}-${t1}`;
  if (MATCHUPS[k]) return { p1: MATCHUPS[k].p, note: MATCHUPS[k].note };
  if (MATCHUPS[r]) return { p1: 100 - MATCHUPS[r].p, note: MATCHUPS[r].note };
  return { p1: 50, note: 'Matchup neutro — condições equilibradas' };
}

const TRAIT_MAP = {
  sword:       { icon: '⚔️',  name: 'ESPADA EXPANSIVA',  desc: 'Alcance +30% em colisões' },
  shield:      { icon: '🛡️',  name: 'ESCUDO DEFLECTOR',  desc: 'Reduz dano recebido em 40%' },
  vampire:     { icon: '🧛',  name: 'ROUBO DE SPIN',      desc: 'Absorve 15% spin por colisão' },
  berserker:   { icon: '😤',  name: 'FÚRIA CRESCENTE',    desc: '+20% ATK por hit acumulado' },
  phantom:     { icon: '👻',  name: 'EVASÃO FANTASMA',    desc: '25% chance de evadir impacto' },
  counter:     { icon: '🔄',  name: 'CONTRA-ATAQUE',      desc: 'Reflete 50% do dano recebido' },
  unstoppable: { icon: '💨',  name: 'MOMENTUM INFINITO',  desc: 'Mantém velocidade de spin' },
  critical:    { icon: '💥',  name: 'GOLPE CRÍTICO',      desc: '30% chance de dano x2' },
  regenerator: { icon: '💚',  name: 'REGENERAÇÃO',        desc: '+0.3 stamina/segundo' },
  tornado:     { icon: '🌀',  name: 'VÓRTICE MORTAL',     desc: 'Puxa inimigos para o centro' },
  fortress:    { icon: '🏰',  name: 'FORTALEZA',          desc: 'Imune a knockback' },
  assassin:    { icon: '🗡️',  name: 'LÂMINA ASSASSINA',  desc: 'x2 dano por costas' },
  bearing:     { icon: '⚙️',  name: 'BEARING DRIVE',      desc: 'LAD +50% — sobrevive em spin baixo' },
  drift:       { icon: '🌊',  name: 'DRIFT MOTION',       desc: 'Evasão circular estabilizadora' },
  xtreme:      { icon: '⚡',  name: 'XTREME RUSH',        desc: 'Velocidade máx — impacto +20%' },
  zone:        { icon: '🎯',  name: 'ZONE DEFENSE',       desc: 'Estabilidade central superior' },
};

// ─── Helper functions ─────────────────────────────────────────────────────────
function calcPower(bey) {
  if (!bey?.stats) return { base: 0, parts: 0, traits: 0, arena: 0, blader: 0, total: 0 };
  const keys = ['atk','def','sta','bal','weight','spin'];
  let sb = 0, sp = 0, st = 0, sa = 0, sbl = 0;
  keys.forEach(k => {
    const bd = calculateStatBreakdown(bey, k);
    sb += bd.base; 
    sp += bd.parts; 
    st += bd.traits;
    sa += bd.arena;
    sbl += bd.blader;
  });
  // Retorna valores reais (soma total dos stats), não porcentagem
  return {
    base: sb, 
    parts: sp, 
    traits: st,
    arena: sa,
    blader: sbl,
    total: sb + sp + st + sa + sbl
  };
}

function splitBeyName(name) {
  if (!name) return ['—',''];
  const w = name.split(' ');
  if (w.length <= 2) return [name, ''];
  const m = Math.ceil(w.length / 2);
  return [w.slice(0, m).join(' '), w.slice(m).join(' ')];
}

function buildTicker(bey1, bey2, md3State) {
  const r   = md3State?.currentRound || 1;
  const fmt = md3State?.format || 'MD3';
  const p1  = calcPower(bey1).total;
  const p2  = calcPower(bey2).total;
  const { p1: pct } = getMatchup(bey1?.type, bey2?.type);
  const ak  = md3State?.arenaOrder?.[r-1] || 'BB10_COMPETITIVE';
  const an  = ARENA_DB[ak]?.name || ak;
  const n1  = bey1?.team?.name || bey1?.name || 'P1';
  const n2  = bey2?.team?.name || bey2?.name || 'P2';
  return [
    `${fmt} SERIES — ROUND ${r}`,
    `ARENA: ${an}`,
    `${bey1?.name || 'BEY 1'} — POWER ${p1}`,
    `${bey2?.name || 'BEY 2'} — POWER ${p2}`,
    `TYPE ADV: ${bey1?.type || '?'} ${pct}% vs ${bey2?.type || '?'} ${100-pct}%`,
    bey1?.rotation !== bey2?.rotation ? 'OPPOSITE SPIN — EQUALIZATION ACTIVE' : 'SAME SPIN DIRECTION',
    `${n1} vs ${n2}`,
  ];
}

// ─── StatBreakdownRow ─────────────────────────────────────────────────────────
const SBRow = ({ label, bey, stat, maxN, side }) => {
  const bd = calculateStatBreakdown(bey, stat);
  const pct = v => Math.max(0, Math.min(100, (v / maxN) * 100));
  const wb = pct(bd.base);
  const wp = pct(bd.parts);
  const wt = pct(bd.traits);
  const wa = pct(bd.arena);
  const wbl = pct(bd.blader);
  
  return (
    <div className="pbb-srow">
      <div className="pbb-slb">{label}</div>
      <div className="pbb-bwrap">
        {/* Base - Cinza */}
        <div className="pbb-bb" style={{ width: `${wb}%` }} />
        {/* Parts - Amarelo */}
        <div className="pbb-bp2" style={{ width: `${wp}%`, left: `${wb}%` }} />
        {/* Traits - Roxo/Magenta */}
        <div className="pbb-bt" style={{ width: `${wt}%`, left: `${wb+wp}%` }} />
        {/* Arena - Verde */}
        <div className="pbb-ba" style={{ width: `${wa}%`, left: `${wb+wp+wt}%` }} />
        {/* Blader - Cyan */}
        <div className="pbb-bbl" style={{ width: `${wbl}%`, left: `${wb+wp+wt+wa}%` }} />
        <div className="pbb-bshine" />
      </div>
      <div className="pbb-snums">
        <span className="pbb-nb">{bd.base}</span>
        {bd.parts > 0 && <><span className="pbb-no">+</span><span className="pbb-np">{bd.parts}</span></>}
        {bd.traits > 0 && <><span className="pbb-no">+</span><span className="pbb-nt2">{bd.traits}</span></>}
        {bd.arena > 0 && <><span className="pbb-no">+</span><span className="pbb-na">{bd.arena}</span></>}
        {bd.blader > 0 && <><span className="pbb-no">+</span><span className="pbb-nbl">{bd.blader}</span></>}
        <span className="pbb-no">=</span>
        <span className={`pbb-nt ${side === 'left' ? 'pbb-nt-r' : 'pbb-nt-b'}`}>{bd.total}</span>
      </div>
    </div>
  );
};

// ─── StatPanel ────────────────────────────────────────────────────────────────
const StatPanel = ({ bey, side }) => {
  // Move useMemo before early return to comply with React Hooks rules
  const power = useMemo(() => bey ? calcPower(bey) : { total: 0, base: 0, parts: 0, traits: 0, arena: 0, blader: 0 }, [bey]);
  
  if (!bey) return null;
  
  const tc    = TYPE_CFG[bey.type] || TYPE_CFG.Balance;
  const trait = bey.trait ? (TRAIT_MAP[bey.trait] || { icon: '✨', name: bey.trait.toUpperCase(), desc: 'Habilidade especial' }) : null;
  const bps   = bey.breakpoints?.slice(0, 2) || [];
  const pc    = side === 'left' ? 'r' : 'b';

  return (
    <div className={`pbb-spanel pbb-spanel-${side === 'left' ? 'l' : 'r'}`}>
      <div className="pbb-ph">
        <div className={`pbb-pbn pbb-pbn-${pc}`}>{bey.name}</div>
        <div className={`pbb-tbadge ${tc.cls}`}>{tc.icon} {tc.label}</div>
      </div>
      <div className="pbb-pbody">

        {/* Signature Badge */}
        {bey.isSignature && (
          <div className="pbb-sig">
            <div className="pbb-sig-icon">★</div>
            <div className="pbb-sig-content">
              <div className="pbb-sig-label">🏆 Signature Beyblade</div>
              <div className="pbb-sig-name">
                <strong>"{bey.signatureName || bey.name}"</strong>
              </div>
            </div>
          </div>
        )}

        {/* Combo */}
        <div>
          <div className="pbb-slbl">COMBO SETUP</div>
          <div className="pbb-cgrid">
            {bey.layer  && <div className="pbb-cc"><div className="pbb-ccl">LAYER</div><div className="pbb-ccv">{bey.layer.name  || '—'}</div></div>}
            {bey.disc   && <div className="pbb-cc"><div className="pbb-ccl">DISC</div><div className="pbb-ccv">{bey.disc.name   || '—'}</div></div>}
            {bey.driver && <div className="pbb-cc"><div className="pbb-ccl">DRIVER</div><div className="pbb-ccv">{bey.driver.name || '—'}</div></div>}
            {bey.armor  && <div className="pbb-cc"><div className="pbb-ccl">ARMOR</div><div className="pbb-ccv">{bey.armor.name  || '—'}</div></div>}
            {!bey.layer && !bey.disc && !bey.driver && (
              <span style={{fontSize:10,color:'rgba(255,255,255,.3)',fontFamily:'Share Tech Mono,monospace'}}>Dados não disponíveis</span>
            )}
          </div>
        </div>

        {/* Power */}
        <div className="pbb-pc">
          <div className={`pbb-pv pbb-pv-${pc}`}>{power.total}</div>
          <div className="pbb-pdet">
            <div className="pbb-ptit">POWER RATING</div>
            <div className="pbb-psrc"><div className="pbb-pd pbb-db"/><div className="pbb-pl2">BASE</div><div className="pbb-pv2">{power.base}</div></div>
            <div className="pbb-psrc"><div className="pbb-pd pbb-dp"/><div className="pbb-pl2">PARTS</div><div className="pbb-pv2">+{power.parts}</div></div>
            {power.traits > 0 && <div className="pbb-psrc"><div className="pbb-pd pbb-dt"/><div className="pbb-pl2">TRAITS</div><div className="pbb-pv2">+{power.traits}</div></div>}
            {power.arena > 0 && <div className="pbb-psrc"><div className="pbb-pd pbb-da"/><div className="pbb-pl2">ARENA</div><div className="pbb-pv2">+{power.arena}</div></div>}
            <div className="pbb-psrc"><div className="pbb-pd pbb-dbl"/><div className="pbb-pl2">BLADER</div><div className="pbb-pv2">+{power.blader}</div></div>
            <div className="pbb-pbs">
              <div className="pbb-pbs-b"  style={{ width: `${(power.base  /Math.max(power.total,1))*100}%` }}/>
              <div className="pbb-pbs-p"  style={{ width: `${(power.parts /Math.max(power.total,1))*100}%` }}/>
              {power.traits > 0 && <div className="pbb-pbs-t"  style={{ width: `${(power.traits/Math.max(power.total,1))*100}%` }}/>}
              {power.arena > 0 && <div className="pbb-pbs-a"  style={{ width: `${(power.arena /Math.max(power.total,1))*100}%` }}/>}
              <div className="pbb-pbs-bl" style={{ width: `${(power.blader/Math.max(power.total,1))*100}%` }}/>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div>
          <div className="pbb-slbl">
            STAT BREAKDOWN
            <span style={{fontSize:7,fontFamily:'Share Tech Mono,monospace',color:'rgba(255,255,255,.18)',letterSpacing:'.06em'}}>
              ■ BASE ■ PARTS ■ TRAITS ■ ARENA ■ BLADER
            </span>
          </div>
          <SBRow label="ATK"  bey={bey} stat="atk"    maxN={50} side={side}/>
          <SBRow label="DEF"  bey={bey} stat="def"    maxN={50} side={side}/>
          <SBRow label="STA"  bey={bey} stat="sta"    maxN={50} side={side}/>
          <SBRow label="BAL"  bey={bey} stat="bal"    maxN={35} side={side}/>
          <SBRow label="WGT"  bey={bey} stat="weight" maxN={40} side={side}/>
          <SBRow label="SPIN" bey={bey} stat="spin"   maxN={90} side={side}/>
        </div>

        {/* Trait */}
        {(trait || bps.length > 0) && (
          <div>
            <div className="pbb-slbl">ABILITY / TRAITS</div>
            {trait && (
              <div className="pbb-trait" style={{marginTop:6}}>
                <div className="pbb-ttit">{trait.icon} {trait.name}</div>
                <div className="pbb-tdesc">{trait.desc}</div>
              </div>
            )}
            {bps.map((bp, i) => (
              <div key={i} className="pbb-bpt">
                <span style={{fontSize:11,flexShrink:0,marginTop:1}}>⚡</span>
                <div>
                  <div className="pbb-bpti">{bp.name || bp}</div>
                  {bp.desc && <div className="pbb-bpd">{bp.desc}</div>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── CenterPanel ─────────────────────────────────────────────────────────────
const CenterPanel = ({ bey1, bey2, md3State, onComplete }) => {
  const round   = md3State?.currentRound || 1;
  const t1w     = md3State?.team1Wins   || 0;
  const t2w     = md3State?.team2Wins   || 0;
  const history = md3State?.matchHistory || [];
  const format  = md3State?.format      || 'MD3';
  const ak      = md3State?.arenaOrder?.[round-1] || 'BB10_COMPETITIVE';
  const arena   = ARENA_DB[ak] || { name: ak, cat: 'STANDARD', favors: [] };
  // Pick info: quem escolheu esta arena
  const pickInfo = md3State?.arenaPickInfo?.[round-1] || null;
  const pickerName = pickInfo?.reason === 'RANDOM'
    ? '🎲 SORTEIO'
    : pickInfo?.picker?.name
      ? `⚔️ ${playerShortName(pickInfo.picker)}`
      : null;
  const { p1, note } = getMatchup(bey1?.type, bey2?.type);
  const p2   = 100 - p1;
  const opp  = bey1?.rotation !== bey2?.rotation;

  return (
    <div className="pbb-center">
      {/* BOTÃO MOVIDO PARA O TOPO */}
      <button className="pbb-lbtn" onClick={onComplete}>⚡ LAUNCH BATTLE</button>

      {/* Match Intel */}
      <div className="pbb-card">
        <div className="pbb-chdr"><div className="pbb-cdot"/>MATCH INTEL</div>
        <div className="pbb-cbody">
          <div className="pbb-irow">
            <span className="pbb-ilbl">ARENA</span>
            <span style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:1}}>
              <span className="pbb-ival pbb-ival-g">{arena.name}</span>
              {pickerName && <span style={{fontSize:8,opacity:.55,fontFamily:'Share Tech Mono,monospace',letterSpacing:'.05em'}}>{pickerName}</span>}
            </span>
          </div>
          <div className="pbb-irow"><span className="pbb-ilbl">CATEGORY</span><span className="pbb-ival">{arena.cat}</span></div>
          <div className="pbb-irow"><span className="pbb-ilbl">FORMAT</span><span className="pbb-ival">{format} · ROUND {round}</span></div>
          {md3State?.signatureOnly && (
            <div className="pbb-irow" style={{borderTop:'1px solid rgba(253,230,138,.25)',marginTop:4,paddingTop:4}}>
              <span className="pbb-ilbl">REGRA</span>
              <span className="pbb-ival" style={{color:'#fde68a',fontWeight:700,letterSpacing:'.08em'}}>✍️ SIGNATURE ONLY</span>
            </div>
          )}
          <div className="pbb-irow">
            <span className="pbb-ilbl">SERIES</span>
            <span className="pbb-ival">
              <span style={{color:'#ff2d3d'}}>{t1w}</span>
              {' — '}
              <span style={{color:'#00aaff'}}>{t2w}</span>
            </span>
          </div>
          {arena.favors.length > 0 && (
            <div className="pbb-irow"><span className="pbb-ilbl">FAVORS</span><span className="pbb-ival pbb-ival-g">{arena.favors.join(' · ')}</span></div>
          )}
          <div className="pbb-irow">
            <span className="pbb-ilbl">SPIN DIR.</span>
            <span className={`pbb-ival ${opp ? 'pbb-ival-r' : ''}`}>{opp ? '⚡ OPPOSITE' : '🔄 SAME SPIN'}</span>
          </div>
        </div>
      </div>

      {/* Win Probability */}
      <div className="pbb-card">
        <div className="pbb-chdr"><div className="pbb-cdot"/>WIN PROBABILITY</div>
        <div className="pbb-cbody">
          <div className="pbb-pnames">
            <span className="pbb-pr">{bey1?.name?.split(' ')[0] || 'P1'}</span>
            <span style={{fontFamily:'Share Tech Mono,monospace',fontSize:8,color:'rgba(255,255,255,.3)'}}>
              {bey1?.type} vs {bey2?.type}
            </span>
            <span className="pbb-pb">{bey2?.name?.split(' ')[0] || 'P2'}</span>
          </div>
          <div className="pbb-pbar">
            <div className="pbb-pfr" style={{width:`${p1}%`}}>{p1 > 25 ? `${p1}%` : ''}</div>
            <div className="pbb-pfb" style={{width:`${p2}%`}}>{p2 > 25 ? `${p2}%` : ''}</div>
          </div>
          <div className="pbb-mnote" dangerouslySetInnerHTML={{__html: note}}/>
        </div>
      </div>

      {/* Series history */}
      {history.length > 0 && (
        <div className="pbb-card">
          <div className="pbb-chdr"><div className="pbb-cdot"/>THIS SERIES</div>
          <div className="pbb-cbody">
            {history.map((r, i) => (
              <div key={i} className="pbb-irow">
                <span className="pbb-ilbl">ROUND {r.round}</span>
                <span className={`pbb-ival ${r.winner === 'team1' ? 'pbb-ival-r' : 'pbb-ival-b'}`}>
                  {r.winner === 'team1' ? (bey1?.name?.split(' ')[0] || 'P1') : (bey2?.name?.split(' ')[0] || 'P2')} wins
                  {r.method ? ` · ${String(r.method).toUpperCase()}` : ''}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Opposite spin info */}
      {opp && (
        <div className="pbb-card">
          <div className="pbb-chdr"><div className="pbb-cdot"/>SPIN CLASH</div>
          <div className="pbb-cbody">
            <div style={{fontSize:11,color:'rgba(255,255,255,.42)',lineHeight:1.45}}>
              Rotações opostas ativam <strong style={{color:'#ffd700'}}>equalização de momentum</strong> — colisões drenam spin de ambos, elevando risco de burst mútuo.
            </div>
          </div>
        </div>
      )}

      {/* Countdown removido - substituído pelo botão no topo */}
      <div className="pbb-card" style={{padding:'12px 16px',textAlign:'center',background:'rgba(255,215,0,.04)',border:'1px solid rgba(255,215,0,.18)'}}>
        <div style={{fontFamily:'Share Tech Mono,monospace',fontSize:9,color:'rgba(255,255,255,.4)',letterSpacing:'2px',marginBottom:'6px'}}>
          READY TO LAUNCH
        </div>
        <div style={{fontFamily:'Orbitron,monospace',fontSize:11,fontWeight:700,color:'#ffd700'}}>
          {format === 'MD5' ? 'BEST OF 5' : 'BEST OF 3'} • ROUND {round}
        </div>
        <div style={{fontFamily:'Share Tech Mono,monospace',fontSize:8,color:'rgba(255,255,255,.25)',marginTop:'4px',letterSpacing:'1px'}}>
          {t1w} — {t2w}
        </div>
      </div>
    </div>
  );
};

// ─── ComparisonGrid ───────────────────────────────────────────────────────────
const CompGrid = ({ bey1, bey2 }) => {
  const STATS = [
    { l:'ATK', s:'atk', max:50 },
    { l:'DEF', s:'def', max:50 },
    { l:'STA', s:'sta', max:50 },
    { l:'WGT', s:'weight', max:40 },
    { l:'SPIN',s:'spin', max:90 },
  ];
  const pw1 = useMemo(() => calcPower(bey1), [bey1]);
  const pw2 = useMemo(() => calcPower(bey2), [bey2]);

  return (
    <div className="pbb-cmp">
      <div className="pbb-cmptit">HEAD-TO-HEAD STAT COMPARISON</div>
      <div className="pbb-cmpg">
        {STATS.map(({ l, s }) => {
          const v1 = calculateStatBreakdown(bey1, s).total;
          const v2 = calculateStatBreakdown(bey2, s).total;
          const tot = v1 + v2 || 1;
          const w = (v1/tot)*100;
          const win = v1>v2?'r':v2>v1?'b':'t';
          return (
            <div key={s} className="pbb-cmpc">
              <div className="pbb-csn">{l}</div>
              <div className="pbb-cvs"><span className="pbb-cvl">{v1}</span><span className="pbb-cvs2">vs</span><span className="pbb-cvr">{v2}</span></div>
              <div className="pbb-mb"><div className="pbb-mbr" style={{width:`${w}%`}}/><div className="pbb-mbb" style={{width:`${100-w}%`}}/></div>
              <div className={`pbb-cwin pbb-cwin-${win === 't' ? 't' : win}`}>{win==='r'?'P1 LEADS':win==='b'?'P2 LEADS':'EVEN'}</div>
            </div>
          );
        })}
        {/* Power total */}
        <div className="pbb-cmpc pbb-cmpc-g">
          <div className="pbb-csn pbb-csn-g">POWER</div>
          <div className="pbb-cvs"><span className="pbb-cvl pbb-cvl-lg">{pw1.total}</span><span className="pbb-cvs2">vs</span><span className="pbb-cvr pbb-cvr-lg">{pw2.total}</span></div>
          <div className="pbb-mb">
            <div className="pbb-mbr" style={{width:`${(pw1.total/(pw1.total+pw2.total||1))*100}%`}}/>
            <div className="pbb-mbb" style={{width:`${(pw2.total/(pw1.total+pw2.total||1))*100}%`}}/>
          </div>
          <div className={`pbb-cwin ${pw1.total>pw2.total?'pbb-cwin-r':pw2.total>pw1.total?'pbb-cwin-b':'pbb-cwin-t'}`}>
            {pw1.total>pw2.total?`P1 +${pw1.total-pw2.total}`:pw2.total>pw1.total?`P2 +${pw2.total-pw1.total}`:'DEAD EVEN'}
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── ScoreStrip ───────────────────────────────────────────────────────────────
const ScoreStrip = ({ bey1, bey2, md3State }) => {
  const t1 = bey1?.team;
  const t2 = bey2?.team;
  return (
    <div className="pbb-sstrip">
      <div className="pbb-ss">
        <span className="pbb-spname pbb-spname-r">{t1?.name || 'BLADER 1'}</span>
        <div className="pbb-pills">
          <span className="pbb-pill pbb-pw">{t1?.wins || 0}W</span>
          <span className="pbb-pill pbb-pl">{t1?.losses || 0}L</span>
        </div>
      </div>
      <div className="pbb-ssc">
        <span className="pbb-snum" style={{color:'#ff2d3d'}}>{md3State?.team1Wins || 0}</span>
        <span className="pbb-ssep">—</span>
        <span className="pbb-ssub">BEST OF {md3State?.format === 'MD5' ? 5 : 3}</span>
        <span className="pbb-ssep">—</span>
        <span className="pbb-snum" style={{color:'#00aaff'}}>{md3State?.team2Wins || 0}</span>
      </div>
      <div className="pbb-ss pbb-ss-r">
        <div className="pbb-pills">
          <span className="pbb-pill pbb-pw">{t2?.wins || 0}W</span>
          <span className="pbb-pill pbb-pl">{t2?.losses || 0}L</span>
        </div>
        <span className="pbb-spname pbb-spname-b">{t2?.name || 'BLADER 2'}</span>
      </div>
    </div>
  );
};

// ─── MAIN EXPORT ──────────────────────────────────────────────────────────────
export const TacticalAnalysis = ({ bey1, bey2, md3State, onComplete }) => {
  const items    = useMemo(() => buildTicker(bey1, bey2, md3State), [bey1, bey2, md3State]);
  const tickDup  = [...items, ...items];
  const round    = md3State?.currentRound || 1;
  const format   = md3State?.format || 'MD3';
  const [b1a,b1b] = splitBeyName(bey1?.name);
  const [b2a,b2b] = splitBeyName(bey2?.name);
  const t1cfg  = TYPE_CFG[bey1?.type] || TYPE_CFG.Balance;
  const t2cfg  = TYPE_CFG[bey2?.type] || TYPE_CFG.Balance;

  return (
    <>
      <style>{FONTS_STYLE}</style>
      <style>{SCREEN_STYLES}</style>
      <div className="pbb-root">
        <div className="pbb-scan"/>

        {/* Ticker */}
        <div className="pbb-ticker">
          <div className="pbb-ticker-track">
            {tickDup.map((item, i) => (
              <span key={i} className="pbb-ti">{item}<span className="pbb-tsep"> | </span></span>
            ))}
          </div>
        </div>

        {/* Hero */}
        <div className="pbb-hero">
          <div className="pbb-hero-bg"/>
          <div className="pbb-hero-sl"/>
          <div className="pbb-hero-grid">
            <div className="pbb-fl">
              <span className="pbb-ftag pbb-ftag-r">{t1cfg.icon} {bey1?.type || 'ATTACK'} TYPE</span>
              <div className={`pbb-bname pbb-bname-r`}>{b1a}<br/>{b1b}</div>
              {bey1?.isSignature && <div className="pbb-signame">★ "{bey1.signatureName}"</div>}
              <div className="pbb-pname">{bey1?.team?.name || 'BLADER 1'}</div>
              {bey1?.team?.country && <div className="pbb-pcountry">{bey1.team.country}</div>}
            </div>
            <div className="pbb-vsc">
              <div className="pbb-vsdiv"/>
              <div className="pbb-vs">VS</div>
              <div className="pbb-rbadge">ROUND {round} · {format}</div>
              <div className="pbb-vsdiv"/>
            </div>
            <div className="pbb-fr">
              <span className="pbb-ftag pbb-ftag-b">{t2cfg.icon} {bey2?.type || 'DEFENSE'} TYPE</span>
              <div className={`pbb-bname pbb-bname-b`}>{b2a}<br/>{b2b}</div>
              {bey2?.isSignature && <div className="pbb-signame">★ "{bey2.signatureName}"</div>}
              <div className="pbb-pname">{bey2?.team?.name || 'BLADER 2'}</div>
              {bey2?.team?.country && <div className="pbb-pcountry">{bey2.team.country}</div>}
            </div>
          </div>
        </div>

        {/* Score */}
        <ScoreStrip bey1={bey1} bey2={bey2} md3State={md3State}/>

        {/* Main */}
        <div className="pbb-content">
          <StatPanel bey={bey1} side="left"/>
          <CenterPanel bey1={bey1} bey2={bey2} md3State={md3State} onComplete={onComplete}/>
          <StatPanel bey={bey2} side="right"/>
        </div>

        {/* Bottom comparison */}
        <CompGrid bey1={bey1} bey2={bey2}/>

        {/* Spacer for external START button */}
        <div style={{height:80}}/>
      </div>
    </>
  );
};

// ─── Legacy exports ───────────────────────────────────────────────────────────
export const MatchupBreakdown = () => null;
export const ArenaAnalysis    = () => null;
