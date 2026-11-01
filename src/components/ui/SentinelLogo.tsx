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
  brandName = 'SENTINEL'
}) => {
  const iconSizes = {
    sm: 'w-7 h-7',
    md: 'w-8 h-8',
    lg: 'w-11 h-11',
    xl: 'w-14 h-14'
  };

  const textSizes = {
    sm: 'text-xs tracking-[0.12em]',
    md: 'text-sm tracking-[0.14em]',
    lg: 'text-lg tracking-[0.15em]',
    xl: 'text-xl tracking-[0.16em]'
  };

  return (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      {/* Sentinel Refined Botanical Emblem */}
      <div className={`${iconSizes[size]} shrink-0 relative flex items-center justify-center`}>
        <svg className="w-full h-full" viewBox="0 0 32 32" fill="none">
          <rect width="32" height="32" rx="9" fill="#EAF0E6" />
          <path d="M16 6L24.5 10.8V17.2C24.5 22.1 20.8 26.2 16 27.5C11.2 26.2 7.5 22.1 7.5 17.2V10.8L16 6Z" fill="#54765C" />
          <path d="M16 9.8L21.5 13.2V17.2C21.5 20.6 19.1 23.6 16 24.8C12.9 23.6 10.5 20.6 10.5 17.2V13.2L16 9.8Z" fill="#FFFFFF" />
          <circle cx="16" cy="17" r="2.5" fill="#54765C" />
        </svg>
      </div>

      {/* Sentinel Wordmark */}
      {showWordmark && !imageOnly && (
        <div className="flex items-center gap-1.5 leading-none">
          <span className={`font-black uppercase text-[#20251F] font-sans ${textSizes[size]}`}>
            {brandName}
          </span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold font-mono bg-[#EAF0E6] text-[#54765C] border border-[#CFDCC9] uppercase tracking-wider">
            AI
          </span>
        </div>
      )}
    </div>
  );
};

// Aliases
export const GenysisLogo = SentinelLogo;
