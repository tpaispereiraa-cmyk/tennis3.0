import { ShotDirection, ShotFamily, ShotIntent, ShotPhase, TargetDepth, TargetWidth } from './ShotTypes.js';
import { SliceProfile } from './SliceProfiles.js';

// A família descreve a mecânica. O blueprint descreve o golpe que o jogador
// realmente enxerga: geometria, finalidade, exigência e assinatura de voo.
const B = (id, label, family, intent, direction, depth, width, config = {}) => Object.freeze({
  id, label, family, intent, direction, depth, width,
  phases: config.phases ?? [ShotPhase.RALLY_NEUTRAL, ShotPhase.RALLY_ATTACK, ShotPhase.RALLY_DEFENSE],
  baseUtility: config.baseUtility ?? 0.5,
  risk: config.risk ?? 0.4,
  requirements: Object.freeze(config.requirements ?? {}),
  capabilityWeights: Object.freeze(config.capabilityWeights ?? {}),
  preferences: Object.freeze(config.preferences ?? {}),
  trajectory: Object.freeze(config.trajectory ?? {}),
  tags: Object.freeze(config.tags ?? []),
  finishMode: config.finishMode ?? null,
  buildMode: config.buildMode ?? null,
  sliceProfile: config.sliceProfile ?? null,
  allowWrongFoot: config.allowWrongFoot ?? true,
});

const GROUND = [ShotPhase.RALLY_NEUTRAL, ShotPhase.RALLY_ATTACK, ShotPhase.RALLY_DEFENSE, ShotPhase.APPROACH];
const ATTACK = [ShotPhase.RALLY_NEUTRAL, ShotPhase.RALLY_ATTACK, ShotPhase.APPROACH, ShotPhase.POINT_FINISH];
const DEFENSE = [ShotPhase.RALLY_NEUTRAL, ShotPhase.RALLY_DEFENSE, ShotPhase.PASSING];
const PASS = [ShotPhase.PASSING, ShotPhase.RALLY_DEFENSE];
const NET = [ShotPhase.NET, ShotPhase.POINT_FINISH];

