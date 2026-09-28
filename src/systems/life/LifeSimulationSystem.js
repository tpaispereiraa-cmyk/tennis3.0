/**
 * LifeSimulationSystem
 * ------------------------------------------------------------------
 * Camada viva acima do catálogo de eventos. Eventos são gatilhos; situações
 * são estados temporários que consomem meses e alteram a carreira de verdade.
 * O contrato é orientado a dados para que novos arcos possam ser incluídos
 * sem mudar o pulso mensal nem os saves já existentes.
 */

import { ensurePropertyPortfolio, getPropertyLifeEffects } from './LifePropertySystem.js';

const VERSION = 1;
const MAX_ACTIVE_SITUATIONS = 5;
const MAX_HISTORY = 48;

const LIFESTYLES = {
  FOCUSED_PRO: { label: 'Profissional obcecado', priorities: ['TRAINING', 'RECOVERY'], color: '#58D68D' },
  FAMILY_ANCHOR: { label: 'Família como âncora', priorities: ['FAMILY', 'RECOVERY'], color: '#A78BFA' },
  COMMERCIAL_STAR: { label: 'Estrela comercial', priorities: ['COMMERCIAL', 'TRAINING'], color: '#F59E0B' },
  PRIVATE_BALANCER: { label: 'Equilíbrio reservado', priorities: ['RECOVERY', 'FAMILY'], color: '#60A5FA' },
  SOCIAL_FREE_SPIRIT: { label: 'Espírito livre', priorities: ['SOCIAL', 'COMMERCIAL'], color: '#F472B6' },
  LEGACY_BUILDER: { label: 'Construtor de legado', priorities: ['TRAINING', 'FAMILY'], color: '#E8C84A' },
};

const SITUATION_DEFS = {
  RELATIONSHIP_TURBULENCE: { label: 'Turbulência afetiva', months: [3, 7], effects: { matchFocus: -2, recovery: -1, pressure: 7, injuryRisk: 3 } },
  FAMILY_GRIEF: { label: 'Luto familiar', months: [2, 5], effects: { matchFocus: -3, recovery: -2, pressure: 6, injuryRisk: 4 } },
  NEW_FAMILY_CHAPTER: { label: 'Novo capítulo familiar', months: [3, 6], effects: { matchFocus: -1, recovery: -1, support: 8, commercial: 2 } },
  MENTAL_RESET: { label: 'Reconstrução mental', months: [2, 5], effects: { matchFocus: -1, recovery: 2, pressure: -8, injuryRisk: -2 } },
  BURNOUT_CYCLE: { label: 'Ciclo de burnout', months: [3, 8], effects: { matchFocus: -3, recovery: -3, pressure: 8, injuryRisk: 6 } },
  COMMERCIAL_OVERLOAD: { label: 'Agenda comercial pesada', months: [2, 6], effects: { matchFocus: -2, recovery: -1, pressure: 7, commercial: 10 } },
  BUSINESS_EXPANSION: { label: 'Expansão de negócios', months: [4, 9], effects: { matchFocus: -1, recovery: -1, commercial: 7, finance: 2 } },
  PUBLIC_STORM: { label: 'Tempestade pública', months: [2, 6], effects: { matchFocus: -3, pressure: 14, commercial: -8, injuryRisk: 2 } },
  WELLNESS_REBUILD: { label: 'Rotina de recuperação', months: [3, 7], effects: { matchFocus: 1, recovery: 4, pressure: -3, injuryRisk: -4 } },
  PURPOSE_PROJECT: { label: 'Projeto de propósito', months: [4, 10], effects: { matchFocus: 1, support: 4, pressure: 1, commercial: 4 } },
  CAREER_CROSSROADS: { label: 'Encruzilhada de carreira', months: [2, 5], effects: { matchFocus: -2, pressure: 7, recovery: -1 } },
};

