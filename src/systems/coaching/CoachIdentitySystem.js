const FIRST_NAMES = ['Mateo','Luca','Rafael','Noah','Henrik','Tomas','Yuri','Kenji','Dario','Elias','Bruno','Nikolai','Aitor','Felix','Samir','Andre','Marco','Thiago'];
const LAST_NAMES = ['Valenti','Moreau','Keller','Sato','Rossi','Novak','Mendes','Kovacs','Silva','Berg','Ishikawa','Costa','Petrov','Larsen','Ferrer','Okafor'];
const NATIONS = ['ESP','FRA','ITA','BRA','ARG','JPN','GER','USA','AUS','SWE','SRB','CRO','DEN','NOR'];

export const COACH_METHODS = {
  FORMADOR: {
    id: 'FORMADOR', label: 'Formador', color: '#60C8FF',
    tacticalFocus: 'BUILD', developmentFocus: ['regularidade', 'controle', 'mentalidade'],
    desc: 'Transforma potencial cru em rotina profissional e clareza de treino.',
  },
  REFORMADOR: {
    id: 'REFORMADOR', label: 'Reformador', color: '#A78BFA',
    tacticalFocus: 'RESET', developmentFocus: ['mentalidade', 'leitura', 'controle'],
    desc: 'Reorganiza carreiras que perderam forma, confiança ou direção.',
  },
  AGRESSIVO: {
    id: 'AGRESSIVO', label: 'Agressivo', color: '#FF7043',
    tacticalFocus: 'PRESSURE', developmentFocus: ['potencia', 'saque', 'explosividade'],
    desc: 'Empurra o jogador para assumir pontos antes do rival respirar.',
  },
  CONTROLADOR: {
    id: 'CONTROLADOR', label: 'Controlador', color: '#E8C84A',
    tacticalFocus: 'CONTROL', developmentFocus: ['regularidade', 'leitura', 'resistencia'],
    desc: 'Prefere margem, padrão e repetição até o adversário ceder.',
  },
  MENTAL: {
    id: 'MENTAL', label: 'Mental', color: '#22C55E',
    tacticalFocus: 'CLUTCH', developmentFocus: ['mentalidade', 'regularidade', 'adaptacao'],
    desc: 'Trabalha pressão, derrotas duras e decisões sob tensão.',
  },
  ESPECIALISTA: {
    id: 'ESPECIALISTA', label: 'Especialista', color: '#4FC3F7',
    tacticalFocus: 'SURFACE', developmentFocus: ['saque', 'topspin', 'jogoDeRede'],
    desc: 'Tem método de nicho, geralmente ligado a superfície ou padrão específico.',
  },
};

export const COACH_ORIGINS = {
  EX_PLAYER: 'Ex-jogador',
  ANALYST: 'Analista',
  ACADEMY: 'Academia',
  TOUR_VETERAN: 'Veterano de circuito',
  REGIONAL: 'Especialista regional',
};

