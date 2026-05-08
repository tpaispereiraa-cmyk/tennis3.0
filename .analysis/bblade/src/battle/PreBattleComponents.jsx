// ============================================
// PRE-BATTLE COMPONENTS
// Componentes da fase pré-batalha
// ============================================

import React, { useState, useEffect } from 'react';
import { determineLaunchQuality } from '../UniverseManager.js';
import { useTurbo } from '../TurboContext.jsx';
import { TacticalAnalysis } from '../PreBattleAnalysis.jsx';

const PreBattleScreen = ({ team1, team2, bey1, bey2, md3State, onComplete }) => {
  const turbo = useTurbo();
  const [launchQuality1, setLaunchQuality1] = useState(null);
  const [launchQuality2, setLaunchQuality2] = useState(null);
  
  useEffect(() => {
    const launchPower1 = team1?.attributes?.launchPower || 5;
    const launchPower2 = team2?.attributes?.launchPower || 5;
    
    const quality1 = determineLaunchQuality(launchPower1);
    const quality2 = determineLaunchQuality(launchPower2);
    setLaunchQuality1(quality1);
    setLaunchQuality2(quality2);
    
    if (md3State) {
      md3State.launchQuality1 = quality1;
      md3State.launchQuality2 = quality2;
    }
    
    // Auto-skip em turbo
    if (turbo.turboEnabled) {
      const timer = setTimeout(() => {
        onComplete();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [turbo, onComplete]);

  return (
    <div className="relative">
      <TacticalAnalysis 
        bey1={bey1}
        bey2={bey2}
        md3State={md3State}
        onComplete={onComplete}
      />
    </div>
  );
};

export { PreBattleScreen };
