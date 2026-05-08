// ============================================
// DEVELOPMENTSYSTEM.JS - Sistema de Desenvolvimento Mensal V3.0
// REVAMP: growthRates corrigidos (~25x), limiares probabilísticos por zona
// ============================================

import {
  POTENTIAL_CATEGORIES,
  ALCUNHAS,
  MENTALITY_STAT_PRIORITIES,
  DEV_CONSTANTS,
  ARCHETYPE_GROWTH_RATES,
  determineCategoryByAverage,
  calculateTotalPoints,
  generateInitialAttributes
} from './DevelopmentConstants.js';

import { calculateThresholds } from './ScoutSystem.js';
import { getPlayerTraitData } from './traits_data.js';

const STATS = ['attack', 'defense', 'stamina', 'speed', 'technique', 'launchPower', 'intelligence', 'adaptability', 'clutch'];

// ==========================================
// DETERMINAR ALCUNHA (mantida para save compat)
// ==========================================
export function determineAlcunha(potential, attributes) {
  const avgStat = Object.values(attributes).reduce((a, b) => a + b, 0) / 9;
  const { category, revealPercent } = potential;
  const categoryOrder = ['GERACIONAL', 'LENDA', 'ELITE', 'CAMPEAO', 'COMUM', 'ABAIXO_DA_MEDIA'];
  const categoryRank  = categoryOrder.indexOf(category);
  const goldenBoy     = ALCUNHAS.GOLDEN_BOY;
  if (categoryRank <= categoryOrder.indexOf(goldenBoy.minCategory) &&
      revealPercent >= goldenBoy.minRevealPercent && avgStat >= goldenBoy.minAvgStat) return 'GOLDEN_BOY';
  const prodigio = ALCUNHAS.PRODIGIO;
  if (categoryRank <= categoryOrder.indexOf(prodigio.minCategory) &&
      revealPercent >= prodigio.minRevealPercent && avgStat >= prodigio.minAvgStat) return 'PRODIGIO';
  const promessa = ALCUNHAS.PROMESSA;
  if (categoryRank <= categoryOrder.indexOf(promessa.minCategory) &&
      revealPercent >= promessa.minRevealPercent && avgStat >= promessa.minAvgStat) return 'PROMESSA';
  const talentoBruto = ALCUNHAS.TALENTO_BRUTO;
  if (categoryRank <= categoryOrder.indexOf(talentoBruto.minCategory) &&
      revealPercent <= talentoBruto.maxRevealPercent && avgStat <= talentoBruto.maxAvgStat) return 'TALENTO_BRUTO';
  const lateBloomer = ALCUNHAS.LATE_BLOOMER;
  if (revealPercent <= lateBloomer.maxRevealPercent && avgStat <= lateBloomer.maxAvgStat) return 'LATE_BLOOMER';
  if (category === 'COMUM') return 'COMUM';
  return null;
}

