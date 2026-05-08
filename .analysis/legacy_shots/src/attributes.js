/**
 * attributes.js — Sistema de 21 Atributos v4
 * ─────────────────────────────────────────────────────────────────
 * Evolução do sistema de 14 → 21 atributos.
 *
 * PRINCÍPIOS:
 *   1. Cada atributo responde "o que X faz?" em uma frase.
 *   2. Diferença entre 40 e 90 é VISÍVEL na quadra — não cosmética.
 *   3. Forehand e Backhand são armas distintas — modeladas separadamente.
 *   4. Saque tem força e precisão como dimensões independentes.
 *   5. Rede deixa de ser um bloco monolítico: volley ≠ smash.
 *   6. Mente tem 4 dimensões: clutch, consistência, recuperação, adaptação.
 *
 * OS 21 ATRIBUTOS (6 pilares):
 *
 * ── CORPO ──────────────────────────────────────────────────────────
 *   velocidade    → velocidade máxima de deslocamento (top speed)
 *   explosividade → aceleração/primeira passada + recuperação de posição
 *   resistencia   → quanto tempo sustenta nível total sob fadiga extrema
 *   defesa        → qualidade de golpes recuperados em posição desfavorável
 *
 * ── GOLPES ─────────────────────────────────────────────────────────
 *   fhPotencia    → força máxima do forehand (arma ofensiva principal)
 *   fhControle    → precisão + consistência do forehand
 *   bhPotencia    → força máxima do backhand
 *   bhControle    → precisão + consistência do backhand
 *   topspin       → efeito topspin global: quique alto, angulação, rally pesado
 *   slice         → slice/backspin global: bola baixa, ritmo quebrado
 *
 * ── SAQUE & RETORNO ────────────────────────────────────────────────
 *   saqueForca    → velocidade máxima + explosão no saque
 *   saquePrecisao → colocação + variação + consistência de 2° saque
 *   devolucao     → leitura + timing específico para devolver qualquer saque
 *
 * ── REDE ───────────────────────────────────────────────────────────
 *   volley        → toque + direção + reflexo na rede
 *   smash         → timing + potência no overhead — cobre o lob
 *
 * ── LEITURA & DECISÃO ──────────────────────────────────────────────
 *   leitura       → antecipação de trajetórias + escolha inteligente de golpe
 *   visaoTatica   → construção de pontos, quando atacar, onde explorar fraquezas
 *
 * ── CABEÇA ─────────────────────────────────────────────────────────
 *   mentalidade   → clutch em break points/tiebreaks — amplificado em decisivos
 *   regularidade  → estabilidade de nível jogo a jogo
 *   recuperacao   → resiliência após break, set perdido, série de erros
 *   adaptacao     → muda o game plan, absorve coaching, evolui na partida
 */

