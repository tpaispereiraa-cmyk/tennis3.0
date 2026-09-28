import { clamp } from '../../core/math.js';

export const SURFACE_PROFILE_VERSION = 2;
export const SURFACE_KEYS = Object.freeze(['HARD', 'CLAY', 'GRASS', 'INDOOR', 'CARPET', 'STREET']);

const LABELS = Object.freeze({
  HARD: 'Hard', CLAY: 'Saibro', GRASS: 'Grama', INDOOR: 'Indoor',
  CARPET: 'Carpete', STREET: 'Asfalto',
});

const ARCHETYPES = Object.freeze({
  CLAY: [
    ['CLAY_ARCHITECT', 'Construtor de Argila'],
    ['SLIDING_DEFENDER', 'Defensor Deslizante'],
    ['MEDITERRANEAN_TOPSPIN', 'Topspin Mediterraneo'],
    ['CLAY_GEOMETER', 'Geometra do Saibro'],
  ],
  GRASS: [
    ['FIRST_STRIKE_GRASS', 'Primeiro Golpe'],
    ['GRASS_HANDS', 'Maos de Relva'],
    ['NET_HUNTER_GRASS', 'Cacador de Rede'],
    ['LOW_BOUNCE_READER', 'Leitor de Quique Baixo'],
  ],
  HARD: [
    ['PACE_ABSORBER', 'Absorvedor de Ritmo'],
    ['BASELINE_DICTATOR', 'Ditador da Linha'],
    ['CONCRETE_ELASTICITY', 'Elasticidade de Concreto'],
    ['ON_RISE_ATTACKER', 'Atacante no Tempo'],
  ],
  INDOOR: [
    ['ARENA_EXECUTOR', 'Executor de Arena'],
    ['LAB_SERVE', 'Saque de Laboratorio'],
    ['TIME_TAKER', 'Tomador de Tempo'],
    ['CONTROLLED_PRECISION', 'Precisao Controlada'],
  ],
  CARPET: [
    ['CARPET_REFLEX', 'Reflexo de Veludo'],
    ['LIGHTNING_SERVER', 'Servidor Relampago'],
    ['INSTANT_BLOCKER', 'Bloqueador Instantaneo'],
    ['REACTION_VOLLEY', 'Volley de Reacao'],
  ],
  STREET: [
    ['CONCRETE_BODY', 'Corpo de Concreto'],
    ['HIGH_BOUNCE_AGGRESSOR', 'Agressor de Quique Alto'],
    ['URBAN_POWER', 'Potencia Urbana'],
    ['IMPACT_SURVIVOR', 'Sobrevivente do Impacto'],
  ],
});

const ACADEMY_BIAS = Object.freeze({
  MEDITERRANEAN_CLAY: { CLAY: 18, HARD: 4, STREET: 3 },
  COASTAL_BASELINE: { HARD: 13, STREET: 7, CLAY: 4 },
  NORDIC_POINT: { INDOOR: 14, GRASS: 12, CARPET: 10 },
  EASTERN_DEFENSE: { HARD: 11, CLAY: 8, STREET: 3 },
  SAHEL_PATHWAYS: { STREET: 12, HARD: 8, CLAY: 3 },
  LEVANT_VARIETY: { GRASS: 10, INDOOR: 9, CARPET: 8 },
  GLOBAL_OPEN: { HARD: 6, CLAY: 4, GRASS: 4, INDOOR: 5, CARPET: 3, STREET: 3 },
});

