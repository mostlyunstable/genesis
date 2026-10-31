import React from 'react';
import logoImage from '@/assets/genysis-logo.png';

interface GenysisLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showWordmark?: boolean;
  className?: string;
  imageOnly?: boolean;
}

export const GenysisLogo: React.FC<GenysisLogoProps> = ({
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
    sm: 'text-xs tracking-[0.12em]',
    md: 'text-sm tracking-[0.14em]',
    lg: 'text-lg tracking-[0.14em]',
    xl: 'text-2xl tracking-[0.16em]'
  };

  return (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      {/* Genysis Emblem with Cyber Orange Glow */}
      <div className={`${iconSizes[size]} shrink-0 relative flex items-center justify-center`}>
        <img
          src={logoImage}
          alt="Genysis"
          className="w-full h-full object-contain filter drop-shadow-[0_0_12px_rgba(249,115,22,0.45)] transition-transform duration-200 group-hover:scale-105"
        />
      </div>

      {/* Genysis Wordmark */}
      {showWordmark && !imageOnly && (
        <div className="flex items-center gap-1.5 leading-none">
          <span className={`font-black uppercase text-white font-sans ${textSizes[size]}`}>
            GENYSIS
          </span>
          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold font-mono bg-[#F97316]/15 text-[#F97316] border border-[#F97316]/30 uppercase tracking-widest shadow-sm">
            AI
          </span>
        </div>
      )}
    </div>
  );
};

// Backwards-compatibility alias so existing components don't break
export const SentinelLogo = GenysisLogo;
