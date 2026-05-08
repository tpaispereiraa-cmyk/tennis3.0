import { COURT, THRESHOLDS, PLAYER_CFG, STAMINA, INERTIA, MOVEMENT, GameState } from '../../core/constants.js';
import { clamp, dist2 } from '../../core/math.js';
import { predictTrajectory } from '../../core/physics.js';
import { NETPLAY_THRESHOLDS } from './netplayThresholds.js';

// Helper PT-BR:
// Escala de "vontade de rede". Quanto maior, mais cedo o jogador tenta transicionar.
const NET_AFFINITY = Object.freeze({
  AVOIDS: 0.10,
  RELUCTANT: 0.28,
  OPPORTUNIST: 0.50,
  PROACTIVE: 0.72,
  HUNTER: 0.90,
});

// Helper PT-BR:
// Altura de contato preferida por ritmo de rally. Cadência agressiva pega a bola mais cedo/baixa.
const CONTACT_Z_BY_CADENCE = Object.freeze({
  PATIENT: 1.02,
  MEASURED: 0.94,
  BALANCED: 0.88,
  EARLY_ATTACK: 0.82,
  EXPLOSIVE: 0.76,
});

// Helper PT-BR:
// Lê o estilo de rede do jogador e converte para afinidade numérica.
function getNetAffinity(player) {
  const key = player?.prefs?.netGame;
  return NET_AFFINITY[key] ?? 0.50;
}

// Helper PT-BR:
// Resolve o modo de quadra atual da IA (BASE / TRANSITION / NET).
function getCourtMode(player) {
  return player?.ctx?.courtMode ?? (player?.atNet ? 'NET' : 'BASE');
}

// Helper PT-BR:
// Inteligência de retorno de saque: lê padrões recentes do sacador e ajusta
// posicionamento lateral/profundidade do recebedor (sem hard-lock).
function getServeReturnAdaptiveBias(player, gs) {
  return { x: 0, y: 0, confidence: 0 };
}

// Helper PT-BR:
// Altura de contato: combina cadência + leitura + perfil de rede.
// Subir leitura melhora ajuste fino; subir netAffinity puxa para contato mais cedo.
function getPreferredContactZ(player) {
  const cadence = player?.prefs?.rallyCadence;
  const base = CONTACT_Z_BY_CADENCE[cadence] ?? 0.88;
  const leitura = player?.attrs?.leitura ?? 60;
  const netAffinity = getNetAffinity(player);
  const readAdj = (clamp(leitura, 30, 99) - 60) * 0.0018;
  const netAdj = (netAffinity - 0.5) * -0.12;
  return clamp(base + readAdj + netAdj, 0.72, 1.06);
}

// Helper PT-BR:
// Profundidade padrão de base. Valor maior = mais atrás; menor = mais dentro da quadra.
function getBaselineDepth(player) {
  const aggr = player?.attrs?.visaoTatica ?? player?.attrs?.agressividade ?? 60;
  const leitura = player?.attrs?.leitura ?? 60;
  const netAffinity = getNetAffinity(player);
  const aggrInsideBias = clamp((aggr - 55) / 45, 0, 1) * 0.34;
  const readBackBias = clamp((leitura - 50) / 50, 0, 1) * 0.20;
  const baselinePlayerBias = (1 - netAffinity) * 0.52;
  return clamp(0.32 + baselinePlayerBias + readBackBias - aggrInsideBias, 0.20, 1.10);
}

// Helper PT-BR:
// Base X/Y do jogador por estado tático:
// - BASE: referência de fundo.
// - TRANSITION: corrida de approach (meia quadra ofensiva).
// - NET: guarda de rede para 1º voleio/fechamento.
function computeBaseTarget(player, gs) {
  const netAffinity = getNetAffinity(player);
  const courtMode = getCourtMode(player);
  const side = player.side > 0 ? 1 : -1;
  const baseDepth = getBaselineDepth(player);
  const baseY = side * (COURT.halfL + baseDepth);
  const lateralMemoryBias = 0;
  const yClampMin = side > 0 ? 0.55 : -COURT.halfL - THRESHOLDS.outerPlayerY;
  const yClampMax = side > 0 ? COURT.halfL + THRESHOLDS.outerPlayerY : -0.55;

  let targetY = baseY;
  // Helper PT-BR:
  // Em transição, mira a zona ofensiva entre serviço e rede. A qualidade do approach
  // define o quão agressivo pode ser o avanço.
  if (courtMode === 'TRANSITION') {
    const approachQ = 0.5;
    const yFraction = clamp(0.44 - approachQ * 0.16, 0.28, 0.44);
    targetY = side * (COURT.halfL * yFraction);
  } else if (player.atNet || courtMode === 'NET') {
    // Helper PT-BR:
    // Guarda de rede: jogador estabiliza perto da rede, com pequena variação por estilo.
    targetY = side * clamp(2.35 + (1 - netAffinity) * 0.85, 2.1, 3.4);
  }

  let lateralBaseBand = clamp(
    COURT.singlesW / 2 + 0.55 + (1 - netAffinity) * 0.45,
    COURT.singlesW / 2 + 0.45,
    COURT.halfW + 0.80,
  );
  let laneX = clamp((gs?.ball?.pos?.x ?? 0) * (0.24 + netAffinity * 0.18) + lateralMemoryBias, -lateralBaseBand, lateralBaseBand);
  if (courtMode === 'TRANSITION') {
    // Helper PT-BR:
    // Cobre o corredor do approach usando memória de onde a bola foi enviada.
    const approachLandX = player?.ctx?._approachLandX ?? 0;
    laneX = clamp(laneX * 0.58 + approachLandX * 0.42, -2.2, 2.2);
  } else if (courtMode === 'NET') {
    // Helper PT-BR:
    // Na rede estreita a banda lateral para não "abrir" demais o ângulo de passe.
    lateralBaseBand = clamp(COURT.singlesW / 2 + 0.18, COURT.singlesW / 2, COURT.halfW + 0.35);
    laneX = clamp(laneX, -lateralBaseBand, lateralBaseBand);
  }

  // Inteligência adaptativa no retorno: reposiciona recebedor conforme leitura do saque.
  const returnBias = getServeReturnAdaptiveBias(player, gs);
  if (returnBias.confidence > 0) {
    laneX = clamp(laneX + returnBias.x, -lateralBaseBand, lateralBaseBand);
    targetY += player.side * returnBias.y;
    player._returnAdaptiveBias = returnBias;
  } else {
    player._returnAdaptiveBias = { x: 0, y: 0, confidence: 0 };
  }
  return { x: laneX, y: clamp(targetY, yClampMin, yClampMax) };
}