export const SHOT_BLUEPRINTS = Object.freeze([
  B('TOPSPIN_DEEP_CROSS', 'Topspin cruzado profundo', ShotFamily.TOPSPIN, ShotIntent.BUILD, ShotDirection.CROSS, TargetDepth.DEEP, TargetWidth.WIDE, {
    phases: GROUND, baseUtility: 0.67, risk: 0.28, capabilityWeights: { topspin: 0.40, wingControl: 0.32, wingPower: 0.16, consistency: 0.12 }, tags: ['rally_ball', 'heavy', 'move'], trajectory: { powerAdd: 0.7, topspinMult: 1.10, netClearanceAdd: 0.12 },
  }),
  B('TOPSPIN_HEAVY_MIDDLE', 'Bola pesada no centro', ShotFamily.TOPSPIN, ShotIntent.CONTROL, ShotDirection.CENTER, TargetDepth.DEEP, TargetWidth.CENTER, {
    phases: GROUND, baseUtility: 0.64, risk: 0.18, capabilityWeights: { topspin: 0.42, wingControl: 0.34, consistency: 0.24 }, tags: ['rally_ball', 'safe', 'deny_angle'], trajectory: { powerAdd: -0.2, topspinMult: 1.24, netClearanceAdd: 0.24 }, allowWrongFoot: false,
  }),
  B('TOPSPIN_HIGH_HEAVY', 'Topspin alto e pesado', ShotFamily.TOPSPIN, ShotIntent.RESET, ShotDirection.CROSS, TargetDepth.DEEP, TargetWidth.OPEN_COURT, {
    phases: DEFENSE, baseUtility: 0.58, risk: 0.22, capabilityWeights: { topspin: 0.46, defense: 0.26, wingControl: 0.18, stamina: 0.10 }, tags: ['reset', 'height', 'push_back'], trajectory: { powerAdd: -1.1, topspinMult: 1.38, netClearanceAdd: 0.52 },
  }),
  B('TOPSPIN_SHORT_ANGLE', 'Ângulo curto com topspin', ShotFamily.TOPSPIN, ShotIntent.PRESSURE, ShotDirection.CROSS, TargetDepth.SHORT, TargetWidth.ANGLE, {
    phases: ATTACK, baseUtility: 0.47, risk: 0.51, requirements: { minQ: 0.57, minReady: 0.46, minArrival: -0.045, opponentDeep: 8.75 }, capabilityWeights: { topspin: 0.36, wingControl: 0.34, touch: 0.18, tacticalVision: 0.12 }, preferences: { buildStyles: ['CROSS_SHORT_ANGLE', 'VARIED', 'DROP_VARIATION'] }, tags: ['short_angle', 'touch_variation', 'open_court'], trajectory: { powerAdd: -2.0, topspinMult: 1.32, curveSpin: 0.28, netClearanceAdd: 0.14 }, finishMode: 'angle_putaway',
  }),
  B('BANANA_CURVE', 'Banana com curva externa', ShotFamily.TOPSPIN, ShotIntent.REDIRECT, ShotDirection.CROSS, TargetDepth.MID_DEEP, TargetWidth.ANGLE, {
    phases: [...ATTACK, ShotPhase.PASSING], baseUtility: 0.39, risk: 0.58, requirements: { minQ: 0.61, minReady: 0.50, minArrival: -0.025, minTopspin: 0.66, playerWide: 1.25 }, capabilityWeights: { topspin: 0.42, wingControl: 0.26, tacticalVision: 0.18, wingPower: 0.14 }, preferences: { signatures: ['BANANA_BH', 'FH_BANANA_CROSS', 'FH_TOPSPIN_CROSS', 'BH_TOPSPIN_CROSS'], buildStyles: ['CROSS_SHORT_ANGLE', 'HEAVY_SPIN_PRESSURE', 'VARIED'] }, tags: ['banana', 'curve', 'signature', 'spectacular', 'passing'], trajectory: { powerAdd: 0.25, topspinMult: 1.34, curveSpin: 0.92, netClearanceAdd: 0.21 }, finishMode: 'angle_putaway',
  }),
  B('TOPSPIN_INSIDE_OUT', 'Forehand inside-out pesado', ShotFamily.TOPSPIN, ShotIntent.PRESSURE, ShotDirection.INSIDE_OUT, TargetDepth.MID_DEEP, TargetWidth.WIDE, {
    phases: ATTACK, baseUtility: 0.51, risk: 0.44, requirements: { minQ: 0.54, minReady: 0.42, forehandOnly: true }, capabilityWeights: { forehandPower: 0.34, topspin: 0.28, forehandControl: 0.24, movement: 0.14 }, preferences: { signatures: ['FH_INSIDE_OUT', 'INSIDE_OUT_FH'] }, tags: ['forehand', 'runaround', 'move', 'plus_one'], trajectory: { powerAdd: 1.25, topspinMult: 1.14, curveSpin: 0.20, netClearanceAdd: 0.04 }, buildMode: 'attack',
  }),
  B('TOPSPIN_APPROACH_DEEP', 'Topspin de aproximação profundo', ShotFamily.TOPSPIN, ShotIntent.APPROACH, ShotDirection.DTL, TargetDepth.DEEP, TargetWidth.WIDE, {
    phases: [ShotPhase.APPROACH, ShotPhase.RALLY_ATTACK], baseUtility: 0.44, risk: 0.39,
    requirements: { minQ: 0.55, minReady: 0.44, minArrival: -0.05, ballShort: 9.2, playerInside: 10.25 },
    capabilityWeights: { wingControl: 0.28, topspin: 0.25, volley: 0.22, tacticalVision: 0.16, movement: 0.09 },
    preferences: { netGames: ['HUNTER', 'PROACTIVE', 'OPPORTUNIST'] },
    tags: ['approach', 'move', 'push_back'], trajectory: { powerAdd: 0.5, topspinMult: 1.15, netClearanceAdd: 0.13 }, buildMode: 'attack',
  }),
  B('TOPSPIN_PASS_CROSS', 'Passada cruzada com topspin', ShotFamily.TOPSPIN, ShotIntent.PASS, ShotDirection.CROSS, TargetDepth.MID_DEEP, TargetWidth.ANGLE, {
    phases: PASS, baseUtility: 0.72, risk: 0.48, requirements: { opponentAtNet: true }, capabilityWeights: { topspin: 0.33, wingControl: 0.30, tacticalVision: 0.20, wingPower: 0.17 }, tags: ['passing', 'curve', 'open_court'], trajectory: { powerAdd: 1.25, topspinMult: 1.22, curveSpin: 0.38, netClearanceAdd: -0.04 }, finishMode: 'angle_putaway',
  }),

  B('FLAT_CROSS_DRIVE', 'Drive cruzado firme', ShotFamily.FLAT_DRIVE, ShotIntent.PRESSURE, ShotDirection.CROSS, TargetDepth.MID_DEEP, TargetWidth.WIDE, {
    phases: ATTACK, baseUtility: 0.57, risk: 0.44, requirements: { minQ: 0.50, minArrival: -0.08 }, capabilityWeights: { wingPower: 0.38, wingControl: 0.34, aggression: 0.16, consistency: 0.12 }, tags: ['drive', 'pace', 'move'], trajectory: { powerAdd: 1.45, topspinMult: 0.86, netClearanceAdd: -0.05 }, buildMode: 'attack',
  }),
  B('FLAT_DTL', 'Drive paralelo', ShotFamily.FLAT_DRIVE, ShotIntent.REDIRECT, ShotDirection.DTL, TargetDepth.MID_DEEP, TargetWidth.WIDE, {
    phases: ATTACK, baseUtility: 0.43, risk: 0.61, requirements: { minQ: 0.59, minReady: 0.48, minArrival: -0.035 }, capabilityWeights: { wingControl: 0.36, wingPower: 0.30, tacticalVision: 0.22, aggression: 0.12 }, preferences: { buildStyles: ['DTL_HUNTER', 'COUNTER_REDIRECT'] }, tags: ['line_change', 'winner_path', 'redirect'], trajectory: { powerAdd: 1.75, topspinMult: 0.78, netClearanceAdd: -0.08 }, finishMode: 'through_line',
  }),
  B('FLAT_OPEN_COURT', 'Aceleração no espaço aberto', ShotFamily.FLAT_DRIVE, ShotIntent.FINISH, ShotDirection.CROSS, TargetDepth.MID, TargetWidth.OPEN_COURT, {
    phases: [ShotPhase.RALLY_ATTACK, ShotPhase.POINT_FINISH, ShotPhase.APPROACH], baseUtility: 0.44, risk: 0.62, requirements: { minQ: 0.64, minReady: 0.55, minArrival: -0.015, opponentDisplaced: 1.25 }, capabilityWeights: { wingPower: 0.38, wingControl: 0.32, aggression: 0.17, tacticalVision: 0.13 }, tags: ['finish', 'winner', 'open_court'], trajectory: { powerAdd: 2.75, topspinMult: 0.76, netClearanceAdd: -0.10 }, finishMode: 'power_putaway',
  }),
  B('FLAT_BODY_JAM', 'Pancada no corpo', ShotFamily.FLAT_DRIVE, ShotIntent.FINISH, ShotDirection.BODY, TargetDepth.MID, TargetWidth.BODY, {
    phases: [ShotPhase.RALLY_ATTACK, ShotPhase.POINT_FINISH, ShotPhase.PASSING], baseUtility: 0.41, risk: 0.48, requirements: { minQ: 0.58, minReady: 0.46, opponentInside: 8.8 }, capabilityWeights: { wingPower: 0.40, wingControl: 0.28, tacticalVision: 0.18, aggression: 0.14 }, tags: ['finish', 'body', 'jam'], trajectory: { powerAdd: 2.45, topspinMult: 0.75, netClearanceAdd: -0.05 }, finishMode: 'power_body', allowWrongFoot: false,
  }),
  B('FLAT_INSIDE_IN', 'Forehand inside-in', ShotFamily.FLAT_DRIVE, ShotIntent.FINISH, ShotDirection.INSIDE_IN, TargetDepth.MID_DEEP, TargetWidth.WIDE, {
    phases: ATTACK, baseUtility: 0.36, risk: 0.68, requirements: { minQ: 0.66, minReady: 0.58, minArrival: 0, forehandOnly: true }, capabilityWeights: { forehandPower: 0.39, forehandControl: 0.32, tacticalVision: 0.17, movement: 0.12 }, tags: ['forehand', 'runaround', 'line_change', 'winner'], trajectory: { powerAdd: 2.65, topspinMult: 0.72, netClearanceAdd: -0.10 }, finishMode: 'through_line',
  }),
  B('FLAT_WRONG_FOOT', 'Drive no contrapé', ShotFamily.FLAT_DRIVE, ShotIntent.FINISH, ShotDirection.BODY, TargetDepth.MID_DEEP, TargetWidth.BODY, {
    phases: ATTACK, baseUtility: 0.38, risk: 0.53, requirements: { minQ: 0.59, minReady: 0.48, opponentMoving: 0.42 }, capabilityWeights: { tacticalVision: 0.34, wingControl: 0.27, wingPower: 0.25, reading: 0.14 }, tags: ['finish', 'wrong_foot', 'read_movement'], trajectory: { powerAdd: 2.0, topspinMult: 0.80, netClearanceAdd: -0.04 }, finishMode: 'behind_runner',
  }),
  B('FLAT_PASS_DTL', 'Passada paralela reta', ShotFamily.FLAT_DRIVE, ShotIntent.PASS, ShotDirection.DTL, TargetDepth.MID_DEEP, TargetWidth.WIDE, {
    phases: PASS, baseUtility: 0.67, risk: 0.62, requirements: { opponentAtNet: true, minQ: 0.51 }, capabilityWeights: { wingPower: 0.34, wingControl: 0.32, tacticalVision: 0.22, reading: 0.12 }, tags: ['passing', 'line_change', 'winner'], trajectory: { powerAdd: 2.0, topspinMult: 0.72, netClearanceAdd: -0.10 }, finishMode: 'through_line',
  }),

  B('SLICE_DEEP_KNIFE', 'Slice profundo e venenoso', ShotFamily.SLICE, ShotIntent.REDIRECT, ShotDirection.DTL, TargetDepth.DEEP, TargetWidth.WIDE, {
    phases: GROUND, baseUtility: 0.49, risk: 0.35, requirements: { minQ: 0.44 }, capabilityWeights: { slice: 0.42, wingControl: 0.30, touch: 0.16, tacticalVision: 0.12 }, preferences: { buildStyles: ['SLICE_CONTROL', 'VARIED'] }, tags: ['slice', 'skid', 'rhythm_break'], trajectory: { powerAdd: 0.9, backspinMult: 1.24, netClearanceAdd: -0.03 }, sliceProfile: SliceProfile.DEEP_DRIVE,
  }),
  B('SLICE_RESET_CROSS', 'Slice defensivo cruzado', ShotFamily.SLICE, ShotIntent.RESET, ShotDirection.CROSS, TargetDepth.DEEP, TargetWidth.OPEN_COURT, {
    phases: DEFENSE, baseUtility: 0.62, risk: 0.22, capabilityWeights: { slice: 0.34, defense: 0.28, wingControl: 0.24, touch: 0.14 }, tags: ['slice', 'reset', 'low'], trajectory: { powerAdd: -0.2, backspinMult: 1.12, netClearanceAdd: 0.18 }, sliceProfile: SliceProfile.SKIDDING_RESET,
  }),
  B('SLICE_SHORT_POISON', 'Slice curto ofensivo', ShotFamily.SLICE, ShotIntent.PRESSURE, ShotDirection.CROSS, TargetDepth.SHORT, TargetWidth.ANGLE, {
    phases: ATTACK, baseUtility: 0.38, risk: 0.46, requirements: { minQ: 0.60, minReady: 0.50, minArrival: -0.025, opponentDeep: 9.05, minSlice: 0.61 }, capabilityWeights: { slice: 0.36, touch: 0.30, wingControl: 0.22, tacticalVision: 0.12 }, preferences: { buildStyles: ['SLICE_CONTROL', 'DROP_VARIATION', 'VARIED'] }, tags: ['slice', 'short', 'touch_variation', 'rhythm_break'], trajectory: { powerAdd: -2.0, backspinMult: 1.36, curveSpin: 0.18, netClearanceAdd: 0.13 }, sliceProfile: SliceProfile.SHORT_VARIATION,
  }),
  B('SLICE_CHIP_APPROACH', 'Chip de aproximação', ShotFamily.SLICE, ShotIntent.APPROACH, ShotDirection.DTL, TargetDepth.DEEP, TargetWidth.BODY, {
    phases: [ShotPhase.APPROACH, ShotPhase.RALLY_ATTACK], baseUtility: 0.46, risk: 0.36, requirements: { minQ: 0.50, minReady: 0.38, ballShort: 8.55 }, capabilityWeights: { slice: 0.29, volley: 0.27, wingControl: 0.22, tacticalVision: 0.14, movement: 0.08 }, preferences: { netGames: ['HUNTER', 'PROACTIVE', 'OPPORTUNIST'] }, tags: ['slice', 'approach', 'jam'], trajectory: { powerAdd: 0.45, backspinMult: 1.12, netClearanceAdd: -0.02 }, sliceProfile: SliceProfile.CHIP_APPROACH,
  }),

  B('DROP_DISGUISED_CROSS', 'Curtinha disfarçada cruzada', ShotFamily.DROP, ShotIntent.FINISH, ShotDirection.CROSS, TargetDepth.SHORT, TargetWidth.ANGLE, {
    phases: ATTACK, baseUtility: 0.29, risk: 0.58, requirements: { minQ: 0.57, minReady: 0.48, minArrival: -0.04, opponentDeep: 9.25, minTouch: 0.62, ballZ: [0.62, 1.50], playerInside: 10.35 }, capabilityWeights: { touch: 0.42, wingControl: 0.23, tacticalVision: 0.21, slice: 0.14 }, preferences: { buildStyles: ['DROP_VARIATION', 'VARIED'] }, tags: ['drop', 'disguise', 'touch_variation', 'finish'], trajectory: { powerAdd: -1.1, backspinMult: 1.20, curveSpin: 0.18, netClearanceAdd: 0.24 }, finishMode: 'drop_putaway', allowWrongFoot: false,
  }),
  B('DROP_STRAIGHT_DEAD', 'Curtinha morta paralela', ShotFamily.DROP, ShotIntent.FINISH, ShotDirection.DTL, TargetDepth.SHORT, TargetWidth.OPEN_COURT, {
    phases: ATTACK, baseUtility: 0.25, risk: 0.62, requirements: { minQ: 0.62, minReady: 0.53, minArrival: -0.02, opponentDeep: 9.45, minTouch: 0.67, ballZ: [0.66, 1.45], playerInside: 9.95 }, capabilityWeights: { touch: 0.45, wingControl: 0.24, tacticalVision: 0.20, slice: 0.11 }, preferences: { signatures: ['DROP_HIDDEN', 'DROP_DEAD', 'DROP_SHOT'], buildStyles: ['DROP_VARIATION'] }, tags: ['drop', 'dead', 'touch_variation', 'finish', 'signature'], trajectory: { powerAdd: -1.6, backspinMult: 1.34, netClearanceAdd: 0.20 }, finishMode: 'drop_putaway', allowWrongFoot: false,
  }),

  B('LOB_DEFENSIVE_DEEP', 'Lob defensivo profundo', ShotFamily.LOB, ShotIntent.DEFEND, ShotDirection.CENTER, TargetDepth.DEEP, TargetWidth.CENTER, {
    phases: DEFENSE, baseUtility: 0.57, risk: 0.38, requirements: { opponentInside: 8.65 }, capabilityWeights: { defense: 0.32, touch: 0.28, wingControl: 0.22, reading: 0.18 }, tags: ['lob', 'rescue', 'height'], trajectory: { powerAdd: -2.0, topspinMult: 0.92, netClearanceAdd: 0.85 }, allowWrongFoot: false,
  }),
  B('LOB_TOPSPIN_PASS', 'Lob ofensivo com topspin', ShotFamily.LOB, ShotIntent.PASS, ShotDirection.CROSS, TargetDepth.DEEP, TargetWidth.OPEN_COURT, {
    phases: PASS, baseUtility: 0.59, risk: 0.55, requirements: { opponentAtNet: true, minQ: 0.54, minTopspin: 0.58 }, capabilityWeights: { topspin: 0.30, touch: 0.29, wingControl: 0.23, tacticalVision: 0.18 }, tags: ['lob', 'passing', 'topspin', 'winner_path'], trajectory: { powerAdd: 0.1, topspinMult: 1.30, netClearanceAdd: 1.20 }, finishMode: 'lob_pass',
  }),
  B('LOB_OFFENSIVE_LIFT', 'Lob ofensivo de surpresa', ShotFamily.LOB, ShotIntent.PRESSURE, ShotDirection.DTL, TargetDepth.DEEP, TargetWidth.OPEN_COURT, {
    phases: ATTACK, baseUtility: 0.25, risk: 0.53, requirements: { minQ: 0.61, minReady: 0.50, opponentInside: 8.15 }, capabilityWeights: { touch: 0.34, tacticalVision: 0.26, wingControl: 0.22, topspin: 0.18 }, tags: ['lob', 'surprise', 'rhythm_break'], trajectory: { powerAdd: -0.5, topspinMult: 1.16, netClearanceAdd: 1.05 },
  }),

  B('VOLLEY_PUNCH_DEEP', 'Voleio firme e profundo', ShotFamily.VOLLEY, ShotIntent.PRESSURE, ShotDirection.DTL, TargetDepth.DEEP, TargetWidth.BODY, {
    phases: NET, baseUtility: 0.67, risk: 0.34, capabilityWeights: { volley: 0.48, reading: 0.22, wingControl: 0.16, movement: 0.14 }, tags: ['volley', 'punch', 'jam'], trajectory: { powerAdd: 1.5, netClearanceAdd: -0.04 },
  }),
  B('VOLLEY_ANGLE', 'Voleio angulado', ShotFamily.VOLLEY, ShotIntent.FINISH, ShotDirection.CROSS, TargetDepth.SHORT, TargetWidth.ANGLE, {
    phases: NET, baseUtility: 0.55, risk: 0.48, requirements: { minQ: 0.56, minReady: 0.40 }, capabilityWeights: { volley: 0.39, touch: 0.29, reading: 0.18, tacticalVision: 0.14 }, preferences: { signatures: ['VOLLEY_ANGLE', 'VOLLEY_FINISH'] }, tags: ['volley', 'angle', 'finish'], trajectory: { powerAdd: -1.25, curveSpin: 0.16, netClearanceAdd: 0.05 }, finishMode: 'angle_putaway',
  }),
  B('VOLLEY_DROP', 'Drop volley', ShotFamily.VOLLEY, ShotIntent.FINISH, ShotDirection.CROSS, TargetDepth.SHORT, TargetWidth.OPEN_COURT, {
    phases: NET, baseUtility: 0.34, risk: 0.52, requirements: { minQ: 0.61, minReady: 0.48, minTouch: 0.63, opponentDeep: 7.8 }, capabilityWeights: { volley: 0.36, touch: 0.36, reading: 0.16, wingControl: 0.12 }, tags: ['volley', 'drop', 'touch_variation', 'finish'], trajectory: { powerAdd: -2.8, backspinMult: 1.32, netClearanceAdd: 0.12 }, finishMode: 'drop_volley', allowWrongFoot: false,
  }),
  B('SWING_VOLLEY', 'Swing volley', ShotFamily.VOLLEY, ShotIntent.FINISH, ShotDirection.CROSS, TargetDepth.MID, TargetWidth.OPEN_COURT, {
    phases: NET, baseUtility: 0.35, risk: 0.64, requirements: { minQ: 0.66, minReady: 0.52, ballZ: [1.08, 2.30] }, capabilityWeights: { volley: 0.28, wingPower: 0.30, wingControl: 0.24, aggression: 0.18 }, tags: ['volley', 'swing', 'winner'], trajectory: { powerAdd: 3.0, topspinMult: 1.08, netClearanceAdd: -0.12 }, finishMode: 'power_putaway',
  }),
  B('SMASH_POWER', 'Smash de potência', ShotFamily.SMASH, ShotIntent.FINISH, ShotDirection.BODY, TargetDepth.MID, TargetWidth.BODY, {
    phases: NET, baseUtility: 0.74, risk: 0.40, requirements: { overhead: true }, capabilityWeights: { smash: 0.55, reading: 0.18, movement: 0.15, mentality: 0.12 }, tags: ['smash', 'finish', 'power'], trajectory: { powerAdd: 3.4, netClearanceAdd: -0.08 }, finishMode: 'power_body', allowWrongFoot: false,
  }),
  B('SMASH_ANGLE', 'Smash angulado', ShotFamily.SMASH, ShotIntent.FINISH, ShotDirection.CROSS, TargetDepth.MID, TargetWidth.OPEN_COURT, {
    phases: NET, baseUtility: 0.63, risk: 0.50, requirements: { overhead: true, minQ: 0.56 }, capabilityWeights: { smash: 0.48, wingControl: 0.20, reading: 0.18, tacticalVision: 0.14 }, tags: ['smash', 'finish', 'angle'], trajectory: { powerAdd: 2.1, netClearanceAdd: -0.04 }, finishMode: 'angle_putaway',
  }),
]);

export const SHOT_BLUEPRINT_BY_ID = Object.freeze(Object.fromEntries(SHOT_BLUEPRINTS.map((blueprint) => [blueprint.id, blueprint])));

export function getShotBlueprint(id) {
  return SHOT_BLUEPRINT_BY_ID[id] ?? null;
}

export function getBlueprintsForPhase(phase) {
  return SHOT_BLUEPRINTS.filter((blueprint) => blueprint.phases.includes(phase));
}
