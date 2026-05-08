// -------------------------------------------------------------------
// movement.js — Sistema de posicionamento unificado (v4)
// -------------------------------------------------------------------
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
//   NÃO decide como bater   ? shot engine offline
//   NÃO decide qual golpe   ? evChooseShot
//   NÃO gerencia stamina, spin, física de bola
//
// FSM DE 4 ESTADOS:
//   WAIT    ? bola no lado adversário. Bisector + baseline. X/Y separados.
//   MOVE    ? bola vindo. Corre para optimalHitPoint com urgência proporcional.
//   HIT     ? chegou com margem positiva. Planta. Prepara o golpe.
//   RECOVER ? acabou de bater. Retorna ao bisector. X/Y separados.
//
// CONTRATO COM game.js (campos que devem existir no player):
//   player._arrivalMargin   lido pelo ContactModel em tryHit()
//   player._predCrossX      lido pelo ContactModel para penalidade lateral
//   player.basePos          lido pelo renderer e debug
//   player.atNet            modificado pelo lob retreat, lido pelo volley
//   player._movState        debug string (WAIT/MOVE/HIT/RECOVER)
// -------------------------------------------------------------------

import { COURT, THRESHOLDS, PLAYER_CFG, STAMINA, INERTIA, MOVEMENT } from '../../core/constants.js';
import { clamp, dist2 } from '../../core/math.js';
import { offlineNoop as getWingRecoverBias } from '../shotlab/ShotEngineOffline.js';
import { predictTrajectory } from '../../core/physics.js';
import { logMovementState } from '../../core/unifiedLog.js';

function debugMovementHit(player, gs, phase, extra = null) {
  if (typeof window === 'undefined' || !window.HIT_DEBUG) return;
  const now = performance?.now?.() ?? Date.now();
  const key = `${phase}:${extra?.state ?? ''}:${extra?.contactClass ?? ''}:${extra?.reason ?? ''}`;
  if (player._movementDebugKey === key && now - (player._movementDebugAt ?? 0) < 120) return;
  player._movementDebugKey = key;
  player._movementDebugAt = now;
  console.log('[HIT-MOVE]', {
    player: player?.name,
    phase,
    rally: gs?.rally ?? 0,
    state: extra?.state ?? null,
    reason: extra?.reason ?? null,
    contactClass: extra?.contactClass ?? null,
    canContactBall: extra?.canContactBall ?? null,
    canExecutePlannedShot: extra?.canExecutePlannedShot ?? null,
    holdForRiseActive: extra?.holdForRiseActive ?? null,
    secondBounceThreat: extra?.secondBounceThreat ?? null,
    arrivalMargin: player?._arrivalMargin != null ? +player._arrivalMargin.toFixed(3) : null,
    ballPos: gs?.ball ? { x: +gs.ball.pos.x.toFixed(2), y: +gs.ball.pos.y.toFixed(2), z: +gs.ball.pos.z.toFixed(2) } : null,
  });
}

function blendScalar(a, b, t) {
  return a + (b - a) * t;
}

function clearTransientMovementFlags(player) {
  player._forceHitTransition = false;
  player._urgentDeadBallPickup = false;
  player._pickupReadyNow = false;
  player._movementCanContactBall = false;
  player._movementCanExecutePlannedShot = false;
  player._movementContactClass = null;
}

function normalize2(x = 0, y = 0) {
  const mag = Math.sqrt(x * x + y * y);
  if (!mag || !isFinite(mag)) return { x: 0, y: 0, mag: 0 };
  return { x: x / mag, y: y / mag, mag };
}

function updateReadMemory(player, gs, interceptProfile) {
  const ctx = player.ctx ?? (player.ctx = {});
  const side = player.side > 0 ? 1 : -1;
  const ball = gs?.ball;
  if (!ball?.vel) return null;

  const towardPlayer = side > 0 ? ball.vel.y > 0 : ball.vel.y < 0;
  const timeBias = clamp(0.18 + (interceptProfile?.predTimeDelta ?? 0) * 0.45, 0.07, 0.34);
  const futureX = clamp(ball.pos.x + ball.vel.x * timeBias, -COURT.singlesW / 2, COURT.singlesW / 2);
  const futureY = clamp(ball.pos.y + ball.vel.y * timeBias, -COURT.halfL, COURT.halfL);
  const laneX = clamp(
    blendScalar(ball.pos.x, futureX, towardPlayer ? 0.72 : 0.36),
    -COURT.singlesW / 2,
    COURT.singlesW / 2,
  );
  const depthY = clamp(
    blendScalar(ball.pos.y, futureY, towardPlayer ? 0.78 : 0.42),
    -COURT.halfL,
    COURT.halfL,
  );

  ctx._readLaneX = laneX;
  ctx._readDepthY = depthY;
  ctx._anticipationWindow = towardPlayer
    ? clamp(0.06 + Math.abs(ball.vel.y) * 0.012, 0.06, 0.18)
    : 0.04;
  ctx._anticipationTowardMe = towardPlayer;
  return { laneX, depthY, towardPlayer };
}

function updateMovementCommit(player, rawTarget, arrivalMargin, state) {
  if (state !== 'MOVE' || !rawTarget) {
    player._movementCommit = null;
    return null;
  }

  const desiredDir = normalize2(rawTarget.x - player.pos.x, rawTarget.y - player.pos.y);
  if (!desiredDir.mag) {
    player._movementCommit = null;
    return null;
  }

  const prev = player._movementCommit;
  const urgency = clamp(1 - (arrivalMargin ?? 0.3) / 0.55, 0, 1);
  const instantCommit = !!rawTarget._forceImmediate || arrivalMargin < 0.08;

  if (!prev || instantCommit) {
    const next = {
      x: desiredDir.x,
      y: desiredDir.y,
      strength: instantCommit ? 1 : clamp(0.42 + urgency * 0.40, 0.35, 0.88),
      age: 0,
      correctionBudget: instantCommit ? 0.95 : clamp(0.38 + urgency * 0.28, 0.26, 0.74),
    };
    player._movementCommit = next;
    return next;
  }

  const alignment = clamp(prev.x * desiredDir.x + prev.y * desiredDir.y, -1, 1);
  const sameLane = alignment > 0.80;
  // Reversão completa de direção (ex: jogador ia para esquerda, bola foi para direita):
  // resetar commit imediatamente em vez de resistir frame-a-frame com correctionBudget.
  // Sem isso, o commit "segura" a física por 3-4 frames antes de aceitar o novo alvo.
  const fullReversal = alignment < -0.55;
  if (fullReversal) {
    const next = {
      x: desiredDir.x,
      y: desiredDir.y,
      strength: clamp(0.42 + urgency * 0.40, 0.35, 0.88),
      age: 0,
      correctionBudget: clamp(0.38 + urgency * 0.28, 0.26, 0.74),
    };
    player._movementCommit = next;
    return next;
  }
  const correction = sameLane
    ? 0.22 + urgency * 0.18
    : clamp(prev.correctionBudget * (0.40 + urgency * 0.45), 0.18, 0.78);

  prev.x = blendScalar(prev.x, desiredDir.x, correction);
  prev.y = blendScalar(prev.y, desiredDir.y, correction);
  const normalized = normalize2(prev.x, prev.y);
  prev.x = normalized.x;
  prev.y = normalized.y;
  prev.strength = clamp(sameLane ? prev.strength + 0.06 : prev.strength - 0.10, 0.28, 0.92);
  prev.correctionBudget = clamp(
    sameLane ? prev.correctionBudget + 0.04 : prev.correctionBudget - 0.06,
    0.16,
    0.82,
  );
  prev.age = (prev.age ?? 0) + 1;
  return prev;
}

