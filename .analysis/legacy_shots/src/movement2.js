// ═══════════════════════════════════════════════════════════════════
// movement2.js — Sistema de posicionamento v2.0 (escrito do zero)
// ═══════════════════════════════════════════════════════════════════
//
// FILOSOFIA:
//   O jogador se move para uma POSIÇÃO DE ESPERA onde a bola vai
//   chegar até ele — não para o ponto matemático do contato.
//
// 3 SISTEMAS INDEPENDENTES:
//   1. getBasePos        → onde esperar (T-zone / baseline / net)
//   2. getInterceptPoint → para onde correr quando a bola vem
//   3. canHitNow         → quando a bola está realmente alcançável
//
// FSM DE 4 ESTADOS:
//   WAIT    → bola no lado adversário, vai para basePos
//   MOVE    → bola vindo, corre para interceptPoint
//   HIT     → bola dentro do reach + quicou + altura OK → para
//   RECOVER → acabou de bater, volta para basePos
//
// INTERFACE COM GAME.JS (campos que devem existir no player):
//   player._arrivalMargin   lido pelo ContactModel
//   player._predCrossX      lido pelo ContactModel
//   player._volleyType      lido pelo shot selector
//   player._halfVolleyContext lido pelo shot selector
//   player.basePos          lido pelo sistema de debug
// ═══════════════════════════════════════════════════════════════════

import { COURT, THRESHOLDS, PLAYER_CFG, STAMINA, INERTIA, MOVEMENT } from './constants.js';
import { clamp } from './math.js';

// ─────────────────────────────────────────────────────────────────
// CONSTANTES LOCAIS
// ─────────────────────────────────────────────────────────────────

const HALF_L   = COURT.halfL;    // 11.885m centro→baseline
const HALF_W   = COURT.halfW;    // 5.485m centro→lateral
const SVC_LINE = COURT.serviceLineY; // 6.4m centro→linha de serviço

// Limites físicos do mapa
const OUTER_Y  = HALF_L + THRESHOLDS.outerPlayerY;
const OUTER_X  = HALF_W + THRESHOLDS.outerPlayerX;

// Zona de rede (atNet = jogador avançou para jogar voleio)
const NET_ZONE_Y = 3.2;   // menos de 3.2m da rede = zona de voleio

// ─────────────────────────────────────────────────────────────────
// SISTEMA 1 — BASE POSITION (onde esperar quando bola no adversário)
// ─────────────────────────────────────────────────────────────────

/**
 * Retorna { x, y } — posição neutra de espera do jogador.
 *
 * Y: distância da rede onde o jogador fica em pé de espera.
 *    ATP real: 8–10m da rede (2–4m dentro da baseline).
 *    Jogadores explosivos ficam mais perto da rede para pegar na subida.
 *    Jogadores pacientes ficam mais recuados para ter mais tempo.
 *
 * X: bisector — deslocado para cobrir o ângulo do último golpe adversário.
 */
function getBasePos(player, gs) {
  const prefs     = player.prefs;
  const courtMode = player.ctx?.courtMode ?? 'BASE';
  const opp       = gs.players?.find(p => p.id !== player.id);

  // ── Rede (NET) ───────────────────────────────────────────────────
  // Jogador confirmou subida → T-position adaptativa
  if (player.atNet || courtMode === 'NET') {
    return computeNetPos(player, gs);
  }

  // ── Subida (TRANSITION) ──────────────────────────────────────────
  // Após approach shot → avança para mid-court ofensivo (~4.5m da rede)
  if (courtMode === 'TRANSITION') {
    return computeTransitionPos(player, gs);
  }

  // ── BASE: posição neutra de espera ───────────────────────────────
  // Y baseada em dados ATP:
  //   Djokovic/Alcaraz (EXPLOSIVE): ~7.5–8.5m da rede
  //   Federer (BALANCED):           ~9–10m
  //   Nadal/Sonego (PATIENT):       ~10–11m
  // Metros ATRÁS da baseline onde o jogador espera (0 = na linha, 2 = 2m atrás)
  // ATP real: baselines ficam 0.5–2.5m atrás da baseline entre os golpes
  const waitBehindBaseline = prefs ? ({
    EXPLOSIVE:    0.4,   // quase na baseline — reage rápido
    EARLY_ATTACK: 0.7,
    BALANCED:     1.0,   // 1m atrás — posição neutra ATP
    MEASURED:     1.5,
    PATIENT:      2.2,   // 2m atrás — tempo extra para ler
  }[prefs.rallyCadence] ?? 1.0) : 1.0;

  // Ajuste de momentum: momentum baixo → recua mais
  const mom    = player.ctx?.momentum ?? 0.5;
  const momAdj = (0.5 - mom) * 0.8;
  const behind  = clamp(waitBehindBaseline + momAdj, 0.1, 3.0);
  const finalY  = player.side * (HALF_L + behind);

  // ── X: bisector do ângulo ────────────────────────────────────────
  const lastOppX  = opp?.ctx?._lastShotX ?? 0;
  const bisectorX = clamp(lastOppX * 0.25, -2.0, 2.0);

  return { x: bisectorX, y: finalY };
}

// ─────────────────────────────────────────────────────────────────
// SISTEMA 2 — INTERCEPT POINT (para onde correr quando a bola vem)
// ─────────────────────────────────────────────────────────────────

/**
 * Simulação balística rápida: onde a bola vai quicar (1º quique se
 * ainda não quicou, 2º quique se já quicou).
 *
 * Não usa predictTrajectory completo (336 steps) — só equação balística.
 * Boa o suficiente para posicionamento.
 *
 * Retorna { x, y, t } ou null se a bola não vai quicar.
 */
