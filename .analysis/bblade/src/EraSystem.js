// ============================================
// ERASYSTEM.JS — Motor de Eras Históricas v2.1
// ============================================
// FIXES v2.1:
//  1. _checkRivalryEndedTrigger: player1Id→p1Id, player2Id→p2Id
//  2. _checkRisingStarSlamTrigger: champion (objeto) → champion?.id
//     usa promotedYear ao invés de debutYear
//  3. _checkEndOfGenerationTrigger: não busca aposentados no BBP atual
//     usa careerSummary.peakRanking para detectar ex-top16
//  4. _checkDynastyTrigger: usa era.champions (por ano) em vez de
//     seasonWinners por ELO; também aceita 2 de 3 anos
//  5. _checkMetaCollapseTrigger: threshold 0.60→0.55
//  6. Progressão natural: 6→4 temporadas
//  7. getSeasonRanking() usado como fallback para dynasty check
// ============================================

const ERA_NAMES = {
  Attack: [
    'A Epoch do Ataque',
    'A Era da Velocidade',
    'O Reinado das Chamas',
    'A Tempestade',
    'A Era do Furacão',
    'O Tempo dos Destruidores',
    'A Cruzada Ofensiva',
  ],
  Defense: [
    'A Muralha',
    'A Era das Fortalezas',
    'O Reinado de Ferro',
    'A Época dos Guardiões',
    'A Era da Resistência',
    'O Tempo das Cidadelas',
    'A Fortaleza Inabalável',
  ],
  Stamina: [
    'A Era do Giro Eterno',
    'O Reinado da Perseverança',
    'A Época dos Maratonistas',
    'A Era da Resistência',
    'O Tempo da Paciência',
    'A Era da Inércia',
    'O Domínio do Controle',
  ],
  Balance: [
    'A Era do Equilíbrio',
    'O Tempo dos Estrategistas',
    'A Época dos Calculistas',
    'A Era da Adaptação',
    'O Reinado da Táctica',
    'A Era dos Generalistas',
    'O Tempo da Sabedoria',
  ],
  Contested: [
    'O Interregno',
    'A Era do Caos',
    'O Grande Vácuo',
    'A Época da Transição',
    'A Era da Incerteza',
    'O Tempo das Mudanças',
    'A Era Fragmentada',
    'O Período Contestado',
  ],
  Dynasty: [
    'A Dinastia',
    'O Reinado Absoluto',
    'A Era do Imperador',
    'O Domínio Supremo',
    'A Época do Monarca',
  ],
  NewGeneration: [
    'O Despertar',
    'A Nova Geração',
    'O Renascimento',
    'A Era dos Novatos',
    'A Virada Geracional',
    'O Amanhã Chegou',
    'O Conto de Fadas',
    'A Era dos Improváveis',
  ],
  EndOfGeneration: [
    'O Crepúsculo dos Deuses',
    'A Grande Despedida',
    'O Fim de uma Geração',
    'A Era do Adeus',
    'O Último Capítulo',
  ],
};

