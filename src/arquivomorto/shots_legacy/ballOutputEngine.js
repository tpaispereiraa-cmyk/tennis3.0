// ═══════════════════════════════════════════════════════════════════════
// ballOutputEngine.js — Fase 2 do ATP Shot Engine
// ═══════════════════════════════════════════════════════════════════════
//
// RESPONSABILIDADE: calcular os parâmetros de dispersão física da bola —
//   o que faz o erro EMERGIR em vez de ser sorteado.
//
// O sistema anterior usava σ = 1.6 × (1 - Q)^1.45 para TODOS os shots.
// Isso é errado: um FLAT tem dispersão ~80cm (arco plano, margem lateral
// mínima), enquanto um TOPSPIN tem ~55cm (spin Magnus dá margem vertical
// extra) e um SLICE tem ~45cm (golpe naturalmente mais controlado).
//
// O erro emergente funciona assim:
//   actualX = targetX + Gaussian(0, σX)   → bola sai de lado se σX grande
//   clearance = baseClearance + noise(σA) → bola bate na rede se SQ baixo
//
// Exported functions:
//   computeSigmaX(shotType, sq, targetX, halfS, ctrlAttr, potAttr, swingType, playerX)
//   applyAngleNoise(baseClearance, shotType, sq, ctrlAttr, swingType)
//   getAtpSpinMultipliers(shotType, attrs, mods, sq)
//   getSigmaThreshold(shotType)
//   getShotSigmaConfig(shotType)
// ═══════════════════════════════════════════════════════════════════════

import { getShotBlueprint, getShotDispersaoConfig } from '../../config/SHOTS_CONFIG.js';
import { DEGRADACAO_CONFIG } from '../../config/CONTATO_CONFIG.js';
import { clamp } from '../../core/math.js';

// ── Tabela mestre de σ por shot type — calibrada por dados ATP ─────────────
//
// σXMax     : desvio lateral máximo em metros (SQ=0, controle=50, shot CC)
// σAMax     : ruído de ângulo vertical máximo em graus (SQ=0) → afeta clearance
// sqThresh  : SQ abaixo do qual erro começa a aparecer com frequência real (>5%)
// dirRisk   : multiplicador de σX por direção do target
//
// Referências ATP para calibração de σX:
//   FLAT rally:       σX 0.70–0.85m (SQ=0) — arco muito plano, mínima margem vertical
//   TOPSPIN rally:    σX 0.50–0.60m (SQ=0) — Magnus compra ~30cm de margem vertical
//   HEAVY_TOP:        σX 0.60–0.70m (SQ=0) — mais potência que TOPSPIN, mais risco
//   SLICE rally:      σX 0.40–0.50m (SQ=0) — golpe naturalmente mais controlado
//   VOLLEY (punch):   σX 0.45–0.55m (SQ=0) — volleys técnicos são controlados
//   VOLLEY (reflex):  σX 0.90–1.20m (SQ=0) — reflexo puro, dispersão alta
//   SMASH:            σX 0.55–0.65m (SQ=0) — overhead: menor margem de erro
//   DROP:             σX 0.30–0.40m (SQ=0) — precisa lateralmente mas σA alto
//
// dirRisk.DTL × 1.6: DTL tem ~40% menos margem lateral que CC no mesmo alvo
// dirRisk.WIDE × 2.2: angle extremo, bola perto da linha + canto
//
// σBase: componente FIXO de erro — existe independente de SQ.
// Representa pressão do momento, tensão muscular, imprecisão inerente ao golpe.
// Sem isso, shots com SQ alta nunca erram (irrealista — pros erram ~25 UE/jogo).
// FLAT=0.18 (arco plano, mínima margem), TOPSPIN=0.09, SLICE=0.05 (mais controlado).
function toLegacySigma(shotType) {
  const cfg = getShotDispersaoConfig(shotType);
  return {
    σBase: cfg.sigmaBase,
    σXMax: cfg.sigmaLateralMax,
    σAMax: cfg.sigmaAnguloMax,
    sqThresh: cfg.qualidadeErro,
    dirRisk: { ...cfg.dirRisk },
    reflexSigmaXMult: cfg.reflexSigmaXMult,
    reflexSigmaAMult: cfg.reflexSigmaAMult,
  };
}

