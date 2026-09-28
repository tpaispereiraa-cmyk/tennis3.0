// ============================================
// RIVALRYSYSTEM.JS — Tennis Edition v1.0
// Adaptado de bblade/RivalrySystem v2.0
// ============================================

import { isTiebreakSetScore } from '../../core/constants.js';
//
// FILOSOFIA:
//  Rivalidades são raras e pesadas, não automáticas.
//  Dois encontros não fazem uma rivalidade — uma história faz.
//
// ARQUITETURA:
//  1. Proto-buffer (_encounters): acumula dados brutos de cada dupla
//     sem criar objeto de rivalidade. Leve, só contadores.
//  2. Graduação: dupla vira rivalidade só quando atinge 1 critério.
//  3. Thresholds estritos por tipo.
//  4. Status exige intensidade + partidas mínimas.
//  5. Cap: máximo 5 rivalidades ativas por jogador.
//  6. Poda periódica de rivalidades fracas e velhas.
//
// TIPOS:
//  CLASSIC        — equilíbrio real, encontros frequentes
//  DOMINATION     — domínio claro e consistente
//  GIANT_KILLER   — azarão derruba favorito repetidamente
//  GRUDGE         — tiebreaks constantes, guerra de atrito
//  FINALS_CURSE   — destino repetido nos palcos máximos
//  THRONE_RIVALS  — dois que já ocuparam o topo em momentos distintos
//  ERA_CLASH      — gap geracional >= 8 anos, passado vs futuro
//
// INTEGRAÇÃO (chamar após cada partida simulada):
//
//   rivalrySystem.updateFromMatch({
//     player1Id:  playerA.id,
//     player2Id:  playerB.id,
//     winnerId:   winner.id,
//     round:      'F' | 'SF' | 'QF' | 'R16' | ...,
//     category:   'GRAND_SLAM' | 'MASTERS_1000' | 'ATP_500' | 'ATP_250' | ...,
//     tournament: tournament.name,
//     season:     currentSeason,       // número do ano/temporada
//     setsDetail: [[6,4],[3,6],[7,6]], // array de [gamesA, gamesB] por set
//   }, universeState);
//
//   // Ao final de cada temporada:
//   rivalrySystem.pruneStale(currentSeason);
//
//   // Ao aposentar um jogador:
//   rivalrySystem.onRetirement(playerId);
//
// ============================================

// Prestígio por categoria — quanto "vale" um encontro nessa competição
const CATEGORY_PRESTIGE = {
  GRAND_SLAM:    5,
  MASTERS_1000:  4,
  FINALS:        4,
  ATP_500:       3,
  ATP_250:       2,
  ATP_100:       1,
  ATP_PROSPECTS: 0,
};

const MAX_RIVALRIES_PER_PLAYER = 5;

// ─────────────────────────────────────────────────────────────────
export const RIVALRY_TYPES = {
  CLASSIC:      { id: 'CLASSIC',       label: 'Clássica',            icon: '⚔️',  color: '#ffd700', desc: 'Duelo equilibrado — qualquer resultado é possível'         },
  DOMINATION:   { id: 'DOMINATION',    label: 'Dominância',          icon: '👑',  color: '#ef4444', desc: 'Um lado controla o confronto com mão de ferro'             },
  GIANT_KILLER: { id: 'GIANT_KILLER',  label: 'Caçador de Gigantes', icon: '🎯',  color: '#22c55e', desc: 'O menor derruba o maior — história de David e Golias'      },
  GRUDGE:       { id: 'GRUDGE',        label: 'Rancor',              icon: '🔥',  color: '#f97316', desc: 'Cada ponto vale sangue — tiebreaks sem fim'                 },
  FINALS_CURSE: { id: 'FINALS_CURSE',  label: 'Maldição das Finais', icon: '🏆',  color: '#c084fc', desc: 'O destino os coloca frente a frente quando tudo importa'   },
  THRONE_RIVALS:{ id: 'THRONE_RIVALS', label: 'Rivais do Trono',     icon: '💎',  color: '#06b6d4', desc: 'Dois que já ocuparam o topo em eras distintas'             },
  ERA_CLASH:    { id: 'ERA_CLASH',     label: 'Choque de Eras',      icon: '🌀',  color: '#a855f7', desc: 'O passado enfrenta o futuro em batalha pelo legado'         },
};

