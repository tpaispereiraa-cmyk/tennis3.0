/**
 * formas.jsx
 * ─────────────────────────────────────────────────────────────────
 * Sistema de Forma — "a régua do estado mental e físico"
 *
 * CONCEITO
 *   Cada jogador tem um valor de pontos de forma que flutua entre
 *   -100 (Fundo do Poço) e +100 (Imparável).
 *   Vencer sobe os pontos. Perder baixa.
 *   A régua tem 7 zonas, mas forma não reescreve talento: ela mexe de modo
 *   moderado em execução, confiança, leitura e capacidade física imediata.
 *   Há regressão mensal para impedir sequências autorreforçadas.
 *
 * RÉGUA
 *   -100 ──── Fundo do Poço (-4) ─ Fase Ruim (-3) ─ Perf. Mal (-1.5)
 *              NORMAL ─ Boa Forma (+1.5) ─ Grande Forma (+3) ─ Imparável (+4)
 *
 * THRESHOLDS
 *   IMPARÁVEL       ≥  75  → impacto +4
 *   GRANDE_FORMA    ≥  40  → impacto +3
 *   BOA_FORMA       ≥  15  → impacto +1.5
 *   NORMAL          -14…14 →   0%
 *   PERFORMANDO_MAL ≤ -15  → impacto -1.5
 *   FASE_RUIM       ≤ -40  → impacto -3
 *   FUNDO_POCO      ≤ -75  → impacto -4
 *
 * PONTOS POR ROUND
 *   Win R32 +2 / Loss R32 -3
 *   Win R16 +3 / Loss R16 -2
 *   Win QF  +4 / Loss QF  -2
 *   Win SF  +5 / Loss SF  -1
 *   Win FIN +7 / Loss FIN  0
 *
 * SEASON RESET
 *   Mensalmente, 18% da forma regressa em direção ao normal.
 *   No fim da temporada, resta apenas 25% do saldo.
 *
 * Exports:
 *   FORM_STATES            — array de 7 estados ordenados (melhor→pior)
 *   getFormState(pts)      — retorna o estado atual dado os pontos
 *   applyFormModifier(attrs, pts) — retorna cópia de attrs com modificador aplicado
 *   calcFormDelta(roundIdx, isWinner) — pontos ganhos/perdidos num match
 *   applySeasonReset(pts)  — preserva 25% no fim da temporada
 *   clampFormPoints(pts)   — mantém em [-100, +100]
 *   FormaTab               — componente React da aba de forma
 */

import React, { useRef, useEffect } from 'react';

// ─────────────────────────────────────────────────────────────────
// DADOS DO SISTEMA
// ─────────────────────────────────────────────────────────────────

/**
 * 7 estados da régua de forma, do mais alto ao mais baixo.
 * threshold = ponto mínimo para entrar neste estado (positivos)
 * ou ponto máximo para estados negativos.
 */
export const FORM_STATES = [
  {
    id:        'IMPARAVEL',
    label:     'Imparável',
    shortLabel:'IMPARÁVEL',
    icon:      '⚡',
    threshold: 75,
    modifier:  0.04,
    attributeImpact: 4,
    color:     '#00E5FF',
    colorDim:  'rgba(0,229,255,.18)',
    colorGlow: 'rgba(0,229,255,.40)',
    side:      'positive',
  },
  {
    id:        'GRANDE_FORMA',
    label:     'Grande Forma',
    shortLabel:'GRANDE FORMA',
    icon:      '🔥',
    threshold: 40,
    modifier:  0.03,
    attributeImpact: 3,
    color:     '#69F0AE',
    colorDim:  'rgba(105,240,174,.15)',
    colorGlow: 'rgba(105,240,174,.30)',
    side:      'positive',
  },
  {
    id:        'BOA_FORMA',
    label:     'Boa Forma',
    shortLabel:'BOA FORMA',
    icon:      '📈',
    threshold: 15,
    modifier:  0.015,
    attributeImpact: 1.5,
    color:     '#B9F6CA',
    colorDim:  'rgba(185,246,202,.12)',
    colorGlow: 'rgba(185,246,202,.20)',
    side:      'positive',
  },
  {
    id:        'NORMAL',
    label:     'Normal',
    shortLabel:'NORMAL',
    icon:      '➡️',
    threshold: -14,  // min -14 / max +14
    modifier:  0,
    attributeImpact: 0,
    color:     '#90A4AE',
    colorDim:  'rgba(144,164,174,.12)',
    colorGlow: 'rgba(144,164,174,.20)',
    side:      'neutral',
  },
  {
    id:        'PERFORMANDO_MAL',
    label:     'Performando Mal',
    shortLabel:'PERF. MAL',
    icon:      '📉',
    threshold: -15,
    modifier:  -0.015,
    attributeImpact: -1.5,
    color:     '#FFAB40',
    colorDim:  'rgba(255,171,64,.12)',
    colorGlow: 'rgba(255,171,64,.25)',
    side:      'negative',
  },
  {
    id:        'FASE_RUIM',
    label:     'Fase Ruim',
    shortLabel:'FASE RUIM',
    icon:      '🌧️',
    threshold: -40,
    modifier:  -0.03,
    attributeImpact: -3,
    color:     '#FF6E40',
    colorDim:  'rgba(255,110,64,.12)',
    colorGlow: 'rgba(255,110,64,.25)',
    side:      'negative',
  },
  {
    id:        'FUNDO_POCO',
    label:     'Fundo do Poço',
    shortLabel:'FUNDO DO POÇO',
    icon:      '💀',
    threshold: -75,
    modifier:  -0.04,
    attributeImpact: -4,
    color:     '#FF1744',
    colorDim:  'rgba(255,23,68,.12)',
    colorGlow: 'rgba(255,23,68,.30)',
    side:      'negative',
  },
];