// ==========================================
// CALCULAR CRESCIMENTO ANUAL (V3)
// Retorna pontos de atributo por ano
// ==========================================
export function calculateYearlyGrowth(player, formManager) {
  const { age, potential, developmentStyle } = player;
  if (!potential || !developmentStyle) return 0;
  const { peakAge, growthRate: storedRate } = developmentStyle;
  const [peakStart, peakEnd] = peakAge;
  const archetype     = developmentStyle.archetype || 'STEADY';
  const archetypeData = ARCHETYPE_GROWTH_RATES ? ARCHETYPE_GROWTH_RATES[archetype] : null;
  let baseRate;
  if (storedRate >= 1.0)    baseRate = storedRate;
  else if (archetypeData)   baseRate = archetypeData.growthRate;
  else                      baseRate = storedRate * 25;
  let ageMult = 0;
  if (age < peakStart) {
    const yp = peakStart - age;
    if (yp > 8)      ageMult = 1.55;
    else if (yp > 5) ageMult = 1.35;
    else if (yp > 3) ageMult = 1.15;
    else             ageMult = 1.00;
  } else if (age <= peakEnd) {
    ageMult = 0.85;
  } else {
    return 0;
  }
  let forma = 50;
  try {
    const playerId = player.id || player.name;
    const tracker = formManager?.getTracker(playerId);
    if (tracker) forma = tracker.forma ?? 50;
  } catch(e) {}
  let formMult = 1.0;
  if (forma >= 80)      formMult = 1.5;
  else if (forma >= 65) formMult = 1.2;
  else if (forma >= 50) formMult = 1.0;
  else if (forma >= 35) formMult = 0.8;
  else                  formMult = 0.5;

  let result = baseRate * ageMult * formMult;

  // ── AGE_FACTOR TRAITS ──
  try {
    const traitData = getPlayerTraitData(player.name);
    const traits = traitData?.traits || [];
    const getTier = (id) => { const t = traits.find(t => t?.id === id); return t ? t.tier : null; };

    // SUPERPRODIGIO: taxa de crescimento aumentada
    const spt = getTier('SUPERPRODIGIO');
    if (spt === 'NEG' && age > 22 && age < peakStart) result *= 0.70; // pico precoce
    else if (spt === 'COM') result *= 1.15;
    else if (spt === 'RAR') result *= 1.30;
    else if (spt === 'LEN') result *= 1.50;

    // RENASCIMENTO_TARDIO: cresce mais tarde
    const rtt = getTier('RENASCIMENTO_TARDIO');
    if (rtt === 'NEG' && age >= 30) result = 0; // atributos não melhoram
    else if (rtt === 'COM' && age >= 28 && age <= 34) result *= 1.50;
    else if (rtt === 'RAR' && age >= 30 && age <= 36) result *= 1.70;
    else if (rtt === 'LEN' && age >= 30 && age <= 38) result *= 2.0;
  } catch(e) {}

  return result;
}

// ==========================================
// DECIDIR ALOCAÇÃO DE STAT
// ==========================================
export function decideStatAllocation(player, metaState = null) {
  const { mentality, attributes } = player;
  const priorities = MENTALITY_STAT_PRIORITIES[mentality] || MENTALITY_STAT_PRIORITIES.ALL_ROUNDER;
  const available = {
    primary:   priorities.primary.filter(s   => attributes[s] < DEV_CONSTANTS.MAX_STAT_VALUE),
    secondary: priorities.secondary.filter(s => attributes[s] < DEV_CONSTANTS.MAX_STAT_VALUE),
    tertiary:  priorities.tertiary.filter(s  => attributes[s] < DEV_CONSTANTS.MAX_STAT_VALUE),
  };
  if (attributes.intelligence >= 10 && metaState) adjustForMeta(available, metaState, priorities);
  const roll    = Math.random();
  const weights = priorities.weights || { primary: 0.70, secondary: 0.20, tertiary: 0.10 };
  if (roll < weights.primary && available.primary.length > 0) return weightedRandom(available.primary);
  if (roll < (weights.primary + weights.secondary) && available.secondary.length > 0) return weightedRandom(available.secondary);
  if (available.tertiary.length > 0) return weightedRandom(available.tertiary);
  const all = [...available.primary, ...available.secondary, ...available.tertiary];
  if (all.length === 0) return null;
  return weightedRandom(all);
}

function weightedRandom(array) {
  if (!array || array.length === 0) return null;
  return array[Math.floor(Math.random() * array.length)];
}

function adjustForMeta(available, metaState, priorities) {
  if (!metaState) return;
  if (metaState.dominantType === 'Attack' && Math.random() < 0.3) {
    const idx = available.primary.indexOf('attack');
    if (idx > -1) { available.primary.splice(idx, 1); if (!priorities.avoid.includes('attack')) available.secondary.push('attack'); }
  }
  if (metaState.risingType === 'Defense' && Math.random() < 0.3) {
    const idx = available.secondary.indexOf('defense');
    if (idx > -1) { available.secondary.splice(idx, 1); available.primary.push('defense'); }
  }
  if (metaState.risingType === 'Stamina' && Math.random() < 0.3) {
    const idx = available.secondary.indexOf('stamina');
    if (idx > -1) { available.secondary.splice(idx, 1); available.primary.push('stamina'); }
  }
}

