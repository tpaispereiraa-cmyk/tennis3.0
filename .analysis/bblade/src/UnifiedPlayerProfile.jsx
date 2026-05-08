// ============================================
// UNIFIED PLAYER PROFILE — REVAMPED EDITION
// ============================================
import React, { useState, useMemo, useRef, useCallback } from 'react';
import { TEAMS } from './data.js';
import { MENTALITIES, LAUNCH_TECHNIQUES } from './UniverseManager.js';
import { Upload, X } from 'lucide-react';

import { getCurrentLevelTag, generateScoutPerspective, generateConjecture, calculateProgressZones } from './ScoutSystem.js';
import { getPlayerTraitData, TRAITS } from './traits_data.js';
import { getTraitDNAProfile, SHADOW_MILESTONES } from './TraitDNASystem.js';
import { playerShortName, playerFullName } from './utils/playerName.js';

// ============================================
// STYLES
// ============================================
const PROFILE_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Black+Ops+One&family=Rajdhani:wght@400;600;700&family=Orbitron:wght@400;700;900&display=swap');

  @keyframes up-scan    { 0%{transform:translateY(-100%)} 100%{transform:translateY(100vh)} }
  @keyframes up-pulse   { 0%,100%{opacity:.5} 50%{opacity:1} }
  @keyframes up-spin    { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
  @keyframes up-spin-r  { from{transform:rotate(360deg)} to{transform:rotate(0deg)} }
  @keyframes up-entry   { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
  @keyframes up-hero    { from{opacity:0;transform:translateX(30px)} to{opacity:1;transform:translateX(0)} }
  @keyframes bar-grow   { from{width:0} }
  @keyframes up-float   { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
  @keyframes ring-pulse { 0%,100%{opacity:.3;transform:scale(1)} 50%{opacity:.7;transform:scale(1.03)} }

  /* ── Nav tab ── */
  .up-tab {
    font-family:'Orbitron',monospace; font-size:15px; font-weight:700; letter-spacing:.18em;
    padding:12px 16px; border:none; background:transparent; color:rgba(255,255,255,.28);
    cursor:pointer; position:relative; transition:color .15s ease; white-space:nowrap; flex-shrink:0;
  }
  .up-tab:hover { color:rgba(255,255,255,.65); }
  .up-tab.active { color:#ffd700; }
  .up-tab.active::after {
    content:''; position:absolute; bottom:0; left:0; right:0; height:2px;
    background:linear-gradient(90deg,transparent,#ffd700,transparent);
    box-shadow:0 0 8px rgba(255,215,0,.65);
  }

  /* ── Generic card ── */
  .up-card {
    background:rgba(255,255,255,.03); border:1px solid rgba(255,255,255,.08);
    clip-path:polygon(10px 0%,100% 0%,calc(100% - 10px) 100%,0% 100%);
    transition:border-color .2s ease;
  }
  .up-card:hover { border-color:rgba(255,215,0,.2); }

  /* ── Section label ── */
  .up-label {
    font-family:'Orbitron',monospace; font-size:15px; font-weight:700;
    letter-spacing:.3em; color:rgba(255,215,0,.5); text-transform:uppercase; margin-bottom:12px;
  }

  /* ── Stat box ── */
  .up-stat-box {
    clip-path:polygon(8px 0%,100% 0%,calc(100% - 8px) 100%,0% 100%);
    border:1px solid rgba(255,255,255,.1); background:rgba(0,0,0,.35);
    padding:14px 18px; text-align:center; transition:all .18s ease; backdrop-filter:blur(8px);
  }
  .up-stat-box:hover { border-color:rgba(255,215,0,.35); background:rgba(255,215,0,.05); }

  /* ── Attr bar ── */
  .up-attr-bar { height:7px; border-radius:99px; background:rgba(255,255,255,.07); overflow:hidden; }
  .up-attr-fill { height:100%; border-radius:99px; animation:bar-grow .7s ease both; }

  /* ── Upload overlay ── */
  .up-icon-wrap .up-upload { opacity:0; transition:opacity .2s; }
  .up-icon-wrap:hover .up-upload { opacity:1; }

  /* ── Close btn ── */
  .up-close {
    font-family:'Orbitron',monospace; font-size:15px; font-weight:700; letter-spacing:.1em;
    position:absolute; top:16px; right:16px; z-index:30;
    background:rgba(0,0,0,.5); border:1px solid rgba(255,255,255,.15);
    color:rgba(255,255,255,.65); padding:7px 14px; cursor:pointer;
    clip-path:polygon(5px 0%,100% 0%,calc(100% - 5px) 100%,0% 100%);
    transition:all .15s ease;
  }
  .up-close:hover { background:rgba(239,68,68,.3); border-color:rgba(239,68,68,.6); color:white; }

  /* ── Tier badge ── */
  .tbadge {
    font-family:'Orbitron',monospace; font-size:11px; font-weight:700; letter-spacing:.12em;
    padding:4px 12px; border:1px solid;
    clip-path:polygon(4px 0%,100% 0%,calc(100% - 4px) 100%,0% 100%);
  }
  .tb-elite { color:#ffd700; border-color:rgba(255,215,0,.55); background:rgba(255,215,0,.07); }
  .tb-top   { color:#c084fc; border-color:rgba(192,132,252,.55); background:rgba(192,132,252,.07); }
  .tb-pro   { color:#60a5fa; border-color:rgba(96,165,250,.55);  background:rgba(96,165,250,.07); }

  /* ── Mentality tag ── */
  .up-mentality {
    font-family:'Orbitron',monospace; font-size:11px; font-weight:700; letter-spacing:.1em;
    padding:4px 12px; border:1px solid;
    clip-path:polygon(4px 0%,100% 0%,calc(100% - 4px) 100%,0% 100%);
  }

  /* ── Hist row ── */
  .up-hrow {
    display:flex; align-items:center; gap:14px; padding:13px 18px;
    clip-path:polygon(6px 0%,100% 0%,calc(100% - 6px) 100%,0% 100%);
    border:1px solid rgba(255,255,255,.06); background:rgba(255,255,255,.02);
    transition:all .15s ease;
  }
  .up-hrow:hover { background:rgba(255,255,255,.05); border-color:rgba(255,215,0,.2); }

  /* ── Trophy card ── */
  .up-trophy {
    clip-path:polygon(10px 0%,100% 0%,calc(100% - 10px) 100%,0% 100%);
    padding:18px; display:flex; flex-direction:column; align-items:center; gap:6px;
    border:1px solid; text-align:center; transition:all .2s ease;
  }
  .up-trophy:hover { transform:translateY(-3px); }

  /* ── Tweet ── */
  .up-tweet {
    clip-path:polygon(8px 0%,100% 0%,calc(100% - 8px) 100%,0% 100%);
    border:1px solid rgba(255,255,255,.07); background:rgba(255,255,255,.025);
    padding:14px 16px; transition:border-color .18s;
  }
  .up-tweet:hover { border-color:rgba(255,255,255,.18); }

  /* ── Arena row ── */
  .up-arena {
    clip-path:polygon(8px 0%,100% 0%,calc(100% - 8px) 100%,0% 100%);
    border:1px solid rgba(255,255,255,.07); background:rgba(255,255,255,.03);
    padding:16px; transition:border-color .15s;
  }
  .up-arena:hover { border-color:rgba(255,215,0,.25); }

  /* ── Event card ── */
  .up-event {
    clip-path:polygon(10px 0%,100% 0%,calc(100% - 10px) 100%,0% 100%);
    border:1px solid; padding:18px 20px; transition:all .18s;
  }
  .up-event:hover { filter:brightness(1.08); }

  /* ── Form bar ── */
  .up-fbar { height:8px; background:rgba(255,255,255,.06); border-radius:99px; overflow:hidden; }
  .up-ffill { height:100%; border-radius:99px; transition:width .5s cubic-bezier(.22,1,.36,1); }

  /* ── Scrollbar ── */
  .up-scroll::-webkit-scrollbar { width:3px; }
  .up-scroll::-webkit-scrollbar-track { background:transparent; }
  .up-scroll::-webkit-scrollbar-thumb { background:rgba(255,215,0,.2); border-radius:2px; }

  /* ── Blade rings ── */
  .blade-r1 { animation:up-spin   4s linear infinite; }
  .blade-r2 { animation:up-spin-r 3s linear infinite; }

  /* ── Hero image ── */
  .hero-img {
    position:absolute; right:0; top:0; height:100%;
    object-fit:cover; object-position:top center;
    mask-image:linear-gradient(to left, rgba(0,0,0,0.85) 40%, transparent 100%);
    WebkitMaskImage:linear-gradient(to left, rgba(0,0,0,0.85) 40%, transparent 100%);
    animation:up-hero .8s ease both;
    pointer-events:none; user-select:none;
  }
`;

// ============================================
// ATTR CONFIG
// ============================================
const ATTR_CFG = {
  attack:       { label:'ATK', color:'#ef4444' },
  defense:      { label:'DEF', color:'#3b82f6' },
  stamina:      { label:'STA', color:'#22c55e' },
  speed:        { label:'SPD', color:'#f59e0b' },
  technique:    { label:'TEC', color:'#a855f7' },
  intelligence: { label:'INT', color:'#06b6d4' },
  adaptability: { label:'ADA', color:'#10b981' },
  clutch:       { label:'CLT', color:'#f97316' },
};

const fmtNum = n => n >= 1000 ? `${(n/1000).toFixed(1)}K` : String(n || 0);
const padM   = m => String(m).padStart(2,'0');

// ============================================
// 📖 NARRATIVA ÚNICA — ESTILO FOOTBALL MANAGER
// ============================================

const STORY_ARCHETYPES = {
  LEGEND:             { label: 'Lenda',              color: '#ffd700', glow: true  },
  DYNASTY:            { label: 'Dinastia',           color: '#ff9500', glow: true  },
  UNDERDOG_GLORY:     { label: 'Ascensão Épica',     color: '#22c55e', glow: false },
  FALLEN_GIANT:       { label: 'Gigante Caído',      color: '#9ca3af', glow: false },
  COMEBACK:           { label: 'Ressurreição',       color: '#f97316', glow: false },
  PRODIGY:            { label: 'Prodígio',           color: '#a78bfa', glow: true  },
  FAIRY_TALE:         { label: 'Conto de Fadas',     color: '#f472b6', glow: true  }, // Rising Star ganha Open
  INVITATIONAL_HERO:  { label: 'Herói do Signature', color: '#fde68a', glow: true  }, // Newcomer vence Signature Clash
  IRON_WARRIOR:       { label: 'Guerreiro',          color: '#60a5fa', glow: false },
  DARK_HORSE:         { label: 'Surpresa',           color: '#818cf8', glow: false },
  BRIEF_FLAME:        { label: 'Chama Breve',        color: '#fb7185', glow: false },
  GRINDER:            { label: 'Resistente',         color: '#94a3b8', glow: false },
  RISING:             { label: 'Em Ascensão',        color: '#34d399', glow: false },
};

const MENTALITY_PROSE = {
  ALL_ROUNDER:        'um estilo equilibrado e adaptável',
  GLASS_CANNON:       'uma filosofia de ataque absoluto — destruir antes de ser destruído',
  IRON_FORTRESS:      'uma defesa impenetrável como identidade',
  ETERNAL_SPINNER:    'o controle de giro infinito como arma principal',
  CALCULATED_CHAOS:   'caos controlado e leituras imprevisíveis',
  HIGH_RISK_GAMBLER:  'apostas de alto risco que dividem especialistas',
  MOMENTUM_MASTER:    'o domínio do momentum como força motriz',
  SYNERGY_SEEKER:     'a busca pela combinação perfeita de condições',
  ADAPTIVE_TACTICIAN: 'adaptação tática em tempo real',
  PERFECTIONIST:      'uma obsessão com execução técnica impecável',
  CHAOS_AGENT:        'provocar o caos e prosperar nele',
  MOMENTUM_THIEF:     'roubar o momentum adversário no momento exato',
};

const COUNTRY_DEMONYMS = {
  '🇧🇷 Brasil': 'brasileiro', '🇺🇸 EUA': 'norte-americano', '🇯🇵 Japão': 'japonês',
  '🇨🇳 China': 'chinês', '🇰🇷 Coreia do Sul': 'sul-coreano', '🇷🇺 Rússia': 'russo',
  '🇩🇪 Alemanha': 'alemão', '🇫🇷 França': 'francês', '🇬🇧 Reino Unido': 'britânico',
  '🇪🇸 Espanha': 'espanhol', '🇮🇹 Itália': 'italiano', '🇲🇽 México': 'mexicano',
  '🇦🇷 Argentina': 'argentino', '🇨🇦 Canadá': 'canadense', '🇦🇺 Austrália': 'australiano',
};

const TIER_LABELS_STORY = {
  KINGS_COURT:  'Kings Court',
  PREMIER:      'Premier',
  SIGNATURE_CLASH: "New Year's Signature Clash",
  INVITATIONAL: 'Season Kickoff Invitational', // legado
  MASTERS:      'Masters',
  CHALLENGER:   'Challenger',
  OPEN:         'Crossover Open',
  REDEMPTION:   'Redemption',
};

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function detectNarrativeArchetype(data) {
  const { totalTitles, peakRanking, yearsActive, totalMatches, promotions, relegations, isRetired, retireType, wr, titles } = data;

  // Conto de Fadas: ganhou o Open sendo Rising Star (ou com 0 anos na elite)
  if ((titles?.openTitles || 0) >= 1 && yearsActive <= 1)                                  return 'FAIRY_TALE';
  // Herói do Kickoff: venceu o Invitational no primeiro ou segundo ano
  if (((titles?.signatureClashTitles || 0) + (titles?.invitationalTitles || 0)) >= 1 && yearsActive <= 2) return 'INVITATIONAL_HERO';

  if (totalTitles >= 10 || (peakRanking <= 3 && totalTitles >= 5))                         return 'LEGEND';
  if (totalTitles >= 6 && yearsActive >= 4)                                                 return 'DYNASTY';
  if (totalTitles >= 4 && yearsActive <= 3)                                                 return 'PRODIGY';
  if (relegations >= 3 && totalTitles >= 2)                                                 return 'COMEBACK';
  if (relegations >= 1 && totalTitles >= 1 && promotions > relegations)                    return 'UNDERDOG_GLORY';
  if (isRetired && (retireType === 'INJURY' || retireType === 'PREMATURE') && peakRanking <= 8) return 'FALLEN_GIANT';
  if (isRetired && yearsActive <= 2 && totalTitles >= 1)                                   return 'BRIEF_FLAME';
  if (totalTitles >= 1 && promotions >= 2 && peakRanking <= 15)                            return 'DARK_HORSE';
  if (totalMatches >= 60 && wr >= 45)                                                       return 'IRON_WARRIOR';
  if (totalMatches >= 40)                                                                    return 'GRINDER';
  return 'RISING';
}

function getNarrativeHeadline(archetype, shortName, country) {
  const cLabel = country?.split(' ').slice(1).join(' ') || '';
  const map = {
    LEGEND:             [`A Lenda${cLabel ? ` ${cLabel}` : ''}`, `O Nome Que Definiu Uma Era`, `O Maior de Todos — ${shortName}`],
    DYNASTY:            [`A Dinastia de ${shortName}`, `Dominância Absoluta`, `Um Rei Com Várias Coroas`],
    UNDERDOG_GLORY:     [`A Ascensão Improvável`, `De Baixo Para o Topo`, `Ninguém Apostava Nele`],
    FALLEN_GIANT:       [`O Gigante Que Caiu Cedo`, `Talento Sem Tempo`, `A Estrela Que Queimou Rápido`],
    COMEBACK:           [`A Ressurreição`, `${shortName} Nunca Desistiu`, `Das Cinzas ao Topo`],
    PRODIGY:            [`O Prodígio`, `${shortName} Chegou Para Ficar`, `Uma Geração Inteira Em Anos`],
    FAIRY_TALE:         [`O Conto de Fadas`, `Amadores Não Têm Vez — Exceto ${shortName}`, `A Noite em Que Tudo Mudou`],
    INVITATIONAL_HERO:  [`O Herói do Signature`, `${shortName} Chegou Como Estreante e Saiu Como Rei`, `A Primeira Temporada, o Primeiro Signature Clash`],
    IRON_WARRIOR:       [`O Guerreiro`, `Ninguém Mais Comprometido`, `${shortName} — Resistência Pura`],
    DARK_HORSE:         [`A Grande Surpresa`, `Quem Disse Que Ele Não Podia?`, `O Azarão Que Assombrou o Circuito`],
    BRIEF_FLAME:        [`Chama Breve, Marca Eterna`, `${shortName} Passou Rápido — E Nunca Foi Esquecido`, `Curto Demais Para a História`],
    GRINDER:            [`${shortName} — A Muralha`, `Nem Todo Herói Tem Holofote`, `Décadas de Luta, Poucos Reconhecem`],
    RISING:             [`${shortName} Está Chegando`, `A História Ainda Está Sendo Escrita`, `Os Melhores Capítulos Ainda Vêm`],
  };
  return pick(map[archetype] || map.RISING);
}

function generateNarrative(player, playerId, playerHistory, universeManager) {
  if (!player) return null;

  const ph           = playerHistory || {};
  const th           = ph.tournamentHistory || [];
  const titles       = ph.titles || {};
  const totalTitles  = titles.total || th.filter(t => t.eliminatedRound === 'CHAMPION').length || 0;
  const totalMatches = ph.totalMatches || 0;
  const wins         = ph.wins || 0;
  const losses       = ph.losses || 0;
  const wr           = totalMatches > 0 ? Math.round((wins / totalMatches) * 100) : 0;
  const bestStreak   = ph.bestWinStreak || 0;
  const totalPoints  = ph.totalPoints || 0;

  const peakRanking  = player.careerPeak?.ranking || 99;
  const country      = player.country || '';
  const demonym      = COUNTRY_DEMONYMS[country] || 'competidor';
  const debutYear    = player.debutYear || universeManager?.currentYear || 2024;
  const currentYear  = universeManager?.currentYear || debutYear;
  const yearsActive  = Math.max(currentYear - debutYear, 0);
  const isRetired    = player.status === 'RETIRED' || player.status === 'RETIRED_AMATEUR';
  const retireType   = player.retirement?.retirementReason;
  const retireYear   = player.retirement?.retirementYear;
  const mentStyle    = MENTALITY_PROSE[player.mentality] || 'um estilo único e difícil de categorizar';
  const shortName    = playerShortName(player);

  const divHistory   = universeManager?.divisionHistory?.get(playerId);
  const promotions   = divHistory?.promotions || 0;
  const relegations  = divHistory?.relegations || 0;
  const currentDiv   = divHistory?.currentDivision || 'prospects';
  const divStart     = divHistory?.divisionsSinceStart?.[0] || 'prospects';
  const divStartLabel= { elite:'da Elite', challenger:'do Challenger', prospects:'do Prospects', relegation:'da zona de Relegação' }[divStart] || 'do circuito';
  const divCurLabel  = { elite:'Elite', challenger:'Challenger', prospects:'Prospects', relegation:'Relegação' }[currentDiv] || currentDiv;

  // Signature blade
  const sigData      = universeManager?.signatureBlades?.get(playerId);
  const sig          = sigData?.blade;
  const sigStats     = sigData?.stats;

  // Rivalries
  const rivalries    = universeManager?.rivalrySystem?.getPlayerRivalries?.(playerId) || [];
  const topRival     = rivalries[0] || null;
  const topRivalId   = topRival ? (topRival.p1Id === playerId ? topRival.p2Id : topRival.p1Id) : null;
  const topRivalName = topRivalId
    ? (universeManager?.getPlayerById?.(topRivalId)?.name || topRivalId)
    : null;

  // Titles breakdown
  const kcTitles     = titles.kingsCourtTitles || 0;
  const premTitles   = titles.premierTitles || 0;
  const mastTitles   = titles.mastersTitles || 0;
  const challTitles  = titles.challengerTitles || 0;

  const firstTitle   = th.find(t => t.eliminatedRound === 'CHAMPION');
  const bestTitle    = th.filter(t => t.eliminatedRound === 'CHAMPION')
    .sort((a, b) => {
      const order = { KINGS_COURT: 5, PREMIER: 4, MASTERS: 3, CHALLENGER: 2, REDEMPTION: 1 };
      return (order[b.tier] || 0) - (order[a.tier] || 0);
    })[0];

  // BBP ranking
  const bbpRanking   = universeManager?.getBBPRanking?.() || [];
  const bbpRankNum   = bbpRanking.findIndex(r => r.playerId === playerId);
  const currentBBP   = bbpRankNum >= 0 ? bbpRankNum + 1 : null;
  const isPointsLeader = currentBBP === 1;

  // Achievements
  const achievements = universeManager?.achievementEngine?.playerAchievements?.get(playerId) || [];

  // ── DETECT ARCHETYPE ──
  const archetypeKey = detectNarrativeArchetype({
    totalTitles, peakRanking, yearsActive, totalMatches,
    promotions, relegations, isRetired, retireType, wr,
    titles,
  });
  const archetypeCfg  = STORY_ARCHETYPES[archetypeKey];
  const headline      = getNarrativeHeadline(archetypeKey, shortName, country);

  // ── BUILD NARRATIVE PARAGRAPHS ──
  const paragraphs = [];

  // Helper: title breakdown string
  const titleBreakdown = [];
  if (kcTitles > 0)    titleBreakdown.push(`${kcTitles} Kings Court`);
  if (premTitles > 0)  titleBreakdown.push(`${premTitles} Premier`);
  if ((titles.signatureClashTitles || 0) > 0) titleBreakdown.push(`${titles.signatureClashTitles}x Signature Clash`);
  if ((titles.invitationalTitles || 0) > 0) titleBreakdown.push(`${titles.invitationalTitles}x Invitational`); // legado
  if (mastTitles > 0)  titleBreakdown.push(`${mastTitles} Masters`);
  if (challTitles > 0) titleBreakdown.push(`${challTitles} Challenger`);
  if ((titles.openTitles || 0) > 0) titleBreakdown.push(`${titles.openTitles} Open`);
  const titlesStr = titleBreakdown.length > 0 ? titleBreakdown.join(', ') : null;

  // §1 — ABERTURA: origem e quem é
  {
    let p = '';
    const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
    if (archetypeKey === 'FAIRY_TALE') {
      p = pick([
        `Existem histórias que o circuito BBP guarda por décadas. A de ${player.name} é uma delas. ${cap(demonym)}, ainda classificado como Rising Star — ainda um amador, tecnicamente — ${shortName} entrou no The Crossover Open e fez o que ninguém considerou possível: venceu. Não um profissional. Não dois. Todos no caminho. O conto de fadas que o calendário criou para acontecer uma vez em geração.`,
        `Agosto. The Crossover Open. Trinta e dois profissionais. Dezesseis Rising Stars. E ${player.name}. O circuito BBP ainda processa o que aconteceu quando um ${demonym}, sem nenhum ano de carreira profissional nas costas, levantou o troféu mais improvável que este universo já produziu.`,
      ]);
    } else if (archetypeKey === 'INVITATIONAL_HERO') {
      p = pick([
        `O New Year's Signature Clash abre o ano com uma premissa simples: 64 bladers, uma única batalha, sua Signature Blade. Sem séries. Sem segunda chance. ${player.name} não recebeu o memorando de que novatos deveriam tremer. ${cap(demonym)}, chegando ao circuito BBP recém-promovido, navegou pelo bracket inteiro com uma única arma — e saiu campeão. A temporada nem tinha começado de verdade, e a narrativa já estava escrita.`,
        `Janeiro. Primeira semana do ano. Cada blader com a sua arma mais pessoal — a Signature Blade. ${player.name} — um ${demonym} recém-chegado ao BBP — contra os veteranos que dominaram o ano anterior. O Clash foi criado para ser um teste de identidade. Para ${shortName}, foi uma coroação precoce que fez o circuito inteiro recalibrar suas expectativas para os próximos doze meses.`,
      ]);
    } else if (archetypeKey === 'LEGEND') {
      p = pick([
        `${player.name} é um ${demonym} que chegou ao circuito BBP em ${debutYear} ${divStartLabel} e se tornou, com o tempo, o mais dominante competidor que este universo já viu. ${totalPoints > 0 ? `Com ${totalPoints.toLocaleString()} pontos acumulados${isPointsLeader ? ' — o maior total absoluto da história do BBP' : ''} — ` : ''}${shortName} não foi apenas um vencedor. Foi uma era.`,
        `Há nomes que o circuito BBP lembra com respeito. E há ${player.name}. ${cap(demonym)}, presente desde ${debutYear}, ${shortName} entrou ${divStartLabel} carregando ${mentStyle} — e transformou essa identidade em dominância absoluta que poucos conseguirão igualar.`,
      ]);
    } else if (archetypeKey === 'DYNASTY') {
      p = `${player.name} é um ${demonym} que estreou no circuito BBP em ${debutYear} ${divStartLabel}. Com ${mentStyle} como filosofia de jogo, o que parecia mais um competidor se tornaria um dos mais consistentes construtores de títulos que este universo simulado já produziu — não com explosão, mas com solidez e tempo.`;
    } else if (archetypeKey === 'PRODIGY') {
      p = `Há competidores que levam décadas para chegar ao topo. E há ${player.name}. ${cap(demonym)}, estreando em ${debutYear} ${divStartLabel}, ${shortName} comprimiu em apenas ${yearsActive <= 1 ? 'um ano' : `${yearsActive} anos`} uma carreira que outros jamais conseguiriam em uma geração inteira. O circuito BBP não estava preparado.`;
    } else if (archetypeKey === 'COMEBACK') {
      p = `A história de ${player.name} não é sobre talento natural — é sobre recusa. ${cap(demonym)}, no circuito desde ${debutYear}, ${shortName} caiu ${relegations} vez${relegations !== 1 ? 'es' : ''}, foi relegado, foi esquecido por alguns — e levantou todas as vezes. O tipo de trajetória que transforma um competidor em símbolo.`;
    } else if (archetypeKey === 'UNDERDOG_GLORY') {
      p = `Quando ${player.name} entrou no circuito BBP em ${debutYear} ${divStartLabel}, nenhuma aposta séria estaria nele. ${cap(demonym)}, operando com ${mentStyle}, ${shortName} era um nome entre muitos. O que veiu depois reescreveu a lista de favoritos — e deixou o circuito com a sensação de que subestimação tem um preço caro.`;
    } else if (archetypeKey === 'FALLEN_GIANT') {
      p = `Existem trajetórias que deixam uma pergunta no ar: e se? ${player.name} é uma delas. ${cap(demonym)}, chegando ao BBP em ${debutYear}, ${shortName} mostrou tudo que é preciso para se tornar o maior de sua geração. Só que a história, às vezes, não cabe na narrativa que imaginamos para ela.`;
    } else if (archetypeKey === 'DARK_HORSE') {
      p = `Ninguém colocaria ${player.name} no topo de qualquer lista de favoritos em ${debutYear}. ${cap(demonym)}, vindo ${divStartLabel}, sem favoritismo e sem alarde, ${shortName} entrou pelo lado de trás do circuito e surpreendeu todo mundo — inclusive, talvez, a si mesmo.`;
    } else if (archetypeKey === 'BRIEF_FLAME') {
      p = `Algumas histórias não são medidas em anos. São medidas em intensidade. ${player.name} ${retireYear ? `esteve no circuito BBP de ${debutYear} a ${retireYear}` : `passou pelo circuito BBP como uma chama rápida`} — ${cap(demonym)}, ${shortName} deixou mais marca do que muitos que ficaram o dobro do tempo.`;
    } else if (archetypeKey === 'IRON_WARRIOR') {
      p = `${totalMatches} partidas. Esse número, sozinho, conta muito sobre ${player.name}. ${cap(demonym)}, no circuito BBP desde ${debutYear}, ${shortName} não é necessariamente o mais temido ou o mais vistoso — mas é, sem dúvida, um dos mais presentes que este universo já produziu. Resistência também é uma forma de grandeza.`;
    } else if (archetypeKey === 'GRINDER') {
      p = `Há um tipo de competidor que não vive de holofotes. Que aparece, luta, perde às vezes, vence às vezes, e continua. ${player.name} é exatamente esse tipo. ${cap(demonym)}, no circuito desde ${debutYear}, ${shortName} representa algo que rankings raramente capturam: garra pura, sem filtro.`;
    } else {
      p = `${player.name} é um ${demonym} que deu seus primeiros passos no circuito BBP em ${debutYear} ${divStartLabel}. Com ${mentStyle} como bússola, a trajetória ainda está nos capítulos iniciais — mas os primeiros parágrafos já têm substância suficiente para prestar atenção.`;
    }
    paragraphs.push(p);
  }

  // §2 — CARREIRA: títulos, partidas, marcos concretos
  if (totalMatches >= 5 || totalTitles > 0) {
    let p = '';

    if (totalTitles === 0 && totalMatches >= 5) {
      if (archetypeKey === 'IRON_WARRIOR' || archetypeKey === 'GRINDER') {
        p = `Em ${totalMatches} partidas disputadas com ${wr}% de aproveitamento${bestStreak >= 5 ? ` e uma maior sequência de ${bestStreak} vitórias consecutivas` : ''}, ${shortName} construiu credibilidade sem jamais erguer um troféu. Há algo admirável em quem continua sem precisar de título para justificar a presença.`;
      } else {
        p = `Com ${totalMatches} partidas e ${wr}% de aproveitamento${peakRanking < 30 ? `, tendo chegado ao ranking #${peakRanking} no melhor momento` : ''}, o primeiro título ainda não veio — mas os alicerces estão construídos. ${bestStreak >= 4 ? `Uma sequência de ${bestStreak} vitórias seguidas mostra que o nível está lá.` : ''}`;
      }
    } else if (totalTitles === 1) {
      const t = firstTitle;
      const tname = t?.name || TIER_LABELS_STORY[t?.tier] || 'torneio';
      p = `A carreira tem ${totalMatches} partidas${totalPoints > 0 ? `, ${totalPoints.toLocaleString()} pontos acumulados` : ''} e um momento que define tudo: o título do ${tname}${t?.year ? ` em ${t.year}` : ''}. ${relegations > 1 ? `Conquistado após ${relegations} rebaixamentos — ` : ''}${wr >= 55 ? `Com ${wr}% de aproveitamento geral, esse título não foi um acidente. Foi uma afirmação.` : `Não veio fácil. E por isso pesa muito mais.`}`;
    } else {
      // Múltiplos títulos
      if (archetypeKey === 'LEGEND') {
        p = pick([
          `${totalTitles} títulos ao longo da carreira${titlesStr ? ` — ${titlesStr}` : ''}. Pico de ranking #${peakRanking < 99 ? peakRanking : '?'}. ${bestStreak >= 7 ? `Uma sequência de ${bestStreak} vitórias consecutivas que parou o circuito. ` : ''}${totalPoints > 0 ? `${totalPoints.toLocaleString()} pontos acumulados${isPointsLeader ? ' — o maior total da história do BBP' : ''}. ` : ''}Os números são impressionantes. Mas não capturam o que é sentir ${shortName} em pleno domínio.`,
          `Em ${totalMatches} partidas, ${wr}% de aproveitamento e ${totalTitles} títulos, ${player.name} construiu um legado que vai além de estatísticas. ${bestTitle ? `O ${bestTitle.name || TIER_LABELS_STORY[bestTitle.tier] || 'maior título'} é a joia da coroa — ` : ''}mas cada conquista tem um capítulo próprio de determinação. ${achievements.length > 0 ? `${achievements.length} achievements desbloqueados completam o quadro.` : ''}`,
        ]);
      } else if (archetypeKey === 'COMEBACK') {
        p = `${relegations} rebaixamentos. E mesmo assim, ${totalTitles} títulos${titlesStr ? ` — ${titlesStr}` : ''}. Em ${totalMatches} partidas e ${wr}% de aproveitamento, ${shortName} escreveu a resposta mais contundente possível para todos que duvidaram. O caminho foi irregular, humilhante às vezes — mas o destino foi o topo.`;
      } else if (archetypeKey === 'DYNASTY') {
        p = `${totalTitles} títulos${titlesStr ? ` — ${titlesStr}` : ''}, distribuídos ao longo de ${yearsActive} ano${yearsActive !== 1 ? 's' : ''} de competição. ${totalPoints > 0 ? `${totalPoints.toLocaleString()} pontos no BBP. ` : ''}Com ${wr}% de aproveitamento em ${totalMatches} partidas, a consistência de ${shortName} não foi sorte — foi construção metódica, partida a partida, temporada a temporada.`;
      } else {
        p = `Ao longo de ${totalMatches} partidas e com ${wr}% de aproveitamento, ${shortName} acumulou ${totalTitles} títulos${titlesStr ? ` — ${titlesStr}` : ''}${totalPoints > 0 ? ` e ${totalPoints.toLocaleString()} pontos no circuito` : ''}${bestStreak >= 5 ? `, além de uma sequência de ${bestStreak} vitórias consecutivas que ficou na memória do circuito` : ''}. A carreira tem substância.`;
      }
    }
    paragraphs.push(p);
  }

  // §3 — SIGNATURE BLADE (se disponível)
  if (sig) {
    const sigWR   = sigStats?.totalRounds > 0
      ? ((sigStats.totalWins / sigStats.totalRounds) * 100).toFixed(0)
      : null;
    const sigName = sig.signatureName || sig.type || 'Signature Blade';
    const sigType = sig.type || 'Balanced';
    const sigRnds = sigStats?.totalRounds || 0;

    let p = '';
    if (archetypeKey === 'LEGEND' || archetypeKey === 'DYNASTY') {
      p = `O ${sigName} se tornou mais do que uma ferramenta — virou uma extensão da identidade de ${shortName}. ${cap => cap.charAt(0).toUpperCase() + cap.slice(1)}${sigType} de tipo, construído para ${mentStyle}, o peão carrega ${sigRnds} rounds de história${sigWR ? ` e ${sigWR}% de aproveitamento` : ''}. Quando o nome de ${shortName} é lembrado, o ${sigName} sempre aparece junto.`;
    } else if (archetypeKey === 'COMEBACK') {
      p = `O ${sigName} foi o companheiro fiel em cada queda e em cada ascensão. ${sigRnds} rounds disputados juntos${sigWR ? `, ${sigWR}% de aproveitamento` : ''}. Há uma sinergia entre esse competidor e seu peão que vai além de técnica — é sobrevivência compartilhada.`;
    } else {
      p = `Seu Signature Blade, o ${sigName}, já acumula ${sigRnds} rounds de história${sigWR ? ` com ${sigWR}% de aproveitamento` : ''}. Um ${sigType} que reflete bem ${mentStyle} — a combinação não é coincidência.`;
    }
    paragraphs.push(p);
  }

  // §4 — RIVALIDADES + DESFECHO (ativo ou aposentado)
  {
    let p = '';
    const cap = s => s.charAt(0).toUpperCase() + s.slice(1);

    if (isRetired) {
      const retLabel = {
        LEGENDARY: `saiu pelo alto — escolheu o próprio tempo, deixou enquanto ainda estava no pico`,
        NATURAL: `encerrou naturalmente após ${yearsActive} temporada${yearsActive !== 1 ? 's' : ''}`,
        DECLINE: `lutou até onde o corpo permitiu, recusando parar antes da hora`,
        INJURY: `foi parado por uma lesão antes de poder escrever mais capítulos`,
        PREMATURE: `saiu cedo demais — o circuito ainda debate o que poderia ter sido`,
      }[retireType] || `encerrou a carreira${retireYear ? ` em ${retireYear}` : ''}`;

      if (archetypeKey === 'LEGEND' || archetypeKey === 'DYNASTY') {
        p = `${topRivalName ? `A rivalidade com ${topRivalName} é um dos capítulos mais ricos de uma carreira repleta de histórias épicas. ` : ''}${shortName} ${retLabel}. O circuito BBP não é o mesmo depois dele — e talvez nunca mais seja.`;
      } else if (archetypeKey === 'FALLEN_GIANT') {
        p = `${shortName} ${retLabel}. ${topRivalName ? `Sem resolver de vez a rivalidade com ${topRivalName}, ` : ''}ficou no ar a sensação de uma grandeza que nunca foi completamente revelada. O "e se?" de ${shortName} ainda ressoa.`;
      } else if (archetypeKey === 'BRIEF_FLAME') {
        p = `${shortName} ${retLabel}. Em pouco tempo, deixou mais marca do que competidores com o dobro da carreira. ${topRivalName ? `A batalha com ${topRivalName}, embora breve, foi intensa o suficiente para entrar na memória do circuito. ` : ''}Algumas histórias não precisam de muitos capítulos para serem memoráveis.`;
      } else if (archetypeKey === 'COMEBACK') {
        p = `${shortName} ${retLabel}. A narrativa completa — as quedas, os rebaixamentos, os títulos arrancados na força da vontade — é o tipo de história que o circuito BBP conta para as gerações seguintes. ${topRivalName ? `A rivalidade com ${topRivalName} foi o capítulo mais dramático de todas. ` : ''}Um legado de resistência.`;
      } else {
        p = `${shortName} ${retLabel}. ${yearsActive > 0 ? `${yearsActive} temporada${yearsActive !== 1 ? 's' : ''} dedicadas ao circuito BBP` : 'Anos de dedicação'} — e isso, no fim, é o que fica. ${topRivalName ? `As batalhas contra ${topRivalName} ficam na memória. ` : ''}Uma carreira honesta. Um legado construído no trabalho.`;
      }
    } else {
      // Ativo
      if (archetypeKey === 'LEGEND' || archetypeKey === 'DYNASTY') {
        p = `${topRivalName ? `A rivalidade com ${topRivalName} adiciona ainda mais textura a uma carreira já saturada de grandes momentos. ` : ''}${currentBBP ? `Atualmente ranking #${currentBBP} no BBP, ` : ''}${shortName} ainda está longe de escrever o ponto final. A questão não é se ele vai deixar marca — é qual tamanho essa marca vai ter.`;
      } else if (archetypeKey === 'RISING') {
        p = `${shortName} tem tudo pela frente. Com ${mentStyle} como identidade e os primeiros capítulos já escritos, cada torneio é uma nova oportunidade de surpreender. O circuito BBP ainda não sabe exatamente o que esperar desse competidor — e essa incerteza é, talvez, sua maior vantagem.`;
      } else if (archetypeKey === 'COMEBACK') {
        p = `${topRivalName ? `A rivalidade com ${topRivalName} é o capítulo mais dramático de uma trajetória já cheia de reviravoltas. ` : ''}${shortName} segue em atividade — e quem já viu esse competidor cair e levantar sabe que apostar contra ele é o tipo de decisão que se lamenta depois.`;
      } else {
        p = `${topRivalName ? `A rivalidade com ${topRivalName} é um dos capítulos mais ricos da trajetória. ` : ''}${shortName} continua ativo no BBP${currentBBP ? `, atualmente ranking #${currentBBP}` : ''}. A história ainda está sendo escrita — e já tem substância suficiente para ser lembrada.`;
      }
    }
    paragraphs.push(p);
  }

  return { archetypeKey, archetypeCfg, headline, paragraphs };
}

// ============================================
// MAIN EXPORT
// ============================================
export const UnifiedPlayerProfile = ({
  playerId,
  onClose,
  universeManager = null,
  variant = 'fullscreen'
}) => {
  const [activeTab, setActiveTab]   = useState('perfil');
  const [, forceUpdate]             = useState(0);
  const fileInputRef                = useRef(null);
  const picFileRef                  = useRef(null);
  const fullFileRef                 = useRef(null);
  const [imgModal, setImgModal]     = useState(null); // 'pic' | 'full' | null
  const [urlInput, setUrlInput]     = useState('');

  // ── Nota do jogador (parágrafo custom) ──
  const [editingNote, setEditingNote] = useState(false);
  const [noteInput, setNoteInput]     = useState('');

  // ── All hooks (always executed) ──
  const player = useMemo(() => {
    // Se tem universeManager, busca dele (inclui TEAMS e newgens)
    if (universeManager) {
      return universeManager.getPlayerById(playerId);
    }
    // Fallback para TEAMS diretamente (modo sem universo)
    return TEAMS[playerId] || null;
  }, [playerId, universeManager]);
  
  const isDynamic    = useMemo(() => !!universeManager, [universeManager]);

  const playerHistory = useMemo(() => {
    if (!isDynamic || !universeManager) return null;
    return universeManager.playerHistories?.get(playerId) || {
      totalMatches:0, wins:0, losses:0,
      titles:{ atp250:0, masters:0, grandSlams:0, total:0 },
      tournamentHistory:[],
      eventHistory: [] // ✅ FIX: Garantir que eventHistory existe
    };
  }, [isDynamic, universeManager, playerId]);

  const formData   = useMemo(() => isDynamic && universeManager?.formManager   ? universeManager.formManager.getFormaSummary(playerId)                : null, [isDynamic, universeManager, playerId]);
  const careerData = useMemo(() => isDynamic && universeManager?.careerSystem && player ? universeManager.careerSystem.getCareer(player.name) : null, [isDynamic, universeManager, player]);
  const aiData     = useMemo(() => isDynamic && universeManager?.aiManager     ? universeManager.aiManager.getAI(playerId)                    : null, [isDynamic, universeManager, playerId]);

  // ── Trait data (combina PLAYER_TRAITS estático + traits do objeto do jogador p/ newgens) ──
  const traitInfo = useMemo(() => {
    if (!player) return { traits: [], negTypes: {}, shadowProgress: {}, traitMilestones: {}, dnaProfile: null };

    // Newgens têm traits diretamente no objeto; jogadores fixos em PLAYER_TRAITS
    const fromObj    = Array.isArray(player.traits) && player.traits.length > 0;
    const staticData = getPlayerTraitData(player.name);
    const traits     = fromObj ? player.traits : (staticData.traits || []);

    const negTypes       = fromObj ? (player.traitNegTypes      || {}) : (staticData.negTypes       || {});
    const shadowProgress = fromObj ? (player.shadowProgress     || {}) : (staticData.shadowProgress  || {});
    const traitMilestones= fromObj ? (player.traitMilestones    || {}) : (staticData.traitMilestones  || {});
    const dna            = fromObj ? (player.traitDNA            ?? null) : (staticData.traitDNA      ?? null);
    const dnaProfile     = dna !== null ? getTraitDNAProfile(dna) : null;

    return { traits, negTypes, shadowProgress, traitMilestones, dnaProfile };
  }, [player, playerId]);

  const stats = useMemo(() => {
    const base = {
      totalTitles: playerHistory?.titles?.total || 0,
      totalMatches: playerHistory?.totalMatches || 0,
      wins:   playerHistory?.wins   || 0,
      losses: playerHistory?.losses || 0,
      winRate: playerHistory?.totalMatches > 0
        ? ((playerHistory.wins / playerHistory.totalMatches) * 100).toFixed(1) : '0.0',
      level: careerData?.level || 1,
      xp:    careerData?.experiencePoints || 0,
      form:  formData?.currentForm || 50,
      ranking: 0,
    };
    if (isDynamic && universeManager) {
      const idx = universeManager.getBBPRanking().findIndex(r => r.playerId === playerId);
      base.ranking = idx >= 0 ? idx + 1 : 99;
    }
    return base;
  }, [playerHistory, careerData, formData, isDynamic, universeManager, playerId]);

  const playerTweets = useMemo(() => {
    if (!isDynamic || !universeManager?.socialEngine || !player) return [];
    return (universeManager.socialEngine.recentTweets || [])
      .filter(t => t.author === player.name || t.content?.includes(player.name) || t.mentions?.includes(playerId))
      .slice(0, 25);
  }, [isDynamic, universeManager, playerId, player]);

  const trendingTopics = useMemo(() =>
    isDynamic && universeManager?.socialEngine ? universeManager.socialEngine.trendingTopics || [] : [],
    [isDynamic, universeManager]);

  // ── Early return after all hooks ──
  if (!player) return null;

  // ── Derived values ──
  const pColor    = player.colors?.[0] || '#ffd700';
  const p2Color   = player.colors?.[1] || pColor;
  const tierCls   = player.tier === 'ELITE' ? 'tb-elite' : player.tier === 'TOP' ? 'tb-top' : 'tb-pro';
  const shortName = (player.name || 'Jogador').replace(/"[^"]*"\s*/, '');
  const mentality = MENTALITIES[player.mentality || 'ALL_ROUNDER'] || MENTALITIES.ALL_ROUNDER;
  const isModal   = variant === 'modal';

  const tabs = [
    { id:'perfil',    name:'PERFIL',      emoji:'👤' },
    { id:'rivals',    name:'RIVALIDADES', emoji:'⚔️' },
    { id:'atributos', name:'ATRIBUTOS',   emoji:'⚡' },
    { id:1,           name:'ARSENAL',     emoji:'🔩' },
    { id:3,           name:'TÍTULOS',     emoji:'🏆' },
    { id:4,           name:'HISTÓRICO',   emoji:'📜' },
    { id:5,           name:'ARENAS',      emoji:'🏟️' },
    { id:6,           name:'FORMA',       emoji:'💪' },
    { id:7,           name:'SOCIAL',      emoji:'📱' },
    { id:'launches',  name:'LAUNCHES',    emoji:'🚀' },
    { id:'badges',    name:'BADGES',      emoji:'🏅' },
    { id:9,           name:'DADOS',       emoji:'📊' },
  ];

  const handleIconUpload = (e) => {
    const file = e.target.files[0];
    if (!file || !file.type.startsWith('image/')) { alert('Selecione uma imagem válida'); return; }
    const reader = new FileReader();
    reader.onload = ev => { player.customIcon = ev.target.result; forceUpdate(n => n + 1); };
    reader.readAsDataURL(file);
  };

  // ── Handlers de imagem (pic / full) ──
  const applyImage = (type, src) => {
    if (!src) return;
    if (type === 'pic') {
      player.customIcon = src;
      player.iconUrl    = src;
    } else {
      player.fullBodyUrl = src;
      player.photoUrl    = src;
    }
    forceUpdate(n => n + 1);
    setImgModal(null);
    setUrlInput('');
  };

  const handleImgFile = (type) => (e) => {
    const file = e.target.files[0];
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = ev => applyImage(type, ev.target.result);
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const Empty = ({ msg }) => (
    <div className="up-card" style={{ padding:'52px 24px', textAlign:'center' }}>
      <div style={{ fontFamily:'Orbitron,monospace', fontSize:15, letterSpacing:'.25em', color:'rgba(255,215,0,0.4)' }}>{msg}</div>
    </div>
  );

  // ── Main JSX ──
  const inner = (
    <div style={{ width:'100%', minHeight: isModal ? 'auto' : '100vh', display:'flex', flexDirection:'column',
      background:'radial-gradient(ellipse 130% 90% at 50% 110%, #1e0035 0%, #0a000f 50%, #000008 100%)',
      fontFamily:'Rajdhani, sans-serif', color:'white', position:'relative', overflow:'hidden',
      ...(isModal ? { maxHeight:'95vh', overflow:'hidden' } : {}),
    }} onClick={e => e.stopPropagation()}>
      <style>{PROFILE_STYLES}</style>

      {/* ── Ambient BG ── */}
      <div style={{ position:'absolute', inset:0, pointerEvents:'none', zIndex:0,
        backgroundImage:'linear-gradient(rgba(0,212,255,0.022) 1px,transparent 1px),linear-gradient(90deg,rgba(0,212,255,0.022) 1px,transparent 1px)',
        backgroundSize:'60px 60px', maskImage:'radial-gradient(ellipse 80% 65% at 50% 100%,black,transparent)',
        WebkitMaskImage:'radial-gradient(ellipse 80% 65% at 50% 100%,black,transparent)',
      }} />
      <div style={{ position:'absolute', top:'-5%', left:'-5%', width:700, height:700, borderRadius:'50%', background:`radial-gradient(circle,${pColor}0f,transparent 65%)`, filter:'blur(80px)', pointerEvents:'none', zIndex:0 }} />
      <div style={{ position:'absolute', bottom:'0%', right:'0%', width:500, height:500, borderRadius:'50%', background:'radial-gradient(circle,rgba(0,212,255,0.06),transparent 70%)', filter:'blur(80px)', pointerEvents:'none', zIndex:0 }} />
      {/* scanline */}
      <div style={{ position:'absolute', inset:0, overflow:'hidden', zIndex:1, opacity:.1, pointerEvents:'none' }}>
        <div style={{ width:'100%', height:'2px', background:'linear-gradient(90deg,transparent,rgba(0,212,255,0.8),transparent)', animation:'up-scan 10s linear infinite' }} />
      </div>

      {/* ── CLOSE ── */}
      {onClose && <button className="up-close" onClick={onClose}>✕ FECHAR</button>}

      {/* ══════════════════════════════════════════════════════════════════════
          HERO HEADER
      ══════════════════════════════════════════════════════════════════════ */}
      <div style={{ position:'relative', zIndex:2, minHeight:240, overflow:'hidden',
        borderBottom:`1px solid ${pColor}25`,
        background:`linear-gradient(135deg, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.4) 100%)`,
      }}>
        {/* Diagonal color slash behind (centralized) */}
        <div style={{ position:'absolute', left:'50%', transform:'translateX(-50%)', top:0, bottom:0, width:'80%', background:`linear-gradient(90deg, transparent, ${pColor}08 50%, transparent)`, pointerEvents:'none' }} />

        {/* Content - CENTRALIZADO */}
        <div style={{ 
          position:'relative', 
          zIndex:3, 
          display:'flex', 
          flexDirection:'column',
          alignItems:'center', 
          gap:16, 
          padding:'28px 28px 22px',
          textAlign:'center'
        }}>

          {/* Portrait icon */}
          <div className="up-icon-wrap" style={{ position:'relative', flexShrink:0 }}>
            {/* Outer spinning ring */}
            <div style={{ position:'absolute', inset:-8, borderRadius:'50%', border:`1px solid ${pColor}30`, animation:'up-spin 12s linear infinite', pointerEvents:'none' }} />
            <div style={{ position:'absolute', inset:-14, borderRadius:'50%', border:`1px solid ${pColor}18`, animation:'up-spin-r 18s linear infinite', pointerEvents:'none' }} />

            <div style={{ width:120, height:120, borderRadius:'50%', overflow:'hidden', position:'relative',
              border:`3px solid ${pColor}99`, boxShadow:`0 0 40px ${pColor}44, 0 0 80px ${pColor}22, inset 0 0 30px rgba(0,0,0,.5)`,
              background:`radial-gradient(circle at 30% 30%, ${pColor}22, rgba(0,0,0,.7))`,
              display:'flex', alignItems:'center', justifyContent:'center',
            }}>
              {(player.customIcon || player.iconUrl) ? (
                <img src={player.customIcon || player.iconUrl} alt={player.name}
                  style={{ width:'100%', height:'100%', objectFit:'cover' }}
                  onError={e => { e.target.src = player.photoUrl; }} />
              ) : (
                <span style={{ fontFamily:'Black Ops One,cursive', fontSize:52, color:pColor, textShadow:`0 0 20px ${pColor}` }}>{player.name[0]}</span>
              )}
              {/* Upload overlay */}
              <button className="up-upload" onClick={() => fileInputRef.current?.click()}
                style={{ position:'absolute', inset:0, borderRadius:'50%', background:'rgba(0,0,0,.65)', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <Upload size={26} color="white" />
              </button>
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleIconUpload} style={{ display:'none' }} />

            {/* Color ring indicator */}
            <div style={{ position:'absolute', bottom:-2, left:'50%', transform:'translateX(-50%)', display:'flex', gap:5 }}>
              {(player.colors || [pColor, p2Color, '#ffffff']).slice(0,3).map((c,i) => (
                <div key={i} style={{ width:10, height:10, borderRadius:'50%', background:c, border:'1px solid rgba(255,255,255,.3)', boxShadow:`0 0 6px ${c}` }} />
              ))}
            </div>
          </div>

          {/* Identity block - CENTRALIZADO */}
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:10 }}>

            {/* Tags row */}
            <div style={{ display:'flex', gap:7, alignItems:'center', flexWrap:'wrap', justifyContent:'center' }}>
              <div className={`tbadge ${tierCls}`}>{player.tier || 'PRO'}</div>
              <div className="up-mentality" style={{ color:pColor, borderColor:`${pColor}50`, background:`${pColor}08` }}>
                {(player.mentality || 'ALL_ROUNDER').replace(/_/g,' ')}
              </div>
              {player.age != null && (
                <div className="tbadge" style={{ color:'#38bdf8', borderColor:'rgba(56,189,248,.45)', background:'rgba(56,189,248,.07)' }}>
                  {player.age} anos
                </div>
              )}
              {isDynamic && <div className="tbadge" style={{ color:'rgba(255,255,255,.6)', borderColor:'rgba(255,255,255,.2)', background:'rgba(255,255,255,.04)' }}>
                BBP #{stats.ranking}
              </div>}
              {/* 🏛️ Era Badge */}
              {isDynamic && universeManager?.eraSystem && (() => {
                const eraLabel = universeManager.eraSystem.getPlayerEraLabel?.(playerId, universeManager);
                if (!eraLabel) return null;
                return (
                  <div className="tbadge" style={{ color:'#c9a84c', borderColor:'rgba(201,168,76,0.4)', background:'rgba(201,168,76,0.07)' }}>
                    🏛️ {eraLabel}
                  </div>
                );
              })()}
            </div>

            {/* BIG NAME */}
            <div style={{
              fontFamily:'Black Ops One,cursive',
              fontSize:'clamp(28px, 4.5vw, 58px)',
              lineHeight:.88,
              background:`linear-gradient(160deg, #ffffff 0%, ${pColor} 55%, ${p2Color} 100%)`,
              WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent',
              filter:`drop-shadow(0 0 28px ${pColor}66)`,
              letterSpacing:'-.01em',
            }}>
              {shortName}
            </div>

            {/* Country + play style */}
            <div style={{ display:'flex', gap:10, alignItems:'center', flexWrap:'wrap', justifyContent:'center' }}>
              <span style={{ fontSize:20 }}>{(player.country || '🌍 Global').split(' ')[0]}</span>
              <div style={{ width:1, height:14, background:'rgba(255,255,255,.15)' }} />
              <span style={{ fontFamily:'Rajdhani,sans-serif', fontSize:17, color:'rgba(255,255,255,.45)', fontStyle:'italic' }}>{player.playStyle || 'Estilo Desconhecido'}</span>
            </div>

            {/* Quick stats strip */}
            <div style={{ display:'flex', gap:8, flexWrap:'wrap', justifyContent:'center' }}>
              {[
                { l:'RANKING', v: isDynamic ? `#${stats.ranking}` : '—',  c:'#ffd700' },
                { l:'TÍTULOS', v: stats.totalTitles,                        c: pColor  },
                { l:'WIN %',   v: `${stats.winRate}%`,                     c:'#22c55e' },
                { l:'MATCHES', v: stats.totalMatches,                       c:'rgba(255,255,255,.6)' },
                { l:'FORMA',   v: isDynamic ? stats.form : '—',
                  c: stats.form>=70?'#22c55e':stats.form>=40?'#f59e0b':'#ef4444' },
                { l:'LEVEL',   v: isDynamic ? (careerData?.level || 1) : '—', c:'#a855f7' },
              ].map(s => (
                <div key={s.l} className="up-stat-box" style={{ minWidth:82 }}>
                  <div style={{ fontFamily:'Orbitron,monospace', fontSize:12, letterSpacing:'.1em', color:'rgba(255,215,0,.5)', marginBottom:5 }}>{s.l}</div>
                  <div style={{ fontFamily:'Black Ops One,cursive', fontSize:26, color:s.c, lineHeight:1, textShadow:`0 0 12px ${s.c}77` }}>{s.v}</div>
                </div>
              ))}
            </div>

          {/* ── TRAIT PILLS — sempre visíveis no header ── */}
          {traitInfo.traits.length > 0 && (() => {
            const TIER_STYLE = {
              LEN: { bg:'rgba(255,215,0,0.12)',  border:'rgba(255,215,0,0.45)',  color:'#ffd700', glow:'#ffd700' },
              RAR: { bg:'rgba(168,85,247,0.12)', border:'rgba(168,85,247,0.45)', color:'#c084fc', glow:'#a855f7' },
              COM: { bg:'rgba(34,197,94,0.08)',  border:'rgba(34,197,94,0.35)',  color:'#4ade80', glow:'#22c55e' },
              NEG: { bg:'rgba(239,68,68,0.08)',  border:'rgba(239,68,68,0.30)',  color:'#f87171', glow:'#ef4444' },
            };
            return (
              <div style={{ display:'flex', gap:6, flexWrap:'wrap', justifyContent:'center', marginTop:8 }}>
                {traitInfo.traits.map((t, i) => {
                  const def = TRAITS[t.id];
                  if (!def) return null;
                  const ts    = TIER_STYLE[t.tier] || TIER_STYLE.COM;
                  const isNeg = t.tier === 'NEG';
                  const negType = isNeg ? (traitInfo.negTypes[t.id] || 'CICATRIZ') : null;
                  return (
                    <div key={i} title={def.tiers[t.tier]?.descricao || ''} style={{
                      display:'inline-flex', alignItems:'center', gap:5,
                      padding:'6px 14px', borderRadius:20,
                      background: ts.bg, border:`1px solid ${ts.border}`,
                      cursor:'default',
                      boxShadow: t.tier === 'LEN' ? `0 0 12px ${ts.glow}44` : 'none',
                      animation:'up-entry .3s ease both', animationDelay:`${i*0.06}s`,
                    }}>
                      <span style={{ fontSize:16 }}>{def.icon}</span>
                      <span style={{ fontFamily:'Orbitron,monospace', fontSize:12, letterSpacing:'.1em', color: ts.color }}>
                        {def.tiers[t.tier]?.variantName || def.name}
                      </span>
                      <span style={{
                        fontFamily:'Orbitron,monospace', fontSize:11, letterSpacing:'.08em',
                        padding:'1px 5px', borderRadius:10,
                        background: isNeg ? 'rgba(239,68,68,0.18)' : `${ts.glow}22`,
                        color: isNeg ? '#fca5a5' : ts.color,
                      }}>
                        {isNeg ? (negType === 'SOMBRA' ? '🌑' : '🔴') : t.tier}
                      </span>
                    </div>
                  );
                })}
              </div>
            );
          })()}

          </div>
        </div>

        {/* Bottom strip */}
        <div style={{ position:'relative', zIndex:3, padding:'10px 28px 18px', display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ height:1, flex:1, background:`linear-gradient(90deg,${pColor}40,transparent)` }} />
          <div style={{ fontFamily:'Orbitron,monospace', fontSize:13, letterSpacing:'.16em', color:'rgba(255,215,0,0.55)' }}>{player.physicalDesc || 'Descrição física não disponível'}</div>
          <div style={{ height:1, flex:1, background:'linear-gradient(90deg,transparent,rgba(255,255,255,.05))' }} />
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          STICKY TABS
      ══════════════════════════════════════════════════════════════════════ */}
      <div style={{ position:'sticky', top:0, zIndex:20, flexShrink:0,
        background:'rgba(0,0,0,0.75)', backdropFilter:'blur(14px)',
        borderBottom:'1px solid rgba(255,255,255,.06)',
        display:'flex', overflowX:'auto',
      }}>
        {tabs.map(t => (
          <button key={t.id} className={`up-tab ${activeTab===t.id?'active':''}`} onClick={() => setActiveTab(t.id)}>
            <span style={{ marginRight:5 }}>{t.emoji}</span>{t.name}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          TAB CONTENT
      ══════════════════════════════════════════════════════════════════════ */}
      <div className="up-scroll" style={{ flex:1, overflowY:'auto', padding:'22px 28px 56px', position:'relative', zIndex:2,
        ...(isModal ? { maxHeight:'calc(95vh - 400px)' } : {}),
      }}>

        {/* ─── RIVALS: RIVALIDADES ─── */}
        {activeTab === 'rivals' && (() => {
          const rs = universeManager?.rivalrySystem;
          const rivalries = rs ? rs.getPlayerRivalries(playerId) : [];

          const RTYPE = {
            CLASSIC:       { icon:'⚔️',  label:'Clássica',            color:'#ffd700' },
            DOMINATION:    { icon:'👑',  label:'Dominância',           color:'#ef4444' },
            GIANT_KILLER:  { icon:'🎯',  label:'Caçador de Gigantes',  color:'#22c55e' },
            GRUDGE:        { icon:'🔥',  label:'Rancor',               color:'#f97316' },
            FINALS_CURSE:  { icon:'🏆',  label:'Maldição das Finais',  color:'#c084fc' },
            THRONE_RIVALS: { icon:'💎',  label:'Rivais do Trono',      color:'#06b6d4' },
            ERA_CLASH:     { icon:'🌀',  label:'Choque de Eras',       color:'#a855f7' },
          };
          const RSTATUS = {
            BREWING:   { label:'Emergindo',  color:'#94a3b8' },
            ACTIVE:    { label:'Ativa',      color:'#22c55e' },
            INTENSE:   { label:'Intensa',    color:'#f97316' },
            LEGENDARY: { label:'Lendária',   color:'#ffd700' },
            FROZEN:    { label:'Encerrada',  color:'#60a5fa' },
          };

          const getOpponent = (r) => {
            const oppId = r.p1Id === playerId ? r.p2Id : r.p1Id;
            return universeManager?.getPlayerById?.(oppId) || TEAMS[oppId] || { name: `#${oppId}`, id: oppId };
          };
          const myRecord = (r) => {
            const iAm1 = r.p1Id === playerId;
            return { wins: iAm1 ? r.p1Wins : r.p2Wins, losses: iAm1 ? r.p2Wins : r.p1Wins };
          };

          return (
            <div style={{ animation:'up-entry .4s ease both', display:'flex', flexDirection:'column', gap:0 }}>

              {/* ── HEADER ── */}
              <div style={{ marginBottom:24 }}>
                <div className="up-label">⚔️ RIVALIDADES</div>
                {rivalries.length === 0 && (
                  <div className="up-card" style={{ padding:'40px 20px', textAlign:'center' }}>
                    <div style={{ fontSize:40, marginBottom:12, opacity:.3 }}>⚔️</div>
                    <div style={{ fontFamily:'Orbitron,monospace', fontSize:15, letterSpacing:'.3em', color:'rgba(255,255,255,0.25)' }}>
                      {isDynamic ? 'NENHUMA RIVALIDADE AINDA — JOGUE MAIS TORNEIOS' : 'INICIE O UNIVERSE MODE'}
                    </div>
                  </div>
                )}
              </div>

              {/* ── LISTA DE RIVAIS ── */}
              {rivalries.length > 0 && (
                <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                  {rivalries.map((r, i) => {
                    const opp       = getOpponent(r);
                    const rec       = myRecord(r);
                    const typeInfo  = RTYPE[r.type]  || RTYPE.CLASSIC;
                    const statInfo  = RSTATUS[r.status] || RSTATUS.ACTIVE;
                    const isLegend  = r.status === 'LEGENDARY';
                    const isFrozen  = r.status === 'FROZEN';
                    const winPct    = r.totalMatches > 0 ? Math.round((rec.wins / r.totalMatches) * 100) : 0;
                    const oppColor  = opp.colors?.[0] || '#888';
                    const intPct    = Math.round(r.intensity * 100);

                    return (
                      <div key={r.key} style={{
                        position:'relative', borderRadius:14, overflow:'hidden',
                        border: isLegend ? '1px solid rgba(255,215,0,0.35)' : isFrozen ? '1px solid rgba(96,165,250,0.25)' : `1px solid rgba(255,255,255,0.08)`,
                        background: isLegend ? 'rgba(255,215,0,0.04)' : 'rgba(255,255,255,0.02)',
                        animation:'up-entry .4s ease both', animationDelay:`${i*0.07}s`,
                      }}>
                        {/* Glow lendário */}
                        {isLegend && <div style={{ position:'absolute', inset:0, background:'radial-gradient(ellipse 60% 40% at 50% 0%,rgba(255,215,0,0.08),transparent)', pointerEvents:'none' }} />}

                        {/* Left accent */}
                        <div style={{ position:'absolute', left:0, top:0, bottom:0, width:4, background:`linear-gradient(180deg,${typeInfo.color},${typeInfo.color}44)` }} />

                        <div style={{ padding:'18px 20px 18px 24px' }}>
                          {/* ── TOP ROW: Badges ── */}
                          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14, flexWrap:'wrap' }}>
                            {/* Tipo */}
                            <div style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'3px 10px', borderRadius:20, background:`${typeInfo.color}15`, border:`1px solid ${typeInfo.color}40` }}>
                              <span style={{ fontSize:16 }}>{typeInfo.icon}</span>
                              <span style={{ fontFamily:'Orbitron,monospace', fontSize:12, letterSpacing:'.12em', color:typeInfo.color }}>{typeInfo.label}</span>
                            </div>
                            {/* Status */}
                            <div style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'3px 10px', borderRadius:20, background:`${statInfo.color}10`, border:`1px solid ${statInfo.color}30` }}>
                              {!isFrozen && <div style={{ width:5, height:5, borderRadius:'50%', background:statInfo.color, boxShadow:`0 0 6px ${statInfo.color}` }} />}
                              {isFrozen && <span style={{ fontSize:15 }}>❄️</span>}
                              <span style={{ fontFamily:'Orbitron,monospace', fontSize:12, letterSpacing:'.12em', color:statInfo.color }}>{statInfo.label}</span>
                            </div>
                            {/* Intensidade */}
                            <div style={{ marginLeft:'auto', fontFamily:'Orbitron,monospace', fontSize:13, color:'rgba(255,255,255,0.3)' }}>INTENSIDADE {intPct}%</div>
                          </div>

                          {/* ── OPONENTE + RECORD ── */}
                          <div style={{ display:'flex', gap:16, alignItems:'center', marginBottom:14 }}>
                            {/* Foto oponente */}
                            <div style={{ width:52, height:52, borderRadius:10, overflow:'hidden', flexShrink:0, border:`2px solid ${oppColor}40`, background:'rgba(0,0,0,0.4)' }}>
                              {(opp.photoUrl || opp.iconUrl)
                                ? <img src={opp.photoUrl || opp.iconUrl} alt={opp.name} style={{ width:'100%', height:'100%', objectFit:'cover' }} onError={e=>{e.target.style.display='none'}} />
                                : <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'Black Ops One,cursive', fontSize:20, color:oppColor }}>{(opp.name||'?')[0]}</div>
                              }
                            </div>

                            <div style={{ flex:1 }}>
                              <div style={{ fontFamily:'Black Ops One,cursive', fontSize:20, color:'#fff', lineHeight:1.1, marginBottom:4 }}>{opp.name}</div>
                              <div style={{ fontFamily:'Rajdhani,sans-serif', fontSize:17, color:'rgba(255,255,255,0.4)' }}>
                                {opp.country || ''}{opp.age ? ` · ${opp.age} anos` : ''}
                              </div>
                            </div>

                            {/* H2H Record — o elemento central */}
                            <div style={{ textAlign:'center', flexShrink:0 }}>
                              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                                <div style={{ textAlign:'center' }}>
                                  <div style={{ fontFamily:'Black Ops One,cursive', fontSize:42, color: rec.wins >= rec.losses ? pColor : 'rgba(255,255,255,0.5)', lineHeight:1, textShadow: rec.wins > rec.losses ? `0 0 20px ${pColor}66` : 'none' }}>{rec.wins}</div>
                                  <div style={{ fontFamily:'Orbitron,monospace', fontSize:12, letterSpacing:'.1em', color:'rgba(255,255,255,0.3)', marginTop:2 }}>VITÓRIAS</div>
                                </div>
                                <div style={{ fontFamily:'Black Ops One,cursive', fontSize:18, color:'rgba(255,255,255,0.2)', paddingBottom:14 }}>—</div>
                                <div style={{ textAlign:'center' }}>
                                  <div style={{ fontFamily:'Black Ops One,cursive', fontSize:42, color: rec.losses > rec.wins ? '#ef4444' : 'rgba(255,255,255,0.5)', lineHeight:1 }}>{rec.losses}</div>
                                  <div style={{ fontFamily:'Orbitron,monospace', fontSize:12, letterSpacing:'.1em', color:'rgba(255,255,255,0.3)', marginTop:2 }}>DERROTAS</div>
                                </div>
                              </div>
                              <div style={{ fontFamily:'Orbitron,monospace', fontSize:13, color:'rgba(255,255,255,0.25)', marginTop:4 }}>{r.totalMatches} partidas totais</div>
                            </div>
                          </div>

                          {/* ── BARRA DE INTENSIDADE ── */}
                          <div style={{ marginBottom:12 }}>
                            <div style={{ height:3, borderRadius:2, background:'rgba(255,255,255,0.06)', overflow:'hidden' }}>
                              <div style={{ height:'100%', borderRadius:2, width:`${intPct}%`, background: isLegend ? 'linear-gradient(90deg,#ffd700,#ff9500)' : `linear-gradient(90deg,${typeInfo.color}88,${typeInfo.color})`, transition:'width .8s ease' }} />
                            </div>
                          </div>

                          {/* ── MINI STATS ROW ── */}
                          <div style={{ display:'flex', gap:16, marginBottom:12, flexWrap:'wrap' }}>
                            {[
                              { l:'WIN%',       v:`${winPct}%`,         c: winPct >= 50 ? pColor : '#ef4444' },
                              { l:'FINAIS',     v: r.finalsMatches,     c:'#c084fc' },
                              { l:'TIE-BREAKS', v: r.tieBreaks,         c:'#f97316' },
                              { l:'TEMPORADAS', v: r.seasons?.length||0, c:'rgba(255,255,255,0.5)' },
                            ].map(s => (
                              <div key={s.l} style={{ textAlign:'center' }}>
                                <div style={{ fontFamily:'Black Ops One,cursive', fontSize:20, color:s.c, lineHeight:1 }}>{s.v}</div>
                                <div style={{ fontFamily:'Orbitron,monospace', fontSize:11, letterSpacing:'.12em', color:'rgba(255,255,255,0.25)', marginTop:2 }}>{s.l}</div>
                              </div>
                            ))}
                          </div>

                          {/* ── NARRATIVA ── */}
                          {r.narrative && (
                            <p style={{ fontFamily:'Rajdhani,sans-serif', fontSize:17, color:'rgba(255,255,255,0.5)', lineHeight:1.6, margin:'0 0 12px', fontStyle:'italic', borderLeft:`2px solid ${typeInfo.color}33`, paddingLeft:10 }}>
                              {r.narrative}
                            </p>
                          )}

                          {/* ── KEY MOMENTS ── */}
                          {r.keyMoments?.length > 0 && (() => {
                            const moments = [...r.keyMoments].reverse().slice(0,3);
                            return (
                              <div>
                                <div style={{ fontFamily:'Orbitron,monospace', fontSize:12, letterSpacing:'.2em', color:'rgba(255,255,255,0.2)', marginBottom:6 }}>MOMENTOS MARCANTES</div>
                                <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                                  {moments.map((m,mi) => {
                                    const mWonMe = m.winnerId === playerId;
                                    const roundLabel = { F:'Final', SF:'Semi', QF:'Quartas', R16:'R16', R32:'R32' }[m.round] || m.round;
                                    return (
                                      <div key={mi} style={{ display:'flex', gap:10, alignItems:'center', padding:'5px 8px', borderRadius:6, background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.05)' }}>
                                        <span style={{ fontSize:16 }}>{mWonMe ? '✅' : '❌'}</span>
                                        <div style={{ flex:1 }}>
                                          <span style={{ fontFamily:'Rajdhani,sans-serif', fontWeight:700, fontSize:17, color: mWonMe ? '#22c55e' : '#ef4444' }}>{mWonMe ? 'VITÓRIA' : 'DERROTA'}</span>
                                          {m.isFinal && <span style={{ fontFamily:'Orbitron,monospace', fontSize:12, color:'#c084fc', marginLeft:8 }}>FINAL</span>}
                                          {m.isTieBreak && <span style={{ fontFamily:'Orbitron,monospace', fontSize:12, color:'#f97316', marginLeft:8 }}>TIE-BREAK</span>}
                                        </div>
                                        <span style={{ fontFamily:'Orbitron,monospace', fontSize:12, color:'rgba(255,255,255,0.25)' }}>{roundLabel} {m.tier || ''} {m.year ? `(${m.year})` : ''}</span>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })()}

                          {/* Frozen notice */}
                          {isFrozen && (
                            <div style={{ marginTop:10, padding:'6px 10px', borderRadius:6, background:'rgba(96,165,250,0.06)', border:'1px solid rgba(96,165,250,0.15)', fontFamily:'Rajdhani,sans-serif', fontSize:17, color:'rgba(96,165,250,0.7)', fontStyle:'italic' }}>
                              ❄️ Rivalidade encerrada — {r.frozenReason === 'p1_retired' ? (r.p1Id === playerId ? 'você' : opp.name) : (r.p2Id === playerId ? 'você' : opp.name)} se aposentou
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })()}

        {/* ─── BIO: PERFIL ─── */}
        {activeTab === 'perfil' && (() => {
          const narrative   = generateNarrative(player, playerId, playerHistory, universeManager);
          const isActive    = !player.status || player.status === 'PROFESSIONAL';
          const statusColor = isActive ? '#22c55e' : player.status === 'RETIRED' ? '#94a3b8' : '#f97316';
          const statusLabel = { PROFESSIONAL:'ATIVO', RETIRED:'APOSENTADO', RETIRED_AMATEUR:'APOSENTADO (AMADOR)', RISING_STAR:'RISING STAR' }[player.status] || player.status;
          const retireType  = player.retirement?.retirementReason;
          const retTypeInfo = { LEGENDARY:{ color:'#ffd700', label:'LENDÁRIO', icon:'👑' }, NATURAL:{ color:'#a0e0ff', label:'NATURAL', icon:'🌅' }, DECLINE:{ color:'#ff9900', label:'DECLÍNIO', icon:'📉' }, INJURY:{ color:'#ff4444', label:'LESÃO', icon:'🩹' }, PREMATURE:{ color:'#c084fc', label:'PRECOCE', icon:'⚡' } }[retireType];
          const arcCfg      = narrative?.archetypeCfg || { label:'Competidor', color: pColor, glow: false };

          return (
            <div style={{ animation:'up-entry .4s ease both', display:'flex', flexDirection:'column', gap:24 }}>

              {/* ── HEADER: foto + identity + stats ── */}
              <div style={{ position:'relative', borderRadius:16, overflow:'hidden', background:`linear-gradient(135deg, ${pColor}12, rgba(0,0,0,0.5))`, border:`1px solid ${pColor}22` }}>
                <div style={{ position:'absolute', inset:0, background:`radial-gradient(ellipse 80% 100% at 0% 50%, ${pColor}18, transparent 60%)`, pointerEvents:'none' }} />
                <div style={{ padding:'24px 28px', display:'flex', gap:20, alignItems:'center', position:'relative', flexWrap:'wrap' }}>
                  {/* Photo */}
                  <div style={{ width:80, height:80, borderRadius:12, overflow:'hidden', flexShrink:0, border:`2px solid ${pColor}40`, background:'rgba(0,0,0,0.4)' }}>
                    {(player.photoUrl || player.customIcon)
                      ? <img src={player.photoUrl || player.customIcon} alt={player.name} style={{ width:'100%', height:'100%', objectFit:'cover' }} onError={e=>{e.target.style.display='none'}} />
                      : <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'Black Ops One,cursive', fontSize:30, color:pColor }}>{(player.name||'?')[0]}</div>
                    }
                  </div>
                  {/* Info */}
                  <div style={{ flex:1, minWidth:200 }}>
                    <div style={{ fontFamily:'Black Ops One,cursive', fontSize:'clamp(20px,2.8vw,30px)', color:'#fff', lineHeight:1.1, marginBottom:8 }}>{player.name}</div>
                    <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
                      <span style={{ fontFamily:'Rajdhani,sans-serif', fontSize:19, color:'rgba(255,255,255,0.5)' }}>{player.country}</span>
                      {player.age && <><span style={{ color:'rgba(255,255,255,0.2)' }}>·</span><span style={{ fontFamily:'Orbitron,monospace', fontSize:15, color:'rgba(255,255,255,0.4)' }}>{player.age} ANOS</span></>}
                      {player.debutYear && <><span style={{ color:'rgba(255,255,255,0.2)' }}>·</span><span style={{ fontFamily:'Orbitron,monospace', fontSize:15, color:'rgba(255,255,255,0.4)' }}>DESDE {player.debutYear}</span></>}
                    </div>
                    <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginTop:8 }}>
                      <div style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'4px 12px', borderRadius:20, background:`${statusColor}18`, border:`1px solid ${statusColor}40` }}>
                        <div style={{ width:6, height:6, borderRadius:'50%', background:statusColor, boxShadow:`0 0 6px ${statusColor}` }} />
                        <span style={{ fontFamily:'Orbitron,monospace', fontSize:14, letterSpacing:'.15em', color:statusColor }}>{statusLabel}</span>
                      </div>
                      {/* Archetype badge */}
                      <div style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'4px 12px', borderRadius:20, background:`${arcCfg.color}15`, border:`1px solid ${arcCfg.color}45`, boxShadow: arcCfg.glow ? `0 0 12px ${arcCfg.color}33` : 'none' }}>
                        <span style={{ fontFamily:'Orbitron,monospace', fontSize:14, letterSpacing:'.15em', color:arcCfg.color }}>{arcCfg.label.toUpperCase()}</span>
                      </div>
                      {retTypeInfo && (
                        <div style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'4px 12px', borderRadius:20, background:`${retTypeInfo.color}12`, border:`1px solid ${retTypeInfo.color}30` }}>
                          <span style={{ fontSize:16 }}>{retTypeInfo.icon}</span>
                          <span style={{ fontFamily:'Orbitron,monospace', fontSize:14, letterSpacing:'.1em', color:retTypeInfo.color }}>{retTypeInfo.label}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  {/* Quick stats */}
                  <div style={{ display:'flex', gap:20, flexShrink:0 }}>
                    {[
                      { l:'TÍTULOS', v: (playerHistory?.titles?.total || 0), c:'#ffd700' },
                      { l:'PEAK',    v: player.careerPeak?.ranking < 99 ? `#${player.careerPeak?.ranking}` : '—', c: player.careerPeak?.ranking <= 5 ? '#ffd700' : 'rgba(255,255,255,0.7)' },
                      { l:'WIN%',    v: playerHistory?.totalMatches > 0 ? `${Math.round((playerHistory.wins/playerHistory.totalMatches)*100)}%` : '—', c:'rgba(255,255,255,0.7)' },
                    ].map(s => (
                      <div key={s.l} style={{ textAlign:'center' }}>
                        <div style={{ fontFamily:'Black Ops One,cursive', fontSize:26, color:s.c, lineHeight:1 }}>{s.v}</div>
                        <div style={{ fontFamily:'Orbitron,monospace', fontSize:13, letterSpacing:'.15em', color:'rgba(255,255,255,0.3)', marginTop:4 }}>{s.l}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* ── TRAÇOS ── */}
              {traitInfo.traits.length > 0 && (() => {
                const positives = traitInfo.traits.filter(t => t.tier !== 'NEG');
                const negatives = traitInfo.traits.filter(t => t.tier === 'NEG');

                const TIER_META = {
                  LEN: { label:'LENDÁRIO', color:'#ffd700', bg:'rgba(255,215,0,0.1)',  border:'rgba(255,215,0,0.4)',  glow:true  },
                  RAR: { label:'RARO',     color:'#c084fc', bg:'rgba(168,85,247,0.1)', border:'rgba(168,85,247,0.4)', glow:false },
                  COM: { label:'COMUM',    color:'#4ade80', bg:'rgba(34,197,94,0.07)', border:'rgba(34,197,94,0.3)',  glow:false },
                };

                const TraitCard = ({ t, idx }) => {
                  const def   = TRAITS[t.id];
                  if (!def) return null;
                  const isNeg  = t.tier === 'NEG';
                  const meta   = isNeg ? null : TIER_META[t.tier];
                  const negType = isNeg ? (traitInfo.negTypes[t.id] || 'CICATRIZ') : null;
                  const isSombra = negType === 'SOMBRA';
                  const desc   = def.tiers[t.tier]?.descricao || '';
                  const vname  = def.tiers[t.tier]?.variantName || def.name;
                  const milestone = isSombra ? SHADOW_MILESTONES?.[t.id] : null;
                  const progress  = milestone ? (traitInfo.shadowProgress?.[milestone.event] || 0) : 0;
                  const needed    = milestone?.required || 1;
                  const pct       = Math.min(100, Math.round((progress / needed) * 100));
                  const borderC = isNeg ? (isSombra ? 'rgba(139,92,246,0.35)' : 'rgba(239,68,68,0.25)') : (meta.glow ? 'rgba(255,215,0,0.35)' : meta.border);
                  const bgC     = isNeg ? (isSombra ? 'rgba(139,92,246,0.06)' : 'rgba(239,68,68,0.06)') : meta.bg;
                  const textC   = isNeg ? (isSombra ? '#a78bfa' : '#f87171') : meta.color;

                  return (
                    <div key={idx} style={{ position:'relative', borderRadius:12, overflow:'hidden', background:bgC, border:`1px solid ${borderC}`, animation:'up-entry .35s ease both', animationDelay:`${idx*0.07}s`, boxShadow: meta?.glow ? `0 0 20px rgba(255,215,0,0.08)` : 'none' }}>
                      <div style={{ position:'absolute', left:0, top:0, bottom:0, width:3, background: isNeg ? (isSombra ? 'linear-gradient(180deg,#7c3aed,#4c1d95)' : 'linear-gradient(180deg,#ef4444,#991b1b)') : `linear-gradient(180deg,${textC},${textC}44)` }} />
                      <div style={{ padding:'14px 16px 14px 20px' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
                          <span style={{ fontSize:20 }}>{def.icon}</span>
                          <div style={{ flex:1 }}>
                            <div style={{ display:'flex', alignItems:'center', gap:6, flexWrap:'wrap' }}>
                              <span style={{ fontFamily:'Black Ops One,cursive', fontSize:18, color:'rgba(255,255,255,0.92)', letterSpacing:'.02em' }}>{vname}</span>
                              {!isNeg && <span style={{ fontFamily:'Orbitron,monospace', fontSize:12, letterSpacing:'.15em', padding:'2px 7px', borderRadius:10, background:`${textC}20`, border:`1px solid ${textC}50`, color:textC }}>{meta.label}</span>}
                              {isNeg && <span style={{ fontFamily:'Orbitron,monospace', fontSize:12, letterSpacing:'.12em', padding:'2px 7px', borderRadius:10, background:isSombra?'rgba(139,92,246,0.18)':'rgba(239,68,68,0.18)', border:isSombra?'1px solid rgba(139,92,246,0.4)':'1px solid rgba(239,68,68,0.35)', color:isSombra?'#a78bfa':'#fca5a5' }}>{isSombra?'🌑 SOMBRA':'🔴 CICATRIZ'}</span>}
                            </div>
                            <div style={{ fontFamily:'Orbitron,monospace', fontSize:12, letterSpacing:'.12em', color:'rgba(255,255,255,0.25)', marginTop:2 }}>{def.section}</div>
                          </div>
                        </div>
                        <p style={{ fontFamily:'Rajdhani,sans-serif', fontSize:18, lineHeight:1.65, color:isNeg?'rgba(255,160,160,0.65)':'rgba(255,255,255,0.55)', margin:0, fontStyle:isNeg?'italic':'normal' }}>{desc}</p>
                        {isSombra && milestone && (
                          <div style={{ marginTop:10 }}>
                            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4 }}>
                              <span style={{ fontFamily:'Orbitron,monospace', fontSize:12, letterSpacing:'.12em', color:'rgba(139,92,246,0.7)' }}>SUPERAÇÃO: {progress}/{needed}</span>
                              <span style={{ fontFamily:'Orbitron,monospace', fontSize:12, color:'rgba(139,92,246,0.5)' }}>{pct}%</span>
                            </div>
                            <div style={{ height:4, borderRadius:4, background:'rgba(255,255,255,0.07)', overflow:'hidden' }}>
                              <div style={{ height:'100%', borderRadius:4, width:`${pct}%`, background:'linear-gradient(90deg,#6d28d9,#a78bfa)', transition:'width .6s ease', boxShadow:pct>0?'0 0 8px rgba(139,92,246,0.6)':'none' }} />
                            </div>
                            <div style={{ fontFamily:'Rajdhani,sans-serif', fontSize:17, color:'rgba(139,92,246,0.5)', marginTop:4, fontStyle:'italic' }}>{milestone.desc}</div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                };

                const dnaLabel = traitInfo.dnaProfile
                  ? { 'Baixo':'Alma Comum', 'Médio':'Alma Firme', 'Normal':'Alma Sólida', 'Alto':'Alma Elevada', 'Excepcional':'Alma Excepcional' }[traitInfo.dnaProfile.label] || traitInfo.dnaProfile.label
                  : null;

                return (
                  <div>
                    <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
                      <div style={{ height:1, flex:1, background:`linear-gradient(90deg,${pColor}40,transparent)` }} />
                      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <span style={{ fontFamily:'Orbitron,monospace', fontSize:15, letterSpacing:'.3em', color:'rgba(255,255,255,0.35)' }}>TRAÇOS</span>
                        {dnaLabel && <span style={{ fontFamily:'Orbitron,monospace', fontSize:12, letterSpacing:'.12em', padding:'2px 8px', borderRadius:10, background:`${pColor}15`, border:`1px solid ${pColor}30`, color:`${pColor}99` }}>{dnaLabel}</span>}
                      </div>
                      <div style={{ height:1, flex:1, background:'linear-gradient(90deg,transparent,rgba(255,255,255,0.05))' }} />
                    </div>
                    {positives.length > 0 && <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:negatives.length>0?12:0 }}>{positives.map((t,i) => <TraitCard key={t.id} t={t} idx={i} />)}</div>}
                    {negatives.length > 0 && (
                      <>
                        {positives.length > 0 && <div style={{ display:'flex', alignItems:'center', gap:8, margin:'10px 0' }}><div style={{ height:1, flex:1, background:'rgba(239,68,68,0.12)' }} /><span style={{ fontFamily:'Orbitron,monospace', fontSize:12, letterSpacing:'.2em', color:'rgba(239,68,68,0.4)' }}>FRAQUEZAS</span><div style={{ height:1, flex:1, background:'rgba(239,68,68,0.12)' }} /></div>}
                        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>{negatives.map((t,i) => <TraitCard key={t.id} t={t} idx={positives.length+i} />)}</div>
                      </>
                    )}
                  </div>
                );
              })()}

              {/* ── NARRATIVA ÚNICA ── */}
              {!narrative ? (
                <div style={{ textAlign:'center', padding:'40px 0', color:'rgba(255,255,255,0.25)', fontFamily:'Orbitron,monospace', fontSize:16, letterSpacing:'.3em' }}>NENHUMA HISTÓRIA AINDA</div>
              ) : (
                <div style={{ position:'relative' }}>
                  {/* Glow de fundo do arquétipo */}
                  <div style={{ position:'absolute', top:-20, left:-20, right:-20, height:120, background:`radial-gradient(ellipse 70% 100% at 50% 0%, ${arcCfg.color}${arcCfg.glow ? '18' : '0a'}, transparent 80%)`, pointerEvents:'none', zIndex:0 }} />

                  <div style={{ position:'relative', zIndex:1, borderRadius:16, overflow:'hidden', background:`linear-gradient(180deg, ${arcCfg.color}08 0%, rgba(0,0,0,0.3) 100%)`, border:`1px solid ${arcCfg.color}28`, padding:'28px 32px 32px' }}>

                    {/* Archetype top label */}
                    <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:20 }}>
                      <div style={{ height:1, flex:1, background:`linear-gradient(90deg, ${arcCfg.color}55, transparent)` }} />
                      <span style={{ fontFamily:'Orbitron,monospace', fontSize:14, letterSpacing:'.4em', color:`${arcCfg.color}99`, textTransform:'uppercase' }}>{arcCfg.label}</span>
                      <div style={{ height:1, flex:1, background:`linear-gradient(90deg, transparent, ${arcCfg.color}20)` }} />
                    </div>

                    {/* Big headline */}
                    <h2 style={{
                      fontFamily:'Black Ops One, cursive',
                      fontSize:'clamp(26px, 4vw, 40px)',
                      lineHeight:1.05,
                      marginBottom:28,
                      background:`linear-gradient(135deg, #ffffff 0%, ${arcCfg.color} 60%, ${p2Color} 100%)`,
                      WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent',
                      filter:`drop-shadow(0 0 20px ${arcCfg.color}${arcCfg.glow ? '55' : '22'})`,
                      letterSpacing:'-.01em',
                    }}>
                      {narrative.headline}
                    </h2>

                    {/* Paragraphs — flowing narrative */}
                    <div style={{ display:'flex', flexDirection:'column', gap:22 }}>
                      {narrative.paragraphs.map((para, i) => (
                        <p key={i} style={{
                          fontFamily:'Rajdhani, sans-serif',
                          fontSize: i === narrative.paragraphs.length - 1 ? 20 : 18,
                          lineHeight: 1.8,
                          color: i === narrative.paragraphs.length - 1
                            ? `${arcCfg.color}dd`
                            : 'rgba(255,255,255,0.82)',
                          margin:0,
                          fontStyle: i === narrative.paragraphs.length - 1 ? 'italic' : 'normal',
                          fontWeight: i === 0 ? 600 : 400,
                          borderLeft: i === narrative.paragraphs.length - 1
                            ? `3px solid ${arcCfg.color}88`
                            : 'none',
                          paddingLeft: i === narrative.paragraphs.length - 1 ? 18 : 0,
                          animation:'up-entry .5s ease both',
                          animationDelay:`${i * 0.1}s`,
                        }}>
                          {para}
                        </p>
                      ))}
                    </div>

                    {/* Footer note */}
                    <div style={{ marginTop:28, paddingTop:16, borderTop:`1px solid rgba(255,255,255,0.06)`, display:'flex', alignItems:'center', gap:8 }}>
                      <span style={{ fontSize:16, opacity:.4 }}>⚙️</span>
                      <span style={{ fontFamily:'Rajdhani,sans-serif', fontSize:17, color:'rgba(255,255,255,0.18)', fontStyle:'italic' }}>
                        Narrativa gerada a partir do histórico real de {shortName} — atualizada a cada temporada.
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* ── NOTA DO TREINADOR ── */}
              <div style={{
                marginTop: 24,
                background: 'rgba(0,0,0,0.35)',
                border: `1px solid ${editingNote ? `${arcCfg?.color || '#c9a84c'}55` : 'rgba(255,255,255,0.07)'}`,
                borderRadius: 10,
                padding: '20px 24px',
                transition: 'border-color 0.25s',
              }}>
                {/* Header row */}
                <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom: player.customNote || editingNote ? 16 : 0 }}>
                  <span style={{ fontFamily:'Orbitron,monospace', fontSize:9, letterSpacing:'.35em', color:'rgba(255,255,255,0.25)', textTransform:'uppercase' }}>
                    📝 Anotação do Treinador
                  </span>
                  <div style={{ flex:1, height:1, background:'rgba(255,255,255,0.05)' }} />
                  {!editingNote ? (
                    <button
                      onClick={() => { setNoteInput(player.customNote || ''); setEditingNote(true); }}
                      style={{
                        background:'transparent',
                        border:'1px solid rgba(255,255,255,0.12)',
                        borderRadius:4,
                        padding:'4px 12px',
                        fontFamily:'Rajdhani,sans-serif',
                        fontSize:11,
                        letterSpacing:'.2em',
                        fontWeight:600,
                        color:'rgba(255,255,255,0.35)',
                        cursor:'pointer',
                        textTransform:'uppercase',
                        transition:'all 0.18s',
                      }}
                      onMouseEnter={e => { e.target.style.color='rgba(255,255,255,0.7)'; e.target.style.borderColor='rgba(255,255,255,0.3)'; }}
                      onMouseLeave={e => { e.target.style.color='rgba(255,255,255,0.35)'; e.target.style.borderColor='rgba(255,255,255,0.12)'; }}
                    >
                      {player.customNote ? 'Editar' : '+ Adicionar'}
                    </button>
                  ) : (
                    <div style={{ display:'flex', gap:6 }}>
                      <button
                        onClick={() => {
                          player.customNote = noteInput.trim() || undefined;
                          setEditingNote(false);
                          forceUpdate(n => n + 1);
                        }}
                        style={{
                          background:'rgba(201,168,76,0.12)',
                          border:'1px solid rgba(201,168,76,0.4)',
                          borderRadius:4,
                          padding:'4px 12px',
                          fontFamily:'Rajdhani,sans-serif',
                          fontSize:11,
                          letterSpacing:'.2em',
                          fontWeight:700,
                          color:'#c9a84c',
                          cursor:'pointer',
                          textTransform:'uppercase',
                        }}
                      >Salvar</button>
                      <button
                        onClick={() => setEditingNote(false)}
                        style={{
                          background:'transparent',
                          border:'1px solid rgba(255,255,255,0.1)',
                          borderRadius:4,
                          padding:'4px 10px',
                          fontFamily:'Rajdhani,sans-serif',
                          fontSize:11,
                          color:'rgba(255,255,255,0.3)',
                          cursor:'pointer',
                        }}
                      >Cancelar</button>
                    </div>
                  )}
                </div>

                {/* Editing mode */}
                {editingNote && (
                  <textarea
                    autoFocus
                    value={noteInput}
                    onChange={e => setNoteInput(e.target.value)}
                    placeholder={`Escreva sua análise de ${shortName}...\n\nEste espaço é seu — registre observações, expectativas, uma narrativa própria. Tudo que a estatística não captura.`}
                    style={{
                      width:'100%',
                      minHeight:120,
                      background:'rgba(0,0,0,0.4)',
                      border:`1px solid rgba(255,255,255,0.1)`,
                      borderRadius:6,
                      padding:'14px 16px',
                      fontFamily:'Georgia, serif',
                      fontSize:15,
                      lineHeight:1.75,
                      color:'rgba(255,255,255,0.82)',
                      resize:'vertical',
                      outline:'none',
                      boxSizing:'border-box',
                      fontStyle:'italic',
                    }}
                    onKeyDown={e => {
                      if (e.key === 'Escape') setEditingNote(false);
                    }}
                  />
                )}

                {/* Display mode */}
                {!editingNote && player.customNote && (
                  <p style={{
                    fontFamily:'Georgia, serif',
                    fontSize:16,
                    lineHeight:1.8,
                    color:'rgba(255,255,255,0.70)',
                    fontStyle:'italic',
                    margin:0,
                    whiteSpace:'pre-wrap',
                    borderLeft:`3px solid rgba(201,168,76,0.35)`,
                    paddingLeft:16,
                  }}>
                    {player.customNote}
                  </p>
                )}

                {/* Empty state */}
                {!editingNote && !player.customNote && (
                  <p style={{
                    fontFamily:'Rajdhani,sans-serif',
                    fontSize:13,
                    color:'rgba(255,255,255,0.18)',
                    fontStyle:'italic',
                    margin:0,
                    marginTop:4,
                  }}>
                    Nenhuma anotação ainda. Registre sua visão sobre {shortName}.
                  </p>
                )}
              </div>

            </div>
          );
        })()}

        {/* ─── ATRIBUTOS: VISÃO GERAL + PROGRESSÃO ─── */}
        {activeTab === 'atributos' && (
          <div style={{ display:'flex', flexDirection:'column', gap:18, animation:'up-entry .4s ease both' }}>

            {/* ── BOTÕES DE IMAGEM ── */}
            {imgModal && (
              <div
                style={{ position:'fixed', inset:0, zIndex:49 }}
                onClick={() => { setImgModal(null); setUrlInput(''); }}
              />
            )}
            <div style={{ display:'flex', gap:8, justifyContent:'flex-end', alignItems:'flex-start', position:'relative' }}>

              {/* inputs ocultos */}
              <input ref={picFileRef}  type="file" accept="image/*" onChange={handleImgFile('pic')}  style={{ display:'none' }} />
              <input ref={fullFileRef} type="file" accept="image/*" onChange={handleImgFile('full')} style={{ display:'none' }} />

              {['pic','full'].map(type => {
                const label = type === 'pic' ? '🖼 PIC' : '📸 FULL';
                const isOpen = imgModal === type;
                return (
                  <div key={type} style={{ position:'relative' }}>
                    <button
                      onClick={() => { setImgModal(isOpen ? null : type); setUrlInput(''); }}
                      style={{
                        fontFamily:'Orbitron,monospace', fontSize:13, letterSpacing:'.14em',
                        padding:'5px 11px', borderRadius:4,
                        border:`1px solid ${isOpen ? pColor+'88' : 'rgba(255,215,0,.18)'}`,
                        background: isOpen ? `${pColor}18` : 'rgba(255,255,255,.04)',
                        color: isOpen ? pColor : 'rgba(255,215,0,.55)',
                        cursor:'pointer', transition:'all .2s',
                      }}
                    >{label}</button>

                    {/* Mini-modal */}
                    {isOpen && (
                      <div style={{
                        position:'absolute', top:'calc(100% + 6px)', right:0, zIndex:50,
                        background:'#0d0d1a', border:`1px solid ${pColor}44`,
                        borderRadius:6, padding:'12px 14px', width:230,
                        boxShadow:`0 8px 32px rgba(0,0,0,.7), 0 0 0 1px ${pColor}22`,
                        display:'flex', flexDirection:'column', gap:8,
                      }}>
                        <div style={{ fontFamily:'Orbitron,monospace', fontSize:12, letterSpacing:'.18em', color:`${pColor}99`, marginBottom:2 }}>
                          {type === 'pic' ? 'ENVIAR IMAGEM PIC' : 'ENVIAR IMAGEM FULL'}
                        </div>

                        {/* Upload */}
                        <button
                          onClick={() => (type === 'pic' ? picFileRef : fullFileRef).current?.click()}
                          style={{
                            display:'flex', alignItems:'center', gap:8,
                            fontFamily:'Rajdhani,sans-serif', fontWeight:700, fontSize:17,
                            padding:'8px 12px', borderRadius:4,
                            border:'1px solid rgba(255,255,255,.1)', background:'rgba(255,255,255,.06)',
                            color:'rgba(255,255,255,.85)', cursor:'pointer',
                          }}
                        >
                          <Upload size={13} /> Fazer upload
                        </button>

                        {/* Link */}
                        <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                          <input
                            value={urlInput}
                            onChange={e => setUrlInput(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && applyImage(type, urlInput.trim())}
                            placeholder="Colar link da imagem..."
                            style={{
                              fontFamily:'Rajdhani,sans-serif', fontSize:17,
                              padding:'7px 10px', borderRadius:4,
                              border:'1px solid rgba(255,255,255,.12)', background:'rgba(0,0,0,.5)',
                              color:'white', outline:'none', width:'100%', boxSizing:'border-box',
                            }}
                          />
                          <button
                            onClick={() => applyImage(type, urlInput.trim())}
                            disabled={!urlInput.trim()}
                            style={{
                              fontFamily:'Orbitron,monospace', fontSize:13, letterSpacing:'.1em',
                              padding:'7px', borderRadius:4, cursor:'pointer',
                              border:`1px solid ${pColor}55`,
                              background: urlInput.trim() ? `${pColor}22` : 'rgba(255,255,255,.03)',
                              color: urlInput.trim() ? pColor : 'rgba(255,255,255,.2)',
                              transition:'all .2s',
                            }}
                          >APLICAR</button>
                        </div>

                        <button onClick={() => setImgModal(null)} style={{ alignSelf:'flex-end', background:'none', border:'none', cursor:'pointer', fontFamily:'Orbitron,monospace', fontSize:12, color:'rgba(255,255,255,.2)', letterSpacing:'.1em' }}>cancelar</button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* GRID PRINCIPAL: ATRIBUTOS + ESTATÍSTICAS */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
              
              {/* COLUNA ESQUERDA: ATRIBUTOS */}
              <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                <div className="up-label" style={{ fontSize:16, color:`${pColor}99` }}>⚡ ATRIBUTOS</div>
                <div className="up-card" style={{ 
                  padding:'24px 22px', 
                  borderColor:`${pColor}33`, 
                  background:`${pColor}03`,
                  position:'relative',
                  overflow:'hidden'
                }}>
                  {/* Full-body background - BEM TRANSPARENTE */}
                  {(player.fullBodyUrl || player.photoUrl) && (
                    <img
                      src={player.fullBodyUrl || player.photoUrl}
                      alt=""
                      onError={e => { e.target.style.display = 'none'; }}
                      style={{
                        position:'absolute',
                        right:'-10%',
                        bottom:'-10%',
                        height:'120%',
                        width:'auto',
                        objectFit:'cover',
                        objectPosition:'center',
                        opacity:0.08,
                        pointerEvents:'none',
                        userSelect:'none',
                        zIndex:0,
                        filter:'grayscale(30%)'
                      }}
                    />
                  )}
                  
                  <div style={{ display:'flex', flexDirection:'column', gap:14, position:'relative', zIndex:1 }}>
                    {Object.entries(player.attributes || {}).map(([key, val]) => {
                      const cfg = ATTR_CFG[key] || { label:key.slice(0,3).toUpperCase(), color:pColor };
                      const ceil = player.potential?.ceiling?.[key];
                      const atCeil = ceil != null && val >= ceil;
                      const phaseCeil = ceil ?? 15;
                      return (
                        <div key={key}>
                          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:6 }}>
                            <div style={{ fontFamily:'Orbitron,monospace', fontSize:16, letterSpacing:'.12em', color:'rgba(255,255,255,.7)', fontWeight:700 }}>{cfg.label}</div>
                            <div style={{ display:'flex', alignItems:'baseline', gap:5 }}>
                              <div style={{ fontFamily:'Black Ops One,cursive', fontSize:30, color:atCeil ? '#ffd700' : cfg.color, textShadow:`0 0 12px ${atCeil ? '#ffd700' : cfg.color}88` }}>{val}</div>
                              {ceil != null && (
                                <div style={{ fontFamily:'Orbitron,monospace', fontSize:14, color:'rgba(255,255,255,.25)' }}>/ {ceil}</div>
                              )}
                            </div>
                          </div>
                          {/* Barra dupla: atual + teto */}
                          <div className="up-attr-bar" style={{ height:8, borderRadius:99, position:'relative', overflow:'visible' }}>
                            {/* Teto (fundo) */}
                            {ceil != null && (
                              <div style={{ position:'absolute', left:0, top:0, height:'100%', width:`${(ceil/20)*100}%`, background:'rgba(255,255,255,.08)', borderRadius:99 }} />
                            )}
                            {/* Atual */}
                            <div className="up-attr-fill" style={{ width:`${(val/20)*100}%`, background: atCeil ? `linear-gradient(90deg,#ffd70077,#ffd700)` : `linear-gradient(90deg,${cfg.color}77,${cfg.color})`, borderRadius:99, position:'relative', zIndex:1 }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* COLUNA DIREITA: GRÁFICO DE EVOLUÇÃO ANUAL */}
              {isDynamic && (
                <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                  <div className="up-label" style={{ fontSize:16, color:'rgba(255,215,0,0.7)' }}>📈 EVOLUÇÃO DE CARREIRA</div>
                  {(() => {
                    const history = playerHistory?.attrHistory || [];

                    // Tiers: labels, cores e faixas de avg
                    const TIER_CFG = [
                      { tier:0, label:'AMADOR',        color:'#94a3b8', avg:[0,    5.49] },
                      { tier:1, label:'INICIANTE',     color:'#f59e0b', avg:[5.5,  7.49] },
                      { tier:2, label:'DESENVOLVIMENTO',color:'#4ade80', avg:[7.5,  9.49] },
                      { tier:3, label:'COMPETITIVO',   color:'#60a5fa', avg:[9.5, 11.49] },
                      { tier:4, label:'PRO',           color:'#a78bfa', avg:[11.5,13.49] },
                      { tier:5, label:'ELITE MUNDIAL', color:'#ffd700', avg:[13.5, 15]  },
                    ];

                    // Sem dados ainda
                    if (history.length === 0) {
                      // Mostrar ponto atual se for profissional
                      const attrs = player?.attributes;
                      const vals  = attrs ? Object.values(attrs).filter(v => typeof v === 'number') : [];
                      const avg   = vals.length ? vals.reduce((a,b)=>a+b,0)/vals.length : null;
                      return (
                        <div className="up-card" style={{ padding:'22px', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:10, minHeight:200 }}>
                          {avg !== null ? (
                            <>
                              <div style={{ fontFamily:'Orbitron,monospace', fontSize:14, letterSpacing:'.2em', color:'rgba(255,255,255,.3)' }}>NÍVEL ATUAL</div>
                              <div style={{ fontFamily:'Black Ops One,cursive', fontSize:42, color:pColor, textShadow:`0 0 16px ${pColor}88`, lineHeight:1 }}>{avg.toFixed(1)}</div>
                              <div style={{ fontFamily:'Orbitron,monospace', fontSize:12, letterSpacing:'.2em', color:'rgba(255,255,255,.25)' }}>GRÁFICO DISPONÍVEL APÓS O 1º ANO</div>
                            </>
                          ) : (
                            <div style={{ fontFamily:'Orbitron,monospace', fontSize:13, color:'rgba(255,255,255,.25)', letterSpacing:'.2em' }}>SEM DADOS</div>
                          )}
                        </div>
                      );
                    }

                    // Com dados: montar gráfico SVG simples
                    const all = [...history];
                    // Adicionar ponto atual (ano corrente)
                    const attrs = player?.attributes;
                    const vals  = attrs ? Object.values(attrs).filter(v => typeof v === 'number') : [];
                    const curAvg = vals.length ? +(vals.reduce((a,b)=>a+b,0)/vals.length).toFixed(2) : null;
                    const curYear = universeManager?.currentYear;
                    if (curAvg !== null && curYear && !all.find(s => s.year === curYear)) {
                      const curTier = curAvg >= 13.5 ? 5 : curAvg >= 11.5 ? 4 : curAvg >= 9.5 ? 3 : curAvg >= 7.5 ? 2 : curAvg >= 5.5 ? 1 : 0;
                      all.push({ year: curYear, avg: curAvg, tier: curTier, current: true });
                    }

                    if (all.length === 0) return null;

                    const W = 320, H = 160, PAD = { t:12, r:12, b:28, l:36 };
                    const gW = W - PAD.l - PAD.r;
                    const gH = H - PAD.t - PAD.b;
                    const minY = 5, maxY = 20;
                    const xOf  = (i) => PAD.l + (i / Math.max(all.length - 1, 1)) * gW;
                    const yOf  = (v) => PAD.t + gH - ((v - minY) / (maxY - minY)) * gH;

                    // Pontos e linha
                    const points = all.map((s, i) => [xOf(i), yOf(s.avg)]);
                    const linePath = points.map((p, i) => `${i===0?'M':'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
                    const areaPath = [
                      ...points.map((p, i) => `${i===0?'M':'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`),
                      `L${points[points.length-1][0].toFixed(1)},${(PAD.t+gH).toFixed(1)}`,
                      `L${points[0][0].toFixed(1)},${(PAD.t+gH).toFixed(1)}`,
                      'Z'
                    ].join(' ');

                    // Grid horizontais (tiers)
                    const gridLines = [5.5, 7.5, 9.5, 11.5, 13.5].map(v => ({
                      y: yOf(v),
                      cfg: TIER_CFG.find(t => t.avg[0] === v)
                    }));

                    return (
                      <div className="up-card" style={{ padding:'16px 14px 10px', borderColor:`${pColor}22`, position:'relative', overflow:'hidden' }}>
                        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ overflow:'visible', maxWidth:'100%' }}>
                          {/* Grid tier lines */}
                          {gridLines.map((g, i) => (
                            <g key={i}>
                              <line x1={PAD.l} y1={g.y} x2={PAD.l+gW} y2={g.y}
                                stroke={g.cfg?.color || 'rgba(255,255,255,.06)'} strokeWidth={0.5} strokeDasharray="3,4" opacity={0.35} />
                              <text x={PAD.l - 3} y={g.y + 3} textAnchor="end"
                                fontFamily="Orbitron,monospace" fontSize={5.5} fill={g.cfg?.color || 'rgba(255,255,255,.3)'} opacity={0.7}>
                                {g.cfg?.avg[0]}
                              </text>
                            </g>
                          ))}

                          {/* Area fill */}
                          <path d={areaPath} fill={`${pColor}12`} />

                          {/* Line */}
                          <path d={linePath} fill="none" stroke={pColor} strokeWidth={1.5}
                            strokeLinejoin="round" strokeLinecap="round"
                            style={{ filter:`drop-shadow(0 0 3px ${pColor}88)` }} />

                          {/* Points */}
                          {all.map((s, i) => {
                            const cfg = TIER_CFG[s.tier] || TIER_CFG[0];
                            const [px, py] = points[i];
                            return (
                              <g key={s.year}>
                                <circle cx={px} cy={py} r={s.current ? 4 : 3}
                                  fill={cfg.color} stroke="#0a0a0f" strokeWidth={1.2}
                                  style={{ filter:`drop-shadow(0 0 4px ${cfg.color}aa)` }} />
                                {/* Year label below */}
                                <text x={px} y={PAD.t + gH + 10} textAnchor="middle"
                                  fontFamily="Orbitron,monospace" fontSize={6}
                                  fill={s.current ? pColor : 'rgba(255,255,255,.3)'}>
                                  {s.year}
                                </text>
                              </g>
                            );
                          })}

                          {/* Avg label at last point */}
                          {all.length > 0 && (() => {
                            const last = all[all.length - 1];
                            const [lx, ly] = points[points.length - 1];
                            const cfg = TIER_CFG[last.tier] || TIER_CFG[0];
                            return (
                              <text x={lx + 6} y={ly + 4} fontFamily="Black Ops One,cursive"
                                fontSize={9} fill={cfg.color}
                                style={{ filter:`drop-shadow(0 0 4px ${cfg.color}88)` }}>
                                {last.avg.toFixed(1)}
                              </text>
                            );
                          })()}
                        </svg>

                        {/* Tier legend */}
                        <div style={{ display:'flex', flexWrap:'wrap', gap:'4px 10px', marginTop:6 }}>
                          {TIER_CFG.slice(1).reverse().map(t => (
                            <div key={t.tier} style={{ display:'flex', alignItems:'center', gap:4 }}>
                              <div style={{ width:6, height:6, borderRadius:99, background:t.color }} />
                              <span style={{ fontFamily:'Orbitron,monospace', fontSize:11, color:'rgba(255,255,255,.3)', letterSpacing:'.08em' }}>{t.label}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>

            {/* POTENCIAL + DESENVOLVIMENTO */}
            {player.potential && player.developmentStyle && (
              <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                <div className="up-label" style={{ color:'rgba(255,215,0,0.6)' }}>📈 POTENCIAL & DESENVOLVIMENTO</div>
                <div className="up-card" style={{ padding:'20px 22px', borderColor:`${pColor}22`, display:'flex', gap:20, flexWrap:'wrap', alignItems:'flex-start' }}>

                  {/* PERSPECTIVA + NÍVEL ATUAL — substitui tier badge */}
                  <div style={{ display:'flex', flexDirection:'column', gap:10, minWidth:160 }}>
                    {(() => {
                      // ── Nível Atual (baseado só nos atributos de hoje) ──
                      const levelTag    = getCurrentLevelTag(player.attributes);
                      const perspective = generateScoutPerspective(player);
                      const conjecture  = generateConjecture(player, perspective);
                      const zones       = player.potential ? calculateProgressZones(player.potential, player.attributes) : null;

                      // Média atual para exibir
                      const avgNow = levelTag.avg ? levelTag.avg.toFixed(1) : '—';

                      return (
                        <>
                          {/* Nível atual */}
                          <div style={{ padding:'6px 12px', background:`${levelTag.color}18`, border:`1px solid ${levelTag.color}55`, borderRadius:4, textAlign:'center' }}>
                            <div style={{ fontFamily:'Orbitron,monospace', fontSize:13, letterSpacing:'.18em', color:'rgba(255,255,255,.35)', marginBottom:3 }}>NÍVEL ATUAL</div>
                            <div style={{ fontFamily:'Orbitron,monospace', fontSize:14, letterSpacing:'.12em', color:levelTag.color, fontWeight:700 }}>{levelTag.label}</div>
                            <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:6, marginTop:4 }}>
                              <span style={{ fontFamily:'Black Ops One,cursive', fontSize:28, color:levelTag.color, lineHeight:1, textShadow:`0 0 12px ${levelTag.color}88` }}>{avgNow}</span>
                              <span style={{ fontSize:17, color:levelTag.color, letterSpacing:2 }}>{levelTag.stars}</span>
                            </div>
                          </div>

                          {/* Perspectiva dos scouts */}
                          <div style={{ padding:'8px 12px', background:`${perspective.color}10`, border:`1px solid ${perspective.color}40`, borderRadius:4 }}>
                            <div style={{ fontFamily:'Orbitron,monospace', fontSize:12, letterSpacing:'.18em', color:'rgba(255,255,255,.3)', marginBottom:4 }}>PERSPECTIVA DOS SCOUTS</div>
                            <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:4 }}>
                              <span style={{ fontSize:18 }}>{perspective.icon}</span>
                              <span style={{ fontFamily:'Orbitron,monospace', fontSize:13, fontWeight:700, color:perspective.color, letterSpacing:'.1em' }}>{perspective.tag}</span>
                            </div>
                            <div style={{ fontFamily:'Rajdhani,sans-serif', fontSize:16, color:'rgba(255,255,255,.55)', lineHeight:1.4, fontStyle:'italic' }}>"{perspective.desc}"</div>
                          </div>

                          {/* Conjectura */}
                          <div style={{ padding:'6px 12px', background:'rgba(255,255,255,.03)', border:'1px solid rgba(255,255,255,.08)', borderRadius:4 }}>
                            <div style={{ fontFamily:'Orbitron,monospace', fontSize:12, letterSpacing:'.18em', color:'rgba(255,255,255,.25)', marginBottom:4 }}>CONJECTURA</div>
                            <div style={{ fontFamily:'Rajdhani,sans-serif', fontSize:17, color:'rgba(255,255,255,.45)', lineHeight:1.5 }}>{conjecture}</div>
                          </div>

                          {/* Barra de progresso de carreira (sem revelar teto) */}
                          {zones && (
                            <div style={{ marginTop:2 }}>
                              <div style={{ fontFamily:'Orbitron,monospace', fontSize:12, letterSpacing:'.18em', color:'rgba(255,255,255,.25)', marginBottom:5 }}>PROGRESSO DE CARREIRA</div>
                              <div style={{ position:'relative', height:8, borderRadius:4, overflow:'hidden', background:'rgba(255,255,255,.06)', display:'flex' }}>
                                {/* Zona 1 — consolidado (verde) */}
                                <div style={{ width:`${zones.z1Width*100}%`, background:'rgba(34,197,94,.25)', borderRight:'1px solid rgba(255,255,255,.08)' }} />
                                {/* Zona 2 — esperado (azul) */}
                                <div style={{ width:`${zones.z2Width*100}%`, background:'rgba(96,165,250,.2)', borderRight:'1px solid rgba(255,255,255,.08)' }} />
                                {/* Zona 3 — possível (roxo) */}
                                <div style={{ width:`${zones.z3Width*100}%`, background:'rgba(167,139,250,.15)', borderRight:'1px solid rgba(255,255,255,.06)' }} />
                                {/* Zona 4 — desconhecido (fade) */}
                                <div style={{ width:`${zones.z4Width*100}%`, background:'rgba(255,255,255,.04)' }} />
                                {/* Marcador de progresso atual */}
                                <div style={{ position:'absolute', top:0, bottom:0, left:`${zones.progress*100}%`, width:2, background:levelTag.color, boxShadow:`0 0 6px ${levelTag.color}` }} />
                              </div>
                              <div style={{ display:'flex', justifyContent:'space-between', marginTop:3 }}>
                                <span style={{ fontFamily:'Orbitron,monospace', fontSize:11, color:'rgba(34,197,94,.6)', letterSpacing:'.1em' }}>CONSOLIDADO</span>
                                <span style={{ fontFamily:'Orbitron,monospace', fontSize:11, color:'rgba(255,255,255,.2)', letterSpacing:'.1em' }}>TERRITÓRIO DESCONHECIDO</span>
                              </div>
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>

                  {/* Archetype card */}
                  <div style={{ display:'flex', flexDirection:'column', gap:8, flex:1, minWidth:160 }}>
                    {(() => {
                      const archIcons = { PRODIGY:'🌟', EARLY_BLOOMER:'🚀', STEADY:'⚖️', LATE_BLOOMER:'🐢', DIAMOND:'💎', VOLATILE:'⚡' };
                      const arch = player.developmentStyle.archetype;
                      const icon = archIcons[arch] || '📈';
                      const [p0, p1] = player.developmentStyle.peakAge;
                      const age = player.age || 25;
                      const phase = age < p0 ? 'CRESCENDO' : age <= p1 ? 'NO PICO' : 'DECLÍNIO';
                      const phaseColor = age < p0 ? '#22c55e' : age <= p1 ? '#ffd700' : '#ef4444';
                      return (
                        <>
                          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                            <span style={{ fontSize:18 }}>{icon}</span>
                            <div>
                              <div style={{ fontFamily:'Orbitron,monospace', fontSize:15, fontWeight:700, color:pColor, letterSpacing:'.1em' }}>{arch.replace(/_/g,' ')}</div>
                              <div style={{ fontFamily:'Rajdhani,sans-serif', fontSize:17, color:'rgba(255,255,255,.45)' }}>Peak: {p0}–{p1} anos</div>
                            </div>
                          </div>
                          <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                            <div style={{ padding:'3px 10px', border:`1px solid ${phaseColor}55`, background:`${phaseColor}11`, borderRadius:3, fontFamily:'Orbitron,monospace', fontSize:13, letterSpacing:'.14em', color:phaseColor }}>{phase}</div>
                            <div style={{ padding:'3px 10px', border:'1px solid rgba(255,255,255,.12)', borderRadius:3, fontFamily:'Orbitron,monospace', fontSize:13, letterSpacing:'.14em', color:'rgba(255,255,255,.45)' }}>
                              GROWTH {(player.developmentStyle.growthRate * 100).toFixed(0)}%
                            </div>
                          </div>
                          {/* Years active + tracking */}
                          {player.development && (
                            <div style={{ display:'flex', gap:10, flexWrap:'wrap', marginTop:4 }}>
                              {[
                                { l:'ANOS ATIVO', v: player.development.yearsActive },
                                { l:'BREAKTHROUGHS', v: player.development.breakthroughs, c:'#ffd700' },
                                { l:'REGRESSIONS', v: player.development.regressions, c:'#ef4444' },
                              ].map(x => (
                                <div key={x.l} style={{ textAlign:'center' }}>
                                  <div style={{ fontFamily:'Orbitron,monospace', fontSize:12, letterSpacing:'.18em', color:'rgba(255,255,255,.25)', marginBottom:2 }}>{x.l}</div>
                                  <div style={{ fontFamily:'Black Ops One,cursive', fontSize:20, color: x.c || 'rgba(255,255,255,.6)' }}>{x.v ?? 0}</div>
                                </div>
                              ))}
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </div>
              </div>
            )}

            {/* PERFIL DE COMBATE - ABAIXO */}
            <div className="up-label" style={{ marginTop:6, color:'rgba(255,215,0,0.6)' }}>⚔️ PERFIL DE COMBATE</div>
            <div className="up-card" style={{ padding:'20px 22px', borderColor:`${pColor}22` }}>
              <div style={{ display:'flex', gap:18, alignItems:'flex-start', flexWrap:'wrap' }}>
                <div style={{ flex:1, minWidth:200 }}>
                  <div style={{ fontFamily:'Rajdhani,sans-serif', fontWeight:700, fontSize:20, color:'rgba(255,255,255,.9)', lineHeight:1.6 }}>{player.playStyle || 'Estilo Desconhecido'}</div>
                  <div style={{ fontFamily:'Rajdhani,sans-serif', fontSize:18, color:'rgba(255,215,0,0.5)', marginTop:10, fontStyle:'italic' }}>{player.physicalDesc || 'Descrição física não disponível'}</div>
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:7, minWidth:180 }}>
                  <div className="up-label" style={{ marginBottom:4, color:'rgba(255,215,0,0.6)' }}>PONTOS FORTES</div>
                  {(mentality?.strengths || []).slice(0,4).map((s,i) => (
                    <div key={i} style={{ fontFamily:'Orbitron,monospace', fontSize:14, letterSpacing:'.1em', padding:'4px 12px', border:`1px solid ${pColor}44`, color:`${pColor}dd`, background:`${pColor}09`, clipPath:'polygon(4px 0%,100% 0%,calc(100% - 4px) 100%,0% 100%)' }}>{s}</div>
                  ))}
                </div>
              </div>
            </div>

            {/* ── PROGRESSÃO DE CARREIRA ── */}
            {careerData && (
              <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                <div className="up-label" style={{ color:'rgba(255,215,0,0.6)' }}>🎮 PROGRESSÃO DE CARREIRA</div>
                <div className="up-card" style={{ padding:'22px 24px' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                      <div style={{ fontFamily:'Black Ops One,cursive', fontSize:36, color:pColor, lineHeight:1, textShadow:`0 0 20px ${pColor}77` }}>LEVEL {careerData.level}</div>
                      <div style={{ fontFamily:'Orbitron,monospace', fontSize:14, letterSpacing:'.15em', color:'rgba(255,255,255,.35)' }}>EXPERIÊNCIA</div>
                    </div>
                    <div style={{ fontFamily:'Orbitron,monospace', fontSize:17, color:`${pColor}cc`, fontWeight:700 }}>{careerData.experiencePoints?.toLocaleString?.()} XP</div>
                  </div>
                  <div style={{ position:'relative', marginBottom:6 }}>
                    <div className="up-fbar" style={{ height:10 }}>
                      <div className="up-ffill" style={{ width:`${(careerData.experiencePoints % 1000) / 10}%`, background:`linear-gradient(90deg,${pColor}77,${pColor})`, boxShadow:`0 0 8px ${pColor}55` }} />
                    </div>
                    <div style={{ display:'flex', justifyContent:'space-between', marginTop:5 }}>
                      <span style={{ fontFamily:'Orbitron,monospace', fontSize:12, color:'rgba(255,255,255,.25)', letterSpacing:'.1em' }}>{careerData.experiencePoints % 1000} / 1000 XP</span>
                      <span style={{ fontFamily:'Orbitron,monospace', fontSize:12, color:`${pColor}77`, letterSpacing:'.1em' }}>PRÓXIMO LEVEL</span>
                    </div>
                  </div>
                </div>
              </div>
            )}


          </div>
        )}

        {/* ─── 1: ARSENAL ─── */}
        {activeTab === 1 && (
          <div style={{ display:'flex', flexDirection:'column', gap:16, animation:'up-entry .4s ease both' }}>
            {isDynamic && universeManager?.signatureBlades ? (() => {
              const sd = universeManager.signatureBlades.get(playerId);
              const sb = sd?.blade, ss = sd?.stats;
              if (!sb) return <Empty msg="SIGNATURE BLADE NÃO ENCONTRADO" />;

              // ── helpers ──
              const totalR   = ss?.totalRounds || 0;
              const totalW   = ss?.totalWins   || 0;
              const totalL   = ss?.totalLosses || 0;
              const winPct   = totalR > 0 ? ((totalW / totalR) * 100).toFixed(1) : '—';
              const wBurst   = ss?.winsByBurst   || 0;
              const wSpin    = ss?.winsBySpin    || 0;
              const wRing    = ss?.winsByRingOut || 0;
              const lBurst   = ss?.lossesByBurst   || 0;
              const lSpin    = ss?.lossesBySpin    || 0;
              const lRing    = ss?.lossesByRingOut || 0;
              const wStreak  = ss?.winStreak      || 0;
              const lStreak  = ss?.lossStreak     || 0;
              const bWStreak = ss?.bestWinStreak  || 0;
              const bLStreak = ss?.bestLossStreak || 0;
              // ── vs Signatures ──
              const wVsSig   = ss?.winsAgainstSignatures   || 0;
              const lVsSig   = ss?.lossesAgainstSignatures || 0;
              const sigTotal = wVsSig + lVsSig;
              const sigPct   = sigTotal > 0 ? ((wVsSig / sigTotal) * 100).toFixed(1) : '—';
              const sigWStreak  = ss?.vsSignaturesWinStreak      || 0;
              const sigLStreak  = ss?.vsSignaturesLossStreak     || 0;
              const sigBWStreak = ss?.vsSignaturesBestWinStreak  || 0;
              const sigBLStreak = ss?.vsSignaturesBestLossStreak || 0;
              // ── vs Comuns ──
              const wVsCom   = totalW - wVsSig;
              const lVsCom   = totalL - lVsSig;
              const comTotal = wVsCom + lVsCom;
              const comPct   = comTotal > 0 ? ((wVsCom / comTotal) * 100).toFixed(1) : '—';
              const comWStreak  = ss?.vsCommonsWinStreak      || 0;
              const comLStreak  = ss?.vsCommonsLossStreak     || 0;
              const comBWStreak = ss?.vsCommonsBestWinStreak  || 0;
              const comBLStreak = ss?.vsCommonsBestLossStreak || 0;

              const typeIcon = sb.type==='Attack'?'⚔️':sb.type==='Defense'?'🛡️':sb.type==='Stamina'?'♾️':'⚖️';
              const typeColor= sb.type==='Attack'?'#f97316':sb.type==='Defense'?'#60a5fa':sb.type==='Stamina'?'#22c55e':'#a855f7';

              const MiniStat = ({label, value, color='rgba(255,255,255,.9)', sub}) => (
                <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
                  <div style={{ fontFamily:'Orbitron,monospace', fontSize:12, letterSpacing:'.12em', color:'rgba(255,215,0,.45)', textTransform:'uppercase' }}>{label}</div>
                  <div style={{ fontFamily:'Black Ops One,cursive', fontSize:18, color, lineHeight:1 }}>{value}</div>
                  {sub && <div style={{ fontFamily:'Orbitron,monospace', fontSize:12, color:'rgba(255,255,255,.3)' }}>{sub}</div>}
                </div>
              );

              const FinishBar = ({wVal, lVal, wColor, lColor, label, icon}) => {
                const total = wVal + lVal || 1;
                return (
                  <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                        <span style={{ fontSize:16 }}>{icon}</span>
                        <span style={{ fontFamily:'Orbitron,monospace', fontSize:12, letterSpacing:'.12em', color:'rgba(255,215,0,.5)' }}>{label}</span>
                      </div>
                      <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                        <span style={{ fontFamily:'Orbitron,monospace', fontSize:15, fontWeight:700, color:wColor }}>{wVal}W</span>
                        <span style={{ fontFamily:'Orbitron,monospace', fontSize:14, color:'rgba(255,255,255,.25)' }}>/</span>
                        <span style={{ fontFamily:'Orbitron,monospace', fontSize:15, fontWeight:700, color:lColor }}>{lVal}L</span>
                      </div>
                    </div>
                    <div style={{ height:5, borderRadius:99, background:'rgba(255,255,255,.07)', overflow:'hidden', display:'flex' }}>
                      <div style={{ width:`${(wVal/total)*100}%`, background:`linear-gradient(90deg,${wColor}88,${wColor})`, transition:'width .6s ease' }} />
                      <div style={{ flex:1, background:`linear-gradient(90deg,${lColor},${lColor}88)` }} />
                    </div>
                  </div>
                );
              };

              return (
                <>
                  {/* ── HEADER IDENTITY ── */}
                  <div className="up-label" style={{ color:`${pColor}99` }}>⚔ SIGNATURE BLADE</div>

                  <div className="up-card" style={{ padding:'28px', borderColor:`${pColor}55`, boxShadow:`0 0 60px ${pColor}12, inset 0 0 40px rgba(0,0,0,.3)` }}>

                    {/* ── Top: Visual + Identity + Quick KPIs ── */}
                    <div style={{ display:'flex', gap:24, flexWrap:'wrap', alignItems:'center', marginBottom:24 }}>

                      {/* Blade orb */}
                      <div style={{ flexShrink:0, display:'flex', flexDirection:'column', alignItems:'center', gap:10 }}>
                        <div style={{ position:'relative', width:140, height:140 }}>
                          {/* Outer glow ring */}
                          <div style={{ position:'absolute', inset:-8, borderRadius:'50%', border:`2px solid ${pColor}22`, animation:'ring-pulse 3s ease-in-out infinite' }} />
                          <div style={{ position:'absolute', inset:-16, borderRadius:'50%', border:`1px solid ${pColor}11`, animation:'ring-pulse 3s ease-in-out infinite', animationDelay:'.5s' }} />
                          <div style={{ width:'100%', height:'100%', borderRadius:'50%', position:'relative', overflow:'hidden',
                            background:`radial-gradient(circle at 35% 35%,${pColor},${p2Color})`,
                            border:`4px solid ${pColor}88`, boxShadow:`0 0 50px ${pColor}55`,
                            display:'flex', alignItems:'center', justifyContent:'center',
                          }}>
                            <span style={{ fontFamily:'Black Ops One,cursive', fontSize:44, color:'rgba(255,255,255,.9)', textShadow:'0 0 20px rgba(0,0,0,.8)', position:'relative', zIndex:2, animation:'up-float 4s ease-in-out infinite' }}>{sb.type?.[0]}</span>
                            <div style={{ position:'absolute', inset:8, borderRadius:'50%', border:'2px solid rgba(255,255,255,.2)', animation:'up-spin 20s linear infinite' }} />
                            <div style={{ position:'absolute', inset:20, borderRadius:'50%', border:'1px solid rgba(255,255,255,.1)', animation:'up-spin-r 15s linear infinite' }} />
                          </div>
                          <div style={{ position:'absolute', bottom:-4, right:-4, width:44, height:44, borderRadius:'50%', background:`linear-gradient(135deg,${typeColor},rgba(0,0,0,.7))`, border:`2px solid ${typeColor}88`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, boxShadow:`0 0 14px ${typeColor}66` }}>
                            {typeIcon}
                          </div>
                        </div>
                        <div style={{ textAlign:'center' }}>
                          <div style={{ fontFamily:'Black Ops One,cursive', fontSize:17, background:`linear-gradient(90deg,#fff,${pColor})`, WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', lineHeight:1.3 }}>{sb.signatureName}</div>
                          <div style={{ fontFamily:'Orbitron,monospace', fontSize:13, letterSpacing:'.2em', color:`${typeColor}cc`, marginTop:3 }}>{sb.type?.toUpperCase()} TYPE</div>
                        </div>
                      </div>

                      {/* Identity + Quick KPIs */}
                      <div style={{ flex:1, minWidth:200 }}>
                        {/* Parts grid */}
                        <div className="up-label" style={{ marginBottom:8 }}>PARTS</div>
                        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:5, marginBottom:18 }}>
                          {[
                            ['LAYER',  sb.layer?.name,  '🗡️'],
                            ['DISC',   sb.disc?.name,   '⚡'],
                            ['DRIVER', sb.driver?.name, '🔴'],
                            ['ARMOR',  sb.armor?.name,  '🐾'],
                          ].map(([l,v,ico]) => (
                            <div key={l} className="up-card" style={{ padding:'9px 12px', borderColor:`${pColor}22` }}>
                              <div style={{ fontFamily:'Orbitron,monospace', fontSize:12, letterSpacing:'.15em', color:'rgba(255,215,0,.45)', marginBottom:3 }}>{ico} {l}</div>
                              <div style={{ fontFamily:'Rajdhani,sans-serif', fontWeight:700, fontSize:18, color:'rgba(255,255,255,.95)' }}>{v||'—'}</div>
                            </div>
                          ))}
                        </div>

                        {/* Quick KPI row */}
                        <div style={{ display:'flex', gap:16, flexWrap:'wrap' }}>
                          <MiniStat label="Rounds" value={totalR} />
                          <MiniStat label="Win %" value={totalR>0?`${winPct}%`:'—'} color={parseFloat(winPct)>=50?'#22c55e':'#ef4444'} />
                          <MiniStat label="Win Streak" value={wStreak} color='#f59e0b' />
                          <MiniStat label="Loss Streak" value={lStreak} color='#ef4444' />
                        </div>
                      </div>

                      {/* Blade physical stats */}
                      <div style={{ flexShrink:0, minWidth:170 }}>
                        <div className="up-label" style={{ marginBottom:8 }}>BLADE STATS</div>
                        <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
                          {Object.entries(sb.stats||{}).map(([stat,val]) => {
                            const mx = stat==='spin'?70:35;
                            const pct = Math.min((val/mx)*100,100);
                            const barColor = stat==='atk'?'#f97316':stat==='def'?'#60a5fa':stat==='sta'?'#22c55e':stat==='brl'?'#a855f7':stat==='weight'?'#fbbf24':pColor;
                            return (
                              <div key={stat}>
                                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:2 }}>
                                  <span style={{ fontFamily:'Orbitron,monospace', fontSize:12, letterSpacing:'.1em', color:'rgba(255,215,0,.5)', textTransform:'uppercase' }}>{stat}</span>
                                  <span style={{ fontFamily:'Orbitron,monospace', fontSize:14, fontWeight:700, color:barColor }}>{val}</span>
                                </div>
                                <div className="up-attr-bar">
                                  <div className="up-attr-fill" style={{ width:`${pct}%`, background:`linear-gradient(90deg,${barColor}44,${barColor})` }} />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* ── Divider ── */}
                    <div style={{ height:1, background:`linear-gradient(90deg,transparent,${pColor}44,transparent)`, marginBottom:22 }} />

                    {/* ── COMBAT RECORD – 3 blocos ── */}
                    <div className="up-label" style={{ marginBottom:14 }}>⚡ COMBAT RECORD</div>

                    {/* Grid 3 colunas */}
                    {(() => {
                      const panels = [
                        {
                          title: 'TOTAL',
                          icon: '📊',
                          color: pColor,
                          rounds: totalR,
                          wins: totalW,
                          losses: totalL,
                          pct: winPct,
                          wStrk: wStreak,
                          lStrk: lStreak,
                          bWStrk: bWStreak,
                          bLStrk: bLStreak,
                        },
                        {
                          title: 'VS COMUNS',
                          icon: '🗡️',
                          color: '#60a5fa',
                          rounds: comTotal,
                          wins: wVsCom,
                          losses: lVsCom,
                          pct: comPct,
                          wStrk: comWStreak,
                          lStrk: comLStreak,
                          bWStrk: comBWStreak,
                          bLStrk: comBLStreak,
                        },
                        {
                          title: 'VS SIGNATURES',
                          icon: '⚔️',
                          color: '#ffd700',
                          rounds: sigTotal,
                          wins: wVsSig,
                          losses: lVsSig,
                          pct: sigPct,
                          wStrk: sigWStreak,
                          lStrk: sigLStreak,
                          bWStrk: sigBWStreak,
                          bLStrk: sigBLStreak,
                        },
                      ];

                      const Row = ({ label, value, valueColor = 'rgba(255,255,255,.92)', dim = false }) => (
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'5px 0', borderBottom:'1px solid rgba(255,255,255,.05)' }}>
                          <span style={{ fontFamily:'Orbitron,monospace', fontSize:11, letterSpacing:'.08em', color: dim ? 'rgba(255,215,0,.28)' : 'rgba(255,215,0,.45)', textTransform:'uppercase' }}>{label}</span>
                          <span style={{ fontFamily:'Black Ops One,cursive', fontSize: dim ? 13 : 17, color: dim ? `${valueColor}99` : valueColor, lineHeight:1 }}>{value ?? 0}</span>
                        </div>
                      );

                      const Divider = ({ label }) => (
                        <div style={{ display:'flex', alignItems:'center', gap:6, margin:'8px 0 4px' }}>
                          <div style={{ flex:1, height:1, background:'rgba(255,255,255,.06)' }} />
                          <span style={{ fontFamily:'Orbitron,monospace', fontSize:11, letterSpacing:'.15em', color:'rgba(255,255,255,.2)', textTransform:'uppercase', whiteSpace:'nowrap' }}>{label}</span>
                          <div style={{ flex:1, height:1, background:'rgba(255,255,255,.06)' }} />
                        </div>
                      );

                      return (
                        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:22 }}>
                          {panels.map(p => {
                            const pctVal = parseFloat(p.pct);
                            const pctColor = isNaN(pctVal) ? 'rgba(255,255,255,.4)' : pctVal >= 50 ? '#22c55e' : '#ef4444';
                            return (
                              <div key={p.title} className="up-card" style={{ padding:'14px 16px', borderColor:`${p.color}33`, boxShadow:`0 0 18px ${p.color}08` }}>
                                {/* Header */}
                                <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:11, paddingBottom:8, borderBottom:`1px solid ${p.color}33` }}>
                                  <span style={{ fontSize:17 }}>{p.icon}</span>
                                  <span style={{ fontFamily:'Orbitron,monospace', fontSize:13, letterSpacing:'.18em', fontWeight:700, color:p.color }}>{p.title}</span>
                                </div>
                                {/* Stats básicas */}
                                <Row label="Total Rounds"  value={p.rounds} />
                                <Row label="Vitórias"      value={p.wins}   valueColor='#22c55e' />
                                <Row label="Derrotas"      value={p.losses} valueColor='#ef4444' />
                                <Row label="% Vitórias"    value={p.rounds > 0 ? `${p.pct}%` : '—'} valueColor={pctColor} />
                                {/* Streaks atuais */}
                                <Divider label="streak atual" />
                                <Row label="🔥 Win Streak"  value={p.wStrk} valueColor='#f59e0b' />
                                <Row label="💀 Loss Streak" value={p.lStrk} valueColor='#f87171' />
                                {/* Recordes */}
                                <Divider label="recordes" />
                                <Row label="Maior Win Streak"  value={p.bWStrk} valueColor='#f59e0b' dim />
                                <Row label="Maior Loss Streak" value={p.bLStrk} valueColor='#f87171' dim />
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}

                    {/* ── FINISH BREAKDOWN ── */}
                    <div className="up-label" style={{ marginBottom:12 }}>🎯 FINISH BREAKDOWN</div>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10, marginBottom:22 }}>
                      <FinishBar wVal={wBurst} lVal={lBurst} wColor='#f97316' lColor='#ef4444' label='BURST' icon='💥' />
                      <FinishBar wVal={wSpin}  lVal={lSpin}  wColor='#60a5fa' lColor='#ef4444' label='SPIN OUT' icon='🌀' />
                      <FinishBar wVal={wRing}  lVal={lRing}  wColor='#a855f7' lColor='#ef4444' label='RING OUT' icon='💨' />
                    </div>


                  </div>

                  {/* ── SEASON BLADES ── */}
                  {(() => {
                    const bl = universeManager.seasonBlades?.get(playerId);
                    if (!bl || bl.length===0) return null;
                    return (
                      <>
                        <div className="up-label">📅 SEASON BLADES — {universeManager.currentYear}</div>
                        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))', gap:8 }}>
                          {bl.map((blade,idx) => {
                            const bc = blade.type==='Attack'?'#f97316':blade.type==='Defense'?'#60a5fa':blade.type==='Stamina'?'#22c55e':'#a855f7';
                            return (
                              <div key={idx} className="up-card" style={{ padding:'14px', borderColor:`${bc}22` }}>
                                <div style={{ display:'flex', gap:10, alignItems:'center', marginBottom:10 }}>
                                  <div style={{ width:36,height:36,borderRadius:'50%',border:`2px solid ${bc}55`,background:`linear-gradient(135deg,${pColor},${p2Color})`,display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'Black Ops One,cursive',fontSize:19,color:'white',boxShadow:`0 0 10px ${bc}44` }}>{blade.type?.[0]}</div>
                                  <div>
                                    <div style={{ fontFamily:'Orbitron,monospace', fontSize:12, letterSpacing:'.1em', color:'rgba(255,215,0,.45)' }}>BLADE #{idx+1}</div>
                                    <div style={{ fontFamily:'Rajdhani,sans-serif', fontWeight:700, fontSize:17, color:bc }}>{blade.type} TYPE</div>
                                  </div>
                                </div>
                                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:4 }}>
                                  {[['ATK',blade.stats?.atk,'#f97316'],['DEF',blade.stats?.def,'#60a5fa'],['STA',blade.stats?.sta,'#22c55e'],['SPIN',blade.stats?.spin,pColor]].map(([l,v,c]) => (
                                    <div key={l} style={{ background:'rgba(0,0,0,.3)', padding:'5px 8px', borderRadius:2, borderLeft:`2px solid ${c}44` }}>
                                      <span style={{ fontFamily:'Orbitron,monospace', fontSize:12, color:'rgba(255,215,0,.45)' }}>{l}: </span>
                                      <span style={{ fontFamily:'Orbitron,monospace', fontSize:16, fontWeight:700, color:'rgba(255,255,255,.9)' }}>{v||0}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </>
                    );
                  })()}
                </>
              );
            })() : <Empty msg={isDynamic ? 'CARREGANDO ARSENAL...' : 'INICIE O UNIVERSE MODE PARA VER O ARSENAL'} />}
          </div>
        )}

        {/* ─── 3: TÍTULOS ─── */}
        {activeTab === 3 && (
          <div style={{ display:'flex', flexDirection:'column', gap:14, animation:'up-entry .4s ease both' }}>
            {playerHistory ? (
              <>
                {/* ─── TIERS DE PRESTÍGIO ─── */}
                <div className="up-label">🏆 TIERS DE PRESTÍGIO</div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:8 }}>
                  {[
                    { l:'KINGS COURT',   sub:'FINAL DE ANO',       v: playerHistory.titles?.kingsCourtTitles    || 0, c:'#ffd700', bg:'rgba(255,215,0,.08)',   bc:'rgba(255,215,0,.4)',   icon:'👑' },
                    { l:'PREMIER',       sub:'2000 PTS · MD5',      v: playerHistory.titles?.premierTitles       || 0, c:'#f87171', bg:'rgba(248,113,113,.08)', bc:'rgba(248,113,113,.4)', icon:'⭐' },
                    { l:'SIGNATURE CLASH', sub:'1500 PTS · MD1',   v: (playerHistory.titles?.signatureClashTitles || 0) + (playerHistory.titles?.invitationalTitles || 0), c:'#fde68a', bg:'rgba(253,230,138,.08)', bc:'rgba(253,230,138,.4)', icon:'✍️' },
                    { l:'MASTERS',       sub:'1000 PTS',            v: playerHistory.titles?.mastersTitles       || 0, c:'#c084fc', bg:'rgba(192,132,252,.08)', bc:'rgba(192,132,252,.4)', icon:'💎' },
                    { l:'CROSSOVER OPEN',sub:'750 PTS · MISTO',     v: playerHistory.titles?.openTitles          || 0, c:'#86efac', bg:'rgba(134,239,172,.08)', bc:'rgba(134,239,172,.4)', icon:'🌐' },
                    { l:'CHALLENGER',    sub:'500 PTS',             v: playerHistory.titles?.challengerTitles    || 0, c:'#60a5fa', bg:'rgba(96,165,250,.08)',  bc:'rgba(96,165,250,.4)',  icon:'🔵' },
                    { l:'REDEMPTION',    sub:'250 PTS',             v: playerHistory.titles?.redemptionTitles    || 0, c:'#34d399', bg:'rgba(52,211,153,.08)',  bc:'rgba(52,211,153,.4)',  icon:'🌿' },
                    { l:'TOTAL TÍTULOS', sub:'TODOS OS FORMATOS',   v: playerHistory.titles?.total               || 0, c:'rgba(255,255,255,.7)', bg:'rgba(255,255,255,.04)', bc:'rgba(255,255,255,.15)', icon:'🏅' },
                  ].map(s => (
                    <div key={s.l} className="up-trophy" style={{ background:s.bg, borderColor:s.bc, position:'relative', overflow:'hidden' }}>
                      <div style={{ fontSize:18, marginBottom:4 }}>{s.icon}</div>
                      <div style={{ fontFamily:'Black Ops One,cursive', fontSize:s.v > 9 ? 42 : 56, color:s.c, lineHeight:1, textShadow:`0 0 28px ${s.c}99` }}>{s.v}</div>
                      <div style={{ fontFamily:'Orbitron,monospace', fontSize:10, letterSpacing:'.15em', color:s.c, opacity:.8, marginTop:4 }}>{s.l}</div>
                      <div style={{ fontFamily:'Orbitron,monospace', fontSize:10, letterSpacing:'.1em', color:'rgba(255,255,255,.28)', marginTop:2 }}>{s.sub}</div>
                    </div>
                  ))}
                </div>

                {/* ─── AMADORES ─── */}
                <div className="up-label" style={{ marginTop:4 }}>⭐ TÍTULOS AMADORES</div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                  {[
                    { l:'RISING FINALS',  sub:'CAMPEONATO AMADOR', v: playerHistory.titles?.risingFinalsTitles || 0, c:'#f59e0b', bg:'rgba(245,158,11,.08)', bc:'rgba(245,158,11,.4)', icon:'🌟' },
                    { l:'RISING STAR',    sub:'CIRCUITO AMADOR',   v: playerHistory.titles?.risingStarTitles   || 0, c:'#fb923c', bg:'rgba(251,146,60,.08)', bc:'rgba(251,146,60,.4)', icon:'🌠' },
                  ].map(s => (
                    <div key={s.l} className="up-trophy" style={{ background:s.bg, borderColor:s.bc }}>
                      <div style={{ fontSize:18, marginBottom:4 }}>{s.icon}</div>
                      <div style={{ fontFamily:'Black Ops One,cursive', fontSize:56, color:s.c, lineHeight:1, textShadow:`0 0 28px ${s.c}99` }}>{s.v}</div>
                      <div style={{ fontFamily:'Orbitron,monospace', fontSize:12, letterSpacing:'.15em', color:s.c, opacity:.8, marginTop:4 }}>{s.l}</div>
                      <div style={{ fontFamily:'Orbitron,monospace', fontSize:11, letterSpacing:'.1em', color:'rgba(255,255,255,.28)', marginTop:2 }}>{s.sub}</div>
                    </div>
                  ))}
                </div>

                {/* ─── LISTA DETALHADA ─── */}
                {Array.isArray(playerHistory.titles?.detailedList) && playerHistory.titles.detailedList.length > 0 && (
                  <>
                    <div className="up-label" style={{ marginTop:4 }}>LISTA COMPLETA</div>
                    <div className="up-scroll" style={{ maxHeight:300, overflowY:'auto', display:'flex', flexDirection:'column', gap:4 }}>
                      {[...playerHistory.titles.detailedList].reverse().map((t,i) => {
                        const tierColors = {
                          KINGS_COURT:'#ffd700', PREMIER:'#f87171', SIGNATURE_CLASH:'#fde68a', INVITATIONAL:'#fde68a',
                          MASTERS:'#c084fc', CHALLENGER:'#60a5fa', OPEN:'#86efac',
                          REDEMPTION:'#34d399', RISING_STAR:'#f59e0b', RISING_FINALS:'#f59e0b'
                        };
                        const tc = tierColors[t.tournamentTier] || '#ffd700';
                        return (
                          <div key={i} className="up-hrow" style={{ borderColor:`${tc}30`, background:`${tc}05` }}>
                            <span style={{ fontSize:20 }}>🏆</span>
                            <div style={{ flex:1 }}>
                              <div style={{ fontFamily:'Rajdhani,sans-serif', fontWeight:700, fontSize:18, color:tc }}>{t.tournamentName}</div>
                              <div style={{ fontFamily:'Orbitron,monospace', fontSize:12, letterSpacing:'.1em', color:'rgba(255,255,255,.3)' }}>{t.tournamentTier} · {t.year}/{padM(t.month)}</div>
                            </div>
                            <div style={{ fontFamily:'Orbitron,monospace', fontSize:16, fontWeight:700, color:tc }}>{t.points} PTS</div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </>
            ) : <Empty msg="INICIE O UNIVERSE MODE PARA VER TÍTULOS" />}
          </div>
        )}

        {/* ─── 4: HISTÓRICO ─── */}
        {activeTab === 4 && (
          <div style={{ display:'flex', flexDirection:'column', gap:12, animation:'up-entry .4s ease both' }}>
            {playerHistory && Array.isArray(playerHistory.tournamentHistory) && playerHistory.tournamentHistory.length > 0 ? (
              <>
                <div className="up-label">HISTÓRICO DE TORNEIOS</div>
                <div className="up-scroll" style={{ maxHeight:560, overflowY:'auto', display:'flex', flexDirection:'column', gap:4 }}>
                  {[...playerHistory.tournamentHistory].reverse().map((t,i) => {
                    const rndMap = {CHAMPION:'🏆 CAMPEÃO',F:'Final',SF:'Semifinal',QF:'Quartas',R16:'Oitavas',R32:'R32',R64:'R64'};
                    const rnd = rndMap[t.eliminatedRound] || t.eliminatedRound || '?';
                    const isC = t.eliminatedRound==='CHAMPION';
                    return (
                      <div key={i} className="up-hrow" style={{ borderColor:isC?'rgba(255,215,0,.3)':'rgba(255,255,255,.06)', background:isC?'rgba(255,215,0,.05)':'rgba(255,255,255,.02)' }}>
                        <div style={{ fontFamily:'Orbitron,monospace', fontSize:13, color:'rgba(255,255,255,.3)', minWidth:40 }}>{padM(t.month)}/{t.year}</div>
                        <div style={{ flex:1 }}>
                          <div style={{ fontFamily:'Rajdhani,sans-serif', fontWeight:700, fontSize:18, color:isC?'#ffd700':'rgba(255,255,255,.85)' }}>{t.name}</div>
                        </div>
                        <div style={{ fontFamily:'Orbitron,monospace', fontSize:14, fontWeight:700, color:isC?'#ffd700':'rgba(192,132,252,.8)' }}>{rnd}</div>
                        <div style={{ fontFamily:'Orbitron,monospace', fontSize:15, fontWeight:700, color:'rgba(255,255,255,.45)', minWidth:58, textAlign:'right' }}>{t.points} PTS</div>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : <Empty msg="NENHUM TORNEIO PARTICIPADO AINDA" />}
          </div>
        )}

        {/* ─── 5: ARENAS ─── */}
        {activeTab === 5 && (() => {

          /* ── Arena display metadata ── */
          const ARENA_DISPLAY = {
            BB10_COMPETITIVE:  { name:'BB-10 Competitive',      emoji:'⚔️',  desc:'Arena padrão competitiva, equilibrada',          color:'#60a5fa' },
            VOLCANIC_RAGE:     { name:'Volcanic Rage',          emoji:'🌋',  desc:'Erupções vulcânicas e lava flows caóticos',      color:'#ef4444' },
            KILLER_SIDES:      { name:'Killer Sides Arena',     emoji:'🔄',  desc:'Track de aderência – stamina e controle',        color:'#10b981' },
            NEXUS:             { name:'Prismatic Nexus Arena',  emoji:'🌀',  desc:'Portais multidimensionais que teletransportam',  color:'#06b6d4' },
            COLOSSEUM_CARNAGE: { name:'Colosseum Carnage',      emoji:'🏛️', desc:'Itens aleatórios, portas e bumpers mortais',     color:'#f97316' },
            PANGEA_PLATFORM:   { name:'Pangea Platform',        emoji:'🌍',  desc:'Plataforma sólida e estratégica',                color:'#22c55e' },
            PINBALL_INFERNO:   { name:'Pinball Inferno Arena',  emoji:'🎰',  desc:'Caos total – flippers, bumpers e gravity tilt', color:'#ec4899' },
            VORTEX_COLISEUM:   { name:'Vortex Coliseum',        emoji:'💜',  desc:'Vórtex girante com slingshotss orbitais',        color:'#a855f7' },
            DOMINATION_ZONES:  { name:'Domination Zones',       emoji:'🎯',  desc:'Zonas táticas periféricas de dominação',         color:'#fbbf24' },
            TIDAL_SURGE:       { name:'Tidal Surge',            emoji:'🌊',  desc:'Ondas periódicas de força violenta',             color:'#0ea5e9' },
            STORM_TRACK:       { name:'Storm Track',            emoji:'⛈️', desc:'Rajadas de vento e velocidade extrema',          color:'#94a3b8' },
          };

          /* ── Preferences by mentality (fixed per career) ── */
          const ARENA_PREFERENCES = {
            ALL_ROUNDER:        { fav:['BB10_COMPETITIVE','PANGEA_PLATFORM','DOMINATION_ZONES'],   hate:['PINBALL_INFERNO','VOLCANIC_RAGE','COLOSSEUM_CARNAGE'] },
            GLASS_CANNON:       { fav:['COLOSSEUM_CARNAGE','PINBALL_INFERNO','STORM_TRACK'],       hate:['KILLER_SIDES','VORTEX_COLISEUM','DOMINATION_ZONES'] },
            IRON_FORTRESS:      { fav:['NEXUS','DOMINATION_ZONES','PANGEA_PLATFORM'],              hate:['PINBALL_INFERNO','STORM_TRACK','COLOSSEUM_CARNAGE'] },
            ETERNAL_SPINNER:    { fav:['VORTEX_COLISEUM','KILLER_SIDES','TIDAL_SURGE'],            hate:['COLOSSEUM_CARNAGE','PINBALL_INFERNO','VOLCANIC_RAGE'] },
            CALCULATED_CHAOS:   { fav:['NEXUS','COLOSSEUM_CARNAGE','DOMINATION_ZONES'],            hate:['BB10_COMPETITIVE','KILLER_SIDES','PANGEA_PLATFORM'] },
            HIGH_RISK_GAMBLER:  { fav:['PINBALL_INFERNO','COLOSSEUM_CARNAGE','STORM_TRACK'],       hate:['BB10_COMPETITIVE','PANGEA_PLATFORM','DOMINATION_ZONES'] },
            MOMENTUM_MASTER:    { fav:['STORM_TRACK','TIDAL_SURGE','VORTEX_COLISEUM'],             hate:['PINBALL_INFERNO','VOLCANIC_RAGE','NEXUS'] },
            SYNERGY_SEEKER:     { fav:['DOMINATION_ZONES','NEXUS','PANGEA_PLATFORM'],              hate:['PINBALL_INFERNO','VOLCANIC_RAGE','COLOSSEUM_CARNAGE'] },
            ADAPTIVE_TACTICIAN: { fav:['NEXUS','DOMINATION_ZONES','BB10_COMPETITIVE'],             hate:['VOLCANIC_RAGE','KILLER_SIDES','VORTEX_COLISEUM'] },
            PERFECTIONIST:      { fav:['BB10_COMPETITIVE','PANGEA_PLATFORM','KILLER_SIDES'],       hate:['PINBALL_INFERNO','COLOSSEUM_CARNAGE','TIDAL_SURGE'] },
            CHAOS_AGENT:        { fav:['PINBALL_INFERNO','VOLCANIC_RAGE','COLOSSEUM_CARNAGE'],     hate:['BB10_COMPETITIVE','PANGEA_PLATFORM','NEXUS'] },
            MOMENTUM_THIEF:     { fav:['KILLER_SIDES','DOMINATION_ZONES','STORM_TRACK'],           hate:['TIDAL_SURGE','VORTEX_COLISEUM','PANGEA_PLATFORM'] },
          };

          const prefs = ARENA_PREFERENCES[player.mentality] || ARENA_PREFERENCES.ALL_ROUNDER;
          const FAV_BONUS  = [6, 4, 2];
          const HATE_BONUS = [-6, -4, -2];
          const RANK_GOLD  = ['#ffd700','#c0c0c0','#cd7f32'];

          const FAV_RANK_LABEL  = ['FAVORITA #1 — +6','FAVORITA #2 — +4','FAVORITA #3 — +2'];
          const HATE_RANK_LABEL = ['RIVAL #1 — −6','RIVAL #2 — −4','RIVAL #3 — −2'];

          const ArenaCard = ({ arenaKey, rank, modifier, isFav }) => {
            const info   = ARENA_DISPLAY[arenaKey] || { name:arenaKey, emoji:'🏟️', desc:'', color:'#aaa' };
            const isPos  = modifier > 0;
            const modC   = isPos ? '#22c55e' : '#ef4444';
            const rGold  = RANK_GOLD[rank];
            const label  = isFav ? FAV_RANK_LABEL[rank] : HATE_RANK_LABEL[rank];
            const alpha  = [.18, .10, .06][rank];
            const bdrA   = [.55, .28, .14][rank];
            const bgC    = isFav ? `rgba(255,215,0,${alpha})` : `rgba(239,68,68,${alpha})`;
            const bdrC   = isFav ? `rgba(255,215,0,${bdrA})` : `rgba(239,68,68,${bdrA})`;

            return (
              <div style={{
                display:'flex', alignItems:'center', gap:14,
                padding:'15px 18px',
                background: bgC,
                border:`1px solid ${bdrC}`,
                clipPath:'polygon(8px 0%,100% 0%,calc(100% - 8px) 100%,0% 100%)',
                transition:'all .18s ease',
                position:'relative', overflow:'hidden',
              }}>
                {/* Left accent bar */}
                <div style={{ position:'absolute', left:0, top:0, bottom:0, width:3, background: isFav ? `linear-gradient(180deg,${rGold},${info.color})` : 'linear-gradient(180deg,#ef4444,#7f1d1d)' }} />

                {/* Rank number */}
                <div style={{
                  fontFamily:'Black Ops One,cursive', fontSize:rank===0?34:26,
                  color:rGold, minWidth:30, textAlign:'center',
                  textShadow:`0 0 14px ${rGold}88`, lineHeight:1, flexShrink:0,
                }}>{rank+1}</div>

                {/* Arena emoji */}
                <div style={{ fontSize:30, lineHeight:1, filter:`drop-shadow(0 0 8px ${info.color}77)`, flexShrink:0 }}>{info.emoji}</div>

                {/* Arena info */}
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4, flexWrap:'wrap' }}>
                    <div style={{
                      fontFamily:'Black Ops One,cursive', fontSize:rank===0?16:14,
                      color: rank===0 ? rGold : 'rgba(255,255,255,.9)',
                      letterSpacing:'.02em',
                    }}>{info.name}</div>
                    <div style={{
                      fontFamily:'Orbitron,monospace', fontSize:12, letterSpacing:'.12em',
                      padding:'2px 8px', border:`1px solid ${info.color}44`,
                      color:info.color, background:`${info.color}0e`,
                      clipPath:'polygon(3px 0%,100% 0%,calc(100% - 3px) 100%,0% 100%)',
                      whiteSpace:'nowrap',
                    }}>{label}</div>
                  </div>
                  <div style={{ fontFamily:'Rajdhani,sans-serif', fontSize:17, color:'rgba(255,255,255,.38)', fontStyle:'italic' }}>{info.desc}</div>
                </div>

                {/* Modifier */}
                <div style={{ textAlign:'right', flexShrink:0 }}>
                  <div style={{
                    fontFamily:'Black Ops One,cursive', fontSize:30,
                    color:modC, textShadow:`0 0 18px ${modC}99`, lineHeight:1,
                  }}>{isPos?'+':''}{modifier}</div>
                  <div style={{
                    fontFamily:'Orbitron,monospace', fontSize:12, letterSpacing:'.1em',
                    color:'rgba(255,255,255,.25)', marginTop:3,
                  }}>TODOS ATTRS</div>
                </div>
              </div>
            );
          };

          return (
            <div style={{ display:'flex', flexDirection:'column', gap:18, animation:'up-entry .4s ease both' }}>

              {/* ── ARENAS FAVORITAS ── */}
              <div>
                <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
                  <div className="up-label" style={{ color:'#ffd700', marginBottom:0, fontSize:16 }}>⭐ ARENAS FAVORITAS</div>
                  <div style={{ flex:1, height:1, background:'linear-gradient(90deg,rgba(255,215,0,.45),transparent)' }} />
                  <div style={{ fontFamily:'Orbitron,monospace', fontSize:12, color:'rgba(255,215,0,.4)', letterSpacing:'.14em' }}>BÔNUS POR ROUND</div>
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
                  {prefs.fav.map((arenaKey, i) => (
                    <ArenaCard key={arenaKey} arenaKey={arenaKey} rank={i} modifier={FAV_BONUS[i]} isFav={true} />
                  ))}
                </div>
              </div>

              {/* ── Divider ── */}
              <div style={{ display:'flex', alignItems:'center', gap:14 }}>
                <div style={{ flex:1, height:1, background:'linear-gradient(90deg,transparent,rgba(255,255,255,.1),transparent)' }} />
                <div style={{ fontFamily:'Orbitron,monospace', fontSize:15, letterSpacing:'.3em', color:'rgba(255,255,255,.18)' }}>VS</div>
                <div style={{ flex:1, height:1, background:'linear-gradient(90deg,transparent,rgba(255,255,255,.1),transparent)' }} />
              </div>

              {/* ── ARENAS QUE ODEIA ── */}
              <div>
                <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
                  <div className="up-label" style={{ color:'#ef4444', marginBottom:0, fontSize:16 }}>💀 ARENAS QUE ODEIA</div>
                  <div style={{ flex:1, height:1, background:'linear-gradient(90deg,rgba(239,68,68,.45),transparent)' }} />
                  <div style={{ fontFamily:'Orbitron,monospace', fontSize:12, color:'rgba(239,68,68,.4)', letterSpacing:'.14em' }}>PENALIDADE POR ROUND</div>
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
                  {prefs.hate.map((arenaKey, i) => (
                    <ArenaCard key={arenaKey} arenaKey={arenaKey} rank={i} modifier={HATE_BONUS[i]} isFav={false} />
                  ))}
                </div>
              </div>

              {/* ── Info box ── */}
              <div style={{
                padding:'14px 18px',
                background:'rgba(255,255,255,.025)',
                border:'1px solid rgba(255,255,255,.07)',
                clipPath:'polygon(6px 0%,100% 0%,calc(100% - 6px) 100%,0% 100%)',
              }}>
                <div style={{ fontFamily:'Orbitron,monospace', fontSize:13, letterSpacing:'.18em', color:'rgba(255,215,0,.5)', marginBottom:6 }}>ℹ️ COMO FUNCIONA</div>
                <div style={{ fontFamily:'Rajdhani,sans-serif', fontSize:17, color:'rgba(255,255,255,.5)', lineHeight:1.6 }}>
                  Os bônus e penalidades se aplicam a <span style={{color:'rgba(255,215,0,.85)',fontWeight:700}}>todos os atributos</span> apenas durante os rounds
                  disputados naquela arena específica. As preferências são <span style={{color:pColor,fontWeight:700}}>fixas para toda a carreira</span> e
                  refletem a personalidade e mentalidade de{' '}
                  <span style={{color:'rgba(255,255,255,.85)',fontWeight:700}}>{shortName}</span> como{' '}
                  <span style={{color:pColor,fontWeight:700}}>{(player.mentality || 'ALL_ROUNDER').replace(/_/g,' ')}</span>.
                </div>
              </div>

              {/* ── PERFORMANCE POR ARENA ── */}
              {playerHistory && playerHistory.statsByArena && playerHistory.statsByArena.size > 0 && (
                <div>
                  <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
                    <div className="up-label" style={{ marginBottom:0, color:'rgba(255,215,0,.65)', fontSize:16 }}>📊 PERFORMANCE POR ARENA</div>
                    <div style={{ flex:1, height:1, background:'linear-gradient(90deg,rgba(255,215,0,.2),transparent)' }} />
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                    {Array.from(playerHistory.statsByArena.entries()).map(([arena, as]) => {
                      const total    = as.wins + as.losses;
                      const wr       = total > 0 ? ((as.wins / total) * 100).toFixed(1) : '0.0';
                      const wc       = parseFloat(wr) >= 60 ? '#22c55e' : parseFloat(wr) >= 40 ? '#f59e0b' : '#ef4444';
                      const favIdx   = prefs.fav.indexOf(arena);
                      const hateIdx  = prefs.hate.indexOf(arena);
                      const isFavA   = favIdx  >= 0;
                      const isHateA  = hateIdx >= 0;
                      const bonus    = isFavA ? FAV_BONUS[favIdx] : isHateA ? HATE_BONUS[hateIdx] : null;
                      const aInfo    = ARENA_DISPLAY[arena];
                      return (
                        <div key={arena} className="up-arena" style={{
                          borderColor: isFavA ? 'rgba(255,215,0,.25)' : isHateA ? 'rgba(239,68,68,.2)' : undefined,
                          background:  isFavA ? 'rgba(255,215,0,.035)' : isHateA ? 'rgba(239,68,68,.03)' : undefined,
                        }}>
                          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                              {aInfo && <span style={{fontSize:18}}>{aInfo.emoji}</span>}
                              <div style={{ fontFamily:'Rajdhani,sans-serif', fontWeight:700, fontSize:20, color:'rgba(255,255,255,.9)' }}>
                                {aInfo?.name || arena}
                              </div>
                              {bonus !== null && (
                                <div style={{
                                  fontFamily:'Orbitron,monospace', fontSize:12, letterSpacing:'.1em',
                                  padding:'2px 8px',
                                  border:`1px solid ${bonus > 0 ? 'rgba(34,197,94,.4)' : 'rgba(239,68,68,.4)'}`,
                                  color: bonus > 0 ? '#4ade80' : '#f87171',
                                  background: bonus > 0 ? 'rgba(34,197,94,.08)' : 'rgba(239,68,68,.08)',
                                  clipPath:'polygon(3px 0%,100% 0%,calc(100% - 3px) 100%,0% 100%)',
                                }}>{bonus > 0 ? '+' : ''}{bonus} ATTRS</div>
                              )}
                            </div>
                            <div style={{ fontFamily:'Black Ops One,cursive', fontSize:22, color:wc, textShadow:`0 0 12px ${wc}66` }}>{wr}%</div>
                          </div>
                          <div className="up-fbar" style={{ marginBottom:8 }}>
                            <div className="up-ffill" style={{ width:`${wr}%`, background:`linear-gradient(90deg,${wc}55,${wc})` }} />
                          </div>
                          <div style={{ display:'flex', gap:14 }}>
                            {[{l:'VITÓRIAS',v:as.wins,c:'#22c55e'},{l:'DERROTAS',v:as.losses,c:'#ef4444'},{l:'TOTAL',v:total,c:'rgba(255,255,255,.45)'}].map(s => (
                              <span key={s.l} style={{ fontFamily:'Orbitron,monospace', fontSize:13, color:'rgba(255,255,255,.3)' }}>
                                {s.l}: <span style={{ color:s.c, fontSize:17, fontWeight:700 }}>{s.v}</span>
                              </span>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

            </div>
          );
        })()}

        {/* ─── 6: FORMA ─── */}
        {/* ─── 6: FORMA ─── */}
        {activeTab === 6 && (
          <div style={{ display:'flex', flexDirection:'column', gap:20, animation:'up-entry .4s ease both' }}>
            {formData ? (
              <>
                {/* ESTADO ATUAL DE FORMA */}
                <div>
                  <div className="up-label">ESTADO ATUAL</div>
                  <div className="up-card" style={{ 
                    padding:'32px 24px', 
                    background:`linear-gradient(135deg, ${formData.color}11 0%, rgba(0,0,0,0.3) 100%)`,
                    borderColor:`${formData.color}40`
                  }}>
                    <div style={{ display:'flex', alignItems:'center', gap:24, marginBottom:20 }}>
                      <div style={{ 
                        fontSize:72, 
                        lineHeight:1,
                        filter:`drop-shadow(0 0 20px ${formData.color}88)`
                      }}>
                        {formData.icon}
                      </div>
                      <div style={{ flex:1 }}>
                        <div style={{ 
                          fontFamily:'Black Ops One,cursive', 
                          fontSize:28, 
                          color:formData.color,
                          textShadow:`0 0 20px ${formData.color}88`,
                          marginBottom:4,
                          letterSpacing:'0.05em'
                        }}>
                          {formData.state.replace(/_/g, ' ')}
                        </div>
                        <div style={{ 
                          fontFamily:'Orbitron,monospace', 
                          fontSize:16, 
                          letterSpacing:'.25em',
                          color:'rgba(255,255,255,.4)'
                        }}>
                          {formData.buff > 0 ? `+${(formData.buff * 100).toFixed(0)}%` : 
                           formData.buff < 0 ? `${(formData.buff * 100).toFixed(0)}%` : '0%'} STATS
                        </div>
                      </div>
                      <div style={{ textAlign:'right' }}>
                        <div style={{ 
                          fontFamily:'Black Ops One,cursive', 
                          fontSize:52, 
                          color:formData.color,
                          textShadow:`0 0 25px ${formData.color}99`,
                          lineHeight:1
                        }}>
                          {Math.round(formData.forma)}
                        </div>
                        <div style={{ 
                          fontFamily:'Orbitron,monospace', 
                          fontSize:14, 
                          letterSpacing:'.2em',
                          color:'rgba(255,255,255,.3)',
                          marginTop:4
                        }}>
                          FORMA
                        </div>
                      </div>
                    </div>
                    
                    {/* Barra de progresso */}
                    <div style={{ 
                      height:8, 
                      background:'rgba(0,0,0,.4)', 
                      borderRadius:99, 
                      overflow:'hidden',
                      border:'1px solid rgba(255,255,255,.05)'
                    }}>
                      <div style={{ 
                        width:`${formData.forma}%`, 
                        height:'100%',
                        background:`linear-gradient(90deg, ${formData.color}88, ${formData.color})`,
                        boxShadow:`0 0 10px ${formData.color}66`,
                        transition:'width 0.5s ease',
                        animation:'bar-grow .7s ease both'
                      }} />
                    </div>
                    
                    {/* Tendência */}
                    {formData.trend && (
                      <div style={{ 
                        marginTop:16, 
                        display:'flex', 
                        alignItems:'center', 
                        gap:8,
                        fontFamily:'Orbitron,monospace',
                        fontSize:15,
                        letterSpacing:'.2em',
                        color:'rgba(255,255,255,.45)'
                      }}>
                        <span>TENDÊNCIA:</span>
                        <span style={{ 
                          color: formData.trend === 'rising' ? '#22c55e' : 
                                 formData.trend === 'falling' ? '#ef4444' : '#94a3b8'
                        }}>
                          {formData.trend === 'rising' ? '📈 SUBINDO' : 
                           formData.trend === 'falling' ? '📉 CAINDO' : '➡️ ESTÁVEL'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* TODOS OS ESTADOS DE FORMA */}
                <div>
                  <div className="up-label">TODOS OS ESTADOS</div>
                  <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                    {[
                      { name: 'ON FIRE', range: '90-100', buff: '+20%', icon: '🔥', color: '#ff4500', active: formData.forma >= 90 },
                      { name: 'HOT STREAK', range: '75-89', buff: '+13%', icon: '⚡', color: '#ff8c00', active: formData.forma >= 75 && formData.forma < 90 },
                      { name: 'IN FORM', range: '60-74', buff: '+8%', icon: '✨', color: '#ffd700', active: formData.forma >= 60 && formData.forma < 75 },
                      { name: 'NEUTRAL', range: '40-59', buff: '0%', icon: '➖', color: '#808080', active: formData.forma >= 40 && formData.forma < 60 },
                      { name: 'STRUGGLING', range: '25-39', buff: '-5%', icon: '📉', color: '#4169e1', active: formData.forma >= 25 && formData.forma < 40 },
                      { name: 'SLUMP', range: '10-24', buff: '-8%', icon: '💔', color: '#8b0000', active: formData.forma >= 10 && formData.forma < 25 },
                      { name: 'ROCK BOTTOM', range: '0-9', buff: '-12%', icon: '🌊', color: '#000080', active: formData.forma < 10 }
                    ].map((state, idx) => (
                      <div 
                        key={idx}
                        className="up-card"
                        style={{ 
                          padding:'16px 20px',
                          background: state.active ? `linear-gradient(135deg, ${state.color}15 0%, rgba(0,0,0,0.3) 100%)` : 'rgba(0,0,0,.2)',
                          borderColor: state.active ? `${state.color}50` : 'rgba(255,255,255,.05)',
                          opacity: state.active ? 1 : 0.5,
                          transform: state.active ? 'scale(1.02)' : 'scale(1)',
                          transition:'all .2s ease'
                        }}
                      >
                        <div style={{ display:'flex', alignItems:'center', gap:16 }}>
                          <div style={{ 
                            fontSize:32, 
                            lineHeight:1,
                            filter: state.active ? `drop-shadow(0 0 12px ${state.color}88)` : 'none'
                          }}>
                            {state.icon}
                          </div>
                          <div style={{ flex:1 }}>
                            <div style={{ 
                              fontFamily:'Black Ops One,cursive', 
                              fontSize:20, 
                              color: state.active ? state.color : 'rgba(255,255,255,.3)',
                              marginBottom:2,
                              letterSpacing:'0.05em',
                              textShadow: state.active ? `0 0 10px ${state.color}66` : 'none'
                            }}>
                              {state.name}
                            </div>
                            <div style={{ 
                              fontFamily:'Orbitron,monospace', 
                              fontSize:14, 
                              letterSpacing:'.18em',
                              color:'rgba(255,255,255,.35)'
                            }}>
                              Forma {state.range}
                            </div>
                          </div>
                          <div style={{ 
                            fontFamily:'Black Ops One,cursive', 
                            fontSize:22, 
                            color: state.active ? state.color : 'rgba(255,255,255,.2)',
                            textShadow: state.active ? `0 0 15px ${state.color}88` : 'none'
                          }}>
                            {state.buff}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* RESULTADOS RECENTES */}
                {formData.recentResults && formData.recentResults.length > 0 && (
                  <div>
                    <div className="up-label">RESULTADOS RECENTES</div>
                    <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                      {formData.recentResults.map((result, idx) => {
                        const isPositive = result.formaChange > 0;
                        const placementNames = {
                          '1st': '🥇 Campeão',
                          '2nd': '🥈 Vice',
                          'SF': '🥉 Semifinal',
                          'QF': '📍 Quartas',
                          'R16': '📍 Oitavas',
                          'R32': '📍 Round 1',
                          'DNQ': '❌ Não Classificou'
                        };
                        
                        return (
                          <div 
                            key={idx}
                            className="up-card"
                            style={{ 
                              padding:'12px 16px',
                              background:`linear-gradient(135deg, ${isPositive ? '#22c55e' : '#ef4444'}08 0%, rgba(0,0,0,0.2) 100%)`,
                              borderColor:`${isPositive ? '#22c55e' : '#ef4444'}20`
                            }}
                          >
                            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                              <div>
                                <div style={{ 
                                  fontFamily:'Rajdhani,sans-serif', 
                                  fontSize:18, 
                                  fontWeight:600,
                                  color:'rgba(255,255,255,.8)',
                                  marginBottom:2
                                }}>
                                  {placementNames[result.placement] || result.placement}
                                </div>
                                <div style={{ 
                                  fontFamily:'Orbitron,monospace', 
                                  fontSize:13, 
                                  letterSpacing:'.15em',
                                  color:'rgba(255,255,255,.3)',
                                  textTransform:'uppercase'
                                }}>
                                  {result.tournamentType} • {new Date(result.timestamp).toLocaleDateString('pt-BR', {day:'2-digit', month:'short'})}
                                </div>
                              </div>
                              <div style={{ 
                                fontFamily:'Black Ops One,cursive', 
                                fontSize:20, 
                                color: isPositive ? '#22c55e' : '#ef4444',
                                textShadow:`0 0 10px ${isPositive ? '#22c55e' : '#ef4444'}66`
                              }}>
                                {isPositive ? '+' : ''}{result.formaChange.toFixed(1)}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

              </>
            ) : <Empty msg="INICIE O UNIVERSE MODE PARA VER FORMA ATUAL" />}
          </div>
        )}

        {/* ─── 7: SOCIAL ─── */}
        {activeTab === 7 && (
          <div style={{ display:'flex', flexDirection:'column', gap:12, animation:'up-entry .4s ease both' }}>
            {trendingTopics.length > 0 && (
              <>
                <div className="up-label">🔥 TRENDING</div>
                <div className="up-card" style={{ padding:'14px 16px' }}>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                    {trendingTopics.slice(0,8).map((t,i) => (
                      <div key={i} style={{ fontFamily:'Orbitron,monospace', fontSize:13, letterSpacing:'.1em', padding:'3px 10px', border:`1px solid ${pColor}44`, color:`${pColor}cc`, clipPath:'polygon(4px 0%,100% 0%,calc(100% - 4px) 100%,0% 100%)' }}>#{t.topic}</div>
                    ))}
                  </div>
                </div>
              </>
            )}
            {playerTweets.length > 0 ? (
              <div className="up-scroll" style={{ maxHeight:520, overflowY:'auto', display:'flex', flexDirection:'column', gap:6 }}>
                {playerTweets.map((tw,i) => {
                  const sc = {positive:'#22c55e',respectful:'#60a5fa',analytical:'#a855f7',excited:'#ffd700',shocked:'#ef4444',news:'#94a3b8'}[tw.sentiment]||'#94a3b8';
                  return (
                    <div key={i} className="up-tweet" style={{ borderColor:`${sc}28` }}>
                      <div style={{ display:'flex', gap:10, marginBottom:8, alignItems:'flex-start' }}>
                        <div style={{ width:36,height:36,borderRadius:'50%',background:`linear-gradient(135deg,${pColor}44,rgba(0,0,0,.4))`,border:`1px solid ${pColor}44`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>
                          <span style={{ fontFamily:'Black Ops One,cursive', fontSize:18, color:pColor }}>{tw.author?.[0]||'?'}</span>
                        </div>
                        <div style={{ flex:1 }}>
                          <div style={{ display:'flex', gap:7, alignItems:'center', flexWrap:'wrap', marginBottom:1 }}>
                            <span style={{ fontFamily:'Rajdhani,sans-serif', fontWeight:700, fontSize:18, color:'rgba(255,255,255,.88)' }}>{tw.author}</span>
                            {(tw.type==='ANALYST_HOTTAKE'||tw.type==='ANALYST_PREDICTION') &&
                              <span style={{ fontFamily:'Orbitron,monospace', fontSize:12, letterSpacing:'.1em', padding:'1px 6px', border:'1px solid rgba(168,85,247,.5)', color:'#a855f7', clipPath:'polygon(3px 0%,100% 0%,calc(100% - 3px) 100%,0% 100%)' }}>ANALYST</span>}
                            {tw.type==='HEADLINE' &&
                              <span style={{ fontFamily:'Orbitron,monospace', fontSize:12, letterSpacing:'.1em', padding:'1px 6px', border:'1px solid rgba(239,68,68,.5)', color:'#ef4444', clipPath:'polygon(3px 0%,100% 0%,calc(100% - 3px) 100%,0% 100%)' }}>NEWS</span>}
                            <span style={{ fontFamily:'Orbitron,monospace', fontSize:12, color:'rgba(255,255,255,.2)', marginLeft:'auto' }}>
                              {new Date(tw.timestamp).toLocaleDateString('pt-BR',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})}
                            </span>
                          </div>
                          <span style={{ fontFamily:'Rajdhani,sans-serif', fontSize:16, color:'rgba(255,255,255,.3)' }}>{tw.handle}</span>
                        </div>
                      </div>
                      <p style={{ fontFamily:'Rajdhani,sans-serif', fontSize:18, color:'rgba(255,255,255,.78)', lineHeight:1.5, marginBottom:10 }}>{tw.content}</p>
                      <div style={{ display:'flex', gap:14 }}>
                        {[{e:'❤',v:fmtNum(tw.likes),c:'rgba(239,68,68,.7)'},{e:'🔄',v:fmtNum(tw.retweets),c:'rgba(34,197,94,.7)'},{e:'💬',v:fmtNum(tw.replies),c:'rgba(96,165,250,.7)'}].map(m=>(
                          <span key={m.e} style={{ display:'flex', gap:4, alignItems:'center' }}>
                            <span style={{ fontSize:16 }}>{m.e}</span>
                            <span style={{ fontFamily:'Orbitron,monospace', fontSize:14, fontWeight:700, color:m.c }}>{m.v}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : <Empty msg={isDynamic?'NENHUM TWEET AINDA. JOGUE TORNEIOS PARA GERAR BUZZ!':'INICIE O UNIVERSE MODE'} />}
          </div>
        )}

        {/* ─── 9: DADOS ─── */}
        {activeTab === 9 && (() => {
          // Calcular dados derivados de tournamentHistory
          const th = playerHistory?.tournamentHistory || [];
          const qfReached  = th.filter(t => ['QF','SF','F','CHAMPION'].includes(t.eliminatedRound) || t.position <= 8).length;
          const sfReached  = th.filter(t => ['SF','F','CHAMPION'].includes(t.eliminatedRound) || t.position <= 4).length;
          const fReached   = th.filter(t => ['F','CHAMPION'].includes(t.eliminatedRound) || t.position <= 2).length;
          const titlesWon  = th.filter(t => t.eliminatedRound === 'CHAMPION').length || playerHistory?.titles?.total || 0;
          const kingsCourtPlayed = th.filter(t => t.tier === 'KINGS_COURT').length;
          const premierPlayed    = th.filter(t => t.tier === 'PREMIER').length;
          const tournamentsPlayed = th.length;
          const winRate = playerHistory?.totalMatches > 0
            ? ((playerHistory.wins / playerHistory.totalMatches) * 100).toFixed(1) : '0.0';
          const roundWinRate = (playerHistory?.roundWins || 0) + (playerHistory?.roundLosses || 0) > 0
            ? (((playerHistory?.roundWins || 0) / ((playerHistory?.roundWins || 0) + (playerHistory?.roundLosses || 0))) * 100).toFixed(1) : '0.0';

          return (
            <div style={{ display:'flex', flexDirection:'column', gap:14, animation:'up-entry .4s ease both' }}>
              {playerHistory ? (
                <>
                  {/* ─── STREAKS ─── */}
                  <div className="up-label">🔥 SEQUÊNCIAS</div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                    {[
                      { l:'MAIOR SEQUÊNCIA DE VITÓRIAS', v: playerHistory.bestWinStreak  || 0, c:'#22c55e', icon:'🔥' },
                      { l:'MAIOR SEQUÊNCIA DE DERROTAS', v: playerHistory.bestLossStreak || 0, c:'#ef4444', icon:'💀' },
                      { l:'SEQ. ATUAL DE VITÓRIAS',      v: playerHistory.winStreak      || 0, c:'#4ade80', icon:'⚡' },
                      { l:'SEQ. ATUAL DE DERROTAS',      v: playerHistory.lossStreak     || 0, c:'#f87171', icon:'❄️' },
                    ].map(s => (
                      <div key={s.l} className="up-card" style={{ padding:'16px', textAlign:'center', background:`${s.c}08`, borderColor:`${s.c}25` }}>
                        <div style={{ fontSize:22, marginBottom:6 }}>{s.icon}</div>
                        <div style={{ fontFamily:'Black Ops One,cursive', fontSize:50, color:s.c, lineHeight:1, textShadow:`0 0 20px ${s.c}77` }}>{s.v}</div>
                        <div style={{ fontFamily:'Orbitron,monospace', fontSize:11, letterSpacing:'.12em', color:'rgba(255,255,255,.35)', marginTop:6 }}>{s.l}</div>
                      </div>
                    ))}
                  </div>

                  {/* ─── PERCURSO EM TORNEIOS ─── */}
                  <div className="up-label">🏟️ PERCURSO EM TORNEIOS</div>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8 }}>
                    {[
                      { l:'QUARTAS',   sub:'QF alcançadas',  v: qfReached,        c:'#60a5fa', icon:'⚔️' },
                      { l:'SEMIS',     sub:'SF alcançadas',   v: sfReached,        c:'#c084fc', icon:'🛡️' },
                      { l:'FINAIS',    sub:'Finals alcançadas',v: fReached,         c:'#f59e0b', icon:'🥈' },
                      { l:'TÍTULOS',   sub:'Campeonatos',     v: titlesWon,        c:'#ffd700', icon:'🏆' },
                    ].map(s => (
                      <div key={s.l} className="up-card" style={{ padding:'14px 8px', textAlign:'center', background:`${s.c}08`, borderColor:`${s.c}25` }}>
                        <div style={{ fontSize:20, marginBottom:4 }}>{s.icon}</div>
                        <div style={{ fontFamily:'Black Ops One,cursive', fontSize:42, color:s.c, lineHeight:1 }}>{s.v}</div>
                        <div style={{ fontFamily:'Orbitron,monospace', fontSize:12, fontWeight:700, letterSpacing:'.1em', color:s.c, opacity:.8, marginTop:4 }}>{s.l}</div>
                        <div style={{ fontFamily:'Orbitron,monospace', fontSize:11, color:'rgba(255,255,255,.28)', marginTop:2 }}>{s.sub}</div>
                      </div>
                    ))}
                  </div>

                  {/* ─── EFICIÊNCIA ─── */}
                  <div className="up-label">📊 EFICIÊNCIA</div>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>
                    {[
                      { l:'WIN RATE',        v:`${winRate}%`,   c:'#22c55e', sub:`${playerHistory.wins||0}W / ${playerHistory.losses||0}L` },
                      { l:'ROUND WIN RATE',  v:`${roundWinRate}%`, c:'#60a5fa', sub:`${playerHistory.roundWins||0}R / ${playerHistory.roundLosses||0}R` },
                      { l:'TORNEIOS',        v: tournamentsPlayed, c:'#c084fc', sub:'participações' },
                    ].map(s => (
                      <div key={s.l} className="up-card" style={{ padding:'16px', textAlign:'center' }}>
                        <div style={{ fontFamily:'Orbitron,monospace', fontSize:12, letterSpacing:'.2em', color:'rgba(255,255,255,.3)', marginBottom:8 }}>{s.l}</div>
                        <div style={{ fontFamily:'Black Ops One,cursive', fontSize:28, color:s.c, lineHeight:1, textShadow:`0 0 14px ${s.c}55` }}>{s.v}</div>
                        <div style={{ fontFamily:'Orbitron,monospace', fontSize:12, color:'rgba(255,255,255,.28)', marginTop:6 }}>{s.sub}</div>
                      </div>
                    ))}
                  </div>

                  {/* ─── PRESENÇA EM TIERS ─── */}
                  <div className="up-label">🎖️ PRESENÇA POR NÍVEL</div>
                  <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                    {[
                      { l:'Kings Court',  v: kingsCourtPlayed, total: tournamentsPlayed, c:'#ffd700' },
                      { l:'Premier',      v: premierPlayed,    total: tournamentsPlayed, c:'#f87171' },
                      { l:'Masters',      v: th.filter(t=>t.tier==='MASTERS').length,     total: tournamentsPlayed, c:'#c084fc' },
                      { l:'Challenger',   v: th.filter(t=>t.tier==='CHALLENGER').length,  total: tournamentsPlayed, c:'#60a5fa' },
                      { l:'Redemption',   v: th.filter(t=>t.tier==='REDEMPTION').length,  total: tournamentsPlayed, c:'#34d399' },
                    ].filter(s => s.v > 0).map(s => (
                      <div key={s.l} className="up-card" style={{ padding:'10px 14px' }}>
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
                          <div style={{ fontFamily:'Orbitron,monospace', fontSize:13, letterSpacing:'.1em', color:s.c }}>{s.l}</div>
                          <div style={{ fontFamily:'Black Ops One,cursive', fontSize:20, color:s.c }}>{s.v}</div>
                        </div>
                        <div className="up-fbar" style={{ height:5 }}>
                          <div className="up-ffill" style={{ width:`${s.total > 0 ? Math.min((s.v/s.total)*100,100) : 0}%`, background:`linear-gradient(90deg,${s.c}77,${s.c})` }} />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* ─── MÉTODOS DE FIM DE ROUND ─── */}
                  <div className="up-label">💥 MÉTODOS DE VITÓRIA</div>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>
                    {[
                      {l:'SPIN FINISH',  v:playerHistory.winsBySpin   ||0, c:'#60a5fa'},
                      {l:'BURST FINISH', v:playerHistory.winsByBurst  ||0, c:'#ef4444'},
                      {l:'RING OUT',     v:playerHistory.winsByRingOut||0, c:'#f59e0b'},
                    ].map(s => (
                      <div key={s.l} className="up-card" style={{ padding:'16px', textAlign:'center' }}>
                        <div style={{ fontFamily:'Orbitron,monospace', fontSize:12, letterSpacing:'.15em', color:'rgba(255,255,255,.3)', marginBottom:8 }}>{s.l}</div>
                        <div style={{ fontFamily:'Black Ops One,cursive', fontSize:38, color:s.c, lineHeight:1, textShadow:`0 0 16px ${s.c}66` }}>{s.v}</div>
                      </div>
                    ))}
                  </div>
                </>
              ) : <Empty msg={isDynamic ? `${shortName} AINDA NÃO TEM DADOS SUFICIENTES` : 'INICIE O UNIVERSE MODE PARA DESBLOQUEAR DADOS'} />}
            </div>
          );
        })()}

        {/* ─────────────── LAUNCHES TAB ─────────────── */}
        {activeTab === 'launches' && (() => {
          // ── Collect aggregate stats + per-tournament timeline ──
          const launchMap = new Map();       // tech → { uses, wins, losses }
          const tourneyLog = [];             // [{label, season, rounds:[{tech,won}]}]

          if (isDynamic && universeManager?.matchHistory) {
            universeManager.matchHistory.forEach(match => {
              const isP1 = match.player1Id === playerId;
              const isP2 = match.player2Id === playerId;
              if (!isP1 && !isP2) return;

              // Per-tourney log entry
              const roundEntries = [];
              (match.rounds || []).forEach(round => {
                const tech     = isP1 ? (round.launch1 || 'STANDARD') : (round.launch2 || 'STANDARD');
                const wonRound = round.winner === playerId;
                roundEntries.push({ tech, won: wonRound });

                if (!launchMap.has(tech)) launchMap.set(tech, { uses:0, wins:0, losses:0 });
                const d = launchMap.get(tech);
                d.uses++;
                wonRound ? d.wins++ : d.losses++;
              });

              if (roundEntries.length > 0) {
                tourneyLog.push({
                  label:   match.tournament || 'Torneio',
                  tier:    match.tier || '',
                  season:  match.season || '?',
                  rounds:  roundEntries,
                });
              }
            });
          }

          const launchData = Array.from(launchMap.entries())
            .map(([tech, d]) => ({
              tech,
              cfg: LAUNCH_TECHNIQUES[tech] || { name: tech, icon:'⚪', color:'#94a3b8', desc:'Técnica desconhecida' },
              ...d,
              winRate: d.uses > 0 ? d.wins / d.uses : 0
            }))
            .sort((a,b) => b.uses - a.uses);

          const totalUses  = launchData.reduce((s,l) => s + l.uses, 0);
          const topTech    = launchData[0];
          const bestTech   = [...launchData].sort((a,b) => b.winRate - a.winRate).find(l => l.uses >= 3) || launchData[0];

          const perfColor = (wr) => {
            if (wr >= 0.58) return '#22c55e';
            if (wr >= 0.52) return '#ffd700';
            if (wr >= 0.48) return '#f97316';
            return '#ef4444';
          };

          // Tier colors
          const tierColor = { KINGS_COURT:'#ffd700', PREMIER:'#c084fc', MASTERS:'#60a5fa', CHALLENGER:'#34d399', REDEMPTION:'#94a3b8' };

          return (
            <div style={{ display:'flex', flexDirection:'column', gap:22, animation:'up-entry .4s ease both' }}>
              {launchData.length === 0 ? (
                <div style={{ textAlign:'center', padding:'60px 0', color:'rgba(255,255,255,0.25)' }}>
                  <div style={{ fontSize:48, marginBottom:12 }}>🚀</div>
                  <div style={{ fontFamily:'Orbitron,monospace', fontSize:17, letterSpacing:'.2em' }}>SEM DADOS DE LANÇAMENTO</div>
                  <div style={{ fontSize:16, marginTop:8 }}>Simule torneios para coletar estatísticas</div>
                </div>
              ) : (<>

                {/* ── HEADER SUMMARY CARDS ── */}
                <div>
                  <div className="up-label">🚀 RESUMO DE CARREIRA</div>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10 }}>
                    {[
                      { label:'LANÇAMENTOS TOTAIS', value: String(totalUses),
                        sub: `${launchData.length} técnicas distintas usadas`, color: pColor },
                      { label:'TÉCNICA FAVORITA',
                        value: (topTech?.cfg.icon || '') + ' ' + (topTech?.cfg.name || '—'),
                        sub: `${topTech?.uses || 0} usos · ${totalUses > 0 ? ((topTech?.uses/totalUses)*100).toFixed(0) : 0}% das rodadas`, color:'#a78bfa' },
                      { label:'MELHOR WIN RATE',
                        value: (bestTech?.cfg.icon || '') + ' ' + (bestTech?.cfg.name || '—'),
                        sub: `${bestTech ? (bestTech.winRate*100).toFixed(1) : 0}% win rate (≥3 usos)`, color:'#22c55e' },
                    ].map((c,i) => (
                      <div key={i} className="up-card" style={{ padding:'14px 16px' }}>
                        <div style={{ fontSize:14, color:'rgba(255,255,255,0.35)', fontFamily:'Orbitron,monospace', letterSpacing:'.15em', marginBottom:8 }}>{c.label}</div>
                        <div style={{ fontSize:17, fontWeight:700, fontFamily:'Orbitron,monospace', color:c.color, lineHeight:1.3, marginBottom:4 }}>{c.value}</div>
                        <div style={{ fontSize:14, color:'rgba(255,255,255,0.3)' }}>{c.sub}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* ── LAUNCH TECHNIQUE LIST ── */}
                <div>
                  <div className="up-label">📊 TÉCNICAS — WIN/LOSS DETALHADO</div>
                  <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                    {launchData.map((lt, idx) => {
                      const winPct  = lt.uses > 0 ? (lt.wins  / lt.uses * 100) : 0;
                      const lossPct = lt.uses > 0 ? (lt.losses/ lt.uses * 100) : 0;
                      const usePct  = totalUses > 0 ? (lt.uses / totalUses * 100) : 0;
                      const pc      = perfColor(lt.winRate);
                      const isTop   = idx === 0;
                      const isBest  = lt === bestTech && lt.uses >= 3;

                      return (
                        <div key={lt.tech} style={{
                          position:'relative', overflow:'hidden',
                          background:'rgba(255,255,255,0.025)',
                          border:`1px solid ${isTop ? lt.cfg.color+'50' : 'rgba(255,255,255,0.07)'}`,
                          borderLeft:`3px solid ${lt.cfg.color}`,
                          borderRadius:6, padding:'14px 18px',
                        }}>
                          <div style={{ position:'absolute', inset:0, background:`linear-gradient(90deg,${lt.cfg.color}07 0%,transparent 55%)`, pointerEvents:'none' }}/>

                          {/* Badges */}
                          <div style={{ position:'absolute', top:10, right:14, display:'flex', gap:5, alignItems:'center' }}>
                            {isTop && <span style={{ fontSize:13, fontFamily:'Orbitron,monospace', color:lt.cfg.color, border:`1px solid ${lt.cfg.color}50`, padding:'2px 6px', letterSpacing:'.1em' }}>FAVORITA</span>}
                            {isBest && <span style={{ fontSize:13, fontFamily:'Orbitron,monospace', color:'#22c55e', border:'1px solid rgba(34,197,94,0.4)', padding:'2px 6px', letterSpacing:'.1em' }}>MELHOR %</span>}
                            <span style={{ fontSize:15, color:'rgba(255,255,255,0.2)', fontFamily:'Orbitron,monospace' }}>#{idx+1}</span>
                          </div>

                          <div style={{ position:'relative', display:'grid', gridTemplateColumns:'auto 1fr auto', gap:14, alignItems:'center' }}>
                            {/* Icon + Name */}
                            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                              <div style={{ width:46, height:46, fontSize:24, display:'flex', alignItems:'center', justifyContent:'center',
                                background:`${lt.cfg.color}12`, borderRadius:8, border:`1px solid ${lt.cfg.color}35`, flexShrink:0 }}>{lt.cfg.icon}</div>
                              <div>
                                <div style={{ fontFamily:'Orbitron,monospace', fontSize:17, fontWeight:700, color:'rgba(255,255,255,0.9)', letterSpacing:'.06em', marginBottom:2 }}>{lt.cfg.name}</div>
                                <div style={{ fontSize:14, color:'rgba(255,255,255,0.3)' }}>{lt.cfg.desc}</div>
                              </div>
                            </div>

                            {/* Dual W/L bar + % labels */}
                            <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
                              {/* Labels row */}
                              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:2 }}>
                                <div style={{ display:'flex', gap:14 }}>
                                  <span style={{ fontSize:16, fontWeight:700, fontFamily:'Orbitron,monospace', color:'#22c55e' }}>{winPct.toFixed(1)}% <span style={{ fontSize:13, color:'rgba(255,255,255,0.3)', fontWeight:400 }}>VIT</span></span>
                                  <span style={{ fontSize:16, fontWeight:700, fontFamily:'Orbitron,monospace', color:'#ef4444' }}>{lossPct.toFixed(1)}% <span style={{ fontSize:13, color:'rgba(255,255,255,0.3)', fontWeight:400 }}>DER</span></span>
                                </div>
                                <span style={{ fontSize:14, color:'rgba(255,255,255,0.3)', fontFamily:'Rajdhani' }}>{usePct.toFixed(1)}% das rodadas</span>
                              </div>
                              {/* Segmented bar: wins (green) + losses (red) */}
                              <div style={{ height:8, borderRadius:4, overflow:'hidden', display:'flex', background:'rgba(255,255,255,0.04)' }}>
                                <div style={{ width:`${winPct}%`, background:'linear-gradient(90deg,#22c55e,#16a34a)', transition:'width .6s ease', boxShadow:'0 0 6px #22c55e40' }}/>
                                <div style={{ width:`${lossPct}%`, background:'linear-gradient(90deg,#b91c1c,#ef4444)', transition:'width .6s ease' }}/>
                              </div>
                              {/* Usage bar below */}
                              <div style={{ height:3, borderRadius:2, overflow:'hidden', background:'rgba(255,255,255,0.04)' }}>
                                <div style={{ width:`${usePct}%`, background:`${lt.cfg.color}60`, transition:'width .6s ease' }}/>
                              </div>
                            </div>

                            {/* Stats cluster */}
                            <div style={{ display:'flex', gap:10, alignItems:'center', flexShrink:0 }}>
                              {[
                                { label:'USOS',  value: lt.uses,   color:'rgba(255,255,255,0.8)' },
                                { label:'VIT',   value: lt.wins,   color:'#22c55e' },
                                { label:'DER',   value: lt.losses, color:'#ef4444' },
                              ].map((s, si) => (
                                <React.Fragment key={s.label}>
                                  {si > 0 && <div style={{ width:1, height:28, background:'rgba(255,255,255,0.07)' }}/>}
                                  <div style={{ textAlign:'center', minWidth:34 }}>
                                    <div style={{ fontSize:14, color:'rgba(255,255,255,0.3)', fontFamily:'Rajdhani', fontWeight:600, letterSpacing:'.06em', marginBottom:2 }}>{s.label}</div>
                                    <div style={{ fontSize:20, fontWeight:700, fontFamily:'Orbitron,monospace', color:s.color }}>{s.value}</div>
                                  </div>
                                </React.Fragment>
                              ))}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* ── CAREER TIMELINE ── */}
                {tourneyLog.length > 0 && (
                  <div>
                    <div className="up-label">📅 HISTÓRICO POR TORNEIO</div>
                    <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                      {[...tourneyLog].reverse().map((entry, ei) => {
                        // Agrupar rounds por técnica
                        const techCounts = {};
                        entry.rounds.forEach(r => {
                          if (!techCounts[r.tech]) techCounts[r.tech] = { uses:0, wins:0 };
                          techCounts[r.tech].uses++;
                          if (r.won) techCounts[r.tech].wins++;
                        });
                        const techList = Object.entries(techCounts)
                          .map(([t, v]) => ({ t, ...v, cfg: LAUNCH_TECHNIQUES[t] || { icon:'⚪', color:'#94a3b8', name:t } }))
                          .sort((a,b) => b.uses - a.uses);
                        const matchWins   = entry.rounds.filter(r => r.won).length;
                        const matchLosses = entry.rounds.filter(r => !r.won).length;
                        const tc = tierColor[entry.tier] || '#94a3b8';

                        return (
                          <div key={ei} style={{
                            background:'rgba(255,255,255,0.02)',
                            border:'1px solid rgba(255,255,255,0.06)',
                            borderLeft:`3px solid ${tc}50`,
                            borderRadius:6, padding:'12px 16px',
                          }}>
                            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
                              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                                {entry.tier && (
                                  <span style={{ fontSize:13, fontFamily:'Orbitron,monospace', color:tc, border:`1px solid ${tc}40`, padding:'2px 6px', letterSpacing:'.08em' }}>
                                    {entry.tier.replace('_',' ')}
                                  </span>
                                )}
                                <span style={{ fontSize:17, fontWeight:600, color:'rgba(255,255,255,0.8)', fontFamily:'Rajdhani', letterSpacing:'.04em' }}>{entry.label}</span>
                                <span style={{ fontSize:15, color:'rgba(255,255,255,0.25)', fontFamily:'Rajdhani' }}>S{entry.season}</span>
                              </div>
                              <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                                <span style={{ fontSize:16, fontFamily:'Orbitron,monospace', color:'#22c55e', fontWeight:700 }}>{matchWins}W</span>
                                <span style={{ fontSize:15, color:'rgba(255,255,255,0.2)' }}>/</span>
                                <span style={{ fontSize:16, fontFamily:'Orbitron,monospace', color:'#ef4444', fontWeight:700 }}>{matchLosses}L</span>
                              </div>
                            </div>
                            {/* Técnicas usadas no torneio */}
                            <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                              {techList.map(tl => {
                                const wr = tl.uses > 0 ? tl.wins / tl.uses : 0;
                                const tc2 = perfColor(wr);
                                return (
                                  <div key={tl.t} style={{
                                    display:'flex', alignItems:'center', gap:5,
                                    background:'rgba(0,0,0,0.3)',
                                    border:`1px solid ${tl.cfg.color}30`,
                                    borderRadius:4, padding:'4px 8px',
                                  }}>
                                    <span style={{ fontSize:17 }}>{tl.cfg.icon}</span>
                                    <span style={{ fontSize:15, color:'rgba(255,255,255,0.6)', fontFamily:'Rajdhani', fontWeight:600 }}>{tl.cfg.name}</span>
                                    <span style={{ fontSize:15, fontFamily:'Orbitron,monospace', fontWeight:700, color:tc2 }}>{(wr*100).toFixed(0)}%</span>
                                    <span style={{ fontSize:14, color:'rgba(255,255,255,0.25)' }}>×{tl.uses}</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* ── PERFORMANCE BREAKDOWN ── */}
                <div>
                  <div className="up-label">🎯 CLASSIFICAÇÃO DE PERFORMANCE</div>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:10 }}>
                    {[
                      { label:'Técnicas Fortes (≥58%)',         color:'#22c55e',              count: launchData.filter(l=>l.winRate>=0.58 && l.uses>=3).length },
                      { label:'Técnicas Boas (52-57%)',         color:'#ffd700',              count: launchData.filter(l=>l.winRate>=0.52 && l.winRate<0.58 && l.uses>=3).length },
                      { label:'Técnicas Fracas (<48%)',         color:'#ef4444',              count: launchData.filter(l=>l.winRate<0.48 && l.uses>=3).length },
                      { label:'Poucas amostras (<3 usos)',      color:'rgba(255,255,255,0.3)',count: launchData.filter(l=>l.uses<3).length },
                    ].map(s => (
                      <div key={s.label} className="up-card" style={{ padding:'12px 16px', display:'flex', alignItems:'center', gap:14 }}>
                        <div style={{ fontSize:22, fontWeight:700, fontFamily:'Orbitron,monospace', color:s.color, minWidth:32 }}>{s.count}</div>
                        <div style={{ fontSize:15, color:'rgba(255,255,255,0.45)', lineHeight:1.4 }}>{s.label}</div>
                      </div>
                    ))}
                  </div>
                </div>

              </>)}
            </div>
          );
        })()}

        {/* ─────────────── BADGES TAB ─────────────── */}
        {activeTab === 'badges' && (() => {
          const TIER_COLORS   = { BRONZE: '#cd7f32', SILVER: '#c0c0c0', GOLD: '#ffd700', LEGENDARY: '#a855f7', MYTHIC: '#f43f5e' };
          const TIER_LABELS   = { BRONZE: 'Bronze', SILVER: 'Prata', GOLD: 'Ouro', LEGENDARY: 'Lendário', MYTHIC: 'Mítico' };
          const TIER_GLOW     = { BRONZE: '#cd7f3244', SILVER: '#c0c0c044', GOLD: '#ffd70044', LEGENDARY: '#a855f744', MYTHIC: '#f43f5e44' };
          const TIER_BG       = { BRONZE: 'rgba(205,127,50,.06)', SILVER: 'rgba(192,192,192,.06)', GOLD: 'rgba(255,215,0,.06)', LEGENDARY: 'rgba(168,85,247,.08)', MYTHIC: 'rgba(244,63,94,.08)' };
          const TIER_MEDAL    = { BRONZE: '🥉', SILVER: '🥈', GOLD: '🥇', LEGENDARY: '💜', MYTHIC: '🔴' };
          const TIER_ANIM     = { LEGENDARY: 'up-float 3s ease-in-out infinite', MYTHIC: 'ring-pulse 1.5s ease-in-out infinite' };

          // Ordem de exibição das categorias
          const CATEGORY_ORDER = ['TÍTULOS','RANKING','PERFORMANCE','ESTILO','SIGNATURE','CARREIRA'];
          const CATEGORY_ICONS = {
            'TÍTULOS':     '🏆',
            'RANKING':     '👑',
            'PERFORMANCE': '⚔️',
            'ESTILO':      '💥',
            'SIGNATURE':   '🔩',
            'CARREIRA':    '⏳',
          };
          const CATEGORY_COLORS = {
            'TÍTULOS':     '#ffd700',
            'RANKING':     '#c084fc',
            'PERFORMANCE': '#f97316',
            'ESTILO':      '#f472b6',
            'SIGNATURE':   '#00d4ff',
            'CARREIRA':    '#34d399',
          };

          // Busca achievements do jogador
          const achievementsByCategory = isDynamic && universeManager?.achievementEngine
            ? universeManager.achievementEngine.getPlayerAchievementsByCategory(playerId)
            : {};

          const totalUnlocked = Object.values(achievementsByCategory).flat().length;
          const mythicCount   = Object.values(achievementsByCategory).flat().filter(a => a.unlockedTier === 'MYTHIC').length;
          const legendaryCount= Object.values(achievementsByCategory).flat().filter(a => a.unlockedTier === 'LEGENDARY').length;
          const goldCount     = Object.values(achievementsByCategory).flat().filter(a => a.unlockedTier === 'GOLD').length;
          const silverCount   = Object.values(achievementsByCategory).flat().filter(a => a.unlockedTier === 'SILVER').length;
          const bronzeCount   = Object.values(achievementsByCategory).flat().filter(a => a.unlockedTier === 'BRONZE').length;

          return (
            <div style={{ padding:'8px 0 40px', animation:'up-entry .4s ease both' }}>

              {/* ── Sumário de topo ── */}
              <div style={{
                display:'flex', gap:12, marginBottom:28,
                background:'rgba(255,255,255,.02)', border:'1px solid rgba(255,255,255,.07)',
                borderRadius:4, padding:'14px 18px', alignItems:'center',
                clipPath:'polygon(10px 0%,100% 0%,calc(100% - 10px) 100%,0% 100%)',
              }}>
                <div style={{ flex:1 }}>
                  <div style={{ fontFamily:'Orbitron,monospace', fontSize:13, color:'rgba(255,215,0,.5)', letterSpacing:'.3em', marginBottom:4 }}>CONQUISTAS DESBLOQUEADAS</div>
                  <div style={{ fontFamily:'Black Ops One,cursive', fontSize:28, color:'#fff', lineHeight:1 }}>{totalUnlocked}</div>
                </div>
                {[['MYTHIC','🔴',mythicCount],['LEGENDARY','💜',legendaryCount],['GOLD','🥇',goldCount],['SILVER','🥈',silverCount],['BRONZE','🥉',bronzeCount]].map(([tier, medal, count]) => (
                  <div key={tier} style={{ textAlign:'center', minWidth:44 }}>
                    <div style={{ fontSize:16 }}>{medal}</div>
                    <div style={{ fontFamily:'Black Ops One,cursive', fontSize:18, color:TIER_COLORS[tier], filter:`drop-shadow(0 0 6px ${TIER_COLORS[tier]}88)`, animation: tier==='MYTHIC'?'ring-pulse 1.5s ease-in-out infinite':undefined }}>{count}</div>
                    <div style={{ fontFamily:'Orbitron,monospace', fontSize:11, color:'rgba(255,255,255,.3)', letterSpacing:'.08em' }}>{TIER_LABELS[tier].toUpperCase()}</div>
                  </div>
                ))}
              </div>

              {/* ── Se não tem nada ── */}
              {totalUnlocked === 0 && (
                <div style={{ textAlign:'center', padding:'60px 0', opacity:.4 }}>
                  <div style={{ fontSize:40, marginBottom:12 }}>🏅</div>
                  <div style={{ fontFamily:'Orbitron,monospace', fontSize:14, color:'rgba(255,255,255,.4)', letterSpacing:'.3em' }}>
                    NENHUM BADGE CONQUISTADO AINDA
                  </div>
                  <div style={{ fontFamily:'Rajdhani,sans-serif', fontSize:17, color:'rgba(255,255,255,.25)', marginTop:8 }}>
                    Simule mais temporadas para desbloquear conquistas
                  </div>
                </div>
              )}

              {/* ── Categorias ── */}
              {CATEGORY_ORDER.map(cat => {
                const badges = achievementsByCategory[cat];
                if (!badges || badges.length === 0) return null;
                const catColor = CATEGORY_COLORS[cat];
                const catIcon  = CATEGORY_ICONS[cat];
                return (
                  <div key={cat} style={{ marginBottom:28 }}>
                    {/* Category header */}
                    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14, paddingBottom:7, borderBottom:`1px solid ${catColor}28` }}>
                      <span style={{ fontSize:19 }}>{catIcon}</span>
                      <span style={{ fontFamily:'Orbitron,monospace', fontSize:13, fontWeight:700, letterSpacing:'.35em', color:`${catColor}cc` }}>{cat}</span>
                      <div style={{ flex:1, height:1, background:`linear-gradient(90deg,${catColor}22,transparent)`, marginLeft:4 }} />
                      <span style={{ fontFamily:'Orbitron,monospace', fontSize:13, color:'rgba(255,255,255,.25)' }}>{badges.length} badge{badges.length > 1 ? 's' : ''}</span>
                    </div>

                    {/* Badge grid */}
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))', gap:10 }}>
                      {badges.map(ach => {
                        const tier  = ach.unlockedTier;
                        const color = TIER_COLORS[tier];
                        const glow  = TIER_GLOW[tier];
                        const bg    = TIER_BG[tier];
                        const tierData = ach.tiers[tier];
                        return (
                          <div key={ach.id} style={{
                            background: bg,
                            border: tier === 'MYTHIC' ? `1px solid ${color}99` : tier === 'LEGENDARY' ? `1px solid ${color}77` : `1px solid ${color}55`,
                            borderTop: tier === 'MYTHIC' ? `3px solid ${color}` : `2px solid ${color}`,
                            borderRadius:4,
                            padding:'14px 12px',
                            clipPath:'polygon(8px 0%,100% 0%,calc(100% - 8px) 100%,0% 100%)',
                            display:'flex',
                            flexDirection:'column',
                            gap:8,
                            position:'relative',
                            transition:'border-color .2s',
                            boxShadow: tier === 'MYTHIC' ? `0 0 20px ${color}44, inset 0 0 30px ${color}08` : tier === 'LEGENDARY' ? `0 0 12px ${color}33` : 'none',
                            animation: TIER_ANIM[tier] || 'none',
                          }}>
                            {/* Glow corner */}
                            <div style={{ position:'absolute', top:0, right:0, width:60, height:60, background:`radial-gradient(circle at top right,${glow},transparent 70%)`, pointerEvents:'none' }} />

                            {/* Icon + tier badge */}
                            <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between' }}>
                              <span style={{ fontSize:28, filter:`drop-shadow(0 0 8px ${color}88)` }}>{ach.icon}</span>
                              <div style={{
                                background: `${color}22`,
                                border: `1px solid ${color}66`,
                                borderRadius:2,
                                padding:'2px 6px',
                                fontFamily:'Orbitron,monospace',
                                fontSize:12,
                                fontWeight:700,
                                color,
                                letterSpacing:'.15em',
                                filter:`drop-shadow(0 0 4px ${color}66)`,
                              }}>
                                {TIER_MEDAL[tier] || '🏅'} {TIER_LABELS[tier].toUpperCase()}
                              </div>
                            </div>

                            {/* Name */}
                            <div style={{ fontFamily:'Rajdhani,sans-serif', fontWeight:700, fontSize:17, color:'rgba(255,255,255,.9)', lineHeight:1.2 }}>
                              {ach.name}
                            </div>

                            {/* Tier label */}
                            <div style={{ fontFamily:'Black Ops One,cursive', fontSize:15, color, letterSpacing:'.06em', filter:`drop-shadow(0 0 6px ${color}66)` }}>
                              {tierData?.label || ''}
                            </div>

                            {/* Description */}
                            <div style={{ fontFamily:'Rajdhani,sans-serif', fontSize:15, color:'rgba(255,255,255,.4)', lineHeight:1.35, marginTop:'auto' }}>
                              {tierData?.description || ach.description}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })()}

      </div>

      {/* Floor glow */}
      <div style={{ position:'absolute', bottom:0, left:0, right:0, height:2, background:`linear-gradient(90deg,transparent,${pColor}88 30%,${pColor} 50%,${pColor}88 70%,transparent)`, boxShadow:`0 0 32px ${pColor}66`, pointerEvents:'none', zIndex:5 }} />
    </div>
  );

  if (isModal) {
    return (
      <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.88)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:50, padding:16 }} onClick={onClose}>
        <div style={{ width:'100%', maxWidth:1300, maxHeight:'95vh', overflow:'hidden', display:'flex', flexDirection:'column', border:`1px solid ${player.colors?.[0]||'#ffd700'}44`, boxShadow:`0 0 60px ${player.colors?.[0]||'#ffd700'}22` }}>
          {inner}
        </div>
      </div>
    );
  }
  return <div style={{ minHeight:'100vh' }}>{inner}</div>;
};

// ============================================
// HELPER EXPORT — BattleEngine integration
// Returns the attribute modifier (+6/+4/+2 / -6/-4/-2 / 0)
// for a given player mentality playing in a specific arena key.
// ============================================
export const ARENA_PREF_MAP = {
  ALL_ROUNDER:        { fav:['BB10_COMPETITIVE','PANGEA_PLATFORM','DOMINATION_ZONES'],   hate:['PINBALL_INFERNO','VOLCANIC_RAGE','COLOSSEUM_CARNAGE'] },
  GLASS_CANNON:       { fav:['COLOSSEUM_CARNAGE','PINBALL_INFERNO','STORM_TRACK'],       hate:['KILLER_SIDES','VORTEX_COLISEUM','DOMINATION_ZONES'] },
  IRON_FORTRESS:      { fav:['NEXUS','DOMINATION_ZONES','PANGEA_PLATFORM'],              hate:['PINBALL_INFERNO','STORM_TRACK','COLOSSEUM_CARNAGE'] },
  ETERNAL_SPINNER:    { fav:['VORTEX_COLISEUM','KILLER_SIDES','TIDAL_SURGE'],            hate:['COLOSSEUM_CARNAGE','PINBALL_INFERNO','VOLCANIC_RAGE'] },
  CALCULATED_CHAOS:   { fav:['NEXUS','COLOSSEUM_CARNAGE','DOMINATION_ZONES'],            hate:['BB10_COMPETITIVE','KILLER_SIDES','PANGEA_PLATFORM'] },
  HIGH_RISK_GAMBLER:  { fav:['PINBALL_INFERNO','COLOSSEUM_CARNAGE','STORM_TRACK'],       hate:['BB10_COMPETITIVE','PANGEA_PLATFORM','DOMINATION_ZONES'] },
  MOMENTUM_MASTER:    { fav:['STORM_TRACK','TIDAL_SURGE','VORTEX_COLISEUM'],             hate:['PINBALL_INFERNO','VOLCANIC_RAGE','NEXUS'] },
  SYNERGY_SEEKER:     { fav:['DOMINATION_ZONES','NEXUS','PANGEA_PLATFORM'],              hate:['PINBALL_INFERNO','VOLCANIC_RAGE','COLOSSEUM_CARNAGE'] },
  ADAPTIVE_TACTICIAN: { fav:['NEXUS','DOMINATION_ZONES','BB10_COMPETITIVE'],             hate:['VOLCANIC_RAGE','KILLER_SIDES','VORTEX_COLISEUM'] },
  PERFECTIONIST:      { fav:['BB10_COMPETITIVE','PANGEA_PLATFORM','KILLER_SIDES'],       hate:['PINBALL_INFERNO','COLOSSEUM_CARNAGE','TIDAL_SURGE'] },
  CHAOS_AGENT:        { fav:['PINBALL_INFERNO','VOLCANIC_RAGE','COLOSSEUM_CARNAGE'],     hate:['BB10_COMPETITIVE','PANGEA_PLATFORM','NEXUS'] },
  MOMENTUM_THIEF:     { fav:['KILLER_SIDES','DOMINATION_ZONES','STORM_TRACK'],           hate:['TIDAL_SURGE','VORTEX_COLISEUM','PANGEA_PLATFORM'] },
};

const FAV_MODIFIERS  = [6, 4, 2];
const HATE_MODIFIERS = [-6, -4, -2];

/**
 * Returns the flat attribute modifier for a player in a specific arena.
 * Pass the arena config KEY (e.g. 'BB10_COMPETITIVE', 'PINBALL_INFERNO').
 * Returns +6/+4/+2 for favorites, -6/-4/-2 for hated, 0 for neutral.
 */
export function getArenaModifier(playerMentality, arenaKey) {
  const prefs = ARENA_PREF_MAP[playerMentality] || ARENA_PREF_MAP.ALL_ROUNDER;
  const favIdx  = prefs.fav.indexOf(arenaKey);
  if (favIdx  >= 0) return FAV_MODIFIERS[favIdx];
  const hateIdx = prefs.hate.indexOf(arenaKey);
  if (hateIdx >= 0) return HATE_MODIFIERS[hateIdx];
  return 0;
}

export default UnifiedPlayerProfile;
