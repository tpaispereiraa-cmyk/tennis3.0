import { overallRating } from './attributes.js';
import {
  generatePrefs,
  getArchetype,
  getBuildStyleMeta,
  getNetGameMeta,
  getRallyCadenceMeta,
  getRiskProfileMeta,
} from './playerPrefs.js';
import { getPlayerTraits } from '../../systems/traits/TraitSystem.js';
import { topStrengths, topWeaknesses, ovrTier } from '../../systems/scouting/ScoutProfile.js';
import { buildSeasonArc } from '../../systems/narrative/SeasonArcEngine.js';

function safeName(player, fallback = 'Jogador') {
  return player?.name ?? fallback;
}

function firstName(player, fallback = 'Jogador') {
  return safeName(player, fallback).split(' ')[0] || fallback;
}

function lastName(player, fallback = 'Jogador') {
  const parts = safeName(player, fallback).split(' ').filter(Boolean);
  return parts[parts.length - 1] || fallback;
}

function normalizeTraits(player, limit = 5) {
  try {
    return (getPlayerTraits(player) ?? [])
      .map((slot) => ({
        id: slot?.traitId ?? slot?.id ?? slot?.name ?? 'trait',
        tier: slot?.tier ?? 'COM',
        label: slot?.name ?? slot?.traitId ?? 'Trait',
      }))
      .filter((slot) => slot.label)
      .slice(0, limit);
  } catch {
    return [];
  }
}

function normalizePerceptions(player, limit = 4) {
  return (player?.perceptions ?? [])
    .filter((entry) => entry?.claim)
    .sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0))
    .slice(0, limit)
    .map((entry) => ({
      id: entry.id ?? entry.claim,
      claim: entry.claim,
      status: entry.status ?? 'UNCONFIRMED',
      confidence: entry.confidence ?? null,
      icon: entry.icon ?? null,
      color: entry.color ?? null,
    }));
}

function getDominantTrait(traits = []) {
  if (!traits.length) return null;
  const order = { LEN: 4, RAR: 3, COM: 2, NEG: 1 };
  return [...traits].sort((a, b) => (order[b.tier] ?? 0) - (order[a.tier] ?? 0))[0];
}

function getDominantPerception(perceptions = []) {
  return perceptions[0] ?? null;
}

function getSurfaceIdentity(player, surfaceKey = null) {
  const base = player?.surfaceIdentity ?? null;
  const rawStats = player?.surfaceStats ?? {};
  const surface = surfaceKey ?? base?.surface ?? null;
  const stats = surface ? (rawStats[surface] ?? {}) : {};
  const wins = stats.wins ?? stats.w ?? 0;
  const losses = stats.losses ?? stats.l ?? 0;
  const total = wins + losses;
  const pct = total > 0 ? Math.round((wins / total) * 100) : null;
  return {
    favorite: base?.surface ?? surface ?? null,
    label: base?.label ?? surface ?? 'Sem superficie dominante',
    winRate: base?.winRate ?? pct,
    record: total > 0 ? `${wins}-${losses}` : '--',
    isHome: !!surface && String(base?.surface ?? '').toUpperCase() === String(surface).toUpperCase(),
  };
}

function getFormSnapshot(player) {
  const points = player?.formPoints ?? 0;
  const history = (player?.formHistory ?? []).slice(-8);
  let state = 'NEUTRO';
  let summary = 'Momento estavel, sem tendencia extrema.';
  if (points >= 18) {
    state = 'EM CHAMAS';
    summary = 'Chega em pico de confianca e com sensacao de salto real de nivel.';
  } else if (points >= 8) {
    state = 'EM ALTA';
    summary = 'Vem de boa sequencia recente e entra com confianca acumulada.';
  } else if (points <= -18) {
    state = 'EM QUEDA';
    summary = 'Atravessa fase ruim, com sinais de erosao tecnica e emocional.';
  } else if (points <= -8) {
    state = 'IRREGULAR';
    summary = 'Oscila mais do que gostaria e ainda nao estabilizou o proprio nivel.';
  }
  return {
    points,
    state,
    summary,
    history,
  };
}

