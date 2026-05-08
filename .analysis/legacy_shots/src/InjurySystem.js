/**
 * InjurySystem.js
 * ─────────────────────────────────────────────────────────────────
 * Sistema completo de lesões para o Universo.
 *
 * Unidade de tempo: SLOT DE TORNEIO (41 por temporada).
 * ~3-4 slots = 1 mês real.
 *
 * Estrutura no jogador:
 *   player.injury = null | {
 *     type,            // 'KNEE' | 'ANKLE' | ...
 *     grade,           // 1 | 2 | 3
 *     slotsRemaining,  // slots até estar apto (0 = está jogando lesionado grade-1)
 *     penalties,       // { velocidade: -12, ... } — activos durante o jogo
 *     isPlayingThrough,// grade-1 e optou por jogar
 *     comingBackSlots, // slots de debuff pós-retorno
 *   }
 *   player.injuryHistory = [ { type, grade, slot, tournament, slotsOut } ]
 *   player.physicalCondition = 0-100 (condição física atual)
 */

// ─────────────────────────────────────────────────────────────────
// TIPOS DE LESÃO
// ─────────────────────────────────────────────────────────────────
export const INJURY_TYPES = {
  CHRONIC_CONDITION: {
    label: 'Condicao Cronica',
    bodyPart: 'Sistema Musculoesqueletico',
    icon: '🩺',
    penalties: { resistencia: -16, velocidade: -10, regularidade: -8 },
    styleRisk: {},
    surfaceRisk: {},
    desc: 'Problema cronico que exige longa interrupcao e retorno incerto',
  },
  SYSTEMIC_ILLNESS: {
    label: 'Doenca Sistemica',
    bodyPart: 'Sistema Geral',
    icon: '⚕️',
    penalties: { resistencia: -22, mentalidade: -10, regularidade: -12, velocidade: -8 },
    styleRisk: {},
    surfaceRisk: {},
    desc: 'Condicao sistemica severa que afasta o atleta por tempo indeterminado',
  },
  WRIST: {
    label: 'Pulso',
    bodyPart: 'Membro Superior',
    icon: '🖐',
    penalties: { fhPotencia: -14, bhPotencia: -10, srv1Vel: -8 },
    styleRisk: { AGG_BASELINER: 1.3, TAKEALLRISK: 1.4 },
    surfaceRisk: { HARD: 1.2 },
    desc: 'Lesão por impacto repetitivo no pulso',
  },
  ELBOW: {
    label: 'Cotovelo',
    bodyPart: 'Membro Superior',
    icon: '💪',
    penalties: { bhPotencia: -14, srv1Vel: -10, srv2Efeito: -12 },
    styleRisk: { BIG_SERVER: 1.4, AGG_BASELINER: 1.2, TAKEALLRISK: 1.3 },
    surfaceRisk: { HARD: 1.15 },
    desc: 'Tendinite / tennis elbow',
  },
  SHOULDER: {
    label: 'Ombro',
    bodyPart: 'Membro Superior',
    icon: '🏋',
    penalties: { srv1Vel: -16, srv1Prec: -14, volley: -10 },
    styleRisk: { BIG_SERVER: 1.5, SRV_VOL: 1.35 },
    surfaceRisk: {},
    desc: 'Lesão no manguito rotador',
  },
  BACK: {
    label: 'Lombar',
    bodyPart: 'Tronco',
    icon: '🧍',
    penalties: { velocidade: -10, resistencia: -12, agilidadeLateral: -10 },
    styleRisk: { CTR_PUNCHER: 1.25, RETRIEVER: 1.2 },
    surfaceRisk: { HARD: 1.1 },
    desc: 'Dores lombares / stress na coluna',
  },
  KNEE: {
    label: 'Joelho',
    bodyPart: 'Membro Inferior',
    icon: '🦵',
    penalties: { velocidade: -14, explosividade: -12, agilidadeLateral: -14 },
    styleRisk: { AGG_BASELINER: 1.2, ALL_COURT: 1.15 },
    surfaceRisk: { HARD: 1.3 },
    desc: 'Lesão ligamentar ou meniscal',
  },
  ANKLE: {
    label: 'Tornozelo',
    bodyPart: 'Membro Inferior',
    icon: '🦶',
    penalties: { velocidade: -12, agilidadeLateral: -16, alcance: -8 },
    styleRisk: { RETRIEVER: 1.2, ALL_COURT: 1.1 },
    surfaceRisk: { GRASS: 1.4, CLAY: 0.85 },
    desc: 'Entorse / torção',
  },
  HAMSTRING: {
    label: 'Posterior da Coxa',
    bodyPart: 'Membro Inferior',
    icon: '🏃',
    penalties: { velocidade: -16, explosividade: -14, alcance: -10 },
    styleRisk: { AGG_BASELINER: 1.2, TAKEALLRISK: 1.3 },
    surfaceRisk: { HARD: 1.15, GRASS: 1.2 },
    desc: 'Distensão muscular posterior',
  },
  ABDOMINAL: {
    label: 'Abdominal',
    bodyPart: 'Tronco',
    icon: '⚡',
    penalties: { srv1Vel: -12, resistencia: -10, explosividade: -8 },
    styleRisk: { BIG_SERVER: 1.3, AGG_BASELINER: 1.15 },
    surfaceRisk: {},
    desc: 'Lesão muscular abdominal / oblíquo',
  },
};

