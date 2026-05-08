/**
 * Headless.jsx
 * ─────────────────────────────────────────────────────────────────
 * Motor de simulação de partidas completo — usa exatamente o mesmo
 * engine do jogo visual (game.js, ai.js, physics.js, constants.js)
 * mas sem render, sem som e sem delays entre pontos.
 *
 * ATUALIZADO para alinhar com as novas físicas e stats:
 *   - DT_HEADLESS: 1/60 → 1/120 (alinhado com DT de constants.js)
 *   - MAX_TICKS_PER_POINT dobrado (15k→30k) para compensar o DT menor
 *   - Court key INDOOR_MASTERS → O2_ARENA (nome real em courtConfigs.js)
 *   - createEmptyStats / accStats / divStats atualizados com todos os
 *     novos campos: byType, pointsWonServing, hold%, break%, serveLog...
 *   - StatsCard mostra hold%, break%, pts c/ 1º/2º saque
 *
 * COMO FUNCIONA
 * ─────────────────────────────────────────────────────────────────
 * O engine visual usa setTimeout(fn, 800ms) para pausar entre pontos
 * (scheduleNextPoint em game.js). Em modo headless, interceptamos o
 * setTimeout globalmente durante a simulação — os callbacks são
 * armazenados e disparados imediatamente, tornando tudo síncrono.
 *
 * NENHUM arquivo do engine foi modificado. Todas as funções chamadas
 * aqui são as mesmas chamadas pelo jogo visual.
 *
 * EXPORTS
 * ─────────────────────────────────────────────────────────────────
 *   simulateMatchHeadless(configA, configB, courtKey?)
 *     → HeadlessResult
 *
 *   simulateTournamentHeadless(players, surface?)
 *     → TournamentResult
 *
 *   HeadlessUI   — componente React para testar/visualizar o headless
 *
 * TIPOS
 * ─────────────────────────────────────────────────────────────────
 *   configA / configB: {
 *     namedKey?:  string   — chave em NAMED_PLAYERS (ex: 'VANTORINI')
 *     playerData?: object  — objeto player completo (newgens, etc.)
 *     styleId?:   string   — fallback se não tiver namedKey/playerData
 *     name?:      string   — fallback de nome
 *     color?:     string   — fallback de cor
 *   }
 *
 *   HeadlessResult: {
 *     winner:     object   — player object do vencedor
 *     loser:      object   — player object do perdedor
 *     sets:       [number, number]
 *     setsDetail: [[gA,gB], ...]  — games por set
 *     stats:      { a: Stats, b: Stats }
 *     log:        string[]
 *     gs:         GameState  — estado final completo (para análise)
 *     ticks:      number   — total de ticks simulados
 *     points:     number   — total de pontos jogados
 *   }
 */

import React, { useState, useCallback } from 'react';
import { GameState } from './constants.js';
import { initGameState, gameTick, computeCrowdPressure } from './game.js';
import { NAMED_PLAYERS, overallRating } from './players.js';
import { PLAY_STYLES, STYLE_KEYS } from './styles.js';
import { runChangeover } from './CoachInfluencer.js';
import { heatScoreToTier } from './MatchHeat.js';
import { analyzeMatch } from './CoachAnalyzer.js';
import { generateInstructions } from './CoachAdvisor.js';

const REPLAY_SAMPLE_EVERY_TICKS = 2; // highlights gravados a 60fps equivalente
const REPLAY_TRAIL_LEN = 18;
const MAX_REPLAY_FRAMES_PER_POINT = 900;

// ═══════════════════════════════════════════════════════════════════
// INTERNALS
// ═══════════════════════════════════════════════════════════════════

// Limites de segurança para evitar loops infinitos
const MAX_TICKS_PER_POINT = 30_000;   // ~250s a 120fps — dobrado para compensar DT menor
const MAX_POINTS_PER_MATCH = 600;     // limite absurdo (Grand Slam real: ~300 pts)
const DT_HEADLESS = 1 / 120;         // ALINHADO com DT de constants.js — física idêntica ao viewer
const DT_MID      = 1 / 60;          // MID:  2× menos ticks — ~2× mais rápido, fidelidade alta
const DT_SLIM     = 1 / 30;          // SLIM: 4× menos ticks — ~4× mais rápido, leve deriva física

/**
 * Intercepta setTimeout globalmente durante a simulação para tornar
 * o engine completamente síncrono. Todos os callbacks de scheduleNextPoint
 * são coletados e disparados imediatamente após cada ponto terminar.
 *
 * A interceptação é escopo-local: restauramos o setTimeout original
 * em bloco finally, garantindo segurança mesmo em exceções.
 */
function runHeadless(fn) {
  const realSetTimeout = globalThis.setTimeout;
  const pending = [];
  let _fakeTimerId = 1;

  globalThis.setTimeout = (cb /*, delay */) => {
    pending.push(cb);
    return _fakeTimerId++;  // simple counter — no Math.random() consumed
  };

  let result;
  try {
    result = fn(pending);
  } finally {
    globalThis.setTimeout = realSetTimeout;
  }
  return result;
}

/**
 * Resolve o namedKey correto a partir de um config de jogador.
 * Aceita: namedKey string, playerData objeto, ou fallback de styleId.
 * Para newgens (playerData sem namedKey), injeta temporariamente o
 * jogador em NAMED_PLAYERS com um ID único, usa-o e remove em seguida.
 */
function resolvePlayerConfig(config) {
  if (!config) return { namedKey: null, styleId: null, name: null, color: null };

  // Config string direta (legado)
  if (typeof config === 'string') {
    return { namedKey: config, styleId: null, name: null, color: null };
  }

  // Config com namedKey explícita (jogadores originais)
  if (config.namedKey && NAMED_PLAYERS[config.namedKey]) {
    return { namedKey: config.namedKey, styleId: null, name: null, color: null };
  }

  // playerData direto (newgens ou overrides) — injeta temporariamente
  if (config.playerData) {
    const pd = config.playerData;
    const tempKey = `__HEADLESS_${pd.id ?? Date.now()}__`;
    NAMED_PLAYERS[tempKey] = pd;
    return { namedKey: tempKey, _tempKey: tempKey, styleId: null, name: null, color: null };
  }

  // Fallback: styleId/name/color livres
  return {
    namedKey: null,
    styleId: config.styleId ?? STYLE_KEYS[0],
    name:    config.name  ?? 'Jogador',
    color:   config.color ?? '#FFFFFF',
  };
}

function cleanupTempKeys(...configs) {
  for (const c of configs) {
    if (c._tempKey) delete NAMED_PLAYERS[c._tempKey];
  }
}

// ═══════════════════════════════════════════════════════════════════
// FUNÇÃO PRINCIPAL — simulateMatchHeadless
// ═══════════════════════════════════════════════════════════════════

/**
 * Simula uma partida completa de tênis usando o engine exato do jogo.
 *
 * @param {object|string} configA  — jogador A (namedKey, playerData, ou styleId)
 * @param {object|string} configB  — jogador B
 * @param {string}        courtKey — chave da quadra (default: 'US_OPEN')
 * @returns {HeadlessResult}
 */
export function simulateMatchHeadless(configA, configB, courtKey = 'US_OPEN', bestOf = 3, rivalSystem = null, isSlam = false, matchMeta = null) {
  const ca = resolvePlayerConfig(configA);
  const cb = resolvePlayerConfig(configB);

  let gs;
  let ticks = 0;
  let points = 0;

  try {
    gs = runHeadless((pending) => {
      const gameState = initGameState(
        ca.styleId, cb.styleId,
        ca.namedKey, cb.namedKey,
        courtKey,
        bestOf,
        rivalSystem,
      );
      gameState.isSlam = isSlam;

      // ── Crowd Pressure: peso da arena calculado com base em torneio + rivalidade ──
      if (matchMeta) {
        let rivalry = null;
        if (rivalSystem && ca.namedKey && cb.namedKey) {
          try { rivalry = rivalSystem.getRivalry(ca.namedKey, cb.namedKey) ?? null; } catch {}
        }
        gameState.crowdPressure = computeCrowdPressure(
          gameState,
          matchMeta.category ?? (isSlam ? 'GRAND_SLAM' : 'ATP_250'),
          matchMeta.round    ?? 'R32',
          rivalry,
        );
      } else if (isSlam) {
        gameState.crowdPressure = computeCrowdPressure(gameState, 'GRAND_SLAM', 'R32', null);
      }

      while (
        gameState.gameState !== GameState.GAME_OVER &&
        points < MAX_POINTS_PER_MATCH
      ) {
        // ── Tick até o ponto terminar ──────────────────────────────
        let ticksThisPoint = 0;
        while (
          gameState.gameState !== GameState.POINT_END &&
          gameState.gameState !== GameState.GAME_OVER &&
          ticksThisPoint < MAX_TICKS_PER_POINT
        ) {
          // ── Headless: resolve MTO instantaneamente (sem esperar o timer) ──
          // Em modo visual o stateTimer acumula em tempo real; em headless
          // avançamos direto para a decisão para evitar centenas de ticks vazios
          // e garantir que a partida só encerre se canContinue = false.
          if (gameState.gameState === 'MEDICAL_TIMEOUT' && gameState.mto && !gameState.mto.decided) {
            gameState.stateTimer = (gameState.mto.durationSecs ?? 0) + 1;
          }
          gameTick(gameState, DT_HEADLESS);
          ticksThisPoint++;
          ticks++;
        }

        // ── Disparar callbacks de scheduleNextPoint (sem delay) ────
        const cbs = pending.splice(0);
        for (const cb of cbs) cb();

        // ── FASE 5: Changeover do técnico em headless ─────────────
        // game.js sinaliza gs._pendingCoachChangeover a cada 2 games.
        // No modo visual é tratado em definitiveME; aqui fazemos diretamente.
        if (gameState._pendingCoachChangeover) {
          gameState._pendingCoachChangeover = false;
          const [hp0, hp1] = gameState.players;
          // Constrói matchLog mínimo a partir das stats acumuladas
          const _hMatchLog = (gameState._headlessMatchLog ?? []);
          for (const [hpi, hopp] of [[hp0, hp1], [hp1, hp0]]) {
            if (!hpi.coach?.philosophy) continue;
            const coachStub = { philosophy: hpi.coach.philosophy, id: hpi.coach.coachId };
            // Injeta stamina real do oponente no ctx para o analyzer
            hopp.ctx._realStamina = hopp.stamina;
            try {
              runChangeover(hpi, hopp, _hMatchLog, coachStub, analyzeMatch, generateInstructions);
            } catch (_e) { /* silencia erros de coach em headless */ }
          }
        }

        // Registra ponto no matchLog headless para o CoachAnalyzer
        if (gameState.gameState === GameState.POINT_END) {
          const [lp0, lp1] = gameState.players;
          const won0 = gameState.pointWinnerIdx === 0;
          const reason = gameState.lastPointReason ?? '';
          const isOppNet0 = lp1.atNet ?? false;
          const entry0 = {
            won: won0, rallyLen: gameState.rally ?? 0, oppNet: isOppNet0,
            isBreakPoint: false, // approximation — headless sem detecção de BP
            shotType:    lp0.ctx?.lastShotType ?? null,
            intent:      lp0.ctx?.currentIntent ?? null,
            oppShotType: lp1.ctx?.lastShotType ?? null,
            oppError:    won0 && (reason.includes('[REDE]') || reason.includes('[FORA]') || reason.includes('DUPLA')),
          };
          gameState._headlessMatchLog = [...(gameState._headlessMatchLog ?? []), entry0].slice(-150);
        }

        // ── Drena filas visuais (não usadas em headless) ──────────
        // Evita acúmulo de vfxQueue/pendingHitLabels ao longo da partida.
        // Em uma partida de ~300 pontos com 20 golpes cada, sem esse drain,
        // pendingHitLabels acumularia ~6000 entradas desnecessariamente.
        if (gameState.vfxQueue?.length > 0) gameState.vfxQueue.length = 0;
        if (gameState.pendingHitLabels?.length > 0) gameState.pendingHitLabels.length = 0;

        points++;
      }

      return gameState;
    });
  } finally {
    cleanupTempKeys(ca, cb);
  }

  // ── Restaurar attrs pós-lesão em campo ──────────────────────────
  // Qualquer penalidade aplicada por applyInMatchPenalty é temporária.
  // O jogador volta ao estado anterior à lesão ao fim da partida.
  // Os attrs originais foram salvos em player._attrsBeforeInjury no momento da lesão.
  for (const p of gs.players) {
    if (p._attrsBeforeInjury) {
      p.attrs = { ...p._attrsBeforeInjury };
      p._attrsBeforeInjury = null;
    }
  }

  // ── Montar resultado ─────────────────────────────────────────────
  const [pA, pB] = gs.players;
  const aWon = pA.sets > pB.sets;
  const winner = aWon ? pA : pB;
  const loser  = aWon ? pB : pA;

  // Histórico de sets: setsHistory registra games ganhos por set
  const setsDetail = [];
  const hA = pA.setsHistory ?? [];
  const hB = pB.setsHistory ?? [];
  const setCount = Math.max(hA.length, hB.length);
  for (let i = 0; i < setCount; i++) {
    setsDetail.push([hA[i] ?? 0, hB[i] ?? 0]);
  }

  // Derivar avgQuality antes de retornar
  for (const p of [pA, pB]) {
    p.stats.avgQuality = p.stats.qualityCount > 0
      ? Math.round((p.stats.qualitySum / p.stats.qualityCount) * 1000) / 1000
      : null;
  }

  // Métricas de trait sombra expostas no resultado
  const traitMetrics = {
    a: {
      tiebreaksWon:    pA.stats.tiebreaksWon    ?? 0,
      matchPointsSaved: pA.stats.matchPointsSaved ?? 0,
    },
    b: {
      tiebreaksWon:    pB.stats.tiebreaksWon    ?? 0,
      matchPointsSaved: pB.stats.matchPointsSaved ?? 0,
    },
  };

  return {
    winner,
    loser,
    sets: [pA.sets, pB.sets],
    setsDetail,
    stats: { a: pA.stats, b: pB.stats },
    traitMetrics,
    heat: gs.heat
      ? { score: Math.round(gs.heat.score), peak: Math.round(gs.heat.peak), tier: heatScoreToTier(gs.heat.peak) }
      : null,
    retirement:          gs.matchRetirement ?? null,
    inMatchInjuryEvents: gs.inMatchInjuryEvents ?? [],
    log:   gs.log,
    gs,
    ticks,
    points,
  };
}

