import { COURT, THRESHOLDS, PLAYER_CFG, STAMINA, INERTIA, MOVEMENT, GameState } from '../../core/constants.js';
import { clamp, dist2 } from '../../core/math.js';
import { getCourtIdentity } from '../../domain/players/PlayerCourtIdentity.js';
import { predictTrajectory } from '../../core/physics.js';
import { NETPLAY_THRESHOLDS } from './netplayThresholds.js';
import { getTalentRuntimeEffects } from '../talents/TalentIdentitySystem.js';
import { updateMovementPerception } from './MovementPerception.js';
import {
  applyBodyCommitmentToSteering,
  getBodyCommitmentPenalty,
  updateBodyCommitment,
} from './BodyCommitment.js';
import {
  applySplitStepToSteering,
  beginSplitStep,
  getSplitStepImpulse,
  syncLegacySplitFields,
  updateSplitStep,
} from './SplitStep.js';
import { chooseContactPointWindow } from './ContactPointPlanner.js';
import { resetRecoveryPositioning, resolveRecoveryPosition } from './RecoveryPositioning.js';
import { planContactFootwork, resetFootworkPlan } from './FootworkPlanner.js';
import { getSurfaceFootingProfile, resetSurfaceFooting, updateSurfaceFooting } from './SurfaceFooting.js';
import { evaluateMovementCoherence, resetMovementCoherence } from './MovementCoherence.js';
import { planInterception } from './InterceptionPlanner.js';
import { resetMovementPlanState, stabilizeMovementPlan } from './MovementPlanState.js';
import { resetCourtMovementState, updateCourtMovementState } from './CourtMovementState.js';

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
  const isReceiver = player?.id === gs?.receiver;
  const earlyReturn = isReceiver && (gs?.rally ?? 0) === 0;
  if (!earlyReturn) return { x: 0, y: 0, confidence: 0 };

  const attrs = player?.attrs ?? {};
  const returnIdentity = getCourtIdentity(player).returnIdentity;
  const readSkill = clamp(((attrs.leitura ?? 60) * 0.45 + (attrs.devolucao ?? attrs.retorno ?? 60) * 0.55) / 100, 0, 1);
  const history = gs?._servePatternHistory ?? [];
  // ServeEngine registra o saque atual no lançamento para telemetria. A leitura
  // pré-saque só pode usar entradas anteriores — nunca o plano que acabou de nascer.
  const pastHistory = (gs?.ball?.lastHitBy === gs?.server && (gs?.rally ?? 0) === 0)
    ? history.slice(0, -1)
    : history;
  const recent = pastHistory.slice(-6);

  let xSignal = 0;
  let ySignal = 0;
  let confidence = 0;

  if (recent.length >= 3) {
    const counts = recent.reduce((acc, item) => {
      const key = `${item.direction ?? 'UNK'}:${item.isFirst === false ? '2' : '1'}:${item.targetSign ?? 0}`;
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {});
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    const patternShare = top ? top[1] / recent.length : 0;
    if (patternShare >= 0.50) {
      const [dir, serveNo, targetSignRaw] = top[0].split(':');
      const targetSign = Number(targetSignRaw) || 0;
      const sideGuess = dir === 'WIDE'
        ? targetSign
        : dir === 'BODY'
          ? Math.sign(player.pos?.x ?? 0) * 0.18
          : targetSign * 0.35;
      xSignal += sideGuess * (0.20 + patternShare * 0.26) * readSkill;
      ySignal += (serveNo === '1' ? 0.14 : -0.12) * patternShare * readSkill;
      confidence += patternShare * readSkill * 0.28;
    }
  }

  confidence = clamp(confidence, 0, 0.82);
  if (confidence < 0.12) return { x: 0, y: returnIdentity.positionBias * 0.8, confidence: 0.01 };
  return {
    x: clamp(xSignal, -0.62, 0.62) * confidence,
    y: clamp(ySignal, -0.48, 0.48) * confidence + returnIdentity.positionBias * 0.8,
    confidence,
  };
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
  const aggrInsideBias = clamp((aggr - 55) / 45, 0, 1) * 0.52;
  const readBackBias = clamp((leitura - 50) / 50, 0, 1) * 0.20;
  const baselinePlayerBias = (1 - netAffinity) * 0.52;
  // Valor negativo = dentro da quadra (pressing position). HUNTER+agressivo pode chegar a -0.12m.
  return clamp(0.28 + baselinePlayerBias + readBackBias - aggrInsideBias + getCourtIdentity(player).positioning.baselineDepthBias, -0.35, 1.10);
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
  const yClampMin = side > 0 ? 0.55 : -COURT.halfL - THRESHOLDS.outerPlayerY;
  const yClampMax = side > 0 ? COURT.halfL + THRESHOLDS.outerPlayerY : -0.55;

  let targetY = baseY;
  // Helper PT-BR:
  // Em transição, mira a zona ofensiva entre serviço e rede. A qualidade do approach
  // define o quão agressivo pode ser o avanço.
  if (courtMode === 'TRANSITION') {
    const approachQ = clamp(player?.ctx?._approachQuality ?? 0.5, 0, 1);
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
  let laneX = clamp((gs?.ball?.pos?.x ?? 0) * (0.24 + netAffinity * 0.18), -lateralBaseBand, lateralBaseBand);
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
  if (courtMode === 'BASE') {
    const recoveryPlan = resolveRecoveryPosition(player, gs, { x: laneX, y: targetY });
    if (recoveryPlan) {
      laneX = recoveryPlan.x;
      targetY = recoveryPlan.y;
    }
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
function computeContactPlan(player, gs, baseTarget, perceivedBall = null) {
  const ball = perceivedBall ?? gs.ball;
  player._movementBallZHint = ball?.pos?.z ?? undefined;
  const side = player.side > 0 ? 1 : -1;
  const courtMode = getCourtMode(player);
  const netAffinity = getNetAffinity(player);
  const netPressMode = (player.atNet || courtMode === 'NET' || courtMode === 'TRANSITION') && netAffinity >= 0.62;
  const profile = buildInterceptProfile(player);
  const targetY = estimateContactLaneY(player, baseTarget.y);
  const airDensity = gs.environment?.airDensity;
  const traj = predictTrajectory(ball, targetY, 2.6, airDensity, gs.courtPhysics, profile, gs.environment);
  const contactTiming = chooseContactPointWindow({ player, gs, trajectory: traj, profile, side });

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

  // Se a busca temporal concluiu que nenhuma janela é alcançável, não deixa o
  // novo ótimo tardio comandar a corrida. Conserva o cruzamento imediato que o
  // motor usava como solução de sobrevivência antes de ampliar a previsão.
  if (contactTiming?.mode === 'EMERGENCY_CONTACT' && traj?.crossPoint) {
    point = { ...traj.crossPoint };
    phase = 'TRAVEL';
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

    // Se o jogador ja esta na meia quadra/rede e a bola vem jogavel no ar,
    // prioriza o voleio. Sem isso, quando o preditor so encontra landPoint,
    // o plano cai no pos-quique e o net player "espera" uma bola que deveria
    // interceptar antes do bounce.
    const vy = ball?.vel?.y ?? 0;
    const vx = ball?.vel?.x ?? 0;
    const vz = ball?.vel?.z ?? 0;
    const comingToMe = ball.lastHitBy !== player.id && ballIsComingToPlayer(player, ball);
    const leadT = Math.abs(vy) > 0.05
      ? clamp(Math.abs((ball.pos.y ?? player.pos.y) - player.pos.y) / Math.abs(vy), 0.06, 0.42)
      : 0.12;
    const leadX = (ball.pos.x ?? 0) + vx * leadT;
    const leadYRaw = (ball.pos.y ?? 0) + vy * leadT;
    const leadY = side > 0 ? Math.min(leadYRaw, volleyCutY) : Math.max(leadYRaw, volleyCutY);
    const leadZ = (ball.pos.z ?? profile.preferredContactZ) + vz * leadT;
    const liveDist = Math.hypot(leadX - player.pos.x, leadY - player.pos.y);
    const inVolleyHeight = leadZ >= 0.62 && leadZ <= THRESHOLDS.ballHitMaxZ + 0.62;
    const notClearLob = !(traj?.landPoint && (
      side > 0
        ? traj.landPoint.y > player.pos.y + NETPLAY_THRESHOLDS.LOB_CLEAR_BEHIND_MARGIN
        : traj.landPoint.y < player.pos.y - NETPLAY_THRESHOLDS.LOB_CLEAR_BEHIND_MARGIN
    ));
    const reachableAirVolley = comingToMe
      && inVolleyHeight
      && notClearLob
      && (liveDist <= Math.max((player.reach ?? PLAYER_CFG.reach) * 2.35, 2.05)
        || Math.abs(leadY) <= COURT.serviceLineY + 0.85);

    if (reachableAirVolley) {
      point = {
        x: leadX,
        y: leadY,
        z: clamp(leadZ, Math.max(profile.minContactZ, 0.68), Math.min(profile.maxContactZ + 0.42, THRESHOLDS.ballHitMaxZ + 0.62)),
        t: leadT,
      };
      phase = leadZ >= 1.55 ? 'OVERHEAD_CUT' : 'NET_CUT';
      player._volleyType = leadZ >= 1.55 ? 'smash' : 'position';
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
    const landAbsY = Math.abs(traj.landPoint.y);
    const isIntermediateZone = landAbsY < COURT.halfL - 0.8 && landAbsY > COURT.serviceLineY;
    const isDeepZone = landAbsY >= COURT.halfL - 0.8;
    // Zona funda: comportamento original — recuo total para ter tempo de montar o golpe.
    // Zona intermediária: recuo mínimo — jogador fica na zona e ataca a bola de frente.
    // Service box: recuo quase zero — jogador entra na bola.
    const behindLandDist = isDeepZone
      ? clamp(1.05 + (1 - netAffinity) * 1.20, 1.00, 2.20)
      : isIntermediateZone
        ? clamp(0.28 + (1 - netAffinity) * 0.52, 0.28, 0.80)
        : clamp(0.18 + (1 - netAffinity) * 0.38, 0.18, 0.56);
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

    // LOB RETREAT — decisão preditiva, não visual.
    // Antes o jogador na rede só abandonava a tentativa quando a bola já tinha
    // passado por seu Y. Entre a leitura e esse instante ele ficava preso entre
    // o estado de voleio e o de recuperação, parecendo travar sob o lob.
    // Aqui usamos o ponto de queda previsto: se a bola vai cair claramente atrás
    // dele e fora de uma janela realista de overhead, a prioridade vira corrida.
    const lobLandingBehind = ballStillInFlight
      && !!traj?.landPoint
      && (side > 0
        ? traj.landPoint.y > player.pos.y + 0.72
        : traj.landPoint.y < player.pos.y - 0.72);
    const lobIsDeep = !!traj?.landPoint
      && Math.abs(traj.landPoint.y) > COURT.serviceLineY + 1.15;
    const overheadStillPlayable = (ball?.pos?.z ?? 0) <= profile.maxContactZ + 0.38
      && Math.hypot((ball?.pos?.x ?? 0) - player.pos.x, (ball?.pos?.y ?? 0) - player.pos.y) <= Math.max((player.reach ?? PLAYER_CFG.reach) * 1.36, 1.55);
    const emergencyLobRetreat = lobLandingBehind && lobIsDeep && !overheadStillPlayable
      && (player.atNet || getCourtMode(player) === 'NET' || getCourtMode(player) === 'TRANSITION');

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
      // FIX: floor de 1.00m → 0.78m. Bolas flat/topspin normais picam entre
      // 0.55-0.85m; só kick serve e loop alto passavam de 1.00m. Com o floor
      // antigo, ataque-na-subida nunca disparava em rallies comuns e tudo caía
      // no FORWARD_PICKUP — que bate na altura atual (baixa), não na prevista.
      && (ball?.pos?.z ?? 0) >= Math.max(profile.preferredContactZ - 0.12, 0.78)
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
    const waitForHighFinish = easyHighBouncePickup
      && (ball?.pos?.z ?? 0) < Math.min(profile.maxContactZ - 0.08, Math.max(profile.preferredContactZ + 0.36, 1.32))
      && (ball?._timeSinceBounce ?? 0) <= 0.58
      && liveBallDistToPlayer <= Math.max((player.reach ?? PLAYER_CFG.reach) * 1.75, 1.55);

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
    if (emergencyLobRetreat) {
      point = {
        x: traj.landPoint.x,
        y: runbackY,
        z: Math.max(profile.minContactZ, Math.min(profile.preferredContactZ, 1.05)),
        t: Math.max((point.t ?? 0.26) + 0.22, 0.44),
      };
      phase = 'LOB_RETREAT';
      player.atNet = false;
      if (player.ctx) {
        player.ctx.courtMode = 'BASE';
        player.ctx.netPhase = 'BASE';
      }
    } else if (shouldRunBack && (!netPressMode || lobClearlyBehind)) {
      point = {
        x: point.x * 0.40 + traj.landPoint.x * 0.60,
        y: runbackY,
        z: Math.max(point.z ?? profile.minContactZ, profile.preferredContactZ - 0.02),
        t: (point.t ?? 0.26) + 0.16,  // mais tempo para subir
      };
      phase = 'RUNBACK';
    } else if (waitForHighFinish) {
      point = {
        x: ball?.pos?.x ?? point.x,
        y: ball?.pos?.y ?? point.y,
        z: clamp(Math.max(profile.preferredContactZ + 0.28, 1.18), profile.minContactZ, profile.maxContactZ),
        t: clamp(0.30 + (profile.preferredContactZ + 0.34 - (ball?.pos?.z ?? 0)) * 0.18, 0.24, 0.42),
      };
      phase = 'WAIT_HIGH_FINISH';
      player._easyHighBounceAttack = true;
    } else if (hardForwardPickup || afterFirstBounceOnMySide) {
      const forwardBiasY = side > 0 ? 0.18 : -0.18;
      const holdPickupBall = afterFirstBounceOnMySide
        && !hardForwardPickup
        && liveBallDistToPlayer <= Math.max((player.reach ?? PLAYER_CFG.reach) * 1.10, 0.95);

      // FIX: bug do bate-baixo.
      //
      // Antes:
      //   z: clamp(ball?.pos?.z ?? point.z ?? profile.preferredContactZ, ...)
      // O `ball.pos.z` (altura ATUAL) sobrescrevia o `point.z` (altura PREVISTA
      // no swing time, vinda do optimalHitPoint da predictTrajectory que já
      // considera o riseBonus do perfil). Como ball.pos.z nunca é undefined,
      // o fallback para point.z era código morto. Resultado: swing 0.16-0.20s
      // depois, mas mirando na altura velha — bola subindo perde a janela.
      //
      // Agora:
      //   - Bola subindo (vel.z > 0.5): respeitar `point.z` (altura prevista
      //     no swing time) e recuar levemente em Y para dar tempo do pico.
      //   - Bola caindo/skidando: usar `ball.pos.z` mesmo (não há tempo a ganhar).
      const ballRising = (ball?.vel?.z ?? 0) > 0.5;
      const currentBallZ = ball?.pos?.z ?? profile.preferredContactZ;
      const predictedZ = point.z ?? profile.preferredContactZ;
      const willRiseToBetterZ = ballRising && predictedZ > currentBallZ + 0.10;
      const contactZ = willRiseToBetterZ ? predictedZ : currentBallZ;
      // Quando vamos esperar o pico, recua ~32cm para dar tempo. Senão usa o
      // forwardBias original (entra na bola para hold/forward pickup curto).
      const stepBackY = willRiseToBetterZ ? side * 0.32 : forwardBiasY;
      // Mais tempo para o swing quando esperando subida (0.30s vs 0.20s padrão).
      const swingT = holdPickupBall ? Math.min(point.t ?? 0.18, 0.16)
        : willRiseToBetterZ ? Math.min(point.t ?? 0.32, 0.34)
        : Math.min(point.t ?? 0.22, 0.20);

      point = {
        x: ball?.pos?.x ?? point.x,
        y: holdPickupBall ? player.pos.y : (ball?.pos?.y ?? point.y) + stepBackY,
        z: clamp(contactZ, profile.minContactZ, profile.maxContactZ),
        t: swingT,
      };
      phase = holdPickupBall ? 'HOLD_GROUND'
        : willRiseToBetterZ ? 'PEAK_WAIT'
        : 'FORWARD_PICKUP';
      player._easyHighBounceAttack = easyHighBouncePickup || easyBounceAttackBall || willRiseToBetterZ;
    }
  }

  // A escolha temporal é aplicada depois dos fallbacks de pickup, mas nunca
  // sobrescreve decisões especiais de rede, lob ou recuo emergencial.
  const protectedPhase = ['NET_CUT', 'OVERHEAD_CUT', 'LOB_RETREAT', 'RUNBACK', 'WAIT_HIGH_FINISH'].includes(phase);
  // A camada nova interfere apenas quando encontrou uma melhora temporal real.
  // Contatos que já eram bons continuam no caminho calibrado; isto evita trocar
  // uma solução estável por outra apenas alguns centímetros mais "ideal".
  const deliberateWaitSafe = !!contactTiming?.waitForBetterContact
    && (contactTiming?.arrivalMargin ?? -1) >= 0.18;
  const appliedContactWait = !!(contactTiming?.point && deliberateWaitSafe && !netPressMode && !protectedPhase);
  if (appliedContactWait) {
    point = { ...contactTiming.point };
    // O subtipo pode mudar de WAIT_FOR_PEAK para IDEAL_HEIGHT conforme a bola
    // sobe. Isso é progresso do mesmo plano, não uma nova decisão que justifica
    // frear e recomputar toda a corrida a cada frame.
    phase = contactTiming.mode === 'EMERGENCY_CONTACT' ? 'CONTACT_EMERGENCY' : 'CONTACT_WINDOW';
  }
  player._contactTimingPlan = contactTiming;

  const footwork = planContactFootwork({ player, gs, point, phase, profile });
  if (footwork?.bodyTarget) point = { ...footwork.bodyTarget };

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
    contactTiming: contactTiming?.mode ?? null,
    contactTimingReason: contactTiming?.reason ?? null,
    contactCandidateCount: contactTiming?.candidateCount ?? 0,
    waitedForBetterContact: !!contactTiming?.waitForBetterContact,
    appliedContactWait,
    footworkStance: footwork?.stance ?? null,
    footworkWing: footwork?.wing ?? null,
    footworkPreparation: footwork?.preparationQuality ?? null,
    idealContactRadius: footwork?.idealContactRadius ?? null,
    runAroundForehand: !!footwork?.runAround,
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

  if (target?.phase === 'LOB_RETREAT') return 'CROSSOVER';
  if (adx < 0.45 && ady < 0.45) return 'ADJUST';
  if (movingBack && ady > 1.0) return 'BACKPEDAL';
  if (adx > ady * 1.35) return adx > 1.7 ? 'CROSSOVER' : 'LATERAL';
  if (ady > 2.4) return 'CROSSOVER';
  return 'TRAVEL';
}

// Helper PT-BR:
// Caps de movimento por família. Aqui você controla "personalidade" cinemática.
function movementCaps(player, family, gs = null) {
  const talent = getTalentRuntimeEffects(player, { phase: player?.atNet ? 'NET' : 'RALLY', stamina: player?.stamina });
  const footing = getSurfaceFootingProfile(player, gs);
  const baseSpeed = (player.playerSpeed ?? PLAYER_CFG.speed) * (1 + talent.movementAdd) * footing.speedMult;
  const baseAccel = (player.playerAccel ?? PLAYER_CFG.maxAccel) * (1 + talent.accelAdd) * footing.accelMult;
  const baseDecel = (player.playerDecel ?? PLAYER_CFG.maxDecel) * footing.decelMult;

  switch (family) {
    case 'ADJUST':
      return { speed: baseSpeed * 0.58, accel: baseAccel * 1.05, decel: baseDecel * 1.15, lateral: 1.00 };
    case 'BACKPEDAL':
      return { speed: baseSpeed * MOVEMENT.backwardSpeedMult * 0.94, accel: baseAccel * 0.90, decel: baseDecel * 0.98, lateral: 0.72 };
    case 'LATERAL':
      return { speed: baseSpeed * MOVEMENT.lateralSpeedMult * 1.02 * footing.lateralMult, accel: baseAccel * 0.98, decel: baseDecel * 1.03, lateral: 1.00 };
    case 'CROSSOVER':
      return { speed: baseSpeed * 1.06, accel: baseAccel * 1.06, decel: baseDecel * 0.96, lateral: 0.90 };
    default:
      return { speed: baseSpeed * 0.94, accel: baseAccel, decel: baseDecel, lateral: 0.88 };
  }
}

// Helper PT-BR:
// Steering físico: acelera/freia até o alvo respeitando stamina e inércia.
function applySteering(player, target, dt, family, gs = null) {
  const dx = target.x - player.pos.x;
  const dy = target.y - player.pos.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const dirX = dist > 1e-5 ? dx / dist : 0;
  const dirY = dist > 1e-5 ? dy / dist : 0;
  const caps = movementCaps(player, family, gs);

  const staminaFrac = clamp(player.stamina ?? 1.0, 0, 1);
  const resistance = clamp((player?.attrs?.resistencia ?? 70) / 100, 0, 1);
  // Resistência não deixa o jogador mais rápido descansado; ela preserva uma
  // parcela maior da perna quando a stamina acabou. Isso faz a diferença aparecer
  // no fim do set, não no primeiro sprint da partida.
  const fatigueProtection = clamp((resistance - 0.45) / 0.55 + getTalentRuntimeEffects(player).fatigueProtectionAdd, 0, 1);
  const effectiveStamina = clamp(staminaFrac + (1 - staminaFrac) * fatigueProtection * 0.24, 0, 1);
  const speedStamina = STAMINA.speedMinFactor + effectiveStamina * (1 - STAMINA.speedMinFactor);
  const accelStamina = INERTIA.staminaAccelMin + effectiveStamina * (1 - INERTIA.staminaAccelMin);
  const currentSpeed = Math.sqrt(player.vel.x * player.vel.x + player.vel.y * player.vel.y);
  const surfaceFooting = updateSurfaceFooting(player, gs, { target, currentSpeed, baseDecel: player.playerDecel ?? PLAYER_CFG.maxDecel });
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

  let dvx = desiredVx - player.vel.x;
  let dvy = desiredVy - player.vel.y;
  let dvMag = Math.sqrt(dvx * dvx + dvy * dvy) || 1e-9;
  let maxAccelStep = caps.accel * accelStamina * dt;
  let maxDecelStep = caps.decel * dt;

  if (surfaceFooting.slideActive) {
    const carry = surfaceFooting.momentumCarry;
    desiredVx = desiredVx * (1 - carry) + player.vel.x * carry;
    desiredVy = desiredVy * (1 - carry) + player.vel.y * carry;
    maxDecelStep *= 0.92 + surfaceFooting.slideControl * 0.10;
  }
  if (surfaceFooting.slipRisk > 0) {
    maxAccelStep *= 1 - surfaceFooting.slipRisk * 0.34;
    maxDecelStep *= 1 - surfaceFooting.slipRisk * 0.22;
  }

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

  const committedSteering = applyBodyCommitmentToSteering(player, {
    desiredVx,
    desiredVy,
    maxAccelStep,
    maxDecelStep,
  });
  desiredVx = committedSteering.desiredVx;
  desiredVy = committedSteering.desiredVy;
  maxAccelStep = committedSteering.maxAccelStep;
  maxDecelStep = committedSteering.maxDecelStep;

  const splitSteering = applySplitStepToSteering(player, {
    desiredVx,
    desiredVy,
    maxAccelStep,
    maxDecelStep,
  });
  desiredVx = splitSteering.desiredVx;
  desiredVy = splitSteering.desiredVy;
  maxAccelStep = splitSteering.maxAccelStep;
  maxDecelStep = splitSteering.maxDecelStep;

  // Os vetores precisam refletir o carry aplicado acima, não o alvo original.
  dvx = desiredVx - player.vel.x;
  dvy = desiredVy - player.vel.y;
  dvMag = Math.sqrt(dvx * dvx + dvy * dvy) || 1e-9;

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

  const oldX = player.pos.x;
  const oldY = player.pos.y;
  player.pos.x += player.vel.x * dt;
  player.pos.y += player.vel.y * dt;
  player.pos.x = clamp(player.pos.x, -COURT.singlesW / 2 - THRESHOLDS.outerPlayerX, COURT.singlesW / 2 + THRESHOLDS.outerPlayerX);
  player.pos.y = clamp(player.pos.y, -COURT.halfL - THRESHOLDS.outerPlayerY, COURT.halfL + THRESHOLDS.outerPlayerY);

  // Corrida passa a cansar de verdade. A distância percorrida é pequena por
  // frame, mas rallies longos e perseguições cruzadas acumulam um custo visível.
  const travelled = Math.hypot(player.pos.x - oldX, player.pos.y - oldY);
  const familyCost = family === 'CROSSOVER' ? 1.28 : family === 'BACKPEDAL' ? 1.18 : family === 'LATERAL' ? 1.12 : family === 'TRAVEL' ? 1.06 : 0.68;
  const courtCost = gs?.courtMods?.staminaDecayMult ?? 1;
  const resistanceDrain = clamp(1.28 - resistance * 0.56, 0.72, 1.14);
  const wrongFootCost = (player?._tm?.bodyCommitment?.reversalTimer ?? 0) > 0 ? 1.14 : 1;
  // O golpe já tem custo físico próprio. Mantemos corrida relevante em perseguições,
  // mas evitamos somar um segundo dreno alto em cada frame de rally.
  const movementDrain = travelled * 0.0020 * familyCost * courtCost * resistanceDrain * wrongFootCost * (surfaceFooting.energyMult ?? 1);
  player.stamina = clamp((player.stamina ?? 1) - movementDrain, 0, 1);
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
  const defense = clamp((player?.attrs?.defesa ?? 60) / 100, 0, 1);
  // `player.reach` é o alcance corporal de referência. Um groundstroke normal
  // usa rotação de tronco + extensão da raquete sem ser uma estirada defensiva.
  const normalContactReach = baseReach * 1.14;
  // Defesa só amplia o alcance na zona de recuperação. Uma bola confortável
  // continua igual para todos; a diferença aparece quando o jogador chega no limite.
  const recoveryReachMult = 1 + clamp((defense - 0.42) / 0.58, 0, 1) * 0.12 + getTalentRuntimeEffects(player, { phase: player?.atNet ? 'NET' : 'RALLY' }).defenseReachBonus;
  const recoveryReach = normalContactReach * recoveryReachMult;
  const useRecoveryReach = d > normalContactReach;
  const contactReach = useRecoveryReach ? recoveryReach : normalContactReach;
  const moveClass = d <= normalContactReach ? 'NORMAL_HIT' : d <= recoveryReach * 1.04 ? 'EMERGENCY_REACH' : 'CHASE';
  const aerialWindow = !hasBounced
    && (player.atNet || getCourtMode(player) === 'NET' || plan?.phase === 'NET_CUT')
    && ball.pos.z < THRESHOLDS.ballHitMaxZ + 0.72;
  const overheadWindow = ball.lastHitBy !== player.id
    && sideOk
    && ball.pos.z >= 1.55
    && ball.pos.z < THRESHOLDS.ballHitMaxZ + 0.72
    && d <= contactReach * 1.18;
  const canContactRaw = sideOk
    && d <= contactReach * (aerialWindow || overheadWindow ? 1.18 : 1.04)
    && (ball.pos.z < THRESHOLDS.ballHitMaxZ + 0.3 || aerialWindow || overheadWindow)
    && ball.lastHitBy !== player.id;
  const execDistNorm = clamp(1 - d / Math.max(contactReach * 1.04, 0.1), 0, 1);
  const execHeightNorm = clamp(1 - Math.abs((ball.pos.z ?? prefZ) - prefZ) / 0.44, 0, 1);
  const execRiseNorm = clamp(1 - Math.max(0, minZ - (ball.pos.z ?? minZ)) / 0.24, 0, 1);
  const executionScore = clamp(execDistNorm * 0.52 + execHeightNorm * 0.33 + execRiseNorm * 0.15, 0, 1);
  
  const localBallPassedWindow = hasBounced
    && sideOk
    && ball.lastBounceSide === player.side
    && ball.lastHitBy !== player.id
    && d <= contactReach * 1.08
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
  player._movementDistanceToBall = d;
  player._movementBaseReach = baseReach;
  player._movementNormalContactReach = normalContactReach;
  player._movementContactReach = contactReach;
  player._movementEmergencyReachActive = moveClass === 'EMERGENCY_REACH';
  player._defensiveContact = {
    active: moveClass === 'EMERGENCY_REACH' || moveClass === 'CHASE' || (player._arrivalMargin ?? 0) < -0.12,
    defense,
    reachMult: recoveryReachMult,
    emergency: moveClass === 'EMERGENCY_REACH' || moveClass === 'CHASE',
  };
  player._movementContactClass = isAerialIntercept
    ? 'AERIAL_INTERCEPT'
    : overheadWindow
      ? 'OVERHEAD'
    : canContact ? moveClass : localBallPassedWindow
        ? 'LOCAL_BOUNCE_HIT'
        : 'CHASE';
  player._movementContactScore = clamp(1 - d / Math.max(contactReach * 1.12, 0.1), 0, 1);
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
    const approachQ = clamp(player?.ctx?._approachQuality ?? 0.5, 0, 1);
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
    perception: null,
    bodyCommitment: null,
    splitStep: null,
    planState: null,
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
    player._commitDistanceRaw = null;
    player._contactPositionError = null;
    return 0;
  }

  const dx = (target.x ?? player.pos.x) - player.pos.x;
  const dy = (target.y ?? player.pos.y) - player.pos.y;
  const commitDistanceRaw = Math.sqrt(dx * dx + dy * dy);
  const speed = Math.hypot(player.vel?.x ?? 0, player.vel?.y ?? 0);
  const baseReach = Math.max(player._movementBaseReach ?? player.reach ?? PLAYER_CFG.reach, 0.1);
  const contactReach = Math.max(player._movementContactReach ?? baseReach, baseReach);
  const arrivalMargin = player._arrivalMargin ?? 0;
  const contactScore = player._movementContactScore ?? 0;
  const liveContactDistance = Number.isFinite(player._movementDistanceToBall)
    ? player._movementDistanceToBall
    : commitDistanceRaw;
  const inLiveContactWindow = !!player._movementCanContactBall || !!player._movementCanExecutePlannedShot;

  // O alvo do preditor é o ponto da BOLA. O corpo não precisa ocupar esse
  // ponto: um contato preparado acontece dentro de uma "casca" de alcance da
  // raquete. Medir distância absoluta até zero fazia qualquer golpe a 70–95 cm
  // parecer uma perseguição ainda incompleta.
  const idealContactRadius = player?._footworkPlan?.idealContactRadius ?? baseReach * 0.86;
  const distanceForReadiness = inLiveContactWindow
    ? (player?._footworkPlan ? liveContactDistance : Math.min(commitDistanceRaw, liveContactDistance))
    : commitDistanceRaw;
  const contactPositionError = Math.abs(distanceForReadiness - idealContactRadius);
  const commitDistance = distanceForReadiness;

  const explosiveness = clamp((player?.attrs?.explosividade ?? 60) / 100, 0, 1);
  const reading = clamp((player?.attrs?.leitura ?? 60) / 100, 0, 1);
  const decelSkill = explosiveness * 0.62 + reading * 0.38;
  const closeScore = clamp(1 - contactPositionError / Math.max(contactReach * 0.72, 0.25), 0, 1);
  const settledSpeedLimit = 1.85 + decelSkill * 0.90;
  const speedScore = clamp(1 - speed / settledSpeedLimit, 0, 1);
  const timingScore = clamp((arrivalMargin + 0.10) / 0.34, 0, 1);
  const sensorScore = clamp(contactScore, 0, 1);
  const footingStability = clamp(player?._surfaceFooting?.stability ?? 1, 0, 1);
  const rawReadiness = clamp(
    closeScore * 0.40
      + speedScore * 0.24
      + timingScore * 0.22
      + sensorScore * 0.14
      - (1 - footingStability) * 0.14,
    0,
    1,
  );

  const inSetZone = contactPositionError <= contactReach * 0.38
    && speed <= settledSpeedLimit
    && arrivalMargin > -0.12;
  player._tm.contactSettleTime = inSetZone
    ? clamp((player._tm.contactSettleTime ?? 0) + dt, 0, 0.42)
    : clamp((player._tm.contactSettleTime ?? 0) - dt * 1.8, 0, 0.42);

  const settleBoost = clamp((player._tm.contactSettleTime ?? 0) / 0.16, 0, 1) * 0.16;
  const previous = player._tm.contactReadiness ?? 0;
  const blendUp = rawReadiness > previous ? 0.46 : 0.28;
  const blendedReadiness = previous + (rawReadiness + settleBoost - previous) * blendUp;
  // O primeiro frame dentro da janela de contato não pode herdar quase toda a
  // prontidão baixa da corrida anterior. O snapshot atual já conhece distância,
  // velocidade e timing; quando o contato abriu, ele é a fonte mais fiel.
  const liveContactFloor = inLiveContactWindow ? rawReadiness * 0.90 : 0;
  const readiness = clamp(Math.max(blendedReadiness, liveContactFloor), 0, 1);

  player._tm.contactReadiness = readiness;
  player._contactReadiness = readiness;
  player._contactSettleTime = player._tm.contactSettleTime;
  player._commitDistance = commitDistance;
  player._commitDistanceRaw = commitDistanceRaw;
  player._contactPositionError = contactPositionError;
  player._footworkSpacingQuality = clamp(1 - contactPositionError / Math.max(baseReach * 0.46, 0.22), 0, 1);
  // Alcance amplo não é sinônimo de estirada. Se o jogador chegou com timing,
  // postura e distância controláveis, o contato é um groundstroke em movimento.
  // Mantemos EMERGENCY_REACH para quem realmente chega tarde ou desmontado.
  if (player._movementContactClass === 'EMERGENCY_REACH'
      && readiness >= 0.24
      && arrivalMargin > -0.18
      && contactPositionError <= contactReach * 0.46) {
    player._movementContactClass = 'MOVING_HIT';
    player._movementEmergencyReachActive = false;
    if (player._defensiveContact) {
      player._defensiveContact.active = false;
      player._defensiveContact.emergency = false;
    }
  }
  return readiness;
}

// Helper PT-BR:
// Estima chegada respeitando velocidade atual e aceleração. distance/speed puro
// tratava primeira passada e frenagem como instantâneas, escondendo a diferença
// entre correr até a bola e realmente chegar a tempo de montar o golpe.
function estimateArrivalTime(player, target, caps, effectiveSpeed) {
  const dx = (target?.x ?? player.pos.x) - player.pos.x;
  const dy = (target?.y ?? player.pos.y) - player.pos.y;
  const distance = Math.hypot(dx, dy);
  if (distance <= 0.001) return 0;

  const dirX = dx / distance;
  const dirY = dy / distance;
  const projectedSpeed = Math.max(0, (player.vel?.x ?? 0) * dirX + (player.vel?.y ?? 0) * dirY);
  const accel = Math.max(2.5, caps?.accel ?? player.playerAccel ?? PLAYER_CFG.maxAccel);
  const topSpeed = Math.max(2.05, effectiveSpeed);
  const accelTime = Math.max(0, (topSpeed - projectedSpeed) / accel);
  const accelDistance = projectedSpeed * accelTime + 0.5 * accel * accelTime * accelTime;

  if (distance <= accelDistance) {
    return Math.max(0, (-projectedSpeed + Math.sqrt(projectedSpeed * projectedSpeed + 2 * accel * distance)) / accel);
  }
  return accelTime + (distance - accelDistance) / topSpeed;
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
  player._easyHighBounceAttack = false;
  player._movementCanContactBall = false;
  player._movementCanExecutePlannedShot = false;
  player._movementContactClass = null;
  player._returnAdaptiveBias = { x: 0, y: 0, confidence: 0 };
  player._wrongFootPenalty = null;
  player._movementContactScore = 0;
  player._movementDistanceToBall = null;
  player._movementBaseReach = null;
  player._movementNormalContactReach = null;
  player._movementContactReach = null;
  player._movementEmergencyReachActive = false;
  player._defensiveContact = null;
  player._contactReadiness = 0;
  player._contactSettleTime = 0;
  player._commitDistance = null;
  player._commitDistanceRaw = null;
  player._contactPositionError = null;
  player._contactTimingPlan = null;
  resetFootworkPlan(player);
  player._footworkSpacingQuality = null;
  resetSurfaceFooting(player);
  resetMovementCoherence(player);
  resetRecoveryPositioning(player);
  resetMovementPlanState(player);
  resetCourtMovementState(player);
  player._bounceReplanTimer = 0;
  player._movementCommit = null;
  player._approachAnchor = null;
  player._variedWaitXOffset = 0;
  player._variedWaitSeedShotX = undefined;
  player._variedWaitSeedRally = undefined;
  player._serveReturnFlightActive = false;
  player._perceptionState = null;
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

  const ball = gs.ball;
  const prevLastHitBy = player._tm.lastHitBy;
  const myJustHit = ball.lastHitBy === player.id && prevLastHitBy !== player.id;
  const oppJustHit = ball.lastHitBy !== player.id && ball.lastHitBy !== player._tm.lastHitBy;
  player._tm.lastHitBy = ball.lastHitBy;
  const perceivedBall = ball.lastHitBy !== player.id
    ? updateMovementPerception(player, gs, dt, oppJustHit)
    : ball;
  updateCourtMovementState(player, gs, perceivedBall);
  const baseTarget = computeBaseTarget(player, gs);
  player.basePos.x = baseTarget.x;
  player.basePos.y = baseTarget.y;

  if (myJustHit) {
    player._tm.splitStep = null;
    syncLegacySplitFields(player);
    const currSpeed = Math.sqrt(player.vel.x * player.vel.x + player.vel.y * player.vel.y);
    const contactClass = player._movementContactClass ?? 'NORMAL_HIT';
    const stretchBonus = contactClass === 'EMERGENCY_REACH' ? 0.040 : contactClass === 'CHASE' ? 0.028 : 0.0;
    const recoverySkill = clamp(
      ((player?.attrs?.explosividade ?? 60) * 0.55
        + (player?.attrs?.velocidade ?? 60) * 0.25
        + (player?.attrs?.leitura ?? 60) * 0.20) / 100,
      0,
      1,
    );
    const recoveryFactor = clamp(1.11 - recoverySkill * 0.20, 0.90, 1.04);
    const duration = clamp((0.12 + currSpeed * 0.013 + stretchBonus) * recoveryFactor, 0.105, 0.22);
    const carry = clamp((0.40 + currSpeed * 0.032 + stretchBonus * 0.7) * (1.08 - recoverySkill * 0.16), 0.34, 0.62);
    player._tm.recoverInertiaTimer = duration;
    player._tm.recoverInertiaDuration = duration;
    player._tm.recoverInertiaCarry = carry;
  }

  if (oppJustHit) {
    const isServeReturn = (gs.rally ?? 0) === 0 && player.id === gs.receiver;
    beginSplitStep(player, gs, isServeReturn);
  }
  updateSplitStep(player, dt);

  const defendNow = ball.lastHitBy !== player.id && (ballIsComingToPlayer(player, ball) || ballOnPlayerHalf(player, ball));
  let target = baseTarget;
  let targetTime = 0.24;
  let phase = 'RECOVER';
  let contactPlan = null;

  if (defendNow) {
    const proposedPlan = planInterception({
      player,
      gs,
      beliefBall: perceivedBall,
      baseTarget,
      profile: buildInterceptProfile(player),
    });
    if (!proposedPlan) return;
    const shotKey = player?._tm?.perception?.shotKey ?? `${ball.lastHitBy}:${gs.rally ?? 0}`;
    const plan = stabilizeMovementPlan(player, proposedPlan, {
      shotKey,
      confidence: player?._perceptionState?.confidence ?? 0.5,
      bounceCount: ball.bounceCount ?? 0,
      dt,
    });
    contactPlan = plan;
    player._tm.commit = { ...plan };
    if (plan.phase === 'LOB_RETREAT') {
      player.atNet = false;
      player.ctx.courtMode = 'BASE';
      player.ctx.netPhase = 'BASE';
    }
    // Durante READ o jogador faz o split e conserva a posição de cobertura;
    // a rota prevista existe como hipótese, mas ainda não comanda suas pernas.
    target = plan.movementState === 'READ' ? baseTarget : player._tm.commit;
    targetTime = clamp(target.t ?? 0.24, 0.04, 1.10);
    phase = plan.movementState ?? plan.phase;
    const staminaFrac = clamp(player.stamina ?? 1.0, 0, 1);
    const arrivalFamily = chooseMoveFamily(player, target);
    const caps = movementCaps(player, arrivalFamily, gs);
    const nominalSpeed = player.playerSpeed ?? PLAYER_CFG.speed;
    const effSpeed = Math.max(
      2.05,
      Math.max(nominalSpeed * 0.94, caps.speed) * (STAMINA.speedMinFactor + staminaFrac * (1 - STAMINA.speedMinFactor)),
    );
    const distance = Math.sqrt(dist2(player.pos, target));
    const read = clamp((player?.attrs?.leitura ?? 60) / 100, 0, 1);
    const perceptionConfidence = clamp(player?._perceptionState?.confidence ?? read, 0, 1);
    const anticipationLift = clamp((perceptionConfidence - 0.50) * 0.050, -0.020, 0.024);
    const commitment = updateBodyCommitment(player, target, dt, {
      shotKey: player?._tm?.perception?.shotKey ?? `${ball.lastHitBy}:${gs.rally ?? 0}`,
      perceptionConfidence,
      perceptionSkill: player?._tm?.perception?.skill ?? read,
      targetTime,
      // Contrapé nasce da inversão observada entre compromisso e nova rota;
      // o defensor não recebe mais o rótulo secreto criado pelo atacante.
      designedWrongFoot: false,
    });
    const wrongFootPenalty = getBodyCommitmentPenalty(player);
    const movingIntoTrap = commitment?.reversalTimer > 0
      && commitment?.source === 'RECOVERY_MOMENTUM';
    player._wrongFootPenalty = commitment?.reversalTimer > 0
      ? {
          strength: +(commitment.reversalSeverity ?? 0).toFixed(3),
          penalty: +wrongFootPenalty.toFixed(3),
          timer: +(commitment.reversalTimer ?? 0).toFixed(3),
          duration: +(commitment.reversalDuration ?? 0).toFixed(3),
          targetSign: Math.sign(commitment.pendingDirection?.x ?? target.x ?? 0),
          movingIntoTrap: !!movingIntoTrap,
          designed: false,
          source: commitment.source,
        }
      : null;
    const travelTime = estimateArrivalTime(player, target, caps, effSpeed);
    player._arrivalMargin = targetTime - travelTime + anticipationLift - wrongFootPenalty;
    const closeToContact = clamp(1 - distance / Math.max((player.reach ?? PLAYER_CFG.reach) * 2.0, 0.2), 0, 1);
    const predWeight = clamp(0.70 - closeToContact * 0.52, 0.18, 0.72);
    player._predCrossX = target.x * predWeight + (perceivedBall?.pos?.x ?? target.x) * (1 - predWeight);
    player._predCrossConfidence = predWeight * (0.32 + perceptionConfidence * 0.68);
    player._hitTarget = { x: target.x, y: target.y, z: target.z, t: targetTime };
    player._stableTarget = { x: target.x, y: target.y };
  } else {
    player._tm.commit = null;
    player._arrivalMargin = 0.30;
    player._predCrossX = baseTarget.x;
    player._predCrossConfidence = 0.65;
    player._hitTarget = null;
    player._tm.bodyCommitment = null;
    player._stableTarget = { x: baseTarget.x, y: baseTarget.y };
    player._holdForRiseActive = false;
    player._movementCanContactBall = false;
    player._movementCanExecutePlannedShot = false;
    player._movementContactClass = null;
    updateContactReadiness(player, null, dt, false);
  }

  const family = chooseMoveFamily(player, target);
  applySteering(player, target, dt, family, gs);
  if (defendNow) {
    // Sensores precisam observar a posição DEPOIS do deslocamento do frame.
    // Antes eram capturados antes do steering e reutilizados depois, produzindo
    // distância/readiness atrasadas exatamente no instante do contato.
    refreshContactFlags(player, gs, contactPlan);
    updateContactReadiness(player, target, dt, true);
  }
  player._movementCoherence = evaluateMovementCoherence({ player, gs, contactPlan, defendNow });
  if (player._tm.recoverInertiaTimer > 0) {
    player._tm.recoverInertiaTimer = Math.max(0, player._tm.recoverInertiaTimer - dt);
  }

  // A primeira passada nasce da qualidade/timing do split, não de um boost fixo.
  const splitImpulse = getSplitStepImpulse(player);
  if (splitImpulse > 0) {
    if (defendNow && (player._tm.bodyCommitment?.reversalTimer ?? 0) <= 0) {
      const bdx = target.x - player.pos.x;
      const bdy = target.y - player.pos.y;
      const bdist = Math.sqrt(bdx * bdx + bdy * bdy);
      if (bdist > 0.18) {
        const boostAccel = (player.playerAccel ?? PLAYER_CFG.maxAccel) * splitImpulse;
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
    splitPhase: player._tm.splitStep?.phase ?? null,
    splitTiming: player._tm.splitStep?.timing ?? null,
    splitQuality: +(player._tm.splitStep?.quality ?? 0).toFixed(3),
    splitLandingOffset: +(player._tm.splitStep?.landingOffset ?? 0).toFixed(3),
    splitImpulse: +getSplitStepImpulse(player).toFixed(3),
    recoverInertia: +(player._tm.recoverInertiaTimer ?? 0).toFixed(3),
    runbackScore: +(player._tm.runbackScore ?? 0).toFixed(3),
    predCrossConfidence: +(player._predCrossConfidence ?? 0).toFixed(3),
    returnBiasX: +((player._returnAdaptiveBias?.x ?? 0)).toFixed(3),
    returnBiasY: +((player._returnAdaptiveBias?.y ?? 0)).toFixed(3),
    returnBiasConf: +((player._returnAdaptiveBias?.confidence ?? 0)).toFixed(3),
    perceptionConfidence: +(player._perceptionState?.confidence ?? 1).toFixed(3),
    perceptionUncertainty: +(player._perceptionState?.uncertainty ?? 0).toFixed(3),
    perceptionDelay: +(player._perceptionState?.reactionDelay ?? 0).toFixed(3),
    perceptionAge: +(player._perceptionState?.age ?? 0).toFixed(3),
    perceptionLaneError: +(player._perceptionState?.laneError ?? 0).toFixed(3),
    beliefVersion: player._perceptionState?.version ?? null,
    beliefPositionError: +(player._perceptionState?.positionError ?? 0).toFixed(3),
    inferredShape: player._perceptionState?.inferredShape ?? 'UNKNOWN',
    movementPlanVersion: contactPlan?.planVersion ?? contactPlan?.version ?? null,
    movementState: contactPlan?.movementState ?? phase,
    planRevisionBudget: +(contactPlan?.revisionBudget ?? 0).toFixed(3),
    planRevisions: contactPlan?.revisions ?? 0,
    planCorrectionCost: +(contactPlan?.correctionCost ?? 0).toFixed(3),
    interceptionKind: contactPlan?.selectedKind ?? null,
    interceptionUncertainty: +(contactPlan?.uncertainty ?? 0).toFixed(3),
    courtMovementStateVersion: player?._courtMovementState?.version ?? null,
    courtMovementMode: player?._courtMovementState?.mode ?? getCourtMode(player),
    courtMovementEvent: player?._courtMovementState?.event ?? null,
    contactScore: +(player._movementContactScore ?? 0).toFixed(3),
    contactReadiness: +(player._contactReadiness ?? 0).toFixed(3),
    contactSettleTime: +(player._contactSettleTime ?? 0).toFixed(3),
    distanceToBall: player._movementDistanceToBall != null ? +player._movementDistanceToBall.toFixed(3) : null,
    baseReach: player._movementBaseReach != null ? +player._movementBaseReach.toFixed(3) : null,
    normalContactReach: player._movementNormalContactReach != null ? +player._movementNormalContactReach.toFixed(3) : null,
    contactReach: player._movementContactReach != null ? +player._movementContactReach.toFixed(3) : null,
    contactClass: player._movementContactClass ?? null,
    commitDistance: player._commitDistance != null ? +player._commitDistance.toFixed(3) : null,
    commitDistanceRaw: player._commitDistanceRaw != null ? +player._commitDistanceRaw.toFixed(3) : null,
    contactPositionError: player._contactPositionError != null ? +player._contactPositionError.toFixed(3) : null,
    contactTiming: contactPlan?.contactTiming ?? null,
    contactTimingReason: contactPlan?.contactTimingReason ?? null,
    contactCandidateCount: contactPlan?.contactCandidateCount ?? 0,
    waitedForBetterContact: !!contactPlan?.waitedForBetterContact,
    appliedContactWait: !!contactPlan?.appliedContactWait,
    footworkStance: contactPlan?.footworkStance ?? null,
    footworkWing: contactPlan?.footworkWing ?? null,
    footworkPreparation: contactPlan?.footworkPreparation ?? null,
    footworkSpacingQuality: player?._footworkSpacingQuality ?? null,
    runAroundForehand: !!contactPlan?.runAroundForehand,
    footingSurface: player?._surfaceFooting?.surface ?? null,
    footingStability: player?._surfaceFooting?.stability ?? null,
    footingTraction: player?._surfaceFooting?.traction ?? null,
    surfaceSlide: !!player?._surfaceFooting?.slideActive,
    surfaceSlideControl: player?._surfaceFooting?.slideControl ?? 0,
    surfaceSlipRisk: player?._surfaceFooting?.slipRisk ?? 0,
    surfaceBrakingDistance: player?._surfaceFooting?.brakingDistance ?? null,
    movementEngineVersion: player?._movementCoherence?.version ?? null,
    movementCoherence: player?._movementCoherence?.score ?? 1,
    movementCoherenceSeverity: player?._movementCoherence?.severity ?? 0,
    movementCoherenceFlags: player?._movementCoherence?.flags ?? [],
    movementCoherenceReason: player?._movementCoherence?.reason ?? null,
    recoveryAnchorX: player?._recoveryPositioning?.x ?? null,
    recoveryAnchorY: player?._recoveryPositioning?.y ?? null,
    recoveryIdealX: player?._recoveryPositioning?.idealX ?? null,
    recoveryConfidence: player?._recoveryPositioning?.confidence ?? null,
    recoveryReason: player?._recoveryPositioning?.reason ?? null,
    wrongFootPenalty: player._wrongFootPenalty ?? null,
    wrongFootRecovery: +(player._tm.bodyCommitment?.reversalTimer ?? 0).toFixed(3),
    bodyCommitmentPhase: player._tm.bodyCommitment?.phase ?? null,
    bodyCommitmentStrength: +(player._tm.bodyCommitment?.strength ?? 0).toFixed(3),
    bodyReversalSeverity: +(player._tm.bodyCommitment?.reversalSeverity ?? 0).toFixed(3),
    bodyCorrectionCount: player._tm.bodyCommitment?.correctionCount ?? 0,
    bodyFooled: !!player._tm.bodyCommitment?.fooled,
    bodyCommitmentSource: player._tm.bodyCommitment?.source ?? null,
  };
}





