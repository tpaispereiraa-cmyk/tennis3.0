import { clamp } from '../../core/math.js';
import { APPROACH_POOLS } from './shotPoolsConfig.js';

const HALF_L = 11.885;

function copyPool(pool) {
  return Object.fromEntries(Object.entries(pool ?? {}).map(([k, v]) => [k, v]));
}

function add(pool, shotType, delta) {
  pool[shotType] = Math.max(0, (pool[shotType] ?? 0) + delta);
}

function scale(pool, shotType, factor) {
  if (pool[shotType] == null) return;
  pool[shotType] = Math.max(0, pool[shotType] * factor);
}

function resolveOpponentAtNetInfo(opponent) {
  const oppY = opponent?.pos?.y ?? HALF_L;
  const inferredAtNet = Math.abs(oppY) < HALF_L * 0.35;
  return {
    value: opponent?.atNet ?? inferredAtNet,
    source: opponent?.atNet != null ? 'flag' : 'depth',
    oppY: +oppY.toFixed(3),
    thresholdY: +(HALF_L * 0.35).toFixed(3),
    inferredAtNet,
  };
}

export function applyBuildStyleToPool(basePool, buildStyle, intent, ctx = {}) {
  const pool = copyPool(basePool);
  if (!buildStyle) return pool;
  const attackWindow = ctx?.ballTier === 'OPPORTUNITY' ? 1.0 : ctx?.ballTier === 'NEUTRAL' ? 0.6 : 0.0;

  switch (buildStyle) {

    // ── CROSS_DOMINANT ────────────────────────────────────────────────
    case 'CROSS_DOMINANT':
      if (intent === 'BUILD' || intent === 'PRESSURE') {
        add(pool, 'TOPSPIN', 0.10);
        add(pool, 'DRIVE',   0.04);
      }
      if (intent === 'FINISH') {
        add(pool, 'TOPSPIN', 0.06);
        add(pool, 'ACCEL',   0.04);
      }
      break;

    // ── CROSS_BUILDER ─────────────────────────────────────────────────
    case 'CROSS_BUILDER':
      if (intent === 'BUILD' || intent === 'PRESSURE') {
        add(pool, 'TOPSPIN', 0.06);
        add(pool, 'DRIVE',   0.03);
      }
      break;

    // ── HEAVY_SPIN_PRESSURE ───────────────────────────────────────────
    // Topspin é a resposta para TUDO — inclusive no FINISH e RESET.
    case 'HEAVY_SPIN_PRESSURE':
      switch (intent) {
        case 'RESET':
          scale(pool, 'TOPSPIN', 1.30);
          scale(pool, 'DRIVE',   0.85);
          break;
        case 'BUILD':
          scale(pool, 'TOPSPIN', 1.55);
          scale(pool, 'DRIVE',   0.70);
          scale(pool, 'ACCEL',   0.75);
          break;
        case 'PRESSURE':
          add(pool,   'TOPSPIN', 0.18);
          scale(pool, 'ACCEL',   0.70);
          scale(pool, 'BANANA',  0.65);
          break;
        case 'FINISH':
          add(pool,   'TOPSPIN', 0.14);
          add(pool,   'ACCEL',   0.06);
          scale(pool, 'BANANA',  0.72);
          scale(pool, 'DROP',    0.60);
          break;
        case 'APPROACH':
          add(pool, 'TOPSPIN', 0.10);
          scale(pool, 'SLICE', 0.80);
          break;
      }
      break;

    // ── COUNTER_REDIRECT ──────────────────────────────────────────────
    case 'COUNTER_REDIRECT':
      switch (intent) {
        case 'BUILD':
          add(pool, 'DRIVE',  0.10);
          add(pool, 'ACCEL',  0.10);
          add(pool, 'SHORT_ACCEL', 0.05);
          add(pool, 'BANANA', 0.06);
          break;
        case 'PRESSURE':
          add(pool, 'ACCEL',  0.14);
          add(pool, 'SHORT_ACCEL', 0.06);
          add(pool, 'DRIVE',  0.08);
          add(pool, 'BANANA', 0.10);
          break;
        case 'FINISH':
          add(pool, 'ACCEL',  0.14);
          add(pool, 'SHORT_ACCEL', 0.08);
          add(pool, 'BANANA', 0.10);
          add(pool, 'DRIVE',  0.02);
          break;
        case 'APPROACH':
          add(pool, 'DRIVE',  0.06);
          add(pool, 'ACCEL',  0.08);
          add(pool, 'SHORT_ACCEL', 0.04);
          break;
      }
      break;

    // ── SLICE_CONTROL ─────────────────────────────────────────────────
    // Slice elevado em TODOS os intents. Especialista usa slice como
    // defesa, construção, aproximação e finalizador tático.
    case 'SLICE_CONTROL':
      switch (intent) {
        case 'RESET':
          add(pool,   'SLICE',   0.22);
          scale(pool, 'TOPSPIN', 0.80);
          break;
        case 'BUILD':
          add(pool,   'SLICE',   0.18);
          scale(pool, 'TOPSPIN', 0.90);
          break;
        case 'PRESSURE':
          add(pool, 'SLICE', 0.14);
          add(pool, 'DROP',  0.06);
          break;
        case 'FINISH':
          // Slice de finalização tático — não vai no winner puro
          add(pool,   'SLICE',  0.10);
          add(pool,   'DROP',   0.10);
          scale(pool, 'ACCEL',  0.75);
          scale(pool, 'BANANA', 0.60);
          break;
        case 'APPROACH':
          // Assinatura clássica — slice DTL de aproximação (Edberg/Sampras)
          add(pool, 'SLICE', 0.22);
          scale(pool, 'ACCEL', 0.80);
          break;
      }
      break;

    // ── DROP_VARIATION ────────────────────────────────────────────────
    // Drop presente em TODOS os intents. É a arma principal no FINISH.
    // No RESET usa drop como saída inesperada.
    case 'DROP_VARIATION':
      switch (intent) {
        case 'RESET':
          add(pool, 'DROP',  0.08);
          add(pool, 'SLICE', 0.06);
          break;
        case 'BUILD':
          add(pool, 'DROP',    0.16);
          add(pool, 'SHORT_ACCEL', 0.04);
          add(pool, 'TOPSPIN', 0.04);
          break;
        case 'PRESSURE':
          add(pool, 'DROP',    0.22);
          add(pool, 'SHORT_ACCEL', 0.06);
          add(pool, 'BANANA',  0.04);
          add(pool, 'TOPSPIN', 0.02);
          break;
        case 'FINISH':
          // Drop é o winner preferido — surpreender quando o adversário recua
          add(pool, 'DROP',       0.28);
          add(pool, 'SHORT_ACCEL', 0.10);
          scale(pool, 'ACCEL',    0.82);
          scale(pool, 'BANANA',   0.78);
          break;
        case 'APPROACH':
          // Drop de aproximação — arrasta o rival para frente antes de subir
          add(pool, 'DROP',  0.12);
          add(pool, 'SLICE', 0.06);
          break;
      }
      break;

    // ── CROSS_SHORT_ANGLE ─────────────────────────────────────────────
    case 'CROSS_SHORT_ANGLE':
      switch (intent) {
        case 'BUILD':
          add(pool, 'SHORT_ACCEL', 0.14);
          add(pool, 'ACCEL',       0.05);
          add(pool, 'BANANA',      0.04);
          if (ctx?.ballTier === 'OPPORTUNITY') add(pool, 'SHORT_ACCEL', 0.08);
          break;
        case 'PRESSURE':
          add(pool, 'SHORT_ACCEL', 0.18);
          add(pool, 'ACCEL',       0.06);
          add(pool, 'BANANA',      0.08);
          break;
        case 'FINISH':
          add(pool, 'SHORT_ACCEL', 0.20);
          add(pool, 'ACCEL',       0.10);
          add(pool, 'BANANA',      0.10);
          break;
        case 'APPROACH':
          add(pool, 'SHORT_ACCEL', 0.10);
          add(pool, 'SLICE',       0.04);
          break;
      }
      break;

    // ── DTL_HUNTER ────────────────────────────────────────────────────
    case 'DTL_HUNTER':
      switch (intent) {
        case 'BUILD':
          add(pool, 'DRIVE', 0.06);
          add(pool, 'ACCEL', 0.12);
          add(pool, 'SHORT_ACCEL', 0.04);
          break;
        case 'PRESSURE':
          add(pool, 'ACCEL', 0.16);
          add(pool, 'DRIVE', 0.08);
          add(pool, 'SHORT_ACCEL', 0.06);
          break;
        case 'FINISH':
          // Paralelo é o winner — accel DTL como encerramento
          add(pool, 'ACCEL', 0.18);
          add(pool, 'SHORT_ACCEL', 0.08);
          add(pool, 'DRIVE', 0.06);
          break;
        case 'APPROACH':
          add(pool, 'DRIVE', 0.10);
          add(pool, 'ACCEL', 0.10);
          break;
      }
      break;

    // ── CENTRE_CONTROL ────────────────────────────────────────────────
    case 'CENTRE_CONTROL':
      if (intent === 'BUILD' || intent === 'PRESSURE') {
        add(pool,   'TOPSPIN',    0.08);
        scale(pool, 'SHORT_ACCEL', 0.80);
        scale(pool, 'BANANA',     0.75);
      }
      if (intent === 'FINISH') {
        add(pool,   'DRIVE',      0.06);
        add(pool,   'TOPSPIN',    0.08);
        scale(pool, 'BANANA',     0.70);
      }
      break;

    // ── VARIED ────────────────────────────────────────────────────────
    // Sem dominante — espalha pequenos bônus em tudo para que a temperatura
    // alta (1.22) faça o trabalho de imprevisibilidade.
    case 'VARIED':
      if (intent !== 'RESET') {
        add(pool, 'DRIVE',       0.04);
        add(pool, 'SLICE',       0.03);
        add(pool, 'DROP',        0.03);
        add(pool, 'ACCEL',       0.03);
        add(pool, 'SHORT_ACCEL', 0.02);
        add(pool, 'BANANA',      0.02);
      }
      break;

    default:
      break;
  }

  if (attackWindow > 0) {
    if (buildStyle === 'COUNTER_REDIRECT' || buildStyle === 'DTL_HUNTER') {
      add(pool, 'ACCEL', 0.05 * attackWindow);
      add(pool, 'SHORT_ACCEL', 0.03 * attackWindow);
      add(pool, 'BANANA', 0.02 * attackWindow);
      scale(pool, 'DRIVE', 0.96);
    }
    if (buildStyle === 'CROSS_SHORT_ANGLE') {
      add(pool, 'SHORT_ACCEL', 0.06 * attackWindow);
      add(pool, 'BANANA', 0.05 * attackWindow);
    }
    if (buildStyle === 'DROP_VARIATION') {
      add(pool, 'DROP', 0.07 * attackWindow);
      add(pool, 'SHORT_ACCEL', 0.03 * attackWindow);
    }
  }

  return pool;
}

