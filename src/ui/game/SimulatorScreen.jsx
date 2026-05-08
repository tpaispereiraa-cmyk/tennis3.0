/**
 * SimulatorScreen.jsx — Simulador completo com analytics maximizados + Export
 */
import { ovrTier } from '../../systems/scouting/ScoutProfile.js';
import React, { useState, useRef, useEffect } from 'react';
import { simulateMatchHeadless }   from '../../core/Headless.jsx';
import { NAMED_PLAYERS, NAMED_PLAYER_KEYS, overallRating } from '../../domain/players/players.js';
import { COURTS, COURT_KEYS }      from '../../domain/courts/courtConfigs.js';
import { ANALYTICS_THEME as RG } from '../theme/uiTheme.js';

const SURFACE_COLORS = { grass:'#5a9e3a', clay:'#C4572A', hard:'#2255aa', carpet:'#553388' };
const COURT_NAMES = {
  WIMBLEDON:'Wimbledon', ROLAND_GARROS:'Roland Garros', US_OPEN:'US Open',
  O2_ARENA:'O2 Arena', QUEENS_CLUB:"Queen's Club", MONTE_CARLO:'Monte Carlo',
  INDIAN_WELLS:'Indian Wells', BERCY:'Bercy',
};
const SIM_COUNTS = [20, 50, 100, 200];

// Benchmarks ATP reais
const ATP = {
  s1Pct:   { lo:0.60, hi:0.66, label:'ATP: 60–66%'   },
  s2Pct:   { lo:0.88, hi:0.95, label:'ATP: 88–95%'   },
  s1Kmh:   { lo:175,  hi:205,  label:'ATP: 175–205'   },
  s2Kmh:   { lo:130,  hi:155,  label:'ATP: 130–155'   },
  aces:    { lo:6,    hi:14,   label:'ATP: 6–14/pt'   },
  df:      { lo:2,    hi:5,    label:'ATP: 2–5/pt'    },
  hold:    { lo:0.72, hi:0.82, label:'ATP: 72–82%'    },
  brk:     { lo:0.22, hi:0.32, label:'ATP: 22–32%'    },
  s1WinP:  { lo:0.72, hi:0.80, label:'ATP: 72–80%'    },
  s2WinP:  { lo:0.48, hi:0.58, label:'ATP: 48–58%'    },
  winners: { lo:25,   hi:40,   label:'ATP: 25–40/pt'  },
  ue:      { lo:20,   hi:32,   label:'ATP: 20–32/pt'  },
  wue:     { lo:1.0,  hi:1.8,  label:'ATP: 1.0–1.8'   },
  rally:   { lo:3.5,  hi:5.5,  label:'ATP: 3.5–5.5'   },
  net:     { lo:8,    hi:18,   label:'ATP: 8–18/pt'   },
  netPct:  { lo:0.60, hi:0.72, label:'ATP: 60–72%'    },
  retPct:  { lo:0.40, hi:0.50, label:'ATP: 40–50%'    },
  quality: { lo:0.60, hi:0.75, label:'ATP: 60–75%'    },
  pts:     { lo:90,   hi:130,  label:'ATP: 90–130/pt' },
};

const ATP_RALLY_REF = [56, 28, 11, 5]; // % por bucket

const CSS = `
@keyframes s-scan  { 0%{transform:translateY(-100%)} 100%{transform:translateY(100vh)} }
@keyframes s-pulse { 0%,100%{opacity:1} 50%{opacity:.3} }
@keyframes s-in    { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
@keyframes s-spin  { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
@keyframes s-res   { from{opacity:0;transform:scale(.93)} to{opacity:1;transform:scale(1)} }
@keyframes s-feed  { from{opacity:0;transform:translateX(12px)} to{opacity:1;transform:translateX(0)} }
@keyframes s-blink { 0%,100%{opacity:1} 45%,55%{opacity:.1} }

.sc { background:rgba(22,48,32,.85); border:1px solid rgba(255,255,255,.10); border-radius:8px; padding:16px; animation:s-in .35s both; }
.sc:hover { border-color:rgba(196,87,42,.18); }
.slbl { font-family:'Space Mono',monospace; font-size:9px; letter-spacing:.35em; color:rgba(255,255,255,.28); text-transform:uppercase; margin-bottom:10px; }
.ssel { width:100%; background:#163020; border:1px solid rgba(255,255,255,.12); color:#fff; font-family:'Barlow Condensed',sans-serif; font-size:14px; padding:8px 10px; border-radius:4px; outline:none; cursor:pointer; }
.ssel:focus { border-color:rgba(196,87,42,.6); }
.sbtn { flex:1; padding:7px 4px; background:rgba(255,255,255,.04); border:1px solid rgba(255,255,255,.10); color:rgba(255,255,255,.45); font-family:'Space Mono',monospace; font-size:11px; border-radius:4px; cursor:pointer; transition:all .15s; letter-spacing:.1em; }
.sbtn:hover:not(:disabled) { background:rgba(196,87,42,.15); border-color:rgba(196,87,42,.5); color:#fff; }
.sbtn.on { background:rgba(196,87,42,.25); border-color:#C4572A; color:#fff; }
.sbtn:disabled { opacity:.35; cursor:not-allowed; }
.runbtn { width:100%; padding:14px; background:linear-gradient(135deg,#C4572A,#8b1a00); border:none; color:#fff; font-family:'Barlow Condensed',sans-serif; font-size:15px; font-weight:600; letter-spacing:.2em; text-transform:uppercase; border-radius:6px; cursor:pointer; transition:all .15s; }
.runbtn:hover:not(:disabled) { background:linear-gradient(135deg,#D97448,#C4572A); transform:translateY(-1px); }
.runbtn:disabled { background:rgba(255,255,255,.06); color:rgba(255,255,255,.22); cursor:not-allowed; }
.expbtn { width:100%; padding:11px; background:rgba(0,212,255,.08); border:1px solid rgba(0,212,255,.35); color:#00d4ff; font-family:'Barlow Condensed',sans-serif; font-size:13px; font-weight:600; letter-spacing:.2em; text-transform:uppercase; border-radius:6px; cursor:pointer; transition:all .15s; }
.expbtn:hover { background:rgba(0,212,255,.18); border-color:#00d4ff; color:#fff; }
.srow { display:flex; justify-content:space-between; align-items:flex-start; padding:7px 0; border-bottom:1px solid rgba(255,255,255,.06); }
.srow:last-child { border-bottom:none; }
.lrow { transition:background .1s; }
.lrow:hover { background:rgba(255,255,255,.04)!important; }
.atpbench { font-family:'Space Mono',monospace; font-size:8px; color:rgba(255,255,255,.2); letter-spacing:.08em; margin-top:1px; }
.atpok   { color:#00c48c!important; }
.atpwarn { color:#ffd700!important; }
.atpbad  { color:#ef4444!important; }
.sec-title { font-family:'Barlow Condensed',sans-serif; font-size:10px; font-weight:700; letter-spacing:.4em; color:rgba(255,255,255,.3); text-transform:uppercase; padding:18px 0 8px; border-top:1px solid rgba(255,255,255,.06); margin-top:4px; }
.div-sep { height:1px; background:rgba(255,255,255,.06); margin:8px 0; }

/* OVERLAY */
.ov { position:fixed; inset:0; z-index:9999; background:rgba(4,10,7,.95); backdrop-filter:blur(5px); display:flex; flex-direction:column; font-family:'Barlow',sans-serif; animation:s-in .3s ease both; overflow-y:auto; }
.ov-scan { position:absolute; inset:0; pointer-events:none; overflow:hidden; opacity:.05; }
.ov-scan::after { content:''; position:absolute; left:0; right:0; height:2px; background:linear-gradient(90deg,transparent,#C4572A,transparent); animation:s-scan 8s linear infinite; }
.ov-grid { position:absolute; inset:0; pointer-events:none; background-image:linear-gradient(rgba(255,255,255,.012) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.012) 1px,transparent 1px); background-size:60px 60px; mask-image:radial-gradient(ellipse 80% 80% at 50% 50%,black 10%,transparent 100%); }
.ov-hdr { padding:14px 28px; border-bottom:2px solid #C4572A; background:rgba(0,0,0,.45); display:flex; align-items:center; gap:14px; flex-shrink:0; }
.ov-dot { width:9px; height:9px; border-radius:50%; background:#FF4444; box-shadow:0 0 12px #FF4444; animation:s-blink 1.1s ease-in-out infinite; flex-shrink:0; }
.ov-body { flex:1; display:grid; grid-template-columns:1fr 300px; overflow:hidden; position:relative; z-index:2; }
.ov-main { display:flex; flex-direction:column; padding:22px 28px; border-right:1px solid rgba(255,255,255,.07); overflow:hidden; }
.ov-feed-wrap { display:flex; flex-direction:column; overflow:hidden; }
.ov-feed-hdr { padding:11px 14px; border-bottom:1px solid rgba(255,255,255,.06); font-family:'Space Mono',monospace; font-size:9px; letter-spacing:.3em; color:rgba(255,255,255,.3); text-transform:uppercase; flex-shrink:0; }
.ov-feed-list { flex:1; overflow-y:auto; padding:3px 0; }
.ov-feed-row { display:flex; align-items:center; gap:8px; padding:7px 13px; border-bottom:1px solid rgba(255,255,255,.04); animation:s-feed .22s ease both; }
.ov-feed-row:hover { background:rgba(255,255,255,.03); }
.ov-pbar { height:4px; background:rgba(255,255,255,.06); flex-shrink:0; }
.ov-pfill { height:100%; background:linear-gradient(to right,#C4572A,#ff6b00); transition:width .25s ease; }
.ov-ftr { padding:9px 28px; background:rgba(0,0,0,.3); border-top:1px solid rgba(255,255,255,.05); display:flex; align-items:center; justify-content:space-between; flex-shrink:0; }
.ov-prow { display:flex; align-items:center; gap:14px; padding:15px 0; border-bottom:1px solid rgba(255,255,255,.05); }
`;

let cssOk = false;
function injectCSS() {
  if (cssOk) return; cssOk = true;
  const el = document.createElement('style');
  el.id = 'simcss'; el.textContent = CSS;
  document.head.appendChild(el);
}

const f2  = n => n != null ? (+n).toFixed(2) : '—';
const f1  = n => n != null ? (+n).toFixed(1) : '—';
const f0  = n => n != null ? String(Math.round(+n)) : '—';
const pct = (n, t) => t > 0 ? ((n/t)*100).toFixed(1) : '0.0';
const pp  = n => n != null ? `${(n*100).toFixed(1)}%` : '—';
const round = (n, d = 2) => Number.isFinite(+n) ? +(+n).toFixed(d) : null;

function pct100(n, d = 2) {
  return n != null && Number.isFinite(+n) ? +(+n * 100).toFixed(d) : null;
}