// ── Metadados de categoria ────────────────────────────────────────
export const ATTR_CATEGORIES = [
  {
    id: 'corpo', label: 'CORPO', color: '#00FF88', glow: 'rgba(0,255,136,.15)',
    attrs: [
      { key: 'velocidade',    label: 'Velocidade',    note: 'Vel. máxima de deslocamento — chega às bolas largas' },
      { key: 'explosividade', label: 'Explosividade', note: 'Aceleração + 1ª passada — recupera posição após golpe' },
      { key: 'resistencia',   label: 'Resistência',   note: 'Sustenta nível alto no 5º set — fadiga corrói atributos' },
      { key: 'defesa',        label: 'Defesa',        note: 'Qualidade de golpes fora de posição — passing shots, moonballs, lobs defensivos' },
    ],
  },
  {
    id: 'golpes', label: 'GOLPES', color: '#FF6B35', glow: 'rgba(255,107,53,.15)',
    attrs: [
      { key: 'fhPotencia', label: 'FH Potência', note: 'Força do forehand — arma ofensiva principal' },
      { key: 'fhControle', label: 'FH Controle', note: 'Precisão + consistência do forehand — tradeoff com potência' },
      { key: 'bhPotencia', label: 'BH Potência', note: 'Força do backhand — define se é arma ou ponto fraco' },
      { key: 'bhControle', label: 'BH Controle', note: 'Precisão + consistência do backhand — essencial para estabilidade' },
      { key: 'topspin',    label: 'Topspin',     note: 'Quique alto, ângulos pesados, rally de argila — efeito global' },
      { key: 'slice',      label: 'Slice',       note: 'Bola baixa, ritmo quebrado, dropshot natural — efeito global' },
    ],
  },
  {
    id: 'saque', label: 'SAQUE & RETORNO', color: '#FFD700', glow: 'rgba(255,215,0,.13)',
    attrs: [
      { key: 'saqueForca',    label: 'Saque Força',    note: 'Velocidade máxima + explosão — ace potential, kick bounce alto' },
      { key: 'saquePrecisao', label: 'Saque Precisão', note: 'Colocação T/corpo/wide + consistência de 2° saque — nunca dá dupla falta' },
      { key: 'devolucao',     label: 'Devolução',      note: 'Leitura do saque + timing + qualidade de retorno agressivo' },
    ],
  },
  {
    id: 'rede', label: 'REDE', color: '#00D4FF', glow: 'rgba(0,212,255,.14)',
    attrs: [
      { key: 'volley', label: 'Volley', note: 'Toque, direção e reflexo na rede — a arte do volley' },
      { key: 'smash',  label: 'Smash',  note: 'Timing + potência no overhead — cobre o lob com autoridade' },
    ],
  },
  {
    id: 'leitura', label: 'LEITURA & DECISÃO', color: '#AA44FF', glow: 'rgba(170,68,255,.14)',
    attrs: [
      { key: 'leitura',     label: 'Leitura',      note: 'Antecipa trajetórias + escolhe golpe certo no momento certo' },
      { key: 'visaoTatica', label: 'Visão Tática', note: 'Constrói pontos, sabe quando atacar — explora fraquezas do adversário' },
    ],
  },
  {
    id: 'mental', label: 'CABEÇA', color: '#FF4444', glow: 'rgba(255,68,68,.14)',
    attrs: [
      { key: 'mentalidade', label: 'Mentalidade', note: 'Break point/tiebreak: efeito AMPLIFICADO — diferença real sob pressão' },
      { key: 'regularidade', label: 'Regularidade', note: 'Estabilidade de nível entre jogos — baixo = zebra, alto = máquina' },
      { key: 'recuperacao',  label: 'Recuperação',  note: 'Ressurge após break, set perdido ou série de erros — resiliência' },
      { key: 'adaptacao',    label: 'Adaptação',    note: 'Muda game plan no changeover, absorve coaching — evolui na partida' },
    ],
  },
];

// ── Overall Rating v4 ─────────────────────────────────────────────
// Pesos recalibrados para v4 (21 attrs) — soma = 1.00
// catAvgSpecialized usa asa dominante para golpes/saque/rede/leitura,
// então os pesos refletem impacto real no resultado, não punição por off-role attrs.
const OVERALL_WEIGHTS = {
  corpo:   0.20,   // físico é base — 4 attrs (velocidade, explo, resistencia, defesa)
  golpes:  0.28,   // rally quality — asa dominante (FH ou BH, o que for melhor)
  saque:   0.16,   // saque: melhor de força/precisão + retorno
  rede:    0.05,   // net game: melhor de volley/smash — peso menor, especialidade
  leitura: 0.13,   // inteligência: leitura ou visão tática — o dominante conta mais
  mental:  0.18,   // 4 dimensões: clutch, consistência, recuperação, adaptação
};

export function catAvg(catId, attrs) {
  const cat = ATTR_CATEGORIES.find(c => c.id === catId);
  if (!cat) return 0;
  const vals = cat.attrs.map(a => attrs[a.key] ?? 0);
  return Math.round(vals.reduce((s, v) => s + v, 0) / vals.length);
}

