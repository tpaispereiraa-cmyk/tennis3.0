/**
 * CoachProfileView.jsx  — v2
 * ─────────────────────────────────────────────────────────────────
 * Ficha completa do técnico.
 * Mesmo design system da UnifiedPlayerProfile2 (tokens, CSS, micro-components).
 *
 * 4 ABAS:
 *   IDENTIDADE  — persona, bio, tagline, DNA tier, traits, ex-jogador
 *   MÉTODO      — coachingStyle, filosofia, superfície, atributos numéricos, XP
 *   PARCERIA    — pupilo atual (bond, barra, química, alcunha, meta, marcos), histórico
 *   TRAJETÓRIA  — reputação, ciclo de vida, status, linha do tempo de pupilos
 *
 * Props:
 *   coach       {object}   — objeto coach completo do pool
 *   year        {number}   — temporada atual
 *   allPlayers  {Array}    — todos os jogadores (para resolver pupilo)
 *   onBack      {fn}       — callback de voltar (opcional)
 *   activeTab   {string}   — aba inicial (opcional)
 */

import { useState } from 'react';
import {
  COACH_ATTR_CATEGORIES,
  coachOverallRating,
  coachGrade,
} from '../CoachProfiles.js';
import {
  COACH_PERSONAS,
  COACHING_STYLES,
  COACH_TRAIT_DEFS,
  getCoachDnaTier,
} from '../CoachingSystem.js';
import {
  PARTNERSHIP_STATES,
  MILESTONE_TYPES,
} from '../CoachPartnershipSystem.js';
import { chemistryLabel } from '../CoachContractSystem.js';

// ─────────────────────────────────────────────────────────────────
// DESIGN TOKENS — espelho exato do UPP2
// ─────────────────────────────────────────────────────────────────
const T = {
  bg0:     '#050709',
  bg1:     '#080C0F',
  bg2:     '#0C1217',
  bg3:     '#111920',
  ink:     '#EDE8DF',
  inkDim:  'rgba(237,232,223,.52)',
  inkFaint:'rgba(237,232,223,.24)',
  inkGhost:'rgba(237,232,223,.08)',
  line:    'rgba(237,232,223,.07)',
  lineMid: 'rgba(237,232,223,.13)',
  gold:    '#E8C84A',
  display: "'Bebas Neue', sans-serif",
  cond:    "'Barlow Condensed', sans-serif",
  body:    "'Barlow', sans-serif",
  mono:    "'Space Mono', monospace",
};

// ─────────────────────────────────────────────────────────────────
// LOOKUP TABLES
// ─────────────────────────────────────────────────────────────────
const PHIL_META = {
  OFFENSIVE:  { label:'Ofensivo',     icon:'⚡', color:'#F06428', rgb:'240,100,40' },
  DEFENSIVE:  { label:'Defensivo',    icon:'🛡️', color:'#2860A8', rgb:'40,96,168'  },
  COMPLETE:   { label:'Completo',     icon:'⚖️', color:'#22C55E', rgb:'34,197,94'  },
  SPECIALIST: { label:'Especialista', icon:'🏺', color:'#E8C84A', rgb:'232,200,74' },
  MENTAL:     { label:'Mental',       icon:'🧠', color:'#AA44FF', rgb:'170,68,255' },
};
const SURF_META = {
  CLAY:   { label:'Saibro', color:'#D4561E', icon:'🏺' },
  GRASS:  { label:'Grama',  color:'#1C6B38', icon:'🌿' },
  HARD:   { label:'Dura',   color:'#4A90D9', icon:'🏙️' },
  INDOOR: { label:'Indoor', color:'#8B2FAA', icon:'🏟️' },
};
const STATUS_META = {
  FREE_AGENT: { label:'Disponível', color:'#22C55E' },
  ACTIVE:     { label:'Contratado', color:'#E8C84A' },
  HIATUS:     { label:'Em Pausa',   color:'#64748B' },
  RETIRED:    { label:'Aposentado', color:'rgba(237,232,223,.28)' },
};
const BOND_GRAD = {
  STABLE: 'linear-gradient(90deg,#22C55E,#4CAF50)',
  TENSION:'linear-gradient(90deg,#FF9800,#FFB74D)',
  CRISIS: 'linear-gradient(90deg,#F44336,#EF5350)',
  RUPTURE:'linear-gradient(90deg,#9C27B0,#AB47BC)',
};
const TRAIT_TIER = {
  legendary: { color:'#FFD700', bg:'rgba(255,215,0,.09)',  border:'rgba(255,215,0,.28)',  icon:'⭐' },
  rare:      { color:'#AA44FF', bg:'rgba(170,68,255,.09)', border:'rgba(170,68,255,.28)', icon:'💜' },
  uncommon:  { color:'#00CCFF', bg:'rgba(0,204,255,.08)',  border:'rgba(0,204,255,.26)',  icon:'🔷' },
  common:    { color:'rgba(237,232,223,.55)', bg:'rgba(237,232,223,.04)', border:'rgba(237,232,223,.12)', icon:'○' },
  negative:  { color:'#FF5566', bg:'rgba(255,85,102,.08)', border:'rgba(255,85,102,.26)', icon:'🔻' },
};
const DISMISSAL_LABEL = {
  VOLUNTARY:         'Decisão própria',
  RESULTS:           'Resultados',
  CONFLICT:          'Conflito',
  RETIREMENT_PLAYER: 'Aposentadoria',
  MUTUAL:            'Mútuo acordo',
};

