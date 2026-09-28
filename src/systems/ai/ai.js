import { COURT, THRESHOLDS, PLAYER_CFG, STAMINA, INERTIA, MOVEMENT } from '../../core/constants.js';

import { clamp, rand } from '../../core/math.js';
import { predictTrajectory } from '../../core/physics.js';
import { AI } from './aiCoefficients.js';
import { SHOT_ENGINE_OFFLINE } from '../shotlab/ShotEngineOffline.js';


// -- Per-point context (tactical memory) --------------------------
export function createCtx() {
  return { rallyBalls: 0, lobsReceived: 0,
           netFailed: 0, seriesWon: 0, momentum: 0.5,
           // FIX 14 — EWMA: média ponderada exponencialmente do momentum.
           // momentum = snapshot imediato ponto a ponto.
           // _momentumEWMA = tendência suavizada (decay 0.25 por ponto) — usada na temperatura.
           // Isso faz sequências longas criarem "avalanches" reais de momentum.
           _momentumEWMA: 0.5,
           // _moodFactor [0..1]: confiança acumulada. Sobe devagar com vitórias,
           // cai depressa em sequências de derrota. Afeta temperatura de decisão.
           _moodFactor: 0.5,
           // FIX 12 — footingState: 'planted' | 'striding' | 'offBalance'
           // planted: pés firmes ? aceleração explosiva inicial alta
           // striding: corrida de cruzeiro ? aceleração normal
           // offBalance: saiu da base ou pós-golpe desajeitado ? aceleração reduzida
           _footingState: 'planted',
           _footingTimer: 0,       // segundos restantes no estado atual
           lastShotX: 0, consecutiveSameDir: 0,
           // FASE 1.1 — Recovery diagonal: guarda o targetX do último golpe.
           // Após bater, recupera ~55% em direção ao lado atacado (não ao centro).
           _lastShotX: 0,
           // FASE 1.2 — Net approach side: guarda o X de pouso do approach.
           // Voleador cobre preventivamente o ângulo natural de devolução.
           _approachLandX: 0,
           rallyPressure: 0,   // [0-1] accumulated positional stress from opponent's shots
           // Inertia / movement state (reset each physics tick, not per point)
           _reversalFrames: 0,   // countdown for 180° direction-change penalty
           _postHitPause: 0,     // seconds remaining of post-hit fatigue freeze
           // -- Shot EV system: short-term pattern memory --------------
           // Circular buffer of last 6 shots: { dir, spin, depth }
           // dir: sign of targetX (+1 right / -1 left)
           // spin: 'TOP'|'SLICE'|'FLAT'
           // depth: 'DEEP'|'MID'|'SHORT'
           patternHistory: [],   // last 6 shots — populated by EV system
           // 1-shot intent boost: when last shot opened court, next gets FINISH bonus
           nextIntentBoost: null,    // 'FINISH' | null
           intentBoostTimer: 0,      // shots remaining for boost (counts down per shot)
           // -- Tactical intent (BUILD/PRESSURE/FINISH/RESET) ------------
           currentIntent: 'BUILD',   // decideIntent() output
           _pointPatternPlan: null,  // unified short point-pattern plan
           netPhase: 'BASE',         // BASE | APPROACH | FIRST_VOLLEY | CLOSE_FINISH
            // -- Court mode: BASE | TRANSITION | NET ---------------------
           courtMode: 'BASE',        // replaces binary atNet for transitions
           transitionCooldown: 0,    // shots before next TRANSITION allowed
           netIntent: 0,             // [0..1] desire to build/finish point at net
           netIntentSource: null,    // debug hint: weak_return | short_ball | slow_ball | pressure | neutral
           // -- Depth/width distribution tracking (per 50pts) ------------
           depthStats:  { SHORT: 0, MID: 0, DEEP: 0 },
           widthStats:  { CENTRE: 0, MID: 0, WIDE: 0 },
           approachCount: 0,         // approach shots attempted
           netFromTransition: 0,     // times net approach came from TRANSITION
           // -- FASE 1 — Adaptação intra-match -------------------------------
           // _matchRead: snapshot atualizado a cada shot — leitura do que está funcionando.
           // Persiste entre pontos (está em ctx raiz mas é lido via matchCtx).
           _matchRead: null,     // { dtlWorking, crossWorking, netWorking, oppBhExposed, oppFhExposed, insisting } — ver readMatchContext()
           // _setAdjust: ajuste tático de curta duração aplicado no início de cada set.
           // Funciona como "coach interno" — penaliza shot types com alto erro no set anterior.
           _setAdjust: null,     // { avoidShotType, preferSide, netStrategy, expiresAfter } — ver applySetAdjustment()
           // FASE 2.3 — Confiança contextual: tiebreak, rival, superfície.
           // Inicializado em initContextConf() no início de cada partida.
           // Afeta _moodFactor inicial (que começa em 0.5 por padrão).
           _contextConf: null,   // { tiebreakConf, rivalConf, surfaceConf } — ver initContextConf()
           // Match-persistent pattern memory (NOT reset between points)
           matchCtx: {
             oppBhHits:  0,   // times opponent targeted our backhand (left side)
             oppFhHits:  0,   // times opponent targeted our forehand (right side)
             oppDrops:   0,   // drop shots opponent used this match
             serveDir:   null, // 'LEFT'|'RIGHT'|'BODY' — our last serve direction
             serveN:     0,   // total serves this match (for serve+1 weighting)
             // -- Serve EV: history & intent ---------------------------
             serveHistory: [],      // circular buffer (max 8): {dir, physType, isSec, outcome}
             serveIntent:  null,    // 'OPEN'|'JAM'|'SAFE'|'RUSH' — last serve plan
             serve1InStreak: 0,     // consecutive 1st serves IN
             recentFaults:   0,     // faults in last 4 serve attempts (for 2nd serve pressure)
             // -- Return EV: receiver tendencies ----------------------
             returnPosXBias:    0,  // lateral bias of receiver position (-1..+1)
             returnDepthBias:   0,  // depth bias: >0 = step in, <0 = step back
             returnAggroMode:   0,  // 0..1 — how aggressively receiver is returning
             returnHistory:     [],  // last 6 returns: {type, pressure}
           },
  };
}
export function resetCtx(p) {
  const mc   = p.ctx.matchCtx; // preserve match memory
  const ewma = p.ctx._momentumEWMA ?? 0.5; // FIX 14: preservar EWMA entre pontos
  const mood = p.ctx._moodFactor   ?? 0.5; // FIX 14: preservar mood entre pontos
  p.ctx.rallyBalls = 0; p.ctx.lobsReceived = 0;
  p.ctx._sigUsedThisPoint = false;
  p.ctx.lastShotX  = 0; p.ctx.consecutiveSameDir = 0; p.ctx._bodySpamCount = 0;
  p.ctx._lastShotX = 0; p.ctx._approachLandX = 0;  // FASE 1.1 / 1.2 — reset por ponto
  p.ctx._netApproachedThisPoint = false; // FIX: impede dupla contagem de net approach no mesmo ponto
  p.ctx.rallyPressure = 0;
  p.ctx._reversalFrames = 0; p.ctx._postHitPause = 0;
  p.ctx.patternHistory  = [];
  p.ctx.nextIntentBoost = null;
  p.ctx.intentBoostTimer = 0;
  p.ctx.currentIntent = 'BUILD';
  p.ctx._pointPatternPlan = null;
  p.ctx.rallyDirector = null;
  p.ctx.netPhase = 'BASE';
  p.ctx.courtMode = 'BASE';
  p.ctx.transitionCooldown = 0;  // zera entre pontos — cooldown só existe dentro do ponto
  // HUNTER começa cada ponto com intenção de rede já construída — é o plano A dele.
  // PROACTIVE parte com um sinal inicial leve — sobe quando a oportunidade aparecer.
  // Os outros perfis iniciam em zero e acumulam somente pelo jogo.
  const _ngReset = p.prefs?.netGame ?? 'RELUCTANT';
  p.ctx.netIntent = _ngReset === 'HUNTER'   ? 0.38
                  : _ngReset === 'PROACTIVE' ? 0.10
                  : 0;
  p.ctx.netIntentSource = _ngReset === 'HUNTER' ? 'hunter_plan' : null;
  p.ctx.matchCtx = mc;       // restore
  p.ctx._momentumEWMA = ewma; // FIX 14: restaurar EWMA
  p.ctx._moodFactor   = mood; // FIX 14: restaurar mood
  // FASE 1 — _matchRead e _setAdjust persistem entre pontos (são de escopo de partida/set)
  // _matchRead é recalculado no início de cada shot, não precisa restore explícito.
  // _setAdjust: decrementar expiresAfter por ponto; remover quando expirar.
  if (p.ctx._setAdjust) {
    p.ctx._setAdjust.expiresAfter = (p.ctx._setAdjust.expiresAfter ?? 0) - 1;
    if (p.ctx._setAdjust.expiresAfter <= 0) p.ctx._setAdjust = null;
  }
  // FASE 2 — _contextConf e _formMods persistem durante toda a partida (calculados em initContextConf)
  // Não precisam ser restaurados explicitamente — não são apagados pelo reset de ponto.
  // Reset arrival margin so first frame of new rally doesn't use stale urgency
  p._arrivalMargin = undefined;
  p._predCrossX    = undefined;
  p._readPauseFrames = 0;  // reset micro-pause counter between points
  p._stableTarget    = undefined; // reset stable target — recalc from scratch
  p._posLocked       = false;    // reset position lock — recalc from scratch
  // -- BUG FIX: drop-shot freeze -------------------------------------------
  // _lastSeenBounce guards the bounce-reset block in movement.js:
  //   "if (currBounce > _lastSeenBounce) { reset _hitTarget … }"
  // If _lastSeenBounce is left at 1 from the previous point, the first
  // bounce of the new rally (bounceCount 0?1) produces "1 > 1 = false"
  // ? the reset never fires ? stale _hitTarget stays live.
  //
  // The stale target is computed by predictTrajectory WITHOUT the physics
  // engine's dead-ball kill (vel *= 0.30 applied inside handleGroundBounce
  // but not replicated in the forward sim). For drop shots this causes the
  // predicted optimalHitPoint to land ~0.07 m from the player's current
  // position, triggering inHitWindow ? HIT state ? vel *= 0.25 every frame
  // ? complete freeze for 160+ frames while the ball rolls to a second bounce.
  //
  // Fix: zero _lastSeenBounce and null _hitTarget here so the reset always
  // fires on the first bounce of each new rally, invalidating any stale
  // prediction and forcing a fresh target computation.
  p._lastSeenBounce = 0;
  p._hitTarget      = null;
  p._postHitRecoveryTimer = 0;   // reset recovery timer
}

