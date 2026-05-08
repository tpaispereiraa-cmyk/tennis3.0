import { SIGNATURE_SHOTS_OFFLINE as SIGNATURE_SHOTS } from '../shotlab/ShotEngineOffline.js';

// TraitSystem 2.0
// Fase 2: catálogo inicial
// Fase 3: distribuição base por jogador
// Fase 4: marks de carreira derivados do estado atual
// Fase 5: pronto para UI/ficha

export const TRAIT_FAMILIES = Object.freeze({
  CORE: 'CORE',
  SIGNATURE: 'SIGNATURE',
  CAREER: 'CAREER',
  SHADOW: 'SHADOW',
});

export const TRAIT_ORIGINS = Object.freeze({
  INNATE: 'INNATE',
  DEVELOPED: 'DEVELOPED',
  EARNED: 'EARNED',
});

export const TRAIT_CONTEXTS = Object.freeze([
  'always',
  'serve',
  'return',
  'rally',
  'net',
  'breakPoint',
  'tiebreak',
  'decidingSet',
  'bestOf5',
  'bigMatch',
  'fatigued',
  'behind',
  'ahead',
  'earlyMatch',
  'surface:CLAY',
  'surface:GRASS',
  'surface:HARD',
  'surface:INDOOR',
]);

export const TRAIT_AXES = Object.freeze([
  'power',
  'precision',
  'topspin',
  'slice',
  'serveQuality',
  'returnQuality',
  'rallyTolerance',
  'fatigueResistance',
  'clutch',
  'composure',
  'adaptation',
  'shotBias',
]);

const CORE_CATALOG = {
  CLOSER: {
    family: TRAIT_FAMILIES.CORE,
    name: 'Closer',
    short: 'Sobe de nível em pontos e jogos grandes.',
    contexts: ['breakPoint', 'tiebreak', 'bigMatch'],
    effects: { clutch: 1.3, precision: 0.7, composure: 0.7 },
  },
  FAST_STARTER: {
    family: TRAIT_FAMILIES.CORE,
    name: 'Fast Starter',
    short: 'Entra aceso e tenta abrir vantagem cedo.',
    contexts: ['earlyMatch'],
    effects: { power: 0.7, precision: 0.5, composure: 0.4 },
  },
  ENDURANCE_ENGINE: {
    family: TRAIT_FAMILIES.CORE,
    name: 'Endurance Engine',
    short: 'O corpo segura o nível quando a partida estica.',
    contexts: ['fatigued', 'decidingSet', 'bestOf5'],
    effects: { fatigueResistance: 1.5, rallyTolerance: 0.9, clutch: 0.4 },
  },
  RETURN_HUNTER: {
    family: TRAIT_FAMILIES.CORE,
    name: 'Return Hunter',
    short: 'Lê muito bem o saque e castiga segundos serviços.',
    contexts: ['return'],
    effects: { returnQuality: 1.45, precision: 0.4, shotBias: { RETURN_ATTACK: 0.7 } },
  },
  BASELINE_ANCHOR: {
    family: TRAIT_FAMILIES.CORE,
    name: 'Baseline Anchor',
    short: 'Estável do fundo, segura a troca e desgasta o rival.',
    contexts: ['rally'],
    effects: { rallyTolerance: 1.25, composure: 0.8, precision: 0.35 },
  },
  NET_RUSHER: {
    family: TRAIT_FAMILIES.CORE,
    name: 'Net Rusher',
    short: 'Vive de cortar o ponto e encurtar o rally na rede.',
    contexts: ['net', 'serve'],
    effects: { precision: 0.55, serveQuality: 0.55, adaptation: 0.35, shotBias: { VOLLEY: 0.8, APPROACH: 0.7 } },
  },
  ADAPTIVE_MIND: {
    family: TRAIT_FAMILIES.CORE,
    name: 'Adaptive Mind',
    short: 'Lê o jogo e se ajusta melhor que a média.',
    contexts: ['always'],
    effects: { adaptation: 1.35, precision: 0.35, composure: 0.45 },
  },
  FIRST_STRIKE: {
    family: TRAIT_FAMILIES.CORE,
    name: 'First Strike',
    short: 'Joga para tomar a frente do ponto cedo.',
    contexts: ['serve', 'rally'],
    effects: { power: 0.95, precision: 0.25, shotBias: { ACCEL: 0.75, SHORT_ACCEL: 0.5 } },
  },
  SURFACE_CLAY: {
    family: TRAIT_FAMILIES.CORE,
    name: 'Clay Native',
    short: 'O repertório floresce no saibro.',
    contexts: ['surface:CLAY', 'rally'],
    effects: { topspin: 1.2, rallyTolerance: 0.8, adaptation: 0.5 },
  },
  SURFACE_GRASS: {
    family: TRAIT_FAMILIES.CORE,
    name: 'Grass Native',
    short: 'Entende a grama, encurta pontos e lê bem a quadra.',
    contexts: ['surface:GRASS', 'serve', 'net'],
    effects: { serveQuality: 1.0, slice: 0.8, precision: 0.5 },
  },
  SURFACE_HARD: {
    family: TRAIT_FAMILIES.CORE,
    name: 'Hard Native',
    short: 'Joga com segurança em hard e absorve melhor o ritmo.',
    contexts: ['surface:HARD'],
    effects: { power: 0.8, precision: 0.8, composure: 0.4 },
  },
  SURFACE_INDOOR: {
    family: TRAIT_FAMILIES.CORE,
    name: 'Indoor Native',
    short: 'Acelera e executa com mais conforto em indoor.',
    contexts: ['surface:INDOOR'],
    effects: { power: 0.9, precision: 0.7, serveQuality: 0.6 },
  },
  MARATHON_CLOSER: {
    family: TRAIT_FAMILIES.CORE,
    name: 'Marathon Closer',
    short: 'Quanto mais longo e pesado o combate, mais frio ele fica no fim.',
    contexts: ['decidingSet', 'bestOf5', 'fatigued'],
    effects: { clutch: 1.1, fatigueResistance: 1.0, composure: 0.6 },
  },
  FRONT_FOOT_DICTATOR: {
    family: TRAIT_FAMILIES.CORE,
    name: 'Front Foot Dictator',
    short: 'Adora pisar na quadra e sequestrar o ponto cedo.',
    contexts: ['serve', 'rally'],
    effects: { power: 0.9, precision: 0.3, shotBias: { ACCEL: 0.7, DRIVE: 0.6, BANANA: 0.5 } },
  },
  ABSORBER: {
    family: TRAIT_FAMILIES.CORE,
    name: 'Absorber',
    short: 'Recebe peso, devolve controle e recoloca o rival na troca.',
    contexts: ['return', 'behind', 'rally'],
    effects: { returnQuality: 1.0, rallyTolerance: 0.9, composure: 0.45 },
  },
  BIG_MATCH_PULSE: {
    family: TRAIT_FAMILIES.CORE,
    name: 'Big Match Pulse',
    short: 'O ambiente grande nao paralisa; ele desperta.',
    contexts: ['bigMatch', 'breakPoint'],
    effects: { clutch: 0.9, power: 0.35, composure: 0.6 },
  },
  RHYTHM_BREAKER: {
    family: TRAIT_FAMILIES.CORE,
    name: 'Rhythm Breaker',
    short: 'Quebra cadencia com variacao de altura, spin e tempo.',
    contexts: ['rally', 'surface:CLAY', 'surface:GRASS'],
    effects: { slice: 0.9, adaptation: 0.8, precision: 0.35 },
  },
};

