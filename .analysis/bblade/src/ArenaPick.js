// ============================================
// ARENAPICK.JS — Sistema de Pick de Arena
// ============================================
// MD3: Melhor rankeado escolhe R1, adversário R2, R3 aleatório
// MD5: Melhor R1, Pior R2, Melhor R3, Pior R4 (se precisar), R5 aleatório
//
// IA: pondera preferências próprias + desvantagem pro oponente
// Quanto maior o atributo "intelligence", mais peso na análise do adversário
// ============================================

// ─── Pool completo de arenas ───
export const ALL_ARENA_POOL = [
  'BB10_COMPETITIVE',
  'NEXUS',
  'COLOSSEUM_CARNAGE',
  'VOLCANIC_RAGE',
  'VORTEX_COLISEUM',
  'STORM_TRACK',
  'PANGEA_PLATFORM',
  'KILLER_SIDES',
  'PINBALL_INFERNO',
  'TIDAL_SURGE',
  'DOMINATION_ZONES',
];

// ─── Mapa de preferências por mentalidade (code interno) ───
const MENTALITY_PREFS = {
  ALL_ROUNDER:        { fav: ['BB10_COMPETITIVE','PANGEA_PLATFORM','DOMINATION_ZONES'],   hate: ['PINBALL_INFERNO','VOLCANIC_RAGE','COLOSSEUM_CARNAGE'] },
  GLASS_CANNON:       { fav: ['COLOSSEUM_CARNAGE','PINBALL_INFERNO','STORM_TRACK'],       hate: ['KILLER_SIDES','VORTEX_COLISEUM','DOMINATION_ZONES'] },
  IRON_FORTRESS:      { fav: ['NEXUS','DOMINATION_ZONES','PANGEA_PLATFORM'],              hate: ['PINBALL_INFERNO','STORM_TRACK','COLOSSEUM_CARNAGE'] },
  ETERNAL_SPINNER:    { fav: ['VORTEX_COLISEUM','KILLER_SIDES','TIDAL_SURGE'],            hate: ['COLOSSEUM_CARNAGE','PINBALL_INFERNO','VOLCANIC_RAGE'] },
  CALCULATED_CHAOS:   { fav: ['NEXUS','COLOSSEUM_CARNAGE','DOMINATION_ZONES'],            hate: ['BB10_COMPETITIVE','KILLER_SIDES','PANGEA_PLATFORM'] },
  HIGH_RISK_GAMBLER:  { fav: ['PINBALL_INFERNO','COLOSSEUM_CARNAGE','STORM_TRACK'],       hate: ['BB10_COMPETITIVE','PANGEA_PLATFORM','DOMINATION_ZONES'] },
  MOMENTUM_MASTER:    { fav: ['STORM_TRACK','TIDAL_SURGE','VORTEX_COLISEUM'],             hate: ['PINBALL_INFERNO','VOLCANIC_RAGE','NEXUS'] },
  SYNERGY_SEEKER:     { fav: ['DOMINATION_ZONES','NEXUS','PANGEA_PLATFORM'],              hate: ['PINBALL_INFERNO','VOLCANIC_RAGE','COLOSSEUM_CARNAGE'] },
  ADAPTIVE_TACTICIAN: { fav: ['NEXUS','DOMINATION_ZONES','BB10_COMPETITIVE'],             hate: ['VOLCANIC_RAGE','KILLER_SIDES','VORTEX_COLISEUM'] },
  PERFECTIONIST:      { fav: ['BB10_COMPETITIVE','PANGEA_PLATFORM','KILLER_SIDES'],       hate: ['PINBALL_INFERNO','COLOSSEUM_CARNAGE','TIDAL_SURGE'] },
  CHAOS_AGENT:        { fav: ['PINBALL_INFERNO','VOLCANIC_RAGE','COLOSSEUM_CARNAGE'],     hate: ['BB10_COMPETITIVE','PANGEA_PLATFORM','NEXUS'] },
  MOMENTUM_THIEF:     { fav: ['KILLER_SIDES','DOMINATION_ZONES','STORM_TRACK'],           hate: ['TIDAL_SURGE','VORTEX_COLISEUM','PANGEA_PLATFORM'] },
};

// ─── Score de preferência de um jogador para uma arena ───
// Retorna valor entre -6 e +6
function selfScore(mentality, arenaCode) {
  const prefs = MENTALITY_PREFS[mentality] || MENTALITY_PREFS.ALL_ROUNDER;
  const favIdx  = prefs.fav.indexOf(arenaCode);
  const hateIdx = prefs.hate.indexOf(arenaCode);
  if (favIdx === 0)  return +6;
  if (favIdx === 1)  return +4;
  if (favIdx === 2)  return +2;
  if (hateIdx === 0) return -6;
  if (hateIdx === 1) return -4;
  if (hateIdx === 2) return -2;
  return 0;
}