const EVENT_TO_SITUATION = {
  SEPARATION: 'RELATIONSHIP_TURBULENCE', DIVORCE: 'RELATIONSHIP_TURBULENCE', AFFAIR_RUMOR: 'RELATIONSHIP_TURBULENCE',
  FAMILY_LOSS: 'FAMILY_GRIEF', CHILD_BORN: 'NEW_FAMILY_CHAPTER', TWINS_BORN: 'NEW_FAMILY_CHAPTER', ADOPTION: 'NEW_FAMILY_CHAPTER',
  MENTAL_HEALTH_BREAK: 'MENTAL_RESET', THERAPY_PUBLIC: 'MENTAL_RESET', BURNOUT_WARNING: 'BURNOUT_CYCLE', HEALTH_SCARE: 'BURNOUT_CYCLE',
  BRAND_LAUNCH: 'COMMERCIAL_OVERLOAD', COMMERCIAL_PRESSURE: 'COMMERCIAL_OVERLOAD', WELLNESS_BRAND: 'COMMERCIAL_OVERLOAD',
  TECH_STARTUP: 'BUSINESS_EXPANSION', RESTAURANT_OPENING: 'BUSINESS_EXPANSION', APP_LAUNCH: 'BUSINESS_EXPANSION', SPORTS_OWNERSHIP: 'BUSINESS_EXPANSION',
  CONTROVERSIAL_STATEMENT: 'PUBLIC_STORM', DOPING_ALLEGATION: 'PUBLIC_STORM', TAX_EVASION: 'PUBLIC_STORM', SUSPENSION: 'PUBLIC_STORM', SOCIAL_MEDIA_MELTDOWN: 'PUBLIC_STORM',
  DIET_REVOLUTION: 'WELLNESS_REBUILD', SLEEP_PROTOCOL: 'WELLNESS_REBUILD', ALTITUDE_CAMP: 'WELLNESS_REBUILD', NO_PHONE_WEEK: 'WELLNESS_REBUILD', SOBRIETY_JOURNEY: 'WELLNESS_REBUILD',
  FOUNDATION_LAUNCH: 'PURPOSE_PROJECT', BIG_DONATION: 'PURPOSE_PROJECT', SCHOOL_OPENING: 'PURPOSE_PROJECT', CHARITY_TOURNAMENT: 'PURPOSE_PROJECT',
  CAREER_DOUBT: 'CAREER_CROSSROADS', RANKING_CRISIS: 'CAREER_CROSSROADS', RETIREMENT_THREAT: 'CAREER_CROSSROADS', EARLY_PEAK_LAMENT: 'CAREER_CROSSROADS',
};

const CATEGORY_TO_SITUATION = {
  PERSONAL: 'NEW_FAMILY_CHAPTER', HOME: 'BUSINESS_EXPANSION', SOCIAL: 'PURPOSE_PROJECT', BUSINESS: 'BUSINESS_EXPANSION',
  MEDIA: 'COMMERCIAL_OVERLOAD', CONTROVERSY: 'PUBLIC_STORM', COMMUNITY: 'PURPOSE_PROJECT', SPIRITUAL: 'MENTAL_RESET',
  CAREER: 'CAREER_CROSSROADS', WELLNESS: 'WELLNESS_REBUILD',
};

function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
function hash(value = '') { let n = 2166136261; for (const c of String(value)) { n ^= c.charCodeAt(0); n = Math.imul(n, 16777619); } return n >>> 0; }
function unit(seed, salt) { return (hash(`${seed}:${salt}`) % 10000) / 10000; }
function monthKey(date) { return `${date?.year ?? 2025}-${String(date?.month ?? 1).padStart(2, '0')}`; }

function inferLifestyle(player) {
  const image = player.lifeData?.publicImage?.id;
  const family = player.lifeData?.personal?.familyPlan?.id;
  const nightlife = String(player.lifeData?.social?.nightlife?.id ?? '').toUpperCase();
  const market = player.personality?.marketability?.score ?? 45;
  if (family === 'FAMILY_DREAM' || player.lifeData?.personal?.children?.has) return 'FAMILY_ANCHOR';
  if (image === 'ENTREPRENEUR' || image === 'TRENDSETTER' || market >= 76) return 'COMMERCIAL_STAR';
  if (nightlife.includes('HIGH') || player.personality?.pressPersona?.id === 'CONFRONTATIONAL') return 'SOCIAL_FREE_SPIRIT';
  if (image === 'LOW_PROFILE' || image === 'PHILOSOPHER') return 'PRIVATE_BALANCER';
  if ((player.personality?.competitiveArchetype?.id ?? '') === 'PERFECTIONIST') return 'FOCUSED_PRO';
  return 'LEGACY_BUILDER';
}

function makeProfile(player) {
  const seed = player.id ?? player.name ?? 'life';
  const lifestyleId = inferLifestyle(player);
  return {
    lifestyleId,
    privacyNeed: Math.round(28 + unit(seed, 'privacy') * 62),
    ambition: Math.round(36 + unit(seed, 'ambition') * 60),
    commercialAppetite: Math.round(22 + unit(seed, 'commercial') * 68),
    familyPriority: Math.round(24 + unit(seed, 'family') * 70),
    recoveryDiscipline: Math.round(30 + unit(seed, 'recovery') * 62),
    riskTolerance: Math.round(24 + unit(seed, 'risk') * 68),
  };
}

