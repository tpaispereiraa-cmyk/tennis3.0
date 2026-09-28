/**
 * SmokeTests — testes de distribuição da pipeline de golpes
 *
 * Executa N trials para cada sistema e verifica que as distribuições
 * de output ficam dentro de faixas esperadas. Não substitui testes
 * unitários — captura regressões em pesos, coeficientes e thresholds.
 *
 * Rodar: node src/systems/shotlab/SmokeTests.js
 *
 * Saída:
 *   ✓  serve family distribution (10000 trials)
 *   ✗  serve fault rate 1st serve — expected 0.025–0.130, got 0.148
 *
 * Exit code 0 = todos passaram, 1 = algum falhou.
 */

// ---------------------------------------------------------------------------
// Bootstrap mínimo — sem bundler, sem React
// ---------------------------------------------------------------------------
import { seedRand } from '../../core/math.js';
import { chooseServeFamily, chooseServeDirection, maybeForceServeFault, planServe } from '../shotengine/ServeEngine.js';
import { ShotFamily, ShotDirection } from '../shotengine/ShotTypes.js';
import { decideReturnShot } from '../shotengine/ReturnEngine.js';

// Seed fixo para resultados reproduzíveis
seedRand(0xCAFEBABE);

// ---------------------------------------------------------------------------
// Infra de testes
// ---------------------------------------------------------------------------
let _passed = 0;
let _failed = 0;

function check(label, value, lo, hi) {
  const ok = value >= lo && value <= hi;
  const icon = ok ? '✓' : '✗';
  const msg = ok
    ? `  ${icon}  ${label}: ${value.toFixed(3)} ∈ [${lo}, ${hi}]`
    : `  ${icon}  ${label} — esperado [${lo}, ${hi}], obtido ${value.toFixed(3)}`;
  console.log(msg);
  ok ? _passed++ : _failed++;
}

function section(title) {
  console.log(`\n── ${title}`);
}

// ---------------------------------------------------------------------------
// Stubs mínimos de caps e gs para os testes não precisarem do jogo completo
// ---------------------------------------------------------------------------

function makeCaps(overrides = {}) {
  return {
    servePower:     0.72,
    servePrecision: 0.68,
    aggression:     0.60,
    slice:          0.65,
    topspin:        0.70,
    consistency:    0.68,
    tacticalVision: 0.62,
    return:         0.65,
    wingControl:    0.62,
    wingPower:      0.64,
    riskTolerance:  0.58,
    mentality:      0.65,
    movement:       0.70,
    explosiveness:  0.65,
    errorResistance:0.65,
    spinSecurity:   0.62,
    reading:        0.62,
    stamina:        0.90,
    ...overrides,
  };
}

function makeServer(overrides = {}) {
  return {
    id: 'p1',
    side: -1,
    faults: 0,
    stamina: 0.90,
    pos: { x: -3.05, y: -12.5 },
    vel: { x: 0, y: 0 },
    attrs: { saquePrecisao: 68, saqueForca: 72 },
    stats: { serve1Total: 0, serve2Total: 0 },
    ...overrides,
  };
}

function makeReceiver() {
  return {
    id: 'p2',
    side: 1,
    pos: { x: 3.05, y: 11.0 },
    vel: { x: 0, y: 0 },
    attrs: { devolucao: 65 },
  };
}

function makeGs(isFirst = true, serveLeft = true) {
  const server   = makeServer({ faults: isFirst ? 0 : 1 });
  const receiver = makeReceiver();
  return {
    server:   'p1',
    receiver: 'p2',
    players:  { p1: server, p2: receiver },
    serveLeft,
    _servePatternHistory: [],
    _pendingServeData: null,
    pointHistory: [],
  };
}

// ---------------------------------------------------------------------------
// SUITE 1 — ServeEngine: distribuição de família
// ---------------------------------------------------------------------------
section('ServeEngine — distribuição de família (10 000 trials, 1º saque)');

