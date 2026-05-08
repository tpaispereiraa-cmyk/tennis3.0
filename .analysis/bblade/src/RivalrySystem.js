// ============================================
// RIVALRYSYSTEM.JS — v2.0
// ============================================
//
// FILOSOFIA v2.0:
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
//  GRUDGE         — tie-breaks constantes, guerra de atrito
//  FINALS_CURSE   — destino repetido nos palcos máximos
//  THRONE_RIVALS  — dois que já ocuparam o topo em momentos distintos
//  ERA_CLASH      — gap geracional >= 8 anos, passado vs futuro
// ============================================

import { TEAMS } from './data.js';

const TIER_PRESTIGE = {
  KINGS_COURT: 5, GRAND_FINALS: 5, PREMIER: 4,
  MASTERS: 3, CHALLENGER: 2, REDEMPTION: 1,
};

const MAX_RIVALRIES_PER_PLAYER = 5;

export const RIVALRY_TYPES = {
  CLASSIC:      { id: 'CLASSIC',      label: 'Clássica',            icon: '⚔️',  color: '#ffd700', desc: 'Duelo equilibrado — qualquer resultado é possível'         },
  DOMINATION:   { id: 'DOMINATION',   label: 'Dominância',          icon: '👑',  color: '#ef4444', desc: 'Um lado controla o confronto com mão de ferro'             },
  GIANT_KILLER: { id: 'GIANT_KILLER', label: 'Caçador de Gigantes', icon: '🎯',  color: '#22c55e', desc: 'O menor derruba o maior — história de David e Golias'      },
  GRUDGE:       { id: 'GRUDGE',       label: 'Rancor',              icon: '🔥',  color: '#f97316', desc: 'Cada ponto vale sangue — partidas no limite sempre'         },
  FINALS_CURSE: { id: 'FINALS_CURSE', label: 'Maldição das Finais', icon: '🏆',  color: '#c084fc', desc: 'O destino os coloca frente a frente quando tudo importa'   },
  THRONE_RIVALS:{ id: 'THRONE_RIVALS',label: 'Rivais do Trono',     icon: '💎',  color: '#06b6d4', desc: 'Dois reis disputam a mesma coroa em eras distintas'         },
  ERA_CLASH:    { id: 'ERA_CLASH',    label: 'Choque de Eras',      icon: '🌀',  color: '#a855f7', desc: 'O passado enfrenta o futuro em batalha pelo legado'         },
};

export const RIVALRY_STATUS = {
  BREWING:   { label: 'Emergindo',  color: '#94a3b8' },
  ACTIVE:    { label: 'Ativa',      color: '#22c55e' },
  INTENSE:   { label: 'Intensa',    color: '#f97316' },
  LEGENDARY: { label: 'Lendária',   color: '#ffd700' },
  FROZEN:    { label: 'Encerrada',  color: '#60a5fa' },
};

// ────────────────────────────────────────────────────────────────
export class RivalrySystem {
  constructor() {
    this.rivalries   = new Map(); // key -> rivalry obj (apenas graduadas)
    this.playerIndex = new Map(); // playerId -> Set<key>
    this._encounters = new Map(); // key -> proto-encounter (leve, pre-graduacao)
    console.log('⚔️ RivalrySystem v2.0 inicializado');
  }

  // ══════════════════════════════════════════
  // ALIMENTAÇÃO — chamado após cada match
  // ══════════════════════════════════════════

