// ============================================
// TURBOCONTEXT.JSX - Modo Turbo Automático
// ============================================
//
// FUNÇÃO:
// Acelera TODAS as batalhas ao máximo sem perder paridade
// Usa o MESMO motor (BattleComponents) mas em velocidade máxima
//
// USO:
// <TurboProvider turboEnabled={true}>
//   <SeriesManager ... />
// </TurboProvider>
//
// ============================================

import React, { createContext, useContext } from 'react';

const TurboContext = createContext({
  turboEnabled: false,
  getTurboMultiplier: () => 1,
  getIntroDelay: () => 2000,
  getCountdownDelay: () => 3000,
  getResultDelay: () => 3000,
  getTransitionDelay: () => 1000,
  shouldShowParticles: () => true,
  shouldShowTrails: () => true,
  shouldShowEffects: () => true,
  getRenderSkipFrames: () => 0
});

export const useTurbo = () => useContext(TurboContext);

export const TurboProvider = ({ children, turboEnabled = false }) => {
  
  // ===== MULTIPLICADORES DE VELOCIDADE =====
  
  // Multiplicador de física (quanto mais alto, mais rápido)
  // 1 = normal, 50 = 50x mais rápido
  const TURBO_PHYSICS_MULTIPLIER = turboEnabled ? 50 : 1;
  
  // ===== DELAYS (em milissegundos) =====
  
  // Modo Normal → Modo Turbo
  const INTRO_DELAY = turboEnabled ? 0 : 2000;           // 2s → 0s
  const COUNTDOWN_DELAY = turboEnabled ? 0 : 3000;       // 3s → 0s  
  const RESULT_DELAY = turboEnabled ? 100 : 3000;        // 3s → 0.1s
  const TRANSITION_DELAY = turboEnabled ? 50 : 1000;     // 1s → 0.05s
  const ROUND_INTRO_DELAY = turboEnabled ? 0 : 2000;     // 2s → 0s
  const SERIES_VICTORY_DELAY = turboEnabled ? 200 : 5000; // 5s → 0.2s
  
  // ===== EFEITOS VISUAIS =====
  
  // No turbo, reduz/remove efeitos pesados
  const SHOW_PARTICLES = !turboEnabled;     // Partículas desligadas em turbo
  const SHOW_TRAILS = !turboEnabled;        // Rastros desligados em turbo
  const SHOW_EFFECTS = !turboEnabled;       // Efeitos visuais desligados em turbo
  const RENDER_SKIP_FRAMES = turboEnabled ? 5 : 0; // Renderiza 1 a cada 5 frames
  
  const value = {
    turboEnabled,
    
    // Multiplicadores
    getTurboMultiplier: () => TURBO_PHYSICS_MULTIPLIER,
    
    // Delays
    getIntroDelay: () => INTRO_DELAY,
    getCountdownDelay: () => COUNTDOWN_DELAY,
    getResultDelay: () => RESULT_DELAY,
    getTransitionDelay: () => TRANSITION_DELAY,
    getRoundIntroDelay: () => ROUND_INTRO_DELAY,
    getSeriesVictoryDelay: () => SERIES_VICTORY_DELAY,
    
    // Efeitos visuais
    shouldShowParticles: () => SHOW_PARTICLES,
    shouldShowTrails: () => SHOW_TRAILS,
    shouldShowEffects: () => SHOW_EFFECTS,
    getRenderSkipFrames: () => RENDER_SKIP_FRAMES
  };
  
  return (
    <TurboContext.Provider value={value}>
      {children}
    </TurboContext.Provider>
  );
};

export default TurboProvider;
