const clamp = (v, min=0, max=100) => Math.max(min, Math.min(max, v));
const POTENTIAL = { GERACIONAL:28, LENDA:22, ELITE:15, CAMPEAO:9, COMUM:4, ABAIXO_DA_MEDIA:1 };

function stateOf(h) {
  if (h.score >= 78 && h.credibility >= 62) return 'CONSENSUS';
  if (h.score >= 65 && h.pressure >= 22) return 'CONTESTED';
  if (h.score >= 58) return 'SURGING';
  if (h.score >= 38 && h.pressure >= 25) return 'UNFULFILLED';
  if (h.score >= 30) return 'WATCHLIST';
  return 'QUIET';
}
export function ensurePlayerHype(player, date={ year:2025, month:1 }) {
  if (player?.publicHype?.history) return player;
  const age=player.age??25, rank=player.rankPosition??150;
  const score=clamp((POTENTIAL[player.potential]??4)+(age<=21?14:age<=24?7:0)+(rank<=10?18:rank<=30?10:rank<=80?4:0));
  return { ...player, publicHype:{ score, peak:score, expectation:score, credibility:50, pressure:0, state:'QUIET', history:[{ year:date.year, month:date.month, score, delta:0, reason:'entrada no radar' }], events:[] } };
}
export function processMonthlyHype(players=[], date={ year:2025, month:1 }, context={}) {
  const events=[];
  const updated=players.map(raw => {
    const player=ensurePlayerHype(raw,date), prev=player.publicHype, rank=player.rankPosition??150, age=player.age??25;
    const form=Number(context.formDeltaMap?.get?.(player.id) ?? context.formDeltaMap?.[player.id] ?? 0), winner=player.id===context.winnerId;
    const young=age<=22&&['GERACIONAL','LENDA','ELITE'].includes(player.potential), underdog=!['GERACIONAL','LENDA'].includes(player.potential)&&(rank>35||age>=25);
    const titleBase={ GRAND_SLAM:34, MASTERS_1000:25, ATP_500:17, ATP_250:11, ATP_100:9, ATP_75:7, ATP_50:6, ATP_25:5 }[context.tournamentCategory] ?? 9;
    const titleLift=winner ? titleBase+(underdog?12:young?8:0) : 0;
    const delivery=(rank<=10?2.6:rank<=30?1.2:rank<=75?.35:-.45)+Math.max(-5,Math.min(7,form*.7))+titleLift;
    const score=clamp(prev.score+delivery+(!winner&&form<=0?-Math.max(.8,prev.score*.035):0)+(young?1.1:0)+(underdog&&winner?3:0));
    const expectation=clamp(prev.expectation+(((POTENTIAL[player.potential]??4)+(age<=22?24:age<=25?12:3)+(prev.peak??prev.score)*.24+(rank<=20?8:0))-prev.expectation)*.16);
    const credibility=clamp(prev.credibility+(delivery>=3?4:delivery<=-2?-4:-1));
    const pressure=clamp((expectation-(rank<=10?76:rank<=30?58:rank<=75?38:22))*.55+(prev.score>55&&!winner?4:0));
    const next={ score:Math.round(score), peak:Math.max(prev.peak??0,Math.round(score)), expectation:Math.round(expectation), credibility:Math.round(credibility), pressure:Math.round(pressure), state:'', history:[], events:[...(prev.events??[])] };
    next.state=stateOf(next); const delta=next.score-prev.score;
    const reason=winner?(underdog?'título improvável':'título e exposição'):delta<=-4?'interesse esfriando':delta>=4?'onda de atenção':'ciclo mensal';
    next.history=[...(prev.history??[]),{year:date.year,month:date.month,score:next.score,delta,expectation:next.expectation,credibility:next.credibility,pressure:next.pressure,state:next.state,reason}].slice(-48);
    if(next.state!==prev.state&&['SURGING','CONTESTED','UNFULFILLED','CONSENSUS'].includes(next.state)) {
      const copy={SURGING:'entra no radar',CONTESTED:'vira hype contestado',UNFULFILLED:'passa a carregar o rótulo de promessa não cumprida',CONSENSUS:'vira consenso do circuito'}[next.state];
      const event={id:`hype:${player.id}:${date.year}:${date.month}:${next.state}`,type:'HYPE_SHIFT',playerId:player.id,year:date.year,monthIndex:date.month,label:`${player.name}: ${copy}`,description:`Hype ${next.score}/100 · expectativa ${next.expectation}/100 · ${reason}.`,icon:'◈',source:'MONTHLY_HYPE'};
      events.push(event); next.events=[...next.events,event].slice(-24);
    }
    return {...player,publicHype:next};
  });
  return {players:updated,events};
}