// Helper PT-BR:
// Janela ideal de contato para o preditor de trajetória.
function buildInterceptProfile(player) {
  const prefZ = getPreferredContactZ(player);
  const leitura = clamp(player?.attrs?.leitura ?? 60, 35, 99);
  const netAffinity = getNetAffinity(player);
  const courtMode = getCourtMode(player);
  const isDefensive = (player?.ctx?.currentIntent ?? 'BUILD') === 'RESET';
  const ballZ = player?._movementBallZHint ?? prefZ;
  const lowBallContext = ballZ < prefZ - 0.12 ? 0.05 : 0;
  // Jogadores com mais leitura conseguem esperar mais e bater mais alto
  // leitura 99 → minZ = prefZ - 0.14 | leitura 35 → minZ = prefZ - 0.24
  const readAdj = (leitura - 60) * 0.0016;
  const styleAdj = (0.5 - netAffinity) * 0.06;
  const modeAdj = courtMode === 'NET' || courtMode === 'TRANSITION' ? 0.02 : 0;
  const defenseAdj = isDefensive ? -0.03 : 0;
  // FIX: chão reduzido de 0.60 → 0.46 e janela ampliada de prefZ-0.20 → prefZ-0.34.
  // Antes, minZ≈0.68m bloqueava hitting em bolas subindo abaixo disso (flat/drive
  // típico que só sobe até 0.50–0.65m). Contato a 0.46–0.55m é normal no tênis real.
  // BALANCED (prefZ=0.88): minZ=0.54 | EXPLOSIVE (0.76): minZ=0.46 | PATIENT (1.02): minZ=0.68
  const minZFloor = 0.46 + styleAdj + defenseAdj - lowBallContext;
  return {
    preferredContactZ: prefZ,
    minContactZ: clamp(prefZ - 0.34 + readAdj + modeAdj, minZFloor, 0.94),
    maxContactZ: clamp(prefZ + 0.56, 1.18, 1.70),
    contactBand: clamp(0.24 + (player?.attrs?.controle ?? 60) * 0.0012, 0.22, 0.36),
    yTolerance: 0.90,
    delayBand: 0.42,
    riseBonus: 0.55,      // era 0.42: reforça preferência por bola subindo
    fallPenalty: 0.22,    // era 0.14: penaliza mais bater na descida
    lowBallBonus: -0.28,  // era -0.18: penaliza mais bater baixo
  };
}

// Helper PT-BR:
// Verifica se a bola está vindo na direção do jogador.
function ballIsComingToPlayer(player, ball) {
  if (!ball?.vel) return false;
  return player.side > 0 ? ball.vel.y > 0.02 : ball.vel.y < -0.02;
}

// Helper PT-BR:
// Verifica se a bola já está na metade do jogador (ou muito próxima da rede).
function ballOnPlayerHalf(player, ball) {
  if (!ball?.pos) return false;
  return Math.abs(ball.pos.y) < 0.70 || Math.sign(ball.pos.y) === player.side;
}

// Helper PT-BR:
// "Lane" de interceptação em Y: quanto maior afinidade de rede, mais cedo ataca a bola.
function estimateContactLaneY(player, baseY) {
  const side = player.side > 0 ? 1 : -1;
  const netAffinity = getNetAffinity(player);
  const laneShift = 0.22 + netAffinity * 1.35;
  return baseY - side * laneShift;
}