function playerSnapshot(player) {
  if (!player) return null;
  const attrs = player.attrs ?? {};
  return {
    id: player.id,
    name: player.name,
    nationality: player.nationality,
    age: player.age,
    height: player.height,
    weight: player.weight,
    styleId: player.styleId,
    potential: player.potential,
    developmentStyle: player.developmentStyle,
    peakAge: player.peakAge,
    overall: overallRating(attrs),
    prefs: player.prefs ?? null,
    identity: {
      signatureShot: player.signatureShot ?? null,
      rallyPattern: player.rallyPattern ?? null,
      signaturePattern: player.signaturePattern ?? null,
      naturalSignature: player.naturalSignature ?? null,
      alcunha: player.alcunha ?? null,
      tagline: player.tagline ?? null,
    },
    attrs: {
      velocidade: attrs.velocidade, explosividade: attrs.explosividade, resistencia: attrs.resistencia, defesa: attrs.defesa,
      fhPotencia: attrs.fhPotencia, fhControle: attrs.fhControle, bhPotencia: attrs.bhPotencia, bhControle: attrs.bhControle,
      topspin: attrs.topspin, slice: attrs.slice,
      saqueForca: attrs.saqueForca, saquePrecisao: attrs.saquePrecisao, devolucao: attrs.devolucao,
      volley: attrs.volley, smash: attrs.smash,
      leitura: attrs.leitura, visaoTatica: attrs.visaoTatica,
      mentalidade: attrs.mentalidade, regularidade: attrs.regularidade, recuperacao: attrs.recuperacao, adaptacao: attrs.adaptacao,
    },
  };
}

function compactStats(s = {}) {
  const serve1Pts = (s.serve1WonPoints ?? 0) + (s.serve1LostPoints ?? 0);
  const serve2Pts = (s.serve2WonPoints ?? 0) + (s.serve2LostPoints ?? 0);
  const servePts = (s.pointsWonServing ?? 0) + (s.pointsLostServing ?? 0);
  const returnPts = (s.pointsWonReturning ?? 0) + (s.pointsLostReturning ?? 0);
  const rallyLengths = Array.isArray(s.rallyLengths) ? s.rallyLengths : [];
  return {
    serve: {
      aces: s.aces ?? 0,
      doubleFaults: s.doubleFaults ?? 0,
      serve1In: s.serve1In ?? 0,
      serve1Total: s.serve1Total ?? 0,
      serve1Pct: (s.serve1Total ?? 0) > 0 ? round((s.serve1In ?? 0) / s.serve1Total, 4) : null,
      serve2In: s.serve2In ?? 0,
      serve2Total: s.serve2Total ?? 0,
      serve2Pct: (s.serve2Total ?? 0) > 0 ? round((s.serve2In ?? 0) / s.serve2Total, 4) : null,
      serve1AvgKmh: round(s.serve1AvgKmh, 1),
      serve2AvgKmh: round(s.serve2AvgKmh, 1),
      pointsWonServing: s.pointsWonServing ?? 0,
      pointsLostServing: s.pointsLostServing ?? 0,
      ptsWonServingPct: servePts > 0 ? round((s.pointsWonServing ?? 0) / servePts, 4) : null,
      ptsWonOnS1Pct: serve1Pts > 0 ? round((s.serve1WonPoints ?? 0) / serve1Pts, 4) : null,
      ptsWonOnS2Pct: serve2Pts > 0 ? round((s.serve2WonPoints ?? 0) / serve2Pts, 4) : null,
      gamesServed: s.gamesServed ?? 0,
      gamesHeld: s.gamesHeld ?? 0,
      holdPct: (s.gamesServed ?? 0) > 0 ? round((s.gamesHeld ?? 0) / s.gamesServed, 4) : null,
    },
    returnAndBreak: {
      pointsWonReturning: s.pointsWonReturning ?? 0,
      pointsLostReturning: s.pointsLostReturning ?? 0,
      ptsWonReturningPct: returnPts > 0 ? round((s.pointsWonReturning ?? 0) / returnPts, 4) : null,
      gamesReturned: s.gamesReturned ?? 0,
      gamesConverted: s.gamesConverted ?? 0,
      breakPct: (s.gamesReturned ?? 0) > 0 ? round((s.gamesConverted ?? 0) / s.gamesReturned, 4) : null,
    },
    rally: {
      winners: s.winners ?? 0,
      unforcedErrors: s.unforcedErrors ?? 0,
      forcedErrors: s.forcedErrors ?? 0,
      avgQuality: s.avgQuality != null ? round(s.avgQuality, 4) : ((s.qualityCount ?? 0) > 0 ? round((s.qualitySum ?? 0) / s.qualityCount, 4) : null),
      qualitySum: round(s.qualitySum, 3),
      qualityCount: s.qualityCount ?? 0,
      avgRallyLength: rallyLengths.length ? round(rallyLengths.reduce((a, b) => a + b, 0) / rallyLengths.length, 3) : null,
      maxRally: rallyLengths.length ? Math.max(...rallyLengths) : 0,
      netApproaches: s.netApproaches ?? 0,
      netPointsWon: s.netPointsWon ?? 0,
      netWinPct: (s.netApproaches ?? 0) > 0 ? round((s.netPointsWon ?? 0) / s.netApproaches, 4) : null,
      byType: s.byType ?? {},
    },
    modernShotTelemetry: {
      serveLogSample: Array.isArray(s.serveLog) ? s.serveLog.slice(0, 24) : [],
      serveLogCount: Array.isArray(s.serveLog) ? s.serveLog.length : 0,
      returnLogSample: Array.isArray(s.returnLog) ? s.returnLog.slice(0, 24) : [],
      returnLogCount: Array.isArray(s.returnLog) ? s.returnLog.length : 0,
      receptionLogSample: Array.isArray(s.receptionLog) ? s.receptionLog.slice(0, 24) : [],
      receptionLogCount: Array.isArray(s.receptionLog) ? s.receptionLog.length : 0,
      contactLogSample: Array.isArray(s.contactLog) ? s.contactLog.slice(0, 24) : [],
      contactLogCount: Array.isArray(s.contactLog) ? s.contactLog.length : 0,
      shotLogSample: Array.isArray(s.shotLog) ? s.shotLog.slice(0, 40) : [],
      shotLogCount: Array.isArray(s.shotLog) ? s.shotLog.length : 0,
      intentLogSample: Array.isArray(s.intentLog) ? s.intentLog.slice(0, 40) : [],
      intentLogCount: Array.isArray(s.intentLog) ? s.intentLog.length : 0,
    },
  };
}

function atpClass(val, bench) {
  if (val == null || !bench) return '';
  if (val >= bench.lo && val <= bench.hi) return 'atpok';
  return 'atpwarn';
}

function Bar({ v, max, color = RG.clay, h = 5 }) {
  const w = max > 0 ? Math.min(100, (v / max) * 100) : 0;
  return (
    <div style={{ height: h, background: 'rgba(255,255,255,.06)', borderRadius: 99, overflow: 'hidden', marginTop: 4 }}>
      <div style={{ height: '100%', width: `${w}%`, background: color, borderRadius: 99, transition: 'width .5s' }} />
    </div>
  );
}

function BarPct({ pct: p, color = RG.clay, h = 5 }) {
  return (
    <div style={{ height: h, background: 'rgba(255,255,255,.06)', borderRadius: 99, overflow: 'hidden', marginTop: 4 }}>
      <div style={{ height: '100%', width: `${Math.min(100, p)}%`, background: color, borderRadius: 99, transition: 'width .5s' }} />
    </div>
  );
}

function SR({ label, val, color = RG.white, bench, benchVal, sub }) {
  const cls = benchVal != null && bench ? atpClass(benchVal, bench) : '';
  return (
    <div className="srow">
      <div>
        <span style={{ fontFamily: RG.mono, fontSize: 10, color: RG.textFaint }}>{label}</span>
        {bench && <div className={`atpbench ${cls}`}>{bench.label}</div>}
        {sub   && <div className="atpbench">{sub}</div>}
      </div>
      <span style={{ fontFamily: RG.display, fontSize: 13, fontWeight: 700, color }} className={cls}>
        {val}
      </span>
    </div>
  );
}

function QB({ value, bench }) {
  if (value == null) return <span style={{ color: RG.textFaint }}>—</span>;
  const p     = Math.round(value * 100);
  const color = p >= 70 ? RG.green : p >= 55 ? RG.yellow : p >= 40 ? RG.clayLight : RG.red;
  const lbl   = p >= 70 ? 'EXCELENTE' : p >= 55 ? 'BOA' : p >= 40 ? 'MÉDIA' : 'BAIXA';
  const cls   = bench ? atpClass(value, bench) : '';
  return (
    <div>
      <span style={{ fontFamily: RG.display, fontSize: 15, fontWeight: 700, color }} className={cls}>
        {p}% <span style={{ fontSize: 9, letterSpacing: '.15em', opacity: .7 }}>{lbl}</span>
      </span>
      {bench && <div className={`atpbench ${cls}`}>{bench.label}</div>}
    </div>
  );
}

