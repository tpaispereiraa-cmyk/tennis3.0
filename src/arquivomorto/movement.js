// ═══════════════════════════════════════════════════════════════════
// movement.js — Sistema de posicionamento unificado (v4)
// ═══════════════════════════════════════════════════════════════════
//
// ORIGEM:
//   Esqueleto: movement3.js (predY correto, prefs-based depth, _predCrossX)
//   Fase 2:    movement2.js (eixos X/Y separados no WAIT/RECOVER, NaN guards)
//   Fase 3:    movement2.js (computeNetPos/TransitionPos/isRealLob puras)
//   Fase 4:    NOVO — split-step no rally (não existia em nenhum arquivo)
//   Fase 5:    NOVO — altura de contato por cadência + slideCoeff por surface
//
// ARQUIVOS ORIGINAIS preservados como backup:
//   _movement_v1.js.bak  — versão original (styleId-based)
//   _movement_v2.js.bak  — reescrita do zero (eixos separados)
//   _movement_v3.js.bak  — v1 com predY corrigido
//
// RESPONSABILIDADE ÚNICA: onde o jogador deve estar em cada momento.
//
//   NÃO decide como bater   → ai.js / aiDecideShot
//   NÃO decide qual golpe   → evChooseShot
//   NÃO gerencia stamina, spin, física de bola
//
// FSM DE 4 ESTADOS:
//   WAIT    → bola no lado adversário. Bisector + baseline. X/Y separados.
//   MOVE    → bola vindo. Corre para optimalHitPoint com urgência proporcional.
//   HIT     → chegou com margem positiva. Planta. Prepara o golpe.
//   RECOVER → acabou de bater. Retorna ao bisector. X/Y separados.
//
// CONTRATO COM game.js (campos que devem existir no player):
//   player._arrivalMargin   lido pelo ContactModel em tryHit()
//   player._predCrossX      lido pelo ContactModel para penalidade lateral
//   player.basePos          lido pelo renderer e debug
//   player.atNet            modificado pelo lob retreat, lido pelo volley
//   player._movState        debug string (WAIT/MOVE/HIT/RECOVER)
// ═══════════════════════════════════════════════════════════════════

import { COURT, THRESHOLDS, PLAYER_CFG, STAMINA, INERTIA, MOVEMENT } from '../core/constants.js';
import { clamp, dist2 } from '../core/math.js';
import { predictTrajectory } from '../core/physics.js';

// ──────────────────────────────────────────────────────────────────
// HELPERS DE ESTILO
// ──────────────────────────────────────────────────────────────────

/**
 * Posição Y de home base para um jogador.
 * GARANTIA: sempre retorna |Y| >= COURT.halfL (nunca dentro da quadra).
 *
 * [FASE 1 — de v3] Baseado em prefs.rallyCadence + prefs.netGame.
 * Mais granular que v1 (que usava styleId direto):
 *   EXPLOSIVE/EARLY_ATTACK → mais perto da baseline (quer bater cedo)
 *   PATIENT/MEASURED       → mais atrás (quer tempo extra)
 *   netGame HUNTER         → pequeno offset para frente
 *
 * Bug histórico (v1): AGG_BASELINER com momentum alto calculava
 * baselineY < halfL → jogador esperava DENTRO da quadra.
 * Clamp crítico no final previne isso.
 */
export function getStyleBaselineY(player) {
  const prefs  = player.prefs;
  const BEHIND = 0.70;

  // rallyCadence: driver principal de posição de espera
  const cadenceOffset = prefs ? ({
    EXPLOSIVE:    0.55,
    EARLY_ATTACK: 0.45,
    BALANCED:     0.35,
    MEASURED:     0.28,
    PATIENT:      0.20,
  }[prefs.rallyCadence] ?? 0.35) : 0.40;

  // netGame: ajuste secundário — HUNTER fica ligeiramente mais à frente
  const netOffset = prefs ? ({
    HUNTER:      +0.15,
    PROACTIVE:   +0.08,
    OPPORTUNIST:  0.00,
    RELUCTANT:    0.00,
    AVOIDS:       0.00,
  }[prefs.netGame] ?? 0) : 0;

  const offset = Math.min(0.70, cadenceOffset + netOffset);

  // Jogadores pacientes NÃO recuam mais sob pressão — ficar atrás É a arma.
  const isPatient = prefs?.rallyCadence === 'PATIENT' || prefs?.rallyCadence === 'MEASURED';
  const retreatFactor = isPatient ? 0.40 : 1.0;

  const mom    = player.ctx?.momentum ?? 0.5;
  const dynOff = offset + clamp((0.5 - mom) * 1.2 * retreatFactor, -0.3, 0.6);

  const rawY     = player.side * (COURT.halfL + BEHIND - dynOff);
  const minDepth = player.side * COURT.halfL;

  // CLAMP CRÍTICO: nunca entra na quadra
  return player.side > 0
    ? Math.max(rawY, minDepth + 0.05)
    : Math.min(rawY, minDepth - 0.05);
}

/**
 * Quanto ATRÁS do optimalHitPoint o jogador prefere se posicionar.
 * [FASE 1 — de v3] 3 dimensões: rallyCadence + riskProfile + netGame.
 *
 * Não confundir com getStyleBaselineY (onde esperar) —
 * isso define onde bater dentro do ponto.
 */
function getStyleDepthOffset(player) {
  const prefs = player.prefs;
  if (!prefs) return 1.6;

  const cadenceDepth = {
    PATIENT:      2.6,
    MEASURED:     2.2,
    BALANCED:     1.8,
    EARLY_ATTACK: 1.0,
    EXPLOSIVE:    0.7,
  }[prefs.rallyCadence] ?? 1.8;

  const riskAdj = {
    SAFETY_FIRST: +0.4,
    SAFE:         +0.2,
    CALCULATED:    0.0,
    GAMBLER:      -0.2,
    ALLOUT:       -0.4,
  }[prefs.riskProfile] ?? 0;

  const netAdj = {
    HUNTER:      -0.6,
    PROACTIVE:   -0.3,
    OPPORTUNIST:  0.0,
    RELUCTANT:    0.0,
    AVOIDS:       0.0,
  }[prefs.netGame] ?? 0;

  return Math.max(0.4, cadenceDepth + riskAdj + netAdj);
}

// ──────────────────────────────────────────────────────────────────
// FSM — MÁQUINA DE ESTADOS
// ──────────────────────────────────────────────────────────────────

/**
 * [FASE 1 — de v3] + [FASE 4 — SPLITSTEP novo]
 * 5 estados: WAIT | MOVE | HIT | RECOVER | SPLITSTEP
 *
 * SPLITSTEP: detectado quando o adversário acabou de bater (lastHitBy muda)
 * e o jogador está em movimento. Freia o jogador brevemente, gerando a
 * "primeira passada explosiva" ao sair do estado.
 */
