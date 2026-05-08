/**
 * RetirementSystem.js
 * ─────────────────────────────────────────────────────────────────
 * Sistema de aposentadorias do modo universo.
 *
 * Avaliação ocorre uma vez por temporada, na virada do ano.
 * Todos os jogadores são avaliados independentemente.
 *
 * Tipos de aposentadoria:
 *   FORÇADA_LESÃO      — lesões graves acumuladas impossibilitam continuidade
 *   VOLUNTÁRIA_PICO    — atleta decide parar enquanto ainda competitivo
 *   BURNOUT            — esgotamento físico/mental em perfis instáveis
 *   DESGASTE_NATURAL   — decadência progressiva, o mais comum
 *   FORÇADA_RANKING    — queda de ranking inviabiliza carreira (só newgens)
 */

import { releaseRetiredPhotos } from '../newgen/NewgenImagePool.js';
import {
  STYLE_TO_COACH_PHILOSOPHY,
  coachFromRetiredPlayer,
} from '../coaches/CoachingSystem.js';

// ─────────────────────────────────────────────────────────────────
// TIPOS DE APOSENTADORIA
// ─────────────────────────────────────────────────────────────────
export const RETIREMENT_TYPES = {
  FORCADA_LESAO: {
    id:    'FORCADA_LESAO',
    label: 'Lesão Forçada',
    icon:  '🩹',
    color: '#F44336',
    buildMessage: (p) =>
      `${p.name} anuncia aposentadoria forçada. O corpo não aguentou mais — lesões graves encerraram uma carreira brilhante.`,
  },
  VOLUNTARIA_PICO: {
    id:    'VOLUNTARIA_PICO',
    label: 'Voluntária no Auge',
    icon:  '👑',
    color: '#FFD700',
    buildMessage: (p) =>
      `${p.name} se aposenta voluntariamente. Decidiu encerrar enquanto ainda era competitivo — uma saída digna e rara.`,
  },
  BURNOUT: {
    id:    'BURNOUT',
    label: 'Burnout',
    icon:  '🔥',
    color: '#FF9800',
    buildMessage: (p) =>
      `${p.name} abandona o circuito. O desgaste físico e mental cobrou sua conta — fim abrupto de uma carreira intensa.`,
  },
  DESGASTE_NATURAL: {
    id:    'DESGASTE_NATURAL',
    label: 'Desgaste Natural',
    icon:  '🌅',
    color: '#90A4AE',
    buildMessage: (p) =>
      `${p.name} anuncia sua aposentadoria. Após anos no circuito, o momento chegou — fim de uma era.`,
  },
  FORCADA_RANKING: {
    id:    'FORCADA_RANKING',
    label: 'Saída por Ranking',
    icon:  '📉',
    color: '#78909C',
    buildMessage: (p) =>
      `${p.name} se retira do circuito. A queda de ranking tornou a continuidade inviável.`,
  },
  PROSPECT_AGED_OUT: {
    id:    'PROSPECT_AGED_OUT',
    label: 'Nunca Chegou ao Tour',
    icon:  '📋',
    color: '#607D8B',
    buildMessage: (p) =>
      `${p.name} encerra a carreira nas prospects. Nunca chegou ao profissionalismo.`,
  },
};

// ─────────────────────────────────────────────────────────────────
// PROBABILIDADE BASE POR IDADE
// ─────────────────────────────────────────────────────────────────
function baseProbability(age) {
  if (age < 30) return 0.00;
  if (age === 30) return 0.01;
  if (age === 31) return 0.02;
  if (age === 32) return 0.04;
  if (age === 33) return 0.07;
  if (age === 34) return 0.12;
  if (age === 35) return 0.20;
  if (age === 36) return 0.30;
  if (age === 37) return 0.42;
  return 0.60; // 38+
}

// ─────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────

/** Conta GS ganhos nos resultados do universo */
function countGsWins(playerId, tournamentResults) {
  if (!tournamentResults) return 0;
  let count = 0;
  for (const res of Object.values(tournamentResults)) {
    if (res?.bracket?.champion?.id === playerId && res?.tournament?.isSlam) count++;
  }
  return count;
}

/** Conta lesões de um grau mínimo no histórico do jogador */
function countSevereInjuries(player, minGrade = 2) {
  return (player.injuryHistory ?? []).filter(h => h.grade >= minGrade).length;
}

