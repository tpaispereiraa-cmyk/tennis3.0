// shotPhysics.js — Física dos golpes (Shot System v4)
// ═══════════════════════════════════════════════════════════════════
// Define os parâmetros físicos de cada golpe: velocidade, spin,
// trajetória, profundidade e risco base.
//
// Golpes ativos (gerados pelo shotDecision.js):
//   NORMAL       — golpe base, absorve papel do antigo SAFE
//   SHORT        — bola curta tática, muda ritmo
//   TOPSPIN      — pressão com profundidade e altura
//   SLICE        — variação, defesa, aproximação
//   DROP         — finesse, adversário fundo
//   DEF_LOB      — emergência com adversário na rede
//   AGG_LOB      — winner por cima de quem está na rede
//   ACCEL        — ataque real — winner ou pressão extrema
//   SHORT_ACCEL  — ângulo, abertura de quadra, desorganização
//   BANANA       — trivela com curva lateral
//
// Física legacy (mantida para compatibilidade, nunca gerada pela IA):
//   SAFE, SLICE_SHORT — substituídos por NORMAL e SLICE respectivamente
// ═══════════════════════════════════════════════════════════════════

// ── Física por golpe ────────────────────────────────────────────────
// pow:        [min, max] em m/s (×3.6 = km/h)
// hitH:       [min, max] altura de contato em metros
// clr:        [min, max] clearance sobre a rede em metros
// depth:      [min, max] profundidade (fração da meia-quadra)
// spinFn:     função (spinMag, svy) → contribuição de spin
// spinZ:      função (spinMag) → spin vertical
// Nota: riskBase foi removido — código morto. O risco canônico está em
//       RISK_BASE (shotDecision.js), que é o único lido em runtime.

export const SHOT_PHYSICS = {

  // ── Golpes de Rally ──────────────────────────────────────────────

  SAFE: {
    pow:      [19.4, 26.4],   // 70–95 km/h
    hitH:     [0.70, 1.00],
    clr:      [0.70, 1.20],
    depth:    [0.55, 0.72],
    spinFn:   (sm, svy) => -sm * 0.8 * Math.sign(svy),
    spinZ:    (sm)      =>  sm * 0.12,
  },

  TOPSPIN: {
    pow:      [25.0, 38.3],   // 90–138 km/h  (ATP avg ~115–120, peak Djokovic/Nadal FH)
    hitH:     [0.70, 1.00],
    clr:      [0.50, 0.90],
    depth:    [0.52, 0.76],   // 6.2–9.0m — topspin targets realistas
    spinFn:   (sm, svy) => -sm * 1.2 * Math.sign(svy),
    spinZ:    (sm)      =>  sm * 0.20,
  },

  SLICE: {
    pow:      [20.8, 31.9],   // 75–115 km/h — ainda chega fundo, mas menos “floaty”
    hitH:     [0.34, 0.58],
    clr:      [0.08, 0.24],   // trajetória mais faca, menos arco lobado
    depth:    [0.44, 0.68],
    spinFn:   (sm, svy) =>  sm * 1.05 * Math.sign(svy),
    spinZ:    (sm)      =>  sm * 0.08,
  },

  DROP: {
    pow:      [8.1,  13.4],   // 29–48 km/h — limpa a rede com margem mínima e ainda morre cedo
    hitH:     [0.22, 0.38],
    clr:      [0.05, 0.12],   // deixa de raspar a fita em qualquer execução mediana
    depth:    [0.12, 0.24],   // 1.4–2.9m da rede — curto de verdade, mas jogável
    spinFn:   (sm, svy) =>  sm * 4.2 * Math.sign(svy),
    spinZ:    (sm)      =>  sm * 0.04,
  },

  LOB: {
    pow:      [13.9, 27.8],   // 50–100 km/h — range cobre defensivo e agressivo
    hitH:     [0.80, 1.20],
    clr:      [2.20, 5.50],   // arco alto — situação decide a altura real
    depth:    [0.75, 0.95],
    spinFn:   (sm, svy) => -sm * 1.0 * Math.sign(svy),
    spinZ:    (sm)      =>  sm * 0.15,
  },

  ACCEL: {
    pow:      [30.6, 46.7],   // 110–168 km/h  (ATP avg ~130–140, peak Zverev/Medvedev flat FH)
    hitH:     [0.75, 0.92],
    clr:      [0.15, 0.35],
    depth:    [0.64, 0.86],
    spinFn:   (sm, svy) => -sm * 0.3 * Math.sign(svy),
    spinZ:    ()        =>  0,
  },

  SHORT_ACCEL: {
    pow:      [26.4, 37.5],   // 95–135 km/h  (angle trades pace for placement)
    hitH:     [0.75, 1.05],
    clr:      [0.20, 0.45],
    depth:    [0.38, 0.62],
    spinFn:   (sm, svy) => -sm * 1.5 * Math.sign(svy),
    spinZ:    (sm)      =>  sm * 0.30,
  },

  // ── Golpes Especiais de Rally ────────────────────────────────────

  // BANANA — Batida forte com spin diagonal, curva lateral como trivela + arco para baixo.
  // A bola parece sair pela linha, curva para dentro e senta baixa.
  // Alta potência + spin lateral extremo + topspin = o golpe mais difícil de ler.
  BANANA: {
    pow:      [22.2, 33.3],   // 80–120 km/h — spin pesado rouba pace (Nadal BFHCC avg ~92)
    hitH:     [0.82, 1.08],   // SWEET/SHOULDER — geração de spin exige altura média-alta
    clr:      [0.38, 0.68],   // arco moderado — a curva carrega a bola, não a altura
    depth:    [0.46, 0.70],   // média — o ângulo lateral substitui a profundidade
    spinFn:   (sm, svy) => -sm * 3.2 * Math.sign(svy),  // spin lateral fortíssimo — a trivela
    spinZ:    (sm)      =>  sm * 0.42,                   // topspin para o arco descendente
  },

  // SLICE_SHORT — Slice que cai na meia-quadra adversária, forçando corrida para frente.
  // Mais pesado que um drop, mais curto que um slice normal. Quique baixo e rasteiro.
  SLICE_SHORT: {
    pow:      [18.1, 27.8],   // 65–100 km/h
    hitH:     [0.38, 0.64],
    clr:      [0.10, 0.24],
    depth:    [0.30, 0.50],
    spinFn:   (sm, svy) =>  sm * 1.45 * Math.sign(svy),
    spinZ:    (sm)      =>  sm * 0.06,
  },

  // ── Golpes Especiais (rede / overhead) ──────────────────────────

  VOLLEY: {
    pow:      [16.7, 31.9],   // 60–115 km/h
    hitH:     [1.00, 1.50],
    clr:      [0.20, 0.50],
    depth:    [0.55, 0.80],
    spinFn:   (sm, svy) =>  sm * 0.5 * Math.sign(svy),
    spinZ:    (sm)      =>  sm * 0.30,
  },

  SMASH: {
    pow:      [38.9, 48.6],   // 140–175 km/h
    hitH:     [2.20, 2.80],
    clr:      [0.30, 0.60],
    depth:    [0.80, 0.92],
    spinFn:   (sm, svy) => -sm * 0.3 * Math.sign(svy),
    spinZ:    (sm)      =>  sm * 0.10,
  },
};