function getMovementState(player, gs) {
  const justHit = gs.ball.lastHitBy === player.id;
  if (justHit) return 'RECOVER';

  // [FASE 4] SPLITSTEP: timer ativo → manter estado
  if ((player.ctx._splitStepTimer ?? 0) > 0) return 'SPLITSTEP';

  const ball = gs.ball;

  const ballComing =
    ball.inFlight &&
    ((player.side > 0 && ball.vel.y > 0) ||
     (player.side < 0 && ball.vel.y < 0));

  const ballOnMySide =
    Math.sign(ball.pos.y) === player.side ||
    Math.abs(ball.pos.y) < 0.5;

  // Bola quicou no lado adversário mas vai voltar (drop/slice curto)?
  const bouncedOnOppSide = (ball.bounceCount ?? 0) >= 1
    && Math.sign(ball.pos.y) !== player.side
    && Math.abs(ball.pos.y) > 0.5;

  const isReturnBounce = bouncedOnOppSide && (
    (player.side > 0 && ball.vel.y > 0) ||
    (player.side < 0 && ball.vel.y < 0) ||
    (Math.abs(ball.pos.y) < 5.0 && ball.pos.z < 1.5)
  );

  if (ballComing || ballOnMySide || isReturnBounce) {
    const margin  = player._arrivalMargin ?? -1;
    const hitTgt  = player._hitTarget ?? ball.pos;
    const d       = dist2(player.pos, hitTgt);
    const reach   = player.reach ?? 0.85;
    const bounced = (ball.bounceCount ?? 0) >= 1;

    const distToBall = Math.sqrt(
      (ball.pos.x - player.pos.x) ** 2 + (ball.pos.y - player.pos.y) ** 2
    );

    // Guard: hitTarget stale pré-quique não deve disparar HIT prematuramente
    const ballReachConsistent = distToBall <= d * 4.0 + reach;
    const inHitWindow = d < reach * 1.5 && margin > 0.05 && bounced
        && distToBall < reach * 3.5
        && ballReachConsistent;
    return inHitWindow ? 'HIT' : 'MOVE';
  }

  return 'WAIT';
}

// ──────────────────────────────────────────────────────────────────
// CÁLCULO DE TARGETS
// ──────────────────────────────────────────────────────────────────

/**
 * WAIT target: bisector + baselineY. Nunca avança.
 * [FASE 1 — de v3]
 */
function computeWaitTarget(player, gs) {
  const opp        = gs.players?.find(p => p.id !== player.id);
  const lastShotX  = player.ctx?._lastShotX ?? 0;
  const courtMode  = player.ctx?.courtMode ?? 'BASE';
  const isNetApproach = courtMode === 'TRANSITION' || courtMode === 'NET';

  const bisectorX = clamp(
    lastShotX * 0.20 + (opp?.pos.x ?? 0) * 0.10,
    -1.5, 1.5
  );

  // Antecipação por padrão de rally (pacientes leem com menos histórico)
  let finalX = bisectorX;
  if (!isNetApproach && player.prefs?.rallyCadence !== 'EXPLOSIVE' && opp) {
    const hist      = opp.ctx?.patternHistory ?? [];
    const isPatient = player.prefs?.rallyCadence === 'PATIENT' || player.prefs?.rallyCadence === 'MEASURED';
    const minHist   = isPatient ? 2 : 3;
    if (hist.length >= minHist) {
      const last = hist.slice(-minHist);
      if (last.every(h => h.dir === last[0].dir) && last[0].dir !== 0) {
        const antMult = isPatient ? 1.5 : player.prefs?.rallyCadence === 'EXPLOSIVE' ? 0.5 : 1.0;
        finalX = clamp(finalX + last[0].dir * 0.25 * antMult, -2.5, 2.5);
      }
    }
  }

  // Coach POSITIONING_HINT
  if (player._positionBias && Math.abs(player._positionBias) > 0.01) {
    finalX = clamp(finalX + player._positionBias, -2.5, 2.5);
  }

  let safeY;
  if (isNetApproach) {
    const netY = player.side * 2.8;
    const midY = player.side * (COURT.halfL * 0.40);
    safeY = courtMode === 'NET' ? netY : midY;
  } else {
    const baselineY = getStyleBaselineY(player);
    safeY = player.side > 0
      ? Math.max(baselineY, player.pos.y)
      : Math.min(baselineY, player.pos.y);
  }

  return { x: finalX, y: safeY };
}

/**
 * MOVE target: onde a bola estará na altura ideal para bater.
 * [FASE 1 — de v3] predY corrigido via projeção de 0.18s.
 * [FASE 5] maxContactZ varia por prefs.rallyCadence:
 *   EXPLOSIVE bate na subida (0.55m), PATIENT no topo (1.00m).
 *   Passado como maxTime ao predictTrajectory via contactZ calibrado.
 *
 * predY: em vez de usar a baseline fixa, projeta onde a bola estará
 * em ~0.18s (tempo para subir do quique à HIP zone). Isso corrige o
 * bug de v1 onde o jogador recuava demais esperando a bola na baseline
 * quando ela já estava subindo mais à frente.
 */

// [FASE 5] Altura de contato por rallyCadence.
// EXPLOSIVE: bate na subida (0.55m). PATIENT: espera o topo (1.00m).
const CONTACT_Z_BY_CADENCE = {
  EXPLOSIVE:    0.55,
  EARLY_ATTACK: 0.65,
  BALANCED:     0.75,
  MEASURED:     0.85,
  PATIENT:      1.00,
};

const SURFACE_READ_TUNING = {
  GRASS:  Object.freeze({ contactZDelta: -0.12, predTimeDelta: -0.30, slowBallThreshold: 9.2, serveContactZ: 0.52 }),
  INDOOR: Object.freeze({ contactZDelta: -0.08, predTimeDelta: -0.22, slowBallThreshold: 8.8, serveContactZ: 0.56 }),
  HARD:   Object.freeze({ contactZDelta:  0.00, predTimeDelta:  0.00, slowBallThreshold: 8.3, serveContactZ: 0.60 }),
  CLAY:   Object.freeze({ contactZDelta:  0.10, predTimeDelta:  0.35, slowBallThreshold: 7.6, serveContactZ: 0.72 }),
};

function getSurfaceReadTuning(courtPhysics) {
  const surface = (courtPhysics?.surface ?? 'HARD').toUpperCase();
  return SURFACE_READ_TUNING[surface] ?? SURFACE_READ_TUNING.HARD;
}

function computePredInterceptY(player, gs, surfaceRead) {
  if (player.atNet) return player.pos.y;

  const side = player.side > 0 ? 1 : -1;
  const ballY = gs.ball.pos.y;
  const ballVY = gs.ball.vel.y;
  const playerY = player.pos.y;
  const baselineY = getStyleBaselineY(player);
  const goingTowardPlayer = side > 0 ? ballVY > 0 : ballVY < 0;
  const projectedBallY = ballY + ballVY * 0.18;
  const mySideBallY = clamp(projectedBallY, -COURT.halfL, COURT.halfL);
  const sameSideNow = Math.sign(ballY || side) === side;
  const shortAttackLine = side * (COURT.halfL * 0.52);
  const midCourtLine = side * (COURT.halfL * 0.72);
  const deepReadLine = side * (COURT.halfL * 0.88);

  if (!goingTowardPlayer && !sameSideNow) {
    return baselineY;
  }

  const anchoredBallY = side > 0
    ? Math.max(mySideBallY, shortAttackLine)
    : Math.min(mySideBallY, shortAttackLine);

  if (!sameSideNow) {
    return anchoredBallY;
  }

  const isShortBall = side > 0
    ? anchoredBallY < midCourtLine
    : anchoredBallY > midCourtLine;
  const isVeryShortBall = side > 0
    ? anchoredBallY < shortAttackLine
    : anchoredBallY > shortAttackLine;

  if (isVeryShortBall) {
    return anchoredBallY;
  }

  if (isShortBall) {
    return side > 0
      ? Math.max(anchoredBallY, playerY - 0.15)
      : Math.min(anchoredBallY, playerY + 0.15);
  }

  const depthBias = surfaceRead.predTimeDelta < 0 ? 0.58 : surfaceRead.predTimeDelta > 0 ? 0.78 : 0.68;
  const blendedY = playerY + (anchoredBallY - playerY) * depthBias;
  const guardedY = side > 0
    ? clamp(blendedY, deepReadLine, COURT.halfL)
    : clamp(blendedY, -COURT.halfL, deepReadLine);

  return side > 0
    ? Math.max(guardedY, baselineY - 0.25)
    : Math.min(guardedY, baselineY + 0.25);
}