// ── catAvg especializado v4 ──────────────────────────────────────────
// Usa "asa dominante" para categorias onde a especialização define o jogador,
// evitando penalizar especialistas por ter um lado fraco ou não usar certa área.
function catAvgSpecialized(catId, attrs) {
  if (catId === 'golpes') {
    // Potência e controle: asa dominante (max FH/BH) — um Bjornstad não é penalizado
    // por ter FH fraco se seu BH de controle e defesa são o que o define.
    return Math.round((
      Math.max(attrs.fhPotencia ?? 0, attrs.bhPotencia ?? 0) +
      Math.max(attrs.fhControle ?? 0, attrs.bhControle ?? 0) +
      (attrs.topspin ?? 0) +
      (attrs.slice   ?? 0)
    ) / 4);
  }
  if (catId === 'saque') {
    // Força e precisão: o melhor dos dois conta mais — Big Server tem saqueForca como
    // identidade; precision server tem saquePrecisao. Ambos são sistemas completos.
    return Math.round(
      Math.max(attrs.saqueForca ?? 0, attrs.saquePrecisao ?? 0) * 0.45 +
      Math.min(attrs.saqueForca ?? 0, attrs.saquePrecisao ?? 0) * 0.25 +
      (attrs.devolucao ?? 0) * 0.30
    );
  }
  if (catId === 'rede') {
    // Volley e smash: a melhor arma de rede define o net player.
    // McEnroe tinha volley divino e smash irregular — ainda era elite na rede.
    return Math.round(
      Math.max(attrs.volley ?? 0, attrs.smash ?? 0) * 0.60 +
      Math.min(attrs.volley ?? 0, attrs.smash ?? 0) * 0.40
    );
  }
  if (catId === 'leitura') {
    // Leitura reativa vs visão tática proativa — a habilidade dominante vale mais.
    // Bjornstad com leitura:92 + visaoTatica:60 é um leitor brilhante, não um tático ruim.
    return Math.round(
      Math.max(attrs.leitura ?? 0, attrs.visaoTatica ?? 0) * 0.65 +
      Math.min(attrs.leitura ?? 0, attrs.visaoTatica ?? 0) * 0.35
    );
  }
  // corpo e mental: média simples — todas as dimensões importam igualmente
  return catAvg(catId, attrs);
}

export function overallRating(attrs) {
  let base = 0;
  for (const [id, w] of Object.entries(OVERALL_WEIGHTS)) {
    base += catAvgSpecialized(id, attrs) * w;
  }

  // Calibração v4: 21 atributos têm mais dimensões "off-role" que o sistema v3 de 14.
  // +2.0 restaura a escala de referência sem inflar artificialmente.
  const calibration = 2.0;

  // Peak Bonus: top 4 atributos acima de 84, 0.11/pt
  // Top 4 (vs 3 em v3) porque 21 attrs permitem especialistas com mais picos legítimos.
  const allVals = Object.values(attrs).sort((a, b) => b - a).slice(0, 4);
  const peakBonus = allVals.reduce((s, v) => s + Math.max(0, v - 84) * 0.11, 0);

  // Specialty bonus: sistema de jogo dominante (rede ou golpes acima de elite)
  const redeAvg   = catAvgSpecialized('rede',   attrs);
  const golpesAvg = catAvgSpecialized('golpes', attrs);
  const specialtyBonus = Math.max(0, (redeAvg   - 86) * 0.10) +   // net mastery
                         Math.max(0, (golpesAvg  - 88) * 0.05);   // ground dominance

  // Penalty de BH fraco: só entra abaixo de 45 (fraqueza extrema, não apenas assimetria)
  const bhPenalty = Math.max(0, (45 - (attrs.bhControle ?? 50))) * 0.04;

  return Math.round(Math.min(99, base + calibration + peakBonus + specialtyBonus - bhPenalty));
}

export function overallGrade(ov) {
  if (ov >= 92) return 'S+';
  if (ov >= 87) return 'S';
  if (ov >= 82) return 'A+';
  if (ov >= 77) return 'A';
  if (ov >= 72) return 'B+';
  if (ov >= 67) return 'B';
  return 'C';
}

// ── Soft cap ──────────────────────────────────────────────────────
function softCap(v, threshold = 90, scale = 0.45) {
  if (v <= threshold) return v;
  return threshold + (v - threshold) * scale;
}

// ── Wing helpers (exportados para uso no engine) ──────────────────
export function getWingPotencia(attrs, isBackhand) {
  return isBackhand
    ? (attrs.bhPotencia ?? attrs.potencia ?? 60)
    : (attrs.fhPotencia ?? attrs.potencia ?? 65);
}

export function getWingControle(attrs, isBackhand) {
  return isBackhand
    ? (attrs.bhControle ?? attrs.controle ?? 60)
    : (attrs.fhControle ?? attrs.controle ?? 60);
}

