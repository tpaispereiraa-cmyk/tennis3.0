/**
 * UnifiedPlayerProfile2.jsx
 * ─────────────────────────────────────────────────────────────────
 * Ficha completa do jogador — 8 abas, reimaginada do zero.
 *
 * ABAS:
 *   1. IDENTIDADE   — quem é fora da quadra (personalidade dinâmica)
 *   2. JOGO         — como joga (estilo + todos os atributos)
 *   3. CARREIRA     — o que conquistou (títulos + careerMoments)
 *   4. TRAJETÓRIA   — como evoluiu (gráficos OVR/ranking + desenvolvimento)
 *   5. RESULTADOS   — como se saiu nos torneios (+ superfícies)
 *   6. RIVALIDADES  — com quem tem histórias
 *   7. FÍSICO & DNA — estado do atleta + traits
 *   8. TÉCNICO      — com quem trabalha e onde prefere jogar
 */

import React, { useState, useCallback, useRef, useMemo } from 'react';
import {
  NAMED_PLAYERS, NAMED_PLAYER_KEYS,
  ATTR_CATEGORIES, catAvg, overallRating, overallGrade,
  getPlayerPhoto,
} from '../players.js';
import {
  ovrTier, attrDescriptor, catDescriptor, attrTierVisual,
  topStrengths, topWeaknesses, potentialNarrative, arcNarrative,
  phaseLabel as scoutPhaseLabel, scoutSummary,
} from '../ScoutProfile.js';
import { buildPerceptionNarrative, getMarketAssessment } from '../CircuitPerceptions.js';
import { RALLY_PATTERNS } from '../styles.js';
import { SIGNATURE_SHOTS as NEW_SIGNATURE_SHOTS } from '../SignatureShots.js';
import { getPotentialCategory, getCareerArc, ALCUNHA_BY_ID } from '../DevelopmentConstants.js';
import { getBurdenAffectedAttrs } from '../DevelopmentSystem.js';
import FormaTab from '../formas.jsx';
import {
  INJURY_TYPES, INJURY_GRADES,
  physicalConditionLabel, injuryStatusLabel, ensurePhysicalCondition,
} from '../InjurySystem.js';
import { computeRetirementChance, retirementRiskLabel } from '../RetirementSystem.js';
import { TRAIT_CATALOG, getPlayerTraits } from '../TraitSystem.js';
import { COACH_ATTR_CATEGORIES, coachOverallRating, coachGrade } from '../CoachProfiles.js';
import { PARTNERSHIP_STATES, GOAL_TYPES, MILESTONE_TYPES } from '../CoachPartnershipSystem.js';
import { getPlayerRank } from '../RankingSystem.js';
import CarreiraTimeline from './CarreiraTimeline.jsx';
import { migratePlayerLifeData } from '../PlayerLifeData.js';
import {
  generateInterview, generateSingleQA,
  INTERVIEW_CONTEXTS, TOPIC_META, TOPIC_IDS,
} from '../InterviewEngine.js';
import { getOffCourtState } from '../LifeEventSystem.js';
import {
  migratePlayerPersonality, getPersonalityHooks,
  PRESS_PERSONAS, COMPETITIVE_ARCHETYPES, REPUTATIONS, getMarketabilityTier,
} from '../PlayerPersonality.js';
import {
  PREFERABLE_TOURNAMENTS, PREFERENCE_BONUS,
  getTopFavoriteTournaments, getBottomTournaments, migrateTournamentPreferences,
} from '../TournamentPreferences.js';
import { formatUSD, getFinancialPressure, getCoachSalary, ROUND_PRIZE_LABEL, CAT_PRIZE_LABEL, PRIZE_MONEY, initPlayerFinance } from '../FinanceSystem.js';
import { computeIFR, computeVisibility, computeSponsorSignal, getPhaseTwoTier, IFR_TIERS } from '../PhaseTwo.js';
import { SPONSOR_TIERS } from '../SponsorProfiles.js';
import { getSponsorshipProfile } from '../SponsorContractSystem.js';
import {
  getBuildStyleMeta, getNetGameMeta, getRallyCadenceMeta, getRiskProfileMeta,
  adaptabilityLabel, generatePrefs, getArchetype,
} from '../playerPrefs.js';

// ─────────────────────────────────────────────────────────────────
// DESIGN SYSTEM
// ─────────────────────────────────────────────────────────────────
const T = {
  // Backgrounds
  bg0:    '#050709',
  bg1:    '#080C0F',
  bg2:    '#0C1217',
  bg3:    '#111920',
  bg4:    '#182028',

  // Text
  ink:    '#EDE8DF',
  inkDim: 'rgba(237,232,223,.52)',
  inkFaint:'rgba(237,232,223,.24)',
  inkGhost:'rgba(237,232,223,.08)',

  // Borders
  line:   'rgba(237,232,223,.07)',
  lineMid:'rgba(237,232,223,.13)',

  // Accent (clay/surface — overridden per player)
  clay:   '#D4561E',
  gold:   '#E8C84A',

  // Fonts
  display: "'Bebas Neue', sans-serif",
  cond:    "'Barlow Condensed', sans-serif",
  body:    "'Barlow', sans-serif",
  mono:    "'Space Mono', monospace",
};

// ─────────────────────────────────────────────────────────────────
// CSS INJECTION
// ─────────────────────────────────────────────────────────────────
function injectCSS() {
  if (document.getElementById('upp2-css')) return;
  const css = `
@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Space+Mono:wght@400;700&family=Barlow+Condensed:ital,wght@0,300;0,400;0,600;0,700;0,900;1,600&family=Barlow:wght@300;400;500;600&display=swap');

@keyframes upp2-in    { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
@keyframes upp2-hero  { from{opacity:0;transform:scale(1.04)} to{opacity:1;transform:scale(1)} }
@keyframes upp2-bar   { from{transform:scaleX(0)} to{transform:scaleX(1)} }
@keyframes upp2-float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
@keyframes upp2-pulse { 0%,100%{opacity:.35} 50%{opacity:.9} }

.upp2-root {
  width:100%; height:100vh;
  background:#050709;
  color:#EDE8DF;
  font-family:'Barlow',sans-serif;
  display:flex; flex-direction:column;
  overflow:hidden; position:relative;
}

/* scrollbar */
.upp2-scroll { overflow-y:auto; scrollbar-width:thin; scrollbar-color:rgba(212,86,30,.4) transparent; }
.upp2-scroll::-webkit-scrollbar { width:2px; }
.upp2-scroll::-webkit-scrollbar-thumb { background:rgba(212,86,30,.35); }

/* chrome */
.upp2-chrome {
  height:42px; flex-shrink:0;
  background:rgba(5,7,9,.97);
  border-bottom:1px solid rgba(237,232,223,.06);
  display:flex; align-items:center; padding:0 20px; gap:14px;
  z-index:40; backdrop-filter:blur(20px);
}

.upp2-chrome-btn {
  font-family:'Space Mono',monospace; font-size:8px; letter-spacing:.3em;
  text-transform:uppercase; background:none;
  border:1px solid rgba(237,232,223,.08);
  color:rgba(237,232,223,.38); padding:5px 14px; cursor:pointer;
  transition:all .13s; flex-shrink:0;
  clip-path:polygon(4px 0,100% 0,calc(100% - 4px) 100%,0 100%);
}
.upp2-chrome-btn:hover { background:rgba(237,232,223,.05); color:#EDE8DF; border-color:rgba(237,232,223,.16); }
.upp2-chrome-btn:disabled { opacity:.15; pointer-events:none; }

/* hero */
.upp2-hero {
  position:relative; flex-shrink:0;
  height:clamp(200px,24vh,280px);
  overflow:hidden;
}
.upp2-hero-photo {
  position:absolute; inset:0;
}
.upp2-hero-photo img {
  position:absolute; inset:0; width:100%; height:100%;
  object-fit:cover; object-position:center 15%;
  filter:brightness(.5) saturate(.7);
  animation:upp2-hero .6s ease both;
}
.upp2-hero-grad-l { position:absolute;inset:0;background:linear-gradient(90deg,rgba(5,7,9,.97) 0%,rgba(5,7,9,.7) 50%,rgba(5,7,9,.15) 100%); }
.upp2-hero-grad-b { position:absolute;inset:0;background:linear-gradient(0deg,rgba(5,7,9,1) 0%,rgba(5,7,9,.45) 38%,transparent 72%); }
.upp2-hero-grad-r { position:absolute;inset:0;background:linear-gradient(270deg,rgba(5,7,9,.88) 0%,transparent 55%); }
.upp2-hero-stripe { position:absolute;top:0;left:0;right:0;height:2px; background:linear-gradient(90deg,var(--sc,#D4561E) 0%,rgba(212,86,30,.2) 70%,transparent 100%); z-index:2; }
.upp2-hero-num {
  position:absolute; right:-6px; top:50%;
  transform:translateY(-52%);
  font-family:'Bebas Neue',sans-serif;
  font-size:clamp(140px,20vw,220px); line-height:.82;
  color:var(--sc,#D4561E); opacity:.045;
  pointer-events:none; user-select:none; z-index:1;
}
.upp2-hero-content {
  position:absolute; inset:0; z-index:3;
  display:flex; align-items:flex-end;
  padding:0 clamp(20px,3vw,48px) clamp(16px,2.2vh,26px);
  gap:clamp(20px,3.5vw,48px);
}
.upp2-hero-info { flex:1; min-width:0; animation:upp2-in .4s .05s both; }
.upp2-hero-eyebrow {
  display:flex; align-items:center; gap:8px; margin-bottom:8px;
}
.upp2-hero-eyebrow::before { content:''; width:20px; height:2px; background:var(--sc,#D4561E); flex-shrink:0; }
.upp2-hero-nat { font-family:'Space Mono',monospace; font-size:8px; letter-spacing:.42em; color:var(--sc,#D4561E); text-transform:uppercase; }
.upp2-hero-rank { font-family:'Space Mono',monospace; font-size:8px; letter-spacing:.28em; color:rgba(237,232,223,.3); text-transform:uppercase; }
.upp2-hero-name {
  font-family:'Bebas Neue',sans-serif;
  font-size:clamp(44px,6vw,84px); letter-spacing:.02em;
  color:#EDE8DF; text-transform:uppercase; line-height:.88;
  text-shadow:0 2px 28px rgba(0,0,0,.7);
}
.upp2-hero-nick { font-family:'Space Mono',monospace; font-size:8px; letter-spacing:.28em; color:rgba(237,232,223,.28); margin-top:4px; font-style:italic; }
.upp2-hero-meta { display:flex; align-items:center; margin-top:8px; }
.upp2-hero-meta-item { font-family:'Space Mono',monospace; font-size:8px; letter-spacing:.26em; color:rgba(237,232,223,.35); text-transform:uppercase; padding:0 10px; }
.upp2-hero-meta-item:first-child { padding-left:0; }
.upp2-hero-meta-sep { width:1px; height:9px; background:rgba(237,232,223,.12); flex-shrink:0; }
.upp2-hero-badges { display:flex; align-items:center; gap:6px; flex-wrap:wrap; margin-top:8px; }
.upp2-style-badge {
  font-family:'Barlow Condensed',sans-serif; font-weight:700;
  font-size:10px; letter-spacing:.16em; text-transform:uppercase;
  padding:4px 11px 3px; display:inline-flex; align-items:center; gap:5px;
  background:rgba(var(--sc-rgb,212,86,30),.12);
  border:1px solid rgba(var(--sc-rgb,212,86,30),.35);
  color:var(--sc,#D4561E);
  clip-path:polygon(4px 0,100% 0,calc(100% - 4px) 100%,0 100%);
}
.upp2-alcunha-badge {
  font-family:'Space Mono',monospace; font-size:8px; letter-spacing:.24em;
  text-transform:uppercase; padding:4px 10px;
  background:rgba(232,200,74,.07); border:1px solid rgba(232,200,74,.25);
  color:#E8C84A;
  clip-path:polygon(4px 0,100% 0,calc(100% - 4px) 100%,0 100%);
}
.upp2-hero-ovr { flex-shrink:0; display:flex; flex-direction:column; align-items:center; justify-content:flex-end; padding-bottom:2px; animation:upp2-in .4s .1s both; }
.upp2-ovr-label { font-family:'Space Mono',monospace; font-size:7px; letter-spacing:.5em; color:rgba(237,232,223,.22); text-transform:uppercase; }
.upp2-ovr-num { font-family:'Bebas Neue',sans-serif; font-size:clamp(68px,9.5vw,112px); line-height:.82; letter-spacing:.01em; color:var(--sc,#D4561E); text-shadow:0 0 40px rgba(var(--sc-rgb,212,86,30),.4); }
.upp2-ovr-grade { font-family:'Bebas Neue',sans-serif; font-size:clamp(18px,2.5vw,30px); letter-spacing:.08em; color:rgba(237,232,223,.5); }
.upp2-ovr-div { width:36px; height:1px; background:linear-gradient(90deg,transparent,var(--sc,#D4561E),transparent); margin:5px 0; }

/* tabbar */
.upp2-tabbar {
  display:flex; align-items:stretch;
  background:rgba(5,7,9,.98);
  border-bottom:2px solid rgba(237,232,223,.06);
  overflow-x:auto; flex-shrink:0; scrollbar-width:none;
  box-shadow:0 2px 24px rgba(0,0,0,.6);
}
.upp2-tabbar::-webkit-scrollbar { display:none; }
.upp2-tab-shell {
  display:flex; flex-direction:column; flex-shrink:0;
  border-bottom:1px solid rgba(237,232,223,.06);
  background:linear-gradient(180deg,rgba(5,7,9,.98) 0%,rgba(8,12,15,.96) 100%);
}
.upp2-groupbar {
  display:flex; gap:8px; padding:10px 18px 8px;
  overflow-x:auto; scrollbar-width:none;
  border-bottom:1px solid rgba(237,232,223,.05);
}
.upp2-groupbar::-webkit-scrollbar { display:none; }
.upp2-group {
  min-width:fit-content;
  border:1px solid rgba(237,232,223,.08);
  background:rgba(237,232,223,.02);
  padding:8px 12px;
  color:rgba(237,232,223,.42);
  display:flex; flex-direction:column; align-items:flex-start; gap:2px;
  cursor:pointer; transition:all .15s;
  clip-path:polygon(5px 0,100% 0,calc(100% - 5px) 100%,0 100%);
}
.upp2-group:hover { color:rgba(237,232,223,.72); border-color:rgba(237,232,223,.14); background:rgba(237,232,223,.04); }
.upp2-group.act {
  color:#EDE8DF;
  border-color:rgba(var(--sc-rgb,212,86,30),.4);
  background:rgba(var(--sc-rgb,212,86,30),.08);
  box-shadow:inset 0 0 0 1px rgba(var(--sc-rgb,212,86,30),.12);
}
.upp2-group-kicker {
  font-family:'Space Mono',monospace; font-size:7px; letter-spacing:.28em; text-transform:uppercase;
}
.upp2-group-name {
  font-family:'Barlow Condensed',sans-serif; font-size:14px; font-weight:700; letter-spacing:.08em; text-transform:uppercase;
}
.upp2-group-desc {
  font-family:'Barlow',sans-serif; font-size:11px; color:rgba(237,232,223,.44); line-height:1.35;
}
.upp2-tab {
  font-family:'Barlow Condensed',sans-serif; font-weight:700;
  font-size:10px; letter-spacing:.15em; text-transform:uppercase;
  padding:0 18px; height:40px; border:none; background:none;
  color:rgba(237,232,223,.26); cursor:pointer; white-space:nowrap;
  position:relative; flex-shrink:0; transition:color .15s,background .15s;
  display:flex; align-items:center; gap:5px;
}
.upp2-tab:hover { color:rgba(237,232,223,.58); background:rgba(237,232,223,.025); }
.upp2-tab.act { color:#EDE8DF; background:rgba(237,232,223,.035); }
.upp2-tab.act::after {
  content:''; position:absolute; bottom:-2px; left:0; right:0; height:2px;
  background:var(--sc,#D4561E);
  box-shadow:0 0 10px rgba(var(--sc-rgb,212,86,30),.65);
}
.upp2-tab-dot { width:4px; height:4px; border-radius:50%; background:var(--sc,#D4561E); opacity:0; transition:opacity .15s; flex-shrink:0; }
.upp2-tab.act .upp2-tab-dot { opacity:1; box-shadow:0 0 5px var(--sc,#D4561E); }
.upp2-tab-meta {
  display:flex; align-items:center; justify-content:space-between; gap:20px;
  padding:12px 22px 14px;
  background:linear-gradient(180deg,rgba(12,18,23,.96) 0%,rgba(8,12,15,.94) 100%);
  border-top:1px solid rgba(237,232,223,.04);
}
.upp2-tab-meta-copy { min-width:0; }
.upp2-tab-kicker {
  font-family:'Space Mono',monospace; font-size:7px; letter-spacing:.38em; text-transform:uppercase;
  color:var(--sc,#D4561E); margin-bottom:5px;
}
.upp2-tab-title {
  font-family:'Bebas Neue',sans-serif; font-size:28px; line-height:.9; letter-spacing:.04em; color:#EDE8DF;
}
.upp2-tab-desc {
  margin-top:6px; max-width:760px;
  font-family:'Barlow',sans-serif; font-size:13px; line-height:1.6; color:rgba(237,232,223,.52);
}
.upp2-tab-points {
  display:flex; flex-wrap:wrap; gap:6px;
}
.upp2-tab-pill {
  font-family:'Space Mono',monospace; font-size:7px; letter-spacing:.18em; text-transform:uppercase;
  color:rgba(237,232,223,.56); padding:5px 8px;
  border:1px solid rgba(237,232,223,.08); background:rgba(237,232,223,.02);
}

/* tab content */
.upp2-content { flex:1; display:flex; overflow:hidden; min-height:0; animation:upp2-in .2s both; }

/* section head */
.upp2-sh {
  font-family:'Space Mono',monospace; font-size:7px; letter-spacing:.48em;
  color:rgba(237,232,223,.22); text-transform:uppercase;
  display:flex; align-items:center; gap:10px; margin-bottom:12px;
}
.upp2-sh::before { content:''; width:14px; height:1px; background:var(--sc,#D4561E); flex-shrink:0; }
.upp2-sh::after  { content:''; flex:1; height:1px; background:rgba(237,232,223,.05); }

/* sub-tab bar */
.upp2-sub-bar {
  display:flex; border-bottom:1px solid rgba(237,232,223,.07);
  background:rgba(8,12,15,.6); flex-shrink:0; padding:0 14px;
}
.upp2-sub-btn {
  font-family:'Space Mono',monospace; font-size:8px; letter-spacing:.24em;
  text-transform:uppercase; padding:10px 14px; border:none; background:none;
  cursor:pointer; transition:color .15s;
  border-bottom:2px solid transparent;
}
.upp2-sub-btn.act { border-bottom-color:var(--sc,#D4561E); }

/* stat card */
.upp2-stat-card {
  background:rgba(237,232,223,.02); border:1px solid rgba(237,232,223,.07);
  padding:14px 13px; position:relative; overflow:hidden;
  clip-path:polygon(6px 0,100% 0,calc(100% - 6px) 100%,0 100%);
  transition:border-color .15s;
}
.upp2-stat-card::before { content:''; position:absolute; top:0; left:0; right:0; height:1px; background:linear-gradient(90deg,var(--sc,#D4561E),transparent); opacity:.3; }

/* attr bar */
.upp2-attr-wrap { margin-bottom:7px; }
.upp2-attr-head { display:flex; justify-content:space-between; align-items:baseline; margin-bottom:4px; }
.upp2-attr-lbl { font-family:'Barlow Condensed',sans-serif; font-weight:600; font-size:11px; letter-spacing:.05em; text-transform:uppercase; color:rgba(237,232,223,.4); }
.upp2-attr-val { font-family:'Bebas Neue',sans-serif; font-size:18px; line-height:1; }
.upp2-attr-track { height:3px; background:rgba(237,232,223,.06); position:relative; clip-path:polygon(2px 0,100% 0,calc(100% - 2px) 100%,0 100%); }
.upp2-attr-fill  { height:100%; position:absolute; left:0; top:0; transform-origin:left; animation:upp2-bar .5s ease both; }

/* WIP */
.upp2-wip { flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:14px; }
.upp2-wip-icon { font-size:52px; animation:upp2-float 3s ease-in-out infinite; filter:drop-shadow(0 0 18px rgba(212,86,30,.3)); }
.upp2-wip-title { font-family:'Bebas Neue',sans-serif; font-size:20px; letter-spacing:5px; color:rgba(237,232,223,.12); text-transform:uppercase; }

/* info block */
.upp2-ib { border-left:2px solid rgba(var(--acc,212,86,30),.35); padding-left:13px; }

/* pill */
.upp2-pill {
  font-family:'Space Mono',monospace; font-size:8px; letter-spacing:.2em;
  text-transform:uppercase; padding:3px 9px;
  border:1px solid; display:inline-flex; align-items:center; gap:4px;
  clip-path:polygon(3px 0,100% 0,calc(100% - 3px) 100%,0 100%);
}

/* history row */
.upp2-hrow {
  display:flex; align-items:center; gap:12px;
  padding:9px 13px; border:1px solid rgba(237,232,223,.05);
  background:rgba(237,232,223,.015); margin-bottom:2px;
  clip-path:polygon(5px 0,100% 0,calc(100% - 5px) 100%,0 100%);
  transition:all .14s;
}
.upp2-hrow:hover { background:rgba(237,232,223,.035); border-color:rgba(237,232,223,.1); }

/* rivalry card */
.upp2-riv { border:1px solid rgba(237,232,223,.07); background:rgba(237,232,223,.02); margin-bottom:6px; cursor:pointer; transition:all .15s; }
.upp2-riv:hover { border-color:rgba(237,232,223,.14); background:rgba(237,232,223,.04); }
`;
  const el = document.createElement('style');
  el.id = 'upp2-css';
  el.textContent = css;
  document.head.appendChild(el);
}

// ─────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────
const ROUND_LABEL = { W:'Título', F:'Final', SF:'Semifinal', QF:'Quartas', R16:'Oitavas', R32:'3ª Rodada', R64:'2ª Rodada', R128:'1ª Rodada' };
const CAT_COLOR = { GRAND_SLAM:'#FFD700', MASTERS_1000:'#E040FB', ATP_500:'#00BCD4', ATP_250:'#66BB6A', ATP_100:'#FF7043', FINALS:'#F44336', ATP_PROSPECTS:'#FF7043' };
const CAT_SHORT = { GRAND_SLAM:'GS', MASTERS_1000:'M1000', ATP_500:'ATP 500', ATP_250:'ATP 250', ATP_100:'ATP 100', FINALS:'Finals', ATP_PROSPECTS:'Prospects' };
const SURF_COLOR = { CLAY:'#C4572A', GRASS:'#2ECC71', HARD:'#4A90D9', INDOOR:'#C84FEB' };
const SURF_LABEL = { CLAY:'Saibro', GRASS:'Grama', HARD:'Dura', INDOOR:'Indoor' };
const SURF_ICON  = { CLAY:'🏺', GRASS:'🌿', HARD:'🏙️', INDOOR:'🏟️' };

const PERSONA_COLOR = {
  CHARISMATIC:'#F59E0B', RESERVED:'#64748B', CONFRONTATIONAL:'#EF4444',
  SHOWMAN:'#EC4899', DIPLOMATIC:'#22C55E', ENIGMATIC:'#A855F7', INTELLECTUAL:'#3B82F6',
};
const ARCH_COLOR = {
  PERFECTIONIST:'#00BCD4', WARRIOR:'#F06428', ARTIST:'#E040FB',
  REBEL:'#FF5722', TACTICIAN:'#4CAF50', PREDATOR:'#F44336', DREAMER:'#FFD700',
};
const ARCH_ICON = { PERFECTIONIST:'🎯', WARRIOR:'⚔️', ARTIST:'🎨', REBEL:'🔥', TACTICIAN:'♟️', PREDATOR:'🦅', DREAMER:'⭐' };
const REP_COLOR = {
  ICON:'#FFD700', VILLAIN:'#EF4444', UNDERDOG:'#22C55E', PRODIGY:'#EC4899',
  MYSTERIOUS:'#A855F7', CONTROVERSIAL:'#F97316', RISING_STAR:'#3B82F6', VETERAN:'#94A3B8',
};
const REP_ICON = { ICON:'👑', VILLAIN:'😈', UNDERDOG:'🙌', PRODIGY:'✨', MYSTERIOUS:'🌫️', CONTROVERSIAL:'⚡', RISING_STAR:'🚀', VETERAN:'🏅' };
const MOOD_COLOR = {
  AT_PEAK:'#FFD700', DOMINANT:'#E8C84A', GALVANIZED:'#F06428', CONFIDENT:'#22C55E',
  HUNGRY:'#FF9800', COMEBACK:'#00BCD4', VINDICATED:'#EC4899', LEGACY_AWARE:'#E8C84A',
  SEARCHING:'#94A3B8', REFLECTIVE:'#64748B', REBUILDING:'#4A90D9', TESTING:'#94A3B8',
  FRUSTRATED:'#EF4444', BITTER:'#DC2626', OBSESSED:'#F97316', RESISTANT:'#D97706',
  BURNED_OUT:'#6B7280', CRISIS:'#DC2626', ISOLATED:'#475569', DESTABILIZED:'#B91C1C',
  FAREWELL_TOUR:'#E8C84A', OVERWHELMED:'#94A3B8', VULNERABLE:'#F59E0B', HUNGRY_AGAIN:'#FF9800',
  INTROSPECTIVE:'#8B5CF6', RESILIENT:'#22C55E',
};

// Labels PT-BR para todos os moods
const MOOD_LABELS = {
  HUNGRY:'Faminto', CONFIDENT:'Confiante', GALVANIZED:'Galvanizado',
  DOMINANT:'Dominante', AT_PEAK:'No Auge', LEGACY_AWARE:'Consciente do Legado',
  COMEBACK:'Retorno', VINDICATED:'Reivindicado', SEARCHING:'Em Busca',
  REFLECTIVE:'Reflexivo', REBUILDING:'Reconstruindo', TESTING:'Testando',
  INTROSPECTIVE:'Introspectivo', OVERWHELMED:'Sobrecarregado', FRUSTRATED:'Frustrado',
  BITTER:'Amargo', OBSESSED:'Obcecado', RESISTANT:'Resistente',
  DESTABILIZED:'Desestabilizado', ISOLATED:'Isolado', BURNED_OUT:'Esgotado',
  CRISIS:'Em Crise', VULNERABLE:'Vulnerável', FAREWELL_TOUR:'Tour de Despedida',
  HUNGRY_AGAIN:'Faminto de Novo', RESILIENT:'Resiliente',
};

// Meta para os 14 tipos de careerMoment
const MOMENT_META = {
  FIRST_SLAM:         { color:'#FFD700', icon:'⭐', label:'Primeiro Grand Slam' },
  TITLE_WHILE_INJURED:{ color:'#00BCD4', icon:'🩹', label:'Título Lesionado' },
  DROUGHT_START:      { color:'#EF4444', icon:'🌵', label:'Seca de Títulos' },
  DROUGHT_END:        { color:'#22C55E', icon:'💧', label:'Fim da Seca' },
  INJURY_TRANSFORMS:  { color:'#F97316', icon:'🩺', label:'Lesão Transformadora' },
  COMEBACK:           { color:'#22C55E', icon:'🔄', label:'Retorno' },
  DECLINE_START:      { color:'#94A3B8', icon:'📉', label:'Início do Declínio' },
  FAREWELL:           { color:'#E8C84A', icon:'🌅', label:'Tour de Despedida' },
  PERSONA_SHIFT:      { color:'#A855F7', icon:'🌀', label:'Virada de Personalidade' },
  REPUTATION_CHANGE:  { color:'#3B82F6', icon:'🌐', label:'Reputação Evolui' },
  MOOD_CRISIS:        { color:'#DC2626', icon:'⚡', label:'Crise' },
  COACH_RUPTURE:      { color:'#F59E0B', icon:'💔', label:'Ruptura com Técnico' },
  RIVALRY_IMPACT:     { color:'#EF4444', icon:'⚔️', label:'Rivalidade Define' },
  MARKET_PEAK:        { color:'#FFD700', icon:'📈', label:'Auge de Visibilidade' },
};
const TIER_COLOR = { NICHE:'#64748B', LOCAL:'#94A3B8', NACIONAL:'#F59E0B', GLOBAL:'#3B82F6', ICONE:'#FFD700' };

const RIVALRY_META = {
  CLASSIC:      { label:'Clássica',           icon:'⚔️',  color:'#FFD700' },
  DOMINATION:   { label:'Dominância',         icon:'👑',  color:'#EF4444' },
  GIANT_KILLER: { label:'Caçador de Gigantes',icon:'🎯',  color:'#22C55E' },
  GRUDGE:       { label:'Rancor',             icon:'🔥',  color:'#F97316' },
  FINALS_CURSE: { label:'Maldição das Finais',icon:'🏆',  color:'#C084FC' },
  THRONE_RIVALS:{ label:'Rivais do Trono',    icon:'💎',  color:'#06B6D4' },
  ERA_CLASH:    { label:'Choque de Eras',     icon:'🌀',  color:'#A855F7' },
};
const RIVALRY_STATUS = {
  BREWING:   { label:'Emergindo', color:'#94A3B8' },
  ACTIVE:    { label:'Ativa',     color:'#22C55E' },
  INTENSE:   { label:'Intensa',   color:'#F97316' },
  LEGENDARY: { label:'Lendária',  color:'#FFD700' },
  FROZEN:    { label:'Encerrada', color:'#60A5FA' },
};
const PHIL_META = {
  OFFENSIVE:  { label:'Ofensivo',    icon:'⚡', color:'#F06428' },
  DEFENSIVE:  { label:'Defensivo',   icon:'🛡️', color:'#2860A8' },
  COMPLETE:   { label:'Completo',    icon:'⚖️', color:'#22C55E' },
  SPECIALIST: { label:'Especialista',icon:'🏺', color:'#E8C84A' },
  MENTAL:     { label:'Mental',      icon:'🧠', color:'#AA44FF' },
};
const OUTCOME_META = {
  EXCEEDED:{ label:'Superada', color:'#22C55E', icon:'🚀' },
  MET:     { label:'Cumprida', color:'#4CAF50', icon:'✅' },
  PARTIAL: { label:'Parcial',  color:'#FF9800', icon:'⚡' },
  FAILED:  { label:'Falhada',  color:'#F44336', icon:'✗'  },
};
const TRAIT_TIER = {
  LEN:{ label:'Lendário', color:'#FFD700', bg:'rgba(255,215,0,0.10)',  border:'rgba(255,215,0,0.3)',  icon:'⭐' },
  RAR:{ label:'Raro',     color:'#AA44FF', bg:'rgba(170,68,255,0.10)', border:'rgba(170,68,255,0.3)', icon:'💜' },
  COM:{ label:'Comum',    color:'#00CCFF', bg:'rgba(0,204,255,0.08)',  border:'rgba(0,204,255,0.26)', icon:'🔹' },
  NEG:{ label:'Sombra',   color:'#FF4444', bg:'rgba(255,68,68,0.08)',  border:'rgba(255,68,68,0.26)', icon:'🔻' },
};

// ─────────────────────────────────────────────────────────────────
// SHARED MICRO-COMPONENTS
// ─────────────────────────────────────────────────────────────────

function Sh({ children, color }) {
  return <div className="upp2-sh" style={{ '--sc': color ?? T.clay }}>{children}</div>;
}

function StatCard({ label, value, color, small }) {
  return (
    <div className="upp2-stat-card">
      <div style={{ fontFamily:T.display, fontSize:small?24:32, color:color??T.ink, lineHeight:1 }}>{value}</div>
      <div style={{ fontFamily:T.mono, fontSize:7, letterSpacing:'.32em', color:T.inkFaint, textTransform:'uppercase', marginTop:5 }}>{label}</div>
    </div>
  );
}

function AttrRow({ label, attrKey, value, color, burdenFlag }) {
  const visual = attrTierVisual(value);
  const desc   = attrKey ? attrDescriptor(attrKey, value) : null;
  const tierLabel = {
    elite: '◆ ELITE', great: '▲ FORTE', solid: 'SÓLIDO', average: 'MÉDIO', weak: '▼ FRACO',
  }[visual.tier] ?? '';
  return (
    <div className="upp2-attr-wrap">
      <div className="upp2-attr-head">
        <span className="upp2-attr-lbl" style={{ color: visual.tier === 'elite' ? 'rgba(237,232,223,.75)' : undefined }}>
          {label}
          {burdenFlag && (
            <span style={{ marginLeft:5, fontFamily:'monospace', fontSize:8,
              color:'#FF7043', letterSpacing:1, opacity:.85 }}>↓</span>
          )}
        </span>
        <span style={{
          fontFamily: T.mono, fontSize: 7, letterSpacing: '.18em',
          color: visual.tier === 'elite' ? visual.color : visual.tier === 'great' ? visual.color : visual.tier === 'weak' ? '#ef4444' : 'rgba(237,232,223,.28)',
          textTransform: 'uppercase',
        }}>{tierLabel}</span>
      </div>
      <div className="upp2-attr-track" style={{ outline: burdenFlag ? '1px solid rgba(255,112,67,.25)' : undefined }}>
        <div className="upp2-attr-fill" style={{
          width: `${visual.widthPct}%`,
          background: visual.tier === 'elite' ? visual.color
            : visual.tier === 'great'   ? `${visual.color}cc`
            : visual.tier === 'solid'   ? 'rgba(116,172,223,.45)'
            : visual.tier === 'average' ? 'rgba(237,232,223,.14)'
            : 'rgba(239,68,68,.3)',
          boxShadow: visual.tier === 'elite' ? `0 0 6px ${visual.color}88` : undefined,
          opacity: visual.opacity,
        }} />
      </div>
      {desc && (
        <div style={{ fontFamily: T.body, fontSize: 9, color: 'rgba(237,232,223,.36)', lineHeight: 1.4, marginTop: 3, fontStyle: 'italic' }}>
          {desc}
        </div>
      )}
    </div>
  );
}

function CatBlock({ cat, attrs, burdenAttrs }) {
  const catGrade = catDescriptor(cat.id, attrs);
  return (
    <div style={{ marginBottom:18 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', borderLeft:`3px solid ${cat.color}`, paddingLeft:10, marginBottom:10, background:`${cat.color}06`, padding:'6px 0 6px 10px' }}>
        <span style={{ fontFamily:T.mono, fontSize:7, letterSpacing:'.42em', color:cat.color, textTransform:'uppercase' }}>{cat.label}</span>
        <div style={{ display:'flex', alignItems:'baseline', gap:6 }}>
          <span style={{ fontFamily:T.display, fontSize:22, color:catGrade.color, lineHeight:1 }}>{catGrade.grade}</span>
          <span style={{ fontFamily:T.mono, fontSize:7, color:`${catGrade.color}88`, letterSpacing:'.18em', textTransform:'uppercase' }}>{catGrade.label}</span>
        </div>
      </div>
      {cat.attrs.map(a => <AttrRow key={a.key} label={a.label} attrKey={a.key} value={attrs[a.key]??0} color={cat.color} burdenFlag={burdenAttrs?.has(a.key)} />)}
    </div>
  );
}

function Bar({ value, color, height=4, showGlow=false }) {
  const pct = Math.max(0, Math.min(100, value??0));
  return (
    <div style={{ height, background:'rgba(237,232,223,.06)', position:'relative' }}>
      <div style={{ position:'absolute', left:0, top:0, height:'100%', width:`${pct}%`, background:color, transition:'width .4s', boxShadow:showGlow?`0 0 8px ${color}55`:undefined }} />
    </div>
  );
}

function Pill({ label, color, icon, dim }) {
  return (
    <span className="upp2-pill" style={{ color:dim?`${color}77`:color, borderColor:dim?`${color}33`:`${color}55`, background:`${color}${dim?'08':'12'}` }}>
      {icon && <span style={{ fontSize:10 }}>{icon}</span>}
      {label}
    </span>
  );
}

function SubTabBar({ tabs, active, onTab, sc }) {
  return (
    <div className="upp2-sub-bar">
      {tabs.map(([id, label]) => (
        <button key={id} className={`upp2-sub-btn${active===id?' act':''}`}
          style={{ color:active===id?sc:T.inkFaint, '--sc':sc }}
          onClick={() => onTab(id)}>
          {label}
        </button>
      ))}
    </div>
  );
}

function DimCard({ accent, icon, tag, title, body, children, style: sx }) {
  return (
    <div style={{ border:`1px solid ${accent}25`, background:`${accent}06`, borderLeft:`3px solid ${accent}`, padding:'15px 17px', position:'relative', overflow:'hidden', ...sx }}>
      <div style={{ position:'absolute', top:0, left:0, right:0, height:1, background:`linear-gradient(90deg,${accent}55,transparent)` }} />
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:body||children?8:0 }}>
        {icon && <span style={{ fontSize:20, lineHeight:1, flexShrink:0 }}>{icon}</span>}
        <div>
          {tag && <div style={{ fontFamily:T.mono, fontSize:7, letterSpacing:'.4em', color:`${accent}88`, textTransform:'uppercase', marginBottom:2 }}>{tag}</div>}
          <div style={{ fontFamily:T.cond, fontWeight:700, fontSize:16, color:accent, textTransform:'uppercase', letterSpacing:'.04em', lineHeight:1.1 }}>{title}</div>
        </div>
      </div>
      {body && <p style={{ fontFamily:T.body, fontSize:12, lineHeight:1.7, color:T.inkDim, margin:0 }}>{body}</p>}
      {children}
    </div>
  );
}

function DetailLine({ label, value, color }) {
  if (!value) return null;
  return (
    <div style={{ display:'flex', gap:8, alignItems:'baseline', marginBottom:4 }}>
      <span style={{ fontFamily:T.mono, fontSize:7, letterSpacing:'.3em', textTransform:'uppercase', color:T.inkFaint, flexShrink:0, minWidth:90 }}>{label}</span>
      <span style={{ fontFamily:T.body, fontSize:12, color:color??T.inkDim, lineHeight:1.5 }}>{value}</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// HERO PHOTO
// ─────────────────────────────────────────────────────────────────
function HeroPhoto({ np, playerKey }) {
  const photo = getPlayerPhoto(np ?? playerKey);
  const [ok, setOk] = useState(!!photo);
  if (photo && ok) return (
    <>
      <img src={photo} alt={np?.name} onError={() => setOk(false)} />
      <div className="upp2-hero-grad-l" />
      <div className="upp2-hero-grad-b" />
      <div className="upp2-hero-grad-r" />
    </>
  );
  return (
    <div style={{ position:'absolute', inset:0, background:'linear-gradient(145deg,#0A0F12,#060A0D)', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ fontFamily:T.display, fontSize:'clamp(100px,18vw,180px)', color:'rgba(237,232,223,.02)', lineHeight:1 }}>
        {(np?.name||'?')[0].toUpperCase()}
      </div>
      <div className="upp2-hero-grad-l" />
      <div className="upp2-hero-grad-b" />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────
// TAB: CIRCUITO — Percepções dinâmicas
// ─────────────────────────────────────────────────────────────────
function TabPercepcoes({ np, sc, year, tournamentResults, allPlayers = [] }) {
  const perceptions = np.perceptions ?? [];
  const narrative   = buildPerceptionNarrative(perceptions, np);
  const marketText  = getMarketAssessment(np, year ?? 2025);

  const confirmed   = perceptions.filter(p => p.status === 'CONFIRMED');
  const unconfirmed = perceptions.filter(p => p.status === 'UNCONFIRMED');
  const disputed    = perceptions.filter(p => p.status === 'DISPUTED');
  const refuted     = perceptions.filter(p => p.status === 'REFUTED');

  const STATUS_META = {
    CONFIRMED:   { label: 'Confirmado',     color: '#22c55e', icon: '✓' },
    UNCONFIRMED: { label: 'Observado',      color: '#FFD700', icon: '?' },
    DISPUTED:    { label: 'Disputado',      color: '#f97316', icon: '⚡' },
    REFUTED:     { label: 'Refutado',       color: '#94a3b8', icon: '✗' },
  };

  function PerceptionPill({ p }) {
    const meta = STATUS_META[p.status] ?? STATUS_META.UNCONFIRMED;
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '11px 14px', marginBottom: 8,
        border: `1px solid ${p.color ?? meta.color}33`,
        background: `${p.color ?? meta.color}07`,
        borderLeft: `3px solid ${p.color ?? meta.color}`,
        opacity: p.status === 'REFUTED' ? 0.45 : 1,
      }}>
        <span style={{ fontSize: 18, flexShrink: 0 }}>{p.icon ?? '●'}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 2 }}>
            <span style={{
              fontFamily: T.cond, fontWeight: 700, fontSize: 13,
              color: p.status === 'REFUTED' ? 'rgba(237,232,223,.3)' : 'rgba(237,232,223,.85)',
              textTransform: 'uppercase', letterSpacing: '.04em',
              textDecoration: p.status === 'REFUTED' ? 'line-through' : 'none',
            }}>{p.claim}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              fontFamily: T.mono, fontSize: 7, letterSpacing: '.22em',
              color: meta.color, textTransform: 'uppercase',
            }}>{meta.icon} {meta.label}</span>
            {p.status !== 'REFUTED' && (
              <>
                <div style={{ width: 1, height: 10, background: 'rgba(237,232,223,.1)' }} />
                {/* Confidence bar */}
                <div style={{ flex: 1, height: 2, background: 'rgba(237,232,223,.06)', maxWidth: 80 }}>
                  <div style={{ height: '100%', width: `${p.confidence}%`, background: p.color ?? meta.color, opacity: .7 }} />
                </div>
                <span style={{ fontFamily: T.mono, fontSize: 7, color: 'rgba(237,232,223,.25)' }}>
                  {p.confidence}%
                </span>
              </>
            )}
            {p.since && (
              <>
                <div style={{ width: 1, height: 10, background: 'rgba(237,232,223,.1)' }} />
                <span style={{ fontFamily: T.mono, fontSize: 7, color: 'rgba(237,232,223,.2)' }}>desde {p.since}</span>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>
      {/* LEFT — percepções */}
      <div className="upp2-scroll" style={{ flex: 1, padding: '22px 24px', borderRight: `1px solid ${T.line}`, overflowY: 'auto' }}>

        {/* Narrativa pública */}
        <div style={{ padding: '14px 16px', marginBottom: 22, background: `${sc}07`, borderLeft: `3px solid ${sc}` }}>
          <div style={{ fontFamily: T.mono, fontSize: 7, letterSpacing: '.38em', color: `${sc}66`, textTransform: 'uppercase', marginBottom: 6 }}>
            O QUE O CIRCUITO DIZ
          </div>
          <p style={{ fontFamily: T.body, fontSize: 12, color: 'rgba(237,232,223,.7)', lineHeight: 1.7, margin: 0 }}>
            {narrative}
          </p>
        </div>

        {/* Confirmadas */}
        {confirmed.length > 0 && (
          <>
            <div style={{ fontFamily: T.mono, fontSize: 7, letterSpacing: '.38em', color: '#22c55e88', textTransform: 'uppercase', marginBottom: 10 }}>
              ✓ Percepções Confirmadas
            </div>
            {confirmed.map(p => <PerceptionPill key={p.id} p={p} />)}
          </>
        )}

        {/* Observadas */}
        {unconfirmed.length > 0 && (
          <>
            <div style={{ fontFamily: T.mono, fontSize: 7, letterSpacing: '.38em', color: '#FFD70088', textTransform: 'uppercase', marginBottom: 10, marginTop: confirmed.length > 0 ? 18 : 0 }}>
              ? Sendo Observadas
            </div>
            {unconfirmed.map(p => <PerceptionPill key={p.id} p={p} />)}
          </>
        )}

        {/* Disputadas */}
        {disputed.length > 0 && (
          <>
            <div style={{ fontFamily: T.mono, fontSize: 7, letterSpacing: '.38em', color: '#f9731688', textTransform: 'uppercase', marginBottom: 10, marginTop: 18 }}>
              ⚡ Em Debate
            </div>
            {disputed.map(p => <PerceptionPill key={p.id} p={p} />)}
          </>
        )}

        {/* Refutadas */}
        {refuted.length > 0 && (
          <>
            <div style={{ fontFamily: T.mono, fontSize: 7, letterSpacing: '.38em', color: 'rgba(237,232,223,.15)', textTransform: 'uppercase', marginBottom: 10, marginTop: 18 }}>
              ✗ Refutadas
            </div>
            {refuted.map(p => <PerceptionPill key={p.id} p={p} />)}
          </>
        )}

        {perceptions.length === 0 && (
          <div style={{ padding: '40px 0', textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🌐</div>
            <div style={{ fontFamily: T.mono, fontSize: 8, letterSpacing: '.3em', color: 'rgba(237,232,223,.2)', textTransform: 'uppercase' }}>
              Ainda sem percepções consolidadas
            </div>
            <p style={{ fontFamily: T.body, fontSize: 10, color: 'rgba(237,232,223,.3)', marginTop: 8, lineHeight: 1.6 }}>
              O circuito precisa de mais temporadas para formar opinião sobre este jogador.
            </p>
          </div>
        )}

      </div>

      {/* RIGHT — avaliação de mercado + fase */}
      <div className="upp2-scroll" style={{ width: 'clamp(200px,18vw,260px)', flexShrink: 0, background: T.bg2, padding: '22px 16px', overflowY: 'auto' }}>

        {/* Avaliação de mercado dinâmica */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontFamily: T.mono, fontSize: 7, letterSpacing: '.38em', color: 'rgba(237,232,223,.3)', textTransform: 'uppercase', marginBottom: 8 }}>
            Avaliação do Mercado
          </div>
          <p style={{ fontFamily: T.body, fontSize: 10, color: 'rgba(237,232,223,.6)', lineHeight: 1.7, margin: 0, fontStyle: 'italic' }}>
            {marketText}
          </p>
        </div>

        <div style={{ height: 1, background: T.line, margin: '16px 0' }} />

        {/* Fase de carreira */}
        {(() => {
          const phase = scoutPhaseLabel(np);
          return (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 13px', border: `1px solid ${phase.color}28`, background: `${phase.color}07` }}>
              <span style={{ fontSize: 20 }}>{phase.icon}</span>
              <div>
                <div style={{ fontFamily: T.mono, fontSize: 7, letterSpacing: 2, color: T.inkFaint, textTransform: 'uppercase', marginBottom: 2 }}>Fase</div>
                <div style={{ fontFamily: T.display, fontSize: 14, color: phase.color }}>{phase.label}</div>
              </div>
            </div>
          );
        })()}

        <div style={{ height: 1, background: T.line, margin: '16px 0' }} />

        {/* Contadores */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          {[
            { label: 'Confirmadas', value: confirmed.length,   color: '#22c55e' },
            { label: 'Observadas',  value: unconfirmed.length, color: '#FFD700' },
            { label: 'Em debate',   value: disputed.length,    color: '#f97316' },
            { label: 'Refutadas',   value: refuted.length,     color: '#94a3b8' },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ padding: '9px 10px', background: `${color}07`, border: `1px solid ${color}22`, textAlign: 'center' }}>
              <div style={{ fontFamily: T.display, fontSize: 22, color, lineHeight: 1 }}>{value}</div>
              <div style={{ fontFamily: T.mono, fontSize: 6, color: `${color}88`, letterSpacing: '.18em', textTransform: 'uppercase', marginTop: 3 }}>{label}</div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// TAB 1: IDENTIDADE
// ─────────────────────────────────────────────────────────────────
function TabIdentidade({ np, sc }) {
  const p = np.personality;
  migratePlayerPersonality(np);
  const hooks = getPersonalityHooks(np);

  if (!p || !hooks) return (
    <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ fontFamily:T.mono, fontSize:9, letterSpacing:4, color:T.inkFaint, textTransform:'uppercase' }}>Personalidade não gerada</div>
    </div>
  );

  const personaColor    = PERSONA_COLOR[hooks.personaId]    ?? sc;
  const archetypeColor  = ARCH_COLOR[hooks.archetypeId]     ?? sc;
  const reputationColor = REP_COLOR[hooks.reputationId]     ?? sc;
  const mktScore = p.marketability?.score ?? 50;
  const mktTier  = p.marketability?.tier  ?? getMarketabilityTier(mktScore);
  const mktColor = TIER_COLOR[mktTier.id] ?? sc;
  const mktHistory = p.marketability?.history ?? [];

  // mood
  const currentState = p.currentState;
  const moodId = currentState?.mood;
  const moodColor = moodId ? (MOOD_COLOR[moodId] ?? T.inkDim) : T.inkFaint;
  const pressureLevel = currentState?.pressureLevel ?? 50;
  const pressureColor = pressureLevel >= 80 ? '#DC2626' : pressureLevel >= 60 ? '#F97316' : pressureLevel >= 40 ? '#F59E0B' : '#22C55E';
  const publicNarrative = currentState?.publicNarrative ?? null;
  const moodSince = currentState?.moodSince ?? null;

  return (
    <div style={{ flex:1, display:'flex', overflow:'hidden', minHeight:0 }}>
      {/* ── LEFT COLUMN ── */}
      <div className="upp2-scroll" style={{ flex:1, padding:'22px 24px', borderRight:`1px solid ${T.line}`, overflowY:'auto' }}>

        {/* ESTADO ATUAL — só aparece se há dados dinâmicos */}
        {moodId && (
          <div style={{ marginBottom:20 }}>
            <Sh color={sc}>Estado Atual</Sh>
            <div style={{ border:`1px solid ${moodColor}28`, background:`${moodColor}07`, borderLeft:`3px solid ${moodColor}`, padding:'14px 16px', position:'relative', overflow:'hidden' }}>
              <div style={{ position:'absolute', top:0, left:0, right:0, height:1, background:`linear-gradient(90deg,${moodColor}55,transparent)` }} />
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
                <div>
                  <div style={{ fontFamily:T.mono, fontSize:7, letterSpacing:'.4em', color:`${moodColor}88`, textTransform:'uppercase', marginBottom:3 }}>
                    {(() => {
                      const currentYear = np._seasonHistory?.at(-1)?.year ?? moodSince;
                      const seasons = moodSince && currentYear ? currentYear - moodSince : 0;
                      return `Humor${moodSince ? ` · desde ${moodSince}${seasons > 1 ? ` (${seasons} temp.)` : ''}` : ''}`;
                    })()}
                  </div>
                  <div style={{ fontFamily:T.cond, fontWeight:700, fontSize:18, color:moodColor, textTransform:'uppercase', letterSpacing:'.04em' }}>
                    {MOOD_LABELS[moodId] ?? moodId?.replace(/_/g,' ')}
                  </div>
                </div>
                <div style={{ textAlign:'right' }}>
                  <div style={{ fontFamily:T.mono, fontSize:7, letterSpacing:'.3em', color:T.inkFaint, textTransform:'uppercase', marginBottom:3 }}>Pressão</div>
                  <div style={{ fontFamily:T.display, fontSize:28, color:pressureColor, lineHeight:1 }}>{pressureLevel}</div>
                  <div style={{ fontFamily:T.mono, fontSize:6, color:`${pressureColor}88`, marginTop:1, letterSpacing:1 }}>
                    {pressureLevel >= 80 ? 'crítica' : pressureLevel >= 60 ? 'alta' : pressureLevel >= 40 ? 'moderada' : 'baixa'}
                  </div>
                </div>
              </div>
              <Bar value={pressureLevel} color={pressureColor} height={3} />
              {publicNarrative && (
                <div style={{ marginTop:10, borderLeft:`2px solid ${moodColor}44`, paddingLeft:10 }}>
                  <div style={{ fontFamily:T.mono, fontSize:7, letterSpacing:'.32em', color:`${moodColor}66`, textTransform:'uppercase', marginBottom:4 }}>O que a mídia diz</div>
                  <p style={{ fontFamily:T.body, fontStyle:'italic', fontSize:12, color:T.inkDim, lineHeight:1.6, margin:0 }}>"{publicNarrative}"</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ARQUÉTIPO */}
        <div style={{ marginBottom:14 }}>
          <Sh color={sc}>Competidor</Sh>
          <DimCard
            accent={archetypeColor}
            icon={ARCH_ICON[hooks.archetypeId] ?? '🎾'}
            tag="Arquétipo Competitivo"
            title={hooks.archetypeLabel}
            body={COMPETITIVE_ARCHETYPES[hooks.archetypeId]?.description}
          >
            <div style={{ display:'flex', flexDirection:'column', gap:3, marginTop:8 }}>
              <DetailLine label="Motivação"       value={hooks.coreDriver}    color={archetypeColor} />
              <DetailLine label="Hook narrativo"  value={hooks.narrativeHook} />
              <DetailLine label="Em crise"        value={hooks.crisisResponse} />
            </div>
          </DimCard>
        </div>

        {/* PRESS PERSONA */}
        <div style={{ marginBottom:14 }}>
          <Sh color={sc}>Mídia</Sh>
          <DimCard
            accent={personaColor}
            icon={{ CHARISMATIC:'😎', RESERVED:'🤐', CONFRONTATIONAL:'💥', SHOWMAN:'🎤', DIPLOMATIC:'🤝', ENIGMATIC:'🌑', INTELLECTUAL:'📚' }[hooks.personaId] ?? '🎙️'}
            tag="Press Persona"
            title={hooks.personaLabel}
            body={PRESS_PERSONAS[hooks.personaId]?.description}
          >
            <div style={{ marginTop:8 }}>
              <DetailLine label="Tom de entrevista" value={hooks.interviewTone?.replace(/_/g,' ')} color={personaColor} />
              {hooks.storyAngles?.length > 0 && (
                <div style={{ marginTop:8 }}>
                  <div style={{ fontFamily:T.mono, fontSize:7, letterSpacing:'.36em', color:`${personaColor}66`, textTransform:'uppercase', marginBottom:6 }}>Ângulos de matéria</div>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:4 }}>
                    {hooks.storyAngles.map((a,i) => (
                      <span key={i} style={{ fontFamily:T.mono, fontSize:8, padding:'2px 7px', background:`${personaColor}10`, border:`1px solid ${personaColor}33`, color:personaColor }}>{a}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </DimCard>
        </div>

        {/* BACKSTORY */}
        <div>
          <Sh color={sc}>Backstory</Sh>
          <div style={{ border:`1px solid ${T.line}`, background:`${T.bg3}`, padding:'14px 16px' }}>
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              <div style={{ borderLeft:`2px solid ${sc}44`, paddingLeft:10 }}>
                <div style={{ fontFamily:T.mono, fontSize:7, color:`${sc}77`, letterSpacing:'.3em', textTransform:'uppercase', marginBottom:3 }}>Origem · {p.backstory?.origin?.label}</div>
                <p style={{ fontFamily:T.body, fontSize:12, color:T.inkDim, lineHeight:1.6, margin:0 }}>{p.backstory?.origin?.desc}</p>
              </div>
              <div style={{ borderLeft:`2px solid ${sc}44`, paddingLeft:10 }}>
                <div style={{ fontFamily:T.mono, fontSize:7, color:`${sc}77`, letterSpacing:'.3em', textTransform:'uppercase', marginBottom:3 }}>Motivação · {p.backstory?.motivation?.label}</div>
                <p style={{ fontFamily:T.body, fontSize:12, color:T.inkDim, lineHeight:1.6, margin:0 }}>{p.backstory?.motivation?.desc}</p>
              </div>
              <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
                {p.backstory?.background && <Pill label={p.backstory.background.label} color={T.inkFaint} dim />}
                {p.backstory?.keyEvent && <Pill label={p.backstory.keyEvent.label} color={T.gold} icon="🔑" />}
              </div>
            </div>
          </div>
        </div>

        {/* RIVAL DYNAMIC */}
        {hooks.rivalDynamic && (
          <div style={{ marginTop:14 }}>
            <div style={{ border:`1px solid rgba(239,68,68,.18)`, background:'rgba(239,68,68,.03)', borderLeft:'3px solid rgba(239,68,68,.42)', padding:'12px 15px' }}>
              <div style={{ fontFamily:T.mono, fontSize:7, letterSpacing:'.36em', color:'rgba(239,68,68,.5)', textTransform:'uppercase', marginBottom:4 }}>Dinâmica de Rivalidade</div>
              <p style={{ fontFamily:T.body, fontSize:12, color:T.inkDim, lineHeight:1.6, margin:0, fontStyle:'italic' }}>"{hooks.rivalDynamic}"</p>
            </div>
          </div>
        )}
      </div>

      {/* ── RIGHT COLUMN ── */}
      <div className="upp2-scroll" style={{ width:'clamp(220px,27vw,300px)', flexShrink:0, padding:'22px 20px', background:'rgba(0,0,0,.12)', overflowY:'auto' }}>

        {/* REPUTAÇÃO */}
        <div style={{ marginBottom:16 }}>
          <Sh color={sc}>Reputação</Sh>
          <DimCard
            accent={reputationColor}
            icon={REP_ICON[hooks.reputationId] ?? '🌐'}
            tag="Percepção Pública"
            title={hooks.reputationLabel}
            body={REPUTATIONS[hooks.reputationId]?.description}
          >
            <div style={{ marginTop:6 }}>
              <DetailLine label="Papel narrativo" value={hooks.narrativeRole}  color={reputationColor} />
              <DetailLine label="Fan base"        value={hooks.fanBase?.replace(/_/g,' ')} />
              <DetailLine label="Mídia"           value={hooks.mediaPresence?.replace(/_/g,' ')} />
            </div>
          </DimCard>
        </div>

        {/* DRIFT ACCUMULATOR — só aparece se há dados de deriva */}
        {(() => {
          const acc = p._driftAccumulator?.pressPersona ?? {};
          const curPersona = hooks.personaId;
          const candidates = Object.entries(acc)
            .filter(([id, pts]) => id !== curPersona && pts > 0 && PRESS_PERSONAS[id])
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3);
          if (!candidates.length) return null;
          const THRESHOLD = 30;
          return (
            <div style={{ marginBottom:16 }}>
              <Sh color={sc}>Deriva de Persona</Sh>
              <div style={{ border:`1px solid ${T.line}`, background:`${T.bg3}`, padding:'12px 14px' }}>
                <div style={{ fontFamily:T.mono, fontSize:7, letterSpacing:'.3em', color:T.inkFaint, textTransform:'uppercase', marginBottom:8 }}>
                  Pressões acumuladas para mudança
                </div>
                {candidates.map(([id, pts]) => {
                  const pct     = Math.min(100, (pts / THRESHOLD) * 100);
                  const pColor  = PERSONA_COLOR[id] ?? sc;
                  const pLabel  = PRESS_PERSONAS[id]?.label ?? id;
                  const icon    = { CHARISMATIC:'😎', RESERVED:'🤐', CONFRONTATIONAL:'💥', SHOWMAN:'🎤', DIPLOMATIC:'🤝', ENIGMATIC:'🌑', INTELLECTUAL:'📚' }[id] ?? '🎙️';
                  return (
                    <div key={id} style={{ marginBottom:8 }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:3 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                          <span style={{ fontSize:9 }}>{icon}</span>
                          <span style={{ fontFamily:T.mono, fontSize:8, color:pColor }}>{pLabel}</span>
                        </div>
                        <span style={{ fontFamily:T.display, fontSize:11, color:pct >= 80 ? pColor : T.inkFaint }}>
                          {Math.round(pts)}/{THRESHOLD}
                        </span>
                      </div>
                      <div style={{ height:3, background:'rgba(255,255,255,.06)', position:'relative', overflow:'hidden' }}>
                        <div style={{ position:'absolute', left:0, top:0, height:'100%', width:`${pct}%`, background:pColor, opacity: pct >= 80 ? 1 : .55, transition:'width .3s' }} />
                        {pct >= 80 && (
                          <div style={{ position:'absolute', right:0, top:0, bottom:0, width:2, background:pColor, boxShadow:`0 0 6px ${pColor}` }} />
                        )}
                      </div>
                      {pct >= 90 && (
                        <div style={{ fontFamily:T.mono, fontSize:6, color:pColor, letterSpacing:'.3em', marginTop:2, textTransform:'uppercase' }}>
                          ⚠ mudança iminente
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* MARKETABILITY */}
        <div style={{ marginBottom:16 }}>
          <Sh color={sc}>Marketability</Sh>
          <div style={{ border:`1px solid ${mktColor}28`, background:`${mktColor}07`, borderLeft:`3px solid ${mktColor}`, padding:'14px 16px', position:'relative', overflow:'hidden' }}>
            <div style={{ position:'absolute', top:0, left:0, right:0, height:1, background:`linear-gradient(90deg,${mktColor}55,transparent)` }} />
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
              <div>
                <div style={{ fontFamily:T.mono, fontSize:7, letterSpacing:'.38em', color:`${mktColor}88`, textTransform:'uppercase', marginBottom:3 }}>Score</div>
                <div style={{ fontFamily:T.cond, fontWeight:700, fontSize:16, color:mktColor, textTransform:'uppercase', letterSpacing:'.04em' }}>{mktTier.label}</div>
              </div>
              <div style={{ fontFamily:T.display, fontSize:44, color:mktColor, lineHeight:1, textShadow:`0 0 28px ${mktColor}44` }}>{mktScore}</div>
            </div>
            <Bar value={mktScore} color={mktColor} height={4} showGlow />
            <div style={{ display:'flex', justifyContent:'space-between', marginTop:4, marginBottom:8 }}>
              {['Nicho','Local','Nacional','Global','Ícone'].map((l,i) => (
                <span key={i} style={{ fontFamily:T.mono, fontSize:6, letterSpacing:.5, color:i===(['NICHE','LOCAL','NACIONAL','GLOBAL','ICONE'].indexOf(mktTier.id))?mktColor:T.inkFaint, textTransform:'uppercase' }}>{l}</span>
              ))}
            </div>
            <p style={{ fontFamily:T.body, fontSize:11, color:T.inkFaint, lineHeight:1.6, margin:'8px 0 0' }}>{mktTier.desc}</p>

            {/* Sparkline histórico de marketability */}
            {mktHistory.length >= 2 && (
              <div style={{ marginTop:10 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:5 }}>
                  <div style={{ fontFamily:T.mono, fontSize:7, letterSpacing:'.3em', color:T.inkFaint, textTransform:'uppercase' }}>Histórico</div>
                  {mktHistory.at(-1)?.topReason && (
                    <div style={{ fontFamily:T.mono, fontSize:7, color:`${mktColor}99`, maxWidth:110, textAlign:'right', lineHeight:1.3 }}>
                      {mktHistory.at(-1).topReason}
                    </div>
                  )}
                </div>
                <svg width="100%" height="32" viewBox={`0 0 ${Math.max(1,(mktHistory.length-1)*20)} 32`} preserveAspectRatio="none">
                  <polyline
                    points={mktHistory.map((h,i) => `${i*20},${32-(h.score/100)*28}`).join(' ')}
                    fill="none" stroke={mktColor} strokeWidth="1.5" strokeLinejoin="round" opacity=".7"
                  />
                  {mktHistory.map((h,i) => {
                    const cy = 32-(h.score/100)*28;
                    const dColor = h.delta > 0 ? '#22C55E' : h.delta < 0 ? '#EF4444' : mktColor;
                    return (
                      <g key={i}>
                        <circle cx={i*20} cy={cy} r="2.5" fill={dColor} opacity=".9" />
                        {h.delta !== 0 && h.delta != null && (
                          <text x={i*20} y={cy - 5} textAnchor="middle" fill={dColor} fontSize="5" opacity=".8" fontFamily="monospace">
                            {h.delta > 0 ? `+${h.delta}` : h.delta}
                          </text>
                        )}
                      </g>
                    );
                  })}
                </svg>
                <div style={{ display:'flex', justifyContent:'space-between', marginTop:2 }}>
                  {mktHistory.slice(-3).map((h,i) => (
                    <span key={i} style={{ fontFamily:T.mono, fontSize:6, color:T.inkFaint }}>
                      {h.year}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* DADOS FÍSICOS */}
        <div>
          <Sh color={sc}>Perfil</Sh>
          {[
            { label:'Nac.',   value:np.nationality },
            { label:'Idade',  value:np.age ? `${np.age} anos` : null },
            { label:'Altura', value:np.height ? `${np.height} m` : null },
            { label:'Peso',   value:np.weight ? `${np.weight} kg` : null },
            { label:'Mão',    value:np.hand },
            { label:'Nasc.',  value:np.birthYear },
          ].filter(r => r.value).map(({ label, value }) => (
            <div key={label} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'7px 12px', borderBottom:`1px solid ${T.line}` }}>
              <span style={{ fontFamily:T.mono, fontSize:7, letterSpacing:'.28em', color:T.inkFaint, textTransform:'uppercase' }}>{label}</span>
              <span style={{ fontFamily:T.cond, fontWeight:700, fontSize:14, color:T.ink, textTransform:'uppercase' }}>{value}</span>
            </div>
          ))}
          {np.tagline && (
            <div style={{ margin:'12px 0 0', borderLeft:`2px solid ${sc}44`, paddingLeft:10 }}>
              <p style={{ fontFamily:T.body, fontStyle:'italic', fontSize:12, color:T.inkDim, lineHeight:1.7, margin:0 }}>"{np.tagline}"</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// TAB 2: JOGO
// ─────────────────────────────────────────────────────────────────
function TabJogo({ np, sc, potCat, arc, year = 2025 }) {
  const ov     = overallRating(np.attrs);

  // Prefs — usa o campo baked, ou gera on-the-fly como fallback
  const prefs = np.prefs ?? generatePrefs(np.attrs ?? {});
  const archetype = getArchetype(prefs);

  // Fase 7 — naturalSignature (novo sistema) + signature do técnico
  const naturalSigKey = np.naturalSignature ?? null;
  const coachSigKey   = np.coach?.signature ?? null;
  const naturalSig    = naturalSigKey ? NEW_SIGNATURE_SHOTS[naturalSigKey] : null;
  const coachSig      = coachSigKey   ? NEW_SIGNATURE_SHOTS[coachSigKey]   : null;

  const rallyPat = np.rallyPattern && RALLY_PATTERNS?.[np.rallyPattern] ? RALLY_PATTERNS[np.rallyPattern] : null;
  const sigPat   = null;  // [Signature system will be rebuilt]

  const sorted = Object.entries(np.attrs).sort(([,a],[,b]) => b-a);
  const top3 = sorted.slice(0, 3);
  const bot3 = sorted.slice(-3);

  const attrLabel = (key) => {
    for (const cat of ATTR_CATEGORIES) {
      const a = cat.attrs.find(a => a.key === key);
      if (a) return { label:a.label, color:cat.color };
    }
    return { label:key, color:sc };
  };

  const catsL = ATTR_CATEGORIES.slice(0, 3);
  const catsR = ATTR_CATEGORIES.slice(3);
  const grade = overallGrade(ov);

  const [view, setView] = useState('prefs'); // prefs | atributos

  return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', minHeight:0 }}>
      <SubTabBar tabs={[['prefs','🧠 Preferências'], ['atributos','📊 Atributos']]} active={view} onTab={setView} sc={sc} />

      <div style={{ flex:1, display:'flex', overflow:'hidden', minHeight:0 }} key={view}>

        {view === 'prefs' && (() => {
          const bs   = getBuildStyleMeta(prefs.buildStyle);
          const ng   = getNetGameMeta(prefs.netGame);
          const rc   = getRallyCadenceMeta(prefs.rallyCadence);
          const rp   = getRiskProfileMeta(prefs.riskProfile);
          const adpt = adaptabilityLabel(prefs.adaptability);

          const PrefCard = ({ label, meta, color }) => (
            <div style={{ padding:'13px 15px', background:`${color}0a`, borderLeft:`3px solid ${color}`, marginBottom:10 }}>
              <div style={{ fontFamily:T.mono, fontSize:7, letterSpacing:'.38em', color:`${color}55`, textTransform:'uppercase', marginBottom:5 }}>{label}</div>
              <div style={{ display:'flex', alignItems:'center', gap:9, marginBottom:5 }}>
                <span style={{ fontSize:17, lineHeight:1 }}>{meta.icon}</span>
                <div>
                  <div style={{ fontFamily:T.cond, fontWeight:700, fontSize:15, color, textTransform:'uppercase', lineHeight:1 }}>{meta.label}</div>
                  <div style={{ fontFamily:T.mono, fontSize:7, color:`${color}55`, letterSpacing:'.25em', marginTop:2 }}>{meta.abbr}</div>
                </div>
              </div>
              <p style={{ fontFamily:T.body, fontSize:11, color:T.inkDim, lineHeight:1.6, margin:0 }}>{meta.desc}</p>
            </div>
          );

          return (
            <>
              {/* PREFS — left */}
              <div className="upp2-scroll" style={{ flex:1, padding:'20px 22px', borderRight:`1px solid ${T.line}`, overflowY:'auto' }}>

                {/* ── Golpes Assinatura — peça central ── */}
                <Sh color={sc}>Golpes Assinatura</Sh>
                {(naturalSig || coachSig) ? (
                  <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:20 }}>
                    {naturalSig && (
                      <div style={{ padding:'14px 16px', background:'rgba(255,215,0,.06)', borderLeft:'3px solid #FFD700' }}>
                        <div style={{ fontFamily:T.mono, fontSize:6, letterSpacing:'.42em', color:'rgba(255,215,0,.5)', textTransform:'uppercase', marginBottom:6 }}>★ NATURAL</div>
                        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:5 }}>
                          <span style={{ fontSize:26, lineHeight:1 }}>{naturalSig.emoji}</span>
                          <div>
                            <div style={{ fontFamily:T.cond, fontWeight:700, fontSize:17, color:'#FFD700', textTransform:'uppercase', letterSpacing:'.04em', lineHeight:1 }}>{naturalSig.label}</div>
                            <div style={{ fontFamily:T.mono, fontSize:7, color:'rgba(255,215,0,.4)', letterSpacing:'.2em', marginTop:2 }}>{naturalSig.wing ?? naturalSig.baseType ?? ''}</div>
                          </div>
                        </div>
                        <p style={{ fontFamily:T.body, fontSize:10.5, color:'rgba(237,232,223,.55)', lineHeight:1.6, margin:0 }}>{naturalSig.description}</p>
                      </div>
                    )}
                    {coachSig && coachSigKey !== naturalSigKey && (
                      <div style={{ padding:'12px 14px', background:'rgba(79,195,247,.05)', borderLeft:'3px solid #4FC3F7' }}>
                        <div style={{ fontFamily:T.mono, fontSize:6, letterSpacing:'.42em', color:'rgba(79,195,247,.5)', textTransform:'uppercase', marginBottom:5 }}>🎓 TÉCNICO — {np.coach?.name ?? '—'}</div>
                        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:4 }}>
                          <span style={{ fontSize:22, lineHeight:1 }}>{coachSig.emoji}</span>
                          <div style={{ fontFamily:T.cond, fontWeight:700, fontSize:15, color:'#4FC3F7', textTransform:'uppercase', letterSpacing:'.04em' }}>{coachSig.label}</div>
                        </div>
                        <p style={{ fontFamily:T.body, fontSize:10, color:'rgba(237,232,223,.45)', lineHeight:1.5, margin:0 }}>{coachSig.description}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ padding:'12px 14px', background:'rgba(255,255,255,.03)', border:'1px solid rgba(255,255,255,.06)', marginBottom:20 }}>
                    <div style={{ fontFamily:T.mono, fontSize:8, color:'rgba(255,255,255,.2)', textTransform:'uppercase', letterSpacing:'.28em' }}>Sem golpe assinatura definido</div>
                  </div>
                )}

                {/* ── Padrão de Rally ── */}
                {rallyPat && (
                  <>
                    <Sh color="rgba(79,195,247,.6)">Padrão de Rally</Sh>
                    <div style={{ display:'flex', alignItems:'flex-start', gap:10, padding:'12px 14px', background:'rgba(79,195,247,.05)', borderLeft:'2px solid rgba(79,195,247,.4)', marginBottom:20 }}>
                      <span style={{ fontSize:20, lineHeight:1, flexShrink:0, marginTop:1 }}>{rallyPat.icon}</span>
                      <div>
                        <div style={{ fontFamily:T.cond, fontWeight:700, fontSize:14, color:'#4FC3F7', textTransform:'uppercase', letterSpacing:'.04em', marginBottom:3 }}>{rallyPat.label}</div>
                        <p style={{ fontFamily:T.body, fontSize:10, color:T.inkDim, lineHeight:1.55, margin:0 }}>{rallyPat.desc}</p>
                      </div>
                    </div>
                  </>
                )}

                {/* ── Grid 2×2 de chips de preferência ── */}
                <Sh color={`${sc}88`}>Perfil de Jogo</Sh>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
                  {[
                    { label:'Construção', meta:bs, color:sc },
                    { label:'Cadência',   meta:rc, color:'#FFB74D' },
                    { label:'Risco',      meta:rp, color:'#FF7043' },
                    { label:'Rede',       meta:ng, color:'#26C6DA' },
                  ].map(({ label, meta, color }) => (
                    <div key={label} style={{ padding:'9px 11px', background:`${color}08`, border:`1px solid ${color}22`, borderTop:`2px solid ${color}55` }}>
                      <div style={{ fontFamily:T.mono, fontSize:6, letterSpacing:'.32em', color:`${color}66`, textTransform:'uppercase', marginBottom:4 }}>{label}</div>
                      <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:2 }}>
                        <span style={{ fontSize:13, lineHeight:1 }}>{meta.icon}</span>
                        <span style={{ fontFamily:T.cond, fontWeight:700, fontSize:12, color, textTransform:'uppercase', letterSpacing:'.04em', lineHeight:1 }}>{meta.label}</span>
                      </div>
                      <div style={{ fontFamily:T.mono, fontSize:7, color:`${color}55`, letterSpacing:'.22em' }}>{meta.abbr}</div>
                    </div>
                  ))}
                </div>

              </div>

              {/* PREFS — right sidebar */}
              <div className="upp2-scroll" style={{ width:'clamp(200px,22vw,255px)', flexShrink:0, padding:'20px 16px', background:'rgba(0,0,0,.14)', overflowY:'auto' }}>

                {/* Arquétipo */}
                <div style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 14px', marginBottom:18, background:`${sc}0d`, borderLeft:`3px solid ${sc}` }}>
                  <span style={{ fontSize:24, lineHeight:1, flexShrink:0 }}>{archetype?.icon ?? '🎾'}</span>
                  <div>
                    <div style={{ fontFamily:T.mono, fontSize:6, letterSpacing:'.38em', color:`${sc}66`, textTransform:'uppercase', marginBottom:3 }}>Arquétipo</div>
                    <div style={{ fontFamily:T.display, fontSize:15, color:sc, textTransform:'uppercase', letterSpacing:'.05em', lineHeight:1 }}>{archetype?.name ?? '—'}</div>
                    {archetype?.desc && <p style={{ fontFamily:T.body, fontSize:9, color:T.inkFaint, lineHeight:1.4, margin:'4px 0 0' }}>{archetype.desc}</p>}
                  </div>
                </div>

                {/* Adaptabilidade — qualitativa */}
                <div style={{ marginBottom:16 }}>
                  <div style={{ fontFamily:T.mono, fontSize:6, letterSpacing:'.38em', color:`${adpt.color}66`, textTransform:'uppercase', marginBottom:5 }}>Adaptabilidade</div>
                  <div style={{ fontFamily:T.cond, fontWeight:700, fontSize:14, color:adpt.color, textTransform:'uppercase', marginBottom:4 }}>{adpt.label}</div>
                  <p style={{ fontFamily:T.body, fontSize:10, color:T.inkFaint, lineHeight:1.55, margin:0 }}>
                    {prefs.adaptability >= 72 ? 'Detecta padrões que não funcionam e muda o plano mid-match.'
                     : prefs.adaptability >= 55 ? 'Consegue ajustar o jogo, mas demora para reconhecer o problema.'
                     : 'Tende a insistir no mesmo padrão mesmo quando está perdendo.'}
                  </p>
                </div>

                {np.potential && (
                  <div style={{ borderLeft:`2px solid rgba(255,255,255,.12)`, paddingLeft:12, marginBottom:14 }}>
                    <div style={{ fontFamily:T.mono, fontSize:6, letterSpacing:'.36em', color:'rgba(237,232,223,.25)', textTransform:'uppercase', marginBottom:6 }}>Perspectiva do Mercado</div>
                    <p style={{ fontFamily:T.body, fontSize:10, color:'rgba(237,232,223,.55)', lineHeight:1.6, margin:0, fontStyle:'italic' }}>
                      {getMarketAssessment(np, year ?? 2025)}
                    </p>
                  </div>
                )}
                {np.developmentStyle && (
                  <div style={{ borderLeft:`2px solid ${sc}44`, paddingLeft:12, marginBottom:14 }}>
                    <div style={{ fontFamily:T.mono, fontSize:6, letterSpacing:'.36em', color:`${sc}66`, textTransform:'uppercase', marginBottom:4 }}>Desenvolvimento</div>
                    <p style={{ fontFamily:T.body, fontSize:10, color:T.inkFaint, lineHeight:1.6, margin:0, fontStyle:'italic' }}>
                      {arcNarrative(np) ?? '—'}
                    </p>
                  </div>
                )}

                {/* Peso no engine */}
                <div style={{ height:1, background:T.line, margin:'14px 0 12px' }} />
                <div style={{ fontFamily:T.mono, fontSize:6, letterSpacing:'.3em', color:T.inkFaint, textTransform:'uppercase', marginBottom:10 }}>Peso no Engine</div>
                {[
                  { label:'Construção', desc:'Modifica scores de direção (cruzado vs DTL)' },
                  { label:'Cadência',   desc:'Penaliza/bônus no ACCEL por número de bolas' },
                  { label:'Risco',      desc:'Escala golpes com riskBase alto/baixo' },
                  { label:'Rede',       desc:'Peso na decisão de aproximação' },
                ].map(({ label, desc }) => (
                  <div key={label} style={{ marginBottom:8, paddingLeft:10, borderLeft:`1px solid ${T.line}` }}>
                    <div style={{ fontFamily:T.cond, fontWeight:700, fontSize:10, color:T.inkDim, textTransform:'uppercase' }}>{label}</div>
                    <div style={{ fontFamily:T.body, fontSize:9, color:T.inkFaint, lineHeight:1.5 }}>{desc}</div>
                  </div>
                ))}
              </div>
            </>
          );
        })()}

        {view === 'atributos' && (() => {
          const burdenAttrs = new Set(getBurdenAffectedAttrs(np));
          return (
          <>
            {/* ATRIBUTOS — left cats */}
            <div className="upp2-scroll" style={{ flex:1, borderRight:`1px solid ${T.line}`, padding:'22px 22px', overflowY:'auto' }}>
              {burdenAttrs.size > 0 && (
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14,
                  padding:'7px 12px', background:'rgba(255,112,67,.08)', border:'1px solid rgba(255,112,67,.25)' }}>
                  <span style={{ fontSize:13 }}>🩻</span>
                  <span style={{ fontFamily:T.mono, fontSize:7, color:'#FF7043', letterSpacing:2, textTransform:'uppercase' }}>
                    Desgaste por lesões — declínio amplificado
                  </span>
                </div>
              )}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0 28px' }}>
                <div>{catsL.map(cat => <CatBlock key={cat.id} cat={cat} attrs={np.attrs} burdenAttrs={burdenAttrs} />)}</div>
                <div>{catsR.map(cat => <CatBlock key={cat.id} cat={cat} attrs={np.attrs} burdenAttrs={burdenAttrs} />)}</div>
              </div>
            </div>
            {/* ATRIBUTOS — right summary */}
            <div className="upp2-scroll" style={{ width:'clamp(190px,16vw,240px)', flexShrink:0, background:T.bg2, padding:'22px 16px', overflowY:'auto' }}>
              <div style={{ border:`1px solid ${sc}33`, background:`${sc}08`, padding:'16px', textAlign:'center', marginBottom:18, clipPath:'polygon(6px 0,100% 0,calc(100% - 6px) 100%,0 100%)' }}>
                {(() => {
                  const tier = ovrTier(ov);
                  return (
                    <>
                      <div style={{ fontFamily:T.mono, fontSize:7, letterSpacing:'.44em', color:T.inkFaint, textTransform:'uppercase', marginBottom:3 }}>Nível</div>
                      <div style={{ fontFamily:T.display, fontSize:52, color:tier.color, lineHeight:.85 }}>{tier.grade}</div>
                      <div style={{ fontFamily:T.body, fontSize:10, color:`${tier.color}cc`, marginTop:7, lineHeight:1.4 }}>{tier.label}</div>
                      <div style={{ fontFamily:T.body, fontSize:9, color:'rgba(237,232,223,.35)', marginTop:5, lineHeight:1.4, fontStyle:'italic' }}>{tier.sublabel}</div>
                    </>
                  );
                })()}
              </div>
              <Sh color={sc}>Por Categoria</Sh>
              {ATTR_CATEGORIES.map(cat => {
                const catGrade = catDescriptor(cat.id, np.attrs);
                return (
                  <div key={cat.id} style={{ marginBottom:9 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:3 }}>
                      <span style={{ fontFamily:T.mono, fontSize:7, letterSpacing:'.28em', color:cat.color, textTransform:'uppercase' }}>{cat.label}</span>
                      <div style={{ display:'flex', alignItems:'baseline', gap:5 }}>
                        <span style={{ fontFamily:T.display, fontSize:18, color:catGrade.color, lineHeight:1 }}>{catGrade.grade}</span>
                        <span style={{ fontFamily:T.mono, fontSize:6, color:`${catGrade.color}77`, textTransform:'uppercase', letterSpacing:'.1em' }}>{catGrade.label}</span>
                      </div>
                    </div>
                    <Bar value={catGrade.widthPct ?? 60} color={catGrade.color} height={3} />
                  </div>
                );
              })}
            </div>
          </>
          );
        })()}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// TAB 3: CARREIRA
// ─────────────────────────────────────────────────────────────────
function TabCarreira({ np, sc, tournamentResults, chronicleEngine = null, rivalrySystem = null, allPlayers = [], coachPool = [], year = null }) {
  const ct = np.careerTitles ?? { gs:0, masters:0, finals:0, atp500:0, atp250:0 };

  // Sponsor events do ChronicleEngine (conecta sponsorTimeline ao perfil)
  const sponsorEvents = React.useMemo(() => {
    if (!chronicleEngine || !np?.id) return [];
    try { return chronicleEngine.getSponsorTimeline(np.id) ?? []; } catch { return []; }
  }, [chronicleEngine, np?.id]);

  // Universe wins — suporta formato completo (bracket.champion) e slim (res.champion)
  const uvWins = [];
  if (tournamentResults) {
    for (const [, res] of Object.entries(tournamentResults)) {
      // Slim: res.champion direto; Completo: res.bracket.champion
      const champ = res?._slim ? res.champion : res?.bracket?.champion;
      if (!champ || champ.id !== np.id) continue;
      const t = res.tournament ?? {};
      const yr = t.season ?? res._season ?? '?';
      uvWins.push({ name:t.name??'Torneio', category:t.category??'', year:yr });
    }
    uvWins.sort((a,b) => {
      const ord = ['GRAND_SLAM','MASTERS_1000','FINALS','ATP_500','ATP_250','ATP_100'];
      const co = ord.indexOf(a.category) - ord.indexOf(b.category);
      return co !== 0 ? co : String(a.year).localeCompare(String(b.year));
    });
  }

  // Se temos CarreiraTimeline disponível (universo com chronicleEngine), renderiza ela no painel direito
  const hasTimeline = chronicleEngine && np?.careerHistory?.length > 0;

  // Total de títulos: quando tournamentResults disponível, usa uvWins (fonte única, sem double-count)
  const total = tournamentResults
    ? uvWins.length
    : (ct.gs??0)+(ct.masters??0)+(ct.finals??0)+(ct.atp500??0)+(ct.atp250??0);

  const TIERS = [
    { key:'gs',      label:'Grand Slams',    color:'#FFD700', icon:'⭐' },
    { key:'masters', label:'Masters 1000',   color:'#E8A020', icon:'🏆' },
    { key:'finals',  label:'ATP Finals',     color:'#AA44FF', icon:'💎' },
    { key:'atp500',  label:'ATP 500',        color:'#00BCD4', icon:'🥇' },
    { key:'atp250',  label:'ATP 250',        color:'#66BB6A', icon:'🎯' },
    { key:'olympic_gold', label:'Ouro Olímpico', color:'#1976D2', icon:'🥇' },
  ];

  // Career moments (do plano de personalidade dinâmica)
  const moments = np.personality?.careerMoments ?? [];

  return (
    <div style={{ flex:1, display:'flex', overflow:'hidden', minHeight:0 }}>
      {/* LEFT */}
      <div className="upp2-scroll" style={{ flex:1, padding:'22px 26px', borderRight:`1px solid ${T.line}`, overflowY:'auto' }}>
        {/* Hero total */}
        <div style={{ display:'flex', alignItems:'flex-end', gap:24, marginBottom:26, paddingBottom:22, borderBottom:`1px solid ${T.line}` }}>
          <div>
            <div style={{ fontFamily:T.mono, fontSize:7, letterSpacing:'.42em', color:`${sc}99`, textTransform:'uppercase', marginBottom:3 }}>Total de Títulos</div>
            <div style={{ fontFamily:T.display, fontSize:80, color:sc, lineHeight:.85, textShadow:`0 0 40px ${sc}44` }}>{total}</div>
          </div>
          {np.tagline && (
            <div style={{ flex:1, borderLeft:`1px solid ${T.line}`, paddingLeft:22 }}>
              <p style={{ fontFamily:'Georgia,serif', fontStyle:'italic', fontSize:14, lineHeight:1.8, color:T.inkDim, margin:0 }}>"{np.tagline}"</p>
            </div>
          )}
        </div>

        {/* Palmarès */}
        <Sh color={sc}>Palmarès</Sh>
        <div style={{ display:'flex', flexDirection:'column', gap:3, marginBottom:26 }}>
          {TIERS.map(({ key, label, color, icon }) => {
            const catMap = { gs:'GRAND_SLAM', masters:'MASTERS_1000', finals:'ATP_FINALS', atp500:'ATP_500', atp250:'ATP_250', olympic_gold:'OLYMPICS' };
            const uvCount = uvWins.filter(w => w.category === catMap[key]).length;
            // Quando tournamentResults está disponível, uvWins é a fonte autoritativa (evita
            // double-counting: DevelopmentSystem já grava em careerTitles o que está em tournamentResults).
            const ctVal = key === 'olympic_gold' ? (ct.olympic?.gold ?? 0) : (ct[key] ?? 0);
            const v = tournamentResults ? uvCount : ctVal;
            return (
              <div key={key} style={{ display:'flex', alignItems:'center', gap:14, padding:'12px 15px', background:v>0?`${color}08`:'rgba(237,232,223,.015)', border:v>0?`1px solid ${color}30`:'1px solid rgba(237,232,223,.05)', borderLeft:v>0?`3px solid ${color}`:'3px solid rgba(237,232,223,.07)', opacity:v===0?.35:1, clipPath:'polygon(0 0,100% 0,calc(100% - 8px) 100%,0 100%)' }}>
                <span style={{ fontSize:17, flexShrink:0 }}>{icon}</span>
                <div style={{ flex:1 }}>
                  <div style={{ fontFamily:T.display, fontSize:13, letterSpacing:2, color:v>0?T.ink:T.inkFaint, textTransform:'uppercase' }}>{label}</div>
                </div>
                <div style={{ fontFamily:T.display, fontSize:v>=10?28:36, color:v>0?color:T.inkFaint, lineHeight:1 }}>{v}</div>
              </div>
            );
          })}
        </div>

        {/* Universe wins */}
        {uvWins.length > 0 && (
          <div>
            <Sh color={T.gold}>Títulos no Universo</Sh>
            <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
              {uvWins.map((w,i) => {
                const tc = CAT_COLOR[w.category] ?? T.inkDim;
                return (
                  <div key={i} className="upp2-hrow" style={{ borderLeft:`2px solid ${tc}55` }}>
                    <span style={{ fontSize:12, flexShrink:0 }}>🏆</span>
                    <div style={{ flex:1, fontFamily:T.display, fontSize:12, letterSpacing:1, color:T.ink, textTransform:'uppercase', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{w.name}</div>
                    <span style={{ fontFamily:T.mono, fontSize:8, color:tc, flexShrink:0, letterSpacing:1 }}>{w.year}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* RIGHT — CarreiraTimeline (se disponível no universo) ou marcos de personalidade */}
      <div className="upp2-scroll" style={{ width:'clamp(260px,32vw,380px)', flexShrink:0, padding: hasTimeline ? 0 : '22px 18px', background:'rgba(0,0,0,.12)', overflowY:'auto', display:'flex', flexDirection:'column' }}>
        {hasTimeline ? (
          /* CarreiraTimeline: agora conectada com sponsorEvents do ChronicleEngine */
          <CarreiraTimeline
            np={np}
            sc={sc}
            rivalrySystem={rivalrySystem}
            allPlayers={allPlayers}
            coachPool={coachPool}
            year={year}
            sponsorEvents={sponsorEvents}
          />
        ) : (
          <>
            <div style={{ padding:'22px 18px', paddingBottom:8 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                <Sh color={sc}>Marcos da Carreira</Sh>
                {moments.length > 0 && (
                  <span style={{ fontFamily:T.mono, fontSize:7, color:T.inkFaint, letterSpacing:'.2em' }}>
                    {moments.length} registro{moments.length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </div>
            <div style={{ flex:1, padding:'0 18px 22px', overflowY:'auto' }}>
              {moments.length === 0 ? (
                <div style={{ display:'flex', flexDirection:'column', alignItems:'center', padding:'40px 0', gap:10, opacity:.3 }}>
                  <div style={{ fontSize:36 }}>📖</div>
                  <div style={{ fontFamily:T.mono, fontSize:8, letterSpacing:3, color:T.inkFaint, textTransform:'uppercase', textAlign:'center' }}>Disponível após temporadas no Universo</div>
                </div>
              ) : (
                <div style={{ position:'relative', paddingLeft:16 }}>
                  {/* Timeline line */}
                  <div style={{ position:'absolute', left:4, top:6, bottom:6, width:1, background:`linear-gradient(180deg,${sc}55,${sc}11)` }} />
                  {[...moments].sort((a,b) => (b.year ?? 0) - (a.year ?? 0)).map((m, i) => {
                    const meta      = MOMENT_META[m.type] ?? { color:sc, icon:'📌', label:m.type };
                    const typeColor = meta.color;
                    const hasMoodShift   = m.moodAfter && m.moodBefore && m.moodAfter !== m.moodBefore;
                    const hasRepShift    = m.repBefore  && m.repAfter  && m.repBefore  !== m.repAfter;
                    const hasMarketShift = m.marketAfter != null && m.marketBefore != null && Math.abs(m.marketAfter - m.marketBefore) >= 3;
                    return (
                      <div key={i} style={{ position:'relative', marginBottom:16 }}>
                        {/* dot */}
                        <div style={{ position:'absolute', left:-16, top:5, width:8, height:8, borderRadius:'50%', background:typeColor, border:`2px solid ${T.bg0}`, boxShadow:`0 0 6px ${typeColor}88` }} />
                        {/* header */}
                        <div style={{ display:'flex', alignItems:'center', gap:5, marginBottom:2 }}>
                          <span style={{ fontSize:10 }}>{meta.icon}</span>
                          <span style={{ fontFamily:T.mono, fontSize:7, letterSpacing:'.32em', color:`${typeColor}66`, textTransform:'uppercase' }}>{m.year} · {meta.label}</span>
                        </div>
                        <div style={{ fontFamily:T.cond, fontWeight:700, fontSize:13, color:typeColor, textTransform:'uppercase', letterSpacing:'.04em', marginBottom:4 }}>{m.title}</div>
                        <p style={{ fontFamily:T.body, fontSize:11, color:T.inkDim, lineHeight:1.5, margin:0 }}>{m.desc}</p>
                        {/* change indicators */}
                        {(hasMoodShift || hasRepShift || hasMarketShift) && (
                          <div style={{ display:'flex', flexWrap:'wrap', gap:4, marginTop:6 }}>
                            {hasMoodShift && (
                              <div style={{ display:'flex', alignItems:'center', gap:3, background:`${MOOD_COLOR[m.moodAfter]??T.inkFaint}11`, border:`1px solid ${MOOD_COLOR[m.moodAfter]??T.inkFaint}33`, padding:'2px 6px' }}>
                                <span style={{ fontFamily:T.mono, fontSize:6, color:`${MOOD_COLOR[m.moodBefore]??T.inkFaint}99`, textDecoration:'line-through' }}>{MOOD_LABELS[m.moodBefore] ?? m.moodBefore}</span>
                                <span style={{ fontFamily:T.mono, fontSize:7, color:'#ffffff44' }}>→</span>
                                <span style={{ fontFamily:T.mono, fontSize:6, color:MOOD_COLOR[m.moodAfter]??T.inkDim, fontWeight:700 }}>{MOOD_LABELS[m.moodAfter] ?? m.moodAfter}</span>
                              </div>
                            )}
                            {hasRepShift && (
                              <div style={{ display:'flex', alignItems:'center', gap:3, background:`${REP_COLOR[m.repAfter]??T.inkFaint}11`, border:`1px solid ${REP_COLOR[m.repAfter]??T.inkFaint}33`, padding:'2px 6px' }}>
                                <span style={{ fontFamily:T.mono, fontSize:6, color:`${REP_COLOR[m.repBefore]??T.inkFaint}99`, textDecoration:'line-through' }}>{m.repBefore}</span>
                                <span style={{ fontFamily:T.mono, fontSize:7, color:'#ffffff44' }}>→</span>
                                <span style={{ fontFamily:T.mono, fontSize:6, color:REP_COLOR[m.repAfter]??T.inkDim, fontWeight:700 }}>{m.repAfter}</span>
                              </div>
                            )}
                            {hasMarketShift && (
                              <div style={{ display:'flex', alignItems:'center', gap:3, background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.1)', padding:'2px 6px' }}>
                                <span style={{ fontFamily:T.mono, fontSize:6, color:m.marketAfter > m.marketBefore ? '#22C55E' : '#EF4444' }}>
                                  {m.marketAfter > m.marketBefore ? '▲' : '▼'} MKT {m.marketAfter}
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                        {/* persona shift cause */}
                        {m.type === 'PERSONA_SHIFT' && m.cause && (
                          <div style={{ marginTop:6, borderLeft:`2px solid ${typeColor}44`, paddingLeft:8 }}>
                            <p style={{ fontFamily:T.body, fontStyle:'italic', fontSize:10, color:T.inkFaint, lineHeight:1.5, margin:0 }}>"{m.cause}"</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// TAB 4: TRAJETÓRIA
// ─────────────────────────────────────────────────────────────────
function OVRChart({ history, rankHist, sc, year }) {
  const [hover, setHover] = useState(null);
  if (!history.length) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', padding:'40px 0', opacity:.25 }}>
      <div style={{ fontFamily:T.mono, fontSize:9, letterSpacing:3, color:T.inkFaint, textTransform:'uppercase' }}>Disponível após a 1ª temporada</div>
    </div>
  );

  const W=620, H=160, PL=40, PR=20, PT=16, PB=28;
  const IW=W-PL-PR, IH=H-PT-PB;
  const allY = history.map(h=>h.year);
  const minY = allY[0], maxY = allY[allY.length-1];
  const span = Math.max(1, maxY-minY);
  const xOf = y => PL + ((y-minY)/span)*IW;
  const OVR_MIN=48, OVR_MAX=100;
  const ovrY = v => PT+IH - ((Math.min(OVR_MAX,Math.max(OVR_MIN,v))-OVR_MIN)/(OVR_MAX-OVR_MIN))*IH;
  const ovrPts = history.map(h => ({ x:xOf(h.year), y:ovrY(h.ovr), ...h }));

  function smooth(pts) {
    if (pts.length < 2) return pts.length ? `M${pts[0].x},${pts[0].y}` : '';
    let d = `M${pts[0].x},${pts[0].y}`;
    for (let i=1;i<pts.length;i++) {
      const p=pts[i-1], c=pts[i], cx=(p.x+c.x)/2;
      d += ` C${cx},${p.y} ${cx},${c.y} ${c.x},${c.y}`;
    }
    return d;
  }

  const path = smooth(ovrPts);
  const fill = ovrPts.length > 1 ? `${path} L${ovrPts[ovrPts.length-1].x},${PT+IH} L${ovrPts[0].x},${PT+IH} Z` : '';
  const gridY = [50,60,70,80,90].map(v => ({ v, y:ovrY(v) }));
  const gridX = allY.filter((_,i)=>i%Math.max(1,Math.floor(allY.length/5))===0||i===allY.length-1);
  const declineYr = history.find(h=>h.inDecline)?.year ?? null;
  const gsTypes = new Set(['SLAM','GRAND_SLAM']);

  function onMove(e) {
    const r=e.currentTarget.getBoundingClientRect();
    const mx=(e.clientX-r.left)*(W/r.width);
    const yr=minY+((mx-PL)/IW)*span;
    const near=history.reduce((b,h)=>Math.abs(h.year-yr)<Math.abs(b.year-yr)?h:b,history[0]);
    setHover({ yr:near.year, ovr:near.ovr, age:near.age, titleWon:near.titleWon, inDecline:near.inDecline, x:mx });
  }

  return (
    <div style={{ position:'relative', marginBottom:4 }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width:'100%', display:'block', cursor:'crosshair', overflow:'visible' }}
        onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
        <defs>
          <linearGradient id={`ovrFill_${sc}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={sc} stopOpacity=".22"/>
            <stop offset="100%" stopColor={sc} stopOpacity=".02"/>
          </linearGradient>
        </defs>
        {declineYr && <rect x={xOf(declineYr)} y={PT} width={PL+IW-xOf(declineYr)} height={IH} fill="rgba(239,68,68,.05)"/>}
        {gridY.map(({ v, y }) => (
          <g key={v}>
            <line x1={PL} y1={y} x2={PL+IW} y2={y} stroke="rgba(237,232,223,.05)" strokeWidth="1" strokeDasharray={v===70?"3,3":undefined}/>
            <text x={PL-5} y={y+3} textAnchor="end" fill="rgba(237,232,223,.22)" fontSize="8" fontFamily="Space Mono,monospace">{v}</text>
          </g>
        ))}
        {fill && <path d={fill} fill={`url(#ovrFill_${sc})`}/>}
        {path && <path d={path} fill="none" stroke={sc} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>}
        {history.filter(h=>h.titleWon||h.inDecline).map((ev,i) => {
          const ex=xOf(ev.year);
          const isGS=gsTypes.has(ev.titleWon);
          if (ev.inDecline && !ev.titleWon) return <line key={i} x1={ex} y1={PT} x2={ex} y2={PT+IH} stroke="#EF4444" strokeWidth="1" strokeDasharray="3,3" opacity=".45"/>;
          return (
            <g key={i}>
              <circle cx={ex} cy={ovrY(ev.ovr)} r={isGS?5:3.5} fill={isGS?'#FFD700':sc} stroke={T.bg0} strokeWidth="1.5"/>
              {isGS && <text x={ex} y={PT+10} textAnchor="middle" fill="#FFD700" fontSize="8" fontFamily="Space Mono,monospace">GS</text>}
            </g>
          );
        })}
        {ovrPts.map((p,i) => <circle key={i} cx={p.x} cy={p.y} r="2.5" fill={sc} stroke={T.bg0} strokeWidth="1.5" opacity=".7"/>)}
        {hover && <line x1={xOf(hover.yr)} y1={PT} x2={xOf(hover.yr)} y2={PT+IH} stroke="rgba(237,232,223,.25)" strokeWidth="1"/>}
        <line x1={PL} y1={PT+IH} x2={PL+IW} y2={PT+IH} stroke="rgba(237,232,223,.1)" strokeWidth="1"/>
        {gridX.map(y => <text key={y} x={xOf(y)} y={PT+IH+14} textAnchor="middle" fill="rgba(237,232,223,.25)" fontSize="8" fontFamily="Space Mono,monospace">{y}</text>)}
      </svg>
      {hover && (
        <div style={{ position:'absolute', top:4, left:`clamp(0px,${hover.x/W*100}% - 70px, calc(100% - 140px))`, width:140, pointerEvents:'none', background:'rgba(5,7,9,.9)', border:`1px solid ${sc}44`, padding:'8px 10px', zIndex:10, backdropFilter:'blur(8px)' }}>
          <div style={{ fontFamily:T.display, fontSize:11, letterSpacing:2, color:sc, marginBottom:2 }}>{hover.yr}</div>
          <div style={{ fontFamily:T.mono, fontSize:10, color:T.ink }}>Nível <span style={{ color: ovrTier(hover.ovr).color, fontWeight:700 }}>{ovrTier(hover.ovr).grade}</span></div>
          {hover.age && <div style={{ fontFamily:T.mono, fontSize:9, color:T.inkFaint }}>Idade {hover.age}</div>}
          {hover.titleWon && <div style={{ fontFamily:T.mono, fontSize:9, color:'#FFD700' }}>{gsTypes.has(hover.titleWon)?'⭐ Grand Slam':'🏆 Título'}</div>}
          {hover.inDecline && <div style={{ fontFamily:T.mono, fontSize:9, color:'#EF4444' }}>↘ Declínio</div>}
        </div>
      )}
    </div>
  );
}

function TabTrajetoria({ np, sc, rankingStore, year }) {
  const history = np._seasonHistory ?? [];
  const rankHist = np._rankHistory ?? [];
  const ov = overallRating(np.attrs);
  const potCat = np.potential ? getPotentialCategory(np.potential) : null;
  const arc = np.developmentStyle ? getCareerArc(np.developmentStyle) : null;
  const lastSeason = history[history.length-1] ?? null;
  const inDecline = lastSeason?.inDecline ?? false;
  const yearsToPeak = np.peakAge ? np.peakAge - (np.age??25) : null;

  let phaseLabel, phaseColor, phaseIcon;
  if (inDecline)                                { phaseLabel='Em Declínio';        phaseColor='#EF4444'; phaseIcon='📉'; }
  else if (yearsToPeak !== null && yearsToPeak<=1) { phaseLabel='No Pico';            phaseColor='#FFD700'; phaseIcon='⭐'; }
  else if (yearsToPeak !== null && yearsToPeak<=3) { phaseLabel='Chegando ao Pico';   phaseColor='#FF9800'; phaseIcon='🔥'; }
  else                                            { phaseLabel='Em Desenvolvimento';  phaseColor='#22C55E'; phaseIcon='📈'; }

  const peakOvr = history.length ? Math.max(...history.map(h=>h.ovr)) : ov;
  const currentRank = getPlayerRank(rankingStore, np.id, false)?.position ?? np.rankPosition ?? null;
  const peakRank = rankHist.length ? Math.min(...rankHist.map(h=>h.rank).filter(r=>r>0)) : null;

  const attrLabel = (key) => {
    for (const cat of ATTR_CATEGORIES) {
      const a = cat.attrs.find(a => a.key===key);
      if (a) return { label:a.label, color:cat.color };
    }
    return { label:key, color:sc };
  };

  const attrChanges = lastSeason?.attrChanges ?? {};
  const gains  = Object.entries(attrChanges).filter(([,d])=>d>0).sort(([,a],[,b])=>b-a);
  const losses = Object.entries(attrChanges).filter(([,d])=>d<0).sort(([,a],[,b])=>a-b);
  const ovrDelta = lastSeason?.ovrDelta ?? 0;
  const gsTypes = new Set(['SLAM','GRAND_SLAM']);

  return (
    <div style={{ flex:1, display:'flex', overflow:'hidden', minHeight:0 }}>
      {/* LEFT */}
      <div className="upp2-scroll" style={{ flex:1, padding:'22px 24px', borderRight:`1px solid ${T.line}`, overflowY:'auto' }}>
        {/* Summary strip — sem OVR numérico */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:2, marginBottom:22 }}>
          {[
            { label:'Melhor Fase',   value: ovrTier(peakOvr).grade,             color: ovrTier(peakOvr).color },
            { label:'Melhor Rank',   value: peakRank ? `#${peakRank}` : '—',    color:T.gold },
            { label:'Rank Atual',    value: currentRank ? `#${currentRank}` : '—', color:sc },
            { label:'Grand Slams',   value: history.filter(h=>gsTypes.has(h.titleWon)).length, color:'#FFD700' },
          ].map(({ label, value, color }) => (
            <StatCard key={label} label={label} value={value} color={color} small />
          ))}
        </div>

        <Sh color={sc}>Curva de Evolução</Sh>
        <OVRChart history={history} rankHist={rankHist} sc={sc} year={year} />

        {/* Fase + avaliação de mercado */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginTop:18, marginBottom:22 }}>
          {(() => {
            const phase = scoutPhaseLabel(np);
            return (
              <div style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 14px', border:`1px solid ${phase.color}28`, background:`${phase.color}07` }}>
                <span style={{ fontSize:22 }}>{phase.icon}</span>
                <div>
                  <div style={{ fontFamily:T.mono, fontSize:7, letterSpacing:3, color:T.inkFaint, textTransform:'uppercase' }}>Fase</div>
                  <div style={{ fontFamily:T.display, fontSize:16, color:phase.color, letterSpacing:1 }}>{phase.label}</div>
                </div>
              </div>
            );
          })()}
          <div style={{ padding:'12px 14px', border:`1px solid rgba(255,255,255,.08)`, background:'rgba(255,255,255,.02)' }}>
            <div style={{ fontFamily:T.mono, fontSize:7, letterSpacing:3, color:'rgba(237,232,223,.3)', textTransform:'uppercase', marginBottom:6 }}>Avaliação do Mercado</div>
            <p style={{ fontFamily:T.body, fontSize:10, color:'rgba(237,232,223,.55)', lineHeight:1.6, margin:0, fontStyle:'italic' }}>
              {getMarketAssessment(np, year ?? 2025)}
            </p>
          </div>
        </div>

        {/* Timeline por temporada */}
        {history.length > 0 && (
          <div>
            <Sh color={sc}>Temporada a Temporada</Sh>
            <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
              {[...history].reverse().map((h, i) => {
                const isGS = gsTypes.has(h.titleWon);
                const rh = rankHist.find(r=>r.year===h.year);
                return (
                  <div key={h.year} style={{ display:'flex', alignItems:'center', gap:10, padding:isGS?'10px 13px':'7px 13px', border:isGS?'1px solid rgba(255,215,0,.2)':h.inDecline?'1px solid rgba(239,68,68,.1)':'1px solid rgba(237,232,223,.05)', background:isGS?'rgba(255,215,0,.04)':h.inDecline?'rgba(239,68,68,.02)':'rgba(237,232,223,.01)', position:'relative' }}>
                    {isGS && <div style={{ position:'absolute', left:0, top:0, bottom:0, width:2, background:'#FFD700' }}/>}
                    {h.inDecline && !h.titleWon && <div style={{ position:'absolute', left:0, top:0, bottom:0, width:2, background:'#EF4444', opacity:.5 }}/>}
                    <span style={{ fontFamily:T.display, fontSize:13, letterSpacing:2, color:isGS?'#FFD700':h.inDecline?'#EF4444':sc, minWidth:44 }}>{h.year}</span>
                    {h.age && <span style={{ fontFamily:T.mono, fontSize:8, color:T.inkFaint, minWidth:24 }}>{h.age}a</span>}
                    <div style={{ flex:1 }}>
                      {isGS && <span style={{ fontFamily:T.display, fontSize:11, color:'#FFD700', letterSpacing:1 }}>⭐ GRAND SLAM</span>}
                      {h.titleWon && !isGS && <span style={{ fontFamily:T.display, fontSize:11, color:sc, letterSpacing:1 }}>🏆 TÍTULO</span>}
                      {h.inDecline && !h.titleWon && <span style={{ fontFamily:T.mono, fontSize:7, color:'#EF4444' }}>↘ declínio</span>}
                    </div>
                    <div style={{ textAlign:'right', minWidth:60 }}>
                      <span style={{ fontFamily:T.display, fontSize:15, color:isGS?'#FFD700':sc }}>{h.ovr}</span>
                      <span style={{ fontFamily:T.mono, fontSize:7, color:T.inkFaint, marginLeft:2 }}>OVR</span>
                      {h.ovrDelta !== 0 && <div style={{ fontFamily:T.mono, fontSize:8, color:h.ovrDelta>0?'#22C55E':'#EF4444' }}>{h.ovrDelta>0?'+':''}{h.ovrDelta?.toFixed(1)}</div>}
                    </div>
                    {rh && <div style={{ fontFamily:T.display, fontSize:14, color:T.gold, minWidth:48, textAlign:'right' }}>#{rh.rank}</div>}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* RIGHT — última temporada */}
      <div className="upp2-scroll" style={{ width:'clamp(220px,26vw,280px)', flexShrink:0, padding:'22px 18px', background:'rgba(0,0,0,.12)', overflowY:'auto' }}>
        <Sh color={sc}>Última Temporada</Sh>
        {lastSeason ? (
          <>
            <div style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 14px', border:`1px solid ${T.lineMid}`, marginBottom:12 }}>
              <div style={{ textAlign:'center' }}>
                <div style={{ fontFamily:T.mono, fontSize:7, letterSpacing:3, color:T.inkFaint, textTransform:'uppercase' }}>{lastSeason.year}</div>
                <div style={{ fontFamily:T.display, fontSize:11, color:T.ink }}>{lastSeason.age} anos</div>
              </div>
              <div style={{ width:1, height:30, background:T.line }}/>
              <div style={{ textAlign:'center' }}>
                <div style={{ fontFamily:T.mono, fontSize:7, letterSpacing:2, color:T.inkFaint, textTransform:'uppercase' }}>Δ OVR</div>
                <div style={{ fontFamily:T.display, fontSize:28, lineHeight:1, color:ovrDelta>0?'#22C55E':ovrDelta<0?'#EF4444':T.inkFaint }}>{ovrDelta>0?'+':''}{ovrDelta}</div>
              </div>
              <div style={{ width:1, height:30, background:T.line }}/>
              <div style={{ textAlign:'center' }}>
                <div style={{ fontFamily:T.mono, fontSize:7, letterSpacing:2, color:T.inkFaint, textTransform:'uppercase' }}>OVR</div>
                <div style={{ fontFamily:T.display, fontSize:22, color:sc }}>{lastSeason.ovr}</div>
              </div>
            </div>

            {gains.length > 0 && (
              <div style={{ marginBottom:10 }}>
                <div style={{ fontFamily:T.mono, fontSize:7, letterSpacing:3, color:'#22C55E', textTransform:'uppercase', marginBottom:6 }}>▲ Cresceram</div>
                {gains.map(([k,d]) => { const { label, color } = attrLabel(k); const cur = np.attrs[k]??0; return (
                  <div key={k} style={{ display:'flex', alignItems:'center', gap:8, padding:'6px 10px', background:T.bg3, borderLeft:`2px solid ${color}`, marginBottom:3 }}>
                    <span style={{ fontFamily:T.cond, fontWeight:600, fontSize:10, color:T.inkDim, flex:1, textTransform:'uppercase' }}>{label}</span>
                    <span style={{ fontFamily:T.display, fontSize:15, color }}>{cur}</span>
                    <span style={{ fontFamily:T.display, fontSize:12, color:'#22C55E' }}>+{d}</span>
                  </div>
                ); })}
              </div>
            )}
            {losses.length > 0 && (
              <div>
                <div style={{ fontFamily:T.mono, fontSize:7, letterSpacing:3, color:'#EF4444', textTransform:'uppercase', marginBottom:6 }}>▼ Declinaram</div>
                {losses.map(([k,d]) => { const { label, color } = attrLabel(k); const cur = np.attrs[k]??0; return (
                  <div key={k} style={{ display:'flex', alignItems:'center', gap:8, padding:'6px 10px', background:T.bg3, borderLeft:'2px solid rgba(239,68,68,.4)', marginBottom:3 }}>
                    <span style={{ fontFamily:T.cond, fontWeight:600, fontSize:10, color:T.inkFaint, flex:1, textTransform:'uppercase' }}>{label}</span>
                    <span style={{ fontFamily:T.display, fontSize:15, color:'rgba(237,232,223,.5)' }}>{cur}</span>
                    <span style={{ fontFamily:T.display, fontSize:12, color:'#EF4444' }}>{d}</span>
                  </div>
                ); })}
              </div>
            )}
            {gains.length === 0 && losses.length === 0 && (
              <div style={{ fontFamily:T.mono, fontSize:8, color:T.inkFaint, opacity:.4, textAlign:'center', marginTop:14 }}>Sem mudanças de atributo</div>
            )}
          </>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', padding:'40px 0', gap:10, opacity:.3 }}>
            <div style={{ fontSize:36 }}>📊</div>
            <div style={{ fontFamily:T.mono, fontSize:8, letterSpacing:3, color:T.inkFaint, textTransform:'uppercase', textAlign:'center' }}>Dados disponíveis após a 1ª temporada</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// TAB 5: RESULTADOS
// ─────────────────────────────────────────────────────────────────
function TabResultados({ np, sc, tournamentResults }) {
  const [view, setView] = useState('torneios');
  const [openYears, setOpenYears] = useState(null); // null = all open

  const ROUND_LABELS_ORDER = ['R128','R64','R32','R16','QF','SF','F','W'];
  const TP = {
    GRAND_SLAM:   { W:2000,F:1300,SF:800, QF:400,R16:200,R32:100,R64:50, R128:10 },
    MASTERS_1000: { W:1000,F:650, SF:400, QF:200,R16:100,R32:60, R64:30              },
    ATP_500:      { W:500, F:330, SF:200, QF:100,R16:50, R32:25                       },
    ATP_250:      { W:250, F:165, SF:100, QF:50, R16:25, R32:0                        },
    ATP_100:      { W:100, F:60,  SF:36,  QF:18, R16:8,  R32:3,  R64:1               },
    FINALS:       { W:1500,F:1000,SF:500                                               },
  };
  const pts = (cat, round) => TP[cat]?.[round] ?? 0;

  // ── Extrai participações do jogador — slim + completo ──────────────
  const allEntries = useMemo(() => {
    const result = [];
    if (!tournamentResults) return result;
    for (const [, res] of Object.entries(tournamentResults)) {
      const t = res?.tournament;
      if (!t) continue;
      const year   = t.season ?? res._season ?? '?';
      const cat    = t.category ?? 'ATP_250';
      let round    = null;

      if (res._slim) {
        // ── Formato slim ──────────────────────────────────────────────
        const isChamp    = res.champion?.id === np.id;
        const isFinalist = res.finalist?.id === np.id;
        const isSemi     = (res.semis ?? []).some(s => s.id === np.id);
        let wins = 0, participated = false;
        for (const m of res.matches ?? []) {
          if (m.w === np.id) { wins++; participated = true; }
          if (m.l === np.id) { participated = true; }
        }
        if (!participated && !isChamp && !isFinalist && !isSemi) continue;

        if (isChamp)         round = 'W';
        else if (isFinalist) round = 'F';
        else if (isSemi)     round = 'SF';
        else {
          // Deduz pelo número de vitórias antes de perder
          const LABELS = ['R128','R64','R32','R16','QF','SF','F'];
          round = LABELS[wins] ?? 'R64';
        }
      } else {
        // ── Formato completo ──────────────────────────────────────────
        const b = res.bracket;
        if (!b) continue;
        if (b.champion?.id === np.id) {
          round = 'W';
        } else {
          for (let ri = b.rounds.length - 1; ri >= 0; ri--) {
            for (const m of b.rounds[ri]) {
              if (m.isBye || !m.winner) continue;
              if (m.playerA?.id !== np.id && m.playerB?.id !== np.id) continue;
              if (m.winner.id !== np.id) {
                // lost here → round is this round from the end
                const fromEnd = b.rounds.length - 1 - ri;
                const LABELS = ['F','SF','QF','R16','R32','R64','R128'];
                round = LABELS[fromEnd] ?? 'R128';
              }
            }
            if (round) break;
          }
        }
        if (!round) continue;
      }

      // ── Extrair último adversário e sets ──────────────────────────
      let lastOpp = null; // { name, won, sets } — won=true se venceu o jogo
      if (res._slim) {
        // Slim: o último jogo do jogador é a partida que o eliminou (ou a final se campeão)
        if (round === 'W') {
          // Campeão: último adversário foi o finalista
          if (res.finalist) lastOpp = { name: res.finalist.name ?? '?', won: true, sets: null };
        } else if (round === 'F') {
          // Finalista: perdeu para o campeão
          if (res.champion) lastOpp = { name: res.champion.name ?? '?', won: false, sets: null };
        } else {
          // Semifinalista ou anterior: o último jogo perdido
          // No slim, matches tem { w, l, sd, wa } — encontramos o jogo onde np.id === l
          const lastLoss = (res.matches ?? []).filter(m => m.l === np.id).pop();
          if (lastLoss) {
            // Precisamos do nome do vencedor — não está no slim diretamente, mas podemos tentar
            const winnerIsChamp = res.champion?.id === lastLoss.w;
            const winnerIsFinalist = res.finalist?.id === lastLoss.w;
            const winnerIsSemi = (res.semis ?? []).find(s => s.id === lastLoss.w);
            const oppName = winnerIsChamp ? (res.champion?.name ?? '?')
              : winnerIsFinalist ? (res.finalist?.name ?? '?')
              : winnerIsSemi ? (winnerIsSemi.name ?? '?')
              : null;
            const sd = lastLoss.sd ?? null;
            lastOpp = { name: oppName, won: false, sets: sd };
          }
        }
      } else {
        // Formato completo: percorre rounds para encontrar último jogo
        const b = res.bracket;
        if (b) {
          // Busca da final para o início — o primeiro jogo onde o jogador aparece é o último
          for (let ri = b.rounds.length - 1; ri >= 0; ri--) {
            for (const m of b.rounds[ri]) {
              if (m.isBye || !m.winner) continue;
              const isA = m.playerA?.id === np.id;
              const isB = m.playerB?.id === np.id;
              if (!isA && !isB) continue;
              const won = m.winner.id === np.id;
              const opp = isA ? m.playerB : m.playerA;
              const sd  = m.result?.setsDetail ?? null;
              lastOpp = { name: opp?.name ?? '?', won, sets: sd };
              break;
            }
            if (lastOpp) break;
          }
        }
      }

      result.push({
        year,
        name:     t.name ?? '?',
        cat,
        surface:  t.surface ?? 'HARD',
        round,
        points:   pts(cat, round),
        weekIndex: t.weekIndex ?? 0,
        lastOpp,
      });
    }
    // Mais recente primeiro
    return result.sort((a, b) =>
      String(b.year).localeCompare(String(a.year)) ||
      b.weekIndex - a.weekIndex
    );
  }, [tournamentResults, np.id]);

  // Surface stats
  const surfRec = useMemo(() => {
    const rec = { CLAY:{w:0,l:0}, GRASS:{w:0,l:0}, HARD:{w:0,l:0}, INDOOR:{w:0,l:0} };
    for (const e of allEntries) {
      const surf = (e.surface ?? 'HARD').toUpperCase();
      if (!rec[surf]) rec[surf] = { w:0, l:0 };
      if (e.round === 'W') { rec[surf].w++; }
      // wins from round index
    }
    if (tournamentResults) {
      for (const [, res] of Object.entries(tournamentResults)) {
        const t   = res?.tournament;
        if (!t) continue;
        const surf = (t.surface ?? 'HARD').toUpperCase();
        if (!rec[surf]) continue;
        if (res._slim) {
          for (const m of res.matches ?? []) {
            if (m.w === np.id) rec[surf].w++;
            if (m.l === np.id) rec[surf].l++;
          }
        } else {
          for (const round of res.bracket?.rounds ?? []) {
            for (const m of round) {
              if (m.isBye) continue;
              if (m.playerA?.id === np.id || m.playerB?.id === np.id) {
                if (m.winner?.id === np.id) rec[surf].w++;
                else if (m.winner) rec[surf].l++;
              }
            }
          }
        }
      }
    }
    return rec;
  }, [tournamentResults, np.id]);

  const last30 = allEntries.slice(0, 30);
  const titles = allEntries.filter(e => e.round === 'W').length;
  const finals = allEntries.filter(e => e.round === 'F').length;
  const seasons = [...new Set(allEntries.map(e => e.year))].length;
  const totalM = Object.values(surfRec).reduce((s, r) => s + r.w + r.l, 0);

  const roundStyle = r => {
    if (r === 'W')  return { color:'#FFD700', border:'rgba(255,215,0,.4)',   bg:'rgba(255,215,0,.07)' };
    if (r === 'F')  return { color:'#E0E0E0', border:'rgba(255,255,255,.25)', bg:'rgba(255,255,255,.04)' };
    if (r === 'SF') return { color:'#4A90D9', border:'rgba(74,144,217,.3)',  bg:'rgba(74,144,217,.06)' };
    if (r === 'QF') return { color:'#66BB6A', border:'rgba(102,187,106,.3)', bg:'rgba(102,187,106,.06)' };
    return { color:'rgba(237,232,223,.28)', border:'rgba(237,232,223,.1)', bg:'transparent' };
  };

  return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', minHeight:0 }}>
      <SubTabBar tabs={[['torneios','📜 Torneios'], ['superficies','🏟️ Superfícies']]} active={view} onTab={setView} sc={sc} />
      <div className="upp2-scroll" style={{ flex:1, padding:'20px 24px', overflowY:'auto' }} key={view}>

        {view === 'torneios' && (
          <>
            {/* Stats bar */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:2, marginBottom:22 }}>
              <StatCard label="Disputados"  value={allEntries.length} color={T.inkDim} />
              <StatCard label="Títulos"     value={titles}             color='#FFD700'  />
              <StatCard label="Finais"      value={finals}             color='#E0E0E0'  />
              <StatCard label="Temporadas"  value={seasons}            color={sc}       />
            </div>

            {allEntries.length === 0 ? (
              <div style={{ display:'flex', flexDirection:'column', alignItems:'center', padding:'60px 0', gap:10, opacity:.3 }}>
                <div style={{ fontSize:44 }}>📜</div>
                <div style={{ fontFamily:T.mono, fontSize:8, letterSpacing:3, color:T.inkFaint, textTransform:'uppercase' }}>Resultados aparecem após o primeiro torneio</div>
              </div>
            ) : (() => {
              // Agrupa por ano, ordem cronológica dentro de cada ano
              const bySeason = {};
              for (const e of allEntries) {
                const y = String(e.year);
                if (!bySeason[y]) bySeason[y] = [];
                bySeason[y].push(e);
              }
              // Ordena torneios dentro de cada ano por weekIndex (ordem do calendário)
              for (const y of Object.keys(bySeason)) {
                bySeason[y].sort((a, b) => (a.weekIndex ?? 0) - (b.weekIndex ?? 0));
              }
              const yearList = Object.keys(bySeason).sort((a, b) => Number(b) - Number(a));

              return yearList.map(year => {
                const entries = bySeason[year];
                const isOpen = !openYears || openYears.has(year);
                const yearTitles = entries.filter(e => e.round === 'W').length;
                const yearPts = entries.reduce((s, e) => s + (e.points ?? 0), 0);

                return (
                  <div key={year} style={{ marginBottom: 4 }}>
                    {/* Year header — clicável */}
                    <div
                      onClick={() => setOpenYears(prev => {
                        const next = new Set(prev ?? yearList);
                        if (next.has(year)) next.delete(year); else next.add(year);
                        return next;
                      })}
                      style={{
                        display:'flex', alignItems:'center', gap:14,
                        padding:'11px 16px', cursor:'pointer',
                        background: isOpen ? 'rgba(255,255,255,.05)' : 'rgba(255,255,255,.02)',
                        borderLeft:`3px solid ${isOpen ? sc : 'rgba(255,255,255,.12)'}`,
                        borderBottom:`1px solid rgba(255,255,255,.06)`,
                        transition:'all .15s',
                        userSelect:'none',
                      }}
                    >
                      <span style={{ fontFamily:T.display, fontSize:22, fontWeight:900, letterSpacing:3, color: isOpen ? '#fff' : T.inkFaint, minWidth:48 }}>{year}</span>
                      <span style={{ fontFamily:T.mono, fontSize:9, letterSpacing:2, color:T.inkFaint, textTransform:'uppercase' }}>{entries.length} torneios</span>
                      {yearTitles > 0 && (
                        <span style={{ fontFamily:T.display, fontSize:11, color:'#FFD700', letterSpacing:1, background:'rgba(255,215,0,.1)', border:'1px solid rgba(255,215,0,.25)', padding:'1px 8px' }}>🏆 {yearTitles} TÍT</span>
                      )}
                      <div style={{ flex:1 }} />
                      <span style={{ fontFamily:T.mono, fontSize:11, fontWeight:700, color: yearPts > 0 ? sc : T.inkFaint, letterSpacing:1 }}>
                        {yearPts > 0 ? `+${yearPts} pts` : ''}
                      </span>
                      <span style={{ fontFamily:T.mono, fontSize:10, color:T.inkFaint, marginLeft:12, width:14, textAlign:'center' }}>{isOpen ? '▲' : '▼'}</span>
                    </div>

                    {/* Torneios do ano */}
                    {isOpen && (
                      <div>
                        {entries.map((e, i) => {
                          const rs = roundStyle(e.round);
                          const isW = e.round === 'W';

                          // Cor do piso com intensidade por importância
                          const SURF_BASE = { HARD:'#1565C0', CLAY:'#8B3A0F', GRASS:'#2E7D32', INDOOR:'#6A1B9A' };
                          const CAT_ALPHA = { GRAND_SLAM:.28, MASTERS_1000:.22, FINALS:.22, ATP_500:.16, ATP_250:.12, ATP_100:.08 };
                          const surfBase  = SURF_BASE[(e.surface??'HARD').toUpperCase()] ?? '#1565C0';
                          const catAlpha  = CAT_ALPHA[e.cat] ?? .1;
                          const rowBg     = isW
                            ? `${surfBase}35`
                            : `${surfBase}${Math.round(catAlpha*255).toString(16).padStart(2,'0')}`;

                          // Sets do último jogo
                          const opp = e.lastOpp;
                          let setsStr = null;
                          if (opp?.sets?.length) {
                            if (opp.won) {
                              // jogador venceu: sets[i] = [playerPts, oppPts]
                              setsStr = opp.sets.map(([a,b]) => `${a}-${b}`).join(' ');
                            } else {
                              setsStr = opp.sets.map(([a,b]) => `${a}-${b}`).join(' ');
                            }
                          }

                          // Label da categoria
                          const CAT_LABEL_SHORT = {
                            GRAND_SLAM:'GS', MASTERS_1000:'M1000', FINALS:'CHAMP',
                            ATP_500:'ATP500', ATP_250:'ATP250', ATP_100:'ATP100',
                          };
                          const CAT_BADGE_COLOR = {
                            GRAND_SLAM:'#FFD700', MASTERS_1000:'#E040FB', FINALS:'#F44336',
                            ATP_500:'#00BCD4', ATP_250:'#66BB6A', ATP_100:'#FF7043',
                          };
                          const catLabel = CAT_LABEL_SHORT[e.cat] ?? e.cat;
                          const catColor = CAT_BADGE_COLOR[e.cat] ?? 'rgba(255,255,255,.4)';

                          return (
                            <div key={i} style={{
                              display:'grid',
                              gridTemplateColumns:'44px 80px 1fr 1fr 120px 80px',
                              gap:0,
                              background: rowBg,
                              borderBottom:'1px solid rgba(0,0,0,.3)',
                              borderLeft: isW ? `5px solid #FFD700` : `5px solid ${surfBase}55`,
                              alignItems:'stretch',
                              minHeight:50,
                            }}>
                              {/* Número */}
                              <div style={{ display:'flex', alignItems:'center', justifyContent:'center', fontFamily:T.mono, fontSize:14, fontWeight:700, color:'rgba(255,255,255,.35)', borderRight:'1px solid rgba(0,0,0,.25)' }}>
                                {i+1}
                              </div>

                              {/* Badge categoria */}
                              <div style={{ display:'flex', alignItems:'center', justifyContent:'center', padding:'0 6px', borderRight:'1px solid rgba(0,0,0,.25)' }}>
                                <div style={{ fontFamily:T.display, fontSize:11, fontWeight:900, letterSpacing:1, padding:'4px 8px', background:`${catColor}22`, border:`1px solid ${catColor}55`, color:catColor, textAlign:'center', whiteSpace:'nowrap' }}>
                                  {catLabel}
                                </div>
                              </div>

                              {/* Nome do torneio */}
                              <div style={{ padding:'0 16px', minWidth:0, borderRight:'1px solid rgba(0,0,0,.25)', display:'flex', alignItems:'center' }}>
                                <span style={{ fontFamily:T.display, fontSize:16, fontWeight:700, letterSpacing:.5, textTransform:'uppercase', color: isW?'#FFD700':'#fff', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{e.name}</span>
                              </div>

                              {/* Adversário + sets inline */}
                              <div style={{ padding:'0 16px', display:'flex', alignItems:'center', gap:10, borderRight:'1px solid rgba(0,0,0,.25)', minWidth:0 }}>
                                {opp?.name ? (
                                  <>
                                    <span style={{ fontFamily:T.display, fontSize:14, fontWeight:900, color: opp.won ? '#4CAF50' : '#EF5350', flexShrink:0, minWidth:20 }}>
                                      {opp.won ? 'V' : 'D'}
                                    </span>
                                    <span style={{ fontFamily:T.display, fontSize:15, fontWeight:600, color:'rgba(255,255,255,.9)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', flex:1 }}>{opp.name}</span>
                                    {setsStr && (
                                      <span style={{ fontFamily:T.mono, fontSize:12, color:'rgba(255,255,255,.45)', whiteSpace:'nowrap', flexShrink:0 }}>{setsStr}</span>
                                    )}
                                  </>
                                ) : (
                                  <span style={{ fontFamily:T.mono, fontSize:11, color:'rgba(255,255,255,.2)', letterSpacing:1 }}>—</span>
                                )}
                              </div>

                              {/* Fase */}
                              <div style={{ display:'flex', alignItems:'center', justifyContent:'center', padding:'0 10px', borderRight:'1px solid rgba(0,0,0,.25)' }}>
                                <div style={{ fontFamily:T.display, fontSize:13, fontWeight:700, letterSpacing:1, padding:'4px 12px', border:`1px solid ${rs.border}`, background:rs.bg, color:rs.color, textAlign:'center', clipPath:'polygon(3px 0,100% 0,calc(100% - 3px) 100%,0 100%)', whiteSpace:'nowrap' }}>
                                  {isW ? '🏆 TÍT' : (ROUND_LABEL[e.round] ?? e.round)}
                                </div>
                              </div>

                              {/* Pontos */}
                              <div style={{ display:'flex', alignItems:'center', justifyContent:'flex-end', padding:'0 16px' }}>
                                <span style={{ fontFamily:T.mono, fontSize:15, fontWeight:700, color: e.points>0 ? '#fff' : 'rgba(255,255,255,.2)', letterSpacing:.5 }}>
                                  {e.points > 0 ? `+${e.points}` : '—'}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              });
            })()}
          </>
        )}

        {view === 'superficies' && (
          <>
            {/* FASE 3: Badge de identidade de superfície */}
            {np.surfaceIdentity && (() => {
              const sid = np.surfaceIdentity;
              const color = SURF_COLOR[sid.surface] ?? sc;
              return (
                <div style={{ display:'flex', alignItems:'center', gap:12, padding:'13px 18px', marginBottom:16, background:`${color}0d`, border:`1px solid ${color}33`, clipPath:'polygon(6px 0,100% 0,calc(100% - 6px) 100%,0 100%)' }}>
                  <span style={{ fontSize:22 }}>{SURF_ICON[sid.surface]}</span>
                  <div>
                    <div style={{ fontFamily:T.display, fontSize:15, color, textTransform:'uppercase', letterSpacing:'.1em', lineHeight:1 }}>{sid.label}</div>
                    <div style={{ fontFamily:T.mono, fontSize:8, color:`${color}88`, letterSpacing:'.25em', marginTop:3 }}>
                      {Math.round(sid.winRate * 100)}% VITÓRIAS EM {SURF_LABEL[sid.surface]}
                    </div>
                  </div>
                  <div style={{ marginLeft:'auto', fontFamily:T.mono, fontSize:8, letterSpacing:2, color:`${color}99`, border:`1px solid ${color}44`, padding:'3px 8px', textTransform:'uppercase' }}>ESPECIALISTA</div>
                </div>
              );
            })()}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:3, marginBottom:20 }}>
              {[{key:'CLAY'},{key:'GRASS'},{key:'HARD'},{key:'INDOOR'}].map(({ key }) => {
                const rec = surfRec[key];
                const total = rec.w+rec.l;
                const pct = total > 0 ? Math.round(rec.w/total*100) : null;
                const color = SURF_COLOR[key];
                const noData = total===0;
                return (
                  <div key={key} style={{ background:noData?'rgba(237,232,223,.015)':`${color}07`, border:`1px solid ${noData?'rgba(237,232,223,.06)':color+'28'}`, padding:'18px 20px', position:'relative', overflow:'hidden', clipPath:'polygon(6px 0,100% 0,calc(100% - 6px) 100%,0 100%)' }}>
                    <div style={{ position:'absolute', top:0, left:0, right:0, height:2, background:`linear-gradient(90deg,${color}${noData?'33':'77'},transparent)` }}/>
                    <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:10 }}>
                      <span style={{ fontSize:15, opacity:noData?.4:1 }}>{SURF_ICON[key]}</span>
                      <span style={{ fontFamily:T.display, fontSize:12, letterSpacing:3, textTransform:'uppercase', color:noData?T.inkFaint:color }}>{SURF_LABEL[key]}</span>
                      {/* FASE 3: títulos por superfície de surfaceStats */}
                      {(() => {
                        const ssEntry = np.surfaceStats?.[key];
                        const titles = ssEntry?.titlesWon ?? 0;
                        return titles > 0 ? (
                          <span style={{ marginLeft:'auto', fontFamily:T.mono, fontSize:7, letterSpacing:1, color:`${color}cc`, background:`${color}1a`, border:`1px solid ${color}44`, padding:'2px 6px', textTransform:'uppercase' }}>
                            {titles} TÍT.
                          </span>
                        ) : null;
                      })()}
                    </div>
                    {pct !== null ? (
                      <div style={{ fontFamily:T.display, fontSize:48, color, lineHeight:.85, marginBottom:10, textShadow:`0 0 24px ${color}44` }}>{pct}<span style={{ fontSize:20, opacity:.6 }}>%</span></div>
                    ) : (
                      <div style={{ fontFamily:T.display, fontSize:32, color:T.inkFaint, lineHeight:.85, marginBottom:10, opacity:.3 }}>—</div>
                    )}
                    {total > 0 && <Bar value={pct} color={color} height={3} />}
                    <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:7 }}>
                      {total > 0 ? (
                        <>
                          <span style={{ fontFamily:T.display, fontSize:16, color:'#4CAF50' }}>{rec.w}W</span>
                          <span style={{ fontFamily:T.mono, fontSize:8, color:T.inkFaint }}>/</span>
                          <span style={{ fontFamily:T.display, fontSize:16, color:'#EF4444' }}>{rec.l}L</span>
                          <span style={{ fontFamily:T.mono, fontSize:8, color:T.inkFaint, marginLeft:'auto', letterSpacing:1 }}>{total} jogos</span>
                        </>
                      ) : <span style={{ fontFamily:T.mono, fontSize:7, color:T.inkFaint, letterSpacing:2, textTransform:'uppercase' }}>Sem dados</span>}
                    </div>
                  </div>
                );
              })}
            </div>
            {totalM > 0 && (
              <div>
                <Sh color={sc}>Comparativo</Sh>
                {[{key:'CLAY'},{key:'GRASS'},{key:'HARD'},{key:'INDOOR'}].map(({ key }) => {
                  const rec=surfRec[key], total=rec.w+rec.l, pct=total>0?Math.round(rec.w/total*100):null;
                  const color=SURF_COLOR[key];
                  return (
                    <div key={key} style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 13px', background:'rgba(237,232,223,.015)', border:'1px solid rgba(237,232,223,.05)', marginBottom:2, clipPath:'polygon(4px 0,100% 0,calc(100% - 4px) 100%,0 100%)' }}>
                      <span style={{ fontSize:13, width:18, flexShrink:0 }}>{SURF_ICON[key]}</span>
                      <span style={{ fontFamily:T.display, fontSize:11, letterSpacing:2, color:total>0?color:T.inkFaint, textTransform:'uppercase', width:52, flexShrink:0 }}>{SURF_LABEL[key]}</span>
                      <div style={{ flex:1, height:3, background:'rgba(255,255,255,.06)', position:'relative' }}>
                        {pct !== null && <div style={{ position:'absolute', left:0, top:0, height:'100%', width:`${pct}%`, background:color, opacity:.65 }}/>}
                      </div>
                      <span style={{ fontFamily:T.mono, fontSize:9, color:pct!==null?color:T.inkFaint, width:32, textAlign:'right', flexShrink:0 }}>{pct!==null?`${pct}%`:'—'}</span>
                      <span style={{ fontFamily:T.mono, fontSize:7, color:T.inkFaint, width:48, textAlign:'right', flexShrink:0 }}>{total>0?`${rec.w}W ${rec.l}L`:'—'}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// TAB 6: RIVALIDADES
// ─────────────────────────────────────────────────────────────────
function RivalCard({ r, np, allPlayers }) {
  const [open, setOpen] = useState(false);
  const isP1 = r.p1Id === np.id;
  const opId = isP1 ? r.p2Id : r.p1Id;
  const op = allPlayers?.find(p => p.id === opId);
  const myW = isP1 ? r.p1Wins : r.p2Wins, hisW = isP1 ? r.p2Wins : r.p1Wins;
  const tm = RIVALRY_META[r.type] ?? RIVALRY_META.CLASSIC;
  const sm = RIVALRY_STATUS[r.status] ?? RIVALRY_STATUS.BREWING;
  const barW = r.totalMatches > 0 ? Math.round(myW/r.totalMatches*100) : 50;
  const CAT_ICON = { GRAND_SLAM:'⭐', MASTERS_1000:'🏆', ATP_500:'🥇', ATP_250:'🎯', FINALS:'👑' };

  return (
    <div className="upp2-riv" onClick={() => setOpen(o=>!o)}>
      <div style={{ padding:'11px 15px', display:'flex', alignItems:'center', gap:11 }}>
        <div style={{ width:34, height:34, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', background:`${tm.color}18`, border:`1px solid ${tm.color}40`, fontSize:17 }}>{tm.icon}</div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:3 }}>
            <span style={{ fontFamily:T.display, fontSize:14, color:T.ink, textTransform:'uppercase', letterSpacing:.5 }}>{op?.name ?? `#${opId}`}</span>
            <span style={{ fontFamily:T.display, fontSize:9, letterSpacing:2, color:tm.color, textTransform:'uppercase' }}>{tm.label}</span>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:5 }}>
            <span style={{ fontFamily:T.mono, fontSize:11, color:'#4CAF50', minWidth:18, textAlign:'right' }}>{myW}</span>
            <div style={{ flex:1, height:3, background:'rgba(237,232,223,.07)', position:'relative' }}>
              <div style={{ position:'absolute', left:0, top:0, height:'100%', width:`${barW}%`, background:'#4CAF50' }}/>
            </div>
            <span style={{ fontFamily:T.mono, fontSize:11, color:'#EF4444', minWidth:18 }}>{hisW}</span>
          </div>
        </div>
        <div style={{ textAlign:'right', flexShrink:0 }}>
          <div style={{ display:'inline-block', background:`${sm.color}1a`, border:`1px solid ${sm.color}44`, color:sm.color, fontFamily:T.display, fontSize:8, fontWeight:700, letterSpacing:2, padding:'2px 7px', textTransform:'uppercase', marginBottom:3 }}>{sm.label}</div>
          <div style={{ fontFamily:T.mono, fontSize:9, color:T.inkFaint }}>{r.totalMatches} partidas</div>
        </div>
        <div style={{ color:T.inkFaint, fontSize:10 }}>{open?'▲':'▼'}</div>
      </div>
      {open && (
        <div style={{ borderTop:`1px solid ${T.line}`, padding:'11px 15px' }}>
          {r.narrative && <p style={{ fontFamily:T.body, fontSize:12, color:T.ink, lineHeight:1.6, margin:'0 0 10px' }}>{r.narrative}</p>}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:6, marginBottom:10 }}>
            {[{ label:'Finais', v:r.finalsMatches },{ label:'TB Sets', v:r.tiebreakSets },{ label:'Temporadas', v:r.seasons?.length??0 },{ label:'Prestígio', v:r.totalPrestige }].map(({ label,v }) => (
              <div key={label} style={{ background:'rgba(237,232,223,.03)', padding:'7px 5px', textAlign:'center' }}>
                <div style={{ fontFamily:T.display, fontWeight:700, fontSize:16, color:tm.color }}>{v}</div>
                <div style={{ fontFamily:T.mono, fontSize:7, color:T.inkFaint, textTransform:'uppercase', letterSpacing:.5 }}>{label}</div>
              </div>
            ))}
          </div>
          <div style={{ marginBottom:6 }}>
            <div style={{ fontFamily:T.display, fontSize:8, letterSpacing:3, color:T.inkFaint, textTransform:'uppercase', marginBottom:3 }}>Intensidade</div>
            <Bar value={Math.round((r.intensity??0)*100)} color={tm.color} height={4} showGlow />
          </div>
          {r.keyMoments?.length > 0 && (
            <div style={{ marginTop:8 }}>
              <div style={{ fontFamily:T.display, fontSize:8, letterSpacing:3, color:T.inkFaint, textTransform:'uppercase', marginBottom:5 }}>Momentos-Chave</div>
              {r.keyMoments.slice(-4).reverse().map((m,i) => (
                <div key={i} style={{ display:'flex', alignItems:'center', gap:7, padding:'4px 7px', background:'rgba(255,255,255,.02)', marginBottom:2 }}>
                  <span style={{ fontSize:11 }}>{CAT_ICON[m.category]??'🎾'}</span>
                  <span style={{ fontFamily:T.body, fontSize:11, color:T.inkDim, flex:1 }}>{m.isFinal?'🏆 Final':m.round} · {m.category?.replace('_',' ')} {m.season?`(${m.season})`:''}</span>
                  <span style={{ fontFamily:T.mono, fontSize:10, color:m.winnerId===np.id?'#4CAF50':'#EF4444' }}>{m.winnerId===np.id?'V':'D'}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// TAB: HISTÓRICO ANUAL
// ─────────────────────────────────────────────────────────────────
const HIST_CATS = [
  { key:'FINALS',       label:'ATP Finals'    },
  { key:'GRAND_SLAM',   label:'Grand Slam'    },
  { key:'MASTERS_1000', label:'Masters 1000'  },
  { key:'ATP_500',      label:'ATP 500'       },
  { key:'ATP_250',      label:'ATP 250'       },
  { key:'ATP_100',      label:'ATP 100'       },
];

const LEGACY_TAB_GROUPS = [
  { id:'essencia',   name:'Essência do Jogador', accent:'#D4561E' },
  { id:'carreira',   name:'Carreira & Competição', accent:'#E8C84A' },
  { id:'estrutura',  name:'Estrutura Profissional', accent:'#4FC3F7' },
  { id:'universo',   name:'Mundo & Narrativa', accent:'#C880FF' },
];

const LEGACY_TAB_META = {
  identidade:  { group:'essencia',  short:'Identidade',  icon:'👤', desc:'Personalidade, imagem pública, motivação e reputação.' },
  jogo:        { group:'essencia',  short:'Jogo',        icon:'⚡', desc:'Estilo, preferências, assinatura técnica e atributos de quadra.' },
  percepcoes:  { group:'essencia',  short:'Circuito',    icon:'🌐', desc:'Como o mundo do tênis enxerga este jogador hoje.' },
  carreira:    { group:'carreira',  short:'Carreira',    icon:'🏆', desc:'Títulos, marcos, legado e memória de carreira.' },
  grand_slam:  { group:'carreira',  short:'Grand Slam',  icon:'⭐', desc:'Histórico exclusivo nos quatro maiores palcos do circuito.' },
  trajetoria:  { group:'carreira',  short:'Trajetória',  icon:'📈', desc:'Evolução de ranking, desenvolvimento e arco profissional.' },
  resultados:  { group:'carreira',  short:'Resultados',  icon:'📜', desc:'Leitura ampla de desempenho em torneios e superfícies.' },
  hist_anual:  { group:'carreira',  short:'Hist. anual', icon:'🗓️', desc:'Recorte por temporadas para entender altos e baixos.' },
  rivalidades: { group:'carreira',  short:'Rivalidades', icon:'⚔️', desc:'Confrontos que realmente moldaram a narrativa da carreira.' },
  fisico:      { group:'estrutura', short:'Físico & DNA', icon:'💊', desc:'Corpo, risco, condição atual, traços e assinatura biológica.' },
  tecnico:     { group:'estrutura', short:'Técnico',     icon:'🎓', desc:'Equipe, parceria, confiança tática e direção de carreira.' },
  financeiro:  { group:'estrutura', short:'Financeiro',  icon:'💰', desc:'Dinheiro, pressão, custos e sustentabilidade de carreira.' },
  forma:       { group:'estrutura', short:'Forma & IFR', icon:'📡', desc:'Momento competitivo, leitura de fase e sinal de mercado.' },
  patrocinio:  { group:'estrutura', short:'Patrocínio',  icon:'🤝', desc:'Contratos, sinal comercial, histórico de marcas e ofertas.' },
  vida:        { group:'universo',  short:'Vida',        icon:'🏡', desc:'Vida fora da quadra, imagem, patrimônio e linha do tempo pessoal.' },
  entrevistas: { group:'universo',  short:'Entrevistas', icon:'🎙️', desc:'Voz pública, contexto de imprensa e coletivas geradas.' },
};

const ROUND_VALUE = { W:7, F:6, SF:5, QF:4, R16:3, R32:2, R64:1, R128:0 };

function buildYearStats(playerId, tournamentResults) {
  const byYear = {};
  const ROUND_LABELS = ['F','SF','QF','R16','R32','R64','R128'];

  const ensureRow = (year, cat) => {
    if (!byYear[year]) byYear[year] = {};
    if (!byYear[year][cat]) byYear[year][cat] = {
      part:0, wins:0, losses:0, qf:0, sf:0, f:0, titles:0,
      bestRound:null, ratingSum:0, ratingCount:0,
      // stats de jogo — só disponíveis em formato completo (bracket)
      acesSum:0, winnersSum:0, errorsSum:0, gamesHeld:0, gamesServed:0, matchStatsCount:0,
    };
    return byYear[year][cat];
  };

  for (const [, res] of Object.entries(tournamentResults ?? {})) {
    if (!res) continue;
    const tournament = res.tournament;
    if (!tournament) continue;

    const year = tournament.season ?? res._season ?? '?';
    const cat  = tournament.category ?? 'ATP_250';
    if (!HIST_CATS.find(c => c.key === cat)) continue;

    // ── FORMATO SLIM (_slim: true) ──────────────────────────────────────
    if (res._slim) {
      const isChamp    = res.champion?.id  === playerId;
      const isFinalist = res.finalist?.id  === playerId;
      const isSemi     = (res.semis ?? []).some(s => s.id === playerId);

      // W/L a partir de matches plano
      let wins = 0, losses = 0, participated = false;
      for (const m of res.matches ?? []) {
        if (m.w === playerId) { wins++;   participated = true; }
        if (m.l === playerId) { losses++; participated = true; }
      }
      if (!participated && !isChamp && !isFinalist && !isSemi) continue;

      const row = ensureRow(year, cat);
      row.part++;
      row.wins   += wins;
      row.losses += losses;

      if (isChamp) {
        row.titles++;
        row.f++; row.sf++; row.qf++;
        if (!row.bestRound || ROUND_VALUE['W'] > ROUND_VALUE[row.bestRound]) row.bestRound = 'W';
      } else if (isFinalist) {
        row.f++; row.sf++; row.qf++;
        if (!row.bestRound || ROUND_VALUE['F'] > ROUND_VALUE[row.bestRound]) row.bestRound = 'F';
      } else if (isSemi) {
        row.sf++; row.qf++;
        if (!row.bestRound || ROUND_VALUE['SF'] > ROUND_VALUE[row.bestRound]) row.bestRound = 'SF';
      } else if (losses > 0) {
        // Deduz round pela contagem de vitórias (0W=R1, 1W=R2, etc.)
        const fromEnd = wins; // wins antes de perder = rodadas do fim
        const roundKey = ROUND_LABELS[fromEnd] ?? 'R64';
        if (!row.bestRound || ROUND_VALUE[roundKey] > ROUND_VALUE[row.bestRound]) row.bestRound = roundKey;
        if (roundKey === 'QF') row.qf++;
        if (roundKey === 'SF') row.sf++;
        if (roundKey === 'F')  row.f++;
      }
      continue;
    }

    // ── FORMATO COMPLETO (bracket.rounds) ───────────────────────────────
    const { bracket } = res;
    if (!bracket?.rounds) continue;

    const row = ensureRow(year, cat);
    let participated = false;
    let bestRound = null;

    for (const round of bracket.rounds) {
      for (const match of round) {
        if (match.isBye) continue;
        const isA = match.playerA?.id === playerId;
        const isB = match.playerB?.id === playerId;
        if (!isA && !isB) continue;
        participated = true;

        const won = match.winner?.id === playerId;
        if (won) {
          row.wins++;
          const rIdx = bracket.rounds.indexOf(round);
          if (rIdx === bracket.rounds.length - 1) row.titles++;
        } else if (match.winner) {
          row.losses++;
          const fromEnd = bracket.rounds.length - 1 - bracket.rounds.indexOf(round);
          const roundKey = ROUND_LABELS[fromEnd] ?? 'R64';
          if (!bestRound || ROUND_VALUE[roundKey] > ROUND_VALUE[bestRound]) bestRound = roundKey;
          if (roundKey === 'QF') row.qf++;
          if (roundKey === 'SF') row.sf++;
          if (roundKey === 'F')  row.f++;
        }
        if (match.result?.rating) {
          const pr = isA ? match.result.rating.a : match.result.rating.b;
          if (pr > 0) { row.ratingSum += pr; row.ratingCount++; }
        }
        // Médias de jogo (aces, winners, erros, hold)
        const ms = isA ? match.result?.stats?.a : match.result?.stats?.b;
        if (ms) {
          row.acesSum    += ms.aces    ?? 0;
          row.winnersSum += ms.winners ?? 0;
          row.errorsSum  += (ms.unforcedErrors ?? 0) + (ms.forcedErrors ?? 0);
          row.gamesHeld  += ms.gamesHeld   ?? 0;
          row.gamesServed+= ms.gamesServed ?? 0;
          row.matchStatsCount++;
        }
      }
    }

    if (bracket.champion?.id === playerId) {
      bestRound = 'W';
      const totalR = bracket.rounds.length;
      row.f++;
      if (totalR >= 2) row.sf++;
      if (totalR >= 3) row.qf++;
    }

    if (participated) {
      row.part++;
      if (bestRound && (!row.bestRound || ROUND_VALUE[bestRound] > ROUND_VALUE[row.bestRound])) {
        row.bestRound = bestRound;
      }
    }
  }

  return byYear;
}

function HistRow({ cat, row, sc }) {
  if (!row || row.part === 0) {
    return (
      <tr>
        <td style={{ fontFamily:'Space Mono,monospace', fontSize:10, color:'rgba(237,230,216,.45)', padding:'6px 8px', whiteSpace:'nowrap' }}>
          {cat.label}
        </td>
        <td colSpan={9} style={{ fontFamily:'Space Mono,monospace', fontSize:9, color:'rgba(237,230,216,.18)', padding:'6px 8px', textAlign:'center' }}>—</td>
      </tr>
    );
  }
  const irm = row.ratingCount > 0 ? (row.ratingSum / row.ratingCount).toFixed(1) : '—';
  const irmColor = irm === '—' ? 'rgba(237,230,216,.28)'
    : irm >= 7.8 ? '#B0FF60' : irm >= 6.5 ? '#60D0FF' : irm >= 5.0 ? '#FFB060' : '#FF8040';

  const cell = (v, highlight = false) => (
    <td style={{
      fontFamily:'Space Mono,monospace', fontSize:11, textAlign:'center', padding:'6px 6px',
      color: v === 0 ? 'rgba(237,230,216,.18)' : highlight ? sc : 'rgba(237,230,216,.75)',
    }}>{v || '—'}</td>
  );

  return (
    <tr style={{ borderBottom:'1px solid rgba(237,230,216,.04)' }}>
      <td style={{ fontFamily:'Space Mono,monospace', fontSize:10, color:'rgba(237,230,216,.6)', padding:'6px 8px', whiteSpace:'nowrap' }}>
        {cat.label}
      </td>
      {cell(row.part)}
      {cell(row.wins, row.wins > row.losses)}
      {cell(row.losses)}
      {cell(row.qf, row.qf > 0)}
      {cell(row.sf, row.sf > 0)}
      {cell(row.f, row.f > 0)}
      {cell(row.titles, row.titles > 0)}
      <td style={{ fontFamily:'Space Mono,monospace', fontSize:10, textAlign:'center', padding:'6px 6px', color:'rgba(237,230,216,.55)' }}>
        {row.bestRound ? ROUND_LABEL[row.bestRound] : '—'}
      </td>
      <td style={{ fontFamily:'Space Mono,monospace', fontSize:11, textAlign:'center', padding:'6px 6px', color: irmColor, fontWeight: irm !== '—' ? 700 : 400 }}>
        {irm}
      </td>
    </tr>
  );
}

function TabHistAnual({ np, sc, tournamentResults }) {
  const [openYear, setOpenYear] = useState(null);
  const playerId = np?.id;

  const yearStats = useMemo(() =>
    buildYearStats(playerId, tournamentResults),
  [playerId, tournamentResults]);

  const years = Object.keys(yearStats).sort((a, b) => Number(b) - Number(a));

  if (years.length === 0) {
    return (
      <div style={{ padding:'40px 24px', textAlign:'center', fontFamily:'Space Mono,monospace', fontSize:11, color:'rgba(237,230,216,.22)', letterSpacing:3 }}>
        NENHUM DADO REGISTRADO AINDA
      </div>
    );
  }

  const TH = ({ children, right }) => (
    <th style={{
      fontFamily:'Space Mono,monospace', fontSize:9, letterSpacing:'.18em', textTransform:'uppercase',
      color:'rgba(237,230,216,.35)', padding:'7px 8px', textAlign: right ? 'center' : 'left',
      borderBottom:'1px solid rgba(237,230,216,.08)', fontWeight:400, whiteSpace:'nowrap',
    }}>{children}</th>
  );

  return (
    <div className="upp2-scroll" style={{ flex:1, padding:'20px 20px 40px', overflowY:'auto' }}>
      {years.map(year => {
        const cats = yearStats[year];
        const isOpen = openYear === year;

        // Year totals
        const totals = {
          part:0, wins:0, losses:0, qf:0, sf:0, f:0, titles:0,
          ratingSum:0, ratingCount:0, bestRound:null,
          acesSum:0, winnersSum:0, errorsSum:0, gamesHeld:0, gamesServed:0, matchStatsCount:0,
        };
        for (const row of Object.values(cats)) {
          totals.part    += row.part;
          totals.wins    += row.wins;
          totals.losses  += row.losses;
          totals.qf      += row.qf;
          totals.sf      += row.sf;
          totals.f       += row.f;
          totals.titles  += row.titles;
          totals.ratingSum       += row.ratingSum;
          totals.ratingCount     += row.ratingCount;
          totals.acesSum         += row.acesSum;
          totals.winnersSum      += row.winnersSum;
          totals.errorsSum       += row.errorsSum;
          totals.gamesHeld       += row.gamesHeld;
          totals.gamesServed     += row.gamesServed;
          totals.matchStatsCount += row.matchStatsCount;
          if (row.bestRound && (!totals.bestRound || ROUND_VALUE[row.bestRound] > ROUND_VALUE[totals.bestRound])) {
            totals.bestRound = row.bestRound;
          }
        }
        const annualIrm = totals.ratingCount > 0 ? (totals.ratingSum / totals.ratingCount).toFixed(1) : null;
        const irmCol = !annualIrm ? 'rgba(237,230,216,.35)'
          : annualIrm >= 7.8 ? '#B0FF60' : annualIrm >= 6.5 ? '#60D0FF' : annualIrm >= 5.0 ? '#FFB060' : '#FF8040';

        // Médias por jogo (só disponíveis em bracket completo)
        const hasMatchStats = totals.matchStatsCount > 0;
        const mc = totals.matchStatsCount || 1;
        const avgAces    = hasMatchStats ? (totals.acesSum    / mc).toFixed(1) : null;
        const avgWinners = hasMatchStats ? (totals.winnersSum / mc).toFixed(1) : null;
        const avgErrors  = hasMatchStats ? (totals.errorsSum  / mc).toFixed(1) : null;
        const holdPct    = totals.gamesServed > 0
          ? Math.round(totals.gamesHeld / totals.gamesServed * 100)
          : null;

        // Cores de referência ATP
        const holdColor  = !holdPct ? T.inkFaint
          : holdPct >= 83 ? '#B0FF60' : holdPct >= 75 ? '#60D0FF' : holdPct >= 65 ? '#FFB060' : '#FF6060';
        const acesColor  = !avgAces ? T.inkFaint
          : avgAces >= 10 ? '#B0FF60' : avgAces >= 6 ? '#60D0FF' : T.inkFaint;
        const winColor   = !avgWinners ? T.inkFaint
          : avgWinners >= 20 ? '#B0FF60' : avgWinners >= 13 ? '#60D0FF' : T.inkFaint;
        const errColor   = !avgErrors ? T.inkFaint
          : avgErrors <= 14 ? '#B0FF60' : avgErrors <= 22 ? '#60D0FF' : avgErrors <= 30 ? '#FFB060' : '#FF6060';

        return (
          <div key={year} style={{ marginBottom:6 }}>
            {/* Year header — clickable */}
            <div
              onClick={() => setOpenYear(isOpen ? null : year)}
              style={{
                display:'flex', alignItems:'center', gap:14, padding:'12px 16px',
                background: isOpen ? `${sc}14` : 'rgba(237,230,216,.03)',
                border:`1px solid ${isOpen ? sc+'50' : 'rgba(237,230,216,.08)'}`,
                borderLeft:`3px solid ${isOpen ? sc : 'rgba(237,230,216,.2)'}`,
                cursor:'pointer', userSelect:'none', transition:'all .15s',
              }}
            >
              <span style={{ fontFamily:'Space Mono,monospace', fontSize:15, fontWeight:700, color: isOpen ? sc : 'rgba(237,230,216,.85)', minWidth:44 }}>{year}</span>
              <div style={{ display:'flex', gap:16, flex:1, flexWrap:'wrap', alignItems:'center' }}>
                {totals.titles > 0 && (
                  <span style={{ fontFamily:'Space Mono,monospace', fontSize:10, color:'#C9A84C', letterSpacing:1 }}>
                    🏆 {totals.titles}T
                  </span>
                )}
                <span style={{ fontFamily:'Space Mono,monospace', fontSize:10, color:'rgba(237,230,216,.5)', letterSpacing:1 }}>
                  {totals.wins}V {totals.losses}D
                </span>
                {totals.f > 0  && <span style={{ fontFamily:'Space Mono,monospace', fontSize:10, color: sc, letterSpacing:1 }}>F:{totals.f}</span>}
                {totals.sf > 0 && <span style={{ fontFamily:'Space Mono,monospace', fontSize:10, color:'rgba(237,230,216,.5)', letterSpacing:1 }}>SF:{totals.sf}</span>}
                {totals.qf > 0 && <span style={{ fontFamily:'Space Mono,monospace', fontSize:10, color:'rgba(237,230,216,.38)', letterSpacing:1 }}>QF:{totals.qf}</span>}
                {annualIrm && (
                  <span style={{ fontFamily:'Space Mono,monospace', fontSize:10, color: irmCol, letterSpacing:1, marginLeft:'auto', fontWeight:700 }}>
                    IRm {annualIrm}
                  </span>
                )}
              </div>
              <span style={{ fontFamily:'Space Mono,monospace', fontSize:9, color:'rgba(237,230,216,.28)' }}>
                {isOpen ? '▲' : '▼'}
              </span>
            </div>

            {/* Expanded content */}
            {isOpen && (
              <div style={{ border:'1px solid rgba(237,230,216,.07)', borderTop:'none', background:'rgba(237,230,216,.015)' }}>
                {/* Category table */}
                <table style={{ width:'100%', borderCollapse:'collapse' }}>
                  <thead>
                    <tr>
                      <TH>Categoria</TH>
                      <TH right>Part.</TH>
                      <TH right>V</TH>
                      <TH right>D</TH>
                      <TH right>QF</TH>
                      <TH right>SF</TH>
                      <TH right>F</TH>
                      <TH right>T</TH>
                      <TH right>MF</TH>
                      <TH right>IRm</TH>
                    </tr>
                  </thead>
                  <tbody>
                    {HIST_CATS.map(cat => (
                      <HistRow key={cat.key} cat={cat} row={cats[cat.key]} sc={sc} />
                    ))}
                    {/* Total row */}
                    <tr style={{ borderTop:'1px solid rgba(237,230,216,.10)' }}>
                      <td style={{ fontFamily:'Space Mono,monospace', fontSize:9, letterSpacing:'.2em', textTransform:'uppercase', color:'rgba(237,230,216,.38)', padding:'7px 8px' }}>TOTAL</td>
                      {[totals.part, totals.wins, totals.losses, totals.qf, totals.sf, totals.f, totals.titles].map((v, i) => (
                        <td key={i} style={{ fontFamily:'Space Mono,monospace', fontSize:11, textAlign:'center', padding:'7px 6px', color: v === 0 ? 'rgba(237,230,216,.18)' : 'rgba(237,230,216,.8)', fontWeight:700 }}>{v || '—'}</td>
                      ))}
                      <td style={{ fontFamily:'Space Mono,monospace', fontSize:11, textAlign:'center', padding:'7px 6px', color:'rgba(237,230,216,.5)' }}>
                        {totals.bestRound ? ROUND_LABEL[totals.bestRound] : '—'}
                      </td>
                      <td style={{ fontFamily:'Space Mono,monospace', fontSize:11, textAlign:'center', padding:'7px 6px', color: irmCol, fontWeight:700 }}>
                        {annualIrm ?? '—'}
                      </td>
                    </tr>
                  </tbody>
                </table>

                {/* Médias por jogo */}
                {hasMatchStats ? (
                  <div style={{ padding:'14px 16px 16px', borderTop:'1px solid rgba(237,230,216,.06)' }}>
                    <div style={{ fontFamily:'Space Mono,monospace', fontSize:8, letterSpacing:'.35em', color:'rgba(237,230,216,.25)', textTransform:'uppercase', marginBottom:10 }}>
                      Médias por jogo · {totals.matchStatsCount} partidas
                    </div>
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8 }}>
                      {[
                        { label:'Aces',    value:avgAces,    color:acesColor,  ref:'ref ATP: 5–10',  icon:'🎯' },
                        { label:'Winners', value:avgWinners, color:winColor,   ref:'ref ATP: 13–22', icon:'⚡' },
                        { label:'Erros',   value:avgErrors,  color:errColor,   ref:'ref ATP: 14–30', icon:'💥' },
                        { label:'Hold %',  value:holdPct != null ? holdPct+'%' : null, color:holdColor, ref:'ref ATP: ~81%', icon:'🛡️' },
                      ].map(({ label, value, color, ref, icon }) => (
                        <div key={label} style={{
                          background:'rgba(0,0,0,.25)', border:`1px solid ${color}22`,
                          borderTop:`2px solid ${color}55`, padding:'10px 12px',
                          display:'flex', flexDirection:'column', gap:3,
                        }}>
                          <div style={{ fontFamily:'Space Mono,monospace', fontSize:7, letterSpacing:'.3em', color:'rgba(237,230,216,.3)', textTransform:'uppercase' }}>
                            {icon} {label}
                          </div>
                          <div style={{ fontFamily:T.display, fontSize:26, color, lineHeight:1 }}>
                            {value ?? '—'}
                          </div>
                          <div style={{ fontFamily:'Space Mono,monospace', fontSize:6.5, color:'rgba(237,230,216,.2)', letterSpacing:.5 }}>
                            {ref}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div style={{ padding:'10px 16px', borderTop:'1px solid rgba(237,230,216,.05)' }}>
                    <span style={{ fontFamily:'Space Mono,monospace', fontSize:8, color:'rgba(237,230,216,.18)', letterSpacing:2 }}>
                      MÉDIAS DE JOGO NÃO DISPONÍVEIS — DADOS DO SAVE
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function TabRivalidades({ np, sc, rivalrySystem, allPlayers }) {
  const rivalries = rivalrySystem?.getPlayerRivalries(np.id) ?? [];
  const legendary = rivalries.filter(r=>r.status==='LEGENDARY').length;
  const active    = rivalries.filter(r=>r.status==='ACTIVE'||r.status==='INTENSE').length;

  const encounters = rivalrySystem?._encounters
    ? Array.from(rivalrySystem._encounters.entries())
        .filter(([,enc]) => enc.p1Id===np.id||enc.p2Id===np.id)
        .filter(([key]) => !rivalrySystem.rivalries.has(key))
        .sort(([,a],[,b]) => b.total-a.total)
        .slice(0, 5)
    : [];

  return (
    <div className="upp2-scroll" style={{ flex:1, padding:'22px 24px', overflowY:'auto' }}>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:2, marginBottom:22 }}>
        <StatCard label="Rivalidades" value={rivalries.length} color={sc} />
        <StatCard label="Lendárias"   value={legendary}        color='#FFD700' />
        <StatCard label="Ativas"      value={active}           color='#22C55E' />
      </div>

      {rivalries.length > 0 ? (
        <>
          <Sh color={sc}>Rivalidades</Sh>
          {rivalries.map(r => <RivalCard key={r.key} r={r} np={np} allPlayers={allPlayers} />)}
        </>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', padding:'60px 0', gap:10, opacity:.25 }}>
          <div style={{ fontSize:44 }}>⚔️</div>
          <div style={{ fontFamily:T.display, fontSize:16, letterSpacing:5, color:T.inkFaint, textTransform:'uppercase' }}>Nenhuma Rivalidade</div>
          <div style={{ fontFamily:T.mono, fontSize:8, letterSpacing:2, color:T.inkFaint, textTransform:'uppercase', textAlign:'center', maxWidth:260, lineHeight:1.7 }}>Rivalidades surgem após confrontos repetidos em torneios de prestígio</div>
        </div>
      )}

      {encounters.length > 0 && (
        <>
          <Sh color={sc} style={{ marginTop:20 }}>Em Desenvolvimento</Sh>
          {encounters.map(([key, enc]) => {
            const opId = enc.p1Id===np.id ? enc.p2Id : enc.p1Id;
            const op = allPlayers?.find(p=>p.id===opId);
            return (
              <div key={key} style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 12px', background:'rgba(237,232,223,.02)', border:'1px solid rgba(237,232,223,.05)', marginBottom:2, clipPath:'polygon(4px 0,100% 0,calc(100% - 4px) 100%,0 100%)' }}>
                <span style={{ fontSize:11, opacity:.4 }}>🕐</span>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontFamily:T.display, fontSize:12, letterSpacing:1, color:T.inkDim, textTransform:'uppercase', marginBottom:4, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{op?.name ?? `#${opId}`}</div>
                  <Bar value={Math.min(100, enc.total/5*100)} color={sc} height={2} />
                </div>
                <span style={{ fontFamily:T.mono, fontSize:8, color:T.inkFaint, flexShrink:0 }}>{enc.total}/5</span>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// TAB 7: FÍSICO & DNA
// ─────────────────────────────────────────────────────────────────
function TabFisicoDNA({ np, sc, tournamentResults }) {
  const player = ensurePhysicalCondition(np);
  const cond = Math.round(player.physicalCondition ?? 85);
  const condInfo = physicalConditionLabel(cond);
  const injury = player.injury ?? null;
  const injHistory = player.injuryHistory ?? [];
  const dna = np.dna;

  const retireChance  = computeRetirementChance(player, 2025, tournamentResults ?? {}, null, null);
  const retireRisk    = retirementRiskLabel(retireChance);
  const retirePercent = Math.round(retireChance * 100);
  const showRetire = (player.age ?? 0) >= 28;

  const condColor = condInfo.color;
  const gradeColor = g => g===1?'#FFC107':g===2?'#FF9800':'#F44336';

  // DNA
  const dnaSlots  = dna ? getPlayerTraits({ dna }) : [];
  const dnaSombras = dna?.sombras ?? [];
  const dnaTierLabel = { GERACIONAL:'Geracional', EXCEPCIONAL:'Excepcional', ALTO:'Alto', BOM:'Bom', NORMAL:'Normal', FRACO:'Fraco' };
  const dnaTierColor = { GERACIONAL:'#FFD700', EXCEPCIONAL:'#FF8C42', ALTO:'#AA44FF', BOM:'#00CCFF', NORMAL:'#88AA88', FRACO:'#888' };
  const dnaColor = dnaTierColor[dna?.tier] ?? T.inkFaint;

  const injTypeInfo  = injury ? (INJURY_TYPES[injury.type]  ?? {}) : null;
  const injGradeInfo = injury ? (INJURY_GRADES[injury.grade] ?? {}) : null;

  return (
    <div className="upp2-scroll" style={{ flex:1, padding:'22px 24px', overflowY:'auto' }}>

      {/* DNA TRAITS */}
      {dna && (
        <div style={{ marginBottom:24 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
            <Sh color={sc}>DNA · Traits</Sh>
            <div style={{ display:'flex', gap:6, alignItems:'center' }}>
              <div style={{ background:`${dnaColor}15`, border:`1px solid ${dnaColor}40`, padding:'3px 10px' }}>
                <span style={{ fontFamily:T.display, fontSize:10, letterSpacing:2, color:dnaColor, textTransform:'uppercase' }}>{dnaTierLabel[dna.tier]??dna.tier}</span>
                <span style={{ fontFamily:T.display, fontSize:16, color:dnaColor, marginLeft:6 }}>{dna.score}</span>
              </div>
            </div>
          </div>
          {dnaSlots.length === 0 && (
            <div style={{ fontFamily:T.mono, fontSize:8, color:T.inkFaint, padding:'12px', textAlign:'center', opacity:.4 }}>Nenhum trait desbloqueado</div>
          )}
          {([
            { id:'DNA', label:'DNA Base', desc:'Traços nativos que definem a identidade competitiva.' },
            { id:'TENDENCIA', label:'Como Compete', desc:'Padrões recorrentes do jeito de jogar.' },
            { id:'CICATRIZ', label:'O Que Carrega', desc:'Sombras, rachaduras e marcas do percurso.' },
            { id:'LEGADO', label:'O Que Conquistou', desc:'Traços forjados por feitos e palco grande.' },
          ]).map(group => {
            const slots = dnaSlots.filter(s => (s.family ?? 'DNA') === group.id);
            if (!slots.length) return null;
            return (
              <div key={group.id} style={{ marginBottom:12 }}>
                <div style={{ marginBottom:7 }}>
                  <div style={{ fontFamily:T.mono, fontSize:7, letterSpacing:3, color:sc, textTransform:'uppercase', marginBottom:3, display:'flex', alignItems:'center', gap:7 }}>
                    <div style={{ height:1, width:10, background:`${sc}44` }}/>
                    {group.label}
                    <div style={{ height:1, flex:1, background:`${sc}18` }}/>
                  </div>
                  <div style={{ fontFamily:T.body, fontSize:10, color:T.inkFaint, lineHeight:1.4 }}>{group.desc}</div>
                </div>
                {slots.map((slot, i) => {
                  const def = TRAIT_CATALOG[slot.traitId];
                  const tierDef = def?.tiers?.[slot.tier];
                  const sombra = dnaSombras.find(s=>s.traitId===slot.traitId);
                  const sombraPct = sombra ? Math.min(100,Math.round((sombra.progress/(sombra.target||1))*100)) : 0;
                  const tc = TRAIT_TIER[slot.tier] ?? TRAIT_TIER.COM;
                  return (
                    <div key={i} style={{ background:tc.bg, border:`1px solid ${tc.border}`, padding:'11px 13px', marginBottom:6, position:'relative', overflow:'hidden' }}>
                      <div style={{ position:'absolute', top:0, left:0, right:0, height:1, background:`linear-gradient(90deg,transparent,${tc.color}66,transparent)` }}/>
                      <div style={{ display:'flex', alignItems:'flex-start', gap:9 }}>
                        <div style={{ flexShrink:0, width:28, height:28, background:`${tc.color}18`, border:`1px solid ${tc.color}44`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:14 }}>{tc.icon}</div>
                        <div style={{ flex:1 }}>
                          <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:3 }}>
                            <span style={{ fontFamily:T.display, fontSize:12, color:tc.color, letterSpacing:.5, textTransform:'uppercase' }}>{tierDef?.name ?? slot.traitId}</span>
                            <span style={{ fontFamily:T.mono, fontSize:7, background:`${tc.color}18`, border:`1px solid ${tc.color}38`, color:tc.color, padding:'1px 6px', letterSpacing:2, textTransform:'uppercase' }}>{tc.label}</span>
                          </div>
                          {tierDef?.desc && <div style={{ fontFamily:T.body, fontSize:11, color:T.inkDim, lineHeight:1.5 }}>{tierDef.desc}</div>}
                          {slot.tier==='NEG' && sombra && !sombra.resolved && (
                            <div style={{ marginTop:6 }}>
                              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
                                <span style={{ fontFamily:T.mono, fontSize:7, color:T.inkFaint, textTransform:'uppercase', letterSpacing:1 }}>Desafio sombra</span>
                                <span style={{ fontFamily:T.mono, fontSize:8, color:'#FF8844' }}>{sombra.progress}/{sombra.target}</span>
                              </div>
                              <Bar value={sombraPct} color="#FF8844" height={3} />
                              <div style={{ fontFamily:T.body, fontSize:10, color:'rgba(255,136,68,.65)', marginTop:3 }}>🔓 {sombra.challenge}</div>
                            </div>
                          )}
                          {slot.tier==='NEG' && sombra?.resolved && <div style={{ fontFamily:T.body, fontSize:10, color:'#4CAF50', marginTop:4 }}>✅ Sombra resolvida</div>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
        {/* CONDIÇÃO */}
        <div>
          <Sh color={sc}>Condição Física</Sh>
          <div style={{ border:`1px solid ${condColor}33`, background:`${condColor}07`, borderLeft:`3px solid ${condColor}`, padding:'14px 16px' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
              <div style={{ fontFamily:T.display, fontSize:36, color:condColor, lineHeight:1 }}>{cond}<span style={{ fontFamily:T.mono, fontSize:9, color:T.inkFaint, marginLeft:4 }}>/100</span></div>
              <div style={{ background:`${condColor}18`, border:`1px solid ${condColor}44`, color:condColor, fontFamily:T.display, fontSize:10, letterSpacing:3, padding:'4px 12px', textTransform:'uppercase', clipPath:'polygon(3px 0,100% 0,calc(100% - 3px) 100%,0 100%)' }}>{condInfo.label}</div>
            </div>
            <Bar value={cond} color={condColor} height={4} showGlow />
            <div style={{ fontFamily:T.body, fontSize:11, color:T.inkFaint, lineHeight:1.5, marginTop:8 }}>
              {cond>=88?'Atleta em plena forma. Risco mínimo.':cond>=75?'Condição boa. Leve desgaste.':cond>=62?'Condição regular. Atenção ao calendário.':cond>=48?'Condição baixa. Risco elevado.':'Condição crítica. Alto risco de lesão.'}
            </div>
          </div>
        </div>

        {/* STATUS / APOSENTADORIA */}
        <div>
          <Sh color={sc}>Status</Sh>
          {injury ? (
            <div style={{ border:`1px solid ${gradeColor(injury.grade)}33`, background:`${gradeColor(injury.grade)}07`, borderLeft:`3px solid ${gradeColor(injury.grade)}`, padding:'13px 15px' }}>
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
                <span style={{ fontSize:20 }}>{injTypeInfo?.icon??'🩹'}</span>
                <div style={{ flex:1 }}>
                  <div style={{ fontFamily:T.display, fontSize:15, color:gradeColor(injury.grade), letterSpacing:1, textTransform:'uppercase' }}>{injTypeInfo?.label??injury.type}</div>
                  <div style={{ fontFamily:T.mono, fontSize:7, letterSpacing:2, color:T.inkFaint, textTransform:'uppercase', marginTop:1 }}>{injGradeInfo?.label??'?'} · Grau {injury.grade}</div>
                </div>
              </div>
              {injury.slotsRemaining > 0 && (
                <div style={{ background:'rgba(244,67,54,.1)', border:'1px solid rgba(244,67,54,.28)', padding:'4px 10px', fontFamily:T.display, fontSize:9, color:'#F44336', letterSpacing:2, textTransform:'uppercase', display:'inline-block' }}>⛔ FORA — {injury.slotsRemaining} torneio{injury.slotsRemaining!==1?'s':''}</div>
              )}
              {injury.slotsRemaining===0 && injury.comingBackSlots>0 && (
                <div style={{ background:'rgba(255,152,0,.1)', border:'1px solid rgba(255,152,0,.28)', padding:'4px 10px', fontFamily:T.display, fontSize:9, color:'#FF9800', letterSpacing:2, textTransform:'uppercase', display:'inline-block' }}>🔄 RETORNANDO</div>
              )}
            </div>
          ) : (
            <div style={{ border:'1px solid rgba(76,175,80,.25)', background:'rgba(76,175,80,.06)', borderLeft:'3px solid rgba(76,175,80,.6)', padding:'13px 15px' }}>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <span style={{ fontSize:18 }}>✅</span>
                <div>
                  <div style={{ fontFamily:T.display, fontSize:14, color:'#4CAF50', letterSpacing:2, textTransform:'uppercase' }}>Apto para Jogar</div>
                  <div style={{ fontFamily:T.body, fontSize:11, color:T.inkFaint, marginTop:1 }}>Sem lesões ativas</div>
                </div>
              </div>
            </div>
          )}

          {showRetire && (
            <div style={{ marginTop:10 }}>
              <Sh color={sc}>Risco de Aposentadoria</Sh>
              <div style={{ border:`1px solid ${retireRisk.color}28`, background:`${retireRisk.color}06`, borderLeft:`3px solid ${retireRisk.color}`, padding:'12px 14px' }}>
                <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:8 }}>
                  <div style={{ fontFamily:T.display, fontSize:32, color:retireRisk.color, lineHeight:1 }}>{retirePercent}<span style={{ fontSize:14, opacity:.6 }}>%</span></div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontFamily:T.display, fontSize:11, color:retireRisk.color, letterSpacing:2, textTransform:'uppercase' }}>{retireRisk.label}</div>
                    <div style={{ fontFamily:T.body, fontSize:10, color:T.inkFaint }}>Próxima virada</div>
                  </div>
                </div>
                <Bar value={retirePercent} color={retireRisk.color} height={3} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* BURDEN DE LESÕES */}
      {(() => {
        const burden = player.injuryBurden;
        if (!burden || burden.score < 10) return null;
        const burdenColor =
          burden.score >= 80 ? '#F44336' :
          burden.score >= 60 ? '#FF5722' :
          burden.score >= 40 ? '#FF9800' :
          burden.score >= 20 ? '#FFC107' :
                               '#8BC34A';
        const affectedAttrs = getBurdenAffectedAttrs(player);
        const ATTR_LABELS = { velocidade:'Velocidade', explosividade:'Explosividade', resistencia:'Resistência' };
        return (
          <div style={{ marginTop:20 }}>
            <Sh color={sc}>Desgaste Acumulado por Lesões</Sh>
            <div style={{ border:`1px solid ${burdenColor}33`, background:`${burdenColor}07`, borderLeft:`3px solid ${burdenColor}`, padding:'14px 16px' }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <span style={{ fontSize:20 }}>🩻</span>
                  <div>
                    <div style={{ fontFamily:T.display, fontSize:13, color:burdenColor, letterSpacing:1, textTransform:'uppercase' }}>
                      {burden.label}
                    </div>
                    <div style={{ fontFamily:T.mono, fontSize:7, color:T.inkFaint, marginTop:2, letterSpacing:1 }}>
                      Score {burden.score}/100 · Multiplicador ×{burden.multiplier.toFixed(2)}
                    </div>
                  </div>
                </div>
                <div style={{ background:`${burdenColor}18`, border:`1px solid ${burdenColor}44`, padding:'4px 12px',
                  fontFamily:T.mono, fontSize:8, color:burdenColor, letterSpacing:2, textTransform:'uppercase' }}>
                  {burden.multiplier >= 2.0 ? 'Crítico' : burden.multiplier >= 1.6 ? 'Alto' : burden.multiplier >= 1.3 ? 'Moderado' : 'Leve'}
                </div>
              </div>
              <Bar value={burden.score} color={burdenColor} height={4} showGlow />
              <div style={{ fontFamily:T.body, fontSize:11, color:T.inkFaint, lineHeight:1.6, marginTop:10 }}>
                {burden.score >= 80
                  ? 'Histórico crítico de lesões. O corpo regride mais rápido do que a média — especialmente velocidade e explosividade.'
                  : burden.score >= 40
                  ? 'Lesões recorrentes deixaram marca. O declínio físico está acelerado em relação à idade.'
                  : 'Desgaste residual de lesões passadas. Impacto moderado no ritmo de declínio físico.'}
              </div>
              {affectedAttrs.length > 0 && (
                <div style={{ marginTop:10, display:'flex', flexWrap:'wrap', gap:6 }}>
                  {affectedAttrs.map(a => (
                    <div key={a} style={{ background:`${burdenColor}15`, border:`1px solid ${burdenColor}44`,
                      padding:'3px 10px', fontFamily:T.mono, fontSize:7, color:burdenColor,
                      letterSpacing:2, textTransform:'uppercase' }}>
                      ↓ {ATTR_LABELS[a] ?? a}
                    </div>
                  ))}
                  <div style={{ fontFamily:T.mono, fontSize:7, color:T.inkFaint, alignSelf:'center', marginLeft:4 }}>
                    declínio amplificado
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* HISTÓRICO DE LESÕES */}
      {injHistory.length > 0 && (
        <div style={{ marginTop:20 }}>
          <Sh color={sc}>Histórico de Lesões · {injHistory.length}</Sh>
          {[...injHistory].reverse().map((h, i) => {
            const hDef = INJURY_TYPES[h.type] ?? {};
            const gc = gradeColor(h.grade);
            return (
              <div key={i} className="upp2-hrow" style={{ borderLeft:`2px solid ${gc}55` }}>
                <span style={{ fontSize:13, flexShrink:0 }}>{hDef.icon??'🩹'}</span>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                    <div style={{ fontFamily:T.display, fontSize:11, letterSpacing:1, color:T.ink, textTransform:'uppercase' }}>{hDef.label??h.type}</div>
                    {h.playedThrough && (
                      <span style={{ fontFamily:T.mono, fontSize:6, color:'#FF9800', border:'1px solid rgba(255,152,0,.35)', padding:'1px 5px', letterSpacing:1 }}>JOGOU LESIONADO</span>
                    )}
                  </div>
                  <div style={{ fontFamily:T.mono, fontSize:7, color:T.inkFaint, letterSpacing:1, marginTop:2, display:'flex', gap:8 }}>
                    {h.season && <span>{h.season}</span>}
                    {h.originTournament && <span>{h.originTournament}</span>}
                    {h.slotsOut > 0 && <span style={{ color:`${gc}99` }}>⛔ {h.slotsOut} torneio{h.slotsOut!==1?'s':''} fora</span>}
                  </div>
                </div>
                <div style={{ background:`${gc}18`, border:`1px solid ${gc}33`, padding:'2px 8px', flexShrink:0 }}>
                  <span style={{ fontFamily:T.mono, fontSize:7, color:gc, letterSpacing:1 }}>G{h.grade}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// TAB 8: TÉCNICO & CIRCUITO
// ─────────────────────────────────────────────────────────────────
function TabTecnico({ np, sc, coachPool, dispatch, year, rivalrySystem }) {
  const [view, setView] = useState('tecnico'); // tecnico | circuito
  const [showMkt, setShowMkt] = useState(false);

  const currentCoachMeta = np.coach ? (coachPool??[]).find(c => c.id===np.coach.coachId) ?? null : null;
  const currentCoach = currentCoachMeta ? { ...currentCoachMeta, ...np.coach, id:currentCoachMeta.id } : np.coach ? { ...np.coach, id:np.coach.coachId } : null;
  const history = [...(np.coachHistory??[])].reverse();
  const bond = np.coach?.bondScore ?? null;
  const bondState = np.coach?.relationshipState ?? 'STABLE';
  const bondDef = PARTNERSHIP_STATES[bondState] ?? PARTNERSHIP_STATES.STABLE;
  const bondGrad = { STABLE:'linear-gradient(90deg,#22C55E,#4CAF50)', TENSION:'linear-gradient(90deg,#FF9800,#FFB74D)', CRISIS:'linear-gradient(90deg,#F44336,#EF5350)', RUPTURE:'linear-gradient(90deg,#9C27B0,#AB47BC)' };

  function handleFire() {
    if (!dispatch || !currentCoach) return;
    dispatch({ type:'FIRE_COACH', playerId:np.id, coachId:currentCoach.id??currentCoach.coachId, season:year, reason:'VOLUNTARY' });
  }

  // CIRCUITO
  migrateTournamentPreferences(np);
  const prefs = np.tournamentPreferences ?? [];
  const top3 = getTopFavoriteTournaments(np);
  const bottom3 = getBottomTournaments(np);
  const bottomIds = new Set(bottom3.map(b=>b.tournament.id));
  const fullList = prefs.map((id, rank) => {
    const tournament = PREFERABLE_TOURNAMENTS.find(t=>t.id===id);
    const bonus = PREFERENCE_BONUS[rank] ?? null;
    return tournament ? { rank, tournament, bonus, isBottom:bottomIds.has(id) } : null;
  }).filter(Boolean);

  return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', minHeight:0 }}>
      <SubTabBar tabs={[['tecnico','🎓 Técnico'], ['circuito','🗺️ Circuito']]} active={view} onTab={setView} sc={sc} />

      <div style={{ flex:1, display:'flex', overflow:'hidden', minHeight:0 }} key={view}>
        {view === 'tecnico' && (
          <div className="upp2-scroll" style={{ flex:1, padding:'20px 22px', overflowY:'auto' }}>
            {/* Stats */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:2, marginBottom:18 }}>
              <StatCard label="Técnicos"           value={history.length+(currentCoach?1:0)} color={sc} />
              <StatCard label="Temp. com técnico"  value={history.reduce((a,h)=>a+(h.seasons??0),0)} color={T.inkDim} />
              <StatCard label="Títulos c/ técnico" value={history.reduce((a,h)=>a+(h.titlesUnder??0),0)} color={T.gold} />
            </div>

            {/* Técnico atual */}
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
              <Sh color={sc}>Técnico Atual</Sh>
              <div style={{ display:'flex', gap:5 }}>
                {currentCoach && dispatch && (
                  <button onClick={handleFire} style={{ fontFamily:T.mono, fontSize:7, padding:'4px 9px', cursor:'pointer', border:'1px solid rgba(244,67,54,.35)', background:'rgba(244,67,54,.07)', color:'#F44336', textTransform:'uppercase', letterSpacing:1 }}>Demitir</button>
                )}
                {!currentCoach && dispatch && (
                  <button onClick={() => setShowMkt(true)} style={{ fontFamily:T.mono, fontSize:7, padding:'4px 9px', cursor:'pointer', border:`1px solid ${sc}55`, background:`${sc}14`, color:sc, textTransform:'uppercase', letterSpacing:1 }}>🎓 Mercado</button>
                )}
              </div>
            </div>

            {currentCoach ? (
              <>
                {/* Coach card */}
                {(() => {
                  const phil = PHIL_META[currentCoach.philosophy] ?? { label:currentCoach.philosophy, icon:'🎾', color:T.ink };
                  const ovr = currentCoach.coachAttrs ? coachOverallRating(currentCoach.coachAttrs) : null;
                  const grade = ovr !== null ? coachGrade(ovr) : null;
                  const surf = currentCoach.specialtySurface ? { label:SURF_LABEL[currentCoach.specialtySurface], color:SURF_COLOR[currentCoach.specialtySurface] } : null;
                  return (
                    <div style={{ border:`1px solid ${phil.color}44`, background:`${phil.color}07`, padding:'15px 17px', marginBottom:12 }}>
                      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:10 }}>
                        <div>
                          <div style={{ fontFamily:T.display, fontSize:20, color:T.ink, textTransform:'uppercase', letterSpacing:.5 }}>{currentCoach.fullName??currentCoach.name}</div>
                          {currentCoach.nationality && <div style={{ fontFamily:T.mono, fontSize:8, color:T.inkFaint, letterSpacing:2, marginTop:2 }}>{currentCoach.nationality}</div>}
                          <div style={{ display:'flex', gap:5, marginTop:7, flexWrap:'wrap' }}>
                            <Pill label={`${phil.icon} ${phil.label}`} color={phil.color} />
                            {surf && <Pill label={surf.label} color={surf.color} />}
                          </div>
                        </div>
                        {grade && (
                          <div style={{ textAlign:'right' }}>
                            <div style={{ fontFamily:T.display, fontSize:36, color:phil.color, lineHeight:1 }}>{grade}</div>
                            <div style={{ fontFamily:T.mono, fontSize:8, color:T.inkFaint, marginTop:2 }}>Técnico · {grade}</div>
                          </div>
                        )}
                      </div>
                      {currentCoach.coachAttrs && (
                        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'6px 18px' }}>
                          {COACH_ATTR_CATEGORIES.map(cat => (
                            <div key={cat.id}>
                              <div style={{ fontFamily:T.mono, fontSize:7, color:cat.color, textTransform:'uppercase', letterSpacing:2, marginBottom:5 }}>{cat.label}</div>
                              {cat.attrs.map(a => (
                                <div key={a.key} style={{ marginBottom:4 }}>
                                  <div style={{ fontFamily:T.mono, fontSize:7, color:T.inkFaint, marginBottom:2 }}>{a.label}</div>
                                  <Bar value={currentCoach.coachAttrs[a.key]??0} color={cat.color} height={3} />
                                </div>
                              ))}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* BOND */}
                {bond !== null && (
                  <div style={{ border:`1px solid ${bondDef.color}28`, background:`${bondDef.color}07`, padding:'14px 16px', marginBottom:12 }}>
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <span style={{ fontSize:18 }}>{bondDef.icon}</span>
                        <div>
                          <div style={{ fontFamily:T.mono, fontSize:7, letterSpacing:3, color:bondDef.color, textTransform:'uppercase' }}>PARCERIA {bondDef.label.toUpperCase()}</div>
                          {np.coach?.startSeason && <div style={{ fontFamily:T.mono, fontSize:8, color:T.inkFaint, marginTop:1 }}>Juntos desde {np.coach.startSeason}</div>}
                        </div>
                      </div>
                      <div style={{ fontFamily:T.display, fontSize:32, color:bondDef.color, lineHeight:1 }}>{Math.round(bond)}</div>
                    </div>
                    <div style={{ height:5, background:'rgba(237,232,223,.06)', position:'relative', marginBottom:8 }}>
                      <div style={{ position:'absolute', left:0, top:0, height:'100%', width:`${bond}%`, background:bondGrad[bondState], transition:'width .4s', boxShadow:`0 0 8px ${bondDef.color}44` }}/>
                      {[30,50,75].map(t => <div key={t} style={{ position:'absolute', left:`${t}%`, top:-2, bottom:-2, width:1, background:'rgba(237,232,223,.12)' }}/>)}
                    </div>
                    {np.coach?.lastGoalNarrative && (
                      <div style={{ borderLeft:`2px solid ${bondDef.color}44`, paddingLeft:10, marginTop:8 }}>
                        <div style={{ fontFamily:T.mono, fontSize:7, letterSpacing:2, color:T.inkFaint, textTransform:'uppercase', marginBottom:3 }}>Último balanço</div>
                        <p style={{ fontFamily:T.body, fontSize:11, color:T.inkDim, lineHeight:1.5, margin:0 }}>{np.coach.lastGoalNarrative}</p>
                      </div>
                    )}

                    {/* Milestones */}
                    {(np.coach?.milestones ?? []).length > 0 && (
                      <div style={{ marginTop:10 }}>
                        <div style={{ fontFamily:T.mono, fontSize:7, letterSpacing:2, color:T.inkFaint, textTransform:'uppercase', marginBottom:5 }}>Marcos</div>
                        <div style={{ display:'flex', flexWrap:'wrap', gap:5 }}>
                          {np.coach.milestones.map((m, i) => {
                            const mDef = MILESTONE_TYPES[m.type] ?? {};
                            return (
                              <div key={i} style={{ display:'flex', alignItems:'center', gap:4, fontFamily:T.mono, fontSize:8, padding:'3px 8px', background:'rgba(237,232,223,.05)', border:'1px solid rgba(237,232,223,.09)', color:T.inkDim }}>
                                <span>{mDef.icon??'⭐'}</span><span>{m.label??m.type}</span><span style={{ color:T.inkFaint }}>{m.season}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Meta da temporada */}
                {np.coach?.seasonGoal && (() => {
                  const goal = np.coach.seasonGoal;
                  const AMBITION_COLOR = { CONSERVATIVE:'rgba(237,232,223,.3)', REALISTIC:'#2860A8', AMBITIOUS:'#F06428' };
                  const ac = AMBITION_COLOR[goal.ambition] ?? sc;
                  return (
                    <div style={{ border:`1px solid ${sc}28`, background:`${sc}06`, padding:'13px 15px', marginBottom:12 }}>
                      <div style={{ fontFamily:T.mono, fontSize:7, letterSpacing:3, color:T.inkFaint, textTransform:'uppercase', marginBottom:8 }}>Meta — {goal.season??year}</div>
                      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                        <Pill label={{ CONSERVATIVE:'Conservadora', REALISTIC:'Realista', AMBITIOUS:'Ambiciosa' }[goal.ambition]??goal.ambition} color={ac} />
                        <div style={{ fontFamily:T.display, fontSize:16, color:sc, letterSpacing:.5 }}>{goal.label}</div>
                      </div>
                      {goal.rationale && <p style={{ fontFamily:T.mono, fontSize:10, color:T.inkFaint, borderLeft:`2px solid ${sc}44`, paddingLeft:9, marginTop:9, lineHeight:1.6, fontStyle:'italic' }}>"{goal.rationale}"</p>}
                    </div>
                  );
                })()}

                {/* Bond history */}
                {(np.coach?.bondHistory ?? []).length > 0 && (
                  <div style={{ marginBottom:12 }}>
                    <Sh color={sc}>Histórico de Bond</Sh>
                    {[...np.coach.bondHistory].reverse().map((h, i) => {
                      const om = OUTCOME_META[h.outcome] ?? { color:T.inkFaint, icon:'—', label:'—' };
                      return (
                        <div key={i} style={{ display:'flex', alignItems:'center', gap:10, padding:'7px 11px', background:i%2===0?'rgba(237,232,223,.02)':'transparent', borderBottom:`1px solid ${T.line}` }}>
                          <span style={{ fontFamily:T.mono, fontSize:8, color:T.inkFaint, minWidth:34 }}>{h.season}</span>
                          <div style={{ fontFamily:T.mono, fontSize:7, padding:'1px 6px', border:`1px solid ${om.color}44`, background:`${om.color}0f`, color:om.color, textTransform:'uppercase', letterSpacing:1, minWidth:60, textAlign:'center', flexShrink:0 }}>{om.icon} {om.label}</div>
                          <div style={{ flex:1, height:2, background:'rgba(237,232,223,.05)', position:'relative' }}>
                            <div style={{ position:'absolute', left:0, top:0, height:'100%', width:`${h.bond??0}%`, background:h.bond>=50?'#22C55E':h.bond>=30?'#FF9800':'#F44336' }}/>
                          </div>
                          <span style={{ fontFamily:T.mono, fontSize:9, color:T.inkDim, minWidth:24, textAlign:'right' }}>{Math.round(h.bond??0)}</span>
                          <span style={{ fontFamily:T.mono, fontSize:8, color:(h.delta??0)>0?'#22C55E':'#F44336', minWidth:28, textAlign:'right' }}>{(h.delta??0)>0?'+':''}{h.delta}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            ) : (
              <div style={{ textAlign:'center', padding:'24px 18px', border:'1px dashed rgba(237,232,223,.09)', marginBottom:18 }}>
                <div style={{ fontSize:36, marginBottom:8 }}>🎓</div>
                <div style={{ fontFamily:T.display, fontSize:11, letterSpacing:4, color:'rgba(237,232,223,.18)', textTransform:'uppercase' }}>Sem Técnico</div>
                {dispatch && <button onClick={() => setShowMkt(true)} style={{ marginTop:14, fontFamily:T.mono, fontSize:8, padding:'7px 18px', cursor:'pointer', border:`1px solid ${sc}55`, background:`${sc}14`, color:sc, textTransform:'uppercase', letterSpacing:2 }}>Ver mercado</button>}
              </div>
            )}

            {/* Histórico */}
            {history.length > 0 && (
              <>
                <Sh color={sc}>Histórico de Técnicos</Sh>
                {history.map((entry, i) => {
                  const phil = PHIL_META[entry.philosophy] ?? { icon:'🎾', color:T.ink };
                  return (
                    <div key={i} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 13px', background:i%2===0?'rgba(237,232,223,.02)':'transparent', borderBottom:`1px solid ${T.line}` }}>
                      <div style={{ fontSize:18, flexShrink:0 }}>{phil.icon}</div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontFamily:T.display, fontSize:13, color:T.inkDim, textTransform:'uppercase', letterSpacing:.5 }}>{entry.fullName??entry.name}</div>
                        <div style={{ fontFamily:T.mono, fontSize:8, color:T.inkFaint, marginTop:1 }}>{entry.startSeason} – {entry.endSeason}</div>
                      </div>
                      <div style={{ textAlign:'center', minWidth:44 }}>
                        <div style={{ fontFamily:T.display, fontSize:16, color:entry.titlesUnder>0?T.gold:T.inkFaint }}>{entry.titlesUnder}</div>
                        <div style={{ fontFamily:T.mono, fontSize:7, color:T.inkFaint }}>títulos</div>
                      </div>
                      <div style={{ textAlign:'center', minWidth:44 }}>
                        <div style={{ fontFamily:T.display, fontSize:14, color:entry.peakRankUnder<=10?'#22C55E':T.inkFaint }}>{entry.peakRankUnder<999?`#${entry.peakRankUnder}`:'—'}</div>
                        <div style={{ fontFamily:T.mono, fontSize:7, color:T.inkFaint }}>pico</div>
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        )}

        {view === 'circuito' && (
          <div className="upp2-scroll" style={{ flex:1, overflowY:'auto' }}>
            {/* Bonus cards */}
            <div style={{ padding:'16px 18px 10px', borderBottom:`1px solid ${T.line}` }}>
              <div style={{ fontFamily:T.display, fontSize:9, letterSpacing:4, color:T.inkFaint, textTransform:'uppercase', marginBottom:10 }}>✦ Bônus de Performance — Torneios Favoritos</div>
              <div style={{ display:'flex', gap:7, flexWrap:'wrap' }}>
                {top3.map(({ rank, tournament, bonus }) => (
                  bonus && tournament ? (
                    <div key={rank} style={{ flex:1, minWidth:150, background:`linear-gradient(135deg,${bonus.color}14,${bonus.color}07)`, border:`1px solid ${bonus.color}44`, padding:'11px 14px', display:'flex', alignItems:'center', gap:12 }}>
                      <div style={{ fontFamily:T.display, fontWeight:700, fontSize:24, color:bonus.color, lineHeight:1, flexShrink:0 }}>{rank+1}</div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontFamily:T.display, fontSize:10, color:bonus.color, letterSpacing:2, textTransform:'uppercase', marginBottom:1 }}>{bonus.label}</div>
                        <div style={{ fontFamily:T.display, fontSize:12, color:T.ink, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{tournament.name}</div>
                        <div style={{ display:'flex', gap:4, marginTop:4 }}>
                          {bonus.mental>0 && <span style={{ fontFamily:T.mono, fontSize:7, color:'#87CEEB', border:'1px solid rgba(135,206,235,.3)', padding:'1px 5px' }}>Mental +{bonus.mental*100}%</span>}
                          {bonus.physical>0 && <span style={{ fontFamily:T.mono, fontSize:7, color:'#90EE90', border:'1px solid rgba(144,238,144,.3)', padding:'1px 5px' }}>Físico +{bonus.physical*100}%</span>}
                        </div>
                      </div>
                    </div>
                  ) : null
                ))}
              </div>
            </div>

            {/* Full list */}
            <div>
              {fullList.map(({ rank, tournament, bonus, isBottom }) => {
                const sc2 = SURF_COLOR[tournament.surface] ?? '#aaa';
                const isTop3 = bonus != null;
                return (
                  <div key={tournament.id} style={{ display:'flex', alignItems:'center', gap:9, padding:'8px 13px', background:isTop3?`linear-gradient(90deg,${bonus.color}10,transparent)`:isBottom?'rgba(255,60,60,.03)':'transparent', borderLeft:isTop3?`3px solid ${bonus.color}`:isBottom?'3px solid rgba(255,60,60,.35)':'3px solid transparent', borderBottom:`1px solid ${T.line}` }}>
                    <div style={{ fontFamily:T.display, fontWeight:700, fontSize:12, color:isTop3?bonus.color:isBottom?'rgba(255,107,107,.4)':'rgba(237,232,223,.18)', width:22, textAlign:'center', flexShrink:0 }}>{rank+1}</div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontFamily:T.display, fontSize:12, color:isTop3?T.ink:isBottom?'rgba(237,232,223,.3)':'rgba(237,232,223,.65)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{tournament.name}</div>
                      <div style={{ fontFamily:T.mono, fontSize:7, color:'rgba(237,232,223,.22)', marginTop:1 }}>{tournament.month}</div>
                    </div>
                    <div style={{ display:'flex', gap:4, flexShrink:0 }}>
                      <span style={{ fontFamily:T.mono, fontSize:7, background:`${sc2}1a`, border:`1px solid ${sc2}44`, color:sc2, padding:'1px 5px' }}>{SURF_LABEL[tournament.surface]??tournament.surface}</span>
                      {isBottom && <span style={{ fontFamily:T.mono, fontSize:7, background:'rgba(255,60,60,.1)', border:'1px solid rgba(255,60,60,.28)', color:'#FF6B6B', padding:'1px 5px' }}>evita</span>}
                      {isTop3 && <span style={{ fontFamily:T.mono, fontSize:7, background:`${bonus.color}1a`, border:`1px solid ${bonus.color}44`, color:bonus.color, padding:'1px 5px' }}>{bonus.label}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// ── TabFinanceiro ─────────────────────────────────────────────────
function TabFinanceiro({ np, sc }) {
  const [expandLog, setExpandLog] = React.useState(false);

  const p = React.useMemo(() => {
    const clone = { ...np };
    initPlayerFinance(clone);
    return clone;
  }, [np]);

  const f = p.finance;
  const pressure = getFinancialPressure(p);
  const rank = p.rankPosition ?? 200;

  const seasonKeys = Object.keys(f.earningsBySeason ?? {}).sort();
  const maxEarning = Math.max(...seasonKeys.map(k => f.earningsBySeason[k] ?? 0), 1);
  const log = f.prizeMoneyLog ?? [];
  const logToShow = expandLog ? log.slice().reverse() : log.slice(-8).reverse();

  const coachSalary = getCoachSalary(p.coach);
  const equipmentCost = rank <= 10 ? 8_000 : rank <= 50 ? 6_000 : rank <= 100 ? 4_500 : 3_000;
  const physioEst = rank <= 20 ? 48_000 : rank <= 100 ? 30_000 : 14_400;
  const prepFisicoEst = coachSalary >= 120_000 ? (rank <= 20 ? 15_000 : rank <= 100 ? 8_000 : 4_000) : 0;
  const totalCostsEst = coachSalary + equipmentCost + physioEst + prepFisicoEst;
  const hasData = (f.careerEarnings ?? 0) > 0;

  const Sh = ({ children, color }) => (
    <div style={{ fontFamily:'Rajdhani,monospace', fontSize:9, fontWeight:700,
      letterSpacing:3, color: color ?? sc, textTransform:'uppercase',
      margin:'20px 0 10px', display:'flex', alignItems:'center', gap:8 }}>
      <div style={{ width:14, height:1, background: color ?? sc }} />
      {children}
      <div style={{ flex:1, height:1, background:'rgba(255,255,255,0.06)' }} />
    </div>
  );

  const StatBox = ({ label, value, color, sub }) => (
    <div style={{ flex:1, padding:'10px 14px', background:'rgba(255,255,255,0.03)',
      border:'1px solid rgba(255,255,255,0.07)', display:'flex', flexDirection:'column', gap:4 }}>
      <div style={{ fontFamily:'Rajdhani,monospace', fontSize:7, letterSpacing:3,
        color:'rgba(255,255,255,0.25)', textTransform:'uppercase' }}>{label}</div>
      <div style={{ fontFamily:'Rajdhani,monospace', fontSize:20, fontWeight:900,
        color: color ?? 'rgba(255,255,255,0.8)', lineHeight:1 }}>{value}</div>
      {sub && <div style={{ fontFamily:'Rajdhani,monospace', fontSize:8,
        color:'rgba(255,255,255,0.3)' }}>{sub}</div>}
    </div>
  );

  const CAT_COLOR = { GRAND_SLAM:'#FFD700', MASTERS_1000:'#E040FB', ATP_500:'#00BCD4',
    ATP_250:'#66BB6A', ATP_100:'#FF7043', FINALS:'#F44336', ATP_PROSPECTS:'#FF7043' };

  return (
    <div style={{ padding:'4px 16px 32px', color:'rgba(242,237,228,0.85)' }}>

      <Sh>Situação Financeira</Sh>
      <div style={{ display:'flex', gap:8, marginBottom:8 }}>
        <StatBox label="Budget Atual"         value={formatUSD(f.budget ?? 0)}               color={pressure.color} sub={pressure.label} />
        <StatBox label="Prize Money Carreira" value={formatUSD(f.careerEarnings ?? 0)}        color="#FFD700" />
        <StatBox label="Temporada Atual"      value={formatUSD(f.currentSeasonEarnings ?? 0)} color={sc} />
      </div>

      {/* Barra de saúde financeira */}
      <div style={{ padding:'12px 14px', background:'rgba(255,255,255,0.03)',
        border:'1px solid rgba(255,255,255,0.07)', marginBottom:4 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
          <span style={{ fontFamily:'Rajdhani,monospace', fontSize:8, letterSpacing:2,
            color:'rgba(255,255,255,0.3)', textTransform:'uppercase' }}>SAÚDE FINANCEIRA</span>
          <span style={{ fontFamily:'Rajdhani,monospace', fontSize:10, fontWeight:700,
            color:pressure.color, letterSpacing:2 }}>{pressure.label.toUpperCase()}</span>
        </div>
        <div style={{ height:4, background:'rgba(255,255,255,0.06)', borderRadius:2, overflow:'hidden' }}>
          {(() => {
            const bud = f.budget ?? 0;
            const frac = bud >= 0 ? Math.min(bud / 500_000, 1) * 0.5 + 0.5
              : Math.max((bud / -300_000) * 0.5, 0);
            return <div style={{ height:'100%', width:`${Math.round(frac*100)}%`,
              background:`linear-gradient(90deg,${pressure.color}88,${pressure.color})`,
              transition:'width 0.6s ease' }} />;
          })()}
        </div>
        {!hasData && (
          <div style={{ fontFamily:'Rajdhani,monospace', fontSize:8, color:'rgba(255,255,255,0.2)',
            marginTop:8, textAlign:'center', letterSpacing:2 }}>NENHUM TORNEIO JOGADO AINDA</div>
        )}
      </div>

      {/* Gráfico por temporada */}
      {seasonKeys.length > 0 && (<>
        <Sh>Prize Money por Temporada</Sh>
        <div style={{ padding:'14px', background:'rgba(255,255,255,0.03)',
          border:'1px solid rgba(255,255,255,0.07)', marginBottom:4 }}>
          <div style={{ display:'flex', alignItems:'flex-end', gap:5, height:80 }}>
            {seasonKeys.map(yr => {
              const val   = f.earningsBySeason[yr] ?? 0;
              const costs = f.costsBySeason?.[yr]  ?? 0;
              const h = Math.max((val / maxEarning) * 72, 2);
              return (
                <div key={yr} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:2 }}>
                  <div style={{ fontFamily:'Rajdhani,monospace', fontSize:6, color:sc }}>{formatUSD(val)}</div>
                  <div style={{ width:'100%', height:h, background:`linear-gradient(180deg,${sc}cc,${sc}44)`,
                    borderRadius:'2px 2px 0 0', position:'relative' }}>
                    {costs > 0 && val > 0 && (
                      <div style={{ position:'absolute', bottom:`${Math.min((costs/val)*h, h-1)}px`,
                        left:0, right:0, height:1, background:'#FF6060', opacity:0.7 }} />
                    )}
                  </div>
                  <div style={{ fontFamily:'Rajdhani,monospace', fontSize:6, color:'rgba(255,255,255,0.25)' }}>{yr}</div>
                </div>
              );
            })}
          </div>
          <div style={{ display:'flex', gap:16, marginTop:8 }}>
            <div style={{ display:'flex', alignItems:'center', gap:4 }}>
              <div style={{ width:8, height:3, background:sc, borderRadius:1 }} />
              <span style={{ fontFamily:'Rajdhani,monospace', fontSize:7, color:'rgba(255,255,255,0.3)' }}>Prize money</span>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:4 }}>
              <div style={{ width:8, height:1, background:'#FF6060' }} />
              <span style={{ fontFamily:'Rajdhani,monospace', fontSize:7, color:'rgba(255,255,255,0.3)' }}>Linha de custos</span>
            </div>
          </div>
        </div>
      </>)}

      {/* Custos anuais */}
      <Sh>Custos Estimados (por ano)</Sh>
      <div style={{ padding:'12px 14px', background:'rgba(255,255,255,0.03)',
        border:'1px solid rgba(255,255,255,0.07)', marginBottom:4 }}>
        {[
          { label:'Técnico',           value:coachSalary,    note: p.coach ? (p.coach.name ?? 'Coach') : 'Sem técnico' },
          { label:'Fisioterapia',      value:physioEst,      note:'Estimado (~12 torneios)' },
          { label:'Equipamentos',      value:equipmentCost,  note:'Raquetes, cordas, calçado' },
          ...(prepFisicoEst > 0 ? [{ label:'Preparador Físico', value:prepFisicoEst, note:'Coach de elite' }] : []),
        ].map(({ label, value, note }) => (
          <div key={label} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
            <span style={{ fontFamily:'Rajdhani,monospace', fontSize:8, color:'rgba(255,255,255,0.35)',
              width:120, flexShrink:0, textTransform:'uppercase', letterSpacing:1 }}>{label}</span>
            <div style={{ flex:1, height:2, background:'rgba(255,255,255,0.05)', overflow:'hidden' }}>
              <div style={{ height:'100%', width:`${Math.min((value/totalCostsEst)*100,100)}%`,
                background:'#FF6060aa' }} />
            </div>
            <span style={{ fontFamily:'Rajdhani,monospace', fontSize:10, fontWeight:700,
              color:'#FF6060', width:56, textAlign:'right', flexShrink:0 }}>{formatUSD(value)}</span>
            <span style={{ fontFamily:'Rajdhani,monospace', fontSize:7,
              color:'rgba(255,255,255,0.2)', width:120, flexShrink:0 }}>{note}</span>
          </div>
        ))}
        <div style={{ borderTop:'1px solid rgba(255,255,255,0.08)', paddingTop:8,
          display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <span style={{ fontFamily:'Rajdhani,monospace', fontSize:8, fontWeight:700,
            color:'rgba(255,255,255,0.4)', letterSpacing:2, textTransform:'uppercase' }}>TOTAL ANUAL</span>
          <span style={{ fontFamily:'Rajdhani,monospace', fontSize:14, fontWeight:900,
            color:'#FF6060' }}>{formatUSD(totalCostsEst)}</span>
        </div>
      </div>

      {/* Log de prize money */}
      {log.length > 0 && (<>
        <Sh>Histórico de Prize Money</Sh>
        <div style={{ padding:'4px 0' }}>
          {logToShow.map((entry, i) => {
            const catColor = CAT_COLOR[entry.category] ?? sc;
            const isTitle  = entry.round === 'W';
            return (
              <div key={i} style={{ display:'flex', alignItems:'center', gap:10,
                padding:'7px 12px', marginBottom:3,
                background: isTitle ? `${catColor}0A` : 'rgba(255,255,255,0.02)',
                border:`1px solid ${isTitle ? catColor+'33' : 'rgba(255,255,255,0.06)'}`,
                borderLeft:`3px solid ${catColor}` }}>
                <span style={{ fontFamily:'Rajdhani,monospace', fontSize:8,
                  color:'rgba(255,255,255,0.3)', width:32, flexShrink:0 }}>{entry.season}</span>
                <span style={{ fontFamily:'Rajdhani,monospace', fontSize:10,
                  color:'rgba(255,255,255,0.7)', flex:1, minWidth:0,
                  overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                  {entry.tournamentName || 'Torneio'}
                </span>
                <span style={{ fontFamily:'Rajdhani,monospace', fontSize:7, fontWeight:700,
                  color:catColor, letterSpacing:1, textTransform:'uppercase', flexShrink:0 }}>
                  {CAT_PRIZE_LABEL[entry.category] ?? entry.category}
                </span>
                <span style={{ fontFamily:'Rajdhani,monospace', fontSize:8,
                  color:'rgba(255,255,255,0.35)', width:60, textAlign:'right', flexShrink:0 }}>
                  {ROUND_PRIZE_LABEL[entry.round] ?? entry.round}
                </span>
                <span style={{ fontFamily:'Rajdhani,monospace', fontSize:12, fontWeight:900,
                  color:catColor, width:64, textAlign:'right', flexShrink:0 }}>
                  {formatUSD(entry.amount)}
                </span>
              </div>
            );
          })}
          {log.length > 8 && (
            <button onClick={() => setExpandLog(v => !v)} style={{ width:'100%', marginTop:4,
              padding:'6px', background:'rgba(255,255,255,0.03)',
              border:'1px solid rgba(255,255,255,0.08)', color:'rgba(255,255,255,0.3)',
              fontFamily:'Rajdhani,monospace', fontSize:8, letterSpacing:2,
              cursor:'pointer', textTransform:'uppercase' }}>
              {expandLog ? '▲ MENOS' : `▼ VER TODOS (${log.length})`}
            </button>
          )}
        </div>
      </>)}

      {/* Tabela de referência */}
      <Sh>Tabela de Prize Money do Circuito</Sh>
      <div style={{ overflowX:'auto' }}>
        <table style={{ width:'100%', borderCollapse:'collapse',
          fontFamily:'Rajdhani,monospace', fontSize:9 }}>
          <thead>
            <tr>{['CATEGORIA','TÍTULO','FINAL','SEMI','QUARTAS','R16','1ª RD'].map(h => (
              <th key={h} style={{ padding:'6px 8px', textAlign: h==='CATEGORIA'?'left':'right',
                color:'rgba(255,255,255,0.3)', fontWeight:700, letterSpacing:1,
                borderBottom:'1px solid rgba(255,255,255,0.08)' }}>{h}</th>
            ))}</tr>
          </thead>
          <tbody>
            {[['GRAND_SLAM','Grand Slam'],['MASTERS_1000','Masters 1000'],
              ['ATP_500','ATP 500'],['ATP_250','ATP 250'],['ATP_100','Challenger']
            ].map(([cat, label], ri) => {
              const pm = PRIZE_MONEY[cat] ?? {};
              const cc = CAT_COLOR[cat] ?? sc;
              return (
                <tr key={cat} style={{ background: ri%2===0?'transparent':'rgba(255,255,255,0.02)' }}>
                  <td style={{ padding:'6px 8px', color:cc, fontWeight:700, letterSpacing:1 }}>{label}</td>
                  {[pm.W, pm.F, pm.SF, pm.QF, pm.R16, pm.R64 ?? pm.R32].map((v, ci) => (
                    <td key={ci} style={{ padding:'6px 8px', textAlign:'right',
                      color: v ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.15)' }}>
                      {v ? formatUSD(v) : '—'}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

    </div>
  );
}

// ── TabFormaRecente ───────────────────────────────────────────────
function TabFormaRecente({ np, sc, allPlayers = [], newsEngine = null, rivalrySystem = null }) {
  const ifr      = React.useMemo(() => computeIFR(np), [np]);
  const vis      = React.useMemo(() => computeVisibility(np, { newsEngine, rivalrySystem, allPlayers }), [np]);
  const signal   = React.useMemo(() => computeSponsorSignal(np, { newsEngine, rivalrySystem, allPlayers }), [np]);

  const mktScore = np.personality?.marketability?.score ?? 30;
  const mktTier  = np.personality?.marketability?.tier ?? {};

  // Histórico de match ratings
  const ratingHist = np.matchRatingHistory ?? [];
  const avgRating  = ratingHist.length
    ? Math.round((ratingHist.slice(-5).reduce((a,b)=>a+b,0) / Math.min(ratingHist.length,5)) * 10) / 10
    : null;

  const Sh = ({ children }) => (
    <div style={{ fontFamily:'Rajdhani,monospace', fontSize:9, fontWeight:700,
      letterSpacing:3, color:sc, textTransform:'uppercase',
      margin:'20px 0 10px', display:'flex', alignItems:'center', gap:8 }}>
      <div style={{ width:14, height:1, background:sc }} />
      {children}
      <div style={{ flex:1, height:1, background:'rgba(255,255,255,0.06)' }} />
    </div>
  );

  const Gauge = ({ value, color, label, sub }) => {
    const frac = Math.min(value/100, 1);
    return (
      <div style={{ flex:1, padding:'12px 14px', background:'rgba(255,255,255,0.03)',
        border:'1px solid rgba(255,255,255,0.07)', display:'flex', flexDirection:'column', gap:6 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline' }}>
          <span style={{ fontFamily:'Rajdhani,monospace', fontSize:7, letterSpacing:3,
            color:'rgba(255,255,255,0.25)', textTransform:'uppercase' }}>{label}</span>
          <span style={{ fontFamily:'Rajdhani,monospace', fontSize:22, fontWeight:900, color, lineHeight:1 }}>
            {value}
          </span>
        </div>
        <div style={{ height:3, background:'rgba(255,255,255,0.07)', borderRadius:2, overflow:'hidden' }}>
          <div style={{ height:'100%', width:`${frac*100}%`,
            background:`linear-gradient(90deg,${color}66,${color})`, transition:'width .5s ease' }} />
        </div>
        {sub && <div style={{ fontFamily:'Rajdhani,monospace', fontSize:8,
          fontWeight:700, color, letterSpacing:2, textTransform:'uppercase' }}>{sub}</div>}
      </div>
    );
  };

  const CompRow = ({ label, value, max=100, color }) => {
    const w = Math.min(value/max,1);
    return (
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:7 }}>
        <span style={{ fontFamily:'Rajdhani,monospace', fontSize:8, color:'rgba(255,255,255,0.3)',
          textTransform:'uppercase', letterSpacing:1, width:110, flexShrink:0 }}>{label}</span>
        <div style={{ flex:1, height:3, background:'rgba(255,255,255,0.06)', borderRadius:2, overflow:'hidden' }}>
          <div style={{ height:'100%', width:`${w*100}%`, background: color ?? sc,
            borderRadius:2, transition:'width .4s ease' }} />
        </div>
        <span style={{ fontFamily:'Rajdhani,monospace', fontSize:10, fontWeight:700,
          color: color ?? sc, width:30, textAlign:'right', flexShrink:0 }}>{value}</span>
      </div>
    );
  };

  // ── Sinal combinado — círculo principal ──
  const signalTier = getPhaseTwoTier(signal.score);

  // ── Match rating history sparkline ──
  const histToShow = ratingHist.slice(-12);
  const maxR = Math.max(...histToShow, 6);

  // ── Trajetória de ranking recente ──
  const rankHist = Array.isArray(np._rankHistory) ? np._rankHistory.slice(-5) : [];

  // ── recentForm results ──
  const rfResults = (np.recentForm?.results ?? []).slice(-8);

  return (
    <div style={{ padding:'4px 16px 32px', color:'rgba(242,237,228,0.85)' }}>

      {/* ── Sinal Combinado ── */}
      <Sh>Sinal do Patrocinador</Sh>
      <div style={{ display:'flex', alignItems:'center', gap:16, padding:'16px',
        background:'rgba(255,255,255,0.03)', border:`1px solid ${signalTier.color}22`,
        borderLeft:`3px solid ${signalTier.color}`, marginBottom:4 }}>
        {/* Gauge circular SVG */}
        <div style={{ position:'relative', width:80, height:80, flexShrink:0 }}>
          <svg width="80" height="80" viewBox="0 0 80 80">
            <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="6"/>
            <circle cx="40" cy="40" r="34" fill="none"
              stroke={signalTier.color} strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={`${2*Math.PI*34}`}
              strokeDashoffset={`${2*Math.PI*34 * (1 - signal.score/100)}`}
              transform="rotate(-90 40 40)"
              style={{ filter:`drop-shadow(0 0 4px ${signalTier.glow})` }} />
          </svg>
          <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column',
            alignItems:'center', justifyContent:'center', gap:0 }}>
            <span style={{ fontFamily:'Rajdhani,monospace', fontSize:22, fontWeight:900,
              color:signalTier.color, lineHeight:1 }}>{signal.score}</span>
            <span style={{ fontFamily:'Rajdhani,monospace', fontSize:6, letterSpacing:2,
              color:'rgba(255,255,255,0.3)', textTransform:'uppercase' }}>/ 100</span>
          </div>
        </div>
        {/* Breakdown */}
        <div style={{ flex:1, display:'flex', flexDirection:'column', gap:5 }}>
          <div style={{ fontFamily:'Rajdhani,monospace', fontSize:13, fontWeight:900,
            color:signalTier.color, letterSpacing:2, textTransform:'uppercase' }}>{signalTier.label}</div>
          <div style={{ display:'flex', gap:8 }}>
            {[
              { label:'Marketability', value:mktScore, color:'#C880FF', w:0.40 },
              { label:'IFR', value:ifr.score, color:ifr.color, w:0.35 },
              { label:'Visibilidade', value:vis.score, color:'#80C8FF', w:0.25 },
            ].map(({ label, value, color, w }) => (
              <div key={label} style={{ flex:1, padding:'6px 8px',
                background:'rgba(255,255,255,0.03)', border:`1px solid ${color}22`,
                display:'flex', flexDirection:'column', gap:2 }}>
                <span style={{ fontFamily:'Rajdhani,monospace', fontSize:6, letterSpacing:2,
                  color:'rgba(255,255,255,0.25)', textTransform:'uppercase' }}>{label} ×{w}</span>
                <span style={{ fontFamily:'Rajdhani,monospace', fontSize:16, fontWeight:900,
                  color, lineHeight:1 }}>{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── IFR ── */}
      <Sh>Índice de Forma Recente (IFR)</Sh>
      <div style={{ display:'flex', gap:8, marginBottom:8 }}>
        <Gauge value={ifr.score} color={ifr.color} label="IFR" sub={ifr.label} />
        <div style={{ flex:2, padding:'12px 14px', background:'rgba(255,255,255,0.03)',
          border:'1px solid rgba(255,255,255,0.07)' }}>
          <CompRow label="Resultados Recentes" value={ifr.components.resultados} color={ifr.color} />
          <CompRow label="Trajetória Ranking"  value={ifr.components.ranking}    color={ifr.color} />
          <CompRow label="Vs Expectativa"      value={ifr.components.vsExpect}   color={ifr.color} />
          <CompRow label="Títulos Recentes"    value={ifr.components.titulos}    color={ifr.color} />
          <CompRow label="Match Rating"        value={ifr.components.matchRating} color={ifr.color} />
          <CompRow label="Saúde"               value={ifr.components.saude}      color={ifr.components.saude < 50 ? '#FF6060' : '#60FF90'} />
        </div>
      </div>

      {/* ── Últimas partidas ── */}
      {rfResults.length > 0 && (<>
        <Sh>Últimas Partidas</Sh>
        <div style={{ display:'flex', gap:4, flexWrap:'wrap', marginBottom:4 }}>
          {rfResults.slice().reverse().map((r, i) => {
            const oppRank = r.oppRank ?? 99;
            const oppLabel = oppRank <= 10 ? `Top ${oppRank}` : oppRank <= 30 ? `#${oppRank}` : `R${oppRank}`;
            const surf = r.surface ?? 'HARD';
            const surfColor = { CLAY:'#FF7043', GRASS:'#66BB6A', HARD:'#42A5F5', INDOOR:'#AB47BC' }[surf] ?? '#888';
            return (
              <div key={i} style={{ display:'flex', flexDirection:'column', alignItems:'center',
                padding:'8px 10px', gap:3, minWidth:56,
                background: r.won ? 'rgba(96,255,144,0.07)' : 'rgba(255,96,96,0.07)',
                border: `1px solid ${r.won ? 'rgba(96,255,144,0.25)' : 'rgba(255,96,96,0.2)'}`,
                borderBottom: `3px solid ${surfColor}` }}>
                <span style={{ fontFamily:'Rajdhani,monospace', fontSize:16, fontWeight:900,
                  color: r.won ? '#60FF90' : '#FF6060', lineHeight:1 }}>{r.won ? 'V' : 'D'}</span>
                <span style={{ fontFamily:'Rajdhani,monospace', fontSize:7,
                  color:'rgba(255,255,255,0.35)', letterSpacing:1 }}>{oppLabel}</span>
                <span style={{ fontFamily:'Rajdhani,monospace', fontSize:6,
                  color: surfColor, letterSpacing:1, textTransform:'uppercase' }}>{surf}</span>
              </div>
            );
          })}
        </div>
        {/* Win rate e streaks */}
        <div style={{ display:'flex', gap:8, marginBottom:4 }}>
          {[
            { label:'W/D', value:`${rfResults.filter(r=>r.won).length}/${rfResults.filter(r=>!r.won).length}`, color:'rgba(255,255,255,0.7)' },
            { label:'Sequência +', value: np.recentForm?.hotStreak ?? 0, color:'#60FF90' },
            { label:'Sequência −', value: np.recentForm?.coldStreak ?? 0, color:'#FF6060' },
            { label:'Form Score', value: np.recentForm?.formScore != null ? `${Math.round(np.recentForm.formScore*100)}%` : '—', color:sc },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ flex:1, padding:'8px 10px', background:'rgba(255,255,255,0.03)',
              border:'1px solid rgba(255,255,255,0.07)', display:'flex', flexDirection:'column', gap:2 }}>
              <span style={{ fontFamily:'Rajdhani,monospace', fontSize:6, letterSpacing:2,
                color:'rgba(255,255,255,0.25)', textTransform:'uppercase' }}>{label}</span>
              <span style={{ fontFamily:'Rajdhani,monospace', fontSize:16, fontWeight:900,
                color, lineHeight:1 }}>{value}</span>
            </div>
          ))}
        </div>
      </>)}

      {/* ── Match Rating History ── */}
      {histToShow.length > 0 && (<>
        <Sh>Rating por Partida (TDI)</Sh>
        <div style={{ padding:'12px 14px', background:'rgba(255,255,255,0.03)',
          border:'1px solid rgba(255,255,255,0.07)', marginBottom:4 }}>
          <div style={{ display:'flex', alignItems:'flex-end', gap:4, height:72 }}>
            {histToShow.map((r, i) => {
              const h = Math.max((r / maxR) * 64, 3);
              const rTier = r >= 9 ? '#FFD700' : r >= 7.5 ? '#60FF90' : r >= 6 ? '#80C8FF' : r >= 4.5 ? '#FFB060' : '#FF6060';
              const isLast = i === histToShow.length - 1;
              return (
                <div key={i} style={{ flex:1, display:'flex', flexDirection:'column',
                  alignItems:'center', gap:2 }}>
                  <div style={{ fontFamily:'Rajdhani,monospace', fontSize:6,
                    color: isLast ? rTier : 'rgba(255,255,255,0.25)' }}>{r.toFixed(1)}</div>
                  <div style={{ width:'100%', height:h,
                    background: isLast ? `linear-gradient(180deg,${rTier},${rTier}66)` : `${rTier}55`,
                    borderRadius:'2px 2px 0 0' }} />
                </div>
              );
            })}
          </div>
          <div style={{ display:'flex', justifyContent:'space-between', marginTop:8 }}>
            <span style={{ fontFamily:'Rajdhani,monospace', fontSize:7, color:'rgba(255,255,255,0.25)' }}>
              Últimas {histToShow.length} partidas
            </span>
            {avgRating !== null && (
              <span style={{ fontFamily:'Rajdhani,monospace', fontSize:9, fontWeight:700,
                color:sc, letterSpacing:1 }}>
                Média: <span style={{ fontSize:13 }}>{avgRating}</span> / 10
              </span>
            )}
          </div>
          {/* Legenda de tiers */}
          <div style={{ display:'flex', gap:10, marginTop:8, flexWrap:'wrap' }}>
            {[['≥9.0','Excepcional','#FFD700'],['≥7.5','Dominante','#60FF90'],
              ['≥6.0','Sólido','#80C8FF'],['≥4.5','Regular','#FFB060'],['<4.5','Fraco','#FF6060']].map(([range,label,col]) => (
              <div key={label} style={{ display:'flex', alignItems:'center', gap:4 }}>
                <div style={{ width:6, height:6, borderRadius:1, background:col }} />
                <span style={{ fontFamily:'Rajdhani,monospace', fontSize:7,
                  color:'rgba(255,255,255,0.3)' }}>{range} {label}</span>
              </div>
            ))}
          </div>
        </div>
      </>)}

      {/* ── Visibilidade ── */}
      <Sh>Visibilidade Pública</Sh>
      <div style={{ display:'flex', gap:8, marginBottom:8 }}>
        <Gauge value={vis.score} color="#80C8FF" label="Visibilidade" sub={`${vis.score} / 100`} />
        <div style={{ flex:2, padding:'12px 14px', background:'rgba(255,255,255,0.03)',
          border:'1px solid rgba(255,255,255,0.07)' }}>
          <CompRow label="Menções na Mídia"  value={vis.components.news}        color="#80C8FF" />
          <CompRow label="Rivalidades Ativas" value={vis.components.rivalidades} color="#E040FB" />
          <CompRow label="Marcos Notáveis"   value={vis.components.milestones}  color="#FFD700" />
          <CompRow label="Identidade Quadra" value={vis.components.superficie}  color="#66BB6A" />
        </div>
      </div>

      {/* ── Marketability (referência cruzada) ── */}
      <Sh>Marketability</Sh>
      <div style={{ display:'flex', gap:8 }}>
        <Gauge value={mktScore} color="#C880FF" label="Marketability"
          sub={mktTier?.label ?? '—'} />
        <div style={{ flex:2, padding:'12px 14px', background:'rgba(255,255,255,0.03)',
          border:'1px solid rgba(255,255,255,0.07)', display:'flex', flexDirection:'column',
          justifyContent:'center', gap:4 }}>
          <div style={{ fontFamily:'Rajdhani,monospace', fontSize:8, color:'rgba(255,255,255,0.3)',
            letterSpacing:2, textTransform:'uppercase', marginBottom:4 }}>COMO O MERCADO TE VÊ</div>
          {/* Barra de tiers */}
          <div style={{ display:'flex', height:6, borderRadius:3, overflow:'hidden', gap:1 }}>
            {['NICHE','LOCAL','NACIONAL','GLOBAL','ICONE'].map((tier, i) => {
              const bounds = { NICHE:[0,20], LOCAL:[20,40], NACIONAL:[40,60], GLOBAL:[60,80], ICONE:[80,100] };
              const [lo, hi] = bounds[tier];
              const isActive = mktScore >= lo && mktScore < (hi === 100 ? 101 : hi);
              const colors   = { NICHE:'#555', LOCAL:'#888', NACIONAL:'#C880FF', GLOBAL:'#E040FB', ICONE:'#FFD700' };
              return (
                <div key={tier} style={{ flex:1, background: isActive ? colors[tier] : 'rgba(255,255,255,0.06)',
                  transition:'background .3s', display:'flex', alignItems:'center',
                  justifyContent:'center' }}>
                  {isActive && <div style={{ width:4, height:4, borderRadius:'50%',
                    background:'rgba(255,255,255,0.7)' }} />}
                </div>
              );
            })}
          </div>
          <div style={{ display:'flex', justifyContent:'space-between' }}>
            {['NICHE','LOCAL','NACIONAL','GLOBAL','ÍCONE'].map(t => (
              <span key={t} style={{ fontFamily:'Rajdhani,monospace', fontSize:6,
                color:'rgba(255,255,255,0.2)', letterSpacing:1, flex:1, textAlign:'center' }}>{t}</span>
            ))}
          </div>
          {/* Histórico de marketability */}
          {(np.personality?.marketability?.history ?? []).length > 0 && (
            <div style={{ display:'flex', gap:4, marginTop:8, alignItems:'flex-end', height:32 }}>
              {(np.personality.marketability.history ?? []).slice(-8).map((h, i) => {
                const hFrac = h.score / 100;
                return (
                  <div key={i} style={{ flex:1, display:'flex', flexDirection:'column',
                    alignItems:'center', gap:1 }}>
                    <div style={{ width:'100%', height:`${hFrac*28}px`,
                      background: h.delta >= 0 ? '#C880FF66' : '#FF606066',
                      borderRadius:'1px 1px 0 0', minHeight:2 }} />
                    <span style={{ fontFamily:'Rajdhani,monospace', fontSize:6,
                      color:'rgba(255,255,255,0.2)' }}>{h.year}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Histórico de ranking recente ── */}
      {rankHist.length >= 2 && (<>
        <Sh>Trajetória de Ranking</Sh>
        <div style={{ padding:'12px 14px', background:'rgba(255,255,255,0.03)',
          border:'1px solid rgba(255,255,255,0.07)' }}>
          <div style={{ display:'flex', gap:8, alignItems:'flex-end', height:56 }}>
            {rankHist.map((h, i) => {
              const rank    = h.rank ?? 200;
              const invFrac = Math.max(0, 1 - (rank - 1) / 200);
              const barH    = Math.max(invFrac * 48, 3);
              const delta   = i > 0 ? (rankHist[i-1].rank ?? 200) - rank : 0;
              const col     = delta > 0 ? '#60FF90' : delta < 0 ? '#FF6060' : sc;
              return (
                <div key={i} style={{ flex:1, display:'flex', flexDirection:'column',
                  alignItems:'center', gap:2 }}>
                  <span style={{ fontFamily:'Rajdhani,monospace', fontSize:7,
                    color:col, fontWeight:700 }}>#{rank}</span>
                  <div style={{ width:'100%', height:barH,
                    background:`linear-gradient(180deg,${col}cc,${col}44)`,
                    borderRadius:'2px 2px 0 0' }} />
                  <span style={{ fontFamily:'Rajdhani,monospace', fontSize:6,
                    color:'rgba(255,255,255,0.25)' }}>{h.year}</span>
                </div>
              );
            })}
          </div>
        </div>
      </>)}

    </div>
  );
}

// ── TabPatrocinio ─────────────────────────────────────────────────
function TabPatrocinio({ np, sc, sponsorPool, year, highestPaidPlayerId, pendingOffers }) {

  const [subTab, setSubTab] = React.useState('contratos');

  const profile = React.useMemo(() => {
    if (!sponsorPool) return null;
    try { return getSponsorshipProfile(sponsorPool, np); } catch { return null; }
  }, [sponsorPool, np]);

  const TIER_COLOR = { ELITE:'#FFD700', PREMIUM:'#60FF90', MID:'#60C8FF', ENTRY:'#8899AA' };
  const TIER_ICON  = { ELITE:'👑', PREMIUM:'⭐', MID:'🔵', ENTRY:'⚪' };
  const CONTRACT_TYPE_PT = { BASE:'Base', PERFORMANCE:'Performance', IMAGE:'Imagem',
    EQUIPMENT:'Equipamento', AMBASSADOR:'Embaixador', PROSPECT_DEAL:'Prospect' };
  const CAT_PT = { RACKET:'Raquetes', APPAREL:'Vestuário', LUXURY:'Luxo',
    FINANCE:'Financeiro', TECH:'Tecnologia', ENERGY:'Energia',
    AIRLINE:'Aérea', AUTOMOTIVE:'Automotivo', RETAIL:'Varejo', MEDIA:'Mídia' };
  const TERM_PT = { EXPIRED:'✓ Encerrado', SCANDAL:'⚠ Escândalo',
    PERFORMANCE_DROP:'📉 Performance', INJURY_LONG:'🩹 Lesão',
    RIVAL_ASCENDED:'⚔ Rival', BUDGET_CUT:'✂ Budget', RETIREMENT:'🌅 Aposentadoria', MUTUAL:'🤝 Mútua' };

  const Sh = ({ children }) => (
    <div style={{ fontFamily:T.cond, fontSize:13, fontWeight:700,
      letterSpacing:2, color:sc, textTransform:'uppercase',
      margin:'24px 0 12px', display:'flex', alignItems:'center', gap:8 }}>
      <div style={{ width:14, height:1, background:sc }} />
      {children}
      <div style={{ flex:1, height:1, background:'rgba(255,255,255,0.06)' }} />
    </div>
  );

  const SubBtn = ({ id, label }) => (
    <button onClick={() => setSubTab(id)} style={{
      fontFamily:T.mono, fontSize:9, fontWeight:700, letterSpacing:2,
      padding:'11px 16px', cursor:'pointer', border:'none', background:'none',
      color: subTab===id ? sc : 'rgba(237,232,223,.28)',
      borderBottom: subTab===id ? `2px solid ${sc}` : '2px solid transparent',
      textTransform:'uppercase', transition:'color .15s',
    }}>{label}</button>
  );

  if (!sponsorPool || !profile) {
    return (
      <div style={{ padding:'48px 24px', display:'flex', flexDirection:'column',
        alignItems:'center', gap:12, color:'rgba(237,232,223,.28)' }}>
        <div style={{ fontSize:40, opacity:.3 }}>🏷️</div>
        <div style={{ fontFamily:T.mono, fontSize:10, letterSpacing:3, textTransform:'uppercase' }}>
          Sistema de patrocínio não inicializado
        </div>
      </div>
    );
  }

  const isHighestPaid = np.id === highestPaidPlayerId;
  const playerOffers = (pendingOffers ?? []).filter(o => o.playerId === np.id);
  const activeContracts = profile.activeContracts ?? [];
  const archive = (sponsorPool.contractArchive ?? []).filter(c => c.playerId === np.id)
    .sort((a,b) => (b.terminatedYear??0)-(a.terminatedYear??0));

  const sponsorAnnual   = profile.totalActiveAnnual ?? 0;
  const prizeThisSeason = np.finance?.currentSeasonEarnings ?? 0;
  const totalIncome     = sponsorAnnual + prizeThisSeason;
  const sponsorPct      = totalIncome>0 ? Math.round((sponsorAnnual/totalIncome)*100) : 0;

  const mkt     = np.personality?.marketability?.score ?? 0;
  const signal  = np.phaseTwo?.sponsorSignal ?? 0;
  const ifr     = np.phaseTwo?.ifr ?? 0;
  const vis     = np.phaseTwo?.visibility ?? 0;
  const sigTier = getPhaseTwoTier(signal);

  return (
    <div style={{ display:'flex', flexDirection:'column', flex:1, overflow:'hidden', minHeight:0 }}>
      {/* Sub-tab bar */}
      <div style={{ display:'flex', borderBottom:`1px solid rgba(237,232,223,.07)`,
        background:T.bg2, flexShrink:0, padding:'0 16px' }}>
        <SubBtn id="contratos" label="🤝 Contratos" />
        <SubBtn id="sinal"     label="📡 Sinal" />
        <SubBtn id="historico" label="📋 Histórico" />
        {playerOffers.length > 0 && <SubBtn id="ofertas" label={`📨 Ofertas (${playerOffers.length})`} />}
      </div>

      <div className="upp2-scroll" style={{ flex:1, overflowY:'auto', padding:'4px 16px 32px' }}>

        {/* ── CONTRATOS ── */}
        {subTab==='contratos' && (<>

          {isHighestPaid && (
            <div style={{ margin:'12px 0 4px', padding:'10px 14px',
              background:'rgba(255,215,0,.06)', border:'1px solid rgba(255,215,0,.25)',
              display:'flex', alignItems:'center', gap:10 }}>
              <span style={{ fontSize:18 }}>💰</span>
              <div>
                <div style={{ fontFamily:'Rajdhani,monospace', fontSize:7, letterSpacing:3,
                  color:'rgba(255,215,0,.55)', textTransform:'uppercase' }}>Destaque do circuito</div>
                <div style={{ fontFamily:T.cond, fontSize:17, fontWeight:700,
                  color:'#FFD700', letterSpacing:1 }}>Jogador mais bem pago da temporada</div>
              </div>
            </div>
          )}

          {activeContracts.length === 0 && (
            <div style={{ padding:'40px 0', textAlign:'center',
              fontFamily:'Rajdhani,monospace', fontSize:9, letterSpacing:3,
              color:'rgba(237,232,223,.2)', textTransform:'uppercase' }}>
              {profile.totalContracts === 0 ? 'As marcas ainda não descobriram esse nome' : 'Sem contratos ativos'}
            </div>
          )}

          {activeContracts.map(c => {
            const tc = TIER_COLOR[c.tier] ?? '#8899AA';
            const seasonsLeft = c.duration - ((year??c.seasonSigned) - c.seasonSigned);
            const pct = Math.max(0, Math.min(100, (seasonsLeft/c.duration)*100));
            return (
              <div key={c.id} style={{ margin:'8px 0', padding:'14px',
                background:'rgba(255,255,255,.025)',
                border:`1px solid ${tc}22`, borderLeft:`3px solid ${tc}` }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <div style={{ fontSize:20, width:36, height:36, display:'flex', alignItems:'center',
                      justifyContent:'center', background:`${tc}0F`, border:`1px solid ${tc}22` }}>
                      {c.logo ?? '🏷️'}
                    </div>
                    <div>
                      <div style={{ fontFamily:T.cond, fontSize:19, fontWeight:700,
                        color:'rgba(237,232,223,.9)', letterSpacing:1 }}>{c.sponsorName}</div>
                      <div style={{ fontFamily:'Rajdhani,monospace', fontSize:7, letterSpacing:3,
                        color:tc, textTransform:'uppercase', marginTop:2 }}>
                        {TIER_ICON[c.tier]} {c.tier} · {CAT_PT[c.category]??c.category}
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <div style={{ fontFamily:T.cond, fontSize:28, fontWeight:700,
                      color:tc, lineHeight:1 }}>{formatUSD(c.annualFee)}</div>
                    <div style={{ fontFamily:'Rajdhani,monospace', fontSize:7, color:'rgba(237,232,223,.3)' }}>/ano</div>
                  </div>
                </div>
                <div style={{ display:'flex', gap:16, marginBottom:8 }}>
                  {[
                    { l:'Tipo',     v: CONTRACT_TYPE_PT[c.contractType]??c.contractType },
                    { l:'Início',   v: c.seasonSigned },
                    { l:'Duração',  v: `${c.duration}T` },
                    { l:'Restam',   v: `${seasonsLeft}T`, color: seasonsLeft<=1?'#FF9800':null },
                  ].map(d => (
                    <div key={d.l}>
                      <div style={{ fontFamily:'Rajdhani,monospace', fontSize:6, color:'rgba(237,232,223,.25)',
                        letterSpacing:3, textTransform:'uppercase' }}>{d.l}</div>
                      <div style={{ fontFamily:T.body, fontSize:13, marginTop:3,
                        color:d.color??'rgba(237,232,223,.55)' }}>{d.v}</div>
                    </div>
                  ))}
                </div>
                <div style={{ height:3, background:'rgba(255,255,255,.05)' }}>
                  <div style={{ height:'100%', width:`${pct}%`,
                    background: seasonsLeft<=1 ? 'linear-gradient(90deg,#FF9800,#FF6020)' : tc,
                    transition:'width .4s' }} />
                </div>
                {c.contractType==='PERFORMANCE' && c.bonuses && (
                  <div style={{ marginTop:8, padding:'6px 10px',
                    background:'rgba(255,215,0,.03)', border:'1px solid rgba(255,215,0,.1)' }}>
                    <div style={{ fontFamily:'Rajdhani,monospace', fontSize:6, letterSpacing:3,
                      color:'rgba(255,215,0,.4)', textTransform:'uppercase', marginBottom:4 }}>Bônus</div>
                    <div style={{ display:'flex', flexWrap:'wrap', gap:5 }}>
                      {Object.entries(c.bonuses).map(([k,v]) => (
                        <span key={k} style={{ fontFamily:'Rajdhani,monospace', fontSize:8,
                          color:'rgba(255,215,0,.65)', background:'rgba(255,215,0,.05)',
                          border:'1px solid rgba(255,215,0,.15)', padding:'1px 5px' }}>
                          {k.replace(/_/g,' ')}: +{formatUSD(v)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {c.contractType==='PROSPECT_DEAL' && (
                  <div style={{ marginTop:8, padding:'6px 10px',
                    background:'rgba(96,255,144,.03)', border:'1px solid rgba(96,255,144,.1)' }}>
                    <div style={{ fontFamily:'Rajdhani,monospace', fontSize:6, letterSpacing:3,
                      color:'rgba(96,255,144,.4)', textTransform:'uppercase', marginBottom:4 }}>Escada</div>
                    <div style={{ display:'flex', gap:6 }}>
                      {[
                        { l:'Top 50', u:c._top50Unlocked },
                        { l:'Top 10', u:c._top10Unlocked },
                        { l:'Top 5',  u:c._top5Unlocked  },
                      ].map(t => (
                        <span key={t.l} style={{ fontFamily:'Rajdhani,monospace', fontSize:8,
                          color: t.u?'#60FF90':'rgba(96,255,144,.35)',
                          padding:'1px 6px',
                          border:`1px solid ${t.u?'rgba(96,255,144,.35)':'rgba(96,255,144,.1)'}` }}>
                          {t.u?'✓ ':''}{t.l}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Composição de renda */}
          {activeContracts.length > 0 && totalIncome > 0 && (<>
            <Sh>Composição de Renda</Sh>
            <div style={{ display:'flex', gap:8, marginBottom:8 }}>
              {[
                { l:'Patrocínio/ano', v:formatUSD(sponsorAnnual),   color:sc        },
                { l:'Prize Money',   v:formatUSD(prizeThisSeason),  color:'#60C8FF' },
              ].map(d => (
                <div key={d.l} style={{ flex:1, padding:'10px 14px',
                  background:'rgba(255,255,255,.03)', border:'1px solid rgba(255,255,255,.07)' }}>
                  <div style={{ fontFamily:'Rajdhani,monospace', fontSize:7, letterSpacing:3,
                    color:'rgba(237,232,223,.25)', textTransform:'uppercase' }}>{d.l}</div>
                  <div style={{ fontFamily:'Rajdhani,monospace', fontSize:20, fontWeight:900,
                    color:d.color, lineHeight:1, marginTop:3 }}>{d.v}</div>
                </div>
              ))}
            </div>
            <div style={{ height:8, display:'flex', overflow:'hidden', marginBottom:6 }}>
              <div style={{ width:`${sponsorPct}%`, background:sc, transition:'width .5s' }} />
              <div style={{ flex:1, background:'#60C8FF' }} />
            </div>
            <div style={{ display:'flex', justifyContent:'space-between',
              fontFamily:'Rajdhani,monospace', fontSize:8 }}>
              <span style={{ color:sc }}>{sponsorPct}% marcas</span>
              <span style={{ color:'#60C8FF' }}>{100-sponsorPct}% quadra</span>
            </div>
          </>)}

          {/* Recordes pessoais */}
          {profile.biggestContract && (
            <div style={{ marginTop:10, padding:'10px 14px',
              background:'rgba(255,215,0,.04)', border:'1px solid rgba(255,215,0,.15)',
              display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div>
                <div style={{ fontFamily:'Rajdhani,monospace', fontSize:7, letterSpacing:3,
                  color:'rgba(255,215,0,.4)', textTransform:'uppercase', marginBottom:3 }}>
                  Maior contrato da carreira
                </div>
                <div style={{ fontFamily:'Rajdhani,monospace', fontSize:12,
                  color:'rgba(237,232,223,.55)' }}>
                  {profile.biggestContract.sponsorName} · {profile.biggestContract.year}
                </div>
              </div>
              <div style={{ fontFamily:'Rajdhani,monospace', fontSize:20, fontWeight:900, color:'#FFD700' }}>
                {formatUSD(profile.biggestContract.annualFee)}
              </div>
            </div>
          )}
        </>)}

        {/* ── SINAL ── */}
        {subTab==='sinal' && (<>
          <div style={{ marginTop:12, padding:'14px',
            background:'rgba(255,255,255,.025)',
            border:`1px solid ${sigTier.color??sc}22`,
            borderLeft:`3px solid ${sigTier.color??sc}` }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12 }}>
              <div>
                <div style={{ fontFamily:'Rajdhani,monospace', fontSize:7, letterSpacing:3,
                  color:`${sigTier.color??sc}66`, textTransform:'uppercase', marginBottom:3 }}>
                  Sinal para Patrocinadores
                </div>
                <div style={{ fontFamily:T.cond, fontSize:18, fontWeight:700,
                  color:sigTier.color??sc, letterSpacing:1, textTransform:'uppercase' }}>
                  {sigTier.label??'—'}
                </div>
              </div>
              <div style={{ fontFamily:'Rajdhani,monospace', fontSize:44, fontWeight:900,
                color:sigTier.color??sc, lineHeight:1 }}>{signal}</div>
            </div>
            <div style={{ height:4, background:'rgba(255,255,255,.05)', marginBottom:12 }}>
              <div style={{ height:'100%', width:`${signal}%`, background:sigTier.color??sc, transition:'width .5s' }} />
            </div>
            {[
              { l:'Marketability', v:mkt, w:'40%', color:sc          },
              { l:'Forma Recente', v:ifr, w:'35%', color:sigTier.color??sc },
              { l:'Visibilidade',  v:vis, w:'25%', color:'#AB47BC'    },
            ].map(b => (
              <div key={b.l} style={{ marginBottom:8 }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
                  <span style={{ fontFamily:'Rajdhani,monospace', fontSize:7,
                    color:'rgba(237,232,223,.3)', letterSpacing:2, textTransform:'uppercase' }}>{b.l}</span>
                  <span style={{ fontFamily:'Rajdhani,monospace', fontSize:8, color:b.color }}>
                    {b.v} <span style={{ color:'rgba(237,232,223,.25)', fontSize:7 }}>({b.w})</span>
                  </span>
                </div>
                <div style={{ height:3, background:'rgba(255,255,255,.05)' }}>
                  <div style={{ height:'100%', width:`${b.v}%`,
                    background:`linear-gradient(90deg,${b.color}55,${b.color})`, transition:'width .5s' }} />
                </div>
              </div>
            ))}
          </div>

          <Sh>Elegibilidade por Tier</Sh>
          {Object.entries(SPONSOR_TIERS).reverse().map(([tierId, tierData]) => {
            const tc = TIER_COLOR[tierId] ?? '#8899AA';
            const accessible = mkt >= tierData.minMarket;
            return (
              <div key={tierId} style={{ display:'flex', alignItems:'center', gap:10,
                padding:'7px 10px', marginBottom:4,
                background: accessible?`${tc}07`:'transparent',
                border:`1px solid ${accessible?tc+'22':'rgba(237,232,223,.07)'}`,
                opacity: accessible ? 1 : .4 }}>
                <span style={{ fontSize:13 }}>{TIER_ICON[tierId]??'⚪'}</span>
                <span style={{ fontFamily:'Rajdhani,monospace', fontWeight:900, fontSize:12,
                  color:tc, flex:1, letterSpacing:1 }}>{tierId}</span>
                <span style={{ fontFamily:'Rajdhani,monospace', fontSize:8,
                  color: accessible?tc:'rgba(237,232,223,.25)' }}>
                  {accessible ? '✓ Elegível' : `Mín. ${tierData.minMarket}`}
                </span>
                <span style={{ fontFamily:'Rajdhani,monospace', fontSize:7, color:'rgba(237,232,223,.25)' }}>
                  {formatUSD(tierData.contractRange?.[0])}–{formatUSD(tierData.contractRange?.[1])}/ano
                </span>
              </div>
            );
          })}
        </>)}

        {/* ── HISTÓRICO ── */}
        {subTab==='historico' && (<>
          <Sh>Contratos Encerrados</Sh>
          {archive.length === 0 && (
            <div style={{ padding:'32px 0', textAlign:'center',
              fontFamily:'Rajdhani,monospace', fontSize:9, letterSpacing:3,
              color:'rgba(237,232,223,.2)', textTransform:'uppercase' }}>
              Nenhum contrato encerrado
            </div>
          )}
          {archive.map((c, i) => {
            const tc = TIER_COLOR[c.sponsorTier] ?? '#8899AA';
            const reason = TERM_PT[c.terminationReason] ?? 'Encerrado';
            return (
              <div key={c.id??i} style={{ display:'flex', alignItems:'center', gap:10,
                padding:'9px 12px', marginBottom:3,
                background:'rgba(255,255,255,.015)',
                border:`1px solid rgba(255,255,255,.06)` }}>
                <span style={{ fontSize:16, opacity:.7 }}>{c.logo??'🏷️'}</span>
                <div style={{ flex:1 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                    <span style={{ fontFamily:'Rajdhani,monospace', fontWeight:900,
                      fontSize:13, color:'rgba(237,232,223,.85)' }}>{c.sponsorName}</span>
                    <span style={{ fontFamily:'Rajdhani,monospace', fontSize:6, letterSpacing:3,
                      color:tc, textTransform:'uppercase' }}>{c.sponsorTier}</span>
                  </div>
                  <div style={{ fontFamily:'Rajdhani,monospace', fontSize:7,
                    color:'rgba(237,232,223,.3)', marginTop:2 }}>
                    {c.seasonSigned} → {c.terminatedYear??c.seasonSigned+(c.duration??1)-1} · {reason}
                  </div>
                </div>
                <div style={{ fontFamily:'Rajdhani,monospace', fontWeight:900,
                  fontSize:13, color:tc }}>
                  {formatUSD(c.annualFee)}<span style={{ fontSize:8, color:'rgba(237,232,223,.3)' }}>/ano</span>
                </div>
              </div>
            );
          })}
        </>)}

        {/* ── OFERTAS ── */}
        {subTab==='ofertas' && (<>
          <Sh>Ofertas Recentes</Sh>
          {playerOffers.length === 0 && (
            <div style={{ padding:'32px 0', textAlign:'center',
              fontFamily:'Rajdhani,monospace', fontSize:9, letterSpacing:3,
              color:'rgba(237,232,223,.2)', textTransform:'uppercase' }}>
              Nenhuma oferta pendente
            </div>
          )}
          {playerOffers.sort((a,b)=>b.annualFee-a.annualFee).map((o,i) => {
            const tc = TIER_COLOR[o.sponsorTier] ?? '#8899AA';
            return (
              <div key={o.id??i} style={{ display:'flex', alignItems:'center', gap:12,
                padding:'11px 13px', marginBottom:5,
                background:'rgba(255,255,255,.025)',
                border:`1px dashed ${tc}44` }}>
                <span style={{ fontSize:20 }}>{o.logo??'🏷️'}</span>
                <div style={{ flex:1 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <span style={{ fontFamily:'Rajdhani,monospace', fontWeight:900,
                      fontSize:13, color:'rgba(237,232,223,.9)' }}>{o.sponsorName}</span>
                    <span style={{ fontFamily:'Rajdhani,monospace', fontSize:6, letterSpacing:3,
                      color:tc, textTransform:'uppercase' }}>{o.sponsorTier}</span>
                  </div>
                  {o.reasons?.[0] && (
                    <div style={{ fontFamily:'Rajdhani,monospace', fontSize:8,
                      color:'rgba(237,232,223,.3)', marginTop:3, fontStyle:'italic' }}>
                      {o.reasons[0]}
                    </div>
                  )}
                </div>
                <div style={{ textAlign:'right' }}>
                  <div style={{ fontFamily:'Rajdhani,monospace', fontWeight:900,
                    fontSize:18, color:tc }}>{formatUSD(o.annualFee)}</div>
                  <div style={{ fontFamily:'Rajdhani,monospace', fontSize:7,
                    color:'rgba(237,232,223,.25)' }}>{o.duration}T</div>
                </div>
              </div>
            );
          })}
        </>)}

      </div>
    </div>
  );
}


// ─────────────────────────────────────────────────────────────────
// TAB VIDA — Vida fora da quadra
// ─────────────────────────────────────────────────────────────────
const CAT_META = {
  PERSONAL:    { label: 'Pessoal',       color: '#F472B6', icon: '❤️'  },
  HOME:        { label: 'Residência',    color: '#60A5FA', icon: '🏠'  },
  SOCIAL:      { label: 'Social',        color: '#34D399', icon: '🤝'  },
  BUSINESS:    { label: 'Negócios',      color: '#FBBF24', icon: '💼'  },
  MEDIA:       { label: 'Mídia',         color: '#C084FC', icon: '📺'  },
  CONTROVERSY: { label: 'Polêmica',      color: '#F87171', icon: '⚡'  },
  COMMUNITY:   { label: 'Comunidade',    color: '#86EFAC', icon: '🏅'  },
  SPIRITUAL:   { label: 'Espiritual',    color: '#FDE68A', icon: '🧘'  },
};

const REL_META = {
  SINGLE:    { label: 'Solteiro',   color: '#94A3B8' },
  DATING:    { label: 'Namorando',  color: '#F472B6' },
  ENGAGED:   { label: 'Noivo',      color: '#FB923C' },
  MARRIED:   { label: 'Casado',     color: '#34D399' },
  SEPARATED: { label: 'Separado',   color: '#FBBF24' },
  DIVORCED:  { label: 'Divorciado', color: '#F87171' },
};

const WEALTH_META = {
  BILLIONAIRE_TIER: { label: 'Ultra-riqueza', color: '#FFD700', icon: '👑' },
  VERY_WEALTHY:     { label: 'Muito rico',    color: '#A3E635', icon: '💎' },
  WEALTHY:          { label: 'Rico',          color: '#60A5FA', icon: '💰' },
  COMFORTABLE:      { label: 'Confortável',   color: '#94A3B8', icon: '🪙' },
  DEVELOPING:       { label: 'Em construção', color: '#6B7280', icon: '🏗️' },
};

const PUB_IMG_META = {
  GLOBETROTTER: { color: '#60A5FA', icon: '✈️'  },
  HOMEBODY:     { color: '#94A3B8', icon: '🏡'  },
  SOCIALITE:    { color: '#F472B6', icon: '🥂'  },
  ACTIVIST:     { color: '#34D399', icon: '✊'  },
  ENTREPRENEUR: { color: '#FBBF24', icon: '📈'  },
  FAMILY_FIRST: { color: '#FB923C', icon: '👨‍👩‍👧'  },
  MEDIA_DARLING:{ color: '#C084FC', icon: '📸'  },
  LOW_PROFILE:  { color: '#6B7280', icon: '🤫'  },
};

function VidaSection({ title, color, children }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{
        fontFamily: T.mono, fontSize: 7, letterSpacing: '.38em',
        color: `${color ?? 'rgba(237,232,223,.3)'}99`,
        textTransform: 'uppercase', marginBottom: 8,
        display: 'flex', alignItems: 'center', gap: 6,
      }}>
        <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg, ${color ?? 'rgba(237,232,223,.1)'}44, transparent)` }} />
        {title}
      </div>
      {children}
    </div>
  );
}

function VidaCard({ children, accent, style: sx }) {
  return (
    <div style={{
      border: `1px solid ${accent ?? 'rgba(237,232,223,.07)'}28`,
      borderLeft: `2px solid ${accent ?? 'rgba(237,232,223,.15)'}`,
      background: 'rgba(0,0,0,.18)',
      padding: '12px 14px',
      ...sx,
    }}>
      {children}
    </div>
  );
}

function EventRow({ event }) {
  const meta = CAT_META[event.category] ?? { color: '#94A3B8', icon: '•' };
  const impact = event.marketImpact ?? 0;
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 8,
      padding: '8px 0', borderBottom: '1px solid rgba(237,232,223,.04)',
    }}>
      <div style={{
        flexShrink: 0, width: 24, height: 24,
        background: `${meta.color}14`,
        border: `1px solid ${meta.color}28`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 10, borderRadius: 2,
      }}>{event.icon ?? meta.icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 2 }}>
          <span style={{ fontFamily: T.mono, fontSize: 7, color: meta.color, letterSpacing: '.2em', textTransform: 'uppercase' }}>
            {meta.label}
          </span>
          <span style={{ fontFamily: T.mono, fontSize: 7, color: 'rgba(237,232,223,.2)' }}>
            {event.season}
          </span>
          {impact !== 0 && (
            <span style={{
              fontFamily: T.mono, fontSize: 6,
              color: impact > 0 ? '#34D399' : '#F87171',
              marginLeft: 'auto',
            }}>
              {impact > 0 ? `+${impact}` : impact} mkt
            </span>
          )}
        </div>
        <p style={{
          fontFamily: T.body, fontSize: 11, color: 'rgba(237,232,223,.62)',
          lineHeight: 1.5, margin: 0,
        }}>{event.description}</p>
      </div>
    </div>
  );
}

function TabVida({ np, sc }) {
  const [logFilter, setLogFilter] = React.useState('ALL');
  const ld = np.lifeData;
  const log = (np.lifeEventLog ?? []).slice().reverse(); // mais recentes primeiro

  if (!ld) return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ fontFamily: T.mono, fontSize: 9, letterSpacing: 4, color: 'rgba(237,232,223,.2)', textTransform: 'uppercase' }}>
        Dados de vida não gerados
      </div>
    </div>
  );

  const relStatus = ld.personal?.relationshipStatus;
  const relMeta   = REL_META[relStatus?.id] ?? { label: relStatus?.label ?? '—', color: '#94A3B8' };
  const partner   = ld.personal?.partner;
  const children  = ld.personal?.children;
  const wealthTier = ld.wealth?.tier;
  const wealthMeta = WEALTH_META[wealthTier?.id] ?? WEALTH_META.COMFORTABLE;
  const pubImg    = ld.publicImage;
  const pubMeta   = PUB_IMG_META[pubImg?.id] ?? { color: sc, icon: '🌐' };
  const offCourt  = ld.offCourt ?? getOffCourtState(np);
  const offCourtEffects = Object.entries(offCourt.effects ?? {}).filter(([, value]) => Number(value) !== 0);

  // Categorias presentes no log
  const logCats = [...new Set(log.map(e => e.category))];

  const filteredLog = logFilter === 'ALL' ? log
    : log.filter(e => e.category === logFilter);

  return (
    <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>

      {/* ── LEFT — dados estáticos ── */}
      <div className="upp2-scroll" style={{ flex: 1, padding: '20px 22px', borderRight: '1px solid rgba(237,232,223,.06)' }}>

        {/* RELAÇÃO E FAMÍLIA */}
        <VidaSection title="Fase Atual" color={sc}>
          <VidaCard accent={sc}>
            <div style={{ display: 'grid', gridTemplateColumns: '1.35fr .95fr', gap: 14 }}>
              <div>
                <div style={{ fontFamily: T.mono, fontSize: 7, color: `${sc}88`, letterSpacing: '.3em', textTransform: 'uppercase', marginBottom: 4 }}>Arco fora da quadra</div>
                <div style={{ fontFamily: T.cond, fontWeight: 700, fontSize: 22, color: sc, textTransform: 'uppercase', letterSpacing: '.04em', lineHeight: 1 }}>
                  {offCourt.arcLabel}
                </div>
                <p style={{ fontFamily: T.body, fontSize: 12, color: 'rgba(237,232,223,.82)', lineHeight: 1.55, margin: '8px 0 0' }}>
                  {offCourt.headline}
                </p>
                <p style={{ fontFamily: T.body, fontSize: 11, color: 'rgba(237,232,223,.48)', lineHeight: 1.65, margin: '8px 0 0' }}>
                  {offCourt.summary}
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, alignContent: 'start' }}>
                {[
                  ['Estabilidade', offCourt.stability, offCourt.stabilityLabel, '#60A5FA'],
                  ['Pressão pública', offCourt.publicPressure, offCourt.pressureLabel, '#F97316'],
                  ['Disciplina', offCourt.discipline, offCourt.disciplineLabel, '#34D399'],
                  ['Burnout', offCourt.burnoutRisk, offCourt.burnoutLabel, '#F43F5E'],
                  ['Rede de apoio', offCourt.supportNetwork, offCourt.supportLabel, '#A78BFA'],
                  ['Crescimento', offCourt.growth, `${offCourt.growth}/100`, '#E8C84A'],
                ].map(([label, value, text, color]) => (
                  <div key={label} style={{ padding: '8px 9px', border: '1px solid rgba(237,232,223,.06)', background: 'rgba(255,255,255,.015)' }}>
                    <div style={{ fontFamily: T.mono, fontSize: 6, color: `${color}99`, letterSpacing: '.28em', textTransform: 'uppercase', marginBottom: 4 }}>{label}</div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                      <span style={{ fontFamily: T.display, fontSize: 28, color, lineHeight: .9 }}>{value}</span>
                      <span style={{ fontFamily: T.body, fontSize: 10, color: 'rgba(237,232,223,.5)' }}>{text}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {offCourtEffects.length > 0 && (
              <div style={{ marginTop: 14, paddingTop: 10, borderTop: '1px solid rgba(237,232,223,.05)' }}>
                <div style={{ fontFamily: T.mono, fontSize: 7, color: 'rgba(237,232,223,.28)', letterSpacing: '.28em', textTransform: 'uppercase', marginBottom: 6 }}>
                  Efeitos atuais na carreira
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {offCourtEffects.map(([attr, value]) => {
                    const positive = value > 0;
                    const color = positive ? '#34D399' : '#F87171';
                    return (
                      <span key={attr} style={{
                        fontFamily: T.mono, fontSize: 8, padding: '3px 8px',
                        background: `${color}12`, border: `1px solid ${color}33`, color,
                        letterSpacing: '.16em', textTransform: 'uppercase',
                      }}>
                        {attr} {positive ? `+${value}` : value}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
          </VidaCard>
        </VidaSection>

        <VidaSection title="Vida Pessoal" color={relMeta.color}>
          <VidaCard accent={relMeta.color}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div>
                <div style={{ fontFamily: T.mono, fontSize: 7, color: `${relMeta.color}88`, letterSpacing: '.3em', textTransform: 'uppercase', marginBottom: 3 }}>Status</div>
                <div style={{ fontFamily: T.cond, fontWeight: 700, fontSize: 20, color: relMeta.color, textTransform: 'uppercase', letterSpacing: '.04em' }}>
                  {relMeta.label}
                </div>
              </div>
              {children?.has && (
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: T.mono, fontSize: 7, color: 'rgba(237,232,223,.3)', letterSpacing: '.28em', textTransform: 'uppercase', marginBottom: 3 }}>Filhos</div>
                  <div style={{ fontFamily: T.display, fontSize: 32, color: '#FB923C', lineHeight: 1 }}>{children.count}</div>
                </div>
              )}
            </div>
            {partner && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 0', borderTop: '1px solid rgba(237,232,223,.05)' }}>
                <span style={{ fontFamily: T.mono, fontSize: 7, color: 'rgba(237,232,223,.25)', letterSpacing: '.28em', textTransform: 'uppercase' }}>Parceiro(a)</span>
                <span style={{ fontFamily: T.cond, fontSize: 13, color: partner.public ? relMeta.color : 'rgba(237,232,223,.4)', marginLeft: 'auto' }}>
                  {partner.public
                    ? (partner.name ? `${partner.name} · ${partner.label}` : partner.label)
                    : '— privado —'}
                </span>
              </div>
            )}
          </VidaCard>
        </VidaSection>

        {/* RESIDÊNCIA */}
        <VidaSection title="Residência" color="#60A5FA">
          <VidaCard accent="#60A5FA">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontFamily: T.mono, fontSize: 7, color: 'rgba(96,165,250,.6)', letterSpacing: '.3em', textTransform: 'uppercase', marginBottom: 3 }}>Base atual</div>
                <div style={{ fontFamily: T.cond, fontWeight: 700, fontSize: 16, color: '#EDE8DF' }}>
                  {ld.home?.city ? `${ld.home.city}, ${ld.home.country}` : ld.home?.country ?? '—'}
                </div>
              </div>
              {ld.home?.taxHaven && (
                <span style={{ fontFamily: T.mono, fontSize: 7, padding: '3px 7px', background: 'rgba(251,191,36,.1)', border: '1px solid rgba(251,191,36,.25)', color: '#FBBF24', letterSpacing: '.2em', textTransform: 'uppercase' }}>
                  Paraíso Fiscal
                </span>
              )}
            </div>
          </VidaCard>
        </VidaSection>

        {/* INTERESSES */}
        <VidaSection title="Interesses" color="#A78BFA">
          <VidaCard accent="#A78BFA">
            {ld.interests?.hobbies?.length > 0 && (
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontFamily: T.mono, fontSize: 7, color: 'rgba(167,139,250,.6)', letterSpacing: '.3em', textTransform: 'uppercase', marginBottom: 6 }}>Hobbies</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {ld.interests.hobbies.map((h, i) => (
                    <span key={i} style={{ fontFamily: T.mono, fontSize: 8, padding: '2px 8px', background: 'rgba(167,139,250,.08)', border: '1px solid rgba(167,139,250,.22)', color: '#A78BFA' }}>
                      {h.label}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {ld.interests?.languages?.length > 0 && (
              <div>
                <div style={{ fontFamily: T.mono, fontSize: 7, color: 'rgba(167,139,250,.6)', letterSpacing: '.3em', textTransform: 'uppercase', marginBottom: 6 }}>Idiomas</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {ld.interests.languages.map((l, i) => {
                    const langStr   = typeof l === 'string' ? l : (l.lang ?? '');
                    const fluencyStr= typeof l === 'object' && l.fluency ? ` · ${l.fluency.label ?? l.fluency}` : '';
                    return (
                      <span key={i} style={{ fontFamily: T.mono, fontSize: 8, padding: '2px 8px', background: 'rgba(167,139,250,.05)', border: '1px solid rgba(167,139,250,.14)', color: 'rgba(167,139,250,.7)' }}>
                        {langStr}{fluencyStr}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
          </VidaCard>
        </VidaSection>

        {/* CAUSA SOCIAL */}
        {ld.values?.socialCause?.id && ld.values.socialCause.id !== 'NONE' && (
          <VidaSection title="Causa Social" color="#34D399">
            <VidaCard accent="#34D399">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 18 }}>{ld.values.socialCause.icon}</span>
                <div>
                  <div style={{ fontFamily: T.cond, fontWeight: 700, fontSize: 14, color: '#34D399' }}>
                    {ld.values.socialCause.label}
                  </div>
                  {hasEventOccurred(np, 'FOUNDATION_LAUNCH') && (
                    <div style={{ fontFamily: T.mono, fontSize: 7, color: 'rgba(52,211,153,.6)', letterSpacing: '.25em', marginTop: 2, textTransform: 'uppercase' }}>
                      Fundação ativa
                    </div>
                  )}
                </div>
              </div>
            </VidaCard>
          </VidaSection>
        )}
      </div>

      {/* ── RIGHT — riqueza + imagem + log ── */}
      <div className="upp2-scroll" style={{ width: 'clamp(240px,30vw,320px)', flexShrink: 0, padding: '20px 18px', background: 'rgba(0,0,0,.14)' }}>

        {/* RIQUEZA */}
        <VidaSection title="Patrimônio" color={wealthMeta.color}>
          <VidaCard accent={wealthMeta.color}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div>
                <div style={{ fontFamily: T.mono, fontSize: 7, color: `${wealthMeta.color}88`, letterSpacing: '.3em', textTransform: 'uppercase', marginBottom: 3 }}>Tier</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ fontSize: 14 }}>{wealthMeta.icon}</span>
                  <span style={{ fontFamily: T.cond, fontWeight: 700, fontSize: 15, color: wealthMeta.color, textTransform: 'uppercase' }}>{wealthMeta.label}</span>
                </div>
              </div>
              <div style={{ fontFamily: T.mono, fontSize: 8, color: 'rgba(237,232,223,.3)', textAlign: 'right' }}>{wealthTier?.range}</div>
            </div>
            {(ld.wealth?.vehicles?.length > 0 || ld.wealth?.possessions?.length > 0) && (
              <div>
                <div style={{ fontFamily: T.mono, fontSize: 7, color: `${wealthMeta.color}55`, letterSpacing: '.28em', textTransform: 'uppercase', marginBottom: 6 }}>
                  {ld.wealth?.vehicles?.length > 0 ? 'Veículos' : 'Posses'}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  {(ld.wealth?.vehicles ?? ld.wealth?.possessions ?? []).map((p, i) => {
                    const label = typeof p === 'string' ? p : (p.label ?? p.brand ?? JSON.stringify(p));
                    return (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <div style={{ width: 3, height: 3, borderRadius: '50%', background: `${wealthMeta.color}66`, flexShrink: 0 }} />
                        <span style={{ fontFamily: T.body, fontSize: 11, color: 'rgba(237,232,223,.5)' }}>{label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </VidaCard>
        </VidaSection>

        {/* IMAGEM PÚBLICA */}
        <VidaSection title="Imagem Pública" color={pubMeta.color}>
          <VidaCard accent={pubMeta.color}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 16 }}>{pubMeta.icon}</span>
              <span style={{ fontFamily: T.cond, fontWeight: 700, fontSize: 15, color: pubMeta.color, textTransform: 'uppercase' }}>{pubImg?.label}</span>
            </div>
            {pubImg?.desc && (
              <p style={{ fontFamily: T.body, fontSize: 11, color: 'rgba(237,232,223,.45)', lineHeight: 1.6, margin: 0 }}>{pubImg.desc}</p>
            )}
          </VidaCard>
        </VidaSection>

        {/* LOG DE EVENTOS */}
        <VidaSection title="Linha do Tempo" color={sc}>
          {/* Filtro por categoria */}
          {logCats.length > 1 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginBottom: 8 }}>
              <button
                onClick={() => setLogFilter('ALL')}
                style={{
                  fontFamily: T.mono, fontSize: 6, padding: '2px 6px', cursor: 'pointer', border: 'none',
                  background: logFilter === 'ALL' ? `${sc}22` : 'transparent',
                  color: logFilter === 'ALL' ? sc : 'rgba(237,232,223,.3)',
                  borderBottom: logFilter === 'ALL' ? `1px solid ${sc}` : '1px solid transparent',
                  letterSpacing: '.2em', textTransform: 'uppercase',
                }}>
                Todos ({log.length})
              </button>
              {logCats.map(cat => {
                const m = CAT_META[cat] ?? { label: cat, color: '#94A3B8' };
                const count = log.filter(e => e.category === cat).length;
                return (
                  <button key={cat}
                    onClick={() => setLogFilter(cat)}
                    style={{
                      fontFamily: T.mono, fontSize: 6, padding: '2px 6px', cursor: 'pointer', border: 'none',
                      background: logFilter === cat ? `${m.color}22` : 'transparent',
                      color: logFilter === cat ? m.color : 'rgba(237,232,223,.25)',
                      borderBottom: logFilter === cat ? `1px solid ${m.color}` : '1px solid transparent',
                      letterSpacing: '.2em', textTransform: 'uppercase',
                    }}>
                    {m.icon} {count}
                  </button>
                );
              })}
            </div>
          )}

          {filteredLog.length === 0 ? (
            <div style={{ fontFamily: T.mono, fontSize: 8, color: 'rgba(237,232,223,.2)', textAlign: 'center', padding: '20px 0', letterSpacing: '.3em', textTransform: 'uppercase' }}>
              Nenhum evento registrado
            </div>
          ) : (
            <div>
              {filteredLog.map((event, i) => <EventRow key={i} event={event} />)}
            </div>
          )}
        </VidaSection>
      </div>
    </div>
  );
}

function hasEventOccurred(player, typeId) {
  return (player.lifeEventLog ?? []).some(e => e.type === typeId);
}

// ─────────────────────────────────────────────────────────────────
// TAB ENTREVISTAS
// ─────────────────────────────────────────────────────────────────

const TONE_META_UPP = {
  warm_open:           { label: 'Carismático',  color: '#E8C84A', icon: '😄' },
  brief_professional:  { label: 'Reservado',    color: '#90A4AE', icon: '🧊' },
  direct_provocative:  { label: 'Confrontador', color: '#EF5350', icon: '🔥' },
  theatrical_warm:     { label: 'Showman',      color: '#AB47BC', icon: '🎭' },
  measured_safe:       { label: 'Diplomático',  color: '#4A90D9', icon: '🤝' },
  sparse_deep:         { label: 'Enigmático',   color: '#78909C', icon: '🌑' },
  analytical_profound: { label: 'Intelectual',  color: '#26C6DA', icon: '🔬' },
};

function TabEntrevistas({ np, sc, rivalrySystem, allPlayers, tournamentResults }) {
  const [selectedContext, setSelectedContext] = React.useState('POST_WIN');
  const [interview,       setInterview]       = React.useState(null);
  const [generating,      setGenerating]      = React.useState(false);
  const [questionCount,   setQuestionCount]   = React.useState(5);
  const [openIdx,         setOpenIdx]         = React.useState(null);

  const tone = np?.personality?.pressPersona?.interviewTone ?? 'measured_safe';
  const tm   = TONE_META_UPP[tone] ?? TONE_META_UPP.measured_safe;

  // Último torneio para contexto
  const lastResult = React.useMemo(() => {
    if (!tournamentResults) return null;
    const results = Object.values(tournamentResults);
    return results.length ? results[results.length - 1] : null;
  }, [tournamentResults]);

  const lastTournamentName = lastResult?.tournament?.name ?? null;
  const lastSurface        = lastResult?.tournament?.surface ?? null;

  const handleGenerate = () => {
    setGenerating(true);
    setOpenIdx(null);
    const params = {};
    if (lastTournamentName) params.tournament = lastTournamentName;
    if (lastSurface)        params.surface    = lastSurface;
    setTimeout(() => {
      const iv = generateInterview(np, selectedContext, { rivalrySystem, players: allPlayers }, params, questionCount);
      setInterview(iv);
      setGenerating(false);
      setOpenIdx(0);
    }, 160);
  };

  return (
    <div>
      {/* ── Tom do jogador ─────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
        background: `${tm.color}0C`, border: `1px solid ${tm.color}28`,
        marginBottom: 14,
      }}>
        <span style={{ fontSize: 16 }}>{tm.icon}</span>
        <div>
          <div style={{ fontFamily: T.mono, fontSize: 7, letterSpacing: '.32em', color: `${tm.color}88`, textTransform: 'uppercase' }}>
            Tom de entrevista
          </div>
          <div style={{ fontFamily: T.cond, fontSize: 16, fontWeight: 700, color: tm.color, letterSpacing: '.06em' }}>
            {tm.label}
          </div>
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ fontFamily: T.body, fontSize: 12, color: T.inkDim, lineHeight: 1.5, textAlign: 'right', maxWidth: 420 }}>
          {np?.personality?.pressPersona?.description?.slice(0, 80) ?? ''}…
        </div>
      </div>

      {/* ── Controles ──────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, marginBottom: 14 }}>

        {/* Contexto */}
        <div>
          <div style={{ fontFamily: T.mono, fontSize: 7, letterSpacing: '.32em', color: T.faint, textTransform: 'uppercase', marginBottom: 7 }}>
            Contexto
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {Object.values(INTERVIEW_CONTEXTS).map(ctx => (
              <button key={ctx.id} onClick={() => setSelectedContext(ctx.id)} style={{
                fontFamily: T.mono, fontSize: 8, letterSpacing: '.14em', padding: '7px 10px',
                background: selectedContext === ctx.id ? `${sc}20` : 'rgba(255,255,255,.03)',
                border: `1px solid ${selectedContext === ctx.id ? sc + '66' : T.border}`,
                color: selectedContext === ctx.id ? sc : T.faint,
                cursor: 'pointer', textTransform: 'uppercase', transition: 'all .12s',
              }}>
                {ctx.icon} {ctx.label}
              </button>
            ))}
          </div>
        </div>

        {/* Perguntas */}
        <div>
          <div style={{ fontFamily: T.mono, fontSize: 7, letterSpacing: '.32em', color: T.faint, textTransform: 'uppercase', marginBottom: 7 }}>
            Perguntas
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            {[4, 5, 6].map(n => (
              <button key={n} onClick={() => setQuestionCount(n)} style={{
                width: 34, height: 32, fontFamily: T.mono, fontSize: 10, fontWeight: 700,
                background: questionCount === n ? `${sc}20` : 'rgba(255,255,255,.03)',
                border: `1px solid ${questionCount === n ? sc + '55' : T.border}`,
                color: questionCount === n ? sc : T.faint,
                cursor: 'pointer', transition: 'all .12s',
              }}>
                {n}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Botão ────────────────────────────────────────────── */}
      <button onClick={handleGenerate} disabled={generating} style={{
        width: '100%', padding: '13px 16px', marginBottom: 18,
        fontFamily: T.mono, fontSize: 9, fontWeight: 700, letterSpacing: '.22em',
        textTransform: 'uppercase', cursor: generating ? 'not-allowed' : 'pointer',
        background: generating ? 'rgba(255,255,255,.03)' : `${sc}18`,
        border: `1px solid ${generating ? T.border : sc + '55'}`,
        color: generating ? T.faint : sc,
        transition: 'all .15s',
        clipPath: 'polygon(5px 0,100% 0,calc(100% - 5px) 100%,0 100%)',
      }}>
        {generating ? '⏳ Gerando...' : `🎙️ Gerar entrevista — ${INTERVIEW_CONTEXTS[selectedContext]?.label ?? selectedContext}`}
      </button>

      {/* ── Resultado ──────────────────────────────────────── */}
      {interview && interview.pairs.length > 0 && (
        <div>
          {/* Header */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12,
            paddingBottom: 10, borderBottom: `1px solid ${T.border}`,
          }}>
            <span style={{ fontSize: 10, color: sc }}>🎙️</span>
            <span style={{ fontFamily: T.mono, fontSize: 7, letterSpacing: '.32em', color: T.faint, textTransform: 'uppercase' }}>
              {INTERVIEW_CONTEXTS[interview.contextId]?.label} · {interview.pairs.length} perguntas
            </span>
            {lastTournamentName && (
              <span style={{ fontFamily: T.mono, fontSize: 7, color: T.faint, letterSpacing: '.14em', marginLeft: 'auto' }}>
                📋 {lastTournamentName}
              </span>
            )}
          </div>

          {/* Q&A list */}
          {interview.pairs.map((qa, i) => {
            const meta = TOPIC_META[qa.topic] ?? { icon: '💬', label: qa.topic };
            const isOpen = openIdx === i;
            return (
              <div key={i} style={{
                border: `1px solid ${T.border}`,
                borderLeft: `3px solid ${isOpen ? sc : sc + '33'}`,
                background: isOpen ? `${sc}06` : T.bgCard,
                marginBottom: 5,
                transition: 'all .15s',
              }}>
                {/* Cabeçalho */}
                <div onClick={() => setOpenIdx(isOpen ? null : i)} style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '8px 12px', cursor: 'pointer',
                  borderBottom: isOpen ? `1px solid ${T.border}` : 'none',
                }}>
                  <span style={{ fontFamily: T.mono, fontSize: 7, color: `${sc}88`, minWidth: 14, fontWeight: 700 }}>
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span style={{
                    fontFamily: T.mono, fontSize: 7.5, letterSpacing: '.14em',
                    padding: '1px 6px', background: `${sc}12`,
                    border: `1px solid ${sc}2A`, color: `${sc}cc`,
                    textTransform: 'uppercase', flexShrink: 0,
                  }}>
                    {meta.icon} {meta.label}
                  </span>
                  <span style={{
                    fontFamily: T.cond, fontSize: 13, fontWeight: 600, color: T.dim,
                    flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    letterSpacing: '.04em',
                  }}>
                    {qa.question}
                  </span>
                  <span style={{
                    fontFamily: T.mono, fontSize: 7, color: T.faint,
                    transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform .15s', flexShrink: 0,
                  }}>▼</span>
                </div>

                {/* Resposta expandida */}
                {isOpen && (
                  <div style={{ padding: '12px 14px 14px 36px' }}>
                    <div style={{
                      fontFamily: T.cond, fontSize: 13.5, fontWeight: 600, color: T.faint,
                      fontStyle: 'italic', marginBottom: 10, paddingBottom: 8,
                      borderBottom: `1px solid ${T.border}`, letterSpacing: '.04em',
                    }}>
                      "{qa.question}"
                    </div>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                      <span style={{ fontFamily: T.mono, fontSize: 7.5, color: sc, letterSpacing: '.14em', flexShrink: 0, marginTop: 2 }}>
                        {np?.name?.split(' ').pop() ?? np?.name} —
                      </span>
                      <div style={{
                        fontFamily: "'Barlow', sans-serif", fontSize: 13, lineHeight: 1.8,
                        color: T.white, letterSpacing: '.01em',
                      }}>
                        {qa.answer}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {interview && interview.pairs.length === 0 && (
        <div style={{ textAlign: 'center', padding: '30px 0', fontFamily: T.mono, fontSize: 8, color: T.faint, letterSpacing: '.22em' }}>
          Nenhuma pergunta gerada para este contexto
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// TAB: GRAND SLAM
// Histórico completo do jogador apenas nos 4 Grand Slams do universo.
// ─────────────────────────────────────────────────────────────────
const GS_DEFS = [
  { id:'JAN_GS_MERIDIAN', name:'Open de Meridian', short:'MERIDIAN', surface:'HARD',  surfLabel:'Hard',  color:'#4A90D9', icon:'⚡', location:'Meridian'  },
  { id:'MAI_GS_ROLAND',   name:"Roland d'Occitane", short:'OCCITANE', surface:'CLAY',  surfLabel:'Clay',  color:'#C4572A', icon:'🌺', location:'Occitane'   },
  { id:'JUN_GS_ALBION',   name:'Championships of Albion', short:'ALBION',   surface:'GRASS', surfLabel:'Grass', color:'#2E7D32', icon:'🌿', location:'Albion'     },
  { id:'AGO_GS_EMPIRE',   name:'Empire Open',       short:'EMPIRE',   surface:'INDOOR',surfLabel:'Indoor',color:'#6A1B9A', icon:'🏙️', location:'Empire City' },
];

const ROUND_EMOJI = { W:'🏆', F:'🥈', SF:'🎖️', QF:'🎯', R16:'✅', R32:'⬜', R64:'⬜', R128:'⬜' };
const ROUND_ORDER = ['W','F','SF','QF','R16','R32','R64','R128'];

function buildGrandSlamData(playerId, tournamentResults) {
  // byTournament: { [gsId]: { years: { [year]: { round, won, sets } } } }
  const byTournament = {};
  for (const gs of GS_DEFS) byTournament[gs.id] = { wins:0, finals:0, semis:0, qf:0, matches:0, losses:0, years:{} };

  const allYears = new Set();

  for (const [, res] of Object.entries(tournamentResults ?? {})) {
    if (!res) continue;
    const t = res.tournament;
    if (!t || t.category !== 'GRAND_SLAM') continue;
    const gsId = t.id;
    if (!byTournament[gsId]) continue;

    const year = t.season ?? res._season ?? '?';
    allYears.add(year);
    const rec = byTournament[gsId];

    if (res._slim) {
      const isChamp    = res.champion?.id  === playerId;
      const isFinalist = res.finalist?.id  === playerId;
      const isSemi     = (res.semis ?? []).some(s => s.id === playerId);
      let wins = 0, losses = 0, played = false;
      for (const m of res.matches ?? []) {
        if (m.w === playerId) { wins++; played = true; }
        if (m.l === playerId) { losses++; played = true; }
      }
      if (!played && !isChamp && !isFinalist && !isSemi) continue;

      let round = null, sets = null;
      if (isChamp)    { round = 'W';  rec.wins++;   rec.finals++; rec.semis++; rec.qf++; }
      else if (isFinalist) { round = 'F'; rec.finals++; rec.semis++; rec.qf++; }
      else if (isSemi)     { round = 'SF'; rec.semis++; rec.qf++; }
      else {
        const fromEnd = wins;
        const roundKeys = ['F','SF','QF','R16','R32','R64','R128'];
        round = roundKeys[fromEnd] ?? 'R64';
        if (round === 'QF') rec.qf++;
      }
      if (losses > 0) rec.losses++;
      rec.matches += wins + losses;

      // setsDetail da partida que perdeu — tenta pegar do matches
      const lostMatch = (res.matches ?? []).find(m => m.l === playerId);
      if (lostMatch?.sd) {
        const wa = lostMatch.wa ?? true; // wa = playerA é o winner
        const playerIsA = !wa; // se wa=true, winner=A, então player=B
        sets = lostMatch.sd.map(([a,b]) => playerIsA ? [a,b] : [b,a]); // [playerGames, oppGames]
      }
      rec.years[year] = { round, sets, won: isChamp };
    } else {
      const { bracket } = res;
      if (!bracket?.rounds) continue;

      let round = null, won = false, sets = null;
      for (const r of bracket.rounds) {
        for (const m of r) {
          if (m.isBye) continue;
          const isA = m.playerA?.id === playerId;
          const isB = m.playerB?.id === playerId;
          if (!isA && !isB) continue;
          rec.matches++;
          if (m.winner?.id === playerId) {
            const ri = bracket.rounds.indexOf(r);
            if (ri === bracket.rounds.length - 1) { round = 'W'; won = true; rec.wins++; rec.finals++; rec.semis++; rec.qf++; }
          } else if (m.winner) {
            rec.losses++;
            const fromEnd = bracket.rounds.length - 1 - bracket.rounds.indexOf(r);
            const rk = ['F','SF','QF','R16','R32','R64','R128'][fromEnd] ?? 'R64';
            round = rk;
            if (rk === 'F')  rec.finals++;
            if (rk === 'SF') rec.semis++;
            if (rk === 'QF') rec.qf++;
            // setsDetail
            const sd = m.result?.setsDetail;
            if (sd?.length) {
              sets = sd.map(([a,b]) => isA ? [a,b] : [b,a]);
            }
          }
        }
      }
      if (round) rec.years[year] = { round, sets, won };
    }
  }

  const sortedYears = [...allYears].sort((a,b) => Number(a)-Number(b));
  return { byTournament, sortedYears };
}

function GsRoundBadge({ round, size = 'md' }) {
  if (!round) return <div style={{ width: size==='sm'?22:28, height:size==='sm'?22:28, background:'rgba(237,232,223,.04)', border:'1px solid rgba(237,232,223,.08)' }} />;
  const big = round === 'W';
  const colors = {
    W:   { bg:'rgba(232,200,74,.18)',  border:'rgba(232,200,74,.6)',  text:'#E8C84A' },
    F:   { bg:'rgba(200,200,200,.12)', border:'rgba(200,200,200,.5)', text:'#E0E0E0' },
    SF:  { bg:'rgba(74,144,217,.12)',  border:'rgba(74,144,217,.45)', text:'#4A90D9' },
    QF:  { bg:'rgba(102,187,106,.10)', border:'rgba(102,187,106,.38)',text:'#66BB6A' },
    R16: { bg:'rgba(237,232,223,.05)', border:'rgba(237,232,223,.18)',text:'rgba(237,232,223,.55)' },
    R32: { bg:'transparent',           border:'rgba(237,232,223,.1)', text:'rgba(237,232,223,.3)' },
    R64: { bg:'transparent',           border:'rgba(237,232,223,.07)',text:'rgba(237,232,223,.2)' },
  };
  const c = colors[round] ?? colors.R64;
  const px = size === 'sm' ? 22 : 28;
  return (
    <div style={{ width:px, height:px, display:'flex', alignItems:'center', justifyContent:'center',
      background: c.bg, border:`1px solid ${c.border}`,
      boxShadow: big ? `0 0 8px ${c.border}` : 'none' }}>
      <span style={{ fontFamily:T.mono, fontSize: size==='sm'?7:8, color:c.text, fontWeight:big?700:400, letterSpacing:.5 }}>{round}</span>
    </div>
  );
}

function GsSetScore({ sets, won }) {
  if (!sets?.length) return null;
  return (
    <div style={{ display:'flex', gap:3, flexWrap:'wrap', marginTop:3 }}>
      {sets.map(([p,o], i) => {
        const mySet = p > o;
        return (
          <span key={i} style={{ fontFamily:T.mono, fontSize:8, color: mySet ? (won ? '#E8C84A' : '#66BB6A') : 'rgba(237,232,223,.3)', letterSpacing:.5 }}>
            {p}-{o}
          </span>
        );
      })}
    </div>
  );
}

function TabGrandSlam({ np, sc, tournamentResults }) {
  const [focusYear, setFocusYear] = React.useState(null);

  const { byTournament, sortedYears } = React.useMemo(
    () => buildGrandSlamData(np?.id, tournamentResults),
    [np?.id, tournamentResults]
  );

  const totalWins    = GS_DEFS.reduce((s, g) => s + (byTournament[g.id]?.wins ?? 0), 0);
  const totalFinals  = GS_DEFS.reduce((s, g) => s + (byTournament[g.id]?.finals ?? 0), 0);
  const totalSemis   = GS_DEFS.reduce((s, g) => s + (byTournament[g.id]?.semis ?? 0), 0);
  const totalQF      = GS_DEFS.reduce((s, g) => s + (byTournament[g.id]?.qf ?? 0), 0);
  const careerGS     = GS_DEFS.every(g => (byTournament[g.id]?.wins ?? 0) > 0);

  if (!tournamentResults || sortedYears.length === 0) {
    return (
      <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:14, opacity:.3 }}>
        <div style={{ fontSize:52 }}>⭐</div>
        <div style={{ fontFamily:T.mono, fontSize:9, letterSpacing:4, color:T.inkFaint, textTransform:'uppercase', textAlign:'center' }}>Disponível após temporadas no Universo</div>
      </div>
    );
  }

  return (
    <div className="upp2-scroll" style={{ flex:1, overflowY:'auto', padding:'22px 26px', display:'flex', flexDirection:'column', gap:22 }}>

      {/* ── Hero stats ─────────────────────────────────────────────────────── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:2 }}>
        {[
          { label:'Títulos GS', value: totalWins,   color:'#E8C84A', big:true },
          { label:'Finais',     value: totalFinals,  color:'#E0E0E0' },
          { label:'Semifinais', value: totalSemis,   color:'#4A90D9' },
          { label:'Quartas',    value: totalQF,      color:'#66BB6A' },
          { label:'Temporadas', value: sortedYears.length, color: T.inkDim },
        ].map(({ label, value, color, big }) => (
          <div key={label} style={{ background:'rgba(237,232,223,.03)', border:'1px solid rgba(237,232,223,.07)', padding:'14px 10px', textAlign:'center' }}>
            <div style={{ fontFamily:T.display, fontSize:big?48:32, color, lineHeight:.9, textShadow: big?`0 0 24px ${color}44`:undefined }}>{value}</div>
            <div style={{ fontFamily:T.mono, fontSize:7, letterSpacing:'.32em', color:T.inkFaint, textTransform:'uppercase', marginTop:7 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* ── Career Grand Slam badge ─────────────────────────────────────────── */}
      {careerGS && (
        <div style={{ display:'flex', alignItems:'center', gap:16, background:'linear-gradient(135deg,rgba(232,200,74,.1),rgba(232,200,74,.04))', border:'1px solid rgba(232,200,74,.35)', padding:'14px 20px' }}>
          <div style={{ fontSize:32 }}>🌍</div>
          <div>
            <div style={{ fontFamily:T.display, fontSize:18, color:'#E8C84A', letterSpacing:3, textTransform:'uppercase' }}>Career Grand Slam</div>
            <div style={{ fontFamily:T.mono, fontSize:9, color:'rgba(232,200,74,.6)', letterSpacing:2, marginTop:3 }}>Venceu os 4 Grand Slams ao longo da carreira</div>
          </div>
        </div>
      )}

      {/* ── Cards por torneio ──────────────────────────────────────────────── */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
        {GS_DEFS.map(gs => {
          const rec = byTournament[gs.id];
          const col = gs.color;
          const participations = Object.keys(rec.years).length;
          const winRate = rec.losses + rec.wins > 0
            ? Math.round(rec.wins / (rec.wins + rec.losses) * 100) : null;
          const bestRound = (() => {
            for (const r of ROUND_ORDER) {
              if (Object.values(rec.years).some(y => y.round === r)) return r;
            }
            return null;
          })();
          return (
            <div key={gs.id} style={{ background:`${col}07`, border:`1px solid ${col}30`, borderTop:`3px solid ${col}`, padding:'16px 18px', position:'relative', overflow:'hidden' }}>
              {/* bg glow */}
              <div style={{ position:'absolute', top:-30, right:-30, width:100, height:100, borderRadius:'50%', background:`${col}10`, filter:'blur(20px)', pointerEvents:'none' }} />
              {/* surface badge */}
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <span style={{ fontSize:18 }}>{gs.icon}</span>
                  <div>
                    <div style={{ fontFamily:T.display, fontSize:13, color:T.ink, letterSpacing:2, textTransform:'uppercase' }}>{gs.short}</div>
                    <div style={{ fontFamily:T.mono, fontSize:7, color:`${col}99`, letterSpacing:2, textTransform:'uppercase' }}>{gs.surfLabel} · {gs.location}</div>
                  </div>
                </div>
                {rec.wins > 0 && (
                  <div style={{ display:'flex', flexDirection:'column', alignItems:'center', background:`${col}18`, border:`1px solid ${col}44`, padding:'6px 12px' }}>
                    <div style={{ fontFamily:T.display, fontSize:28, color:col, lineHeight:1 }}>{rec.wins}</div>
                    <div style={{ fontFamily:T.mono, fontSize:7, color:`${col}88`, letterSpacing:2 }}>TÍTULO{rec.wins>1?'S':''}</div>
                  </div>
                )}
              </div>
              {/* stats row */}
              <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:4, marginBottom:12 }}>
                {[
                  { l:'Part.',  v: participations },
                  { l:'Finais', v: rec.finals  },
                  { l:'Semis',  v: rec.semis   },
                  { l:'Quartas',v: rec.qf      },
                ].map(({ l, v }) => (
                  <div key={l} style={{ background:'rgba(237,232,223,.04)', padding:'6px 0', textAlign:'center' }}>
                    <div style={{ fontFamily:T.display, fontSize:16, color: v>0?col:T.inkFaint }}>{v}</div>
                    <div style={{ fontFamily:T.mono, fontSize:6, color:T.inkFaint, letterSpacing:1, textTransform:'uppercase' }}>{l}</div>
                  </div>
                ))}
              </div>
              {/* win rate */}
              {winRate !== null && (
                <div style={{ marginBottom:10 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                    <span style={{ fontFamily:T.mono, fontSize:7, color:T.inkFaint, letterSpacing:2, textTransform:'uppercase' }}>Win Rate</span>
                    <span style={{ fontFamily:T.mono, fontSize:8, color:col }}>{winRate}%</span>
                  </div>
                  <div style={{ height:2, background:'rgba(237,232,223,.07)' }}>
                    <div style={{ height:'100%', width:`${winRate}%`, background:`linear-gradient(90deg,${col}88,${col})` }} />
                  </div>
                </div>
              )}
              {/* melhor resultado */}
              {bestRound && (
                <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                  <span style={{ fontFamily:T.mono, fontSize:7, color:T.inkFaint, letterSpacing:2, textTransform:'uppercase' }}>Melhor resultado</span>
                  <GsRoundBadge round={bestRound} size="sm" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Grid temporal: ano × torneio ───────────────────────────────────── */}
      <div>
        <div style={{ fontFamily:T.mono, fontSize:8, letterSpacing:4, color:T.inkFaint, textTransform:'uppercase', marginBottom:12 }}>Histórico por Temporada</div>

        {/* year filter */}
        {sortedYears.length > 6 && (
          <div style={{ display:'flex', gap:4, flexWrap:'wrap', marginBottom:10 }}>
            <button onClick={() => setFocusYear(null)} style={{ fontFamily:T.mono, fontSize:7, letterSpacing:2, padding:'3px 9px', background: focusYear===null?`${sc}22`:'transparent', border:`1px solid ${focusYear===null?sc:'rgba(237,232,223,.1)'}`, color: focusYear===null?sc:T.inkFaint, cursor:'pointer', textTransform:'uppercase' }}>Todos</button>
            {sortedYears.map(yr => (
              <button key={yr} onClick={() => setFocusYear(yr===focusYear?null:yr)} style={{ fontFamily:T.mono, fontSize:7, letterSpacing:2, padding:'3px 9px', background: focusYear===yr?`${sc}22`:'transparent', border:`1px solid ${focusYear===yr?sc:'rgba(237,232,223,.1)'}`, color: focusYear===yr?sc:T.inkFaint, cursor:'pointer' }}>{yr}</button>
            ))}
          </div>
        )}

        {/* header row */}
        <div style={{ display:'grid', gridTemplateColumns:'56px repeat(4,1fr)', gap:2, marginBottom:2 }}>
          <div />
          {GS_DEFS.map(gs => (
            <div key={gs.id} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:3, padding:'6px 4px', background:`${gs.color}0A`, borderBottom:`2px solid ${gs.color}66` }}>
              <span style={{ fontSize:12 }}>{gs.icon}</span>
              <span style={{ fontFamily:T.mono, fontSize:7, color:gs.color, letterSpacing:1, textTransform:'uppercase' }}>{gs.short}</span>
            </div>
          ))}
        </div>

        {/* year rows */}
        {(focusYear ? [focusYear] : [...sortedYears].reverse()).map(yr => {
          const rowHasAny = GS_DEFS.some(g => byTournament[g.id].years[yr]);
          if (!rowHasAny) return null;
          return (
            <div key={yr} style={{ display:'grid', gridTemplateColumns:'56px repeat(4,1fr)', gap:2, marginBottom:2 }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'flex-end', paddingRight:8 }}>
                <span style={{ fontFamily:T.mono, fontSize:9, color:T.inkFaint, letterSpacing:1 }}>{yr}</span>
              </div>
              {GS_DEFS.map(gs => {
                const entry = byTournament[gs.id].years[yr];
                if (!entry) return <div key={gs.id} style={{ background:'rgba(237,232,223,.02)', border:'1px solid rgba(237,232,223,.04)', display:'flex', alignItems:'center', justifyContent:'center' }}><span style={{ color:'rgba(237,232,223,.1)', fontSize:10 }}>—</span></div>;
                const col = gs.color;
                const bg = entry.round === 'W' ? `${col}18` : 'rgba(237,232,223,.03)';
                const border = entry.round === 'W' ? `1px solid ${col}55` : '1px solid rgba(237,232,223,.07)';
                return (
                  <div key={gs.id} style={{ background:bg, border, padding:'7px 6px', display:'flex', flexDirection:'column', alignItems:'center', gap:3 }}>
                    <GsRoundBadge round={entry.round} size="sm" />
                    {entry.round === 'W' && <span style={{ fontSize:10 }}>🏆</span>}
                    <GsSetScore sets={entry.sets} won={entry.won} />
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* ── Legenda ─────────────────────────────────────────────────────────── */}
      <div style={{ display:'flex', gap:10, flexWrap:'wrap', paddingTop:10, borderTop:`1px solid ${T.line}` }}>
        {[['W','Título'],['F','Final'],['SF','Semifinal'],['QF','Quartas'],['R16','Oitavas'],['—','Não jogou']].map(([r,l]) => (
          <div key={r} style={{ display:'flex', alignItems:'center', gap:5 }}>
            {r==='—' ? <div style={{ width:22, height:22, background:'rgba(237,232,223,.02)', border:'1px solid rgba(237,232,223,.04)', display:'flex', alignItems:'center', justifyContent:'center' }}><span style={{ color:'rgba(237,232,223,.1)', fontSize:9 }}>—</span></div>
              : <GsRoundBadge round={r} size="sm" />}
            <span style={{ fontFamily:T.mono, fontSize:7, color:T.inkFaint, letterSpacing:1 }}>{l}</span>
          </div>
        ))}
      </div>

    </div>
  );
}

// TABS CONFIG
// ─────────────────────────────────────────────────────────────────
const TABS = [
  { id:'identidade',   name:'IDENTIDADE',   icon:'👤' },
  { id:'jogo',         name:'JOGO',         icon:'⚡'  },
  { id:'percepcoes',   name:'CIRCUITO',     icon:'🌐'  },
  { id:'carreira',     name:'CARREIRA',     icon:'🏆'  },
  { id:'grand_slam',   name:'GRAND SLAM',   icon:'⭐'  },
  { id:'trajetoria',   name:'TRAJETÓRIA',   icon:'📈'  },
  { id:'resultados',   name:'RESULTADOS',   icon:'📜'  },
  { id:'hist_anual',   name:'HIST. ANUAL',  icon:'📅'  },
  { id:'rivalidades',  name:'RIVALIDADES',  icon:'⚔️'  },
  { id:'fisico',       name:'FÍSICO & DNA', icon:'💊'  },
  { id:'tecnico',      name:'TÉCNICO',      icon:'🎓'  },
  { id:'financeiro',   name:'FINANCEIRO',   icon:'💰'  },
  { id:'forma',        name:'FORMA & IFR',  icon:'📡'  },
  { id:'patrocinio',   name:'PATROCÍNIO',   icon:'🤝'  },
  { id:'vida',         name:'VIDA',         icon:'🏡'  },
  { id:'entrevistas',  name:'ENTREVISTAS',  icon:'🎙️' },
];

// ─────────────────────────────────────────────────────────────────
// MAIN EXPORT
// ─────────────────────────────────────────────────────────────────
const TAB_GROUPS = [
  {
    id: 'essencia',
    name: 'Essencia',
    kicker: 'Quem ele e',
    desc: 'Leitura rapida da identidade competitiva, do jogo e da imagem publica.',
    tabs: ['identidade', 'jogo', 'percepcoes'],
  },
  {
    id: 'carreira',
    name: 'Carreira',
    kicker: 'O que construiu',
    desc: 'Linha de crescimento, conquistas, temporadas, rivalidades e memoria esportiva.',
    tabs: ['carreira', 'grand_slam', 'trajetoria', 'resultados', 'hist_anual', 'rivalidades'],
  },
  {
    id: 'estrutura',
    name: 'Estrutura',
    kicker: 'Base da maquina',
    desc: 'Corpo, equipe, dinheiro, forma recente e patrocinios sob uma mesma lente.',
    tabs: ['fisico', 'tecnico', 'financeiro', 'forma', 'patrocinio'],
  },
  {
    id: 'universo',
    name: 'Universo',
    kicker: 'A vida alem da quadra',
    desc: 'Rotina, eventos pessoais e a forma como esse personagem fala com o circuito.',
    tabs: ['vida', 'entrevistas'],
  },
];

const TAB_META = {
  identidade:  { group:'essencia', title:'Identidade do Personagem', desc:'Perfil humano e competitivo do tenista: personalidade, fama, reputacao e sinais do que ele representa no circuito.', bullets:['personalidade','reputacao','mercado'] },
  jogo:        { group:'essencia', title:'Leitura de Jogo', desc:'Arquitetura tecnica completa: estilo, atributos, preferencias e o mapa do que esse jogador sabe fazer em quadra.', bullets:['estilo','atributos','preferencias'] },
  percepcoes:  { group:'essencia', title:'Olhar do Circuito', desc:'Como o resto do mundo enxerga esse nome: hype, medo, respeito, subestimacao e narrativa publica.', bullets:['mercado','narrativa','respeito'] },
  carreira:    { group:'carreira', title:'Obra da Carreira', desc:'Conquistas, marcos, premios e os capitulos mais importantes que ajudam a explicar o tamanho esportivo do jogador.', bullets:['titulos','marcos','legado'] },
  grand_slam:  { group:'carreira', title:'Memoria nos Slams', desc:'Um recorte cerimonial da carreira nos quatro majors, com leitura rapida de grandes campanhas e tempos fortes.', bullets:['slams','campanhas','recordes'] },
  trajetoria:  { group:'carreira', title:'Curva de Evolucao', desc:'Ascensao, queda, estabilizacao e desenvolvimento vistos pela trajetoria de ranking e de nivel ao longo do tempo.', bullets:['ranking','evolucao','fase'] },
  resultados:  { group:'carreira', title:'Mapa de Resultados', desc:'Volume de torneios, consistencia por categoria e a forma como o jogador performa no calendario completo.', bullets:['torneios','superficies','consistencia'] },
  hist_anual:  { group:'carreira', title:'Leitura Ano a Ano', desc:'Temporadas quebradas em recortes claros, para entender mudancas de patamar e anos fora da curva.', bullets:['temporadas','picos','quedas'] },
  rivalidades: { group:'carreira', title:'Conflitos e Espelhos', desc:'Os nomes que ajudam a definir a carreira: freguesias, duelos historicos e historias que voltam sempre.', bullets:['duelos','historias','contexto'] },
  fisico:      { group:'estrutura', title:'Fisico e DNA', desc:'Condicao corporal, carga, lesoes, tracos biologicos e tudo o que sustenta ou limita o teto competitivo.', bullets:['saude','carga','dna'] },
  tecnico:     { group:'estrutura', title:'Base Tecnica', desc:'Treinadores, parceria, plano de desenvolvimento e a equipe que molda o jogador fora do placar.', bullets:['coach','parceria','plano'] },
  financeiro:  { group:'estrutura', title:'Pressao Financeira', desc:'Fluxo de carreira pela lente do dinheiro: ganhos, despesas, contexto economico e estabilidade.', bullets:['ganhos','pressao','planejamento'] },
  forma:       { group:'estrutura', title:'Forma Recente', desc:'Momento atual do atleta, pulsacao competitiva e sinais de alta ou baixa antes de olhar o resto da ficha.', bullets:['momento','ifr','tendencia'] },
  patrocinio:  { group:'estrutura', title:'Ecossistema Comercial', desc:'Contratos, poder de atracao e leitura comercial do nome, com foco em clareza e peso de mercado.', bullets:['contratos','sinal','historico'] },
  vida:        { group:'universo', title:'Vida Fora da Quadra', desc:'Eventos pessoais, rotina, imagem publica e a camada humana que contextualiza a carreira.', bullets:['rotina','eventos','imagem'] },
  entrevistas: { group:'universo', title:'Voz do Jogador', desc:'Como ele se comunica, quais tons aparecem sob pressao e que personagem surge diante dos microfones.', bullets:['tom','contextos','fala'] },
};

export default function UnifiedPlayerProfile2({
  playerKey, playerData, onBack, onNavigate, onPlay,
  allKeys, formPoints = 0, formHistory = [],
  tournamentResults = null, rivalrySystem = null,
  allPlayers = [], rankingStore = null,
  coachPool = [], dispatch = null, year = null,
  newsEngine = null,
  sponsorPool = null, pendingOffers = [], highestPaidPlayerId = null,
  chronicleEngine = null,
}) {
  injectCSS();
  const [activeTab, setActiveTab] = useState('identidade');

  const keys = allKeys ?? NAMED_PLAYER_KEYS;
  const np   = playerData ?? NAMED_PLAYERS[playerKey];
  const ov   = np ? overallRating(np.attrs) : 0;
  const grade = np ? overallGrade(ov) : '—';
  const npPrefs    = np ? (np.prefs ?? generatePrefs(np.attrs ?? {})) : {};
  const archetype  = np ? getArchetype(npPrefs) : null;
  const sc    = archetype?.color ?? T.clay;
  const lookupKey = playerData ? (np?.id ?? playerKey) : playerKey;
  const idx   = keys.indexOf(lookupKey);
  const prevKey = idx > 0 ? keys[idx-1] : null;
  const nextKey = idx < keys.length-1 ? keys[idx+1] : null;
  const potCat  = np?.potential ? getPotentialCategory(np.potential) : null;
  const arc     = np?.developmentStyle ? getCareerArc(np.developmentStyle) : null;
  const alcunha = np?.alcunha ? (ALCUNHA_BY_ID[np.alcunha] ?? { label:np.alcunha }) : null;
  const activeMeta = TAB_META[activeTab] ?? TAB_META.identidade;
  const activeGroup = TAB_GROUPS.find(group => group.id === activeMeta.group) ?? TAB_GROUPS[0];
  const visibleTabs = TABS.filter(tab => activeGroup.tabs.includes(tab.id));
  const displayNum = idx >= 0 ? String(idx+1).padStart(2,'0') : '—';

  if (!np) return null;
  migratePlayerPersonality(np);

  return (
    <div className="upp2-root" style={{ '--sc': sc }}>

      {/* CHROME */}
      <div className="upp2-chrome">
        <button className="upp2-chrome-btn" onClick={onBack}>← Voltar</button>
        <div style={{ width:1, height:14, background:T.line, flexShrink:0 }}/>
        <span style={{ fontFamily:T.mono, fontSize:7, letterSpacing:'.42em', textTransform:'uppercase', color:T.inkFaint }}>Ficha do Tenista</span>
        <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:7 }}>
          <button className="upp2-chrome-btn" disabled={!prevKey} onClick={() => prevKey && onNavigate(prevKey)}>← Ant</button>
          <span style={{ fontFamily:T.mono, fontSize:8, letterSpacing:2, color:T.inkFaint, minWidth:38, textAlign:'center' }}>{displayNum}/{String(keys.length).padStart(2,'0')}</span>
          <button className="upp2-chrome-btn" disabled={!nextKey} onClick={() => nextKey && onNavigate(nextKey)}>Próx →</button>
        </div>
      </div>

      {/* HERO */}
      <div className="upp2-hero">
        <div className="upp2-hero-photo"><HeroPhoto np={np} playerKey={playerKey} /></div>
        <div className="upp2-hero-stripe"/>
        <div className="upp2-hero-num">{displayNum}</div>
        <div className="upp2-hero-content">
          <div className="upp2-hero-info">
            <div className="upp2-hero-eyebrow">
              <span className="upp2-hero-nat">{np.nationality}</span>
              <span className="upp2-hero-rank">· #{displayNum}</span>
            </div>
            <div className="upp2-hero-name">{np.name}</div>
            {np.nickname && <div className="upp2-hero-nick">"{np.nickname}"</div>}
            <div className="upp2-hero-meta">
              {[np.age && `${np.age} anos`, np.height && `${np.height}m`, np.weight && `${np.weight}kg`, np.hand].filter(Boolean).map((v, i, arr) => (
                <React.Fragment key={i}>
                  <span className="upp2-hero-meta-item">{v}</span>
                  {i < arr.length-1 && <div className="upp2-hero-meta-sep"/>}
                </React.Fragment>
              ))}
            </div>
            <div className="upp2-hero-badges">
              {archetype && (
                <div className="upp2-style-badge">
                  {archetype.icon && <span style={{ marginRight:5, fontSize:11 }}>{archetype.icon}</span>}
                  {archetype.abbr}
                </div>
              )}
              {alcunha && <div className="upp2-alcunha-badge">✦ {alcunha.label}</div>}
            </div>
          </div>
          <div className="upp2-hero-ovr">
            {(() => {
              const tier = ovrTier(ov);
              return (
                <>
                  <div className="upp2-ovr-label">Nível</div>
                  <div className="upp2-ovr-num" style={{ fontSize: 'clamp(28px,4vw,42px)', color: tier.color }}>{tier.grade}</div>
                  <div className="upp2-ovr-div"/>
                  <div className="upp2-ovr-grade" style={{ color: tier.color, fontSize: 9, letterSpacing: '.12em', maxWidth: 80, textAlign: 'center', lineHeight: 1.3 }}>{tier.label}</div>
                </>
              );
            })()}
          </div>
        </div>
      </div>

      {/* TAB BAR */}
      <div className="upp2-tab-shell">
        <div className="upp2-groupbar">
          {TAB_GROUPS.map(group => {
            const isActive = group.id === activeGroup.id;
            return (
              <button
                key={group.id}
                className={`upp2-group${isActive ? ' act' : ''}`}
                onClick={() => setActiveTab(group.tabs[0])}
              >
                <span className="upp2-group-kicker">{group.kicker}</span>
                <span className="upp2-group-name">{group.name}</span>
                <span className="upp2-group-desc">{group.desc}</span>
              </button>
            );
          })}
        </div>

        <div className="upp2-tabbar">
          {visibleTabs.map(t => (
            <button key={t.id} className={`upp2-tab${activeTab===t.id?' act':''}`} onClick={() => setActiveTab(t.id)}>
              <div className="upp2-tab-dot"/>
              {t.name}
            </button>
          ))}
        </div>

        <div className="upp2-tab-meta">
          <div className="upp2-tab-meta-copy">
            <div className="upp2-tab-kicker">{activeGroup.name}</div>
            <div className="upp2-tab-title">{activeMeta.title}</div>
            <div className="upp2-tab-desc">{activeMeta.desc}</div>
          </div>
          <div className="upp2-tab-points">
            {(activeMeta.bullets ?? []).map(point => (
              <span key={point} className="upp2-tab-pill">{point}</span>
            ))}
          </div>
        </div>
      </div>

      {/* CONTENT */}
      <div className="upp2-content" key={activeTab}>
        {activeTab==='identidade'  && <TabIdentidade  np={np} sc={sc} />}
        {activeTab==='jogo'        && <TabJogo        np={np} sc={sc} potCat={potCat} arc={arc} year={year} />}
        {activeTab==='percepcoes'  && <TabPercepcoes  np={np} sc={sc} year={year} tournamentResults={tournamentResults} allPlayers={allPlayers} />}
        {activeTab==='carreira'    && <TabCarreira    np={np} sc={sc} tournamentResults={tournamentResults} chronicleEngine={chronicleEngine} rivalrySystem={rivalrySystem} allPlayers={allPlayers} coachPool={coachPool} year={year} />}
        {activeTab==='grand_slam'  && <TabGrandSlam   np={np} sc={sc} tournamentResults={tournamentResults} />}
        {activeTab==='trajetoria'  && <TabTrajetoria  np={np} sc={sc} rankingStore={rankingStore} year={year} />}
        {activeTab==='resultados'  && <TabResultados  np={np} sc={sc} tournamentResults={tournamentResults} />}
        {activeTab==='hist_anual'  && <TabHistAnual   np={np} sc={sc} tournamentResults={tournamentResults} />}
        {activeTab==='rivalidades' && <TabRivalidades np={np} sc={sc} rivalrySystem={rivalrySystem} allPlayers={allPlayers} />}
        {activeTab==='fisico'      && <TabFisicoDNA   np={np} sc={sc} tournamentResults={tournamentResults} />}
        {activeTab==='tecnico'     && <TabTecnico     np={np} sc={sc} coachPool={coachPool} dispatch={dispatch} year={year} rivalrySystem={rivalrySystem} />}
        {activeTab==='financeiro'  && <TabFinanceiro  np={np} sc={sc} />}
        {activeTab==='forma'       && <TabFormaRecente np={np} sc={sc} allPlayers={allPlayers} newsEngine={newsEngine} rivalrySystem={rivalrySystem} />}
        {activeTab==='patrocinio'  && <TabPatrocinio   np={np} sc={sc} sponsorPool={sponsorPool} year={year} highestPaidPlayerId={highestPaidPlayerId} pendingOffers={pendingOffers} />}
        {activeTab==='vida'        && <TabVida         np={migratePlayerLifeData(np)} sc={sc} />}
        {activeTab==='entrevistas' && <TabEntrevistas  np={np} sc={sc} rivalrySystem={rivalrySystem} allPlayers={allPlayers} tournamentResults={tournamentResults} />}
      </div>

    </div>
  );
}

// Re-exports para compatibilidade
export { AttrRow, CatBlock };
