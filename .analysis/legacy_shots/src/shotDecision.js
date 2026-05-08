// shotDecision.js — Shot System v4 | Fase 3
// ═══════════════════════════════════════════════════════════════════
// O coração do sistema. Implementa as 6 camadas de decisão de golpe.
//
// FILOSOFIA:
//   A ficha define o envelope. As prefs definem o gosto. A situação decide.
//
// CAMADAS:
//   0–1  prepQuality     — já vem de contactSpace + swingPrepEngine (intocáveis)
//   2    feasibility     — feasibilityMatrix + gate de qualidade por golpe
//   3    situacional     — o que o contexto do ponto sugere (quem está onde, rally, placar)
//   4    perfil          — prefs do jogador modificam os scores
//   5    pick            — softmax probabilístico com temperatura (regularidade + momentum)
//   6    execução        — fatorAttr × pressão → qualidade real (forma do dia em prepQuality)
//
// Exporta:
//   decideShotAndBuild(player, opponent, prepQuality, opts) → { shot, aiTrace }
// ═══════════════════════════════════════════════════════════════════

import { SHOT_PHYSICS, SPIN_MAP }                    from './shotPhysics.js';
import { applySignatureLayer, applySignaturePhysics, SIGNATURE_SHOTS } from './SignatureShots.js';
import { clamp, rand }                               from './math.js';
import { generatePrefs }                             from './playerPrefs.js';
import { getWingPotencia, getWingControle }          from './attributes.js';

// ── Wing helpers locais ───────────────────────────────────────────
// isBackhand é passado via opts.isBackhand (computado em game.js a partir
// da posição relativa bola-jogador). Default false = forehand se não informado.
function wingPotencia(attrs, isBackhand) {
  return getWingPotencia(attrs, isBackhand ?? false);
}
function wingControle(attrs, isBackhand) {
  return getWingControle(attrs, isBackhand ?? false);
}

// ─────────────────────────────────────────────────────────────────
// CONSTANTES DE TUNING
// ─────────────────────────────────────────────────────────────────

// Thresholds mínimos de prepQuality para cada golpe existir no pool
const QUALITY_GATE = {
  SLICE:       0.10,
  TOPSPIN:     0.08,  // topspin é o golpe padrão/defensivo — limiar abaixo do SLICE
                      // Fix: era 0.12 → Q:10% passava no SLICE mas falhava no TOPSPIN,
                      // deixando só SLICE como candidato em retornos difíceis (pontos 17-20).
  DROP:        0.26,  // drop volta a ser opção técnica em bola preparada, sem aparecer no caos
  LOB:         0.16,
  ACCEL:       0.45,  // requer prep moderada real — elimina candidatos fantasma em DIFFICULT
  SHORT_ACCEL: 0.50,  // requer boa prep — previne escolha acidental como último recurso
  BANANA:      0.50,
};

// riskBase de cada golpe
export const RISK_BASE = {
  TOPSPIN:     0.18,
  SLICE:       0.18,
  DROP:        0.26,
  LOB:         0.09,
  ACCEL:       0.26,
  SHORT_ACCEL: 0.24,
  BANANA:      0.30,
};

const HALF_L = 11.885;
const HALF_S = 4.115;

function clampUnit(v) {
  return clamp(v, 0, 1);
}

function computeSpatialContext(player, opponent) {
  const side = player.side ?? 1;
  const playerX = player.pos?.x ?? 0;
  const playerY = player.pos?.y ?? (side * HALF_L);
  const oppX = opponent?.pos?.x ?? 0;
  const oppY = opponent?.pos?.y ?? (-side * HALF_L);
  const oppAtNet = opponent?.atNet ?? (Math.abs(oppY) < HALF_L * 0.35);
  const oppDepth = clampUnit(Math.abs(oppY) / HALF_L);
  const lateralOpenDir = Math.abs(oppX) > 0.30 ? -Math.sign(oppX) : (playerX <= 0 ? 1 : -1);
  const jamDir = Math.abs(oppX) > 0.25 ? Math.sign(oppX) : -lateralOpenDir;
  const oppMovingX = opponent?.vel?.x ?? 0;
  const oppRecovering = Math.abs(oppMovingX) > 0.45;
  const bodyX = clamp(oppX * 0.82, -HALF_S + 0.4, HALF_S - 0.4);
  const centreBias = clamp(-playerX * 0.18, -0.8, 0.8);
  const crossDir = lateralOpenDir;
  const dtlDir = -crossDir;
  return {
    side,
    playerX,
    playerY,
    oppX,
    oppY,
    oppAtNet,
    oppDepth,
    lateralOpenDir,
    jamDir,
    oppRecovering,
    bodyX,
    centreBias,
    crossDir,
    dtlDir,
  };
}

function chooseShotMotive(player, opponent, shotType, prefs, prepQuality, shotIntensity, executionQuality, finalScores, opts = {}) {
  const spatial = computeSpatialContext(player, opponent);
  const ballTier = player?.ctx?._lastBallTier ?? 'NEUTRAL';
  const rally = opts.gsRally ?? 0;
  const currentIntent = player?.ctx?.currentIntent ?? 'BUILD';
  const weakReturnBoost = clamp(player?.ctx?._weakReturnBoost ?? 0, 0, 1);
  const netIntent = clamp(player?.ctx?.netIntent ?? 0, 0, 1);
  const openWindow = clampUnit(Math.abs(spatial.oppX) / 2.3);
  const pressureWindow = currentIntent === 'FINISH' || currentIntent === 'PRESSURE';
  const sequencePlan =
    (player?.ctx?._servePatternPlan?.active && rally <= (player.ctx._servePatternPlan.expiresRally ?? 1))
      ? player.ctx._servePatternPlan
      : (player?.ctx?._returnRecoveryPlan?.active && rally <= (player.ctx._returnRecoveryPlan.expiresRally ?? 2))
        ? player.ctx._returnRecoveryPlan
        : null;

  let motive = 'NEUTRALIZE';

  if (spatial.oppAtNet) {
    if (shotType === 'LOB') motive = executionQuality < 0.52 ? 'LOB_ESCAPE' : 'LOB_PRESSURE';
    else if (shotType === 'SHORT_ACCEL' || shotType === 'BANANA') motive = openWindow > 0.30 ? 'PASS_CC' : 'PASS_DTL';
    else if (shotType === 'ACCEL' || shotType === 'TOPSPIN') motive = openWindow > 0.24 ? 'PASS_DTL' : 'JAM_BODY';
    else motive = executionQuality < 0.48 ? 'LOB_ESCAPE' : 'JAM_BODY';
    return { motive, spatial };
  }

  switch (shotType) {
    case 'DROP':
      motive = 'DRAG_FORWARD';
      break;
    case 'LOB':
      motive = executionQuality < 0.55 ? 'LOB_ESCAPE' : 'LOB_PRESSURE';
      break;
    case 'SLICE':
      if (netIntent > 0.35 || prefs?.netGame === 'HUNTER' || prefs?.netGame === 'PROACTIVE') {
        motive = openWindow > 0.28 ? 'APPROACH_CC' : 'APPROACH_DTL';
      } else if (ballTier === 'DIFFICULT') {
        motive = 'NEUTRALIZE';
      } else if (rally >= 4 && spatial.oppDepth > 0.76) {
        motive = 'DRAG_FORWARD';
      } else {
        motive = 'BUILD_SPACE';
      }
      break;
    case 'TOPSPIN':
      if (ballTier === 'DIFFICULT') motive = 'NEUTRALIZE';
      else if (pressureWindow && openWindow > 0.28) motive = 'PRESS_OPEN';
      else if (weakReturnBoost > 0.20) motive = 'PRESS_OPEN';
      else motive = (rally >= 3 || spatial.oppRecovering) ? 'BUILD_SPACE' : 'BUILD_HEAVY';
      break;
    case 'ACCEL':
      if (netIntent > 0.34) motive = openWindow > 0.25 ? 'APPROACH_DTL' : 'APPROACH_CC';
      else if (ballTier === 'OPPORTUNITY' || pressureWindow || weakReturnBoost > 0.18) motive = 'FINISH_OPEN';
      else if (openWindow > 0.22) motive = 'PRESS_OPEN';
      else motive = 'JAM_BODY';
      break;
    case 'SHORT_ACCEL':
      if (netIntent > 0.30) motive = 'APPROACH_CC';
      else if (ballTier === 'OPPORTUNITY' || openWindow > 0.22) motive = 'PRESS_OPEN';
      else motive = 'DRAG_FORWARD';
      break;
    case 'BANANA':
      motive = ballTier === 'OPPORTUNITY' || pressureWindow ? 'FINISH_OPEN' : 'PRESS_OPEN';
      break;
    default:
      motive = 'NEUTRALIZE';
      break;
  }

  if (sequencePlan) {
    const forceShot = sequencePlan.shotBias === shotType;
    const strongPlan = (sequencePlan.planStrength ?? 0) >= 0.60;
    if (forceShot || strongPlan || ballTier !== 'DIFFICULT') {
      motive = sequencePlan.motive ?? motive;
    }
  }

  return { motive, spatial, sequencePlan };
}

// ─────────────────────────────────────────────────────────────────
// Forma do dia consolidada em _formMods.qualityMod (game.js init).
// initFormaDoDia mantido como stub vazio para compatibilidade com imports legados.
export function initFormaDoDia() {}

// ─────────────────────────────────────────────────────────────────
// LAYER 3: Scores situacionais
// ─────────────────────────────────────────────────────────────────
// BALL TIER — classificação baseada exclusivamente na física
// ─────────────────────────────────────────────────────────────────
//
// OPPORTUNITY  — bola fácil, posição boa: hora de atacar
// NEUTRAL      — situação normal de rally: topspin é o golpe âncora
// DIFFICULT    — bola difícil, pressionado: sobreviver com qualidade
//
// Substitui underPressure como driver do pool de golpes.
// rallyPressure (stress acumulado) vai apenas para a temperatura do softmax.

function computeBallTier(prepQuality, heightZone, diff) {
  // ANKLE com qualidade excepcional (>= 0.78) também é OPPORTUNITY — ATP moderno ataca de bolas baixas
  const opportunityZones = prepQuality >= 0.78
    ? ['ANKLE', 'HIP', 'SWEET', 'SHOULDER']
    : ['HIP', 'SWEET', 'SHOULDER'];
  if (prepQuality >= 0.62 && opportunityZones.includes(heightZone) && diff < 0.50)
    return 'OPPORTUNITY';
  if (prepQuality < 0.28 || diff > 0.72 || heightZone === 'DIRT')
    return 'DIFFICULT';
  return 'NEUTRAL';
}

/**
 * Computa o score base de cada golpe para a situação atual.
 * Retorna um objeto { SHOT_TYPE: score [0..1] }.
 */
