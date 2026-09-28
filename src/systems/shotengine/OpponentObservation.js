import { clamp } from '../../core/math.js';

const keyFor = player => String(player?.id ?? player?.name ?? 'unknown');

export function getOpponentRead(observer, attacker) {
  return observer?.ctx?.matchCtx?.opponentTendencies?.[keyFor(attacker)] ?? null;
}

// Only executed shots and publicly visible geometry enter this memory.
export function observeOpponentShot(observer, attacker, shot) {
  if (!observer?.ctx || !shot || !attacker) return null;
  observer.ctx.matchCtx ??= {};
  const map = observer.ctx.matchCtx.opponentTendencies ??= {};
  const id = keyFor(attacker);
  const state = map[id] ??= { seen: 0, deepThenDrop: 0, drops: 0, cross: 0, runaround: 0, lastDeep: false, dropAwareness: 0 };
  const reading = clamp((observer.attrs?.leitura ?? 50) / 100, 0, 1);
  const deepThenDrop = state.lastDeep && shot.family === 'DROP';
  state.seen += 1;
  if (shot.family === 'DROP') state.drops += 1;
  if (shot.direction === 'CROSS') state.cross += 1;
  if (shot.blueprintTags?.includes('runaround')) state.runaround += 1;
  if (deepThenDrop) state.deepThenDrop += 1;
  state.lastDeep = Math.abs(shot.targetY ?? 0) >= 9.05 && (shot.quality ?? 0) >= 0.5;
  const evidence = clamp(state.deepThenDrop / Math.max(2, state.seen * 0.35), 0, 1);
  state.dropAwareness = clamp(state.dropAwareness * 0.86 + evidence * (0.035 + reading * 0.12), 0, 0.8);
  return state;
}
