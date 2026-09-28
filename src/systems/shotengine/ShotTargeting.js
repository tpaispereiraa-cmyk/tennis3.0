import { COURT } from '../../core/constants.js';
import { clamp, rand } from '../../core/math.js';
import { ShotDirection, ShotFamily, ShotIntent, TargetDepth, TargetWidth } from './ShotTypes.js';
import { memoryDirectionNudge } from './ShotMemory.js';
import { resolveShotStyle } from './ShotStyle.js';
import { SHOT_TUNING } from './ShotTuning.js';
import { SliceProfile, sliceLandingBand } from './SliceProfiles.js';

function opponentSideY(context) {
  return -(context?.side ?? 1);
}

function depthToY(depth, side) {
  const sign = side;
  switch (depth) {
    case TargetDepth.SHORT: return sign * (COURT.serviceLineY - 1.10);
    case TargetDepth.MID:   return sign * (COURT.serviceLineY + 1.25);
    case TargetDepth.MID_DEEP: return sign * (COURT.serviceLineY + 3.25);
    case TargetDepth.DEEP:  return sign * (COURT.halfL - 1.15);
    default:                return sign * (COURT.serviceLineY + 1.10);
  }
}

/**
 * Versão exportada e estendida de depthToY.
 *
 * Unifica o cálculo de profundidade entre ShotTargeting e ReturnEngine.
 * O ReturnEngine tinha uma função `targetY` local com os mesmos casos
 * (mais MID_DEEP, FLOAT, LOB) — agora compartilha esta.
 *
 * @param {string} depth    — 'SHORT' | 'MID' | 'MID_DEEP' | 'FLOAT' | 'LOB' | 'DEEP'
 * @param {number} side     — lado do jogador que BATE (-1 ou 1); Y vai pro lado oposto
 * @param {number} [spread=1.0] — escala do spread aleatório (0 = determinístico, 1 = normal)
 */
export function rallyDepthToY(depth, side, spread = 1.0) {
  const s = Math.max(0, spread);
  const sign = -side; // bola cai no lado do oponente
  switch (depth) {
    case 'SHORT':    return sign * (COURT.serviceLineY + rand(0.15 * s, 1.05 * s));
    case 'MID':      return sign * (6.25              + rand(-0.35 * s, 0.95 * s));
    case 'MID_DEEP': return sign * (7.45              + rand(-0.30 * s, 0.90 * s));
    case 'FLOAT':    return sign * (8.95              + rand(-0.40 * s, 1.10 * s));
    case 'LOB':      return sign * (COURT.halfL        - rand(0.85 * s, 1.85 * s));
    case 'DEEP':     return sign * (COURT.halfL        - rand(1.10 * s, 2.05 * s));
    // aliases do TargetDepth enum (usado no chooseTarget padrão)
    default:         return depthToY(depth, -sign);
  }
}

function widthToX(width, direction, context) {
  const playerX = context?.player?.pos?.x ?? 0;
  const oppX = context?.opponent?.pos?.x ?? 0;
  const openSign = oppX > 0.35 ? -1 : oppX < -0.35 ? 1 : (playerX <= 0 ? 1 : -1);
  const crossSign = playerX >= 0 ? -1 : 1;
  const dtlSign = playerX >= 0 ? 1 : -1;

  if (direction === ShotDirection.CENTER) return 0;
  if (direction === ShotDirection.BODY) return clamp(oppX, -2.35, 2.35);
  if (direction === ShotDirection.WIDE) return openSign * 3.35;
  if (direction === ShotDirection.DTL) return dtlSign * 3.15;
  if (direction === ShotDirection.CROSS) return crossSign * 3.05;
  if (direction === ShotDirection.INSIDE_OUT) return crossSign * 3.35;
  if (direction === ShotDirection.INSIDE_IN) return dtlSign * 2.85;

  switch (width) {
    case TargetWidth.WIDE: return openSign * 3.25;
    case TargetWidth.ANGLE: return openSign * 3.75;
    case TargetWidth.OPEN_COURT: return openSign * 3.05;
    case TargetWidth.BODY: return clamp(oppX, -2.35, 2.35);
    default: return 0;
  }
}

