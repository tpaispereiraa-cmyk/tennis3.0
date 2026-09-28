import { generatePrefs, getArchetype } from './playerPrefs.js';

const DEFAULT_IDENTITY = Object.freeze({
  favoritePlay: 'CROSS_PRESSURE_DTL',
  competitiveInstinct: 'PRESS_OPENING',
  blindSpot: 'EARLY_DTL_FORCE',
});

function hashString(input = '') {
  let h = 2166136261;
  const s = String(input);
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function attr(player, key, fallback = 50) {
  const v = Number(player?.attrs?.[key]);
  return Number.isFinite(v) ? v : fallback;
}

function hasTrait(player, pattern) {
  const slots = [
    ...(player?.dna?.slots ?? []),
    ...(player?.activeTraits ?? []),
    ...(player?.traits ?? []),
  ];
  return slots.some((slot) => pattern.test(String(slot?.traitId ?? slot?.id ?? slot?.name ?? '')));
}

function byId(catalog, id, fallbackId) {
  return catalog[id] ?? catalog[fallbackId] ?? Object.values(catalog)[0];
}

function scorePick(catalog, player, kind) {
  const prefs = player?.prefs ?? generatePrefs(player?.attrs ?? {});
  const archetype = getArchetype(prefs);
  const seed = hashString([
    player?.courtIdentitySeed,
    player?.id,
    player?.name,
    player?.fullName,
    player?.nationality,
    kind,
    prefs.buildStyle,
    prefs.netGame,
    prefs.rallyCadence,
    prefs.riskProfile,
    player?.naturalSignature,
    player?.rallyPattern,
    player?.signaturePattern,
    archetype?.id,
  ].filter(Boolean).join('|'));

  let best = null;
  for (const item of Object.values(catalog)) {
    const score = (item.score?.({ player, prefs, archetype, attr, hasTrait }) ?? 0)
      + ((hashString(`${seed}:${item.id}`) % 1000) / 1000) * 0.018;
    if (!best || score > best.score) best = { item, score };
  }
  return best?.item ?? Object.values(catalog)[0];
}

function clean(item) {
  const { score, ...rest } = item;
  return Object.freeze({
    ...rest,
    engineTags: Object.freeze({ ...(rest.engineTags ?? {}) }),
  });
}

const bound = (value, limit = 0.18) => Math.max(-limit, Math.min(limit, Number(value) || 0));
const axis = (player, key, scale = 0.12) => {
  const seed = `${player?.courtIdentitySeed ?? player?.id ?? player?.name ?? 'anonymous'}:${key}`;
  return (((hashString(seed) % 2001) / 1000) - 1) * scale;
};

// These are preferences, never extra ability. A signature also informs what a
// player looks for; SignatureMoves remains the authority for special execution.
const SIGNATURE_VOCABULARY = Object.freeze({
  DROP_HIDDEN: { familyBias: { DROP: 0.075 }, blueprintBias: { DROP_DISGUISED_CROSS: 0.075, DROP_STRAIGHT_DEAD: 0.06 } },
  FH_INSIDE_OUT: { blueprintBias: { TOPSPIN_INSIDE_OUT: 0.06, FLAT_INSIDE_IN: 0.045 } },
  INSIDE_OUT_FH: { blueprintBias: { TOPSPIN_INSIDE_OUT: 0.06, FLAT_INSIDE_IN: 0.045 } },
});

function courtTendencies(player, override) {
  const prefs = player?.prefs ?? generatePrefs(player?.attrs ?? {});
  const signature = SIGNATURE_VOCABULARY[player?.naturalSignature ?? player?.signatureShot] ?? {};
  const varied = ['VARIED', 'DROP_VARIATION', 'SLICE_CONTROL'].includes(prefs.buildStyle);
  const forehand = ['FH_INSIDE_OUT', 'SERVE_WIDE_PLUS_ONE'].includes(override.favoritePlay);
  const drop = override.favoritePlay === 'DROP_AFTER_DEPTH' || prefs.buildStyle === 'DROP_VARIATION';
  const offensive = ['EARLY_ATTACK', 'EXPLOSIVE'].includes(prefs.rallyCadence);
  const net = ['PROACTIVE', 'HUNTER'].includes(prefs.netGame);
  const make = (base, custom = {}) => Object.freeze(Object.fromEntries(Object.entries({ ...base, ...custom }).map(([k, v]) => [k, bound(v, k === 'baselineDepthBias' ? 0.38 : 0.18)])));
  const positioning = make({ baselineDepthBias: axis(player, 'depth', 0.18) + (offensive ? -0.11 : 0.06), courtPositionAggression: axis(player, 'position'), netFollowBias: net ? 0.10 : 0, returnDepthBias: axis(player, 'returnDepth', 0.10) }, override.positioning);
  const timing = make({ earlyContactBias: axis(player, 'early') + (offensive ? 0.08 : 0), riseContactBias: axis(player, 'rise'), peakContactBias: axis(player, 'peak') + (prefs.rallyCadence === 'PATIENT' ? 0.07 : 0), lateContactTolerance: axis(player, 'late', 0.08) }, override.timing);
  const movement = make({ forehandRunaroundBias: axis(player, 'runaround') + (forehand ? 0.09 : 0), centerRecoveryBias: axis(player, 'center'), aggressiveRecoveryBias: offensive ? 0.07 : 0, netTransitionBias: net ? 0.10 : 0 }, override.movement);
  const vocabulary = override.shotVocabulary ?? {};
  const shotVocabulary = Object.freeze({
    familyBias: Object.freeze({ TOPSPIN: varied ? 0.01 : 0.035, SLICE: varied ? 0.045 : 0, DROP: drop ? 0.065 : 0, ...signature.familyBias, ...vocabulary.familyBias }),
    intentBias: Object.freeze({ ...(offensive ? { PRESSURE: 0.035 } : { BUILD: 0.025 }), ...vocabulary.intentBias }),
    directionBias: Object.freeze({ ...(prefs.buildStyle === 'CROSS_DOMINANT' ? { CROSS: 0.055 } : {}), ...vocabulary.directionBias }),
    blueprintBias: Object.freeze({ ...signature.blueprintBias, ...vocabulary.blueprintBias }),
    variationTolerance: bound(vocabulary.variationTolerance ?? (varied ? 0.12 : axis(player, 'variation', 0.08))),
    repeatTolerance: bound(vocabulary.repeatTolerance ?? (prefs.buildStyle === 'CROSS_DOMINANT' ? 0.13 : axis(player, 'repeat', 0.08))),
  });
  const construction = Object.freeze({ favoritePatterns: Object.freeze(override.construction?.favoritePatterns ?? (drop ? ['DEPTH_TO_DROP'] : forehand ? ['SETUP_FOREHAND'] : net ? ['SETUP_NET'] : ['PIN_AND_OPEN'])) });
  return { positioning, timing, movement, shotVocabulary, construction,
    adaptation: make({ learningBias: axis(player, 'learning', 0.08), planAdherence: axis(player, 'plan', 0.08) }, override.adaptation),
    returnIdentity: make({ attackSecondServeBias: offensive ? 0.09 : 0, chipBias: varied ? 0.05 : 0, positionBias: axis(player, 'returnPosition', 0.12) }, override.returnIdentity),
    serveIdentity: Object.freeze({ directionBias: Object.freeze({ ...(prefs.serve1Bias ? { [prefs.serve1Bias]: 0.04 } : {}), ...override.serveIdentity?.directionBias }) }),
  };
}

export const FAVORITE_PLAY_CATALOG = Object.freeze({
  SERVE_WIDE_PLUS_ONE: {
    id: 'SERVE_WIDE_PLUS_ONE', label: 'Saque aberto + primeira bola', abbr: 'WIDE+1', icon: 'W+1',
    desc: 'Abre a quadra no saque e procura dominar a primeira pancada.',
    engineTags: { intents: ['PRESSURE', 'FINISH'], families: ['FLAT_DRIVE', 'TOPSPIN'], serveBias: ['WIDE'], bonus: 0.06 },
    score: ({ player, prefs, attr }) => (prefs.serve1Bias === 'WIDE' ? 32 : 0) + attr(player, 'saquePrecisao') * 0.26 + attr(player, 'fhPotencia') * 0.20,
  },
  BODY_SERVE_CENTER_PUNCH: {
    id: 'BODY_SERVE_CENTER_PUNCH', label: 'Saque no corpo + ataque central', abbr: 'BODY+', icon: 'BODY',
    desc: 'Trava o rival no corpo e usa a bola seguinte para tomar o centro.',
    engineTags: { intents: ['CONTROL', 'PRESSURE'], families: ['FLAT_DRIVE', 'TOPSPIN'], serveBias: ['BODY'], bonus: 0.05 },
    score: ({ player, prefs, attr }) => (prefs.serve1Bias === 'BODY' ? 28 : 0) + attr(player, 'saquePrecisao') * 0.22 + attr(player, 'visaoTatica') * 0.16,
  },
  KICK_HIGH_FH: {
    id: 'KICK_HIGH_FH', label: 'Kick alto + forehand pesado', abbr: 'KICK/FH', icon: 'K+FH',
    desc: 'Usa quique alto para ganhar tempo e entrar com forehand pesado.',
    engineTags: { intents: ['BUILD', 'PRESSURE'], families: ['TOPSPIN'], serveBias: ['KICK', 'SHAPE'], bonus: 0.06 },
    score: ({ player, prefs, attr }) => (prefs.serve2Bias === 'KICK' ? 28 : 0) + attr(player, 'topspin') * 0.36 + attr(player, 'fhPotencia') * 0.18,
  },
  CROSS_PRESSURE_DTL: {
    id: 'CROSS_PRESSURE_DTL', label: 'Cruzado pesado até abrir paralela', abbr: 'CRZ>DTL', icon: 'X>DTL',
    desc: 'Constrói cruzado até o rival ceder espaço para a mudança de direção.',
    engineTags: { intents: ['BUILD', 'PRESSURE'], families: ['TOPSPIN', 'FLAT_DRIVE'], buildStyles: ['CROSS_DOMINANT', 'CROSS_BUILDER', 'DTL_HUNTER'], bonus: 0.055 },
    score: ({ player, prefs, attr }) => (['CROSS_DOMINANT', 'CROSS_BUILDER', 'DTL_HUNTER'].includes(prefs.buildStyle) ? 34 : 0) + attr(player, 'topspin') * 0.24 + attr(player, 'leitura') * 0.16,
  },
  SLICE_CHARGE: {
    id: 'SLICE_CHARGE', label: 'Slice baixo + subida', abbr: 'SLC/NET', icon: 'SLC',
    desc: 'Baixa a bola com slice e fecha o espaço na rede.',
    engineTags: { intents: ['APPROACH', 'RESET'], families: ['SLICE', 'VOLLEY'], buildStyles: ['SLICE_CONTROL'], bonus: 0.07 },
    score: ({ player, prefs, attr }) => (prefs.buildStyle === 'SLICE_CONTROL' ? 36 : 0) + (['PROACTIVE', 'HUNTER'].includes(prefs.netGame) ? 18 : 0) + attr(player, 'slice') * 0.30 + attr(player, 'volley') * 0.18,
  },
  DROP_AFTER_DEPTH: {
    id: 'DROP_AFTER_DEPTH', label: 'Curta depois de empurrar o rival', abbr: 'DROP', icon: 'DROP',
    desc: 'Leva o adversário para trás e quebra o ponto com toque curto.',
    engineTags: { intents: ['BUILD', 'PRESSURE', 'FINISH'], families: ['DROP'], buildStyles: ['DROP_VARIATION', 'VARIED'], bonus: 0.075 },
    score: ({ player, prefs, attr }) => (prefs.buildStyle === 'DROP_VARIATION' ? 40 : 0) + attr(player, 'slice') * 0.25 + attr(player, 'leitura') * 0.20 + attr(player, 'visaoTatica') * 0.16,
  },
  RETURN_BODY_ATTACK: {
    id: 'RETURN_BODY_ATTACK', label: 'Devolução no corpo + ataque', abbr: 'RET.BODY', icon: 'RET',
    desc: 'Tira tempo do sacador mirando o corpo e entra agressivo na sequência.',
    engineTags: { intents: ['PRESSURE'], families: ['FLAT_DRIVE', 'TOPSPIN', 'BLOCK_RETURN'], bonus: 0.05 },
    score: ({ player, prefs, attr }) => attr(player, 'devolucao') * 0.34 + attr(player, 'explosividade') * 0.20 + (['EARLY_ATTACK', 'EXPLOSIVE'].includes(prefs.rallyCadence) ? 18 : 0),
  },
  BH_DTL_SHORT_BALL: {
    id: 'BH_DTL_SHORT_BALL', label: 'Backhand paralelo na bola curta', abbr: 'BH.DTL', icon: 'BH',
    desc: 'Quando recebe bola curta, muda direção pelo backhand sem hesitar.',
    engineTags: { intents: ['PRESSURE', 'FINISH'], families: ['FLAT_DRIVE', 'TOPSPIN'], buildStyles: ['DTL_HUNTER', 'COUNTER_REDIRECT'], bonus: 0.06 },
    score: ({ player, prefs, attr }) => (['DTL_HUNTER', 'COUNTER_REDIRECT'].includes(prefs.buildStyle) ? 30 : 0) + attr(player, 'bhPotencia') * 0.26 + attr(player, 'bhControle') * 0.22,
  },
  FH_INSIDE_OUT: {
    id: 'FH_INSIDE_OUT', label: 'Forehand inside-out', abbr: 'FH.IO', icon: 'IO',
    desc: 'Gira em volta da bola e acelera o forehand para abrir a quadra.',
    engineTags: { intents: ['PRESSURE', 'FINISH'], families: ['FLAT_DRIVE', 'TOPSPIN'], bonus: 0.06 },
    score: ({ player, prefs, attr }) => attr(player, 'fhPotencia') * 0.32 + attr(player, 'explosividade') * 0.18 + (['EARLY_ATTACK', 'EXPLOSIVE'].includes(prefs.rallyCadence) ? 18 : 0),
  },
  COUNTER_PACE_REDIRECT: {
    id: 'COUNTER_PACE_REDIRECT', label: 'Contra-ataque usando ritmo rival', abbr: 'REDIR', icon: 'RED',
    desc: 'Absorve a pancada e devolve a velocidade em outra direção.',
    engineTags: { intents: ['BUILD', 'PRESSURE', 'PASS'], families: ['FLAT_DRIVE', 'TOPSPIN'], buildStyles: ['COUNTER_REDIRECT'], bonus: 0.055 },
    score: ({ player, prefs, attr }) => (prefs.buildStyle === 'COUNTER_REDIRECT' ? 38 : 0) + attr(player, 'leitura') * 0.28 + attr(player, 'devolucao') * 0.20,
  },
  DEFENSIVE_LOB_RESET: {
    id: 'DEFENSIVE_LOB_RESET', label: 'Lob defensivo para resetar', abbr: 'LOB.R', icon: 'LOB',
    desc: 'Compra tempo com altura quando o rival aperta ou invade a rede.',
    engineTags: { intents: ['DEFEND', 'RESET', 'PASS'], families: ['LOB'], bonus: 0.055 },
    score: ({ player, prefs, attr }) => attr(player, 'defesa') * 0.30 + attr(player, 'leitura') * 0.14 + (['SAFE', 'SAFETY_FIRST'].includes(prefs.riskProfile) ? 18 : 0),
  },
  SHORT_BALL_APPROACH: {
    id: 'SHORT_BALL_APPROACH', label: 'Aproximação em bola curta', abbr: 'APP', icon: 'NET',
    desc: 'Reconhece a bola curta e transforma vantagem territorial em rede.',
    engineTags: { intents: ['APPROACH'], families: ['TOPSPIN', 'FLAT_DRIVE', 'SLICE'], netGames: ['OPPORTUNIST', 'PROACTIVE', 'HUNTER'], bonus: 0.075 },
    score: ({ player, prefs, attr }) => (['OPPORTUNIST', 'PROACTIVE', 'HUNTER'].includes(prefs.netGame) ? 38 : 0) + attr(player, 'volley') * 0.20 + attr(player, 'visaoTatica') * 0.18,
  },
  MEASURED_VARIATION: {
    id: 'MEASURED_VARIATION', label: 'Variação curta/longa', abbr: 'VAR', icon: 'VAR',
    desc: 'Alterna profundidade e ritmo para tirar o rival da zona de conforto.',
    engineTags: { intents: ['BUILD', 'CONTROL'], families: ['TOPSPIN', 'SLICE', 'DROP'], buildStyles: ['VARIED', 'DROP_VARIATION', 'SLICE_CONTROL'], bonus: 0.05 },
    score: ({ player, prefs, attr }) => (prefs.buildStyle === 'VARIED' ? 40 : 0) + attr(player, 'adaptacao') * 0.22 + attr(player, 'visaoTatica') * 0.22,
  },
  SECOND_BALL_WINNER: {
    id: 'SECOND_BALL_WINNER', label: 'Winner cedo na segunda bola', abbr: '2B.WIN', icon: '2B',
    desc: 'Não deixa o rally amadurecer: procura dano logo na segunda bola.',
    engineTags: { intents: ['FINISH', 'PRESSURE'], families: ['FLAT_DRIVE'], bonus: 0.065 },
    score: ({ player, prefs, attr }) => (['EARLY_ATTACK', 'EXPLOSIVE'].includes(prefs.rallyCadence) ? 36 : 0) + (['GAMBLER', 'ALLOUT'].includes(prefs.riskProfile) ? 20 : 0) + attr(player, 'fhPotencia') * 0.20,
  },
  HIGH_BALL_TO_BH: {
    id: 'HIGH_BALL_TO_BH', label: 'Bola alta no backhand rival', abbr: 'HIGH.BH', icon: 'TOP',
    desc: 'Repete topspin alto para travar o lado menos confortável do rival.',
    engineTags: { intents: ['BUILD', 'CONTROL', 'PRESSURE'], families: ['TOPSPIN'], buildStyles: ['HEAVY_SPIN_PRESSURE', 'CROSS_DOMINANT'], bonus: 0.055 },
    score: ({ player, prefs, attr }) => (prefs.buildStyle === 'HEAVY_SPIN_PRESSURE' ? 42 : 0) + attr(player, 'topspin') * 0.34 + attr(player, 'regularidade') * 0.14,
  },
});

export const COMPETITIVE_INSTINCT_CATALOG = Object.freeze({
  CHASE_WHEN_BEHIND: { id: 'CHASE_WHEN_BEHIND', label: 'Acelera quando está atrás', abbr: 'ATRAS', icon: 'UP', desc: 'Quando o placar aperta contra, procura tomar o ponto antes.', trigger: 'placar adverso', engineTags: { trigger: 'behind', intents: ['PRESSURE', 'FINISH'], bonus: 0.065 }, score: ({ player, prefs, attr }) => attr(player, 'mentalidade') * 0.26 + attr(player, 'explosividade') * 0.18 + (['GAMBLER', 'ALLOUT'].includes(prefs.riskProfile) ? 20 : 0) },
  SAFE_ON_BREAK: { id: 'SAFE_ON_BREAK', label: 'Protege margem em break point', abbr: 'BP.SAFE', icon: 'BP', desc: 'Nos pontos grandes, reduz fantasia e escolhe execução confiável.', trigger: 'break point ou pressão alta', engineTags: { trigger: 'pressure', intents: ['RESET', 'CONTROL', 'BUILD'], bonus: 0.06 }, score: ({ player, prefs, attr }) => attr(player, 'regularidade') * 0.28 + attr(player, 'mentalidade') * 0.22 + (['SAFE', 'SAFETY_FIRST'].includes(prefs.riskProfile) ? 24 : 0) },
  PRESS_OPENING: { id: 'PRESS_OPENING', label: 'Acelera quando vê abertura', abbr: 'ABERT', icon: 'GO', desc: 'Se o rival sai de posição, transforma a leitura em pressão imediata.', trigger: 'rival exposto', engineTags: { trigger: 'rivalExposed', intents: ['PRESSURE', 'FINISH'], bonus: 0.075 }, score: ({ player, prefs, attr }) => attr(player, 'visaoTatica') * 0.28 + attr(player, 'leitura') * 0.22 + (['CALCULATED', 'GAMBLER'].includes(prefs.riskProfile) ? 16 : 0) },
  EXTEND_RIVAL_NERVES: { id: 'EXTEND_RIVAL_NERVES', label: 'Alongar quando o rival oscila', abbr: 'LONG', icon: 'LONG', desc: 'Percebe instabilidade e faz o adversário jogar mais uma bola.', trigger: 'rally médio/longo', engineTags: { trigger: 'longRally', intents: ['BUILD', 'CONTROL', 'RESET'], bonus: 0.055 }, score: ({ player, prefs, attr }) => attr(player, 'regularidade') * 0.28 + attr(player, 'defesa') * 0.20 + (['PATIENT', 'MEASURED'].includes(prefs.rallyCadence) ? 22 : 0) },
  NET_CLOSE_BIG_POINT: { id: 'NET_CLOSE_BIG_POINT', label: 'Fecha na rede em ponto grande', abbr: 'NET.BP', icon: 'NET', desc: 'Quando sente chance real, encurta caminho e fecha na rede.', trigger: 'bola curta com pressão', engineTags: { trigger: 'shortBall', intents: ['APPROACH'], bonus: 0.08 }, score: ({ player, prefs, attr }) => attr(player, 'volley') * 0.28 + attr(player, 'smash') * 0.16 + (['PROACTIVE', 'HUNTER'].includes(prefs.netGame) ? 28 : 0) },
  CHANGE_AFTER_REPEAT: { id: 'CHANGE_AFTER_REPEAT', label: 'Muda após repetição', abbr: 'MUDA', icon: 'SW', desc: 'Depois de padrão repetido, troca direção ou família para quebrar leitura.', trigger: 'streak de direção/família', engineTags: { trigger: 'streak', intents: ['BUILD', 'PRESSURE'], bonus: 0.055 }, score: ({ player, prefs, attr }) => attr(player, 'adaptacao') * 0.30 + attr(player, 'leitura') * 0.18 + (prefs.buildStyle === 'VARIED' ? 22 : 0) },
  ATTACK_WEAK_SECOND: { id: 'ATTACK_WEAK_SECOND', label: 'Ataca segundo saque fraco', abbr: '2S.ATK', icon: 'RET', desc: 'Trata segundo saque vulnerável como convite para mandar no ponto.', trigger: 'devolução atacável', engineTags: { trigger: 'attackableReturn', intents: ['PRESSURE'], bonus: 0.07 }, score: ({ player, prefs, attr }) => attr(player, 'devolucao') * 0.34 + attr(player, 'explosividade') * 0.16 + (['EARLY_ATTACK', 'EXPLOSIVE'].includes(prefs.rallyCadence) ? 18 : 0) },
  PROTECT_LEAD: { id: 'PROTECT_LEAD', label: 'Protege vantagem', abbr: 'LEAD', icon: 'LOCK', desc: 'Quando lidera, escolhe margem e não oferece ponto gratuito.', trigger: 'liderando', engineTags: { trigger: 'leading', intents: ['CONTROL', 'BUILD', 'RESET'], bonus: 0.05 }, score: ({ player, prefs, attr }) => attr(player, 'regularidade') * 0.28 + attr(player, 'mentalidade') * 0.18 + (['SAFE', 'CALCULATED'].includes(prefs.riskProfile) ? 18 : 0) },
  SLICE_COOL_POINT: { id: 'SLICE_COOL_POINT', label: 'Usa slice para esfriar', abbr: 'SLC.COLD', icon: 'SLC', desc: 'Quando o ponto esquenta, baixa ritmo e altura com slice.', trigger: 'pressão acumulada', engineTags: { trigger: 'pressure', intents: ['RESET', 'CONTROL'], families: ['SLICE'], bonus: 0.07 }, score: ({ player, prefs, attr }) => attr(player, 'slice') * 0.34 + attr(player, 'leitura') * 0.14 + (prefs.buildStyle === 'SLICE_CONTROL' ? 28 : 0) },
  HUNT_WEAK_SIDE: { id: 'HUNT_WEAK_SIDE', label: 'Mira lado frágil sem parar', abbr: 'HUNT', icon: 'TGT', desc: 'Quando acha uma fissura, repete até o rival provar o contrário.', trigger: 'vantagem tática', engineTags: { trigger: 'rivalExposed', intents: ['BUILD', 'PRESSURE'], bonus: 0.055 }, score: ({ player, prefs, attr }) => attr(player, 'visaoTatica') * 0.26 + attr(player, 'regularidade') * 0.20 },
  PRESSURE_WITH_AGGRESSION: { id: 'PRESSURE_WITH_AGGRESSION', label: 'Responde pressão com agressão', abbr: 'FIGHT', icon: 'ATK', desc: 'Em vez de encolher, aumenta presença quando é atacado.', trigger: 'sob pressão', engineTags: { trigger: 'pressure', intents: ['PRESSURE', 'FINISH'], bonus: 0.06 }, score: ({ player, prefs, attr }) => attr(player, 'mentalidade') * 0.22 + attr(player, 'fhPotencia') * 0.18 + (['GAMBLER', 'ALLOUT'].includes(prefs.riskProfile) ? 24 : 0) },
  PRESSURE_WITH_CONTROL: { id: 'PRESSURE_WITH_CONTROL', label: 'Responde pressão com controle', abbr: 'CTRL', icon: 'CTL', desc: 'Aperta o ponto por dentro: menos pressa, mais precisão.', trigger: 'sob pressão', engineTags: { trigger: 'pressure', intents: ['CONTROL', 'BUILD'], bonus: 0.06 }, score: ({ player, prefs, attr }) => attr(player, 'fhControle') * 0.18 + attr(player, 'bhControle') * 0.18 + attr(player, 'mentalidade') * 0.20 + (['SAFE', 'CALCULATED'].includes(prefs.riskProfile) ? 18 : 0) },
  SHORT_BALL_HUNTER: { id: 'SHORT_BALL_HUNTER', label: 'Caça bola curta', abbr: 'SHORT', icon: 'GO', desc: 'Lê bola curta como gatilho automático para avançar ou acelerar.', trigger: 'bola curta', engineTags: { trigger: 'shortBall', intents: ['APPROACH', 'PRESSURE', 'FINISH'], bonus: 0.075 }, score: ({ player, prefs, attr }) => attr(player, 'explosividade') * 0.22 + attr(player, 'visaoTatica') * 0.20 + (['OPPORTUNIST', 'PROACTIVE', 'HUNTER'].includes(prefs.netGame) ? 20 : 0) },
  PHYSICAL_TAX: { id: 'PHYSICAL_TAX', label: 'Força troca física', abbr: 'FIS', icon: 'PHY', desc: 'Quando a partida alonga, aposta no desgaste acumulado.', trigger: 'rally longo', engineTags: { trigger: 'longRally', intents: ['BUILD', 'CONTROL'], bonus: 0.055 }, score: ({ player, prefs, attr }) => attr(player, 'resistencia') * 0.30 + attr(player, 'defesa') * 0.18 + (prefs.rallyCadence === 'PATIENT' ? 18 : 0) },
  ADAPT_AFTER_TWO: { id: 'ADAPT_AFTER_TWO', label: 'Varia após dois pontos iguais', abbr: 'ADAPT', icon: 'ADP', desc: 'Não deixa o mesmo roteiro se repetir por muito tempo.', trigger: 'padrão recente repetido', engineTags: { trigger: 'streak', intents: ['BUILD', 'CONTROL', 'PRESSURE'], bonus: 0.055 }, score: ({ player, attr }) => attr(player, 'adaptacao') * 0.38 + attr(player, 'visaoTatica') * 0.18 },
});

export const BLIND_SPOT_CATALOG = Object.freeze({
  EARLY_DTL_FORCE: { id: 'EARLY_DTL_FORCE', label: 'Força paralela cedo demais', abbr: 'DTL!', icon: 'DTL', desc: 'Enxerga a linha antes de realmente construir vantagem.', trigger: 'bola ainda neutra', engineTags: { intents: ['PRESSURE', 'FINISH'], families: ['FLAT_DRIVE'], penalty: -0.045, riskAdd: 0.05 }, score: ({ player, prefs, attr }) => (prefs.buildStyle === 'DTL_HUNTER' ? 34 : 0) + attr(player, 'fhPotencia') * 0.20 + Math.max(0, attr(player, 'fhPotencia') - attr(player, 'fhControle')) * 0.45 },
  CROSS_STUBBORN: { id: 'CROSS_STUBBORN', label: 'Insiste no cruzado lido', abbr: 'CRZ?', icon: 'X', desc: 'Repete o conforto cruzado mesmo quando o rival já está esperando.', trigger: 'streak de direção', engineTags: { trigger: 'streak', intents: ['BUILD'], families: ['TOPSPIN'], penalty: -0.04, riskAdd: 0.03 }, score: ({ player, prefs, attr }) => (['CROSS_DOMINANT', 'CROSS_BUILDER'].includes(prefs.buildStyle) ? 34 : 0) + attr(player, 'regularidade') * 0.14 },
  LATE_KILL: { id: 'LATE_KILL', label: 'Demora para matar o ponto', abbr: 'TARDE', icon: 'WAIT', desc: 'Às vezes procura a bola perfeita e deixa o rival voltar.', trigger: 'rival exposto', engineTags: { trigger: 'rivalExposed', intents: ['BUILD', 'CONTROL'], penalty: -0.05, riskAdd: 0.02 }, score: ({ player, prefs, attr }) => (['SAFE', 'SAFETY_FIRST'].includes(prefs.riskProfile) ? 28 : 0) + attr(player, 'regularidade') * 0.18 + Math.max(0, attr(player, 'fhControle') - attr(player, 'fhPotencia')) * 0.36 },
  RAW_NET_RUSH: { id: 'RAW_NET_RUSH', label: 'Sobe sem preparar', abbr: 'NET?', icon: 'NET', desc: 'Confia na mão de rede antes de criar aproximação limpa.', trigger: 'approach de baixa qualidade', engineTags: { intents: ['APPROACH'], penalty: -0.065, riskAdd: 0.06 }, score: ({ player, prefs, attr }) => (['PROACTIVE', 'HUNTER'].includes(prefs.netGame) ? 30 : 0) + Math.max(0, attr(player, 'volley') - attr(player, 'visaoTatica')) * 0.50 },
  BAD_DROP_GREED: { id: 'BAD_DROP_GREED', label: 'Curta em hora ruim', abbr: 'DROP?', icon: 'DROP', desc: 'Gosta tanto da variação que às vezes usa sem contexto.', trigger: 'drop sem janela', engineTags: { families: ['DROP'], penalty: -0.075, riskAdd: 0.05 }, score: ({ player, prefs, attr }) => (prefs.buildStyle === 'DROP_VARIATION' ? 36 : 0) + attr(player, 'slice') * 0.16 },
  SECOND_SERVE_TRUST: { id: 'SECOND_SERVE_TRUST', label: 'Confia demais no segundo saque', abbr: '2S?', icon: '2S', desc: 'Mantém ambição no segundo saque mesmo quando margem pede calma.', trigger: 'segundo saque sob pressão', engineTags: { penalty: -0.035, riskAdd: 0.04 }, score: ({ player, prefs, attr }) => (['KICK', 'T', 'BODY'].includes(prefs.serve2Bias) ? 16 : 0) + attr(player, 'saqueForca') * 0.20 + Math.max(0, attr(player, 'saqueForca') - attr(player, 'saquePrecisao')) * 0.42 },
  PRETTY_SHOT: { id: 'PRETTY_SHOT', label: 'Procura golpe bonito', abbr: 'SHOW', icon: 'SHOW', desc: 'Às vezes escolhe o golpe memorável em vez do simples.', trigger: 'janela de winner', engineTags: { intents: ['FINISH'], families: ['FLAT_DRIVE', 'DROP'], penalty: -0.045, riskAdd: 0.05 }, score: ({ player, prefs, attr, hasTrait }) => (hasTrait(player, /SHOW|ART|REBEL|VOLAT/i) ? 24 : 0) + (['GAMBLER', 'ALLOUT'].includes(prefs.riskProfile) ? 22 : 0) + attr(player, 'visaoTatica') * 0.10 },
  OFF_BALANCE_ACCEL: { id: 'OFF_BALANCE_ACCEL', label: 'Acelera sem base', abbr: 'BASE?', icon: 'BAL', desc: 'Sob pressão, tenta sair com pancada mesmo sem corpo pronto.', trigger: 'contato atrasado', engineTags: { trigger: 'pressure', intents: ['PRESSURE', 'FINISH'], families: ['FLAT_DRIVE'], penalty: -0.07, riskAdd: 0.07 }, score: ({ player, prefs, attr }) => (['EARLY_ATTACK', 'EXPLOSIVE'].includes(prefs.rallyCadence) ? 24 : 0) + Math.max(0, attr(player, 'fhPotencia') - attr(player, 'regularidade')) * 0.48 },
  LEAD_TURTLE: { id: 'LEAD_TURTLE', label: 'Joga seguro demais liderando', abbr: 'TRAVA', icon: 'LOCK', desc: 'Com vantagem, pode entregar iniciativa por excesso de cautela.', trigger: 'liderando', engineTags: { trigger: 'leading', intents: ['RESET', 'CONTROL'], penalty: -0.04, riskAdd: 0.01 }, score: ({ player, prefs, attr }) => (['SAFE', 'SAFETY_FIRST'].includes(prefs.riskProfile) ? 28 : 0) + attr(player, 'mentalidade') * -0.04 + attr(player, 'regularidade') * 0.18 },
  PLAN_ABANDON: { id: 'PLAN_ABANDON', label: 'Abandona plano após erro', abbr: 'PANIC', icon: 'PAN', desc: 'Poucos erros já bastam para trocar o plano antes da hora.', trigger: 'sequência ruim', engineTags: { trigger: 'pressure', penalty: -0.04, riskAdd: 0.03 }, score: ({ player, attr }) => Math.max(0, 72 - attr(player, 'mentalidade')) * 0.45 + Math.max(0, 68 - attr(player, 'adaptacao')) * 0.30 },
  SLICE_LOOP: { id: 'SLICE_LOOP', label: 'Exagera no slice defensivo', abbr: 'SLC.LOOP', icon: 'SLC', desc: 'Quando encurralado, pode virar refém do slice.', trigger: 'loop defensivo', engineTags: { trigger: 'streak', intents: ['RESET', 'DEFEND'], families: ['SLICE'], penalty: -0.05, riskAdd: 0.02 }, score: ({ player, prefs, attr }) => (prefs.buildStyle === 'SLICE_CONTROL' ? 24 : 0) + attr(player, 'slice') * 0.22 + Math.max(0, 70 - attr(player, 'fhPotencia')) * 0.20 },
  LOW_BALL_ATTACK: { id: 'LOW_BALL_ATTACK', label: 'Ataca demais bola baixa', abbr: 'LOW!', icon: 'LOW', desc: 'Tenta transformar bola baixa em ataque quando o ponto pedia reset.', trigger: 'bola baixa', engineTags: { intents: ['PRESSURE', 'FINISH'], families: ['FLAT_DRIVE'], penalty: -0.07, riskAdd: 0.07 }, score: ({ player, prefs, attr }) => (['GAMBLER', 'ALLOUT'].includes(prefs.riskProfile) ? 26 : 0) + attr(player, 'fhPotencia') * 0.16 + Math.max(0, 65 - attr(player, 'slice')) * 0.24 },
  NET_AVERSION: { id: 'NET_AVERSION', label: 'Evita rede com chance clara', abbr: 'NO.NET', icon: 'BACK', desc: 'Mesmo com bola curta, prefere resolver do fundo.', trigger: 'bola curta', engineTags: { intents: ['BUILD', 'PRESSURE'], penalty: -0.04, riskAdd: 0.02 }, score: ({ player, prefs, attr }) => (prefs.netGame === 'AVOIDS' ? 34 : 0) + Math.max(0, 72 - attr(player, 'volley')) * 0.30 + attr(player, 'fhPotencia') * 0.12 },
  EMOTIONAL_NET_CALL: { id: 'EMOTIONAL_NET_CALL', label: 'Chama rede no impulso', abbr: 'NET!', icon: 'GO', desc: 'Depois de tensão, tenta resolver avançando mesmo sem desenho ideal.', trigger: 'pressão emocional', engineTags: { trigger: 'pressure', intents: ['APPROACH'], penalty: -0.055, riskAdd: 0.06 }, score: ({ player, prefs, attr }) => (['OPPORTUNIST', 'PROACTIVE'].includes(prefs.netGame) ? 20 : 0) + Math.max(0, 72 - attr(player, 'mentalidade')) * 0.26 + attr(player, 'explosividade') * 0.14 },
  HEAVY_BALL_WINNER: { id: 'HEAVY_BALL_WINNER', label: 'Winner contra bola pesada', abbr: 'HEAVY?', icon: 'PWR', desc: 'Subestima bola pesada e tenta winner antes de neutralizar.', trigger: 'pressão e bola pesada', engineTags: { trigger: 'pressure', intents: ['FINISH'], families: ['FLAT_DRIVE'], penalty: -0.065, riskAdd: 0.06 }, score: ({ player, prefs, attr }) => (['GAMBLER', 'ALLOUT'].includes(prefs.riskProfile) ? 24 : 0) + attr(player, 'fhPotencia') * 0.18 + Math.max(0, 70 - attr(player, 'defesa')) * 0.22 },
});

export function getCourtIdentity(player = {}) {
  const override = player?.courtIdentity ?? {};
  const favoritePlay = clean(byId(FAVORITE_PLAY_CATALOG, override.favoritePlay ?? override.favoritePlayId, scorePick(FAVORITE_PLAY_CATALOG, player, 'favoritePlay')?.id ?? DEFAULT_IDENTITY.favoritePlay));
  const competitiveInstinct = clean(byId(COMPETITIVE_INSTINCT_CATALOG, override.competitiveInstinct ?? override.competitiveInstinctId, scorePick(COMPETITIVE_INSTINCT_CATALOG, player, 'competitiveInstinct')?.id ?? DEFAULT_IDENTITY.competitiveInstinct));
  const blindSpot = clean(byId(BLIND_SPOT_CATALOG, override.blindSpot ?? override.blindSpotId, scorePick(BLIND_SPOT_CATALOG, player, 'blindSpot')?.id ?? DEFAULT_IDENTITY.blindSpot));
  return Object.freeze({ favoritePlay, competitiveInstinct, blindSpot, ...courtTendencies(player, { ...override, favoritePlay: favoritePlay.id }) });
}

export function courtVocabularyScore(identity, blueprint) {
  const v = identity?.shotVocabulary ?? {};
  return bound((v.familyBias?.[blueprint.family] ?? 0)
    + (v.intentBias?.[blueprint.intent] ?? 0)
    + (v.directionBias?.[blueprint.direction] ?? 0)
    + (v.blueprintBias?.[blueprint.id] ?? 0), 0.16);
}

function hasAny(list = [], value) {
  return !list?.length || list.includes(value);
}

function contextFlags(context, quality, ev) {
  const rally = context?.score?.rally ?? 0;
  const pressure = context?.player?.ctx?.rallyPressure ?? 0;
  const ballY = Math.abs(context?.ballState?.pos?.y ?? 99);
  const q = quality?.quality ?? 0.5;
  return {
    pressure: pressure > 0.58 || q < 0.48,
    rivalExposed: !!(ev?.flags?.rivalExposed || ev?.flags?.highEasyBounce),
    shortBall: ballY < 8.4 || !!ev?.flags?.highEasyBounce,
    longRally: rally >= 6,
    streak: (context?.memory?.familyStreak?.count ?? 0) >= 2 || (context?.memory?.directionStreak?.count ?? 0) >= 2,
    attackableReturn: !!ev?.flags?.attackableReturn,
    leading: (context?.score?.playerSets ?? 0) > (context?.score?.opponentSets ?? 0)
      || ((context?.score?.playerSets ?? 0) === (context?.score?.opponentSets ?? 0)
        && ((context?.score?.playerGames ?? 0) > (context?.score?.opponentGames ?? 0)
          || ((context?.score?.playerGames ?? 0) === (context?.score?.opponentGames ?? 0)
            && (context?.score?.playerPoints ?? 0) > (context?.score?.opponentPoints ?? 0)))),
    behind: (context?.score?.playerSets ?? 0) < (context?.score?.opponentSets ?? 0)
      || ((context?.score?.playerSets ?? 0) === (context?.score?.opponentSets ?? 0)
        && ((context?.score?.playerGames ?? 0) < (context?.score?.opponentGames ?? 0)
          || ((context?.score?.playerGames ?? 0) === (context?.score?.opponentGames ?? 0)
            && (context?.score?.playerPoints ?? 0) < (context?.score?.opponentPoints ?? 0)))),
  };
}

function triggerMatches(trigger, flags) {
  if (!trigger) return true;
  return !!flags[trigger];
}

function scoreMark(mark, role, family, intent, context, quality, ev) {
  const tags = mark?.engineTags ?? {};
  const flags = contextFlags(context, quality, ev);
  if (!triggerMatches(tags.trigger, flags)) return null;
  if (!hasAny(tags.families, family)) return null;
  if (!hasAny(tags.intents, intent)) return null;
  if (tags.buildStyles?.length && !tags.buildStyles.includes(context?.prefs?.buildStyle)) return null;
  if (tags.netGames?.length && !tags.netGames.includes(context?.prefs?.netGame)) return null;

  // Ponto cego precisa tornar a decisão ruim MAIS tentadora; a consequência
  // negativa entra por riskAdd/execução. Usar o penalty como score negativo
  // fazia o jogador evitar justamente o vício que deveria caracterizá-lo.
  const bonus = role === 'blindSpot'
    ? Math.min(0.06, Math.abs(tags.penalty ?? -0.04) * 0.78)
    : (tags.bonus ?? 0.05);
  return {
    role,
    id: mark.id,
    label: mark.label,
    score: Math.max(-0.09, Math.min(0.10, bonus)),
    riskAdd: role === 'blindSpot' ? Math.max(0, Math.min(0.08, tags.riskAdd ?? 0.03)) : 0,
  };
}

export function evaluateCourtIdentityCandidate({ player, context, quality, ev, family, intent } = {}) {
  const identity = getCourtIdentity(player ?? context?.player ?? {});
  const hits = [
    scoreMark(identity.favoritePlay, 'favoritePlay', family, intent, context, quality, ev),
    scoreMark(identity.competitiveInstinct, 'competitiveInstinct', family, intent, context, quality, ev),
    scoreMark(identity.blindSpot, 'blindSpot', family, intent, context, quality, ev),
  ].filter(Boolean);
  const total = hits.reduce((sum, hit) => sum + hit.score, 0);
  const riskAdd = hits.reduce((sum, hit) => sum + hit.riskAdd, 0);
  return Object.freeze({
    total,
    riskAdd,
    favoritePlayHit: hits.find((hit) => hit.role === 'favoritePlay')?.id ?? null,
    instinctTriggered: hits.find((hit) => hit.role === 'competitiveInstinct')?.id ?? null,
    blindSpotTriggered: hits.find((hit) => hit.role === 'blindSpot')?.id ?? null,
    labels: hits.map((hit) => hit.label),
    hits,
  });
}
