// ============================================================
// TRAITDNA SYSTEM — v1.0
// ============================================================
// Sistema de identidade oculta de traits para jogadores.
//
// CONCEITO:
//   Cada jogador nasce com um valor secreto `traitDNA` (0–100),
//   completamente desacoplado do potential.category.
//   É a "alma competitiva" — define quantas traits o jogador pode
//   acumular ao longo da carreira e qual tier máximo pode atingir.
//
// CICLO DE VIDA:
//   1. Nasce com 1 positiva + 1 negativa (sempre)
//   2. A negativa é CICATRIZ (80%) ou SOMBRA (20%)
//      - CICATRIZ: permanente, faz parte de quem é
//      - SOMBRA: bloqueio mental, pode ser superado por marco de carreira
//   3. Slots positivos adicionais desbloqueados por marcos de carreira
//   4. Uma 2ª negativa pode surgir via eventos traumáticos (máx 2 neg total)
//
// SLOTS POR traitDNA:
//   0–15  → BAIXO:      1 slot positivo, tier máx COM
//   16–45 → MÉDIO:      2 slots positivos, tier máx COM
//   46–80 → NORMAL:     3 slots positivos, 1 pode ser RAR
//   81–94 → ALTO:       4 slots positivos, 1 pode ser LEN
//   95–100 → EXCEPCIONAL: 5 slots positivos, múltiplos LEN possíveis
//
// DISTRIBUIÇÃO:
//   BAIXO 15% | MÉDIO 30% | NORMAL 35% | ALTO 14% | EXCEPCIONAL 6%
//
// IMPORTADO POR: NewgenEngine.js, traits_data.js (inferência)
// ============================================================

// ── FAIXAS E PERFIS ─────────────────────────────────────────

export const DNA_PROFILES = {
  BAIXO:       { range: [0,  15], maxPositiveSlots: 1, maxTier: 'COM', label: 'Baixo' },
  MEDIO:       { range: [16, 45], maxPositiveSlots: 2, maxTier: 'COM', label: 'Médio' },
  NORMAL:      { range: [46, 80], maxPositiveSlots: 3, maxTier: 'RAR', label: 'Normal' },
  ALTO:        { range: [81, 94], maxPositiveSlots: 4, maxTier: 'LEN', label: 'Alto' },
  EXCEPCIONAL: { range: [95,100], maxPositiveSlots: 5, maxTier: 'LEN', label: 'Excepcional' },
};

/** Retorna o perfil completo dado um traitDNA (0–100) */
export function getTraitDNAProfile(dna) {
  if (dna <= 15)  return DNA_PROFILES.BAIXO;
  if (dna <= 45)  return DNA_PROFILES.MEDIO;
  if (dna <= 80)  return DNA_PROFILES.NORMAL;
  if (dna <= 94)  return DNA_PROFILES.ALTO;
  return DNA_PROFILES.EXCEPCIONAL;
}

/** Gera um traitDNA aleatório seguindo a distribuição definida */
export function generateTraitDNA() {
  const r = Math.random() * 100;
  if (r < 15) return Math.floor(Math.random() * 16);         // 0–15  (15%)
  if (r < 45) return 16 + Math.floor(Math.random() * 30);   // 16–45 (30%)
  if (r < 80) return 46 + Math.floor(Math.random() * 35);   // 46–80 (35%)
  if (r < 94) return 81 + Math.floor(Math.random() * 14);   // 81–94 (14%)
  return 95 + Math.floor(Math.random() * 6);                 // 95–100 (6%)
}

// ── TIPOS DE NEGATIVA ────────────────────────────────────────

export const NEG_TYPES = { CICATRIZ: 'CICATRIZ', SOMBRA: 'SOMBRA' };

/**
 * Classifica uma negativa como CICATRIZ (80%) ou SOMBRA (20%).
 * Jogadores de alta categoria têm maior chance de SOMBRA
 * (bloqueio mental > limitação física).
 */
