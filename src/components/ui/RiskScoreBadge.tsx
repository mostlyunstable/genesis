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
  let colorStyle = 'text-[#547D70] bg-[#EDF3F1] border-[#DCE8E5]';
  let level = 'LOW';

  if (score >= 80) {
    colorStyle = 'text-[#B94C43] bg-[#F9ECEB] border-[#F2D5D3]';
    level = 'CRITICAL';
  } else if (score >= 60) {
    colorStyle = 'text-[#C47A45] bg-[#FAF2EC] border-[#F4E2D5]';
    level = 'HIGH';
  } else if (score >= 40) {
    colorStyle = 'text-[#B28A42] bg-[#FAF5EB] border-[#F4ECD5]';
    level = 'MEDIUM';
  }

  const sizeClasses = {
    sm: 'text-[11px] px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
    lg: 'text-sm px-3.5 py-1.5 font-bold'
  };

  return (
    <div className={`inline-flex items-center gap-1.5 rounded-full border font-mono ${colorStyle} ${sizeClasses[size]}`}>
      <span className="font-bold">{score}</span>
      <span className="text-[10px] opacity-70">/100</span>
      {showLabel && (
        <span className="text-[10px] uppercase font-bold pl-1 border-l border-current/20">
          {level}
        </span>
      )}
    </div>
  );
};