const ERA_TAGLINES = {
  Attack: [
    'Não havia como defender. Você só podia tentar atacar mais rápido.',
    'A velocidade virou lei, e quem não atacava, perdia.',
    'A arena era um campo de guerra. Cada batalha, uma explosão.',
  ],
  Defense: [
    'Não venciam pela emoção. Venciam pela inevitabilidade.',
    'A paciência era a arma mais afiada de todas.',
    'Solidez não era estilo — era doutrina.',
  ],
  Stamina: [
    'A última volta pertencia a quem suportava a primeira.',
    'Não era sobre quem atacava mais forte, mas quem resistia mais.',
    'O giro que nunca parava era o que decidia tudo.',
  ],
  Balance: [
    'Não havia fórmula. Havia leitura, adaptação, decisão.',
    'A era que provava: entender tudo é superar qualquer coisa.',
    'Estratégia era a única invencível.',
  ],
  Contested: [
    'Ninguém governou porque todos queriam.',
    'O trono estava vazio e todos tentaram sentar nele.',
    'O período mais imprevisível — e mais épico — da história.',
  ],
  Dynasty: [
    'Não havia competição. Havia um reinado.',
    'Um nome dominava cada conversa, cada análise, cada final.',
    'A pergunta não era quem venceria. Era por quanto.',
  ],
  NewGeneration: [
    'A nova geração não pediu licença para entrar.',
    'O passado foi honrado. O futuro chegou cedo.',
    'Promessas se tornaram certezas nesta época.',
    'Um amador entrou na arena dos deuses — e não saiu de mãos vazias.',
    'O Signature Clash foi desenhado para revelar identidades. Uma batalha. Uma Signature. Sem revanches.',
    'O circuito viu algo que não sabia que queria: um recém-chegado que não tinha medo de nenhum nome.',
  ],
  EndOfGeneration: [
    'Os gigantes saíram de cena. O silêncio foi ensurdecedor.',
    'Cada aposentadoria foi uma notícia histórica.',
    'Uma era inteira encerrou seus capítulos na mesma temporada.',
  ],
};

const ERA_TYPE_TAGS = {
  Attack:   { label: 'Attack Dominant',  color: '#e8892a', cls: 'attack'   },
  Defense:  { label: 'Defense Dominant', color: '#7ec8e3', cls: 'defense'  },
  Stamina:  { label: 'Stamina Dominant', color: '#50c878', cls: 'stamina'  },
  Balance:  { label: 'Balanced Meta',    color: '#c9a84c', cls: 'balance'  },
  Contested:{ label: 'Era Contestada',   color: '#e74c3c', cls: 'contested'},
};

function _pick(arr, seed = 0) {
  if (!arr || arr.length === 0) return '';
  return arr[seed % arr.length];
}
function _pickRandom(arr) {
  if (!arr || arr.length === 0) return '';
  return arr[Math.floor(Math.random() * arr.length)];
}

function createEra({ id, number, name, startYear, dominantType = 'Contested', trigger, championName = null, tagline = '', suggestedNames = [] }) {
  return {
    id, number, name, startYear,
    endYear: null,
    dominantType, trigger,
    championName,
    tagline,
    suggestedNames,
    seasons: 0,
    stats: {
      totalTournaments: 0,
      totalMatches: 0,
      grandSlams: 0,
      retirements: 0,
      typeWins: { Attack: 0, Defense: 0, Stamina: 0, Balance: 0 },
      recordsBroken: 0,
    },
    rivalries: [],
    canonicalRivalry: null,
    playersBorn: [],
    champions: [],
  };
}

// ════════════════════════════════════════════════════════
export class EraSystem {
  constructor() {
    this.eras = [];
    this.currentEraId = null;
    this._usedNamePools = {};
    this._initFoundingEra();
  }

  _initFoundingEra() {
    const founding = createEra({
      id: 'era_1',
      number: 1,
      name: 'A Era Fundadora',
      startYear: 2024,
      dominantType: 'Contested',
      trigger: 'GENESIS',
      tagline: 'Os primeiros anos. As regras ainda sendo escritas. Os campeões, improváveis.',
      suggestedNames: ['A Era Fundadora', 'Os Primeiros Passos', 'O Começo'],
    });
    this.eras.push(founding);
    this.currentEraId = 'era_1';
  }

  getCurrentEra() {
    return this.eras.find(e => e.id === this.currentEraId) || this.eras[this.eras.length - 1];
  }

  getEraAtYear(year) {
    for (let i = this.eras.length - 1; i >= 0; i--) {
      if (this.eras[i].startYear <= year) return this.eras[i];
    }
    return this.eras[0];
  }

  getEraById(id) {
    return this.eras.find(e => e.id === id) || null;
  }