export function classifyNegative(potentialCategory) {
  const sombraChance = {
    GERACIONAL:     0.45,
    LENDA:          0.40,
    ELITE:          0.30,
    CAMPEAO:        0.20,
    COMUM:          0.10,
    ABAIXO_DA_MEDIA: 0.05,
  };
  const chance = sombraChance[potentialCategory] ?? 0.20;
  return Math.random() < chance ? NEG_TYPES.SOMBRA : NEG_TYPES.CICATRIZ;
}

/**
 * Versão determinística (para migração de jogadores existentes).
 * Usa hash do nome + traitId para ser estável entre sessões.
 */
export function classifyNegativeDeterministic(playerName, traitId, potentialCategory) {
  const hash = hashString(`${playerName}::${traitId}`);
  const sombraChance = {
    GERACIONAL: 0.45, LENDA: 0.40, ELITE: 0.30,
    CAMPEAO: 0.20, COMUM: 0.10, ABAIXO_DA_MEDIA: 0.05,
  };
  const chance = sombraChance[potentialCategory] ?? 0.20;
  return hash < chance ? NEG_TYPES.SOMBRA : NEG_TYPES.CICATRIZ;
}

// ── MARCOS DE SUPERAÇÃO DE SOMBRA ───────────────────────────
//
// Cada NEG tem um marco que, quando atingido, converte a SOMBRA → COM.
// Formato: { event, required, desc }
//   event:    chave no objeto shadowProgress do jogador
//   required: quantidade de eventos necessária
//   desc:     texto legível para UI