function computeSituationalScores(player, opponent, prepQuality, attrs, opts, prefs) {
  const rally       = opts.gsRally ?? 0;
  const oppY        = Math.abs(opponent?.pos?.y ?? 8);
  const oppX        = opponent?.pos?.x ?? 0;
  const playerY     = Math.abs(player.pos?.y ?? 9);
  const oppDepth    = oppY / HALF_L;
  const playerLat   = Math.abs(player.pos?.x ?? 0) / HALF_S;
  const oppAtNet    = opponent?.atNet ?? (oppDepth < 0.35);
  const oppVeryDeep = oppDepth > 0.78;
  const playerFwd   = playerY < HALF_L + 1.5;
  const playerDropZone = playerY < HALF_L - 2.4;
  const playerPrimeDropZone = playerY < HALF_L - 3.6;
  const courtOpen   = Math.abs(oppX) > 1.5 || playerLat < 0.3;
  const isReturn    = rally === 0;

  // Wing context — passado via opts.isBackhand pelo game.js
  const isBackhand = opts.isBackhand ?? false;

  const returnHint = isReturn ? (player.ctx?._returnHint ?? 'neutralize') : null;
  const returnPlan = isReturn ? (player.ctx?._returnPlan ?? null) : null;
  const servePatternPlan = !isReturn && player?.ctx?._servePatternPlan?.active && rally <= (player.ctx._servePatternPlan.expiresRally ?? 1)
    ? player.ctx._servePatternPlan
    : null;
  const returnRecoveryPlan = !isReturn && player?.ctx?._returnRecoveryPlan?.active && rally <= (player.ctx._returnRecoveryPlan.expiresRally ?? 2)
    ? player.ctx._returnRecoveryPlan
    : null;
  const sequencePlan = servePatternPlan ?? returnRecoveryPlan;

  const heightZone = opts.contactSpace?.heightZone ?? 'HIP';
  const diff       = opts.contactSpace?.diff        ?? 0.4;
  const ballTier   = computeBallTier(prepQuality, heightZone, diff);
  const defQ       = (attrs.defesa ?? 60) / 100;
  const vtBase     = player?.mods?.visaoFactor ?? ((attrs.visaoTatica ?? attrs.agressividade ?? 60) / 100);
  const adaptBase  = player?.mods?.adaptacaoFactor ?? ((attrs.adaptacao ?? 60) / 100);
  const adaptBoost = clamp(player?._adaptacaoBoost ?? 0, -0.125, 0.125);
  const vtQ        = clamp(vtBase + adaptBoost * 0.55, 0.25, 1.18);
  const adaptQ     = clamp(adaptBase + adaptBoost, 0.35, 1.18);
  const underSiege = ballTier === 'DIFFICULT' || prepQuality < 0.33 || diff > 0.72;

  const heightMult = {
    TOPSPIN: { DIRT:0.55, ANKLE:0.90, HIP:1.20, SWEET:1.15, SHOULDER:1.00, HIGH:0.90, OVERHEAD:0.60 },
    SLICE:   { DIRT:1.10, ANKLE:1.00, HIP:0.65, SWEET:0.40, SHOULDER:0.55, HIGH:0.70, OVERHEAD:0.50 },
    ACCEL:   { DIRT:0.05, ANKLE:0.70, HIP:1.10, SWEET:1.30, SHOULDER:1.20, HIGH:0.90, OVERHEAD:0.10 },
  };
  const hm = (type) => heightMult[type]?.[heightZone] ?? 1.0;

  const tierMod = {
    OPPORTUNITY: { topspin: 0.90, accel: 1.50, slice: 0.36, drop: 1.55, banana: 1.18 },
    NEUTRAL:     { topspin: 0.96, accel: 0.85, slice: 0.58, drop: 1.10, banana: 0.88 },
    DIFFICULT:   { topspin: 0.76, accel: 0.45, slice: 0.68, drop: 0.28, banana: 0.18 },
  }[ballTier];

  // Attrs de golpe: wing-aware para potência e controle
  const potQ = wingPotencia(attrs, isBackhand) / 100;
  const ctQ  = wingControle(attrs, isBackhand) / 100;

  // ── TOPSPIN ───────────────────────────────────────────────────────
  let scoreTOPSPIN = 0;
  if (prepQuality >= QUALITY_GATE.TOPSPIN) {
    const tsQ = (attrs.topspin ?? 60) / 100;
    scoreTOPSPIN = 0.18 + prepQuality * (0.45 + tsQ * 0.35);
    if (oppDepth > 0.55) scoreTOPSPIN += 0.08;
    if (courtOpen)       scoreTOPSPIN += 0.06;
    if (underSiege)      scoreTOPSPIN += defQ * 0.08 + adaptQ * 0.03;
    if ((attrs.topspin ?? 60) < 50) scoreTOPSPIN *= 0.70;
    scoreTOPSPIN *= hm('TOPSPIN') * tierMod.topspin;
    if (rally >= 7) {
      const fatigue = Math.max(0.85, 1 - (rally - 6) * 0.03);
      scoreTOPSPIN *= fatigue;
    }
  }

  // ── SLICE ─────────────────────────────────────────────────────────
  let scoreSLICE = 0;
  if (prepQuality >= QUALITY_GATE.SLICE) {
    const slQ = (attrs.slice ?? 60) / 100;
    scoreSLICE = 0.10 + prepQuality * 0.12 + slQ * 0.08;
    if (!oppAtNet && oppVeryDeep && playerFwd) scoreSLICE += 0.06;
    if (rally >= 4 && ballTier === 'NEUTRAL')  scoreSLICE += 0.04;
    if (underSiege)                            scoreSLICE += defQ * 0.12 + adaptQ * 0.04;
    if ((attrs.slice ?? 60) < 45) scoreSLICE *= 0.40;
    scoreSLICE *= hm('SLICE') * tierMod.slice;
  }

  // ── DROP ──────────────────────────────────────────────────────────
  // DROP precisa ser raro, mas nunca suicida:
  // aparece com bola preparada, adversário fundo e jogador com tato real.
  let scoreDROP = 0;
  if (prepQuality >= Math.max(QUALITY_GATE.DROP, playerPrimeDropZone ? 0.26 : 0.30) && !oppAtNet) {
    if (
      oppDepth > 0.68 &&
      rally >= 1 &&
      !isReturn &&
      ballTier !== 'DIFFICULT' &&
      !underSiege &&
      playerDropZone
    ) {
      const slQ = (attrs.slice ?? 60) / 100;
      const lrQ = (attrs.leitura ?? 60) / 100;
      const touchQ = ctQ * 0.34 + slQ * 0.26 + lrQ * 0.18 + vtQ * 0.14 + adaptQ * 0.08;
      scoreDROP = 0.16 + touchQ * 0.48 + prepQuality * 0.16;
      if (oppDepth > 0.82) scoreDROP += 0.08;
      if (oppDepth > 0.90 && playerPrimeDropZone) scoreDROP += 0.08;
      if (rally >= 4) scoreDROP += 0.04;
      if (rally >= 7) scoreDROP += 0.03;
      if (player?.ctx?.currentIntent === 'PRESSURE' || player?.ctx?.currentIntent === 'FINISH') scoreDROP += 0.04;
      if (slQ < 0.55 || ctQ < 0.58) scoreDROP *= 0.72;
      else if (slQ < 0.65 || ctQ < 0.66) scoreDROP *= 0.86;
      if (!playerPrimeDropZone) scoreDROP *= 0.84;
    }
    scoreDROP *= tierMod.drop;
  }

  // ── LOB ───────────────────────────────────────────────────────────
  let scoreLOB = 0;
  if (prepQuality >= QUALITY_GATE.LOB && oppAtNet) {
    const lrQ  = (attrs.leitura ?? 60) / 100;
    const lobBase = ballTier === 'DIFFICULT' ? 0.50 : 0.32;
    const defBase = Math.max(lobBase * (1 - prepQuality * 0.4), 0.28);
    const ctQForLob = ballTier === 'DIFFICULT'
      ? defQ * 0.70 + ctQ * 0.30
      : ctQ;
    const aggComp = prepQuality >= 0.50 ? prepQuality * 0.45 * ctQForLob * (1 + lrQ * 0.20) : 0;
    scoreLOB = Math.max(defBase, aggComp);
    if (ballTier === 'DIFFICULT') scoreLOB = Math.min(scoreLOB, 0.60);
  }

  // ── ACCEL ─────────────────────────────────────────────────────────
  // visaoTatica: sabe quando e como atacar (substituiu agressividade)
  let scoreACCEL = 0;
  if (prepQuality >= QUALITY_GATE.ACCEL) {
    if (oppAtNet) {
      const passLane = Math.abs(oppX) > 0.85 ? 0.12 : Math.abs(oppX) > 0.35 ? 0.07 : 0.02;
      const jamBonus = Math.abs(oppX) < 0.55 ? 0.08 : 0.03;
      scoreACCEL = prepQuality * 0.66 * (vtQ * 0.42 + potQ * 0.34 + ctQ * 0.24) + passLane + jamBonus;
    } else {
      const situBonus = (courtOpen ? 0.15 : 0) + (oppVeryDeep ? 0.10 : 0);
      const rallyAttackBonus = (rally >= 4 && prepQuality >= 0.55 && (courtOpen || oppVeryDeep)) ? 0.10 : 0;
      scoreACCEL = prepQuality * 0.75 * (vtQ * 0.45 + potQ * 0.35 + ctQ * 0.20) + situBonus + rallyAttackBonus;
    }
    const serveAdvBoost = player.ctx?._weakReturnBoost ?? 0;
    // earlyPenalty varia com o riskProfile: apostadores atacam cedo por natureza
    const _epACCEL = { ALLOUT: 0.90, GAMBLER: 0.76, CALCULATED: 0.68, SAFE: 0.58, SAFETY_FIRST: 0.52 }
      [prefs?.riskProfile ?? 'CALCULATED'] ?? 0.68;
    const _ep2ACCEL = { ALLOUT: 0.90, GAMBLER: 0.83, CALCULATED: 0.75, SAFE: 0.68, SAFETY_FIRST: 0.60 }
      [prefs?.riskProfile ?? 'CALCULATED'] ?? 0.75;
    if (rally <= 1) {
      const earlyPenalty = clamp(_epACCEL + serveAdvBoost * 0.58, _epACCEL, 1.00);
      scoreACCEL *= earlyPenalty;
    } else if (rally <= 2) {
      scoreACCEL *= _ep2ACCEL;
    }
    scoreACCEL *= hm('ACCEL') * (oppAtNet ? 1.0 : tierMod.accel);
  }

  // ── SHORT_ACCEL ───────────────────────────────────────────────────
  let scoreSHORT_ACCEL = 0;
  if (prepQuality >= QUALITY_GATE.SHORT_ACCEL) {
    const lrQ = (attrs.leitura ?? 60) / 100;
    const posBonus = playerLat < 0.3 ? 0.12 : playerLat < 0.5 ? 0.06 : 0;
    if (oppAtNet) {
      const passAngleBonus = Math.abs(oppX) > 0.65 ? 0.14 : 0.08;
      scoreSHORT_ACCEL = prepQuality * 0.56 * (ctQ * 0.42 + lrQ * 0.34 + potQ * 0.24) + posBonus + passAngleBonus;
    } else {
      scoreSHORT_ACCEL = prepQuality * 0.65 * (ctQ * 0.40 + lrQ * 0.30 + potQ * 0.30) + posBonus;
    }
    const serveAdvBoost = player.ctx?._weakReturnBoost ?? 0;
    // earlyPenalty SHORT_ACCEL — apostadores buscam o ângulo cedo também
    const _epSA = { ALLOUT: 0.85, GAMBLER: 0.70, CALCULATED: 0.60, SAFE: 0.52, SAFETY_FIRST: 0.45 }
      [prefs?.riskProfile ?? 'CALCULATED'] ?? 0.60;
    const _ep2SA = { ALLOUT: 0.88, GAMBLER: 0.80, CALCULATED: 0.70, SAFE: 0.62, SAFETY_FIRST: 0.54 }
      [prefs?.riskProfile ?? 'CALCULATED'] ?? 0.70;
    if (rally <= 1) {
      const earlyPenalty = clamp(_epSA + serveAdvBoost * 0.69, _epSA, 1.00);
      scoreSHORT_ACCEL *= earlyPenalty;
    } else if (rally <= 2) {
      scoreSHORT_ACCEL *= _ep2SA;
    }
    scoreSHORT_ACCEL *= oppAtNet ? 1.0 : tierMod.accel;
  }

  // ── BANANA ────────────────────────────────────────────────────────
  // Quality gate sensível ao riskProfile: apostadores arriscam banana com
  // preparação menor — faz parte do gameplan deles.
  const _rp = prefs?.riskProfile ?? 'CALCULATED';
  const _bananaGate = _rp === 'ALLOUT'  ? 0.36
                    : _rp === 'GAMBLER' ? 0.42
                    : QUALITY_GATE.BANANA;  // 0.50 para o resto
  let scoreBANANA = 0;
  if (prepQuality >= _bananaGate && ballTier !== 'DIFFICULT' && !isReturn) {
    const tsQ = (attrs.topspin ?? 60) / 100;
    const posBonus = playerLat < 0.35 ? 0.06 : playerLat < 0.55 ? 0.02 : -0.05;
    const oppBonus = oppAtNet
      ? (Math.abs(oppX) > 0.55 ? 0.09 : 0.03)
      : (oppDepth > 0.42 && oppDepth < 0.80) ? 0.06 : 0;
    scoreBANANA = prepQuality * 0.26 * (tsQ * 0.55 + potQ * 0.45) + posBonus + oppBonus;
    if (rally > 3) scoreBANANA += 0.03;
    // Penalidade de rally curto: apostadores atacam com banana mais cedo
    if (rally <= 1) {
      const _earlyBananaMult = _rp === 'ALLOUT'  ? 0.60
                             : _rp === 'GAMBLER' ? 0.48
                             : 0.25;
      scoreBANANA *= _earlyBananaMult;
    }
    if ((attrs.topspin ?? 60) < 55) scoreBANANA *= 0.40;
    scoreBANANA *= tierMod.banana;
  }

  const scores = {
    TOPSPIN:     scoreTOPSPIN,
    SLICE:       scoreSLICE,
    DROP:        scoreDROP,
    LOB:         scoreLOB,
    ACCEL:       scoreACCEL,
    SHORT_ACCEL: scoreSHORT_ACCEL,
    BANANA:      scoreBANANA,
  };

  if (returnHint === 'defend') {
    scores.ACCEL       *= 0.08;
    scores.SHORT_ACCEL *= 0.06;
    scores.BANANA      *= 0.05;
    scores.TOPSPIN     *= 0.65;
    scores.SLICE        = Math.min(0.30, (scores.SLICE ?? 0) * 1.20 + 0.05);
  } else if (returnHint === 'attack') {
    scores.ACCEL       *= 1.45;
    scores.SHORT_ACCEL *= 1.30;
    scores.TOPSPIN     *= 1.20;
    scores.SLICE       *= 0.70;
  }

  if (returnPlan) {
    switch (returnPlan.family) {
      case 'BLOCK_RESET':
        scores.ACCEL       *= 0.20;
        scores.SHORT_ACCEL *= 0.16;
        scores.BANANA      *= 0.10;
        scores.TOPSPIN     *= 0.88;
        scores.SLICE        = Math.min(0.34, (scores.SLICE ?? 0) * 1.28 + 0.04);
        break;
      case 'CHIP_RESET':
        scores.ACCEL       *= 0.24;
        scores.SHORT_ACCEL *= 0.20;
        scores.BANANA      *= 0.10;
        scores.TOPSPIN     *= 0.72;
        scores.SLICE        = Math.min(0.42, (scores.SLICE ?? 0) * 1.55 + 0.08);
        break;
      case 'CHIP_STRETCH':
        scores.ACCEL       *= 0.12;
        scores.SHORT_ACCEL *= 0.10;
        scores.BANANA      *= 0.05;
        scores.TOPSPIN     *= 0.62;
        scores.SLICE        = Math.min(0.48, (scores.SLICE ?? 0) * 1.75 + 0.10);
        break;
      case 'BLOCK_STRETCH':
      case 'RESET_BODY':
        scores.ACCEL       *= 0.16;
        scores.SHORT_ACCEL *= 0.12;
        scores.BANANA      *= 0.08;
        scores.TOPSPIN     *= 0.78;
        scores.SLICE        = Math.min(0.30, (scores.SLICE ?? 0) * 1.15 + 0.03);
        break;
      case 'BLOCK_BODY':
        scores.ACCEL       *= 0.28;
        scores.SHORT_ACCEL *= 0.22;
        scores.TOPSPIN     *= 0.92;
        scores.SLICE       *= 1.08;
        break;
      case 'COUNTER_UP':
        scores.ACCEL       *= 1.18;
        scores.SHORT_ACCEL *= 1.10;
        scores.TOPSPIN     *= 1.24;
        scores.SLICE       *= 0.76;
        break;
      case 'DRIVE_ATTACK':
        scores.ACCEL       *= 1.58;
        scores.SHORT_ACCEL *= 1.34;
        scores.TOPSPIN     *= 1.28;
        scores.SLICE       *= 0.62;
        break;
      case 'DRIVE_NEUTRAL':
        scores.ACCEL       *= 1.22;
        scores.SHORT_ACCEL *= 1.12;
        scores.TOPSPIN     *= 1.16;
        scores.SLICE       *= 0.84;
        break;
      default:
        break;
    }
  }

  if (sequencePlan) {
    const planBoost = sequencePlan.planStrength ?? 0.30;
    if (sequencePlan.shotBias === 'ACCEL') scoreACCEL += 0.14 * planBoost;
    if (sequencePlan.shotBias === 'SHORT_ACCEL') scoreSHORT_ACCEL += 0.14 * planBoost;
    if (sequencePlan.shotBias === 'TOPSPIN') scoreTOPSPIN += 0.12 * planBoost;
    if (sequencePlan.shotBias === 'SLICE') scoreSLICE += 0.12 * planBoost;
    if (sequencePlan.motive === 'FINISH_OPEN' || sequencePlan.motive === 'PRESS_OPEN') {
      scoreACCEL += 0.08 * planBoost;
      scoreSHORT_ACCEL += 0.06 * planBoost;
    }
    if (sequencePlan.motive === 'BUILD_HEAVY' || sequencePlan.motive === 'NEUTRALIZE') {
      scoreTOPSPIN += 0.07 * planBoost;
      scoreSLICE += 0.05 * planBoost;
    }
  }

  const fm = player._feasibility;
  if (fm) {
    for (const key of Object.keys(scores)) {
      if (!fm.isViable(key)) scores[key] = 0;
    }
  }

  player.ctx._lastBallTier = ballTier;
  return scores;
}


