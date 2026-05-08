// ============================================
// ACHIEVEMENTENGINE.JS — Sistema de Badges
// ============================================
// Bronze / Prata / Ouro / Lendário / Mítico
// Categorias: Títulos · Ranking · Performance · Estilo · Signature · Carreira
// ============================================

import { TEAMS } from './data.js';

export const TIER_ORDER = ['BRONZE', 'SILVER', 'GOLD', 'LEGENDARY', 'MYTHIC'];

export const TIER_COLORS = {
  BRONZE:    '#cd7f32',
  SILVER:    '#c0c0c0',
  GOLD:      '#ffd700',
  LEGENDARY: '#a855f7',
  MYTHIC:    '#f43f5e',
};

export const TIER_LABELS_PT = {
  BRONZE:    'Bronze',
  SILVER:    'Prata',
  GOLD:      'Ouro',
  LEGENDARY: 'Lendário',
  MYTHIC:    'Mítico',
};

// ─── Helpers seguros ───
function hist(playerId, universe) {
  return universe.playerHistories?.get(playerId) || {};
}
function sigStats(playerId, universe) {
  return universe.signatureBlades?.get(playerId)?.stats || {};
}
function yearsActive(playerId, universe) {
  const player = TEAMS[playerId];
  if (!player) return 0;
  return Math.max(0, (universe.currentYear || 2024) - (player.debutYear || universe.currentYear || 2024));
}
function winRate(wins, total) {
  if (!total || total < 80) return 0;
  return (wins / total) * 100;
}
function roundWinRate(rw, rl) {
  const total = (rw || 0) + (rl || 0);
  if (total < 100) return 0;
  return ((rw || 0) / total) * 100;
}
function titleBreadth(h) {
  const t = h.titles || {};
  return [t.kingsCourtTitles, t.premierTitles, t.mastersTitles, t.challengerTitles, t.redemptionTitles].filter(n => n > 0).length;
}
function kingOfFieldsMin(h) {
  const t = h.titles || {};
  return Math.min(t.kingsCourtTitles || 0, t.premierTitles || 0, t.mastersTitles || 0, t.challengerTitles || 0);
}
function seasonsWithTitle(h) {
  const list = h.titles?.detailedList || [];
  return new Set(list.map(t => t.year)).size;
}

