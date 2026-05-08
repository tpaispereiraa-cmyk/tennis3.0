function avg(values = []) {
  if (!Array.isArray(values) || values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function safePct(num, den) {
  return den > 0 ? num / den : 0;
}

function roundStat(value, digits = 3) {
  const pow = 10 ** digits;
  return Math.round((value ?? 0) * pow) / pow;
}

export function buildMatchTelemetry(statsA = {}, statsB = {}, extras = {}) {
  const ralliesA = statsA.rallyLengths ?? [];
  const ralliesB = statsB.rallyLengths ?? [];
  const allRallies = [...ralliesA, ...ralliesB];

  const serve1Total = (statsA.serve1Total ?? 0) + (statsB.serve1Total ?? 0);
  const serve1In = (statsA.serve1In ?? 0) + (statsB.serve1In ?? 0);
  const serve2Total = (statsA.serve2Total ?? 0) + (statsB.serve2Total ?? 0);
  const serve2In = (statsA.serve2In ?? 0) + (statsB.serve2In ?? 0);

  const aces = (statsA.aces ?? 0) + (statsB.aces ?? 0);
  const winners = (statsA.winners ?? 0) + (statsB.winners ?? 0);
  const unforcedErrors = (statsA.unforcedErrors ?? 0) + (statsB.unforcedErrors ?? 0);
  const forcedErrors = (statsA.forcedErrors ?? 0) + (statsB.forcedErrors ?? 0);

  return {
    pointsPlayed: extras.points ?? allRallies.length,
    avgRallyLength: roundStat(avg(allRallies), 2),
    maxRallyLength: allRallies.length ? Math.max(...allRallies) : 0,
    aces,
    winners,
    unforcedErrors,
    forcedErrors,
    errorBlend: roundStat(safePct(forcedErrors, forcedErrors + unforcedErrors), 3),
    serve1InPct: roundStat(safePct(serve1In, serve1Total), 3),
    serve2InPct: roundStat(safePct(serve2In, serve2Total), 3),
    holdRateA: roundStat(safePct(statsA.gamesHeld ?? 0, statsA.gamesServed ?? 0), 3),
    holdRateB: roundStat(safePct(statsB.gamesHeld ?? 0, statsB.gamesServed ?? 0), 3),
    breakRateA: roundStat(safePct(statsA.gamesConverted ?? 0, statsA.gamesReturned ?? 0), 3),
    breakRateB: roundStat(safePct(statsB.gamesConverted ?? 0, statsB.gamesReturned ?? 0), 3),
    avgQualityA: statsA.avgQuality ?? null,
    avgQualityB: statsB.avgQuality ?? null,
    surface: extras.surface ?? null,
    courtKey: extras.courtKey ?? null,
    mode: extras.mode ?? null,
    edgeCases: extras.edgeCases ?? [],
    validationFlags: extras.validationFlags ?? [],
  };
}

export function createSimulationEdgeCaseTracker() {
  return {
    flags: [],
    add(type, detail = {}) {
      this.flags.push({ type, ...detail });
    },
  };
}

export function diffTelemetry(a = {}, b = {}) {
  const keys = [
    'avgRallyLength',
    'aces',
    'winners',
    'unforcedErrors',
    'forcedErrors',
    'serve1InPct',
    'serve2InPct',
    'holdRateA',
    'holdRateB',
    'breakRateA',
    'breakRateB',
  ];
  const out = {};
  for (const key of keys) {
    const av = a[key] ?? 0;
    const bv = b[key] ?? 0;
    out[key] = roundStat(av - bv, 3);
  }
  return out;
}