// ==========================================
// MODIFICADOR DE ZONA
// Zona 1 (0-60%): 1.00 | Zona 2 (60-70%): 0.80 | Zona 3 (70-80%): 0.50 | Zona 4 (80-100%): 0.20
// ==========================================
function getZoneModifier(potential) {
  const { pointsEarned = 0, totalPoints = 100 } = potential;
  const t = potential.thresholds || {
    floor:    Math.floor(totalPoints * 0.60),
    likely:   Math.floor(totalPoints * 0.70),
    possible: Math.floor(totalPoints * 0.80),
    ceiling:  totalPoints,
  };
  if (pointsEarned < t.floor)    return 1.00;
  if (pointsEarned < t.likely)   return 0.80;
  if (pointsEarned < t.possible) return 0.50;
  return 0.20;
}

// ==========================================
// APLICAR DESENVOLVIMENTO MENSAL (V3)
// ==========================================
export function applyMonthlyDevelopment(player, playerId, formManager, metaState = null) {
  if (!player.potential || !player.developmentStyle || !player.attributes) return null;
  const report = { pointsGained: 0, allocations: [], breakthrough: false, poolBefore: player.potential.growthPool || 0, poolAfter: 0 };
  if (!player.potential.thresholds) {
    player.potential.thresholds = { floor: Math.floor((player.potential.totalPoints||100)*0.60), likely: Math.floor((player.potential.totalPoints||100)*0.70), possible: Math.floor((player.potential.totalPoints||100)*0.80), ceiling: player.potential.totalPoints||100 };
  }
  if (player.potential.breakthroughBonus === undefined) player.potential.breakthroughBonus = 0;
  const yearlyGrowth  = calculateYearlyGrowth(player, formManager);
  const monthlyGrowth = yearlyGrowth / 12;
  if (!player.potential.growthPool) player.potential.growthPool = 0;
  player.potential.growthPool += monthlyGrowth;
  let btBonus = 1.0;
  if (player.potential.breakthroughBonus > 0) { btBonus = 2.0; player.potential.breakthroughBonus--; }
  while (player.potential.growthPool >= 1.0 && player.potential.pointsRemaining > 0) {
    player.potential.growthPool -= 1.0;
    const zoneMod = getZoneModifier(player.potential) * btBonus;
    if (Math.random() > zoneMod) continue;
    const stat = decideStatAllocation(player, metaState);
    if (!stat) break;
    const oldValue = player.attributes[stat];
    player.attributes[stat] = Math.min(DEV_CONSTANTS.MAX_STAT_VALUE, oldValue + 1);
    const newValue = player.attributes[stat];
    if (newValue > oldValue) {
      player.potential.pointsEarned     = (player.potential.pointsEarned  || 0) + 1;
      player.potential.pointsRemaining  = Math.max(0, (player.potential.pointsRemaining || 0) - 1);
      report.pointsGained++;
      report.allocations.push({ stat, from: oldValue, to: newValue });
      console.log(`📈 ${player.name}: ${stat} ${oldValue} → ${newValue}`);
    }
  }
  report.poolAfter = player.potential.growthPool;
  if (player.development) {
    player.development.lastGrowth  = report.pointsGained;
    player.development.totalGrowth = (player.development.totalGrowth || 0) + report.pointsGained;
    player.development.yearsActive = (player.development.yearsActive || 0) + (1/12);
    // Registrar peak de cada atributo para BLINDAGEM_DE_CARREIRA
    if (!player.development.peakAttributes) player.development.peakAttributes = {};
    const STATS_TRACK = ['attack', 'defense', 'stamina', 'speed', 'technique', 'launchPower', 'intelligence', 'adaptability', 'clutch'];
    STATS_TRACK.forEach(s => {
      const cur = player.attributes[s] || 0;
      if (cur > (player.development.peakAttributes[s] || 0)) player.development.peakAttributes[s] = cur;
    });
  }
  return report;
}