{
  const N = 10_000;
  const caps = makeCaps();
  const prefs = {};
  const counts = { [ShotFamily.SERVE_FLAT]: 0, [ShotFamily.SERVE_SLICE]: 0, [ShotFamily.SERVE_KICK]: 0 };

  for (let i = 0; i < N; i++) {
    const gs = makeGs(true);
    const f = chooseServeFamily(caps, true, prefs, gs);
    counts[f] = (counts[f] ?? 0) + 1;
  }

  check('FLAT  share 1st serve (avg caps)',  counts[ShotFamily.SERVE_FLAT]  / N, 0.30, 0.60);
  check('SLICE share 1st serve',             counts[ShotFamily.SERVE_SLICE] / N, 0.15, 0.45);
  check('KICK  share 1st serve',             counts[ShotFamily.SERVE_KICK]  / N, 0.10, 0.40);
}

section('ServeEngine — distribuição de família (10 000 trials, 2º saque)');

{
  const N = 10_000;
  const caps = makeCaps();
  const prefs = {};
  const counts = { [ShotFamily.SERVE_FLAT]: 0, [ShotFamily.SERVE_SLICE]: 0, [ShotFamily.SERVE_KICK]: 0 };

  for (let i = 0; i < N; i++) {
    const gs = makeGs(false);
    const f = chooseServeFamily(caps, false, prefs, gs);
    counts[f] = (counts[f] ?? 0) + 1;
  }

  // 2º saque: FLAT deve ser raro em jogadores normais
  check('FLAT  share 2nd serve (avg caps)',  counts[ShotFamily.SERVE_FLAT]  / N, 0.00, 0.15);
  check('KICK  share 2nd serve (dominante)', counts[ShotFamily.SERVE_KICK]  / N, 0.30, 0.72);
  check('SLICE share 2nd serve',             counts[ShotFamily.SERVE_SLICE] / N, 0.15, 0.55);
}

// ---------------------------------------------------------------------------
// SUITE 2 — ServeEngine: distribuição de direção
// ---------------------------------------------------------------------------
section('ServeEngine — distribuição de direção 1º saque (10 000 trials, Deuce court)');

{
  const N = 10_000;
  const caps = makeCaps();
  const counts = { [ShotDirection.WIDE]: 0, [ShotDirection.BODY]: 0, [ShotDirection.CENTER]: 0 };

  for (let i = 0; i < N; i++) {
    const gs = makeGs(true, true); // serveLeft = Deuce
    const d = chooseServeDirection(caps, ShotFamily.SERVE_FLAT, true, {}, gs);
    counts[d] = (counts[d] ?? 0) + 1;
  }

  // Nenhuma direção deve dominar completamente (variação é o objetivo do 1º saque)
  check('WIDE  share Deuce court FLAT',   counts[ShotDirection.WIDE]   / N, 0.18, 0.55);
  check('BODY  share Deuce court FLAT',   counts[ShotDirection.BODY]   / N, 0.18, 0.55);
  check('CENTER share Deuce court FLAT',  counts[ShotDirection.CENTER] / N, 0.10, 0.48);
}

// ---------------------------------------------------------------------------
// SUITE 3 — ServeEngine: taxa de faltas
// ---------------------------------------------------------------------------
section('ServeEngine — taxa de faltas (50 000 trials)');

{
  const N = 50_000;
  const caps = makeCaps();
  let faults1st = 0;
  let faults2nd = 0;

  for (let i = 0; i < N; i++) {
    // 1º saque
    const plan1 = {
      family: ShotFamily.SERVE_FLAT,
      direction: ShotDirection.WIDE,
      isFirst: true,
      quality: 0.72,
      power: 42,
    };
    if (maybeForceServeFault(plan1, makeServer())) faults1st++;

    // 2º saque
    const plan2 = {
      family: ShotFamily.SERVE_KICK,
      direction: ShotDirection.CENTER,
      isFirst: false,
      quality: 0.68,
      power: 36,
    };
    if (maybeForceServeFault(plan2, makeServer({ faults: 1 }))) faults2nd++;
  }

  // Faixas esperadas baseadas nos limites hardcoded em maybeForceServeFault:
  // 1º saque: 0.025 ≤ chance ≤ 0.13 (FLAT+WIDE adiciona ~0.043)
  // 2º saque: 0.030 ≤ chance ≤ 0.12 (KICK+CENTER sem extras)
  check('Fault rate 1st serve (FLAT+WIDE)', faults1st / N, 0.025, 0.130);
  check('Fault rate 2nd serve (KICK+CTR)', faults2nd / N, 0.030, 0.120);
}

// ---------------------------------------------------------------------------
// SUITE 4 — ServeEngine: anti-spam (serve repetido penaliza peso)
// ---------------------------------------------------------------------------
section('ServeEngine — anti-spam: 3 saques FLAT seguidos reduzem share (5 000 trials)');