export function ensureLifeSimulation(player, date = { year: 2025, month: 1 }) {
  if (!player) return player;
  player = ensurePropertyPortfolio(player);
  const existing = player.lifeSimulation ?? {};
  const profile = { ...makeProfile(player), ...(existing.profile ?? {}) };
  return {
    ...player,
    lifeSimulation: {
      version: VERSION,
      profile,
      activeSituations: Array.isArray(existing.activeSituations) ? existing.activeSituations.slice(-MAX_ACTIVE_SITUATIONS) : [],
      monthlyDecisions: Array.isArray(existing.monthlyDecisions) ? existing.monthlyDecisions.slice(-18) : [],
      situationHistory: Array.isArray(existing.situationHistory) ? existing.situationHistory.slice(-MAX_HISTORY) : [],
      financialLedger: Array.isArray(existing.financialLedger) ? existing.financialLedger.slice(-24) : [],
      currentEffects: existing.currentEffects ?? { matchFocus: 0, recovery: 0, pressure: 0, injuryRisk: 0, commercial: 0, support: 0, finance: 0 },
      lastProcessedMonth: existing.lastProcessedMonth ?? null,
      createdAt: existing.createdAt ?? { year: date.year, month: date.month },
    },
  };
}

function chooseMonthlyDecision(player, simulation, date) {
  const profile = simulation.profile;
  const active = simulation.activeSituations;
  const key = monthKey(date);
  let focus = LIFESTYLES[profile.lifestyleId]?.priorities?.[0] ?? 'TRAINING';
  if (active.some(s => s.type === 'BURNOUT_CYCLE' || s.type === 'MENTAL_RESET')) focus = 'RECOVERY';
  else if (active.some(s => s.type === 'NEW_FAMILY_CHAPTER' || s.type === 'FAMILY_GRIEF')) focus = 'FAMILY';
  else if (active.some(s => s.type === 'PUBLIC_STORM')) focus = profile.privacyNeed >= 55 ? 'RECOVERY' : 'COMMERCIAL';
  else if (unit(player.id ?? player.name, key) > .72) focus = LIFESTYLES[profile.lifestyleId]?.priorities?.[1] ?? focus;
  const labels = { TRAINING: 'protegeu a rotina de treino', RECOVERY: 'priorizou recuperação e silêncio', FAMILY: 'reservou energia para a vida pessoal', COMMERCIAL: 'aceitou compromissos comerciais', SOCIAL: 'abriu espaço para vida social' };
  return { id: `${key}:${focus}`, month: date.month, year: date.year, focus, label: labels[focus] ?? focus };
}

function situationFromEvent(event, player, date) {
  const type = EVENT_TO_SITUATION[event.type] ?? CATEGORY_TO_SITUATION[event.category] ?? null;
  if (!type || !SITUATION_DEFS[type]) return null;
  const def = SITUATION_DEFS[type];
  const seed = `${player.id}:${event.type}:${event.dateKey ?? monthKey(date)}`;
  const months = def.months[0] + Math.floor(unit(seed, 'duration') * (def.months[1] - def.months[0] + 1));
  const intensity = clamp(Math.round(48 + Math.abs(event.marketImpact ?? 0) * 4 + unit(seed, 'intensity') * 36), 35, 95);
  return {
    id: `life:${event.type}:${event.dateKey ?? monthKey(date)}`,
    type,
    sourceEvent: event.type,
    label: def.label,
    startedAt: { year: date.year, month: date.month },
    monthsRemaining: months,
    initialMonths: months,
    intensity,
    effects: def.effects,
  };
}

function aggregateEffects(situations, decision, player) {
  const total = { matchFocus: 0, recovery: 0, pressure: 0, injuryRisk: 0, commercial: 0, support: 0, finance: 0 };
  for (const situation of situations) {
    const factor = (situation.intensity ?? 60) / 65;
    for (const [key, value] of Object.entries(situation.effects ?? {})) total[key] = (total[key] ?? 0) + value * factor;
  }
  const routine = {
    TRAINING: { matchFocus: 1.3, recovery: -0.5, injuryRisk: 0.5 },
    RECOVERY: { recovery: 1.8, pressure: -1.1, injuryRisk: -1.2 },
    FAMILY: { support: 1.4, matchFocus: -0.35, pressure: -0.5 },
    COMMERCIAL: { commercial: 2.2, pressure: 1.1, matchFocus: -0.55 },
    SOCIAL: { support: 0.45, matchFocus: -0.8, recovery: -0.45 },
  }[decision.focus] ?? {};
  for (const [key, value] of Object.entries(routine)) total[key] = (total[key] ?? 0) + value;
  // A casa principal também é uma escolha de carreira: um refúgio ajuda a
  // recuperar, uma base urbana amplia a imagem, uma base de treino dá foco.
  for (const [key, value] of Object.entries(getPropertyLifeEffects(player))) total[key] = (total[key] ?? 0) + value;
  return Object.fromEntries(Object.entries(total).map(([key, value]) => [key, Math.round(clamp(value, -12, 12) * 10) / 10]));
}