function computeMoveTarget(player, gs) {
  const airDens     = gs.environment?.airDensity ?? 1.2;
  const depthOffset = getStyleDepthOffset(player);
  const outerX      = COURT.halfW + THRESHOLDS.outerPlayerX;
  const outerY      = COURT.halfL + THRESHOLDS.outerPlayerY;
  const surfaceRead = getSurfaceReadTuning(gs.courtPhysics);

  // [FASE 5] Altura de contato por cadência — usada como referência
  // para quando predictTrajectory deve encontrar optimalHitPoint.
  const baseContactZ = player.prefs
    ? (CONTACT_Z_BY_CADENCE[player.prefs.rallyCadence] ?? 0.75)
    : 0.75;
  const contactZ = clamp(baseContactZ + surfaceRead.contactZDelta, 0.38, 1.10);
  // maxTime estendido levemente para PATIENT (precisa esperar a bola subir mais)
  const predMaxTimeBase = player.atNet ? 1.2 : (contactZ > 0.80 ? 3.2 : 2.8);
  const predMaxTime = Math.max(1.2, predMaxTimeBase + surfaceRead.predTimeDelta);

  // Bola muito lenta: predictTrajectory falha — ir direto à bola
  const ballSpd3dSlow = Math.sqrt(gs.ball.vel.x**2 + gs.ball.vel.y**2 + gs.ball.vel.z**2);
  const isSlowBounced = (gs.ball.bounceCount ?? 0) >= 1
    && ballSpd3dSlow < surfaceRead.slowBallThreshold
    && ballSpd3dSlow > 0.05
    && gs.ball.inFlight;

  if (isSlowBounced) {
    return {
      x: clamp(gs.ball.pos.x, -outerX + 0.2, outerX - 0.2),
      y: clamp(gs.ball.pos.y, -outerY, outerY),
      t: null,
    };
  }

  const alreadyBounced = (gs.ball.bounceCount ?? 0) >= 1;

  // predY corrigido [FASE 1]: projeção de 0.18s em vez de baseline fixa
  const predY = computePredInterceptY(player, gs, surfaceRead);

  const { landPoint, optimalHitPoint, crossPoint } = predictTrajectory(
    gs.ball, predY, predMaxTime, airDens, gs.courtPhysics, { preferredContactZ: contactZ }
  );

  // Modo desesperado: margem muito negativa → landPoint direto
  const currentMargin = player._arrivalMargin ?? 0;
  const isDesperate   = currentMargin < -0.30;

  if (isDesperate && landPoint) {
    return {
      x: clamp(landPoint.x, -outerX + 0.2, outerX - 0.2),
      y: clamp(landPoint.y + player.side * 0.2, -outerY, outerY),
      t: landPoint.t,
    };
  }

  if (optimalHitPoint) {
    const optHitThresh = alreadyBounced ? outerY : COURT.halfL + 0.5;
    const optBeyond    = player.side > 0
      ? optimalHitPoint.y > optHitThresh
      : optimalHitPoint.y < -optHitThresh;

    if (optBeyond && landPoint) {
      return {
        x: clamp(landPoint.x, -outerX + 0.2, outerX - 0.2),
        y: clamp(landPoint.y + player.side * 0.3, -outerY, outerY),
        t: landPoint.t,
      };
    }

    const ballSpd    = Math.sqrt(gs.ball.vel.x**2 + gs.ball.vel.y**2 + gs.ball.vel.z**2);
    const isSlowBall = ballSpd < 8.0;

    // depthOffset só para bolas lentas — rápidas já têm optimalHitPoint correto
    let hitY = optimalHitPoint.y;
    if (isSlowBall) {
      hitY = hitY + player.side * Math.min(depthOffset * 0.3, 0.4);
    }

    // Ruído perceptivo (stamina + rally pressure + surface)
    const bounceVar     = gs.courtMods?.bounceVariance ?? 0;
    const _ctrlForNoise = (player.attrs?.controle ?? 60) / 100;
    const consistFrac   = _ctrlForNoise * 0.9;
    const noiseScale    = ((1 - (player.stamina ?? 1)) * 0.18)
                        + ((player.ctx?.rallyPressure ?? 0) * 0.45)
                        + bounceVar * (1 - consistFrac) * 0.8;
    let hitX = optimalHitPoint.x;
    if (noiseScale > 0.04) {
      const u1 = Math.max(1e-9, Math.random()), u2 = Math.random();
      hitX += Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2) * noiseScale * 0.65;
    }

    return {
      x: clamp(hitX, -outerX + 0.2, outerX - 0.2),
      y: clamp(hitY, -outerY, outerY),
      t: optimalHitPoint.t,
    };
  }

  if (landPoint) {
    const ballSpd3d  = Math.sqrt(gs.ball.vel.x**2 + gs.ball.vel.y**2 + gs.ball.vel.z**2);
    const isSlowFb   = ballSpd3d < 8.0;
    const isDeepBall = Math.abs(landPoint.y) > COURT.halfL * 0.78;
    const prefDeep   = player.prefs?.rallyCadence === 'PATIENT' || player.prefs?.rallyCadence === 'MEASURED';
    const prefFwd    = player.prefs?.netGame === 'HUNTER' || player.prefs?.netGame === 'PROACTIVE';
    const behind     = isDeepBall
      ? (prefDeep ? 1.2 : prefFwd ? 0.2 : 0.8)
      : isSlowFb
      ? (prefDeep ? 0.5 : 0.2)
      : (prefDeep ? 1.8 : prefFwd ? 0.3 : 1.0);
    return {
      x: clamp(landPoint.x, -outerX + 0.2, outerX - 0.2),
      y: clamp(landPoint.y + player.side * behind, -outerY, outerY),
      t: landPoint.t,
    };
  }

  if (crossPoint && crossPoint.z < 2.8) {
    return {
      x: clamp(crossPoint.x, -outerX + 0.2, outerX - 0.2),
      y: player.pos.y,
      t: crossPoint.t,
    };
  }

  return {
    x: clamp(gs.ball.pos.x, -outerX + 0.3, outerX - 0.3),
    y: player.pos.y,
    t: null,
  };
}

/**
 * RECOVER target após bater a bola.
 * [FASE 1 — de v3] Snapshot calculado UMA VEZ na transição → RECOVER.
 * [FASE 3] NET/TRANSITION delegam para computeNetPos/computeTransitionPos.
 */
function computeRecoverTarget(player, gs) {
  const lastShotX = player.ctx?._lastShotX ?? 0;
  const bisectorX = clamp(lastShotX * 0.20, -1.5, 1.5);
  const courtMode = player.ctx?.courtMode ?? 'BASE';

  if (courtMode === 'TRANSITION') {
    return computeTransitionPos(player, gs);
  }

  if (courtMode === 'NET') {
    return computeNetPos(player, gs);
  }

  const baselineY = getStyleBaselineY(player);
  const biasX     = player._positionBias ?? 0;
  return { x: clamp(bisectorX + biasX, -2.0, 2.0), y: baselineY };
}

// ──────────────────────────────────────────────────────────────────
// FASE 3 — POSIÇÕES DE REDE E LOB (funções puras de v2)
// ──────────────────────────────────────────────────────────────────

/**
 * Posição na rede por prefs.netGame.
 * [FASE 3 — de v2] HUNTER fica a 2.2m da rede; AVOIDS a 3.5m.
 * T-position cobre ângulo do adversário + bisector do último golpe.
 */
