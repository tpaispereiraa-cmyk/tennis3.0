/**
 * MatchPlanSystem.js
 * ─────────────────────────────────────────────────────────────────
 * FASE 3 · Match Plans e Scouting Básico
 *
 * Gera um plano tático pré-jogo para cada jogador com base em:
 *  - rallyPattern e styleId do adversário
 *  - recentForm / surfaceForm (Fase 2 — fallback para 0.5 se ausente)
 *  - histórico h2h via RivalrySystem (opcional — injetado em runtime)
 *
 * O plano produz um array de diretivas táticas usadas pelo ShotDecision.
 *
 * Fluxo:
 *   initGameState() → initMatchPlan(playerA, playerB, surface, rivalrySystem)
 *   → player._matchPlan = generateMatchPlan(...)
 *   → ShotDecision lê player._matchPlan a cada shot
 *
 * Garantias:
 *  - Nunca lança exceção mesmo sem recentForm ou RivalrySystem
 *  - Sempre retorna pelo menos 1 diretiva (default: estilo do jogador)
 *  - Não modifica o objeto jogador diretamente — retorna o plano, cabe
 *    ao chamador atribuir em player._matchPlan
 */

// ─────────────────────────────────────────────────────────────────
// DIRETIVAS
// ─────────────────────────────────────────────────────────────────

/**
 * Catálogo de diretivas táticas disponíveis.
 * Cada valor é a chave usada em player._matchPlan.directives[].type
 */
export const PLAN_DIRECTIVES = {
  ATTACK_BH:        'ATTACK_BH',        // atacar backhand adversário
  ATTACK_FH:        'ATTACK_FH',        // atacar forehand adversário
  SERVE_BODY:       'SERVE_BODY',        // servir no corpo em pontos grandes
  SERVE_WIDE:       'SERVE_WIDE',        // explorar serviço aberto
  FORCE_LONG:       'FORCE_LONG',        // forçar rallys longos
  NET_PRESSURE:     'NET_PRESSURE',      // subir à rede mais que o normal
  LIMIT_NET:        'LIMIT_NET',         // evitar rede (contra net specialist forte)
  EXPLOIT_SURFACE:  'EXPLOIT_SURFACE',   // explorar vantagem de superfície própria
  EARLY_AGGRESSION: 'EARLY_AGGRESSION',  // pressionar cedo, não construir o ponto
};

// ─────────────────────────────────────────────────────────────────
// LOOKUP TABLES — mapeamentos táticos internos
// ─────────────────────────────────────────────────────────────────

/**
 * Estilos que naturalmente preferem rede → LIMIT_NET contra eles é inútil.
 * Estilos que naturalmente sobem à rede → NET_PRESSURE faz sentido.
 */
const NET_STYLES     = new Set(['NET_SPECIALIST', 'NET_SPEC', 'SRV_VOL']);
const NET_APPROACH_STYLES = new Set(['NET_SPECIALIST', 'NET_SPEC', 'SRV_VOL', 'ALL_COURT', 'AGG_BASELINER']);

/**
 * rallyPattern → diretiva de resposta recomendada.
 * Indica o que fazer CONTRA esse padrão.
 */
const RALLY_PATTERN_COUNTER = {
  CROSS_HEAVY:      PLAN_DIRECTIVES.EARLY_AGGRESSION,  // interromper o ritmo cruzado
  DEEP_GRINDER:     PLAN_DIRECTIVES.FORCE_LONG,         // aceitar o grind? Não — mudar o jogo
  SERVE_PLUS_ONE:   PLAN_DIRECTIVES.FORCE_LONG,         // neutralizar o serve+1 com rallys
  AGGRESSIVE_EARLY: PLAN_DIRECTIVES.FORCE_LONG,         // absorver e contra-atacar
  NET_APPROACH:     PLAN_DIRECTIVES.LIMIT_NET,          // cuidado com subidas
  SHORT_ANGLE_BUILDER: PLAN_DIRECTIVES.ATTACK_BH,       // tirar a iniciativa
  RHYTHM_DISRUPTION:   PLAN_DIRECTIVES.EARLY_AGGRESSION,// não deixar o disruptor se estabelecer
  DEFENSIVE_BASE:   PLAN_DIRECTIVES.EARLY_AGGRESSION,   // forçar antes que o defensor se firme
  CENTRE_CONTROL:   PLAN_DIRECTIVES.ATTACK_BH,          // desequilibrar o centro
};