  // ── Stats recording ───────────────────────────────────
  recordTournamentForEra({ tier, winnerType, winnerName, year }) {
    const era = this.getCurrentEra();
    if (!era) return;
    era.stats.totalTournaments++;
    if (winnerType && era.stats.typeWins[winnerType] !== undefined) {
      era.stats.typeWins[winnerType]++;
    }
    if (tier === 'PREMIER_CHAMPIONSHIP' || tier === 'KINGS_COURT' || tier === 'PREMIER' ||
        tier === 'INVITATIONAL' || tier === 'OPEN') {
      era.stats.grandSlams++;
    }
    if (winnerName) {
      const champEntry = era.champions.find(c => c.year === year);
      if (!champEntry) era.champions.push({ year, name: winnerName });
    }
  }

  recordRetirementForEra() {
    const era = this.getCurrentEra();
    if (era) era.stats.retirements++;
  }

  recordSeasonForEra(year) {
    const era = this.getCurrentEra();
    if (era) era.seasons++;
  }

  recordRivalryForEra({ p1Name, p2Name, p1Wins, p2Wins, total }) {
    const era = this.getCurrentEra();
    if (!era) return;
    const existing = era.rivalries.find(r =>
      (r.p1Name === p1Name && r.p2Name === p2Name) ||
      (r.p1Name === p2Name && r.p2Name === p1Name)
    );
    if (existing) {
      existing.p1Wins = p1Wins;
      existing.p2Wins = p2Wins;
      existing.total = total;
    } else {
      era.rivalries.push({ p1Name, p2Name, p1Wins, p2Wins, total, isCrossEra: false });
    }
    if (!era.canonicalRivalry || total > (era.canonicalRivalry.total || 0)) {
      era.canonicalRivalry = { p1Name, p2Name, p1Wins, p2Wins, total };
    }
  }

  registerPlayerBorn(playerId) {
    const era = this.getCurrentEra();
    if (era && !era.playersBorn.includes(playerId)) {
      era.playersBorn.push(playerId);
    }
  }

  // ── Transition detection ──────────────────────────────
  /**
   * Verifica gatilhos de transição de era.
   * Chamado no final de finalizeSeasonTransition().
   *
   * FIXES v2.1:
   * - Dynasty: usa era.champions (deduplicated por ano) OU getSeasonRanking()
   * - MetaCollapse: threshold 0.55 (era 0.60)
   * - EndOfGeneration: usa peakRanking do careerSummary, não ranking atual
   * - RivalryEnded: usa p1Id/p2Id (era player1Id/player2Id — bug corrigido)
   * - RisingStarSlam: usa champion.id (era tratado como ID — bug corrigido)
   * - Natural: 4 temporadas (era 6)
   */
  checkEraTransition(um) {
    const completedYear = um.currentYear - 1;
    const currentEra = this.getCurrentEra();
    if (!currentEra) return null;

    const eraSeasons = completedYear - currentEra.startYear + 1;
    if (eraSeasons < 2) return null;

    let triggered = null;

    // ── GATILHO 1: DYNASTY ──────────────────────────────
    if (!triggered) triggered = this._checkDynastyTrigger(um, completedYear, currentEra);

    // ── GATILHO 2: META COLLAPSE ────────────────────────
    if (!triggered) triggered = this._checkMetaCollapseTrigger(um, completedYear);

    // ── GATILHO 3: FIM DE GERAÇÃO ───────────────────────
    if (!triggered) triggered = this._checkEndOfGenerationTrigger(um, completedYear);

    // ── GATILHO 4: RIVALIDADE ENCERRADA ─────────────────
    if (!triggered) triggered = this._checkRivalryEndedTrigger(um);

    // ── GATILHO 5: RISING STAR SLAM ─────────────────────
    if (!triggered) triggered = this._checkRisingStarSlamTrigger(um, completedYear);

    // ── GATILHO 6: PROGRESSÃO NATURAL ───────────────────
    // FIX: threshold reduzido de 6 para 4 temporadas
    if (!triggered && eraSeasons >= 4) {
      triggered = {
        type: 'META_COLLAPSE',
        dominantType: this._computeDominantType(currentEra),
        detail: `${eraSeasons} temporadas — ciclo histórico encerrado`,
      };
    }

    if (!triggered) return null;
    return this._buildTransitionObject(triggered, um, completedYear);
  }