/* ─── OVERLAY ────────────────────────────────────────────────── */
function Overlay({ nameA, nameB, courtName, bestOf, simCount, done, feed }) {
  const p      = simCount > 0 ? Math.round(done / simCount * 100) : 0;
  const latest = feed[0];
  const winsA  = feed.filter(e => e.winnerName === nameA).length;
  const winsB  = feed.length - winsA;
  const sA     = nameA.split(' ').pop();
  const sB     = nameB.split(' ').pop();

  return (
    <div className="ov">
      <div className="ov-scan" />
      <div className="ov-grid" />
      <div style={{ position:'fixed', top:'8%', left:'4%', width:300, height:300, borderRadius:'50%', background:'radial-gradient(circle,rgba(196,87,42,.08),transparent 70%)', filter:'blur(60px)', pointerEvents:'none' }} />
      <div style={{ position:'fixed', bottom:'8%', right:'4%', width:260, height:260, borderRadius:'50%', background:'radial-gradient(circle,rgba(0,212,255,.06),transparent 70%)', filter:'blur(60px)', pointerEvents:'none' }} />

      <div className="ov-hdr">
        <div className="ov-dot" />
        <span style={{ fontFamily:RG.display, fontSize:11, fontWeight:700, letterSpacing:'.35em', color:'#FF4444', textTransform:'uppercase' }}>AO VIVO</span>
        <div style={{ width:1, height:22, background:'rgba(255,255,255,.12)' }} />
        <div>
          <div style={{ fontFamily:RG.display, fontWeight:700, fontSize:'clamp(15px,2vw,22px)', color:RG.white, textTransform:'uppercase', lineHeight:1 }}>
            🎾 {nameA} <span style={{ color:RG.textFaint, fontWeight:300 }}>vs</span> {nameB}
          </div>
          <div style={{ fontFamily:RG.mono, fontSize:9, letterSpacing:'.22em', color:'rgba(255,255,255,.32)', textTransform:'uppercase', marginTop:3 }}>
            {courtName} · BO{bestOf} · {simCount} PARTIDAS
          </div>
        </div>
        <div style={{ marginLeft:'auto', textAlign:'right' }}>
          <div style={{ fontFamily:RG.display, fontSize:30, fontWeight:700, color:RG.clay, lineHeight:1 }}>{p}%</div>
          <div style={{ fontFamily:RG.mono, fontSize:9, letterSpacing:'.15em', color:'rgba(255,255,255,.28)' }}>{done}/{simCount}</div>
        </div>
      </div>

      <div className="ov-body">
        <div className="ov-main">
          <div style={{ fontFamily:RG.mono, fontSize:9, letterSpacing:'.4em', color:RG.clay, textTransform:'uppercase', marginBottom:18 }}>
            PARTIDA {done} DE {simCount}
          </div>
          {latest ? (
            <div style={{ animation:'s-res .28s ease both' }} key={latest.n}>
              {[
                { name:nameA, sets:latest.sA, won:latest.winnerName===nameA, q:latest.aQ },
                { name:nameB, sets:latest.sB, won:latest.winnerName===nameB, q:latest.bQ },
              ].map((pl, i) => (
                <div key={i} className="ov-prow">
                  <div style={{ width:42, height:42, borderRadius:'50%', border:`2px solid ${pl.won?RG.clay:'rgba(255,255,255,.12)'}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:17, flexShrink:0 }}>🎾</div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontFamily:RG.display, fontSize:17, fontWeight:700, color:pl.won?RG.white:RG.textDim, lineHeight:1 }}>{pl.name}</div>
                    {pl.q != null && <div style={{ fontFamily:RG.mono, fontSize:9, color:'rgba(255,255,255,.28)', letterSpacing:'.12em', marginTop:3 }}>Q MÉDIO {Math.round(pl.q*100)}%</div>}
                  </div>
                  <div style={{ fontFamily:RG.display, fontSize:38, fontWeight:700, color:pl.won?RG.clay:'rgba(255,255,255,.22)', lineHeight:1, minWidth:26, textAlign:'center' }}>{pl.sets}</div>
                  {pl.won && <div style={{ fontFamily:RG.mono, fontSize:9, color:RG.clay }}>✓</div>}
                </div>
              ))}
              {latest.setDetail && (
                <div style={{ fontFamily:RG.mono, fontSize:10, color:RG.textFaint, letterSpacing:'.15em', marginTop:10, textAlign:'center' }}>{latest.setDetail}</div>
              )}
              <div style={{ display:'flex', alignItems:'center', gap:10, marginTop:22, padding:'10px 12px', background:'rgba(255,255,255,.03)', borderRadius:6, border:'1px solid rgba(255,255,255,.06)' }}>
                <div style={{ width:16, height:16, border:`2px solid ${RG.clay}`, borderTopColor:'transparent', borderRadius:'50%', animation:'s-spin .9s linear infinite', flexShrink:0 }} />
                <div style={{ fontFamily:RG.mono, fontSize:10, color:'rgba(255,255,255,.32)', letterSpacing:'.1em' }}>PROCESSANDO PRÓXIMA PARTIDA</div>
              </div>
            </div>
          ) : (
            <div style={{ display:'flex', alignItems:'center', justifyContent:'center', flex:1, flexDirection:'column', gap:14 }}>
              <div style={{ fontSize:38, animation:'s-spin 5s linear infinite' }}>🎾</div>
              <div style={{ fontFamily:RG.mono, fontSize:10, letterSpacing:'.25em', color:RG.textFaint }}>INICIANDO…</div>
            </div>
          )}
        </div>

        <div className="ov-feed-wrap">
          <div className="ov-feed-hdr">📋 Resultados ao vivo</div>
          <div className="ov-feed-list">
            {feed.length === 0
              ? <div style={{ padding:18, textAlign:'center', fontFamily:RG.mono, fontSize:9, letterSpacing:'.2em', color:'rgba(255,255,255,.15)' }}>AGUARDANDO…</div>
              : feed.map((e, i) => {
                const isA = e.winnerName === nameA;
                const wc  = isA ? RG.clay : RG.blue;
                return (
                  <div key={e.n} className="ov-feed-row" style={{ animationDelay:`${i*.02}s` }}>
                    <span style={{ fontFamily:RG.mono, fontSize:9, color:'rgba(255,255,255,.2)', minWidth:22 }}>#{e.n}</span>
                    <span style={{ fontFamily:RG.display, fontSize:13, fontWeight:700, color:wc, flex:1 }}>{isA?sA:sB}</span>
                    <span style={{ fontFamily:RG.mono, fontSize:11, fontWeight:700, color:RG.white }}>{e.score}</span>
                    {e.aQ != null && <span style={{ fontFamily:RG.mono, fontSize:9, color:'rgba(255,255,255,.28)', minWidth:55, textAlign:'right' }}>{Math.round(e.aQ*100)}%/{Math.round(e.bQ*100)}%</span>}
                  </div>
                );
              })
            }
          </div>
          {feed.length > 0 && (
            <div style={{ padding:'10px 14px', borderTop:'1px solid rgba(255,255,255,.06)', display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, flexShrink:0 }}>
              {[{lbl:sA,v:winsA,c:RG.clay},{lbl:sB,v:winsB,c:RG.blue}].map(({lbl,v,c}) => (
                <div key={lbl} style={{ textAlign:'center' }}>
                  <div style={{ fontFamily:RG.display, fontSize:22, fontWeight:700, color:c }}>{v}</div>
                  <div style={{ fontFamily:RG.mono, fontSize:8, color:'rgba(255,255,255,.22)', letterSpacing:'.2em', marginTop:2 }}>{lbl}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="ov-pbar"><div className="ov-pfill" style={{ width:`${p}%` }} /></div>
      <div className="ov-ftr">
        <div style={{ fontFamily:RG.mono, fontSize:9, letterSpacing:'.14em', color:'rgba(255,255,255,.32)' }}>
          <span style={{ color:RG.clay, fontWeight:700 }}>{done}</span> / {simCount} · <span style={{ color:RG.clay }}>{p}%</span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
          <div style={{ width:5, height:5, borderRadius:'50%', background:RG.green, boxShadow:`0 0 8px ${RG.green}`, animation:'s-pulse 1.5s ease-in-out infinite' }} />
          <span style={{ fontFamily:RG.mono, fontSize:8, letterSpacing:'.2em', color:'rgba(255,255,255,.22)', textTransform:'uppercase' }}>Headless Engine · Física Completa</span>
        </div>
      </div>
    </div>
  );
}

/* ─── MAIN ───────────────────────────────────────────────────── */
export default function SimulatorScreen({ onBack }) {
  useEffect(() => { injectCSS(); }, []);

  const [keyA,     setKeyA]     = useState(NAMED_PLAYER_KEYS[0]);
  const [keyB,     setKeyB]     = useState(NAMED_PLAYER_KEYS[1]);
  const [courtKey, setCourtKey] = useState('US_OPEN');
  const [bestOf,   setBestOf]   = useState(3);
  const [simCount, setSimCount] = useState(50);
  const [running,  setRunning]  = useState(false);
  const [done,     setDone]     = useState(0);
  const [feed,     setFeed]     = useState([]);
  const [results,  setResults]  = useState(null);
  const abortRef = useRef(false);
  const feedRef  = useRef([]);
  const matchesRef = useRef([]);

  const pA      = NAMED_PLAYERS[keyA];
  const pB      = NAMED_PLAYERS[keyB];
  const surface = COURTS[courtKey]?.meta?.surface ?? 'hard';

  /* ── buckets ─────────────────────────────────────────────── */
  function empty() {
    return {
      wins:0, setsWon:0, setsLost:0,
      aces:0, df:0, winners:0, ue:0, fe:0,
      s1In:0, s1Tot:0, s1KmhSum:0,
      s2In:0, s2Tot:0, s2KmhSum:0,
      s1KmhMin:9999, s1KmhMax:0,
      s2KmhMin:9999, s2KmhMax:0,
      serve1Dir:{ T:0, Body:0, Wide:0 },
      serve2Dir:{ T:0, Body:0, Wide:0 },
      netApp:0, netWon:0,
      pwS:0, plS:0, pwR:0, plR:0,
      gSrv:0, gHeld:0, gRet:0, gConv:0,
      s1WonPts:0, s1LostPts:0,
      s2WonPts:0, s2LostPts:0,
      qSum:0, qCnt:0,
      rallyTot:0, rallyCnt:0,
      rallyMax:0,
      rallyBuckets:[0,0,0,0],
      totalPts:0,
      byType:{}, setMap:{},
      pointWinsByType:{},
      byTypeQSum:{}, byTypeQCnt:{},
      byTypeKmhSum:{}, byTypeKmhCnt:{},
      attackShots:0, defenseShots:0,
      attackPointsPlayed:0, attackPointsWon:0,
      defensePointsPlayed:0, defensePointsWon:0,
      modernLogs:{ serveLog:0, returnLog:0, receptionLog:0, contactLog:0, shotLog:0, intentLog:0 },
      modernLogSamples:{ serveLog:[], returnLog:[], receptionLog:[], contactLog:[], shotLog:[], intentLog:[] },
    };
  }

  function addBucket(b, s, won, sW, sL, extra) {
    if (won) b.wins++;
    b.setsWon += sW; b.setsLost += sL;
    b.aces += s.aces??0;       b.df      += s.doubleFaults??0;
    b.winners += s.winners??0; b.ue      += s.unforcedErrors??0; b.fe += s.forcedErrors??0;
    b.s1In  += s.serve1In??0;  b.s1Tot   += s.serve1Total??0;   b.s1KmhSum += s.serve1AvgKmh??0;
    b.s2In  += s.serve2In??0;  b.s2Tot   += s.serve2Total??0;   b.s2KmhSum += s.serve2AvgKmh??0;
    b.netApp += s.netApproaches??0;      b.netWon += s.netPointsWon??0;
    b.pwS += s.pointsWonServing??0;      b.plS += s.pointsLostServing??0;
    b.pwR += s.pointsWonReturning??0;    b.plR += s.pointsLostReturning??0;
    b.gSrv += s.gamesServed??0;          b.gHeld += s.gamesHeld??0;
    b.gRet += s.gamesReturned??0;        b.gConv += s.gamesConverted??0;
    b.s1WonPts  += s.serve1WonPoints??0; b.s1LostPts += s.serve1LostPoints??0;
    b.s2WonPts  += s.serve2WonPoints??0; b.s2LostPts += s.serve2LostPoints??0;
    b.qSum += s.qualitySum??0;           b.qCnt += s.qualityCount??0;

    if (Array.isArray(s.rallyLengths)) {
      for (const r of s.rallyLengths) {
        b.rallyTot += r; b.rallyCnt++;
        if (r > b.rallyMax) b.rallyMax = r;
        if      (r <= 4)  b.rallyBuckets[0]++;
        else if (r <= 9)  b.rallyBuckets[1]++;
        else if (r <= 15) b.rallyBuckets[2]++;
        else              b.rallyBuckets[3]++;
      }
    }

    if (Array.isArray(s.serveLog)) {
      b.modernLogs.serveLog += s.serveLog.length;
      b.modernLogSamples.serveLog.push(...s.serveLog.slice(0, Math.max(0, 40 - b.modernLogSamples.serveLog.length)));
      for (const sl of s.serveLog) {
        // Normaliza direção: game.js usa 'BODY'/'WIDE'/'T', bucket usa 'Body'/'Wide'/'T'
        const dir = sl.dir === 'BODY' ? 'Body' : sl.dir === 'WIDE' ? 'Wide' : sl.dir;
        if (sl.isFirst) {
          if (sl.kmh > 0) {
            if (sl.kmh < b.s1KmhMin) b.s1KmhMin = sl.kmh;
            if (sl.kmh > b.s1KmhMax) b.s1KmhMax = sl.kmh;
          }
          if (dir && dir in b.serve1Dir) b.serve1Dir[dir]++;
        } else {
          if (sl.kmh > 0) {
            if (sl.kmh < b.s2KmhMin) b.s2KmhMin = sl.kmh;
            if (sl.kmh > b.s2KmhMax) b.s2KmhMax = sl.kmh;
          }
          if (dir && dir in b.serve2Dir) b.serve2Dir[dir]++;
        }
      }
    }
    for (const key of ['returnLog', 'receptionLog', 'contactLog', 'shotLog', 'intentLog']) {
      if (Array.isArray(s[key])) {
        b.modernLogs[key] += s[key].length;
        b.modernLogSamples[key].push(...s[key].slice(0, Math.max(0, 40 - b.modernLogSamples[key].length)));
      }
    }

    if (s.byType) for (const [k,v] of Object.entries(s.byType)) b.byType[k] = (b.byType[k]??0)+v;
    for (const field of ['pointWinsByType', 'byTypeQSum', 'byTypeQCnt', 'byTypeKmhSum', 'byTypeKmhCnt']) {
      if (s[field]) for (const [k, v] of Object.entries(s[field])) b[field][k] = (b[field][k] ?? 0) + v;
    }
    b.attackShots += s.attackShots ?? 0;
    b.defenseShots += s.defenseShots ?? 0;
    b.attackPointsPlayed += s.attackPointsPlayed ?? 0;
    b.attackPointsWon += s.attackPointsWon ?? 0;
    b.defensePointsPlayed += s.defensePointsPlayed ?? 0;
    b.defensePointsWon += s.defensePointsWon ?? 0;
    const nS = sW+sL;
    b.setMap[nS] = (b.setMap[nS]??0)+1;
    if (extra) b.totalPts += extra.points ?? 0;
  }

  function computeAvg(b, n) {
    const d  = n || 1;
    const rc = b.rallyCnt || 1;
    const s1DT = b.serve1Dir.T + b.serve1Dir.Body + b.serve1Dir.Wide || 1;
    const s2DT = b.serve2Dir.T + b.serve2Dir.Body + b.serve2Dir.Wide || 1;
    return {
      wins: b.wins, winPct: b.wins/d,
      setsWon: b.setsWon/d, setsLost: b.setsLost/d,
      setsPerMatch: (b.setsWon+b.setsLost)/d,
      aces: b.aces/d, df: b.df/d,
      winners: b.winners/d, ue: b.ue/d, fe: b.fe/d,
      s1Pct:   b.s1Tot>0  ? b.s1In/b.s1Tot   : null,
      s2Pct:   b.s2Tot>0  ? b.s2In/b.s2Tot   : null,
      s1Kmh:   b.s1KmhSum/d,   s2Kmh:  b.s2KmhSum/d,
      s1KmhMin: b.s1KmhMin<9999 ? b.s1KmhMin : null,
      s1KmhMax: b.s1KmhMax>0    ? b.s1KmhMax : null,
      s2KmhMin: b.s2KmhMin<9999 ? b.s2KmhMin : null,
      s2KmhMax: b.s2KmhMax>0    ? b.s2KmhMax : null,
      serve1Dir: { T:b.serve1Dir.T/s1DT, Body:b.serve1Dir.Body/s1DT, Wide:b.serve1Dir.Wide/s1DT },
      serve2Dir: { T:b.serve2Dir.T/s2DT, Body:b.serve2Dir.Body/s2DT, Wide:b.serve2Dir.Wide/s2DT },
      serve1DirRaw: {...b.serve1Dir}, serve2DirRaw: {...b.serve2Dir},
      netApp: b.netApp/d,
      netPct: b.netApp>0  ? b.netWon/b.netApp  : null,
      srvPct: (b.pwS+b.plS)>0   ? b.pwS/(b.pwS+b.plS) : null,
      retPct: (b.pwR+b.plR)>0   ? b.pwR/(b.pwR+b.plR) : null,
      holdPct:  b.gSrv>0 ? b.gHeld/b.gSrv  : null,
      breakPct: b.gRet>0 ? b.gConv/b.gRet  : null,
      s1WinSrvPct: (b.s1WonPts+b.s1LostPts)>0 ? b.s1WonPts/(b.s1WonPts+b.s1LostPts) : null,
      s2WinSrvPct: (b.s2WonPts+b.s2LostPts)>0 ? b.s2WonPts/(b.s2WonPts+b.s2LostPts) : null,
      avgQ:    b.qCnt>0   ? b.qSum/b.qCnt : null,
      avgRally: b.rallyCnt>0 ? b.rallyTot/b.rallyCnt : null,
      rallyMax: b.rallyMax,
      rallyBuckets: b.rallyBuckets,
      rallyBucketsPct: b.rallyBuckets.map(v => v/rc),
      totalPts: b.totalPts/d,
      byType: b.byType, setMap: b.setMap,
      pointWinsByType: b.pointWinsByType,
      byTypeQAvg: Object.fromEntries(Object.keys(b.byTypeQSum).map(k => [k, b.byTypeQCnt[k] > 0 ? b.byTypeQSum[k] / b.byTypeQCnt[k] : null])),
      byTypeKmhAvg: Object.fromEntries(Object.keys(b.byTypeKmhSum).map(k => [k, b.byTypeKmhCnt[k] > 0 ? b.byTypeKmhSum[k] / b.byTypeKmhCnt[k] : null])),
      tacticalState: {
        attackShots: b.attackShots,
        defenseShots: b.defenseShots,
        attackPointsPlayed: b.attackPointsPlayed,
        attackPointsWon: b.attackPointsWon,
        attackWinPct: b.attackPointsPlayed > 0 ? b.attackPointsWon / b.attackPointsPlayed : null,
        defensePointsPlayed: b.defensePointsPlayed,
        defensePointsWon: b.defensePointsWon,
        defenseWinPct: b.defensePointsPlayed > 0 ? b.defensePointsWon / b.defensePointsPlayed : null,
      },
      modernLogs: { ...b.modernLogs },
      modernLogSamples: Object.fromEntries(Object.entries(b.modernLogSamples).map(([k, v]) => [k, v.slice(0, 40)])),
    };
  }

  /* ── run ─────────────────────────────────────────────────── */
  const run = async () => {
    abortRef.current = false;
    setRunning(true); setDone(0); setResults(null);
    feedRef.current = []; setFeed([]);
    matchesRef.current = [];
    const bA = empty(), bB = empty();
    const scoreMap = {};

    for (let i = 0; i < simCount; i++) {
      if (abortRef.current) break;
      try {
        const r   = simulateMatchHeadless({ namedKey: keyA }, { namedKey: keyB }, courtKey, bestOf);
        const [sA, sB] = r.sets;
        const wonA = sA > sB;
        const extra = { points: r.points };
        addBucket(bA, r.stats.a,  wonA, sA, sB, extra);
        addBucket(bB, r.stats.b, !wonA, sB, sA, extra);
        const sk = `${sA}-${sB}`;
        scoreMap[sk] = (scoreMap[sk]??0)+1;
        const entry = {
          n: i+1, winnerName: r.winner?.name ?? keyA,
          sA, sB, score: sk,
          setDetail: r.setsDetail?.map(([a,b])=>`${a}-${b}`).join(' | ')??'',
          aQ: r.stats.a.avgQuality, bQ: r.stats.b.avgQuality,
        };
        matchesRef.current.push({
          match: i + 1,
          winner: r.winner?.name ?? (wonA ? nameA : nameB),
          winnerSide: wonA ? 'A' : 'B',
          score: sk,
          sets: { A: sA, B: sB },
          setDetail: r.setsDetail ?? [],
          setDetailLabel: entry.setDetail,
          totalPoints: r.points ?? null,
          qualityEdgePct: round(((r.stats.a.avgQuality ?? 0) - (r.stats.b.avgQuality ?? 0)) * 100, 2),
          A: compactStats(r.stats.a),
          B: compactStats(r.stats.b),
        });
        feedRef.current = [entry, ...feedRef.current].slice(0, 60);
        setFeed([...feedRef.current]);
      } catch(e) { console.error(e); }
      setDone(i+1);
      await new Promise(res => setTimeout(res, 0));
    }

    const ran = bA.wins + bB.wins;
    setResults({
      ran, scoreMap,
      a: computeAvg(bA, ran),
      b: computeAvg(bB, ran),
      config: {
        keyA, keyB, courtKey, bestOf, simCount: ran,
        nameA: pA?.name??keyA, nameB: pB?.name??keyB,
        surface, court: COURT_NAMES[courtKey]??courtKey,
        ovrA: pA ? overallRating(pA.attrs ?? {}) : null,
        ovrB: pB ? overallRating(pB.attrs ?? {}) : null,
        styleA: pA?.styleId??null, styleB: pB?.styleId??null,
      },
    });
    setRunning(false); setFeed([]);
  };

  /* ── EXPORT ──────────────────────────────────────────────── */
  function exportData() {
    if (!results) return;
    const { a, b, ran, scoreMap, config } = results;
    const profileA = playerSnapshot(pA);
    const profileB = playerSnapshot(pB);

    const fmtPlayer = (d, name) => ({
      name,
      serve: {
        s1Pct:      d.s1Pct  != null ? +(d.s1Pct*100).toFixed(2)  : null,
        s2Pct:      d.s2Pct  != null ? +(d.s2Pct*100).toFixed(2)  : null,
        s1KmhAvg:   +d.s1Kmh.toFixed(1),      s2KmhAvg:   +d.s2Kmh.toFixed(1),
        s1KmhMin:   d.s1KmhMin,                s1KmhMax:   d.s1KmhMax,
        s2KmhMin:   d.s2KmhMin,                s2KmhMax:   d.s2KmhMax,
        acesPerMatch:  +d.aces.toFixed(2),
        dfPerMatch:    +d.df.toFixed(2),
        holdPct:       d.holdPct    != null ? +(d.holdPct*100).toFixed(2)    : null,
        ptsWonOnS1:    d.s1WinSrvPct!= null ? +(d.s1WinSrvPct*100).toFixed(2): null,
        ptsWonOnS2:    d.s2WinSrvPct!= null ? +(d.s2WinSrvPct*100).toFixed(2): null,
        ptsWonServing: d.srvPct     != null ? +(d.srvPct*100).toFixed(2)     : null,
        dir1st: { T:+(d.serve1Dir.T*100).toFixed(1), Body:+(d.serve1Dir.Body*100).toFixed(1), Wide:+(d.serve1Dir.Wide*100).toFixed(1) },
        dir2nd: { T:+(d.serve2Dir.T*100).toFixed(1), Body:+(d.serve2Dir.Body*100).toFixed(1), Wide:+(d.serve2Dir.Wide*100).toFixed(1) },
      },
      returnAndBreak: {
        breakPct:        d.breakPct  != null ? +(d.breakPct*100).toFixed(2)  : null,
        ptsWonReturning: d.retPct    != null ? +(d.retPct*100).toFixed(2)    : null,
      },
      rally: {
        winnersPerMatch:     +d.winners.toFixed(2),
        uePerMatch:          +d.ue.toFixed(2),
        fePerMatch:          +d.fe.toFixed(2),
        wueRatio:            d.ue>0 ? +(d.winners/d.ue).toFixed(3) : null,
        avgQuality:          d.avgQ != null ? +(d.avgQ*100).toFixed(2) : null,
        avgRallyLength:      d.avgRally != null ? +d.avgRally.toFixed(3) : null,
        maxRallyObserved:    d.rallyMax,
        netApproachPerMatch: +d.netApp.toFixed(2),
        netWinPct:           d.netPct != null ? +(d.netPct*100).toFixed(2) : null,
        rallyDistribution_pct: {
          '1-4':   +(d.rallyBucketsPct[0]*100).toFixed(2),
          '5-9':   +(d.rallyBucketsPct[1]*100).toFixed(2),
          '10-15': +(d.rallyBucketsPct[2]*100).toFixed(2),
          '16+':   +(d.rallyBucketsPct[3]*100).toFixed(2),
        },
        rallyBucketsCounts: {
          '1-4': d.rallyBuckets[0], '5-9': d.rallyBuckets[1],
          '10-15': d.rallyBuckets[2], '16+': d.rallyBuckets[3],
        },
      },
      setsWonAvg:  +d.setsWon.toFixed(3),
      setsLostAvg: +d.setsLost.toFixed(3),
      shotTypeCounts: {...d.byType},
      shotTypeWins: {...d.pointWinsByType},
      shotTypeQualityAvg: Object.fromEntries(Object.entries(d.byTypeQAvg ?? {}).map(([k, v]) => [k, v != null ? +(v * 100).toFixed(2) : null])),
      shotTypeKmhAvg: Object.fromEntries(Object.entries(d.byTypeKmhAvg ?? {}).map(([k, v]) => [k, v != null ? +v.toFixed(1) : null])),
      tacticalState: d.tacticalState ? {
        attackShots: d.tacticalState.attackShots,
        defenseShots: d.tacticalState.defenseShots,
        attackPointsPlayed: d.tacticalState.attackPointsPlayed,
        attackPointsWon: d.tacticalState.attackPointsWon,
        attackWinPct: d.tacticalState.attackWinPct != null ? +(d.tacticalState.attackWinPct * 100).toFixed(2) : null,
        defensePointsPlayed: d.tacticalState.defensePointsPlayed,
        defensePointsWon: d.tacticalState.defensePointsWon,
        defenseWinPct: d.tacticalState.defenseWinPct != null ? +(d.tacticalState.defenseWinPct * 100).toFixed(2) : null,
      } : null,
      modernShotTelemetry: {
        availableLogs: {
          ...(d.modernLogs ?? {}),
        },
        samples: d.modernLogSamples ?? {},
      },
    });

    const playerAReport = fmtPlayer(a, config.nameA);
    const playerBReport = fmtPlayer(b, config.nameB);

    const attrDiffs = (() => {
      const attrsA = profileA?.attrs ?? {};
      const attrsB = profileB?.attrs ?? {};
      return Object.keys({ ...attrsA, ...attrsB })
        .map(key => ({ attr: key, A: attrsA[key] ?? null, B: attrsB[key] ?? null, edgeA: (attrsA[key] ?? 0) - (attrsB[key] ?? 0) }))
        .sort((x, y) => Math.abs(y.edgeA) - Math.abs(x.edgeA));
    })();

    const tacticalUsage = {
      A: {
        netApproachesPerMatch: playerAReport.rally.netApproachPerMatch,
        netWinPct: playerAReport.rally.netWinPct,
        sliceSharePct: (() => {
          const total = Object.values(a.byType).reduce((s, v) => s + v, 0) || 1;
          return +(((a.byType.SLICE ?? 0) / total) * 100).toFixed(2);
        })(),
        topspinSharePct: (() => {
          const total = Object.values(a.byType).reduce((s, v) => s + v, 0) || 1;
          return +(((a.byType.TOPSPIN ?? 0) / total) * 100).toFixed(2);
        })(),
      },
      B: {
        netApproachesPerMatch: playerBReport.rally.netApproachPerMatch,
        netWinPct: playerBReport.rally.netWinPct,
        sliceSharePct: (() => {
          const total = Object.values(b.byType).reduce((s, v) => s + v, 0) || 1;
          return +(((b.byType.SLICE ?? 0) / total) * 100).toFixed(2);
        })(),
        topspinSharePct: (() => {
          const total = Object.values(b.byType).reduce((s, v) => s + v, 0) || 1;
          return +(((b.byType.TOPSPIN ?? 0) / total) * 100).toFixed(2);
        })(),
      },
    };

    const qualityWinnerParadox = (() => {
      const qualityEdgeA = (a.avgQ ?? 0) - (b.avgQ ?? 0);
      const winEdgeA = a.winPct - b.winPct;
      return {
        exists: Math.sign(qualityEdgeA) !== 0 && Math.sign(winEdgeA) !== 0 && Math.sign(qualityEdgeA) !== Math.sign(winEdgeA),
        qualityEdgePctA: +(qualityEdgeA * 100).toFixed(2),
        winEdgePctA: +(winEdgeA * 100).toFixed(2),
      };
    })();

    const diagnosticFlags = [];
    const addFlag = (severity, code, message, evidence = {}) => diagnosticFlags.push({ severity, code, message, evidence });
    if (ran < 50) addFlag('INFO', 'LOW_SAMPLE', 'Amostra pequena. Use 50+ para tendência e 100/200 para calibração fina.', { matchCount: ran });
    if (a.winPct === 0 || b.winPct === 0) addFlag('CRITICAL', 'TOTAL_SWEEP', 'Um jogador venceu 100% das partidas. Em duelo de elite isso costuma indicar matchup extremo ou desbalanceamento.', { winRateA: pct100(a.winPct), winRateB: pct100(b.winPct) });
    if (qualityWinnerParadox.exists) addFlag('CRITICAL', 'QUALITY_WINNER_PARADOX', 'O jogador com melhor qualidade média agregada está perdendo o confronto. Isso sugere que outra camada está sobrepondo a qualidade do ponto.', qualityWinnerParadox);
    if ((a.netApp / Math.max(1, ran)) > 30 && (a.netWon / Math.max(1, a.netApp)) < 0.5) addFlag('HIGH', 'A_NET_SUICIDE', `${config.nameA} está subindo demais à rede e vencendo pouco. Verificar netGame/prefs e decisão tática por superfície.`, { netApproachesPerMatch: tacticalUsage.A.netApproachesPerMatch, netWinPct: tacticalUsage.A.netWinPct, playerPref: profileA?.prefs?.netGame });
    if ((b.netApp / Math.max(1, ran)) > 30 && (b.netWon / Math.max(1, b.netApp)) < 0.5) addFlag('HIGH', 'B_NET_SUICIDE', `${config.nameB} está subindo demais à rede e vencendo pouco. Verificar netGame/prefs e decisão tática por superfície.`, { netApproachesPerMatch: tacticalUsage.B.netApproachesPerMatch, netWinPct: tacticalUsage.B.netWinPct, playerPref: profileB?.prefs?.netGame });
    if ((a.s2WonPts + a.s2LostPts) > 0 && (a.s2WonPts / (a.s2WonPts + a.s2LostPts)) > 0.65) addFlag('MEDIUM', 'A_SECOND_SERVE_TOO_SAFE', `${config.nameA} está vencendo pontos demais com segundo saque.`, { ptsWonOnS2: playerAReport.serve.ptsWonOnS2, serveAttrs: { saqueForca: profileA?.attrs?.saqueForca, saquePrecisao: profileA?.attrs?.saquePrecisao } });
    if ((b.s2WonPts + b.s2LostPts) > 0 && (b.s2WonPts / (b.s2WonPts + b.s2LostPts)) > 0.65) addFlag('MEDIUM', 'B_SECOND_SERVE_TOO_SAFE', `${config.nameB} está vencendo pontos demais com segundo saque.`, { ptsWonOnS2: playerBReport.serve.ptsWonOnS2, serveAttrs: { saqueForca: profileB?.attrs?.saqueForca, saquePrecisao: profileB?.attrs?.saquePrecisao } });
    if ((tacticalUsage.A.sliceSharePct + tacticalUsage.B.sliceSharePct) / 2 > 35 && String(config.surface).toLowerCase().includes('clay')) addFlag('MEDIUM', 'CLAY_SLICE_OVERUSE', 'Uso de slice muito alto para saibro. Pode estar distorcendo rallies e premiando perfis defensivos além do realista.', { sliceShareA: tacticalUsage.A.sliceSharePct, sliceShareB: tacticalUsage.B.sliceSharePct });
    if (playerAReport.rally.uePerMatch < 5 || playerBReport.rally.uePerMatch < 5) addFlag('HIGH', 'UNFORCED_ERRORS_TOO_LOW', 'Erros não-forçados por partida estão muito baixos. Isso infla W/UE e pode esconder a verdadeira troca risco/consistência.', { uePerMatchA: playerAReport.rally.uePerMatch, uePerMatchB: playerBReport.rally.uePerMatch });
    for (const [side, d, report] of [['A', a, playerAReport], ['B', b, playerBReport]]) {
      const missing = ['returnLog', 'receptionLog', 'contactLog', 'shotLog', 'intentLog'].filter(k => !(d.modernLogs?.[k] > 0));
      if (missing.length) addFlag('INFO', `${side}_MISSING_MODERN_SHOT_LOGS`, `O Headless ainda nao exportou logs modernos de ${missing.join(', ')} para o jogador ${side}. Para calibrar recepcao/contato/primeira bola com precisao, esses eventos precisam ser instrumentados no motor.`, { missing, availableLogs: report.modernShotTelemetry.availableLogs });
    }

    const payload = {
      _meta: {
        version: '3.0-forensic', exportedAt: new Date().toISOString(),
        engine: 'HeadlessMatchEngine · Tennis Universe',
        note: 'Arquivo forense para calibragem: inclui perfis, agregados, flags automáticas e match-by-match completo.',
      },
      config,
      playersProfile: {
        A: profileA,
        B: profileB,
        attributeDiffsSortedByImpact: attrDiffs,
      },
      confidence: ran >= 200 ? 'HIGH' : ran >= 100 ? 'MODERATE' : ran >= 50 ? 'LOW' : 'VERY_LOW',
      matchCount: ran,
      winRate: {
        A: { player:config.nameA, wins:a.wins, pct:+(a.winPct*100).toFixed(2) },
        B: { player:config.nameB, wins:b.wins, pct:+(b.winPct*100).toFixed(2) },
      },
      match: {
        avgTotalPointsPerMatch: +a.totalPts.toFixed(2),
        avgSetsPerMatch:        +((a.setsPerMatch+b.setsPerMatch)/2).toFixed(3),
        setDistribution:        scoreMap,
        avgRallyLength:         +(((a.avgRally??0) + (b.avgRally??0))/2).toFixed(3),  // [FIX v1] era (a??0 + b??0)/2 — precedência errada de ?? vs +
        maxRallyObserved:       Math.max(a.rallyMax, b.rallyMax),
        rallyDistributionCombined_pct: (() => {
          const tot = (a.rallyBuckets[0]+a.rallyBuckets[1]+a.rallyBuckets[2]+a.rallyBuckets[3]+
                       b.rallyBuckets[0]+b.rallyBuckets[1]+b.rallyBuckets[2]+b.rallyBuckets[3]) || 1;
          const bk  = a.rallyBuckets.map((v,i)=>v+b.rallyBuckets[i]);
          return { '1-4':+(bk[0]/tot*100).toFixed(2), '5-9':+(bk[1]/tot*100).toFixed(2),
                   '10-15':+(bk[2]/tot*100).toFixed(2), '16+':+(bk[3]/tot*100).toFixed(2) };
        })(),
      },
      shotDistributionCombined_pct: (() => {
        const m = {};
        for (const k of Object.keys({...a.byType,...b.byType}))
          m[k] = (a.byType[k]??0) + (b.byType[k]??0);
        const tot = Object.values(m).reduce((s,v)=>s+v,0)||1;
        return Object.fromEntries(Object.entries(m).map(([k,v])=>[k,+(v/tot*100).toFixed(2)]));
      })(),
      players: {
        A: playerAReport,
        B: playerBReport,
      },
      forensic: {
        tacticalUsage,
        shotTaxonomy: {
          legacyByTypeWarning: 'byType ainda mistura familias antigas de golpe com mecanicas novas. Use modernShotTelemetry quando returnLog/receptionLog/contactLog/shotLog estiverem disponiveis.',
          combinedShotDistributionPct: null,
          modernLogCoverage: {
            A: playerAReport.modernShotTelemetry.availableLogs,
            B: playerBReport.modernShotTelemetry.availableLogs,
          },
          desiredNextInstrumentation: [
            'returnLog: tipo de recepcao de saque, profundidade, direcao, agressividade, erro/neutralizacao',
            'contactLog: asa usada, timing, equilibrio, altura da bola, pressao recebida',
            'shotLog: golpe escolhido, intencao, alvo, risco, qualidade prevista e resultado',
            'firstBallAfterServe: quem iniciou o ponto depois da devolucao e com qual vantagem',
            'decisionLog: por que subiu a rede, por que usou slice/topspin/drop/lob',
          ],
        },
        qualityWinnerParadox,
        diagnosticFlags,
        quickRead: diagnosticFlags.length
          ? diagnosticFlags.slice(0, 5).map(f => `${f.severity}: ${f.code} — ${f.message}`)
          : ['Nenhuma anomalia óbvia detectada nos limites atuais.'],
      },
      benchmarksATP: Object.fromEntries(Object.entries(ATP).map(([k,v])=>[k,v])),
      matches: matchesRef.current,
      rawFeed: feedRef.current.map(e => ({
        match: e.n, winner: e.winnerName, score: e.score,
        setDetail: e.setDetail,
        qA: e.aQ ? +(e.aQ*100).toFixed(1) : null,
        qB: e.bQ ? +(e.bQ*100).toFixed(1) : null,
      })),
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type:'application/json' });
    const url  = URL.createObjectURL(blob);
    const a2   = document.createElement('a');
    a2.href = url;
    a2.download = `${config.nameA.replace(/\s+/g,'_')}_vs_${config.nameB.replace(/\s+/g,'_')}_${ran}sim_${config.court.replace(/\s+/g,'_')}.json`;
    a2.click();
    URL.revokeObjectURL(url);
  }

  /* ── display ─────────────────────────────────────────────── */
  const nameA = pA?.name ?? keyA;
  const nameB = pB?.name ?? keyB;
  const res   = results;

  const conf = !res ? null
    : res.ran >= 200 ? { lbl:'✓ ALTA CONFIANÇA (≥200)', c:RG.green }
    : res.ran >= 100 ? { lbl:'⚡ CONFIANÇA MODERADA',   c:RG.yellow }
    : res.ran >=  50 ? { lbl:'⚠ BAIXA — USE 100+',     c:RG.clayLight }
    :                  { lbl:'⚠ MUITO BAIXA',           c:RG.red };

  const shots = res ? (() => {
    const m = {};
    for (const k of Object.keys({...res.a.byType,...res.b.byType}))
      m[k] = (res.a.byType[k]??0)+(res.b.byType[k]??0);
    const tot = Object.values(m).reduce((s,v)=>s+v,0);
    return Object.entries(m).filter(([,v])=>v>0).sort(([,a],[,b])=>b-a)
      .map(([k,v])=>({k,v,p:tot>0?v/tot:0}));
  })() : [];

  const scoreList = res ? Object.entries(res.scoreMap).sort(([,a],[,b])=>b-a) : [];
  const maxSC     = scoreList[0]?.[1] ?? 1;

  const RALLY_LABELS = ['1–4 bolas','5–9 bolas','10–15 bolas','16+ bolas'];
  const RALLY_COLORS = [RG.clay, RG.yellow, RG.green, RG.blue];

  return (
    <>
      {running && (
        <Overlay nameA={nameA} nameB={nameB} courtName={COURT_NAMES[courtKey]??courtKey}
          bestOf={bestOf} simCount={simCount} done={done} feed={feed} />
      )}

      <div style={{ width:'100vw', minHeight:'100vh', background:RG.bg, fontFamily:RG.body }}>
        <style>{CSS}</style>
        <div style={{ position:'fixed', inset:0, pointerEvents:'none', opacity:.022,
          backgroundImage:`linear-gradient(rgba(196,87,42,.8) 1px,transparent 1px),linear-gradient(90deg,rgba(196,87,42,.8) 1px,transparent 1px)`,
          backgroundSize:'60px 60px' }} />

        {/* Top bar */}
        <div style={{ position:'sticky', top:0, zIndex:40, background:'rgba(15,34,24,.92)', backdropFilter:'blur(12px)', borderBottom:`2px solid ${RG.clay}`, padding:'0 32px', display:'flex', alignItems:'center', justifyContent:'space-between', height:52 }}>
          <span style={{ fontFamily:RG.display, fontSize:13, fontWeight:600, letterSpacing:'.3em', color:RG.clay, textTransform:'uppercase' }}>Simulador de Partidas</span>
          <button onClick={onBack}
            style={{ background:'none', border:`1px solid ${RG.border}`, color:RG.textDim, fontFamily:RG.display, fontSize:12, fontWeight:600, letterSpacing:'2px', padding:'5px 16px', cursor:'pointer', textTransform:'uppercase' }}
            onMouseOver={e=>{e.currentTarget.style.background=RG.bgPanel;e.currentTarget.style.color=RG.white;}}
            onMouseOut={e=>{e.currentTarget.style.background='none';e.currentTarget.style.color=RG.textDim;}}>
            ← Menu
          </button>
        </div>

        <div style={{ maxWidth:1400, margin:'0 auto', padding:'28px 28px 80px' }}>
          <div style={{ marginBottom:20 }}>
            <div style={{ fontFamily:RG.display, fontWeight:700, fontSize:'clamp(24px,3vw,38px)', color:RG.white, lineHeight:1, marginBottom:4 }}>
              SIMULADOR <span style={{ color:RG.clay }}>DE PARTIDAS</span>
            </div>
            <div style={{ fontFamily:RG.mono, fontSize:9, letterSpacing:'.3em', color:RG.textFaint }}>
              ENGINE HEADLESS · FÍSICA COMPLETA · ANALYTICS + BENCHMARKS ATP
            </div>
          </div>
          <div style={{ height:2, background:`linear-gradient(90deg,${RG.clay},transparent)`, marginBottom:24 }} />

          <div style={{ display:'grid', gridTemplateColumns:'272px 1fr', gap:16, alignItems:'start' }}>

            {/* ── LEFT: CONFIG ──────────────────────────────────── */}
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>

              <div className="sc">
                <div className="slbl">Jogador A</div>
                <select className="ssel" value={keyA} onChange={e=>setKeyA(e.target.value)} disabled={running} style={{ marginBottom:8 }}>
                  {NAMED_PLAYER_KEYS.map(k=><option key={k} value={k}>{NAMED_PLAYERS[k]?.name??k}</option>)}
                </select>
                <div style={{ fontFamily:RG.mono, fontSize:10, color:`${RG.clay}99` }}>{pA ? ovrTier(overallRating(pA)).grade : '—'} · {pA?.styleId??'—'}</div>
              </div>

              <div style={{ textAlign:'center' }}>
                <span style={{ fontFamily:RG.display, fontSize:18, fontWeight:700, background:`linear-gradient(90deg,${RG.clay},${RG.blue})`, WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', letterSpacing:'.15em' }}>VS</span>
              </div>

              <div className="sc">
                <div className="slbl">Jogador B</div>
                <select className="ssel" value={keyB} onChange={e=>setKeyB(e.target.value)} disabled={running} style={{ marginBottom:8 }}>
                  {NAMED_PLAYER_KEYS.map(k=><option key={k} value={k}>{NAMED_PLAYERS[k]?.name??k}</option>)}
                </select>
                <div style={{ fontFamily:RG.mono, fontSize:10, color:`${RG.blue}99` }}>{pB ? ovrTier(overallRating(pB)).grade : '—'} · {pB?.styleId??'—'}</div>
              </div>

              <div className="sc">
                <div className="slbl">Quadra</div>
                <select className="ssel" value={courtKey} onChange={e=>setCourtKey(e.target.value)} disabled={running} style={{ marginBottom:6 }}>
                  {COURT_KEYS.map(k=><option key={k} value={k}>{COURT_NAMES[k]??k}</option>)}
                </select>
                <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                  <div style={{ width:10, height:10, background:SURFACE_COLORS[surface]??RG.clay, borderRadius:2 }} />
                  <span style={{ fontFamily:RG.mono, fontSize:9, letterSpacing:'.2em', color:RG.textFaint, textTransform:'uppercase' }}>{surface}</span>
                </div>
              </div>

              <div className="sc">
                <div className="slbl">Melhor de</div>
                <div style={{ display:'flex', gap:6 }}>
                  {[3,5].map(n=><button key={n} className={`sbtn ${bestOf===n?'on':''}`} onClick={()=>setBestOf(n)} disabled={running}>BO{n}</button>)}
                </div>
              </div>

              <div className="sc">
                <div className="slbl">Simulações</div>
                <div style={{ display:'flex', gap:6 }}>
                  {SIM_COUNTS.map(n=><button key={n} className={`sbtn ${simCount===n?'on':''}`} onClick={()=>setSimCount(n)} disabled={running}>{n}</button>)}
                </div>
              </div>

              <button className="runbtn" onClick={run} disabled={running||keyA===keyB}>
                ▶ EXECUTAR {simCount} PARTIDAS
              </button>
              {keyA===keyB && <div style={{ fontFamily:RG.mono, fontSize:9, letterSpacing:'.12em', color:RG.red, textAlign:'center' }}>⚠ JOGADORES DIFERENTES</div>}

              {res && (
                <button className="expbtn" onClick={exportData}>⬇ EXPORTAR JSON</button>
              )}

              {res && (
                <div className="sc" style={{ borderColor:'rgba(0,212,255,.15)' }}>
                  <div className="slbl">Resumo rápido</div>
                  <SR label="Partidas"        val={res.ran} />
                  <SR label="Pts/partida"     val={f1(res.a.totalPts)} bench={ATP.pts} benchVal={res.a.totalPts} />
                  <SR label="Sets/partida"    val={f2((res.a.setsPerMatch+res.b.setsPerMatch)/2)} />
                  <SR label="Rally máx geral" val={f0(Math.max(res.a.rallyMax, res.b.rallyMax))}
                    color={Math.max(res.a.rallyMax,res.b.rallyMax)>50?RG.red:RG.white} />
                </div>
              )}
            </div>

            {/* ── RIGHT: RESULTS ────────────────────────────────── */}
            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

              {!res && (
                <div className="sc" style={{ padding:'72px 24px', textAlign:'center' }}>
                  <div style={{ fontSize:46, marginBottom:18, animation:'s-spin 10s linear infinite', display:'inline-block' }}>🎾</div>
                  <div style={{ fontFamily:RG.mono, fontSize:10, letterSpacing:'.25em', color:RG.textFaint, lineHeight:2.2 }}>
                    CONFIGURE O MATCHUP<br/>E EXECUTE AS SIMULAÇÕES<br/>
                    <span style={{ fontSize:8, opacity:.5 }}>analytics completos + benchmarks ATP + export JSON</span>
                  </div>
                </div>
              )}

              {res && <>

                {/* WIN RATE */}
                <div className="sc">
                  <div className="slbl">{res.ran} partidas · {COURT_NAMES[courtKey]} · BO{bestOf} · <span style={{ color:conf.c }}>{conf.lbl}</span></div>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end', marginBottom:14 }}>
                    {[{n:nameA,d:res.a,c:RG.clay,cfg:'ovrA'},{n:nameB,d:res.b,c:RG.blue,cfg:'ovrB'}].map(({n,d,c,cfg},i)=>(
                      <div key={n} style={{ textAlign:i===1?'right':'left' }}>
                        <div style={{ fontFamily:RG.display, fontSize:44, fontWeight:700, color:c, lineHeight:1 }}>{(d.winPct*100).toFixed(1)}%</div>
                        <div style={{ fontFamily:RG.body, fontSize:13, color:RG.textDim, marginTop:2 }}>{n}</div>
                        <div style={{ fontFamily:RG.mono, fontSize:9, color:RG.textFaint }}>
                          {d.wins}V · {res.config[i===0?'styleA':'styleB']}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div style={{ display:'flex', height:12, borderRadius:99, overflow:'hidden', background:'rgba(255,255,255,.04)', marginBottom:6 }}>
                    <div style={{ width:`${(res.a.winPct*100).toFixed(1)}%`, background:`linear-gradient(to right,${RG.clay}88,${RG.clay})`, transition:'width .8s' }} />
                    <div style={{ flex:1, background:`linear-gradient(to left,${RG.blue}88,${RG.blue})` }} />
                  </div>
                </div>

                {/* DINMICA */}
                <div className="sec-title">📊 Dinâmica da Partida</div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:14 }}>
                  <div className="sc">
                    <div className="slbl">Pontos Totais</div>
                    <SR label="Pts/partida (A)" val={f1(res.a.totalPts)} bench={ATP.pts} benchVal={res.a.totalPts} />
                    <SR label="Pts/partida (B)" val={f1(res.b.totalPts)} bench={ATP.pts} benchVal={res.b.totalPts} />
                  </div>
                  <div className="sc">
                    <div className="slbl">Sets</div>
                    <SR label="Sets/partida" val={f2((res.a.setsPerMatch+res.b.setsPerMatch)/2)} />
                    {Object.entries(res.a.setMap).sort(([a],[b])=>+a-+b).map(([n,c])=>(
                      <SR key={n} label={`Em ${n} sets`} val={`${c}× (${pct(c,res.ran)}%)`} color={RG.textDim} />
                    ))}
                  </div>
                  <div className="sc">
                    <div className="slbl">Q Médio de Rally</div>
                    {[{n:nameA,d:res.a,c:RG.clay},{n:nameB,d:res.b,c:RG.blue}].map(({n,d,c})=>(
                      <div key={n} style={{ marginBottom:10 }}>
                        <div style={{ fontFamily:RG.mono, fontSize:9, color:`${c}99`, marginBottom:4 }}>{n.split(' ').pop()}</div>
                        <QB value={d.avgQ} bench={ATP.quality} />
                      </div>
                    ))}
                  </div>
                </div>

                {/* RALLY */}
                <div className="sec-title">🏃 Rally Analytics</div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
                  <div className="sc">
                    <div className="slbl">Comprimento de Rally</div>
                    <SR label="Rally médio (A)" val={f2(res.a.avgRally)} bench={ATP.rally} benchVal={res.a.avgRally} />
                    <SR label="Rally médio (B)" val={f2(res.b.avgRally)} bench={ATP.rally} benchVal={res.b.avgRally} />
                    <div className="div-sep" />
                    <SR label="Rally máx (A)" val={f0(res.a.rallyMax)}
                      color={res.a.rallyMax>50?RG.red:res.a.rallyMax>30?RG.yellow:RG.white}
                      sub={res.a.rallyMax>50?'⚠ ANÔMALO: >50 indica bug físico':res.a.rallyMax>30?'Acima do usual':''} />
                    <SR label="Rally máx (B)" val={f0(res.b.rallyMax)}
                      color={res.b.rallyMax>50?RG.red:res.b.rallyMax>30?RG.yellow:RG.white}
                      sub={res.b.rallyMax>50?'⚠ ANÔMALO: >50 indica bug físico':res.b.rallyMax>30?'Acima do usual':''} />
                  </div>
                  <div className="sc">
                    <div className="slbl">Distribuição de Rally</div>
                    {RALLY_LABELS.map((lbl,i) => {
                      const pA2 = res.a.rallyBucketsPct[i];
                      const pB2 = res.b.rallyBucketsPct[i];
                      const avg = (pA2+pB2)/2;
                      return (
                        <div key={lbl} style={{ marginBottom:10 }}>
                          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:2 }}>
                            <span style={{ fontFamily:RG.display, fontSize:12, fontWeight:600, color:RALLY_COLORS[i] }}>{lbl}</span>
                            <span style={{ fontFamily:RG.mono, fontSize:10, color:RG.white }}>{(avg*100).toFixed(1)}%</span>
                          </div>
                          <BarPct pct={avg*100} color={RALLY_COLORS[i]} h={6} />
                          <div style={{ fontFamily:RG.mono, fontSize:8, color:'rgba(255,255,255,.22)', marginTop:2 }}>
                            ATP ref: {ATP_RALLY_REF[i]}% · A:{(pA2*100).toFixed(1)}% B:{(pB2*100).toFixed(1)}%
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* SAQUE */}
                <div className="sec-title">🎯 Saque</div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
                  {[{n:nameA,d:res.a,c:RG.clay},{n:nameB,d:res.b,c:RG.blue}].map(({n,d,c})=>(
                    <div key={n} className="sc" style={{ borderColor:`${c}22` }}>
                      <div className="slbl" style={{ color:`${c}88` }}>{n.split(' ').pop()} — Saque</div>

                      <SR label="1º Saque %"       val={pp(d.s1Pct)} bench={ATP.s1Pct}  benchVal={d.s1Pct}  color={c} />
                      <SR label="1º km/h (média)"  val={`${f0(d.s1Kmh)} km/h`} bench={ATP.s1Kmh} benchVal={d.s1Kmh} />
                      <SR label="1º km/h (min–max)" val={d.s1KmhMin ? `${f0(d.s1KmhMin)} – ${f0(d.s1KmhMax)}` : '—'} color={RG.textDim} />
                      <SR label="% pts ganhos c/ 1º" val={pp(d.s1WinSrvPct)} bench={ATP.s1WinP} benchVal={d.s1WinSrvPct}
                        color={d.s1WinSrvPct ? (d.s1WinSrvPct>.72?RG.green:RG.yellow) : RG.white} />

                      <div className="div-sep" />

                      <SR label="2º Saque %"       val={pp(d.s2Pct)} bench={ATP.s2Pct}  benchVal={d.s2Pct} />
                      <SR label="2º km/h (média)"  val={`${f0(d.s2Kmh)} km/h`} bench={ATP.s2Kmh} benchVal={d.s2Kmh} />
                      <SR label="2º km/h (min–max)" val={d.s2KmhMin ? `${f0(d.s2KmhMin)} – ${f0(d.s2KmhMax)}` : '—'} color={RG.textDim} />
                      <SR label="% pts ganhos c/ 2º" val={pp(d.s2WinSrvPct)} bench={ATP.s2WinP} benchVal={d.s2WinSrvPct} />

                      <div className="div-sep" />

                      <SR label="Aces/partida"  val={f1(d.aces)}   bench={ATP.aces} benchVal={d.aces} color={RG.green} />
                      <SR label="DF/partida"    val={f1(d.df)}     bench={ATP.df}   benchVal={d.df}   color={RG.red} />
                      <SR label="Pts sacando"   val={pp(d.srvPct)} color={c} />
                      <SR label="Hold %"        val={pp(d.holdPct)} bench={ATP.hold} benchVal={d.holdPct}
                        color={d.holdPct ? (d.holdPct>.7?RG.green:RG.yellow) : RG.white} />

                      {/* Direção 1º saque */}
                      <div style={{ marginTop:12 }}>
                        <div className="slbl" style={{ marginBottom:6 }}>Direção 1º Saque</div>
                        {Object.entries(d.serve1Dir).map(([dir,frac])=>(
                          <div key={dir} style={{ marginBottom:5 }}>
                            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:2 }}>
                              <span style={{ fontFamily:RG.mono, fontSize:9, color:RG.textFaint }}>{dir}</span>
                              <span style={{ fontFamily:RG.display, fontSize:11, fontWeight:700, color:c }}>{(frac*100).toFixed(1)}%</span>
                            </div>
                            <BarPct pct={frac*100} color={c} h={4} />
                          </div>
                        ))}
                      </div>

                      {/* Direção 2º saque */}
                      <div style={{ marginTop:10 }}>
                        <div className="slbl" style={{ marginBottom:6 }}>Direção 2º Saque</div>
                        {Object.entries(d.serve2Dir).map(([dir,frac])=>(
                          <div key={dir} style={{ marginBottom:5 }}>
                            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:2 }}>
                              <span style={{ fontFamily:RG.mono, fontSize:9, color:RG.textFaint }}>{dir}</span>
                              <span style={{ fontFamily:RG.display, fontSize:11, fontWeight:700, color:RG.textDim }}>{(frac*100).toFixed(1)}%</span>
                            </div>
                            <BarPct pct={frac*100} color={`${c}88`} h={4} />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {/* RETURN & BREAK */}
                <div className="sec-title">↩ Return & Break</div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
                  {[{n:nameA,d:res.a,c:RG.clay},{n:nameB,d:res.b,c:RG.blue}].map(({n,d,c})=>(
                    <div key={n} className="sc" style={{ borderColor:`${c}22` }}>
                      <div className="slbl" style={{ color:`${c}88` }}>{n.split(' ').pop()} — Return</div>
                      <SR label="Pts retornando" val={pp(d.retPct)}   bench={ATP.retPct} benchVal={d.retPct}   color={c} />
                      <SR label="Break %"        val={pp(d.breakPct)} bench={ATP.brk}    benchVal={d.breakPct}
                        color={d.breakPct ? (d.breakPct>.28?RG.green:RG.yellow) : RG.white} />
                    </div>
                  ))}
                </div>

                {/* RALLY QUALITY */}
                <div className="sec-title">⚡ Rally & Erros</div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
                  {[{n:nameA,d:res.a,c:RG.clay},{n:nameB,d:res.b,c:RG.blue}].map(({n,d,c})=>(
                    <div key={n} className="sc" style={{ borderColor:`${c}22` }}>
                      <div className="slbl" style={{ color:`${c}88` }}>{n.split(' ').pop()} — Rally</div>
                      <SR label="Q Médio"          val={pp(d.avgQ)}   bench={ATP.quality} benchVal={d.avgQ}      color={c} />
                      <SR label="Winners/partida"  val={f1(d.winners)} bench={ATP.winners} benchVal={d.winners}  color={RG.green} />
                      <SR label="E.NF/partida"     val={f1(d.ue)}      bench={ATP.ue}      benchVal={d.ue}       color={RG.red} />
                      <SR label="E.Forç/partida"   val={f1(d.fe)}      color={RG.yellow} />
                      <SR label="W/UE ratio"       val={d.ue>0?f2(d.winners/d.ue):'—'} bench={ATP.wue} benchVal={d.ue>0?d.winners/d.ue:null}
                        color={d.winners/d.ue>1.5?RG.green:RG.yellow} />
                      <div className="div-sep" />
                      <SR label="Aprox rede/pt"    val={f1(d.netApp)} bench={ATP.net}    benchVal={d.netApp} />
                      <SR label="% pts na rede"    val={pp(d.netPct)} bench={ATP.netPct} benchVal={d.netPct} />
                    </div>
                  ))}
                </div>

                {/* GOLPES COMBINADOS */}
                <div className="sec-title">🎾 Distribuição de Golpes</div>
                <div className="sc">
                  <div className="slbl">Combinado (A + B)</div>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(190px,1fr))', gap:'6px 20px' }}>
                    {shots.map(({k,p})=>(
                      <div key={k}>
                        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:2 }}>
                          <span style={{ fontFamily:RG.display, fontSize:12, fontWeight:600, color:RG.white }}>{k}</span>
                          <span style={{ fontFamily:RG.mono, fontSize:10, color:RG.clay }}>{(p*100).toFixed(1)}%</span>
                        </div>
                        <Bar v={p} max={shots[0]?.p??1} />
                      </div>
                    ))}
                  </div>
                </div>

                {/* GOLPES POR JOGADOR */}
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
                  {[{n:nameA,d:res.a,c:RG.clay},{n:nameB,d:res.b,c:RG.blue}].map(({n,d,c})=>{
                    const entries = Object.entries(d.byType).filter(([,v])=>v>0).sort(([,a],[,b])=>b-a);
                    const tot = entries.reduce((s,[,v])=>s+v,0)||1;
                    return (
                      <div key={n} className="sc" style={{ borderColor:`${c}22` }}>
                        <div className="slbl" style={{ color:`${c}88` }}>{n.split(' ').pop()} — Golpes</div>
                        {entries.map(([k,v])=>(
                          <div key={k} style={{ marginBottom:7 }}>
                            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:2 }}>
                              <span style={{ fontFamily:RG.display, fontSize:11, fontWeight:600, color:RG.white }}>{k}</span>
                              <span style={{ fontFamily:RG.mono, fontSize:9, color:c }}>{(v/tot*100).toFixed(1)}%</span>
                            </div>
                            <BarPct pct={v/tot*100} color={c} h={4} />
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>

                {/* PLACAR */}
                <div className="sec-title">📋 Distribuição de Placares</div>
                <div className="sc">
                  <div className="slbl">Placar final (sets)</div>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(155px,1fr))', gap:'8px 16px' }}>
                    {scoreList.map(([score,count])=>{
                      const [a,b] = score.split('-').map(Number);
                      const wn = a>b?nameA.split(' ').pop():nameB.split(' ').pop();
                      const co = a>b?RG.clay:RG.blue;
                      return (
                        <div key={score}>
                          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
                            <span style={{ fontFamily:RG.display, fontSize:14, fontWeight:700, color:co }}>{score} <span style={{ fontSize:10, opacity:.6 }}>({wn})</span></span>
                            <span style={{ fontFamily:RG.mono, fontSize:11, color:RG.textDim }}>{count}× <span style={{ opacity:.5 }}>({pct(count,res.ran)}%)</span></span>
                          </div>
                          <Bar v={count} max={maxSC} color={co} h={4} />
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* LOG */}
                <div className="sec-title">📜 Log das Partidas</div>
                <div className="sc">
                  <div className="slbl">Últimas {Math.min(feedRef.current.length,60)} partidas</div>
                  <div style={{ maxHeight:300, overflowY:'auto', display:'flex', flexDirection:'column', gap:2 }}>
                    <div style={{ display:'grid', gridTemplateColumns:'26px 1fr 52px 1fr 52px 52px', gap:'0 8px', padding:'4px 6px', borderBottom:`1px solid ${RG.border}`, marginBottom:4 }}>
                      {['#','Vencedor','Sets','Detalhe','QA','QB'].map(h=>(
                        <span key={h} style={{ fontFamily:RG.mono, fontSize:8, letterSpacing:'.2em', color:RG.textFaint, textTransform:'uppercase' }}>{h}</span>
                      ))}
                    </div>
                    {feedRef.current.map((e,i)=>{
                      const isA = e.winnerName===nameA||e.winnerName===keyA;
                      const wc  = isA?RG.clay:RG.blue;
                      return (
                        <div key={i} className="lrow" style={{ display:'grid', gridTemplateColumns:'26px 1fr 52px 1fr 52px 52px', gap:'0 8px', padding:'5px 6px', borderRadius:4, background:isA?`${RG.clay}0a`:`${RG.blue}0a` }}>
                          <span style={{ fontFamily:RG.mono, fontSize:9, color:RG.textFaint }}>{e.n}</span>
                          <span style={{ fontFamily:RG.display, fontSize:12, fontWeight:700, color:wc }}>{isA?nameA.split(' ').pop():nameB.split(' ').pop()}</span>
                          <span style={{ fontFamily:RG.mono, fontSize:11, color:RG.white, fontWeight:700 }}>{e.score}</span>
                          <span style={{ fontFamily:RG.mono, fontSize:9, color:RG.textFaint }}>{e.setDetail}</span>
                          <span style={{ fontFamily:RG.mono, fontSize:10, color:RG.clay }}>{e.aQ!=null?`${Math.round(e.aQ*100)}%`:'—'}</span>
                          <span style={{ fontFamily:RG.mono, fontSize:10, color:RG.blue }}>{e.bQ!=null?`${Math.round(e.bQ*100)}%`:'—'}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* EXPORT CTA */}
                <div className="sc" style={{ border:`1px solid rgba(0,212,255,.25)`, background:'rgba(0,212,255,.04)' }}>
                  <div className="slbl" style={{ color:'rgba(0,212,255,.5)' }}>Exportar para Calibragem</div>
                  <div style={{ fontFamily:RG.mono, fontSize:9, color:RG.textFaint, lineHeight:1.9, marginBottom:12 }}>
                    JSON estruturado com todas as métricas acima + benchmarks ATP + distribuições completas +
                    serveLog por direção + rally buckets + log de todas as partidas.
                    Envie o arquivo para análise do engine.
                  </div>
                  <button className="expbtn" onClick={exportData}>
                    ⬇ EXPORTAR {res.ran} PARTIDAS — JSON COMPLETO
                  </button>
                </div>

              </>}
            </div>
          </div>
        </div>

        <div style={{ position:'fixed', bottom:0, left:0, right:0, height:2, background:`linear-gradient(90deg,transparent,${RG.clay} 30%,${RG.clayLight} 50%,${RG.clay} 70%,transparent)`, pointerEvents:'none', zIndex:30 }} />
      </div>
    </>
  );
}



