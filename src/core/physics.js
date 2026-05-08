import { PHYSICS, COURT, THRESHOLDS, BALL_AREA } from './constants.js';
import { v3, scale3, mag3, norm3, clamp, cross3 } from './math.js';
import { applyWindToBall } from '../systems/environment/EnvironmentSystem.js';
import {
  DROP_SHOT,
  INTERCEPTACAO_PADRAO,
  QUIQUE,
  REDE,
  getConfigSuperficie,
  getPerfilInterceptacao,
  normalizarSuperficie,
} from '../config/FISICA_CONFIG.js';

function resolveInterceptProfile(courtPhysForPred, interceptOpts) {
  const surface = normalizarSuperficie(interceptOpts?.surface ?? courtPhysForPred?.surface ?? 'DURA');
  const surfaceProfile = getPerfilInterceptacao(surface);
  const preferredContactZ = interceptOpts?.preferredContactZ ?? surfaceProfile.altura_contato_ideal;
  return {
    preferredContactZ: INTERCEPTACAO_PADRAO.altura_contato_ideal,
    minContactZ: INTERCEPTACAO_PADRAO.altura_contato_min,
    maxContactZ: INTERCEPTACAO_PADRAO.altura_contato_max,
    contactBand: INTERCEPTACAO_PADRAO.faixa_contato,
    yTolerance: INTERCEPTACAO_PADRAO.tolerancia_y,
    delayBand: INTERCEPTACAO_PADRAO.janela_atraso,
    riseBonus: INTERCEPTACAO_PADRAO.bonus_subida,
    fallPenalty: INTERCEPTACAO_PADRAO.penalidade_descida,
    lowBallBonus: INTERCEPTACAO_PADRAO.bonus_bola_baixa,
    preferredContactZ: surfaceProfile.altura_contato_ideal,
    minContactZ: surfaceProfile.altura_contato_min,
    maxContactZ: surfaceProfile.altura_contato_max,
    contactBand: surfaceProfile.faixa_contato,
    yTolerance: surfaceProfile.tolerancia_y,
    delayBand: surfaceProfile.janela_atraso,
    riseBonus: surfaceProfile.bonus_subida,
    fallPenalty: surfaceProfile.penalidade_descida,
    lowBallBonus: surfaceProfile.bonus_bola_baixa,
    ...interceptOpts,
    preferredContactZ,
    minContactZ: Math.min(interceptOpts?.minContactZ ?? surfaceProfile.altura_contato_min, preferredContactZ),
    maxContactZ: Math.max(interceptOpts?.maxContactZ ?? surfaceProfile.altura_contato_max, preferredContactZ + 0.05),
  };
}

// ── Aerodynamics ─────────────────────────────────────────────────
export function computeAcceleration(ball, airDensity = PHYSICS.airDensity) {
  const vel = ball.vel, spd = mag3(vel);
  const dragMag = 0.5 * PHYSICS.dragCoeff * BALL_AREA * airDensity * spd * spd;
  const Fd = spd > 0.01 ? scale3(norm3(vel), -dragMag) : v3(0, 0, 0);
  // ── Magnus: Cl dinâmico baseado em razão de spin (spinRatio = ω·r/V) ──────
  // Mais realista que Cl constante: topspin em bola lenta curva mais;
  // flat em alta velocidade tem efeito de spin menor (comportamento real).
  const spinMag   = mag3(ball.spin);
  const spinRatio = (spinMag * PHYSICS.ballRadius) / Math.max(spd, 1.0);
  const clEff     = clamp(0.15 + spinRatio * 0.42, 0.08, 0.38); // Cl: 0.08→0.38
  const Fm = scale3(
    cross3(ball.spin, vel),
    clEff * airDensity * BALL_AREA * PHYSICS.ballRadius,
  );
  return {
    x: (Fd.x + Fm.x) / PHYSICS.ballMass,
    y: (Fd.y + Fm.y) / PHYSICS.ballMass,
    z: PHYSICS.gravity + (Fd.z + Fm.z) / PHYSICS.ballMass,
  };
}

// ── Integrate one dt ─────────────────────────────────────────────
export function stepBallPhysics(ball, dt, airDensity = PHYSICS.airDensity) {
  if (!ball.inFlight) return;
  if ((ball.outGraceTimer ?? 0) > 0) {
    ball.outGraceTimer = Math.max(0, (ball.outGraceTimer ?? 0) - dt);
  }
  const acc = computeAcceleration(ball, airDensity);
  ball._prevY = ball.pos.y;
  ball._prevZ = ball.pos.z;
  ball.vel.x += acc.x * dt; ball.vel.y += acc.y * dt; ball.vel.z += acc.z * dt;
  ball.pos.x += ball.vel.x * dt; ball.pos.y += ball.vel.y * dt; ball.pos.z += ball.vel.z * dt;
  if (ball._lastShotMeta) {
    ball._lastShotMeta.maxZ = Math.max(ball._lastShotMeta.maxZ ?? ball.pos.z ?? 0, ball.pos.z ?? 0);
  }
  // FIX P2.6: spin decay sensível à densidade do ar.
  // Ar menos denso (altitude alta: Madrid, México) → menos dissipação → spin dura mais.
  // spinDecay: 0.995 ao nível do mar → ~0.9965 em ~2240m (airDensity≈0.98)
  const spinDecay = 1 - (0.005 * (airDensity / PHYSICS.airDensity));
  ball.spin.x *= spinDecay; ball.spin.y *= spinDecay; ball.spin.z *= spinDecay;

  // Track time since last bounce (used for last-chance hit window in tryHit)
  if (ball.bounceCount > 0) {
    ball._timeSinceBounce = (ball._timeSinceBounce ?? 999) + dt;
  }

  // Dead-ball slide: after a drop shot dies on the ground, bleed horizontal speed fast
  if (ball._deadBall && ball.pos.z <= PHYSICS.ballRadius + 0.05) {
    const drag = 1 - Math.min(1, DROP_SHOT.arrasto_bola_morta_por_segundo * dt);
    // Helper: subir este valor faz a bola morta perder velocidade residual
    // mais rápido e parar antes.
    ball.vel.x *= drag;
    ball.vel.y *= drag;
  }
}

