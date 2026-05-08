/**
 * ScoutProfile.js — Camada de apresentação narrativa
 * ─────────────────────────────────────────────────────────────────
 * Traduz números internos (OVR, attrs, potential, developmentStyle,
 * peakAge) em linguagem qualitativa — como um scout, jornalista ou
 * analista do circuito descreveria o jogador.
 *
 * REGRA DE OURO: nenhuma função aqui modifica o jogador.
 * O engine continua usando os números reais. Isto é APENAS exibição.
 *
 * Exports principais:
 *   ovrTier(ov)                  → { label, grade, color }
 *   attrDescriptor(key, value)   → string descritiva
 *   catDescriptor(catId, attrs)  → { grade, label, color }
 *   potentialNarrative(player)   → string (com ruído intencional)
 *   arcNarrative(player)         → string
 *   phaseLabel(player)           → { label, color, icon }
 *   topStrengths(attrs, n)       → [{ key, label, desc }]
 *   topWeaknesses(attrs, n)      → [{ key, label, desc }]
 *   scoutSummary(player)         → parágrafo curto em prosa
 */

import { ATTR_CATEGORIES, catAvg, overallRating, overallGrade } from './attributes.js';

// ─────────────────────────────────────────────────────────────────
// 1. OVR TIER
// ─────────────────────────────────────────────────────────────────

/**
 * Converte OVR numérico em tier narrativo.
 * @param {number} ov
 * @returns {{ label: string, sublabel: string, grade: string, color: string }}
 */
export function ovrTier(ov) {
  if (ov >= 95) return {
    label:    'Histórico',
    sublabel: 'Um dos melhores do circuito. Nível de geração.',
    grade:    'S+',
    color:    '#FFD700',
  };
  if (ov >= 88) return {
    label:    'Elite',
    sublabel: 'Top-5 consistente. Candidato a Grand Slam.',
    grade:    'S',
    color:    '#E8C84A',
  };
  if (ov >= 80) return {
    label:    'Alto Nível',
    sublabel: 'Ganhador de torneios grandes. Top-20 sólido.',
    grade:    'A',
    color:    '#FF8C42',
  };
  if (ov >= 72) return {
    label:    'Profissional Sólido',
    sublabel: 'Top-50 consistente. Resultado variável nos grandes.',
    grade:    'B+',
    color:    '#74ACDF',
  };
  if (ov >= 63) return {
    label:    'Circuito Médio',
    sublabel: 'Profissional estabelecido. Raramente surpreende os de cima.',
    grade:    'B',
    color:    '#94a3b8',
  };
  if (ov >= 54) return {
    label:    'Em Formação',
    sublabel: 'Ainda em desenvolvimento. Teto ainda não definido.',
    grade:    'C+',
    color:    '#64748b',
  };
  return {
    label:    'Iniciante',
    sublabel: 'Limitações claras. Circula no tour.',
    grade:    'C',
    color:    '#475569',
  };
}

// ─────────────────────────────────────────────────────────────────
// 2. DESCRITORES POR ATRIBUTO
// ─────────────────────────────────────────────────────────────────