export const SHADOW_MILESTONES = {
  SANGUE_FRIO:              { event: 'survivedMatchPoints',      required: 5,  desc: 'Sobreviver a 5 match points do adversário' },
  FECHADOR:                 { event: 'closedMatchPoints',        required: 3,  desc: 'Fechar 3 partidas estando em match point' },
  MENTALIDADE_DE_SET:       { event: 'wonFinalRounds',           required: 4,  desc: 'Vencer 4 rounds finais de série' },
  PRESSAO_ABSOLUTA:         { event: 'wonTiedDecisives',         required: 3,  desc: 'Vencer 3 decisivos com placar empatado' },
  INSTINTO_DO_CAMPEONATO:   { event: 'wonFinals',                required: 2,  desc: 'Vencer 2 finais de torneio' },
  VIRADISTA:                { event: 'comeback02Wins',           required: 2,  desc: 'Virar 2 partidas de 0-2' },
  FENIX:                    { event: 'recoveredFromRockBottom',  required: 2,  desc: 'Sair do ROCK_BOTTOM 2 vezes e vencer' },
  LEAO_ENCURRALADO:         { event: 'wonFromSlump',             required: 3,  desc: 'Vencer 3 partidas estando em SLUMP' },
  GUERRA_DE_ATRITO:         { event: 'wonSpinDeficit',           required: 4,  desc: 'Vencer 4 partidas em desvantagem de spin' },
  GLADIADOR:                { event: 'wonVsRepeatTech',          required: 3,  desc: 'Superar 3 adversários que repetem a mesma técnica' },
  AVALANCHE:                { event: 'wonAsFavorite',            required: 5,  desc: 'Vencer 5 partidas como favorito sem ceder momentum' },
  IMPLACAVEL:               { event: 'consecutiveBurstWins',     required: 3,  desc: '3 vitórias consecutivas por burst' },
  REI_DA_ARENA_DOMINANCIA:  { event: 'wonSpinDominance',         required: 5,  desc: 'Dominar spin em 5 vitórias' },
  SANGUE_QUENTE:            { event: 'wonOnFire',                required: 5,  desc: 'Vencer 5 partidas estando em ON_FIRE' },
  DESTRUIDOR_DE_MORAL:      { event: 'wonVsSlumping',            required: 5,  desc: 'Vencer 5 adversários em SLUMP' },
  MAO_FIRME:                { event: 'strongPlusLaunches',       required: 10, desc: '10 lançamentos STANDARD+ consecutivos' },
  PERFECCIONISTA:           { event: 'perfectLaunchesInBig',     required: 5,  desc: '5 lançamentos PERFECT em SF ou Final' },
  PISTOLEIRO:               { event: 'survivedAggressiveTech',   required: 5,  desc: 'Sobreviver 5x usando técnicas agressivas sem ser burst' },
  CALCULISTA:               { event: 'wonDefensiveStyle',        required: 5,  desc: 'Vencer 5 partidas com técnicas ENDURANCE/PRECISION' },
  CRONOMETRO:               { event: 'perfectInBigMatches',      required: 3,  desc: '3 lançamentos PERFECT em SF/Final' },
  DESTRUIDOR_DE_BURST:      { event: 'burstWins',                required: 5,  desc: 'Vencer 5 partidas por burst' },
  ARMADURA_VIVA:            { event: 'matchesWithoutBurst',      required: 5,  desc: 'Vencer 5 partidas sem ser burst' },
  ETERNO_GIRO:              { event: 'wonBySpinout',             required: 5,  desc: 'Vencer 5 partidas por spin-out' },
  CONTRA_GOLPE:             { event: 'wonByCriticalCounter',     required: 3,  desc: 'Vencer 3 rounds com counter após critical hit recebido' },
  VENENO_LENTO:             { event: 'wonByAccumulatedBurst',    required: 3,  desc: 'Vencer 3 partidas por burst acumulativo' },
  RELAMPAGO:                { event: 'wonBestOf5',               required: 5,  desc: 'Vencer 5 partidas Best-of-5' },
  ULTRAMARATONISTA:         { event: 'wonFinalRoundMatches',     required: 5,  desc: 'Vencer 5 partidas que foram ao round final' },
  RELOGIO_BIOLOGICO:        { event: 'wonLateGame',              required: 5,  desc: 'Vencer 5 partidas decididas no round final' },
  ESPECIALISTA_TIEBREAK:    { event: 'wonTiedDecisives',         required: 5,  desc: 'Vencer 5 decisivos com placar empatado' },
  CAMALEAO:                 { event: 'wonOutsideFavorite',       required: 5,  desc: 'Vencer 5 partidas fora da arena favorita' },
  REI_DA_SELVA:             { event: 'wonInFavoriteArena',       required: 8,  desc: 'Vencer 8 partidas na arena favorita' },
  EXPLORADOR:               { event: 'wonDifferentArenas',       required: 4,  desc: 'Vencer em 4 arenas diferentes' },
  ARQUITETO:                { event: 'wonSynergyArena',          required: 3,  desc: 'Explorar sinergia tipo/arena 3 vezes' },
  SANGUE_DE_CAMPEON:        { event: 'wonBigMatches',            required: 3,  desc: 'Vencer 3 partidas em SF ou Final' },
  ESPECIALISTA_MATA_MATA:   { event: 'wonKOMatches',             required: 5,  desc: 'Vencer 5 partidas em formato eliminatório' },
  REI_DOS_GRUPOS:           { event: 'topGroupFinishes',         required: 5,  desc: 'Terminar top-2 em 5 grupos' },
  CACADOR_DE_GIGANTES:      { event: 'wonVsHigherTier',          required: 3,  desc: 'Vencer 3 adversários de tier superior' },
  MONSTRO_DO_REDEMPTION:    { event: 'wonRedemptionTourneys',    required: 2,  desc: 'Vencer 2 torneios de redemption' },
  MEMORIA_FOTOGRAFICA:      { event: 'wonRematches',             required: 5,  desc: 'Vencer 5 rematches' },
  PSICOLOGICO:              { event: 'wonH2HDomination',         required: 5,  desc: 'Dominar 5 confrontos diretos (3-0 ou 4-1 em sets)' },
  ESPECIALISTA_EM_REVANCHE: { event: 'wonRevenge',               required: 3,  desc: 'Vencer 3 revanches de derrota anterior' },
  RIVAL_ETERNO:             { event: 'rivalryWins',              required: 5,  desc: 'Vencer 5 partidas contra o mesmo rival' },
  SUPERPRODIGIO:            { event: 'breakthroughs',            required: 3,  desc: '3 breakthroughs de desenvolvimento' },
  DIAMANTE_BRUTO:           { event: 'breakthroughs',            required: 2,  desc: '2 breakthroughs consecutivos' },
  VETERANO_ETERNO:          { event: 'titlesAfter30',            required: 1,  desc: 'Vencer 1 título após os 30 anos' },
  RENASCIMENTO_TARDIO:      { event: 'wonAfterPeak',             required: 3,  desc: 'Vencer 3 torneios após o pico de carreira' },
  BLINDAGEM_DE_CARREIRA:    { event: 'seasonsNoDecline',         required: 3,  desc: '3 temporadas consecutivas sem regressão' },
  INERCIAL:                 { event: 'wonTournamentOpener',      required: 5,  desc: 'Vencer a 1ª partida de 5 torneios diferentes' },
  RECUPERACAO_RAPIDA:       { event: 'wonAfterLossStreak',       required: 3,  desc: 'Vencer imediatamente após sequência de 3+ derrotas, 3 vezes' },
  PICO_DE_ADRENALINA:       { event: 'wonHotStreak',             required: 5,  desc: 'Vencer 5 partidas estando em HOT_STREAK+' },
  BASE_SOLIDA:              { event: 'consecutivePositiveForm',  required: 8,  desc: 'Manter forma positiva em 8 partidas consecutivas' },
  BOLA_DE_NEVE:             { event: 'winStreakOf5',             required: 2,  desc: 'Conseguir 2 win streaks de 5+ vitórias' },
  MAQUINA:                  { event: 'launchesNoFail',           required: 10, desc: '10 lançamentos consecutivos sem CRITICAL_FAIL' },
  INQUEBRAVEL:              { event: 'wonAfterLoss',             required: 5,  desc: 'Vencer 5 partidas imediatamente após uma derrota' },
  ESPECIALISTA_EM_SERIE:    { event: 'wonSameOpponent',          required: 3,  desc: 'Vencer 3x o mesmo adversário na mesma temporada' },
  VOLATILIDADE_CALCULADA:   { event: 'wonFromExtremes',          required: 3,  desc: 'Vencer 3 partidas partindo de forma extrema (ON_FIRE ou ROCK_BOTTOM)' },
};