export const RIVALRY_STATUS = {
  BREWING:   { label: 'Emergindo',  color: '#94a3b8' },
  ACTIVE:    { label: 'Ativa',      color: '#22c55e' },
  INTENSE:   { label: 'Intensa',    color: '#f97316' },
  LEGENDARY: { label: 'Lendária',   color: '#ffd700' },
  FROZEN:    { label: 'Encerrada',  color: '#60a5fa' },
};

// ─────────────────────────────────────────────────────────────────
// Detecta se o set decisivo foi para tiebreak (5-4 no formato compacto)
function _hasDecisiveTiebreak(setsDetail) {
  if (!setsDetail || setsDetail.length === 0) return false;
  const last = setsDetail[setsDetail.length - 1];
  return last && isTiebreakSetScore(last[0], last[1]);
}

// Conta quantos sets foram decididos no tiebreak (5-4)
function _countTiebreakSets(setsDetail) {
  if (!setsDetail) return 0;
  return setsDetail.filter(s => s && isTiebreakSetScore(s[0], s[1])).length;
}

// ─────────────────────────────────────────────────────────────────
export class RivalrySystem {
  constructor() {
    this.rivalries   = new Map(); // key -> rivalry obj (apenas graduadas)
    this.playerIndex = new Map(); // playerId -> Set<key>
    this._encounters = new Map(); // key -> proto-encounter (leve, pré-graduação)
    console.log('⚔️ RivalrySystem Tennis v1.0 inicializado');
  }

  // ══════════════════════════════════════════
  // ALIMENTAÇÃO — chamado após cada match
  // ══════════════════════════════════════════

  updateFromMatch(matchRecord, universeState) {
    const { player1Id, player2Id, winnerId, round, category, season, setsDetail } = matchRecord;

    if (player1Id === undefined || player2Id === undefined) return;
    if (player1Id === player2Id) return;

    const key = this._key(player1Id, player2Id);
    const p1  = player1Id < player2Id ? player1Id : player2Id;
    const p2  = player1Id < player2Id ? player2Id : player1Id;

    const prestige  = CATEGORY_PRESTIGE[category] ?? 1;
    const isFinal   = round === 'F' || round === 'FINAL' || round === 'CHAMPION';
    const tbSets    = _countTiebreakSets(setsDetail);
    const hasDecTb  = _hasDecisiveTiebreak(setsDetail);

    // ── Atualizar proto-buffer ──
    if (!this._encounters.has(key)) {
      this._encounters.set(key, {
        p1Id: p1, p2Id: p2,
        total: 0, finalsCount: 0, tiebreakSets: 0,
        highPrestigeCount: 0,
        seasons: new Set(),
        lastSeason: null,
      });
    }
    const enc = this._encounters.get(key);
    enc.total++;
    if (isFinal)       enc.finalsCount++;
    enc.tiebreakSets  += tbSets;
    if (prestige >= 3) enc.highPrestigeCount++;
    if (season !== undefined) enc.seasons.add(season);
    enc.lastSeason = season ?? enc.lastSeason;

    // ── Se já graduada, atualizar ──
    if (this.rivalries.has(key)) {
      this._updateRivalry(key, matchRecord, universeState, prestige, isFinal, tbSets, hasDecTb);
      return;
    }

    // ── Checar graduação ──
    if (this._shouldGraduate(enc)) {
      this._graduateRivalry(key, p1, p2, universeState);
      this._updateRivalry(key, matchRecord, universeState, prestige, isFinal, tbSets, hasDecTb);
      this._enforcePlayerCap(p1);
      this._enforcePlayerCap(p2);
    }
  }

