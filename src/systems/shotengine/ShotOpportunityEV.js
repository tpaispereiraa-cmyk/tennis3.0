import { clamp } from '../../core/math.js';
import { ShotIntent } from './ShotTypes.js';
import { SHOT_TUNING } from './ShotTuning.js';
import { resolveShotStyle } from './ShotStyle.js';

export const RallyEVState = Object.freeze({
  DEFEND: 'DEFEND',
  RESET: 'RESET',
  CONSTRUCTION: 'CONSTRUCTION',
  PRESSURE: 'PRESSURE',
  FINISH: 'FINISH',
});

function rounded(value) {
  return +clamp(value, 0, 1).toFixed(3);
}

function pushReason(reasons, key, value, gate = 0.01) {
  if (Math.abs(value) >= gate) reasons.push(key);
}

export function evaluateShotOpportunityEV(context, quality) {
  const tune = SHOT_TUNING.rallyEV;
  const q = quality?.quality ?? 0.5;
  const bodyState = quality?.bodyState ?? '';
  const style = resolveShotStyle(context);
  const ready = context?.body?.contactReadiness ?? 0;
  const settle = context?.body?.contactSettleTime ?? 0;
  const arrivalMargin = context?.body?.arrivalMargin ?? 0;
  const pressure = context?.player?.ctx?.rallyPressure ?? 0;
  const momentum = clamp(context?.player?.ctx?.momentum ?? 0.5, 0, 1);
  const momentumEdge = clamp((momentum - 0.5) * 2, 0, 1);
  const momentumBias = clamp((momentum - 0.5) * 2, -1, 1);
  const serveAdvantage = context?.serveAdvantage ?? {};
  const courtMods = context?.gs?.courtMods ?? {};
  const serveAdvantageLevel = serveAdvantage?.level ?? 'NONE';
  const rally = context?.score?.rally ?? 0;
  // A devolução pode tirar a vantagem imediatamente, mas não existe um reset
  // mágico após o +1. Uma entrega dominante ainda deixa eco espacial no +2.
  const serveAdvantageDecay = rally <= 1 ? 1 : rally === 2 ? 0.52 : rally === 3 ? 0.18 : 0;
  const serveAdvantageScore = clamp((serveAdvantage?.score ?? 0) * serveAdvantageDecay, 0, 1);
  const attackableReturn = !!serveAdvantage?.attackableReturn && serveAdvantageDecay > 0;
  const memory = context?.memory ?? {};
  const oppX = Math.abs(context?.opponent?.pos?.x ?? 0);
  const oppY = Math.abs(context?.opponent?.pos?.y ?? 0);
  const playerX = Math.abs(context?.player?.pos?.x ?? 0);
  const ballY = Math.abs(context?.ballState?.pos?.y ?? 0);
  const ballZ = context?.ballState?.z ?? 0.9;
  const ballVz = context?.ballState?.vz ?? 0;
  const highEasyBounce = (context?.ballState?.bounceCount ?? 0) >= 1
    && context?.ballState?.lastBounceSide === context?.side
    && ballZ >= 0.98
    && ballZ <= 2.85
    && ballVz > -0.18
    && ready >= 0.46
    && arrivalMargin >= -0.05
    && q >= 0.50
    && bodyState !== 'STRETCHED'
    && bodyState !== 'LATE';

  const lowPickup = bodyState === 'LOW_PICKUP' || ballZ < tune.lowBallZ;
  const late = bodyState === 'LATE' || bodyState === 'STRETCHED' || arrivalMargin < tune.lateArrivalMargin;
  const planted = bodyState === 'PLANTED' || bodyState === 'ON_RISE';
  const prepared = planted || ready >= tune.preparedReadiness || settle >= tune.preparedSettle;
  const cleanContact = prepared && q >= tune.cleanQuality && arrivalMargin >= tune.cleanArrivalMargin && !lowPickup && !late;
  const ballShort = ballY < tune.shortBallY;
  const playerWide = playerX > tune.playerWideX;
  const rivalWide = oppX > tune.rivalWideX;
  const rivalVeryWide = oppX > tune.rivalVeryWideX;
  const rivalDeep = oppY > tune.rivalDeepY;
  const rivalVeryDeep = oppY > tune.rivalVeryDeepY;
  const rivalExposed = rivalWide || rivalDeep;
  const lowButAttackable = lowPickup
    && !late
    && q >= 0.48
    && (prepared || ready >= 0.46 || settle >= 0.16)
    && arrivalMargin >= -0.025
    && (rivalExposed || serveAdvantageScore >= 0.45 || attackableReturn || style.earlyStrike);
  const reasons = [];

  const contactEV = clamp(
    q * tune.qualityWeight +
    ready * tune.readinessWeight +
    clamp((arrivalMargin + 0.12) / 0.24, 0, 1) * tune.arrivalWeight +
    (prepared ? tune.preparedBonus : 0) +
    (late ? -tune.latePenalty : 0) +
    (lowPickup ? -(lowButAttackable ? tune.lowAttackablePenalty : tune.lowPickupPenalty) : 0),
    0,
    1,
  );

  const exposureEV = clamp(
    (rivalWide ? tune.rivalWideBonus : 0) +
    (rivalVeryWide ? tune.rivalVeryWideBonus : 0) +
    (rivalDeep ? tune.rivalDeepBonus : 0) +
    (rivalVeryDeep ? tune.rivalVeryDeepBonus : 0) +
    (ballShort ? tune.shortBallBonus : 0),
    0,
    1,
  );

  // Quadras rápidas amadurecem a urgência antes; quadras lentas sustentam a
  // construção. O dado já existia em courtConfigs, mas não chegava à decisão.
  const rallyLengthMult = clamp(courtMods?.rallyLengthMult ?? 1, 0.55, 2.2);
  const rallyEV = clamp(rally / Math.max(2, tune.longRallyAt * rallyLengthMult), 0, 1);
  const antiLoopEV = clamp(
    (memory?.sliceLoop ?? 0) * tune.sliceLoopPressure +
    (memory?.softLoop ?? 0) * tune.softLoopPressure +
    ((memory?.rallyPlan === 'CHANGE_PATTERN' || memory?.rallyPlan === 'CASH_IN') ? tune.memoryPlanBonus : 0),
    0,
    1,
  );

  const styleEV = clamp(
    (style.earlyStrike ? tune.earlyStyleBonus : 0) +
    (style.needsAdvantage ? -tune.grinderStylePenalty : 0) +
    style.flatBias * tune.styleBiasWeight +
    style.topspinBias * tune.styleBiasWeight +
    style.dropBias * tune.styleBiasWeight +
    momentumBias * Math.max(tune.momentumStyleWeight, 0.05) +
    serveAdvantageScore * tune.serveAdvStyleWeight,
    0,
    1,
  );

  const safetyEV = clamp(
    contactEV -
    pressure * tune.pressureSafetyPenalty -
    (playerWide ? tune.playerWideSafetyPenalty : 0) +
    style.safetyBias -
    serveAdvantageScore * tune.serveAdvSafetyPenalty,
    0,
    1,
  );
  const pressureEV = clamp(
    safetyEV * tune.safetyToPressure +
    exposureEV * tune.exposureToPressure +
    rallyEV * tune.rallyPressureBonus +
    antiLoopEV * tune.variationPressureBonus +
    styleEV * tune.stylePressureBonus -
    pressure * tune.pressureAttackPenalty +
    serveAdvantageScore * tune.serveAdvPressureWeight +
    (attackableReturn && cleanContact ? tune.easyReturnPressureBonus : 0) +
    momentumBias * Math.max(tune.momentumPressureWeight, 0.07),
    0,
    1,
  );
  const finishEV = clamp(
    safetyEV * tune.safetyToFinish +
    exposureEV * tune.exposureToFinish +
    (ballShort ? tune.shortToFinish : 0) +
    (highEasyBounce ? 0.34 : 0) +
    (style.earlyStrike ? tune.earlyFinishBonus : 0) +
    rallyEV * tune.rallyFinishBonus -
    pressure * tune.pressureFinishPenalty -
    (style.needsAdvantage && !rivalExposed && !ballShort ? tune.grinderFinishPenalty : 0) +
    serveAdvantageScore * tune.serveAdvFinishWeight +
    (attackableReturn && cleanContact ? tune.easyReturnFinishBonus : 0) +
    momentumBias * 0.065,
    0,
    1,
  );
  const defenseEV = clamp(
    (1 - safetyEV) * tune.unsafeToDefense +
    pressure * tune.pressureToDefense +
    (late ? tune.lateDefenseBonus : 0) +
    (lowPickup ? tune.lowDefenseBonus : 0) +
    (playerWide ? tune.wideDefenseBonus : 0),
    0,
    1,
  );
  const variationEV = clamp(antiLoopEV + rallyEV * tune.longRallyVariation + (memory?.directionStreak?.count ?? 0) * tune.directionLoopPressure, 0, 1);

  const underDuress = pressure > 0.74 || late || playerWide || (lowPickup && !lowButAttackable);
  const neutralized = pressure < 0.42 && !late && !playerWide;

  // ── SERVE+1 PUNISH WINDOW ────────────────────────────────────────────────
  //
  // O golpe mais importante do tênis profissional não é o saque — é o GOLPE
  // DEPOIS DO SAQUE quando o adversário devolve mal. Federer, Sampras, Sinner,
  // Djokovic constroem carreira nisso: serve forte → adversário bloca curto →
  // punição. Esse padrão se chama "plus one ball" ou "serve+1".
  //
  // PROBLEMA OBSERVADO NO LOG: sacador serve 184km/h, adversário devolve
  // SHORT_SITTER (Q:30%), sacador chega na bola atacável com Q:73%, body=MOVING,
  // serve:ACE_ZONE, easyReturn, shortBall, rivalDeep, rivalWide — finishWindow
  // computa 1.00 (!!). Mesmo assim o intent vira RESET porque o arrivalMargin
  // está -0.13 (late marginal por estar correndo para frente), o que dispara
  // `underDuress`, que sobrescreve tudo para RESET/DEFEND.
  //
  // SOLUÇÃO: detectar a janela serve+1 ANTES do underDuress decidir e dar
  // bypass explícito. No tênis real, o sacador profissional bate o "+1" mesmo
  // chegando atrasado — a vantagem do saque + retorno fácil + adversário fora
  // de posição supera qualquer timing marginal. STRETCHED legítimo (impossível
  // de bater) ainda força reset; tudo abaixo disso ataca.
  const servePlusOneWindow = attackableReturn
    && serveAdvantageScore >= 0.42
    && q >= 0.58
    && pressure < 0.72
    && bodyState !== 'STRETCHED'        // STRETCHED é genuinamente impossível
    && bodyState !== 'LATE'             // LATE bodyState também
    && arrivalMargin >= -0.18           // late marginal aceito; muito atrasado não
    && (!lowPickup || lowButAttackable); // baixa qualificada OK

  const finishWindow = clamp(
    serveAdvantageScore * 0.38 +
    exposureEV * 0.44 +
    (attackableReturn ? 0.28 : 0) +
    (ballShort ? 0.22 : 0) +
    (style.earlyStrike ? 0.10 : 0) -
    (underDuress && !servePlusOneWindow ? 0.18 : 0),
    0,
    1,
  );

  const tacticalPressure = clamp(
    serveAdvantageScore * 0.46 +
    exposureEV * 0.34 +
    styleEV * 0.24 +
    rallyEV * 0.10 +
    momentumBias * 0.09 +
    (attackableReturn ? 0.22 : 0) +
    (ballShort ? 0.16 : 0),
    0,
    1,
  );
  // O all-court técnico não recebe winner gratuito. Ele converte leitura e
  // controle em pressão somente depois de preparar o ponto e deslocar o rival.
  const constructionWindow = style.allCourtConstructor
    && cleanContact
    && !late
    && rally >= 2
    && (rivalExposed || attackableReturn || ballShort);
  const constructionPressure = constructionWindow ? (style.constructionPressure ?? 0) : 0;
  const constructionFinish = constructionWindow && rally >= (style.finishRally ?? 3)
    ? (style.constructionFinish ?? 0)
    : 0;
  const adjustedTacticalPressure = clamp(tacticalPressure + constructionPressure, 0, 1);
  const adjustedFinishWindow = clamp(finishWindow + constructionFinish, 0, 1);

  let recommendedIntent = ShotIntent.BUILD;
  if (servePlusOneWindow) {
    // Bypass do underDuress: serve+1 é ARMA, não recuo. FINISH se janela limpa,
    // PRESSURE caso contrário. O slice approach até é viável aqui, mas a
    // decisão NUNCA é RESET pós saque+devolução fraca.
    const cleanPunish = q >= 0.70 && (ballShort || rivalExposed) && !lowPickup;
    recommendedIntent = cleanPunish ? ShotIntent.FINISH : ShotIntent.PRESSURE;
  } else if (underDuress) {
    // "playerWide" e "late por pouco" não devem mandar para DEFEND quando o jogador
    // ainda tem qualidade de contato alta — esses casos devem virar RESET no máximo.
    // DEFEND fica reservado para: pressão real alta, timing muito atrasado,
    // ou posição wide E genuinamente insegura (safetyEV baixo).
    const trueDefend = pressure > 0.84
      || (late && arrivalMargin < -0.13)        // verdadeiramente tarde, não 1ms além do threshold
      || (playerWide && safetyEV < 0.38);       // wide E sem segurança de contato
    recommendedIntent = trueDefend ? ShotIntent.DEFEND : ShotIntent.RESET;
  } else if (highEasyBounce && finishEV >= 0.52) {
    recommendedIntent = ShotIntent.FINISH;
  } else if (adjustedFinishWindow >= 0.64) {
    // finishRally: gate de paciência — jogadores pacientes não tentam FINISH antes
    // de construírem o rally mínimo. EXPLOSIVE e FIRST_STRIKE ignoram o gate (finishRally <= 2).
    const earlyForStyle = rally >= (style.finishRally ?? 3);
    recommendedIntent = earlyForStyle ? ShotIntent.FINISH : ShotIntent.PRESSURE;
  } else if (adjustedTacticalPressure >= 0.44) {
    recommendedIntent = ShotIntent.PRESSURE;
  } else if (neutralized || variationEV >= tune.controlVariationThreshold) {
    recommendedIntent = ShotIntent.BUILD;
  }
  if (memory?.pointPlan?.type === 'REDIRECT_PATTERN' && q >= 0.56 && !late && arrivalMargin >= -0.07) {
    recommendedIntent = ShotIntent.REDIRECT;
  } else if (memory?.pointPlan?.type === 'ATTACK_SPACE' && q >= 0.62 && pressure < 0.68 && !late) {
    recommendedIntent = finishEV + constructionFinish >= 0.62 ? ShotIntent.FINISH : ShotIntent.PRESSURE;
  }
  // COUNTER_REDIRECT (Murray/Medvedev/Schwartzman): "RESET é arma, não recuo"
  // — porém o sentido tático é REDIRECIONAR sob pressão, não recuar.
  //
  // FIX: antes mandava BUILD → RESET sob pressão moderada, contradizendo o
  // próprio nome do estilo. Agora:
  //   - Pressão moderada (0.38–0.74) + contato decente → PRESSURE (redireciona)
  //   - Pressão alta sem contato decente → RESET (slice paralela alto)
  //   - Pressão baixa: deixa o EV normal decidir
  if (style.counterRedirect && pressure > 0.38) {
    const canRedirect = !lowPickup && !late && q >= 0.50 && arrivalMargin >= -0.06;
    if (recommendedIntent === ShotIntent.BUILD || recommendedIntent === ShotIntent.RESET) {
      if (canRedirect && pressure < 0.74) {
        recommendedIntent = ShotIntent.REDIRECT; // contraataque classico
      } else if (!canRedirect && pressure > 0.58) {
        recommendedIntent = ShotIntent.RESET;    // só recua quando realmente preciso
      }
    }
  }

  let rallyState = RallyEVState.CONSTRUCTION;
  if (recommendedIntent === ShotIntent.DEFEND) rallyState = RallyEVState.DEFEND;
  else if (recommendedIntent === ShotIntent.RESET) rallyState = RallyEVState.RESET;
  else if (recommendedIntent === ShotIntent.FINISH) rallyState = RallyEVState.FINISH;
  else if (recommendedIntent === ShotIntent.PRESSURE || recommendedIntent === ShotIntent.REDIRECT) rallyState = RallyEVState.PRESSURE;
  const stateReason = [
    rallyState,
    serveAdvantageScore > 0.10 ? `serve:${serveAdvantageLevel}` : null,
    attackableReturn ? 'easyReturn' : null,
    momentumBias > 0.05 ? 'momentumHigh' : momentumBias < -0.05 ? 'momentumLow' : null,
    rivalExposed ? 'rivalExposed' : null,
    cleanContact ? 'cleanContact' : null,
    lowButAttackable ? 'attackableLow' : null,
    highEasyBounce ? 'highEasyBounce' : null,
    late || lowPickup ? 'contactRisk' : null,
  ].filter(Boolean).join('|');

  pushReason(reasons, 'prepared', prepared ? 1 : 0);
  pushReason(reasons, 'cleanContact', cleanContact ? 1 : 0);
  pushReason(reasons, 'lowBall', lowPickup ? 1 : 0);
  pushReason(reasons, 'attackableLow', lowButAttackable ? 1 : 0);
  pushReason(reasons, 'highEasyBounce', highEasyBounce ? 1 : 0);
  pushReason(reasons, 'late', late ? 1 : 0);
  pushReason(reasons, 'rivalWide', rivalWide ? 1 : 0);
  pushReason(reasons, 'rivalDeep', rivalDeep ? 1 : 0);
  pushReason(reasons, 'shortBall', ballShort ? 1 : 0);
  pushReason(reasons, 'antiLoop', antiLoopEV);
  pushReason(reasons, 'serveAdv', serveAdvantageScore);
  pushReason(reasons, 'easyReturn', attackableReturn ? 1 : 0);
  pushReason(reasons, 'momentum', momentumBias);
  pushReason(reasons, `style:${style.archetype}`, styleEV);

  const confidence = clamp(
    Math.max(safetyEV, pressureEV, finishEV, defenseEV) * 0.72 +
    Math.abs(finishEV - pressureEV) * 0.14 +
    Math.abs(safetyEV - defenseEV) * 0.14,
    0,
    1,
  );

  return Object.freeze({
    safetyEV: rounded(safetyEV),
    pressureEV: rounded(pressureEV),
    finishEV: rounded(finishEV),
    defenseEV: rounded(defenseEV),
    variationEV: rounded(variationEV),
    styleEV: rounded(styleEV),
    constructionPressure: rounded(constructionPressure),
    constructionFinish: rounded(constructionFinish),
    contactEV: rounded(contactEV),
    exposureEV: rounded(exposureEV),
    rallyState,
    serveAdvantageLevel,
    serveAdvantageScore: rounded(serveAdvantageScore),
    stateReason,
    recommendedIntent,
    confidence: rounded(confidence),
    reasons: Object.freeze(reasons),
    styleSubType: style.archetype,
    style,
    flags: Object.freeze({
      prepared,
      cleanContact,
      lowPickup,
      lowButAttackable,
      highEasyBounce,
      late,
      ballShort,
      playerWide,
      rivalWide,
      rivalDeep,
      rivalExposed,
      attackableReturn,
    }),
  });
}
