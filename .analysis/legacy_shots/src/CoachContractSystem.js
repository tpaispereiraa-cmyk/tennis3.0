/**
 * CoachContractSystem.js
 * ─────────────────────────────────────────────────────────────────
 * Sistema de contratos automáticos técnico-jogador.
 *
 * Regras de design:
 *  - Todo jogador (tour + prospects) tem técnico sempre
 *  - Contratos duram 2–5 temporadas (rolados na contratação)
 *  - Renovação automática baseada em satisfação
 *  - Dispensa antecipada por desempenho muito abaixo do esperado
 *  - Pick de técnico compatível com o estilo do jogador
 *  - Nunca deixa jogador sem técnico — troca imediata ao fim
 */

import {
  STYLE_TO_COACH_PHILOSOPHY,
  PHILOSOPHY_ATTRS,
  SURFACE_SPECIALTY_ATTRS,
  COACH_PERSONAS,
  COACHING_STYLES,
  COACH_TRAIT_DEFS,
  generateCoach,
  replenishCoachPool,
} from './CoachingSystem.js';

// ═══════════════════════════════════════════════════════════════════
// BLOCO C — CHEMISTRY SCORE (substitui compatibilityScore)
// ═══════════════════════════════════════════════════════════════════

/**
 * Tabela de compatibilidade persona (coach) × archetype/personality (player).
 * Valor: modificador em pontos (-20 a +15) somado ao score base.
 *
 * Baseado na lógica da proposta:
 *   GENERAL incompatível com VOLATILE/TAKEALLRISK → penalidade
 *   MENTOR_PATERNAL + PERFECTIONIST → sinergia forte
 *   MISTICO + ARTIST/MOMENTUM_PLAYER → sinergia forte
 *   etc.
 */
const PERSONA_ARCHETYPE_COMPAT = {
  // persona → { archetype/styleId → delta }
  GENERAL: {
    PERFECTIONIST:    +10, WARRIOR:       +8,
    ARTIST:           -5,  REBEL:         -12,
    VOLATILE:         -15, TAKEALLRISK:   -15,
    MOMENTUM_PLAYER:  -8,
  },
  MENTOR_PATERNAL: {
    PERFECTIONIST:   +15, WARRIOR:        +8,
    ARTIST:          +10, REBEL:          -5,
    OUTSIDER:        +12,
  },
  ANALITICO_FRIO: {
    PERFECTIONIST:   +12, WARRIOR:        +5,
    ARTIST:          -10, REBEL:          -8,
    VOLATILE:        -12, MOMENTUM_PLAYER:-8,
    TACTICAL_MIND:   +10,
  },
  MOTIVADOR_PURO: {
    WARRIOR:         +15, UNDERDOG:       +12,
    ARTIST:          +8,  PERFECTIONIST:  -5,
    VOLATILE:        +5,
  },
  MISTICO: {
    ARTIST:          +15, MOMENTUM_PLAYER:+12,
    PERFECTIONIST:   +5,  WARRIOR:        -5,
    TACTICAL_MIND:   +8,
  },
  AMIGO_CUMPLICE: {
    ARTIST:          +12, REBEL:          +10,
    VOLATILE:        +8,  TAKEALLRISK:    +8,
    WARRIOR:         -3,  PERFECTIONIST:  -5,
  },
  INOVADOR_TECNICO: {
    PERFECTIONIST:   +10, TACTICAL_MIND:  +8,
    REBEL:           +5,  WARRIOR:        -5,
    VOLATILE:        -8,
  },
  VETERANO_SECO: {
    WARRIOR:         +10, PERFECTIONIST:  +8,
    UNDERDOG:        +8,  ARTIST:         -3,
    VOLATILE:        -5,  REBEL:          -8,
  },
};

/**
 * Mapeamento coachingStyle → quais styleIds de jogador têm sinergia.
 */
