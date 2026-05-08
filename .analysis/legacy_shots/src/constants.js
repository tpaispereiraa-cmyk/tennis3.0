// ── Court (metres) ──────────────────────────────────────────────
export const COURT = {
  width: 10.97, singlesW: 8.23, halfW: 10.97 / 2,
  length: 23.77, halfL: 23.77 / 2,
  serviceLineY: 6.4, netHeight: 0.86,
};

// ── Physics ─────────────────────────────────────────────────────
export const PHYSICS = {
  gravity: -9.81, dragCoeff: 0.55, ballRadius: 0.033,
  ballMass: 0.057, airDensity: 1.2, restitution: 0.75,
  // groundFriction: 0.82→0.78. Com as velocidades aumentadas (CAL v2), a bola pós-quique
  // ainda viajava rápido demais. 0.78 aplica mais desaceleração horizontal no bounce.
  // Impacto: FLAT 155km/h → pós-quique ~117→107km/h (topspin), ~105→96km/h (backspin).
  groundFriction: 0.78, magnusCoeff: 0.25,
  // FIX P1.1: coeficiente único de spin no quique — usado em handleGroundBounce
  // E em predictTrajectory. Antes eram 0.075 e 0.055 respectivamente (36% de divergência),
  // causando previsões sistemáticamente erradas para topspin/kick.
  spinBounceCoeff: 0.075,
};

// ── Timing (seconds unless noted) ───────────────────────────────
export const TIMING = {
  preServeDelay: 1.2, serveWindup: 0.4, pointPauseMs: 800,
  hitCooldown: 0.25, swingDuration: 0.18,
};

export const THRESHOLDS = {
  ballStopSpeed: 0.5, netTolerance: 0.05, outTolerance: 0.05,
  reachStretch: 0.75, errorRallyMin: 1, netZone: 1.8,  // errorRallyMin: UE pode acontecer a partir do 1º rally shot
  ballHitMaxZ: 2.5,
  ballHitMinSpd:           0.25,  // era 0.5 — bola lenta mas fora do reach → não bate
  ballHitMinSpdWithinReach: 0.10, // override: se dentro do reach, aceita velocidade baixíssima (slice morto)
  outerPlayerY: 6.0,   // metres beyond baseline players can run — alinhado com chaseOutLimitY (era 4.5, criava zona inalcançável)
  outerPlayerX: 2.2,   // metres beyond sideline players can run (new)
  // ── Após 1º quique válido dentro, bola pode sair e ser rebatida de fora.
  // Se ultrapassar esses limites sem ser rebatida → winner por abandono.
  chaseOutLimitY: 6.0,  // metros além da baseline (halfL + 6m)
  chaseOutLimitX: 4.0,  // metros além da lateral (halfW + 4m)
  pressureBallZ: 0.45, pressureReach: 0.65,
  forcedErrorDiff: 0.72,      // [FIX v1] era 0.48 — diff=d/effectiveReach; muito baixo → UE=0
  forcedErrorPressure: 0.82,  // [FIX v1.1] era hardcoded 0.65 — steady-state neutro ≈ 0.43, antes quase todo erro virava FE
  // ── Saque Gaussiano: sigma base de dispersão de mira (metros) ──────────────
  // 1º saque: sigma escalonado por srv1Prec do jogador (0=máximo erro, 100=mínimo)
  // 2º saque: sigma menor (conservador) mas aumenta com fadiga e pressão
  serveGaussSigma1: 0.28,  // sigma base no 1º saque (alto risco = maior variância)
  serveGaussSigma2: 0.14,  // sigma base no 2º saque (conservador)
  // Shot quality thresholds
  qualityDefensive: 0.40,   // [PATCH v1] raised 0.27→0.40: below this → forced defensive shot
  qualityNeutral:   0.58,   // [PATCH v1] raised 0.60→0.58: below this → no winners/banana
  arrivalEarly:     0.12,   // seconds early = full timing quality (era 0.20 — muito difícil de atingir → sempre "atrasado")
  arrivalLate:     -0.18,   // seconds = 0 timing quality (rushed)
};

export const PLAYER_CFG = {
  speed: 5.4, reach: 0.85, maxAccel: 10, maxDecel: 16, friction: 10,
};