function getSigmaRuntimeConfig(shotType) {
  return toLegacySigma(shotType);
}

const DEFAULT_SIGMA = toLegacySigma('_DEFAULT');

// ── Detectar direção do shot ─────────────────────────────────────────────────
// FIX: relX * targetX > 0 classificava CC como DTL quando jogador e alvo
// estão em lados opostos da quadra (ex: playerX=+2.5, targetX=−3.05).
// relX = −5.55; relX × targetX = +16.9 > 0 → DTL ✗ (era cross-court real)
// Correto: DTL = alvo e jogador no mesmo lado do eixo X central.
function detectDirection(targetX, playerX, halfS) {
  const absT = Math.abs(targetX);
  if (absT > halfS * 0.82) return 'WIDE';
  const px = playerX ?? 0;
  // DTL: alvo e jogador no mesmo lado (sinal igual) e jogador fora do centro
  if (Math.abs(px) > 0.5 && Math.sign(targetX) === Math.sign(px)) return 'DTL';
  return 'CC';
}

// ── Divisor de σ pelo atributo controle ──────────────────────────────────────
// FIX: range anterior 0.70–1.39 era estreito demais — ctrl=99 só reduzia σ em 28%.
// Agora: range 0.52–1.65 com curva não-linear.
// controle=20  → div 0.60 (σ +67% — bola espirra muito)
// controle=40  → div 0.85 (σ +18% — impreciso)
// controle=60  → div 1.10 (σ −9% — levemente preciso)
// controle=85  → div 1.42 (σ −30% — controle real)
// controle=99  → div 1.65 (σ −39% — elite, spread mínimo)
function ctrlDiv(ctrlAttr) {
  // Curva não-linear: impacto muito maior nos extremos
  const t = (ctrlAttr ?? 50) / 100;
  return 0.52 + t * t * 1.13 + t * 0.18; // 0→0.52 | 0.5→0.98 | 1.0→1.83... cap
  // Na prática: clamp para evitar divisor > 1.80
}

// ── Bias de σ pelo atributo potência ─────────────────────────────────────────
// [POT v2] Potência ainda aumenta risco, mas bem menos por si só.
// O importante é o desbalanceamento potência > controle, não a força bruta isolada.
// potencia=30 → −0.027 | potencia=50 → +0.015 | potencia=70 → +0.057 | potencia=99 → +0.118
function potenciaSigmaBias(potAttr) {
  return -0.09 + (potAttr / 100) * 0.21;
}

// ═══════════════════════════════════════════════════════════════════════
// ── computeSigmaX ─────────────────────────────────────────════════════
// Calcula o σX (desvio padrão lateral) para o scatter gaussiano.
// Substitui a fórmula genérica `1.6 × (1 - Q)^1.45` do game.js.
//
// DIFERENÇA CHAVE:
//   Antes: σ genérico, igual para FLAT e TOPSPIN com mesma qualidade
//   Agora: σ específico por shot type com física ATP calibrada
//   Resultado: FLAT tem 45% mais erro lateral que TOPSPIN na mesma SQ
// ═══════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════
// ── computeSigmaX ─────────────────────────────────────────════════════
// Calcula o σX (desvio padrão lateral) para o scatter gaussiano.
//
// NOVO SISTEMA — Degradação em Camada 1:
//   A dispersão do golpe lerpa em direção ao DISPERSAO_ERRO_BASE à medida
//   que Q cai abaixo do threshold do shot.
//
//   CONTROLE age em duas frentes:
//     1. Threshold shift: ctrl alto → threshold mais baixo → dispersão
//        limpa se mantém por mais tempo à medida que Q cai
//     2. Teto do lerp: ctrl alto → nunca atinge o caos máximo do ERRO_BASE
//
//   Efeito na quadra: ctrl=90 com Q=0.10 num TOPSPIN tem 42% menos caos
//   que ctrl=30 na mesma situação — visível em qualquer nível de Q.
//
// ctrlDiv: ainda age como divisor final sobre o sigma lerped,
//   reduzindo o caos mesmo dentro do DISPERSAO_ERRO_BASE.
// ═══════════════════════════════════════════════════════════════════════