// Helper PT-BR:
// Planeja o ponto de contato (x/y/z/t) com fallback robusto para quando a predição não fecha.
function computeContactPlan(player, gs, baseTarget) {
  const ball = gs.ball;
  player._movementBallZHint = ball?.pos?.z ?? undefined;
  const side = player.side > 0 ? 1 : -1;
  const courtMode = getCourtMode(player);
  const netAffinity = getNetAffinity(player);
  const netPressMode = (player.atNet || courtMode === 'NET' || courtMode === 'TRANSITION') && netAffinity >= 0.62;
  const profile = buildInterceptProfile(player);
  const targetY = estimateContactLaneY(player, baseTarget.y);
  const airDensity = gs.environment?.airDensity;
  const traj = predictTrajectory(ball, targetY, 2.6, airDensity, gs.courtPhysics, profile);

  const fallbackY = clamp(
    targetY,
    side > 0 ? 0.65 : -COURT.halfL - THRESHOLDS.outerPlayerY,
    side > 0 ? COURT.halfL + THRESHOLDS.outerPlayerY : -0.65,
  );

  let point = null;
  let phase = 'TRAVEL';
  

  if (traj?.optimalHitPoint) {
    point = traj.optimalHitPoint;
  } else if (traj?.crossPoint) {
    point = traj.crossPoint;
  } else if (traj?.landPoint) {
    point = {
      x: traj.landPoint.x,
      y: traj.landPoint.y + side * 0.68,
      z: profile.preferredContactZ,  // era minContactZ — agora aponta para altura ideal
      t: traj.landPoint.t + 0.32,    // era +0.24 — mais tempo para subir
    };
    phase = 'COMMIT';
  } else {
    point = {
      x: ball.pos.x,
      y: fallbackY,
      z: profile.preferredContactZ,  // era minContactZ
      t: 0.38,
    };
  }

  // Net players should prioritize aerial interception instead of drifting into bounce-runback.
  if (netPressMode && (ball.bounceCount ?? 0) === 0) {
    const volleyCutY = side * clamp(NETPLAY_THRESHOLDS.NET_CUT_BASE_Y + (1 - netAffinity) * NETPLAY_THRESHOLDS.NET_CUT_STYLE_DELTA,
      NETPLAY_THRESHOLDS.NET_CUT_MIN_Y,
      NETPLAY_THRESHOLDS.NET_CUT_MAX_Y);
    if (traj?.optimalHitPoint) {
      point = {
        x: point.x,
        y: side > 0 ? Math.min(point.y, volleyCutY) : Math.max(point.y, volleyCutY),
        z: Math.max(point.z ?? profile.preferredContactZ, profile.minContactZ + 0.04),
        t: clamp((point.t ?? 0.22) - NETPLAY_THRESHOLDS.NET_CUT_TIME_PULL_OPTIMAL, 0.06, 0.95),
      };
      phase = 'NET_CUT';
    } else if (traj?.crossPoint) {
      point = {
        x: point.x,
        y: side > 0 ? Math.min(point.y, volleyCutY) : Math.max(point.y, volleyCutY),
        z: Math.max(point.z ?? profile.preferredContactZ, profile.minContactZ + 0.04),
        t: clamp((point.t ?? 0.26) - NETPLAY_THRESHOLDS.NET_CUT_TIME_PULL_CROSS, 0.08, 1.00),
      };
      phase = 'NET_CUT';
    }
  }

  // Verifica se a bola vai pousar no lado do jogador — independente de targetY
  // Bug fix: landingOnMyHalf era falso quando landPoint estava além de targetY
  const landingOnMyHalf = traj?.landPoint && (
    Math.abs(traj.landPoint.y) < 0.70
    || Math.sign(traj.landPoint.y) === side
    // também cobre o caso onde a bola ainda não cruzou mas o landPoint está no lado
    || (side > 0 ? traj.landPoint.y > 0 : traj.landPoint.y < 0)
  );
  if (landingOnMyHalf) {
    const netAffinity = getNetAffinity(player);
    const behindLandDist = clamp(1.05 + (1 - netAffinity) * 1.20, 1.00, 2.20);
    const runbackY = traj.landPoint.y + side * behindLandDist;

    // Bug fix: tooCloseToBounce deve medir distância em Y relativa ao jogador,
    // não só entre point.y e landPoint.y (que pode passar com 0.5m mas ainda ser no chão)
    const distFromLandInY = Math.abs(point.y - traj.landPoint.y);
    const tooCloseToBounce = distFromLandInY < 0.90;

    // Bug fix: tooLowContact comparava com preferredContactZ - 0.13, muito permissivo
    const tooLowContact = (point.z ?? profile.minContactZ) < profile.preferredContactZ - 0.06;

    const rushedTiming = (point.t ?? 0.28) < 0.23;
    const freshRisingBounce = (ball.bounceCount ?? 0) >= 1
      && ball.lastBounceSide === side
      && ball.vel.z > 0.01
      && ball.pos.z < profile.minContactZ + 0.10;

    // RUNBACK também ativa se a bola ainda está em voo vindo para o jogador
    // e o optimalHitPoint ficou perto demais do ponto de quique previsto
    const ballStillInFlight = (ball.bounceCount ?? 0) === 0 && ball.lastHitBy !== player.id;
    const optimalTooRushed = ballStillInFlight && traj?.optimalHitPoint
      && traj.landPoint
      && Math.abs(traj.optimalHitPoint.y - traj.landPoint.y) < 1.10;

    // Bola curta/lenta no mesmo lado: não deve acionar runback.
    // Nesses casos, o comportamento realista é entrar na bola e bloquear/chipar.
    const isShortLanding = traj?.landPoint ? Math.abs(traj.landPoint.y) < (COURT.serviceLineY + 1.8) : false;
    const ballSpeed2D = Math.hypot(ball?.vel?.x ?? 0, ball?.vel?.y ?? 0);
    // FIX: threshold aumentado de 3.0 → 7.0 m/s (~25 km/h). Com 3.0 m/s (~11 km/h),
    // qualquer bola moderada não era "soft" → shortSoftCatchable=false → runback em bola fácil.
    const softAfterBounce = (ball.bounceCount ?? 0) >= 1 && ballSpeed2D < 7.0 && (ball?.pos?.z ?? 0) < profile.preferredContactZ + 0.30;
    const landDistToPlayer = traj?.landPoint ? Math.hypot((traj.landPoint.x - player.pos.x), (traj.landPoint.y - player.pos.y)) : 99;
    const liveBallDistToPlayer = Math.hypot((ball?.pos?.x ?? 0) - player.pos.x, (ball?.pos?.y ?? 0) - player.pos.y);
    const nearCatchWindow = (point?.t ?? 0.30) <= 0.46 && landDistToPlayer <= 2.7;
    const shortSoftCatchable = isShortLanding && softAfterBounce && nearCatchWindow;
    const lowSkidBall = (ball.bounceCount ?? 0) >= 1
      && ballSpeed2D < 8.8
      && (ball?.pos?.z ?? 0) < Math.min(profile.preferredContactZ + 0.22, 1.02);
    const playerAlreadyAtPickup = liveBallDistToPlayer <= Math.max((player.reach ?? PLAYER_CFG.reach) * 1.75, 1.45);
    const easyPostBouncePickup = lowSkidBall && playerAlreadyAtPickup;
    const easyHighBounceBall = (ball.bounceCount ?? 0) >= 1
      && ball.lastBounceSide === side
      && ballSpeed2D < 10.8
      && (ball?.vel?.z ?? 0) > -0.12
      && (ball?.pos?.z ?? 0) >= Math.max(profile.preferredContactZ - 0.04, 1.00)
      && (ball?.pos?.z ?? 0) <= 3.25;
    const playerUnderHighBounce = liveBallDistToPlayer <= Math.max((player.reach ?? PLAYER_CFG.reach) * 1.55, 1.30)
      && Math.abs((ball?.pos?.x ?? 0) - player.pos.x) <= 0.95;
    const easyHighBouncePickup = easyHighBounceBall && playerUnderHighBounce;
    const easyBounceAttackBall = (ball.bounceCount ?? 0) >= 1
      && ball.lastBounceSide === side
      && ball.lastHitBy !== player.id
      && ballSpeed2D < 11.4
      && (ball?.pos?.z ?? 0) <= Math.max(profile.preferredContactZ + 0.45, 1.45)
      && Math.abs((ball?.pos?.x ?? 0) - player.pos.x) <= 1.15
      && Math.abs((ball?.pos?.y ?? 0) - player.pos.y) <= 2.10;
    const hardForwardPickup = easyPostBouncePickup || easyHighBouncePickup || easyBounceAttackBall;

    // FIX: pesos reduzidos para condições que disparam em bolas normais:
    // freshRisingBounce: 0.24→0.08  (bola subindo é normal, não é motivo de runback)
    // tooLowContact:     0.26→0.10  (bola abaixo da altura ideal ≠ precisa recuar)
    // Antes: freshRisingBounce+tooLowContact = 0.50 → quase qualquer quique ativava runback.
    // Agora: 0.18 → só aciona com combinação de múltiplos fatores ruins reais.
    const runbackRawScore = clamp(
      (tooCloseToBounce ? 0.30 : 0)
      + (tooLowContact ? 0.10 : 0)
      + (rushedTiming ? 0.20 : 0)
      + (freshRisingBounce ? 0.08 : 0)
      + (optimalTooRushed ? 0.18 : 0),
      0,
      1,
    );
    const prevRunbackScore = player?._tm?.runbackScore ?? 0;
    const runbackScore = hardForwardPickup
      ? 0
      : clamp(prevRunbackScore * 0.74 + runbackRawScore * 0.58, 0, 1);
    if (player?._tm) player._tm.runbackScore = runbackScore;
    const afterFirstBounceOnMySide = (ball.bounceCount ?? 0) >= 1
      && ball.lastBounceSide === side
      && ball.lastHitBy !== player.id;
    const runbackTrigger = !afterFirstBounceOnMySide
      && !hardForwardPickup
      && !shortSoftCatchable
      && !easyPostBouncePickup
      && !easyHighBouncePickup
      && (runbackScore > 0.52 || (prevRunbackScore > 0.60 && runbackScore > 0.40));
    const shouldRunBack = runbackTrigger;
    // In net pressure mode we only run back when the lob is clearly over/behind.
    const lobClearlyBehind = traj?.landPoint && (
      side > 0 ? traj.landPoint.y > player.pos.y + NETPLAY_THRESHOLDS.LOB_CLEAR_BEHIND_MARGIN : traj.landPoint.y < player.pos.y - NETPLAY_THRESHOLDS.LOB_CLEAR_BEHIND_MARGIN
    );
    if (shouldRunBack && (!netPressMode || lobClearlyBehind)) {
      point = {
        x: point.x * 0.40 + traj.landPoint.x * 0.60,
        y: runbackY,
        z: Math.max(point.z ?? profile.minContactZ, profile.preferredContactZ - 0.02),
        t: (point.t ?? 0.26) + 0.16,  // mais tempo para subir
      };
      phase = 'RUNBACK';
    } else if (hardForwardPickup || afterFirstBounceOnMySide) {
      const forwardBiasY = side > 0 ? 0.18 : -0.18;
      const holdPickupBall = afterFirstBounceOnMySide
        && !hardForwardPickup
        && liveBallDistToPlayer <= Math.max((player.reach ?? PLAYER_CFG.reach) * 1.10, 0.95);
      point = {
        x: ball?.pos?.x ?? point.x,
        y: holdPickupBall ? player.pos.y : (ball?.pos?.y ?? point.y) + forwardBiasY,
        z: clamp(ball?.pos?.z ?? point.z ?? profile.preferredContactZ, profile.minContactZ, profile.maxContactZ),
        t: holdPickupBall ? Math.min(point.t ?? 0.18, 0.16) : Math.min(point.t ?? 0.22, 0.20),
      };
      phase = holdPickupBall ? 'HOLD_GROUND' : 'FORWARD_PICKUP';
    }
  }

  const x = clamp(point.x, -COURT.singlesW / 2 - THRESHOLDS.outerPlayerX, COURT.singlesW / 2 + THRESHOLDS.outerPlayerX);
  const y = clamp(
    point.y,
    side > 0 ? 0.55 : -COURT.halfL - THRESHOLDS.outerPlayerY,
    side > 0 ? COURT.halfL + THRESHOLDS.outerPlayerY : -0.55,
  );
  const t = clamp(point.t ?? 0.30, 0.04, 1.30);

  return {
    x,
    y,
    z: point.z ?? profile.preferredContactZ,
    t,
    profile,
    phase,
    runbackScore: player?._tm?.runbackScore ?? 0,
    isAfterBounce: (ball.bounceCount ?? 0) >= 1 && ball.lastBounceSide === player.side,
  };
}