  // ── FIX: dynasty agora usa era.champions por ano ──────
  _checkDynastyTrigger(um, completedYear, currentEra) {
    // Obter os campeões por ANO da era corrente (deduplicated)
    const yearChampions = currentEra.champions
      .filter(c => c.year && c.name)
      .sort((a, b) => a.year - b.year);

    // Também checar season points leader atual (se ainda disponível)
    let currentSeasonLeader = null;
    try {
      const sr = um.getSeasonRanking?.() || [];
      if (sr.length > 0) {
        const leaderId = sr[0].playerId;
        currentSeasonLeader = um.players[leaderId]?.name || null;
      }
    } catch (e) { /* noop */ }

    // Montar lista de campeões dos últimos anos (incluindo atual se disponível)
    const recentChamps = yearChampions.slice(-4).map(c => c.name);
    if (currentSeasonLeader && (recentChamps[recentChamps.length - 1] !== currentSeasonLeader)) {
      recentChamps.push(currentSeasonLeader);
    }

    if (recentChamps.length < 2) return null;

    // 2 CONSECUTIVOS — o mais forte sinal de dynasty
    const last2 = recentChamps.slice(-2);
    if (last2[0] && last2[0] === last2[1]) {
      return {
        type: 'DYNASTY',
        championName: last2[1],
        detail: `2 temporadas consecutivas dominadas por ${last2[1]}`,
      };
    }

    // 3 DOS ÚLTIMOS 4 ANOS — dynasty mais dispersa mas real
    if (recentChamps.length >= 4) {
      const counts = {};
      recentChamps.forEach(n => { if (n) counts[n] = (counts[n] || 0) + 1; });
      const dominant = Object.entries(counts).find(([, v]) => v >= 3);
      if (dominant) {
        return {
          type: 'DYNASTY',
          championName: dominant[0],
          detail: `${dominant[1]} dos últimos 4 anos dominados por ${dominant[0]}`,
        };
      }
    }

    // Fallback: seasonWinners por ELO (lógica original, para compatibilidade)
    const seasonWinners = um.seasonWinners || [];
    if (seasonWinners.length >= 2) {
      const ewLast2 = seasonWinners.slice(-2);
      if (ewLast2[0] === ewLast2[1]) {
        return {
          type: 'DYNASTY',
          championName: ewLast2[1],
          detail: `${ewLast2[1]} lidera o circuito por 2 temporadas consecutivas`,
        };
      }
      // 4 títulos totais
      const ewCounts = {};
      seasonWinners.forEach(n => { ewCounts[n] = (ewCounts[n] || 0) + 1; });
      const ewDominant = Object.entries(ewCounts).find(([, v]) => v >= 4);
      if (ewDominant) {
        return {
          type: 'DYNASTY',
          championName: ewDominant[0],
          detail: `${ewDominant[1]} títulos de temporada — dynasty confirmada`,
        };
      }
    }

    return null;
  }

  // ── FIX: threshold 0.55 (era 0.60) ───────────────────
  _checkMetaCollapseTrigger(um, completedYear) {
    const seasonStats = um.seasonTournamentTypeStats?.[completedYear];
    if (!seasonStats) return null;
    const total = Object.values(seasonStats).reduce((s, v) => s + v, 0);
    if (total < 4) return null;
    for (const [type, wins] of Object.entries(seasonStats)) {
      if (wins / total >= 0.55) {  // FIX: era 0.60
        return {
          type: 'META_COLLAPSE',
          dominantType: type,
          detail: `${Math.round((wins / total) * 100)}% das vitórias com estilo ${type}`,
        };
      }
    }
    return null;
  }

