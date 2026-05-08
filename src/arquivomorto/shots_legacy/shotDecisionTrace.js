import { clamp } from '../../core/math.js';

export function buildStratifiedAiTrace({
  poolBefore,
  poolAfter,
  normalizedPool,
  probabilities,
  shotType,
  shot,
  sigResult,
  prefs,
  intentPack,
  temperature,
  ballTier,
  netPhase,
  wingIdentity,
  pointPatternPlan,
  thoughtLayer,
  situationTrace,
}) {
  const deltaEntries = Object.keys({ ...(poolBefore ?? {}), ...(poolAfter ?? {}) })
    .map((key) => {
      const before = poolBefore?.[key] ?? 0;
      const after = poolAfter?.[key] ?? 0;
      return {
        shotType: key,
        before: +before.toFixed(3),
        after: +after.toFixed(3),
        delta: +(after - before).toFixed(3),
      };
    })
    .filter((entry) => Math.abs(entry.delta) >= 0.025)
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));

  const entries = Object.entries(probabilities ?? normalizedPool ?? {})
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1]);

  const scored = entries.map(([type, prob]) => ({
    EV: prob,
    c: {
      shotType: type,
      targetX: shot?.targetX ?? 0,
      targetDepth: Math.abs(shot?.targetY ?? 0) / 11.885,
      power: clamp((shot?.power ?? 20) / 35, 0.1, 1),
      intentTags: [intentPack?.intent ?? 'BUILD'],
    },
    sub: {
      safety: clamp(1 - prob * 0.55, 0.12, 0.95),
      pressure: clamp(prob * 0.95, 0.05, 0.98),
      finish: clamp((intentPack?.intent === 'FINISH' ? 0.55 : 0.25) + prob * 0.45, 0.05, 0.98),
      rhythm: clamp((intentPack?.intent === 'BUILD' ? 0.40 : 0.22) + prob * 0.30, 0.05, 0.90),
      angle: clamp((type === 'SHORT_ACCEL' || type === 'BANANA') ? 0.80 : 0.30, 0.05, 0.90),
      depth: clamp((type === 'TOPSPIN' || type === 'ACCEL' || type === 'DRIVE') ? 0.72 : 0.42, 0.05, 0.90),
    },
    desiredDepth: Math.abs(shot?.targetY ?? 0) / 11.885,
  }));

  const chosen = scored.find(entry => entry.c.shotType === shotType) ?? scored[0] ?? null;
  if (chosen) chosen._evProbWin = clamp(probabilities?.[shotType] ?? normalizedPool?.[shotType] ?? 0.4, 0, 1);

  return {
    scored,
    chosen,
    chosenDirLabel: shot?._dirChoice ?? 'CC',
    signatureShotTriggered: sigResult?.triggered ? sigResult.signatureKey : null,
    signatureLabel: sigResult?.triggered ? sigResult.label : null,
    signatureEmoji: sigResult?.triggered ? sigResult.emoji : null,
    signatureSource: sigResult?.triggered ? sigResult.source : null,
    rallyPatternApplied: prefs?.buildStyle ?? null,
    intentPack,
    pools: {
      before: poolBefore,
      after: poolAfter,
      normalized: normalizedPool,
      probabilities,
      deltas: deltaEntries,
    },
    sc: {
      intent: intentPack?.intent ?? 'BUILD',
      intentReason: intentPack?.reason ?? 'UNKNOWN',
      motive: shot?._motive ?? 'NEUTRALIZE',
      ballTier,
      easyBall: ballTier === 'OPPORTUNITY',
      toughBall: ballTier === 'DIFFICULT',
      temperature: +temperature.toFixed(3),
      executionState: shot?._executionState ?? 'NEUTRAL',
      netPhase,
      wingIdentity: wingIdentity?.dominantWing ?? null,
      pointPattern: pointPatternPlan?.name ?? null,
      thoughtSummary: thoughtLayer?.topReasons ?? [],
    },
    diagnostics: {
      intent: intentPack?.diagnostics ?? null,
      situation: situationTrace ?? null,
    },
    thoughtLayer,
  };
}