// ── Ground contact ────────────────────────────────────────────────
export function handleGroundBounce(ball, courtPhys) {
  if (ball.pos.z > PHYSICS.ballRadius || ball.vel.z >= 0) return false;
  ball.pos.z = PHYSICS.ballRadius;
  const isSliceServeBounce = ball._servePhysType === 'SLICE' && ball.bounceCount === 0;
  const isKickServeBounce = ball._servePhysType === 'KICK' && ball.bounceCount === 0;

  const superficieBase = getConfigSuperficie(courtPhys?.surface ?? 'DURA');
  let restitution      = courtPhys?.restitution    ?? superficieBase.restituicao ?? PHYSICS.restitution;
  // groundFriction base + extra de humidade (saibro úmido fica mais lento no quique)
  const baseFriction   = courtPhys?.groundFriction  ?? superficieBase.friccao_chao ?? PHYSICS.groundFriction;
  const humidBonus     = courtPhys?.humidityFriction ?? superficieBase.humidade_friccao ?? 0;
  const groundFriction = Math.min(0.99, baseFriction + humidBonus);

  // ── Signature overrides — aplicados apenas no 1º quique, consumidos uma vez ──
  if (ball.bounceCount === 0) {
    if (ball._sigBounce != null) {
      restitution *= ball._sigBounce;
      ball._sigBounce = null; // one-shot
    }
    if (ball._sigBounceSpin != null) {
      ball.spin.x *= ball._sigBounceSpin;
      ball._sigBounceSpin = null; // one-shot
    }
  }

  // Effective spin: positive = topspin relative to direction of travel
  const effSpin = ball.spin.x * (-(Math.sign(ball.vel.y) || 1));
  const hSpdPre = Math.sqrt(ball.vel.x ** 2 + ball.vel.y ** 2);

  // Capture incoming vertical velocity BEFORE bounce (negative = descending).
  // Used below to guard dead-ball detection: balls falling steeply from a high arc
  // carry enough energy to produce a real bounce and must NOT be flagged as dead.
  const _incomingVz = ball.vel.z; // always negative here (vel.z < 0 is entry condition)

  // Topspin → higher bounce; backspin → low skidding bounce
  // FIX P1.1: usa PHYSICS.spinBounceCoeff (0.075) — constante unificada com predictTrajectory
  ball.vel.z = -ball.vel.z * restitution + effSpin * QUIQUE.coef_quique_spin;
  // Helper: este é o multiplicador que faz topspin subir mais no quique.
  if (isSliceServeBounce) {
    // Slice serve precisa "skid + climb", não "skid + morrer" como rally slice.
    ball.vel.z = Math.max(ball.vel.z * 1.28, 0.52);
  } else if (isKickServeBounce) {
    // Kick serve precisa morder a quadra e subir; sem isso vira saque morto e ace artificial.
    ball.vel.z = Math.max(ball.vel.z * 1.62 + Math.max(0, effSpin) * 0.045, 1.45);
  } else if (effSpin < 0) {
    const skidDamp = clamp(1 - Math.abs(effSpin) * 0.10, QUIQUE.skid_damp_min, QUIQUE.skid_damp_max);
    // Helper: mover estes limites muda o quanto um slice "mata" o quique.
    ball.vel.z *= skidDamp;
  }

  // Backspin grips and brakes; topspin slides through
  const friction = isSliceServeBounce
    ? groundFriction * QUIQUE.friccao_slice_serve
    : isKickServeBounce
      ? Math.min(0.96, groundFriction * 1.04)
    : effSpin > 0
      ? groundFriction * QUIQUE.friccao_topspin
      : groundFriction * QUIQUE.friccao_backspin;
  // Helper: estes três multiplicadores controlam quanto pace horizontal sobra
  // após o quique para cada família de spin.
  ball.vel.x *= friction;
  ball.vel.y *= friction;

  if (!isSliceServeBounce && !isKickServeBounce && hSpdPre > QUIQUE.pacebrake_inicio) {
    const paceBrake = clamp(
      1 - (hSpdPre - QUIQUE.pacebrake_inicio) * QUIQUE.pacebrake_coef,
      QUIQUE.pacebrake_min,
      1.0
    );
    // Helper: subir `pacebrake_coef` faz bombas perderem mais pace no quique.
    ball.vel.x *= paceBrake;
    ball.vel.y *= paceBrake;
  }

  if (ball._isDropShot) {
    ball.vel.x *= DROP_SHOT.vel_horizontal_mult;
    ball.vel.y *= DROP_SHOT.vel_horizontal_mult;
    ball.vel.z  = Math.min(ball.vel.z * DROP_SHOT.vel_vertical_mult, DROP_SHOT.vel_vertical_max);
    // Helper: aqui mora o "drop morre". Se o drop estiver escapando vivo,
    // mexa primeiro nestes três números.
  } else if (!isSliceServeBounce && !isKickServeBounce && effSpin < QUIQUE.backspin_forte_min) {
    ball.vel.x *= QUIQUE.backspin_forte_vel_mult;
    ball.vel.y *= QUIQUE.backspin_forte_vel_mult;
    ball.vel.z *= QUIQUE.backspin_forte_vz_mult;
  }

  // Sidespin → lateral deflection (banana, kick wide, slice serve skidding)
  // FIX P2.3: coeficiente agora escala com velocidade horizontal pré-impacto.
  // Um slice serve a 190km/h deflete mais do que uma bola de rally a 90km/h com mesmo spin.
  // sideCoeff: 0.028 (bola lenta) → 0.053 (bola muito rápida, hSpd≈42m/s)
  const sideCoeff = QUIQUE.sidespin_coef_lento
    + clamp((hSpdPre - 12) / 30, 0, 1) * (QUIQUE.sidespin_coef_rapido - QUIQUE.sidespin_coef_lento);
  // Helper: estes coeficientes controlam a curva lateral no quique.
  ball.vel.x += ball.spin.z * sideCoeff;
  if (isKickServeBounce) {
    ball.vel.x += ball.spin.z * sideCoeff * 0.45;
  }

  ball.spin.x *= QUIQUE.decay_spinx_quique;
  ball.spin.z *= QUIQUE.decay_spinz_quique;
  // Helper: estes dois números definem quanto do spin sobrevive ao quique.
  ball.bounceCount++;
  ball._timeSinceBounce = 0; // reset last-chance hit window
  ball._bounceId = (ball._bounceId ?? 0) + 1; // ID único por quique — usado pelo BounceRise Master

  // ── Variância de superfície: irregularidade do bounce por quadra ─────────
  // Queen's/Wimbledon (grama velha): bounceVariance=0.08–0.12 → bounce lateral/vertical imprevisível
  // Saibro (RG/Monte Carlo): bounceVariance=0.02–0.03 → muito consistente
  // Indoor/Hard: bounceVariance=0.00–0.01 → quase perfeito
  const bVariance = courtPhys?.bounceVariance ?? 0;
  if (bVariance > 0) {
    // Box-Muller para ruído com distribuição gaussiana (mais realista que uniform)
    const u1 = Math.max(1e-9, Math.random()), u2 = Math.random();
    const gauss = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    // Ruído vertical: altera altura do bounce (±)
    ball.vel.z  = Math.max(0, ball.vel.z + gauss * bVariance * 3.5);
    // Ruído lateral: desvio inesperado (banana estranha, quique skidding)
    ball.vel.x += gauss * bVariance * QUIQUE.variancia_lateral_quique;
  }

  // Dead-ball detection: drop shot or slice with heavy backspin landing short/soft
  // When horizontal speed is very low after bounce, mark ball as dying → slides to stop
  // GUARD: if the ball was falling steeply (|incomingVz| > 4.5 m/s) it came from a
  // high arc (slice/half-volley from a high ball) and has enough energy to bounce
  // normally — suppress dead-ball in that case.
  const _highArcBounce = Math.abs(_incomingVz) > DROP_SHOT.dead_ball_incoming_vz_guard;
  const hSpd = Math.sqrt(ball.vel.x ** 2 + ball.vel.y ** 2);
  const dropHSpd = ball._isDropShot ? DROP_SHOT.dead_ball_hspd_drop : DROP_SHOT.dead_ball_hspd_default;
  const dropSpin = ball._isDropShot ? DROP_SHOT.dead_ball_spin_drop : DROP_SHOT.dead_ball_spin_default;
  if (ball._isDropShot && ball.bounceCount === 1) {
    ball._deadBall = true;
    ball.vel.x *= DROP_SHOT.dead_ball_vel_x_mult;
    ball.vel.y *= DROP_SHOT.dead_ball_vel_y_mult;
    ball.vel.z  = Math.min(Math.max(ball.vel.z, DROP_SHOT.dead_ball_vz_min), DROP_SHOT.dead_ball_vz_max);
  } else if (!isSliceServeBounce && !isKickServeBounce && !_highArcBounce && hSpd < dropHSpd && effSpin < dropSpin && ball.bounceCount === 1) {
    ball._deadBall = true;
    // Extra kill: squeeze horizontal velocity further on first dead-ball contact
    ball.vel.x *= DROP_SHOT.dead_ball_extra_kill_mult;
    ball.vel.y *= DROP_SHOT.dead_ball_extra_kill_mult;
    ball.vel.z  = Math.min(Math.max(ball.vel.z, DROP_SHOT.dead_ball_extra_vz_min), DROP_SHOT.dead_ball_extra_vz_max);
  } else if (ball.bounceCount === 1) {
    ball._deadBall = false; // reset for non-drop shots
    ball._isDropShot = false;
  }

  if (isSliceServeBounce || isKickServeBounce) ball._servePhysType = null;

  return true;
}