  // ── FIX: usa peakRanking do careerSummary, não BBP atual ──
  _checkEndOfGenerationTrigger(um, completedYear) {
    const recentRetirements = um.pendingRetirementAnnouncements || [];
    if (recentRetirements.length < 2) return null;

    // FIX: jogadores aposentados JÁ foram removidos do BBP.
    // Usar careerSummary.peakRanking para detectar se eram top-tier.
    const eliteRetirements = recentRetirements.filter(r => {
      const peak = r.careerSummary?.peakRanking || r.player?.careerPeak?.ranking || 99;
      const titles = r.careerSummary?.totalTitles || 0;
      return peak <= 16 || titles >= 3;
    });

    if (eliteRetirements.length >= 2) {
      return {
        type: 'END_GENERATION',
        detail: `${eliteRetirements.length} jogadores de elite se aposentaram`,
      };
    }

    // Fallback: muitas aposentadorias de qualquer tipo
    if (recentRetirements.length >= 4) {
      return {
        type: 'END_GENERATION',
        detail: `${recentRetirements.length} jogadores se aposentaram nesta temporada`,
      };
    }

    return null;
  }

  // ── FIX: p1Id/p2Id em vez de player1Id/player2Id ─────
  _checkRivalryEndedTrigger(um) {
    if (!um.rivalrySystem) return null;
    const recentRetirements = um.pendingRetirementAnnouncements || [];
    if (recentRetirements.length === 0) return null;

    const retiredNames = new Set(
      recentRetirements.map(r => r.playerName || r.player?.name || r.name).filter(Boolean)
    );

    const allRivalries = Array.from(um.rivalrySystem.rivalries?.values?.() || []);
    for (const rivalry of allRivalries) {
      if (rivalry.totalMatches < 10) continue;

      // FIX: usar p1Id/p2Id (não player1Id/player2Id)
      const p1 = um.players[rivalry.p1Id];
      const p2 = um.players[rivalry.p2Id];
      if (!p1 || !p2) continue;

      if (retiredNames.has(p1.name) || retiredNames.has(p2.name)) {
        return {
          type: 'RIVALRY_ENDED',
          p1Name: p1.name,
          p2Name: p2.name,
          total: rivalry.totalMatches,
          score: `${rivalry.p1Wins || 0}–${rivalry.p2Wins || 0}`,
          detail: `${rivalry.totalMatches} confrontos históricos entre ${p1.name} e ${p2.name}`,
        };
      }
    }

    return null;
  }

  // ── FIX: champion é objeto (não ID); usa promotedYear ─
  _checkRisingStarSlamTrigger(um, completedYear) {
    const archive = um.tournamentArchive;
    if (!archive) return null;

    for (const [, tournament] of archive) {
      if (!tournament?.completed) continue;
      if (tournament.year !== completedYear) continue;

      const isPrestigeTier = (
        tournament.tier === 'PREMIER_CHAMPIONSHIP' ||
        tournament.tier === 'KINGS_COURT' ||
        tournament.tier === 'PREMIER' ||
        tournament.tier === 'OPEN' ||
        tournament.tier === 'INVITATIONAL' ||
        tournament.tier === 'SIGNATURE_CLASH'
      );
      if (!isPrestigeTier) continue;

      // FIX: tournament.champion é um OBJETO de jogador, não um ID
      const championObj = tournament.champion;
      if (!championObj) continue;

      // Obter o ID do campeão de forma segura
      const championId = (typeof championObj === 'object' && championObj !== null)
        ? (championObj.id ?? championObj.playerId)
        : (typeof championObj === 'number' ? championObj : null);

      if (championId === null || championId === undefined) continue;

      const player = um.players[championId];
      if (!player) continue;

      // FIX: usar promotedYear (não debutYear, que fica fixo em data.js)
      const promotedYear = player.promotedYear;
      const debutYear = player.debutYear || completedYear;
      const yearsActive = promotedYear
        ? completedYear - promotedYear      // jogadores promovidos do Rising Star
        : completedYear - debutYear;        // jogadores originais

      const isNewcomer = yearsActive <= 2 || player.status === 'RISING_STAR';
      if (!isNewcomer) continue;

      const contextLabel = tournament.tier === 'OPEN'
        ? `${player.name} — um ${player.status === 'RISING_STAR' ? 'Rising Star' : 'estreante'} — venceu o Crossover Open contra os melhores profissionais do mundo`
        : tournament.tier === 'SIGNATURE_CLASH'
        ? `${player.name} venceu o New Year's Signature Clash no seu primeiro ou segundo ano como profissional`
        : tournament.tier === 'INVITATIONAL'
        ? `${player.name} venceu o Season Kickoff Invitational no seu primeiro ou segundo ano como profissional`
        : `${player.name} venceu ${tournament.tournamentName || tournament.name || 'o torneio'} com apenas ${yearsActive + 1} ano(s) na elite`;

      return {
        type: 'RISING_STAR_SLAM',
        championName: player.name,
        tournamentTier: tournament.tier,
        detail: contextLabel,
        isFairyTale: tournament.tier === 'OPEN' && player.status === 'RISING_STAR',
      };
    }

    return null;
  }