// ─────────────────────────────────────────────────────────────────
// GRAUS DE GRAVIDADE
// ─────────────────────────────────────────────────────────────────
export const INJURY_GRADES = {
  1: { label: 'Leve',     slotsMin: 0,  slotsMax: 1,  comingBackSlots: 0, penaltyMult: 0.7, description: 'Pode jogar com restrições' },
  2: { label: 'Moderado', slotsMin: 2,  slotsMax: 4,  comingBackSlots: 1, penaltyMult: 1.0, description: 'Afastamento necessário' },
  3: { label: 'Grave',    slotsMin: 6,  slotsMax: 12, comingBackSlots: 2, penaltyMult: 1.0, description: 'Afastamento longo' },
  4: { label: 'Cirurgia', slotsMin: 14, slotsMax: 30, comingBackSlots: 4, penaltyMult: 1.0, description: 'Cirurgia — retorno em meses',
       requiresSurgery: true },
  5: { label: 'Crise Medica', slotsMin: 24, slotsMax: 46, comingBackSlots: 6, penaltyMult: 1.15, description: 'Afastamento muito longo por crise medica severa' },
  6: { label: 'Saude Critica', slotsMin: 48, slotsMax: 92, comingBackSlots: 10, penaltyMult: 1.25, description: 'Saude critica com retorno indefinido e risco de fim de carreira' },
};

// Pesos de gravidade: 60% leve, 30% moderado, 7% grave, 3% cirurgia
const GRADE_WEIGHTS = [
  { grade: 1, weight: 60 },
  { grade: 2, weight: 30 },
  { grade: 3, weight:  7 },
  { grade: 4, weight:  3 },
];

// ─────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────
function rng(min, max) {
  return min + Math.random() * (max - min);
}

function pickGrade() {
  const roll = Math.random() * 100;
  let acc = 0;
  for (const { grade, weight } of GRADE_WEIGHTS) {
    acc += weight;
    if (roll < acc) return grade;
  }
  return 1;
}

function pickInjuryType(player, tournament) {
  const style = player.styleId ?? '';
  const surface = tournament?.surface ?? 'HARD';

  // Peso base para cada tipo
  const weights = Object.entries(INJURY_TYPES).map(([key, def]) => {
    let w = 1.0;
    w *= (def.styleRisk?.[style] ?? 1.0);
    w *= (def.surfaceRisk?.[surface] ?? 1.0);
    return { key, w };
  });

  const total = weights.reduce((s, x) => s + x.w, 0);
  let roll = Math.random() * total;
  for (const { key, w } of weights) {
    roll -= w;
    if (roll <= 0) return key;
  }
  return 'KNEE';
}

function slotsForGrade(grade) {
  const { slotsMin, slotsMax } = INJURY_GRADES[grade];
  return Math.round(rng(slotsMin, slotsMax));
}

/** Penalidades finais aplicadas (multiplicadas pelo grau) */
export function computePenalties(injuryType, grade, isComingBack = false) {
  const def = INJURY_TYPES[injuryType];
  if (!def) return {};
  const mult = isComingBack ? 0.5 : INJURY_GRADES[grade].penaltyMult;
  const penalties = {};
  for (const [attr, val] of Object.entries(def.penalties)) {
    penalties[attr] = Math.round(val * mult);
  }
  return penalties;
}

// ─────────────────────────────────────────────────────────────────
// CONDIÇÃO FÍSICA
// ─────────────────────────────────────────────────────────────────

/** Inicializa physicalCondition se não existir */
export function ensurePhysicalCondition(player) {
  if (player.physicalCondition !== undefined) return player;
  const age = player.age ?? 25;
  const res = player.attrs?.resistencia ?? 70;

  // Base por idade: pico ~24, queda progressiva
  let base = 88;
  if (age <= 20) base = 82;
  else if (age <= 24) base = 90;
  else if (age <= 28) base = 87;
  else if (age <= 31) base = 80;
  else if (age <= 33) base = 72;
  else base = 62;

  // Resistência ajusta base
  base += (res - 70) * 0.12;
  base = Math.min(98, Math.max(45, base));

  return { ...player, physicalCondition: Math.round(base), injuryHistory: player.injuryHistory ?? [] };
}