function getPersonalitySnapshot(player) {
  const personality = player?.personality ?? {};
  const press = personality?.pressPersona ?? {};
  const archetype = personality?.competitiveArchetype ?? {};
  const reputation = personality?.reputation ?? {};
  const currentState = personality?.currentState ?? {};
  return {
    pressPersona: {
      id: press.id ?? null,
      label: press.label ?? 'Sem persona',
      description: press.description ?? null,
      tone: press.interviewTone ?? null,
    },
    competitiveArchetype: {
      id: archetype.id ?? null,
      label: archetype.label ?? 'Sem arquetipo',
      coreDriver: archetype.coreDriver ?? null,
      narrativeHook: archetype.narrativeHook ?? null,
      crisisResponse: archetype.crisisResponse ?? null,
    },
    reputation: {
      id: reputation.id ?? null,
      label: reputation.label ?? 'Sem reputacao',
      narrativeRole: reputation.narrativeRole ?? null,
      description: reputation.description ?? null,
    },
    mood: {
      id: currentState.mood ?? 'HUNGRY',
      pressureLevel: currentState.pressureLevel ?? 20,
      publicNarrative: currentState.publicNarrative ?? '',
    },
    marketability: personality?.marketability ?? { score: 0, tier: null },
  };
}

function buildNarrative(identity) {
  const pieces = [];
  if (identity.game.archetype?.name) {
    pieces.push(`${firstName(identity.player)} compete como ${identity.game.archetype.name.toLowerCase()}`);
  }
  if (identity.personality.competitiveArchetype.coreDriver) {
    pieces.push(`e se move por ${identity.personality.competitiveArchetype.coreDriver}`);
  }
  if (identity.reputation.consensus) {
    pieces.push(`enquanto o circuito o le como ${identity.reputation.consensus.toLowerCase()}`);
  }
  if (identity.form.state !== 'NEUTRO') {
    pieces.push(`num momento ${identity.form.state.toLowerCase()}`);
  }
  return pieces.length
    ? `${pieces.join(', ')}.`
    : `${firstName(identity.player)} ainda nao tem leitura consolidada suficiente para uma identidade publica forte.`;
}

function getContradictionSnapshot({ player, form, surface, personality, strengths, weaknesses, perceptions }) {
  const contradictions = [];
  const pressure = personality?.mood?.pressureLevel ?? 0;
  const publicNarrative = String(personality?.mood?.publicNarrative ?? '').toLowerCase();
  const rank = player?.rankPosition ?? 999;
  const age = player?.age ?? 0;
  const primaryWeakness = weaknesses[0]?.label?.toLowerCase?.() ?? '';
  const primaryStrength = strengths[0]?.label?.toLowerCase?.() ?? '';

  if (surface?.isHome && form?.points <= -8) {
    contradictions.push({
      id: 'HOME_SURFACE_COLD',
      title: 'conforto sem embalo',
      summary: `${firstName(player)} chega na superficie certa, mas sem o momento que normalmente faria essa combinacao parecer assustadora.`,
    });
  }

  if (!surface?.isHome && form?.points >= 10) {
    contradictions.push({
      id: 'BAD_SURFACE_HOT_FORM',
      title: 'fase forte fora do habitat',
      summary: `${firstName(player)} vive boa fase mesmo fora do terreno que melhor traduz seu jogo.`,
    });
  }

  if (pressure >= 72 && rank <= 12) {
    contradictions.push({
      id: 'ELITE_UNDER_PRESSURE',
      title: 'elite sob ruido',
      summary: `O status de favorito existe, mas a pressao atual deixa ${firstName(player)} menos estavel do que o ranking sugere.`,
    });
  }

  if (pressure <= 35 && (publicNarrative.includes('press') || publicNarrative.includes('cobran') || publicNarrative.includes('question'))) {
    contradictions.push({
      id: 'CALM_AMID_NOISE',
      title: 'calma em meio ao barulho',
      summary: 'A conversa publica aperta, mas os sinais internos ainda apontam serenidade competitiva.',
    });
  }

  if (age <= 22 && rank <= 20) {
    contradictions.push({
      id: 'YOUNG_ALREADY_ESTABLISHED',
      title: 'jovem com peso de veterano',
      summary: `${firstName(player)} ainda e novo, mas ja carrega cobranca de nome estabelecido.`,
    });
  }

  const clutchPerception = perceptions.find((entry) => /clutch|frio|decisivo|grande momento/i.test(entry.claim ?? ''));
  if ((primaryWeakness.includes('mental') || primaryWeakness.includes('frieza') || primaryWeakness.includes('compos')) && clutchPerception) {
    contradictions.push({
      id: 'CLUTCH_WITH_CRACKS',
      title: 'clutch com rachadura',
      summary: 'O circuito enxerga presenca em pontos grandes, mas ainda ha sinais de instabilidade emocional no fundo do retrato.',
    });
  }

  if ((player?.styleId === 'CTR_PUNCHER' || player?.styleId === 'RETRIEVER') && primaryStrength.includes('saque')) {
    contradictions.push({
      id: 'REACTIVE_WITH_WEAPON',
      title: 'reativo com arma de imposicao',
      summary: `${firstName(player)} constroi muito no contra-ataque, mas carrega uma arma agressiva que muda a leitura do duelo.`,
    });
  }

  return contradictions.slice(0, 3);
}