// Traits funcionais: cada arquétipo muda decisões e execução contextual, não
// o OVR bruto. Valores pequenos se combinam com a aptidão real do piso.
const ARCHETYPE_FUNCTIONS = Object.freeze({
  CLAY_ARCHITECT: { patience: 0.045, shotBias: { TOPSPIN: 0.035, SHORT_ANGLE: 0.025 } },
  SLIDING_DEFENDER: { slide: 0.08, stamina: -0.018, shotBias: { TOPSPIN: 0.018 } },
  MEDITERRANEAN_TOPSPIN: { high: 0.045, shotBias: { TOPSPIN: 0.055, SHORT_ANGLE: 0.018 } },
  CLAY_GEOMETER: { read: 0.022, shotBias: { SHORT_ANGLE: 0.045, DROP: 0.025, REDIRECT: 0.02 } },
  FIRST_STRIKE_GRASS: { preparation: 0.038, patience: -0.035, shotBias: { FIRST_STRIKE: 0.055, FLAT_DRIVE: 0.025 } },
  GRASS_HANDS: { low: 0.04, shotBias: { SLICE: 0.045, VOLLEY: 0.035 } },
  NET_HUNTER_GRASS: { net: 0.075, shotBias: { APPROACH: 0.055, VOLLEY: 0.055 } },
  LOW_BOUNCE_READER: { read: 0.04, low: 0.035, shotBias: { BLOCK_RETURN: 0.035 } },
  PACE_ABSORBER: { return: 0.025, shotBias: { REDIRECT: 0.035 } },
  BASELINE_DICTATOR: { shotBias: { FLAT_DRIVE: 0.045, ACCEL: 0.035 } },
  CONCRETE_ELASTICITY: { braking: 0.035, stamina: -0.015, shotBias: { REDIRECT: 0.018 } },
  ON_RISE_ATTACKER: { preparation: 0.04, patience: -0.025, shotBias: { FIRST_STRIKE: 0.04, ACCEL: 0.03 } },
  ARENA_EXECUTOR: { preparation: 0.035, shotBias: { FIRST_STRIKE: 0.04, ACCEL: 0.025 } },
  LAB_SERVE: { serve: 0.035, shotBias: { FIRST_STRIKE: 0.025 } },
  TIME_TAKER: { read: 0.025, patience: -0.025, shotBias: { ACCEL: 0.04 } },
  CONTROLLED_PRECISION: { quality: 0.012, shotBias: { REDIRECT: 0.035, FLAT_DRIVE: 0.025 } },
  CARPET_REFLEX: { read: 0.035, preparation: 0.035, shotBias: { BLOCK_RETURN: 0.04 } },
  LIGHTNING_SERVER: { serve: 0.04, shotBias: { FIRST_STRIKE: 0.04 } },
  INSTANT_BLOCKER: { return: 0.035, low: 0.025, shotBias: { BLOCK_RETURN: 0.055 } },
  REACTION_VOLLEY: { net: 0.07, preparation: 0.025, shotBias: { VOLLEY: 0.055 } },
  CONCRETE_BODY: { braking: 0.035, stamina: -0.022, high: 0.018 },
  HIGH_BOUNCE_AGGRESSOR: { high: 0.045, shotBias: { TOPSPIN: 0.03, ACCEL: 0.035 } },
  URBAN_POWER: { shotBias: { POWER: 0.055, ACCEL: 0.045 } },
  IMPACT_SURVIVOR: { stamina: -0.026, braking: 0.022, shotBias: { TOPSPIN: 0.018 } },
});

const REGION_BIAS = Object.freeze({
  ARG: { CLAY: 6 }, ESP: { CLAY: 6 }, ITA: { CLAY: 4 }, BRA: { CLAY: 3 }, CHI: { CLAY: 4 },
  GBR: { GRASS: 6 }, AUS: { GRASS: 3, HARD: 3 }, SWE: { INDOOR: 4 }, NOR: { INDOOR: 4 },
  USA: { HARD: 5 }, CAN: { HARD: 4 }, RSA: { HARD: 3 }, JPN: { HARD: 4 }, CHN: { HARD: 4 },
});

function hash(value) {
  let out = 2166136261;
  for (const char of String(value ?? 'surface')) {
    out ^= char.charCodeAt(0);
    out = Math.imul(out, 16777619);
  }
  return out >>> 0;
}