// ─────────────────────────────────────────────────────────────────
// LAYER 3b: Adaptação mid-match (_matchRead + _setAdjust)
// ─────────────────────────────────────────────────────────────────

/**
 * Aplica os insights de _matchRead e _setAdjust calculados por
 * readMatchContext/applySetAdjustment sobre os scores situacionais.
 *
 * _matchRead: leitura do que está funcionando no jogo atual
 * _setAdjust: ajuste tático de curta duração do set anterior
 *
 * Só age quando há evidência suficiente (adaptability alta chega mais rápido).
 */
function applyMatchReadModifiers(scores, player) {
  const s         = { ...scores };
  const matchRead = player.ctx?._matchRead;
  const setAdjust = player.ctx?._setAdjust;
  const adaptBase = player?.mods?.adaptacaoFactor ?? ((player?.attrs?.adaptacao ?? 60) / 100);
  const adaptBoost = clamp(player?._adaptacaoBoost ?? 0, -0.125, 0.125);
  const adaptFactor = clamp(adaptBase + adaptBoost, 0.45, 1.18);
  const readScale = clamp(0.75 + adaptFactor * 0.45, 0.72, 1.28);
  const penaltyScale = clamp(0.80 + adaptFactor * 0.30, 0.78, 1.18);

  if (matchRead) {
    // DTL funcionando → boosta ACCEL e TOPSPIN no eixo DTL (via buildStyle — não há dir aqui,
    // mas podemos aumentar o score geral dos golpes ofensivos quando o padrão DTL pressiona)
    if (matchRead.dtlWorking) {
      s.ACCEL       = Math.min(s.ACCEL       + 0.07 * readScale, 1.0);
      s.SHORT_ACCEL = Math.min(s.SHORT_ACCEL + 0.05 * readScale, 1.0);
    }
    // Cross funcionando → bônus para TOPSPIN (golpe de construção cruzada por excelência)
    if (matchRead.crossWorking) {
      s.TOPSPIN = Math.min(s.TOPSPIN + 0.07 * readScale, 1.0);
    }
    // Jogo de rede funcionando → bônus em jogadores que sobem
    if (matchRead.netWorking) {
      s.ACCEL = Math.min(s.ACCEL + 0.05 * readScale, 1.0); // passa bem que leva à rede
    }
    // Insistindo em padrão que não funciona → penaliza o golpe mais repetido
    if (matchRead.insisting) {
      // Reduz levemente o golpe de maior score (jogador começa a hesitar)
      const topKey = Object.entries(s).reduce((a, b) => s[a[0]] > s[b[0]] ? a : b)[0];
      s[topKey] = Math.max(0, s[topKey] - 0.10 * penaltyScale);
    }
  }

  if (setAdjust?.avoidShotType && s[setAdjust.avoidShotType] !== undefined) {
    // Penaliza o shot type que não funcionou no set anterior
    s[setAdjust.avoidShotType] = Math.max(0, s[setAdjust.avoidShotType] - 0.18 * penaltyScale);
  }
  if (setAdjust?.netStrategy === 'more') {
    s.ACCEL       = Math.min((s.ACCEL ?? 0)       + 0.08 * readScale, 1.0);
    s.SHORT_ACCEL = Math.min((s.SHORT_ACCEL ?? 0) + 0.06 * readScale, 1.0);
    s.SLICE       = Math.min((s.SLICE ?? 0)       + 0.04 * readScale, 1.0);
  } else if (setAdjust?.netStrategy === 'less') {
    s.ACCEL       = Math.max(0, (s.ACCEL ?? 0)       - 0.08 * penaltyScale);
    s.SHORT_ACCEL = Math.max(0, (s.SHORT_ACCEL ?? 0) - 0.06 * penaltyScale);
    s.SLICE       = Math.max(0, (s.SLICE ?? 0)       - 0.04 * penaltyScale);
  }

  // Penaliza Slice excessivo em sequência — adversário se adapta à bola rasteira
  const sliceCount = player.ctx?._recentSliceCount ?? 0;
  if (sliceCount >= 3) {
    s.SLICE   = Math.max(0, s.SLICE   - 0.08 * (sliceCount - 2));
    s.TOPSPIN = Math.min(s.TOPSPIN + 0.05, 1.0);
  }

  return s;
}

/**
 * Aplica os modificadores de prefs sobre os scores situacionais.
 * Os pesos do doc são lei — modifica os scores diretamente.
 *
 * [v2] riskProfile vira personalidade de winner:
 *   SAFETY_FIRST/SAFE  → topspin pesado É o winner; ACCEL é excepcional
 *   CALCULATED         → arsenal equilibrado; ACCEL na oportunidade certa
 *   GAMBLER/ALLOUT     → ACCEL e BANANA são o plano A; topspin é o plano seguro
 *
 * earlyPenalty já foi ajustada em computeSituationalScores (profile-aware).
 * Aqui cuidamos das amplificações e da matrix rallyCadence × riskProfile.
 */
