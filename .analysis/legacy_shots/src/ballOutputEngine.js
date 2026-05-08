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
const SHOT_SIGMA = {
  // σBase calibrado para Q_médio=70%: FLAT DTL com Q=70% → P(erro)~8-10%
  // ATP pros erram ~28-32 NF/jogo — maioria em shots agressivos perto das linhas.
  // NOTA: σBase agora é modulado por Q em computeSigmaX (não é 100% fixo).
  // Em OPPORTUNITY (Q=86-95%), σBase é reduzido ~50%. Em DIFFICULT (Q<25%), quase integral.
  // Valores reduzidos para refletir que em alta qualidade o erro base é menor.
  FLAT:        { σBase: 0.26, σXMax: 0.95, σAMax: 6.0, sqThresh: 0.75, dirRisk: { CC:1.0, DTL:1.6, WIDE:2.2 } },
  SAFE:        { σBase: 0.08, σXMax: 0.52, σAMax: 3.2, sqThresh: 0.42, dirRisk: { CC:1.0, DTL:1.3, WIDE:1.6 } },
  TOPSPIN:     { σBase: 0.15, σXMax: 0.72, σAMax: 4.5, sqThresh: 0.55, dirRisk: { CC:1.0, DTL:1.6, WIDE:2.2 } },
  HEAVY_TOP:   { σBase: 0.20, σXMax: 0.82, σAMax: 5.0, sqThresh: 0.60, dirRisk: { CC:1.0, DTL:1.6, WIDE:2.2 } },
  SLICE:       { σBase: 0.09, σXMax: 0.65, σAMax: 3.5, sqThresh: 0.48, dirRisk: { CC:1.0, DTL:1.4, WIDE:1.8 } },
  SLICE_SHORT: { σBase: 0.09, σXMax: 0.58, σAMax: 4.0, sqThresh: 0.52, dirRisk: { CC:1.0, DTL:1.4, WIDE:1.8 } },
  DROP:        { σBase: 0.12, σXMax: 0.45, σAMax: 9.0, sqThresh: 0.62, dirRisk: { CC:1.0, DTL:1.2, WIDE:1.6 } },
  BANANA:      { σBase: 0.16, σXMax: 0.70, σAMax: 4.5, sqThresh: 0.62, dirRisk: { CC:1.2, DTL:1.4, WIDE:2.4 } },
  PASSING:     { σBase: 0.20, σXMax: 0.72, σAMax: 5.0, sqThresh: 0.58, dirRisk: { CC:1.0, DTL:1.8, WIDE:2.4 } },
  SHORT_ANGLE: { σBase: 0.22, σXMax: 0.76, σAMax: 5.0, sqThresh: 0.65, dirRisk: { CC:1.0, DTL:1.5, WIDE:2.6 } },
  // ACCEL e SHORT_ACCEL — os mais agressivos do sistema, σ mais alto
  ACCEL:       { σBase: 0.22, σXMax: 0.95, σAMax: 6.0, sqThresh: 0.70, dirRisk: { CC:1.0, DTL:1.7, WIDE:2.3 } },
  SHORT_ACCEL: { σBase: 0.17, σXMax: 0.78, σAMax: 5.2, sqThresh: 0.62, dirRisk: { CC:1.0, DTL:1.5, WIDE:2.4 } },
  // ── Net shots ────────────────────────────────────────────────────────────
  VOLLEY:      { σBase: 0.10, σXMax: 0.60, σAMax: 4.0, sqThresh: 0.58,
                 dirRisk: { CC:1.0, DTL:1.5, WIDE:2.0 },
                 reflexSigmaXMult: 2.2, reflexSigmaAMult: 2.3 },
  HALF_VOLLEY: { σBase: 0.20, σXMax: 0.90, σAMax: 6.5, sqThresh: 0.72, dirRisk: { CC:1.0, DTL:1.6, WIDE:2.0 } },
  SMASH:       { σBase: 0.12, σXMax: 0.72, σAMax: 5.5, sqThresh: 0.68, dirRisk: { CC:1.0, DTL:1.3, WIDE:1.8 } },
  LOB:         { σBase: 0.15, σXMax: 0.90, σAMax: 2.8, sqThresh: 0.48, dirRisk: { CC:1.0, DTL:1.2, WIDE:1.5 } },
  // Legacy aliases mantidos para compatibilidade
  LOB_DEF:     { σBase: 0.16, σXMax: 1.05, σAMax: 2.5, sqThresh: 0.45, dirRisk: { CC:1.0, DTL:1.2, WIDE:1.4 } },
  LOB_ATK:     { σBase: 0.14, σXMax: 0.80, σAMax: 3.0, sqThresh: 0.55, dirRisk: { CC:1.0, DTL:1.3, WIDE:1.6 } },
};