/** Verifica se teve 2 lesões grau-3 na mesma região nos últimos 2 anos */
function hadRepeatedGrade3(player, seasonYear) {
  const hist = (player.injuryHistory ?? []).filter(h => h.grade === 3);
  if (hist.length < 2) return false;
  // Verifica tipos iguais (mesma região)
  const byType = {};
  for (const h of hist) {
    byType[h.type] = (byType[h.type] ?? 0) + 1;
  }
  return Object.values(byType).some(c => c >= 2);
}

// ─────────────────────────────────────────────────────────────────
// PERFORMANCE SCORE SYSTEM
// ─────────────────────────────────────────────────────────────────

/**
 * Calcula pontos de desempenho baseado em resultados de torneios.
 * Sistema de pontuação:
 * - GS Campeão: 100pts | Vice: 50pts | Semi: 30pts | Quartas: 15pts
 * - Masters Campeão: 40pts | Vice: 20pts | Semi: 12pts | Quartas: 6pts
 * - ATP500 Campeão: 20pts | Vice: 10pts | Semi: 6pts
 * - ATP250 Campeão: 10pts | Vice: 5pts | Semi: 3pts
 */
function calculateSeasonPerformanceScore(playerId, tournamentResults, season) {
  if (!tournamentResults) return 0;
  
  let score = 0;
  const POINTS = {
    // Grand Slams
    SLAM_WIN: 100,
    SLAM_FINAL: 50,
    SLAM_SEMI: 30,
    SLAM_QUARTER: 15,
    // Masters 1000
    MASTERS_WIN: 40,
    MASTERS_FINAL: 20,
    MASTERS_SEMI: 12,
    MASTERS_QUARTER: 6,
    // ATP 500
    ATP500_WIN: 20,
    ATP500_FINAL: 10,
    ATP500_SEMI: 6,
    // ATP 250
    ATP250_WIN: 10,
    ATP250_FINAL: 5,
    ATP250_SEMI: 3,
  };

  for (const res of Object.values(tournamentResults)) {
    // Só considera torneios da temporada especificada
    if (res?.tournament?.season !== season) continue;
    
    const isSlam = res?.tournament?.isSlam ?? false;
    const tier = res?.tournament?.tier ?? 'ATP250'; // ATP250, ATP500, MASTERS, SLAM
    const bracket = res?.bracket;
    
    if (!bracket) continue;

    // Campeão
    if (bracket.champion?.id === playerId) {
      if (isSlam) score += POINTS.SLAM_WIN;
      else if (tier === 'MASTERS') score += POINTS.MASTERS_WIN;
      else if (tier === 'ATP500') score += POINTS.ATP500_WIN;
      else score += POINTS.ATP250_WIN;
      continue;
    }

    // Vice-campeão (finalista)
    if (bracket.runnerUp?.id === playerId || bracket.finalist?.id === playerId) {
      if (isSlam) score += POINTS.SLAM_FINAL;
      else if (tier === 'MASTERS') score += POINTS.MASTERS_FINAL;
      else if (tier === 'ATP500') score += POINTS.ATP500_FINAL;
      else score += POINTS.ATP250_FINAL;
      continue;
    }

    // Semifinalista
    const semis = bracket.semifinals ?? bracket.semis ?? [];
    if (Array.isArray(semis) && semis.some(p => p?.id === playerId)) {
      if (isSlam) score += POINTS.SLAM_SEMI;
      else if (tier === 'MASTERS') score += POINTS.MASTERS_SEMI;
      else if (tier === 'ATP500') score += POINTS.ATP500_SEMI;
      else score += POINTS.ATP250_SEMI;
      continue;
    }

    // Quartas de final
    const quarters = bracket.quarterfinals ?? bracket.quarters ?? [];
    if (Array.isArray(quarters) && quarters.some(p => p?.id === playerId)) {
      if (isSlam) score += POINTS.SLAM_QUARTER;
      else if (tier === 'MASTERS') score += POINTS.MASTERS_QUARTER;
      // 500 e 250 não pontuam em quartas
    }
  }

  return score;
}

