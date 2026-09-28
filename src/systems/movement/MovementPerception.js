import { clamp } from '../../core/math.js';

export const MOVEMENT_BELIEF_VERSION = 'movement-belief-v3';

function stableNoise(seed, channel = 0) {
  const x = Math.sin((seed + channel * 97.13) * 12.9898) * 43758.5453;
  return (x - Math.floor(x)) * 2 - 1;
}

function playerIdSeed(player) {
  if (typeof player?.id === 'number') return player.id;
  return String(player?.id ?? '').split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
}

function shotSeed(player, gs, ball) {
  const point = gs?._currentPointId ?? gs?.pointHistory?.length ?? 0;
  const rally = gs?.rally ?? 0;
  const hitter = typeof ball?.lastHitBy === 'number' ? ball.lastHitBy : String(ball?.lastHitBy ?? '').length;
  return (point + 1) * 1009 + (rally + 1) * 131 + (hitter + 3) * 37 + (playerIdSeed(player) + 5) * 17;
}

export function getPerceptionSkills(player, isServeReturn = false) {
  const attrs = player?.attrs ?? {};
  const reading = clamp((attrs.leitura ?? 60) / 100, 0, 1);
  const tactical = clamp((attrs.visaoTatica ?? attrs.leitura ?? 60) / 100, 0, 1);
  const returning = clamp((attrs.devolucao ?? attrs.retorno ?? 60) / 100, 0, 1);
  const reflex = clamp((attrs.explosividade ?? 60) / 100, 0, 1);
  const surfaceRead = player?._surfaceIdentityFx?.readBonus ?? 0;
  const skill = clamp(reading * (isServeReturn ? 0.42 : 0.54)
    + tactical * 0.20 + reflex * (isServeReturn ? 0.16 : 0.26)
    + returning * (isServeReturn ? 0.22 : 0) + surfaceRead, 0, 1);
  return { reading, tactical, returning, reflex, skill };
}

function initialEstimate(ball, seed, skills, isServeReturn) {
  const laneSigma = (isServeReturn ? 2.12 : 1.72) * (1.10 - skills.skill * (isServeReturn ? 0.72 : 0.62));
  const paceSigma = (isServeReturn ? 0.098 : 0.082) * (1.10 - skills.skill * (isServeReturn ? 0.60 : 0.54));
  const spinSigma = (isServeReturn ? 0.40 : 0.38) * (1.10 - skills.skill * (isServeReturn ? 0.62 : 0.58));
  return {
    pos: {
      x: (ball?.pos?.x ?? 0) + stableNoise(seed, 1) * (0.13 - skills.skill * 0.055),
      y: (ball?.pos?.y ?? 0) + stableNoise(seed, 2) * (0.09 - skills.skill * 0.035),
      z: Math.max(0, (ball?.pos?.z ?? 0) + stableNoise(seed, 3) * (0.07 - skills.skill * 0.025)),
    },
    vel: {
      x: (ball?.vel?.x ?? 0) + stableNoise(seed, 4) * laneSigma,
      y: (ball?.vel?.y ?? 0) * (1 + stableNoise(seed, 5) * paceSigma),
      z: (ball?.vel?.z ?? 0) + stableNoise(seed, 6) * laneSigma * 0.62,
    },
    spin: {
      x: (ball?.spin?.x ?? 0) * (1 + stableNoise(seed, 7) * spinSigma),
      y: (ball?.spin?.y ?? 0) * (1 + stableNoise(seed, 8) * spinSigma),
      z: (ball?.spin?.z ?? 0) * (1 + stableNoise(seed, 9) * spinSigma),
    },
  };
}

