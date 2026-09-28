/**
 * MatchHeat.js
 *
 * Dois sinais deliberadamente separados:
 * - Live Heat: temperatura deste exato momento da partida. Serve ao HUD.
 * - Match Quality: leitura final do jogo inteiro. Serve ao arquivo/história.
 *
 * Um ace em 0-0 pode deixar a transmissão mais viva; não pode, sozinho,
 * transformar uma partida ruim em clássico. Por isso o segundo cálculo só é
 * fechado após o último ponto e nunca reutiliza o valor momentâneo como nota.
 */

const clamp = (value, min = 0, max = 100) => Math.max(min, Math.min(max, value));
const ratio = (won, total, fallback = null) => total > 0 ? won / total : fallback;

const LIVE_BASELINE = 16;

function scoreStatePressure(ctx = {}) {
  let pressure = 0;
  if (ctx.isBreakPoint) pressure += 18;
  if (ctx.isSetPoint) pressure += 25;
  if (ctx.isMatchPoint) pressure += 38;
  if (ctx.wasBreakPointSaved) pressure += 8;
  if (ctx.wasSetPointSaved) pressure += 14;
  if (ctx.wasMatchPointSaved) pressure += 24;
  if (ctx.wasDeuce) pressure += 7;
  if (ctx.inTiebreak) pressure += 12;
  if (ctx.isLateSet) pressure += 5;
  return pressure;
}

function pointCraft(gs, isWinner, isAce, ctx) {
  const rally = gs.rally ?? 0;
  let craft = rally >= 24 ? 25
    : rally >= 18 ? 20
      : rally >= 12 ? 15
        : rally >= 8 ? 10
          : rally >= 5 ? 5
            : rally >= 3 ? 2 : -3;
  if (isAce) craft += 4;
  else if (isWinner) craft += 5;
  if (ctx.isDoubleFault) craft -= 8;
  if (ctx.isForcedError) craft += 2;
  return craft;
}

export function initHeat(gs) {
  gs.heat = {
    score: LIVE_BASELINE,
    peak: LIVE_BASELINE,
    recentDrama: 0,
    volatility: 0,
    events: 0,
  };
}

/** Atualização ponto a ponto — intencionalmente sem qualquer "nota final". */
export function updateHeat(gs, winnerIdx, isWinner, isAce, ctx = {}) {
  if (!gs.heat) initHeat(gs);
  const heat = gs.heat;
  const pressure = scoreStatePressure({ ...ctx, inTiebreak: ctx.inTiebreak ?? gs.inTiebreak });
  const craft = pointCraft(gs, isWinner, isAce, ctx);
  const event = craft + pressure;

  // O público carrega os últimos pontos, mas esquece naturalmente uma sequência
  // de rotinas. Assim não existe "calor acumulado" artificial em um passeio.
  heat.recentDrama = heat.recentDrama * 0.64 + event * 0.36;
  heat.volatility = heat.volatility * 0.76 + Math.abs(event) * 0.24;
  const target = LIVE_BASELINE + heat.recentDrama * 1.18 + Math.min(12, heat.volatility * 0.16);
  heat.score += (clamp(target, 4, 100) - heat.score) * (event >= 20 ? 0.42 : 0.27);
  heat.score += (LIVE_BASELINE - heat.score) * 0.022;
  heat.score = clamp(heat.score);
  heat.peak = Math.max(heat.peak, heat.score);
  heat.events++;
}

function setDrama(setsDetail = []) {
  if (!setsDetail.length) return { score: 0, closeSets: 0, tiebreaks: 0, decider: false };
  let score = 0;
  let closeSets = 0;
  let tiebreaks = 0;
  for (const [a = 0, b = 0] of setsDetail) {
    const margin = Math.abs(a - b);
    if (margin <= 2) { score += 6; closeSets++; }
    if (Math.max(a, b) >= 7 && margin <= 2) { score += 5; tiebreaks++; }
    else if (Math.max(a, b) >= 6 && margin === 1) score += 4;
    if (Math.min(a, b) <= 1) score -= 4;
  }
  const decider = setsDetail.length >= 3 && setsDetail.slice(0, -1).some(([a, b]) => a !== b);
  if (decider) score += 8;
  return { score, closeSets, tiebreaks, decider };
}