  // ── Critérios de graduação (basta UM) ──
  _shouldGraduate(enc) {
    if (enc.total >= 5) return true;
    if (enc.finalsCount >= 3) return true;
    if (enc.highPrestigeCount >= 4) return true;
    if (enc.total >= 3 && enc.tiebreakSets >= 3 && enc.highPrestigeCount >= 2) return true;
    return false;
  }

  // ── Criar rivalidade graduada, reconstruindo H2H do histórico ──
  _graduateRivalry(key, p1Id, p2Id, us) {
    const enc = this._encounters.get(key);
    const r = {
      key, p1Id, p2Id,
      p1Wins: 0, p2Wins: 0,
      p1FinalWins: 0, p2FinalWins: 0,
      totalMatches: 0, finalsMatches: 0,
      tiebreakSets: 0, totalPrestige: 0,
      seasons: enc ? Array.from(enc.seasons) : [],
      lastSeason: enc?.lastSeason || null,
      keyMoments: [],
      type: 'CLASSIC', status: 'BREWING',
      intensity: 0, narrative: '',
      frozenReason: null,
    };

    this.rivalries.set(key, r);
    if (!this.playerIndex.has(p1Id)) this.playerIndex.set(p1Id, new Set());
    if (!this.playerIndex.has(p2Id)) this.playerIndex.set(p2Id, new Set());
    this.playerIndex.get(p1Id).add(key);
    this.playerIndex.get(p2Id).add(key);

    // Reconstruir H2H do matchHistory se disponível
    if (us?.matchHistory) {
      us.matchHistory.forEach(m => {
        if (this._key(m.player1Id, m.player2Id) !== key) return;
        const mp     = CATEGORY_PRESTIGE[m.category] ?? 1;
        const mFin   = m.round === 'F' || m.round === 'FINAL' || m.round === 'CHAMPION';
        const mTb    = _countTiebreakSets(m.setsDetail);
        const mDecTb = _hasDecisiveTiebreak(m.setsDetail);
        this._applyMatchToRivalry(r, m.player1Id, m.player2Id, m.winnerId,
          m.round, m.category, m.season, mp, mFin, mTb, mDecTb);
      });
    }

    this._recalculate(r, us);
    console.log(`⚔️ Rivalidade GRADUADA: ${p1Id} vs ${p2Id} (${r.type} · ${r.totalMatches} partidas)`);
  }

  _updateRivalry(key, matchRecord, us, prestige, isFinal, tbSets, hasDecTb) {
    const r = this.rivalries.get(key);
    if (!r || r.status === 'FROZEN') return;
    const { player1Id, player2Id, winnerId, round, category, season } = matchRecord;
    this._applyMatchToRivalry(r, player1Id, player2Id, winnerId,
      round, category, season, prestige, isFinal, tbSets, hasDecTb);
    this._recalculate(r, us);
  }

  _applyMatchToRivalry(r, p1id, p2id, winnerId, round, category, season, prestige, isFinal, tbSets, hasDecTb) {
    const p1Won = winnerId === r.p1Id;
    if (p1Won) r.p1Wins++; else r.p2Wins++;
    r.totalMatches++;
    if (isFinal) { r.finalsMatches++; if (p1Won) r.p1FinalWins++; else r.p2FinalWins++; }
    r.tiebreakSets  += (tbSets || 0);
    r.totalPrestige += prestige;
    if (season !== undefined && !r.seasons.includes(season)) r.seasons.push(season);
    r.lastSeason = season ?? r.lastSeason;

    // Key moments: finais, Slams/Masters, ou set decisivo em tiebreak
    if (isFinal || prestige >= 4 || hasDecTb) {
      r.keyMoments.push({ season, round, category, winnerId, isFinal, hasDecTb, prestige });
      if (r.keyMoments.length > 20) r.keyMoments.shift();
    }
  }

  // ══════════════════════════════════════════
  // CAP POR JOGADOR
  // ══════════════════════════════════════════