function noise(seed, channel) {
  const value = hash(`${seed}:${channel}`) / 4294967295;
  return value * 2 - 1;
}

function attr(player, keys, fallback = 60) {
  const list = Array.isArray(keys) ? keys : [keys];
  for (const key of list) {
    const value = Number(player?.attrs?.[key]);
    if (Number.isFinite(value)) return value;
  }
  return fallback;
}

function avg(player, groups) {
  return groups.reduce((sum, keys) => sum + attr(player, keys), 0) / Math.max(1, groups.length);
}

function technicalFit(player, surface) {
  const fits = {
    CLAY: avg(player, [['topspin'], ['resistencia'], ['defesa'], ['fhControle', 'controle'], ['visaoTatica', 'leitura'], ['regularidade']]),
    GRASS: avg(player, [['saqueForca', 'saque'], ['saquePrecisao'], ['slice'], ['volley', 'jogoDeRede'], ['explosividade'], ['leitura']]),
    HARD: avg(player, [['fhPotencia', 'potencia'], ['bhPotencia', 'potencia'], ['regularidade'], ['devolucao'], ['controle', 'fhControle'], ['velocidade']]),
    INDOOR: avg(player, [['saquePrecisao'], ['saqueForca', 'saque'], ['agressividade'], ['explosividade'], ['controle', 'fhControle'], ['mentalidade']]),
    CARPET: avg(player, [['saqueForca', 'saque'], ['saquePrecisao'], ['volley', 'jogoDeRede'], ['slice'], ['explosividade'], ['leitura']]),
    STREET: avg(player, [['fhPotencia', 'potencia'], ['bhPotencia', 'potencia'], ['equilibrio', 'resistencia'], ['explosividade'], ['resistencia'], ['topspin']]),
  };
  return fits[surface] ?? fits.HARD;
}

function styleBias(player, surface) {
  const style = String(player?.styleId ?? '').toUpperCase();
  const values = { HARD: 0, CLAY: 0, GRASS: 0, INDOOR: 0, CARPET: 0, STREET: 0 };
  if (/RETRIEVER|GRINDER|CTR_PUNCHER/.test(style)) { values.CLAY += 8; values.HARD += 3; values.GRASS -= 5; }
  if (/SRV_VOL|NET_SPEC/.test(style)) { values.GRASS += 10; values.CARPET += 11; values.INDOOR += 7; values.CLAY -= 7; }
  if (/BIG_SERVER/.test(style)) { values.CARPET += 10; values.GRASS += 8; values.INDOOR += 8; values.CLAY -= 5; }
  if (/AGG_BASE|PWR_BASE|TAKEALLRISK/.test(style)) { values.HARD += 6; values.STREET += 7; values.INDOOR += 4; }
  if (/ALL_COURT|ADPT_TAC|TACT_TEC/.test(style)) for (const key of SURFACE_KEYS) values[key] += 3;
  return values[surface];
}

function recordEvidence(player, surface) {
  const row = player?.surfaceStats?.[surface] ?? {};
  const wins = Number(row.wins ?? 0);
  const losses = Number(row.losses ?? 0);
  const matches = wins + losses;
  if (!matches) return 0;
  const rate = wins / matches;
  // Historico antigo ajuda a reconstruir o que nao foi salvo, mas nunca pode
  // criar sozinho uma aptidao natural. O teto de 9 pontos evita circularidade.
  return clamp((rate - 0.5) * 22, -5, 7) * clamp(matches / 36, 0, 1)
    + clamp(Number(row.titlesWon ?? 0), 0, 4) * 0.5;
}

function academyInfluence(player, surface) {
  const academyId = player?.youthProfile?.academy?.academyId;
  const alignment = player?.youthProfile?.academy?.alignment;
  const strength = alignment === 'ALIGNED' ? 1 : alignment === 'ADAPTED' ? 0.72 : alignment === 'RESISTED' ? 0.36 : 0.55;
  return (ACADEMY_BIAS[academyId]?.[surface] ?? 0) * strength;
}

