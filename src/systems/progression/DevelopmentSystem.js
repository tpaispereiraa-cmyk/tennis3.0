/**
 * DevelopmentSystem.js
 * ─────────────────────────────────────────────────────────────────
 * Sistema de progressão de carreira dos jogadores.
 *
 * Implementa todas as funções da Fase 2 do plano de implantação:
 *   2.1  currentAge
 *   2.2  isInDecline
 *   2.3  growthMultiplierForAttr
 *   2.4  applyMonthlyGrowth
 *   2.5  applyMonthlyDecline
 *   2.6  triggerBreakthrough
 *   2.7  evaluateAlcunha
 *   2.8  migrateLegacyPlayer
 *   2.9  advanceSeason
 *
 * Dependências:
 *   DevelopmentConstants.js  — constantes puras
 *   players.js               — overallRating, ATTR_CATEGORIES
 */

import {
  POTENTIAL_CATEGORIES,
  CAREER_ARCS,
  ALCUNHAS,
  DEVELOPMENT_CONFIG,
  getPotentialCategory,
  getCareerArc,
  rollOvrTarget,
} from './DevelopmentConstants.js';

import { overallRating, ATTR_CATEGORIES } from '../../domain/players/players.js';
import { generatePrefs, getDevelopmentIdentity } from '../../domain/players/playerPrefs.js';
import { ensurePhysicalCondition, INJURY_TYPES } from '../health/InjurySystem.js';
import { initPlayerDNA, assignTraits, checkMilestones, recordMetric, migratePlayerDNA, sanitizeTraitSlots, progressSombraWithCoach, collectTraitContexts, getPlayerTraits, captureTraitSnapshot, diffTraitSnapshots, summarizeTraitDelta } from '../traits/TraitSystem.js';
import { PHILOSOPHY_ATTRS, SURFACE_SPECIALTY_ATTRS, getReputationFactor } from '../coaches/CoachingSystem.js';
import { getTrainingMult, getPotentialMult, getStabilizeMult } from '../coaches/CoachProfiles.js';

// ═══════════════════════════════════════════════════════════════════
// HELPERS INTERNOS
// ═══════════════════════════════════════════════════════════════════

/** Todos os attrKeys existentes no jogo, extraídos de ATTR_CATEGORIES */
const ALL_ATTR_KEYS = ATTR_CATEGORIES.flatMap(cat => cat.attrs.map(a => a.key));

/**
 * Extrai os dados de técnico relevantes diretamente do player.coach
 * (salvo na contratação). Evita precisar do pool completo na hora do cálculo.
 * Retorna null se o jogador não tem técnico.
 */
function _extractCoachData(player) {
  if (!player.coach) return null;
  return {
    philosophy:       player.coach.philosophy,
    specialty:        player.coach.specialty        ?? [],
    specialtySurface: player.coach.specialtySurface ?? null,
    reputation:       player.coach.reputationSnapshot ?? player.coach.reputation ?? 50,
    coachAttrs:       player.coach.coachAttrs        ?? null,
  };
}

/** Sorteia um inteiro entre min e max (inclusive) */
function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** Embaralha um array (Fisher–Yates) e retorna novo array */
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function getDevelopmentTrainingBias(player) {
  const prefs = player?.prefs ?? generatePrefs(player?.attrs ?? {});
  const devIdentity = getDevelopmentIdentity(prefs);
  const focus = new Set();
  const oppose = new Set();

  const addFocus = (...keys) => keys.filter(Boolean).forEach(key => focus.add(key));
  const addOppose = (...keys) => keys.filter(Boolean).forEach(key => oppose.add(key));

  for (const key of (devIdentity.trainingProfile?.focus ?? [])) addFocus(key);
  for (const key of (devIdentity.trainingProfile?.secondary ?? [])) addFocus(key);
  for (const key of (devIdentity.trainingProfile?.oppose ?? [])) addOppose(key);

  switch (prefs.netGame) {
    case 'HUNTER':
      addFocus('volley', 'smash', 'explosividade', 'saqueForca', 'saquePrecisao', 'leitura');
      addOppose('resistencia', 'defesa');
      break;
    case 'PROACTIVE':
      addFocus('volley', 'smash', 'explosividade', 'saquePrecisao', 'fhControle', 'visaoTatica');
      addOppose('defesa');
      break;
    case 'OPPORTUNIST':
      addFocus('volley', 'fhControle', 'bhControle', 'leitura', 'visaoTatica');
      break;
    case 'RELUCTANT':
      addFocus('fhControle', 'bhControle', 'devolucao', 'leitura', 'regularidade');
      addOppose('volley');
      break;
    case 'AVOIDS':
      addFocus('fhControle', 'bhControle', 'devolucao', 'regularidade', 'resistencia', 'leitura');
      addOppose('volley', 'smash');
      break;
    default:
      break;
  }

  switch (prefs.rallyCadence) {
    case 'EXPLOSIVE':
      addFocus('fhPotencia', 'bhPotencia', 'explosividade', 'saqueForca', 'fhControle');
      addOppose('resistencia', 'slice');
      break;
    case 'EARLY_ATTACK':
      addFocus('fhPotencia', 'bhPotencia', 'saqueForca', 'explosividade', 'visaoTatica');
      break;
    case 'BALANCED':
      addFocus('fhControle', 'bhControle', 'leitura', 'mentalidade');
      break;
    case 'MEASURED':
      addFocus('fhControle', 'bhControle', 'leitura', 'regularidade', 'visaoTatica');
      break;
    case 'PATIENT':
      addFocus('resistencia', 'regularidade', 'leitura', 'bhControle', 'slice', 'devolucao');
      addOppose('smash');
      break;
    default:
      break;
  }

  switch (prefs.riskProfile) {
    case 'ALLOUT':
      addFocus('fhPotencia', 'bhPotencia', 'explosividade', 'visaoTatica');
      addOppose('regularidade', 'resistencia');
      break;
    case 'GAMBLER':
      addFocus('fhPotencia', 'bhPotencia', 'visaoTatica', 'saqueForca');
      addOppose('regularidade');
      break;
    case 'CALCULATED':
      addFocus('leitura', 'visaoTatica', 'fhControle', 'bhControle');
      break;
    case 'SAFE':
      addFocus('fhControle', 'bhControle', 'regularidade', 'devolucao');
      addOppose('bhPotencia');
      break;
    case 'SAFETY_FIRST':
      addFocus('regularidade', 'devolucao', 'leitura', 'resistencia');
      addOppose('fhPotencia', 'bhPotencia');
      break;
    default:
      break;
  }

  switch (prefs.buildStyle) {
    case 'HEAVY_SPIN_PRESSURE':
      addFocus('topspin', 'fhPotencia', 'resistencia', 'fhControle');
      break;
    case 'SLICE_CONTROL':
      addFocus('slice', 'bhControle', 'leitura', 'visaoTatica');
      break;
    case 'DROP_VARIATION':
      addFocus('fhControle', 'bhControle', 'leitura', 'visaoTatica');
      break;
    case 'COUNTER_REDIRECT':
      addFocus('bhControle', 'fhControle', 'leitura', 'devolucao');
      break;
    case 'CROSS_SHORT_ANGLE':
      addFocus('fhControle', 'topspin', 'explosividade', 'visaoTatica');
      break;
    case 'DTL_HUNTER':
      addFocus('fhPotencia', 'bhPotencia', 'fhControle', 'bhControle', 'visaoTatica');
      break;
    case 'CENTRE_CONTROL':
      addFocus('fhControle', 'bhControle', 'regularidade', 'leitura');
      addOppose('volley');
      break;
    case 'VARIED':
      addFocus('fhControle', 'bhControle', 'slice', 'topspin', 'leitura', 'adaptacao');
      break;
    case 'CROSS_DOMINANT':
    case 'CROSS_BUILDER':
      addFocus('fhPotencia', 'topspin', 'fhControle');
      break;
    default:
      break;
  }

  switch (prefs.serveProfile) {
    case 'CANNON':
      addFocus('saqueForca', 'saquePrecisao', 'explosividade');
      break;
    case 'PRECISION':
      addFocus('saquePrecisao', 'leitura', 'visaoTatica');
      break;
    case 'BODY_JAMMER':
      addFocus('saqueForca', 'saquePrecisao', 'fhControle');
      break;
    case 'WIDE_OPENER':
      addFocus('saquePrecisao', 'slice', 'topspin', 'fhControle');
      break;
    case 'KICK_BUILDER':
      addFocus('topspin', 'saquePrecisao', 'regularidade');
      break;
    default:
      addFocus('saqueForca', 'saquePrecisao');
      break;
  }

  if (focus.size === 0 && player?.styleId) {
    for (const key of (DEVELOPMENT_CONFIG.STYLE_FOCUS_ATTRS[player.styleId] ?? [])) focus.add(key);
    for (const key of (DEVELOPMENT_CONFIG.STYLE_OPPOSE_ATTRS?.[player.styleId] ?? [])) oppose.add(key);
  }

  for (const key of focus) oppose.delete(key);
  return { focusAttrs: focus, opposeAttrs: oppose };
}