// Descritores específicos por atributo, em 5 faixas:
//   elite (90+) / great (78-89) / solid (65-77) / average (52-64) / weak (<52)
const ATTR_DESCRIPTORS = {
  // ── CORPO ─────────────────────────────────────────────────────
  velocidade: {
    elite:   'Velocidade excepcional — cobre a quadra como poucos no circuito',
    great:   'Muito rápido — chega às bolas que outros desistem',
    solid:   'Movimentação competente',
    average: 'Movimentação regular',
    weak:    'Lento — pode ser explorado em diagonais largas',
  },
  explosividade: {
    elite:   'Primeira passada explosiva — recupera posição com violência',
    great:   'Aceleração acima da média',
    solid:   'Boa partida de posição',
    average: 'Partida de posição regular',
    weak:    'Lento na partida — fica atrás no posicionamento',
  },
  resistencia: {
    elite:   'Fisicamente imbatível — nível no 5º set igual ao 1º',
    great:   'Fôlego acima da média — raramente sente fadiga',
    solid:   'Resiste bem em três sets',
    average: 'Fadiga perceptível em partidas longas',
    weak:    'Físico limitado — sofre em cinco sets',
  },
  defesa: {
    elite:   'Defensor excepcional — transforma defesas em contra-ataques',
    great:   'Salva bolas que parecem impossíveis',
    solid:   'Defesa confiável',
    average: 'Defesa regular',
    weak:    'Fora de posição, o erro é provável',
  },

  // ── GOLPES ────────────────────────────────────────────────────
  fhPotencia: {
    elite:   'Forehand devastador — uma das armas mais pesadas do circuito',
    great:   'Forehand poderoso. Arma ofensiva real.',
    solid:   'Forehand sólido e confiável',
    average: 'Forehand razoável',
    weak:    'Forehand fraco — alvo fácil para o adversário',
  },
  fhControle: {
    elite:   'Forehand cirúrgico — potência sem perder a precisão',
    great:   'Forehand preciso. Erros raros.',
    solid:   'Controle de forehand consistente',
    average: 'Consistência de forehand regular',
    weak:    'Forehand impreciso — frequente fonte de erros',
  },
  bhPotencia: {
    elite:   'Backhand imponente — arma ofensiva de elite',
    great:   'Backhand poderoso. Não é ponto fraco, é arma.',
    solid:   'Backhand sólido',
    average: 'Backhand dentro da média',
    weak:    'Backhand limitado — ponto claro de exploração',
  },
  bhControle: {
    elite:   'Backhand de precisão — estável em qualquer situação',
    great:   'Backhand muito consistente',
    solid:   'Backhand confiável na maioria das situações',
    average: 'Consistência de backhand regular',
    weak:    'Backhand inconsistente — produz erros em momentos chave',
  },
  topspin: {
    elite:   'Efeito pesadíssimo — quique alto e ângulos impossíveis',
    great:   'Topspin acentuado. Dificulta a devolução.',
    solid:   'Bom topspin',
    average: 'Topspin regular',
    weak:    'Pouco efeito — bola plana e previsível',
  },
  slice: {
    elite:   'Slice magistral — bola baixa, ritmo completamente quebrado',
    great:   'Bom slice. Variação eficaz.',
    solid:   'Slice competente',
    average: 'Slice básico',
    weak:    'Quase não usa slice',
  },

  // ── SAQUE & RETORNO ──────────────────────────────────────────
  saqueForca: {
    elite:   'Saque explosivo — ace potential altíssimo em qualquer superfície',
    great:   'Saque muito forte. Arma real no serviço.',
    solid:   'Saque competente',
    average: 'Saque dentro da média',
    weak:    'Saque fraco — não impõe pressão',
  },
  saquePrecisao: {
    elite:   'Saque preciso — coloca onde quer, segundo saque sem medo',
    great:   'Colocação de saque acima da média. Raramente dá dupla.',
    solid:   'Saque consistente',
    average: 'Saque regular',
    weak:    'Segundo saque vulnerável — alvo de retorno agressivo',
  },
  devolucao: {
    elite:   'Devolução excepcional — transforma o serviço do adversário em oportunidade',
    great:   'Muito boa devolução. Neutraliza saques fortes.',
    solid:   'Devolução confiável',
    average: 'Devolução regular',
    weak:    'Dificuldades na devolução — perde terreno logo no primeiro golpe',
  },

  // ── REDE ──────────────────────────────────────────────────────
  volley: {
    elite:   'Volley de toque cirúrgico — na rede é zona de domínio',
    great:   'Muito bom na rede. Finaliza pontos com autoridade.',
    solid:   'Volley competente',
    average: 'Rede regular — não procura, mas resolve quando vai',
    weak:    'Evita a rede — vulnerável quando é forçado a subir',
  },
  smash: {
    elite:   'Smash avassalador — lob nunca é solução contra este jogador',
    great:   'Bom overhead. Cobre o lob com autoridade.',
    solid:   'Smash confiável',
    average: 'Smash regular',
    weak:    'Overhead instável — lob pode ser tática eficaz',
  },

  // ── LEITURA & DECISÃO ────────────────────────────────────────
  leitura: {
    elite:   'Antecipação sobrenatural — parece saber para onde vai antes da bola sair',
    great:   'Leitura de jogo muito boa. Raramente pego de surpresa.',
    solid:   'Boa leitura de trajetórias',
    average: 'Leitura regular',
    weak:    'Lento na leitura — frequentemente fora de posição',
  },
  visaoTatica: {
    elite:   'Visão tática excepcional — constrói pontos como um xadrezista',
    great:   'Muito bom taticamente. Sabe exatamente quando atacar.',
    solid:   'Tática competente',
    average: 'Tática regular',
    weak:    'Jogo tático limitado — tende a ser previsível',
  },

  // ── CABEÇA ────────────────────────────────────────────────────
  mentalidade: {
    elite:   'Mental de ferro — eleva o nível nos pontos decisivos',
    great:   'Muito clutch. Raramente cede sob pressão.',
    solid:   'Mente razoavelmente estável',
    average: 'Mental inconsistente em pontos decisivos',
    weak:    'Vacila nos momentos chave — histórico de perdas evitáveis',
  },
  regularidade: {
    elite:   'Nível absolutamente constante — a máquina do circuito',
    great:   'Muito regular. Raramente aparece abaixo do nível.',
    solid:   'Regularidade consistente',
    average: 'Nível variável entre jogos',
    weak:    'Irregular — pode surpreender e desaparecer no mesmo dia',
  },
  recuperacao: {
    elite:   'Ressurge de qualquer situação — derrotas passam como água',
    great:   'Ótima resiliência. Volta de sets e breaks difíceis.',
    solid:   'Boa recuperação',
    average: 'Recuperação regular',
    weak:    'Carrega mal as adversidades — um break às vezes basta',
  },
  adaptacao: {
    elite:   'Adapta o jogo em tempo real — cada changeover é uma nova versão',
    great:   'Absorve bem os ajustes do técnico.',
    solid:   'Boa adaptabilidade',
    average: 'Adaptação regular',
    weak:    'Jogo rígido — dificuldade em mudar o plano no meio da partida',
  },

  // Fallback para atributos legados não mapeados
  _default: {
    elite:   'Nível excepcional',
    great:   'Acima da média',
    solid:   'Competente',
    average: 'Dentro da média',
    weak:    'Abaixo da média',
  },
};