export function applyNetGameToApproachPool(netGame, rally, ctx = {}) {
  if (netGame === 'HUNTER') {
    return copyPool(rally < 3 ? APPROACH_POOLS.HUNTER_SETUP : APPROACH_POOLS.HUNTER_CLOSING);
  }
  return copyPool(APPROACH_POOLS[netGame] ?? APPROACH_POOLS.OPPORTUNIST);
}

// Personalidade do riskProfile no tipo de shot — independente do buildStyle.
// GAMBLER: ama aceleração, banana e drop variando sobre topspin-âncora.
// ALLOUT: vai no winner puro sempre — accel, banana, short_accel dominam o FINISH.
// SAFETY_FIRST/SAFE: penaliza shots de alto risco no PRESSURE/FINISH.
export function applyRiskProfileToPool(poolIn, riskProfile, intent) {
  const pool = copyPool(poolIn);

  switch (riskProfile) {
    case 'GAMBLER':
      switch (intent) {
        case 'RESET':
          add(pool, 'DROP',  0.08);
          add(pool, 'ACCEL', 0.04);
          break;
        case 'BUILD':
          add(pool,   'ACCEL',  0.10);
          add(pool,   'SHORT_ACCEL', 0.05);
          add(pool,   'BANANA', 0.08);
          add(pool,   'DROP',   0.06);
          scale(pool, 'TOPSPIN', 0.84);
          break;
        case 'PRESSURE':
          add(pool,   'ACCEL',  0.14);
          add(pool,   'SHORT_ACCEL', 0.06);
          add(pool,   'BANANA', 0.12);
          add(pool,   'DROP',   0.08);
          scale(pool, 'TOPSPIN', 0.78);
          break;
        case 'FINISH':
          // Caos calculado: banana, accel e drop competem com o topspin-âncora
          add(pool,   'BANANA',      0.16);
          add(pool,   'ACCEL',       0.12);
          add(pool,   'DROP',        0.08);
          add(pool,   'SHORT_ACCEL', 0.08);
          scale(pool, 'TOPSPIN',     0.62);
          scale(pool, 'DRIVE',       0.72);
          break;
      }
      break;

    case 'ALLOUT':
      switch (intent) {
        case 'BUILD':
          add(pool, 'ACCEL', 0.12);
          add(pool, 'SHORT_ACCEL', 0.05);
          add(pool, 'DRIVE', 0.04);
          add(pool, 'BANANA', 0.06);
          break;
        case 'PRESSURE':
          add(pool, 'ACCEL',       0.20);
          add(pool, 'SHORT_ACCEL', 0.12);
          add(pool, 'BANANA',      0.06);
          break;
        case 'FINISH':
          // Winner ou nada — sem drop, sem topspin cauteloso
          add(pool,   'ACCEL',       0.22);
          add(pool,   'BANANA',      0.12);
          add(pool,   'SHORT_ACCEL', 0.14);
          scale(pool, 'TOPSPIN',     0.46);
          scale(pool, 'DROP',        0.60);
          break;
      }
      break;

    case 'SAFETY_FIRST':
      if (intent === 'PRESSURE') {
        add(pool,   'TOPSPIN', 0.08);
        scale(pool, 'ACCEL',   0.70);
        scale(pool, 'BANANA',  0.50);
        scale(pool, 'DROP',    0.65);
      }
      if (intent === 'FINISH') {
        add(pool,   'DRIVE',   0.06);
        add(pool,   'TOPSPIN', 0.08);
        scale(pool, 'BANANA',  0.55);
        scale(pool, 'DROP',    0.70);
      }
      break;

    case 'SAFE':
      if (intent === 'FINISH') {
        add(pool,   'TOPSPIN', 0.06);
        scale(pool, 'ACCEL',   0.85);
        scale(pool, 'BANANA',  0.75);
      }
      break;

    // CALCULATED: neutro — pool base já representa o risco proporcional à abertura
    default:
      break;
  }

  return pool;
}

