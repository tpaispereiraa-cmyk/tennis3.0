// ============================================
// UTILS/STATS.JS - Funções de cálculo de stats
// ============================================

/**
 * Calcula breakdown detalhado de um stat (base + parts + traits + arena + blader)
 */
export function calculateStatBreakdown(bey, stat) {
  if (!bey || !bey.stats) {
    return { base: 0, parts: 0, traits: 0, arena: 0, blader: 0, total: 0 };
  }
  
  // 1. BASE STATS - Valor base do beyblade (pontos iniciais de distribuição)
  let base = bey.baseStats ? (bey.baseStats[stat] || 0) : 0;
  
  // 2. PARTS BONUS (layer, disc, driver, armor)
  let parts = 0;
  
  if (bey.layer) {
    if (stat === 'atk' && bey.layer.atk) parts += bey.layer.atk;
    if (stat === 'def' && bey.layer.def) parts += bey.layer.def;
  }
  
  if (bey.disc) {
    if (stat === 'weight' && bey.disc.weight) parts += bey.disc.weight;
    if (stat === 'bal' && bey.disc.bal) parts += bey.disc.bal;
  }
  
  if (bey.driver) {
    if (stat === 'sta' && bey.driver.sta) parts += bey.driver.sta;
    if (stat === 'spin' && bey.driver.spin) parts += bey.driver.spin;
  }
  
  if (bey.armor && bey.armor.statMods) {
    const armorMod = bey.armor.statMods[stat];
    if (armorMod) parts += armorMod;
  }
  
  // 3. TRAITS BONUS (se houver traits ativos)
  let traits = 0;
  if (bey.traitBonusValues && bey.traitBonusValues[stat]) {
    traits = bey.traitBonusValues[stat];
  }
  
  // 4. ARENA BONUS (preferência de arena)
  let arena = 0;
  if (bey.arenaBonusValues && bey.arenaBonusValues[stat]) {
    arena = bey.arenaBonusValues[stat];
  }
  
  // 5. BLADER BONUS (atributos do blader)
  let blader = 0;
  if (bey.bladerBonusValues && bey.bladerBonusValues[stat]) {
    blader = bey.bladerBonusValues[stat];
  }
  
  // Se não temos baseStats, calcular retroativamente
  if (!bey.baseStats) {
    const currentTotal = bey.stats[stat] || 0;
    base = currentTotal - parts - traits - arena - blader;
  }
  
  // Total final
  let total = base + parts + traits + arena + blader;
  
  // Clamp to reasonable values
  if (stat === 'spin') {
    total = Math.max(1, Math.min(80, total));
  } else {
    total = Math.max(1, Math.min(45, total));
  }
  
  // Clamp individual parts
  base = Math.max(0, base);
  parts = Math.max(0, parts);
  traits = Math.max(0, traits);
  arena = Math.max(0, arena);
  blader = Math.max(0, blader);
  
  return { base, parts, traits, arena, blader, total };
}

/**
 * Calcula o stat total de um beyblade (versão simplificada)
 */
export function calculateTotalStat(bey, stat) {
  return calculateStatBreakdown(bey, stat).total;
}
