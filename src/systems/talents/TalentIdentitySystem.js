/**
 * Identidade de talento: uma camada pequena, persistente e legível que junta
 * origem, fundamentos, rota de jogo e marcas de carreira. Não substitui attrs:
 * explica por que dois jogadores com números parecidos jogam diferente.
 */
import { clamp } from '../../core/math.js';

const n = (p, key, fallback = 60) => Number.isFinite(p?.attrs?.[key]) ? p.attrs[key] : fallback;
const totalTitles = p => Object.values(p?.careerTitles ?? {}).reduce((sum, value) => sum + (Number(value) || 0), 0);
const hash = value => [...String(value ?? 'talento')].reduce((a, c) => ((a * 31) + c.charCodeAt(0)) >>> 0, 7);

export const TALENT_NODES = Object.freeze({
  PRODIGIO: { label:'Prodígio de impacto', kind:'origem', desc:'Aprende cedo e já enxerga a bola como veterano.', effects:{ developmentEarly:1.16, readingAdd:.018, powerAdd:.012 } },
  ARTESAO: { label:'Artesão tardio', kind:'origem', desc:'Menos pressa; a técnica amadurece por mais tempo.', effects:{ developmentLate:1.18, precisionAdd:.016, errorRelief:.008 } },
  CORPO_FORJADO: { label:'Corpo forjado', kind:'origem', desc:'Feito para absorver temporadas e sobreviver ao quinto set.', effects:{ staminaDrainMult:.93, staminaRecoveryMult:1.08, fatigueProtectionAdd:.035 } },
  LEITOR_NATO: { label:'Leitor nato', kind:'origem', desc:'Identifica padrão, direção e tempo antes do adversário.', effects:{ readingAdd:.035, tacticalAdd:.028, defenseReachBonus:.025 } },
  BRACO_OURO: { label:'Braço de ouro', kind:'origem', desc:'A bola sai diferente desde a primeira geração.', effects:{ servePowerAdd:.035, servePrecisionAdd:.018, powerAdd:.015 } },
  INSTINTO_REDE: { label:'Instinto de rede', kind:'origem', desc:'Fecha espaços e entende a bola curta naturalmente.', effects:{ volleyAdd:.04, smashAdd:.028, netReadBonus:.05 } },
  PASSO_INICIAL: { label:'Passo inicial', kind:'base', desc:'Arranque que cria uma bola a mais.', effects:{ movementAdd:.032, accelAdd:.04 } },
  BASE_LIMPA: { label:'Base limpa', kind:'base', desc:'Fundamento técnico que preserva a margem sob pressão.', effects:{ precisionAdd:.025, errorRelief:.012 } },
  PULMAO_RALLY: { label:'Pulmão de rally', kind:'base', desc:'O ritmo longo não rouba a execução.', effects:{ staminaDrainMult:.955, fatigueProtectionAdd:.022, defenseAdd:.012 } },
  CABECA_FRIA: { label:'Cabeça fria', kind:'base', desc:'Mantém a escolha quando o ponto aperta.', effects:{ tacticalAdd:.018, errorRelief:.012 } },
  SAQUE_PRIMEIRO: { label:'Saque primeiro', kind:'base', desc:'A primeira bola já começa com vantagem.', effects:{ servePowerAdd:.024, servePrecisionAdd:.02 } },
  MAO_FIRME: { label:'Mão firme', kind:'base', desc:'Contato curto, baixo ou imperfeito continua jogável.', effects:{ volleyAdd:.018, sliceAdd:.018, difficultContactBonus:.018 } },
  ATAQUE_RUPTURA: { label:'Ruptura', kind:'estilo', desc:'Procura encurtar o ponto quando sente a brecha.', effects:{ powerAdd:.032, familyBias:{ FLAT_DRIVE:.09, TOPSPIN:.035 } } },
  ATAQUE_LINHA: { label:'Linha viva', kind:'estilo', desc:'Transforma uma bola média em pressão.', effects:{ precisionAdd:.024, tacticalAdd:.016, familyBias:{ FLAT_DRIVE:.065 } } },
  ATAQUE_PRIMEIRO: { label:'Primeiro golpe', kind:'estilo', desc:'Saque e devolução viram arma de abertura.', effects:{ servePowerAdd:.025, returnAdd:.022, familyBias:{ FLAT_DRIVE:.045 } } },
  COUNTER_ESPELHO: { label:'Espelho do ritmo', kind:'estilo', desc:'Usa a velocidade do rival contra ele.', effects:{ readingAdd:.03, defenseAdd:.022, familyBias:{ FLAT_DRIVE:.08, TOPSPIN:.04 } } },
  COUNTER_REDIRECIONA: { label:'Redirecionador', kind:'estilo', desc:'A defesa vira ataque no primeiro espaço.', effects:{ tacticalAdd:.03, difficultContactBonus:.022, familyBias:{ FLAT_DRIVE:.07, SLICE:.03 } } },
  COUNTER_PACIENTE: { label:'Paciência venenosa', kind:'estilo', desc:'Devolve mais uma até a quadra abrir.', effects:{ staminaDrainMult:.96, errorRelief:.018, familyBias:{ TOPSPIN:.06, SLICE:.035 } } },
  REDE_FECHAMENTO: { label:'Fechamento', kind:'estilo', desc:'Chegou à rede para terminar, não para sobreviver.', effects:{ volleyAdd:.045, smashAdd:.035, familyBias:{ VOLLEY:.13, SMASH:.10 } } },
  REDE_ANTECIPA: { label:'Antecipação', kind:'estilo', desc:'Lê o passe e toma a decisão antes.', effects:{ netReadBonus:.075, readingAdd:.02, familyBias:{ VOLLEY:.075 } } },
  REDE_MAO: { label:'Mão de veludo', kind:'estilo', desc:'Tem solução mesmo no volley baixo.', effects:{ volleyAdd:.032, sliceAdd:.025, difficultContactBonus:.022, familyBias:{ VOLLEY:.08 } } },
  SERVE_CANHAO: { label:'Canhão calibrado', kind:'estilo', desc:'Peso sem abrir mão do alvo.', effects:{ servePowerAdd:.05, servePrecisionAdd:.025 } },
  SERVE_VARIACAO: { label:'Mapa de saque', kind:'estilo', desc:'O recebedor nunca recebe o mesmo desenho duas vezes.', effects:{ servePrecisionAdd:.04, tacticalAdd:.022 } },
  SERVE_UM_DOIS: { label:'Um-dois', kind:'estilo', desc:'Constrói a primeira bola em cima do saque.', effects:{ servePowerAdd:.025, powerAdd:.022, familyBias:{ FLAT_DRIVE:.07 } } },
  MURALHA_ALCANCE: { label:'Alcance elástico', kind:'estilo', desc:'A bola impossível volta mais uma vez.', effects:{ defenseAdd:.045, defenseReachBonus:.07, difficultContactBonus:.025 } },
  MURALHA_FOLEGO: { label:'Ritmo de maratona', kind:'estilo', desc:'Cresce quando o ponto se alonga.', effects:{ staminaDrainMult:.93, fatigueProtectionAdd:.04, errorRelief:.012 } },
  MURALHA_PESO: { label:'Peso paciente', kind:'estilo', desc:'Não só resiste: devolve uma bola pesada.', effects:{ topspinAdd:.035, defenseAdd:.02, familyBias:{ TOPSPIN:.09, SLICE:.04 } } },
  ALL_COSTURA: { label:'Costura de jogo', kind:'estilo', desc:'Liga defesa, construção e ataque sem buracos.', effects:{ precisionAdd:.018, tacticalAdd:.022, movementAdd:.016 } },
  ALL_TRANSICAO: { label:'Transição limpa', kind:'estilo', desc:'Sabe quando sair do fundo e como chegar.', effects:{ movementAdd:.022, volleyAdd:.02, familyBias:{ VOLLEY:.04, FLAT_DRIVE:.04 } } },
  ALL_REPERTORIO: { label:'Repertório vivo', kind:'estilo', desc:'Sempre tem uma resposta de golpe para a bola.', effects:{ topspinAdd:.018, sliceAdd:.018, familyBias:{ TOPSPIN:.035, SLICE:.035 } } },
  LEGADO_GIGANTES: { label:'Caçador de gigantes', kind:'legado', desc:'Carrega a calma de quem já derrubou favoritos.', effects:{ mentalityAdd:.025, errorRelief:.016 } },
  LEGADO_SAIBRO: { label:'Memória do saibro', kind:'legado', desc:'O ponto longo no barro passou a ser território próprio.', effects:{ topspinAdd:.026, defenseAdd:.02 } },
  LEGADO_CICATRIZ: { label:'Cicatriz que ficou', kind:'cicatriz', desc:'Uma lesão mudou o corpo, não a leitura do jogo.', effects:{ staminaDrainMult:1.025, readingAdd:.018, tacticalAdd:.018 } },
  MESTRE_SAQUE: { label:'Maestria: saque transcendente', kind:'maestria', desc:'Uma habilidade de exceção — ainda limitada pelo teto de 99.', effects:{ servePowerAdd:.055, servePrecisionAdd:.04 } },
  MESTRE_DEFESA: { label:'Maestria: defesa absoluta', kind:'maestria', desc:'Um especialista raro em sobreviver e responder.', effects:{ defenseAdd:.055, defenseReachBonus:.08, difficultContactBonus:.035 } },
  MESTRE_REDE: { label:'Maestria: arte da rede', kind:'maestria', desc:'A bola curta deixa de ser dúvida e vira sentença.', effects:{ volleyAdd:.06, smashAdd:.045, netReadBonus:.08 } },
});