function computeNetPos(player, gs) {
  const opp       = gs?.players?.find(p => p.id !== player.id);
  const oppX      = opp?.pos?.x ?? 0;
  const lastShotX = player.ctx?._lastShotX ?? 0;

  const netDistFromNet = player.prefs ? ({
    HUNTER:      2.2,
    PROACTIVE:   2.5,
    OPPORTUNIST: 2.8,
    RELUCTANT:   3.2,
    AVOIDS:      3.5,
  }[player.prefs.netGame] ?? 2.8) : 2.8;

  const tPosX = clamp(
    oppX * 0.35 + lastShotX * 0.15,
    -2.2, 2.2
  );

  return {
    x: tPosX,
    y: player.side * netDistFromNet,
  };
}

/**
 * Posição de transição (approach): mid-court ofensivo, ~40% da quadra.
 * [FASE 3 — de v2] Cobre ângulo via approachLandX.
 */
function computeTransitionPos(player, gs) {
  const lastShotX     = player.ctx?._lastShotX ?? 0;
  const bisectorX     = clamp(lastShotX * 0.20, -2.0, 2.0);
  const approachLandX = player.ctx?._approachLandX ?? 0;
  const coverX        = clamp(bisectorX * 0.6 + approachLandX * 0.4, -2.2, 2.2);
  const transY        = player.side * (COURT.halfL * 0.38);
  return { x: coverX, y: transY };
}

/**
 * Detecta lob real (â‰  bola normal de topspin).
 * [FASE 3 — de v2] Threshold calibrado por lobCovMult.
 * Bola normal topspin: 0.8–2.0m. Lob real: 3.5–6m.
 */
function isRealLob(player, gs) {
  const ball = gs.ball;
  if (!player.atNet)                         return false;
  if (ball.lastHitBy === player.id)          return false;
  if (!ball.inFlight)                        return false;
  if (Math.sign(ball.pos.y) === player.side) return false;

  const lobZ = player.mods ? 2.8 + player.mods.lobCovMult * 0.40 : 2.8;
  return ball.pos.z > lobZ && ball.vel.z > 0;
}

/**
 * Decide se o jogador na rede deve recuar por causa de lob profundo.
 * [FASE 3 — de v2] Projeta onde a bola vai cair; recua se > 3m além da rede.
 */
function shouldRetreatFromLob(player, gs) {
  if (!isRealLob(player, gs)) return false;

  const ball   = gs.ball;
  const vz     = ball.vel.z;
  const G      = 9.8;
  const BALL_R = 0.07;
  const netY   = player.side * 2.8;

  if (vz >= 0) {
    const tApex = vz / G;
    const yApex = ball.pos.y + ball.vel.y * tApex;
    return Math.abs(yApex) > Math.abs(netY) + 3.0;
  }

  const a = 0.5 * G, b = -vz, cc = BALL_R - ball.pos.z;
  const disc = b * b - 4 * a * cc;
  if (disc < 0) return true;
  const t = (-b - Math.sqrt(disc)) / (2 * a);
  if (t < 0.001) return true;
  const landY = ball.pos.y + ball.vel.y * t;
  return Math.abs(landY) > Math.abs(netY) + 3.0;
}

// ──────────────────────────────────────────────────────────────────
// VELOCIDADES POR ESTADO
// ──────────────────────────────────────────────────────────────────

function getMoveSpeed(player, target, arrivalMargin, physMaxSpd) {
  const d = dist2(player.pos, target) || 0;
  const accelRush = clamp(1 + (((player.mods?.accelMult ?? 1) - 1) * 0.80), 0.96, 1.18);
  const speedRush = clamp(1 + (((player.mods?.speedMult ?? 1) - 1) * 0.55), 0.96, 1.14);
  const rushBoost = clamp(accelRush * 0.58 + speedRush * 0.42, 0.98, 1.16);
  if (arrivalMargin <= 0) return physMaxSpd * MOVEMENT.urgencySprint * rushBoost;
  const needed = d / (arrivalMargin * 0.85);
  const floorMult = arrivalMargin < 0.16
    ? MOVEMENT.urgencyRun
    : arrivalMargin < 0.45
      ? MOVEMENT.urgencyJog
      : MOVEMENT.urgencyWalk;
  const capMult = arrivalMargin < 0.08
    ? MOVEMENT.urgencySprint * rushBoost
    : arrivalMargin < 0.22
      ? MOVEMENT.urgencyRun * rushBoost
      : 1.0;
  return clamp(needed, physMaxSpd * floorMult, physMaxSpd * capMult);
}

function getRecoverSpeed(player, recoverTarget, physMaxSpd) {
  const courtMode = player.ctx?.courtMode ?? 'BASE';
  if (courtMode === 'TRANSITION') return physMaxSpd * 0.95;
  const d = dist2(player.pos, recoverTarget) || 0;
  if (d < 0.5) return physMaxSpd * 0.30;
  return physMaxSpd * clamp(0.30 + (d - 0.5) / 3.0 * 0.48, 0.30, 0.78);
}

// ──────────────────────────────────────────────────────────────────
// SUAVIZAÇÃO DE TARGET (apenas para MOVE)
// ──────────────────────────────────────────────────────────────────

/**
 * Blend entre rawTarget e _stableTarget para evitar samba de predição.
 * [FASE 1 — de v3] Alpha por urgência de margem.
 *
 * Aplicado APENAS em MOVE. WAIT e RECOVER usam applyWaitMovement
 * com eixos independentes — não precisam de smoothing de vetor.
 */
function applyTargetSmoothing(player, rawTarget, arrivalMargin) {
  if (!player._stableTarget) {
    player._stableTarget = { ...rawTarget };
    return rawTarget;
  }

  const courtMode     = player.ctx?.courtMode ?? 'BASE';
  const isNetApproach = courtMode === 'TRANSITION' || courtMode === 'NET';

  const alpha = isNetApproach
    ? 0.70
    : (arrivalMargin < 0.15 ? 0.90 : 0.50);

  player._stableTarget.x += (rawTarget.x - player._stableTarget.x) * alpha;
  player._stableTarget.y += (rawTarget.y - player._stableTarget.y) * alpha;
  return { ...player._stableTarget };
}

// ──────────────────────────────────────────────────────────────────
// FASE 2 — MOVIMENTO DE ESPERA COM EIXOS X/Y SEPARADOS
// ──────────────────────────────────────────────────────────────────

/**
 * applyWaitMovement — eixos X e Y completamente independentes.
 * [FASE 2 — de v2]
 *
 * Em tênis real, o jogador faz coisas distintas nos dois eixos no WAIT:
 *   Y (profundidade): recua deliberadamente para a baseline — urgente.
 *   X (lateral):      shuffle suave para cobrir o bisector — lento, separado.
 *
 * Problema de applyMovementPhysics em WAIT (v1/v3):
 *   Move X+Y como vetor diagonal único → cria arco circular ao reposicionar.
 *   No tênis real: recua em Y enquanto drifa lateralmente em X, de forma
 *   independente. Os dois eixos não se acoplam.
 *
 * Usado nos estados WAIT e RECOVER.
 * MOVE continua usando applyMovementPhysics (precisa do vetor urgente).
 */