// Map por ID para acesso rápido
export const FORM_STATE_MAP = Object.fromEntries(FORM_STATES.map(s => [s.id, s]));

// Pontos ganhos/perdidos por rodada (índice 0=R32, 1=R16, 2=QF, 3=SF, 4=Final)
export const FORM_POINTS_TABLE = [
  { win: 2, loss: -3 }, // R32 e rodadas anteriores
  { win: 3, loss: -2 }, // R16
  { win: 4, loss: -2 }, // QF
  { win: 5, loss: -1 }, // SF
  { win: 7, loss:  0 }, // Finalista já teve uma campanha positiva
];

export const MAX_TOURNAMENT_FORM_GAIN = 25;
export const MAX_TOURNAMENT_FORM_LOSS = -12;

// Forma afeta principalmente o que realmente oscila de semana para semana.
// Potência bruta, velocidade máxima, técnica de volley e talento de golpe
// permanecem essencialmente estruturais.
export const FORM_ATTRIBUTE_WEIGHTS = Object.freeze({
  mentalidade:  1.00,
  regularidade: 1.00,
  recuperacao:  0.80,
  adaptacao:    0.75,
  explosividade:0.50,
  resistencia:  0.45,
  leitura:      0.40,
  visaoTatica:  0.40,
  devolucao:    0.30,
  saquePrecisao:0.25,
  fhControle:   0.25,
  bhControle:   0.25,
});

// Labels legíveis das rodadas
export const ROUND_LABELS = ['R32', 'R16', 'Quartas', 'Semifinal', 'Final'];

// ─────────────────────────────────────────────────────────────────
// FUNÇÕES PURAS
// ─────────────────────────────────────────────────────────────────

/**
 * Mantém pontos dentro de [-100, +100]
 */
export function clampFormPoints(pts) {
  return Math.max(-100, Math.min(100, pts));
}

/**
 * Dado um valor de pontos, retorna o estado de forma correspondente.
 * @param {number} pts — valor de -100 a +100
 * @returns {object} — estado de FORM_STATES
 */
export function getFormState(pts) {
  const clamped = clampFormPoints(pts);

  if (clamped >= 75)  return FORM_STATES[0]; // IMPARÁVEL
  if (clamped >= 40)  return FORM_STATES[1]; // GRANDE_FORMA
  if (clamped >= 15)  return FORM_STATES[2]; // BOA_FORMA
  if (clamped >= -14) return FORM_STATES[3]; // NORMAL
  if (clamped >= -39) return FORM_STATES[4]; // PERFORMANDO_MAL
  if (clamped >= -74) return FORM_STATES[5]; // FASE_RUIM
  return FORM_STATES[6];                     // FUNDO_POCO
}

/**
 * Retorna quantos pontos faltam para o próximo estado acima (ou null se já é topo).
 */
export function pointsToNextState(pts) {
  const clamped = clampFormPoints(pts);
  const thresholds = [75, 40, 15];   // limiares de subida positiva
  for (const t of thresholds) {
    if (clamped < t) return t - clamped;
  }
  return null; // já está no topo
}

/**
 * Retorna quantos pontos faltam para o próximo estado abaixo (ou null se já é fundo).
 */
export function pointsToPrevState(pts) {
  const clamped = clampFormPoints(pts);
  const thresholds = [-75, -40, -15];  // limiares de queda negativa
  for (const t of thresholds) {
    if (clamped > t) return Math.abs(t - clamped);
  }
  return null; // já está no fundo
}

/**
 * Aplica o modificador de forma sobre os atributos de um jogador.
 * Retorna NOVA cópia dos attrs — nunca muta o original.
 * @param {object} attrs — { serve: 80, forehand: 75, ... }
 * @param {number} pts   — pontos de forma
 * @returns {object} — attrs modificados (valores arredondados)
 */
export function applyFormModifier(attrs, pts) {
  if (!attrs) return attrs;
  const { attributeImpact = 0 } = getFormState(pts);
  return applyCompetitiveAttributeImpact(attrs, attributeImpact);
}

export function applyCompetitiveAttributeImpact(attrs, impact = 0) {
  if (!attrs || !Number.isFinite(Number(impact)) || Number(impact) === 0) return attrs;

  const result = {};
  for (const [key, val] of Object.entries(attrs)) {
    if (typeof val !== 'number') { result[key] = val; continue; }
    const weight = FORM_ATTRIBUTE_WEIGHTS[key] ?? 0;
    const delta = Number(impact) * weight;
    result[key] = Math.max(1, Math.min(99, Math.round(val + delta)));
  }
  return result;
}

