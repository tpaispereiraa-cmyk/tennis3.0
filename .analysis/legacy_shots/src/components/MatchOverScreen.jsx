/**
 * MatchOverScreen.jsx — Tela Pós-Jogo · Redesign Completo
 * Tabs: RESUMO · ESTATÍSTICAS · RALLIES · SAQUE · MAPAS
 */
import React, { useState, useMemo } from 'react';
import BounceMap from './BounceMap.jsx';
import ShotDirectionMap from './ShotDirectionMap.jsx';
import LandingMap from './LandingMap.jsx';
import ContactMap from './ContactMap.jsx';
import PatternMap from './PatternMap.jsx';
import PositionHeatmap from './PositionHeatmap.jsx';
import { SHOT_COLORS } from '../constants.js';
import { readHeat } from '../MatchHeat.js';
import { narrateMatch } from '../MatchNarrator.js';

const T = {
  bg:'#050609', bgPanel:'#0C0E14', bgCard:'#111318', bgHover:'#16191F',
  border:'rgba(255,255,255,0.06)', borderMid:'rgba(255,255,255,0.12)',
  cream:'#F2EDE4', dim:'rgba(242,237,228,0.55)', faint:'rgba(242,237,228,0.22)', ghost:'rgba(242,237,228,0.05)',
  clay:'#C4572A', gold:'#D4A820', lime:'#52C46A', blue:'#4A90C4', red:'#D45050',
  disp:"'Teko','Barlow Condensed',sans-serif",
  cond:"'Barlow Condensed','Teko',sans-serif",
  mono:"'Space Mono','DM Mono',monospace",
};
const SURFACE_COLOR = {CLAY:'#C4572A',GRASS:'#2E7D32',HARD:'#1565C0',INDOOR:'#6A1B9A'};
const SURFACE_LABEL = {CLAY:'Saibro',GRASS:'Grama',HARD:'Dura',INDOOR:'Indoor'};
const pct=(a,b)=>b>0?Math.round(a/b*100):0;
const avg=arr=>arr?.length?arr.reduce((a,b)=>a+b,0)/arr.length:0;
const fmtAvg=arr=>arr?.length?avg(arr).toFixed(1):'0.0';

function StatRow({label,valA,valB,fmtA,fmtB,higher=true}){
  const a=typeof valA==='number'?valA:parseFloat(valA)||0;
  const b=typeof valB==='number'?valB:parseFloat(valB)||0;
  const aWins=higher?a>=b:a<=b, bWins=higher?b>=a:b<=a;
  const cA=a===b?T.faint:aWins?T.cream:T.faint;
  const cB=a===b?T.faint:bWins?T.cream:T.faint;
  const tot=Math.max(a+b,1);
  return(
    <div style={{display:'grid',gridTemplateColumns:'1fr 160px 1fr',gap:8,alignItems:'center',padding:'7px 0',borderBottom:`1px solid ${T.border}`}}>
      <div style={{textAlign:'right'}}><span style={{fontFamily:T.disp,fontSize:24,fontWeight:700,color:cA,lineHeight:1}}>{fmtA??valA}</span></div>
      <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:4}}>
        <span style={{fontFamily:T.mono,fontSize:8,letterSpacing:2,color:T.faint,textTransform:'uppercase',textAlign:'center'}}>{label}</span>
        <div style={{width:'100%',display:'flex',height:2,overflow:'hidden',gap:1}}>
          <div style={{flex:a/tot,background:cA===T.faint?T.ghost:T.cream,transition:'flex 0.6s'}}/>
          <div style={{flex:b/tot,background:cB===T.faint?T.ghost:'rgba(242,237,228,0.38)',transition:'flex 0.6s'}}/>
        </div>
      </div>
      <div style={{textAlign:'left'}}><span style={{fontFamily:T.disp,fontSize:24,fontWeight:700,color:cB,lineHeight:1}}>{fmtB??valB}</span></div>
    </div>
  );
}

const TABS=[
  {id:'resumo',label:'RESUMO',icon:'✦'},
  {id:'stats',label:'ESTATÍSTICAS',icon:'≡'},
  {id:'rallies',label:'RALLIES',icon:'∿'},
  {id:'saque',label:'SAQUE',icon:'⊙'},
  {id:'mapas',label:'MAPAS',icon:'◈'},
];