// ─────────────────────────────────────────────────────────────────
// SISTEMA 2 — ONDE A BOLA VAI ESTAR EM ALTURA BOA
// ─────────────────────────────────────────────────────────────────

const CONTACT_Z = 0.75;   // altura alvo de contato (HIP zone — confortável)
const BALL_R    = 0.07;
const G_PHYS    = 9.8;

/**
 * findContactPoint — onde e quando a bola estará em CONTACT_Z.
 *
 * Casos:
 *  A. Bola subindo (vz > 0) e abaixo de CONTACT_Z
 *     → equação quadrática: t onde z=CONTACT_Z na subida (raiz menor)
 *  B. Bola acima de CONTACT_Z (independente de vz)
 *     → pode bater agora; retorna posição atual com t≈0
 *  C. Bola descendo (vz < 0) e acima de CONTACT_Z
 *     → equação quadrática: t onde z=CONTACT_Z na descida
 *  D. Bola ainda não quicou (bounceCount == 0)
 *     → simular 1º quique, depois encontrar subida até CONTACT_Z
 *
 * Retorna { x, y, z, t } ou null se impossível.
 */
function findContactPoint(ball, courtPhysics) {
  const { x, y, z, vel, bounceCount } = ball;
  // Guard: if ball state is NaN/Infinity, return current position immediately
  if (!isFinite(x) || !isFinite(y) || !isFinite(z) ||
      !isFinite(vel.x) || !isFinite(vel.y) || !isFinite(vel.z)) {
    return null;
  }
  const vx = vel.x, vy = vel.y, vz = vel.z;
  const restitution   = courtPhysics?.restitution   ?? 0.74;
  const groundFriction = courtPhysics?.groundFriction ?? 0.82;

  // ── CASO D: bola ainda não quicou ────────────────────────────────
  if ((bounceCount ?? 0) === 0) {
    // Simular o 1º quique
    const a = 0.5 * G_PHYS;
    const b = -vz;
    const cc = BALL_R - z;
    const disc = b*b - 4*a*cc;
    if (disc < 0) return null;
    const t1 = (-b - Math.sqrt(disc)) / (2*a);
    const t2 = (-b + Math.sqrt(disc)) / (2*a);
    const tLand = t1 > 0.001 ? t1 : (t2 > 0.001 ? t2 : null);
    if (!tLand || tLand > 3.0) return null;

    const lx = x + vx * tLand;
    const ly = y + vy * tLand;

    // Após o quique: vz rebate com restitution, vy e vx freiam com friction
    const vzAfter = Math.abs(vz) * restitution;
    const spin = ball.spin?.x ?? 0;
    const vzBounce = vzAfter + spin * 0.028;

    // Encontrar subida até CONTACT_Z a partir do landPoint
    const a2 = 0.5 * G_PHYS;
    const b2 = -vzBounce;
    const cc2 = BALL_R - CONTACT_Z;  // CONTACT_Z > BALL_R → cc2 < 0 → disc2 > disc positivo
    const disc2 = b2*b2 - 4*a2*cc2;
    if (disc2 < 0) {
      // Bola não sobe até CONTACT_Z (quique fraco) — usar posição do quique
      return { x: lx, y: ly, z: BALL_R, t: tLand };
    }
    const sqrtD2 = Math.sqrt(disc2);
    const dt1 = (-b2 - sqrtD2) / (2*a2);
    const dt2 = (-b2 + sqrtD2) / (2*a2);
    const dt = dt1 > 0.001 ? dt1 : (dt2 > 0.001 ? dt2 : null);
    if (!dt || dt > 2.0) {
      return { x: lx, y: ly, z: BALL_R, t: tLand };
    }

    const vyAfter = vy * groundFriction;
    const vxAfter = vx * groundFriction;
    return {
      x: lx + vxAfter * dt,
      y: ly + vyAfter * dt,
      z: CONTACT_Z,
      t: tLand + dt,
    };
  }

  // ── CASOS A/B/C: bola já quicou ──────────────────────────────────

  // Caso B: já está na altura certa ou acima
  if (z >= CONTACT_Z) {
    return { x, y, z, t: 0.001 };  // pode bater agora
  }

  // Casos A e C: resolver z + vz*t - 0.5*G*t² = CONTACT_Z
  const aq = 0.5 * G_PHYS;
  const bq = -vz;
  const cq = CONTACT_Z - z;         // > 0 porque CONTACT_Z > z atual
  const dq = bq*bq - 4*aq*(-cq);   // = vz² + 2G*(CONTACT_Z - z) → sempre ≥ 0 se vz² + ... ≥ 0

  // Reformulando: 0.5*G*t² - vz*t + (CONTACT_Z - z) = 0
  const dq2 = vz*vz - 4*(0.5*G_PHYS)*(CONTACT_Z - z);  // = vz² - 2G*(CONTACT_Z-z)

  if (dq2 < 0) {
    // Bola não tem energia suficiente para chegar a CONTACT_Z
    // Ir direto para a posição atual da bola
    return { x, y, z, t: 0.001 };
  }

  const sqrtDq = Math.sqrt(dq2);
  const tq1 = (vz - sqrtDq) / G_PHYS;   // subida (menor)
  const tq2 = (vz + sqrtDq) / G_PHYS;   // descida (maior)

  // Preferir a subida (tq1) se positiva — pega a bola cedo
  const t = (tq1 > 0.001) ? tq1 : (tq2 > 0.001 ? tq2 : null);
  if (!t || t > 2.5) {
    return { x, y, z, t: 0.001 };
  }

  const cx = x + vx * t;
  const cy = y + vy * t;
  // Sanity: contact point must be within playable bounds
  if (!isFinite(cx) || !isFinite(cy)) return { x, y, z, t: 0.001 };
  return { x: cx, y: cy, z: CONTACT_Z, t };
}

