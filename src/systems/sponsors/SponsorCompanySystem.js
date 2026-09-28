/**
 * Fundação corporativa do mercado de patrocínios.
 * Mantém uma empresa persistente por marca, separada dos contratos: orçamento,
 * conselho, diretoria e memória financeira sobrevivem a cada temporada.
 */
import { SPONSOR_CATALOG } from './SponsorProfiles.js';

const VERSION = 1;
const FIRST = ['Helena','Matteo','Aisha','Camille','Ravi','Sofia','Kenji','Maya','Thiago','Elena','Noah','Amara'];
const LAST = ['Moretti','Santos','Klein','Okafor','Dubois','Tanaka','Almeida','Hughes','Costa','Weber','Singh','Martins'];
const STRATEGY_BY_PERSONALITY = {
  CHAMPION_HUNTER: { id:'CHAMPION_CAPTURE', label:'Captura de campeões', thesis:'Concentrar verba em atletas que já decidem os maiores palcos.', target:'grandes craques', renewalBias:'performance' },
  UNDERDOG_PATRON: { id:'TALENT_INCUBATOR', label:'Incubadora de talentos', thesis:'Assinar cedo, oferecer escada e crescer junto com a promessa.', target:'grandes promessas', renewalBias:'potencial' },
  HERITAGE: { id:'LEGACY_CURATOR', label:'Curadoria de legado', thesis:'Construir associações duradouras com elegância e reputação.', target:'ícones consistentes', renewalBias:'imagem' },
  INNOVATION: { id:'FUTURE_BET', label:'Aposta no futuro', thesis:'Assumir risco por atletas jovens, originais e mercados novos.', target:'disruptores', renewalBias:'potencial' },
  MASS_APPEAL: { id:'REACH_ENGINE', label:'Alcance de massa', thesis:'Ganhar atenção em mercados amplos e momentos culturais.', target:'estrelas populares', renewalBias:'audiência' },
  REBEL_SEEKER: { id:'CULTURE_SHOCK', label:'Choque cultural', thesis:'Transformar personalidade e conversa pública em relevância.', target:'atletas magnéticos', renewalBias:'ruído positivo' },
  SURFACE_EXPERT: { id:'TECHNICAL_AUTHORITY', label:'Autoridade técnica', thesis:'Dominar uma identidade de jogo e falar com o fã especialista.', target:'especialistas', renewalBias:'compatibilidade' },
  GLOBAL_REACH: { id:'MARKET_EXPANSION', label:'Expansão global', thesis:'Abrir mercados com atletas que cruzam fronteiras culturais.', target:'pontes de mercado', renewalBias:'território' },
};

function hash(value='') { let n=2166136261; for (const char of String(value)) { n ^= char.charCodeAt(0); n=Math.imul(n,16777619); } return n >>> 0; }
function pick(seed, values, salt) { return values[hash(`${seed}:${salt}`) % values.length]; }
function executive(sponsorId, role) {
  return {
    id: `${sponsorId}:${role.toLowerCase()}`,
    name: `${pick(sponsorId,FIRST,role)} ${pick(sponsorId,LAST,`${role}:last`)}`,
    role,
    tenureSeasons: 0,
    confidence: 58 + (hash(`${sponsorId}:${role}:confidence`) % 32),
  };
}

export function buildSponsorCompany(sponsor, year=2025) {
  const annual = sponsor.budget ?? 1_000_000;
  const strategy = STRATEGY_BY_PERSONALITY[sponsor.personality] ?? STRATEGY_BY_PERSONALITY.MASS_APPEAL;
  return {
    version: VERSION,
    foundedAt: year,
    fiscalYear: year,
    annualMarketingBudget: annual,
    monthlyMarketingEnvelope: Math.round(annual / 12),
    budgetCommitted: 0,
    budgetAvailable: annual,
    marketingReserve: Math.round(annual * .18),
    estimatedPortfolioReturn: 0,
    marketReputation: 50,
    boardConfidence: 62,
    boardPressure: 18,
    strategy: { ...strategy, preferredMarkets:[...(sponsor.preferredNationality ?? [])], lastReviewAt:{ year, month:1 } },
    executives: {
      ceo: executive(sponsor.id, 'CEO'),
      marketingDirector: executive(sponsor.id, 'MARKETING'),
      sportsDirector: executive(sponsor.id, 'SPORTS'),
      regionalDirector: executive(sponsor.id, 'REGIONAL'),
    },
    investmentLedger: [],
    quarterlyReports: [],
    decisionHistory: [],
  };
}

/** Migra qualquer pool antigo, inclusive se novas marcas forem adicionadas ao catálogo. */
export function ensureSponsorPoolFoundation(pool, year=2025) {
  const next = pool ? { ...pool, states: { ...(pool.states ?? {}) }, contractArchive: [...(pool.contractArchive ?? [])] } : { states:{}, contractArchive:[] };
  for (const sponsor of SPONSOR_CATALOG) {
    const state = { ...(next.states[sponsor.id] ?? { sponsorId:sponsor.id, contracts:[], budgetUsed:0, urgency:1, lastSeasonActive:null, historyLog:[] }) };
    const committed = (state.contracts ?? []).reduce((sum, contract) => sum + (contract.annualFee ?? 0), 0);
    const company = { ...buildSponsorCompany(sponsor, year), ...(state.company ?? {}) };
    company.version = VERSION;
    company.fiscalYear = company.fiscalYear ?? year;
    company.annualMarketingBudget = company.annualMarketingBudget ?? sponsor.budget ?? 0;
    company.monthlyMarketingEnvelope = Math.round(company.annualMarketingBudget / 12);
    company.budgetCommitted = committed;
    company.budgetAvailable = Math.max(0, company.annualMarketingBudget - committed);
    company.executives = { ...buildSponsorCompany(sponsor, year).executives, ...(company.executives ?? {}) };
    company.investmentLedger = Array.isArray(company.investmentLedger) ? company.investmentLedger.slice(-96) : [];
    company.quarterlyReports = Array.isArray(company.quarterlyReports) ? company.quarterlyReports.slice(-24) : [];
    company.decisionHistory = Array.isArray(company.decisionHistory) ? company.decisionHistory.slice(-80) : [];
    next.states[sponsor.id] = { ...state, sponsorId:sponsor.id, contracts:[...(state.contracts ?? [])], budgetUsed:committed, company };
  }
  return next;
}

export function getSponsorCompanyProfile(pool, sponsorId) {
  return pool?.states?.[sponsorId]?.company ?? null;
}

export function getSponsorCompanyStrategy(pool, sponsorId) {
  return getSponsorCompanyProfile(pool, sponsorId)?.strategy ?? null;
}

export function recordCompanyDecision(pool, sponsorId, decision) {
  const state = pool?.states?.[sponsorId];
  if (!state?.company) return pool;
  const company = { ...state.company, decisionHistory:[...(state.company.decisionHistory ?? []), decision].slice(-80) };
  return { ...pool, states:{ ...pool.states, [sponsorId]:{ ...state, company } } };
}