const TREE = {
  ATTACKER:['ATAQUE_RUPTURA','ATAQUE_LINHA','ATAQUE_PRIMEIRO'], COUNTER:['COUNTER_ESPELHO','COUNTER_REDIRECIONA','COUNTER_PACIENTE'],
  NET:['REDE_FECHAMENTO','REDE_ANTECIPA','REDE_MAO'], SERVER:['SERVE_CANHAO','SERVE_VARIACAO','SERVE_UM_DOIS'],
  RETRIEVER:['MURALHA_ALCANCE','MURALHA_FOLEGO','MURALHA_PESO'], ALLCOURT:['ALL_COSTURA','ALL_TRANSICAO','ALL_REPERTORIO'],
};
const TREE_LABEL = { ATTACKER:'Atacante', COUNTER:'Contra-ataque', NET:'Jogador de rede', SERVER:'Sacador', RETRIEVER:'Muralha', ALLCOURT:'All-court' };
const baseOptions = ['PASSO_INICIAL','BASE_LIMPA','PULMAO_RALLY','CABECA_FRIA','SAQUE_PRIMEIRO','MAO_FIRME'];

function styleFor(p) { const net=(n(p,'volley')+n(p,'smash'))/2; const serve=(n(p,'saqueForca')+n(p,'saquePrecisao'))/2; const def=(n(p,'defesa')+n(p,'resistencia'))/2; const attack=(n(p,'fhPotencia')+n(p,'bhPotencia')+n(p,'visaoTatica'))/3; if(net>=78 || p?.prefs?.netGame==='HUNTER') return 'NET'; if(serve>=82) return 'SERVER'; if(def>=82) return 'RETRIEVER'; if(n(p,'leitura')>=78 && n(p,'defesa')>=70) return 'COUNTER'; if(attack>=74) return 'ATTACKER'; return 'ALLCOURT'; }
function originFor(p) { const values = [['CORPO_FORJADO', n(p,'resistencia')+n(p,'defesa')],['LEITOR_NATO',n(p,'leitura')+n(p,'visaoTatica')],['BRACO_OURO',n(p,'saqueForca')+n(p,'saquePrecisao')],['INSTINTO_REDE',n(p,'volley')+n(p,'smash')],['PRODIGIO',(p?.potential==='GERACIONAL'||p?.potential==='LENDA')?170:0],['ARTESAO',n(p,'regularidade')+n(p,'controle')]].sort((a,b)=>b[1]-a[1]); return values[0][0]; }
function pickBase(p) { const ranked = [...baseOptions].sort((a,b) => scoreBase(p,b)-scoreBase(p,a)); return ranked.slice(0,3); }
function scoreBase(p,id) { return ({PASSO_INICIAL:n(p,'velocidade')+n(p,'explosividade'), BASE_LIMPA:n(p,'controle')+n(p,'regularidade'), PULMAO_RALLY:n(p,'resistencia')+n(p,'defesa'), CABECA_FRIA:n(p,'mentalidade')+n(p,'leitura'), SAQUE_PRIMEIRO:n(p,'saqueForca')+n(p,'saquePrecisao'), MAO_FIRME:n(p,'volley')+n(p,'slice')}[id] ?? 0); }
function eligibleLegacy(p) { const out=[]; const titles=totalTitles(p); const clay=p?.surfaceStats?.CLAY?.titlesWon ?? 0; if(titles>=3 || (p?.rank ?? 999)<=12) out.push('LEGADO_GIGANTES'); if(clay>=2) out.push('LEGADO_SAIBRO'); if((p?.injuryHistory?.filter(x => x?.grade >= 2).length ?? 0)>=2) out.push('LEGADO_CICATRIZ'); return out; }
function masteryFor(p) { const titles=totalTitles(p); if(titles<4 && p?.potential!=='GERACIONAL') return null; if(n(p,'saqueForca')>=94 && n(p,'saquePrecisao')>=90) return 'MESTRE_SAQUE'; if(n(p,'defesa')>=93 && n(p,'resistencia')>=90) return 'MESTRE_DEFESA'; if(n(p,'volley')>=93 && n(p,'smash')>=90) return 'MESTRE_REDE'; return null; }