// ─────────────────────────────────────────────────────────────────
// CSS — prefixo cpv2, mesma linguagem do UPP2
// ─────────────────────────────────────────────────────────────────
function injectCSS() {
  if (document.getElementById('cpv2-css')) return;
  const css = `
@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Space+Mono:wght@400;700&family=Barlow+Condensed:ital,wght@0,300;0,400;0,600;0,700;0,900;1,600&family=Barlow:wght@300;400;500;600&display=swap');

@keyframes cpv2-in   { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
@keyframes cpv2-hero { from{opacity:0;transform:scale(1.04)}      to{opacity:1;transform:scale(1)} }
@keyframes cpv2-bar  { from{transform:scaleX(0)}                  to{transform:scaleX(1)} }
@keyframes cpv2-float{ 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }

.cpv2-root {
  width:100%; height:100%;
  background:#050709; color:#EDE8DF;
  font-family:'Barlow',sans-serif;
  display:flex; flex-direction:column;
  overflow:hidden; position:relative;
}
.cpv2-scroll {
  overflow-y:auto; scrollbar-width:thin;
  scrollbar-color:rgba(var(--sc-rgb,232,200,74),.35) transparent;
}
.cpv2-scroll::-webkit-scrollbar { width:2px; }
.cpv2-scroll::-webkit-scrollbar-thumb { background:rgba(var(--sc-rgb,232,200,74),.3); }

/* CHROME */
.cpv2-chrome {
  height:42px; flex-shrink:0;
  background:rgba(5,7,9,.97);
  border-bottom:1px solid rgba(237,232,223,.06);
  display:flex; align-items:center; padding:0 20px; gap:14px;
  z-index:40; backdrop-filter:blur(20px);
}
.cpv2-back {
  font-family:'Space Mono',monospace; font-size:8px; letter-spacing:.3em;
  text-transform:uppercase; background:none;
  border:1px solid rgba(237,232,223,.08);
  color:rgba(237,232,223,.38); padding:5px 14px; cursor:pointer;
  transition:all .13s; flex-shrink:0;
  clip-path:polygon(4px 0,100% 0,calc(100% - 4px) 100%,0 100%);
}
.cpv2-back:hover { background:rgba(237,232,223,.05); color:#EDE8DF; border-color:rgba(237,232,223,.16); }

/* HERO */
.cpv2-hero {
  position:relative; flex-shrink:0;
  height:clamp(200px,24vh,280px);
  overflow:hidden;
}
.cpv2-hero-bg-letter {
  position:absolute; inset:0;
  display:flex; align-items:center; justify-content:center;
  background:linear-gradient(145deg,#0A0F12,#060A0D);
}
.cpv2-hero-glow {
  position:absolute; inset:0;
  background:radial-gradient(ellipse at 68% 42%, rgba(var(--sc-rgb,232,200,74),.09) 0%, transparent 62%);
}
.cpv2-hero-grad-b { position:absolute;inset:0;background:linear-gradient(0deg,rgba(5,7,9,1) 0%,rgba(5,7,9,.5) 38%,transparent 72%); }
.cpv2-hero-grad-l { position:absolute;inset:0;background:linear-gradient(90deg,rgba(5,7,9,.95) 0%,rgba(5,7,9,.65) 48%,transparent 100%); }
.cpv2-hero-stripe { position:absolute;top:0;left:0;right:0;height:2px; background:linear-gradient(90deg,var(--sc,#E8C84A) 0%,rgba(var(--sc-rgb,232,200,74),.18) 70%,transparent 100%); z-index:2; }
.cpv2-hero-num {
  position:absolute; right:-6px; top:50%;
  transform:translateY(-52%);
  font-family:'Bebas Neue',sans-serif;
  font-size:clamp(140px,20vw,220px); line-height:.82;
  color:var(--sc,#E8C84A); opacity:.042;
  pointer-events:none; user-select:none; z-index:1;
}
.cpv2-hero-content {
  position:absolute; inset:0; z-index:3;
  display:flex; align-items:flex-end;
  padding:0 clamp(20px,3vw,48px) clamp(16px,2.2vh,26px);
  gap:clamp(20px,3.5vw,48px);
}
.cpv2-hero-info { flex:1; min-width:0; animation:cpv2-in .4s .05s both; }
.cpv2-hero-eyebrow { display:flex; align-items:center; gap:8px; margin-bottom:8px; }
.cpv2-hero-eyebrow::before { content:''; width:20px; height:2px; background:var(--sc,#E8C84A); flex-shrink:0; }
.cpv2-hero-nat  { font-family:'Space Mono',monospace; font-size:8px; letter-spacing:.42em; color:var(--sc,#E8C84A); text-transform:uppercase; }
.cpv2-hero-sub  { font-family:'Space Mono',monospace; font-size:8px; letter-spacing:.28em; color:rgba(237,232,223,.3); text-transform:uppercase; }
.cpv2-hero-name {
  font-family:'Bebas Neue',sans-serif;
  font-size:clamp(44px,6vw,84px); letter-spacing:.02em;
  color:#EDE8DF; text-transform:uppercase; line-height:.88;
  text-shadow:0 2px 28px rgba(0,0,0,.7);
}
.cpv2-hero-tagline { font-family:'Barlow Condensed',sans-serif; font-style:italic; font-weight:300; font-size:clamp(10px,1.4vw,13px); color:rgba(237,232,223,.36); margin-top:5px; letter-spacing:.04em; }
.cpv2-hero-badges { display:flex; align-items:center; gap:6px; flex-wrap:wrap; margin-top:9px; }
.cpv2-style-badge {
  font-family:'Barlow Condensed',sans-serif; font-weight:700;
  font-size:10px; letter-spacing:.16em; text-transform:uppercase;
  padding:4px 11px 3px; display:inline-flex; align-items:center; gap:5px;
  background:rgba(var(--sc-rgb,232,200,74),.12);
  border:1px solid rgba(var(--sc-rgb,232,200,74),.35);
  color:var(--sc,#E8C84A);
  clip-path:polygon(4px 0,100% 0,calc(100% - 4px) 100%,0 100%);
}
.cpv2-tag-badge {
  font-family:'Space Mono',monospace; font-size:8px; letter-spacing:.22em;
  text-transform:uppercase; padding:4px 10px;
  background:rgba(232,200,74,.07); border:1px solid rgba(232,200,74,.25);
  color:#E8C84A; clip-path:polygon(4px 0,100% 0,calc(100% - 4px) 100%,0 100%);
}
.cpv2-tag-dim {
  font-family:'Space Mono',monospace; font-size:8px; letter-spacing:.22em;
  text-transform:uppercase; padding:4px 10px;
  background:rgba(237,232,223,.04); border:1px solid rgba(237,232,223,.12);
  color:rgba(237,232,223,.4); clip-path:polygon(4px 0,100% 0,calc(100% - 4px) 100%,0 100%);
}
.cpv2-hero-ovr { flex-shrink:0; display:flex; flex-direction:column; align-items:center; justify-content:flex-end; padding-bottom:2px; animation:cpv2-in .4s .1s both; }
.cpv2-ovr-label { font-family:'Space Mono',monospace; font-size:7px; letter-spacing:.5em; color:rgba(237,232,223,.22); text-transform:uppercase; }
.cpv2-ovr-num   { font-family:'Bebas Neue',sans-serif; font-size:clamp(68px,9.5vw,112px); line-height:.82; letter-spacing:.01em; color:var(--sc,#E8C84A); text-shadow:0 0 40px rgba(var(--sc-rgb,232,200,74),.4); }
.cpv2-ovr-grade { font-family:'Bebas Neue',sans-serif; font-size:clamp(18px,2.5vw,30px); letter-spacing:.08em; color:rgba(237,232,223,.5); }
.cpv2-ovr-div   { width:36px; height:1px; background:linear-gradient(90deg,transparent,var(--sc,#E8C84A),transparent); margin:5px 0; }

/* TABBAR */
.cpv2-tabbar {
  display:flex; align-items:stretch;
  background:rgba(5,7,9,.98);
  border-bottom:2px solid rgba(237,232,223,.06);
  overflow-x:auto; flex-shrink:0; scrollbar-width:none;
  box-shadow:0 2px 24px rgba(0,0,0,.6);
}
.cpv2-tabbar::-webkit-scrollbar { display:none; }
.cpv2-tab {
  font-family:'Barlow Condensed',sans-serif; font-weight:700;
  font-size:10px; letter-spacing:.15em; text-transform:uppercase;
  padding:0 18px; height:40px; border:none; background:none;
  color:rgba(237,232,223,.26); cursor:pointer; white-space:nowrap;
  position:relative; flex-shrink:0; transition:color .15s,background .15s;
  display:flex; align-items:center; gap:5px;
}
.cpv2-tab:hover { color:rgba(237,232,223,.58); background:rgba(237,232,223,.025); }
.cpv2-tab.act   { color:#EDE8DF; background:rgba(237,232,223,.035); }
.cpv2-tab.act::after {
  content:''; position:absolute; bottom:-2px; left:0; right:0; height:2px;
  background:var(--sc,#E8C84A);
  box-shadow:0 0 10px rgba(var(--sc-rgb,232,200,74),.65);
}
.cpv2-tab-dot { width:4px; height:4px; border-radius:50%; background:var(--sc,#E8C84A); opacity:0; transition:opacity .15s; flex-shrink:0; }
.cpv2-tab.act .cpv2-tab-dot { opacity:1; box-shadow:0 0 5px var(--sc,#E8C84A); }

/* CONTENT */
.cpv2-content { flex:1; display:flex; overflow:hidden; min-height:0; animation:cpv2-in .2s both; }

/* SECTION HEADER */
.cpv2-sh {
  font-family:'Space Mono',monospace; font-size:7px; letter-spacing:.48em;
  color:rgba(237,232,223,.22); text-transform:uppercase;
  display:flex; align-items:center; gap:10px; margin-bottom:12px;
}
.cpv2-sh::before { content:''; width:14px; height:1px; background:var(--sc,#E8C84A); flex-shrink:0; }
.cpv2-sh::after  { content:''; flex:1; height:1px; background:rgba(237,232,223,.05); }

/* STAT CARD */
.cpv2-stat-card {
  background:rgba(237,232,223,.02); border:1px solid rgba(237,232,223,.07);
  padding:14px 13px; position:relative; overflow:hidden;
  clip-path:polygon(6px 0,100% 0,calc(100% - 6px) 100%,0 100%);
  transition:border-color .15s;
}
.cpv2-stat-card::before { content:''; position:absolute; top:0; left:0; right:0; height:1px; background:linear-gradient(90deg,var(--sc,#E8C84A),transparent); opacity:.3; }

/* ATTR BAR */
.cpv2-attr-wrap { margin-bottom:7px; }
.cpv2-attr-head { display:flex; justify-content:space-between; align-items:baseline; margin-bottom:4px; }
.cpv2-attr-lbl  { font-family:'Barlow Condensed',sans-serif; font-weight:600; font-size:11px; letter-spacing:.05em; text-transform:uppercase; color:rgba(237,232,223,.4); }
.cpv2-attr-val  { font-family:'Bebas Neue',sans-serif; font-size:18px; line-height:1; }
.cpv2-attr-track{ height:3px; background:rgba(237,232,223,.06); position:relative; clip-path:polygon(2px 0,100% 0,calc(100% - 2px) 100%,0 100%); }
.cpv2-attr-fill { height:100%; position:absolute; left:0; top:0; transform-origin:left; animation:cpv2-bar .5s ease both; }

/* PILL */
.cpv2-pill {
  font-family:'Space Mono',monospace; font-size:8px; letter-spacing:.2em;
  text-transform:uppercase; padding:3px 9px;
  border:1px solid; display:inline-flex; align-items:center; gap:4px;
  clip-path:polygon(3px 0,100% 0,calc(100% - 3px) 100%,0 100%);
}

/* HISTORY ROW */
.cpv2-hrow {
  display:flex; align-items:center; gap:12px;
  padding:9px 13px; border:1px solid rgba(237,232,223,.05);
  background:rgba(237,232,223,.015); margin-bottom:2px;
  clip-path:polygon(5px 0,100% 0,calc(100% - 5px) 100%,0 100%);
  transition:all .14s;
}
.cpv2-hrow:hover { background:rgba(237,232,223,.035); border-color:rgba(237,232,223,.1); }

/* DIM CARD (ex UPP2 DimCard) */
.cpv2-dim-card {
  border:1px solid; border-left-width:3px;
  padding:15px 17px; position:relative; overflow:hidden;
}
.cpv2-dim-card::before { content:''; position:absolute; top:0;left:0;right:0;height:1px; }
`;
  const el = document.createElement('style');
  el.id = 'cpv2-css';
  el.textContent = css;
  document.head.appendChild(el);
}

