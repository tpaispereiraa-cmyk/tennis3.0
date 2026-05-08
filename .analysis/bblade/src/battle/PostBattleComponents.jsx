// ============================================
// POST-BATTLE COMPONENTS
// Componentes de replay e resultados pós-batalha
// ============================================

import React, { useState } from 'react';
import { VictoryScreen } from '../VictoryScreen.jsx';
import { BattleHighlights } from '../BattleHighlights.jsx';
import { DetailedStats } from '../DetailedStats.jsx';

const ReplayScreen = ({ result, onContinue }) => {
  const [phase, setPhase] = useState('victory'); // victory -> highlights -> stats -> done
  
  // Calcular awards
  const awards = result?.replayData ? calculateAwards(result, result.replayData) : [];
  const replayDataWithAwards = { ...result?.replayData, awards };

  const handleFinalContinue = () => {
    setPhase('done');
    onContinue();
  };

  return (
    <>
      {phase === 'victory' && (
        <VictoryScreen 
          result={result}
          replayData={replayDataWithAwards}
          onContinue={() => setPhase('highlights')}
        />
      )}

      {phase === 'highlights' && (
        <BattleHighlights 
          replayData={replayDataWithAwards}
          onContinue={() => setPhase('stats')}
        />
      )}

      {phase === 'stats' && (
        <DetailedStats 
          replayData={replayDataWithAwards}
          onContinue={handleFinalContinue}
        />
      )}
    </>
  );
};

// Helper function
function calculateAwards(result, replayData) {
  const awards = [];
  const bey1Stats = replayData.bey1?.finalStats || {};
  const bey2Stats = replayData.bey2?.finalStats || {};
  
  // Most Aggressive
  if (bey1Stats.hits > bey2Stats.hits * 1.5) {
    awards.push({ 
      name: '⚔️ RELENTLESS AGGRESSOR', 
      winner: replayData.bey1?.name, 
      desc: `Landed ${bey1Stats.hits} hits vs ${bey2Stats.hits}` 
    });
  } else if (bey2Stats.hits > bey1Stats.hits * 1.5) {
    awards.push({ 
      name: '⚔️ RELENTLESS AGGRESSOR', 
      winner: replayData.bey2?.name, 
      desc: `Landed ${bey2Stats.hits} hits vs ${bey1Stats.hits}` 
    });
  }
  
  // Perfect Launch
  const launch1Quality = replayData.events?.find(e => e.type === 'LAUNCH')?.data?.quality1;
  const launch2Quality = replayData.events?.find(e => e.type === 'LAUNCH')?.data?.quality2;
  
  if (launch1Quality === 'PERFECT') {
    awards.push({ 
      name: '⭐ PERFECT LAUNCH', 
      winner: replayData.bey1?.name, 
      desc: 'Flawless launch technique' 
    });
  }
  if (launch2Quality === 'PERFECT') {
    awards.push({ 
      name: '⭐ PERFECT LAUNCH', 
      winner: replayData.bey2?.name, 
      desc: 'Flawless launch technique' 
    });
  }
  
  return awards;
}


const PostMatchScreen = ({ result, onContinue }) => {
  const isDraw = result?.method?.includes('Draw');
  const winnerName = isDraw ? 'DRAW' : (result?.winner?.name || 'Winner');
  const winnerType = result?.winner?.type || 'Balance';
  const winnerRotation = result?.winner?.rotation || 'Right';
  const winnerHits = result?.winnerStats?.hitsLanded || 0;
  const method = result?.method || 'Victory';
  const winnerIcon = result?.winnerIcon; // Custom icon if available

  return (
    <div className="h-screen bg-black flex items-center justify-center relative overflow-hidden">
      {/* Industrial grid */}
      <div className="absolute inset-0 opacity-5" style={{
        backgroundImage: 'linear-gradient(#333 2px, transparent 2px), linear-gradient(90deg, #333 2px, transparent 2px)',
        backgroundSize: '100px 100px'
      }}></div>
      
      <div className="text-center max-w-2xl relative z-10">
        {isDraw ? (
          <>
            <h1 className="text-7xl font-black text-orange-500 mb-4 border-8 border-orange-500 inline-block px-8 py-4">⚖️ DRAW</h1>
            <h2 className="text-4xl font-black text-gray-400 mb-4">STALEMATE</h2>
          </>
        ) : (
          <>
            <h1 className="text-7xl font-black text-orange-500 mb-4 border-8 border-orange-500 inline-block px-8 py-4">WINNER</h1>
            {winnerIcon ? (
              <div className="flex justify-center mb-4">
                <div 
                  className="w-32 h-32 rounded-full border-8 border-orange-500 overflow-hidden"
                  style={{ backgroundColor: result?.winner?.color || '#f97316' }}
                >
                  <img 
                    src={winnerIcon} 
                    alt={winnerName}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            ) : null}
            <h2 className="text-5xl font-black text-gray-300 mb-4">{winnerName}</h2>
          </>
        )}
        
        <div className="mb-8 bg-gray-900 border-2 border-gray-800 p-6">
          <p className="text-3xl text-gray-400 mb-2 font-black">
            {isDraw ? method : `Victory by ${method}`}
          </p>
          <div className="text-sm text-gray-600 mt-4 font-mono bg-black p-3 border border-gray-800">
            {method === 'Burst Finish' && '💥 Beyblade exploded after critical damage accumulation'}
            {method === 'Spin Finish' && '⚡ Opponent lost all rotation and stopped spinning'}
            {method === 'Ring-Out Finish' && '🚀 Opponent was launched out of the arena at high velocity'}
            {method === 'Over Finish' && '🌀 Opponent lost balance and tipped over inside arena'}
            {method.includes('Draw') && '⚖️ Both Beyblades stopped/exited/burst simultaneously'}
          </div>
        </div>
        
        {!isDraw && (
          <div className="grid grid-cols-3 gap-4 mb-8 text-white text-sm">
            <div className="bg-gray-900 p-3 border-2 border-gray-800">
              <div className="text-gray-600 text-xs font-mono">TYPE</div>
              <div className="font-bold text-gray-300">{winnerType}</div>
            </div>
            <div className="bg-gray-900 p-3 border-2 border-gray-800">
              <div className="text-gray-600 text-xs font-mono">ROTATION</div>
              <div className="font-bold text-gray-300">{winnerRotation}</div>
            </div>
            <div className="bg-gray-900 p-3 border-2 border-gray-800">
              <div className="text-gray-600 text-xs font-mono">HITS</div>
              <div className="font-bold text-gray-300">{winnerHits}</div>
            </div>
          </div>
        )}
        
        <button 
          onClick={onContinue}
          className="bg-orange-500 text-black px-12 py-4 font-black text-2xl hover:bg-orange-600 transition border-2 border-orange-600"
        >
          CONTINUE
        </button>
      </div>
    </div>
  );
};


export { ReplayScreen, PostMatchScreen };