function chooseArchetype(player, surface, affinity) {
  if (affinity < 72) return null;
  const pool = ARCHETYPES[surface] ?? [];
  if (!pool.length) return null;
  const a = player?.attrs ?? {};
  const scores = {
    CLAY: [a.visaoTatica ?? a.leitura, a.defesa ?? a.velocidade, a.topspin, a.fhControle ?? a.controle],
    GRASS: [a.saqueForca, a.slice, a.volley, a.leitura],
    HARD: [a.devolucao, Math.max(a.fhPotencia ?? 0, a.bhPotencia ?? 0), a.velocidade, a.explosividade],
    INDOOR: [a.agressividade, a.saquePrecisao, a.explosividade, a.controle ?? a.fhControle],
    CARPET: [a.explosividade, a.saqueForca, a.devolucao, a.volley],
    STREET: [a.equilibrio ?? a.resistencia, a.topspin, Math.max(a.fhPotencia ?? 0, a.bhPotencia ?? 0), a.resistencia],
  }[surface] ?? [];
  let best = 0;
  for (let i = 1; i < pool.length; i += 1) if ((scores[i] ?? 0) > (scores[best] ?? 0)) best = i;
  return { id: pool[best][0], label: pool[best][1] };
}

function formationExposure(player, surface, affinity) {
  const academy = academyInfluence(player, surface);
  const junior = player?.youthProfile?.junior ?? {};
  const main = String(junior.mainSurface ?? junior.preferredSurface ?? '').toUpperCase();
  const explicit = Number(junior.surfaceExposure?.[surface] ?? player?.surfaceFormationMemory?.exposure?.[surface]);
  if (Number.isFinite(explicit)) return clamp(explicit, 0, 100);
  return clamp(12 + Math.max(0, academy) * 2.3 + (main === surface ? 24 : 0) + (affinity - 50) * 0.32, 4, 82);
}

function legacyBlock(player, surface) {
  const old = player?.surfaceStats?.[surface] ?? {};
  const wins = Number(old.wins ?? 0);
  const losses = Number(old.losses ?? 0);
  const matches = wins + losses;
  const titles = Number(old.titlesWon ?? 0);
  const slams = Number(old.slams ?? old.grandSlams ?? 0);
  const winRate = matches ? wins / matches : 0;
  const dominanceScore = clamp((winRate - 0.5) * 90 + Math.log2(matches + 1) * 4 + titles * 2.2 + slams * 5, 0, 100);
  return { matches, wins, losses, winRate, titles, slams, dominanceScore: +dominanceScore.toFixed(1) };
}

export function normalizeSurfaceKey(surface) {
  const value = String(surface ?? 'HARD').toUpperCase();
  if (value === 'SAIBRO') return 'CLAY';
  if (value === 'GRAMA') return 'GRASS';
  if (value === 'ASFALTO') return 'STREET';
  if (value === 'VELUDO') return 'CARPET';
  return SURFACE_KEYS.includes(value) ? value : 'HARD';
}