/**
 * Calcula o Performance Score Index (PSI) - índice de desempenho recente.
 * Compara última temporada com média das 2 anteriores.
 * 
 * @returns {
 *   currentScore: number,    // Pontos da última temporada
 *   avgPastScore: number,    // Média das 2 temporadas anteriores
 *   dropPercentage: number,  // % de queda (negativo = melhora)
 *   isSevereDecline: boolean // true se queda >= 50%
 * }
 */
function calculatePerformanceScoreIndex(playerId, tournamentResults, currentSeason) {
  const currentScore = calculateSeasonPerformanceScore(playerId, tournamentResults, currentSeason);
  const pastScore1 = calculateSeasonPerformanceScore(playerId, tournamentResults, currentSeason - 1);
  const pastScore2 = calculateSeasonPerformanceScore(playerId, tournamentResults, currentSeason - 2);
  
  const avgPastScore = (pastScore1 + pastScore2) / 2;
  
  // Se nunca teve resultados significativos, não considera queda severa
  if (avgPastScore < 5) {
    return {
      currentScore,
      avgPastScore,
      dropPercentage: 0,
      isSevereDecline: false,
    };
  }

  const dropPercentage = ((avgPastScore - currentScore) / avgPastScore) * 100;
  const isSevereDecline = dropPercentage >= 50; // Queda de 50%+ é severa

  return {
    currentScore,
    avgPastScore,
    dropPercentage,
    isSevereDecline,
  };
}

// ─────────────────────────────────────────────────────────────────
// AVALIAÇÃO PRINCIPAL
// ─────────────────────────────────────────────────────────────────

/**
 * Avalia se um jogador deve se aposentar na virada de temporada.
 *
 * @param {object}  player              — objeto completo do jogador
 * @param {number}  seasonYear          — ano que acabou
 * @param {object}  tournamentResults   — state.tournamentResults do universo
 * @param {number}  ovrThisSeason       — OVR atual
 * @param {number}  ovrLastSeason       — OVR do ano anterior (para medir queda)
 * @param {boolean} isNewgen            — se é gerado pelo NewgenSystem
 *
 * @returns {{ retires: boolean, type: string|null, probability: number }}
 */
