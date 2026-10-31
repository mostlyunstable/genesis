import React from 'react';

interface SentinelLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showWordmark?: boolean;
  className?: string;
}

export const SentinelLogo: React.FC<SentinelLogoProps> = ({
  size = 'md',
  showWordmark = true,
  className = ''
}) => {
  const iconSizes = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-10 h-10',
    xl: 'w-12 h-12'
  };

  const textSizes = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
    xl: 'text-lg'
  };

  return (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      {/* Sentinel Iconic Beacon Mark */}
      <div className={`${iconSizes[size]} shrink-0 relative flex items-center justify-center`}>
        <svg
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full"
        >
          {/* Subtle perimeter frame */}
          <rect
            width="32"
            height="32"
            rx="9"
            fill="#F15A24"
            className="transition-transform duration-200 group-hover:scale-105"
          />
          {/* Geometric protective focal facets */}
          <path
            d="M16 6.5L24.5 11.5V20.5L16 25.5L7.5 20.5V11.5L16 6.5Z"
            stroke="white"
            strokeWidth="1.75"
            strokeLinejoin="round"
          />
          {/* Intelligent observation core */}
          <circle cx="16" cy="16" r="3.25" fill="white" />
        </svg>
      </div>

      {/* Sentinel AI Wordmark */}
      {showWordmark && (
        <div className="flex items-center gap-1.5 leading-none">
          <span className={`font-bold tracking-tight text-canvas-text font-sans ${textSizes[size]}`}>
            SENTINEL
          </span>
          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold font-mono bg-brand-soft text-brand border border-brand/20 uppercase tracking-wide">
            AI
          </span>
        </div>
      )}
    </div>
  );
};