/**
 * @param {string} shotType
 * @param {number} sq        — Strike Quality efectiva (0–1)
 * @param {number} targetX   — alvo X (para detectar CC/DTL/WIDE)
 * @param {number} halfS     — metade da largura da quadra (4.115)
 * @param {number} ctrlAttr  — atributo controle (0–99)
 * @param {number} potAttr   — atributo potencia (0–99)
 * @param {string} [swingType] — 'REFLEX' amplia σ de volleys
 * @param {number} [playerX]   — posição X do jogador (para detectar DTL)
 * @returns {number} σX em metros
 */
export function computeSigmaX(shotType, sq, targetX, halfS, ctrlAttr, potAttr, swingType, playerX, shotAttrs = null) {
  const s = getSigmaRuntimeConfig(shotType) ?? DEFAULT_SIGMA;
  const ctrl = ctrlAttr ?? 50;
  const pot  = potAttr  ?? 50;

  // Reflex volley: dispersão muito maior
  const reflexMultX = (swingType === 'REFLEX' && s.reflexSigmaXMult) ? s.reflexSigmaXMult : 1.0;

  // Direção do shot → risco lateral
  const dir     = detectDirection(targetX, playerX ?? 0, halfS);
  const dirMult = s.dirRisk[dir] ?? 1.0;

  // ── CAMADA 1: Lerp de dispersão em direção ao DISPERSAO_ERRO_BASE ──
  const errBase = DEGRADACAO_CONFIG.DISPERSAO_ERRO_BASE;
  const ctrlCfg = DEGRADACAO_CONFIG;

  // 1a. Threshold shift por controle
  //   ctrl=20 → bonus=−0.075 → threshold SOBE (erro começa mais cedo)
  //   ctrl=50 → bonus= 0     → threshold original do shot
  //   ctrl=99 → bonus=+0.123 → threshold DESCE (mantém dispersão limpa)
  const ctrlBonus   = ((ctrl - 50) / 100) * ctrlCfg.CTRL_BONUS_ESCALA;
  const threshold   = Math.max(ctrlCfg.CTRL_THRESHOLD_MIN, s.sqThresh - ctrlBonus);

  // 1b. Teto do lerp por controle
  //   ctrl=20 → teto=0.97 | ctrl=50 → teto=0.79 | ctrl=99 → teto=0.58
  const lerpTeto = ctrlCfg.CTRL_TETO_BASE - (ctrl / 100) * ctrlCfg.CTRL_TETO_ESCALA;

  // 1c. Fator de lerp t ∈ [0, lerpTeto]
  const tRaw = threshold > 0 ? (threshold - sq) / threshold : 0;
  const t    = Math.max(0, Math.min(lerpTeto, tRaw));

  // 1d. Lerp sigma_base e sigma_lateral_max em direção ao DISPERSAO_ERRO_BASE
  const sigmaBase  = s.σBase  + (errBase.sigma_base         - s.σBase)  * t;
  const sigmaXMax  = (s.σXMax * reflexMultX)
                   + (errBase.sigma_lateral_max - s.σXMax)  * t;

  // ── ctrlDiv REMOVIDO do cálculo final ────────────────────────────────
  // O mecanismo antigo (ctrlDiv dividindo sigma) era o sistema anterior.
  // Com threshold shift + lerp ceiling, controle já age em duas frentes
  // distintas. Manter ctrlDiv triplicaria o poder do atributo por acúmulo.

  // ── Potência: mais pace = mais risco lateral, mas controle alto amortiza ──
  // Antes a potência alta era punida quase sempre. Agora o spread extra aparece
  // sobretudo quando a força passa do controle disponível.
  const controlShield = clamp(0.72 + (ctrl / 100) * 0.34, 0.72, 1.06);
  const powerGap = Math.max(0, (pot - ctrl) / 100);
  const pBias = 1.0
    + potenciaSigmaBias(pot) * (1.08 - Math.min(1, controlShield))
    + powerGap * 0.16;

  // σX = (σBase × f(Q) + σXMax × g(Q)) × dirMult × pBias
  const lowQualityTax = Math.pow(clamp((0.60 - sq) / 0.60, 0, 1), 1.15);
  const sigmaBaseFactor = 0.30 + Math.pow(Math.max(0, 1.0 - sq), 0.52) * 0.82 + lowQualityTax * 0.28;
  const sqFactor        = Math.pow(Math.max(0, 1.0 - sq), 0.62) * (1 + lowQualityTax * 0.65);
  const sigmaFixed      = sigmaBase * sigmaBaseFactor;
  let sigma             = (sigmaFixed + sigmaXMax * sqFactor) * dirMult * pBias;
  if (shotType === 'SLICE' || shotType === 'SLICE_SHORT') {
    const sliceAttr = shotAttrs?.slice ?? 50;
    const sliceCtrlDiv = 0.72 + (sliceAttr / 100) * 0.42;
    sigma /= sliceCtrlDiv;
  }
  return Math.max(0, sigma);
}