/** Clona profundo de um jogador (evita mutações no original) */
function clonePlayer(player) {
  return JSON.parse(JSON.stringify(player));
}


// ═══════════════════════════════════════════════════════════════════
// 2.1 currentAge
// ═══════════════════════════════════════════════════════════════════

/**
 * Calcula a idade atual do jogador dado um ano de temporada.
 * @param {object} player
 * @param {number} [seasonYear=2025]
 * @returns {number}
 */
export function currentAge(player, seasonYear = 2025) {
  return seasonYear - player.birthYear;
}


// ═══════════════════════════════════════════════════════════════════
// 2.2 isInDecline
// ═══════════════════════════════════════════════════════════════════

/**
 * Retorna true se o jogador já passou da janela de graça após seu peakAge.
 * @param {object} player
 * @param {number} [seasonYear=2025]
 * @returns {boolean}
 */
export function isInDecline(player, seasonYear = 2025) {
  const age = currentAge(player, seasonYear);
  const graceYears = DEVELOPMENT_CONFIG.DECLINE_GRACE_MONTHS / 12;
  return age > player.peakAge + graceYears;
}


// ═══════════════════════════════════════════════════════════════════
// 2.3 growthMultiplierForAttr
// ═══════════════════════════════════════════════════════════════════

/**
 * Calcula o multiplicador de crescimento mensal para um atributo específico.
 * Considera: teto do potencial, growthRate do arc, volatilidade e técnico.
 *
 * @param {object} player     — jogador completo
 * @param {string} attrKey    — chave do atributo
 * @param {number} currentOvr — OVR calculado (para evitar recalcular N vezes)
 * @param {number} seasonYear
 * @param {object|null} coach — objeto coach do pool (ou null se sem técnico)
 * @returns {number} multiplicador ≥ 0
 */
export function growthMultiplierForAttr(player, attrKey, currentOvr, seasonYear, coach = null) {
  const cat = getPotentialCategory(player.potential);

  // Teto efetivo: usa ovrTarget individual se disponível, senão o ovrCeiling da categoria.
  // ovrTarget é sorteado na criação/migração — representa o máximo que ESTE jogador específico atinge.
  const effectiveCeiling = player._devState?.ovrTarget ?? cat.ovrCeiling;

  // Acima do teto: crescimento praticamente zero
  if (currentOvr >= effectiveCeiling) {
    return DEVELOPMENT_CONFIG.ABOVE_CEILING_GROWTH_MULTIPLIER;
  }

  const arc = getCareerArc(player.developmentStyle);

  // Variância aleatória baseada na volatilidade do arc
  const noise = arc.volatility * (Math.random() * 2 - 1);

  // ── Multiplicador por % do teto já atingida ───────────────────
  // Quanto mais perto do teto, mais difícil crescer.
  // Faixas de 90%+ agora freiam muito mais — antes ficava em 0.8 até o teto,
  // o que permitia +1.9 OVR/ano mesmo "quase lá". Agora desacelera de verdade.
  const pctOfCeiling = currentOvr / effectiveCeiling;
  const headroomMult =
    pctOfCeiling < 0.45 ? 4.0 :
    pctOfCeiling < 0.60 ? 3.0 :
    pctOfCeiling < 0.75 ? 2.2 :
    pctOfCeiling < 0.88 ? 1.4 :
    pctOfCeiling < 0.94 ? 0.7 :
    pctOfCeiling < 0.98 ? 0.30 :
                          0.08;

  // ── Fator de proximidade do pico ──────────────────────────────
  // Reescalado: desacelera mais progressivamente antes do pico.
  // Antes: yearsToPeak=1 → 0.85 (quase máximo). Agora → 0.65.
  // Após o pico: cai mais rápido (0.12 em vez de 0.15 — cresce pouquíssimo).
  const yearsToPeak = player.peakAge
    ? player.peakAge - currentAge(player, seasonYear ?? 2025)
    : 3;
  const ageFactor =
    yearsToPeak >= 5 ? 1.00 :
    yearsToPeak >= 3 ? 0.85 :
    yearsToPeak >= 1 ? 0.65 :
    yearsToPeak >= 0 ? 0.55 :
                       0.15;

  let mult = arc.growthRate * headroomMult * ageFactor + noise;

  // ── Modificador de técnico ────────────────────────────────────
  // Só aplica durante a fase de crescimento (não em declínio).
  // Coach resolve pelo player.coach.philosophy salvo na contratação —
  // não precisamos do objeto coach completo, só da filosofia e specialty.
  const coachData = coach ?? _extractCoachData(player);

  if (coachData && !isInDecline(player, seasonYear)) {
    const repFactor  = getReputationFactor(coachData);
    const coachAttrs = coachData.coachAttrs ?? null;
    const playerAge  = currentAge(player, seasonYear);
    const trainMult  = getTrainingMult(coachAttrs, attrKey);    // 1.0–1.25 (nunca penaliza)
    const potMult    = getPotentialMult(coachAttrs, playerAge); // 1.0–3.0 (só under-23)

    // Resolver attrs boosted/penalized para o técnico deste jogador
    let boosted   = [];
    let penalized = [];

    if (coachData.philosophy === 'SPECIALIST' && coachData.specialtySurface) {
      const sa = SURFACE_SPECIALTY_ATTRS[coachData.specialtySurface];
      boosted   = sa?.boosted   ?? [];
      penalized = sa?.penalized ?? [];
    } else {
      const pa = PHILOSOPHY_ATTRS[coachData.philosophy];
      boosted   = pa?.boosted   ?? [];
      penalized = pa?.penalized ?? [];
    }

    // Specialty individual: boost extra — reputação + treino + boom jovem
    // Cap em 3.5×: sem limite, combinado chegava a 8.7× — anulava todos os freios.
    if (coachData.specialty?.includes(attrKey)) {
      const specialtyBase  = 1.5 + (Math.min(100, coachData.reputation ?? 50) / 100) * 0.3; // 1.5–1.8
      mult = Math.min(mult * specialtyBase * trainMult * repFactor * potMult, mult * 3.5);
    }
    // Filosofia alinhada: boost base 1.25 escalado por treino + rep + boom jovem
    // Cap em 2.5×: antes podia ser 1.25 * 1.25 * 1.30 * 3.0 = 6.1×
    else if (boosted.includes(attrKey)) {
      mult = Math.min(mult * 1.25 * trainMult * repFactor * potMult, mult * 2.5);
    }
    // Filosofia contrária: penalidade leve — coach freia mas não destroça
    else if (penalized.includes(attrKey)) {
      mult = mult * 0.85;
    }
    // Atributo neutro: potMult jovem ainda se aplica (técnico bom acelera tudo)
    else if (potMult > 1.0) {
      mult = mult * potMult;
    }

    // ── BLOCO C: Efeitos de traits de coach ─────────────────────
    // Aplicados DEPOIS dos multiplicadores base para não interagir exponencialmente.
    // Cada trait adiciona um delta percentual modesto (cap total: +35%).
    const coachTraits = coachData.traits ?? [];
    let traitBonus = 1.0;

    // MAGO_DO_MENTAL: +15% em mentalidade, leitura e regularidade
    if (coachTraits.includes('MAGO_DO_MENTAL') &&
        ['mentalidade', 'leitura', 'regularidade'].includes(attrKey)) {
      traitBonus += 0.15;
    }

    // GURU_SAQUE: +18% em saque
    if (coachTraits.includes('GURU_SAQUE') && attrKey === 'saque') {
      traitBonus += 0.18;
    }

    // ESPECIALISTA_SAIBRO: +12% em topspin, resistência, controle
    if (coachTraits.includes('ESPECIALISTA_SAIBRO') &&
        ['topspin', 'resistencia', 'controle'].includes(attrKey)) {
      traitBonus += 0.12;
    }

    // ESPECIALISTA_GRAMA: +12% em saque, jogoDeRede, explosividade
    if (coachTraits.includes('ESPECIALISTA_GRAMA') &&
        ['saque', 'jogoDeRede', 'explosividade'].includes(attrKey)) {
      traitBonus += 0.12;
    }

    // ESPECIALISTA_HARD: +12% em potência, controle, devolução
    if (coachTraits.includes('ESPECIALISTA_HARD') &&
        ['potencia', 'controle', 'devolucao'].includes(attrKey)) {
      traitBonus += 0.12;
    }

    // FORMADOR_PRODIGIO: +10% em todos os attrs para jogadores sub-22
    if (coachTraits.includes('FORMADOR_PRODIGIO') && playerAge < 22) {
      traitBonus += 0.10;
    }

    // LONGA_PARCERIA: +8% em todos os attrs (acumula com tempo)
    if (coachTraits.includes('LONGA_PARCERIA')) {
      traitBonus += 0.08;
    }

    // RENOVADOR_CARREIRA: +10% em attrs de núcleo se jogador em declínio suave
    // (declínio < 2 anos após peakAge — janela de recuperação)
    if (coachTraits.includes('RENOVADOR_CARREIRA') && isInDecline(player, seasonYear)) {
      const yearsPastPeak = playerAge - (player.peakAge ?? playerAge);
      if (yearsPastPeak <= 2) traitBonus += 0.10;
    }

    // PREFERE_JOVENS: penalidade se jogador muito velho (>28)
    if (coachTraits.includes('PREFERE_JOVENS') && playerAge > 28) {
      traitBonus -= 0.15;
    }

    // PREFERE_VETERANOS: penalidade se jogador muito novo (<22)
    if (coachTraits.includes('PREFERE_VETERANOS') && playerAge < 22) {
      traitBonus -= 0.15;
    }

    // Cap do traitBonus: não deixa crescer mais de 35% nem penalizar mais de 15%
    traitBonus = Math.max(0.85, Math.min(1.35, traitBonus));

    // Chemistry bonus: alta química (≥80) dá bônus adicional de 5% em tudo
    const chemistry = coachData.chemistrySnapshot ?? coachData.chemistry ?? 50;
    const chemBonus = chemistry >= 80 ? 1.05 : chemistry < 35 ? 0.92 : 1.0;

    mult = mult * traitBonus * chemBonus;
  }

  // ── BLOCO D: Traits de DNA do jogador ────────────────────────────
  // Lê player.dna.slots e aplica strengthBonus de traits com contexto de
  // desenvolvimento. Este bloco é independente do técnico.
  // Contextos suportados aqui: under21, earlyCareer, midCareer, lateCareer,
  // over30, decline, nearPeak — derivados da idade e do peakAge.
  if (player.dna?.slots?.length) {
    const pAge     = currentAge(player, seasonYear);
    const peakA    = player.peakAge ?? 26;
    const _inDecl  = isInDecline(player, seasonYear);
    const yearsPro = Math.max(0, pAge - 17);
    const devCtx = new Set(collectTraitContexts(player, {
      age: pAge,
      peakAge: peakA,
      extraContexts: ['development', yearsPro >= 3 ? 'midCareer' : null].filter(Boolean),
    }));
    if (_inDecl) devCtx.add('decline');

    const familyWeight = { DNA: 1.0, TENDENCIA: 0.82, CICATRIZ: 0.92, LEGADO: 0.88 };
    const originWeight = { dna: 1.0, scar: 0.92, milestone: 0.88, legacy: 0.90, event: 0.90 };
    let dnaMult = 1.0;

    for (const slot of getPlayerTraits(player)) {
      if (slot.tier === 'NEG') continue; // NEG afeta partidas, não crescimento
      const fx = slot.effects ?? {};
      const fxCtx = fx.context ?? ['always'];
      if (fxCtx.includes('never')) continue;

      const applies = fxCtx.some(c => c === 'always' || devCtx.has(c));
      if (!applies) continue;

      const sb = fx.strengthBonus ?? 0;
      if (sb <= 0) continue;
        // LEN SUPERPRODIGIO (sb=4.0) → +40% crescimento; RAR (sb=2.5) → +25%; COM (sb=1.5) → +15%
      const familyMult = familyWeight[slot.family] ?? 0.85;
      const originMult = originWeight[slot.origin] ?? 0.90;
      dnaMult += sb * 0.10 * familyMult * originMult;
    }

    // Cap: DNA traits podem dar até +60% de crescimento — fenomenais crescem rápido
    dnaMult = Math.min(1.60, dnaMult);
    mult = mult * dnaMult;
  }

  return Math.max(0, mult);
}