  _enforcePlayerCap(playerId) {
    const keys = this.playerIndex.get(playerId);
    if (!keys || keys.size <= MAX_RIVALRIES_PER_PLAYER) return;

    const candidates = Array.from(keys)
      .map(k => this.rivalries.get(k))
      .filter(r => r && r.status !== 'FROZEN' && r.status !== 'LEGENDARY')
      .sort((a, b) => a.intensity - b.intensity);

    while (candidates.length > 0 && keys.size > MAX_RIVALRIES_PER_PLAYER) {
      const weakest = candidates.shift();
      if (!weakest) break;
      this._removeRivalry(weakest.key);
    }
  }

  _removeRivalry(key) {
    const r = this.rivalries.get(key);
    if (!r) return;
    this.rivalries.delete(key);
    this.playerIndex.get(r.p1Id)?.delete(key);
    this.playerIndex.get(r.p2Id)?.delete(key);
  }

  // ══════════════════════════════════════════
  // PODA PERIÓDICA — chamar no fim de cada temporada
  // ══════════════════════════════════════════

  pruneStale(currentSeason) {
    let pruned = 0;
    for (const [key, r] of this.rivalries.entries()) {
      if (r.status === 'FROZEN' || r.status === 'LEGENDARY') continue;
      const seasonsInactive = currentSeason - (r.lastSeason || currentSeason);
      if (r.intensity < 0.15 && r.totalMatches < 5 && seasonsInactive >= 2) {
        this._removeRivalry(key);
        pruned++;
      }
    }
    // Limpar encounter buffer antigo não-graduado
    for (const [key, enc] of this._encounters.entries()) {
      if (this.rivalries.has(key)) continue;
      const seasonsInactive = currentSeason - (enc.lastSeason || currentSeason);
      if (enc.total < 3 && seasonsInactive >= 3) {
        this._encounters.delete(key);
      }
    }
    if (pruned > 0) console.log(`⚔️ Poda: ${pruned} rivalidade(s) removida(s)`);
    return pruned;
  }

  // ══════════════════════════════════════════
  // EVENTO DE APOSENTADORIA
  // ══════════════════════════════════════════

  onRetirement(retiredPlayerId) {
    const keys = this.playerIndex.get(retiredPlayerId) || new Set();
    keys.forEach(key => {
      const r = this.rivalries.get(key);
      if (r && r.status !== 'FROZEN') {
        r.status = 'FROZEN';
        r.frozenReason = retiredPlayerId === r.p1Id ? 'p1_retired' : 'p2_retired';
      }
    });
  }

  // ══════════════════════════════════════════
  // CONSULTAS
  // ══════════════════════════════════════════

  getPlayerRivalries(playerId) {
    const keys = this.playerIndex.get(playerId) || new Set();
    return Array.from(keys)
      .map(k => this.rivalries.get(k))
      .filter(Boolean)
      .sort((a, b) => b.intensity - a.intensity);
  }

  getTopRivalries(limit = 10) {
    return Array.from(this.rivalries.values())
      .filter(r => r.totalMatches >= 5)
      .sort((a, b) => b.intensity - a.intensity)
      .slice(0, limit);
  }

  getLegendaryRivalries() {
    return Array.from(this.rivalries.values())
      .filter(r => r.status === 'LEGENDARY' || (r.status === 'FROZEN' && r.intensity >= 0.65))
      .sort((a, b) => b.intensity - a.intensity);
  }

  getRivalry(idA, idB) {
    return this.rivalries.get(this._key(idA, idB)) || null;
  }

  getEncounters(idA, idB) {
    return this._encounters.get(this._key(idA, idB)) || null;
  }

  // ══════════════════════════════════════════
  // RECÁLCULO
  // ══════════════════════════════════════════

  _recalculate(r, us) {
    if (r.totalMatches === 0) return;
    const winRate = r.p1Wins / r.totalMatches;
    r.type        = this._detectType(r, winRate, us);
    r.intensity   = this._calcIntensity(r, winRate);

    if (r.status !== 'FROZEN') {
      if      (r.intensity >= 0.80 && r.totalMatches >= 12 && r.seasons.length >= 3) r.status = 'LEGENDARY';
      else if (r.intensity >= 0.55 && r.totalMatches >= 8)  r.status = 'INTENSE';
      else if (r.intensity >= 0.30 && r.totalMatches >= 5)  r.status = 'ACTIVE';
      else                                                   r.status = 'BREWING';
    }

    r.narrative = this._generateNarrative(r, us);
  }