function _mentalProfile(player) {
  const attrs = player?.attrs ?? {};
  const mods = player?.mods ?? {};
  const mental = clamp((attrs.mentalidade ?? (mods.mentalFactor ?? 0.6) * 100) / 100, 0.20, 0.99);
  const recup = clamp((attrs.recuperacao ?? (mods.recupFactor ?? 0.6) * 100) / 100, 0.20, 0.99);
  const regularidade = clamp((attrs.regularidade ?? (mods.varFactor ?? 0.6) * 100) / 100, 0.20, 0.99);
  const adapt = clamp((attrs.adaptacao ?? (mods.adaptacaoFactor ?? 0.6) * 100) / 100, 0.20, 0.99);
  return {
    mental,
    recup,
    regularidade,
    adapt,
    clutchMult: clamp(0.80 + mental * 0.60, 0.86, 1.34),
    resilienceMult: clamp(0.74 + recup * 0.74, 0.80, 1.40),
    stabilityMult: clamp(0.76 + regularidade * 0.64, 0.82, 1.38),
    adaptMult: clamp(0.80 + adapt * 0.50, 0.86, 1.28),
    volatility: clamp(1.24 - regularidade * 0.50, 0.78, 1.18),
  };
}

// -- Momentum update after each point -----------------------------
// DESIGN: momentum é tendência acumulada ao longo de VÁRIOS pontos/games,
// não gangorra ponto-a-ponto. Um único ponto move ~0.03-0.06 no raw,
// e o EWMA suaviza ainda mais a leitura usada pelas IAs.
// Sequência de 5 pontos: raw ~0.5 ? ~0.65 (vs ~0.88 antes).
// Sequência de 8 pontos: raw ~0.5 ? ~0.72 (break de set inteiro).
//
// scoreCtx: { wImportance, lImportance } — importância do ponto para cada jogador.
//   normal=1.0 | set_point=1.4 | break_point=1.6 | match_point=2.0
//   Calculado em game.js via _computeScoreImportance() antes de assignPoint.
//
// mentalidade como multiplicador:
//   WINNER: high mental ? capitaliza pontos grandes (clutch bonus)
//   LOSER:  high mental ? absorve a perda (resilience); low mental ? desmorona
//
// Assimetria corrigida: BASE simétrico (0.048). Diferenças vêm de recupFactor
// e mentalidade de cada jogador, não de um viés hardcoded.
function _legacyUpdateMomentum(gs, winnerIdx, scoreCtx) {
  const w = gs.players[winnerIdx], l = gs.players[1 - winnerIdx];
  w.ctx.seriesWon++; l.ctx.seriesWon = 0;

  // -- Importância do ponto ----------------------------------------
  // impMult linear: 1.0?1.000 | 1.4?1.250 | 1.6?1.375 | 2.0?1.625
  const wImp    = scoreCtx?.wImportance ?? 1.0;
  const lImp    = scoreCtx?.lImportance ?? 1.0;
  const wImpMult = 0.375 + wImp * 0.625;
  const lImpMult = 0.375 + lImp * 0.625;

  // -- Mentalidade -------------------------------------------------
  // Lida direto de attrs (já disponível) ou de mods.mentalFactor como fallback.
  const wMn = (w.attrs?.mentalidade ?? (w.mods?.mentalFactor ?? 0.6) * 100) / 100;
  const lMn = (l.attrs?.mentalidade ?? (l.mods?.mentalFactor ?? 0.6) * 100) / 100;

  // Winner clutch: high mental amplifica ganho em pontos importantes.
  // mn=0.9, BP(1.6): +4.8% | mn=0.9, MP(2.0): +8% | mn=0.5: neutro | mn=0.3, BP: -2.4%
  const wClutch = 1.0 + (wMn - 0.5) * 0.20 * (wImp - 1.0);

  // Loser resilience: high mental absorve; low mental desmorona.
  // mn=0.9: -14% perda | mn=0.6: -3.5% | mn=0.5: neutro | mn=0.3: +7% perda
  const lResilience = 1.0 - (lMn - 0.5) * 0.35;

  // -- recupFactor (recuperação): afeta delta base por personagem --
  const BASE    = 0.048;
  const wRecupMod = w.mods ? 0.70 + w.mods.recupFactor * 0.60 : 1.0;
  const lRecupMod = l.mods ? 0.70 + (1 - l.mods.recupFactor) * 0.60 : 1.0;

  // -- Deltas finais -----------------------------------------------
  const wDelta = BASE * wRecupMod * wImpMult * clamp(wClutch, 0.80, 1.20);
  const lDelta = BASE * lRecupMod * lImpMult * clamp(lResilience, 0.70, 1.30);

  w.ctx.momentum = clamp(w.ctx.momentum + wDelta, 0, 1);
  l.ctx.momentum = clamp(l.ctx.momentum - lDelta, 0, 1);

  if (l.atNet) l.ctx.netFailed++;
  // Sequência mínima para log aumentada 3?4 (menos ruído de log em games normais)
  if (w.ctx.seriesWon >= 4)
    gs.log.push(`${w.ctx.seriesWon >= 6 ? '????' : '??'} ${w.name} em sequência (${w.ctx.seriesWon} pts)`);
  if (l.ctx.momentum < AI.MOMENTUM.BREAK_THRESHOLD)
    gs.log.push(`?? ${l.name} sob pressão`);

  // EWMA: alpha reduzido 0.28?0.10 — cada ponto tem apenas 10% de peso.
  // Sequência de 5 wins move EWMA ~0.5?0.59 (era ~0.5?0.83).
  // Isso faz o EWMA refletir tendência de game/set, não só o último ponto.
  const EWMA_ALPHA = AI.MOMENTUM.EWMA_ALPHA;
  w.ctx._momentumEWMA = clamp(
    (1 - EWMA_ALPHA) * (w.ctx._momentumEWMA ?? 0.5) + EWMA_ALPHA * w.ctx.momentum,
    0, 1
  );
  l.ctx._momentumEWMA = clamp(
    (1 - EWMA_ALPHA) * (l.ctx._momentumEWMA ?? 0.5) + EWMA_ALPHA * l.ctx.momentum,
    0, 1
  );

  // Mood: também suavizado — sobe/cai mais devagar que o EWMA.
  // Antes: +0.025..+0.08 por ponto. Agora: +0.012..+0.035.
  const wSeries = w.ctx.seriesWon;
  const wMoodGain = wSeries >= 5 ? 0.035 : wSeries >= 3 ? 0.022 : 0.012;
  const lMoodLoss = l.ctx.seriesWon === 0 ? 0.020 : 0.012;
  w.ctx._moodFactor = clamp((w.ctx._moodFactor ?? 0.5) + wMoodGain, 0.05, 0.95);
  l.ctx._moodFactor = clamp((l.ctx._moodFactor ?? 0.5) - lMoodLoss, 0.05, 0.95);
}

