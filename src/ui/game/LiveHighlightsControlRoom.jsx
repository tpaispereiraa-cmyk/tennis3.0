import React, { useMemo } from 'react';

const C = { a:'#52C7F5', b:'#FF7A55', ink:'#F4F0E8', dim:'rgba(244,240,232,.42)', line:'rgba(255,255,255,.08)', panel:'rgba(8,17,18,.82)' };
const SCORE = ['0', '15', '30', '40', 'AD'];
const clamp = (v, min, max) => Math.max(min, Math.min(max, Number(v) || 0));
const pct = (a, b) => a + b > 0 ? Math.round(a / (a + b) * 100) : 0;
const lastName = p => String(p?.name ?? 'Jogador').split(' ').at(-1);

function scoreText(snap, player, index) {
  if (snap?.inTiebreak) return snap.tbScore?.[index] ?? 0;
  return SCORE[player?.score ?? 0] ?? player?.score ?? 0;
}

function heatTier(value) {
  if (value >= 82) return ['CLÁSSICO', '#FFB020'];
  if (value >= 65) return ['EM CHAMAS', '#FF6547'];
  if (value >= 45) return ['AQUECIDO', '#FFD166'];
  if (value >= 25) return ['GANHANDO VIDA', '#66C7E8'];
  return ['EM CONSTRUÇÃO', '#50A58A'];
}

function MiniCourt({ bounces = [], players = [] }) {
  const dots = bounces.slice(-55);
  const toX = x => 12 + ((Number(x) + 4.115) / 8.23) * 116;
  const toY = y => 8 + ((Number(y) + 11.885) / 23.77) * 190;
  return <svg viewBox="0 0 140 206" style={{width:'100%',height:'100%',display:'block'}} aria-label="Mapa dos últimos quiques">
    <defs><linearGradient id="court-live" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#17382D"/><stop offset="1" stopColor="#10271F"/></linearGradient></defs>
    <rect x="10" y="6" width="120" height="194" rx="2" fill="url(#court-live)" stroke="rgba(255,255,255,.22)"/>
    <path d="M26 6V200M114 6V200M26 54H114M26 152H114M70 54V152M10 103H130" fill="none" stroke="rgba(255,255,255,.19)" strokeWidth="1"/>
    <path d="M10 103H130" stroke="rgba(255,255,255,.58)" strokeWidth="2"/>
    {dots.map((b,i)=>{
      if (!Number.isFinite(Number(b.x)) || !Number.isFinite(Number(b.y))) return null;
      const recent=(i+1)/Math.max(1,dots.length); const color=b.type==='out'?'#FF4D5D':b.player===0?C.a:C.b;
      return <circle key={`${b.idx ?? i}-${i}`} cx={toX(b.x)} cy={toY(b.y)} r={b.type==='winner'?3.4:1.7+recent} fill={color} opacity={.18+recent*.78}/>;
    })}
    <text x="16" y="18" fill="rgba(255,255,255,.35)" fontSize="6">{lastName(players[0])}</text>
    <text x="16" y="194" fill="rgba(255,255,255,.35)" fontSize="6">{lastName(players[1])}</text>
  </svg>;
}

function MomentumStrip({ points = [], players = [] }) {
  const recent = points.slice(-18);
  if (!recent.length) return <div style={{color:C.dim,fontSize:9}}>Aguardando os primeiros pontos para ler o fluxo.</div>;
  return <div>
    <div style={{display:'flex',gap:4,height:34,alignItems:'center'}}>
      {recent.map((point,index)=>{
        const rally=clamp(point.rally,0,28); const height=9+(rally/28)*23;
        return <div key={index} title={`${lastName(players[point.winner])}: ${point.reason ?? 'ponto'} · rally ${point.rally ?? 0}`} style={{flex:1,height,borderRadius:2,background:point.winner===0?C.a:C.b,opacity:.42+index/recent.length*.55,boxShadow:index===recent.length-1?`0 0 12px ${point.winner===0?C.a:C.b}66`:'none'}}/>;
      })}
    </div>
    <div style={{display:'flex',justifyContent:'space-between',marginTop:7,fontSize:7,letterSpacing:'.18em',color:C.dim,textTransform:'uppercase'}}><span>18 pontos atrás</span><span>agora</span></div>
  </div>;
}

