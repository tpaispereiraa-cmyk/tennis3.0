// ============================================
// SERIESMANAGER.JSX - Gerenciador de Séries MD3/MD5
// ============================================
//
// FUNÇÃO:
// Orquestra séries completas (MD3 ou MD5) usando o sistema
// unificado de batalha. Controla placar, rounds, transições
// e declaração de vencedor da série.
//
// ✅ MODIFICADO COM MODO TURBO
//
// ============================================

import React, { useState, useEffect } from 'react';
import {
  PreBattleScreen,
  BattleArena,
  ReplayScreen,
  PostMatchScreen
} from './BattleComponents.jsx';
import { SkipButton, useSkipShortcut } from './UIComponents.jsx';
import { useSettings } from './SettingsContext';
import { useTurbo } from './TurboContext.jsx'; // ✅ NOVO

// ============================================
// 🔧 UTILITY: Comparação de IDs sem posição
// ============================================
const getBaseId = (id) => {
  if (!id) return '';
  // Converte para string se for número
  const idStr = typeof id === 'number' ? String(id) : id;
  return idStr.replace(/_pos\d+$/, '');
};

const idsMatch = (id1, id2) => {
  return getBaseId(id1) === getBaseId(id2);
};

const SeriesManager = ({
  format,           // "MD3" ou "MD5"
  team1,
  team2,
  arenas,           // Array de arenas pré-sorteadas
  onSeriesComplete, // Callback quando série termina
  onRoundComplete   // Callback após cada round (opcional)
}) => {
  
  const { getTransitionDelay, settings } = useSettings();
  const turbo = useTurbo(); // ✅ NOVO
  
  // ===== ESTADOS =====
  const [currentPhase, setCurrentPhase] = useState('INTRO'); 
  // Fases: INTRO → ROUND_INTRO → PRE → BATTLE → REPLAY → POST → (loop ou SERIES_VICTORY)
  
  const [currentRound, setCurrentRound] = useState(1);
  const [score, setScore] = useState({ team1: 0, team2: 0 });
  const [usedBeys, setUsedBeys] = useState({ team1: [], team2: [] });
  const [roundResults, setRoundResults] = useState([]);
  const [currentBattleBeys, setCurrentBattleBeys] = useState(null);
  const [lastBattleResult, setLastBattleResult] = useState(null);
  
  // ===== CONSTANTES =====
  const ROUNDS_TO_WIN = format === 'MD5' ? 3 : 2; // MD5 = 3 vitórias, MD3 = 2 vitórias
  const MAX_ROUNDS = format === 'MD5' ? 5 : 3;
  
  // ===== COMPUTED =====
  const seriesWinner = score.team1 >= ROUNDS_TO_WIN ? 'team1' 
                     : score.team2 >= ROUNDS_TO_WIN ? 'team2' 
                     : null;
  
  const seriesIsOver = seriesWinner !== null;
  
  // ===== ATALHO: Skip para próxima fase =====
  const handleSkip = () => {
    if (currentPhase === 'INTRO') {
      setCurrentPhase('ROUND_INTRO');
    } else if (currentPhase === 'ROUND_INTRO') {
      selectBeysForRound();
      setCurrentPhase('PRE');
    }
  };
  
  useSkipShortcut(handleSkip);
  
  // ===== EFEITO: Auto-advance em algumas fases =====
  useEffect(() => {
    if (currentPhase === 'INTRO') {
      const timer = setTimeout(() => {
        setCurrentPhase('ROUND_INTRO');
      }, turbo.turboEnabled ? turbo.getRoundIntroDelay() : getTransitionDelay());
      return () => clearTimeout(timer);
    }
    
    if (currentPhase === 'ROUND_INTRO') {
      const timer = setTimeout(() => {
        selectBeysForRound();
        setCurrentPhase('PRE');
      }, turbo.turboEnabled ? turbo.getRoundIntroDelay() : getTransitionDelay());
      return () => clearTimeout(timer);
    }

    // ✅ NOVO - Auto-avança SERIES_VICTORY em turbo (aqui para não violar Rules of Hooks)
    if (currentPhase === 'SERIES_VICTORY' && turbo.turboEnabled) {
      const timer = setTimeout(() => {
        handleSeriesVictoryComplete();
      }, turbo.getSeriesVictoryDelay());
      return () => clearTimeout(timer);
    }
  }, [currentPhase, getTransitionDelay, turbo]); // ✅ turbo nas dependências
  
  // ===== FUNÇÃO: Selecionar Beyblades para o Round =====
  const selectBeysForRound = () => {
    // Pega beyblades ainda não usados
    const availableTeam1 = team1.deck.filter(b => !usedBeys.team1.includes(b.id));
    const availableTeam2 = team2.deck.filter(b => !usedBeys.team2.includes(b.id));
    
    if (availableTeam1.length === 0 || availableTeam2.length === 0) {
      console.error('Sem beyblades disponíveis!');
      return;
    }
    
    // Seleção estratégica ou aleatória
    const bey1 = availableTeam1[Math.floor(Math.random() * availableTeam1.length)];
    const bey2 = availableTeam2[Math.floor(Math.random() * availableTeam2.length)];
    
    setCurrentBattleBeys({ bey1, bey2 });
    setUsedBeys(prev => ({
      team1: [...prev.team1, bey1.id],
      team2: [...prev.team2, bey2.id]
    }));
  };
  
  // ===== HANDLERS: Transições entre fases =====
  
  const handlePreBattleComplete = () => {
    setCurrentPhase('BATTLE');
  };
  
  const handleBattleComplete = (result) => {
    setLastBattleResult(result);
    // Pular replay se configurado OU se turbo ativo
    if (settings.skipReplay || turbo.turboEnabled) { // ✅ MODIFICADO
      setCurrentPhase('POST');
    } else {
      setCurrentPhase('REPLAY');
    }
  };
  
  const handleReplayComplete = () => {
    setCurrentPhase('POST');
  };
  
  const handlePostMatchComplete = () => {
    // Atualizar placar
    const winner = lastBattleResult.winner;
    
    // ========================================
    // COMPARAÇÃO MULTI-NÍVEL ROBUSTA
    // ========================================
    // Sistema de múltiplas verificações para garantir
    // que o vencedor seja identificado corretamente
    // Ordem: Referência > ID > Nome+Posição > Fallback
    
    let team1Won = false;
    
    // NÍVEL 1: Comparação de referência direta (mais confiável)
    if (winner === currentBattleBeys.bey1) {
      team1Won = true;
    } 
    else if (winner === currentBattleBeys.bey2) {
      team1Won = false;
    }
    // NÍVEL 2: Comparação por ID
    // 🔧 CORREÇÃO: Comparar IDs sem _pos
    else if (winner.id && currentBattleBeys.bey1.id && idsMatch(winner.id, currentBattleBeys.bey1.id)) {
      team1Won = true;
    }
    else if (winner.id && currentBattleBeys.bey2.id && idsMatch(winner.id, currentBattleBeys.bey2.id)) {
      team1Won = false;
    }
    // NÍVEL 3: Comparação por nome + posição no deck (mantém para fallback)
    else if (winner.name === currentBattleBeys.bey1.name && 
             winner.deckPosition === currentBattleBeys.bey1.deckPosition) {
      team1Won = true;
    }
    else if (winner.name === currentBattleBeys.bey2.name && 
             winner.deckPosition === currentBattleBeys.bey2.deckPosition) {
      team1Won = false;
    }
    // NÍVEL 4: Fallback - buscar no deck (com idsMatch)
    else {
      team1Won = team1.deck.some(b => idsMatch(b.id, winner.id));
      if (!team1Won && !team2.deck.some(b => idsMatch(b.id, winner.id))) {
        // Se não encontrar em nenhum deck, algo está muito errado
        console.error('❌ ERRO CRÍTICO: Vencedor não encontrado em nenhum deck!');
        console.error('Winner:', winner);
        console.error('Bey1:', currentBattleBeys.bey1);
        console.error('Bey2:', currentBattleBeys.bey2);
      }
    }
    
    const newScore = {
      team1: score.team1 + (team1Won ? 1 : 0),
      team2: score.team2 + (team1Won ? 0 : 1)
    };
    
    setScore(newScore);
    
    // Adicionar resultado aos rounds
    const roundResult = {
      round: currentRound,
      winner: team1Won ? 'team1' : 'team2',
      bey1: currentBattleBeys.bey1.name,
      bey2: currentBattleBeys.bey2.name,
      method: lastBattleResult.method,
      duration: lastBattleResult.duration,
      arena: arenas[currentRound - 1]
    };
    
    setRoundResults(prev => [...prev, roundResult]);
    
    // Callback opcional
    if (onRoundComplete) {
      onRoundComplete(roundResult);
    }
    
    // Verificar se série acabou
    const team1Wins = newScore.team1;
    const team2Wins = newScore.team2;
    
    if (team1Wins >= ROUNDS_TO_WIN || team2Wins >= ROUNDS_TO_WIN) {
      // Série acabou!
      setCurrentPhase('SERIES_VICTORY');
    } else {
      // Próximo round
      setCurrentRound(prev => prev + 1);
      setCurrentPhase('ROUND_INTRO');
    }
  };
  
  const handleSeriesVictoryComplete = () => {
    // Montar resultado final
    const finalResult = {
      winner: seriesWinner === 'team1' ? team1 : team2,
      loser: seriesWinner === 'team1' ? team2 : team1,
      score: score,
      roundResults: roundResults,
      format: format,
      totalDuration: roundResults.reduce((sum, r) => sum + r.duration, 0)
    };
    
    onSeriesComplete(finalResult);
  };
  
  // ===== RENDERIZAÇÃO =====
  
  // INTRO: Apresentação da série
  if (currentPhase === 'INTRO') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center">
        <div className="text-center space-y-8">
          <div className="text-6xl font-black text-white animate-pulse">
            {format} SERIES
          </div>
          
          <div className="flex items-center justify-center gap-16">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-400 mb-2">
                {team1.team?.name || 'Team 1'}
              </div>
              <div className="text-gray-400">
                {team1.deck?.length || 0} Beyblades
              </div>
            </div>
            
            <div className="text-5xl font-black text-white">VS</div>
            
            <div className="text-center">
              <div className="text-3xl font-bold text-red-400 mb-2">
                {team2.team?.name || 'Team 2'}
              </div>
              <div className="text-gray-400">
                {team2.deck?.length || 0} Beyblades
              </div>
            </div>
          </div>
          
          <div className="text-xl text-gray-300">
            First to {ROUNDS_TO_WIN} wins!
          </div>
          
          {!turbo.turboEnabled && ( // ✅ NOVO - Só mostra se não estiver em turbo
            <div className="text-sm text-gray-500 animate-pulse">
              Starting in 3...
            </div>
          )}
        </div>
        
        {!turbo.turboEnabled && <SkipButton onSkip={handleSkip} label="Skip Intro" />} {/* ✅ MODIFICADO */}
      </div>
    );
  }
  
  // ROUND_INTRO: Apresentação do round
  if (currentPhase === 'ROUND_INTRO') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 flex items-center justify-center">
        <div className="text-center space-y-8">
          <div className="text-7xl font-black text-white mb-4">
            ROUND {currentRound}
          </div>
          
          <div className="text-3xl text-gray-300">
            Score: <span className="text-blue-400">{score.team1}</span>
            {' - '}
            <span className="text-red-400">{score.team2}</span>
          </div>
          
          <div className="text-xl text-gray-400">
            Arena: <span className="text-yellow-400 font-bold">
              {arenas[currentRound - 1]}
            </span>
          </div>
          
          {!turbo.turboEnabled && ( // ✅ NOVO
            <div className="text-sm text-gray-500 animate-pulse mt-8">
              Get ready...
            </div>
          )}
        </div>
        
        {!turbo.turboEnabled && <SkipButton onSkip={handleSkip} label="Skip" />} {/* ✅ MODIFICADO */}
      </div>
    );
  }
  
  // PRE: PreBattleScreen
  if (currentPhase === 'PRE' && currentBattleBeys) {
    return (
      <PreBattleScreen
        team1={team1}
        team2={team2}
        bey1={currentBattleBeys.bey1}
        bey2={currentBattleBeys.bey2}
        md3State={{
          currentRound: currentRound,
          team1Wins: score.team1,
          team2Wins: score.team2,
          matchHistory: roundResults,
          arenaOrder: arenas,
          format: format
        }}
        onComplete={handlePreBattleComplete}
      />
    );
  }
  
  // BATTLE: BattleArena
  if (currentPhase === 'BATTLE' && currentBattleBeys) {
    return (
      <BattleArena
        bey1={currentBattleBeys.bey1}
        bey2={currentBattleBeys.bey2}
        onEnd={handleBattleComplete}
        md3State={{
          currentRound: currentRound,
          team1Wins: score.team1,
          team2Wins: score.team2,
          matchHistory: roundResults,
          team1: team1,
          team2: team2,
          arenaOrder: arenas,
          // Launch techniques padrão
          launch1: 'STANDARD',
          launch2: 'STANDARD',
          // Launch quality padrão - com propriedades corretas
          launchQuality1: { 
            key: 'STANDARD', 
            speedMod: 1.0, 
            spinMod: 1.0,
            burstRisk: 1.0,
            name: 'Lançamento Normal'
          },
          launchQuality2: { 
            key: 'STANDARD', 
            speedMod: 1.0, 
            spinMod: 1.0,
            burstRisk: 1.0,
            name: 'Lançamento Normal'
          }
        }}
      />
    );
  }
  
  // REPLAY: ReplayScreen
  if (currentPhase === 'REPLAY' && lastBattleResult) {
    return (
      <ReplayScreen
        result={lastBattleResult}
        onContinue={handleReplayComplete}
      />
    );
  }
  
  // POST: PostMatchScreen
  if (currentPhase === 'POST' && lastBattleResult) {
    return (
      <PostMatchScreen
        result={lastBattleResult}
        seriesContext={{
          isSeriesMatch: true,
          currentRound: currentRound,
          score: score,
          format: format
        }}
        onContinue={handlePostMatchComplete}
      />
    );
  }
  
  // SERIES_VICTORY: Vitória da série
  if (currentPhase === 'SERIES_VICTORY') {
    const winner = seriesWinner === 'team1' ? team1 : team2;
    const loser = seriesWinner === 'team1' ? team2 : team1;
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-yellow-900 to-gray-900 flex items-center justify-center">
        <div className="text-center space-y-8 max-w-4xl mx-auto px-8">
          <div className="text-8xl font-black text-yellow-400 mb-4 animate-pulse">
            VICTORY!
          </div>
          
          <div className="text-5xl font-bold text-white mb-8">
            {winner.team?.name || 'Winner'}
          </div>
          
          <div className="text-4xl text-gray-300">
            Final Score: 
            <span className={`ml-4 ${seriesWinner === 'team1' ? 'text-blue-400' : 'text-gray-500'}`}>
              {score.team1}
            </span>
            {' - '}
            <span className={`${seriesWinner === 'team2' ? 'text-red-400' : 'text-gray-500'}`}>
              {score.team2}
            </span>
          </div>
          
          {/* Round Recap */}
          <div className="mt-12 space-y-4">
            <div className="text-2xl text-gray-400 mb-4">Series Recap</div>
            {roundResults.map((round, idx) => (
              <div key={idx} className="bg-black/30 rounded-lg p-4 flex justify-between items-center">
                <div className="text-lg text-white">
                  Round {round.round}
                </div>
                <div className="text-sm text-gray-400">
                  {round.bey1} vs {round.bey2}
                </div>
                <div className={`text-lg font-bold ${
                  round.winner === 'team1' ? 'text-blue-400' : 'text-red-400'
                }`}>
                  {round.winner === 'team1' ? team1.team?.name : team2.team?.name}
                </div>
                <div className="text-xs text-gray-500">
                  {round.method}
                </div>
              </div>
            ))}
          </div>
          
          {!turbo.turboEnabled && ( // ✅ NOVO - Só mostra botão se não estiver em turbo
            <button
              onClick={handleSeriesVictoryComplete}
              className="mt-12 bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-500 hover:to-orange-500 text-white px-16 py-4 rounded-xl font-black text-2xl transform transition-all hover:scale-105"
            >
              CONTINUE
            </button>
          )}
        </div>
      </div>
    );
  }
  
  // Fallback
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="text-white text-2xl">Loading Series...</div>
    </div>
  );
};

export default SeriesManager;
