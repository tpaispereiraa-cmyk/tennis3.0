/**
 * Academies provide a developmental lens, never a forced player style. The
 * actual mechanical impact belongs to the age/development patch; for now this
 * persists the affiliation and the narrative tension with a player's identity.
 */

const ACADEMIES = [
  { id: 'COASTAL_BASELINE', name: 'Coastal Baseline Academy', region: 'AMERICAS', lens: 'BASELINE_PRESSURE', influences: ['CONSISTENCY', 'FOREHAND_WEIGHT'] },
  { id: 'NORDIC_POINT', name: 'Nordic Point Institute', region: 'NORDICS', lens: 'SERVE_FIRST', influences: ['SERVE_RHYTHM', 'FIRST_BALL'] },
  { id: 'MEDITERRANEAN_CLAY', name: 'Mediterranean Clay Lab', region: 'EUROPE', lens: 'CONSTRUCTION', influences: ['PATIENCE', 'TOPSPIN'] },
  { id: 'EASTERN_DEFENSE', name: 'Eastern Defense Centre', region: 'ASIA_PACIFIC', lens: 'DEFENSIVE_RETRIEVAL', influences: ['MOVEMENT', 'COUNTERPUNCH'] },
  { id: 'SAHEL_PATHWAYS', name: 'Sahel Pathways Tennis', region: 'AFRICA', lens: 'ATHLETIC_FOUNDATION', influences: ['ATHLETICISM', 'RESILIENCE'] },
  { id: 'LEVANT_VARIETY', name: 'Levant Variety House', region: 'WEST_ASIA', lens: 'ALL_COURT_VARIETY', influences: ['TOUCH', 'TRANSITION'] },
  { id: 'GLOBAL_OPEN', name: 'Open Court Network', region: 'GLOBAL', lens: 'OPEN_FORMATION', influences: ['SELF_DIRECTION', 'ADAPTABILITY'] },
];

const LENS_ATTRS = {
  BASELINE_PRESSURE: new Set(['fhPotencia', 'fhControle', 'topspin', 'regularidade']),
  SERVE_FIRST: new Set(['saqueForca', 'saquePrecisao', 'explosividade', 'fhPotencia']),
  CONSTRUCTION: new Set(['topspin', 'resistencia', 'fhControle', 'visaoTatica', 'regularidade']),
  DEFENSIVE_RETRIEVAL: new Set(['velocidade', 'defesa', 'resistencia', 'devolucao', 'leitura']),
  ATHLETIC_FOUNDATION: new Set(['velocidade', 'explosividade', 'resistencia', 'recuperacao']),
  ALL_COURT_VARIETY: new Set(['slice', 'volley', 'saquePrecisao', 'adaptacao', 'visaoTatica']),
  OPEN_FORMATION: new Set(['adaptacao', 'leitura', 'fhControle', 'bhControle']),
  SELF_DIRECTED: new Set(['adaptacao', 'visaoTatica']),
};

function hash(value) {
  let result = 2166136261;
  for (const char of String(value ?? 'academy')) {
    result ^= char.charCodeAt(0);
    result = Math.imul(result, 16777619);
  }
  return result >>> 0;
}

function inferRegion(nationality = '') {
  const map = {
    BRA: 'AMERICAS', ARG: 'AMERICAS', USA: 'AMERICAS', CAN: 'AMERICAS', COL: 'AMERICAS', CHI: 'AMERICAS',
    ESP: 'EUROPE', FRA: 'EUROPE', ITA: 'EUROPE', GBR: 'EUROPE', GER: 'EUROPE', SRB: 'EUROPE', POL: 'EUROPE',
    JPN: 'ASIA_PACIFIC', AUS: 'ASIA_PACIFIC', KOR: 'ASIA_PACIFIC', CHN: 'ASIA_PACIFIC', IND: 'ASIA_PACIFIC',
    RSA: 'AFRICA', MAR: 'AFRICA', TUN: 'AFRICA', EGY: 'AFRICA', NGA: 'AFRICA',
    TUR: 'WEST_ASIA', ISR: 'WEST_ASIA', KAZ: 'WEST_ASIA', UAE: 'WEST_ASIA',
    SWE: 'NORDICS', NOR: 'NORDICS', DEN: 'NORDICS', FIN: 'NORDICS',
  };
  return map[nationality] ?? 'GLOBAL';
}