// ==========================================
// CHECK BREAKTHROUGH MENSAL (V3)
// ==========================================
export function checkMonthlyBreakthrough(player, formManager, matchContext = {}) {
  let forma = 50;
  try {
    const playerId = player.id || player.name;
    const tracker = formManager?.getTracker(playerId);
    if (tracker) forma = tracker.forma ?? 50;
  } catch(e) {}
  let yearlyChance = 0.04;
  if (forma >= 75)      yearlyChance = 0.12;
  else if (forma >= 60) yearlyChance = 0.07;
  if (matchContext.wonGrandSlam)     yearlyChance += 0.10;
  if (matchContext.wonMasters)       yearlyChance += 0.05;
  if (matchContext.winStreak >= 5)   yearlyChance += 0.03;
  const monthlyChance = yearlyChance / 12;
  if (Math.random() < monthlyChance) {
    if (!player.potential.growthPool) player.potential.growthPool = 0;

    // ── DIAMANTE_BRUTO: breakthrough dá mais pool e bônus ──
    let btPool = 3.0;
    let btBonus = 6;
    let btExtraPoints = 1;
    try {
      const traitData = getPlayerTraitData(player.name);
      const traits = traitData?.traits || [];
      const getTier = (id) => { const t = traits.find(t => t?.id === id); return t ? t.tier : null; };
      const dbt = getTier('DIAMANTE_BRUTO');
      if (dbt === 'NEG') { btPool = 1.5; btBonus = 3; } // teto de vidro — menos ganho
      else if (dbt === 'COM') { btPool = 5.0; btBonus = 6; btExtraPoints = 2; }    // +5 pool
      else if (dbt === 'RAR') { btPool = 7.0; btBonus = 8; btExtraPoints = 2; }    // +7 pool + 8 meses
      else if (dbt === 'LEN') { btPool = 10.0; btBonus = 12; btExtraPoints = 3; }  // +10 pool + 12 meses + 2 zonas
    } catch(e) {}

    player.potential.growthPool += btPool;
    player.potential.breakthroughBonus = (player.potential.breakthroughBonus || 0) + btBonus;
    if (player.potential.pointsRemaining !== undefined) player.potential.pointsRemaining += btExtraPoints;
    if (player.potential.totalPoints     !== undefined) player.potential.totalPoints     += btExtraPoints;
    if (player.potential.thresholds) { player.potential.thresholds.ceiling += btExtraPoints; player.potential.thresholds.possible += btExtraPoints; }
    if (player.development) player.development.breakthroughs = (player.development.breakthroughs || 0) + 1;
    console.log(`🚀 ${player.name}: BREAKTHROUGH! +${btPool} pool, ${btBonus} meses boost`);
    return true;
  }
  return false;
}