const CAREER_CATALOG = {
  SLAM_PROVEN: {
    family: TRAIT_FAMILIES.CAREER,
    name: 'Slam Proven',
    short: 'Já confirmou grandeza no palco máximo.',
    contexts: ['bigMatch', 'bestOf5'],
    effects: { clutch: 0.8, composure: 0.7 },
  },
  MASTERS_PROVEN: {
    family: TRAIT_FAMILIES.CAREER,
    name: 'Masters Proven',
    short: 'Tem histórico real de alto nível em torneios grandes.',
    contexts: ['bigMatch'],
    effects: { composure: 0.75, adaptation: 0.5 },
  },
  CIRCUIT_IRONMAN: {
    family: TRAIT_FAMILIES.CAREER,
    name: 'Circuit Ironman',
    short: 'Carrega volume, calendário e desgaste melhor que a maioria.',
    contexts: ['fatigued', 'bestOf5'],
    effects: { fatigueResistance: 1.0, composure: 0.4 },
  },
  CLAY_DYNASTY: {
    family: TRAIT_FAMILIES.CAREER,
    name: 'Clay Dynasty',
    short: 'A história dele no saibro já pesa antes da primeira bola.',
    contexts: ['surface:CLAY', 'bigMatch'],
    effects: { topspin: 0.8, composure: 0.55, clutch: 0.35 },
  },
  HARD_EMPIRE: {
    family: TRAIT_FAMILIES.CAREER,
    name: 'Hard Empire',
    short: 'Construiu legado pesado no hard.',
    contexts: ['surface:HARD', 'bigMatch'],
    effects: { power: 0.6, precision: 0.55, composure: 0.4 },
  },
  INJURY_SURVIVOR: {
    family: TRAIT_FAMILIES.CAREER,
    name: 'Injury Survivor',
    short: 'Carrega cicatrizes, mas aprendeu a sobreviver a elas.',
    contexts: ['fatigued', 'behind'],
    effects: { composure: 0.55, adaptation: 0.6 },
  },
  FIVE_SET_VETERAN: {
    family: TRAIT_FAMILIES.CAREER,
    name: 'Five-Set Veteran',
    short: 'A carreira ensinou a sobreviver ao caos de batalhas longas.',
    contexts: ['bestOf5', 'decidingSet'],
    effects: { fatigueResistance: 0.9, clutch: 0.55, composure: 0.4 },
  },
  FINALS_SCAR: {
    family: TRAIT_FAMILIES.CAREER,
    name: 'Finals Scar',
    short: 'As grandes finais deixaram marcas e casca competitiva.',
    contexts: ['bigMatch', 'tiebreak'],
    effects: { composure: 0.8, adaptation: 0.45 },
  },
  SURFACE_REIGN: {
    family: TRAIT_FAMILIES.CAREER,
    name: 'Surface Reign',
    short: 'Quando pisa no proprio terreno, o historico pesa junto.',
    contexts: ['surface:CLAY', 'surface:GRASS', 'surface:HARD', 'surface:INDOOR'],
    effects: { precision: 0.45, composure: 0.5, adaptation: 0.45 },
  },
  COMEBACK_SEASON: {
    family: TRAIT_FAMILIES.CAREER,
    name: 'Comeback Season',
    short: 'Ja viveu queda e retorno; isso muda como ele reage.',
    contexts: ['behind', 'bigMatch'],
    effects: { clutch: 0.55, composure: 0.65, adaptation: 0.55 },
  },
};

const SHADOW_CATALOG = {
  SLOW_STARTER: {
    family: TRAIT_FAMILIES.SHADOW,
    name: 'Slow Starter',
    short: 'Demora mais que o ideal para entrar no ritmo.',
    contexts: ['earlyMatch'],
    effects: { precision: -0.8, composure: -0.7 },
  },
  SECOND_SERVE_FEAR: {
    family: TRAIT_FAMILIES.SHADOW,
    name: 'Second Serve Fear',
    short: 'O segundo saque segura a mão do jogador.',
    contexts: ['serve'],
    effects: { serveQuality: -1.0, precision: -0.4 },
  },
  BIG_STAGE_TENSION: {
    family: TRAIT_FAMILIES.SHADOW,
    name: 'Big Stage Tension',
    short: 'O palco às vezes pesa mais do que deveria.',
    contexts: ['bigMatch', 'breakPoint', 'tiebreak'],
    effects: { clutch: -1.0, composure: -0.9 },
  },
  FRONT_RUNNER_FADE: {
    family: TRAIT_FAMILIES.SHADOW,
    name: 'Front-Runner Fade',
    short: 'Quando abre vantagem, às vezes recua demais.',
    contexts: ['ahead'],
    effects: { precision: -0.6, composure: -0.8 },
  },
  TIEBREAK_RUSH: {
    family: TRAIT_FAMILIES.SHADOW,
    name: 'Tiebreak Rush',
    short: 'No desempate, acelera mais do que devia e perde clareza.',
    contexts: ['tiebreak'],
    effects: { precision: -0.75, clutch: -0.55 },
  },
  SHORT_BALL_HESITATION: {
    family: TRAIT_FAMILIES.SHADOW,
    name: 'Short-Ball Hesitation',
    short: 'Recebe bola boa para liquidar, mas hesita um instante.',
    contexts: ['rally', 'ahead'],
    effects: { power: -0.45, precision: -0.55 },
  },
  CROWD_STATIC: {
    family: TRAIT_FAMILIES.SHADOW,
    name: 'Crowd Static',
    short: 'Ambientes muito carregados baguncam mais a cabeca do que deveriam.',
    contexts: ['bigMatch'],
    effects: { composure: -0.8, adaptation: -0.45 },
  },
  GRASS_FOOTWORK_DISCOMFORT: {
    family: TRAIT_FAMILIES.SHADOW,
    name: 'Grass Footwork Discomfort',
    short: 'Na grama, a base e o timing nunca parecem totalmente limpos.',
    contexts: ['surface:GRASS'],
    effects: { precision: -0.7, slice: -0.35, composure: -0.35 },
  },
};