// ═══════════════════════════════════════════════════════════════════
// 2.4 applyMonthlyGrowth
// ═══════════════════════════════════════════════════════════════════

/**
 * Aplica um mês de crescimento ao jogador.
 * Se o jogador está em declínio, delega para applyMonthlyDecline.
 *
 * @param {object} player
 * @param {number} seasonYear
 * @returns {{ player: object, changes: object }}
 */
export function applyMonthlyGrowth(player, seasonYear = 2025) {
  if (isInDecline(player, seasonYear)) {
    return applyMonthlyDecline(player, seasonYear);
  }

  const p = clonePlayer(player);
  p._devState.attrGrowthAccum = p._devState.attrGrowthAccum || {};

  const currentOvr = overallRating(p.attrs);
  const changes = {};

  // Quantidade de atributos que crescem este mês
  const nGrowing = randInt(
    DEVELOPMENT_CONFIG.ATTRS_GROWING_PER_MONTH_MIN,
    DEVELOPMENT_CONFIG.ATTRS_GROWING_PER_MONTH_MAX,
  );

  // ── Seleção ponderada de atributos para treino ───────────────────
  // Três categorias de peso:
  //   FOCO:      STYLE_FOCUS_WEIGHT  (6×) — atributos centrais do estilo
  //   NEUTRO:    1×                  — atributos sem relação direta
  //   OPOSTO:    STYLE_OPPOSE_WEIGHT (0.3×) — atributos raramente treinados
  //
  // Isso cria identidade real: um BIG_SERVER desenvolve velocidade de saque
  // muito mais rápido que topspin — que quase nunca entra no treino.
  const { focusAttrs, opposeAttrs } = getDevelopmentTrainingBias(p);
  const focusWeight  = DEVELOPMENT_CONFIG.STYLE_FOCUS_WEIGHT  ?? 6;
  const opposeWeight = DEVELOPMENT_CONFIG.STYLE_OPPOSE_WEIGHT ?? 0.5;

  // Pool fracionário: usamos Math.round para evitar float no push
  // opposeWeight=0.3 → ~1 entrada a cada 3 atributos opostos (shuffle compensa)
  const weightedPool = [];
  for (const key of ALL_ATTR_KEYS) {
    let w;
    if      (focusAttrs.has(key))  w = focusWeight;
    else if (opposeAttrs.has(key)) w = Math.max(1, Math.round(opposeWeight * 10)); // 3 → arredondado
    else                           w = 1;
    for (let i = 0; i < w; i++) weightedPool.push(key);
  }

  // Sorteia nGrowing atributos únicos do pool ponderado
  const picked = new Set();
  for (const key of shuffle(weightedPool)) {
    if (picked.size >= nGrowing) break;
    picked.add(key);
  }
  const attrsToGrow = [...picked];

  for (const key of attrsToGrow) {
    if (p.attrs[key] === undefined) continue;

    const mult = growthMultiplierForAttr(p, key, currentOvr, seasonYear);

    // ── Custo progressivo para atributos de elite ─────────────────
    // Independente do OVR geral, cada atributo individual fica mais
    // difícil de subir quando entra na faixa de elite (88+) ou lenda (95+).
    // Representa a dificuldade de ir do "muito bom" para o "perfeito".
    const attrVal = p.attrs[key];
    const eliteMult =
      attrVal >= DEVELOPMENT_CONFIG.LEGEND_ATTR_THRESHOLD ? DEVELOPMENT_CONFIG.LEGEND_ATTR_MULT :
      attrVal >= DEVELOPMENT_CONFIG.ELITE_ATTR_THRESHOLD  ? DEVELOPMENT_CONFIG.ELITE_ATTR_MULT  :
      1.0;

    const delta = DEVELOPMENT_CONFIG.BASE_GROWTH_PER_MONTH * mult * eliteMult;

    p._devState.attrGrowthAccum[key] = (p._devState.attrGrowthAccum[key] ?? 0) + delta;

    // Quando o acumulador ultrapassa 1.0, converte em ponto inteiro
    if (p._devState.attrGrowthAccum[key] >= 1.0) {
      const points = Math.floor(p._devState.attrGrowthAccum[key]);
      p._devState.attrGrowthAccum[key] -= points;
      const newVal = Math.min(99, p.attrs[key] + points);
      if (newVal !== p.attrs[key]) {
        changes[key] = newVal - p.attrs[key];
        p.attrs[key] = newVal;
      }
    }
  }

  return { player: p, changes };
}




// ═══════════════════════════════════════════════════════════════════
// 2.45 INJURY BURDEN — dano cumulativo por lesões graves recorrentes
// ═══════════════════════════════════════════════════════════════════