// ── Stamina system ───────────────────────────────────────────────
export const STAMINA = {
  decayPerShot:      0.040,  // stamina lost per shot hit during rally (patch rápido)
  recoveryPerPoint:  0.13,   // less instant recovery between points
  recoveryPerGame:   0.05,   // lighter recovery on changeover
  recoveryPerSet:    0.14,   // sets recover, but don't erase fatigue
  speedMinFactor:    0.78,   // min movement speed multiplier at 0 stamina
  reachMinFactor:    0.83,   // min reach multiplier at 0 stamina
  errorBoostMax:     0.012,  // max extra error rate at 0 stamina — reduzido de 0.022: fadiga → movimento lento, não erros diretos
  logThreshold:      0.32,   // log fatigue warning when dropping below this
  // ── Sprint stamina drain (per second, scaled by intensity above jog threshold) ─
  sprintDecayRate:   0.032,  // stamina/s at full sprint above jog threshold
  sprintThreshold:   0.72,   // fraction of maxSpd above which sprint drain kicks in
};

// ── Renderer ─────────────────────────────────────────────────────
export const DT        = 1 / 120;
export const SCALE     = 26;                  // aumentado de 18 → maior canvas nativo = quadra maior
export const CL        = 23.77 * SCALE;       // canvas pixels — court length axis
export const CW        = 10.97 * SCALE;       // canvas pixels — court width axis
export const TRAIL_LEN = 22;
export const BALL_AREA = Math.PI * 0.033 ** 2;
// Extra canvas space beyond court for player runback zones
export const CANVAS_PAD_Y = 220;  // reduzido de 420 — menos dead-space fora da linha de fundo
export const CANVAS_PAD_X = 120;  // reduzido de 240 — menos dead-space lateral

// ── Enums ────────────────────────────────────────────────────────
export const GameState = Object.freeze({
  PRE_SERVE: 'PRE_SERVE', SERVING: 'SERVING',
  RALLY: 'RALLY', POINT_END: 'POINT_END', GAME_OVER: 'GAME_OVER',
  MEDICAL_TIMEOUT: 'MEDICAL_TIMEOUT',
});

export const SpinType = Object.freeze({ FLAT: 0, TOPSPIN: 1, SLICE: -1 });

export const ShotType = Object.freeze({
  TOPSPIN: 'TOPSPIN', FLAT: 'FLAT', SLICE: 'SLICE', DROP: 'DROP',
  LOB_DEF: 'LOB_DEF', LOB_ATK: 'LOB_ATK', BANANA: 'BANANA',
  VOLLEY: 'VOLLEY', SMASH: 'SMASH', PASSING: 'PASSING',
  SHORT_ANGLE: 'SHORT_ANGLE',  // aceleração curta com ângulo extremo — alto risco/recompensa
  SLICE_SHORT: 'SLICE_SHORT',  // slice curto (não drop) — backspin, cai na meia-quadra, força corrida baixa
  HALF_VOLLEY: 'HALF_VOLLEY', // golpe imediatamente após o quique — bola baixíssima (tornozelo/canela)
});

// ── Inertia / body physics ────────────────────────────────────────
export const INERTIA = {
  overrunThreshold:      3.0,   // m/s — speed above which overrun applies on dir change
  overrunDecelMult:      0.62,  // maxDecel fraction when overrunning (player "slides")
  reversal180Dot:       -0.70,  // dot(vel,targetDir) below this = 180° reversal
  reversal180AccelMult:  0.55,  // accel fraction during 180° change (swap footwork)
  reversal180Frames:     3,     // frames the 180° penalty lasts
  staminaAccelMin:       0.70,  // min accel fraction at 0 stamina
  // ── Slide-stop / planta do pé ─────────────────────────────────────────────
  // Quando jogador está perto do target E em alta velocidade, aplica freada brusca
  // simulando o "slide" / deslizada de quadra — impede que passe direto pela bola.
  slideBrakeRadius:      1.10,  // m — distância do target que ativa o brake
  slideBrakeSpeedMin:    2.20,  // m/s — vel. mínima para ativar o brake
  slideBrakeDecelMult:   2.80,  // multiplicador de maxDecel durante o brake
  postHitStaminaThresh:  0.35,  // stamina below which post-hit pause activates
  postHitPauseMin:       0.08,  // s (80ms)
  postHitPauseMax:       0.15,  // s (150ms)
  giveUpMargin:         -0.50,  // arrival margin (s) below which AI abandons chase
};

// ── Directional movement penalties ──────────────────────────────
export const MOVEMENT = {
  lateralSpeedMult:  0.87,  // speed cap fraction when moving laterally
  backwardSpeedMult: 0.80,  // speed cap fraction when moving away from net
  // ── Velocidade de base contínua ─────────────────────────────────
  urgencyReturn:     0.42,  // caminhada de retorno à base (reduzida — era 0.65, muito rápida)
  urgencyWalk:       0.28,  // velocidade mínima ao perseguir com muito tempo (piso, não para)
  // Tiers mantidos para compatibilidade (serve return usa urgencyJog/Run/Sprint)
  urgencyJog:        0.74,
  urgencyRun:        0.97,
  urgencySprint:     1.10,
};