// ============================================================
//  DEFINIÇÕES
// ============================================================
function defineAchievements() {
  return [

    // ══════════════════════════════════════════
    //  TÍTULOS
    // ══════════════════════════════════════════
    {
      id: 'CHAMPION_BLOOD', name: 'Sangue de Campeão', icon: '🏆', category: 'TÍTULOS',
      description: 'Acumule títulos ao longo da carreira',
      tiers: {
        BRONZE:    { label: 'Competidor',   description: '3 títulos conquistados' },
        SILVER:    { label: 'Campeão',      description: '15 títulos conquistados' },
        GOLD:      { label: 'Consagrado',   description: '35 títulos conquistados' },
        LEGENDARY: { label: 'Lendário',     description: '60 títulos conquistados' },
        MYTHIC:    { label: 'Imortal',      description: '100 títulos — GOAT absoluto' },
      },
      thresholds: { BRONZE: 3, SILVER: 15, GOLD: 35, LEGENDARY: 60, MYTHIC: 100 },
      getValue: (id, u) => hist(id, u).titles?.total || 0,
    },

    {
      id: 'KINGS_COURT_ROYALTY', name: 'Realeza da Corte', icon: '👑', category: 'TÍTULOS',
      description: 'Domine os Kings Court Tournaments',
      tiers: {
        BRONZE:    { label: 'Aspirante', description: '1 título Kings Court' },
        SILVER:    { label: 'Nobre',     description: '4 títulos Kings Court' },
        GOLD:      { label: 'Rei',       description: '8 títulos Kings Court' },
        LEGENDARY: { label: 'Monarca',   description: '13 títulos Kings Court' },
        MYTHIC:    { label: 'Deus-Rei',  description: '20+ títulos Kings Court — domínio eterno' },
      },
      thresholds: { BRONZE: 1, SILVER: 4, GOLD: 8, LEGENDARY: 13, MYTHIC: 20 },
      getValue: (id, u) => hist(id, u).titles?.kingsCourtTitles || 0,
    },

    {
      id: 'PREMIER_ELITE', name: 'Elite Premier', icon: '⭐', category: 'TÍTULOS',
      description: 'Domine os torneios Premier',
      tiers: {
        BRONZE:    { label: 'Estreante',    description: '1 título Premier' },
        SILVER:    { label: 'Estrela',      description: '4 títulos Premier' },
        GOLD:      { label: 'Superestrela', description: '8 títulos Premier' },
        LEGENDARY: { label: 'Ícone',        description: '13 títulos Premier' },
        MYTHIC:    { label: 'Fenômeno',     description: '20+ títulos Premier — incomparável' },
      },
      thresholds: { BRONZE: 1, SILVER: 4, GOLD: 8, LEGENDARY: 13, MYTHIC: 20 },
      getValue: (id, u) => hist(id, u).titles?.premierTitles || 0,
    },

    {
      id: 'MASTERS_GLORY', name: 'Glória dos Masters', icon: '🎖️', category: 'TÍTULOS',
      description: 'Conquiste os torneios Masters',
      tiers: {
        BRONZE:    { label: 'Aprendiz',      description: '1 título Masters' },
        SILVER:    { label: 'Mestre',        description: '4 títulos Masters' },
        GOLD:      { label: 'Grão-Mestre',   description: '8 títulos Masters' },
        LEGENDARY: { label: 'Arquimestre',   description: '13 títulos Masters' },
        MYTHIC:    { label: 'Transcendente', description: '20+ títulos Masters — nunca visto' },
      },
      thresholds: { BRONZE: 1, SILVER: 4, GOLD: 8, LEGENDARY: 13, MYTHIC: 20 },
      getValue: (id, u) => hist(id, u).titles?.mastersTitles || 0,
    },

    {
      id: 'CHALLENGER_SPIRIT', name: 'Espírito Challenger', icon: '⚡', category: 'TÍTULOS',
      description: 'Conquiste os torneios Challenger',
      tiers: {
        BRONZE:    { label: 'Desafiante',   description: '2 títulos Challenger' },
        SILVER:    { label: 'Guerreiro',    description: '8 títulos Challenger' },
        GOLD:      { label: 'Dominador',    description: '18 títulos Challenger' },
        LEGENDARY: { label: 'Conquistador', description: '30 títulos Challenger' },
        MYTHIC:    { label: 'Flagelo',      description: '50+ títulos Challenger — indomável' },
      },
      thresholds: { BRONZE: 2, SILVER: 8, GOLD: 18, LEGENDARY: 30, MYTHIC: 50 },
      getValue: (id, u) => hist(id, u).titles?.challengerTitles || 0,
    },

    {
      id: 'KING_OF_FIELDS', name: 'King of the Fields', icon: '🌐', category: 'TÍTULOS',
      description: 'Vença em todas as categorias de torneio',
      tiers: {
        BRONZE:    { label: 'Explorador',   description: '1 título em KC, Premier, Masters e Challenger' },
        SILVER:    { label: 'Dominador',    description: '2 títulos em cada categoria' },
        GOLD:      { label: 'Imperador',    description: '4 títulos em cada categoria' },
        LEGENDARY: { label: 'Soberano',     description: '7 títulos em cada categoria' },
        MYTHIC:    { label: 'Omnireinado',  description: '12 títulos em cada categoria — domínio absoluto' },
      },
      thresholds: { BRONZE: 1, SILVER: 2, GOLD: 4, LEGENDARY: 7, MYTHIC: 12 },
      getValue: (id, u) => kingOfFieldsMin(hist(id, u)),
    },

    {
      id: 'COMPLETIONIST', name: 'Completista', icon: '🌈', category: 'TÍTULOS',
      description: 'Vença títulos em categorias diferentes',
      tiers: {
        BRONZE:    { label: 'Versátil',     description: '2 categorias de título conquistadas' },
        SILVER:    { label: 'Polivalente',  description: '3 categorias de título conquistadas' },
        GOLD:      { label: 'Completo',     description: 'Todas as 5 categorias conquistadas' },
        LEGENDARY: { label: 'Cartelão',     description: '5 categorias com 3+ títulos cada' },
        MYTHIC:    { label: 'Enciclopédia', description: '5 categorias com 6+ títulos cada — carreira completa' },
      },
      thresholds: { BRONZE: 2, SILVER: 3, GOLD: 5, LEGENDARY: 15, MYTHIC: 30 },
      getValue: (id, u) => {
        const h = hist(id, u);
        const t = h.titles || {};
        const cats = [t.kingsCourtTitles||0, t.premierTitles||0, t.mastersTitles||0, t.challengerTitles||0, t.redemptionTitles||0];
        const breadth   = cats.filter(n => n > 0).length;
        const legendary = cats.filter(n => n >= 3).length;
        const mythic    = cats.filter(n => n >= 6).length;
        if (mythic    === 5) return 30;
        if (legendary === 5) return 15;
        return breadth;
      },
    },

    // ══════════════════════════════════════════
    //  RANKING
    // ══════════════════════════════════════════
    {
      id: 'IRON_THRONE', name: 'Trono de Ferro', icon: '🔱', category: 'RANKING',
      description: 'Mantenha-se como #1 por meses consecutivos',
      tiers: {
        BRONZE:    { label: 'Soberano',   description: '4 meses consecutivos como #1' },
        SILVER:    { label: 'Imperador',  description: '8 meses consecutivos como #1' },
        GOLD:      { label: 'Eterno',     description: '15 meses consecutivos como #1' },
        LEGENDARY: { label: 'Imovível',   description: '24 meses consecutivos como #1' },
        MYTHIC:    { label: 'Absoluto',   description: '36+ meses consecutivos — 3 anos ininterruptos no topo' },
      },
      thresholds: { BRONZE: 4, SILVER: 8, GOLD: 15, LEGENDARY: 24, MYTHIC: 36 },
      getValue: (id, u) => hist(id, u).longestTopStreak || 0,
    },

    {
      id: 'RANKING_TITAN', name: 'Titã do Ranking', icon: '📅', category: 'RANKING',
      description: 'Some meses no topo do ranking',
      tiers: {
        BRONZE:    { label: 'Presença',     description: '8 meses no topo (carreira)' },
        SILVER:    { label: 'Dominante',    description: '24 meses no topo (carreira)' },
        GOLD:      { label: 'Monarca',      description: '48 meses no topo (carreira)' },
        LEGENDARY: { label: 'Onipresente',  description: '72 meses no topo (carreira)' },
        MYTHIC:    { label: 'Eterno',       description: '120+ meses no topo — 10 anos dominando' },
      },
      thresholds: { BRONZE: 8, SILVER: 24, GOLD: 48, LEGENDARY: 72, MYTHIC: 120 },
      getValue: (id, u) => hist(id, u).monthsAtTop || 0,
    },

    // ══════════════════════════════════════════
    //  PERFORMANCE
    // ══════════════════════════════════════════
    {
      id: 'WIN_MACHINE', name: 'Máquina de Vitórias', icon: '🥊', category: 'PERFORMANCE',
      description: 'Acumule vitórias na carreira',
      tiers: {
        BRONZE:    { label: 'Determinado', description: '50 vitórias na carreira' },
        SILVER:    { label: 'Implacável',  description: '200 vitórias na carreira' },
        GOLD:      { label: 'Invencível',  description: '500 vitórias na carreira' },
        LEGENDARY: { label: 'Máquina',     description: '800 vitórias na carreira' },
        MYTHIC:    { label: 'Inumano',     description: '1200+ vitórias — volume histórico' },
      },
      thresholds: { BRONZE: 50, SILVER: 200, GOLD: 500, LEGENDARY: 800, MYTHIC: 1200 },
      getValue: (id, u) => hist(id, u).wins || 0,
    },

    {
      id: 'PRECISION', name: 'Precisão Cirúrgica', icon: '📈', category: 'PERFORMANCE',
      description: 'Mantenha alto win rate (mín. 80 partidas)',
      tiers: {
        BRONZE:    { label: 'Consistente',    description: '57%+ de win rate' },
        SILVER:    { label: 'Afiado',         description: '65%+ de win rate' },
        GOLD:      { label: 'Perfeicionista', description: '73%+ de win rate' },
        LEGENDARY: { label: 'Imaculado',      description: '80%+ de win rate' },
        MYTHIC:    { label: 'Sobrenatural',   description: '87%+ de win rate — quase inatacável' },
      },
      thresholds: { BRONZE: 57, SILVER: 65, GOLD: 73, LEGENDARY: 80, MYTHIC: 87 },
      getValue: (id, u) => { const h = hist(id, u); return winRate(h.wins || 0, h.totalMatches || 0); },
    },

    {
      id: 'UNSTOPPABLE', name: 'Imparável', icon: '🔥', category: 'PERFORMANCE',
      description: 'Construa longas sequências de vitórias',
      tiers: {
        BRONZE:    { label: 'Em Chamas',   description: '7 vitórias consecutivas' },
        SILVER:    { label: 'Furacão',     description: '15 vitórias consecutivas' },
        GOLD:      { label: 'Fenômeno',    description: '25 vitórias consecutivas' },
        LEGENDARY: { label: 'Catástrofe',  description: '40 vitórias consecutivas' },
        MYTHIC:    { label: 'Inevitável',  description: '60+ vitórias consecutivas — sequência histórica' },
      },
      thresholds: { BRONZE: 7, SILVER: 15, GOLD: 25, LEGENDARY: 40, MYTHIC: 60 },
      getValue: (id, u) => hist(id, u).bestWinStreak || 0,
    },

    {
      id: 'ROUND_HUNTER', name: 'Caçador de Rounds', icon: '🎯', category: 'PERFORMANCE',
      description: 'Vença rounds disputados',
      tiers: {
        BRONZE:    { label: 'Focado',      description: '100 rounds vencidos' },
        SILVER:    { label: 'Sniper',      description: '500 rounds vencidos' },
        GOLD:      { label: 'Aniquilador', description: '1000 rounds vencidos' },
        LEGENDARY: { label: 'Devastador',  description: '1800 rounds vencidos' },
        MYTHIC:    { label: 'Caçador',     description: '3000+ rounds — memória do circuito' },
      },
      thresholds: { BRONZE: 100, SILVER: 500, GOLD: 1000, LEGENDARY: 1800, MYTHIC: 3000 },
      getValue: (id, u) => hist(id, u).roundWins || 0,
    },

    {
      id: 'ROUND_ACE', name: 'Ás dos Rounds', icon: '🎲', category: 'PERFORMANCE',
      description: 'Domine os rounds individualmente (mín. 100 rounds)',
      tiers: {
        BRONZE:    { label: 'Preciso',    description: '62%+ de round win rate' },
        SILVER:    { label: 'Dominante',  description: '70%+ de round win rate' },
        GOLD:      { label: 'Supremo',    description: '78%+ de round win rate' },
        LEGENDARY: { label: 'Cirúrgico',  description: '85%+ de round win rate' },
        MYTHIC:    { label: 'Impecável',  description: '91%+ de round win rate — próximo da perfeição' },
      },
      thresholds: { BRONZE: 62, SILVER: 70, GOLD: 78, LEGENDARY: 85, MYTHIC: 91 },
      getValue: (id, u) => { const h = hist(id, u); return roundWinRate(h.roundWins || 0, h.roundLosses || 0); },
    },

    // ══════════════════════════════════════════
    //  ESTILO
    // ══════════════════════════════════════════
    {
      id: 'BURST_KING', name: 'Rei do Burst', icon: '💥', category: 'ESTILO',
      description: 'Destrua adversários com burst finishes',
      tiers: {
        BRONZE:    { label: 'Explosivo',   description: '20 vitórias por burst' },
        SILVER:    { label: 'Demolidor',   description: '80 vitórias por burst' },
        GOLD:      { label: 'Destruidor',  description: '200 vitórias por burst' },
        LEGENDARY: { label: 'Obliterador', description: '400 vitórias por burst' },
        MYTHIC:    { label: 'Armageddon',  description: '700+ vitórias por burst — terror puro' },
      },
      thresholds: { BRONZE: 20, SILVER: 80, GOLD: 200, LEGENDARY: 400, MYTHIC: 700 },
      getValue: (id, u) => hist(id, u).winsByBurst || 0,
    },

    {
      id: 'SPIN_WIZARD', name: 'Feiticeiro do Spin', icon: '🌀', category: 'ESTILO',
      description: 'Vença por spin out com elegância',
      tiers: {
        BRONZE:    { label: 'Girador',       description: '20 vitórias por spin out' },
        SILVER:    { label: 'Turbilhão',     description: '80 vitórias por spin out' },
        GOLD:      { label: 'Vórtex',        description: '200 vitórias por spin out' },
        LEGENDARY: { label: 'Ciclone',       description: '400 vitórias por spin out' },
        MYTHIC:    { label: 'Singularidade', description: '700+ vitórias por spin out — rotação perpétua' },
      },
      thresholds: { BRONZE: 20, SILVER: 80, GOLD: 200, LEGENDARY: 400, MYTHIC: 700 },
      getValue: (id, u) => hist(id, u).winsBySpin || 0,
    },

    {
      id: 'RING_MASTER', name: 'Mestre do Ring', icon: '💨', category: 'ESTILO',
      description: 'Lance adversários para fora da arena',
      tiers: {
        BRONZE:    { label: 'Lançador',          description: '20 vitórias por ring out' },
        SILVER:    { label: 'Ejetor',            description: '80 vitórias por ring out' },
        GOLD:      { label: 'Exterminador',      description: '200 vitórias por ring out' },
        LEGENDARY: { label: 'Banidor',           description: '400 vitórias por ring out' },
        MYTHIC:    { label: 'Força da Natureza', description: '700+ vitórias por ring out — expulsa tudo' },
      },
      thresholds: { BRONZE: 20, SILVER: 80, GOLD: 200, LEGENDARY: 400, MYTHIC: 700 },
      getValue: (id, u) => hist(id, u).winsByRingOut || 0,
    },

    // ══════════════════════════════════════════
    //  SIGNATURE BLADE
    // ══════════════════════════════════════════
    {
      id: 'BLADE_BOND', name: 'Vínculo com a Blade', icon: '🔩', category: 'SIGNATURE',
      description: 'Dispute rounds com sua Signature Blade',
      tiers: {
        BRONZE:    { label: 'Iniciado',          description: '50 rounds com a Signature Blade' },
        SILVER:    { label: 'Companheiro',       description: '200 rounds com a Signature Blade' },
        GOLD:      { label: 'Um com a Blade',    description: '500 rounds com a Signature Blade' },
        LEGENDARY: { label: 'Extensão do Ser',   description: '900 rounds com a Signature Blade' },
        MYTHIC:    { label: 'Fusão Absoluta',    description: '1500+ rounds — a blade é parte da alma' },
      },
      thresholds: { BRONZE: 50, SILVER: 200, GOLD: 500, LEGENDARY: 900, MYTHIC: 1500 },
      getValue: (id, u) => sigStats(id, u).totalRounds || 0,
    },

    {
      id: 'BLADE_MASTER', name: 'Mestre da Blade', icon: '⚔️', category: 'SIGNATURE',
      description: 'Vença rounds com sua Signature Blade',
      tiers: {
        BRONZE:    { label: 'Portador',      description: '25 vitórias com a Signature Blade' },
        SILVER:    { label: 'Wielder',       description: '100 vitórias com a Signature Blade' },
        GOLD:      { label: 'Lendário',      description: '280 vitórias com a Signature Blade' },
        LEGENDARY: { label: 'Avatar',        description: '500 vitórias com a Signature Blade' },
        MYTHIC:    { label: 'A Blade Vive',  description: '900+ vitórias — a blade ganhou consciência' },
      },
      thresholds: { BRONZE: 25, SILVER: 100, GOLD: 280, LEGENDARY: 500, MYTHIC: 900 },
      getValue: (id, u) => sigStats(id, u).totalWins || 0,
    },

    {
      id: 'BLADE_PRECISION', name: 'Precisão da Blade', icon: '🎯', category: 'SIGNATURE',
      description: 'Win rate com a Signature (mín. 40 rounds)',
      tiers: {
        BRONZE:    { label: 'Afinado',    description: '57%+ de win rate com a Signature' },
        SILVER:    { label: 'Calibrado',  description: '65%+ de win rate com a Signature' },
        GOLD:      { label: 'Implacável', description: '74%+ de win rate com a Signature' },
        LEGENDARY: { label: 'Certeiro',   description: '82%+ de win rate com a Signature' },
        MYTHIC:    { label: 'Infalível',  description: '90%+ de win rate — a blade nunca falha' },
      },
      thresholds: { BRONZE: 57, SILVER: 65, GOLD: 74, LEGENDARY: 82, MYTHIC: 90 },
      getValue: (id, u) => {
        const s = sigStats(id, u);
        if (!s.totalRounds || s.totalRounds < 40) return 0;
        return ((s.totalWins || 0) / s.totalRounds) * 100;
      },
    },

    {
      id: 'BURST_EXECUTIONER', name: 'Executor de Burst', icon: '🔥', category: 'SIGNATURE',
      description: 'Bursts com a Signature Blade',
      tiers: {
        BRONZE:    { label: 'Agressivo',    description: '10 bursts com a Signature Blade' },
        SILVER:    { label: 'Destruidor',   description: '45 bursts com a Signature Blade' },
        GOLD:      { label: 'Exterminador', description: '120 bursts com a Signature Blade' },
        LEGENDARY: { label: 'Executor',     description: '250 bursts com a Signature Blade' },
        MYTHIC:    { label: 'Fragmentador', description: '450+ bursts — deixa só pedaços' },
      },
      thresholds: { BRONZE: 10, SILVER: 45, GOLD: 120, LEGENDARY: 250, MYTHIC: 450 },
      getValue: (id, u) => sigStats(id, u).winsByBurst || 0,
    },

    {
      id: 'BLADE_NEMESIS', name: 'Nemesis das Signatures', icon: '🗡️', category: 'SIGNATURE',
      description: 'Vença outras Signature Blades',
      tiers: {
        BRONZE:    { label: 'Rival',         description: '10 vitórias contra Signatures' },
        SILVER:    { label: 'Caçador',       description: '40 vitórias contra Signatures' },
        GOLD:      { label: 'Apex Predator', description: '100 vitórias contra Signatures' },
        LEGENDARY: { label: 'Devorador',     description: '200 vitórias contra Signatures' },
        MYTHIC:    { label: 'Extirpador',    description: '400+ vitórias — nenhuma Signature sobrevive' },
      },
      thresholds: { BRONZE: 10, SILVER: 40, GOLD: 100, LEGENDARY: 200, MYTHIC: 400 },
      getValue: (id, u) => sigStats(id, u).winsAgainstSignatures || 0,
    },

    // ══════════════════════════════════════════
    //  CARREIRA
    // ══════════════════════════════════════════
    {
      id: 'VETERAN', name: 'Veterano', icon: '⏳', category: 'CARREIRA',
      description: 'Construa uma carreira longa e sólida',
      tiers: {
        BRONZE:    { label: 'Profissional', description: '3 anos de carreira' },
        SILVER:    { label: 'Veterano',     description: '6 anos de carreira' },
        GOLD:      { label: 'Lenda Viva',   description: '12 anos de carreira' },
        LEGENDARY: { label: 'Patriarca',    description: '16 anos de carreira' },
        MYTHIC:    { label: 'Eterno',       description: '20+ anos — uma geração inteira ativa' },
      },
      thresholds: { BRONZE: 3, SILVER: 6, GOLD: 12, LEGENDARY: 16, MYTHIC: 20 },
      getValue: (id, u) => yearsActive(id, u),
    },

    {
      id: 'IRON_BODY', name: 'Corpo de Aço', icon: '🛡️', category: 'CARREIRA',
      description: 'Dispute centenas de partidas',
      tiers: {
        BRONZE:    { label: 'Experiente',  description: '150 partidas disputadas' },
        SILVER:    { label: 'Resistente',  description: '450 partidas disputadas' },
        GOLD:      { label: 'Imortal',     description: '900 partidas disputadas' },
        LEGENDARY: { label: 'Titã',        description: '1400 partidas disputadas' },
        MYTHIC:    { label: 'Inquebrável', description: '2200+ partidas — corpo que não para' },
      },
      thresholds: { BRONZE: 150, SILVER: 450, GOLD: 900, LEGENDARY: 1400, MYTHIC: 2200 },
      getValue: (id, u) => hist(id, u).totalMatches || 0,
    },

    {
      id: 'SURVIVOR', name: 'Sobrevivente', icon: '🩹', category: 'CARREIRA',
      description: 'Supere sequências difíceis e volte a vencer',
      tiers: {
        BRONZE:    { label: 'Resiliente',  description: 'Seq. 5+ derrotas → 1 título posterior' },
        SILVER:    { label: 'Inabalável',  description: 'Seq. 8+ derrotas → 3 títulos posteriores' },
        GOLD:      { label: 'Renascido',   description: 'Seq. 10+ derrotas → 5 títulos posteriores' },
        LEGENDARY: { label: 'Fênix',       description: 'Seq. 12+ derrotas → 8 títulos posteriores' },
        MYTHIC:    { label: 'Ressurreto',  description: 'Seq. 15+ derrotas → 15 títulos — volta sobrenatural' },
      },
      thresholds: { BRONZE: 1, SILVER: 2, GOLD: 3, LEGENDARY: 4, MYTHIC: 5 },
      getValue: (id, u) => {
        const h = hist(id, u);
        const streak = h.bestLossStreak || 0;
        const titles = h.titles?.total || 0;
        if (streak >= 15 && titles >= 15) return 5;
        if (streak >= 12 && titles >= 8)  return 4;
        if (streak >= 10 && titles >= 5)  return 3;
        if (streak >= 8  && titles >= 3)  return 2;
        if (streak >= 5  && titles >= 1)  return 1;
        return 0;
      },
    },

    {
      id: 'IRON_WILL', name: 'Vontade de Ferro', icon: '💪', category: 'CARREIRA',
      description: 'Ganhe títulos em temporadas diferentes',
      tiers: {
        BRONZE:    { label: 'Dedicado',     description: 'Campeão em 2 temporadas diferentes' },
        SILVER:    { label: 'Persistente',  description: 'Campeão em 5 temporadas diferentes' },
        GOLD:      { label: 'Incansável',   description: 'Campeão em 9 temporadas diferentes' },
        LEGENDARY: { label: 'Imorredouro',  description: 'Campeão em 13 temporadas diferentes' },
        MYTHIC:    { label: 'Atemporal',    description: 'Campeão em 18+ temporadas — atravessou gerações' },
      },
      thresholds: { BRONZE: 2, SILVER: 5, GOLD: 9, LEGENDARY: 13, MYTHIC: 18 },
      getValue: (id, u) => seasonsWithTitle(hist(id, u)),
    },

  ];
}

