/**
 * Maturity guardrails: potential is allowed to exist before the body and mind
 * can express it. A player becomes uncapped at 17; until then each attribute
 * family has a believable ceiling. This is a hard safety rail, not a nerf to
 * long-term potential.
 */

const ATTR_FAMILIES = {
  physical: new Set(['velocidade', 'explosividade', 'resistencia', 'defesa']),
  stroke: new Set(['fhPotencia', 'fhControle', 'bhPotencia', 'bhControle', 'topspin', 'slice']),
  serve: new Set(['saqueForca', 'saquePrecisao', 'devolucao', 'volley', 'smash']),
  decision: new Set(['leitura', 'visaoTatica', 'mentalidade', 'regularidade', 'recuperacao', 'adaptacao']),
};

const CAPS_BY_AGE = [
  { maxAge: 10, physical: 43, stroke: 46, serve: 43, decision: 46 },
  { maxAge: 13, physical: 53, stroke: 58, serve: 52, decision: 56 },
  { maxAge: 14, physical: 60, stroke: 65, serve: 60, decision: 63 },
  { maxAge: 15, physical: 65, stroke: 71, serve: 66, decision: 69 },
  { maxAge: 16, physical: 70, stroke: 76, serve: 72, decision: 75 },
];

function familyFor(key) {
  return Object.entries(ATTR_FAMILIES).find(([, keys]) => keys.has(key))?.[0] ?? 'stroke';
}

export function getYouthAttributeCap(age, attrKey) {
  const numericAge = Number(age);
  if (!Number.isFinite(numericAge) || numericAge >= 17) return null;
  const bracket = CAPS_BY_AGE.find(item => numericAge <= item.maxAge) ?? CAPS_BY_AGE[CAPS_BY_AGE.length - 1];
  return bracket[familyFor(attrKey)];
}

export function applyYouthAgeCaps(player = {}, { age = player.age } = {}) {
  const numericAge = Number(age);
  if (!player?.attrs || !Number.isFinite(numericAge)) return player;
  const previousLatent = player.youthProfile?.maturation?.latentAttrs ?? {};
  if (numericAge >= 17) {
    if (!Object.keys(previousLatent).length) return player;
    const attrs = Object.fromEntries(Object.entries(player.attrs).map(([key, value]) => [
      key,
      Math.max(Number(value) || 0, Number(previousLatent[key]) || 0),
    ]));
    return {
      ...player,
      attrs,
      youthProfile: player.youthProfile ? {
        ...player.youthProfile,
        maturation: {
          ...(player.youthProfile.maturation ?? {}),
          latentAttrs: {},
          cappedAttributes: [],
          uncappedAtAge: numericAge,
          status: 'MATURE_EXPRESSION',
        },
      } : player.youthProfile,
    };
  }
  const cappedKeys = [];
  const latentAttrs = { ...previousLatent };
  const attrs = Object.fromEntries(Object.entries(player.attrs).map(([key, value]) => {
    const cap = getYouthAttributeCap(numericAge, key);
    const numeric = Number(value);
    if (Number.isFinite(numeric)) latentAttrs[key] = Math.max(numeric, Number(latentAttrs[key]) || 0);
    if (cap !== null && Number.isFinite(numeric) && numeric > cap) {
      cappedKeys.push(key);
      return [key, cap];
    }
    return [key, value];
  }));
  if (!cappedKeys.length) return player;
  return {
    ...player,
    attrs,
    youthProfile: player.youthProfile ? {
      ...player.youthProfile,
      maturation: {
        ...(player.youthProfile.maturation ?? {}),
        ageCapAppliedAt: numericAge,
        cappedAttributes: cappedKeys,
        latentAttrs,
        uncapsAtAge: 17,
        status: 'MATURITY_CAPPED',
      },
    } : player.youthProfile,
  };
}

/** Usa o talento latente apenas durante o cálculo de treino, nunca em partidas. */
export function exposeYouthPotentialForDevelopment(player = {}, age = player.age) {
  const numericAge = Number(age);
  const latent = player.youthProfile?.maturation?.latentAttrs ?? {};
  if (!player.attrs || numericAge >= 17 || !Object.keys(latent).length) return player;
  return {
    ...player,
    attrs: Object.fromEntries(Object.entries(player.attrs).map(([key, value]) => [key, Math.max(Number(value) || 0, Number(latent[key]) || 0)])),
  };
}