const DEFAULT_SIGMA = { σBase: 0.10, σXMax: 0.65, σAMax: 4.5, sqThresh: 0.65, dirRisk: { CC:1.0, DTL:1.6, WIDE:2.0 } };

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
// Mais potência = mais risco lateral (física real)
// potencia=30  → −0.10 | potencia=50  → +0.025 | potencia=99  → +0.15
function potenciaSigmaBias(potAttr) {
  return -0.10 + (potAttr / 100) * 0.25;
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

/**
 * @param {string} shotType
 * @param {number} sq        — Strike Quality efectiva (0–1), já capada pelo fm
 * @param {number} targetX   — alvo X (para detectar CC/DTL/WIDE)
 * @param {number} halfS     — metade da largura da quadra (COURT.singlesW/2 = 4.115)
 * @param {number} ctrlAttr  — atributo controle (0–99)
 * @param {number} potAttr   — atributo potencia (0–99)
 * @param {string} [swingType] — 'REFLEX' amplia σ de volleys
 * @param {number} [playerX]   — posição X do jogador (para detectar DTL)
 * @returns {number} σX em metros
 */
export function computeSigmaX(shotType, sq, targetX, halfS, ctrlAttr, potAttr, swingType, playerX) {
  const s = SHOT_SIGMA[shotType] ?? DEFAULT_SIGMA;
  let sigmaBase = s.σXMax;

  // Reflex volley: dispersão muito maior
  if (swingType === 'REFLEX' && s.reflexSigmaXMult) {
    sigmaBase *= s.reflexSigmaXMult;
  }

  // Direção do shot → risco lateral
  const dir     = detectDirection(targetX, playerX ?? 0, halfS);
  const dirMult = s.dirRisk[dir] ?? 1.0;

  // Atributos
  const rawCDiv = ctrlDiv(ctrlAttr ?? 50);
  const cDiv    = Math.min(rawCDiv, 1.80);  // cap anti-outlier
  const pBias   = 1.0 + potenciaSigmaBias(potAttr ?? 50);

  // σX = (σBase + σMax × f(SQ)) × dirMult × potBias / ctrlDiv
  // FIX: (1 - sq) linear → pow(1-sq, 0.75) sub-linear:
  //   sigma cresce MAIS RÁPIDO em Q médio-baixo, produzindo spreads realistas.
  //   Q=0.90 → (0.10)^0.75 = 0.133 (era 0.10)  — quase igual em Q alto
  //   Q=0.50 → (0.50)^0.75 = 0.595 (era 0.50)  — +19% de spread em Q50
  //   Q=0.25 → (0.75)^0.75 = 0.816 (era 0.75)  — +9% em Q25 (base já alta)
  //   Efeito real: Q50 passa de σ≈0.5m para σ≈0.65m; Q25 de σ≈0.8m para σ≈0.9m+
  const sqFactor   = Math.pow(Math.max(0, 1.0 - sq), 0.75);
  // σBase Q-dependente: em alta qualidade (OPPORTUNITY Q=86-95%), o erro base
  // encolhe significativamente. Em baixa qualidade (DIFFICULT Q<25%), quase integral.
  // Q=1.0 → fator=0.30 | Q=0.86 → fator=0.48 | Q=0.50 → fator=0.76 | Q=0.10 → fator=0.96
  const sigmaBaseFactor = 0.30 + Math.pow(Math.max(0, 1.0 - sq), 0.6) * 0.70;
  const sigmaFixed = (s.σBase ?? 0) * sigmaBaseFactor;
  const sigma      = (sigmaFixed + sigmaBase * sqFactor) * dirMult * pBias / cDiv;
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
 * @param {number} ctrlAttr      — controle reduce σAngle
 * @param {string} [swingType]   — 'REFLEX' amplia σAngle de volleys
 * @returns {number}             — clearance final com ruído de ângulo
 */
export function applyAngleNoise(baseClearance, shotType, sq, ctrlAttr, swingType) {
  const s = SHOT_SIGMA[shotType] ?? DEFAULT_SIGMA;
  let sigmaAngleDeg = s.σAMax * (1.0 - sq) / ctrlDiv(ctrlAttr ?? 50);

  // Reflex amplia o ruído de ângulo
  if (swingType === 'REFLEX' && s.reflexSigmaAMult) {
    sigmaAngleDeg *= s.reflexSigmaAMult;
  }

  // Gaussian noise (Box-Muller)
  const u1 = Math.max(1e-7, Math.random());
  const u2 = Math.random();
  const rNorm = Math.min(2.5, Math.sqrt(-2.0 * Math.log(u1))) * Math.cos(2 * Math.PI * u2);
  const clearanceNoise = rNorm * sigmaAngleDeg * 0.042;

  // Ruído assimétrico: degrada mais que melhora (erros são piores que acertos)
  // 100% do ruído negativo aplicado, 40% do ruído positivo
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
  return (SHOT_SIGMA[shotType] ?? DEFAULT_SIGMA).sqThresh;
}

/** Retorna config σ completa para um shot type (para trace/debug). */
export function getShotSigmaConfig(shotType) {
  return SHOT_SIGMA[shotType] ?? DEFAULT_SIGMA;
}