const DLC1_SIGNATURE_CATALOG = {
  SIG_FH_INSIDE_IN_HAMMER: {
    family: TRAIT_FAMILIES.SIGNATURE,
    name: 'Inside-In Forehand Hammer',
    short: 'Forehand inside-in que entra seco, pesado e direto para matar espaco.',
    contexts: ['rally'],
    shotFamily: { key: 'FH_INSIDE_IN_HAMMER', baseType: 'ACCEL', wing: 'FH', emoji: '🔨' },
    effects: { power: 1.0, precision: 0.55, topspin: 0.6, shotBias: { ACCEL: 0.9, BANANA: 0.25 } },
  },
  SIG_BH_DTL_REDIRECT: {
    family: TRAIT_FAMILIES.SIGNATURE,
    name: 'Backhand DTL Redirect',
    short: 'Backhand down-the-line de redirecionamento, mais limpo do que parece possivel.',
    contexts: ['rally'],
    shotFamily: { key: 'BH_DTL_REDIRECT', baseType: 'DRIVE', wing: 'BH', emoji: '📏' },
    effects: { precision: 0.9, power: 0.45, shotBias: { DRIVE: 0.9, ACCEL: 0.35 } },
  },
  SIG_HEAVY_CROSS_FH_LOOP: {
    family: TRAIT_FAMILIES.SIGNATURE,
    name: 'Heavy Cross FH Loop',
    short: 'Forehand cruzado alto, pesado e repetivel para abrir a quadra no desgaste.',
    contexts: ['rally', 'surface:CLAY'],
    shotFamily: { key: 'HEAVY_CROSS_FH_LOOP', baseType: 'TOPSPIN', wing: 'FH', emoji: '🌀' },
    effects: { topspin: 1.0, precision: 0.45, rallyTolerance: 0.45, shotBias: { TOPSPIN: 0.85 } },
  },
  SIG_SKID_SLICE_APPROACH: {
    family: TRAIT_FAMILIES.SIGNATURE,
    name: 'Skid Slice Approach',
    short: 'Slice de aproximacao baixo e escorregadio, feito para empurrar o rival para baixo.',
    contexts: ['rally', 'net', 'surface:GRASS'],
    shotFamily: { key: 'SKID_SLICE_APPROACH', baseType: 'SLICE', wing: 'BH', emoji: '🪒' },
    effects: { slice: 1.0, precision: 0.45, shotBias: { SLICE: 0.95, APPROACH: 0.75 } },
  },
  SIG_WIDE_KICK_SERVE: {
    family: TRAIT_FAMILIES.SIGNATURE,
    name: 'Wide Kick Serve',
    short: 'Segundo saque com kick aberto que puxa o retorno para fora do ponto.',
    contexts: ['serve', 'surface:CLAY', 'surface:HARD'],
    shotFamily: { key: 'WIDE_KICK_SERVE', baseType: 'SERVE_KICK', wing: 'SERVE', emoji: '🛰️' },
    effects: { serveQuality: 1.0, topspin: 0.8, precision: 0.4, shotBias: { SERVE_KICK: 1.0 } },
  },
  SIG_BODY_JAM_SERVE: {
    family: TRAIT_FAMILIES.SIGNATURE,
    name: 'Body Jam Serve',
    short: 'Saque fechado no corpo para travar leitura e encurtar a devolucao.',
    contexts: ['serve', 'bigMatch'],
    shotFamily: { key: 'BODY_JAM_SERVE', baseType: 'SERVE_FLAT', wing: 'SERVE', emoji: '🎯' },
    effects: { serveQuality: 0.95, power: 0.55, precision: 0.45, shotBias: { SERVE_FLAT: 0.95 } },
  },
  SIG_RETURN_BLOCK_KNIFE: {
    family: TRAIT_FAMILIES.SIGNATURE,
    name: 'Return Block Knife',
    short: 'Bloqueia o saque com leitura curta e devolve profundo sem swing grande.',
    contexts: ['return'],
    shotFamily: { key: 'RETURN_BLOCK_KNIFE', baseType: 'DRIVE', wing: 'BH', emoji: '🛡️' },
    effects: { returnQuality: 1.0, precision: 0.65, shotBias: { RETURN_ATTACK: 0.8, DRIVE: 0.45 } },
  },
  SIG_SHORT_BH_ANGLE: {
    family: TRAIT_FAMILIES.SIGNATURE,
    name: 'Short Backhand Angle',
    short: 'Angulo curto de backhand para quebrar o eixo da troca sem aviso.',
    contexts: ['rally', 'surface:GRASS'],
    shotFamily: { key: 'SHORT_BH_ANGLE', baseType: 'SHORT_ACCEL', wing: 'BH', emoji: '📐' },
    effects: { precision: 0.85, slice: 0.35, power: 0.35, shotBias: { SHORT_ACCEL: 0.95 } },
  },
  SIG_DROP_VOLLEY_TOUCH: {
    family: TRAIT_FAMILIES.SIGNATURE,
    name: 'Drop Volley Touch',
    short: 'Toque curtissimo de voleio, quase sempre quando o rival ainda corre.',
    contexts: ['net', 'bigMatch'],
    shotFamily: { key: 'DROP_VOLLEY_TOUCH', baseType: 'VOLLEY', wing: 'NET', emoji: '🪶' },
    effects: { precision: 0.85, slice: 0.8, shotBias: { VOLLEY: 0.8, APPROACH: 0.35 } },
  },
  SIG_LOB_RESET_ARTIST: {
    family: TRAIT_FAMILIES.SIGNATURE,
    name: 'Lob Reset Artist',
    short: 'Lob de sobrevivencia que vira reset tatico e rouba o ponto de volta.',
    contexts: ['behind', 'rally'],
    shotFamily: { key: 'LOB_RESET_ARTIST', baseType: 'LOB', wing: 'FH', emoji: '🎈' },
    effects: { precision: 0.65, topspin: 0.65, composure: 0.4, shotBias: { LOB: 1.0 } },
  },
};

function buildSignatureCatalog() {
  const entries = {};
  for (const [shotId, shot] of Object.entries(SIGNATURE_SHOTS)) {
    const familyName = shot.baseType ?? 'SHOT';
    const spinEffect = shot.baseType?.includes('SLICE') || shot.baseType === 'DROP' || shot.baseType === 'DROP2'
      ? { slice: 1.0 }
      : { topspin: 1.0 };
    const power = Math.max(0.15, ((shot.physics?.pow ?? 1) - 1) * 6.4);
    const precision = 0.35 + Math.max(0, ((shot.attrThreshold?.fhControle ?? shot.attrThreshold?.bhControle ?? shot.attrThreshold?.saquePrecisao ?? shot.attrThreshold?.leitura ?? 70) - 70) / 24);
    const serveQuality = shot.wing === 'SERVE' ? 0.95 : 0;

    entries[`SIG_${shotId}`] = {
      family: TRAIT_FAMILIES.SIGNATURE,
      name: shot.label,
      short: shot.description,
      contexts: shot.wing === 'SERVE' ? ['serve'] : ['rally'],
      shotFamily: {
        key: shotId,
        baseType: shot.baseType,
        wing: shot.wing,
        emoji: shot.emoji,
      },
      effects: {
        power,
        precision,
        serveQuality,
        shotBias: { [familyName]: 0.75, [shotId]: 1.0 },
        ...spinEffect,
      },
    };
  }
  return entries;
}

export const TRAIT_CATALOG = Object.freeze({
  ...CORE_CATALOG,
  ...CAREER_CATALOG,
  ...SHADOW_CATALOG,
  ...buildSignatureCatalog(),
  ...DLC1_SIGNATURE_CATALOG,
});

export const ALL_TRAIT_IDS = Object.freeze(Object.keys(TRAIT_CATALOG));
export const MILESTONES = {};

function createEmptyTraitState() {
  return {
    version: 2,
    enabled: true,
    slots: [],
    history: [{ type: 'TRAITS_V2_INIT' }],
  };
}

function ensureTraitState(player) {
  if (!player) return null;
  if (!player.traitsV2) player.traitsV2 = createEmptyTraitState();
  return player.traitsV2;
}

function baseEffectVector() {
  return {
    power: 0,
    precision: 0,
    topspin: 0,
    slice: 0,
    serveQuality: 0,
    returnQuality: 0,
    rallyTolerance: 0,
    fatigueResistance: 0,
    clutch: 0,
    composure: 0,
    adaptation: 0,
    shotBias: {},
  };
}

function normalizeEffects(effects = {}) {
  const normalized = baseEffectVector();
  for (const axis of TRAIT_AXES) {
    if (axis === 'shotBias') continue;
    normalized[axis] = Number.isFinite(effects[axis]) ? effects[axis] : 0;
  }
  normalized.shotBias = { ...(effects.shotBias ?? {}) };
  return normalized;
}

function collectSlotEffects(slot, contexts) {
  const def = TRAIT_CATALOG[slot?.traitId];
  if (!def) return null;
  const triggerContexts = Array.isArray(def.contexts) && def.contexts.length ? def.contexts : ['always'];
  const applies = triggerContexts.some((ctx) => contexts.includes(ctx));
  if (!applies) return null;
  return normalizeEffects(def.effects);
}

function mergeEffects(target, incoming) {
  if (!incoming) return target;
  for (const axis of TRAIT_AXES) {
    if (axis === 'shotBias') continue;
    target[axis] += incoming[axis] ?? 0;
  }
  for (const [shotId, bias] of Object.entries(incoming.shotBias ?? {})) {
    target.shotBias[shotId] = (target.shotBias[shotId] ?? 0) + bias;
  }
  return target;
}