// ============================================================
//  CLASSE PRINCIPAL
// ============================================================
export class AchievementEngine {
  constructor() {
    this.playerAchievements = new Map(); // playerId -> { achievementId: tier }
    this.unlockHistory      = [];
    this.definitions        = defineAchievements();
    console.log(`🏅 AchievementEngine: ${this.definitions.length} achievements definidos (5 tiers: Bronze→Prata→Ouro→Lendário→Mítico)`);
  }

  getPlayerTier(playerId, achievementId) {
    return this.playerAchievements.get(playerId)?.[achievementId] || null;
  }

  computeHighestTier(ach, playerId, universe) {
    try {
      const val = ach.getValue(playerId, universe);
      if (val >= ach.thresholds.MYTHIC)    return 'MYTHIC';
      if (val >= ach.thresholds.LEGENDARY) return 'LEGENDARY';
      if (val >= ach.thresholds.GOLD)      return 'GOLD';
      if (val >= ach.thresholds.SILVER)    return 'SILVER';
      if (val >= ach.thresholds.BRONZE)    return 'BRONZE';
    } catch (e) { /* silently ignore */ }
    return null;
  }

  checkAchievements(playerId, universe) {
    const playerTiers = this.playerAchievements.get(playerId) || {};
    const newUnlocks  = [];

    for (const ach of this.definitions) {
      const currentTier = playerTiers[ach.id] || null;
      const newTier     = this.computeHighestTier(ach, playerId, universe);
      if (!newTier) continue;

      const currentIdx = currentTier ? TIER_ORDER.indexOf(currentTier) : -1;
      const newIdx     = TIER_ORDER.indexOf(newTier);

      if (newIdx > currentIdx) {
        playerTiers[ach.id] = newTier;
        this.playerAchievements.set(playerId, playerTiers);
        newUnlocks.push({ achievementId: ach.id, tier: newTier, achievement: ach });
        this.unlockHistory.push({
          playerId, achievementId: ach.id, tier: newTier,
          year: universe.currentYear, month: universe.currentMonth,
        });
      }
    }
    return newUnlocks;
  }

