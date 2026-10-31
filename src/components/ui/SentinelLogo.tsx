import React from 'react';
import logoImage from '@/assets/sentinel-logo.png';

interface SentinelLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showWordmark?: boolean;
  className?: string;
  imageOnly?: boolean;
}

export const SentinelLogo: React.FC<SentinelLogoProps> = ({
  size = 'md',
  showWordmark = true,
  className = '',
  imageOnly = false
}) => {
  const iconSizes = {
    sm: 'w-7 h-7',
    md: 'w-9 h-9',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16'
  };

  const textSizes = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
    xl: 'text-xl'
  };

  return (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      {/* Sentinel Emblem */}
      <div className={`${iconSizes[size]} shrink-0 relative flex items-center justify-center`}>
        <img
          src={logoImage}
          alt="Sentinel"
          className="w-full h-full object-contain filter drop-shadow-xs transition-transform duration-200 group-hover:scale-105"
        />
      </div>

      {/* Sentinel Wordmark */}
      {showWordmark && !imageOnly && (
        <div className="flex items-center gap-1.5 leading-none">
          <span className={`font-bold tracking-tight text-[#171717] dark:text-[#F4F4F2] font-sans ${textSizes[size]}`}>
            SENTINEL
          </span>
          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold font-mono bg-[#FFF0E8] text-[#F15A24] border border-[#F15A24]/20 uppercase tracking-wide">
            AI
          </span>
        </div>
      )}
    </div>
  );
};
