import { clamp } from '../../core/math.js';

const PROFILES = Object.freeze({
  HARD: Object.freeze({ traction: 1.00, speed: 1.00, accel: 1.00, decel: 1.04, lateral: 1.00, energy: 1.00, slide: false }),
  CLAY: Object.freeze({ traction: 0.82, speed: 0.98, accel: 0.95, decel: 0.84, lateral: 0.98, energy: 1.08, slide: true }),
  GRASS: Object.freeze({ traction: 0.76, speed: 0.96, accel: 0.92, decel: 0.88, lateral: 0.92, energy: 0.97, slide: false }),
  INDOOR: Object.freeze({ traction: 1.03, speed: 1.01, accel: 1.02, decel: 1.04, lateral: 1.01, energy: 0.95, slide: false }),
  STREET: Object.freeze({ traction: 1.08, speed: 0.98, accel: 0.98, decel: 1.10, lateral: 0.95, energy: 1.12, slide: false }),
  CARPET: Object.freeze({ traction: 0.90, speed: 1.02, accel: 1.01, decel: 0.95, lateral: 0.97, energy: 0.93, slide: false }),
});

export function normalizeMovementSurface(surface) {
  const value = String(surface ?? 'HARD').toUpperCase();
  if (value === 'CLAY' || value === 'SAIBRO') return 'CLAY';
  if (value === 'GRASS' || value === 'GRAMA') return 'GRASS';
  if (value === 'INDOOR') return 'INDOOR';
  if (value === 'STREET' || value === 'ASFALTO') return 'STREET';
  if (value === 'CARPET' || value === 'VELUDO') return 'CARPET';
  return 'HARD';
}

function adaptation(player) {
  const generic = (player?.attrs?.adaptacao ?? 60) / 100;
  const surfaceMastery = player?._surfaceIdentityFx
    ? (player._surfaceIdentityFx.adaptation ?? 50) / 100
    : generic;
  return clamp(generic * 0.42 + surfaceMastery * 0.58, 0, 1);
}

export function getSurfaceFootingProfile(player, gs = null) {
  const surface = normalizeMovementSurface(gs?.courtPhysics?.surface ?? gs?.courtId ?? 'HARD');
  const base = PROFILES[surface] ?? PROFILES.HARD;
  const adapt = adaptation(player);
  // Adaptação aproxima pisos extremos da execução ideal, mas não apaga sua
  // identidade. Até o especialista ainda desliza no saibro e pisa curto na grama.
  const relief = clamp((adapt - 0.45) / 0.55, 0, 1);
  return Object.freeze({
    surface,
    adaptation: +adapt.toFixed(3),
    traction: +(base.traction + (1 - base.traction) * relief * 0.34).toFixed(3),
    speedMult: +(base.speed + (1 - base.speed) * relief * 0.28).toFixed(3),
    accelMult: +(base.accel + (1 - base.accel) * relief * 0.40).toFixed(3),
    decelMult: +((base.decel + (1 - base.decel) * relief * 0.38) * (player?._surfaceIdentityFx?.brakingMult ?? 1)).toFixed(3),
    lateralMult: +(base.lateral + (1 - base.lateral) * relief * 0.34).toFixed(3),
    energyMult: +base.energy.toFixed(3),
    canSlide: base.slide,
  });
}

export function updateSurfaceFooting(player, gs, { target = null, currentSpeed = 0, baseDecel = 10 } = {}) {
  const profile = getSurfaceFootingProfile(player, gs);
  const dx = (target?.x ?? player?.pos?.x ?? 0) - (player?.pos?.x ?? 0);
  const dy = (target?.y ?? player?.pos?.y ?? 0) - (player?.pos?.y ?? 0);
  const distance = Math.hypot(dx, dy);
  const dirX = distance > 1e-6 ? dx / distance : 0;
  const dirY = distance > 1e-6 ? dy / distance : 0;
  const velocityDot = currentSpeed > 1e-6
    ? ((player?.vel?.x ?? 0) * dirX + (player?.vel?.y ?? 0) * dirY) / currentSpeed
    : 1;
  const effectiveDecel = Math.max(2.4, baseDecel * profile.decelMult);
  const brakingDistance = currentSpeed * currentSpeed / (2 * effectiveDecel);
  const slideWindow = profile.canSlide
    && currentSpeed >= 2.35
    && velocityDot > 0.10
    && distance <= brakingDistance + 0.82
    && distance >= 0.28;
  const reversalSeverity = clamp((-velocityDot - 0.05) / 0.95, 0, 1);
  const grassSlipRisk = profile.surface === 'GRASS'
    ? clamp(reversalSeverity * (1 - profile.adaptation) * 0.54 + Math.max(0, currentSpeed - 5.0) * 0.018, 0, 0.38)
    : 0;
  const slideSkill = clamp(profile.adaptation * 0.62 + ((player?.attrs?.equilibrio ?? 60) / 100) * 0.38 + (player?._surfaceIdentityFx?.slideControlBonus ?? 0), 0, 1);
  const slideControlPenalty = slideWindow ? (1 - slideSkill) * 0.20 : 0;
  const stability = clamp(
    0.92
      + (profile.traction - 0.82) * 0.18
      + profile.adaptation * 0.08
      - grassSlipRisk
      - slideControlPenalty,
    0.52,
    1,
  );
  const state = {
    version: 'surface-footing-v1',
    surface: profile.surface,
    adaptation: profile.adaptation,
    traction: profile.traction,
    stability: +stability.toFixed(3),
    brakingDistance: +brakingDistance.toFixed(3),
    slideActive: slideWindow,
    slideControl: slideWindow ? +slideSkill.toFixed(3) : 0,
    slipRisk: +grassSlipRisk.toFixed(3),
    momentumCarry: slideWindow ? +clamp(0.10 + (1 - slideSkill) * 0.18, 0.10, 0.28).toFixed(3) : 0,
    energyMult: profile.energyMult,
    reason: slideWindow
      ? 'controlled_clay_slide'
      : grassSlipRisk > 0.04
        ? 'grass_reversal_traction'
        : 'surface_traction',
  };
  player._surfaceFooting = state;
  return state;
}

export function resetSurfaceFooting(player) {
  if (player) player._surfaceFooting = null;
}