// ── EVENTOS TRAUMÁTICOS (2ª negativa) ────────────────────────
//
// Uma 2ª negativa pode surgir de eventos graves de carreira.
// É sempre CICATRIZ — marcas permanentes.
// Máximo absoluto: 2 negativas por jogador.

export const TRAUMA_EVENTS = {
  ROCK_BOTTOM_3X:       { chance: 0.40, desc: 'ROCK_BOTTOM 3 vezes na carreira', triggerCount: 3 },
  FINALS_LOST_3X:       { chance: 0.35, desc: 'Perder 3 finais consecutivas',    triggerCount: 3 },
  RIVALRY_CRUSHED:      { chance: 0.25, desc: 'Rivalidade perdida definitivamente (0–5 H2H)', triggerCount: 1 },
};

// ── MARCOS DE DESBLOQUEIO DE SLOTS POSITIVOS ─────────────────
//
// Slots adicionais de traits positivas são ganhos por marcos de carreira.
// O traitDNA define o TETO — o marco é o que abre o slot.

export const CAREER_MILESTONES = {
  FIRST_TITLE:       { slot: 2, pool: 'ALL',        desc: '1ª vitória em torneio' },
  COMEBACK_02:       { slot: 3, pool: 'ADVERSIDADE', desc: '1ª virada de 0-2 na carreira' },
  RIVALRY_FORMED:    { slot: 4, pool: 'RIVALIDADE',  desc: 'Rivalidade estabelecida (3+ confrontos)' },
  REACHED_PEAK:      { slot: 5, pool: 'ALL',         desc: 'Atingir o pico de potencial' },
};