/**
 * getInterceptPoint — para onde o jogador deve correr.
 *
 * Usa findContactPoint para saber ONDE a bola estará em altura boa,
 * e manda o jogador para lá.
 *
 * Bola CURTA (contact.y dentro da quadra do jogador):
 *   → vai direto ao ponto de contato (avança para interceptar)
 *
 * Bola PROFUNDA (contact.y atrás da baseline do jogador):
 *   → vai ao ponto de contato (que estará atrás da baseline)
 */
function getInterceptPoint(player, gs) {
  const ball      = gs.ball;
  const outerX    = OUTER_X - 0.2;
  const outerY    = OUTER_Y;
  const courtMode = player.ctx?.courtMode ?? 'BASE';

  // ── Rede / Transição ─────────────────────────────────────────────
  if (player.atNet || courtMode === 'NET') return computeNetPos(player, gs);
  if (courtMode === 'TRANSITION')          return computeTransitionPos(player, gs);

  // ── Encontrar ponto de contato ideal ─────────────────────────────
  const contact = findContactPoint(ball, gs.courtPhysics);

  if (!contact) {
    // Fallback: ir para a bola diretamente
    return {
      x: clamp(ball.pos.x, -outerX, outerX),
      y: clamp(ball.pos.y, -outerY, outerY),
      t: null,
    };
  }

  // O jogador vai para onde a bola vai estar em CONTACT_Z
  // Pequeno ajuste: se contact.y está muito dentro da quadra (bola curta real),
  // o jogador avança um pouco para frente do ponto para pegar a bola na subida
  // Clamp contact to playable zone — never send player to y=±50m
  const contactClamped = {
    x: clamp(contact.x, -(OUTER_X - 0.2), (OUTER_X - 0.2)),
    y: clamp(contact.y, -OUTER_Y, OUTER_Y),
    z: contact.z,
    t: contact.t,
  };
  const contactAbsY = Math.abs(contactClamped.y);
  const baselineAbs = HALF_L;
  const isReallyShort = contactAbsY < SVC_LINE; // < 6.4m da rede = drop shot real
  // Use clamped contact from here
  Object.assign(contact, contactClamped);

  let finalX = clamp(contact.x, -outerX, outerX);
  let finalY = clamp(contact.y, -outerY, outerY);

  if (isReallyShort) {
    // Avança 0.4m além do ponto de contato (bola curta — ir buscar)
    finalY = clamp(contact.y + player.side * (-0.4), -outerY, outerY);
  }

  // Final sanity: if any coordinate is non-finite, fall back to current player position
  if (!isFinite(finalX) || !isFinite(finalY)) {
    return { x: player.pos.x, y: player.pos.y, t: null };
  }
  return { x: finalX, y: finalY, t: contact.t };
}


// ─────────────────────────────────────────────────────────────────
// SISTEMA 3 — HIT TRIGGER (pode bater agora?)
// ─────────────────────────────────────────────────────────────────

/**
 * Responde: a bola está alcançável e em altura boa para bater?
 *
 * CONDIÇÕES SIMPLES (sem margin, sem inHitWindow, sem _hitTarget):
 *   1. Bola quicou (bounceCount >= 1) — não intercepta no ar (sem voleio)
 *   2. Bola fisicamente próxima (dentro do reach)
 *   3. Altura adequada (0.20m a 2.5m)
 *   4. Bola ainda em jogo
 *   5. Não foi o jogador que bateu por último
 *
 * O tryHit() em game.js ainda faz sua própria checagem — isso aqui
 * é só para o estado FSM do jogador (parar de correr).
 */
function canHitNow(player, gs) {
  const ball = gs.ball;

  if (!ball.inFlight)                      return false;
  if (ball.lastHitBy === player.id)        return false;
  if ((ball.bounceCount ?? 0) < 1)         return false;
  if (ball.pos.z < 0.20)                   return false;
  if (ball.pos.z > 2.5)                    return false;

  const dx   = player.pos.x - ball.pos.x;
  const dy   = player.pos.y - ball.pos.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const reach = (player.reach ?? 0.85) * 1.6;  // pequena margem para parar de correr

  return dist < reach;
}


// ─────────────────────────────────────────────────────────────────
// SISTEMA DE REDE — Fase 3
// ─────────────────────────────────────────────────────────────────

/**
 * T-POSITION na rede:
 * O jogador cobre o ângulo aberto pelo oponente.
 * Fica entre 2.2m e 3.5m da rede dependendo do estilo.
 *
 * Oponente no lado esquerdo → jogador desloca levemente para esquerda
 * para cobrir o cross-court mais óbvio.
 */
function computeNetPos(player, gs) {
  const opp        = gs.players?.find(p => p.id !== player.id);
  const oppX       = opp?.pos?.x ?? 0;
  const lastShotX  = player.ctx?._lastShotX ?? 0;

  // Distância da rede por estilo
  const netDistFromNet = player.prefs ? ({
    HUNTER:      2.2,   // fecha bem a rede — agressivo
    PROACTIVE:   2.5,
    OPPORTUNIST: 2.8,
    RELUCTANT:   3.2,
    AVOIDS:      3.5,   // fica mais recuado mesmo na rede (não é natural)
  }[player.prefs.netGame] ?? 2.8) : 2.8;

  // T-position: cobre ângulo do oponente + bisector do último golpe
  // Oponente wide esquerda → jogador desloca levemente para esquerda
  const tPosX = clamp(
    oppX * 0.35 + lastShotX * 0.15,
    -2.2,
    2.2
  );

  return {
    x: tPosX,
    y: player.side * netDistFromNet,
  };
}