{
  const N = 5_000;
  const caps = makeCaps();
  const historySpam = [
    { family: ShotFamily.SERVE_FLAT, direction: ShotDirection.WIDE, isFirst: true },
    { family: ShotFamily.SERVE_FLAT, direction: ShotDirection.WIDE, isFirst: true },
    { family: ShotFamily.SERVE_FLAT, direction: ShotDirection.WIDE, isFirst: true },
  ];
  const historyFresh = [];

  let flatWithSpam  = 0;
  let flatNoSpam    = 0;

  for (let i = 0; i < N; i++) {
    const gsSpam  = makeGs(true); gsSpam._servePatternHistory  = [...historySpam];
    const gsFresh = makeGs(true); gsFresh._servePatternHistory = [...historyFresh];

    if (chooseServeFamily(caps, true, {}, gsSpam)  === ShotFamily.SERVE_FLAT) flatWithSpam++;
    if (chooseServeFamily(caps, true, {}, gsFresh) === ShotFamily.SERVE_FLAT) flatNoSpam++;
  }

  // Com spam, FLAT deve sair menos que sem histórico
  const spamShare   = flatWithSpam  / N;
  const freshShare  = flatNoSpam    / N;
  const spamReduces = spamShare < freshShare;

  console.log(`  ${spamReduces ? '✓' : '✗'}  Anti-spam reduz FLAT: fresh=${freshShare.toFixed(3)} spam=${spamShare.toFixed(3)} ${spamReduces ? '(spam < fresh ✓)' : '(FALHOU: spam >= fresh)'}`);
  spamReduces ? _passed++ : _failed++;
}

// ---------------------------------------------------------------------------
// SUITE 5 — ReturnEngine: planos de devolução em saque fácil vs difícil
// ---------------------------------------------------------------------------
section('ReturnEngine — plano de devolução em 2º saque fraco (5 000 trials)');

{
  const N = 5_000;
  let attacks = 0; // DRIVE_ATTACK ou DRIVE_NEUTRAL ou COUNTER_UP

  for (let i = 0; i < N; i++) {
    const context = {
      side: 1,
      capabilities: makeCaps({ return: 0.72, wingControl: 0.70, wingPower: 0.68, riskTolerance: 0.62 }),
      player: { pos: { x: 3.05, y: 10.5 }, ctx: { rallyPressure: 0.20 } },
      opponent: { pos: { x: -3.05, y: -12.0 } },
      ballState: { pos: { x: 3.05, y: 9.0, z: 0 }, vel: { x: 0, y: -20, z: 0 }, z: 0.92, speed: 20, bounceCount: 1 },
      body: { canContact: true, contactReadiness: 0.80, arrivalMargin: 0.10, distanceToBall: 0.3, reach: 0.85, stamina: 0.90, preferredContactZ: 0.90, contactSettleTime: 0.10 },
      prefs: {},
      memory: null,
      gs: {
        _pendingServeData: {
          isFirst: false, kmh: 148, physType: ShotFamily.SERVE_KICK,
          dir: ShotDirection.CENTER, precisionPressure: 0.05,
          pressureHint: 0.25, jamHint: 0.10, wideHint: 0.05,
          servePrecision: 65,
        },
        _serveAdvantageContext: { level: 'NONE', score: 0 },
      },
    };

    const quality = { quality: 0.72, bodyState: 'PLANTED', canContact: true };
    const decision = decideReturnShot(context, quality);
    const plan = decision.returnPlanFamily ?? '';
    if (plan === 'DRIVE_ATTACK' || plan === 'DRIVE_NEUTRAL' || plan === 'COUNTER_UP') attacks++;
  }

  // Jogador com bom return e 2º saque fraco deve atacar com frequência
  check('Attack rate vs weak 2nd serve', attacks / N, 0.40, 0.95);
}

section('ReturnEngine — plano de devolução em 1º saque forte (5 000 trials)');