// Pools por categoria de milestone
export const MILESTONE_POOLS = {
  ALL: [
    'SANGUE_FRIO','FECHADOR','MENTALIDADE_DE_SET','INSTINTO_DO_CAMPEONATO',
    'VIRADISTA','FENIX','AVALANCHE','IMPLACAVEL','MAO_FIRME','MAQUINA',
    'CAMALEAO','ESPECIALISTA_MATA_MATA','REI_DOS_GRUPOS','BASE_SOLIDA',
    'BOLA_DE_NEVE','INQUEBRAVEL','RECUPERACAO_RAPIDA',
  ],
  ADVERSIDADE: [
    'VIRADISTA','FENIX','LEAO_ENCURRALADO','GUERRA_DE_ATRITO',
    'GLADIADOR','INQUEBRAVEL','RECUPERACAO_RAPIDA',
  ],
  RIVALIDADE: [
    'MEMORIA_FOTOGRAFICA','PSICOLOGICO','ESPECIALISTA_EM_REVANCHE',
    'RIVAL_ETERNO','CACADOR_DE_GIGANTES',
  ],
};

// ── GERAÇÃO DE TRAITS INICIAIS ────────────────────────────────

// Pool completo de IDs positivos disponíveis para o sorteio inicial
const POSITIVE_POOL = [
  'SANGUE_FRIO','FECHADOR','MENTALIDADE_DE_SET','PRESSAO_ABSOLUTA',
  'INSTINTO_DO_CAMPEONATO','VIRADISTA','FENIX','LEAO_ENCURRALADO',
  'GUERRA_DE_ATRITO','GLADIADOR','AVALANCHE','IMPLACAVEL',
  'REI_DA_ARENA_DOMINANCIA','SANGUE_QUENTE','DESTRUIDOR_DE_MORAL',
  'MAO_FIRME','PERFECCIONISTA','PISTOLEIRO','CALCULISTA','CRONOMETRO',
  'DESTRUIDOR_DE_BURST','ARMADURA_VIVA','ETERNO_GIRO','CONTRA_GOLPE',
  'VENENO_LENTO','RELAMPAGO','ULTRAMARATONISTA','RELOGIO_BIOLOGICO',
  'ESPECIALISTA_TIEBREAK','CAMALEAO','REI_DA_SELVA','EXPLORADOR',
  'SANGUE_DE_CAMPEON','ESPECIALISTA_MATA_MATA','REI_DOS_GRUPOS',
  'CACADOR_DE_GIGANTES','MEMORIA_FOTOGRAFICA','SUPERPRODIGIO',
  'BASE_SOLIDA','BOLA_DE_NEVE','MAQUINA','INQUEBRAVEL',
  'ESPECIALISTA_EM_SERIE','RECUPERACAO_RAPIDA','PICO_DE_ADRENALINA',
];

// Pool de IDs que possuem variante NEG definida
const NEGATIVE_POOL = [
  'SANGUE_FRIO','FECHADOR','MENTALIDADE_DE_SET','PRESSAO_ABSOLUTA',
  'INSTINTO_DO_CAMPEONATO','VIRADISTA','FENIX','LEAO_ENCURRALADO',
  'GUERRA_DE_ATRITO','GLADIADOR','AVALANCHE','IMPLACAVEL',
  'REI_DA_ARENA_DOMINANCIA','SANGUE_QUENTE','DESTRUIDOR_DE_MORAL',
  'MAO_FIRME','PERFECCIONISTA','PISTOLEIRO','CALCULISTA','CRONOMETRO',
  'DESTRUIDOR_DE_BURST','ARMADURA_VIVA','ETERNO_GIRO','RELAMPAGO',
  'ULTRAMARATONISTA','RELOGIO_BIOLOGICO','CAMALEAO','REI_DA_SELVA',
  'SANGUE_DE_CAMPEON','ESPECIALISTA_MATA_MATA','REI_DOS_GRUPOS',
  'CACADOR_DE_GIGANTES','MEMORIA_FOTOGRAFICA','VETERANO_ETERNO',
  'INERCIAL','RECUPERACAO_RAPIDA','PICO_DE_ADRENALINA','BASE_SOLIDA',
  'BOLA_DE_NEVE','MAQUINA',
];

/**
 * Determina o tier de uma trait positiva baseado no traitDNA e potentialCategory.
 */