export function evaluateRetirement(
  player,
  seasonYear,
  tournamentResults = {},
  ovrThisSeason,
  ovrLastSeason,
  isNewgen = false,
) {
  const age = player.age ?? 25;
  const style = player.styleId ?? '';
  const devStyle = player.developmentStyle ?? 'STEADY';
  const rankPos = player.rankPosition ?? 100;
  const cond = player.physicalCondition ?? 80;

  // OVR drop this season
  const ovrDrop = (ovrLastSeason ?? ovrThisSeason) - ovrThisSeason;

  // ── PERFORMANCE SCORE INDEX (PSI) ──────────────────────────────
  // Analisa desempenho recente em torneios para detectar queda real de performance
  const psi = calculatePerformanceScoreIndex(player.id, tournamentResults, seasonYear);

  // Contagem de lesões
  const grade3count = countSevereInjuries(player, 3);
  const grade2count = countSevereInjuries(player, 2);
  const repeatedGrade3 = hadRepeatedGrade3(player, seasonYear);
  const hasActiveGrade3 = player.injury?.grade === 3 && player.injury?.slotsRemaining > 0;

  const gsWins = countGsWins(player.id, tournamentResults);

  // ── CASOS ESPECIAIS (flat probability, independe de idade) ────

  // Lesão grave repetida na mesma região = muito provável parar
  if (repeatedGrade3 && age >= 30) {
    const p = 0.65;
    if (Math.random() < p) return { retires: true, type: 'FORCADA_LESAO', probability: p };
  }

  // Grau 3 ativa + velho: alta chance de encerrar
  if (hasActiveGrade3 && age >= 34) {
    const p = 0.50;
    if (Math.random() < p) return { retires: true, type: 'FORCADA_LESAO', probability: p };
  }

  // Burnout: VOLATILE/TAKEALLRISK + físico arrasado + qualquer declínio
  const isExplodingStyle = ['VOLATILE', 'TAKEALLRISK'].includes(style);
  const isVolatileDev = devStyle === 'VOLATILE';
  if ((isExplodingStyle || isVolatileDev) && age >= 26 && cond < 52 && ovrDrop >= 5) {
    const p = 0.22;
    if (Math.random() < p) return { retires: true, type: 'BURNOUT', probability: p };
  }

  // Ranking forçado (só newgens) — fora do top-120 por ranking ruim
  if (isNewgen && rankPos > 180 && age >= 28) {
    const p = 0.18 + (age - 28) * 0.06;
    if (Math.random() < Math.min(0.55, p)) return { retires: true, type: 'FORCADA_RANKING', probability: p };
  }

  // ── PROBABILIDADE BASE POR IDADE ──────────────────────────────
  let chance = baseProbability(age);
  if (chance === 0) return { retires: false, type: null, probability: 0 };

  // ── MODIFICADORES ─────────────────────────────────────────────

  // Queda de OVR na temporada
  if (ovrDrop >= 12) chance *= 2.2;
  else if (ovrDrop >= 7) chance *= 1.7;
  else if (ovrDrop >= 4) chance *= 1.3;

  // Lesões graves acumuladas
  if (grade2count + grade3count >= 4) chance *= 2.5;
  else if (grade2count + grade3count >= 2) chance *= 1.6;

  // Condição física
  if (cond < 50) chance *= 2.0;
  else if (cond < 60) chance *= 1.6;
  else if (cond < 70) chance *= 1.25;
  else if (cond > 85) chance *= 0.7;

  // ── PERFORMANCE SCORE INDEX (PSI) - Sistema inteligente ──────
  // Queda severa de desempenho + desgaste = sinal claro de declínio
  if (psi.isSevereDecline && age >= 30) {
    // Queda de 50%+ nos resultados é um forte indicador
    if (cond < 65) {
      // Queda de performance + desgaste físico = hora de parar
      chance *= 2.8;
    } else {
      // Queda de performance, mas ainda fisicamente ok
      chance *= 1.9;
    }
  }
  // Jogador ainda competitivo (score alto recente) = motivo forte para continuar
  else if (psi.currentScore >= 80) {
    // Resultados excelentes recentes (múltiplos títulos grandes)
    chance *= 0.25; // Reduz drasticamente
  }
  else if (psi.currentScore >= 50) {
    // Bons resultados recentes (pelo menos 1 título grande ou várias semis/finais)
    chance *= 0.50;
  }
  else if (psi.currentScore >= 25) {
    // Resultados moderados, ainda competindo bem
    chance *= 0.75;
  }

  // Arco de desenvolvimento
  if (['VOLATILE', 'EARLY_BLOOMER'].includes(devStyle)) chance *= 1.4;
  else if (['STEADY', 'LATE_BLOOMER'].includes(devStyle)) chance *= 0.65;

  // Estilo físico exigente
  if (isExplodingStyle) chance *= 1.2;

  // Carreira sem GS = menos para segurar
  if (gsWins === 0 && age >= 33) chance *= 1.3;

  // Top do ranking = motivo para continuar
  if (rankPos <= 5) chance *= 0.45;
  else if (rankPos <= 15) chance *= 0.65;
  else if (rankPos <= 30) chance *= 0.80;
  else if (rankPos > 80) chance *= 1.25;

  // Ganhou GS essa temporada: renovação de motivação
  const wonGsThisSeason = Object.values(tournamentResults).some(
    r => r?.bracket?.champion?.id === player.id && r?.tournament?.isSlam
      && r?.tournament?.season === seasonYear
  );
  if (wonGsThisSeason) chance *= 0.20;

  // Cap final
  chance = Math.min(0.85, Math.max(0, chance));

  if (Math.random() > chance) return { retires: false, type: null, probability: chance };

  // ── DETERMINA TIPO ────────────────────────────────────────────
  let type = 'DESGASTE_NATURAL';

  // Lesão foi o fator dominante?
  if (hasActiveGrade3 || (grade3count >= 2 && age >= 31)) {
    type = 'FORCADA_LESAO';
  }
  // Burnout (estilo + desgaste)
  else if ((isExplodingStyle || isVolatileDev) && cond < 60) {
    type = 'BURNOUT';
  }
  // Voluntária no pico: ainda competitivo, top-15, OVR alto
  else if (ovrThisSeason >= 76 && rankPos <= 15 && ovrDrop <= 2 && gsWins >= 1) {
    type = 'VOLUNTARIA_PICO';
  }
  // Ranking inviável (newgen)
  else if (isNewgen && rankPos > 160) {
    type = 'FORCADA_RANKING';
  }

  return { retires: true, type, probability: chance };
}