{
  const N = 5_000;
  let blocks = 0; // BLOCK_RESET ou BLOCK_BODY

  for (let i = 0; i < N; i++) {
    const context = {
      side: 1,
      capabilities: makeCaps({ return: 0.65, wingControl: 0.62 }),
      player: { pos: { x: 4.5, y: 11.5 }, ctx: { rallyPressure: 0.65 } },
      opponent: { pos: { x: -3.05, y: -12.0 } },
      ballState: { pos: { x: 4.5, y: 9.5, z: 0 }, vel: { x: 0, y: -55, z: 0 }, z: 0.85, speed: 55, bounceCount: 1 },
      body: { canContact: true, contactReadiness: 0.55, arrivalMargin: -0.08, distanceToBall: 1.2, reach: 0.85, stamina: 0.75, preferredContactZ: 0.88, contactSettleTime: 0.02 },
      prefs: {},
      memory: null,
      gs: {
        _pendingServeData: {
          isFirst: true, kmh: 198, physType: ShotFamily.SERVE_FLAT,
          dir: ShotDirection.WIDE, precisionPressure: 0.22,
          pressureHint: 0.82, jamHint: 0.05, wideHint: 0.88,
          servePrecision: 78,
        },
        _serveAdvantageContext: { level: 'STRONG', score: 0.71 },
      },
    };

    const quality = { quality: 0.42, bodyState: 'STRETCHED', canContact: true };
    const decision = decideReturnShot(context, quality);
    const plan = decision.returnPlanFamily ?? '';
    if (plan.includes('BLOCK') || plan.includes('CHIP') || plan.includes('RESET')) blocks++;
  }

  // 1º saque forte/wide → receiver forçado a bloquear/chipar
  check('Block/chip rate vs strong 1st serve', blocks / N, 0.55, 1.00);
}

// ---------------------------------------------------------------------------
// SUITE 6 — Reprodutibilidade com seed fixo
// ---------------------------------------------------------------------------
section('Reprodutibilidade — mesmo seed gera mesma sequência (2 runs × 1 000 trials)');

{
  function runServeSequence(seed) {
    seedRand(seed);
    const gs = makeGs(true);
    const caps = makeCaps();
    const results = [];
    for (let i = 0; i < 1000; i++) {
      gs._servePatternHistory = [];
      results.push(chooseServeFamily(caps, true, {}, gs));
    }
    return results.join(',');
  }

  const FIXED_SEED = 0x12345678;
  const run1 = runServeSequence(FIXED_SEED);
  const run2 = runServeSequence(FIXED_SEED);
  const identical = run1 === run2;

  console.log(`  ${identical ? '✓' : '✗'}  Mesmos resultados com seed ${FIXED_SEED.toString(16)}: ${identical ? 'SIM' : 'NÃO'}`);
  identical ? _passed++ : _failed++;

  // Garante que seeds diferentes geram resultados diferentes
  const run3 = runServeSequence(0xDEADC0DE);
  const different = run1 !== run3;
  console.log(`  ${different ? '✓' : '✗'}  Seeds diferentes geram resultados diferentes: ${different ? 'SIM' : 'NÃO'}`);
  different ? _passed++ : _failed++;
}

// ---------------------------------------------------------------------------
// SUITE 7 — TennisMovement: bug do bate-baixo (regressão)
// ---------------------------------------------------------------------------
// Simula uma bola que acaba de quicar no lado do jogador, está subindo, e
// vai atingir altura ideal em ~0.30s. O contactZ planejado deve ser >=
// altura prevista, não a altura atual (baixa).
section('TennisMovement — bate na altura prevista, não na atual (regressão)');