function applyWaitMovement(player, target, dt) {
  if (!dt || dt <= 0) return;

  const staminaFrac = player.stamina ?? 1.0;
  const baseSpeed   = player.playerSpeed || PLAYER_CFG.speed;
  const physMax     = baseSpeed * (STAMINA.speedMinFactor + staminaFrac * (1 - STAMINA.speedMinFactor));

  const OUTER_Y = COURT.halfL + THRESHOLDS.outerPlayerY;
  const OUTER_X = COURT.halfW + THRESHOLDS.outerPlayerX;

  // ── Y: recua para profundidade alvo ──────────────────────────────
  // Urgente mas não sprint — reposicionamento deliberado.
  // backwardSpeedMult: penalidade de recuo (mais difícil recuar do que avançar).
  const dyFull = target.y - player.pos.y;
  const spdY   = physMax * MOVEMENT.urgencyJog * MOVEMENT.backwardSpeedMult;
  const stepY  = Math.min(Math.abs(dyFull), spdY * dt);
  player.vel.y = Math.sign(dyFull) * spdY;
  player.pos.y = clamp(
    player.pos.y + Math.sign(dyFull) * stepY,
    -OUTER_Y, OUTER_Y
  );

  // ── X: shuffle lateral suave ──────────────────────────────────────
  // 35% da velocidade máxima — cobre o bisector sem parecer corrida.
  // Completamente independente do movimento em Y.
  const dxFull = target.x - player.pos.x;
  const spdX   = physMax * 0.35;
  const stepX  = Math.min(Math.abs(dxFull), spdX * dt);
  player.vel.x = Math.sign(dxFull) * spdX;
  player.pos.x = clamp(
    player.pos.x + Math.sign(dxFull) * stepX,
    -OUTER_X, OUTER_X
  );

  // NaN guard [FASE 2 — de v2]
  if (!isFinite(player.vel.x)) player.vel.x = 0;
  if (!isFinite(player.vel.y)) player.vel.y = 0;
  if (!isFinite(player.pos.x)) player.pos.x = 0;
  if (!isFinite(player.pos.y)) player.pos.y = player.side * (COURT.halfL + 1.0);
}

// ──────────────────────────────────────────────────────────────────
// FÍSICA DE MOVIMENTO (para MOVE)
// ──────────────────────────────────────────────────────────────────

/**
 * Aceleração, inertia, reversal, slide-brake e bounds.
 * [FASE 1 — de v3, com NaN guards de v2]
 *
 * Usado APENAS no estado MOVE.
 * WAIT e RECOVER usam applyWaitMovement (fase 2) — sem diagonal.
 */
function applyMovementPhysics(player, target, maxSpd, dt, gs) {
  const mods        = player.mods;
  const outerY      = COURT.halfL + THRESHOLDS.outerPlayerY;
  const outerX      = COURT.halfW + THRESHOLDS.outerPlayerX;
  const staminaFrac = player.stamina ?? 1.0;
  const baseSpeed   = player.playerSpeed || PLAYER_CFG.speed;

  // [FASE 5] Coeficientes de slide por surface.
  // CLAY: slide-brake mais tardio e menos abrupto (saibro desliza).
  // GRASS: brake mais rápido e brusco (skid no relva).
  // HARD/default: parâmetros base de INERTIA sem alteração.
  const surface = gs.courtMeta?.surface ?? 'HARD';
  const slideRadiusCoeff = surface === 'CLAY'  ? 1.50
                         : surface === 'GRASS' ? 0.85
                         : 1.00;
  const slideDecelCoeff  = surface === 'CLAY'  ? 0.65
                         : surface === 'GRASS' ? 1.20
                         : 1.00;

  const ballComingToMe = gs.ball.inFlight &&
    ((player.side > 0 && gs.ball.vel.y > 0) || (player.side < 0 && gs.ball.vel.y < 0));
  const ballOnMyCourtSide = gs.ball.inFlight &&
    (Math.sign(gs.ball.pos.y) === player.side || Math.abs(gs.ball.pos.y) < 0.5);
  const isChasing = (ballComingToMe || ballOnMyCourtSide) && gs.ball.lastHitBy !== player.id;

  const dx   = target.x - player.pos.x;
  const dy   = target.y - player.pos.y;
  const dist = Math.sqrt(dx * dx + dy * dy) || 1e-9;

  // Penalidade direcional (lateral e trás mais lentos)
  let dirMult = 1.0;
  if (dist > 0.15) {
    const fwdDot = (-dy * player.side) / dist;
    if (fwdDot < -0.25) {
      dirMult = MOVEMENT.backwardSpeedMult;
    } else if (Math.abs(fwdDot) < 0.45) {
      const lateralMods = mods ? mods.decelMult : 1.0;
      const latBase = MOVEMENT.lateralSpeedMult;
      dirMult = latBase + (1.0 - latBase) * Math.min(1, (lateralMods - 0.72) / 0.56);
    }
  }

  const physMaxSpd = baseSpeed * (STAMINA.speedMinFactor + staminaFrac * (1 - STAMINA.speedMinFactor)) * dirMult;
  const rushAttr = clamp(
    1 + (((mods?.accelMult ?? 1) - 1) * 0.75) + (((mods?.speedMult ?? 1) - 1) * 0.45),
    1.0,
    1.18,
  );
  const rushBoost = isChasing && dist > 1.8 && maxSpd >= physMaxSpd * MOVEMENT.urgencyRun
    ? rushAttr
    : 1.0;
  const effectiveMaxSpd = Math.min(maxSpd, physMaxSpd * rushBoost);
  const dSpd = Math.min(effectiveMaxSpd, (dist / 0.3) * effectiveMaxSpd);
  const dvx  = (dist > 0.02 ? (dx / dist) * dSpd : 0) - player.vel.x;
  const dvy  = (dist > 0.02 ? (dy / dist) * dSpd : 0) - player.vel.y;
  const dvMag = Math.sqrt(dvx * dvx + dvy * dvy) || 1e-9;

  const currSpd = Math.sqrt(player.vel.x ** 2 + player.vel.y ** 2);
  const dot     = player.vel.x * dvx + player.vel.y * dvy;

  const maxAccelBase = player.playerAccel || PLAYER_CFG.maxAccel;
  const maxDecelBase = player.playerDecel || PLAYER_CFG.maxDecel;
  const effAccelBase = maxAccelBase * (INERTIA.staminaAccelMin + staminaFrac * (1 - INERTIA.staminaAccelMin));

  // Footwork state: planted (+30% accel) | striding | offBalance (-20%)
  const wasPlanted   = currSpd < 0.8;
  const footingState = player.ctx._footingState ?? 'striding';
  const footingTimer = player.ctx._footingTimer ?? 0;
  let footingMult    = footingState === 'planted' ? 1.30 : footingState === 'offBalance' ? 0.80 : 1.0;

  if (wasPlanted && !isChasing) {
    player.ctx._footingState = 'planted';
    player.ctx._footingTimer = 0.08;
  } else if (footingState === 'planted' && footingTimer <= 0) {
    player.ctx._footingState = 'striding';
    player.ctx._footingTimer = 0;
  } else if (footingState === 'offBalance') {
    player.ctx._footingTimer = Math.max(0, footingTimer - dt);
    if (player.ctx._footingTimer <= 0) player.ctx._footingState = 'striding';
  } else if (footingState === 'planted') {
    player.ctx._footingTimer = Math.max(0, footingTimer - dt);
  }

  if (player.ctx._postHitPause <= 0 && player._lastShotWhileRunning) {
    player.ctx._footingState = 'offBalance';
    player.ctx._footingTimer = 0.15;
    player._lastShotWhileRunning = false;
  }

  const effAccel = effAccelBase * footingMult;

  let accel;
  if (dist < 0.15) {
    if (currSpd < 1.2) {
      player.vel.x *= 0.30;
      player.vel.y *= 0.30;
      player.pos.x += player.vel.x * dt;
      player.pos.y += player.vel.y * dt;
      return;
    }
    accel = PLAYER_CFG.friction;
    player.ctx._reversalFrames = 0;
  } else if (dot < 0) {
    const targetDirDot = dist > 0.01
      ? (player.vel.x * (dx / dist) + player.vel.y * (dy / dist)) / (currSpd || 1e-9)
      : 0;
    if (targetDirDot < INERTIA.reversal180Dot && currSpd > 1.0) {
      const _expMult   = mods ? mods.accelMult : 1.0;
      const physFrames = Math.round(INERTIA.reversal180Frames / (_expMult || 1.0));
      player.ctx._reversalFrames = physFrames;
    }
    if (player.ctx._reversalFrames > 0) {
      player.ctx._reversalFrames--;
      const r180Mult = mods ? mods.accelMult : 1.0;
      accel = effAccel * INERTIA.reversal180AccelMult * r180Mult;
    } else if (currSpd > INERTIA.overrunThreshold) {
      const orMult = mods ? mods.decelMult : 1.0;
      accel = maxDecelBase * INERTIA.overrunDecelMult * orMult;
    } else {
      accel = maxDecelBase;
    }
  } else {
    const adaptiveBrakeRadius = Math.max(INERTIA.slideBrakeRadius, currSpd * 0.22) * slideRadiusCoeff;
    const isBraking = isChasing && dist < adaptiveBrakeRadius && currSpd > INERTIA.slideBrakeSpeedMin;
    if (isBraking) {
      const brakeIntensity = 1.0 - (dist / adaptiveBrakeRadius);
      const brakeMult      = 1.0 + (INERTIA.slideBrakeDecelMult * slideDecelCoeff - 1.0) * brakeIntensity;
      const lateralMods    = mods ? mods.decelMult : 1.0;
      accel = maxDecelBase * brakeMult * lateralMods;
    } else {
      accel = effAccel;
    }
    player.ctx._reversalFrames = Math.max(0, player.ctx._reversalFrames - 1);
  }

  const frac = Math.min(1, (accel * dt) / dvMag);
  player.vel.x += dvx * frac;
  player.vel.y += dvy * frac;
  const spd = Math.sqrt(player.vel.x ** 2 + player.vel.y ** 2);
  if (spd > effectiveMaxSpd) {
    player.vel.x = (player.vel.x / spd) * effectiveMaxSpd;
    player.vel.y = (player.vel.y / spd) * effectiveMaxSpd;
  }

  // NaN guard [FASE 2 — de v2]
  if (!isFinite(player.vel.x)) player.vel.x = 0;
  if (!isFinite(player.vel.y)) player.vel.y = 0;

  player.pos.x += player.vel.x * dt;
  player.pos.y += player.vel.y * dt;

  if (!isFinite(player.pos.x)) player.pos.x = 0;
  if (!isFinite(player.pos.y)) player.pos.y = player.side * (COURT.halfL + 1.0);

  // Sprint stamina drain
  if (gs.ball.inFlight) {
    const sprintFrac = Math.max(0, (spd - STAMINA.sprintThreshold * effectiveMaxSpd) / (effectiveMaxSpd * (1 - STAMINA.sprintThreshold) || 1));
    if (sprintFrac > 0) {
      player.stamina = Math.max(0, player.stamina - STAMINA.sprintDecayRate * sprintFrac * dt);
    }
  }

  // Bounds
  player.pos.y = player.side > 0
    ? clamp(player.pos.y,  0.5, outerY)
    : clamp(player.pos.y, -outerY, -0.5);
  player.pos.x = clamp(player.pos.x, -outerX, outerX);
  if (Math.abs(player.pos.x) >= outerX - 0.01) player.vel.x = 0;
  if (Math.abs(player.pos.y) >= outerY - 0.01) player.vel.y = 0;
}