// ═══════════════════════════════════════════════════════════════════
// SLIM SIMULATION — Versão rápida do headless (sem highlights)
// Usa DT_SLIM (1/30) → ~4× mais rápido que simulateMatchHeadless.
// Mantém toda a lógica de jogo: traits, momentum, stamina, crowd
// pressure, MTO, coach changeover, signature shots, prefs.
// Não grava frames → não pode ser usado para highlights/replays.
// ═══════════════════════════════════════════════════════════════════

/**
 * Simula uma partida usando o mesmo engine do headless, porém com
 * timestep maior (DT_SLIM = 1/30) para ganho de velocidade sem sacrificar
 * a fidelidade tática e estatística.
 *
 * @param {object|string} configA
 * @param {object|string} configB
 * @param {string}        courtKey
 * @returns {HeadlessResult}
 */
export function simulateMatchSlim(configA, configB, courtKey = 'US_OPEN', bestOf = 3, rivalSystem = null, isSlam = false, matchMeta = null) {
  const ca = resolvePlayerConfig(configA);
  const cb = resolvePlayerConfig(configB);

  let gs;
  let ticks = 0;
  let points = 0;

  try {
    gs = runHeadless((pending) => {
      const gameState = initGameState(
        ca.styleId, cb.styleId,
        ca.namedKey, cb.namedKey,
        courtKey,
        bestOf,
        rivalSystem,
      );
      gameState.isSlam = isSlam;

      if (matchMeta) {
        let rivalry = null;
        if (rivalSystem && ca.namedKey && cb.namedKey) {
          try { rivalry = rivalSystem.getRivalry(ca.namedKey, cb.namedKey) ?? null; } catch {}
        }
        gameState.crowdPressure = computeCrowdPressure(
          gameState,
          matchMeta.category ?? (isSlam ? 'GRAND_SLAM' : 'ATP_250'),
          matchMeta.round    ?? 'R32',
          rivalry,
        );
      } else if (isSlam) {
        gameState.crowdPressure = computeCrowdPressure(gameState, 'GRAND_SLAM', 'R32', null);
      }

      while (
        gameState.gameState !== GameState.GAME_OVER &&
        points < MAX_POINTS_PER_MATCH
      ) {
        let ticksThisPoint = 0;
        while (
          gameState.gameState !== GameState.POINT_END &&
          gameState.gameState !== GameState.GAME_OVER &&
          ticksThisPoint < MAX_TICKS_PER_POINT
        ) {
          if (gameState.gameState === 'MEDICAL_TIMEOUT' && gameState.mto && !gameState.mto.decided) {
            gameState.stateTimer = (gameState.mto.durationSecs ?? 0) + 1;
          }
          gameTick(gameState, DT_SLIM);
          ticksThisPoint++;
          ticks++;
        }

        const cbs = pending.splice(0);
        for (const cb of cbs) cb();

        if (gameState._pendingCoachChangeover) {
          gameState._pendingCoachChangeover = false;
          const [hp0, hp1] = gameState.players;
          const _hMatchLog = (gameState._headlessMatchLog ?? []);
          for (const [hpi, hopp] of [[hp0, hp1], [hp1, hp0]]) {
            if (!hpi.coach?.philosophy) continue;
            const coachStub = { philosophy: hpi.coach.philosophy, id: hpi.coach.coachId };
            hopp.ctx._realStamina = hopp.stamina;
            try {
              runChangeover(hpi, hopp, _hMatchLog, coachStub, analyzeMatch, generateInstructions);
            } catch (_e) {}
          }
        }

        if (gameState.gameState === GameState.POINT_END) {
          const [lp0, lp1] = gameState.players;
          const won0 = gameState.pointWinnerIdx === 0;
          const reason = gameState.lastPointReason ?? '';
          const isOppNet0 = lp1.atNet ?? false;
          const entry0 = {
            won: won0, rallyLen: gameState.rally ?? 0, oppNet: isOppNet0,
            isBreakPoint: false,
            shotType:    lp0.ctx?.lastShotType ?? null,
            intent:      lp0.ctx?.currentIntent ?? null,
            oppShotType: lp1.ctx?.lastShotType ?? null,
            oppError:    won0 && (reason.includes('[REDE]') || reason.includes('[FORA]') || reason.includes('DUPLA')),
          };
          gameState._headlessMatchLog = [...(gameState._headlessMatchLog ?? []), entry0].slice(-150);
        }

        // Drena filas visuais — slim não grava frames nem coleta VFX
        if (gameState.vfxQueue?.length > 0) gameState.vfxQueue.length = 0;
        if (gameState.pendingHitLabels?.length > 0) gameState.pendingHitLabels.length = 0;

        points++;
      }

      return gameState;
    });
  } finally {
    cleanupTempKeys(ca, cb);
  }

  for (const p of gs.players) {
    if (p._attrsBeforeInjury) {
      p.attrs = { ...p._attrsBeforeInjury };
      p._attrsBeforeInjury = null;
    }
  }

  const [pA, pB] = gs.players;
  const aWon = pA.sets > pB.sets;
  const winner = aWon ? pA : pB;
  const loser  = aWon ? pB : pA;

  const setsDetail = [];
  const hA = pA.setsHistory ?? [];
  const hB = pB.setsHistory ?? [];
  const setCount = Math.max(hA.length, hB.length);
  for (let i = 0; i < setCount; i++) {
    setsDetail.push([hA[i] ?? 0, hB[i] ?? 0]);
  }

  for (const p of [pA, pB]) {
    p.stats.avgQuality = p.stats.qualityCount > 0
      ? Math.round((p.stats.qualitySum / p.stats.qualityCount) * 1000) / 1000
      : null;
  }

  const traitMetrics = {
    a: {
      tiebreaksWon:    pA.stats.tiebreaksWon    ?? 0,
      matchPointsSaved: pA.stats.matchPointsSaved ?? 0,
    },
    b: {
      tiebreaksWon:    pB.stats.tiebreaksWon    ?? 0,
      matchPointsSaved: pB.stats.matchPointsSaved ?? 0,
    },
  };

  return {
    winner,
    loser,
    sets: [pA.sets, pB.sets],
    setsDetail,
    stats: { a: pA.stats, b: pB.stats },
    traitMetrics,
    heat: gs.heat
      ? { score: Math.round(gs.heat.score), peak: Math.round(gs.heat.peak), tier: heatScoreToTier(gs.heat.peak) }
      : null,
    retirement:          gs.matchRetirement ?? null,
    inMatchInjuryEvents: gs.inMatchInjuryEvents ?? [],
    log:   gs.log,
    gs,
    ticks,
    points,
  };
}

// ═══════════════════════════════════════════════════════════════════
// MID SIMULATION — Versão intermediária do headless (sem highlights)
// Usa DT_MID (1/60) → ~2× mais rápido que simulateMatchHeadless.
// Mesma lógica completa do slim, contact gap de 16ms vs 33ms.
// ═══════════════════════════════════════════════════════════════════

/**
 * Simula uma partida com timestep 1/60 — meio-termo entre headless full
 * (1/120) e slim (1/30). ~2× mais rápido que o full, com divergência
 * de resultado muito menor que o slim.
 *
 * @param {object|string} configA
 * @param {object|string} configB
 * @param {string}        courtKey
 * @returns {HeadlessResult}
 */