  // ── Build transition object (unchanged) ──────────────
  _buildTransitionObject(triggered, um, completedYear) {
    const currentEra = this.getCurrentEra();
    const dominantType = this._computeDominantType(currentEra);
    const championName = triggered.championName || this._computeEraChampion(currentEra, um);

    const tagPool = ERA_TAGLINES[
      triggered.type === 'DYNASTY'          ? 'Dynasty'         :
      triggered.type === 'META_COLLAPSE'    ? (triggered.dominantType || dominantType) :
      triggered.type === 'END_GENERATION'   ? 'EndOfGeneration'  :
      triggered.type === 'RISING_STAR_SLAM' ? 'NewGeneration'    :
      triggered.type === 'RIVALRY_ENDED'    ? (dominantType || 'Contested') :
      dominantType
    ] || ERA_TAGLINES.Contested;

    const tagline = tagPool[Math.floor(Math.random() * tagPool.length)];
    const newEraNamePool = this._buildNamePool(triggered, dominantType);
    const canonical = currentEra.canonicalRivalry || null;

    return {
      closingEra: {
        id: currentEra.id,
        number: currentEra.number,
        name: currentEra.name,
        startYear: currentEra.startYear,
        endYear: completedYear,
        dominantType,
        tagline,
        championName,
        seasons: completedYear - currentEra.startYear + 1,
        stats: { ...currentEra.stats },
        canonicalRivalry: canonical,
      },
      trigger: triggered,
      suggestedNewEraNames: newEraNamePool,
      defaultNewEraName: newEraNamePool[0] || 'Nova Era',
    };
  }

  _computeDominantType(era) {
    const wins = era.stats.typeWins;
    const total = Object.values(wins).reduce((s, v) => s + v, 0);
    if (total === 0) return 'Contested';
    const sorted = Object.entries(wins).sort((a, b) => b[1] - a[1]);
    const [topType, topWins] = sorted[0];
    if (topWins / total >= 0.45) return topType;
    return 'Contested';
  }

  _computeEraChampion(era, um) {
    const counts = {};
    era.champions.forEach(({ name }) => { counts[name] = (counts[name] || 0) + 1; });
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    return sorted[0]?.[0] || null;
  }

  _buildNamePool(triggered, dominantType) {
    const pools = [];
    switch (triggered.type) {
      case 'DYNASTY':
        pools.push(...(ERA_NAMES.Dynasty || []));
        pools.push(...(ERA_NAMES[dominantType] || []));
        break;
      case 'META_COLLAPSE':
        pools.push(...(ERA_NAMES[triggered.dominantType] || ERA_NAMES[dominantType] || []));
        break;
      case 'END_GENERATION':
        pools.push(...(ERA_NAMES.EndOfGeneration || []));
        break;
      case 'RISING_STAR_SLAM':
        pools.push(...(ERA_NAMES.NewGeneration || []));
        break;
      case 'RIVALRY_ENDED':
        pools.push(...(ERA_NAMES[dominantType] || ERA_NAMES.Contested));
        break;
      default:
        pools.push(...(ERA_NAMES.Contested || []));
    }
    if (!pools.length) pools.push(...(ERA_NAMES.Contested || []));
    return [...new Set(pools)].slice(0, 5);
  }