// ── SPIN_MAP ─────────────────────────────────────────────────────
// Determina o tipo de spin para física de quique.
// 1 = topspin (quica alto), 0 = plano, -1 = backspin (quica baixo)
export const SPIN_MAP = {
  SAFE:        1,
  TOPSPIN:     1,
  SLICE:      -1,
  DROP:       -1,
  LOB:         1,
  ACCEL:       0,
  SHORT_ACCEL: 1,
  BANANA:      1,
  SLICE_SHORT:-1,
  VOLLEY:      0,
  SMASH:       0,
  // Legacy aliases
  NORMAL:      1,
  SHORT:       0,
  FLAT:        0,
  HEAVY_TOP:   1,
  PASSING:     1,
  DEF_LOB:     0,
  AGG_LOB:     1,
  LOB_DEF:     0,
  LOB_ATK:     1,
  SHORT_ANGLE: 1,
  HALF_VOLLEY: 0,
};

// ── Mapeamento legado → novo (para compatibilidade de trace/UI) ──
export const LEGACY_TO_NEW = {
  NORMAL:      'TOPSPIN',
  SHORT:       'TOPSPIN',  // bola curta → agora emerge da intensidade baixa do TOPSPIN
  FLAT:        'ACCEL',
  HEAVY_TOP:   'TOPSPIN',
  PASSING:     'ACCEL',
  DEF_LOB:     'LOB',
  AGG_LOB:     'LOB',
  LOB_DEF:     'LOB',
  LOB_ATK:     'LOB',
  SHORT_ANGLE: 'SHORT_ACCEL',
  HALF_VOLLEY: 'SLICE',
};

// ── Helper: retorna física do golpe (com fallback) ────────────────
export function getShotPhysics(shotType) {
  return SHOT_PHYSICS[shotType] ?? SHOT_PHYSICS.TOPSPIN;
}