export function simulateMatchMid(configA, configB, courtKey = 'US_OPEN', bestOf = 3, rivalSystem = null, isSlam = false, matchMeta = null) {
  const ca = resolvePlayerConfig(configA);
  const cb = resolvePlayerConfig(configB);

  let gs;
  let ticks = 0;
  let points = 0;

  try {
    gs = runHeadless((pending) => {
      const gameState = initGameState(
        ca.styleId, cb.styleId,
        ca.namedKey, cb.namedKey,
        courtKey,
        bestOf,
        rivalSystem,
      );
      gameState.isSlam = isSlam;

      if (matchMeta) {
        let rivalry = null;
        if (rivalSystem && ca.namedKey && cb.namedKey) {
          try { rivalry = rivalSystem.getRivalry(ca.namedKey, cb.namedKey) ?? null; } catch {}
        }
        gameState.crowdPressure = computeCrowdPressure(
          gameState,
          matchMeta.category ?? (isSlam ? 'GRAND_SLAM' : 'ATP_250'),
          matchMeta.round    ?? 'R32',
          rivalry,
        );
      } else if (isSlam) {
        gameState.crowdPressure = computeCrowdPressure(gameState, 'GRAND_SLAM', 'R32', null);
      }

      while (
        gameState.gameState !== GameState.GAME_OVER &&
        points < MAX_POINTS_PER_MATCH
      ) {
        let ticksThisPoint = 0;
        while (
          gameState.gameState !== GameState.POINT_END &&
          gameState.gameState !== GameState.GAME_OVER &&
          ticksThisPoint < MAX_TICKS_PER_POINT
        ) {
          if (gameState.gameState === 'MEDICAL_TIMEOUT' && gameState.mto && !gameState.mto.decided) {
            gameState.stateTimer = (gameState.mto.durationSecs ?? 0) + 1;
          }
          gameTick(gameState, DT_MID);
          ticksThisPoint++;
          ticks++;
        }

        const cbs = pending.splice(0);
        for (const cb of cbs) cb();

        if (gameState._pendingCoachChangeover) {
          gameState._pendingCoachChangeover = false;
          const [hp0, hp1] = gameState.players;
          const _hMatchLog = (gameState._headlessMatchLog ?? []);
          for (const [hpi, hopp] of [[hp0, hp1], [hp1, hp0]]) {
            if (!hpi.coach?.philosophy) continue;
            const coachStub = { philosophy: hpi.coach.philosophy, id: hpi.coach.coachId };
            hopp.ctx._realStamina = hopp.stamina;
            try {
              runChangeover(hpi, hopp, _hMatchLog, coachStub, analyzeMatch, generateInstructions);
            } catch (_e) {}
          }
        }

        if (gameState.gameState === GameState.POINT_END) {
          const [lp0, lp1] = gameState.players;
          const won0 = gameState.pointWinnerIdx === 0;
          const reason = gameState.lastPointReason ?? '';
          const isOppNet0 = lp1.atNet ?? false;
          const entry0 = {
            won: won0, rallyLen: gameState.rally ?? 0, oppNet: isOppNet0,
            isBreakPoint: false,
            shotType:    lp0.ctx?.lastShotType ?? null,
            intent:      lp0.ctx?.currentIntent ?? null,
            oppShotType: lp1.ctx?.lastShotType ?? null,
            oppError:    won0 && (reason.includes('[REDE]') || reason.includes('[FORA]') || reason.includes('DUPLA')),
          };
          gameState._headlessMatchLog = [...(gameState._headlessMatchLog ?? []), entry0].slice(-150);
        }

        // Drena filas visuais — mid não grava frames nem coleta VFX
        if (gameState.vfxQueue?.length > 0) gameState.vfxQueue.length = 0;
        if (gameState.pendingHitLabels?.length > 0) gameState.pendingHitLabels.length = 0;

        points++;
      }

      return gameState;
    });
  } finally {
    cleanupTempKeys(ca, cb);
  }

  for (const p of gs.players) {
    if (p._attrsBeforeInjury) {
      p.attrs = { ...p._attrsBeforeInjury };
      p._attrsBeforeInjury = null;
    }
  }

  const [pA, pB] = gs.players;
  const aWon = pA.sets > pB.sets;
  const winner = aWon ? pA : pB;
  const loser  = aWon ? pB : pA;

  const setsDetail = [];
  const hA = pA.setsHistory ?? [];
  const hB = pB.setsHistory ?? [];
  const setCount = Math.max(hA.length, hB.length);
  for (let i = 0; i < setCount; i++) {
    setsDetail.push([hA[i] ?? 0, hB[i] ?? 0]);
  }

  for (const p of [pA, pB]) {
    p.stats.avgQuality = p.stats.qualityCount > 0
      ? Math.round((p.stats.qualitySum / p.stats.qualityCount) * 1000) / 1000
      : null;
  }

  const traitMetrics = {
    a: {
      tiebreaksWon:    pA.stats.tiebreaksWon    ?? 0,
      matchPointsSaved: pA.stats.matchPointsSaved ?? 0,
    },
    b: {
      tiebreaksWon:    pB.stats.tiebreaksWon    ?? 0,
      matchPointsSaved: pB.stats.matchPointsSaved ?? 0,
    },
  };

  return {
    winner,
    loser,
    sets: [pA.sets, pB.sets],
    setsDetail,
    stats: { a: pA.stats, b: pB.stats },
    traitMetrics,
    heat: gs.heat
      ? { score: Math.round(gs.heat.score), peak: Math.round(gs.heat.peak), tier: heatScoreToTier(gs.heat.peak) }
      : null,
    retirement:          gs.matchRetirement ?? null,
    inMatchInjuryEvents: gs.inMatchInjuryEvents ?? [],
    log:   gs.log,
    gs,
    ticks,
    points,
  };
}

// ═══════════════════════════════════════════════════════════════════
// SIMULATE & COLLECT HIGHLIGHTS  — Cinematic Reel Edition
// ═══════════════════════════════════════════════════════════════════

/**
 * Simula a partida completa headless e retorna o resultado mais uma
 * lista rica de clips (allClips) ordenados cronologicamente.
 * Cada clip é um snapshot do PRE_SERVE pronto para reprodução ao vivo.
 *
 * Tipos detectados:
 *   MATCH_POINT · SET_POINT · TIEBREAK_CRITICAL
 *   EPIC_RALLY · EPIC_RALLY_CLUTCH
 *   BREAK_POINT · GAME_POINT · FIFTH_SET_OPENER
 *   FINAL_POINT
 *
 * @returns {{ result, allClips }}
 */