  // ── Confirm / Manual transition (unchanged) ──────────
  confirmTransition(transitionData, newEraName, newStartYear) {
    const currentEra = this.eras.find(e => e.id === transitionData.closingEra.id);
    if (currentEra) {
      currentEra.endYear = transitionData.closingEra.endYear;
      currentEra.tagline = transitionData.closingEra.tagline || currentEra.tagline;
      currentEra.dominantType = transitionData.closingEra.dominantType;
      currentEra.championName = transitionData.closingEra.championName;
    }

    const newEra = createEra({
      id: `era_${this.eras.length + 1}`,
      number: this.eras.length + 1,
      name: newEraName,
      startYear: newStartYear,
      dominantType: 'Contested',
      trigger: transitionData.trigger.type,
      suggestedNames: transitionData.suggestedNewEraNames,
      tagline: '',
    });

    this.eras.push(newEra);
    this.currentEraId = newEra.id;
    return newEra;
  }

  manualTransition(newEraName, currentYear) {
    const currentEra = this.getCurrentEra();
    if (currentEra) {
      currentEra.endYear = currentYear - 1;
      currentEra.dominantType = this._computeDominantType(currentEra);
      if (!currentEra.tagline) {
        currentEra.tagline = _pickRandom(ERA_TAGLINES[currentEra.dominantType] || ERA_TAGLINES.Contested);
      }
    }
    const newEra = createEra({
      id: `era_${this.eras.length + 1}`,
      number: this.eras.length + 1,
      name: newEraName,
      startYear: currentYear,
      dominantType: 'Contested',
      trigger: 'MANUAL',
      tagline: '',
    });
    this.eras.push(newEra);
    this.currentEraId = newEra.id;
    return newEra;
  }

  // ── Legacy helpers (unchanged) ───────────────────────
  getPlayerEraLabel(playerId, um) {
    const player = um.players[playerId];
    if (!player) return null;
    const eraId = player.eraBorn;
    if (eraId) {
      const era = this.getEraById(eraId);
      return era ? `Produto da ${era.name}` : null;
    }
    const debut = player.debutYear || um.currentYear;
    const era = this.getEraAtYear(debut);
    return era ? `Produto da ${era.name}` : null;
  }

  isKingOfEra(playerName, era) {
    return era.championName === playerName;
  }

  // ── Save / Restore (unchanged) ───────────────────────
  toJSON() {
    return { eras: this.eras, currentEraId: this.currentEraId };
  }

  fromJSON(data) {
    if (!data) return;
    this.eras = data.eras || [];
    this.currentEraId = data.currentEraId || (this.eras[this.eras.length - 1]?.id || null);
    if (this.eras.length === 0) this._initFoundingEra();
    this.eras.forEach(era => {
      if (!era.stats) {
        era.stats = { totalTournaments: 0, totalMatches: 0, grandSlams: 0, retirements: 0, typeWins: { Attack: 0, Defense: 0, Stamina: 0, Balance: 0 }, recordsBroken: 0 };
      } else {
        if (era.stats.totalTournaments == null) era.stats.totalTournaments = 0;
        if (era.stats.totalMatches    == null) era.stats.totalMatches    = 0;
        if (era.stats.grandSlams      == null) era.stats.grandSlams      = 0;
        if (era.stats.retirements     == null) era.stats.retirements     = 0;
        if (era.stats.recordsBroken   == null) era.stats.recordsBroken   = 0;
        if (!era.stats.typeWins || typeof era.stats.typeWins !== 'object') {
          era.stats.typeWins = { Attack: 0, Defense: 0, Stamina: 0, Balance: 0 };
        } else {
          ['Attack','Defense','Stamina','Balance'].forEach(t => {
            if (era.stats.typeWins[t] == null) era.stats.typeWins[t] = 0;
          });
        }
      }
      if (!era.rivalries)   era.rivalries   = [];
      if (!era.champions)   era.champions   = [];
      if (!era.playersBorn) era.playersBorn = [];
      if (!era.seasons && era.seasons !== 0) era.seasons = 0;
    });
  }

