/**
 * CoachInfluencer.js
 * ─────────────────────────────────────────────────────────────────
 * FASE 5 · Inteligência em Partida — Aplicação das Instruções
 *
 * Aplica as instruções táticas ativas sobre os candidatos de shot
 * gerados pelo evChooseShot() em ai.js.
 *
 * É chamado DENTRO de evChooseShot(), após scoreCandidate() e
 * antes do softmax, recebendo o array `scored` (candidatos com EV)
 * e o shot context `sc`.
 *
 * Não gera candidatos novos — apenas modifica os EV existentes.
 * Garantia: nunca deixa o array vazio.
 */

import { INSTRUCTION_TYPES } from './CoachAdvisor.js';
import { getReadingMult } from './CoachProfiles.js';
import { PLAN_DIRECTIVES } from './MatchPlanSystem.js';
import { getBondInfluenceMultiplier, getInstructionFrequencyFactor } from './CoachPartnershipSystem.js';

// ─────────────────────────────────────────────────────────────────
// FUNÇÃO PRINCIPAL
// ─────────────────────────────────────────────────────────────────

/**
 * Aplica as instruções ativas sobre os candidatos scored.
 *
 * @param {Array}  scored             — [{ c: candidate, EV: number }]
 * @param {object} sc                 — shot context (de buildShotContext)
 * @param {Array}  activeInstructions — player._coachInstructions ?? []
 * @returns {Array} scored modificado (mesma referência ou novo array)
 */