// ──────────────────────────────────────────────────────────────────
// RETORNO DE SAQUE
// ──────────────────────────────────────────────────────────────────

/**
 * handleServeReturn — lógica de retorno preservada de v3.
 * _readPauseFrames: hesitação proporcional à velocidade do saque.
 *   240 km/h → 3 frames, cap 45%
 *   210 km/h → 2 frames, cap 60%
 *   <165 km/h → sem hesitação (2º saque típico)
 */
function handleServeReturn(player, gs, dt) {
  const returnY = player.side * (COURT.halfL + 1.5);
  const outerY  = COURT.halfL + THRESHOLDS.outerPlayerY;
  const outerX  = COURT.halfW + THRESHOLDS.outerPlayerX;

  const ballDistFromNet = Math.abs(gs.ball.pos.y);
  const ballOnServerFar = Math.sign(gs.ball.pos.y) !== player.side
                       && ballDistFromNet > COURT.serviceLineY;

  if (ballOnServerFar) {
    // Split-step: congela levemente enquanto lê o saque
    player.vel.x *= 0.55;
    player.vel.y *= 0.55;
    player.pos.x += player.vel.x * dt;
    player.pos.y += player.vel.y * dt;
    return;
  }

  if ((player._readPauseFrames ?? 0) === 0 && !player._readDelayInit) {
    const sKmh    = gs.ball._serveExitKmh ?? 0;
    const retMult = player.mods?.returnMult ?? 0.82;
    const rawFrames = Math.max(0, (sKmh - 165) / 30);
    const skillMult = clamp(1.25 - retMult * 0.25, 0.80, 1.10);
    player._readPauseFrames = Math.round(rawFrames * skillMult);
    player._readDelayInit   = true;
  }

  let _reactionSpeedCap = 1.0;
  if ((player._readPauseFrames ?? 0) > 0) {
    player._readPauseFrames--;
    const framesLeft = player._readPauseFrames;
    _reactionSpeedCap = clamp(0.75 - framesLeft * 0.15, 0.45, 0.75);
    if (player._readPauseFrames === 0) player._readDelayInit = false;
  }

  const airDens  = gs.environment?.airDensity ?? 1.2;
  const surfaceRead = getSurfaceReadTuning(gs.courtPhysics);
  const { landPoint: serveLand, optimalHitPoint: serveOpt } = predictTrajectory(
    gs.ball,
    returnY,
    Math.max(1.8, 2.8 + surfaceRead.predTimeDelta * 0.8),
    airDens,
    gs.courtPhysics,
    { preferredContactZ: surfaceRead.serveContactZ },
  );

  const serveLandAbsY    = serveLand ? Math.abs(serveLand.y) : COURT.halfL;
  const serveIsShort     = serveLandAbsY < COURT.halfL * 0.72;
  const serveIsVeryShort = serveLandAbsY < COURT.halfL * 0.50;
  const nearNet          = player.side * 1.5;
  const deepCap          = returnY;

  let target = { x: player.pos.x, y: returnY };

  if (serveOpt) {
    target.x = clamp(serveOpt.x, -outerX + 0.2, outerX - 0.2);
    target.y = player.side > 0
      ? clamp(serveOpt.y, nearNet, deepCap)
      : clamp(serveOpt.y, deepCap, nearNet);
  } else if (serveIsVeryShort && serveLand) {
    const rushY = serveLand.y + player.side * 0.5;
    target.x = clamp(serveLand.x, -outerX + 0.2, outerX - 0.2);
    target.y = player.side > 0 ? clamp(rushY, nearNet, deepCap) : clamp(rushY, deepCap, nearNet);
  } else if (serveIsShort && serveLand) {
    const shortY = serveLand.y + player.side * 1.0;
    target.x = clamp(serveLand.x, -outerX + 0.2, outerX - 0.2);
    target.y = player.side > 0 ? clamp(shortY, nearNet, deepCap) : clamp(shortY, deepCap, nearNet);
  } else if (serveLand) {
    target.x = clamp(serveLand.x, -outerX + 0.2, outerX - 0.2);
    target.y = returnY;
  }

  const staminaFrac  = player.stamina ?? 1.0;
  const baseSpeed    = player.playerSpeed || PLAYER_CFG.speed;
  const maxSpd2Base  = baseSpeed * (STAMINA.speedMinFactor + staminaFrac * (1 - STAMINA.speedMinFactor));
  const dx2   = target.x - player.pos.x;
  const dy2   = target.y - player.pos.y;
  const dist2_ = Math.sqrt(dx2*dx2 + dy2*dy2) || 1e-9;
  const serveRefT = serveOpt?.t ?? (serveLand?.t ?? 0.8);
  const margin2   = serveRefT - dist2_ / (maxSpd2Base || 0.1);
  const urgency2  = margin2 > 0.4 ? MOVEMENT.urgencyJog
                  : margin2 > 0.0 ? MOVEMENT.urgencyRun
                  :                 MOVEMENT.urgencySprint;
  const returnRush = clamp(
    1 + (((player.mods?.accelMult ?? 1) - 1) * 0.70) + (((player.mods?.speedMult ?? 1) - 1) * 0.35),
    1.0,
    1.18,
  );
  const maxSpd2 = maxSpd2Base * urgency2 * _reactionSpeedCap * (margin2 < 0.08 ? returnRush : 1 + (returnRush - 1) * 0.55);
  const dSpd2   = Math.min(maxSpd2, dist2_ / 0.4 * maxSpd2);
  const dvx2    = (dist2_ > 0.02 ? (dx2/dist2_)*dSpd2 : 0) - player.vel.x;
  const dvy2    = (dist2_ > 0.02 ? (dy2/dist2_)*dSpd2 : 0) - player.vel.y;
  const dvMag2  = Math.sqrt(dvx2*dvx2 + dvy2*dvy2) || 1e-9;
  const frac2   = Math.min(1, (PLAYER_CFG.maxAccel * dt) / dvMag2);
  player.vel.x += dvx2 * frac2;
  player.vel.y += dvy2 * frac2;
  const spd2 = Math.sqrt(player.vel.x**2 + player.vel.y**2);
  if (spd2 > maxSpd2) {
    player.vel.x = (player.vel.x/spd2)*maxSpd2;
    player.vel.y = (player.vel.y/spd2)*maxSpd2;
  }
  player.pos.x += player.vel.x * dt;
  player.pos.y += player.vel.y * dt;
  player.pos.y = player.side > 0
    ? clamp(player.pos.y, 0.5, outerY)
    : clamp(player.pos.y, -outerY, -0.5);
  player.pos.x = clamp(player.pos.x, -outerX, outerX);
}