function applyPrefsModifiers(scores, prefs, rally, opponent, player) {
  const s        = { ...scores };
  const oppAtNet = opponent?.atNet ?? false;
  const ballTier = player?.ctx?._lastBallTier ?? 'NEUTRAL';
  const rp       = prefs.riskProfile;
  const rc       = prefs.rallyCadence;
  const netIntent = clamp(player?.ctx?.netIntent ?? 0, 0, 1);
  const weakReturnBoost = clamp(player?.ctx?._weakReturnBoost ?? 0, 0, 1);
  const currentIntent = player?.ctx?.currentIntent ?? 'BUILD';

  // ── rallyCadence — quando decide atacar ──────────────────────────
  // EARLY_ATTACK e EXPLOSIVE injetam score mesmo sem abertura:
  // esses perfis CRIAM a abertura pelo ataque, não esperam por ela.
  switch (rc) {
    case 'PATIENT':
      // Paciente: espera a bola certa — penaliza fortemente ataque precoce
      if (rally < 6) {
        s.ACCEL       = Math.max(0, s.ACCEL       - 0.18);
        s.SHORT_ACCEL = Math.max(0, s.SHORT_ACCEL - 0.13);
      }
      break;
    case 'MEASURED':
      if (rally < 4) {
        s.ACCEL       = Math.max(0, s.ACCEL       - 0.08);
        s.SHORT_ACCEL = Math.max(0, s.SHORT_ACCEL - 0.05);
      }
      break;
    case 'BALANCED':
      // leve empurrão ofensivo em rallies médios
      if (rally >= 3) {
        s.ACCEL       = Math.min((s.ACCEL ?? 0)       + 0.06, 1.0);
        s.SHORT_ACCEL = Math.min((s.SHORT_ACCEL ?? 0) + 0.04, 1.0);
      }
      break;
    case 'EARLY_ATTACK':
      // Ataca cedo e com propósito — injeção mínima garante que ACCEL entre no pool
      if (rally >= 2 && rally <= 5) {
        s.ACCEL       = Math.min((s.ACCEL ?? 0)       + 0.20, 1.0);
        s.SHORT_ACCEL = Math.min((s.SHORT_ACCEL ?? 0) + 0.14, 1.0);
      } else if (rally > 5) {
        s.ACCEL       = Math.min((s.ACCEL ?? 0)       + 0.12, 1.0);
        s.SHORT_ACCEL = Math.min((s.SHORT_ACCEL ?? 0) + 0.08, 1.0);
      }
      if (s.ACCEL       < 0.10 && rally >= 2) s.ACCEL       = 0.10;
      if (s.SHORT_ACCEL < 0.08 && rally >= 2) s.SHORT_ACCEL = 0.08;
      break;
    case 'EXPLOSIVE':
      // Ataca em qualquer rally — pico em rallies curtos
      {
        const earlyBoost = rally <= 3 ? 0.18 : 0;
        s.ACCEL       = Math.min((s.ACCEL ?? 0)       + 0.28 + earlyBoost, 1.0);
        s.SHORT_ACCEL = Math.min((s.SHORT_ACCEL ?? 0) + 0.18 + earlyBoost * 0.6, 1.0);
        if (s.ACCEL       < 0.18) s.ACCEL       = 0.18;
        if (s.SHORT_ACCEL < 0.12) s.SHORT_ACCEL = 0.12;
      }
      break;
  }

  // ── riskProfile — personalidade de winner ────────────────────────
  // TOPSPIN é o golpe âncora — nunca penalizado pelo riskProfile.
  // SAFE/SAFETY_FIRST: topspin pesado É o winner → boostar mais em OPPORTUNITY.
  // GAMBLER/ALLOUT: amplificador de ACCEL+BANANA — plano A deles.
  switch (rp) {
    case 'SAFETY_FIRST':
      if (s.ACCEL       > 0) s.ACCEL       = Math.max(0, s.ACCEL       - 0.22);
      if (s.SHORT_ACCEL > 0) s.SHORT_ACCEL = Math.max(0, s.SHORT_ACCEL - 0.17);
      if (s.BANANA      > 0) s.BANANA      = Math.max(0, s.BANANA      - 0.20);
      // Topspin é o winner: boost maior quando há abertura real
      s.TOPSPIN = Math.min((s.TOPSPIN ?? 0) + (ballTier === 'OPPORTUNITY' ? 0.22 : 0.16), 1.0);
      if (s.DROP > 0) s.DROP = Math.min(s.DROP + (ballTier === 'OPPORTUNITY' ? 0.08 : 0.04), 1.0);
      break;
    case 'SAFE':
      if (s.ACCEL       > 0) s.ACCEL       = Math.max(0, s.ACCEL       - 0.10);
      if (s.SHORT_ACCEL > 0) s.SHORT_ACCEL = Math.max(0, s.SHORT_ACCEL - 0.07);
      if (s.BANANA      > 0) s.BANANA      = Math.max(0, s.BANANA      - 0.10);
      s.TOPSPIN = Math.min((s.TOPSPIN ?? 0) + (ballTier === 'OPPORTUNITY' ? 0.14 : 0.08), 1.0);
      if (s.DROP > 0) s.DROP = Math.min(s.DROP + (ballTier === 'OPPORTUNITY' ? 0.05 : 0.02), 1.0);
      break;
    case 'CALCULATED':
      // Reconhece a chance — usa ACCEL quando o score já justifica
      if (s.ACCEL       > 0.30) s.ACCEL       = Math.min(s.ACCEL       + 0.08, 1.0);
      if (s.SHORT_ACCEL > 0.25) s.SHORT_ACCEL = Math.min(s.SHORT_ACCEL + 0.05, 1.0);
      if (s.DROP        > 0.20) s.DROP        = Math.min(s.DROP        + 0.06, 1.0);
      if (ballTier !== 'OPPORTUNITY' && s.SLICE > 0.18) s.SLICE = Math.min(s.SLICE + 0.04, 1.0);
      break;
    case 'GAMBLER':
      // Multiplicador: amplifica o que existe — ACCEL e BANANA são o gameplan
      if (s.ACCEL       > 0) s.ACCEL       = Math.min(s.ACCEL       * 1.55 + 0.08, 1.0);
      if (s.SHORT_ACCEL > 0) s.SHORT_ACCEL = Math.min(s.SHORT_ACCEL * 1.45 + 0.06, 1.0);
      if (s.BANANA      > 0) s.BANANA      = Math.min(s.BANANA      * 1.30 + 0.04, 1.0);
      break;
    case 'ALLOUT':
      // Multiplicador agressivo + injeção mínima: vai atrás do winner sempre
      if (s.ACCEL       > 0) s.ACCEL       = Math.min(s.ACCEL       * 1.80 + 0.12, 1.0);
      if (s.SHORT_ACCEL > 0) s.SHORT_ACCEL = Math.min(s.SHORT_ACCEL * 1.60 + 0.10, 1.0);
      if (s.BANANA      > 0) s.BANANA      = Math.min(s.BANANA      * 1.40 + 0.06, 1.0);
      // Garante pool mínimo mesmo sem abertura clara — ALLOUT tenta mesmo assim
      if (s.ACCEL       < 0.14) s.ACCEL       = 0.14;
      if (s.SHORT_ACCEL < 0.10) s.SHORT_ACCEL = 0.10;
      break;
  }

  // ── Matrix riskProfile × rallyCadence — 6 combos expandidos ─────
  // Cada combinação define uma identidade de jogo distinta.
  // A sinergia agora é proporcional à "ousadia total" do perfil.

  // Baixo risco + cadência conservadora: reforça penalidade em ACCEL
  if ((rp === 'SAFETY_FIRST' || rp === 'SAFE') && (rc === 'MEASURED' || rc === 'PATIENT')) {
    s.ACCEL       = Math.max(0, s.ACCEL       - 0.10);
    s.SHORT_ACCEL = Math.max(0, s.SHORT_ACCEL - 0.07);
  }

  // CALCULATED + cadência ofensiva: moderado mas consistente
  if (rp === 'CALCULATED' && (rc === 'EXPLOSIVE' || rc === 'EARLY_ATTACK')) {
    s.ACCEL       = Math.min((s.ACCEL ?? 0)       + 0.10, 1.0);
    s.SHORT_ACCEL = Math.min((s.SHORT_ACCEL ?? 0) + 0.05, 1.0);
  }

  // GAMBLER + EARLY_ATTACK: atacar cedo é o plano — arriscado e com propósito
  if (rp === 'GAMBLER' && rc === 'EARLY_ATTACK') {
    s.ACCEL       = Math.min((s.ACCEL ?? 0)       + 0.14, 1.0);
    s.SHORT_ACCEL = Math.min((s.SHORT_ACCEL ?? 0) + 0.06, 1.0);
    s.BANANA      = Math.min((s.BANANA ?? 0)       + 0.05, 1.0);
    if (s.ACCEL       < 0.10) s.ACCEL       = 0.10;
    if (s.SHORT_ACCEL < 0.07) s.SHORT_ACCEL = 0.07;
  }

  // GAMBLER + EXPLOSIVE: spammar ACCEL e BANANA é o gameplan dele
  if (rp === 'GAMBLER' && rc === 'EXPLOSIVE') {
    s.ACCEL       = Math.min((s.ACCEL ?? 0)       + 0.22, 1.0);
    s.SHORT_ACCEL = Math.min((s.SHORT_ACCEL ?? 0) + 0.10, 1.0);
    s.BANANA      = Math.min((s.BANANA ?? 0)       + 0.08, 1.0);
    if (s.ACCEL       < 0.14) s.ACCEL       = 0.14;
    if (s.SHORT_ACCEL < 0.09) s.SHORT_ACCEL = 0.09;
  }

  // ALLOUT + EXPLOSIVE ou EARLY_ATTACK: o perfil mais agressivo — ACCEL e BANANA dominam o pool
  if (rp === 'ALLOUT' && (rc === 'EXPLOSIVE' || rc === 'EARLY_ATTACK')) {
    const alBonus = rc === 'EXPLOSIVE' ? 0.16 : 0.10;
    s.ACCEL       = Math.min((s.ACCEL ?? 0)       + alBonus, 1.0);
    s.SHORT_ACCEL = Math.min((s.SHORT_ACCEL ?? 0) + alBonus * 0.65, 1.0);
    s.BANANA      = Math.min((s.BANANA ?? 0)       + alBonus * 0.55, 1.0);
    if (s.ACCEL       < 0.18) s.ACCEL       = 0.18;
    if (s.SHORT_ACCEL < 0.13) s.SHORT_ACCEL = 0.13;
    // Piso mínimo para BANANA: ALLOUT+EXPLOSIVE sempre tem BANANA no pool como variação real
    if (s.BANANA      < 0.16) s.BANANA      = 0.16;
  }

  // ALLOUT + BALANCED: ainda busca agressividade mesmo sem cadência explosiva
  if (rp === 'ALLOUT' && rc === 'BALANCED') {
    s.ACCEL       = Math.min((s.ACCEL ?? 0)       + 0.12, 1.0);
    s.SHORT_ACCEL = Math.min((s.SHORT_ACCEL ?? 0) + 0.06, 1.0);
    s.BANANA      = Math.min((s.BANANA ?? 0)       + 0.05, 1.0);
  }

  // ── Sinergia ACCEL + BANANA para perfis ousados ──────────────────
  // Quando ambos têm score relevante → apostador varia entre os dois, criando
  // um padrão de pressão variado que é difícil de ler para o adversário.
  if ((rp === 'GAMBLER' || rp === 'ALLOUT') && s.ACCEL > 0.28 && (s.BANANA ?? 0) > 0.18) {
    s.ACCEL       = Math.min(s.ACCEL       + 0.05, 1.0);
    s.BANANA      = Math.min(s.BANANA      + 0.05, 1.0);
    s.SHORT_ACCEL = Math.min(s.SHORT_ACCEL + 0.03, 1.0);
  }

  // ── netGame — relação com a rede ─────────────────────────────────
  if (oppAtNet) {
    switch (prefs.netGame) {
      case 'AVOIDS':    s.LOB += 0.12; break;
      case 'RELUCTANT': s.LOB += 0.06; break;
      case 'OPPORTUNIST': break;
      case 'PROACTIVE':
      case 'HUNTER':
        s.LOB   += 0.08;
        s.ACCEL += 0.08;
        break;
    }
  }

  // ── netGame fora da rede — construir o approach antes da subida ─────────
  if (!oppAtNet) {
    switch (prefs.netGame) {
      case 'HUNTER': {
        s.ACCEL       = Math.min((s.ACCEL ?? 0)       + 0.08 + netIntent * 0.28 + weakReturnBoost * 0.12, 1.0);
        s.SHORT_ACCEL = Math.min((s.SHORT_ACCEL ?? 0) + 0.05 + netIntent * 0.18 + weakReturnBoost * 0.08, 1.0);
        s.SLICE       = Math.min((s.SLICE ?? 0)       + 0.04 + netIntent * 0.14, 1.0);
        s.DROP        = Math.max(0, (s.DROP ?? 0) - netIntent * 0.03);
        s.BANANA      = Math.max(0, (s.BANANA ?? 0) - netIntent * 0.08);
        if (netIntent >= 0.45 && rally >= 1) {
          s.ACCEL = Math.max(s.ACCEL, 0.26);
        }
        break;
      }
      case 'PROACTIVE': {
        s.ACCEL       = Math.min((s.ACCEL ?? 0)       + 0.05 + netIntent * 0.18 + weakReturnBoost * 0.08, 1.0);
        s.SHORT_ACCEL = Math.min((s.SHORT_ACCEL ?? 0) + 0.04 + netIntent * 0.12, 1.0);
        s.SLICE       = Math.min((s.SLICE ?? 0)       + 0.03 + netIntent * 0.10, 1.0);
        s.BANANA      = Math.max(0, (s.BANANA ?? 0) - netIntent * 0.05);
        break;
      }
      case 'OPPORTUNIST': {
        const netWindow = Math.max(netIntent, weakReturnBoost * 0.85);
        if (netWindow > 0.28) {
          s.ACCEL       = Math.min((s.ACCEL ?? 0)       + netWindow * 0.14, 1.0);
          s.SHORT_ACCEL = Math.min((s.SHORT_ACCEL ?? 0) + netWindow * 0.10, 1.0);
          s.SLICE       = Math.min((s.SLICE ?? 0)       + netWindow * 0.06, 1.0);
        }
        break;
      }
      case 'RELUCTANT':
        if (netIntent > 0.55) {
          s.ACCEL = Math.min((s.ACCEL ?? 0) + 0.06, 1.0);
        }
        break;
      case 'AVOIDS':
        s.ACCEL       = Math.max(0, (s.ACCEL ?? 0)       - 0.04);
        s.SHORT_ACCEL = Math.max(0, (s.SHORT_ACCEL ?? 0) - 0.03);
        break;
    }
  }

  // Vantagem de saque bem sucedida + perfil ofensivo: empurrão para golpe de approach.
  if (currentIntent !== 'RESET' && weakReturnBoost > 0.18 && !oppAtNet) {
    const netBias = prefs.netGame === 'HUNTER' ? 0.16
                 : prefs.netGame === 'PROACTIVE' ? 0.12
                 : prefs.netGame === 'OPPORTUNIST' ? 0.06
                 : 0.0;
    if (netBias > 0) {
      s.ACCEL       = Math.min((s.ACCEL ?? 0)       + netBias, 1.0);
      s.SHORT_ACCEL = Math.min((s.SHORT_ACCEL ?? 0) + netBias * 0.65, 1.0);
    }
  }

  return s;
}

