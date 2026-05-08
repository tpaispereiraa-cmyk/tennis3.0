import React, { useState, useEffect } from 'react';
import { Zap, Target, Flame, TrendingUp, Shield, AlertCircle } from 'lucide-react';

// ====================================================================
// EVENT FEED - Feed de eventos durante a batalha
// ====================================================================

export const EventFeed = ({ events = [] }) => {
  const [visibleEvents, setVisibleEvents] = useState([]);
  
  useEffect(() => {
    // Mostrar apenas os últimos 4 eventos
    const latest = events.slice(-4);
    setVisibleEvents(latest);
  }, [events]);
  
  if (visibleEvents.length === 0) return null;
  
  return (
    <div className="absolute right-4 top-1/2 transform -translate-y-1/2 w-80 space-y-2 pointer-events-none">
      {visibleEvents.map((event, idx) => (
        <EventNotification 
          key={event.id}
          event={event}
          index={idx}
        />
      ))}
    </div>
  );
};

// ====================================================================
// EVENT NOTIFICATION - Notificação individual
// ====================================================================

const EventNotification = ({ event, index }) => {
  const style = getEventStyle(event.type);
  
  return (
    <div 
      className={`
        ${style.bg} ${style.border} ${style.text}
        backdrop-blur-sm rounded-lg px-4 py-3 
        border-l-4 shadow-lg
        animate-slide-in-right
        flex items-center gap-3
      `}
      style={{
        animationDelay: `${index * 0.1}s`,
        boxShadow: `0 0 20px ${style.shadowColor}40`
      }}
    >
      <div className={style.iconBg}>
        {style.icon}
      </div>
      <div className="flex-1">
        <div className="font-bold text-sm">{event.title}</div>
        {event.description && (
          <div className="text-xs opacity-80">{event.description}</div>
        )}
      </div>
    </div>
  );
};

// ====================================================================
// EVENT STYLES - Estilos por tipo de evento
// ====================================================================

function getEventStyle(type) {
  const styles = {
    CRITICAL_HIT: {
      bg: 'bg-red-900/30',
      border: 'border-red-500',
      text: 'text-red-100',
      iconBg: 'bg-red-500/20 p-2 rounded-full',
      icon: <Target className="w-5 h-5 text-red-400" />,
      shadowColor: '#EF4444'
    },
    BURST: {
      bg: 'bg-orange-900/30',
      border: 'border-orange-500',
      text: 'text-orange-100',
      iconBg: 'bg-orange-500/20 p-2 rounded-full',
      icon: <Flame className="w-5 h-5 text-orange-400" />,
      shadowColor: '#F97316'
    },
    RING_OUT: {
      bg: 'bg-purple-900/30',
      border: 'border-purple-500',
      text: 'text-purple-100',
      iconBg: 'bg-purple-500/20 p-2 rounded-full',
      icon: <AlertCircle className="w-5 h-5 text-purple-400" />,
      shadowColor: '#A855F7'
    },
    PORTAL_WARP: {
      bg: 'bg-cyan-900/30',
      border: 'border-cyan-500',
      text: 'text-cyan-100',
      iconBg: 'bg-cyan-500/20 p-2 rounded-full',
      icon: <Zap className="w-5 h-5 text-cyan-400" />,
      shadowColor: '#06B6D4'
    },
    RAJADA_DE_ACO: {
      bg: 'bg-orange-900/30',
      border: 'border-orange-500',
      text: 'text-orange-100',
      iconBg: 'bg-orange-500/20 p-2 rounded-full',
      icon: <TrendingUp className="w-5 h-5 text-orange-400" />,
      shadowColor: '#F97316'
    },
    MURO_VIVO: {
      bg: 'bg-blue-900/30',
      border: 'border-blue-400',
      text: 'text-blue-100',
      iconBg: 'bg-blue-400/20 p-2 rounded-full',
      icon: <TrendingUp className="w-5 h-5 text-blue-400" />,
      shadowColor: '#60A5FA'
    },
    ESPIRAL_ETERNA: {
      bg: 'bg-teal-900/30',
      border: 'border-teal-400',
      text: 'text-teal-100',
      iconBg: 'bg-teal-400/20 p-2 rounded-full',
      icon: <TrendingUp className="w-5 h-5 text-teal-400" />,
      shadowColor: '#2DD4BF'
    },
    CORTE_PRECISO: {
      bg: 'bg-red-900/20',
      border: 'border-red-400',
      text: 'text-red-100',
      iconBg: 'bg-red-400/20 p-2 rounded-full',
      icon: <TrendingUp className="w-5 h-5 text-red-400" />,
      shadowColor: '#F87171'
    },
    DEFENSE: {
      bg: 'bg-blue-900/30',
      border: 'border-blue-500',
      text: 'text-blue-100',
      iconBg: 'bg-blue-500/20 p-2 rounded-full',
      icon: <Shield className="w-5 h-5 text-blue-400" />,
      shadowColor: '#3B82F6'
    },
    DEFAULT: {
      bg: 'bg-gray-900/30',
      border: 'border-gray-500',
      text: 'text-gray-100',
      iconBg: 'bg-gray-500/20 p-2 rounded-full',
      icon: <AlertCircle className="w-5 h-5 text-gray-400" />,
      shadowColor: '#6B7280'
    }
  };
  
  return styles[type] || styles.DEFAULT;
}
