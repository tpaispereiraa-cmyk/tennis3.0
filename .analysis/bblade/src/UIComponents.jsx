// ============================================
// UICOMPONENTS.JSX - Componentes UI Reutilizáveis
// ============================================

import React from 'react';
import { SkipForward } from 'lucide-react';
import { useSettings } from './SettingsContext';

// Botão Skip Universal
export const SkipButton = ({ onSkip, label = 'Skip' }) => {
  const { settings } = useSettings();
  
  if (!settings.showSkipButton) return null;
  
  return (
    <button
      onClick={onSkip}
      className="
        fixed bottom-8 right-8 z-50
        bg-black/70 hover:bg-black/90
        text-white px-6 py-3 rounded-lg
        font-bold text-sm
        flex items-center gap-2
        transform transition-all hover:scale-105
        border border-white/20
      "
    >
      <SkipForward size={20} />
      {label}
    </button>
  );
};

// Hook para atalho de teclado Skip
export const useSkipShortcut = (onSkip) => {
  React.useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.key === ' ' || e.key === 'Escape') {
        e.preventDefault();
        onSkip();
      }
    };
    
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [onSkip]);
};

// Componente de Card de Time
export const TeamCard = ({ team, onClick, selected }) => {
  return (
    <div
      onClick={onClick}
      className={`
        relative p-4 rounded-xl cursor-pointer transition-all duration-300
        ${selected ? 'ring-4 ring-yellow-400 scale-105' : 'hover:scale-102'}
        bg-gradient-to-br from-gray-800 to-gray-900
        border-2 ${selected ? 'border-yellow-400' : 'border-gray-700'}
      `}
      style={{
        boxShadow: selected ? '0 0 30px rgba(251, 191, 36, 0.4)' : 'none'
      }}
    >
      <div className="flex items-center gap-3">
        <img
          src={team.photoUrl}
          alt={team.name}
          className="w-16 h-16 rounded-full object-cover border-2 border-gray-600"
        />
        <div className="flex-1">
          <h3 className="text-white font-bold text-lg">{team.name}</h3>
          <p className="text-gray-400 text-sm">{team.country}</p>
        </div>
      </div>
    </div>
  );
};

// Componente de Barra de Atributo
export const AttributeBar = ({ label, value, maxValue = 10, color = 'blue' }) => {
  const percentage = (value / maxValue) * 100;
  const colorMap = {
    blue: 'bg-blue-500',
    red: 'bg-red-500',
    green: 'bg-green-500',
    yellow: 'bg-yellow-500',
    purple: 'bg-purple-500'
  };
  
  return (
    <div className="mb-2">
      <div className="flex justify-between text-sm mb-1">
        <span className="text-gray-300">{label}</span>
        <span className="text-white font-bold">{value}</span>
      </div>
      <div className="w-full bg-gray-700 rounded-full h-2">
        <div
          className={`${colorMap[color] || colorMap.blue} h-2 rounded-full transition-all duration-300`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

// Botão Customizado
export const Button = ({ children, onClick, variant = 'primary', className = '', disabled = false }) => {
  const variants = {
    primary: 'bg-blue-500 hover:bg-blue-400 text-white',
    secondary: 'bg-gray-600 hover:bg-gray-500 text-white',
    success: 'bg-green-500 hover:bg-green-400 text-white',
    danger: 'bg-red-500 hover:bg-red-400 text-white',
    warning: 'bg-yellow-500 hover:bg-yellow-400 text-black'
  };
  
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        px-6 py-3 rounded-lg font-bold transition-all duration-200
        ${variants[variant] || variants.primary}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'}
        ${className}
      `}
    >
      {children}
    </button>
  );
};

// Modal Simples
export const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-900 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-auto border-2 border-gray-700">
        <div className="p-6 border-b border-gray-700">
          <h2 className="text-2xl font-bold text-white">{title}</h2>
        </div>
        <div className="p-6">
          {children}
        </div>
        <div className="p-6 border-t border-gray-700 flex justify-end">
          <Button onClick={onClose} variant="secondary">
            Fechar
          </Button>
        </div>
      </div>
    </div>
  );
};

export default { TeamCard, AttributeBar, Button, Modal, SkipButton, useSkipShortcut };