function StatDuel({ label, a, b, suffix='' }) {
  const av=Number(a)||0,bv=Number(b)||0,total=Math.max(1,av+bv),aWidth=av/total*100;
  return <div style={{padding:'9px 0',borderBottom:`1px solid ${C.line}`}}>
    <div style={{display:'grid',gridTemplateColumns:'42px 1fr 42px',alignItems:'center',gap:9}}>
      <b style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:17,color:C.a}}>{av}{suffix}</b>
      <div style={{textAlign:'center',fontSize:7,letterSpacing:'.18em',color:C.dim,textTransform:'uppercase'}}>{label}</div>
      <b style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:17,color:C.b,textAlign:'right'}}>{bv}{suffix}</b>
    </div>
    <div style={{height:3,display:'flex',marginTop:5,background:'rgba(255,255,255,.05)'}}><div style={{width:`${aWidth}%`,background:C.a}}/><div style={{flex:1,background:C.b}}/></div>
  </div>;
}

function CaptureSwitch({ active, color, title, description, onClick }) {
  return <button type="button" onClick={onClick} style={{width:'100%',display:'grid',gridTemplateColumns:'28px 1fr auto',gap:10,alignItems:'center',padding:'10px 11px',border:`1px solid ${active?color+'55':C.line}`,background:active?`${color}0E`:'rgba(255,255,255,.018)',color:C.ink,cursor:'pointer',textAlign:'left'}}>
    <span style={{width:24,height:12,borderRadius:8,padding:2,background:active?color:'rgba(255,255,255,.12)',display:'flex',justifyContent:active?'flex-end':'flex-start'}}><i style={{width:8,height:8,borderRadius:'50%',background:'#fff',display:'block'}}/></span>
    <span><strong style={{display:'block',fontSize:9,letterSpacing:'.1em',color:active?color:C.dim,textTransform:'uppercase'}}>{title}</strong><small style={{display:'block',fontSize:7,color:'rgba(255,255,255,.25)',marginTop:3}}>{description}</small></span>
    <span style={{fontSize:7,color:active?color:'rgba(255,255,255,.18)'}}>{active?'ARMADO':'OFF'}</span>
  </button>;
}

function Scoreboard({ snap, players }) {
  const sets=snap?.setsDetail ?? [];
  return <div style={{display:'grid',gap:5}}>{players.map((p,index)=>{
    const color=index===0?C.a:C.b; const server=snap?.server===index;
    return <div key={index} style={{display:'grid',gridTemplateColumns:'minmax(150px,1fr) auto 48px',alignItems:'center',gap:15,padding:'10px 13px',background:'rgba(255,255,255,.025)',borderLeft:`3px solid ${color}`}}>
      <div style={{display:'flex',alignItems:'center',gap:8,minWidth:0}}>{server&&<span style={{width:7,height:7,borderRadius:'50%',background:'#fff',boxShadow:'0 0 10px #fff'}}/>}<b style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:19,textTransform:'uppercase',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{p?.name}</b><span style={{fontSize:7,color:C.dim,letterSpacing:'.14em'}}>{server?'SACANDO':'RECEBENDO'}</span></div>
      <div style={{display:'flex',gap:4}}>{sets.map((set,setIndex)=><span key={setIndex} style={{width:25,height:25,display:'grid',placeItems:'center',border:`1px solid ${C.line}`,color:(set?.[index]??0)>(set?.[1-index]??0)?color:C.dim,fontFamily:"'Barlow Condensed',sans-serif",fontSize:16}}>{set?.[index]??0}</span>)}<span style={{width:25,height:25,display:'grid',placeItems:'center',background:'rgba(255,255,255,.07)',fontFamily:"'Barlow Condensed',sans-serif",fontSize:16}}>{p?.games??0}</span></div>
      <strong style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:28,color:server?color:C.ink,textAlign:'right'}}>{scoreText(snap,p,index)}</strong>
    </div>;
  })}</div>;
}