  _detectType(r, winRate, us) {
    const total = r.totalMatches;

    // ERA_CLASH — gap >= 8 anos entre idades
    if (us && total >= 5 && r.seasons.length >= 2) {
      const p1 = this._getPlayer(r.p1Id, us);
      const p2 = this._getPlayer(r.p2Id, us);
      if (p1?.age && p2?.age && Math.abs(p1.age - p2.age) >= 8) return 'ERA_CLASH';
    }

    // FINALS_CURSE — 3+ encontros em finais
    if (r.finalsMatches >= 3) return 'FINALS_CURSE';

    // THRONE_RIVALS — ambos já foram top 3 + 5+ matches + 3+ temporadas
    if (us && total >= 5 && r.seasons.length >= 3) {
      const p1Peak = this._getPlayer(r.p1Id, us)?.careerBest ?? 999;
      const p2Peak = this._getPlayer(r.p2Id, us)?.careerBest ?? 999;
      if (p1Peak <= 3 && p2Peak <= 3) return 'THRONE_RIVALS';
    }

    // GIANT_KILLER — diff ranking >= 20, inferior vence >= 60%, 5+ matches
    if (us && total >= 5) {
      const p1Rank = this._getPlayer(r.p1Id, us)?.rankPosition ?? 99;
      const p2Rank = this._getPlayer(r.p2Id, us)?.rankPosition ?? 99;
      if (Math.abs(p1Rank - p2Rank) >= 20) {
        const lowerIsP1 = p1Rank > p2Rank;
        const lowerWins = lowerIsP1 ? winRate >= 0.60 : winRate <= 0.40;
        if (lowerWins) return 'GIANT_KILLER';
      }
    }

    // GRUDGE — 6+ matches, média >= 0.5 tiebreak sets por partida
    if (total >= 6 && r.tiebreakSets / total >= 0.50) return 'GRUDGE';

    // DOMINATION — 7+ matches, 75%+ para um lado
    if (total >= 7 && (winRate >= 0.75 || winRate <= 0.25)) return 'DOMINATION';

    return 'CLASSIC';
  }

  _calcIntensity(r, winRate) {
    let score = 0;

    // Base por partidas (satura devagar)
    score += Math.min(r.totalMatches / 15, 0.30);

    // Equilíbrio
    const balance = 1 - Math.abs(winRate - 0.5) * 2;
    score += balance * 0.18;

    // Tiebreak sets como indicador de drama
    score += Math.min(r.tiebreakSets / 8, 0.12);

    // Finais disputadas juntos
    score += Math.min(r.finalsMatches * 0.08, 0.20);

    // Prestígio acumulado
    score += Math.min(r.totalPrestige / 40, 0.14);

    // Longevidade em temporadas
    score += Math.min(r.seasons.length / 5, 0.12);

    // Bônus por tipo
    const typeBonus = {
      CLASSIC: 0.04, GRUDGE: 0.10, FINALS_CURSE: 0.12,
      GIANT_KILLER: 0.07, THRONE_RIVALS: 0.14, ERA_CLASH: 0.06, DOMINATION: 0.02,
    };
    score += typeBonus[r.type] || 0;

    return Math.min(parseFloat(score.toFixed(3)), 1.0);
  }