/**
 * Estilos com preferência por servir no corpo → SERVE_BODY como diretiva extra.
 */
const SERVE_BODY_STYLES = new Set(['SRV_VOL', 'BIG_SERVER', 'AGG_BASELINER', 'POWER_BASELINER', 'PWR_BASE']);

/**
 * Estilos com forehand dominant do adversário → atacar o BH dele é default.
 */
const FH_DOMINANT_STYLES = new Set([
  'AGG_BASELINER', 'POWER_BASELINER', 'PWR_BASE', 'TAKEALLRISK', 'MOMENTUM_PLAYER',
]);

// ─────────────────────────────────────────────────────────────────
// SCOUTING
// ─────────────────────────────────────────────────────────────────

/**
 * Produz um snapshot de scouting do adversário antes da partida.
 * Usa apenas dados já existentes no objeto do jogador — não consulta APIs externas.
 *
 * @param {object} player           — jogador que vai jogar
 * @param {object} opponent         — adversário
 * @param {string} surface          — 'clay' | 'grass' | 'hard' | 'indoor'
 * @param {object|null} rivalSystem — instância de RivalrySystem (opcional)
 * @returns {object} snapshot de scouting
 */
export function scoutOpponent(player, opponent, surface, rivalSystem = null) {
  // ── Lado mais fraco ────────────────────────────────────────────
  // Inferido de matchCtx (se existe de partida anterior no universo)
  // ou de styleId (fallback heurístico)
  const attrs = opponent?.attrs ?? {};
  const fhLevel = (attrs.fhPotencia ?? 50) * 0.46 + (attrs.fhControle ?? 50) * 0.54;
  const bhLevel = (attrs.bhPotencia ?? 50) * 0.46 + (attrs.bhControle ?? 50) * 0.54;
  let weaker_side = Math.abs(fhLevel - bhLevel) >= 4 ? (fhLevel > bhLevel ? 'BH' : 'FH') : _inferWeakerSideFromStyle(opponent.styleId);
  const mc = opponent.ctx?.matchCtx;
  if (mc) {
    const bh = mc.oppBhHits ?? 0;
    const fh = mc.oppFhHits ?? 0;
    if (bh + fh >= 3) {
      if (bh > fh * 1.4) weaker_side = 'FH';
      else if (fh > bh * 1.4) weaker_side = 'BH';
      else weaker_side = null;
    }
  }

  // ── Forma na superfície ────────────────────────────────────────
  // recentForm é da Fase 2 — opcional, fallback para 0.5
  const surfaceKey = String(surface ?? 'HARD').toUpperCase();
  const surfForm = opponent.recentForm?.surfaceForm?.[surfaceKey]
    ?? opponent.recentForm?.surfaceForm?.[surface]
    ?? 0.5;
  const formScore = opponent.recentForm?.formScore ?? 0.5;

  // ── Padrão de rally ────────────────────────────────────────────
  const rally_pattern = opponent.rallyPattern ?? null;

  // ── Frequência de rede ─────────────────────────────────────────
  // netFromTransition está em matchCtx (Fase 1) ou estimado pelo estilo
  const netFromCtx    = mc?.netFromTransition ?? 0;
  const netFromStyle  = NET_APPROACH_STYLES.has(opponent.styleId) ? 0.3 : 0.05;
  const net_frequency = netFromCtx > 0 ? netFromCtx : netFromStyle;

  // ── Histórico saque ────────────────────────────────────────────
  const serve_tendency = mc?.serveHistory ?? [];

  // ── H2H ───────────────────────────────────────────────────────
  let h2h_record = null;
  if (rivalSystem && player.id && opponent.id) {
    try {
      const rivalry = rivalSystem.getRivalry(player.id, opponent.id);
      if (rivalry && rivalry.totalMatches > 0) {
        // Determinar quem é p1 para extrair winRate correto
        const playerIsP1 = (rivalry.p1Id === player.id);
        const playerWins = playerIsP1 ? rivalry.p1Wins : rivalry.p2Wins;
        h2h_record = {
          totalMatches: rivalry.totalMatches,
          playerWins,
          winRate: rivalry.totalMatches > 0 ? playerWins / rivalry.totalMatches : 0.5,
          type:    rivalry.type ?? null,
        };
      }
    } catch (_) {
      // RivalrySystem pode não ter o par — silencioso
    }
  }

  return {
    weaker_side,        // 'BH' | 'FH' | null
    surface_form: surfForm,  // 0..1 — forma do adversário nesta superfície
    form_score: formScore,   // 0..1 — forma geral recente
    rally_pattern,      // string | null
    net_frequency,      // 0..1 — estimativa de frequência de subidas
    serve_tendency,     // array de serviços registrados
    h2h_record,         // { totalMatches, playerWins, winRate, type } | null
    signature_pattern:  null,  // [will be rebuilt]
  };
}