export function beginMovementPerception(player, gs, ball) {
  const isServeReturn = (gs?.rally ?? 0) === 0 && player?.id === gs?.receiver;
  const skills = getPerceptionSkills(player, isServeReturn);
  const seed = shotSeed(player, gs, ball);
  const reactionDelay = isServeReturn
    ? clamp(0.205 - skills.skill * 0.105, 0.095, 0.185)
    : clamp(0.248 - skills.skill * 0.122, 0.112, 0.218);
  const state = {
    version: MOVEMENT_BELIEF_VERSION,
    shotKey: `${ball?.lastHitBy ?? -1}:${gs?.rally ?? 0}:${gs?._currentPointId ?? gs?.pointHistory?.length ?? 0}`,
    age: 0,
    isServeReturn,
    reactionDelay,
    skill: skills.skill,
    seed,
    confidence: 0.04 + skills.skill * 0.07,
    estimate: initialEstimate(ball, seed, skills, isServeReturn),
    lastTruthPos: { ...(ball?.pos ?? { x: 0, y: 0, z: 0 }) },
    lastBounceCount: ball?.bounceCount ?? 0,
    evidence: { drop: 0, slice: 0, lob: 0, pace: 0 },
  };
  if (player?._tm) player._tm.perception = state;
  return state;
}

function observedEvidence(estimate, ball, confidence, previous) {
  const horizontalSpeed = Math.hypot(estimate.vel.x, estimate.vel.y);
  const vertical = estimate.vel.z;
  const height = estimate.pos.z;
  const spinX = Math.abs(estimate.spin.x);
  const shortSlow = clamp((20 - horizontalSpeed) / 9, 0, 1);
  const descendingSoft = clamp((-vertical - 0.2) / 4.5, 0, 1) * clamp((2.2 - height) / 1.4, 0, 1);
  const dropSignal = shortSlow * 0.62 + descendingSoft * 0.23 + clamp(spinX / 38, 0, 1) * 0.15;
  const sliceSignal = clamp(spinX / 34, 0, 1) * clamp((28 - horizontalSpeed) / 15, 0.25, 1);
  const lobSignal = clamp((vertical - 2.0) / 5.5, 0, 1) * 0.54 + clamp((height - 1.6) / 2.5, 0, 1) * 0.46;
  const learn = clamp(0.08 + confidence * 0.22 + ((ball?.bounceCount ?? 0) > 0 ? 0.18 : 0), 0.08, 0.42);
  return {
    drop: clamp(previous.drop + (dropSignal - previous.drop) * learn, 0, 1),
    slice: clamp(previous.slice + (sliceSignal - previous.slice) * learn, 0, 1),
    lob: clamp(previous.lob + (lobSignal - previous.lob) * learn, 0, 1),
    pace: clamp(previous.pace + (clamp(horizontalSpeed / 42, 0, 1) - previous.pace) * learn, 0, 1),
  };
}

function updateEstimate(state, ball, dt, confidence) {
  const estimate = state.estimate;
  const delta = Math.max(0, dt || 0);
  // Primeiro o jogador extrapola sua crença; depois corrige com a observação
  // visual. Ele nunca recebe o estado verdadeiro como resposta pronta.
  estimate.pos.x += estimate.vel.x * delta;
  estimate.pos.y += estimate.vel.y * delta;
  estimate.pos.z = Math.max(0, estimate.pos.z + estimate.vel.z * delta);
  const observationGain = clamp((confidence - 0.04) * (0.16 + state.skill * 0.22), 0.025, 0.34);
  const residual = 1 - confidence;
  const n = (channel, scale) => stableNoise(state.seed + Math.floor(state.age * 30), channel) * scale * residual;
  estimate.pos.x += ((ball?.pos?.x ?? estimate.pos.x) + n(11, 0.055) - estimate.pos.x) * observationGain;
  estimate.pos.y += ((ball?.pos?.y ?? estimate.pos.y) + n(12, 0.040) - estimate.pos.y) * observationGain;
  estimate.pos.z += ((ball?.pos?.z ?? estimate.pos.z) + n(13, 0.032) - estimate.pos.z) * observationGain;
  estimate.vel.x += ((ball?.vel?.x ?? estimate.vel.x) + n(14, 0.72) - estimate.vel.x) * observationGain;
  estimate.vel.y += ((ball?.vel?.y ?? estimate.vel.y) + n(15, 0.82) - estimate.vel.y) * observationGain;
  estimate.vel.z += ((ball?.vel?.z ?? estimate.vel.z) + n(16, 0.52) - estimate.vel.z) * observationGain;
  estimate.spin.x += ((ball?.spin?.x ?? estimate.spin.x) + n(17, 2.8) - estimate.spin.x) * observationGain * 0.74;
  estimate.spin.y += ((ball?.spin?.y ?? estimate.spin.y) + n(18, 1.8) - estimate.spin.y) * observationGain * 0.74;
  estimate.spin.z += ((ball?.spin?.z ?? estimate.spin.z) + n(19, 2.4) - estimate.spin.z) * observationGain * 0.74;
}

