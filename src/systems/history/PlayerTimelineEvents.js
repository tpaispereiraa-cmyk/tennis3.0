/**
 * Momentos permanentes da carreira.
 *
 * Esta camada nao substitui _seasonHistory: ela transforma os fatos que ja
 * existem no jogador em eventos legiveis para a ficha e para o Hall da Fama.
 * Por ser derivada de dados salvos no player, continua funcionando depois da
 * aposentadoria.
 */

const LIFE_META = {
  PERSONAL:    { label: 'Vida pessoal', icon: '♥', color: '#F28BA8' },
  HOME:        { label: 'Vida pessoal', icon: '⌂', color: '#C8A3FF' },
  SOCIAL:      { label: 'Impacto social', icon: '◎', color: '#62D6C2' },
  BUSINESS:    { label: 'Negócios', icon: '◆', color: '#67B7FF' },
  MEDIA:       { label: 'Mídia', icon: '◉', color: '#D6A8FF' },
  CONTROVERSY: { label: 'Assunto público', icon: '!', color: '#FF8B72' },
  COMMUNITY:   { label: 'Comunidade', icon: '⌘', color: '#75D6A6' },
  SPIRITUAL:   { label: 'Vida pessoal', icon: '✦', color: '#BDA5FF' },
  CAREER:      { label: 'Carreira', icon: '◈', color: '#F0C86A' },
  WELLNESS:    { label: 'Bem-estar', icon: '◌', color: '#78D6E6' },
};

const INJURY_LABELS = {
  WRIST: 'punho', KNEE: 'joelho', BACK: 'costas', SHOULDER: 'ombro',
  ANKLE: 'tornozelo', ELBOW: 'cotovelo', HAMSTRING: 'posterior da coxa',
  FATIGUE: 'fadiga', ILLNESS: 'doença',
};

function cleanText(value, fallback = '') {
  return String(value ?? fallback).replace(/\s+/g, ' ').trim();
}

function eventYear(event) {
  const year = Number(event?.year ?? event?.season ?? event?.originSeason ?? event?.dateYear);
  return Number.isFinite(year) && year > 1900 ? year : null;
}

function eventKey(event) {
  return [event.year, event.type, event.title, event.subtitle].join('|').toLowerCase();
}

function addRankMilestones(player, events) {
  const history = [...(player?._seasonHistory ?? player?.careerHistory ?? [])]
    .filter(entry => eventYear(entry))
    .sort((a, b) => eventYear(a) - eventYear(b));
  const milestones = [
    { threshold: 100, title: 'Entra no top 100', color: '#74B9FF', icon: '↑' },
    { threshold: 10, title: 'Entra no top 10 mundial', color: '#F0C86A', icon: '★' },
    { threshold: 5, title: 'Chega ao top 5 mundial', color: '#FFD36B', icon: '★' },
    { threshold: 1, title: 'Torna-se nº1 do mundo', color: '#FFD700', icon: '♛' },
  ];
  const achieved = new Set();
  for (const row of history) {
    const rank = Number(row.rank ?? row.rankPosition ?? 999);
    for (const milestone of milestones) {
      if (achieved.has(milestone.threshold) || rank > milestone.threshold) continue;
      achieved.add(milestone.threshold);
      events.push({
        year: eventYear(row), type: 'RANKING', category: 'QUADRA',
        title: milestone.title,
        subtitle: `Fecha a temporada em #${rank}.`,
        icon: milestone.icon, color: milestone.color, importance: milestone.threshold <= 10 ? 9 : 6,
      });
    }
  }
}

