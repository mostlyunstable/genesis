import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  badge?: React.ReactNode;
  noPadding?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  title,
  subtitle,
  action,
  badge,
  noPadding = false
}) => {
  return (
    <div className={`bg-white border border-[#E3E5DC] rounded-3xl overflow-hidden shadow-origin-sm transition-all ${className}`}>
      {(title || action || badge || subtitle) && (
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E3E5DC] bg-[#FAFAF7]">
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              {typeof title === 'string' ? (
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#20251F] font-mono">{title}</h3>
              ) : (
                title
              )}
              {badge}
            </div>
            {subtitle && (
              <span className="text-[11px] text-[#73796F] font-normal mt-0.5">{subtitle}</span>
            )}
          </div>
          {action && <div className="flex items-center gap-2">{action}</div>}
        </div>
      )}
      <div className={noPadding ? '' : 'p-6'}>{children}</div>
    </div>
  );
};
