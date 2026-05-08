/**
 * PhaseTwo.js — Fase 2: Forma Recente & Visibilidade
 *
 * Implementa o roadmap de patrocínio, Fase 2:
 *
 *   2.1  Índice de Forma Recente (IFR) — score 0–100
 *        Fatores: resultados recentes, trajetória de ranking, performance vs expectativa,
 *        títulos recentes, rating individual por partida (IndividualRating), saúde
 *
 *   2.2  Visibilidade Pública — score 0–100
 *        Fatores: menções no NewsEngine, rivalidades ativas, milestones, superfície ativa
 *
 *   2.3  Sinal Combinado para patrocinadores — score 0–100
 *        Fórmula: (Marketability × 0.40) + (IFR × 0.35) + (Visibilidade × 0.25)
 *
 * Exports:
 *   computeIFR(player, opts)              → { score, components, tier, label, color }
 *   computeVisibility(player, opts)        → { score, components }
 *   computeSponsorSignal(player, opts)     → { score, ifr, visibility, marketability, tier }
 *   updatePlayerPhaseTwo(player, opts)     → player atualizado com player.phaseTwo
 *   getPhaseTwoTier(score)                 → { id, label, color, glow }
 */

// ── Clamp ────────────────────────────────────────────────────────────────────
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

// ── Tiers do IFR / Sinal ─────────────────────────────────────────────────────
export const IFR_TIERS = [
  { id: 'RED_HOT',    min: 85, label: 'Em Chamas',    color: '#FF4500', glow: 'rgba(255,69,0,0.35)' },
  { id: 'HOT',        min: 70, label: 'Quente',       color: '#FF8C00', glow: 'rgba(255,140,0,0.30)' },
  { id: 'RISING',     min: 55, label: 'Ascendente',   color: '#60FF90', glow: 'rgba(96,255,144,0.25)' },
  { id: 'STABLE',     min: 40, label: 'Estável',      color: '#80C8FF', glow: 'rgba(128,200,255,0.20)' },
  { id: 'COLD',       min: 25, label: 'Frio',         color: '#FFB060', glow: 'rgba(255,176,96,0.20)' },
  { id: 'STRUGGLING', min: 0,  label: 'Em Crise',     color: '#FF6060', glow: 'rgba(255,96,96,0.20)' },
];

export function getPhaseTwoTier(score) {
  return IFR_TIERS.find(t => score >= t.min) ?? IFR_TIERS[IFR_TIERS.length - 1];
}

// ── 2.1 Índice de Forma Recente (IFR) ────────────────────────────────────────

/**
 * Componente A: Resultados recentes (últimos 4–8 torneios)
 * Baseado em player.recentForm.results — janela de 10 partidas,
 * ponderada por ranking do adversário e rodada.
 */
function _componentResultados(player) {
  const rf = player.recentForm;
  if (!rf || !Array.isArray(rf.results) || rf.results.length === 0) return 50;

  const results = rf.results.slice(-8);
  const n = results.length;
  let weightedSum = 0, totalWeight = 0;

  results.forEach((r, i) => {
    const recencyWeight = (i + 1) / n; // mais recente = mais peso
    // Bônus por qualidade do adversário
    const oppRank = r.oppRank ?? 99;
    const qualityBonus = oppRank <= 5   ? 1.5
      : oppRank <= 20  ? 1.3
      : oppRank <= 50  ? 1.1
      : oppRank <= 100 ? 1.0
      :                  0.8;

    const w = recencyWeight * qualityBonus;
    weightedSum += (r.won ? 1 : 0) * w;
    totalWeight += w;
  });

  const rawRate = totalWeight > 0 ? weightedSum / totalWeight : 0.5;

  // Bonus de hot/cold streak
  const hotBonus  = Math.min((rf.hotStreak  ?? 0) * 3, 15);
  const coldMalus = Math.min((rf.coldStreak ?? 0) * 3, 15);

  return clamp(rawRate * 80 + 10 + hotBonus - coldMalus, 0, 100);
}

/**
 * Componente B: Trajetória de ranking (últimas 8 semanas / temporadas)
 * Delta de posição no ranking: subindo forte = score alto.
 */