/**
 * Atualiza o injuryBurden do jogador ao final de uma temporada.
 * Lesões graves (grade 3) e moderadas (grade 2) recorrentes acumulam
 * um burden explícito que acelera o declínio físico permanentemente.
 *
 * injuryBurden = { score: 0-100, multiplier: 1.0-2.5, label, lastUpdated }
 *
 * Chamado em advanceSeason, depois de processar lesões da temporada.
 */
export function updateInjuryBurden(player, seasonYear) {
  const history = player.injuryHistory ?? [];

  // Pontuação: grade3=15pts, grade2=5pts, grade1=1pt; decai 8pts por ano sem lesão grave
  const GRADE_SCORE  = { 3: 15, 2: 5, 1: 1 };
  const DECAY_PER_YEAR = 8;

  // Recomputa do zero (idempotente)
  let score = 0;
  const yearsWithGrave  = new Set(history.filter(h => h.grade === 3).map(h => h.season ?? seasonYear));
  const lastGraveYear   = Math.max(0, ...[...yearsWithGrave]);
  const yearsSinceGrave = lastGraveYear > 0 ? seasonYear - lastGraveYear : 99;

  for (const h of history) {
    score += GRADE_SCORE[h.grade] ?? 0;
  }

  // Decaimento natural por anos sem lesão grave
  if (yearsSinceGrave > 0 && yearsSinceGrave < 99) {
    score = Math.max(0, score - yearsSinceGrave * DECAY_PER_YEAR);
  }

  score = Math.min(100, Math.round(score));

  // Multiplicador de declínio para atributos físicos (1.0 = normal, 2.5 = max)
  const multiplier =
    score >= 80 ? 2.5 :
    score >= 60 ? 2.0 :
    score >= 40 ? 1.6 :
    score >= 20 ? 1.3 :
    score >= 10 ? 1.15 :
    1.0;

  const label =
    score >= 80 ? 'Crítico'    :
    score >= 60 ? 'Alto'       :
    score >= 40 ? 'Moderado'   :
    score >= 20 ? 'Leve'       :
    score >= 10 ? 'Residual'   :
    'Nenhum';

  return {
    ...player,
    injuryBurden: { score, multiplier, label, lastUpdated: seasonYear },
  };
}

/**
 * Retorna os atributos físicos cujo declínio é amplificado pelo injuryBurden.
 * Usado para highlight na UI.
 */
export function getBurdenAffectedAttrs(player) {
  const burden = player.injuryBurden;
  if (!burden || burden.score < 10) return [];
  // Atributos físicos com mult > 0 no DECLINE_MULTIPLIERS
  return ['velocidade','explosividade','resistencia'].filter(
    k => (DEVELOPMENT_CONFIG.DECLINE_MULTIPLIERS[k] ?? 0) > 0
  );
}

// ═══════════════════════════════════════════════════════════════════
// 2.5 applyMonthlyDecline
// ═══════════════════════════════════════════════════════════════════

/**
 * Aplica um mês de declínio ao jogador.
 * Atributos físicos declinam mais rápido; técnicos/mentais são preservados.
 * Alguns atributos podem melhorar com a experiência (multiplicador negativo).
 *
 * @param {object} player
 * @param {number} seasonYear
 * @returns {{ player: object, changes: object }}\
 */
export function applyMonthlyDecline(player, seasonYear = 2025) {
  const p = clonePlayer(player);
  p._devState.attrGrowthAccum = p._devState.attrGrowthAccum || {};
  p._devState.monthsAtPeak = (p._devState.monthsAtPeak ?? 0) + 1;

  const arc = getCareerArc(p.developmentStyle);
  const changes = {};
  const mults = DEVELOPMENT_CONFIG.DECLINE_MULTIPLIERS;

  // ── Fator de estabilização do técnico ─────────────────────────
  const coachData   = _extractCoachData(p);
  const stabilizer  = getStabilizeMult(coachData?.coachAttrs ?? null);

  // ── Fator de idade no declínio ────────────────────────────────
  const age = currentAge(p, seasonYear);
  const ageDeclineFactor =
    age < 30 ? 0.50 :
    age < 33 ? 0.75 :
    age < 36 ? 1.20 :
               1.60;

  // ── injuryBurden: amplifica declínio físico permanentemente ──
  const burdenMult = p.injuryBurden?.multiplier ?? 1.0;

  // ── Freeze: atributos penalizados por lesão ativa não decaem ─
  // Jogador afastado (grade>=2) não treina — não faz sentido perder
  // atributos adicionalmente além do que a própria lesão impõe.
  const frozenAttrs = new Set();
  const inj = p.injury;
  if (inj && (inj.slotsRemaining ?? 0) > 0 && (inj.grade ?? 1) >= 2) {
    const injDef = INJURY_TYPES?.[inj.type];
    if (injDef?.penalties) Object.keys(injDef.penalties).forEach(a => frozenAttrs.add(a));
  }

  const PHYSICAL_ATTRS = new Set(['velocidade', 'explosividade', 'resistencia']);

  for (const [key, mult] of Object.entries(mults)) {
    if (p.attrs[key] === undefined) continue;
    if (mult === 0.0) continue;

    // Pausar declínio nos atributos penalizados pela lesão ativa
    if (frozenAttrs.has(key) && mult > 0) continue;

    // injuryBurden amplifica apenas atributos físicos com declínio
    const burdenFactor = (mult > 0 && PHYSICAL_ATTRS.has(key)) ? burdenMult : 1.0;

    const delta = -DEVELOPMENT_CONFIG.BASE_DECLINE_PER_MONTH
      * arc.declineRate * mult * ageDeclineFactor * stabilizer * burdenFactor;

    p._devState.attrGrowthAccum[key] = (p._devState.attrGrowthAccum[key] ?? 0) + delta;

    if (mult > 0 && p._devState.attrGrowthAccum[key] <= -1.0) {
      const lost = Math.floor(Math.abs(p._devState.attrGrowthAccum[key]));
      p._devState.attrGrowthAccum[key] += lost;
      const newVal = Math.max(DEVELOPMENT_CONFIG.ATTR_MINIMUM, p.attrs[key] - lost);
      if (newVal !== p.attrs[key]) {
        changes[key] = newVal - p.attrs[key];
        p.attrs[key] = newVal;
      }
    } else if (mult < 0 && p._devState.attrGrowthAccum[key] >= 1.0) {
      const gained = Math.floor(p._devState.attrGrowthAccum[key]);
      p._devState.attrGrowthAccum[key] -= gained;
      const newVal = Math.min(99, p.attrs[key] + gained);
      if (newVal !== p.attrs[key]) {
        changes[key] = newVal - p.attrs[key];
        p.attrs[key] = newVal;
      }
    }
  }

  return { player: p, changes };
}


// ═══════════════════════════════════════════════════════════════════
// 2.6 triggerBreakthrough
// ═══════════════════════════════════════════════════════════════════

/**
 * Dispara um breakthrough após conquista relevante.
 * Verifica cooldown, escolhe atributos prioritários para o estilo, aplica boost.
 *
 * @param {object} player
 * @param {'SLAM'|'MASTERS'|'ATP500'|'ATP250'} titleType
 * @returns {{ player: object, boostedAttrs: string[] } | null}
 */
export function triggerBreakthrough(player, titleType) {
  const cfg = DEVELOPMENT_CONFIG;
  const p = clonePlayer(player);
  p._devState = p._devState || {};

  // Verificar cooldown
  if (p._devState.lastBreakthrough !== null && p._devState.lastBreakthrough !== undefined) {
    const monthsSince = p._devState.lastBreakthrough;
    if (typeof monthsSince === 'number' && monthsSince < cfg.BREAKTHROUGH_COOLDOWN_MONTHS) {
      return null; // ainda em cooldown
    }
  }

  const titleMult = cfg.BREAKTHROUGH_TITLE_MULT[titleType] ?? 0.25;
  if (titleMult === 0) return null;

  // Atributos prioritários para o estilo do jogador
  const priorityAttrs = cfg.BREAKTHROUGH_PRIORITY_ATTRS[player.styleId] ?? ALL_ATTR_KEYS;

  // Pool: prioritários primeiro, depois demais
  const otherAttrs = ALL_ATTR_KEYS.filter(k => !priorityAttrs.includes(k));
  const pool = [...priorityAttrs, ...shuffle(otherAttrs)];

  // Selecionar apenas atributos que o jogador realmente possui
  const validPool = pool.filter(k => p.attrs[k] !== undefined && p.attrs[k] < 99);

  const selected = validPool.slice(0, cfg.BREAKTHROUGH_ATTRS_COUNT);
  const boostedAttrs = [];

  for (const key of selected) {
    const boost = Math.round(
      randInt(cfg.BREAKTHROUGH_BOOST_MIN, cfg.BREAKTHROUGH_BOOST_MAX) * titleMult,
    );
    if (boost <= 0) continue;
    p.attrs[key] = Math.min(99, p.attrs[key] + boost);
    boostedAttrs.push(key);
  }

  // Atualizar estado — armazenar como "meses na temporada atual" usando timestamp simples
  p._devState.lastBreakthrough = 0; // zerado = acabou de acontecer
  p._devState.attrGrowthAccum = p._devState.attrGrowthAccum || {};

  return { player: p, boostedAttrs };
}