export function updateMomentum(gs, winnerIdx, scoreCtx) {
  const w = gs.players[winnerIdx], l = gs.players[1 - winnerIdx];
  w.ctx.seriesWon++;
  l.ctx.seriesWon = 0;

  const wProf = _mentalProfile(w);
  const lProf = _mentalProfile(l);

  const wImp = scoreCtx?.wImportance ?? 1.0;
  const lImp = scoreCtx?.lImportance ?? 1.0;
  const wImpMult = 0.78 + (wImp - 1.0) * 0.55;
  const lImpMult = 0.78 + (lImp - 1.0) * 0.58;

  const breakConverted = !!scoreCtx?.breakConverted;
  const breakSaved = !!scoreCtx?.breakSaved;
  const setPointConverted = !!scoreCtx?.setPointConverted;
  const setPointSaved = !!scoreCtx?.setPointSaved;
  const matchPointConverted = !!scoreCtx?.matchPointConverted;
  const matchPointSaved = !!scoreCtx?.matchPointSaved;
  const wasDeuce = !!scoreCtx?.wasDeuce;
  const rally = scoreCtx?.rally ?? 0;
  const wResetPower = clamp(wProf.recup * 0.55 + wProf.adapt * 0.45, 0.20, 1.0);
  const lResetPower = clamp(lProf.recup * 0.55 + lProf.adapt * 0.45, 0.20, 1.0);

  let eventSwing = 0.012;
  if (wasDeuce)            eventSwing += 0.006;
  if (rally >= 8)          eventSwing += Math.min(0.012, (rally - 7) * 0.0018);
  if (breakSaved)          eventSwing += 0.046;
  if (breakConverted)      eventSwing += 0.082;
  if (setPointSaved)       eventSwing += 0.038;
  if (setPointConverted)   eventSwing += 0.066;
  if (matchPointSaved)     eventSwing += 0.076;
  if (matchPointConverted) eventSwing += 0.102;

  const earlyPointCount = (gs._matchPointCounter ?? gs._currentPointId ?? 0) < 12;
  const earlyThrottle = earlyPointCount && !breakConverted && !setPointConverted && !matchPointConverted ? 0.68 : 1;
  const streakBonus = Math.min(0.030, Math.max(0, (w.ctx.seriesWon - 2)) * 0.006);
  const winnerGain = (eventSwing + streakBonus)
    * wImpMult
    * wProf.clutchMult
    * clamp(wProf.stabilityMult * 0.90 + wProf.adaptMult * 0.06 + wResetPower * 0.04, 0.86, 1.18)
    * earlyThrottle;

  let loserPainMult = lImpMult * lProf.volatility;
  loserPainMult *= clamp(1.06 - (lProf.resilienceMult - 1.0) * 0.64 - (lResetPower - 0.5) * 0.18, 0.62, 1.14);
  if (breakConverted || setPointConverted || matchPointConverted) {
    loserPainMult *= clamp(1.02 + (1 - lResetPower) * 0.16, 0.94, 1.16);
  }
  const loserLoss = (eventSwing + streakBonus * 0.65) * loserPainMult * earlyThrottle;

  w.ctx.momentum = clamp(w.ctx.momentum + winnerGain, 0.08, 0.94);
  l.ctx.momentum = clamp(l.ctx.momentum - loserLoss, 0.08, 0.94);

  if (l.atNet) l.ctx.netFailed++;
  if (w.ctx.seriesWon >= 4) {
    gs.log.push(`${w.ctx.seriesWon >= 6 ? '????' : '??'} ${w.name} em sequência (${w.ctx.seriesWon} pts)`);
  }
  if (breakConverted) gs.log.push(`?? ${w.name} QUEBROU e mudou o jogo`);
  if (breakSaved) gs.log.push(`??? ${w.name} salvou o saque sob pressão`);
  if (l.ctx.momentum < AI.MOMENTUM.BREAK_THRESHOLD) {
    gs.log.push(`?? ${l.name} sob pressão`);
  }

  const EWMA_ALPHA = AI.MOMENTUM.EWMA_ALPHA;
  w.ctx._momentumEWMA = clamp(
    (1 - EWMA_ALPHA) * (w.ctx._momentumEWMA ?? 0.5) + EWMA_ALPHA * w.ctx.momentum,
    0, 1
  );
  l.ctx._momentumEWMA = clamp(
    (1 - EWMA_ALPHA) * (l.ctx._momentumEWMA ?? 0.5) + EWMA_ALPHA * l.ctx.momentum,
    0, 1
  );

  const wMoodGain = eventSwing * 0.36 * clamp(wProf.clutchMult * 0.90 + wProf.adaptMult * 0.10, 0.78, 1.14);
  const lMoodLoss = eventSwing * 0.32 * clamp(1.10 - (lProf.resilienceMult - 1.0) * 0.70, 0.62, 1.16);
  w.ctx._moodFactor = clamp((w.ctx._moodFactor ?? 0.5) + wMoodGain, 0.05, 0.95);
  l.ctx._moodFactor = clamp((l.ctx._moodFactor ?? 0.5) - lMoodLoss, 0.05, 0.95);

  if (lResetPower > 0.58) {
    const moodFloor = clamp(0.22 + (lResetPower - 0.58) * 0.36, 0.22, 0.34);
    const ewmaFloor = clamp(0.24 + (lResetPower - 0.58) * 0.28, 0.24, 0.36);
    l.ctx._moodFactor = Math.max(l.ctx._moodFactor, moodFloor);
    l.ctx._momentumEWMA = Math.max(l.ctx._momentumEWMA, ewmaFloor);
  }

  if (lProf.adapt > 0.64) {
    l.ctx._setAdjust = l.ctx._setAdjust ?? {};
    l.ctx._setAdjust.expiresAfter = Math.max(l.ctx._setAdjust.expiresAfter ?? 0, lProf.adapt > 0.78 ? 3 : 2);
  }
}