/**
 * Impede que chaves longas transformem uma campanha em meses de domínio
 * automático. O teto é por torneio, não por partida.
 */
export function capTournamentFormDelta(delta) {
  return Math.max(
    MAX_TOURNAMENT_FORM_LOSS,
    Math.min(MAX_TOURNAMENT_FORM_GAIN, Number(delta) || 0),
  );
}

/**
 * Regressão mensal em direção ao nível normal.
 * A forma continua contando histórias, mas precisa ser renovada em quadra.
 */
export function applyMonthlyFormRegression(pts, rate = 0.18) {
  const current = clampFormPoints(Number(pts) || 0);
  if (current === 0) return 0;
  const safeRate = Math.max(0, Math.min(1, Number(rate) || 0));
  const next = Math.round(current * (1 - safeRate));
  return Math.abs(next) <= 1 ? 0 : clampFormPoints(next);
}

/**
 * Calcula delta de pontos de forma para um match.
 * @param {number} roundIdx — índice da rodada (0=R32, …, 4=Final)
 * @param {boolean} isWinner — true se ganhou, false se perdeu
 * @returns {number} — pontos a adicionar (pode ser negativo)
 */
export function calcFormDelta(roundIdx, isWinner) {
  const table = FORM_POINTS_TABLE[roundIdx];
  if (!table) return 0;
  return isWinner ? table.win : table.loss;
}

/**
 * Aplica o reset de fim de temporada: preserva 25% do saldo.
 * A regressão mensal já fez a maior parte da normalização durante o ano.
 * @param {number} pts
 * @returns {number}
 */
export function applySeasonReset(pts) {
  return Math.round(pts * 0.25);
}

/**
 * Processa os rounds de um torneio e retorna deltas de forma para cada jogador.
 * @param {Array} rounds — resultado do torneio (array de rounds, cada round é array de matches)
 * @returns {Map<playerId, deltaPts>}
 */
export function calcTournamentFormDeltas(rounds) {
  const deltas = new Map();

  const addDelta = (id, pts) => {
    deltas.set(id, (deltas.get(id) ?? 0) + pts);
  };

  rounds.forEach((round, roundIdx) => {
    round.forEach(match => {
      if (!match?.winner || !match?.loser) return;
      addDelta(match.winner.id, calcFormDelta(roundIdx, true));
      addDelta(match.loser.id,  calcFormDelta(roundIdx, false));
    });
  });

  return deltas;
}

// ─────────────────────────────────────────────────────────────────
// FASE 2 — RECENT FORM: micro-forma por superfície para o motor de jogo
// ─────────────────────────────────────────────────────────────────

/**
 * Atualiza o campo recentForm do jogador após uma partida.
 * Chamado por APPLY_TOURNAMENT_RESULT no UniverseManager para cada resultado.
 *
 * @param {object} player    — objeto do jogador (imutável — retorna novo objeto)
 * @param {object} result    — { won: bool, surface: string, oppRank?: number, sets?: [number,number] }
 * @returns {object}         — novo objeto com recentForm atualizado
 */
export function updateRecentForm(player, result) {
  const rf = player.recentForm ?? { results: [], formScore: 0.5, hotStreak: 0, coldStreak: 0, surfaceForm: {}, tiebreakForm: 0.5 };

  // Novo resultado normalizado
  const entry = {
    won:          !!result.won,
    surface:      (result.surface ?? 'HARD').toUpperCase(),
    oppRank:      result.oppRank ?? 99,
    sets:         result.sets ?? [0, 0],
    // FASE 3: rastrear tiebreaks ganhos/perdidos por partida
    tiebreakWon:  result.tiebreakWon  ?? null,   // true/false/null (null = sem tiebreak)
    tiebreakLost: result.tiebreakLost ?? null,
  };

  // Manter janela de 10 resultados
  const newResults = [...rf.results, entry].slice(-10);

  // formScore: média ponderada — mais recente = mais peso
  // Peso linear: último resultado = peso N, primeiro = peso 1
  const n = newResults.length;
  let weightedSum = 0, totalWeight = 0;
  newResults.forEach((r, i) => {
    const w = i + 1;  // 1..n
    weightedSum += (r.won ? 1 : 0) * w;
    totalWeight += w;
  });
  const formScore = totalWeight > 0 ? weightedSum / totalWeight : 0.5;

  // Streaks
  let hotStreak  = result.won ? (rf.hotStreak  + 1) : 0;
  let coldStreak = result.won ? 0 : (rf.coldStreak + 1);

  // surfaceForm: média simples dos últimos 5 resultados nessa superfície
  const surf = entry.surface;
  const surfResults = newResults.filter(r => r.surface === surf);
  const surfLast5 = surfResults.slice(-5);
  const surfWins = surfLast5.filter(r => r.won).length;
  const surfScore = surfLast5.length > 0 ? surfWins / surfLast5.length : 0.5;

  const newSurfaceForm = {
    ...rf.surfaceForm,
    [surf]: surfScore,
  };

  // FASE 3: tiebreakForm — confiança histórica em tiebreaks (últimas 6 entradas com tiebreak)
  const tbEntries = newResults
    .filter(r => r.tiebreakWon !== null || r.tiebreakLost !== null)
    .slice(-6);
  let tiebreakForm = rf.tiebreakForm ?? 0.5;
  if (tbEntries.length > 0) {
    let tbWeightSum = 0, tbTotalW = 0;
    tbEntries.forEach((r, i) => {
      const w = i + 1;
      tbWeightSum += (r.tiebreakWon ? 1 : 0) * w;
      tbTotalW += w;
    });
    tiebreakForm = tbTotalW > 0 ? tbWeightSum / tbTotalW : 0.5;
  }

  return {
    ...player,
    recentForm: {
      results:      newResults,
      formScore,
      hotStreak,
      coldStreak,
      surfaceForm:  newSurfaceForm,
      tiebreakForm,
    },
  };
}