// ─────────────────────────────────────────────────────────────────
// PROCESSAR APOSENTADORIAS DA TEMPORADA
// ─────────────────────────────────────────────────────────────────

/**
 * Roda avaliação de aposentadoria para todos os jogadores do tour.
 *
 * @param {array}  players            — state.tourPlayers
 * @param {number} seasonYear         — ano que acabou
 * @param {object} tournamentResults  — state.tournamentResults
 * @param {object} ovrSnapshot        — { [playerId]: ovrDoAnoAnterior }
 *
 * @returns {{
 *   activePlayers:  array,   — jogadores que continuam
 *   retiredPlayers: array,   — jogadores aposentados (com retirementInfo)
 *   events:         array,   — eventos para a timeline
 * }}
 */
export function processSeasonRetirements(players, seasonYear, tournamentResults, ovrSnapshot = {}) {
  const activePlayers = [];
  const retiredPlayers = [];
  const events = [];

  for (const player of players) {
    const isNewgen = !!player._isNewgen;
    const ovrNow  = player._ovrSnapshot ?? computeOvr(player);
    const ovrLast = ovrSnapshot[player.id] ?? ovrNow;

    const { retires, type, probability } = evaluateRetirement(
      player,
      seasonYear,
      tournamentResults,
      ovrNow,
      ovrLast,
      isNewgen,
    );

    if (retires && type) {
      const typeDef = RETIREMENT_TYPES[type];
      const retiredPlayer = {
        ...player,
        retirementInfo: {
          type,
          year: seasonYear,
          age: player.age ?? 25,
          rankAtRetirement: player.rankPosition ?? '?',
          message: typeDef?.buildMessage(player) ?? `${player.name} se aposentou.`,
        },
      };
      retiredPlayers.push(retiredPlayer);

      const pos = player.rankPosition ?? '?';
      const isNotable = (player.rankPosition ?? 999) <= 30 || type !== 'FORCADA_RANKING';
      if (isNotable) {
        events.push({
          type: 'retirement',
          text: typeDef?.buildMessage(player) ?? `${player.name} se aposentou.`,
          playerId: player.id,
          playerName: player.name,
          retirementType: type,
          year: seasonYear,
          icon: typeDef?.icon ?? '🎾',
        });
      }
    } else {
      activePlayers.push(player);
    }
  }

  return { activePlayers, retiredPlayers, events };
}

/**
 * Versão do processSeasonRetirements que também gerencia o pool de imagens.
 * Substitua processSeasonRetirements por esta se quiser tudo junto,
 * ou chame releaseRetiredPhotos separadamente após processSeasonRetirements.
 *
 * @param {array}  players
 * @param {number} seasonYear
 * @param {object} tournamentResults
 * @param {object} ovrSnapshot
 * @param {object} imagePoolState  — state.newgenImagePool
 * @returns {{ activePlayers, retiredPlayers, events, imagePoolState }}
 */
export function processSeasonRetirementsWithPool(
  players, seasonYear, tournamentResults, ovrSnapshot = {}, imagePoolState = null,
) {
  const result = processSeasonRetirements(players, seasonYear, tournamentResults, ovrSnapshot);
  const updatedPoolState = releaseRetiredPhotos(result.retiredPlayers, imagePoolState);
  return { ...result, imagePoolState: updatedPoolState };
}

// ─────────────────────────────────────────────────────────────────
// RISCO DE APOSENTADORIA (para exibição na ficha)
// ─────────────────────────────────────────────────────────────────

/**
 * Calcula a probabilidade estimada de aposentadoria do jogador
 * para a próxima virada de temporada. Retorna 0-1.
 */
export function retirementRiskEstimate(player, seasonYear, tournamentResults = {}) {
  const age = player.age ?? 25;
  if (age < 28) return 0;

  const ovrNow = computeOvr(player);
  const { probability } = evaluateRetirement(
    { ...player, _dryRun: true }, // passa flag só para debugging
    seasonYear,
    tournamentResults,
    ovrNow,
    ovrNow, // sem histórico de OVR, assume estável
    false,
  );

  // Retorna a probabilidade calculada (sem o roll de Math.random)
  // Para isso, re-calculamos sem o roll:
  return computeRetirementChance(player, seasonYear, tournamentResults, ovrNow, ovrNow);
}

