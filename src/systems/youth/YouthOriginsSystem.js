/**
 * Deterministic childhood context. These are formative facts, not simulated
 * results: they make a player's later story legible without inventing an
 * expensive match-by-match childhood timeline.
 */

const ORIGIN_DETAILS = {
  LOCAL_CLUB: {
    firstCourts: ['quadra municipal', 'clube de bairro', 'escola esportiva'],
    motivations: ['competir com amigos mais velhos', 'transformar a rotina do bairro', 'seguir o primeiro treinador'],
    constraints: ['poucas horas de quadra', 'treinos divididos com outros esportes', 'viagens raras no começo'],
  },
  FAMILY_TENNIS: {
    firstCourts: ['clube da família', 'quadra de associação', 'circuito regional'],
    motivations: ['continuar uma tradição familiar', 'sair da sombra de um parente', 'provar que a escolha era própria'],
    constraints: ['expectativa precoce', 'comparações constantes', 'pouco espaço para errar'],
  },
  PUBLIC_PROJECT: {
    firstCourts: ['projeto comunitário', 'centro público de treinamento', 'quadra escolar'],
    motivations: ['aproveitar uma vaga rara', 'representar a comunidade', 'conquistar independência'],
    constraints: ['material compartilhado', 'orçamento instável', 'deslocamentos longos'],
  },
  ACADEMY_SCHOLARSHIP: {
    firstCourts: ['academia regional', 'bolsa de desenvolvimento', 'centro de alto rendimento'],
    motivations: ['manter a bolsa', 'ganhar espaço entre os selecionados', 'retribuir a aposta recebida'],
    constraints: ['pressão por permanência', 'rotina longe de casa', 'competição interna intensa'],
  },
  SELF_TAUGHT: {
    firstCourts: ['parede de concreto', 'quadra pública', 'clube visitado ocasionalmente'],
    motivations: ['copiar ídolos na televisão', 'encontrar uma saída própria', 'dominar um jogo que parecia distante'],
    constraints: ['técnica construída na tentativa e erro', 'pouco acompanhamento', 'equipamento improvisado'],
  },
  LATE_DISCOVERY: {
    firstCourts: ['intercâmbio escolar', 'clube de bairro', 'projeto multiesportivo'],
    motivations: ['trocar de esporte', 'recuperar uma oportunidade inesperada', 'testar um talento percebido tarde'],
    constraints: ['base técnica atrasada', 'menos repertório competitivo', 'necessidade de aprender depressa'],
  },
};

const CHILDHOOD_TONES = [
  'CURIOSO',
  'DISCIPLINADO',
  'COMPETITIVO',
  'RESILIENTE',
  'IMPROVISADOR',
];

function hash(value) {
  let result = 2166136261;
  for (const char of String(value ?? 'youth')) {
    result ^= char.charCodeAt(0);
    result = Math.imul(result, 16777619);
  }
  return result >>> 0;
}

function pick(items, seed, offset) {
  return items[(seed >>> offset) % items.length];
}

export function createYouthChildhood(player = {}, profile = {}) {
  const originId = profile.origin?.id ?? 'LOCAL_CLUB';
  const details = ORIGIN_DETAILS[originId] ?? ORIGIN_DETAILS.LOCAL_CLUB;
  const seed = hash(`${player.id ?? player.name ?? 'player'}:${profile.birthYear ?? player.birthYear ?? ''}:${originId}`);
  const discoveryAge = profile.origin?.discoveryAge ?? 7;

  return {
    storySeed: seed,
    firstCourt: pick(details.firstCourts, seed, 1),
    firstMotivation: pick(details.motivations, seed, 7),
    formativeConstraint: pick(details.constraints, seed, 13),
    formativeTone: pick(CHILDHOOD_TONES, seed, 19),
    firstStructuredTrainingAge: Math.min(15, discoveryAge + 1 + ((seed >>> 23) % 3)),
    reconstructed: Boolean(profile.reconstructed),
  };
}

export function buildYouthOriginSummary(profile = {}) {
  const childhood = profile.childhood;
  if (!childhood) return null;
  const origin = profile.origin?.label ?? 'origem desconhecida';
  return `Começou no ${childhood.firstCourt}, vindo de ${origin}. ${childhood.firstMotivation}; cresceu lidando com ${childhood.formativeConstraint}.`;
}