// ==========================================
// APLICAR DECLÍNIO MENSAL (V3)
// ==========================================
// ==========================================
// APLICAR DECLÍNIO MENSAL — Pool System v2
// ==========================================
// Usa o mesmo padrão do growthPool:
//   1. Acumula pontos mensalmente no declinePool (float)
//   2. Quando pool >= 1.0: remove 1 ponto inteiro de um stat
//   3. Cap absoluto: 40% do totalPoints do jogador
//
// declineRate agora é PONTOS TOTAIS / ANO (não por stat).
// Novos valores: LATE_BLOOMER 0.87 → PRODIGY 5.64
// ==========================================
export function applyMonthlyDecline(player) {
  if (!player.developmentStyle || !player.attributes) return null;
  const { age, developmentStyle } = player;
  const peakEnd = developmentStyle.peakAge[1];
  if (age <= peakEnd) return null;

  // ── Garantir campos de pool no potential ──
  if (!player.potential) return null;
  if (player.potential.declinePool    === undefined) player.potential.declinePool    = 0.0;
  if (player.potential.declinedPoints === undefined) player.potential.declinedPoints = 0;

  // ── Calcular cap (40% do totalPoints) ──
  const totalPoints = player.potential.totalPoints || 50;
  const declineCap  = Math.floor(totalPoints * 0.40);

  // Já atingiu o cap → nada mais a declinar
  if (player.potential.declinedPoints >= declineCap) return null;

  // ── Taxa base de declínio (pts totais / ano) ──
  const archetype     = developmentStyle.archetype || 'STEADY';
  const archetypeData = ARCHETYPE_GROWTH_RATES ? ARCHETYPE_GROWTH_RATES[archetype] : null;
  let yearlyDeclineBase = developmentStyle.declineRate || (archetypeData?.declineRate ?? 1.75);

  // ── AGE_FACTOR TRAITS: VETERANO_ETERNO modifica taxa ──
  try {
    const traitData = getPlayerTraitData(player.name);
    const traits    = traitData?.traits || [];
    const getTier   = (id) => { const t = traits.find(t => t?.id === id); return t ? t.tier : null; };
    const vet = getTier('VETERANO_ETERNO');
    if (vet === 'NEG') yearlyDeclineBase *= 2.0;
    else if (vet === 'COM') yearlyDeclineBase *= 0.50;
    else if (vet === 'RAR') yearlyDeclineBase *= 0.27;
    else if (vet === 'LEN') yearlyDeclineBase *= 0.10;
  } catch(e) {}

  // ── Aceleração por anos após o pico (igual à fórmula anterior) ──
  const yearsOver     = age - peakEnd;
  const yearlyDecline = yearlyDeclineBase * (1 + yearsOver * 0.12);

  // ── Acumular no pool ──
  player.potential.declinePool += yearlyDecline / 12;

  // ── BLINDAGEM_DE_CARREIRA: floor por atributo ──
  let peakFloorPct = 0;
  try {
    const traitData = getPlayerTraitData(player.name);
    const traits    = traitData?.traits || [];
    const getTier   = (id) => { const t = traits.find(t => t?.id === id); return t ? t.tier : null; };
    const bct = getTier('BLINDAGEM_DE_CARREIRA');
    if      (bct === 'COM') peakFloorPct = 0.90;
    else if (bct === 'RAR') peakFloorPct = 0.95;
    else if (bct === 'LEN') peakFloorPct = 1.00;
  } catch(e) {}

  const peakStats = (peakFloorPct > 0 && player.development?.peakAttributes)
    ? { ...player.development.peakAttributes }
    : {};

  const STATS_LOCAL = ['attack','defense','stamina','speed','technique','launchPower','intelligence','adaptability','clutch'];
  const report = { changes: {}, regression: false };

  // ── Disparar pontos inteiros enquanto pool >= 1.0 e cap não atingido ──
  while (player.potential.declinePool >= 1.0 && player.potential.declinedPoints < declineCap) {
    player.potential.declinePool -= 1.0;

    // Escolher stat a declinar: preferência pelos mais altos (com ruído leve)
    const eligible = STATS_LOCAL.filter(s => player.attributes[s] > DEV_CONSTANTS.MIN_STAT_VALUE);
    if (eligible.length === 0) break;

    // Ordenar por valor desc e pegar um dos top-3 aleatoriamente (evita sempre cair no mesmo)
    eligible.sort((a, b) => player.attributes[b] - player.attributes[a]);
    const topN = eligible.slice(0, Math.min(3, eligible.length));
    let stat = topN[Math.floor(Math.random() * topN.length)];

    // Aplicar floor de BLINDAGEM se ativo
    if (peakFloorPct > 0 && peakStats[stat]) {
      const floor = Math.floor(peakStats[stat] * peakFloorPct);
      if (player.attributes[stat] <= floor) {
        // Este stat está no floor — tentar outro
        const other = eligible.find(s => {
          const f = peakStats[s] ? Math.floor(peakStats[s] * peakFloorPct) : 0;
          return player.attributes[s] > f;
        });
        if (!other) { player.potential.declinePool = 0; break; } // tudo no floor
        stat = other;
      }
    }

    const oldVal = player.attributes[stat];
    player.attributes[stat] = Math.max(DEV_CONSTANTS.MIN_STAT_VALUE, oldVal - 1);
    const newVal = player.attributes[stat];

    if (newVal < oldVal) {
      player.potential.declinedPoints++;
      report.changes[stat] = { from: oldVal, to: newVal, delta: -1 };
      console.log(`📉 ${player.name}: ${stat} ${oldVal}→${newVal} (declined ${player.potential.declinedPoints}/${declineCap})`);
    }
  }

  return report;
}