function _tier(value) {
  if (value >= 90) return 'elite';
  if (value >= 78) return 'great';
  if (value >= 65) return 'solid';
  if (value >= 52) return 'average';
  return 'weak';
}

/**
 * Retorna descritor qualitativo de um atributo individual.
 * @param {string} key   — chave do atributo (ex: 'fhPotencia')
 * @param {number} value — valor numérico real
 * @returns {string}
 */
export function attrDescriptor(key, value) {
  const map = ATTR_DESCRIPTORS[key] ?? ATTR_DESCRIPTORS._default;
  return map[_tier(value)];
}

// ─────────────────────────────────────────────────────────────────
// 3. GRADE DE CATEGORIA
// ─────────────────────────────────────────────────────────────────

const CAT_GRADE_LABELS = {
  elite:   { grade: 'S', label: 'Excepcional', color: '#FFD700' },
  great:   { grade: 'A', label: 'Forte',       color: '#FF8C42' },
  solid:   { grade: 'B', label: 'Sólido',      color: '#74ACDF' },
  average: { grade: 'C', label: 'Regular',     color: '#94a3b8' },
  weak:    { grade: 'D', label: 'Fraco',       color: '#ef4444' },
};

/**
 * Retorna grade qualitativa para uma categoria de atributos.
 */
export function catDescriptor(catId, attrs) {
  const avg = catAvg(catId, attrs);
  const tier = _tier(avg);
  return CAT_GRADE_LABELS[tier];
}

// ─────────────────────────────────────────────────────────────────
// 4. PONTOS FORTES E FRAQUEZAS
// ─────────────────────────────────────────────────────────────────

/**
 * Retorna os N maiores pontos fortes com descrição narrativa.
 */
export function topStrengths(attrs, n = 3) {
  return Object.entries(attrs)
    .filter(([, v]) => typeof v === 'number')
    .sort(([, a], [, b]) => b - a)
    .slice(0, n)
    .map(([key, value]) => {
      const catMeta = _findCatMeta(key);
      return {
        key,
        label: catMeta?.label ?? key,
        catColor: catMeta?.color ?? '#888',
        desc: attrDescriptor(key, value),
        tier: _tier(value),
      };
    });
}

/**
 * Retorna os N maiores pontos fracos com descrição narrativa.
 */
export function topWeaknesses(attrs, n = 2) {
  return Object.entries(attrs)
    .filter(([, v]) => typeof v === 'number')
    .sort(([, a], [, b]) => a - b)
    .slice(0, n)
    .map(([key, value]) => {
      const catMeta = _findCatMeta(key);
      return {
        key,
        label: catMeta?.label ?? key,
        catColor: catMeta?.color ?? '#888',
        desc: attrDescriptor(key, value),
        tier: _tier(value),
      };
    });
}