export function recoverMomentumBetweenSets(gs, winnerIdx) {
  const center = 0.5;
  for (let i = 0; i < gs.players.length; i++) {
    const p = gs.players[i];
    const prof = _mentalProfile(p);
    const current = clamp(p.ctx?.momentum ?? 0.5, 0, 1);
    const ewma = clamp(p.ctx?._momentumEWMA ?? current, 0, 1);
    const mood = clamp(p.ctx?._moodFactor ?? current, 0, 1);
    const blended = current * 0.55 + ewma * 0.30 + mood * 0.15;
    const distance = blended - center;

    let next;
    if (i === winnerIdx) {
      const keepRatio = clamp(0.48 + prof.mental * 0.12 + prof.regularidade * 0.10, 0.48, 0.66);
      const winnerCarry = Math.max(0, distance) * keepRatio;
      const winnerGlow = Math.max(0, prof.mental - 0.55) * 0.018;
      next = center + winnerCarry + winnerGlow;
    } else {
      const recoverPull = clamp(0.34 + prof.recup * 0.24 + prof.adapt * 0.14 + prof.regularidade * 0.10, 0.34, 0.76);
      const recovered = blended + (center - blended) * recoverPull;
      const resilienceLift = (prof.recup - 0.5) * 0.06 + (prof.adapt - 0.5) * 0.03;
      next = recovered + resilienceLift;
    }

    p.ctx.momentum = clamp(next, 0.10, 0.90);
    p.ctx._momentumEWMA = clamp((p.ctx._momentumEWMA ?? 0.5) * 0.45 + p.ctx.momentum * 0.55, 0.08, 0.92);
    p.ctx._moodFactor = clamp((p.ctx._moodFactor ?? 0.5) * 0.40 + p.ctx.momentum * 0.60, 0.08, 0.92);
  }
}