// ── Net / bounds checks ───────────────────────────────────────────
export function checkNetCollision(ball) {
  // FIX NET: usa _preStepY (Y antes do frame inteiro), não _prevY (Y do último sub-step).
  // Com sub-stepping (2/4/6 passos por frame), _prevY é sobrescrito em cada sub-step.
  // Se a bola cruzou a rede no sub-step 1 de 6, ao final _prevY e currY estão
  // ambos no lado cruzado → Math.sign igual → colisão ignorada → "rede oca no meio".
  // _preStepY garante que a comparação use o Y de antes do início do frame.
  const prevY = ball._preStepY ?? ball._prevY ?? ball.pos.y, currY = ball.pos.y;
  if (prevY === 0 || Math.sign(prevY) === Math.sign(currY)) return false;
  const frac   = Math.abs(prevY) / (Math.abs(prevY) + Math.abs(currY));
  const prevZ  = ball._preStepZ ?? ball._prevZ ?? ball.pos.z;
  const zAtNet = prevZ + frac * (ball.pos.z - prevZ);

  // ── Zona de raspada ("lip of the net") ──────────────────────────────────
  // Bola que cruza na faixa ±4cm da fita pode bater e cair do outro lado
  // ou passar por cima (a bola de sorte). Momento memorável do tênis.
  const netTop = COURT.netHeight + THRESHOLDS.netTolerance;
  const lipZone = REDE.lip_zone;
  // Lip zone centrada em netTop (topo físico da fita), não em netHeight (base da rede).
  // Antes: zona ia de netHeight-lipZone (0.82) até netTop+lipZone (0.95), e lip podia
  // superar 1.0 sem clamp → bolas a 0.93m tinham 89% de chance de bater. Incorreto.
  // Agora: zona é ±lipZone ao redor de netTop (0.87–0.95m). lip sempre [0,1].
  // lip=0 → bola na base da zona (alta chance de bater) | lip=1 → topo (baixa chance)
  if (zAtNet > netTop - lipZone && zAtNet <= netTop + lipZone) {
    const lip = Math.max(0, Math.min(1, (zAtNet - (netTop - lipZone)) / (2 * lipZone)));
    const hitChance = REDE.lip_hit_base + (1 - lip) * REDE.lip_hit_escala;
    // Helper: subir estes números aumenta o drama de bola na fita.
    if (Math.random() < hitChance) {
      // Bate na fita — deflexão: perde energia, ganho de impulso vertical pequeno
      // A bola continua em jogo (não resolvemos ponto aqui — game.js vê bounceCount)
      ball.vel.y *= REDE.deflexao_y_mult;
      ball.vel.z  = Math.abs(ball.vel.z) * REDE.deflexao_vz_abs_mult + REDE.deflexao_vz_bonus;
      ball.vel.x += (Math.random() - 0.5) * REDE.deflexao_x_aleatoria;
      ball._lipNet = true;  // flag para log/VFX em game.js
      return false; // colisão tratada — bola continua em jogo
    }
    // Passa pela fita (bola de sorte) — não registra colisão
    return false;
  }

  return zAtNet <= netTop;
}