// ─────────────────────────────────────────────────────────────────
// LAYER 4b: Viés da Signature Natural
// ─────────────────────────────────────────────────────────────────
// Aumenta o score do baseType da assinatura do jogador para que o
// AI escolha esse golpe com mais frequência — criando oportunidades
// para a assinatura ativar. Nunca levanta um shot zerado pelo
// feasibility (só boostra scores já > 0).
//
// Lógica de boost:
//   base_boost = 0.28 (sólido — o jogador realmente prefere o golpe)
//   raridade: signatures com activationBase baixo (raras) recebem
//     boost maior, compensando a baixa taxa de ativação.
//   cap: nunca ultrapassa 0.40 de boost absoluto.
//   activationBase atual range: 0.09 (muito raro) → 0.35 (comum)


// ─────────────────────────────────────────────────────────────────
// LAYER 5: Pick probabilístico (softmax com temperatura)
// ─────────────────────────────────────────────────────────────────

/**
 * Implementa softmax sobre os scores finais.
 * Temperatura alta → mais aleatoriedade (jogador irregular).
 * Temperatura baixa → escolhas quase determinísticas (consistente).
 */
function softmaxPick(scores, temperature) {
  const keys = Object.keys(scores).filter(k => scores[k] > 0);
  if (keys.length === 0) return 'TOPSPIN';
  if (keys.length === 1) return keys[0];

  // Temperatura muito baixa → determinístico (pick o melhor)
  if (temperature < 0.05) {
    return keys.reduce((a, b) => scores[a] > scores[b] ? a : b);
  }

  // softmax: exp(score / temp)
  const expVals = keys.map(k => Math.exp(scores[k] / temperature));
  const total   = expVals.reduce((a, b) => a + b, 0);
  const probs   = expVals.map(v => v / total);

  // Amostragem
  let r = Math.random();
  for (let i = 0; i < keys.length; i++) {
    r -= probs[i];
    if (r <= 0) return keys[i];
  }
  return keys[keys.length - 1];
}

/**
 * Calcula a temperatura do softmax baseada no perfil do jogador e estado do jogo.
 *
 * regularidade alta + mentalidade alta → temperatura baixa (determinístico)
 * regularidade baixa → temperatura alta (imprevisível)
 * momentum extremo → leve aumento de temperatura
 */
function computeTemperature(attrs, ctx, player) {
  const reg  = attrs.regularidade ?? 60;
  const mn   = attrs.mentalidade  ?? 60;
  const ewma = ctx?._momentumEWMA  ?? 0.5;
  const rallyPressure = ctx?.rallyPressure ?? 0;
  const regFactor = player?.mods?.varFactor ?? (reg / 100);
  const clutchFactor = player?.mods?.clutchFactor ?? (mn / 100);
  const adaptFactor = clamp(
    (player?.mods?.adaptacaoFactor ?? ((attrs.adaptacao ?? 60) / 100)) + (player?._adaptacaoBoost ?? 0) * 0.45,
    0.40,
    1.15
  );

  // Irregularidade base: regularidade alta comprime bastante a temperatura.
  const irregularity = (1 - regFactor) * 0.24;

  // Mentalidade alta reduz temperatura (jogador confiante é mais previsível)
  const mentalFactor = clamp(1.05 - clutchFactor * 0.25, 0.78, 1.12);

  // Momentum extremo aumenta levemente a temperatura
  const momentumFactor = 1.0 + Math.abs(ewma - 0.5) * 0.25;

  // rallyPressure aumenta temperatura — stress acumulado torna escolhas mais erráticas.
  // É aqui que o stress do ponto afeta o jogo, não no pool de golpes.
  // pressão 0.0 → +0.00 | pressão 0.5 → +0.06 | pressão 1.0 → +0.12
  const pressureFactor = 1.0 + rallyPressure * 0.12 * (1.0 - mn / 100);

  const adaptationCalm = clamp(1.10 - adaptFactor * 0.10, 0.92, 1.06);
  const temp = (0.28 + irregularity) * mentalFactor * momentumFactor * pressureFactor * adaptationCalm;
  return clamp(temp, 0.08, 0.90);
}

// ─────────────────────────────────────────────────────────────────
// LAYER 6: Qualidade de execução
// ─────────────────────────────────────────────────────────────────

/**
 * Calcula o fatorAttr específico por tipo de golpe.
 * Do doc (Parte 4, Camada 6):
 *   ACCEL:       (potencia/100)^0.5 × (controle/100)^0.3
 *   TOPSPIN:     (topspin/100)^0.5  × (controle/100)^0.3
 *   ...
 */
function computeFatorAttr(shotType, attrs, isBackhand) {
  // Wing-aware: FH e BH têm potência/controle distintos
  const po = wingPotencia(attrs, isBackhand ?? false) / 100;
  const ct = wingControle(attrs, isBackhand ?? false) / 100;
  const ts = (attrs.topspin     ?? 60) / 100;
  const sl = (attrs.slice       ?? 60) / 100;
  const lr = (attrs.leitura     ?? 60) / 100;
  const vl = (attrs.velocidade  ?? 60) / 100;
  const mn = (attrs.mentalidade ?? 60) / 100;
  const vt = (attrs.visaoTatica ?? attrs.agressividade ?? 60) / 100;
  // defesa: relevante para lob defensivo e recuperação
  const df = (attrs.defesa      ?? 60) / 100;

  switch (shotType) {
    case 'ACCEL':       return Math.pow(po, 0.46) * Math.pow(ct, 0.24) * Math.pow(vt, 0.16);
    case 'TOPSPIN':     return Math.pow(ts, 0.44) * Math.pow(ct, 0.26) * Math.pow(df, 0.10) * Math.pow(vt, 0.08);
    case 'SLICE':       return Math.pow(sl, 0.45) * Math.pow(ct, 0.28) * Math.pow(df, 0.14);
    case 'DROP':        return Math.pow(ct, 0.34) * Math.pow(sl, 0.26) * Math.pow(lr, 0.18) * Math.pow(vt, 0.14) * Math.pow(mn, 0.08);
    case 'SHORT_ACCEL': return Math.pow(ct, 0.34) * Math.pow(lr, 0.24) * Math.pow(po, 0.20) * Math.pow(vt, 0.16);
    case 'LOB':         return Math.pow(df, 0.50) * Math.pow(vl, 0.18) * Math.pow(mn, 0.16) * Math.pow(lr, 0.12);
    case 'BANANA':      return Math.pow(ts, 0.5) * Math.pow(po, 0.35) * Math.pow(ct, 0.15);
    default:            return Math.pow(ct, 0.4);
  }
}

/**
 * Calcula a penalidade de pressão do placar.
 * Momentos decisivos penalizam jogadores com mentalidade baixa.
 */
function computePressaoFactor(attrs, scoreState, player) {
  const mn = attrs.mentalidade ?? 60;
  const imp = scoreState?.importance ?? 1.0;
  const clutchFactor = player?.mods?.clutchFactor ?? (mn / 100);
  const clutchStability = clamp(0.88 + clutchFactor * 0.20, 0.82, 1.08);

  // Do doc:
  //   penalidade = (1 - mentalidade/100) × (importância - 1.0) × 0.20
  //   pressão = max(0.75, 1.0 - penalidade)
  const penalidade = (1 - mn / 100) * (imp - 1.0) * 0.20 / clutchStability;
  return Math.max(0.75, 1.0 - penalidade);
}

/**
 * Qualidade real de execução do golpe escolhido.
 * qualidadeReal = prepQuality × fatorAttr × pressão  (forma do dia em prepQuality via _formMods.qualityMod)
 */
function computeExecutionQuality(shotType, attrs, prepQuality, scoreState, isBackhand, player) {
  const fatorAttr = computeFatorAttr(shotType, attrs, isBackhand);
  const pressao   = computePressaoFactor(attrs, scoreState, player);
  const raw = prepQuality * fatorAttr * pressao;
  let shaped = raw;

  // Q ruim precisa ficar visivelmente ruim em quadra:
  // abaixo da faixa "jogável" degradamos de forma não linear para que
  // contatos pobres gerem bolas fracas, curtas e sem autoridade.
  if (raw < 0.52) {
    const lowBand = clamp(raw / 0.52, 0, 1);
    const crush = 0.58 + lowBand * 0.42;
    shaped *= crush;
  }

  // Golpes naturalmente agressivos exigem ainda mais execução limpa.
  if ((shotType === 'ACCEL' || shotType === 'SHORT_ACCEL' || shotType === 'BANANA') && shaped < 0.62) {
    const attackBand = clamp(shaped / 0.62, 0, 1);
    shaped *= 0.72 + attackBand * 0.28;
  }
  if (shotType === 'TOPSPIN' && shaped < 0.60) {
    const topspinBand = clamp(shaped / 0.60, 0, 1);
    shaped *= 0.80 + topspinBand * 0.20;
  }
  // Clampa entre 0.05 e 0.97 — nunca perfeiro, nunca zero
  return clamp(shaped, 0.05, 0.97);
}

// ─────────────────────────────────────────────────────────────────
// INTENSIDADE DO GOLPE — "a barrinha invisível"
// ─────────────────────────────────────────────────────────────────
//
// shotIntensity ∈ [0..1]
//   0 = controle puro  → usa o piso de pow, arco mais alto, mais spin
//   1 = full power     → usa o teto de pow, mais rasante, menos spin
//
// Influencia diretamente: power, netClearance, spinMag
//
// Sobe com: prepQuality alta, quadra aberta, adversário fundo,
//           momentum positivo, agressividade, riskProfile agressivo
// Cai com:  pressão, rally muito curto, perfil PATIENT, bola difícil