// ── computePlayerMods ─────────────────────────────────────────────
export function computePlayerMods(attrs) {
  // ── CORPO ──────────────────────────────────────────────────────
  const speedMult        = 0.72 + (attrs.velocidade    / 100) * 0.50;
  const accelMult        = 0.72 + (attrs.explosividade / 100) * 0.56;
  const decelMult        = 0.72 + (softCap(attrs.explosividade) / 100) * 0.56;
  const reachBonus       = (attrs.explosividade - 50) / 100 * 0.22;
  // [BAL v1] softCap cap=90→88, scale=0.45→0.35: resistencia 88→0.626 | 96→0.583
  // gap comprimido (era 0.632 vs 0.570) — diferença de resistência ainda visível mas não esmagadora
  const staminaDecayMult = 1.55 - (softCap(attrs.resistencia, 88, 0.35) / 100) * 1.05;
  // [BAL v1] defensaMult: softCap cap 88, scale 0.45 — defesa 97 não domina defesa 86 em +6.7%
  // defesa 86→1.159 | defesa 97→1.198 (era 1.152 vs 1.229 — gap 0.077→0.039)
  const defensaMult = 0.60 + (softCap(attrs.defesa, 88, 0.45) / 100) * 0.65;

  // ── GOLPES — asa esquerda e direita ───────────────────────────
  const fhBallSpeedMult  = 0.70 + (attrs.fhPotencia / 100) * 0.56;
  const fhPrecisaoFactor = 0.70 + (softCap(attrs.fhControle, 90, 0.45) / 100) * 0.59;
  const bhBallSpeedMult  = 0.70 + (attrs.bhPotencia / 100) * 0.56;
  const bhPrecisaoFactor = 0.70 + (softCap(attrs.bhControle, 90, 0.45) / 100) * 0.59;
  const topspinMult      = 0.60 + (attrs.topspin / 100) * 0.75;
  const sliceMult        = 0.60 + (attrs.slice   / 100) * 0.75;

  // ── SAQUE (split força + precisão) ────────────────────────────
  const serveForcaMult1   = 0.70 + (attrs.saqueForca    / 100) * 0.56;
  const serveForcaMult2   = 0.78 + (attrs.saqueForca    / 100) * 0.38;
  const servePrecisaoMult = 0.80 + (attrs.saquePrecisao / 100) * 0.45;
  // serveScatter: inversamente proporcional à precisão
  const serveScatter = Math.max(0.35, 1.40 - attrs.saquePrecisao / 100);
  // [BAL v1] returnMult: softCap cap=90, scale=0.40 — devolucao 95 não anula saque top
  // devolucao 84→0.887 | devolucao 95→0.928 (era 0.926 vs 0.997 — gap 0.071→0.041)
  const returnMult   = 0.45 + (softCap(attrs.devolucao, 90, 0.40) / 100) * 0.52;
  // [BAL v1] potência ofensiva amplificada: range 0.50→0.56
  // fhPotencia 58→1.025 | fhPotencia 76→1.126 — gap ofensivo Nakamura mais pronunciado

  // ── REDE (split volley + smash) ────────────────────────────────
  const volleyMult       = 0.55 + (attrs.volley / 100) * 0.80;
  const reflexoQualBonus = (attrs.volley - 50) / 100 * 0.35;
  const lobCovMult       = 0.55 + (attrs.volley / 100) * 0.55;
  const smashMult        = 0.55 + (attrs.smash  / 100) * 0.80;
  // netApproachMult: eficácia de subir à rede depende dos dois
  const netVSAvg       = (attrs.volley + attrs.smash) / 2;
  const netApproachMult = 0.40 + (netVSAvg / 100) * 1.40;

  // ── LEITURA & VISÃO TÁTICA ─────────────────────────────────────
  const leituraFactor    = attrs.leitura     / 100;
  const visaoFactor      = attrs.visaoTatica / 100;
  // visão alta = ataca mais cedo com propósito
  const patienceRallyMin = Math.round(2 + ((100 - attrs.visaoTatica) / 100) * 6);

  // ── CABEÇA ────────────────────────────────────────────────────
  const mentalFactor    = attrs.mentalidade / 100;
  const pressaoFactor   = mentalFactor;
  const clutchFactor    = mentalFactor;
  const recupFactor     = attrs.recuperacao  / 100;
  const adaptacaoFactor = attrs.adaptacao    / 100;
  const varFactor       = attrs.regularidade / 100;

  return {
    // Corpo
    speedMult, accelMult, decelMult, reachBonus, staminaDecayMult, defensaMult,
    // Golpes asa-específicos
    fhBallSpeedMult, fhPrecisaoFactor,
    bhBallSpeedMult, bhPrecisaoFactor,
    topspinMult, sliceMult,
    // Saque & Retorno
    serveForcaMult1, serveForcaMult2, servePrecisaoMult, serveScatter, returnMult,
    // Rede
    volleyMult, smashMult, netApproachMult, reflexoQualBonus, lobCovMult,
    // Leitura & Tática
    leituraFactor, visaoFactor, patienceRallyMin,
    // Cabeça
    mentalFactor, pressaoFactor, clutchFactor, recupFactor, adaptacaoFactor, varFactor,
    // ── Compat aliases para código ainda não migrado ────────────────
    ballSpeedMult:  fhBallSpeedMult,   // fallback: FH como default
    precisaoFactor: fhPrecisaoFactor,
    netMult:        volleyMult,
    volleyFactor:   volleyMult,
    serveMult1:     serveForcaMult1,
    serveMult2:     serveForcaMult2,
    agressFactor:   visaoFactor,
    agresDecFactor: visaoFactor,
  };
}