  checkAllAchievements(universe) {
    TEAMS.forEach((_, id) => this.checkAchievements(id, universe));
  }

  getPlayerAchievements(playerId) {
    const tiers = this.playerAchievements.get(playerId) || {};
    return this.definitions
      .filter(ach => tiers[ach.id])
      .map(ach => ({ ...ach, unlockedTier: tiers[ach.id] }));
  }

  getPlayerAchievementsByCategory(playerId) {
    const groups = {};
    this.getPlayerAchievements(playerId).forEach(ach => {
      if (!groups[ach.category]) groups[ach.category] = [];
      groups[ach.category].push(ach);
    });
    return groups;
  }

  toJSON() {
    return {
      playerAchievements: Array.from(this.playerAchievements.entries()),
      unlockHistory: this.unlockHistory,
    };
  }

  fromJSON(data) {
    if (!data) return;
    this.playerAchievements = new Map(
      (data.playerAchievements || []).map(([k, v]) => [Number(k), v])
    );
    this.unlockHistory = data.unlockHistory || [];
  }

  // ─── Compat com chamadas existentes do UniverseManager ───
  isOneWinAway()      { return false; }
  getAchievement(id)  { return this.definitions.find(a => a.id === id); }
  getPlayerProgress() { return { current: 0, required: 1, percentage: 0 }; }
}