/**
 * TRANSITION pos: após approach shot, avança para mid-court ofensivo.
 * Fica a ~4.5m da rede — boa posição para volley de intercepção.
 * Não recua à baseline — está subindo.
 */
function computeTransitionPos(player, gs) {
  const lastShotX = player.ctx?._lastShotX ?? 0;
  const bisectorX = clamp(lastShotX * 0.20, -2.0, 2.0);

  // Approach land X: onde a bola que o jogador bateu vai quicar
  // Ajuda a cobrir o ângulo certo durante a subida
  const approachLandX  = player.ctx?._approachLandX ?? 0;
  const coverX = clamp(bisectorX * 0.6 + approachLandX * 0.4, -2.2, 2.2);

  // Y: ~40% da quadra = ~4.5m da rede (posição clássica de approach volley)
  const transY = player.side * (HALF_L * 0.38);

  return { x: coverX, y: transY };
}

/**
 * LOB check melhorado:
 * Usa lobCovMult do jogador para calibrar o threshold.
 * Bola normal topspin: 0.8–2.0m. Lob real: 3.5–6m.
 * Threshold: 2.8m + bonus de cobertura de lob.
 */
function isRealLob(player, gs) {
  const ball = gs.ball;
  if (!player.atNet) return false;
  if (ball.lastHitBy === player.id) return false;
  if (!ball.inFlight) return false;
  if (Math.sign(ball.pos.y) === player.side) return false;  // bola no meu lado

  const mods = player.mods;
  const lobZ = mods ? 2.8 + mods.lobCovMult * 0.40 : 2.8;

  return ball.pos.z > lobZ && ball.vel.z > 0;
}

/**
 * Se o jogador recebeu um lob profundo, deve recuar.
 * Checa se o lob vai cair profundo o suficiente para forçar recuo.
 */
function shouldRetreatFromLob(player, gs) {
  if (!isRealLob(player, gs)) return false;

  // Para o lob, só precisamos saber onde a bola vai cair (no chão)
  // Usamos findContactPoint com z=0 equivalente — mas como essa função busca
  // CONTACT_Z, usamos projeção linear simples para o lob (suficiente)
  const ball = gs.ball;
  const vz   = ball.vel.z;
  const G    = 9.8;
  const BALL_R = 0.07;
  if (vz >= 0) {
    // Bola subindo — calcular apex e depois descida até solo
    const tApex = vz / G;
    const yApex = ball.pos.y + ball.vel.y * tApex;
    // Checar se vai cair além da zona da rede
    const netY = player.side * 2.8;
    return Math.abs(yApex) > Math.abs(netY) + 3.0;
  }
  // Bola descendo — tempo até z=BALL_R
  const a = 0.5*G, b = -vz, cc = BALL_R - ball.pos.z;
  const disc = b*b - 4*a*cc;
  if (disc < 0) return true;
  const t = (-b - Math.sqrt(disc)) / (2*a);
  if (t < 0.001) return true;
  const landY = ball.pos.y + ball.vel.y * t;
  const netY = player.side * 2.8;
  return Math.abs(landY) > Math.abs(netY) + 3.0;
}

// ─────────────────────────────────────────────────────────────────
// FSM — MÁQUINA DE ESTADOS
// ─────────────────────────────────────────────────────────────────

function getState(player, gs) {
  const ball      = gs.ball;
  const courtMode = player.ctx?.courtMode ?? 'BASE';

  // RECOVER: acabou de bater — recuperação imediata
  if (ball.lastHitBy === player.id) return 'RECOVER';

  // Verificar se a bola vem para o lado do jogador
  const ballComingToMe =
    ball.inFlight &&
    ((player.side > 0 && ball.vel.y > 0) ||
     (player.side < 0 && ball.vel.y < 0));

  const ballOnMySide =
    Math.sign(ball.pos.y) === player.side ||
    Math.abs(ball.pos.y) < 0.5;

  const ballActive = ballComingToMe || ballOnMySide;

  // Bola no lado adversário → WAIT (reposicionar)
  if (!ballActive) return 'WAIT';

  // HIT: bola alcançável e em altura boa → planta e bate
  if (canHitNow(player, gs)) return 'HIT';

  // MOVE: bola vindo mas ainda não alcançável
  // Em TRANSITION: jogador está avançando — usa MOVE para o intercept na rede
  return 'MOVE';
}

// ─────────────────────────────────────────────────────────────────
// FÍSICA DE MOVIMENTO (copiada do movement.js — testada e funciona)
// ─────────────────────────────────────────────────────────────────