// ──────────────────────────────────────────────────────────────────
// EXPORTAÇÃO PRINCIPAL
// ──────────────────────────────────────────────────────────────────

/**
 * updatePlayerMovement(player, gs, dt)
 *
 * Substitui updatePlayer() do ai.js para a lógica de posicionamento.
 * aiDecideShot() permanece em ai.js — não é afetado por essa mudança.
 *
 * FASE 1 — esqueleto de v3:
 *   FSM, computeWaitTarget, computeMoveTarget (predY correto),
 *   computeRecoverTarget, give-up logic, stale _hitTarget guard,
 *   target smoothing, _predCrossX, Coach _positionBias.
 *
 * FASE 2 — eixos X/Y separados (de v2):
 *   WAIT e RECOVER → applyWaitMovement (sem arco circular).
 *   MOVE → applyMovementPhysics (vetor urgente ao intercept, unchanged).
 *   NaN/Infinity guards em ambas as funções de física.
 *
 * FASE 3 — rede e lob como funções puras (de v2):
 *   computeNetPos: distância da rede por prefs.netGame (HUNTER 2.2m → AVOIDS 3.5m).
 *   computeTransitionPos: cobre ângulo via approachLandX.
 *   isRealLob / shouldRetreatFromLob: substituem bloco inline de lob.
 *
 * FASE 4 — split-step no rally (NOVO):
 *   Detecta quando adversário bate (lastHitBy muda) + vel > 1.5 m/s.
 *   Estado SPLITSTEP: vel *= 0.35 por frame durante 0.06–0.10s.
 *   Ao sair: footingState = 'planted' → explosão da primeira passada.
 *
 * FASE 5 — altura de contato e sliding por surface (NOVO):
 *   CONTACT_Z_BY_CADENCE: EXPLOSIVE bate a 0.55m na subida, PATIENT a 1.00m no topo.
 *   slideCoeff por surface: CLAY → raio Ã—1.5 + decel Ã—0.65; GRASS → raio Ã—0.85 + decel Ã—1.2.
 */
