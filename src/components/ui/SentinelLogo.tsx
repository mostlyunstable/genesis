import React from 'react';

interface SentinelLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showWordmark?: boolean;
  className?: string;
  imageOnly?: boolean;
  brandName?: string;
}

export const SentinelLogo: React.FC<SentinelLogoProps> = ({
  size = 'md',
  showWordmark = true,
  className = '',
  imageOnly = false,
  brandName = 'GENESIS'
}) => {
  const iconSizes = {
    sm: 'w-7 h-7',
    md: 'w-8 h-8',
    lg: 'w-11 h-11',
    xl: 'w-14 h-14'
  };

  const textSizes = {
    sm: 'text-xs tracking-[0.16em]',
    md: 'text-sm tracking-[0.18em]',
    lg: 'text-lg tracking-[0.2em]',
    xl: 'text-xl tracking-[0.22em]'
  };

  return (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      {/* Genesis Cosmic Orb Emblem */}
      <div className={`${iconSizes[size]} shrink-0 rounded-xl overflow-hidden bg-black flex items-center justify-center p-0.5 shadow-xs border border-purple-950/40 ring-1 ring-purple-500/20`}>
        <img
          src="/genesis-logo-mark.png"
          alt="Genesis"
          className="w-full h-full object-contain"
        />
      </div>

      {/* Genesis Wordmark */}
      {showWordmark && !imageOnly && (
        <div className="flex items-center gap-1.5 leading-none">
          <span className={`font-black uppercase text-[#20251F] font-sans ${textSizes[size]}`}>
            {brandName}
          </span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold font-mono bg-[#F0F1EB] text-[#20251F] border border-[#E3E5DC] uppercase tracking-wider">
            AI
          </span>
        </div>
      )}
    </div>
  );
};

export const GenesisLogo = SentinelLogo;
export const GenysisLogo = SentinelLogo;