function hasTrait(player, traitId) {
  const state = ensureTraitState(assignTraits(player));
  return !!state?.slots?.some((slot) => slot.traitId === traitId);
}

function countFamilyTraits(player, family) {
  const state = ensureTraitState(assignTraits(player));
  return (state?.slots ?? []).filter((slot) => (slot.family ?? TRAIT_CATALOG[slot.traitId]?.family) === family).length;
}

function removeTraitSlot(player, traitId, meta = {}) {
  const state = ensureTraitState(assignTraits(player));
  const idx = (state?.slots ?? []).findIndex((slot) => slot.traitId === traitId);
  if (idx < 0) return false;
  state.slots.splice(idx, 1);
  state.history.push({
    type: 'TRAIT_REMOVED',
    traitId,
    year: meta.year ?? null,
    reason: meta.reason ?? null,
  });
  return true;
}

function getAttr(player, key, fallback = 60) {
  return player?.attrs?.[key] ?? fallback;
}

function getPotentialSlots(player) {
  const potential = String(player?.potential ?? 'COMUM').toUpperCase();
  if (potential === 'GERACIONAL') return { core: 3, signature: 2, career: 2, shadow: 1 };
  if (potential === 'LENDA' || potential === 'ELITE') return { core: 2, signature: 2, career: 2, shadow: 1 };
  if (potential === 'CAMPEAO') return { core: 2, signature: 1, career: 1, shadow: 1 };
  return { core: 1, signature: 1, career: 1, shadow: 1 };
}