  repairEraStats(um) {
    if (!um) return;
    const archive = um.tournamentArchive;
    const seasonWinners = um.seasonWinners || [];

    this.eras.forEach(era => {
      era.stats.totalTournaments = 0;
      era.stats.totalMatches = 0;
      era.stats.grandSlams = 0;
      era.stats.typeWins = { Attack: 0, Defense: 0, Stamina: 0, Balance: 0 };
      era.champions = [];
      era.seasons = 0;
    });

    if (archive instanceof Map) {
      archive.forEach((tournament) => {
        if (!tournament?.completed) return;
        const year = tournament.year;
        if (!year) return;
        const era = this.getEraAtYear(year);
        if (!era) return;
        era.stats.totalTournaments++;
        const t = tournament.tier || tournament.tournamentTier || tournament.type || '';
        if (t === 'PREMIER_CHAMPIONSHIP' || t === 'KINGS_COURT' || t === 'PREMIER' ||
            t === 'INVITATIONAL' || t === 'SIGNATURE_CLASH' || t === 'OPEN') {
          era.stats.grandSlams++;
        }
        const winnerType = tournament.winnerType || tournament.championType || null;
        if (winnerType && era.stats.typeWins[winnerType] != null) {
          era.stats.typeWins[winnerType]++;
        }
        const championName = tournament.championName ||
          (typeof tournament.champion === 'object' ? tournament.champion?.name : null) ||
          (typeof tournament.champion === 'string' ? tournament.champion : null) || null;
        if (championName) {
          const existing = era.champions.find(c => c.year === year);
          if (!existing) era.champions.push({ year, name: championName });
        }
      });
    }

    seasonWinners.forEach((winnerName, idx) => {
      const year = 2024 + idx;
      const era = this.getEraAtYear(year);
      if (!era) return;
      const existing = era.champions.find(c => c.year === year);
      if (!existing && winnerName) era.champions.push({ year, name: winnerName });
    });

    const currentYear = um.currentYear || 2024;
    const currentMonth = um.currentMonth || 1;
    const lastCompletedYear = currentMonth >= 12 ? currentYear : currentYear - 1;
    for (let y = 2024; y <= lastCompletedYear; y++) {
      const era = this.getEraAtYear(y);
      if (era) era.seasons++;
    }

    // Aposentadorias via divisionChangeLog
    const retirementLog = um.divisionChangeLog || [];
    retirementLog.forEach(entry => {
      if (entry.type !== 'RETIRED' && entry.newStatus !== 'RETIRED') return;
      const year = entry.year || entry.season;
      if (!year) return;
      const era = this.getEraAtYear(year);
      if (era) era.stats.retirements++;
    });

    console.log('🔧 EraSystem repairEraStats v2.1:');
    this.eras.forEach(era => {
      console.log(`   Era ${era.number} (${era.startYear}${era.endYear ? '–'+era.endYear : '→'}): ${era.stats.totalTournaments} torneios, ${era.seasons} temporadas`);
    });
  }

  getGlobalStats() {
    const closedEras = this.eras.filter(e => e.endYear != null);
    return {
      totalEras: this.eras.length,
      closedEras: closedEras.length,
      longestEra: closedEras.reduce((best, e) => {
        const seasons = e.endYear - e.startYear + 1;
        return seasons > (best?.seasons || 0) ? { ...e, seasons } : best;
      }, null),
      mostTournaments: closedEras.reduce((best, e) => {
        return (e.stats.totalTournaments > (best?.stats?.totalTournaments || 0)) ? e : best;
      }, null),
    };
  }
}

export default EraSystem;