// ==========================================
// MIGRAR JOGADOR DO SISTEMA ANTIGO (V3)
// ==========================================
export function migrateLegacyPlayer(player) {
  if (!player.potential) return;
  // Migrar growthRate se ainda está no formato antigo (< 1.0)
  if (player.developmentStyle && player.developmentStyle.growthRate < 1.0) {
    const archetype    = player.developmentStyle.archetype || 'STEADY';
    const archetypeData = ARCHETYPE_GROWTH_RATES ? ARCHETYPE_GROWTH_RATES[archetype] : null;
    if (archetypeData) {
      player.developmentStyle.growthRate  = archetypeData.growthRate;
      player.developmentStyle.declineRate = archetypeData.declineRate;
      console.log(`🔄 ${player.name}: growthRate migrado → ${archetypeData.growthRate}`);
    }
  }
  // Já tem novo formato
  if (player.potential.category && player.potential.totalPoints !== undefined) {
    if (!player.potential.thresholds) player.potential.thresholds = { floor: Math.floor(player.potential.totalPoints*0.60), likely: Math.floor(player.potential.totalPoints*0.70), possible: Math.floor(player.potential.totalPoints*0.80), ceiling: player.potential.totalPoints };
    if (player.potential.breakthroughBonus === undefined) player.potential.breakthroughBonus = 0;
    // ── Migrar campos de declínio ──
    if (player.potential.declinePool    === undefined) player.potential.declinePool    = 0.0;
    if (player.potential.declinedPoints === undefined) player.potential.declinedPoints = 0;
    // Também migrar declineRate para nova escala se ainda está no formato antigo
    if (player.developmentStyle?.declineRate !== undefined && player.developmentStyle.declineRate < 1.0) {
      const archetype    = player.developmentStyle.archetype || 'STEADY';
      const archetypeData = ARCHETYPE_GROWTH_RATES ? ARCHETYPE_GROWTH_RATES[archetype] : null;
      if (archetypeData) player.developmentStyle.declineRate = archetypeData.declineRate;
    }
    return;
  }
  // Migrar do formato antigo
  const oldCeiling = player.potential.ceiling;
  if (!oldCeiling) {
    player.potential = { category:'COMUM', totalPoints:50, pointsEarned:0, pointsRemaining:50, growthPool:0.0, declinePool:0.0, declinedPoints:0, breakthroughBonus:0, revealPercent:0.60, thresholds:{floor:30,likely:35,possible:40,ceiling:50}, alcunha:null };
    return;
  }
  const ceilingValues   = Object.values(oldCeiling);
  const ceilingAvg      = ceilingValues.reduce((a, b) => a + b, 0) / ceilingValues.length;
  const category        = determineCategoryByAverage(ceilingAvg);
  const currentTotal    = Object.values(player.attributes).reduce((a, b) => a + b, 0);
  const pointsEarned    = Math.max(0, currentTotal - 70);
  const targetTotal     = Math.round(ceilingAvg * 9);
  const pointsRemaining = Math.max(0, targetTotal - currentTotal);
  const totalPoints     = pointsEarned + pointsRemaining;
  player.potential = {
    category, totalPoints, pointsEarned, pointsRemaining,
    growthPool: 0.0, declinePool: 0.0, declinedPoints: 0, breakthroughBonus: 0,
    revealPercent: currentTotal / targetTotal,
    thresholds: { floor: Math.floor(totalPoints*0.60), likely: Math.floor(totalPoints*0.70), possible: Math.floor(totalPoints*0.80), ceiling: totalPoints },
    alcunha: determineAlcunha({ category, revealPercent: currentTotal / targetTotal }, player.attributes),
  };
  console.log(`✅ Migrado: ${player.name} → ${category} (${pointsRemaining} pts restantes)`);
}