// ─────────────────────────────────────────────────────────────────
// GERAÇÃO DO PLANO
// ─────────────────────────────────────────────────────────────────

function buildCoachBriefing(player, opponent, focus, directive, influence) {
  const opponentName = opponent?.name?.split?.(' ')?.pop?.() ?? 'o adversário';
  const copy = {
    PRESSURE: ['Tomar a quadra', `Tire tempo de ${opponentName}: saque + primeira bola, sem esperar a troca crescer.`],
    CONTROL: ['Organizar o ponto', `Faça ${opponentName} jogar mais uma bola. Margem e padrão antes de acelerar.`],
    RESET: ['Reencontrar a base', `Simplifique contra ${opponentName}: altura, profundidade e uma decisão limpa por vez.`],
    CLUTCH: ['Ganhar os pontos vivos', `Nos pontos grandes contra ${opponentName}, respire antes de escolher. A primeira decisão vale mais.`],
    SURFACE: ['Usar a superfície', `A quadra oferece uma rota contra ${opponentName}. Repita o padrão que ela está premiando.`],
    BUILD: ['Construir por dentro', `Não entregue ritmo a ${opponentName}. Trabalhe o backhand e faça o ponto amadurecer.`],
  };
  const [headline, instruction] = copy[focus] ?? ['Ler antes de mudar', `Ajuste o padrão contra ${opponentName} sem abandonar a identidade do jogo.`];
  return {
    headline,
    instruction,
    directive,
    influence: Math.round(influence * 100),
    tone: influence >= 0.42 ? 'FIRME' : influence >= 0.30 ? 'EM AJUSTE' : 'FRÁGIL',
    playerName: player?.name ?? null,
  };
}

/**
 * Gera o match plan completo para um jogador contra um adversário.
 *
 * @param {object} player       — jogador que executa o plano
 * @param {object} opponent     — adversário
 * @param {string} surface      — 'clay' | 'grass' | 'hard' | 'indoor'
 * @param {object|null} rivalSystem — instância RivalrySystem (opcional)
 * @returns {{ directives: Array, confidence: number, notes: string }}
 */