function _componentTrajetoriaRanking(player) {
  const rankHist = Array.isArray(player._rankHistory) ? player._rankHistory : [];
  if (rankHist.length < 2) {
    // Só ranking atual disponível
    const rank = player.rankPosition ?? 200;
    return clamp(100 - (rank / 200) * 60, 10, 90);
  }

  const recent = rankHist[rankHist.length - 1]?.rank ?? player.rankPosition ?? 200;
  const prev   = rankHist[rankHist.length - 2]?.rank ?? recent;
  const delta  = prev - recent; // positivo = subiu no ranking

  // Base pelo ranking atual
  const rank = player.rankPosition ?? recent;
  const rankBase = rank <= 5   ? 85
    : rank <= 20   ? 75
    : rank <= 50   ? 65
    : rank <= 100  ? 55
    : rank <= 200  ? 40
    :                25;

  // Bonus/malus pelo delta
  const deltaScore = clamp(delta / 2, -20, 20);

  return clamp(rankBase + deltaScore, 0, 100);
}

/**
 * Componente C: Performance vs expectativa
 * Compara o resultado com o esperado pelo ranking.
 */
function _componentVsExpectativa(player) {
  const rf = player.recentForm;
  if (!rf || !Array.isArray(rf.results) || rf.results.length === 0) return 50;

  const results = rf.results.slice(-6);
  let upsetBonus = 0;

  results.forEach(r => {
    const oppRank = r.oppRank ?? 99;
    const myRank  = player.rankPosition ?? 99;
    // Se ganhou de alguém muito melhor ranqueado = upset
    if (r.won && oppRank < myRank - 15) upsetBonus += 8;
    // Se perdeu de alguém muito pior = bad loss
    if (!r.won && oppRank > myRank + 20) upsetBonus -= 8;
  });

  const formScore = rf.formScore ?? 0.5;
  return clamp(formScore * 70 + 15 + upsetBonus, 0, 100);
}

/**
 * Componente D: Títulos e finais recentes (últimas 2 temporadas)
 */
function _componentTitulosRecentes(player) {
  const hist = Array.isArray(player._seasonHistory) ? player._seasonHistory : [];
  if (hist.length === 0) return 50;

  const recent = hist.slice(-2);
  let score = 50;

  recent.forEach((s, i) => {
    const recencyMult = i === recent.length - 1 ? 1.0 : 0.5;
    const titleType = s.titleWon;
    const bonus = titleType === 'SLAM'    ? 40
      : titleType === 'MASTERS'  ? 28
      : titleType === 'ATP500'   ? 18
      : titleType === 'ATP250'   ? 10
      : titleType === 'MASTERS_1000' ? 28
      :                             0;
    const finalsBonus = (s.finals ?? 0) > 0 ? 6 : 0;
    score += (bonus + finalsBonus) * recencyMult;
  });

  return clamp(score, 0, 100);
}

/**
 * Componente E: Rating Individual por partida (IndividualRating)
 * Usa player.matchRatingHistory se disponível.
 * Caso contrário, usa qualidade de recentForm.
 */
function _componentMatchRating(player) {
  // Se houver histórico de ratings de partidas individuais
  const ratingHist = player.matchRatingHistory;
  if (Array.isArray(ratingHist) && ratingHist.length > 0) {
    const recent = ratingHist.slice(-5);
    const avg    = recent.reduce((a, b) => a + b, 0) / recent.length;
    return clamp((avg / 10) * 100, 0, 100);
  }

  // Fallback: usa formScore + qualidade de recentForm
  const rf = player.recentForm;
  if (rf) {
    const base = (rf.formScore ?? 0.5) * 70 + 15;
    // surfaceForm média se disponível
    const surfScores = Object.values(rf.surfaceForm ?? {});
    const surfAvg    = surfScores.length > 0
      ? surfScores.reduce((a, b) => a + b, 0) / surfScores.length
      : 0.5;
    return clamp(base + (surfAvg - 0.5) * 20, 0, 100);
  }

  return 50;
}

/**
 * Componente F: Saúde / condição física
 */
