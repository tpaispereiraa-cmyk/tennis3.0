import React, { createContext, useContext, useState, useEffect } from 'react';

const SettingsContext = createContext();

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within SettingsProvider');
  }
  return context;
};

const DEFAULT_SETTINGS = {
  skipPreBattle: false,
  skipReplay: false,
  autoAdvance: true,
  transitionSpeed: 'normal', // 'slow', 'normal', 'fast', 'instant'
  showSkipButton: true
};

export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState(() => {
    // Carregar do localStorage se existir
    try {
      const saved = localStorage.getItem('beybladeGameSettings');
      return saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
    } catch (error) {
      console.error('Error loading settings:', error);
      return DEFAULT_SETTINGS;
    }
  });
  
  // Salvar no localStorage quando mudar
  useEffect(() => {
    try {
      localStorage.setItem('beybladeGameSettings', JSON.stringify(settings));
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  }, [settings]);
  
  const updateSetting = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };
  
  const resetSettings = () => {
    setSettings(DEFAULT_SETTINGS);
  };
  
  // Mapear velocidades para milissegundos
  const getTransitionDelay = () => {
    switch (settings.transitionSpeed) {
      case 'slow': return 3000;
      case 'normal': return 2000;
      case 'fast': return 1000;
      case 'instant': return 0;
      default: return 2000;
    }
  };
  
  return (
    <SettingsContext.Provider value={{
      settings,
      updateSetting,
      resetSettings,
      getTransitionDelay
    }}>
      {children}
    </SettingsContext.Provider>
  );
};