function technicalQuality(statsA = {}, statsB = {}, points = 0) {
  const totalPoints = Math.max(
    points,
    (statsA.pointsWonServing ?? 0) + (statsA.pointsWonReturning ?? 0) +
      (statsB.pointsWonServing ?? 0) + (statsB.pointsWonReturning ?? 0),
    1,
  );
  const rallyCount = (statsA.rallyCount ?? statsA.rallyLengths?.length ?? 0) + (statsB.rallyCount ?? statsB.rallyLengths?.length ?? 0);
  const rallySum = (statsA.rallySum ?? statsA.rallyLengths?.reduce((n, v) => n + v, 0) ?? 0) +
    (statsB.rallySum ?? statsB.rallyLengths?.reduce((n, v) => n + v, 0) ?? 0);
  const avgRally = rallyCount ? rallySum / rallyCount : 3;
  const winners = (statsA.winners ?? 0) + (statsB.winners ?? 0);
  const ue = (statsA.unforcedErrors ?? 0) + (statsB.unforcedErrors ?? 0);
  const forced = (statsA.forcedErrors ?? 0) + (statsB.forcedErrors ?? 0);
  const qualityA = ratio(statsA.qualitySum ?? 0, statsA.qualityCount ?? 0, 0.52);
  const qualityB = ratio(statsB.qualitySum ?? 0, statsB.qualityCount ?? 0, 0.52);
  const craft = clamp((avgRally - 3.2) * 2.7, -6, 12);
  const cleanAggression = clamp(((winners / totalPoints) - 0.13) * 65, -7, 10);
  const errorDiscipline = clamp(((0.18 - ue / totalPoints) * 55) + ((forced / totalPoints - 0.08) * 20), -8, 9);
  const engineQuality = clamp((((qualityA + qualityB) / 2) - 0.52) * 38, -7, 8);
  return { score: craft + cleanAggression + errorDiscipline + engineQuality, avgRally, winners, ue };
}

function pressureQuality(statsA = {}, statsB = {}) {
  const read = (stats) => {
    const bp = ratio(stats.breakPointsConverted ?? stats.breakPointsWon ?? 0, stats.breakPointsOpportunities ?? 0, null);
    const saved = ratio(stats.breakPointsSaved ?? 0, stats.breakPointsFaced ?? 0, null);
    const setSaved = stats.setPointsSaved ?? 0;
    const matchSaved = stats.matchPointsSaved ?? 0;
    return { bp, saved, savedMoments: setSaved + matchSaved };
  };
  const a = read(statsA), b = read(statsB);
  const chances = (statsA.breakPointsOpportunities ?? 0) + (statsB.breakPointsOpportunities ?? 0) +
    (statsA.breakPointsFaced ?? 0) + (statsB.breakPointsFaced ?? 0);
  const conversionBalance = a.bp != null && b.bp != null ? 1 - Math.abs(a.bp - b.bp) : 0.35;
  const saveBalance = a.saved != null && b.saved != null ? 1 - Math.abs(a.saved - b.saved) : 0.35;
  return clamp(chances * 1.35 + conversionBalance * 8 + saveBalance * 6 + (a.savedMoments + b.savedMoments) * 5, 0, 27);
}

/**
 * Fecha a qualidade do jogo em 0–100. Não há ranking, fama ou "upset" aqui:
 * uma partida ganha interesse histórico pelo que aconteceu dentro dela.
 */
export function finalizeMatchHeat({ statsA = {}, statsB = {}, setsDetail = [], points = 0, liveHeat = null } = {}) {
  const drama = setDrama(setsDetail);
  const technical = technicalQuality(statsA, statsB, points);
  const pressure = pressureQuality(statsA, statsB);
  const livePeak = liveHeat?.peak ?? LIVE_BASELINE;
  const liveContribution = clamp((livePeak - 32) * 0.32, -3, 17);
  // As quatro famílias de evidência se confirmam mutuamente, mas nenhuma
  // sozinha ocupa o teto. 90+ requer partida muito apertada *e* grande tensão.
  const score = Math.round(clamp(
    24 + drama.score * 0.80 + technical.score * 0.75 + pressure * 0.55 + liveContribution * 0.65,
    5,
    100,
  ));
  const peak = Math.round(clamp(Math.max(livePeak, score + (drama.tiebreaks * 3) + (drama.decider ? 3 : 0)), score, 100));
  return {
    score,
    peak,
    tier: heatScoreToTier(score),
    liveFinal: Math.round(liveHeat?.score ?? LIVE_BASELINE),
    livePeak: Math.round(livePeak),
    components: {
      drama: Math.round(drama.score),
      pressure: Math.round(pressure),
      technical: Math.round(technical.score),
      live: Math.round(liveContribution),
      avgRally: Math.round(technical.avgRally * 10) / 10,
      closeSets: drama.closeSets,
      tiebreaks: drama.tiebreaks,
    },
  };
}

export function readHeat(gs) {
  const score = Math.round(gs?.heat?.score ?? LIVE_BASELINE);
  const peak = Math.round(gs?.heat?.peak ?? LIVE_BASELINE);
  return { score, peak, tier: heatScoreToTier(score) };
}

export function heatScoreToTier(score) {
  const n = Math.round(score ?? 0);
  if (n >= 90) return { label: 'ÉPICO', color: '#FFD700', glow: '#FFD70088', pulse: true };
  if (n >= 78) return { label: 'CLÁSSICO', color: '#FF8C00', glow: '#FF8C0055', pulse: true };
  if (n >= 64) return { label: 'EM CHAMAS', color: '#FF5533', glow: '#FF553333', pulse: false };
  if (n >= 50) return { label: 'QUENTE', color: '#FF9944', glow: null, pulse: false };
  if (n >= 36) return { label: 'AQUECIDO', color: '#FFD700', glow: null, pulse: false };
  if (n >= 23) return { label: 'NEUTRO', color: '#7ab4ff', glow: null, pulse: false };
  return { label: 'MORNO', color: '#4A7A9B', glow: null, pulse: false };
}