/** Decai condição física após cada torneio jogado */
export function decayPhysicalCondition(player, tournament) {
  const p = ensurePhysicalCondition(player);
  const age = p.age ?? 25;
  const res = p.attrs?.resistencia ?? 70;
  const bestOf = tournament?.bestOf ?? 3;

  // Decay base por torneio
  let decay = 1.5;
  if (tournament?.isSlam)    decay += 2.5;
  if (tournament?.isMasters) decay += 1.5;
  if (bestOf === 5)          decay += 1.0;
  if (age >= 32)             decay *= 1.4;
  if (age >= 35)             decay *= 1.6;
  decay *= (1.3 - (res / 100) * 0.6); // alta resistência = menor decay

  const newCondition = Math.max(20, (p.physicalCondition ?? 85) - decay);
  return { ...p, physicalCondition: newCondition };
}

/** Recupera condição física por slot de descanso */
export function recoverPhysicalCondition(player) {
  const p = ensurePhysicalCondition(player);
  const age = p.age ?? 25;
  const res = p.attrs?.resistencia ?? 70;

  let recovery = 4.0;
  if (age >= 33) recovery *= 0.7;
  if (age >= 36) recovery *= 0.55;
  recovery *= (0.7 + (res / 100) * 0.6);

  const newCondition = Math.min(96, (p.physicalCondition ?? 85) + recovery);
  return { ...p, physicalCondition: newCondition };
}

// ─────────────────────────────────────────────────────────────────
// ROLL PRÉ-TORNEIO
// ─────────────────────────────────────────────────────────────────

/**
 * Verifica se um jogador fica lesionado antes de entrar no torneio.
 * Retorna { injured: bool, injury: InjuryRecord | null }
 */
export function rollPreTournamentInjury(player, tournament, recentTournaments = []) {
  const p = ensurePhysicalCondition(player);

  // Já está lesionado (grade 2/3) — não rola novo
  if (p.injury && p.injury.slotsRemaining > 0) {
    return { injured: true, injury: p.injury };
  }

  const age = p.age ?? 25;
  const res = p.attrs?.resistencia ?? 70;
  const cond = p.physicalCondition ?? 85;
  const style = p.styleId ?? '';

  // ── Chance base: 2.5% por torneio ────────────────────────────
  let chance = 0.025;

  // Idade
  if (age >= 34) chance *= 2.2;
  else if (age >= 32) chance *= 1.7;
  else if (age >= 29) chance *= 1.3;
  else if (age <= 22) chance *= 0.85;

  // Resistência baixa
  if (res < 55) chance *= 1.5;
  else if (res < 65) chance *= 1.2;

  // Condição física
  if (cond < 50) chance *= 2.0;
  else if (cond < 65) chance *= 1.5;
  else if (cond < 75) chance *= 1.2;
  else if (cond > 88) chance *= 0.75;

  // Hard courts consecutivos: KNEE/ANKLE risk
  const recentHard = recentTournaments.filter(t => t.surface === 'HARD').length;
  if (recentHard >= 3) chance *= 1.2;
  if (recentHard >= 5) chance *= 1.3;

  // Torneios obrigatórios consecutivos (M1000 + GS)
  const recentMandatory = recentTournaments.filter(t => t.isMandatory || t.isSlam).length;
  if (recentMandatory >= 2) chance *= 1.2;
  if (recentMandatory >= 3) chance *= 1.35;

  // Estilos físicamente mais exigentes
  if (['AGG_BASELINER', 'TAKEALLRISK'].includes(style)) chance *= 1.15;

  // Grade-1 ativa (jogou lesionado) → agravamento
  if (p.injury && p.injury.grade === 1 && p.injury.isPlayingThrough) chance *= 1.6;

  // ── Recidiva — mesmo tipo de lesão no histórico ───────────────
  // Cada ocorrência prévia do mesmo tipo aumenta o risco progressivamente.
  // Acessado depois de pickInjuryType para retroalimentar o risco da parte afetada.
  // Aqui usamos o tipo mais frequente no histórico recente como proxy.
  const hist = p.injuryHistory ?? [];
  if (hist.length > 0) {
    // Conta lesões por parte do corpo nas últimas 2 temporadas
    const recentHist = hist.filter(h => {
      if (!h.originSlot) return true;               // sem data: inclui
      const slotAge = (tournament?.weekIndex ?? 0) - h.originSlot;
      return slotAge < 82;                           // ~2 temporadas
    });
    // Agrupa por tipo
    const typeCount = {};
    for (const h of recentHist) {
      typeCount[h.type] = (typeCount[h.type] ?? 0) + 1;
    }
    const maxRepeat = Math.max(0, ...Object.values(typeCount));
    if (maxRepeat >= 3)      chance *= 2.2;  // crônico confirmado
    else if (maxRepeat >= 2) chance *= 1.5;  // recidiva
    else if (maxRepeat >= 1) chance *= 1.2;  // histórico relevante
  }

  // Cap final: 18%
  chance = Math.min(0.18, chance);

  if (Math.random() > chance) {
    return { injured: false, injury: p.injury ?? null };
  }

  // ── Gerou lesão ──────────────────────────────────────────────
  const grade = pickGrade();
  const type  = pickInjuryType(p, tournament);
  const slots = slotsForGrade(grade);
  const penalties = computePenalties(type, grade);
  const gradeDef  = INJURY_GRADES[grade];

  const injury = {
    type,
    grade,
    slotsRemaining: grade === 1 ? 0 : slots,
    _totalSlots: slots,  // preservado para histórico
    penalties,
    isPlayingThrough: false,
    comingBackSlots: 0,
    requiresSurgery: gradeDef.requiresSurgery ?? false,
    originSlot: tournament?.weekIndex ?? 0,
    originTournament: tournament?.name ?? '?',
    originSeason: tournament?.season ?? null,
  };

  return { injured: true, injury, isNew: true };
}