// Helper PT-BR:
// Escolhe família de passada para dar identidade ao deslocamento (ajuste, lateral, crossover...).
function chooseMoveFamily(player, target) {
  const dx = target.x - player.pos.x;
  const dy = target.y - player.pos.y;
  const adx = Math.abs(dx);
  const ady = Math.abs(dy);
  const side = player.side > 0 ? 1 : -1;
  const movingBack = side > 0 ? dy > 0 : dy < 0;

  if (adx < 0.45 && ady < 0.45) return 'ADJUST';
  if (movingBack && ady > 1.0) return 'BACKPEDAL';
  if (adx > ady * 1.35) return adx > 1.7 ? 'CROSSOVER' : 'LATERAL';
  if (ady > 2.4) return 'CROSSOVER';
  return 'TRAVEL';
}

// Helper PT-BR:
// Caps de movimento por família. Aqui você controla "personalidade" cinemática.
function movementCaps(player, family) {
  const baseSpeed = player.playerSpeed ?? PLAYER_CFG.speed;
  const baseAccel = player.playerAccel ?? PLAYER_CFG.maxAccel;
  const baseDecel = player.playerDecel ?? PLAYER_CFG.maxDecel;

  switch (family) {
    case 'ADJUST':
      return { speed: baseSpeed * 0.58, accel: baseAccel * 1.05, decel: baseDecel * 1.15, lateral: 1.00 };
    case 'BACKPEDAL':
      return { speed: baseSpeed * MOVEMENT.backwardSpeedMult * 0.94, accel: baseAccel * 0.90, decel: baseDecel * 0.98, lateral: 0.72 };
    case 'LATERAL':
      return { speed: baseSpeed * MOVEMENT.lateralSpeedMult * 1.02, accel: baseAccel * 0.98, decel: baseDecel * 1.03, lateral: 1.00 };
    case 'CROSSOVER':
      return { speed: baseSpeed * 1.06, accel: baseAccel * 1.06, decel: baseDecel * 0.96, lateral: 0.90 };
    default:
      return { speed: baseSpeed * 0.94, accel: baseAccel, decel: baseDecel, lateral: 0.88 };
  }
}

