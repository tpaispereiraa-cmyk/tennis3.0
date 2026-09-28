/** IndividualRating.jsx — avaliação pós-jogo baseada em pilares ATP. */
import React from 'react';

const clamp = (v, min = 1, max = 10) => Math.max(min, Math.min(max, v));
const ratio = (a, b) => b > 0 ? a / b : null;
const round = (v) => Math.round(v * 10) / 10;

// Médias de referência. Não são atributos: são a linha de base do tour para
// comparar uma atuação dentro daquela superfície.
const SURFACE_BASELINES = {
  CLAY:   { firstIn: .63, firstWon: .68, secondWon: .52, hold: .76, aceGame: .32, dfGame: .34, ret: .38, break: .25, winnerPoint: .14, uePoint: .14 },
  GRASS:  { firstIn: .63, firstWon: .73, secondWon: .53, hold: .84, aceGame: .72, dfGame: .34, ret: .32, break: .19, winnerPoint: .17, uePoint: .13 },
  INDOOR: { firstIn: .63, firstWon: .73, secondWon: .54, hold: .85, aceGame: .78, dfGame: .34, ret: .31, break: .18, winnerPoint: .17, uePoint: .13 },
  CARPET: { firstIn: .64, firstWon: .75, secondWon: .54, hold: .87, aceGame: .90, dfGame: .35, ret: .30, break: .17, winnerPoint: .18, uePoint: .13 },
  STREET: { firstIn: .62, firstWon: .69, secondWon: .51, hold: .77, aceGame: .42, dfGame: .38, ret: .37, break: .24, winnerPoint: .15, uePoint: .15 },
  HARD:   { firstIn: .62, firstWon: .70, secondWon: .52, hold: .80, aceGame: .55, dfGame: .35, ret: .35, break: .22, winnerPoint: .16, uePoint: .14 },
};

function compare(value, mean, spread, inverse = false) {
  if (value == null || !Number.isFinite(value)) return null;
  const z = ((inverse ? mean - value : value - mean) / spread);
  return clamp(6 + z * 1.22, 1.2, 9.9);
}

function combine(items) {
  const available = items.filter((item) => item.value != null && Number.isFinite(item.value));
  if (!available.length) return { score: 6, confidence: 0 };
  const weight = available.reduce((sum, item) => sum + item.weight, 0);
  const confidence = Math.min(1, available.reduce((sum, item) => sum + (item.confidence ?? 1) * item.weight, 0) / weight);
  return { score: available.reduce((sum, item) => sum + item.value * item.weight, 0) / weight, confidence };
}

const TIERS = [
  { min: 9, label: 'LENDÁRIO', color: '#FFD700', glow: 'rgba(255,215,0,.4)' },
  { min: 8, label: 'EXCEPCIONAL', color: '#B0FF60', glow: 'rgba(176,255,96,.32)' },
  { min: 7, label: 'MUITO FORTE', color: '#60D0FF', glow: 'rgba(96,208,255,.26)' },
  { min: 5.5, label: 'SÓLIDO', color: '#C5D7E8', glow: 'rgba(197,215,232,.18)' },
  { min: 4.2, label: 'ABAIXO', color: '#FF9A55', glow: 'rgba(255,154,85,.2)' },
  { min: 0, label: 'FRACO', color: '#FF5050', glow: 'rgba(255,80,80,.2)' },
];
const tierFor = (score) => TIERS.find((tier) => score >= tier.min) ?? TIERS.at(-1);

/**
 * Avalia a atuação, não quem venceu. O segundo argumento continua compatível
 * com chamadas antigas; opponentStats/context permitem leituras mais completas.
 */