function gaussian() {
  const u1 = Math.max(1e-9, rand(0, 1));
  const u2 = Math.max(1e-9, rand(0, 1));
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

function organicNoise(sigma, tailChance, tailMult) {
  const tail = rand(0, 1) < tailChance ? tailMult : 1;
  return gaussian() * sigma * tail;
}

function surfaceSpread(context) {
  const courtMods = context?.gs?.courtMods ?? context?.courtMods ?? {};
  const courtPhys = context?.gs?.courtPhysics ?? {};
  const variance = courtMods?.bounceVariance ?? courtPhys?.bounceVariance ?? 0;
  const surface = String(courtPhys?.surface ?? context?.court?.surface ?? '').toUpperCase();
  const surfaceBase = surface.includes('SAIBRO') || surface.includes('CLAY') ? 0.14
    : surface.includes('GRAMA') || surface.includes('GRASS') ? 0.34
      : surface.includes('CARPET') || surface.includes('VELUDO') ? 0.24
        : surface.includes('INDOOR') ? 0.08
          : 0.16;
  return surfaceBase + variance * SHOT_TUNING.realism.rally.surfaceSpread;
}

function clampRallyX(x, margin = 0.28) {
  return clamp(x, -COURT.singlesW / 2 + margin, COURT.singlesW / 2 - margin);
}

function clampRallyY(y, sideSign, margin = 0.42) {
  return clamp(
    y,
    sideSign > 0 ? 0.72 : -COURT.halfL + margin,
    sideSign > 0 ? COURT.halfL - margin : -0.72,
  );
}

function depthBand(depth, sideSign, family, intent, q, shotStyle, sliceProfile = null) {
  const abs = (() => {
    // Deixadinha ofensiva precisa cair depois da rede, não morrer na fita.
    // A faixa anterior permitia alvos curtos demais para a física do motor.
    if (family === ShotFamily.DROP) return rand(3.35, 4.65);
    if (family === ShotFamily.SLICE && sliceProfile) {
      const [min, max] = sliceLandingBand(sliceProfile, { quality: q });
      return rand(min, max);
    }
    if (family === ShotFamily.LOB) return COURT.halfL - rand(0.75, 1.85);
    if (depth === TargetDepth.SHORT) return COURT.serviceLineY + rand(-0.25, 0.95);
    if (depth === TargetDepth.MID) return rand(6.55, 8.35);
    if (depth === TargetDepth.MID_DEEP) return rand(8.20, 9.70);
    if (intent === ShotIntent.CONTROL) return COURT.halfL - rand(1.45, 2.85);
    if (intent === ShotIntent.DEFEND || intent === ShotIntent.RESET) return COURT.halfL - rand(q > 0.62 ? 1.35 : 2.25, q > 0.62 ? 3.10 : 4.05);
    if (shotStyle?.isPatient && intent === ShotIntent.BUILD) return COURT.halfL - rand(1.10, 2.35);
    if (intent === ShotIntent.FINISH) return rand(7.25, 10.85);
    return COURT.halfL - rand(1.05, 2.75);
  })();
  return sideSign * abs;
}

function widthBand(width, direction, context, family, intent, q) {
  const r = SHOT_TUNING.realism.rally;
  const playerX = context?.player?.pos?.x ?? 0;
  const oppX = context?.opponent?.pos?.x ?? 0;
  const openSign = oppX > 0.35 ? -1 : oppX < -0.35 ? 1 : (playerX <= 0 ? 1 : -1);
  const crossSign = playerX >= 0 ? -1 : 1;
  const dtlSign = playerX >= 0 ? 1 : -1;

  if (family === ShotFamily.DROP) {
    const sign = width === TargetWidth.OPEN_COURT || direction === ShotDirection.WIDE ? openSign : Math.sign(oppX || openSign);
    return sign * rand(0.35, q > 0.68 ? 2.15 : 1.45);
  }
  if (direction === ShotDirection.CENTER) return rand(-r.centerSigmaX, r.centerSigmaX);
  if (direction === ShotDirection.BODY) return clamp(oppX + gaussian() * r.bodyJitter, -2.15, 2.15);
  if (direction === ShotDirection.DTL || direction === ShotDirection.INSIDE_IN) return dtlSign * rand(1.65, intent === ShotIntent.FINISH ? 3.35 : 2.95);
  if (direction === ShotDirection.WIDE || width === TargetWidth.WIDE || width === TargetWidth.OPEN_COURT) return openSign * rand(1.85, intent === ShotIntent.FINISH ? 3.55 : 3.20);
  if (direction === ShotDirection.INSIDE_OUT || direction === ShotDirection.CROSS) {
  const wideGate = intent === ShotIntent.PRESSURE || intent === ShotIntent.REDIRECT || intent === ShotIntent.FINISH || width === TargetWidth.OPEN_COURT;
    return crossSign * rand(wideGate ? 1.45 : 0.85, wideGate ? 3.35 : 2.45);
  }
  return rand(-0.85, 0.85);
}

function normAttr(player, key, fallback = 60) {
  return clamp((player?.attrs?.[key] ?? fallback) / 100, 0, 1);
}

function resolveWrongFootOpportunity(context, quality, decision) {
  const intent = decision?.intent ?? ShotIntent.BUILD;
  if (intent !== ShotIntent.PRESSURE && intent !== ShotIntent.FINISH && intent !== ShotIntent.REDIRECT) return null;

  const q = quality?.quality ?? 0.5;
  const bodyState = quality?.bodyState ?? '';
  const ready = context?.body?.contactReadiness ?? 0;
  const arrivalMargin = context?.body?.arrivalMargin ?? 0;
  if (q < 0.60 || ready < 0.46 || arrivalMargin < -0.055 || bodyState === 'LOW_PICKUP' || bodyState === 'LATE' || bodyState === 'STRETCHED') {
    return null;
  }

  const player = context?.player;
  const opponent = context?.opponent;
  const construction = context?._rallyConstruction ?? null;
  const builtTrap = construction?.wrongFootTrap && construction?.clean;
  const oppVelX = context?.body?.opponentVel?.x ?? opponent?.vel?.x ?? 0;
  const oppSpeedX = Math.abs(oppVelX);
  if (oppSpeedX < (builtTrap ? 0.52 : 0.72)) return null;

  const oppX = opponent?.pos?.x ?? 0;
  const targetSign = builtTrap && construction?.targetSign
    ? construction.targetSign
    : -Math.sign(oppVelX || oppX || 1);
  const recovering = clamp(context?.body?.opponentMovementTelemetry?.recoverInertia ?? opponent?._tm?.recoverInertiaTimer ?? 0, 0, 0.28) / 0.28;
  const splitFrozen = clamp(context?.body?.opponentMovementTelemetry?.splitTimer ?? opponent?._tm?.splitTimer ?? 0, 0, 0.16) / 0.16;
  const reversalNeed = Math.sign(oppVelX) === Math.sign(oppX || oppVelX) ? clamp(Math.abs(oppX) / 3.4, 0, 1) : 0.38;
  const lateralCommit = clamp((oppSpeedX - 0.70) / 3.35, 0, 1);
  const tacticalRead = normAttr(player, 'visaoTatica', 60) * 0.44
    + normAttr(player, 'leitura', 60) * 0.34
    + normAttr(player, 'controle', 60) * 0.14
    + (context?.capabilities?.riskTolerance ?? 0.55) * 0.08;
  const defenderResist = normAttr(opponent, 'velocidade', 60) * 0.34
    + normAttr(opponent, 'explosividade', 60) * 0.24
    + normAttr(opponent, 'leitura', 60) * 0.28
    + normAttr(opponent, 'recuperacao', 60) * 0.14;
  const attackClean = clamp((q - 0.58) / 0.28, 0, 1) * 0.48
    + clamp((ready - 0.44) / 0.42, 0, 1) * 0.20
    + clamp((arrivalMargin + 0.055) / 0.18, 0, 1) * 0.12
    + (intent === ShotIntent.FINISH ? 0.20 : 0.12);
  const raw = lateralCommit * 0.34
    + reversalNeed * 0.18
    + recovering * 0.16
    + splitFrozen * 0.06
    + tacticalRead * 0.24
    + attackClean * 0.22
    - defenderResist * 0.24;
  const strength = clamp(raw + (builtTrap ? 0.13 + (construction?.openingScore ?? 0) * 0.08 : 0), 0, 1);
  const triggerChance = clamp((strength - 0.42) * 1.45, 0, intent === ShotIntent.FINISH ? 0.58 : 0.44);
  if (strength < (builtTrap ? 0.50 : 0.54) || (!builtTrap && rand(0, 1) > triggerChance)) return null;

  return Object.freeze({
    active: true,
    strength: +strength.toFixed(3),
    targetSign,
    opponentVelX: +oppVelX.toFixed(3),
    opponentX: +oppX.toFixed(3),
    recovering: +recovering.toFixed(3),
    defenderResist: +defenderResist.toFixed(3),
    penalty: +clamp(0.035 + strength * 0.115 - defenderResist * 0.035, 0.025, 0.13).toFixed(3),
    reason: builtTrap ? 'wrongFoot=constructed_recovery_trap' : 'wrongFoot=opponent_lateral_recovery',
  });
}

function varyDepthAcrossIntent(depth, context, quality, decision, shotStyle) {
  const intent = decision?.intent ?? ShotIntent.BUILD;
  const family = decision?.family ?? null;
  if (family === ShotFamily.DROP) return TargetDepth.SHORT;
  if (family === ShotFamily.LOB) return depth;
  if (family === ShotFamily.SLICE && decision?.sliceProfile) {
    return decision.sliceProfile === SliceProfile.SHORT_VARIATION ? TargetDepth.MID : TargetDepth.DEEP;
  }

  const q = quality?.quality ?? 0.5;
  const bodyState = quality?.bodyState ?? '';
  const ready = context?.body?.contactReadiness ?? 0;
  const arrivalMargin = context?.body?.arrivalMargin ?? 0;
  const oppY = Math.abs(context?.opponent?.pos?.y ?? 0);
  const rallyCount = context?.score?.rally ?? context?.memory?.shots?.length ?? 0;
  const cleanEnough = q >= 0.54 && ready >= 0.42 && arrivalMargin >= -0.075
    && bodyState !== 'LATE' && bodyState !== 'STRETCHED';
  if (!cleanEnough) return depth;

  const rivalDeep = oppY > 9.15;
  const rivalVeryDeep = oppY > 10.30;
  const isTopspin = family === ShotFamily.TOPSPIN;
  const isSlice = family === ShotFamily.SLICE;
  const isFlat = family === ShotFamily.FLAT_DRIVE;
  const explosive = shotStyle?.isExplosive ?? false;
  const patient = shotStyle?.isPatient ?? false;
  const shortAngleBuilder = shotStyle?.shortAngleBuilder ?? false;
  const shortAngleSignature = context?.player?.naturalSignature === 'FH_SHORT_ANGLE'
    || context?.player?.signatureShot === 'SHORT_ANGLE_FH'
    || context?.player?.signaturePattern === 'SHORT_ANGLE_ASSASSIN'
    || context?.player?.rallyPattern === 'SHORT_ANGLE_BUILDER';
  const touchMemory = context?.player?.ctx?.matchCtx?.touchVariation ?? {};
  const shortVariationCooling = (touchMemory.cooldownPoints ?? 0) > 0 || (touchMemory.heat ?? 0) > 0.64;
  const angleReady = !shortVariationCooling
    && rivalDeep
    && (isTopspin || isFlat)
    && (decision?.direction === ShotDirection.CROSS || decision?.direction === ShotDirection.WIDE)
    && q >= (shortAngleBuilder || shortAngleSignature ? 0.58 : 0.66)
    && ready >= 0.48
    && arrivalMargin >= -0.035;
  const roll = rand(0, 1);

  let shortChance = 0;
  let midChance = 0;
  let midDeepChance = 0;

  if (intent === ShotIntent.DEFEND) {
    shortChance = isSlice && rivalVeryDeep && q >= 0.66 && ready >= 0.50 ? 0.02 : 0;
    midChance = q >= 0.58 ? 0.08 : 0.04;
    midDeepChance = q >= 0.58 ? 0.34 : 0.24;
  } else if (intent === ShotIntent.RESET) {
    shortChance = (isSlice || isTopspin) && rivalDeep && q >= 0.64 && ready >= 0.46 ? 0.035 : 0;
    midChance = 0.14 + (rallyCount >= 5 ? 0.04 : 0);
    midDeepChance = 0.38 + (rallyCount >= 5 ? 0.08 : 0);
  } else if (intent === ShotIntent.CONTROL) {
    shortChance = isTopspin && rivalVeryDeep && q >= 0.64 ? 0.055 : isSlice && rivalDeep ? 0.035 : 0;
    midChance = 0.10;
    midDeepChance = isTopspin ? 0.46 : 0.30;
  } else if (intent === ShotIntent.BUILD) {
    // Construção não é só bater no fundo: a faixa médio-profunda dá cadência,
    // tira tempo de forma gradual e ainda não convida o rival a atacar.
    shortChance = isTopspin ? (patient ? 0.035 : explosive ? 0.10 : 0.065) : isSlice ? 0.07 : 0;
    midChance = patient ? 0.10 : explosive ? 0.18 : 0.14;
    midDeepChance = patient ? 0.36 : explosive ? 0.48 : 0.44;
    if (rallyCount >= 5) {
      shortChance += 0.025;
      midChance += 0.04;
      midDeepChance += 0.06;
    }
    // O cruzado curto não é uma família de golpe: é uma geometria ofensiva.
    // Ele aparece quando o rival já foi empurrado, o contato está limpo e o
    // jogador tem repertório para abrir a quadra. A memória impede repetição.
    if (angleReady) {
      shortChance = Math.max(shortChance, shortAngleBuilder ? 0.18 : shortAngleSignature ? 0.16 : 0.085);
    }
  } else if (intent === ShotIntent.REDIRECT) {
    shortChance = 0;
    midChance = isFlat ? 0.10 : 0.14;
    midDeepChance = isFlat ? 0.32 : 0.40;
  } else if (intent === ShotIntent.PRESSURE) {
    shortChance = rivalDeep && isTopspin && q >= 0.64 ? (explosive ? 0.12 : 0.08) : isSlice && rivalVeryDeep ? 0.05 : 0;
    midChance = rivalVeryDeep ? (patient ? 0.14 : explosive ? 0.24 : 0.20) : 0.06;
    midDeepChance = rivalVeryDeep ? (patient ? 0.34 : explosive ? 0.46 : 0.40) : 0.24;
    if (angleReady) {
      shortChance = Math.max(shortChance, shortAngleBuilder ? 0.20 : shortAngleSignature ? 0.18 : 0.10);
    }
  } else if (intent === ShotIntent.APPROACH) {
    shortChance = 0;
    midChance = isSlice ? 0.18 : isTopspin ? 0.12 : 0.06;
    midDeepChance = isSlice ? 0.20 : isTopspin ? 0.26 : 0.14;
  } else if (intent === ShotIntent.PASS) {
    shortChance = q >= 0.68 && isTopspin ? 0.08 : 0;
    midChance = q >= 0.58 ? 0.16 : 0.08;
    midDeepChance = q >= 0.58 ? 0.24 : 0.14;
  } else if (intent === ShotIntent.FINISH) {
    const marginFinish = decision?.finishMode === 'margin';
    shortChance = q >= 0.74 && isTopspin && rivalVeryDeep ? 0.07 : 0;
    midChance = marginFinish ? 0.42 : (isFlat ? 0.10 : 0.18);
    midDeepChance = marginFinish ? 0.26 : (isFlat ? 0.18 : 0.30);
    if (angleReady && decision?.finishMode === 'angle_putaway') {
      shortChance = Math.max(shortChance, shortAngleBuilder || shortAngleSignature ? 0.24 : 0.14);
    }
  }

  shortChance = clamp(shortChance, 0, 0.22);
  midChance = clamp(midChance, 0, 0.44);
  midDeepChance = clamp(midDeepChance, 0, 0.58 - midChance);
  if (roll < shortChance) return TargetDepth.SHORT;
  if (roll < shortChance + midChance) return TargetDepth.MID;
  if (roll < shortChance + midChance + midDeepChance) return TargetDepth.MID_DEEP;
  return depth;
}

export function resolveLandingEnvelope(context, quality, decision) {
  const r = SHOT_TUNING.realism.rally;
  const intent = decision?.intent ?? ShotIntent.BUILD;
  const family = decision?.family ?? ShotFamily.TOPSPIN;
  const direction = decision?.direction ?? ShotDirection.CROSS;
  const depth = decision?.depth ?? TargetDepth.MID;
  const width = decision?.width ?? TargetWidth.CENTER;
  const q = quality?.quality ?? 0.5;
  const sideSign = opponentSideY(context);
  const shotStyle = resolveShotStyle(context);
  const pressure = context?.player?.ctx?.rallyPressure ?? 0;
  const bodyState = quality?.bodyState ?? '';
  const riskShape = direction === ShotDirection.DTL || direction === ShotDirection.WIDE || intent === ShotIntent.FINISH || intent === ShotIntent.REDIRECT ? 'line_risk'
    : intent === ShotIntent.DEFEND || intent === ShotIntent.RESET ? 'safety_cloud'
      : family === ShotFamily.DROP ? 'touch_cloud'
        : 'rally_cloud';

  const wrongFoot = decision?.wrongFoot ?? null;
  let centerX = wrongFoot?.active
    ? wrongFoot.targetSign * rand(intent === ShotIntent.FINISH ? 2.20 : 1.85, intent === ShotIntent.FINISH ? 3.45 : 3.10)
    : widthBand(width, direction, context, family, intent, q);
  let centerY = depthBand(depth, sideSign, family, intent, q, shotStyle, decision?.sliceProfile);
  const shortAngleGeometry = depth === TargetDepth.SHORT
    && (family === ShotFamily.TOPSPIN || family === ShotFamily.FLAT_DRIVE)
    && (direction === ShotDirection.CROSS || direction === ShotDirection.WIDE)
    && (intent === ShotIntent.BUILD || intent === ShotIntent.PRESSURE || intent === ShotIntent.FINISH || intent === ShotIntent.PASS);
  if (shortAngleGeometry) {
    const crossSign = (context?.player?.pos?.x ?? 0) >= 0 ? -1 : 1;
    centerX = crossSign * rand(2.20, q >= 0.70 ? 3.45 : 3.05);
    // A bola precisa cair antes/meio da caixa de serviço para realmente criar
    // corrida diagonal para frente, não apenas ser um cruzado menos profundo.
    centerY = sideSign * rand(4.55, q >= 0.70 ? 5.45 : 5.65);
  }
  const surface = surfaceSpread(context);
  const qualitySpread = (1 - q) * r.lowQualitySpread - Math.max(0, q - 0.68) * r.highQualityTighten;
  const intentSpread = intent === ShotIntent.DEFEND || intent === ShotIntent.RESET ? r.defenseSigmaMult
    : intent === ShotIntent.PRESSURE || intent === ShotIntent.REDIRECT || intent === ShotIntent.FINISH ? r.attackSigmaMult
      : 1;
  const familyX = shortAngleGeometry ? 0.86
    : family === ShotFamily.FLAT_DRIVE ? 1.14
    : family === ShotFamily.SLICE ? 1.22
      : family === ShotFamily.DROP ? 0.68
        : family === ShotFamily.LOB ? 1.30
          : 1;
  const familyY = shortAngleGeometry ? 0.82
    : family === ShotFamily.FLAT_DRIVE ? 1.22
    : family === ShotFamily.SLICE ? 1.35
      : family === ShotFamily.DROP ? 0.74
        : family === ShotFamily.LOB ? 1.55
          : 1;
  const sigmaX = clamp((r.baseSigmaX + qualitySpread + pressure * r.pressureSpread + surface) * intentSpread * familyX, 0.18, 2.20);
  const sigmaYBase = depth === TargetDepth.DEEP ? r.deepSigmaY
    : depth === TargetDepth.MID_DEEP ? (r.baseSigmaY + r.deepSigmaY) * 0.62
      : depth === TargetDepth.SHORT ? r.shortSigmaY : r.baseSigmaY;
  const sigmaY = clamp((sigmaYBase + qualitySpread + pressure * r.pressureSpread + surface) * intentSpread * familyY, 0.22, 3.20);
  const biasX = direction === ShotDirection.DTL ? Math.sign(centerX || 1) * r.dtlLineBias
    : direction === ShotDirection.WIDE ? Math.sign(centerX || 1) * 0.22
      : 0;
  const biasY = (intent === ShotIntent.DEFEND || intent === ShotIntent.RESET ? -r.safeDepthBias
    : direction === ShotDirection.CROSS ? r.crossDepthBias
      : family === ShotFamily.DROP ? -r.angleShortBias
        : 0) * sideSign;

  const lateralMargin = family === ShotFamily.DROP ? 0.95 : family === ShotFamily.LOB ? 0.64 : intent === ShotIntent.FINISH ? 0.18 : 0.26;
  const depthMargin = family === ShotFamily.DROP ? 0.62 : family === ShotFamily.LOB ? 0.60 : intent === ShotIntent.FINISH ? 0.28 : 0.42;
  const intendedX = clampRallyX(centerX + biasX + organicNoise(sigmaX, r.humanTailChance, r.humanTailMult), lateralMargin);
  const intendedY = clampRallyY(centerY + biasY + organicNoise(sigmaY, r.humanTailChance, r.humanTailMult), sideSign, depthMargin);
  const zoneId = `${String(depth).toLowerCase()}_${String(direction).toLowerCase()}_${riskShape}`;

  return Object.freeze({
    zoneId,
    centerX: +centerX.toFixed(3),
    centerY: +centerY.toFixed(3),
    sigmaX: +sigmaX.toFixed(3),
    sigmaY: +sigmaY.toFixed(3),
    biasX: +biasX.toFixed(3),
    biasY: +biasY.toFixed(3),
    riskShape,
    surfaceSpread: +surface.toFixed(3),
    intendedX,
    intendedY,
    wrongFoot: wrongFoot ?? null,
    shortAngleGeometry,
  });
}

export function chooseDirection(context, quality, intent) {
  const q = quality?.quality ?? 0.5;
  const prefs = context?.prefs ?? {};
  const risk = prefs.riskProfile ?? 'CALCULATED';
  const playerX = context?.player?.pos?.x ?? 0;
  const oppX = context?.opponent?.pos?.x ?? 0;
  const ready = context?.body?.contactReadiness ?? 0;
  const arrivalMargin = context?.body?.arrivalMargin ?? 0;
  const bodyState = quality?.bodyState ?? '';
  const opponentWide = Math.abs(oppX) > 2.2;
  const playerWide = Math.abs(playerX) > 2.8;
  const memory = context?.memory ?? null;
  const repeatedBody = memory?.directionStreak?.value === ShotDirection.BODY && (memory.directionStreak?.count ?? 0) >= 1;
  const repeatedCenter = memory?.directionStreak?.value === ShotDirection.CENTER && (memory.directionStreak?.count ?? 0) >= 2;
  const unstableBuild = intent === ShotIntent.BUILD
    && (q < 0.50 || ready < 0.58 || arrivalMargin < -0.03 || bodyState === 'LOW_PICKUP');

  let direction = null;
  if (unstableBuild) {
    direction = playerWide ? ShotDirection.CROSS : repeatedBody || repeatedCenter ? ShotDirection.CROSS : ShotDirection.CENTER;
  }
  if (intent === ShotIntent.RESET || intent === ShotIntent.DEFEND) {
    direction = playerWide ? ShotDirection.CROSS : ShotDirection.CENTER;
  }
  if (intent === ShotIntent.FINISH && q > 0.70) {
    if (opponentWide) direction = ShotDirection.WIDE;
    else if (risk === 'GAMBLER' || risk === 'ALLOUT') direction = ShotDirection.DTL;
    else if (Math.abs(oppX) > 0.80) direction = ShotDirection.WIDE;
    else if (playerWide && q > 0.76) direction = ShotDirection.DTL;
  }
  if (!direction && intent === ShotIntent.REDIRECT && q > 0.54) {
    direction = prefs.buildStyle === 'CROSS_DOMINANT' && (memory?.directionStreak?.count ?? 0) < 3
      ? ShotDirection.CROSS
      : ShotDirection.DTL;
  }
  if (!direction && intent === ShotIntent.PRESSURE && q > 0.62) {
    if (prefs.buildStyle === 'DTL_HUNTER') direction = ShotDirection.DTL;
    else if (prefs.buildStyle === 'CENTRE_CONTROL') direction = ShotDirection.CENTER;
    else direction = ShotDirection.CROSS;
  }
  if (!direction && prefs.buildStyle === 'CENTRE_CONTROL') direction = repeatedCenter ? ShotDirection.CROSS : ShotDirection.CENTER;
  if (!direction && prefs.buildStyle === 'COUNTER_REDIRECT' && q > 0.56) direction = ShotDirection.DTL;
  // CROSS_DOMINANT: empurra fortemente para cruzado — o cruzado é a arma, não o default.
  // Quebra o padrão apenas por streak muito longo (4+) para não ser completamente previsível.
  if (!direction && prefs.buildStyle === 'CROSS_DOMINANT') {
    const longCrossStreak = memory?.directionStreak?.value === ShotDirection.CROSS
      && (memory.directionStreak?.count ?? 0) >= 4;
    direction = longCrossStreak ? ShotDirection.DTL : ShotDirection.CROSS;
  }
  if (!direction && prefs.buildStyle === 'CROSS_SHORT_ANGLE' && q > 0.60) direction = ShotDirection.CROSS;
  // DTL orgânico: após 2+ cruzados consecutivos, pequena chance de DTL natural
  // para quebrar previsibilidade sem forçar um padrão artificial.
  const crossStreak = memory?.directionStreak?.value === ShotDirection.CROSS
    && (memory.directionStreak?.count ?? 0) >= 2;
  const pressure = context?.player?.ctx?.rallyPressure ?? 0;
  const dtlNudge = crossStreak && q > 0.52 && pressure < 0.60 && rand(0, 1) < 0.28;
  direction = direction ?? (dtlNudge ? ShotDirection.DTL : ShotDirection.CROSS);
  if ((intent === ShotIntent.PRESSURE || intent === ShotIntent.REDIRECT || intent === ShotIntent.FINISH) && (direction === ShotDirection.BODY || direction === ShotDirection.CENTER)) {
    direction = (prefs.buildStyle === 'DTL_HUNTER' || risk === 'GAMBLER' || risk === 'ALLOUT') && q > 0.58
      ? ShotDirection.DTL
      : ShotDirection.CROSS;
  }
  const nudged = memoryDirectionNudge(context?.memory, direction);
  if ((intent === ShotIntent.BUILD || intent === ShotIntent.CONTROL || intent === ShotIntent.RESET || intent === ShotIntent.DEFEND)
    && nudged === ShotDirection.BODY) {
    return playerWide ? ShotDirection.CROSS : ShotDirection.CENTER;
  }
  return nudged;
}

export function chooseTarget(context, quality, decision) {
  const intent = decision?.intent ?? ShotIntent.BUILD;
  const family = decision?.family ?? null;
  const direction = decision?.direction ?? ShotDirection.CROSS;
  const buildMode = decision?.buildMode ?? null;
  const finishMode = decision?.finishMode ?? null;
  const touchRescue = !!decision?.touchRescue;
  const q = quality?.quality ?? 0.5;
  const oppSide = opponentSideY(context);
  const oppY = Math.abs(context?.opponent?.pos?.y ?? 0);
  const rallyCount = context?.score?.rally ?? context?.memory?.shots?.length ?? 0;
  // Oponente muito fundo = oportunidade de puxá-lo para frente com bola intermediária
  const rivalVeryDeep = oppY > 10.30;
  // Resolve estilo do jogador para ajustar targeting por cadência e buildStyle
  const shotStyle = resolveShotStyle(context);

  const lockedBlueprintShape = !!decision?.lockTargetShape;
  let depth = lockedBlueprintShape && decision?.depth ? decision.depth : TargetDepth.MID;
  let width = lockedBlueprintShape && decision?.width ? decision.width : TargetWidth.CENTER;

  if (lockedBlueprintShape) {
    // No cérebro v2 a geometria faz parte do golpe concreto. Reclassificá-la
    // pelo intent aqui transformaria uma banana, curtinha ou slice curto de
    // volta numa bola genérica.
  } else if (touchRescue && family === ShotFamily.LOB) {
    depth = TargetDepth.MID;
    width = TargetWidth.CENTER;
  } else if (family === ShotFamily.LOB && intent === ShotIntent.PASS) {
    depth = TargetDepth.DEEP;
    width = q > 0.58 ? TargetWidth.OPEN_COURT : TargetWidth.CENTER;
  } else if (touchRescue && family === ShotFamily.SLICE) {
    depth = TargetDepth.MID;
    width = q > 0.62 ? TargetWidth.OPEN_COURT : TargetWidth.CENTER;
  } else if (family === ShotFamily.DROP) {
    depth = TargetDepth.SHORT;
    width = q > 0.62 ? TargetWidth.OPEN_COURT : TargetWidth.CENTER;
  } else if (intent === ShotIntent.RESET || intent === ShotIntent.DEFEND) {
    // RESET deve mudar o ritmo — MID puxa o oponente para frente, quebrando o loop de profundidade.
    // Threshold mais alto para DEEP: q < 0.60 vai MID por falta de qualidade,
    // q >= 0.60 tem 35% de chance de MID tático.
    depth = q < 0.60 ? TargetDepth.MID_DEEP : TargetDepth.DEEP;
    width = TargetWidth.CENTER;
  } else if (intent === ShotIntent.CONTROL || intent === ShotIntent.BUILD) {
    if (intent === ShotIntent.BUILD && buildMode !== 'attack') {
      // MID orgânico: chance base de 28%, cresce +10% após rally longo (≥6 golpes).
      // PATIENT: resiste ao MID (quer manter o oponente atrás antes de atacar).
      // EXPLOSIVE: MID mais frequente para forçar o jogo mais cedo.
      const styleContext = shotStyle;
      depth = q < 0.46 ? TargetDepth.MID : TargetDepth.MID_DEEP;
      // CENTRE_CONTROL: prefere centro mesmo quando a direção seria CROSS/DTL.
      const forceCenter = styleContext?.centreControl ?? false;
      width = forceCenter ? TargetWidth.CENTER
        : direction === ShotDirection.BODY || direction === ShotDirection.CENTER ? TargetWidth.CENTER : TargetWidth.OPEN_COURT;
    } else {
      depth = rivalVeryDeep && q >= 0.62 ? TargetDepth.MID : TargetDepth.MID_DEEP;
      width = direction === ShotDirection.CENTER ? TargetWidth.CENTER : TargetWidth.WIDE;
    }
  } else if (intent === ShotIntent.REDIRECT) {
    depth = q >= 0.66 ? TargetDepth.MID_DEEP : TargetDepth.MID;
    width = direction === ShotDirection.DTL || direction === ShotDirection.WIDE ? TargetWidth.WIDE : TargetWidth.OPEN_COURT;
  } else if (intent === ShotIntent.PRESSURE) {
    // Quando o oponente está muito fundo, 22% de chance de MID para arrastá-lo para frente.
    // PATIENT: menos MID em PRESSURE — constroem a abertura com profundidade antes de mover.
    // EXPLOSIVE: mais MID — forçam o ritmo mudando profundidade.
    const styleCtx = shotStyle;
    depth = rivalVeryDeep ? TargetDepth.MID : (q >= 0.68 ? TargetDepth.DEEP : TargetDepth.MID_DEEP);
    // CENTRE_CONTROL em PRESSURE ainda prefere centro — elimina ângulos mesmo ao pressionar.
    const centreCtrl = styleCtx?.centreControl ?? false;
    width = centreCtrl ? TargetWidth.CENTER
      : direction === ShotDirection.CENTER || direction === ShotDirection.BODY ? TargetWidth.OPEN_COURT : TargetWidth.WIDE;
  } else if (intent === ShotIntent.FINISH) {
    depth = finishMode === 'margin' || finishMode === 'angle_putaway' || finishMode === 'through_line'
      ? TargetDepth.MID
      : TargetDepth.MID_DEEP;
    width = finishMode === 'power_body' || finishMode === 'behind_runner'
      ? TargetWidth.BODY
      : finishMode === 'margin'
      ? (q < 0.44 ? TargetWidth.OPEN_COURT : TargetWidth.WIDE)
      : TargetWidth.OPEN_COURT;
  } else if (intent === ShotIntent.APPROACH) {
    depth = TargetDepth.DEEP;
    width = TargetWidth.BODY;
  }
  if (!lockedBlueprintShape) {
    depth = varyDepthAcrossIntent(depth, context, quality, { ...decision, intent, family, finishMode }, shotStyle);
  }

  // Power body é deliberadamente central: a força vem de encurtar o tempo de
  // reação, não de pedir um alvo lateral de baixíssima margem.
  const finishDirection = finishMode === 'power_body' ? ShotDirection.BODY : direction;
  const wrongFoot = decision?.allowWrongFoot === false
    ? null
    : resolveWrongFootOpportunity(context, quality, { ...decision, intent, family, direction: finishDirection });
  const resolvedDirection = wrongFoot?.active
    ? (Math.abs(wrongFoot.targetSign * 3.05) > 2.85 ? ShotDirection.WIDE : finishDirection)
    : finishDirection;
  const resolvedWidth = wrongFoot?.active ? TargetWidth.OPEN_COURT : width;
  const envelope = resolveLandingEnvelope(context, quality, {
    ...decision,
    depth,
    width: resolvedWidth,
    direction: resolvedDirection,
    sliceProfile: decision?.sliceProfile ?? null,
    family,
    intent,
    finishMode,
    wrongFoot,
  });
  const x = envelope.intendedX;
  const y = envelope.intendedY;

  return Object.freeze({ depth, width: resolvedWidth, x, y, direction: resolvedDirection, finishMode, landingEnvelope: envelope, wrongFoot });
}