export default function LiveHighlightsControlRoom({ visible=true, snap, match, feed=[], filters={}, onToggleFilter=()=>{}, headline, pulseMessage, intensityLabel='EM LEITURA', tensionColor='#52C7F5' }) {
  const players=snap?.players?.length?snap.players:[match?.playerA,match?.playerB];
  const p0=players[0]??{},p1=players[1]??{},s0=p0.stats??{},s1=p1.stats??{};
  const points=snap?.pointHistory??[];
  const heat=Math.round(snap?.heat?.score??18),peak=Math.round(snap?.heat?.peak??heat),[heatLabel,heatColor]=heatTier(heat);
  const recent=points.slice(-10),wins0=recent.filter(p=>p.winner===0).length,wins1=recent.length-wins0;
  const avgRally=points.length?Math.round(points.reduce((sum,p)=>sum+(p.rally??0),0)/points.length*10)/10:0;
  const hold0=pct(s0.pointsWonServing,s0.pointsLostServing),hold1=pct(s1.pointsWonServing,s1.pointsLostServing);
  const return0=pct(s0.pointsWonReturning,s0.pointsLostReturning),return1=pct(s1.pointsWonReturning,s1.pointsLostReturning);
  const currentLeader=wins0===wins1?null:wins0>wins1?p0:p1;
  const insight=useMemo(()=>{
    if (!snap) return 'Sincronizando placar, trajetória da bola e contexto competitivo.';
    if (snap.inTiebreak) return `Tie-break aberto. A direção acompanha cada ponto: qualquer mini-sequência pode decidir o set.`;
    if (currentLeader && Math.abs(wins0-wins1)>=4) return `${lastName(currentLeader)} ganhou ${Math.max(wins0,wins1)} dos últimos ${recent.length} pontos e tenta transformar domínio curto em vantagem no placar.`;
    if (avgRally>=10) return `Os pontos estão longos — média recente de ${avgRally} golpes. A próxima janela pode nascer da resistência, não de uma pancada isolada.`;
    if (heat>=58) return `A temperatura subiu para ${heat}/100. O corte espera pressão de placar para abrir a transmissão no momento certo.`;
    return 'A partida está sendo lida em segundo plano. O próximo corte só abre quando placar e contexto justificarem interromper a espera.';
  },[snap,currentLeader,wins0,wins1,recent.length,avgRally,heat]);
  const captureDefs=[
    ['matchPoint','Clímax','Ponto que pode encerrar a partida','#FF5263'],
    ['setPoint','Set point','Ponto que pode fechar o set','#FFD166'],
    ['breakPoint','Break point','Recebedor pode tomar o saque','#FF9855'],
    ['gamePoint','Game point','Somente fechamento contextual','#52C7F5'],
  ];
  const feedRows=feed.slice(0,7);
  return <div style={{position:'fixed',inset:0,zIndex:9999,opacity:visible?1:0,pointerEvents:visible?'auto':'none',transition:'opacity .35s ease',background:'radial-gradient(circle at 78% 0%,rgba(23,86,76,.22),transparent 35%),linear-gradient(145deg,#020908,#071011 58%,#090812)',color:C.ink,fontFamily:"'Space Mono',monospace",overflow:'auto'}}>
    <div style={{position:'fixed',inset:0,pointerEvents:'none',opacity:.025,backgroundImage:'repeating-linear-gradient(0deg,transparent,transparent 3px,#fff 3px,#fff 4px)'}}/>
    <header style={{height:46,padding:'0 24px',display:'flex',alignItems:'center',justifyContent:'space-between',borderBottom:`1px solid ${C.line}`,position:'sticky',top:0,zIndex:2,background:'rgba(2,9,8,.94)',backdropFilter:'blur(12px)'}}>
      <div style={{display:'flex',alignItems:'center',gap:10}}><span style={{width:8,height:8,borderRadius:'50%',background:'#45E091',boxShadow:'0 0 14px #45E091'}}/><b style={{fontSize:8,letterSpacing:'.28em',color:'#45E091'}}>SALA DE DIREÇÃO · AO VIVO</b><span style={{fontSize:7,color:C.dim}}>motor acelerado até a próxima janela editorial</span></div>
      <span style={{fontSize:8,color:C.dim,letterSpacing:'.15em'}}>{lastName(match?.playerA).toUpperCase()} × {lastName(match?.playerB).toUpperCase()}</span>
    </header>

    <main style={{minHeight:'calc(100vh - 46px)',display:'grid',gridTemplateRows:'auto 1fr'}}>
      <section style={{display:'grid',gridTemplateColumns:'minmax(420px,1.25fr) minmax(330px,.75fr)',borderBottom:`1px solid ${C.line}`}}>
        <div style={{padding:'18px 24px',borderRight:`1px solid ${C.line}`}}>
          <div style={{display:'flex',justifyContent:'space-between',gap:18,alignItems:'end',marginBottom:12}}>
            <div><div style={{fontSize:7,letterSpacing:'.25em',color:tensionColor,textTransform:'uppercase'}}>próxima janela</div><h1 style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:34,lineHeight:.95,letterSpacing:'.03em',margin:'6px 0 0',textTransform:'uppercase'}}>{headline || 'A partida ainda está escrevendo o próximo corte'}</h1></div>
            <div style={{textAlign:'right',minWidth:125}}><div style={{fontSize:7,color:C.dim,letterSpacing:'.2em'}}>TENSÃO EDITORIAL</div><b style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:23,color:tensionColor}}>{intensityLabel}</b></div>
          </div>
          <Scoreboard snap={snap} players={[p0,p1]}/>
        </div>
        <div style={{padding:'18px 22px',display:'grid',gridTemplateColumns:'1fr 150px',gap:18,alignItems:'center'}}>
          <div><div style={{fontSize:7,letterSpacing:'.22em',color:C.dim}}>TEMPERATURA DA PARTIDA</div><div style={{display:'flex',alignItems:'baseline',gap:8,marginTop:5}}><b style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:48,color:heatColor,lineHeight:1}}>{heat}</b><span style={{fontSize:9,color:C.dim}}>/100</span></div><strong style={{fontSize:9,color:heatColor,letterSpacing:'.15em'}}>{heatLabel}</strong><div style={{height:5,background:'rgba(255,255,255,.06)',marginTop:12}}><div style={{width:`${heat}%`,height:'100%',background:`linear-gradient(90deg,#3BC49A,${heatColor})`,boxShadow:`0 0 12px ${heatColor}55`}}/></div><div style={{fontSize:7,color:C.dim,marginTop:7}}>Pico da partida: {peak}</div></div>
          <MiniCourt bounces={snap?.bounceLog} players={[p0,p1]}/>
        </div>
      </section>

      <section style={{display:'grid',gridTemplateColumns:'245px minmax(430px,1fr) 300px',minHeight:0}}>
        <aside style={{padding:'18px',borderRight:`1px solid ${C.line}`,background:'rgba(0,0,0,.12)'}}>
          <div style={{fontSize:7,letterSpacing:'.24em',color:C.dim,marginBottom:12}}>REGRAS DE CORTE</div>
          <div style={{display:'grid',gap:7}}>{captureDefs.map(([key,title,description,color])=><CaptureSwitch key={key} active={!!filters[key]} color={color} title={title} description={description} onClick={()=>onToggleFilter(key)}/>)}</div>
          <div style={{marginTop:16,padding:'12px',border:`1px solid ${C.line}`,background:C.panel}}><div style={{fontSize:7,color:'#45E091',letterSpacing:'.18em'}}>STATUS DO MOTOR</div><div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:20,marginTop:6}}>ANALISANDO EM ALTA VELOCIDADE</div><div style={{fontSize:8,color:C.dim,lineHeight:1.55,marginTop:6}}>A quadra abre automaticamente quando uma regra armada encontra contexto real.</div></div>
        </aside>

        <div style={{padding:'18px 22px',overflow:'hidden'}}>
          <div style={{padding:'14px 16px',borderLeft:`3px solid ${tensionColor}`,background:'rgba(255,255,255,.025)',marginBottom:15}}><div style={{fontSize:7,color:tensionColor,letterSpacing:'.2em'}}>LEITURA AO VIVO</div><div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:19,lineHeight:1.25,marginTop:7}}>{insight}</div><div style={{fontSize:8,color:C.dim,marginTop:7}}>{pulseMessage}</div></div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
            <div style={{padding:'14px',border:`1px solid ${C.line}`,background:C.panel}}><div style={{fontSize:7,letterSpacing:'.2em',color:C.dim,marginBottom:11}}>FLUXO · ÚLTIMOS PONTOS</div><MomentumStrip points={points} players={[p0,p1]}/><div style={{display:'flex',justifyContent:'space-between',marginTop:10,fontSize:8}}><span style={{color:C.a}}>{lastName(p0)} {wins0}/{recent.length}</span><span style={{color:C.b}}>{lastName(p1)} {wins1}/{recent.length}</span></div></div>
            <div style={{padding:'14px',border:`1px solid ${C.line}`,background:C.panel}}><div style={{fontSize:7,letterSpacing:'.2em',color:C.dim,marginBottom:3}}>TELEMETRIA COMPETITIVA</div><StatDuel label="Winners" a={s0.winners} b={s1.winners}/><StatDuel label="Erros não forçados" a={s0.unforcedErrors} b={s1.unforcedErrors}/><StatDuel label="Aces" a={s0.aces} b={s1.aces}/><StatDuel label="Pontos no saque" a={hold0} b={hold1} suffix="%"/><StatDuel label="Pontos na devolução" a={return0} b={return1} suffix="%"/></div>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8,marginTop:14}}>{[
            ['Rally médio',avgRally,'golpes'],['Pontos jogados',points.length,'recentes'],['Stamina '+lastName(p0),Math.round(clamp(p0.stamina,0,1)*100),'%'],['Stamina '+lastName(p1),Math.round(clamp(p1.stamina,0,1)*100),'%']
          ].map(([label,value,suffix])=><div key={label} style={{padding:'11px 12px',border:`1px solid ${C.line}`,background:'rgba(255,255,255,.018)'}}><div style={{fontSize:7,color:C.dim,letterSpacing:'.12em',textTransform:'uppercase'}}>{label}</div><b style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:24}}>{value}{suffix}</b></div>)}</div>
        </div>

        <aside style={{borderLeft:`1px solid ${C.line}`,padding:'18px 0',overflow:'hidden'}}>
          <div style={{padding:'0 18px 12px',display:'flex',justifyContent:'space-between'}}><span style={{fontSize:7,letterSpacing:'.22em',color:C.dim}}>JANELAS DETECTADAS</span><b style={{fontSize:8,color:'#45E091'}}>{feed.length}</b></div>
          {feedRows.length===0?<div style={{padding:'36px 18px',color:C.dim,fontSize:9,lineHeight:1.6}}>Nenhuma janela relevante ainda. O jogo segue sendo processado sem interromper a transmissão.</div>:feedRows.map((item,index)=><div key={item.id??index} style={{padding:'12px 18px',borderTop:`1px solid ${C.line}`,background:index===0?`${item.label?.color??C.a}09`:'transparent'}}><div style={{display:'flex',justifyContent:'space-between',gap:10}}><span style={{fontSize:7,color:item.label?.color??C.a,letterSpacing:'.14em'}}>{item.label?.text}</span><span style={{fontSize:7,color:C.dim}}>S{item.s0}–{item.s1} · {item.g0}–{item.g1}</span></div><b style={{display:'block',fontFamily:"'Barlow Condensed',sans-serif",fontSize:15,marginTop:6}}>{item.opportunityName?`${item.opportunityName} teve a chance`:(item.headline??item.label?.text)}</b><div style={{fontSize:7,color:C.dim,marginTop:4}}>{item.score} · {item.subline}</div></div>)}
        </aside>
      </section>
    </main>
  </div>;
}