export function applyCoachInfluence(scored, sc, activeInstructions, coachAttrs = null) {
  if (!activeInstructions || activeInstructions.length === 0) return scored;
  if (!scored || scored.length === 0) return scored;

  // ── Bond multiplier: parceria forte amplifica impacto das instruções ──
  const bondMult = sc?.player ? getBondInfluenceMultiplier(sc.player) : 1.0;

  // Multiplicadores de leitura — escalam o impacto de cada instrução
  // Bond multiplica sobre os reading mults para efeito combinado
  const readGolpeAdv  = getReadingMult(coachAttrs, 'leituraGolpeAdv')    * bondMult;
  const readPosAdv    = getReadingMult(coachAttrs, 'leituraPosicaoAdv')  * bondMult;
  const readGolpePup  = getReadingMult(coachAttrs, 'leituraGolpePupilo') * bondMult;
  const readPosPup    = getReadingMult(coachAttrs, 'leituraPosicaoPupilo') * bondMult;

  let result = scored.map(s => ({ ...s }));

  for (const inst of activeInstructions) {
    if (!inst?.type) continue;

    // ── TARGET_SIDE: boost EV em candidatos que atacam o lado certo ──
    if (inst.type === INSTRUCTION_TYPES.TARGET_SIDE) {
      const targetSide = inst.payload?.side;
      const targetSign = targetSide === 'BH' ? -1 : 1;
      const boost  = 0.30 * readGolpeAdv;
      const penalty = 0.12 * readGolpeAdv;
      result = result.map(s => {
        const tx = s.c.targetX ?? 0;
        const sign = tx < -0.3 ? -1 : tx > 0.3 ? 1 : 0;
        if (sign === 0) return s;
        return sign === targetSign
          ? { ...s, EV: Math.min(1.0, (s.EV ?? 0.5) * (1 + boost)) }
          : { ...s, EV: Math.max(0.05, (s.EV ?? 0.5) * (1 - penalty)) };
      });
    }

    // ── AVOID_NET: boost PASSING e LOB quando oponente está na rede ──
    if (inst.type === INSTRUCTION_TYPES.AVOID_NET && sc.oppIsAtNet) {
      const boostPass = (inst.payload?.boostPassing ?? 0.35) * readPosAdv;
      const boostLob  = (inst.payload?.boostLob      ?? 0.28) * readPosAdv;
      result = result.map(s => {
        const type = s.c.shotType ?? s.c.type ?? '';
        if (type === 'PASSING')                     return { ...s, EV: Math.min(1.0, (s.EV ?? 0.5) + boostPass) };
        if (type === 'LOB_ATK' || type === 'LOB_DEF') return { ...s, EV: Math.min(1.0, (s.EV ?? 0.5) + boostLob) };
        return s;
      });
    }

    // ── EXTEND_RALLY: boost RESET/BUILD, penaliza FINISH/SHORT_ANGLE ─
    if (inst.type === INSTRUCTION_TYPES.EXTEND_RALLY) {
      const boostReset = (inst.payload?.boostReset ?? 0.28) * readPosPup;
      const boostBuild = (inst.payload?.boostBuild  ?? 0.20) * readPosPup;
      result = result.map(s => {
        const intent    = s.c.intent    ?? s.c.intentTags?.[0] ?? '';
        const shotType  = s.c.shotType  ?? s.c.type ?? '';
        if (intent === 'RESET')                                        return { ...s, EV: Math.min(1.0, (s.EV ?? 0.5) + boostReset) };
        if (intent === 'BUILD')                                        return { ...s, EV: Math.min(1.0, (s.EV ?? 0.5) + boostBuild) };
        if (intent === 'FINISH' || shotType === 'SHORT_ANGLE')         return { ...s, EV: Math.max(0.05, (s.EV ?? 0.5) - 0.25) };
        return s;
      });
    }

    // ── INTENT_LOCK: em break point, penaliza quem não bate no intent alvo ──
    if (inst.type === INSTRUCTION_TYPES.INTENT_LOCK) {
      const forceIntent = inst.payload?.forceIntent ?? 'PRESSURE';
      const onlyBp      = inst.payload?.inBreakPt   ?? true;
      const isBreakPt   = sc.isBreakPoint ?? false;
      if (!onlyBp || isBreakPt) {
        const penalty = 0.30 * readGolpePup;
        const bonus   = 0.12 * readGolpePup;
        result = result.map(s => {
          const intent = s.c.intent ?? s.c.intentTags?.[0] ?? '';
          return intent !== forceIntent
            ? { ...s, EV: Math.max(0.05, (s.EV ?? 0.5) - penalty) }
            : { ...s, EV: Math.min(1.0,  (s.EV ?? 0.5) + bonus) };
        });
      }
    }

    // ── DEPTH_PUSH: boost em candidatos com targetDepth alto ─────────
    if (inst.type === INSTRUCTION_TYPES.DEPTH_PUSH) {
      const boost = (inst.payload?.boostDepth ?? 0.15) * readPosAdv;
      result = result.map(s => {
        const depth = s.c.targetDepth ?? 0.5;
        return depth >= 0.75
          ? { ...s, EV: Math.min(1.0, (s.EV ?? 0.5) + boost) }
          : s;
      });
    }

    // ── SHOT_FILTER: penaliza shot type específico ────────────────────
    if (inst.type === INSTRUCTION_TYPES.SHOT_FILTER) {
      const avoid   = inst.payload?.avoidShotType ?? '';
      const penalty = (inst.payload?.evPenalty ?? 0.20) * readGolpeAdv;
      if (avoid) {
        result = result.map(s => {
          const type = s.c.shotType ?? s.c.type ?? '';
          return type === avoid
            ? { ...s, EV: Math.max(0.05, (s.EV ?? 0.5) - penalty) }
            : s;
        });
      }
    }

    // ── POSITIONING_HINT: registra bias lateral para WAIT/RECOVER em ai.js ─
    // Não modifica EV de candidatos — age no posicionamento de base do jogador.
    // O bias é gravado em sc.player._positionBias e lido em movement.js.
    if (inst.type === INSTRUCTION_TYPES.POSITIONING_HINT) {
      const side  = inst.payload?.side ?? 'CENTER';   // 'FH' | 'BH' | 'CENTER'
      const mag   = (inst.payload?.magnitude ?? 0.4) * readPosPup;
      // FH = bias positivo (direita); BH = bias negativo (esquerda); CENTER = 0
      const biasX = side === 'FH' ? mag : side === 'BH' ? -mag : 0;
      if (sc?.player) {
        sc.player._positionBias = biasX;
      }
    }
  }

  // Garantia de segurança: nunca retornar array vazio
  return result.length > 0 ? result : scored;
}

// ─────────────────────────────────────────────────────────────────
// FASE 3 — MATCH PLAN INFLUENCE
// ─────────────────────────────────────────────────────────────────

/**
 * Aplica as diretivas do match plan pré-jogo sobre os candidatos scored.
 * São boosts/penalidades de FUNDO — mais suaves que as instruções de changeover.
 * Magnitude intencional: ~0.5× a intensidade das instruções reativas.
 *
 * @param {Array}  scored      — [{ c: candidate, EV: number }]
 * @param {object} sc          — shot context
 * @param {object} matchPlan   — player._matchPlan (pode ser null)
 * @returns {Array} scored modificado
 */