export function applyModsToStyle(baseStyle, _mods) {
  return baseStyle;
}

// ── Migração v3 (14 attrs) → v4 (21 attrs) ───────────────────────
export function migrateAttrsToV3(oldAttrs) {
  if (!oldAttrs) return null;

  // Já é v4? Retorna clone — nunca o objeto original (evita mutação de NAMED_PLAYERS)
  if (oldAttrs.fhPotencia !== undefined && oldAttrs.saqueForca !== undefined) {
    return { ...oldAttrs };
  }

  // É v3 (14 attrs)? Migra para v4.
  if (oldAttrs.potencia !== undefined) {
    const potencia = oldAttrs.potencia  ?? 65;
    const controle = oldAttrs.controle  ?? 65;
    const saque    = oldAttrs.saque     ?? 65;
    const jdr      = oldAttrs.jogoDeRede ?? 60;
    const aggr     = oldAttrs.agressividade ?? 60;
    const leitura  = oldAttrs.leitura  ?? 65;
    const mental   = oldAttrs.mentalidade ?? 70;
    const reg      = oldAttrs.regularidade ?? 70;
    const vel      = oldAttrs.velocidade ?? 70;
    const res      = oldAttrs.resistencia ?? 70;

    return {
      velocidade:    vel,
      explosividade: oldAttrs.explosividade ?? 70,
      resistencia:   res,
      defesa: Math.round(controle * 0.50 + vel * 0.30 + res * 0.20),

      fhPotencia: potencia,
      fhControle: controle,
      bhPotencia: Math.round(potencia * 0.92),
      bhControle: Math.round(controle * 0.95),
      topspin:    oldAttrs.topspin ?? 65,
      slice:      oldAttrs.slice   ?? 65,

      saqueForca:    saque,
      saquePrecisao: saque,
      devolucao:     oldAttrs.devolucao ?? 65,

      volley: jdr,
      smash:  Math.round(jdr * 0.90),

      leitura,
      visaoTatica: Math.round(leitura * 0.60 + aggr * 0.40),

      mentalidade:  mental,
      regularidade: reg,
      recuperacao:  Math.round(mental * 0.70 + reg * 0.30),
      adaptacao:    Math.round(leitura * 0.50 + mental * 0.50),
    };
  }

  // Sistema muito antigo (28 attrs) → migra direto para v4
  return {
    velocidade:    oldAttrs.velocidade    ?? 70,
    explosividade: oldAttrs.explosividade ?? 70,
    resistencia:   oldAttrs.resistencia   ?? 70,
    defesa: Math.round((oldAttrs.velocidade ?? 70) * 0.30 + (oldAttrs.consistencia ?? 70) * 0.50 + (oldAttrs.resistencia ?? 70) * 0.20),

    fhPotencia: oldAttrs.fhPotencia ?? oldAttrs.potencia ?? 65,
    fhControle: Math.round((oldAttrs.fhPotencia ?? 65) * 0.40 + (oldAttrs.consistencia ?? 65) * 0.60),
    bhPotencia: oldAttrs.bhPotencia ?? Math.round((oldAttrs.potencia ?? 65) * 0.92),
    bhControle: Math.round((oldAttrs.bhPotencia ?? 60) * 0.40 + (oldAttrs.consistencia ?? 65) * 0.60),
    topspin:    oldAttrs.topspin ?? 65,
    slice:      oldAttrs.slice   ?? 65,

    saqueForca:    Math.round(((oldAttrs.srv1Vel ?? 70) + (oldAttrs.srv2Efeito ?? 60)) / 2),
    saquePrecisao: Math.round(((oldAttrs.srv1Prec ?? 70) + (oldAttrs.srv2Efeito ?? 65)) / 2),
    devolucao:     oldAttrs.devolucaoSaque ?? 65,

    volley: Math.round(((oldAttrs.volley ?? 60) + (oldAttrs.instintoRede ?? 55) + (oldAttrs.reflexo ?? 60)) / 3),
    smash:  Math.round(((oldAttrs.coberturaLob ?? 55) + (oldAttrs.reflexo ?? 60)) / 2),

    leitura:     oldAttrs.leituraDeJogo  ?? 65,
    visaoTatica: Math.round((oldAttrs.leituraDeJogo ?? 65) * 0.60 + (oldAttrs.agresDecisoria ?? 60) * 0.40),

    mentalidade:  oldAttrs.mentalidade ?? 70,
    regularidade: Math.round((oldAttrs.consistencia ?? 70) * 0.50 + (oldAttrs.mentalidade ?? 70) * 0.30 + (oldAttrs.paciencia ?? 65) * 0.20),
    recuperacao:  Math.round(((oldAttrs.recuperacao ?? 65) + (oldAttrs.mentalidade ?? 70)) / 2),
    adaptacao:    Math.round((oldAttrs.leituraDeJogo ?? 65) * 0.50 + (oldAttrs.mentalidade ?? 70) * 0.50),
  };
}

