import React from 'react';
import { Severity, Outcome } from '@/types';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'brand' | 'accent' | 'critical' | 'warning' | 'info' | 'success' | 'neutral';
  size?: 'xs' | 'sm' | 'md';
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
  const normalizedVariant = variant === 'accent' ? 'brand' : variant;

  const variantStyles = {
    brand: 'bg-[#F97316]/15 text-[#F97316] border-[#F97316]/30',
    critical: 'bg-[#EF4444]/15 text-[#EF4444] border-[#EF4444]/30',
    warning: 'bg-[#F59E0B]/15 text-[#F59E0B] border-[#F59E0B]/30',
    info: 'bg-[#38BDF8]/15 text-[#38BDF8] border-[#38BDF8]/30',
    success: 'bg-[#10B981]/15 text-[#10B981] border-[#10B981]/30',
    neutral: 'bg-[#161B26] text-[#94A3B8] border-[#1C2230]'
  };

  const dotColors = {
    brand: 'bg-[#F97316]',
    critical: 'bg-[#EF4444]',
    warning: 'bg-[#F59E0B]',
    info: 'bg-[#38BDF8]',
    success: 'bg-[#10B981]',
    neutral: 'bg-[#64748B]'
  };

  const sizeStyles = {
    xs: 'text-[10px] px-1.5 py-0.2 font-medium',
    sm: 'text-[11px] px-2 py-0.5 font-medium',
    md: 'text-xs px-2.5 py-1 font-medium'
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border tracking-wider font-mono uppercase ${variantStyles[normalizedVariant]} ${sizeStyles[size]} ${className}`}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColors[normalizedVariant]}`} />}
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
      {severity.toUpperCase()}
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
      {outcome.toUpperCase()}
    </Badge>
  );
};