// Helper PT-BR:
// Steering físico: acelera/freia até o alvo respeitando stamina e inércia.
function applySteering(player, target, dt, family) {
  const dx = target.x - player.pos.x;
  const dy = target.y - player.pos.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const dirX = dist > 1e-5 ? dx / dist : 0;
  const dirY = dist > 1e-5 ? dy / dist : 0;
  const caps = movementCaps(player, family);

  const staminaFrac = clamp(player.stamina ?? 1.0, 0, 1);
  const speedStamina = STAMINA.speedMinFactor + staminaFrac * (1 - STAMINA.speedMinFactor);
  const accelStamina = INERTIA.staminaAccelMin + staminaFrac * (1 - INERTIA.staminaAccelMin);
  const currentSpeed = Math.sqrt(player.vel.x * player.vel.x + player.vel.y * player.vel.y);
  const urgency = dist < 0.75 ? 0.52 : dist < 1.8 ? 0.76 : dist < 3.0 ? 0.92 : 1.03;
  let targetSpeed = caps.speed * speedStamina * urgency;

  let desiredVx = dirX * targetSpeed * (family === 'BACKPEDAL' ? caps.lateral : 1.0);
  let desiredVy = dirY * targetSpeed;
  if (family === 'LATERAL' || family === 'ADJUST') desiredVy *= 0.82;

  const nearStopRadius = family === 'ADJUST' ? 0.38 : 0.55;
  if (dist < nearStopRadius) {
    const slow = clamp(dist / nearStopRadius, 0.05, 1.0);
    desiredVx *= slow;
    desiredVy *= slow;
  }

  const dvx = desiredVx - player.vel.x;
  const dvy = desiredVy - player.vel.y;
  const dvMag = Math.sqrt(dvx * dvx + dvy * dvy) || 1e-9;
  let maxAccelStep = caps.accel * accelStamina * dt;
  let maxDecelStep = caps.decel * dt;

  // Janela curta de recuperação inercial pós-golpe:
  // impede retorno "trilhado" imediato após corrida/estirada.
  const recTimer = player?._tm?.recoverInertiaTimer ?? 0;
  const recDuration = Math.max(0.001, player?._tm?.recoverInertiaDuration ?? 0.16);
  if (recTimer > 0) {
    const inertiaFrac = clamp(recTimer / recDuration, 0, 1);
    const carry = clamp(player?._tm?.recoverInertiaCarry ?? 0.46, 0.30, 0.70) * inertiaFrac;

    // Mantém parte do vetor de velocidade anterior (herança de momentum).
    desiredVx = desiredVx * (1 - carry) + player.vel.x * carry;
    desiredVy = desiredVy * (1 - carry) + player.vel.y * carry;

    // Durante essa janela, base speed de recuperação reduzida.
    targetSpeed *= 1 - 0.16 * inertiaFrac;
    maxAccelStep *= 1 - 0.40 * inertiaFrac;
    maxDecelStep *= 1 - 0.24 * inertiaFrac;

    // Troca brusca de direção (quase 180º) fica bem mais custosa.
    const targetDot = currentSpeed > 0.001
      ? (player.vel.x * dirX + player.vel.y * dirY) / currentSpeed
      : 1;
    if (targetDot < -0.25 && currentSpeed > 1.1) {
      maxAccelStep *= 0.42;
      maxDecelStep *= 0.62;
    }
  }

  const step = dvMag > 0 ? (dvMag > 0 && currentSpeed <= targetSpeed ? maxAccelStep : maxDecelStep) / dvMag : 0;
  const alpha = clamp(step, 0, 1);

  player.vel.x += dvx * alpha;
  player.vel.y += dvy * alpha;

  const maxSpd = caps.speed * speedStamina * 1.07;
  const spd = Math.sqrt(player.vel.x * player.vel.x + player.vel.y * player.vel.y);
  if (spd > maxSpd && spd > 1e-6) {
    player.vel.x = (player.vel.x / spd) * maxSpd;
    player.vel.y = (player.vel.y / spd) * maxSpd;
  }

  player.pos.x += player.vel.x * dt;
  player.pos.y += player.vel.y * dt;
  player.pos.x = clamp(player.pos.x, -COURT.singlesW / 2 - THRESHOLDS.outerPlayerX, COURT.singlesW / 2 + THRESHOLDS.outerPlayerX);
  player.pos.y = clamp(player.pos.y, -COURT.halfL - THRESHOLDS.outerPlayerY, COURT.halfL + THRESHOLDS.outerPlayerY);
}

// Helper PT-BR:
// Atualiza sensores brutos de contato para o futuro motor de golpes.
function refreshContactFlags(player, gs, plan) {
  const ball = gs.ball;
  const d = dist2(player.pos, { x: ball.pos.x, y: ball.pos.y });
  const prefZ = plan?.profile?.preferredContactZ ?? getPreferredContactZ(player);
  const minZ = plan?.profile?.minContactZ ?? clamp(prefZ - 0.20, 0.50, 0.88);
  const hasBounced = (ball.bounceCount ?? 0) >= 1;
  const sideOk = ballOnPlayerHalf(player, ball);
  // FIX: reduzido de 0.52 → 0.30s. Com 0.52s, bola fácil ficava 500ms bloqueada
  // (risingTooLow) mesmo com o jogador parado ao lado. 0.30s é suficiente para
  // detectar bola prestes a quicar duas vezes E liberar o hold-for-rise a tempo.
  const secondBounceThreat = hasBounced && (ball._timeSinceBounce ?? 0) > 0.30;
  const risingTooLow = hasBounced
    && ball.lastBounceSide === player.side
    && ball.vel.z > 0.01
    && ball.pos.z < minZ
    && !secondBounceThreat;

  const baseReach = player.reach ?? PLAYER_CFG.reach;
  const moveClass = d <= baseReach * 0.92 ? 'NORMAL_HIT' : d <= baseReach * 1.08 ? 'EMERGENCY_REACH' : 'CHASE';
  const canContactRaw = sideOk && d <= baseReach * 1.08 && ball.pos.z < THRESHOLDS.ballHitMaxZ + 0.3 && ball.lastHitBy !== player.id;
  const execDistNorm = clamp(1 - d / Math.max(baseReach * 1.04, 0.1), 0, 1);
  const execHeightNorm = clamp(1 - Math.abs((ball.pos.z ?? prefZ) - prefZ) / 0.44, 0, 1);
  const execRiseNorm = clamp(1 - Math.max(0, minZ - (ball.pos.z ?? minZ)) / 0.24, 0, 1);
  const executionScore = clamp(execDistNorm * 0.52 + execHeightNorm * 0.33 + execRiseNorm * 0.15, 0, 1);
  
  const localBallPassedWindow = hasBounced
    && sideOk
    && ball.lastBounceSide === player.side
    && ball.lastHitBy !== player.id
    && d <= baseReach * 1.14
    && Math.abs((ball.pos.x ?? 0) - player.pos.x) <= 1.05
    && Math.abs((ball.pos.y ?? 0) - player.pos.y) <= 1.35
    && (ball.pos.z ?? 0) <= THRESHOLDS.ballHitMaxZ + 0.95
    && (ball._timeSinceBounce ?? 999) <= 0.72;
  const canContact = canContactRaw && (!risingTooLow || secondBounceThreat || localBallPassedWindow);
  const isAerialIntercept = !hasBounced && (plan?.phase === 'NET_CUT' || player.atNet || getCourtMode(player) === 'NET');

  player._holdForRiseActive = risingTooLow;
  player._holdForRiseMinZ = minZ;
  player._movementCanExecutePlannedShot = !!canContact;
  player._movementCanContactBall = !!canContact;
  player._movementContactClass = isAerialIntercept
    ? 'AERIAL_INTERCEPT'
    : canContact ? 'NORMAL_HIT' : localBallPassedWindow
        ? 'LOCAL_BOUNCE_HIT'
        : canContact
          ? moveClass
          : 'CHASE';
  player._movementContactScore = clamp(1 - d / Math.max(baseReach * 1.12, 0.1), 0, 1);
}