// ─────────────────────────────────────────────────────────────────
// INTELIGÊNCIA DE RETIRADA (AI)
// ─────────────────────────────────────────────────────────────────

/**
 * Decide se o jogador deve se retirar do torneio com base na lesão.
 * Retorna { withdraw: bool, reason: string }
 *
 * Grade 2/3: sempre retira.
 * Grade 1: avalia custo-benefício.
 */
export function shouldWithdraw(player, tournament) {
  const p = ensurePhysicalCondition(player);
  const inj = p.injury;
  if (!inj) return { withdraw: false };

  // Grade 2 ou 3 → fora obrigatoriamente
  if (inj.grade >= 2 && inj.slotsRemaining > 0) {
    return { withdraw: true, reason: `Lesão grau ${inj.grade} — afastamento de ${inj.slotsRemaining} torneio(s)` };
  }

  // Grade 1 — lógica de custo-benefício
  if (inj.grade === 1) {
    const tourWeight = getTournamentWeight(tournament);
    const cond = p.physicalCondition ?? 85;
    const pos = p.rankPosition ?? 50;
    const age = p.age ?? 25;

    // Score de incentivo para jogar (maior = mais tende a jogar)
    let playScore = 0;

    // Torneios grandes puxam para jogar
    if (tournament?.isSlam)    playScore += 40;
    if (tournament?.isMasters) playScore += 25;
    if (tourWeight === 'ATP_500') playScore += 12;

    // Ranking: top players tendem a jogar (pontos de ranking mais valiosos)
    if (pos <= 5)  playScore += 20;
    if (pos <= 15) playScore += 10;
    if (pos > 50)  playScore -= 10; // jogadores menos rankeados poupam mais

    // Condição física: se já desgastado, mais cuidado
    if (cond < 60) playScore -= 30;
    if (cond < 70) playScore -= 15;

    // Jogadores jovens se arriscam mais
    if (age <= 24) playScore += 10;
    if (age >= 33) playScore -= 15;

    // Julgamento
    const withdraw = playScore < 20;
    const reason = withdraw
      ? `Lesão leve — optou por poupar para o próximo torneio`
      : `Lesão leve — decidiu jogar (${tournament?.name})`;
    return { withdraw, reason };
  }

  return { withdraw: false };
}

function getTournamentWeight(tournament) {
  if (!tournament) return 'ATP_250';
  if (tournament.isSlam)    return 'GRAND_SLAM';
  if (tournament.isMasters) return 'MASTERS_1000';
  return tournament.category ?? 'ATP_250';
}

// ─────────────────────────────────────────────────────────────────
// TICK — avança um slot de torneio
// ─────────────────────────────────────────────────────────────────

/**
 * Chamado a cada torneio avançado (mesmo que o jogador não jogue).
 * Atualiza slotsRemaining, comingBackSlots e remove lesão quando curada.
 */