function hashString(value = '') {
  let h = 2166136261;
  for (let i = 0; i < String(value).length; i++) {
    h ^= String(value).charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function seededRandom(seed) {
  let t = hashString(seed);
  return () => {
    t += 0x6D2B79F5;
    let r = Math.imul(t ^ (t >>> 15), t | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function pick(rng, arr) {
  return arr[Math.floor(rng() * arr.length)] ?? arr[0];
}

function clamp(v, lo = 0, hi = 100) {
  return Math.max(lo, Math.min(hi, Math.round(v)));
}

export function inferCoachMethodForPlayer(player) {
  const age = player?.age ?? 25;
  const attrs = player?.attrs ?? {};
  const style = String(player?.styleId ?? '').toUpperCase();
  const rank = player?.rankPosition ?? 999;
  if (age <= 21 || rank > 130) return 'FORMADOR';
  if (age >= 31) return 'REFORMADOR';
  if ((attrs.mentalidade ?? attrs.mental ?? 55) < 56 || (attrs.regularidade ?? 55) < 54) return 'MENTAL';
  if (style.includes('AGG') || style.includes('POWER') || (attrs.potencia ?? 0) >= 78) return 'AGRESSIVO';
  if ((attrs.controle ?? 0) >= 76 || style.includes('GRINDER')) return 'CONTROLADOR';
  return 'ESPECIALISTA';
}

export function createCoach(seed, opts = {}) {
  const rng = seededRandom(seed);
  const methodId = opts.methodId ?? pick(rng, Object.keys(COACH_METHODS));
  const method = COACH_METHODS[methodId] ?? COACH_METHODS.FORMADOR;
  const originType = opts.originType ?? pick(rng, Object.keys(COACH_ORIGINS));
  const reputationBase = originType === 'EX_PLAYER' ? 58 : originType === 'TOUR_VETERAN' ? 54 : 42;
  const reputation = clamp(opts.reputation ?? reputationBase + rng() * 34 - 10);
  const first = opts.firstName ?? pick(rng, FIRST_NAMES);
  const last = opts.lastName ?? pick(rng, LAST_NAMES);
  const id = opts.id ?? `coach_${hashString(`${seed}_${first}_${last}`).toString(36)}`;
  const ambition = clamp(opts.ambition ?? 42 + rng() * 48);
  const temperament = pick(rng, ['CALMO', 'INTENSO', 'METODICO', 'CARISMATICO', 'EXIGENTE']);
  const pressureStyle = methodId === 'MENTAL' ? 'ABSORVE' : methodId === 'AGRESSIVO' ? 'AUMENTA' : pick(rng, ['ABSORVE', 'ORGANIZA', 'AUMENTA']);
  return {
    id,
    name: `${first} ${last}`,
    nationality: opts.nationality ?? pick(rng, NATIONS),
    age: opts.age ?? Math.round(34 + rng() * 28),
    originType,
    originLabel: COACH_ORIGINS[originType] ?? originType,
    reputation,
    method: methodId,
    methodLabel: method.label,
    temperament,
    ambition,
    preferredPlayerProfile: methodId === 'FORMADOR' ? 'YOUNG_PROJECT' : methodId === 'REFORMADOR' ? 'VETERAN_RESET' : methodId === 'AGRESSIVO' ? 'ATTACKER' : 'ANY',
    tacticalBeliefs: [method.tacticalFocus],
    developmentBeliefs: method.developmentFocus,
    pressureStyle,
    marketStatus: 'FREE',
    careerRecord: { seasons: 0, titles: 0, slams: 0, weeksAtNo1: 0, bestRankHelped: null, biggestRankJump: 0 },
    memory: [],
  };
}

export function createInitialCoachMarket(players = [], year = 2025) {
  // Cada atleta materializado pode precisar de um técnico individual. O
  // excedente evita que uma sequência de rupturas ou novos profissionais deixe
  // o mercado sem nenhuma alternativa disponível.
  const reserve = Math.max(12, Math.ceil(players.length * 0.08));
  const count = Math.max(36, players.length + reserve);
  const coachesById = {};
  for (let i = 0; i < count; i++) {
    const methodId = Object.keys(COACH_METHODS)[i % Object.keys(COACH_METHODS).length];
    const coach = createCoach(`initial-${year}-${i}`, { methodId });
    coachesById[coach.id] = coach;
  }
  return {
    _version: 1,
    currentYear: year,
    coachesById,
    partnershipsById: {},
    yearlyEvents: [],
    reputationLog: [],
    marketMemory: [],
  };
}

export function createCoachFromRetiredPlayer(player, year = 2025) {
  if (!player?.id) return null;
  const methodId = inferCoachMethodForPlayer(player);
  const reputation = clamp(42 + ((player.careerTitles?.gs ?? 0) * 12) + (100 - Math.min(100, player.careerBest?.rank ?? player.rankPosition ?? 80)) * 0.18);
  return createCoach(`retired-${player.id}-${year}`, {
    id: `coach_ret_${player.id}`,
    firstName: String(player.name ?? 'Novo').split(' ')[0],
    lastName: String(player.name ?? 'Tecnico').split(' ').slice(1).join(' ') || 'Team',
    nationality: player.nationality,
    age: Math.max(34, (player.age ?? 34) + 1),
    originType: 'EX_PLAYER',
    methodId,
    reputation,
  });
}

export function summarizeCoach(coach) {
  if (!coach) return null;
  const method = COACH_METHODS[coach.method] ?? COACH_METHODS.FORMADOR;
  return {
    id: coach.id,
    name: coach.name,
    label: `${method.label} ${coach.temperament?.toLowerCase?.() ?? ''}`.trim(),
    color: method.color,
    method: method.label,
    desc: method.desc,
  };
}