export function checkOutOfBounds(ball) {
  if ((ball?.outGraceTimer ?? 0) > 0) return false;
  // Jogo de simples: limite lateral é a linha de simples (singlesW / 2), não a linha de duplas (halfW)
  return Math.abs(ball.pos.x) > COURT.singlesW / 2 + THRESHOLDS.outTolerance
      || Math.abs(ball.pos.y) > COURT.halfL + THRESHOLDS.outTolerance;
}

export function checkServiceBox(ball, serverSide, serveLeft) {
  // Y: ball must land in opponent's service area (between net and service line)
  const yOk = serverSide > 0
    ? (ball.pos.y >= -COURT.serviceLineY && ball.pos.y <= 0)
    : (ball.pos.y <=  COURT.serviceLineY && ball.pos.y >= 0);
  if (!yOk) return false;
  // X: must be within singles court width
  if (Math.abs(ball.pos.x) > COURT.singlesW / 2) return false;
  // Diagonal rule: server left of center → ball must land right of center (x >= 0), and vice versa
  // serveLeft=true → server at x<0 → ball must land at x >= 0
  // serveLeft=false → server at x>0 → ball must land at x <= 0
  // Allow small tolerance on the center line itself
  if (serveLeft  === true  && ball.pos.x < -0.05) return false;
  if (serveLeft  === false && ball.pos.x >  0.05) return false;
  return true;
}

// ── Adaptive sub-step integration ────────────────────────────────
// gs._bounce(gs) is set by game.js to avoid circular imports
export function stepPhysics(gs, dt) {
  const ball = gs.ball, spd = mag3(ball.vel);
  // Apply wind/altitude once per frame (not per sub-step — subtle effect)
  applyWindToBall(ball, gs.environment, dt);
  const sub  = spd > 32 ? 6 : spd > 16 ? 4 : ball.pos.z < 0.28 ? 4 : 2;
  const subDt = dt / sub;
  // Densidade do ar efetiva: calculada em initEnvironment com altitude real
  const airDensity = gs.environment?.airDensity ?? PHYSICS.airDensity;

  // FIX NET: salva Y/Z ANTES de todos os sub-steps.
  // _prevY é sobrescrito a cada sub-step em stepBallPhysics — se a bola cruza
  // a rede num sub-step inicial (ex: step 1 de 6), os steps seguintes atualizam
  // _prevY para o lado já cruzado. Quando checkNetCollision() roda em game.js
  // (após o loop), ambos _prevY e currY estão no mesmo lado → colisão ignorada.
  // _preStepY representa o Y de ANTES do frame inteiro, garantindo detecção
  // independente de qual sub-step a bola cruzou a rede.
  ball._preStepY = ball.pos.y;
  ball._preStepZ = ball.pos.z;

  for (let s = 0; s < sub; s++) {
    stepBallPhysics(ball, subDt, airDensity);
    if (handleGroundBounce(ball, gs.courtPhysics)) {
      gs.lastBouncePos = { ...ball.pos };
      gs._bounce(gs);
    }
  }
}

