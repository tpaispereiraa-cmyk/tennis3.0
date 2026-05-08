/**
 * IndividualRating.jsx — v4.0
 *
 * Rating individual de desempenho por partida — escala 0–10.
 *
 * ── O QUE MUDOU DA v3.0 ──────────────────────────────────────────────────────
 *
 * 1. BASE 7.0 — Antes de estatísticas acumularem (poucos dados), cada pilar
 *    parte de 7.0. O jogador precisa jogar MAL para cair, não jogar bem para subir.
 *
 * 2. norm() ASSIMÉTRICA — Performances acima da média são recompensadas
 *    mais do que performances abaixo são punidas (scale+ 2.7 vs scale- 2.0).
 *    Isso abre o teto para jogos épicos atingirem 9.0–10.0 com mais frequência.
 *
 * 3. MENOS VOLATILIDADE — Sigma aumentado em winners/UE/quality/tática.
 *    Nota sobe e cai gradualmente, não em pulos bruscos.
 *
 * 4. PRESSURE SCORE (novo, 20% do pilar Qualidade) — Recompensa jogar
 *    sob pressão. Calcula a proporção de erros que foram FORÇADOS vs não-forçados.
 *    Alto = a maioria dos seus erros foi causada pelo adversário (você se defendeu
 *    bem). Baixo = erros gratuitos. Isso valida "jogar sob ataque e sobreviver".
 *
 * 5. STEAL SCORE rebalanceado — Peso de 35% → 45% dentro da tática.
 *    Ganhar pontos na defesa vale mais. Benchmark de 0.28 → 0.25 (o tour defende
 *    pior, então defender bem destaca ainda mais).
 *
 * 6. ueScore — Floor de 1.0 → 2.5. Dias ruins não colapsam a nota.
 *
 * 7. holdBonus — Amplitude ±0.30 → ±0.50. Quebrar e confirmar serviço tem
 *    mais impacto no score final.
 *
 * Exports:
 *   computeRating(stats, shotCount)  → { score, components, tier, detail }
 *   MatchRatingBadge({ stats, shotCount, surfColor })  → JSX
 */

import React from 'react';

// ── helpers ───────────────────────────────────────────────────────────────────
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

/**
 * Normaliza para 0–10 com escala assimétrica.
 * avg → 6.0
 * avg + 1σ → ~8.4
 * avg − 1σ → ~4.8
 *
 * A ideia do live rating é premiar a solidez e exigir uma partida
 * realmente ruim para despencar. Em tênis, muito jogador "ok" ao vivo
 * ainda passa sensação de 6.5–7.2, não de nota 5 o tempo todo.
 */
function norm(value, avg, sigma) {
  const z = (value - avg) / sigma;
  const scale = z >= 0 ? 2.35 : 1.20;
  return clamp(6.0 + z * scale, 1.8, 10);
}

// ── Tiers — ajustados para refletir a nova base 7.0 ──────────────────────────
const TIERS = [
  { min: 9.0, label: 'LENDÁRIO',    color: '#FFD700', glow: 'rgba(255,215,0,0.40)'   },
  { min: 7.5, label: 'EXCEPCIONAL', color: '#B0FF60', glow: 'rgba(176,255,96,0.32)'  },
  { min: 6.5, label: 'SÓLIDO',      color: '#60D0FF', glow: 'rgba(96,208,255,0.26)'  },
  { min: 5.0, label: 'REGULAR',     color: '#FFB060', glow: 'rgba(255,176,96,0.22)'  },
  { min: 3.5, label: 'ABAIXO',      color: '#FF8040', glow: 'rgba(255,128,64,0.20)'  },
  { min: 0,   label: 'FRACO',       color: '#FF5050', glow: 'rgba(255,80,80,0.20)'   },
];
function getTier(score) {
  return TIERS.find(t => score >= t.min) ?? TIERS[TIERS.length - 1];
}

// ── Função principal ──────────────────────────────────────────────────────────
/**
 * @param {object} stats     — player.stats do game.js
 * @param {number} shotCount — player.shotCount (fallback para qualityCount)
 * @returns {{ score, components, tier, detail }}
 */