export function adjustPoolBySituation(poolIn, player, opponent, ballTier, opts = {}, intent = 'BUILD') {
  const pool = copyPool(poolIn);
  const contactSpace = opts?.contactSpace ?? {};
  const heightZone = contactSpace?.heightZone ?? 'HIP';
  const diff = contactSpace?.diff ?? 0.5;
  const rally = opts?.gsRally ?? 0;
  const openWindow = clamp(Math.abs(opponent?.pos?.x ?? 0) / 2.4, 0, 1);
  const oppAtNetInfo = resolveOpponentAtNetInfo(opponent);
  const oppAtNet = oppAtNetInfo.value;
  const netIntent = clamp(player?.ctx?.netIntent ?? 0, 0, 1);
  const playerDepth = clamp(Math.abs(player?.pos?.y ?? HALF_L) / HALF_L, 0, 1);
  const oppDepth = clamp(Math.abs(opponent?.pos?.y ?? HALF_L) / HALF_L, 0, 1);
  const buildStyle = player?.prefs?.buildStyle ?? player?.buildStyle ?? null;
  const riskProfile = player?.prefs?.riskProfile ?? player?.riskProfile ?? null;
  const creativeAttacker =
    riskProfile === 'GAMBLER' ||
    riskProfile === 'ALLOUT' ||
    buildStyle === 'DROP_VARIATION' ||
    buildStyle === 'COUNTER_REDIRECT' ||
    buildStyle === 'DTL_HUNTER' ||
    buildStyle === 'CROSS_SHORT_ANGLE';
  const ballHasBounced = !!opts?.ballHasBounced || (opts?.ballBounceCount ?? 0) > 0;
  const netContext = !!player?.atNet
    || player?.ctx?.courtMode === 'NET'
    || player?.ctx?.netPhase === 'FIRST_VOLLEY'
    || player?.ctx?.netPhase === 'CLOSE_FINISH';
  const situationTrace = [];
  const pushTrace = (tag, extra = {}) => {
    situationTrace.push({ tag, ...extra });
  };

  if (ballTier === 'OPPORTUNITY') {
    pushTrace('ball_tier_opportunity', { openWindow: +openWindow.toFixed(3), creativeAttacker });
    // [FIX-OPP-BOOST] Antes: ACCEL+0.12, SHORT_ACCEL+0.10. Agora maiores.
    // Bola fácil = hora de atacar. O boost adicional é proporcional à janela aberta.
    const oppBonus = openWindow > 0.28 ? 1.4 : 1.0;
    add(pool, 'ACCEL', 0.16 * oppBonus);
    add(pool, 'SHORT_ACCEL', 0.13 * oppBonus);
    add(pool, 'BANANA', 0.06 * oppBonus);
    // [FIX-OPP-DROP] DROP também deve ser uma opção real em bola fácil
    if (!oppAtNet && oppDepth >= 0.52) add(pool, 'DROP', 0.07 * oppBonus);
    if (creativeAttacker) {
      add(pool, 'ACCEL', 0.06);
      add(pool, 'SHORT_ACCEL', 0.05);
      add(pool, 'BANANA', 0.05);
      if (!oppAtNet) add(pool, 'DROP', 0.05);
      scale(pool, 'DRIVE', 0.95);
    }
  }
  if (ballTier === 'DIFFICULT') {
    pushTrace('ball_tier_difficult', { rally });
    add(pool, 'TOPSPIN', 0.08);
    add(pool, 'SLICE', 0.08);
    scale(pool, 'ACCEL', 0.65);
    scale(pool, 'BANANA', 0.55);
    scale(pool, 'DROP', 0.60);
    // Bug 2: zera LOB em rally=0 (defesa de saque nunca deve incluir lob)
    if (rally === 0) scale(pool, 'LOB', 0);
  }
  if (openWindow > 0.28) {
    pushTrace('open_window_attack', { openWindow: +openWindow.toFixed(3), creativeAttacker });
    add(pool, 'ACCEL', 0.05);
    add(pool, 'SHORT_ACCEL', 0.05);
    add(pool, 'BANANA', 0.03);
    if (creativeAttacker) {
      add(pool, 'SHORT_ACCEL', 0.04);
      add(pool, 'BANANA', 0.05);
      scale(pool, 'DRIVE', 0.96);
    }
  }
  if (ballTier !== 'DIFFICULT' && rally >= 2 && diff < 0.62) {
    pushTrace('comfortable_variety_window', { diff: +diff.toFixed(3), rally });
    add(pool, 'DRIVE', 0.08);
    add(pool, 'ACCEL', 0.07);
    add(pool, 'SHORT_ACCEL', 0.06);
    add(pool, 'BANANA', 0.04);
    if (!oppAtNet && oppDepth > 0.58) add(pool, 'DROP', 0.035);
    scale(pool, 'SLICE', 0.82);
    scale(pool, 'TOPSPIN', 0.94);
  }
  if (oppAtNet) {
    pushTrace('opponent_at_net', { source: oppAtNetInfo.source, heightZone, diff: +diff.toFixed(3) });
    // [FIX-C] LOB modulado por heightZone.
    // Antes: flat +0.20 em qualquer altura — criava lobs iguais de DIRT e de SWEET.
    // Agora: LOB só é forte quando o jogador tem posição para erguer a bola com arco real.
    // Em ANKLE/DIRT o lob curto é fácil de smashar → peso muito menor.
    const lobBonus =
      ['SWEET', 'SHOULDER'].includes(heightZone) ? 0.34 :
      heightZone === 'HIP'                        ? 0.26 :
      heightZone === 'ANKLE'                      ? 0.16 : 0.12; // DIRT / HIGH / OVERHEAD
    add(pool, 'LOB', lobBonus);

    // [FIX-D + FIX-E] Contato difícil → LOB deve vencer o pool, não ficar em 2º.
    // Antes: diff>0.68 só adicionava +0.08 LOB (pequeno) e escalava BANANA levemente.
    // Agora: LOB recebe bônus maior E passes agressivos são penalizados — assim o shot
    // selecionado REALMENTE vira LOB em vez de TOPSPIN com motive LOB_ESCAPE.
    if (diff > 0.68) {
      add(pool, 'LOB', 0.24);          // força LOB como resposta principal no aperto
      scale(pool, 'ACCEL', 0.66);      // passing agressivo de posição ruim → mais penalizado
      scale(pool, 'BANANA', 0.74);     // banana de emergência → muito arriscado
      scale(pool, 'SHORT_ACCEL', 0.78);
    }

    // Passing shots: ligeiramente reduzidos vs antes (0.10→0.08, 0.06→0.05).
    // O nerf é intencional: adversário na rede não deve ser countered
    // facilmente com shots agressivos de posição medíocre.
    add(pool, 'ACCEL', 0.06);
    add(pool, 'SHORT_ACCEL', 0.04);
    add(pool, 'DRIVE', 0.06);
    add(pool, 'TOPSPIN', 0.04);
    add(pool, 'BANANA', 0.02);
    if (openWindow > 0.24 || diff <= 0.55) {
      add(pool, 'ACCEL', 0.04);
      add(pool, 'SHORT_ACCEL', 0.03);
      add(pool, 'DRIVE', 0.03);
      add(pool, 'LOB', 0.10);
    }
    // No retorno de saque ainda segura um pouco, mas mantém presença clara de lob.
    if (rally === 0) scale(pool, 'LOB', 0.65);
    if (rally > 0) scale(pool, 'LOB', 1.28);
    scale(pool, 'DROP', 0.55);
  }
  if (heightZone === 'HIGH') {
    pushTrace('height_high');
    add(pool, 'TOPSPIN', 0.10);
    add(pool, 'SMASH', 0.24);
    add(pool, 'VOLLEY', 0.10);
    scale(pool, 'SLICE', 0.72);
  }
  if (heightZone === 'OVERHEAD') {
    pushTrace('height_overhead');
    add(pool, 'SMASH', 0.44);
    add(pool, 'VOLLEY', 0.06);
    scale(pool, 'SLICE', 0.45);
    scale(pool, 'DROP', 0.35);
  }
  if (['HIP', 'SWEET', 'SHOULDER'].includes(heightZone) && (player?.atNet || player?.ctx?.courtMode === 'NET')) {
    pushTrace('net_contact_comfort', { heightZone });
    add(pool, 'VOLLEY', 0.22);
    scale(pool, 'DROP', 0.55);
  }
  if (heightZone === 'ANKLE' || heightZone === 'DIRT') {
    pushTrace('low_contact_zone', { heightZone });
    add(pool, 'SLICE', 0.10);
    scale(pool, 'SMASH', 0.50);
    scale(pool, 'BANANA', 0.78);
  }
  if (diff > 0.72) {
    pushTrace('high_diff_pressure', { diff: +diff.toFixed(3), oppAtNet });
    add(pool, 'TOPSPIN', 0.08);
    // Bug 1: LOB sob pressão só é adicionado se adversário estiver na rede
    if (rally > 0 && oppAtNet) add(pool, 'LOB', 0.04);
    scale(pool, 'ACCEL', 0.70);
  }
  if (intent === 'APPROACH' && netIntent > 0.6) {
    pushTrace('approach_net_intent', { netIntent: +netIntent.toFixed(3) });
    add(pool, 'SLICE', 0.06);
    add(pool, 'VOLLEY', 0.10);
  }
  if ((player?.ctx?.netPhase === 'FIRST_VOLLEY' || player?.ctx?.netPhase === 'CLOSE_FINISH') && !oppAtNet) {
    pushTrace('closing_net_phase', { netPhase: player?.ctx?.netPhase ?? 'BASE' });
    add(pool, 'VOLLEY', 0.18);
    if (heightZone === 'HIGH' || heightZone === 'OVERHEAD') add(pool, 'SMASH', 0.18);
  }

  if (netContext && !ballHasBounced) {
    pushTrace('net_context_airball', { heightZone });
    scale(pool, 'TOPSPIN', 0.04);
    scale(pool, 'SLICE', 0.04);
    scale(pool, 'DRIVE', 0.04);
    scale(pool, 'ACCEL', 0.03);
    scale(pool, 'SHORT_ACCEL', 0.03);
    scale(pool, 'BANANA', 0.02);
    scale(pool, 'DROP', 0.02);
    scale(pool, 'LOB', 0.06);
    scale(pool, 'HALF_VOLLEY', 0.08);
    add(pool, 'VOLLEY', 0.34);
    if (heightZone === 'HIGH' || heightZone === 'OVERHEAD') {
      add(pool, 'SMASH', 0.42);
      scale(pool, 'VOLLEY', 0.88);
    } else {
      scale(pool, 'SMASH', 0.25);
    }
  }

  if (netContext && ballHasBounced) {
    pushTrace('net_context_bounce', { heightZone });
    add(pool, 'HALF_VOLLEY', heightZone === 'ANKLE' || heightZone === 'DIRT' ? 0.28 : 0.16);
    scale(pool, 'VOLLEY', 0.18);
    if (heightZone !== 'HIGH' && heightZone !== 'OVERHEAD') {
      scale(pool, 'SMASH', 0.10);
    }
  }

  // Drop do fundo de quadra (estilo Alcaraz):
  // se o batedor está no fundo, com preparo mínimo e rival recuado,
  // o sistema não deve podar o DROP por padrão.
  // [FIX-DROP-GATE] oppDepth: 0.70→0.58 (rival não precisa estar tão recuado).
  // Também permite DROP quando OPPORTUNITY mesmo sem playerDepth máximo.
  if (
    !oppAtNet &&
    playerDepth >= 0.56 &&
    oppDepth >= 0.58 &&
    diff <= (creativeAttacker ? 0.68 : 0.62) &&
    ['HIP', 'SWEET', 'SHOULDER'].includes(heightZone)
  ) {
    pushTrace('baseline_drop_window', {
      playerDepth: +playerDepth.toFixed(3),
      oppDepth: +oppDepth.toFixed(3),
      heightZone,
      creativeAttacker,
    });
    add(pool, 'DROP', creativeAttacker ? 0.20 : 0.12);
    if (creativeAttacker && (intent === 'BUILD' || intent === 'PRESSURE')) {
      add(pool, 'SHORT_ACCEL', 0.04);
    }
  }

  if (player?.ctx) {
    player.ctx._lastShotSituationTrace = {
      intent,
      ballTier,
      contact: {
        heightZone,
        diff: +diff.toFixed(3),
        playerDepth: +playerDepth.toFixed(3),
        oppDepth: +oppDepth.toFixed(3),
        openWindow: +openWindow.toFixed(3),
        ballHasBounced,
      },
      oppAtNet: oppAtNetInfo,
      netContext,
      triggers: situationTrace,
    };
  }

  return pool;
}

