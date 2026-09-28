/**
 * UnifiedPlayerProfile2.jsx
 * -----------------------------------------------------------------
 * Ficha completa do jogador — 8 abas, reimaginada do zero.
 *
 * ABAS:
 *   1. IDENTIDADE   — quem é fora da quadra (personalidade din?mica)
 *   2. JOGO         — como joga (estilo + todos os atributos)
 *   3. CARREIRA     — o que conquistou (títulos + careerMoments)
 *   4. TRAJETÓRIA   — como evoluiu (gráficos OVR/ranking + desenvolvimento)
 *   5. RESULTADOS   — como se saiu nos torneios (+ superfícies)
 *   6. RIVALIDADES  — com quem tem histórias
 *   7. FÍSICO & DNA — estado do atleta + traits
 *   8. TÉCNICO      — com quem trabalha e onde prefere jogar
 */

import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import {
  NAMED_PLAYERS, NAMED_PLAYER_KEYS,
  ATTR_CATEGORIES, catAvg, overallRating, overallGrade,
  getPlayerPhoto,
} from '../../domain/players/players.js';
import {
  ovrTier, attrDescriptor, catDescriptor, attrTierVisual,
  topStrengths, topWeaknesses, potentialNarrative, arcNarrative,
  phaseLabel as scoutPhaseLabel, scoutSummary,
} from '../../systems/scouting/ScoutProfile.js';
import { buildPerceptionNarrative, getMarketAssessment } from '../../systems/circuit/CircuitPerceptions.js';
import { RALLY_PATTERNS } from '../../domain/players/styles.js';
import { SIGNATURE_SHOTS_OFFLINE as NEW_SIGNATURE_SHOTS } from '../../systems/shotlab/ShotEngineOffline.js';
import { getPotentialCategory, getCareerArc, ALCUNHA_BY_ID } from '../../systems/progression/DevelopmentConstants.js';
import { getBurdenAffectedAttrs } from '../../systems/progression/DevelopmentSystem.js';
import FormaTab from '../../systems/progression/formas.jsx';
import {
  INJURY_TYPES, INJURY_GRADES,
  physicalConditionLabel, injuryStatusLabel, ensurePhysicalCondition, getInjuryDisplayName,
} from '../../systems/health/InjurySystem.js';
import { computeRetirementChance, retirementRiskLabel } from '../../systems/career/RetirementSystem.js';
import { getPlayerTraits, getTraitPresentation } from '../../systems/traits/TraitSystem.js';
import { getPlayerRank } from '../../systems/ranking/RankingSystem.js';
import CarreiraTimeline from '../career/CarreiraTimeline.jsx';
import { migratePlayerLifeData } from '../../domain/players/PlayerLifeData.js';
import {
  generateInterview, generateSingleQA,
  INTERVIEW_CONTEXTS, TOPIC_META, TOPIC_IDS,
} from '../../systems/press/InterviewEngine.js';
import { getOffCourtState } from '../../systems/life/LifeEventSystem.js';
import {
  migratePlayerPersonality, getPersonalityHooks,
  PRESS_PERSONAS, COMPETITIVE_ARCHETYPES, REPUTATIONS, getMarketabilityTier,
} from '../../domain/players/PlayerPersonality.js';
import {
  PREFERABLE_TOURNAMENTS, PREFERENCE_BONUS,
  getTopFavoriteTournaments, getBottomTournaments, migrateTournamentPreferences,
} from '../../systems/tournaments/TournamentPreferences.js';
import { formatUSD, getFinancialPressure, ROUND_PRIZE_LABEL, CAT_PRIZE_LABEL, PRIZE_MONEY, initPlayerFinance } from '../../systems/finance/FinanceSystem.js';
import { offlineZero as computeIFR, offlineZero as computeVisibility, offlineZero as computeSponsorSignal, offlineTier as getPhaseTwoTier, IFR_TIERS_OFFLINE as IFR_TIERS } from '../../systems/shotlab/ShotEngineOffline.js';
import { SPONSOR_TIERS } from '../../systems/sponsors/SponsorProfiles.js';
import { getSponsorshipProfile } from '../../systems/sponsors/SponsorContractSystem.js';
import { computeRating } from '../game/IndividualRating.jsx';
import {
  getBuildStyleMeta, getNetGameMeta, getRallyCadenceMeta, getRiskProfileMeta,
  getRallyIntentMeta, adaptabilityLabel, generatePrefs, getArchetype,
} from '../../domain/players/playerPrefs.js';
import { buildPlayerIdentity } from '../../domain/players/PlayerIdentity.js';
import { getCourtIdentity } from '../../domain/players/PlayerCourtIdentity.js';
import { buildPlayerBiography } from '../../systems/press/BiographyEngine.js';
import { getPlayerBadges, BADGE_TIER_META } from '../../systems/achievements/BadgeSystem.js';
import { COACH_METHODS } from '../../systems/coaching/CoachIdentitySystem.js';
import { getPlayerCoach, getPartnershipForPlayer } from '../../systems/coaching/CoachPartnershipSystem.js';
import { PROFILE_THEME as T } from '../theme/uiTheme.js';
import { isJuniorPlayer } from '../../systems/progression/OOutroMundo.js';
import { getTalentIdentityPresentation } from '../../systems/talents/TalentIdentitySystem.js';
import { buildCareerTrajectoryForecast } from '../../systems/career/CareerTrajectorySystem.js';

const formatProfileAge = (age) => {
  const n = Number(age);
  return Number.isFinite(n) ? Math.floor(n) : null;
};

const formatProfileYear = (year) => {
  const n = Number(year);
  // Alguns sistemas de progressão registram checkpoints mensais como 2035.416….
  // A ficha é um arquivo de temporadas: nunca deve expor esse detalhe técnico.
  return Number.isFinite(n) ? Math.floor(n) : year ?? '---';
};

// -----------------------------------------------------------------
// DESIGN SYSTEM
// -----------------------------------------------------------------

// -----------------------------------------------------------------
// CSS INJECTION
// -----------------------------------------------------------------
function injectCSS() {
  // Em desenvolvimento, HMR preserva o nó <style>. Não retornar aqui: assim
  // cada alteração de paleta substitui a folha antiga imediatamente.
  const existingStyle = document.getElementById('dpp-css');
  const css = `
@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Space+Mono:wght@400;700&family=Barlow+Condensed:ital,wght@0,300;0,400;0,600;0,700;0,900;1,600&family=Barlow:wght@300;400;500;600&display=swap');

@keyframes upp2-in    { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
@keyframes upp2-hero  { from{opacity:0;transform:scale(1.04)} to{opacity:1;transform:scale(1)} }
@keyframes upp2-bar   { from{transform:scaleX(0)} to{transform:scaleX(1)} }
@keyframes upp2-float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
@keyframes upp2-pulse { 0%,100%{opacity:.35} 50%{opacity:.9} }

.upp2-root {
  position:fixed; inset:0;
  background:rgba(25,22,17,.72);
  color:#241E16;
  font-family:'Barlow',sans-serif;
  display:flex; align-items:center; justify-content:center;
  overflow:hidden; position:relative;
  padding:0;
  z-index:999;
}

.upp2-root::before {
  content:'';
  position:absolute; inset:0;
  background:
    linear-gradient(90deg, rgba(255,255,255,.018) 1px, transparent 1px),
    linear-gradient(180deg, rgba(255,255,255,.018) 1px, transparent 1px);
  background-size:32px 32px;
  opacity:.18;
  pointer-events:none;
}

.upp2-modal {
  position:relative;
  width:min(1480px,94vw);
  height:min(920px,92vh);
  background:radial-gradient(circle at 12% 0%, rgba(255,255,255,.75), transparent 25%), repeating-linear-gradient(0deg, rgba(92,72,42,.026) 0px, rgba(92,72,42,.026) 1px, transparent 1px, transparent 4px), #e7ddc5;
  border:1px solid rgba(70,52,29,.34);
  box-shadow:0 38px 110px rgba(0,0,0,.62), inset 0 0 0 5px rgba(255,255,255,.22);
  display:flex;
  flex-direction:column;
  overflow:hidden;
  backdrop-filter:blur(20px);
}

.upp2-modal::before {
  content:'';
  position:absolute;
  inset:0;
  border:1px solid rgba(98,229,229,.08);
  pointer-events:none;
}

/* scrollbar */
.upp2-scroll { overflow-y:auto; scrollbar-width:thin; scrollbar-color:rgba(212,86,30,.4) transparent; }
.upp2-scroll::-webkit-scrollbar { width:2px; }
.upp2-scroll::-webkit-scrollbar-thumb { background:rgba(212,86,30,.35); }

/* chrome */
.upp2-chrome {
  height:42px; flex-shrink:0;
  background:linear-gradient(180deg, rgba(6,18,23,.96) 0%, rgba(5,14,18,.94) 100%);
  border-bottom:1px solid rgba(98,229,229,.12);
  display:flex; align-items:center; padding:0 14px; gap:12px;
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
.upp2-chrome-close {
  width:28px;
  height:28px;
  padding:0;
  display:inline-flex;
  align-items:center;
  justify-content:center;
  font-family:'Barlow Condensed',sans-serif;
  font-size:16px;
  letter-spacing:0;
}

/* definitive header */
.upp2-hero {
  position:relative;
  flex-shrink:0;
  padding:12px 14px 10px;
  background:
    radial-gradient(circle at 82% 18%, rgba(0,214,214,.08), transparent 24%),
    linear-gradient(180deg, rgba(5,20,25,.98) 0%, rgba(5,13,18,.97) 100%);
  border-bottom:1px solid rgba(98,229,229,.1);
}
.upp2-hero::before {
  content:'';
  position:absolute;
  inset:0;
  background:
    linear-gradient(90deg, rgba(255,255,255,.018) 1px, transparent 1px),
    linear-gradient(180deg, rgba(255,255,255,.018) 1px, transparent 1px);
  background-size:28px 28px;
  opacity:.12;
  pointer-events:none;
}
.upp2-hero-stripe {
  position:absolute; top:0; left:0; right:0; height:2px;
  background:linear-gradient(90deg,var(--sc,#D4561E),rgba(var(--sc-rgb,212,86,30),.18),transparent 70%);
}
.upp2-hero-content {
  position:relative;
  z-index:2;
  display:grid;
  grid-template-columns:88px minmax(0,1.6fr) minmax(220px,.7fr);
  gap:12px;
  align-items:stretch;
}
.upp2-hero-photo {
  position:relative;
  min-height:104px;
  border:1px solid rgba(98,229,229,.16);
  background:rgba(255,255,255,.02);
  overflow:hidden;
}
.upp2-hero-photo::after {
  content:'';
  position:absolute;
  inset:auto 0 0 0;
  height:48%;
  background:linear-gradient(0deg, rgba(5,7,9,.92), transparent);
}
.upp2-hero-photo img {
  width:100%;
  height:100%;
  object-fit:cover;
  object-position:center top;
  display:block;
  filter:brightness(.78) saturate(.9);
  animation:upp2-hero .5s ease both;
}
.upp2-hero-num {
  position:absolute;
  right:10px;
  bottom:6px;
  font-family:'Bebas Neue',sans-serif;
  font-size:34px;
  line-height:.85;
  color:rgba(237,232,223,.2);
  z-index:2;
}
.upp2-hero-info {
  min-width:0;
  display:flex;
  flex-direction:column;
  justify-content:space-between;
  gap:8px;
}
.upp2-hero-eyebrow {
  display:flex;
  align-items:center;
  gap:8px;
  flex-wrap:wrap;
}
.upp2-hero-eyebrow::before { content:''; width:18px; height:2px; background:var(--sc,#D4561E); flex-shrink:0; }
.upp2-hero-nat, .upp2-hero-rank {
  font-family:'Space Mono',monospace;
  font-size:8px;
  letter-spacing:.34em;
  text-transform:uppercase;
}
.upp2-hero-nat { color:var(--sc,#D4561E); }
.upp2-hero-rank { color:rgba(237,232,223,.38); }
.upp2-hero-name {
  font-family:'Bebas Neue',sans-serif;
  font-size:clamp(34px,4.4vw,76px);
  line-height:.86;
  letter-spacing:.03em;
  text-transform:uppercase;
  color:#F6F0E8;
}
.upp2-hero-nick {
  font-family:'Space Mono',monospace;
  font-size:8px;
  letter-spacing:.24em;
  color:rgba(237,232,223,.28);
  text-transform:uppercase;
}
.upp2-hero-summary {
  display:grid;
  grid-template-columns:1fr auto;
  gap:14px;
  align-items:start;
}
.upp2-hero-summary-copy {
  min-width:0;
  padding:8px 10px;
  border-left:2px solid rgba(var(--sc-rgb,212,86,30),.75);
  background:linear-gradient(180deg, rgba(0,214,214,.06), rgba(255,255,255,.015));
  font-size:12px;
  line-height:1.45;
  color:rgba(237,232,223,.7);
}
.upp2-hero-summary-mark { display:none; }
.upp2-hero-ovr {
  min-width:112px;
  padding:8px 10px;
  border:1px solid rgba(98,229,229,.18);
  background:linear-gradient(180deg, rgba(0,214,214,.11), rgba(255,255,255,.015));
  display:flex;
  flex-direction:column;
  align-items:flex-start;
  gap:4px;
}
.upp2-ovr-label {
  font-family:'Space Mono',monospace;
  font-size:7px;
  letter-spacing:.38em;
  color:rgba(237,232,223,.28);
  text-transform:uppercase;
}
.upp2-ovr-num {
  font-family:'Bebas Neue',sans-serif;
  font-size:42px;
  line-height:.82;
  letter-spacing:.02em;
}
.upp2-ovr-div {
  width:100%;
  height:1px;
  background:linear-gradient(90deg, var(--sc,#D4561E), transparent);
  margin:2px 0 4px;
}
.upp2-ovr-grade {
  font-family:'Barlow Condensed',sans-serif;
  font-size:12px;
  letter-spacing:.14em;
  text-transform:uppercase;
}
.upp2-hero-meta {
  display:flex;
  align-items:center;
  gap:0;
  flex-wrap:wrap;
}
.upp2-hero-meta-item {
  font-family:'Space Mono',monospace;
  font-size:8px;
  letter-spacing:.22em;
  color:rgba(237,232,223,.42);
  text-transform:uppercase;
  padding:0 10px;
}
.upp2-hero-meta-item:first-child { padding-left:0; }
.upp2-hero-meta-sep { width:1px; height:9px; background:rgba(237,232,223,.12); }
.upp2-hero-badges {
  display:flex;
  flex-wrap:wrap;
  gap:6px;
}
.upp2-style-badge,
.upp2-alcunha-badge {
  display:inline-flex;
  align-items:center;
  gap:5px;
  min-height:28px;
  padding:0 10px;
  border:1px solid rgba(237,232,223,.1);
  background:rgba(255,255,255,.03);
  font-family:'Space Mono',monospace;
  font-size:8px;
  letter-spacing:.18em;
  text-transform:uppercase;
}
.upp2-style-badge {
  color:var(--sc,#D4561E);
  border-color:rgba(var(--sc-rgb,212,86,30),.28);
  background:rgba(var(--sc-rgb,212,86,30),.09);
}
.upp2-alcunha-badge {
  color:#E8C84A;
  border-color:rgba(232,200,74,.24);
  background:rgba(232,200,74,.07);
}
.upp2-hero-facts {
  position:relative;
  z-index:2;
  display:grid;
  grid-template-columns:repeat(4,minmax(0,1fr));
  gap:8px;
  margin-top:10px;
}
.upp2-hero-fact {
  padding:9px 10px 10px;
  border:1px solid rgba(98,229,229,.1);
  background:linear-gradient(180deg, rgba(255,255,255,.024), rgba(255,255,255,.012));
  min-height:0;
}
.upp2-hero-fact-kicker {
  font-family:'Space Mono',monospace; font-size:7px; letter-spacing:.28em;
  text-transform:uppercase; color:rgba(237,232,223,.34);
}
.upp2-hero-fact-value {
  margin-top:3px;
  font-family:'Bebas Neue',sans-serif; font-size:18px; line-height:.9; letter-spacing:.04em; color:#EDE8DF;
}
.upp2-hero-fact-copy {
  margin-top:3px;
  font-family:'Barlow',sans-serif; font-size:9px; line-height:1.3; color:rgba(237,232,223,.46);
}
/* navigation deck */
.upp2-tabbar {
  display:flex;
  flex-wrap:wrap;
  gap:8px;
  padding:10px 12px 12px;
  background:rgba(6,17,22,.98);
  border-top:1px solid rgba(98,229,229,.08);
  overflow-x:auto;
  flex-shrink:0;
  scrollbar-width:none;
}
.upp2-tabbar::-webkit-scrollbar { display:none; }
.upp2-tab-shell {
  display:grid;
  grid-template-columns:minmax(280px,.9fr) minmax(0,1.6fr);
  flex-shrink:0;
  border-bottom:1px solid rgba(98,229,229,.1);
  background:linear-gradient(180deg,rgba(4,15,19,.985) 0%,rgba(6,12,16,.97) 100%);
}
.upp2-groupbar {
  display:grid;
  grid-template-columns:repeat(2,minmax(0,1fr));
  gap:8px;
  padding:10px 12px;
  border-right:1px solid rgba(98,229,229,.08);
}
.upp2-groupbar::-webkit-scrollbar { display:none; }
.upp2-group {
  min-width:0;
  border:1px solid rgba(98,229,229,.1);
  background:linear-gradient(180deg, rgba(255,255,255,.025), rgba(255,255,255,.01));
  padding:10px 10px 9px;
  color:rgba(237,232,223,.42);
  display:flex; flex-direction:column; align-items:flex-start; gap:3px;
  cursor:pointer; transition:all .15s;
}
.upp2-group:hover { color:rgba(237,232,223,.72); border-color:rgba(237,232,223,.14); background:rgba(237,232,223,.04); }
.upp2-group.act {
  color:#EDE8DF;
  border-color:rgba(0,214,214,.35);
  background:rgba(0,214,214,.09);
  box-shadow:inset 0 0 0 1px rgba(0,214,214,.12);
}
.upp2-group-kicker {
  font-family:'Space Mono',monospace; font-size:7px; letter-spacing:.28em; text-transform:uppercase;
}
.upp2-group-name {
  font-family:'Bebas Neue',sans-serif; font-size:19px; letter-spacing:.04em; text-transform:uppercase; line-height:.9;
}
.upp2-group-desc {
  font-family:'Barlow',sans-serif; font-size:10px; color:rgba(237,232,223,.48); line-height:1.35; max-width:none;
}
.upp2-tab {
  font-family:'Barlow Condensed',sans-serif; font-weight:700;
  font-size:12px; letter-spacing:.14em; text-transform:uppercase;
  padding:0 14px; height:42px; border:1px solid rgba(98,229,229,.12); background:rgba(255,255,255,.02);
  color:rgba(237,232,223,.34); cursor:pointer; white-space:nowrap;
  position:relative; flex-shrink:0; transition:color .15s,background .15s,border-color .15s;
  display:flex; align-items:center; gap:7px;
}
.upp2-tab:hover { color:rgba(237,232,223,.72); background:rgba(237,232,223,.04); border-color:rgba(237,232,223,.15); }
.upp2-tab.act { color:#EDE8DF; background:rgba(0,214,214,.1); border-color:rgba(0,214,214,.3); }
.upp2-tab.act::after {
  content:''; position:absolute; left:0; top:0; bottom:0; width:2px;
  background:var(--sc,#D4561E);
}
.upp2-tab-dot { width:4px; height:4px; border-radius:50%; background:var(--sc,#D4561E); opacity:0; transition:opacity .15s; flex-shrink:0; }
.upp2-tab.act .upp2-tab-dot { opacity:1; box-shadow:0 0 5px var(--sc,#D4561E); }
.upp2-tab-meta {
  display:flex;
  align-items:flex-start;
  justify-content:space-between;
  gap:20px;
  padding:0 12px 10px;
  background:linear-gradient(180deg,rgba(12,18,23,.96) 0%,rgba(8,12,15,.94) 100%);
}
.upp2-tab-meta-copy { min-width:0; }
.upp2-tab-kicker {
  font-family:'Space Mono',monospace; font-size:7px; letter-spacing:.38em; text-transform:uppercase;
  color:var(--sc,#D4561E); margin-bottom:6px;
}
.upp2-tab-title {
  font-family:'Bebas Neue',sans-serif; font-size:22px; line-height:.92; letter-spacing:.04em; color:#EDE8DF;
}
.upp2-tab-desc {
  margin-top:5px; max-width:760px;
  font-family:'Barlow',sans-serif; font-size:11px; line-height:1.45; color:rgba(237,232,223,.58);
}
.upp2-tab-points {
  display:flex; flex-wrap:wrap; gap:6px;
}
.upp2-tab-pill {
  font-family:'Space Mono',monospace; font-size:8px; letter-spacing:.18em; text-transform:uppercase;
  color:rgba(237,232,223,.62); padding:6px 9px;
  border:1px solid rgba(237,232,223,.08); background:rgba(237,232,223,.02);
}

/* tab content */
.upp2-content { flex:1; display:flex; overflow:hidden; min-height:0; animation:upp2-in .2s both; background:radial-gradient(circle at 88% 14%, rgba(0,214,214,.07), transparent 20%), linear-gradient(180deg,rgba(6,18,23,.82),rgba(4,12,16,.45)); }

.upp2-overview {
  flex:1;
  min-height:0;
  display:grid;
  grid-template-columns:minmax(0, 1.35fr) minmax(320px, .65fr);
}

.upp2-overview-main,
.upp2-overview-side {
  min-height:0;
  overflow-y:auto;
}

.upp2-overview-main {
  padding:14px 14px 18px;
  border-right:1px solid rgba(237,232,223,.06);
}

.upp2-overview-side {
  padding:14px 12px 18px;
  background:linear-gradient(180deg, rgba(255,255,255,.02) 0%, rgba(255,255,255,.008) 100%);
}

.upp2-premium-card {
  position:relative;
  border:1px solid rgba(237,232,223,.08);
  background:linear-gradient(180deg, rgba(255,255,255,.03) 0%, rgba(255,255,255,.015) 100%);
  overflow:hidden;
}

.upp2-premium-card::before {
  content:'';
  position:absolute;
  top:0; left:0; right:0;
  height:1px;
  background:linear-gradient(90deg, rgba(var(--sc-rgb,212,86,30),.6), transparent);
}

.upp2-premium-grid {
  display:grid;
  grid-template-columns:repeat(12, minmax(0,1fr));
  gap:12px;
}

.upp2-tab-overview-btn {
  display:flex;
  flex-direction:column;
  align-items:flex-start;
  gap:4px;
  padding:12px 13px;
  border:1px solid rgba(237,232,223,.08);
  background:rgba(255,255,255,.018);
  color:rgba(237,232,223,.72);
  cursor:pointer;
  transition:all .14s;
}

.upp2-tab-overview-btn:hover {
  border-color:rgba(237,232,223,.16);
  background:rgba(255,255,255,.04);
  color:#EDE8DF;
}

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

@media (max-width: 1180px) {
  .upp2-hero {
    padding:16px 16px 12px;
  }
  .upp2-hero-content {
    grid-template-columns:96px minmax(0,1fr);
  }
  .upp2-hero-num {
    font-size:36px;
  }
  .upp2-hero-facts {
    grid-template-columns:repeat(2,minmax(0,1fr));
  }
  .upp2-tab-shell {
    grid-template-columns:1fr;
  }
  .upp2-groupbar {
    grid-template-columns:repeat(4,minmax(0,1fr));
    border-right:none;
    border-bottom:1px solid rgba(237,232,223,.05);
  }
  .upp2-tab-meta {
    flex-direction:column;
    align-items:flex-start;
  }
}

@media (max-width: 820px) {
  .upp2-modal { width:100%; height:100vh; }
  .upp2-chrome { padding:0 12px; }
  .upp2-hero-content {
    grid-template-columns:1fr;
  }
  .upp2-hero-photo { min-height:180px; }
  .upp2-hero-ovr {
    min-width:0;
  }
  .upp2-hero-summary {
    grid-template-columns:1fr;
  }
  .upp2-hero-facts {
    grid-template-columns:1fr;
  }
  .upp2-groupbar {
    grid-template-columns:1fr 1fr;
    padding:12px;
  }
  .upp2-tabbar {
    padding:12px;
  }
  .upp2-tab {
    width:100%;
    justify-content:flex-start;
  }
}

/* ---------------------------------------------------------------
   COMPACT HERO — single 78px strip replacing the old tall hero
--------------------------------------------------------------- */
.dpp-hero {
  position:relative; flex-shrink:0; height:78px;
  display:grid;
  grid-template-columns:56px minmax(260px,1.35fr) minmax(220px,1fr) 100px;
  background:linear-gradient(180deg,rgba(5,16,21,.99) 0%,rgba(4,12,16,.98) 100%);
  border-bottom:1px solid rgba(98,229,229,.13);
  overflow:hidden;
}
.dpp-hero::before {
  content:''; position:absolute; inset:0; pointer-events:none;
  background:linear-gradient(90deg,rgba(255,255,255,.016) 1px,transparent 1px),
             linear-gradient(180deg,rgba(255,255,255,.016) 1px,transparent 1px);
  background-size:28px 28px; opacity:.1;
}
.dpp-hero-stripe {
  position:absolute; top:0; left:0; right:0; height:2px;
  background:linear-gradient(90deg,var(--sc,#D4561E),rgba(var(--sc-rgb,212,86,30),.12),transparent 65%);
}
.dpp-hero-photo {
  position:relative; width:56px; height:78px; overflow:hidden; flex-shrink:0;
}
.dpp-hero-photo img {
  width:100%; height:100%; object-fit:cover; object-position:center top;
  filter:brightness(.72) saturate(.9); display:block;
}
.dpp-photo-fade {
  position:absolute; inset:0;
  background:linear-gradient(90deg,transparent 55%,rgba(4,12,16,.9));
}
.dpp-hero-body {
  display:flex; flex-direction:column; justify-content:center;
  padding:0 10px 0 11px; min-width:0; gap:3px;
  position:relative; z-index:2;
}
.dpp-hero-eyebrow {
  display:flex; align-items:center; gap:6px;
  font-family:'Space Mono',monospace; font-size:7px;
  letter-spacing:.3em; text-transform:uppercase;
  flex-wrap:wrap;
}
.dpp-hero-name {
  font-family:'Bebas Neue',sans-serif;
  font-size:clamp(22px,2.6vw,40px); line-height:.86;
  letter-spacing:.03em; text-transform:uppercase; color:#F6F0E8;
  white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
  max-width:100%;
}
.dpp-hero-meta-row {
  display:flex; align-items:center; gap:0;
  font-family:'Space Mono',monospace; font-size:7px;
  letter-spacing:.18em; color:rgba(237,232,223,.36); text-transform:uppercase;
}
.dpp-meta-sep { width:1px; height:8px; background:rgba(237,232,223,.12); margin:0 7px; }
.dpp-hero-badges { display:flex; flex-wrap:wrap; gap:3px; }
.dpp-badge {
  font-family:'Space Mono',monospace; font-size:6.5px; letter-spacing:.14em;
  text-transform:uppercase; padding:2px 6px;
  border:1px solid rgba(237,232,223,.1); background:rgba(255,255,255,.03);
  color:rgba(237,232,223,.65); white-space:nowrap;
}
.dpp-badge-gold { color:#E8C84A; border-color:rgba(232,200,74,.22); background:rgba(232,200,74,.07); }
.dpp-badge-dim  { color:rgba(237,232,223,.68); border-color:rgba(237,232,223,.09); }

/* facts strip — 4 cells right of the name */
.dpp-hero-facts {
  display:grid; grid-template-columns:repeat(4,minmax(72px,1fr));
  border-left:1px solid rgba(237,232,223,.06);
  min-width:0;
  overflow:hidden;
}
.dpp-hero-fact {
  display:flex; flex-direction:column; justify-content:center;
  padding:0 12px; border-right:1px solid rgba(237,232,223,.05); gap:2px;
  min-width:0;
}
.dpp-hero-fact:last-child { border-right:none; }
.dpp-fact-kicker {
  font-family:'Space Mono',monospace; font-size:5.5px; letter-spacing:.3em;
  text-transform:uppercase; color:rgba(237,232,223,.26);
}
.dpp-fact-value {
  font-family:'Bebas Neue',sans-serif; font-size:18px; line-height:.88;
  letter-spacing:.02em; color:#EDE8DF;
}
.dpp-fact-copy {
  font-family:'Barlow',sans-serif; font-size:7.5px; color:rgba(237,232,223,.35);
  white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
}

/* OVR block */
.dpp-hero-ovr {
  display:flex; flex-direction:column; align-items:center; justify-content:center;
  border-left:1px solid rgba(237,232,223,.06); padding:0 10px; gap:1px; flex-shrink:0;
}
.dpp-ovr-grade {
  font-family:'Bebas Neue',sans-serif; font-size:34px; line-height:.82; letter-spacing:.02em;
}
.dpp-ovr-kicker {
  font-family:'Space Mono',monospace; font-size:6px; letter-spacing:.34em;
  text-transform:uppercase; color:rgba(237,232,223,.26); margin-top:2px;
}
.dpp-ovr-tier {
  font-family:'Barlow Condensed',sans-serif; font-size:9px; letter-spacing:.12em; text-transform:uppercase;
}

/* ---------------------------------------------------------------
   SINGLE-LEVEL NAV — replaces the two-tier groupbar/tabbar
--------------------------------------------------------------- */
.dpp-nav {
  display:flex; align-items:stretch; height:36px; flex-shrink:0;
  background:linear-gradient(180deg,rgba(5,14,18,.99),rgba(4,10,14,.98));
  border-bottom:1px solid rgba(98,229,229,.1);
  overflow-x:auto; scrollbar-width:none;
}
.dpp-nav::-webkit-scrollbar { display:none; }
.dpp-nav-group-label {
  display:flex; align-items:center; padding:0 6px 0 10px; flex-shrink:0;
  font-family:'Space Mono',monospace; font-size:5.5px; letter-spacing:.38em;
  text-transform:uppercase; color:rgba(237,232,223,.18); white-space:nowrap;
  border-right:1px solid rgba(237,232,223,.06);
}
.dpp-nav-group-label:first-child { border-left:none; }
.dpp-nav-tab {
  font-family:'Barlow Condensed',sans-serif; font-weight:700;
  font-size:11px; letter-spacing:.1em; text-transform:uppercase;
  padding:0 10px; height:36px; border:none; background:none;
  color:rgba(237,232,223,.3); cursor:pointer; white-space:nowrap;
  position:relative; flex-shrink:0; transition:color .12s,background .12s;
  border-right:1px solid rgba(237,232,223,.04);
}
.dpp-nav-tab:hover { color:rgba(237,232,223,.76); background:rgba(237,232,223,.04); }
.dpp-nav-tab.act { color:#EDE8DF; background:rgba(0,214,214,.07); }
.dpp-nav-tab.act::after {
  content:''; position:absolute; left:0; right:0; bottom:0; height:2px;
  background:var(--sc,#D4561E);
}

/* ---------------------------------------------------------------
   FM OVERVIEW — 3-col dashboard, no scroll needed
--------------------------------------------------------------- */
.dpp-fm {
  flex:1; min-height:0;
  display:grid; grid-template-columns:minmax(180px,.27fr) minmax(0,.46fr) minmax(180px,.27fr);
  overflow:hidden;
}
.dpp-fm-col {
  min-height:0; overflow-y:auto; padding:10px 11px;
  scrollbar-width:thin; scrollbar-color:rgba(212,86,30,.25) transparent;
}
.dpp-fm-col::-webkit-scrollbar { width:2px; }
.dpp-fm-col::-webkit-scrollbar-thumb { background:rgba(212,86,30,.25); }
.dpp-fm-col + .dpp-fm-col { border-left:1px solid rgba(237,232,223,.055); }

/* section header */
.dpp-fm-sh {
  font-family:'Space Mono',monospace; font-size:6px; letter-spacing:.42em;
  text-transform:uppercase; color:rgba(237,232,223,.2);
  display:flex; align-items:center; gap:7px;
  margin:11px 0 7px; padding-top:11px;
  border-top:1px solid rgba(237,232,223,.05);
}
.dpp-fm-sh:first-child { margin-top:0; padding-top:0; border-top:none; }
.dpp-fm-sh::before { content:''; width:9px; height:1px; background:var(--sc,#D4561E); flex-shrink:0; }

/* compact attr row */
.dpp-fm-attr { display:flex; align-items:center; gap:5px; margin-bottom:3px; }
.dpp-fm-attr-lbl {
  font-family:'Barlow Condensed',sans-serif; font-weight:600; font-size:9.5px;
  letter-spacing:.04em; text-transform:uppercase; color:rgba(237,232,223,.44);
  flex:1; min-width:0; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
}
.dpp-fm-attr-val {
  font-family:'Bebas Neue',sans-serif; font-size:13px; line-height:1;
  min-width:20px; text-align:right;
}
.dpp-fm-attr-bar { flex:0 0 48px; height:3px; background:rgba(237,232,223,.07); }
.dpp-fm-attr-fill { height:100%; transition:width .4s; }

/* stat bar */
.dpp-fm-stat { margin-bottom:5px; }
.dpp-fm-stat-head { display:flex; justify-content:space-between; margin-bottom:2px; }
.dpp-fm-stat-lbl {
  font-family:'Barlow Condensed',sans-serif; font-weight:600; font-size:10px;
  letter-spacing:.05em; text-transform:uppercase; color:rgba(237,232,223,.44);
}
.dpp-fm-stat-val { font-family:'Space Mono',monospace; font-size:8.5px; color:rgba(237,232,223,.66); }
.dpp-fm-stat-track { height:4px; background:rgba(237,232,223,.07); }
.dpp-fm-stat-fill  { height:100%; }

/* identity card */
.dpp-fm-id {
  padding:9px 11px; position:relative; overflow:hidden; margin-bottom:8px;
  border:1px solid rgba(98,229,229,.1);
  background:linear-gradient(180deg,rgba(255,255,255,.03),rgba(255,255,255,.01));
}
.dpp-fm-id::before {
  content:''; position:absolute; top:0; left:0; right:0; height:1px;
  background:linear-gradient(90deg,var(--sc,#D4561E),transparent);
}
.dpp-fm-id-headline {
  font-family:'Bebas Neue',sans-serif; font-size:17px; line-height:.9;
  letter-spacing:.03em; text-transform:uppercase; color:#EDE8DF; margin-bottom:5px;
}
.dpp-fm-id-body {
  font-family:'Barlow',sans-serif; font-size:10px; line-height:1.55;
  color:rgba(237,232,223,.6);
}

/* 2×2 quick stats */
.dpp-fm-qs { display:grid; grid-template-columns:1fr 1fr; gap:3px; margin-bottom:4px; }
.dpp-fm-qs-item { padding:6px 8px; border:1px solid rgba(237,232,223,.06); background:rgba(255,255,255,.015); }
.dpp-fm-qs-lbl {
  font-family:'Space Mono',monospace; font-size:5.5px; letter-spacing:.28em;
  text-transform:uppercase; color:rgba(237,232,223,.24); margin-bottom:2px;
}
.dpp-fm-qs-val { font-family:'Bebas Neue',sans-serif; font-size:17px; line-height:.9; }

/* coach row */
.dpp-fm-coach {
  display:flex; align-items:center; gap:8px; padding:7px 9px; margin-bottom:3px;
  border:1px solid rgba(237,232,223,.07); background:rgba(255,255,255,.015);
}
.dpp-fm-coach-name {
  font-family:'Barlow Condensed',sans-serif; font-weight:700; font-size:12px;
  letter-spacing:.04em; text-transform:uppercase; color:#EDE8DF;
}
.dpp-fm-coach-role {
  font-family:'Space Mono',monospace; font-size:6.5px; letter-spacing:.18em;
  text-transform:uppercase; color:rgba(237,232,223,.34);
}

/* dna row */
.dpp-fm-dna-row {
  display:flex; justify-content:space-between; align-items:baseline;
  padding:3px 0; border-bottom:1px solid rgba(237,232,223,.04);
}
.dpp-fm-dna-lbl {
  font-family:'Space Mono',monospace; font-size:6px; letter-spacing:.2em;
  text-transform:uppercase; color:rgba(237,232,223,.26);
}
.dpp-fm-dna-val {
  font-family:'Barlow Condensed',sans-serif; font-weight:700; font-size:11px;
  color:rgba(237,232,223,.7); text-transform:uppercase; letter-spacing:.04em;
  max-width:55%; text-align:right;
  white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
}

/* form dot */
.dpp-fm-form-dot { display:inline-block; width:7px; height:7px; border-radius:50%; margin:0 1.5px; }

/* radar wrap */
.dpp-radar-wrap {
  display:flex; justify-content:center; align-items:center;
  border:1px solid rgba(98,229,229,.1); background:rgba(255,255,255,.014);
  margin-bottom:8px; padding:6px;
}

/* shortcut btn */
.dpp-fm-shortcut {
  display:flex; align-items:center; gap:7px; width:100%;
  padding:5px 8px; margin-bottom:3px;
  border:1px solid rgba(237,232,223,.07); background:rgba(255,255,255,.014);
  font-family:'Barlow Condensed',sans-serif; font-weight:700; font-size:11px;
  letter-spacing:.07em; text-transform:uppercase; color:rgba(237,232,223,.58);
  cursor:pointer; transition:all .12s;
}
.dpp-fm-shortcut:hover { background:rgba(237,232,223,.04); color:#EDE8DF; border-color:rgba(237,232,223,.13); }

/* Dossiê em papel: modal de arquivo, separado visualmente da transmissão. */
.upp2-chrome { background:rgba(242,235,216,.94); border-bottom:1px solid rgba(63,48,29,.20); }
.upp2-chrome-btn { border-color:rgba(63,48,29,.18); color:rgba(47,37,25,.62); }
.upp2-chrome-btn:hover { background:rgba(116,83,35,.09); color:#241E16; border-color:rgba(63,48,29,.36); }
.dpp-hero { background:linear-gradient(90deg,#31271c 0%,#211b15 48%,#292016 100%); border-bottom-color:rgba(63,48,29,.35); }
.dpp-nav { background:#d8c9aa; border-bottom-color:rgba(63,48,29,.22); }
.dpp-nav-tab { color:rgba(47,37,25,.58); }
.dpp-nav-tab:hover { color:#241E16; background:rgba(116,83,35,.10); }
.dpp-nav-tab.act { color:#241E16; background:rgba(255,255,255,.34); }
.upp2-content { background:transparent; }
.archive-page { flex:1; overflow:auto; padding:28px clamp(20px,3vw,46px) 44px; color:#281f15; }
.archive-kicker { font-family:'Space Mono',monospace; font-size:8px; letter-spacing:.34em; text-transform:uppercase; color:#80633a; }
.archive-title { margin-top:7px; font-family:'Bebas Neue',sans-serif; font-size:clamp(42px,5.2vw,82px); line-height:.82; letter-spacing:.025em; color:#281f15; text-transform:uppercase; }
.archive-card { border:1px solid rgba(69,52,28,.23); background:rgba(255,251,239,.50); box-shadow:0 8px 24px rgba(62,45,22,.055); }
.archive-metric { padding:14px 15px; border-left:1px solid rgba(69,52,28,.16); }
.archive-metric:first-child { border-left:none; }
.archive-label { font-family:'Space Mono',monospace; font-size:7px; letter-spacing:.24em; text-transform:uppercase; color:#806f55; }
.archive-value { margin-top:6px; font-family:'Bebas Neue',sans-serif; font-size:31px; line-height:.86; color:#281f15; }
.archive-copy { font-family:'Barlow',sans-serif; font-size:12px; line-height:1.65; color:#625441; }
.archive-season { text-align:left; cursor:pointer; padding:10px 11px; border:1px solid rgba(69,52,28,.18); background:rgba(255,255,255,.25); color:#493925; transition:.16s; }
.archive-season:hover,.archive-season.active { background:#31271c; color:#f3e9d3; border-color:#31271c; transform:translateY(-2px); }
.archive-season-year { font-family:'Bebas Neue',sans-serif; font-size:23px; line-height:.9; }
.archive-season-meta { margin-top:4px; font-family:'Space Mono',monospace; font-size:7px; letter-spacing:.12em; opacity:.7; }
.archive-bar { height:6px; background:rgba(69,52,28,.10); overflow:hidden; }
.archive-bar > span { display:block; height:100%; background:var(--bar,#a0562c); }

/* Abas legadas traziam branco explícito do antigo tema de transmissão. Só
   dentro do corpo do dossiê, convertemos esses neutros para tinta legível;
   os acentos semânticos (ouro, lesão, superfície) continuam intactos. */
.upp2-content [style*="237, 232, 223"],
.upp2-content [style*="246, 240, 232"] { color:#3B2F21 !important; }
.upp2-content [style*="237,230,216"] { color:#3B2F21 !important; }
.upp2-content .upp2-scroll { color:#3B2F21; }

/* Regra final de contraste do dossiê. As abas foram escritas ao longo de
   versões com temas diferentes; texto não pode mais herdar branco translúcido
   sobre papel. Cores de informação ficam em traços, selos e barras — a tinta
   permanece sempre legível, independentemente da aba aberta. */
.upp2-content *,
.upp2-content button,
.upp2-content input,
.upp2-content select,
.upp2-content textarea { color:#3B2F21 !important; text-shadow:none !important; }
.upp2-content svg text { fill:#3B2F21 !important; }
.upp2-content button[disabled] { color:rgba(59,47,33,.34) !important; }

/* O cabeçalho é o único campo escuro. Mesmo nele, a tipografia é pergaminho
   acinzentado/terracota — sem branco e sem amarelo chamativo. */
.dpp-hero *, .dpp-hero [style] { color:#C7B89D !important; text-shadow:none !important; }
.dpp-hero .dpp-badge-gold { color:#B9784A !important; border-color:rgba(185,120,74,.45) !important; background:rgba(185,120,74,.10) !important; }
.dpp-hero .dpp-hero-name { color:#D4C6AD !important; }
`;
  const el = existingStyle ?? document.createElement('style');
  el.id = 'dpp-css';
  el.textContent = css;
  if (!existingStyle) document.head.appendChild(el);
}

// -----------------------------------------------------------------
// HELPERS
// -----------------------------------------------------------------
const ROUND_LABEL = { W:'Título', F:'Final', SF:'Semifinal', QF:'Quartas', R16:'Oitavas', R32:'3ª Rodada', R64:'2ª Rodada', R128:'1ª Rodada' };
const CAT_COLOR = { GRAND_SLAM:'#FFD700', SLAM_CLASH:'#FF8A3D', MASTERS_1000:'#E040FB', ATP_500:'#00BCD4', ATP_250:'#66BB6A', ATP_100:'#FF7043', FINALS:'#F44336', ATP_PROSPECTS:'#FF7043' };
const SURFACE_COLOR = { HARD:'#4A90D9', CLAY:'#C4572A', GRASS:'#2E7D32', INDOOR:'#8B2FAA', STREET:'#B45309', CARPET:'#8B1A3A' };
const CAT_SHORT = { GRAND_SLAM:'GS', SLAM_CLASH:'CS', MASTERS_1000:'M1000', ATP_500:'ATP 500', ATP_250:'ATP 250', ATP_100:'ATP 100', FINALS:'Finals', ATP_PROSPECTS:'Prospects' };
const SURF_COLOR = { CLAY:'#C4572A', GRASS:'#2ECC71', HARD:'#4A90D9', STREET:'#EF9F27', CARPET:'#C4426A', INDOOR:'#C84FEB' };
const SURF_LABEL = { CLAY:'Saibro', GRASS:'Grama', HARD:'Dura', STREET:'Asfalto', CARPET:'Veludo', INDOOR:'Indoor' };
const SURF_ICON  = { CLAY:'??', GRASS:'??', HARD:'???', STREET:'???', CARPET:'??', INDOOR:'???' };

const PERSONA_COLOR = {
  CHARISMATIC:'#F59E0B', RESERVED:'#64748B', CONFRONTATIONAL:'#EF4444',
  SHOWMAN:'#EC4899', DIPLOMATIC:'#22C55E', ENIGMATIC:'#A855F7', INTELLECTUAL:'#3B82F6',
};
const ARCH_COLOR = {
  PERFECTIONIST:'#00BCD4', WARRIOR:'#F06428', ARTIST:'#E040FB',
  REBEL:'#FF5722', TACTICIAN:'#4CAF50', PREDATOR:'#F44336', DREAMER:'#FFD700',
};
const ARCH_ICON = { PERFECTIONIST:'??', WARRIOR:'??', ARTIST:'??', REBEL:'??', TACTICIAN:'??', PREDATOR:'??', DREAMER:'?' };
const REP_COLOR = {
  ICON:'#FFD700', VILLAIN:'#EF4444', UNDERDOG:'#22C55E', PRODIGY:'#EC4899',
  MYSTERIOUS:'#A855F7', CONTROVERSIAL:'#F97316', RISING_STAR:'#3B82F6', VETERAN:'#94A3B8',
};
const REP_ICON = { ICON:'??', VILLAIN:'??', UNDERDOG:'??', PRODIGY:'?', MYSTERIOUS:'???', CONTROVERSIAL:'?', RISING_STAR:'??', VETERAN:'??' };
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
  FIRST_SLAM:         { color:'#FFD700', icon:'?', label:'Primeiro Grand Slam' },
  TITLE_WHILE_INJURED:{ color:'#00BCD4', icon:'??', label:'Título Lesionado' },
  DROUGHT_START:      { color:'#EF4444', icon:'??', label:'Seca de Títulos' },
  DROUGHT_END:        { color:'#22C55E', icon:'??', label:'Fim da Seca' },
  INJURY_TRANSFORMS:  { color:'#F97316', icon:'??', label:'Lesão Transformadora' },
  COMEBACK:           { color:'#22C55E', icon:'??', label:'Retorno' },
  DECLINE_START:      { color:'#94A3B8', icon:'??', label:'Início do Declínio' },
  FAREWELL:           { color:'#E8C84A', icon:'??', label:'Tour de Despedida' },
  PERSONA_SHIFT:      { color:'#A855F7', icon:'??', label:'Virada de Personalidade' },
  REPUTATION_CHANGE:  { color:'#3B82F6', icon:'??', label:'Reputação Evolui' },
  MOOD_CRISIS:        { color:'#DC2626', icon:'?', label:'Crise' },
  COACH_RUPTURE:      { color:'#F59E0B', icon:'??', label:'Ruptura com Técnico' },
  RIVALRY_IMPACT:     { color:'#EF4444', icon:'??', label:'Rivalidade Define' },
  MARKET_PEAK:        { color:'#FFD700', icon:'??', label:'Auge de Visibilidade' },
};
const TIER_COLOR = { NICHE:'#64748B', LOCAL:'#94A3B8', NACIONAL:'#F59E0B', GLOBAL:'#3B82F6', ICONE:'#FFD700' };

const RIVALRY_META = {
  CLASSIC:      { label:'Clássica',           icon:'??',  color:'#FFD700' },
  DOMINATION:   { label:'Domin?ncia',         icon:'??',  color:'#EF4444' },
  GIANT_KILLER: { label:'Caçador de Gigantes',icon:'??',  color:'#22C55E' },
  GRUDGE:       { label:'Rancor',             icon:'??',  color:'#F97316' },
  FINALS_CURSE: { label:'Maldição das Finais',icon:'??',  color:'#C084FC' },
  THRONE_RIVALS:{ label:'Rivais do Trono',    icon:'??',  color:'#06B6D4' },
  ERA_CLASH:    { label:'Choque de Eras',     icon:'??',  color:'#A855F7' },
};
const RIVALRY_STATUS = {
  BREWING:   { label:'Emergindo', color:'#94A3B8' },
  ACTIVE:    { label:'Ativa',     color:'#22C55E' },
  INTENSE:   { label:'Intensa',   color:'#F97316' },
  LEGENDARY: { label:'Lendária',  color:'#FFD700' },
  FROZEN:    { label:'Encerrada', color:'#60A5FA' },
};
const PHIL_META = {
  OFFENSIVE:  { label:'Ofensivo',    icon:'?', color:'#F06428' },
  DEFENSIVE:  { label:'Defensivo',   icon:'???', color:'#2860A8' },
  COMPLETE:   { label:'Completo',    icon:'??', color:'#22C55E' },
  SPECIALIST: { label:'Especialista',icon:'??', color:'#E8C84A' },
  MENTAL:     { label:'Mental',      icon:'??', color:'#AA44FF' },
};
const OUTCOME_META = {
  EXCEEDED:{ label:'Superada', color:'#22C55E', icon:'??' },
  MET:     { label:'Cumprida', color:'#4CAF50', icon:'?' },
  PARTIAL: { label:'Parcial',  color:'#FF9800', icon:'?' },
  FAILED:  { label:'Falhada',  color:'#F44336', icon:'?'  },
};
// -----------------------------------------------------------------
// SHARED MICRO-COMPONENTS
// -----------------------------------------------------------------

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

function MiniBar({ value = 0, color = '#00D6D6', height = 4, showGlow = false }) {
  const pct = Math.max(0, Math.min(100, Number(value) || 0));
  return (
    <div style={{ height, background:'rgba(237,232,223,.06)', position:'relative', overflow:'hidden' }}>
      <div
        style={{
          position:'absolute',
          left:0,
          top:0,
          bottom:0,
          width:`${pct}%`,
          background:color,
          transition:'width .35s ease',
          boxShadow:showGlow ? `0 0 10px ${color}66` : undefined,
        }}
      />
    </div>
  );
}

function toDisplayText(value, fallback = '—') {
  if (value == null || value === false) return fallback;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed || fallback;
  }
  if (typeof value === 'number') return Number.isFinite(value) ? `${value}` : fallback;
  if (typeof value === 'boolean') return value ? 'sim' : 'não';
  if (Array.isArray(value)) {
    const parts = value.map((entry) => toDisplayText(entry, '')).filter(Boolean);
    return parts.length ? parts.join(' • ') : fallback;
  }
  if (typeof value === 'object') {
    const preferred = [
      value.label,
      value.name,
      value.title,
      value.summary,
      value.description,
      value.claim,
      value.text,
      value.id,
    ].map((entry) => toDisplayText(entry, '')).find(Boolean);
    if (preferred) return preferred;
  }
  return fallback;
}

function CategoryRadar({ np, sc }) {
  const cats = ATTR_CATEGORIES.slice(0, 6).map(cat => ({
    label: cat.label,
    value: catAvg(cat.id, np?.attrs ?? {}),
  }));
  const size = 188;
  const center = size / 2;
  const radius = 66;
  const rings = [20, 40, 60, 80, 100];
  const points = cats.map((cat, index) => {
    const angle = (-Math.PI / 2) + (index * Math.PI * 2 / cats.length);
    const r = radius * ((Number(cat.value) || 0) / 100);
    return {
      ...cat,
      angle,
      x: center + Math.cos(angle) * r,
      y: center + Math.sin(angle) * r,
      lx: center + Math.cos(angle) * (radius + 18),
      ly: center + Math.sin(angle) * (radius + 18),
      ox: center + Math.cos(angle) * radius,
      oy: center + Math.sin(angle) * radius,
    };
  });
  const polygon = points.map(point => `${point.x},${point.y}`).join(' ');

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-label="Radar de categorias">
      {rings.map((ring) => {
        const ringRadius = radius * (ring / 100);
        const ringPoints = cats.map((_, index) => {
          const angle = (-Math.PI / 2) + (index * Math.PI * 2 / cats.length);
          return `${center + Math.cos(angle) * ringRadius},${center + Math.sin(angle) * ringRadius}`;
        }).join(' ');
        return <polygon key={ring} points={ringPoints} fill="none" stroke="rgba(237,232,223,.09)" strokeWidth="1" />;
      })}

      {points.map((point) => (
        <line key={`${point.label}-axis`} x1={center} y1={center} x2={point.ox} y2={point.oy} stroke="rgba(237,232,223,.08)" strokeWidth="1" />
      ))}

      <polygon points={polygon} fill={`${sc}33`} stroke={sc} strokeWidth="2" />

      {points.map((point) => (
        <g key={point.label}>
          <circle cx={point.x} cy={point.y} r="3.5" fill={sc} />
          <text
            x={point.lx}
            y={point.ly}
            fill="rgba(237,232,223,.7)"
            fontSize="8"
            textAnchor="middle"
            fontFamily="'Space Mono', monospace"
            letterSpacing="1"
          >
            {point.label.slice(0, 6).toUpperCase()}
          </text>
        </g>
      ))}
    </svg>
  );
}

function AttrRow({ label, attrKey, value, color, burdenFlag }) {
  const visual = attrTierVisual(value);
  const desc   = attrKey ? attrDescriptor(attrKey, value) : null;
  const tierLabel = {
    elite: '? ELITE', great: '? FORTE', solid: 'SÓLIDO', average: 'MÉDIO', weak: '? FRACO',
  }[visual.tier] ?? '';
  return (
    <div className="upp2-attr-wrap">
      <div className="upp2-attr-head">
        <span className="upp2-attr-lbl" style={{ color: visual.tier === 'elite' ? 'rgba(237,232,223,.75)' : undefined }}>
          {label}
          {burdenFlag && (
            <span style={{ marginLeft:5, fontFamily:'monospace', fontSize:8,
              color:'#FF7043', letterSpacing:1, opacity:.85 }}>?</span>
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
  const formatDetailValue = (input) => {
    if (input == null || input === false) return null;
    if (typeof input === 'string') {
      const trimmed = input.trim();
      return trimmed || null;
    }
    if (typeof input === 'number') return Number.isFinite(input) ? `${input}` : null;
    if (typeof input === 'boolean') return input ? 'sim' : 'não';
    if (Array.isArray(input)) {
      const parts = input.map(formatDetailValue).filter(Boolean);
      return parts.length ? parts.join(' • ') : null;
    }
    if (typeof input === 'object') {
      const preferred = [
        input.label,
        input.name,
        input.title,
        input.claim,
        input.summary,
        input.desc,
        input.abbr,
        input.id,
      ].map(formatDetailValue).find(Boolean);
      if (preferred) return preferred;

      const primitiveValues = Object.values(input)
        .filter((entry) => ['string', 'number', 'boolean'].includes(typeof entry))
        .map(formatDetailValue)
        .filter(Boolean);
      if (primitiveValues.length) return primitiveValues.join(' • ');
    }
    return null;
  };

  const renderedValue = formatDetailValue(value);
  if (!renderedValue) return null;
  return (
    <div style={{ display:'flex', gap:8, alignItems:'baseline', marginBottom:4 }}>
      <span style={{ fontFamily:T.mono, fontSize:7, letterSpacing:'.3em', textTransform:'uppercase', color:T.inkFaint, flexShrink:0, minWidth:90 }}>{label}</span>
      <span style={{ fontFamily:T.body, fontSize:12, color:color??T.inkDim, lineHeight:1.5 }}>{renderedValue}</span>
    </div>
  );
}

function buildTrajectorySnapshot(np, rankingStore) {
  const history = Array.isArray(np?._seasonHistory) ? np._seasonHistory : [];
  const rankHist = Array.isArray(np?._rankHistory) ? np._rankHistory : [];
  const currentRankRaw = rankingStore ? getPlayerRank(rankingStore, np?.id) : (np?.rankPosition ?? null);
  const currentRank = Number.isFinite(currentRankRaw) && currentRankRaw < 9999 ? currentRankRaw : null;
  const peakRank = rankHist.length ? Math.min(...rankHist.map(h => h.rank).filter(r => Number.isFinite(r) && r > 0)) : null;
  const peakOvr = history.length ? Math.max(...history.map(h => Number(h.ovr) || 0)) : overallRating(np?.attrs ?? {});
  const lastSeason = history.at(-1) ?? null;
  const previousSeason = history.length > 1 ? history.at(-2) : null;
  const latestDelta = lastSeason && previousSeason ? (Number(lastSeason.ovr) || 0) - (Number(previousSeason.ovr) || 0) : (lastSeason?.ovrDelta ?? 0);
  const slamYears = history.filter(h => ['SLAM', 'GRAND_SLAM'].includes(h?.titleWon)).map(h => h.year);
  const bestSeason = history.reduce((best, season) => {
    if (!best) return season;
    if ((season?.ovr ?? 0) > (best?.ovr ?? 0)) return season;
    if ((season?.ovr ?? 0) === (best?.ovr ?? 0) && (season?.year ?? 0) > (best?.year ?? 0)) return season;
    return best;
  }, null);
  return {
    history,
    rankHist,
    currentRank,
    peakRank,
    peakOvr,
    lastSeason,
    previousSeason,
    latestDelta,
    slamYears,
    bestSeason,
  };
}

function ArchiveDossierOverview({ np, sc, rankingStore, year, identityProfile, setActiveTab, tournamentResults, coachMarket }) {
  const trajectory = useMemo(() => buildTrajectorySnapshot(np, rankingStore), [np, rankingStore]);
  const biography = useMemo(() => buildPlayerBiography(np, { tournamentResults, rankingStore, currentYear:year }), [np, tournamentResults, rankingStore, year]);
  const [selectedYear, setSelectedYear] = useState(null);
  // O ledger pode conter snapshots mensais (2035.0833, 2035.1666...). Para o
  // dossiê, condensamos isso em uma temporada por ano e preservamos o último
  // estado conhecido daquele ano, que é o retrato mais fiel do encerramento.
  const history = useMemo(() => {
    const byYear = new Map();
    for (const row of trajectory.history ?? []) {
      const rawYear = Number(row?.year);
      if (!Number.isFinite(rawYear)) continue;
      const season = Math.floor(rawYear);
      const previous = byYear.get(season);
      if (!previous || rawYear >= previous._rawYear) byYear.set(season, { ...row, year:season, _rawYear:rawYear });
    }
    return [...byYear.values()].sort((a,b) => a.year - b.year);
  }, [trajectory.history]);
  const selected = history.find(h => String(h.year) === String(selectedYear)) ?? history[history.length - 1] ?? null;
  const selectedIndex = selected ? history.indexOf(selected) : -1;
  const previous = selectedIndex > 0 ? history[selectedIndex - 1] : null;
  const rank = trajectory.currentRank ?? np?.rankPosition ?? null;
  const peakRank = trajectory.peakRank ?? np?.careerBest?.rank ?? null;
  const totalTitles = Object.values(np?.careerTitles ?? {}).reduce((sum, v) => sum + (Number(v) || 0), 0);
  const talent = getTalentIdentityPresentation(np);
  const currentCoach = getPlayerCoach(np, coachMarket);
  const attrs = Object.entries(np?.attrs ?? {}).filter(([,v]) => Number.isFinite(v)).sort((a,b) => b[1]-a[1]).slice(0,4);
  const attrLabel = key => ATTR_CATEGORIES.flatMap(c=>c.attrs).find(a=>a.key===key)?.label ?? key;
  const narrative = String(biography.summary ?? biography.fullNarrative ?? identityProfile?.signature?.subline ?? '')
    .split(/\n{2,}/).map(x=>x.trim()).filter(Boolean)[0] ?? 'A carreira ainda está escrevendo seu primeiro capítulo relevante.';
  const yearOvrDelta = selected && previous && Number.isFinite(selected.ovr) && Number.isFinite(previous.ovr) ? selected.ovr - previous.ovr : null;
  const yearRankDelta = selected && previous && Number.isFinite(selected.rank) && Number.isFinite(previous.rank) ? previous.rank - selected.rank : null;
  const maxOvr = Math.max(1, ...history.map(h => Number(h.ovr) || 0), overallRating(np.attrs));
  const metric = (label, value, note, color='#281f15') => <div className="archive-metric" key={label}><div className="archive-label">{label}</div><div className="archive-value" style={{color}}>{value}</div><div className="archive-copy" style={{fontSize:10, marginTop:5}}>{note}</div></div>;
  return (
    <div className="archive-page">
      <div style={{ display:'flex', justifyContent:'space-between', gap:24, alignItems:'end', marginBottom:22 }}>
        <div><div className="archive-kicker">arquivo central do circuito · dossiê vivo</div><div className="archive-title">{biography.headline ?? `${np.name}, em arquivo`}</div></div>
        <button onClick={() => setActiveTab('biografia')} style={{ cursor:'pointer', padding:'9px 12px', border:'1px solid rgba(69,52,28,.28)', background:'transparent', fontFamily:T.mono, fontSize:7, letterSpacing:'.2em', textTransform:'uppercase', color:'#5e4930' }}>Ler arquivo completo →</button>
      </div>

      <div className="archive-card" style={{ display:'grid', gridTemplateColumns:'repeat(5,minmax(0,1fr))', marginBottom:16 }}>
        {metric('ranking atual', rank ? `#${rank}` : '—', 'posição no circuito', sc)}
        {metric('melhor ranking', peakRank ? `#${peakRank}` : '—', 'pico de carreira', '#9a762c')}
        {metric('títulos', totalTitles, totalTitles ? 'troféus oficiais' : 'currículo em aberto')}
        {metric('rota', talent.routeLabel ?? 'em leitura', talent.origin?.label ?? 'origem em leitura', '#7a4f2e')}
        {metric('banco', currentCoach?.name?.split(' ').slice(-1)[0] ?? 'livre', currentCoach?.methodLabel ?? 'sem técnico ativo', '#516a70')}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'minmax(0,1.35fr) minmax(280px,.65fr)', gap:16, marginBottom:16 }}>
        <article className="archive-card" style={{ padding:'23px 24px', borderLeft:`4px solid ${sc}` }}>
          <div className="archive-kicker" style={{ color:sc }}>a leitura do momento</div>
          <p style={{ margin:'11px 0 0', fontFamily:T.body, fontSize:'clamp(15px,1.25vw,18px)', lineHeight:1.72, color:'#382d20', maxWidth:880 }}>{narrative}</p>
          <div style={{ display:'flex', flexWrap:'wrap', gap:7, marginTop:16 }}>
            {[talent.origin?.label, talent.routeLabel, talent.routeNodes?.find(n=>n.selected)?.label, ...(biography.narrativeSignals ?? []).slice(0,3)].filter(Boolean).map(tag => <span key={tag} style={{ border:`1px solid ${sc}55`, padding:'5px 7px', fontFamily:T.mono, fontSize:7, letterSpacing:'.13em', textTransform:'uppercase', color:'#5a4328', background:`${sc}0D` }}>{tag}</span>)}
          </div>
        </article>
        <aside className="archive-card" style={{ padding:'18px 19px' }}>
          <div className="archive-kicker">como ele vence pontos</div>
          <div style={{ marginTop:12, display:'grid', gap:10 }}>{attrs.map(([key,value]) => <div key={key}><div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}><span style={{ fontFamily:T.cond, fontWeight:800, fontSize:14, textTransform:'uppercase', color:'#3a2d1f' }}>{attrLabel(key)}</span><span style={{ fontFamily:T.display, fontSize:19, color:sc }}>{value}</span></div><div className="archive-bar" style={{'--bar':sc}}><span style={{width:`${value}%`}}/></div></div>)}</div>
          <button onClick={() => setActiveTab('jogo')} style={{ marginTop:15, border:0, background:'transparent', padding:0, cursor:'pointer', color:'#75542e', fontFamily:T.mono, fontSize:7, letterSpacing:'.18em', textTransform:'uppercase' }}>abrir scout e rotas →</button>
        </aside>
      </div>

      <section className="archive-card" style={{ padding:'20px 22px', marginBottom:16 }}>
        <div style={{ display:'flex', alignItems:'baseline', justifyContent:'space-between', gap:14, marginBottom:14 }}><div><div className="archive-kicker">história em movimento</div><div style={{ fontFamily:T.display, fontSize:28, color:'#2d2319', textTransform:'uppercase', lineHeight:1 }}>temporada por temporada</div></div><button onClick={() => setActiveTab('trajetoria')} style={{ border:0,background:'transparent',cursor:'pointer',fontFamily:T.mono,fontSize:7,letterSpacing:'.16em',textTransform:'uppercase',color:'#75542e' }}>análise completa →</button></div>
        {history.length ? <><div style={{ display:'grid', gridTemplateColumns:`repeat(${Math.min(7, history.length)}, minmax(96px,1fr))`, gap:8, overflowX:'auto', paddingBottom:4 }}>{history.slice(-10).map(h => <button key={h.year} className={`archive-season${String(selected?.year)===String(h.year)?' active':''}`} onClick={() => setSelectedYear(h.year)}><div className="archive-season-year">{h.year}</div><div className="archive-season-meta">OVR {h.ovr ?? '—'} · #{h.rank ?? '—'}</div><div className="archive-bar" style={{marginTop:8,'--bar':String(selected?.year)===String(h.year)?sc:'#9f7a49'}}><span style={{width:`${Math.max(8, ((Number(h.ovr)||0)/maxOvr)*100)}%`}}/></div></button>)}</div>
          <div style={{ marginTop:16, paddingTop:15, borderTop:'1px solid rgba(69,52,28,.16)', display:'grid', gridTemplateColumns:'1.2fr repeat(3,.6fr)', gap:12, alignItems:'center' }}><div><div className="archive-label">ano em foco</div><div style={{fontFamily:T.display,fontSize:30,color:'#2b2117',marginTop:4}}>{selected?.year ?? 'histórico ainda curto'}</div></div><div><div className="archive-label">nível</div><div className="archive-value">{selected?.ovr ?? overallRating(np.attrs)}</div>{yearOvrDelta != null && <div className="archive-copy">{yearOvrDelta >=0?'+':''}{yearOvrDelta} vs. ano anterior</div>}</div><div><div className="archive-label">ranking</div><div className="archive-value">{selected?.rank ? `#${selected.rank}` : '—'}</div>{yearRankDelta != null && <div className="archive-copy">{yearRankDelta >=0?'+':''}{yearRankDelta} posições</div>}</div><div><div className="archive-label">marca</div><div className="archive-copy" style={{marginTop:6}}>{selected?.titleWon ? `Título: ${selected.titleWon}` : selected?.inDecline ? 'Sinal de declínio físico' : 'Temporada de construção'}</div></div></div></> : <div className="archive-copy" style={{padding:'18px 0'}}>O arquivo ganha profundidade quando as temporadas passam. A ficha já está pronta para registrar cada virada.</div>}
      </section>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,minmax(0,1fr))', gap:16 }}>
        {[['Rotas de talento','Origem, fundamentos, rota dominante e as marcas que a carreira deixou.','jogo'],['Arquivo da carreira','Títulos, rivalidades, recordes e os anos que construíram o legado.','carreira'],['Leitura ano a ano','Resultados, forma e a explicação por trás de cada curva.','hist_anual']].map(([title,copy,tab]) => <button key={tab} className="archive-card" onClick={()=>setActiveTab(tab)} style={{cursor:'pointer',textAlign:'left',padding:'18px 19px',color:'#2c2117'}}><div className="archive-kicker">abrir seção</div><div style={{fontFamily:T.display,fontSize:25,lineHeight:.9,textTransform:'uppercase',marginTop:8}}>{title}</div><div className="archive-copy" style={{marginTop:9}}>{copy}</div></button>)}
      </div>
    </div>
  );
}

function PremiumOverviewTab({ np, sc, rankingStore, year, identityProfile, setActiveTab, tournamentResults, coachMarket }) {
  const trajectory = useMemo(() => buildTrajectorySnapshot(np, rankingStore), [np, rankingStore]);
  const biography = useMemo(() => buildPlayerBiography(np, { tournamentResults, rankingStore, currentYear: year }), [np, tournamentResults, rankingStore, year]);
  const prefs = np?.prefs ?? generatePrefs(np?.attrs ?? {});
  const archetype = getArchetype(prefs);
  const courtIdentity = getCourtIdentity(np);
  const totalTitles = Object.values(np?.careerTitles ?? {}).reduce((sum, v) => sum + (Number(v) || 0), 0);
  const strengths = (identityProfile?.strengths ?? []).slice(0, 2);
  const weaknesses = (identityProfile?.weaknesses ?? []).slice(0, 1);
  const latestRank = trajectory.currentRank;
  const bestRank = trajectory.peakRank ?? np?.careerBest?.rank ?? np?.peakRank ?? null;
  const bestSeasonLabel = trajectory.bestSeason?.year ? `${formatProfileYear(trajectory.bestSeason.year)}` : '—';
  const currentCoach = getPlayerCoach(np, coachMarket);
  const coachMethod = currentCoach ? (COACH_METHODS[currentCoach.method] ?? COACH_METHODS.FORMADOR) : null;

  const recentResults = useMemo(() => {
    if (!np?.id) return [];
    const all = [];
    if (tournamentResults) {
      Object.values(tournamentResults).forEach(tr => {
        if (!tr?.results) return;
        const res = tr.results[np.id];
        if (res?.round) {
          all.push({ year: tr.year ?? 0, round: res.round, won: res.round === 'W' });
        }
      });
    }
    if (all.length > 0) return all.sort((a, b) => b.year - a.year).slice(0, 12);
    return (np?.recentForm?.results ?? []).slice(-12).reverse().map((r, index) => ({
      year: 0 - index,
      round: r?.won ? 'W' : 'L',
      won: !!r?.won,
      surface: r?.surface ?? null,
    }));
  }, [tournamentResults, np?.id, np?.recentForm?.results]);

  const pctFromRecord = (wins, losses) => {
    const w = Number(wins) || 0;
    const l = Number(losses) || 0;
    const total = w + l;
    if (total <= 0) return 0;
    return Math.round((w / total) * 100);
  };

  const overallWinPct = useMemo(() => {
    if (Number.isFinite(np?.careerStats?.winPct)) return Math.round(np.careerStats.winPct);
    const surfaceEntries = Object.values(np?.surfaceStats ?? {});
    const wins = surfaceEntries.reduce((sum, entry) => sum + (Number(entry?.wins) || 0), 0);
    const losses = surfaceEntries.reduce((sum, entry) => sum + (Number(entry?.losses) || 0), 0);
    return pctFromRecord(wins, losses);
  }, [np]);

  const surfaceWinPct = (surfaceKey) => {
    const entry = np?.surfaceStats?.[surfaceKey];
    if (Number.isFinite(entry?.winPct)) return Math.round(entry.winPct);
    return pctFromRecord(entry?.wins, entry?.losses);
  };

  const attrColor = (v) => {
    if (v >= 80) return sc;
    if (v >= 65) return '#22C55E';
    if (v >= 50) return '#F59E0B';
    return '#EF4444';
  };

  const catAvgLocal = (catDef) => {
    if (!catDef?.attrs) return 0;
    const vals = catDef.attrs.map(a => np?.attrs?.[a.key] ?? 0);
    return Math.round(vals.reduce((s, v) => s + v, 0) / vals.length);
  };
  const narrativeLead = String(biography.fullNarrative ?? biography.summary ?? '')
    .split(/\n{2,}/)
    .map(p => p.trim())
    .filter(Boolean)
    .slice(0, 2);
  const titleMix = [
    ['GS', np?.careerTitles?.gs ?? 0, '#FFD700'],
    ['CL', np?.careerTitles?.slamClash ?? 0, '#FF8A3D'],
    ['M1000', np?.careerTitles?.masters ?? 0, '#E8A020'],
    ['500', np?.careerTitles?.atp500 ?? 0, '#00BCD4'],
    ['250', np?.careerTitles?.atp250 ?? 0, '#66BB6A'],
  ];
  const topAttrs = Object.entries(np?.attrs ?? {})
    .filter(([, value]) => Number.isFinite(value))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  const attrName = (key) => {
    for (const cat of ATTR_CATEGORIES) {
      const found = cat.attrs?.find(a => a.key === key);
      if (found) return found.label;
    }
    return key.replace(/([A-Z])/g, ' $1').trim();
  };
  const dossierMetric = [
    ['Ranking', latestRank ? `#${latestRank}` : '---', sc],
    ['Pico', bestRank ? `#${bestRank}` : '---', '#E8C84A'],
    ['Titulos', `${totalTitles}`, '#EDE8DF'],
    ['Ano-chave', bestSeasonLabel, '#5BB8E4'],
    ['Banco', currentCoach ? currentCoach.name.split(' ').slice(-1)[0] : 'livre', coachMethod?.color ?? '#A78BFA'],
  ];

  return (
    <div className="upp2-scroll" style={{ flex:1, overflowY:'auto', padding:'22px 24px 34px' }}>
      <div style={{ display:'grid', gridTemplateColumns:'minmax(0,1.35fr) minmax(320px,.65fr)', gap:16, alignItems:'stretch', marginBottom:16 }}>
        <div style={{ position:'relative', overflow:'hidden', border:`1px solid ${sc}30`, background:`linear-gradient(135deg, ${sc}12, rgba(237,232,223,.022))`, padding:'22px 24px 24px', minHeight:260 }}>
          <div style={{ position:'absolute', inset:0, background:`linear-gradient(90deg, ${sc}12, transparent 52%)`, pointerEvents:'none' }} />
          <div style={{ position:'relative', zIndex:1 }}>
            <div style={{ fontFamily:T.mono, fontSize:7, letterSpacing:'.42em', color:`${sc}AA`, textTransform:'uppercase', marginBottom:9 }}>dossie de transmissao</div>
            <div style={{ fontFamily:T.display, fontSize:'clamp(30px,3.8vw,54px)', lineHeight:.88, color:T.ink, textTransform:'uppercase', maxWidth:900 }}>
              {biography.headline || identityProfile?.signature?.headline || np?.name}
            </div>
            <div style={{ display:'grid', gap:12, marginTop:18, maxWidth:980 }}>
              {(narrativeLead.length ? narrativeLead : [biography.summary]).filter(Boolean).map((p, i) => (
                <p key={i} style={{ fontFamily:T.body, fontSize:i === 0 ? 15.5 : 14, lineHeight:1.86, color:i === 0 ? 'rgba(237,232,223,.82)' : T.inkDim, margin:0 }}>
                  {p}
                </p>
              ))}
            </div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:7, marginTop:18 }}>
              {(biography.narrativeSignals ?? []).slice(0, 6).map(signal => (
                <span key={signal} style={{ fontFamily:T.mono, fontSize:7, letterSpacing:'.17em', textTransform:'uppercase', color:`${sc}DD`, border:`1px solid ${sc}2E`, background:`${sc}0B`, padding:'5px 8px' }}>
                  {signal.replace(/_/g, ' ')}
                </span>
              ))}
              {identityProfile?.signature?.moodTag && <span style={{ fontFamily:T.mono, fontSize:7, letterSpacing:'.17em', textTransform:'uppercase', color:'rgba(237,232,223,.72)', border:'1px solid rgba(237,232,223,.12)', padding:'5px 8px' }}>{identityProfile.signature.moodTag}</span>}
            </div>
          </div>
        </div>

        <div style={{ display:'grid', gap:8, gridTemplateColumns:'1fr 1fr' }}>
          {dossierMetric.map(([label, value, color]) => (
            <div key={label} style={{ padding:'14px 15px', border:`1px solid ${color}24`, background:`${color}08`, minHeight:90 }}>
              <div style={{ fontFamily:T.mono, fontSize:7, letterSpacing:'.24em', color:`${color}B8`, textTransform:'uppercase', marginBottom:7 }}>{label}</div>
              <div style={{ fontFamily:T.display, fontSize:label === 'Legado' ? 22 : 34, lineHeight:.9, color, textTransform:'uppercase' }}>{value}</div>
            </div>
          ))}
          <button onClick={() => setActiveTab('biografia')} style={{ textAlign:'left', cursor:'pointer', padding:'14px 15px', border:`1px solid ${sc}38`, background:`${sc}12`, color:T.ink }}>
            <div style={{ fontFamily:T.mono, fontSize:7, letterSpacing:'.24em', color:`${sc}CC`, textTransform:'uppercase', marginBottom:8 }}>abrir biografia</div>
            <div style={{ fontFamily:T.cond, fontWeight:800, fontSize:18, letterSpacing:'.06em', textTransform:'uppercase' }}>texto completo</div>
          </button>
          <button onClick={() => setActiveTab('equipe')} style={{ textAlign:'left', cursor:'pointer', padding:'14px 15px', border:`1px solid ${(coachMethod?.color ?? sc)}38`, background:`${coachMethod?.color ?? sc}12`, color:T.ink }}>
            <div style={{ fontFamily:T.mono, fontSize:7, letterSpacing:'.24em', color:`${coachMethod?.color ?? sc}CC`, textTransform:'uppercase', marginBottom:8 }}>abrir banco</div>
            <div style={{ fontFamily:T.cond, fontWeight:800, fontSize:18, letterSpacing:'.06em', textTransform:'uppercase' }}>{coachMethod?.label ?? 'mercado'}</div>
          </button>
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'minmax(0,1fr) minmax(0,1fr) minmax(280px,.72fr)', gap:14 }}>
        <div style={{ border:'1px solid rgba(237,232,223,.075)', background:'rgba(255,255,255,.018)', padding:'17px 18px' }}>
          <Sh color={sc}>Scout TV</Sh>
          <div style={{ display:'grid', gridTemplateColumns:'170px minmax(0,1fr)', gap:16, alignItems:'center' }}>
            <div className="dpp-radar-wrap" style={{ minHeight:180 }}>
              <CategoryRadar np={np} sc={sc} />
            </div>
            <div style={{ display:'grid', gap:9 }}>
              {topAttrs.map(([key, value]) => (
                <div key={key}>
                  <div style={{ display:'flex', justifyContent:'space-between', gap:10, marginBottom:4 }}>
                    <span style={{ fontFamily:T.cond, fontWeight:800, fontSize:13, letterSpacing:'.05em', color:T.ink, textTransform:'uppercase' }}>{attrName(key)}</span>
                    <span style={{ fontFamily:T.display, fontSize:18, color:attrColor(value), lineHeight:1 }}>{value}</span>
                  </div>
                  <MiniBar value={value} color={attrColor(value)} height={4} />
                </div>
              ))}
            </div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,minmax(0,1fr))', gap:7, marginTop:14 }}>
            {[
              ['Jogo', archetype?.name ?? 'Em leitura', archetype?.icon ?? ''],
              ['Forma', identityProfile?.form?.label ?? scoutPhaseLabel(np)?.label ?? 'Em leitura', ''],
              ['Superficie', identityProfile?.surface?.label ?? identityProfile?.surface ?? 'Sem recorte', ''],
            ].map(([label, value, icon]) => (
              <div key={label} style={{ padding:'10px 11px', border:`1px solid ${sc}20`, background:`${sc}07` }}>
                <div style={{ fontFamily:T.mono, fontSize:6.5, letterSpacing:'.22em', color:`${sc}88`, textTransform:'uppercase', marginBottom:5 }}>{label}</div>
                <div style={{ fontFamily:T.cond, fontWeight:800, fontSize:15, color:T.ink, textTransform:'uppercase', lineHeight:1.05 }}>{icon} {toDisplayText(value)}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ border:'1px solid rgba(237,232,223,.075)', background:'rgba(255,255,255,.018)', padding:'17px 18px' }}>
          <Sh color={sc}>Marca em Quadra</Sh>
          {[
            ['Jogada favorita', courtIdentity.favoritePlay, '#E8C84A'],
            ['Instinto', courtIdentity.competitiveInstinct, '#5BB8E4'],
            ['Ponto cego', courtIdentity.blindSpot, '#FF7043'],
          ].map(([label, meta, color]) => (
            <div key={label} style={{ padding:'12px 13px', marginBottom:8, border:`1px solid ${color}28`, borderLeft:`3px solid ${color}`, background:`${color}08` }}>
              <div style={{ fontFamily:T.mono, fontSize:6.5, letterSpacing:'.26em', color:`${color}AA`, textTransform:'uppercase', marginBottom:5 }}>{label}</div>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:5 }}>
                <span style={{ fontFamily:T.mono, color, fontWeight:900 }}>{meta.icon}</span>
                <div style={{ fontFamily:T.cond, fontWeight:800, fontSize:16, color:T.ink, textTransform:'uppercase', lineHeight:1 }}>{meta.label}</div>
              </div>
              <div style={{ fontFamily:T.body, fontSize:12, lineHeight:1.55, color:T.inkDim }}>{meta.desc}</div>
            </div>
          ))}
        </div>

        <div style={{ display:'grid', gap:14 }}>
          <div style={{ border:'1px solid rgba(237,232,223,.075)', background:'rgba(255,255,255,.018)', padding:'17px 18px' }}>
            <Sh color={sc}>Palmares</Sh>
            <div style={{ display:'grid', gap:8 }}>
              {titleMix.map(([label, value, color]) => (
                <div key={label} style={{ display:'grid', gridTemplateColumns:'52px 1fr 34px', gap:9, alignItems:'center' }}>
                  <span style={{ fontFamily:T.mono, fontSize:8, color:`${color}CC`, letterSpacing:'.12em' }}>{label}</span>
                  <div style={{ height:5, background:'rgba(237,232,223,.06)', overflow:'hidden' }}>
                    <div style={{ height:'100%', width:`${Math.min(100, (Number(value) || 0) * 18)}%`, background:color }} />
                  </div>
                  <span style={{ fontFamily:T.display, fontSize:20, color }}>{value}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ border:'1px solid rgba(237,232,223,.075)', background:'rgba(255,255,255,.018)', padding:'17px 18px' }}>
            <Sh color={sc}>Linha da Carreira</Sh>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,minmax(0,1fr))', gap:7 }}>
              {[
                ['Inicio', biography.facts?.debutYear ?? year ?? '---'],
                ['Pico', bestRank ? `#${bestRank}` : '---'],
                ['Fase', biography.careerPhase?.shortTag ?? '---'],
              ].map(([label, value]) => (
                <div key={label} style={{ padding:'9px 10px', border:'1px solid rgba(237,232,223,.07)', background:'rgba(255,255,255,.018)' }}>
                  <div style={{ fontFamily:T.mono, fontSize:6.5, color:T.inkFaint, letterSpacing:'.2em', textTransform:'uppercase', marginBottom:5 }}>{label}</div>
                  <div style={{ fontFamily:T.display, fontSize:20, color:T.ink, lineHeight:1, textTransform:'uppercase' }}>{value}</div>
                </div>
              ))}
            </div>
            <div style={{ marginTop:12, fontFamily:T.body, fontSize:12, color:T.inkDim, lineHeight:1.6 }}>
              {biography.legacy?.summary ?? identityProfile?.signature?.subline ?? 'A leitura historica ainda esta em formacao.'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="dpp-fm">

      {/* -- LEFT: Attributes ------------------------------- */}
      <div className="dpp-fm-col">
        {ATTR_CATEGORIES.map(cat => (
          <React.Fragment key={cat.id}>
            <div className="dpp-fm-sh" style={{ '--sc': cat.color }}>
              {cat.label}
              <span style={{ marginLeft:'auto', fontFamily:"'Bebas Neue',sans-serif", fontSize:13, color:cat.color, letterSpacing:'.02em' }}>
                {catAvgLocal(cat)}
              </span>
            </div>
            {cat.attrs.map(a => {
              const v = np?.attrs?.[a.key] ?? 0;
              return (
                <div key={a.key} className="dpp-fm-attr">
                  <span className="dpp-fm-attr-lbl">{a.label}</span>
                  <div className="dpp-fm-attr-bar">
                    <div className="dpp-fm-attr-fill" style={{ width:`${v}%`, background:attrColor(v) }} />
                  </div>
                  <span className="dpp-fm-attr-val" style={{ color:attrColor(v) }}>{v}</span>
                </div>
              );
            })}
          </React.Fragment>
        ))}
      </div>

      {/* -- CENTER: Radar + Stats + Form ------------------- */}
      <div className="dpp-fm-col">
        <div className="dpp-fm-sh">Shape do Jogo</div>
        <div className="dpp-radar-wrap">
          <CategoryRadar np={np} sc={sc} />
        </div>

        <div className="dpp-fm-sh">Estatísticas</div>
        {[
          ['Win Ratio', overallWinPct, '#FF7A3D'],
          ['Hard',      surfaceWinPct('HARD'), '#4A90D9'],
          ['Saibro',    surfaceWinPct('CLAY'), '#C4572A'],
          ['Grama',     surfaceWinPct('GRASS'), '#2ECC71'],
          ['Asfalto',   surfaceWinPct('STREET'), '#EF9F27'],
          ['Veludo',    surfaceWinPct('CARPET'), '#C4426A'],
          ['Indoor',    surfaceWinPct('INDOOR'), '#C84FEB'],
        ].map(([lbl, pct, color]) => (
          <div key={lbl} className="dpp-fm-stat">
            <div className="dpp-fm-stat-head">
              <span className="dpp-fm-stat-lbl">{lbl}</span>
              <span className="dpp-fm-stat-val">{pct ? `${pct}%` : '—'}</span>
            </div>
            <div className="dpp-fm-stat-track">
              <div className="dpp-fm-stat-fill" style={{ width:`${Math.min(pct ?? 0, 100)}%`, background:color }} />
            </div>
          </div>
        ))}

        <div className="dpp-fm-sh">Forma Recente</div>
        <div style={{ display:'flex', flexWrap:'wrap', gap:3, marginBottom:8 }}>
          {recentResults.length > 0 ? recentResults.map((r, i) => (
            <span key={i} className="dpp-fm-form-dot" title={r.round} style={{
              background: r.round === 'W' ? '#22C55E' : r.round === 'F' || r.round === 'SF' ? '#F59E0B' : '#EF4444',
            }} />
          )) : (
            <span style={{ fontFamily:"'Space Mono',monospace", fontSize:7, color:'rgba(237,232,223,.26)', letterSpacing:'.2em' }}>SEM HISTÓRICO</span>
          )}
        </div>

        <div className="dpp-fm-sh">Leitura</div>
        {strengths[0] && (
          <div style={{ padding:'6px 9px', borderLeft:'2px solid #22C55E', background:'rgba(34,197,94,.05)', marginBottom:4 }}>
            <div style={{ fontFamily:"'Space Mono',monospace", fontSize:6, letterSpacing:'.22em', color:'rgba(34,197,94,.55)', textTransform:'uppercase', marginBottom:2 }}>Força</div>
            <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700, fontSize:11, color:'rgba(237,232,223,.78)', textTransform:'uppercase' }}>{toDisplayText(strengths[0])}</div>
          </div>
        )}
        {weaknesses[0] && (
          <div style={{ padding:'6px 9px', borderLeft:'2px solid #F59E0B', background:'rgba(245,158,11,.05)', marginBottom:4 }}>
            <div style={{ fontFamily:"'Space Mono',monospace", fontSize:6, letterSpacing:'.22em', color:'rgba(245,158,11,.55)', textTransform:'uppercase', marginBottom:2 }}>Atenção</div>
            <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700, fontSize:11, color:'rgba(237,232,223,.78)', textTransform:'uppercase' }}>{toDisplayText(weaknesses[0])}</div>
          </div>
        )}
      </div>

      {/* -- RIGHT: Identity + Palmares + Coach + DNA -------- */}
      <div className="dpp-fm-col">

        {/* Identity card */}
        <div className="dpp-fm-sh">Arco</div>
        <div className="dpp-fm-id">
          <div style={{ fontFamily:"'Space Mono',monospace", fontSize:6, letterSpacing:'.3em', textTransform:'uppercase', color:`${sc}77`, marginBottom:4 }}>
            {identityProfile?.form?.label ?? scoutPhaseLabel(np)?.label ?? 'em leitura'}
          </div>
          <div className="dpp-fm-id-headline">{identityProfile?.signature?.headline ?? np?.name}</div>
          <div className="dpp-fm-id-body">{identityProfile?.signature?.subline ?? 'O retrato competitivo ainda está tomando forma.'}</div>
          {[identityProfile?.signature?.moodTag, identityProfile?.signature?.formTag, identityProfile?.signature?.reputationTag].filter(Boolean).length > 0 && (
            <div style={{ display:'flex', flexWrap:'wrap', gap:3, marginTop:7 }}>
              {[identityProfile?.signature?.moodTag, identityProfile?.signature?.formTag, identityProfile?.signature?.reputationTag].filter(Boolean).map(tag => (
                <span key={tag} style={{ fontFamily:"'Space Mono',monospace", fontSize:6, letterSpacing:'.12em', textTransform:'uppercase', color:'rgba(237,232,223,.66)', border:'1px solid rgba(237,232,223,.1)', padding:'2px 6px', background:'rgba(255,255,255,.02)' }}>{tag}</span>
              ))}
            </div>
          )}
        </div>

        {/* Quick stats */}
        <div className="dpp-fm-sh">Palmares</div>
        <div className="dpp-fm-qs">
          {[
            ['Ranking',     latestRank ? `#${latestRank}` : '—', sc],
            ['Melhor Rank', bestRank   ? `#${bestRank}`   : '—', '#E8C84A'],
            ['Títulos',     `${totalTitles}`,                     '#EDE8DF'],
            ['Melhor Ano',  bestSeasonLabel,                       '#5BB8E4'],
          ].map(([lbl, val, color]) => (
            <div key={lbl} className="dpp-fm-qs-item">
              <div className="dpp-fm-qs-lbl">{lbl}</div>
              <div className="dpp-fm-qs-val" style={{ color }}>{val}</div>
            </div>
          ))}
        </div>

        {/* Coach */}
        <div className="dpp-fm-sh">Equipe</div>
        {currentCoach ? (
          <div className="dpp-fm-coach">
            <div style={{ width:26, height:26, borderRadius:'50%', background:`${sc}1A`, border:`1px solid ${sc}44`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:13, color:sc }}>
                {(currentCoach.fullName ?? currentCoach.name ?? '?')[0].toUpperCase()}
              </span>
            </div>
            <div style={{ minWidth:0, flex:1 }}>
              <div className="dpp-fm-coach-name">{currentCoach.fullName ?? currentCoach.name ?? 'Técnico'}</div>
              <div className="dpp-fm-coach-role">{[coachMethod?.label ?? currentCoach.method, currentCoach.nationality].filter(Boolean).join(' · ')}</div>
            </div>
            {np.coaching?.trust != null && (
              <div style={{ flexShrink:0, textAlign:'right' }}>
                <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:15, color:sc }}>{np.coaching.trust}</div>
                <div style={{ fontFamily:"'Space Mono',monospace", fontSize:5.5, color:'rgba(237,232,223,.26)', letterSpacing:'.2em', textTransform:'uppercase' }}>confiança</div>
              </div>
            )}
          </div>
        ) : (
          <div style={{ padding:'8px 9px', fontFamily:"'Space Mono',monospace", fontSize:7, color:'rgba(237,232,223,.26)', letterSpacing:'.18em', textTransform:'uppercase' }}>Sem técnico</div>
        )}

        {/* DNA */}
        <div className="dpp-fm-sh">DNA</div>
        {[
          ['Arquétipo',  toDisplayText(archetype?.label ?? archetype)],
          ['Superfície', toDisplayText(identityProfile?.surface?.label ?? identityProfile?.surface)],
          ['Ritmo',      toDisplayText(getRallyCadenceMeta(prefs)?.label ?? getRallyCadenceMeta(prefs))],
          ['Paradoxo',   toDisplayText(identityProfile?.contradictions?.[0]?.summary ?? identityProfile?.contradictions?.[0])],
          ['Mercado',    toDisplayText(identityProfile?.reputation?.consensus ?? identityProfile?.reputation)],
        ].map(([lbl, val]) => (
          <div key={lbl} className="dpp-fm-dna-row">
            <span className="dpp-fm-dna-lbl">{lbl}</span>
            <span className="dpp-fm-dna-val">{val}</span>
          </div>
        ))}

        {/* Shortcuts */}
        <div className="dpp-fm-sh" style={{ marginTop:12 }}>Explorar</div>
        {[
          ['identidade', 'Identidade'],
          ['jogo',       'Jogo'],
          ['trajetoria', 'Trajetória'],
          ['resultados', 'Resultados'],
        ].map(([id, lbl]) => (
          <button key={id} className="dpp-fm-shortcut" onClick={() => setActiveTab(id)}>
            <span style={{ color:sc, fontSize:9 }}>?</span> {lbl}
          </button>
        ))}
      </div>
    </div>
  );
}

// Legacy overview components kept for other tabs
function _PremiumOverviewTab_LEGACY({ np, sc, rankingStore, year, identityProfile, setActiveTab }) {
  const trajectory = useMemo(() => buildTrajectorySnapshot(np, rankingStore), [np, rankingStore]);
  const prefs = np?.prefs ?? generatePrefs(np?.attrs ?? {});
  const archetype = getArchetype(prefs);
  const publicSummary = buildPerceptionNarrative(np?.perceptions ?? [], np);
  const biography = useMemo(() => buildPlayerBiography(np, { rankingStore, currentYear: year }), [np, rankingStore, year]);
  const totalTitles = Object.values(np?.careerTitles ?? {}).reduce((sum, value) => sum + (Number(value) || 0), 0);
  const topTraits = (identityProfile?.traits?.list ?? []).slice(0, 3);
  const strengths = (identityProfile?.strengths ?? []).slice(0, 3);
  const weaknesses = (identityProfile?.weaknesses ?? []).slice(0, 2);
  const topAttrs = Object.entries(np?.attrs ?? {})
    .filter(([, value]) => Number.isFinite(value))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);
  const weakestAttrs = Object.entries(np?.attrs ?? {})
    .filter(([, value]) => Number.isFinite(value))
    .sort((a, b) => a[1] - b[1])
    .slice(0, 4);
  const categorySnapshot = ATTR_CATEGORIES.map(cat => ({
    ...cat,
    avg: catAvg(np?.attrs ?? {}, cat.keys),
  }));
  const latestRank = trajectory.currentRank;
  const bestRank = trajectory.peakRank ?? np?.careerBest?.rank ?? np?.peakRank ?? null;
  const age = np?.age ?? null;
  const bestSeasonLabel = trajectory.bestSeason?.year ? `${formatProfileYear(trajectory.bestSeason.year)}` : 'a definir';
  const focusLinks = [
    ['identidade', 'Ler identidade', 'entender o DNA competitivo e emocional'],
    ['trajetoria', 'Ver trajetória', 'acompanhar curva de ranking e de nível'],
    ['jogo', 'Abrir jogo', 'ver como os atributos formam o estilo'],
    ['resultados', 'Resultados', 'entrar no mapa completo de campanha'],
  ];

  return (
    <div className="upp2-overview">
      <div className="upp2-overview-main">
        <div className="upp2-premium-card" style={{ padding:'16px 16px 18px', marginBottom:14 }}>
          <div style={{ display:'flex', justifyContent:'space-between', gap:16, alignItems:'flex-start', marginBottom:14 }}>
            <div style={{ maxWidth:820 }}>
              <div style={{ fontFamily:T.mono, fontSize:7, letterSpacing:'.38em', textTransform:'uppercase', color:`${sc}AA`, marginBottom:8 }}>
                leitura executiva
              </div>
              <div style={{ fontFamily:T.display, fontSize:'clamp(28px,3vw,44px)', lineHeight:.92, color:T.ink, textTransform:'uppercase' }}>
                {identityProfile?.signature?.headline ?? biography?.headline ?? np?.name}
              </div>
              <div style={{ fontFamily:T.body, fontSize:14, lineHeight:1.8, color:'rgba(237,232,223,.72)', marginTop:10 }}>
                {identityProfile?.signature?.subline ?? biography?.summary ?? 'O retrato competitivo deste jogador ainda está se formando.'}
              </div>
            </div>
            <div style={{ minWidth:180, textAlign:'right' }}>
              <div style={{ fontFamily:T.mono, fontSize:7, letterSpacing:'.28em', textTransform:'uppercase', color:'rgba(237,232,223,.34)' }}>
                momento da carreira
              </div>
              <div style={{ fontFamily:T.display, fontSize:34, lineHeight:.9, color:ovrTier(overallRating(np?.attrs ?? {})).color }}>
                {ovrTier(overallRating(np?.attrs ?? {})).grade}
              </div>
              <div style={{ fontFamily:T.body, fontSize:12, color:'rgba(237,232,223,.58)', marginTop:5 }}>
                {scoutPhaseLabel(np)?.label ?? 'em leitura'}
              </div>
            </div>
          </div>

          <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginBottom:18 }}>
            {[identityProfile?.signature?.moodTag, identityProfile?.signature?.formTag, identityProfile?.signature?.reputationTag, identityProfile?.signature?.contradictionTag].filter(Boolean).map(tag => (
              <span key={tag} style={{ fontFamily:T.mono, fontSize:7, letterSpacing:'.16em', textTransform:'uppercase', color:'rgba(237,232,223,.8)', border:'1px solid rgba(237,232,223,.12)', padding:'5px 8px', background:'rgba(255,255,255,.025)' }}>
                {tag}
              </span>
            ))}
          </div>

          <div className="upp2-premium-grid">
            {[
              { span:3, label:'ranking atual', value:latestRank ? `#${latestRank}` : '—', copy: latestRank ? 'posição de hoje no circuito' : 'ainda sem posição consolidada', color:sc },
              { span:3, label:'melhor ranking', value:bestRank ? `#${bestRank}` : '—', copy:'ponto mais alto já atingido', color:T.gold },
              { span:3, label:'títulos', value:`${totalTitles}`, copy: totalTitles ? 'taças registradas na carreira' : 'currículo ainda em construção', color:'#EDE8DF' },
              { span:3, label:'melhor temporada', value:bestSeasonLabel, copy: trajectory.bestSeason ? `ano em que bateu ${trajectory.bestSeason.ovr} de nível` : 'o auge ainda não apareceu', color:'#5BB8E4' },
            ].map(item => (
              <div key={item.label} style={{ gridColumn:`span ${item.span}`, padding:'14px 15px', border:'1px solid rgba(237,232,223,.08)', background:'rgba(255,255,255,.02)' }}>
                <div style={{ fontFamily:T.mono, fontSize:7, letterSpacing:'.24em', textTransform:'uppercase', color:'rgba(237,232,223,.34)', marginBottom:7 }}>{item.label}</div>
                <div style={{ fontFamily:T.display, fontSize:28, lineHeight:.9, color:item.color }}>{item.value}</div>
                <div style={{ fontFamily:T.body, fontSize:12, color:'rgba(237,232,223,.55)', lineHeight:1.55, marginTop:7 }}>{item.copy}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'minmax(0,1.2fr) minmax(320px,.8fr)', gap:14, marginBottom:14 }}>
          <div className="upp2-premium-card" style={{ padding:'16px 16px 18px' }}>
            <div style={{ display:'grid', gridTemplateColumns:'minmax(0,1.05fr) minmax(260px,.95fr)', gap:14 }}>
              <div>
                <div style={{ fontFamily:T.mono, fontSize:7, letterSpacing:'.34em', color:`${sc}AA`, textTransform:'uppercase', marginBottom:6 }}>atributos-chave</div>
                <div style={{ fontFamily:T.display, fontSize:24, color:T.ink, lineHeight:.95, textTransform:'uppercase', marginBottom:12 }}>Mapa técnico instantâneo</div>
                <div style={{ display:'grid', gap:8 }}>
                  {topAttrs.map(([key, value]) => (
                    <div key={key}>
                      <div style={{ display:'flex', justifyContent:'space-between', gap:10, marginBottom:4 }}>
                        <span style={{ fontFamily:T.cond, fontWeight:700, fontSize:13, letterSpacing:'.04em', textTransform:'uppercase', color:T.ink }}>{key.replace(/([A-Z])/g,' $1').trim()}</span>
                        <span style={{ fontFamily:T.display, fontSize:18, color:sc, lineHeight:1 }}>{value}</span>
                      </div>
                      <MiniBar value={value} color={sc} height={4} />
                    </div>
                  ))}
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(3,minmax(0,1fr))', gap:8, marginTop:14 }}>
                  {categorySnapshot.map(cat => (
                    <div key={cat.id} style={{ padding:'10px 10px 9px', border:'1px solid rgba(98,229,229,.1)', background:'rgba(255,255,255,.018)' }}>
                      <div style={{ fontFamily:T.mono, fontSize:6.5, letterSpacing:'.22em', textTransform:'uppercase', color:'rgba(237,232,223,.3)', marginBottom:5 }}>{cat.label}</div>
                      <div style={{ fontFamily:T.display, fontSize:22, color:T.ink, lineHeight:1 }}>{cat.avg}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <div style={{ fontFamily:T.mono, fontSize:7, letterSpacing:'.34em', color:`${sc}AA`, textTransform:'uppercase', marginBottom:6 }}>shape do jogo</div>
                <div style={{ display:'flex', justifyContent:'center', alignItems:'center', minHeight:210, border:'1px solid rgba(98,229,229,.1)', background:'rgba(255,255,255,.018)', marginBottom:12 }}>
                  <CategoryRadar np={np} sc={sc} />
                </div>
                <div style={{ display:'grid', gap:8 }}>
                  <DimCard accent="#22C55E" tag="forças" title={strengths[0] ?? 'sem força dominante'} body={strengths[1] ?? 'o recorte ainda está montando as armas mais fortes desse jogador.'} />
                  <DimCard accent="#F59E0B" tag="atenção" title={weaknesses[0] ?? 'sem vulnerabilidade crítica'} body={weaknesses[1] ?? 'não há um ponto fraco evidente se impondo sobre o resto.'} />
                </div>
              </div>
            </div>
          </div>

          <div style={{ display:'grid', gap:14 }}>
            <div className="upp2-premium-card" style={{ padding:'16px 16px 18px' }}>
              <div style={{ fontFamily:T.mono, fontSize:7, letterSpacing:'.34em', color:`${sc}AA`, textTransform:'uppercase', marginBottom:6 }}>estatísticas rápidas</div>
              <div style={{ display:'grid', gap:10 }}>
                {[
                  ['Win Ratio', np?.careerStats?.winPct ? `${np.careerStats.winPct}%` : '—', np?.careerStats?.winPct ?? 0],
                  ['Hard', surfaceWinPct('HARD') ? `${surfaceWinPct('HARD')}%` : '—', surfaceWinPct('HARD')],
                  ['Saibro', surfaceWinPct('CLAY') ? `${surfaceWinPct('CLAY')}%` : '—', surfaceWinPct('CLAY')],
                  ['Grama', surfaceWinPct('GRASS') ? `${surfaceWinPct('GRASS')}%` : '—', surfaceWinPct('GRASS')],
                  ['Asfalto', surfaceWinPct('STREET') ? `${surfaceWinPct('STREET')}%` : '—', surfaceWinPct('STREET')],
                  ['Veludo', surfaceWinPct('CARPET') ? `${surfaceWinPct('CARPET')}%` : '—', surfaceWinPct('CARPET')],
                  ['Indoor', surfaceWinPct('INDOOR') ? `${surfaceWinPct('INDOOR')}%` : '—', surfaceWinPct('INDOOR')],
                ].map(([label, value, pct]) => (
                  <div key={label}>
                    <div style={{ display:'flex', justifyContent:'space-between', gap:10, marginBottom:4 }}>
                      <span style={{ fontFamily:T.cond, fontWeight:700, fontSize:13, letterSpacing:'.04em', textTransform:'uppercase', color:T.ink }}>{label}</span>
                      <span style={{ fontFamily:T.mono, fontSize:9, color:'rgba(237,232,223,.7)' }}>{value}</span>
                    </div>
                    <MiniBar value={pct} color={label === 'Win Ratio' ? '#FF7A3D' : '#00D6D6'} height={5} showGlow />
                  </div>
                ))}
              </div>
            </div>

            <div className="upp2-premium-card" style={{ padding:'16px 16px 18px' }}>
              <div style={{ fontFamily:T.mono, fontSize:7, letterSpacing:'.34em', color:`${sc}AA`, textTransform:'uppercase', marginBottom:6 }}>alertas de leitura</div>
              <div style={{ display:'grid', gap:8 }}>
                {weakestAttrs.map(([key, value]) => (
                  <div key={key} style={{ padding:'10px 12px', border:'1px solid rgba(237,232,223,.07)', background:'rgba(255,255,255,.018)' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', gap:8 }}>
                      <span style={{ fontFamily:T.cond, fontWeight:700, fontSize:13, color:T.ink, letterSpacing:'.04em', textTransform:'uppercase' }}>{key.replace(/([A-Z])/g,' $1').trim()}</span>
                      <span style={{ fontFamily:T.display, fontSize:18, color:'#F59E0B', lineHeight:1 }}>{value}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="upp2-premium-card" style={{ padding:'18px 20px 20px', marginBottom:16 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'end', gap:18, marginBottom:12 }}>
            <div>
              <div style={{ fontFamily:T.mono, fontSize:7, letterSpacing:'.34em', color:`${sc}AA`, textTransform:'uppercase', marginBottom:6 }}>evolução anual</div>
              <div style={{ fontFamily:T.display, fontSize:26, color:T.ink, lineHeight:.92, textTransform:'uppercase' }}>Curva de ranking e maturação</div>
            </div>
            <div style={{ textAlign:'right' }}>
              <div style={{ fontFamily:T.mono, fontSize:7, letterSpacing:'.24em', color:'rgba(237,232,223,.28)', textTransform:'uppercase' }}>última variação</div>
              <div style={{ fontFamily:T.display, fontSize:24, color:(trajectory.latestDelta ?? 0) > 0 ? '#22C55E' : (trajectory.latestDelta ?? 0) < 0 ? '#EF4444' : 'rgba(237,232,223,.42)' }}>
                {(trajectory.latestDelta ?? 0) > 0 ? '+' : ''}{Number(trajectory.latestDelta ?? 0).toFixed(1)}
              </div>
            </div>
          </div>
          <OVRChart history={trajectory.history} rankHist={trajectory.rankHist} sc={sc} year={year} />
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,minmax(0,1fr))', gap:10, marginTop:14 }}>
            <DimCard accent={sc} tag="ritmo" title={trajectory.history.length ? `${trajectory.history.length} temporadas lidas` : 'sem histórico'} body={trajectory.history.length ? `Da estreia registrada até ${trajectory.history.at(-1)?.year ?? 'agora'}, a ficha já consegue mostrar a progressão anual de nível.` : 'Essa curva começa a ficar rica depois das primeiras temporadas do universo.'} />
        <DimCard accent={T.gold} tag="auge" title={bestRank ? `Pico no #${bestRank}` : 'ainda sem pico'} body={trajectory.bestSeason ? `O melhor recorte veio em ${formatProfileYear(trajectory.bestSeason.year)}, quando o jogador atingiu ${trajectory.bestSeason.ovr} de nível.` : 'Ainda não houve uma temporada forte o bastante para definir o auge.'} />
            <DimCard accent="#5BB8E4" tag="projeção" title={age ? `${age} anos hoje` : 'idade em leitura'} body={np?.peakAge ? `O modelo projeta o pico ideal por volta dos ${np.peakAge} anos.` : 'O sistema ainda não fixou um pico etário claro para esta carreira.'} />
          </div>
        </div>

        <div className="upp2-premium-grid">
          <div className="upp2-premium-card" style={{ gridColumn:'span 7', padding:'18px 18px 20px' }}>
            <div style={{ fontFamily:T.mono, fontSize:7, letterSpacing:'.34em', color:`${sc}AA`, textTransform:'uppercase', marginBottom:6 }}>o que faz esse jogador ser ele</div>
            <div style={{ fontFamily:T.display, fontSize:24, color:T.ink, lineHeight:.95, textTransform:'uppercase', marginBottom:12 }}>
              DNA, traços e assinatura de quadra
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(2,minmax(0,1fr))', gap:12 }}>
              <div>
                <DetailLine label="arquétipo" value={archetype?.label ?? identityProfile?.game?.archetype ?? 'sem arquétipo dominante'} color={sc} />
                <DetailLine label="traço central" value={identityProfile?.traits?.primary?.label ?? 'sem traço dominante'} color={sc} />
                <DetailLine label="superfície" value={identityProfile?.surface?.label ?? 'ainda sem terreno favorito claro'} />
                <DetailLine label="ritmo" value={getRallyCadenceMeta(prefs)?.label ?? 'ritmo em leitura'} />
              </div>
              <div>
                <DetailLine label="arma" value={strengths[0] ?? 'sem arma principal definida'} color="#22C55E" />
                <DetailLine label="zona frágil" value={weaknesses[0] ?? 'sem fragilidade narrativa evidente'} color="#F59E0B" />
                <DetailLine label="paradoxo" value={identityProfile?.contradictions?.[0]?.summary ?? 'perfil mais estável do que contraditório'} color="#C084FC" />
                <DetailLine label="mercado" value={identityProfile?.reputation?.consensus ?? 'sem consenso público consolidado'} />
              </div>
            </div>
            {topTraits.length > 0 && (
              <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginTop:14 }}>
                {topTraits.map(trait => (
                  <Pill key={trait.id ?? trait.label} label={trait.label} color={trait.color ?? sc} />
                ))}
              </div>
            )}
          </div>

          <div className="upp2-premium-card" style={{ gridColumn:'span 5', padding:'18px 18px 20px' }}>
            <div style={{ fontFamily:T.mono, fontSize:7, letterSpacing:'.34em', color:`${sc}AA`, textTransform:'uppercase', marginBottom:6 }}>leitura editorial</div>
            <div style={{ fontFamily:T.display, fontSize:24, color:T.ink, lineHeight:.95, textTransform:'uppercase', marginBottom:12 }}>
              O circuito fala dele assim
            </div>
            <div style={{ fontFamily:T.body, fontSize:13, color:'rgba(237,232,223,.72)', lineHeight:1.8 }}>
              {publicSummary}
            </div>
            <div style={{ marginTop:16, display:'grid', gap:8 }}>
              <DimCard accent="#E8C84A" tag="reputação" title={identityProfile?.reputation?.dominant?.label ?? 'sem selo dominante'} body={identityProfile?.reputation?.consensus ?? 'O circuito ainda não fechou consenso sobre o que esse nome representa.'} />
              <DimCard accent="#5BB8E4" tag="biografia viva" title={biography?.careerPhase?.label ?? 'fase em leitura'} body={biography?.tone?.blurb ?? biography?.summary ?? 'A história esportiva ainda está começando.'} />
            </div>
          </div>
        </div>
      </div>

      <div className="upp2-overview-side">
        <div className="upp2-premium-card" style={{ padding:'18px 18px 20px', marginBottom:14 }}>
          <div style={{ fontFamily:T.mono, fontSize:7, letterSpacing:'.34em', color:`${sc}AA`, textTransform:'uppercase', marginBottom:6 }}>atalhos de leitura</div>
          <div style={{ fontFamily:T.display, fontSize:22, color:T.ink, lineHeight:.96, textTransform:'uppercase', marginBottom:12 }}>
            Cada clique precisa revelar mais
          </div>
          <div style={{ display:'grid', gap:8 }}>
            {focusLinks.map(([id, label, desc]) => (
              <button key={id} className="upp2-tab-overview-btn" onClick={() => setActiveTab(id)}>
                <span style={{ fontFamily:T.cond, fontWeight:700, fontSize:15, letterSpacing:'.04em', textTransform:'uppercase' }}>{label}</span>
                <span style={{ fontFamily:T.body, fontSize:12, lineHeight:1.55, color:'rgba(237,232,223,.56)' }}>{desc}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="upp2-premium-card" style={{ padding:'18px 18px 20px', marginBottom:14 }}>
          <div style={{ fontFamily:T.mono, fontSize:7, letterSpacing:'.34em', color:`${sc}AA`, textTransform:'uppercase', marginBottom:8 }}>estado do momento</div>
          <div style={{ display:'grid', gap:10 }}>
            <div style={{ padding:'12px 13px', border:'1px solid rgba(237,232,223,.08)', background:'rgba(255,255,255,.02)' }}>
              <div style={{ fontFamily:T.mono, fontSize:7, letterSpacing:'.24em', textTransform:'uppercase', color:'rgba(237,232,223,.3)', marginBottom:5 }}>forma</div>
              <div style={{ fontFamily:T.cond, fontWeight:700, fontSize:17, color:sc, textTransform:'uppercase' }}>{identityProfile?.form?.label ?? 'sem termômetro de forma'}</div>
              <div style={{ fontFamily:T.body, fontSize:12, color:'rgba(237,232,223,.56)', lineHeight:1.55, marginTop:5 }}>{identityProfile?.form?.summary ?? 'O jogo ainda não tem amostra suficiente para formar uma leitura mais viva do momento.'}</div>
            </div>
            <div style={{ padding:'12px 13px', border:'1px solid rgba(237,232,223,.08)', background:'rgba(255,255,255,.02)' }}>
              <div style={{ fontFamily:T.mono, fontSize:7, letterSpacing:'.24em', textTransform:'uppercase', color:'rgba(237,232,223,.3)', marginBottom:5 }}>personalidade pública</div>
              <div style={{ fontFamily:T.cond, fontWeight:700, fontSize:17, color:'#E8C84A', textTransform:'uppercase' }}>{identityProfile?.personality?.persona ?? 'sem máscara pública definida'}</div>
              <div style={{ fontFamily:T.body, fontSize:12, color:'rgba(237,232,223,.56)', lineHeight:1.55, marginTop:5 }}>{identityProfile?.personality?.summary ?? 'A camada de personalidade ainda está discreta para este perfil.'}</div>
            </div>
          </div>
        </div>

        <div className="upp2-premium-card" style={{ padding:'18px 18px 20px' }}>
          <div style={{ fontFamily:T.mono, fontSize:7, letterSpacing:'.34em', color:`${sc}AA`, textTransform:'uppercase', marginBottom:8 }}>linhas fortes da carreira</div>
          <div style={{ display:'grid', gap:8 }}>
            {(biography?.chapters ?? []).slice(0, 4).map(chapter => (
              <div key={chapter.key} style={{ padding:'10px 12px', borderLeft:`3px solid ${sc}`, background:'rgba(255,255,255,.02)', border:'1px solid rgba(237,232,223,.06)' }}>
                <div style={{ fontFamily:T.cond, fontWeight:700, fontSize:14, color:T.ink, textTransform:'uppercase', letterSpacing:'.04em', marginBottom:4 }}>{chapter.title}</div>
                <div style={{ fontFamily:T.body, fontSize:12, color:'rgba(237,232,223,.56)', lineHeight:1.55 }}>{chapter.text}</div>
              </div>
            ))}
            {(biography?.chapters ?? []).length === 0 && (
              <div style={{ fontFamily:T.body, fontSize:12, color:'rgba(237,232,223,.5)', lineHeight:1.7 }}>
                A história completa desse jogador ainda está juntando capítulos suficientes para ganhar uma linha do tempo forte.
              </div>
            )}
          </div>
        </div>

        <div className="upp2-premium-card" style={{ padding:'18px 18px 20px', marginTop:14 }}>
          <div style={{ fontFamily:T.mono, fontSize:7, letterSpacing:'.34em', color:`${sc}AA`, textTransform:'uppercase', marginBottom:8 }}>palmarés instantâneo</div>
          <div style={{ display:'grid', gap:8 }}>
            {[
              ['Títulos', `${totalTitles}`],
              ['Melhor ranking', bestRank ? `#${bestRank}` : '—'],
              ['Melhor temporada', bestSeasonLabel],
              ['Arquétipo', archetype?.label ?? 'em leitura'],
            ].map(([label, value]) => (
              <div key={label} style={{ display:'grid', gridTemplateColumns:'1fr auto', gap:10, padding:'10px 12px', border:'1px solid rgba(98,229,229,.08)', background:'rgba(255,255,255,.018)' }}>
                <span style={{ fontFamily:T.mono, fontSize:7, letterSpacing:'.22em', textTransform:'uppercase', color:'rgba(237,232,223,.32)' }}>{label}</span>
                <span style={{ fontFamily:T.cond, fontWeight:700, fontSize:15, color:T.ink, letterSpacing:'.04em', textTransform:'uppercase' }}>{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------
// HERO PHOTO
// -----------------------------------------------------------------
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

// -----------------------------------------------------------------
// -----------------------------------------------------------------
// TAB: CIRCUITO — Percepções din?micas
// -----------------------------------------------------------------
function TabPercepcoes({ np, sc, year, tournamentResults, allPlayers = [] }) {
  const perceptions = np.perceptions ?? [];
  const narrative   = buildPerceptionNarrative(perceptions, np);
  const marketText  = getMarketAssessment(np, year ?? 2025);

  const confirmed   = perceptions.filter(p => p.status === 'CONFIRMED');
  const unconfirmed = perceptions.filter(p => p.status === 'UNCONFIRMED');
  const disputed    = perceptions.filter(p => p.status === 'DISPUTED');
  const refuted     = perceptions.filter(p => p.status === 'REFUTED');

  const STATUS_META = {
    CONFIRMED:   { label: 'Confirmado',     color: '#22c55e', icon: '?' },
    UNCONFIRMED: { label: 'Observado',      color: '#FFD700', icon: '?' },
    DISPUTED:    { label: 'Disputado',      color: '#f97316', icon: '?' },
    REFUTED:     { label: 'Refutado',       color: '#94a3b8', icon: '?' },
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
        <span style={{ fontSize: 18, flexShrink: 0 }}>{p.icon ?? '?'}</span>
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
              ? Percepções Confirmadas
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
              ? Em Debate
            </div>
            {disputed.map(p => <PerceptionPill key={p.id} p={p} />)}
          </>
        )}

        {/* Refutadas */}
        {refuted.length > 0 && (
          <>
            <div style={{ fontFamily: T.mono, fontSize: 7, letterSpacing: '.38em', color: 'rgba(237,232,223,.15)', textTransform: 'uppercase', marginBottom: 10, marginTop: 18 }}>
              ? Refutadas
            </div>
            {refuted.map(p => <PerceptionPill key={p.id} p={p} />)}
          </>
        )}

        {perceptions.length === 0 && (
          <div style={{ padding: '40px 0', textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>??</div>
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

        {/* Avaliação de mercado din?mica */}
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

// -----------------------------------------------------------------
// TAB 1: IDENTIDADE
// -----------------------------------------------------------------
function TabIdentidade({ np, sc, identityProfile = null }) {
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
  const seasonArc = identityProfile?.seasonArc ?? null;
  const latestInterview = p?.latestInterview ?? null;

  return (
    <div style={{ flex:1, display:'flex', overflow:'hidden', minHeight:0 }}>
      {/* -- LEFT COLUMN -- */}
      <div className="upp2-scroll" style={{ flex:1, padding:'22px 24px', borderRight:`1px solid ${T.line}`, overflowY:'auto' }}>

        {identityProfile && (
          <div style={{ marginBottom:20 }}>
            <Sh color={sc}>Retrato Consolidado</Sh>
            <div style={{ border:`1px solid ${sc}26`, background:`linear-gradient(180deg, ${sc}10 0%, rgba(255,255,255,.02) 100%)`, borderLeft:`3px solid ${sc}`, padding:'16px 18px', position:'relative', overflow:'hidden' }}>
              <div style={{ position:'absolute', top:0, left:0, right:0, height:1, background:`linear-gradient(90deg, ${sc}66, transparent)` }} />
              <div style={{ fontFamily:T.mono, fontSize:7, letterSpacing:'.34em', color:`${sc}AA`, textTransform:'uppercase', marginBottom:6 }}>
                DNA competitivo
              </div>
              <div style={{ fontFamily:T.display, fontSize:28, lineHeight:.95, color:T.white, textTransform:'uppercase' }}>
                {identityProfile.signature.headline}
              </div>
              <p style={{ fontFamily:T.body, fontSize:13, color:T.inkDim, lineHeight:1.65, margin:'10px 0 0' }}>
                {identityProfile.signature.subline}
              </p>

              <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginTop:12 }}>
                {[identityProfile.signature.moodTag, identityProfile.signature.formTag, identityProfile.signature.reputationTag, identityProfile.signature.contradictionTag].filter(Boolean).map(tag => (
                  <span key={tag} style={{ fontFamily:T.mono, fontSize:7, color:'rgba(237,232,223,.76)', border:'1px solid rgba(237,232,223,.12)', padding:'4px 7px', letterSpacing:'.12em', textTransform:'uppercase' }}>
                    {tag}
                  </span>
                ))}
              </div>

              <div style={{ display:'grid', gridTemplateColumns:'repeat(2, minmax(0,1fr))', gap:10, marginTop:14 }}>
                <div style={{ padding:'10px 11px', border:'1px solid rgba(255,255,255,.06)', background:'rgba(255,255,255,.02)' }}>
                  <div style={{ fontFamily:T.mono, fontSize:7, letterSpacing:'.28em', color:T.inkFaint, textTransform:'uppercase', marginBottom:4 }}>Traço dominante</div>
                  <div style={{ fontFamily:T.cond, fontSize:15, color:sc, textTransform:'uppercase', letterSpacing:'.04em' }}>
                    {identityProfile.traits.primary?.label ?? 'Sem traço dominante'}
                  </div>
                </div>
                <div style={{ padding:'10px 11px', border:'1px solid rgba(255,255,255,.06)', background:'rgba(255,255,255,.02)' }}>
                  <div style={{ fontFamily:T.mono, fontSize:7, letterSpacing:'.28em', color:T.inkFaint, textTransform:'uppercase', marginBottom:4 }}>Leitura do circuito</div>
                  <div style={{ fontFamily:T.body, fontSize:12.5, color:T.white, lineHeight:1.45 }}>
                    {identityProfile.reputation.consensus ?? 'Ainda sem consenso consolidado.'}
                  </div>
                </div>
              </div>

              <div style={{ display:'grid', gridTemplateColumns:'repeat(2, minmax(0,1fr))', gap:12, marginTop:12 }}>
                <div>
                  <div style={{ fontFamily:T.mono, fontSize:7, letterSpacing:'.28em', color:T.inkFaint, textTransform:'uppercase', marginBottom:5 }}>Forças narrativas</div>
                  <div style={{ fontFamily:T.body, fontSize:12.5, color:T.inkDim, lineHeight:1.6 }}>
                    {identityProfile.strengths.slice(0, 2).join(' · ') || 'Base ainda sem força distintiva clara.'}
                  </div>
                </div>
                <div>
                  <div style={{ fontFamily:T.mono, fontSize:7, letterSpacing:'.28em', color:T.inkFaint, textTransform:'uppercase', marginBottom:5 }}>Zona vulnerável</div>
                  <div style={{ fontFamily:T.body, fontSize:12.5, color:T.inkDim, lineHeight:1.6 }}>
                    {identityProfile.weaknesses.slice(0, 2).join(' · ') || 'Sem vulnerabilidade pública forte no momento.'}
                  </div>
                </div>
              </div>

              <div style={{ marginTop:12, padding:'11px 12px', border:'1px solid rgba(255,255,255,.06)', background:'rgba(255,255,255,.02)' }}>
                <div style={{ fontFamily:T.mono, fontSize:7, letterSpacing:'.28em', color:T.inkFaint, textTransform:'uppercase', marginBottom:5 }}>Contradicao central</div>
                <div style={{ fontFamily:T.body, fontSize:12.5, color:T.white, lineHeight:1.55 }}>
                  {identityProfile.contradictions?.[0]?.summary ?? 'Sem paradoxo dominante no momento; o retrato atual e mais linear.'}
                </div>
              </div>

              {seasonArc && (
                <div style={{ marginTop:12, padding:'12px 12px', border:`1px solid ${sc}20`, background:`linear-gradient(180deg, ${sc}12, rgba(255,255,255,.02))` }}>
                  <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:10, flexWrap:'wrap' }}>
                    <div>
                      <div style={{ fontFamily:T.mono, fontSize:7, letterSpacing:'.28em', color:`${sc}AA`, textTransform:'uppercase', marginBottom:5 }}>Arco da temporada</div>
                      <div style={{ fontFamily:T.cond, fontSize:16, color:T.white, textTransform:'uppercase', letterSpacing:'.04em' }}>
                        {seasonArc.label}
                      </div>
                    </div>
                    {seasonArc.chapterLabel && (
                      <span style={{ fontFamily:T.mono, fontSize:7, color:'rgba(237,232,223,.72)', border:'1px solid rgba(237,232,223,.12)', padding:'4px 7px', letterSpacing:'.12em', textTransform:'uppercase' }}>
                        {seasonArc.chapterLabel}
                      </span>
                    )}
                  </div>
                  <div style={{ fontFamily:T.body, fontSize:12.5, color:T.inkDim, lineHeight:1.6, marginTop:8 }}>
                    {seasonArc.summary}
                  </div>
                  {latestInterview?.quote && (
                    <div style={{ marginTop:10, paddingTop:10, borderTop:'1px solid rgba(255,255,255,.06)' }}>
                      <div style={{ fontFamily:T.mono, fontSize:7, letterSpacing:'.28em', color:T.inkFaint, textTransform:'uppercase', marginBottom:5 }}>Última manchete pessoal</div>
                      <div style={{ fontFamily:T.body, fontSize:12.5, color:T.white, lineHeight:1.55 }}>
                        {latestInterview.quote}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ESTADO ATUAL — só aparece se há dados din?micos */}
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
                  <div style={{ fontFamily:T.display, fontSize:32, color:pressureColor, lineHeight:1 }}>{pressureLevel}</div>
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
            icon={ARCH_ICON[hooks.archetypeId] ?? '??'}
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
            icon={{ CHARISMATIC:'??', RESERVED:'??', CONFRONTATIONAL:'??', SHOWMAN:'??', DIPLOMATIC:'??', ENIGMATIC:'??', INTELLECTUAL:'??' }[hooks.personaId] ?? '???'}
            tag="Press Persona"
            title={hooks.personaLabel}
            body={PRESS_PERSONAS[hooks.personaId]?.description}
          >
            <div style={{ marginTop:8 }}>
              <DetailLine label="Tom de entrevista" value={hooks.interviewTone?.replace(/_/g,' ')} color={personaColor} />
              {hooks.storyAngles?.length > 0 && (
                <div style={{ marginTop:8 }}>
                  <div style={{ fontFamily:T.mono, fontSize:7, letterSpacing:'.36em', color:`${personaColor}66`, textTransform:'uppercase', marginBottom:6 }}>ngulos de matéria</div>
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
                {p.backstory?.keyEvent && <Pill label={p.backstory.keyEvent.label} color={T.gold} icon="??" />}
              </div>
            </div>
          </div>
        </div>

        {/* RIVAL DYNAMIC */}
        {hooks.rivalDynamic && (
          <div style={{ marginTop:14 }}>
            <div style={{ border:`1px solid rgba(239,68,68,.18)`, background:'rgba(239,68,68,.03)', borderLeft:'3px solid rgba(239,68,68,.42)', padding:'12px 15px' }}>
              <div style={{ fontFamily:T.mono, fontSize:7, letterSpacing:'.36em', color:'rgba(239,68,68,.5)', textTransform:'uppercase', marginBottom:4 }}>Din?mica de Rivalidade</div>
              <p style={{ fontFamily:T.body, fontSize:12, color:T.inkDim, lineHeight:1.6, margin:0, fontStyle:'italic' }}>"{hooks.rivalDynamic}"</p>
            </div>
          </div>
        )}
      </div>

      {/* -- RIGHT COLUMN -- */}
      <div className="upp2-scroll" style={{ width:'clamp(220px,27vw,300px)', flexShrink:0, padding:'22px 20px', background:'rgba(0,0,0,.12)', overflowY:'auto' }}>

        {/* REPUTAÇ?O */}
        <div style={{ marginBottom:16 }}>
          <Sh color={sc}>Reputação</Sh>
          <DimCard
            accent={reputationColor}
            icon={REP_ICON[hooks.reputationId] ?? '??'}
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
                  const icon    = { CHARISMATIC:'??', RESERVED:'??', CONFRONTATIONAL:'??', SHOWMAN:'??', DIPLOMATIC:'??', ENIGMATIC:'??', INTELLECTUAL:'??' }[id] ?? '???';
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
                          ? mudança iminente
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
                      {formatProfileYear(h.year)}
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
            { label:'Idade',  value:formatProfileAge(np.age) != null ? `${formatProfileAge(np.age)} anos` : null },
            { label:'Altura', value:np.height ? `${np.height} m` : null },
            { label:'Peso',   value:np.weight ? `${np.weight} kg` : null },
            { label:'Mão',    value:np.hand },
            { label:'Nascimento', value:np.birthDate ? `${String(np.birthDate.month).padStart(2,'0')}/${np.birthDate.year}` : np.birthYear },
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

// -----------------------------------------------------------------
// TAB 2: JOGO
// -----------------------------------------------------------------
function TacticalCourtMap({ sc, courtIdentity, bs, ri, ng, naturalSig, rallyPat }) {
  const marks = [
    { x:'22%', y:'24%', color:'#E8C84A', label:'JOGADA', text:courtIdentity?.favoritePlay?.abbr ?? 'FAV' },
    { x:'66%', y:'38%', color:'#5BB8E4', label:'INSTINTO', text:courtIdentity?.competitiveInstinct?.abbr ?? 'INS' },
    { x:'72%', y:'72%', color:'#FF7043', label:'PONTO CEGO', text:courtIdentity?.blindSpot?.abbr ?? 'RISK' },
  ];
  return (
    <div style={{ border:`1px solid ${sc}28`, background:`linear-gradient(180deg, ${sc}0B, rgba(255,255,255,.015))`, padding:14 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:10 }}>
        <div>
          <div style={{ fontFamily:T.mono, fontSize:7, color:`${sc}AA`, letterSpacing:'.34em', textTransform:'uppercase', marginBottom:5 }}>mapa de quadra</div>
          <div style={{ fontFamily:T.display, fontSize:25, color:T.ink, lineHeight:.9, textTransform:'uppercase' }}>Scout TV</div>
        </div>
        <div style={{ fontFamily:T.mono, fontSize:7, color:T.inkFaint, letterSpacing:'.2em', textTransform:'uppercase' }}>{bs?.abbr} · {ri?.abbr} · {ng?.abbr}</div>
      </div>
      <div style={{ position:'relative', aspectRatio:'1.75 / 1', minHeight:250, border:`1px solid ${sc}38`, background:'linear-gradient(180deg, rgba(8,34,36,.88), rgba(4,12,16,.94))', overflow:'hidden' }}>
        <div style={{ position:'absolute', inset:'8% 9%', border:'1px solid rgba(237,232,223,.24)' }} />
        <div style={{ position:'absolute', left:'50%', top:'8%', bottom:'8%', width:1, background:'rgba(237,232,223,.22)' }} />
        <div style={{ position:'absolute', left:'9%', right:'9%', top:'50%', height:1, background:'rgba(237,232,223,.2)' }} />
        <div style={{ position:'absolute', left:'9%', right:'9%', top:'30%', height:1, background:'rgba(237,232,223,.12)' }} />
        <div style={{ position:'absolute', left:'9%', right:'9%', top:'70%', height:1, background:'rgba(237,232,223,.12)' }} />
        <div style={{ position:'absolute', left:'29%', top:'8%', bottom:'8%', width:1, background:'rgba(237,232,223,.12)' }} />
        <div style={{ position:'absolute', left:'71%', top:'8%', bottom:'8%', width:1, background:'rgba(237,232,223,.12)' }} />
        <div style={{ position:'absolute', inset:0, background:`radial-gradient(circle at 25% 25%, ${sc}24, transparent 30%), radial-gradient(circle at 70% 70%, rgba(255,112,67,.14), transparent 27%)` }} />
        {marks.map(mark => (
          <div key={mark.label} style={{ position:'absolute', left:mark.x, top:mark.y, transform:'translate(-50%,-50%)', minWidth:78, padding:'8px 9px', border:`1px solid ${mark.color}55`, borderLeft:`3px solid ${mark.color}`, background:'rgba(0,0,0,.46)', backdropFilter:'blur(4px)' }}>
            <div style={{ fontFamily:T.mono, fontSize:6, letterSpacing:'.22em', color:`${mark.color}CC`, textTransform:'uppercase', marginBottom:3 }}>{mark.label}</div>
            <div style={{ fontFamily:T.cond, fontWeight:800, fontSize:14, color:T.ink, textTransform:'uppercase', lineHeight:1 }}>{mark.text}</div>
          </div>
        ))}
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,minmax(0,1fr))', gap:8, marginTop:10 }}>
        {[
          ['Assinatura', naturalSig?.label ?? 'sem golpe definido', '#E8C84A'],
          ['Rally', rallyPat?.label ?? ri?.label ?? 'em leitura', '#5BB8E4'],
          ['Rede', ng?.label ?? 'em leitura', sc],
        ].map(([label, value, color]) => (
          <div key={label} style={{ padding:'9px 10px', background:`${color}08`, border:`1px solid ${color}24` }}>
            <div style={{ fontFamily:T.mono, fontSize:6.5, letterSpacing:'.22em', color:`${color}AA`, textTransform:'uppercase', marginBottom:4 }}>{label}</div>
            <div style={{ fontFamily:T.cond, fontWeight:800, fontSize:14, color:T.ink, textTransform:'uppercase', lineHeight:1.05 }}>{value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function GameScoutPrefsView({ np, sc, prefs, archetype, naturalSig, rallyPat, year }) {
  const bs = getBuildStyleMeta(prefs.buildStyle);
  const ng = getNetGameMeta(prefs.netGame);
  const ri = getRallyIntentMeta(prefs);
  const adpt = adaptabilityLabel(prefs.adaptability);
  const courtIdentity = getCourtIdentity(np);
  const sortedAttrs = Object.entries(np.attrs ?? {}).sort(([, a], [, b]) => b - a);
  const topAttrs = sortedAttrs.slice(0, 5);
  const lowAttrs = sortedAttrs.slice(-4);
  const attrMeta = (key) => {
    for (const cat of ATTR_CATEGORIES) {
      const found = cat.attrs?.find(a => a.key === key);
      if (found) return { label:found.label, color:cat.color };
    }
    return { label:key.replace(/([A-Z])/g, ' $1').trim(), color:sc };
  };

  return (
    <>
      <div className="upp2-scroll" style={{ flex:1, padding:'20px 22px 30px', borderRight:`1px solid ${T.line}`, overflowY:'auto' }}>
        <div style={{ display:'grid', gridTemplateColumns:'minmax(360px,1.05fr) minmax(300px,.95fr)', gap:14, alignItems:'start' }}>
          <TacticalCourtMap sc={sc} courtIdentity={courtIdentity} bs={bs} ri={ri} ng={ng} naturalSig={naturalSig} rallyPat={rallyPat} />

          <div style={{ display:'grid', gap:14 }}>
            <div style={{ padding:'17px 18px', border:`1px solid ${sc}30`, background:`linear-gradient(135deg, ${sc}12, rgba(237,232,223,.018))`, borderLeft:`4px solid ${sc}` }}>
              <div style={{ fontFamily:T.mono, fontSize:7, letterSpacing:'.36em', color:`${sc}AA`, textTransform:'uppercase', marginBottom:7 }}>identidade de jogo</div>
              <div style={{ display:'flex', gap:13, alignItems:'flex-start' }}>
                <span style={{ fontSize:34, lineHeight:1 }}>{archetype?.icon ?? ''}</span>
                <div>
                  <div style={{ fontFamily:T.display, fontSize:30, color:sc, textTransform:'uppercase', lineHeight:.9 }}>{archetype?.name ?? 'Em leitura'}</div>
                  <p style={{ fontFamily:T.body, fontSize:12.5, lineHeight:1.65, color:T.inkDim, margin:'9px 0 0' }}>{archetype?.desc ?? 'O perfil ainda esta formando uma identidade clara de quadra.'}</p>
                </div>
              </div>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,minmax(0,1fr))', gap:8 }}>
              {[['Construção', bs], ['Intenção', ri], ['Rede', ng]].map(([label, meta]) => (
                <div key={label} style={{ padding:'12px 13px', border:`1px solid ${sc}22`, background:'rgba(255,255,255,.018)' }}>
                  <div style={{ fontFamily:T.mono, fontSize:6.5, color:`${sc}88`, letterSpacing:'.24em', textTransform:'uppercase', marginBottom:5 }}>{label}</div>
                  <div style={{ fontFamily:T.cond, fontWeight:800, fontSize:15, color:T.ink, textTransform:'uppercase', lineHeight:1 }}>{meta.icon} {meta.label}</div>
                  <div style={{ fontFamily:T.mono, fontSize:7, color:T.inkFaint, letterSpacing:'.16em', marginTop:5 }}>{meta.abbr}</div>
                </div>
              ))}
            </div>

            <div style={{ padding:'14px 16px', border:`1px solid ${adpt.color}24`, background:`${adpt.color}08`, borderLeft:`3px solid ${adpt.color}` }}>
              <div style={{ fontFamily:T.mono, fontSize:7, letterSpacing:'.32em', color:`${adpt.color}AA`, textTransform:'uppercase', marginBottom:5 }}>adaptabilidade</div>
              <div style={{ fontFamily:T.cond, fontWeight:800, fontSize:18, color:adpt.color, textTransform:'uppercase' }}>{adpt.label}</div>
              <p style={{ fontFamily:T.body, fontSize:12, lineHeight:1.6, color:T.inkDim, margin:'6px 0 0' }}>
                {prefs.adaptability >= 72 ? 'Detecta padrões que não funcionam e muda o plano mid-match.'
                  : prefs.adaptability >= 55 ? 'Consegue ajustar o jogo, mas demora para reconhecer o problema.'
                  : 'Tende a insistir no mesmo padrão mesmo quando está perdendo.'}
              </p>
            </div>
          </div>
        </div>

        <Sh color={`${sc}88`}>Marca em Quadra</Sh>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,minmax(0,1fr))', gap:10, marginBottom:18 }}>
          {[
            { label:'Jogada Favorita', meta:courtIdentity.favoritePlay, color:'#E8C84A' },
            { label:'Instinto', meta:courtIdentity.competitiveInstinct, color:'#5BB8E4' },
            { label:'Ponto Cego', meta:courtIdentity.blindSpot, color:'#FF7043' },
          ].map(({ label, meta, color }) => (
            <div key={label} style={{ padding:'14px 15px', minWidth:0, background:`${color}09`, border:`1px solid ${color}28`, borderTop:`3px solid ${color}` }}>
              <div style={{ fontFamily:T.mono, fontSize:7, letterSpacing:'.28em', color:`${color}AA`, textTransform:'uppercase', marginBottom:7 }}>{label}</div>
              <div style={{ display:'flex', alignItems:'center', gap:9, marginBottom:7 }}>
                <span style={{ fontFamily:T.mono, fontWeight:900, fontSize:12, color, lineHeight:1 }}>{meta.icon}</span>
                <span style={{ fontFamily:T.cond, fontWeight:800, fontSize:18, color:T.ink, textTransform:'uppercase', letterSpacing:'.04em', lineHeight:1 }}>{meta.label}</span>
              </div>
              <p style={{ fontFamily:T.body, fontSize:12, color:T.inkDim, lineHeight:1.55, margin:0 }}>{meta.desc}</p>
            </div>
          ))}
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
          <div style={{ border:'1px solid rgba(237,232,223,.075)', background:'rgba(255,255,255,.018)', padding:'16px 18px' }}>
            <Sh color={sc}>Armas Técnicas</Sh>
            {topAttrs.map(([key, value]) => {
              const meta = attrMeta(key);
              return (
                <div key={key} style={{ marginBottom:9 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', gap:10, marginBottom:4 }}>
                    <span style={{ fontFamily:T.cond, fontWeight:800, fontSize:13, color:T.ink, textTransform:'uppercase' }}>{meta.label}</span>
                    <span style={{ fontFamily:T.display, fontSize:18, color:meta.color, lineHeight:1 }}>{value}</span>
                  </div>
                  <MiniBar value={value} color={meta.color} height={4} />
                </div>
              );
            })}
          </div>
          <div style={{ border:'1px solid rgba(237,232,223,.075)', background:'rgba(255,255,255,.018)', padding:'16px 18px' }}>
            <Sh color="#F59E0B">Alertas</Sh>
            {lowAttrs.map(([key, value]) => {
              const meta = attrMeta(key);
              return (
                <div key={key} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 10px', marginBottom:6, borderLeft:'3px solid #F59E0B', background:'rgba(245,158,11,.045)' }}>
                  <span style={{ flex:1, fontFamily:T.cond, fontWeight:800, fontSize:13, color:T.inkDim, textTransform:'uppercase' }}>{meta.label}</span>
                  <span style={{ fontFamily:T.display, fontSize:18, color:'#F59E0B', lineHeight:1 }}>{value}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="upp2-scroll" style={{ width:'clamp(230px,22vw,300px)', flexShrink:0, padding:'20px 17px', background:'rgba(0,0,0,.14)', overflowY:'auto' }}>
        <Sh color={sc}>Assinaturas</Sh>
        {[naturalSig].filter(Boolean).map((sig, idx) => (
          <div key={`${sig.label}-${idx}`} style={{ padding:'13px 14px', border:'1px solid #E8C84A33', borderLeft:'3px solid #E8C84A', background:'rgba(232,200,74,.06)', marginBottom:9 }}>
            <div style={{ fontFamily:T.mono, fontSize:6.5, letterSpacing:'.32em', color:'#E8C84AAA', textTransform:'uppercase', marginBottom:5 }}>natural</div>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
              <span style={{ fontSize:22 }}>{sig.emoji}</span>
              <div style={{ fontFamily:T.cond, fontWeight:800, fontSize:16, color:T.ink, textTransform:'uppercase', lineHeight:1 }}>{sig.label}</div>
            </div>
            <div style={{ fontFamily:T.body, fontSize:11, color:T.inkDim, lineHeight:1.55 }}>{sig.description}</div>
          </div>
        ))}
        {!naturalSig && (
          <div style={{ padding:'12px 14px', border:'1px solid rgba(237,232,223,.07)', color:T.inkFaint, fontFamily:T.mono, fontSize:8, letterSpacing:'.18em', textTransform:'uppercase' }}>Sem golpe assinatura definido</div>
        )}

        {rallyPat && (
          <>
            <Sh color="#5BB8E4">Padrão de Rally</Sh>
            <div style={{ padding:'13px 14px', border:'1px solid rgba(91,184,228,.24)', borderLeft:'3px solid #5BB8E4', background:'rgba(91,184,228,.055)', marginBottom:14 }}>
              <div style={{ fontFamily:T.cond, fontWeight:800, fontSize:16, color:T.ink, textTransform:'uppercase' }}>{rallyPat.icon} {rallyPat.label}</div>
              <div style={{ fontFamily:T.body, fontSize:11, color:T.inkDim, lineHeight:1.55, marginTop:6 }}>{rallyPat.desc}</div>
            </div>
          </>
        )}

        <Sh color={sc}>Peso no Engine</Sh>
        {[
          { label:'Marca em Quadra', desc:'Aplica viés pequeno e auditável em decisão, instinto e ponto cego.' },
          { label:'Construção', desc:'Pesa escolha de direção, preparação e paciência do rally.' },
          { label:'Intenção', desc:'Funde tempo de ataque e tolerância a margem baixa.' },
          { label:'Rede', desc:'Pesa aproximação, fechamento e risco de subir sem preparar.' },
        ].map(({ label, desc }) => (
          <div key={label} style={{ marginBottom:9, paddingLeft:10, borderLeft:`1px solid ${T.line}` }}>
            <div style={{ fontFamily:T.cond, fontWeight:800, fontSize:11, color:T.inkDim, textTransform:'uppercase' }}>{label}</div>
            <div style={{ fontFamily:T.body, fontSize:10, color:T.inkFaint, lineHeight:1.5 }}>{desc}</div>
          </div>
        ))}

        {np.potential && (
          <>
            <Sh color={sc}>Mercado</Sh>
            <p style={{ fontFamily:T.body, fontSize:11, color:T.inkFaint, lineHeight:1.65, margin:0, fontStyle:'italic' }}>
              {getMarketAssessment(np, year ?? 2025)}
            </p>
          </>
        )}
      </div>
    </>
  );
}

function TalentRoutesView({ np, sc }) {
  const identity = getTalentIdentityPresentation(np);
  const Card = ({ item, selected = false, accent = sc }) => !item ? null : (
    <div style={{ position:'relative', padding:'13px 14px 12px', border:`1px solid ${selected ? accent : 'rgba(237,232,223,.12)'}`, background:selected ? `${accent}12` : 'rgba(255,255,255,.018)', minHeight:90, overflow:'hidden' }}>
      {selected && <div style={{ position:'absolute', top:0, right:0, padding:'4px 8px', background:accent, color:'#071016', fontFamily:T.mono, fontWeight:800, fontSize:6, letterSpacing:'.14em' }}>ATIVA</div>}
      <div style={{ fontFamily:T.mono, fontSize:6.5, letterSpacing:'.25em', color:selected ? accent : T.inkFaint, textTransform:'uppercase', marginBottom:6 }}>{item.kind}</div>
      <div style={{ fontFamily:T.cond, fontSize:17, fontWeight:800, color:T.ink, textTransform:'uppercase', letterSpacing:'.03em', paddingRight:selected?35:0 }}>{item.label}</div>
      <div style={{ fontFamily:T.body, fontSize:10, color:T.inkFaint, lineHeight:1.45, marginTop:5 }}>{item.desc}</div>
    </div>
  );
  return (
    <div className="upp2-scroll" style={{ flex:1, overflowY:'auto', padding:'24px 26px 34px' }}>
      <div style={{ maxWidth:1100, margin:'0 auto' }}>
        <div style={{ display:'flex', alignItems:'end', justifyContent:'space-between', gap:18, borderBottom:`1px solid ${T.line}`, paddingBottom:18, marginBottom:20 }}>
          <div><div style={{ fontFamily:T.mono,fontSize:7,letterSpacing:'.36em',color:sc,textTransform:'uppercase',marginBottom:7 }}>identidade competitiva</div><div style={{ fontFamily:T.display,fontSize:'clamp(34px,4vw,58px)',lineHeight:.85,color:T.ink }}>ROTAS DE TALENTO</div></div>
          <div style={{ maxWidth:290,fontFamily:T.body,fontSize:11,color:T.inkFaint,lineHeight:1.55 }}>Não são bônus soltos: é o caminho que explica onde o jogador ganha suas pequenas vantagens em quadra.</div>
        </div>
        <div style={{ display:'grid',gridTemplateColumns:'minmax(0,.84fr) 42px minmax(0,1.16fr)',gap:0,alignItems:'stretch' }}>
          <div><div style={{ fontFamily:T.mono,fontSize:7,letterSpacing:'.28em',color:'#D6B66A',textTransform:'uppercase',marginBottom:8 }}>01 · origem</div><Card item={identity.origin} selected accent="#D6B66A" /></div>
          <div style={{ display:'flex',justifyContent:'center',alignItems:'center',color:sc,fontSize:26 }}>→</div>
          <div><div style={{ fontFamily:T.mono,fontSize:7,letterSpacing:'.28em',color:sc,textTransform:'uppercase',marginBottom:8 }}>02 · rota dominante · {identity.routeLabel}</div><div style={{ display:'grid',gridTemplateColumns:'repeat(3,minmax(0,1fr))',gap:8 }}>{identity.routeNodes.map(item=><Card key={item.id} item={item} selected={item.selected} />)}</div></div>
        </div>
        <div style={{ height:22, borderLeft:`1px dashed ${sc}55`, marginLeft:'19%', marginTop:0 }} />
        <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:16 }}>
          <div><div style={{ fontFamily:T.mono,fontSize:7,letterSpacing:'.28em',color:'#7FD5FF',textTransform:'uppercase',marginBottom:8 }}>03 · fundamentos consolidados</div><div style={{ display:'grid',gridTemplateColumns:'repeat(3,minmax(0,1fr))',gap:8 }}>{identity.bases.map(item=><Card key={item.id} item={item} selected={item.selected} accent="#7FD5FF" />)}</div></div>
          <div><div style={{ fontFamily:T.mono,fontSize:7,letterSpacing:'.28em',color:'#E8C84A',textTransform:'uppercase',marginBottom:8 }}>04 · o que a carreira deixou</div><div style={{ display:'grid',gridTemplateColumns:'1fr',gap:8 }}>{identity.legacies.length ? identity.legacies.map(item=><Card key={item.id} item={item} selected accent="#E8C84A" />) : <div style={{ padding:18,border:`1px dashed ${T.line}`,fontFamily:T.body,fontSize:11,color:T.inkFaint,lineHeight:1.5 }}>Ainda sem uma marca de carreira. Títulos, grandes vitórias e cicatrizes podem abrir este espaço.</div>}{identity.mastery && <Card item={identity.mastery} selected accent="#C69CFF" />}</div></div>
        </div>
        <div style={{ marginTop:20,padding:'14px 17px',borderLeft:`3px solid ${sc}`,background:`${sc}08`,fontFamily:T.body,fontSize:11,color:T.inkFaint,lineHeight:1.6 }}><strong style={{ color:T.ink }}>Como ler:</strong> origem define a inclinação inicial; a rota escolhe uma das três especializações do estilo; fundamentos dão consistência; legado e maestria só aparecem por feitos ou atributos realmente excepcionais. Nenhuma rota passa por cima do teto 99 — ela torna o talento reconhecível no comportamento do atleta.</div>
      </div>
    </div>
  );
}

function TabJogo({ np, sc, potCat, arc, year = 2025 }) {
  const ov     = overallRating(np.attrs);

  // Prefs — usa o campo baked, ou gera on-the-fly como fallback
  const prefs = np.prefs ?? generatePrefs(np.attrs ?? {});
  const archetype = getArchetype(prefs);

  // Fase 7 — naturalSignature; assinatura de técnico antigo foi substituida pelo Banco Vivo.
  const naturalSigKey = np.naturalSignature ?? null;
  const naturalSig    = naturalSigKey ? NEW_SIGNATURE_SHOTS[naturalSigKey] : null;

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

  const [view, setView] = useState('prefs'); // prefs | atributos | rotas

  return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', minHeight:0 }}>
      <SubTabBar tabs={[['prefs','Scout TV'], ['atributos','Atributos'], ['rotas','Rotas de Talento']]} active={view} onTab={setView} sc={sc} />

      <div style={{ flex:1, display:'flex', overflow:'hidden', minHeight:0 }} key={view}>

        {view === 'prefs' && (() => {
          const bs   = getBuildStyleMeta(prefs.buildStyle);
          const ng   = getNetGameMeta(prefs.netGame);
          const ri   = getRallyIntentMeta(prefs);
          const adpt = adaptabilityLabel(prefs.adaptability);
          const courtIdentity = getCourtIdentity(np);

          return (
            <GameScoutPrefsView
              np={np}
              sc={sc}
              prefs={prefs}
              archetype={archetype}
              naturalSig={naturalSig}
              rallyPat={rallyPat}
              year={year}
            />
          );
        })()}

        {view === 'rotas' && <TalentRoutesView np={np} sc={sc} />}

        {view === 'atributos' && (() => {
          const burdenAttrs = new Set(getBurdenAffectedAttrs(np));
          return (
          <>
            {/* ATRIBUTOS — left cats */}
            <div className="upp2-scroll" style={{ flex:1, borderRight:`1px solid ${T.line}`, padding:'22px 22px', overflowY:'auto' }}>
              {burdenAttrs.size > 0 && (
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14,
                  padding:'7px 12px', background:'rgba(255,112,67,.08)', border:'1px solid rgba(255,112,67,.25)' }}>
                  <span style={{ fontSize:13 }}>??</span>
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

// -----------------------------------------------------------------
// TAB 3: CARREIRA
// -----------------------------------------------------------------
function TabCarreira({ np, sc, tournamentResults, chronicleEngine = null, historyBook = null, rivalrySystem = null, allPlayers = [], year = null }) {
  const ct = np.careerTitles ?? { gs:0, slamClash:0, masters:0, finals:0, atp500:0, atp250:0 };

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
      const ord = ['GRAND_SLAM','SLAM_CLASH','MASTERS_1000','FINALS','ATP_500','ATP_250','ATP_100'];
      const co = ord.indexOf(a.category) - ord.indexOf(b.category);
      return co !== 0 ? co : String(a.year).localeCompare(String(b.year));
    });
  }

  // Se temos CarreiraTimeline disponível (universo com chronicleEngine), renderiza ela no painel direito
  const hasTimeline = !!(np?._seasonHistory?.length || np?.careerHistory?.length || np?.lifeEventLog?.length || np?.youthProfile);

  // Total de títulos: quando tournamentResults disponível, usa uvWins (fonte única, sem double-count)
  const total = tournamentResults
    ? uvWins.length
    : (ct.gs??0)+(ct.slamClash??0)+(ct.masters??0)+(ct.finals??0)+(ct.atp500??0)+(ct.atp250??0);

  const TIERS = [
    { key:'gs',        label:'Grand Slams',    color:'#FFD700', icon:'?' },
    { key:'slamClash', label:'Clash Slams',    color:'#FF8A3D', icon:'??' },
    { key:'masters',   label:'Masters 1000',   color:'#E8A020', icon:'??' },
    { key:'finals',  label:'ATP Finals',     color:'#AA44FF', icon:'??' },
    { key:'atp500',  label:'ATP 500',        color:'#00BCD4', icon:'??' },
    { key:'atp250',  label:'ATP 250',        color:'#66BB6A', icon:'??' },
    { key:'olympic_gold', label:'Ouro Olímpico', color:'#1976D2', icon:'??' },
  ];

  // Career moments (do plano de personalidade din?mica)
  const moments = np.personality?.careerMoments ?? [];
  const biography = React.useMemo(
    () => buildPlayerBiography(np, { tournamentResults, currentYear: year }),
    [np, tournamentResults, year]
  );
  const narrativeFacts = biography.narrativeFacts ?? {};
  const goldenYears = narrativeFacts.goldenYears ?? [];
  const hardYears = narrativeFacts.hardYears ?? [];
  const firstTitle = biography.facts?.firstTitle ?? null;
  const topRival = biography.facts?.topRival ?? null;
  const historyRows = [...(np._seasonHistory ?? [])]
    .sort((a, b) => (Number(b.year) || 0) - (Number(a.year) || 0))
    .slice(0, 8);
  const titleMix = TIERS.map(({ key, label, color, icon }) => {
    const catMap = { gs:'GRAND_SLAM', slamClash:'SLAM_CLASH', masters:'MASTERS_1000', finals:'ATP_FINALS', atp500:'ATP_500', atp250:'ATP_250', olympic_gold:'OLYMPICS' };
    const uvCount = uvWins.filter(w => w.category === catMap[key]).length;
    const ctVal = key === 'olympic_gold' ? (ct.olympic?.gold ?? 0) : (ct[key] ?? 0);
    return { key, label, color, icon, value: tournamentResults ? uvCount : ctVal };
  });
  const biggestTitles = uvWins.slice(0, 6);
  const careerLead = biography.fullNarrative
    ? String(biography.fullNarrative).split(/\n{2,}/).map(p => p.trim()).filter(Boolean)[0]
    : biography.summary;
  const playerEras = React.useMemo(() => (historyBook?.eras ?? [])
    .filter(era => [...(era.protagonistIds ?? []), ...(era.rivalIds ?? [])].includes(np?.id))
    .sort((a, b) => (b.startYear ?? 0) - (a.startYear ?? 0)), [historyBook, np?.id]);

  return (
    <div style={{ flex:1, display:'flex', overflow:'hidden', minHeight:0 }}>
      <div className="upp2-scroll" style={{ flex:1, padding:'24px 26px 34px', borderRight:`1px solid ${T.line}`, overflowY:'auto' }}>
        <div style={{ display:'grid', gridTemplateColumns:'minmax(250px,.78fr) minmax(0,1.22fr)', gap:16, marginBottom:18 }}>
          <div style={{ border:`1px solid ${sc}34`, background:`linear-gradient(135deg, ${sc}14, rgba(237,232,223,.018))`, padding:'20px 22px', borderLeft:`5px solid ${sc}` }}>
            <div style={{ fontFamily:T.mono, fontSize:7, letterSpacing:'.38em', color:`${sc}AA`, textTransform:'uppercase', marginBottom:8 }}>arquivo da carreira</div>
            <div style={{ fontFamily:T.display, fontSize:86, color:sc, lineHeight:.82, textShadow:`0 0 38px ${sc}33` }}>{total}</div>
            <div style={{ fontFamily:T.cond, fontWeight:800, fontSize:22, color:T.ink, textTransform:'uppercase', letterSpacing:'.06em', marginTop:5 }}>titulos oficiais</div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,minmax(0,1fr))', gap:7, marginTop:16 }}>
              {[
                ['Fase', biography.careerPhase?.shortTag ?? biography.careerPhase?.label ?? 'em aberto', sc],
                ['Legado', biography.legacy?.shortTag ?? 'em formacao', '#E8C84A'],
                ['Marcos', String((biography.milestones ?? []).length), '#5BB8E4'],
              ].map(([label, value, color]) => (
                <div key={label} style={{ border:`1px solid ${color}24`, background:`${color}08`, padding:'9px 10px' }}>
                  <div style={{ fontFamily:T.mono, fontSize:6.5, color:`${color}AA`, letterSpacing:'.2em', textTransform:'uppercase', marginBottom:4 }}>{label}</div>
                  <div style={{ fontFamily:T.display, fontSize:17, color:T.ink, textTransform:'uppercase', lineHeight:1 }}>{value}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ border:'1px solid rgba(237,232,223,.075)', background:'rgba(255,255,255,.018)', padding:'20px 22px' }}>
            <div style={{ fontFamily:T.mono, fontSize:7, letterSpacing:'.38em', color:`${sc}AA`, textTransform:'uppercase', marginBottom:8 }}>memoria competitiva</div>
            <div style={{ fontFamily:T.display, fontSize:'clamp(28px,3vw,44px)', color:T.ink, lineHeight:.92, textTransform:'uppercase', marginBottom:12 }}>
              {biography.headline ?? np.name}
            </div>
            <p style={{ fontFamily:T.body, fontSize:14, color:T.inkDim, lineHeight:1.78, margin:0 }}>
              {careerLead ?? 'A carreira ainda esta construindo seus grandes capitulos no universo.'}
            </p>
            <div style={{ display:'flex', flexWrap:'wrap', gap:7, marginTop:16 }}>
              {(biography.narrativeSignals ?? []).slice(0, 7).map(signal => (
                <span key={signal} style={{ fontFamily:T.mono, fontSize:7, color:`${sc}CC`, letterSpacing:'.16em', textTransform:'uppercase', border:`1px solid ${sc}24`, background:`${sc}08`, padding:'5px 8px' }}>
                  {String(signal).replace(/_/g, ' ')}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'minmax(0,1fr) minmax(0,1fr)', gap:14, marginBottom:18 }}>
          <div style={{ border:'1px solid rgba(237,232,223,.075)', background:'rgba(255,255,255,.018)', padding:'17px 18px' }}>
            <Sh color={sc}>Mapa de Titulos</Sh>
            <div style={{ display:'grid', gap:8 }}>
              {titleMix.map(({ key, label, color, value }) => (
                <div key={key} style={{ display:'grid', gridTemplateColumns:'110px minmax(0,1fr) 42px', gap:10, alignItems:'center', opacity:value > 0 ? 1 : .38 }}>
                  <span style={{ fontFamily:T.cond, fontWeight:800, fontSize:13, color:value > 0 ? T.ink : T.inkFaint, textTransform:'uppercase' }}>{label}</span>
                  <div style={{ height:7, background:'rgba(237,232,223,.06)', overflow:'hidden' }}>
                    <div style={{ width:`${Math.min(100, value * 16)}%`, height:'100%', background:color, boxShadow:value > 0 ? `0 0 14px ${color}55` : 'none' }} />
                  </div>
                  <span style={{ fontFamily:T.display, fontSize:24, color:value > 0 ? color : T.inkFaint, textAlign:'right', lineHeight:1 }}>{value}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ border:'1px solid rgba(237,232,223,.075)', background:'rgba(255,255,255,.018)', padding:'17px 18px' }}>
            <Sh color={sc}>Anos-Chave</Sh>
            <div style={{ display:'grid', gap:8 }}>
              {[
                ['Ano dourado', goldenYears[0]?.year, goldenYears[0]?.titles?.length ? `${goldenYears[0].titles.length} titulo(s)` : biography.legacy?.summary, '#E8C84A'],
                ['Ano dificil', hardYears[0]?.year, hardYears[0]?.rankDrop ? `queda de ${hardYears[0].rankDrop} posicoes` : 'sem grande queda registrada', '#F59E0B'],
                ['Primeiro titulo', firstTitle?.year, firstTitle?.name, '#5BB8E4'],
                ['Rivalidade', topRival?.opponentName, topRival ? `${topRival.wins}-${topRival.losses}` : null, '#EF4444'],
              ].filter(([, value]) => value).map(([label, value, desc, color]) => (
                <div key={label} style={{ padding:'12px 14px', border:`1px solid ${color}28`, borderLeft:`3px solid ${color}`, background:`${color}08` }}>
                  <div style={{ fontFamily:T.mono, fontSize:7, color:`${color}CC`, letterSpacing:'.23em', textTransform:'uppercase', marginBottom:5 }}>{label}</div>
                  <div style={{ fontFamily:T.display, fontSize:22, color:T.ink, lineHeight:1, textTransform:'uppercase' }}>{value}</div>
                  {desc && <div style={{ fontFamily:T.body, fontSize:11, color:T.inkDim, lineHeight:1.5, marginTop:5 }}>{desc}</div>}
                </div>
              ))}
            </div>
          </div>
        </div>

        {playerEras.length > 0 && (
          <div style={{ border:'1px solid rgba(232,200,74,.24)', borderLeft:'3px solid #E8C84A', background:'rgba(232,200,74,.045)', padding:'16px 18px', marginBottom:18 }}>
            <Sh color="#B58B24">Eras do Circuito</Sh>
            <div style={{ display:'grid', gap:7, marginTop:10 }}>
              {playerEras.slice(0, 6).map(era => (
                <div key={era.id} style={{ display:'grid', gridTemplateColumns:'78px minmax(0,1fr) auto', gap:10, alignItems:'center', padding:'9px 10px', border:'1px solid rgba(232,200,74,.14)', background:'rgba(0,0,0,.035)' }}>
                  <div style={{ fontFamily:T.mono, fontSize:8, color:'#B58B24' }}>{era.startYear ?? '—'}{era.endYear ? `—${era.endYear}` : '—'}</div>
                  <div><div style={{ fontFamily:T.cond, fontWeight:800, fontSize:15, color:T.ink, textTransform:'uppercase' }}>{era.title ?? 'Era em formação'}</div><div style={{ fontFamily:T.body, fontSize:11, color:T.inkDim, marginTop:3 }}>{era.status === 'CLOSED' ? 'capítulo encerrado' : era.status === 'DECLINING' ? 'em declínio' : 'presença ativa na história do circuito'}</div></div>
                  <div style={{ fontFamily:T.mono, fontSize:7, color:T.inkFaint, textTransform:'uppercase' }}>{era.kind?.replace(/_/g, ' ')}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {biggestTitles.length > 0 && (
          <div style={{ marginBottom:18 }}>
            <Sh color={T.gold}>Títulos no Universo</Sh>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(2,minmax(0,1fr))', gap:8 }}>
              {biggestTitles.map((w, i) => {
                const tc = CAT_COLOR[w.category] ?? T.inkDim;
                return (
                  <div key={`${w.name}-${i}`} style={{ padding:'11px 13px', border:`1px solid ${tc}24`, borderLeft:`3px solid ${tc}`, background:`${tc}08`, minWidth:0 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', gap:10, marginBottom:5 }}>
                      <span style={{ fontFamily:T.mono, fontSize:7, color:`${tc}CC`, letterSpacing:'.16em' }}>{CAT_SHORT[w.category] ?? w.category}</span>
                      <span style={{ fontFamily:T.mono, fontSize:8, color:T.inkFaint }}>{w.year}</span>
                    </div>
                    <div style={{ fontFamily:T.cond, fontWeight:800, fontSize:15, color:T.ink, textTransform:'uppercase', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{w.name}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {historyRows.length > 0 && (
          <div>
            <Sh color={sc}>Temporadas Recentes</Sh>
            <div style={{ display:'grid', gap:4 }}>
              {historyRows.map((h, i) => {
                const yearLabel = formatProfileYear(h.year);
                const titleColor = h.titleWon ? '#E8C84A' : h.inDecline ? '#EF4444' : sc;
                return (
                  <div key={`${yearLabel}-${i}`} style={{ display:'grid', gridTemplateColumns:'64px minmax(0,1fr) 56px 56px', gap:10, alignItems:'center', padding:'9px 12px', border:'1px solid rgba(237,232,223,.06)', background:h.titleWon ? 'rgba(232,200,74,.045)' : h.inDecline ? 'rgba(239,68,68,.035)' : 'rgba(255,255,255,.014)', borderLeft:`3px solid ${titleColor}` }}>
                    <div style={{ fontFamily:T.display, fontSize:18, color:titleColor, lineHeight:1 }}>{yearLabel}</div>
                    <div style={{ fontFamily:T.cond, fontWeight:800, fontSize:13, color:T.ink, textTransform:'uppercase' }}>
                      {h.titleWon ? 'Temporada com titulo grande' : h.inDecline ? 'Temporada de queda' : 'Temporada de desenvolvimento'}
                    </div>
                    <div style={{ fontFamily:T.mono, fontSize:8, color:T.inkFaint }}>OVR <span style={{ color:T.ink }}>{h.ovr ?? '--'}</span></div>
                    <div style={{ fontFamily:T.mono, fontSize:8, color:(h.ovrDelta ?? 0) >= 0 ? '#22C55E' : '#EF4444', textAlign:'right' }}>{(h.ovrDelta ?? 0) > 0 ? '+' : ''}{h.ovrDelta ?? 0}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="upp2-scroll" style={{ width:'clamp(280px,31vw,410px)', flexShrink:0, padding:hasTimeline ? 0 : '22px 18px', background:'rgba(0,0,0,.12)', overflowY:'auto', display:'flex', flexDirection:'column' }}>
        {hasTimeline ? (
          <CarreiraTimeline np={np} sc={sc} rivalrySystem={rivalrySystem} allPlayers={allPlayers} year={year} sponsorEvents={sponsorEvents} />
        ) : (
          <>
            <Sh color={sc}>Marcos Emocionais</Sh>
            <div style={{ display:'grid', gap:10 }}>
              {moments.length === 0 ? (
                <div style={{ padding:'28px 14px', border:'1px solid rgba(237,232,223,.07)', color:T.inkFaint, fontFamily:T.body, fontSize:12, lineHeight:1.7 }}>
                  A carreira ainda nao acumulou momentos suficientes para uma linha emocional propria.
                </div>
              ) : [...moments].sort((a,b) => (b.year ?? 0) - (a.year ?? 0)).slice(0, 10).map((m, i) => {
                const meta = MOMENT_META[m.type] ?? { color:sc, icon:'', label:m.type };
                return (
                  <div key={`${m.year}-${i}`} style={{ padding:'13px 14px', border:`1px solid ${meta.color}24`, borderLeft:`3px solid ${meta.color}`, background:`${meta.color}08` }}>
                    <div style={{ fontFamily:T.mono, fontSize:7, color:`${meta.color}CC`, letterSpacing:'.2em', textTransform:'uppercase', marginBottom:5 }}>{m.year} - {meta.label}</div>
                    <div style={{ fontFamily:T.cond, fontWeight:800, fontSize:15, color:T.ink, textTransform:'uppercase', lineHeight:1.1 }}>{m.title}</div>
                    <p style={{ fontFamily:T.body, fontSize:11, color:T.inkDim, lineHeight:1.55, margin:'6px 0 0' }}>{m.desc}</p>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );

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
            const catMap = { gs:'GRAND_SLAM', slamClash:'SLAM_CLASH', masters:'MASTERS_1000', finals:'ATP_FINALS', atp500:'ATP_500', atp250:'ATP_250', olympic_gold:'OLYMPICS' };
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
                    <span style={{ fontSize:12, flexShrink:0 }}>??</span>
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
                  <div style={{ fontSize:36 }}>??</div>
                  <div style={{ fontFamily:T.mono, fontSize:8, letterSpacing:3, color:T.inkFaint, textTransform:'uppercase', textAlign:'center' }}>Disponível após temporadas no Universo</div>
                </div>
              ) : (
                <div style={{ position:'relative', paddingLeft:16 }}>
                  {/* Timeline line */}
                  <div style={{ position:'absolute', left:4, top:6, bottom:6, width:1, background:`linear-gradient(180deg,${sc}55,${sc}11)` }} />
                  {[...moments].sort((a,b) => (b.year ?? 0) - (a.year ?? 0)).map((m, i) => {
                    const meta      = MOMENT_META[m.type] ?? { color:sc, icon:'??', label:m.type };
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
                                <span style={{ fontFamily:T.mono, fontSize:7, color:'#ffffff44' }}>?</span>
                                <span style={{ fontFamily:T.mono, fontSize:6, color:MOOD_COLOR[m.moodAfter]??T.inkDim, fontWeight:700 }}>{MOOD_LABELS[m.moodAfter] ?? m.moodAfter}</span>
                              </div>
                            )}
                            {hasRepShift && (
                              <div style={{ display:'flex', alignItems:'center', gap:3, background:`${REP_COLOR[m.repAfter]??T.inkFaint}11`, border:`1px solid ${REP_COLOR[m.repAfter]??T.inkFaint}33`, padding:'2px 6px' }}>
                                <span style={{ fontFamily:T.mono, fontSize:6, color:`${REP_COLOR[m.repBefore]??T.inkFaint}99`, textDecoration:'line-through' }}>{m.repBefore}</span>
                                <span style={{ fontFamily:T.mono, fontSize:7, color:'#ffffff44' }}>?</span>
                                <span style={{ fontFamily:T.mono, fontSize:6, color:REP_COLOR[m.repAfter]??T.inkDim, fontWeight:700 }}>{m.repAfter}</span>
                              </div>
                            )}
                            {hasMarketShift && (
                              <div style={{ display:'flex', alignItems:'center', gap:3, background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.1)', padding:'2px 6px' }}>
                                <span style={{ fontFamily:T.mono, fontSize:6, color:m.marketAfter > m.marketBefore ? '#22C55E' : '#EF4444' }}>
                                  {m.marketAfter > m.marketBefore ? '?' : '?'} MKT {m.marketAfter}
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

// -----------------------------------------------------------------
// TAB 4: TRAJETÓRIA
// -----------------------------------------------------------------
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
          <div style={{ fontFamily:T.display, fontSize:11, letterSpacing:2, color:sc, marginBottom:2 }}>{formatProfileYear(hover.yr)}</div>
          <div style={{ fontFamily:T.mono, fontSize:10, color:T.ink }}>Nível <span style={{ color: ovrTier(hover.ovr).color, fontWeight:700 }}>{ovrTier(hover.ovr).grade}</span></div>
          {formatProfileAge(hover.age) != null && <div style={{ fontFamily:T.mono, fontSize:9, color:T.inkFaint }}>Idade {formatProfileAge(hover.age)}</div>}
          {hover.titleWon && <div style={{ fontFamily:T.mono, fontSize:9, color:'#FFD700' }}>{gsTypes.has(hover.titleWon)?'? Grand Slam':'?? Título'}</div>}
          {hover.inDecline && <div style={{ fontFamily:T.mono, fontSize:9, color:'#EF4444' }}>? Declínio</div>}
        </div>
      )}
    </div>
  );
}

function CareerTrajectoryDossier({ np, sc, year }) {
  const trajectory = np.careerTrajectory ?? null;
  const forecast = trajectory?.forecast ?? buildCareerTrajectoryForecast(np, year ?? 2025);
  const history = trajectory?.history ?? [];
  const snapshots = history.filter(entry => entry.type === 'SEASON_TRAJECTORY_SNAPSHOT').slice(-5).reverse();
  const decisive = history
    .filter(entry => !['BASELINE_ESTABLISHED', 'SEASON_TRAJECTORY_SNAPSHOT'].includes(entry.type))
    .slice(-6).reverse();
  const tone = {
    ASCENDING:'#22C55E', BUILDING:'#5BB8E4', BREAKTHROUGH_WINDOW:'#FFD700',
    DECISIVE_WINDOW:'#FF9800', AT_RISK:'#EF4444', VETERAN_REINVENTION:'#A78BFA', STABILIZING:sc,
  }[forecast.trend] ?? sc;
  const eventLabel = {
    REALIZATION_GAIN:'Resultado que acelerou a trajetória',
    PERSONALITY_RESPONSE:'Resposta mental à temporada',
    HEALTH_LOAD_RESPONSE:'Corpo e calendário',
    COACH_PARTNERSHIP_VALIDATED:'Parceria técnica validada',
    COACH_ADAPTATION:'Adaptação de equipe',
    COACH_FRICTION:'Atrito com a equipe técnica',
    WINDOW_PHASE_CHANGED:'Mudança de janela de carreira',
  };

  return (
    <div style={{ border:`1px solid ${tone}38`, borderLeft:`5px solid ${tone}`, background:`linear-gradient(135deg, ${tone}11, rgba(237,232,223,.018))`, padding:'18px 20px', marginBottom:18 }}>
      <div style={{ display:'grid', gridTemplateColumns:'minmax(0,1.15fr) minmax(230px,.85fr)', gap:18 }}>
        <div>
          <div style={{ fontFamily:T.mono, fontSize:7, letterSpacing:'.34em', color:`${tone}CC`, textTransform:'uppercase', marginBottom:7 }}>dossiê de trajetória · leitura do circuito</div>
          <div style={{ fontFamily:T.display, fontSize:'clamp(26px,3vw,42px)', lineHeight:.9, color:T.ink, textTransform:'uppercase' }}>{forecast.label}</div>
          <p style={{ fontFamily:T.body, fontSize:13, color:T.inkDim, lineHeight:1.7, margin:'10px 0 0' }}>{forecast.summary}</p>
          <div style={{ display:'flex', flexWrap:'wrap', gap:7, marginTop:13 }}>
            {(forecast.drivers ?? []).map((driver, index) => (
              <span key={`${driver}-${index}`} style={{ fontFamily:T.mono, fontSize:7, color:`${tone}DD`, letterSpacing:'.1em', border:`1px solid ${tone}2D`, background:`${tone}09`, padding:'5px 7px' }}>{driver}</span>
            ))}
          </div>
        </div>
        <div style={{ borderLeft:`1px solid ${tone}24`, paddingLeft:17 }}>
          <div style={{ fontFamily:T.mono, fontSize:7, letterSpacing:'.26em', color:T.inkFaint, textTransform:'uppercase', marginBottom:8 }}>leitura atual</div>
          <div style={{ display:'flex', alignItems:'baseline', justifyContent:'space-between', gap:10, marginBottom:9 }}>
            <span style={{ fontFamily:T.cond, fontSize:17, fontWeight:800, color:tone, textTransform:'uppercase' }}>{String(forecast.trend ?? 'STABILIZING').replace(/_/g, ' ')}</span>
            <span style={{ fontFamily:T.mono, fontSize:8, color:T.inkFaint }}>{forecast.confidence ?? 50}% de clareza</span>
          </div>
          <div style={{ height:5, background:'rgba(237,232,223,.08)', overflow:'hidden', marginBottom:11 }}><div style={{ width:`${forecast.confidence ?? 50}%`, height:'100%', background:tone, boxShadow:`0 0 12px ${tone}66` }} /></div>
          <div style={{ fontFamily:T.body, fontSize:11, color:T.inkFaint, lineHeight:1.55 }}>É uma leitura da direção da carreira, não uma promessa de overall, ranking ou título.</div>
        </div>
      </div>

      {(decisive.length > 0 || snapshots.length > 0) && <div style={{ display:'grid', gridTemplateColumns:'minmax(0,1fr) minmax(0,1fr)', gap:15, marginTop:17, paddingTop:15, borderTop:`1px solid ${tone}20` }}>
        <div>
          <div style={{ fontFamily:T.mono, fontSize:7, letterSpacing:'.26em', color:T.inkFaint, textTransform:'uppercase', marginBottom:7 }}>o que virou a curva</div>
          {decisive.length ? decisive.slice(0, 3).map((entry, index) => (
            <div key={`${entry.type}-${entry.year}-${index}`} style={{ padding:'7px 0', borderBottom:index < Math.min(2, decisive.length - 1) ? '1px solid rgba(237,232,223,.06)' : 'none' }}>
              <div style={{ fontFamily:T.cond, fontWeight:800, fontSize:13, color:T.ink, textTransform:'uppercase' }}>{formatProfileYear(entry.year)} · {eventLabel[entry.type] ?? String(entry.type).replace(/_/g, ' ')}</div>
              <div style={{ fontFamily:T.body, fontSize:11, color:T.inkFaint, lineHeight:1.45, marginTop:2 }}>{entry.reason ?? entry.from ? `${entry.reason ?? 'fase'}${entry.to ? ` → ${entry.to}` : ''}` : 'Marco registrado na evolução.'}</div>
            </div>
          )) : <div style={{ fontFamily:T.body, fontSize:11, color:T.inkFaint }}>A carreira ainda está reunindo sinais suficientes.</div>}
        </div>
        <div>
          <div style={{ fontFamily:T.mono, fontSize:7, letterSpacing:'.26em', color:T.inkFaint, textTransform:'uppercase', marginBottom:7 }}>arquivo de leituras</div>
          {snapshots.length ? snapshots.slice(0, 3).map((entry, index) => (
            <div key={`${entry.year}-${index}`} style={{ display:'grid', gridTemplateColumns:'42px 1fr', gap:8, padding:'7px 0', borderBottom:index < Math.min(2, snapshots.length - 1) ? '1px solid rgba(237,232,223,.06)' : 'none' }}>
              <span style={{ fontFamily:T.display, fontSize:17, color:tone, lineHeight:1 }}>{formatProfileYear(entry.year)}</span>
              <div><div style={{ fontFamily:T.cond, fontSize:13, fontWeight:800, color:T.ink, textTransform:'uppercase' }}>{entry.forecast?.label ?? 'Leitura em formação'}</div><div style={{ fontFamily:T.body, fontSize:10.5, color:T.inkFaint, lineHeight:1.4 }}>{(entry.drivers ?? []).join(' · ') || 'Sem causa dominante isolada.'}</div></div>
            </div>
          )) : <div style={{ fontFamily:T.body, fontSize:11, color:T.inkFaint }}>O primeiro arquivo anual aparece ao fechar a temporada.</div>}
        </div>
      </div>}
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
  if (inDecline)                                { phaseLabel='Em Declínio';        phaseColor='#EF4444'; phaseIcon='??'; }
  else if (yearsToPeak !== null && yearsToPeak<=1) { phaseLabel='No Pico';            phaseColor='#FFD700'; phaseIcon='?'; }
  else if (yearsToPeak !== null && yearsToPeak<=3) { phaseLabel='Chegando ao Pico';   phaseColor='#FF9800'; phaseIcon='??'; }
  else                                            { phaseLabel='Em Desenvolvimento';  phaseColor='#22C55E'; phaseIcon='??'; }

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
  const seasonHistoryRows = Object.values(history.reduce((acc, h) => {
    acc[formatProfileYear(h.year)] = h;
    return acc;
  }, {})).sort((a, b) => (Number(a.year) || 0) - (Number(b.year) || 0));
  const phase = scoutPhaseLabel(np);
  const currentAge = formatProfileAge(np.age);
  const peakAge = formatProfileAge(np.peakAge);
  const ageProgress = currentAge != null && peakAge != null
    ? Math.max(0, Math.min(100, Math.round((currentAge / Math.max(1, peakAge + 5)) * 100)))
    : 45;
  const recentRows = [...seasonHistoryRows].reverse().slice(0, 7);
  const bestSeason = history.length
    ? [...history].sort((a, b) => (b.ovr ?? 0) - (a.ovr ?? 0))[0]
    : null;
  const lastRank = rankHist.length ? rankHist[rankHist.length - 1] : null;
  const firstRank = rankHist.length ? rankHist[0] : null;
  const rankTrend = firstRank?.rank && lastRank?.rank ? firstRank.rank - lastRank.rank : 0;
  const developmentPulse = [
    ['Fase', phase.label, phase.color],
    ['Pico previsto', peakAge != null ? `${peakAge} anos` : 'em leitura', '#E8C84A'],
    ['Tempo ate pico', yearsToPeak == null ? '---' : yearsToPeak > 0 ? `${yearsToPeak} anos` : 'agora', yearsToPeak != null && yearsToPeak <= 0 ? '#E8C84A' : sc],
    ['Tendencia ranking', rankTrend > 0 ? `+${rankTrend}` : rankTrend < 0 ? `${rankTrend}` : 'estavel', rankTrend > 0 ? '#22C55E' : rankTrend < 0 ? '#EF4444' : T.inkFaint],
  ];

  return (
    <div style={{ flex:1, display:'flex', overflow:'hidden', minHeight:0 }}>
      <div className="upp2-scroll" style={{ flex:1, padding:'24px 26px 34px', borderRight:`1px solid ${T.line}`, overflowY:'auto' }}>
        <div style={{ display:'grid', gridTemplateColumns:'minmax(320px,.9fr) minmax(0,1.1fr)', gap:16, marginBottom:18 }}>
          <div style={{ border:`1px solid ${phase.color}32`, background:`linear-gradient(135deg, ${phase.color}13, rgba(237,232,223,.018))`, borderLeft:`5px solid ${phase.color}`, padding:'20px 22px' }}>
            <div style={{ fontFamily:T.mono, fontSize:7, letterSpacing:'.38em', color:`${phase.color}BB`, textTransform:'uppercase', marginBottom:8 }}>curva da carreira</div>
            <div style={{ fontFamily:T.display, fontSize:'clamp(34px,4vw,58px)', color:phase.color, lineHeight:.88, textTransform:'uppercase' }}>{phase.label}</div>
            <p style={{ fontFamily:T.body, fontSize:13, color:T.inkDim, lineHeight:1.7, margin:'12px 0 16px' }}>
              {inDecline
                ? 'O jogador ja mostra sinais de desgaste: a curva ainda pode render, mas cada temporada cobra mais.'
                : yearsToPeak != null && yearsToPeak <= 1
                  ? 'A janela principal esta aberta agora. O motor enxerga pico tecnico ou quase pico.'
                  : 'A trajetoria ainda tem espaco de crescimento, com margem para transformar atributos em resultado.'}
            </p>
            <div style={{ height:8, background:'rgba(237,232,223,.07)', overflow:'hidden', marginBottom:8 }}>
              <div style={{ width:`${ageProgress}%`, height:'100%', background:`linear-gradient(90deg, ${sc}, ${phase.color})`, boxShadow:`0 0 18px ${phase.color}55` }} />
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', fontFamily:T.mono, fontSize:7, color:T.inkFaint, letterSpacing:'.16em', textTransform:'uppercase' }}>
              <span>{currentAge != null ? `${currentAge} anos` : 'idade ?'}</span>
              <span>{peakAge != null ? `pico ${peakAge}` : 'pico em leitura'}</span>
            </div>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,minmax(0,1fr))', gap:8 }}>
            {developmentPulse.map(([label, value, color]) => (
              <div key={label} style={{ border:`1px solid ${color}24`, background:`${color}08`, padding:'13px 14px', minHeight:94 }}>
                <div style={{ fontFamily:T.mono, fontSize:7, color:`${color}AA`, letterSpacing:'.22em', textTransform:'uppercase', marginBottom:7 }}>{label}</div>
                <div style={{ fontFamily:T.display, fontSize:label === 'Fase' ? 22 : 28, color:T.ink, lineHeight:.95, textTransform:'uppercase' }}>{value}</div>
              </div>
            ))}
            {[
              ['Melhor fase', ovrTier(peakOvr).grade, ovrTier(peakOvr).color],
              ['Melhor rank', peakRank ? `#${peakRank}` : '---', T.gold],
              ['Rank atual', currentRank ? `#${currentRank}` : '---', sc],
              ['GS na curva', history.filter(h=>gsTypes.has(h.titleWon)).length, '#FFD700'],
            ].map(([label, value, color]) => (
              <div key={label} style={{ border:`1px solid ${color}24`, background:`${color}08`, padding:'13px 14px', minHeight:94 }}>
                <div style={{ fontFamily:T.mono, fontSize:7, color:`${color}AA`, letterSpacing:'.22em', textTransform:'uppercase', marginBottom:7 }}>{label}</div>
                <div style={{ fontFamily:T.display, fontSize:32, color, lineHeight:.9, textTransform:'uppercase' }}>{value}</div>
              </div>
            ))}
          </div>
        </div>

        <CareerTrajectoryDossier np={np} sc={sc} year={year} />

        <div style={{ border:'1px solid rgba(237,232,223,.075)', background:'rgba(255,255,255,.018)', padding:'18px 20px', marginBottom:18 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', gap:14, marginBottom:8 }}>
            <Sh color={sc}>Curva de Evolução</Sh>
            {bestSeason && (
              <div style={{ fontFamily:T.mono, fontSize:7, color:T.inkFaint, letterSpacing:'.18em', textTransform:'uppercase' }}>
                melhor ano {formatProfileYear(bestSeason.year)} · OVR {bestSeason.ovr}
              </div>
            )}
          </div>
          <OVRChart history={history} rankHist={rankHist} sc={sc} year={year} />
        </div>

        {recentRows.length > 0 && (
          <div>
            <Sh color={sc}>Linha de Temporadas</Sh>
            <div style={{ display:'grid', gap:5 }}>
              {recentRows.map((h, i) => {
                const seasonYear = formatProfileYear(h.year);
                const rh = rankHist.find(r => formatProfileYear(r.year) === seasonYear);
                const lineColor = gsTypes.has(h.titleWon) ? '#FFD700' : h.inDecline ? '#EF4444' : (h.ovrDelta ?? 0) > 0 ? '#22C55E' : sc;
                const label = gsTypes.has(h.titleWon) ? 'Grand Slam' : h.titleWon ? 'Titulo' : h.inDecline ? 'Declinio' : (h.ovrDelta ?? 0) > 0 ? 'Crescimento' : 'Estavel';
                return (
                  <div key={`${h.year}-${i}`} style={{ display:'grid', gridTemplateColumns:'66px minmax(0,1fr) 74px 70px 52px', gap:10, alignItems:'center', padding:'10px 13px', border:'1px solid rgba(237,232,223,.06)', borderLeft:`3px solid ${lineColor}`, background:`${lineColor}07` }}>
                    <div style={{ fontFamily:T.display, fontSize:20, color:lineColor, lineHeight:1 }}>{seasonYear}</div>
                    <div>
                      <div style={{ fontFamily:T.cond, fontWeight:800, fontSize:14, color:T.ink, textTransform:'uppercase', lineHeight:1 }}>{label}</div>
                      {formatProfileAge(h.age) != null && <div style={{ fontFamily:T.mono, fontSize:7, color:T.inkFaint, marginTop:3 }}>{formatProfileAge(h.age)} anos</div>}
                    </div>
                    <div style={{ fontFamily:T.mono, fontSize:8, color:T.inkFaint }}>OVR <span style={{ color:T.ink }}>{h.ovr ?? '--'}</span></div>
                    <div style={{ fontFamily:T.mono, fontSize:8, color:(h.ovrDelta ?? 0) >= 0 ? '#22C55E' : '#EF4444' }}>{(h.ovrDelta ?? 0) > 0 ? '+' : ''}{Number(h.ovrDelta ?? 0).toFixed(1)}</div>
                    <div style={{ fontFamily:T.display, fontSize:16, color:T.gold, textAlign:'right' }}>{rh?.rank ? `#${rh.rank}` : '---'}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="upp2-scroll" style={{ width:'clamp(250px,28vw,330px)', flexShrink:0, padding:'24px 18px', background:'rgba(0,0,0,.12)', overflowY:'auto' }}>
        <Sh color={sc}>Última Temporada</Sh>
        {lastSeason ? (
          <>
            <div style={{ border:`1px solid ${ovrDelta > 0 ? '#22C55E33' : ovrDelta < 0 ? '#EF444433' : `${sc}28`}`, background:ovrDelta > 0 ? 'rgba(34,197,94,.06)' : ovrDelta < 0 ? 'rgba(239,68,68,.055)' : `${sc}08`, padding:'16px 17px', marginBottom:15 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:8 }}>
                <div style={{ fontFamily:T.display, fontSize:30, color:sc, lineHeight:1 }}>{formatProfileYear(lastSeason.year)}</div>
                <div style={{ fontFamily:T.display, fontSize:34, color:ovrDelta > 0 ? '#22C55E' : ovrDelta < 0 ? '#EF4444' : T.inkFaint, lineHeight:1 }}>{ovrDelta > 0 ? '+' : ''}{ovrDelta}</div>
              </div>
              <div style={{ fontFamily:T.body, fontSize:12, color:T.inkDim, lineHeight:1.6 }}>
                {ovrDelta > 0 ? 'Temporada de subida tecnica.' : ovrDelta < 0 ? 'Temporada de perda ou desgaste.' : 'Temporada sem grande deslocamento tecnico.'}
              </div>
            </div>

            <Sh color="#22C55E">Ganhos</Sh>
            {gains.length > 0 ? gains.slice(0, 6).map(([k,d]) => {
              const { label, color } = attrLabel(k);
              return (
                <div key={k} style={{ display:'flex', alignItems:'center', gap:8, padding:'7px 10px', background:'rgba(34,197,94,.045)', borderLeft:`2px solid ${color}`, marginBottom:5 }}>
                  <span style={{ flex:1, fontFamily:T.cond, fontWeight:800, fontSize:12, color:T.ink, textTransform:'uppercase' }}>{label}</span>
                  <span style={{ fontFamily:T.display, fontSize:16, color:'#22C55E' }}>+{d}</span>
                </div>
              );
            }) : <div style={{ fontFamily:T.body, fontSize:11, color:T.inkFaint, lineHeight:1.6, marginBottom:14 }}>Nenhum ganho de atributo registrado.</div>}

            <Sh color="#EF4444">Perdas</Sh>
            {losses.length > 0 ? losses.slice(0, 6).map(([k,d]) => {
              const { label } = attrLabel(k);
              return (
                <div key={k} style={{ display:'flex', alignItems:'center', gap:8, padding:'7px 10px', background:'rgba(239,68,68,.045)', borderLeft:'2px solid rgba(239,68,68,.55)', marginBottom:5 }}>
                  <span style={{ flex:1, fontFamily:T.cond, fontWeight:800, fontSize:12, color:T.inkDim, textTransform:'uppercase' }}>{label}</span>
                  <span style={{ fontFamily:T.display, fontSize:16, color:'#EF4444' }}>{d}</span>
                </div>
              );
            }) : <div style={{ fontFamily:T.body, fontSize:11, color:T.inkFaint, lineHeight:1.6 }}>Nenhuma queda de atributo registrada.</div>}
          </>
        ) : (
          <div style={{ padding:'30px 14px', border:'1px solid rgba(237,232,223,.07)', fontFamily:T.body, fontSize:12, color:T.inkFaint, lineHeight:1.7 }}>
            A trajetória começa a ficar legível depois da primeira temporada simulada.
          </div>
        )}
      </div>
    </div>
  );

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
        {seasonHistoryRows.length > 0 && (
          <div>
            <Sh color={sc}>Temporada a Temporada</Sh>
            <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
              {[...seasonHistoryRows].reverse().map((h, i) => {
                const isGS = gsTypes.has(h.titleWon);
                const seasonYear = formatProfileYear(h.year);
                const seasonAge = formatProfileAge(h.age);
                const rh = rankHist.find(r=>formatProfileYear(r.year)===seasonYear);
                return (
                  <div key={`${h.year}-${i}`} style={{ display:'flex', alignItems:'center', gap:10, padding:isGS?'10px 13px':'7px 13px', border:isGS?'1px solid rgba(255,215,0,.2)':h.inDecline?'1px solid rgba(239,68,68,.1)':'1px solid rgba(237,232,223,.05)', background:isGS?'rgba(255,215,0,.04)':h.inDecline?'rgba(239,68,68,.02)':'rgba(237,232,223,.01)', position:'relative' }}>
                    {isGS && <div style={{ position:'absolute', left:0, top:0, bottom:0, width:2, background:'#FFD700' }}/>}
                    {h.inDecline && !h.titleWon && <div style={{ position:'absolute', left:0, top:0, bottom:0, width:2, background:'#EF4444', opacity:.5 }}/>}
                    <span style={{ fontFamily:T.display, fontSize:13, letterSpacing:2, color:isGS?'#FFD700':h.inDecline?'#EF4444':sc, minWidth:44 }}>{seasonYear}</span>
                    {seasonAge != null && <span style={{ fontFamily:T.mono, fontSize:8, color:T.inkFaint, minWidth:24 }}>{seasonAge}a</span>}
                    <div style={{ flex:1 }}>
                      {isGS && <span style={{ fontFamily:T.display, fontSize:11, color:'#FFD700', letterSpacing:1 }}>? GRAND SLAM</span>}
                      {h.titleWon && !isGS && <span style={{ fontFamily:T.display, fontSize:11, color:sc, letterSpacing:1 }}>?? TÍTULO</span>}
                      {h.inDecline && !h.titleWon && <span style={{ fontFamily:T.mono, fontSize:7, color:'#EF4444' }}>? declínio</span>}
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
                <div style={{ fontFamily:T.mono, fontSize:7, letterSpacing:3, color:T.inkFaint, textTransform:'uppercase' }}>{formatProfileYear(lastSeason.year)}</div>
                <div style={{ fontFamily:T.display, fontSize:11, color:T.ink }}>{formatProfileAge(lastSeason.age) ?? '--'} anos</div>
              </div>
              <div style={{ width:1, height:30, background:T.line }}/>
              <div style={{ textAlign:'center' }}>
                <div style={{ fontFamily:T.mono, fontSize:7, letterSpacing:2, color:T.inkFaint, textTransform:'uppercase' }}>? OVR</div>
                <div style={{ fontFamily:T.display, fontSize:32, lineHeight:1, color:ovrDelta>0?'#22C55E':ovrDelta<0?'#EF4444':T.inkFaint }}>{ovrDelta>0?'+':''}{ovrDelta}</div>
              </div>
              <div style={{ width:1, height:30, background:T.line }}/>
              <div style={{ textAlign:'center' }}>
                <div style={{ fontFamily:T.mono, fontSize:7, letterSpacing:2, color:T.inkFaint, textTransform:'uppercase' }}>OVR</div>
                <div style={{ fontFamily:T.display, fontSize:22, color:sc }}>{lastSeason.ovr}</div>
              </div>
            </div>

            {gains.length > 0 && (
              <div style={{ marginBottom:10 }}>
                <div style={{ fontFamily:T.mono, fontSize:7, letterSpacing:3, color:'#22C55E', textTransform:'uppercase', marginBottom:6 }}>? Cresceram</div>
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
                <div style={{ fontFamily:T.mono, fontSize:7, letterSpacing:3, color:'#EF4444', textTransform:'uppercase', marginBottom:6 }}>? Declinaram</div>
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
            <div style={{ fontSize:36 }}>??</div>
            <div style={{ fontFamily:T.mono, fontSize:8, letterSpacing:3, color:T.inkFaint, textTransform:'uppercase', textAlign:'center' }}>Dados disponíveis após a 1ª temporada</div>
          </div>
        )}
      </div>
    </div>
  );
}

// -----------------------------------------------------------------
// TAB 5: RESULTADOS
// -----------------------------------------------------------------
function TabResultados({ np, sc, tournamentResults }) {
  const [view, setView] = useState('torneios');
  const [openYears, setOpenYears] = useState(null); // null = all open

  const ROUND_LABELS_ORDER = ['R128','R64','R32','R16','QF','SF','F','W'];
  const TP = {
    GRAND_SLAM:   { W:2000,F:1300,SF:800, QF:400,R16:200,R32:100,R64:50, R128:10 },
    SLAM_CLASH:   { W:1250,F:800,SF:480, QF:240,R16:120,R32:60, R64:30, R128:15 },
    MASTERS_1000: { W:1000,F:650, SF:400, QF:200,R16:100,R32:60, R64:30              },
    ATP_500:      { W:500, F:330, SF:200, QF:100,R16:50, R32:25                       },
    ATP_250:      { W:250, F:165, SF:100, QF:50, R16:25, R32:0                        },
    ATP_100:      { W:100, F:60,  SF:36,  QF:18, R16:8,  R32:3,  R64:1               },
    FINALS:       { W:1500,F:1000,SF:500                                               },
  };
  const pts = (cat, round) => TP[cat]?.[round] ?? 0;

  // -- Extrai participações do jogador — slim + completo --------------
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
        // -- Formato slim ----------------------------------------------
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
        // -- Formato completo ------------------------------------------
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
                // lost here ? round is this round from the end
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

      // -- Extrair último adversário e sets --------------------------
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
    const rec = { CLAY:{w:0,l:0}, GRASS:{w:0,l:0}, HARD:{w:0,l:0}, STREET:{w:0,l:0}, CARPET:{w:0,l:0}, INDOOR:{w:0,l:0} };
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
      <SubTabBar tabs={[['torneios','?? Torneios'], ['superficies','??? Superfícies']]} active={view} onTab={setView} sc={sc} />
      <div className="upp2-scroll" style={{ flex:1, padding:'20px 24px', overflowY:'auto' }} key={view}>

        {view === 'torneios' && (
          <>
            {/* Stats bar */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,minmax(0,1fr))', gap:10, marginBottom:22 }} >
              <StatCard label="Disputados"  value={allEntries.length} color={T.inkDim} />
              <StatCard label="Títulos"     value={titles}             color='#FFD700'  />
              <StatCard label="Finais"      value={finals}             color='#E0E0E0'  />
              <StatCard label="Temporadas"  value={seasons}            color={sc}       />
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1.15fr .85fr',gap:12,marginBottom:16}}>
              <div style={{padding:'16px 18px',background:'linear-gradient(180deg, rgba(255,255,255,.03), rgba(255,255,255,.012))',border:'1px solid rgba(237,232,223,.08)'}}>
                <div style={{fontFamily:T.mono,fontSize:7,letterSpacing:3,color:`${sc}88`,textTransform:'uppercase',marginBottom:6}}>Panorama de carreira</div>
                <div style={{fontFamily:T.cond,fontSize:22,fontWeight:700,color:'rgba(237,232,223,.92)',letterSpacing:'.05em',textTransform:'uppercase'}}>Linha completa de torneios e superfícies</div>
                <div style={{fontFamily:T.body,fontSize:12,color:'rgba(237,232,223,.6)',lineHeight:1.6,marginTop:8}}>Veja o volume da carreira, as temporadas mais fortes e como os resultados se distribuíram pelo circuito.</div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                {[
                  {label:'Últimos 30', value:String(last30.length), tone:'#7DD3FC'},
                  {label:'Partidas rastreadas', value:String(totalM), tone:'#A78BFA'},
                  {label:'Melhor bloco', value: titles>0 ? `${titles} títulos` : 'Sem título', tone:'#E8C84A'},
                  {label:'Recorte', value: `${seasons} anos`, tone:sc},
                ].map(card => (
                  <div key={card.label} style={{padding:'12px 14px',background:'rgba(255,255,255,.022)',border:'1px solid rgba(237,232,223,.08)'}}>
                    <div style={{fontFamily:T.mono,fontSize:7,letterSpacing:3,color:`${card.tone}88`,textTransform:'uppercase',marginBottom:6}}>{card.label}</div>
                    <div style={{fontFamily:T.display,fontSize:28,lineHeight:.92,color:card.tone}}>{card.value}</div>
                  </div>
                ))}
              </div>
            </div>

            {allEntries.length === 0 ? (
              <div style={{ display:'flex', flexDirection:'column', alignItems:'center', padding:'60px 0', gap:10, opacity:.3 }}>
                <div style={{ fontSize:44 }}>??</div>
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
                        padding:'14px 18px', cursor:'pointer',
                        background: isOpen ? 'rgba(255,255,255,.05)' : 'rgba(255,255,255,.02)',
                        borderLeft:`3px solid ${isOpen ? sc : 'rgba(255,255,255,.12)'}`,
                        borderBottom:`1px solid rgba(255,255,255,.06)`,
                        transition:'all .15s',
                        userSelect:'none',
                      }}
                    >
                      <span style={{ fontFamily:T.display, fontSize:24, fontWeight:900, letterSpacing:3, color: isOpen ? '#fff' : T.inkFaint, minWidth:56 }}>{year}</span>
                      <span style={{ fontFamily:T.mono, fontSize:9, letterSpacing:2, color:T.inkFaint, textTransform:'uppercase' }}>{entries.length} torneios</span>
                      {yearTitles > 0 && (
                        <span style={{ fontFamily:T.display, fontSize:11, color:'#FFD700', letterSpacing:1, background:'rgba(255,215,0,.1)', border:'1px solid rgba(255,215,0,.25)', padding:'1px 8px' }}>?? {yearTitles} TÍT</span>
                      )}
                      <div style={{ flex:1 }} />
                      <span style={{ fontFamily:T.mono, fontSize:11, fontWeight:700, color: yearPts > 0 ? sc : T.inkFaint, letterSpacing:1 }}>
                        {yearPts > 0 ? `+${yearPts} pts` : ''}
                      </span>
                      <span style={{ fontFamily:T.mono, fontSize:10, color:T.inkFaint, marginLeft:12, width:14, textAlign:'center' }}>{isOpen ? '?' : '?'}</span>
                    </div>

                    {/* Torneios do ano */}
                    {isOpen && (
                      <div>
                        {entries.map((e, i) => {
                          const rs = roundStyle(e.round);
                          const isW = e.round === 'W';

                          // Cor do piso com intensidade por import?ncia
                          const SURF_BASE = { HARD:'#1565C0', CLAY:'#8B3A0F', GRASS:'#2E7D32', INDOOR:'#6A1B9A' };
const CAT_ALPHA = { GRAND_SLAM:.28, SLAM_CLASH:.24, MASTERS_1000:.22, FINALS:.22, ATP_500:.16, ATP_250:.12, ATP_100:.08 };
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
                            GRAND_SLAM:'GS', SLAM_CLASH:'CS', MASTERS_1000:'M1000', FINALS:'CHAMP',
                            ATP_500:'ATP500', ATP_250:'ATP250', ATP_100:'ATP100',
                          };
                          const CAT_BADGE_COLOR = {
                            GRAND_SLAM:'#FFD700', SLAM_CLASH:'#FF8A3D', MASTERS_1000:'#E040FB', FINALS:'#F44336',
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
                                  {isW ? '?? TÍT' : (ROUND_LABEL[e.round] ?? e.round)}
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
              {[{key:'CLAY'},{key:'GRASS'},{key:'HARD'},{key:'STREET'},{key:'CARPET'},{key:'INDOOR'}].map(({ key }) => {
                const rec = surfRec[key];
                const total = rec.w+rec.l;
                const pct = total > 0 ? Math.round(rec.w/total*100) : null;
                const color = SURF_COLOR[key];
                const noData = total===0;
                const surfaceDna = np.surfaceProfile?.dna?.[key];
                const surfaceMastery = np.surfaceProfile?.mastery?.[key];
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
                    {surfaceDna && (
                      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6, marginBottom:12 }}>
                        <div style={{ padding:'7px 9px', background:`${color}0b`, border:`1px solid ${color}22` }}>
                          <div style={{ fontFamily:T.mono, fontSize:7, color:T.inkFaint, letterSpacing:1.5 }}>AFINIDADE NATURAL</div>
                          <div style={{ fontFamily:T.display, fontSize:24, lineHeight:1, color, marginTop:3 }}>{Math.round(surfaceDna.affinity)}</div>
                        </div>
                        <div style={{ padding:'7px 9px', background:'rgba(255,255,255,.018)', border:'1px solid rgba(255,255,255,.06)' }}>
                          <div style={{ fontFamily:T.mono, fontSize:7, color:T.inkFaint, letterSpacing:1.5 }}>DOMINIO APRENDIDO</div>
                          <div style={{ fontFamily:T.display, fontSize:24, lineHeight:1, color:'#EEE9E0', marginTop:3 }}>{Math.round(surfaceMastery?.adaptation ?? 0)}</div>
                        </div>
                        {surfaceDna.archetype?.label && <div style={{ gridColumn:'1 / -1', fontFamily:T.mono, fontSize:7, letterSpacing:1.2, color:`${color}cc`, textTransform:'uppercase' }}>{surfaceDna.archetype.label}</div>}
                      </div>
                    )}
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
                {[{key:'CLAY'},{key:'GRASS'},{key:'HARD'},{key:'STREET'},{key:'CARPET'},{key:'INDOOR'}].map(({ key }) => {
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

// -----------------------------------------------------------------
// TAB 6: RIVALIDADES
// -----------------------------------------------------------------
function RivalCard({ r, np, allPlayers }) {
  const [open, setOpen] = useState(false);
  const isP1 = r.p1Id === np.id;
  const opId = isP1 ? r.p2Id : r.p1Id;
  const op = allPlayers?.find(p => p.id === opId);
  const myW = isP1 ? r.p1Wins : r.p2Wins, hisW = isP1 ? r.p2Wins : r.p1Wins;
  const tm = RIVALRY_META[r.type] ?? RIVALRY_META.CLASSIC;
  const sm = RIVALRY_STATUS[r.status] ?? RIVALRY_STATUS.BREWING;
  const barW = r.totalMatches > 0 ? Math.round(myW/r.totalMatches*100) : 50;
  const CAT_ICON = { GRAND_SLAM:'?', SLAM_CLASH:'??', MASTERS_1000:'??', ATP_500:'??', ATP_250:'??', FINALS:'??' };

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
        <div style={{ color:T.inkFaint, fontSize:10 }}>{open?'?':'?'}</div>
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
                  <span style={{ fontSize:11 }}>{CAT_ICON[m.category]??'??'}</span>
                  <span style={{ fontFamily:T.body, fontSize:11, color:T.inkDim, flex:1 }}>{m.isFinal?'?? Final':m.round} · {m.category?.replace('_',' ')} {m.season?`(${m.season})`:''}</span>
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

// -----------------------------------------------------------------
// TAB: HISTÓRICO ANUAL
// -----------------------------------------------------------------
const HIST_CATS = [
  { key:'FINALS',       label:'ATP Finals'    },
  { key:'GRAND_SLAM',   label:'Grand Slam'    },
  { key:'SLAM_CLASH',   label:'Clash Slam'    },
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
  identidade:  { group:'essencia',  short:'Identidade',  icon:'??', desc:'Personalidade, imagem pública, motivação e reputação.' },
  jogo:        { group:'essencia',  short:'Jogo',        icon:'?', desc:'Estilo, preferências, assinatura técnica e atributos de quadra.' },
  percepcoes:  { group:'essencia',  short:'Circuito',    icon:'??', desc:'Como o mundo do tênis enxerga este jogador hoje.' },
  carreira:    { group:'carreira',  short:'Carreira',    icon:'??', desc:'Títulos, marcos, legado e memória de carreira.' },
  grand_slam:  { group:'carreira',  short:'Grand Slam',  icon:'?', desc:'Histórico exclusivo nos quatro maiores palcos do circuito.' },
  trajetoria:  { group:'carreira',  short:'Trajetória',  icon:'??', desc:'Evolução de ranking, desenvolvimento e arco profissional.' },
  resultados:  { group:'carreira',  short:'Resultados',  icon:'??', desc:'Leitura ampla de desempenho em torneios e superfícies.' },
  hist_anual:  { group:'carreira',  short:'Hist. anual', icon:'???', desc:'Recorte por temporadas para entender altos e baixos.' },
  rivalidades: { group:'carreira',  short:'Rivalidades', icon:'??', desc:'Confrontos que realmente moldaram a narrativa da carreira.' },
  fisico:      { group:'estrutura', short:'Físico & DNA', icon:'??', desc:'Corpo, risco, condição atual, traços e assinatura biológica.' },
  financeiro:  { group:'estrutura', short:'Financeiro',  icon:'??', desc:'Dinheiro, pressão, custos e sustentabilidade de carreira.' },
  forma:       { group:'estrutura', short:'Forma & IFR', icon:'??', desc:'Momento competitivo, leitura de fase e sinal de mercado.' },
  patrocinio:  { group:'estrutura', short:'Patrocínio',  icon:'??', desc:'Contratos, sinal comercial, histórico de marcas e ofertas.' },
  vida:        { group:'universo',  short:'Vida',        icon:'??', desc:'Vida fora da quadra, imagem, patrimônio e linha do tempo pessoal.' },
  entrevistas: { group:'universo',  short:'Entrevistas', icon:'???', desc:'Voz pública, contexto de imprensa e coletivas geradas.' },
};

const ROUND_VALUE = { W:7, F:6, SF:5, QF:4, R16:3, R32:2, R64:1, R128:0 };

function resolveMatchStatsForPlayer(match, playerId, slim = false) {
  if (!match || !playerId) return null;

  if (slim) {
    const stats = match.st;
    if (!stats?.a && !stats?.b) return null;
    const playerWon = match.w === playerId;
    const playerLost = match.l === playerId;
    if (!playerWon && !playerLost) return null;
    const playerIsA = playerWon ? !!match.wa : !match.wa;
    return playerIsA ? stats.a : stats.b;
  }

  const isA = match.playerA?.id === playerId;
  const isB = match.playerB?.id === playerId;
  if (!isA && !isB) return null;
  return isA ? match.result?.stats?.a : match.result?.stats?.b;
}

function computeMatchRatingFromStats(matchStats) {
  if (!matchStats) return null;

  const attackShots = matchStats.attackShots ?? 0;
  const defenseShots = matchStats.defenseShots ?? 0;
  const qualityCount = matchStats.qualityCount ?? 0;
  const directSample = attackShots + defenseShots + qualityCount;
  if (directSample > 0) {
    return computeRating(matchStats, Math.max(directSample, qualityCount || 1)).score;
  }

  const winners = matchStats.winners ?? 0;
  const aces = matchStats.aces ?? 0;
  const unforcedErrors = matchStats.unforcedErrors ?? 0;
  const forcedErrors = matchStats.forcedErrors ?? 0;
  const doubleFaults = matchStats.doubleFaults ?? 0;
  const estimatedSample = winners + aces + unforcedErrors + forcedErrors + doubleFaults;
  if (estimatedSample <= 1) return null;

  return computeRating(
    {
      ...matchStats,
      attackShots: winners + aces,
      defenseShots: forcedErrors,
      qualityCount: qualityCount || 0,
    },
    estimatedSample
  ).score;
}

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

    // -- FORMATO SLIM (_slim: true) --------------------------------------
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
      for (const match of res.matches ?? []) {
        const matchStats = resolveMatchStatsForPlayer(match, playerId, true);
        const matchRating = computeMatchRatingFromStats(matchStats);
        if (matchRating != null && matchRating > 0) {
          row.ratingSum += matchRating;
          row.ratingCount++;
        }
        if (matchStats) {
          row.acesSum += matchStats.aces ?? 0;
          row.winnersSum += matchStats.winners ?? 0;
          row.errorsSum += (matchStats.unforcedErrors ?? 0) + (matchStats.forcedErrors ?? 0);
          row.gamesHeld += matchStats.gamesHeld ?? 0;
          row.gamesServed += matchStats.gamesServed ?? 0;
          row.matchStatsCount++;
        }
      }

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
      }
      continue;
    }

    // -- FORMATO COMPLETO (bracket.rounds) -------------------------------
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
        }        const ms = resolveMatchStatsForPlayer(match, playerId, false);
        const matchRating = computeMatchRatingFromStats(ms);
        if (matchRating != null && matchRating > 0) {
          row.ratingSum += matchRating;
          row.ratingCount++;
        }
        // Médias de jogo (aces, winners, erros, hold)
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
        <td style={{ fontFamily:'Space Mono,monospace', fontSize:12, color:'rgba(237,230,216,.58)', padding:'10px 12px', whiteSpace:'nowrap' }}>
          {cat.label}
        </td>
        <td colSpan={9} style={{ fontFamily:'Space Mono,monospace', fontSize:11, color:'rgba(237,230,216,.18)', padding:'10px 12px', textAlign:'center' }}>—</td>
      </tr>
    );
  }
  const irm = row.ratingCount > 0 ? (row.ratingSum / row.ratingCount).toFixed(1) : '—';
  const irmColor = irm === '—' ? 'rgba(237,230,216,.28)'
    : irm >= 7.8 ? '#B0FF60' : irm >= 6.5 ? '#60D0FF' : irm >= 5.0 ? '#FFB060' : '#FF8040';

  const cell = (v, highlight = false) => (
    <td style={{
      fontFamily:'Space Mono,monospace', fontSize:13, textAlign:'center', padding:'10px 8px',
      color: v === 0 ? 'rgba(237,230,216,.18)' : highlight ? sc : 'rgba(237,230,216,.75)',
    }}>{v || '—'}</td>
  );

  return (
    <tr style={{ borderBottom:'1px solid rgba(237,230,216,.05)' }}>
      <td style={{ fontFamily:'Space Mono,monospace', fontSize:12, color:'rgba(237,230,216,.72)', padding:'10px 12px', whiteSpace:'nowrap' }}>
        {cat.label}
      </td>
      {cell(row.part)}
      {cell(row.wins, row.wins > row.losses)}
      {cell(row.losses)}
      {cell(row.qf, row.qf > 0)}
      {cell(row.sf, row.sf > 0)}
      {cell(row.f, row.f > 0)}
      {cell(row.titles, row.titles > 0)}
      <td style={{ fontFamily:'Space Mono,monospace', fontSize:12, textAlign:'center', padding:'10px 8px', color:'rgba(237,230,216,.62)' }}>
        {row.bestRound ? ROUND_LABEL[row.bestRound] : '—'}
      </td>
      <td style={{ fontFamily:'Space Mono,monospace', fontSize:13, textAlign:'center', padding:'10px 8px', color: irmColor, fontWeight: irm !== '—' ? 700 : 400 }}>
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
      fontFamily:'Space Mono,monospace', fontSize:11, letterSpacing:'.18em', textTransform:'uppercase',
      color:'rgba(237,230,216,.46)', padding:'10px 12px', textAlign: right ? 'center' : 'left',
      borderBottom:'1px solid rgba(237,230,216,.08)', fontWeight:600, whiteSpace:'nowrap',
    }}>{children}</th>
  );

  return (
    <div className="upp2-scroll" style={{ flex:1, padding:'24px 24px 56px', overflowY:'auto', background:'linear-gradient(180deg, rgba(12,18,23,.22), transparent)' }}>
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
          <div key={year} style={{ marginBottom:12 }}>
            {/* Year header — clickable */}
            <div
              onClick={() => setOpenYear(isOpen ? null : year)}
              style={{
                display:'flex', alignItems:'center', gap:18, padding:'18px 20px',
                background: isOpen ? `${sc}14` : 'rgba(237,230,216,.03)',
                border:`1px solid ${isOpen ? sc+'50' : 'rgba(237,230,216,.08)'}`,
                borderLeft:`3px solid ${isOpen ? sc : 'rgba(237,230,216,.2)'}`,
                cursor:'pointer', userSelect:'none', transition:'all .15s',
              }}
            >
              <span style={{ fontFamily:'Space Mono,monospace', fontSize:24, fontWeight:700, color: isOpen ? sc : 'rgba(237,230,216,.9)', minWidth:62 }}>{year}</span>
              <div style={{ display:'flex', gap:16, flex:1, flexWrap:'wrap', alignItems:'center' }}>
                {totals.titles > 0 && (
                  <span style={{ fontFamily:'Space Mono,monospace', fontSize:12, color:'#C9A84C', letterSpacing:1.2 }}>
                    ?? {totals.titles}T
                  </span>
                )}
                <span style={{ fontFamily:'Space Mono,monospace', fontSize:12, color:'rgba(237,230,216,.62)', letterSpacing:1.2 }}>
                  {totals.wins}V {totals.losses}D
                </span>
                {totals.f > 0  && <span style={{ fontFamily:'Space Mono,monospace', fontSize:12, color: sc, letterSpacing:1.2 }}>F:{totals.f}</span>}
                {totals.sf > 0 && <span style={{ fontFamily:'Space Mono,monospace', fontSize:12, color:'rgba(237,230,216,.6)', letterSpacing:1.2 }}>SF:{totals.sf}</span>}
                {totals.qf > 0 && <span style={{ fontFamily:'Space Mono,monospace', fontSize:12, color:'rgba(237,230,216,.44)', letterSpacing:1.2 }}>QF:{totals.qf}</span>}
                {annualIrm && (
                  <span style={{ fontFamily:'Space Mono,monospace', fontSize:13, color: irmCol, letterSpacing:1.2, marginLeft:'auto', fontWeight:700 }}>
                    IRM {annualIrm}
                  </span>
                )}
              </div>
              <span style={{ fontFamily:'Space Mono,monospace', fontSize:11, color:'rgba(237,230,216,.34)' }}>
                {isOpen ? '?' : '?'}
              </span>
            </div>

            {/* Expanded content */}
            {isOpen && (
              <div style={{ border:'1px solid rgba(237,230,216,.07)', borderTop:'none', background:'rgba(237,230,216,.015)' }}>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))', gap:10, padding:'16px 16px 10px' }}>
                  {[
                    { label:'Participações', value:totals.part, color:'rgba(237,230,216,.88)' },
                    { label:'Recorde', value:`${totals.wins}V-${totals.losses}D`, color:totals.wins >= totals.losses ? '#B0FF60' : '#FFB060' },
                    { label:'Melhor fase', value:totals.bestRound ? ROUND_LABEL[totals.bestRound] : '—', color:totals.bestRound ? sc : 'rgba(237,230,216,.38)' },
                    { label:'IRM anual', value:annualIrm ?? '—', color:annualIrm ? irmCol : 'rgba(237,230,216,.38)' },
                  ].map(card => (
                    <div key={card.label} style={{
                      background:'rgba(255,255,255,.03)',
                      border:'1px solid rgba(237,230,216,.08)',
                      borderTop:`2px solid ${card.color}66`,
                      padding:'12px 14px',
                      minHeight:74,
                    }}>
                      <div style={{ fontFamily:'Space Mono,monospace', fontSize:9, letterSpacing:'.24em', color:'rgba(237,230,216,.34)', textTransform:'uppercase', marginBottom:8 }}>
                        {card.label}
                      </div>
                      <div style={{ fontFamily:T.display, fontSize:32, color:card.color, lineHeight:1 }}>
                        {card.value}
                      </div>
                    </div>
                  ))}
                </div>
                {/* Category table */}
                <div style={{ overflowX:'auto', padding:'0 12px 0' }}>
                <table style={{ width:'100%', minWidth:980, borderCollapse:'collapse' }}>
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
                      <TH right>IRM</TH>
                    </tr>
                  </thead>
                  <tbody>
                    {HIST_CATS.map(cat => (
                      <HistRow key={cat.key} cat={cat} row={cats[cat.key]} sc={sc} />
                    ))}
                    {/* Total row */}
                    <tr style={{ borderTop:'1px solid rgba(237,230,216,.10)' }}>
                      <td style={{ fontFamily:'Space Mono,monospace', fontSize:11, letterSpacing:'.2em', textTransform:'uppercase', color:'rgba(237,230,216,.46)', padding:'10px 12px' }}>TOTAL</td>
                      {[totals.part, totals.wins, totals.losses, totals.qf, totals.sf, totals.f, totals.titles].map((v, i) => (
                        <td key={i} style={{ fontFamily:'Space Mono,monospace', fontSize:13, textAlign:'center', padding:'10px 8px', color: v === 0 ? 'rgba(237,230,216,.18)' : 'rgba(237,230,216,.84)', fontWeight:700 }}>{v || '—'}</td>
                      ))}
                      <td style={{ fontFamily:'Space Mono,monospace', fontSize:13, textAlign:'center', padding:'10px 8px', color:'rgba(237,230,216,.6)' }}>
                        {totals.bestRound ? ROUND_LABEL[totals.bestRound] : '—'}
                      </td>
                      <td style={{ fontFamily:'Space Mono,monospace', fontSize:13, textAlign:'center', padding:'10px 8px', color: irmCol, fontWeight:700 }}>
                        {annualIrm ?? '—'}
                      </td>
                    </tr>
                  </tbody>
                </table>
                </div>

                {/* Médias por jogo */}
                {hasMatchStats ? (
                  <div style={{ padding:'16px 16px 18px', borderTop:'1px solid rgba(237,230,216,.06)' }}>
                    <div style={{ fontFamily:'Space Mono,monospace', fontSize:9, letterSpacing:'.35em', color:'rgba(237,230,216,.3)', textTransform:'uppercase', marginBottom:12 }}>
                      Médias por jogo · {totals.matchStatsCount} partidas
                    </div>
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))', gap:10 }}>
                      {[
                        { label:'Aces',    value:avgAces,    color:acesColor,  ref:'ref ATP: 5–10',  icon:'??' },
                        { label:'Winners', value:avgWinners, color:winColor,   ref:'ref ATP: 13–22', icon:'?' },
                        { label:'Erros',   value:avgErrors,  color:errColor,   ref:'ref ATP: 14–30', icon:'??' },
                        { label:'Hold %',  value:holdPct != null ? holdPct+'%' : null, color:holdColor, ref:'ref ATP: ~81%', icon:'???' },
                      ].map(({ label, value, color, ref, icon }) => (
                        <div key={label} style={{
                          background:'rgba(0,0,0,.25)', border:`1px solid ${color}22`,
                          borderTop:`2px solid ${color}55`, padding:'12px 14px',
                          display:'flex', flexDirection:'column', gap:3,
                        }}>
                          <div style={{ fontFamily:'Space Mono,monospace', fontSize:8, letterSpacing:'.3em', color:'rgba(237,230,216,.34)', textTransform:'uppercase' }}>
                            {icon} {label}
                          </div>
                          <div style={{ fontFamily:T.display, fontSize:30, color, lineHeight:1 }}>
                            {value ?? '—'}
                          </div>
                          <div style={{ fontFamily:'Space Mono,monospace', fontSize:7.5, color:'rgba(237,230,216,.24)', letterSpacing:.5 }}>
                            {ref}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div style={{ padding:'12px 16px 14px', borderTop:'1px solid rgba(237,230,216,.05)' }}>
                    <span style={{ fontFamily:'Space Mono,monospace', fontSize:9, color:'rgba(237,230,216,.24)', letterSpacing:2 }}>
                      IRM E MÉDIAS DE JOGO INDISPONÍVEIS NESTE RECORTE DO SAVE
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
          <div style={{ fontSize:44 }}>??</div>
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
                <span style={{ fontSize:11, opacity:.4 }}>??</span>
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

// -----------------------------------------------------------------
// TAB 7: FÍSICO & DNA
// -----------------------------------------------------------------
function TabFisicoDNA({ np, sc, tournamentResults }) {
  const player = ensurePhysicalCondition(np);
  const cond = Math.round(player.physicalCondition ?? 85);
  const condInfo = physicalConditionLabel(cond);
  const injury = player.injury ?? null;
  const healthCrisis = player.breakingNews?.healthCrisis ?? null;
  const injHistory = player.injuryHistory ?? [];
  const traits = getPlayerTraits(np);
  const traitPresentation = getTraitPresentation(np);
  const primaryTrait = traitPresentation.primary;

  const retireChance  = computeRetirementChance(player, 2025, tournamentResults ?? {}, null, null);
  const retireRisk    = retirementRiskLabel(retireChance);
  const retirePercent = Math.round(retireChance * 100);
  const showRetire = (player.age ?? 0) >= 28;

  const condColor = condInfo.color;
  const gradeColor = g => g===1?'#FFC107':g===2?'#FF9800':'#F44336';

  const injTypeInfo  = injury ? (INJURY_TYPES[injury.type]  ?? {}) : null;
  const injGradeInfo = injury ? (INJURY_GRADES[injury.grade] ?? {}) : null;
  const healthLabel = healthCrisis?.publicLabel ?? healthCrisis?.diagnosisName ?? (injury ? getInjuryDisplayName(injury) : null);
  const healthStatusLabel = healthCrisis?.status === 'CAREER_ENDING'
    ? 'Afastamento com risco real de aposentadoria'
    : healthCrisis?.status === 'RETURNING'
      ? 'Retorno gradual ao circuito'
      : healthCrisis?.active
        ? 'Afastado do circuito por crise de saúde'
        : null;
  const healthStatusColor = healthCrisis?.status === 'CAREER_ENDING'
    ? '#FFD166'
    : healthCrisis?.status === 'RETURNING'
      ? '#22C55E'
      : '#F44336';

  return (
    <div className="upp2-scroll" style={{ flex:1, padding:'22px 24px', overflowY:'auto' }}>

      {/* TRAITS 2.0 */}
      {traits.length > 0 && (
        <div style={{ marginBottom:24 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
            <Sh color={sc}>Traits 2.0</Sh>
            <div style={{ display:'flex', gap:6, alignItems:'center' }}>
              <div style={{ background:`${sc}15`, border:`1px solid ${sc}40`, padding:'3px 10px' }}>
                <span style={{ fontFamily:T.display, fontSize:10, letterSpacing:2, color:sc, textTransform:'uppercase' }}>ativas</span>
                <span style={{ fontFamily:T.display, fontSize:16, color:sc, marginLeft:6 }}>{traits.length}</span>
              </div>
            </div>
          </div>
          {primaryTrait && (
            <div style={{ marginBottom:14, border:`1px solid ${sc}30`, background:`linear-gradient(135deg, ${sc}16, rgba(255,255,255,.02))`, padding:'14px 16px', position:'relative', overflow:'hidden' }}>
              <div style={{ position:'absolute', inset:0, background:`linear-gradient(90deg, transparent, ${sc}10, transparent)`, pointerEvents:'none' }} />
              <div style={{ position:'relative', display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:16, flexWrap:'wrap' }}>
                <div>
                  <div style={{ fontFamily:T.mono, fontSize:7, letterSpacing:3, color:sc, textTransform:'uppercase', marginBottom:5 }}>trait principal</div>
                  <div style={{ fontFamily:T.display, fontSize:22, color:T.ink, letterSpacing:.6, textTransform:'uppercase' }}>
                    {primaryTrait.name ?? primaryTrait.traitId}
                  </div>
                  <div style={{ fontFamily:T.body, fontSize:12, color:T.inkDim, lineHeight:1.55, marginTop:6, maxWidth:680 }}>
                    {primaryTrait.short ?? 'Sem descrição editorial disponível.'}
                  </div>
                </div>
                <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
                  <span style={{ fontFamily:T.mono, fontSize:7, color:sc, border:`1px solid ${sc}35`, background:`${sc}12`, padding:'4px 8px', letterSpacing:2, textTransform:'uppercase' }}>
                    {primaryTrait.family}
                  </span>
                  {primaryTrait.origin && (
                    <span style={{ fontFamily:T.mono, fontSize:7, color:T.inkFaint, border:'1px solid rgba(255,255,255,.1)', background:'rgba(255,255,255,.03)', padding:'4px 8px', letterSpacing:2, textTransform:'uppercase' }}>
                      {primaryTrait.origin}
                    </span>
                  )}
                  {primaryTrait.unlockedAt && (
                    <span style={{ fontFamily:T.mono, fontSize:7, color:T.inkFaint, border:'1px solid rgba(255,255,255,.1)', background:'rgba(255,255,255,.03)', padding:'4px 8px', letterSpacing:2, textTransform:'uppercase' }}>
                      {primaryTrait.unlockedAt}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
          {([
            { id:'CORE', label:'Core Traits', desc:'O esqueleto competitivo do jogador.' },
            { id:'SIGNATURE', label:'Signature Traits', desc:'Assinaturas técnicas e golpes que carregam identidade.' },
            { id:'CAREER', label:'Career Marks', desc:'Marcas deixadas pela carreira e pelo palco grande.' },
            { id:'SHADOW', label:'Shadow Traits', desc:'Rachaduras reais, falhas e tensões do jogador.' },
          ]).map(group => {
            const slots = traits.filter(s => (s.family ?? 'CORE') === group.id);
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
                  const familyColor = group.id === 'CORE'
                    ? '#00D4FF'
                    : group.id === 'SIGNATURE'
                      ? '#FFD166'
                      : group.id === 'CAREER'
                        ? '#7CFFB2'
                        : '#FF8A80';
                  const familyIcon = group.id === 'CORE'
                    ? '?'
                    : group.id === 'SIGNATURE'
                      ? (slot.shotFamily?.emoji ?? '?')
                      : group.id === 'CAREER'
                        ? '?'
                        : '?';
                  return (
                    <div key={i} style={{ background:`${familyColor}10`, border:`1px solid ${familyColor}2f`, padding:'11px 13px', marginBottom:6, position:'relative', overflow:'hidden' }}>
                      <div style={{ position:'absolute', top:0, left:0, right:0, height:1, background:`linear-gradient(90deg,transparent,${familyColor}66,transparent)` }}/>
                      <div style={{ display:'flex', alignItems:'flex-start', gap:9 }}>
                        <div style={{ flexShrink:0, width:28, height:28, background:`${familyColor}18`, border:`1px solid ${familyColor}44`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:14 }}>{familyIcon}</div>
                        <div style={{ flex:1 }}>
                          <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:3 }}>
                            <span style={{ fontFamily:T.display, fontSize:12, color:familyColor, letterSpacing:.5, textTransform:'uppercase' }}>{slot.name ?? slot.traitId}</span>
                            <span style={{ fontFamily:T.mono, fontSize:7, background:`${familyColor}18`, border:`1px solid ${familyColor}38`, color:familyColor, padding:'1px 6px', letterSpacing:2, textTransform:'uppercase' }}>{group.label}</span>
                            {slot.shotFamily?.baseType && (
                              <span style={{ fontFamily:T.mono, fontSize:7, color:T.inkFaint, letterSpacing:2, textTransform:'uppercase' }}>{slot.shotFamily.baseType}</span>
                            )}
                          </div>
                          {slot.short && <div style={{ fontFamily:T.body, fontSize:11, color:T.inkDim, lineHeight:1.5 }}>{slot.short}</div>}
                          <div style={{ display:'flex', gap:10, marginTop:6, flexWrap:'wrap' }}>
                            <span style={{ fontFamily:T.mono, fontSize:7, color:T.inkFaint, letterSpacing:2, textTransform:'uppercase' }}>origem: {slot.origin ?? '—'}</span>
                            {slot.unlockedAt && <span style={{ fontFamily:T.mono, fontSize:7, color:T.inkFaint, letterSpacing:2, textTransform:'uppercase' }}>gatilho: {slot.unlockedAt}</span>}
                          </div>
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
        {/* CONDIÇ?O */}
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
          {healthCrisis?.active ? (
            <div style={{ border:`1px solid ${healthStatusColor}33`, background:`${healthStatusColor}08`, borderLeft:`3px solid ${healthStatusColor}`, padding:'13px 15px' }}>
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
                <span style={{ fontSize:20 }}>{healthCrisis.status === 'CAREER_ENDING' ? '???' : healthCrisis.status === 'RETURNING' ? '??' : '??'}</span>
                <div style={{ flex:1 }}>
                  <div style={{ fontFamily:T.display, fontSize:15, color:healthStatusColor, letterSpacing:1, textTransform:'uppercase' }}>{healthLabel}</div>
                  <div style={{ fontFamily:T.mono, fontSize:7, letterSpacing:2, color:T.inkFaint, textTransform:'uppercase', marginTop:1 }}>{healthStatusLabel}</div>
                </div>
              </div>
              {healthCrisis.slotsRemaining > 0 && healthCrisis.status !== 'RETURNING' && (
                <div style={{ background:'rgba(244,67,54,.1)', border:'1px solid rgba(244,67,54,.28)', padding:'4px 10px', fontFamily:T.display, fontSize:9, color:'#F44336', letterSpacing:2, textTransform:'uppercase', display:'inline-block' }}>
                  Fora do circuito · {healthCrisis.slotsRemaining} torneio{healthCrisis.slotsRemaining!==1?'s':''}
                </div>
              )}
              {healthCrisis.status === 'CAREER_ENDING' && (
                <div style={{ marginTop:10, fontFamily:T.body, fontSize:11, color:T.inkDim, lineHeight:1.55 }}>
                  {healthCrisis.publicStatement ?? `${player.name} já comunicou ao circuito que o quadro exige parada longa e pode encerrar a carreira ao fim da temporada.`}
                </div>
              )}
              {healthCrisis.status === 'OUT' && healthCrisis.publicStatement && (
                <div style={{ marginTop:10, fontFamily:T.body, fontSize:11, color:T.inkDim, lineHeight:1.55 }}>
                  {healthCrisis.publicStatement}
                </div>
              )}
              {healthCrisis.status === 'RETURNING' && (
                <div style={{ marginTop:10, fontFamily:T.body, fontSize:11, color:T.inkDim, lineHeight:1.55 }}>
                  {healthCrisis.publicStatement ?? `${player.name} voltou aos treinos e o circuito passa a acompanhar um retorno gradual, ainda cercado de cautela.`}
                </div>
              )}
            </div>
          ) : injury ? (
            <div style={{ border:`1px solid ${gradeColor(injury.grade)}33`, background:`${gradeColor(injury.grade)}07`, borderLeft:`3px solid ${gradeColor(injury.grade)}`, padding:'13px 15px' }}>
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
                <span style={{ fontSize:20 }}>{injTypeInfo?.icon??'??'}</span>
                <div style={{ flex:1 }}>
                  <div style={{ fontFamily:T.display, fontSize:15, color:gradeColor(injury.grade), letterSpacing:1, textTransform:'uppercase' }}>{getInjuryDisplayName(injury)}</div>
                  <div style={{ fontFamily:T.mono, fontSize:7, letterSpacing:2, color:T.inkFaint, textTransform:'uppercase', marginTop:1 }}>{injGradeInfo?.label??'?'} · Grau {injury.grade}</div>
                </div>
              </div>
              {injury.slotsRemaining > 0 && (
                <div style={{ background:'rgba(244,67,54,.1)', border:'1px solid rgba(244,67,54,.28)', padding:'4px 10px', fontFamily:T.display, fontSize:9, color:'#F44336', letterSpacing:2, textTransform:'uppercase', display:'inline-block' }}>? FORA — {injury.slotsRemaining} torneio{injury.slotsRemaining!==1?'s':''}</div>
              )}
              {injury.slotsRemaining===0 && injury.comingBackSlots>0 && (
                <div style={{ background:'rgba(255,152,0,.1)', border:'1px solid rgba(255,152,0,.28)', padding:'4px 10px', fontFamily:T.display, fontSize:9, color:'#FF9800', letterSpacing:2, textTransform:'uppercase', display:'inline-block' }}>?? RETORNANDO</div>
              )}
            </div>
          ) : (
            <div style={{ border:'1px solid rgba(76,175,80,.25)', background:'rgba(76,175,80,.06)', borderLeft:'3px solid rgba(76,175,80,.6)', padding:'13px 15px' }}>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <span style={{ fontSize:18 }}>?</span>
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
                  <span style={{ fontSize:20 }}>??</span>
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
                      ? {ATTR_LABELS[a] ?? a}
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
                <span style={{ fontSize:13, flexShrink:0 }}>{hDef.icon??'??'}</span>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                    <div style={{ fontFamily:T.display, fontSize:11, letterSpacing:1, color:T.ink, textTransform:'uppercase' }}>{getInjuryDisplayName(h)}</div>
                    {h.playedThrough && (
                      <span style={{ fontFamily:T.mono, fontSize:6, color:'#FF9800', border:'1px solid rgba(255,152,0,.35)', padding:'1px 5px', letterSpacing:1 }}>JOGOU LESIONADO</span>
                    )}
                  </div>
                  <div style={{ fontFamily:T.mono, fontSize:7, color:T.inkFaint, letterSpacing:1, marginTop:2, display:'flex', gap:8 }}>
                    {h.season && <span>{h.season}</span>}
                    {h.originTournament && <span>{h.originTournament}</span>}
                    {h.slotsOut > 0 && <span style={{ color:`${gc}99` }}>? {h.slotsOut} torneio{h.slotsOut!==1?'s':''} fora</span>}
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

  const equipmentCost = rank <= 10 ? 8_000 : rank <= 50 ? 6_000 : rank <= 100 ? 4_500 : 3_000;
  const physioEst = rank <= 20 ? 48_000 : rank <= 100 ? 30_000 : 14_400;
  const prepFisicoEst = rank <= 20 ? 15_000 : rank <= 100 ? 8_000 : rank <= 200 ? 4_000 : 0;
  const totalCostsEst = equipmentCost + physioEst + prepFisicoEst;
  const hasData = (f.careerEarnings ?? 0) > 0;

  const Sh = ({ children, color }) => (
    <div style={{ fontFamily:'Space Mono,monospace', fontSize:9, fontWeight:700,
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
      <div style={{ fontFamily:'Space Mono,monospace', fontSize:7, letterSpacing:3,
        color:'rgba(255,255,255,0.25)', textTransform:'uppercase' }}>{label}</div>
      <div style={{ fontFamily:'Space Mono,monospace', fontSize:20, fontWeight:900,
        color: color ?? 'rgba(255,255,255,0.8)', lineHeight:1 }}>{value}</div>
      {sub && <div style={{ fontFamily:'Space Mono,monospace', fontSize:8,
        color:'rgba(255,255,255,0.3)' }}>{sub}</div>}
    </div>
  );

  const CAT_COLOR = { GRAND_SLAM:'#FFD700', SLAM_CLASH:'#FF8A3D', MASTERS_1000:'#E040FB', ATP_500:'#00BCD4',
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
          <span style={{ fontFamily:'Space Mono,monospace', fontSize:8, letterSpacing:2,
            color:'rgba(255,255,255,0.3)', textTransform:'uppercase' }}>SAÚDE FINANCEIRA</span>
          <span style={{ fontFamily:'Space Mono,monospace', fontSize:10, fontWeight:700,
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
          <div style={{ fontFamily:'Space Mono,monospace', fontSize:8, color:'rgba(255,255,255,0.2)',
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
                  <div style={{ fontFamily:'Space Mono,monospace', fontSize:6, color:sc }}>{formatUSD(val)}</div>
                  <div style={{ width:'100%', height:h, background:`linear-gradient(180deg,${sc}cc,${sc}44)`,
                    borderRadius:'2px 2px 0 0', position:'relative' }}>
                    {costs > 0 && val > 0 && (
                      <div style={{ position:'absolute', bottom:`${Math.min((costs/val)*h, h-1)}px`,
                        left:0, right:0, height:1, background:'#FF6060', opacity:0.7 }} />
                    )}
                  </div>
                  <div style={{ fontFamily:'Space Mono,monospace', fontSize:6, color:'rgba(255,255,255,0.25)' }}>{yr}</div>
                </div>
              );
            })}
          </div>
          <div style={{ display:'flex', gap:16, marginTop:8 }}>
            <div style={{ display:'flex', alignItems:'center', gap:4 }}>
              <div style={{ width:8, height:3, background:sc, borderRadius:1 }} />
              <span style={{ fontFamily:'Space Mono,monospace', fontSize:7, color:'rgba(255,255,255,0.3)' }}>Prize money</span>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:4 }}>
              <div style={{ width:8, height:1, background:'#FF6060' }} />
              <span style={{ fontFamily:'Space Mono,monospace', fontSize:7, color:'rgba(255,255,255,0.3)' }}>Linha de custos</span>
            </div>
          </div>
        </div>
      </>)}

      {/* Custos anuais */}
      <Sh>Custos Estimados (por ano)</Sh>
      <div style={{ padding:'12px 14px', background:'rgba(255,255,255,0.03)',
        border:'1px solid rgba(255,255,255,0.07)', marginBottom:4 }}>
        {[
          { label:'Fisioterapia',      value:physioEst,      note:'Estimado (~12 torneios)' },
          { label:'Equipamentos',      value:equipmentCost,  note:'Raquetes, cordas, calçado' },
          ...(prepFisicoEst > 0 ? [{ label:'Preparador Físico', value:prepFisicoEst, note:'Equipe de preparação' }] : []),
        ].map(({ label, value, note }) => (
          <div key={label} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
            <span style={{ fontFamily:'Space Mono,monospace', fontSize:8, color:'rgba(255,255,255,0.35)',
              width:120, flexShrink:0, textTransform:'uppercase', letterSpacing:1 }}>{label}</span>
            <div style={{ flex:1, height:2, background:'rgba(255,255,255,0.05)', overflow:'hidden' }}>
              <div style={{ height:'100%', width:`${Math.min((value/totalCostsEst)*100,100)}%`,
                background:'#FF6060aa' }} />
            </div>
            <span style={{ fontFamily:'Space Mono,monospace', fontSize:10, fontWeight:700,
              color:'#FF6060', width:56, textAlign:'right', flexShrink:0 }}>{formatUSD(value)}</span>
            <span style={{ fontFamily:'Space Mono,monospace', fontSize:7,
              color:'rgba(255,255,255,0.2)', width:120, flexShrink:0 }}>{note}</span>
          </div>
        ))}
        <div style={{ borderTop:'1px solid rgba(255,255,255,0.08)', paddingTop:8,
          display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <span style={{ fontFamily:'Space Mono,monospace', fontSize:8, fontWeight:700,
            color:'rgba(255,255,255,0.4)', letterSpacing:2, textTransform:'uppercase' }}>TOTAL ANUAL</span>
          <span style={{ fontFamily:'Space Mono,monospace', fontSize:14, fontWeight:900,
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
                <span style={{ fontFamily:'Space Mono,monospace', fontSize:8,
                  color:'rgba(255,255,255,0.3)', width:32, flexShrink:0 }}>{entry.season}</span>
                <span style={{ fontFamily:'Space Mono,monospace', fontSize:10,
                  color:'rgba(255,255,255,0.7)', flex:1, minWidth:0,
                  overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                  {entry.tournamentName || 'Torneio'}
                </span>
                <span style={{ fontFamily:'Space Mono,monospace', fontSize:7, fontWeight:700,
                  color:catColor, letterSpacing:1, textTransform:'uppercase', flexShrink:0 }}>
                  {CAT_PRIZE_LABEL[entry.category] ?? entry.category}
                </span>
                <span style={{ fontFamily:'Space Mono,monospace', fontSize:8,
                  color:'rgba(255,255,255,0.35)', width:60, textAlign:'right', flexShrink:0 }}>
                  {ROUND_PRIZE_LABEL[entry.round] ?? entry.round}
                </span>
                <span style={{ fontFamily:'Space Mono,monospace', fontSize:12, fontWeight:900,
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
              fontFamily:'Space Mono,monospace', fontSize:8, letterSpacing:2,
              cursor:'pointer', textTransform:'uppercase' }}>
              {expandLog ? '? MENOS' : `? VER TODOS (${log.length})`}
            </button>
          )}
        </div>
      </>)}

      {/* Tabela de referência */}
      <Sh>Tabela de Prize Money do Circuito</Sh>
      <div style={{ overflowX:'auto' }}>
        <table style={{ width:'100%', borderCollapse:'collapse',
          fontFamily:'Space Mono,monospace', fontSize:9 }}>
          <thead>
            <tr>{['CATEGORIA','TÍTULO','FINAL','SEMI','QUARTAS','R16','1ª RD'].map(h => (
              <th key={h} style={{ padding:'6px 8px', textAlign: h==='CATEGORIA'?'left':'right',
                color:'rgba(255,255,255,0.3)', fontWeight:700, letterSpacing:1,
                borderBottom:'1px solid rgba(255,255,255,0.08)' }}>{h}</th>
            ))}</tr>
          </thead>
          <tbody>
            {[['GRAND_SLAM','Grand Slam'],['SLAM_CLASH','Clash Slam'],['MASTERS_1000','Masters 1000'],
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

function TabEquipe({ np, sc, coachMarket, year }) {
  const coach = getPlayerCoach(np, coachMarket);
  const partnership = getPartnershipForPlayer(np, coachMarket);
  const coaching = np?.coaching ?? null;
  const method = coach ? (COACH_METHODS[coach.method] ?? COACH_METHODS.FORMADOR) : null;
  const Meter = ({ label, value, color, note }) => (
    <div style={{ padding:'11px 12px', border:`1px solid ${color}26`, background:`linear-gradient(135deg, ${color}10, rgba(255,255,255,.012))` }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', gap:7, marginBottom:7 }}>
        <span style={{ fontFamily:T.mono, fontSize:6.5, letterSpacing:'.18em', color:T.inkFaint, textTransform:'uppercase' }}>{label}</span>
        <span style={{ fontFamily:T.display, fontSize:24, color, lineHeight:1 }}>{Math.round(value ?? 0)}</span>
      </div>
      <div style={{ height:3, background:'rgba(237,232,223,.07)', overflow:'hidden' }}><div style={{ height:'100%', width:`${Math.max(0, Math.min(100, value ?? 0))}%`, background:color, boxShadow:`0 0 12px ${color}` }} /></div>
      {note && <div style={{ fontFamily:T.body, fontSize:10, color:T.inkDim, lineHeight:1.35, marginTop:7 }}>{note}</div>}
    </div>
  );

  if (!coach || !coaching) {
    return (
      <div className="upp2-scroll" style={{ padding:'22px 24px 34px', color:T.ink }}>
        <Sh color={sc}>Comissão técnica</Sh>
        <div style={{ border:'1px solid rgba(237,232,223,.08)', background:'rgba(255,255,255,.018)', padding:22 }}>
          <div style={{ fontFamily:T.display, fontSize:34, color:T.ink, textTransform:'uppercase', lineHeight:.95 }}>Sem técnico ativo</div>
          <p style={{ fontFamily:T.body, fontSize:14, color:T.inkDim, lineHeight:1.7, margin:'10px 0 0' }}>O mercado ainda nao encontrou um projeto claro para este jogador. Isso pode mudar na virada de temporada.</p>
        </div>
      </div>
    );
  }

  const statusText = coaching.publicStatus === 'ERA' ? 'Era consolidada' : coaching.publicStatus === 'PRESSURED' ? 'Sob pressão' : coaching.publicStatus === 'PROMISING' ? 'Projeto promissor' : coaching.publicStatus === 'RUPTURE' ? 'Ruptura em curso' : 'Projeto discreto';
  const yearsTogether = Math.max(1, (year ?? coaching.startYear ?? 0) - (coaching.startYear ?? year ?? 0) + 1);
  const titlesTogether = partnership?.titlesTogether ?? 0;
  const slamsTogether = partnership?.slamsTogether ?? 0;
  const bestRank = partnership?.bestRank ?? np.rankPosition ?? null;
  const focusCopy = {
    BUILD: 'Constrói a temporada pela repetição, organização e evolução paciente.',
    RESET: 'Reorganiza a carreira quando a forma, a confiança ou o corpo pedem uma virada.',
    PRESSURE: 'Pede iniciativa: saque, primeira bola e coragem para tirar tempo do rival.',
    CONTROL: 'Busca margem, padrão e decisões de alta segurança sob pressão.',
    CLUTCH: 'Trabalha os pontos que definem jogos: tiebreaks, break points e recuperação emocional.',
    SURFACE: 'Molda a preparação para a superfície e para padrões específicos de jogo.',
  };
  const relationship = coaching.friction >= 72
    ? { label:'Zona sensível', color:'#FF8A63', text:'A parceria continua, mas resultados e decisões já estão pesando na conversa interna.' }
    : (coaching.trust ?? 0) >= 76 && (coaching.confidence ?? 0) >= 68
      ? { label:'Confiança plena', color:'#6EE7A1', text:'O jogador compra o método e a dupla tende a agir como uma unidade nos momentos de pressão.' }
      : (coaching.expectation ?? 0) >= 74
        ? { label:'Projeto sob cobrança', color:'#FFD36B', text:'Há ambição alta na relação. O próximo recorte de resultados pode aproximar ou desgastar a dupla.' }
        : { label:'Construção em curso', color:'#71C7FF', text:'O método está sendo assimilado. A relação ainda busca uma assinatura competitiva própria.' };
  const coachInitials = String(coach.name ?? 'TC').split(' ').map(part => part[0]).join('').slice(0, 2).toUpperCase();
  const history = (partnership?.history ?? coaching.history ?? []).slice().reverse().slice(0, 10);
  return (
    <div className="upp2-scroll" style={{ padding:'22px 24px 34px', color:T.ink }}>
      <div style={{ border:`1px solid ${method.color}38`, background:`linear-gradient(125deg, ${method.color}18, rgba(8,12,16,.92) 52%, rgba(255,255,255,.018))`, padding:'20px 22px 0', overflow:'hidden', position:'relative' }}>
        <div style={{ position:'absolute', right:-52, top:-78, width:260, height:260, borderRadius:'50%', background:`radial-gradient(circle, ${method.color}26, transparent 68%)`, pointerEvents:'none' }} />
        <div style={{ position:'relative', display:'flex', gap:17, alignItems:'center', paddingBottom:19 }}>
          <div style={{ width:74, height:74, flexShrink:0, display:'grid', placeItems:'center', border:`2px solid ${method.color}`, background:`linear-gradient(135deg, ${method.color}44, rgba(0,0,0,.3))`, boxShadow:`0 0 28px ${method.color}33`, fontFamily:T.display, fontSize:30, color:T.ink, letterSpacing:2 }}>{coachInitials}</div>
          <div style={{ minWidth:0, flex:1 }}>
            <div style={{ fontFamily:T.mono, fontSize:7, letterSpacing:'.3em', color:method.color, textTransform:'uppercase', marginBottom:7 }}>Dossiê do técnico · banco vivo</div>
            <div style={{ fontFamily:T.display, fontSize:'clamp(34px,4vw,52px)', color:T.ink, textTransform:'uppercase', lineHeight:.86 }}>{coach.name}</div>
            <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginTop:11 }}>
              {[method.label, coach.originLabel, coach.temperament, coach.nationality, coaching.contractEndYear ? `Contrato até ${coaching.contractEndYear}` : null].filter(Boolean).map(tag => <span key={tag} style={{ fontFamily:T.mono, fontSize:6.5, letterSpacing:'.14em', textTransform:'uppercase', color:`${method.color}EE`, border:`1px solid ${method.color}33`, padding:'4px 7px', background:'rgba(0,0,0,.14)' }}>{tag}</span>)}
            </div>
          </div>
          <div style={{ alignSelf:'stretch', minWidth:112, paddingLeft:15, borderLeft:'1px solid rgba(237,232,223,.10)', display:'flex', flexDirection:'column', justifyContent:'center' }}>
            <div style={{ fontFamily:T.mono, fontSize:6.5, letterSpacing:'.18em', color:T.inkFaint, textTransform:'uppercase' }}>Situação</div>
            <div style={{ fontFamily:T.cond, fontWeight:800, fontSize:16, color:relationship.color, lineHeight:1.05, textTransform:'uppercase', marginTop:5 }}>{relationship.label}</div>
          </div>
        </div>
        <div style={{ position:'relative', padding:'15px 0 18px', borderTop:'1px solid rgba(237,232,223,.09)' }}>
          <div style={{ fontFamily:T.body, fontSize:15, color:'rgba(237,232,223,.88)', lineHeight:1.65, fontStyle:'italic' }}>“{method.desc}”</div>
          <div style={{ fontFamily:T.body, fontSize:12, color:T.inkDim, lineHeight:1.6, marginTop:7 }}>{focusCopy[coaching.tacticalFocus] ?? 'O método do técnico vem moldando a forma como o jogador prepara e lê os pontos.'}</div>
        </div>
        <div style={{ position:'relative', display:'grid', gridTemplateColumns:'repeat(4,minmax(0,1fr))', borderTop:'1px solid rgba(237,232,223,.09)', margin:'0 -22px' }}>
          {[
            ['Juntos', `${yearsTogether} ano${yearsTogether===1?'':'s'}`, method.color], ['Títulos', titlesTogether, '#FFD36B'],
            ['Grand Slams', slamsTogether, '#E8C84A'], ['Melhor rank', bestRank ? `#${bestRank}` : '—', '#71C7FF'],
          ].map(([label, value, color], index) => <div key={label} style={{ padding:'12px 14px', borderRight:index<3?'1px solid rgba(237,232,223,.09)':'none' }}><div style={{ fontFamily:T.display, fontSize:25, color, lineHeight:1 }}>{value}</div><div style={{ fontFamily:T.mono, fontSize:6.5, color:T.inkFaint, letterSpacing:'.16em', textTransform:'uppercase', marginTop:4 }}>{label}</div></div>)}
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'minmax(0,1.04fr) minmax(300px,.96fr)', gap:14, marginTop:14 }}>
        <section style={{ border:'1px solid rgba(237,232,223,.08)', background:'rgba(255,255,255,.016)', padding:16 }}>
          <div style={{ fontFamily:T.mono, fontSize:7, letterSpacing:'.22em', color:sc, textTransform:'uppercase', marginBottom:8 }}>A relação no presente</div>
          <div style={{ fontFamily:T.cond, fontWeight:800, fontSize:22, color:T.ink, textTransform:'uppercase', lineHeight:1 }}>{statusText}</div>
          <div style={{ fontFamily:T.body, fontSize:12, color:T.inkDim, lineHeight:1.6, margin:'6px 0 13px' }}>{relationship.text}</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,minmax(0,1fr))', gap:7 }}>
            <Meter label="Confiança" value={coaching.confidence} color="#6EE7A1" note="Compra o método" />
            <Meter label="Vínculo" value={coaching.trust} color="#71C7FF" note="Escuta o banco" />
            <Meter label="Atrito" value={coaching.friction} color="#FF766B" note="Pressão interna" />
          </div>
        </section>
        <section style={{ border:'1px solid rgba(237,232,223,.08)', background:'rgba(255,255,255,.016)', padding:16 }}>
          <div style={{ fontFamily:T.mono, fontSize:7, letterSpacing:'.22em', color:method.color, textTransform:'uppercase', marginBottom:10 }}>Impacto ativo</div>
          <div style={{ display:'grid', gap:7 }}>
            {[
              ['Plano de jogo', coaching.tacticalFocus ?? '—', method.color, 'Influencia as decisões e padrões escolhidos durante o ponto.'],
              ['Desenvolvimento', (coaching.developmentFocus ?? []).join(' · ') || '—', sc, 'Dá mais direção ao que o atleta absorve no treino.'],
              ['Aderência', `${Math.round(coaching.alignment ?? 0)}%`, '#FFD36B', 'Quanto o método combina com o momento e o perfil do jogador.'],
            ].map(([label, value, color, detail]) => <div key={label} style={{ padding:'9px 10px', borderLeft:`2px solid ${color}`, background:`${color}08` }}><div style={{ display:'flex', justifyContent:'space-between', gap:10, alignItems:'baseline' }}><span style={{ fontFamily:T.mono, fontSize:6.5, color:T.inkFaint, letterSpacing:'.16em', textTransform:'uppercase' }}>{label}</span><span style={{ fontFamily:T.cond, fontWeight:800, fontSize:14, color, textTransform:'uppercase', textAlign:'right' }}>{value}</span></div><div style={{ fontFamily:T.body, fontSize:10, color:T.inkDim, lineHeight:1.4, marginTop:4 }}>{detail}</div></div>)}
          </div>
        </section>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'minmax(0,1.15fr) minmax(260px,.85fr)', gap:14, marginTop:14 }}>
        <section style={{ border:'1px solid rgba(237,232,223,.08)', background:'rgba(255,255,255,.012)', padding:16 }}>
          <div style={{ fontFamily:T.mono, fontSize:7, letterSpacing:'.22em', color:sc, textTransform:'uppercase', marginBottom:13 }}>Capítulos da parceria</div>
          {history.length ? <div style={{ position:'relative', paddingLeft:17 }}>
            <div style={{ position:'absolute', left:3, top:4, bottom:10, width:1, background:`linear-gradient(${method.color}, rgba(237,232,223,.08))` }} />
            {history.map((event, idx) => <div key={`${event.year}-${idx}`} style={{ position:'relative', paddingBottom:idx===history.length-1?0:12 }}><div style={{ position:'absolute', left:-17, top:3, width:8, height:8, borderRadius:'50%', border:`2px solid ${method.color}`, background:'#0B1012' }} /><div style={{ fontFamily:T.mono, fontSize:7, color:method.color, letterSpacing:'.16em' }}>{event.year} · {event.type}</div><div style={{ fontFamily:T.body, fontSize:12, color:T.inkDim, lineHeight:1.55, marginTop:4 }}>{event.text}</div></div>)}
          </div> : <div style={{ fontFamily:T.body, fontSize:12, color:T.inkFaint, lineHeight:1.6 }}>A parceria ainda não registrou capítulos públicos.</div>}
        </section>
        <section style={{ border:`1px solid ${method.color}22`, background:`${method.color}07`, padding:16 }}>
          <div style={{ fontFamily:T.mono, fontSize:7, letterSpacing:'.22em', color:method.color, textTransform:'uppercase', marginBottom:12 }}>O técnico no circuito</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:7 }}>
            {[
              ['Reputação', coach.reputation ?? 0, method.color], ['Ambição', coach.ambition ?? 0, '#FFD36B'],
              ['Temporadas', coach.careerRecord?.seasons ?? 0, '#71C7FF'], ['Títulos', coach.careerRecord?.titles ?? 0, '#F2EDE4'],
            ].map(([label, value, color]) => <div key={label} style={{ padding:'10px 9px', border:'1px solid rgba(237,232,223,.08)', background:'rgba(0,0,0,.12)' }}><div style={{ fontFamily:T.display, fontSize:24, color, lineHeight:1 }}>{value}</div><div style={{ fontFamily:T.mono, fontSize:6.5, letterSpacing:'.15em', color:T.inkFaint, textTransform:'uppercase', marginTop:4 }}>{label}</div></div>)}
          </div>
          <div style={{ fontFamily:T.body, fontSize:11, color:T.inkDim, lineHeight:1.55, marginTop:12 }}>Um {method.label.toLowerCase()} {String(coach.temperament ?? '').toLowerCase()} que trabalha para {coach.preferredPlayerProfile === 'ANY' ? 'adaptar o método ao atleta' : 'encontrar o projeto certo para o próprio método'}.</div>
        </section>
      </div>
    </div>
  );
}

// -- TabFormaRecente -----------------------------------------------
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
    <div style={{ fontFamily:'Space Mono,monospace', fontSize:9, fontWeight:700,
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
          <span style={{ fontFamily:'Space Mono,monospace', fontSize:7, letterSpacing:3,
            color:'rgba(255,255,255,0.25)', textTransform:'uppercase' }}>{label}</span>
          <span style={{ fontFamily:'Space Mono,monospace', fontSize:22, fontWeight:900, color, lineHeight:1 }}>
            {value}
          </span>
        </div>
        <div style={{ height:3, background:'rgba(255,255,255,0.07)', borderRadius:2, overflow:'hidden' }}>
          <div style={{ height:'100%', width:`${frac*100}%`,
            background:`linear-gradient(90deg,${color}66,${color})`, transition:'width .5s ease' }} />
        </div>
        {sub && <div style={{ fontFamily:'Space Mono,monospace', fontSize:8,
          fontWeight:700, color, letterSpacing:2, textTransform:'uppercase' }}>{sub}</div>}
      </div>
    );
  };

  const CompRow = ({ label, value, max=100, color }) => {
    const w = Math.min(value/max,1);
    return (
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:7 }}>
        <span style={{ fontFamily:'Space Mono,monospace', fontSize:8, color:'rgba(255,255,255,0.3)',
          textTransform:'uppercase', letterSpacing:1, width:110, flexShrink:0 }}>{label}</span>
        <div style={{ flex:1, height:3, background:'rgba(255,255,255,0.06)', borderRadius:2, overflow:'hidden' }}>
          <div style={{ height:'100%', width:`${w*100}%`, background: color ?? sc,
            borderRadius:2, transition:'width .4s ease' }} />
        </div>
        <span style={{ fontFamily:'Space Mono,monospace', fontSize:10, fontWeight:700,
          color: color ?? sc, width:30, textAlign:'right', flexShrink:0 }}>{value}</span>
      </div>
    );
  };

  // -- Sinal combinado — círculo principal --
  const signalTier = getPhaseTwoTier(signal.score);

  // -- Match rating history sparkline --
  const histToShow = ratingHist.slice(-12);
  const maxR = Math.max(...histToShow, 6);

  // -- Trajetória de ranking recente --
  const rankHist = Array.isArray(np._rankHistory) ? np._rankHistory.slice(-5) : [];

  // -- recentForm results --
  const rfResults = (np.recentForm?.results ?? []).slice(-8);

  return (
    <div style={{ padding:'4px 16px 32px', color:'rgba(242,237,228,0.85)' }}>

      {/* -- Sinal Combinado -- */}
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
            <span style={{ fontFamily:'Space Mono,monospace', fontSize:22, fontWeight:900,
              color:signalTier.color, lineHeight:1 }}>{signal.score}</span>
            <span style={{ fontFamily:'Space Mono,monospace', fontSize:6, letterSpacing:2,
              color:'rgba(255,255,255,0.3)', textTransform:'uppercase' }}>/ 100</span>
          </div>
        </div>
        {/* Breakdown */}
        <div style={{ flex:1, display:'flex', flexDirection:'column', gap:5 }}>
          <div style={{ fontFamily:'Space Mono,monospace', fontSize:13, fontWeight:900,
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
                <span style={{ fontFamily:'Space Mono,monospace', fontSize:6, letterSpacing:2,
                  color:'rgba(255,255,255,0.25)', textTransform:'uppercase' }}>{label} ×{w}</span>
                <span style={{ fontFamily:'Space Mono,monospace', fontSize:16, fontWeight:900,
                  color, lineHeight:1 }}>{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* -- IFR -- */}
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

      {/* -- Últimas partidas -- */}
      {rfResults.length > 0 && (<>
        <Sh>Últimas Partidas</Sh>
        <div style={{ display:'flex', gap:4, flexWrap:'wrap', marginBottom:4 }}>
          {rfResults.slice().reverse().map((r, i) => {
            const oppRank = r.oppRank ?? 99;
            const oppLabel = oppRank <= 10 ? `Top ${oppRank}` : oppRank <= 30 ? `#${oppRank}` : `R${oppRank}`;
            const surf = r.surface ?? 'HARD';
            const surfColor = { CLAY:'#FF7043', GRASS:'#66BB6A', HARD:'#42A5F5', STREET:'#EF9F27', CARPET:'#C4426A', INDOOR:'#AB47BC' }[surf] ?? '#888';
            return (
              <div key={i} style={{ display:'flex', flexDirection:'column', alignItems:'center',
                padding:'8px 10px', gap:3, minWidth:56,
                background: r.won ? 'rgba(96,255,144,0.07)' : 'rgba(255,96,96,0.07)',
                border: `1px solid ${r.won ? 'rgba(96,255,144,0.25)' : 'rgba(255,96,96,0.2)'}`,
                borderBottom: `3px solid ${surfColor}` }}>
                <span style={{ fontFamily:'Space Mono,monospace', fontSize:16, fontWeight:900,
                  color: r.won ? '#60FF90' : '#FF6060', lineHeight:1 }}>{r.won ? 'V' : 'D'}</span>
                <span style={{ fontFamily:'Space Mono,monospace', fontSize:7,
                  color:'rgba(255,255,255,0.35)', letterSpacing:1 }}>{oppLabel}</span>
                <span style={{ fontFamily:'Space Mono,monospace', fontSize:6,
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
            { label:'Sequência -', value: np.recentForm?.coldStreak ?? 0, color:'#FF6060' },
            { label:'Form Score', value: np.recentForm?.formScore != null ? `${Math.round(np.recentForm.formScore*100)}%` : '—', color:sc },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ flex:1, padding:'8px 10px', background:'rgba(255,255,255,0.03)',
              border:'1px solid rgba(255,255,255,0.07)', display:'flex', flexDirection:'column', gap:2 }}>
              <span style={{ fontFamily:'Space Mono,monospace', fontSize:6, letterSpacing:2,
                color:'rgba(255,255,255,0.25)', textTransform:'uppercase' }}>{label}</span>
              <span style={{ fontFamily:'Space Mono,monospace', fontSize:16, fontWeight:900,
                color, lineHeight:1 }}>{value}</span>
            </div>
          ))}
        </div>
      </>)}

      {/* -- Match Rating History -- */}
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
                  <div style={{ fontFamily:'Space Mono,monospace', fontSize:6,
                    color: isLast ? rTier : 'rgba(255,255,255,0.25)' }}>{r.toFixed(1)}</div>
                  <div style={{ width:'100%', height:h,
                    background: isLast ? `linear-gradient(180deg,${rTier},${rTier}66)` : `${rTier}55`,
                    borderRadius:'2px 2px 0 0' }} />
                </div>
              );
            })}
          </div>
          <div style={{ display:'flex', justifyContent:'space-between', marginTop:8 }}>
            <span style={{ fontFamily:'Space Mono,monospace', fontSize:7, color:'rgba(255,255,255,0.25)' }}>
              Últimas {histToShow.length} partidas
            </span>
            {avgRating !== null && (
              <span style={{ fontFamily:'Space Mono,monospace', fontSize:9, fontWeight:700,
                color:sc, letterSpacing:1 }}>
                Média: <span style={{ fontSize:13 }}>{avgRating}</span> / 10
              </span>
            )}
          </div>
          {/* Legenda de tiers */}
          <div style={{ display:'flex', gap:10, marginTop:8, flexWrap:'wrap' }}>
            {[['=9.0','Excepcional','#FFD700'],['=7.5','Dominante','#60FF90'],
              ['=6.0','Sólido','#80C8FF'],['=4.5','Regular','#FFB060'],['<4.5','Fraco','#FF6060']].map(([range,label,col]) => (
              <div key={label} style={{ display:'flex', alignItems:'center', gap:4 }}>
                <div style={{ width:6, height:6, borderRadius:1, background:col }} />
                <span style={{ fontFamily:'Space Mono,monospace', fontSize:7,
                  color:'rgba(255,255,255,0.3)' }}>{range} {label}</span>
              </div>
            ))}
          </div>
        </div>
      </>)}

      {/* -- Visibilidade -- */}
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

      {/* -- Marketability (referência cruzada) -- */}
      <Sh>Marketability</Sh>
      <div style={{ display:'flex', gap:8 }}>
        <Gauge value={mktScore} color="#C880FF" label="Marketability"
          sub={mktTier?.label ?? '—'} />
        <div style={{ flex:2, padding:'12px 14px', background:'rgba(255,255,255,0.03)',
          border:'1px solid rgba(255,255,255,0.07)', display:'flex', flexDirection:'column',
          justifyContent:'center', gap:4 }}>
          <div style={{ fontFamily:'Space Mono,monospace', fontSize:8, color:'rgba(255,255,255,0.3)',
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
              <span key={t} style={{ fontFamily:'Space Mono,monospace', fontSize:6,
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
                    <span style={{ fontFamily:'Space Mono,monospace', fontSize:6,
                      color:'rgba(255,255,255,0.2)' }}>{formatProfileYear(h.year)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* -- Histórico de ranking recente -- */}
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
                  <span style={{ fontFamily:'Space Mono,monospace', fontSize:7,
                    color:col, fontWeight:700 }}>#{rank}</span>
                  <div style={{ width:'100%', height:barH,
                    background:`linear-gradient(180deg,${col}cc,${col}44)`,
                    borderRadius:'2px 2px 0 0' }} />
                  <span style={{ fontFamily:'Space Mono,monospace', fontSize:6,
                    color:'rgba(255,255,255,0.25)' }}>{formatProfileYear(h.year)}</span>
                </div>
              );
            })}
          </div>
        </div>
      </>)}

    </div>
  );
}

// -- TabPatrocinio -------------------------------------------------
function TabPatrocinio({ np, sc, sponsorPool, year, highestPaidPlayerId, pendingOffers }) {

  const [subTab, setSubTab] = React.useState('contratos');

  const profile = React.useMemo(() => {
    if (!sponsorPool) return null;
    try { return getSponsorshipProfile(sponsorPool, np); } catch { return null; }
  }, [sponsorPool, np]);

  const TIER_COLOR = { ELITE:'#FFD700', PREMIUM:'#60FF90', MID:'#60C8FF', ENTRY:'#8899AA' };
  const TIER_ICON  = { ELITE:'??', PREMIUM:'?', MID:'??', ENTRY:'?' };
  const CONTRACT_TYPE_PT = { BASE:'Base', PERFORMANCE:'Performance', IMAGE:'Imagem',
    EQUIPMENT:'Equipamento', AMBASSADOR:'Embaixador', PROSPECT_DEAL:'Prospect' };
  const CAT_PT = { RACKET:'Raquetes', APPAREL:'Vestuário', LUXURY:'Luxo',
    FINANCE:'Financeiro', TECH:'Tecnologia', ENERGY:'Energia',
    AIRLINE:'Aérea', AUTOMOTIVE:'Automotivo', RETAIL:'Varejo', MEDIA:'Mídia',
    CONSUMER:'Consumo' };
  const TERM_PT = { EXPIRED:'? Encerrado', SCANDAL:'? Esc?ndalo',
    PERFORMANCE_DROP:'?? Performance', INJURY_LONG:'?? Lesão',
    RIVAL_ASCENDED:'? Rival', BUDGET_CUT:'? Budget', RETIREMENT:'?? Aposentadoria', MUTUAL:'?? Mútua' };

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
      fontFamily:T.mono, fontSize:10, fontWeight:700, letterSpacing:2.4,
      padding:'14px 18px', cursor:'pointer', border:'none', background:'none',
      color: subTab===id ? sc : 'rgba(237,232,223,.28)',
      borderBottom: subTab===id ? `2px solid ${sc}` : '2px solid transparent',
      textTransform:'uppercase', transition:'color .15s',
    }}>{label}</button>
  );

  if (!sponsorPool || !profile) {
    return (
      <div style={{ padding:'48px 24px', display:'flex', flexDirection:'column',
        alignItems:'center', gap:12, color:'rgba(237,232,223,.28)' }}>
        <div style={{ fontSize:40, opacity:.3 }}>???</div>
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
  // Jogadores sem histórico comercial ainda podem ter sinal 0; nesse caso a
  // camada de sponsorship devolve null e a ficha usa o tom do próprio atleta.
  const sigTier = getPhaseTwoTier(signal) ?? { color: sc, label: 'Em formação' };
  const commercial = profile.commercialProfile ?? {};

  return (
    <div style={{ display:'flex', flexDirection:'column', flex:1, overflow:'hidden', minHeight:0 }}>
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,minmax(0,1fr))',gap:10,padding:'14px 16px 12px',background:'linear-gradient(180deg, rgba(255,255,255,.03), rgba(255,255,255,.012))',borderBottom:'1px solid rgba(237,232,223,.07)'}}>
        {[
          { label:'Receita anual', value: formatUSD(sponsorAnnual), tone: sc },
          { label:'Contratos ativos', value: String(activeContracts.length), tone: '#E8C84A' },
          { label:'Dependência das marcas', value: `${sponsorPct}%`, tone: '#60C8FF' },
          { label:'Sinal de mercado', value: String(signal), tone: sigTier.color ?? sc },
        ].map(card => (
          <div key={card.label} style={{padding:'12px 14px',background:'rgba(255,255,255,.022)',border:'1px solid rgba(237,232,223,.08)'}}>
            <div style={{fontFamily:T.mono,fontSize:7,letterSpacing:3,color:`${card.tone}88`,textTransform:'uppercase',marginBottom:6}}>{card.label}</div>
            <div style={{fontFamily:T.display,fontSize:30,lineHeight:.92,color:card.tone}}>{card.value}</div>
          </div>
        ))}
      </div>
      {/* Sub-tab bar */}
      <div style={{ display:'flex', borderBottom:`1px solid rgba(237,232,223,.07)`,
        background:T.bg2, flexShrink:0, padding:'0 16px' }}>
        <SubBtn id="contratos" label="?? Contratos" />
        <SubBtn id="sinal"     label="?? Sinal" />
        <SubBtn id="historico" label="?? Histórico" />
        {playerOffers.length > 0 && <SubBtn id="ofertas" label={`?? Ofertas (${playerOffers.length})`} />}
      </div>

      <div className="upp2-scroll" style={{ flex:1, overflowY:'auto', padding:'4px 16px 32px' }}>

        {/* -- CONTRATOS -- */}
        {subTab==='contratos' && (<>

          {isHighestPaid && (
            <div style={{ margin:'12px 0 4px', padding:'10px 14px',
              background:'rgba(255,215,0,.06)', border:'1px solid rgba(255,215,0,.25)',
              display:'flex', alignItems:'center', gap:10 }}>
              <span style={{ fontSize:18 }}>??</span>
              <div>
                <div style={{ fontFamily:'Space Mono,monospace', fontSize:7, letterSpacing:3,
                  color:'rgba(255,215,0,.55)', textTransform:'uppercase' }}>Destaque do circuito</div>
                <div style={{ fontFamily:T.cond, fontSize:17, fontWeight:700,
                  color:'#FFD700', letterSpacing:1 }}>Jogador mais bem pago da temporada</div>
              </div>
            </div>
          )}

          <div style={{ margin:'12px 0 10px', padding:16,
            background:`linear-gradient(135deg, ${commercial.tone ?? sc}12, rgba(255,255,255,.018) 48%, rgba(0,0,0,.18))`,
            border:`1px solid ${(commercial.tone ?? sc)}2A`,
            borderLeft:`4px solid ${commercial.tone ?? sc}`,
            position:'relative', overflow:'hidden' }}>
            <div style={{ position:'absolute', right:-36, top:-42, width:150, height:150,
              borderRadius:'50%', background:`${commercial.tone ?? sc}10`, filter:'blur(2px)' }} />
            <div style={{ position:'relative', display:'flex', justifyContent:'space-between', gap:16, alignItems:'flex-start' }}>
              <div style={{ minWidth:0 }}>
                <div style={{ fontFamily:T.mono, fontSize:7, letterSpacing:3,
                  color:`${commercial.tone ?? sc}AA`, textTransform:'uppercase', marginBottom:6 }}>
                  Perfil comercial
                </div>
                <div style={{ fontFamily:T.display, fontSize:30, lineHeight:.95,
                  color:commercial.tone ?? sc, letterSpacing:.5 }}>
                  {commercial.archetype ?? 'Em construção'}
                </div>
                <div style={{ fontFamily:T.body, fontSize:12, lineHeight:1.45,
                  color:'rgba(237,232,223,.62)', marginTop:9, maxWidth:760 }}>
                  {commercial.headline}
                </div>
                <div style={{ fontFamily:T.body, fontSize:11, lineHeight:1.45,
                  color:'rgba(237,232,223,.42)', marginTop:5, maxWidth:760 }}>
                  {commercial.diagnosis}
                </div>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(2, minmax(92px,1fr))', gap:8, minWidth:220 }}>
                {[
                  { l:'Carteira', v:commercial.portfolioHealth ?? '—' },
                  { l:'Runway', v:commercial.runway ?? '—' },
                  { l:'Risco', v:commercial.concentrationRisk ?? '—' },
                  { l:'Categorias', v:String(commercial.categories?.length ?? 0) },
                ].map(item => (
                  <div key={item.l} style={{ padding:'8px 10px',
                    background:'rgba(0,0,0,.18)', border:'1px solid rgba(237,232,223,.07)' }}>
                    <div style={{ fontFamily:T.mono, fontSize:6, letterSpacing:2.5,
                      color:'rgba(237,232,223,.28)', textTransform:'uppercase', marginBottom:4 }}>
                      {item.l}
                    </div>
                    <div style={{ fontFamily:T.mono, fontSize:10, fontWeight:900,
                      color:'rgba(237,232,223,.78)', textTransform:'uppercase' }}>
                      {item.v}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {commercial.anchorSponsor && (
              <div style={{ position:'relative', marginTop:12, display:'flex', alignItems:'center', gap:10 }}>
                <div style={{ flex:1, height:5, background:'rgba(255,255,255,.055)', overflow:'hidden' }}>
                  <div style={{ width:`${commercial.anchorSponsor.share}%`, height:'100%',
                    background:`linear-gradient(90deg, ${commercial.tone ?? sc}, rgba(255,255,255,.25))` }} />
                </div>
                <div style={{ fontFamily:T.mono, fontSize:8, color:'rgba(237,232,223,.45)', whiteSpace:'nowrap' }}>
                  Âncora: {commercial.anchorSponsor.sponsorName} · {commercial.anchorSponsor.share}%
                </div>
              </div>
            )}
          </div>

          {activeContracts.length === 0 && (
            <div style={{ padding:'40px 0', textAlign:'center',
              fontFamily:'Space Mono,monospace', fontSize:9, letterSpacing:3,
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
                      {c.logo ?? '???'}
                    </div>
                    <div>
                      <div style={{ fontFamily:T.cond, fontSize:19, fontWeight:700,
                        color:'rgba(237,232,223,.9)', letterSpacing:1 }}>{c.sponsorName}</div>
                      <div style={{ fontFamily:'Space Mono,monospace', fontSize:7, letterSpacing:3,
                        color:tc, textTransform:'uppercase', marginTop:2 }}>
                        {TIER_ICON[c.tier]} {c.tier} · {CAT_PT[c.category]??c.category}
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <div style={{ fontFamily:T.cond, fontSize:28, fontWeight:700,
                      color:tc, lineHeight:1 }}>{formatUSD(c.annualFee)}</div>
                    <div style={{ fontFamily:'Space Mono,monospace', fontSize:7, color:'rgba(237,232,223,.3)' }}>/ano</div>
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
                      <div style={{ fontFamily:'Space Mono,monospace', fontSize:6, color:'rgba(237,232,223,.25)',
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
                {(c.fitSummary || c.clauseSummary || c.campaignConcept?.hook) && (
                  <div style={{ marginTop:8, padding:'8px 10px',
                    background:'rgba(96,200,255,.035)', border:'1px solid rgba(96,200,255,.12)' }}>
                    {c.campaignConcept?.hook && (
                      <div style={{ fontFamily:'Space Mono,monospace', fontSize:6, letterSpacing:3,
                        color:'rgba(96,200,255,.48)', textTransform:'uppercase', marginBottom:4 }}>
                        Conceito · {c.campaignConcept.hook}
                      </div>
                    )}
                    {c.fitSummary && (
                      <div style={{ fontFamily:T.body, fontSize:11, color:'rgba(237,232,223,.58)', lineHeight:1.35 }}>
                        {c.fitSummary}
                      </div>
                    )}
                    {c.clauseSummary && (
                      <div style={{ fontFamily:'Space Mono,monospace', fontSize:7, color:'rgba(96,200,255,.65)', marginTop:5 }}>
                        {c.clauseSummary}
                      </div>
                    )}
                  </div>
                )}
                {c.contractType==='PERFORMANCE' && c.bonuses && (
                  <div style={{ marginTop:8, padding:'6px 10px',
                    background:'rgba(255,215,0,.03)', border:'1px solid rgba(255,215,0,.1)' }}>
                    <div style={{ fontFamily:'Space Mono,monospace', fontSize:6, letterSpacing:3,
                      color:'rgba(255,215,0,.4)', textTransform:'uppercase', marginBottom:4 }}>Bônus</div>
                    <div style={{ display:'flex', flexWrap:'wrap', gap:5 }}>
                      {Object.entries(c.bonuses).map(([k,v]) => (
                        <span key={k} style={{ fontFamily:'Space Mono,monospace', fontSize:8,
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
                    <div style={{ fontFamily:'Space Mono,monospace', fontSize:6, letterSpacing:3,
                      color:'rgba(96,255,144,.4)', textTransform:'uppercase', marginBottom:4 }}>Escada</div>
                    <div style={{ display:'flex', gap:6 }}>
                      {[
                        { l:'Top 50', u:c._top50Unlocked },
                        { l:'Top 10', u:c._top10Unlocked },
                        { l:'Top 5',  u:c._top5Unlocked  },
                      ].map(t => (
                        <span key={t.l} style={{ fontFamily:'Space Mono,monospace', fontSize:8,
                          color: t.u?'#60FF90':'rgba(96,255,144,.35)',
                          padding:'1px 6px',
                          border:`1px solid ${t.u?'rgba(96,255,144,.35)':'rgba(96,255,144,.1)'}` }}>
                          {t.u?'? ':''}{t.l}
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
                  <div style={{ fontFamily:'Space Mono,monospace', fontSize:7, letterSpacing:3,
                    color:'rgba(237,232,223,.25)', textTransform:'uppercase' }}>{d.l}</div>
                  <div style={{ fontFamily:'Space Mono,monospace', fontSize:20, fontWeight:900,
                    color:d.color, lineHeight:1, marginTop:3 }}>{d.v}</div>
                </div>
              ))}
            </div>
            <div style={{ height:8, display:'flex', overflow:'hidden', marginBottom:6 }}>
              <div style={{ width:`${sponsorPct}%`, background:sc, transition:'width .5s' }} />
              <div style={{ flex:1, background:'#60C8FF' }} />
            </div>
            <div style={{ display:'flex', justifyContent:'space-between',
              fontFamily:'Space Mono,monospace', fontSize:8 }}>
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
                <div style={{ fontFamily:'Space Mono,monospace', fontSize:7, letterSpacing:3,
                  color:'rgba(255,215,0,.4)', textTransform:'uppercase', marginBottom:3 }}>
                  Maior contrato da carreira
                </div>
                <div style={{ fontFamily:'Space Mono,monospace', fontSize:12,
                  color:'rgba(237,232,223,.55)' }}>
                  {profile.biggestContract.sponsorName} · {profile.biggestContract.year}
                </div>
              </div>
              <div style={{ fontFamily:'Space Mono,monospace', fontSize:20, fontWeight:900, color:'#FFD700' }}>
                {formatUSD(profile.biggestContract.annualFee)}
              </div>
            </div>
          )}
        </>)}

        {/* -- SINAL -- */}
        {subTab==='sinal' && (<>
          <div style={{ marginTop:12, padding:'14px',
            background:'rgba(255,255,255,.025)',
            border:`1px solid ${sigTier.color??sc}22`,
            borderLeft:`3px solid ${sigTier.color??sc}` }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12 }}>
              <div>
                <div style={{ fontFamily:'Space Mono,monospace', fontSize:7, letterSpacing:3,
                  color:`${sigTier.color??sc}66`, textTransform:'uppercase', marginBottom:3 }}>
                  Sinal para Patrocinadores
                </div>
                <div style={{ fontFamily:T.cond, fontSize:18, fontWeight:700,
                  color:sigTier.color??sc, letterSpacing:1, textTransform:'uppercase' }}>
                  {sigTier.label??'—'}
                </div>
              </div>
              <div style={{ fontFamily:'Space Mono,monospace', fontSize:44, fontWeight:900,
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
                  <span style={{ fontFamily:'Space Mono,monospace', fontSize:7,
                    color:'rgba(237,232,223,.3)', letterSpacing:2, textTransform:'uppercase' }}>{b.l}</span>
                  <span style={{ fontFamily:'Space Mono,monospace', fontSize:8, color:b.color }}>
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
                <span style={{ fontSize:13 }}>{TIER_ICON[tierId]??'?'}</span>
                <span style={{ fontFamily:'Space Mono,monospace', fontWeight:900, fontSize:12,
                  color:tc, flex:1, letterSpacing:1 }}>{tierId}</span>
                <span style={{ fontFamily:'Space Mono,monospace', fontSize:8,
                  color: accessible?tc:'rgba(237,232,223,.25)' }}>
                  {accessible ? '? Elegível' : `Mín. ${tierData.minMarket}`}
                </span>
                <span style={{ fontFamily:'Space Mono,monospace', fontSize:7, color:'rgba(237,232,223,.25)' }}>
                  {formatUSD(tierData.contractRange?.[0])}–{formatUSD(tierData.contractRange?.[1])}/ano
                </span>
              </div>
            );
          })}
        </>)}

        {/* -- HISTÓRICO -- */}
        {subTab==='historico' && (<>
          <Sh>Contratos Encerrados</Sh>
          {archive.length === 0 && (
            <div style={{ padding:'32px 0', textAlign:'center',
              fontFamily:'Space Mono,monospace', fontSize:9, letterSpacing:3,
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
                <span style={{ fontSize:16, opacity:.7 }}>{c.logo??'???'}</span>
                <div style={{ flex:1 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                    <span style={{ fontFamily:'Space Mono,monospace', fontWeight:900,
                      fontSize:13, color:'rgba(237,232,223,.85)' }}>{c.sponsorName}</span>
                    <span style={{ fontFamily:'Space Mono,monospace', fontSize:6, letterSpacing:3,
                      color:tc, textTransform:'uppercase' }}>{c.sponsorTier}</span>
                  </div>
                  <div style={{ fontFamily:'Space Mono,monospace', fontSize:7,
                    color:'rgba(237,232,223,.3)', marginTop:2 }}>
                    {c.seasonSigned} ? {c.terminatedYear??c.seasonSigned+(c.duration??1)-1} · {reason}
                  </div>
                </div>
                <div style={{ fontFamily:'Space Mono,monospace', fontWeight:900,
                  fontSize:13, color:tc }}>
                  {formatUSD(c.annualFee)}<span style={{ fontSize:8, color:'rgba(237,232,223,.3)' }}>/ano</span>
                </div>
              </div>
            );
          })}
        </>)}

        {/* -- OFERTAS -- */}
        {subTab==='ofertas' && (<>
          <Sh>Ofertas Recentes</Sh>
          {playerOffers.length === 0 && (
            <div style={{ padding:'32px 0', textAlign:'center',
              fontFamily:'Space Mono,monospace', fontSize:9, letterSpacing:3,
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
                <span style={{ fontSize:20 }}>{o.logo??'???'}</span>
                <div style={{ flex:1 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <span style={{ fontFamily:'Space Mono,monospace', fontWeight:900,
                      fontSize:13, color:'rgba(237,232,223,.9)' }}>{o.sponsorName}</span>
                    <span style={{ fontFamily:'Space Mono,monospace', fontSize:6, letterSpacing:3,
                      color:tc, textTransform:'uppercase' }}>{o.sponsorTier}</span>
                  </div>
                  {o.reasons?.[0] && (
                    <div style={{ fontFamily:'Space Mono,monospace', fontSize:8,
                      color:'rgba(237,232,223,.3)', marginTop:3, fontStyle:'italic' }}>
                      {o.reasons[0]}
                    </div>
                  )}
                </div>
                <div style={{ textAlign:'right' }}>
                  <div style={{ fontFamily:'Space Mono,monospace', fontWeight:900,
                    fontSize:18, color:tc }}>{formatUSD(o.annualFee)}</div>
                  <div style={{ fontFamily:'Space Mono,monospace', fontSize:7,
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


// -----------------------------------------------------------------
// TAB VIDA — Vida fora da quadra
// -----------------------------------------------------------------
const CAT_META = {
  PERSONAL:    { label: 'Pessoal',       color: '#F472B6', icon: '??'  },
  HOME:        { label: 'Residência',    color: '#60A5FA', icon: '??'  },
  SOCIAL:      { label: 'Social',        color: '#34D399', icon: '??'  },
  BUSINESS:    { label: 'Negócios',      color: '#FBBF24', icon: '??'  },
  MEDIA:       { label: 'Mídia',         color: '#C084FC', icon: '??'  },
  CONTROVERSY: { label: 'Polêmica',      color: '#F87171', icon: '?'  },
  COMMUNITY:   { label: 'Comunidade',    color: '#86EFAC', icon: '??'  },
  SPIRITUAL:   { label: 'Espiritual',    color: '#FDE68A', icon: '??'  },
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
  BILLIONAIRE_TIER: { label: 'Ultra-riqueza', color: '#FFD700', icon: '??' },
  VERY_WEALTHY:     { label: 'Muito rico',    color: '#A3E635', icon: '??' },
  WEALTHY:          { label: 'Rico',          color: '#60A5FA', icon: '??' },
  COMFORTABLE:      { label: 'Confortável',   color: '#94A3B8', icon: '??' },
  DEVELOPING:       { label: 'Em construção', color: '#6B7280', icon: '???' },
};

const PUB_IMG_META = {
  GLOBETROTTER: { color: '#60A5FA', icon: '??'  },
  HOMEBODY:     { color: '#94A3B8', icon: '??'  },
  SOCIALITE:    { color: '#F472B6', icon: '??'  },
  ACTIVIST:     { color: '#34D399', icon: '?'  },
  ENTREPRENEUR: { color: '#FBBF24', icon: '??'  },
  FAMILY_FIRST: { color: '#FB923C', icon: '????????'  },
  MEDIA_DARLING:{ color: '#C084FC', icon: '??'  },
  LOW_PROFILE:  { color: '#6B7280', icon: '??'  },
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
  const pubMeta   = PUB_IMG_META[pubImg?.id] ?? { color: sc, icon: '??' };
  const offCourt  = ld.offCourt ?? getOffCourtState(np);
  const offCourtEffects = Object.entries(offCourt.effects ?? {}).filter(([, value]) => Number(value) !== 0);
  const lifeSim = np.lifeSimulation ?? null;
  const lifeStyleLabels = {
    FOCUSED_PRO: 'Profissional obcecado', FAMILY_ANCHOR: 'Família como âncora', COMMERCIAL_STAR: 'Estrela comercial',
    PRIVATE_BALANCER: 'Equilíbrio reservado', SOCIAL_FREE_SPIRIT: 'Espírito livre', LEGACY_BUILDER: 'Construtor de legado',
  };
  const lifeEffectLabels = { matchFocus: 'foco', recovery: 'recuperação', pressure: 'pressão', injuryRisk: 'risco físico', commercial: 'imagem', support: 'apoio', finance: 'finanças' };
  const lifeEffectChips = Object.entries(lifeSim?.currentEffects ?? {}).filter(([, value]) => Number(value) !== 0);

  // Categorias presentes no log
  const logCats = [...new Set(log.map(e => e.category))];

  const filteredLog = logFilter === 'ALL' ? log
    : log.filter(e => e.category === logFilter);

  return (
    <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>

      {/* -- LEFT — dados estáticos -- */}
      <div className="upp2-scroll" style={{ flex: 1, padding: '24px 26px 28px', borderRight: '1px solid rgba(237,232,223,.06)' }}>

        {/* RELAÇ?O E FAM?LIA */}
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

        {lifeSim && (
          <VidaSection title="Motor de Vida" color="#E8C84A">
            <VidaCard accent="#E8C84A">
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', gap:12, marginBottom:10 }}>
                <div>
                  <div style={{ fontFamily:T.mono, fontSize:7, color:'rgba(232,200,74,.6)', letterSpacing:'.28em', textTransform:'uppercase' }}>Estilo de vida</div>
                  <div style={{ fontFamily:T.cond, fontSize:20, fontWeight:700, color:'#E8C84A', textTransform:'uppercase' }}>{lifeStyleLabels[lifeSim.profile?.lifestyleId] ?? 'Em definição'}</div>
                </div>
                {lifeSim.monthlyDecisions?.at(-1) && <div style={{ fontFamily:T.body, fontSize:11, color:'rgba(237,232,223,.55)', textAlign:'right' }}>{lifeSim.monthlyDecisions.at(-1).label}</div>}
              </div>
              {lifeEffectChips.length > 0 && (
                <div style={{ display:'flex', flexWrap:'wrap', gap:5, marginBottom:10 }}>
                  {lifeEffectChips.map(([effect, value]) => {
                    const positive = Number(value) > 0;
                    const color = effect === 'pressure' || effect === 'injuryRisk'
                      ? (positive ? '#F87171' : '#34D399')
                      : (positive ? '#34D399' : '#F87171');
                    return <span key={effect} style={{ fontFamily:T.mono, fontSize:7, padding:'3px 6px', color, border:`1px solid ${color}33`, background:`${color}10`, letterSpacing:'.11em', textTransform:'uppercase' }}>
                      {lifeEffectLabels[effect] ?? effect} {positive ? '+' : ''}{value}
                    </span>;
                  })}
                </div>
              )}
              {(lifeSim.activeSituations ?? []).length > 0 ? (
                <div style={{ display:'grid', gap:6 }}>
                  {lifeSim.activeSituations.map(situation => (
                    <div key={situation.id} style={{ display:'flex', justifyContent:'space-between', gap:12, padding:'7px 9px', background:'rgba(232,200,74,.06)', border:'1px solid rgba(232,200,74,.16)' }}>
                      <span style={{ fontFamily:T.cond, fontSize:14, color:'rgba(237,232,223,.88)', textTransform:'uppercase' }}>{situation.label}</span>
                      <span style={{ fontFamily:T.mono, fontSize:7, color:'rgba(232,200,74,.75)', letterSpacing:'.12em' }}>{situation.monthsRemaining}M · {situation.intensity}%</span>
                    </div>
                  ))}
                </div>
              ) : <div style={{ fontFamily:T.body, fontSize:12, color:'rgba(237,232,223,.46)' }}>Sem crise ou arco ativo — a rotina atual dita o mês.</div>}
            </VidaCard>
          </VidaSection>
        )}

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
            {(() => {
              const properties = ld.home?.properties ?? [];
              const main = properties.find(property => property.main) ?? properties[0];
              return <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontFamily: T.mono, fontSize: 7, color: 'rgba(96,165,250,.6)', letterSpacing: '.3em', textTransform: 'uppercase', marginBottom: 3 }}>Base atual</div>
                <div style={{ fontFamily: T.cond, fontWeight: 700, fontSize: 16, color: '#EDE8DF' }}>
                  {main?.city ? `${main.city}, ${main.country ?? ld.home?.country ?? ''}` : ld.home?.city ? `${ld.home.city}, ${ld.home.country}` : ld.home?.country ?? '—'}
                </div>
                {main?.label && <div style={{ fontFamily:T.body, fontSize:11, color:'rgba(237,232,223,.48)', marginTop:3 }}>{main.label} · {main.reason ?? 'base de vida'}</div>}
              </div>
              {ld.home?.taxHaven && (
                <span style={{ fontFamily: T.mono, fontSize: 7, padding: '3px 7px', background: 'rgba(251,191,36,.1)', border: '1px solid rgba(251,191,36,.25)', color: '#FBBF24', letterSpacing: '.2em', textTransform: 'uppercase' }}>
                  Paraíso Fiscal
                </span>
              )}
            </div>
            {properties.length > 1 && <div style={{ marginTop:10, paddingTop:8, borderTop:'1px solid rgba(237,232,223,.06)' }}>
              <div style={{ fontFamily:T.mono, fontSize:7, color:'rgba(96,165,250,.58)', letterSpacing:'.22em', textTransform:'uppercase', marginBottom:6 }}>Portfólio residencial · {properties.length} imóveis</div>
              <div style={{ display:'grid', gap:4 }}>
                {properties.slice(0,4).map(property => <div key={property.id ?? property.label} style={{ display:'flex', justifyContent:'space-between', gap:10, fontFamily:T.body, fontSize:11, color:'rgba(237,232,223,.68)' }}>
                  <span>{property.main ? '● ' : '○ '}{property.label}</span><span style={{ color:'rgba(96,165,250,.72)', whiteSpace:'nowrap' }}>{property.city ?? property.location ?? 'refúgio'}</span>
                </div>)}
              </div>
            </div>}
              </>;
            })()}
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

      {/* -- RIGHT — riqueza + imagem + log -- */}
      <div className="upp2-scroll" style={{ width: 'clamp(320px,34vw,420px)', flexShrink: 0, padding: '24px 22px', background: 'linear-gradient(180deg, rgba(255,255,255,.02), rgba(0,0,0,.14))' }}>

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

// -----------------------------------------------------------------
// TAB ENTREVISTAS
// -----------------------------------------------------------------

const TONE_META_UPP = {
  warm_open:           { label: 'Carismático',  color: '#E8C84A', icon: '??' },
  brief_professional:  { label: 'Reservado',    color: '#90A4AE', icon: '??' },
  direct_provocative:  { label: 'Confrontador', color: '#EF5350', icon: '??' },
  theatrical_warm:     { label: 'Showman',      color: '#AB47BC', icon: '??' },
  measured_safe:       { label: 'Diplomático',  color: '#4A90D9', icon: '??' },
  sparse_deep:         { label: 'Enigmático',   color: '#78909C', icon: '??' },
  analytical_profound: { label: 'Intelectual',  color: '#26C6DA', icon: '??' },
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
      {/* -- Tom do jogador ----------------------------------- */}
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
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,minmax(0,1fr))',gap:10,marginBottom:14}}>
        {[
          { label:'Tom', value: tm.label, tone: tm.color },
          { label:'Contexto', value: INTERVIEW_CONTEXTS[selectedContext]?.label ?? selectedContext, tone: sc },
          { label:'Bloco atual', value: interview?.pairs?.length ? `${interview.pairs.length} respostas` : 'Pronto para gerar', tone: '#E8C84A' },
        ].map(card => (
          <div key={card.label} style={{padding:'12px 14px',background:'rgba(255,255,255,.022)',border:'1px solid rgba(237,232,223,.08)'}}>
            <div style={{fontFamily:T.mono,fontSize:7,letterSpacing:3,color:`${card.tone}88`,textTransform:'uppercase',marginBottom:6}}>{card.label}</div>
            <div style={{fontFamily:T.cond,fontSize:18,fontWeight:700,color:card.tone,letterSpacing:'.05em',textTransform:'uppercase'}}>{card.value}</div>
          </div>
        ))}
      </div>

      {/* -- Controles ---------------------------------------- */}
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

      {/* -- Botão ---------------------------------------------- */}
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
        {generating ? '? Gerando...' : `??? Gerar entrevista — ${INTERVIEW_CONTEXTS[selectedContext]?.label ?? selectedContext}`}
      </button>

      {/* -- Resultado ---------------------------------------- */}
      {interview && interview.pairs.length > 0 && (
        <div>
          {/* Header */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12,
            paddingBottom: 10, borderBottom: `1px solid ${T.border}`,
          }}>
            <span style={{ fontSize: 10, color: sc }}>???</span>
            <span style={{ fontFamily: T.mono, fontSize: 7, letterSpacing: '.32em', color: T.faint, textTransform: 'uppercase' }}>
              {INTERVIEW_CONTEXTS[interview.contextId]?.label} · {interview.pairs.length} perguntas
            </span>
            {lastTournamentName && (
              <span style={{ fontFamily: T.mono, fontSize: 7, color: T.faint, letterSpacing: '.14em', marginLeft: 'auto' }}>
                ?? {lastTournamentName}
              </span>
            )}
          </div>

          {/* Q&A list */}
          {interview.pairs.map((qa, i) => {
            const meta = TOPIC_META[qa.topic] ?? { icon: '??', label: qa.topic };
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
                  }}>?</span>
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

// -----------------------------------------------------------------
// TAB: GRAND SLAM
// Histórico completo do jogador nos 6 Grand Slams do universo.
// -----------------------------------------------------------------
const GS_DEFS = [
  { id:'B1_GS_MERIDIAN', name:'Meridian Open',    short:'MERIDIAN', surface:'HARD',   surfLabel:'Dura',   color:'#4A90D9', icon:'◆', location:'Meridian'      },
  { id:'B2_GS_TERRA',    name:'Terra Magna',       short:'TERRA',    surface:'CLAY',   surfLabel:'Terra',  color:'#C4572A', icon:'◆', location:'Occitane'      },
  { id:'B3_GS_HIGHLAND', name:'The Highland',      short:'HIGHLAND', surface:'GRASS',  surfLabel:'Prado',  color:'#2E7D32', icon:'◆', location:'Albion'        },
  { id:'B4_GS_URBAN',    name:'Urban Classic',     short:'URBAN',    surface:'STREET', surfLabel:'Asfalto',color:'#B45309', icon:'◆', location:'Urban City'    },
  { id:'B5_GS_VELVET',   name:'Velvet Grand',      short:'VELVET',   surface:'CARPET', surfLabel:'Veludo', color:'#8B1A3A', icon:'◆', location:'Velvet Palace' },
  { id:'B6_GS_CRYSTAL',  name:'Crystal Empire',    short:'CRYSTAL',  surface:'INDOOR', surfLabel:'Cristal',color:'#6A1B9A', icon:'◆', location:'Empire City'  },
];

const ROUND_EMOJI = { W:'★', F:'F', SF:'SF', QF:'QF', R16:'R16', R32:'R32', R64:'R64', R128:'R128' };
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
  const careerGS     = GS_DEFS.every(g => (byTournament[g.id]?.wins ?? 0) > 0);  // todos os 6

  if (!tournamentResults || sortedYears.length === 0) {
    return (
      <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:14, opacity:.3 }}>
        <div style={{ fontSize:52 }}>?</div>
        <div style={{ fontFamily:T.mono, fontSize:9, letterSpacing:4, color:T.inkFaint, textTransform:'uppercase', textAlign:'center' }}>Disponível após temporadas no Universo</div>
      </div>
    );
  }

  return (
    <div className="upp2-scroll" style={{ flex:1, overflowY:'auto', padding:'22px 26px', display:'flex', flexDirection:'column', gap:22 }}>

      {/* -- Hero stats ------------------------------------------------------- */}
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

      {/* -- Career Grand Slam badge ------------------------------------------- */}
      {careerGS && (
        <div style={{ display:'flex', alignItems:'center', gap:16, background:'linear-gradient(135deg,rgba(232,200,74,.1),rgba(232,200,74,.04))', border:'1px solid rgba(232,200,74,.35)', padding:'14px 20px' }}>
          <div style={{ fontSize:32 }}>??</div>
          <div>
            <div style={{ fontFamily:T.display, fontSize:18, color:'#E8C84A', letterSpacing:3, textTransform:'uppercase' }}>Career Grand Slam</div>
            <div style={{ fontFamily:T.mono, fontSize:9, color:'rgba(232,200,74,.6)', letterSpacing:2, marginTop:3 }}>Venceu os 4 Grand Slams ao longo da carreira</div>
          </div>
        </div>
      )}

      {/* -- Cards por torneio ------------------------------------------------ */}
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
                    <div style={{ fontFamily:T.display, fontSize:32, color:col, lineHeight:1 }}>{rec.wins}</div>
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

      {/* -- Grid temporal: ano × torneio ------------------------------------- */}
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
                    {entry.round === 'W' && <span style={{ fontSize:10 }}>??</span>}
                    <GsSetScore sets={entry.sets} won={entry.won} />
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* -- Legenda ----------------------------------------------------------- */}
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

function TabBiografia({ np, sc, tournamentResults, rankingStore, rivalrySystem, year }) {
  const bio = useMemo(() => buildPlayerBiography(np, {
    tournamentResults,
    rankingStore,
    rivalrySystem,
    currentYear: year,
  }), [np, tournamentResults, rankingStore, rivalrySystem, year]);

  const toneColor = {
    gold: '#FFD700',
    accent: sc,
    orange: '#FF8A3D',
    purple: '#C084FC',
    rival: '#EF4444',
    warn: '#F59E0B',
    surface: '#22C55E',
    neutral: 'rgba(237,232,223,.88)',
  };
  const fullNarrativeParagraphs = String(bio.fullNarrative ?? '')
    .split(/\n{2,}/)
    .map(p => p.trim())
    .filter(Boolean);
  const narrativeFacts = bio.narrativeFacts ?? {};
  const goldenYears = narrativeFacts.goldenYears ?? [];
  const hardYears = narrativeFacts.hardYears ?? [];
  const injuryEvents = narrativeFacts.injuryEvents ?? [];
  const sponsorEvents = narrativeFacts.sponsorEvents ?? [];
  const lifeEvents = narrativeFacts.lifeEvents ?? [];
  const careerMoments = narrativeFacts.careerMoments ?? [];
  const memory = narrativeFacts.memory ?? {};
  const evidenceRows = [
    ['Ano dourado', goldenYears[0]?.year ? `${goldenYears[0].year}${goldenYears[0].titles?.length ? ` · ${goldenYears[0].titles.length} tit.` : ''}` : null, '#E8C84A'],
    ['Ano duro', hardYears[0]?.year ? `${hardYears[0].year}${hardYears[0].rankDrop ? ` · -${hardYears[0].rankDrop} rank` : ''}` : null, '#F59E0B'],
    ['Rival central', bio.facts?.topRival?.opponentName ? `${bio.facts.topRival.opponentName} · ${bio.facts.topRival.wins}-${bio.facts.topRival.losses}` : null, '#EF4444'],
    ['Lesão-chave', injuryEvents.at(-1)?.type ? `${injuryEvents.at(-1).type}${injuryEvents.at(-1).season ? ` · ${injuryEvents.at(-1).season}` : ''}` : null, '#FF7043'],
    ['Patrocínio', sponsorEvents.at(-1)?.brand ?? sponsorEvents.at(-1)?.label ?? null, '#5BB8E4'],
    ['Vida pessoal', lifeEvents.at(-1)?.label ?? lifeEvents.at(-1)?.detail ?? null, '#C084FC'],
    ['Memória favorita', memory.favoriteTournament?.tournament?.name ?? null, '#22C55E'],
    ['Fantasma', memory.hauntingTournament?.tournament?.name ?? null, '#F59E0B'],
  ].filter(([, value]) => value);

  return (
    <div style={{ flex:1, display:'flex', overflow:'hidden', minHeight:0 }}>
      <div className="upp2-scroll" style={{ flex:1.2, padding:'24px 30px 34px', borderRight:`1px solid ${T.line}`, overflowY:'auto' }}>
        <div style={{ marginBottom:22, paddingBottom:20, borderBottom:`1px solid ${T.line}` }}>
          <div style={{ fontFamily:T.mono, fontSize:8, color:`${sc}AA`, letterSpacing:'.38em', textTransform:'uppercase', marginBottom:9 }}>biografia oficial</div>
          <div style={{ fontFamily:T.display, fontSize:'clamp(34px,3.8vw,56px)', color:T.ink, lineHeight:.9, marginBottom:14, textTransform:'uppercase' }}>{bio.headline}</div>
          <div style={{ fontFamily:T.body, fontSize:15, color:T.inkDim, lineHeight:1.82, maxWidth:980 }}>{bio.summary}</div>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10, marginBottom:22 }}>
          {[
            ['Fase', bio.careerPhase?.label ?? 'Em definicao', bio.careerPhase?.summary ?? 'A narrativa ainda esta se organizando.'],
            ['Tom', bio.tone?.label ?? 'Sem tom claro', bio.tone?.blurb ?? 'A biografia ainda nao ganhou uma assinatura dominante.'],
            ['Legado', bio.legacy?.label ?? 'Legado em formacao', bio.legacy?.summary ?? 'A leitura historica ainda esta em construcao.'],
          ].map(([label, value, copy], i) => (
            <div key={label} style={{
              padding:'14px 15px',
              background:i===0?`${sc}10`:'rgba(237,232,223,.02)',
              border:i===0?`1px solid ${sc}30`:'1px solid rgba(237,232,223,.06)',
              borderTop:`2px solid ${i===0?sc:'rgba(237,232,223,.12)'}`,
              minHeight:108,
            }}>
              <div style={{ fontFamily:T.mono, fontSize:7, color:`${sc}CC`, letterSpacing:'.22em', textTransform:'uppercase', marginBottom:6 }}>{label}</div>
              <div style={{ fontFamily:T.display, fontSize:18, color:T.ink, lineHeight:1.05, marginBottom:8 }}>{value}</div>
              <div style={{ fontFamily:T.body, fontSize:12, color:T.inkDim, lineHeight:1.55 }}>{copy}</div>
            </div>
          ))}
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,minmax(0,1fr))', gap:10, marginBottom:22 }}>
          {[
            ['Parágrafos', `${fullNarrativeParagraphs.length || bio.paragraphs?.length || 0}`, 'tamanho adaptativo da narrativa'],
            ['Sinais', `${bio.narrativeSignals?.length ?? 0}`, 'marcas internas usadas no texto'],
            ['Anos lidos', `${narrativeFacts.seasonsTracked ?? 0}`, 'temporadas usadas como base'],
            ['Evidências', `${evidenceRows.length}`, 'fatos conectados ao texto'],
          ].map(([label, value, copy], i) => (
            <div key={label} style={{
              padding:'12px 14px',
              background:i===0?`${sc}0D`:'rgba(237,232,223,.02)',
              border:i===0?`1px solid ${sc}30`:'1px solid rgba(237,232,223,.06)',
              borderTop:`2px solid ${i===0?sc:'rgba(237,232,223,.10)'}`,
            }}>
              <div style={{ fontFamily:T.mono, fontSize:7, letterSpacing:'.24em', color:'rgba(237,232,223,.34)', textTransform:'uppercase', marginBottom:6 }}>{label}</div>
              <div style={{ fontFamily:T.display, fontSize:24, color:T.ink, lineHeight:1 }}>{value}</div>
              <div style={{ fontFamily:T.body, fontSize:12, color:T.inkDim, lineHeight:1.55, marginTop:6 }}>{copy}</div>
            </div>
          ))}
        </div>

        <div style={{
          padding:'28px 30px',
          background:`linear-gradient(135deg, ${sc}10, rgba(237,232,223,.026))`,
          border:`1px solid ${sc}30`,
          borderLeft:`5px solid ${sc}`,
          marginBottom:22,
        }}>
          <div style={{ display:'grid', gap:16 }}>
            {(fullNarrativeParagraphs.length ? fullNarrativeParagraphs : bio.paragraphs).map((p, i) => (
              <p key={i} style={{
                fontFamily:T.body,
                fontSize:i === 0 ? 17 : 15.5,
                color:i === 0 ? T.ink : T.inkDim,
                lineHeight:1.96,
                margin:0,
              }}>
                {p}
              </p>
            ))}
          </div>
          {(bio.narrativeSignals ?? []).length > 0 && (
            <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginTop:18, paddingTop:14, borderTop:'1px solid rgba(237,232,223,.08)' }}>
              {bio.narrativeSignals.map(signal => (
                <span key={signal} style={{ fontFamily:T.mono, fontSize:7, letterSpacing:'.16em', color:`${sc}CC`, textTransform:'uppercase', border:`1px solid ${sc}24`, background:`${sc}0A`, padding:'4px 7px' }}>
                  {signal.replace(/_/g, ' ')}
                </span>
              ))}
            </div>
          )}
        </div>

        <div style={{ marginTop:24 }}>
          <Sh color={sc}>Capitulos que sustentam o texto</Sh>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(2,minmax(0,1fr))', gap:10 }}>
            {(bio.chapters ?? []).slice(0, 6).map(chapter => {
              const chapterColor = toneColor[chapter.tone] ?? toneColor.neutral;
              return (
                <div key={chapter.key} style={{
                  padding:'16px 18px',
                  background:'linear-gradient(135deg, rgba(237,232,223,.03), rgba(237,232,223,.015))',
                  border:`1px solid ${chapterColor}26`,
                  borderLeft:`3px solid ${chapterColor}`,
                  clipPath:'polygon(6px 0,100% 0,calc(100% - 6px) 100%,0 100%)',
                }}>
                  <div style={{ display:'flex', justifyContent:'space-between', gap:14, alignItems:'baseline', marginBottom:8 }}>
                    <div style={{ fontFamily:T.display, fontSize:20, color:T.ink, lineHeight:1.05 }}>{chapter.title}</div>
                    <div style={{ fontFamily:T.mono, fontSize:7, color:`${chapterColor}CC`, letterSpacing:'.24em', textTransform:'uppercase', whiteSpace:'nowrap' }}>{chapter.kicker}</div>
                  </div>
                  <div style={{ fontFamily:T.body, fontSize:14, color:T.inkDim, lineHeight:1.75 }}>{chapter.text}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="upp2-scroll" style={{ flex:.8, padding:'24px 24px 34px', overflowY:'auto' }}>
        <Sh color={sc}>Evidências do Dossiê</Sh>
        <div style={{ display:'grid', gap:8, marginBottom:24 }}>
          {evidenceRows.map(([label, value, color]) => (
            <div key={label} style={{ padding:'12px 14px', border:`1px solid ${color}26`, borderLeft:`3px solid ${color}`, background:`${color}08` }}>
              <div style={{ fontFamily:T.mono, fontSize:7, color:`${color}CC`, letterSpacing:'.22em', textTransform:'uppercase', marginBottom:5 }}>{label}</div>
              <div style={{ fontFamily:T.display, fontSize:17, color:T.ink, lineHeight:1.1 }}>{value}</div>
            </div>
          ))}
          {evidenceRows.length === 0 && (
            <div style={{ fontFamily:T.body, fontSize:12, color:T.inkFaint, lineHeight:1.7 }}>A carreira ainda nao acumulou eventos suficientes para montar evidencias laterais fortes.</div>
          )}
        </div>

        <Sh color={sc}>Legado Histórico</Sh>
        <div style={{
          padding:'16px 18px',
          marginBottom:24,
          background:`linear-gradient(135deg, ${sc}14, rgba(237,232,223,.02))`,
          border:`1px solid ${sc}2D`,
          borderTop:`2px solid ${sc}`,
        }}>
          <div style={{ display:'flex', justifyContent:'space-between', gap:12, alignItems:'baseline', marginBottom:8 }}>
            <div style={{ fontFamily:T.display, fontSize:24, color:T.ink, lineHeight:1.05 }}>{bio.legacy?.label ?? 'Legado em formacao'}</div>
            <div style={{ fontFamily:T.mono, fontSize:8, color:`${sc}CC`, letterSpacing:'.22em', textTransform:'uppercase' }}>{bio.legacy?.shortTag ?? 'em aberto'}</div>
          </div>
          <div style={{ fontFamily:T.body, fontSize:14, color:T.inkDim, lineHeight:1.75 }}>{bio.legacy?.summary ?? 'A leitura historica deste jogador ainda esta em construcao.'}</div>
        </div>

        <Sh color={sc}>Marcos</Sh>
        <div style={{ display:'grid', gap:8, marginBottom:24 }}>
          {bio.milestones.map((m, i) => {
            const color = toneColor[m.tone] ?? toneColor.neutral;
            return (
              <div key={`${m.label}-${i}`} style={{
                display:'grid',
                gridTemplateColumns:'1fr auto',
                gap:14,
                alignItems:'center',
                padding:'12px 14px',
                background:'rgba(237,232,223,.02)',
                border:`1px solid ${color}26`,
                borderLeft:`3px solid ${color}`,
                clipPath:'polygon(5px 0,100% 0,calc(100% - 5px) 100%,0 100%)',
              }}>
                <div>
                  <div style={{ fontFamily:T.mono, fontSize:7, color:`${color}CC`, letterSpacing:'.24em', textTransform:'uppercase', marginBottom:4 }}>{m.label}</div>
                  <div style={{ fontFamily:T.display, fontSize:16, color:T.ink, lineHeight:1.1 }}>{m.value}</div>
                </div>
              </div>
            );
          })}
        </div>

        <Sh color={sc}>Sinais do Texto</Sh>
        <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginBottom:24 }}>
          {[...(bio.narrativeSignals ?? []), ...(bio.tags ?? [])].slice(0, 14).map(tag => (
            <span key={tag} style={{
              fontFamily:T.mono, fontSize:8, letterSpacing:'.16em', textTransform:'uppercase',
              color:`${sc}DD`, background:`${sc}12`, border:`1px solid ${sc}30`, padding:'5px 9px',
            }}>{String(tag).replace(/_/g, ' ')}</span>
          ))}
        </div>

        <Sh color={sc}>Leitura Rapida</Sh>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:24 }}>
          {[
            ['Idade', formatProfileAge(np.age) != null ? `${formatProfileAge(np.age)} anos` : '---'],
            ['Nacionalidade', np.nationality ?? '---'],
            ['Mao', np.hand ?? '---'],
            ['Tag da imprensa', np.tagline ?? 'Sem tagline'],
          ].map(([label, value]) => (
            <div key={label} style={{ padding:'12px 13px', background:'rgba(237,232,223,.02)', border:'1px solid rgba(237,232,223,.06)' }}>
              <div style={{ fontFamily:T.mono, fontSize:7, letterSpacing:'.2em', color:T.inkFaint, textTransform:'uppercase', marginBottom:5 }}>{label}</div>
              <div style={{ fontFamily:T.display, fontSize:15, color:T.ink }}>{value}</div>
            </div>
          ))}
        </div>

        <Sh color={sc}>Linha do Tempo</Sh>
        <div style={{ display:'grid', gap:8 }}>
          {[
            ['Primeiro titulo', bio.facts?.firstTitle?.name ?? 'Ainda nao venceu'],
            ['Primeiro grande titulo', bio.facts?.firstBigTitle?.name ?? 'Ainda nao tem grande trofeu'],
            ['Ultimo trofeu', bio.facts?.latestTitle?.name ?? 'Sem trofeu recente'],
            ['Melhor superficie', bio.facts?.bestSurface?.label ?? 'Sem recorte claro'],
          ].map(([label, value]) => (
            <div key={label} style={{
              padding:'12px 13px',
              background:'rgba(237,232,223,.02)',
              border:'1px solid rgba(237,232,223,.06)',
              borderLeft:`2px solid ${sc}`,
            }}>
              <div style={{ fontFamily:T.mono, fontSize:7, letterSpacing:'.2em', color:T.inkFaint, textTransform:'uppercase', marginBottom:5 }}>{label}</div>
              <div style={{ fontFamily:T.display, fontSize:15, color:T.ink }}>{value}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function BadgeCard({ badge, sc }) {
  const tier = badge.tier ?? BADGE_TIER_META.bronze;
  const pct = Math.max(0, Math.min(100, Math.round((badge.progress ?? 1) * 100)));
  const maxed = !badge.nextValue;
  const level = badge.tierIndex ?? 0;
  const ornament = [
    { wings:false, crown:false, ring:false, rays:false, pulse:false, scale:.90, title:22 },
    { wings:false, crown:false, ring:true,  rays:false, pulse:false, scale:.96, title:23 },
    { wings:true,  crown:false, ring:true,  rays:false, pulse:false, scale:1.02, title:24 },
    { wings:true,  crown:true,  ring:true,  rays:true,  pulse:true,  scale:1.08, title:25 },
    { wings:true,  crown:true,  ring:true,  rays:true,  pulse:true,  scale:1.18, title:26 },
  ][Math.max(0, Math.min(4, level))];
  const polygon = level >= 3
    ? 'polygon(50% 0, 88% 11%, 100% 44%, 86% 77%, 50% 100%, 14% 77%, 0 44%, 12% 11%)'
    : 'polygon(50% 0, 91% 17%, 100% 56%, 73% 100%, 27% 100%, 0 56%, 9% 17%)';
  return (
    <div style={{
      position:'relative', minHeight:300, overflow:'hidden', padding:'18px 16px 16px',
      border:`1px solid ${tier.color}55`,
      background:`radial-gradient(circle at 50% 0%, ${tier.color}22, transparent 44%), linear-gradient(145deg, ${tier.glow}, rgba(237,232,223,.025) 42%, rgba(0,0,0,.26))`,
      boxShadow:`0 24px 60px rgba(0,0,0,.30), inset 0 1px 0 rgba(255,255,255,.08), 0 0 ${level >= 3 ? 54 : 28}px ${tier.glow}`,
      display:'flex', flexDirection:'column', justifyContent:'space-between',
    }}>
      <div style={{ position:'absolute', inset:0, background:'linear-gradient(90deg, rgba(255,255,255,.035) 1px, transparent 1px), linear-gradient(180deg, rgba(255,255,255,.025) 1px, transparent 1px)', backgroundSize:'26px 26px', opacity: level >= 3 ? .26 : .14, pointerEvents:'none' }} />
      {ornament.rays && <div style={{ position:'absolute', inset:'18px 20px auto', height:180, background:`conic-gradient(from 0deg, transparent 0 7%, ${tier.color}24 8% 10%, transparent 11% 19%, ${tier.color}18 20% 22%, transparent 23% 100%)`, filter:`blur(${level >= 4 ? 0 : 1}px)`, opacity: level >= 4 ? .95 : .62, pointerEvents:'none' }} />}
      <div style={{ position:'absolute', right:-18, top:-22, fontFamily:T.mono, fontSize:78, fontWeight:900, color:tier.color, opacity:.08 }}>{tier.short}</div>
      <div style={{ position:'relative', display:'flex', flexDirection:'column', alignItems:'center', gap:10 }}>
        <div style={{ fontFamily:T.mono, fontSize:8, letterSpacing:'.28em', textTransform:'uppercase', color:tier.color, border:`1px solid ${tier.color}55`, padding:'6px 8px', background:`${tier.color}12` }}>{tier.label}</div>
        <div style={{ position:'relative', width:170, height:178, transform:`scale(${ornament.scale})`, filter: ornament.pulse ? `drop-shadow(0 0 34px ${tier.color}88)` : `drop-shadow(0 18px 30px rgba(0,0,0,.38))`, transition:'transform .2s' }}>
          {ornament.wings && <>
            <div style={{ position:'absolute', top:68, left: level >= 4 ? -20 : -10, width:70, height:58, background:`linear-gradient(135deg, ${tier.color}, rgba(0,0,0,.32))`, clipPath:'polygon(0 34%, 100% 0, 76% 48%, 100% 100%, 0 66%)', opacity: level >= 4 ? .98 : .78, transform:'scaleX(-1)', zIndex:1 }} />
            <div style={{ position:'absolute', top:68, right: level >= 4 ? -20 : -10, width:70, height:58, background:`linear-gradient(135deg, ${tier.color}, rgba(0,0,0,.32))`, clipPath:'polygon(0 34%, 100% 0, 76% 48%, 100% 100%, 0 66%)', opacity: level >= 4 ? .98 : .78, zIndex:1 }} />
          </>}
          {ornament.crown && <div style={{ position:'absolute', top: level >= 4 ? 0 : 10, left:'50%', width: level >= 4 ? 96 : 76, height: level >= 4 ? 48 : 38, transform:'translateX(-50%)', background:`linear-gradient(135deg, rgba(255,255,255,.26), ${tier.color} 48%, rgba(0,0,0,.26))`, clipPath:'polygon(0 100%, 14% 18%, 32% 60%, 50% 0, 68% 60%, 86% 18%, 100% 100%)', zIndex:4 }} />}
          {ornament.ring && <div style={{ position:'absolute', inset: level >= 4 ? 16 : 27, border:`1px solid ${tier.color}88`, clipPath:polygon, zIndex:5, boxShadow:`inset 0 0 22px ${tier.color}30` }} />}
          <div style={{ position:'absolute', inset: ornament.crown ? '36px 24px 6px' : '20px 28px 10px', clipPath:polygon, background:`linear-gradient(145deg, rgba(255,255,255,.32), transparent 23%), linear-gradient(135deg, ${tier.color}, rgba(0,0,0,.36))`, border:`1px solid ${tier.color}`, boxShadow:`inset 0 0 0 ${level >= 4 ? 10 : 7}px rgba(0,0,0,.16), inset 0 0 0 ${level >= 4 ? 12 : 8}px rgba(255,255,255,.08), 0 20px 44px rgba(0,0,0,.44), 0 0 ${level >= 4 ? 46 : 26}px ${tier.glow}`, zIndex:2 }} />
          <div style={{ position:'absolute', inset: ornament.crown ? '36px 24px 6px' : '20px 28px 10px', display:'flex', alignItems:'center', justifyContent:'center', zIndex:6, padding:'0 24px' }}>
            <div style={{ fontFamily:T.display, fontSize:ornament.title, lineHeight:.86, fontWeight:900, textTransform:'uppercase', color:'rgba(0,0,0,.64)', textShadow:'0 1px 0 rgba(255,255,255,.24)' }}>{badge.name}</div>
          </div>
          {level >= 4 && <div style={{ position:'absolute', inset:-8, clipPath:polygon, border:`1px solid ${tier.color}55`, opacity:.8, zIndex:0 }} />}
        </div>
      </div>
      <div style={{ position:'relative', marginTop:20, textAlign:'center' }}>
        <div style={{ fontFamily:T.mono, fontSize:8, letterSpacing:'.26em', color:'rgba(237,232,223,.38)', textTransform:'uppercase' }}>{badge.categoryLabel}</div>
        <div style={{ fontFamily:T.display, fontSize:28, fontWeight:900, lineHeight:.92, color:'#fff', textTransform:'uppercase', marginTop:8 }}>{badge.name}</div>
        <div style={{ fontFamily:T.body, fontSize:13, lineHeight:1.5, color:'rgba(237,232,223,.62)', marginTop:10 }}>{badge.description}</div>
      </div>
      <div style={{ position:'relative', marginTop:18 }}>
        <div style={{ display:'flex', justifyContent:'space-between', gap:10, alignItems:'baseline', marginBottom:8 }}>
          <div style={{ fontFamily:T.mono, fontSize:8, letterSpacing:'.22em', color:'rgba(237,232,223,.36)', textTransform:'uppercase' }}>{badge.value} {badge.unit}</div>
          <div style={{ fontFamily:T.mono, fontSize:8, color:maxed ? tier.color : 'rgba(237,232,223,.36)', letterSpacing:'.18em', textTransform:'uppercase' }}>{maxed ? 'maximo' : `${badge.nextValue}`}</div>
        </div>
        <div style={{ height:6, background:'rgba(255,255,255,.06)', border:'1px solid rgba(255,255,255,.06)', overflow:'hidden' }}>
          <div style={{ width:`${pct}%`, height:'100%', background:`linear-gradient(90deg, ${tier.color}, ${sc})`, boxShadow:`0 0 18px ${tier.color}` }} />
        </div>
      </div>
    </div>
  );
}

function TabBadges({ np, sc, tournamentResults, allPlayers = [], year = null }) {
  const badges = useMemo(() => getPlayerBadges(np, { tournamentResults, allPlayers, currentYear: year }), [np, tournamentResults, allPlayers, year]);
  const byTier = badges.reduce((acc, badge) => {
    acc[badge.tier.id] = (acc[badge.tier.id] ?? 0) + 1;
    return acc;
  }, {});

  if (!badges.length) {
    return (
      <div className="upp2-scroll" style={{ height:'100%', padding:32 }}>
        <div style={{ minHeight:420, border:'1px solid rgba(255,255,255,.08)', background:'linear-gradient(135deg, rgba(255,255,255,.035), rgba(255,255,255,.012))', display:'flex', alignItems:'center', justifyContent:'center', textAlign:'center', padding:40 }}>
          <div>
            <div style={{ width:84, height:84, margin:'0 auto 18px', borderRadius:'50%', border:`1px solid ${sc}55`, background:`radial-gradient(circle, ${sc}33, rgba(255,255,255,.02))`, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:T.mono, fontSize:24, color:sc }}>?</div>
            <div style={{ fontFamily:T.display, fontSize:38, fontWeight:900, color:'#fff', textTransform:'uppercase' }}>Galeria ainda oculta</div>
            <div style={{ maxWidth:520, margin:'10px auto 0', fontFamily:T.body, fontSize:14, lineHeight:1.6, color:'rgba(237,232,223,.58)' }}>As badges so aparecem quando o Bronze e desbloqueado. Por enquanto a carreira ainda nao revelou uma conquista oficial nessa sala.</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="upp2-scroll" style={{ height:'100%', padding:24 }}>
      <div style={{ display:'grid', gridTemplateColumns:'minmax(260px,.8fr) minmax(0,2fr)', gap:18, marginBottom:18 }}>
        <div style={{ border:`1px solid ${sc}33`, background:`linear-gradient(135deg, ${sc}18, rgba(255,255,255,.018))`, padding:20, minHeight:180 }}>
          <div style={{ fontFamily:T.mono, fontSize:8, letterSpacing:'.34em', color:sc, textTransform:'uppercase' }}>Conquistas reveladas</div>
          <div style={{ fontFamily:T.display, fontSize:56, lineHeight:.92, fontWeight:900, color:'#fff', marginTop:12 }}>{badges.length}</div>
          <div style={{ fontFamily:T.body, fontSize:13, lineHeight:1.55, color:'rgba(237,232,223,.58)', marginTop:10 }}>Esta aba mostra apenas o que ja saiu da sombra. Badge sem Bronze fica escondida para a carreira parecer descoberta, nao checklist.</div>
        </div>
        <div style={{ border:'1px solid rgba(255,255,255,.07)', background:'rgba(255,255,255,.018)', padding:20, display:'grid', gridTemplateColumns:'repeat(5, minmax(80px, 1fr))', gap:10 }}>
          {Object.values(BADGE_TIER_META).map(tier => (
            <div key={tier.id} style={{ border:`1px solid ${tier.color}33`, background:`${tier.color}10`, padding:12 }}>
              <div style={{ fontFamily:T.mono, fontSize:8, letterSpacing:'.2em', color:tier.color, textTransform:'uppercase' }}>{tier.label}</div>
              <div style={{ fontFamily:T.display, fontSize:30, fontWeight:900, color:'#fff', marginTop:6 }}>{byTier[tier.id] ?? 0}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(260px, 1fr))', gap:16 }}>
        {badges.map(badge => <BadgeCard key={badge.id} badge={badge} sc={sc} />)}
      </div>
    </div>
  );
}

// TABS CONFIG
// -----------------------------------------------------------------
const TABS = [
  { id:'overview',     name:'VISÃO GERAL',  icon:'OVR' },
  { id:'biografia',    name:'BIOGRAFIA',    icon:'BIO' },
  { id:'identidade',   name:'IDENTIDADE',   icon:'ID'  },
  { id:'jogo',         name:'JOGO',         icon:'TV'  },
  { id:'percepcoes',   name:'CIRCUITO',     icon:'PUB' },
  { id:'carreira',     name:'CARREIRA',     icon:'CAR' },
  { id:'badges',       name:'BADGES',       icon:'BDG' },
  { id:'grand_slam',   name:'GRAND SLAM',   icon:'GS'  },
  { id:'trajetoria',   name:'TRAJETÓRIA',   icon:'TRJ' },
  { id:'resultados',   name:'RESULTADOS',   icon:'RES' },
  { id:'hist_anual',   name:'HIST. ANUAL',  icon:'ANO' },
  { id:'rivalidades',  name:'RIVALIDADES',  icon:'RIV' },
  { id:'fisico',       name:'FÍSICO & DNA', icon:'DNA' },
  { id:'equipe',       name:'BANCO',        icon:'TEC' },
  { id:'financeiro',   name:'FINANCEIRO',   icon:'FIN' },
  { id:'forma',        name:'FORMA & IFR',  icon:'IFR' },
  { id:'patrocinio',   name:'PATROCÍNIO',   icon:'PAT' },
  { id:'vida',         name:'VIDA',         icon:'VID' },
  { id:'entrevistas',  name:'ENTREVISTAS',  icon:'ENT' },
];

// -----------------------------------------------------------------
// MAIN EXPORT
// -----------------------------------------------------------------
const TAB_GROUPS = [
  {
    id: 'essencia',
    name: 'Essencia',
    kicker: 'Quem ele e',
    desc: 'Biografia viva, identidade competitiva, leitura de jogo e imagem publica.',
    tabs: ['overview', 'biografia', 'identidade', 'jogo', 'percepcoes'],
  },
  {
    id: 'carreira',
    name: 'Carreira',
    kicker: 'O que construiu',
    desc: 'Linha de crescimento, conquistas, temporadas, rivalidades e memoria esportiva.',
    tabs: ['carreira', 'badges', 'grand_slam', 'trajetoria', 'resultados', 'hist_anual', 'rivalidades'],
  },
  {
    id: 'estrutura',
    name: 'Estrutura',
    kicker: 'Base da maquina',
    desc: 'Corpo, equipe, dinheiro, forma recente e patrocinios sob uma mesma lente.',
    tabs: ['fisico', 'equipe', 'financeiro', 'forma', 'patrocinio'],
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
  overview:    { group:'essencia', title:'Dossie Geral', desc:'A entrada editorial da ficha: identidade, momento, curva de carreira e atalhos para tudo o que realmente importa nesse jogador.', bullets:['momento','dna','evolucao'] },
  biografia:   { group:'essencia', title:'Biografia Oficial', desc:'Narrativa procedural em bloco unico, com carreira, vida, lesoes, rivalidades e memoria competitiva costuradas como documentario.', bullets:['narrativa','marcos','memoria'] },
  identidade:  { group:'essencia', title:'Identidade do Personagem', desc:'Perfil humano e competitivo do tenista: personalidade, fama, reputacao e sinais do que ele representa no circuito.', bullets:['personalidade','reputacao','mercado'] },
  jogo:        { group:'essencia', title:'Scout TV', desc:'Mapa visual de quadra com estilo, atributos, Marca em Quadra e o peso real dessas escolhas no comportamento do jogador.', bullets:['marca','quadra','engine'] },
  percepcoes:  { group:'essencia', title:'Olhar do Circuito', desc:'Como o resto do mundo enxerga esse nome: hype, medo, respeito, subestimacao e narrativa publica.', bullets:['mercado','narrativa','respeito'] },
  carreira:    { group:'carreira', title:'Arquivo da Carreira', desc:'Dossie historico de titulos, anos-chave, palmares, rivalidade central e memoria esportiva acumulada.', bullets:['titulos','anos-chave','legado'] },
  badges:      { group:'carreira', title:'Galeria de Badges', desc:'Conquistas de carreira reveladas apenas quando o jogador ja desbloqueou o Bronze em cada trilha.', bullets:['badges','tiers','legado'] },
  grand_slam:  { group:'carreira', title:'Memoria nos Slams', desc:'Um recorte cerimonial da carreira nos quatro majors, com leitura rapida de grandes campanhas e tempos fortes.', bullets:['slams','campanhas','recordes'] },
  trajetoria:  { group:'carreira', title:'Curva Viva', desc:'Ascensao, queda, estabilizacao, pico previsto e desenvolvimento vistos por ranking, idade, nivel e temporadas recentes.', bullets:['ranking','pico','fase'] },
  resultados:  { group:'carreira', title:'Mapa de Resultados', desc:'Volume de torneios, consistencia por categoria e a forma como o jogador performa no calendario completo.', bullets:['torneios','superficies','consistencia'] },
  hist_anual:  { group:'carreira', title:'Leitura Ano a Ano', desc:'Temporadas quebradas em recortes claros, para entender mudancas de patamar e anos fora da curva.', bullets:['temporadas','picos','quedas'] },
  rivalidades: { group:'carreira', title:'Conflitos e Espelhos', desc:'Os nomes que ajudam a definir a carreira: freguesias, duelos historicos e historias que voltam sempre.', bullets:['duelos','historias','contexto'] },
  fisico:      { group:'estrutura', title:'Fisico e DNA', desc:'Condicao corporal, carga, lesoes, tracos biologicos e tudo o que sustenta ou limita o teto competitivo.', bullets:['saude','carga','dna'] },
  equipe:      { group:'estrutura', title:'Banco Vivo', desc:'Tecnico atual, metodo, confianca, atrito, expectativa e memoria da parceria como parte real da carreira.', bullets:['tecnico','confianca','metodo'] },
  financeiro:  { group:'estrutura', title:'Pressao Financeira', desc:'Fluxo de carreira pela lente do dinheiro: ganhos, despesas, contexto economico e estabilidade.', bullets:['ganhos','pressao','planejamento'] },
  forma:       { group:'estrutura', title:'Forma Recente', desc:'Momento atual do atleta, pulsacao competitiva e sinais de alta ou baixa antes de olhar o resto da ficha.', bullets:['momento','ifr','tendencia'] },
  patrocinio:  { group:'estrutura', title:'Ecossistema Comercial', desc:'Contratos, poder de atracao e leitura comercial do nome, com foco em clareza e peso de mercado.', bullets:['contratos','sinal','historico'] },
  vida:        { group:'universo', title:'Vida Fora da Quadra', desc:'Eventos pessoais, rotina, imagem publica e a camada humana que contextualiza a carreira.', bullets:['rotina','eventos','imagem'] },
  entrevistas: { group:'universo', title:'Voz do Jogador', desc:'Como ele se comunica, quais tons aparecem sob pressao e que personagem surge diante dos microfones.', bullets:['tom','contextos','fala'] },
};

export default function DefinitivePlayerProfile({
  playerKey, playerData, onBack, onNavigate, onPlay,
  allKeys, formPoints = 0, formHistory = [],
  tournamentResults = null, rivalrySystem = null,
  allPlayers = [], rankingStore = null,
  coachPool = [], coachMarket = null, dispatch = null, year = null,
  newsEngine = null,
  sponsorPool = null, pendingOffers = [], highestPaidPlayerId = null,
  chronicleEngine = null,
  historyBook = null,
  radarFollowed = false, onToggleRadar = null,
}) {
  injectCSS();
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onBack?.();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onBack]);

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
  // A ficha pode abrir durante uma atualização de ranking/save em que a seleção
  // anterior já não existe mais. Mantém os hooks estáveis e sai limpo abaixo.
  const currentRank = np ? (rankingStore ? getPlayerRank(rankingStore, np.id) : (np.rankPosition ?? null)) : null;
  const juniorMode = np ? isJuniorPlayer(np) : false;
  const circuitLabel = juniorMode ? 'Junior' : ((np?.rankPosition ?? 999) > 64 ? 'Challenger' : 'Tour principal');
  const totalTitles = Object.values(np?.careerTitles ?? {}).reduce((sum, v) => sum + (Number(v) || 0), 0);
  const bestRank = np?.careerBest?.rank ?? np?.peakRank ?? currentRank ?? '—';
  const identityProfile = useMemo(
    () => (np ? buildPlayerIdentity(np, { surfaceKey: np?.surfaceIdentity?.surface ?? null }) : null),
    [np]
  );
  const heroFacts = [
    [juniorMode ? 'Ranking júnior' : 'Ranking atual', currentRank ? `#${currentRank}` : '—', currentRank ? (juniorMode ? 'posição atual no recorte júnior' : 'posição atual no mapa do circuito') : 'a carreira ainda não gerou posição consolidada'],
    ['Melhor ranking', bestRank !== '—' ? `#${bestRank}` : '—', bestRank !== '—' ? 'pico máximo alcançado até aqui' : 'o auge ainda não apareceu'],
    ['Títulos', `${totalTitles}`, totalTitles ? 'taças que já dão forma ao legado' : 'o currículo ainda está sendo escrito'],
    ['Arco atual', identityProfile?.form?.label ?? (np ? scoutPhaseLabel(np)?.label : null) ?? 'em leitura', identityProfile?.contradictions?.[0]?.summary ?? identityProfile?.signature?.subline ?? 'a ficha ainda está montando a narrativa central'],
  ];
  const activeMeta = TAB_META[activeTab] ?? TAB_META.identidade;
  const activeGroup = TAB_GROUPS.find(group => group.id === activeMeta.group) ?? TAB_GROUPS[0];
  const visibleTabs = TABS.filter(tab => activeGroup.tabs.includes(tab.id));
  const displayNum = idx >= 0 ? String(idx+1).padStart(2,'0') : '—';
  const tier = ovrTier(ov);
  const quickIdentityTags = [
    identityProfile?.signature?.moodTag,
    identityProfile?.signature?.formTag,
    identityProfile?.signature?.reputationTag,
    juniorMode ? 'júnior' : null,
  ].filter(Boolean);

  if (!np) return null;
  migratePlayerPersonality(np);

  return (
    <div className="upp2-root" style={{ '--sc': sc }}>
      <div className="upp2-modal">

      {/* CHROME */}
      <div className="upp2-chrome">
        <button className="upp2-chrome-btn" onClick={onBack}>? Voltar</button>
        <div style={{ width:1, height:14, background:T.line, flexShrink:0 }}/>
        <span style={{ fontFamily:T.mono, fontSize:7, letterSpacing:'.42em', textTransform:'uppercase', color:T.inkFaint }}>Ficha do Tenista</span>
        <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:7 }}>
          {onToggleRadar && <button className="upp2-chrome-btn" onClick={() => onToggleRadar(np)} style={{ color:radarFollowed ? T.gold : undefined }} title={radarFollowed ? 'Parar de acompanhar' : 'Adicionar ao Radar'}>{radarFollowed ? '◉ No Radar' : '◎ Seguir'}</button>}
        <button className="upp2-chrome-btn" disabled={!prevKey} onClick={() => prevKey && onNavigate(prevKey)}>? Ant</button>
          <span style={{ fontFamily:T.mono, fontSize:8, letterSpacing:2, color:T.inkFaint, minWidth:38, textAlign:'center' }}>{displayNum}/{String(keys.length).padStart(2,'0')}</span>
          <button className="upp2-chrome-btn" disabled={!nextKey} onClick={() => nextKey && onNavigate(nextKey)}>Próx ?</button>
          <button className="upp2-chrome-btn upp2-chrome-close" onClick={onBack} aria-label="Fechar ficha">×</button>
        </div>
      </div>

      {/* -- COMPACT HERO ----------------------------------- */}
      <div className="dpp-hero">
        <div className="dpp-hero-stripe"/>
        <div className="dpp-hero-photo">
          <HeroPhoto np={np} playerKey={playerKey} />
          <div className="dpp-photo-fade"/>
        </div>
        <div className="dpp-hero-body">
          <div className="dpp-hero-eyebrow">
            <span style={{ color:sc }}>{np.nationality}</span>
            <span style={{ color:'rgba(237,232,223,.32)' }}>· #{currentRank ?? displayNum}</span>
          </div>
          <div className="dpp-hero-name">{np.name}</div>
          <div className="dpp-hero-meta-row">
            {[formatProfileAge(np.age) != null && `${formatProfileAge(np.age)}a`, np.height && `${np.height}m`, np.weight && `${np.weight}kg`, np.hand].filter(Boolean).map((v, i, arr) => (
              <React.Fragment key={i}>
                <span>{v}</span>
                {i < arr.length-1 && <div className="dpp-meta-sep"/>}
              </React.Fragment>
            ))}
          </div>
          <div className="dpp-hero-badges">
            <span className="dpp-badge" style={{ color:sc, borderColor:`${sc}44`, background:`${sc}11` }}>{circuitLabel}</span>
            {archetype && <span className="dpp-badge" style={{ color:sc, borderColor:`${sc}33`, background:`${sc}0D` }}>{archetype.abbr}</span>}
            {alcunha && <span className="dpp-badge dpp-badge-gold">{alcunha.label}</span>}
            {quickIdentityTags.slice(0,2).map(t => <span key={t} className="dpp-badge dpp-badge-dim">{t}</span>)}
          </div>
        </div>
        <div className="dpp-hero-facts">
          {heroFacts.map(([kicker, value, copy]) => (
            <div key={kicker} className="dpp-hero-fact">
              <div className="dpp-fact-kicker">{kicker}</div>
              <div className="dpp-fact-value">{value}</div>
              <div className="dpp-fact-copy">{copy}</div>
            </div>
          ))}
        </div>
        <div className="dpp-hero-ovr">
          <div className="dpp-ovr-grade" style={{ color:tier.color }}>{tier.grade}</div>
          <div className="dpp-ovr-kicker">Nível</div>
          <div className="dpp-ovr-tier" style={{ color:tier.color }}>{tier.label}</div>
        </div>
      </div>

      {/* -- SINGLE-LEVEL NAV ------------------------------- */}
      <div className="dpp-nav">
        {TAB_GROUPS.map((group) => (
          <React.Fragment key={group.id}>
            <div className="dpp-nav-group-label">{group.kicker}</div>
            {TABS.filter(t => group.tabs.includes(t.id)).map(t => (
              <button
                key={t.id}
                className={`dpp-nav-tab${activeTab === t.id ? ' act' : ''}`}
                onClick={() => setActiveTab(t.id)}
              >
                {t.name}
              </button>
            ))}
          </React.Fragment>
        ))}
      </div>

      {/* CONTENT */}
      <div className="upp2-content" key={activeTab}>
        {activeTab==='overview'    && <ArchiveDossierOverview np={np} sc={sc} rankingStore={rankingStore} year={year} identityProfile={identityProfile} setActiveTab={setActiveTab} tournamentResults={tournamentResults} coachMarket={coachMarket} />}
        {activeTab==='biografia'   && <TabBiografia   np={np} sc={sc} tournamentResults={tournamentResults} rankingStore={rankingStore} rivalrySystem={rivalrySystem} year={year} />}
        {activeTab==='identidade'  && <TabIdentidade  np={np} sc={sc} identityProfile={identityProfile} />}
        {activeTab==='jogo'        && <TabJogo        np={np} sc={sc} potCat={potCat} arc={arc} year={year} />}
        {activeTab==='percepcoes'  && <TabPercepcoes  np={np} sc={sc} year={year} tournamentResults={tournamentResults} allPlayers={allPlayers} />}
        {activeTab==='carreira'    && <TabCarreira    np={np} sc={sc} tournamentResults={tournamentResults} chronicleEngine={chronicleEngine} historyBook={historyBook} rivalrySystem={rivalrySystem} allPlayers={allPlayers} year={year} />}
        {activeTab==='badges'      && <TabBadges      np={np} sc={sc} tournamentResults={tournamentResults} allPlayers={allPlayers} year={year} />}
        {activeTab==='grand_slam'  && <TabGrandSlam   np={np} sc={sc} tournamentResults={tournamentResults} />}
        {activeTab==='trajetoria'  && <TabTrajetoria  np={np} sc={sc} rankingStore={rankingStore} year={year} />}
        {activeTab==='resultados'  && <TabResultados  np={np} sc={sc} tournamentResults={tournamentResults} />}
        {activeTab==='hist_anual'  && <TabHistAnual   np={np} sc={sc} tournamentResults={tournamentResults} />}
        {activeTab==='rivalidades' && <TabRivalidades np={np} sc={sc} rivalrySystem={rivalrySystem} allPlayers={allPlayers} />}
        {activeTab==='fisico'      && <TabFisicoDNA   np={np} sc={sc} tournamentResults={tournamentResults} />}
        {activeTab==='equipe'      && <TabEquipe      np={np} sc={sc} coachMarket={coachMarket} year={year} />}
        {activeTab==='financeiro'  && <TabFinanceiro  np={np} sc={sc} />}
        {activeTab==='forma'       && <TabFormaRecente np={np} sc={sc} allPlayers={allPlayers} newsEngine={newsEngine} rivalrySystem={rivalrySystem} />}
        {activeTab==='patrocinio'  && <TabPatrocinio   np={np} sc={sc} sponsorPool={sponsorPool} year={year} highestPaidPlayerId={highestPaidPlayerId} pendingOffers={pendingOffers} />}
        {activeTab==='vida'        && <TabVida         np={migratePlayerLifeData(np)} sc={sc} />}
        {activeTab==='entrevistas' && <TabEntrevistas  np={np} sc={sc} rivalrySystem={rivalrySystem} allPlayers={allPlayers} tournamentResults={tournamentResults} />}
      </div>

      </div>
    </div>
  );
}

// Re-exports para compatibilidade
export { AttrRow, CatBlock };
