import { BOLA, AMBIENTE, SUPERFICIE, QUIQUE, REDE } from '../config/FISICA_CONFIG.js';

// ── Court (metres) ──────────────────────────────────────────────
export const COURT = {
  width: 10.97, singlesW: 8.23, halfW: 10.97 / 2,
  length: 23.77, halfL: 23.77 / 2,
  serviceLineY: 6.4, netHeight: REDE.altura,
};

// ── Physics ─────────────────────────────────────────────────────
export const PHYSICS = {
  gravity: AMBIENTE.gravidade,
  // Helper: mover este número altera a aceleração vertical de TODA bola. É uma
  // alavanca global, não uma ferramenta de ajuste fino de shot específico.
  dragCoeff: BOLA.coef_arrasto,
  // Helper: subir aumenta o freio aerodinâmico; descer deixa a bola atravessar
  // o ar com mais velocidade residual.
  ballRadius: BOLA.raio,
  // Helper: o raio muda a área frontal e, por consequência, drag e Magnus.
  ballMass: BOLA.massa,
  // Helper: subir a massa deixa a bola "mais pesada" para vento e aceleração.
  airDensity: AMBIENTE.densidade_ar_nivel_mar,
  // Helper: densidade maior = mais drag e mais curva por Magnus.
  restitution: SUPERFICIE.DURA.restituicao,
  // Helper: restituicao é a altura base do quique na superfície padrão.
  groundFriction: SUPERFICIE.DURA.friccao_chao,
  // Helper: groundFriction controla quanto pace horizontal sobra após o quique.
  magnusCoeff: AMBIENTE.coef_magnus_base,
  // Helper: subir intensifica a curva no ar gerada por topspin/slice.
  spinBounceCoeff: QUIQUE.coef_quique_spin,
  // Helper: este coeficiente converte spin em altura extra de quique. Se o
  // topspin estiver saltando demais, é aqui que a mudança deve começar.
};

// ── Timing (seconds unless noted) ───────────────────────────────
export const TIMING = {
  preServeDelay: 1.2, serveWindup: 0.4, pointPauseMs: 800,
  hitCooldown: 0.25, swingDuration: 0.18,
};

export const THRESHOLDS = {
  ballStopSpeed: 0.5, netTolerance: REDE.tolerancia, outTolerance: 0.05,
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
};

export const PLAYER_CFG = {
  speed: 5.3, reach: 0.85, maxAccel: 10, maxDecel: 16, friction: 10,
};

// ── Stamina system ───────────────────────────────────────────────
export const STAMINA = {
  decayPerShot:      0.024,  // agora rally longo começa a morder de verdade
  recoveryPerPoint:  0.014,  // entre pontos recupera um pouco, mas não apaga o desgaste recém sofrido
  // RAZÃO: Em um 37º game, receptor com recovery=0.020 ficava com stamina ~0.15-0.20
  // Isso causava effectiveReach ~ 0.65 * baseReach, gerando aces espúrios.
  // Com 0.035, receptores respiram melhor entre pontos, mais realista com ATP.
  recoveryPerGame:   0.082,  // game reset menor — cansaço passa a atravessar mais games
  recoveryPerSet:    0.300,  // set reset importante, mas bem longe de zerar a conta
  speedMinFactor:    0.72,   // pernas cansadas derrubam bem mais a locomoção
  reachMinFactor:    0.79,   // alcance também cai, mas menos que a velocidade
  errorBoostMax:     0.012,  // max extra error rate at 0 stamina — reduzido de 0.022: fadiga → movimento lento, não erros diretos
  logThreshold:      0.32,   // log fatigue warning when dropping below this
  // ── Sprint stamina drain (per second, scaled by intensity above jog threshold) ─
  sprintDecayRate:   0.042,  // perseguições fortes drenam mais claramente
  sprintThreshold:   0.70,   // desgaste entra um pouco antes nas perseguições fortes
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

// ── Inertia / body physics ────────────────────────────────────────
export const INERTIA = {
  overrunThreshold:      3.0,   // m/s — speed above which overrun applies on dir change
  overrunDecelMult:      0.62,  // maxDecel fraction when overrunning (player "slides")
  reversal180Dot:       -0.70,  // dot(vel,targetDir) below this = 180° reversal
  reversal180AccelMult:  0.55,  // accel fraction during 180° change (swap footwork)
  reversal180Frames:     3,     // frames the 180° penalty lasts
  staminaAccelMin:       0.62,  // aceleração sofre bem mais com cansaço
  // ── Slide-stop / planta do pé ─────────────────────────────────────────────
  // Quando jogador está perto do target E em alta velocidade, aplica freada brusca
  // simulando o "slide" / deslizada de quadra — impede que passe direto pela bola.
  slideBrakeRadius:      1.10,  // m — distância do target que ativa o brake
  slideBrakeSpeedMin:    2.20,  // m/s — vel. mínima para ativar o brake
  slideBrakeDecelMult:   2.80,  // multiplicador de maxDecel durante o brake
  postHitStaminaThresh:  0.48,  // fadiga começa a aparecer mais cedo na recomposição
  postHitPauseMin:       0.09,  // s
  postHitPauseMax:       0.19,  // s — cansado demora mais a se reorganizar
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
  urgencyJog:        0.72,
  urgencyRun:        0.94,
  urgencySprint:     1.06,
};

export const SCORE_LABELS = ['0', '15', '30', '40', 'Ad'];