export function simulateAndCollectHighlights(
  configA, configB,
  courtKey = 'US_OPEN', bestOf = 3,
  rivalSystem = null, isSlam = false, matchMeta = null,
) {
  const ca = resolvePlayerConfig(configA);
  const cb = resolvePlayerConfig(configB);

  const SCORE_LABELS = ['0', '15', '30', '40', 'Ad'];
  const setsToWin   = Math.ceil(bestOf / 2);

  // ── Clip metadata ────────────────────────────────────────────────
  const CLIP_META = {
    FINAL_POINT:        { label: 'PONTO FINAL',        color: '#E8C84A', priority: 101 },
    MATCH_POINT:        { label: 'MATCH POINT',        color: '#FF3333', priority: 100 },
    FIFTH_SET_OPENER:   { label: '5º SET',             color: '#FF6B9D', priority: 90  },
    EPIC_RALLY_CLUTCH:  { label: 'RALLY DECISIVO',     color: '#00E5FF', priority: 85  },
    TIEBREAK_CRITICAL:  { label: 'TIEBREAK',           color: '#C84FEB', priority: 80  },
    SET_POINT:          { label: 'SET POINT',          color: '#FFD700', priority: 70  },
    EPIC_RALLY:         { label: 'RALLY ÉPICO',        color: '#4FC3F7', priority: 60  },
    BREAK_POINT:        { label: 'BREAK',               color: '#FF8C42', priority: 50  },
    GAME_POINT:         { label: 'GAME CONFIRMADO',    color: '#66BB6A', priority: 30  },
  };

  // ── Helpers ───────────────────────────────────────────────────────
  function fmtScore(gs) {
    const p0 = gs.players[0], p1 = gs.players[1];
    if (gs.inTiebreak) return `TB ${gs.tbScore[0]}\u2013${gs.tbScore[1]}`;
    const sg = SCORE_LABELS[p0.score] ?? p0.score;
    const rg = SCORE_LABELS[p1.score] ?? p1.score;
    return `${p0.games}\u2013${p1.games}  (${sg}\u2013${rg})`;
  }

  function fmtSubtitle(gs) {
    const p0 = gs.players[0], p1 = gs.players[1];
    const totalSets = p0.sets + p1.sets;
    const setNum = totalSets + 1;
    if (p0.sets === p1.sets) return `${setNum}º set  \u00b7  Sets empatados ${p0.sets}\u2013${p1.sets}`;
    const leader = p0.sets > p1.sets ? p0.name.split(' ').pop() : p1.name.split(' ').pop();
    return `${setNum}º set  \u00b7  ${leader} lidera ${Math.max(p0.sets,p1.sets)}\u2013${Math.min(p0.sets,p1.sets)}`;
  }

  function fmtContext(type, gs, rallyLen) {
    const sv = gs.players[gs.server];
    const rv = gs.players[gs.receiver];
    const p0 = gs.players[0], p1 = gs.players[1];
    const svN = sv.name, rvN = rv.name;
    const SCORE_LABELS_LOCAL = ['0', '15', '30', '40', 'Ad'];
    // Always show score from P0 perspective so it matches the intro card
    const g0str = p0.games, g1str = p1.games;
    const pts0 = gs.inTiebreak ? String(gs.tbScore[0]) : (SCORE_LABELS_LOCAL[p0.score] ?? p0.score);
    const pts1 = gs.inTiebreak ? String(gs.tbScore[1]) : (SCORE_LABELS_LOCAL[p1.score] ?? p1.score);
    const scoreStr = gs.inTiebreak
      ? `TB ${gs.tbScore[0]}\u2013${gs.tbScore[1]}`
      : `${g0str}\u2013${g1str} (${pts0}\u2013${pts1})`;
    switch (type) {
      case 'MATCH_POINT': {
        // Determine who actually has the match point based on game/break point ownership,
        // not just set count (equal-set case like 1-1 in Bo3 would wrongly show server).
        let mpHolderIsServer;
        if (gs.inTiebreak) {
          mpHolderIsServer = gs.tbScore[gs.server] >= 6 && gs.tbScore[gs.server] > gs.tbScore[gs.receiver];
        } else {
          const isGP = sv.score >= 3 && (sv.score > rv.score || sv.score === 4);
          mpHolderIsServer = isGP && sv.sets === setsToWin - 1;
        }
        const mpHolder = mpHolderIsServer ? svN : rvN;
        return `Match point para ${mpHolder} — ${scoreStr}`;
      }
      case 'SET_POINT': {
        let spHolderName;
        if (gs.inTiebreak) {
          // In tiebreak compare TB score, not game count (both have 6 games)
          spHolderName = gs.tbScore[gs.server] >= gs.tbScore[gs.receiver] ? svN : rvN;
          return `Set point para ${spHolderName} — TB ${gs.tbScore[0]}\u2013${gs.tbScore[1]}`;
        }
        spHolderName = sv.games > rv.games ? svN : rvN;
        return `Set point para ${spHolderName} — ${scoreStr}`;
      }
      case 'BREAK_POINT':
        return `Break de ${rvN} — ${scoreStr}`;
      case 'GAME_POINT':
        return `Game de ${svN} — ${scoreStr}`;
      case 'TIEBREAK_CRITICAL':
        return `Tiebreak ${gs.tbScore[0]}\u2013${gs.tbScore[1]} — cada ponto vale tudo`;
      case 'EPIC_RALLY':
        return `Rally de ${rallyLen} bolas — tênis puro`;
      case 'EPIC_RALLY_CLUTCH':
        return `Rally de ${rallyLen} bolas num momento decisivo`;
      case 'FIFTH_SET_OPENER':
        return 'O set decisivo. Tudo o que veio antes foi prelúdio';
      case 'FINAL_POINT':
        return 'O último ponto desta partida';
      default: return '';
    }
  }

  function deepCloneGs(gs) {
    try {
      const clean = {
        ...gs,
        players: gs.players.map(p => ({
          ...p,
          stats: { ...p.stats, rallyLengths: [] },
        })),
        log: [], techLog: [], _ptBuf: [],
        vfxQueue: [], pendingHitLabels: [],
        pendingFlash: null, pendingScreenFx: null,
        bounceLog: (gs.bounceLog ?? []).slice(-30),
      };
      return JSON.parse(JSON.stringify(clean));
    } catch { return null; }
  }

  function captureReplayFrame(gs, trail, frameIdx) {
    return {
      frameIdx,
      players: (gs.players ?? []).map((p) => ({
        id: p.id,
        pos: { ...(p.pos ?? {}) },
        vel: { ...(p.vel ?? {}) },
        atNet: !!p.atNet,
        stamina: p.stamina ?? 1,
        ctx: p.ctx ? {
          currentIntent: p.ctx.currentIntent ?? null,
          courtMode: p.ctx.courtMode ?? null,
          lastShotType: p.ctx.lastShotType ?? null,
        } : null,
      })),
      ball: {
        ...(gs.ball ?? {}),
        pos: { ...(gs.ball?.pos ?? {}) },
        vel: { ...(gs.ball?.vel ?? {}) },
      },
      gameState: gs.gameState,
      rally: gs.rally ?? 0,
      totalPoints: gs.totalPoints ?? 0,
      server: gs.server ?? 0,
      receiver: gs.receiver ?? 1,
      inTiebreak: !!gs.inTiebreak,
      tbScore: gs.tbScore ? [...gs.tbScore] : [0, 0],
      pointHistory: gs.pointHistory ? [...gs.pointHistory] : [],
      lastShotEvent: gs.lastShotEvent ? JSON.parse(JSON.stringify(gs.lastShotEvent)) : null,
      lastBouncePos: gs.lastBouncePos ? { ...gs.lastBouncePos } : null,
      pendingHitLabels: gs.pendingHitLabels ? JSON.parse(JSON.stringify(gs.pendingHitLabels)) : [],
      pendingOutcomeLabels: gs.pendingOutcomeLabels ? JSON.parse(JSON.stringify(gs.pendingOutcomeLabels)) : [],
      pendingFlash: gs.pendingFlash ? { ...gs.pendingFlash } : null,
      pendingScreenFx: gs.pendingScreenFx ? JSON.parse(JSON.stringify(gs.pendingScreenFx)) : null,
      trail: trail.map((t) => ({ ...t })),
    };
  }

  function classify(gs) {
    const sv = gs.players[gs.server];
    const rv = gs.players[gs.receiver];
    let isGP = false, isBP = false;
    if (gs.inTiebreak) {
      isGP = gs.tbScore[gs.server] >= 6 && gs.tbScore[gs.server] > gs.tbScore[gs.receiver];
      isBP = gs.tbScore[gs.receiver] >= 6 && gs.tbScore[gs.receiver] > gs.tbScore[gs.server];
    } else {
      isGP = sv.score >= 3 && (sv.score > rv.score || sv.score === 4);
      isBP = rv.score >= 3 && (rv.score > sv.score || rv.score === 4);
    }

    // Set point: winning THIS game would win the set.
    // Normal set: win 6 with ≥2 lead, or 7-5.
    // Bug fix: at 5-5 (sv.games=5, rv.games=5), isGP && sv.games>=5 was TRUE
    // but winning only makes 6-5 (not enough to win the set). Must check rv.games < sv.games.
    let isSP = false;
    if (gs.inTiebreak) {
      isSP = isGP || isBP;
    } else {
      // Server set point: sv.games+1 wins the set (needs ≥6 with ≥2 lead)
      const svClosesSet = isGP && sv.games >= 5 && rv.games < sv.games;
      // Receiver set point: rv.games+1 wins the set (needs ≥6 with ≥2 lead)
      const rvClosesSet = isBP && rv.games >= 5 && sv.games < rv.games;
      isSP = svClosesSet || rvClosesSet;
    }

    // Match point: winner of this set wins the match
    const isMP = isSP && (
      (isGP && sv.sets === setsToWin - 1) ||
      (isBP && rv.sets === setsToWin - 1)
    );

    const isTbCritical = gs.inTiebreak && !isSP &&
      Math.min(gs.tbScore[0], gs.tbScore[1]) >= 5 &&
      Math.abs(gs.tbScore[0] - gs.tbScore[1]) <= 1;

    return { isGP, isBP, isSP, isMP, isTbCritical };
  }

  function makeClip(type, gs, snap, chronIdx, extra = {}) {
    const meta = CLIP_META[type];
    const sv = gs.players[gs.server];
    const rv = gs.players[gs.receiver];
    // momentHolderIdx: the player index who "has" this moment
    // Used by the UI to highlight the right player on the intro card
    let momentHolderIdx = gs.server; // default: server
    if (type === 'BREAK_POINT') momentHolderIdx = gs.receiver;  // receiver has the break point
    if (type === 'MATCH_POINT') {
      // Must check who actually has the game/break point, not just set count.
      // At equal sets (e.g., 1-1 in Bo3) sv.sets === setsToWin-1 is TRUE for BOTH players,
      // so we use GP/BP ownership to decide.
      let holderIsServer;
      if (gs.inTiebreak) {
        holderIsServer = gs.tbScore[gs.server] >= 6 && gs.tbScore[gs.server] > gs.tbScore[gs.receiver];
      } else {
        const isGPLocal = sv.score >= 3 && (sv.score > rv.score || sv.score === 4);
        holderIsServer = isGPLocal && sv.sets === setsToWin - 1;
      }
      momentHolderIdx = holderIsServer ? gs.server : gs.receiver;
    }
    if (type === 'SET_POINT') {
      // In tiebreak both players have 6 games — must compare TB score instead.
      if (gs.inTiebreak) {
        momentHolderIdx = gs.tbScore[gs.server] >= gs.tbScore[gs.receiver] ? gs.server : gs.receiver;
      } else {
        momentHolderIdx = sv.games > rv.games ? gs.server : gs.receiver;
      }
    }
    // EPIC_RALLY / TIEBREAK_CRITICAL / FIFTH_SET_OPENER / FINAL_POINT: both players, default server
    return {
      type,
      label:          meta.label,
      color:          meta.color,
      priority:       meta.priority,
      chronIdx,
      serverName:     sv.name,
      receiverName:   rv.name,
      serverIdx:      gs.server,
      momentHolderIdx,
      score:          fmtScore(gs),
      subtitle:       fmtSubtitle(gs),
      s0: gs.players[0].sets,
      s1: gs.players[1].sets,
      g0: gs.players[0].games,
      g1: gs.players[1].games,
      rallyLength:    0,
      contextLine:    fmtContext(type, gs, 0),
      gsSnapshot:     snap,
      ...extra,
    };
  }

  // ── Collection state ─────────────────────────────────────────────
  const rawClips = [];   // may have multiple per chronIdx; deduped after
  let chronIdx = 0;
  let lastSetKey      = null;
  let lastSnapshot    = null;   // last PRE_SERVE snapshot
  let lastClsState    = null;   // last PRE_SERVE classify result
  let lastMeta        = null;   // { chronIdx }
  let lastGs          = null;   // gs reference at last PRE_SERVE (for context only)
  let lastReplayFrames = null;
  let ticks = 0, points = 0;
  let gs;

  try {
    gs = runHeadless((pending) => {
      const gameState = initGameState(
        ca.styleId, cb.styleId,
        ca.namedKey, cb.namedKey,
        courtKey, bestOf,
        rivalSystem,
      );
      gameState.isSlam = isSlam;

      if (matchMeta) {
        let rivalry = null;
        if (rivalSystem && ca.namedKey && cb.namedKey) {
          try { rivalry = rivalSystem.getRivalry(ca.namedKey, cb.namedKey) ?? null; } catch {}
        }
        gameState.crowdPressure = computeCrowdPressure(
          gameState,
          matchMeta.category ?? (isSlam ? 'GRAND_SLAM' : 'ATP_250'),
          matchMeta.round ?? 'R32',
          rivalry,
        );
      } else if (isSlam) {
        gameState.crowdPressure = computeCrowdPressure(gameState, 'GRAND_SLAM', 'R32', null);
      }

      while (gameState.gameState !== GameState.GAME_OVER && points < MAX_POINTS_PER_MATCH) {

        // ── PRE_SERVE: snapshot + classify ──────────────────────────
        if (gameState.gameState === GameState.PRE_SERVE) {
          const snap = deepCloneGs(gameState);
          const cls  = classify(gameState);
          const p0   = gameState.players[0];
          const p1   = gameState.players[1];
          const setKey = `${p0.sets}-${p1.sets}`;

          lastSnapshot  = snap;
          lastClsState  = cls;
          lastMeta      = { chronIdx };
          lastGs        = gameState;

          // 5th set opener (BO5 only)
          if (lastSetKey !== null && setKey !== lastSetKey && snap) {
            const isFifth = (p0.sets + p1.sets) === 4 && bestOf === 5;
            if (isFifth) rawClips.push(makeClip('FIFTH_SET_OPENER', gameState, snap, chronIdx));
          }
          lastSetKey = setKey;

          // ── Score-critical clips (hierarchy: MP > SP > TB > BP > GP) ──
          if (snap && cls.isMP) {
            rawClips.push(makeClip('MATCH_POINT', gameState, snap, chronIdx));
          } else if (snap && cls.isSP) {
            rawClips.push(makeClip('SET_POINT', gameState, snap, chronIdx));
          } else if (snap && cls.isTbCritical) {
            rawClips.push(makeClip('TIEBREAK_CRITICAL', gameState, snap, chronIdx));
          } else if (snap && cls.isBP) {
            // Break point — captured immediately (always shown in extended)
            rawClips.push(makeClip('BREAK_POINT', gameState, snap, chronIdx));
          } else if (snap && cls.isGP) {
            // Plain game point for server
            rawClips.push(makeClip('GAME_POINT', gameState, snap, chronIdx));
          }
        }

        // Record pre-point state for rally analysis
        const preG0 = gameState.players[0].games, preG1 = gameState.players[1].games;
        const preS0 = gameState.players[0].sets,  preS1 = gameState.players[1].sets;

        // ── Run PRE_SERVE ticks until SERVING begins ───────────────────────
        // We run PRE_SERVE normally so player positions are exact.
        // Once SERVING starts we take a serveSnapshot — this is the true
        // starting state for deterministic replay (exact positions, stateTimer=0).
        let ticksThisPoint = 0;
        while (
          gameState.gameState === GameState.PRE_SERVE &&
          ticksThisPoint < 300
        ) {
          gameTick(gameState, DT_HEADLESS);
          ticksThisPoint++;
          ticks++;
        }
        // Snapshot taken the moment SERVING begins — identical state to what
        // the live replay will load, so physics are perfectly aligned.
        const serveSnapshot = gameState.gameState === GameState.SERVING
          ? deepCloneGs(gameState)
          : null;

        // ── Run the rest of the point — record random sequence ─────────────
        // Recording starts here (SERVING), matching where the live replay
        // begins consuming randoms after loading serveSnapshot.
        const randomSequence = [];
        const replayFrames = [];
        const replayTrail = [];
        let replayFrameIdx = 0;
        let sampleTickCounter = 0;
        if (serveSnapshot) {
          replayFrames.push(captureReplayFrame(gameState, replayTrail, replayFrameIdx++));
        }
        const _origRandom = Math.random;
        Math.random = () => { const v = _origRandom(); randomSequence.push(v); return v; };

        try {
          while (
            gameState.gameState !== GameState.POINT_END &&
            gameState.gameState !== GameState.GAME_OVER &&
            ticksThisPoint < MAX_TICKS_PER_POINT
          ) {
            if (gameState.gameState === 'MEDICAL_TIMEOUT' && gameState.mto && !gameState.mto.decided) {
              gameState.stateTimer = (gameState.mto.durationSecs ?? 0) + 1;
            }
            gameTick(gameState, DT_HEADLESS);
            ticksThisPoint++;
            ticks++;
            sampleTickCounter++;

            if (gameState.ball?.inFlight && gameState.ball?.pos) {
              replayTrail.push({ ...gameState.ball.pos });
              if (replayTrail.length > REPLAY_TRAIL_LEN) replayTrail.shift();
            }
            if (
              replayFrames.length < MAX_REPLAY_FRAMES_PER_POINT &&
              sampleTickCounter % REPLAY_SAMPLE_EVERY_TICKS === 0
            ) {
              replayFrames.push(captureReplayFrame(gameState, replayTrail, replayFrameIdx++));
            }
          }
        } finally {
          Math.random = _origRandom;
        }
        if (
          replayFrames.length < MAX_REPLAY_FRAMES_PER_POINT &&
          (
            replayFrames.length === 0 ||
            replayFrames[replayFrames.length - 1].gameState !== gameState.gameState ||
            replayFrames[replayFrames.length - 1].rally !== (gameState.rally ?? 0)
          )
        ) {
          replayFrames.push(captureReplayFrame(gameState, replayTrail, replayFrameIdx++));
        }

        const cbs = pending.splice(0);
        for (const cb of cbs) cb();

        // ── Post-point: annotate clips with point winner + replay data ─────
        const pointWinnerIdx = gameState.pointWinnerIdx ?? 0;
        if (lastMeta) {
          for (let k = rawClips.length - 1; k >= 0; k--) {
            if (rawClips[k].chronIdx === lastMeta.chronIdx) {
              rawClips[k] = { ...rawClips[k], pointWinnerIdx, randomSequence, serveSnapshot, replayFrames };
            }
          }
        }

        // ── Post-point: epic rally detection ──────────────────────
        const rallyLen = gameState.rally ?? 0;
        const postS0 = gameState.players[0].sets, postS1 = gameState.players[1].sets; // eslint-disable-line no-unused-vars
        const isCritical = lastClsState && (lastClsState.isMP || lastClsState.isSP || lastClsState.isTbCritical);

        if (lastSnapshot && lastMeta && lastGs) {
          const RALLY_EPIC   = 10;   // standalone epic rally (lowered from 13 — show more long rallies)
          const RALLY_CLUTCH =  7;   // rally on a critical moment gets upgraded (lowered from 10)

          if (isCritical && rallyLen >= RALLY_CLUTCH) {
            // Find the clip for this chronIdx and upgrade it to EPIC_RALLY_CLUTCH
            for (let k = rawClips.length - 1; k >= 0; k--) {
              if (rawClips[k].chronIdx === lastMeta.chronIdx) {
                rawClips[k] = {
                  ...rawClips[k],
                  type:           'EPIC_RALLY_CLUTCH',
                  label:          CLIP_META.EPIC_RALLY_CLUTCH.label,
                  color:          CLIP_META.EPIC_RALLY_CLUTCH.color,
                  priority:       CLIP_META.EPIC_RALLY_CLUTCH.priority,
                  rallyLength:    rallyLen,
                  contextLine:    fmtContext('EPIC_RALLY_CLUTCH', lastSnapshot, rallyLen),
                  pointWinnerIdx,
                  randomSequence,
                  serveSnapshot,
                  replayFrames,
                };
                break;
              }
            }
          } else if (!isCritical && rallyLen >= RALLY_EPIC) {
            rawClips.push({
              ...makeClip('EPIC_RALLY', lastSnapshot, lastSnapshot, lastMeta.chronIdx),
              rallyLength:    rallyLen,
              contextLine:    fmtContext('EPIC_RALLY', lastSnapshot, rallyLen),
              pointWinnerIdx,
              randomSequence,
              serveSnapshot,
              replayFrames,
            });
          }
        }

        if (gameState.vfxQueue?.length > 0)        gameState.vfxQueue.length = 0;
        if (gameState.pendingHitLabels?.length > 0) gameState.pendingHitLabels.length = 0;

        lastReplayFrames = replayFrames;
        chronIdx++;
        points++;
      }

      // ── Always push the final point into rawClips ──────────────
      // IMPORTANT: use lastSnapshot (deep clone at PRE_SERVE), NOT lastGs.
      // After the final point, gameState mutates: games/score reset to 0-0
      // for the "next game" that never starts. lastGs is a live reference —
      // reading it here would produce score "0-0 (0-0)" instead of the real score.
      // FINAL_POINT has priority 101 (beats MATCH_POINT at 100) so dedup
      // will always keep it when both exist for the same chronIdx.
      if (lastSnapshot && lastMeta) {
        const fpWinnerIdx = gameState.pointWinnerIdx ?? 0;
        const fpClip = makeClip('FINAL_POINT', lastSnapshot, lastSnapshot, chronIdx - 1);
        rawClips.push({
          ...fpClip,
          contextLine:     fmtContext('FINAL_POINT', lastSnapshot, 0),
          pointWinnerIdx:  fpWinnerIdx,
          momentHolderIdx: fpWinnerIdx, // campeão = detentor do ponto final
          replayFrames: lastReplayFrames ?? [],
        });
      }

      return gameState;
    });
  } finally {
    cleanupTempKeys(ca, cb);
  }

  // ── Deduplicate by chronIdx (keep highest priority per point) ─────
  const byChron = {};
  for (const clip of rawClips) {
    const existing = byChron[clip.chronIdx];
    if (!existing || clip.priority > existing.priority) {
      byChron[clip.chronIdx] = clip;
    }
  }
  let allClips = Object.values(byChron).sort((a, b) => a.chronIdx - b.chronIdx);

  // ── Per-game dedup: GAME_POINT, BREAK_POINT and SET_POINT ───────────────────
  // Multiple clips with the same type+game can exist (e.g., 3 break points in
  // a game before a break). Keep only the LAST converted one (decisive moment).
  // If no converted clip exists for that game, keep the last one regardless.
  const GP_TYPES = new Set(['GAME_POINT', 'BREAK_POINT', 'SET_POINT']);
  const seenGameConverted = {}; // key → last CONVERTED clip chronIdx
  const seenGameAny      = {}; // key → last clip chronIdx (fallback)
  for (const clip of allClips) {
    if (!GP_TYPES.has(clip.type)) continue;
    const key = `${clip.type}|${clip.s0}|${clip.s1}|${clip.g0}|${clip.g1}`;
    seenGameAny[key] = clip.chronIdx;
    if (clip.pointWinnerIdx === clip.momentHolderIdx) {
      seenGameConverted[key] = clip.chronIdx;
    }
  }
  allClips = allClips.filter(clip => {
    if (!GP_TYPES.has(clip.type)) return true;
    const key = `${clip.type}|${clip.s0}|${clip.s1}|${clip.g0}|${clip.g1}`;
    // Prefer converted clip; fallback to last any
    const target = seenGameConverted[key] ?? seenGameAny[key];
    return clip.chronIdx === target;
  });

  // ── Debug: log all collected clips ───────────────────────────────
  console.group(`[HL-SIM] ${allClips.length} clips coletados (${points} pontos simulados)`);
  allClips.forEach((c, i) => {
    const holder = c.momentHolderIdx === 0 ? gs.players[0].name : gs.players[1].name;
    const winner = c.pointWinnerIdx  === 0 ? gs.players[0].name : gs.players[1].name;
    const conv   = c.pointWinnerIdx === c.momentHolderIdx ? '✔ convertido' : '✖ salvo/perdido';
    console.log(
      `#${String(i+1).padStart(2)} chron=${c.chronIdx} [${c.type}]` +
      `  sets=${c.s0}-${c.s1}  games=${c.g0}-${c.g1}  score="${c.score}"` +
      `  holder=${holder}  winner=${winner}  ${conv}` +
      (c.rallyLength > 0 ? `  rally=${c.rallyLength}` : '') +
      `  | "${c.contextLine}"`
    );
  });
  console.groupEnd();

  // ── Build result ─────────────────────────────────────────────────
  const [pA, pB] = gs.players;
  const aWon = pA.sets > pB.sets;
  const winner = aWon ? pA : pB;
  const loser  = aWon ? pB : pA;

  const setsDetail = [];
  const hA = pA.setsHistory ?? [];
  const hB = pB.setsHistory ?? [];
  for (let i = 0; i < Math.max(hA.length, hB.length); i++) {
    setsDetail.push([hA[i] ?? 0, hB[i] ?? 0]);
  }

  for (const p of [pA, pB]) {
    p.stats.avgQuality = p.stats.qualityCount > 0
      ? Math.round((p.stats.qualitySum / p.stats.qualityCount) * 1000) / 1000
      : null;
  }

  const result = {
    winner, loser,
    sets: [pA.sets, pB.sets],
    setsDetail,
    stats: { a: pA.stats, b: pB.stats },
    heat: gs.heat
      ? { score: Math.round(gs.heat.score), peak: Math.round(gs.heat.peak), tier: heatScoreToTier(gs.heat.peak) }
      : null,
    retirement:          gs.matchRetirement ?? null,
    inMatchInjuryEvents: gs.inMatchInjuryEvents ?? [],
    log: gs.log,
    gs, ticks, points,
  };

  return { result, allClips };
}