// ── Chaves v4 ─────────────────────────────────────────────────────
export const ATTR_KEYS_V3 = [
  'velocidade', 'explosividade', 'resistencia', 'defesa',
  'fhPotencia', 'fhControle', 'bhPotencia', 'bhControle', 'topspin', 'slice',
  'saqueForca', 'saquePrecisao', 'devolucao',
  'volley', 'smash',
  'leitura', 'visaoTatica',
  'mentalidade', 'regularidade', 'recuperacao', 'adaptacao',
];

export const ATTR_KEYS_V4 = ATTR_KEYS_V3;

export function validateAttrs(attrs) {
  const missing = ATTR_KEYS_V3.filter(k => attrs[k] === undefined);
  if (missing.length > 0) {
    console.warn('[attributes.js] Atributos faltando:', missing);
    return false;
  }
  return true;
}

// ── matchDayVar v4 ────────────────────────────────────────────────
export function matchDayVar(regularidade) {
  const stability = regularidade / 100;
  const badChance   = 0.30 * (1 - stability * 0.80);
  const greatChance = 0.12 * (0.75 + stability * 0.25);
  const r = Math.random();
  if (r < badChance)               return -(0.03 + Math.random() * 0.09);
  if (r < badChance + greatChance) return  (0.01 + Math.random() * 0.07);
  const u = Math.random(), v = Math.random();
  const normal = Math.sqrt(-2 * Math.log(u || 0.001)) * Math.cos(2 * Math.PI * v);
  return normal * 0.015 * (1 - stability * 0.6);
}

// ── recoveryBoost v4 (NOVO) ───────────────────────────────────────
// Boost pós-break ou pós-set-perdido baseado em recuperacao.
// recuperacao 20 → tende a espiral | recuperacao 95 → ressurge (Djokovic do 0-2)
export function recoveryBoost(recuperacao) {
  const r = recuperacao / 100;
  const boostChance  = 0.10 + r * 0.45;  // recup 20→19% | recup 95→53%
  const spiralChance = 0.25 - r * 0.22;  // recup 20→21% | recup 95→4%
  const roll = Math.random();
  if (roll < spiralChance)                return -(0.02 + Math.random() * 0.06);
  if (roll < spiralChance + boostChance)  return  (0.03 + Math.random() * 0.08);
  return 0;
}