export function tickInjury(player) {
  const p = { ...player };
  if (!p.injury) return p;

  const inj = { ...p.injury };

  if (inj.slotsRemaining > 0) {
    inj.slotsRemaining--;
    if (inj.slotsRemaining === 0) {
      // Acabou o afastamento — entra no período de retorno
      inj.comingBackSlots = INJURY_GRADES[inj.grade]?.comingBackSlots ?? 0;
      inj.isPlayingThrough = false;
    }
    p.injury = inj;
    return p;
  }

  // Já jogável — decrementa período de retorno
  if (inj.comingBackSlots > 0) {
    inj.comingBackSlots--;
    inj.penalties = computePenalties(inj.type, inj.grade, true); // penalidade reduzida
    p.injury = inj;
    return p;
  }

  // Curado completamente
  p.injuryHistory = [
    ...(p.injuryHistory ?? []),
    {
      type: inj.type,
      grade: inj.grade,
      originTournament: inj.originTournament ?? '?',
      originSlot: inj.originSlot ?? 0,
      slotsOut: inj._totalSlots ?? INJURY_GRADES[inj.grade]?.slotsMin ?? 1,
      playedThrough: inj.isPlayingThrough === true,
      season: inj.originSeason ?? null,
    },
  ];
  p.injury = null;
  return p;
}

// ─────────────────────────────────────────────────────────────────
// APLICAR PENALIDADES AOS ATRIBUTOS (cópia, não mutação)
// ─────────────────────────────────────────────────────────────────

/**
 * Retorna player com attrs penalizados pela lesão.
 * Não muta o original.
 */
export function applyInjuryToPlayer(player) {
  const p = ensurePhysicalCondition(player);
  const inj = p.injury;
  if (!inj) return p;

  // Só aplica se está jogando (slotsRemaining === 0 mas ainda tem lesão ativa)
  const canPlay = inj.slotsRemaining === 0;
  if (!canPlay) return p;

  const penalties = inj.penalties ?? {};
  if (Object.keys(penalties).length === 0) return p;

  const newAttrs = { ...p.attrs };
  for (const [attr, val] of Object.entries(penalties)) {
    if (newAttrs[attr] !== undefined) {
      // Piso 28 — lesão não pode destruir um atributo de elite permanentemente
      newAttrs[attr] = Math.max(28, newAttrs[attr] + val);
    }
  }
  return { ...p, attrs: newAttrs };
}

// ─────────────────────────────────────────────────────────────────
// GERAR EVENTOS DE LESÃO (para a timeline do universo)
// ─────────────────────────────────────────────────────────────────

export function buildInjuryEvent(player, injury, tournament, type = 'injury') {
  const def = INJURY_TYPES[injury.type] ?? {};
  const gradeLabel = INJURY_GRADES[injury.grade]?.label ?? '?';
  const pos = player.rankPosition ?? '?';

  if (type === 'injury') {
    const suffix = injury.grade >= 2
      ? ` — ausência de ${injury.slotsRemaining} torneio(s)`
      : ` — pode jogar com restrições`;
    return {
      type: 'injury',
      text: `${player.name} sofre lesão no ${def.label ?? injury.type} [${gradeLabel}]${suffix}`,
      playerId: player.id,
      playerName: player.name,
      injury: { ...injury },
      tournamentId: tournament?.id,
      year: null, // preenchido no chamador
    };
  }

  if (type === 'return') {
    return {
      type: 'injury_return',
      text: `${player.name} retorna ao circuito após lesão no ${def.label ?? injury.type}`,
      playerId: player.id,
      playerName: player.name,
    };
  }

  if (type === 'withdraw') {
    return {
      type: 'injury_wd',
      text: `${player.name} (#${pos}) se retira de ${tournament?.name} — ${def.label ?? injury.type} (${gradeLabel})`,
      playerId: player.id,
      playerName: player.name,
      tournamentId: tournament?.id,
    };
  }

  return null;
}

// ─────────────────────────────────────────────────────────────────
// LABEL / DISPLAY HELPERS
// ─────────────────────────────────────────────────────────────────

export function injuryStatusLabel(player) {
  const p = ensurePhysicalCondition(player);
  if (!p.injury) return null;
  const inj = p.injury;
  const def = INJURY_TYPES[inj.type] ?? {};
  const gl = INJURY_GRADES[inj.grade]?.label ?? '?';

  if (inj.slotsRemaining > 0) {
    return `${def.label} (${gl}) — fora por ${inj.slotsRemaining} torneio(s)`;
  }
  if (inj.comingBackSlots > 0) {
    return `${def.label} (retornando) — debuff leve por ${inj.comingBackSlots} torneio(s)`;
  }
  return `${def.label} (leve) — jogando com restrições`;
}

export function physicalConditionLabel(cond) {
  if (cond >= 90) return { label: 'Ótima', color: '#4CAF50' };
  if (cond >= 78) return { label: 'Boa', color: '#8BC34A' };
  if (cond >= 65) return { label: 'Regular', color: '#FFC107' };
  if (cond >= 50) return { label: 'Baixa', color: '#FF9800' };
  return { label: 'Crítica', color: '#F44336' };
}