export function computeRating(stats = {}, shotCount = 0, opponentStats = null, context = {}) {
  const surface = String(context.surface ?? context.courtSurface ?? 'HARD').toUpperCase();
  const base = SURFACE_BASELINES[surface] ?? SURFACE_BASELINES.HARD;
  const points = Math.max(
    (stats.pointsWonServing ?? 0) + (stats.pointsWonReturning ?? 0),
    (stats.pointsWonServing ?? 0) + (stats.pointsLostServing ?? 0),
    (stats.pointOutcomeCount ?? 0),
    shotCount ?? 0,
    1,
  );
  const gamesServed = stats.gamesServed ?? 0;
  const gamesReturned = stats.gamesReturned ?? 0;
  const firstTotal = stats.serve1Total ?? 0;
  const secondTotal = stats.serve2In ?? stats.serve2Total ?? 0;
  const firstWon = stats.serve1WonPoints ?? stats.serve1Won ?? 0;
  const secondWon = stats.serve2WonPoints ?? stats.serve2Won ?? 0;
  const firstIn = ratio(stats.serve1In ?? 0, firstTotal);
  const firstWonRate = ratio(firstWon, stats.serve1In ?? 0);
  const secondWonRate = ratio(secondWon, secondTotal);
  const holdRate = ratio(stats.gamesHeld ?? 0, gamesServed);
  const aceGame = ratio(stats.aces ?? 0, gamesServed);
  const dfGame = ratio(stats.doubleFaults ?? 0, gamesServed);

  const serve = combine([
    { value: compare(firstIn, base.firstIn, .075), weight: .17, confidence: Math.min(1, firstTotal / 18) },
    { value: compare(firstWonRate, base.firstWon, .10), weight: .27, confidence: Math.min(1, (stats.serve1In ?? 0) / 14) },
    { value: compare(secondWonRate, base.secondWon, .11), weight: .22, confidence: Math.min(1, secondTotal / 12) },
    { value: compare(holdRate, base.hold, .17), weight: .22, confidence: Math.min(1, gamesServed / 4) },
    { value: compare(aceGame, base.aceGame, .52), weight: .07, confidence: Math.min(1, gamesServed / 4) },
    { value: compare(dfGame, base.dfGame, .30, true), weight: .05, confidence: Math.min(1, gamesServed / 4) },
  ]);

  const returnPoints = ratio(stats.pointsWonReturning ?? 0, (stats.pointsWonReturning ?? 0) + (stats.pointsLostReturning ?? 0));
  const breakRate = ratio(stats.gamesConverted ?? stats.breakPointsConverted ?? 0, gamesReturned);
  const firstReturn = opponentStats ? ratio((opponentStats.serve1LostPoints ?? 0), opponentStats.serve1In ?? 0) : null;
  const secondReturn = opponentStats ? ratio((opponentStats.serve2LostPoints ?? 0), opponentStats.serve2In ?? opponentStats.serve2Total ?? 0) : null;
  const returning = combine([
    { value: compare(returnPoints, base.ret, .09), weight: .48, confidence: Math.min(1, ((stats.pointsWonReturning ?? 0) + (stats.pointsLostReturning ?? 0)) / 28) },
    { value: compare(breakRate, base.break, .18), weight: .25, confidence: Math.min(1, gamesReturned / 4) },
    { value: compare(firstReturn, 1 - base.firstWon, .10), weight: .12, confidence: firstReturn == null ? 0 : .7 },
    { value: compare(secondReturn, 1 - base.secondWon, .11), weight: .15, confidence: secondReturn == null ? 0 : .7 },
  ]);

  const winnersPerPoint = ratio(stats.winners ?? 0, points);
  const uePerPoint = ratio(stats.unforcedErrors ?? 0, points);
  const avgQuality = ratio(stats.qualitySum ?? 0, stats.qualityCount ?? 0);
  const attackRate = ratio(stats.attackPointsWon ?? 0, stats.attackPointsPlayed ?? 0);
  const defenseRate = ratio(stats.defensePointsWon ?? 0, stats.defensePointsPlayed ?? 0);
  const construction = combine([
    { value: compare(winnersPerPoint, base.winnerPoint, .065), weight: .22, confidence: Math.min(1, points / 55) },
    { value: compare(uePerPoint, base.uePoint, .065, true), weight: .28, confidence: Math.min(1, points / 55) },
    { value: compare(avgQuality, .54, .105), weight: .18, confidence: Math.min(1, (stats.qualityCount ?? 0) / 30) },
    { value: compare(attackRate, .62, .16), weight: .19, confidence: Math.min(1, (stats.attackPointsPlayed ?? 0) / 10) },
    { value: compare(defenseRate, .28, .16), weight: .13, confidence: Math.min(1, (stats.defensePointsPlayed ?? 0) / 10) },
  ]);

  const bpConverted = ratio(stats.breakPointsConverted ?? stats.breakPointsWon ?? 0, stats.breakPointsOpportunities ?? 0);
  const bpSaved = ratio(stats.breakPointsSaved ?? 0, stats.breakPointsFaced ?? 0);
  const tieRate = ratio(stats.tiebreakPointsWon ?? 0, stats.tiebreakPointsPlayed ?? 0);
  const pressure = combine([
    { value: compare(bpConverted, .40, .20), weight: .38, confidence: Math.min(1, (stats.breakPointsOpportunities ?? 0) / 5) },
    { value: compare(bpSaved, .62, .18), weight: .38, confidence: Math.min(1, (stats.breakPointsFaced ?? 0) / 5) },
    { value: compare(tieRate, .50, .18), weight: .24, confidence: Math.min(1, (stats.tiebreakPointsPlayed ?? 0) / 8) },
  ]);

  const netRate = ratio(stats.netPointsWon ?? 0, stats.netApproaches ?? 0);
  const execution = combine([
    { value: compare(netRate, .61, .18), weight: .34, confidence: Math.min(1, (stats.netApproaches ?? 0) / 8) },
    { value: compare(dfGame, base.dfGame, .30, true), weight: .26, confidence: Math.min(1, gamesServed / 4) },
    { value: compare(uePerPoint, base.uePoint, .065, true), weight: .40, confidence: Math.min(1, points / 55) },
  ]);

  const pillars = { saque: serve, devolucao: returning, construcao: construction, pressao: pressure, execucao: execution };
  const weighted = combine([
    { value: serve.score, weight: .27, confidence: serve.confidence },
    { value: returning.score, weight: .25, confidence: returning.confidence },
    { value: construction.score, weight: .23, confidence: construction.confidence },
    { value: pressure.score, weight: .17, confidence: pressure.confidence },
    { value: execution.score, weight: .08, confidence: execution.confidence },
  ]);
  // Amostras fracas se aproximam do neutro, em vez do antigo 7.0 automático.
  const confidence = Math.min(1, weighted.confidence * .72 + Math.min(1, points / 70) * .28);
  const score = clamp(6 + (weighted.score - 6) * (.38 + confidence * .62));
  const components = Object.fromEntries(Object.entries(pillars).map(([key, value]) => [key, {
    score: round(value.score), label: key.toUpperCase(), weight: { saque: .27, devolucao: .25, construcao: .23, pressao: .17, execucao: .08 }[key], confidence: value.confidence,
  }]));
  return {
    score: round(score), confidence: round(confidence), components, tier: tierFor(score),
    detail: { firstIn, firstWonRate, secondWonRate, returnPoints, bpConverted, bpSaved, winnersPerPoint, uePerPoint, avgQuality },
  };
}