function pickTop(candidates, limit) {
  return candidates
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

function createSeededRng(seedInput = '') {
  let seed = 2166136261;
  const str = String(seedInput);
  for (let i = 0; i < str.length; i++) {
    seed ^= str.charCodeAt(i);
    seed = Math.imul(seed, 16777619);
  }
  return () => {
    seed += 0x6D2B79F5;
    let t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pickWeightedRandom(candidates, limit, rng, opts = {}) {
  const minScore = opts.minScore ?? 1;
  const pool = candidates
    .filter((entry) => (entry.score ?? 0) >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, opts.poolSize ?? Math.max(limit * 2, 4));

  const selected = [];
  while (pool.length && selected.length < limit) {
    const totalWeight = pool.reduce((sum, entry) => sum + Math.max(1, entry.score), 0);
    let roll = rng() * totalWeight;
    let pickedIndex = 0;
    for (let i = 0; i < pool.length; i++) {
      roll -= Math.max(1, pool[i].score);
      if (roll <= 0) {
        pickedIndex = i;
        break;
      }
    }
    selected.push(pool[pickedIndex]);
    pool.splice(pickedIndex, 1);
  }
  return selected;
}

function buildCoreCandidates(player) {
  const style = String(player?.styleId ?? '').toUpperCase();
  const netGame = String(player?.prefs?.netGame ?? '').toUpperCase();
  const fhPow = getAttr(player, 'fhPotencia');
  const bhPow = getAttr(player, 'bhPotencia');
  const fhCtl = getAttr(player, 'fhControle');
  const bhCtl = getAttr(player, 'bhControle');
  const topspin = getAttr(player, 'topspin');
  const slice = getAttr(player, 'slice');
  const serveForca = getAttr(player, 'saqueForca');
  const servePrec = getAttr(player, 'saquePrecisao');
  const ret = getAttr(player, 'devolucao');
  const volley = getAttr(player, 'volley');
  const smash = getAttr(player, 'smash');
  const leitura = getAttr(player, 'leitura');
  const visao = getAttr(player, 'visaoTatica');
  const mental = getAttr(player, 'mentalidade');
  const regularidade = getAttr(player, 'regularidade');
  const resistencia = getAttr(player, 'resistencia');
  const recuperacao = getAttr(player, 'recuperacao');
  const defesa = getAttr(player, 'defesa');
  const velocidade = getAttr(player, 'velocidade');
  const explosividade = getAttr(player, 'explosividade');
  const surfaceStats = player?.surfaceStats ?? {};
  const clayTitles = surfaceStats.CLAY?.titlesWon ?? 0;
  const grassTitles = surfaceStats.GRASS?.titlesWon ?? 0;
  const hardTitles = surfaceStats.HARD?.titlesWon ?? 0;
  const indoorTitles = surfaceStats.INDOOR?.titlesWon ?? 0;

  return [
    { traitId: 'CLOSER', score: (mental - 78) + (regularidade - 78) },
    { traitId: 'FAST_STARTER', score: (explosividade - 80) + (velocidade - 78) },
    { traitId: 'ENDURANCE_ENGINE', score: (resistencia - 84) + (recuperacao - 80) },
    { traitId: 'RETURN_HUNTER', score: (ret - 82) + (leitura - 78) },
    { traitId: 'BASELINE_ANCHOR', score: (Math.max(fhCtl, bhCtl) - 82) + (regularidade - 76) + (leitura - 76) },
    { traitId: 'NET_RUSHER', score: (volley - 75) + (smash - 70) + (style.includes('SRV') ? 12 : 0) + (netGame === 'HUNTER' ? 8 : 0) },
    { traitId: 'ADAPTIVE_MIND', score: (visao - 80) + (leitura - 78) + (getAttr(player, 'adaptacao') - 80) },
    { traitId: 'FIRST_STRIKE', score: (Math.max(fhPow, bhPow) - 82) + (serveForca - 78) + (explosividade - 76) },
    { traitId: 'MARATHON_CLOSER', score: (resistencia - 82) + (mental - 76) + (regularidade - 76) },
    { traitId: 'FRONT_FOOT_DICTATOR', score: (Math.max(fhPow, bhPow) - 80) + (visao - 74) + (explosividade - 74) },
    { traitId: 'ABSORBER', score: (ret - 80) + (regularidade - 76) + (defesa - 76) },
    { traitId: 'BIG_MATCH_PULSE', score: (mental - 80) + (visao - 74) + (regularidade - 74) },
    { traitId: 'RHYTHM_BREAKER', score: (slice - 78) + (leitura - 76) + (visao - 72) },
    { traitId: 'SURFACE_CLAY', score: (topspin - 80) + (slice - 72) + clayTitles * 6 },
    { traitId: 'SURFACE_GRASS', score: (slice - 80) + (serveForca - 76) + grassTitles * 7 + (style.includes('SRV') ? 10 : 0) },
    { traitId: 'SURFACE_HARD', score: (Math.max(fhPow, bhPow) - 80) + (regularidade - 76) + hardTitles * 6 },
    { traitId: 'SURFACE_INDOOR', score: (serveForca - 78) + (servePrec - 76) + indoorTitles * 7 },
  ];
}

function buildShadowCandidates(player) {
  const servePrec = getAttr(player, 'saquePrecisao');
  const mental = getAttr(player, 'mentalidade');
  const regularidade = getAttr(player, 'regularidade');
  const explosividade = getAttr(player, 'explosividade');
  const slice = getAttr(player, 'slice');
  const volley = getAttr(player, 'volley');
  return [
    { traitId: 'SLOW_STARTER', score: Math.max(0, 66 - explosividade) + Math.max(0, 64 - regularidade) },
    { traitId: 'SECOND_SERVE_FEAR', score: Math.max(0, 60 - servePrec) * 1.2 },
    { traitId: 'BIG_STAGE_TENSION', score: Math.max(0, 64 - mental) + Math.max(0, 66 - regularidade) },
    { traitId: 'FRONT_RUNNER_FADE', score: Math.max(0, 62 - regularidade) + Math.max(0, 62 - mental) },
    { traitId: 'TIEBREAK_RUSH', score: Math.max(0, 64 - regularidade) + Math.max(0, 62 - mental) },
    { traitId: 'SHORT_BALL_HESITATION', score: Math.max(0, 64 - regularidade) + Math.max(0, 68 - getAttr(player, 'visaoTatica')) },
    { traitId: 'CROWD_STATIC', score: Math.max(0, 62 - mental) + Math.max(0, 64 - getAttr(player, 'adaptacao')) },
    { traitId: 'GRASS_FOOTWORK_DISCOMFORT', score: Math.max(0, 58 - slice) + Math.max(0, 60 - volley) },
  ];
}

function buildCareerCandidates(player) {
  const titles = player?.careerTitles ?? {};
  const gs = titles.gs ?? 0;
  const masters = titles.masters ?? 0;
  const age = player?.age ?? 24;
  const injuries = Array.isArray(player?.injuryHistory) ? player.injuryHistory.length : 0;
  const surfaceStats = player?.surfaceStats ?? {};
  return [
    { traitId: 'SLAM_PROVEN', score: gs > 0 ? 50 + gs * 8 : 0 },
    { traitId: 'MASTERS_PROVEN', score: masters >= 2 ? 35 + masters * 6 : 0 },
    { traitId: 'CIRCUIT_IRONMAN', score: age >= 30 ? 22 + Math.max(0, getAttr(player, 'resistencia') - 78) : 0 },
    { traitId: 'CLAY_DYNASTY', score: (surfaceStats.CLAY?.titlesWon ?? 0) >= 4 ? 30 + (surfaceStats.CLAY?.titlesWon ?? 0) * 4 : 0 },
    { traitId: 'HARD_EMPIRE', score: (surfaceStats.HARD?.titlesWon ?? 0) >= 5 ? 30 + (surfaceStats.HARD?.titlesWon ?? 0) * 3 : 0 },
    { traitId: 'INJURY_SURVIVOR', score: injuries >= 2 ? 26 + injuries * 4 : 0 },
    { traitId: 'FIVE_SET_VETERAN', score: gs >= 1 && age >= 26 ? 24 + gs * 8 + Math.max(0, getAttr(player, 'resistencia') - 78) : 0 },
    { traitId: 'FINALS_SCAR', score: (player?._careerFinals ?? 0) >= 4 ? 22 + (player?._careerFinals ?? 0) * 3 : 0 },
    { traitId: 'SURFACE_REIGN', score: Object.values(surfaceStats).some((block) => (block?.titlesWon ?? 0) >= 6) ? 34 : 0 },
    { traitId: 'COMEBACK_SEASON', score: injuries >= 1 && age >= 25 ? 18 + injuries * 3 : 0 },
  ];
}

function buildSignatureSlots(player) {
  const slots = [];
  const naturalSig = player?.naturalSignature ? `SIG_${player.naturalSignature}` : null;
  const coachSig = player?.coach?.signature ? `SIG_${player.coach.signature}` : null;
  if (naturalSig && TRAIT_CATALOG[naturalSig]) {
    slots.push({
      traitId: naturalSig,
      family: TRAIT_FAMILIES.SIGNATURE,
      origin: TRAIT_ORIGINS.INNATE,
      unlockedAt: 'naturalSignature',
    });
  }
  if (coachSig && coachSig !== naturalSig && TRAIT_CATALOG[coachSig]) {
    slots.push({
      traitId: coachSig,
      family: TRAIT_FAMILIES.SIGNATURE,
      origin: TRAIT_ORIGINS.DEVELOPED,
      unlockedAt: 'coachSignature',
    });
  }
  const fhPow = getAttr(player, 'fhPotencia');
  const bhCtl = getAttr(player, 'bhControle');
  const topspin = getAttr(player, 'topspin');
  const slice = getAttr(player, 'slice');
  const serveForca = getAttr(player, 'saqueForca');
  const servePrec = getAttr(player, 'saquePrecisao');
  const ret = getAttr(player, 'devolucao');
  const volley = getAttr(player, 'volley');
  const leitura = getAttr(player, 'leitura');
  const style = String(player?.styleId ?? '').toUpperCase();

  const heuristicCandidates = [
    fhPow >= 88 && topspin >= 78 ? 'SIG_FH_INSIDE_IN_HAMMER' : null,
    bhCtl >= 88 && leitura >= 82 ? 'SIG_BH_DTL_REDIRECT' : null,
    topspin >= 88 ? 'SIG_HEAVY_CROSS_FH_LOOP' : null,
    slice >= 88 ? 'SIG_SKID_SLICE_APPROACH' : null,
    servePrec >= 84 && topspin >= 76 ? 'SIG_WIDE_KICK_SERVE' : null,
    serveForca >= 88 && servePrec >= 74 ? 'SIG_BODY_JAM_SERVE' : null,
    ret >= 86 && leitura >= 84 ? 'SIG_RETURN_BLOCK_KNIFE' : null,
    bhCtl >= 84 && slice >= 72 ? 'SIG_SHORT_BH_ANGLE' : null,
    volley >= 82 ? 'SIG_DROP_VOLLEY_TOUCH' : null,
    style.includes('RETRIEVER') || (slice >= 80 && leitura >= 84) ? 'SIG_LOB_RESET_ARTIST' : null,
  ].filter(Boolean);

  for (const traitId of heuristicCandidates) {
    if (slots.some((slot) => slot.traitId === traitId) || !TRAIT_CATALOG[traitId]) continue;
    slots.push({
      traitId,
      family: TRAIT_FAMILIES.SIGNATURE,
      origin: TRAIT_ORIGINS.INNATE,
      unlockedAt: 'signatureHeuristic',
    });
  }
  return slots;
}

function buildInitialTraitSlots(player) {
  const caps = getPotentialSlots(player);
  const slots = [];

  for (const entry of pickTop(buildCoreCandidates(player), caps.core)) {
    slots.push({
      traitId: entry.traitId,
      family: TRAIT_FAMILIES.CORE,
      origin: TRAIT_ORIGINS.INNATE,
      unlockedAt: 'baseline',
    });
  }

  for (const slot of buildSignatureSlots(player).slice(0, caps.signature)) {
    slots.push(slot);
  }

  for (const entry of pickTop(buildCareerCandidates(player), caps.career)) {
    slots.push({
      traitId: entry.traitId,
      family: TRAIT_FAMILIES.CAREER,
      origin: TRAIT_ORIGINS.EARNED,
      unlockedAt: 'career',
    });
  }

  for (const entry of pickTop(buildShadowCandidates(player), caps.shadow)) {
    if (entry.score <= 0) continue;
    slots.push({
      traitId: entry.traitId,
      family: TRAIT_FAMILIES.SHADOW,
      origin: TRAIT_ORIGINS.INNATE,
      unlockedAt: 'baseline',
    });
  }

  const dedup = new Set();
  return slots.filter((slot) => {
    if (dedup.has(slot.traitId)) return false;
    dedup.add(slot.traitId);
    return true;
  });
}

function buildRandomizedInitialTraitSlots(player, seedTag = 'initial') {
  const caps = getPotentialSlots(player);
  const rng = createSeededRng(`${player?.id ?? player?.name ?? 'PLAYER'}:${seedTag}`);
  const slots = [];

  for (const entry of pickWeightedRandom(buildCoreCandidates(player), caps.core, rng, { minScore: 8, poolSize: Math.max(4, caps.core * 3) })) {
    slots.push({
      traitId: entry.traitId,
      family: TRAIT_FAMILIES.CORE,
      origin: TRAIT_ORIGINS.INNATE,
      unlockedAt: 'baseline-randomized',
    });
  }

  const signatureSlots = buildSignatureSlots(player);
  if (signatureSlots.length) {
    const shuffled = [...signatureSlots].sort(() => rng() - 0.5).slice(0, caps.signature);
    slots.push(...shuffled);
  }

  for (const entry of pickWeightedRandom(buildCareerCandidates(player), caps.career, rng, { minScore: 18, poolSize: Math.max(3, caps.career * 3) })) {
    slots.push({
      traitId: entry.traitId,
      family: TRAIT_FAMILIES.CAREER,
      origin: TRAIT_ORIGINS.EARNED,
      unlockedAt: 'career-randomized',
    });
  }

  for (const entry of pickWeightedRandom(buildShadowCandidates(player), caps.shadow, rng, { minScore: 6, poolSize: Math.max(3, caps.shadow * 3) })) {
    slots.push({
      traitId: entry.traitId,
      family: TRAIT_FAMILIES.SHADOW,
      origin: TRAIT_ORIGINS.INNATE,
      unlockedAt: 'baseline-randomized',
    });
  }

  const dedup = new Set();
  return slots.filter((slot) => {
    if (dedup.has(slot.traitId)) return false;
    dedup.add(slot.traitId);
    return true;
  });
}

export function initPlayerDNA(player) {
  if (!player) return player;
  ensureTraitState(player);
  if (!player.dna) {
    player.dna = {
      disabled: true,
      score: 0,
      tier: 'DISABLED',
      slots: [],
      milestones: [],
      sombras: [],
      metrics: {},
      history: [{ type: 'LEGACY_TRAITS_DISABLED' }],
      tags: [],
    };
  }
  return player;
}

export function assignTraits(player) {
  initPlayerDNA(player);
  const state = ensureTraitState(player);
  if (!state.slots.length) {
    state.slots = buildInitialTraitSlots(player);
    state.history.push({ type: 'TRAITS_ASSIGNED', total: state.slots.length });
  }
  return player;
}

export function migratePlayerDNA(player) {
  return assignTraits(player);
}

export function assignRandomInitialTraits(player, options = {}) {
  if (!player) return player;
  initPlayerDNA(player);
  const state = ensureTraitState(player);
  if (state.slots.length && !options.force) return player;
  state.slots = buildRandomizedInitialTraitSlots(player, options.seedTag ?? 'initial');
  state.history.push({
    type: 'TRAITS_RANDOMIZED_INITIAL',
    seedTag: options.seedTag ?? 'initial',
    total: state.slots.length,
  });
  return player;
}

export function assignRandomInitialTraitsToRoster(playersMap = {}, options = {}) {
  for (const player of Object.values(playersMap ?? {})) {
    assignRandomInitialTraits(player, options);
  }
  return playersMap;
}

export function sanitizeTraitSlots(player) {
  return assignTraits(player);
}

export function dnaScoreFromPotential() {
  return 0;
}

export function buildCoachWeightedPool(pool = []) {
  return pool;
}

export function checkMilestones() {
  return [];
}

export function progressSombra() {
  return [];
}

export function progressSombraWithCoach() {
  return [];
}

export function recordMetric(player) {
  return player;
}

function seasonSurfaceBlock(seasonMetrics, surface) {
  return seasonMetrics?.surfaceBlocks?.[surface] ?? { wins: 0, qfs: 0, semis: 0, finals: 0, titles: 0, byCategory: {} };
}

function buildSeasonalCoreCandidates(player, seasonMetrics = {}, env = {}) {
  const baseScores = Object.fromEntries(buildCoreCandidates(player).map((entry) => [entry.traitId, entry.score]));
  const clay = seasonSurfaceBlock(seasonMetrics, 'CLAY');
  const grass = seasonSurfaceBlock(seasonMetrics, 'GRASS');
  const hard = seasonSurfaceBlock(seasonMetrics, 'HARD');
  const indoor = seasonSurfaceBlock(seasonMetrics, 'INDOOR');
  const titles = seasonMetrics?.titles ?? 0;
  const wins = seasonMetrics?.wins ?? 0;
  const tbWon = seasonMetrics?.tiebreaksWon ?? 0;
  const mpSaved = seasonMetrics?.matchPointsSaved ?? 0;
  const slamFinals = seasonMetrics?.slamFinals ?? 0;
  const mastersFinals = seasonMetrics?.mastersFinals ?? 0;
  const multiSurfaceTitles = [clay, grass, hard, indoor].filter((block) => (block.titles ?? 0) > 0).length;

  return [
    { traitId: 'CLOSER', score: (baseScores.CLOSER ?? 0) + tbWon * 6 + mpSaved * 12 + slamFinals * 14 + mastersFinals * 8 },
    { traitId: 'FAST_STARTER', score: (baseScores.FAST_STARTER ?? 0) + (wins >= 35 ? 12 : 0) + (titles >= 2 ? 10 : 0) + ((player?.age ?? 24) <= 23 ? 8 : 0) },
    { traitId: 'ENDURANCE_ENGINE', score: (baseScores.ENDURANCE_ENGINE ?? 0) + wins * 0.35 + titles * 7 + ((player?.age ?? 24) >= 27 ? 6 : 0) },
    { traitId: 'RETURN_HUNTER', score: (baseScores.RETURN_HUNTER ?? 0) + wins * 0.14 + hard.wins * 0.18 + tbWon * 1.8 },
    { traitId: 'BASELINE_ANCHOR', score: (baseScores.BASELINE_ANCHOR ?? 0) + wins * 0.18 + clay.wins * 0.22 + hard.wins * 0.16 },
    { traitId: 'NET_RUSHER', score: (baseScores.NET_RUSHER ?? 0) + grass.titles * 18 + grass.wins * 0.35 + indoor.titles * 12 },
    { traitId: 'ADAPTIVE_MIND', score: (baseScores.ADAPTIVE_MIND ?? 0) + multiSurfaceTitles * 16 + titles * 6 + mastersFinals * 4 },
    { traitId: 'FIRST_STRIKE', score: (baseScores.FIRST_STRIKE ?? 0) + titles * 8 + wins * 0.16 + hard.titles * 10 + indoor.titles * 12 },
    { traitId: 'MARATHON_CLOSER', score: (baseScores.MARATHON_CLOSER ?? 0) + wins * 0.18 + tbWon * 2.8 + slamFinals * 10 },
    { traitId: 'FRONT_FOOT_DICTATOR', score: (baseScores.FRONT_FOOT_DICTATOR ?? 0) + titles * 7 + hard.titles * 8 + indoor.titles * 8 },
    { traitId: 'ABSORBER', score: (baseScores.ABSORBER ?? 0) + wins * 0.16 + mpSaved * 10 + clay.wins * 0.15 },
    { traitId: 'BIG_MATCH_PULSE', score: (baseScores.BIG_MATCH_PULSE ?? 0) + slamFinals * 12 + mastersFinals * 8 + titles * 3 },
    { traitId: 'RHYTHM_BREAKER', score: (baseScores.RHYTHM_BREAKER ?? 0) + clay.titles * 10 + grass.titles * 12 + multiSurfaceTitles * 8 },
    { traitId: 'SURFACE_CLAY', score: (baseScores.SURFACE_CLAY ?? 0) + clay.titles * 22 + clay.finals * 8 + clay.wins * 0.22 },
    { traitId: 'SURFACE_GRASS', score: (baseScores.SURFACE_GRASS ?? 0) + grass.titles * 24 + grass.finals * 9 + grass.wins * 0.24 },
    { traitId: 'SURFACE_HARD', score: (baseScores.SURFACE_HARD ?? 0) + hard.titles * 18 + hard.finals * 8 + hard.wins * 0.22 },
    { traitId: 'SURFACE_INDOOR', score: (baseScores.SURFACE_INDOOR ?? 0) + indoor.titles * 22 + indoor.finals * 10 + indoor.wins * 0.25 },
  ];
}

function shouldHealShadow(player, traitId, seasonMetrics = {}, env = {}) {
  const currentRank = env.currentRank ?? 999;
  const prevRank = env.prevRank ?? currentRank;
  const rankJump = prevRank - currentRank;
  const titles = seasonMetrics?.titles ?? 0;
  const wins = seasonMetrics?.wins ?? 0;
  const slamFinals = seasonMetrics?.slamFinals ?? 0;
  const mastersFinals = seasonMetrics?.mastersFinals ?? 0;

  switch (traitId) {
    case 'SLOW_STARTER':
      return wins >= 30 || rankJump >= 12 || getAttr(player, 'explosividade') >= 72;
    case 'SECOND_SERVE_FEAR':
      return getAttr(player, 'saquePrecisao') >= 68 && (titles >= 1 || wins >= 24);
    case 'BIG_STAGE_TENSION':
      return slamFinals >= 1 || mastersFinals >= 2 || currentRank <= 10;
    case 'FRONT_RUNNER_FADE':
      return titles >= 2 || currentRank <= 12 || getAttr(player, 'regularidade') >= 72;
    default:
      return false;
  }
}

function buildSeasonalShadowCandidates(player, seasonMetrics = {}, env = {}) {
  const prevRank = env.prevRank ?? 999;
  const currentRank = env.currentRank ?? prevRank;
  const rankDrop = Math.max(0, currentRank - prevRank);
  const titles = seasonMetrics?.titles ?? 0;
  const wins = seasonMetrics?.wins ?? 0;
  const finals = seasonMetrics?.finals ?? 0;
  const slamSFs = seasonMetrics?.slamSFs ?? 0;
  const tbWon = seasonMetrics?.tiebreaksWon ?? 0;

  return [
    { traitId: 'SLOW_STARTER', score: wins < 12 ? Math.max(0, 10 + rankDrop - Math.max(0, getAttr(player, 'explosividade') - 62)) : 0 },
    { traitId: 'SECOND_SERVE_FEAR', score: getAttr(player, 'saquePrecisao') < 60 ? rankDrop + 8 : 0 },
    { traitId: 'BIG_STAGE_TENSION', score: (currentRank <= 20 && titles === 0) ? slamSFs * 10 + Math.max(0, finals - titles - 1) * 8 : 0 },
    { traitId: 'FRONT_RUNNER_FADE', score: finals >= 2 && titles === 0 ? 14 + rankDrop + Math.max(0, finals - 2) * 4 : 0 },
    { traitId: 'TIEBREAK_RUSH', score: tbWon === 0 && finals >= 1 ? 10 + rankDrop + slamSFs * 4 : 0 },
    { traitId: 'SHORT_BALL_HESITATION', score: finals >= 2 && titles === 0 ? 12 + Math.max(0, finals - titles) * 4 : 0 },
    { traitId: 'CROWD_STATIC', score: currentRank <= 15 && titles === 0 && slamSFs >= 1 ? 14 + rankDrop : 0 },
    { traitId: 'GRASS_FOOTWORK_DISCOMFORT', score: seasonSurfaceBlock(seasonMetrics, 'GRASS').wins === 0 ? Math.max(0, 8 - seasonSurfaceBlock(seasonMetrics, 'GRASS').titles * 4) : 0 },
  ];
}

function buildTraitProgressEvent(player, traitId, mode, year, reason = null) {
  const def = TRAIT_CATALOG[traitId];
  if (!def || !player?.id) return null;
  const verb = mode === 'HEALED' ? 'supera' : mode === 'GAINED' ? 'desenvolve' : 'registra';
  const suffix = mode === 'HEALED' ? 'como sombra da carreira' : 'como nova assinatura competitiva';
  return {
    type: mode === 'HEALED' ? 'trait_healed' : 'trait_gain',
    playerId: player.id,
    playerName: player.name,
    traitId,
    traitName: def.name,
    family: def.family,
    year,
    icon: mode === 'HEALED' ? '🩹' : def.family === TRAIT_FAMILIES.CAREER ? '🏛️' : def.family === TRAIT_FAMILIES.SIGNATURE ? '🎯' : '🧬',
    text: `${player.name} ${verb} ${def.name}${reason ? ` após ${reason}` : ` ${suffix}`}`,
  };
}

export function progressPlayerTraits(player, env = {}) {
  if (!player) return { player, gained: [], healed: [], events: [] };
  assignTraits(player);
  const state = ensureTraitState(player);
  const caps = getPotentialSlots(player);
  const seasonMetrics = env.seasonMetrics ?? {};
  const year = env.year ?? null;
  const gained = [];
  const healed = [];
  const events = [];

  const addTrait = (traitId, family, origin, unlockedAt, reason) => {
    if (!traitId || hasTrait(player, traitId)) return false;
    registerTraitSlot(player, { traitId, family, origin, unlockedAt, notes: reason ?? null });
    gained.push(traitId);
    const ev = buildTraitProgressEvent(player, traitId, 'GAINED', year, reason);
    if (ev) events.push(ev);
    return true;
  };

  const signatureCount = countFamilyTraits(player, TRAIT_FAMILIES.SIGNATURE);
  const coachSig = player?.coach?.signature ? `SIG_${player.coach.signature}` : null;
  if (coachSig && signatureCount < caps.signature && TRAIT_CATALOG[coachSig] && !hasTrait(player, coachSig)) {
    addTrait(coachSig, TRAIT_FAMILIES.SIGNATURE, TRAIT_ORIGINS.DEVELOPED, `season:${year}`, 'conexão com o técnico');
  }

  for (const entry of pickTop(buildCareerCandidates(player), caps.career)) {
    if (countFamilyTraits(player, TRAIT_FAMILIES.CAREER) >= caps.career) break;
    if (entry.score <= 0 || hasTrait(player, entry.traitId)) continue;
    addTrait(entry.traitId, TRAIT_FAMILIES.CAREER, TRAIT_ORIGINS.EARNED, `season:${year}`, 'legado de carreira');
  }

  for (const entry of pickTop(buildSeasonalCoreCandidates(player, seasonMetrics, env), caps.core + 2)) {
    if (countFamilyTraits(player, TRAIT_FAMILIES.CORE) >= caps.core) break;
    if (entry.score < 30 || hasTrait(player, entry.traitId)) continue;
    addTrait(entry.traitId, TRAIT_FAMILIES.CORE, TRAIT_ORIGINS.DEVELOPED, `season:${year}`, 'temporada forte');
  }

  for (const slot of [...(state?.slots ?? [])]) {
    if ((slot.family ?? TRAIT_CATALOG[slot.traitId]?.family) !== TRAIT_FAMILIES.SHADOW) continue;
    if (!shouldHealShadow(player, slot.traitId, seasonMetrics, env)) continue;
    if (removeTraitSlot(player, slot.traitId, { year, reason: 'shadowHealed' })) {
      healed.push(slot.traitId);
      const ev = buildTraitProgressEvent(player, slot.traitId, 'HEALED', year, 'uma temporada de superação');
      if (ev) events.push(ev);
    }
  }

  for (const entry of pickTop(buildSeasonalShadowCandidates(player, seasonMetrics, env), caps.shadow)) {
    if (countFamilyTraits(player, TRAIT_FAMILIES.SHADOW) >= caps.shadow) break;
    if (entry.score < 16 || hasTrait(player, entry.traitId)) continue;
    addTrait(entry.traitId, TRAIT_FAMILIES.SHADOW, TRAIT_ORIGINS.DEVELOPED, `season:${year}`, 'uma temporada turbulenta');
  }

  if (gained.length || healed.length) {
    state.history.push({
      type: 'TRAIT_SEASON_REVIEW',
      year,
      gained: [...gained],
      healed: [...healed],
      total: state.slots.length,
    });
  }

  return { player, gained, healed, events };
}

export function progressTraitsForSeason(players = [], env = {}) {
  const updatedPlayers = [];
  const events = [];
  const deltas = [];
  for (const player of players) {
    const result = progressPlayerTraits(player, {
      ...env,
      seasonMetrics: env?.seasonMetricsByPlayer?.[player.id] ?? env?.seasonMetrics ?? {},
      currentRank: env?.rankMap?.[player.id] ?? env?.prospectRankMap?.[player.id] ?? player.rankPosition ?? 999,
      prevRank: env?.prevRankMap?.[player.id] ?? player.rankPosition ?? 999,
    });
    updatedPlayers.push(result.player);
    if (result.events.length) events.push(...result.events);
    if (result.gained.length || result.healed.length) {
      deltas.push({
        playerId: player.id,
        playerName: player.name,
        gained: result.gained.map((traitId) => TRAIT_CATALOG[traitId]?.name ?? traitId),
        healed: result.healed.map((traitId) => TRAIT_CATALOG[traitId]?.name ?? traitId),
      });
    }
  }
  return { updatedPlayers, events, deltas };
}

export function collectTraitContexts(player, env = {}) {
  const contexts = new Set(['always']);
  const surface = env.surface ?? env.courtSurface ?? env.courtMeta?.surface;
  if (surface) contexts.add(`surface:${String(surface).toUpperCase()}`);
  if (env.bestOf === 5) contexts.add('bestOf5');
  if (env.inTiebreak) contexts.add('tiebreak');
  if (env.isServing) contexts.add('serve');
  if (env.isReturning || env.isReturn) contexts.add('return');
  if (env.isAtNet) contexts.add('net');
  if (env.isBreakPoint) contexts.add('breakPoint');
  if (env.isSlam || ['F', 'SF', 'QF'].includes(env.roundLabel)) contexts.add('bigMatch');
  if ((env.totalSets === 4 && env.bestOf === 5) || (env.totalSets === 2 && env.bestOf === 3)) contexts.add('decidingSet');
  if ((env.playerGames ?? 0) === 0 && (env.oppGames ?? 0) === 0) contexts.add('earlyMatch');
  if ((env.playerGames ?? 0) - (env.oppGames ?? 0) >= 3 || (env.playerSets ?? 0) > (env.oppSets ?? 0)) contexts.add('ahead');
  if ((env.oppGames ?? 0) - (env.playerGames ?? 0) >= 3 || (env.playerSets ?? 0) < (env.oppSets ?? 0)) contexts.add('behind');
  if (env.rally >= 4 || env.isRally) contexts.add('rally');
  if ((env.energy ?? 1) <= 0.42 || env.fatigued) contexts.add('fatigued');
  if (Array.isArray(env.extraContexts)) {
    for (const ctx of env.extraContexts) contexts.add(ctx);
  }
  return [...contexts];
}

export function getTraitEffects(player, ctx = {}) {
  const state = ensureTraitState(assignTraits(player));
  if (!state?.slots?.length) return baseEffectVector();
  const contexts = Array.isArray(ctx?.contexts) && ctx.contexts.length
    ? ctx.contexts
    : collectTraitContexts(player, ctx);
  return state.slots.reduce((acc, slot) => mergeEffects(acc, collectSlotEffects(slot, contexts)), baseEffectVector());
}

export function getTraitStrengthMods(player, surface = 'HARD', contexts = []) {
  const effectVector = getTraitEffects(player, { surface, contexts: Array.isArray(contexts) ? contexts : [contexts] });
  const selfBonus =
    effectVector.power * 1.1 +
    effectVector.precision * 1.0 +
    effectVector.topspin * 0.6 +
    effectVector.slice * 0.6 +
    effectVector.serveQuality * 1.0 +
    effectVector.returnQuality * 0.95 +
    effectVector.rallyTolerance * 0.85 +
    effectVector.fatigueResistance * 0.8 +
    effectVector.clutch * 0.95 +
    effectVector.composure * 0.85 +
    effectVector.adaptation * 0.7;
  return { selfBonus, opponentDebuff: 0 };
}

export function registerTraitSlot(player, slot) {
  if (!player || !slot?.traitId) return player;
  const state = ensureTraitState(assignTraits(player));
  if (state.slots.some((entry) => entry.traitId === slot.traitId)) return player;
  state.slots.push({
    traitId: slot.traitId,
    family: slot.family ?? TRAIT_FAMILIES.CORE,
    origin: slot.origin ?? TRAIT_ORIGINS.INNATE,
    unlockedAt: slot.unlockedAt ?? null,
    notes: slot.notes ?? null,
  });
  state.history.push({ type: 'TRAIT_ADDED', traitId: slot.traitId });
  return player;
}

export function getPlayerTraits(player) {
  const state = ensureTraitState(assignTraits(player));
  return (state?.slots ?? []).map((slot) => {
    const def = TRAIT_CATALOG[slot.traitId] ?? {};
    return {
      traitId: slot.traitId,
      family: slot.family ?? def.family ?? TRAIT_FAMILIES.CORE,
      origin: slot.origin ?? TRAIT_ORIGINS.INNATE,
      name: def.name ?? slot.traitId,
      short: def.short ?? '',
      contexts: def.contexts ?? ['always'],
      effects: normalizeEffects(def.effects),
      shotFamily: def.shotFamily ?? null,
      unlockedAt: slot.unlockedAt ?? null,
      notes: slot.notes ?? null,
    };
  });
}

export function getTraitPresentation(player) {
  const traits = getPlayerTraits(player);
  const weighted = traits.map((trait) => {
    const familyWeight =
      trait.family === TRAIT_FAMILIES.CORE ? 140 :
      trait.family === TRAIT_FAMILIES.SIGNATURE ? 118 :
      trait.family === TRAIT_FAMILIES.CAREER ? 102 :
      72;
    const effectWeight = Object.entries(trait.effects ?? {}).reduce((sum, [key, value]) => {
      if (key === 'shotBias') return sum + Object.keys(value ?? {}).length * 6;
      return sum + Math.abs(value ?? 0) * 10;
    }, 0);
    return { ...trait, weight: familyWeight + effectWeight };
  }).sort((a, b) => b.weight - a.weight);

  return {
    primary: weighted[0] ?? null,
    spotlight: weighted.slice(0, 3),
    byFamily: {
      CORE: weighted.filter((trait) => trait.family === TRAIT_FAMILIES.CORE),
      SIGNATURE: weighted.filter((trait) => trait.family === TRAIT_FAMILIES.SIGNATURE),
      CAREER: weighted.filter((trait) => trait.family === TRAIT_FAMILIES.CAREER),
      SHADOW: weighted.filter((trait) => trait.family === TRAIT_FAMILIES.SHADOW),
    },
  };
}

export function captureTraitSnapshot(player) {
  return getPlayerTraits(player).map((slot) => ({
    traitId: slot.traitId,
    family: slot.family,
    origin: slot.origin,
  }));
}

export function diffTraitSnapshots(before = [], after = []) {
  const beforeIds = new Set(before.map((slot) => slot.traitId));
  const afterIds = new Set(after.map((slot) => slot.traitId));
  return {
    gained: after.filter((slot) => !beforeIds.has(slot.traitId)),
    lost: before.filter((slot) => !afterIds.has(slot.traitId)),
    evolved: [],
    regressed: [],
    healed: [],
  };
}

export function summarizeTraitDelta(delta, limit = 4) {
  return (delta.gained ?? []).slice(0, limit).map((slot) => `ganhou ${slot.name ?? slot.traitId}`);
}

export function describePlayerTraits(player) {
  const traits = getPlayerTraits(player);
  if (!traits.length) return `${player?.name || player?.id || 'Jogador'}: sem traits ativas`;
  return `${player?.name || player?.id || 'Jogador'}: ${traits.map((slot) => slot.name).join(', ')}`;
}