// Helper PT-BR:
// Gerencia mentalidade de rede (subir/segurar/recuar) e handshake entre courtMode e atNet.
function updateNetIntent(player, gs) {
  const netAffinity = getNetAffinity(player);
  const courtMode = getCourtMode(player);
  const side = player.side > 0 ? 1 : -1;
  const ball = gs.ball;
  if (!player.ctx) player.ctx = {};

  // Helper PT-BR:
  // CONSOLIDA subida: quando o jogador em TRANSITION cruza a zona de rede, vira NET real.
  if (courtMode === 'TRANSITION' && !player.atNet) {
    const approachQ = 0.5;
    const netZoneFrac = clamp(0.42 - approachQ * 0.08, 0.30, 0.42);
    const netZoneY = side * (COURT.halfL * netZoneFrac);
    const reachedNet = side > 0 ? player.pos.y <= netZoneY : player.pos.y >= netZoneY;
    if (reachedNet) {
      player.atNet = true;
      player.ctx.courtMode = 'NET';
      if (!player.ctx.netPhase || player.ctx.netPhase === 'BASE') player.ctx.netPhase = 'APPROACH';
      player.ctx.netIntent = Math.max(0, (player.ctx.netIntent ?? 0) * 0.40);
    }
  }

  if (!player.atNet) return;
  const prefZ = getPreferredContactZ(player);
  const ballComingToMe = ball.lastHitBy !== player.id && ballIsComingToPlayer(player, ball);
  const passedMyYWithMargin = side > 0 ? ball.pos.y > player.pos.y + NETPLAY_THRESHOLDS.LOB_PASS_MARGIN_Y : ball.pos.y < player.pos.y - NETPLAY_THRESHOLDS.LOB_PASS_MARGIN_Y;
  const lobOverHead = ballComingToMe
    && (ball.bounceCount ?? 0) === 0
    && (ball.pos.z ?? 0) > prefZ + NETPLAY_THRESHOLDS.LOB_OVERHEAD_Z_EXTRA
    && passedMyYWithMargin;
  const deepAfterBounce = ball.lastHitBy !== player.id
    && (ball.bounceCount ?? 0) >= 1
    && ball.lastBounceSide === side
    && Math.abs(ball.pos.y) > COURT.serviceLineY + NETPLAY_THRESHOLDS.DEEP_BOUNCE_RETREAT_EXTRA;

  // Retreat only on real lob danger / ball already behind, not just "deep incoming".
  if (lobOverHead || deepAfterBounce) {
    player.atNet = false;
    // Helper PT-BR:
    // Recuo explícito para BASE, evitando ficar "preso" em estado NET sem posição de rede.
    player.ctx.courtMode = 'BASE';
    if (player.ctx.netPhase) player.ctx.netPhase = 'BASE';
  }
}

// Helper PT-BR:
// Runtime interno da máquina de movimento.
function ensureRuntime(player) {
  if (player._tm) return;
  player._tm = {
    phase: 'READ',
    commit: null,
    lastHitBy: null,
    splitTimer: 0,
    firstStepBoostTimer: 0,
    firstStepBoostDuration: 0,
    recoverInertiaTimer: 0,
    recoverInertiaDuration: 0.16,
    recoverInertiaCarry: 0.46,
    runbackScore: 0,
    contactSettleTime: 0,
    contactReadiness: 0,
  };
}

// Helper PT-BR:
// Mede se o jogador estava "montado" para o contato, ignorando micro-ajustes.
// A ideia é separar jitter visual perto do alvo de corrida real até a bola.
function updateContactReadiness(player, target, dt, defendNow) {
  if (!player?._tm || !target || !defendNow) {
    if (player?._tm) {
      player._tm.contactSettleTime = 0;
      player._tm.contactReadiness = 0;
    }
    player._contactReadiness = 0;
    player._contactSettleTime = 0;
    player._commitDistance = null;
    return 0;
  }

  const dx = (target.x ?? player.pos.x) - player.pos.x;
  const dy = (target.y ?? player.pos.y) - player.pos.y;
  const commitDistance = Math.sqrt(dx * dx + dy * dy);
  const speed = Math.hypot(player.vel?.x ?? 0, player.vel?.y ?? 0);
  const reach = Math.max(player.reach ?? PLAYER_CFG.reach, 0.1);
  const arrivalMargin = player._arrivalMargin ?? 0;
  const contactScore = player._movementContactScore ?? 0;

  const closeScore = clamp(1 - commitDistance / Math.max(reach * 0.92, 0.25), 0, 1);
  const speedScore = clamp(1 - speed / 2.15, 0, 1);
  const timingScore = clamp((arrivalMargin + 0.10) / 0.34, 0, 1);
  const sensorScore = clamp(contactScore, 0, 1);
  const rawReadiness = clamp(
    closeScore * 0.40
      + speedScore * 0.24
      + timingScore * 0.22
      + sensorScore * 0.14,
    0,
    1,
  );

  const inSetZone = commitDistance <= reach * 0.72
    && speed <= 2.25
    && arrivalMargin > -0.12;
  player._tm.contactSettleTime = inSetZone
    ? clamp((player._tm.contactSettleTime ?? 0) + dt, 0, 0.42)
    : clamp((player._tm.contactSettleTime ?? 0) - dt * 1.8, 0, 0.42);

  const settleBoost = clamp((player._tm.contactSettleTime ?? 0) / 0.16, 0, 1) * 0.16;
  const previous = player._tm.contactReadiness ?? 0;
  const blendUp = rawReadiness > previous ? 0.46 : 0.28;
  const readiness = clamp(previous + (rawReadiness + settleBoost - previous) * blendUp, 0, 1);

  player._tm.contactReadiness = readiness;
  player._contactReadiness = readiness;
  player._contactSettleTime = player._tm.contactSettleTime;
  player._commitDistance = commitDistance;
  return readiness;
}