function applyMovementPhysics(player, target, maxSpd, dt, gs) {
  const mods        = player.mods;
  const staminaFrac = player.stamina ?? 1.0;
  const baseSpeed   = player.playerSpeed || PLAYER_CFG.speed;

  const ballComingToMe = gs.ball.inFlight &&
    ((player.side > 0 && gs.ball.vel.y > 0) || (player.side < 0 && gs.ball.vel.y < 0));
  const ballOnMyCourtSide = gs.ball.inFlight &&
    (Math.sign(gs.ball.pos.y) === player.side || Math.abs(gs.ball.pos.y) < 0.5);
  const isChasing = (ballComingToMe || ballOnMyCourtSide) && gs.ball.lastHitBy !== player.id;

  const dx   = target.x - player.pos.x;
  const dy   = target.y - player.pos.y;
  const dist = Math.sqrt(dx * dx + dy * dy) || 1e-9;

  // Penalidade direcional (lateral / trás)
  let dirMult = 1.0;
  if (dist > 0.15) {
    const fwdDot = (-dy * player.side) / dist;
    if (fwdDot < -0.25) {
      dirMult = MOVEMENT.backwardSpeedMult;
    } else if (Math.abs(fwdDot) < 0.45) {
      const lateralMods = mods ? mods.decelMult : 1.0;
      const latBase = MOVEMENT.lateralSpeedMult;
      dirMult = latBase + (1.0 - latBase) * Math.min(1, (lateralMods - 0.72) / 0.56);
    }
  }

  const physMaxSpd      = baseSpeed * (STAMINA.speedMinFactor + staminaFrac * (1 - STAMINA.speedMinFactor)) * dirMult;
  const effectiveMaxSpd = Math.min(maxSpd, physMaxSpd);
  const dSpd = Math.min(effectiveMaxSpd, (dist / 0.3) * effectiveMaxSpd);
  const dvx  = (dist > 0.02 ? (dx / dist) * dSpd : 0) - player.vel.x;
  const dvy  = (dist > 0.02 ? (dy / dist) * dSpd : 0) - player.vel.y;
  const dvMag = Math.sqrt(dvx * dvx + dvy * dvy) || 1e-9;

  const currSpd = Math.sqrt(player.vel.x ** 2 + player.vel.y ** 2);
  const dot     = player.vel.x * dvx + player.vel.y * dvy;

  const maxAccelBase = player.playerAccel || PLAYER_CFG.maxAccel;
  const maxDecelBase = player.playerDecel || PLAYER_CFG.maxDecel;
  const effAccelBase = maxAccelBase * (INERTIA.staminaAccelMin + staminaFrac * (1 - INERTIA.staminaAccelMin));

  // Footwork state
  const wasPlanted   = currSpd < 0.8;
  const footingState = player.ctx._footingState ?? 'striding';
  const footingTimer = player.ctx._footingTimer ?? 0;
  const footingMult  = footingState === 'planted' ? 1.30 : footingState === 'offBalance' ? 0.80 : 1.0;

  if (wasPlanted && !isChasing) {
    player.ctx._footingState = 'planted';
    player.ctx._footingTimer = 0.08;
  } else if (footingState === 'planted' && footingTimer <= 0) {
    player.ctx._footingState = 'striding';
    player.ctx._footingTimer = 0;
  } else if (footingState === 'offBalance') {
    player.ctx._footingTimer = Math.max(0, footingTimer - dt);
    if (player.ctx._footingTimer <= 0) player.ctx._footingState = 'striding';
  } else if (footingState === 'planted') {
    player.ctx._footingTimer = Math.max(0, footingTimer - dt);
  }

  if (player.ctx._postHitPause <= 0 && player._lastShotWhileRunning) {
    player.ctx._footingState = 'offBalance';
    player.ctx._footingTimer = 0.15;
    player._lastShotWhileRunning = false;
  }

  const effAccel = effAccelBase * footingMult;

  let accel;
  if (dist < 0.15) {
    if (currSpd < 1.2) {
      player.vel.x *= 0.30;
      player.vel.y *= 0.30;
      player.pos.x += player.vel.x * dt;
      player.pos.y += player.vel.y * dt;
      return;
    }
    accel = PLAYER_CFG.friction;
    player.ctx._reversalFrames = 0;
  } else if (dot < 0) {
    const targetDirDot = dist > 0.01
      ? (player.vel.x * (dx / dist) + player.vel.y * (dy / dist)) / (currSpd || 1e-9)
      : 0;
    if (targetDirDot < INERTIA.reversal180Dot && currSpd > 1.0) {
      const _expMult = mods ? mods.accelMult : 1.0;
      const physFrames = Math.round(INERTIA.reversal180Frames / (_expMult || 1.0));
      player.ctx._reversalFrames = physFrames;
    }
    if (player.ctx._reversalFrames > 0) {
      player.ctx._reversalFrames--;
      const r180Mult = mods ? mods.accelMult : 1.0;
      accel = effAccel * INERTIA.reversal180AccelMult * r180Mult;
    } else if (currSpd > INERTIA.overrunThreshold) {
      const orMult = mods ? mods.decelMult : 1.0;
      accel = maxDecelBase * INERTIA.overrunDecelMult * orMult;
    } else {
      accel = maxDecelBase;
    }
  } else {
    const adaptiveBrakeRadius = Math.max(INERTIA.slideBrakeRadius, currSpd * 0.22);
    const isBraking = isChasing && dist < adaptiveBrakeRadius && currSpd > INERTIA.slideBrakeSpeedMin;
    if (isBraking) {
      const brakeIntensity = 1.0 - (dist / adaptiveBrakeRadius);
      const brakeMult      = 1.0 + (INERTIA.slideBrakeDecelMult - 1.0) * brakeIntensity;
      const lateralMods    = mods ? mods.decelMult : 1.0;
      accel = maxDecelBase * brakeMult * lateralMods;
    } else {
      accel = effAccel;
    }
    player.ctx._reversalFrames = Math.max(0, (player.ctx._reversalFrames ?? 0) - 1);
  }

  const frac = Math.min(1, (accel * dt) / dvMag);
  player.vel.x += dvx * frac;
  player.vel.y += dvy * frac;
  const spd = Math.sqrt(player.vel.x ** 2 + player.vel.y ** 2);
  if (spd > effectiveMaxSpd) {
    player.vel.x = (player.vel.x / spd) * effectiveMaxSpd;
    player.vel.y = (player.vel.y / spd) * effectiveMaxSpd;
  }
  // Sanity check: se vel virou NaN/Infinity, resetar para zero
  if (!isFinite(player.vel.x)) player.vel.x = 0;
  if (!isFinite(player.vel.y)) player.vel.y = 0;
  player.pos.x += player.vel.x * dt;
  player.pos.y += player.vel.y * dt;
  if (!isFinite(player.pos.x)) player.pos.x = 0;
  if (!isFinite(player.pos.y)) player.pos.y = player.side * (HALF_L + 1.0);

  // Sprint stamina drain
  if (gs.ball.inFlight) {
    const sprintFrac = Math.max(0, (spd - STAMINA.sprintThreshold * effectiveMaxSpd) / (effectiveMaxSpd * (1 - STAMINA.sprintThreshold) || 1));
    if (sprintFrac > 0) {
      player.stamina = Math.max(0, player.stamina - STAMINA.sprintDecayRate * sprintFrac * dt);
    }
  }

  // Bounds
  player.pos.y = player.side > 0
    ? clamp(player.pos.y,  0.5, OUTER_Y)
    : clamp(player.pos.y, -OUTER_Y, -0.5);
  player.pos.x = clamp(player.pos.x, -OUTER_X, OUTER_X);
  if (Math.abs(player.pos.x) >= OUTER_X - 0.01) player.vel.x = 0;
  if (Math.abs(player.pos.y) >= OUTER_Y - 0.01) player.vel.y = 0;
}