export function computeRating(stats, shotCount) {
  const s = stats ?? {};

  // Base de golpes
  const shots = Math.max(
    s.qualityCount ?? 0,
    shotCount ?? 0,
    (s.winners ?? 0) + (s.unforcedErrors ?? 0) + (s.forcedErrors ?? 0) + 1
  );

  // ══════════════════════════════════════════════════════════════════════
  // PILAR 1 — QUALIDADE DE GOLPE (35%)
  // ══════════════════════════════════════════════════════════════════════

  // 1a. Qualidade média da engine (0.05–1.0); σ aumentado 0.07→0.10
  const qCount    = Math.max(s.qualityCount ?? 0, 1);
  const avgQ      = (s.qualitySum ?? 0) / qCount;
  const qualScore = (s.qualityCount ?? 0) > 5
    ? norm(avgQ, 0.53, 0.10)
    : 7.0;

  // 1b. Winner rate por golpe; σ aumentado 0.03→0.05, fallback 7.0
  const winnerRate  = (s.winners ?? 0) / shots;
  const winnerScore = shots > 8
    ? norm(winnerRate, 0.07, 0.05)
    : 7.0;

  // 1c. UE rate invertida; σ 0.03→0.05, floor 1.0→2.5, fallback 7.0
  const ueRate  = (s.unforcedErrors ?? 0) / shots;
  const ueScore = shots > 8
    ? clamp(norm(-ueRate, -0.07, 0.05), 2.5, 9.5)
    : 7.0;

  // 1d. PRESSURE SCORE — proporção de erros que foram forçados.
  //     Benchmark: 45% dos erros são forçados no tour médio.
  //     Fallback 0.55 → ligeiramente acima do benchmark → base ~7.0
  const totalErrors   = (s.forcedErrors ?? 0) + (s.unforcedErrors ?? 0);
  const pressureRatio = totalErrors > 3
    ? (s.forcedErrors ?? 0) / totalErrors
    : 0.55;
  const pressureScore = norm(pressureRatio, 0.45, 0.20);

  const qualityScore =
    qualScore     * 0.50 +
    winnerScore   * 0.15 +
    ueScore       * 0.15 +
    pressureScore * 0.20;

  // ══════════════════════════════════════════════════════════════════════
  // PILAR 2 — EXECUÇÃO DE SAQUE (30%)
  // ══════════════════════════════════════════════════════════════════════

  const srv1Tot   = Math.max(s.serve1Total ?? 0, 1);
  const srv1Score = (s.serve1Total ?? 0) > 3
    ? norm((s.serve1In ?? 0) / srv1Tot, 0.62, 0.09)
    : 7.0;

  const gSrv    = Math.max(s.gamesServed ?? 0, 1);
  const dfRaw   = (s.doubleFaults ?? 0) / gSrv;
  const dfScore = clamp(norm(-dfRaw, -0.35, 0.30), 1.5, 9.0);

  const aceRaw   = (s.aces ?? 0) / gSrv;
  const aceScore = (s.gamesServed ?? 0) > 2
    ? norm(aceRaw, 0.50, 0.40)
    : 7.0;

  const hasSpeed   = (s.serve1AvgKmh ?? 0) > 50;
  const speedScore = hasSpeed ? norm(s.serve1AvgKmh, 185, 18) : 7.0;

  const serveScore =
    srv1Score  * 0.40 +
    dfScore    * 0.25 +
    aceScore   * 0.20 +
    speedScore * 0.15;

  // ══════════════════════════════════════════════════════════════════════
  // PILAR 3 — TÁTICA: CONVERSION + STEAL (35%)
  // Steal: 35% → 45%. Benchmark 0.28 → 0.25. σ 0.10 → 0.14.
  // ══════════════════════════════════════════════════════════════════════

  const atkPlayed = s.attackPointsPlayed ?? 0;
  const convScore = atkPlayed > 3
    ? norm((s.attackPointsWon ?? 0) / atkPlayed, 0.65, 0.14)
    : 7.0;

  const defPlayed  = s.defensePointsPlayed ?? 0;
  const stealScore = defPlayed > 3
    ? norm((s.defensePointsWon ?? 0) / defPlayed, 0.25, 0.14)
    : 7.0;

  const tacticScore = convScore * 0.55 + stealScore * 0.45;

  // ══════════════════════════════════════════════════════════════════════
  // SCORE FINAL
  // ══════════════════════════════════════════════════════════════════════
  const raw = clamp(
    qualityScore * 0.35 +
    serveScore   * 0.30 +
    tacticScore  * 0.35,
    0, 10
  );

  // holdBonus ampliado: ±0.30 → ±0.50
  const holdBonus = (() => {
    const g = s.gamesServed ?? 0;
    if (g < 3) return 0;
    const hp = (s.gamesHeld ?? 0) / g;
    return clamp((hp - 0.65) / 0.35 * 0.50, -0.50, 0.50);
  })();

  const score = clamp(raw + holdBonus, 0, 10);

  const srv1PctVal  = (s.serve1Total ?? 0) > 3 ? (s.serve1In ?? 0) / srv1Tot : null;
  const convRateVal = atkPlayed > 3 ? (s.attackPointsWon ?? 0) / atkPlayed : null;
  const stlRateVal  = defPlayed > 3 ? (s.defensePointsWon ?? 0) / defPlayed : null;

  return {
    score: Math.round(score * 10) / 10,
    components: {
      qualidade: { score: Math.round(qualityScore * 10) / 10, label: 'QUALIDADE', weight: 0.35 },
      saque:     { score: Math.round(serveScore   * 10) / 10, label: 'SAQUE',     weight: 0.30 },
      tatica:    { score: Math.round(tacticScore  * 10) / 10, label: 'TÁTICA',    weight: 0.35 },
    },
    tier: getTier(score),
    detail: {
      avgQuality:    Math.round(avgQ * 100) / 100,
      srv1Pct:       srv1PctVal  != null ? Math.round(srv1PctVal  * 100) : '—',
      convRate:      convRateVal != null ? Math.round(convRateVal * 100) : '—',
      stealRate:     stlRateVal  != null ? Math.round(stlRateVal  * 100) : '—',
      winnerRate:    Math.round(winnerRate   * 100),
      ueRate:        Math.round(ueRate       * 100),
      pressureRatio: Math.round(pressureRatio * 100),
    },
  };
}