/**
 * Calcula modificadores de qualidade, erro e saque para uso no motor (game.js).
 * Chamado uma vez por partida em initGameState via initContextConf.
 *
 * Ranges calibrados para impacto sutil:
 *   qualityMod: 0.91 (forma mínima) → 1.09 (forma máxima) — ±9% em qualidade base
 *   errorMod:   1.08 (forma mínima) → 0.92 (forma máxima) — ±8% em taxa de erro
 *   serveMod:   0.94 (forma mínima) → 1.06 (forma máxima) — ±6% na confiança do saque
 *
 * @param {object} player  — objeto do jogador (com recentForm opcional)
 * @param {string} surface — superfície uppercase: 'CLAY' | 'GRASS' | 'HARD' | 'INDOOR'
 * @returns {{ qualityMod: number, errorMod: number, serveMod: number }}
 */
export function getFormModifiers(player, surface) {
  const rf = player.recentForm ?? null;
  if (!rf) return { qualityMod: 1.0, errorMod: 1.0, serveMod: 1.0 };

  const base     = rf.formScore ?? 0.5;
  const surfKey  = (surface ?? 'HARD').toUpperCase();
  const surfForm = rf.surfaceForm?.[surfKey] ?? base;

  // surfForm = 0..1; 0.5 = neutro → modificador 0
  let qualityMod = 0.91 + surfForm * 0.18;   // 0.91..1.09
  let errorMod   = 1.08 - surfForm * 0.16;   // 1.08..0.92 (maior surfForm → menos erros)
  let serveMod   = 0.94 + surfForm * 0.12;   // 0.94..1.06

  // FASE 4 — Bônus de identidade de superfície: especialista joga melhor na sua superfície.
  // +0.03 em qualidade; -0.02 em erro; +0.02 no saque. Sutil mas consistente.
  if (player.surfaceIdentity?.surface === surfKey) {
    qualityMod += 0.03;
    errorMod   -= 0.02;
    serveMod   += 0.02;
  }

  return { qualityMod, errorMod, serveMod };
}

// ─────────────────────────────────────────────────────────────────
// COMPONENTE — FORMA TAB
// ─────────────────────────────────────────────────────────────────

// Tokens de design (espelha o UniverseManager + UnifiedPlayerProfile)
const F = {
  bg:         '#080F0C',
  bgPanel:    '#0F1C13',
  bgCard:     '#131F17',
  bgHover:    '#1C3020',
  border:     'rgba(255,255,255,.08)',
  borderMid:  'rgba(255,255,255,.14)',
  white:      '#FFFFFF',
  textDim:    'rgba(255,255,255,.60)',
  textFaint:  'rgba(255,255,255,.28)',
  display:    "'Oswald', sans-serif",
  body:       "'Source Sans 3', sans-serif",
  mono:       "'DM Mono', monospace",
};

