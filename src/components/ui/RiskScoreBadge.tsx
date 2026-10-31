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
  let colorStyle = 'text-[#258A62] bg-[#F0FDF4] border-[#258A62]/20';
  let level = 'LOW';

  if (score >= 80) {
    colorStyle = 'text-[#D94B45] bg-[#FDF2F2] border-[#D94B45]/20';
    level = 'CRITICAL';
  } else if (score >= 60) {
    colorStyle = 'text-[#D97706] bg-[#FFFBEB] border-[#D97706]/20';
    level = 'HIGH';
  } else if (score >= 40) {
    colorStyle = 'text-[#4F7FC1] bg-[#F0F6FF] border-[#4F7FC1]/20';
    level = 'MEDIUM';
  }

  const sizeClasses = {
    sm: 'text-[11px] px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
    lg: 'text-sm px-3.5 py-1.5 font-bold'
  };

  return (
    <div className={`inline-flex items-center gap-1.5 rounded-full border font-mono ${colorStyle} ${sizeClasses[size]}`}>
      <span className="font-semibold">{score}</span>
      <span className="text-[10px] opacity-60">/100</span>
      {showLabel && (
        <span className="text-[10px] uppercase font-semibold pl-1 border-l border-current/20">
          {level}
        </span>
      )}
    </div>
  );
};