// Helper PT-BR:
// Limpa TODA memória transitória do TennisMovement no fim de ponto/reset.
export function resetMovementRuntime(player) {
  player._arrivalMargin = undefined;
  player._bodyInertiaPenalty = 0;
  player._predCrossX = undefined;
  player._readPauseFrames = 0;
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
  player._returnAdaptiveBias = { x: 0, y: 0, confidence: 0 };
  player._movementContactScore = 0;
  player._contactReadiness = 0;
  player._contactSettleTime = 0;
  player._commitDistance = null;
  player._bounceReplanTimer = 0;
  player._movementCommit = null;
  player._approachAnchor = null;
  player._variedWaitXOffset = 0;
  player._variedWaitSeedShotX = undefined;
  player._variedWaitSeedRally = undefined;
  player._serveReturnFlightActive = false;
  player._tm = null;
  if (player.ctx) {
    player.ctx._readLaneX = undefined;
    player.ctx._readDepthY = undefined;
    player.ctx._anticipationWindow = 0;
    player.ctx._anticipationTowardMe = false;
    player.ctx._splitReadiness = 0;
    player.ctx._splitStepTimer = 0;
    player.ctx._firstStepBoostTimer = 0;
    player.ctx._lastSeenHitBy = null;
  }
}

// Helper PT-BR:
// Loop principal do Tennismovement: decide alvo e aplica steering por frame.
export function updatePlayerMovement(player, gs, dt) {
  if (!dt || dt <= 0 || !isFinite(dt)) return;
  if (gs.gameState !== GameState.RALLY && gs.gameState !== GameState.SERVING) return;
  if (!player.ctx) player.ctx = {};

  ensureRuntime(player);
  updateNetIntent(player, gs);

  const ball = gs.ball;
  const baseTarget = computeBaseTarget(player, gs);
  player.basePos.x = baseTarget.x;
  player.basePos.y = baseTarget.y;

  const prevLastHitBy = player._tm.lastHitBy;
  const myJustHit = ball.lastHitBy === player.id && prevLastHitBy !== player.id;
  const oppJustHit = ball.lastHitBy !== player.id && ball.lastHitBy !== player._tm.lastHitBy;
  player._tm.lastHitBy = ball.lastHitBy;

  if (myJustHit) {
    const currSpeed = Math.sqrt(player.vel.x * player.vel.x + player.vel.y * player.vel.y);
    const contactClass = player._movementContactClass ?? 'NORMAL_HIT';
    const stretchBonus = contactClass === 'EMERGENCY_REACH' ? 0.040 : contactClass === 'CHASE' ? 0.028 : 0.0;
    const duration = clamp(0.12 + currSpeed * 0.013 + stretchBonus, 0.12, 0.22);
    const carry = clamp(0.40 + currSpeed * 0.032 + stretchBonus * 0.7, 0.40, 0.62);
    player._tm.recoverInertiaTimer = duration;
    player._tm.recoverInertiaDuration = duration;
    player._tm.recoverInertiaCarry = carry;
  }

  if (oppJustHit) {
    // Helper PT-BR:
    // Detecta retorno de saque: rally=0 significa que o saque acabou de acontecer.
    // No retorno, o split timer deve ser muito mais curto (18–38ms vs 55–110ms do rally),
    // simulando a reação explosiva de um tenista profissional que já leu o serviço.
    const isServeReturn = (gs.rally ?? 0) === 0 && player.id === gs.receiver;
    if (isServeReturn) {
      player._tm.splitTimer = clamp(0.045 + (1 - getNetAffinity(player)) * 0.040, 0.045, 0.085);
      player._tm.firstStepBoostTimer = 0.14;
      player._tm.firstStepBoostDuration = 0.14;
    } else {
      player._tm.splitTimer = clamp(0.090 + (1 - getNetAffinity(player)) * 0.070, 0.090, 0.16);
      player._tm.firstStepBoostTimer = clamp(0.08 + getNetAffinity(player) * 0.04, 0.08, 0.12);
      player._tm.firstStepBoostDuration = player._tm.firstStepBoostTimer;
    }
  }
  if (player._tm.splitTimer > 0) {
    player._tm.splitTimer = Math.max(0, player._tm.splitTimer - dt);
    player.vel.x *= 0.42;
    player.vel.y *= 0.42;
  }

  const defendNow = ball.lastHitBy !== player.id && (ballIsComingToPlayer(player, ball) || ballOnPlayerHalf(player, ball));
  let target = baseTarget;
  let targetTime = 0.24;
  let phase = 'RECOVER';

  if (defendNow) {
    const plan = computeContactPlan(player, gs, baseTarget);
    const prevCommit = player._tm.commit;
    const killRunbackAfterBounce = (ball.bounceCount ?? 0) >= 1
      && ball.lastBounceSide === player.side
      && ball.lastHitBy !== player.id;

    if (killRunbackAfterBounce && prevCommit?.phase === 'RUNBACK') {
      player._tm.commit = null;
      player._tm.runbackScore = 0;
      player.vel.y *= 0.65;
    }

    // RUNBACK sempre força replan imediato — sem blend suave
    // Caso contrário o jogador leva 3+ frames para chegar ao runbackY
    const phaseChanged = prevCommit?.phase !== plan.phase;
    const replan = !prevCommit
      || prevCommit.bounceCount !== (ball.bounceCount ?? 0)
      || dist2(prevCommit, plan) > 0.55
      || Math.abs((prevCommit.t ?? 0.2) - plan.t) > 0.16
      || phaseChanged;  // mudança de fase (ex: TRAVEL→RUNBACK) = replan imediato

    if (replan) {
      player._tm.commit = {
        x: plan.x,
        y: plan.y,
        t: plan.t,
        z: plan.z,
        phase: plan.phase,
        bounceCount: ball.bounceCount ?? 0,
      };
      // Frear inércia quando entra em RUNBACK para não carregar momentum errado
      if (plan.phase === 'RUNBACK' && (prevCommit?.phase ?? '') !== 'RUNBACK') {
        player.vel.x *= 0.40;
        player.vel.y *= 0.40;
      }
    } else {
      // Blend suave apenas para ajustes finos dentro da mesma fase
      const blendRate = plan.phase === 'RUNBACK' ? 0.60 : 0.34;
      player._tm.commit.x = player._tm.commit.x + (plan.x - player._tm.commit.x) * blendRate;
      player._tm.commit.y = player._tm.commit.y + (plan.y - player._tm.commit.y) * blendRate;
      player._tm.commit.t = plan.t;
      player._tm.commit.z = plan.z;
      player._tm.commit.phase = plan.phase;
    }

    target = player._tm.commit;
    targetTime = clamp(target.t ?? 0.24, 0.04, 1.10);
    phase = plan.phase;
    const staminaFrac = clamp(player.stamina ?? 1.0, 0, 1);
    const arrivalFamily = chooseMoveFamily(player, target);
    const caps = movementCaps(player, arrivalFamily);
    const nominalSpeed = player.playerSpeed ?? PLAYER_CFG.speed;
    const effSpeed = Math.max(
      2.05,
      Math.max(nominalSpeed * 0.94, caps.speed) * (STAMINA.speedMinFactor + staminaFrac * (1 - STAMINA.speedMinFactor)),
    );
    const distance = Math.sqrt(dist2(player.pos, target));
    const anticipationLift = clamp(player._tm.splitTimer > 0 ? 0.02 : 0, 0, 0.10);
    player._arrivalMargin = targetTime - (distance / effSpeed) + anticipationLift;
    const closeToContact = clamp(1 - distance / Math.max((player.reach ?? PLAYER_CFG.reach) * 2.0, 0.2), 0, 1);
    const predWeight = clamp(0.70 - closeToContact * 0.52, 0.18, 0.72);
    player._predCrossX = target.x * predWeight + (ball.pos.x ?? target.x) * (1 - predWeight);
    player._predCrossConfidence = predWeight;
    player._hitTarget = { x: target.x, y: target.y, t: targetTime };
    player._stableTarget = { x: target.x, y: target.y };
    refreshContactFlags(player, gs, plan);
    updateContactReadiness(player, target, dt, true);
  } else {
    player._tm.commit = null;
    player._arrivalMargin = 0.30;
    player._predCrossX = baseTarget.x;
    player._predCrossConfidence = 0.65;
    player._hitTarget = null;
    player._stableTarget = { x: baseTarget.x, y: baseTarget.y };
    player._holdForRiseActive = false;
    player._movementCanContactBall = false;
    player._movementCanExecutePlannedShot = false;
    player._movementContactClass = null;
    updateContactReadiness(player, null, dt, false);
  }

  const family = chooseMoveFamily(player, target);
  applySteering(player, target, dt, family);
  if (defendNow) updateContactReadiness(player, target, dt, true);
  if (player._tm.recoverInertiaTimer > 0) {
    player._tm.recoverInertiaTimer = Math.max(0, player._tm.recoverInertiaTimer - dt);
  }

  // Helper PT-BR:
  // Arrancada explosiva pós-split no retorno de saque.
  // Aplica impulso extra na direção do alvo enquanto o boost timer estiver ativo,
  // simulando o primeiro passo explosivo do receptor após a leitura do saque.
  if (player._tm.firstStepBoostTimer > 0 && player._tm.splitTimer === 0) {
    player._tm.firstStepBoostTimer = Math.max(0, player._tm.firstStepBoostTimer - dt);
    if (defendNow) {
      const bdx = target.x - player.pos.x;
      const bdy = target.y - player.pos.y;
      const bdist = Math.sqrt(bdx * bdx + bdy * bdy);
      if (bdist > 0.18) {
        // Boost fades out ao longo dos 0.15s para transição suave
        const baseDuration = Math.max(0.08, player._tm.firstStepBoostDuration ?? 0.12);
        const boostFrac = clamp(player._tm.firstStepBoostTimer / baseDuration, 0, 1);
        const boostAccel = (player.playerAccel ?? PLAYER_CFG.maxAccel) * 0.65 * boostFrac;
        player.vel.x += (bdx / bdist) * boostAccel * dt;
        player.vel.y += (bdy / bdist) * boostAccel * dt;
      }
    }
  }

  if (!defendNow) {
    const distBase = Math.sqrt(dist2(player.pos, baseTarget));
    if (distBase < 0.65) {
      player.vel.x *= 0.78;
      player.vel.y *= 0.78;
    }
  }

  player._tm.phase = phase;
  player._movState = defendNow ? (player._movementCanExecutePlannedShot ? 'HIT' : 'MOVE') : 'WAIT';
  player._locomotionMode = family;
  player._movementTelemetry = {
    phase,
    family,
    arrivalMargin: +(player._arrivalMargin ?? 0).toFixed(3),
    splitTimer: +(player._tm.splitTimer ?? 0).toFixed(3),
    firstStepBoost: +(player._tm.firstStepBoostTimer ?? 0).toFixed(3),
    recoverInertia: +(player._tm.recoverInertiaTimer ?? 0).toFixed(3),
    runbackScore: +(player._tm.runbackScore ?? 0).toFixed(3),
    predCrossConfidence: +(player._predCrossConfidence ?? 0).toFixed(3),
    returnBiasX: +((player._returnAdaptiveBias?.x ?? 0)).toFixed(3),
    returnBiasY: +((player._returnAdaptiveBias?.y ?? 0)).toFixed(3),
    returnBiasConf: +((player._returnAdaptiveBias?.confidence ?? 0)).toFixed(3),
    contactScore: +(player._movementContactScore ?? 0).toFixed(3),
    contactReadiness: +(player._contactReadiness ?? 0).toFixed(3),
    contactSettleTime: +(player._contactSettleTime ?? 0).toFixed(3),
    commitDistance: player._commitDistance != null ? +player._commitDistance.toFixed(3) : null,
  };
}