// -- Court Geometry: Zone Classification --------------------------
// Classifies a shot's landing position into a named court zone.
// All coordinates are in the OPPONENT's half (absolute metres from centre).
//
// Parameters:
//   targetX   — aimed X coordinate (negative = left, positive = right)
//   targetY   — aimed Y coordinate (signed, on opponent's side)
//   oppPos    — opponent's {x, y} position at shot time (for BODY detection)
//
// --------------------------------------------------------------------
// -- FASE 1 — ADAPTAÇÃO INTRA-MATCH -------------------------------
// --------------------------------------------------------------------

/**
 * readMatchContext — lê o que está funcionando na partida atual.
 *
 * Shot decision antigo removido; contexto tatico permanece como suporte geral.
 * Produz um snapshot leve guardado em player.ctx._matchRead.
 * É leitura pura — não altera nenhum cálculo de jogo.
 *
 * @param {object} player    — jogador ativo
 * @param {object} opponent  — oponente
 * @param {object} gs        — game state (para acesso a pontos/sets)
 */
export function readMatchContext(player, opponent) {
  const mc      = player.ctx.matchCtx ?? {};
  const oppMc   = opponent.ctx.matchCtx ?? {}; // eslint-disable-line no-unused-vars
  const pat     = player.ctx.patternHistory ?? [];
  // Rigidez tática derivada de adaptability (Shot System v4):
  //   adaptability 85 ? rigidity 0.15 (muda rápido)
  //   adaptability 55 ? rigidity 0.45 (muda com evidência)
  //   adaptability 25 ? rigidity 0.75 (insiste muito)
  const adaptability = player.prefs?.adaptability ?? 55;
  const rigidity = clamp(1.0 - adaptability / 100, 0.15, 0.85);

  // -- Amostra mínima para conclusões confiáveis -----------------
  const totalHits = (mc.oppBhHits ?? 0) + (mc.oppFhHits ?? 0);

  // -- DTL vs CC: qual está funcionando? ------------------------
  // patternHistory guarda últimos 6 shots: { dir, spin, depth, outcome? }
  // 'outcome' não está no schema atual — inferir pelo estado de pressão atual
  // como proxy (se o oponente está sob pressão após shots DTL, DTL está funcionando).
  const dtlShots  = pat.filter(s => s.dir === Math.sign(player.side ?? 1)).length;
  const crossShots = pat.filter(s => s.dir !== Math.sign(player.side ?? 1) && s.dir !== 0).length;
  const recentDtl = pat.length >= 3 ? dtlShots / pat.length > 0.55 : false;
  const oppPressureHigh = (opponent.ctx?.rallyPressure ?? 0) > 0.55;
  const dtlWorking   = recentDtl && oppPressureHigh;
  const crossWorking = !recentDtl && crossShots >= 2 && oppPressureHigh;

  // -- Jogo de rede: está valendo? -------------------------------
  const netAttempts = player.ctx.netFromTransition ?? 0;
  const netFailed   = player.ctx.netFailed ?? 0;
  const netWinRate  = netAttempts > 2
    ? Math.max(0, 1 - netFailed / netAttempts)
    : 0.5; // amostra insuficiente ? neutro
  const netWorking = netAttempts >= 3 && netWinRate >= 0.55;

  // -- Lado exposto do adversário --------------------------------
  // oppBhHits / oppFhHits: quantas vezes o oponente direcionou para NOSSO lado.
  // Se ele ataca muito nosso BH ? o nosso FH é a arma ? o lado fraco DELE é o FH.
  // Simplificado com threshold de amostra.
  const bhRatio = totalHits >= 4
    ? (mc.oppBhHits ?? 0) / totalHits
    : 0.5;
  const oppBhExposed = bhRatio < 0.35;  // oponente evita nosso BH ? BH dele é fraco
  const oppFhExposed = bhRatio > 0.65;  // oponente evita nosso FH ? FH dele é fraco

  // -- Insistência tática ----------------------------------------
  // Um jogador está "insistindo" quando repete o mesmo padrão sem sucesso.
  // Padrão = mesma direção (dir) + mesma profundidade (depth) nas últimas N shots.
  // N depende da rigidez do estilo: GRINDER precisa de mais evidência para mudar.
  const insistThreshold = Math.round(2 + rigidity * 3); // 2 (TAKEALLRISK) até 4 (GRINDER)
  let insisting = false;
  if (pat.length >= insistThreshold) {
    const recent = pat.slice(-insistThreshold);
    const sameDir   = recent.every(s => s.dir === recent[0].dir);
    const sameDepth = recent.every(s => s.depth === recent[0].depth);
    // Só marca insisting se o oponente NÃO está sob pressão (padrão repetido não está funcionando)
    insisting = sameDir && sameDepth && !oppPressureHigh;
  }

  player.ctx._matchRead = {
    dtlWorking,
    crossWorking,
    netWorking,
    oppBhExposed,
    oppFhExposed,
    insisting,
    netWinRate,
    momentum: player.ctx._momentumEWMA ?? 0.5,
    // Metadados para debug
    _netAttempts: netAttempts,
    _bhRatio: bhRatio,
  };
}