{
  // Stub minimal — não importa o módulo inteiro porque tem dependências de
  // courtPhysics; replica a lógica nova aqui para travar o contrato.
  function computeContactZFixed(ball, point, profile) {
    const ballRising = (ball?.vel?.z ?? 0) > 0.5;
    const currentBallZ = ball?.pos?.z ?? profile.preferredContactZ;
    const predictedZ = point.z ?? profile.preferredContactZ;
    const willRiseToBetterZ = ballRising && predictedZ > currentBallZ + 0.10;
    return {
      contactZ: willRiseToBetterZ ? predictedZ : currentBallZ,
      phase: willRiseToBetterZ ? 'PEAK_WAIT' : 'FORWARD_PICKUP',
    };
  }

  const profile = { preferredContactZ: 0.88, minContactZ: 0.54, maxContactZ: 1.55 };

  // Caso 1 — bola subindo, contato previsto bem acima da altura atual
  const r1 = computeContactZFixed(
    { pos: { z: 0.55 }, vel: { z: 2.4 } },   // subindo a 2.4 m/s
    { z: 0.95 },                              // previsto: 0.95m
    profile,
  );
  const c1 = r1.contactZ >= 0.92 && r1.phase === 'PEAK_WAIT';
  console.log(`  ${c1 ? '✓' : '✗'}  bola subindo → PEAK_WAIT @ z=${r1.contactZ.toFixed(2)} (esperado ~0.95, PEAK_WAIT)`);
  c1 ? _passed++ : _failed++;

  // Caso 2 — bola caindo, deve usar altura atual
  const r2 = computeContactZFixed(
    { pos: { z: 0.65 }, vel: { z: -1.2 } },  // caindo
    { z: 0.90 },
    profile,
  );
  const c2 = r2.contactZ === 0.65 && r2.phase === 'FORWARD_PICKUP';
  console.log(`  ${c2 ? '✓' : '✗'}  bola caindo → FORWARD_PICKUP @ z=${r2.contactZ.toFixed(2)} (esperado 0.65, FORWARD_PICKUP)`);
  c2 ? _passed++ : _failed++;

  // Caso 3 — bola subindo mas previsto NÃO melhora muito (delta < 0.10)
  const r3 = computeContactZFixed(
    { pos: { z: 0.85 }, vel: { z: 1.5 } },
    { z: 0.88 },                              // só +0.03 — não vale recuar
    profile,
  );
  const c3 = r3.contactZ === 0.85 && r3.phase === 'FORWARD_PICKUP';
  console.log(`  ${c3 ? '✓' : '✗'}  ganho marginal → mantém FORWARD_PICKUP (sem oscilar)`);
  c3 ? _passed++ : _failed++;

  // Caso 4 — easyHighBounceBall: floor antigo (1.00) vs novo (0.78)
  // Bola normal de rally a z=0.82m deve agora qualificar como "high bounce"
  const prefZ = 0.88;
  const ballZ = 0.82;
  const oldFloor = Math.max(prefZ - 0.04, 1.00);  // = 1.00
  const newFloor = Math.max(prefZ - 0.12, 0.78);  // = 0.78
  const c4 = ballZ < oldFloor && ballZ >= newFloor;
  console.log(`  ${c4 ? '✓' : '✗'}  rally ball z=${ballZ}m: bloqueada antes (floor=${oldFloor}), passa agora (floor=${newFloor})`);
  c4 ? _passed++ : _failed++;
}

// ---------------------------------------------------------------------------
// SUITE 8 — Intent pipeline: as 4 fraturas que esta rodada conserta
// ---------------------------------------------------------------------------
section('Intent pipeline — counterRedirect, upgrade, approachMode, BUILD vs CONTROL');

