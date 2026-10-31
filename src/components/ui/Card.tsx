import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: React.ReactNode;
  action?: React.ReactNode;
  badge?: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  title,
  action,
  badge
}) => {
  return (
    <div className={`bg-[#121720] border border-[#252D38] rounded-md overflow-hidden ${className}`}>
      {(title || action || badge) && (
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#252D38] bg-[#0F141C]">
          <div className="flex items-center gap-2.5">
            {typeof title === 'string' ? (
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#E8EDF4]">{title}</h3>
            ) : (
              title
            )}
            {badge}
          </div>
          {action && <div className="flex items-center gap-2">{action}</div>}
        </div>
      )}
      <div className="p-4">{children}</div>
    </div>
  );
};