// ─────────────────────────────────────────────────────────────────
// RETORNO DE SAQUE (copiado do movement.js — funciona bem)
// ─────────────────────────────────────────────────────────────────

function handleServeReturn(player, gs, dt) {
  const returnY = player.side * (HALF_L + 1.5);
  const outerY  = OUTER_Y;
  const outerX  = OUTER_X - 0.2;

  const ballDistFromNet = Math.abs(gs.ball.pos.y);
  const ballOnServerFar = Math.sign(gs.ball.pos.y) !== player.side
                       && ballDistFromNet > SVC_LINE;

  if (ballOnServerFar) {
    // Split-step: congela enquanto lê o saque
    player.vel.x *= 0.55;
    player.vel.y *= 0.55;
    player.pos.x += player.vel.x * dt;
    player.pos.y += player.vel.y * dt;
    return;
  }

  // Reaction window — hesitação baseada na velocidade do saque
  if ((player._readPauseFrames ?? 0) === 0 && !player._readDelayInit) {
    const sKmh    = gs.ball._serveExitKmh ?? 0;
    const retMult = player.mods?.returnMult ?? 0.82;
    const rawFrames = Math.max(0, (sKmh - 165) / 30);
    const skillMult = clamp(1.25 - retMult * 0.25, 0.80, 1.10);
    player._readPauseFrames = Math.round(rawFrames * skillMult);
    player._readDelayInit   = true;
  }

  let _reactionSpeedCap = 1.0;
  if ((player._readPauseFrames ?? 0) > 0) {
    player._readPauseFrames--;
    const framesLeft = player._readPauseFrames;
    _reactionSpeedCap = clamp(0.75 - framesLeft * 0.15, 0.45, 0.75);
    if (player._readPauseFrames === 0) player._readDelayInit = false;
  }

  // Encontrar ponto de contato ideal com o saque
  const contact = findContactPoint(gs.ball, gs.courtPhysics);
  const nearNet = player.side * 1.5;
  let target = { x: player.pos.x, y: returnY };

  if (contact) {
    const contactAbsY = Math.abs(contact.y);
    const isVeryShort = contactAbsY < HALF_L * 0.50;
    const isShort     = contactAbsY < HALF_L * 0.72;

    if (isVeryShort) {
      target = {
        x: clamp(contact.x, -outerX, outerX),
        y: player.side > 0 ? clamp(contact.y + player.side * 0.3, nearNet, returnY)
                           : clamp(contact.y + player.side * 0.3, returnY, nearNet),
      };
    } else if (isShort) {
      target = {
        x: clamp(contact.x, -outerX, outerX),
        y: player.side > 0 ? clamp(contact.y, nearNet, returnY)
                           : clamp(contact.y, returnY, nearNet),
      };
    } else {
      // Saque profundo: ir para onde a bola estará em altura boa
      target = {
        x: clamp(contact.x, -outerX, outerX),
        y: clamp(contact.y, player.side > 0 ? nearNet : -outerY,
                            player.side > 0 ? outerY  : nearNet),
      };
    }
  }

  const staminaFrac = player.stamina ?? 1.0;
  const baseSpeed   = player.playerSpeed || PLAYER_CFG.speed;
  const maxSpd      = baseSpeed * (STAMINA.speedMinFactor + staminaFrac * (1 - STAMINA.speedMinFactor)) * _reactionSpeedCap;
  const dx2  = target.x - player.pos.x;
  const dy2  = target.y - player.pos.y;
  const dist2_ = Math.sqrt(dx2*dx2 + dy2*dy2) || 1e-9;
  const dSpd2  = Math.min(maxSpd, dist2_ / 0.4 * maxSpd);
  const dvx2   = (dist2_ > 0.02 ? (dx2/dist2_)*dSpd2 : 0) - player.vel.x;
  const dvy2   = (dist2_ > 0.02 ? (dy2/dist2_)*dSpd2 : 0) - player.vel.y;
  const dvMag2 = Math.sqrt(dvx2*dvx2 + dvy2*dvy2) || 1e-9;
  const frac2  = Math.min(1, (PLAYER_CFG.maxAccel * dt) / dvMag2);
  player.vel.x += dvx2 * frac2;
  player.vel.y += dvy2 * frac2;
  const spd2 = Math.sqrt(player.vel.x**2 + player.vel.y**2);
  if (spd2 > maxSpd) {
    player.vel.x = (player.vel.x/spd2)*maxSpd;
    player.vel.y = (player.vel.y/spd2)*maxSpd;
  }
  player.pos.x += player.vel.x * dt;
  player.pos.y += player.vel.y * dt;
  player.pos.y = player.side > 0
    ? clamp(player.pos.y, 0.5, outerY)
    : clamp(player.pos.y, -outerY, -0.5);
  player.pos.x = clamp(player.pos.x, -OUTER_X, OUTER_X);
}