  _generateNarrative(r, us) {
    const p1    = this._getPlayer(r.p1Id, us);
    const p2    = this._getPlayer(r.p2Id, us);
    const n1    = p1?.name || `#${r.p1Id}`;
    const n2    = p2?.name || `#${r.p2Id}`;
    const total = r.totalMatches;
    const leaderW  = Math.max(r.p1Wins, r.p2Wins);
    const trailerW = Math.min(r.p1Wins, r.p2Wins);
    const leader   = r.p1Wins >= r.p2Wins ? n1 : n2;
    const trailer  = r.p1Wins >= r.p2Wins ? n2 : n1;

    switch (r.type) {
      case 'CLASSIC':
        return `${n1} e ${n2} se enfrentaram ${total} vezes em ${r.seasons.length} temporada${r.seasons.length !== 1 ? 's' : ''}, série ${r.p1Wins}–${r.p2Wins}. Nenhum confronto é previsível.`;
      case 'DOMINATION':
        return `${leader} domina o H2H com ${leaderW}–${trailerW} em ${total} partidas. ${trailer} ainda não encontrou a resposta certa.`;
      case 'GIANT_KILLER':
        return `O improvável virou rotina. O azarão acumulou ${leaderW}–${trailerW} em ${total} partidas — números que desafiam qualquer lógica de ranking.`;
      case 'GRUDGE':
        return `${r.tiebreakSets} sets foram para tiebreak em ${total} partidas. ${n1} e ${n2} tiram o máximo — e o mínimo — um do outro.`;
      case 'FINALS_CURSE':
        return `Quando ${n1} e ${n2} chegam juntos a uma final, parece escrito. Já aconteceu ${r.finalsMatches} vezes nos grandes palcos.`;
      case 'THRONE_RIVALS':
        return `Dois que já ocuparam o número 1 em eras distintas. ${n1} e ${n2} disputam não só partidas — disputam o legado.`;
      case 'ERA_CLASH':
        return `O veterano e o novo — ${total} confrontos em que gerações opostas decidiram a quem pertence o circuito.`;
      default:
        return `${n1} vs ${n2} — ${total} encontros, história em construção.`;
    }
  }

  // ══════════════════════════════════════════
  // CONTEXTO NARRATIVO — para o MatchNarrator
  // ══════════════════════════════════════════

  /**
   * Retorna um objeto rico de contexto para o MatchNarrator usar ao narrar
   * uma partida entre winnerId e loserId.
   *
   * DEVE ser chamado APÓS updateFromMatch(), pois os contadores já incluem
   * a partida atual — os campos "prior" subtraem 1 vitória do vencedor para
   * representar o H2H antes desta partida.
   *
   * @returns {object|null} null se não há histórico suficiente
   */
  getRivalryContext(winnerId, loserId) {
    const r   = this.getRivalry(winnerId, loserId);
    const enc = this._encounters.get(this._key(winnerId, loserId));

    // Sem histórico algum — primeiro encontro
    if (!r && (!enc || enc.total < 2)) return null;

    // ── Proto-rivalidade (encontros acumulados, ainda não graduada) ──
    if (!r) {
      return {
        graduated:       false,
        priorMatches:    enc.total - 1,  // exclui partida atual
        type:            null,
        status:          null,
        isFirstMeeting:  enc.total === 1,
        intensity:       0,
      };
    }

    // ── Rivalidade graduada ──────────────────────────────────────────
    const winnerIsP1 = winnerId === r.p1Id;

    // H2H depois desta partida (counters já atualizados)
    const winnerH2hWins = winnerIsP1 ? r.p1Wins : r.p2Wins;
    const loserH2hWins  = winnerIsP1 ? r.p2Wins : r.p1Wins;

    // H2H antes desta partida (subtrai a vitória recém-adicionada)
    const winnerPriorWins = winnerH2hWins - 1;
    const loserPriorWins  = loserH2hWins;
    const priorGap        = loserPriorWins - winnerPriorWins; // >0 = perdedor liderava

    // ── Sequência — leitura reversa dos keyMoments ───────────────────
    let streakHolder = null, streakLength = 0;
    for (let i = r.keyMoments.length - 1; i >= 0; i--) {
      const km = r.keyMoments[i];
      if (!km?.winnerId) continue;
      if (streakHolder === null) { streakHolder = km.winnerId; streakLength = 1; }
      else if (km.winnerId === streakHolder) streakLength++;
      else break;
    }

    const lastKM = r.keyMoments.length > 0 ? r.keyMoments[r.keyMoments.length - 1] : null;

    return {
      graduated: true,

      // Identidade da rivalidade
      type:          r.type,
      status:        r.status,
      intensity:     r.intensity,
      isLegendary:   r.status === 'LEGENDARY',
      isIntense:     r.status === 'INTENSE' || r.status === 'LEGENDARY',
      isBrewing:     r.status === 'BREWING',
      isFrozen:      r.status === 'FROZEN',

      // Volume
      totalMatches:  r.totalMatches,          // inclui partida atual
      priorMatches:  r.totalMatches - 1,       // antes desta partida
      finalsMatches: r.finalsMatches,
      tiebreakSets:  r.tiebreakSets,
      seasons:       r.seasons,
      longevity:     r.seasons.length,

      // H2H após esta partida
      winnerH2hWins,
      loserH2hWins,

      // H2H antes desta partida
      winnerPriorWins,
      loserPriorWins,
      priorGap,                                 // positivo = perdedor liderava o H2H

      // Posição relativa antes
      winnerWasLeader:  winnerPriorWins > loserPriorWins,
      winnerWasTrailer: winnerPriorWins < loserPriorWins,
      wasEven:          winnerPriorWins === loserPriorWins,

      // Posição relativa depois
      winnerLeadsNow: winnerH2hWins > loserH2hWins,
      tiedNow:        winnerH2hWins === loserH2hWins,

      // Sequência (apenas keyMoments — aproximação)
      streakHolder,
      streakLength,
      winnerOnStreak:    streakHolder === winnerId && streakLength >= 2,
      loserHadStreak:    streakHolder === loserId  && streakLength >= 2,
      winnerBrokeStreak: streakHolder === loserId  && streakLength >= 2,

      // Último momento marcante
      lastKeyMoment:     lastKM,
      lastKeyWasLoser:   lastKM?.winnerId === loserId,
      lastKeyWasWinner:  lastKM?.winnerId === winnerId,

      // Narrativa base (gerada pelo _generateNarrative)
      narrativeBase: r.narrative,
    };
  }