// ─────────────────────────────────────────────────────────────────
// LESÕES EM CAMPO — MTO / RETIREMENT SYSTEM
// ─────────────────────────────────────────────────────────────────

/** Severidades de lesão em campo (distintas dos grades pré-torneio) */
export const IN_MATCH_SEVERITY = {
  MINOR:    { label: 'Leve',    canContinueChance: 0.97, penaltyMult: 0.25, durationSecs: 2.5  },
  MODERATE: { label: 'Moderada', canContinueChance: 0.80, penaltyMult: 0.55, durationSecs: 5.5  },
  SEVERE:   { label: 'Grave',   canContinueChance: 0.45, penaltyMult: 0.80, durationSecs: 8.0  },
};

/** Tipos de lesão que podem ocorrer em campo (subset dos INJURY_TYPES) */
const IN_MATCH_INJURY_POOL = ['ANKLE', 'HAMSTRING', 'KNEE', 'ABDOMINAL', 'BACK', 'WRIST'];

/** Chance de cãibra severa (lesão temporária, não entra no histórico) */
const CRAMP_TYPE = {
  type: 'CRAMP',
  label: 'Cãibra',
  icon: '⚡',
  penalties: { velocidade: -18, explosividade: -15 },
  isTemporary: true,
};

/**
 * Rola chance de lesão em campo após um ponto.
 * Chamado em checkInMatchInjury() no game.js.
 *
 * @returns {{ triggered: bool, type: string, severity: string } | null}
 */
export function rollInMatchInjury(player, gs) {
  const stamina   = player.stamina ?? 1.0;
  const totalPts  = gs.totalPoints ?? 0;
  const rally     = gs.rally ?? 0;
  const surface   = gs.courtMeta?.surface ?? 'HARD';
  const totalSets = (gs.players[0]?.sets ?? 0) + (gs.players[1]?.sets ?? 0);

  // Já passou por MTO nesta partida → chance de recidiva maior
  const hadMTO = player._hadInMatchMTO ?? false;

  // Chance base por ponto (~0.045% — rara mas possível em situações extremas)
  let chance = 0.00045;

  // ── Stamina: fator principal ──────────────────────────────────
  if      (stamina < 0.20) chance *= 5.0;
  else if (stamina < 0.30) chance *= 3.0;
  else if (stamina < 0.40) chance *= 2.0;
  else if (stamina < 0.55) chance *= 1.35;
  // stamina >= 0.55: sem multiplicador adicional

  // ── Rally longo esgota mais ───────────────────────────────────
  if (rally >= 25) chance *= 1.8;
  else if (rally >= 15) chance *= 1.3;
  else if (rally >= 10) chance *= 1.1;

  // ── Partida longa aumenta risco ───────────────────────────────
  if (totalPts  >= 200) chance *= 1.3;
  if (totalSets >= 2)   chance *= 1.15;

  // ── Superfície ────────────────────────────────────────────────
  if (surface === 'HARD')  chance *= 1.1;
  if (surface === 'GRASS') chance *= 1.1; // quedas / escorregões

  // ── Lesão pré-existente ───────────────────────────────────────
  if (player.injury && player.injury.isPlayingThrough) chance *= 2.0;

  // ── Recidiva (já teve MTO nesta partida) ──────────────────────
  if (hadMTO) chance *= 1.5;

  // ── Atributos de resistência como proteção ────────────────────
  const res = (player.attrs?.resistencia ?? 60) / 100;
  chance *= (1.4 - res * 0.8); // alta resistência reduz chance

  // Cap: máximo 0.8% por ponto
  chance = Math.min(0.008, chance);

  if (Math.random() > chance) return null;

  // ── Determina tipo ────────────────────────────────────────────
  // Cãibra: alta stamina baixa, partidas longas
  const crampChance = stamina < 0.30 && totalPts >= 120 ? 0.40 : 0.10;
  if (Math.random() < crampChance) {
    return { type: 'CRAMP', severity: 'MODERATE', isTemporary: true };
  }

  // Pool de lesões ponderado por superfície e estilo
  const style = player.styleId ?? '';
  const weights = IN_MATCH_INJURY_POOL.map(key => {
    const def = INJURY_TYPES[key];
    let w = 1.0;
    w *= (def.styleRisk?.[style]   ?? 1.0);
    w *= (def.surfaceRisk?.[surface] ?? 1.0);
    return { key, w };
  });
  const total = weights.reduce((s, x) => s + x.w, 0);
  let roll = Math.random() * total;
  let injType = 'ANKLE';
  for (const { key, w } of weights) {
    roll -= w;
    if (roll <= 0) { injType = key; break; }
  }

  // ── Determina severidade ──────────────────────────────────────
  // Mais pesos para MINOR em campo (vs pré-torneio onde grade 2/3 são comuns)
  const sevRoll = Math.random();
  let severity;
  if      (sevRoll < 0.72) severity = 'MINOR';
  else if (sevRoll < 0.93) severity = 'MODERATE';
  else                     severity = 'SEVERE';

  // Stamina muito baixa → eleva severidade (limiar mais baixo)
  if (stamina < 0.20 && severity === 'MINOR')    severity = 'MODERATE';
  if (stamina < 0.12 && severity === 'MODERATE') severity = 'SEVERE';

  return { type: injType, severity, isTemporary: false };
}