export function createSurfaceProfile(player = {}, { source = 'FORMATION', year = null, useCareerEvidence = false } = {}) {
  const seed = `${player.id ?? player.name}:${player.birthYear ?? player.age ?? year}:${player.styleId ?? ''}`;
  const dna = {};
  const mastery = {};
  const legacy = {};
  for (const surface of SURFACE_KEYS) {
    const fit = technicalFit(player, surface);
    const academy = academyInfluence(player, surface);
    const regional = REGION_BIAS[String(player.nationality ?? '').toUpperCase()]?.[surface] ?? 0;
    const variance = noise(seed, surface) * 9.5;
    const history = useCareerEvidence ? recordEvidence(player, surface) : 0;
    const affinity = Math.round(clamp(40 + (fit - 50) * 0.72 + academy + regional + styleBias(player, surface) + variance + history, 24, 98));
    dna[surface] = { affinity, archetype: chooseArchetype(player, surface, affinity) };
    const experience = Math.round(formationExposure(player, surface, affinity));
    mastery[surface] = {
      experience,
      adaptation: Math.round(clamp(affinity * 0.52 + experience * 0.36 + attr(player, 'adaptacao') * 0.12, 18, 96)),
      confidence: Math.round(clamp(42 + (affinity - 50) * 0.28 + (experience - 35) * 0.18, 28, 78)),
    };
    legacy[surface] = legacyBlock(player, surface);
  }
  return {
    version: SURFACE_PROFILE_VERSION,
    source,
    createdYear: year,
    dnaLocked: true,
    dna,
    mastery,
    legacy,
  };
}

export function getSurfaceStanding(player, surface) {
  const key = normalizeSurfaceKey(surface);
  const profile = player?.surfaceProfile?.version === SURFACE_PROFILE_VERSION
    ? player.surfaceProfile
    : createSurfaceProfile(player, { source: 'RUNTIME_MIGRATION', useCareerEvidence: true });
  const dna = profile.dna[key];
  const mastery = profile.mastery[key];
  const effective = dna.affinity * 0.62 + mastery.adaptation * 0.25 + mastery.confidence * 0.13;
  const ranked = SURFACE_KEYS.map(k => ({ surface: k, affinity: profile.dna[k].affinity }))
    .sort((a, b) => b.affinity - a.affinity);
  const relative = dna.affinity - (ranked.find(row => row.surface !== key)?.affinity ?? dna.affinity);
  return { surface: key, label: LABELS[key], dna, mastery, legacy: profile.legacy[key], effective, relative, primary: ranked[0].surface === key };
}