const COACHING_STYLE_SYNERGY = {
  ATTACK_SCULPTOR:  ['AGG_BASELINER', 'PWR_BASE', 'TAKEALLRISK'],
  SERVE_FANATICO:   ['BIG_SERVER', 'SRV_VOL'],
  DEFENSE_ARCHITECT:['RETRIEVER', 'GRINDER', 'CTR_PUNCHER'],
  TATICO_PURO:      ['TACT_TEC', 'ADPT_TAC', 'CTR_PUNCHER'],
  MENTAL_MAESTRO:   ['MOMENTUM_PLAYER', 'ADPT_TAC', 'ALL_COURT'],
  ALL_ROUND_FORMER: ['ALL_COURT', 'TACT_TEC'],
  FORMADOR_JOVENS:  [],  // bônus de potMult, não de estilo
};

/**
 * Score de química coach × jogador (0–100).
 * Substitui o antigo compatibilityScore.
 *
 * Fatores:
 *  1. Filosofia × styleId          (base 0–100, igual ao anterior)
 *  2. coachingStyle × styleId      (sinergia +10 se alinhado)
 *  3. Persona × archetype/style    (-20 a +15)
 *  4. Traits de preferência de idade
 *  5. Nacionalidade compartilhada  (+3)
 *  6. Trait INCOMPATIVEL_VOLATIL   (-20 se jogador VOLATILE/TAKEALLRISK)
 *  7. Trait RIGIDO_DEMAIS          (-12 se jogador TAKEALLRISK/TACT_TEC)
 *  8. EX_LENDA                     (+5 — prestígio atrai jogadores ambiciosos)
 *
 * @param {object} coach  - objeto coach (precisa: philosophy, coachingStyle, persona, traits, nationality, age)
 * @param {object} player - objeto player (precisa: styleId, personality, nationality, age/birthYear)
 * @param {number} [season]
 * @returns {number} 0–100
 */
export function chemistryScore(coach, player, season = 2025) {
  const styleId   = player.styleId   ?? '';
  const persona   = coach.persona    ?? 'VETERANO_SECO';
  const cStyle    = coach.coachingStyle ?? 'ALL_ROUND_FORMER';
  const traits    = coach.traits     ?? [];
  const archetype = player.personality?.competitiveArchetype ?? '';
  const pressPersona = player.personality?.pressPersona ?? '';

  // 1. Base filosófica (0–100)
  const ideal = STYLE_TO_COACH_PHILOSOPHY[styleId];
  let base = 55;
  if (ideal) {
    if (coach.philosophy === ideal.philosophy) base = 100;
    else if (coach.philosophy === 'COMPLETE')  base = 65;
    else {
      const OPPOSITES = { OFFENSIVE: 'DEFENSIVE', DEFENSIVE: 'OFFENSIVE' };
      base = OPPOSITES[coach.philosophy] === ideal.philosophy ? 30 : 55;
    }
  }

  let delta = 0;

  // 2. Sinergia coachingStyle × styleId (+10)
  const synergies = COACHING_STYLE_SYNERGY[cStyle] ?? [];
  if (synergies.includes(styleId)) delta += 10;

  // 3. Persona × archetype/developmentStyle
  const personaMap = PERSONA_ARCHETYPE_COMPAT[persona] ?? {};
  delta += personaMap[archetype]   ?? 0;
  delta += personaMap[styleId]     ?? 0;       // estilo como proxy de personalidade
  delta += personaMap[pressPersona]?? 0;

  // 4. Traits de preferência de idade
  const playerAge = player.birthYear ? season - player.birthYear : (player.age ?? 24);
  if (traits.includes('PREFERE_JOVENS')) {
    if (playerAge < 22)      delta += 8;
    else if (playerAge > 28) delta -= 12;
  }
  if (traits.includes('PREFERE_VETERANOS')) {
    if (playerAge > 28)      delta += 8;
    else if (playerAge < 22) delta -= 12;
  }

  // 5. Nacionalidade compartilhada (+3)
  if (coach.nationality && player.nationality &&
      coach.nationality === player.nationality) {
    delta += 3;
  }

  // 6. Incompatibilidade com voláteis
  if (traits.includes('INCOMPATIVEL_VOLATIL') &&
      (styleId === 'VOLATILE' || styleId === 'TAKEALLRISK' ||
       player.developmentStyle === 'VOLATILE')) {
    delta -= 20;
  }

  // 7. Rigidez excessiva
  if (traits.includes('RIGIDO_DEMAIS') &&
      (styleId === 'TAKEALLRISK' || styleId === 'TACT_TEC')) {
    delta -= 12;
  }

  // 8. Ex-lenda atrai ambição
  if (traits.includes('EX_LENDA')) delta += 5;

  // FORMADOR_JOVENS bônus de desenvolvimento (not chemistry diretamente,
  // mas sinaliza confiança de jogadores jovens)
  if (cStyle === 'FORMADOR_JOVENS' && playerAge < 22) delta += 8;

  const raw = Math.round(base + delta);
  return Math.max(0, Math.min(100, raw));
}