function gauss(mean = 0, sigma = 1) {
  const u1 = Math.max(1e-9, Math.random());
  const u2 = Math.random();
  return mean + sigma * Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

// ------------------------------------------------------------------
// PIPELINE BRIDGE — substitui ShotMaster (descontinuado)
// ------------------------------------------------------------------

/**
 * Mapeia ball.lastShotType (pipeline atual) para as famílias internas
 * usadas por getBallReadTuning e resolveContactWindowStrategy.
 *
 * Famílias internas:
 *   'DROP_SHOT'     — bola curta, morre rápido, exige corrida urgente
 *   'SLICE'         — baixa, rasteira, pinga cedo
 *   'TOPSPIN_DRIVE' — alta, pesada, quica alto
 *   'LOB'           — trajetória alta, sobrevoa rede
 *   null            — flat / volley / smash / desconhecido ? sem ajuste
 */
function getBallFamily(ball) {
  if (!ball) return null;
  const t = ball.lastShotType ?? null;
  if (!t) return null;
  if (t === 'DROP' || ball._isDropShot) return 'DROP_SHOT';
  if (t === 'SLICE' || t === 'SLICE_SHORT' || t === 'HALF_VOLLEY') return 'SLICE';
  if (t === 'TOPSPIN' || t === 'BANANA' || t === 'SHORT_ACCEL' || t === 'HEAVY_TOP' || t === 'TOP') return 'TOPSPIN_DRIVE';
  // Familias antigas de shot foram arquivadas; sem ajuste especial de bounce height.
  // Mas ACCEL profundo pode ter comportamento próximo a TOPSPIN; tratar como null
  // para não forçar recuo desnecessário em bolas flat.
  if (t === 'ACCEL' || t === 'DRIVE' || t === 'NORMAL' || t === 'SAFE') return null;
  if (t === 'LOB_DEF' || t === 'LOB_ATK' || t === 'DEF_LOB' || t === 'AGG_LOB' || t === 'LOB') return 'LOB';
  return null;
}

/**
 * buildMovementInterceptProfile — substitui a versão do ShotMaster.
 *
 * Constrói o perfil de interceptação baseado em:
 *   - player.prefs   (rallyCadence, netGame, riskProfile, buildStyle)
 *   - currentIntent  (BUILD / PRESSURE / FINISH / RESET)
 *   - getBallFamily  (tipo do golpe vindo, via ball.lastShotType)
 *   - surface        (via opts.surface ou gs.courtPhysics)
 *
 * Retorna um objeto com todos os campos que predictTrajectory e
 * resolveContactWindowStrategy consomem via optional chaining (??).
 */
function buildMovementInterceptProfile(player, gs, opts = {}) {
  const prefs         = player.prefs ?? {};
  const currentIntent = opts.currentIntent ?? player.ctx?.currentIntent ?? 'BUILD';
  const ball          = gs?.ball ?? null;
  const family        = getBallFamily(ball);
  const atNet         = player.atNet || player.ctx?.courtMode === 'NET';

  // -- Base contact Z por cadência ------------------------------------
  const baseZ = {
    EXPLOSIVE:    0.68,
    EARLY_ATTACK: 0.74,
    BALANCED:     0.82,
    MEASURED:     0.90,
    PATIENT:      0.98,
  }[prefs.rallyCadence] ?? 0.82;

  // -- Banda de contato por riskProfile e intenção --------------------
  const bandByRisk = {
    SAFETY_FIRST: 0.30,
    SAFE:         0.26,
    CALCULATED:   0.22,
    GAMBLER:      0.19,
    ALLOUT:       0.16,
  }[prefs.riskProfile] ?? 0.22;

  const intentBandAdj = currentIntent === 'RESET'  ?  0.08
                      : currentIntent === 'FINISH' ? -0.04
                      : 0;
  const contactBand = clamp(bandByRisk + intentBandAdj, 0.14, 0.34);

  // -- Ajustes por família de golpe -----------------------------------
  let familyContactZDelta    = 0;
  let predTimeDelta          = 0;
  let chaseForwardBias       = 0;
  let slowBallThresholdDelta = 0;
  let yTolerance             = 0.82;
  let delayBand              = 0.28;

  if (family === 'DROP_SHOT') {
    familyContactZDelta    = -0.24;
    predTimeDelta          = -0.28;
    chaseForwardBias       =  0.68;
    slowBallThresholdDelta =  2.20;
    yTolerance             =  1.05;
    delayBand              =  0.42;
  } else if (family === 'SLICE') {
    familyContactZDelta    = -0.10;
    predTimeDelta          = -0.06;
    chaseForwardBias       =  0.18;
    slowBallThresholdDelta =  0.70;
    yTolerance             =  0.88;
    delayBand              =  0.30;
  } else if (family === 'TOPSPIN_DRIVE') {
    familyContactZDelta    =  0.15;
    predTimeDelta          =  0.20;
    chaseForwardBias       = -0.02;
    slowBallThresholdDelta = -0.60;
    yTolerance             =  0.78;
    delayBand              =  0.25;
  } else if (family === 'LOB') {
    familyContactZDelta    =  0.14;
    predTimeDelta          =  0.22;
    chaseForwardBias       = -0.12;
    slowBallThresholdDelta = -0.30;
    yTolerance             =  0.90;
    delayBand              =  0.32;
  }

  // -- Ajuste de intent sobre predTimeDelta ---------------------------
  if (currentIntent === 'PRESSURE') predTimeDelta -= 0.06;
  else if (currentIntent === 'FINISH') predTimeDelta -= 0.12;

  const oppJustHit = gs?.ball?.lastHitBy != null && gs.ball.lastHitBy !== player.id;
  const readAheadWindow = clamp(
    0.12
    + (oppJustHit ? 0.04 : 0)
    + (Math.abs(gs?.ball?.vel?.y ?? 0) > 8.0 ? 0.03 : 0)
    + (family === 'DROP_SHOT' ? 0.04 : 0)
    - (family === 'LOB' ? 0.02 : 0),
    0.08,
    0.22,
  );
  const anticipationBias = family === 'DROP_SHOT'
    ? 0.20
    : family === 'SLICE'
      ? 0.12
      : family === 'TOPSPIN_DRIVE'
        ? 0.06
        : 0.04;
  const readCommitStrength = currentIntent === 'FINISH'
    ? 0.68
    : currentIntent === 'PRESSURE'
      ? 0.60
      : currentIntent === 'RESET'
        ? 0.42
        : 0.50;

  // -- preferredContactZ final ----------------------------------------
  let preferredContactZ = clamp(baseZ + familyContactZDelta, 0.32, 1.30);
  if (currentIntent === 'FINISH')   preferredContactZ = clamp(preferredContactZ - 0.06, 0.32, 1.30);
  if (currentIntent === 'PRESSURE') preferredContactZ = clamp(preferredContactZ - 0.03, 0.32, 1.30);


  // -- Rede: ajustes específicos --------------------------------------
  const preferredNetZ = atNet
    ? (family === 'LOB' ? 2.05 : 1.32)
    : 1.00;
  if (atNet) {
    yTolerance = Math.min(yTolerance, 0.55);
    delayBand  = Math.min(delayBand,  0.18);
    preferredContactZ = family === 'LOB'
      ? clamp(Math.max(preferredContactZ, 1.95), 0.32, 2.35)
      : clamp(Math.max(preferredContactZ, 1.10), 0.32, 1.75);
  }
  const minContactZ = clamp(preferredContactZ - contactBand, 0.46, atNet ? 1.00 : 0.80); // era 0.28 — permitia busca no nível do chão
  const maxContactZ = clamp(preferredContactZ + contactBand, 0.60, atNet ? (family === 'LOB' ? 2.75 : 1.95) : 1.40);
  return {
    preferredContactZ,
    minContactZ,
    maxContactZ,
    contactBand,
    yTolerance,
    delayBand,
    preferredNetZ,
    predTimeDelta,
    chaseForwardBias,
    slowBallThresholdDelta,
    readAheadWindow,
    anticipationBias,
    readCommitStrength,
  };
}

// ------------------------------------------------------------------
// HELPERS DE ESTILO
// ------------------------------------------------------------------

/**
 * Posição Y de home base para um jogador.
 * GARANTIA: sempre retorna |Y| >= COURT.halfL (nunca dentro da quadra).
 *
 * [FASE 1 — de v3] Baseado em prefs.rallyCadence + prefs.netGame.
 * Mais granular que v1 (que usava styleId direto):
 *   EXPLOSIVE/EARLY_ATTACK ? mais perto da baseline (quer bater cedo)
 *   PATIENT/MEASURED       ? mais atrás (quer tempo extra)
 *   netGame HUNTER         ? pequeno offset para frente
 *
 * Bug histórico (v1): AGG_BASELINER com momentum alto calculava
 * baselineY < halfL ? jogador esperava DENTRO da quadra.
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

  const riskOffset = prefs ? ({
    SAFETY_FIRST: -0.10,
    SAFE:         -0.05,
    CALCULATED:    0.00,
    GAMBLER:      +0.05,
    ALLOUT:       +0.10,
  }[prefs.riskProfile] ?? 0) : 0;

  const buildOffset = prefs ? ({
    CENTRE_CONTROL: -0.08,
    VARIED:          0.00,
    CROSS_BUILDER:  +0.03,
    CROSS_DOMINANT: +0.06,
    DTL_HUNTER:     +0.08,
  }[prefs.buildStyle] ?? 0) : 0;

  const offset = Math.min(0.78, cadenceOffset + netOffset + riskOffset + buildOffset);

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

function classifyHitOpportunity(player, gs, ball, hitTgt, margin) {
  const reach = player.reach ?? 0.85;
  const bounced = (ball.bounceCount ?? 0) >= 1;
  const distToBall = Math.sqrt(
    (ball.pos.x - player.pos.x) ** 2 + (ball.pos.y - player.pos.y) ** 2
  );
  const lateralGap = Math.abs(ball.pos.x - player.pos.x);
  const depthGap = Math.abs(ball.pos.y - player.pos.y);
  const d = dist2(player.pos, hitTgt);
  const stalePredCross = Number.isFinite(player._predCrossX)
    ? Math.abs(player._predCrossX - ball.pos.x) > reach * 0.95
    : false;
  const overshootLaterally = Math.abs(player.vel?.x ?? 0) > 0.45
    && (ball.pos.x - player.pos.x) * (player.vel?.x ?? 0) < -0.04;
  const overshootInDepth = Math.abs(player.vel?.y ?? 0) > 0.45
    && (ball.pos.y - player.pos.y) * (player.vel?.y ?? 0) < -0.04;
  const timeSinceBounce = ball._timeSinceBounce ?? 999;
  const ballClosingToPlayer = bounced
    && ((player.side > 0 && ball.vel.y > 0) || (player.side < 0 && ball.vel.y < 0));
  const secondBounceThreat = bounced
    && ballClosingToPlayer
    && ball.pos.z <= 0.32          // era 0.98 — muito permissivo, desativava freshBounceBlock prematuramente
    && Math.abs(ball.vel.y) < 6.9
    && Math.abs(ball.pos.y) + 0.55 < Math.abs(player.pos.y); // era 0.85
  const holdForRiseActive = bounced
    && !!player._holdForRiseActive
    && ball.pos.z < (player._holdForRiseMinZ ?? 0.64)
    && ball.pos.z > 0.05   // reduzido de 0.18 ? protege mesmo logo após o quique
    && (ball.vel?.z ?? 0) > -0.35
    && margin > -0.05;
  const ballReachConsistent = distToBall <= d * 4.0 + reach;
  const liveVolleyContact = !bounced
    && (player.atNet || Math.abs(player.pos.y) < COURT.serviceLineY + 0.70)
    && ball.pos.z >= 0.34
    && ball.pos.z <= 1.58
    && lateralGap < reach * 1.10
    && depthGap < reach * 1.85
    && distToBall < reach * 1.55;
  // POST-BOUNCE RUSH BLOCK — universal para todas as famílias.
  // No tênis real o jogador NUNCA bate no ponto do quique: ele lê o quique,
  // se posiciona ENTRE o 1º e o 2º quique, e espera a bola subir à altura de contato.
  // Limiar por família (subida):
  //   TOPSPIN_DRIVE : 0.65m — quica alto, precisa de mais tempo para subir
  //   TOPSPIN_DRIVE : 0.65m — quica alto, sobe rápido
  //   SLICE         : 0.42m — quica baixo, sobe devagar ? vel.z mínimo reduzido
  //   outros (null) : 0.50m — flat/normal, altura intermediária
  const _ballFamilyHere = getBallFamily(ball);
  const _minContactZ_byFamily = _ballFamilyHere === 'TOPSPIN_DRIVE' ? 0.65
    : _ballFamilyHere === 'SLICE' ? 0.42
    : 0.50;
  // vel.z mínimo reduzido de 0.04 ? 0.01: captura a subida lenta do SLICE
  // (após quique de slice a bola sobe com vel.z ~0.02–0.05, abaixo do limiar antigo)
  const topspinRisingBlock = bounced
    && (ball.vel?.z ?? 0) > 0.01   // bola ainda subindo após o quique (inclui slice lento)
    && ball.pos.z < _minContactZ_byFamily;

  // FRESH BOUNCE BLOCK — previne rush ao ponto de quique.
  // Janela estendida de 0.18s ? 0.38s: cobre o tempo real até a bola
  // atingir altura aceitável (~0.40m+) após o quique.
  // Com 0.18s o jogador chegava ao ponto de quique dentro da janela e
  // batia no emergency assim que o bloco expirava.
  // Exceção: secondBounceThreat real (bola prestes a morrer sem opção).
  const freshBounceBlock = bounced
    && !secondBounceThreat
    && (ball._timeSinceBounce ?? 999) < 0.38   // era 0.18 — insuficiente
    && (ball.vel?.z ?? 0) > 0.01               // era 0.02 — não capturava slice
    && ball.pos.z < (_minContactZ_byFamily - 0.04); // libera quando quase na zona alvo

  const normalGroundContact = bounced
    && !topspinRisingBlock
    && !freshBounceBlock
    && ball.pos.z >= 0.16
    && ball.pos.z <= 1.45
    && lateralGap < reach * 1.04
    && depthGap < reach * 1.92
    && distToBall < reach * 1.52;
  const lowBallPickupContact = bounced
    && !topspinRisingBlock          // ? bloqueado para bola subindo
    && !freshBounceBlock            // ? bloqueado para bola recém-quicada
    && ball.pos.z >= 0.10
    && ball.pos.z <= 0.98
    && lateralGap < reach * 1.12
    && depthGap < reach * 1.78
    && distToBall < reach * 1.46;
  const emergencyReachContact = bounced
    && !freshBounceBlock            // ? freshBounce bloqueia até o emergency
    && ball.pos.z >= 0.10
    && ball.pos.z <= 1.28
    && lateralGap < reach * 1.36
    && depthGap < reach * 2.72
    && distToBall < reach * 2.15
    && (
      secondBounceThreat
      || ballClosingToPlayer
      || stalePredCross
      || overshootLaterally
      || overshootInDepth
      || margin > -0.42
      || player._forceHitTransition
      // timeSinceBounce < 0.30 REMOVIDO: causava rush ao ponto de quique.
      // secondBounceThreat já cobre o caso legítimo de bola prestes a morrer.
    );
  const canContactBall = liveVolleyContact || normalGroundContact || lowBallPickupContact || emergencyReachContact;
  const canExecutePlannedShot = (
    liveVolleyContact
    && margin > -0.08
    && !stalePredCross
    && !overshootLaterally
    && !overshootInDepth
  ) || (
    normalGroundContact
    && margin > -0.06
    && ballReachConsistent
    && !stalePredCross
    && !overshootLaterally
    && !overshootInDepth
  );

  let contactClass = null;
  if (canContactBall) {
    contactClass = canExecutePlannedShot
      ? 'NORMAL_HIT'
      : lowBallPickupContact
        ? 'LOW_BALL_PICKUP'
        : 'EMERGENCY_REACH';
  }

  return {
    canContactBall,
    canExecutePlannedShot,
    contactClass,
    holdForRiseActive,
    lowBallPickupContact,
    secondBounceThreat,
  };
}

// ------------------------------------------------------------------
// FSM — MÁQUINA DE ESTADOS
// ------------------------------------------------------------------

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
  if (justHit) {
    clearTransientMovementFlags(player);
    return 'RECOVER';
  }

  // [FASE 4] SPLITSTEP: timer ativo ? manter estado
  if ((player.ctx._splitStepTimer ?? 0) > 0) return 'SPLITSTEP';

  const ball = gs.ball;
  clearTransientMovementFlags(player);

  const ballComing =
    (ball.inFlight || (ball.bounceCount > 0 && Math.abs(ball.vel.y) > 0.3)) &&
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
    const hitOpportunity = classifyHitOpportunity(player, gs, ball, hitTgt, margin);
    player._movementCanContactBall = hitOpportunity.canContactBall;
    player._movementCanExecutePlannedShot = hitOpportunity.canExecutePlannedShot;
    player._movementContactClass = hitOpportunity.contactClass;
    player._urgentDeadBallPickup =
      hitOpportunity.contactClass === 'LOW_BALL_PICKUP'
      || (hitOpportunity.secondBounceThreat && hitOpportunity.canContactBall);
    player._pickupReadyNow = hitOpportunity.contactClass === 'LOW_BALL_PICKUP';

    if (hitOpportunity.canContactBall && !hitOpportunity.canExecutePlannedShot && !hitOpportunity.holdForRiseActive) {
      player._forceHitTransition = true;
    } else if (!hitOpportunity.canContactBall) {
      player._forceHitTransition = false;
    }

    if (hitOpportunity.holdForRiseActive && hitOpportunity.canExecutePlannedShot) {
      debugMovementHit(player, gs, 'stateDecision', { state: 'MOVE', reason: 'holdForRise', ...hitOpportunity });
      return 'MOVE';
    }
    if (hitOpportunity.canContactBall && !hitOpportunity.holdForRiseActive) {
      debugMovementHit(player, gs, 'stateDecision', { state: 'HIT', reason: 'canContactBall', ...hitOpportunity });
      return 'HIT';
    }
    // Fix: segundo quique iminente + jogador pode tocar a bola ? forçar HIT imediato.
    // Sem isso, o jogador fica em MOVE por 1-2 frames e perde a janela de contato,
    // deixando a bola quicar duas vezes sem batida mesmo estando no alcance.
    if (hitOpportunity.secondBounceThreat && hitOpportunity.canContactBall) {
      debugMovementHit(player, gs, 'stateDecision', { state: 'HIT', reason: 'secondBounceThreat', ...hitOpportunity });
      return 'HIT';
    }
    if (hitOpportunity.secondBounceThreat || hitOpportunity.canContactBall) {
      debugMovementHit(player, gs, 'stateDecision', { state: 'MOVE', reason: 'missedHitWindow', ...hitOpportunity });
    }
    return 'MOVE';
  }

  return 'WAIT';
}

// ------------------------------------------------------------------
// CÁLCULO DE TARGETS
// ------------------------------------------------------------------

/**
 * WAIT target: bisector + baselineY. Nunca avança.
 * [FASE 1 — de v3]
 */
function computeWaitTarget(player, gs) {
  const opp        = gs.players?.find(p => p.id !== player.id);
  const lastShotX  = player.ctx?._lastShotX ?? 0;
  const courtMode  = player.ctx?.courtMode ?? 'BASE';
  const isNetApproach = courtMode === 'TRANSITION' || courtMode === 'NET';
  const prefs = player.prefs ?? {};
  const adaptability = prefs.adaptability ?? 60;

  const bisectorX = clamp(
    lastShotX * 0.45 + (opp?.pos.x ?? 0) * 0.10,
    -1.8, 1.8
  );

  // Antecipação por padrão de rally (pacientes leem com menos histórico)
  let finalX = bisectorX;
  if (!isNetApproach && player.prefs?.rallyCadence !== 'EXPLOSIVE' && opp) {
    const hist      = opp.ctx?.patternHistory ?? [];
    const isPatient = player.prefs?.rallyCadence === 'PATIENT' || player.prefs?.rallyCadence === 'MEASURED';
    const minHist   = Math.max(2, (isPatient ? 3 : 4) - Math.round(adaptability / 45));
    if (hist.length >= minHist) {
      const last = hist.slice(-minHist);
      if (last.every(h => h.dir === last[0].dir) && last[0].dir !== 0) {
        const antMultBase = isPatient ? 1.5 : player.prefs?.rallyCadence === 'EXPLOSIVE' ? 0.5 : 1.0;
        const antMult = antMultBase * (0.85 + adaptability / 200);
        finalX = clamp(finalX + last[0].dir * 0.25 * antMult, -2.5, 2.5);
      }
    }
  }

  if (!isNetApproach) {
    if (prefs.buildStyle === 'CENTRE_CONTROL') {
      finalX = clamp(finalX * 0.55, -1.4, 1.4);
    } else if (prefs.buildStyle === 'CROSS_DOMINANT') {
      const anchorSign = Math.sign(lastShotX || finalX || 1);
      finalX = clamp(finalX + anchorSign * 0.18, -2.4, 2.4);
    } else if (prefs.buildStyle === 'DTL_HUNTER') {
      const lineSign = Math.sign(opp?.pos?.x ?? lastShotX ?? finalX ?? 0);
      finalX = clamp(finalX - lineSign * 0.22, -2.5, 2.5);
    } else if (prefs.buildStyle === 'VARIED') {
      finalX = clamp(finalX + (player._variedWaitXOffset ?? 0), -2.5, 2.5);
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
    safeY = baselineY;
  }

  return { x: finalX, y: safeY };
}

function isRecoverTargetStale(player, gs) {
  const lastShotX = player.ctx?._lastShotX ?? 0;
  return !player._recoverTarget
    || player._recoverTargetRally !== gs.rally
    || Math.abs((player._recoverTargetLastShotX ?? 0) - lastShotX) > 1.0;
}

function snapshotRecoverTarget(player, gs) {
  player._recoverTarget = computeRecoverTarget(player, gs);
  player._recoverTargetRally = gs.rally;
  player._recoverTargetLastShotX = player.ctx?._lastShotX ?? 0;
}

function getMovementSurfaceProfile(gs) {
  const surface = (gs?.courtMeta?.surface ?? gs?.courtPhysics?.surface ?? 'HARD').toUpperCase();
  if (surface === 'CLAY') {
    return { recoverDepth: 0.22, lateralRecover: 1.08, netCover: 0.92, transitionDepth: 0.10, lungeCarry: 0.90 };
  }
  if (surface === 'GRASS') {
    return { recoverDepth: -0.12, lateralRecover: 0.94, netCover: 1.06, transitionDepth: -0.08, lungeCarry: 1.04 };
  }
  if (surface === 'INDOOR') {
    return { recoverDepth: -0.06, lateralRecover: 0.98, netCover: 1.03, transitionDepth: -0.04, lungeCarry: 1.02 };
  }
  return { recoverDepth: 0.00, lateralRecover: 1.00, netCover: 1.00, transitionDepth: 0.00, lungeCarry: 1.00 };
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
// Mesmo perfis agressivos nao devem viver em contatos "ankle-high" por padrao.
const CONTACT_Z_BY_CADENCE = {
  EXPLOSIVE:    0.68,
  EARLY_ATTACK: 0.74,
  BALANCED:     0.82,
  MEASURED:     0.90,
  PATIENT:      0.98,
};

const SURFACE_READ_TUNING = {
  GRASS:  Object.freeze({ contactZDelta: -0.16, predTimeDelta: -0.34, slowBallThreshold: 9.4, serveContactZ: 0.50, holdRiseBias: -0.08, readDepthBias: -0.22, chaseBias: 0.08 }),
  INDOOR: Object.freeze({ contactZDelta: -0.08, predTimeDelta: -0.22, slowBallThreshold: 8.8, serveContactZ: 0.56, holdRiseBias: -0.03, readDepthBias: -0.08, chaseBias: 0.04 }),
  HARD:   Object.freeze({ contactZDelta:  0.00, predTimeDelta:  0.00, slowBallThreshold: 8.3, serveContactZ: 0.60, holdRiseBias: 0.00, readDepthBias: 0.00, chaseBias: 0.00 }),
  CLAY:   Object.freeze({ contactZDelta:  0.20, predTimeDelta:  0.48, slowBallThreshold: 7.3, serveContactZ: 0.82, holdRiseBias: 0.10, readDepthBias: 0.20, chaseBias: -0.06 }),
};

function getSurfaceReadTuning(courtPhysics) {
  const surface = (courtPhysics?.surface ?? 'HARD').toUpperCase();
  return SURFACE_READ_TUNING[surface] ?? SURFACE_READ_TUNING.HARD;
}

function getBallReadTuning(ball) {
  const family = getBallFamily(ball);
  if (family === 'DROP_SHOT') {
    return { contactZDelta: -0.24, predTimeDelta: -0.28, slowBallThresholdDelta: 2.2, chaseForwardBias: 0.68 };
  }
  if (family === 'SLICE') {
    // Slice/halfvolley alto: bola quicou lenta mas está SUBINDO (vel.z > 0.5).
    // Não aplicar contactZDelta negativo nem chaseForwardBias — jogador deve
    // esperar a bola subir ao SWEET/SHOULDER em vez de ir buscar em ANKLE/DIRT.
    const bounced = (ball?.bounceCount ?? 0) >= 1;
    const isHighBounceSlice = bounced && (ball?.vel?.z ?? 0) > 0.50;
    if (isHighBounceSlice) {
      return { contactZDelta: 0.08, predTimeDelta: 0.12, slowBallThresholdDelta: -0.5, chaseForwardBias: -0.10 };
    }
    return { contactZDelta: -0.10, predTimeDelta: -0.06, slowBallThresholdDelta: 0.7, chaseForwardBias: 0.18 };
  }
  if (family === 'TOPSPIN_DRIVE') {
    return { contactZDelta: 0.15, predTimeDelta: 0.20, slowBallThresholdDelta: -0.6, chaseForwardBias: -0.02 };
  }
  if (family === 'LOB') {
    return { contactZDelta: 0.14, predTimeDelta: 0.22, slowBallThresholdDelta: -0.3, chaseForwardBias: -0.12 };
  }
  return { contactZDelta: 0, predTimeDelta: 0, slowBallThresholdDelta: 0, chaseForwardBias: 0 };
}

function resolveContactWindowStrategy(ball, player, currentIntent, preferredContactZ, interceptProfile, surfaceRead = null) {
  const family = getBallFamily(ball);
  const bounced = (ball?.bounceCount ?? 0) >= 1;
  const ballZ = ball?.pos?.z ?? 0.8;
  const ballVz = ball?.vel?.z ?? 0;
  const arrivalMargin = player?._arrivalMargin ?? 0.18;
  const selfAtNet = !!player?.atNet || player?._volleyType === 'position' || player?._volleyType === 'emergency';
  const pressureLike = currentIntent === 'PRESSURE' || currentIntent === 'FINISH';
  const holdRiseBias = surfaceRead?.holdRiseBias ?? 0;
  const desiredMinContactZ = clamp(
    pressureLike
      ? Math.max(0.72 + holdRiseBias * 0.25, preferredContactZ - 0.10 + holdRiseBias * 0.30)
      : Math.max(0.64 + holdRiseBias * 0.30, preferredContactZ - 0.12 + holdRiseBias * 0.34),
    interceptProfile?.minContactZ ?? 0.32,
    interceptProfile?.maxContactZ ?? 1.20,
  );
  const releaseContactZ = clamp(
    desiredMinContactZ - (pressureLike ? 0.02 : 0.04) + holdRiseBias * 0.12,
    interceptProfile?.minContactZ ?? 0.32,
    interceptProfile?.maxContactZ ?? 1.20,
  );
  // TOPSPIN_DRIVE quica alto: bola sobe por 0.5-0.8s antes de atingir altura ideal.
  // Limiar de Z reduzido para que holdForRise ative imediatamente após o quique.
  const lowBallMinZ = family === 'TOPSPIN_DRIVE' ? 0.05 : 0.22;
  const lowBallNow = bounced && ballZ >= lowBallMinZ && ballZ < releaseContactZ;
  const canWaitForRise = lowBallNow
    && !selfAtNet
    && family !== 'DROP_SHOT'
    // CORRIGIDO: só esperar subir quando bola ESTÁ subindo (vel.z > 0.02).
    // Antes aceitava ballVz > -0.25 (bola descendo!), criando holdForRise sem rise.
    && (family === 'TOPSPIN_DRIVE' ? ballVz > 0.10 : ballVz > 0.02)
    && arrivalMargin > (pressureLike ? 0.10 + holdRiseBias * 0.20 : 0.06 + holdRiseBias * 0.22);

  // Bola quicou alta demais (topspin pesado): já está em HIGH zone (>1.35m) ou subindo além do maxContactZ.
  // No tênis real, o jogador recua para deixar a bola descer ao SHOULDER/SWEET antes de bater.
  // Sem esse ajuste, o optimalHitPoint era encontrado em HIGH/OVERHEAD — zona desconfortável
  // onde o jogador bateria um half-volley alto ou um golpe sem autoridade.
  const ballTooHighNow = bounced && ballZ > (interceptProfile?.maxContactZ ?? 1.35) && ballVz > 0;
  const overheadBallAtNet = selfAtNet
    && !bounced
    && family === 'LOB'
    && ballZ >= Math.max(1.85, (interceptProfile?.preferredNetZ ?? 1.30) + 0.25)
    && arrivalMargin > -0.04;

  return {
    desiredMinContactZ,
    releaseContactZ,
    shouldHoldForRise: canWaitForRise,
    shouldWaitForDescent: ballTooHighNow || overheadBallAtNet,
  };
}

function setLocomotionMode(player, mode) {
  player._locomotionMode = mode;
  return mode;
}

function computePredInterceptY(player, gs, surfaceRead, interceptProfile = null) {
  if (player.atNet) return player.pos.y;

  const side = player.side > 0 ? 1 : -1;
  const ballY = gs.ball.pos.y;
  const ballVY = gs.ball.vel.y;
  const playerY = player.pos.y;
  const baselineY = getStyleBaselineY(player);
  const goingTowardPlayer = side > 0 ? ballVY > 0 : ballVY < 0;
  const predTimeBias = interceptProfile?.predTimeDelta ?? 0;
  const sameSideNow = Math.sign(ballY || side) === side;

  // -- PROJEÇÃO CINEMÁTICA DE SUBIDA (rise intercept projection) --------------
  // Problema original: projectedBallY usa apenas 0.18-0.38s ? aponta para perto
  // do quique, não para onde a bola estará na altura ideal de contato.
  // Resultado: predictTrajectory acha optimalHitPoint no minContactZ (~0.42m),
  // o jogador vai para essa zona ANTES do quique, e bate baixo.
  //
  // Solução: quando a bola já quicou e está subindo (vel.z > 0.15), usar
  // cinemática simples para calcular quando ela atinge preferredContactZ e
  // qual é o Y nesse momento. Isso fornece um predY muito mais preciso.
  const ballBounced = (gs.ball?.bounceCount ?? 0) >= 1;
  const ballVZ = gs.ball?.vel?.z ?? 0;
  const ballZ  = gs.ball?.pos?.z ?? 0;
  const preferredCZ = interceptProfile?.preferredContactZ ?? 0.75;

  if (ballBounced && ballVZ > 0.08 && ballZ < preferredCZ && sameSideNow) {
    // Resolver: z(t) = ballZ + vz*t - 0.5*g*t²  = preferredCZ
    // t = (vz - sqrt(vz² - 2*g*dz)) / g   ? menor raiz positiva (fase de subida)
    // goingTowardPlayer REMOVIDO: bolas diagonais chegam com ballVY pequeno ou
    // levemente negativo no eixo Y mas ainda vêm ao jogador — condição excluía
    // essas bolas e mandava o jogador para o ponto de quique.
    const g  = 9.81;
    const dz = preferredCZ - ballZ; // > 0 pois ballZ < preferredCZ
    const disc = ballVZ * ballVZ - 2 * g * dz;
    if (disc >= 0) {
      const tRise = (ballVZ - Math.sqrt(disc)) / g;
      if (tRise > 0.02 && tRise < 1.6) {
        // Y onde a bola estará quando chegar na altura ideal
        const riseY = ballY + ballVY * tRise;
        // Clamp ao lado do jogador com guard de baseline
        const clampedRise = clamp(riseY, -COURT.halfL, COURT.halfL);
        // O jogador não precisa ir além da baseline para receber
        const guardedRise = side > 0
          ? Math.max(clampedRise, baselineY - 0.30)
          : Math.min(clampedRise, baselineY + 0.30);
        // Só usar se a projeção faz sentido (está do lado certo)
        const riseOnMySide = side > 0 ? guardedRise > 0 : guardedRise < 0;
        if (riseOnMySide) return guardedRise;
      }
    }
  }

  const projectedBallY = ballY + ballVY * clamp(0.18 + predTimeBias + (surfaceRead?.predTimeDelta ?? 0) * 0.18, 0.08, 0.38);
  const mySideBallY = clamp(projectedBallY, -COURT.halfL, COURT.halfL);
  const ballFamily = getBallFamily(gs?.ball);
  const dropShotRead = ballFamily === 'DROP_SHOT';
  const readDepthBias = surfaceRead?.readDepthBias ?? 0;
  const chaseSurfaceBias = surfaceRead?.chaseBias ?? 0;
  const shortAttackLine = side * (COURT.halfL * clamp(0.52 + readDepthBias * 0.12, 0.46, 0.60));
  const midCourtLine = side * (COURT.halfL * clamp(0.72 + readDepthBias * 0.10, 0.64, 0.82));
  const deepReadLine = side * (COURT.halfL * clamp(0.88 + readDepthBias * 0.06, 0.82, 0.94));
  const attackBias = side * clamp(
    ((interceptProfile?.chaseForwardBias ?? 0) + chaseSurfaceBias) * (dropShotRead ? -0.88 : -0.55),
    dropShotRead ? -0.46 : -0.24,
    dropShotRead ? 0.18 : 0.24,
  );

  if (!goingTowardPlayer && !sameSideNow) {
    return baselineY;
  }

  const anchoredBallY = side > 0
    ? clamp(Math.max(mySideBallY, shortAttackLine) + attackBias, -COURT.halfL, COURT.halfL)
    : clamp(Math.min(mySideBallY, shortAttackLine) + attackBias, -COURT.halfL, COURT.halfL);

  if (!sameSideNow) {
    // Bola ainda no lado adversário mas vindo em nossa direção.
    // shortAttackLine (~6m) é muito avançado — faz o predictTrajectory buscar
    // optimalHitPoint na zona do quique, jogador rush para lá antes do bounce.
    // Fix: projetar com horizonte mais longo para estimar onde a bola estará
    // ao chegar no nosso lado + tempo de subida, mantendo jogador mais recuado.
    const longProj = ballY + ballVY * clamp(0.55 + predTimeBias + (surfaceRead?.predTimeDelta ?? 0) * 0.25, 0.35, 0.85);
    const longProjMySide = clamp(longProj, -COURT.halfL, COURT.halfL);
    const anchoredLong = side > 0
      ? clamp(Math.max(longProjMySide, shortAttackLine) + attackBias, -COURT.halfL, COURT.halfL)
      : clamp(Math.min(longProjMySide, shortAttackLine) + attackBias, -COURT.halfL, COURT.halfL);
    // Usar o mais profundo dos dois (mais longe do quique, mais próximo da baseline)
    return side > 0
      ? Math.max(anchoredLong, anchoredBallY)
      : Math.min(anchoredLong, anchoredBallY);
  }

  if (dropShotRead) {
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

  // depthBias alto quando bola vai wide: X e Y devem convergir juntos em linha reta.
  // Sem isso, o jogador chega ao X antes do Y e faz rota em L em vez de diagonal direta.
  const isWideBall = Math.abs(gs.ball.vel.x) >= 2.0 || Math.abs(gs.ball.pos.x - player.pos.x) > 1.5;
  const depthBias = isWideBall
    ? 0.88
    : (surfaceRead.predTimeDelta < 0 ? 0.58 : surfaceRead.predTimeDelta > 0 ? 0.78 : 0.68);
  const blendedY = playerY + (anchoredBallY - playerY) * depthBias;
  const guardedY = side > 0
    ? clamp(blendedY, deepReadLine, COURT.halfL)
    : clamp(blendedY, -COURT.halfL, deepReadLine);

  return side > 0
    ? Math.max(guardedY, baselineY - 0.25)
    : Math.min(guardedY, baselineY + 0.25);
}

function computeContactPocketBehind(player, gs, point, currentIntent, depthOffset, ballRead, interceptProfile, contactWindow, sourceType = 'optimal') {
  const ballSpd = Math.sqrt(gs.ball.vel.x**2 + gs.ball.vel.y**2 + gs.ball.vel.z**2);
  const dyingShortBall = (gs.ball?.bounceCount ?? 0) >= 1
    && sourceType !== 'optimal'
    && ballSpd < 5.0
    && (point?.z ?? 0.58) < 0.64
    && Math.abs(gs.ball?.pos?.y ?? 0) + 0.45 < Math.abs(player?.pos?.y ?? 0);
  let behind = depthOffset * (sourceType === 'optimal' ? 0.20 : 0.32);

  if (sourceType !== 'optimal') behind += 0.18;
  if ((point?.z ?? 0.58) < 0.62) behind += 0.20;
  if (contactWindow?.shouldHoldForRise) behind += 0.16;
  if (ballSpd < 8.0) behind += 0.10;
  if (dyingShortBall) behind = Math.min(behind, 0.18 + depthOffset * 0.07);

  if (currentIntent === 'FINISH') behind -= 0.08;
  else if (currentIntent === 'BUILD') behind += 0.06;

  behind -= clamp(ballRead?.chaseForwardBias ?? 0, -0.22, 0.22) * 0.35;
  behind -= clamp(interceptProfile?.chaseForwardBias ?? 0, -0.30, 0.30) * 0.28;

  if (player.atNet) return clamp(behind, 0.14, 0.56);
  return clamp(behind, 0.34, 1.65);
}

function buildLandPointContactPocket(player, gs, landPoint, preferredContactZ, currentIntent, depthOffset, ballRead, interceptProfile, contactWindow, outerX, outerY, isDesperate = false) {
  const side = player.side > 0 ? 1 : -1;
  const baseLag = player.atNet ? 0.08 : 0.12;
  const zLag = clamp((preferredContactZ - 0.44) * 0.22, 0, 0.10);
  const riseLag = contactWindow?.shouldHoldForRise ? 0.07 : 0;
  const desperationLag = isDesperate ? -0.04 : 0;
  const lag = clamp(baseLag + zLag + riseLag + desperationLag, 0.08, player.atNet ? 0.18 : 0.28);

  const contactPoint = {
    x: landPoint.x + gs.ball.vel.x * lag * 0.46,
    y: landPoint.y + gs.ball.vel.y * lag * 0.52,
    z: preferredContactZ,
    t: landPoint.t + lag,
  };
  const behind = computeContactPocketBehind(
    player,
    gs,
    contactPoint,
    currentIntent,
    depthOffset,
    ballRead,
    interceptProfile,
    contactWindow,
    'land',
  );

  return {
    x: clamp(contactPoint.x, -outerX + 0.2, outerX - 0.2),
    y: clamp(contactPoint.y + side * behind, -outerY, outerY),
    t: contactPoint.t,
    contactPoint,
    behind,
    source: 'land-pocket',
  };
}

function buildLiveBallPocket(player, gs, preferredContactZ, currentIntent, depthOffset, ballRead, interceptProfile, contactWindow, outerX, outerY) {
  const side = player.side > 0 ? 1 : -1;
  const contactPoint = {
    x: gs.ball.pos.x,
    y: gs.ball.pos.y,
    z: gs.ball.pos.z,
    t: null,
  };
  const behind = computeContactPocketBehind(
    player,
    gs,
    { ...contactPoint, z: Math.max(contactPoint.z, preferredContactZ) },
    currentIntent,
    depthOffset,
    ballRead,
    interceptProfile,
    contactWindow,
    'live',
  );

  return {
    x: clamp(contactPoint.x, -outerX + 0.2, outerX - 0.2),
    y: clamp(contactPoint.y + side * behind, -outerY, outerY),
    t: null,
    contactPoint,
    behind,
    source: 'live-pocket',
  };
}

function buildShortDyingBallPocket(player, gs, preferredContactZ, currentIntent, depthOffset, ballRead, interceptProfile, outerX, outerY) {
  const side = player.side > 0 ? 1 : -1;
  const contactPoint = {
    x: gs.ball.pos.x + gs.ball.vel.x * 0.04,
    y: gs.ball.pos.y + gs.ball.vel.y * 0.05,
    z: Math.max(gs.ball.pos.z, preferredContactZ - 0.18),
    t: null,
  };
  let behind = 0.10 + Math.max(0, depthOffset - 0.6) * 0.04;
  behind -= clamp(ballRead?.chaseForwardBias ?? 0, -0.22, 0.22) * 0.12;
  behind -= clamp(interceptProfile?.chaseForwardBias ?? 0, -0.30, 0.30) * 0.10;
  if (Math.abs(gs.ball.vel.y) < 6.2) behind -= 0.04;
  if (currentIntent === 'FINISH') behind -= 0.04;
  const outsideDefensiveLane =
    Math.abs(gs.ball.pos.x) > COURT.singlesW / 2 - 0.25
    || Math.abs(player.pos.x) > COURT.singlesW * 0.34;
  const defensiveOpenStance =
    currentIntent === 'RESET'
    || Math.abs(player.pos.y) > COURT.halfL - 0.20;
  const lowDefensivePickup =
    preferredContactZ < 0.72
    || (gs.ball.pos.z ?? preferredContactZ) < 0.58;
  if (outsideDefensiveLane && defensiveOpenStance && lowDefensivePickup) {
    behind += 0.16;
  }
  behind = player.atNet ? clamp(behind, 0.02, 0.16) : clamp(behind, 0.03, 0.22);

  return {
    x: clamp(contactPoint.x, -outerX + 0.2, outerX - 0.2),
    y: clamp(contactPoint.y + side * behind, -outerY, outerY),
    t: null,
    contactPoint,
    behind,
    source: 'short-dying-pocket',
  };
}

function resolveContactPocketTarget(player, gs, {
  outerX,
  outerY,
  depthOffset,
  ballRead,
  currentIntent,
  preferredContactZ,
  contactWindow,
  interceptProfile,
  alreadyBounced,
  isSlowBounced,
  landPoint,
  optimalHitPoint,
  crossPoint,
  isDesperate,
}) {
  const side = player.side > 0 ? 1 : -1;
  const nextBounceDiesShort = alreadyBounced
    && !!landPoint
    && Math.abs(landPoint.y) + 0.80 < Math.abs(player.pos.y);
  // Bola subindo após quique: slice/halfvolley fraco que vai subir alto.
  // vel.z > 0.55 e ainda abaixo da preferredContactZ ? esperar subir, não atacar direto.
  // Sem esse guard, isSlowBounced ativava attackShortDyingBall para bolas que ainda
  // estão subindo ao SWEET/SHOULDER — levando o jogador a bater em ANKLE/DIRT.
  const ballRisingToContactZ = alreadyBounced
    && (gs.ball.vel.z ?? 0) > 0.55
    && gs.ball.pos.z < preferredContactZ - 0.06;
  const attackShortDyingBall = alreadyBounced
    && (isSlowBounced || nextBounceDiesShort)
    && gs.ball.pos.z < 1.02
    && !ballRisingToContactZ   // não atacar bola que ainda vai subir à altura ideal
    && (
      Math.abs(gs.ball.vel.y) < 6.8
      || gs.ball.pos.z < preferredContactZ + 0.04
      || Math.abs(gs.ball.pos.y) + 0.70 < Math.abs(player.pos.y)
    );
  const optHitThresh = alreadyBounced ? outerY : COURT.halfL + 0.5;
  const optBeyond = optimalHitPoint && (side > 0
    ? optimalHitPoint.y > optHitThresh
    : optimalHitPoint.y < -optHitThresh);

  if (attackShortDyingBall && (!optimalHitPoint || nextBounceDiesShort)) {
    return buildShortDyingBallPocket(
      player,
      gs,
      preferredContactZ,
      currentIntent,
      depthOffset,
      ballRead,
      interceptProfile,
      outerX,
      outerY,
    );
  }

  if (optimalHitPoint && !optBeyond) {
    // TOPSPIN: janela estendida para 0.65s — bola pesada pode levar até ~0.8s para subir ao sweet spot
    const holdMaxT = (getBallFamily(gs.ball) === 'TOPSPIN_DRIVE') ? 0.65 : 0.34;
    if (
      contactWindow.shouldHoldForRise
      && optimalHitPoint.t > 0.08
      && optimalHitPoint.t < holdMaxT
    ) {
      player._holdForRiseActive = true;
      player._holdForRiseMinZ = contactWindow.releaseContactZ;
      player._holdForRiseTargetT = optimalHitPoint.t;
    }

    const behind = computeContactPocketBehind(
      player,
      gs,
      optimalHitPoint,
      currentIntent,
      depthOffset,
      ballRead,
      interceptProfile,
      contactWindow,
      'optimal',
    );
    return {
      x: clamp(optimalHitPoint.x, -outerX + 0.2, outerX - 0.2),
      y: clamp(optimalHitPoint.y + side * behind, -outerY, outerY),
      t: optimalHitPoint.t,
      contactPoint: optimalHitPoint,
      behind,
      source: 'optimal-pocket',
    };
  }

  if (landPoint) {
    return buildLandPointContactPocket(
      player,
      gs,
      landPoint,
      preferredContactZ,
      currentIntent,
      depthOffset,
      ballRead,
      interceptProfile,
      contactWindow,
      outerX,
      outerY,
      isDesperate,
    );
  }

  if (isSlowBounced) {
    return buildLiveBallPocket(
      player,
      gs,
      preferredContactZ,
      currentIntent,
      depthOffset,
      ballRead,
      interceptProfile,
      contactWindow,
      outerX,
      outerY,
    );
  }

  if (crossPoint && crossPoint.z < 2.8) {
    const behind = player.atNet ? 0.14 : 0.38;
    return {
      x: clamp(crossPoint.x, -outerX + 0.2, outerX - 0.2),
      y: clamp(crossPoint.y + side * behind, -outerY, outerY),
      t: crossPoint.t,
      contactPoint: crossPoint,
      behind,
      source: 'cross-pocket',
    };
  }

  return buildLiveBallPocket(
    player,
    gs,
    preferredContactZ,
    currentIntent,
    depthOffset,
    ballRead,
    interceptProfile,
    contactWindow,
    outerX,
    outerY,
  );
}

// -------------------------------------------------------------------
// BOUNCE-RISE MASTER — lógica única de posicionamento pós-quique
// -------------------------------------------------------------------
//
// PRINCÍPIO: no tênis real o jogador NUNCA vai ao ponto de quique.
// Ele lê a trajetória, calcula onde a bola estará na altura ideal
// de contato (pós-quique, subindo), vai para lá, e espera.
//
// Esta função substitui a cadeia de heurísticas fragmentadas
// (freshBounceBlock / topspinRisingBlock / holdForRise / etc.)
// com uma única decisão cinemática limpa.
//
// Retorna null se não se aplica (bola no ar sem quique, volley, etc.)
// Retorna { x, y, blockHit, tRise } se aplica:
//   x, y   ? onde o jogador deve se posicionar
//   blockHit ? true enquanto deve bloquear o hit (bola ainda subindo)
//   tRise  ? tempo estimado até a bola chegar na altura ideal
//
// ATRIBUTO leitura (0-99):
//   - Define a precisão do cálculo cinemático
//   - Alta leitura (80+): calcula quase perfeitamente, ajusta fino
//   - Baixa leitura (30-): adiciona erro no cálculo do ponto de rise,
//     especialmente para topspin (bola de leitura mais difícil)
//   - A imprecisão é calculada UMA VEZ no momento do quique (snapshot)
//     e mantida — o jogador comete o erro e o carrega até bater
//
// -------------------------------------------------------------------
function computeBounceRiseTarget(player, gs, interceptProfile) {
  const ball    = gs.ball;
  const side    = player.side > 0 ? 1 : -1;
  const bounced = (ball.bounceCount ?? 0) >= 1;

  // Só se aplica após o quique no próprio lado
  if (!bounced) return null;
  if (player.atNet)  return null;

  // Quique deve ter sido no lado do jogador
  const lastBounceSide = ball.lastBounceSide ?? Math.sign(ball.pos.y);
  if (lastBounceSide !== 0 && lastBounceSide !== side) return null;

  // Bola deve estar vindo em direção ao jogador (ou já no lado dele)
  const ballComingToMe = (side > 0 && ball.vel.y >= -0.5) || (side < 0 && ball.vel.y <= 0.5);
  const ballOnMySide   = Math.sign(ball.pos.y) === side || Math.abs(ball.pos.y) < 0.8;
  if (!ballComingToMe && !ballOnMySide) return null;

  // Bola deve estar subindo (pós-quique ascendente)
  const vz = ball.vel?.z ?? 0;
  const bz = ball.pos?.z ?? 0;
  if (vz <= 0) return null; // já passou o pico ou descendo — não bloquear

  const preferredCZ  = interceptProfile?.preferredContactZ ?? 0.80;
  const minCZ        = interceptProfile?.minContactZ ?? 0.54;

  // Já na zona de contato — libera imediatamente
  if (bz >= minCZ) return null;

  // -- Cálculo cinemático do ponto de rise --------------------------
  // z(t) = bz + vz*t - 0.5*g*t² = preferredCZ
  // ? t = (vz - sqrt(vz² - 2g*dz)) / g
  const g  = 9.81;
  const dz = preferredCZ - bz;
  const disc = vz * vz - 2 * g * dz;

  // Se discriminante negativo, bola não chega à preferredCZ — usar minCZ
  const targetCZ = disc >= 0 ? preferredCZ : minCZ;
  const dz2      = targetCZ - bz;
  const disc2    = vz * vz - 2 * g * dz2;
  if (disc2 < 0) return null; // bola não chega nem ao mínimo — ignorar

  let tRise = (vz - Math.sqrt(disc2)) / g;
  if (tRise < 0.02) return null;

  // -- Imprecisão por leitura ---------------------------------------
  // leitura 99 ? erro ~0%, leitura 0 ? erro até ~28% no tRise
  // Topspin é mais difícil de ler ? erro adicional
  const leitura      = (player.attrs?.leitura ?? 60) / 99; // 0–1
  const family       = getBallFamily(ball);
  const familyHard   = family === 'TOPSPIN_DRIVE' ? 1.0
                     : family === 'SLICE'          ? 0.55
                     : 0.35;

  // Snapshot: erro calculado uma vez no momento do quique e mantido
  // até o próximo quique. Isso faz o jogador "carregar" o erro de leitura.
  const bounceId = ball._bounceId ?? ball.bounceCount; // identificador único do quique atual
  if (player._riseReadBounceId !== bounceId) {
    // Novo quique — recalcular erro
    player._riseReadBounceId = bounceId;
    // Gauss com sigma proporcional à dificuldade e inversamente proporcional à leitura
    const sigma = (1 - leitura) * familyHard * 0.30; // max ~30% desvio em tRise
    const u1 = Math.max(1e-9, Math.random()), u2 = Math.random();
    const noise = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    player._riseReadError = noise * sigma; // aplicado ao tRise como multiplicador
  }
  tRise = Math.max(0.02, tRise * (1 + player._riseReadError));

  // -- Posição alvo: onde a bola estará em tRise --------------------
  const riseX = ball.pos.x + ball.vel.x * tRise;
  const riseY = ball.pos.y + ball.vel.y * tRise;

  // Clamp à quadra, com margem de 0.30m atrás do ponto (jogador fica levemente atrás)
  const outerX = COURT.halfW + THRESHOLDS.outerPlayerX;
  const outerY = COURT.halfL + THRESHOLDS.outerPlayerY;
  const baselineY = getStyleBaselineY(player);

  // "Atrás" = mais fundo na quadra (jogador não avança para o ponto exato)
  const behindBias = 0.28; // metros atrás do ponto de rise
  const targetX = clamp(riseX, -outerX + 0.2, outerX - 0.2);
  const targetY = side > 0
    ? clamp(riseY + behindBias, baselineY - 0.20, outerY)
    : clamp(riseY - behindBias, -outerY, baselineY + 0.20);

  // -- blockHit: impede bater enquanto bola ainda não chegou à zona -
  // Libera quando bola está a ~85% do caminho até minCZ (margem de reação)
  const releaseZ = minCZ * 0.88;
  const blockHit = bz < releaseZ && vz > 0.01;

  return { x: targetX, y: targetY, blockHit, tRise };
}

function computeMoveTarget(player, gs) {
  const airDens     = gs.environment?.airDensity ?? 1.2;
  const depthOffset = getStyleDepthOffset(player);
  const outerX      = COURT.halfW + THRESHOLDS.outerPlayerX;
  const outerY      = COURT.halfL + THRESHOLDS.outerPlayerY;
  const surfaceRead = getSurfaceReadTuning(gs.courtPhysics);
  const ballRead    = getBallReadTuning(gs.ball);
  const currentIntent = player.ctx?.currentIntent ?? 'BUILD';

  // -- BOUNCE-RISE MASTER -------------------------------------------
  // Reutiliza resultado calculado no pré-FSM (evita double compute)
  const interceptProfile = player._cachedBrProfile ?? buildMovementInterceptProfile(player, gs, {
    surface: gs.courtPhysics?.surface,
    currentIntent,
  });
  const bounceRise = player._cachedBrResult !== undefined
    ? player._cachedBrResult
    : computeBounceRiseTarget(player, gs, interceptProfile);
  player._cachedBrProfile = undefined;
  player._cachedBrResult  = undefined;

  if (bounceRise) {
    const existingTarget = player._bounceRiseTarget;
    const hasSameRead    = existingTarget && player._riseReadBounceId === (gs.ball._bounceId ?? gs.ball.bounceCount);
    // Atualização suave apenas no X (lateral) — Y (profundidade) atualiza imediato
    // para o jogador ir direto ao ponto de rise sem arco.
    const finalX = hasSameRead ? existingTarget.x * 0.72 + bounceRise.x * 0.28 : bounceRise.x;
    const finalY = bounceRise.y; // sempre atualiza Y imediato — sem smoothing de profundidade
    player._bounceRiseTarget = { x: finalX, y: finalY };
    if (bounceRise.blockHit) {
      player._holdForRiseActive = true;
      player._holdForRiseMinZ   = interceptProfile?.minContactZ ?? 0.54;
    }
    const outerX2 = COURT.halfW + THRESHOLDS.outerPlayerX;
    const outerY2 = COURT.halfL + THRESHOLDS.outerPlayerY;
    return {
      x: clamp(finalX, -outerX2 + 0.2, outerX2 - 0.2),
      y: clamp(finalY, -outerY2, outerY2),
      t: bounceRise.tRise,
      _forceReplan: !hasSameRead, // nova leitura ? bypassa smoothing, jogador corrige imediato
    };
  }
  player._bounceRiseTarget = null;
  // Bouncerise não ativo: reset dos flags para o pipeline normal
  player._holdForRiseActive = false;
  player._holdForRiseMinZ = undefined;
  player._holdForRiseTargetT = undefined;
  // -- FIM BOUNCE-RISE MASTER ---------------------------------------

  // [FASE 5] Altura de contato por cadência — usada como referência
  // para quando predictTrajectory deve encontrar optimalHitPoint.
  const baseContactZ = interceptProfile?.preferredContactZ ?? (
    player.prefs
      ? (CONTACT_Z_BY_CADENCE[player.prefs.rallyCadence] ?? 0.75)
      : 0.75
  );
  let contactZ = clamp(
    baseContactZ + surfaceRead.contactZDelta + ballRead.contactZDelta,
    interceptProfile?.minContactZ ?? 0.32,
    interceptProfile?.maxContactZ ?? 1.20,
  );
  const contactWindow = resolveContactWindowStrategy(gs.ball, player, currentIntent, contactZ, interceptProfile, surfaceRead);
  if (contactWindow.shouldHoldForRise) {
    contactZ = Math.max(contactZ, contactWindow.desiredMinContactZ);
  }
  // maxTime estendido levemente para PATIENT (precisa esperar a bola subir mais)
  const predMaxTimeBase = player.atNet ? 1.2 : (contactZ > 0.80 ? 3.2 : 2.8);
  let predMaxTime = Math.max(
    1.1,
    predMaxTimeBase
    + surfaceRead.predTimeDelta
    + ballRead.predTimeDelta
    + (interceptProfile?.predTimeDelta ?? 0),
  );
  if (currentIntent === 'PRESSURE') {
    contactZ = clamp(
      contactWindow.shouldHoldForRise ? Math.max(contactZ, contactWindow.desiredMinContactZ) : contactZ - 0.03,
      interceptProfile?.minContactZ ?? 0.32,
      interceptProfile?.maxContactZ ?? 1.20,
    );
    predMaxTime = Math.max(1.1, predMaxTime - 0.06);
  } else if (currentIntent === 'FINISH') {
    contactZ = clamp(
      contactWindow.shouldHoldForRise ? Math.max(contactZ, contactWindow.desiredMinContactZ + 0.02) : contactZ - 0.06,
      interceptProfile?.minContactZ ?? 0.32,
      interceptProfile?.maxContactZ ?? 1.20,
    );
    predMaxTime = Math.max(1.05, predMaxTime - (contactWindow.shouldHoldForRise ? 0.02 : 0.12));
  }
  if (contactWindow.shouldHoldForRise) {
    predMaxTime = Math.max(predMaxTime, 1.25);
  }
  // Bola alta demais (topspin pesado quicou acima do maxContactZ):
  // estender predMaxTime para que predictTrajectory encontre o optimalHitPoint
  // na DESCIDA, após a bola passar o topo — reproduz o comportamento real de
  // recuar e esperar a bola cair ao SHOULDER/SWEET.
  if (contactWindow.shouldWaitForDescent) {
    predMaxTime = Math.max(predMaxTime, 3.0);
  }

  // Bola muito lenta: predictTrajectory falha — ir direto à bola.
  // CRÍTICO: usar velocidade horizontal (vel.xy) e não 3D, porque uma bola
  // subindo após quique tem vel.z alto mas vel.xy baixo — não é "bola morta".
  const ballSpd3dSlow = Math.sqrt(gs.ball.vel.x**2 + gs.ball.vel.y**2 + gs.ball.vel.z**2);
  const ballSpdHoriz  = Math.sqrt(gs.ball.vel.x**2 + gs.ball.vel.y**2);
  const ballRisingNow = (gs.ball.bounceCount ?? 0) >= 1 && (gs.ball.vel.z ?? 0) > 0.40;
  const isSlowBounced = (gs.ball.bounceCount ?? 0) >= 1
    && !ballRisingNow   // bola subindo não é "morta" — tem trajetória real
    && ballSpdHoriz < (surfaceRead.slowBallThreshold + ballRead.slowBallThresholdDelta + (interceptProfile?.slowBallThresholdDelta ?? 0))
    && ballSpd3dSlow > 0.05
    && gs.ball.inFlight;

  const alreadyBounced = (gs.ball.bounceCount ?? 0) >= 1;

  // predY corrigido [FASE 1]: projeção de 0.18s em vez de baseline fixa
  const predY = computePredInterceptY(player, gs, surfaceRead, interceptProfile);

  const { landPoint, optimalHitPoint, crossPoint } = predictTrajectory(
    gs.ball,
    predY,
    predMaxTime,
    airDens,
    gs.courtPhysics,
    {
      preferredContactZ: contactZ,
      minContactZ: interceptProfile?.minContactZ ?? Math.max(0.28, contactZ - 0.24),
      maxContactZ: interceptProfile?.maxContactZ ?? Math.min(1.35, contactZ + 0.24),
      contactBand: interceptProfile?.contactBand,
      yTolerance: interceptProfile?.yTolerance,
      delayBand: interceptProfile?.delayBand,
      preferredNetZ: interceptProfile?.preferredNetZ,
    },
  );

  // Modo desesperado: margem muito negativa ? landPoint direto
  const currentMargin = player._arrivalMargin ?? 0;
  const isDesperate   = currentMargin < -0.30;

  let pocketTarget = resolveContactPocketTarget(player, gs, {
    outerX,
    outerY,
    depthOffset,
    ballRead,
    currentIntent,
    preferredContactZ: contactZ,
    contactWindow,
    interceptProfile,
    alreadyBounced,
    isSlowBounced,
    landPoint,
    optimalHitPoint,
    crossPoint,
    isDesperate,
  });

  const liveAccessibilityWindow = alreadyBounced
    && gs.ball.inFlight
    && gs.ball.pos.z >= 0.12
    && gs.ball.pos.z <= 1.34
    && (
      Math.abs(gs.ball.vel.y) < 7.0
      || getBallFamily(gs.ball) === 'DROP_SHOT'
      || Math.abs(gs.ball.pos.y) + 0.80 < Math.abs(player.pos.y)
    );
  if (liveAccessibilityWindow) {
    const liveBlend = clamp((1.28 - gs.ball.pos.z) / 0.92, 0, 1)
      * clamp(1 - Math.abs(gs.ball.vel.y) / 7.8, 0, 1);
    const pocketBehind = clamp((pocketTarget.behind ?? 0.34) * 0.58, 0.10, 0.24);
    const liveY = gs.ball.pos.y + player.side * pocketBehind;
    // Fix: quando a bola ainda está voando rápido lateralmente (|vel.x| >= 2.0),
    // a posição atual da bola está atrás da sua posição real de quique — usar
    // pocketTarget.x (da predição) em vez de ball.pos.x para não mandar o jogador
    // para um ponto intermediário errado.
    const ballMovingLaterallyFast = Math.abs(gs.ball.vel.x) >= 2.0;
    pocketTarget = {
      ...pocketTarget,
      x: ballMovingLaterallyFast
        ? pocketTarget.x
        : blendScalar(pocketTarget.x, gs.ball.pos.x, 0.46 + liveBlend * 0.36),
      y: blendScalar(pocketTarget.y, liveY, 0.38 + liveBlend * 0.42),
      t: Math.min(pocketTarget.t ?? 0.34, 0.22 + (1 - liveBlend) * 0.12),
      source: `${pocketTarget.source}-live`,
    };
  }

  const bounceVar     = gs.courtMods?.bounceVariance ?? 0;
  const _ctrlForNoise = (player.attrs?.controle ?? 60) / 100;
  const consistFrac   = _ctrlForNoise * 0.9;
  const noiseScale    = ((1 - (player.stamina ?? 1)) * 0.18)
                      + ((player.ctx?.rallyPressure ?? 0) * 0.45)
                      + bounceVar * (1 - consistFrac) * 0.8;
  let targetX = pocketTarget.x;
  if (noiseScale > 0.04) {
    const source = pocketTarget.source ?? '';
    const emergencyFactor = source.includes('emergency')
      ? 1.8
      : source.includes('live')
        ? 1.2
        : source.includes('short-dying')
          ? 1.35
          : 1.0;
    const u1 = Math.max(1e-9, Math.random()), u2 = Math.random();
    targetX += Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2) * noiseScale * 0.65 * emergencyFactor;
  }

  player._contactPocketBehind = pocketTarget.behind;
  player._contactPocketSource = pocketTarget.source;
  player._contactPoint = pocketTarget.contactPoint ?? null;

  return {
    x: clamp(targetX, -outerX + 0.2, outerX - 0.2),
    y: pocketTarget.y,
    t: pocketTarget.t,
  };

    // depthOffset só para bolas lentas — rápidas já têm optimalHitPoint correto
    // Ruído perceptivo (stamina + rally pressure + surface)
}

/**
 * RECOVER target após bater a bola.
 * [FASE 1 — de v3] Snapshot calculado UMA VEZ na transição ? RECOVER.
 * [FASE 3] NET/TRANSITION delegam para computeNetPos/computeTransitionPos.
 */
function computeRecoverTarget(player, gs) {
  const lastShotX = player.ctx?._lastShotX ?? 0;
  const bisectorX = clamp(lastShotX * 0.45, -1.8, 1.8);
  const courtMode = player.ctx?.courtMode ?? 'BASE';
  const opp = gs?.players?.find(p => p.id !== player.id);
  const oppX = opp?.pos?.x ?? 0;
  const surfaceProfile = getMovementSurfaceProfile(gs);
  const movementClass = player._movementContactClass ?? 'NORMAL_HIT';
  const scrambleRecovery = movementClass === 'EMERGENCY_REACH'
    ? 0.34
    : movementClass === 'LOW_BALL_PICKUP'
      ? 0.22
      : 0;
  const defensiveLoad = clamp((player.ctx?.rallyPressure ?? 0) * 0.28 + scrambleRecovery, 0, 0.34);
  const offensiveBias = player.ctx?.currentIntent === 'FINISH'
    ? -0.18
    : player.ctx?.currentIntent === 'PRESSURE'
      ? -0.10
      : 0;

  if (courtMode === 'TRANSITION') {
    return computeTransitionPos(player, gs);
  }

  if (courtMode === 'NET') {
    return computeNetPos(player, gs);
  }

  const baselineY = getStyleBaselineY(player);
  const biasX     = (player._positionBias ?? 0) + getWingRecoverBias(player);
  const openCourtBias = clamp(oppX * 0.12 * surfaceProfile.lateralRecover, -0.28, 0.28);
  const recoverDepth = baselineY + player.side * (surfaceProfile.recoverDepth + defensiveLoad + offensiveBias);
  return {
    x: clamp(bisectorX + biasX + openCourtBias, -2.15, 2.15),
    y: player.side > 0
      ? clamp(recoverDepth, 1.2, COURT.halfL + THRESHOLDS.outerPlayerY)
      : clamp(recoverDepth, -COURT.halfL - THRESHOLDS.outerPlayerY, -1.2),
  };
}

// ------------------------------------------------------------------
// FASE 3 — POSIÇÕES DE REDE E LOB (funções puras de v2)
// ------------------------------------------------------------------

/**
 * Posição na rede por prefs.netGame.
 * [FASE 3 — de v2] HUNTER fica a 2.2m da rede; AVOIDS a 3.5m.
 * T-position cobre ângulo do adversário + bisector do último golpe.
 */
function computeNetPos(player, gs) {
  const opp       = gs?.players?.find(p => p.id !== player.id);
  const oppX      = opp?.pos?.x ?? 0;
  const oppY      = opp?.pos?.y ?? 0;
  const lastShotX = player.ctx?._lastShotX ?? 0;
  const prefs     = player.prefs ?? {};
  const netPhase  = player.ctx?.netPhase ?? 'FIRST_VOLLEY';
  const surfaceProfile = getMovementSurfaceProfile(gs);

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

  const buildAdjX = {
    CENTRE_CONTROL: clamp(tPosX * 0.55, -1.5, 1.5),
    CROSS_DOMINANT: clamp(tPosX + Math.sign(lastShotX || oppX || 1) * 0.15, -2.3, 2.3),
    DTL_HUNTER: clamp(tPosX - Math.sign(oppX || lastShotX || 1) * 0.18, -2.3, 2.3),
  }[prefs.buildStyle];

  const phaseDistOffset = netPhase === 'APPROACH'
    ? 0.55
    : netPhase === 'FIRST_VOLLEY'
      ? 0.18
      : -0.12;
  const phaseXMult = netPhase === 'CLOSE_FINISH' ? 1.08 : netPhase === 'APPROACH' ? 0.92 : 1.0;
  const passingCoverBias = clamp((oppX - lastShotX) * 0.12 * surfaceProfile.netCover, -0.30, 0.30);
  const lobRespect = Math.abs(oppY) > COURT.serviceLineY ? 0.12 : 0;

  return {
    x: clamp((buildAdjX ?? tPosX) * phaseXMult + passingCoverBias, -2.45, 2.45),
    y: player.side * (netDistFromNet + phaseDistOffset + lobRespect),
  };
}

/**
 * Posição de transição (approach): mid-court ofensivo, ~40% da quadra.
 * [FASE 3 — de v2] Cobre ângulo via approachLandX.
 */
function computeTransitionPos(player, gs) {
  const prefs         = player.prefs ?? {};
  const lastShotX     = player.ctx?._lastShotX ?? 0;
  const netPhase      = player.ctx?.netPhase ?? 'APPROACH';
  const surfaceProfile = getMovementSurfaceProfile(gs);
  const bisectorX     = clamp(lastShotX * 0.45, -2.4, 2.4);
  const approachLandX = player.ctx?._approachLandX ?? 0;
  const coverBaseX    = clamp(bisectorX * 0.6 + approachLandX * 0.4, -2.2, 2.2);
  const coverX = prefs.buildStyle === 'CENTRE_CONTROL'
    ? clamp(coverBaseX * 0.65, -1.6, 1.6)
    : prefs.buildStyle === 'DTL_HUNTER'
      ? clamp(coverBaseX - Math.sign(approachLandX || lastShotX || 1) * 0.16, -2.2, 2.2)
      : coverBaseX;
  const transYBase    = COURT.halfL * 0.38;
  const transYOffset  = {
    HUNTER:      -0.18,
    PROACTIVE:   -0.10,
    OPPORTUNIST:  0.00,
    RELUCTANT:   +0.08,
    AVOIDS:      +0.14,
  }[prefs.netGame] ?? 0;
  const riskYOffset = {
    SAFETY_FIRST: +0.08,
    SAFE:         +0.04,
    CALCULATED:    0.00,
    GAMBLER:      -0.04,
    ALLOUT:       -0.08,
  }[prefs.riskProfile] ?? 0;
  const phaseYAdjust  = netPhase === 'APPROACH' ? 0.00 : netPhase === 'FIRST_VOLLEY' ? -0.10 : -0.18;
  const phaseXMult    = netPhase === 'APPROACH' ? 1.0 : netPhase === 'FIRST_VOLLEY' ? 0.94 : 1.06;
  const intentAdjust  = player.ctx?.currentIntent === 'FINISH' ? -0.10 : player.ctx?.currentIntent === 'RESET' ? 0.08 : 0;
  const transY        = player.side * (transYBase + transYOffset + riskYOffset + phaseYAdjust + surfaceProfile.transitionDepth + intentAdjust);
  return { x: clamp(coverX * phaseXMult, -2.2, 2.2), y: transY };
}

/**
 * Detecta lob real (? bola normal de topspin).
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
  const t = (-b + Math.sqrt(disc)) / (2 * a);
  if (t < 0.001) return true;
  const landY = ball.pos.y + ball.vel.y * t;
  const retreatMargin = player.ctx?.netPhase === 'CLOSE_FINISH' ? 3.4 : 3.0;
  return Math.abs(landY) > Math.abs(netY) + retreatMargin;
}

function computeInterceptInertiaPenalty(player, moveTarget) {
  if (!moveTarget) return 0;
  const dx = (moveTarget.x ?? player.pos.x) - player.pos.x;
  const dy = (moveTarget.y ?? player.pos.y) - player.pos.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const currSpd = Math.sqrt((player.vel?.x ?? 0) ** 2 + (player.vel?.y ?? 0) ** 2);
  if (dist < 0.05 || currSpd < 0.12) return 0;

  const dirX = dx / dist;
  const dirY = dy / dist;
  const dirDot = ((player.vel?.x ?? 0) * dirX + (player.vel?.y ?? 0) * dirY) / currSpd;
  const lateralHeavy = Math.abs(dx) > Math.abs(dy) * 1.10;
  const movingBackward = dy * (player.side ?? 1) > 0.10;
  const stancePenalty = ({
    TURN_RUN: 0.08,
    BACKPEDAL: 0.06,
    LATERAL_SHUFFLE: 0.05,
    FORWARD_SPRINT: 0.02,
    CHASE: 0.00,
  }[player._locomotionMode] ?? 0.02);

  let penalty = stancePenalty;
  if (dirDot < -0.55) {
    penalty += 0.16 + (-0.55 - dirDot) * 0.16;
  } else if (dirDot < 0.12) {
    penalty += 0.05 + (0.12 - dirDot) * 0.08;
  }
  if (lateralHeavy) penalty += 0.03;
  if (movingBackward) penalty += 0.03;
  if (currSpd > 2.2) penalty += Math.min(0.08, (currSpd - 2.2) * 0.02);
  return clamp(penalty, 0, 0.42);
}

// ------------------------------------------------------------------
// VELOCIDADES POR ESTADO
// ------------------------------------------------------------------

function getMoveSpeed(player, target, arrivalMargin, physMaxSpd) {
  const d = dist2(player.pos, target) || 0;
  const accelRush = clamp(1 + (((player.mods?.accelMult ?? 1) - 1) * 0.80), 0.96, 1.18);
  const speedRush = clamp(1 + (((player.mods?.speedMult ?? 1) - 1) * 0.55), 0.96, 1.14);
  const rushBoost = clamp(accelRush * 0.58 + speedRush * 0.42, 0.98, 1.16);
  const commit = player._movementCommit;
  const commitDir = commit ? normalize2(commit.x, commit.y) : null;
  const targetDir = normalize2(target.x - player.pos.x, target.y - player.pos.y);
  const velDir = normalize2(player.vel?.x ?? 0, player.vel?.y ?? 0);
  const reversingPenalty = commitDir && targetDir.mag
    ? clamp((1 - (commitDir.x * targetDir.x + commitDir.y * targetDir.y)) * 0.18, 0, 0.20)
    : 0;
  const firstStepTimer = player.ctx?._firstStepBoostTimer ?? 0;
  const splitReadiness = player.ctx?._splitReadiness ?? 0;
  const firstStepBoost = firstStepTimer > 0
    ? clamp(1 + splitReadiness * 0.16 + firstStepTimer * 1.15, 1.02, 1.26)
    : 1;
  const carryBonus = velDir.mag && targetDir.mag
    ? clamp((velDir.x * targetDir.x + velDir.y * targetDir.y) * 0.08, -0.04, 0.08)
    : 0;
  if (arrivalMargin <= 0) {
    return physMaxSpd * clamp(MOVEMENT.urgencySprint * rushBoost * firstStepBoost * (1 + carryBonus), 0.82, 1.42);
  }
  const needed = d / (arrivalMargin * 0.85);
  // mustRun: distância grande exige pelo menos trote independente do arrivalMargin.
  // Sem isso, bola wide com margin > 0.45s faz o jogador começar em urgencyWalk
  // antes de perceber que precisa correr — visível especialmente em bolas lentas wide.
  const mustRun = d > 2.0;
  const floorMult = arrivalMargin < 0.16
    ? MOVEMENT.urgencyRun
    : (arrivalMargin < 0.45 || mustRun)
      ? MOVEMENT.urgencyJog
      : MOVEMENT.urgencyWalk;
  const capMult = arrivalMargin < 0.08
    ? MOVEMENT.urgencySprint * rushBoost
    : arrivalMargin < 0.22
      ? MOVEMENT.urgencyRun * rushBoost
      : 1.0;
  return clamp(
    needed * (1 + carryBonus) * firstStepBoost,
    physMaxSpd * Math.max(0.22, floorMult - reversingPenalty),
    physMaxSpd * Math.max(0.84, capMult * firstStepBoost),
  );
}

function getRecoverSpeed(player, recoverTarget, physMaxSpd) {
  const courtMode = player.ctx?.courtMode ?? 'BASE';
  if (courtMode === 'TRANSITION') return physMaxSpd * 0.95;
  const d = dist2(player.pos, recoverTarget) || 0;
  if (d < 0.5) return physMaxSpd * 0.30;
  return physMaxSpd * clamp(0.30 + (d - 0.5) / 3.0 * 0.48, 0.30, 0.78);
}

// ------------------------------------------------------------------
// SUAVIZAÇÃO DE TARGET (apenas para MOVE)
// ------------------------------------------------------------------

/**
 * Blend entre rawTarget e _stableTarget para evitar samba de predição.
 * [FASE 1 — de v3] Alpha por urgência de margem.
 *
 * Aplicado APENAS em MOVE. WAIT e RECOVER usam applyWaitMovement
 * com eixos independentes — não precisam de smoothing de vetor.
 */
function applyTargetSmoothing(player, rawTarget, arrivalMargin) {
  if (rawTarget?._forceImmediate || rawTarget?._forceReplan) {
    player._stableTarget = { x: rawTarget.x, y: rawTarget.y };
    return rawTarget;
  }

  if (!player._stableTarget) {
    player._stableTarget = { ...rawTarget };
    return rawTarget;
  }

  const courtMode     = player.ctx?.courtMode ?? 'BASE';
  const isNetApproach = courtMode === 'TRANSITION' || courtMode === 'NET';
  const readLaneX = player.ctx?._readLaneX;
  const readDepthY = player.ctx?._readDepthY;
  const commit = player._movementCommit;
  const targetVec = normalize2(rawTarget.x - player.pos.x, rawTarget.y - player.pos.y);
  const commitAlign = commit && targetVec.mag
    ? clamp(commit.x * targetVec.x + commit.y * targetVec.y, -1, 1)
    : 0;
  const correctionTightness = commit
    ? clamp(1 - commit.strength * 0.42 + Math.max(0, -commitAlign) * 0.24, 0.44, 0.96)
    : 0.82;

  // Alpha alto quando a bola vai wide: diferença lateral grande exige commit imediato.
  // Sem isso, alpha=0.52 com arrivalMargin > 0.32 faz o jogador "considerar" o destino
  // por vários frames em vez de sprinting direto para o canto.
  const lateralGapWide = Math.abs(rawTarget.x - player.pos.x) > 1.5;
  const alpha = isNetApproach
    ? 0.70
    : lateralGapWide
      ? 0.88
      : (arrivalMargin < 0.15 ? 0.90 : arrivalMargin < 0.32 ? 0.74 : 0.52);

  const laneBlend = Number.isFinite(readLaneX) && arrivalMargin > 0.12
    ? clamp(0.05 + (player.ctx?._anticipationWindow ?? 0) * 0.55, 0.05, 0.16)
    : 0;
  const depthBlend = Number.isFinite(readDepthY) && arrivalMargin > 0.12
    ? clamp(0.04 + (player.ctx?._anticipationTowardMe ? 0.08 : 0.03), 0.04, 0.14)
    : 0;
  const curvedTargetX = laneBlend > 0 ? blendScalar(rawTarget.x, readLaneX, laneBlend) : rawTarget.x;
  const curvedTargetY = depthBlend > 0 ? blendScalar(rawTarget.y, readDepthY, depthBlend) : rawTarget.y;

  player._stableTarget.x += (curvedTargetX - player._stableTarget.x) * alpha * correctionTightness;
  player._stableTarget.y += (curvedTargetY - player._stableTarget.y) * alpha * correctionTightness;

  const arrivalAdjustWindow = clamp((arrivalMargin - 0.03) / 0.22, 0, 1);
  if (arrivalAdjustWindow < 0.65) {
    player._stableTarget.x = blendScalar(player._stableTarget.x, rawTarget.x, 0.34 + (1 - arrivalAdjustWindow) * 0.26);
    player._stableTarget.y = blendScalar(player._stableTarget.y, rawTarget.y, 0.28 + (1 - arrivalAdjustWindow) * 0.22);
  }

  return { ...player._stableTarget };
}

// ------------------------------------------------------------------
// FASE 2 — MOVIMENTO DE ESPERA COM EIXOS X/Y SEPARADOS
// ------------------------------------------------------------------

/**
 * applyWaitMovement — eixos X e Y completamente independentes.
 * [FASE 2 — de v2]
 *
 * Em tênis real, o jogador faz coisas distintas nos dois eixos no WAIT:
 *   Y (profundidade): recua deliberadamente para a baseline — urgente.
 *   X (lateral):      shuffle suave para cobrir o bisector — lento, separado.
 *
 * Problema de applyMovementPhysics em WAIT (v1/v3):
 *   Move X+Y como vetor diagonal único ? cria arco circular ao reposicionar.
 *   No tênis real: recua em Y enquanto drifa lateralmente em X, de forma
 *   independente. Os dois eixos não se acoplam.
 *
 * Usado nos estados WAIT e RECOVER.
 * MOVE continua usando applyMovementPhysics (precisa do vetor urgente).
 */
function applyWaitMovement(player, target, dt, state = 'WAIT') {
  if (!dt || dt <= 0) return;

  const staminaFrac = player.stamina ?? 1.0;
  const baseSpeed   = player.playerSpeed || PLAYER_CFG.speed;
  const physMax     = baseSpeed * (STAMINA.speedMinFactor + staminaFrac * (1 - STAMINA.speedMinFactor));

  const OUTER_Y = COURT.halfL + THRESHOLDS.outerPlayerY;
  const OUTER_X = COURT.halfW + THRESHOLDS.outerPlayerX;
  const movementClass = player._movementContactClass ?? 'NORMAL_HIT';
  const defensiveRecover = movementClass === 'EMERGENCY_REACH'
    ? 0.88
    : movementClass === 'LOW_BALL_PICKUP'
      ? 0.93
      : 1.0;
  const offensiveRecover = state === 'RECOVER' && player.ctx?.currentIntent === 'FINISH'
    ? 0.94
    : state === 'RECOVER' && player.ctx?.currentIntent === 'PRESSURE'
      ? 0.97
      : 1.0;

  // -- Y: recua para profundidade alvo ------------------------------
  // Urgente mas não sprint — reposicionamento deliberado.
  // backwardSpeedMult: penalidade de recuo (mais difícil recuar do que avançar).
  const dyFull = target.y - player.pos.y;
  const spdY   = physMax * MOVEMENT.urgencyJog * MOVEMENT.backwardSpeedMult * defensiveRecover * offensiveRecover;
  const stepY  = Math.min(Math.abs(dyFull), spdY * dt);
  player.vel.y = dt > 0 ? (Math.sign(dyFull) * stepY) / dt : 0;
  player.pos.y = clamp(
    player.pos.y + Math.sign(dyFull) * stepY,
    -OUTER_Y, OUTER_Y
  );

  // -- X: shuffle lateral suave --------------------------------------
  // 35% da velocidade máxima — cobre o bisector sem parecer corrida.
  // Completamente independente do movimento em Y.
  const dxFull = target.x - player.pos.x;
  const movingBackward = dyFull * player.side > 0.04;
  const movingForward  = dyFull * player.side < -0.04;
  const lateralHeavy   = Math.abs(dxFull) > Math.abs(dyFull) * 1.2;
  if (lateralHeavy) setLocomotionMode(player, state === 'RECOVER' ? 'SHUFFLE_RECOVER' : 'SHUFFLE_WAIT');
  else if (movingBackward) setLocomotionMode(player, 'BACKPEDAL');
  else if (movingForward) setLocomotionMode(player, state === 'RECOVER' ? 'FORWARD_RECOVER' : 'STEP_IN');
  else setLocomotionMode(player, state === 'RECOVER' ? 'SET_RECOVER' : 'SET_WAIT');

  // No estado MOVE com bounce-rise, usar velocidade lateral maior (jogador correndo para o ponto)
  const lateralSpeedMult = state === 'MOVE' ? 0.82 : 0.35;
  const spdX   = physMax * lateralSpeedMult * (state === 'RECOVER' ? 0.96 : 1.0) * defensiveRecover;
  const stepX  = Math.min(Math.abs(dxFull), spdX * dt);
  player.vel.x = dt > 0 ? (Math.sign(dxFull) * stepX) / dt : 0;
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

// ------------------------------------------------------------------
// FÍSICA DE MOVIMENTO (para MOVE)
// ------------------------------------------------------------------

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
  const reachNow = player.reach ?? 0.85;
  const lateralBallGap = Math.abs(gs.ball.pos.x - player.pos.x);
  const depthBallGap = Math.abs(gs.ball.pos.y - player.pos.y);
  const distToBallNow = Math.sqrt(
    (gs.ball.pos.x - player.pos.x) ** 2 + (gs.ball.pos.y - player.pos.y) ** 2
  );
  const mandatoryPickupPursuit = !!player._urgentDeadBallPickup;
  const pickupReadyNow = !!player._pickupReadyNow;
  const movementClass = player._movementContactClass ?? 'NORMAL_HIT';
  const scrambleMove = movementClass === 'EMERGENCY_REACH' || movementClass === 'LOW_BALL_PICKUP';
  const surfaceProfile = getMovementSurfaceProfile(gs);
  const contactBrakeWindow = (gs.ball.bounceCount ?? 0) >= 1
    && gs.ball.pos.z >= 0.14
    && gs.ball.pos.z <= 1.38
    && lateralBallGap < reachNow * 1.16
    && depthBallGap < reachNow * 2.05
    && distToBallNow < reachNow * 1.55
    && ((player._arrivalMargin ?? 0.3) < 0.06 || player._forceHitTransition);

  const dx   = target.x - player.pos.x;
  const dy   = target.y - player.pos.y;
  const dist = Math.sqrt(dx * dx + dy * dy) || 1e-9;
  const fwdDotRaw = (-dy * player.side) / dist;
  const movingBackward = dy * player.side > 0.10;
  const movingForward  = dy * player.side < -0.10;
  const lateralHeavy   = Math.abs(dx) > Math.abs(dy) * 1.15;
  // isDeepRetreat: TURN_RUN (90% accel) em vez de BACKPEDAL (modo mais lento).
  // Cobre dois casos:
  //   (a) Recuo profundo clássico: lob alto ou bola caindo muito atrás do jogador.
  //   (b) NOVO — diagonal wide+backward: bola indo para o canto E recuando.
  //       Sem isso, fwdDot < -0.18 ? BACKPEDAL, que é o modo mais lento do sistema.
  //       No tênis real, o jogador gira e corre em diagonal — TURN_RUN reproduz isso.
  const wideChaseRetreat = movingBackward && Math.abs(dx) > 1.8 && dist > 2.0;
  const isDeepRetreat  = wideChaseRetreat
    || (movingBackward && dist > 3.5 && (gs.ball.pos.z > 2.55 || Math.abs(target.y) > Math.abs(player.pos.y) + 1.7));

  // Penalidade direcional (lateral e trás mais lentos)
  let dirMult = 1.0;
  if (dist > 0.15) {
    const fwdDot = fwdDotRaw;
    if (contactBrakeWindow && (!mandatoryPickupPursuit || pickupReadyNow)) {
      dirMult = 0.78;
      setLocomotionMode(player, lateralHeavy ? 'LATERAL_ADJUST' : 'MICRO_ADJUST');
    } else if (isDeepRetreat) {
      dirMult = 0.90;
      setLocomotionMode(player, 'TURN_RUN');
    } else if (fwdDot < -0.18) {
      dirMult = MOVEMENT.backwardSpeedMult * 0.96;
      setLocomotionMode(player, 'BACKPEDAL');
    } else if (Math.abs(fwdDot) < 0.62) {
      const lateralMods = mods ? mods.decelMult : 1.0;
      const latBase = MOVEMENT.lateralSpeedMult;
      dirMult = latBase + (1.0 - latBase) * Math.min(1, (lateralMods - 0.72) / 0.56);
      setLocomotionMode(player, lateralHeavy ? 'LATERAL_SHUFFLE' : 'LATERAL_ADJUST');
    } else if (movingForward && isChasing) {
      dirMult = Math.min(1.08, dirMult * 1.03);
      setLocomotionMode(player, 'FORWARD_SPRINT');
    } else {
      setLocomotionMode(player, 'CHASE');
    }
  } else {
    setLocomotionMode(player, 'MICRO_ADJUST');
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
  const cappedMaxSpd = contactBrakeWindow
    ? Math.min(effectiveMaxSpd, Math.max(2.4, physMaxSpd * 0.82))
    : effectiveMaxSpd;
  const dSpd = Math.min(cappedMaxSpd, (dist / 0.3) * cappedMaxSpd);
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

  let effAccel = effAccelBase * footingMult;
  if (player._locomotionMode === 'TURN_RUN') effAccel *= 0.90;
  if (player._locomotionMode === 'BACKPEDAL') effAccel *= 0.88;
  if (player._locomotionMode === 'LATERAL_SHUFFLE') effAccel *= 0.93;
  if (contactBrakeWindow) effAccel *= 1.12;
  if (scrambleMove) effAccel *= 0.90 + surfaceProfile.lungeCarry * 0.06;

  let accel;
  if (dist < 0.15) {
    if (currSpd < 1.2) {
      player.vel.x *= 0.30;
      player.vel.y *= 0.30;
      player.pos.x += player.vel.x * dt;
      player.pos.y += player.vel.y * dt;
      setLocomotionMode(player, 'PLANT');
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
      const extraFrames = (lateralHeavy ? 1 : 0) + (movingBackward ? 1 : 0) + (currSpd > 3.6 ? 1 : 0);
      const physFrames = Math.round((INERTIA.reversal180Frames + extraFrames) / (_expMult || 1.0));
      player.ctx._reversalFrames = physFrames;
    }
    if (player.ctx._reversalFrames > 0) {
      player.ctx._reversalFrames--;
      const r180Mult = mods ? mods.accelMult : 1.0;
      accel = effAccel * INERTIA.reversal180AccelMult * 0.92 * r180Mult;
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

  if (scrambleMove && contactBrakeWindow) {
    player._postHitRecoveryTimer = Math.max(
      player._postHitRecoveryTimer ?? 0,
      movementClass === 'EMERGENCY_REACH' ? 0.18 : 0.12,
    );
  }
}

// ------------------------------------------------------------------
// RETORNO DE SAQUE
// ------------------------------------------------------------------

/**
 * handleServeReturn — lógica de retorno preservada de v3.
 * _readPauseTime: hesitação (em segundos) proporcional à velocidade do saque.
 *   Armazenado em segundos e decrementado por dt para ser independente do DT
 *   de simulação (headless 1/120, slim 1/30, etc.).
 *   Equivalência original (calibrada a 120 fps):
 *     240 km/h ? ~8.3 ms de hesitação
 *     210 km/h ? ~5.5 ms de hesitação
 *     <165 km/h ? sem hesitação (2º saque típico)
 */
function handleServeReturn(player, gs, dt) {
  if (!player._serveReturnFlightActive) {
    player._serveReturnFlightActive = true;
    player._readPauseTime = 0;
    player._readDelayInit = false;
  }

  const returnY = player.side * (COURT.halfL + 1.5);
  const outerY  = COURT.halfL + THRESHOLDS.outerPlayerY;
  const outerX  = COURT.halfW + THRESHOLDS.outerPlayerX;
  const servePhysType = gs.ball._servePhysType ?? null;
  const isKickServe = servePhysType === 'KICK';
  const kickRetreat = isKickServe ? 0.52 : 0;
  const kickContactZ = isKickServe ? 0.50 : 0;

  const ballDistFromNet = Math.abs(gs.ball.pos.y);
  const ballOnServerFar = Math.sign(gs.ball.pos.y) !== player.side
                       && ballDistFromNet > COURT.serviceLineY + (isKickServe ? 0.35 : 0.15);

  if (ballOnServerFar) {
    // Split-step: congela levemente enquanto lê o saque
    setLocomotionMode(player, 'RETURN_READ');
    player.vel.x *= 0.84;
    player.vel.y *= 0.84;
    player.pos.x += player.vel.x * dt;
    player.pos.y += player.vel.y * dt;
    return;
  }

  if ((player._readPauseTime ?? 0) <= 0 && !player._readDelayInit) {
    const sKmh    = gs.ball._serveExitKmh ?? 0;
    const retMult = player.mods?.returnMult ?? 0.82;
    const isSecondServe = !!gs.ball._isSecondServe;
    const rawFrames = clamp((sKmh - (isSecondServe ? 182 : 191)) / (isSecondServe ? 64 : 54), 0, isSecondServe ? 0.35 : 1.05);
    const skillMult = clamp(1.05 - retMult * 0.20, 0.68, 0.92);
    // Converte frames?segundos usando 120 fps como base de calibração original.
    // Assim a hesitação é idêntica em qualquer DT de simulação.
    player._readPauseTime = (rawFrames * skillMult) / 120;
    player._readDelayInit = true;
  }

  let _reactionSpeedCap = 1.0;
  if ((player._readPauseTime ?? 0) > 0) {
    setLocomotionMode(player, 'RETURN_SPLIT');
    player._readPauseTime -= dt;
    // framesLeft equivalente a 120 fps para manter a escala do speedCap original
    const framesLeft = Math.max(0, player._readPauseTime) * 120;
    _reactionSpeedCap = clamp(0.92 - framesLeft * 0.10, 0.70, 0.92);
    if (player._readPauseTime <= 0) player._readDelayInit = false;
  }

  const airDens  = gs.environment?.airDensity ?? 1.2;
  const surfaceRead = getSurfaceReadTuning(gs.courtPhysics);
  const servePredMaxTime = Math.max(1.8, 2.8 + surfaceRead.predTimeDelta * 0.8 + (isKickServe ? 0.38 : 0));
  const servePreferredContactZ = clamp(surfaceRead.serveContactZ + kickContactZ, surfaceRead.serveContactZ, 1.18);
  const { landPoint: serveLand, optimalHitPoint: serveOpt } = predictTrajectory(
    gs.ball,
    returnY + player.side * kickRetreat * 0.42,
    servePredMaxTime,
    airDens,
    gs.courtPhysics,
    {
      preferredContactZ: servePreferredContactZ,
      minContactZ: Math.max(0.50, servePreferredContactZ - 0.34),
      maxContactZ: isKickServe ? 1.82 : 1.32,
      contactBand: isKickServe ? 0.38 : 0.22,
      yTolerance: isKickServe ? 1.18 : 0.82,
      delayBand: isKickServe ? 0.32 : 0.28,
    },
  );

  const serveLandAbsY    = serveLand ? Math.abs(serveLand.y) : COURT.halfL;
  const serveIsShort     = serveLandAbsY < COURT.halfL * 0.72;
  const serveIsVeryShort = serveLandAbsY < COURT.halfL * 0.50;
  const nearNet          = player.side * 1.5;
  const deepCap          = clamp(returnY + player.side * kickRetreat, -outerY, outerY);

  let target = { x: player.pos.x, y: deepCap };

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
    target.y = deepCap;
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
  if (urgency2 >= MOVEMENT.urgencySprint) {
    setLocomotionMode(player, 'RETURN_SPRINT');
  } else if (urgency2 >= MOVEMENT.urgencyRun) {
    setLocomotionMode(player, 'RETURN_RUN');
  } else {
    setLocomotionMode(player, 'RETURN_SET');
  }
  const returnRush = clamp(
    1 + (((player.mods?.accelMult ?? 1) - 1) * 0.70) + (((player.mods?.speedMult ?? 1) - 1) * 0.35),
    1.0,
    1.24,
  );
  const serveReactionBoost = clamp(1.04 + Math.max(0, ((gs.ball._serveExitKmh ?? 0) - 182) / 180), 1.04, 1.18);
  const maxSpd2 = maxSpd2Base * urgency2 * _reactionSpeedCap * serveReactionBoost * (margin2 < 0.08 ? returnRush : 1 + (returnRush - 1) * 0.55);
  const dSpd2   = Math.min(maxSpd2, dist2_ / 0.4 * maxSpd2);
  const dvx2    = (dist2_ > 0.02 ? (dx2/dist2_)*dSpd2 : 0) - player.vel.x;
  const dvy2    = (dist2_ > 0.02 ? (dy2/dist2_)*dSpd2 : 0) - player.vel.y;
  const dvMag2  = Math.sqrt(dvx2*dvx2 + dvy2*dvy2) || 1e-9;
  const frac2   = Math.min(1, (PLAYER_CFG.maxAccel * serveReactionBoost * 1.12 * dt) / dvMag2);
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

export function resetMovementRuntime(player) {
  player._arrivalMargin = undefined;
  player._bodyInertiaPenalty = 0;
  player._predCrossX = undefined;
  player._readPauseTime = 0;
  player._readDelayInit = false;
  player._stableTarget = undefined;
  player._recoverTarget = null;
  player._hitTarget = null;
  player._posLocked = false;
  player._locomotionMode = 'RESET';
  player._lastSeenBounce = 0;
  player._nearMissTimer = 0;
  player._volleyType = null;
  player._halfVolleyContext = false;
  player._postHitRecoveryTimer = 0;
  player._forceHitTransition = false;
  player._holdForRiseActive = false;
  player._holdForRiseMinZ = undefined;
  player._holdForRiseTargetT = undefined;
  player._bounceRiseTarget = null;
  player._riseReadBounceId = -1;
  player._riseReadError = 0;
  player._urgentDeadBallPickup = false;
  player._pickupReadyNow = false;
  player._movementCanContactBall = false;
  player._movementCanExecutePlannedShot = false;
  player._movementContactClass = null;
  player._bounceReplanTimer = 0;
  player._movementCommit = null;
  player._approachAnchor = null;
  player._variedWaitXOffset = 0;
  player._variedWaitSeedShotX = undefined;
  player._variedWaitSeedRally = undefined;
  player._serveReturnFlightActive = false;
  player.ctx._readLaneX = undefined;
  player.ctx._readDepthY = undefined;
  player.ctx._anticipationWindow = 0;
  player.ctx._anticipationTowardMe = false;
  player.ctx._splitReadiness = 0;
  player.ctx._splitStepTimer = 0;
  player.ctx._firstStepBoostTimer = 0;
  player.ctx._lastSeenHitBy = null;
  player._postHitRecoveryTimer = 0;
}

// ------------------------------------------------------------------
// EXPORTAÇÃO PRINCIPAL
// ------------------------------------------------------------------

/**
 * updatePlayerMovement(player, gs, dt)
 *
 * Substitui updatePlayer() do ai.js para a lógica de posicionamento.
 * Legacy shot decision removed; movement remains only as spatial sensor.
 *
 * FASE 1 — esqueleto de v3:
 *   FSM, computeWaitTarget, computeMoveTarget (predY correto),
 *   computeRecoverTarget, give-up logic, stale _hitTarget guard,
 *   target smoothing, _predCrossX, Coach _positionBias.
 *
 * FASE 2 — eixos X/Y separados (de v2):
 *   WAIT e RECOVER ? applyWaitMovement (sem arco circular).
 *   MOVE ? applyMovementPhysics (vetor urgente ao intercept, unchanged).
 *   NaN/Infinity guards em ambas as funções de física.
 *
 * FASE 3 — rede e lob como funções puras (de v2):
 *   computeNetPos: distância da rede por prefs.netGame (HUNTER 2.2m ? AVOIDS 3.5m).
 *   computeTransitionPos: cobre ângulo via approachLandX.
 *   isRealLob / shouldRetreatFromLob: substituem bloco inline de lob.
 *
 * FASE 4 — split-step no rally (NOVO):
 *   Detecta quando adversário bate (lastHitBy muda) + vel > 1.5 m/s.
 *   Estado SPLITSTEP: vel *= 0.35 por frame durante 0.06–0.10s.
 *   Ao sair: footingState = 'planted' ? explosão da primeira passada.
 *
 * FASE 5 — altura de contato e sliding por surface (NOVO):
 *   CONTACT_Z_BY_CADENCE: EXPLOSIVE bate a 0.55m na subida, PATIENT a 1.00m no topo.
 *   slideCoeff por surface: CLAY ? raio ×1.5 + decel ×0.65; GRASS ? raio ×0.85 + decel ×1.2.
 */
export function updatePlayerMovement(player, gs, dt) {
  if (!dt || dt <= 0 || !isFinite(dt)) return;

  player._urgentDeadBallPickup = false;
  player._pickupReadyNow = false;

  const mods = player.mods;
  const currentIntent = player.ctx?.currentIntent ?? 'BUILD';
  const interceptProfile = buildMovementInterceptProfile(player, gs, {
    surface: gs.courtPhysics?.surface,
    currentIntent,
  });
  const readMemory = updateReadMemory(player, gs, interceptProfile);

  // -- Auto-retreat do net quando lobado ----------------------------
  // [FASE 3] Delega para shouldRetreatFromLob (função pura, de v2).
  // Antes: lógica inline + predictTrajectory extra todo frame.
  // Agora: isRealLob faz o gate rápido; shouldRetreatFromLob projeta o lob.
  if (shouldRetreatFromLob(player, gs)) {
    player.atNet = false;
    player.ctx.courtMode = 'BASE';
    player.ctx.transitionCooldown = 3;
    setLocomotionMode(player, 'LOB_RETREAT');
  }

  const netY = player.side * 2.8;
  const isLiveRallyState = gs.gameState === 'RALLY' || gs.gameState === 'SERVING';
  if (!isLiveRallyState) {
    player._serveReturnFlightActive = false;
    player._readPauseTime = 0;
    player._readDelayInit = false;
    player.ctx._splitStepTimer = 0;
    player._movementCommit = null;
    player._forceHitTransition = false;
  }

  // -- Retorno de saque: lógica especial ----------------------------
  const isServeFlight = gs.isFirstBounce && player.id === gs.receiver && gs.ball.inFlight;
  if (isServeFlight) {
    return handleServeReturn(player, gs, dt);
  } else {
    player._serveReturnFlightActive = false;
    player._readPauseTime = 0;
    player._readDelayInit = false;
  }

  // -- Post-hit fatigue: freeze breve com stamina baixa -------------
  if ((player.ctx._postHitPause ?? 0) > 0) {
    setLocomotionMode(player, 'POST_HIT_HOLD');
    player.ctx._postHitPause -= dt;
    player.vel.x *= 0.75;
    player.vel.y *= 0.75;
    player.pos.x += player.vel.x * dt;
    player.pos.y += player.vel.y * dt;
    return;
  }

  // -- TRANSITION ? NET: confirma rede ao chegar na net zone --------
  if (player.ctx?.courtMode === 'TRANSITION' && !player.atNet) {
    const netZoneY   = player.side * (COURT.halfL * 0.42);
    const reachedNet = player.side > 0
      ? player.pos.y <= netZoneY
      : player.pos.y >= netZoneY;
    if (reachedNet) {
      player.atNet = true;
      player.ctx.courtMode = 'NET';
      if (player.ctx.netPhase === 'BASE') player.ctx.netPhase = 'APPROACH';
    }
  }

  // -- basePos: fonte única de verdade ------------------------------
  // [FASE 3] Rede usa computeNetPos (distância por prefs.netGame).
  if (player.atNet) {
    const netPos     = computeNetPos(player, gs);
    player.basePos.x = netPos.x;
    player.basePos.y = netPos.y;
  } else {
    player.basePos.y = getStyleBaselineY(player);
  }

  // -- Invalidar predições pré-quique --------------------------------
  // Quando bounceCount sobe, _hitTarget e _arrivalMargin têm valores
  // pré-quique que fazem inHitWindow disparar prematuramente.
  const currBounce = gs.ball.bounceCount ?? 0;
  if (currBounce > (player._lastSeenBounce ?? 0)) {
    player._lastSeenBounce = currBounce;

    const prevArrivalMargin = player._arrivalMargin;
    const prevStableTarget = player._stableTarget
      ? { x: player._stableTarget.x, y: player._stableTarget.y, t: player._hitTarget?.t ?? undefined }
      : null;
    const prevHitTarget = player._hitTarget
      ? { ...player._hitTarget }
      : null;
    const ballComingToMe =
      ((player.side > 0 && gs.ball.vel.y > 0) || (player.side < 0 && gs.ball.vel.y < 0));
    const ballStillPlayable =
      ballComingToMe || Math.sign(gs.ball.pos.y) === player.side || Math.abs(gs.ball.pos.y) < 1.1;
    const continuityTarget = ballStillPlayable
      ? {
          x: clamp(gs.ball.pos.x, -COURT.singlesW / 2 + 0.2, COURT.singlesW / 2 - 0.2),
          y: clamp(
            gs.ball.pos.y + player.side * 0.18,
            player.side > 0 ? 0.35 : -COURT.halfL - 4.0,
            player.side > 0 ? COURT.halfL + 4.0 : -0.35,
          ),
          t: Math.max(0.06, Math.min(0.22, (prevHitTarget?.t ?? prevStableTarget?.t ?? 0.14))),
          _forceImmediate: true,
          _forceReplan: true,
        }
      : null;

    player._hitTarget = continuityTarget ?? null;
    player._arrivalMargin = continuityTarget
      ? Math.max(0.04, Math.min(0.18, prevArrivalMargin ?? 0.09))
      : undefined;
    player._stableTarget = continuityTarget
      ? { x: continuityTarget.x, y: continuityTarget.y }
      : null;
    player._predCrossX = continuityTarget?.x ?? undefined;
    player._bounceReplanTimer = continuityTarget ? 0.045 : 0;
    player._forceHitTransition = false;
    player._holdForRiseActive = false;
    player._holdForRiseMinZ = undefined;
    player._holdForRiseTargetT = undefined;
    player._contactPocketBehind = undefined;
    player._contactPocketSource = undefined;
    player._contactPoint = null;
    player._urgentDeadBallPickup = false;
    player._pickupReadyNow = false;
    player._movementCanContactBall = false;
    player._movementCanExecutePlannedShot = false;
    player._movementContactClass = null;
    // Fix overshoot: frear inércia no frame do quique para que o jogador não passe
    // voando pela bola antes de tryHit poder rodar no próximo frame.
    // Sem isso, o jogador continua em sprint e ultrapassa o ponto de contato,
    // fazendo tryHit nunca disparar mesmo com a bola no alcance.
    player.vel.x *= 0.50;
    player.vel.y *= 0.50;
  }

  if ((player._bounceReplanTimer ?? 0) > 0) {
    player._bounceReplanTimer = Math.max(0, player._bounceReplanTimer - dt);
  }

  // -- BOUNCE-RISE PRÉ-FSM: seta _holdForRiseActive antes de getMovementState --
  // Crucial: getMovementState lê _holdForRiseActive para decidir MOVE vs HIT.
  {
    const brProfile = buildMovementInterceptProfile(player, gs, {
      surface: gs.courtPhysics?.surface,
      currentIntent: player.ctx?.currentIntent ?? 'BUILD',
    });
    const brResult = computeBounceRiseTarget(player, gs, brProfile);
    if (brResult && brResult.blockHit) {
      player._holdForRiseActive = true;
      player._holdForRiseMinZ   = brProfile?.minContactZ ?? 0.54;
    } else if (!brResult) {
      player._holdForRiseActive = false;
    }
    // Cachear para computeMoveTarget reutilizar (evita double build)
    player._cachedBrProfile = brProfile;
    player._cachedBrResult  = brResult;
  }

  // -- FSM ----------------------------------------------------------
  const state     = getMovementState(player, gs);
  const prevState = player._prevMovState;
  player._movState     = state;
  player._prevMovState = state;
  if (state !== 'WAIT') {
    player._variedWaitSeedShotX = undefined;
    player._variedWaitSeedRally = undefined;
  } else {
    const waitSeedShotX = player.ctx?._lastShotX ?? 0;
    const waitSeedRally = gs.rally ?? 0;
    if (
      prevState !== 'WAIT'
      || player._variedWaitSeedRally !== waitSeedRally
      || Math.abs((player._variedWaitSeedShotX ?? 999) - waitSeedShotX) > 0.18
    ) {
      const adaptability = player.prefs?.adaptability ?? 60;
      player._variedWaitXOffset = gauss(0, 0.12 + (adaptability / 100) * 0.08);
      player._variedWaitSeedShotX = waitSeedShotX;
      player._variedWaitSeedRally = waitSeedRally;
    }
  }

  // -- [FASE 4] Split-step: detecta quando adversário bate ----------
  // Quando lastHitBy muda (adversário acabou de bater) e o jogador está
  // em movimento razoável, inicia o split-step: freio brusco de 0.06–0.10s
  // seguido de footingState='planted' para a explosão da primeira passada.
  const lastHitBy     = gs.ball.lastHitBy;
  const oppJustHit    = lastHitBy !== player.id
                      && lastHitBy !== (player.ctx._lastSeenHitBy ?? null);
  player.ctx._lastSeenHitBy = lastHitBy;

  if (oppJustHit && (state === 'WAIT' || state === 'RECOVER')) {
    const currSpd = Math.sqrt(player.vel.x ** 2 + player.vel.y ** 2);
    if (currSpd > 1.1 || !!readMemory?.towardPlayer) {
      const dur = player.prefs ? ({
        EXPLOSIVE:    0.06,
        EARLY_ATTACK: 0.07,
        BALANCED:     0.08,
        MEASURED:     0.09,
        PATIENT:      0.10,
      }[player.prefs.rallyCadence] ?? 0.08) : 0.08;
      const readinessMult = state === 'RECOVER' ? 0.65 : 1.0;
      player.ctx._splitStepTimer = dur;
      player.ctx._splitReadiness = clamp(
        (
          0.48
          + (readMemory?.towardPlayer ? 0.18 : 0)
          + (interceptProfile?.anticipationBias ?? 0) * 0.55
          + Math.min(currSpd, 5.2) * 0.035
        ) * readinessMult,
        0.42,
        0.96,
      );
    }
  }

  // Timer tick do split-step
  if ((player.ctx._splitStepTimer ?? 0) > 0) {
    player.ctx._splitStepTimer = Math.max(0, player.ctx._splitStepTimer - dt);
    if (player.ctx._splitStepTimer === 0) {
      // Saiu do split-step ? explosão da primeira passada
      player.ctx._footingState = 'planted';
      player.ctx._footingTimer = 0.08;
      player.ctx._firstStepBoostTimer = clamp(0.08 + (player.ctx._splitReadiness ?? 0) * 0.05, 0.08, 0.14);
    }
  }
  if ((player.ctx._firstStepBoostTimer ?? 0) > 0) {
    player.ctx._firstStepBoostTimer = Math.max(0, player.ctx._firstStepBoostTimer - dt);
  }
  if ((player.ctx._splitReadiness ?? 0) > 0 && (player.ctx._splitStepTimer ?? 0) <= 0) {
    player.ctx._splitReadiness = Math.max(0, player.ctx._splitReadiness - dt * 2.6);
  }
  if ((player._postHitRecoveryTimer ?? 0) > 0) {
    player._postHitRecoveryTimer = Math.max(0, player._postHitRecoveryTimer - dt);
  }

  // Snapshot do recover target na transição ? RECOVER (não recalcular frame-a-frame)
  if (state === 'RECOVER' && prevState !== 'RECOVER') {
    snapshotRecoverTarget(player, gs);
  }
  if (state === 'WAIT') {
    player._recoverTarget = null;
    player._recoverTargetRally = null;
    player._recoverTargetLastShotX = null;
    player._movementCommit = null;
    player._forceHitTransition = false;
  }

  // -- Target bruto por estado ---------------------------------------
  let rawTarget;

  if (state === 'WAIT') {
    rawTarget = computeWaitTarget(player, gs);
    if (readMemory?.towardPlayer && (player.ctx?._anticipationWindow ?? 0) > 0.05) {
      const anticipT = clamp((player.ctx._anticipationWindow ?? 0.08) * (interceptProfile?.readCommitStrength ?? 0.5), 0.04, 0.14);
      rawTarget = {
        ...rawTarget,
        x: blendScalar(rawTarget.x, readMemory.laneX, anticipT),
        y: blendScalar(rawTarget.y, readMemory.depthY, anticipT * 0.82),
      };
    }

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
      const inertiaPenalty = computeInterceptInertiaPenalty(player, moveTarget);
      player._bodyInertiaPenalty = inertiaPenalty;
      player._arrivalMargin = moveTarget.t - d / (effSpeed || 0.1) - inertiaPenalty;
      player._predCrossX    = moveTarget.x ?? player.pos.x;
    } else {
      player._arrivalMargin = undefined;
      player._bodyInertiaPenalty = 0;
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
        if ((player._contactPocketBehind ?? 0.45) > 0.12) {
          const pocketBlend = blend * (useVolleyAdj ? 0.22 : 0.18);
          const pocketY = gs.ball.pos.y + player.side * clamp((player._contactPocketBehind ?? 0.45) * 0.68, 0.14, 0.55);
          rawTarget.y = rawTarget.y * (1 - pocketBlend) + pocketY * pocketBlend;
        }
      }
    }

    const reachNow = player.reach ?? 0.85;
    const lateralNow = Math.abs(player.pos.x - gs.ball.pos.x);
    const depthNow   = Math.abs(player.pos.y - gs.ball.pos.y);
    const distNow = Math.sqrt(
      (player.pos.x - gs.ball.pos.x) ** 2 + (player.pos.y - gs.ball.pos.y) ** 2
    );
    const staleCross = Number.isFinite(player._predCrossX)
      ? Math.abs(player._predCrossX - gs.ball.pos.x) > reachNow * 0.95
      : false;
    const overshootLateral = Math.abs(player.vel?.x ?? 0) > 0.45
      && (gs.ball.pos.x - player.pos.x) * (player.vel?.x ?? 0) < -0.04;
    const overshootDepth = Math.abs(player.vel?.y ?? 0) > 0.45
      && (gs.ball.pos.y - player.pos.y) * (player.vel?.y ?? 0) < -0.04;
    const holdForRiseActive = !!player._holdForRiseActive
      && gs.ball.pos.z < (player._holdForRiseMinZ ?? 0.64)
      && gs.ball.pos.z > 0.18
      && (gs.ball.vel?.z ?? 0) > -0.35
      && (player._arrivalMargin ?? 0.3) > -0.05;
    const mandatoryForwardPickup =
      !!player._urgentDeadBallPickup &&
      (gs.ball.bounceCount ?? 0) >= 1 &&
      gs.ball.pos.z >= 0.10 &&
      gs.ball.pos.z <= 1.02 &&
      distNow < reachNow * 3.25 &&
      lateralNow < reachNow * 1.42 &&
      depthNow < reachNow * 3.35 &&
      !holdForRiseActive;
    const pickupReadyNow = !!player._pickupReadyNow;
    const emergencyContactWindow =
      (gs.ball.bounceCount ?? 0) >= 1 &&
      gs.ball.pos.z >= 0.16 &&
      gs.ball.pos.z <= 1.45 &&
      lateralNow < reachNow * 1.18 &&
      depthNow < reachNow * 2.6 &&
      !holdForRiseActive;

    if (mandatoryForwardPickup && !pickupReadyNow) {
      const urgentBehind = clamp((player._contactPocketBehind ?? 0.22) * 0.24, 0.02, 0.10);
      const urgentY = gs.ball.pos.y + player.side * urgentBehind;
      rawTarget.x = blendScalar(rawTarget.x, gs.ball.pos.x, 0.90);
      rawTarget.y = blendScalar(rawTarget.y, urgentY, 0.88);
      rawTarget._forceImmediate = true;
      rawTarget._forceReplan = true;
      player._predCrossX = gs.ball.pos.x;
      player._forceHitTransition = true;
      player._stableTarget = null;
      if ((player._arrivalMargin ?? -0.2) < 0.08) {
        player._arrivalMargin = 0.08;
      }
      if (overshootLateral) player.vel.x *= 0.34;
      if (overshootDepth) player.vel.y *= 0.44;
    }

    if (emergencyContactWindow) {
      rawTarget.x = gs.ball.pos.x;
      rawTarget.y = gs.ball.pos.y + player.side * clamp((player._contactPocketBehind ?? 0.34) * 0.45, 0.12, 0.30);
      rawTarget._forceImmediate = true;
      player._predCrossX = gs.ball.pos.x;
      player._forceHitTransition = true;
      if (staleCross) player._stableTarget = null;
      if ((player._arrivalMargin ?? -0.2) < 0.02) {
        player._arrivalMargin = 0.02;
      }
      if (overshootLateral) player.vel.x *= 0.38;
      if (overshootDepth) player.vel.y *= 0.50;
    }

    const liveReplanWindow =
      (gs.ball.bounceCount ?? 0) >= 1 &&
      gs.ball.pos.z >= 0.14 &&
      gs.ball.pos.z <= 1.48 &&
      lateralNow < reachNow * 2.10 &&
      depthNow < reachNow * 4.00 &&
      (
        staleCross
        || overshootLateral
        || overshootDepth
        || mandatoryForwardPickup
        || ((player._arrivalMargin ?? 0.3) < 0.10 && Math.abs(gs.ball.vel.y) < 6.8)
      ) &&
      !holdForRiseActive;

    if (liveReplanWindow) {
      const pocketY = gs.ball.pos.y + player.side * clamp((player._contactPocketBehind ?? 0.34) * 0.52, 0.10, 0.28);
      rawTarget.x = blendScalar(rawTarget.x, gs.ball.pos.x, 0.78);
      rawTarget.y = blendScalar(rawTarget.y, pocketY, 0.72);
      rawTarget._forceImmediate = true;
      rawTarget._forceReplan = true;
      player._predCrossX = gs.ball.pos.x;
      player._forceHitTransition = true;
      player._stableTarget = null;
      if ((player._arrivalMargin ?? -0.2) < 0.05) {
        player._arrivalMargin = 0.05;
      }
      if (overshootLateral) player.vel.x *= 0.42;
      if (overshootDepth) player.vel.y *= 0.56;
    }

    if ((player._arrivalMargin ?? 0.3) < 0.18) {
      const footworkWindow = clamp((0.18 - (player._arrivalMargin ?? 0.18)) / 0.18, 0, 1);
      const lateralFootwork = clamp(Math.abs(gs.ball.pos.x - player.pos.x) / Math.max(player.reach ?? 0.85, 0.45), 0, 1.4);
      const pocketLift = clamp((player._contactPocketBehind ?? 0.24) * (0.34 + footworkWindow * 0.18), 0.04, 0.18);
      rawTarget.x = blendScalar(rawTarget.x, gs.ball.pos.x, 0.18 + footworkWindow * 0.28);
      rawTarget.y = blendScalar(
        rawTarget.y,
        gs.ball.pos.y + player.side * pocketLift,
        0.16 + footworkWindow * (0.20 + Math.min(lateralFootwork, 1) * 0.12),
      );
    }

  } else if (state === 'SPLITSTEP') {
    // [FASE 4] Congela posição — freio brusco enquanto lê o adversário
    rawTarget = { x: player.pos.x, y: player.pos.y };

  } else if (state === 'HIT') {
    player._forceHitTransition = false;
    rawTarget = { x: player.pos.x, y: player.pos.y };

  } else { // RECOVER
    player._forceHitTransition = false;
    if (isRecoverTargetStale(player, gs)) {
      snapshotRecoverTarget(player, gs);
    }
    rawTarget = player._recoverTarget ?? computeRecoverTarget(player, gs);
    if ((player._postHitRecoveryTimer ?? 0) > 0) {
      rawTarget = {
        x: blendScalar(player.pos.x, rawTarget.x, 0.72),
        y: blendScalar(player.pos.y, rawTarget.y, 0.66),
      };
    }
  }

  // -- Give-up: apenas para bolas inalcançáveis (>1s atrasado) ------
  if (state === 'MOVE') {
    const ballSpd3d  = Math.sqrt(gs.ball.vel.x**2 + gs.ball.vel.y**2 + gs.ball.vel.z**2);
    const isSlowBall = ballSpd3d < 7.0 && gs.ball.bounceCount >= 1;
    const giveUpThr  = isSlowBall ? INERTIA.giveUpMargin + 0.40 : INERTIA.giveUpMargin + 0.06;
    const arrivalFGU = player._arrivalMargin ?? 0;
    if (arrivalFGU < giveUpThr && (gs.ball.inFlight || (gs.ball.bounceCount > 0 && Math.abs(gs.ball.vel.y) > 0.3))) {
      const comingToMe = (player.side > 0 && gs.ball.vel.y > 0) || (player.side < 0 && gs.ball.vel.y < 0);
      const distToBall = Math.sqrt((player.pos.x - gs.ball.pos.x)**2 + (player.pos.y - gs.ball.pos.y)**2);
      const playerBehindBaseline = Math.abs(player.pos.y) > COURT.halfL + 0.05;
      const liveRallyBall = (gs.ball.bounceCount ?? 0) >= 1 || !!gs.serveBounced;
      const shouldSuppressGiveUp = playerBehindBaseline && comingToMe && liveRallyBall;
      if (!shouldSuppressGiveUp && comingToMe && distToBall > (player.reach ?? 1.5) * 4.0) {
        rawTarget.x = clamp(rawTarget.x, player.pos.x - 1.5, player.pos.x + 1.5);
        rawTarget.y = player.basePos.y;
      }
    }
  }

  // -- Bisector X de recovery em WAIT -------------------------------
  if (state === 'WAIT' && gs.players) {
    const ballOnOppSide = Math.sign(gs.ball.pos.y) !== player.side;
    const cMode = player.ctx.courtMode ?? 'BASE';
    if (ballOnOppSide && !player.atNet && cMode === 'BASE') {
      const lastShotX  = player.ctx._lastShotX ?? 0;
      player.basePos.x = clamp(lastShotX * 0.45 + getWingRecoverBias(player), -1.8, 1.8);
    }
  }

  // -- [FASE 4] SPLITSTEP: freio brusco, planta os pés -------------
  // vel *= 0.35 por frame — para em ~0.06-0.10s. Ao sair,
  // footingState já foi setado para 'planted' no timer tick acima.
  const movementLogSignature = [
    state,
    player._movementContactClass ?? 'NONE',
    player.ctx?.courtMode ?? 'BASE',
    player._forceHitTransition ? 'F' : 'N',
    rawTarget?._forceImmediate ? 'I' : 'S',
    player._contactPocketSource ?? 'none',
  ].join('|');
  if (movementLogSignature !== player._lastMovementLogSignature) {
    logMovementState(gs, player, {
      prevState,
      state,
      target: rawTarget,
    });
    player._lastMovementLogSignature = movementLogSignature;
  }

  if (state === 'SPLITSTEP') {
    setLocomotionMode(player, 'SPLITSTEP');
    player.vel.x *= 0.35;
    player.vel.y *= 0.35;
    player.pos.x += player.vel.x * dt;
    player.pos.y += player.vel.y * dt;
    return;
  }

  // -- HIT: planta os pés -------------------------------------------
  if (state === 'HIT') {
    setLocomotionMode(player, 'HIT_PLANT');
    player.vel.x *= 0.25;
    player.vel.y *= 0.25;
    player.pos.x += player.vel.x * dt;
    player.pos.y += player.vel.y * dt;
    return;
  }

  // -- WAIT / RECOVER / BOUNCE-RISE: eixos X/Y separados [FASE 2] --
  // Bounce-rise também usa eixos separados: o jogador se move em linha reta
  // ao ponto de rise, sem arco diagonal. X (lateral) e Y (profundidade)
  // são independentes — exatamente o comportamento do tênis real.
  if (state === 'WAIT' || state === 'RECOVER' || player._holdForRiseActive) {
    // Frear inércia ao entrar no bounce-rise para não carregar momentum errado
    if (player._holdForRiseActive && rawTarget?._forceReplan) {
      player.vel.x *= 0.35;
      player.vel.y *= 0.35;
    }
    applyWaitMovement(player, rawTarget, dt, state === 'WAIT' || state === 'RECOVER' ? state : 'MOVE');
    return;
  }

  // -- MOVE: smoothing + physics -------------------------------------
  const margin = player._arrivalMargin ?? 0.3;
  updateMovementCommit(player, rawTarget, margin, state);
  const target = rawTarget?._forceImmediate
    ? { x: rawTarget.x, y: rawTarget.y }
    : applyTargetSmoothing(player, rawTarget, margin);

  const staminaFrac = player.stamina ?? 1.0;
  const baseSpeed   = player.playerSpeed || PLAYER_CFG.speed;
  const physMaxSpd  = baseSpeed * (STAMINA.speedMinFactor + staminaFrac * (1 - STAMINA.speedMinFactor));
  const maxSpd      = getMoveSpeed(player, target, margin, physMaxSpd);

  applyMovementPhysics(player, target, maxSpd, dt, gs);
}