function addYouthJourneyEvents(player, events) {
  const youth = player?.youthProfile;
  if (!youth) return;
  const origin = youth.origin ?? {};
  const childhood = youth.childhood ?? {};
  const birthYear = Number(youth.birthYear ?? player.birthYear ?? 0);
  const startYear = Number.isFinite(birthYear) && birthYear > 1900
    ? birthYear + Number(origin.discoveryAge ?? 7)
    : null;
  if (startYear) {
    events.push({
      year: startYear, type: 'YOUTH_ORIGIN', category: 'FORMACAO',
      title: `Começa no ${childhood.firstCourt ?? origin.label ?? 'tênis de base'}`,
      subtitle: childhood.firstMotivation ?? `A origem foi ${origin.label ?? 'formativa'}.`,
      icon: '◌', color: '#C69CFF', importance: 5,
    });
  }

  const academy = youth.academy ?? {};
  const academyYear = Number.isFinite(birthYear) && academy.joinedAge
    ? birthYear + Number(academy.joinedAge)
    : null;
  if (academy.status === 'AFFILIATED' && academyYear) {
    events.push({
      year: academyYear, type: 'YOUTH_ACADEMY', category: 'FORMACAO',
      title: `Entra na ${academy.academyName ?? 'academia'}`,
      subtitle: `Escola de ${academy.lens ?? 'desenvolvimento'}; relação ${String(academy.alignment ?? 'adaptada').toLowerCase()}.`,
      icon: '⌁', color: '#76C7FF', importance: 5,
    });
  }

  const junior = youth.junior ?? {};
  if (junior.circuitEntryYear) {
    events.push({
      year: junior.circuitEntryYear, type: 'JUNIOR_CIRCUIT', category: 'FORMACAO',
      title: 'Entra no circuito juvenil',
      subtitle: `Chega ao nível ${String(junior.peakTier ?? 'regional').replace(/_/g, ' ').toLowerCase()}.`,
      icon: '△', color: '#78D6A6', importance: 6,
    });
  }
  for (const season of junior.seasonLedger ?? []) {
    if (!season?.year || !(season.titles > 0 || season.finals > 0)) continue;
    events.push({
      year: season.year, type: 'JUNIOR_SEASON', category: 'FORMACAO',
      title: season.titles > 0 ? `Conquista ${season.titles} título${season.titles === 1 ? '' : 's'} juvenil` : 'Chega a uma final juvenil',
      subtitle: `${season.events ?? 0} eventos, melhor rodada ${season.bestRound ?? '—'}.`,
      icon: season.titles > 0 ? '★' : '◇', color: '#9BE7A9', importance: season.titles > 0 ? 7 : 5,
    });
  }

  const transition = youth.transition ?? {};
  if (transition.proDebutYear) {
    events.push({
      year: transition.proDebutYear, type: 'YOUTH_TRANSITION', category: 'FORMACAO',
      title: 'Faz a transição para o profissional',
      subtitle: `Rota: ${String(transition.route ?? 'graduação juvenil').replace(/_/g, ' ').toLowerCase()}.`,
      icon: '↗', color: '#F0C86A', importance: 8,
    });
  }
  for (const moment of youth.shadowHistory ?? []) {
    if (!moment?.year) continue;
    events.push({
      year: moment.year, type: `YOUTH_${moment.type ?? 'MEMORY'}`, category: 'FORMACAO',
      title: moment.title ?? 'Marco da formação', subtitle: moment.subtitle ?? '',
      icon: '·', color: '#BDA5FF', importance: 4,
    });
  }
}

