/**
 * Selective retroactive memory for players who become relevant. It is generated
 * once from their persistent seed and the real aggregate cohort record, then
 * saved as their own biography. No background child needs a full player object.
 */

const MOMENTS = [
  ['LOCAL_BREAKTHROUGH', 'Chama atenção no circuito local', 'Uma sequência regional coloca seu nome no radar da base.'],
  ['FIRST_TRAVEL', 'Faz a primeira viagem competitiva', 'Sai do ambiente conhecido para medir o próprio jogo em outro circuito.'],
  ['FORMATIVE_SETBACK', 'Enfrenta um primeiro revés formativo', 'A fase difícil muda a relação com treino, derrota e ambição.'],
  ['YOUTH_SIGNAL', 'Vira sinal de promessa', 'Resultados consistentes fazem treinadores e observadores repararem.'],
  ['JUNIOR_DECISION', 'Escolhe seguir o caminho competitivo', 'A família e a estrutura ao redor apostam numa rotina mais séria.'],
];

function hash(value) {
  let result = 2166136261;
  for (const char of String(value ?? 'shadow-history')) {
    result ^= char.charCodeAt(0);
    result = Math.imul(result, 16777619);
  }
  return result >>> 0;
}

export function hasYouthShadowHistory(player = {}) {
  return Array.isArray(player.youthProfile?.shadowHistory) && player.youthProfile.shadowHistory.length > 0;
}

export function createYouthShadowHistory(player = {}, { year = 2025, trigger = 'RELEVANCE', cohortUniverse = null } = {}) {
  const youth = player.youthProfile ?? {};
  const origin = youth.origin ?? {};
  const birthYear = Number(youth.birthYear ?? player.birthYear ?? (year - (player.age ?? 18)));
  const seed = hash(`${player.id ?? player.name}:${birthYear}:${trigger}`);
  const discoveryAge = Number(origin.discoveryAge ?? 7);
  const earliest = birthYear + discoveryAge;
  const selected = [...MOMENTS].sort((a, b) => ((seed >>> (a[0].length % 16)) % 31) - ((seed >>> (b[0].length % 16)) % 31)).slice(0, 5);
  const cohortYears = (cohortUniverse?.circuitHistory ?? []).slice(-4).map(entry => entry.year).filter(Number.isFinite);
  return selected.map(([type, title, baseSubtitle], index) => ({
    id: `${player.id ?? 'player'}:shadow:${type}`,
    type,
    year: Math.min(year, earliest + index * 2 + ((seed >>> (index * 3)) % 2)),
    title,
    subtitle: index === 0 && youth.childhood?.formativeConstraint
      ? `${baseSubtitle} Cresce lidando com ${youth.childhood.formativeConstraint}.`
      : baseSubtitle,
    trigger,
    cohortYears,
  })).sort((a, b) => a.year - b.year);
}

export function ensureYouthShadowHistory(player = {}, options = {}) {
  if (!player.youthProfile || hasYouthShadowHistory(player)) return player;
  const shadowHistory = createYouthShadowHistory(player, options);
  return {
    ...player,
    youthProfile: {
      ...player.youthProfile,
      shadowHistory,
      shadowHistoryTrigger: options.trigger ?? 'RELEVANCE',
      shadowHistoryGeneratedYear: options.year ?? null,
    },
  };
}