/**
 * Avança o cooldown do breakthrough em N meses.
 * Deve ser chamado a cada advanceSeason para cada jogador.
 * @param {object} player
 * @param {number} months
 * @returns {object} player atualizado
 */
export function tickBreakthroughCooldown(player, months = 12) {
  const p = clonePlayer(player);
  p._devState = p._devState || {};
  if (p._devState.lastBreakthrough !== null && p._devState.lastBreakthrough !== undefined) {
    p._devState.lastBreakthrough = (p._devState.lastBreakthrough ?? 0) + months;
  }
  return p;
}


// ═══════════════════════════════════════════════════════════════════
// 2.7 evaluateAlcunha
// ═══════════════════════════════════════════════════════════════════

/**
 * Avalia se o jogador merece uma alcunha.
 * Alcunhas são imutáveis: uma vez atribuída, nunca muda.
 *
 * @param {object} player
 * @returns {string | null}  id da alcunha ou null
 */
export function evaluateAlcunha(player, careerStats = null) {
  // Já tem alcunha → mantém (imutável)
  if (player.alcunha) return player.alcunha;

  const ovr = overallRating(player.attrs);

  for (const alcunha of ALCUNHAS) {
    try {
      if (alcunha.condition(player, ovr, careerStats)) {
        return alcunha.id;
      }
    } catch {
      // condition quebrada não deve travar o sistema
    }
  }

  return null;
}


// ═══════════════════════════════════════════════════════════════════
// 2.7b applyCareerAlcunhas
// ═══════════════════════════════════════════════════════════════════

/**
 * Passa por todos os jogadores e tenta atribuir alcunhas de conquista de carreira
 * que dependem de dados do HallOfFame (gs, careerSlam, gsYears, goatScore, etc.).
 *
 * Deve ser chamado UMA VEZ por temporada, APÓS computeHOFData, com a lista
 * de allStats retornada pelo HOF.
 *
 * @param {Array}  players   — lista de jogadores (tour + retired + prospects)
 * @param {Array}  hofStats  — allStats de computeHOFData (enriquecidos com goatScore, careerSlam, etc.)
 * @returns {{ updatedPlayers: Array, events: Array }}
 */
export function applyCareerAlcunhas(players, hofStats) {
  if (!hofStats || hofStats.length === 0) return { updatedPlayers: players, events: [] };

  const statById = Object.fromEntries(hofStats.map(s => [s.id, s]));
  const updatedPlayers = [];
  const events = [];

  for (const p of players) {
    // Já tem alcunha — imutável
    if (p.alcunha) { updatedPlayers.push(p); continue; }

    const cs = statById[p.id] ?? null;
    const newAlcunha = evaluateAlcunha(p, cs);
    if (newAlcunha) {
      updatedPlayers.push({ ...p, alcunha: newAlcunha });
      events.push({
        type: 'ALCUNHA_GAINED',
        playerId: p.id,
        player: p.name ?? p.id,
        alcunha: newAlcunha,
        source: 'career',
      });
    } else {
      updatedPlayers.push(p);
    }
  }

  return { updatedPlayers, events };
}

// ═══════════════════════════════════════════════════════════════════
// 2.8 migrateLegacyPlayer
// ═══════════════════════════════════════════════════════════════════

/**
 * Recebe um objeto de jogador legado (sem os campos de desenvolvimento)
 * e retorna um objeto completo com todos os campos preenchidos.
 *
 * @param {object} playerObj — jogador sem birthYear/potential/etc.
 * @param {number} [baseYear=2025]
 * @returns {object} jogador completo
 */
export function migrateLegacyPlayer(playerObj, baseYear = 2025) {
  const p = clonePlayer(playerObj);

  // 1. birthYear
  if (!p.birthYear) {
    p.birthYear = baseYear - (p.age ?? 25);
  }

  // 2. potential por OVR atual
  if (!p.potential) {
    const ovr = overallRating(p.attrs);
    if      (ovr >= 88) p.potential = 'LENDA';
    else if (ovr >= 78) p.potential = 'ELITE';
    else if (ovr >= 68) p.potential = 'CAMPEAO';
    else if (ovr >= 58) p.potential = 'COMUM';
    else                p.potential = 'ABAIXO_DA_MEDIA';
    // GERACIONAL nunca é atribuído por migração automática
  }

  // 3. developmentStyle por styleId + idade
  if (!p.developmentStyle) {
    const age = currentAge(p, baseYear);
    const s = p.styleId ?? '';
    if (s === 'RETRIEVER' && age >= 28) {
      p.developmentStyle = 'LATE_BLOOMER';
    } else if (s === 'BIG_SERVER' && age <= 24) {
      p.developmentStyle = 'EARLY_BLOOMER';
    } else if (s === 'TAKEALLRISK' || s === 'AGG_BASELINER') {
      // Attrs homogêneos → STEADY; caso contrário → VOLATILE
      const vals = Object.values(p.attrs);
      const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
      const variance = vals.reduce((acc, v) => acc + (v - avg) ** 2, 0) / vals.length;
      p.developmentStyle = variance < 100 ? 'STEADY' : 'VOLATILE';
    } else {
      p.developmentStyle = 'STEADY';
    }
  }

  // 4. peakAge
  if (!p.peakAge) {
    const arc = getCareerArc(p.developmentStyle);
    p.peakAge = p.birthYear + randInt(arc.peakAgeRange[0], arc.peakAgeRange[1]);
  }

  // 5. _devState
  if (!p._devState) {
    p._devState = {
      monthsAtPeak: 0,
      lastBreakthrough: null,
      attrGrowthAccum: {},
      ovrTarget: rollOvrTarget(p.potential),
    };
  } else if (p._devState.ovrTarget == null) {
    // Migração de saves antigos que não tinham ovrTarget
    p._devState.ovrTarget = rollOvrTarget(p.potential);
  }

  // 6. alcunha
  if (p.alcunha === undefined) {
    p.alcunha = evaluateAlcunha(p);
  }

  return p;
}


// ═══════════════════════════════════════════════════════════════════
// 2.9 advanceSeason
// ═══════════════════════════════════════════════════════════════════

/**
 * Avança todos os jogadores por uma temporada completa (12 meses por padrão).
 * Retorna os jogadores atualizados e um array de eventos narrativos.
 *
 * @param {object[]} allPlayers  — array de todos os jogadores
 * @param {number}   seasonYear  — ano da temporada que acabou de terminar
 * @param {number}   [months=12] — meses a simular
 * @param {object}   [titleWinners={}]  — { playerId: titleType } para breakthroughs
 * @param {object}   [seasonMetrics={}]  — { playerId: { wins, finals, surfaceWins, tiebreaksWon, matchPointsSaved } }
 * @returns {{ updatedPlayers: object[], events: object[] }}
 */
// ═══════════════════════════════════════════════════════════════════
// FASE 4 — SUPERFÍCIES COMO FORÇA IDENTITÁRIA
// ═══════════════════════════════════════════════════════════════════

/** Labels narrativos para especialistas de superfície */
const SURFACE_SPECIALIST_LABELS = {
  CLAY:   'Rei do Saibro',
  GRASS:  'Mago da Grama',
  HARD:   'Máquina do Hard',
  INDOOR: 'Senhor das Arenas',
};

/**
 * Calcula a identidade de superfície de um jogador a partir do histórico de carreira.
 * Critérios: winRate ≥ 62%, ≥ 20 partidas, ≥ 2 títulos nessa superfície.
 *
 * @param {object} player
 * @returns {{ surface: string, winRate: number, label: string } | null}
 */
export function computeSurfaceIdentity(player) {
  const stats = player.surfaceStats ?? {};
  const entries = Object.entries(stats)
    .map(([surface, d]) => {
      const total = (d.wins ?? 0) + (d.losses ?? 0);
      const winRate = total > 0 ? d.wins / total : 0;
      return { surface, winRate, titles: d.titlesWon ?? 0, total };
    })
    .filter(e => e.total >= 20 && e.winRate >= 0.62 && e.titles >= 2)
    .sort((a, b) => b.winRate - a.winRate);

  if (!entries.length) return null;
  const best = entries[0];
  return {
    surface: best.surface,
    winRate: best.winRate,
    label:   SURFACE_SPECIALIST_LABELS[best.surface] ?? best.surface,
  };
}