// ═══════════════════════════════════════════════════════════════════════
// ── applyAngleNoise ───────────────────────────────────────────────────
// Adiciona ruído de σAngle ao netClearance — erro de rede emerge aqui.
//
// Quando SQ cai, σAngle aumenta. O ruído gaussiano pode degradar a
// clearance base o suficiente para a bola bater na rede — sem nenhum
// roll externo. É física pura.
//
// σAngle → Δclearance: 1° de desvio ≈ 0.042m na rede (dist. média ~12m)
// SQ=0.95 → σ ≈ 0.3° → Δclr ≈ ±0.013m  (quase zero)
// SQ=0.60 → σ ≈ 1.8° → Δclr ≈ ±0.075m  (começa a aparecer)
// SQ=0.30 → σ ≈ 3.2° → Δclr ≈ ±0.135m  (rede frequente)
// SQ=0.05 → σ ≈ 4.7° → Δclr ≈ ±0.197m  (rede quase certa em FLAT)
// ═══════════════════════════════════════════════════════════════════════

/**
 * @param {number} baseClearance — clearance base já calculada (m)
 * @param {string} shotType
 * @param {number} sq            — Strike Quality efectiva
 * @param {number} ctrlAttr      — controle reduz σAngle
 * @param {string} [swingType]   — 'REFLEX' amplia σAngle de volleys
 * @returns {number}             — clearance final com ruído de ângulo
 */
export function applyAngleNoise(baseClearance, shotType, sq, ctrlAttr, swingType) {
  const s    = getSigmaRuntimeConfig(shotType) ?? DEFAULT_SIGMA;
  const ctrl = ctrlAttr ?? 50;

  // Camada 1: lerp do σAngle em direção ao DISPERSAO_ERRO_BASE
  const errBase  = DEGRADACAO_CONFIG.DISPERSAO_ERRO_BASE;
  const ctrlCfg  = DEGRADACAO_CONFIG;
  const ctrlBonus = ((ctrl - 50) / 100) * ctrlCfg.CTRL_BONUS_ESCALA;
  const threshold = Math.max(ctrlCfg.CTRL_THRESHOLD_MIN, s.sqThresh - ctrlBonus);
  const lerpTeto  = ctrlCfg.CTRL_TETO_BASE - (ctrl / 100) * ctrlCfg.CTRL_TETO_ESCALA;
  const tRaw      = threshold > 0 ? (threshold - sq) / threshold : 0;
  const t         = Math.max(0, Math.min(lerpTeto, tRaw));

  // σAngle lerped entre o do shot e o DISPERSAO_ERRO_BASE
  const sigmaAngleLerped = s.σAMax + (errBase.sigma_angulo_max - s.σAMax) * t;

  // Reflex amplia o ruído de ângulo
  const reflexMult = (swingType === 'REFLEX' && s.reflexSigmaAMult) ? s.reflexSigmaAMult : 1.0;

  // ctrlDiv removido — threshold+ceiling já são os mecanismos de controle
  let sigmaAngleDeg = sigmaAngleLerped * (1.0 - sq) * reflexMult;

  // Gaussian noise (Box-Muller)
  const u1 = Math.max(1e-7, Math.random());
  const u2 = Math.random();
  const rNorm = Math.min(2.5, Math.sqrt(-2.0 * Math.log(u1))) * Math.cos(2 * Math.PI * u2);
  const clearanceNoise = rNorm * sigmaAngleDeg * 0.042;

  // Ruído assimétrico: degrada mais que melhora (erros são piores que acertos)
  const appliedNoise = clearanceNoise < 0 ? clearanceNoise : clearanceNoise * 0.4;

  return Math.max(0.01, baseClearance + appliedNoise);
}

