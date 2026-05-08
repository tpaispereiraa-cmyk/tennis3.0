const fs = require('fs');
const path = 'C:/Users/tpais/OneDrive/AppData/Desktop/TENNIS.E2.0/src/components/UniverseManager.jsx';
let text = fs.readFileSync(path, 'latin1');

const oldCardsStart = `          [\n            {\n              id:'compact',`;
const oldCardsEnd = `          ].filter(opt => opt.id !== 'deep-story').map(opt => (\n`;
const oldStartIdx = text.indexOf(oldCardsStart);
const oldEndIdx = text.indexOf(oldCardsEnd, oldStartIdx);
if (oldStartIdx === -1 || oldEndIdx === -1) throw new Error('cards block not found');
text = text.slice(0, oldStartIdx) + `          {[\n            {\n              id:'compact',\n              title:'TV CURTA',\n              sub:'So os pontos de pressao, virada e fechamento. Vai direto ao nervo da partida.',\n              vibe:'Suspense maximo',\n              color:'#E8C84A',\n              icon:'●',\n            },\n            {\n              id:'highlights',\n              title:'HIGHLIGHTS DE TRANSMISSAO',\n              sub:'Uma edicao guiada da partida, com capitulos narrativos e menos pista estrutural.',\n              vibe:'Modo recomendado',\n              color:'#A78BFA',\n              icon:'◌',\n            },\n            {\n              id:'extended',\n              title:'COBERTURA ESTENDIDA',\n              sub:'Mais pontos e mais contexto. Ainda editado, mas com menos protecao anti-spoiler.',\n              vibe:'Para ver mais jogo',\n              color:'#4A90D9',\n              icon:'◍',\n            },\n` + text.slice(oldEndIdx);

const oldMetricsStart = `              <div style={{ fontFamily:"'Barlow Condensed',sans-serif",\n                fontSize:42, fontWeight:900, color:'#fff', lineHeight:1, marginBottom:4 }}>`;
const oldMetricsEnd = `              )}\n`;
const metricsStartIdx = text.indexOf(oldMetricsStart);
const metricsEndIdx = text.indexOf(oldMetricsEnd, metricsStartIdx);
if (metricsStartIdx === -1 || metricsEndIdx === -1) throw new Error('metrics block not found');
text = text.slice(0, metricsStartIdx) + `              <div style={{\n                display:'inline-flex', alignItems:'center', justifyContent:'center',\n                padding:'6px 12px', marginBottom:18,\n                fontSize:8, letterSpacing:'.22em', textTransform:'uppercase',\n                color:\`${'${opt.color}'}dd\`, background:\`${'${opt.color}'}12\`, border:\`1px solid ${'${opt.color}'}30\`,\n              }}>\n                {opt.vibe}\n              </div>\n              <div style={{ fontSize:8, letterSpacing:'.18em', color:'rgba(255,255,255,.2)', lineHeight:1.8 }}>\n                entrar sem saber quantos capitulos vem pela frente\n              </div>\n` + text.slice(metricsEndIdx + oldMetricsEnd.length);

text = text.replace(/counter: `\$\{clipIdx \+ 1\} \/ \$\{clips\.length\}`,/g, 'counter: modeMeta.status,');
text = text.replace('transmiss?o encerrada ? sem revelar a estrutura antes da hora', 'transmissao encerrada · sem revelar a estrutura antes da hora');
text = text.replace(/boxShadow:\u0000 0 10px  \}/g, 'boxShadow: `0 0 10px ${modeMeta.accent}` }');
text = text.replace(/boxShadow:\s*`0 0 10px \$\{modeMeta\.accent\}` \}/g, 'boxShadow: `0 0 10px ${modeMeta.accent}` }');
fs.writeFileSync(path, text, 'latin1');