export function getSurfaceMatchEffects(player, surface) {
  const standing = getSurfaceStanding(player, surface);
  const a = clamp((standing.dna.affinity - 50) / 50, -0.52, 0.96);
  const learned = clamp((standing.mastery.adaptation - 50) / 50, -0.5, 0.92);
  const confidence = clamp((standing.mastery.confidence - 50) / 50, -0.42, 0.72);
  const strength = a * 0.58 + learned * 0.29 + confidence * 0.13;
  const id = standing.dna.archetype?.id ?? null;
  const archetypeFx = ARCHETYPE_FUNCTIONS[id] ?? {};
  const shotBias = {};
  if (standing.surface === 'CLAY') Object.assign(shotBias, { TOPSPIN: 0.05 + strength * 0.10, SHORT_ANGLE: strength * 0.07, DROP: strength * 0.025 });
  if (standing.surface === 'GRASS') Object.assign(shotBias, { SLICE: strength * 0.09, VOLLEY: strength * 0.10, APPROACH: strength * 0.08, FLAT_DRIVE: strength * 0.05 });
  if (standing.surface === 'HARD') Object.assign(shotBias, { FLAT_DRIVE: strength * 0.07, REDIRECT: strength * 0.06, ACCEL: strength * 0.04 });
  if (standing.surface === 'INDOOR') Object.assign(shotBias, { FLAT_DRIVE: strength * 0.08, ACCEL: strength * 0.07, FIRST_STRIKE: strength * 0.07 });
  if (standing.surface === 'CARPET') Object.assign(shotBias, { SLICE: strength * 0.07, VOLLEY: strength * 0.12, BLOCK_RETURN: strength * 0.10, FIRST_STRIKE: strength * 0.09 });
  if (standing.surface === 'STREET') Object.assign(shotBias, { TOPSPIN: strength * 0.06, ACCEL: strength * 0.09, POWER: strength * 0.08 });
  for (const [key, value] of Object.entries(archetypeFx.shotBias ?? {})) {
    shotBias[key] = (shotBias[key] ?? 0) + value * Math.max(0.35, Math.max(0, strength));
  }

  return Object.freeze({
    version: 'surface-match-fx-v2', surface: standing.surface, label: standing.label,
    archetype: standing.dna.archetype, affinity: standing.dna.affinity,
    experience: standing.mastery.experience, adaptation: standing.mastery.adaptation,
    confidence: standing.mastery.confidence, effective: +standing.effective.toFixed(2),
    strength: +strength.toFixed(3),
    qualityMult: +(1 + strength * 0.024 + (archetypeFx.quality ?? 0) * Math.max(0, strength)).toFixed(4),
    errorMult: +(1 - strength * 0.055).toFixed(4),
    staminaMult: +(1 - strength * 0.045 + (archetypeFx.stamina ?? 0) * Math.max(0, strength)).toFixed(4),
    readBonus: +(strength * (standing.surface === 'GRASS' || standing.surface === 'CARPET' ? 0.065 : 0.035) + (archetypeFx.read ?? 0) * Math.max(0, strength)).toFixed(4),
    preparationBonus: +(strength * (standing.surface === 'GRASS' || standing.surface === 'INDOOR' || standing.surface === 'CARPET' ? 0.07 : 0.035) + (archetypeFx.preparation ?? 0) * Math.max(0, strength)).toFixed(4),
    brakingMult: +(1 + strength * (standing.surface === 'CLAY' ? 0.08 : 0.035) + (archetypeFx.braking ?? 0) * Math.max(0, strength)).toFixed(4),
    slideControlBonus: +(standing.surface === 'CLAY' ? Math.max(0, strength) * 0.16 + (archetypeFx.slide ?? 0) * Math.max(0, strength) : 0).toFixed(4),
    lowContactBonus: +((['GRASS', 'CARPET'].includes(standing.surface) ? strength * 0.075 : 0) + (archetypeFx.low ?? 0) * Math.max(0, strength)).toFixed(4),
    highContactBonus: +((['CLAY', 'STREET'].includes(standing.surface) ? strength * 0.07 : 0) + (archetypeFx.high ?? 0) * Math.max(0, strength)).toFixed(4),
    patienceBias: +((standing.surface === 'CLAY' ? strength * 0.10 : ['GRASS', 'CARPET'].includes(standing.surface) ? -strength * 0.08 : 0) + (archetypeFx.patience ?? 0) * Math.max(0, strength)).toFixed(4),
    serveQuality: +((['GRASS', 'INDOOR', 'CARPET'].includes(standing.surface) ? strength * 0.055 : strength * 0.018) + (archetypeFx.serve ?? 0) * Math.max(0, strength)).toFixed(4),
    returnQuality: +((standing.surface === 'HARD' ? strength * 0.04 : ['GRASS', 'CARPET'].includes(standing.surface) ? strength * 0.025 : strength * 0.018) + (archetypeFx.return ?? 0) * Math.max(0, strength)).toFixed(4),
    netRecognition: +((['GRASS', 'CARPET'].includes(standing.surface) ? strength * 0.12 : standing.surface === 'INDOOR' ? strength * 0.06 : 0) + (archetypeFx.net ?? 0) * Math.max(0, strength)).toFixed(4),
    shotBias: Object.freeze(shotBias),
    flags: Object.freeze({
      clayRecoverySlide: standing.surface === 'CLAY' && strength > 0.12,
      earlyLowContact: ['GRASS', 'CARPET'].includes(standing.surface) && strength > 0.12,
      highBounceComfort: ['CLAY', 'STREET'].includes(standing.surface) && strength > 0.12,
      arenaTiming: standing.surface === 'INDOOR' && strength > 0.12,
    }),
    archetypeId: id,
  });
}

