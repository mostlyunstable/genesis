import React from 'react';
import { Severity, Outcome } from '@/types';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'critical' | 'warning' | 'info' | 'success' | 'neutral' | 'accent';
  size?: 'sm' | 'md';
  className?: string;
  dot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  size = 'sm',
  className = '',
  dot = false
}) => {
  const variantStyles = {
    critical: 'bg-[#EF5350]/15 text-[#EF5350] border-[#EF5350]/30',
    warning: 'bg-[#E5AD52]/15 text-[#E5AD52] border-[#E5AD52]/30',
    info: 'bg-[#6DA9E8]/15 text-[#6DA9E8] border-[#6DA9E8]/30',
    success: 'bg-[#42B883]/15 text-[#42B883] border-[#42B883]/30',
    accent: 'bg-[#E0A34A]/15 text-[#E0A34A] border-[#E0A34A]/30',
    neutral: 'bg-[#171E28] text-[#8994A4] border-[#252D38]'
  };

  const dotColors = {
    critical: 'bg-[#EF5350]',
    warning: 'bg-[#E5AD52]',
    info: 'bg-[#6DA9E8]',
    success: 'bg-[#42B883]',
    accent: 'bg-[#E0A34A]',
    neutral: 'bg-[#8994A4]'
  };

  const sizeStyles = {
    sm: 'text-[11px] px-2 py-0.5 font-medium leading-4',
    md: 'text-xs px-2.5 py-1 font-medium leading-4'
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded border uppercase tracking-wider font-mono ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${dotColors[variant]}`} />}
      {children}
    </span>
  );
};

export const SeverityBadge: React.FC<{ severity: Severity; className?: string }> = ({
  severity,
  className = ''
}) => {
  const map: Record<Severity, 'critical' | 'warning' | 'info' | 'neutral'> = {
    critical: 'critical',
    warning: 'warning',
    info: 'info',
    low: 'neutral'
  };

  return (
    <Badge variant={map[severity]} dot className={className}>
      {severity}
    </Badge>
  );
};

export const OutcomeBadge: React.FC<{ outcome: Outcome; className?: string }> = ({
  outcome,
  className = ''
}) => {
  const map: Record<Outcome, 'critical' | 'success' | 'warning' | 'info'> = {
    failure: 'critical',
    success: 'success',
    blocked: 'warning',
    challenged: 'info'
  };

  return (
    <Badge variant={map[outcome]} className={className}>
      {outcome}
    </Badge>
  );
};