/** Calcula chance sem o roll final (para exibição) */
export function computeRetirementChance(player, seasonYear, tournamentResults = {}, ovrNow, ovrLast) {
  const age = player.age ?? 25;
  const style = player.styleId ?? '';
  const devStyle = player.developmentStyle ?? 'STEADY';
  const rankPos = player.rankPosition ?? 100;
  const cond = player.physicalCondition ?? 80;
  const ovrDrop = (ovrLast ?? ovrNow) - ovrNow;
  const grade2count = countSevereInjuries(player, 2);
  const repeatedGrade3 = hadRepeatedGrade3(player, seasonYear);
  const hasActiveGrade3 = player.injury?.grade === 3 && player.injury?.slotsRemaining > 0;
  const isExplodingStyle = ['VOLATILE', 'TAKEALLRISK'].includes(style);
  const isVolatileDev = devStyle === 'VOLATILE';
  const gsWins = countGsWins(player.id, tournamentResults);
  const psi = calculatePerformanceScoreIndex(player.id, tournamentResults, seasonYear);

  // Casos especiais
  if (repeatedGrade3 && age >= 30) return 0.65;
  if (hasActiveGrade3 && age >= 34) return 0.50;
  if ((isExplodingStyle || isVolatileDev) && age >= 26 && cond < 52 && ovrDrop >= 5) return 0.22;

  let chance = baseProbability(age);
  if (chance === 0) return 0;

  if (ovrDrop >= 12) chance *= 2.2;
  else if (ovrDrop >= 7) chance *= 1.7;
  else if (ovrDrop >= 4) chance *= 1.3;

  if (grade2count >= 4) chance *= 2.5;
  else if (grade2count >= 2) chance *= 1.6;

  if (cond < 50) chance *= 2.0;
  else if (cond < 60) chance *= 1.6;
  else if (cond < 70) chance *= 1.25;
  else if (cond > 85) chance *= 0.7;

  // ── PERFORMANCE SCORE INDEX (PSI) - Sistema inteligente ──────
  if (psi.isSevereDecline && age >= 30) {
    if (cond < 65) {
      chance *= 2.8;
    } else {
      chance *= 1.9;
    }
  }
  else if (psi.currentScore >= 80) {
    chance *= 0.25;
  }
  else if (psi.currentScore >= 50) {
    chance *= 0.50;
  }
  else if (psi.currentScore >= 25) {
    chance *= 0.75;
  }

  if (['VOLATILE', 'EARLY_BLOOMER'].includes(devStyle)) chance *= 1.4;
  else if (['STEADY', 'LATE_BLOOMER'].includes(devStyle)) chance *= 0.65;

  if (isExplodingStyle) chance *= 1.2;
  if (gsWins === 0 && age >= 33) chance *= 1.3;

  if (rankPos <= 5) chance *= 0.45;
  else if (rankPos <= 15) chance *= 0.65;
  else if (rankPos <= 30) chance *= 0.80;
  else if (rankPos > 80) chance *= 1.25;

  const wonGsThisSeason = Object.values(tournamentResults).some(
    r => r?.bracket?.champion?.id === player.id && r?.tournament?.isSlam
      && r?.tournament?.season === seasonYear
  );
  if (wonGsThisSeason) chance *= 0.20;

  return Math.min(0.85, Math.max(0, chance));
}

// ─────────────────────────────────────────────────────────────────
// LABEL / DISPLAY
// ─────────────────────────────────────────────────────────────────

export function retirementRiskLabel(chance) {
  if (chance <= 0.03) return { label: 'Nenhum',    color: '#4CAF50' };
  if (chance <= 0.08) return { label: 'Baixo',     color: '#8BC34A' };
  if (chance <= 0.18) return { label: 'Moderado',  color: '#FFC107' };
  if (chance <= 0.35) return { label: 'Elevado',   color: '#FF9800' };
  return                     { label: 'Iminente',  color: '#F44336' };
}

// ─────────────────────────────────────────────────────────────────
// HELPER INTERNO (sem importar players.js para evitar circular)
// ─────────────────────────────────────────────────────────────────
function computeOvr(player) {
  if (!player.attrs) return 70;
  const vals = Object.values(player.attrs).filter(v => typeof v === 'number');
  if (!vals.length) return 70;
  return Math.round(vals.reduce((s, v) => s + v, 0) / vals.length);
}