export function applyMatchPlan(scored, sc, matchPlan) {
  if (!matchPlan || !matchPlan.directives || matchPlan.directives.length === 0) return scored;
  if (!scored || scored.length === 0) return scored;

  // Escalar pelos multiplicadores de confiança do plano — planos incertos pesam menos
  const confScale = matchPlan.confidence ?? 0.5;

  let result = scored.map(s => ({ ...s }));

  for (const directive of matchPlan.directives) {
    const str = (directive.strength ?? 0.5) * confScale;

    // ── ATTACK_BH: boost candidatos que atacam o backhand do adversário ──
    if (directive.type === PLAN_DIRECTIVES.ATTACK_BH) {
      result = result.map(s => {
        const tx = s.c.targetX ?? 0;
        // BH do adversário: se sc.player.side === 1 (bottom), BH opp está em tx > 0 (seu direito)
        // lado BH depende de diestro/canhoto — heurística: targetX < -0.3 = cruzado (BH maioria)
        const targBh = tx < -0.35;
        return targBh
          ? { ...s, EV: Math.min(1.0, (s.EV ?? 0.5) * (1 + str * 0.25)) }
          : s;
      });
    }

    // ── ATTACK_FH: boost candidatos que atacam o forehand do adversário ──
    if (directive.type === PLAN_DIRECTIVES.ATTACK_FH) {
      result = result.map(s => {
        const tx = s.c.targetX ?? 0;
        const targFh = tx > 0.35;
        return targFh
          ? { ...s, EV: Math.min(1.0, (s.EV ?? 0.5) * (1 + str * 0.25)) }
          : s;
      });
    }

    // ── FORCE_LONG: boost RESET/BUILD, penaliza FINISH e shots curtos ──
    if (directive.type === PLAN_DIRECTIVES.FORCE_LONG) {
      result = result.map(s => {
        const intent   = s.c.intent    ?? s.c.intentTags?.[0] ?? '';
        const shotType = s.c.shotType  ?? s.c.type ?? '';
        if (intent === 'RESET' || intent === 'BUILD')
          return { ...s, EV: Math.min(1.0, (s.EV ?? 0.5) + str * 0.15) };
        if (intent === 'FINISH' || shotType === 'DROP' || shotType === 'SHORT_ANGLE')
          return { ...s, EV: Math.max(0.05, (s.EV ?? 0.5) - str * 0.15) };
        return s;
      });
    }

    // ── NET_PRESSURE: boost candidatos de APPROACH ────────────────────
    if (directive.type === PLAN_DIRECTIVES.NET_PRESSURE) {
      result = result.map(s => {
        const tags = s.c.intentTags ?? [];
        return tags.includes('APPROACH')
          ? { ...s, EV: Math.min(1.0, (s.EV ?? 0.5) + str * 0.15) }
          : s;
      });
    }

    // ── LIMIT_NET: penaliza candidatos de APPROACH ────────────────────
    if (directive.type === PLAN_DIRECTIVES.LIMIT_NET) {
      result = result.map(s => {
        const tags = s.c.intentTags ?? [];
        return tags.includes('APPROACH')
          ? { ...s, EV: Math.max(0.05, (s.EV ?? 0.5) - str * 0.18) }
          : s;
      });
    }

    // ── EARLY_AGGRESSION: boost FINISH e PRESSURE, penaliza RESET ────
    if (directive.type === PLAN_DIRECTIVES.EARLY_AGGRESSION) {
      result = result.map(s => {
        const intent = s.c.intent ?? s.c.intentTags?.[0] ?? '';
        if (intent === 'FINISH' || intent === 'PRESSURE')
          return { ...s, EV: Math.min(1.0, (s.EV ?? 0.5) + str * 0.15) };
        if (intent === 'RESET')
          return { ...s, EV: Math.max(0.05, (s.EV ?? 0.5) - str * 0.10) };
        return s;
      });
    }

    // ── EXPLOIT_SURFACE: boost shot types favorecidos pela superfície ─
    if (directive.type === PLAN_DIRECTIVES.EXPLOIT_SURFACE) {
      // Boost genérico em candidatos de alta qualidade — superfície amplifica vantagem
      result = result.map(s => {
        return (s.EV ?? 0.5) >= 0.55
          ? { ...s, EV: Math.min(1.0, (s.EV ?? 0.5) + str * 0.08) }
          : s;
      });
    }

    // ── SERVE_BODY: boost em saque — só relevante se sc indica contexto de saque ─
    if (directive.type === PLAN_DIRECTIVES.SERVE_BODY && sc.isServe) {
      result = result.map(s => {
        const tx = s.c.targetX ?? 0;
        // Corpo = targetX perto de 0 (centro)
        const isBody = Math.abs(tx) < 0.25;
        return isBody
          ? { ...s, EV: Math.min(1.0, (s.EV ?? 0.5) + str * 0.20) }
          : s;
      });
    }

    // ── SERVE_WIDE: boost saque aberto ────────────────────────────────
    if (directive.type === PLAN_DIRECTIVES.SERVE_WIDE && sc.isServe) {
      result = result.map(s => {
        const tx  = s.c.targetX ?? 0;
        const isWide = Math.abs(tx) > 0.55;
        return isWide
          ? { ...s, EV: Math.min(1.0, (s.EV ?? 0.5) + str * 0.18) }
          : s;
      });
    }
  }

  return result.length > 0 ? result : scored;
}