function _findCatMeta(key) {
  for (const cat of ATTR_CATEGORIES) {
    const a = cat.attrs.find(a => a.key === key);
    if (a) return { label: a.label, color: cat.color };
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────
// 5. POTENTIAL NARRATIVE (com ruído intencional)
// ─────────────────────────────────────────────────────────────────

// Seed determinística para o ruído — usa o ID do jogador, não
// Math.random(), para que o mesmo jogador receba sempre o mesmo
// texto (mesmo após recarregar).
function _hashForNoise(playerId) {
  let h = 5381;
  for (let i = 0; i < (playerId?.length ?? 0); i++) {
    h = ((h << 5) + h) + playerId.charCodeAt(i);
    h = h & 0x7fffffff;
  }
  return (h % 1000) / 1000; // 0..1 determinístico
}

const POTENTIAL_NARRATIVES = {
  GERACIONAL: [
    // Corretas (85% dos casos)
    'Talento fora do comum. O mercado ainda está calibrando o teto.',
    'Números de desenvolvimento que o circuito raramente vê nesta idade.',
    'Três academias europeias monitorando. O interesse do mercado diz algo.',
    'Crescimento que poucas gerações presenciam. O consenso ainda não chegou.',
    // Erradas / com ruído (15% dos casos) — LATE_BLOOMER pode parecer comum no início
    'Perspectiva sólida. Ainda cedo para conclusões definitivas.',
    'Profissional em desenvolvimento. Analistas divergem sobre o teto.',
  ],
  LENDA: [
    'Perspectiva de carreira longa no topo. Hall of Fame no horizonte.',
    'Um dos mais talentosos da geração. Múltiplos Slams são expectativa real.',
    'Trajetória de quem constrói uma era. O circuito já percebeu.',
    'Potencial para definir uma geração. Consistência será a chave.',
  ],
  ELITE: [
    'Ganhador de Slam no horizonte se o desenvolvimento continuar.',
    'Top-5 consistente é o destino natural deste jogador.',
    'Nível de elite clara. Um grande torneio está no alcance.',
    'Perspectiva sólida de carreira no topo do circuito.',
  ],
  CAMPEAO: [
    'Profissional de alto nível. Um grande torneio está ao alcance.',
    'Nível de Masters é expectativa razoável. Slam é esticado, mas possível.',
    'Carreira consistente no top-30 é o destino mais provável.',
    'Competitivo nos grandes palcos. Teto ainda a definir.',
  ],
  COMUM: [
    'Profissional consolidado. Dificilmente surpreenderá no mais alto nível.',
    'Carreira estável no circuito. Teto próximo do atual.',
    'Tour player por muitos anos. Raramente ameaça o top-20.',
    'Jogador de circuito. Faz o seu papel, sem grandes expectativas.',
  ],
  ABAIXO_DA_MEDIA: [
    'Circula no tour. Teto próximo do nível atual.',
    'Profissional que luta para manter o ranking. Longa carreira improvável.',
    'Ainda em formação. O caminho para o circuito principal é longo.',
  ],
};

/**
 * Narrativa pública do potencial — com ruído intencional.
 * 15% dos GERACIONAL e LENDA recebem texto conservador.
 * Usa semente determinística baseada no ID.
 */
export function potentialNarrative(player) {
  const potential = player.potential ?? 'COMUM';
  const pool = POTENTIAL_NARRATIVES[potential] ?? POTENTIAL_NARRATIVES.COMUM;

  const noise = _hashForNoise(player.id ?? player.name ?? '');

  // Para GERACIONAL: 15% de chance de receber texto conservador (ruído)
  // Para LENDA: 10% de chance
  let useNoise = false;
  if (potential === 'GERACIONAL' && noise < 0.15) useNoise = true;
  if (potential === 'LENDA'      && noise < 0.10) useNoise = true;

  if (useNoise && potential === 'GERACIONAL') {
    // Usa as entradas "erradas" (últimas 2 do array GERACIONAL)
    const noisyPool = POTENTIAL_NARRATIVES.GERACIONAL.slice(-2);
    const idx = Math.floor(noise * 10) % noisyPool.length;
    return noisyPool[idx];
  }

  // Seleção determinística dentro do pool correto
  const idx = Math.floor(noise * 100) % pool.length;
  return pool[idx];
}

// ─────────────────────────────────────────────────────────────────
// 6. ARC NARRATIVE
// ─────────────────────────────────────────────────────────────────

const ARC_NARRATIVES = {
  EARLY_BLOOMER: 'Jogador precoce — já mostra muito do que pode ser.',
  LATE_BLOOMER:  'Desenvolvimento gradual — analistas divergem sobre o teto real.',
  VOLATILE:      'Irregular. Dias de gênio, dias de colapso. Imprevisível.',
  STEADY:        'Constante. Cresce sem pressa, sem surpresa.',
  EXPLOSIVE:     'Explosão iminente — o circuito ainda não percebeu completamente.',
};

export function arcNarrative(player) {
  const arc = player.developmentStyle;
  return ARC_NARRATIVES[arc] ?? null;
}

// ─────────────────────────────────────────────────────────────────
// 7. PHASE LABEL (sem revelar peakAge)
// ─────────────────────────────────────────────────────────────────

/**
 * Fase de carreira em linguagem — sem expor peakAge numérico.
 */
export function phaseLabel(player) {
  const history = player._seasonHistory ?? [];
  const lastSeason = history[history.length - 1] ?? null;
  const inDecline = lastSeason?.inDecline ?? false;
  const yearsToPeak = (player.peakAge && player.age)
    ? player.peakAge - player.age
    : null;

  if (inDecline)                                    return { label: 'Em declínio',           color: '#EF4444', icon: '📉' };
  if (yearsToPeak !== null && yearsToPeak <= 0)     return { label: 'No pico da carreira',    color: '#FFD700', icon: '⭐' };
  if (yearsToPeak !== null && yearsToPeak <= 2)     return { label: 'Chegando ao pico',       color: '#FF9800', icon: '🔥' };
  if (yearsToPeak !== null && yearsToPeak <= 5)     return { label: 'Em desenvolvimento',     color: '#22C55E', icon: '📈' };
  return                                                   { label: 'Em formação',             color: '#74ACDF', icon: '🌱' };
}

// ─────────────────────────────────────────────────────────────────
// 8. SCOUT SUMMARY (parágrafo em prosa)
// ─────────────────────────────────────────────────────────────────

/**
 * Gera um parágrafo curto descrevendo o jogador como um scout faria.
 * Combina: maior força + maior fraqueza + estilo + fase.
 */
export function scoutSummary(player) {
  const attrs = player.attrs ?? {};
  const ov = overallRating(attrs);
  const tier = ovrTier(ov);
  const phase = phaseLabel(player);
  const strengths = topStrengths(attrs, 2);
  const weaknesses = topWeaknesses(attrs, 1);

  const styleMap = {
    AGG_BASELINER: 'baseliner agressivo',
    CTR_PUNCHER:   'contra-atacante',
    ALL_COURT:     'jogador completo',
    SRV_VOL:       'saque-e-voleio',
    BIG_SERVER:    'servidor dominante',
    RETRIEVER:     'retriever',
    GRINDER:       'grinder',
    TACT_TEC:      'tático-técnico',
    PWR_BASE:      'baseliner de potência',
    NET_SPEC:      'especialista de rede',
    TAKEALLRISK:   'jogador de alto risco',
    CTR_ATTACKER:  'contra-atacante',
  };
  const styleLabel = styleMap[player.styleId] ?? player.styleId ?? 'jogador';

  const strParts = strengths.map(s => s.label.toLowerCase());
  const wkParts  = weaknesses.map(w => w.label.toLowerCase());

  let text = `${tier.label}. ${styleLabel.charAt(0).toUpperCase() + styleLabel.slice(1)} `;
  text += `com pontos fortes claros em ${strParts[0] ?? '—'}`;
  if (strParts[1]) text += ` e ${strParts[1]}`;
  text += '.';
  if (wkParts[0]) text += ` ${wkParts[0].charAt(0).toUpperCase() + wkParts[0].slice(1)} é área de atenção.`;
  text += ` ${phase.label}.`;

  return text;
}

// ─────────────────────────────────────────────────────────────────
// 9. TIER ICON (visual de intensidade, sem número)
// ─────────────────────────────────────────────────────────────────

/** Retorna cor e nível visual para uma barra qualitativa (sem número). */
export function attrTierVisual(value) {
  const tier = _tier(value);
  const map = {
    elite:   { color: '#FFD700', opacity: 1.0,  widthPct: 95 },
    great:   { color: '#FF8C42', opacity: 0.9,  widthPct: 78 },
    solid:   { color: '#74ACDF', opacity: 0.75, widthPct: 62 },
    average: { color: '#94a3b8', opacity: 0.55, widthPct: 46 },
    weak:    { color: '#ef4444', opacity: 0.45, widthPct: 28 },
  };
  return { tier, ...map[tier] };
}