// ─────────────────────────────────────────────────────────────────
// MICRO-COMPONENTS — idênticos ao UPP2 (adaptados para sc em vez de clay)
// ─────────────────────────────────────────────────────────────────
function Sh({ children, sc }) {
  return <div className="cpv2-sh" style={{ '--sc': sc ?? T.gold }}>{children}</div>;
}

function StatCard({ label, value, color, small }) {
  return (
    <div className="cpv2-stat-card">
      <div style={{ fontFamily:T.display, fontSize:small?24:32, color:color??T.ink, lineHeight:1 }}>{value}</div>
      <div style={{ fontFamily:T.mono, fontSize:7, letterSpacing:'.32em', color:T.inkFaint, textTransform:'uppercase', marginTop:5 }}>{label}</div>
    </div>
  );
}

function AttrRow({ label, value, color }) {
  const hi = value >= 88, md = value >= 70;
  return (
    <div className="cpv2-attr-wrap">
      <div className="cpv2-attr-head">
        <span className="cpv2-attr-lbl" style={{ color:hi?'rgba(237,232,223,.75)':undefined }}>{label}</span>
        <span className="cpv2-attr-val" style={{ color:hi?color:md?'rgba(237,232,223,.45)':T.inkFaint }}>{value}</span>
      </div>
      <div className="cpv2-attr-track">
        <div className="cpv2-attr-fill" style={{ width:`${value}%`, background:hi?color:md?'rgba(237,232,223,.18)':'rgba(237,232,223,.08)', boxShadow:hi?`0 0 6px ${color}88`:undefined }} />
      </div>
    </div>
  );
}

function Bar({ value, color, height=4, showGlow=false }) {
  const pct = Math.max(0, Math.min(100, value ?? 0));
  return (
    <div style={{ height, background:'rgba(237,232,223,.06)', position:'relative' }}>
      <div style={{ position:'absolute', left:0, top:0, height:'100%', width:`${pct}%`, background:color, transition:'width .4s', boxShadow:showGlow?`0 0 8px ${color}55`:undefined }} />
    </div>
  );
}

function Pill({ label, color, icon, dim }) {
  return (
    <span className="cpv2-pill" style={{ color:dim?`${color}77`:color, borderColor:dim?`${color}33`:`${color}55`, background:`${color}${dim?'08':'12'}` }}>
      {icon && <span style={{ fontSize:10 }}>{icon}</span>}
      {label}
    </span>
  );
}