/**
 * Retorna o label de qualidade da química para UI e notícias.
 * @param {number} score 0–100
 * @returns {{ label: string, icon: string, color: string }}
 */
export function chemistryLabel(score) {
  if (score >= 92) return { label: 'Lendária',    icon: '🌟', color: '#FFD700' };
  if (score >= 80) return { label: 'Excepcional', icon: '⭐', color: '#4CAF50' };
  if (score >= 65) return { label: 'Boa',         icon: '✅', color: '#8BC34A' };
  if (score >= 50) return { label: 'Funcional',   icon: '🤝', color: '#9E9E9E' };
  if (score >= 40) return { label: 'Tensa',       icon: '⚡', color: '#FF9800' };
  return               { label: 'Conflituosa',    icon: '🔥', color: '#F44336' };
}

/**
 * Wrapper de compatibilidade reversa para código legado que usa compatibilityScore.
 * Mantido para não quebrar chamadas internas que ainda usam a assinatura antiga.
 * @deprecated Use chemistryScore() com objetos completos.
 */
function compatibilityScore(coachPhilosophy, playerStyleId) {
  const ideal = STYLE_TO_COACH_PHILOSOPHY[playerStyleId];
  if (!ideal) return 65;
  if (coachPhilosophy === ideal.philosophy) return 100;
  if (coachPhilosophy === 'COMPLETE') return 65;
  const OPPOSITES = { OFFENSIVE: 'DEFENSIVE', DEFENSIVE: 'OFFENSIVE' };
  if (OPPOSITES[coachPhilosophy] === ideal.philosophy) return 30;
  return 55;
}

/**
 * Duração de contrato rolada no momento da contratação.
 * Top 10 tendem a contratos mais curtos (mais opções).
 * Prospects tendem a contratos mais longos (investimento de longo prazo).
 */
function rollContractLength(playerRank, isProspect) {
  if (isProspect) {
    // Prospects: 3-5 temporadas
    return 3 + Math.floor(Math.random() * 3);
  }
  if (playerRank <= 10) {
    // Top 10: 2-3 temporadas (mais exigentes, renovam com frequência)
    return 2 + Math.floor(Math.random() * 2);
  }
  if (playerRank <= 50) {
    // Top 11-50: 2-4 temporadas
    return 2 + Math.floor(Math.random() * 3);
  }
  // Resto: 3-5 temporadas
  return 3 + Math.floor(Math.random() * 3);
}

// ═══════════════════════════════════════════════════════════════════
// PICK DE TÉCNICO
// ═══════════════════════════════════════════════════════════════════

/**
 * Seleciona o melhor técnico disponível para um jogador.
 *
 * Critérios (por prioridade):
 *  1. Compatibilidade de filosofia com o estilo do jogador
 *  2. Reputação do técnico (ponderada pelo ranking do jogador)
 *  3. Tiebreak aleatório
 *
 * Jogadores de alto ranking exigem técnicos de maior reputação.
 * Prospects aceitam técnicos de reputação mais baixa.
 *
 * @param {object}   player       — jogador que precisa de técnico
 * @param {Array}    coachPool    — pool completo de coaches
 * @param {number}   season       — temporada atual
 * @returns {object|null}         — coach selecionado ou null se pool vazio
 */