export function buildPlayerIdentity(player, { surfaceKey = null } = {}) {
  const prefs = player?.prefs ?? generatePrefs(player?.attrs ?? {});
  const archetype = getArchetype(prefs);
  const traits = normalizeTraits(player);
  const perceptions = normalizePerceptions(player);
  const dominantTrait = getDominantTrait(traits);
  const dominantPerception = getDominantPerception(perceptions);
  const form = getFormSnapshot(player);
  const surface = getSurfaceIdentity(player, surfaceKey);
  const personality = getPersonalitySnapshot(player);
  const seasonArc = buildSeasonArc(player);
  const strengths = topStrengths(player?.attrs ?? {}, 3);
  const weaknesses = topWeaknesses(player?.attrs ?? {}, 2);
  const ovr = overallRating(player?.attrs ?? {});
  const contradictions = getContradictionSnapshot({ player, form, surface, personality, strengths, weaknesses, perceptions });

  const identity = {
    player,
    name: safeName(player),
    firstName: firstName(player),
    lastName: lastName(player),
    overview: {
      ovr,
      tier: ovrTier(ovr),
      age: player?.age ?? null,
      rank: player?.rankPosition ?? null,
      nationality: player?.nationality ?? null,
    },
    game: {
      styleId: player?.styleId ?? null,
      archetype: archetype
        ? {
            id: archetype.id,
            name: archetype.name,
            abbr: archetype.abbr,
            icon: archetype.icon,
            color: archetype.color,
            desc: archetype.desc,
          }
        : null,
      buildStyle: getBuildStyleMeta(prefs?.buildStyle),
      rallyCadence: getRallyCadenceMeta(prefs?.rallyCadence),
      riskProfile: getRiskProfileMeta(prefs?.riskProfile),
      netGame: getNetGameMeta(prefs?.netGame),
    },
    personality,
    seasonArc,
    form,
    surface,
    reputation: {
      consensus: dominantPerception?.claim ?? personality.reputation.label,
      dominantPerception,
      perceptions,
    },
    strengths: strengths.map((entry) => entry.label),
    weaknesses: weaknesses.map((entry) => entry.label),
    contradictions,
    dna: {
      dominantTrait,
      traits,
      strengths,
      weaknesses,
    },
  };

  identity.signature = {
    headline: `${identity.firstName} - ${identity.game.archetype?.name ?? identity.personality.competitiveArchetype.label}`,
    subline: buildNarrative(identity),
    moodTag: identity.personality.mood.id,
    formTag: identity.form.state,
    reputationTag: identity.personality.reputation.label,
    seasonArcTag: identity.seasonArc.label,
    contradictionTag: contradictions[0]?.title ?? null,
  };

  identity.traits = {
    primary: dominantTrait,
    list: traits,
  };

  return identity;
}

export function buildIdentityDuel(playerA, playerB, opts = {}) {
  const a = buildPlayerIdentity(playerA, opts);
  const b = buildPlayerIdentity(playerB, opts);
  return {
    a,
    b,
    contrast: {
      tempo: `${a.game.rallyCadence.label} vs ${b.game.rallyCadence.label}`,
      risk: `${a.game.riskProfile.label} vs ${b.game.riskProfile.label}`,
      persona: `${a.personality.pressPersona.label} vs ${b.personality.pressPersona.label}`,
      mood: `${a.personality.mood.id} vs ${b.personality.mood.id}`,
      paradox: a.contradictions[0] && b.contradictions[0]
        ? `${a.firstName} chega como ${a.contradictions[0].title}; ${b.firstName} responde como ${b.contradictions[0].title}.`
        : a.contradictions[0]?.summary ?? b.contradictions[0]?.summary ?? 'Sem paradoxo dominante: o confronto se desenha mais por execucao do que por conflito interno.',
    },
  };
}