// ═══════════════════════════════════════════════════════════════════
// TORNEIO HEADLESS — bracket de eliminatória simples
// ═══════════════════════════════════════════════════════════════════

/**
 * Simula um torneio de eliminatória simples com N jogadores (potência de 2).
 * Usa o engine completo em cada partida — não OVR aproximado.
 *
 * @param {object[]} players   — array de objetos player (NAMED_PLAYERS ou newgens)
 * @param {string}   surface   — 'CLAY'|'GRASS'|'HARD'|'INDOOR' para escolher quadra
 * @returns {{ rounds, champion, results }}
 */
export function simulateTournamentHeadless(players, surface = 'HARD') {
  // Mapa surface → courtKey
  const SURFACE_COURT = {
    CLAY:   'ROLAND_GARROS',
    GRASS:  'WIMBLEDON',
    HARD:   'US_OPEN',
    INDOOR: 'O2_ARENA',
  };
  const courtKey = SURFACE_COURT[surface] ?? 'US_OPEN';

  // Shuffle bracket
  const seeded = [...players].sort(() => Math.random() - 0.5);

  // Garantir número par (elimina o último se ímpar)
  const bracket = seeded.length % 2 === 0 ? seeded : seeded.slice(0, seeded.length - 1);

  const rounds = [];
  let current = bracket;

  while (current.length > 1) {
    const roundMatches = [];
    const nextRound = [];

    for (let i = 0; i < current.length; i += 2) {
      const pA = current[i];
      const pB = current[i + 1];

      const result = simulateMatchHeadless(
        { playerData: pA },
        { playerData: pB },
        courtKey,
      );

      // gs.players[0] = configA = pA sempre — comparar sets para saber quem venceu
      const aWon = result.sets[0] > result.sets[1];
      const winner = aWon ? pA : pB;
      const loser  = aWon ? pB : pA;

      roundMatches.push({
        playerA: pA,
        playerB: pB,
        winner,
        loser,
        sets:       result.sets,
        setsDetail: result.setsDetail,
        stats:      result.stats,
      });

      nextRound.push(winner);
    }

    rounds.push(roundMatches);
    current = nextRound;
  }

  const champion = current[0];

  // Resultados indexados por player ID: qual rodada cada jogador alcançou
  const results = {};
  for (let ri = 0; ri < rounds.length; ri++) {
    const label = ['R32', 'R16', 'QF', 'SF', 'F'][ri] ?? `R${ri + 1}`;
    for (const m of rounds[ri]) {
      results[m.loser.id] = { roundReached: label, roundIndex: ri };
    }
  }
  if (champion) {
    results[champion.id] = { roundReached: 'W', roundIndex: rounds.length };
  }

  return { rounds, champion, results };
}