/**
 * applySetAdjustment — aplica ajuste tático no início de cada set.
 *
 * Baseado no _matchRead do set anterior, cria um ajuste de curta duração
 * que penaliza o que não funcionou e reforça o que funcionou.
 * Age como um "coach interno" — complementa as instruções do coach externo.
 *
 * @param {object} player    — jogador
 * @param {object} opponent  — oponente (não usado agora, reservado para expansão)
 */
export function applySetAdjustment(player, _opponent) {
  const read = player.ctx._matchRead;
  if (!read) return; // sem dados ainda (primeiro set)

  // Rigidez tática derivada de adaptability (Shot System v4)
  const adaptability = player.prefs?.adaptability ?? 55;
  const rigidity = clamp(1.0 - adaptability / 100, 0.15, 0.85);

  // Jogadores muito rígidos se ajustam menos entre sets
  // GRINDER (0.80) ? só ajusta se situação for clara
  const adjustThreshold = 0.30 + rigidity * 0.30; // 0.30–0.54

  let avoidShotType = null;
  let preferSide    = null;
  let netStrategy   = null;

  // Se estava insistindo em algo que não funcionou ? evitar esse shot type
  if (read.insisting) {
    // Qual shot type foi o mais repetido? Inferir do patternHistory
    const pat = player.ctx.patternHistory ?? [];
    if (pat.length >= 3) {
      const counts = {};
      pat.forEach(s => { if (s.spin) counts[s.spin] = (counts[s.spin] ?? 0) + 1; });
      const dominant = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
      if (dominant && dominant[1] / pat.length > 0.55) {
        // Mapeia spin do patternHistory para shot type
        const spinToShot = { TOP: 'TOPSPIN', SLICE: 'SLICE', FLAT: 'FLAT' };
        avoidShotType = spinToShot[dominant[0]] ?? null;
      }
    }
  }

  // Lado exposto do adversário ? preferir esse lado
  if (read.oppBhExposed && Math.random() > adjustThreshold) preferSide = 'BH';
  if (read.oppFhExposed && Math.random() > adjustThreshold) preferSide = 'FH';

  // Net game: se não funcionou, limitar; se funcionou, reforçar
  const netRate = read.netWinRate ?? 0.5;
  const netAttempts = read._netAttempts ?? 0;
  if (netAttempts >= 4) {
    if (netRate < 0.35 && Math.random() > adjustThreshold) netStrategy = 'less';
    if (netRate > 0.65 && Math.random() > adjustThreshold) netStrategy = 'more';
  }

  // Só criar ajuste se há algo a ajustar
  if (!avoidShotType && !preferSide && !netStrategy) return;

  // Duração: 10-15 pontos (1/4 a 1/3 de um set)
  const expiresAfter = Math.round(10 + (1 - rigidity) * 5); // 10 (GRINDER) a 15 (TAKEALLRISK)

  player.ctx._setAdjust = {
    avoidShotType,  // string | null — shot type a penalizar
    preferSide,     // 'BH' | 'FH' | null
    netStrategy,    // 'more' | 'less' | null
    expiresAfter,
  };
}