function TabBar({active,setActive}){
  return(
    <div style={{display:'flex',background:T.bgPanel,borderBottom:`1px solid ${T.border}`,position:'sticky',top:0,zIndex:20}}>
      {TABS.map(tab=>{
        const on=active===tab.id;
        return(
          <button key={tab.id} onClick={()=>setActive(tab.id)} style={{
            flex:1,padding:'13px 6px',border:'none',cursor:'pointer',
            borderBottom:on?`2px solid ${T.cream}`:'2px solid transparent',
            background:on?T.ghost:'transparent',
            display:'flex',flexDirection:'column',alignItems:'center',gap:3,transition:'all 0.15s',
          }}>
            <span style={{fontFamily:T.disp,fontSize:16,color:on?T.cream:T.faint}}>{tab.icon}</span>
            <span style={{fontFamily:T.mono,fontSize:8,letterSpacing:2,textTransform:'uppercase',color:on?T.cream:T.faint}}>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function NarratorBlock({narration}){
  const [expanded,setExpanded]=useState(false);
  if(!narration) return(
    <div style={{padding:'24px',background:T.bgCard,border:`1px solid ${T.border}`,marginBottom:16}}>
      <span style={{fontFamily:T.mono,fontSize:10,color:T.faint}}>Narração indisponível</span>
    </div>
  );
  return(
    <div style={{marginBottom:20}}>
      <div style={{padding:'20px 24px 16px',background:T.bgCard,borderLeft:`3px solid ${T.clay}`,marginBottom:1}}>
        <div style={{fontFamily:T.mono,fontSize:8,letterSpacing:3,color:T.clay,textTransform:'uppercase',marginBottom:8}}>RELATÓRIO DA PARTIDA</div>
        <div style={{fontFamily:T.disp,fontSize:22,fontWeight:700,color:T.cream,lineHeight:1.25,marginBottom:12}}>{narration.headline}</div>
        {narration.tags?.length>0&&(
          <div style={{display:'flex',flexWrap:'wrap',gap:5}}>
            {narration.tags.map((tag,i)=>(
              <span key={i} style={{fontFamily:T.mono,fontSize:8,letterSpacing:2,textTransform:'uppercase',padding:'3px 8px',border:`1px solid ${T.borderMid}`,color:T.dim,background:T.ghost}}>{tag}</span>
            ))}
          </div>
        )}
      </div>
      <div style={{padding:'16px 24px',background:T.bgCard,borderLeft:`3px solid ${T.border}`,marginBottom:1}}>
        <div style={{fontFamily:T.mono,fontSize:8,letterSpacing:3,color:T.faint,textTransform:'uppercase',marginBottom:8}}>ANÁLISE TÁTICA</div>
        <p style={{fontFamily:T.cond,fontSize:15,color:T.cream,lineHeight:1.6,margin:0}}>{narration.tactical_summary}</p>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:1,marginBottom:1}}>
        {narration.turning_point&&(
          <div style={{padding:'14px 20px',background:T.bgCard,borderLeft:`3px solid ${T.gold}`}}>
            <div style={{fontFamily:T.mono,fontSize:8,letterSpacing:3,color:T.gold,textTransform:'uppercase',marginBottom:6}}>PONTO DE VIRADA</div>
            <p style={{fontFamily:T.cond,fontSize:13,color:T.dim,lineHeight:1.55,margin:0}}>{narration.turning_point}</p>
          </div>
        )}
        {narration.pattern_highlight&&(
          <div style={{padding:'14px 20px',background:T.bgCard,borderLeft:`3px solid ${T.blue}`}}>
            <div style={{fontFamily:T.mono,fontSize:8,letterSpacing:3,color:T.blue,textTransform:'uppercase',marginBottom:6}}>PADRÃO DOMINANTE</div>
            <p style={{fontFamily:T.cond,fontSize:13,color:T.dim,lineHeight:1.55,margin:0}}>{narration.pattern_highlight}</p>
          </div>
        )}
      </div>
      {narration.plan_vs_result&&(
        <div style={{padding:'14px 20px',background:T.bgCard,borderLeft:`3px solid ${T.lime}`,marginBottom:1}}>
          <div style={{fontFamily:T.mono,fontSize:8,letterSpacing:3,color:T.lime,textTransform:'uppercase',marginBottom:6}}>PLANO vs EXECUÇÃO</div>
          <p style={{fontFamily:T.cond,fontSize:13,color:T.dim,lineHeight:1.55,margin:0}}>{narration.plan_vs_result}</p>
        </div>
      )}
      {narration.full_report&&(
        <div style={{background:T.bgCard,borderLeft:`3px solid ${T.border}`}}>
          <button onClick={()=>setExpanded(e=>!e)} style={{width:'100%',padding:'12px 20px',background:'none',border:'none',cursor:'pointer',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <span style={{fontFamily:T.mono,fontSize:8,letterSpacing:3,color:T.faint,textTransform:'uppercase'}}>RELATÓRIO COMPLETO</span>
            <span style={{fontFamily:T.mono,fontSize:10,color:T.faint}}>{expanded?'▲':'▼'}</span>
          </button>
          {expanded&&(
            <div style={{padding:'0 20px 16px'}}>
              <p style={{fontFamily:T.cond,fontSize:13,color:T.faint,lineHeight:1.7,margin:0,whiteSpace:'pre-line'}}>{narration.full_report}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SetScoreline({p0,p1}){
  const sh0=p0.setsHistory??[],sh1=p1.setsHistory??[];
  const nSets=Math.max(sh0.length,sh1.length);
  return(
    <div style={{marginBottom:20}}>
      <div style={{fontFamily:T.mono,fontSize:8,letterSpacing:3,color:T.faint,textTransform:'uppercase',marginBottom:10}}>RESULTADO POR SET</div>
      <div style={{display:'flex',gap:4}}>
        {Array.from({length:nSets},(_,i)=>{
          const g0=sh0[i]??0,g1=sh1[i]??0;
          const w0=g0>g1,w1=g1>g0;
          const isTb=g0===7||g1===7;
          return(
            <div key={i} style={{flex:1,padding:'14px 10px',background:T.bgCard,border:`1px solid ${T.border}`,display:'flex',flexDirection:'column',alignItems:'center',gap:6}}>
              <div style={{fontFamily:T.mono,fontSize:7,letterSpacing:2,color:T.faint,textTransform:'uppercase'}}>SET {i+1}{isTb?' TB':''}</div>
              <div style={{display:'flex',alignItems:'baseline',gap:8}}>
                <span style={{fontFamily:T.disp,fontSize:36,fontWeight:800,lineHeight:1,color:w0?T.cream:T.faint}}>{g0}</span>
                <span style={{fontFamily:T.disp,fontSize:18,color:T.faint}}>–</span>
                <span style={{fontFamily:T.disp,fontSize:36,fontWeight:800,lineHeight:1,color:w1?T.cream:T.faint}}>{g1}</span>
              </div>
              <div style={{display:'flex',gap:3,width:'100%'}}>
                <div style={{flex:g0,height:2,background:w0?T.cream:T.ghost}}/>
                <div style={{flex:g1,height:2,background:w1?'rgba(242,237,228,0.35)':T.ghost}}/>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function KpiGrid({p0,p1,maxRally}){
  const s0=p0.stats,s1=p1.stats;
  const w0=p0.sets>p1.sets;
  const wp=w0?p0:p1,sw=w0?s0:s1;
  const allRallies=[...(s0.rallyLengths??[]),...(s1.rallyLengths??[])];
  const matchAvg=allRallies.length?avg(allRallies).toFixed(1):'—';
  const holdW=pct(sw.gamesHeld??0,sw.gamesServed??1);
  const breakW=pct(sw.gamesConverted??0,sw.gamesReturned??1);
  const kpis=[
    {label:'RALLY MÉDIO',val:matchAvg,sub:'golpes por ponto',color:T.blue},
    {label:'MAIOR RALLY',val:maxRally,sub:'golpes max',color:T.gold},
    {label:'HOLD RATE',val:`${holdW}%`,sub:wp.name.split(' ')[0],color:T.lime},
    {label:'BREAK RATE',val:`${breakW}%`,sub:wp.name.split(' ')[0],color:T.clay},
  ];
  return(
    <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:1,marginBottom:20}}>
      {kpis.map(k=>(
        <div key={k.label} style={{padding:'16px',background:T.bgCard,borderLeft:`2px solid ${k.color}`}}>
          <div style={{fontFamily:T.mono,fontSize:7,letterSpacing:2,color:k.color,textTransform:'uppercase',marginBottom:6}}>{k.label}</div>
          <div style={{fontFamily:T.disp,fontSize:28,fontWeight:800,color:T.cream,lineHeight:1}}>{k.val}</div>
          <div style={{fontFamily:T.cond,fontSize:10,color:T.faint,marginTop:4}}>{k.sub}</div>
        </div>
      ))}
    </div>
  );
}

const RALLY_BUCKETS=[
  {label:'1–3',min:1,max:3},{label:'4–6',min:4,max:6},{label:'7–9',min:7,max:9},
  {label:'10–14',min:10,max:14},{label:'15–19',min:15,max:19},{label:'20+',min:20,max:999},
];

function RallyHistogram({p0,p1}){
  const merged=[...(p0.stats.rallyLengths??[]),...(p1.stats.rallyLengths??[])];
  const counts=RALLY_BUCKETS.map(b=>({...b,n:merged.filter(r=>r>=b.min&&r<=b.max).length}));
  const maxN=Math.max(...counts.map(c=>c.n),1);
  const total=merged.length||1;
  return(
    <div style={{padding:'20px 24px',background:T.bgCard,marginBottom:1}}>
      <div style={{fontFamily:T.mono,fontSize:8,letterSpacing:3,color:T.faint,textTransform:'uppercase',marginBottom:16}}>DISTRIBUIÇÃO DE RALLY</div>
      <div style={{display:'flex',alignItems:'flex-end',gap:8,height:140}}>
        {counts.map(c=>{
          const h=(c.n/maxN)*100;
          const pctVal=Math.round(c.n/total*100);
          const color=c.min>=20?T.gold:c.min>=15?T.clay:c.min>=10?T.blue:c.min>=7?T.lime:T.dim;
          return(
            <div key={c.label} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:4}}>
              <span style={{fontFamily:T.mono,fontSize:8,color:pctVal>0?color:T.faint,lineHeight:1}}>{pctVal>0?`${pctVal}%`:''}</span>
              <div style={{width:'100%',background:T.ghost,position:'relative',height:100}}>
                <div style={{position:'absolute',bottom:0,width:'100%',height:`${h}%`,background:color,opacity:0.75,transition:'height 0.6s ease'}}/>
              </div>
              <span style={{fontFamily:T.mono,fontSize:7,color:T.faint,letterSpacing:1}}>{c.label}</span>
              <span style={{fontFamily:T.disp,fontSize:13,color:T.dim}}>{c.n}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function WinnerErrorChart({p0,p1}){
  const s0=p0.stats,s1=p1.stats;
  const cats=[
    {label:'WINNERS',a:s0.winners??0,b:s1.winners??0,color:T.lime},
    {label:'ERROS N-F',a:s0.unforcedErrors??0,b:s1.unforcedErrors??0,color:T.red},
    {label:'ERROS F',a:s0.forcedErrors??0,b:s1.forcedErrors??0,color:T.clay},
    {label:'ACES',a:s0.aces??0,b:s1.aces??0,color:T.gold},
  ];
  const maxVal=Math.max(...cats.flatMap(c=>[c.a,c.b]),1);
  return(
    <div style={{padding:'20px 24px',background:T.bgCard,marginBottom:1}}>
      <div style={{fontFamily:T.mono,fontSize:8,letterSpacing:3,color:T.faint,textTransform:'uppercase',marginBottom:12}}>WINNERS & ERROS</div>
      <div style={{display:'flex',gap:16,marginBottom:14}}>
        {[p0,p1].map(p=>(
          <div key={p.id} style={{display:'flex',alignItems:'center',gap:5}}>
            <div style={{width:10,height:3,background:p.color}}/>
            <span style={{fontFamily:T.cond,fontSize:10,color:T.dim}}>{p.name.split(' ')[0]}</span>
          </div>
        ))}
      </div>
      <div style={{display:'flex',flexDirection:'column',gap:14}}>
        {cats.map(c=>(
          <div key={c.label}>
            <div style={{fontFamily:T.mono,fontSize:7,letterSpacing:2,color:T.faint,marginBottom:6}}>{c.label}</div>
            {[{p:p0,v:c.a},{p:p1,v:c.b}].map(({p,v})=>(
              <div key={p.id} style={{display:'flex',alignItems:'center',gap:8,marginBottom:3}}>
                <div style={{width:28,textAlign:'right',fontFamily:T.disp,fontSize:16,color:T.cream,lineHeight:1}}>{v}</div>
                <div style={{flex:1,height:6,background:T.ghost}}>
                  <div style={{height:'100%',width:`${Math.round(v/maxVal*100)}%`,background:c.color,opacity:0.7,transition:'width 0.5s'}}/>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function RallyTrendLine({p0,p1}){
  const merged=[...(p0.stats.rallyLengths??[]),...(p1.stats.rallyLengths??[])].slice(0,200);
  if(merged.length<5) return null;
  const W=8,cw=520,ch=90,P={l:30,r:10,t:10,b:22};
  const pts=[];
  for(let i=W-1;i<merged.length;i++){
    const sl=merged.slice(i-W+1,i+1);
    pts.push({x:i,y:sl.reduce((a,b)=>a+b,0)/W});
  }
  const maxY=Math.max(...pts.map(p=>p.y),12);
  const xs=i=>P.l+(i/(merged.length-1))*(cw-P.l-P.r);
  const ys=v=>P.t+(1-v/maxY)*(ch-P.t-P.b);
  const path=pts.map((p,i)=>`${i===0?'M':'L'}${xs(p.x).toFixed(1)},${ys(p.y).toFixed(1)}`).join(' ');
  const avgVal=avg(merged);
  return(
    <div style={{padding:'20px 24px',background:T.bgCard}}>
      <div style={{fontFamily:T.mono,fontSize:8,letterSpacing:3,color:T.faint,textTransform:'uppercase',marginBottom:12}}>MÉDIA MÓVEL DE RALLY (janela: 8 pts)</div>
      <svg width="100%" viewBox={`0 0 ${cw} ${ch}`} preserveAspectRatio="none" style={{maxHeight:90}}>
        {[4,8,12].map(v=>(
          <g key={v}>
            <line x1={P.l} x2={cw-P.r} y1={ys(v)} y2={ys(v)} stroke={T.border} strokeWidth={1}/>
            <text x={P.l-4} y={ys(v)+3} fill={T.faint} fontSize={8} textAnchor="end">{v}</text>
          </g>
        ))}
        <line x1={P.l} x2={cw-P.r} y1={ys(avgVal)} y2={ys(avgVal)} stroke="rgba(212,168,32,0.3)" strokeWidth={1} strokeDasharray="4,3"/>
        <text x={cw-P.r+2} y={ys(avgVal)+3} fill={T.gold} fontSize={7}>avg</text>
        <path d={path} fill="none" stroke={T.blue} strokeWidth={2}/>
        {pts.filter((_,i)=>i%10===0).map((p,i)=>(
          <circle key={i} cx={xs(p.x)} cy={ys(p.y)} r={2} fill={T.blue} opacity={0.6}/>
        ))}
      </svg>
    </div>
  );
}

function ShotDistribution({p0,p1}){
  return(
    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:1}}>
      {[p0,p1].map(p=>{
        const s=p.stats;
        const shots=Object.entries(s.byType??{}).filter(([,v])=>v>0).sort(([,a],[,b])=>b-a);
        const total=shots.reduce((a,[,v])=>a+v,0)||1;
        const maxV=shots[0]?.[1]||1;
        return(
          <div key={p.id} style={{padding:'16px 20px',background:T.bgCard}}>
            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:14}}>
              <div style={{width:3,height:20,background:p.color}}/>
              <span style={{fontFamily:T.disp,fontSize:18,color:T.cream}}>{p.name}</span>
            </div>
            {shots.map(([k,v])=>(
              <div key={k} style={{marginBottom:7}}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:3}}>
                  <span style={{fontFamily:T.cond,fontSize:10,letterSpacing:1,color:T.faint,textTransform:'uppercase'}}>{k}</span>
                  <span style={{fontFamily:T.disp,fontSize:14,color:T.cream}}>{v} <span style={{color:T.faint,fontSize:10}}>{Math.round(v/total*100)}%</span></span>
                </div>
                <div style={{height:3,background:T.ghost}}>
                  <div style={{height:'100%',width:`${Math.round(v/maxV*100)}%`,background:SHOT_COLORS[k]||p.color,opacity:0.7}}/>
                </div>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

function StatBarServe({label,valA,valB,note}){
  const a=parseInt(valA)||0,b=parseInt(valB)||0;
  const maxV=Math.max(a,b,1);
  const qA=a>b?T.cream:T.faint,qB=b>a?T.cream:T.faint;
  return(
    <div style={{padding:'8px 0',borderBottom:`1px solid ${T.border}`,display:'grid',gridTemplateColumns:'1fr 140px 1fr',gap:8,alignItems:'center'}}>
      <div style={{textAlign:'right',fontFamily:T.disp,fontSize:20,fontWeight:600,color:qA}}>{valA}</div>
      <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:4}}>
        <span style={{fontFamily:T.mono,fontSize:8,letterSpacing:2,textTransform:'uppercase',color:T.faint,textAlign:'center'}}>{label}</span>
        {note&&<span style={{fontFamily:T.mono,fontSize:7,color:'#1e2025',letterSpacing:1}}>{note}</span>}
        <div style={{width:'100%',display:'flex',height:2,gap:1}}>
          <div style={{flex:a/maxV,background:qA===T.cream?T.cream:T.ghost}}/>
          <div style={{flex:b/maxV,background:qB===T.cream?'rgba(242,237,228,0.4)':T.ghost}}/>
        </div>
      </div>
      <div style={{textAlign:'left',fontFamily:T.disp,fontSize:20,fontWeight:600,color:qB}}>{valB}</div>
    </div>
  );
}

function ServeTimeline({log,color}){
  const W=8;
  if(!log||log.length<W+1) return <div style={{color:T.faint,fontSize:11}}>dados insuficientes</div>;
  const pts=[];
  for(let i=W-1;i<log.length;i++){
    const sl=log.slice(i-W+1,i+1);
    pts.push({x:i,y:sl.filter(l=>l.won).length/W});
  }
  const cw=400,ch=72,P={l:28,r:8,t:8,b:18};
  const ATP=0.63;
  const xs=i=>P.l+(i/Math.max(log.length-1,1))*(cw-P.l-P.r);
  const ys=v=>P.t+(1-v)*(ch-P.t-P.b);
  const path=pts.map((p,i)=>`${i===0?'M':'L'}${xs(p.x).toFixed(1)},${ys(p.y).toFixed(1)}`).join(' ');
  const area=path+` L${xs(pts[pts.length-1].x).toFixed(1)},${ys(0).toFixed(1)} L${xs(pts[0].x).toFixed(1)},${ys(0).toFixed(1)} Z`;
  return(
    <svg width="100%" viewBox={`0 0 ${cw} ${ch}`} style={{maxHeight:72}}>
      {[0,0.5,1].map(v=>(
        <g key={v}>
          <line x1={P.l} x2={cw-P.r} y1={ys(v)} y2={ys(v)} stroke={T.border} strokeWidth={1}/>
          <text x={P.l-3} y={ys(v)+4} fill={T.faint} fontSize={8} textAnchor="end">{Math.round(v*100)}%</text>
        </g>
      ))}
      <line x1={P.l} x2={cw-P.r} y1={ys(ATP)} y2={ys(ATP)} stroke="rgba(242,237,230,0.18)" strokeWidth={1} strokeDasharray="4,3"/>
      <text x={cw-P.r+2} y={ys(ATP)+3} fill="rgba(242,237,230,0.3)" fontSize={7}>ATP</text>
      <path d={area} fill={color} opacity={0.07}/>
      <path d={path} fill="none" stroke={color} strokeWidth={1.5}/>
      {pts.map((p,i)=>(
        <circle key={i} cx={xs(p.x)} cy={ys(p.y)} r={2} fill={p.y>=ATP?T.lime:T.red} opacity={0.7}/>
      ))}
    </svg>
  );
}

function PlayerServeCard({p}){
  const s=p?.stats; if(!s) return null;
  const log=s.serveLog||[];
  const fmtPct=(a,b)=>b>0?`${Math.round(a/b*100)}%`:'—';
  const avgKmhFn=arr=>arr.length?Math.round(arr.reduce((a,l)=>a+(l.kmh||0),0)/arr.length):null;
  const t1=s.serve1WonPoints+s.serve1LostPoints;
  const t2=s.serve2WonPoints+s.serve2LostPoints;
  const holdPct=s.gamesServed>0?`${Math.round(s.gamesHeld/s.gamesServed*100)}%`:'—';
  const breakPct=s.gamesReturned>0?`${Math.round(s.gamesConverted/s.gamesReturned*100)}%`:'—';
  const avg1=avgKmhFn(log.filter(l=>l.isFirst!==false));
  const avg2=avgKmhFn(log.filter(l=>l.isFirst===false));
  const dirData=['T','BODY','WIDE'].map(dir=>{
    const pts=log.filter(l=>l.dir===dir);
    const won=pts.filter(l=>l.won).length;
    return{label:dir,value:pts.length,won:pts.length>0?won/pts.length:null};
  });
  const grd=(v,lo,hi,good,mid)=>parseInt(v)>=hi?good:parseInt(v)<lo?T.red:mid||T.gold;
  return(
    <div style={{flex:1,padding:'18px 20px',borderRight:`1px solid ${T.border}`}}>
      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:16,paddingBottom:12,borderBottom:`1px solid ${T.border}`}}>
        <div style={{width:3,height:28,background:p.color}}/>
        <div>
          <div style={{fontFamily:T.disp,fontSize:18,color:T.cream}}>{p.name}</div>
          <div style={{fontFamily:T.mono,fontSize:8,color:T.faint,letterSpacing:2}}>{p.styleData?.abbr}</div>
        </div>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6,marginBottom:16}}>
        {[
          ['HOLD RATE',holdPct,`${s.gamesHeld??0}/${s.gamesServed??0}`,grd(holdPct,65,78,T.lime)],
          ['BREAK RATE',breakPct,`${s.gamesConverted??0}/${s.gamesReturned??0}`,grd(breakPct,15,25,T.lime)],
          ['WIN% 1º SAQ.',fmtPct(s.serve1WonPoints,t1),'ATP: ~71%',grd(fmtPct(s.serve1WonPoints,t1),55,68,T.lime)],
          ['WIN% 2º SAQ.',fmtPct(s.serve2WonPoints,t2),'ATP: ~50%',grd(fmtPct(s.serve2WonPoints,t2),42,50,T.lime)],
          ['VEL. 1º SAQUE',avg1?`${avg1}km/h`:'—','ATP: 185-210',avg1>=180?T.lime:avg1<155?T.red:T.gold],
          ['VEL. 2º SAQUE',avg2?`${avg2}km/h`:'—','ATP: 145-165',avg2>=145?T.lime:avg2<120?T.red:T.gold],
        ].map(([lbl,val,note,clr])=>(
          <div key={lbl} style={{background:T.bgCard,padding:'8px 10px',borderLeft:`2px solid ${clr||T.faint}`}}>
            <div style={{fontFamily:T.mono,fontSize:7,color:T.faint,letterSpacing:2,textTransform:'uppercase',marginBottom:3}}>{lbl}</div>
            <div style={{fontFamily:T.disp,fontSize:18,fontWeight:700,color:clr||T.cream,lineHeight:1}}>{val}</div>
            <div style={{fontFamily:T.cond,fontSize:8,color:'#1e2025',marginTop:2}}>{note}</div>
          </div>
        ))}
      </div>
      {dirData.some(d=>d.value>0)&&(
        <div style={{marginBottom:14}}>
          <div style={{fontFamily:T.mono,fontSize:8,color:T.faint,letterSpacing:2,textTransform:'uppercase',marginBottom:8}}>WIN% POR DIREÇÃO</div>
          {dirData.filter(d=>d.value>0).map(d=>{
            const pv=d.won!=null?Math.round(d.won*100):null;
            const clr=pv>=63?T.lime:pv>=50?T.cream:T.red;
            return(
              <div key={d.label} style={{marginBottom:6}}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:3}}>
                  <span style={{fontFamily:T.cond,fontSize:10,color:T.faint}}>{d.label}</span>
                  <span style={{fontFamily:T.disp,fontSize:13,color:clr}}>{pv!=null?`${pv}%`:'—'} <span style={{color:T.faint,fontSize:10}}>({d.value})</span></span>
                </div>
                <div style={{height:3,background:T.ghost,position:'relative'}}>
                  <div style={{height:'100%',width:`${pv??0}%`,background:clr,opacity:0.7}}/>
                  <div style={{position:'absolute',left:'63%',top:0,bottom:0,width:1,background:'rgba(255,255,255,0.15)'}}/>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {log.length>=4&&(
        <div>
          <div style={{fontFamily:T.mono,fontSize:8,color:T.faint,letterSpacing:2,textTransform:'uppercase',marginBottom:8}}>WIN% SAQUE — janela 8pts</div>
          <ServeTimeline log={log} color={p.color}/>
        </div>
      )}
    </div>
  );
}

function ServeTab({p0,p1}){
  const s0=p0?.stats,s1=p1?.stats;
  if(!s0||!s1) return <div style={{padding:32,color:T.faint}}>Sem dados de saque.</div>;
  const fp=(a,b)=>b>0?`${Math.round(a/b*100)}%`:'—';
  const t01=s0.serve1WonPoints+s0.serve1LostPoints;
  const t02=s0.serve2WonPoints+s0.serve2LostPoints;
  const t11=s1.serve1WonPoints+s1.serve1LostPoints;
  const t12=s1.serve2WonPoints+s1.serve2LostPoints;
  return(
    <div style={{color:T.cream}}>
      <div style={{padding:'14px 24px 8px',borderBottom:`1px solid ${T.border}`}}>
        <div style={{fontFamily:T.mono,fontSize:9,letterSpacing:4,color:T.faint,textTransform:'uppercase',marginBottom:4}}>COMPARATIVO</div>
        <StatBarServe label="HOLD RATE" note="ATP ref: ~81%" valA={fp(s0.gamesHeld,s0.gamesServed)} valB={fp(s1.gamesHeld,s1.gamesServed)}/>
        <StatBarServe label="WIN% 1º SAQUE" note="ATP ref: ~71%" valA={fp(s0.serve1WonPoints,t01)} valB={fp(s1.serve1WonPoints,t11)}/>
        <StatBarServe label="WIN% 2º SAQUE" note="ATP ref: ~50%" valA={fp(s0.serve2WonPoints,t02)} valB={fp(s1.serve2WonPoints,t12)}/>
        <StatBarServe label="BREAK RATE" note="ATP ref: ~19-23%" valA={fp(s0.gamesConverted,s0.gamesReturned)} valB={fp(s1.gamesConverted,s1.gamesReturned)}/>
        <StatBarServe label="WIN% SACANDO" valA={fp(s0.pointsWonServing,(s0.pointsWonServing??0)+(s0.pointsLostServing??0))} valB={fp(s1.pointsWonServing,(s1.pointsWonServing??0)+(s1.pointsLostServing??0))}/>
        <StatBarServe label="WIN% RECEBENDO" valA={fp(s0.pointsWonReturning,(s0.pointsWonReturning??0)+(s0.pointsLostReturning??0))} valB={fp(s1.pointsWonReturning,(s1.pointsWonReturning??0)+(s1.pointsLostReturning??0))}/>
      </div>
      <div style={{display:'flex'}}>
        <PlayerServeCard p={p0}/>
        <PlayerServeCard p={p1}/>
      </div>
    </div>
  );
}

const MAP_TABS=[
  {id:'bounce',label:'Quiques',icon:'●'},{id:'direction',label:'Direção',icon:'→'},
  {id:'landing',label:'Alvo',icon:'◆'},{id:'contact',label:'Contato',icon:'✦'},
  {id:'patterns',label:'Padrões',icon:'≈'},{id:'heatmap',label:'Posição',icon:'🌡'},
];

function MapsTab({bounceLog,debugEvents,p0,p1}){
  const [activeMap,setActiveMap]=useState('bounce');
  return(
    <div>
      <div style={{display:'flex',background:T.bgPanel,borderBottom:`1px solid ${T.border}`}}>
        {MAP_TABS.map(mt=>{
          const on=activeMap===mt.id;
          return(
            <button key={mt.id} onClick={()=>setActiveMap(mt.id)} style={{
              flex:1,padding:'10px 4px',border:'none',cursor:'pointer',
              borderBottom:on?`2px solid ${T.clay}`:'2px solid transparent',
              background:on?T.ghost:'transparent',
              display:'flex',flexDirection:'column',alignItems:'center',gap:2,
            }}>
              <span style={{fontFamily:T.disp,fontSize:14,color:on?T.cream:T.faint}}>{mt.icon}</span>
              <span style={{fontFamily:T.mono,fontSize:7,letterSpacing:1,textTransform:'uppercase',color:on?T.cream:T.faint}}>{mt.label}</span>
            </button>
          );
        })}
      </div>
      <div>
        {activeMap==='bounce'&&<BounceMap bounceLog={bounceLog} p0={p0} p1={p1}/>}
        {activeMap==='direction'&&<ShotDirectionMap debugEvents={debugEvents} p0={p0} p1={p1}/>}
        {activeMap==='landing'&&<LandingMap bounceLog={bounceLog} p0={p0} p1={p1}/>}
        {activeMap==='contact'&&<ContactMap debugEvents={debugEvents} p0={p0} p1={p1}/>}
        {activeMap==='patterns'&&<PatternMap debugEvents={debugEvents} p0={p0} p1={p1}/>}
        {activeMap==='heatmap'&&<PositionHeatmap p0={p0} p1={p1}/>}
      </div>
    </div>
  );
}

export default function MatchOverScreen({p0,p1,maxRally,totalPoints,bounceLog,debugEvents=[],heat,courtMeta,onNew,onSame}){
  const [tab,setTab]=useState('resumo');
  if(!p0||!p1) return null;

  const winner=p0.sets>p1.sets?p0:p1;
  const loser=winner===p0?p1:p0;
  const s0=p0.stats,s1=p1.stats;
  const heatData=heat?readHeat({heat}):null;
  const pct1A=s0.serve1Total>0?Math.round(s0.serve1In/s0.serve1Total*100):0;
  const pct1B=s1.serve1Total>0?Math.round(s1.serve1In/s1.serve1Total*100):0;
  const netPA=s0.netApproaches>0?Math.round(s0.netPointsWon/s0.netApproaches*100):0;
  const netPB=s1.netApproaches>0?Math.round(s1.netPointsWon/s1.netApproaches*100):0;
  const avgA=fmtAvg(s0.rallyLengths),avgB=fmtAvg(s1.rallyLengths);

  const sh0=p0.setsHistory??[],sh1=p1.setsHistory??[];
  const setsDetail=sh0.map((g,i)=>[g,sh1[i]??0]);

  const surfKey=(courtMeta?.surface??'HARD').toUpperCase();
  const surfColor=SURFACE_COLOR[surfKey]||T.clay;
  const surfLabel=SURFACE_LABEL[surfKey]||'Dura';

  const narration=useMemo(()=>{
    try{
      const winnerIsP0=p0.sets>p1.sets;
      const result={winner:winnerIsP0?p0:p1,stats:{a:p0.stats,b:p1.stats},setsDetail,gs:{players:[p0,p1]},log:[]};
      return narrateMatch(winnerIsP0?p0:p1,winnerIsP0?p1:p0,result,surfKey);
    }catch(e){console.warn('[MatchOverScreen] narrator failed:',e);return null;}
  // eslint-disable-next-line
  },[p0?.name,p1?.name]);

  return(
    <div style={{width:'100%',minHeight:'100vh',background:T.bg,color:T.cream,fontFamily:T.cond,display:'flex',flexDirection:'column'}}>

      {/* HEADER */}
      <div style={{position:'relative',overflow:'hidden',background:T.bgPanel,borderBottom:`1px solid ${surfColor}44`,flexShrink:0}}>
        <div style={{position:'absolute',top:0,left:0,right:0,height:3,background:`linear-gradient(90deg,${surfColor},${surfColor}00)`}}/>
        <div style={{padding:'24px 32px 20px'}}>
          <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:16}}>
            <div style={{width:2,height:16,background:surfColor}}/>
            <span style={{fontFamily:T.mono,fontSize:8,letterSpacing:4,color:surfColor,textTransform:'uppercase'}}>{surfLabel}</span>
            {courtMeta?.name&&<span style={{fontFamily:T.mono,fontSize:8,letterSpacing:3,color:T.faint}}>· {courtMeta.name.toUpperCase()}</span>}
          </div>
          <div style={{display:'flex',alignItems:'center',gap:0}}>
            <div style={{flex:1}}>
              <div style={{fontFamily:T.mono,fontSize:7,letterSpacing:3,color:T.faint,textTransform:'uppercase',marginBottom:6}}>VENCEDOR</div>
              <div style={{fontFamily:T.disp,fontSize:'clamp(32px,5vw,60px)',fontWeight:900,color:T.cream,lineHeight:0.9}}>{winner.name}</div>
              <div style={{fontFamily:T.cond,fontSize:11,letterSpacing:2,color:T.faint,marginTop:6,display:'flex',alignItems:'center',gap:6}}>
                <div style={{width:8,height:8,background:winner.color,borderRadius:'50%'}}/>
                {winner.styleData?.icon} {winner.styleData?.label}
              </div>
            </div>
            <div style={{textAlign:'center',padding:'0 32px',borderLeft:`1px solid ${T.border}`,borderRight:`1px solid ${T.border}`}}>
              <div style={{fontFamily:T.disp,fontSize:'clamp(48px,8vw,96px)',fontWeight:900,letterSpacing:-4,color:T.cream,lineHeight:0.85}}>{p0.sets}–{p1.sets}</div>
              <div style={{fontFamily:T.mono,fontSize:8,letterSpacing:3,color:T.faint,marginTop:4}}>{setsDetail.length} SETS · {totalPoints} PTS</div>
              {heatData&&(
                <div style={{display:'inline-flex',alignItems:'center',gap:6,marginTop:10,padding:'5px 12px',border:`1px solid ${heatData.tier.color}55`,borderLeft:`2px solid ${heatData.tier.color}`,background:`${heatData.tier.color}0A`}}>
                  <span style={{fontSize:10}}>🌡</span>
                  <span style={{fontFamily:T.disp,fontSize:20,fontWeight:800,color:heatData.tier.color}}>{heatData.peak}</span>
                  <span style={{fontFamily:T.mono,fontSize:7,color:`${heatData.tier.color}88`,letterSpacing:2}}>PEAK · {heatData.tier.label}</span>
                </div>
              )}
            </div>
            <div style={{flex:1,textAlign:'right'}}>
              <div style={{fontFamily:T.mono,fontSize:7,letterSpacing:3,color:T.faint,textTransform:'uppercase',marginBottom:6}}>DERROTADO</div>
              <div style={{fontFamily:T.disp,fontSize:'clamp(20px,3.5vw,42px)',fontWeight:700,color:T.faint,lineHeight:0.9}}>{loser.name}</div>
              <div style={{fontFamily:T.cond,fontSize:11,letterSpacing:2,color:'rgba(242,237,228,0.2)',marginTop:6}}>{loser.styleData?.icon} {loser.styleData?.label}</div>
            </div>
          </div>
        </div>
      </div>

      <TabBar active={tab} setActive={setTab}/>

      <div style={{flex:1,overflowY:'auto'}}>

        {tab==='resumo'&&(
          <div style={{padding:'20px 24px 32px'}}>
            <SetScoreline p0={p0} p1={p1}/>
            <KpiGrid p0={p0} p1={p1} maxRally={maxRally}/>
            <NarratorBlock narration={narration}/>
          </div>
        )}

        {tab==='stats'&&(
          <div style={{padding:'20px 24px 32px'}}>
            <div style={{display:'grid',gridTemplateColumns:'1fr 160px 1fr',gap:8,paddingBottom:12,marginBottom:4,borderBottom:`1px solid ${T.border}`}}>
              <div style={{fontFamily:T.disp,fontSize:20,color:p0===winner?T.cream:T.faint}}>{p0.name}</div>
              <div style={{textAlign:'center',fontFamily:T.mono,fontSize:8,letterSpacing:3,color:T.faint,textTransform:'uppercase',alignSelf:'center'}}>Estatística</div>
              <div style={{fontFamily:T.disp,fontSize:20,color:p1===winner?T.cream:T.faint,textAlign:'right'}}>{p1.name}</div>
            </div>
            <StatRow label="Aces" valA={s0.aces} valB={s1.aces}/>
            <StatRow label="Duplas Faltas" valA={s0.doubleFaults} valB={s1.doubleFaults} higher={false}/>
            <StatRow label="1º Saque Dentro" valA={pct1A} valB={pct1B} fmtA={`${pct1A}%`} fmtB={`${pct1B}%`}/>
            <StatRow label="Vel. 1º Saque" valA={Math.round(s0.serve1AvgKmh||0)} valB={Math.round(s1.serve1AvgKmh||0)} fmtA={`${Math.round(s0.serve1AvgKmh||0)}km/h`} fmtB={`${Math.round(s1.serve1AvgKmh||0)}km/h`}/>
            <StatRow label="Winners" valA={s0.winners} valB={s1.winners}/>
            <StatRow label="Erros Não-Forçados" valA={s0.unforcedErrors} valB={s1.unforcedErrors} higher={false}/>
            <StatRow label="Erros Forçados" valA={s0.forcedErrors} valB={s1.forcedErrors} higher={false}/>
            <StatRow label="Subidas à Rede" valA={s0.netApproaches} valB={s1.netApproaches}/>
            <StatRow label="% Pontos na Rede" valA={netPA} valB={netPB} fmtA={`${netPA}%`} fmtB={`${netPB}%`}/>
            <StatRow label="Rally Médio" valA={parseFloat(avgA)} valB={parseFloat(avgB)} fmtA={avgA} fmtB={avgB}/>
            <StatRow label="Maior Rally" valA={maxRally} valB={maxRally}/>
            <StatRow label="Hold Rate" valA={pct(s0.gamesHeld??0,s0.gamesServed??1)} valB={pct(s1.gamesHeld??0,s1.gamesServed??1)} fmtA={`${pct(s0.gamesHeld??0,s0.gamesServed??1)}%`} fmtB={`${pct(s1.gamesHeld??0,s1.gamesServed??1)}%`}/>
            <StatRow label="Break Rate" valA={pct(s0.gamesConverted??0,s0.gamesReturned??1)} valB={pct(s1.gamesConverted??0,s1.gamesReturned??1)} fmtA={`${pct(s0.gamesConverted??0,s0.gamesReturned??1)}%`} fmtB={`${pct(s1.gamesConverted??0,s1.gamesReturned??1)}%`}/>
            <StatRow label="Tiebreaks Ganhos" valA={s0.tiebreaksWon??0} valB={s1.tiebreaksWon??0}/>
            <StatRow label="Match Points Salvos" valA={s0.matchPointsSaved??0} valB={s1.matchPointsSaved??0}/>
            <div style={{marginTop:20}}><ShotDistribution p0={p0} p1={p1}/></div>
          </div>
        )}

        {tab==='rallies'&&(
          <div style={{padding:'20px 24px 32px'}}>
            <RallyHistogram p0={p0} p1={p1}/>
            <div style={{height:1}}/>
            <WinnerErrorChart p0={p0} p1={p1}/>
            <div style={{height:1}}/>
            <RallyTrendLine p0={p0} p1={p1}/>
          </div>
        )}

        {tab==='saque'&&<ServeTab p0={p0} p1={p1}/>}

        {tab==='mapas'&&<MapsTab bounceLog={bounceLog} debugEvents={debugEvents} p0={p0} p1={p1}/>}
      </div>

      <div style={{height:60,flexShrink:0,display:'flex',gap:1,borderTop:`1px solid ${T.border}`,background:T.bgPanel}}>
        <button onClick={onSame} style={{flex:1,height:'100%',border:'none',cursor:'pointer',fontFamily:T.disp,fontSize:18,fontWeight:700,letterSpacing:4,textTransform:'uppercase',background:T.cream,color:T.bg}}>↺ Revanche</button>
        <button onClick={onNew} style={{flex:1,height:'100%',border:'none',cursor:'pointer',fontFamily:T.disp,fontSize:18,fontWeight:700,letterSpacing:4,textTransform:'uppercase',background:'transparent',color:T.faint,borderLeft:`1px solid ${T.border}`}}>Nova Partida</button>
      </div>
    </div>
  );
}
