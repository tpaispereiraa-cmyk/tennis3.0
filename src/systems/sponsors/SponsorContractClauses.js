/**
 * SponsorContractClauses.js
 *
 * Anatomia comercial dos contratos: cláusulas, bônus, obrigações, royalties
 * e riscos que dão textura real ao acordo.
 */

function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }

function roundMoney(v) { return Math.round(v / 1000) * 1000; }

function pct(amount, ratio, min = 25_000, max = 2_500_000) {
  return roundMoney(clamp(amount * ratio, min, max));
}

const CATEGORY_OBLIGATIONS = {
  RACKET: ['usar raquete da marca em partidas oficiais', 'participar de teste anual de produto'],
  APPAREL: ['usar uniforme da marca em jogos e treinos públicos', 'participar de ensaio de coleção anual'],
  LUXURY: ['comparecer a evento premium da marca', 'manter dress code em ativações oficiais'],
  FINANCE: ['participar de campanha institucional', 'gravar peça sobre planejamento de carreira'],
  TECH: ['participar de lançamento de produto', 'produzir conteúdo digital com tecnologia da marca'],
  ENERGY: ['participar de sessão de treino filmada', 'usar produto em conteúdo de bastidor'],
  AUTOMOTIVE: ['participar de campanha de performance', 'comparecer a evento de lançamento automotivo'],
  AIRLINE: ['aparecer em campanha global de viagem', 'realizar conteúdo de bastidor em deslocamentos'],
  RETAIL: ['participar de campanha promocional', 'realizar ação com fãs em loja ou plataforma'],
  MEDIA: ['ceder bastidores para conteúdo especial', 'participar de entrevista de campanha'],
  CONSUMER: ['participar de campanha de massa', 'gravar peças para TV e redes sociais'],
};

const CATEGORY_EXCLUSIVITY = {
  RACKET: 'exclusividade em equipamento de jogo',
  APPAREL: 'exclusividade em vestuário esportivo',
  LUXURY: 'exclusividade em luxo e acessórios premium',
  FINANCE: 'exclusividade em serviços financeiros',
  TECH: 'exclusividade em tecnologia de consumo',
  ENERGY: 'exclusividade em energia e nutrição',
  AUTOMOTIVE: 'exclusividade automotiva',
  AIRLINE: 'exclusividade em companhia aérea',
  RETAIL: 'exclusividade em varejo esportivo',
  MEDIA: 'exclusividade em mídia e entretenimento esportivo',
  CONSUMER: 'exclusividade em consumo de massa',
};

const PERFORMANCE_TRIGGERS = [
  ['GRAND_SLAM_TITLE', 'Título de Grand Slam', 0.12],
  ['NUMBER_ONE', 'Chegada ao número 1', 0.16],
  ['MASTERS_TITLE', 'Título Masters 1000', 0.06],
  ['TOP_10', 'Entrada ou permanência no top 10', 0.035],
  ['FINALS_TITLE', 'Título do Finals', 0.08],
  ['CLASH_SLAM_TITLE', 'Título do Clash Slam', 0.10],
];

function buildPerformanceBonuses(annualFee, contractType, sponsor, player) {
  const rank = player?.rankPosition ?? 999;
  const elite = sponsor?.tier === 'ELITE';
  const selected = PERFORMANCE_TRIGGERS.filter(([key]) => {
    if (contractType === 'PERFORMANCE') return true;
    if (contractType === 'AMBASSADOR') return key !== 'TOP_10';
    if (elite && rank <= 20) return ['GRAND_SLAM_TITLE', 'NUMBER_ONE', 'MASTERS_TITLE'].includes(key);
    return false;
  });

  return Object.fromEntries(selected.map(([key, label, ratio]) => [
    key,
    { label, amount: pct(annualFee, ratio, 40_000, elite ? 4_000_000 : 1_500_000), awarded: false },
  ]));
}

function buildProspectLadder(annualFee) {
  return {
    TOP_50: { label: 'Top 50', multiplier: 2.0, unlocked: false, projectedFee: roundMoney(annualFee * 2.0) },
    TOP_10: { label: 'Top 10', multiplier: 3.0, unlocked: false, projectedFee: roundMoney(annualFee * 3.0) },
    TOP_5: { label: 'Top 5', multiplier: 4.0, unlocked: false, projectedFee: roundMoney(annualFee * 4.0) },
  };
}