function _componentSaude(player) {
  const condition = player.physicalCondition;
  if (!condition) return 60; // neutro

  const level = condition.level ?? 1.0;
  if (player.injury && !player.injury.recovered) {
    const grade = player.injury.grade ?? 1;
    const malus = grade * 15;
    return clamp(level * 70 - malus, 0, 80);
  }

  return clamp(level * 90, 0, 100);
}

/**
 * Computa o IFR completo.
 * @param {object} player
 * @param {object} [opts] — { surface }
 * @returns {{ score: number, components: object, tier: object, label: string, color: string }}
 */
export function computeIFR(player, opts = {}) {
  const W = {
    resultados:   0.35,
    ranking:      0.25,
    vsExpect:     0.20,
    titulos:      0.15,
    matchRating:  0.05, // pequeno pois depende de histórico disponível
  };

  const compResultados  = _componentResultados(player);
  const compRanking     = _componentTrajetoriaRanking(player);
  const compVsExpect    = _componentVsExpectativa(player);
  const compTitulos     = _componentTitulosRecentes(player);
  const compRating      = _componentMatchRating(player);
  const compSaude       = _componentSaude(player);

  // Saúde como multiplicador (não componente ponderado — é gate)
  const saudeMult = compSaude < 30 ? 0.60
    : compSaude < 50 ? 0.80
    : compSaude < 70 ? 0.95
    :                  1.00;

  const rawScore =
    compResultados  * W.resultados  +
    compRanking     * W.ranking     +
    compVsExpect    * W.vsExpect    +
    compTitulos     * W.titulos     +
    compRating      * W.matchRating;

  const score = clamp(Math.round(rawScore * saudeMult), 0, 100);
  const tier  = getPhaseTwoTier(score);

  return {
    score,
    tier,
    label: tier.label,
    color: tier.color,
    components: {
      resultados:  Math.round(compResultados),
      ranking:     Math.round(compRanking),
      vsExpect:    Math.round(compVsExpect),
      titulos:     Math.round(compTitulos),
      matchRating: Math.round(compRating),
      saude:       Math.round(compSaude),
    },
  };
}

// ── 2.2 Visibilidade Pública ──────────────────────────────────────────────────

/**
 * Computa a visibilidade pública do jogador.
 * @param {object} player
 * @param {object} [opts] — { newsEngine, rivalrySystem, allPlayers, year }
 * @returns {{ score: number, components: object }}
 */
export function computeVisibility(player, opts = {}) {
  const { newsEngine, rivalrySystem, allPlayers = [], year } = opts;

  // A: Menções no NewsEngine (últimas 4 semanas / torneios)
  let newsScore = 30; // base
  if (newsEngine) {
    const feed   = newsEngine.feed ?? [];
    const recent = feed.filter(a =>
      a.playerIds?.includes(player.id) ||
      a.content?.includes(player.name)
    ).slice(-20);
    newsScore = clamp(30 + recent.length * 5, 0, 100);
  }

  // B: Rivalidades ativas (com jogadores de alta marketability)
  let rivalScore = 30;
  if (rivalrySystem && allPlayers.length > 0) {
    const rivals = rivalrySystem.getRivalsOf?.(player.id) ?? [];
    const activeRivals = rivals.filter(r => r.intensity >= 50);
    const topRivals    = activeRivals.filter(r => {
      const opp = allPlayers.find(p => p.id === r.opponentId);
      return (opp?.rankPosition ?? 999) <= 30;
    });
    rivalScore = clamp(30 + activeRivals.length * 8 + topRivals.length * 12, 0, 100);
  }

  // C: Milestones e eventos de interesse humano
  let milestoneScore = 20;
  const hist = Array.isArray(player._seasonHistory) ? player._seasonHistory : [];
  const lastS = hist[hist.length - 1];

  if (lastS) {
    // Título de Grand Slam = grande visibilidade
    if (lastS.titleWon === 'SLAM') milestoneScore += 60;
    else if (lastS.titleWon === 'MASTERS' || lastS.titleWon === 'MASTERS_1000') milestoneScore += 35;
    else if (lastS.titleWon) milestoneScore += 20;

    // Final de GS = notícia
    if (lastS.finals >= 2) milestoneScore += 15;
    else if (lastS.finals >= 1) milestoneScore += 8;
  }

  // Retorno de lesão
  const injury = player.injury;
  if (injury && injury.recovered && (injury.grade ?? 0) >= 2) milestoneScore += 20;

  milestoneScore = clamp(milestoneScore, 0, 100);

  // D: Superfície "em casa" (especialista reconhecido)
  let surfaceScore = 30;
  const surfId = player.surfaceIdentity;
  if (surfId) {
    const depth = surfId.depth ?? 0;
    surfaceScore = clamp(30 + depth * 40, 30, 80);
  }

  // Pesos
  const score = clamp(Math.round(
    newsScore       * 0.30 +
    rivalScore      * 0.25 +
    milestoneScore  * 0.30 +
    surfaceScore    * 0.15
  ), 0, 100);

  return {
    score,
    components: {
      news:        Math.round(newsScore),
      rivalidades: Math.round(rivalScore),
      milestones:  Math.round(milestoneScore),
      superficie:  Math.round(surfaceScore),
    },
  };
}