function deriveLegacyIdentity(profile) {
  const eligible = SURFACE_KEYS.map(surface => ({ surface, ...profile.legacy[surface] }))
    .filter(row => row.matches >= 18 && row.titles >= 2 && row.winRate >= 0.61)
    .sort((a, b) => b.dominanceScore - a.dominanceScore);
  if (!eligible.length) return null;
  const best = eligible[0];
  return {
    surface: best.surface,
    winRate: best.winRate,
    depth: Math.round(best.dominanceScore),
    label: best.dominanceScore >= 82 ? `Lenda de ${LABELS[best.surface]}` : `Especialista em ${LABELS[best.surface]}`,
    source: 'SURFACE_LEGACY_V2',
  };
}

export function ensureSurfaceProfile(player = {}, { year = null, source = 'SAVE_MIGRATION' } = {}) {
  if (player?.surfaceProfile?.version === SURFACE_PROFILE_VERSION) return player;
  const surfaceProfile = createSurfaceProfile(player, { source, year, useCareerEvidence: source !== 'NEWGEN' && source !== 'YOUTH_FORMATION' });
  return { ...player, surfaceProfile, surfaceIdentity: deriveLegacyIdentity(surfaceProfile) ?? player.surfaceIdentity ?? null };
}

export function recordSurfaceMatch(player = {}, result = {}) {
  const migrated = ensureSurfaceProfile(player, { year: result.year, source: 'SAVE_MIGRATION' });
  const surface = normalizeSurfaceKey(result.surface);
  const profile = migrated.surfaceProfile;
  const previousMastery = profile.mastery[surface];
  const previousLegacy = profile.legacy[surface];
  const won = Boolean(result.won);
  const importance = clamp(Number(result.importance ?? (result.isSlam ? 1 : result.isTournamentTitle ? 0.72 : 0.35)), 0.2, 1);
  const experience = clamp(previousMastery.experience + (previousMastery.experience < 70 ? 0.42 : 0.18) * importance, 0, 100);
  const confidenceTarget = won ? 58 + importance * 23 : 42 - importance * 13;
  const confidence = clamp(previousMastery.confidence + (confidenceTarget - previousMastery.confidence) * (0.035 + importance * 0.035), 18, 92);
  const adaptationTarget = profile.dna[surface].affinity * 0.57 + experience * 0.43;
  const adaptation = clamp(previousMastery.adaptation + (adaptationTarget - previousMastery.adaptation) * 0.012 * importance, 12, 98);
  const wins = previousLegacy.wins + (won ? 1 : 0);
  const losses = previousLegacy.losses + (won ? 0 : 1);
  const titles = previousLegacy.titles + (result.isTournamentTitle ? 1 : 0);
  const slams = previousLegacy.slams + (result.isTournamentTitle && result.isSlam ? 1 : 0);
  const nextBase = { ...migrated, surfaceStats: {
    ...(migrated.surfaceStats ?? {}),
    [surface]: { ...(migrated.surfaceStats?.[surface] ?? {}), wins, losses, titlesWon: titles, slams },
  } };
  const nextProfile = {
    ...profile,
    mastery: { ...profile.mastery, [surface]: { experience: +experience.toFixed(2), adaptation: +adaptation.toFixed(2), confidence: +confidence.toFixed(2) } },
    legacy: { ...profile.legacy, [surface]: legacyBlock(nextBase, surface) },
  };
  return { ...nextBase, surfaceProfile: nextProfile, surfaceIdentity: deriveLegacyIdentity(nextProfile) ?? migrated.surfaceIdentity ?? null };
}

export function describeSurfaceProfile(player = {}) {
  const migrated = ensureSurfaceProfile(player);
  return SURFACE_KEYS.map(surface => {
    const row = getSurfaceStanding(migrated, surface);
    return { surface, label: row.label, affinity: row.dna.affinity, mastery: Math.round(row.mastery.adaptation), confidence: Math.round(row.mastery.confidence), archetype: row.dna.archetype, legacy: row.legacy };
  }).sort((a, b) => b.affinity - a.affinity);
}