/** Régua horizontal com 7 zonas e indicador de posição */
function FormRuler({ pts }) {
  const canvasRef = useRef(null);
  const clamped   = clampFormPoints(pts ?? 0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const W = canvas.offsetWidth;
    const H = canvas.offsetHeight;
    canvas.width  = W * window.devicePixelRatio;
    canvas.height = H * window.devicePixelRatio;
    const ctx = canvas.getContext('2d');
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    // ── Zonas (esquerda = -100, direita = +100) ──
    // Mapeamos [-100, +100] → [0, W]
    const toX = v => ((v + 100) / 200) * W;

    const ZONES = [
      { from: -100, to: -75,  color: '#FF1744' },  // FUNDO
      { from: -75,  to: -40,  color: '#FF6E40' },  // FASE_RUIM
      { from: -40,  to: -15,  color: '#FFAB40' },  // PERF_MAL
      { from: -15,  to:  15,  color: '#546E7A' },  // NORMAL (escuro)
      { from:  15,  to:  40,  color: '#B9F6CA' },  // BOA_FORMA
      { from:  40,  to:  75,  color: '#69F0AE' },  // GRANDE_FORMA
      { from:  75,  to: 100,  color: '#00E5FF' },  // IMPARÁVEL
    ];

    const barY  = H * 0.46;
    const barH  = H * 0.22;

    // Fundo da trilha
    ctx.fillStyle = 'rgba(255,255,255,.04)';
    ctx.fillRect(0, barY, W, barH);

    // Zonas coloridas
    ZONES.forEach(z => {
      const x1 = toX(z.from);
      const x2 = toX(z.to);
      const grad = ctx.createLinearGradient(x1, 0, x2, 0);
      grad.addColorStop(0, z.color + '55');
      grad.addColorStop(1, z.color + '99');
      ctx.fillStyle = grad;
      ctx.fillRect(x1, barY, x2 - x1, barH);
    });

    // Linhas de divisão de zona
    [-75, -40, -15, 15, 40, 75].forEach(v => {
      ctx.strokeStyle = 'rgba(0,0,0,.35)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(toX(v), barY - 2);
      ctx.lineTo(toX(v), barY + barH + 2);
      ctx.stroke();
    });

    // Ticks menores a cada 10
    for (let v = -100; v <= 100; v += 10) {
      const x = toX(v);
      ctx.strokeStyle = 'rgba(255,255,255,.12)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, barY + barH);
      ctx.lineTo(x, barY + barH + 4);
      ctx.stroke();

      if (v % 25 === 0) {
        ctx.fillStyle = 'rgba(255,255,255,.20)';
        ctx.font = `8px 'DM Mono', monospace`;
        ctx.textAlign = 'center';
        ctx.fillText(v === 0 ? '0' : (v > 0 ? `+${v}` : `${v}`), x, H * 0.95);
      }
    }

    // Borda da barra
    ctx.strokeStyle = 'rgba(255,255,255,.08)';
    ctx.lineWidth = 1;
    ctx.strokeRect(0, barY, W, barH);

    // ── Indicador (agulha) ──
    const nx = toX(clamped);
    const state = getFormState(clamped);

    // Linha vertical da agulha
    ctx.strokeStyle = state.color;
    ctx.lineWidth = 2;
    ctx.shadowColor = state.colorGlow;
    ctx.shadowBlur  = 12;
    ctx.beginPath();
    ctx.moveTo(nx, barY - 10);
    ctx.lineTo(nx, barY + barH + 6);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Círculo da agulha
    ctx.beginPath();
    ctx.arc(nx, barY - 14, 6, 0, Math.PI * 2);
    ctx.fillStyle = state.color;
    ctx.shadowColor = state.colorGlow;
    ctx.shadowBlur = 14;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(0,0,0,.5)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Valor de pontos acima da agulha
    ctx.font = `bold 11px 'DM Mono', monospace`;
    ctx.textAlign = 'center';
    ctx.fillStyle = state.color;
    ctx.fillText(clamped > 0 ? `+${clamped}` : `${clamped}`, nx, barY - 26);

  }, [pts]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: '100%', height: 80, display: 'block' }}
    />
  );
}

/**
 * FormaTab — aba completa de forma para o UnifiedPlayerProfile
 *
 * Props:
 *   np         {object}  — dados do jogador (players.js)
 *   sc         {string}  — cor de destaque da superfície do jogador
 *   formPoints {number}  — pontos de forma atual (default 0)
 *   formHistory {Array}  — [{round, label, delta, tournamentName, year}]
 */