/**
 * Decide se o jogador pode continuar após o MTO.
 * Leva em conta severidade, mentalidade, placar e contexto.
 *
 * @returns {{ canContinue: bool, reason: string }}
 */
export function decideMTOOutcome(player, severity, gs) {
  const sevDef = IN_MATCH_SEVERITY[severity];
  if (!sevDef) return { canContinue: true, reason: 'desconhecido' };

  let continueChance = sevDef.canContinueChance;
  const mental = (player.attrs?.mentalidade ?? 60) / 100;

  // Mentalidade forte → mais resistente para continuar
  continueChance += (mental - 0.6) * 0.18;

  // Contexto do placar: se está perdendo feio, menos incentivo
  const playerIdx = gs.players.indexOf(player);
  const myIdx = playerIdx >= 0 ? playerIdx : 0;
  const mySets  = gs.players[myIdx]?.sets  ?? 0;
  const oppSets = gs.players[1 - myIdx]?.sets ?? 0;
  if (oppSets > mySets + 1) continueChance -= 0.15; // perdendo 2 sets
  if (mySets > oppSets)     continueChance += 0.10; // está ganhando

  // Torneio importante: mais incentivo para aguentar
  if (gs.isSlam)    continueChance += 0.12;
  if (gs.crowdPressure >= 0.7) continueChance += 0.06;

  // Cãibra: quase sempre continua após o tratamento
  if (player._pendingMTOType === 'CRAMP') continueChance = 0.92;

  continueChance = Math.max(0.05, Math.min(0.97, continueChance));

  const canContinue = Math.random() < continueChance;
  const reason = canContinue
    ? `retorna após tratamento (${sevDef.label})`
    : `abandona — lesão ${sevDef.label} impediu continuidade`;

  return { canContinue, reason };
}

/**
 * Aplica penalidades de lesão em campo diretamente nos attrs do jogador em gs.
 * SEGURO: gs.players[] são cópias — NAMED_PLAYERS não é modificado.
 */
export function applyInMatchPenalty(player, injuryType, severity) {
  const sevDef  = IN_MATCH_SEVERITY[severity];
  const injDef  = injuryType === 'CRAMP'
    ? CRAMP_TYPE
    : INJURY_TYPES[injuryType];

  if (!injDef || !sevDef) return;

  const mult = sevDef.penaltyMult;

  // SEGURANÇA: guarda os valores originais antes de penalizar.
  // Permite restauração exata ao final da partida.
  // ATENÇÃO: player.attrs JÁ é um clone (criado em createPlayer via migrateAttrsToV3).
  // Nunca modificar NAMED_PLAYERS diretamente — este objeto é o runtime do gs.
  if (!player._attrsBeforeInjury) {
    player._attrsBeforeInjury = { ...player.attrs };
  }

  for (const [attr, val] of Object.entries(injDef.penalties)) {
    if (player.attrs[attr] !== undefined) {
      // Piso 28 = ATTR_MINIMUM — lesão não pode zerar um atributo de elite
      player.attrs[attr] = Math.max(28, player.attrs[attr] + Math.round(val * mult));
    }
  }
}

/**
 * Aplica degradação progressiva a cada game após a lesão.
 * Chamado em _gameWon() quando o jogador tem inMatchInjury ativa.
 */
export function applyProgressiveDegradation(player) {
  const inj = player._inMatchInjury;
  if (!inj || inj.isTemporary) return;

  inj.gamesAfterInjury = (inj.gamesAfterInjury ?? 0) + 1;
  const games = inj.gamesAfterInjury;

  // Degrada a cada 3 games: penalidade adicional leve
  if (games % 3 === 0) {
    const injDef = INJURY_TYPES[inj.injuryType];
    if (!injDef) return;
    const extraMult = 0.12; // 12% a mais a cada 3 games
    for (const [attr, val] of Object.entries(injDef.penalties)) {
      if (player.attrs[attr] !== undefined) {
        player.attrs[attr] = Math.max(28, player.attrs[attr] + Math.round(val * extraMult));
      }
    }
  }
}