export function generateMatchPlan(player, opponent, surface, rivalSystem = null) {
  const scout     = scoutOpponent(player, opponent, surface, rivalSystem);
  const styleId   = player.styleId    ?? 'ALL_COURT';
  const oppStyle  = opponent.styleId  ?? 'ALL_COURT';
  const prefs = player?.prefs ?? {};

  const directives = [];
  const reasonNotes = [];

  // ── 1. Lado fraco do adversário ────────────────────────────────
  if (scout.weaker_side === 'BH') {
    directives.push({ type: PLAN_DIRECTIVES.ATTACK_BH, strength: 0.70 });
    reasonNotes.push('atacar BH exposto do adversário');
  } else if (scout.weaker_side === 'FH') {
    directives.push({ type: PLAN_DIRECTIVES.ATTACK_FH, strength: 0.70 });
    reasonNotes.push('explorar FH fraco do adversário');
  } else if (FH_DOMINANT_STYLES.has(oppStyle)) {
    // Sem dado concreto mas o estilo sugere BH mais fraco
    directives.push({ type: PLAN_DIRECTIVES.ATTACK_BH, strength: 0.45 });
    reasonNotes.push('heurística de estilo: BH tende a ser o lado fraco');
  }

  // ── 2. Padrão de rally do adversário ───────────────────────────
  const counterDirective = scout.rally_pattern
    ? RALLY_PATTERN_COUNTER[scout.rally_pattern] ?? null
    : null;
  if (counterDirective && !_hasDirective(directives, counterDirective)) {
    directives.push({ type: counterDirective, strength: 0.55 });
    reasonNotes.push(`contra-padrão para ${scout.rally_pattern}`);
  }

  // ── 3. Superfície: vantagem própria ────────────────────────────
  const surfaceKey = String(surface ?? 'HARD').toUpperCase();
  const playerSurfForm  = player.recentForm?.surfaceForm?.[surfaceKey]
    ?? player.recentForm?.surfaceForm?.[surface]
    ?? 0.5;
  const playerFormScore = player.recentForm?.formScore ?? 0.5;
  if (playerSurfForm > 0.62 && playerSurfForm > scout.surface_form + 0.10) {
    directives.push({ type: PLAN_DIRECTIVES.EXPLOIT_SURFACE, strength: 0.60 });
    reasonNotes.push('forma superior na superfície');
  }

  // ── 4. Frequência de rede do adversário ────────────────────────
  if (NET_STYLES.has(oppStyle) || scout.net_frequency > 0.25) {
    if (!_hasDirective(directives, PLAN_DIRECTIVES.LIMIT_NET)) {
      directives.push({ type: PLAN_DIRECTIVES.LIMIT_NET, strength: 0.50 });
      reasonNotes.push('adversário sobe à rede com frequência');
    }
  }

  // ── 5. Estilo do próprio jogador define diretivas extras ────────
  if ((NET_APPROACH_STYLES.has(styleId) || ['PROACTIVE', 'HUNTER'].includes(prefs.netGame)) && !NET_STYLES.has(oppStyle)) {
    if (!_hasDirective(directives, PLAN_DIRECTIVES.NET_PRESSURE)) {
      directives.push({ type: PLAN_DIRECTIVES.NET_PRESSURE, strength: 0.50 });
      reasonNotes.push('explorar vocação de rede do jogador');
    }
  }
  if (prefs.serve1Bias === 'BODY' || (SERVE_BODY_STYLES.has(styleId) && prefs.serve1Bias !== 'WIDE')) {
    directives.push({ type: PLAN_DIRECTIVES.SERVE_BODY, strength: 0.45 });
    reasonNotes.push('estilo favorece saque no corpo');
  }
  if (prefs.serve1Bias === 'WIDE') {
    directives.push({ type: PLAN_DIRECTIVES.SERVE_WIDE, strength: 0.48 });
    reasonNotes.push('identidade de saque abre a quadra');
  }
  if (['EARLY_ATTACK', 'EXPLOSIVE'].includes(prefs.rallyCadence) && ['GAMBLER', 'ALLOUT', 'CALCULATED'].includes(prefs.riskProfile)) {
    directives.push({ type: PLAN_DIRECTIVES.EARLY_AGGRESSION, strength: prefs.rallyCadence === 'EXPLOSIVE' ? 0.58 : 0.48 });
    reasonNotes.push('cadência favorece pressão precoce');
  }

  const coaching = player.coaching ?? null;
  let coachBriefing = null;
  if (coaching?.activeCoachId && (coaching.trust ?? 0) >= 42) {
    const base = Math.max(0.22, Math.min(0.54, ((coaching.confidence ?? 50) + (coaching.alignment ?? 50) - (coaching.friction ?? 30) * 0.55) / 190));
    const focus = coaching.tacticalFocus;
    const directive = focus === 'PRESSURE' ? PLAN_DIRECTIVES.EARLY_AGGRESSION
      : focus === 'CONTROL' || focus === 'RESET' || focus === 'CLUTCH' ? PLAN_DIRECTIVES.FORCE_LONG
      : focus === 'SURFACE' ? PLAN_DIRECTIVES.EXPLOIT_SURFACE
      : focus === 'BUILD' ? PLAN_DIRECTIVES.ATTACK_BH
      : null;
    if (directive && !_hasDirective(directives, directive)) {
      directives.push({ type: directive, strength: base, source: 'COACHING' });
      reasonNotes.push(`banco vivo: foco ${focus}`);
    }
    if (directive) coachBriefing = buildCoachBriefing(player, opponent, focus, directive, base);
  }

  // ── 6. H2H: se está perdendo consistentemente ─────────────────
  if (scout.h2h_record && scout.h2h_record.totalMatches >= 3) {
    const h2hWR = scout.h2h_record.winRate;
    if (h2hWR < 0.30 && !_hasDirective(directives, PLAN_DIRECTIVES.EARLY_AGGRESSION)) {
      // Está perdendo muito → mudar abordagem, pressionar mais cedo
      directives.push({ type: PLAN_DIRECTIVES.EARLY_AGGRESSION, strength: 0.50 });
      reasonNotes.push('h2h desfavorável — quebrar padrão usual');
    }
    if (h2hWR > 0.70) {
      // Está dominando → manter o que funciona (aumenta confiança geral)
      reasonNotes.push('h2h favorável — manter estratégia');
    }
  }

  // ── 8. Garantia: sempre ao menos 1 diretiva ───────────────────
  if (directives.length === 0) {
    directives.push({ type: PLAN_DIRECTIVES.ATTACK_BH, strength: 0.35 });
    reasonNotes.push('diretiva default — sem dados suficientes');
  }

  // ── Limitar a 3 diretivas (as de maior strength) ──────────────
  directives.sort((a, b) => b.strength - a.strength);
  const finalDirectives = directives.slice(0, 3);

  // ── Confidence: média das strengths ponderada por dados disponíveis
  const dataFactor = (
    (scout.rally_pattern   ? 0.25 : 0) +
    (scout.weaker_side     ? 0.25 : 0) +
    (scout.h2h_record      ? 0.30 : 0) +
    (playerFormScore > 0.5 ? 0.20 : 0.10)
  );
  const avgStrength = finalDirectives.reduce((s, d) => s + d.strength, 0) / finalDirectives.length;
  const confidence  = Math.min(0.95, Math.max(0.25, avgStrength * (0.6 + dataFactor * 0.4)));

  return {
    directives: finalDirectives,
    confidence,
    notes: reasonNotes.join(' · '),
    coaching: player.coaching ? {
      coachId: player.coaching.activeCoachId ?? null,
      partnershipId: player.coaching.partnershipId ?? null,
      tacticalFocus: player.coaching.tacticalFocus ?? null,
      confidence: player.coaching.confidence ?? null,
      trust: player.coaching.trust ?? null,
      friction: player.coaching.friction ?? null,
      planInfluence: finalDirectives.filter(d => d.source === 'COACHING').map(d => d.type),
      briefing: coachBriefing,
    } : null,
    _scout: scout,  // guardado para debug e narrativa (MatchNarrator fase 7)
  };
}