// ── Yield helper: libera a main thread por 1 frame ──────────────
function yieldToMain() {
  return new Promise(resolve => setTimeout(resolve, 0));
}

/**
 * Versão assíncrona do torneio — mesma lógica mas libera a main thread
 * entre cada partida (yield via setTimeout(0)).
 *
 * Recebe onProgress(matchIndex, totalMatches) para atualizar loading.
 *
 * @param {object[]} players
 * @param {string}   surface
 * @param {function} [onProgress]
 * @returns {Promise<TournamentResult>}
 */
export async function simulateTournamentHeadlessAsync(players, surface = 'HARD', onProgress = null, bestOf = 3) {
  const SURFACE_COURT = {
    CLAY:   'ROLAND_GARROS',
    GRASS:  'WIMBLEDON',
    HARD:   'US_OPEN',
    INDOOR: 'O2_ARENA',
  };
  const courtKey = SURFACE_COURT[surface] ?? 'US_OPEN';

  const seeded = [...players].sort(() => Math.random() - 0.5);
  const bracket = seeded.length % 2 === 0 ? seeded : seeded.slice(0, seeded.length - 1);

  // Total de partidas = N-1 (torneio de eliminatória simples)
  const totalMatches = bracket.length - 1;
  let matchIndex = 0;

  const rounds = [];
  let current = bracket;

  while (current.length > 1) {
    const roundMatches = [];
    const nextRound = [];

    for (let i = 0; i < current.length; i += 2) {
      const pA = current[i];
      const pB = current[i + 1];

      // ── Yield antes de cada partida — libera o browser ──────────
      await yieldToMain();

      const result = simulateMatchHeadless(
        { playerData: pA },
        { playerData: pB },
        courtKey,
        bestOf,
      );

      // gs.players[0] = configA = pA sempre — comparar sets para saber quem venceu
      const aWon = result.sets[0] > result.sets[1];
      const winner = aWon ? pA : pB;
      const loser  = aWon ? pB : pA;

      roundMatches.push({
        playerA: pA,
        playerB: pB,
        winner,
        loser,
        sets:       result.sets,
        setsDetail: result.setsDetail,
        stats:      result.stats,
      });

      nextRound.push(winner);
      matchIndex++;

      if (onProgress) onProgress(matchIndex, totalMatches);
    }

    rounds.push(roundMatches);
    current = nextRound;
  }

  const champion = current[0];

  const results = {};
  for (let ri = 0; ri < rounds.length; ri++) {
    const label = ['R32', 'R16', 'QF', 'SF', 'F'][ri] ?? `R${ri + 1}`;
    for (const m of rounds[ri]) {
      results[m.loser.id] = { roundReached: label, roundIndex: ri };
    }
  }
  if (champion) {
    results[champion.id] = { roundReached: 'W', roundIndex: rounds.length };
  }

  return { rounds, champion, results };
}

// ═══════════════════════════════════════════════════════════════════
// HELPERS DE FORMATAÇÃO
// ═══════════════════════════════════════════════════════════════════

function fmtScore(result) {
  if (!result.setsDetail.length) return `${result.sets[0]}-${result.sets[1]}`;
  return result.setsDetail
    .map(([a, b]) => `${a}-${b}`)
    .join(' ');
}

function fmtStats(stats, name) {
  const s = stats;
  const serve1Pct = s.serve1Total > 0
    ? `${Math.round(s.serve1In / s.serve1Total * 100)}%`
    : '—';
  const serve2Pct = s.serve2Total > 0
    ? `${Math.round(s.serve2In / s.serve2Total * 100)}%`
    : '—';
  const avgRally = s.rallyLengths?.length > 0
    ? (s.rallyLengths.reduce((a, b) => a + b, 0) / s.rallyLengths.length).toFixed(1)
    : '—';
  return [
    `${name}`,
    `  Aces: ${s.aces}  DF: ${s.doubleFaults}`,
    `  1º Srv: ${serve1Pct} (${Math.round(s.serve1AvgKmh ?? 0)} km/h)`,
    `  2º Srv: ${serve2Pct} (${Math.round(s.serve2AvgKmh ?? 0)} km/h)`,
    `  Winners: ${s.winners}  UE: ${s.unforcedErrors}  FE: ${s.forcedErrors}`,
    s.avgQuality != null ? `  Q Médio Rally: ${Math.round(s.avgQuality * 100)}%` : null,
    `  Rally médio: ${avgRally}`,
  ].filter(Boolean).join('\n');
}

// ═══════════════════════════════════════════════════════════════════
// COMPONENTE REACT — HeadlessUI (testes / visualização de resultado)
// ═══════════════════════════════════════════════════════════════════

const HUI = {
  bg:        '#0A0A0A',
  bgPanel:   '#141414',
  bgLight:   '#1C1C1C',
  border:    'rgba(255,255,255,.10)',
  white:     '#FFFFFF',
  clay:      '#C4572A',
  grass:     '#4A9B3F',
  gold:      '#FFD700',
  textDim:   'rgba(255,255,255,.55)',
  textFaint: 'rgba(255,255,255,.28)',
  mono:      "'DM Mono', monospace",
  display:   "'Oswald', sans-serif",
  body:      "'Source Sans 3', sans-serif",
};

const ALL_NAMED_KEYS = Object.keys(NAMED_PLAYERS);
const SURFACE_OPTIONS = ['HARD', 'CLAY', 'GRASS', 'INDOOR'];
const COURT_MAP = {
  HARD:   'US_OPEN',
  CLAY:   'ROLAND_GARROS',
  GRASS:  'WIMBLEDON',
  INDOOR: 'O2_ARENA',
};