/**
 * Retorna informações sobre recidiva para uso narrativo no NewsEngine.
 * @returns {{ isChronic: bool, repeatCount: number, chronicsLabel: string | null }}
 */
export function getRecidiveInfo(player, injuryType) {
  const hist = player.injuryHistory ?? [];
  const sameType = hist.filter(h => h.type === injuryType);
  const repeatCount = sameType.length;
  const isChronic   = repeatCount >= 2;

  const bodyLabel = INJURY_TYPES[injuryType]?.label?.toLowerCase() ?? injuryType.toLowerCase();
  const chronicLabel = isChronic
    ? repeatCount >= 3
      ? `problema crônico no ${bodyLabel} (${repeatCount}ª vez)`
      : `recidiva no ${bodyLabel} (2ª vez)`
    : null;

  return { isChronic, repeatCount, chronicLabel };
}
export function buildInMatchInjuryEvent(player, mto, gs, eventType = 'mto') {
  const injDef  = mto.injuryType === 'CRAMP'
    ? CRAMP_TYPE
    : INJURY_TYPES[mto.injuryType] ?? {};
  const sevLabel = IN_MATCH_SEVERITY[mto.severity]?.label ?? mto.severity;
  const setStr  = `${gs.players[0].sets}-${gs.players[1].sets}`;

  if (eventType === 'mto') {
    return {
      type: 'in_match_injury',
      text: `${player.name} para para atendimento médico — ${injDef.label ?? mto.injuryType} (${sevLabel}) | ${setStr}`,
      playerId: player.id,
      playerName: player.name,
      injuryType: mto.injuryType,
      severity: mto.severity,
      sets: setStr,
    };
  }

  if (eventType === 'retirement') {
    return {
      type: 'in_match_retirement',
      text: `${player.name} abandona a partida por lesão — ${injDef.label ?? mto.injuryType} (${sevLabel}) | ${setStr}`,
      playerId: player.id,
      playerName: player.name,
      injuryType: mto.injuryType,
      severity: mto.severity,
      sets: setStr,
    };
  }

  return null;
}

/**
 * ── LÓGICA CANÔNICA DE LESÃO PRÉ-TORNEIO ────────────────────────────────────
 * Única fonte de verdade usada por runTournament, runTournamentFast e
 * TournamentBracket. Garante regras idênticas independentemente do caminho.
 *
 * @param {object[]} players    — todos os participantes (main + qual + preQual)
 * @param {object}   tournament — dados do torneio
 * @param {number|null} seasonYear — ano atual (para isPlayingThrough)
 * @returns {{ injuryWithdrawals: Set, injuryEvents: [], updatedByInjury: {} }}
 */
export function applyPreTournamentInjuries(players, tournament, seasonYear = null) {
  const injuryWithdrawals = new Set();
  const injuryEvents      = [];
  const updatedByInjury   = {};

  for (const player of players) {
    if (!player) continue;
    const p = ensurePhysicalCondition(player);

    // 1. Lesão já existente com slots restantes → decide retirada direto
    if (p.injury && (p.injury.slotsRemaining ?? 0) > 0) {
      const { withdraw } = shouldWithdraw(p, tournament);
      if (withdraw) {
        injuryWithdrawals.add(p.id);
        injuryEvents.push(buildInjuryEvent(p, p.injury, tournament, 'withdraw'));
      }
      updatedByInjury[p.id] = p;
      continue;
    }

    // 2. Rola nova lesão pré-torneio
    const { injured, injury, isNew } = rollPreTournamentInjury(p, tournament, []);
    if (!injured || !injury) continue;

    const pw = isNew ? { ...p, injury } : p;
    if (isNew) injuryEvents.push(buildInjuryEvent(p, injury, tournament, 'injury'));

    const { withdraw } = shouldWithdraw(pw, tournament);
    if (withdraw) {
      injuryWithdrawals.add(p.id);
      injuryEvents.push(buildInjuryEvent(p, injury, tournament, 'withdraw'));
      // ← Crítico: persiste a lesão no objeto mesmo que o jogador se retire
      updatedByInjury[p.id] = pw;
    } else if (injury.grade === 1) {
      updatedByInjury[p.id] = { ...pw, injury: { ...injury, isPlayingThrough: true, originSeason: seasonYear } };
    } else {
      updatedByInjury[p.id] = pw;
    }
  }

  return { injuryWithdrawals, injuryEvents, updatedByInjury };
}