function beliefBall(ball, state) {
  const evidence = state.evidence;
  const inferredDrop = evidence.drop >= 0.74 && state.confidence >= 0.64;
  return {
    pos: { ...state.estimate.pos },
    vel: { ...state.estimate.vel },
    spin: { ...state.estimate.spin },
    inFlight: ball?.inFlight !== false,
    bounceCount: ball?.bounceCount ?? 0,
    lastBounceSide: ball?.lastBounceSide ?? 0,
    lastHitBy: ball?.lastHitBy ?? null,
    outGraceTimer: ball?.outGraceTimer ?? 0,
    _timeSinceBounce: ball?._timeSinceBounce ?? 0,
    _deadBall: inferredDrop && (ball?.bounceCount ?? 0) > 0,
    _isDropShot: inferredDrop,
    _sliceProfile: evidence.slice > 0.72 ? 'INFERRED_SLICE' : null,
    _sliceCarryMult: evidence.slice > 0.72 ? clamp(1 - evidence.slice * 0.12, 0.86, 1) : 1,
    _servePhysType: null,
    _wrongFoot: null,
    _inferredShape: evidence.drop > 0.58 ? 'DROP_LIKELY' : evidence.lob > 0.62 ? 'LOB_LIKELY' : evidence.slice > 0.62 ? 'SLICE_LIKELY' : 'UNKNOWN',
    _perceptionConfidence: state.confidence,
    _perceptionUncertainty: 1 - state.confidence,
    _beliefVersion: MOVEMENT_BELIEF_VERSION,
  };
}

export function updateMovementPerception(player, gs, dt, forceNewShot = false) {
  const ball = gs?.ball;
  if (!ball || !player?._tm) return ball;
  const expectedKey = `${ball.lastHitBy ?? -1}:${gs?.rally ?? 0}:${gs?._currentPointId ?? gs?.pointHistory?.length ?? 0}`;
  let state = player._tm.perception;
  if (forceNewShot || !state || state.shotKey !== expectedKey) state = beginMovementPerception(player, gs, ball);

  state.age += Math.max(0, dt || 0);
  const bouncedNow = (ball.bounceCount ?? 0) > (state.lastBounceCount ?? 0);
  state.lastBounceCount = ball.bounceCount ?? 0;
  // Na devolução, leitura do lançamento/gesto e split-step comprimem a
  // aquisição. Continua havendo erro, mas não a cegueira de tratar 200 km/h
  // como uma bola de rally observada somente depois do impacto.
  const acquisition = clamp((state.age - state.reactionDelay) / (state.isServeReturn ? 0.28 : 0.52), 0, 1);
  const skillCeiling = 0.82 + state.skill * 0.145;
  const bounceEvidence = (ball.bounceCount ?? 0) > 0 ? 0.075 + state.skill * 0.035 : 0;
  state.confidence = clamp(0.04 + state.skill * 0.07 + acquisition * skillCeiling + bounceEvidence + (bouncedNow ? 0.055 : 0), 0.04, 0.965);
  updateEstimate(state, ball, dt, state.confidence);
  state.evidence = observedEvidence(state.estimate, ball, state.confidence, state.evidence);
  const perceived = beliefBall(ball, state);
  player._perceptionState = {
    version: MOVEMENT_BELIEF_VERSION,
    confidence: state.confidence,
    uncertainty: 1 - state.confidence,
    reactionDelay: state.reactionDelay,
    age: state.age,
    isServeReturn: state.isServeReturn,
    laneError: perceived.vel.x - (ball.vel?.x ?? 0),
    paceRatio: Math.abs(ball.vel?.y ?? 0) > 0.01 ? perceived.vel.y / ball.vel.y : 1,
    positionError: Math.hypot(perceived.pos.x - (ball.pos?.x ?? 0), perceived.pos.y - (ball.pos?.y ?? 0)),
    evidence: { ...state.evidence },
    inferredShape: perceived._inferredShape,
  };
  return perceived;
}

export function resetPerception(player) {
  if (player?._tm) player._tm.perception = null;
  if (player) player._perceptionState = null;
}