export const SCORE_LABELS = ['0', '15', '30', '40', 'Ad'];

export const SHOT_COLORS = {
  FLAT: '#00D4FF', TOPSPIN: '#00FF88', SLICE: '#FFD700', VOLLEY: '#FF6B35',
  DROP: '#AA44FF', SMASH: '#FF4444', LOB_DEF: '#88CCFF', LOB_ATK: '#FF88CC',
  BANANA: '#FFAA00', PASSING: '#44FFAA',
  SHORT_ANGLE: '#FF2266', SLICE_SHORT: '#FFCC44',
  HALF_VOLLEY: '#FF9933',
};

export const LOB_TYPES      = new Set(['LOB_DEF', 'LOB_ATK']);

// ── Stamina decay multiplier per shot type ───────────────────────
// Base decay = STAMINA.decayPerShot. Multiplied by this value.
// High-effort shots (SMASH, PASSING, BANANA) drain more stamina.
// Defensive/passive shots (SLICE, LOB_DEF, DROP) drain less.
export const SHOT_DECAY_MULT = {
  FLAT:        1.10,  // flat hit — powerful, moderate effort
  TOPSPIN:     1.00,  // baseline topspin — standard
  SLICE:       0.75,  // slice — low effort, defensive
  DROP:        0.80,  // dropshot — wrist finesse, low energy
  LOB_DEF:     0.65,  // defensive lob — passive, low strain
  LOB_ATK:     1.05,  // attacking lob — more deliberate effort
  BANANA:      1.30,  // heavy topspin cross — intense hip rotation
  VOLLEY:      0.85,  // volley — short stroke, moderate effort
  SMASH:       1.45,  // overhead smash — maximum physical output
  PASSING:     1.20,  // passing shot — explosive from stretched position
  SHORT_ANGLE: 1.25,  // short angle — extreme lateral torque
  SLICE_SHORT: 0.85,  // short slice — controlled, moderate effort
  HALF_VOLLEY: 0.95,  // half volley — compact punch, awkward low contact
};
export const TACTICAL_TYPES = new Set(['SMASH', 'LOB_ATK', 'LOB_DEF', 'DROP']);

// ── Court Zones ──────────────────────────────────────────────────
// Zones describe WHERE a shot lands on the opponent's side of the court.
//
//   winnerMod : base probability that a shot to this zone is unreturnable
//               (scales with shot quality and opponent's attributes)
//   ueMod     : multiplier on UE risk for the HITTER attempting this zone
//               (harder zones = higher risk, especially under pressure)
//   pressMod  : pressure coefficient added to the OPPONENT's rallyPressure
//               (represents cumulative positional stress on the receiver)
//
// Zone layout (opponent's half, top-down):
//   ┌──────────────────────────────────┐  ← opponent baseline
//   │  DEEP (central, very deep)       │
//   │  T (center T, deep half)         │
//   │  WIDE (near sidelines)           │
//   │  BODY (into opponent's body)     │
//   │  SHORT_ANGLE (short + wide)      │
//   │  DROP_ZONE (near net)            │
//   └──────────────────────────────────┘  ← net
//
// ── Feature toggle: novo sistema de movimentação ──────────────────────────────
// true  → usa movement.js (FSM com 4 estados, bisector rule, recovery proporcional)
// false → usa updatePlayer() legado do ai.js

export const COURT_ZONES = {
  T:           { winnerMod: 0.50, ueMod: 1.15, pressMod: 0.28 }, // center-T deep — constraining, low UE risk
  WIDE:        { winnerMod: 0.70, ueMod: 1.30, pressMod: 0.55 }, // near sideline — forces lateral sprint
  BODY:        { winnerMod: 0.18, ueMod: 1.05, pressMod: 0.18 }, // into body — jamming, low stretch
  DEEP:        { winnerMod: 0.35, ueMod: 1.12, pressMod: 0.40 }, // deep central — sustained baseline pressure
  SHORT_ANGLE: { winnerMod: 0.82, ueMod: 1.55, pressMod: 0.70 }, // short + wide — extreme lateral + forward sprint
  DROP_ZONE:   { winnerMod: 0.88, ueMod: 1.75, pressMod: 0.65 }, // near net — complete direction change required
  NEUTRAL:     { winnerMod: 0.22, ueMod: 1.00, pressMod: 0.08 }, // mid-court central — low stress
};