export function applyMatchReadToPool(poolIn, player) {
  const pool = copyPool(poolIn);
  const matchRead = player?.ctx?._matchRead;
  const setAdjust = player?.ctx?._setAdjust;

  if (!matchRead && !setAdjust) return pool;

  const adaptFactor = clamp(
    (player?.mods?.adaptacaoFactor ?? 0.6) + (player?._adaptacaoBoost ?? 0),
    0.40,
    1.20
  );

  if (matchRead?.dtlWorking) {
    add(pool, 'ACCEL', 0.05 * adaptFactor);
    add(pool, 'SHORT_ACCEL', 0.04 * adaptFactor);
  }
  if (matchRead?.crossWorking) {
    add(pool, 'TOPSPIN', 0.05 * adaptFactor);
  }
  if (matchRead?.insisting) {
    const topEntry = Object.entries(pool).sort((a, b) => b[1] - a[1])[0];
    if (topEntry) add(pool, topEntry[0], -0.08 * adaptFactor);
  }
  if (setAdjust?.avoidShotType && pool[setAdjust.avoidShotType] != null) {
    add(pool, setAdjust.avoidShotType, -0.12);
  }

  return pool;
}

export function applyFeasibilityFilter(poolIn, feasibility) {
  const pool = {};
  for (const [shotType, weight] of Object.entries(poolIn ?? {})) {
    if (!(weight > 0)) continue;
    if (feasibility?.isViable && !feasibility.isViable(shotType)) continue;
    const maxQ = feasibility?.getMaxQuality?.(shotType) ?? 1;
    // [FIX-A] Curva exponencial em vez de linear.
    // Antes: 0.20 + maxQ * 0.80 → shot com maxQ=0.40 mantinha 52% do peso.
    // Agora: 0.05 + maxQ^1.6 * 0.95 → maxQ=0.40 → ~27%, maxQ=0.70 → ~59%, maxQ=1.0 → 1.00.
    // Efeito: ACCEL/BANANA de posição ruim colapsam muito mais; LOB/TOPSPIN/SLICE
    // (que têm maxQ mais alto em zonas baixas por serem golpes mais tolerantes) sobrevivem.
    const q = clamp(maxQ, 0, 1);
    const attackFamily = shotType === 'ACCEL' || shotType === 'SHORT_ACCEL' || shotType === 'BANANA' || shotType === 'DROP';
    const baseExp = attackFamily ? 1.42 : 1.6;
    const baseFloor = attackFamily ? 0.09 : 0.05;
    const qualityScale = baseFloor + Math.pow(q, baseExp) * (1 - baseFloor);
    pool[shotType] = weight * qualityScale;
  }
  return pool;
}