function buildRoyalties(annualFee, contractType, sponsor) {
  if (!['AMBASSADOR', 'IMAGE'].includes(contractType) && sponsor?.tier !== 'ELITE') return null;
  const base = contractType === 'AMBASSADOR' ? 0.045 : 0.025;
  return {
    ratePct: +(base * 100).toFixed(1),
    projectedAnnual: pct(annualFee, base, 30_000, 1_500_000),
    productLine: sponsor?.category === 'RACKET'
      ? 'linha assinatura de raquetes'
      : sponsor?.category === 'APPAREL'
      ? 'coleção assinatura'
      : 'campanha com participação em receita',
  };
}

export function buildContractClauses({ sponsor, player, contractType, annualFee, duration, campaignConcept }) {
  const obligations = CATEGORY_OBLIGATIONS[sponsor?.category] ?? CATEGORY_OBLIGATIONS.CONSUMER;
  const appearances = sponsor?.tier === 'ELITE' ? 5 : sponsor?.tier === 'PREMIUM' ? 3 : sponsor?.tier === 'MID' ? 2 : 1;
  const moralityStrictness = sponsor?.conservativeImage ? 'STRICT' : sponsor?.riskTolerance >= 0.65 ? 'LOOSE' : 'STANDARD';
  const globalCampaign = contractType === 'AMBASSADOR' || sponsor?.tier === 'ELITE';
  const categoryExclusivity = ['AMBASSADOR', 'EQUIPMENT', 'IMAGE'].includes(contractType) || sponsor?.tier === 'ELITE';
  const performanceBonuses = buildPerformanceBonuses(annualFee, contractType, sponsor, player);
  const prospectLadder = contractType === 'PROSPECT_DEAL' ? buildProspectLadder(annualFee) : null;
  const royalties = buildRoyalties(annualFee, contractType, sponsor);

  return {
    version: 1,
    headline: campaignConcept?.hook ?? 'campanha de performance',
    obligations: obligations.slice(0, contractType === 'BASE' ? 1 : 2),
    appearancesPerYear: appearances,
    exclusivity: {
      category: sponsor?.category ?? null,
      enabled: categoryExclusivity,
      label: categoryExclusivity ? (CATEGORY_EXCLUSIVITY[sponsor?.category] ?? 'exclusividade de categoria') : 'sem exclusividade ampla',
    },
    morality: {
      strictness: moralityStrictness,
      terminationRisk: moralityStrictness === 'STRICT' ? 0.75 : moralityStrictness === 'LOOSE' ? 0.25 : 0.45,
      note: moralityStrictness === 'STRICT'
        ? 'cláusula de imagem rígida'
        : moralityStrictness === 'LOOSE'
        ? 'marca aceita ruído se houver retorno cultural'
        : 'cláusula de imagem padrão',
    },
    performanceBonuses,
    prospectLadder,
    royalties,
    activation: {
      globalCampaign,
      campaignScope: campaignConcept?.scope ?? (globalCampaign ? 'campanha global' : 'campanha regional'),
      marketLine: campaignConcept?.marketLine ?? null,
      deliverables: globalCampaign
        ? ['filme principal', 'peças sociais', 'ativação em grande torneio']
        : ['conteúdo social', 'foto oficial', 'ação promocional'],
    },
    renegotiation: {
      afterGrandSlam: annualFee >= 1_000_000,
      afterTop5: true,
      finalYearOption: duration >= 3,
    },
  };
}

export function summarizeContractClauses(clauses) {
  if (!clauses) return null;
  const pieces = [];
  if (clauses.exclusivity?.enabled) pieces.push(clauses.exclusivity.label);
  if (clauses.performanceBonuses && Object.keys(clauses.performanceBonuses).length) pieces.push('bônus esportivos');
  if (clauses.prospectLadder) pieces.push('escada de prospect');
  if (clauses.royalties) pieces.push(`${clauses.royalties.ratePct}% royalties`);
  pieces.push(`${clauses.appearancesPerYear ?? 0} ativações/ano`);
  return pieces.join(' · ');
}

export function flattenBonusAmounts(clauses, fallback = null) {
  if (!clauses?.performanceBonuses) return fallback;
  return Object.fromEntries(Object.entries(clauses.performanceBonuses).map(([key, bonus]) => [key, bonus.amount]));
}