// ─────────────────────────────────────────────────────────────────
// INICIALIZAÇÃO — chamada por game.js no início de cada partida
// ─────────────────────────────────────────────────────────────────

/**
 * Inicializa o match plan para ambos os jogadores.
 * Atribui player._matchPlan diretamente em cada jogador.
 *
 * @param {object} playerA
 * @param {object} playerB
 * @param {string} surface
 * @param {object|null} rivalSystem — instância de RivalrySystem (opcional)
 */
export function initMatchPlans(playerA, playerB, surface, rivalSystem = null) {
  playerA._matchPlan = generateMatchPlan(playerA, playerB, surface, rivalSystem);
  playerB._matchPlan = generateMatchPlan(playerB, playerA, surface, rivalSystem);
}

// ─────────────────────────────────────────────────────────────────
// HELPERS PRIVADOS
// ─────────────────────────────────────────────────────────────────

function _hasDirective(directives, type) {
  return directives.some(d => d.type === type);
}

/**
 * Heurística de lado fraco por estilo quando não há dados de matchCtx.
 * Retorna 'BH' para estilos com forehand dominante, null para ambivalentes.
 */
function _inferWeakerSideFromStyle(styleId) {
  if (FH_DOMINANT_STYLES.has(styleId)) return 'BH';
  if (styleId === 'CTR_PUNCHER' || styleId === 'GRINDER') return 'FH'; // BH forte nesses estilos
  return null;
}

