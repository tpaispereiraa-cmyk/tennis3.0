// ============================================
// WAR ROOM DATA COLLECTOR - Hook de Coleta
// ============================================
//
// FUNÇÃO:
// Hook React que coleta dados das batalhas em tempo real
// para alimentar o War Room Overlay durante simulações turbo
//
// USO:
// const warRoomData = useWarRoomData();
// warRoomData.startPhase('Oitavas de Final', 8);
// warRoomData.recordMatch(result);
//
// ============================================

import { useState, useCallback, useRef } from 'react';

export const useWarRoomData = () => {
  const [isActive, setIsActive] = useState(false);
  const [phase, setPhase] = useState('');
  const [totalMatches, setTotalMatches] = useState(0);
  const [completedMatches, setCompletedMatches] = useState(0);
  const [currentMatch, setCurrentMatch] = useState(null);
  const [recentResults, setRecentResults] = useState([]);
  const [stats, setStats] = useState({
    burstWins: 0,
    spinWins: 0,
    ringOutWins: 0,
    upsets: 0,
    perfects: 0
  });

  // Ref para tracking de tempo
  const phaseStartTime = useRef(null);

  /**
   * Inicia uma nova fase de simulação
   * @param {string} phaseName - Nome da fase (ex: "Oitavas de Final")
   * @param {number} matchCount - Total de partidas na fase
   */
  const startPhase = useCallback((phaseName, matchCount) => {
    console.log(`[War Room] Iniciando fase: ${phaseName} (${matchCount} partidas)`);
    
    setIsActive(true);
    setPhase(phaseName);
    setTotalMatches(matchCount);
    setCompletedMatches(0);
    setCurrentMatch(null);
    setRecentResults([]);
    setStats({
      burstWins: 0,
      spinWins: 0,
      ringOutWins: 0,
      upsets: 0,
      perfects: 0
    });
    phaseStartTime.current = Date.now();
  }, []);

  /**
   * Registra o início de uma partida
   * @param {object} match - Dados da partida (player1, player2, etc)
   */
  const startMatch = useCallback((match) => {
    console.log(`[War Room] Iniciando partida:`, match);
    setCurrentMatch(match);
  }, []);

  /**
   * Registra o resultado de uma partida completada
   * @param {object} result - Resultado da batalha
   */
  const recordMatch = useCallback((result) => {
    console.log(`[War Room] Registrando resultado:`, result);

    // ⚠️ IMPORTANTE: Não chamar setters de estado DENTRO de outro setter.
    // React Strict Mode executa updaters duas vezes em dev, causando entradas duplicadas.
    // Todos os setters devem ser chamados no mesmo nível (fora de outros updaters).

    // Extrair dados do resultado
    const winner = result.winner?.name || 'Unknown';
    const loser  = result.loser?.name  || 'Unknown';
    const score  = result.score || '0-0';
    const rounds = result.rounds || [];

    // 🔥 UPSET: Diferença de ranking ≥ 15
    const isUpset = result.isUpset || false;

    // 👑 PERFECT: Se perdedor não venceu nenhum set
    const [, loserScore] = score.split('-').map(Number);
    const isPerfect = loserScore === 0;

    // 💥 Contar tipos de vitória por ROUND
    let burstWins = 0;
    let spinWins  = 0;
    let ringOutWins = 0;

    rounds.forEach(round => {
      if (round.method) {
        if (round.method.includes('Burst'))                                  burstWins++;
        else if (round.method.includes('Spin'))                              spinWins++;
        else if (round.method.includes('Ring-Out') || round.method.includes('Over')) ringOutWins++;
      }
    });

    // Incrementar contador de partidas concluídas
    setCompletedMatches(prev => prev + 1);

    // Adicionar ao feed (matchNumber = tamanho atual + 1)
    setRecentResults(prev => {
      const matchNumber = prev.length + 1;
      const feedItem = {
        uid: `${Date.now()}-${matchNumber}-${Math.random().toString(36).slice(2,7)}`,
        matchNumber,
        winner,
        loser,
        score,
        isUpset,
        isPerfect,
        burstWins,
        spinWins,
        ringOutWins
      };
      return [...prev, feedItem];
    });

    // Atualizar estatísticas
    setStats(prevStats => ({
      burstWins:   prevStats.burstWins   + burstWins,
      spinWins:    prevStats.spinWins    + spinWins,
      ringOutWins: prevStats.ringOutWins + ringOutWins,
      upsets:      prevStats.upsets      + (isUpset   ? 1 : 0),
      perfects:    prevStats.perfects    + (isPerfect  ? 1 : 0)
    }));

    setCurrentMatch(null);
  }, []);

  /**
   * Finaliza a fase de simulação
   */
  const endPhase = useCallback(() => {
    console.log(`[War Room] Finalizando fase: ${phase}`);
    
    const duration = phaseStartTime.current 
      ? (Date.now() - phaseStartTime.current) / 1000 
      : 0;
    
    console.log(`[War Room] Tempo total: ${duration.toFixed(2)}s`);
    console.log(`[War Room] Estatísticas finais:`, stats);
    
    setIsActive(false);
    phaseStartTime.current = null;
  }, [phase, stats]);

  /**
   * Reseta todos os dados (útil para cancelamentos)
   */
  const reset = useCallback(() => {
    console.log(`[War Room] Resetando dados`);
    setIsActive(false);
    setPhase('');
    setTotalMatches(0);
    setCompletedMatches(0);
    setCurrentMatch(null);
    setRecentResults([]);
    setStats({
      burstWins: 0,
      spinWins: 0,
      ringOutWins: 0,
      upsets: 0,
      perfects: 0
    });
    phaseStartTime.current = null;
  }, []);

  return {
    // Estado
    isActive,
    phase,
    totalMatches,
    completedMatches,
    currentMatch,
    recentResults,
    stats,
    
    // Métodos
    startPhase,
    startMatch,
    recordMatch,
    endPhase,
    reset
  };
};

/**
 * Utilidade: Extrai dados relevantes de um resultado de batalha
 * para o formato esperado pelo War Room
 */
export const formatBattleResultForWarRoom = (battleResult, matchData = {}) => {
  if (!battleResult) return null;

  // Nome dos jogadores
  const winner = battleResult.winner?.name || 'Unknown';
  const loser = battleResult.loser?.name || 'Unknown';

  // Placar (se disponível)
  let score = '0-0';
  if (battleResult.score) {
    score = battleResult.score;
  } else if (battleResult.winner?.roundsWon !== undefined && battleResult.loser?.roundsWon !== undefined) {
    score = `${battleResult.winner.roundsWon}-${battleResult.loser.roundsWon}`;
  }

  // Detectar upset
  // Você pode adicionar lógica mais complexa aqui baseado em rankings, seeds, etc
  const isUpset = matchData.isUpset || false;

  // Detectar perfect
  const isPerfect = battleResult.winner?.health === 100 || 
                   battleResult.winner?.roundsWon === battleResult.totalRounds;

  // Estatísticas
  const maxCombo = battleResult.maxCombo || 
                  battleResult.highestCombo || 
                  battleResult.winner?.maxCombo || 
                  0;

  const duration = battleResult.duration || 
                  battleResult.battleDuration || 
                  battleResult.totalTime || 
                  0;

  return {
    winner,
    loser,
    score,
    isUpset,
    isPerfect,
    maxCombo,
    duration
  };
};

export default useWarRoomData;