export function MatchRatingBadge({ stats, shotCount, surfColor = '#c8571a' }) {
  const { score, confidence, components, tier } = computeRating(stats, shotCount);
  const hasData = confidence >= .18;
  const R = 22, cx = 30, cy = 30, circumference = 2 * Math.PI * R;
  return <div style={{ padding: '8px 14px', borderBottom: '1px solid rgba(255,255,255,.07)' }}>
    <div style={{ fontFamily: 'Rajdhani, monospace', fontSize: 6, letterSpacing: 3, color: 'rgba(255,255,255,.25)', textTransform: 'uppercase', marginBottom: 6 }}>RATING DA PARTIDA</div>
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <svg width={60} height={60} style={{ flexShrink: 0 }}><circle cx={cx} cy={cy} r={R} fill="none" stroke="rgba(255,255,255,.06)" strokeWidth={4}/><circle cx={cx} cy={cy} r={R} fill="none" stroke={hasData ? tier.color : 'rgba(255,255,255,.12)'} strokeWidth={4} strokeLinecap="round" strokeDasharray={`${(score / 10) * circumference} ${circumference}`} transform={`rotate(-90 ${cx} ${cy})`}/><text x={cx} y={cy + 1} textAnchor="middle" dominantBaseline="middle" fontFamily="Rajdhani, monospace" fontWeight="900" fontSize={14} fill={hasData ? tier.color : 'rgba(255,255,255,.2)'}>{hasData ? score.toFixed(1) : '—'}</text></svg>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: 'Rajdhani, monospace', fontSize: 9, fontWeight: 700, letterSpacing: 2, color: tier.color, marginBottom: 5 }}>{hasData ? tier.label : 'SEM AMOSTRA'}</div>
        {Object.values(components).map(({ label, score: pillar }) => <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 3 }}><span style={{ fontFamily: 'Rajdhani, monospace', fontSize: 6, letterSpacing: 1, color: 'rgba(255,255,255,.25)', width: 54 }}>{label}</span><div style={{ flex: 1, height: 2, background: 'rgba(255,255,255,.06)' }}><div style={{ height: '100%', width: `${pillar * 10}%`, background: `linear-gradient(90deg,${surfColor}88,${surfColor})` }}/></div><span style={{ fontFamily: 'Rajdhani, monospace', fontSize: 8, color: 'rgba(255,255,255,.5)', width: 16, textAlign: 'right' }}>{pillar.toFixed(1)}</span></div>)}
        <div style={{ marginTop: 4, fontFamily: 'Rajdhani, monospace', fontSize: 6, color: 'rgba(255,255,255,.18)', letterSpacing: 1 }}>CONFIANÇA DA AMOSTRA {Math.round(confidence * 100)}%</div>
      </div>
    </div>
  </div>;
}
