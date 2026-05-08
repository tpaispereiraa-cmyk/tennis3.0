import { buildSeasonAct } from './SeasonActEngine.js';
import { buildSeasonArc } from './SeasonArcEngine.js';

function buildMeaningLine({ tournament, champion, chapter }) {
  if (chapter?.id === 'CONFIRMATION_STAGE') {
    return `${tournament.name} funcionou como confirmação pesada de status para ${champion?.name ?? 'o campeão da semana'}.`;
  }
  if (chapter?.id === 'REDEMPTION_WINDOW') {
    return `${tournament.name} ganhou peso de resposta pública: a semana serviu como capítulo de redenção, não só de pontuação.`;
  }
  if (chapter?.id === 'PRESSURE_TEST') {
    return `${tournament.name} virou um tribunal emocional para quem já entrou cobrado, e o resultado reorganiza a leitura pública do circuito.`;
  }
  if (chapter?.id === 'CONSISTENCY_TEST') {
    return `${tournament.name} mediu repetição, não apenas brilho. Foi um torneio sobre sustentar narrativa.`;
  }
  if (chapter?.id === 'NATURAL_TERRITORY') {
    return `${tournament.name} premiou encaixe de contexto e mostrou quais perfis sabem aproveitar o terreno certo quando a temporada pede isso.`;
  }
  return `${tournament.name} mexeu menos com estatística bruta do que com o jeito como o circuito passa a ler os protagonistas da temporada.`;
}

function buildNextHookLine({ nextTournament, nextAct, champion, championArc }) {
  if (!nextTournament) {
    return 'O próximo trecho da temporada ainda está em aberto, mas o circuito já sai desta semana com uma nova ordem emocional nas mãos.';
  }

  if (championArc?.id === 'CROWN_DEFENSE') {
    return `Agora a cobrança muda de altura: ${champion?.name ?? 'o campeão'} chega a ${nextTournament.name} tendo que sustentar o novo patamar sob ${nextAct?.label?.toLowerCase?.() ?? 'pressão crescente'}.`;
  }
  if (championArc?.id === 'PRODIGY_SURGE' || championArc?.id === 'ASSERTION_RUN') {
    return `${nextTournament.name} aparece como a próxima prova de legitimidade para ${champion?.name ?? 'o campeão da semana'} dentro de ${nextAct?.label?.toLowerCase?.() ?? 'um novo ato da temporada'}.`;
  }
  if (championArc?.id === 'VETERAN_RECHARGE') {
    return `O gancho agora é simples: ver se ${champion?.name ?? 'o campeão'} consegue levar o impulso até ${nextTournament.name} e transformar reação em campanha longa.`;
  }

  return `${nextTournament.name} recebe o circuito já alterado por esta semana, em ${nextAct?.label?.toLowerCase?.() ?? 'um novo momento do ano'}, e isso muda o peso do que vem a seguir.`;
}

export function buildTournamentAftermath({ tournament, champion, nextTournament = null, tournamentChapter = null }) {
  const championArc = champion ? buildSeasonArc(champion) : null;
  const nextAct = nextTournament ? buildSeasonAct({ tournament: nextTournament, calendarIndex: nextTournament.weekIndex ?? 0 }) : null;

  return {
    meaning: buildMeaningLine({
      tournament,
      champion,
      chapter: tournamentChapter,
    }),
    nextHook: buildNextHookLine({
      nextTournament,
      nextAct,
      champion,
      championArc,
    }),
    championArcLabel: championArc?.label ?? null,
    nextActLabel: nextAct?.label ?? null,
  };
}