function computeShotIntensity(shotType, player, opponent, prepQuality, prefs, ctx) {
  const attrs      = player.attrs ?? {};
  const isBackhand = player._isBackhand ?? false;
  // visaoTatica: decisão tática de quando/quanto atacar (substituiu agressividade)
  const vtBase     = player?.mods?.visaoFactor ?? ((attrs.visaoTatica ?? attrs.agressividade ?? 60) / 100);
  const vt         = clamp(vtBase + (player?._adaptacaoBoost ?? 0) * 0.45, 0.20, 1.18);
  const po         = wingPotencia(attrs, isBackhand) / 100;
  const mn         = (attrs.mentalidade ?? 60) / 100;

  const oppDepth   = Math.abs(opponent?.pos?.y ?? 8) / HALF_L;
  const playerLat  = Math.abs(player.pos?.x    ?? 0) / HALF_S;
  const oppAtNet   = opponent?.atNet ?? (oppDepth < 0.35);
  const courtOpen  = Math.abs(opponent?.pos?.x ?? 0) > 1.5 || playerLat < 0.3;
  const ewma       = ctx?._momentumEWMA ?? 0.5;
  const rally      = ctx?.gsRally ?? 0;

  // ── Base: quanto o jogador "quer" bater forte por natureza ────────
  // visaoTatica e potência (wing-aware) puxam para cima; mentalidade estabiliza
  let intensity = 0.35 + vt * 0.30 + po * 0.20 + mn * 0.05;

  // ── Situação: janela de ataque aberta ────────────────────────────
  if (courtOpen)           intensity += 0.10;
  if (oppDepth > 0.70)     intensity += 0.08;  // adversário muito fundo = atacar
  if (prepQuality > 0.75)  intensity += 0.12;  // bola fácil = mais pace
  else if (prepQuality < 0.45) intensity -= 0.24; // bola difícil = bem mais controle

  // ── Momentum ─────────────────────────────────────────────────────
  // Embalado → mais agressivo; colapsando → mais cauteloso
  intensity += (ewma - 0.5) * 0.20;

  // ── Perfil de cadência ───────────────────────────────────────────
  switch (prefs?.rallyCadence) {
    case 'PATIENT':    intensity -= 0.12; break;
    case 'MEASURED':   intensity -= 0.06; break;
    case 'EARLY_ATTACK': intensity += 0.06; break;
    case 'EXPLOSIVE':  intensity += 0.12; break;
  }

  // ── riskProfile ──────────────────────────────────────────────────
  switch (prefs?.riskProfile) {
    case 'SAFETY_FIRST': intensity -= 0.15; break;
    case 'SAFE':         intensity -= 0.08; break;
    case 'GAMBLER':      intensity += 0.08; break;
    case 'ALLOUT':       intensity += 0.15; break;
  }

  // ── Shot-specific adjustments ────────────────────────────────────
  // Golpes de controle por natureza nunca chegam ao teto de intensidade
  // Golpes de ataque partem de uma base mais alta
  switch (shotType) {
    case 'SLICE':       intensity -= 0.20; break; // slice é sempre mais controlado
    case 'DROP': {
      const sl = (attrs.slice ?? 60) / 100;
      const ct = wingControle(attrs, isBackhand) / 100;
      const lr = (attrs.leitura ?? 60) / 100;
      const touch = clamp((sl * 0.36) + (ct * 0.38) + (lr * 0.26), 0, 1);
      intensity = 0.12 + touch * 0.06 + Math.max(0, prepQuality - 0.55) * 0.10;
      if (oppDepth > 0.78) intensity += 0.03;
      if (courtOpen) intensity += 0.02;
      break;
    }
    case 'LOB':
      // LOB defensivo (DIFFICULT) → intensidade baixa → arco alto (clearance usa ph.clr[1])
      // LOB agressivo (OPPORTUNITY) → intensidade maior → arco menor, mais pace
      // Sem esse split, todos os lobs tinham o mesmo arco, tornando os dois tipos indistinguíveis.
      if (player?.ctx?._lastBallTier === 'DIFFICULT') {
        intensity -= 0.28;  // defensivo: muito abaixo do neutro → arco máximo (5.5m)
      } else {
        intensity -= 0.10;  // agressivo: levemente abaixo → arco moderado (~3-4m)
      }
      break;
    case 'ACCEL':       intensity += 0.15; break; // accel parte mais alto
    case 'BANANA':      intensity += 0.08; break;
  }

  // ── Penalidade de rally muito curto (devolução) ───────────────────
  if (rally === 0) intensity -= 0.08;

  // ── Teto por ballTier — sobrevivência não é estilo, é física ────────
  // DIFFICULT: jogador não pode "escolher" atacar a 95% — o corpo não permite.
  // O estilo pode ser ALLOUT mas se a bola é DIRT/prepQ<0.28, o máximo é 0.58.
  const ballTierLocal = player?.ctx?._lastBallTier ?? 'NEUTRAL';
  const intensityCap  = ballTierLocal === 'DIFFICULT'  ? 0.42
                      : ballTierLocal === 'OPPORTUNITY' ? 0.82  // cap reduzido — variedade real
                      : 0.90;

  if (shotType === 'DROP') {
    return clamp(intensity, 0.12, Math.min(intensityCap, 0.28));
  }

  return clamp(intensity, 0.05, intensityCap);
}

// ─────────────────────────────────────────────────────────────────
// TARGET BUILDING (buildStyle → direção)
// ─────────────────────────────────────────────────────────────────

/**
 * Decide as probabilidades de direção (cruzado, paralelo, centro)
 * com base no buildStyle do jogador.
 *
 * Retorna { pCross, pDtl, pCentre } — somam 1.0.
 */
function dirProbsFromBuildStyle(buildStyle, shotType) {
  // Defaults neutros
  let pCross = 0.55, pDtl = 0.30, pCentre = 0.15;

  switch (buildStyle) {
    case 'CROSS_DOMINANT':
      // Quase sempre cruzado — topspin e normal cruzado dominam
      pCross  = 0.78; pDtl = 0.14; pCentre = 0.08;
      break;
    case 'CROSS_BUILDER':
      pCross  = 0.65; pDtl = 0.24; pCentre = 0.11;
      break;
    case 'VARIED':
      pCross  = 0.45; pDtl = 0.35; pCentre = 0.20;
      break;
    case 'DTL_HUNTER':
      // Vai ao paralelo cedo sempre que pode
      if (shotType === 'ACCEL' || shotType === 'TOPSPIN') {
        pCross = 0.32; pDtl = 0.52; pCentre = 0.16;
      } else {
        pCross = 0.48; pDtl = 0.38; pCentre = 0.14;
      }
      break;
    case 'CENTRE_CONTROL':
      if (shotType === 'SLICE') {
        pCross = 0.30; pDtl = 0.25; pCentre = 0.45;
      } else {
        pCross = 0.42; pDtl = 0.28; pCentre = 0.30;
      }
      break;
  }

  return { pCross, pDtl, pCentre };
}

function resolveTargetFromMotive(shotType, player, opponent, effectiveIntensity, executionQuality, motivePack) {
  const spatial = motivePack?.spatial ?? computeSpatialContext(player, opponent);
  const motive = motivePack?.motive ?? 'NEUTRALIZE';
  const sequencePlan = motivePack?.sequencePlan ?? null;
  const centreX = clamp(spatial.centreBias + rand(-0.35, 0.35), -0.9, 0.9);
  const wideScale = HALF_S - 0.15;
  const intensityT = clampUnit(effectiveIntensity);

  let dir = spatial.crossDir;
  let lateralFrac = 0.40;
  let depthBias = 0.68;

  switch (motive) {
    case 'NEUTRALIZE':
      dir = spatial.jamDir;
      lateralFrac = 0.08 + intensityT * 0.10;
      depthBias = 0.78;
      break;
    case 'BUILD_HEAVY':
      dir = spatial.crossDir;
      lateralFrac = 0.26 + intensityT * 0.14;
      depthBias = 0.74;
      break;
    case 'BUILD_SPACE':
      dir = spatial.crossDir;
      lateralFrac = 0.40 + intensityT * 0.18;
      depthBias = 0.72;
      break;
    case 'PRESS_OPEN':
      dir = spatial.lateralOpenDir;
      lateralFrac = 0.56 + intensityT * 0.16;
      depthBias = 0.74;
      break;
    case 'FINISH_OPEN':
      dir = spatial.lateralOpenDir;
      lateralFrac = 0.64 + intensityT * 0.20;
      depthBias = shotType === 'SHORT_ACCEL' ? 0.56 : 0.80;
      break;
    case 'JAM_BODY':
      dir = spatial.jamDir;
      lateralFrac = 0.10 + intensityT * 0.08;
      depthBias = 0.70;
      break;
    case 'PASS_CC':
      dir = spatial.crossDir;
      lateralFrac = 0.62 + intensityT * 0.18;
      depthBias = shotType === 'SHORT_ACCEL' ? 0.52 : 0.72;
      break;
    case 'PASS_DTL':
      dir = spatial.dtlDir;
      lateralFrac = 0.50 + intensityT * 0.16;
      depthBias = 0.76;
      break;
    case 'APPROACH_DTL':
      dir = spatial.dtlDir;
      lateralFrac = 0.40 + intensityT * 0.12;
      depthBias = 0.82;
      break;
    case 'APPROACH_CC':
      dir = spatial.crossDir;
      lateralFrac = 0.44 + intensityT * 0.12;
      depthBias = 0.74;
      break;
    case 'DRAG_FORWARD':
      dir = spatial.lateralOpenDir;
      lateralFrac = shotType === 'DROP' ? 0.18 + intensityT * 0.16 : 0.30 + intensityT * 0.15;
      depthBias = shotType === 'DROP' ? 0.18 : 0.42;
      break;
    case 'LOB_ESCAPE':
      dir = spatial.lateralOpenDir;
      lateralFrac = 0.18 + intensityT * 0.14;
      depthBias = 0.90;
      break;
    case 'LOB_PRESSURE':
      dir = spatial.lateralOpenDir;
      lateralFrac = 0.34 + intensityT * 0.16;
      depthBias = 0.88;
      break;
  }

  if (sequencePlan) {
    if (sequencePlan.preferredDir === 'BODY') dir = spatial.jamDir;
    else if (sequencePlan.preferredDir === 'OPEN') dir = spatial.lateralOpenDir;
    else if (sequencePlan.preferredDir === 'SAME') dir = spatial.dtlDir;
    else if (sequencePlan.preferredDir === 'CENTRE') dir = spatial.jamDir;

    depthBias = clamp(
      depthBias * (1 - (sequencePlan.planStrength ?? 0) * 0.35) + (sequencePlan.depthBias ?? depthBias) * ((sequencePlan.planStrength ?? 0) * 0.35),
      0.12,
      0.94
    );

    if (sequencePlan.preferredDir === 'CENTRE') {
      lateralFrac = Math.min(lateralFrac, 0.16 + intensityT * 0.08);
    }
  }

  let targetX = centreX;
  let dirChoice = 'BODY';

  if (motive === 'JAM_BODY') {
    targetX = clamp(spatial.bodyX + rand(-0.18, 0.18), -HALF_S + 0.25, HALF_S - 0.25);
  } else if (shotType === 'LOB') {
    const lobDir = motive === 'LOB_ESCAPE' ? spatial.lateralOpenDir : dir;
    targetX = clamp(lobDir * wideScale * lateralFrac * 0.72 + rand(-0.35, 0.35), -HALF_S + 0.2, HALF_S - 0.2);
    dirChoice = motive === 'LOB_ESCAPE' ? 'CC' : (lobDir === spatial.dtlDir ? 'DTL' : 'CC');
  } else if (shotType === 'DROP') {
    targetX = clamp(dir * wideScale * lateralFrac * 0.75 + rand(-0.18, 0.18), -HALF_S + 0.2, HALF_S - 0.2);
    dirChoice = Math.abs(targetX) < 0.8 ? 'BODY' : (dir === spatial.dtlDir ? 'DTL' : 'CC');
  } else {
    targetX = clamp(dir * wideScale * lateralFrac + rand(-0.12, 0.12), -HALF_S + 0.15, HALF_S - 0.15);
    dirChoice = Math.abs(targetX) < 0.9 ? 'BODY' : (dir === spatial.dtlDir ? 'DTL' : 'CC');
  }

  return {
    targetX,
    depthBias: clamp(depthBias, 0.12, 0.94),
    dirChoice,
  };
}