// ─────────────────────────────────────────────────────────────────
// FASE 4: EX-JOGADORES VIRAM TREINADORES
// ─────────────────────────────────────────────────────────────────

/**
 * Probabilidade de um jogador aposentado se tornar técnico,
 * baseada no tipo de aposentadoria (tabela 4.1 do spec).
 */
const COACH_PROB_BY_RETIREMENT_TYPE = {
  VOLUNTARIA_PICO:   0.25,   // Lenda / vários Slams — já realizou tudo
  DESGASTE_NATURAL:  0.45,   // Sólido — aprendeu que nada é dispensável
  FORCADA_LESAO:     0.60,   // Lesão grave — muito a compartilhar
  BURNOUT:           0.15,   // Burnout — treinar quando aceita
  FORCADA_RANKING:   0.05,   // Saída por ranking — humilde, raro
  PROSPECT_AGED_OUT: 0.00,   // Nunca chegou ao tour — não vira técnico
};

/**
 * Derivar filosofia de coach a partir do tipo de aposentadoria e styleId.
 * Segue tabela 4.1 e 4.2 do spec.
 */
function deriveCoachPhilosophy(retiredPlayer) {
  const type    = retiredPlayer.retirementInfo?.type ?? 'DESGASTE_NATURAL';
  const styleId = retiredPlayer.styleId ?? '';

  // Regras especiais por tipo de aposentadoria
  if (type === 'FORCADA_LESAO') {
    // Lesão grave → DEFENSIVE (aprendeu a preservar) ou MENTAL (superação)
    return Math.random() < 0.55 ? 'DEFENSIVE' : 'MENTAL';
  }
  if (type === 'BURNOUT') {
    return 'MENTAL'; // O burnout ensina o que o burnout cobra
  }

  // Mapeamento por estilo de jogo
  const mapping = STYLE_TO_COACH_PHILOSOPHY[styleId];
  if (mapping) return mapping.philosophy;

  // Fallback: COMPLETE (experiência genérica)
  return 'COMPLETE';
}

/**
 * Derivar specialty attrs do coach a partir do estilo e filosofia.
 * Para COMPLETE: usa top-2 atributos numéricos do jogador.
 */
function deriveCoachSpecialty(retiredPlayer, philosophy) {
  const styleId = retiredPlayer.styleId ?? '';
  const mapping = STYLE_TO_COACH_PHILOSOPHY[styleId];

  // COMPLETE ou MENTAL sem mapeamento → top-2 attrs do jogador
  if (philosophy === 'COMPLETE' || !mapping?.specialty) {
    const SKIP = new Set([
      'id', 'name', 'age', 'nationality', 'styleId', 'rankPosition',
      'physicalCondition', 'formPoints',
    ]);
    const attrCandidates = Object.entries(retiredPlayer)
      .filter(([k, v]) => !k.startsWith('_') && !SKIP.has(k) && typeof v === 'number' && v > 0 && v <= 100)
      .sort((a, b) => b[1] - a[1]);
    const top2 = attrCandidates.slice(0, 2).map(([k]) => k);
    return top2.length >= 2 ? top2 : ['consistencia', 'resistencia'];
  }

  return mapping.specialty ?? [];
}

/**
 * Tenta transformar um jogador aposentado em treinador.
 * Chamado no ADVANCE_YEAR para cada jogador de newlyRetired.
 *
 * @param {object} retiredPlayer - jogador com retirementInfo preenchido
 * @param {number} season        - temporada atual
 * @returns {object|null}        - objeto coach (RETIRED_PLAYER) ou null
 */
export function tryBecomeCoach(retiredPlayer, season) {
  const retirementType = retiredPlayer.retirementInfo?.type ?? 'DESGASTE_NATURAL';
  const prob = COACH_PROB_BY_RETIREMENT_TYPE[retirementType] ?? 0.10;

  if (Math.random() > prob) return null;

  const philosophy = deriveCoachPhilosophy(retiredPlayer);
  const specialty  = deriveCoachSpecialty(retiredPlayer, philosophy);

  return coachFromRetiredPlayer(retiredPlayer, season, philosophy, specialty);
}