/**
 * Atualiza surfaceStats do jogador após uma partida.
 * Deve ser chamado junto com updateRecentForm após cada resultado de torneio.
 *
 * @param {object} player
 * @param {{ won: boolean, surface: string, isTournamentTitle?: boolean }} result
 * @returns {object} player atualizado (novo objeto)
 */
export function updateSurfaceStats(player, result) {
  const surface = (result.surface ?? 'HARD').toUpperCase();
  const ss = player.surfaceStats ?? {
    CLAY:   { wins: 0, losses: 0, titlesWon: 0 },
    GRASS:  { wins: 0, losses: 0, titlesWon: 0 },
    HARD:   { wins: 0, losses: 0, titlesWon: 0 },
    INDOOR: { wins: 0, losses: 0, titlesWon: 0 },
  };

  const newSS = {
    CLAY:   { ...ss.CLAY },
    GRASS:  { ...ss.GRASS },
    HARD:   { ...ss.HARD },
    INDOOR: { ...ss.INDOOR },
  };

  if (!newSS[surface]) newSS[surface] = { wins: 0, losses: 0, titlesWon: 0 };

  if (result.won) {
    newSS[surface].wins += 1;
  } else {
    newSS[surface].losses += 1;
  }

  if (result.isTournamentTitle) {
    newSS[surface].titlesWon = (newSS[surface].titlesWon ?? 0) + 1;
  }

  return { ...player, surfaceStats: newSS };
}


// ═══════════════════════════════════════════════════════════════════
// FASE 5 — EVOLUÇÃO DE ESTILO AO LONGO DA CARREIRA
// ═══════════════════════════════════════════════════════════════════

/**
 * Perfis de envelhecimento por styleId.
 * threshold:       idade mínima para aplicar attrDeltas (uma única vez).
 * styleTarget:     styleId para o qual o jogador migra quando o declínio físico é severo.
 *                  null = sem migração de estilo (estilo já é maduro/defensivo).
 * declineThreshold: OVR físico (velocidade+explosividade média) abaixo do qual a migração ocorre.
 *                  Só relevante se styleTarget != null.
 * attrDeltas:      pontos inteiros aplicados no threshold de idade.
 * flagKey:         chave em _devState para garantir aplicação única dos attrDeltas.
 * migrateKey:      chave em _devState para garantir migração de estilo única.
 * label_old:       label narrativo do "estilo evoluído" (opcional, só visual).
 */
const STYLE_AGE_PROFILES = {
  // POWER_BASELINER — Jovem: força bruta. Maduro: mais controle, jogo de rede.
  PWR_BASE: {
    threshold: 28,
    attrDeltas: { jogoDeRede: +4, controle: +3, leitura: +3 },
    styleTarget:      'ALL_COURT',
    declineThreshold: 62,   // velocidade+explosividade média abaixo de 62 → migra
    label_old: 'ALL_COURT',
    flagKey:    '_styleAge_PWR_BASE',
    migrateKey: '_styleMig_PWR_BASE',
  },
  // NET_SPECIALIST — Envelhece mal fisicamente, mas compensa com leitura e antecipação.
  NET_SPEC: {
    threshold: 29,
    attrDeltas: { jogoDeRede: +5, leitura: +6, velocidade: -3 },
    styleTarget:      'SRV_VOL',
    declineThreshold: 58,
    flagKey:    '_styleAge_NET_SPEC',
    migrateKey: '_styleMig_NET_SPEC',
  },
  // RETRIEVER — Ganha mais regularidade; ralis mais longos, menos erros.
  RETRIEVER: {
    threshold: 27,
    attrDeltas: { resistencia: +4, regularidade: +5, controle: +3 },
    styleTarget:      null,   // já é o estilo mais defensivo — sem migração
    declineThreshold: null,
    flagKey:    '_styleAge_RETRIEVER',
    migrateKey: null,
  },
  // BIG_SERVER — Perde velocidade de saque, compensa com variação e placement.
  BIG_SERVER: {
    threshold: 30,
    attrDeltas: { saque: -1, leitura: +4, jogoDeRede: +3 },
    styleTarget:      'SRV_VOL',
    declineThreshold: 60,
    flagKey:    '_styleAge_BIG_SERVER',
    migrateKey: '_styleMig_BIG_SERVER',
  },
  // AGG_BASELINER — Fica mais seletivo: ainda agride, mas escolhe melhor o momento.
  AGG_BASELINER: {
    threshold: 28,
    attrDeltas: { leitura: +4, controle: +3, regularidade: +3 },
    styleTarget:      'CTR_PUNCHER',
    declineThreshold: 60,
    flagKey:    '_styleAge_AGG_BASELINER',
    migrateKey: '_styleMig_AGG_BASELINER',
  },
  // CTR_PUNCHER — Slice mais preciso, mais regularidade, levemente mais lento.
  CTR_PUNCHER: {
    threshold: 29,
    attrDeltas: { regularidade: +5, slice: +4, controle: +3, velocidade: -2 },
    styleTarget:      'GRINDER',
    declineThreshold: 55,
    flagKey:    '_styleAge_CTR_PUNCHER',
    migrateKey: '_styleMig_CTR_PUNCHER',
  },
  // GRINDER — Resistência lendária; perde um toque de explosão.
  GRINDER: {
    threshold: 27,
    attrDeltas: { resistencia: +5, regularidade: +5, explosividade: -2, velocidade: -2 },
    styleTarget:      null,   // Grinder é o endpoint natural — sem migração
    declineThreshold: null,
    flagKey:    '_styleAge_GRINDER',
    migrateKey: null,
  },
  // SRV_VOL — Serve menos rápido, mas a leitura de jogo na rede fica afiada.
  SRV_VOL: {
    threshold: 30,
    attrDeltas: { saque: -2, leitura: +5, jogoDeRede: +4 },
    styleTarget:      null,   // SRV_VOL maduro já é o endpoint para serve-and-volley
    declineThreshold: null,
    flagKey:    '_styleAge_SRV_VOL',
    migrateKey: null,
  },
  // ALL_COURT — Versatilidade matura: leitura e slice aguçados.
  ALL_COURT: {
    threshold: 29,
    attrDeltas: { leitura: +5, slice: +3, regularidade: +3 },
    styleTarget:      'CTR_PUNCHER',
    declineThreshold: 58,
    flagKey:    '_styleAge_ALL_COURT',
    migrateKey: '_styleMig_ALL_COURT',
  },
  // TAKEALLRISK — Agressão bruta começa a virar calculada.
  TAKEALLRISK: {
    threshold: 26,
    attrDeltas: { leitura: +4, controle: +2 },
    styleTarget:      'AGG_BASELINER',
    declineThreshold: 63,
    flagKey:    '_styleAge_TAKEALLRISK',
    migrateKey: '_styleMig_TAKEALLRISK',
  },
  // TACTICAL_TECHNICIAN — Pico tático: leitura de jogo atinge outro nível.
  TACT_TEC: {
    threshold: 28,
    attrDeltas: { leitura: +6, regularidade: +4 },
    styleTarget:      'ALL_COURT',
    declineThreshold: 55,
    flagKey:    '_styleAge_TACT_TEC',
    migrateKey: '_styleMig_TACT_TEC',
  },
  // ADAPTIVE_TACTICAL — Versatilidade mental: leitura + mentalidade.
  ADPT_TAC: {
    threshold: 27,
    attrDeltas: { leitura: +5, mentalidade: +4, regularidade: +3 },
    styleTarget:      null,   // ADPT_TAC já é versatilidade total — sem migração forçada
    declineThreshold: null,
    flagKey:    '_styleAge_ADPT_TAC',
    migrateKey: null,
  },
};

/**
 * Aplica os modificadores de envelhecimento do estilo se o jogador atingiu o threshold.
 * Aplicação única por jogador — flag em _devState previne duplicata.
 *
 * @param {object} player
 * @param {number} seasonYear
 * @returns {{ player: object, applied: boolean, event: object | null }}
 */