function resolvePoorExecutionProfile(shotType, executionQuality, poorExec, effectiveIntensity) {
  const qualityMiss = clamp((0.42 - executionQuality) / 0.42, 0, 1);
  const intensityT = clampUnit(effectiveIntensity);

  const profile = {
    depthPull: 0.10 + poorExec * 0.08,
    forwardMiss: 0.10 + poorExec * 0.08,
    lateralSpray: 0.18 + poorExec * 0.16,
    powerScale: 0.84 - poorExec * 0.20,
    clearanceBias: 0.06 + poorExec * 0.05,
    extraLongBias: 0,
    longMissChance: 0.06 + qualityMiss * 0.08,
    wideMissChance: 0.10 + qualityMiss * 0.10,
    shortDeadChance: 0.24 + poorExec * 0.14,
    netMissChance: 0.14 + qualityMiss * 0.10,
  };

  switch (shotType) {
    case 'TOPSPIN':
      profile.depthPull = 0.06 + poorExec * 0.06;
      profile.forwardMiss = 0.24 + poorExec * 0.22 + intensityT * 0.18;
      profile.lateralSpray = 0.40 + poorExec * 0.28 + intensityT * 0.12;
      profile.powerScale = 0.92 - poorExec * 0.12;
      profile.clearanceBias = 0.08 + poorExec * 0.06;
      profile.extraLongBias = 0.12 + qualityMiss * 0.10 + intensityT * 0.06;
      profile.longMissChance = 0.32 + qualityMiss * 0.24 + intensityT * 0.14;
      profile.wideMissChance = 0.28 + qualityMiss * 0.22 + intensityT * 0.06;
      profile.shortDeadChance = 0.08 + poorExec * 0.08;
      profile.netMissChance = 0.09 + qualityMiss * 0.08 + poorExec * 0.05;
      break;
    case 'ACCEL':
      profile.depthPull = 0.01 + poorExec * 0.02;
      profile.forwardMiss = 0.24 + poorExec * 0.22 + intensityT * 0.14;
      profile.lateralSpray = 0.42 + poorExec * 0.28 + intensityT * 0.14;
      profile.powerScale = 1.00 - poorExec * 0.04;
      profile.clearanceBias = 0.03 + poorExec * 0.03;
      profile.extraLongBias = 0.14 + qualityMiss * 0.12;
      profile.longMissChance = 0.24 + qualityMiss * 0.16 + intensityT * 0.10;
      profile.wideMissChance = 0.30 + qualityMiss * 0.22;
      profile.shortDeadChance = 0.02 + poorExec * 0.03;
      profile.netMissChance = 0.22 + qualityMiss * 0.18;
      break;
    case 'SHORT_ACCEL':
      profile.depthPull = 0.03 + poorExec * 0.04;
      profile.forwardMiss = 0.18 + poorExec * 0.15 + intensityT * 0.10;
      profile.lateralSpray = 0.36 + poorExec * 0.24 + intensityT * 0.10;
      profile.powerScale = 0.95 - poorExec * 0.08;
      profile.clearanceBias = 0.05 + poorExec * 0.04;
      profile.extraLongBias = 0.06 + qualityMiss * 0.06;
      profile.longMissChance = 0.16 + qualityMiss * 0.12;
      profile.wideMissChance = 0.26 + qualityMiss * 0.20;
      profile.shortDeadChance = 0.08 + poorExec * 0.06;
      profile.netMissChance = 0.20 + qualityMiss * 0.14;
      break;
    case 'SLICE':
      profile.depthPull = 0.12 + poorExec * 0.08;
      profile.forwardMiss = 0.06 + poorExec * 0.05;
      profile.lateralSpray = 0.12 + poorExec * 0.08;
      profile.powerScale = 0.80 - poorExec * 0.18;
      profile.clearanceBias = 0.12 + poorExec * 0.08;
      profile.extraLongBias = 0.02 + qualityMiss * 0.03;
      profile.longMissChance = 0.08 + qualityMiss * 0.05;
      profile.wideMissChance = 0.08 + qualityMiss * 0.05;
      profile.shortDeadChance = 0.34 + poorExec * 0.18;
      profile.netMissChance = 0.10 + qualityMiss * 0.07;
      break;
    case 'DROP':
      profile.depthPull = 0.04 + poorExec * 0.03;
      profile.forwardMiss = 0.06 + poorExec * 0.05;
      profile.lateralSpray = 0.12 + poorExec * 0.08;
      profile.powerScale = 0.84 - poorExec * 0.10;
      profile.clearanceBias = 0.08 + poorExec * 0.05;
      profile.longMissChance = 0.10 + qualityMiss * 0.08;
      profile.wideMissChance = 0.07 + qualityMiss * 0.04;
      profile.shortDeadChance = 0.12 + poorExec * 0.08;
      profile.netMissChance = 0.14 + qualityMiss * 0.10;
      break;
    case 'LOB':
      profile.depthPull = 0.02 + poorExec * 0.03;
      profile.forwardMiss = 0.22 + poorExec * 0.18;
      profile.lateralSpray = 0.16 + poorExec * 0.12;
      profile.powerScale = 0.82 - poorExec * 0.14;
      profile.clearanceBias = 0.18 + poorExec * 0.12;
      profile.extraLongBias = 0.10 + qualityMiss * 0.10;
      profile.longMissChance = 0.20 + qualityMiss * 0.14;
      profile.wideMissChance = 0.10 + qualityMiss * 0.06;
      profile.shortDeadChance = 0.18 + poorExec * 0.10;
      profile.netMissChance = 0.05 + qualityMiss * 0.04;
      break;
  }

  return profile;
}

/**
 * Constrói o objeto de shot completo.
 * Substitui o buildShot antigo, incorporando buildStyle nas probabilidades de direção.
 */
function buildShotWithPrefs(shotType, player, opponent, executionQuality, prefs, shotIntensity = 0.5, motivePack = null) {
  const ph   = SHOT_PHYSICS[shotType] ?? SHOT_PHYSICS.TOPSPIN;
  const side = player.side ?? 1;
  const motive = motivePack?.motive ?? 'NEUTRALIZE';
  const spatial = motivePack?.spatial ?? computeSpatialContext(player, opponent);
  const styleIntensityBias = (() => {
    let bias = 0;
    switch (prefs?.riskProfile) {
      case 'SAFETY_FIRST': bias -= 0.18; break;
      case 'SAFE':         bias -= 0.10; break;
      case 'GAMBLER':      bias += 0.08; break;
      case 'ALLOUT':       bias += 0.16; break;
    }
    switch (prefs?.buildStyle) {
      case 'CROSS_DOMINANT': bias += 0.06; break;
      case 'DTL_HUNTER':     bias += 0.08; break;
      case 'CENTRE_CONTROL': bias -= 0.08; break;
    }
    return bias;
  })();
  const effectiveIntensity = clamp(shotIntensity + styleIntensityBias, 0.05, 0.98);
  const depthNoise  = (Math.random() - 0.5) * 0.48;
  let depthFrac     = clamp(
    ph.depth[0] + effectiveIntensity * (ph.depth[1] - ph.depth[0]) + depthNoise,
    ph.depth[0], ph.depth[1]
  );
  const poorExec = clamp((0.58 - executionQuality) / 0.58, 0, 1);
  const poorExecProfile = resolvePoorExecutionProfile(
    shotType,
    executionQuality,
    poorExec,
    effectiveIntensity
  );
  if (poorExec > 0) {
    const safeDepth = shotType === 'DROP' ? 0.26 : shotType === 'LOB' ? 0.78 : 0.48;
    depthFrac = clamp(
      depthFrac * (1 - poorExec * poorExecProfile.depthPull) + safeDepth * (poorExec * poorExecProfile.depthPull),
      ph.depth[0],
      ph.depth[1]
    );
  }
  {
    const estPower    = (ph.pow[0] + effectiveIntensity * (ph.pow[1] - ph.pow[0])) * 0.94;
    const hitHest     = (ph.hitH[0] + ph.hitH[1]) / 2;
    const flyTime     = Math.sqrt(2 * hitHest / 9.81) + hitHest / 9.81;
    const hDistMax    = estPower * flyTime * 1.10;
    const hitterDist  = Math.abs(player.pos?.y ?? HALF_L);
    const depthRemaining = hDistMax - hitterDist;
    if (depthRemaining <= 0) {
      depthFrac = ph.depth[0];
    } else {
      const depthCapFrac = clamp(depthRemaining / HALF_L, ph.depth[0], ph.depth[1]);
      if (depthFrac > depthCapFrac) depthFrac = depthCapFrac;
    }
  }
  const targetPlan = resolveTargetFromMotive(
    shotType,
    player,
    opponent,
    effectiveIntensity,
    executionQuality,
    motivePack ?? { motive, spatial }
  );
  const depthBlend = shotType === 'LOB' ? 0.85 : shotType === 'DROP' ? 0.78 : 0.64;
  depthFrac = clamp(
    depthFrac * (1 - depthBlend) + targetPlan.depthBias * depthBlend + rand(-0.05, 0.05),
    ph.depth[0],
    ph.depth[1]
  );
  if (poorExec > 0) {
    const missRoll = Math.random();
    if (missRoll < poorExecProfile.longMissChance) {
      depthFrac = clamp(
        depthFrac + poorExec * (poorExecProfile.forwardMiss + poorExecProfile.extraLongBias),
        ph.depth[0],
        ph.depth[1]
      );
    } else if (missRoll < poorExecProfile.longMissChance + poorExecProfile.wideMissChance) {
      depthFrac = clamp(
        depthFrac + rand(-0.03, 0.04),
        ph.depth[0],
        ph.depth[1]
      );
    } else if (missRoll < poorExecProfile.longMissChance + poorExecProfile.wideMissChance + poorExecProfile.netMissChance) {
      depthFrac = clamp(
        depthFrac - poorExec * (poorExecProfile.depthPull * 0.65),
        ph.depth[0],
        ph.depth[1]
      );
    } else {
      depthFrac = clamp(
        depthFrac - poorExec * (poorExecProfile.depthPull + poorExecProfile.shortDeadChance * 0.08),
        ph.depth[0],
        ph.depth[1]
      );
    }
  }
  let targetX = clamp(targetPlan.targetX, -HALF_S + 0.15, HALF_S - 0.15);
  let targetY = -side * depthFrac * HALF_L;
  if (poorExec > 0) {
    const lateralMiss = poorExec * poorExecProfile.lateralSpray * HALF_S;
    targetX = clamp(targetX + rand(-lateralMiss, lateralMiss), -HALF_S * 1.28, HALF_S * 1.28);
    targetY += -side * poorExec * poorExecProfile.forwardMiss * HALF_L * rand(-0.85, 1.15);
  }
  const powRange  = ph.pow[1] - ph.pow[0];
  const qualityPowerScale = executionQuality < 0.55
    ? (0.64 + executionQuality * 0.30)
    : (0.76 + executionQuality * 0.18);
  let power       = (ph.pow[0] + effectiveIntensity * powRange) * qualityPowerScale * poorExecProfile.powerScale;
  if (poorExec > 0 && (shotType === 'ACCEL' || shotType === 'SHORT_ACCEL' || shotType === 'TOPSPIN')) {
    const aggressionFloor = shotType === 'ACCEL' ? 0.80 : shotType === 'SHORT_ACCEL' ? 0.74 : 0.68;
    const basePower = ph.pow[0] + effectiveIntensity * powRange;
    power = Math.max(power, basePower * aggressionFloor);
  }
  const clrRange  = ph.clr[1] - ph.clr[0];
  const poorExecClearance = poorExec > 0 ? poorExecProfile.clearanceBias + poorExec * 0.06 : 0;
  const netClear  = ph.clr[1] - effectiveIntensity * clrRange * 0.75 + poorExecClearance;
  const spinMag   = 1.5 * (1.0 - effectiveIntensity * 0.35) * (0.88 + executionQuality * 0.16);
  const hitHeight = rand(ph.hitH[0], ph.hitH[1]);
  const spinX     = ph.spinFn ? ph.spinFn(spinMag, targetY) : 0;
  const spinZ     = ph.spinZ  ? ph.spinZ(spinMag)           : 0;
  const spinType  = SPIN_MAP[shotType] === 1 ? 'TOP'
                  : SPIN_MAP[shotType] === -1 ? 'SLICE'
                  : 'FLAT';
  return {
    type: shotType,
    targetX,
    targetY,
    power,
    hitHeight,
    netClearance: netClear,
    spinType,
    spinX,
    spinZ,
    zone: 'NEUTRAL',
    _sigQualityBonus: 0,
    _executionQuality: executionQuality,
    _shotIntensity: effectiveIntensity,
    _dirChoice: targetPlan.dirChoice,
    _motive: motive,
  };
}