  updateFromMatch(matchRecord, universeManager) {
    const { player1Id, player2Id, winnerId, round, tier, score, season } = matchRecord;

    if (player1Id === undefined || player2Id === undefined) return;
    if (player1Id === player2Id) return;

    const key = this._key(player1Id, player2Id);
    const p1  = player1Id < player2Id ? player1Id : player2Id;
    const p2  = player1Id < player2Id ? player2Id : player1Id;

    const prestige = TIER_PRESTIGE[tier] || 1;
    const isFinal  = round === 'F' || round === 'FINAL' || round === 'CHAMPION';
    const isTie    = score && (
      (score.playerA === 2 && score.playerB === 1) ||
      (score.playerA === 1 && score.playerB === 2)
    );

    // ── Atualizar proto-buffer ──
    if (!this._encounters.has(key)) {
      this._encounters.set(key, {
        p1Id: p1, p2Id: p2,
        total: 0, finalsCount: 0, tieBreaks: 0,
        highPrestigeCount: 0,
        seasons: new Set(),
        lastYear: null,
      });
    }
    const enc = this._encounters.get(key);
    enc.total++;
    if (isFinal)       enc.finalsCount++;
    if (isTie)         enc.tieBreaks++;
    if (prestige >= 3) enc.highPrestigeCount++;
    if (season !== undefined) enc.seasons.add(season);
    enc.lastYear = universeManager?.currentYear || enc.lastYear;

    // ── Se já graduada, atualizar ──
    if (this.rivalries.has(key)) {
      this._updateRivalry(key, matchRecord, universeManager, prestige, isFinal, isTie);
      return;
    }

    // ── Checar graduação ──
    if (this._shouldGraduate(enc)) {
      this._graduateRivalry(key, p1, p2, universeManager);
      this._updateRivalry(key, matchRecord, universeManager, prestige, isFinal, isTie);
      this._enforcePlayerCap(p1);
      this._enforcePlayerCap(p2);
    }
  }

  // ── Critérios de graduação (basta UM) ──
  _shouldGraduate(enc) {
    if (enc.total >= 5) return true;
    if (enc.finalsCount >= 3) return true;
    if (enc.highPrestigeCount >= 4) return true;
    if (enc.total >= 3 && enc.tieBreaks >= 2 && enc.highPrestigeCount >= 3) return true;
    return false;
  }