// ─────────────────────────────────────────────────────────────────
// VELOCIDADE POR ESTADO
// ─────────────────────────────────────────────────────────────────

function getMaxSpeed(player, state, intercept, gs) {
  const staminaFrac = player.stamina ?? 1.0;
  const baseSpeed   = player.playerSpeed || PLAYER_CFG.speed;
  const physMax     = baseSpeed * (STAMINA.speedMinFactor + staminaFrac * (1 - STAMINA.speedMinFactor));
  const courtMode   = player.ctx?.courtMode ?? 'BASE';

  if (state === 'WAIT') {
    // TRANSITION: moderada — jogador está avançando para rede, não descansando
    if (courtMode === 'TRANSITION') return physMax * 0.70;
    return physMax * MOVEMENT.urgencyJog;
  }

  if (state === 'RECOVER') {
    // NET/TRANSITION recover: mantém velocidade moderada para cobrir voleio
    if (courtMode === 'NET' || courtMode === 'TRANSITION') return physMax * 0.75;
    return physMax * MOVEMENT.urgencyJog;
  }

  // MOVE: urgência baseada no tempo disponível vs distância
  if (!intercept?.t) return physMax * MOVEMENT.urgencySprint;

  const dx   = (intercept.x ?? player.pos.x) - player.pos.x;
  const dy   = (intercept.y ?? player.pos.y) - player.pos.y;
  const dist = Math.sqrt(dx*dx + dy*dy);
  const margin = intercept.t - dist / (physMax || 0.1);

  if (margin > 0.4)  return physMax * MOVEMENT.urgencyJog;
  if (margin > 0.10) return physMax * MOVEMENT.urgencyRun;
  return physMax * MOVEMENT.urgencySprint;
}


// ─────────────────────────────────────────────────────────────────
// MOVIMENTO DE ESPERA — eixos X e Y independentes
// ─────────────────────────────────────────────────────────────────
// Problema do arco: applyMovementPhysics move X+Y juntos em diagonal,
// criando movimento circular. Em tênis real:
//   Y (profundidade) → move rápido para a baseline correta
//   X (lateral)      → drift suave independente (shuffle)
// Os dois eixos não se acoplam — jogador não faz arco.

function applyWaitMovement(player, target, dt) {
  if (!dt || dt <= 0) return;  // guard: dt=0 causaria divisão por zero → NaN/Infinity

  const staminaFrac = player.stamina ?? 1.0;
  const baseSpeed   = player.playerSpeed || PLAYER_CFG.speed;
  const physMax     = baseSpeed * (STAMINA.speedMinFactor + staminaFrac * (1 - STAMINA.speedMinFactor));

  // ── Y: mover para a profundidade alvo (baseline) ─────────────────
  const dyFull = target.y - player.pos.y;
  const spdY   = physMax * MOVEMENT.urgencyJog * MOVEMENT.backwardSpeedMult;
  const stepY  = Math.min(Math.abs(dyFull), spdY * dt);
  player.vel.y = Math.sign(dyFull) * (spdY);  // velocidade, não step/dt
  player.pos.y = clamp(player.pos.y + Math.sign(dyFull) * stepY,
                       -(HALF_L + THRESHOLDS.outerPlayerY),
                        (HALF_L + THRESHOLDS.outerPlayerY));

  // ── X: drift lateral suave (shuffle) ─────────────────────────────
  const dxFull = target.x - player.pos.x;
  const spdX   = physMax * 0.35;
  const stepX  = Math.min(Math.abs(dxFull), spdX * dt);
  player.vel.x = Math.sign(dxFull) * spdX;  // velocidade, não step/dt
  player.pos.x = clamp(player.pos.x + Math.sign(dxFull) * stepX,
                       -(HALF_W + THRESHOLDS.outerPlayerX),
                        (HALF_W + THRESHOLDS.outerPlayerX));
}

// ─────────────────────────────────────────────────────────────────
// LOB RECEBIDO NA REDE — recua imediatamente
// ─────────────────────────────────────────────────────────────────

function handleLobAtNet(player, gs, dt) {
  if (!shouldRetreatFromLob(player, gs)) return false;

  // Lob real e profundo → recua para baseline
  const retreatY = player.side * (HALF_L + 0.5);
  const maxSpd   = (player.playerSpeed || PLAYER_CFG.speed) * MOVEMENT.urgencySprint;
  applyMovementPhysics(player, { x: player.pos.x, y: retreatY }, maxSpd, dt, gs);
  player.atNet = false;
  if (player.ctx) {
    player.ctx.courtMode = 'BASE';
    player.ctx.transitionCooldown = 3;
  }
  return true;
}

// ─────────────────────────────────────────────────────────────────
// EXPORTAÇÕES PÚBLICAS
// ─────────────────────────────────────────────────────────────────

/**
 * getStyleBaselineY — compatibilidade com game.js e outros módulos.
 * Retorna a posição Y de espera do jogador (em coordenadas signed).
 */
export function getStyleBaselineY(player) {
  const prefs = player.prefs;
  const waitBehind = prefs ? ({
    EXPLOSIVE:    0.4,
    EARLY_ATTACK: 0.7,
    BALANCED:     1.0,
    MEASURED:     1.5,
    PATIENT:      2.2,
  }[prefs.rallyCadence] ?? 1.0) : 1.0;

  const netOffset = prefs ? ({
    HUNTER:      -0.1,
    PROACTIVE:    0.0,
    OPPORTUNIST:  0.0,
    RELUCTANT:    0.2,
    AVOIDS:       0.4,
  }[prefs.netGame] ?? 0) : 0;

  const mom    = player.ctx?.momentum ?? 0.5;
  const momAdj = (0.5 - mom) * 0.8;
  const behind = clamp(waitBehind + netOffset + momAdj, 0.1, 3.0);
  return player.side * (HALF_L + behind);
}

