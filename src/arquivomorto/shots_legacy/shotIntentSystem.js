import { clamp } from '../../core/math.js';
import { APPROACH_BALL_TIERS, APPROACH_GATES, FINISH_GATES, PRESSURE_GATES } from './shotPoolsConfig.js';

const HALF_L = 11.885;

function resolveOpponentAtNetInfo(opponent) {
  const oppY = opponent?.pos?.y ?? HALF_L;
  const inferredAtNet = Math.abs(oppY) < HALF_L * 0.35;
  return {
    value: opponent?.atNet ?? inferredAtNet,
    source: opponent?.atNet != null ? 'flag' : 'depth',
    oppY: +oppY.toFixed(3),
    thresholdY: +(HALF_L * 0.35).toFixed(3),
    inferredAtNet,
  };
}

export function resolveShotIntent(player, opponent, ballTier, rally, prefs, ctx = {}) {
  if (ballTier === 'DIFFICULT') {
    return {
      intent: 'RESET',
      reason: 'DIFFICULT_BALL',
      diagnostics: {
        winner: 'RESET',
        ballTier,
        rally,
      },
    };
  }

  const netIntent = clamp(ctx?.netIntent ?? 0, 0, 1);
  const openWindow = clamp(Math.abs(opponent?.pos?.x ?? 0) / 2.3, 0, 1);
  const oppAtNetInfo = resolveOpponentAtNetInfo(opponent);
  const oppAtNet = oppAtNetInfo.value;
  const approachGate = APPROACH_GATES[prefs?.netGame] ?? Infinity;
  const allowedBallTiers = APPROACH_BALL_TIERS[prefs?.netGame] ?? ['OPPORTUNITY', 'NEUTRAL'];
  const approachBallOk = allowedBallTiers.includes(ballTier);

  const finishGate = FINISH_GATES[prefs?.rallyCadence] ?? 5;
  // [FIX-INTENT-1] Janela de ataque aberta acelera mais a entrada no FINISH.
  // Antes: situAccelerator=2 → effectiveFinishGate=max(1,5-2)=3 para BALANCED.
  // Agora: situAccelerator=4 para quadra muito aberta (>0.35), 3 para aberta (>0.22).
  // Resultado: BALANCED vira FINISH no rally>=1 (quadra muito aberta) ou rally>=2 (aberta).
  // Isso faz ACCEL/SHORT_ACCEL dominarem o pool quando a bola é fácil E a janela existe,
  // em vez de cair no BUILD onde TOPSPIN é sempre o âncora dominante.
  const situAccelerator =
    (ballTier === 'OPPORTUNITY' && openWindow > 0.35) ? 4 :
    (ballTier === 'OPPORTUNITY' && openWindow > 0.22) ? 3 : 0;
  const effectiveFinishGate = Math.max(1, finishGate - situAccelerator);
  const diagnosticsBase = {
    ballTier,
    rally,
    netIntent: +netIntent.toFixed(3),
    openWindow: +openWindow.toFixed(3),
    oppAtNet: oppAtNetInfo,
    gates: {
      approachGate,
      finishGate,
      effectiveFinishGate,
    },
    approachBallOk,
  };

  // [FIX-B] FINISH vs PRESSURE quando adversário está na rede.
  // Antes: qualquer bola não-DIFFICULT com oppAtNet disparava FINISH (pool agressivo).
  // Agora: só OPPORTUNITY justifica FINISH contra jogador de rede.
  //   NEUTRAL + oppAtNet → PRESSURE (pool mais equilibrado: DRIVE/TOPSPIN dominam,
  //   menos ACCEL/BANANA) — jogador não deve tentar winner de posição medíocre.
  //   OPPORTUNITY + oppAtNet → FINISH (bola boa = pode tentar o passing decisivo).
  if (oppAtNet && ballTier === 'OPPORTUNITY') {
    return {
      intent: 'FINISH',
      reason: 'OPP_AT_NET_OPPORTUNITY',
      cadenceGate: effectiveFinishGate,
      diagnostics: { ...diagnosticsBase, winner: 'FINISH', trigger: 'opp_at_net_opportunity' },
    };
  }
  if (oppAtNet && ballTier === 'NEUTRAL') {
    return {
      intent: 'PRESSURE',
      reason: 'OPP_AT_NET_NEUTRAL',
      diagnostics: { ...diagnosticsBase, winner: 'PRESSURE', trigger: 'opp_at_net_neutral' },
    };
  }
  if (ballTier === 'OPPORTUNITY' && rally >= effectiveFinishGate) {
    return {
      intent: 'FINISH',
      reason: 'OPPORTUNITY_WINDOW',
      cadenceGate: effectiveFinishGate,
      diagnostics: { ...diagnosticsBase, winner: 'FINISH', trigger: 'opportunity_window' },
    };
  }

  if (!oppAtNet && netIntent > approachGate && approachBallOk) {
    return {
      intent: 'APPROACH',
      reason: 'NET_INTENT',
      netGate: approachGate,
      diagnostics: { ...diagnosticsBase, winner: 'APPROACH', trigger: 'net_intent' },
    };
  }

  const pressureGate = PRESSURE_GATES[prefs?.rallyCadence] ?? 3;
  const canPressure =
    rally >= pressureGate &&
    ballTier !== 'DIFFICULT' &&
    (openWindow > 0.18 || rally >= pressureGate + 2);

  if (canPressure) {
    return {
      intent: 'PRESSURE',
      reason: 'RALLY_CADENCE',
      cadenceGate: pressureGate,
      diagnostics: {
        ...diagnosticsBase,
        winner: 'PRESSURE',
        trigger: 'rally_cadence',
        gates: {
          ...diagnosticsBase.gates,
          pressureGate,
        },
      },
    };
  }

  return {
    intent: 'BUILD',
    reason: 'DEFAULT_BUILD',
    diagnostics: { ...diagnosticsBase, winner: 'BUILD', trigger: 'default_build' },
  };
}
