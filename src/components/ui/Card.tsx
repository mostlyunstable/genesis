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
    <div className={`bg-[#0F1523] border border-[#1E293B] rounded-2xl overflow-hidden shadow-cyber-sm transition-all ${className}`}>
      {(title || action || badge || subtitle) && (
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#1E293B]">
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              {typeof title === 'string' ? (
                <h3 className="text-xs font-bold uppercase tracking-wider text-white font-mono">{title}</h3>
              ) : (
                title
              )}
              {badge}
            </div>
            {subtitle && (
              <span className="text-[11px] text-[#94A3B8] font-normal mt-0.5">{subtitle}</span>
            )}
          </div>
          {action && <div className="flex items-center gap-2">{action}</div>}
        </div>
      )}
      <div className={noPadding ? '' : 'p-5'}>{children}</div>
    </div>
  );
};