// ═══════════════════════════════════════════════════════════════════════
// ── getAtpSpinMultipliers ─────────────────────────────────────────────
// Retorna multiplicadores de spin considerando atributos ATP.
//
// A diferença em relação ao sistema anterior:
//   Antes: topspinMult é coeficiente fixo do estilo (1.0, 1.3, etc.)
//   Agora: atributo topspin/slice modifica o RPM disponível diretamente
//          topspin=85 → 3200 RPM de posição lateral
//          topspin=45 → 1400 RPM do mesmo lugar (quica no quadril vs. ombro)
// ═══════════════════════════════════════════════════════════════════════

/**
 * @param {string} shotType
 * @param {Object} attrs    — atributos do jogador
 * @param {Object} [mods]   — mods de estilo (ainda usados como baseline)
 * @param {number} [sq]     — qualidade: spin cai com qualidade baixa
 * @returns {{ topspinMult: number, sliceMult: number, smashMult: number }}
 */
export function getAtpSpinMultipliers(shotType, attrs, mods, sq = 1.0) {
  // Escala de atributo → mult de RPM:
  // attr=20→0.72 | attr=50→1.00 | attr=85→1.35 | attr=99→1.49
  const topAttr  = attrs?.topspin ?? 50;
  const slcAttr  = attrs?.slice   ?? 50;
  // v4: smash controla a potência de spin no overhead; fallback para jogoDeRede legado
  const netAttr  = attrs?.smash ?? attrs?.jogoDeRede ?? 50;
  const atpTopMult = 0.72 + (topAttr / 100) * 0.77;
  const atpSlcMult = 0.72 + (slcAttr / 100) * 0.77;
  const atpNetMult = 0.72 + (netAttr / 100) * 0.77;

  // Qualidade degrada spin menos que velocidade (expoente 0.8 vs 1.25)
  // Q=0.50 → spinQFactor=0.65 (spin ainda existe em condições difíceis)
  const spinQFactor = 0.30 + Math.pow(Math.max(0, sq), 0.8) * 0.70;

  // Mods de estilo como baseline do personagem (herança)
  const styleTopspin = mods?.topspinMult ?? 1.0;
  const styleSlice   = mods?.sliceMult   ?? 1.0;
  // smashMult foi removido dos mods — jogoDeRede já é lido via atpNetMult acima
  const styleSmash   = 1.0;

  // Cap em 1.8: evita spins absurdos com attr 99 + estilo pesado
  return {
    topspinMult: Math.min(1.8, atpTopMult * spinQFactor * styleTopspin),
    sliceMult:   Math.min(1.8, atpSlcMult * spinQFactor * styleSlice),
    smashMult:   Math.min(1.6, atpNetMult * spinQFactor * styleSmash),
  };
}

// ── Utilitários de debug/analytics ─────────────────────────────────────────

/** Retorna o sqThresh do shot type (SQ onde erro < 5%). */
export function getSigmaThreshold(shotType) {
  return (getSigmaRuntimeConfig(shotType) ?? DEFAULT_SIGMA).sqThresh;
}

/** Retorna config σ completa para um shot type (para trace/debug). */
export function getShotSigmaConfig(shotType) {
  const blueprint = getShotBlueprint(shotType);
  return {
    ...(getSigmaRuntimeConfig(shotType) ?? DEFAULT_SIGMA),
    blueprintNome: blueprint.nome,
    blueprintLigado: blueprint.ligado !== false,
    blueprintDescricao: blueprint.descricao,
  };
}