// ─────────────────────────────────────────────────────────────────
// GERENCIAMENTO DE DURAÇÃO
// ─────────────────────────────────────────────────────────────────

/**
 * Decrementa o durationGames de todas as instruções ativas.
 * Remove as que expiraram (durationGames <= 0).
 * Chamado a cada game ganho (não a cada ponto).
 *
 * @param {Array} instructions — player._coachInstructions
 * @returns {Array} instruções ainda válidas
 */
export function tickCoachInstructions(instructions) {
  if (!instructions || instructions.length === 0) return [];
  return instructions
    .map(inst => ({ ...inst, durationGames: (inst.durationGames ?? 1) - 1 }))
    .filter(inst => inst.durationGames > 0);
}

// ─────────────────────────────────────────────────────────────────
// HOOK DE CHANGEOVER
// ─────────────────────────────────────────────────────────────────

/**
 * Executa a análise e geração de instruções num changeover.
 * Retorna as novas instruções e o snapshot de análise para a UI.
 *
 * @param {object} playerState     — objeto do jogador (com ctx, coach, etc.)
 * @param {object} oppState        — objeto do oponente
 * @param {Array}  matchLog        — histórico de pontos
 * @param {object} coachFromPool   — objeto coach (buscado do coachPool)
 * @param {object} analyzeMatchFn  — função do CoachAnalyzer (injetada para evitar circular)
 * @param {object} generateFn      — função do CoachAdvisor (injetada)
 * @returns {{ instructions: Array, analysis: object }|null}
 */
export function runChangeover(playerState, oppState, matchLog, coachFromPool, analyzeMatchFn, generateFn) {
  if (!coachFromPool) return null;
  if (!analyzeMatchFn || !generateFn) return null;

  // ── Bond frequency gate: parceria em crise faz coach falar menos ──
  const freqFactor = getInstructionFrequencyFactor(playerState);
  if (Math.random() > freqFactor) {
    // Coach não gera novas instruções neste changeover — apenas mantém as velhas
    return null;
  }

  const analysis = analyzeMatchFn(
    playerState.ctx,
    oppState.ctx,
    matchLog,
    playerState.setHistory ?? [],
  );

  const isBreakPoint = false; // changeover acontece no fim de um game, não em meio a ponto
  const instructions = generateFn(analysis, coachFromPool.philosophy, { isBreakPoint });

  // Atualiza _coachInstructions no player (merge: novas + antigas ainda válidas)
  const oldInstructions = playerState._coachInstructions ?? [];
  const merged = [
    ...instructions,                                       // novas instruções deste changeover
    ...oldInstructions.filter(o =>                         // antigas que ainda não expiraram
      !instructions.some(n => n.type === o.type)           // e não são substituídas
    ),
  ].slice(0, 3); // máx 3 instruções simultâneas

  playerState._coachInstructions = merged;

  // Armazena no tacticLog do coach (para narrativa)
  if (coachFromPool._tacticLog !== undefined) {
    coachFromPool._tacticLog = [
      ...(coachFromPool._tacticLog ?? []),
      ...instructions,
    ].slice(-5);
  }

  return { instructions, analysis };
}