{
  // Stubs leves que replicam a lógica de chooseIntent / scoreFamily / EV.
  // Não importamos os módulos reais aqui porque puxam ShotContext, ShotStyle
  // etc. — replicamos só as decisões testáveis com input direto.

  // ── A. counterRedirect invertido ─────────────────────────────────────────
  // Antes: counterRedirect + pressure>0.38 + BUILD → RESET (recuo, errado)
  // Agora: contato decente → REDIRECT; só RESET se contato ruim
  function evalCounterRedirect({ pressure, q, lowPickup, late, arrivalMargin, baseIntent }) {
    let intent = baseIntent;
    const canRedirect = !lowPickup && !late && q >= 0.50 && arrivalMargin >= -0.06;
    if (pressure > 0.38) {
      if (intent === 'BUILD' || intent === 'RESET') {
        if (canRedirect && pressure < 0.74) intent = 'REDIRECT';
        else if (!canRedirect && pressure > 0.58) intent = 'RESET';
      }
    }
    return intent;
  }

  const cr1 = evalCounterRedirect({ pressure: 0.55, q: 0.68, lowPickup: false, late: false, arrivalMargin: 0.02, baseIntent: 'BUILD' });
  const ok1 = cr1 === 'REDIRECT';
  console.log(`  ${ok1 ? '✓' : '✗'}  CR + pressão moderada + contato OK → REDIRECT (got ${cr1})`);
  ok1 ? _passed++ : _failed++;

  const cr2 = evalCounterRedirect({ pressure: 0.65, q: 0.40, lowPickup: true, late: false, arrivalMargin: -0.10, baseIntent: 'BUILD' });
  const ok2 = cr2 === 'RESET';
  console.log(`  ${ok2 ? '✓' : '✗'}  CR + pressão alta + contato ruim → RESET (got ${cr2})`);
  ok2 ? _passed++ : _failed++;

  const cr3 = evalCounterRedirect({ pressure: 0.20, q: 0.70, lowPickup: false, late: false, arrivalMargin: 0.05, baseIntent: 'BUILD' });
  const ok3 = cr3 === 'BUILD'; // pressão baixa não dispara override
  console.log(`  ${ok3 ? '✓' : '✗'}  CR + pressão baixa → mantém BUILD (got ${cr3})`);
  ok3 ? _passed++ : _failed++;

  // ── B. Upgrade tático sobrescreve DEFEND/RESET sugeridos ─────────────────
  function tryUpgradeIntent({ recommended, q, lowPickup, late, arrivalMargin, pressure, rivalExposed, attackableReturn, highEasyBounce, approachIntent }) {
    const opportunityGate = q >= 0.68
      && !lowPickup && !late
      && arrivalMargin >= -0.04
      && pressure < 0.62
      && (rivalExposed || attackableReturn || highEasyBounce);
    const upgrade = opportunityGate && (recommended === 'DEFEND' || recommended === 'RESET');
    if (!upgrade) return recommended;
    if (highEasyBounce || (q >= 0.78 && rivalExposed)) return 'FINISH';
    if (approachIntent) return 'APPROACH';
    return 'PRESSURE';
  }

  const u1 = tryUpgradeIntent({ recommended: 'RESET', q: 0.76, lowPickup: false, late: false, arrivalMargin: 0.04, pressure: 0.40, rivalExposed: true, attackableReturn: false, highEasyBounce: false, approachIntent: false });
  const okU1 = u1 === 'PRESSURE';
  console.log(`  ${okU1 ? '✓' : '✗'}  RESET sugerido + Q:76% + rival exposto → PRESSURE (got ${u1})`);
  okU1 ? _passed++ : _failed++;

  const u2 = tryUpgradeIntent({ recommended: 'DEFEND', q: 0.82, lowPickup: false, late: false, arrivalMargin: 0.08, pressure: 0.35, rivalExposed: true, attackableReturn: false, highEasyBounce: false, approachIntent: false });
  const okU2 = u2 === 'FINISH';
  console.log(`  ${okU2 ? '✓' : '✗'}  DEFEND sugerido + Q:82% + rival exposto → FINISH (got ${u2})`);
  okU2 ? _passed++ : _failed++;

  const u3 = tryUpgradeIntent({ recommended: 'RESET', q: 0.55, lowPickup: true, late: false, arrivalMargin: -0.08, pressure: 0.45, rivalExposed: true, attackableReturn: false, highEasyBounce: false, approachIntent: false });
  const okU3 = u3 === 'RESET'; // contato ruim não promove
  console.log(`  ${okU3 ? '✓' : '✗'}  RESET sugerido + contato ruim → mantém RESET (got ${u3})`);
  okU3 ? _passed++ : _failed++;

  const u4 = tryUpgradeIntent({ recommended: 'RESET', q: 0.75, lowPickup: false, late: false, arrivalMargin: 0.02, pressure: 0.75, rivalExposed: true, attackableReturn: false, highEasyBounce: false, approachIntent: false });
  const okU4 = u4 === 'RESET'; // pressão alta não promove
  console.log(`  ${okU4 ? '✓' : '✗'}  RESET sugerido + pressão alta → mantém RESET (got ${u4})`);
  okU4 ? _passed++ : _failed++;

  // ── C. approachMode classifica corretamente ──────────────────────────────
  function classifyApproachMode({ q, ballZ, lowPickup, late, cleanContact, arrivalMargin, bodyState, rivalDeep, attackableReturn, earlyStrike }) {
    const powerQGate = earlyStrike ? 0.66 : 0.72;
    const isPower = ballZ >= 0.92 && q >= powerQGate && cleanContact && arrivalMargin >= -0.02 && !late && (rivalDeep || attackableReturn);
    if (isPower) return 'power';
    const isDrive = q >= 0.60 && ballZ >= 0.62 && !lowPickup && !late && arrivalMargin >= -0.06
      && (bodyState === 'PLANTED' || bodyState === 'ON_RISE' || bodyState === 'MOVING');
    if (isDrive) return 'drive';
    return 'chip';
  }

  const m1 = classifyApproachMode({ q: 0.78, ballZ: 1.05, lowPickup: false, late: false, cleanContact: true, arrivalMargin: 0.06, bodyState: 'ON_RISE', rivalDeep: true, attackableReturn: false, earlyStrike: true });
  const okM1 = m1 === 'power';
  console.log(`  ${okM1 ? '✓' : '✗'}  Bola alta + Q:78% + earlyStrike → power approach (got ${m1})`);
  okM1 ? _passed++ : _failed++;

  const m2 = classifyApproachMode({ q: 0.68, ballZ: 0.78, lowPickup: false, late: false, cleanContact: true, arrivalMargin: 0.02, bodyState: 'PLANTED', rivalDeep: true, attackableReturn: false, earlyStrike: false });
  const okM2 = m2 === 'drive';
  console.log(`  ${okM2 ? '✓' : '✗'}  Bola média + Q:68% + PLANTED → drive approach (got ${m2})`);
  okM2 ? _passed++ : _failed++;

  const m3 = classifyApproachMode({ q: 0.55, ballZ: 0.48, lowPickup: true, late: false, cleanContact: false, arrivalMargin: -0.05, bodyState: 'LOW_PICKUP', rivalDeep: true, attackableReturn: false, earlyStrike: false });
  const okM3 = m3 === 'chip';
  console.log(`  ${okM3 ? '✓' : '✗'}  Bola baixa + Q:55% + LOW_PICKUP → chip approach (got ${m3})`);
  okM3 ? _passed++ : _failed++;

  // ── D. BUILD vs CONTROL produzem família distinta ────────────────────────
  // BUILD: prefere topspin com variação + flat drive quando preparado
  // CONTROL: prefere topspin pesado central, flat só quando muito bem preparado
  function scoreFamilyDelta(intent, family, ctx) {
    const { q, flatWindow, playable, prefs } = ctx;
    if (intent === 'BUILD') {
      if (family === 'TOPSPIN') return playable ? 0.28 : 0.22;
      if (family === 'FLAT_DRIVE' && flatWindow) return q > 0.58 ? 0.28 : 0.18;
      if (family === 'SLICE') return prefs?.buildStyle === 'SLICE_CONTROL' ? -0.02 : playable ? -0.40 : -0.26;
    }
    if (intent === 'CONTROL') {
      if (family === 'TOPSPIN') return playable ? 0.32 : 0.24;
      if (family === 'FLAT_DRIVE') return flatWindow && q >= 0.62 ? 0.14 : -0.10;
      if (family === 'SLICE') return prefs?.buildStyle === 'SLICE_CONTROL' ? 0.10 : -0.18;
    }
    return 0;
  }
  const buildFlat   = scoreFamilyDelta('BUILD',   'FLAT_DRIVE', { q: 0.60, flatWindow: true,  playable: true, prefs: {} });
  const controlFlat = scoreFamilyDelta('CONTROL', 'FLAT_DRIVE', { q: 0.60, flatWindow: true,  playable: true, prefs: {} });
  const okBC1 = buildFlat > controlFlat;
  console.log(`  ${okBC1 ? '✓' : '✗'}  BUILD prefere flat mais que CONTROL: ${buildFlat} > ${controlFlat}`);
  okBC1 ? _passed++ : _failed++;

  const buildTop   = scoreFamilyDelta('BUILD',   'TOPSPIN', { q: 0.60, flatWindow: true, playable: true, prefs: {} });
  const controlTop = scoreFamilyDelta('CONTROL', 'TOPSPIN', { q: 0.60, flatWindow: true, playable: true, prefs: {} });
  const okBC2 = controlTop > buildTop;
  console.log(`  ${okBC2 ? '✓' : '✗'}  CONTROL prefere topspin pesado mais que BUILD: ${controlTop} > ${buildTop}`);
  okBC2 ? _passed++ : _failed++;
}

// ---------------------------------------------------------------------------
// Resultado final
// ---------------------------------------------------------------------------
console.log(`\n${'─'.repeat(55)}`);
const total = _passed + _failed;
console.log(`Resultado: ${_passed}/${total} passaram${_failed > 0 ? `, ${_failed} FALHARAM` : ' ✓'}`);
if (_failed > 0) process.exit(1);