export default function HeadlessUI({ onBack }) {
  const [keyA, setKeyA]         = useState(ALL_NAMED_KEYS[0] ?? '');
  const [keyB, setKeyB]         = useState(ALL_NAMED_KEYS[1] ?? '');
  const [surface, setSurface]   = useState('HARD');
  const [result, setResult]     = useState(null);
  const [running, setRunning]   = useState(false);
  const [nSims, setNSims]       = useState(1);
  const [bulkResults, setBulkResults] = useState(null);

  // ── Simulação simples ─────────────────────────────────────────
  const handleSimulate = useCallback(() => {
    setRunning(true);
    setResult(null);
    setBulkResults(null);

    // defer para dar tempo do estado loading aparecer
    setTimeout(() => {
      try {
        const r = simulateMatchHeadless(
          { namedKey: keyA },
          { namedKey: keyB },
          COURT_MAP[surface] ?? 'US_OPEN',
        );
        setResult(r);
      } catch (e) {
        console.error('[Headless] Erro:', e);
      } finally {
        setRunning(false);
      }
    }, 0);
  }, [keyA, keyB, surface]);

  // ── Bulk simulation (N partidas) ──────────────────────────────
  const handleBulk = useCallback(() => {
    setRunning(true);
    setResult(null);
    setBulkResults(null);

    setTimeout(() => {
      try {
        const n = Math.max(1, Math.min(1000, nSims));
        let winsA = 0, winsB = 0;
        const totalStats = { a: createEmptyStats(), b: createEmptyStats() };
        let totalTicks = 0, totalPoints = 0;

        for (let i = 0; i < n; i++) {
          const r = simulateMatchHeadless(
            { namedKey: keyA },
            { namedKey: keyB },
            COURT_MAP[surface] ?? 'US_OPEN',
          );
          const [pA] = r.gs.players;
          if (pA.sets > r.gs.players[1].sets) winsA++; else winsB++;
          accStats(totalStats.a, r.stats.a);
          accStats(totalStats.b, r.stats.b);
          totalTicks  += r.ticks;
          totalPoints += r.points;
        }

        setBulkResults({
          n, winsA, winsB,
          pctA: Math.round(winsA / n * 100),
          pctB: Math.round(winsB / n * 100),
          avgStats: {
            a: divStats(totalStats.a, n),
            b: divStats(totalStats.b, n),
          },
          totalTicks,
          totalPoints,
          msPerMatch: '—',  // calculado no render
        });
      } catch (e) {
        console.error('[Headless] Bulk erro:', e);
      } finally {
        setRunning(false);
      }
    }, 0);
  }, [keyA, keyB, surface, nSims]);

  const npA = NAMED_PLAYERS[keyA];
  const npB = NAMED_PLAYERS[keyB];

  return (
    <div style={{
      background: HUI.bg, minHeight: '100vh', color: HUI.white,
      fontFamily: HUI.body, display: 'flex', flexDirection: 'column',
    }}>
      {/* Topbar */}
      <div style={{
        background: HUI.bgPanel, borderBottom: `1px solid ${HUI.border}`,
        padding: '12px 24px', display: 'flex', alignItems: 'center', gap: 16,
      }}>
        {onBack && (
          <button onClick={onBack} style={{
            background: 'none', border: `1px solid ${HUI.border}`, color: HUI.textDim,
            fontFamily: HUI.mono, fontSize: 10, letterSpacing: 2, padding: '4px 12px',
            cursor: 'pointer', textTransform: 'uppercase',
          }}>
            ← Voltar
          </button>
        )}
        <span style={{
          fontFamily: HUI.display, fontWeight: 700, fontSize: 16, letterSpacing: 4,
          textTransform: 'uppercase', color: HUI.white,
        }}>
          HEADLESS ENGINE
        </span>
        <span style={{ fontFamily: HUI.mono, fontSize: 9, color: HUI.textFaint, letterSpacing: 2 }}>
          MOTOR COMPLETO · SEM RENDER · SÍNCRONO
        </span>
      </div>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* Painel de configuração */}
        <div style={{
          width: 320, flexShrink: 0, background: HUI.bgPanel,
          borderRight: `1px solid ${HUI.border}`, padding: '24px 20px',
          display: 'flex', flexDirection: 'column', gap: 20, overflowY: 'auto',
        }}>
          <Label>Jogador A</Label>
          <PlayerPicker value={keyA} onChange={setKeyA} keys={ALL_NAMED_KEYS} />
          {npA && <PlayerMini player={npA} color={HUI.clay} />}

          <Sep />

          <Label>Jogador B</Label>
          <PlayerPicker value={keyB} onChange={setKeyB} keys={ALL_NAMED_KEYS} />
          {npB && <PlayerMini player={npB} color='#00D4FF' />}

          <Sep />

          <Label>Superfície</Label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {SURFACE_OPTIONS.map(s => (
              <button key={s} onClick={() => setSurface(s)} style={{
                background: surface === s ? HUI.clay : HUI.bgLight,
                border: `1px solid ${surface === s ? HUI.clay : HUI.border}`,
                color: surface === s ? HUI.white : HUI.textDim,
                fontFamily: HUI.mono, fontSize: 9, letterSpacing: 3,
                padding: '5px 12px', cursor: 'pointer', textTransform: 'uppercase',
              }}>
                {s}
              </button>
            ))}
          </div>

          <Sep />

          {/* Simulação única */}
          <button onClick={handleSimulate} disabled={running || !keyA || !keyB} style={{
            background: running ? HUI.bgLight : HUI.clay,
            border: 'none', color: HUI.white,
            fontFamily: HUI.display, fontWeight: 600, fontSize: 14, letterSpacing: 3,
            padding: '12px', cursor: running ? 'wait' : 'pointer',
            textTransform: 'uppercase', opacity: !keyA || !keyB ? 0.4 : 1,
          }}>
            {running ? 'SIMULANDO…' : 'SIMULAR PARTIDA'}
          </button>

          <Sep />

          {/* Bulk */}
          <Label>Simulação em lote</Label>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              type="number" min={1} max={1000} value={nSims}
              onChange={e => setNSims(Number(e.target.value))}
              style={{
                flex: 1, background: HUI.bgLight, border: `1px solid ${HUI.border}`,
                color: HUI.white, fontFamily: HUI.mono, fontSize: 12,
                padding: '6px 10px', textAlign: 'center',
              }}
            />
            <span style={{ fontFamily: HUI.mono, fontSize: 10, color: HUI.textFaint }}>partidas</span>
          </div>
          <button onClick={handleBulk} disabled={running || !keyA || !keyB} style={{
            background: running ? HUI.bgLight : '#1A3A1A',
            border: `1px solid ${running ? HUI.border : '#4A9B3F'}`,
            color: running ? HUI.textFaint : '#4A9B3F',
            fontFamily: HUI.display, fontWeight: 600, fontSize: 13, letterSpacing: 3,
            padding: '10px', cursor: running ? 'wait' : 'pointer',
            textTransform: 'uppercase', opacity: !keyA || !keyB ? 0.4 : 1,
          }}>
            {running ? 'RODANDO…' : `BULK (${nSims}x)`}
          </button>
        </div>

        {/* Área de resultado */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px' }}>

          {!result && !bulkResults && !running && (
            <EmptyState />
          )}

          {running && (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              height: '50vh', flexDirection: 'column', gap: 16,
            }}>
              <div style={{ fontFamily: HUI.display, fontSize: 32, color: HUI.textFaint, letterSpacing: 4 }}>
                SIMULANDO
              </div>
              <div style={{ fontFamily: HUI.mono, fontSize: 10, color: HUI.textFaint, letterSpacing: 3 }}>
                MOTOR COMPLETO RODANDO…
              </div>
            </div>
          )}

          {result && !running && (
            <MatchResultView result={result} />
          )}

          {bulkResults && !running && (
            <BulkResultView
              bulk={bulkResults}
              nameA={NAMED_PLAYERS[keyA]?.name ?? keyA}
              nameB={NAMED_PLAYERS[keyB]?.name ?? keyB}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ── Sub-componentes de resultado ──────────────────────────────────

function MatchResultView({ result }) {
  const [pA, pB] = result.gs.players;
  const aWon = pA.sets > pB.sets;

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      {/* Placar principal */}
      <div style={{
        background: HUI.bgPanel, border: `1px solid ${HUI.border}`,
        borderTop: `3px solid ${HUI.gold}`, padding: '28px 32px',
        marginBottom: 24,
      }}>
        <div style={{ fontFamily: HUI.mono, fontSize: 9, letterSpacing: 5, color: HUI.gold, marginBottom: 16 }}>
          RESULTADO FINAL · {result.points} PONTOS · {result.ticks.toLocaleString()} TICKS
        </div>

        {/* Jogadores */}
        {[pA, pB].map((p, i) => {
          const won = i === 0 ? aWon : !aWon;
          const style = PLAY_STYLES[p.styleId];
          const ovr = p.attrs ? overallRating(p.attrs) : '—';
          return (
            <div key={p.id} style={{
              display: 'flex', alignItems: 'center', gap: 20,
              padding: '14px 0',
              borderBottom: i === 0 ? `1px solid ${HUI.border}` : 'none',
              opacity: won ? 1 : 0.55,
            }}>
              {won && <span style={{ fontSize: 20 }}>🏆</span>}
              {!won && <span style={{ width: 28 }} />}

              <div style={{ flex: 1 }}>
                <div style={{
                  fontFamily: HUI.display, fontWeight: 700, fontSize: 28,
                  color: won ? HUI.white : HUI.textDim,
                  textTransform: 'uppercase', letterSpacing: 1,
                }}>
                  {p.name}
                </div>
                <div style={{ fontFamily: HUI.mono, fontSize: 10, color: HUI.textFaint, marginTop: 3, letterSpacing: 2 }}>
                  {p.nationality} · OVR {ovr} · {style?.label ?? p.styleId}
                </div>
              </div>

              {/* Sets */}
              <div style={{ display: 'flex', gap: 8 }}>
                {result.setsDetail.map(([a, b], si) => {
                  const sv = i === 0 ? a : b;
                  const ov = i === 0 ? b : a;
                  const setWon = sv > ov;
                  return (
                    <div key={si} style={{
                      background: setWon ? 'rgba(255,215,0,0.10)' : HUI.bgLight,
                      border: `1px solid ${setWon ? 'rgba(255,215,0,0.35)' : HUI.border}`,
                      padding: '8px 16px', textAlign: 'center', minWidth: 50,
                    }}>
                      <div style={{
                        fontFamily: HUI.display, fontWeight: 700, fontSize: 24,
                        color: setWon ? HUI.gold : HUI.textDim,
                      }}>
                        {sv}
                      </div>
                      <div style={{ fontFamily: HUI.mono, fontSize: 8, color: HUI.textFaint, letterSpacing: 2 }}>
                        SET {si + 1}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Stats lado a lado */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        {[pA, pB].map((p, i) => (
          <StatsCard key={p.id} player={p} stats={result.stats[i === 0 ? 'a' : 'b']} won={i === 0 ? aWon : !aWon} />
        ))}
      </div>

      {/* Log colapsável */}
      <LogPanel log={result.log} />
    </div>
  );
}

function StatsCard({ player, stats, won }) {
  const style = PLAY_STYLES[player.styleId];
  const s1Pct = stats.serve1Total > 0 ? Math.round(stats.serve1In / stats.serve1Total * 100) : 0;
  const s2Pct = stats.serve2Total > 0 ? Math.round(stats.serve2In / stats.serve2Total * 100) : 0;
  const avgRally = stats.rallyLengths?.length > 0
    ? (stats.rallyLengths.reduce((a, b) => a + b, 0) / stats.rallyLengths.length).toFixed(1)
    : '—';
  const srv1WinPct = (stats.serve1WonPoints + stats.serve1LostPoints) > 0
    ? Math.round(stats.serve1WonPoints / (stats.serve1WonPoints + stats.serve1LostPoints) * 100)
    : null;
  const srv2WinPct = (stats.serve2WonPoints + stats.serve2LostPoints) > 0
    ? Math.round(stats.serve2WonPoints / (stats.serve2WonPoints + stats.serve2LostPoints) * 100)
    : null;
  const holdPct = stats.gamesServed > 0
    ? Math.round(stats.gamesHeld / stats.gamesServed * 100)
    : null;
  const breakPct = stats.gamesReturned > 0
    ? Math.round(stats.gamesConverted / stats.gamesReturned * 100)
    : null;

  return (
    <div style={{
      background: HUI.bgPanel, border: `1px solid ${won ? HUI.clay : HUI.border}`,
      borderTop: `2px solid ${won ? HUI.clay : HUI.border}`,
      padding: '18px 20px',
    }}>
      <div style={{
        fontFamily: HUI.display, fontWeight: 600, fontSize: 14,
        color: won ? HUI.white : HUI.textDim, textTransform: 'uppercase',
        letterSpacing: 2, marginBottom: 14,
      }}>
        {player.name}
      </div>

      {[
        ['Aces',              stats.aces],
        ['Duplas Faltas',     stats.doubleFaults],
        [`1º Srv %`,          `${s1Pct}% · ${Math.round(stats.serve1AvgKmh ?? 0)} km/h`],
        [`2º Srv %`,          `${s2Pct}% · ${Math.round(stats.serve2AvgKmh ?? 0)} km/h`],
        srv1WinPct !== null ? ['Pts w/ 1º Srv', `${srv1WinPct}%`] : null,
        srv2WinPct !== null ? ['Pts w/ 2º Srv', `${srv2WinPct}%`] : null,
        holdPct !== null   ? [`Hold %`, `${holdPct}% (${stats.gamesHeld}/${stats.gamesServed})`] : null,
        breakPct !== null  ? [`Break %`, `${breakPct}% (${stats.gamesConverted}/${stats.gamesReturned})`] : null,
        ['Winners',           stats.winners],
        ['E. Não-Forçados',   stats.unforcedErrors],
        ['E. Forçados',       stats.forcedErrors],
        stats.avgQuality != null ? ['Q Médio Rally', `${Math.round(stats.avgQuality * 100)}%`] : null,
        ['Rally Médio',       avgRally],
        ['Aprox. Rede',       stats.netApproaches],
        ['Pts na Rede',       stats.netPointsWon],
      ].filter(Boolean).map(([label, val]) => (
        <div key={label} style={{
          display: 'flex', justifyContent: 'space-between',
          padding: '5px 0', borderBottom: `1px solid ${HUI.border}`,
        }}>
          <span style={{ fontFamily: HUI.mono, fontSize: 10, color: HUI.textFaint, letterSpacing: 1 }}>
            {label}
          </span>
          <span style={{ fontFamily: HUI.display, fontWeight: 600, fontSize: 13, color: HUI.white }}>
            {val}
          </span>
        </div>
      ))}
    </div>
  );
}

function BulkResultView({ bulk, nameA, nameB }) {
  const barW = (pct) => `${pct}%`;

  return (
    <div style={{ maxWidth: 700, margin: '0 auto' }}>
      <div style={{
        background: HUI.bgPanel, border: `1px solid ${HUI.border}`,
        borderTop: `3px solid #4A9B3F`, padding: '28px 32px', marginBottom: 24,
      }}>
        <div style={{ fontFamily: HUI.mono, fontSize: 9, letterSpacing: 5, color: '#4A9B3F', marginBottom: 20 }}>
          RESULTADOS BULK · {bulk.n} PARTIDAS · {bulk.totalPoints.toLocaleString()} PONTOS TOTAIS
        </div>

        {/* Barra de win% */}
        {[
          { name: nameA, wins: bulk.winsA, pct: bulk.pctA, color: HUI.clay },
          { name: nameB, wins: bulk.winsB, pct: bulk.pctB, color: '#00D4FF' },
        ].map(({ name, wins, pct, color }) => (
          <div key={name} style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontFamily: HUI.display, fontWeight: 600, fontSize: 16, color: HUI.white, textTransform: 'uppercase' }}>
                {name}
              </span>
              <span style={{ fontFamily: HUI.display, fontWeight: 700, fontSize: 20, color }}>
                {pct}% <span style={{ fontSize: 11, color: HUI.textFaint, fontWeight: 400 }}>({wins})</span>
              </span>
            </div>
            <div style={{ height: 6, background: HUI.bgLight }}>
              <div style={{ height: '100%', width: barW(pct), background: color, transition: 'width .4s' }} />
            </div>
          </div>
        ))}

        <div style={{ marginTop: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {[
            ['Total de Pontos', bulk.totalPoints.toLocaleString()],
            ['Ticks Totais',    bulk.totalTicks.toLocaleString()],
            ['Pts/Partida (méd)', (bulk.totalPoints / bulk.n).toFixed(1)],
            ['Ticks/Partida (méd)', (bulk.totalTicks / bulk.n).toFixed(0)],
          ].map(([l, v]) => (
            <div key={l} style={{ background: HUI.bgLight, padding: '10px 14px' }}>
              <div style={{ fontFamily: HUI.mono, fontSize: 9, color: HUI.textFaint, letterSpacing: 2 }}>{l}</div>
              <div style={{ fontFamily: HUI.display, fontWeight: 700, fontSize: 18, color: HUI.white, marginTop: 3 }}>{v}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Stats médias */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {[
          { name: nameA, avg: bulk.avgStats.a },
          { name: nameB, avg: bulk.avgStats.b },
        ].map(({ name, avg }) => (
          <div key={name} style={{
            background: HUI.bgPanel, border: `1px solid ${HUI.border}`, padding: '18px 20px',
          }}>
            <div style={{
              fontFamily: HUI.display, fontSize: 13, color: HUI.textDim,
              textTransform: 'uppercase', letterSpacing: 2, marginBottom: 12,
            }}>
              {name} — Médias
            </div>
            {[
              ['Aces', avg.aces.toFixed(1)],
              ['Duplas', avg.doubleFaults.toFixed(1)],
              ['Winners', avg.winners.toFixed(1)],
              ['E. NF', avg.unforcedErrors.toFixed(1)],
              ['E. F', avg.forcedErrors.toFixed(1)],
              ['1º Srv', avg.serve1Total > 0 ? `${Math.round(avg.serve1In / avg.serve1Total * 100)}%` : '—'],
              ['2º Srv', avg.serve2Total > 0 ? `${Math.round(avg.serve2In / avg.serve2Total * 100)}%` : '—'],
            ].map(([l, v]) => (
              <div key={l} style={{
                display: 'flex', justifyContent: 'space-between',
                padding: '4px 0', borderBottom: `1px solid ${HUI.border}`,
              }}>
                <span style={{ fontFamily: HUI.mono, fontSize: 9, color: HUI.textFaint }}>{l}</span>
                <span style={{ fontFamily: HUI.display, fontSize: 13, color: HUI.white, fontWeight: 600 }}>{v}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function LogPanel({ log }) {
  const [open, setOpen] = useState(false);

  return (
    <div style={{ background: HUI.bgPanel, border: `1px solid ${HUI.border}` }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          width: '100%', background: 'none', border: 'none',
          padding: '12px 20px', display: 'flex', justifyContent: 'space-between',
          cursor: 'pointer', color: HUI.textDim, fontFamily: HUI.mono,
          fontSize: 10, letterSpacing: 3, textTransform: 'uppercase',
        }}
      >
        <span>LOG DA PARTIDA ({log.length} linhas)</span>
        <span>{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div style={{
          maxHeight: 320, overflowY: 'auto', padding: '0 20px 16px',
          borderTop: `1px solid ${HUI.border}`,
        }}>
          {log.map((line, i) => (
            <div key={i} style={{
              fontFamily: HUI.mono, fontSize: 10, color: HUI.textFaint,
              lineHeight: 1.9, borderBottom: `1px solid rgba(255,255,255,.03)`,
            }}>
              {line}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Micro-componentes ─────────────────────────────────────────────

function PlayerPicker({ value, onChange, keys }) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      style={{
        width: '100%', background: HUI.bgLight, border: `1px solid ${HUI.border}`,
        color: HUI.white, fontFamily: HUI.mono, fontSize: 11, padding: '8px 12px',
        cursor: 'pointer', appearance: 'none',
      }}
    >
      {keys.map(k => (
        <option key={k} value={k} style={{ background: HUI.bgLight }}>
          {NAMED_PLAYERS[k]?.name ?? k}
        </option>
      ))}
    </select>
  );
}

function PlayerMini({ player, color }) {
  const ovr = player.attrs ? overallRating(player.attrs) : '—';
  const sty = PLAY_STYLES[player.styleId];
  return (
    <div style={{
      background: HUI.bgLight, borderLeft: `3px solid ${color}`,
      padding: '8px 12px', display: 'flex', justifyContent: 'space-between',
    }}>
      <div>
        <div style={{ fontFamily: HUI.display, fontSize: 14, color: HUI.white, fontWeight: 600, textTransform: 'uppercase' }}>
          {player.name}
        </div>
        <div style={{ fontFamily: HUI.mono, fontSize: 9, color: HUI.textFaint, letterSpacing: 1, marginTop: 2 }}>
          {player.nationality} · {sty?.abbr ?? player.styleId}
        </div>
      </div>
      <div style={{ fontFamily: HUI.display, fontSize: 24, fontWeight: 700, color, lineHeight: 1.2 }}>
        {ovr}
      </div>
    </div>
  );
}

function Label({ children }) {
  return (
    <div style={{ fontFamily: HUI.mono, fontSize: 9, letterSpacing: 4, color: HUI.textFaint, textTransform: 'uppercase' }}>
      {children}
    </div>
  );
}

function Sep() {
  return <div style={{ borderBottom: `1px solid ${HUI.border}` }} />;
}

function EmptyState() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '60vh', flexDirection: 'column', gap: 12,
    }}>
      <div style={{ fontSize: 48, opacity: 0.2 }}>🎾</div>
      <div style={{ fontFamily: HUI.display, fontSize: 20, color: HUI.textFaint, letterSpacing: 3, textTransform: 'uppercase' }}>
        Selecione dois jogadores e simule
      </div>
      <div style={{ fontFamily: HUI.mono, fontSize: 10, color: HUI.textFaint, letterSpacing: 2 }}>
        Motor completo — física real, AI, stamina, superfície
      </div>
    </div>
  );
}

// ── Helpers de stats para bulk ────────────────────────────────────

function createEmptyStats() {
  return {
    aces: 0, doubleFaults: 0,
    serve1In: 0, serve1Total: 0, serve1AvgKmh: 0,
    serve2In: 0, serve2Total: 0, serve2AvgKmh: 0,
    winners: 0, unforcedErrors: 0, forcedErrors: 0,
    netApproaches: 0, netPointsWon: 0,
    rallyLengths: [],
    byType: { FLAT:0, TOPSPIN:0, SLICE:0, VOLLEY:0, DROP:0,
              SMASH:0, LOB_DEF:0, LOB_ATK:0, BANANA:0, PASSING:0,
              SHORT_ANGLE:0, SLICE_SHORT:0, HEAVY_TOP:0, HALF_VOLLEY:0 },
    // Serve / Return analytics
    pointsWonServing: 0,   pointsLostServing: 0,
    pointsWonReturning: 0, pointsLostReturning: 0,
    serve1WonPoints: 0,  serve1LostPoints: 0,
    serve2WonPoints: 0,  serve2LostPoints: 0,
    // Games hold/break
    gamesServed: 0, gamesHeld: 0,
    gamesReturned: 0, gamesConverted: 0,
    serveLog: [],
    qualitySum: 0, qualityCount: 0,
  };
}

function accStats(acc, s) {
  acc.aces           += s.aces;
  acc.doubleFaults   += s.doubleFaults;
  acc.winners        += s.winners;
  acc.unforcedErrors += s.unforcedErrors;
  acc.forcedErrors   += s.forcedErrors;
  acc.serve1In       += s.serve1In;
  acc.serve1Total    += s.serve1Total;
  acc.serve1AvgKmh   += s.serve1AvgKmh;
  acc.serve2In       += s.serve2In;
  acc.serve2Total    += s.serve2Total;
  acc.serve2AvgKmh   += s.serve2AvgKmh;
  acc.netApproaches  += s.netApproaches;
  acc.netPointsWon   += s.netPointsWon;
  // Novos campos de analytics de saque/retorno
  acc.pointsWonServing    += s.pointsWonServing    ?? 0;
  acc.pointsLostServing   += s.pointsLostServing   ?? 0;
  acc.pointsWonReturning  += s.pointsWonReturning  ?? 0;
  acc.pointsLostReturning += s.pointsLostReturning ?? 0;
  acc.serve1WonPoints     += s.serve1WonPoints     ?? 0;
  acc.serve1LostPoints    += s.serve1LostPoints    ?? 0;
  acc.serve2WonPoints     += s.serve2WonPoints     ?? 0;
  acc.serve2LostPoints    += s.serve2LostPoints    ?? 0;
  acc.gamesServed         += s.gamesServed         ?? 0;
  acc.gamesHeld           += s.gamesHeld           ?? 0;
  acc.gamesReturned       += s.gamesReturned       ?? 0;
  acc.gamesConverted      += s.gamesConverted      ?? 0;
  acc.qualitySum          += s.qualitySum          ?? 0;
  acc.qualityCount        += s.qualityCount        ?? 0;
  // byType: acumular por chave
  if (s.byType) {
    for (const k of Object.keys(s.byType)) {
      acc.byType[k] = (acc.byType[k] ?? 0) + (s.byType[k] ?? 0);
    }
  }
  // rallyLengths: concatenar arrays (para calc de média no bulk)
  if (Array.isArray(s.rallyLengths)) acc.rallyLengths.push(...s.rallyLengths);
}

function divStats(acc, n) {
  const d = {};
  for (const k of Object.keys(acc)) {
    const v = acc[k];
    if (k === 'qualitySum' || k === 'qualityCount') {
      d[k] = v; // manter somas brutas — avgQuality derivado abaixo
    } else if (typeof v === 'number') {
      d[k] = v / n;
    } else if (Array.isArray(v)) {
      d[k] = v; // manter array cru (rallyLengths)
    } else if (typeof v === 'object' && v !== null) {
      // byType: dividir cada chave
      d[k] = {};
      for (const sk of Object.keys(v)) d[k][sk] = v[sk] / n;
    } else d[k] = v;
  }
  // Derivar avgQuality das somas brutas
  d.avgQuality = d.qualityCount > 0
    ? Math.round((d.qualitySum / d.qualityCount) * 1000) / 1000
    : null;
  return d;
}