// ── 2.3 Sinal Combinado para Patrocinadores ───────────────────────────────────

/**
 * Computa o sinal combinado que os patrocinadores leem.
 * Fórmula: Marketability × 0.40 + IFR × 0.35 + Visibilidade × 0.25
 *
 * @param {object} player
 * @param {object} [opts]
 * @returns {{ score, ifr, visibility, marketability, tier, label, color }}
 */
export function computeSponsorSignal(player, opts = {}) {
  const ifrResult  = computeIFR(player, opts);
  const visResult  = computeVisibility(player, opts);
  const mktScore   = player.personality?.marketability?.score ?? 30;

  const score = clamp(Math.round(
    mktScore          * 0.40 +
    ifrResult.score   * 0.35 +
    visResult.score   * 0.25
  ), 0, 100);

  const tier = getPhaseTwoTier(score);

  return {
    score,
    tier,
    label: tier.label,
    color: tier.color,
    ifr:          ifrResult.score,
    ifrTier:      ifrResult.tier,
    ifrComponents: ifrResult.components,
    visibility:   visResult.score,
    visComponents: visResult.components,
    marketability: mktScore,
  };
}

// ── Função principal de update ────────────────────────────────────────────────

/**
 * Atualiza o campo player.phaseTwo com IFR, visibilidade e sinal.
 * Chamado no FINISH_TOURNAMENT e no ADVANCE_YEAR.
 *
 * @param {object} player
 * @param {object} [opts] — { newsEngine, rivalrySystem, allPlayers, year }
 * @returns {object} player com player.phaseTwo atualizado
 */
export function updatePlayerPhaseTwo(player, opts = {}) {
  const ifr      = computeIFR(player, opts);
  const vis      = computeVisibility(player, opts);
  const signal   = computeSponsorSignal(player, opts);

  return {
    ...player,
    phaseTwo: {
      ifr:             ifr.score,
      ifrTier:         ifr.tier.id,
      ifrComponents:   ifr.components,
      visibility:      vis.score,
      visComponents:   vis.components,
      sponsorSignal:   signal.score,
      signalTier:      signal.tier.id,
      lastUpdated:     opts.year ?? null,
    },
  };
}

// ── Histórico de match ratings ────────────────────────────────────────────────

/**
 * Adiciona um rating de partida ao histórico do jogador.
 * Chamado no FINISH_TOURNAMENT quando há partidas com engine completo.
 *
 * @param {object} player
 * @param {number} rating — score 0–10 do IndividualRating
 * @returns {object} player com matchRatingHistory atualizado
 */
export function pushMatchRating(player, rating) {
  if (typeof rating !== 'number' || isNaN(rating)) return player;
  const prev = Array.isArray(player.matchRatingHistory) ? player.matchRatingHistory : [];
  const updated = [...prev, Math.round(rating * 10) / 10].slice(-20); // últimas 20 partidas
  return { ...player, matchRatingHistory: updated };
}

/**
 * Retorna a média dos últimos N ratings de partida.
 */
export function getAvgMatchRating(player, n = 5) {
  const hist = player.matchRatingHistory;
  if (!Array.isArray(hist) || hist.length === 0) return null;
  const recent = hist.slice(-n);
  return Math.round((recent.reduce((a, b) => a + b, 0) / recent.length) * 10) / 10;
}