/** Retorna eventos pequenos, mas permanentes, que explicam a vida do atleta. */
export function buildPlayerMomentEvents(player, { sponsorEvents = [], coachEvents = [] } = {}) {
  if (!player) return [];
  const events = [];
  const history = [...(player?._seasonHistory ?? player?.careerHistory ?? [])]
    .filter(entry => eventYear(entry))
    .sort((a, b) => eventYear(a) - eventYear(b));
  const debutYear = eventYear(history[0]);

  addYouthJourneyEvents(player, events);

  if (debutYear) {
    events.push({
      year: debutYear, type: 'DEBUT', category: 'QUADRA', title: 'Primeira temporada profissional',
      subtitle: history[0]?.rank ? `Termina o primeiro ano em #${history[0].rank}.` : 'Entra oficialmente no circuito.',
      icon: '↗', color: '#79D39A', importance: 7,
    });
  }
  for (const row of history) {
    if (!row.titleWon) continue;
    const category = String(row.titleWon).replace(/_/g, ' ');
    events.push({
      year: eventYear(row), type: 'TITLE', category: 'QUADRA',
      title: `Conquista título ${category}`,
      subtitle: row.titleWhileInjured ? 'Vence mesmo convivendo com uma lesão.' : 'Uma temporada que entra no palmarés.',
      icon: String(row.titleWon).includes('SLAM') ? '★' : '♜',
      color: String(row.titleWon).includes('SLAM') ? '#FFD36B' : '#8ED3FF',
      importance: String(row.titleWon).includes('SLAM') ? 10 : 7,
    });
  }
  addRankMilestones(player, events);

  for (const lifeEvent of player.lifeEventLog ?? []) {
    const year = eventYear(lifeEvent);
    if (!year) continue;
    const meta = LIFE_META[lifeEvent.category] ?? LIFE_META.PERSONAL;
    events.push({
      year, type: `LIFE_${lifeEvent.type ?? 'EVENT'}`, category: lifeEvent.category ?? 'PERSONAL',
      title: cleanText(lifeEvent.label, 'Novo capítulo fora da quadra'),
      subtitle: cleanText(lifeEvent.description), icon: lifeEvent.icon ?? meta.icon, color: meta.color,
      importance: lifeEvent.newsworthy ? 7 : 4,
    });
  }

  for (const injury of player.injuryHistory ?? []) {
    const year = eventYear(injury);
    const grade = Number(injury.grade ?? injury.severity ?? 0);
    if (!year || grade < 2) continue;
    const missed = Number(injury.slotsOut ?? injury.tournamentsMissed ?? 0);
    const type = INJURY_LABELS[injury.type] ?? cleanText(injury.type, 'lesão');
    events.push({
      year, type: 'INJURY', category: 'SAUDE',
      title: `Lesão no ${type} interrompe a temporada`,
      subtitle: missed > 0 ? `Fica fora de ${missed} torneio${missed === 1 ? '' : 's'}.` : `Lesão de grau ${grade}.`,
      detail: injury.originTournament ? `O problema começou em ${injury.originTournament}.` : '',
      icon: grade >= 4 ? '✚' : '⊕', color: grade >= 4 ? '#FF6F61' : '#FFAA63', importance: grade >= 3 ? 8 : 5,
    });
  }

  for (const item of sponsorEvents ?? []) {
    const year = eventYear(item);
    if (!year) continue;
    const brand = cleanText(item.brand ?? item.sponsor ?? item.name);
    const text = cleanText(item.text ?? item.description ?? item.label);
    events.push({
      year, type: 'SPONSOR', category: 'NEGOCIOS',
      title: brand ? `Assina com ${brand}` : 'Novo capítulo comercial',
      subtitle: text || 'O mercado passa a enxergar um novo patamar no jogador.',
      icon: '◇', color: '#65B9FF', importance: item.subtype?.includes('ELITE') ? 8 : 5,
    });
  }

  for (const item of coachEvents ?? []) {
    const year = eventYear(item);
    if (!year || item.playerId !== player.id) continue;
    const rupture = item.type === 'COACH_RUPTURE';
    events.push({
      year, type: item.type ?? 'COACH', category: 'EQUIPE',
      title: rupture ? `Encerra parceria com ${item.coachName ?? 'o técnico'}` : `Inicia trabalho com ${item.coachName ?? 'novo técnico'}`,
      subtitle: cleanText(item.text, rupture ? 'Uma mudança importante de equipe.' : 'Um novo ciclo começa fora da quadra.'),
      icon: rupture ? '×' : '＋', color: rupture ? '#FFAA63' : '#75D6A6', importance: rupture ? 7 : 5,
    });
  }

  const unique = new Map();
  for (const event of events) {
    const key = eventKey(event);
    const old = unique.get(key);
    if (!old || (event.importance ?? 0) > (old.importance ?? 0)) unique.set(key, event);
  }
  return [...unique.values()]
    .sort((a, b) => a.year - b.year || (b.importance ?? 0) - (a.importance ?? 0));
}