// ─────────────────────────────────────────────────────────────────
// ENTRADA PRINCIPAL
// ─────────────────────────────────────────────────────────────────

/**
 * Decide e constrói o shot completo usando as 6 camadas.
 *
 * @param {object} player      — jogador que vai bater
 * @param {object} opponent    — adversário
 * @param {number} prepQuality — qualidade de prep das camadas 0-1
 * @param {object} opts        — { gsRally, isSlowBall, scoreState, contactSpace, swingPrep, feasibility }
 *
 * scoreState: { importance: 1.0|1.4|1.6|2.0, isBreakPoint, isMatchPoint }
 *
 * @returns {{ shot, aiTrace, executionQuality }}
 */
export function decideShotAndBuild(player, opponent, prepQuality, opts = {}) {
  const attrs = player.attrs ?? {};

  // ── Prefs: campo baked no player runtime, ou gera on-the-fly ─────
  const prefs = player.prefs ?? generatePrefs(attrs);

  // ── VOLLEY / SMASH — lógica especial, bypass total ───────────────
  if (player.atNet) {
    const lobReceived = (player.ctx?.lobsReceived ?? 0) > 0 && (opts.ballZ ?? 0) > 1.8;
    const type = lobReceived ? 'SMASH' : 'VOLLEY';
    const execQ = computeExecutionQuality(type, attrs, prepQuality, opts.scoreState, false, player);
    const vIntensity = computeShotIntensity(type, player, opponent, prepQuality, prefs, player.ctx);
    const volleyMotive = {
      motive: lobReceived
        ? 'FINISH_OPEN'
        : ((opponent?.atNet ?? false) ? 'JAM_BODY' : (Math.abs(opponent?.pos?.x ?? 0) > 0.65 ? 'FINISH_OPEN' : 'PRESS_OPEN')),
      spatial: computeSpatialContext(player, opponent),
    };
    const shot = buildShotWithPrefs(type, player, opponent, execQ, prefs, vIntensity, volleyMotive);
    shot.type  = type;
    return { shot, aiTrace: null, executionQuality: execQ };
  }

  const rally = opts.gsRally ?? 0;

  // ── Camada 3: Scores situacionais ────────────────────────────────
  const situScores = computeSituationalScores(player, opponent, prepQuality, attrs, opts, prefs);

  // ── Camada 3b: Adaptação mid-match (_matchRead + _setAdjust) ─────
  const adaptedScores = applyMatchReadModifiers(situScores, player);

  // ── Camada 4: Modificadores de perfil ────────────────────────────
  const finalScores = applyPrefsModifiers(adaptedScores, prefs, rally, opponent, player);

  // ── Camada 4b: Viés da Signature Natural ─────────────────────────
  // Aumenta o score do baseType da assinatura do jogador para que o
  // AI escolha esse golpe com mais frequência — criando oportunidades
  // para a assinatura ativar. Nunca eleva um shot zerado pelo
  // feasibility (só boostra scores já > 0).
  //
  // base_boost = 0.48; signatures raras (activationBase baixo) recebem
  // boost maior para compensar a baixa taxa de ativação. Cap: 0.65.
  const sigBoostedScores = { ...finalScores };
  const _natSigKey = player.naturalSignature ?? null;
  const _cchSigKey = player.coach?.signature   ?? null;
  for (const sigKey of [_natSigKey, _cchSigKey]) {
    if (!sigKey) continue;
    const sig = SIGNATURE_SHOTS[sigKey];
    if (!sig) continue;
    const base = sig.baseType;
    if (!base || !(sigBoostedScores[base] > 0)) continue;   // só boostra score já positivo
    const actBase  = sig.activationBase ?? 0.18;
    const rarity   = clamp((0.20 - actBase) / 0.15, 0, 1);  // 0 → common, 1 → very rare
    const boost    = clamp(0.48 + rarity * 0.17, 0.48, 0.65);
    // Coach signature vale metade do natural
    sigBoostedScores[base] += (sigKey === _natSigKey ? boost : boost * 0.5);
  }

  // ── Camada 5: Pick probabilístico ────────────────────────────────
  const temp     = computeTemperature(attrs, player.ctx, player);
  const shotType = softmaxPick(sigBoostedScores, temp);

  // ── Camada 6: Qualidade de execução ──────────────────────────────
  const isBackhand = opts.isBackhand ?? false;
  player._isBackhand = isBackhand; // usado por computeShotIntensity
  const executionQuality = computeExecutionQuality(
    shotType, attrs, prepQuality, opts.scoreState, isBackhand, player
  );

  // ── Intensidade do golpe — a "barrinha" ───────────────────────────
  const baseShotIntensity = computeShotIntensity(
    shotType, player, opponent, prepQuality, prefs, { ...player.ctx, gsRally: rally }
  );
  const sequencePlanIntensity =
    (player?.ctx?._servePatternPlan?.active && rally <= (player.ctx._servePatternPlan.expiresRally ?? 1))
      ? (player.ctx._servePatternPlan.intensityBonus ?? 0)
      : (player?.ctx?._returnRecoveryPlan?.active && rally <= (player.ctx._returnRecoveryPlan.expiresRally ?? 2))
        ? (player.ctx._returnRecoveryPlan.intensityBonus ?? 0)
        : 0;
  const shotIntensity = clamp(baseShotIntensity + sequencePlanIntensity, 0.05, 0.98);
  const motivePack = chooseShotMotive(
    player,
    opponent,
    shotType,
    prefs,
    prepQuality,
    shotIntensity,
    executionQuality,
    finalScores,
    opts
  );
  // ?????? Construir o shot com prefs de dire????o ???????????????????????????????????????????????????????????????????????????
  const shot = buildShotWithPrefs(shotType, player, opponent, executionQuality, prefs, shotIntensity, motivePack);
  {
    const netIntent = clamp(player?.ctx?.netIntent ?? 0, 0, 1);
    const currentIntent = player?.ctx?.currentIntent ?? 'BUILD';
    const typeFit =
      shotType === 'ACCEL'       ? 1.00 :
      shotType === 'SHORT_ACCEL' ? 0.86 :
      shotType === 'SLICE'       ? 0.74 :
      shotType === 'TOPSPIN'     ? 0.40 :
      shotType === 'BANANA'      ? 0.18 :
      shotType === 'DROP'        ? 0.10 :
      0.0;
    const intentBonus = currentIntent === 'FINISH'   ? 0.14
                      : currentIntent === 'PRESSURE' ? 0.08
                      : 0.0;
    shot._approachIntent = clamp(typeFit * 0.70 + netIntent * 0.45 + intentBonus, 0, 1);
    shot._approachFit = typeFit;
  }

  // ── FASE 7: Signature Shots ────────────────────────────────────────
  // Wing é determinado pelo player._isBackhand calculado em game.js
  const _sigWing = player.atNet ? 'NET'
    : (opts.isServe ? 'SERVE'
    : (isBackhand ? 'BH' : 'FH'));
  const isBigPoint = !!(opts?.isBigPoint || opts?.scoreState?.isBreakPoint || opts?.scoreState?.isMatchPoint);
  const sigResult = applySignatureLayer(player, shotType, _sigWing, prepQuality, { isBigPoint });
  if (sigResult.triggered) {
    applySignaturePhysics(shot, sigResult.physics, shotType, player);
  }
  // ── fim Fase 7 ──────────────────────────────────────────────────────

  // ── _aiTrace: compatibilidade com trace.js ────────────────────────
  // Popula a estrutura que trace.js e o sistema legado esperam.
  const oppAtNet = opponent?.atNet ?? false;
  const ballTierForTrace = player.ctx?._lastBallTier ?? 'NEUTRAL';
  const intent = oppAtNet
    ? (prepQuality >= 0.65 ? 'FINISH' : 'RESET')
    : (ballTierForTrace === 'OPPORTUNITY' && finalScores.ACCEL > 0.30 ? 'FINISH'
      : ballTierForTrace === 'OPPORTUNITY'                             ? 'PRESSURE'
      : ballTierForTrace === 'DIFFICULT'                               ? 'RESET'
      : prepQuality > 0.55                                             ? 'PRESSURE'
      : 'BUILD');

  const scored = Object.entries(finalScores)
    .filter(([, v]) => v > 0)
    .map(([k, v]) => ({
      EV:  v,
      c: {
        shotType:    k,
        targetX:     shot.targetX,
        targetDepth: Math.abs(shot.targetY) / HALF_L,
        power:       (shot.power ?? 0) / 50,  // normalizado
        intentTags:  [intent, shot._motive ?? 'NEUTRALIZE'],
      },
      sub: {
        safety:   1 - (RISK_BASE[k] ?? 0.04) * 8,
        pressure: k === 'ACCEL' || k === 'SHORT_ACCEL' || k === 'BANANA' ? 0.80 : 0.40,
        finish:   k === 'ACCEL' || k === 'DROP'        ? 0.75 : 0.30,
        rhythm:   k === 'TOPSPIN' || k === 'SLICE' ? 0.70 : 0.35,
        angle:    k === 'SHORT_ACCEL' || k === 'BANANA' ? 0.80 : 0.30,
        depth:    k === 'TOPSPIN' || k === 'ACCEL'     ? 0.70 : 0.40,
      },
      desiredDepth: shot.targetY != null ? Math.abs(shot.targetY) / HALF_L : null,
    }))
    .sort((a, b) => b.EV - a.EV);

  // chosen = o candidato que foi efetivamente escolhido
  const chosen = scored.find(s => s.c.shotType === shotType) ?? scored[0];
  if (chosen) chosen._evProbWin = clamp(finalScores[shotType] ?? 0.4, 0, 1);

  // [Signature physics removed — will be rebuilt]

  const aiTrace = {
    scored,
    chosen,
    chosenDirLabel: shot._dirChoice ?? 'CC',
    signatureShotTriggered: sigResult.triggered ? sigResult.signatureKey : null,
    signatureLabel:         sigResult.triggered ? sigResult.label        : null,
    signatureEmoji:         sigResult.triggered ? sigResult.emoji        : null,
    signatureSource:        sigResult.triggered ? sigResult.source       : null,
    rallyPatternApplied: prefs.buildStyle,
    sc: {
      intent,
      motive:       shot._motive ?? 'NEUTRALIZE',
      ballTier:     ballTierForTrace,
      easyBall:     ballTierForTrace === 'OPPORTUNITY',
      toughBall:    ballTierForTrace === 'DIFFICULT',
      temperature:  +temp.toFixed(3),
    },
  };

  return { shot, aiTrace, executionQuality };
}




