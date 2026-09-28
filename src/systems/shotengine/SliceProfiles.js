import { clamp } from '../../core/math.js';
import { ShotFamily, ShotIntent } from './ShotTypes.js';
import { TacticalPlan } from './TacticalPlanner.js';

// Slice has two independent qualities: where it lands and how low it stays.
// Keeping those decisions together avoids ordinary rally slices turning into
// accidental drop shots simply because they carry a lot of backspin.
export const SliceProfile = Object.freeze({
  DEEP_DRIVE: 'DEEP_DRIVE',
  SKIDDING_RESET: 'SKIDDING_RESET',
  CHIP_APPROACH: 'CHIP_APPROACH',
  SHORT_VARIATION: 'SHORT_VARIATION',
});

const PROFILE_TUNING = Object.freeze({
  [SliceProfile.DEEP_DRIVE]: Object.freeze({ powerAdd: 2.35, backspinMult: 0.84, carryMult: 1.05, depth: 'DEEP' }),
  [SliceProfile.SKIDDING_RESET]: Object.freeze({ powerAdd: 0.80, backspinMult: 0.96, carryMult: 1.00, depth: 'DEEP' }),
  [SliceProfile.CHIP_APPROACH]: Object.freeze({ powerAdd: 1.20, backspinMult: 0.92, carryMult: 1.03, depth: 'DEEP' }),
  [SliceProfile.SHORT_VARIATION]: Object.freeze({ powerAdd: -1.25, backspinMult: 1.10, carryMult: 0.82, depth: 'MID' }),
});

export function resolveSliceProfile(context, quality, { family, intent, tacticalPlan, finishMode } = {}) {
  if (family !== ShotFamily.SLICE) return null;

  const q = quality?.quality ?? 0.5;
  const ready = context?.body?.contactReadiness ?? 0;
  const arrival = context?.body?.arrivalMargin ?? 0;
  const opponentDeep = Math.abs(context?.opponent?.pos?.y ?? 0) > 9.55;
  const opponentDeepForShortSlice = Math.abs(context?.opponent?.pos?.y ?? 0) > 9.20;
  const clean = q >= 0.62 && ready >= 0.52 && arrival >= -0.025
    && !['LOW_PICKUP', 'LATE', 'STRETCHED'].includes(quality?.bodyState ?? '');
  const buildStyle = context?.prefs?.buildStyle;
  const shortSliceIdentity = buildStyle === 'SLICE_CONTROL'
    || buildStyle === 'DROP_VARIATION'
    || buildStyle === 'VARIED'
    || context?.player?.naturalSignature === 'BH_SLICE_SHORT';
  const eliteShortSlice = (context?.capabilities?.slice ?? 0.55) >= 0.72
    && (context?.capabilities?.touch ?? 0.55) >= 0.66;
  const touchMemory = context?.player?.ctx?.matchCtx?.touchVariation ?? {};
  const repetitionClear = (touchMemory.cooldownPoints ?? 0) <= 0 && (touchMemory.heat ?? 0) < 0.58;
  const sliceControlAttack = buildStyle === 'SLICE_CONTROL'
    && repetitionClear
    && (context?.score?.rally ?? 0) >= 2
    && intent === ShotIntent.PRESSURE
    && q >= 0.60
    && ready >= 0.46
    && arrival >= -0.04
    && !['LOW_PICKUP', 'LATE', 'STRETCHED', 'FALLING_BACK'].includes(quality?.bodyState ?? '');
  const deliberateShort = (shortSliceIdentity || eliteShortSlice)
    && ((sliceControlAttack && opponentDeepForShortSlice)
      || (clean && opponentDeep && (finishMode === 'short_slice_putaway'
        || tacticalPlan?.type === TacticalPlan.BREAK_RHYTHM
        || tacticalPlan?.type === TacticalPlan.PUSH_DEEP_THEN_DROP)));

  if (deliberateShort) return SliceProfile.SHORT_VARIATION;
  if (intent === ShotIntent.APPROACH) return SliceProfile.CHIP_APPROACH;
  if (intent === ShotIntent.DEFEND || intent === ShotIntent.RESET) return SliceProfile.SKIDDING_RESET;
  return SliceProfile.DEEP_DRIVE;
}

export function getSliceProfileTuning(profile) {
  return PROFILE_TUNING[profile] ?? PROFILE_TUNING[SliceProfile.DEEP_DRIVE];
}

export function sliceLandingBand(profile, quality) {
  const q = clamp(quality?.quality ?? 0.5, 0, 1);
  if (profile === SliceProfile.SHORT_VARIATION) return [6.15, 7.65];
  if (profile === SliceProfile.SKIDDING_RESET) return [8.35, 10.00 - q * 0.20];
  if (profile === SliceProfile.CHIP_APPROACH) return [8.90, 10.35];
  return [9.15, 10.65 + q * 0.15];
}