export function applyStyleAgeModifiers(player, seasonYear = 2025) {
  const profile = STYLE_AGE_PROFILES[player.styleId];
  if (!profile) return { player, applied: false, event: null };

  const age = currentAge(player, seasonYear);
  if (age < profile.threshold) return { player, applied: false, event: null };

  // Já foi aplicado antes?
  if (player._devState?.[profile.flagKey]) {
    // Mesmo após o flagKey — pode ainda migrar o styleId se o declínio agora é severo
    return tryStyleMigration(player, profile, age, seasonYear);
  }

  const p = clonePlayer(player);
  p._devState = p._devState ?? {};
  const appliedDeltas = {};

  for (const [key, delta] of Object.entries(profile.attrDeltas)) {
    if (p.attrs[key] === undefined) continue;
    const newVal = Math.max(1, Math.min(99, p.attrs[key] + delta));
    if (newVal !== p.attrs[key]) {
      appliedDeltas[key] = newVal - p.attrs[key];
      p.attrs[key] = newVal;
    }
  }

  // Marcar como aplicado
  p._devState[profile.flagKey] = true;

  // Atualizar label narrativo de styleEvolution
  const evo = computeStyleEvolution(p, seasonYear);
  if (evo) p.styleEvolution = evo;

  const event = Object.keys(appliedDeltas).length > 0 ? {
    type:       'STYLE_EVOLUTION',
    playerId:   p.id,
    player:     p.name ?? p.id,
    styleId:    p.styleId,
    age,
    label_old:  profile.label_old ?? null,
    attrDeltas: appliedDeltas,
    note:       `${p.name ?? p.id} (${age} anos) evoluiu taticamente.`,
  } : null;

  // Após aplicar attrDeltas, tenta migrar o styleId se o declínio for severo
  const migResult = tryStyleMigration(p, profile, age, seasonYear);
  if (migResult.applied) {
    return {
      player: migResult.player,
      applied: true,
      event: migResult.event ?? event,
      styleEvent: migResult.event,
    };
  }

  return { player: p, applied: true, event };
}

/**
 * Tenta migrar o styleId do jogador para o styleTarget do perfil,
 * se o declínio físico ultrapassou o declineThreshold e a migração
 * ainda não foi realizada.
 * Chamado internamente por applyStyleAgeModifiers.
 */
function tryStyleMigration(player, profile, age, seasonYear) {
  if (!profile.styleTarget || !profile.migrateKey) return { player, applied: false, event: null };
  if (player._devState?.[profile.migrateKey]) return { player, applied: false, event: null };
  if (player.styleId === profile.styleTarget) return { player, applied: false, event: null };

  // Verifica se o declínio físico é suficiente
  const vel  = player.attrs.velocidade    ?? 70;
  const exp  = player.attrs.explosividade ?? 70;
  const physAvg = (vel + exp) / 2;

  if (physAvg > profile.declineThreshold) return { player, applied: false, event: null };

  // Migração confirmada
  const p = clonePlayer(player);
  p._devState = p._devState ?? {};
  const oldStyleId = p.styleId;
  p.styleId  = profile.styleTarget;
  // styleData será recalculado no createPlayer — aqui só registramos a mudança
  // para que o Headless/UniverseManager usem o novo styleId na próxima partida.
  p._devState[profile.migrateKey] = true;
  p.styleEvolution = { evolved: profile.styleTarget, age, fromStyle: oldStyleId };

  const event = {
    type:        'STYLE_MIGRATION',
    playerId:    p.id,
    player:      p.name ?? p.id,
    fromStyleId: oldStyleId,
    toStyleId:   profile.styleTarget,
    age,
    physAvg:     +physAvg.toFixed(1),
    note: `${p.name ?? p.id} (${age} anos) mudou de estilo: ${oldStyleId} → ${profile.styleTarget} (declínio físico: ${physAvg.toFixed(0)}).`,
  };

  return { player: p, applied: true, event };
}

/**
 * Retorna o label de "estilo evoluído" para narrativa e perfil.
 * Não substitui styleId — é puramente descritivo.
 *
 * @param {object} player
 * @param {number} [seasonYear]
 * @returns {{ evolved: string, age: number } | null}
 */
export function computeStyleEvolution(player, seasonYear = 2025) {
  const profile = STYLE_AGE_PROFILES[player.styleId];
  if (!profile?.label_old) return null;

  const age = currentAge(player, seasonYear);
  if (age < profile.threshold + 1) return null;

  // Só gera label se há declínio físico real (velocidade ou explosividade < 65)
  const hasPhysicalDecline =
    (player.attrs.velocidade    ?? 70) < 65 ||
    (player.attrs.explosividade ?? 70) < 65;

  if (!hasPhysicalDecline) return null;

  return { evolved: profile.label_old, age };
}