export default function FormaTab({ np, sc, formPoints = 0, formHistory = [] }) {
  const pts    = clampFormPoints(formPoints);
  const state  = getFormState(pts);
  const nextUp = pointsToNextState(pts);
  const nextDn = pointsToPrevState(pts);

  // Calcular prévia dos atributos com e sem forma
  const baseAttrs = np?.attrs ?? {};
  const modAttrs  = applyFormModifier(baseAttrs, pts);

  // Encontrar atributos que mais mudam
  const attrChanges = Object.entries(baseAttrs)
    .filter(([, v]) => typeof v === 'number')
    .map(([key, base]) => ({
      key,
      base,
      modified: modAttrs[key] ?? base,
      delta: (modAttrs[key] ?? base) - base,
    }))
    .filter(a => a.delta !== 0)
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
    .slice(0, 6);

  const modSign  = state.attributeImpact > 0 ? '+' : '';
  const modLabel = state.attributeImpact === 0
    ? 'Sem modificação'
    : `${modSign}${state.attributeImpact} de impacto competitivo focalizado`;

  const hasHistory = formHistory.length > 0;

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      overflowY: 'auto', background: F.bg,
      scrollbarWidth: 'thin', scrollbarColor: '#1C3020 transparent',
    }}>
      <div style={{ maxWidth: 960, margin: '0 auto', width: '100%', padding: '24px 28px 48px' }}>

        {/* ── Estado atual — hero ── */}
        <div style={{
          background: state.colorDim,
          border: `1px solid ${state.color}33`,
          borderLeft: `4px solid ${state.color}`,
          padding: '22px 26px',
          marginBottom: 20,
          display: 'flex',
          alignItems: 'center',
          gap: 20,
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* Número fantasma de fundo */}
          <div style={{
            position: 'absolute', right: 16, top: '50%',
            transform: 'translateY(-50%)',
            fontFamily: F.display, fontSize: 120, fontWeight: 700,
            color: `${state.color}08`, lineHeight: 1, pointerEvents: 'none',
            userSelect: 'none',
          }}>
            {pts > 0 ? `+${pts}` : `${pts}`}
          </div>

          <div style={{
            fontSize: 44, flexShrink: 0, lineHeight: 1,
            filter: `drop-shadow(0 0 12px ${state.colorGlow})`,
          }}>
            {state.icon}
          </div>

          <div style={{ flex: 1, position: 'relative', zIndex: 1 }}>
            <div style={{
              fontFamily: F.mono, fontSize: 9, letterSpacing: '.35em',
              color: state.color, textTransform: 'uppercase', marginBottom: 6,
            }}>
              Estado de Forma Atual
            </div>
            <div style={{
              fontFamily: F.display, fontSize: 'clamp(26px,4vw,42px)',
              fontWeight: 700, color: F.white, textTransform: 'uppercase',
              letterSpacing: '.04em', lineHeight: 1, marginBottom: 8,
            }}>
              {state.label}
            </div>
            <div style={{
              fontFamily: F.mono, fontSize: 11, letterSpacing: '.15em',
                color: state.attributeImpact === 0 ? F.textFaint : state.color,
            }}>
              {modLabel}
            </div>
          </div>

          {/* Pontuação */}
          <div style={{ textAlign: 'center', flexShrink: 0, position: 'relative', zIndex: 1 }}>
            <div style={{
              fontFamily: F.display, fontSize: 60, fontWeight: 700,
              color: state.color, lineHeight: 1,
              textShadow: `0 0 20px ${state.colorGlow}`,
            }}>
              {pts > 0 ? `+${pts}` : `${pts}`}
            </div>
            <div style={{
              fontFamily: F.mono, fontSize: 9, letterSpacing: '.35em',
              color: F.textFaint, textTransform: 'uppercase', marginTop: 4,
            }}>
              Pontos
            </div>
          </div>
        </div>

        {/* ── A Régua ── */}
        <div style={{
          background: F.bgCard, border: `1px solid ${F.border}`,
          padding: '20px 22px', marginBottom: 20,
        }}>
          <div style={{
            fontFamily: F.mono, fontSize: 9, letterSpacing: '.4em',
            color: F.textFaint, textTransform: 'uppercase', marginBottom: 14,
          }}>
            Régua de Forma
          </div>

          <FormRuler pts={pts} />

          {/* Legenda das zonas abaixo da régua */}
          <div style={{
            display: 'flex', justifyContent: 'space-between',
            marginTop: 10, gap: 2,
          }}>
            {FORM_STATES.slice().reverse().map(s => (
              <div key={s.id} style={{
                textAlign: 'center', flex: 1,
                opacity: getFormState(pts).id === s.id ? 1 : 0.4,
                transition: 'opacity .2s',
              }}>
                <div style={{ fontSize: 10 }}>{s.icon}</div>
                <div style={{
                  fontFamily: F.mono, fontSize: 7,
                  letterSpacing: '.1em', color: s.color,
                  textTransform: 'uppercase', marginTop: 2,
                  whiteSpace: 'nowrap', overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}>
                  {s.shortLabel}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Row: Progressão + Impacto nos Atributos ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>

          {/* Progressão */}
          <div style={{ background: F.bgCard, border: `1px solid ${F.border}`, padding: '18px 20px' }}>
            <div style={{
              fontFamily: F.mono, fontSize: 9, letterSpacing: '.4em',
              color: F.textFaint, textTransform: 'uppercase', marginBottom: 16,
            }}>
              Próximos Patamares
            </div>

            {/* Subir */}
            <div style={{ marginBottom: 14 }}>
              <div style={{
                fontFamily: F.mono, fontSize: 9, letterSpacing: '.2em',
                color: '#69F0AE', marginBottom: 8,
              }}>
                ▲ SUBIR
              </div>
              {nextUp !== null ? (
                <div style={{
                  background: 'rgba(105,240,174,.05)',
                  border: '1px solid rgba(105,240,174,.15)',
                  padding: '10px 14px',
                }}>
                  <span style={{ fontFamily: F.display, fontSize: 22, fontWeight: 700, color: '#69F0AE' }}>
                    +{nextUp}
                  </span>
                  <span style={{
                    fontFamily: F.mono, fontSize: 10,
                    color: F.textFaint, marginLeft: 8, letterSpacing: '.2em',
                  }}>
                    pontos necessários
                  </span>
                </div>
              ) : (
                <div style={{
                  fontFamily: F.mono, fontSize: 10, color: '#00E5FF',
                  letterSpacing: '.2em', padding: '10px 14px',
                  background: 'rgba(0,229,255,.05)',
                  border: '1px solid rgba(0,229,255,.15)',
                }}>
                  ⚡ PATAMAR MÁXIMO ATINGIDO
                </div>
              )}
            </div>

            {/* Cair */}
            <div>
              <div style={{
                fontFamily: F.mono, fontSize: 9, letterSpacing: '.2em',
                color: '#FFAB40', marginBottom: 8,
              }}>
                ▼ CAIR
              </div>
              {nextDn !== null ? (
                <div style={{
                  background: 'rgba(255,171,64,.05)',
                  border: '1px solid rgba(255,171,64,.15)',
                  padding: '10px 14px',
                }}>
                  <span style={{ fontFamily: F.display, fontSize: 22, fontWeight: 700, color: '#FFAB40' }}>
                    -{nextDn}
                  </span>
                  <span style={{
                    fontFamily: F.mono, fontSize: 10,
                    color: F.textFaint, marginLeft: 8, letterSpacing: '.2em',
                  }}>
                    pontos para piorar
                  </span>
                </div>
              ) : (
                <div style={{
                  fontFamily: F.mono, fontSize: 10, color: '#FF1744',
                  letterSpacing: '.2em', padding: '10px 14px',
                  background: 'rgba(255,23,68,.05)',
                  border: '1px solid rgba(255,23,68,.15)',
                }}>
                  💀 PATAMAR MÍNIMO ATINGIDO
                </div>
              )}
            </div>

            {/* Reset sazonal */}
            <div style={{
              marginTop: 16, padding: '12px 14px',
              background: 'rgba(255,255,255,.03)',
              border: `1px dashed ${F.border}`,
            }}>
              <div style={{
                fontFamily: F.mono, fontSize: 9, letterSpacing: '.3em',
                color: F.textFaint, textTransform: 'uppercase', marginBottom: 4,
              }}>
                🔄 Reset de Temporada (preserva 25%)
              </div>
              <div style={{ fontFamily: F.display, fontSize: 16, color: F.textDim }}>
                {pts > 0 ? `+${pts}` : `${pts}`}
                <span style={{ color: F.textFaint, margin: '0 8px' }}>→</span>
                <span style={{ color: F.white }}>
                  {(() => { const r = applySeasonReset(pts); return r > 0 ? `+${r}` : `${r}`; })()}
                </span>
              </div>
              <div style={{
                fontFamily: F.mono, fontSize: 9, color: F.textFaint,
                marginTop: 4, letterSpacing: '.15em',
              }}>
                Estado: <span style={{ color: getFormState(applySeasonReset(pts)).color }}>
                  {getFormState(applySeasonReset(pts)).label}
                </span>
              </div>
            </div>
          </div>

          {/* Impacto nos atributos */}
          <div style={{ background: F.bgCard, border: `1px solid ${F.border}`, padding: '18px 20px' }}>
            <div style={{
              fontFamily: F.mono, fontSize: 9, letterSpacing: '.4em',
              color: F.textFaint, textTransform: 'uppercase', marginBottom: 16,
            }}>
              Impacto nos Atributos
            </div>

            {state.attributeImpact === 0 ? (
              <div style={{
                fontFamily: F.body, fontSize: 14, color: F.textFaint,
                textAlign: 'center', padding: '24px 0',
              }}>
                Sem modificador ativo.<br/>
                <span style={{ fontSize: 12, opacity: .6 }}>Atributos no valor base.</span>
              </div>
            ) : (
              <>
                {/* Badge de modificador */}
                <div style={{
                  background: state.colorDim,
                  border: `1px solid ${state.color}33`,
                  padding: '8px 14px',
                  marginBottom: 14,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                }}>
                  <div style={{
                    fontFamily: F.display, fontSize: 28, fontWeight: 700,
                    color: state.color,
                  }}>
                    {modSign}{state.attributeImpact}
                  </div>
                  <div style={{
                    fontFamily: F.mono, fontSize: 9, letterSpacing: '.25em',
                    color: F.textFaint, lineHeight: 1.6,
                  }}>
                    EXECUÇÃO E<br/>CONFIANÇA
                  </div>
                </div>

                {/* Amostra de atributos */}
                {attrChanges.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {attrChanges.map(({ key, base, modified, delta }) => (
                      <div key={key} style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                      }}>
                        <div style={{
                          fontFamily: F.mono, fontSize: 9, letterSpacing: '.15em',
                          color: F.textFaint, textTransform: 'uppercase',
                          width: 72, flexShrink: 0,
                        }}>
                          {key}
                        </div>
                        {/* Barra base */}
                        <div style={{
                          flex: 1, height: 4, background: 'rgba(255,255,255,.07)',
                          position: 'relative', overflow: 'hidden',
                        }}>
                          <div style={{
                            position: 'absolute', left: 0, top: 0, height: '100%',
                            width: `${base}%`,
                            background: 'rgba(255,255,255,.20)',
                          }} />
                          <div style={{
                            position: 'absolute', left: 0, top: 0, height: '100%',
                            width: `${modified}%`,
                            background: state.color,
                            opacity: .7,
                          }} />
                        </div>
                        <div style={{
                          fontFamily: F.mono, fontSize: 10, fontWeight: 700,
                          color: F.white, width: 22, textAlign: 'right', flexShrink: 0,
                        }}>
                          {modified}
                        </div>
                        <div style={{
                          fontFamily: F.mono, fontSize: 9, fontWeight: 700,
                          color: delta > 0 ? '#69F0AE' : '#FF6E40',
                          width: 26, textAlign: 'right', flexShrink: 0,
                        }}>
                          {delta > 0 ? `+${delta}` : `${delta}`}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ fontFamily: F.body, fontSize: 12, color: F.textFaint }}>
                    Sem atributos mapeados.
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* ── Tabela de ganhos por rodada ── */}
        <div style={{
          background: F.bgCard, border: `1px solid ${F.border}`,
          padding: '18px 20px', marginBottom: 20,
        }}>
          <div style={{
            fontFamily: F.mono, fontSize: 9, letterSpacing: '.4em',
            color: F.textFaint, textTransform: 'uppercase', marginBottom: 16,
          }}>
            Pontos por Resultado
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Rodada','Vitória','Derrota','Saldo'].map(h => (
                    <th key={h} style={{
                      fontFamily: F.mono, fontSize: 9, letterSpacing: '.25em',
                      color: F.textFaint, textTransform: 'uppercase',
                      padding: '8px 12px', borderBottom: `1px solid ${F.border}`,
                      textAlign: 'left', fontWeight: 400,
                    }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {FORM_POINTS_TABLE.map((row, i) => (
                  <tr key={i} style={{ borderBottom: `1px solid ${F.border}` }}>
                    <td style={{
                      padding: '10px 12px',
                      fontFamily: F.display, fontSize: 14, fontWeight: 600,
                      color: F.white, textTransform: 'uppercase', letterSpacing: '.05em',
                    }}>
                      {ROUND_LABELS[i]}
                    </td>
                    <td style={{
                      padding: '10px 12px',
                      fontFamily: F.mono, fontSize: 13, fontWeight: 700, color: '#69F0AE',
                    }}>
                      +{row.win}
                    </td>
                    <td style={{
                      padding: '10px 12px',
                      fontFamily: F.mono, fontSize: 13, fontWeight: 700, color: '#FF6E40',
                    }}>
                      {row.loss}
                    </td>
                    <td style={{
                      padding: '10px 12px',
                      fontFamily: F.mono, fontSize: 11, color: F.textFaint,
                    }}>
                      {row.win + row.loss > 0
                        ? `+${row.win + row.loss}`
                        : `${row.win + row.loss}`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{
            fontFamily: F.mono, fontSize: 9, letterSpacing: '.2em',
            color: F.textFaint, marginTop: 12, paddingTop: 12,
            borderTop: `1px solid ${F.border}`,
          }}>
            * Finalista perde apenas −2 pt. Pontos somados ao longo do torneio.
          </div>
        </div>

        {/* ── Histórico de forma ── */}
        {hasHistory && (
          <div style={{ background: F.bgCard, border: `1px solid ${F.border}`, padding: '18px 20px' }}>
            <div style={{
              fontFamily: F.mono, fontSize: 9, letterSpacing: '.4em',
              color: F.textFaint, textTransform: 'uppercase', marginBottom: 14,
            }}>
              Últimos Eventos de Forma
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {formHistory.slice(-10).reverse().map((ev, i) => {
                const isPos = ev.delta > 0;
                return (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '8px 12px',
                    background: isPos ? 'rgba(105,240,174,.04)' : 'rgba(255,110,64,.04)',
                    borderLeft: `3px solid ${isPos ? '#69F0AE' : '#FF6E40'}33`,
                  }}>
                    <span style={{
                      fontFamily: F.mono, fontSize: 11, fontWeight: 700,
                      color: isPos ? '#69F0AE' : '#FF6E40',
                      width: 32, textAlign: 'right', flexShrink: 0,
                    }}>
                      {isPos ? `+${ev.delta}` : `${ev.delta}`}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span style={{
                        fontFamily: F.display, fontSize: 12, color: F.white,
                        textTransform: 'uppercase', letterSpacing: '.05em',
                      }}>
                        {ev.label}
                      </span>
                      {ev.tournamentName && (
                        <span style={{ fontFamily: F.mono, fontSize: 9, color: F.textFaint, marginLeft: 8 }}>
                          {ev.tournamentName}
                        </span>
                      )}
                    </div>
                    <span style={{ fontFamily: F.mono, fontSize: 9, color: F.textFaint, flexShrink: 0 }}>
                      {ev.year}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Placeholder se não tem histórico */}
        {!hasHistory && (
          <div style={{
            background: F.bgCard, border: `1px dashed ${F.border}`,
            padding: '28px 20px', textAlign: 'center',
          }}>
            <div style={{ fontSize: 24, marginBottom: 10 }}>📋</div>
            <div style={{
              fontFamily: F.mono, fontSize: 9, letterSpacing: '.35em',
              color: F.textFaint, textTransform: 'uppercase',
            }}>
              Histórico disponível após o primeiro torneio
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