// ── Trajectory look-ahead (for AI targeting) ──────────────────────
// Returns: crossPoint (where/when ball crosses targetY), landPoint (first bounce),
//          timeToContact (alias for crossPoint.t for arrival margin calculation)
export function predictTrajectory(ball, targetY, maxTime = 2.8, airDensityForPred = PHYSICS.airDensity, courtPhysForPred = null, interceptOpts = null) {
  const sim = {
    pos: { ...ball.pos }, vel: { ...ball.vel }, spin: { ...ball.spin }, inFlight: true,
    _servePhysType: ball._servePhysType ?? null,
    // ── Bug fix: se a bola já quicou na vida real (bounceCount >= 1), a fase
    // pós-quique já está ativa — a simulação deve detectar optimalHitPoint na
    // subida ATUAL, não só após o próximo quique simulado.
    _postBounce: (ball.bounceCount ?? 0) > 0,
    _optHitFound: false,
    _optHitScore: -Infinity,
  };
  // Use court-specific physics for bounce simulation (restitution, friction vary per surface)
  const superficiePred = getConfigSuperficie(courtPhysForPred?.surface ?? 'DURA');
  const predRestitution = courtPhysForPred?.restitution ?? superficiePred.restituicao ?? PHYSICS.restitution;
  const predGroundFriction = courtPhysForPred?.groundFriction ?? superficiePred.friccao_chao ?? PHYSICS.groundFriction;
  const predHumidityFriction = courtPhysForPred?.humidityFriction ?? superficiePred.humidade_friccao ?? 0;
  const interceptProfile = resolveInterceptProfile(courtPhysForPred, interceptOpts);
  let lastPos = { ...sim.pos }, crossPoint = null, landPoint = null;
  // FIX: usa 1/120fps para bater com stepPhysics (antes 1/60fps causava
  // pequenos desvios de posicionamento acumulados — jogadores chegavam atrasados).
  const dt = 1 / 120, steps = Math.floor(maxTime / dt);

  for (let i = 0; i < steps; i++) {
    const acc = computeAcceleration(sim, airDensityForPred);
    sim.vel.x += acc.x * dt; sim.vel.y += acc.y * dt; sim.vel.z += acc.z * dt;
    lastPos = { ...sim.pos };
    sim.pos.x += sim.vel.x * dt; sim.pos.y += sim.vel.y * dt; sim.pos.z += sim.vel.z * dt;

    // ── Full bounce simulation (mirrors handleGroundBounce exactly) ──
    if (sim.pos.z <= PHYSICS.ballRadius && sim.vel.z < 0) {
      sim.pos.z = PHYSICS.ballRadius;
      const isSliceServeBounceSim = sim._servePhysType === 'SLICE' && !landPoint;
      const isKickServeBounceSim = sim._servePhysType === 'KICK' && !landPoint;
      // ── Signature overrides — 1º quique apenas, consumidos one-shot ──
      let simRestitution = predRestitution;
      if (!landPoint) { // landPoint ainda null = é o 1º quique
        if (sim._sigBounce != null) {
          simRestitution *= sim._sigBounce;
          sim._sigBounce = null;
        }
        if (sim._sigBounceSpin != null) {
          sim.spin.x *= sim._sigBounceSpin;
          sim._sigBounceSpin = null;
        }
      }
      const effSpin = sim.spin.x * (-(Math.sign(sim.vel.y) || 1));
      const hSpdPreSim = Math.sqrt(sim.vel.x ** 2 + sim.vel.y ** 2);
      // Capture incoming vz before bounce — guards dead-ball detection below.
      const _incomingVzSim = sim.vel.z;
      sim.vel.z = -sim.vel.z * simRestitution + effSpin * QUIQUE.coef_quique_spin;
      if (isSliceServeBounceSim) {
        sim.vel.z = Math.max(sim.vel.z * 1.28, 0.52);
      } else if (isKickServeBounceSim) {
        sim.vel.z = Math.max(sim.vel.z * 1.62 + Math.max(0, effSpin) * 0.045, 1.45);
      } else if (effSpin < 0) {
        const skidDampSim = clamp(1 - Math.abs(effSpin) * 0.10, QUIQUE.skid_damp_min, QUIQUE.skid_damp_max);
        sim.vel.z *= skidDampSim;
      }
      const bounceFriction = Math.min(0.99, predGroundFriction + predHumidityFriction);
      const friction = isSliceServeBounceSim
        ? bounceFriction * QUIQUE.friccao_slice_serve
        : isKickServeBounceSim
          ? Math.min(0.96, bounceFriction * 1.04)
        : effSpin > 0
          ? bounceFriction * QUIQUE.friccao_topspin
          : bounceFriction * QUIQUE.friccao_backspin;
      sim.vel.x *= friction; sim.vel.y *= friction;
      if (!isSliceServeBounceSim && !isKickServeBounceSim && hSpdPreSim > QUIQUE.pacebrake_inicio) {
        const paceBrakeSim = clamp(
          1 - (hSpdPreSim - QUIQUE.pacebrake_inicio) * QUIQUE.pacebrake_coef,
          QUIQUE.pacebrake_min,
          1.0
        );
        sim.vel.x *= paceBrakeSim;
        sim.vel.y *= paceBrakeSim;
      }
      if (sim._isDropShot) {
        sim.vel.x *= DROP_SHOT.vel_horizontal_mult;
        sim.vel.y *= DROP_SHOT.vel_horizontal_mult;
        sim.vel.z  = Math.min(sim.vel.z * DROP_SHOT.vel_vertical_mult, DROP_SHOT.vel_vertical_max);
      } else if (!isSliceServeBounceSim && !isKickServeBounceSim && effSpin < QUIQUE.backspin_forte_min && Math.abs(_incomingVzSim) <= DROP_SHOT.dead_ball_incoming_vz_guard) {
        // Guard: high-arc incoming ball (|vz| > 4.5 m/s) has enough energy to bounce
        // normally even with heavy backspin — skip the extra kill.
        sim.vel.x *= QUIQUE.backspin_forte_vel_mult;
        sim.vel.y *= QUIQUE.backspin_forte_vel_mult;
        sim.vel.z *= QUIQUE.backspin_forte_vz_mult;
      }
      // FIX: sidespin escala com velocidade horizontal pré-impacto — espelha handleGroundBounce.
      // Coeficiente fixo 0.028 subestimava deflexão lateral de BANANA e slice serve rápidos.
      const sideCoeffSim = QUIQUE.sidespin_coef_lento
        + clamp((hSpdPreSim - 12) / 30, 0, 1) * (QUIQUE.sidespin_coef_rapido - QUIQUE.sidespin_coef_lento);
      sim.vel.x += sim.spin.z * sideCoeffSim;  // sidespin deflection after bounce
      if (isKickServeBounceSim) {
        sim.vel.x += sim.spin.z * sideCoeffSim * 0.45;
      }
      sim.spin.x *= QUIQUE.decay_spinx_quique; sim.spin.z *= QUIQUE.decay_spinz_quique;
      if (!landPoint) {
        landPoint = { x: sim.pos.x, y: sim.pos.y, t: (i + 1) * dt };
        // After first bounce in sim, tag so optimalHitPoint can be detected.
        sim._postBounce = true;
        if (sim._servePhysType === 'SLICE' || sim._servePhysType === 'KICK') sim._servePhysType = null;
      }
    }

    // ── Optimal hit point: ball in ideal height window NEAR targetY ────────────
    // CRÍTICO: o ponto de contato deve ser detectado próximo ao Y do jogador,
    // não no primeiro frame em que z entra na janela.
    //
    // HIERARQUIA DE PREFERÊNCIA (tênis real):
    //   1. SWEET zone (0.85–1.35m) mais próxima do targetY → ideal ATP
    //   2. HIP zone (0.55–0.85m) se bola não chegar ao SWEET → aceitável
    //   3. ANKLE zone (0.45–0.55m) apenas se não houver outra opção (bolas lentas/slice)
    //
    // Isso garante que jogadores deixam a bola subir até o sweet spot,
    // em vez de bater na primeira entrada da janela (0.45m) na subida.
    if (sim._postBounce && sim.pos.z >= interceptProfile.minContactZ && sim.pos.z <= interceptProfile.maxContactZ) {
      const distToTargetY = Math.abs(sim.pos.y - targetY);
      const z = sim.pos.z;
      const tNow = (i + 1) * dt;
      const timeSinceBounce = landPoint ? Math.max(0, tNow - landPoint.t) : tNow;
      const heightFit = 1 - clamp(Math.abs(z - interceptProfile.preferredContactZ) / Math.max(0.08, interceptProfile.contactBand), 0, 1);
      const yFit = 1 - clamp(distToTargetY / Math.max(0.5, interceptProfile.yTolerance), 0, 1);
      const timingFit = 1 - clamp(timeSinceBounce / Math.max(0.15, interceptProfile.delayBand), 0, 1);
      const riseTerm = sim.vel.z >= 0 ? interceptProfile.riseBonus : -interceptProfile.fallPenalty;
      const lowBallTerm = z <= interceptProfile.preferredContactZ ? interceptProfile.lowBallBonus : 0;
      const candidateScore = heightFit * 2.5 + yFit * 1.7 + timingFit * 1.3 + riseTerm + lowBallTerm;

      if (!sim._optHitFound) {
        sim._optHitFound   = true;
        sim._optHitX       = sim.pos.x; sim._optHitY = sim.pos.y;
        sim._optHitZ       = sim.pos.z; sim._optHitT = (i + 1) * dt;
        sim._optHitDist    = distToTargetY;
        sim._optHitScore   = candidateScore;
      } else {
        const betterScore = candidateScore > sim._optHitScore + 1e-6;
        const sameScore = Math.abs(candidateScore - sim._optHitScore) <= 1e-6;
        const closerToTarget = distToTargetY < sim._optHitDist;
        if (betterScore || (sameScore && closerToTarget)) {
          sim._optHitX      = sim.pos.x; sim._optHitY = sim.pos.y;
          sim._optHitZ      = sim.pos.z; sim._optHitT = (i + 1) * dt;
          sim._optHitDist   = distToTargetY;
          sim._optHitScore  = candidateScore;
        }
      }
    }

    // ── Find first crossing of targetY line ──────────────────────────
    if (!crossPoint && Math.sign(lastPos.y - targetY) !== Math.sign(sim.pos.y - targetY)) {
      const f = Math.abs(targetY - lastPos.y) / (Math.abs(sim.pos.y - lastPos.y) || 1e-9);
      crossPoint = {
        x: lastPos.x + f * (sim.pos.x - lastPos.x), y: targetY,
        z: lastPos.z + f * (sim.pos.z - lastPos.z),
        t: (i + f) * dt,
      };
      // Once we have the crossing, simulate a little more for land point then stop
      if (landPoint) break;
    }

    // Stop simulation if ball is very slow after bouncing
    if (landPoint && mag3(sim.vel) < 0.4) break;
  }
  const optimalHitPoint = sim._optHitFound ? {
    x: sim._optHitX, y: sim._optHitY, z: sim._optHitZ, t: sim._optHitT,
  } : null;
  return { crossPoint, landPoint, optimalHitPoint };
}