export function advanceSeason(allPlayers, seasonYear, months = 12, titleWinners = {}, seasonMetrics = {}, coachPool = []) {
  const updatedPlayers = [];
  const events = [];

  for (const original of allPlayers) {
    let p = clonePlayer(original);

    // Garantir que _devState existe (segurança para jogadores legados)
    p._devState = p._devState || { monthsAtPeak: 0, lastBreakthrough: null, attrGrowthAccum: {} };

    // Garantir que coach e coachHistory existem (migração de jogadores legados e newgens)
    if (!('coach' in p))        p.coach        = null;
    if (!('coachHistory' in p)) p.coachHistory = [];

    // Garantir que physicalCondition e injuryHistory existem
    p = ensurePhysicalCondition(p);

    // Dados do técnico deste jogador — usado no growthMultiplierForAttr e sombras
    // Lido de player.coach (salvo na contratação) para não precisar do pool completo
    const coachData = _extractCoachData(p);

    const wasInDecline = isInDecline(p, seasonYear);

    // Snapshot dos atributos ANTES do crescimento (para histórico)
    const ovrBefore = overallRating(p.attrs);
    const attrsBefore = { ...p.attrs };

    // ── 1. Aplicar crescimento/declínio mês a mês ─────────────────
    // Passa a fração do ano para que jogadores que cruzam o peakAge
    // durante a temporada transicionem suavemente (m/12 = fração do ano)
    for (let m = 0; m < months; m++) {
      const fractionalYear = seasonYear + (m / months);
      const result = applyMonthlyGrowth(p, fractionalYear);
      p = result.player;
    }

    // ── 2. Breakthrough por título ────────────────────────────────
    const titleType = titleWinners[p.id];
    if (titleType) {
      const bt = triggerBreakthrough(p, titleType);
      if (bt) {
        p = bt.player;
        events.push({
          type: 'BREAKTHROUGH',
          playerId: p.id,
          player: p.name ?? p.id,
          title: titleType,
          attrs: bt.boostedAttrs,
        });
      }
    }

    // ── 3. Avançar cooldown do breakthrough ───────────────────────
    p = tickBreakthroughCooldown(p, months);

    // ── 3b. FASE 5 — Evolução de estilo por idade ─────────────────
    const styleAgeResult = applyStyleAgeModifiers(p, seasonYear + 1);
    if (styleAgeResult.applied) {
      p = styleAgeResult.player;
      if (styleAgeResult.event) events.push(styleAgeResult.event);
    }

    // ── 4. Avaliar alcunha ────────────────────────────────────────
    const newAlcunha = evaluateAlcunha(p);
    if (newAlcunha && newAlcunha !== original.alcunha) {
      p.alcunha = newAlcunha;
      events.push({
        type: 'ALCUNHA_GAINED',
        playerId: p.id,
        player: p.name ?? p.id,
        alcunha: newAlcunha,
      });
    }

    // ── 5. Detectar início de declínio ────────────────────────────
    const nowInDecline = isInDecline(p, seasonYear + 1);
    if (!wasInDecline && nowInDecline) {
      events.push({
        type: 'DECLINE_START',
        playerId: p.id,
        player: p.name ?? p.id,
        note: 'Fisicamente mais lento — início do declínio natural.',
      });
    }

    // ── 6. Detectar breakdown recovery (VOLATILE em declínio) ─────
    if (p.developmentStyle === 'VOLATILE' && wasInDecline) {
      const ovrNow = overallRating(p.attrs);
      const ovrBefore2 = overallRating(original.attrs);
      if (ovrNow > ovrBefore2 + 2) {
        p._devState.hadBreakdownRecovery = true;
        events.push({
          type: 'BREAKDOWN_RECOVERY',
          playerId: p.id,
          player: p.name ?? p.id,
          note: 'Ressurgimento inesperado após período de queda.',
        });
      }
    }

    // ── 7. Checar milestones de trait DNA ────────────────────────
    if (!p.dna) migratePlayerDNA(p);
    const traitSnapshotBefore = captureTraitSnapshot(p);

    // Incorporar métricas da temporada: wins, finals, surfaceWins, sombras
    const sm = seasonMetrics[p.id] ?? {};
    if (sm.wins   > 0) p._careerWins   = (p._careerWins   ?? 0) + (sm.wins   ?? 0);
    if (sm.finals > 0) p._careerFinals = (p._careerFinals ?? 0) + (sm.finals ?? 0);
    if (titleType) {
      p._careerTitles   = (p._careerTitles   ?? 0) + 1;
      if (titleType === 'SLAM' || titleType === 'GRAND_SLAM')
        p._careerGrandSlams = (p._careerGrandSlams ?? 0) + 1;
    }

    // ── careerTitles (objeto por categoria) — usa contagem real do ano ──
    // titlesByCategory acumula TODOS os títulos do ano por categoria,
    // não apenas o melhor (que é o que titleWinners guarda).
    if (sm.titlesByCategory && typeof sm.titlesByCategory === 'object') {
      if (!p.careerTitles || typeof p.careerTitles !== 'object') {
        p.careerTitles = { gs: 0, slamClash: 0, masters: 0, finals: 0, atp500: 0, atp250: 0, atp100: 0 };
      }
      for (const [key, count] of Object.entries(sm.titlesByCategory)) {
        if (count > 0) {
          p.careerTitles[key] = (p.careerTitles[key] ?? 0) + count;
        }
      }
    }
    // Registrar sombra metrics de surface e tiebreaks
    // Usa progressSombraWithCoach para acelerar cura de Sombras com coach MENTAL
    if (sm.tiebreaksWon    > 0) {
      recordMetric(p, 'tiebreaksWon', sm.tiebreaksWon);
      if (coachData) progressSombraWithCoach(p, 'tiebreaksWon', p.dna?.metrics?.tiebreaksWon ?? 0, coachData);
    }
    if (sm.matchPointsSaved > 0) {
      recordMetric(p, 'matchPointsSaved', sm.matchPointsSaved);
      if (coachData) progressSombraWithCoach(p, 'matchPointsSaved', p.dna?.metrics?.matchPointsSaved ?? 0, coachData);
    }
    if (sm.clayWins        > 0) recordMetric(p, 'clayWins',        sm.clayWins);
    if (sm.grassWins       > 0) recordMetric(p, 'grassWins',       sm.grassWins);
    if (sm.hardWins        > 0) recordMetric(p, 'hardWins',        sm.hardWins);
    if (sm.indoorTitles    > 0) {
      recordMetric(p, 'indoorTitles', sm.indoorTitles);
      if (coachData) progressSombraWithCoach(p, 'indoorTitles', p.dna?.metrics?.indoorTitles ?? 0, coachData);
    }

    // ── FASE 4 — Atualizar surfaceStats com os resultados da temporada ──
    // seasonMetrics.surfaceResults = [{ surface, won, isTournamentTitle }]
    if (Array.isArray(sm.surfaceResults)) {
      p.surfaceStats = p.surfaceStats ?? {
        CLAY:   { wins: 0, losses: 0, titlesWon: 0 },
        GRASS:  { wins: 0, losses: 0, titlesWon: 0 },
        HARD:   { wins: 0, losses: 0, titlesWon: 0 },
        INDOOR: { wins: 0, losses: 0, titlesWon: 0 },
      };
      for (const res of sm.surfaceResults) {
        const surf = (res.surface ?? 'HARD').toUpperCase();
        if (!p.surfaceStats[surf]) p.surfaceStats[surf] = { wins: 0, losses: 0, titlesWon: 0 };
        if (res.won) { p.surfaceStats[surf].wins   += 1; }
        else         { p.surfaceStats[surf].losses += 1; }
        if (res.isTournamentTitle) p.surfaceStats[surf].titlesWon += 1;
      }
    }

    // Recalcular identidade de superfície após cada temporada
    const newSurfaceIdentity = computeSurfaceIdentity(p);
    if (newSurfaceIdentity) {
      const prevIdentity = original.surfaceIdentity?.surface;
      p.surfaceIdentity = newSurfaceIdentity;
      if (newSurfaceIdentity.surface !== prevIdentity) {
        events.push({
          type:     'SURFACE_IDENTITY',
          playerId: p.id,
          player:   p.name ?? p.id,
          surface:  newSurfaceIdentity.surface,
          label:    newSurfaceIdentity.label,
          winRate:  Math.round(newSurfaceIdentity.winRate * 100),
          note:     `${p.name ?? p.id} torna-se ${newSurfaceIdentity.label} (${Math.round(newSurfaceIdentity.winRate * 100)}% de aproveitamento).`,
        });
      }
    }
    if (sm.semifinalReached > 0) {
      recordMetric(p, 'semifinalReached', sm.semifinalReached);
      if (coachData) progressSombraWithCoach(p, 'semifinalReached', p.dna?.metrics?.semifinalReached ?? 0, coachData);
    }

    const reachedPeak = p._devState?.monthsAtPeak > 0;
    const careerStats = {
      totalWins:       p._careerWins       ?? 0,
      finals:          p._careerFinals     ?? 0,
      titles:          p._careerTitles     ?? 0,
      grandSlamTitles: p._careerGrandSlams ?? 0,
      reachedPeak,
    };
    sanitizeTraitSlots(p);
    const newMilestones = checkMilestones(p, careerStats);
    if (newMilestones.length) {
      for (const mid of newMilestones) {
        events.push({
          type: 'TRAIT_MILESTONE',
          playerId: p.id,
          player: p.name ?? p.id,
          milestoneId: mid,
          note: `Novo trait desbloqueado via marco: ${mid}`,
        });
      }
    }
    // Registra título nas métricas de sombra
    if (titleType) {
      if (titleType === 'SLAM' || titleType === 'GRAND_SLAM') {
        recordMetric(p, 'grandSlamTitles', 1);
        if (coachData) progressSombraWithCoach(p, 'grandSlamTitles', p.dna?.metrics?.grandSlamTitles ?? 0, coachData);
      }
      recordMetric(p, 'titles', 1);
    }

    const traitSnapshotAfter = captureTraitSnapshot(p);
    const traitDelta = diffTraitSnapshots(traitSnapshotBefore, traitSnapshotAfter);
    const traitArcNotes = summarizeTraitDelta(traitDelta, 5);
    if (traitArcNotes.length) {
      events.push({
        type: 'TRAIT_EVOLUTION',
        playerId: p.id,
        player: p.name ?? p.id,
        traitDelta,
        note: `${p.name ?? p.id}: ${traitArcNotes.join(' | ')}`,
      });
    }

    // ── 8. Checar aposentadoria ───────────────────────────────────
    const ageNext = currentAge(p, seasonYear + 1);
    const ovrNext = overallRating(p.attrs);
    if (ageNext > 38 && ovrNext < 50) {
      events.push({
        type: 'RETIREMENT',
        playerId: p.id,
        player: p.name ?? p.id,
        note: `${p.name ?? p.id} se aposenta após ${ageNext} anos de carreira.`,
        finalOvr: ovrNext,
      });
    }

    // ── 9. Registrar histórico de temporada ──────────────────────
    // Usado pela aba "Desenvolvimento" na ficha do jogador
    const ovrAfter = overallRating(p.attrs);
    const attrChanges = {};
    for (const key of ALL_ATTR_KEYS) {
      const delta = (p.attrs[key] ?? 0) - (attrsBefore[key] ?? 0);
      if (delta !== 0) attrChanges[key] = delta;
    }
    p._seasonHistory = Array.isArray(p._seasonHistory) ? p._seasonHistory : [];
    // Evita duplicatas (se chamado mais de uma vez no mesmo ano)
    if (!p._seasonHistory.some(h => h.year === seasonYear + 1)) {
      // Cruzar lesões desta temporada com o título (para detectar "ganhou lesionado")
      const seasonInjuries = (p.injuryHistory ?? []).filter(h => h.season === seasonYear);
      const hadGradeInjury = seasonInjuries.some(h => h.grade >= 2);
      const playedThrough  = seasonInjuries.some(h => h.playedThrough === true);

      p._seasonHistory.push({
        year:         seasonYear + 1,
        age:          ageNext,
        ovr:          ovrAfter,
        ovrBefore,
        ovrDelta:     ovrAfter - ovrBefore,
        attrChanges,
        inDecline:    nowInDecline,
        titleWon:     titleType ?? null,
        // Estatísticas da temporada para a timeline
        wins:         (seasonMetrics[p.id]?.wins   ?? 0),
        finals:       (seasonMetrics[p.id]?.finals ?? 0),
        rank:         p.rankPosition ?? null,
        injuries:     seasonInjuries,
        hadGradeInjury,
        playedThrough,
        // Flag dramático: ganhou título mesmo lesionado
        titleWhileInjured: !!(titleType && playedThrough),
        traitDelta,
        traitArcNotes,
        activeTraits: traitSnapshotAfter.slice(0, 6),
      });
    }

    // ── Sincronizar p.age com o ano seguinte ─────────────────────
    p.age = ageNext;

    // ── Atualizar injuryBurden com as lesões desta temporada ─────
    p = updateInjuryBurden(p, seasonYear);

    updatedPlayers.push(p);
  }

  return { updatedPlayers, events };
}