  // ══════════════════════════════════════════
  // HELPERS
  // ══════════════════════════════════════════

  _key(a, b) { return a < b ? `${a}_vs_${b}` : `${b}_vs_${a}`; }

  /**
   * Busca jogador no universeState.
   * Espera us.players: array com { id, name, age, rankPosition, careerBest }
   * onde careerBest é o melhor ranking já atingido pelo jogador.
   */
  _getPlayer(id, us) {
    if (!us) return null;
    try {
      if (us.players) return us.players.find(p => p.id === id) || null;
      if (us.getPlayerById) return us.getPlayerById(id);
    } catch { /* noop */ }
    return null;
  }

  // ══════════════════════════════════════════
  // SERIALIZAÇÃO
  // ══════════════════════════════════════════

  toJSON() {
    return {
      rivalries:   Array.from(this.rivalries.entries()),
      playerIndex: Array.from(this.playerIndex.entries()).map(([k, v]) => [k, Array.from(v)]),
      encounters:  Array.from(this._encounters.entries()).map(([k, v]) => [
        k, { ...v, seasons: Array.from(v.seasons) }
      ]),
    };
  }

  fromJSON(data) {
    if (!data) return;
    this.rivalries   = new Map(data.rivalries || []);
    this.playerIndex = new Map((data.playerIndex || []).map(([k, v]) => [k, new Set(v)]));
    this._encounters = new Map(
      (data.encounters || []).map(([k, v]) => [k, { ...v, seasons: new Set(v.seasons || []) }])
    );
    console.log(`⚔️ RivalrySystem restaurado: ${this.rivalries.size} rivalidades, ${this._encounters.size} proto-encontros`);
  }

  rebuildFromMatchHistory(matchHistory, universeState) {
    console.log(`⚔️ Reconstruindo rivalidades de ${matchHistory.length} partidas...`);
    this.rivalries   = new Map();
    this.playerIndex = new Map();
    this._encounters = new Map();
    matchHistory.forEach(m => this.updateFromMatch(m, universeState));
    console.log(`⚔️ ${this.rivalries.size} rivalidades graduadas (de ${this._encounters.size} pares encontrados)`);
  }
}