/**
 * initContextConf — inicializa confiança contextual no início de cada partida.
 *
 * Fase 2.3: lê recentForm, RivalrySystem e superfície para ajustar o _moodFactor
 * inicial. O _moodFactor normalmente começa em 0.5 — aqui pode começar entre 0.35-0.65
 * dependendo do contexto.
 *
 * @param {object} player      — jogador (com recentForm opcional)
 * @param {object} opponent    — adversário
 * @param {string} surface     — superfície uppercase: 'CLAY' | 'GRASS' | 'HARD' | 'INDOOR'
 * @param {object|null} rivalSystem — instância RivalrySystem (opcional)
 */
export function initContextConf(player, opponent, surface, rivalSystem = null) {
  // -- surfaceConf: forma do jogador nesta superfície ------------
  const rf = player.recentForm;
  const surfKey = (surface ?? 'HARD').toUpperCase();
  const surfScore = rf?.surfaceForm?.[surfKey] ?? rf?.formScore ?? 0.5;
  const surfaceConf = surfScore; // 0..1

  // -- rivalConf: histórico h2h com este adversário --------------
  let rivalConf = 0.5; // default neutro
  if (rivalSystem && player.id && opponent.id) {
    try {
      const rivalry = rivalSystem.getRivalry(player.id, opponent.id);
      if (rivalry && rivalry.totalMatches >= 3) {
        const playerIsP1 = rivalry.p1Id === player.id;
        const playerWins = playerIsP1 ? rivalry.p1Wins : rivalry.p2Wins;
        rivalConf = playerWins / rivalry.totalMatches; // 0..1
      }
    } catch (_) { /* sem histórico — fica 0.5 */ }
  }

  // -- tiebreakConf: histórico de tiebreaks pré-partida ----------------
  // FASE 3: usa tiebreakForm do recentForm (histórico acumulado)
  // Se não há histórico, começa em 0.5 neutro
  const tiebreakConf = rf?.tiebreakForm ?? 0.5;

  const contextConf = { tiebreakConf, rivalConf, surfaceConf };
  player.ctx._contextConf = contextConf;

  // -- Ajustar _moodFactor inicial ------------------------------
  // _moodFactor normalmente começa em 0.5.
  // Aqui calibramos: média ponderada dos 3 fatores, com pesos diferentes.
  // surfaceConf tem mais peso (forma concreta) que rivalConf (histórico).
  const moodAdjust = (
    surfaceConf  * 0.50 +   // 50% da superfície
    rivalConf    * 0.35 +   // 35% do h2h
    tiebreakConf * 0.15     // 15% de tiebreak (agora pré-populado pelo histórico)
  );
  // Clamp entre 0.35 e 0.65 (spec: não deixar dominar o resultado)
  let baseMood = Math.max(0.35, Math.min(0.65, moodAdjust));

  // FASE 3: hotStreak/coldStreak ajustam o mood inicial
  // +0.02 por vitória consecutiva (até +0.08), -0.02 por derrota (até -0.08)
  const hot  = rf?.hotStreak  ?? 0;
  const cold = rf?.coldStreak ?? 0;
  if (hot >= 2)  baseMood = Math.min(0.68, baseMood + Math.min(hot  - 1, 4) * 0.02);
  if (cold >= 2) baseMood = Math.max(0.32, baseMood - Math.min(cold - 1, 4) * 0.02);

  player.ctx._moodFactor = baseMood;
}

/**
 * FASE 3: Atualiza tiebreakConf após o resultado de um tiebreak intra-partida.
 * Chamado em game.js quando um tiebreak termina.
 *
 * @param {object} player   — jogador (ctx já inicializado)
 * @param {boolean} won     — true se o jogador ganhou este tiebreak
 */
export function updateTiebreakConf(player, won) {
  if (!player?.ctx?._contextConf) return;
  const cc = player.ctx._contextConf;
  // Atualização ELO-like: move 0.12 em direção a 1 (ganhou) ou 0 (perdeu)
  const current = cc.tiebreakConf ?? 0.5;
  const target  = won ? 1.0 : 0.0;
  cc.tiebreakConf = current + (target - current) * 0.12;

  // Recalcular _moodFactor incluindo o novo tiebreakConf
  const moodAdj = (
    cc.surfaceConf  * 0.50 +
    cc.rivalConf    * 0.35 +
    cc.tiebreakConf * 0.15
  );
  player.ctx._moodFactor = Math.max(0.30, Math.min(0.70, moodAdj));
}

