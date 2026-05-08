import React, { useState } from 'react';

/**
 * Componente reutilizável para exibir imagens de jogadores
 * Suporta fallback para placeholder se imagem não carregar
 * 
 * NOTA: Ícones têm fundo, full body são PNG sem fundo
 */
const PlayerImage = ({ 
  player, 
  type = 'icon', // 'icon' ou 'full'
  size = 'md',   // 'xs', 'sm', 'md', 'lg', 'xl'
  className = '',
  showBorder = true,
  borderColor = null
}) => {
  const [imageError, setImageError] = useState(false);
  
  // Dimensões baseadas no tipo e tamanho
  const dimensions = {
    icon: {
      xs: 'w-6 h-6',    // 24px
      sm: 'w-8 h-8',    // 32px
      md: 'w-12 h-12',  // 48px
      lg: 'w-16 h-16',  // 64px
      xl: 'w-24 h-24'   // 96px
    },
    full: {
      xs: 'w-24 h-36',   // 96x144
      sm: 'w-32 h-48',   // 128x192
      md: 'w-48 h-72',   // 192x288
      lg: 'w-64 h-96',   // 256x384
      xl: 'w-80 h-120'   // 320x480
    }
  };
  
  const sizeClass = dimensions[type][size];
  const imageUrl = type === 'icon' ? player.iconUrl : player.fullBodyUrl;
  
  // Fallback para placeholder se não tiver imagem
  const placeholderUrl = type === 'icon' 
    ? `https://ui-avatars.com/api/?name=${encodeURIComponent(player.name)}&size=128&background=random`
    : player.photoUrl; // Usar photoUrl existente como fallback
  
  const finalUrl = imageError || !imageUrl ? placeholderUrl : imageUrl;
  
  // Cor da borda baseada nas cores do time
  const borderColorClass = borderColor || `border-[${player.colors?.[0] || '#3b82f6'}]`;
  
  return (
    <div className={`relative ${sizeClass} ${className}`}>
      <img
        src={finalUrl}
        alt={player.name}
        className={`
          ${sizeClass} 
          object-cover 
          ${type === 'icon' ? 'rounded-lg' : 'rounded-lg'}
          ${showBorder ? `border-2 ${borderColorClass}` : ''}
          transition-all duration-300
          hover:scale-105
        `}
        onError={() => setImageError(true)}
      />
      
      {/* Badge opcional para tipo de imagem (apenas em desenvolvimento) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="absolute -top-1 -right-1 bg-black/50 text-white text-xs px-1 rounded">
          {type}
        </div>
      )}
    </div>
  );
};

export default PlayerImage;