/**
 * updatePlayerMovement — função principal chamada por game.js a cada frame.
 *
 * game.js chama: updatePlayerMovement(p, gs, dt)
 */
export function updatePlayerMovement(player, gs, dt) {
  if (!dt || dt <= 0 || !isFinite(dt)) return;  // guard: dt inválido → skip frame
  const ball = gs.ball;

  // ── Reset X smooth quando começa nova perseguição ────────────────
  if (ball.lastHitBy === player.id) {
    player._smoothInterceptX = undefined;
  }

  // ── _postHitPause: freeze de fadiga pós-golpe ────────────────────
  if ((player.ctx._postHitPause ?? 0) > 0) {
    player.ctx._postHitPause -= dt;
    player.vel.x *= 0.75;
    player.vel.y *= 0.75;
    player.pos.x += player.vel.x * dt;
    player.pos.y += player.vel.y * dt;
    return;
  }

  // ── Lob recebido na rede: recua imediatamente ────────────────────
  if (handleLobAtNet(player, gs, dt)) return;

  // ── Retorno de saque: lógica especial ───────────────────────────
  const isServeFlight = gs.isFirstBounce && player.id === gs.receiver && ball.inFlight;
  if (isServeFlight) {
    handleServeReturn(player, gs, dt);
    return;
  }

  // ── FSM ──────────────────────────────────────────────────────────
  const state = getState(player, gs);
  player._movState = state;  // debug

  // ── Calcular target bruto ────────────────────────────────────────
  let target;
  let intercept = null;

  if (state === 'WAIT' || state === 'RECOVER') {
    target = getBasePos(player, gs);
    // Eixos separados: Y rápido (profundidade), X lento (shuffle lateral)
    // Evita arco circular que aparece quando X e Y se movem juntos em diagonal
    applyWaitMovement(player, target, dt);
    // Ainda precisa atualizar basePos e _volleyType abaixo — não retorna aqui

  } else if (state === 'MOVE') {
    intercept = getInterceptPoint(player, gs);

    // X smoothing: o jogador não muda de lane bruscamente.
    // Blend lento do X alvo para evitar zig-zag e arcos.
    // Em tênis: você escolhe o corredor e vai reto, não zigue-zague.
    const rawX = intercept?.x ?? player.pos.x;
    const prevX = player._smoothInterceptX ?? rawX;
    const smoothX = prevX + (rawX - prevX) * 0.15;  // blend 15% por frame
    player._smoothInterceptX = smoothX;
    if (intercept) intercept = { ...intercept, x: smoothX };

    target    = intercept;

    // Atualizar _arrivalMargin para o ContactModel
    if (intercept?.t != null) {
      const staminaFrac = player.stamina ?? 1.0;
      const baseSpeed   = player.playerSpeed || PLAYER_CFG.speed;
      const effSpeed    = baseSpeed * (STAMINA.speedMinFactor + staminaFrac * (1 - STAMINA.speedMinFactor));
      const dx = intercept.x - player.pos.x;
      const dy = intercept.y - player.pos.y;
      const d  = Math.sqrt(dx*dx + dy*dy);
      player._arrivalMargin = intercept.t - d / (effSpeed || 0.1);
      player._predCrossX    = intercept.x;
    } else {
      player._arrivalMargin = 0;
      player._predCrossX    = player.pos.x;
    }

  } else {
    // HIT: para completamente — tryHit() em game.js vai executar o golpe
    player.vel.x *= 0.20;
    player.vel.y *= 0.20;
    player.pos.x += player.vel.x * dt;
    player.pos.y += player.vel.y * dt;

    // Manter _arrivalMargin positivo enquanto em HIT (ContactModel usa)
    player._arrivalMargin = Math.max(player._arrivalMargin ?? 0, 0.05);
    player._predCrossX    = ball.pos.x;
    return;
  }

  // ── Atualizar basePos (debug + leitura externa) ──────────────────
  const courtMode_ = player.ctx?.courtMode ?? 'BASE';
  if (player.atNet || courtMode_ === 'NET') {
    const np = computeNetPos(player, gs);
    player.basePos.x = np.x;
    player.basePos.y = np.y;
  } else if (courtMode_ === 'TRANSITION') {
    const tp = computeTransitionPos(player, gs);
    player.basePos.x = tp.x;
    player.basePos.y = tp.y;
  } else {
    player.basePos.y = getStyleBaselineY(player);
    const opp_ = gs.players?.find(p => p.id !== player.id);
    player.basePos.x = clamp((opp_?.ctx?._lastShotX ?? 0) * 0.20, -1.5, 1.5);
  }

  // ── _volleyType: inicializar para compatibilidade com game.js ────
  // game.js sobrescreve isso dentro de tryHit quando a bola é alcançada
  if (state !== 'HIT') {
    player._volleyType        = player.atNet ? 'intentional' : null;
    player._halfVolleyContext = false;
  }

  // ── Transição TRANSITION → NET ───────────────────────────────────
  // game.js controla player.atNet via tryHit/approach logic.
  // movement2 só reflete — não promove courtMode autonomamente.
  // (removido: auto-promoção que causava net rush involuntário)

  // ── Velocidade e movimento ───────────────────────────────────────
  // WAIT/RECOVER: já moveu com applyWaitMovement (eixos separados)
  // MOVE: usa applyMovementPhysics normal (precisa de vetor urgente ao intercept)
  if (state !== 'WAIT' && state !== 'RECOVER') {
    const maxSpd = getMaxSpeed(player, state, intercept, gs);
    applyMovementPhysics(player, target, maxSpd, dt, gs);
  }
}