// ─── Score estratégico: quanto uma arena é RUIM pro adversário ───
// Maior = mais desvantagem pro oponente
function opponentPainScore(opponentMentality, arenaCode) {
  return -selfScore(opponentMentality, arenaCode);
}

// ─── Lógica de pick da IA ───
// intelligence: 1–15 (de data.js)
// 1–5:  quase aleatório, foca só em si mesmo
// 6–10: equilibra si mesmo + adversário
// 11–15: analista completo — maximiza diferença líquida
function aiPickArena(picker, opponent, availableArenas) {
  if (!picker || !availableArenas || availableArenas.length === 0) {
    return availableArenas?.[0] || 'BB10_COMPETITIVE';
  }

  const intelligence = picker.attributes?.intelligence || 8;
  const mentality    = picker.mentality || 'ALL_ROUNDER';
  const opMentality  = opponent?.mentality || 'ALL_ROUNDER';

  // Peso da análise do adversário: escala de 0 a 1 conforme inteligência
  // intel 1 → 0.0 (só si mesmo)
  // intel 8 → 0.47 (quase meio a meio)
  // intel 15 → 1.0 (analista puro)
  const opponentWeight = Math.min(1, (intelligence - 1) / 14);

  // Pequeno ruído aleatório — até mesmo o mais inteligente não é perfeito
  const noiseFactor = Math.max(0, (10 - intelligence) * 0.12);

  const scored = availableArenas.map(arenaCode => {
    const selfVal     = selfScore(mentality, arenaCode);
    const opponentVal = opponentPainScore(opMentality, arenaCode);
    const combined    = selfVal * (1 - opponentWeight) + opponentVal * opponentWeight;
    const noise       = (Math.random() - 0.5) * noiseFactor * 4;
    return { arenaCode, score: combined + noise };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored[0].arenaCode;
}

// ──────────────────────────────────────────────
//  FUNÇÃO PRINCIPAL EXPORTADA
// ──────────────────────────────────────────────
// Recebe dois players (objetos com .id, .mentality, .attributes)
// e o formato (MD3 ou MD5), retorna:
// {
//   arenas: ['ARENA1','ARENA2','ARENA3'...]   // sequência por round
//   picks: [                                  // log visual
//     { round: 1, picker: player, arena: 'CODE', reason: 'self' | 'opponent' | 'random' },
//     ...
//   ]
// }
export function resolveArenaPicks(higherRanked, lowerRanked, format = 'MD3') {
  const pool = [...ALL_ARENA_POOL];
  const picks = [];
  const arenas = [];

  // Utilitário: pick e remover do pool
  const doPick = (picker, opponent, reason) => {
    const remaining = pool.filter(a => !arenas.includes(a));
    const chosen = reason === 'RANDOM'
      ? remaining[Math.floor(Math.random() * remaining.length)]
      : aiPickArena(picker, opponent, remaining);
    arenas.push(chosen);
    picks.push({
      round: arenas.length,
      picker: reason === 'RANDOM' ? null : picker,
      arena: chosen,
      reason,
    });
    return chosen;
  };

  if (format === 'MD3') {
    // R1: melhor rankeado escolhe
    doPick(higherRanked, lowerRanked, 'PICK');
    // R2: pior rankeado escolhe
    doPick(lowerRanked, higherRanked, 'PICK');
    // R3: aleatório
    doPick(null, null, 'RANDOM');

  } else {
    // MD5
    // R1: melhor rankeado
    doPick(higherRanked, lowerRanked, 'PICK');
    // R2: pior rankeado
    doPick(lowerRanked, higherRanked, 'PICK');
    // R3: melhor rankeado novamente
    doPick(higherRanked, lowerRanked, 'PICK');
    // R4: pior rankeado (só joga se chegar no R4)
    doPick(lowerRanked, higherRanked, 'PICK');
    // R5: aleatório
    doPick(null, null, 'RANDOM');
  }

  return { arenas, picks };
}

// ─── Torneios elegíveis para pick de arena ───
export const PICK_ELIGIBLE_TIERS = new Set(['PREMIER', 'KINGS_COURT']);

export function isTournamentEligibleForPick(tournament) {
  return PICK_ELIGIBLE_TIERS.has(tournament?.tier);
}