export function initializeTalentIdentity(player, { source='AUTO', seasonYear=2025 } = {}) {
  if (!player) return null;
  if (player.talentIdentity?.version === 1) return advanceTalentIdentity(player,{seasonYear});
  const route=styleFor(player); const options=TREE[route]; const bases=pickBase(player); const seed=hash(player.id ?? player.fullName ?? player.name);
  const identity={ version:1, source, createdSeason:seasonYear, origin:originFor(player), baseOptions:[...baseOptions], baseChoices:bases, route, routeOptions:options, routeChoice:options[seed%options.length], legacies:eligibleLegacy(player), mastery:masteryFor(player), history:[{season:seasonYear,type:'ORIGEM',node:originFor(player)}] };
  player.talentIdentity=identity; return identity;
}
export function advanceTalentIdentity(player,{seasonYear=2025}={}) { const id=player?.talentIdentity; if(!id) return initializeTalentIdentity(player,{seasonYear}); id.legacies=[...new Set([...(id.legacies??[]),...eligibleLegacy(player)])]; id.mastery=id.mastery??masteryFor(player); return id; }
export function initializeTalentIdentityRoster(roster, options={}) { Object.values(roster ?? {}).forEach(p=>initializeTalentIdentity(p,{...options,source:options.source??'ROSTER'})); return roster; }
export function cloneTalentIdentity(identity) { return identity ? JSON.parse(JSON.stringify(identity)) : null; }
export function chooseTalentNode(player, category, nodeId) { const id=initializeTalentIdentity(player); const allowed=category==='route'?id.routeOptions:id.baseOptions; if(!allowed.includes(nodeId)) return false; if(category==='route') id.routeChoice=nodeId; else if(!id.baseChoices.includes(nodeId)) id.baseChoices=[...id.baseChoices,nodeId].slice(-3); return true; }
export function getTalentDevelopmentMultiplier(player,key,seasonYear=2025) { const id=initializeTalentIdentity(player,{seasonYear}); const age=Number(player?.age ?? seasonYear-(player?.birthYear??seasonYear-22)); if(id.origin==='PRODIGIO' && age<=22) return 1.16; if(id.origin==='ARTESAO' && age>=23 && age<=29) return 1.18; if(id.origin==='CORPO_FORJADO' && ['resistencia','defesa','velocidade','explosividade'].includes(key)) return 1.08; return 1; }
export function getTalentRuntimeEffects(player, context={}) { const id=initializeTalentIdentity(player); const result={ staminaDrainMult:1, staminaRecoveryMult:1, movementAdd:0, accelAdd:0, precisionAdd:0, powerAdd:0, topspinAdd:0, sliceAdd:0, servePowerAdd:0, servePrecisionAdd:0, returnAdd:0, readingAdd:0, tacticalAdd:0, mentalityAdd:0, defenseAdd:0, volleyAdd:0, smashAdd:0, fatigueProtectionAdd:0, defenseReachBonus:0, difficultContactBonus:0, errorRelief:0, netReadBonus:0, familyBias:{} };
  const nodes=[id.origin,...(id.baseChoices??[]),id.routeChoice,...(id.legacies??[]),id.mastery].filter(Boolean); for(const node of nodes){ const e=TALENT_NODES[node]?.effects??{}; for(const [key,value] of Object.entries(e)){ if(key==='familyBias') for(const [family,bias] of Object.entries(value)) result.familyBias[family]=(result.familyBias[family]??0)+bias; else if(key.endsWith('Mult')) result[key]*=value; else if(typeof value==='number' && key in result) result[key]+=value; } }
  if(context.phase==='NET') { result.volleyAdd+=result.netReadBonus*.25; result.difficultContactBonus+=result.netReadBonus*.12; } return result;
}
export function getTalentIdentityPresentation(player) { const id=initializeTalentIdentity(player); const node=x=>x?{id:x,...TALENT_NODES[x]}:null; return { ...id, origin:node(id.origin), bases:(id.baseOptions??[]).map(x=>({...node(x),selected:id.baseChoices?.includes(x)})), routeLabel:TREE_LABEL[id.route], routeNodes:(id.routeOptions??[]).map(x=>({...node(x),selected:id.routeChoice===x})), legacies:(id.legacies??[]).map(node), mastery:node(id.mastery) }; }
