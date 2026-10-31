import React from 'react';

interface RiskScoreBadgeProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export const RiskScoreBadge: React.FC<RiskScoreBadgeProps> = ({
  score,
  size = 'md',
  showLabel = true
}) => {
  let colorStyle = 'text-[#42B883] border-[#42B883]/30 bg-[#42B883]/10';
  let level = 'LOW';

  if (score >= 80) {
    colorStyle = 'text-[#EF5350] border-[#EF5350]/30 bg-[#EF5350]/10';
    level = 'CRITICAL';
  } else if (score >= 60) {
    colorStyle = 'text-[#E5AD52] border-[#E5AD52]/30 bg-[#E5AD52]/10';
    level = 'HIGH';
  } else if (score >= 40) {
    colorStyle = 'text-[#6DA9E8] border-[#6DA9E8]/30 bg-[#6DA9E8]/10';
    level = 'MEDIUM';
  }

  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-xs px-2.5 py-1',
    lg: 'text-sm px-3 py-1.5 font-bold'
  };

  return (
    <div className={`inline-flex items-center gap-1.5 rounded border font-mono ${colorStyle} ${sizeClasses[size]}`}>
      <span className="font-semibold">{score}</span>
      <span className="text-[10px] opacity-70">/100</span>
      {showLabel && <span className="text-[10px] uppercase font-medium tracking-wider pl-1 border-l border-current/20">{level}</span>}
    </div>
  );
};
