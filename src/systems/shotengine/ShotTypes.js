export const SHOT_ENGINE_VERSION = 'shotengine-patch-1';

export const ShotPhase = Object.freeze({
  SERVE: 'SERVE',
  RETURN: 'RETURN',
  RALLY_NEUTRAL: 'RALLY_NEUTRAL',
  RALLY_ATTACK: 'RALLY_ATTACK',
  RALLY_DEFENSE: 'RALLY_DEFENSE',
  APPROACH: 'APPROACH',
  NET: 'NET',
  PASSING: 'PASSING',
  POINT_FINISH: 'POINT_FINISH',
});

export const ShotFamily = Object.freeze({
  TOPSPIN: 'TOPSPIN',
  FLAT_DRIVE: 'FLAT_DRIVE',
  SLICE: 'SLICE',
  LOB: 'LOB',
  DROP: 'DROP',
  VOLLEY: 'VOLLEY',
  SMASH: 'SMASH',
  BLOCK_RETURN: 'BLOCK_RETURN',
  CHIP_RETURN: 'CHIP_RETURN',
  SERVE_FLAT: 'SERVE_FLAT',
  SERVE_SLICE: 'SERVE_SLICE',
  SERVE_KICK: 'SERVE_KICK',
});

export const ShotDirection = Object.freeze({
  CENTER: 'CENTER',
  CROSS: 'CROSS',
  DTL: 'DTL',
  INSIDE_OUT: 'INSIDE_OUT',
  INSIDE_IN: 'INSIDE_IN',
  BODY: 'BODY',
  WIDE: 'WIDE',
});

export const ShotIntent = Object.freeze({
  DEFEND: 'DEFEND',
  RESET: 'RESET',
  CONTROL: 'CONTROL',
  BUILD: 'BUILD',
  PRESSURE: 'PRESSURE',
  APPROACH: 'APPROACH',
  FINISH: 'FINISH',
  PASS: 'PASS',
});

export const TargetDepth = Object.freeze({
  SHORT: 'SHORT',
  MID: 'MID',
  DEEP: 'DEEP',
  SERVICE_BOX: 'SERVICE_BOX',
});

export const TargetWidth = Object.freeze({
  CENTER: 'CENTER',
  BODY: 'BODY',
  WIDE: 'WIDE',
  ANGLE: 'ANGLE',
  OPEN_COURT: 'OPEN_COURT',
});

export const BodyState = Object.freeze({
  PLANTED: 'PLANTED',
  MOVING: 'MOVING',
  STRETCHED: 'STRETCHED',
  LATE: 'LATE',
  JAMMED: 'JAMMED',
  FALLING_BACK: 'FALLING_BACK',
  ON_RISE: 'ON_RISE',
  LOW_PICKUP: 'LOW_PICKUP',
  AERIAL: 'AERIAL',
});

export const ShotResult = Object.freeze({
  IN_GOOD: 'IN_GOOD',
  IN_ATTACKABLE: 'IN_ATTACKABLE',
  NET_ERROR: 'NET_ERROR',
  LONG_ERROR: 'LONG_ERROR',
  WIDE_ERROR: 'WIDE_ERROR',
  MISHIT: 'MISHIT',
});

export const RiskProfile = Object.freeze({
  SAFE: 'SAFE',
  NORMAL: 'NORMAL',
  AGGRESSIVE: 'AGGRESSIVE',
  DESPERATE: 'DESPERATE',
});

export const StrokeWing = Object.freeze({
  FOREHAND: 'FOREHAND',
  BACKHAND: 'BACKHAND',
  BODY: 'BODY',
  OVERHEAD: 'OVERHEAD',
  UNKNOWN: 'UNKNOWN',
});