  // ── Criar rivalidade graduada, reconstruindo H2H do histórico ──
  _graduateRivalry(key, p1Id, p2Id, um) {
    const enc = this._encounters.get(key);
    const r = {
      key, p1Id, p2Id,
      p1Wins: 0, p2Wins: 0,
      p1FinalWins: 0, p2FinalWins: 0,
      totalMatches: 0, finalsMatches: 0,
      tieBreaks: 0, totalPrestige: 0,
      seasons: enc ? Array.from(enc.seasons) : [],
      lastSeason: null, lastYear: enc?.lastYear || null,
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

    // Reconstruir H2H do matchHistory
    if (um?.matchHistory) {
      um.matchHistory.forEach(m => {
        if (this._key(m.player1Id, m.player2Id) !== key) return;
        const mp   = TIER_PRESTIGE[m.tier] || 1;
        const mFin = m.round === 'F' || m.round === 'FINAL' || m.round === 'CHAMPION';
        const mTie = m.score && (
          (m.score.playerA === 2 && m.score.playerB === 1) ||
          (m.score.playerA === 1 && m.score.playerB === 2)
        );
        this._applyMatchToRivalry(r, m.player1Id, m.player2Id, m.winnerId,
          m.round, m.tier, m.score, m.season, um?.currentYear, mp, mFin, mTie);
      });
    }

    this._recalculate(r, um);
    console.log(`⚔️ Rivalidade GRADUADA: ${p1Id} vs ${p2Id} (${r.type} · ${r.totalMatches} partidas)`);

    // 🧬 TRAIT DNA: marco de rivalidade formada
    try { if (um?._processRivalryMilestone) um._processRivalryMilestone(p1Id, p2Id); } catch(e) { /* noop */ }
  }

  _updateRivalry(key, matchRecord, um, prestige, isFinal, isTie) {
    const r = this.rivalries.get(key);
    if (!r || r.status === 'FROZEN') return;
    const { player1Id, player2Id, winnerId, round, tier, score, season } = matchRecord;
    this._applyMatchToRivalry(r, player1Id, player2Id, winnerId,
      round, tier, score, season, um?.currentYear, prestige, isFinal, isTie);
    this._recalculate(r, um);
  }

  _applyMatchToRivalry(r, p1id, p2id, winnerId, round, tier, score, season, year, prestige, isFinal, isTie) {
    const p1Won = winnerId === r.p1Id;
    if (p1Won) r.p1Wins++; else r.p2Wins++;
    r.totalMatches++;
    if (isFinal) { r.finalsMatches++; if (p1Won) r.p1FinalWins++; else r.p2FinalWins++; }
    if (isTie)   r.tieBreaks++;
    r.totalPrestige += prestige;
    if (season !== undefined && !r.seasons.includes(season)) r.seasons.push(season);
    r.lastSeason = season;
    r.lastYear   = year || r.lastYear;

    if (isFinal || prestige >= 4 || isTie) {
      r.keyMoments.push({ year, season, round, tier, winnerId, score, isFinal, isTie, prestige });
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

  pruneStale(currentYear) {
    let pruned = 0;
    for (const [key, r] of this.rivalries.entries()) {
      if (r.status === 'FROZEN' || r.status === 'LEGENDARY') continue;
      const yearsInactive = currentYear - (r.lastYear || currentYear);
      if (r.intensity < 0.15 && r.totalMatches < 5 && yearsInactive >= 2) {
        this._removeRivalry(key);
        pruned++;
      }
    }
    // Limpar encounter buffer antigo não-graduado
    for (const [key, enc] of this._encounters.entries()) {
      if (this.rivalries.has(key)) continue;
      const yearsInactive = currentYear - (enc.lastYear || currentYear);
      if (enc.total < 3 && yearsInactive >= 3) {
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

  _recalculate(r, um) {
    if (r.totalMatches === 0) return;
    const winRate   = r.p1Wins / r.totalMatches;
    r.type          = this._detectType(r, winRate, um);
    r.intensity     = this._calcIntensity(r, winRate);

    if (r.status !== 'FROZEN') {
      if      (r.intensity >= 0.80 && r.totalMatches >= 12 && r.seasons.length >= 3) r.status = 'LEGENDARY';
      else if (r.intensity >= 0.55 && r.totalMatches >= 8)  r.status = 'INTENSE';
      else if (r.intensity >= 0.30 && r.totalMatches >= 5)  r.status = 'ACTIVE';
      else                                                   r.status = 'BREWING';
    }

    r.narrative = this._generateNarrative(r, um);
  }

  _detectType(r, winRate, um) {
    const total = r.totalMatches;

    // ERA_CLASH — gap >= 8 anos + 5+ matches + 2+ temporadas
    if (um && total >= 5 && r.seasons.length >= 2) {
      const p1 = this._getPlayer(r.p1Id, um);
      const p2 = this._getPlayer(r.p2Id, um);
      if (p1?.age && p2?.age && Math.abs(p1.age - p2.age) >= 8) return 'ERA_CLASH';
    }

    // FINALS_CURSE — 3+ encontros em finais
    if (r.finalsMatches >= 3) return 'FINALS_CURSE';

    // THRONE_RIVALS — ambos peak <= 3 + 5+ matches + 3+ temporadas
    if (um && total >= 5 && r.seasons.length >= 3) {
      const p1Peak = this._getPlayer(r.p1Id, um)?.careerPeak?.ranking || 999;
      const p2Peak = this._getPlayer(r.p2Id, um)?.careerPeak?.ranking || 999;
      if (p1Peak <= 3 && p2Peak <= 3) return 'THRONE_RIVALS';
    }

    // GIANT_KILLER — diff ranking >= 20, inferior vence >= 60%, 5+ matches
    if (um && total >= 5) {
      const rankings = um.getBBPRanking?.() || [];
      const p1Rank = rankings.findIndex(x => x.playerId === r.p1Id) + 1 || 99;
      const p2Rank = rankings.findIndex(x => x.playerId === r.p2Id) + 1 || 99;
      if (Math.abs(p1Rank - p2Rank) >= 20) {
        const lowerIsP1 = p1Rank > p2Rank;
        const lowerWins = lowerIsP1 ? winRate >= 0.60 : winRate <= 0.40;
        if (lowerWins) return 'GIANT_KILLER';
      }
    }

    // GRUDGE — 6+ matches, 50%+ tie-breaks
    if (total >= 6 && r.tieBreaks / total >= 0.50) return 'GRUDGE';

    // DOMINATION — 7+ matches, 75%+ para um lado
    if (total >= 7 && (winRate >= 0.75 || winRate <= 0.25)) return 'DOMINATION';

    return 'CLASSIC';
  }

  _calcIntensity(r, winRate) {
    let score = 0;

    // Base por partidas — satura mais devagar (divisor 15 vs antigo 8)
    score += Math.min(r.totalMatches / 15, 0.30);

    // Equilíbrio
    const balance = 1 - Math.abs(winRate - 0.5) * 2;
    score += balance * 0.18;

    // Tie-breaks
    score += Math.min(r.tieBreaks / 6, 0.12);

    // Finais
    score += Math.min(r.finalsMatches * 0.08, 0.20);

    // Prestígio acumulado
    score += Math.min(r.totalPrestige / 40, 0.14);

    // Longevidade
    score += Math.min(r.seasons.length / 5, 0.12);

    // Bônus por tipo
    const typeBonus = {
      CLASSIC: 0.04, GRUDGE: 0.10, FINALS_CURSE: 0.12,
      GIANT_KILLER: 0.07, THRONE_RIVALS: 0.14, ERA_CLASH: 0.06, DOMINATION: 0.02,
    };
    score += typeBonus[r.type] || 0;

    return Math.min(parseFloat(score.toFixed(3)), 1.0);
  }

  _generateNarrative(r, um) {
    const p1    = this._getPlayer(r.p1Id, um);
    const p2    = this._getPlayer(r.p2Id, um);
    const n1    = p1?.name || `#${r.p1Id}`;
    const n2    = p2?.name || `#${r.p2Id}`;
    const total = r.totalMatches;
    const leaderW  = Math.max(r.p1Wins, r.p2Wins);
    const trailerW = Math.min(r.p1Wins, r.p2Wins);
    const leader   = r.p1Wins >= r.p2Wins ? n1 : n2;
    const trailer  = r.p1Wins >= r.p2Wins ? n2 : n1;

    switch (r.type) {
      case 'CLASSIC':
        return `${n1} e ${n2} se encontraram ${total} vezes em ${r.seasons.length} temporada${r.seasons.length !== 1 ? 's' : ''}, com série ${r.p1Wins}–${r.p2Wins}. Nenhum torneio em que ambos estão é previsível.`;
      case 'DOMINATION':
        return `${leader} domina o confronto direto com ${leaderW}–${trailerW} em ${total} partidas. ${trailer} ainda não encontrou a resposta certa.`;
      case 'GIANT_KILLER':
        return `O improvável virou rotina. O azarão acumulou ${leaderW}–${trailerW} em ${total} partidas — números que desafiam qualquer lógica de ranking.`;
      case 'GRUDGE':
        return `${r.tieBreaks} de ${total} partidas foram decididas no último round. ${n1} e ${n2} tiram o melhor e o pior um do outro, sem exceção.`;
      case 'FINALS_CURSE':
        return `Quando ${n1} e ${n2} chegam juntos a uma final, parece inevitável que se encontrem. Já foi assim ${r.finalsMatches} vezes nos grandes palcos.`;
      case 'THRONE_RIVALS':
        return `Dois que ocuparam o topo em momentos diferentes. ${n1} e ${n2} disputam não só partidas — disputam qual nome fica para a história.`;
      case 'ERA_CLASH':
        return `O veterano e o novo — ${total} confrontos em que gerações opostas decidiram a quem pertence o presente do circuito.`;
      default:
        return `${n1} vs ${n2} — ${total} encontros, história em construção.`;
    }
  }

  // ══════════════════════════════════════════
  // HELPERS
  // ══════════════════════════════════════════

  _key(a, b) { return a < b ? `${a}_vs_${b}` : `${b}_vs_${a}`; }

  _getPlayer(id, um) {
    if (!um) return TEAMS[id] || null;
    try { return um.getPlayerById ? um.getPlayerById(id) : (TEAMS[id] || null); }
    catch { return TEAMS[id] || null; }
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
    console.log(`⚔️ RivalrySystem v2.0 restaurado: ${this.rivalries.size} rivalidades, ${this._encounters.size} proto-encontros`);
  }

  rebuildFromMatchHistory(matchHistory, universeManager) {
    console.log(`⚔️ Reconstruindo rivalidades de ${matchHistory.length} partidas...`);
    this.rivalries   = new Map();
    this.playerIndex = new Map();
    this._encounters = new Map();
    matchHistory.forEach(m => this.updateFromMatch(m, universeManager));
    console.log(`⚔️ ${this.rivalries.size} rivalidades graduadas (de ${this._encounters.size} pares encontrados)`);
  }
}