// ── Launch a ball toward a target ─────────────────────────────────
// ── launchBall: iterative vz solver using real 3D physics ────────────────────
// Substitui o solver 2D simplificado anterior que causava overshoots sistêmicos
// em saques rápidos. Esse solver usa a mesma computeAcceleration() do jogo,
// garantindo que a trajetória calculada aqui BATE com a trajetória real frame a frame.
//
// Algoritmo:
//   1) Busca binária em vz para encontrar o ângulo que faz a bola pousar em targetY
//      com erro < LAND_TOL (0.15m).
//   2) Depois verifica se esse vz passa pela rede com netClearance.
//   3) Se não passar, sobe vz (menos descendente) até a rede ser limpa — aceitando
//      que a bola pousará além do targetY (saque longo mas dentro da caixa possível).
//   4) Se mesmo assim não houver solução física (saque muito rápido para a caixa),
//      escolhe o vz que minimiza a distância ao targetY dentro da restrição de rede.
//
// Isso elimina o bug do max(vzNet, vzLand): antes, vzNet ganhava sempre em saques
// rápidos, fazendo a bola voar plana demais e cair 5-6m além do alvo.
export function launchBall(ball, fromPos, targetX, targetY, spinType, power,
                            netClearance = 0.35, hitHeight = 0.9,
                            actualSpinX = null, actualSpinZ = null,
                            options = null) {
  const dx = targetX - fromPos.x, dy = targetY - fromPos.y;
  const hDist = Math.sqrt(dx * dx + dy * dy); if (hDist < 0.01) return;
  const flightProfile = options?.flightProfile ?? null;
  ball.pos.z = hitHeight;

  if (flightProfile?.mode === 'drop_rewrite') {
    const dirX = dx / hDist;
    const dirY = dy / hDist;
    const dropNetZ = flightProfile.netMinZ ?? (COURT.netHeight + 0.01);
    const gravity = PHYSICS.gravity;
    const minTime = flightProfile.minTime ?? 0.56;
    const maxTime = flightProfile.maxTime ?? 0.92;
    const minSpeed = flightProfile.minSpeed ?? 5.0;
    const maxSpeed = flightProfile.maxSpeed ?? 8.8;
    const endZ = PHYSICS.ballRadius;
    let chosen = null;

    for (let step = 0; step <= 28; step++) {
      const t = maxTime - ((maxTime - minTime) * step / 28);
      const hSpeed = hDist / Math.max(t, 1e-6);
      if (hSpeed < minSpeed || hSpeed > maxSpeed) continue;

      // gravity e negativo no runtime. Para resolver z(t)=endZ corretamente:
      // vz = (endZ - z0 - 0.5*g*t^2) / t
      const vz = (endZ - hitHeight - 0.5 * gravity * t * t) / t;
      if (vz <= 0) continue;

      let zAtNet = null;
      if (Math.sign(fromPos.y) !== Math.sign(targetY) && Math.abs(dy) > 0.001) {
        const fracToNet = Math.abs(fromPos.y) / Math.abs(dy);
        if (fracToNet > 0 && fracToNet < 1) {
          const tNet = t * fracToNet;
          zAtNet = hitHeight + vz * tNet - 0.5 * gravity * tNet * tNet;
        }
      } else {
        zAtNet = hitHeight;
      }

      if (zAtNet !== null && zAtNet >= dropNetZ) {
        chosen = { hSpeed, vz };
        break;
      }
    }

    if (!chosen) {
      const fallbackTime = clamp(hDist / 6.0, minTime, maxTime);
      const fallbackSpeed = clamp(hDist / Math.max(fallbackTime, 1e-6), minSpeed, maxSpeed);
      const fallbackVz = Math.max(
        0.65,
        (endZ - hitHeight - 0.5 * gravity * fallbackTime * fallbackTime) / fallbackTime,
      );
      chosen = { hSpeed: fallbackSpeed, vz: fallbackVz };
    }

    ball.vel.x = dirX * chosen.hSpeed;
    ball.vel.y = dirY * chosen.hSpeed;
    ball.vel.z = chosen.vz;
    ball.inFlight = true;
    ball.bounceCount = 0;

    const sm = chosen.hSpeed * 0.6;
    ball.spin.x = actualSpinX !== null ? actualSpinX : sm * 1.1 * Math.sign(ball.vel.y);
    ball.spin.z = actualSpinZ !== null ? actualSpinZ : sm * 0.02;
    return;
  }

  ball.vel.x = (dx / hDist) * power;
  ball.vel.y = (dy / hDist) * power;

  // ── Spin base pré-solver (necessário para computeAcceleration usar Magnus) ─
  // Quando actualSpinX/Z são fornecidos (groundstrokes), usa o spin real calculado
  // em buildShotWithPrefs → shotPhysics.spinFn/spinZ. O solver usa esses valores
  // para Magnus, garantindo que a trajetória simulada BATE com a trajetória real.
  // Sem isso, o solver calculava com sm=power×0.6 (ex: 31 rad/s) mas a bola real
  // voava com spin real (~1.3 rad/s), causando overshoot sistemático de 3–6m.
  // Saques e volleys (sem actualSpinX) continuam usando o fallback genérico.
  const sm = power * 0.6;
  if      (spinType ===  1) { ball.spin.x = -sm * 1.2 * Math.sign(ball.vel.y); ball.spin.z = sm * 0.2; }
  else if (spinType === -1) { ball.spin.x =  sm * 0.7 * Math.sign(ball.vel.y); ball.spin.z = sm * 0.6; }
  else                      { ball.spin.x = -sm * 0.1 * Math.sign(ball.vel.y); ball.spin.z = 0; }

  // Override com spin real do shot (groundstrokes) — solver e física de quique usam valores corretos
  if (actualSpinX !== null) ball.spin.x = actualSpinX;
  if (actualSpinZ !== null) ball.spin.z = actualSpinZ;

  // ── SPIN_SCALE_SOLVER: escala Magnus SOMENTE dentro do solver ────────────────
  // Problema: spin real de groundstrokes é ~1–3 rad/s (Magnus ≈ 2% g). O solver
  // acha um vz muito baixo → trajetória rasa → bola bate na rede de posição recuada.
  // Fix: escalar o spin dentro de simFlight para compensar parcialmente a diferença.
  //
  // CALIBRAÇÃO (simulação numérica confirmada):
  //   scale=18 (antigo): solver escolhe vz muito alto → bola sobrevoa o alvo em 4–5m
  //                      Ex: target y=-7m → real landing y=-11m (OVERSHOOT sistemático)
  //   scale=3  (novo):   solver escolhe vz correto → erro real <1.5m na maioria dos casos
  //                      Ex: target y=-7m → real landing y=-7.8m (preciso)
  //                          target y=-9m → real landing y=-9.5m (preciso)
  // O scale=18 era baseado no solver antigo (sm=power×0.6≈26 rad/s) que produzia
  // trajetórias "corretas" apenas porque compensava outro bug — não era física real.
  // Aplicado SOMENTE quando actualSpinX foi fornecido (groundstrokes); saques
  // já usam sm=power×0.6 (~26 rad/s) que é adequado — não precisam de escala.
  const dynamicSpinScale = options?.flightProfile?.solverSpinScale ?? 3;
  const solverSpinScale   = actualSpinX !== null ? dynamicSpinScale : 1;

  // ── Simulação forward com vz candidato ──────────────────────────────────────
  // Retorna: {landY, zAtNet, clearsNet}
  // zAtNet = z quando bola cruza x=0 (rede); null se nunca chegar
  const SIM_DT   = 1 / 120;
  const SIM_STEPS = 3500;           // ~29s máx — mais que suficiente
  // NET_MIN_Z: mínimo de altura que a bola deve passar na rede.
  // Era COURT.netHeight (0.914m) — isso permitia que a bola passasse na lip zone
  // (±4cm da fita), causando 59-71% de chance de colisão de fita e rebote para trás.
  // Resultado: bolas com zAtNet=0.92-0.94m batiam na fita e voltavam ao lado do batedor,
  // registrando erros absurdos de 13-15m no log.
  // Fix: 0.914 + lipZone(0.04) + margin(0.04) = 0.994m — garante passagem acima da lip zone.
  // Efeito: shots rápidos de baseline que só conseguiam passar raspando a rede agora
  // ou sobem mais (vz maior, bola vai mais funda) ou não encontram solução (erro de rede).
  // NET_MIN_Z: altura mínima que a bola deve passar na rede no solver.
  // Com SPIN_SCALE_SOLVER=3 (calibrado), o solver encontra vz mais próximo do
  // real e não precisa de margem extra grande para compensar discrepâncias.
  // Usar 0.914 + 0.02 = 0.934m — apenas 2cm acima da fita (evita lip zone óbvio
  // mas não força vz excessivo que causaria overshoot em shots MID/SHORT).
  const NET_MIN_Z = flightProfile?.netMinZ ?? (COURT.netHeight + REDE.solver_margem_minima);
  // Helper: subir `solver_margem_minima` exige mais folga sobre a fita.

  function simFlight(vzCandidate) {
    // Estado temporário — não altera ball real.
    // spin escalado por solverSpinScale para que Magnus seja realista no solver
    // (spin real ~1–3 rad/s → ×18 → ~27 rad/s, equivalente ao comportamento pré-fix).
    // ball.spin permanece em escala real para bounce, VFX e dispersão.
    const bsim = {
      vel:  { x: ball.vel.x, y: ball.vel.y, z: vzCandidate },
      spin: { x: ball.spin.x * solverSpinScale, y: (ball.spin.y || 0) * solverSpinScale, z: ball.spin.z * solverSpinScale },
    };
    let px = fromPos.x, py = fromPos.y, pz = hitHeight;
    let zAtNet = null;

    for (let i = 0; i < SIM_STEPS; i++) {
      // computeAcceleration requer objeto {vel, spin, pos}
      bsim.pos = { x: px, y: py, z: pz };
      const acc = computeAcceleration(bsim);
      bsim.vel.x += acc.x * SIM_DT;
      bsim.vel.y += acc.y * SIM_DT;
      bsim.vel.z += acc.z * SIM_DT;
      const prevPy = py, prevPz = pz;
      px += bsim.vel.x * SIM_DT;
      py += bsim.vel.y * SIM_DT;
      pz += bsim.vel.z * SIM_DT;

      // Detecção de rede (y cruza 0)
      if (zAtNet === null && Math.sign(prevPy) !== Math.sign(py) && Math.sign(prevPy) !== 0) {
        const f = Math.abs(prevPy) / (Math.abs(prevPy) + Math.abs(py) || 1e-9);
        zAtNet = prevPz + f * (pz - prevPz);
      }

      // Detecção de quique (z cruza solo)
      if (pz <= PHYSICS.ballRadius && bsim.vel.z < 0) {
        const clearsNet = zAtNet !== null && zAtNet >= NET_MIN_Z;
        return { landY: py, zAtNet, clearsNet };
      }
    }
    return { landY: py, zAtNet, clearsNet: false };
  }

  // ── Passo 1: busca binária — encontrar vz que pousa em targetY ────────────
  // Range: vz de -18 (muito descendente) a +12 (arco alto — necessário para
  // retornos de defesa profundos em que o jogador precisa de muita elevação).
  //
  // Direção universal (funciona para saques E retornos):
  // vz maior → bola fica no ar mais tempo → vai mais longe na direção de vy.
  // "Mais longe" = mais negativo se vy<0 (saques), mais positivo se vy>0 (retornos).
  // Logo: se (landY - targetY) * sign(vy) > 0, a bola foi longe demais → vzHi = vzMid.
  //       se (landY - targetY) * sign(vy) < 0, a bola ficou curta       → vzLo = vzMid.
  const LAND_TOL = 0.20;   // erro aceitável de pouso (metros)
  const vySign   = ball.vel.y >= 0 ? 1 : -1;
  let vzLo = -18.0, vzHi = 12.0, vzBest = -3.0;
  let bestErr = Infinity;

  for (let iter = 0; iter < 28; iter++) {
    const vzMid = (vzLo + vzHi) * 0.5;
    const { landY } = simFlight(vzMid);
    const err = landY - targetY;
    const absErr = Math.abs(err);
    if (absErr < bestErr) { bestErr = absErr; vzBest = vzMid; }
    if (absErr < LAND_TOL) break;
    if (err * vySign > 0) vzHi = vzMid;   // foi longe demais  → menos vz
    else                  vzLo = vzMid;   // ficou curta       → mais vz
  }

  // ── Passo 2: verificar clearance de rede com vzBest ──────────────────────
  const { clearsNet: bestClears, zAtNet: bestZNet } = simFlight(vzBest);

  let vzFinal = vzBest;

  if (!bestClears) {
    // vzBest acerta o alvo mas bate na rede.
    // Subir vz gradualmente até limpar a rede — MAS verificar se a bola não
    // vai cair fora da quadra. Um shot que não consegue limpar a rede sem
    // ultrapassar a linha de fundo deve resultar em erro de rede, não em fora.
    // Exemplo: FLAT 145km/h profundo — forçar passagem de rede manda a bola
    // 2-5m além da baseline. Correto é a bola bater na rede, não voar fora.
    let vzSearch = vzBest;
    let foundClear = false;
    // OUT_GUARD: limite ESTRITO — 15cm DENTRO da baseline.
    // Era COURT.halfL + 0.20 (12.085m), mas checkOutOfBounds usa halfL + outTolerance (11.935m).
    // Discrepância de 15cm causava o bug: solver aceitava bolas que caíam em [11.935, 12.085m]
    // → "dentro" para o solver mas "FORA" para o jogo. Corrigido: 11.735m < 11.935m (margem real).
    // Efeito para potência alta: bola flat de 170+km/h que não consegue limpar a rede SEM
    // ultrapassar 11.735m → bate na rede (erro correto) em vez de voar para fora.
    const OUT_GUARD = COURT.halfL - 0.15; // 11.735m — alinhado com regras reais do jogo
    for (let step = 0; step < 80; step++) {
      vzSearch += 0.06; // incremento menor: 0.15→0.06 — mais preciso, menos overshoot por step
      const { clearsNet, landY } = simFlight(vzSearch);
      if (clearsNet) {
        if (Math.abs(landY) <= OUT_GUARD) {
          vzFinal = vzSearch; foundClear = true;
        }
        // Mais vz = mais overshoot — não adianta continuar subindo
        break;
      }
    }
    if (!foundClear) {
      // Sem solução que simultâneamente limpa a rede E fica dentro: usa vzBest.
      // A bola baterá na rede (erro de rede correto) em vez de voar 3-5m fora.
      vzFinal = vzBest;
    }
  }

  if (flightProfile) {
    const profileVzMin = flightProfile.vzMin ?? -20;
    const profileVzMax = flightProfile.vzMax ?? 28;
    const searchMax = Math.min(vzFinal, profileVzMax);
    const maxLandingError = flightProfile.maxLandingError ?? 1.05;
    const strictArc = !!flightProfile.strictArc;
    const preferHighArc = !!flightProfile.preferHighArc;
    const highArcFloor = preferHighArc
      ? (flightProfile.highArcFloor ?? (profileVzMin + (searchMax - profileVzMin) * 0.58))
      : profileVzMin;
    let chosenVz = null;

    // Por padrão busca o arco mais baixo que ainda funciona.
    // Para LOB, `preferHighArc` inverte a prioridade para procurar o arco mais alto viável.
    for (let step = 0; step <= 26; step++) {
      const t = preferHighArc ? (1 - step / 26) : (step / 26);
      const vzProbe = profileVzMin + (searchMax - profileVzMin) * t;
      if (preferHighArc && vzProbe < highArcFloor) continue;
      const probe = simFlight(vzProbe);
      if (!probe.clearsNet) continue;
      if (Math.abs(probe.landY - targetY) <= maxLandingError) {
        chosenVz = vzProbe;
        break;
      }
    }

    if (chosenVz !== null) {
      vzFinal = chosenVz;
    } else {
      const clampedVz = clamp(vzFinal, profileVzMin, profileVzMax);
      const clampedProbe = simFlight(clampedVz);
      if (strictArc) {
        // Para golpes como DROP, se não existe solução de arco baixo,
        // o comportamento correto é rede/curta — não improvisar um mini-lob.
        vzFinal = clampedVz;
      } else if (clampedProbe.clearsNet) {
        vzFinal = clampedVz;
      }
    }
  }

  ball.vel.z = clamp(vzFinal, -20, 28);
  ball.inFlight = true; ball.bounceCount = 0;
}

