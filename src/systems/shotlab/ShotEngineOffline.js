export const SHOT_ENGINE_OFFLINE = 'SHOT_ENGINE_OFFLINE';

export function buildOfflineShotEvent(context = {}) {
  return {
    code: SHOT_ENGINE_OFFLINE,
    reason: 'Legacy shot system archived. New shot engine has not been implemented yet.',
    context,
  };
}

export const SIGNATURE_SHOTS_OFFLINE = Object.freeze({});
export const IFR_TIERS_OFFLINE = Object.freeze({});

export function offlineNoop() {
  return null;
}

export function offlineZero() {
  return 0;
}

export function offlineTier() {
  return null;
}