function academyChance(origin = {}) {
  const byAccess = { LIMITED: 0.34, MODEST: 0.52, STABLE: 0.73, PRIVILEGED: 0.88 };
  const base = byAccess[origin.access] ?? 0.55;
  if (origin.id === 'SELF_TAUGHT') return base * 0.38;
  if (origin.id === 'ACADEMY_SCHOLARSHIP') return 1;
  return base;
}

export function createYouthAcademyAffiliation(player = {}, profile = {}) {
  const seed = hash(`${player.id ?? player.name ?? 'player'}:${profile.birthYear ?? ''}:academy`);
  const origin = profile.origin ?? {};
  if ((seed % 1000) / 1000 > academyChance(origin)) {
    return {
      status: 'INDEPENDENT',
      academyId: null,
      academyName: null,
      lens: 'SELF_DIRECTED',
      influences: ['SELF_DIRECTION'],
      alignment: 'SELF_DEFINED',
      joinedAge: null,
      leftAge: null,
    };
  }

  const region = inferRegion(player.nationality);
  const candidates = ACADEMIES.filter(academy => academy.region === region || academy.region === 'GLOBAL');
  const academy = candidates[seed % candidates.length];
  const alignments = ['ALIGNED', 'ADAPTED', 'RESISTED'];
  return {
    status: 'AFFILIATED',
    academyId: academy.id,
    academyName: academy.name,
    lens: academy.lens,
    influences: academy.influences,
    alignment: alignments[(seed >>> 11) % alignments.length],
    joinedAge: Math.max(profile.origin?.discoveryAge ?? 7, 8 + ((seed >>> 17) % 5)),
    leftAge: null,
  };
}

export function describeYouthAcademy(academy = {}) {
  if (academy.status === 'INDEPENDENT') return 'formação independente, sem uma academia dominante';
  if (!academy.academyName) return null;
  const relation = {
    ALIGNED: 'absorveu a escola',
    ADAPTED: 'adaptou a escola ao próprio jogo',
    RESISTED: 'cresceu contrariando a escola',
  }[academy.alignment] ?? 'passou pela escola';
  return `${academy.academyName}: ${relation} de ${academy.lens}`;
}

/**
 * Formação muda a direção, não o teto. O efeito se dissipa entre 19 e 22 anos,
 * quando técnico, circuito e identidade adulta passam a dominar o treino.
 */
export function getYouthFormationGrowthMultiplier(player = {}, attrKey, age = player.age) {
  const numericAge = Number(age ?? 22);
  if (numericAge > 21) return 1;
  const profile = player.youthProfile ?? {};
  const academy = profile.academy ?? {};
  const origin = profile.origin ?? {};
  const formative = LENS_ATTRS[academy.lens ?? 'SELF_DIRECTED'] ?? LENS_ATTRS.SELF_DIRECTED;
  const fade = numericAge <= 18 ? 1 : numericAge === 19 ? .72 : numericAge === 20 ? .45 : .22;
  const alignment = academy.alignment === 'ALIGNED' ? 1 : academy.alignment === 'ADAPTED' ? .72 : academy.alignment === 'RESISTED' ? .38 : .55;
  let modifier = 1;
  if (formative.has(attrKey)) modifier += .12 * fade * alignment;
  if (academy.status === 'INDEPENDENT') {
    if (['adaptacao', 'visaoTatica'].includes(attrKey)) modifier += .07 * fade;
    if (['saquePrecisao', 'regularidade'].includes(attrKey)) modifier -= .035 * fade;
  }
  if (origin.access === 'LIMITED') modifier -= .025 * fade;
  else if (origin.access === 'PRIVILEGED') modifier += .025 * fade;
  if (origin.familySupport === 'STRONG') modifier += .018 * fade;
  else if (origin.familySupport === 'FRAGILE') modifier -= .018 * fade;
  return Math.max(.90, Math.min(1.16, modifier));
}