/** Executa o mês de vida para todos os atletas; recebe eventos já rolados no mês. */
export function processMonthlyLifeSimulation(players = [], date = { year: 2025, month: 1 }, eventsByPlayer = {}) {
  const key = monthKey(date);
  const events = [];
  const updatedPlayers = players.map(raw => {
    let player = ensureLifeSimulation(raw, date);
    const sim = player.lifeSimulation;
    if (sim.lastProcessedMonth === key) return player;

    const history = [...sim.situationHistory];
    const continuing = [];
    for (const situation of sim.activeSituations) {
      const monthsRemaining = (situation.monthsRemaining ?? 1) - 1;
      if (monthsRemaining > 0) continuing.push({ ...situation, monthsRemaining });
      else history.push({ ...situation, resolvedAt: { year: date.year, month: date.month }, resolution: 'NATURAL_RESOLUTION' });
    }
    const existingIds = new Set(continuing.map(situation => situation.id));
    const newSituations = (eventsByPlayer[player.id] ?? [])
      .map(event => situationFromEvent(event, player, date))
      .filter(Boolean)
      .filter(situation => !existingIds.has(situation.id));
    for (const situation of newSituations) {
      events.push({ type: 'LIFE_SITUATION_STARTED', playerId: player.id, playerName: player.name, situationType: situation.type, label: situation.label, date, intensity: situation.intensity });
    }
    const activeSituations = [...continuing, ...newSituations].slice(-MAX_ACTIVE_SITUATIONS);
    const decision = chooseMonthlyDecision(player, { ...sim, activeSituations }, date);
    const currentEffects = aggregateEffects(activeSituations, decision, player);
    const physicalCondition = typeof player.physicalCondition === 'number'
      ? clamp(Math.round(player.physicalCondition + currentEffects.recovery * .35), 20, 96)
      : player.physicalCondition;
    const commercialDelta = Math.round(currentEffects.commercial * .12);
    const financeDelta = Math.round((currentEffects.finance ?? 0) * 750 + (decision.focus === 'COMMERCIAL' ? 180 : 0));
    const marketability = player.personality?.marketability
      ? clamp((player.personality.marketability.score ?? 30) + commercialDelta, 0, 100)
      : null;
    return {
      ...player,
      ...(physicalCondition == null ? {} : { physicalCondition }),
      finance: player.finance && financeDelta !== 0 ? {
        ...player.finance,
        budget: (player.finance.budget ?? 0) + financeDelta,
        careerBudgetNet: (player.finance.careerBudgetNet ?? 0) + financeDelta,
        lifeEarnings: (player.finance.lifeEarnings ?? 0) + financeDelta,
      } : player.finance,
      personality: marketability == null ? player.personality : { ...player.personality, marketability: { ...player.personality.marketability, score: marketability } },
      lifeSimulation: {
        ...sim,
        activeSituations,
        situationHistory: history.slice(-MAX_HISTORY),
        monthlyDecisions: [...sim.monthlyDecisions, decision].slice(-18),
        financialLedger: [...(sim.financialLedger ?? []), { date: { year: date.year, month: date.month }, amount: financeDelta, source: decision.focus }].slice(-24),
        currentEffects,
        lastProcessedMonth: key,
      },
    };
  });
  return { players: updatedPlayers, events };
}

/** Modificadores transitórios consumidos pela simulação de partidas. */
export function getLifeMatchModifiers(player) {
  const life = player?.lifeSimulation?.currentEffects ?? {};
  const shock = player?.circuitShock?.currentEffects ?? {};
  const effects = Object.fromEntries(['matchFocus', 'pressure', 'recovery', 'injuryRisk', 'support'].map(key => [key, Number(life[key] ?? 0) + Number(shock[key] ?? 0)]));
  return {
    mentalidade: Math.round(clamp((effects.matchFocus ?? 0) - (effects.pressure ?? 0) * .16 + (effects.support ?? 0) * .10, -4, 4)),
    regularidade: Math.round(clamp((effects.matchFocus ?? 0) * .7 - (effects.pressure ?? 0) * .14, -4, 4)),
    resistencia: Math.round(clamp((effects.recovery ?? 0) * .7 - (effects.injuryRisk ?? 0) * .18, -3, 3)),
    injuryRisk: effects.injuryRisk ?? 0,
  };
}

export function describeLifeSimulation(player) {
  const sim = player?.lifeSimulation;
  if (!sim) return null;
  const lifestyle = LIFESTYLES[sim.profile?.lifestyleId] ?? LIFESTYLES.LEGACY_BUILDER;
  return { lifestyle, decision: sim.monthlyDecisions?.at(-1) ?? null, activeSituations: sim.activeSituations ?? [], effects: sim.currentEffects ?? {} };
}