export function pickCoachForPlayer(player, coachPool, season) {
  const freeCoaches = coachPool.filter(c => c.availability === 'FREE');
  if (freeCoaches.length === 0) return null;

  const rank      = player.rankPosition ?? 128;
  const isProspect = player.isProspect ?? false;

  // Filtro de reputação mínima: top players não aceitam coaches ruins
  let minRep = 0;
  if (!isProspect) {
    if (rank <= 5)  minRep = 55;
    else if (rank <= 20) minRep = 35;
    else if (rank <= 50) minRep = 20;
  }

  const eligible = freeCoaches.filter(c => c.reputation >= minRep);
  const candidates = eligible.length > 0 ? eligible : freeCoaches; // fallback sem filtro

  // Pontua cada candidato usando chemistryScore completo
  const scored = candidates.map(coach => {
    const chem    = chemistryScore(coach, player, season);
    const repNorm = coach.reputation / 100; // 0-1

    // Peso do ranking: top players valorizam mais a reputação do coach
    const repWeight = rank <= 20 ? 0.55 : rank <= 50 ? 0.40 : 0.30;
    const cmpWeight = 1 - repWeight;

    const score = (chem / 100) * cmpWeight + repNorm * repWeight
                + Math.random() * 0.08; // tiebreak com ruído pequeno

    return { coach, score, chemistry: chem };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored[0].coach;
}

// ═══════════════════════════════════════════════════════════════════
// SATISFAÇÃO E RENOVAÇÃO
// ═══════════════════════════════════════════════════════════════════

/**
 * Calcula a satisfação do jogador com o técnico ao fim de uma temporada.
 * Retorna um valor 0-100.
 *
 * Componentes:
 *  - Desempenho vs expectativa de ranking (maior peso)
 *  - Compatibilidade de filosofia com estilo
 *  - Reputação atual do técnico
 *  - Bônus por título conquistado
 */
export function calcSatisfaction(player, coach, prevRank, titleWon = null) {
  const currentRank = player.rankPosition ?? 999;
  const prev        = prevRank ?? currentRank;
  const delta       = prev - currentRank; // positivo = subiu

  // ── Componente de desempenho (0-60 pontos) ──────────────────
  let perfScore;
  if (delta >= 20)      perfScore = 60;       // subiu muito
  else if (delta >= 5)  perfScore = 50;
  else if (delta >= 0)  perfScore = 38;       // estável
  else if (delta >= -10) perfScore = 22;      // caiu pouco
  else if (delta >= -25) perfScore = 10;      // caiu muito
  else                   perfScore = 0;       // colapso de ranking

  // Bônus por título
  if (titleWon === 'SLAM')    perfScore = Math.min(60, perfScore + 18);
  else if (titleWon === 'MASTERS') perfScore = Math.min(60, perfScore + 10);
  else if (titleWon === 'ATP500')  perfScore = Math.min(60, perfScore + 5);
  else if (titleWon === 'ATP250')  perfScore = Math.min(60, perfScore + 3);

  // ── Componente de compatibilidade (0-25 pontos) — agora usa chemistryScore ──
  const chem = chemistryScore(coach, player);
  const cmptScore = (chem / 100) * 25;

  // ── Reputação do técnico (0-15 pontos) ──────────────────────
  const repScore = (Math.min(100, coach.reputation) / 100) * 15;

  return Math.round(Math.min(100, perfScore + cmptScore + repScore));
}

/**
 * Decide se dispensa antecipada deve acontecer.
 * Só dispara quando o contrato ainda tem ao menos 1 ano restante.
 *
 * Condições para dispensa antecipada (reason = 'RESULTS'):
 *  - Satisfação < 25 em qualquer temporada
 *  - Satisfação média das últimas 2 temporadas < 30
 *
 * Condições para dispensa por conflito (reason = 'CONFLICT'):
 *  - Compatibilidade ≤ 30 + satisfação < 40 por 2 temporadas seguidas
 *
 * @param {object} player    — com coach.satisfactionLog
 * @param {object} coach     — objeto coach
 * @returns {{ fire: boolean, reason: string }|null}
 */
export function checkEarlyDismissal(player, coach) {
  const log = player.coach?.satisfactionLog ?? [];
  if (log.length === 0) return null;

  const lastSat = log[log.length - 1] ?? 50;
  const prevSat = log[log.length - 2] ?? 50;
  const compat  = chemistryScore(coach, player);

  // Desempenho catastrófico
  if (lastSat < 25) {
    return { fire: true, reason: 'RESULTS' };
  }

  // Média das últimas 2 temporadas ruim
  if (log.length >= 2 && (lastSat + prevSat) / 2 < 30) {
    return { fire: true, reason: 'RESULTS' };
  }

  // Conflito de química persistente + satisfação baixa
  if (compat < 35 && log.length >= 2 && lastSat < 40 && prevSat < 40) {
    return { fire: true, reason: 'CONFLICT' };
  }

  return null;
}

/**
 * Decide se renova ao fim do contrato.
 *
 * Renovação (mais 2-4 anos) se satisfação média ≥ 55.
 * Não renova (busca novo técnico) se satisfação média < 55.
 *
 * @param {object} player
 * @param {object} coach
 * @returns {{ renew: boolean, newLength: number }}
 */
export function checkRenewal(player, coach) {
  const log     = player.coach?.satisfactionLog ?? [];
  const avg     = log.length > 0
    ? log.reduce((s, v) => s + v, 0) / log.length
    : 50;

  // Bond da parceria também influencia a renovação
  const bond = player.coach?.bondScore ?? 50;
  const bondPenalty = bond < 20 ? -20 : bond < 35 ? -12 : bond < 45 ? -5 : 0;
  const effectiveAvg = avg + bondPenalty;

  if (effectiveAvg >= 55) {
    const newLength = 2 + Math.floor(Math.random() * 3); // 2-4 anos
    return { renew: true, newLength };
  }
  return { renew: false, newLength: 0 };
}

// ═══════════════════════════════════════════════════════════════════
// ATRIBUIÇÃO INICIAL
// ═══════════════════════════════════════════════════════════════════

/**
 * Atribui técnicos a todos os jogadores que ainda não têm um.
 * Chamado no buildUniverse e sempre que um jogador fica sem técnico.
 *
 * Modifica coachPool in-place (availability) e retorna players atualizados.
 *
 * @param {Array}  players       — array de jogadores
 * @param {Array}  coachPool     — pool mutável
 * @param {number} season        — temporada atual
 * @returns {{ players: Array, coachPool: Array }}
 */
export function assignCoachesToAll(players, coachPool, season) {
  // Cópia do pool para não mutar o original
  let pool = coachPool.map(c => ({ ...c }));
  const result = [];

  // Ordena por ranking para atribuir primeiro aos melhores jogadores
  const sorted = [...players].sort((a, b) => (a.rankPosition ?? 999) - (b.rankPosition ?? 999));

  for (const player of sorted) {
    if (player.coach) {
      result.push(player);
      continue; // já tem técnico
    }

    // Garante pool suficiente
    if (pool.filter(c => c.availability === 'FREE').length < 5) {
      pool = replenishCoachPool(pool, season, 30);
    }

    const coach = pickCoachForPlayer(player, pool, season);
    if (!coach) {
      // Gera um técnico emergencial se pool esgotou
      const emergency = generateCoach(season);
      pool.push(emergency);
      result.push(attachCoach(player, emergency, season));
      pool = pool.map(c => c.id === emergency.id
        ? { ...c, availability: 'CONTRACTED', currentPupilId: player.id }
        : c
      );
      continue;
    }

    result.push(attachCoach(player, coach, season));
    pool = pool.map(c => c.id === coach.id
      ? { ...c, availability: 'CONTRACTED', currentPupilId: player.id }
      : c
    );
  }

  // Devolve os jogadores na ordem original
  const byId = Object.fromEntries(result.map(p => [p.id, p]));
  return {
    players: players.map(p => byId[p.id] ?? p),
    coachPool: pool,
  };
}

// ═══════════════════════════════════════════════════════════════════
// AVANÇO DE TEMPORADA
// ═══════════════════════════════════════════════════════════════════

/**
 * Processa toda a lógica de contrato ao fim de uma temporada:
 *  1. Atualiza satisfação de cada jogador com seu técnico
 *  2. Verifica dispensa antecipada
 *  3. Verifica fim de contrato → renovação ou troca
 *  4. Garante que todo jogador termine com técnico
 *
 * @param {Array}  players       — tour + prospects com coaches atribuídos
 * @param {Array}  coachPool     — pool atual
 * @param {number} season        — temporada que acabou
 * @param {object} prevRankMap   — { playerId: rankAnterior }
 * @param {object} titleWinners  — { playerId: titleType }
 * @returns {{ players: Array, coachPool: Array, events: Array }}
 */
export function processCoachContracts(players, coachPool, season, prevRankMap = {}, titleWinners = {}) {
  let pool = coachPool.map(c => ({ ...c }));
  const events = [];
  const updatedPlayers = [];

  for (let player of players) {
    if (!player.coach) {
      // Jogador sem técnico → atribuir imediatamente
      if (pool.filter(c => c.availability === 'FREE').length < 3) {
        pool = replenishCoachPool(pool, season + 1, 20);
      }
      const newCoach = pickCoachForPlayer(player, pool, season + 1);
      if (newCoach) {
        player = attachCoach(player, newCoach, season + 1);
        pool = pool.map(c => c.id === newCoach.id
          ? { ...c, availability: 'CONTRACTED', currentPupilId: player.id }
          : c
        );
        events.push({ type: 'COACH_HIRED', playerId: player.id, coachId: newCoach.id, season });
      }
      updatedPlayers.push(player);
      continue;
    }

    const coachInPool = pool.find(c => c.id === player.coach.coachId);
    if (!coachInPool) {
      // Coach sumiu do pool (bug de consistência) → atribuir novo
      updatedPlayers.push(player);
      continue;
    }

    // ── 1. Calcular satisfação desta temporada ────────────────
    const sat = calcSatisfaction(
      player,
      coachInPool,
      prevRankMap[player.id],
      titleWinners[player.id] ?? null,
    );

    const newLog = [...(player.coach.satisfactionLog ?? []), sat].slice(-5); // histórico de até 5 anos

    player = {
      ...player,
      coach: { ...player.coach, satisfactionLog: newLog },
    };

    // ── 2. Dispensa antecipada? ───────────────────────────────
    const contractRemaining = (player.coach.contractEnd ?? season) - season;
    const earlyCheck = contractRemaining > 0
      ? checkEarlyDismissal(player, coachInPool)
      : null;

    if (earlyCheck?.fire) {
      const ev = { type: 'COACH_FIRED', playerId: player.id, coachId: coachInPool.id, reason: earlyCheck.reason, season };
      events.push(ev);
      player = detachCoach(player, coachInPool, season, earlyCheck.reason);
      pool = releaseCoach(pool, coachInPool.id, earlyCheck.reason);

      // Contrata imediatamente novo técnico
      if (pool.filter(c => c.availability === 'FREE').length < 3) {
        pool = replenishCoachPool(pool, season + 1, 20);
      }
      const replacement = pickCoachForPlayer(player, pool, season + 1);
      if (replacement) {
        player = attachCoach(player, replacement, season + 1);
        pool = pool.map(c => c.id === replacement.id
          ? { ...c, availability: 'CONTRACTED', currentPupilId: player.id }
          : c
        );
        events.push({ type: 'COACH_HIRED', playerId: player.id, coachId: replacement.id, season });
      }
      updatedPlayers.push(player);
      continue;
    }

    // ── 3. Fim de contrato? ───────────────────────────────────
    if (season >= (player.coach.contractEnd ?? season)) {
      const { renew, newLength } = checkRenewal(player, coachInPool);

      if (renew) {
        // Renova contrato
        player = {
          ...player,
          coach: {
            ...player.coach,
            contractEnd:      season + newLength,
            satisfactionLog:  [], // zera o log na renovação
          },
        };
        events.push({ type: 'COACH_RENEWED', playerId: player.id, coachId: coachInPool.id, newLength, season });
      } else {
        // Não renova — libera e contrata novo
        events.push({ type: 'COACH_EXPIRED', playerId: player.id, coachId: coachInPool.id, season });
        player = detachCoach(player, coachInPool, season, 'MUTUAL');
        pool = releaseCoach(pool, coachInPool.id, 'MUTUAL');

        if (pool.filter(c => c.availability === 'FREE').length < 3) {
          pool = replenishCoachPool(pool, season + 1, 20);
        }
        const newCoach = pickCoachForPlayer(player, pool, season + 1);
        if (newCoach) {
          player = attachCoach(player, newCoach, season + 1);
          pool = pool.map(c => c.id === newCoach.id
            ? { ...c, availability: 'CONTRACTED', currentPupilId: player.id }
            : c
          );
          events.push({ type: 'COACH_HIRED', playerId: player.id, coachId: newCoach.id, season });
        }
      }
    }

    updatedPlayers.push(player);
  }

  // ── 4. Garantia final: ninguém sem técnico ────────────────────
  const needsCoach = updatedPlayers.filter(p => !p.coach);
  if (needsCoach.length > 0) {
    if (pool.filter(c => c.availability === 'FREE').length < needsCoach.length + 5) {
      pool = replenishCoachPool(pool, season + 1, needsCoach.length + 20);
    }
    for (let i = 0; i < updatedPlayers.length; i++) {
      if (!updatedPlayers[i].coach) {
        const coach = pickCoachForPlayer(updatedPlayers[i], pool, season + 1);
        if (coach) {
          updatedPlayers[i] = attachCoach(updatedPlayers[i], coach, season + 1);
          pool = pool.map(c => c.id === coach.id
            ? { ...c, availability: 'CONTRACTED', currentPupilId: updatedPlayers[i].id }
            : c
          );
        }
      }
    }
  }

  return { players: updatedPlayers, coachPool: pool, events };
}

// ═══════════════════════════════════════════════════════════════════
// HELPERS INTERNOS
// ═══════════════════════════════════════════════════════════════════

/**
 * Cria o objeto player.coach e atualiza o player com duração de contrato.
 */
function attachCoach(player, coach, season) {
  const isProspect = player.isProspect ?? false;
  const contractLength = rollContractLength(player.rankPosition ?? 128, isProspect);

  return {
    ...player,
    coach: {
      coachId:            coach.id,
      name:               coach.name,
      fullName:           coach.fullName,
      philosophy:         coach.philosophy,
      specialty:          coach.specialty,
      specialtySurface:   coach.specialtySurface ?? null,
      persona:            coach.persona           ?? null,
      coachingStyle:      coach.coachingStyle     ?? null,
      traits:             coach.traits            ?? [],
      startSeason:        season,
      contractEnd:        season + contractLength,
      reputationSnapshot: coach.reputation,
      chemistrySnapshot:  chemistryScore(coach, player, season),
      satisfactionLog:    [],
      signature:          coach.signature         ?? null,  // Fase 7
    },
    coachHistory: player.coachHistory ?? [],
  };
}

/**
 * Remove o coach do jogador e registra no histórico.
 */
function detachCoach(player, coach, season, reason) {
  const startSeason = player.coach?.startSeason ?? season;
  const pd = player.coach ?? {};

  const historyEntry = {
    coachId:          coach.id,
    name:             coach.name,
    fullName:         coach.fullName ?? coach.name,
    philosophy:       coach.philosophy,
    specialty:        coach.specialty ?? [],
    specialtySurface: coach.specialtySurface ?? null,
    startSeason,
    endSeason:        season,
    seasons:          season - startSeason,
    dismissalReason:  reason,
    coachOrigin:      coach.origin ?? 'GENERATED',
    coachRepAtFiring: coach.reputation,
    // ── Dados de parceria preservados ──
    finalBond:             pd.bondScore        ?? null,
    milestones:            pd.milestones       ?? [],
    goalHistory:           pd.goalHistory      ?? [],
    partnershipNickname:   pd.partnershipNickname ?? null,
    lastGoalOutcome:       pd.lastGoalOutcome  ?? null,
    relationshipState:     pd.relationshipState ?? null,
    bondHistory:           pd.bondHistory      ?? [],
  };

  return {
    ...player,
    coach: null,
    coachHistory: [...(player.coachHistory ?? []), historyEntry],
  };
}

/**
 * Marca o coach como FREE no pool, com penalidade de reputação se aplicável.
 */
function releaseCoach(pool, coachId, reason) {
  return pool.map(c => {
    if (c.id !== coachId) return c;
    let rep = c.reputation;
    if (reason === 'RESULTS')  rep = Math.max(0, rep - 8);
    if (reason === 'CONFLICT') rep = Math.max(0, rep - 5);
    return { ...c, reputation: rep, availability: 'FREE', currentPupilId: null };
  });
}