function rollPositiveTier(traitDNA, potentialCategory) {
  const profile = getTraitDNAProfile(traitDNA);
  if (profile.maxTier === 'COM') return 'COM';

  const isTopCat = ['GERACIONAL','LENDA','ELITE'].includes(potentialCategory);

  if (profile.maxTier === 'LEN' && isTopCat && Math.random() < 0.15) return 'LEN';
  if (profile.maxTier === 'LEN' && Math.random() < 0.25) return 'RAR';
  if (profile.maxTier === 'RAR' && isTopCat && Math.random() < 0.30) return 'RAR';
  if (profile.maxTier === 'RAR' && Math.random() < 0.15) return 'RAR';
  return 'COM';
}

/**
 * Gera o par inicial de traits (1 positiva + 1 negativa).
 * Garante que positiva e negativa são de domínios diferentes
 * para criar contradições narrativas interessantes.
 *
 * @param {string} potentialCategory - categoria do jogador
 * @param {number} traitDNA - valor 0–100
 * @returns {{ traits: Array, negType: string, shadowProgress: object }}
 */
export function generateInitialTraits(potentialCategory, traitDNA) {
  // 1. Selecionar positiva
  const posId   = randomFromArray(POSITIVE_POOL);
  const posTier = rollPositiveTier(traitDNA, potentialCategory);

  // 2. Selecionar negativa de domínio diferente
  const negPool = NEGATIVE_POOL.filter(id => id !== posId);
  const negId   = randomFromArray(negPool);

  // 3. Classificar negativa
  const negType = classifyNegative(potentialCategory);

  // 4. Inicializar progresso de sombra (só importa se for SOMBRA)
  const milestone = SHADOW_MILESTONES[negId];
  const shadowProgress = {};
  if (negType === NEG_TYPES.SOMBRA && milestone) {
    shadowProgress[milestone.event] = 0;
  }

  return {
    traits: [
      { id: posId, tier: posTier },
      { id: negId, tier: 'NEG' },
    ],
    negTypes: { [negId]: negType },
    shadowProgress,
  };
}

// ── INFERÊNCIA PARA JOGADORES EXISTENTES ─────────────────────

/**
 * Opção A: infere o traitDNA de um jogador existente
 * com base em suas traits e categoria de potencial.
 *
 * @param {Array}  traits           - array de {id, tier}
 * @param {string} potentialCategory
 * @returns {number} traitDNA estimado (0–100)
 */
export function inferTraitDNA(traits = [], potentialCategory = 'COMUM') {
  const positives  = traits.filter(t => t.tier !== 'NEG');
  const posCount   = positives.length;
  const hasLEN     = positives.some(t => t.tier === 'LEN');
  const hasRAR     = positives.some(t => t.tier === 'RAR');

  // Faixa base pelo número e tier das positivas
  let min, max;
  if (posCount >= 4 || (posCount >= 3 && hasLEN)) {
    [min, max] = hasLEN ? [83, 94] : [75, 90];
  } else if (posCount === 3 && hasRAR) {
    [min, max] = [65, 80];
  } else if (posCount === 3) {
    [min, max] = [51, 70];
  } else if (posCount === 2 && hasRAR) {
    [min, max] = [48, 65];
  } else if (posCount === 2) {
    [min, max] = [26, 48];
  } else {
    [min, max] = [5, 25];
  }

  // Ajuste pelo potencial
  const potBonus = {
    GERACIONAL:     10,
    LENDA:           6,
    ELITE:           3,
    CAMPEAO:         0,
    COMUM:          -3,
    ABAIXO_DA_MEDIA:-6,
  };
  const bonus = potBonus[potentialCategory] ?? 0;

  // Valor central com ruído pequeno (±5)
  const center = Math.floor((min + max) / 2) + bonus;
  const noise  = Math.floor(Math.random() * 11) - 5;
  return Math.max(0, Math.min(100, center + noise));
}

/**
 * Inicializa o shadowProgress para um jogador existente.
 * Lê o negTypes e cria contadores zerados para os eventos corretos.
 */
export function initializeShadowProgress(traits = [], negTypes = {}) {
  const shadowProgress = {};
  for (const t of traits) {
    if (t.tier !== 'NEG') continue;
    if (negTypes[t.id] !== NEG_TYPES.SOMBRA) continue;
    const milestone = SHADOW_MILESTONES[t.id];
    if (milestone) shadowProgress[milestone.event] = 0;
  }
  return shadowProgress;
}