export function classifyZone(targetX, targetY, oppPos) {
  const absX  = Math.abs(targetX);
  const absY  = Math.abs(targetY);
  const depth = absY / COURT.halfL;   // 0.0 = net, 1.0 = baseline

  // DROP_ZONE: very short — near net regardless of X
  if (depth < 0.28) return 'DROP_ZONE';

  // SHORT_ANGLE: short AND wide — forces forward sprint + lateral sprint
  if (depth < 0.48 && absX > 2.0) return 'SHORT_ANGLE';

  // BODY: ball aimed within 0.8m of opponent's current X position (jamming)
  // Was 1.3m — too wide, causing legitimate cross-court shots to be misclassified as BODY
  if (oppPos && Math.abs(targetX - oppPos.x) < 0.8 && depth > 0.40) return 'BODY';

  // WIDE: near sideline — large lateral stretch required
  if (absX > 2.4) return 'WIDE';

  // DEEP: very deep regardless of X — sustained baseline pressure
  if (depth > 0.82) return 'DEEP';

  // T: central and deep — inside-out, restricts opponent's angle
  if (absX < 1.0 && depth > 0.58) return 'T';

  // Anything else: mid-court, central — low stress
  return 'NEUTRAL';
}

// -- Rally Engine: Pressure Accumulation --------------------------
// Updates the OPPONENT's rallyPressure after each shot.
//
// rallyPressure models cumulative positional stress — the product of
// successive targeted shots pushing the opponent further off-balance.
// Unlike `diff` (which measures a single ball's difficulty), pressure
// accumulates: three Wide shots in a row are much harder than one.
//
// Decay factor 0.72: pressure halves in ~2.2 shots when opponent recovers.
// At max pressure (1.0): FE chance rises ~+0.035, UE ~+0.012.
//
// Parameters:
//   targetPlayerIdx — index of the player RECEIVING this shot (0 or 1)
//   zone            — COURT_ZONES key from classifyZone()
//   targetX         — aimed X, used for lateral component
//
const RALLY_ZONE_PRESSURE = Object.freeze({
  DROP_ZONE: 0.42,
  SHORT_ANGLE: 0.72,
  BODY: 0.34,
  WIDE: 0.78,
  DEEP: 0.54,
  T: 0.40,
  NEUTRAL: 0.16,
});

export function updateRallyPressure(gs, targetPlayerIdx, zone, targetX, shot = null) {
  const player   = gs.players[targetPlayerIdx];
  const hitter   = gs.players[1 - targetPlayerIdx];  // quem bateu a bola
  if (!player?.ctx || !hitter?.ctx) return;
  const zonePressure = RALLY_ZONE_PRESSURE[zone] ?? RALLY_ZONE_PRESSURE.NEUTRAL;

  // Lateral component: how far from centre the shot forces the receiver
  const lateralFrac = Math.min(1, Math.abs(targetX) / (COURT.singlesW / 2));
  const depthFrac = Math.min(1, Math.abs(shot?.targetY ?? 0) / COURT.halfL);
  const intent = shot?.intent ?? shot?.shotEngine?.intent ?? null;
  const intentMod = intent === 'FINISH' ? 0.18
    : intent === 'PRESSURE' || intent === 'REDIRECT' ? 0.12
      : intent === 'BUILD' ? 0.05
        : intent === 'RESET' || intent === 'DEFEND' ? -0.05
          : 0;
  const paceKmh = shot?.shotEngine?.execution?.power ?? shot?.power ?? 0;
  const paceMod = Math.min(0.12, Math.max(0, paceKmh - 24) * 0.006);

  // Combined pressure delta: zone base + lateral stretch
  let delta = zonePressure * 0.48 + lateralFrac * 0.24 + depthFrac * 0.16 + intentMod + paceMod;

  // -- DEFESA COMO ATAQUE — grind pressure --------------------------
  // Grinders com defesa > 90 geram pressão acumulada extra:
  // cada bola profunda, consistente e bem colocada desgasta o adversário
  // fisicamente mesmo sem ser um winner. O efeito é discreto por bola
  // mas composto — em rallies longos (onde o grinder vive) o impacto é real.
  const hitterDef = (hitter?.attrs?.defesa ?? 60) / 100;
  if (hitterDef > 0.90) {
    const grindFactor = clamp((hitterDef - 0.90) / 0.10, 0, 1);
    // Bônus de pressão proporcional ao rally — o desgaste acumula com o tempo
    const rallyBonus = Math.min(gs.rally ?? 0, 8) * 0.012;
    delta += grindFactor * (0.06 + rallyBonus);
  }

  // Accumulate with exponential decay — sustained attack builds faster than recovery
  player.ctx.rallyPressure = clamp(
    (player.ctx.rallyPressure ?? 0) * 0.72 + delta * 0.34,
    0, 1.0
  );
  // O batedor alivia parte da pressão quando consegue colocar uma bola com intenção.
  const relief = intent === 'FINISH' || intent === 'PRESSURE' || intent === 'REDIRECT'
    ? 0.60
    : intent === 'BUILD' || intent === 'CONTROL'
      ? 0.72
      : 0.82;
  hitter.ctx.rallyPressure = clamp((hitter.ctx.rallyPressure ?? 0) * relief, 0, 1);
}

// -- Player movement update ----------------------------------------



