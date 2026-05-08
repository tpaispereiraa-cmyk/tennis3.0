import { COURT } from '../../core/constants.js';
import { clamp } from '../../core/math.js';
import { ShotDirection, ShotIntent, TargetDepth, TargetWidth } from './ShotTypes.js';
import { memoryDirectionNudge } from './ShotMemory.js';

function opponentSideY(context) {
  return -(context?.side ?? 1);
}

function depthToY(depth, side) {
  const sign = side;
  switch (depth) {
    case TargetDepth.SHORT: return sign * (COURT.serviceLineY - 1.10);
    case TargetDepth.MID: return sign * (COURT.serviceLineY + 1.25);
    case TargetDepth.DEEP: return sign * (COURT.halfL - 1.15);
    default: return sign * (COURT.serviceLineY + 1.10);
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
  const unstableBuild = intent === ShotIntent.BUILD
    && (q < 0.50 || ready < 0.58 || arrivalMargin < -0.03 || bodyState === 'LOW_PICKUP');

  let direction = null;
  if (unstableBuild) {
    direction = playerWide ? ShotDirection.CROSS : ShotDirection.BODY;
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
  if (!direction && intent === ShotIntent.PRESSURE && q > 0.62) {
    if (prefs.buildStyle === 'DTL_HUNTER') direction = ShotDirection.DTL;
    else if (prefs.buildStyle === 'CENTRE_CONTROL') direction = ShotDirection.CENTER;
    else direction = ShotDirection.CROSS;
  }
  if (!direction && prefs.buildStyle === 'CENTRE_CONTROL') direction = ShotDirection.CENTER;
  if (!direction && prefs.buildStyle === 'COUNTER_REDIRECT' && q > 0.56) direction = ShotDirection.DTL;
  if (!direction && prefs.buildStyle === 'CROSS_SHORT_ANGLE' && q > 0.60) direction = ShotDirection.CROSS;
  direction = direction ?? ShotDirection.CROSS;
  return memoryDirectionNudge(context?.memory, direction);
}

export function chooseTarget(context, quality, decision) {
  const intent = decision?.intent ?? ShotIntent.BUILD;
  const direction = decision?.direction ?? ShotDirection.CROSS;
  const buildMode = decision?.buildMode ?? null;
  const q = quality?.quality ?? 0.5;
  const oppSide = opponentSideY(context);

  let depth = TargetDepth.MID;
  let width = TargetWidth.CENTER;

  if (intent === ShotIntent.RESET || intent === ShotIntent.DEFEND) {
    depth = q < 0.45 ? TargetDepth.MID : TargetDepth.DEEP;
    width = TargetWidth.CENTER;
  } else if (intent === ShotIntent.CONTROL || intent === ShotIntent.BUILD) {
    if (intent === ShotIntent.BUILD && buildMode !== 'attack') {
      depth = q < 0.46 ? TargetDepth.MID : TargetDepth.DEEP;
      width = direction === ShotDirection.BODY || direction === ShotDirection.CENTER ? TargetWidth.BODY : TargetWidth.CENTER;
    } else {
      depth = TargetDepth.DEEP;
      width = direction === ShotDirection.CENTER ? TargetWidth.CENTER : TargetWidth.WIDE;
    }
  } else if (intent === ShotIntent.PRESSURE) {
    depth = TargetDepth.DEEP;
    width = direction === ShotDirection.CENTER ? TargetWidth.BODY : TargetWidth.WIDE;
  } else if (intent === ShotIntent.FINISH) {
    depth = direction === ShotDirection.WIDE || direction === ShotDirection.DTL ? TargetDepth.MID : TargetDepth.DEEP;
    width = direction === ShotDirection.CENTER ? TargetWidth.BODY : TargetWidth.OPEN_COURT;
  } else if (intent === ShotIntent.APPROACH) {
    depth = TargetDepth.DEEP;
    width = TargetWidth.BODY;
  }

  const x = clamp(widthToX(width, direction, context), -COURT.singlesW / 2 + 0.22, COURT.singlesW / 2 - 0.22);
  const y = clamp(
    depthToY(depth, oppSide),
    oppSide > 0 ? 0.75 : -COURT.halfL + 0.35,
    oppSide > 0 ? COURT.halfL - 0.35 : -0.75,
  );

  return Object.freeze({ depth, width, x, y, direction });
}