function DimCard({ sc, icon, tag, title, body, children, style: sx }) {
  return (
    <div className="cpv2-dim-card" style={{ borderColor:`${sc}25`, borderLeftColor:sc, background:`${sc}06`, ...sx }}>
      <div style={{ position:'absolute', top:0, left:0, right:0, height:1, background:`linear-gradient(90deg,${sc}55,transparent)` }} />
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom: (body || children) ? 8 : 0 }}>
        {icon && <span style={{ fontSize:20, lineHeight:1, flexShrink:0 }}>{icon}</span>}
        <div>
          {tag && <div style={{ fontFamily:T.mono, fontSize:7, letterSpacing:'.4em', color:`${sc}88`, textTransform:'uppercase', marginBottom:2 }}>{tag}</div>}
          <div style={{ fontFamily:T.cond, fontWeight:700, fontSize:16, color:sc, textTransform:'uppercase', letterSpacing:'.04em', lineHeight:1.1 }}>{title}</div>
        </div>
      </div>
      {body && <p style={{ fontFamily:T.body, fontSize:12, lineHeight:1.7, color:T.inkDim, margin:0 }}>{body}</p>}
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// HERO — número fantasma = idade do coach (único differentiator vs jogador)
// ─────────────────────────────────────────────────────────────────
function CoachHero({ coach, sc, scRgb }) {
  const phil    = PHIL_META[coach.philosophy];
  const attrs   = coach.coachAttrs ?? {};
  const ovr     = coachOverallRating(attrs);
  const grade   = coachGrade(ovr);
  const csDef   = COACHING_STYLES[coach.coachingStyle];
  const sm      = STATUS_META[coach.coachStatus ?? 'FREE_AGENT'] ?? STATUS_META.FREE_AGENT;
  const retired = coach.coachStatus === 'RETIRED';

  return (
    <div className="cpv2-hero" style={{ '--sc':sc, '--sc-rgb':scRgb }}>
      {/* Fundo sem foto — inicial do nome grande */}
      <div className="cpv2-hero-bg-letter">
        <div style={{ fontFamily:T.display, fontSize:'clamp(100px,18vw,180px)', color:'rgba(237,232,223,.02)', lineHeight:1, userSelect:'none' }}>
          {(coach.fullName ?? coach.name ?? '?')[0].toUpperCase()}
        </div>
      </div>
      <div className="cpv2-hero-glow" />
      <div className="cpv2-hero-grad-b" />
      <div className="cpv2-hero-grad-l" />
      <div className="cpv2-hero-stripe" />
      {/* Número fantasma = idade */}
      <div className="cpv2-hero-num">{coach.age ?? ''}</div>

      <div className="cpv2-hero-content">
        <div className="cpv2-hero-info">
          {/* Eyebrow */}
          <div className="cpv2-hero-eyebrow">
            <span className="cpv2-hero-nat">{coach.nationality ?? ''}</span>
            {phil && <span className="cpv2-hero-sub">{phil.icon} {phil.label}</span>}
            {!retired && (
              <span style={{ fontFamily:T.mono, fontSize:8, letterSpacing:'.24em', color:sm.color, textTransform:'uppercase' }}>
                ● {sm.label}
              </span>
            )}
          </div>

          {/* Nome */}
          <div className="cpv2-hero-name">{coach.fullName ?? coach.name}</div>

          {/* Tagline */}
          {coach.tagline && <div className="cpv2-hero-tagline">"{coach.tagline}"</div>}

          {/* Badges */}
          <div className="cpv2-hero-badges">
            {csDef && (
              <span className="cpv2-style-badge">{csDef.icon} {csDef.label}</span>
            )}
            {coach.origin === 'RETIRED_PLAYER' && (
              <span className="cpv2-tag-badge">Ex-Jogador</span>
            )}
            {retired && (
              <span className="cpv2-tag-dim">Aposentado</span>
            )}
          </div>
        </div>

        {/* OVR */}
        <div className="cpv2-hero-ovr">
          <div className="cpv2-ovr-label">OVR</div>
          <div className="cpv2-ovr-num">{ovr}</div>
          <div className="cpv2-ovr-div" />
          <div className="cpv2-ovr-grade">{grade}</div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// ABA 1 — IDENTIDADE
// ─────────────────────────────────────────────────────────────────
function TabIdentidade({ coach, sc }) {
  const personaDef = COACH_PERSONAS[coach.persona] ?? null;
  const csDef      = COACHING_STYLES[coach.coachingStyle] ?? null;
  const traits     = coach.traits ?? [];
  const dnaTier    = getCoachDnaTier(coach.dnaScore ?? 50);
  const isEx       = coach.origin === 'RETIRED_PLAYER';
  const sm         = STATUS_META[coach.coachStatus ?? 'FREE_AGENT'] ?? STATUS_META.FREE_AGENT;

  return (
    <div className="cpv2-scroll" style={{ flex:1, padding:'20px 22px', overflowY:'auto' }}>

      {/* Stats rápidos */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:2, marginBottom:18 }}>
        <StatCard label="Idade"     value={coach.age ?? '—'}                color={sc} />
        <StatCard label="Nac."      value={coach.nationality ?? '—'}        color={T.inkDim} small />
        <StatCard label="Reputação" value={Math.round(coach.reputation??0)} color={T.gold} />
        <StatCard label="Status"    value={sm.label}                        color={sm.color} small />
      </div>

      {/* Persona */}
      {personaDef && (
        <>
          <Sh sc={sc}>Persona</Sh>
          <DimCard sc={sc} icon={personaDef.icon} tag="Personalidade" title={personaDef.label}
            body={personaDef.description} style={{ marginBottom:14 }}>
            {coach.bio && (
              <div style={{ borderLeft:`2px solid ${sc}44`, paddingLeft:11, marginTop:10 }}>
                <div style={{ fontFamily:T.mono, fontSize:7, letterSpacing:'.38em', color:`${sc}88`, textTransform:'uppercase', marginBottom:4 }}>Bio</div>
                <p style={{ fontFamily:T.body, fontSize:12, lineHeight:1.7, color:T.inkDim, margin:0 }}>{coach.bio}</p>
              </div>
            )}
          </DimCard>
        </>
      )}

      {/* Estilo de Desenvolvimento */}
      {csDef && (
        <>
          <Sh sc={sc}>Estilo de Desenvolvimento</Sh>
          <div style={{ display:'flex', alignItems:'center', gap:14, padding:'13px 15px', border:'1px solid rgba(237,232,223,.09)', background:'rgba(237,232,223,.02)', marginBottom:14 }}>
            <span style={{ fontSize:26, flexShrink:0 }}>{csDef.icon}</span>
            <div>
              <div style={{ fontFamily:T.cond, fontWeight:700, fontSize:15, color:T.ink, textTransform:'uppercase', letterSpacing:'.05em' }}>{csDef.label}</div>
              <div style={{ fontFamily:T.body, fontSize:12, color:T.inkFaint, marginTop:3, lineHeight:1.55 }}>{csDef.description}</div>
            </div>
          </div>
        </>
      )}

      {/* DNA & Traits */}
      {traits.length > 0 && (
        <>
          <Sh sc={sc}>DNA — {dnaTier?.label ?? 'Coach'}</Sh>
          {/* Barra de DNA */}
          <div style={{ marginBottom:12 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:5 }}>
              <span style={{ fontFamily:T.mono, fontSize:7, letterSpacing:'.38em', color:T.inkFaint, textTransform:'uppercase' }}>DNA Score</span>
              <span style={{ fontFamily:T.display, fontSize:20, color:dnaTier?.color ?? sc, lineHeight:1 }}>{coach.dnaScore ?? '—'}</span>
            </div>
            <Bar value={coach.dnaScore ?? 0} color={dnaTier?.color ?? sc} height={4} showGlow />
          </div>

          {/* Trait cards */}
          <div style={{ display:'flex', flexDirection:'column', gap:5, marginBottom:14 }}>
            {traits.map(id => {
              const def  = COACH_TRAIT_DEFS[id];
              if (!def) return null;
              const type = def.type === 'negative' ? 'negative' : (def.rarity ?? 'common');
              const tm   = TRAIT_TIER[type] ?? TRAIT_TIER.common;
              return (
                <div key={id} style={{ display:'flex', alignItems:'center', gap:11, padding:'10px 13px', background:tm.bg, border:`1px solid ${tm.border}` }}>
                  <span style={{ fontSize:16, flexShrink:0 }}>{tm.icon}</span>
                  <div style={{ flex:1 }}>
                    <div style={{ fontFamily:T.cond, fontWeight:700, fontSize:13, color:tm.color, textTransform:'uppercase', letterSpacing:'.04em' }}>
                      {def.label}
                    </div>
                    <div style={{ fontFamily:T.body, fontSize:11, color:T.inkFaint, marginTop:2, lineHeight:1.5 }}>
                      {def.description}
                    </div>
                  </div>
                  <span style={{ fontFamily:T.mono, fontSize:6, color:`${tm.color}66`, letterSpacing:1, textTransform:'uppercase', flexShrink:0 }}>
                    {def.rarity ?? def.type}
                  </span>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Carreira como Jogador */}
      {isEx && (
        <>
          <Sh sc={sc}>Carreira como Jogador</Sh>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:2, marginBottom:14 }}>
            <StatCard label="Pico ranking" value={coach.careerPeakRank ? `#${coach.careerPeakRank}` : '—'} color={(coach.careerPeakRank??999)<=10?'#22C55E':T.inkDim} />
            <StatCard label="Grand Slams"  value={coach.careerSlams  ?? 0}  color={coach.careerSlams>0?T.gold:T.inkFaint} />
            <StatCard label="Títulos"      value={coach.careerTitles ?? 0}  color={T.inkDim} />
          </div>
        </>
      )}

    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// ABA 2 — MÉTODO
// ─────────────────────────────────────────────────────────────────
function TabMetodo({ coach, sc }) {
  const phil  = PHIL_META[coach.philosophy] ?? { label:coach.philosophy, icon:'🎾', color:sc };
  const surf  = coach.specialtySurface ? SURF_META[coach.specialtySurface] : null;
  const attrs = coach.coachAttrs ?? {};
  const ovr   = coachOverallRating(attrs);
  const grade = coachGrade(ovr);

  return (
    <div className="cpv2-scroll" style={{ flex:1, padding:'20px 22px', overflowY:'auto' }}>

      <Sh sc={sc}>Identidade Técnica</Sh>

      {/* Filosofia + Superfície + OVR numa linha */}
      <div style={{ display:'flex', gap:6, marginBottom:16, alignItems:'stretch' }}>

        <div style={{ flex:1, padding:'13px 15px', border:`1px solid ${phil.color}44`, background:`${phil.color}09` }}>
          <div style={{ fontFamily:T.mono, fontSize:7, letterSpacing:'.4em', color:T.inkFaint, textTransform:'uppercase', marginBottom:5 }}>Filosofia</div>
          <div style={{ display:'flex', alignItems:'center', gap:7 }}>
            <span style={{ fontSize:20 }}>{phil.icon}</span>
            <span style={{ fontFamily:T.display, fontSize:18, color:phil.color }}>{phil.label}</span>
          </div>
        </div>

        <div style={{ flex:1, padding:'13px 15px', border:`1px solid ${surf?.color??'rgba(237,232,223,.07)'}44`, background:`${surf?.color??'transparent'}09` }}>
          <div style={{ fontFamily:T.mono, fontSize:7, letterSpacing:'.4em', color:T.inkFaint, textTransform:'uppercase', marginBottom:5 }}>Superfície</div>
          <div style={{ display:'flex', alignItems:'center', gap:7 }}>
            <span style={{ fontSize:20 }}>{surf?.icon ?? '🌐'}</span>
            <span style={{ fontFamily:T.display, fontSize:18, color:surf?.color ?? T.inkDim }}>{surf?.label ?? 'Todas'}</span>
          </div>
        </div>

        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minWidth:68, padding:12, border:`1px solid ${sc}38`, background:`${sc}08` }}>
          <div style={{ fontFamily:T.display, fontSize:44, color:sc, lineHeight:1 }}>{grade}</div>
          <div style={{ fontFamily:T.mono, fontSize:8, color:T.inkFaint, marginTop:2 }}>{ovr}</div>
        </div>
      </div>

      {/* Especialidade individual */}
      {(coach.specialty ?? []).length > 0 && (
        <div style={{ display:'flex', gap:5, flexWrap:'wrap', marginBottom:16 }}>
          {coach.specialty.map(a => <Pill key={a} label={a} color={phil.color} />)}
        </div>
      )}

      {/* Atributos por categoria (mesmo padrão CatBlock do UPP2) */}
      {COACH_ATTR_CATEGORIES.map(cat => {
        const catAttrs = cat.attrs ?? [];
        const catVals  = catAttrs.map(a => attrs[a.key] ?? 0);
        const catAvg   = catVals.length ? Math.round(catVals.reduce((a,b) => a+b, 0) / catVals.length) : 0;
        return (
          <div key={cat.id} style={{ marginBottom:20 }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', borderLeft:`3px solid ${cat.color}`, paddingLeft:10, marginBottom:10, background:`${cat.color}06`, padding:'6px 0 6px 10px' }}>
              <span style={{ fontFamily:T.mono, fontSize:7, letterSpacing:'.42em', color:cat.color, textTransform:'uppercase' }}>{cat.label}</span>
              <span style={{ fontFamily:T.display, fontSize:26, color:cat.color, lineHeight:1 }}>{catAvg}</span>
            </div>
            {catAttrs.map(a => <AttrRow key={a.key} label={a.label} value={attrs[a.key]??0} color={cat.color} />)}
          </div>
        );
      })}

      {/* coachingXP */}
      {(coach.coachingXP ?? 0) > 0 && (
        <>
          <Sh sc={sc}>Experiência Acumulada</Sh>
          <div style={{ display:'flex', alignItems:'center', gap:16, padding:'14px 16px', border:`1px solid ${sc}28`, background:`${sc}07`, marginBottom:8 }}>
            <div>
              <div style={{ fontFamily:T.display, fontSize:32, color:sc, lineHeight:1 }}>{coach.coachingXP}</div>
              <div style={{ fontFamily:T.mono, fontSize:7, color:T.inkFaint, marginTop:3, letterSpacing:2 }}>COACHING XP</div>
            </div>
            <div style={{ flex:1 }}>
              <Bar value={Math.min(100, (coach.coachingXP ?? 0) / 20)} color={sc} height={4} showGlow />
              <div style={{ fontFamily:T.mono, fontSize:7, color:T.inkFaint, marginTop:4, letterSpacing:1 }}>
                Nível {Math.floor((coach.coachingXP ?? 0) / 100)} · {(coach.coachingXP ?? 0) % 100}/100 para próximo
              </div>
            </div>
          </div>
        </>
      )}

    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// ABA 3 — PARCERIA
// ─────────────────────────────────────────────────────────────────
function TabParceria({ coach, allPlayers, sc }) {
  const pupilId      = coach.currentPupilId;
  const pupil        = pupilId ? (allPlayers ?? []).find(p => p.id === pupilId) ?? null : null;
  const pd           = pupil?.coach ?? null;
  const bond         = pd?.bondScore ?? null;
  const bondState    = pd?.relationshipState ?? 'STABLE';
  const bondDef      = PARTNERSHIP_STATES[bondState] ?? PARTNERSHIP_STATES.STABLE;
  const milestones   = pd?.milestones ?? [];
  const nickName     = pd?.partnershipNickname ?? null;
  const formerPupils = coach.formerPupils ?? [];

  let chemMeta = null;
  if (pd?.chemistrySnapshot != null) {
    try { chemMeta = chemistryLabel(pd.chemistrySnapshot); } catch (_) {}
  }

  const totalTitles = formerPupils.reduce((a, h) => a + (h.titlesUnder ?? 0), 0);

  return (
    <div className="cpv2-scroll" style={{ flex:1, padding:'20px 22px', overflowY:'auto' }}>

      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:2, marginBottom:18 }}>
        <StatCard label="Pupilos"       value={formerPupils.length + (pupil ? 1 : 0)} color={sc} />
        <StatCard label="Temp. ativas"  value={formerPupils.reduce((a,h) => a+(h.seasons??0), 0)} color={T.inkDim} />
        <StatCard label="Títulos dados" value={totalTitles} color={T.gold} />
      </div>

      {/* Pupilo atual */}
      <Sh sc={sc}>Pupilo Atual</Sh>

      {pupil ? (
        <div style={{ border:`1px solid ${bondDef.color}28`, background:`${bondDef.color}07`, padding:'15px 17px', marginBottom:14 }}>

          {/* Cabeçalho: nome + bond */}
          <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:10 }}>
            <div>
              <div style={{ fontFamily:T.display, fontSize:22, color:T.ink, textTransform:'uppercase', letterSpacing:.5 }}>{pupil.name}</div>
              {pd?.startSeason && (
                <div style={{ fontFamily:T.mono, fontSize:8, color:T.inkFaint, marginTop:2, letterSpacing:1 }}>
                  Juntos desde {pd.startSeason}
                </div>
              )}
              {/* Alcunha de parceria */}
              {nickName && (
                <div style={{ marginTop:7 }}>
                  <span style={{ fontFamily:T.mono, fontSize:8, letterSpacing:'.22em', textTransform:'uppercase', padding:'4px 10px', background:'rgba(232,200,74,.08)', border:'1px solid rgba(232,200,74,.28)', color:T.gold, clipPath:'polygon(4px 0,100% 0,calc(100% - 4px) 100%,0 100%)' }}>
                    ✦ {nickName}
                  </span>
                </div>
              )}
            </div>
            <div style={{ textAlign:'right', flexShrink:0 }}>
              <div style={{ fontFamily:T.display, fontSize:36, color:bondDef.color, lineHeight:1 }}>{Math.round(bond ?? 0)}</div>
              <div style={{ fontFamily:T.mono, fontSize:7, color:T.inkFaint, letterSpacing:2, marginTop:2 }}>
                {bondDef.icon} {bondDef.label?.toUpperCase()}
              </div>
            </div>
          </div>

          {/* Barra de bond com marcadores */}
          {bond !== null && (
            <div style={{ marginBottom:10 }}>
              <div style={{ height:5, background:'rgba(237,232,223,.06)', position:'relative' }}>
                <div style={{ position:'absolute', left:0, top:0, height:'100%', width:`${bond}%`, background:BOND_GRAD[bondState], transition:'width .4s', boxShadow:`0 0 8px ${bondDef.color}44` }} />
                {[30,50,75].map(t => (
                  <div key={t} style={{ position:'absolute', left:`${t}%`, top:-2, bottom:-2, width:1, background:'rgba(237,232,223,.14)' }} />
                ))}
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', marginTop:3 }}>
                {[0,30,50,75,100].map(t => (
                  <span key={t} style={{ fontFamily:T.mono, fontSize:6, color:T.inkGhost, letterSpacing:1 }}>{t}</span>
                ))}
              </div>
            </div>
          )}

          {/* Química */}
          {chemMeta && (
            <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:10 }}>
              <span style={{ fontFamily:T.mono, fontSize:7, color:T.inkFaint, letterSpacing:2 }}>QUÍMICA</span>
              <Pill label={`${chemMeta.icon} ${chemMeta.label} · ${pd.chemistrySnapshot}`} color={chemMeta.color} />
            </div>
          )}

          {/* Narrativa do último balanço */}
          {pd?.lastGoalNarrative && (
            <div style={{ borderLeft:`2px solid ${bondDef.color}44`, paddingLeft:11, marginBottom:10 }}>
              <div style={{ fontFamily:T.mono, fontSize:7, letterSpacing:'.38em', color:T.inkFaint, textTransform:'uppercase', marginBottom:4 }}>Último balanço</div>
              <p style={{ fontFamily:T.body, fontSize:12, lineHeight:1.7, color:T.inkDim, margin:0 }}>{pd.lastGoalNarrative}</p>
            </div>
          )}

          {/* Meta da temporada */}
          {pd?.seasonGoal && (() => {
            const g = pd.seasonGoal;
            const aColor = { CONSERVATIVE:'rgba(237,232,223,.3)', REALISTIC:'#2860A8', AMBITIOUS:'#F06428' }[g.ambition] ?? sc;
            return (
              <div style={{ marginBottom:10 }}>
                <div style={{ fontFamily:T.mono, fontSize:7, color:T.inkFaint, letterSpacing:'.38em', textTransform:'uppercase', marginBottom:6 }}>Meta · {g.season}</div>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <Pill label={{ CONSERVATIVE:'Conservadora', REALISTIC:'Realista', AMBITIOUS:'Ambiciosa' }[g.ambition] ?? g.ambition} color={aColor} />
                  <span style={{ fontFamily:T.display, fontSize:16, color:sc, letterSpacing:.5 }}>{g.label}</span>
                </div>
                {g.rationale && (
                  <p style={{ fontFamily:T.mono, fontSize:10, color:T.inkFaint, borderLeft:`2px solid ${sc}44`, paddingLeft:9, marginTop:8, lineHeight:1.65, fontStyle:'italic' }}>
                    "{g.rationale}"
                  </p>
                )}
              </div>
            );
          })()}

          {/* Marcos */}
          {milestones.length > 0 && (
            <div>
              <div style={{ fontFamily:T.mono, fontSize:7, letterSpacing:'.38em', color:T.inkFaint, textTransform:'uppercase', marginBottom:6 }}>Marcos da parceria</div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:5 }}>
                {milestones.map((m, i) => {
                  const mDef = MILESTONE_TYPES[m.type] ?? {};
                  return (
                    <div key={i} style={{ display:'inline-flex', alignItems:'center', gap:4, fontFamily:T.mono, fontSize:8, padding:'3px 9px', background:'rgba(237,232,223,.05)', border:'1px solid rgba(237,232,223,.09)', color:T.inkDim }}>
                      <span>{mDef.icon ?? '⭐'}</span>
                      <span>{m.label ?? m.type}</span>
                      <span style={{ color:T.inkFaint }}>{m.season}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

      ) : (
        <div style={{ textAlign:'center', padding:'28px 18px', border:'1px dashed rgba(237,232,223,.09)', marginBottom:18 }}>
          <div style={{ fontSize:38, marginBottom:8, animation:'cpv2-float 3s ease-in-out infinite', display:'inline-block' }}>🎓</div>
          <div style={{ fontFamily:T.display, fontSize:11, letterSpacing:5, color:'rgba(237,232,223,.16)', textTransform:'uppercase' }}>
            {coach.coachStatus === 'RETIRED' ? 'Aposentado do circuito' : 'Sem Pupilo no Momento'}
          </div>
        </div>
      )}

      {/* Histórico de pupilos */}
      {formerPupils.length > 0 && (
        <>
          <Sh sc={sc}>Histórico de Pupilos</Sh>
          {[...formerPupils].reverse().map((e, i) => {
            const seasons    = (e.endSeason ?? 0) - (e.startSeason ?? 0);
            const reason     = DISMISSAL_LABEL[e.dismissalReason] ?? e.dismissalReason ?? '—';
            const titleColor = e.titlesUnder > 0 ? T.gold : T.inkFaint;
            const rankColor  = (e.peakRankUnder ?? 999) <= 10 ? '#22C55E' : T.inkFaint;
            return (
              <div key={i} className="cpv2-hrow">
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontFamily:T.display, fontSize:14, color:T.inkDim, textTransform:'uppercase', letterSpacing:.5, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                    {e.playerName ?? e.name ?? '—'}
                  </div>
                  <div style={{ fontFamily:T.mono, fontSize:8, color:T.inkFaint, marginTop:2 }}>
                    {e.startSeason} – {e.endSeason} · {seasons} temp.
                  </div>
                </div>
                <div style={{ textAlign:'center', minWidth:40 }}>
                  <div style={{ fontFamily:T.display, fontSize:17, color:titleColor }}>{e.titlesUnder ?? 0}</div>
                  <div style={{ fontFamily:T.mono, fontSize:7, color:T.inkFaint }}>títulos</div>
                </div>
                <div style={{ textAlign:'center', minWidth:40 }}>
                  <div style={{ fontFamily:T.display, fontSize:15, color:rankColor }}>
                    {(e.peakRankUnder ?? 999) < 999 ? `#${e.peakRankUnder}` : '—'}
                  </div>
                  <div style={{ fontFamily:T.mono, fontSize:7, color:T.inkFaint }}>pico</div>
                </div>
                <div style={{ fontFamily:T.mono, fontSize:7, color:T.inkFaint, minWidth:74, textAlign:'right' }}>{reason}</div>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// ABA 4 — TRAJETÓRIA
// ─────────────────────────────────────────────────────────────────
function TabTrajetoria({ coach, sc }) {
  const sm       = STATUS_META[coach.coachStatus ?? 'FREE_AGENT'] ?? STATUS_META.FREE_AGENT;
  const repNow   = Math.round(coach.reputation ?? 0);
  const repPeak  = Math.round(coach.reputationPeak ?? repNow);
  const drop     = repPeak - repNow;
  const formerP  = [...(coach.formerPupils ?? [])].sort((a, b) => (a.startSeason ?? 0) - (b.startSeason ?? 0));
  const totalTitles = formerP.reduce((a, h) => a + (h.titlesUnder ?? 0), 0);

  return (
    <div className="cpv2-scroll" style={{ flex:1, padding:'20px 22px', overflowY:'auto' }}>

      {/* Stats de carreira */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:2, marginBottom:18 }}>
        <StatCard label="Pupilos"     value={formerP.length + (coach.currentPupilId?1:0)} color={sc} />
        <StatCard label="Títulos"     value={totalTitles}                                  color={T.gold} />
        <StatCard label="XP total"    value={coach.coachingXP ?? 0}                       color={T.inkDim} />
      </div>

      {/* Reputação */}
      <Sh sc={sc}>Reputação</Sh>
      <div style={{ border:`1px solid ${sc}28`, background:`${sc}07`, padding:'16px 17px', marginBottom:16 }}>
        <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', marginBottom:10 }}>
          <div>
            <div style={{ fontFamily:T.display, fontSize:40, color:sc, lineHeight:1 }}>{repNow}</div>
            <div style={{ fontFamily:T.mono, fontSize:7, color:T.inkFaint, letterSpacing:2, marginTop:3 }}>ATUAL</div>
          </div>
          {repPeak !== repNow && (
            <div style={{ textAlign:'right' }}>
              <div style={{ fontFamily:T.display, fontSize:26, color:T.inkFaint, lineHeight:1 }}>{repPeak}</div>
              <div style={{ fontFamily:T.mono, fontSize:7, color:T.inkFaint, letterSpacing:2, marginTop:3 }}>PICO</div>
            </div>
          )}
        </div>
        <Bar value={repNow} color={sc} height={5} showGlow />
        {drop > 5 && (
          <div style={{ fontFamily:T.mono, fontSize:8, color:'#F44336', marginTop:6, letterSpacing:1 }}>
            ▼ {drop} pts desde o pico
          </div>
        )}
      </div>

      {/* Ciclo de vida */}
      <Sh sc={sc}>Ciclo de Vida</Sh>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:2, marginBottom:12 }}>
        <StatCard label="Idade"            value={coach.age ?? '—'}              color={sc} />
        <StatCard label="Início carreira"  value={coach._createdSeason ?? '—'}   color={T.inkDim} small />
        <StatCard label="Status"           value={sm.label}                       color={sm.color} small />
      </div>
      <div style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 16px', border:`1px solid ${sm.color}26`, background:`${sm.color}07`, marginBottom:18 }}>
        <span style={{ color:sm.color, fontSize:16 }}>●</span>
        <div>
          <div style={{ fontFamily:T.cond, fontWeight:700, fontSize:15, color:sm.color, letterSpacing:'.05em', textTransform:'uppercase' }}>{sm.label}</div>
          {coach._retiredSeason && <div style={{ fontFamily:T.mono, fontSize:8, color:T.inkFaint, marginTop:2, letterSpacing:1 }}>Aposentou na temporada {coach._retiredSeason}</div>}
          {coach._hiatusSeason  && <div style={{ fontFamily:T.mono, fontSize:8, color:T.inkFaint, marginTop:2, letterSpacing:1 }}>Em pausa desde {coach._hiatusSeason}</div>}
        </div>
      </div>

      {/* Linha do tempo */}
      {formerP.length > 0 && (
        <>
          <Sh sc={sc}>Linha do Tempo</Sh>
          <div style={{ position:'relative', paddingLeft:24, marginBottom:8 }}>
            {/* Trilho vertical */}
            <div style={{ position:'absolute', left:8, top:10, bottom:10, width:1, background:T.line }} />

            {formerP.map((e, i) => {
              const seasons   = (e.endSeason ?? 0) - (e.startSeason ?? 0);
              const hasTitles = e.titlesUnder > 0;
              const isTop10   = (e.peakRankUnder ?? 999) <= 10;
              const dotColor  = hasTitles ? T.gold : isTop10 ? '#22C55E' : T.inkFaint;
              return (
                <div key={i} style={{ position:'relative', marginBottom:16, paddingLeft:16 }}>
                  {/* Ponto */}
                  <div style={{ position:'absolute', left:-16, top:5, width:9, height:9, borderRadius:'50%', background:hasTitles?T.gold:'rgba(237,232,223,.06)', border:`1.5px solid ${dotColor}`, boxShadow:hasTitles?`0 0 7px ${T.gold}66`:undefined }} />

                  <div style={{ fontFamily:T.display, fontSize:15, color:T.inkDim, textTransform:'uppercase', letterSpacing:.5 }}>
                    {e.playerName ?? '—'}
                  </div>
                  <div style={{ fontFamily:T.mono, fontSize:7, color:T.inkFaint, marginTop:2, letterSpacing:1 }}>
                    {e.startSeason} – {e.endSeason} · {seasons} temp.
                  </div>
                  {(hasTitles || isTop10) && (
                    <div style={{ display:'flex', gap:4, marginTop:4, flexWrap:'wrap' }}>
                      {hasTitles && (
                        <span style={{ fontFamily:T.mono, fontSize:7, color:T.gold, padding:'1px 6px', border:'1px solid rgba(232,200,74,.28)', background:'rgba(232,200,74,.07)' }}>
                          🏆 {e.titlesUnder} título{e.titlesUnder > 1 ? 's' : ''}
                        </span>
                      )}
                      {isTop10 && (
                        <span style={{ fontFamily:T.mono, fontSize:7, color:'#22C55E', padding:'1px 6px', border:'1px solid rgba(34,197,94,.28)', background:'rgba(34,197,94,.07)' }}>
                          Top 10
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// ABA 5 — TIMELINE (objetivos ano a ano + mudanças de técnico)
// ─────────────────────────────────────────────────────────────────

const OUTCOME_META = {
  EXCEEDED: { label: 'Superado',   icon: '🌟', color: '#22C55E', dim: 'rgba(34,197,94,.12)'   },
  MET:      { label: 'Cumprido',   icon: '✅', color: '#4CAF50', dim: 'rgba(76,175,80,.10)'   },
  PARTIAL:  { label: 'Parcial',    icon: '⚡', color: '#FF9800', dim: 'rgba(255,152,0,.10)'   },
  FAILED:   { label: 'Falhou',     icon: '❌', color: '#F44336', dim: 'rgba(244,67,54,.10)'   },
  ACTIVE:   { label: 'Em curso',   icon: '🎯', color: '#2860A8', dim: 'rgba(40,96,168,.10)'   },
};

const AMBITION_COLOR = {
  CONSERVATIVE: 'rgba(237,232,223,.28)',
  REALISTIC:    '#2860A8',
  AMBITIOUS:    '#F06428',
};

function GoalRow({ entry, isActive = false, sc }) {
  const meta = isActive ? OUTCOME_META.ACTIVE : (OUTCOME_META[entry.outcome] ?? OUTCOME_META.PARTIAL);
  const ambColor = AMBITION_COLOR[entry.ambition] ?? sc;

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '52px 1fr auto',
      alignItems: 'center',
      gap: 10,
      padding: '9px 12px',
      background: meta.dim,
      border: `1px solid ${meta.color}22`,
      borderLeft: `3px solid ${meta.color}`,
      marginBottom: 4,
    }}>
      {/* Ano */}
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontFamily: T.mono, fontSize: 9, color: T.inkFaint, letterSpacing: 1 }}>{entry.season}</div>
      </div>

      {/* Meta */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
          <span style={{
            fontFamily: T.mono, fontSize: 6, letterSpacing: 1,
            padding: '1px 5px',
            background: `${ambColor}18`,
            border: `1px solid ${ambColor}44`,
            color: ambColor,
          }}>
            {{ CONSERVATIVE: 'CONSERVADORA', REALISTIC: 'REALISTA', AMBITIOUS: 'AMBICIOSA' }[entry.ambition] ?? entry.ambition}
          </span>
        </div>
        <div style={{ fontFamily: T.cond, fontWeight: 700, fontSize: 13, color: T.ink, letterSpacing: '.03em' }}>
          {entry.goalLabel ?? entry.goalType}
        </div>
        {entry.narrative && (
          <div style={{ fontFamily: T.mono, fontSize: 8, color: T.inkFaint, marginTop: 2, lineHeight: 1.5, fontStyle: 'italic' }}>
            {entry.narrative}
          </div>
        )}
      </div>

      {/* Resultado */}
      <div style={{ textAlign: 'center', minWidth: 58 }}>
        <div style={{ fontSize: 15 }}>{meta.icon}</div>
        <div style={{ fontFamily: T.mono, fontSize: 7, color: meta.color, letterSpacing: 1, marginTop: 2 }}>
          {meta.label}
        </div>
        {entry.bondDelta !== undefined && !isActive && (
          <div style={{
            fontFamily: T.mono, fontSize: 7, marginTop: 2,
            color: entry.bondDelta >= 0 ? '#22C55E' : '#F44336',
          }}>
            {entry.bondDelta >= 0 ? '+' : ''}{entry.bondDelta} bond
          </div>
        )}
      </div>
    </div>
  );
}

function PartnershipBlock({ name, startSeason, endSeason, goalHistory = [], bondHistory = [], milestones = [], finalBond, partnershipNickname, isCurrent = false, currentGoal = null, sc }) {
  const years = endSeason ? endSeason - startSeason : '?';
  const wonTitles = goalHistory.filter(g => g.outcome === 'EXCEEDED' || g.outcome === 'MET').length;
  const totalGoals = goalHistory.length;

  const bondColor = finalBond >= 70 ? '#22C55E' : finalBond >= 45 ? T.gold : '#F44336';

  return (
    <div style={{
      marginBottom: 24,
      borderLeft: `2px solid ${isCurrent ? sc : 'rgba(237,232,223,.12)'}`,
      paddingLeft: 16,
    }}>
      {/* Header do bloco */}
      <div style={{
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        marginBottom: 10,
        paddingBottom: 8,
        borderBottom: `1px solid rgba(237,232,223,.06)`,
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {isCurrent && (
              <span style={{
                fontFamily: T.mono, fontSize: 6, letterSpacing: 2, padding: '2px 6px',
                background: `${sc}18`, border: `1px solid ${sc}44`, color: sc,
              }}>ATUAL</span>
            )}
            <div style={{ fontFamily: T.display, fontSize: 18, color: isCurrent ? sc : T.inkDim, textTransform: 'uppercase', letterSpacing: .5 }}>
              {name}
            </div>
          </div>
          <div style={{ fontFamily: T.mono, fontSize: 8, color: T.inkFaint, marginTop: 3, letterSpacing: 1 }}>
            {startSeason}{endSeason ? ` – ${endSeason}` : ' → presente'} · {isCurrent ? `${goalHistory.length + (currentGoal ? 0 : 0)} temp.` : `${years} temp.`}
          </div>
          {partnershipNickname && (
            <div style={{ marginTop: 5 }}>
              <span style={{
                fontFamily: T.mono, fontSize: 7, letterSpacing: '.18em', padding: '2px 8px',
                background: 'rgba(232,200,74,.07)', border: '1px solid rgba(232,200,74,.22)', color: T.gold,
              }}>✦ {partnershipNickname}</span>
            </div>
          )}
        </div>

        <div style={{ textAlign: 'right', flexShrink: 0, display: 'flex', gap: 12, alignItems: 'center' }}>
          {/* Bond final */}
          {finalBond !== null && finalBond !== undefined && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: T.display, fontSize: 26, color: bondColor, lineHeight: 1 }}>
                {Math.round(finalBond)}
              </div>
              <div style={{ fontFamily: T.mono, fontSize: 6, color: T.inkFaint, letterSpacing: 1 }}>BOND</div>
            </div>
          )}
          {/* Taxa de cumprimento */}
          {totalGoals > 0 && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: T.display, fontSize: 22, color: wonTitles / totalGoals >= .6 ? '#22C55E' : T.gold, lineHeight: 1 }}>
                {Math.round((wonTitles / totalGoals) * 100)}%
              </div>
              <div style={{ fontFamily: T.mono, fontSize: 6, color: T.inkFaint, letterSpacing: 1 }}>METAS</div>
            </div>
          )}
        </div>
      </div>

      {/* Marcos */}
      {milestones.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
          {milestones.map((m, i) => (
            <span key={i} style={{
              fontFamily: T.mono, fontSize: 7, padding: '2px 7px',
              background: 'rgba(237,232,223,.04)', border: '1px solid rgba(237,232,223,.09)',
              color: T.inkFaint,
            }}>
              {m.icon ?? '⭐'} {m.label ?? m.type} <span style={{ color: 'rgba(237,232,223,.2)' }}>{m.season}</span>
            </span>
          ))}
        </div>
      )}

      {/* Objetivos ano a ano */}
      {goalHistory.length === 0 && !currentGoal ? (
        <div style={{ fontFamily: T.mono, fontSize: 9, color: T.inkGhost, padding: '10px 0', textAlign: 'center', letterSpacing: 1 }}>
          SEM HISTÓRICO DE OBJETIVOS
        </div>
      ) : (
        <div>
          {goalHistory.map((entry, i) => (
            <GoalRow key={i} entry={entry} sc={sc} />
          ))}
          {/* Meta atual (sem resultado ainda) */}
          {currentGoal && (
            <GoalRow
              entry={{
                season:    currentGoal.season,
                goalLabel: currentGoal.label,
                goalType:  currentGoal.type,
                ambition:  currentGoal.ambition,
                narrative: currentGoal.rationale,
              }}
              isActive
              sc={sc}
            />
          )}
        </div>
      )}
    </div>
  );
}

function TabTimeline({ coach, allPlayers, sc }) {
  const pupilId   = coach.currentPupilId;
  const pupil     = pupilId ? (allPlayers ?? []).find(p => p.id === pupilId) ?? null : null;
  const pd        = pupil?.coach ?? null;
  const formerPupils = [...(coach.formerPupils ?? [])];

  // Constrói o histórico do jogador atual a partir do player.coachHistory
  // para saber em que anos eles mudaram de técnico
  const playerHistory = pupil?.coachHistory ?? [];

  // Bloco da parceria atual
  const currentBlock = pupil ? {
    name:               pupil.name,
    startSeason:        pd?.startSeason,
    endSeason:          null,
    goalHistory:        pd?.goalHistory ?? [],
    bondHistory:        pd?.bondHistory ?? [],
    milestones:         pd?.milestones  ?? [],
    finalBond:          pd?.bondScore   ?? null,
    partnershipNickname: pd?.partnershipNickname ?? null,
    currentGoal:        pd?.seasonGoal  ?? null,
    isCurrent:          true,
  } : null;

  // Blocos de ex-pupilos — lidos do coachHistory do pupil atual
  // e do formerPupils do coach (que tem histórico antigo de outros jogadores)
  // Usamos o playerHistory para enriquecer com goalHistory se disponível
  const formerBlocks = [...playerHistory]
    .filter(h => h.coachId === coach.id)
    .map(h => ({
      name:               pupil?.name ?? '—',
      startSeason:        h.startSeason,
      endSeason:          h.endSeason,
      goalHistory:        h.goalHistory ?? [],
      bondHistory:        h.bondHistory ?? [],
      milestones:         h.milestones  ?? [],
      finalBond:          h.finalBond   ?? null,
      partnershipNickname: h.partnershipNickname ?? null,
    }));

  // Também inclui outros ex-pupilos do pool do coach
  // (formerPupils tem dados básicos mas pode ter goalHistory se detachCoach foi corrigido)
  const otherFormerBlocks = formerPupils.map(fp => ({
    name:               fp.playerName ?? fp.name ?? '—',
    startSeason:        fp.startSeason,
    endSeason:          fp.endSeason,
    goalHistory:        fp.goalHistory ?? [],
    bondHistory:        fp.bondHistory ?? [],
    milestones:         fp.milestones  ?? [],
    finalBond:          fp.finalBond   ?? null,
    partnershipNickname: fp.partnershipNickname ?? null,
    isFP:               true,
  })).filter(b => !formerBlocks.some(fb => fb.startSeason === b.startSeason));

  const allFormer = [...formerBlocks, ...otherFormerBlocks]
    .sort((a, b) => (b.startSeason ?? 0) - (a.startSeason ?? 0));

  const hasAnything = currentBlock || allFormer.length > 0;

  return (
    <div className="cpv2-scroll" style={{ flex: 1, padding: '20px 22px', overflowY: 'auto' }}>

      {/* Legenda */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
        {Object.entries(OUTCOME_META).filter(([k]) => k !== 'ACTIVE').map(([k, m]) => (
          <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ fontSize: 10 }}>{m.icon}</span>
            <span style={{ fontFamily: T.mono, fontSize: 7, color: m.color, letterSpacing: 1 }}>{m.label}</span>
          </div>
        ))}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ fontSize: 10 }}>{OUTCOME_META.ACTIVE.icon}</span>
          <span style={{ fontFamily: T.mono, fontSize: 7, color: OUTCOME_META.ACTIVE.color, letterSpacing: 1 }}>Em curso</span>
        </div>
      </div>

      {!hasAnything ? (
        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>📋</div>
          <div style={{ fontFamily: T.mono, fontSize: 9, color: T.inkGhost, letterSpacing: 2 }}>
            SEM HISTÓRICO DE PARCERIAS
          </div>
        </div>
      ) : (
        <>
          {/* Parceria atual */}
          {currentBlock && (
            <>
              <Sh sc={sc}>Parceria Atual</Sh>
              <PartnershipBlock {...currentBlock} sc={sc} />
            </>
          )}

          {/* Ex-pupilos */}
          {allFormer.length > 0 && (
            <>
              <Sh sc={sc}>Parcerias Anteriores</Sh>
              {allFormer.map((block, i) => (
                <PartnershipBlock key={i} {...block} sc={sc} />
              ))}
            </>
          )}
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// TABBAR CONFIG
// ─────────────────────────────────────────────────────────────────
const TABS = [
  { id:'identidade',  name:'IDENTIDADE',  icon:'👤' },
  { id:'metodo',      name:'MÉTODO',      icon:'🔬' },
  { id:'parceria',    name:'PARCERIA',    icon:'🤝' },
  { id:'timeline',    name:'TIMELINE',    icon:'📅' },
  { id:'trajetoria',  name:'TRAJETÓRIA',  icon:'📈' },
];

// ─────────────────────────────────────────────────────────────────
// MAIN EXPORT
// ─────────────────────────────────────────────────────────────────
export default function CoachProfileView({ coach, year = 2025, allPlayers = [], onBack, activeTab: activeProp }) {
  injectCSS();
  const [_tab, setTab] = useState(activeProp ?? 'identidade');
  const activeTab = activeProp ?? _tab;

  if (!coach) return null;

  const phil    = PHIL_META[coach.philosophy];
  const retired = coach.coachStatus === 'RETIRED';
  const sc      = retired ? 'rgba(237,232,223,.32)' : (phil?.color ?? '#E8C84A');
  const scRgb   = retired ? '237,232,223'           : (phil?.rgb  ?? '232,200,74');

  return (
    <div className="cpv2-root" style={{ '--sc':sc, '--sc-rgb':scRgb }}>

      {/* Chrome / back */}
      {onBack && (
        <div className="cpv2-chrome">
          <button className="cpv2-back" onClick={onBack}>← Técnicos</button>
          <span style={{ fontFamily:T.mono, fontSize:8, color:T.inkFaint, letterSpacing:2, flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
            {coach.fullName ?? coach.name}
          </span>
        </div>
      )}

      {/* Hero */}
      <CoachHero coach={coach} sc={sc} scRgb={scRgb} />

      {/* Tab bar */}
      <div className="cpv2-tabbar">
        {TABS.map(tab => (
          <button
            key={tab.id}
            className={`cpv2-tab${activeTab === tab.id ? ' act' : ''}`}
            onClick={() => setTab(tab.id)}
          >
            <span className="cpv2-tab-dot" />
            <span>{tab.icon}</span>
            <span>{tab.name}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="cpv2-content" key={activeTab}>
        {activeTab === 'identidade' && <TabIdentidade coach={coach} sc={sc} />}
        {activeTab === 'metodo'     && <TabMetodo     coach={coach} sc={sc} />}
        {activeTab === 'parceria'   && <TabParceria   coach={coach} allPlayers={allPlayers} sc={sc} />}
        {activeTab === 'timeline'   && <TabTimeline   coach={coach} allPlayers={allPlayers} sc={sc} />}
        {activeTab === 'trajetoria' && <TabTrajetoria coach={coach} sc={sc} />}
      </div>

    </div>
  );
}