// ── PROGRESSÃO DE SOMBRA ─────────────────────────────────────

/**
 * Registra um evento de carreira no progresso de sombra.
 * Se o milestone for atingido, converte a SOMBRA → COM.
 *
 * @param {object} playerTraitData - { traits, negTypes, shadowProgress, traitDNA }
 * @param {string} eventKey        - chave do evento (ex: 'closedMatchPoints')
 * @param {number} amount          - quantidade a incrementar (padrão 1)
 * @returns {{ updated: boolean, converted: string|null, playerTraitData }}
 */
export function registerShadowEvent(playerTraitData, eventKey, amount = 1) {
  const { traits = [], negTypes = {}, shadowProgress = {}, traitDNA = 50 } = playerTraitData;

  if (!(eventKey in shadowProgress)) {
    return { updated: false, converted: null, playerTraitData };
  }

  shadowProgress[eventKey] = (shadowProgress[eventKey] || 0) + amount;

  // Verificar se alguma SOMBRA foi superada
  let converted = null;
  for (const t of traits) {
    if (t.tier !== 'NEG') continue;
    if (negTypes[t.id] !== NEG_TYPES.SOMBRA) continue;

    const milestone = SHADOW_MILESTONES[t.id];
    if (!milestone || milestone.event !== eventKey) continue;

    if (shadowProgress[eventKey] >= milestone.required) {
      // CONVERSÃO: NEG → COM
      t.tier = 'COM';
      delete negTypes[t.id];
      delete shadowProgress[eventKey];
      converted = t.id;
      console.log(`✨ SOMBRA SUPERADA: ${t.id} convertida para COM`);
      break;
    }
  }

  return { updated: true, converted, playerTraitData: { ...playerTraitData, traits, negTypes, shadowProgress } };
}

// ── TRAUMA (2ª negativa) ─────────────────────────────────────

/**
 * Testa se um evento traumático gera uma 2ª negativa.
 * Retorna a nova trait ou null.
 *
 * @param {object} playerTraitData - { traits, negTypes, ... }
 * @param {string} traumaType      - chave de TRAUMA_EVENTS
 * @returns {{ newTrait: object|null }}
 */
export function checkTraumaEvent(playerTraitData, traumaType) {
  const { traits = [], negTypes = {} } = playerTraitData;

  // Já tem 2 negativas — não adiciona mais
  const negCount = traits.filter(t => t.tier === 'NEG').length;
  if (negCount >= 2) return { newTrait: null };

  const trauma = TRAUMA_EVENTS[traumaType];
  if (!trauma) return { newTrait: null };

  if (Math.random() > trauma.chance) return { newTrait: null };

  // Escolher negativa de um pool que ainda não está no jogador
  const existingIds = new Set(traits.map(t => t.id));
  const available   = NEGATIVE_POOL.filter(id => !existingIds.has(id));
  if (available.length === 0) return { newTrait: null };

  const newNegId = randomFromArray(available);
  const newTrait = { id: newNegId, tier: 'NEG' };

  // Trauma é sempre CICATRIZ
  negTypes[newNegId] = NEG_TYPES.CICATRIZ;

  console.log(`💔 TRAUMA: ${traumaType} → ${newNegId} adicionada como CICATRIZ`);
  return { newTrait };
}

// ── HELPERS ──────────────────────────────────────────────────

function randomFromArray(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Hash numérico 0–1 de uma string (determinístico) */
export function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) / 2147483647;
}

/**
 * Retorna os slots de traits positivas já utilizados por um jogador.
 */
export function countPositiveSlots(traits = []) {
  return traits.filter(t => t.tier !== 'NEG').length;
}

/**
 * Verifica se o jogador pode receber mais uma trait positiva.
 */
export function canReceivePositiveTrait(traits = [], traitDNA = 0) {
  const profile = getTraitDNAProfile(traitDNA);
  const used    = countPositiveSlots(traits);
  return used < profile.maxPositiveSlots;
}