// ── React component ───────────────────────────────────────────────────────────
export function MatchRatingBadge({ stats, shotCount, surfColor = '#c8571a' }) {
  const { score, components, tier, detail } = computeRating(stats, shotCount);

  const hasData = (stats?.qualityCount ?? 0) > 5 ||
    ((stats?.winners ?? 0) + (stats?.aces ?? 0) + (stats?.unforcedErrors ?? 0)) > 3;

  const R = 22, cx = 30, cy = 30;
  const circumference = 2 * Math.PI * R;
  const arcFrac = hasData ? Math.min(score / 10, 1) : 0;
  const dashArr = `${arcFrac * circumference} ${circumference}`;

  return (
    <div style={{ padding: '8px 14px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
      <div style={{
        fontFamily: 'Rajdhani, monospace', fontSize: 6, letterSpacing: 3,
        color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', marginBottom: 6,
      }}>RATING</div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ flexShrink: 0 }}>
          <svg width={60} height={60} style={{ display: 'block' }}>
            <circle cx={cx} cy={cy} r={R} fill="none"
              stroke="rgba(255,255,255,0.06)" strokeWidth={4} />
            <circle cx={cx} cy={cy} r={R} fill="none"
              stroke={hasData ? tier.color : 'rgba(255,255,255,0.12)'}
              strokeWidth={4} strokeLinecap="round"
              strokeDasharray={dashArr} strokeDashoffset={0}
              transform={`rotate(-90 ${cx} ${cy})`}
              style={{
                transition: 'stroke-dasharray 0.8s cubic-bezier(.4,0,.2,1)',
                filter: hasData ? `drop-shadow(0 0 4px ${tier.glow})` : 'none',
              }}
            />
            <text x={cx} y={cy + 1} textAnchor="middle" dominantBaseline="middle"
              fontFamily="Rajdhani, monospace" fontWeight="900"
              fontSize={hasData ? 14 : 10}
              fill={hasData ? tier.color : 'rgba(255,255,255,0.2)'}
            >
              {hasData ? score.toFixed(1) : '—'}
            </text>
          </svg>
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          {hasData && (
            <div style={{
              fontFamily: 'Rajdhani, monospace', fontSize: 9, fontWeight: 700,
              letterSpacing: 2, color: tier.color, textTransform: 'uppercase',
              marginBottom: 5, textShadow: `0 0 8px ${tier.glow}`,
            }}>{tier.label}</div>
          )}

          {Object.values(components).map(({ label, score: cs }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 3 }}>
              <span style={{
                fontFamily: 'Rajdhani, monospace', fontSize: 6, letterSpacing: 1,
                color: 'rgba(255,255,255,0.20)', width: 44, flexShrink: 0, textTransform: 'uppercase',
              }}>{label}</span>
              <div style={{
                flex: 1, height: 2, background: 'rgba(255,255,255,0.05)',
                overflow: 'hidden', position: 'relative',
              }}>
                <div style={{
                  height: '100%',
                  width: hasData ? `${cs * 10}%` : '0%',
                  background: hasData ? `linear-gradient(90deg,${surfColor}88,${surfColor})` : 'transparent',
                  transition: 'width 0.7s cubic-bezier(.4,0,.2,1)',
                }} />
              </div>
              <span style={{
                fontFamily: 'Rajdhani, monospace', fontSize: 8, fontWeight: 700,
                color: hasData ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.15)',
                width: 16, textAlign: 'right', flexShrink: 0,
              }}>{hasData ? cs.toFixed(1) : '—'}</span>
            </div>
          ))}

          {hasData && detail && (
            <div style={{
              marginTop: 4, fontFamily: 'Rajdhani, monospace',
              fontSize: 6, color: 'rgba(255,255,255,0.14)', letterSpacing: 1,
            }}>
              {`Q:${detail.avgQuality.toFixed(2)}  1S:${detail.srv1Pct}%  CNV:${detail.convRate}%  STL:${detail.stealRate}%  PRE:${detail.pressureRatio}%`}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
