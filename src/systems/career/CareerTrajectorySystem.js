/**
 * CareerTrajectorySystem.js
 * ------------------------------------------------------------------
 * DNA persistente da trajetória de carreira.
 *
 * Esta primeira versão não altera atributos, resultados ou ovrTarget.
 * Ela apenas estabelece os fatores que os próximos patches vão usar para
 * explicar por que dois jogadores com o mesmo potencial podem viver
 * carreiras completamente diferentes.
 */

import { getAgeAtDate, normalizeUniverseDate } from '../season/UniverseTimeSystem.js';

export const CAREER_TRAJECTORY_VERSION = 1;

const MIN_SCORE = 20;
const MAX_SCORE = 95;
const ARC_WINDOW_AGES = {
  EARLY_BLOOMER: [18, 23],
  VOLATILE: [20, 26],
  EXPLOSIVE: [21, 27],
  LATE_BLOOMER: [27, 33],
  STEADY: [25, 31],
};

function clamp(value, min = MIN_SCORE, max = MAX_SCORE) {
  return Math.max(min, Math.min(max, Math.round(Number(value) || 0)));
}

function hashString(value = '') {
  let hash = 2166136261;
  for (let index = 0; index < String(value).length; index += 1) {
    hash ^= String(value).charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seededUnit(seed, salt) {
  const hash = hashString(`${seed}:${salt}`);
  return (hash % 10000) / 10000;
}

function seededScore(seed, salt, center, spread = 14) {
  return clamp(center + (seededUnit(seed, salt) - 0.5) * spread * 2);
}

function playerAge(player, date) {
  return Math.max(14, getAgeAtDate(player, normalizeUniverseDate(date, 2025)));
}

/**
 * peakAge é idade, não ano. Alguns saves muito antigos gravaram um ano
 * absoluto; aceitamos ambos e normalizamos no primeiro contato seguro.
 */
export function normalizeCareerPeakAge(player, fallback = 26) {
  const raw = Number(player?.peakAge);
  if (!Number.isFinite(raw)) return fallback;
  const ageValue = raw > 100 && Number.isFinite(Number(player?.birthYear))
    ? raw - Number(player.birthYear)
    : raw;
  return Math.max(16, Math.min(45, Math.round(ageValue)));
}

function readAttr(attrs, ...keys) {
  for (const key of keys) {
    const value = Number(attrs?.[key]);
    if (Number.isFinite(value)) return value;
  }
  return 55;
}

function careerPhase(player, year) {
  const age = playerAge(player, year);
  const peakAgeAt = normalizeCareerPeakAge(player, null);

  if (peakAgeAt != null && age < peakAgeAt - 3) return 'FORMATIVE';
  if (peakAgeAt != null && age <= peakAgeAt + 1) return 'ASCENDING';
  if (peakAgeAt != null && age <= peakAgeAt + 4) return 'PEAK_WINDOW';
  if (peakAgeAt != null) return 'VETERAN';

  const [startAge, endAge] = ARC_WINDOW_AGES[player?.developmentStyle ?? 'STEADY'] ?? ARC_WINDOW_AGES.STEADY;
  if (age < startAge) return 'FORMATIVE';
  if (age <= endAge) return 'PEAK_WINDOW';
  return 'VETERAN';
}

function buildWindow(player, year) {
  const age = playerAge(player, year);
  const style = player?.developmentStyle ?? 'STEADY';
  const [startAge, endAge] = ARC_WINDOW_AGES[style] ?? ARC_WINDOW_AGES.STEADY;
  return {
    arcId: style,
    startAge,
    endAge,
    currentAge: age,
    phase: careerPhase(player, year),
  };
}

function buildBaseline(player, year, source) {
  const attrs = player?.attrs ?? {};
  const seed = player?.id ?? `${player?.name ?? 'player'}:${year}`;
  const endurance = readAttr(attrs, 'resistencia', 'endurance');
  const recovery = readAttr(attrs, 'recuperacao', 'recovery');
  const mental = readAttr(attrs, 'mentalidade', 'mental');
  const regularity = readAttr(attrs, 'regularidade', 'consistency');
  const competitive = competitiveArchetypeId(player);
  const arc = player?.developmentStyle ?? 'STEADY';

  const professionalismBias = competitive === 'PERFECTIONIST' ? 7 : competitive === 'WORKHORSE' ? 8 : 0;
  const resilienceBias = competitive === 'COMEBACK_KID' ? 9 : competitive === 'ICE_COLD' ? 5 : 0;
  const stabilityBias = arc === 'VOLATILE' ? -13 : arc === 'STEADY' ? 8 : arc === 'LATE_BLOOMER' ? 5 : 0;
  const ambitionBias = ['EARLY_BLOOMER', 'EXPLOSIVE', 'VOLATILE'].includes(arc) ? 6 : 0;

  return {
    version: CAREER_TRAJECTORY_VERSION,
    source,
    establishedYear: year,
    realization: seededScore(seed, 'realization', 67, 11),
    professionalism: seededScore(seed, 'professionalism', 50 + ((endurance + recovery) - 110) * 0.18 + professionalismBias, 15),
    resilience: seededScore(seed, 'resilience', 50 + ((mental + regularity) - 110) * 0.18 + resilienceBias, 15),
    stability: seededScore(seed, 'stability', 51 + ((regularity + mental) - 110) * 0.16 + stabilityBias, 15),
    ambition: seededScore(seed, 'ambition', 52 + ambitionBias, 16),
    window: buildWindow(player, year),
    history: [{ year, type: 'BASELINE_ESTABLISHED', source }],
  };
}

function competitiveArchetypeId(player) {
  const archetype = player?.personality?.competitiveArchetype;
  return typeof archetype === 'string' ? archetype : archetype?.id ?? null;
}

function personalityGrowthFactor(player) {
  const trajectory = player?.careerTrajectory;
  const archetype = competitiveArchetypeId(player);
  const stability = trajectory?.stability ?? 50;
  const resilience = trajectory?.resilience ?? 50;
  const stableBase = 1 + ((stability - 50) * 0.0011) + ((resilience - 50) * 0.0005);
  const archetypeBonus = {
    PERFECTIONIST: 0.018,
    WARRIOR: 0.022,
    TACTICIAN: 0.018,
    PREDATOR: 0.014,
    DREAMER: 0.010,
    ARTIST: 0.000,
    REBEL: -0.008,
  }[archetype] ?? 0;
  return Math.max(0.94, Math.min(1.07, stableBase + archetypeBonus));
}

function personalitySeasonResponse(player, context) {
  const archetype = competitiveArchetypeId(player);
  const trajectory = player.careerTrajectory;
  const wins = Number(context.seasonMetrics?.wins ?? 0);
  const finals = Number(context.seasonMetrics?.finals ?? 0);
  const rank = Number(player.rankPosition ?? 999);
  const titleType = context.titleType ?? null;
  const mood = player?.personality?.currentState?.mood ?? 'HUNGRY';
  const pressure = Number(player?.personality?.currentState?.pressureLevel ?? 20);
  const poorSeason = !titleType && finals === 0 && (
    (rank <= 25 && wins <= 2) ||
    (rank <= 80 && wins === 0)
  );

  let delta = 0;
  let reason = null;
  if (titleType) {
    delta += ({ PERFECTIONIST: 1, WARRIOR: 1, TACTICIAN: 1, PREDATOR: 2, DREAMER: 1, ARTIST: 1, REBEL: 0 }[archetype] ?? 0);
    reason = 'conquista absorvida pela identidade competitiva';
  } else if (poorSeason) {
    delta += ({ PERFECTIONIST: -2, PREDATOR: -2, TACTICIAN: -1, ARTIST: -1, REBEL: -1, DREAMER: 0, WARRIOR: 0 }[archetype] ?? -1);
    if (trajectory.resilience >= 72) delta += 1;
    if (trajectory.resilience <= 36) delta -= 1;
    if (pressure >= 70 && ['PERFECTIONIST', 'PREDATOR'].includes(archetype)) delta -= 1;
    reason = 'resposta a uma temporada abaixo do padrão';
  } else if (!titleType && ['CRISIS', 'FRUSTRATED', 'BITTER'].includes(mood)) {
    delta += archetype === 'WARRIOR' || archetype === 'DREAMER' ? 1 : -1;
    reason = 'resposta ao estado emocional da carreira';
  }

  return { delta: Math.max(-3, Math.min(2, delta)), reason, archetype, poorSeason };
}

function injurySeason(entry) {
  return Number(entry?.season ?? entry?.year ?? -999);
}

function healthGrowthFactor(player) {
  const condition = Number(player?.physicalCondition ?? 82);
  const burden = Number(player?.injuryBurden?.score ?? 0);
  const activeGrade = Number(player?.injury?.grade ?? 0);
  let factor = condition < 52 ? 0.86 : condition < 65 ? 0.92 : condition < 78 ? 0.97 : 1;
  if (burden >= 60) factor *= 0.91;
  else if (burden >= 30) factor *= 0.95;
  else if (burden >= 10) factor *= 0.98;
  if (activeGrade >= 2) factor *= 0.78;
  else if (activeGrade === 1) factor *= 0.90;
  return Math.max(0.68, Math.min(1.02, factor));
}

function healthSeasonResponse(player, year, context) {
  const trajectory = player.careerTrajectory;
  const history = player.injuryHistory ?? [];
  const currentInjuries = history.filter(entry => injurySeason(entry) === year);
  const recentInjuries = history.filter(entry => injurySeason(entry) >= year - 2);
  const severity = currentInjuries.reduce((sum, entry) => sum + ({ 1: 1, 2: 2, 3: 4 }[entry.grade] ?? 0), 0);
  const types = new Map();
  for (const entry of recentInjuries) types.set(entry.type, (types.get(entry.type) ?? 0) + 1);
  const recurrent = [...types.values()].some(count => count >= 2);
  const condition = Number(player.physicalCondition ?? 82);
  const burden = Number(player.injuryBurden?.score ?? 0);
  const load = Number(context.seasonMetrics?.tournamentsPlayed ?? 0);
  let delta = 0;
  const reasons = [];

  if (severity > 0) {
    delta -= severity >= 4 ? 3 : severity >= 2 ? 2 : 1;
    reasons.push('lesão na temporada');
  }
  if (recurrent) {
    delta -= 1;
    reasons.push('recorrência física');
  }
  if (condition < 62) {
    delta -= 1;
    reasons.push('condição física baixa');
  }
  if (load >= 30) {
    delta -= 2;
    reasons.push('calendário excessivo');
  } else if (load >= 24 && condition < 76) {
    delta -= 1;
    reasons.push('carga alta sem recuperação suficiente');
  }
  if (!severity && recentInjuries.length > 0 && condition >= 84 && burden <= 20) {
    delta += 1;
    reasons.push('retorno físico sustentável');
  }

  return {
    delta: Math.max(-5, Math.min(1, delta)),
    reason: reasons.join(' + ') || null,
    load,
    severity,
  };
}

function coachTrajectoryFactor(player, year) {
  const coaching = player?.coaching;
  if (!coaching?.activeCoachId) return 1;
  const alignment = Number(coaching.alignment ?? 50);
  const trust = Number(coaching.trust ?? 50);
  const confidence = Number(coaching.confidence ?? 50);
  const friction = Number(coaching.friction ?? 30);
  const duration = Math.max(0, year - Number(coaching.startYear ?? year));
  const fit = alignment * 0.34 + trust * 0.28 + confidence * 0.22 + (100 - friction) * 0.16;
  let factor = 1 + (fit - 50) * 0.0013;
  if (duration === 0) factor *= 0.975;
  if (duration >= 2 && fit >= 70) factor *= 1.025;
  if (friction >= 76) factor *= 0.94;
  return Math.max(0.88, Math.min(1.08, factor));
}

function coachSeasonResponse(player, year) {
  const coaching = player?.coaching;
  if (!coaching?.activeCoachId) return { delta: 0, reason: null, coachId: null };
  const trajectory = player.careerTrajectory;
  const alignment = Number(coaching.alignment ?? 50);
  const trust = Number(coaching.trust ?? 50);
  const confidence = Number(coaching.confidence ?? 50);
  const friction = Number(coaching.friction ?? 30);
  const duration = Math.max(0, year - Number(coaching.startYear ?? year));
  const fit = alignment * 0.34 + trust * 0.28 + confidence * 0.22 + (100 - friction) * 0.16;
  const coachId = coaching.activeCoachId;
  const history = trajectory.history ?? [];
  const hasEvent = (type) => history.some(entry => entry.type === type && entry.coachId === coachId);

  if (Number(coaching.startYear) === year && year > Number(trajectory.establishedYear ?? year) && !hasEvent('COACH_ADAPTATION')) {
    return { delta: -1, reason: 'período de adaptação após troca de técnico', coachId };
  }
  if (duration >= 2 && fit >= 70 && !hasEvent('COACH_PARTNERSHIP_VALIDATED')) {
    return { delta: 1, reason: 'parceria técnica consolidada e bem encaixada', coachId };
  }
  if (fit < 38 || friction >= 80) {
    return { delta: friction >= 88 ? -2 : -1, reason: 'atrito prolongado com a equipe técnica', coachId };
  }
  return { delta: 0, reason: null, coachId };
}

/**
 * Cria o DNA da trajetória para novos atletas.
 * O valor é deterministicamente variado pelo id: não há nova rolagem após
 * criar/carregar o atleta, mesmo antes de ele ser salvo.
 */
export function createCareerTrajectory(player, year = 2025, source = 'NEW_PLAYER') {
  return buildBaseline(player, year, source);
}

/**
 * Garante retrocompatibilidade para qualquer jogador vindo de save antigo.
 * Nenhum dado já existente é descartado; apenas normalizamos o contrato.
 */
export function ensureCareerTrajectory(player, year = 2025, source = 'LEGACY_MIGRATION') {
  if (!player) return player;
  const normalizedPeakAge = normalizeCareerPeakAge(player);
  const normalizedPlayer = normalizedPeakAge === player.peakAge
    ? player
    : { ...player, peakAge: normalizedPeakAge };
  const existing = normalizedPlayer.careerTrajectory;
  if (!existing || typeof existing !== 'object') {
    return { ...normalizedPlayer, careerTrajectory: createCareerTrajectory(normalizedPlayer, year, source) };
  }

  const baseline = buildBaseline(normalizedPlayer, existing.establishedYear ?? year, existing.source ?? source);
  const normalized = {
    ...baseline,
    ...existing,
    version: CAREER_TRAJECTORY_VERSION,
    realization: clamp(existing.realization ?? baseline.realization),
    professionalism: clamp(existing.professionalism ?? baseline.professionalism),
    resilience: clamp(existing.resilience ?? baseline.resilience),
    stability: clamp(existing.stability ?? baseline.stability),
    ambition: clamp(existing.ambition ?? baseline.ambition),
    window: {
      ...baseline.window,
      ...(existing.window ?? {}),
      currentAge: playerAge(normalizedPlayer, year),
      phase: careerPhase(normalizedPlayer, year),
    },
    history: Array.isArray(existing.history) ? existing.history.slice(-160) : baseline.history,
  };
  return { ...normalizedPlayer, careerTrajectory: normalized };
}

/**
 * O teto individual continua sendo a verdade do jogador. A realização cria
 * uma distância pequena e reversível até ele: é o que permite uma promessa
 * alta crescer bem, mas nunca converter 100% do que poderia sem contexto.
 */
export function getCareerTrajectoryEffectiveCeiling(player, personalCeiling, year = 2025) {
  const trajectory = ensureCareerTrajectory(player, Math.floor(year)).careerTrajectory;
  const realizationGap = Math.round((100 - trajectory.realization) * 0.075);
  return Math.max(1, Math.min(personalCeiling, personalCeiling - realizationGap));
}

/**
 * Ritmo de crescimento: realização tem efeito moderado; a janela do arco
 * dá forma distinta para precoce, tardio, estável e volátil sem substituir
 * o peakAge já existente no DevelopmentSystem.
 */
export function getCareerTrajectoryGrowthMultiplier(player, year = 2025) {
  const trajectoryPlayer = ensureCareerTrajectory(player, Math.floor(year));
  const trajectory = trajectoryPlayer.careerTrajectory;
  const age = playerAge(player, year);
  const { arcId, startAge, endAge } = trajectory.window;
  const realizationFactor = 0.84 + trajectory.realization * 0.0024; // 0.89–1.07 na faixa normal

  let windowFactor = 1;
  if (arcId === 'EARLY_BLOOMER') {
    windowFactor = age < startAge ? 0.94 : age <= endAge ? 1.12 : 0.88;
  } else if (arcId === 'LATE_BLOOMER') {
    windowFactor = age < startAge - 2 ? 0.82 : age < startAge ? 0.93 : age <= endAge ? 1.13 : 0.94;
  } else if (arcId === 'EXPLOSIVE') {
    windowFactor = age < startAge ? 0.92 : age <= endAge ? 1.15 : 0.90;
  } else if (arcId === 'VOLATILE') {
    windowFactor = age < startAge ? 0.94 : age <= endAge ? 1.07 : 0.91;
  } else {
    windowFactor = age < startAge ? 0.95 : age <= endAge ? 1.06 : 0.94;
  }

  return Math.max(0.68, Math.min(1.20, realizationFactor * windowFactor * personalityGrowthFactor(trajectoryPlayer) * healthGrowthFactor(trajectoryPlayer) * coachTrajectoryFactor(trajectoryPlayer, year)));
}

/**
 * Leitura curta e pública da direção da carreira. Não revela o teto secreto:
 * transforma os fatores que já afetaram a trajetória em uma previsão útil.
 */
export function buildCareerTrajectoryForecast(player, year = 2025) {
  const p = ensureCareerTrajectory(player, year);
  const trajectory = p.careerTrajectory;
  const phase = trajectory.window?.phase ?? 'FORMATIVE';
  const condition = Number(p.physicalCondition ?? 82);
  const burden = Number(p.injuryBurden?.score ?? 0);
  const friction = Number(p.coaching?.friction ?? 0);
  const recent = (trajectory.history ?? []).filter(entry => entry.type !== 'SEASON_TRAJECTORY_SNAPSHOT').slice(-4);
  const drivers = [];
  let trend = 'STABILIZING';
  let label = 'Construção estável';

  if (condition < 65 || burden >= 40 || friction >= 80) {
    trend = 'AT_RISK';
    label = 'Trajetória sob pressão';
    if (condition < 65) drivers.push('o corpo ainda limita a continuidade do desenvolvimento');
    if (burden >= 40) drivers.push('o histórico físico exige uma recuperação mais longa');
    if (friction >= 80) drivers.push('a relação com a equipe técnica está instável');
  } else if (phase === 'FORMATIVE' || phase === 'ASCENDING') {
    trend = trajectory.realization >= 66 ? 'ASCENDING' : 'BUILDING';
    label = trajectory.realization >= 66 ? 'Ascensão com espaço para acelerar' : 'Talento ainda em construção';
    drivers.push('a janela de desenvolvimento ainda está aberta');
  } else if (phase === 'PEAK_WINDOW') {
    trend = trajectory.realization >= 70 ? 'BREAKTHROUGH_WINDOW' : 'DECISIVE_WINDOW';
    label = trajectory.realization >= 70 ? 'Janela de salto competitivo' : 'Janela decisiva da carreira';
    drivers.push('os próximos resultados tendem a definir o tamanho do auge');
  } else {
    trend = 'VETERAN_REINVENTION';
    label = 'Fase de reinvenção e preservação';
    drivers.push('a experiência precisa compensar a perda natural de margem física');
  }

  for (const entry of recent.reverse()) {
    if (!entry.reason) continue;
    drivers.push(entry.reason);
    if (drivers.length >= 3) break;
  }

  const confidence = Math.max(42, Math.min(86, 56 + Math.min(16, recent.length * 4) + (trajectory.realization - 60) * 0.35));
  return {
    trend,
    label,
    confidence: Math.round(confidence),
    summary: `${label}. ${drivers[0] ?? 'A próxima temporada vai revelar a direção mais claramente.'}`,
    drivers: [...new Set(drivers)].slice(0, 3),
    updatedYear: year,
  };
}

/**
 * Fecha uma temporada de trajetória. Neste patch só títulos relevantes
 * aumentam a realização; lesões, equipe e mente entram nos patches próprios.
 */
export function advanceCareerTrajectory(player, year = 2025, context = {}) {
  const p = ensureCareerTrajectory(player, year);
  const before = p.careerTrajectory;
  const nextWindow = buildWindow(p, year + 1);
  const titleType = context.titleType ?? null;
  const titleBonus = titleType === 'SLAM' || titleType === 'GRAND_SLAM' ? 4
    : titleType === 'MASTERS' ? 3
      : titleType === 'ATP500' ? 2
        : titleType ? 1 : 0;
  const personalityResponse = personalitySeasonResponse(p, context);
  const healthResponse = healthSeasonResponse(p, year, context);
  const coachResponse = coachSeasonResponse(p, year);
  const realization = clamp(before.realization + titleBonus + personalityResponse.delta + healthResponse.delta + coachResponse.delta);
  const history = [...(before.history ?? [])];
  const events = [];

  if (titleBonus > 0) {
    history.push({ year, type: 'REALIZATION_GAIN', source: titleType, delta: titleBonus, value: realization });
    events.push({ type: 'CAREER_REALIZATION_GAIN', delta: titleBonus, source: titleType });
  }
  if (personalityResponse.delta !== 0) {
    history.push({
      year,
      type: 'PERSONALITY_RESPONSE',
      archetype: personalityResponse.archetype,
      delta: personalityResponse.delta,
      reason: personalityResponse.reason,
      value: realization,
    });
    events.push({
      type: 'CAREER_PERSONALITY_RESPONSE',
      delta: personalityResponse.delta,
      archetype: personalityResponse.archetype,
      note: personalityResponse.reason,
    });
  }
  if (healthResponse.delta !== 0) {
    history.push({
      year,
      type: 'HEALTH_LOAD_RESPONSE',
      delta: healthResponse.delta,
      reason: healthResponse.reason,
      load: healthResponse.load,
      severity: healthResponse.severity,
      value: realization,
    });
    events.push({
      type: 'CAREER_HEALTH_RESPONSE',
      delta: healthResponse.delta,
      note: healthResponse.reason,
      load: healthResponse.load,
    });
  }
  if (coachResponse.delta !== 0) {
    const coachEventType = coachResponse.delta > 0
      ? 'COACH_PARTNERSHIP_VALIDATED'
      : coachResponse.reason?.includes('atrito')
        ? 'COACH_FRICTION'
        : 'COACH_ADAPTATION';
    history.push({
      year,
      type: coachEventType,
      coachId: coachResponse.coachId,
      delta: coachResponse.delta,
      reason: coachResponse.reason,
      value: realization,
    });
    events.push({
      type: 'CAREER_COACH_RESPONSE',
      delta: coachResponse.delta,
      coachId: coachResponse.coachId,
      note: coachResponse.reason,
    });
  }
  if (before.window?.phase !== nextWindow.phase) {
    history.push({ year, type: 'WINDOW_PHASE_CHANGED', from: before.window?.phase ?? null, to: nextWindow.phase });
    events.push({ type: 'CAREER_WINDOW_CHANGED', from: before.window?.phase ?? null, to: nextWindow.phase });
  }

  const provisionalPlayer = {
    ...p,
    careerTrajectory: {
      ...before,
      realization,
      window: nextWindow,
      history,
    },
  };
  const forecast = buildCareerTrajectoryForecast(provisionalPlayer, year + 1);
  if (before.forecast?.trend !== forecast.trend) {
    events.push({
      type: 'CAREER_OUTLOOK_CHANGED',
      trend: forecast.trend,
      label: forecast.label,
      text: `${p.name ?? p.id}: ${forecast.summary}`,
    });
  }
  history.push({
    year,
    type: 'SEASON_TRAJECTORY_SNAPSHOT',
    realization,
    phase: nextWindow.phase,
    forecast: { trend: forecast.trend, label: forecast.label, confidence: forecast.confidence },
    drivers: forecast.drivers,
  });

  return {
    player: {
      ...p,
      careerTrajectory: {
        ...before,
        realization,
        window: nextWindow,
        forecast,
        history: history.slice(-160),
      },
    },
    events,
  };
}