export function updatePlayerMovement(player, gs, dt) {
  if (!dt || dt <= 0 || !isFinite(dt)) return;

  const mods = player.mods;

  // ── Auto-retreat do net quando lobado ────────────────────────────
  // [FASE 3] Delega para shouldRetreatFromLob (função pura, de v2).
  // Antes: lógica inline + predictTrajectory extra todo frame.
  // Agora: isRealLob faz o gate rápido; shouldRetreatFromLob projeta o lob.
  if (shouldRetreatFromLob(player, gs)) {
    player.atNet = false;
    player.ctx.courtMode = 'BASE';
    player.ctx.transitionCooldown = 3;
  }

  const netY = player.side * 2.8;

  // ── Retorno de saque: lógica especial ────────────────────────────
  const isServeFlight = gs.isFirstBounce && player.id === gs.receiver && gs.ball.inFlight;
  if (isServeFlight) {
    return handleServeReturn(player, gs, dt);
  }

  // ── Post-hit fatigue: freeze breve com stamina baixa ─────────────
  if ((player.ctx._postHitPause ?? 0) > 0) {
    player.ctx._postHitPause -= dt;
    player.vel.x *= 0.75;
    player.vel.y *= 0.75;
    player.pos.x += player.vel.x * dt;
    player.pos.y += player.vel.y * dt;
    return;
  }

  // ── TRANSITION → NET: confirma rede ao chegar na net zone ────────
  if (player.ctx?.courtMode === 'TRANSITION' && !player.atNet) {
    const netZoneY   = player.side * (COURT.halfL * 0.42);
    const reachedNet = player.side > 0
      ? player.pos.y <= netZoneY
      : player.pos.y >= netZoneY;
    if (reachedNet) {
      player.atNet = true;
      player.ctx.courtMode = 'NET';
    }
  }

  // ── basePos: fonte única de verdade ──────────────────────────────
  // [FASE 3] Rede usa computeNetPos (distância por prefs.netGame).
  if (player.atNet) {
    const netPos     = computeNetPos(player, gs);
    player.basePos.x = netPos.x;
    player.basePos.y = netPos.y;
  } else {
    player.basePos.y = getStyleBaselineY(player);
  }

  // ── Invalidar predições pré-quique ────────────────────────────────
  // Quando bounceCount sobe, _hitTarget e _arrivalMargin têm valores
  // pré-quique que fazem inHitWindow disparar prematuramente.
  const currBounce = gs.ball.bounceCount ?? 0;
  if (currBounce > (player._lastSeenBounce ?? 0)) {
    player._lastSeenBounce = currBounce;
    player._hitTarget      = null;
    player._arrivalMargin  = undefined;
    player._stableTarget   = null;
  }

  // ── FSM ──────────────────────────────────────────────────────────
  const state     = getMovementState(player, gs);
  const prevState = player._prevMovState;
  player._movState     = state;
  player._prevMovState = state;

  // ── [FASE 4] Split-step: detecta quando adversário bate ──────────
  // Quando lastHitBy muda (adversário acabou de bater) e o jogador está
  // em movimento razoável, inicia o split-step: freio brusco de 0.06–0.10s
  // seguido de footingState='planted' para a explosão da primeira passada.
  const lastHitBy     = gs.ball.lastHitBy;
  const oppJustHit    = lastHitBy !== player.id
                      && lastHitBy !== (player.ctx._lastSeenHitBy ?? null);
  player.ctx._lastSeenHitBy = lastHitBy;

  if (oppJustHit && state === 'WAIT') {
    const currSpd = Math.sqrt(player.vel.x ** 2 + player.vel.y ** 2);
    if (currSpd > 1.5) {
      const dur = player.prefs ? ({
        EXPLOSIVE:    0.06,
        EARLY_ATTACK: 0.07,
        BALANCED:     0.08,
        MEASURED:     0.09,
        PATIENT:      0.10,
      }[player.prefs.rallyCadence] ?? 0.08) : 0.08;
      player.ctx._splitStepTimer = dur;
    }
  }

  // Timer tick do split-step
  if ((player.ctx._splitStepTimer ?? 0) > 0) {
    player.ctx._splitStepTimer = Math.max(0, player.ctx._splitStepTimer - dt);
    if (player.ctx._splitStepTimer === 0) {
      // Saiu do split-step → explosão da primeira passada
      player.ctx._footingState = 'planted';
      player.ctx._footingTimer = 0.08;
    }
  }

  // Snapshot do recover target na transição → RECOVER (não recalcular frame-a-frame)
  if (state === 'RECOVER' && prevState !== 'RECOVER') {
    player._recoverTarget = computeRecoverTarget(player, gs);
  }
  if (state === 'WAIT') {
    player._recoverTarget = null;
  }

  // ── Target bruto por estado ───────────────────────────────────────
  let rawTarget;

  if (state === 'WAIT') {
    rawTarget = computeWaitTarget(player, gs);

  } else if (state === 'MOVE') {
    const moveTarget = computeMoveTarget(player, gs);
    player._hitTarget = moveTarget;
    rawTarget = moveTarget;

    // _arrivalMargin e _predCrossX para o ContactModel
    if (moveTarget?.t != null) {
      const staminaFrac = player.stamina ?? 1.0;
      const baseSpeed   = player.playerSpeed || PLAYER_CFG.speed;
      const effSpeed    = baseSpeed * (STAMINA.speedMinFactor + staminaFrac * (1 - STAMINA.speedMinFactor));
      const d = dist2(player.pos, moveTarget);
      player._arrivalMargin = moveTarget.t - d / (effSpeed || 0.1);
      player._predCrossX    = moveTarget.x ?? player.pos.x;
    } else {
      player._arrivalMargin = undefined;
      player._predCrossX    = undefined;
    }

    // Micro-ajuste de contato: blend X para a bola real quando perto
    const ballComing3  = (player.side > 0 && gs.ball.vel.y > 0) || (player.side < 0 && gs.ball.vel.y < 0);
    const useVolleyAdj = player.atNet && gs.ball.bounceCount === 0 && ballComing3;
    if (gs.ball.bounceCount > 0 || useVolleyAdj) {
      const dToBall  = Math.sqrt((player.pos.x - gs.ball.pos.x)**2 + (player.pos.y - gs.ball.pos.y)**2);
      const reachRef = player.reach ?? 0.85;
      const blendWin = useVolleyAdj ? reachRef * 3.5 : reachRef * 2.2;
      const blendStr = useVolleyAdj ? 0.80 : 0.65;
      if (dToBall < blendWin) {
        const blend = Math.max(0, 1 - dToBall / blendWin);
        rawTarget.x = rawTarget.x * (1 - blend * blendStr) + gs.ball.pos.x * (blend * blendStr);
      }
    }

  } else if (state === 'SPLITSTEP') {
    // [FASE 4] Congela posição — freio brusco enquanto lê o adversário
    rawTarget = { x: player.pos.x, y: player.pos.y };

  } else if (state === 'HIT') {
    rawTarget = { x: player.pos.x, y: player.pos.y };

  } else { // RECOVER
    rawTarget = player._recoverTarget ?? computeRecoverTarget(player, gs);
  }

  // ── Give-up: apenas para bolas inalcançáveis (>1s atrasado) ──────
  if (state === 'MOVE') {
    const ballSpd3d  = Math.sqrt(gs.ball.vel.x**2 + gs.ball.vel.y**2 + gs.ball.vel.z**2);
    const isSlowBall = ballSpd3d < 7.0 && gs.ball.bounceCount >= 1;
    const giveUpThr  = isSlowBall ? INERTIA.giveUpMargin - 1.00 : INERTIA.giveUpMargin;
    const arrivalFGU = player._arrivalMargin ?? 0;
    if (arrivalFGU < giveUpThr && gs.ball.inFlight) {
      const comingToMe = (player.side > 0 && gs.ball.vel.y > 0) || (player.side < 0 && gs.ball.vel.y < 0);
      const distToBall = Math.sqrt((player.pos.x - gs.ball.pos.x)**2 + (player.pos.y - gs.ball.pos.y)**2);
      if (comingToMe && distToBall > (player.reach ?? 1.5) * 4.0) {
        rawTarget.x = clamp(rawTarget.x, player.pos.x - 1.5, player.pos.x + 1.5);
        rawTarget.y = player.basePos.y;
      }
    }
  }

  // ── Bisector X de recovery em WAIT ───────────────────────────────
  if (state === 'WAIT' && gs.players) {
    const ballOnOppSide = Math.sign(gs.ball.pos.y) !== player.side;
    const cMode = player.ctx.courtMode ?? 'BASE';
    if (ballOnOppSide && !player.atNet && cMode === 'BASE') {
      const lastShotX  = player.ctx._lastShotX ?? 0;
      player.basePos.x = clamp(lastShotX * 0.20, -1.2, 1.2);
    }
  }

  // ── [FASE 4] SPLITSTEP: freio brusco, planta os pés ─────────────
  // vel *= 0.35 por frame — para em ~0.06-0.10s. Ao sair,
  // footingState já foi setado para 'planted' no timer tick acima.
  if (state === 'SPLITSTEP') {
    player.vel.x *= 0.35;
    player.vel.y *= 0.35;
    player.pos.x += player.vel.x * dt;
    player.pos.y += player.vel.y * dt;
    return;
  }

  // ── HIT: planta os pés ───────────────────────────────────────────
  if (state === 'HIT') {
    player.vel.x *= 0.25;
    player.vel.y *= 0.25;
    player.pos.x += player.vel.x * dt;
    player.pos.y += player.vel.y * dt;
    return;
  }

  // ── WAIT / RECOVER: eixos X/Y separados [FASE 2] ─────────────────
  // Elimina o arco circular que applyMovementPhysics criava ao tratar
  // X+Y como vetor diagonal durante o reposicionamento.
  if (state === 'WAIT' || state === 'RECOVER') {
    applyWaitMovement(player, rawTarget, dt);
    return;
  }

  // ── MOVE: smoothing + physics ─────────────────────────────────────
  const margin = player._arrivalMargin ?? 0.3;
  const target = applyTargetSmoothing(player, rawTarget, margin);

  const staminaFrac = player.stamina ?? 1.0;
  const baseSpeed   = player.playerSpeed || PLAYER_CFG.speed;
  const physMaxSpd  = baseSpeed * (STAMINA.speedMinFactor + staminaFrac * (1 - STAMINA.speedMinFactor));
  const maxSpd      = getMoveSpeed(player, target, margin, physMaxSpd);

  applyMovementPhysics(player, target, maxSpd, dt, gs);
}

